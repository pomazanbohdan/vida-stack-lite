import { afterEach, describe, expect, test } from 'vitest';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
  unlinkSync,
  readFileSync,
  symlinkSync,
  linkSync,
  renameSync,
  existsSync,
} from 'node:fs';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { FsSafeError } from '@openclaw/fs-safe/errors';
import { __setFsSafeTestHooksForTest } from '@openclaw/fs-safe/test-hooks';
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
  __setFsSafeTestHooksForTest(undefined);
  while (roots.length) rmSync(roots.pop(), { recursive: true, force: true });
});

function disappearanceError(repositoryRoot, kind) {
  if (kind === 'identity') return new FsSafeError('path-mismatch', 'opened file disappeared');
  return Object.assign(new Error('deleted opened file'), {
    code: 'EPERM',
    syscall: 'stat',
    path: path.join(path.parse(repositoryRoot).root, '$Extend', '$Deleted', 'fixture'),
  });
}

describe('safe repository access completeness', () => {
  test.each(['deleted', 'identity'])('Windows missing %s lock is contention before callback entry', async (kind) => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root(),
      access = requireSafeRepositoryAccess(repositoryRoot);
    const sidecar = path.join(repositoryRoot, 'resource.lock');
    const failure = disappearanceError(repositoryRoot, kind);
    writeFileSync(path.join(repositoryRoot, 'resource'), 'protected payload');
    writeFileSync(sidecar, '{}');
    let calls = 0;
    __setFsSafeTestHooksForTest({
      afterOpen: (file) => {
        if (path.resolve(file) !== sidecar) return;
        unlinkSync(sidecar);
        throw failure;
      },
    });
    await expect(access.withExclusiveLockAsync('resource', 'fixture', async () => ++calls)).rejects.toMatchObject({
      code: 'file_lock_timeout',
      cause: failure,
    });
    expect(calls).toBe(0);
    __setFsSafeTestHooksForTest(undefined);
    await expect(access.withExclusiveLockAsync('resource', 'fixture', async () => ++calls)).resolves.toBe(1);
    expect(calls).toBe(1);
    expect(readFileSync(path.join(repositoryRoot, 'resource'), 'utf8')).toBe('protected payload');
  });

  test.each([
    'replacement',
    'identity-present',
    'junction',
    'hardlink',
    'permission',
    'wrong-syscall',
    'outside',
    'untyped',
    'root-replaced',
  ])('Windows %s lock failure remains denied', async (kind) => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root(),
      access = requireSafeRepositoryAccess(repositoryRoot);
    const sidecar = path.join(repositoryRoot, 'resource.lock'),
      other = path.join(repositoryRoot, 'other');
    const movedRoot = path.join(path.dirname(repositoryRoot), path.basename(repositoryRoot) + '-moved');
    let failure = disappearanceError(repositoryRoot, kind === 'identity-present' ? 'identity' : 'deleted');
    if (kind === 'permission') failure.path = sidecar;
    if (kind === 'wrong-syscall') failure.syscall = 'open';
    if (kind === 'outside') failure = new FsSafeError('outside-workspace', 'outside');
    if (kind === 'untyped') failure = Object.assign(new Error('not a typed identity error'), { code: 'path-mismatch' });
    writeFileSync(other, 'other payload');
    writeFileSync(sidecar, '{}');
    let calls = 0;
    __setFsSafeTestHooksForTest({
      afterOpen: (file) => {
        if (path.resolve(file) !== sidecar) return;
        if (kind !== 'identity-present') unlinkSync(sidecar);
        if (kind === 'replacement') writeFileSync(sidecar, 'replacement');
        if (kind === 'junction') {
          const directory = path.join(repositoryRoot, 'linked-directory');
          mkdirSync(directory);
          symlinkSync(directory, sidecar, 'junction');
        }
        if (kind === 'hardlink') linkSync(other, sidecar);
        if (kind === 'root-replaced') {
          expect(path.dirname(movedRoot)).toBe(path.dirname(repositoryRoot));
          expect(existsSync(movedRoot)).toBe(false);
          renameSync(repositoryRoot, movedRoot);
          roots.push(movedRoot);
          mkdirSync(repositoryRoot);
        }
        throw failure;
      },
    });
    await expect(access.withExclusiveLockAsync('resource', 'fixture', async () => ++calls)).rejects.toBe(failure);
    expect(calls).toBe(0);
    expect(readFileSync(kind === 'root-replaced' ? path.join(movedRoot, 'other') : other, 'utf8')).toBe(
      'other payload',
    );
  });

  test.each(['callback', 'release'])('Windows %s errors never become acquisition contention', async (stage) => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root(),
      access = requireSafeRepositoryAccess(repositoryRoot);
    const sidecar = path.join(repositoryRoot, 'resource.lock');
    const failure = disappearanceError(repositoryRoot, 'deleted');
    let calls = 0,
      releasing = false;
    __setFsSafeTestHooksForTest({
      afterOpen: (file) => {
        if (!releasing || path.resolve(file) !== sidecar) return;
        unlinkSync(sidecar);
        throw failure;
      },
    });
    await expect(
      access.withExclusiveLockAsync('resource', 'fixture', async () => {
        calls++;
        if (stage === 'callback') throw failure;
        releasing = true;
        return 'effect occurred';
      }),
    ).rejects.toBe(failure);
    expect(calls).toBe(1);
  });

  test('provider exposes its native binding and truthful platform assurance', async () => {
    const repositoryRoot = root();
    const access = requireSafeRepositoryAccess(repositoryRoot);
    expect(safeRepositoryProviderAvailable).toBe(true);
    expect(access).toMatchObject({
      schema: 'SafeRepositoryAccess/v1',
      repository_root: repositoryRoot,
      attested: true,
      ...(process.platform === 'win32'
        ? {
            provider: 'fs-safe-windows',
            containment: 'best-effort',
            filesystem: 'unknown',
            directory_sync: 'unsupported',
          }
        : { provider: 'linux-proc-fd', ancestor_binding: 'directory-handle', atomic_replace: 'fsync-temp-rename' }),
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
    if (process.platform === 'win32') {
      expect(() => access.removeFile('data/value.txt', 'value file')).toThrow(/parent-handle delete/);
      expect(access.readText('data/value.txt', 'value file')).toBe('after');
    } else {
      access.removeFile('data/value.txt', 'value file');
      expect(access.fileExists('data/value.txt', 'value file')).toBe(false);
    }
    expect(access.readText('value.txt', 'value file')).toBe('before');
  });

  test('native CAS replaces only the expected bytes', async () => {
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

  test('provider preserves safe reads and rejects unsafe paths', async () => {
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
    if (process.platform === 'win32') {
      expect(() => access.removeFile('new.txt', 'file')).toThrow(/parent-handle delete/);
      expect(access.readText('new.txt', 'file')).toBe('x');
    } else {
      access.removeFile('new.txt', 'file');
      expect(access.fileExists('new.txt', 'file')).toBe(false);
    }

    writeFileSync(path.join(repositoryRoot, 'ordinary.txt'), 'file');
    expect(() => access.assertDirectory('ordinary.txt', 'ordinary')).toThrow(/director/);
  });

  test('provider treats the repository Git directory as a marker only', () => {
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
