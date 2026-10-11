import { expect, test } from 'bun:test';
import { spawnSync, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stableInputs, verifyStagedObjects } from '../tooling/git-quality-hooks.js';
import { prependEnvironmentPath } from '../tooling/environment-path.js';

const packageRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const maintained = [
  'AGENTS.md',
  'AGENT.sidecar.md',
  'agent-runtime.config.v1.yaml',
  '.gitattributes',
  'packages/agent/src/initial.ts',
];

function execute(
  root: string,
  executable: string,
  args: string[],
  options: Partial<SpawnSyncOptionsWithStringEncoding> = {},
): SpawnSyncReturns<string> {
  const result = spawnSync(executable, args, {
    ...options,
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000,
  });
  if (result.error || result.signal || result.status === null)
    throw new Error(`Uncertain fixture command: ${result.error?.message ?? result.signal ?? 'missing exit'}`);
  return result;
}

function git(root: string, ...args: string[]): string {
  const result = execute(root, 'git', args);
  if (result.status !== 0) throw new Error(`Fixture Git failed: ${result.stderr}`);
  return result.stdout;
}

function fixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vida hook Україна '));
  const pkg = path.join(root, 'packages/agent');
  mkdirSync(path.join(pkg, 'src'), { recursive: true });
  mkdirSync(path.join(pkg, 'tooling'));
  mkdirSync(path.join(root, '.githooks'));
  for (const file of ['git-quality-hooks.ts', 'function-inventory.ts', 'focused-test-guard.ts', 'environment-path.ts'])
    copyFileSync(path.join(packageRoot, 'tooling', file), path.join(pkg, 'tooling', file));
  for (const file of ['pre-commit', 'pre-push'])
    copyFileSync(path.join(repositoryRoot, '.githooks', file), path.join(root, '.githooks', file));
  symlinkSync(
    path.join(packageRoot, 'node_modules'),
    path.join(pkg, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  writeFileSync(path.join(root, '.gitignore'), 'packages/agent/node_modules\n');
  writeFileSync(path.join(pkg, 'bunfig.toml'), '');
  writeFileSync(path.join(pkg, '.bun-version'), '1.4.2\n');
  writeFileSync(
    path.join(pkg, 'package.json'),
    JSON.stringify({
      type: 'module',
      packageManager: 'bun@1.4.2',
      engines: { bun: '1.4.2' },
      scripts: { 'test:coverage:pinned': 'bun tooling/collection-fixture.ts' },
    }),
  );
  // A denial-only orchestration fixture; it never runs or claims product coverage.
  writeFileSync(
    path.join(pkg, 'tooling/collection-fixture.ts'),
    "import { appendFileSync, mkdirSync } from 'node:fs'; mkdirSync('.tmp', { recursive: true }); appendFileSync('.tmp/collected', 'collection\\n'); process.exit(1);\n",
  );
  for (const file of maintained)
    writeFileSync(
      path.join(root, file),
      file === '.gitattributes'
        ? '*.ts text eol=lf\n'
        : file.endsWith('.ts')
          ? 'export const initial = 1;\n'
          : 'Fixture root input\n',
    );
  git(root, 'init', '-q');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'fixture baseline');
  return root;
}

function withFixture(check: (root: string) => void): void {
  const root = fixture();
  // Cleanup only follows all observations; failed or uncertain fixtures are retained.
  try {
    check(root);
  } catch (error) {
    console.warn(`Retained failed Git fixture: ${root}`);
    throw error;
  }
  rmSync(root, { recursive: true, force: true });
}

function push(root: string, input: string): SpawnSyncReturns<string> {
  const env = prependEnvironmentPath({ ...process.env }, path.dirname(process.execPath));
  // The selected runtime may have a platform-specific basename in this environment.
  // Exercise the checked-in shell entrypoint using an owned PATH alias to the same binary.
  const bin = path.join(root, 'runtime-bin');
  mkdirSync(bin, { recursive: true });
  const alias = path.join(bin, process.platform === 'win32' ? 'bun.exe' : 'bun');
  if (!existsSync(alias)) symlinkSync(process.execPath, alias, 'file');
  const shell = process.platform === 'win32' ? 'C:/Program Files/Git/bin/sh.exe' : 'sh';
  return execute(root, shell, ['.githooks/pre-push', 'origin', 'unused'], {
    input,
    env: prependEnvironmentPath(env, bin),
  });
}

test('root instruction, sidecar, YAML and attribute drift invalidate checked inputs', () =>
  withFixture((root) => {
    const before = stableInputs(root);
    for (const file of maintained.slice(0, 4)) {
      const original = readFileSync(path.join(root, file));
      writeFileSync(path.join(root, file), Buffer.concat([original, Buffer.from('Changed\n')]));
      expect(() => stableInputs(root)).toThrow(/Checked inputs differ/u);
      writeFileSync(path.join(root, file), original);
      expect(stableInputs(root)).toBe(before);
    }
  }));

