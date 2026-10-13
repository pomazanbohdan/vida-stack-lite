import { afterAll, expect, mock, onTestFinished, spyOn, test } from 'bun:test';
import * as artifactProducer from '../src/config/project-upgrade-artifacts.ts';
import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import {
  closeSync,
  fstatSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { lstat, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.js';
import { HostStateStore } from '../src/host-state.js';
import * as actualAccess from '../src/config/safe-repository-access.js';
import {
  PROJECT_ACTIVATION_PATH,
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_INITIALIZATION_PATH,
  projectConfigurationRebindPath,
  PROJECT_UPGRADE_OPERATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
  projectUpgradeHistoryPath,
  runtimeConfigurationSourceFor,
} from '../src/config/project-paths.js';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.js';
import { runBoundedSubprocess } from './helpers/bounded-subprocess.js';
import { expectRejection } from './helpers/expect-rejection.ts';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageSource = (relativePath: string): string => path.join(packageRoot, relativePath);

type Upgrade = typeof import('../src/config/project-upgrade.js');
type CapturedStage = { readonly bytes: Buffer; readonly device: string; readonly inode: string };
type BoundaryFault = {
  readonly root: string;
  readonly kind: 'write' | 'intent-write' | 'move' | 'move-denied' | 'changed-stage' | 'release' | 'bootstrap-write';
  readonly target?: string;
  readonly workspaceId?: string;
  readonly beforeEffect?: boolean;
  readonly conflictAfterEffect?: boolean;
  armed: boolean;
  calls: number;
  effects: number;
  boundaryError?: unknown;
  stageBefore?: CapturedStage;
  writtenBytes?: Buffer;
  moves?: number;
  releaseCalls?: number;
};

const originalAccessModule = Object.freeze({ ...actualAccess });
const originalRequireSafeRepositoryAccess = originalAccessModule.requireSafeRepositoryAccess;
const accessModule = pathToFileURL(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/config/safe-repository-access.ts'),
).href;
const faults = new Map<string, BoundaryFault>();
type FixtureCustody = { root?: string; deadlineAt: number; passed: boolean; settled: boolean; retained: boolean };
const roots = new Map<string, FixtureCustody>();
const cases = new Set<FixtureCustody>();
let restorationRequested = false;
let restored = false;
const bundleTimingEnabled = process.env.VIDA_UPGRADE_BUNDLE_TIMING === '1';
type BundleReadTiming = {
  calls: number;
  completed: number;
  failed: number;
  total_ms: number;
  max_ms: number;
  bytes: number;
};
function emptyBundleReadTiming(): BundleReadTiming {
  return { calls: 0, completed: 0, failed: 0, total_ms: 0, max_ms: 0, bytes: 0 };
}
let bundleReadTiming = { package: emptyBundleReadTiming(), fixture: emptyBundleReadTiming() };
let packageBundleReadCalls = 0;
function observeBundleRead(repositoryRoot: string, read: actualAccess.SafeRepositoryAccess['readBytes']) {
  return (target: string, accessLabel: string): Buffer => {
    if (accessLabel !== 'VIDA project upgrade') return read(target, accessLabel);
    if (repositoryRoot === packageRoot) packageBundleReadCalls += 1;
    if (!bundleTimingEnabled) return read(target, accessLabel);
    const stats = repositoryRoot === packageRoot ? bundleReadTiming.package : bundleReadTiming.fixture;
    const started = performance.now();
    stats.calls++;
    try {
      const result = read(target, accessLabel);
      stats.completed++;
      stats.bytes += result.byteLength;
      return result;
    } catch (error) {
      stats.failed++;
      throw error;
    } finally {
      const elapsed = performance.now() - started;
      stats.total_ms += elapsed;
      stats.max_ms = Math.max(stats.max_ms, elapsed);
    }
  };
}
type ReleaseMaintenanceFence = HostStateStore['releaseMaintenanceFence'];
const releaseDescriptor = Object.getOwnPropertyDescriptor(HostStateStore.prototype, 'releaseMaintenanceFence');
if (typeof releaseDescriptor?.value !== 'function') throw new Error('Host fence release method is missing');
const originalRelease = releaseDescriptor.value as ReleaseMaintenanceFence;

// Bun mutates imported namespaces when mock.module registers. Capture the original callable first.
void mock.module(accessModule, () => ({
  ...originalAccessModule,
  requireSafeRepositoryAccess(repositoryRoot: string) {
    const access = originalRequireSafeRepositoryAccess(repositoryRoot);
    const observed = {
      ...access,
      readBytes: observeBundleRead(repositoryRoot, access.readBytes),
      ...(access.readVerifiedCaptureBytes
        ? { readVerifiedCaptureBytes: observeBundleRead(repositoryRoot, access.readVerifiedCaptureBytes) }
        : {}),
    };
    const fault = faults.get(repositoryRoot);
    if (!fault) return observed;
    return {
      ...observed,
      async writeExclusiveAtomicAsync(target: string, contents: string, label: string): Promise<void> {
        const matching = fault.kind === 'intent-write' && target === fault.target;
        if (matching) fault.calls += 1;
        if (matching && fault.armed && fault.beforeEffect) {
          fault.armed = false;
          throw new Error('fixture initial atomic intent outcome unavailable before provider effect');
        }
        await access.writeExclusiveAtomicAsync(target, contents, label);
        if (matching) fault.effects += 1;
        if (matching && fault.armed) {
          fault.armed = false;
          if (fault.conflictAfterEffect) {
            const descriptor = openSync(path.join(fault.root, target), 'r+');
            try {
              const identity = fstatSync(descriptor, { bigint: true });
              const bytes = readFileSync(descriptor);
              if (bytes.length === 0) throw new Error('initial intent fixture is empty');
              fault.stageBefore = { bytes, device: identity.dev.toString(), inode: identity.ino.toString() };
              expect(writeSync(descriptor, Buffer.from([bytes[0]! ^ 1]), 0, 1, 0)).toBe(1);
              fsyncSync(descriptor);
            } finally {
              closeSync(descriptor);
            }
          }
          throw new Error('fixture lost acknowledgement after real atomic intent create');
        }
      },
      async writeExclusiveAsync(target: string, contents: string, label: string): Promise<void> {
        const matching = fault.kind === 'write' && target === fault.target;
        if (matching) fault.calls += 1;
        await access.writeExclusiveAsync(target, contents, label);
        if (matching) fault.effects += 1;
        if (matching && fault.armed) {
          fault.armed = false;
          throw new Error('fixture lost acknowledgement after the real file write');
        }
      },
      async writeExclusiveBytesAsync(target: string, contents: Uint8Array, label: string): Promise<void> {
        const matching = fault.kind === 'bootstrap-write' && target === fault.target;
        if (matching) fault.calls += 1;
        await access.writeExclusiveBytesAsync(target, contents, label);
        if (matching) {
          fault.effects += 1;
          fault.writtenBytes = Buffer.from(contents);
        }
        if (matching && fault.armed) {
          fault.armed = false;
          throw new Error('fixture lost acknowledgement after the real bootstrap staging write');
        }
      },
      async moveNoReplaceAsync(
        source: string,
        target: string,
        expectedHash: string,
        label: string,
      ): Promise<'moved' | 'already_moved'> {
        if (fault.kind === 'write' && target === PROJECT_ACTIVATION_PATH) fault.moves = (fault.moves ?? 0) + 1;
        const matching =
          ((fault.kind === 'move' || fault.kind === 'move-denied' || fault.kind === 'changed-stage') &&
            target === fault.target) ||
          (fault.kind === 'bootstrap-write' && target === PROJECT_WORKSPACE_DATABASE_PATH);
        if (fault.kind === 'bootstrap-write' && target === PROJECT_WORKSPACE_DATABASE_PATH)
          fault.moves = (fault.moves ?? 0) + 1;
        if (matching && fault.kind !== 'bootstrap-write') fault.calls += 1;
        if (matching && fault.kind === 'move-denied' && fault.armed) {
          fault.armed = false;
          const stage = path.join(fault.root, source);
          const before = await stat(stage, { bigint: true });
          const bytes = await readFile(stage);
          expect(createHash('sha256').update(bytes).digest('hex')).toBe(expectedHash);
          expect(await readFile(path.join(fault.root, target)).catch((error: unknown) => error)).toMatchObject({
            code: 'ENOENT',
          });
          fault.stageBefore = { bytes, device: before.dev.toString(), inode: before.ino.toString() };
          const denial = new originalAccessModule.SafeRepositoryMoveError(
            'SAFE_REPOSITORY_MOVE_NOT_APPLIED',
            target === PROJECT_ACTIVATION_PATH
              ? 'fixture typed no-effect activation move denial'
              : 'fixture typed no-effect history move denial',
          );
          fault.boundaryError = denial;
          throw denial;
        }
        if (matching && fault.kind === 'changed-stage' && fault.armed) {
          fault.armed = false;
          const descriptor = openSync(path.join(fault.root, source), 'r+');
          try {
            const beforeStat = fstatSync(descriptor, { bigint: true });
            const beforeBytes = readFileSync(descriptor);
            fault.stageBefore = {
              bytes: beforeBytes,
              device: beforeStat.dev.toString(),
              inode: beforeStat.ino.toString(),
            };
            const firstByte = Buffer.alloc(1);
            if (readSync(descriptor, firstByte, 0, 1, 0) !== 1) throw new Error('staged database is empty');
            writeSync(descriptor, Buffer.from([firstByte[0]! ^ 1]), 0, 1, 0);
            fsyncSync(descriptor);
          } finally {
            closeSync(descriptor);
          }
        }
        let result: 'moved' | 'already_moved';
        try {
          result = await access.moveNoReplaceAsync(source, target, expectedHash, label);
        } catch (error) {
          if (matching) fault.boundaryError = error;
          throw error;
        }
        if (matching && fault.kind !== 'bootstrap-write' && result === 'moved') fault.effects += 1;
        if (matching && fault.armed && result === 'moved') {
          fault.armed = false;
          throw new Error('fixture lost acknowledgement after the real no-replace move');
        }
        return result;
      },
    };
  },
}));

const upgrade: Upgrade = await import('../src/config/project-upgrade.js');
const runtimeConfig = await import('../src/config/runtime-config.js');

HostStateStore.prototype.releaseMaintenanceFence = async function (
  this: HostStateStore,
  ...args: Parameters<typeof originalRelease>
): ReturnType<typeof originalRelease> {
  const retirementObserver = [...faults.values()].find(
    (entry) => entry.kind === 'move-denied' && entry.workspaceId === this.workspaceId,
  );
  if (retirementObserver) retirementObserver.releaseCalls = (retirementObserver.releaseCalls ?? 0) + 1;
  const fault = [...faults.values()].find(
    (entry) => entry.kind === 'release' && entry.workspaceId === this.workspaceId,
  );
  if (fault) fault.calls += 1;
  if (fault && fault.armed && fault.beforeEffect) {
    fault.armed = false;
    throw new Error('fixture Host fence release failed before its effect');
  }
  const released = await originalRelease.apply(this, args);
  if (fault && fault.armed) {
    fault.armed = false;
    fault.effects += 1;
    throw new Error('fixture lost acknowledgement after the real Host fence release');
  }
  return released;
};

async function planFresh(
  root: string,
  operationId: string,
): Promise<Awaited<ReturnType<typeof upgrade.planProjectUpgradeRepair>>> {
  const started = performance.now();
  let status: 'completed' | 'failed' = 'failed';
  try {
    expect(
      await readFile(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH)).catch((error: unknown) => error),
    ).toMatchObject({ code: 'ENOENT' });
    const planned = await upgrade.planProjectUpgradeRepair(root, {
      operation_id: operationId,
      actor: 'test-owner: byte-exact',
      instruction_ref: 'tests/project-upgrade-lifecycle.test.ts',
    });
    expect(planned).toMatchObject({
      plan: { database_mode: 'fresh' },
      initial_database: {
        schema: 'VidaInitialWorkspaceImage/v1',
        binding: { operation_id: operationId },
      },
    });
    status = 'completed';
    return planned;
  } finally {
    recordBundleTiming({
      phase: 'planFresh-terminal',
      operation_id: operationId,
      status,
      elapsed_ms: performance.now() - started,
    });
  }
}

async function expectFailure(promise: Promise<unknown>, message: string): Promise<void> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect(error).toHaveProperty('message', message);
}

function beginCase(timeoutMs = 5000): FixtureCustody {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Invalid upgrade case timeout');
  const custody: FixtureCustody = {
    deadlineAt: performance.now() + timeoutMs,
    passed: false,
    settled: false,
    retained: false,
  };
  cases.add(custody);
  onTestFinished(() => finishCase(custody));
  // Intended for one isolated case. Concurrent/late callbacks can share this aggregate.
  bundleReadTiming = { package: emptyBundleReadTiming(), fixture: emptyBundleReadTiming() };
  return custody;
}

