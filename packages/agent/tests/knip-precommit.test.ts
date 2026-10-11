import { expect, test } from 'bun:test';
import { rejects } from 'node:assert/strict';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  createPrecommitFixture as fixture,
  fixtureGit as git,
  checkPrecommitFixture as check,
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
