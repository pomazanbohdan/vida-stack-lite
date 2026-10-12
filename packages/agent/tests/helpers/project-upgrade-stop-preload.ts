import { mock } from 'bun:test';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { writeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPromise } from 'node:util/types';
import type { SafeRepositoryAccess } from '../../src/config/safe-repository-access.js';
import type { ProjectUpgradeOperation } from '../../src/config/project-upgrade.js';
import { PROJECT_ACTIVATION_PATH, PROJECT_UPGRADE_OPERATION_PATH } from '../../src/config/project-paths.js';

const root = process.env.VIDA_UPGRADE_PRE_EFFECT_ROOT;
const operationId = process.env.VIDA_UPGRADE_PRE_EFFECT_OPERATION;
const token = process.env.VIDA_UPGRADE_PRE_EFFECT_TOKEN;
const selectedTarget = process.env.VIDA_UPGRADE_PRE_EFFECT_TARGET;
const method = process.env.VIDA_UPGRADE_PRE_EFFECT_METHOD;
const stopMode = process.env.VIDA_UPGRADE_PRE_EFFECT_MODE ?? 'before';
const childTimingEnabled = process.env.VIDA_UPGRADE_CHILD_TIMING === '1';
const filesystemTimingEnabled = childTimingEnabled && process.env.VIDA_UPGRADE_IO_TIMING === '1';
const stopEnabled =
  token !== undefined ||
  selectedTarget !== undefined ||
  method !== undefined ||
  process.env.VIDA_UPGRADE_PRE_EFFECT_MODE !== undefined;
if (
  !root ||
  !path.isAbsolute(root) ||
  !operationId ||
  (!stopEnabled && !childTimingEnabled) ||
  (stopEnabled &&
    (!token ||
      !selectedTarget ||
      (method !== 'write' && method !== 'replace' && method !== 'move') ||
      (stopMode !== 'before' && stopMode !== 'after') ||
      (stopMode === 'after' && method !== 'write' && method !== 'move') ||
      (method === 'move' && stopMode !== 'after')))
)
  throw new Error('Project upgrade fixture stop is not configured.');

function recordPhase(phase: string): void {
  writeSync(
    2,
    JSON.stringify({
      schema: 'ProjectUpgradeFixturePhase/v1',
      operation_id: operationId,
      target: selectedTarget,
      method,
      phase,
      process_elapsed_ms: performance.now(),
    }) + '\n',
  );
}
if (stopEnabled) recordPhase('preload-ready');