async function finishCase(custody: FixtureCustody): Promise<void> {
  if (!cases.has(custody)) return;
  const root = custody.root;
  if (
    root !== undefined &&
    custody.passed &&
    custody.settled &&
    !custody.retained &&
    Number.isFinite(custody.deadlineAt) &&
    performance.now() < custody.deadlineAt
  ) {
    try {
      await rm(root, { recursive: true, force: true });
    } catch (error) {
      custody.retained = true;
      console.error(`Retained upgrade fixture after cleanup failure: ${root}`);
      throw error;
    }
    faults.delete(root);
    roots.delete(root);
    cases.delete(custody);
  } else if (!custody.retained) {
    custody.retained = true;
    console.error(`Retained failed or unsettled upgrade fixture: ${root ?? 'creation pending'}`);
  }
  recordBundleTiming({
    phase: 'case-readBytes',
    scope: 'single isolated case; concurrent or late callbacks may mix aggregates',
    reads: bundleReadTiming,
  });
}

function recordBundleTiming(value: Record<string, unknown>): void {
  if (!bundleTimingEnabled) return;
  try {
    writeSync(2, JSON.stringify({ schema: 'ProjectUpgradeBundleTiming/v1', ...value }) + '\n');
  } catch {
    // Diagnostic output must not replace the operation result.
  }
}

function addRoot(root: string, custody: FixtureCustody): void {
  if (roots.has(root)) throw new Error('Fixture root already registered');
  custody.root = root;
  roots.set(root, custody);
}

function completeRoot(root: string): void {
  const custody = roots.get(root);
  if (!custody) throw new Error('Fixture root is not registered');
  custody.passed = true;
}

function restoreWhenSettled(): void {
  if (!restorationRequested || restored || [...cases].some(({ settled }) => !settled)) return;
  restored = true;
  HostStateStore.prototype.releaseMaintenanceFence = originalRelease;
  void mock.module(accessModule, () => originalAccessModule);
  mock.restore();
}

function settleCase(custody: FixtureCustody): void {
  custody.settled = true;
  restoreWhenSettled();
}

function arm(fault: BoundaryFault): BoundaryFault {
  faults.set(fault.root, fault);
  return fault;
}

async function assertCompleteHistory(
  root: string,
  planned: Awaited<ReturnType<typeof planFresh>>,
): Promise<Awaited<ReturnType<typeof upgrade.validateProjectUpgradeOperation>>> {
  const historyPath = projectUpgradeHistoryPath(planned.plan.operation_id);
  const historyBytes = await readFile(path.join(root, historyPath), 'utf8');
  const completed = upgrade.validateProjectUpgradeOperation(JSON.parse(historyBytes));
  expect(completed.phase).toBe('completed');
  expect(completed.plan.operation_id).toBe(planned.plan.operation_id);
  expect(completed.plan.token).toBe(planned.plan.token);
  expect(completed.plan.actor).toBe('test-owner: byte-exact');
  expect(completed.plan.instruction_ref).toBe('tests/project-upgrade-lifecycle.test.ts');
  expect(canonicalJson(completed.plan)).toBe(canonicalJson(planned.plan));
  for (const file of planned.plan.files) {
    expect(await readFile(path.join(root, file.path))).toEqual(Buffer.from(file.after));
  }
  expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH), 'utf8').catch(() => null)).toBeNull();
  if (completed.activation === null) throw new Error('completed upgrade has no activation');
  expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH))).toEqual(Buffer.from(completed.activation));

  const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), {
    readonly: true,
    strict: true,
  });
  try {
    const store = readOnlyUpgradeHost(root, database, planned);
    const fence = store.readMaintenanceFence();
    expect(fence).not.toBeNull();
    const expectedBinding = upgrade.projectUpgradeFenceBinding(planned);
    expect(fence!.binding).toEqual(expectedBinding);
    expect(expectedBinding.request_digest).toBe(
      canonicalJsonDigest({
        plan_digest: planned.plan_digest,
        initial_database: planned.initial_database?.sha256 ?? null,
      }),
    );
    expect(fence!.status).toBe('released');
    expect(fence!.token_digest).toBe(
      canonicalJsonDigest({
        workspace_id: planned.plan.workspace_id,
        generation: fence!.generation,
        request_digest: expectedBinding.request_digest,
        token: planned.plan.token,
      }),
    );
  } finally {
    database.close();
  }
  return completed;
}

function readOnlyUpgradeHost(
  root: string,
  database: Database,
  planned: Awaited<ReturnType<typeof planFresh>>,
): HostStateStore {
  return new HostStateStore(
    database,
    planned.plan.workspace_id,
    undefined,
    undefined,
    undefined,
    {
      principal: 'fixture:readonly-upgrade-inspection',
      projectIds: planned.plan.project_ids,
      verify: () => {
        throw new Error('Read-only upgrade inspection cannot authorize a maintenance release');
      },
    },
    root,
    undefined,
    undefined,
    undefined,
    true,
  );
}

async function assertUnknownRequiresExplicitSameId(
  root: string,
  operationId: string,
  expectedMessage: string,
): Promise<void> {
  const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
  const before = await readFile(journalPath, 'utf8');
  await expectFailure(upgrade.resumeProjectUpgrade(root, operationId), expectedMessage);
  expect(await readFile(journalPath, 'utf8')).toBe(before);
  const replacement = await upgrade.resumeProjectUpgrade(root, `${operationId}-replacement`, true).then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(replacement).toBeInstanceOf(Error);
  expect(await readFile(journalPath, 'utf8')).toBe(before);
}

type ChildResult = {
  readonly closeObserved: boolean;
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly error: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly outputExceeded: boolean;
  readonly timedOut: boolean;
  readonly terminationRequestConfirmed: boolean | null;
};

// The returned operation has the producer's 8 MiB journal bound plus its CLI newline.
const childOperationOutputLimit = 8 * 1024 * 1024 + 1;
const childErrorOutputLimit = 64 * 1024;

async function runFreshBunResume(
  root: string,
  operationId: string,
  reconcileUnknown?: boolean,
  preEffectStop?: {
    readonly target: string;
    readonly method: 'write' | 'replace' | 'move';
    readonly token: string;
    readonly mode?: 'before' | 'after';
  },
): Promise<ChildResult> {
  const startedAt = performance.now();
  const childEnvironment = { ...process.env };
  for (const key of [
    'VIDA_UPGRADE_CHILD_TIMING',
    'VIDA_UPGRADE_IO_TIMING',
    'VIDA_UPGRADE_ACCESS_TRACE',
    'VIDA_UPGRADE_PRE_EFFECT_ROOT',
    'VIDA_UPGRADE_PRE_EFFECT_OPERATION',
    'VIDA_UPGRADE_PRE_EFFECT_TOKEN',
    'VIDA_UPGRADE_PRE_EFFECT_TARGET',
    'VIDA_UPGRADE_PRE_EFFECT_METHOD',
    'VIDA_UPGRADE_PRE_EFFECT_MODE',
  ])
    delete childEnvironment[key];
  if (bundleTimingEnabled) {
    childEnvironment.VIDA_UPGRADE_CHILD_TIMING = '1';
    if (process.env.VIDA_UPGRADE_IO_TIMING === '1') childEnvironment.VIDA_UPGRADE_IO_TIMING = '1';
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_ROOT = root;
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_OPERATION = operationId;
  }
  if (preEffectStop !== undefined) {
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_ROOT = root;
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_OPERATION = operationId;
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_TOKEN = preEffectStop.token;
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_TARGET = preEffectStop.target;
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_METHOD = preEffectStop.method;
    childEnvironment.VIDA_UPGRADE_PRE_EFFECT_MODE = preEffectStop.mode ?? 'before';
  }
  if ((bundleTimingEnabled || preEffectStop !== undefined) && process.env.VIDA_UPGRADE_ACCESS_TRACE === '1')
    childEnvironment.VIDA_UPGRADE_ACCESS_TRACE = '1';

  const args = [
    '--no-env-file',
    '--no-install',
    '--config=' + packageSource('bunfig.toml'),
    ...(preEffectStop === undefined && !bundleTimingEnabled
      ? []
      : ['--preload', packageSource('tests/helpers/project-upgrade-stop-preload.ts')]),
    packageSource('bin/reconcile-artifacts.ts'),
    '--kind',
    'project-upgrade',
    '--mode',
    'resume',
    '--project-root',
    root,
    '--repair-id',
    operationId,
    ...(reconcileUnknown === undefined ? [] : ['--reconcile-unknown', String(reconcileUnknown)]),
  ];

  // These parent-side markers use the existing opt-in diagnostic sink. They
  // bound phase visibility without asserting why a phase took its duration.
  recordBundleTiming({
    phase: 'fresh-resume-child-start',
    operation_id: operationId,
    diagnostic_preload: bundleTimingEnabled || preEffectStop !== undefined,
  });
  let result: ChildResult;
  try {
    const bounded = await runBoundedSubprocess(process.execPath, args, {
      cwd: packageRoot,
      env: childEnvironment,
      timeoutMs: 45_000,
      stdoutLimitBytes: childOperationOutputLimit,
      stderrLimitBytes: childErrorOutputLimit,
      terminateOnOutputLimit: true,
      forwardStderrProgress: bundleTimingEnabled,
    });
    result = {
      closeObserved: bounded.closeObserved,
      status: bounded.exitCode,
      signal: bounded.signal,
      error:
        [bounded.childError, bounded.stderrForwardingError, bounded.terminationError]
          .filter((value) => value !== null)
          .join('; ') || null,
      stdout: bounded.stdout.toString('utf8'),
      stderr: bounded.stderr.toString('utf8'),
      outputExceeded: bounded.stdoutTruncated || bounded.stderrTruncated,
      timedOut: bounded.timedOut,
      terminationRequestConfirmed: bounded.terminationRequestConfirmed,
    };
  } catch (error) {
    // A synchronous spawn throw or asynchronous spawn error is a failed
    // observation, never a fabricated successful terminal result.
    result = {
      closeObserved: false,
      status: null,
      signal: null,
      error: error instanceof Error ? error.message : String(error),
      stdout: '',
      stderr: '',
      outputExceeded: false,
      timedOut: false,
      terminationRequestConfirmed: null,
    };
  }
  recordBundleTiming({
    phase: 'fresh-resume-child-terminal',
    operation_id: operationId,
    status: result.status,
    close_observed: result.closeObserved,
    signal: result.signal,
    spawn_error: result.error,
    output_exceeded: result.outputExceeded,
    timed_out: result.timedOut,
    termination_request_confirmed: result.terminationRequestConfirmed,
    elapsed_ms: performance.now() - startedAt,
  });
  console.info(
    JSON.stringify({
      operationId,
      diagnosticPreload: bundleTimingEnabled || preEffectStop !== undefined,
      filesystemApiTiming: bundleTimingEnabled && process.env.VIDA_UPGRADE_IO_TIMING === '1',
      durationMs: performance.now() - startedAt,
      status: result.status,
      closeObserved: result.closeObserved,
      signal: result.signal,
      error: result.error,
      outputExceeded: result.outputExceeded,
      timedOut: result.timedOut,
      terminationRequestConfirmed: result.terminationRequestConfirmed,
      stdoutBytes: Buffer.byteLength(result.stdout),
      stderrBytes: Buffer.byteLength(result.stderr),
      ...(bundleTimingEnabled ? { stderrForwarded: true } : { stderr: result.stderr }),
    }),
  );
  return result;
}

afterAll(() => {
  restorationRequested = true;
  restoreWhenSettled();
});

function projectRebindStateSnapshot(root: string): {
  readonly files: readonly (readonly [string, Buffer])[];
  readonly rows: unknown;
} {
  const files = [
    ...Object.values(PROJECT_CONFIGURATION_PATHS),
    PROJECT_INITIALIZATION_PATH,
    PROJECT_ACTIVATION_PATH,
    '.agent/active-runtime-selector.v1.json',
  ].map((relative) => [relative, readFileSync(path.join(root, relative))] as const);
  const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), { readonly: true, strict: true });
  try {
    const tables = database
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all();
    return {
      files,
      rows: tables.map(({ name }) => ({
        name,
        rows: database.query(`SELECT * FROM "${name.replaceAll('"', '""')}"`).all(),
      })),
    };
  } finally {
    database.close();
  }
}

