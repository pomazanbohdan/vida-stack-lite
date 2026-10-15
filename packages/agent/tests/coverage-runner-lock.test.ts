import { expect, test } from 'bun:test';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareCoverageRunnerInputs, restoreOwnedCoverageDirectoryWrites } from './helpers/coverage-fixture.ts';
import { requireSynchronousChildSuccess } from './helpers/synchronous-child-outcome.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const maintainedSources = [
  'src/host-state.ts',
  'src/lifecycle/lifecycle-state.ts',
  'src/orchestration/persistent-session-handoff.ts',
  'src/orchestration/session-handoff.ts',
  'src/runtime-kernel.ts',
  'bin/cli-metadata.ts',
];

function write(root: string, relative: string, bytes: string | Uint8Array): void {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

function createRunnerCandidate(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-runner-lock-candidate-'));
  try {
    prepareCoverageRunnerInputs(root, packageRoot, ['src/**', 'bin/**']);
    for (const source of maintainedSources) write(root, source, 'export const fixture = true;\n');
    write(
      root,
      'tests/fixture.test.mjs',
      "import { test } from 'bun:test'; test('inert lock fixture test', () => {});\n",
    );
    // Bun loads its config before the entrypoint; preflight needs valid TOML.
    write(root, 'bunfig.toml', '[test]\n');
    write(root, 'schemas/fixture.schema.json', '{}\n');
    write(root, 'templates/fixture.template.yaml', 'fixture: true\n');
    write(root, 'instructions/fixture.md', 'fixture\n');
    symlinkSync(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    return root;
  } catch (error) {
    console.error(`Preserved failed coverage runner candidate at ${root}`);
    throw error;
  }
}

function writeCaptureProbe(root: string, callbackBody: string): string {
  const markerPath = path.join(root, 'coverage-capture-probe.json');
  const preload = path.join(root, 'tooling', 'coverage-capture-probe-preload.ts');
  write(
    root,
    'tooling/coverage-capture-probe-preload.ts',
    `import * as evidence from './bun-coverage-evidence.ts';
import { mock } from 'bun:test';
import { existsSync, lstatSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marker = ${JSON.stringify(markerPath)};
mock.module('./bun-coverage-evidence.ts', () => ({
  ...evidence,
  async coverageInputs() {
    const outputRoot = path.join(root, 'coverage/bun-unified');
    const lockPath = path.join(outputRoot, 'coverage-run.lock');
    const lock = lstatSync(lockPath, { bigint: true });
    const prior = existsSync(marker) ? JSON.parse(readFileSync(marker, 'utf8')) : { calls: 0 };
    const observation = { calls: prior.calls + 1, dev: String(lock.dev), ino: String(lock.ino) };
    writeFileSync(marker, JSON.stringify(observation));
    ${callbackBody}
  },
}));
`,
  );
  return preload;
}

function launchRunner(
  root: string,
  preload?: string,
  environment: NodeJS.ProcessEnv = {},
  args: string[] = [],
  options: { entrypoint?: string; timeoutMs?: number } = {},
) {
  return spawnSync(
    process.execPath,
    [
      ...(preload ? ['--preload', preload] : []),
      path.join(root, options.entrypoint ?? 'tooling/run-bun-coverage.ts'),
      ...args,
    ],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: options.timeoutMs ?? 60_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, BUN_OPTIONS: '', ...environment },
    },
  );
}