type PreparationStats = {
  calls: number;
  completed: number;
  failed: number;
  in_flight: number;
  total_ms: number;
  max_ms: number;
};
function preparationStats(): PreparationStats {
  return { calls: 0, completed: 0, failed: 0, in_flight: 0, total_ms: 0, max_ms: 0 };
}
const preparations = { artifacts: preparationStats(), initial_schema: preparationStats() };
type ReadStats = PreparationStats & { bytes: number };
function readStats(): ReadStats {
  return { ...preparationStats(), bytes: 0 };
}
const childReads = {
  package: { readBytes: readStats(), readText: readStats(), readVerifiedCaptureBytes: readStats() },
  consumer: { readBytes: readStats(), readText: readStats(), readVerifiedCaptureBytes: readStats() },
  other: { readBytes: readStats(), readText: readStats(), readVerifiedCaptureBytes: readStats() },
};
const packageRoot = path.resolve(import.meta.dir, '../..');
let packageAccessCalls = 0;
let lastPackageCaller: string[] | undefined;
let lastConsumerAccess: Record<string, unknown> | undefined;
const filesystemMethods = [
  'openSync',
  'closeSync',
  'fstatSync',
  'lstatSync',
  'realpathSync',
  'readdirSync',
  'readSync',
  'writeFileSync',
  'fsyncSync',
  'mkdirSync',
  'unlinkSync',
  'rmdirSync',
] as const;
type FilesystemMethod = (typeof filesystemMethods)[number];
type FilesystemTiming = { calls: number; failed: number; total_ms: number; max_ms: number };
const filesystemTiming = Object.fromEntries(
  filesystemMethods.map((method) => [method, { calls: 0, failed: 0, total_ms: 0, max_ms: 0 }]),
) as Record<FilesystemMethod, FilesystemTiming>;
let filesystemReadDepth = 0;
if (filesystemTimingEnabled) {
  const originals = { ...fs };
  const observedFs = { ...originals };
  for (const method of filesystemMethods) {
    const original = originals[method];
    const wrapper = function (this: unknown, ...args: unknown[]): unknown {
      if (filesystemReadDepth === 0) return Reflect.apply(original, this, args);
      const stats = filesystemTiming[method];
      const started = performance.now();
      stats.calls++;
      try {
        return Reflect.apply(original, this, args);
      } catch (error) {
        stats.failed++;
        throw error;
      } finally {
        const elapsed = performance.now() - started;
        stats.total_ms += elapsed;
        stats.max_ms = Math.max(stats.max_ms, elapsed);
      }
    };
    // Preserve custom helpers such as realpathSync.native without retaining
    // mock call/result arrays or wrapping diagnostic writes.
    for (const key of Reflect.ownKeys(original)) {
      if (['prototype', 'arguments', 'caller'].includes(String(key))) continue;
      const descriptor = Object.getOwnPropertyDescriptor(original, key);
      if (descriptor) Object.defineProperty(wrapper, key, descriptor);
    }
    Reflect.set(observedFs, method, wrapper);
  }
  await mock.module('node:fs', () => observedFs);
}
// The optional fs observer must be installed before these consumers bind fs APIs.
const actualAccess = await import('../../src/config/safe-repository-access.js');
const actualArtifacts = await import('../../src/config/project-upgrade-artifacts.js');
const actualStorage = await import('../../src/config/project-upgrade-storage.js');
const originalModule = Object.freeze({ ...actualAccess });
const originalRequire = originalModule.requireSafeRepositoryAccess;
function observedFilesystemRead<T>(enabled: boolean, action: () => T): T {
  if (!enabled) return action();
  filesystemReadDepth++;
  try {
    return action();
  } finally {
    filesystemReadDepth--;
  }
}
let timingRecords = 0;
let timingBytes = 0;
let lastTimingAt = -Infinity;
let timingSinkFailed = false;
function recordChildTiming(terminal = false): void {
  if (!childTimingEnabled || timingSinkFailed || timingRecords >= 32) return;
  const now = performance.now();
  if (!terminal && now - lastTimingAt < (filesystemTimingEnabled ? 4_000 : 2_000)) return;
  try {
    const line = Buffer.from(
      JSON.stringify({
        schema: 'ProjectUpgradeChildTiming/v1',
        operation_id: operationId,
        diagnostic_preload: true,
        phase: terminal ? 'process-exit' : 'progress',
        process_elapsed_ms: now,
        records_before: timingRecords,
        bytes_before: timingBytes,
        preparations,
        reads: childReads,
        package_access_calls: packageAccessCalls,
        last_package_caller: lastPackageCaller,
        last_consumer_access: lastConsumerAccess,
        ...(filesystemTimingEnabled
          ? {
              filesystem_api_scope:
                'inclusive JS fs calls within package byte reads; native helper syscalls unobserved',
              filesystem_api: filesystemTiming,
            }
          : {}),
      }) + '\n',
    );
    if (timingBytes + line.byteLength > 40 * 1024 || timingBytes + accessEventBytes + line.byteLength > 48 * 1024 - 64)
      return;
    timingBytes += line.byteLength;
    timingRecords++;
    lastTimingAt = now;
    if (writeSync(2, line) !== line.byteLength) timingSinkFailed = true;
  } catch {
    // A failed diagnostic sink never changes the observed operation's outcome.
    timingSinkFailed = true;
  }
}
if (childTimingEnabled) process.once('exit', () => recordChildTiming(true));
function observedPreparation<T>(stats: PreparationStats, action: () => T): T {
  const started = performance.now();
  stats.calls++;
  stats.in_flight++;
  recordChildTiming();
  const terminal = (failed: boolean): void => {
    const elapsed = performance.now() - started;
    stats.completed++;
    stats.failed += Number(failed);
    stats.in_flight--;
    stats.total_ms += elapsed;
    stats.max_ms = Math.max(stats.max_ms, elapsed);
    recordChildTiming();
  };
  try {
    const result = action();
    if (isPromise(result))
      void Promise.prototype.then.call(
        result,
        () => terminal(false),
        () => terminal(true),
      );
    else terminal(false);
    return result;
  } catch (error) {
    terminal(true);
    throw error;
  }
}
function recordPreparations(): void {
  try {
    writeSync(
      2,
      JSON.stringify({ schema: 'ProjectUpgradePreparationTrace/v1', operation_id: operationId, preparations }) + '\n',
    );
  } catch {
    // A diagnostic never replaces the verified stop outcome.
  }
}
const originalArtifacts = Object.freeze({ ...actualArtifacts });
const originalStorage = Object.freeze({ ...actualStorage });
await mock.module(fileURLToPath(new URL('../../src/config/project-upgrade-artifacts.ts', import.meta.url)), () => ({
  ...originalArtifacts,
  prepareProjectUpgradeArtifacts(...args: Parameters<typeof originalArtifacts.prepareProjectUpgradeArtifacts>) {
    return observedPreparation(preparations.artifacts, () => originalArtifacts.prepareProjectUpgradeArtifacts(...args));
  },
}));
await mock.module(fileURLToPath(new URL('../../src/config/project-upgrade-storage.ts', import.meta.url)), () => ({
  ...originalStorage,
  prepareInitialWorkspaceDatabaseImage(
    ...args: Parameters<typeof originalStorage.prepareInitialWorkspaceDatabaseImage>
  ) {
    return observedPreparation(preparations.initial_schema, () =>
      originalStorage.prepareInitialWorkspaceDatabaseImage(...args),
    );
  },
}));