async function assertProjectRebindSchemaReader(root: string): Promise<void> {
  const { runReconcileArtifacts } = await import('../bin/reconcile-artifacts.ts');
  let accessSpy: { mockRestore(): void } | undefined;
  try {
    const baselineConfig = runtimeConfig.loadRuntimeConfig(root),
      baselineExecutor = baselineConfig.agents.profiles.executor;
    if (!baselineExecutor) throw new Error('Project upgrade fixture has no executor profile');
    const targetExecutor = {
      ...baselineExecutor,
      model: baselineExecutor.model === 'gpt-6.1-sol' ? 'gpt-6-sol' : 'gpt-6.1-sol',
      reasoning: baselineExecutor.reasoning === 'high' ? 'medium' : 'high',
    };
    const targetConfig = {
      ...baselineConfig,
      agents: {
        ...baselineConfig.agents,
        profiles: { ...baselineConfig.agents.profiles, executor: targetExecutor },
      },
    };
    expect(targetExecutor.model).not.toBe(baselineExecutor.model);
    writeFileSync(path.join(root, 'rebind-target.yaml'), stringifyYaml(targetConfig));
    // This isolated consumer fixture supplies the same synthetic selector prerequisite
    // as the rebind fixture owner. It does not qualify an installed runtime.
    mkdirSync(path.join(root, '.agent'), { recursive: true });
    writeFileSync(
      path.join(root, '.agent/active-runtime-selector.v1.json'),
      canonicalJson({
        schema: 'ActiveRuntimeSelector/v1',
        generation: 'fixture-project-rebind',
        runtime: 'vida-agent',
        bundle_root: 'vida-agent',
        config_path: 'agent-runtime.config.v1.yaml',
        payload_manifest_sha256: canonicalJsonDigest({ fixture: 'project-rebind-package-schema-reader' }),
      }),
      { flag: 'wx' },
    );

    const rebindId = 'binding-project-rebind-001';
    const command = (mode: 'plan' | 'apply'): string[] => [
      '--kind',
      'runtime-config',
      '--mode',
      mode,
      '--project-root',
      root,
      '--repair-id',
      rebindId,
      ...(mode === 'plan'
        ? [
            '--actor',
            'test-owner: project configuration rebind',
            '--timestamp',
            '2026-10-13T00:00:00.000Z',
            '--instruction-ref',
            'tests/project-upgrade-lifecycle.test.ts',
            '--target-config',
            'rebind-target.yaml',
          ]
        : []),
    ];

    let accessMode: 'plan' | 'apply' = 'plan';
    const nativeAccess = runtimeConfig.runtimePackageAccess(),
      nativeVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
    if (!nativeVerifiedRead) throw new Error('Project rebind requires the native verified package-byte reader');
    const reads = {
      plan: { verified: 0, raw: 0, bytes: undefined as Buffer | undefined },
      apply: { verified: 0, raw: 0 },
    };
    accessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => ({
      ...nativeAccess,
      readBytes(target: string, label: string): Buffer {
        if (target === 'schemas/runtime-initialization.v2.schema.json') reads[accessMode].raw += 1;
        return nativeAccess.readBytes(target, label);
      },
      readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
        const bytes = nativeVerifiedRead.call(nativeAccess, target, label, maxBytes);
        if (target === 'schemas/runtime-initialization.v2.schema.json' && label === 'project initialization schema') {
          reads[accessMode].verified += 1;
          if (accessMode === 'plan') reads.plan.bytes = Buffer.from(bytes);
          else return Buffer.concat([bytes, Buffer.from('\n')]);
        }
        return bytes;
      },
    }));

    const beforePlan = projectRebindStateSnapshot(root),
      planResult: unknown = await runReconcileArtifacts(command('plan'));
    if (!isPlainRecord(planResult) || planResult.status !== 'planned' || typeof planResult.operation_path !== 'string')
      throw new Error('Project rebind plan did not return its persisted operation path');
    expect(reads.plan).toMatchObject({ verified: 1, raw: 0 });
    const schemaBytes = reads.plan.bytes;
    if (!schemaBytes) throw new Error('Project rebind planner did not expose verified initialization schema bytes');
    const operationPath = planResult.operation_path;
    expect(operationPath).toBe(projectConfigurationRebindPath(rebindId));
    await expectRejection(lstat(path.join(root, '.vida/work', rebindId)), /ENOENT/);
    const operationBytes = readFileSync(path.join(root, operationPath)),
      operationValue: unknown = JSON.parse(operationBytes.toString('utf8'));
    if (!isPlainRecord(operationValue) || !isPlainRecord(operationValue.plan))
      throw new Error('Project rebind planner did not persist a record-shaped operation');
    const planValue = operationValue.plan,
      baselineInputs = planValue.baseline_inputs,
      targetInputs = planValue.target_inputs;
    if (!isPlainRecord(baselineInputs) || !isPlainRecord(targetInputs))
      throw new Error('Project rebind planner did not persist both frozen input sets');
    if (!isPlainRecord(targetInputs.agents) || typeof targetInputs.agents.text !== 'string')
      throw new Error('Project rebind plan did not persist target agents YAML');
    const plannedAgents: unknown = parseYaml(targetInputs.agents.text);
    if (
      !isPlainRecord(plannedAgents) ||
      !isPlainRecord(plannedAgents.agents) ||
      !isPlainRecord(plannedAgents.agents.profiles) ||
      !isPlainRecord(plannedAgents.agents.profiles.executor)
    )
      throw new Error('Project rebind plan did not persist a target executor profile');
    expect(operationValue.schema).toBe('ConfigRebindOperation/v1');
    expect(operationValue.phase).toBe('planned');
    expect(planValue.configuration_format).toBe('project-split-v2');
    expect(planValue.initialization_schema_digest).toBe(createHash('sha256').update(schemaBytes).digest('hex'));
    expect(planValue.old_config_digest).toBe(baselineInputs.config_digest);
    expect(planValue.target_config_digest).not.toBe(planValue.old_config_digest);
    expect(targetInputs.config_digest).toBe(planValue.target_config_digest);
    expect(plannedAgents.agents.profiles.executor.model).toBe(targetExecutor.model);
    expect(plannedAgents.agents.profiles.executor.model).not.toBe(baselineExecutor.model);
    expect(projectRebindStateSnapshot(root)).toEqual(beforePlan);

    accessMode = 'apply';
    await expectRejection(runReconcileArtifacts(command('apply')), /project initialization schema changed/);
    expect(reads.apply).toEqual({ verified: 1, raw: 0 });
    expect(projectRebindStateSnapshot(root)).toEqual(beforePlan);
    expect(readFileSync(path.join(root, operationPath))).toEqual(operationBytes);
  } finally {
    accessSpy?.mockRestore();
  }
}

test('upgrade case cleanup leaves another settled fixture under its own custody', async () => {
  const foreignRoot = await mkdtemp(path.join(tmpdir(), 'vida-upgrade-foreign-custody-'));
  const foreign: FixtureCustody = {
    root: foreignRoot,
    deadlineAt: performance.now() + 5000,
    passed: true,
    settled: true,
    retained: false,
  };
  cases.add(foreign);
  const marker = Buffer.from('another case owns these bytes');
  writeFileSync(path.join(foreignRoot, 'owner.txt'), marker);
  const custody = beginCase();
  const root = await mkdtemp(path.join(tmpdir(), 'vida-upgrade-current-custody-'));
  addRoot(root, custody);
  completeRoot(root);
  settleCase(custody);
  await finishCase(custody);
  expect(
    await stat(root).then(
      () => true,
      () => false,
    ),
  ).toBe(false);
  expect(
    await stat(foreignRoot).then(
      () => true,
      () => false,
    ),
  ).toBe(true);
  expect(await readFile(path.join(foreignRoot, 'owner.txt'))).toEqual(marker);
  cases.delete(foreign);
  await rm(foreignRoot, { recursive: true, force: true });
});

test('upgrade case cleanup retains successful late completion after its monotonic deadline', async () => {
  const custody = beginCase();
  const root = await mkdtemp(path.join(tmpdir(), 'vida-upgrade-expired-custody-'));
  addRoot(root, custody);
  const marker = Buffer.from('late completion retains evidence');
  writeFileSync(path.join(root, 'owner.txt'), marker);
  // Model the actual expired monotonic boundary without waiting for a test timeout.
  custody.deadlineAt = performance.now() - 1;
  completeRoot(root);
  settleCase(custody);
  await finishCase(custody);
  expect(custody.retained).toBe(true);
  expect(
    await stat(root).then(
      () => true,
      () => false,
    ),
  ).toBe(true);
  expect(await readFile(path.join(root, 'owner.txt'))).toEqual(marker);
});

