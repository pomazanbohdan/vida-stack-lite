import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  existsSync,
  fsyncSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync,
  type BigIntStats,
} from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readCliErrorProperty as errorProperty } from './cli-error-properties.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';

const bundleRoot = fileURLToPath(new URL('../', import.meta.url));

interface ExecutionBudget {
  deadline: number;
  remaining(maximum?: number): number;
  cleanupTimeout(): number;
  child(duration: number, reserve?: number): ExecutionBudget;
}
interface CommandResult {
  status: number | null;
  signal?: NodeJS.Signals | null;
  pid?: number;
  error?: NodeJS.ErrnoException;
  stdout?: string | Buffer | null;
  stderr?: string | Buffer | null;
}
interface TrackedCommandResult extends CommandResult {
  timedOut?: boolean | undefined;
  timeoutMs?: number | undefined;
  cleanupTimeoutMs?: number | undefined;
  cleanupAttempted?: boolean | undefined;
  cleanupOutcome?: string | undefined;
  cleanupStatus?: number | null | undefined;
  cleanupErrorCode?: string | undefined;
  childElapsedMs?: number | undefined;
  cleanupElapsedMs?: number | undefined;
  diagnosticLabel?: string | undefined;
  elapsedMs?: number | undefined;
}
type TerminalCommandResult = TrackedCommandResult & { status: number };
interface CleanupResult {
  status?: number | null;
  signal?: NodeJS.Signals | null;
  error?: NodeJS.ErrnoException;
}
type TimeoutCleanup = (pid: number, timeout: number) => CleanupResult | undefined;
type PinnedSpawnOptions = import('node:child_process').SpawnSyncOptions & { detached?: boolean };
type PinnedSpawn = (command: string, args: readonly string[], options: PinnedSpawnOptions) => CommandResult;
type BoundedSpawnOptions = PinnedSpawnOptions & {
  budget?: ExecutionBudget | undefined;
  diagnostics?: boolean | undefined;
  coverageReviewPolicy?: CoverageReviewClockPolicy | undefined;
};
type CoverageReviewClockPolicy = {
  maximum_ms: number;
  report_reserve_ms: 30000;
  original_duration_ms: string | null;
  original_expiry_ms: string | null;
  ancestor_duration_ms: string | null;
  ancestor_expiry_ms: string | null;
};
interface BunOptions {
  root?: string;
  env?: NodeJS.ProcessEnv;
  executable?: string;
  node?: string;
  npmCli?: string;
  spawn?: PinnedSpawn;
  cleanup?: TimeoutCleanup;
  budget?: ExecutionBudget | undefined;
  cwd?: string;
  timeoutMs?: number;
  diagnostics?: boolean;
}

function errorCode(error: unknown): string | undefined {
  const code = errorProperty(error, 'code');
  return typeof code === 'string' ? code : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function manifestRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('Bun manifest must contain JSON objects.');
  return value;
}

function parseManifest(bytes: string): Record<string, unknown> {
  const value: unknown = JSON.parse(bytes);
  return manifestRecord(value);
}

// These markers select an already materialized executable payload, never authority.
export function standaloneRuntime(env: NodeJS.ProcessEnv = process.env): { root: string; executable: string } | null {
  const root = env.VIDA_STANDALONE_ROOT;
  const executable = env.VIDA_STANDALONE_EXECUTABLE;
  if (root === undefined && executable === undefined) return null;
  if (
    typeof process.versions.bun !== 'string' ||
    env.BUN_BE_BUN !== '1' ||
    typeof root !== 'string' ||
    !path.isAbsolute(root) ||
    path.resolve(root) !== root ||
    typeof executable !== 'string' ||
    !path.isAbsolute(executable) ||
    realpathSync(executable) !== realpathSync(process.execPath)
  )
    throw new Error('Embedded runtime markers do not match the executing pinned Bun payload.');
  for (let current = root; ; current = path.dirname(current)) {
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Embedded package root must be a non-link directory.');
    if (current === path.dirname(current)) break;
  }
  const manifest = parseManifest(readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (manifest.name !== 'vida-agent') throw new Error('Embedded package identity differs.');
  const pin = readPin(root);
  checkManifest(root, pin);
  if (pin !== process.versions.bun) throw new Error('Embedded runtime pin differs.');
  return { root, executable: realpathSync(executable) };
}

export function standaloneEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const runtime = standaloneRuntime(env);
  if (!runtime) return { ...env };
  const next = { ...env };
  for (const key of Object.keys(next))
    if (['NODE_OPTIONS', 'BUN_OPTIONS'].includes(key.toUpperCase())) delete next[key];
  next.BUN_BE_BUN = '1';
  return next;
}

