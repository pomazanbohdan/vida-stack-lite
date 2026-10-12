import { expect, test } from 'bun:test';
import {
  cpSync,
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
import { coverageToolInputs } from '../tooling/bun-coverage-evidence.ts';
import { restoreOwnedCoverageDirectoryWrites } from './helpers/coverage-fixture.ts';

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
    write(root, '.bun-version', readFileSync(path.join(packageRoot, '.bun-version')));
    write(root, 'package.json', JSON.stringify({ files: ['src/**', 'bin/**'], scripts: {} }));
    for (const source of maintainedSources) write(root, source, 'export const fixture = true;\n');
    write(
      root,
      'tests/fixture.test.mjs',
      "import { test } from 'bun:test'; test('inert lock fixture test', () => {});\n",
    );
    for (const file of coverageToolInputs) {
      if (file === '.bun-version' || file === 'package.json') continue;
      if (file.startsWith('tooling/')) {
        const target = path.join(root, file);
        mkdirSync(path.dirname(target), { recursive: true });
        cpSync(path.join(packageRoot, file), target);
      } else write(root, file, 'fixture input for isolated runner preflight\n');
    }
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

function launchRunner(root: string, preload?: string) {
  return spawnSync(
    process.execPath,
    [...(preload ? ['--preload', preload] : []), path.join(root, 'tooling', 'run-bun-coverage.ts')],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, BUN_OPTIONS: '' },
    },
  );
}

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
    const observation: unknown = JSON.parse(readFileSync(path.join(root, 'coverage-capture-probe.json'), 'utf8'));
    expect(observation).toMatchObject({ calls: 1 });
    if (typeof observation !== 'object' || observation === null || !('dev' in observation) || !('ino' in observation))
      throw new Error('Owned lock observation is missing.');
    expect(existsSync(path.join(outputRoot, 'coverage-run.lock'))).toBe(false);
    expect(existsSync(path.join(outputRoot, 'runs'))).toBe(false);
    expect(readdirSync(outputRoot)).toEqual([]);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage single-capture fixture at ${root}`);
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

test('a synchronously reaped coverage producer timeout retains the run but releases its reservation', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    write(
      root,
      'tooling/inert-timeout-preload.ts',
      `import * as original from 'node:child_process';
import { mock } from 'bun:test';
import { writeFileSync } from 'node:fs';
const run = original.spawnSync;
mock.module('node:child_process', () => ({
  spawnSync(command: string, args: string[], options: Record<string, unknown>) {
    const result = run(command, ['--eval', 'process.stdout.write(String(process.pid)); setInterval(() => {}, 1000);'], { encoding: 'utf8', timeout: 100, killSignal: 'SIGKILL' });
    writeFileSync(${JSON.stringify(path.join(root, 'direct-child-outcome.json'))}, JSON.stringify({ pid: result.pid, status: result.status, signal: result.signal, error: String(result.error), stdio: options.stdio, suite_timeout: options.timeout, buffered_output: Object.hasOwn(options, 'maxBuffer'), test_timeout: args[args.indexOf('--timeout') + 1] }));
    return result;
  }
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
    expect(existsSync(path.join(outputRoot, 'runs', runId, 'manifest.json'))).toBe(true);
    expect(readdirSync(path.join(outputRoot, 'runs', runId, 'processes'))).toEqual([]);
    expect(existsSync(path.join(outputRoot, 'coverage-final.json'))).toBe(false);
    const child: unknown = JSON.parse(readFileSync(path.join(root, 'direct-child-outcome.json'), 'utf8'));
    expect(child).toMatchObject({ status: null, signal: 'SIGKILL' });
    expect(child).toMatchObject({
      stdio: ['ignore', 'inherit', 'inherit'],
      suite_timeout: 600000,
      buffered_output: false,
      test_timeout: '5000',
    });
    if (typeof child !== 'object' || child === null || !('error' in child) || typeof child.error !== 'string')
      throw new Error('Expected child timeout error');
    expect(child.error).toContain('ETIMEDOUT');
    expect(existsSync(path.join(outputRoot, 'coverage-run.lock'))).toBe(false);
    passed = true;
  } finally {
    if (passed) {
      restoreOwnedCoverageDirectoryWrites(root);
      rmSync(root, { recursive: true, force: true });
    } else console.error(`Preserved failed coverage timeout fixture at ${root}`);
  }
});