test('fresh resume keeps one operation identity and reaches exact released history', async () => {
  const deadlineAt = performance.now() + 60_000;
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const legacyConfig = runtimeConfig.loadRuntimeConfig(root);
    const planned = await planFresh(root, 'lifecycle-positive-001');
    const journalBeforeResume = await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH), 'utf8');
    const intent = upgrade.validateProjectUpgradeOperation(JSON.parse(journalBeforeResume));
    expect(intent.plan.operation_id).toBe(planned.plan.operation_id);
    expect(intent.plan.token).toBe(planned.plan.token);
    expect(intent.plan.actor).toBe('test-owner: byte-exact');
    expect(intent.plan.instruction_ref).toBe('tests/project-upgrade-lifecycle.test.ts');

    const completed = await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id);
    await assertCompleteHistory(root, planned);
    expect(completed.phase).toBe('completed');

    const activatedConfig = runtimeConfig.loadRuntimeConfig(root);
    expect(runtimeConfigurationSourceFor(activatedConfig)).toBe(PROJECT_CONFIGURATION_PATHS.project);
    expect(activatedConfig.schema).toBe(legacyConfig.schema);
    expect(activatedConfig.version).toBe(legacyConfig.version);
    expect(activatedConfig.config_id).toBe(legacyConfig.config_id);
    expect(activatedConfig.config_revision).toBe(legacyConfig.config_revision + 1);
    expect(activatedConfig.projects.map(({ project_id }) => project_id)).toEqual(
      legacyConfig.projects.map(({ project_id }) => project_id),
    );
    expect(activatedConfig.research_decision.registry.schema).toBe(legacyConfig.research_decision.registry.schema);
    expect(activatedConfig.research_decision.registry.revision).toBe(
      legacyConfig.research_decision.registry.revision + 1,
    );
    expect(
      activatedConfig.research_decision.registry.instructions.map(({ instruction_id, source_path }) => ({
        instruction_id,
        source_path,
      })),
    ).toEqual(
      legacyConfig.research_decision.registry.instructions.map(({ instruction_id }, index) => ({
        instruction_id,
        source_path: PROJECT_CONFIGURATION_PATHS.project + '#research_decision.registry.instructions.' + index,
      })),
    );
    if (process.platform === 'linux' && actualAccess.safeRepositoryProviderAvailable)
      await assertProjectRebindSchemaReader(root);
    else console.warn('Verified project-rebind schema caller remains unqualified on this provider');
    if (performance.now() >= deadlineAt) throw new Error('Project upgrade case deadline expired before cleanup');
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('changed staged database bytes at the real no-replace boundary retain UNKNOWN without publishing', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const operationId = 'lifecycle-stage-bytes-race-001';
    const planned = await planFresh(root, operationId);
    const stagePath = path.join(root, '.vida/work/.upgrade-' + operationId + '.sqlite');
    const targetPath = path.join(root, PROJECT_WORKSPACE_DATABASE_PATH);
    const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    const beforeJournal = await readFile(journalPath);
    const targetBefore = await readFile(targetPath).catch((error: unknown) => error);
    expect(targetBefore).toMatchObject({ code: 'ENOENT' });
    const projectBefore = new Map<string, Buffer<ArrayBuffer> | null>();
    for (const file of planned.plan.files) {
      projectBefore.set(
        file.path,
        await readFile(path.join(root, file.path)).catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }),
      );
    }
    const activationBefore = await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error);
    expect(activationBefore).toMatchObject({ code: 'ENOENT' });
    const fault = arm({
      root,
      kind: 'changed-stage',
      target: PROJECT_WORKSPACE_DATABASE_PATH,
      armed: true,
      calls: 0,
      effects: 0,
    });

    const failure = await upgrade.resumeFreshProjectUpgradeDatabase(root, operationId).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(fault.calls).toBe(1);
    expect(fault.armed).toBe(false);
    expect(fault.effects).toBe(0);
    expect(fault.boundaryError).toBeInstanceOf(Error);
    expect(fault.boundaryError).toHaveProperty('code', 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN');
    expect(fault.stageBefore).toBeDefined();

    const changedStage = await readFile(stagePath);
    const stageBefore = fault.stageBefore!;
    const expectedChangedStage = Buffer.from(stageBefore.bytes);
    expectedChangedStage[0] = expectedChangedStage[0]! ^ 1;
    expect(changedStage).toEqual(expectedChangedStage);
    expect(stageBefore.bytes).toEqual(
      Buffer.from(upgrade.inspectPlannedProjectUpgrade(root, operationId).initial_database!.bytes_base64, 'base64'),
    );
    expect(await readFile(targetPath).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });

    const unknownJournal = await readFile(journalPath);
    const unknownOperation = upgrade.inspectPlannedProjectUpgrade(root, operationId);
    expect(unknownOperation).toMatchObject({
      phase: 'planned',
      storage_phase: 'unknown_move',
      plan: { operation_id: operationId, token: planned.plan.token },
    });
    const stageStats = await stat(stagePath, { bigint: true });
    expect(stageStats.dev.toString()).toBe(stageBefore.device);
    expect(stageStats.ino.toString()).toBe(stageBefore.inode);
    expect(unknownOperation.staging_identity).toMatchObject({
      device: stageBefore.device,
      inode: stageBefore.inode,
      sha256: createHash('sha256').update(stageBefore.bytes).digest('hex'),
    });
    expect(createHash('sha256').update(changedStage).digest('hex')).not.toBe(unknownOperation.staging_identity!.sha256);
    expect(unknownJournal).not.toEqual(beforeJournal);
    for (const file of planned.plan.files) {
      const expected = projectBefore.get(file.path);
      if (expected === undefined) throw new Error('planned file beforeimage is missing');
      expect(
        await readFile(path.join(root, file.path)).catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }),
      ).toEqual(expected);
    }
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error)).toMatchObject({
      code: 'ENOENT',
    });

    await expectFailure(
      upgrade.resumeFreshProjectUpgradeDatabase(root, operationId),
      'VIDA project upgrade: UNKNOWN storage requires explicit same-operation reconciliation',
    );
    expect(await readFile(journalPath)).toEqual(unknownJournal);
    const reconciliationFailure = await upgrade.resumeFreshProjectUpgradeDatabase(root, operationId, true).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(reconciliationFailure).toBeInstanceOf(Error);
    expect(await readFile(journalPath)).toEqual(unknownJournal);
    expect(await readFile(stagePath)).toEqual(changedStage);
    const stageStatsAfter = await stat(stagePath, { bigint: true });
    expect(stageStatsAfter.dev).toBe(stageStats.dev);
    expect(stageStatsAfter.ino).toBe(stageStats.ino);
    expect(await readFile(targetPath).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    expect(await readFile(journalPath)).not.toEqual(beforeJournal);
    custody.retained = true;
    onTestFinished(async () => {
      expect(await Bun.file(journalPath).exists()).toBe(true);
      expect((await lstat(root)).isDirectory()).toBe(true);
      expect(await readFile(journalPath)).toEqual(unknownJournal);
      expect(await Bun.file(stagePath).exists()).toBe(true);
      expect(await readFile(stagePath)).toEqual(changedStage);
      const stageStatsAfterCleanup = await stat(stagePath, { bigint: true });
      expect(stageStatsAfterCleanup.dev).toBe(stageStats.dev);
      expect(stageStatsAfterCleanup.ino).toBe(stageStats.ino);
      expect(await readFile(targetPath).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    });
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('fresh bootstrap write afterimage requires same-id consent and is moved once without replay', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const operationId = 'lifecycle-bootstrap-write-ack-001';
    const planned = await planFresh(root, operationId);
    const stageRelative = `.vida/work/.upgrade-${operationId}.sqlite`;
    const stagePath = path.join(root, stageRelative);
    const targetPath = path.join(root, PROJECT_WORKSPACE_DATABASE_PATH);
    const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    const journalBefore = await readFile(journalPath);
    const expectedStage = Buffer.from(planned.initial_database!.bytes_base64, 'base64');
    const configBefore = new Map<string, Buffer<ArrayBuffer> | null>();
    for (const file of planned.plan.files) {
      configBefore.set(
        file.path,
        await readFile(path.join(root, file.path)).catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }),
      );
    }
    expect(await readFile(targetPath).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error)).toMatchObject({
      code: 'ENOENT',
    });
    const fault = arm({
      root,
      kind: 'bootstrap-write',
      target: stageRelative,
      armed: true,
      calls: 0,
      effects: 0,
      moves: 0,
    });

    const failure = await upgrade.resumeFreshProjectUpgradeDatabase(root, operationId).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(Error);
    expect(failure).toHaveProperty('message', 'fixture lost acknowledgement after the real bootstrap staging write');
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    expect(fault.armed).toBe(false);
    expect(fault.writtenBytes).toEqual(expectedStage);
    const stageAfterUnknown = await readFile(stagePath);
    expect(stageAfterUnknown).toEqual(expectedStage);
    const stageIdentity = await stat(stagePath, { bigint: true });
    const unknown = upgrade.inspectPlannedProjectUpgrade(root, operationId);
    expect(unknown).toMatchObject({
      phase: 'planned',
      storage_phase: 'unknown_write',
      plan: { operation_id: operationId, token: planned.plan.token },
      staging_identity: null,
    });
    expect(unknown.plan.operation_id).toBe(operationId);
    expect(canonicalJson(unknown.plan)).toBe(canonicalJson(planned.plan));
    expect(await readFile(targetPath).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error)).toMatchObject({
      code: 'ENOENT',
    });
    for (const file of planned.plan.files) {
      const before = configBefore.get(file.path);
      if (before === undefined) throw new Error('fresh config beforeimage is missing');
      expect(
        await readFile(path.join(root, file.path)).catch((error: unknown) => {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
          throw error;
        }),
      ).toEqual(before);
    }

    const readsBeforeStorageDenial = packageBundleReadCalls;
    const journalBeforeStorageDenial = await readFile(journalPath);
    await assertUnknownRequiresExplicitSameId(
      root,
      operationId,
      'VIDA project upgrade: UNKNOWN storage requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeStorageDenial);
    await expectFailure(
      upgrade.resumeFreshProjectUpgrade(root, operationId),
      'VIDA project upgrade: UNKNOWN storage requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeStorageDenial);
    await expectFailure(
      upgrade.resumeFreshProjectUpgradeDatabase(root, operationId),
      'VIDA project upgrade: UNKNOWN storage requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeStorageDenial);
    expect(await readFile(journalPath)).toEqual(journalBeforeStorageDenial);
    expect(fault.calls).toBe(1);
    expect(fault.moves).toBe(0);
    expect(await readFile(stagePath)).toEqual(expectedStage);
    expect(await readFile(journalPath)).not.toEqual(journalBefore);
    const reconciled = await upgrade.resumeFreshProjectUpgradeDatabase(root, operationId, true);
    expect(packageBundleReadCalls).toBeGreaterThan(readsBeforeStorageDenial);
    expect(reconciled).toMatchObject({
      phase: 'planned',
      storage_phase: 'published',
      plan: { operation_id: operationId, token: planned.plan.token },
      staging_identity: {
        device: stageIdentity.dev.toString(),
        inode: stageIdentity.ino.toString(),
        sha256: createHash('sha256').update(expectedStage).digest('hex'),
      },
    });
    expect(canonicalJson(reconciled.plan)).toBe(canonicalJson(planned.plan));
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    expect(fault.moves).toBe(1);
    expect(await readFile(targetPath)).toEqual(expectedStage);
    const publishedIdentity = await stat(targetPath, { bigint: true });
    expect(publishedIdentity.dev).toBe(stageIdentity.dev);
    expect(publishedIdentity.ino).toBe(stageIdentity.ino);
    expect(await readFile(stagePath).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    const database = new Database(targetPath, { readonly: true, strict: true });
    try {
      expect(
        database.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM agent_host_maintenance').get()?.count,
      ).toBe(0);
    } finally {
      database.close();
    }
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('bootstrap move lost acknowledgement reconciles its exact afterimage without another move', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const operationId = 'lifecycle-bootstrap-move-ack-001';
    const planned = await planFresh(root, operationId);
    const target = path.join(root, PROJECT_WORKSPACE_DATABASE_PATH);
    const stage = path.join(root, `.vida/work/.upgrade-${operationId}.sqlite`);
    const journal = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    const frozenBytes = Buffer.from(planned.initial_database!.bytes_base64, 'base64');
    const fault = arm({
      root,
      kind: 'move',
      target: PROJECT_WORKSPACE_DATABASE_PATH,
      armed: true,
      calls: 0,
      effects: 0,
    });
    await expectFailure(
      upgrade.resumeFreshProjectUpgradeDatabase(root, operationId),
      'fixture lost acknowledgement after the real no-replace move',
    );
    expect(fault).toMatchObject({ calls: 1, effects: 1, armed: false });
    expect(await readFile(target)).toEqual(frozenBytes);
    expect(await readFile(stage).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    const identity = await stat(target, { bigint: true });
    const retained = upgrade.inspectPlannedProjectUpgrade(root, operationId);
    expect(retained).toMatchObject({
      phase: 'planned',
      storage_phase: 'unknown_move',
      staging_identity: {
        device: identity.dev.toString(),
        inode: identity.ino.toString(),
        sha256: createHash('sha256').update(frozenBytes).digest('hex'),
      },
    });
    expect(canonicalJson(retained.plan)).toBe(canonicalJson(planned.plan));
    const retainedJournal = await readFile(journal);
    const readsBeforeDenial = packageBundleReadCalls;
    await assertUnknownRequiresExplicitSameId(
      root,
      operationId,
      'VIDA project upgrade: UNKNOWN storage requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeDenial);
    await expectFailure(
      upgrade.resumeFreshProjectUpgradeDatabase(root, operationId),
      'VIDA project upgrade: UNKNOWN storage requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeDenial);
    expect(await readFile(journal)).toEqual(retainedJournal);
    expect(fault.calls).toBe(1);
    const reconciled = await upgrade.resumeFreshProjectUpgradeDatabase(root, operationId, true);
    expect(packageBundleReadCalls).toBeGreaterThan(readsBeforeDenial);
    expect(reconciled).toMatchObject({ phase: 'planned', storage_phase: 'published' });
    expect(canonicalJson(reconciled.plan)).toBe(canonicalJson(planned.plan));
    expect(reconciled.staging_identity).toEqual(retained.staging_identity);
    expect(fault).toMatchObject({ calls: 1, effects: 1 });
    expect(await readFile(target)).toEqual(frozenBytes);
    const after = await stat(target, { bigint: true });
    expect(after.dev).toBe(identity.dev);
    expect(after.ino).toBe(identity.ino);
    expect(await readFile(stage).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error)).toMatchObject({
      code: 'ENOENT',
    });
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('absent initial atomic intent UNKNOWN blocks replacement inspection and repeated publication', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const operationId = 'lifecycle-initial-intent-absent-001';
    const fault = arm({
      root,
      kind: 'intent-write',
      target: PROJECT_UPGRADE_OPERATION_PATH,
      beforeEffect: true,
      armed: true,
      calls: 0,
      effects: 0,
    });
    await expectFailure(
      planFresh(root, operationId),
      'initial intent publication outcome is unknown; no source effects were started; preserve the original operation id and inspect custody before retrying',
    );
    custody.retained = true;
    writeSync(2, `Expected absent-intent UNKNOWN retained; never replay ${root}\n`);
    const workPath = path.join(root, '.vida/work');
    const workIdentity = await lstat(workPath, { bigint: true });
    expect(workIdentity.isDirectory()).toBe(true);
    const assertWorkIdentity = async (): Promise<void> => {
      const current = await lstat(workPath, { bigint: true });
      expect(current.isDirectory()).toBe(true);
      expect(current.dev).toBe(workIdentity.dev);
      expect(current.ino).toBe(workIdentity.ino);
    };
    expect(fault).toMatchObject({ calls: 1, effects: 0, armed: false });
    expect(
      await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH)).catch((error: unknown) => error),
    ).toMatchObject({
      code: 'ENOENT',
    });
    const packageReadsBeforeRefusal = packageBundleReadCalls;
    expect(() => {
      void upgrade.inspectProjectUpgrade(root, {
        operation_id: operationId + '-replacement',
        actor: 'test-owner: replacement must not publish',
        instruction_ref: 'tests/project-upgrade-lifecycle.test.ts',
      });
    }).toThrow('VIDA project upgrade: existing VIDA data requires its retained operation');
    await assertWorkIdentity();
    await expectFailure(
      upgrade.planProjectUpgradeRepair(root, {
        operation_id: operationId,
        actor: 'test-owner: same operation must not reissue',
        instruction_ref: 'tests/project-upgrade-lifecycle.test.ts',
      }),
      'VIDA project upgrade: existing VIDA data requires its retained operation',
    );
    await assertWorkIdentity();
    expect(packageBundleReadCalls).toBe(packageReadsBeforeRefusal);
    expect(fault).toMatchObject({ calls: 1, effects: 0 });
    await expectFailure(
      upgrade.recoverProjectUpgradeIntent(root, operationId),
      'VIDA project upgrade: no complete initial intent is retained under this operation id',
    );
    await assertWorkIdentity();
    expect(packageBundleReadCalls).toBe(packageReadsBeforeRefusal);
    expect(fault).toMatchObject({ calls: 1, effects: 0 });
    for (const absent of [
      PROJECT_WORKSPACE_DATABASE_PATH,
      PROJECT_ACTIVATION_PATH,
      projectUpgradeHistoryPath(operationId),
    ]) {
      expect(await readFile(path.join(root, absent)).catch((error: unknown) => error)).toMatchObject({
        code: 'ENOENT',
      });
    }
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('conflicting initial atomic intent afterimage preserves custody without reissuing publication', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const operationId = 'lifecycle-initial-intent-conflict-001';
    const fault = arm({
      root,
      kind: 'intent-write',
      target: PROJECT_UPGRADE_OPERATION_PATH,
      conflictAfterEffect: true,
      armed: true,
      calls: 0,
      effects: 0,
    });
    await expectFailure(
      planFresh(root, operationId),
      'VIDA project upgrade: initial intent publication outcome is unknown; preserve custody and inspect the same operation id',
    );
    custody.retained = true;
    writeSync(2, `Expected conflicting initial-intent UNKNOWN retained; never replay ${root}\n`);
    expect(fault).toMatchObject({ calls: 1, effects: 1, armed: false });
    const before = fault.stageBefore;
    if (!before) throw new Error('initial intent conflict did not capture its committed image');
    const committed = upgrade.validateProjectUpgradeOperation(JSON.parse(before.bytes.toString('utf8')));
    expect(committed).toMatchObject({ phase: 'intent_prepared', plan: { operation_id: operationId } });
    const conflictingBytes = Buffer.from(before.bytes);
    conflictingBytes[0] = conflictingBytes[0]! ^ 1;
    const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    const assertConflictCustody = async (): Promise<void> => {
      expect(await readFile(journalPath)).toEqual(conflictingBytes);
      const identity = await stat(journalPath, { bigint: true });
      expect(identity.dev.toString()).toBe(before.device);
      expect(identity.ino.toString()).toBe(before.inode);
      expect(fault).toMatchObject({ calls: 1, effects: 1 });
    };
    await assertConflictCustody();
    const packageReadsBeforeRefusal = packageBundleReadCalls;
    expect(() => {
      void upgrade.inspectProjectUpgrade(root, {
        operation_id: operationId + '-replacement',
        actor: 'test-owner: replacement must not publish',
        instruction_ref: 'tests/project-upgrade-lifecycle.test.ts',
      });
    }).toThrow('VIDA project upgrade: existing VIDA data requires its retained operation');
    await assertConflictCustody();
    await expectFailure(
      upgrade.planProjectUpgradeRepair(root, {
        operation_id: operationId,
        actor: 'test-owner: same operation must not reissue',
        instruction_ref: 'tests/project-upgrade-lifecycle.test.ts',
      }),
      'VIDA project upgrade: existing VIDA data requires its retained operation',
    );
    await assertConflictCustody();
    expect(() => {
      void upgrade.inspectPlannedProjectUpgrade(root, operationId);
    }).toThrow(SyntaxError);
    await assertConflictCustody();
    const recoveryError = await upgrade.recoverProjectUpgradeIntent(root, operationId).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(recoveryError).toBeInstanceOf(SyntaxError);
    await assertConflictCustody();
    expect(packageBundleReadCalls).toBe(packageReadsBeforeRefusal);
    expect((await stat(path.join(root, '.vida/work'))).isDirectory()).toBe(true);
    for (const file of committed.plan.files) {
      const actual = await readFile(path.join(root, file.path), 'utf8').catch((error: unknown) => error);
      if (file.before === null) expect(actual).toMatchObject({ code: 'ENOENT' });
      else expect(actual).toBe(file.before);
    }
    for (const absent of [
      PROJECT_WORKSPACE_DATABASE_PATH,
      PROJECT_ACTIVATION_PATH,
      projectUpgradeHistoryPath(operationId),
    ]) {
      expect(await readFile(path.join(root, absent)).catch((error: unknown) => error)).toMatchObject({
        code: 'ENOENT',
      });
    }
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('initial atomic intent lost acknowledgement accepts only its exact committed same-id image', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const operationId = 'lifecycle-initial-intent-ack-001';
    const fault = arm({
      root,
      kind: 'intent-write',
      target: PROJECT_UPGRADE_OPERATION_PATH,
      armed: true,
      calls: 0,
      effects: 0,
    });
    const planned = await planFresh(root, operationId);
    expect(planned.phase).toBe('planned');
    expect(fault).toMatchObject({ calls: 1, effects: 1, armed: false });
    const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    const journal = await readFile(journalPath);
    const journalIdentity = await stat(journalPath, { bigint: true });
    expect(canonicalJson(upgrade.validateProjectUpgradeOperation(JSON.parse(journal.toString('utf8'))))).toBe(
      canonicalJson(planned),
    );
    const packageReadsBeforeRefusal = packageBundleReadCalls;
    await expectFailure(
      upgrade.recoverProjectUpgradeIntent(root, operationId + '-foreign'),
      'VIDA project upgrade: foreign operation or repository',
    );
    expect(packageBundleReadCalls).toBe(packageReadsBeforeRefusal);
    expect(await readFile(journalPath)).toEqual(journal);
    const journalAfterRefusal = await stat(journalPath, { bigint: true });
    expect(journalAfterRefusal.dev).toBe(journalIdentity.dev);
    expect(journalAfterRefusal.ino).toBe(journalIdentity.ino);
    expect(fault).toMatchObject({ calls: 1, effects: 1 });
    const recovered = await upgrade.recoverProjectUpgradeIntent(root, operationId);
    expect(canonicalJson(recovered)).toBe(canonicalJson(planned));
    expect(await readFile(journalPath)).toEqual(journal);
    expect(fault).toMatchObject({ calls: 1, effects: 1 });
    expect((await stat(path.join(root, '.vida/work'))).isDirectory()).toBe(true);
    for (const absent of [PROJECT_WORKSPACE_DATABASE_PATH, PROJECT_ACTIVATION_PATH]) {
      expect(await readFile(path.join(root, absent)).catch((error: unknown) => error)).toMatchObject({
        code: 'ENOENT',
      });
    }
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

for (const boundary of ['file', 'activation staging'] as const) {
  test(`${boundary} conflicting UNKNOWN afterimage remains retained without another effect`, async () => {
    const custody = beginCase(60_000);
    try {
      const root = await makeFreshRepository();
      addRoot(root, custody);
      const operationId = boundary === 'file' ? 'lifecycle-file-conflict-001' : 'lifecycle-stage-conflict-001';
      const planned = await planFresh(root, operationId);
      const target =
        boundary === 'file'
          ? planned.plan.files.find((file) => file.before === null)?.path
          : `.vida/.activation-${operationId}.json`;
      if (target === undefined) throw new Error('fresh fixture has no publication target');
      const fault = arm({ root, kind: 'write', target, armed: true, calls: 0, effects: 0 });
      await expectFailure(
        upgrade.resumeProjectUpgrade(root, operationId),
        'fixture lost acknowledgement after the real file write',
      );
      const retained = upgrade.inspectPlannedProjectUpgrade(root, operationId);
      expect(retained.phase).toBe(boundary === 'file' ? 'unknown' : 'unknown_activation_write');
      expect(retained.plan.token).toBe(planned.plan.token);
      expect(fault).toMatchObject({ calls: 1, effects: 1, armed: false });

      const targetPath = path.join(root, target);
      const beforeIdentity = await stat(targetPath, { bigint: true });
      const beforeBytes = await readFile(targetPath);
      if (beforeBytes.length === 0) throw new Error('publication fixture unexpectedly wrote an empty image');
      const conflictingBytes = Buffer.from(beforeBytes);
      conflictingBytes[0] = conflictingBytes[0]! ^ 1;
      const descriptor = openSync(targetPath, 'r+');
      try {
        expect(writeSync(descriptor, conflictingBytes, 0, conflictingBytes.length, 0)).toBe(conflictingBytes.length);
        fsyncSync(descriptor);
      } finally {
        closeSync(descriptor);
      }
      expect(await readFile(targetPath)).toEqual(conflictingBytes);
      const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
      const journal = await readFile(journalPath);
      const readFence = (): string => {
        const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), {
          readonly: true,
          strict: true,
        });
        try {
          const store = readOnlyUpgradeHost(root, database, planned);
          const fence = store.readMaintenanceFence();
          if (!fence) throw new Error('conflicting UNKNOWN lost its maintenance fence');
          expect(fence.status).toBe('held');
          expect(fence.binding).toEqual(upgrade.projectUpgradeFenceBinding(planned));
          store.assertMaintenanceFence({ fence, token: planned.plan.token });
          return canonicalJson(fence);
        } finally {
          database.close();
        }
      };
      const fence = readFence();
      const readsBeforeDenial = packageBundleReadCalls;
      await assertUnknownRequiresExplicitSameId(
        root,
        operationId,
        boundary === 'file'
          ? 'VIDA project upgrade: UNKNOWN file publication requires explicit same-operation reconciliation'
          : 'VIDA project upgrade: UNKNOWN activation requires explicit same-operation reconciliation',
      );
      expect(packageBundleReadCalls).toBe(readsBeforeDenial);
      await expectFailure(
        upgrade.resumeProjectUpgrade(root, operationId, true),
        boundary === 'file'
          ? 'VIDA project upgrade: output changed; preserve its beforeimage and do not overwrite it'
          : 'VIDA project upgrade: activation staging afterimage is unresolved',
      );
      expect(await readFile(journalPath)).toEqual(journal);
      expect(await readFile(targetPath)).toEqual(conflictingBytes);
      const afterIdentity = await stat(targetPath, { bigint: true });
      expect(afterIdentity.dev).toBe(beforeIdentity.dev);
      expect(afterIdentity.ino).toBe(beforeIdentity.ino);
      expect(readFence()).toBe(fence);
      expect(fault).toMatchObject({ calls: 1, effects: 1 });
      expect(fault.moves ?? 0).toBe(0);
      for (const absent of [PROJECT_ACTIVATION_PATH, projectUpgradeHistoryPath(operationId)]) {
        expect(await readFile(path.join(root, absent)).catch((error: unknown) => error)).toMatchObject({
          code: 'ENOENT',
        });
      }
      custody.retained = true;
      writeSync(2, `Expected conflicting UNKNOWN retained; never replay ${root}\n`);
    } finally {
      settleCase(custody);
    }
  }, 60_000);
}

test('publication lost acknowledgement requires same-id reconciliation and resumes its afterimage once', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-publication-ack-001');
    const target = planned.plan.files.find((file) => file.before === null)?.path;
    if (target === undefined) throw new Error('fresh fixture has no file that requires publication');
    const fault = arm({ root, kind: 'write', target, armed: true, calls: 0, effects: 0 });

    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture lost acknowledgement after the real file write',
    );
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    expect(await readFile(path.join(root, target))).toEqual(
      Buffer.from(planned.plan.files.find((file) => file.path === target)!.after),
    );
    const retained = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
    expect(retained.phase).toBe('unknown');
    expect(retained.plan.token).toBe(planned.plan.token);

    await assertUnknownRequiresExplicitSameId(
      root,
      planned.plan.operation_id,
      'VIDA project upgrade: UNKNOWN file publication requires explicit same-operation reconciliation',
    );
    await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id, true);
    await assertCompleteHistory(root, planned);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('activation staging write lost acknowledgement preserves its held fence until same-id reconciliation', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-activation-write-ack-001');
    const staging = '.vida/.activation-' + planned.plan.operation_id + '.json';
    const fault = arm({ root, kind: 'write', target: staging, armed: true, calls: 0, effects: 0 });

    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture lost acknowledgement after the real file write',
    );
    const retained = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
    expect(retained.phase).toBe('unknown_activation_write');
    expect(retained.plan.token).toBe(planned.plan.token);
    if (retained.activation === null) throw new Error('Interrupted activation lost its expected afterimage');
    const stagingBytes = Buffer.from(retained.activation);
    expect(await readFile(path.join(root, staging))).toEqual(stagingBytes);
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error)).toMatchObject({
      code: 'ENOENT',
    });
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    expect(fault.moves ?? 0).toBe(0);

    const packageReadsBeforeDenial = packageBundleReadCalls;
    await assertUnknownRequiresExplicitSameId(
      root,
      planned.plan.operation_id,
      'VIDA project upgrade: UNKNOWN activation requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(packageReadsBeforeDenial);
    await expectFailure(
      upgrade.resumeFreshProjectUpgrade(root, planned.plan.operation_id),
      'VIDA project upgrade: UNKNOWN activation requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(packageReadsBeforeDenial);
    expect(await readFile(path.join(root, staging))).toEqual(stagingBytes);
    for (const file of planned.plan.files)
      expect(await readFile(path.join(root, file.path))).toEqual(Buffer.from(file.after));
    const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), { readonly: true, strict: true });
    try {
      const store = readOnlyUpgradeHost(root, database, planned);
      const fence = store.readMaintenanceFence();
      expect(fence).not.toBeNull();
      if (!fence) throw new Error('Interrupted activation lost its Host maintenance fence');
      expect(fence.status).toBe('held');
      expect(fence.binding).toEqual(upgrade.projectUpgradeFenceBinding(planned));
      store.assertMaintenanceFence({ fence, token: planned.plan.token });
    } finally {
      database.close();
    }
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    expect(fault.moves ?? 0).toBe(0);

    await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id, true);
    await assertCompleteHistory(root, planned);
    expect(await readFile(path.join(root, staging)).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    expect(fault.moves).toBe(1);
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('activation move lost acknowledgement requires same-id reconciliation and never repeats the move', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-activation-ack-001');
    const fault = arm({ root, kind: 'move', target: PROJECT_ACTIVATION_PATH, armed: true, calls: 0, effects: 0 });

    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture lost acknowledgement after the real no-replace move',
    );
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    const retained = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
    expect(retained.phase).toBe('unknown_activation_move');
    expect(retained.plan.token).toBe(planned.plan.token);

    await assertUnknownRequiresExplicitSameId(
      root,
      planned.plan.operation_id,
      'VIDA project upgrade: UNKNOWN activation requires explicit same-operation reconciliation',
    );
    await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id, true);
    await assertCompleteHistory(root, planned);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('typed no-effect activation move restores staging and retries only the same operation', async () => {
  const custody = beginCase(90_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-activation-no-effect-001');
    const staging = '.vida/.activation-' + planned.plan.operation_id + '.json';
    const fault = arm({
      root,
      kind: 'move-denied',
      target: PROJECT_ACTIVATION_PATH,
      armed: true,
      calls: 0,
      effects: 0,
    });
    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture typed no-effect activation move denial',
    );
    expect(fault.boundaryError).toBeInstanceOf(originalAccessModule.SafeRepositoryMoveError);
    expect(fault.boundaryError).toMatchObject({ code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' });
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(0);
    const retained = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
    expect(retained.phase).toBe('activation_staged');
    expect(retained.plan.token).toBe(planned.plan.token);
    const before = fault.stageBefore;
    if (!before || retained.activation === null) throw new Error('typed activation denial lost its staged beforeimage');
    expect(before.bytes).toEqual(Buffer.from(retained.activation));
    expect((await readFile(path.join(root, staging))).equals(before.bytes)).toBe(true);
    const identity = await stat(path.join(root, staging), { bigint: true });
    expect(identity.dev.toString()).toBe(before.device);
    expect(identity.ino.toString()).toBe(before.inode);
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error)).toMatchObject({
      code: 'ENOENT',
    });
    const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), { readonly: true, strict: true });
    try {
      const store = readOnlyUpgradeHost(root, database, planned);
      const fence = store.readMaintenanceFence();
      expect(fence?.status).toBe('held');
      expect(fence?.binding).toEqual(upgrade.projectUpgradeFenceBinding(planned));
      if (!fence) throw new Error('typed activation denial lost its held fence');
      store.assertMaintenanceFence({ fence, token: planned.plan.token });
    } finally {
      database.close();
    }
    const journalBefore = await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH));
    const replacement = await upgrade.resumeProjectUpgrade(root, `${planned.plan.operation_id}-replacement`, true).then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(replacement).toBeInstanceOf(Error);
    expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH))).toEqual(journalBefore);
    expect(fault.calls).toBe(1);
    await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id);
    await assertCompleteHistory(root, planned);
    expect(fault.calls).toBe(2);
    expect(fault.effects).toBe(1);
    const activated = await stat(path.join(root, PROJECT_ACTIVATION_PATH), { bigint: true });
    expect(activated.dev.toString()).toBe(before.device);
    expect(activated.ino.toString()).toBe(before.inode);
    expect((await readFile(path.join(root, PROJECT_ACTIVATION_PATH))).equals(before.bytes)).toBe(true);
    expect(await readFile(path.join(root, staging)).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 90_000);