test('focused runner retains both canonical implicit-else branch arms', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    write(
      root,
      'src/runtime-kernel.ts',
      'export function compute(flag: boolean): number { if (flag) return 1; return 2; }\n',
    );
    write(
      root,
      'tests/fixture.test.mjs',
      `import { expect, test } from 'bun:test';
import { compute } from '../src/runtime-kernel.ts';
test('both implicit-else arms execute', () => {
  expect(compute(true)).toBe(1);
  expect(compute(false)).toBe(2);
});\n`,
    );
    const entrypoint = 'tooling/focused-implicit-else-probe.ts';
    const completion = 'focused implicit-else report completed';
    write(
      root,
      entrypoint,
      `import { runBunCoverage } from './run-bun-coverage.ts';
await runBunCoverage({ focusedDiagnostic: {
  mode: 'focused-diagnostic', contour: 'implicit-else-regression',
  sources: ['src/runtime-kernel.ts'], tests: ['tests/fixture.test.mjs'],
} });
console.log(${JSON.stringify(completion)});\n`,
    );
    const result = launchRunner(root, undefined, {}, [], { entrypoint, timeoutMs: 4_000 });
    requireSynchronousChildSuccess(result, completion);
    const outputRoot = path.join(root, 'coverage/bun-unified');
    const diagnostics = path.join(outputRoot, 'diagnostics');
    const reports = readdirSync(diagnostics).filter((file) => file.endsWith('.focused-coverage.json'));
    expect(reports).toHaveLength(1);
    const report: unknown = JSON.parse(readFileSync(path.join(diagnostics, reports[0]!), 'utf8'));
    expect(report).toMatchObject({
      schema: 'VidaBunFocusedCoverageDiagnostic/v1',
      qualification_scope: 'focused-diagnostic',
      full_qualification: false,
      frozen_budget_qualification: 'pending',
      metrics: [{ file: 'src/runtime-kernel.ts', coverage: { branches: { total: 2, covered: 2, pct: 100 } } }],
    });
    expect(existsSync(path.join(outputRoot, 'coverage-final.json'))).toBe(false);
    expect(existsSync(path.join(outputRoot, 'coverage-run.lock'))).toBe(false);
    passed = true;
  } finally {
    if (passed) {
      restoreOwnedCoverageDirectoryWrites(root);
      rmSync(root, { recursive: true, force: true });
    } else console.error(`Retained failed focused implicit-else fixture: ${root}`);
  }
});

