import { appendFileSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { pinnedEnvironment, readPin } from '../../bin/bun.ts';
import { runBoundedSubprocess, subprocessFailure } from './bounded-subprocess.ts';
import { isUnknownSynchronousChild } from './synchronous-child-outcome.ts';

interface PublicCliFixtureRunnerOptions {
  readonly bundleRoot: string;
  readonly diagnosticReceiptPath: string;
  readonly fixtureRoot: string;
  readonly onUnknown: () => void;
}

let cpuProfileChildNumber = 0;

/** Optional, bounded Bun CPU profiles for direct public CLI children. */
export function bunCpuProfileArgs(originalPackageRoot: string, profileRoot?: string): string[] {
  if (profileRoot === undefined) return [];
  if (
    !path.isAbsolute(originalPackageRoot) ||
    path.resolve(originalPackageRoot) !== originalPackageRoot ||
    !path.isAbsolute(profileRoot) ||
    path.resolve(profileRoot) !== profileRoot
  )
    throw new Error('Public CLI CPU profile paths must be absolute and normalized.');
  if (cpuProfileChildNumber >= 64) throw new Error('Public CLI CPU profile child bound exceeded.');

  const allowedRoot = path.join(originalPackageRoot, '.tmp', 'release-runtime-diagnostic');
  const relativeRoot = path.relative(allowedRoot, profileRoot);
  if (relativeRoot === '..' || relativeRoot.startsWith('..' + path.sep) || path.isAbsolute(relativeRoot))
    throw new Error('Public CLI CPU profile directory must be under the release diagnostic root.');

  let current = path.parse(profileRoot).root;
  for (const part of profileRoot.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink())
      throw new Error('Public CLI CPU profile path contains a non-directory or link.');
  }
  const canonicalAllowedRoot = realpathSync.native(allowedRoot);
  const canonicalProfileRoot = realpathSync.native(profileRoot);
  const canonicalRelative = path.relative(canonicalAllowedRoot, canonicalProfileRoot);
  if (canonicalRelative === '..' || canonicalRelative.startsWith('..' + path.sep) || path.isAbsolute(canonicalRelative))
    throw new Error('Public CLI CPU profile directory resolves outside the release diagnostic root.');

  for (let childNumber = cpuProfileChildNumber + 1; childNumber <= 64; childNumber += 1) {
    const child = path.join(profileRoot, 'child-' + String(childNumber).padStart(2, '0'));
    try {
      mkdirSync(child, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue;
      throw error;
    }
    cpuProfileChildNumber = childNumber;
    return ['--cpu-prof', '--cpu-prof-dir=' + child];
  }
  throw new Error('Public CLI CPU profile child namespace is full.');
}

/** Phase starts only: the final row never implies that its phase completed. */
export function createPublicCliFixturePhaseMarker(diagnosticReceiptPath: string, startedNs = process.hrtime.bigint()) {
  let previousNs = startedNs;
  mkdirSync(path.dirname(diagnosticReceiptPath), { recursive: true });
  return (phase: string, nowNs = process.hrtime.bigint()): void => {
    appendFileSync(
      diagnosticReceiptPath,
      JSON.stringify({
        schema: 'PrivatePublicCliFixturePhaseTiming/v1',
        phase,
        elapsed_ms: Number(nowNs - startedNs) / 1_000_000,
        since_previous_ms: Number(nowNs - previousNs) / 1_000_000,
      }) + '\n',
      { mode: 0o600 },
    );
    previousNs = nowNs;
  };
}

function operationFor(args: readonly string[]): string {
  if (args.includes('--issue-wave')) return 'issue-wave';
  if (args.includes('--report')) return 'report';
  if (args.includes('--inspect')) return 'inspect';
  return 'other';
}

type FixtureProcessOutcome = Pick<SpawnSyncReturns<string>, 'error' | 'status' | 'signal' | 'stdout' | 'stderr'>;

/** Hold scenario custody until its body settles. An UNKNOWN child fences later scenarios in the group. */
export function createPublicCliFixtureCustody() {
  let state: 'ready' | 'active' | 'unknown' = 'ready';
  return {
    enter() {
      if (state === 'active') throw new Error('The previous public CLI fixture is still active');
      if (state === 'unknown') throw new Error('The previous public CLI effect is UNKNOWN; its fixture was retained');
      state = 'active';
      let retained = false;
      let disposed = false;
      return {
        retainUnknown() {
          retained = true;
        },
        [Symbol.dispose]() {
          if (disposed) return;
          disposed = true;
          state = retained ? 'unknown' : 'ready';
        },
      };
    },
  };
}

function makeTimingRecord(
  args: readonly string[],
  result: FixtureProcessOutcome,
  startedAt: string,
  elapsedMs: number,
  fixtureRoot: string,
): Record<string, unknown> {
  const error = result.error as NodeJS.ErrnoException | undefined;
  const unknown = isUnknownSynchronousChild(result);
  return {
    schema: 'PrivatePublicCliFixtureTiming/v1',
    operation: operationFor(args),
    args_shape: args.map((argument) => (argument.startsWith('--') ? argument : '<value>')),
    started_at: startedAt,
    elapsed_ms: elapsedMs,
    status: result.status,
    signal: result.signal,
    spawn_error_name: error?.name ?? null,
    spawn_error_code: error?.code ?? null,
    timeout_ms: 30000,
    timed_out: error?.code === 'ETIMEDOUT',
    stderr_runtime_tail: String(result.stderr ?? '')
      .slice(-4096)
      .split(/\r?\n/u)
      .filter((line) => line.startsWith('runtime call:')),
    ...(unknown ? { retained_fixture_root: fixtureRoot } : {}),
  };
}

/** A real pinned Bun child with private per-invocation timing evidence for this fixture only. */
export function createNativeTsPublicCliFixtureRunner(options: PublicCliFixtureRunnerOptions) {
  const pin = readPin(options.bundleRoot);
  if (process.versions.bun !== pin) throw new Error(`Public CLI fixture requires pinned Bun ${pin}.`);
  const testEnvironment = { ...process.env };
  if (testEnvironment.BUN_RUNTIME_TRANSPILER_CACHE_PATH === '0')
    delete testEnvironment.BUN_RUNTIME_TRANSPILER_CACHE_PATH;
  const environment = pinnedEnvironment(process.execPath, testEnvironment, options.bundleRoot);

  const commandArgs = (args: readonly string[]) => [
    '--no-env-file',
    '--no-install',
    '--config=' + path.join(options.bundleRoot, 'bunfig.toml'),
    path.join(options.bundleRoot, 'bin/run.ts'),
    ...args,
  ];
  const record = (
    args: readonly string[],
    result: FixtureProcessOutcome,
    startedAt: string,
    startedNs: bigint,
    timing?: { timeout_ms: number; close_observed: boolean; termination_request_confirmed: boolean | null },
  ): void => {
    if (isUnknownSynchronousChild(result)) options.onUnknown();
    const elapsedMs = Number(process.hrtime.bigint() - startedNs) / 1_000_000;
    const receipt = makeTimingRecord(args, result, startedAt, elapsedMs, options.fixtureRoot);
    mkdirSync(path.dirname(options.diagnosticReceiptPath), { recursive: true });
    appendFileSync(options.diagnosticReceiptPath, JSON.stringify({ ...receipt, ...timing }) + '\n', { mode: 0o600 });
  };

  return Object.freeze({
    spawn(args: readonly string[]): SpawnSyncReturns<string> {
      const startedAt = new Date().toISOString();
      const startedNs = process.hrtime.bigint();
      const result = spawnSync(process.execPath, commandArgs(args), {
        cwd: options.bundleRoot,
        encoding: 'utf8',
        env: environment,
        windowsHide: true,
        timeout: 30_000,
      });
      record(args, result, startedAt, startedNs);
      return result;
    },
    async spawnBounded(args: readonly string[], deadlineAt: number): Promise<FixtureProcessOutcome> {
      const receiptAndCleanupReserveMs = 250;
      const timeoutMs = Math.min(30_000, Math.floor(deadlineAt - performance.now() - receiptAndCleanupReserveMs));
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
        throw new Error('Public CLI fixture deadline leaves no time to start a child');
      const startedAt = new Date().toISOString();
      const startedNs = process.hrtime.bigint();
      const observed = await runBoundedSubprocess(process.execPath, commandArgs(args), {
        cwd: options.bundleRoot,
        env: environment,
        timeoutMs,
        stdoutLimitBytes: 1024 * 1024,
        stderrLimitBytes: 1024 * 1024,
        terminateOnOutputLimit: true,
      });
      const error = observed.timedOut
        ? Object.assign(new Error(observed.diagnostic), { code: 'ETIMEDOUT' })
        : !observed.closeObserved || observed.childError || observed.stdoutTruncated || observed.stderrTruncated
          ? new Error(subprocessFailure('Public CLI fixture', observed))
          : undefined;
      const result = {
        status: observed.exitCode,
        signal: observed.signal,
        stdout: observed.stdout.toString('utf8'),
        stderr: observed.stderr.toString('utf8'),
        ...(error ? { error } : {}),
      };
      record(args, result, startedAt, startedNs, {
        timeout_ms: timeoutMs,
        close_observed: observed.closeObserved,
        termination_request_confirmed: observed.terminationRequestConfirmed,
      });
      return result;
    },
  });
}
