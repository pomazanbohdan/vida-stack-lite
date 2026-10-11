import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { pinnedEnvironment, readPin } from '../../bin/bun.mjs';

interface PublicCliFixtureRunnerOptions {
  readonly bundleRoot: string;
  readonly diagnosticReceiptPath: string;
  readonly fixtureRoot: string;
  readonly onUnknown: () => void;
}

function operationFor(args: readonly string[]): string {
  if (args.includes('--issue-wave')) return 'issue-wave';
  if (args.includes('--report')) return 'report';
  if (args.includes('--inspect')) return 'inspect';
  return 'other';
}

function isUnknown(result: SpawnSyncReturns<string>): boolean {
  return Boolean(result.error) || Boolean(result.signal) || result.status === null;
}

function makeTimingRecord(
  args: readonly string[],
  result: SpawnSyncReturns<string>,
  startedAt: string,
  elapsedMs: number,
  fixtureRoot: string,
): Record<string, unknown> {
  const error = result.error as NodeJS.ErrnoException | undefined;
  const unknown = isUnknown(result);
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

  return Object.freeze({
    spawn(args: readonly string[]): SpawnSyncReturns<string> {
      const startedAt = new Date().toISOString();
      const startedNs = process.hrtime.bigint();
      const commandArgs = [
        '--no-env-file',
        '--no-install',
        '--config=' + path.join(options.bundleRoot, 'bunfig.toml'),
        path.join(options.bundleRoot, 'bin/run.mjs'),
        ...args,
      ];
      const result = spawnSync(process.execPath, commandArgs, {
        cwd: options.bundleRoot,
        encoding: 'utf8',
        env: environment,
        windowsHide: true,
        timeout: 30000,
      });
      const elapsedMs = Number(process.hrtime.bigint() - startedNs) / 1_000_000;
      if (isUnknown(result)) options.onUnknown();
      const record = makeTimingRecord(args, result, startedAt, elapsedMs, options.fixtureRoot);
      mkdirSync(path.dirname(options.diagnosticReceiptPath), { recursive: true });
      appendFileSync(options.diagnosticReceiptPath, JSON.stringify(record) + '\n', { mode: 0o600 });
      return result;
    },
  });
}