test.each(['sdk', 'no-sdk', 'review'] as const)('focused SDK preparation policy: %s', (mode) => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const prepared = path.join(root, 'sdk-preparation.json');
    const capture = path.join(root, 'coverage-capture-probe.json');
    const typecheck = path.join(root, 'typecheck.marker');
    write(root, 'tests/configured-workflow.test.ts', 'export const inert = true;\n');
    const preload = writeCaptureProbe(
      root,
      `
      if (!existsSync(${JSON.stringify(prepared)})) throw new Error('capture ran before SDK preparation');
      throw new Error('focused SDK capture stop');
    `,
    );
    const entrypoint = 'tooling/focused-sdk-options-probe.ts';
    write(
      root,
      entrypoint,
      `
      import { existsSync, writeFileSync } from 'node:fs';
      import { runBunCoverage } from './run-bun-coverage.ts';
      await runBunCoverage({
        focusedDiagnostic: {
          mode: 'focused-diagnostic', contour: 'sdk-policy-fixture',
          sources: ['src/runtime-kernel.ts'],
          tests: [${JSON.stringify(mode === 'no-sdk' ? 'tests/fixture.test.mjs' : 'tests/configured-workflow.test.ts')}],
        },
        prepareSdkInputs: async ({ root: preparedRoot }) => {
          writeFileSync(${JSON.stringify(prepared)}, JSON.stringify({
            root: preparedRoot, typecheck_seen: existsSync(${JSON.stringify(typecheck)}),
            capture_seen: existsSync(${JSON.stringify(capture)}),
          }));
        },
        ${mode === 'review' ? 'reviewCurrentInputs: async () => { throw new Error("review must not run"); },' : ''}
      });
    `,
    );
    const result = launchRunner(root, preload, {}, [], { entrypoint, timeoutMs: 4_000 });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    if (mode === 'sdk') {
      expect(result.stderr).toContain('focused SDK capture stop');
      const preparation: unknown = JSON.parse(readFileSync(prepared, 'utf8'));
      expect(preparation).toEqual({ root, typecheck_seen: false, capture_seen: false });
      expect(existsSync(typecheck)).toBe(true);
      const captured: unknown = JSON.parse(readFileSync(capture, 'utf8'));
      expect(captured).toMatchObject({ calls: 1 });
    } else {
      expect(result.stderr).toContain(
        mode === 'review'
          ? 'Focused coverage diagnostics cannot use historical selection or input review callbacks.'
          : 'Focused SDK preparation requires the configured-workflow test.',
      );
      expect(existsSync(prepared)).toBe(false);
      expect(existsSync(typecheck)).toBe(false);
      expect(existsSync(capture)).toBe(false);
    }
    expect(existsSync(path.join(root, 'coverage/bun-unified/coverage-final.json'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained failed focused SDK preparation fixture: ${root}`);
  }
});

test('real Bun coverage runner preserves a foreign lock and artifacts before staging a run', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const outputRoot = path.join(root, 'coverage', 'bun-unified');
    const runs = path.join(outputRoot, 'runs');
    mkdirSync(runs, { recursive: true });
    const existingRun = path.join(runs, 'preexisting-run');
    mkdirSync(existingRun);
    writeFileSync(path.join(existingRun, 'sentinel'), 'existing run bytes\n');

    const reportPath = path.join(outputRoot, 'coverage-final.json');
    const stagingPath = path.join(outputRoot, '.coverage-final-foreign.staging.json');
    const lockPath = path.join(outputRoot, 'coverage-run.lock');
    const reportBytes = Buffer.from('existing report bytes\n');
    const stagingBytes = Buffer.from('foreign staging bytes\n');
    const lockBytes = Buffer.from('{"schema":"foreign-lock"}\n');
    writeFileSync(reportPath, reportBytes);
    writeFileSync(stagingPath, stagingBytes);
    writeFileSync(lockPath, lockBytes);
    const artifactIdentities = [reportPath, stagingPath, lockPath].map((file) => lstatSync(file, { bigint: true }));
    const priorRuns = readdirSync(runs).sort();

    const preload = writeCaptureProbe(root, "throw new Error('capture should not run under a foreign lock');");
    const result = launchRunner(root, preload);

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Bun coverage run is already locked; preserve existing custody.');
    expect(readFileSync(reportPath)).toEqual(reportBytes);
    expect(readFileSync(stagingPath)).toEqual(stagingBytes);
    expect(readFileSync(lockPath)).toEqual(lockBytes);
    for (const [index, file] of [reportPath, stagingPath, lockPath].entries()) {
      const before = artifactIdentities[index];
      if (!before) throw new Error('Artifact identity was not captured.');
      const after = lstatSync(file, { bigint: true });
      expect(after.dev).toBe(before.dev);
      expect(after.ino).toBe(before.ino);
    }
    expect(readdirSync(runs).sort()).toEqual(priorRuns);
    expect(existsSync(path.join(root, 'coverage-capture-probe.json'))).toBe(false);
    expect(existsSync(path.join(outputRoot, '.coverage-final.json.tmp-' + process.pid))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage runner lock fixture at ${root}`);
  }
});

test('real Bun coverage runner captures once under its owned lock and cleans up after capture failure', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const outputRoot = path.join(root, 'coverage', 'bun-unified');
    const preload = writeCaptureProbe(root, "throw new Error('controlled capture failure');");
    const result = launchRunner(root, preload);
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('controlled capture failure');
    expect(readFileSync(path.join(root, 'typecheck.marker'), 'utf8')).toBe('ran');
    const observation: unknown = JSON.parse(readFileSync(path.join(root, 'coverage-capture-probe.json'), 'utf8'));
    expect(observation).toMatchObject({ calls: 1 });
    if (typeof observation !== 'object' || observation === null || !('dev' in observation) || !('ino' in observation))
      throw new Error('Owned lock observation is missing.');
    expect(existsSync(path.join(outputRoot, 'coverage-run.lock'))).toBe(false);
    expect(existsSync(path.join(outputRoot, 'runs'))).toBe(false);
    expect(readdirSync(outputRoot)).toEqual(['operation-outcomes']);
    const outcomeDirectory = path.join(outputRoot, 'operation-outcomes');
    const outcomeFiles = readdirSync(outcomeDirectory);
    expect(outcomeFiles).toHaveLength(1);
    const outcomeFile = outcomeFiles[0];
    if (!outcomeFile) throw new Error('Controlled capture failure outcome was not recorded.');
    const operation: unknown = JSON.parse(readFileSync(path.join(outcomeDirectory, outcomeFile), 'utf8'));
    expect(operation).toMatchObject({
      schema: 'VidaBunCoverageOperationOutcome/v1',
      status: 'BLOCKED',
      phase: 'preflight',
      producer_outcomes: [],
      execution_complete: false,
      report_complete: false,
      quality_complete: false,
      original_error_diagnostic: { message: 'controlled capture failure' },
    });
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage single-capture fixture at ${root}`);
  }
});

test('current coverage typecheck failure releases the owned lock before capture', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    manifest.scripts['typecheck:pinned'] = 'bun -e "process.exit(7)"';
    write(root, 'package.json', JSON.stringify(manifest));
    const preload = writeCaptureProbe(root, "throw new Error('capture must not follow failed typecheck');");
    const result = launchRunner(root, preload);
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Pinned coverage typecheck failed.');
    expect(existsSync(path.join(root, 'coverage-capture-probe.json'))).toBe(false);
    expect(existsSync(path.join(root, 'coverage/bun-unified/coverage-run.lock'))).toBe(false);
    expect(existsSync(path.join(root, 'coverage/bun-unified/runs'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage typecheck fixture at ${root}`);
  }
});

