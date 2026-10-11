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

    const result = spawnSync(process.execPath, [path.join(root, 'tooling', 'run-bun-coverage.ts')], {
      cwd: root,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, BUN_OPTIONS: '' },
    });

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
    expect(existsSync(path.join(outputRoot, '.coverage-final.json.tmp-' + process.pid))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage runner lock fixture at ${root}`);
  }
});

test('real Bun coverage runner rejects source drift between preflight and locked capture', () => {
  const root = createRunnerCandidate();
  let passed = false;
  try {
    const outputRoot = path.join(root, 'coverage', 'bun-unified');
    const runs = path.join(outputRoot, 'runs');
    mkdirSync(runs, { recursive: true });
    const priorRun = path.join(runs, 'preexisting-run');
    mkdirSync(priorRun);
    writeFileSync(path.join(priorRun, 'sentinel'), 'preserve prior run\n');

    const reportPath = path.join(outputRoot, 'coverage-final.json');
    const stagingPath = path.join(outputRoot, '.coverage-final-foreign.staging.json');
    const reportBytes = Buffer.from('existing report bytes\n');
    const stagingBytes = Buffer.from('foreign staging bytes\n');
    writeFileSync(reportPath, reportBytes);
    writeFileSync(stagingPath, stagingBytes);
    const priorRuns = readdirSync(runs).sort();

    write(
      root,
      'tooling/coverage-lock-drift-preload.ts',
      `import * as original from './coverage-run-lock.js';
import { mock } from 'bun:test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const acquire = original.acquireCoverageRunLock;
const release = original.releaseCoverageRunLock;
let changed = false;
mock.module('./coverage-run-lock.js', () => ({
  acquireCoverageRunLock(outputRoot: string) {
    const lock = acquire(outputRoot);
    if (!changed) {
      changed = true;
      writeFileSync(path.join(root, 'src/host-state.ts'), 'export const changedAfterPreflight = true;\\n');
    }
    return lock;
  },
  releaseCoverageRunLock: release,
}));
`,
    );

    const result = spawnSync(
      process.execPath,
      [
        '--preload',
        path.join(root, 'tooling', 'coverage-lock-drift-preload.ts'),
        path.join(root, 'tooling', 'run-bun-coverage.ts'),
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
    expect(result.stderr).toContain('Coverage inputs changed between preflight and locked capture.');
    expect(readFileSync(path.join(root, 'src/host-state.ts'), 'utf8')).toBe(
      'export const changedAfterPreflight = true;\n',
    );
    expect(readFileSync(reportPath)).toEqual(reportBytes);
    expect(readFileSync(stagingPath)).toEqual(stagingBytes);
    expect(readdirSync(runs).sort()).toEqual(priorRuns);
    expect(existsSync(path.join(outputRoot, 'coverage-run.lock'))).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved failed coverage input-race fixture at ${root}`);
  }
});