const accessTraceEnabled = process.env.VIDA_UPGRADE_ACCESS_TRACE === '1';
let accessEventSequence = 0;
let accessEventBytes = 0;
let accessEventRecords = 0;
let accessTraceTruncated = false;
const tracedAccessMethods = new Set([
  'withExclusiveLock',
  'withExclusiveLockAsync',
  'prepareExclusiveCreation',
  'ensureDirectoryAsync',
  'writeExclusive',
  'writeExclusiveAsync',
  'writeExclusiveAtomicAsync',
  'writeExclusiveBytesAsync',
  'replaceAtomic',
  'replaceAtomicAsync',
  'moveNoReplaceAsync',
  'removeFile',
]);
function recordAccess(value: Record<string, unknown>): void {
  if (!accessTraceEnabled || accessTraceTruncated) return;
  // Ordinary inventory/dependency reads already have aggregates. Reserve event
  // capacity for guards, journal reads, effects and package-owner call sites.
  if (
    value.phase !== 'require-begin' &&
    value.phase !== 'require-returned' &&
    !(
      value.root === 'consumer' &&
      (tracedAccessMethods.has(String(value.method)) || value.target === PROJECT_UPGRADE_OPERATION_PATH)
    )
  )
    return;
  try {
    const line = JSON.stringify({ schema: 'ProjectUpgradeAccessTrace/v1', ...value }) + '\n';
    if (accessEventRecords >= 400 || accessEventBytes + Buffer.byteLength(line) > 8 * 1024 - 64) {
      accessTraceTruncated = true;
      const marker = JSON.stringify({ schema: 'ProjectUpgradeAccessTrace/v1', phase: 'truncated' }) + '\n';
      accessEventBytes += Buffer.byteLength(marker);
      writeSync(2, marker);
      return;
    }
    accessEventBytes += Buffer.byteLength(line);
    accessEventRecords++;
    writeSync(2, line);
  } catch {
    // Observation never replaces the operation's result or error.
    accessTraceTruncated = true;
  }
}
function observedAccess(access: SafeRepositoryAccess): SafeRepositoryAccess {
  const wrappers = new Map<PropertyKey, unknown>();
  return new Proxy(
    { ...access },
    {
      get(target, key, receiver): unknown {
        const value: unknown = Reflect.get(target, key, receiver);
        if (typeof value !== 'function') return value;
        if (wrappers.has(key)) return wrappers.get(key);
        const wrapper = function (this: unknown, ...args: unknown[]): unknown {
          const sequence = ++accessEventSequence;
          const started = performance.now();
          const rootClass =
            access.repository_root === root ? 'consumer' : access.repository_root === packageRoot ? 'package' : 'other';
          const stats =
            childTimingEnabled && (key === 'readBytes' || key === 'readText' || key === 'readVerifiedCaptureBytes')
              ? childReads[rootClass][key]
              : undefined;
          if (stats) {
            stats.calls++;
            stats.in_flight++;
            recordChildTiming();
          }
          const context = {
            sequence,
            root: access.repository_root === root ? 'consumer' : 'package-or-other',
            method: String(key),
            target: typeof args[0] === 'string' ? args[0].slice(0, 120) : null,
            process_elapsed_ms: started,
          };
          if (rootClass === 'consumer') lastConsumerAccess = { ...context, phase: 'begin' };
          recordAccess({ ...context, phase: 'begin' });
          const terminal = (phase: string, result?: unknown): void => {
            const elapsed = performance.now() - started;
            if (stats) {
              stats.completed++;
              stats.failed += Number(phase === 'threw');
              stats.in_flight--;
              stats.total_ms += elapsed;
              stats.max_ms = Math.max(stats.max_ms, elapsed);
              if (Buffer.isBuffer(result)) stats.bytes += result.byteLength;
              else if (typeof result === 'string') stats.bytes += Buffer.byteLength(result);
              recordChildTiming();
            }
            recordAccess({ ...context, phase, elapsed_ms: elapsed });
            if (rootClass === 'consumer') lastConsumerAccess = { ...context, phase, elapsed_ms: elapsed };
          };
          try {
            const result: unknown = observedFilesystemRead(
              filesystemTimingEnabled &&
                rootClass === 'package' &&
                (key === 'readBytes' || key === 'readVerifiedCaptureBytes'),
              (): unknown => Reflect.apply(value, this, args),
            );
            if (isPromise(result))
              void Promise.prototype.then.call(
                result,
                (value: unknown) => terminal('returned', value),
                () => terminal('threw'),
              );
            else terminal('returned', result);
            return result;
          } catch (error) {
            terminal('threw');
            throw error;
          }
        };
        wrappers.set(key, wrapper);
        return wrapper;
      },
    },
  );
}

