import { expect, test } from 'bun:test';
import { rejects } from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  createPrecommitFixture as fixture,
  fixtureGit as git,
  checkPrecommitFixture as check,
  formatPrecommitFixture,
} from './helpers/precommit-repository-fixture.js';

test('accepts a clean staged fixture while preserving a broken unstaged version', async () => {
  const root = fixture();
  try {
    const index = readFileSync(path.join(root, '.git/index'));
    const file = path.join(root, 'packages/agent/src/index.ts');
    const unstaged = 'this is deliberately invalid TypeScript';
    writeFileSync(file, unstaged);
    let guarded = false;
    await check(root, () => {
      guarded = true;
    });
    expect(guarded).toBe(true);
    expect(readFileSync(file, 'utf8')).toBe(unstaged);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(index);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform === 'win32')(
  'runs all staged gates with Bun and Git available when Node is absent from PATH',
  async () => {
    const root = fixture();
    const commandDirectory = mkdtempSync(path.join(tmpdir(), 'vida-bun-only-path-'));
    const originalPath = process.env.PATH;
    try {
      const git = Bun.which('git');
      if (git === null) throw new Error('git is required by the staged fixture');
      symlinkSync(git, path.join(commandDirectory, 'git'));
      process.env.PATH = commandDirectory;
      let guarded = false;
      await check(root, () => {
        guarded = true;
      });
      expect(guarded).toBe(true);
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
      rmSync(commandDirectory, { recursive: true, force: true });
      rmSync(root, { recursive: true, force: true });
    }
  },
);

test('blocks staged Knip findings and missing pins before later gates, without changing the index', async () => {
  const root = fixture();
  try {
    const file = path.join(root, 'packages/agent/src/orphan.ts');
    writeFileSync(file, 'export const orphan = true;\n');
    git(root, ['add', '--', 'packages/agent/src/orphan.ts']);
    const index = readFileSync(path.join(root, '.git/index'));
    let guarded = false;
    await rejects(
      check(root, () => {
        guarded = true;
      }),
      /failed/u,
    );
    expect(guarded).toBe(false);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(index);
    const manifestFile = path.join(root, 'packages/agent/package.json');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as { devDependencies: Record<string, string> };
    delete manifest.devDependencies.knip;
    writeFileSync(manifestFile, JSON.stringify(manifest));
    git(root, ['add', '--', 'packages/agent/package.json']);
    await rejects(
      check(root, () => undefined),
      /does not pin knip/u,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a parser lock mismatch before invoking the focused-test guard', async () => {
  const root = fixture();
  try {
    const file = path.join(root, 'packages/agent/bun.lock');
    const lock = JSON.parse(readFileSync(file, 'utf8')) as { packages: Record<string, unknown[]> };
    lock.packages['@babel/parser'] = ['@babel/parser@0.0.0'];
    writeFileSync(file, JSON.stringify(lock));
    git(root, ['add', '--', 'packages/agent/bun.lock']);
    const index = readFileSync(path.join(root, '.git/index'));
    let guarded = false;
    await rejects(
      check(root, () => {
        guarded = true;
      }),
      /lock does not agree with the @babel\/parser manifest pin/u,
    );
    expect(guarded).toBe(false);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(index);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a native lint helper without its locked wrapper dependency edge before later gates', async () => {
  const root = fixture();
  try {
    const file = path.join(root, 'packages/agent/bun.lock');
    const lock = JSON.parse(readFileSync(file, 'utf8')) as { packages: Record<string, unknown[]> };
    const wrapper = lock.packages['oxlint-tsgolint'];
    if (!wrapper) throw new Error('fixture lint wrapper is missing');
    wrapper[2] = { optionalDependencies: {} };
    writeFileSync(file, JSON.stringify(lock));
    git(root, ['add', '--', 'packages/agent/bun.lock']);
    const index = readFileSync(path.join(root, '.git/index'));
    let guarded = false;
    await rejects(
      check(root, () => {
        guarded = true;
      }),
      /lock does not bind oxlint-tsgolint/u,
    );
    expect(guarded).toBe(false);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(index);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects staged native TypeScript helper errors while preserving a valid unstaged version', async () => {
  const root = fixture(['src/index.ts', 'tests/helpers/compiler-input.ts']);
  try {
    const helper = 'packages/agent/tests/helpers/compiler-input.ts';
    const helperPath = path.join(root, helper);
    mkdirSync(path.dirname(helperPath), { recursive: true });
    writeFileSync(helperPath, "const count: number = 'not a number';\nexport { count };\n");
    formatPrecommitFixture(root, ['tests/helpers/compiler-input.ts']);
    git(root, ['add', '--', helper]);

    const stagedIndex = readFileSync(path.join(root, '.git/index'));
    const validUnstaged = 'export const count = 1;\n';
    writeFileSync(helperPath, validUnstaged);

    let guarded = false;
    await rejects(
      check(root, () => {
        guarded = true;
      }),
      /check failed/u,
    );

    expect(guarded).toBe(true);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(stagedIndex);
    expect(readFileSync(helperPath, 'utf8')).toBe(validUnstaged);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts a valid staged TypeScript helper while preserving an invalid unstaged version', async () => {
  const root = fixture(['src/index.ts', 'tests/helpers/compiler-input.ts']);
  try {
    const helper = 'packages/agent/tests/helpers/compiler-input.ts';
    const helperPath = path.join(root, helper);
    mkdirSync(path.dirname(helperPath), { recursive: true });
    writeFileSync(helperPath, 'export const count = 1;\n');
    formatPrecommitFixture(root, ['tests/helpers/compiler-input.ts']);
    git(root, ['add', '--', helper]);
    const stagedIndex = readFileSync(path.join(root, '.git/index'));
    const invalidUnstaged = "export const count: number = 'unstaged error';\n";
    writeFileSync(helperPath, invalidUnstaged);
    let guarded = false;
    await check(root, () => {
      guarded = true;
    });
    expect(guarded).toBe(true);
    expect(readFileSync(path.join(root, '.git/index'))).toEqual(stagedIndex);
    expect(readFileSync(helperPath, 'utf8')).toBe(invalidUnstaged);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