test('release failure before effect retains UNKNOWN and never reissues from its held beforeimage', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-release-before-effect-001');
    const fault = arm({
      root,
      kind: 'release',
      workspaceId: planned.plan.workspace_id,
      beforeEffect: true,
      armed: true,
      calls: 0,
      effects: 0,
    });
    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture Host fence release failed before its effect',
    );
    const retained = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
    expect(retained.phase).toBe('unknown_release');
    expect(retained.plan.token).toBe(planned.plan.token);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(0);
    if (retained.activation === null) throw new Error('release failure lost its activation image');
    const activation = await readFile(path.join(root, PROJECT_ACTIVATION_PATH));
    expect(activation).toEqual(Buffer.from(retained.activation));
    const readFence = () => {
      const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), { readonly: true, strict: true });
      try {
        const store = readOnlyUpgradeHost(root, database, planned);
        const fence = store.readMaintenanceFence();
        expect(fence?.status).toBe('held');
        expect(fence?.binding).toEqual(upgrade.projectUpgradeFenceBinding(planned));
        if (!fence) throw new Error('pre-effect release failure lost its held fence');
        store.assertMaintenanceFence({ fence, token: planned.plan.token });
        return canonicalJson(fence);
      } finally {
        database.close();
      }
    };
    const fenceBefore = readFence();
    const journalBefore = await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH));
    const readsBeforeDenial = packageBundleReadCalls;
    await assertUnknownRequiresExplicitSameId(
      root,
      planned.plan.operation_id,
      'VIDA project upgrade: UNKNOWN release requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeDenial);
    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id, true),
      'VIDA project upgrade: release remains UNKNOWN; a held beforeimage cannot authorize reissue',
    );
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(0);
    expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH))).toEqual(journalBefore);
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH))).toEqual(activation);
    expect(readFence()).toBe(fenceBefore);
    expect(
      await readFile(path.join(root, projectUpgradeHistoryPath(planned.plan.operation_id))).catch(
        (error: unknown) => error,
      ),
    ).toMatchObject({ code: 'ENOENT' });
    custody.retained = true;
    console.error(`Retained expected UNKNOWN release fixture: ${root}`);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('release lost acknowledgement requires same-id reconciliation without a second fence release', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-release-ack-001');
    const fault = arm({
      root,
      kind: 'release',
      workspaceId: planned.plan.workspace_id,
      armed: true,
      calls: 0,
      effects: 0,
    });

    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture lost acknowledgement after the real Host fence release',
    );
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    const retained = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
    expect(retained.phase).toBe('unknown_release');
    expect(retained.plan.token).toBe(planned.plan.token);

    await assertUnknownRequiresExplicitSameId(
      root,
      planned.plan.operation_id,
      'VIDA project upgrade: UNKNOWN release requires explicit same-operation reconciliation',
    );
    await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id, true);
    await assertCompleteHistory(root, planned);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('typed no-effect retirement restores released custody and retries the same move once', async () => {
  const custody = beginCase(90_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-retirement-no-effect-001');
    const operationId = planned.plan.operation_id;
    const history = projectUpgradeHistoryPath(operationId);
    const fault = arm({
      root,
      kind: 'move-denied',
      target: history,
      workspaceId: planned.plan.workspace_id,
      armed: true,
      calls: 0,
      effects: 0,
    });
    await expectFailure(upgrade.resumeProjectUpgrade(root, operationId), 'fixture typed no-effect history move denial');
    expect(fault.boundaryError).toBeInstanceOf(originalAccessModule.SafeRepositoryMoveError);
    expect(fault.boundaryError).toMatchObject({ code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' });
    expect(fault).toMatchObject({ calls: 1, effects: 0, releaseCalls: 1 });
    const before = fault.stageBefore;
    if (!before) throw new Error('typed retirement denial lost its source image');
    const retiring = upgrade.validateProjectUpgradeOperation(JSON.parse(before.bytes.toString('utf8')));
    const retained = upgrade.inspectPlannedProjectUpgrade(root, operationId);
    expect(retiring.phase).toBe('retiring');
    expect(retained.phase).toBe('released');
    expect(retained.revision).toBe(retiring.revision + 1);
    expect(retained.plan.token).toBe(planned.plan.token);
    expect(canonicalJson(retained.plan)).toBe(canonicalJson(retiring.plan));
    expect(canonicalJson(retained.plan)).toBe(canonicalJson(planned.plan));
    expect(retained.activation).toBe(retiring.activation);
    const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    const journal = await readFile(journalPath);
    const identity = await stat(journalPath, { bigint: true });
    expect(identity.dev.toString()).toBe(before.device);
    if (retained.activation === null) throw new Error('retirement denial lost its activation');
    const activation = await readFile(path.join(root, PROJECT_ACTIVATION_PATH));
    expect(activation).toEqual(Buffer.from(retained.activation));
    const readFence = (): string => {
      const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), { readonly: true, strict: true });
      try {
        const fence = readOnlyUpgradeHost(root, database, planned).readMaintenanceFence();
        if (!fence) throw new Error('retirement denial lost its released fence');
        expect(fence.status).toBe('released');
        expect(fence.binding).toEqual(upgrade.projectUpgradeFenceBinding(planned));
        return canonicalJson(fence);
      } finally {
        database.close();
      }
    };
    const fence = readFence();
    expect(await readFile(path.join(root, history)).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
    const replacementError = await upgrade.resumeProjectUpgrade(root, operationId + '-replacement', true).then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(replacementError).toBeInstanceOf(Error);
    expect(await readFile(journalPath)).toEqual(journal);
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH))).toEqual(activation);
    expect(readFence()).toBe(fence);
    expect(fault).toMatchObject({ calls: 1, effects: 0, releaseCalls: 1 });
    await upgrade.resumeProjectUpgrade(root, operationId);
    await assertCompleteHistory(root, planned);
    expect(fault).toMatchObject({ calls: 2, effects: 1, releaseCalls: 1 });
    expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH))).toEqual(activation);
    expect(readFence()).toBe(fence);
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 90_000);