for (const flag of ['assume-unchanged', 'skip-worktree'])
  test(`checked inputs reject bytes hidden by ${flag}`, () =>
    withFixture((root) => {
      for (const file of maintained) {
        const original = readFileSync(path.join(root, file));
        git(root, 'update-index', `--${flag}`, '--', file);
        stableInputs(root);
        writeFileSync(path.join(root, file), Buffer.concat([original, Buffer.from('Hidden change\n')]));
        expect(git(root, 'diff', '--name-only', '--', file)).toBe('');
        expect(() => stableInputs(root)).toThrow(/Staged bytes or mode changed/u);
        writeFileSync(path.join(root, file), original);
        git(root, 'update-index', `--no-${flag}`, '--', file);
      }
    }));

test('staged verification uses Git filters and preserves captured mode and unrelated index entries', () =>
  withFixture((root) => {
    const file = 'packages/agent/src/initial.ts';
    const index = git(root, 'ls-files', '--stage', '-z');
    const bytes = Buffer.from('export const initial = 2;\r\n');
    writeFileSync(path.join(root, file), bytes);
    const hash = execute(root, 'git', ['hash-object', `--path=${file}`, '--stdin'], { input: bytes });
    expect(hash.status).toBe(0);
    const objects: Array<[string, string]> = [[file, hash.stdout.trim()]];
    git(root, 'add', '--', file);
    verifyStagedObjects(root, objects, index);
    writeFileSync(path.join(root, 'unrelated.txt'), 'concurrent index change\n');
    git(root, 'add', '--', 'unrelated.txt');
    expect(() => verifyStagedObjects(root, objects, index)).toThrow(/Staged bytes or mode changed/u);
    git(root, 'rm', '--cached', '--', 'unrelated.txt');
    verifyStagedObjects(root, objects, index);
    git(root, 'update-index', '--chmod=+x', '--', file);
    expect(() => verifyStagedObjects(root, objects, index)).toThrow(/Staged bytes or mode changed/u);
    git(root, 'update-index', '--chmod=-x', '--', file);
    writeFileSync(path.join(root, file), 'export const initial = 3;\n');
    git(root, 'add', '--', file);
    expect(() => verifyStagedObjects(root, objects, index)).toThrow(/Staged bytes or mode changed/u);
  }));

test('checked-in pre-push accepts deletion and rejects alternate OID before collection', () =>
  withFixture((root) => {
    const head = git(root, 'rev-parse', 'HEAD').trim();
    const index = readFileSync(path.join(root, '.git/index'));
    const deletion = push(root, `delete ${'0'.repeat(40)} remote ${head}\n`);
    expect(deletion.status).toBe(0);
    const alternate = push(root, `local ${'a'.repeat(40)} remote ${head}\n`);
    expect(alternate.status).toBe(1);
    expect(alternate.stderr).toMatch(/current HEAD/u);
    expect(existsSync(path.join(root, 'packages/agent/.tmp/collected'))).toBe(false);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(index);
  }));

test('pre-push retains another run lock and does not collect', () =>
  withFixture((root) => {
    const lock = path.join(root, '.git/vida-quality-run.lock');
    mkdirSync(lock);
    const head = git(root, 'rev-parse', 'HEAD').trim();
    const result = push(root, `local ${head} remote ${'0'.repeat(40)}\n`);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/EEXIST/u);
    expect(existsSync(lock)).toBe(true);
    expect(existsSync(path.join(root, 'packages/agent/.tmp/collected'))).toBe(false);
  }));

test('one failed fresh collection denies push and removes stale CRAP without making an allowance', () =>
  withFixture((root) => {
    const pkg = path.join(root, 'packages/agent');
    mkdirSync(path.join(pkg, 'coverage/bun-unified'), { recursive: true });
    const report = path.join(pkg, 'coverage/bun-unified/crap-budget-report.json');
    writeFileSync(report, '{"stale":true}');
    const index = readFileSync(path.join(root, '.git/index'));
    const head = git(root, 'rev-parse', 'HEAD').trim();
    const result = push(root, `local ${head} remote ${'0'.repeat(40)}\n`);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Fresh coverage test collection failed/u);
    expect(readFileSync(path.join(pkg, '.tmp/collected'), 'utf8')).toBe('collection\n');
    expect(existsSync(report)).toBe(false);
    expect(existsSync(path.join(root, '.git/vida-quality-run.lock'))).toBe(false);
    expect(existsSync(path.join(root, '.git/vida-quality-allowance'))).toBe(false);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(index);
  }));
