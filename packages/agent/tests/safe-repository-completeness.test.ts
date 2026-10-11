import { afterAll, afterEach, describe, expect, mock, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
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
import * as realFsSafeAdvanced from '@openclaw/fs-safe/advanced';

type NativePathArgs = [sourceRootFd: number, sourceRelPath: string, targetRootFd: number, targetRelPath: string];
type NativeBinding = {
  openBeneath: (
    rootFd: number,
    relPath: string,
    flags: number,
  ) => { fd: number; containment: 'kernel-atomic' | 'best-effort' };
  renameReplace: (...args: NativePathArgs) => void;
};
type LockFailureKind =
  | 'replacement'
  | 'identity-present'
  | 'junction'
  | 'hardlink'
  | 'permission'
  | 'wrong-syscall'
  | 'outside'
  | 'untyped'
  | 'root-replaced';
function isNativeBinding(value: unknown): value is NativeBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'openBeneath' in value &&
    typeof value.openBeneath === 'function' &&
    'renameReplace' in value &&
    typeof value.renameReplace === 'function'
  );
}

function nativeModuleBinding(moduleValue: unknown): NativeBinding | undefined {
  if (typeof moduleValue !== 'object' || moduleValue === null || !('getNativeBinding' in moduleValue)) {
    throw new TypeError('Native module has an invalid shape');
  }
  const getNativeBinding = moduleValue.getNativeBinding;
  if (typeof getNativeBinding !== 'function') throw new TypeError('Native module has no binding accessor');
  const value: unknown = getNativeBinding.call(moduleValue);
  if (value === undefined) return undefined;
  if (!isNativeBinding(value)) throw new TypeError('Native binding has an invalid shape');
  return value;
}

if (process.platform === 'win32' && process.env.SAFE_REPOSITORY_COMPLETENESS_ISOLATED !== '1') {
  test('runs safe repository completeness in an isolated Bun process', () => {
    const child = spawnSync(process.execPath, ['test', 'tests/safe-repository-completeness.test.ts'], {
      cwd: process.cwd(),
      env: { ...process.env, SAFE_REPOSITORY_COMPLETENESS_ISOLATED: '1' },
      encoding: 'utf8',
      timeout: 120_000,
    });
    if (!child.error && !child.signal && Number.isInteger(child.status) && child.status !== 0)
      console.error(`${child.stdout}\n${child.stderr}`);
    expect(child.error).toBeUndefined();
    expect(child.signal).toBe(null);
    expect(child.status).toBe(0);
    expect(`${child.stdout ?? ''}\n${child.stderr ?? ''}`).toContain(
      'BUN_TEST_SUITE_COMPLETE:safe repository access completeness',
    );
  }, 180_000);
}
const roots: string[] = [];
const require = createRequire(import.meta.url);
const packageReadGate: { denied: boolean } = { denied: false };
if (process.platform === 'win32' && process.env.SAFE_REPOSITORY_COMPLETENESS_ISOLATED === '1')
  void mock.module('@openclaw/fs-safe/advanced', () => {
    return {
      ...realFsSafeAdvanced,
      openRootFileSync: (options: Parameters<typeof realFsSafeAdvanced.openRootFileSync>[0]) => {
        if (packageReadGate.denied && options.boundaryLabel === 'fs-safe package attestation') return { ok: false };
        return realFsSafeAdvanced.openRootFileSync(options);
      },
    };
  });
const { detectSafeRepositoryAccess, requireSafeRepositoryAccess, safeRepositoryProviderAvailable } =
  await import('../src/config/safe-repository-access.ts');
const safeRepositorySuite =
  process.platform === 'win32' && process.env.SAFE_REPOSITORY_COMPLETENESS_ISOLATED !== '1' ? describe.skip : describe;

function root(): string {
  const created = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-safe-')));
  roots.push(created);
  return created;
}

afterEach(() => {
  packageReadGate.denied = false;
  __setFsSafeTestHooksForTest(undefined);
  while (roots.length) {
    const ownedRoot = roots.pop();
    if (ownedRoot === undefined) throw new Error('Fixture root stack underflow');
    rmSync(ownedRoot, { recursive: true, force: true });
  }
});

function disappearanceError(repositoryRoot: string, kind: 'identity' | 'deleted'): Error {
  if (kind === 'identity') return new FsSafeError('path-mismatch', 'opened file disappeared');
  return Object.assign(new Error('deleted opened file'), {
    code: 'EPERM',
    syscall: 'stat',
    path: path.join(path.parse(repositoryRoot).root, '$Extend', '$Deleted', 'fixture'),
  });
}