test('historical baseline selection skips current typecheck before a controlled capture failure', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const preload = writeCaptureProbe(root, "throw new Error('controlled baseline capture failure');");
    const result = launchRunner(root, preload, {}, ['--published-baseline=b549951']);
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('controlled baseline capture failure');
    expect(existsSync(path.join(root, 'typecheck.marker'))).toBe(false);
    const observation: unknown = JSON.parse(readFileSync(path.join(root, 'coverage-capture-probe.json'), 'utf8'));
    expect(observation).toMatchObject({ calls: 1 });
    expect(existsSync(path.join(root, 'coverage/bun-unified/coverage-run.lock'))).toBe(false);
    expect(existsSync(path.join(root, 'coverage/bun-unified/runs'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed baseline selection fixture at ${root}`);
  }
});

test('unknown current typecheck producer retains the shared coverage lock', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    write(
      root,
      'tooling/unknown-typecheck-preload.ts',
      `import * as original from 'node:child_process';
import { mock } from 'bun:test';
const run = original.spawnSync;
mock.module('node:child_process', () => ({
  spawnSync(command: string, args: string[], options: Record<string, unknown>) {
    if (args[0] === 'run' && args[1] === 'typecheck:pinned')
      return { pid: undefined, status: null, signal: null, error: Object.assign(new Error('uncertain'), { code: 'EIO' }) };
    return run(command, args, options);
  },
}));
`,
    );
    const result = spawnSync(
      process.execPath,
      [
        '--preload',
        path.join(root, 'tooling/unknown-typecheck-preload.ts'),
        path.join(root, 'tooling/run-bun-coverage.ts'),
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, BUN_OPTIONS: '' },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Pinned coverage typecheck outcome is UNKNOWN; preserve the run lock.');
    expect(existsSync(path.join(root, 'typecheck.marker'))).toBe(false);
    expect(existsSync(path.join(root, 'coverage-capture-probe.json'))).toBe(false);
    expect(existsSync(path.join(root, 'coverage/bun-unified/coverage-run.lock'))).toBe(true);
    expect(existsSync(path.join(root, 'coverage/bun-unified/runs'))).toBe(false);
    passed = true;
  } finally {
    if (passed) console.warn(`Retained controlled UNKNOWN typecheck fixture at ${root}`);
    else console.error(`Preserved failed unknown typecheck fixture at ${root}`);
  }
  expect(existsSync(root)).toBe(true);
  expect(existsSync(path.join(root, 'coverage/bun-unified/coverage-run.lock'))).toBe(true);
});

test('spent inherited command budget launches neither typecheck nor capture', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const preload = writeCaptureProbe(root, "throw new Error('capture must not run with spent budget');");
    const result = launchRunner(root, preload, { VIDA_PINNED_COMMAND_BUDGET_MS: '0' });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Execution budget exhausted before child launch.');
    expect(existsSync(path.join(root, 'typecheck.marker'))).toBe(false);
    expect(existsSync(path.join(root, 'coverage-capture-probe.json'))).toBe(false);
    expect(existsSync(path.join(root, 'coverage/bun-unified/coverage-run.lock'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed spent-budget fixture at ${root}`);
  }
});