function verifyPublicationBoundary(access: SafeRepositoryAccess): {
  readonly journal: ProjectUpgradeOperation;
  readonly file: ProjectUpgradeOperation['plan']['files'][number];
} {
  if (stopValidator === undefined) throw new Error('Observe-only fixture cannot install a publication stop.');
  recordPhase('publication-boundary-entered');
  const journal = stopValidator(
    JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        access.readBytes(PROJECT_UPGRADE_OPERATION_PATH, 'fixture stop journal'),
      ),
    ),
  );
  const file = journal.plan.files[journal.next_file];
  if (
    journal.phase !== 'publishing' ||
    journal.plan.operation_id !== operationId ||
    journal.plan.token !== token ||
    !file ||
    file.path !== selectedTarget
  )
    throw new Error('Pre-effect fixture stop does not match the actual publication boundary.');
  recordPhase('journal-verified');
  const before = access.fileExists(file.path, 'fixture stop beforeimage')
    ? access.readBytes(file.path, 'fixture stop beforeimage')
    : null;
  if (file.before === null ? before !== null : before === null || !before.equals(Buffer.from(file.before)))
    throw new Error('Pre-effect fixture stop does not retain the exact beforeimage.');
  recordPhase('beforeimage-verified');
  return { journal, file };
}

type ActivationMoveBoundary = {
  readonly journal: ProjectUpgradeOperation;
  readonly staging: string;
  readonly sourceDevice: string;
  readonly sourceInode: string;
};