safeRepositorySuite('safe repository access completeness', () => {
  afterAll(() => process.stdout.write('BUN_TEST_SUITE_COMPLETE:safe repository access completeness\n'));
  test('Windows reused creator retains exclusive writes and collision denial', async () => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root(),
      creator = await requireSafeRepositoryAccess(repositoryRoot).prepareExclusiveCreation();
    await creator.ensureDirectory('data', 'owned directory');
    await creator.writeExclusive('data/one.txt', 'one', 'owned first file');
    await creator.writeExclusive('data/two.txt', 'two', 'owned second file');
    await Promise.resolve(expect(creator.writeExclusive('data/one.txt', 'changed', 'existing file')).rejects.toThrow());
    expect(readFileSync(path.join(repositoryRoot, 'data/one.txt'), 'utf8')).toBe('one');
    expect(readFileSync(path.join(repositoryRoot, 'data/two.txt'), 'utf8')).toBe('two');
  });

  test.each(['write', 'mkdir'] as const)(
    'Windows cached-await root replacement denies %s before effects',
    async (mode) => {
      if (process.platform !== 'win32') return;
      const fixture = root(),
        repositoryRoot = path.join(fixture, 'root'),
        moved = path.join(fixture, 'moved');
      mkdirSync(repositoryRoot);
      const creator = await requireSafeRepositoryAccess(repositoryRoot).prepareExclusiveCreation();
      const pending =
        mode === 'write'
          ? creator.writeExclusive('target.txt', 'owned fixture', 'owned race file')
          : creator.ensureDirectory('target', 'owned race directory');
      queueMicrotask(() => {
        expect(path.dirname(path.resolve(repositoryRoot))).toBe(fixture);
        expect(path.dirname(path.resolve(moved))).toBe(fixture);
        renameSync(repositoryRoot, moved);
        mkdirSync(repositoryRoot);
      });
      await Promise.resolve(expect(pending).rejects.toThrow(/root.*(changed|identity)/));
      const target = mode === 'write' ? 'target.txt' : 'target';
      expect(existsSync(path.join(repositoryRoot, target))).toBe(false);
      expect(existsSync(path.join(moved, target))).toBe(false);
    },
  );

  test.each(['write', 'mkdir'] as const)(
    'Windows reused creator denies unavailable package attestation before %s',
    async (mode) => {
      if (process.platform !== 'win32') return;
      const repositoryRoot = root(),
        creator = await requireSafeRepositoryAccess(repositoryRoot).prepareExclusiveCreation();
      packageReadGate.denied = true;
      try {
        const pending =
          mode === 'write'
            ? creator.writeExclusive('target.txt', 'owned fixture', 'owned denied file')
            : creator.ensureDirectory('target', 'owned denied directory');
        await Promise.resolve(expect(pending).rejects.toThrow(/fs-safe package file is unsafe/));
        expect(existsSync(path.join(repositoryRoot, mode === 'write' ? 'target.txt' : 'target'))).toBe(false);
      } finally {
        packageReadGate.denied = false;
      }
    },
  );

  test.each(['lock', 'replace'] as const)('Windows cached %s denies attestation drift during await', async (mode) => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root(),
      access = requireSafeRepositoryAccess(repositoryRoot);
    await access.prepareExclusiveCreation();
    writeFileSync(path.join(repositoryRoot, 'payload.txt'), 'before');
    let calls = 0;
    const pending =
      mode === 'lock'
        ? access.withExclusiveLockAsync('resource', 'owned lock', async () => ++calls)
        : access.replaceAtomicAsync(
            'payload.txt',
            createHash('sha256').update('before').digest('hex'),
            'after',
            'owned CAS',
          );
    queueMicrotask(() => {
      packageReadGate.denied = true;
    });
    try {
      await Promise.resolve(expect(pending).rejects.toThrow(/fs-safe package file is unsafe/));
      expect(calls).toBe(0);
      expect(readFileSync(path.join(repositoryRoot, 'payload.txt'), 'utf8')).toBe('before');
      expect(existsSync(path.join(repositoryRoot, 'resource.lock'))).toBe(false);
      expect(existsSync(path.join(repositoryRoot, 'payload.txt.cas.lock.lock'))).toBe(false);
    } finally {
      packageReadGate.denied = false;
    }
  });

  test.each(['lock', 'replace'] as const)('Windows cached %s denies root replacement during await', async (mode) => {
    if (process.platform !== 'win32') return;
    const fixture = root(),
      repositoryRoot = path.join(fixture, 'root'),
      moved = path.join(fixture, 'moved');
    mkdirSync(repositoryRoot);
    writeFileSync(path.join(repositoryRoot, 'payload.txt'), 'before');
    const access = requireSafeRepositoryAccess(repositoryRoot);
    await access.prepareExclusiveCreation();
    let calls = 0;
    const pending =
      mode === 'lock'
        ? access.withExclusiveLockAsync('resource', 'owned root-race lock', async () => ++calls)
        : access.replaceAtomicAsync(
            'payload.txt',
            createHash('sha256').update('before').digest('hex'),
            'after',
            'owned root-race CAS',
          );
    queueMicrotask(() => {
      expect(path.dirname(path.resolve(repositoryRoot))).toBe(fixture);
      expect(path.dirname(path.resolve(moved))).toBe(fixture);
      renameSync(repositoryRoot, moved);
      mkdirSync(repositoryRoot);
    });
    await Promise.resolve(expect(pending).rejects.toThrow(/root.*(changed|identity)/));
    expect(calls).toBe(0);
    expect(readFileSync(path.join(moved, 'payload.txt'), 'utf8')).toBe('before');
    for (const location of [repositoryRoot, moved]) {
      expect(existsSync(path.join(location, 'resource.lock'))).toBe(false);
      expect(existsSync(path.join(location, 'payload.txt.cas.lock.lock'))).toBe(false);
    }
    expect(existsSync(path.join(repositoryRoot, 'payload.txt'))).toBe(false);
  });

  test.each(['deleted', 'identity'] as const)(
    'Windows missing %s lock is contention before callback entry',
    async (kind) => {
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
      await Promise.resolve(
        expect(access.withExclusiveLockAsync('resource', 'fixture', async () => ++calls)).rejects.toMatchObject({
          code: 'file_lock_timeout',
          cause: failure,
        }),
      );
      expect(calls).toBe(0);
      __setFsSafeTestHooksForTest(undefined);
      await Promise.resolve(
        expect(access.withExclusiveLockAsync('resource', 'fixture', async () => ++calls)).resolves.toBe(1),
      );
      expect(calls).toBe(1);
      expect(readFileSync(path.join(repositoryRoot, 'resource'), 'utf8')).toBe('protected payload');
    },
  );

  test.each<LockFailureKind>([
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
    if (kind === 'permission')
      failure = Object.assign(new Error('permission denial'), { code: 'EPERM', syscall: 'stat', path: sidecar });
    if (kind === 'wrong-syscall')
      failure = Object.assign(new Error('wrong syscall'), { code: 'EPERM', syscall: 'open', path: sidecar });
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
    await Promise.resolve(
      expect(access.withExclusiveLockAsync('resource', 'fixture', async () => ++calls)).rejects.toBe(failure),
    );
    expect(calls).toBe(0);
    expect(readFileSync(kind === 'root-replaced' ? path.join(movedRoot, 'other') : other, 'utf8')).toBe(
      'other payload',
    );
  });

  test.each(['callback', 'release'] as const)(
    'Windows %s errors never become acquisition contention',
    async (stage) => {
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
      await Promise.resolve(
        expect(
          access.withExclusiveLockAsync('resource', 'fixture', async () => {
            calls++;
            if (stage === 'callback') throw failure;
            releasing = true;
            return 'effect occurred';
          }),
        ).rejects.toBe(failure),
      );
      expect(calls).toBe(1);
    },
  );

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

    await Promise.resolve(expect(access.ensureDirectoryAsync('data', 'data directory')).resolves.toBeDefined());
    await Promise.resolve(
      expect(access.writeExclusiveAsync('data/value.txt', 'after', 'value file')).resolves.toBeUndefined(),
    );
    await Promise.resolve(
      expect(access.withExclusiveLockAsync('data/async.lock', 'async lock', async () => 'result')).resolves.toBe(
        'result',
      ),
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
    await Promise.resolve(
      expect(access.replaceAtomicAsync('race.txt', expected, 'replacement', 'race file')).resolves.toBeUndefined(),
    );
    expect(access.readText('race.txt', 'race file')).toBe('replacement');
    await Promise.resolve(
      expect(access.replaceAtomicAsync('race.txt', expected, 'second', 'race file')).rejects.toThrow(/stale/),
    );
    expect(access.readText('race.txt', 'race file')).toBe('replacement');
  });

  test('Windows rename exceptions after native commit are non-retryable unknown outcomes', async () => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root();
    const access = requireSafeRepositoryAccess(repositoryRoot);
    writeFileSync(path.join(repositoryRoot, 'fault.txt'), 'before');
    const nativeModule: unknown = require(path.resolve('node_modules/@openclaw/fs-safe/dist/native.js'));
    const binding = nativeModuleBinding(nativeModule);
    if (!binding) return;
    const original = binding.renameReplace;
    binding.renameReplace = (...args: NativePathArgs) => {
      original(...args);
      throw new Error('injected post-rename fault');
    };
    try {
      const expected = createHash('sha256').update('before').digest('hex');
      await Promise.resolve(
        expect(access.replaceAtomicAsync('fault.txt', expected, 'after', 'fault file')).rejects.toThrow(
          /outcome unknown.*retry prohibited/,
        ),
      );
      expect(access.readText('fault.txt', 'fault file')).toBe('after');
    } finally {
      binding.renameReplace = original;
    }
  });

  test('Windows replacement rejects a hardlinked target without changing either name', async () => {
    if (process.platform !== 'win32') return;
    const repositoryRoot = root(),
      access = requireSafeRepositoryAccess(repositoryRoot);
    writeFileSync(path.join(repositoryRoot, 'original.txt'), 'before');
    linkSync(path.join(repositoryRoot, 'original.txt'), path.join(repositoryRoot, 'alias.txt'));
    await Promise.resolve(
      expect(
        access.replaceAtomicAsync(
          'original.txt',
          createHash('sha256').update('before').digest('hex'),
          'after',
          'hardlinked target',
        ),
      ).rejects.toThrow(/single-link/),
    );
    expect(readFileSync(path.join(repositoryRoot, 'original.txt'), 'utf8')).toBe('before');
    expect(readFileSync(path.join(repositoryRoot, 'alias.txt'), 'utf8')).toBe('before');
  });

  test.each(['target', 'staging', 'result'] as const)(
    'Windows replacement detects same-byte %s substitution',
    async (surface) => {
      if (process.platform !== 'win32') return;
      const repositoryRoot = root(),
        access = requireSafeRepositoryAccess(repositoryRoot);
      const target = path.join(repositoryRoot, 'race.txt');
      writeFileSync(target, 'before');
      const nativeModule: unknown = require(path.resolve('node_modules/@openclaw/fs-safe/dist/native.js'));
      const binding = nativeModuleBinding(nativeModule);
      if (!binding) throw new Error('Native binding is unavailable');
      const originalOpen = binding.openBeneath,
        originalRename = binding.renameReplace;
      let stageOpens = 0,
        replaced = false;
      const substitute = (file: string): void => {
        const bytes = readFileSync(file);
        renameSync(file, file + '.retained');
        writeFileSync(file, bytes);
        replaced = true;
      };
      binding.openBeneath = (rootFd, relPath, flags) => {
        if (/^\.race\.txt\.[^.]+\.native\.tmp$/.test(relPath)) {
          stageOpens++;
          if (surface === 'target' && stageOpens === 1) substitute(target);
          if (surface === 'staging' && stageOpens === 2) substitute(path.join(repositoryRoot, relPath));
        }
        return originalOpen(rootFd, relPath, flags);
      };
      binding.renameReplace = (...args: NativePathArgs) => {
        originalRename(...args);
        if (surface === 'result') substitute(target);
      };
      try {
        await Promise.resolve(
          expect(
            access.replaceAtomicAsync(
              'race.txt',
              createHash('sha256').update('before').digest('hex'),
              'after',
              'identity race',
            ),
          ).rejects.toThrow(surface === 'result' ? /outcome unknown.*retry prohibited/ : /identity or content changed/),
        );
        expect(replaced).toBe(true);
        expect(readFileSync(target, 'utf8')).toBe(surface === 'result' ? 'after' : 'before');
      } finally {
        binding.openBeneath = originalOpen;
        binding.renameReplace = originalRename;
      }
    },
  );

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
    await Promise.resolve(expect(access.ensureDirectoryAsync('new', 'directory')).resolves.toBeDefined());
    await Promise.resolve(expect(access.writeExclusiveAsync('new.txt', 'x', 'file')).rejects.toThrow());
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