test('real Bun coverage runner preserves a foreign replacement lock after capture failure', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const outputRoot = path.join(root, 'coverage', 'bun-unified');
    const foreignPath = path.join(root, 'foreign-lock.json');
    const foreignBytes = Buffer.from('{"schema":"foreign-replacement"}\n');
    const preload = writeCaptureProbe(
      root,
      `unlinkSync(lockPath);
    writeFileSync(lockPath, ${JSON.stringify(foreignBytes.toString('utf8'))}, { flag: 'wx' });
    const foreign = lstatSync(lockPath, { bigint: true });
    writeFileSync(${JSON.stringify(foreignPath)}, JSON.stringify({ dev: String(foreign.dev), ino: String(foreign.ino) }));
    throw new Error('capture failed after foreign lock replacement');`,
    );
    const result = launchRunner(root, preload);
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('capture failed after foreign lock replacement');
    expect(result.stderr).toContain('Coverage lock path no longer identifies the owned lock; preserve it.');
    const lockPath = path.join(outputRoot, 'coverage-run.lock');
    expect(readFileSync(lockPath)).toEqual(foreignBytes);
    const foreignIdentity: unknown = JSON.parse(readFileSync(foreignPath, 'utf8'));
    const current = lstatSync(lockPath, { bigint: true });
    if (
      typeof foreignIdentity !== 'object' ||
      foreignIdentity === null ||
      !('dev' in foreignIdentity) ||
      typeof foreignIdentity.dev !== 'string' ||
      !('ino' in foreignIdentity) ||
      typeof foreignIdentity.ino !== 'string'
    )
      throw new Error('Foreign replacement identity is missing.');
    expect(String(current.dev)).toBe(foreignIdentity.dev);
    expect(String(current.ino)).toBe(foreignIdentity.ino);
    expect(existsSync(path.join(outputRoot, 'runs'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage foreign-swap fixture at ${root}`);
  }
});

test('real Bun coverage runner rejects captured pin drift before staging', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const outputRoot = path.join(root, 'coverage', 'bun-unified');
    const preload = writeCaptureProbe(root, "return { input_bytes: { '.bun-version': Buffer.from('0.0.0\\n') } };");
    const result = launchRunner(root, preload);
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Captured Bun version differs from the selected runtime pin.');
    const observation: unknown = JSON.parse(readFileSync(path.join(root, 'coverage-capture-probe.json'), 'utf8'));
    expect(observation).toMatchObject({ calls: 1 });
    expect(existsSync(path.join(outputRoot, 'coverage-run.lock'))).toBe(false);
    expect(existsSync(path.join(outputRoot, 'runs'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage pin fixture at ${root}`);
  }
});