export function readPin(root: string = bundleRoot): string {
  const file = path.join(root, '.bun-version');
  const identity = lstatSync(file);
  if (!identity.isFile() || identity.isSymbolicLink()) throw new Error('Bun pin must be a regular non-link file.');
  const pin = readFileSync(file, 'utf8').trim();
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(pin)) {
    throw new Error('.bun-version must contain one exact stable Bun version.');
  }
  return pin;
}

function manifestEngines(manifest: Record<string, unknown>): Record<string, unknown> {
  return manifestRecord(manifest.engines ?? {});
}

export function checkManifest(root: string, pin: string): void {
  const manifest = parseManifest(readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (manifest.packageManager !== `bun@${pin}` || manifestEngines(manifest).bun !== pin) {
    throw new Error(
      'Bun manifest mirrors differ from .bun-version; run bun bin/bun.ts --sync-pin from packages/agent.',
    );
  }
}

function pinStageStatus(file: string, identity: Pick<BigIntStats, 'dev' | 'ino'>) {
  const current = lstatSync(file, { bigint: true, throwIfNoEntry: false });
  if (current === undefined) return 'missing';
  if (!current.isFile() || current.isSymbolicLink() || current.dev !== identity.dev || current.ino !== identity.ino)
    return 'identity-mismatch';
  return 'match';
}

export function syncPin(root: string = bundleRoot): boolean {
  const pin = readPin(root);
  const file = path.join(root, 'package.json');
  let ancestor = path.resolve(root);
  for (;;) {
    if (lstatSync(ancestor).isSymbolicLink()) throw new Error('Bun manifest root contains a symbolic link.');
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  const identity = lstatSync(file);
  if (!identity.isFile() || identity.isSymbolicLink()) throw new Error('Bun manifest must be a regular file.');
  const before = readFileSync(file, 'utf8');
  const manifest = parseManifest(before);
  const engines = manifestEngines(manifest);
  if (manifest.packageManager === `bun@${pin}` && engines.bun === pin) return false;
  manifest.packageManager = `bun@${pin}`;
  manifest.engines = { ...engines, bun: pin };
  const after = `${JSON.stringify(manifest, null, 2)}\n`;
  const temporary = path.join(root, `.bun-pin-${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  let ownsTemporary = false;
  let stageIdentity: Pick<BigIntStats, 'dev' | 'ino'> | undefined;
  let primaryFailure: { error: unknown } | undefined;
  try {
    descriptor = openSync(temporary, 'wx', identity.mode & 0o777);
    ownsTemporary = true;
    stageIdentity = fstatSync(descriptor, { bigint: true });
    writeFileSync(descriptor, before.includes('\r\n') ? after.replaceAll('\n', '\r\n') : after);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    const current = lstatSync(file);
    if (
      !current.isFile() ||
      current.isSymbolicLink() ||
      current.dev !== identity.dev ||
      current.ino !== identity.ino ||
      readFileSync(file, 'utf8') !== before ||
      readPin(root) !== pin
    ) {
      throw new Error('Bun pin or manifest changed during synchronization; retry against the current files.');
    }
    if (pinStageStatus(temporary, stageIdentity) !== 'match')
      throw new Error('Bun staged manifest identity changed during synchronization; no replacement permitted.');
    renameSync(temporary, file);
    ownsTemporary = false;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          if (descriptor !== undefined) closeSync(descriptor);
        },
        () => {
          if (!ownsTemporary) return;
          if (stageIdentity === undefined) return 'indeterminate';
          const status = pinStageStatus(temporary, stageIdentity);
          if (status !== 'match') return status;
          unlinkSync(temporary);
          return 'removed';
        },
      ],
      primaryFailure,
    );
  }
  return true;
}

export function findNpmCli(node: string = process.execPath): string {
  const directory = path.dirname(realpathSync(node));
  const candidates = [
    path.join(directory, 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(directory, '../lib/node_modules/npm/bin/npm-cli.js'),
    path.resolve(directory, '../share/nodejs/npm/bin/npm-cli.js'),
  ];
  const found = candidates.find(
    (file) => file && path.basename(file) === 'npm-cli.js' && existsSync(file) && statSync(file).isFile(),
  );
  if (!found) throw new Error('Pinned Bun bootstrap requires Node.js with npm installed.');
  return found;
}

function positiveExitStatus(status: number | null): number {
  return typeof status === 'number' && Number.isInteger(status) && status > 0 ? status : 1;
}

function nonzeroIntegerStatus(status: number | null | undefined): boolean {
  return typeof status === 'number' && Number.isInteger(status) && status !== 0;
}

function unknownExitStatus(status: number | null | undefined): boolean {
  return typeof status !== 'number' || !Number.isSafeInteger(status) || status < 0;
}

function succeeded(result: TrackedCommandResult, label: string): string {
  if (result.error || result.signal || result.status !== 0) {
    const diagnostic = result.timedOut
      ? ` Timed out after ${result.timeoutMs} ms${result.cleanupAttempted ? '; process-tree cleanup was attempted' : ''}. Cleanup outcome: ${result.cleanupOutcome ?? 'unknown'}.`
      : '';
    const error = Object.assign(
      new Error(`${label} failed${result.signal ? ` (${result.signal})` : ''}.${diagnostic}`),
      {
        exitCode: positiveExitStatus(result.status),
        timedOut: result.timedOut ?? false,
        cause: result.error,
      },
    );
    throw error;
  }
  return String(result.stdout ?? '').trim();
}

function cleanupTimedOutProcessTree(result: TrackedCommandResult, cleanup: TimeoutCleanup = defaultTimeoutCleanup) {
  if (!result?.pid) return { attempted: false, outcome: 'unknown' };
  try {
    const observation = cleanup(result.pid, result.cleanupTimeoutMs ?? 30_000);
    const outcome =
      observation?.error || observation?.signal || nonzeroIntegerStatus(observation?.status)
        ? 'failed'
        : observation?.status === 0
          ? 'command_succeeded'
          : 'unknown';
    return { attempted: true, outcome, status: observation?.status, error_code: errorCode(observation?.error) };
  } catch (error: unknown) {
    return { attempted: true, outcome: 'failed', error_code: errorCode(error) };
  }
}

function defaultTimeoutCleanup(pid: number, timeout = 30_000): CleanupResult | undefined {
  if (process.platform === 'win32') {
    return spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
      timeout,
    });
  }
  process.kill(-pid, 'SIGKILL');
  return undefined; // A sent signal is not observed process-tree termination.
}

function executionCeiling(env: NodeJS.ProcessEnv): { duration: number; expiry: number } {
  const duration = env.VIDA_PINNED_COMMAND_BUDGET_MS;
  const expiry = env.VIDA_PINNED_COMMAND_DEADLINE_MS;
  for (const value of [duration, expiry])
    if (value !== undefined && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))))
      throw new Error('Invalid inherited pinned command budget.');
  return {
    duration: duration === undefined ? Infinity : Number(duration),
    expiry: expiry === undefined ? Infinity : Number(expiry),
  };
}
const inherited = executionCeiling(process.env);
const inheritedDeadline = performance.now() + Math.min(inherited.duration, inherited.expiry - Date.now());

export function writeDiagnosticSync(
  value: string,
  write: (fd: number, bytes: Buffer, offset: number, length: number) => number = writeSync,
): void {
  const bytes = Buffer.from(value);
  let confirmedBytes = 0;
  while (confirmedBytes < bytes.length) {
    try {
      const remaining = bytes.length - confirmedBytes;
      const written = write(2, bytes, confirmedBytes, remaining);
      if (!Number.isInteger(written) || written <= 0 || written > remaining)
        throw new Error('Diagnostic output returned an invalid byte count.');
      confirmedBytes += written;
    } catch (error) {
      throw Object.assign(new Error('Diagnostic output failed.', { cause: error }), { confirmedBytes });
    }
  }
}

export function executionBudget(timeoutMs = Infinity, reserveMs = 1_000, parentDeadline = Infinity): ExecutionBudget {
  if (
    !(Number.isSafeInteger(timeoutMs) || timeoutMs === Infinity) ||
    timeoutMs <= 0 ||
    !Number.isSafeInteger(reserveMs) ||
    reserveMs < 0 ||
    !(Number.isFinite(parentDeadline) || parentDeadline === Infinity)
  )
    throw new Error('Execution budget and reserve must be bounded integer durations.');
  const deadline = Math.min(performance.now() + timeoutMs, inheritedDeadline, parentDeadline);
  return {
    deadline,
    remaining(maximum = timeoutMs) {
      if (!(Number.isSafeInteger(maximum) || maximum === Infinity) || maximum <= 0)
        throw new Error('Child allowance must be a positive integer duration.');
      const remaining = Math.floor(Math.min(maximum, deadline - performance.now() - reserveMs));
      if (remaining <= 0) throw new Error('Execution budget exhausted before child launch.');
      return remaining;
    },
    cleanupTimeout() {
      // The existing reserve covers both cleanup and reporting. Cleanup cannot
      // spend the report half, even when the child returns after its allowance.
      if (reserveMs === 0) return Math.max(0, Math.floor(deadline - performance.now()));
      return Math.max(
        0,
        Math.min(Math.floor(reserveMs / 2), Math.floor(deadline - performance.now() - Math.ceil(reserveMs / 2))),
      );
    },
    child(duration: number, reserve = 1_000) {
      return executionBudget(duration, reserve, deadline - reserveMs);
    },
  };
}

export function boundedSpawnSync(
  spawn: PinnedSpawn,
  command: string,
  args: readonly string[],
  options: BoundedSpawnOptions,
  label: string,
  cleanup: TimeoutCleanup = defaultTimeoutCleanup,
): TrackedCommandResult {
  const { budget, diagnostics = false, timeout = Infinity, coverageReviewPolicy, ...spawnOptions } = options;
  if (!(Number.isSafeInteger(timeout) || timeout === Infinity) || timeout <= 0)
    throw new Error('Child allowance must be a positive integer duration.');
  const environment = options.env ?? process.env;
  const ceiling = executionCeiling(environment);
  const allowance = Math.min(
    timeout,
    ceiling.duration,
    ceiling.expiry - Date.now(),
    inheritedDeadline - performance.now(),
  );
  if (allowance <= 0) throw new Error('Execution budget exhausted before child launch.');
  const timeoutMs = budget ? budget.remaining(Math.floor(allowance)) : Math.floor(allowance);
  const issuedAt = Date.now();
  const childDeadline = Math.min(ceiling.expiry, inherited.expiry, issuedAt + timeoutMs);
  const started = performance.now();
  const childEnvironment: NodeJS.ProcessEnv = { ...environment, VIDA_COVERAGE_REVIEW_CLOCK_POLICY: undefined };
  const childOptions: PinnedSpawnOptions = {
    ...spawnOptions,
    env: childEnvironment,
    killSignal: 'SIGKILL',
    detached: process.platform !== 'win32',
  };
  if (Number.isFinite(timeoutMs)) {
    childOptions.timeout = timeoutMs;
    childEnvironment.VIDA_PINNED_COMMAND_BUDGET_MS = String(timeoutMs);
    childEnvironment.VIDA_PINNED_COMMAND_DEADLINE_MS = String(childDeadline);
    if (coverageReviewPolicy)
      childEnvironment.VIDA_COVERAGE_REVIEW_CLOCK_POLICY = JSON.stringify({
        ...coverageReviewPolicy,
        budget_ms: String(timeoutMs),
        deadline_ms: String(childDeadline),
        issued_at_ms: issuedAt,
      });
  }
  const result: TrackedCommandResult = spawn(command, args, childOptions);
  result.childElapsedMs = performance.now() - started;
  if (result?.error?.code === 'ETIMEDOUT') {
    result.timedOut = true;
    result.timeoutMs = timeoutMs;
    result.cleanupTimeoutMs = budget ? Math.min(30_000, budget.cleanupTimeout()) : 30_000;
    const cleanupStarted = performance.now();
    const observation =
      result.cleanupTimeoutMs > 0
        ? cleanupTimedOutProcessTree(result, cleanup)
        : { attempted: false, outcome: 'unknown', status: undefined, error_code: undefined };
    result.cleanupAttempted = observation.attempted;
    result.cleanupOutcome = observation.outcome;
    result.cleanupStatus = observation.status;
    result.cleanupErrorCode = observation.error_code;
    result.cleanupElapsedMs = performance.now() - cleanupStarted;
    result.diagnosticLabel = label;
  }
  result.elapsedMs = performance.now() - started;
  if (diagnostics) {
    try {
      writeDiagnosticSync(
        JSON.stringify({
          stage: label,
          elapsed_ms: performance.now() - started,
          child_elapsed_ms: result.childElapsedMs,
          cleanup_elapsed_ms: result.cleanupElapsedMs ?? null,
          cleanup_allowance_ms: result.cleanupTimeoutMs ?? null,
          timeout_ms: Number.isFinite(timeoutMs) ? timeoutMs : null,
          status: result.status,
          signal: result.signal,
          timed_out: result.timedOut ?? false,
          cleanup_outcome: result.cleanupOutcome ?? null,
          cleanup_status: result.cleanupStatus ?? null,
          cleanup_error_code: result.cleanupErrorCode ?? null,
          error_code: result.error?.code ?? null,
        }) + '\n',
      );
    } catch (outputError) {
      const error = result.error
        ? new AggregateError([result.error, outputError], 'Child observation and diagnostic output failed.')
        : new Error('Child observation and diagnostic output failed.', { cause: outputError });
      throw Object.assign(error, { outputError, result });
    }
  }
  return result;
}

function isTerminalCommandResult(result: TrackedCommandResult | null | undefined): result is TerminalCommandResult {
  return !(
    !result ||
    result.timedOut === true ||
    Boolean(result.error) ||
    Boolean(result.signal) ||
    unknownExitStatus(result.status)
  );
}

export function commandOutcomeUnknown(result: TrackedCommandResult | null | undefined): boolean {
  return !isTerminalCommandResult(result);
}

export function requireTerminalCommand(
  result: TrackedCommandResult | null | undefined,
  label: string,
): TrackedCommandResult {
  if (!isTerminalCommandResult(result))
    throw new Error(
      `${label}: uncertain command outcome ${JSON.stringify({
        status: result?.status ?? null,
        signal: result?.signal ?? null,
        error_code: result?.error?.code ?? null,
        timed_out: result?.timedOut ?? false,
        timeout_ms: result?.timeoutMs ?? null,
        cleanup_outcome: result?.cleanupOutcome ?? null,
        cleanup_status: result?.cleanupStatus ?? null,
        cleanup_error_code: result?.cleanupErrorCode ?? null,
      })}`,
    );
  return result;
}

export function pinnedEnvironment(
  executable: string,
  env: NodeJS.ProcessEnv = process.env,
  root: string = bundleRoot,
): NodeJS.ProcessEnv {
  const next = standaloneEnvironment(env);
  const canonical = realpathSync(root);
  const pin = readPin(canonical);
  const inheritedCache = env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  // Derived namespaces follow the actual copy. Explicit custom paths and Bun's
  // supported "0" disable setting remain caller-selected; no cache is cleared.
  const inheritedDefault =
    typeof inheritedCache === 'string' &&
    /[\\/]\.tmp[\\/]vida-bun-cache[\\/][^\\/]+[\\/]\d+\.\d+\.\d+$/.test(inheritedCache);
  if (!inheritedCache || inheritedDefault)
    next.BUN_RUNTIME_TRANSPILER_CACHE_PATH = path.join(
      canonical.split(path.sep).includes('node_modules') ? homedir() : path.dirname(canonical),
      '.tmp',
      'vida-bun-cache',
      canonical.split(path.sep).includes('node_modules')
        ? createHash('sha256').update(canonical).digest('hex')
        : path.basename(canonical),
      pin,
    );
  const keys = Object.keys(env).filter((name) =>
    process.platform === 'win32' ? name.toUpperCase() === 'PATH' : name === 'PATH',
  );
  const key = keys.includes('PATH') ? 'PATH' : (keys[0] ?? 'PATH');
  for (const duplicate of keys) delete next[duplicate];
  let commandDirectory = path.dirname(executable);
  // npm can name the native Linux executable bun.exe. Its verified .bin/bun
  // alias lets nested shell commands keep using the same exact executable.
  const npmCommandDirectory = path.resolve(commandDirectory, '../../.bin');
  const npmCommand = path.join(npmCommandDirectory, process.platform === 'win32' ? 'bun.exe' : 'bun');
  try {
    if (realpathSync(npmCommand) === realpathSync(executable)) commandDirectory = npmCommandDirectory;
  } catch {
    /* Non-npm executables retain their own command directory. */
  }
  next[key] = `${commandDirectory}${path.delimiter}${env[key] ?? ''}`;
  return next;
}

function environmentVariableKey(env: NodeJS.ProcessEnv, preferred: string, foldCase: boolean): string {
  const keys = Object.keys(env).filter((key) => (foldCase ? key.toUpperCase() === preferred : key === preferred));
  return keys.includes(preferred) ? preferred : (keys[0] ?? preferred);
}

interface BunResolutionContext {
  root: string;
  env: NodeJS.ProcessEnv;
  spawn: PinnedSpawn;
  cleanup: TimeoutCleanup;
}

function probeBunVersion(
  executable: string,
  label: string,
  context: BunResolutionContext,
  budget: ExecutionBudget | undefined,
): string {
  return succeeded(
    boundedSpawnSync(
      context.spawn,
      executable,
      ['--version'],
      { cwd: context.root, env: context.env, encoding: 'utf8', timeout: 30_000, windowsHide: true, budget },
      label,
      context.cleanup,
    ),
    label,
  );
}

function resolveSelectedBunExecutable(options: BunOptions, context: BunResolutionContext, pin: string): string {
  const { root, env, spawn, cleanup } = context;
  const executable = options.executable
    ? String(options.executable).trim()
    : succeeded(
        boundedSpawnSync(
          spawn,
          options.node!,
          [
            options.npmCli ?? findNpmCli(options.node!),
            'exec',
            '--yes',
            '--package',
            `bun@${pin}`,
            '--',
            'bun',
            '-e',
            'process.stdout.write(process.execPath)',
          ],
          { cwd: root, env, encoding: 'utf8', timeout: 180_000, windowsHide: true, budget: options.budget },
          'Exact Bun package resolution (npm)',
          cleanup,
        ),
        'Exact Bun package resolution (npm)',
      );
  if (!path.isAbsolute(executable) || /[\r\n\0]/.test(executable)) {
    throw new Error('Bun resolution did not return one absolute executable path.');
  }
  const version = probeBunVersion(executable, 'Resolved Bun version check', context, options.budget);
  if (version !== pin) throw new Error(`Resolved Bun is ${version}; .bun-version requires ${pin}.`);
  return executable;
}

export function resolvePinnedBun(options: BunOptions = {}): string {
  const embedded = standaloneRuntime(options.env ?? process.env);
  if (embedded) {
    if (options.root && realpathSync(options.root) !== embedded.root)
      throw new Error('Embedded runtime package root differs.');
    if (options.executable && realpathSync(options.executable) !== embedded.executable)
      throw new Error('Embedded runtime executable differs.');
    return embedded.executable;
  }
  const root = options.root ?? bundleRoot;
  const pin = readPin(root);
  checkManifest(root, pin);
  const spawn = options.spawn ?? spawnSync;
  const env = options.env ?? process.env;
  const cleanup = options.cleanup ?? defaultTimeoutCleanup;
  const resolution = { root, env, spawn, cleanup };
  if (!options.executable && options.node === undefined && typeof process.versions.bun === 'string') {
    const version = probeBunVersion(process.execPath, 'Bun host version check', resolution, options.budget);
    if (version !== pin) throw new Error(`Bun host is ${version}; .bun-version requires ${pin}.`);
    return process.execPath;
  }
  if (!options.executable) {
    const pathKey = environmentVariableKey(env, 'PATH', process.platform === 'win32');
    const extensionKey = environmentVariableKey(env, 'PATHEXT', true);
    const extensions =
      process.platform === 'win32'
        ? String(env[extensionKey] ?? '.COM;.EXE')
            .split(';')
            .filter((extension) => /^\.(exe|com)$/i.test(extension))
        : [''];
    let discovered: string | undefined;
    for (const directory of String(env[pathKey] ?? '')
      .split(path.delimiter)
      .filter(Boolean)) {
      for (const extension of extensions) {
        const candidate = path.resolve(
          root,
          process.platform === 'win32' ? directory.replace(/^"(.*)"$/, '$1') : directory,
          `bun${extension}`,
        );
        try {
          if (statSync(candidate).isFile()) discovered = realpathSync(candidate);
        } catch {
          /* Missing PATH entries fall through to the exact npm resolver. */
        }
        if (discovered) break;
      }
      if (discovered) break;
    }
    if (discovered && path.isAbsolute(discovered) && !/[\r\n\0]/.test(discovered)) {
      try {
        const version = probeBunVersion(discovered, 'PATH Bun version check', resolution, options.budget);
        if (version === pin) return discovered;
      } catch (error: unknown) {
        if (errorProperty(error, 'timedOut')) throw error;
        /* A failed PATH probe cannot bypass pinned npm resolution. */
      }
    }
  }
  if (options.node === undefined && !options.executable) {
    throw new Error('No Bun runtime matching .bun-version was found; run this launcher with the pinned Bun runtime.');
  }
  return resolveSelectedBunExecutable(options, resolution, pin);
}

function normalizedEntryPath(base: string, entry: string): string {
  const resolved = path.resolve(base, entry);
  try {
    return realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function coverageInvocationMode(
  args: readonly string[],
  root: string,
  cwd: string,
): 'current' | 'published' | undefined {
  const entry = args[0];
  if (!entry) return undefined;
  const selectedEntry = normalizedEntryPath(cwd, entry);
  const supportedEntries = [
    normalizedEntryPath(root, 'tooling/run-bun-coverage.ts'),
    normalizedEntryPath(root, '../../tooling/agent/run-coverage.ts'),
  ];
  if (!supportedEntries.includes(selectedEntry)) return undefined;
  if (args.length === 1) return 'current';
  if (args.length === 2 && args[1] === '--published-baseline=b549951') return 'published';
  return undefined;
}

function coverageReviewClockPolicy(maximum: number, environment: NodeJS.ProcessEnv): CoverageReviewClockPolicy {
  return {
    maximum_ms: maximum,
    report_reserve_ms: 30000,
    original_duration_ms: environment.VIDA_PINNED_COMMAND_BUDGET_MS ?? null,
    original_expiry_ms: environment.VIDA_PINNED_COMMAND_DEADLINE_MS ?? null,
    ancestor_duration_ms: inherited.duration === Infinity ? null : String(inherited.duration),
    ancestor_expiry_ms: inherited.expiry === Infinity ? null : String(inherited.expiry),
  };
}

function coverageIterationBudget(
  args: readonly string[],
  options: BunOptions,
): { maximum: number; budget: ExecutionBudget | undefined; reviewPolicy?: CoverageReviewClockPolicy | undefined } {
  const mode = coverageInvocationMode(args, options.root ?? bundleRoot, options.cwd ?? process.cwd());
  const isCoverageEntry = mode !== undefined;
  const requestedMaximum = options.timeoutMs === undefined ? Infinity : options.timeoutMs;
  const maximum = isCoverageEntry ? Math.min(requestedMaximum, 300_000) : requestedMaximum;
  const budget = isCoverageEntry
    ? options.budget
      ? options.budget.child(maximum, 0)
      : executionBudget(maximum, 0)
    : undefined;
  const environment = options.env ?? process.env;
  return {
    maximum,
    budget,
    reviewPolicy: mode === 'current' && !options.budget ? coverageReviewClockPolicy(maximum, environment) : undefined,
  };
}

export function runPinnedBun(args: readonly string[], options: BunOptions = {}): number {
  // Coverage owns a single wall deadline beginning before package checks and
  // pinned-runtime resolution. Ordinary launches retain their existing order.
  const coverageProfile = coverageIterationBudget(args, options);
  const env = options.env ?? process.env;
  const embedded = standaloneRuntime(env);
  const root = options.root ?? embedded?.root ?? bundleRoot;
  const pin = readPin(root);
  checkManifest(root, pin);
  const spawn = options.spawn ?? spawnSync;
  const cleanup = options.cleanup ?? defaultTimeoutCleanup;
  const maximum = coverageProfile.maximum;
  // Validate before resolution can launch a version probe. A caller budget
  // never converts malformed input into an unlimited command.
  const commandBudget = executionBudget(maximum, 0);
  const budget = coverageProfile.budget ?? options.budget ?? commandBudget;
  const executable = resolvePinnedBun({ ...options, root, spawn, env, cleanup, budget });
  const timeoutMs = budget.remaining(maximum);
  const result = boundedSpawnSync(
    spawn,
    executable,
    [
      ...(embedded ? ['--no-env-file', '--no-install', '--config=' + path.join(root, 'bunfig.toml')] : []),
      ...args,
      ...(coverageProfile.reviewPolicy ? ['--wrapper-review-clocks'] : []),
    ],
    {
      cwd: options.cwd ?? process.cwd(),
      env: { ...pinnedEnvironment(executable, env, root), VIDA_PIPELINE_DIAGNOSTICS: undefined },
      stdio: 'inherit',
      windowsHide: true,
      timeout: timeoutMs,
      budget,
      diagnostics: options.diagnostics ?? false,
      coverageReviewPolicy: coverageProfile.reviewPolicy,
    },
    'Pinned Bun command',
    cleanup,
  );
  if (result.error || result.signal || !Number.isInteger(result.status)) {
    succeeded(result, 'Pinned Bun command');
  }
  // The existing terminal boundary above rejects a non-integer status.
  if (typeof result.status !== 'number') throw new Error('Pinned Bun returned no terminal status.');
  return result.status;
}

export function main({
  args = process.argv.slice(2),
  exit = process,
}: {
  args?: readonly string[];
  exit?: Partial<Pick<NodeJS.Process, 'exitCode'>>;
} = {}): void {
  try {
    if (args.length === 1 && args[0] === '--sync-pin') {
      console.log(syncPin() ? 'Bun manifest mirrors synchronized.' : 'Bun manifest mirrors already current.');
    } else {
      exit.exitCode = runPinnedBun(args, {
        diagnostics: process.env.VIDA_PIPELINE_DIAGNOSTICS === 'true',
      });
    }
  } catch (error: unknown) {
    const message = errorProperty(error, 'message');
    console.error(typeof message === 'string' ? message : String(error));
    const exitCode = errorProperty(error, 'exitCode');
    exit.exitCode = typeof exitCode === 'number' ? exitCode : 1;
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