test('retirement lost acknowledgement completes observed afterimage without replaying the move', async () => {
  const custody = beginCase(60_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-retirement-ack-001');
    const history = projectUpgradeHistoryPath(planned.plan.operation_id);
    const fault = arm({ root, kind: 'move', target: history, armed: true, calls: 0, effects: 0 });

    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture lost acknowledgement after the real no-replace move',
    );
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    const historyBeforeRetry = await readFile(path.join(root, history), 'utf8');
    expect(historyBeforeRetry).toContain('"phase": "retiring"');
    expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH), 'utf8').catch(() => null)).toBeNull();

    const replacement = await upgrade.resumeProjectUpgrade(root, `${planned.plan.operation_id}-replacement`, true).then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(replacement).toBeInstanceOf(Error);
    expect(await readFile(path.join(root, history), 'utf8')).toBe(historyBeforeRetry);
    await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id);
    await assertCompleteHistory(root, planned);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id, true);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 60_000);

test('fresh Bun process reconciles the retained publication afterimage with exact same-operation consent', async () => {
  const custody = beginCase(90_000);
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, 'lifecycle-native-restart-001');
    const target = planned.plan.files.find((file) => file.before === null)?.path;
    if (target === undefined) throw new Error('fresh fixture has no file that requires publication');
    const fault = arm({ root, kind: 'write', target, armed: true, calls: 0, effects: 0 });

    await expectFailure(
      upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
      'fixture lost acknowledgement after the real file write',
    );
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    const afterimagePath = path.join(root, target);
    const afterimageBytes = await readFile(afterimagePath);
    const afterimageStat = await stat(afterimagePath, { bigint: true });
    expect(afterimageBytes).toEqual(Buffer.from(planned.plan.files.find((file) => file.path === target)!.after));
    const retained = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
    expect(retained.phase).toBe('unknown');
    expect(retained.plan.token).toBe(planned.plan.token);

    const readsBeforeFileDenial = packageBundleReadCalls;
    await assertUnknownRequiresExplicitSameId(
      root,
      planned.plan.operation_id,
      'VIDA project upgrade: UNKNOWN file publication requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeFileDenial);
    await expectFailure(
      upgrade.resumeFreshProjectUpgrade(root, planned.plan.operation_id, false),
      'VIDA project upgrade: UNKNOWN file publication requires explicit same-operation reconciliation',
    );
    expect(packageBundleReadCalls).toBe(readsBeforeFileDenial);
    expect(await readFile(afterimagePath)).toEqual(afterimageBytes);
    const afterimageAfterDenial = await stat(afterimagePath, { bigint: true });
    expect(afterimageAfterDenial.dev).toBe(afterimageStat.dev);
    expect(afterimageAfterDenial.ino).toBe(afterimageStat.ino);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);

    const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    const journalBeforeChildren = await readFile(journalPath, 'utf8');
    const wrongOperation = await runFreshBunResume(root, `${planned.plan.operation_id}-replacement`, true);
    expect(wrongOperation.error).toBeNull();
    expect(wrongOperation.signal).toBeNull();
    expect(wrongOperation.outputExceeded).toBe(false);
    expect(wrongOperation.timedOut).toBe(false);
    expect(wrongOperation.status).toBe(1);
    expect(wrongOperation.stderr).toContain('blocked');
    expect(await readFile(journalPath, 'utf8')).toBe(journalBeforeChildren);

    const defaultFalse = await runFreshBunResume(root, planned.plan.operation_id);
    expect(defaultFalse.error).toBeNull();
    expect(defaultFalse.signal).toBeNull();
    expect(defaultFalse.outputExceeded).toBe(false);
    expect(defaultFalse.timedOut).toBe(false);
    expect(defaultFalse.status).toBe(1);
    expect(defaultFalse.stderr).toContain('UNKNOWN file publication requires explicit same-operation reconciliation');
    expect(await readFile(journalPath, 'utf8')).toBe(journalBeforeChildren);
    expect(await readFile(afterimagePath)).toEqual(afterimageBytes);
    expect((await stat(afterimagePath, { bigint: true })).ino).toBe(afterimageStat.ino);

    const consentedChild = await runFreshBunResume(root, planned.plan.operation_id, true);
    expect(consentedChild.error).toBeNull();
    expect(consentedChild.signal).toBeNull();
    expect(consentedChild.outputExceeded).toBe(false);
    expect(consentedChild.timedOut).toBe(false);
    expect(consentedChild.status).toBe(0);
    await assertCompleteHistory(root, planned);
    expect(fault.calls).toBe(1);
    expect(fault.effects).toBe(1);
    expect(await readFile(afterimagePath)).toEqual(afterimageBytes);
    const finalAfterimageStat = await stat(afterimagePath, { bigint: true });
    expect(finalAfterimageStat.ino).toBe(afterimageStat.ino);
    expect(finalAfterimageStat.size).toBe(afterimageStat.size);
    completeRoot(root);
  } finally {
    settleCase(custody);
  }
}, 90_000);