test('an asynchronously observed coverage producer timeout retains the run but releases its reservation', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    write(
      root,
      'tests/fixture.test.mjs',
      "import { test } from 'bun:test'; test('inert lock fixture test', async () => { await new Promise((resolve) => setTimeout(resolve, 1000)); });\n",
    );
    write(
      root,
      'tooling/inert-timeout-preload.ts',
      `import * as original from 'node:child_process';
import { mock } from 'bun:test';
import { writeFileSync } from 'node:fs';
const runSync = original.spawnSync;
const runAsync = original.spawn;
mock.module('node:child_process', () => ({
  ...original,
  spawnSync(command: string, args: string[], options: Record<string, unknown>) {
    return runSync(command, args, options);
  },
  spawn(command: string, args: string[], options: Record<string, unknown>) {
    if (args[0] !== 'test') return runAsync(command, args, options as Parameters<typeof original.spawn>[2]);
    const child = runAsync(command, args, { ...options, timeout: 100 } as Parameters<typeof original.spawn>[2]);
    let spawnError: unknown;
    child.once('error', (error) => { spawnError = error; });
    child.once('close', (status, signal) => {
      writeFileSync(${JSON.stringify(path.join(root, 'direct-child-outcome.json'))}, JSON.stringify({
        pid: child.pid, status, signal, error: spawnError === undefined ? null : String(spawnError),
        timeout_ms: 100, kill_signal: options.killSignal, stdio: options.stdio,
        suite_timeout: options.timeout, buffered_output: Object.hasOwn(options, 'maxBuffer'),
        test_timeout: args[args.indexOf('--timeout') + 1],
      }));
    });
    return child;
  },
}));
`,
    );
    const result = spawnSync(
      process.execPath,
      [
        '--preload',
        path.join(root, 'tooling/inert-timeout-preload.ts'),
        path.join(root, 'tooling/run-bun-coverage.ts'),
      ],
      {
        cwd: root,
        encoding: 'utf8',
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, BUN_OPTIONS: '' },
      },
    );
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Bun Test outcome is UNKNOWN');
    const outputRoot = path.join(root, 'coverage/bun-unified');
    const runs = readdirSync(path.join(outputRoot, 'runs'));
    expect(runs).toHaveLength(1);
    const runId = runs[0];
    if (typeof runId !== 'string') throw new Error('Retained coverage run identity missing');
    const manifest: unknown = JSON.parse(readFileSync(path.join(outputRoot, 'runs', runId, 'manifest.json'), 'utf8'));
    expect(manifest).toMatchObject({
      execution_scope: {
        shard_eligibility: {
          status: 'serial-fallback',
          reason: 'review-artifact-unavailable',
        },
      },
    });
    const processDirectory = path.join(outputRoot, 'runs', runId, 'processes');
    expect(readdirSync(processDirectory)).toEqual(['observations']);
    expect(existsSync(path.join(outputRoot, 'coverage-final.json'))).toBe(false);
    const child: unknown = JSON.parse(readFileSync(path.join(root, 'direct-child-outcome.json'), 'utf8'));
    expect(child).toMatchObject({ status: null, signal: 'SIGKILL' });
    expect(child).toMatchObject({
      stdio: ['ignore', 'inherit', 'inherit'],
      buffered_output: false,
      test_timeout: '5000',
      kill_signal: 'SIGKILL',
    });
    expect(child).toHaveProperty('pid');
    if (typeof child !== 'object' || child === null || !('pid' in child) || typeof child.pid !== 'number')
      throw new Error('Expected the native async producer PID');
    expect(child.pid).toBeGreaterThan(0);
    const supervisor: unknown = JSON.parse(
      readFileSync(path.join(processDirectory, 'observations', 'supervisor.json'), 'utf8'),
    );
    expect(supervisor).toEqual({
      schema: 'VidaBunCoverageSupervisorObservation/v1',
      run_id: runId,
      outcomes: [
        {
          shard_id: 'bun-test',
          producer_pid: child.pid,
          status: null,
          signal: 'SIGKILL',
          timeout_observed: false,
          error: null,
          unknown: true,
          launch_attempted: true,
          producerTerminalKnown: true,
          directProducerAccounted: true,
          resourceSafeToAdvance: false,
        },
      ],
      reservationSafeToRelease: true,
      resourceSafeToAdvance: false,
    });
    expect(child).toHaveProperty('timeout_ms');
    if (typeof child !== 'object' || child === null || !('timeout_ms' in child))
      throw new Error('Expected bounded native async producer timeout');
    expect(child.timeout_ms).toBe(100);
    // The owner uses its explicit timer, rather than an opaque spawn timeout.
    expect(child).not.toHaveProperty('suite_timeout');
    const operation: unknown = JSON.parse(
      readFileSync(path.join(outputRoot, 'operation-outcomes', runId + '.json'), 'utf8'),
    );
    expect(operation).toMatchObject({
      run_id: runId,
      status: 'UNKNOWN',
      retention_required: true,
      execution_complete: false,
      report_complete: false,
      quality_complete: false,
      direct_accounted_count: 1,
      resource_safe_to_advance: false,
      producer_observations: [{ timeout_observed: false, sigkill_observed: true, unknown: true }],
    });
    expect(child).toHaveProperty('error', null);
    expect(existsSync(path.join(outputRoot, 'coverage-run.lock'))).toBe(false);
    passed = true;
  } finally {
    if (passed) {
      console.warn(`Retained controlled UNKNOWN coverage timeout fixture at ${root}`);
    } else console.error(`Preserved failed coverage timeout fixture at ${root}`);
  }
});