function verifyActivationMoveBoundary(access: SafeRepositoryAccess): ActivationMoveBoundary {
  if (stopValidator === undefined) throw new Error('Observe-only fixture cannot install an activation move stop.');
  recordPhase('activation-move-boundary-entered');
  const journal = stopValidator(
    JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(
        access.readBytes(PROJECT_UPGRADE_OPERATION_PATH, 'fixture activation move journal'),
      ),
    ),
  );
  const staging = '.vida/.activation-' + operationId + '.json';
  if (
    selectedTarget !== PROJECT_ACTIVATION_PATH ||
    journal.phase !== 'activating' ||
    journal.plan.operation_id !== operationId ||
    journal.plan.token !== token ||
    journal.next_file !== journal.plan.files.length ||
    journal.activation === null
  )
    throw new Error('Activation move fixture does not match the retained activating boundary.');
  const activation = Buffer.from(journal.activation);
  if (!access.readBytes(staging, 'fixture activation staging beforeimage').equals(activation))
    throw new Error('Activation move fixture staging differs from the frozen activation image.');
  if (access.fileExists(PROJECT_ACTIVATION_PATH, 'fixture activation target beforeimage'))
    throw new Error('Activation move fixture target already exists.');
  const source = fs.lstatSync(path.join(root!, staging), { bigint: true });
  if (!source.isFile() || source.nlink !== 1n)
    throw new Error('Activation move fixture staging is not a single-link regular file.');
  return {
    journal,
    staging,
    sourceDevice: source.dev.toString(),
    sourceInode: source.ino.toString(),
  };
}

function stopAtBoundary(boundary: ReturnType<typeof verifyPublicationBoundary>): never {
  recordPreparations();
  writeSync(
    2,
    JSON.stringify({
      schema: 'ProjectUpgradeFixtureStop/v1',
      operation_id: boundary.journal.plan.operation_id,
      token: boundary.journal.plan.token,
      target: boundary.file.path,
      next_file: boundary.journal.next_file,
      mode: 'before',
      boundary: 'verified-before-effect',
      phase: 'publishing',
      effect_calls: 0,
    }) + '\n',
  );
  writeSync(2, 'verified pre-effect publication stop\n');
  process.exit(86);
}

function stopAfterWrite(
  access: SafeRepositoryAccess,
  contents: string,
  boundary: ReturnType<typeof verifyPublicationBoundary>,
): never {
  const afterimage = Buffer.from(contents);
  if (!afterimage.equals(Buffer.from(boundary.file.after)))
    throw new Error('After-effect fixture write differs from the frozen planned image.');
  const observed = access.readBytes(boundary.file.path, 'fixture stop afterimage');
  if (!observed.equals(afterimage)) throw new Error('After-effect fixture did not observe the exact written image.');
  recordPreparations();
  writeSync(
    2,
    JSON.stringify({
      schema: 'ProjectUpgradeFixtureStop/v1',
      operation_id: operationId,
      token: boundary.journal.plan.token,
      target: boundary.file.path,
      mode: 'after',
      boundary: 'delegated-write-resolved',
      phase: boundary.journal.phase,
      next_file: boundary.journal.next_file,
      effect_calls: 1,
      afterimage_bytes: observed.byteLength,
    }) + '\n',
  );
  process.exit(86);
}

function stopAfterMove(
  access: SafeRepositoryAccess,
  source: string,
  target: string,
  boundary: ActivationMoveBoundary,
): never {
  if (source !== boundary.staging || target !== PROJECT_ACTIVATION_PATH)
    throw new Error('Activation move fixture paths differ from the verified boundary.');
  const afterimage = access.readBytes(PROJECT_ACTIVATION_PATH, 'fixture activation move afterimage');
  if (!afterimage.equals(Buffer.from(boundary.journal.activation!)))
    throw new Error('Activation move fixture did not observe the exact moved activation image.');
  if (access.fileExists(boundary.staging, 'fixture activation staging afterimage'))
    throw new Error('Activation move fixture retained its staging path after the move.');
  const targetIdentity = fs.lstatSync(path.join(root!, PROJECT_ACTIVATION_PATH), { bigint: true });
  if (
    !targetIdentity.isFile() ||
    targetIdentity.nlink !== 1n ||
    targetIdentity.dev.toString() !== boundary.sourceDevice ||
    targetIdentity.ino.toString() !== boundary.sourceInode
  )
    throw new Error('Activation move fixture target identity differs from the staged inode.');
  recordPreparations();
  writeSync(
    2,
    JSON.stringify({
      schema: 'ProjectUpgradeFixtureStop/v1',
      operation_id: boundary.journal.plan.operation_id,
      token: boundary.journal.plan.token,
      target: PROJECT_ACTIVATION_PATH,
      mode: 'after',
      boundary: 'delegated-move-resolved',
      phase: boundary.journal.phase,
      next_file: boundary.journal.next_file,
      move_calls: 1,
      effect_calls: 1,
      afterimage_bytes: afterimage.byteLength,
      device: targetIdentity.dev.toString(),
      inode: targetIdentity.ino.toString(),
    }) + '\n',
  );
  process.exit(86);
}

