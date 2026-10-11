import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { prependEnvironmentPath } from '../tooling/environment-path.js';
import { createPrecommitFixture, fixtureGit, formatPrecommitFixture } from './helpers/precommit-repository-fixture.js';

const packageRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(packageRoot, '../..');

function installedHookFixture(entries?: readonly string[]): string {
  const root = createPrecommitFixture(entries);
  const pkg = path.join(root, 'packages/agent');
  // The real gate implementation is an installed external input, like its tools.
  // Staged Source/config are the small fixture graph, not a copy of product suites.
  for (const directory of ['node_modules', 'tooling']) {
    rmSync(path.join(pkg, directory), { recursive: true });
    symlinkSync(
      path.join(packageRoot, directory),
      path.join(pkg, directory),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  }
  mkdirSync(path.join(root, '.githooks'));
  copyFileSync(path.join(repositoryRoot, '.githooks/pre-commit'), path.join(root, '.githooks/pre-commit'));
  chmodSync(path.join(root, '.githooks/pre-commit'), 0o755);
  writeFileSync(path.join(pkg, 'bunfig.toml'), '');
  copyFileSync(path.join(packageRoot, 'oxlint.config.json'), path.join(pkg, 'oxlint.config.json'));
  fixtureGit(root, [
    'add',
    '--',
    '.githooks/pre-commit',
    'packages/agent/bunfig.toml',
    'packages/agent/oxlint.config.json',
  ]);
  fixtureGit(root, ['config', 'user.email', 'fixture@example.invalid']);
  fixtureGit(root, ['config', 'user.name', 'Fixture']);
  fixtureGit(root, ['commit', '-qm', 'fixture baseline before hooks']);
  fixtureGit(root, ['config', 'core.hooksPath', '.githooks']);
  const bin = path.join(root, 'runtime-bin');
  mkdirSync(bin);
  symlinkSync(process.execPath, path.join(bin, process.platform === 'win32' ? 'bun.exe' : 'bun'), 'file');
  return root;
}

const cases: ReadonlyArray<readonly [string, string, string, RegExp]> = [
  [
    'unformatted staged TypeScript',
    'src/index.ts',
    "import { parse } from '@babel/parser';export const value=parse('true');",
    /formatting|Formatting/u,
  ],
  [
    'staged TypeScript error',
    'src/index.ts',
    "import { parse } from '@babel/parser';\nexport const value: number = parse('true');\n",
    /TS2322/u,
  ],
  [
    'type-correct floating promise',
    'src/index.ts',
    "import { parse } from '@babel/parser';\nexport const value = parse('true');\nasync function observed() {\n  return 1;\n}\nobserved();\n",
    /no-floating-promises/u,
  ],
  [
    'focused Bun alias',
    'tests/focused.test.ts',
    "import { test as check } from 'bun:test';\ncheck.only('fixture', () => {});\n",
    /Focused test is forbidden/u,
  ],
];

test('checked-in pre-commit accepts valid staged bytes while retaining broken unstaged bytes and unrelated data', () => {
  const root = installedHookFixture();
  try {
    const relative = 'packages/agent/src/index.ts';
    const file = path.join(root, relative);
    writeFileSync(file, 'import { parse } from "@babel/parser";\nexport const value = parse("false");\n');
    formatPrecommitFixture(root, ['src/index.ts']);
    const staged = readFileSync(file, 'utf8');
    fixtureGit(root, ['add', '--', relative]);
    const worktree = 'deliberately invalid unstaged TypeScript';
    writeFileSync(file, worktree);
    writeFileSync(path.join(root, 'unrelated.txt'), 'staged unrelated bytes\n');
    fixtureGit(root, ['add', '--', 'unrelated.txt']);
    writeFileSync(path.join(root, 'unrelated.txt'), 'unstaged unrelated bytes\n');
    writeFileSync(path.join(root, 'untracked.txt'), 'untracked bytes\n');
    const result = spawnSync('git', ['commit', '-qm', 'accept staged snapshot'], {
      cwd: root,
      env: prependEnvironmentPath({ ...process.env }, path.join(root, 'runtime-bin')),
      encoding: 'utf8',
      timeout: 30_000,
      windowsHide: true,
    });
    if (result.error || result.signal || result.status === null)
      throw new Error(`Uncertain commit: ${result.error?.message ?? result.signal}`);
    expect(result.status).toBe(0);
    expect(fixtureGit(root, ['show', `HEAD:${relative}`])).toBe(staged);
    expect(readFileSync(file, 'utf8')).toBe(worktree);
    expect(fixtureGit(root, ['show', 'HEAD:unrelated.txt'])).toBe('staged unrelated bytes\n');
    expect(readFileSync(path.join(root, 'unrelated.txt'), 'utf8')).toBe('unstaged unrelated bytes\n');
    expect(readFileSync(path.join(root, 'untracked.txt'), 'utf8')).toBe('untracked bytes\n');
    expect(fixtureGit(root, ['ls-files', '--', 'untracked.txt'])).toBe('');
  } catch (error) {
    console.warn(`Retained failed pre-commit fixture: ${root}`);
    throw error;
  }
  rmSync(root, { recursive: true, force: true });
}, 40_000);

for (const [name, relative, body, diagnostic] of cases)
  test(`checked-in pre-commit rejects ${name} without changing staged or worktree bytes`, () => {
    const root = installedHookFixture(relative.startsWith('tests/') ? ['src/index.ts', relative] : undefined);
    try {
      const file = path.join(root, 'packages/agent', relative);
      writeFileSync(file, body);
      if (name !== 'unformatted staged TypeScript') formatPrecommitFixture(root, [relative]);
      const stagedBody = readFileSync(file, 'utf8');
      fixtureGit(root, ['add', '--', `packages/agent/${relative}`]);
      // Git commit itself refreshes cache-tree metadata before invoking the hook.
      // Object/mode custody here complements the direct gate's raw-index proof.
      const index = fixtureGit(root, ['ls-files', '--stage', '-z']);
      const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
      if (head.status !== 0 || head.error || head.signal) throw new Error('Cannot observe fixture HEAD');
      const result = spawnSync('git', ['commit', '-qm', 'must reject'], {
        cwd: root,
        env: prependEnvironmentPath({ ...process.env }, path.join(root, 'runtime-bin')),
        encoding: 'utf8',
        timeout: 30_000,
        windowsHide: true,
      });
      if (result.error || result.signal || result.status === null)
        throw new Error(`Uncertain commit: ${result.error?.message ?? result.signal}`);
      expect(result.status).not.toBe(0);
      expect(result.stdout + result.stderr).toMatch(diagnostic);
      expect(readFileSync(file, 'utf8')).toBe(stagedBody);
      expect(fixtureGit(root, ['ls-files', '--stage', '-z'])).toBe(index);
      const after = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
      expect(after.status).toBe(0);
      expect(after.stdout).toBe(head.stdout);
    } catch (error) {
      console.warn(`Retained failed pre-commit fixture: ${root}`);
      throw error;
    }
    rmSync(root, { recursive: true, force: true });
  }, 40_000);
