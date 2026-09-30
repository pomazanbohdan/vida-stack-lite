import { afterEach, describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  detectSafeRepositoryAccess,
  requireSafeRepositoryAccess,
  safeRepositoryProviderAvailable,
} from '../src/config/safe-repository-access.ts';

const roots = [];
const require = createRequire(import.meta.url);

function root() {
  const created = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-safe-')));
  roots.push(created);
  return created;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

describe('safe repository access completeness', () => {
  test('Windows provider exposes native containment and truthful directory durability', async () => {
    const repositoryRoot = root();
    const access = requireSafeRepositoryAccess(repositoryRoot);
    expect(safeRepositoryProviderAvailable).toBe(true);
    expect(access).toMatchObject({
      schema: 'SafeRepositoryAccess/v1',
      provider: 'fs-safe-windows',
      repository_root: repositoryRoot,
      attested: true,
      containment: 'best-effort',
      filesystem: 'unknown',
      directory_sync: 'unsupported',
    });
    expect(access.assertAvailable()).toBeUndefined();

    writeFileSync(path.join(repositoryRoot, 'value.txt'), 'before');
    expect(access.readText('value.txt', 'value file')).toBe('before');
    expect(access.readBytes('value.txt', 'value file').toString('utf8')).toBe('before');
    expect(access.fileExists('value.txt', 'value file')).toBe(true);
    expect(access.fileExists('missing.txt', 'missing file')).toBe(false);

    await expect(access.ensureDirectoryAsync('data', 'data directory')).resolves.toBeDefined();
    await expect(access.writeExclusiveAsync('data/value.txt', 'after', 'value file')).resolves.toBeUndefined();
    await expect(access.withExclusiveLockAsync('data/async.lock', 'async lock', async () => 'result')).resolves.toBe(
      'result',
    );
    expect(() => access.ensureDirectory('data', 'data directory')).not.toThrow();
    expect(() => access.removeFile('data/value.txt', 'value file')).toThrow(/parent-handle delete/);
    expect(access.readText('data/value.txt', 'value file')).toBe('after');
    expect(access.readText('value.txt', 'value file')).toBe('before');
  });

  test('Windows native CAS replaces only the expected bytes', async () => {
    const repositoryRoot = root();
    const access = requireSafeRepositoryAccess(repositoryRoot);
    writeFileSync(path.join(repositoryRoot, 'race.txt'), 'original');

    const expected = createHash('sha256').update('original').digest('hex');
    await expect(access.replaceAtomicAsync('race.txt', expected, 'replacement', 'race file')).resolves.toBeUndefined();
    expect(access.readText('race.txt', 'race file')).toBe('replacement');
    await expect(access.replaceAtomicAsync('race.txt', expected, 'second', 'race file')).rejects.toThrow(/stale/);
    expect(access.readText('race.txt', 'race file')).toBe('replacement');
  });

  test('Windows rename exceptions after native commit are non-retryable unknown outcomes', async () => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root();
    const access = requireSafeRepositoryAccess(repositoryRoot);
    writeFileSync(path.join(repositoryRoot, 'fault.txt'), 'before');
    const nativeModule = require(path.resolve('node_modules/@openclaw/fs-safe/dist/native.js'));
    const binding = nativeModule.getNativeBinding();
    if (!binding) return;
    const original = binding.renameReplace;
    binding.renameReplace = (...args) => {
      original(...args);
      throw new Error('injected post-rename fault');
    };
    try {
      const expected = createHash('sha256').update('before').digest('hex');
      await expect(access.replaceAtomicAsync('fault.txt', expected, 'after', 'fault file')).rejects.toThrow(
        /outcome unknown.*retry prohibited/,
      );
      expect(access.readText('fault.txt', 'fault file')).toBe('after');
    } finally {
      binding.renameReplace = original;
    }
  });

  test('Windows provider preserves safe reads and rejects unsafe paths', async () => {
    const repositoryRoot = root();
    const access = detectSafeRepositoryAccess(repositoryRoot);
    writeFileSync(path.join(repositoryRoot, 'new.txt'), 'x');
    expect(access.readText('new.txt', 'file')).toBe('x');
    expect(access.fileExists('new.txt', 'file')).toBe(true);
    expect(access.fileExists('missing.txt', 'file')).toBe(false);
    mkdirSync(path.join(repositoryRoot, 'list'));
    writeFileSync(path.join(repositoryRoot, 'list', 'new.txt'), 'x');
    expect(access.listFiles('list', 'repository list')).toContain('new.txt');
    await expect(access.ensureDirectoryAsync('new', 'directory')).resolves.toBeDefined();
    await expect(access.writeExclusiveAsync('new.txt', 'x', 'file')).rejects.toThrow();
    expect(() => access.readText('../outside.txt', 'escape')).toThrow(/escapes/);
    expect(() => access.readText('.git/config', 'repository metadata')).toThrow(/unsafe path segment/);
    expect(() => access.readBytes('', 'empty')).toThrow(/escapes/);
    expect(() => access.assertDirectory('missing', 'missing')).toThrow();
    expect(() => access.removeFile('new.txt', 'file')).toThrow(/parent-handle delete/);
    expect(access.readText('new.txt', 'file')).toBe('x');

    expect(() => access.assertDirectory('new.txt', 'ordinary')).toThrow(/director/);
  });

  test('Windows provider treats the repository Git directory as a marker only', () => {
    const repositoryRoot = root();
    const access = detectSafeRepositoryAccess(repositoryRoot);
    expect(access.fileExists('.git', 'repository marker')).toBe(false);
    expect(() => access.readText('.git/config', 'repository metadata')).toThrow(/unsafe path segment/);
    expect(() => access.fileExists('.git/config', 'repository metadata')).toThrow(/unsafe path segment/);
  });

  test('repository root must be absolute and canonical', () => {
    expect(() => detectSafeRepositoryAccess('relative')).toThrow(/absolute/);
    expect(() => detectSafeRepositoryAccess(`${root()}${path.sep}child${path.sep}..`)).toThrow(/canonical/);
  });
});