test.each(['write', 'replace'] as const)(
  'fresh Bun stop before the %s publication effect retains UNKNOWN and forbids replay',
  async (method) => {
    const custody = beginCase(90_000);
    let qualified = false;
    try {
      const root = await makeFreshRepository();
      addRoot(root, custody);
      const planned = await planFresh(root, `lifecycle-pre-effect-${method}-001`);
      const file = planned.plan.files.find((candidate) =>
        method === 'write'
          ? candidate.before === null
          : candidate.path === 'AGENTS.md' && candidate.before !== null && candidate.before !== candidate.after,
      );
      if (!file) throw new Error(`Fresh fixture has no actual ${method} publication boundary`);
      const target = path.join(root, file.path);
      const beforeStat = file.before === null ? null : await stat(target, { bigint: true });
      const expectBeforeimage = async (): Promise<void> => {
        if (file.before === null) {
          expect(await readFile(target).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
        } else {
          if (beforeStat === null) throw new Error('Existing publication beforeimage has no original inode');
          expect(await readFile(target)).toEqual(Buffer.from(file.before));
          const currentStat = await stat(target, { bigint: true });
          expect(currentStat.dev).toBe(beforeStat.dev);
          expect(currentStat.ino).toBe(beforeStat.ino);
        }
      };
      await expectBeforeimage();
      // Genuine database preparation precedes the bounded publication child.
      // It publishes no configuration files and retains the operation's fence.
      await upgrade.resumeFreshProjectUpgradeDatabase(root, planned.plan.operation_id);
      await expectBeforeimage();
      const stopped = await runFreshBunResume(root, planned.plan.operation_id, undefined, {
        target: file.path,
        method,
        token: planned.plan.token,
      });
      expect(stopped).toMatchObject({ status: 86, signal: null, error: null, timedOut: false, outputExceeded: false });
      expect(stopped.stderr).toContain('verified pre-effect publication stop');
      const preparationLine = stopped.stderr
        .split('\n')
        .find((line) => line.includes('"schema":"ProjectUpgradePreparationTrace/v1"'));
      if (preparationLine === undefined) throw new Error('Verified stop has no preparation observation');
      const preparationTrace: unknown = JSON.parse(preparationLine);
      if (typeof preparationTrace !== 'object' || preparationTrace === null || !('preparations' in preparationTrace))
        throw new Error('Preparation observation is malformed');
      expect(preparationTrace).toMatchObject({
        schema: 'ProjectUpgradePreparationTrace/v1',
        operation_id: planned.plan.operation_id,
      });
      const preparations = preparationTrace.preparations;
      if (
        typeof preparations !== 'object' ||
        preparations === null ||
        !('artifacts' in preparations) ||
        !('initial_schema' in preparations)
      )
        throw new Error('Preparation observation has no supported aggregates');
      for (const value of [preparations.artifacts, preparations.initial_schema]) {
        if (
          typeof value !== 'object' ||
          value === null ||
          !('calls' in value) ||
          typeof value.calls !== 'number' ||
          !('completed' in value) ||
          !('total_ms' in value) ||
          typeof value.total_ms !== 'number' ||
          !('max_ms' in value) ||
          typeof value.max_ms !== 'number'
        )
          throw new Error('Preparation aggregate is malformed');
        expect(value.calls).toBeGreaterThan(0);
        expect(value.completed).toBe(value.calls);
        expect(value).toMatchObject({ failed: 0, in_flight: 0 });
        expect(Number.isFinite(value.total_ms)).toBe(true);
        expect(value.total_ms).toBeGreaterThanOrEqual(0);
        expect(value.max_ms).toBeLessThanOrEqual(value.total_ms);
      }
      // Abrupt exit deliberately leaves the operation lock. Inspect the actual
      // journal through the independent stable file reader without acquiring it.
      const access = originalRequireSafeRepositoryAccess(root);
      const retainedBytes = originalAccessModule.readRepositoryTextImage(
        access,
        PROJECT_UPGRADE_OPERATION_PATH,
        'interrupted upgrade fixture journal',
      );
      if (retainedBytes === null) throw new Error('Interrupted upgrade journal is missing');
      const retained = upgrade.validateProjectUpgradeOperation(JSON.parse(retainedBytes));
      expect(retained.phase).toBe('publishing');
      expect(retained.next_file).toBe(planned.plan.files.indexOf(file));
      expect(canonicalJson(retained.plan)).toBe(canonicalJson(planned.plan));
      await expectBeforeimage();

      const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), { readonly: true, strict: true });
      try {
        const store = readOnlyUpgradeHost(root, database, planned);
        const fence = store.readMaintenanceFence();
        expect(fence).not.toBeNull();
        if (!fence) throw new Error('Interrupted publication lost its Host maintenance fence');
        expect(fence.status).toBe('held');
        expect(fence.binding).toEqual(upgrade.projectUpgradeFenceBinding(planned));
        store.assertMaintenanceFence({ fence, token: planned.plan.token });
      } finally {
        database.close();
      }

      // Exercise the real dead-owner quarantine. Never unlink, touch, release,
      // or age the abandoned lock on behalf of the normal resume operation.
      const lockPath = path.join(root, `${PROJECT_UPGRADE_OPERATION_PATH}.lock`);
      const orphanLock = await lstat(lockPath);
      expect(orphanLock.isFile()).toBe(true);
      expect(orphanLock.nlink).toBe(1);
      const quarantineRemaining = Math.max(0, orphanLock.mtimeMs + 30_000 - Date.now());
      await new Promise<void>((resolve) => setTimeout(resolve, quarantineRemaining + 5));
      const retainedLock = await lstat(lockPath);
      expect(retainedLock.isFile()).toBe(true);
      expect(retainedLock.nlink).toBe(1);
      expect(retainedLock.dev).toBe(orphanLock.dev);
      expect(retainedLock.ino).toBe(orphanLock.ino);
      expect(retainedLock.mtimeMs).toBe(orphanLock.mtimeMs);
      expect(Date.now() - retainedLock.mtimeMs).toBeGreaterThanOrEqual(30_000);
      expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH), 'utf8')).toBe(retainedBytes);
      const resumed = await runFreshBunResume(root, planned.plan.operation_id);
      expect(resumed).toMatchObject({ status: 1, signal: null, error: null, timedOut: false, outputExceeded: false });
      expect(resumed.stderr).toContain('interrupted publication outcome remains unresolved');
      const unknown = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
      expect(unknown.phase).toBe('unknown');
      expect(unknown.next_file).toBe(retained.next_file);
      expect(canonicalJson(unknown.plan)).toBe(canonicalJson(planned.plan));
      await expectBeforeimage();
      const journalPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
      const journalBytes = await readFile(journalPath);
      const reconciled = await runFreshBunResume(root, planned.plan.operation_id, true);
      expect(reconciled).toMatchObject({
        status: 1,
        signal: null,
        error: null,
        timedOut: false,
        outputExceeded: false,
      });
      expect(reconciled.stderr).toContain('UNKNOWN publication outcome remains unresolved');
      expect(await readFile(journalPath)).toEqual(journalBytes);
      await expectBeforeimage();
      await assertUnknownRequiresExplicitSameId(
        root,
        planned.plan.operation_id,
        'VIDA project upgrade: UNKNOWN file publication requires explicit same-operation reconciliation',
      );
      onTestFinished(async () => {
        expect(await Bun.file(journalPath).exists()).toBe(true);
        expect((await lstat(root)).isDirectory()).toBe(true);
        expect(await readFile(journalPath)).toEqual(journalBytes);
      });
      // Successful denial assertions do not authorize disposing of the UNKNOWN operation.
      custody.retained = true;
      console.error(`Retaining UNKNOWN publication fixture through shared cleanup: ${root}`);
      qualified = true;
      completeRoot(root);
    } finally {
      if (!qualified) console.error(`Retained failed pre-effect fixture: ${custody.root ?? 'creation pending'}`);
      settleCase(custody);
    }
  },
  90_000,
);

function parseFixtureStop(stderr: string): Record<string, unknown> {
  const line = stderr.split('\n').find((item) => item.includes('"schema":"ProjectUpgradeFixtureStop/v1"'));
  if (line === undefined) throw new Error('Publication stop receipt is missing');
  const value: unknown = JSON.parse(line);
  if (!isPlainRecord(value)) throw new Error('Publication stop receipt is malformed');
  return value;
}

test('fresh Bun abrupt stop after activation move retains the exact afterimage and resumes without another move', async () => {
  const caseStartedAt = performance.now();
  const operationId = 'lifecycle-activation-process-death-001';
  async function timedPhase<T>(name: string, action: () => Promise<T>): Promise<T> {
    if (!bundleTimingEnabled) return action();
    recordBundleTiming({
      phase: 'activation-move-case-phase-start',
      operation_id: operationId,
      phase_name: name,
      case_elapsed_ms: performance.now() - caseStartedAt,
    });
    const phaseStartedAt = performance.now();
    let outcome: 'completed' | 'failed' = 'failed';
    try {
      const value = await action();
      outcome = 'completed';
      return value;
    } finally {
      recordBundleTiming({
        phase: 'activation-move-case-phase-terminal',
        operation_id: operationId,
        phase_name: name,
        outcome,
        case_elapsed_ms: performance.now() - caseStartedAt,
        phase_elapsed_ms: performance.now() - phaseStartedAt,
      });
    }
  }
  const custody = beginCase(90_000);
  let qualified = false;
  try {
    const root = await makeFreshRepository();
    addRoot(root, custody);
    const planned = await planFresh(root, operationId);
    await timedPhase('fresh-database-preparation-resume', () =>
      upgrade.resumeFreshProjectUpgradeDatabase(root, planned.plan.operation_id),
    );

    // Reach the owned staging boundary through the existing no-effect denial.
    // The fresh child then performs the real activation move and dies before its checkpoint.
    await timedPhase('typed-no-effect-staging-setup', async () => {
      const armed = arm({
        root,
        kind: 'move-denied',
        target: PROJECT_ACTIVATION_PATH,
        armed: true,
        calls: 0,
        effects: 0,
      });
      await expectFailure(
        upgrade.resumeProjectUpgrade(root, planned.plan.operation_id),
        'fixture typed no-effect activation move denial',
      );
      expect(armed.boundaryError).toBeInstanceOf(originalAccessModule.SafeRepositoryMoveError);
      expect(armed.boundaryError).toMatchObject({ code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' });
      expect(armed.calls).toBe(1);
      expect(armed.effects).toBe(0);
      const staged = upgrade.inspectPlannedProjectUpgrade(root, planned.plan.operation_id);
      expect(staged.phase).toBe('activation_staged');
      expect(staged.plan.token).toBe(planned.plan.token);
      expect(canonicalJson(staged.plan)).toBe(canonicalJson(planned.plan));
      if (staged.activation === null || armed.stageBefore === undefined)
        throw new Error('Activation process-death setup lost its staged beforeimage');
      expect(armed.stageBefore.bytes).toEqual(Buffer.from(staged.activation));
      for (const file of planned.plan.files)
        expect(await readFile(path.join(root, file.path))).toEqual(Buffer.from(file.after));
    });

    const stopped = await timedPhase('actual-move-child', () =>
      runFreshBunResume(root, planned.plan.operation_id, undefined, {
        target: PROJECT_ACTIVATION_PATH,
        method: 'move',
        token: planned.plan.token,
        mode: 'after',
      }),
    );
    expect(stopped).toMatchObject({
      status: 86,
      closeObserved: true,
      signal: null,
      error: null,
      timedOut: false,
      outputExceeded: false,
    });
    const receipt = parseFixtureStop(stopped.stderr);
    expect(receipt).toMatchObject({
      schema: 'ProjectUpgradeFixtureStop/v1',
      operation_id: planned.plan.operation_id,
      token: planned.plan.token,
      target: PROJECT_ACTIVATION_PATH,
      mode: 'after',
      boundary: 'delegated-move-resolved',
      phase: 'activating',
      next_file: planned.plan.files.length,
      move_calls: 1,
      effect_calls: 1,
    });

    const retainedState = await timedPhase('retained-afterimage-and-fence-checks', async () => {
      const access = originalRequireSafeRepositoryAccess(root);
      const retainedBytes = originalAccessModule.readRepositoryTextImage(
        access,
        PROJECT_UPGRADE_OPERATION_PATH,
        'interrupted activation move fixture journal',
      );
      if (retainedBytes === null) throw new Error('Interrupted activating journal is missing');
      const retained = upgrade.validateProjectUpgradeOperation(JSON.parse(retainedBytes));
      expect(retained.phase).toBe('activating');
      expect(retained.next_file).toBe(planned.plan.files.length);
      expect(canonicalJson(retained.plan)).toBe(canonicalJson(planned.plan));
      expect(retained.plan.token).toBe(planned.plan.token);
      if (retained.activation === null) throw new Error('Interrupted activating journal lost its activation image');
      const target = path.join(root, PROJECT_ACTIVATION_PATH);
      expect(await readFile(target)).toEqual(Buffer.from(retained.activation));
      const staging = path.join(root, `.vida/.activation-${planned.plan.operation_id}.json`);
      expect(await readFile(staging).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });
      const activationIdentity = await stat(target, { bigint: true });
      expect(receipt.device).toBe(activationIdentity.dev.toString());
      expect(receipt.inode).toBe(activationIdentity.ino.toString());

      const database = new Database(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH), { readonly: true, strict: true });
      try {
        const store = readOnlyUpgradeHost(root, database, planned);
        const fence = store.readMaintenanceFence();
        expect(fence?.status).toBe('held');
        expect(fence?.binding).toEqual(upgrade.projectUpgradeFenceBinding(planned));
        if (!fence) throw new Error('Interrupted activation move lost its Host maintenance fence');
        store.assertMaintenanceFence({ fence, token: planned.plan.token });
      } finally {
        database.close();
      }
      return { retainedBytes, activationIdentity, target };
    });
    const { retainedBytes, activationIdentity, target } = retainedState;

    const lockPath = path.join(root, `${PROJECT_UPGRADE_OPERATION_PATH}.lock`);
    await timedPhase('normal-30s-dead-owner-quarantine', async () => {
      const orphanLock = await lstat(lockPath);
      expect(orphanLock.isFile()).toBe(true);
      expect(orphanLock.nlink).toBe(1);
      const quarantineRemaining = Math.max(0, orphanLock.mtimeMs + 30_000 - Date.now());
      await new Promise<void>((resolve) => setTimeout(resolve, quarantineRemaining + 5));
      const agedLock = await lstat(lockPath);
      expect(agedLock.dev).toBe(orphanLock.dev);
      expect(agedLock.ino).toBe(orphanLock.ino);
      expect(agedLock.mtimeMs).toBe(orphanLock.mtimeMs);
      expect(Date.now() - agedLock.mtimeMs).toBeGreaterThanOrEqual(30_000);
      expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH), 'utf8')).toBe(retainedBytes);
    });

    const resumedMoveObservation = arm({
      root,
      kind: 'write',
      target: PROJECT_ACTIVATION_PATH,
      armed: false,
      calls: 0,
      effects: 0,
    });
    // Exercise the public same-ID API in this process and count any activation move.
    await timedPhase('final-same-id-resume-and-history', async () => {
      await upgrade.resumeProjectUpgrade(root, planned.plan.operation_id);
      await assertCompleteHistory(root, planned);
      expect(resumedMoveObservation.moves ?? 0).toBe(0);
      const finalIdentity = await stat(target, { bigint: true });
      expect(finalIdentity.dev).toBe(activationIdentity.dev);
      expect(finalIdentity.ino).toBe(activationIdentity.ino);
    });
    qualified = true;
    completeRoot(root);
  } finally {
    if (!qualified)
      console.error(`Retained failed activation process-death fixture: ${custody.root ?? 'creation pending'}`);
    settleCase(custody);
  }
}, 90_000);