await mock.module(fileURLToPath(new URL('../../src/config/safe-repository-access.ts', import.meta.url)), () => ({
  ...originalModule,
  requireSafeRepositoryAccess(repositoryRoot: string) {
    const sequence = ++accessEventSequence;
    if (repositoryRoot === packageRoot) {
      packageAccessCalls++;
      lastPackageCaller = new Error().stack
        ?.split('\n')
        .slice(2, 5)
        .map((line) => line.trim());
    }
    const context = {
      sequence,
      root: repositoryRoot === root ? 'consumer' : 'package-or-other',
      ...(repositoryRoot === packageRoot
        ? {
            caller: lastPackageCaller,
          }
        : {}),
    };
    recordAccess({
      ...context,
      phase: 'require-begin',
      process_elapsed_ms: performance.now(),
    });
    const original = originalRequire(repositoryRoot);
    const access = accessTraceEnabled || childTimingEnabled ? observedAccess(original) : original;
    recordAccess({ ...context, phase: 'require-returned', process_elapsed_ms: performance.now() });
    if (repositoryRoot !== root || !stopEnabled) return access;
    return {
      ...access,
      async writeExclusiveAsync(target: string, contents: string, label: string): Promise<void> {
        if (method === 'write' && target === selectedTarget) {
          const boundary = verifyPublicationBoundary(access);
          if (stopMode === 'before') stopAtBoundary(boundary);
          if (boundary.file.path !== target) throw new Error('After-effect fixture target changed after validation.');
          await access.writeExclusiveAsync(target, contents, label);
          stopAfterWrite(access, contents, boundary);
        }
        return access.writeExclusiveAsync(target, contents, label);
      },
      replaceAtomicAsync(target: string, expectedHash: string, contents: string, label: string): Promise<void> {
        if (method === 'replace' && target === selectedTarget) stopAtBoundary(verifyPublicationBoundary(access));
        return access.replaceAtomicAsync(target, expectedHash, contents, label);
      },
      async moveNoReplaceAsync(
        source: string,
        target: string,
        expectedHash: string,
        label: string,
      ): Promise<'moved' | 'already_moved'> {
        if (method === 'move' && target === selectedTarget) {
          const boundary = verifyActivationMoveBoundary(access);
          if (
            source !== boundary.staging ||
            target !== PROJECT_ACTIVATION_PATH ||
            expectedHash !== createHash('sha256').update(boundary.journal.activation!).digest('hex')
          )
            throw new Error('Activation move fixture arguments differ from the verified operation.');
          const result = await access.moveNoReplaceAsync(source, target, expectedHash, label);
          if (result !== 'moved') throw new Error('Activation move fixture did not perform a new move.');
          stopAfterMove(access, source, target, boundary);
        }
        return access.moveNoReplaceAsync(source, target, expectedHash, label);
      },
    };
  },
}));

// Install observers before loading the upgrade consumer. Observe-only mode does
// not need the validator or its eager dependency closure.
const stopValidator = stopEnabled
  ? (await import('../../src/config/project-upgrade.js')).validateProjectUpgradeOperation
  : undefined;
if (childTimingEnabled) setInterval(() => recordChildTiming(), 2_000).unref();