test.each(['first', 'last'] as const)(
  'fresh Bun abrupt stop after the %s publication write resumes the exact afterimage once',
  async (boundary) => {
    const custody = beginCase(90_000);
    let qualified = false;
    try {
      const root = await makeFreshRepository();
      addRoot(root, custody);
      const operationId = `lifecycle-interrupted-afterimage-${boundary}-001`;
      const planned = await planFresh(root, operationId);
      const fileIndex =
        boundary === 'first'
          ? planned.plan.files.findIndex((file) => file.before === null)
          : planned.plan.files.length - 1;
      const file = planned.plan.files[fileIndex];
      if (file === undefined) throw new Error('Fresh fixture has no exclusive config publication target');
      // The existing child-stop fixture intentionally supports only a real
      // writeExclusiveAsync afterimage. Do not silently claim coverage if the
      // last planned file changes to replacement semantics.
      expect(file.before).toBeNull();
      const target = path.join(root, file.path);
      expect(await readFile(target).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });

      // Establish the real held fence and published workspace before the child.
      await upgrade.resumeFreshProjectUpgradeDatabase(root, planned.plan.operation_id);
      expect(await readFile(target).catch((error: unknown) => error)).toMatchObject({ code: 'ENOENT' });

      // The helper validates phase/token/target/beforeimage, delegates one actual
      // writeExclusiveAsync, observes its exact afterimage, writes one bounded
      // receipt, then exits without returning to the journal checkpoint.
      const stopped = await runFreshBunResume(root, planned.plan.operation_id, undefined, {
        target: file.path,
        method: 'write',
        token: planned.plan.token,
        mode: 'after',
      });
      expect(stopped).toMatchObject({
        status: 86,
        signal: null,
        error: null,
        timedOut: false,
        outputExceeded: false,
      });
      const receipt = parseFixtureStop(stopped.stderr);
      expect(receipt).toMatchObject({
        schema: 'ProjectUpgradeFixtureStop/v1',
        operation_id: planned.plan.operation_id,
        token: planned.plan.token,
        target: file.path,
        mode: 'after',
        boundary: 'delegated-write-resolved',
        phase: 'publishing',
        next_file: fileIndex,
        effect_calls: 1,
      });

      // `close` from runFreshBunResume observes the direct child and its pipes. Only
      // now read the fixture. Use the non-locking stable journal reader while the
      // child's actual operation lock remains abandoned.
      const access = originalRequireSafeRepositoryAccess(root);
      const retainedBytes = originalAccessModule.readRepositoryTextImage(
        access,
        PROJECT_UPGRADE_OPERATION_PATH,
        'interrupted afterimage fixture journal',
      );
      if (retainedBytes === null) throw new Error('Interrupted publishing journal is missing');
      const retained = upgrade.validateProjectUpgradeOperation(JSON.parse(retainedBytes));
      expect(retained.phase).toBe('publishing');
      expect(retained.next_file).toBe(fileIndex);
      expect(canonicalJson(retained.plan)).toBe(canonicalJson(planned.plan));
      for (const published of planned.plan.files.slice(0, fileIndex + 1))
        expect(await readFile(path.join(root, published.path))).toEqual(Buffer.from(published.after));
      expect(await readFile(path.join(root, PROJECT_ACTIVATION_PATH)).catch((error: unknown) => error)).toMatchObject({
        code: 'ENOENT',
      });
      expect(await readFile(target)).toEqual(Buffer.from(file.after));
      const afterimageIdentity = await stat(target, { bigint: true });

      // Match the existing dead-owner path: wait for the normal quarantine age,
      // without touching, unlinking or aging the child-owned lock. Every child
      // reports its own terminal result; group-wide termination remains separate evidence.
      const lockPath = path.join(root, `${PROJECT_UPGRADE_OPERATION_PATH}.lock`);
      const orphanLock = await lstat(lockPath);
      expect(orphanLock.isFile()).toBe(true);
      expect(orphanLock.nlink).toBe(1);
      const quarantineRemaining = Math.max(0, orphanLock.mtimeMs + 30_000 - Date.now());
      await new Promise<void>((resolve) => setTimeout(resolve, quarantineRemaining + 5));
      const agedLock = await lstat(lockPath);
      expect(agedLock.dev).toBe(orphanLock.dev);
      expect(agedLock.ino).toBe(orphanLock.ino);
      expect(agedLock.mtimeMs).toBe(orphanLock.mtimeMs);
      expect(Date.now() - agedLock.mtimeMs).toBeGreaterThanOrEqual(30_000);
      expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH), 'utf8')).toBe(retainedBytes);

      // This is the ordinary public same-ID resume. The lock owner was a dead
      // child; normal safe-repository quarantine/reacquisition remains the only
      // lock transition. Keep the existing 45s child cap.
      const resumed = await runFreshBunResume(root, planned.plan.operation_id);
      expect(resumed).toMatchObject({ status: 0, signal: null, error: null, timedOut: false, outputExceeded: false });
      const completed = await assertCompleteHistory(root, planned);
      expect(canonicalJson(completed.plan)).toBe(canonicalJson(planned.plan));
      expect(completed.plan.token).toBe(planned.plan.token);
      expect(await readFile(target)).toEqual(Buffer.from(file.after));
      const finalIdentity = await stat(target, { bigint: true });
      expect(finalIdentity.dev).toBe(afterimageIdentity.dev);
      expect(finalIdentity.ino).toBe(afterimageIdentity.ino);
      qualified = true;
      completeRoot(root);
    } finally {
      if (!qualified)
        console.error(`Retained failed interrupted-afterimage fixture: ${custody.root ?? 'creation pending'}`);
      settleCase(custody);
    }
  },
  90_000,
);

test('upgrade artifact closure reuse is bounded to the last verified plan and preserves independent validators', async () => {
  const custody = beginCase(90_000);
  const root = await makeFreshRepository();
  addRoot(root, custody);
  const prepare = artifactProducer.prepareProjectUpgradeArtifacts;
  let calls = 0;
  const producer = spyOn(artifactProducer, 'prepareProjectUpgradeArtifacts').mockImplementation((...args) => {
    calls++;
    return prepare(...args);
  });
  try {
    const first = upgrade.inspectProjectUpgrade(root, {
      operation_id: 'lifecycle-pure-closure-001',
      actor: 'test-owner',
      instruction_ref: 'artifact closure regression',
    });
    expect(calls).toBe(2); // Actual capture plus its independent derived-closure validation.
    const clones = Array.from({ length: 3 }, (): unknown => JSON.parse(canonicalJson(first)));
    calls = 0;
    for (const clone of clones)
      expect(canonicalJson(upgrade.validateProjectUpgradeOperation(clone))).toBe(canonicalJson(first));
    expect(calls).toBe(0);

    const second = upgrade.inspectProjectUpgrade(root, {
      operation_id: 'lifecycle-pure-closure-002',
      actor: 'test-owner',
      instruction_ref: 'distinct actual capture',
    });
    expect(second.plan_digest).not.toBe(first.plan_digest);
    expect(calls).toBe(2);
    calls = 0;
    expect(canonicalJson(upgrade.validateProjectUpgradeOperation(JSON.parse(canonicalJson(first))))).toBe(
      canonicalJson(first),
    );
    expect(calls).toBe(1); // One-entry bound: the other successfully checked plan displaced this one.

    calls = 0;
    expect(() => upgrade.validateProjectUpgradeOperation({ ...first, next_file: 1 })).toThrow(
      'unfenced publication progress',
    );
    expect(() => upgrade.validateProjectUpgradeOperation({ ...first, plan_digest: '0'.repeat(64) })).toThrow(
      'frozen plan differs',
    );
    expect(() => upgrade.validateProjectUpgradeOperation({ ...first, unrecognized: true })).toThrow();
    expect(calls).toBe(0);

    const changedPlan = {
      ...first.plan,
      files: first.plan.files.map((file, index) => (index === 0 ? { ...file, after: file.after + '\n' } : file)),
    };
    expect(() =>
      upgrade.validateProjectUpgradeOperation({
        ...first,
        plan: changedPlan,
        plan_digest: canonicalJsonDigest(changedPlan),
      }),
    ).toThrow('prepared output differs from the bundle converter');
    expect(calls).toBe(1);
    calls = 0;
    expect(canonicalJson(upgrade.validateProjectUpgradeOperation(JSON.parse(canonicalJson(first))))).toBe(
      canonicalJson(first),
    );
    expect(calls).toBe(0); // A failed closure cannot replace the successful entry.
    expect(
      await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH)).catch((error: unknown) => error),
    ).toMatchObject({ code: 'ENOENT' });
    expect(
      await readFile(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH)).catch((error: unknown) => error),
    ).toMatchObject({ code: 'ENOENT' });
    completeRoot(root);
  } finally {
    producer.mockRestore();
    settleCase(custody);
  }
}, 90_000);

test('fresh upgrade planning reuses the validated plan configuration during dependency checks', async () => {
  const custody = beginCase();
  const root = await makeFreshRepository();
  addRoot(root, custody);
  const prepare = artifactProducer.prepareProjectUpgradeArtifacts;
  const dependencyPaths = artifactProducer.projectUpgradeDependencyPaths;
  const configsPrepared: Parameters<typeof prepare>[0][] = [];
  let completedPreparations = 0;
  let checkedDependencies: Parameters<typeof prepare>[0] | undefined;
  const prepareSpy = spyOn(artifactProducer, 'prepareProjectUpgradeArtifacts').mockImplementation((...args) => {
    const prepared = prepare(...args);
    configsPrepared.push(args[0]);
    completedPreparations++;
    return prepared;
  });
  const dependencySpy = spyOn(artifactProducer, 'projectUpgradeDependencyPaths').mockImplementation((...args) => {
    const paths = dependencyPaths(...args);
    if (completedPreparations >= 2 && checkedDependencies === undefined) checkedDependencies = args[1];
    return paths;
  });
  let qualified = false;
  try {
    const planned = await planFresh(root, 'lifecycle-config-reuse-001');
    expect(completedPreparations).toBe(2); // Real capture and independent derived-closure validation.
    expect(configsPrepared).toHaveLength(2);
    expect(checkedDependencies).toBeDefined();
    expect(configsPrepared[1]).toBeDefined();
    expect(checkedDependencies === configsPrepared[1]).toBe(true);

    expect(planned).toMatchObject({
      phase: 'planned',
      next_file: 0,
      plan: { database_mode: 'fresh' },
      storage_phase: 'absent',
      activation: null,
    });
    expect(planned.initial_database).not.toBeNull();
    expect(await readFile(path.join(root, PROJECT_UPGRADE_OPERATION_PATH), 'utf8')).toBe(
      JSON.stringify(planned, null, 2) + '\n',
    );
    expect(
      await readFile(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH)).catch((error: unknown) => error),
    ).toMatchObject({ code: 'ENOENT' });
    for (const dependency of planned.plan.dependencies) {
      const current = await readFile(path.join(root, dependency.path), 'utf8').catch((error: unknown) => error);
      if (dependency.bytes === null) expect(current).toMatchObject({ code: 'ENOENT' });
      else expect(current).toBe(dependency.bytes);
    }
    qualified = true;
    completeRoot(root);
  } finally {
    prepareSpy.mockRestore();
    dependencySpy.mockRestore();
    if (!qualified) console.error(`Retained failed fresh config-reuse fixture: ${custody.root ?? 'creation pending'}`);
    settleCase(custody);
  }
});
