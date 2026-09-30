import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
const isolated = process.env.LINUX_SIMULATION_ISOLATED === '1';
const underStryker = process.env.STRYKER_MUTATOR_WORKER !== undefined;
if (!isolated && !underStryker) {
  test('runs Linux descriptor simulation in an isolated Bun process', () => {
    const child = spawnSync(
      'bun',
      ['x', 'vitest', 'run', '--config', 'vitest.config.mjs', 'tests/safe-repository-linux-simulation.test.mjs'],
      {
        cwd: process.cwd(),
        env: { ...process.env, LINUX_SIMULATION_ISOLATED: '1' },
        encoding: 'utf8',
        timeout: 120_000,
      },
    );
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(`${child.stdout}\n${child.stderr}`).toMatch(/Tests\s+6 passed/);
  }, 180_000);
} else {
  const realFs = await vi.importActual('node:fs');
  const realNodeModule = await vi.importActual('node:module');
  const realRequire = realNodeModule.createRequire(import.meta.url);
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  const roots = [];
  const fdPaths = new Map();
  const simulatedNoFollow = 0x20000000;
  const simulatedDirectory = 0x10000000;
  let cloneFailuresRemaining = 0;
  let removeCloneSourceBeforeFailure = false;
  let createCloneTargetBeforeFailure = false;
  let rootIdentityMismatchRemaining = 0;
  let casLockOpenCount = 0;
  let removeRaceAccess;
  let removeRaceActive = false;
  let removeRaceAttempted = false;
  let removeRaceError;

  function translatedPath(value) {
    if (typeof value !== 'string') return value;
    const match = /^\/proc\/self\/fd\/(\d+)(?:\/(.*))?$/.exec(value);
    if (!match) return value;
    const root = fdPaths.get(Number(match[1]));
    if (!root) throw Object.assign(new Error('unknown simulated descriptor'), { code: 'EBADF' });
    const suffix = match[2];
    return suffix && suffix !== '.' ? path.join(root, ...suffix.split('/')) : root;
  }

  function trackedOpen(file, flags, mode) {
    const cleanFlags = typeof flags === 'number' ? flags & ~simulatedNoFollow & ~simulatedDirectory : flags;
    const resolved = translatedPath(file);
    if (typeof resolved === 'string' && path.basename(resolved).endsWith('.cas.lock')) casLockOpenCount += 1;
    if (
      removeRaceActive &&
      !removeRaceAttempted &&
      typeof resolved === 'string' &&
      path.basename(resolved) === 'race.txt'
    ) {
      removeRaceAttempted = true;
      try {
        removeRaceAccess.replaceAtomic(
          'data/race.txt',
          createHash('sha256').update('before').digest('hex'),
          'cas-winner',
          'race file',
        );
      } catch (error) {
        removeRaceError = error;
      }
    }
    const fd = realFs.openSync(resolved, cleanFlags, mode);
    fdPaths.set(fd, path.resolve(String(resolved)));
    return fd;
  }

  function trackedClose(fd) {
    if (!fdPaths.has(fd)) return;
    try {
      realFs.closeSync(fd);
    } finally {
      fdPaths.delete(fd);
    }
  }

  function simulatedFsync(fd) {
    const file = fdPaths.get(fd);
    if (file && realFs.lstatSync(file).isDirectory()) return;
    realFs.fsyncSync(fd);
  }

  const fakeFs = {
    ...realFs,
    constants: { ...realFs.constants, O_NOFOLLOW: simulatedNoFollow, O_DIRECTORY: simulatedDirectory },
    openSync: trackedOpen,
    closeSync: trackedClose,
    fsyncSync: simulatedFsync,
    existsSync(value) {
      if (value === '/proc/self/fd') return true;
      const processMatch = typeof value === 'string' && /^\/proc\/(\d+)$/.exec(value);
      if (processMatch) return Number(processMatch[1]) === process.pid;
      return realFs.existsSync(translatedPath(value));
    },
    realpathSync(value, options) {
      const resolved = realFs.realpathSync(translatedPath(value), options);
      if (typeof value === 'string' && value.startsWith('/proc/self/fd/') && rootIdentityMismatchRemaining > 0) {
        rootIdentityMismatchRemaining -= 1;
        return resolved + '.changed';
      }
      return resolved;
    },
    lstatSync(value, options) {
      return realFs.lstatSync(translatedPath(value), options);
    },
    mkdirSync(value, options) {
      return realFs.mkdirSync(translatedPath(value), options);
    },
    readdirSync(value, options) {
      return realFs.readdirSync(translatedPath(value), options);
    },
    renameSync(from, to) {
      return realFs.renameSync(translatedPath(from), translatedPath(to));
    },
    unlinkSync(value) {
      return realFs.unlinkSync(translatedPath(value));
    },
    rmdirSync(value, options) {
      return realFs.rmdirSync(translatedPath(value), options);
    },
  };

  function cloneFileExclusive(sourceFd, targetRootFd, targetRelPath) {
    const source = fdPaths.get(sourceFd);
    const targetRoot = fdPaths.get(targetRootFd);
    if (!source || !targetRoot) throw Object.assign(new Error('unknown simulated clone descriptor'), { code: 'EBADF' });
    const target = path.join(targetRoot, ...targetRelPath.split('/'));
    if (cloneFailuresRemaining > 0) {
      cloneFailuresRemaining -= 1;
      if (removeCloneSourceBeforeFailure) realFs.unlinkSync(source);
      if (createCloneTargetBeforeFailure) realFs.copyFileSync(source, target, realFs.constants.COPYFILE_EXCL);
      throw Object.assign(new Error('simulated clone failure'), { code: 'EIO' });
    }
    const writeFd = trackedOpen(
      target,
      realFs.constants.O_WRONLY | realFs.constants.O_CREAT | realFs.constants.O_EXCL,
      0o600,
    );
    realFs.writeFileSync(writeFd, realFs.readFileSync(source));
    trackedClose(writeFd);
    return trackedOpen(target, realFs.constants.O_RDWR);
  }

  function renameNoReplace(sourceRootFd, sourceRelPath, targetRootFd, targetRelPath) {
    const sourceRoot = fdPaths.get(sourceRootFd);
    const targetRoot = fdPaths.get(targetRootFd);
    if (!sourceRoot || !targetRoot)
      throw Object.assign(new Error('unknown simulated rename descriptor'), { code: 'EBADF' });
    const source = path.join(sourceRoot, ...sourceRelPath.split('/'));
    const target = path.join(targetRoot, ...targetRelPath.split('/'));
    if (realFs.existsSync(target))
      throw Object.assign(new Error('simulated no-replace rename target exists'), { code: 'EEXIST' });
    realFs.renameSync(source, target);
  }

  function fakeRequire(specifier) {
    if (typeof specifier === 'string' && /[\\/]native[.]js$/.test(specifier)) {
      return { getNativeBinding: () => ({ cloneFileExclusive, renameNoReplace }) };
    }
    return realRequire(specifier);
  }
  fakeRequire.resolve = realRequire.resolve.bind(realRequire);

  vi.doMock('node:fs', () => fakeFs);
  vi.doMock('node:module', () => ({ ...realNodeModule, createRequire: () => fakeRequire }));
  vi.doMock('@openclaw/fs-safe/advanced', () => ({
    assertNoSymlinkParentsSync: () => undefined,
    openRootFileSync: ({ absolutePath, rootPath }) => {
      const resolvedRoot = realFs.realpathSync(rootPath);
      const resolvedFile = realFs.realpathSync(absolutePath);
      const insideRoot = resolvedFile !== resolvedRoot && resolvedFile.startsWith(resolvedRoot + path.sep);
      const stats = realFs.lstatSync(absolutePath);
      if (!insideRoot || !stats.isFile() || resolvedFile !== path.resolve(absolutePath))
        return { ok: false, reason: 'unsafe simulated package file' };
      const fd = realFs.openSync(absolutePath, realFs.constants.O_RDONLY);
      fdPaths.set(fd, path.resolve(String(absolutePath)));
      return { ok: true, fd };
    },
    sameFileIdentity: (left, right) => left.dev === right.dev && left.ino === right.ino,
  }));
  vi.doMock('@openclaw/fs-safe/atomic', () => ({ replaceFileAtomicSync: () => undefined }));
  vi.doMock('@openclaw/fs-safe/file-lock', () => ({
    withFileLock: async (_target, _options, operation) => operation(),
    withFileLockSync: (_target, _options, operation) => operation(),
  }));
  vi.doMock('@openclaw/fs-safe/root', () => ({
    root: async () => {
      throw new Error('unused in Linux simulation');
    },
  }));
  Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });

  const linuxSafe = await import('../src/config/safe-repository-access.ts?linux-simulation');
  const hash = (value) => createHash('sha256').update(value).digest('hex');

  function temporaryRoot() {
    const created = realFs.realpathSync(realFs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-linux-safe-')));
    roots.push(created);
    return created;
  }

  afterEach(() => {
    while (roots.length) realFs.rmSync(roots.pop(), { recursive: true, force: true });
    cloneFailuresRemaining = 0;
    removeCloneSourceBeforeFailure = false;
    createCloneTargetBeforeFailure = false;
    rootIdentityMismatchRemaining = 0;
    casLockOpenCount = 0;
    removeRaceAccess = undefined;
    removeRaceActive = false;
    removeRaceAttempted = false;
    removeRaceError = undefined;
  });

  afterAll(() => {
    vi.doUnmock('node:fs');
    vi.doUnmock('node:module');
    vi.doUnmock('@openclaw/fs-safe/advanced');
    vi.doUnmock('@openclaw/fs-safe/atomic');
    vi.doUnmock('@openclaw/fs-safe/file-lock');
    vi.doUnmock('@openclaw/fs-safe/root');
    Object.defineProperty(process, 'platform', originalPlatform);
  });

  describe('Linux descriptor-bound safe repository simulation', () => {
    test('performs descriptor-bound reads, creates, locks, and compare-reserve-replace', async () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      expect(linuxSafe.safeRepositoryProviderAvailable).toBe(true);
      expect(access).toMatchObject({
        schema: 'SafeRepositoryAccess/v1',
        provider: 'linux-proc-fd',
        repository_root: repositoryRoot,
        attested: true,
      });
      expect(access.assertAvailable()).toBeUndefined();

      expect(access.ensureDirectory('data', 'data directory')).toBe(path.join(repositoryRoot, 'data'));
      await expect(access.ensureDirectoryAsync('data/nested', 'nested directory')).resolves.toBe(
        path.join(repositoryRoot, 'data', 'nested'),
      );
      access.assertDirectory('data/nested', 'nested directory');
      access.writeExclusive('data/value.txt', 'before', 'value file');
      await access.writeExclusiveAsync('data/async.txt', 'async', 'async value file');
      expect(access.readText('data/value.txt', 'value file')).toBe('before');
      expect(access.readBytes('data/async.txt', 'async value file').toString('utf8')).toBe('async');
      expect(() => access.writeExclusive('data/value.txt', 'duplicate', 'value file')).toThrow();
      access.writeExclusive('data/remove.txt', 'remove', 'remove file');
      const casLockOpensBeforeRemove = casLockOpenCount;
      access.removeFile('data/remove.txt', 'remove file');
      expect(casLockOpenCount).toBeGreaterThan(casLockOpensBeforeRemove);
      expect(access.fileExists('data/remove.txt', 'remove file')).toBe(false);
      access.writeExclusive('data/race.txt', 'before', 'race file');
      removeRaceAccess = access;
      removeRaceActive = true;
      try {
        access.removeFile('data/race.txt', 'race file');
      } finally {
        removeRaceActive = false;
      }
      expect(removeRaceAttempted).toBe(true);
      expect(removeRaceError).toMatchObject({ code: 'EEXIST' });
      expect(access.fileExists('data/race.txt', 'race file')).toBe(false);

      expect(access.withExclusiveLock('data/sync.lock', 'sync lock', () => 'sync-result')).toBe('sync-result');
      await expect(
        access.withExclusiveLockAsync('data/async.lock', 'async lock', async () => 'async-result'),
      ).resolves.toBe('async-result');

      access.replaceAtomic('data/value.txt', hash('before'), 'after', 'value file');
      expect(access.readText('data/value.txt', 'value file')).toBe('after');
      expect(() => access.replaceAtomic('data/value.txt', hash('stale'), 'wrong', 'value file')).toThrow(/stale/);
      const receipt = access.compareReserveReplace('data/value.txt', hash('after'), 'final', 'value file');
      expect(receipt).toMatchObject({
        schema: 'NativeCompareReserveReplace/v1',
        provider: 'linux-proc-fd',
        containment: 'kernel-atomic',
        expected_hash: hash('after'),
        result_hash: hash('final'),
        status: 'applied',
      });
      expect(access.readText('data/value.txt', 'value file')).toBe('final');
    });

    test('rejects unsafe paths, wrong node types, hard links, and bounded-size violations', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.detectSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      access.writeExclusive('data/value.txt', 'value', 'value file');
      realFs.writeFileSync(path.join(repositoryRoot, 'data', 'chunk.bin'), Buffer.alloc(64 * 1024, 1));
      expect(access.readBytes('data/chunk.bin', 'chunk file')).toHaveLength(64 * 1024);
      realFs.linkSync(path.join(repositoryRoot, 'data', 'value.txt'), path.join(repositoryRoot, 'data', 'linked.txt'));

      expect(() => access.readText('../outside.txt', 'escape')).toThrow(/escapes/);
      expect(() => access.readBytes('', 'empty')).toThrow(/escapes/);
      expect(() => access.readText('data', 'directory')).toThrow(/regular/);
      expect(() => access.readText('data/value.txt', 'hard link')).toThrow(/single-link/);
      expect(() => access.assertDirectory('data/value.txt', 'file')).toThrow(/directory/);
      expect(() => access.writeExclusive('data/large.txt', 'x'.repeat(8 * 1024 * 1024 + 1), 'large')).toThrow(
        /bounded/,
      );
    });

    test('reclaims stale locks and refuses live, invalid, or guarded lock ownership', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      const old = new Date(Date.now() - 60_000);
      const lockPayload = (owner_pid) =>
        JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid, label: 'fixture' });

      const stale = path.join(repositoryRoot, 'data', 'stale.lock');
      realFs.writeFileSync(stale, lockPayload(2_147_483_647));
      realFs.utimesSync(stale, old, old);
      expect(access.withExclusiveLock('data/stale.lock', 'stale lock', () => 'reclaimed')).toBe('reclaimed');

      const orphaned = path.join(repositoryRoot, 'data', 'orphaned.lock');
      realFs.writeFileSync(orphaned, lockPayload(2_147_483_647));
      realFs.utimesSync(orphaned, old, old);
      const orphanGuard = orphaned + '.reclaim';
      realFs.mkdirSync(orphanGuard);
      realFs.utimesSync(orphanGuard, old, old);
      expect(() => access.withExclusiveLock('data/orphaned.lock', 'orphaned lock', () => 'recovered')).toThrow(
        /reclaim/,
      );
      realFs.rmSync(orphanGuard, { recursive: true, force: true });
      realFs.rmSync(orphaned, { force: true });

      const recoverable = path.join(repositoryRoot, 'data', 'recoverable.lock');
      realFs.writeFileSync(recoverable, lockPayload(2_147_483_647));
      realFs.utimesSync(recoverable, old, old);
      const recoverableGuard = recoverable + '.reclaim';
      realFs.mkdirSync(recoverableGuard);
      realFs.writeFileSync(
        path.join(recoverableGuard, 'owner.json'),
        JSON.stringify({
          schema: 'SafeRepositoryAccessReclaimGuard/v1',
          owner_pid: 2_147_483_647,
          owner_token: '1'.repeat(36),
          acquired_at: old.toISOString(),
        }),
      );
      realFs.utimesSync(recoverableGuard, old, old);
      realFs.utimesSync(path.join(recoverableGuard, 'owner.json'), old, old);
      expect(access.withExclusiveLock('data/recoverable.lock', 'recoverable lock', () => 'recovered')).toBe(
        'recovered',
      );
      expect(realFs.existsSync(recoverableGuard)).toBe(false);

      const live = path.join(repositoryRoot, 'data', 'live.lock');
      realFs.writeFileSync(live, lockPayload(process.pid));
      realFs.utimesSync(live, old, old);
      expect(() => access.withExclusiveLock('data/live.lock', 'live lock', () => undefined)).toThrow();
      realFs.rmSync(live, { force: true });

      const invalid = path.join(repositoryRoot, 'data', 'invalid.lock');
      realFs.writeFileSync(invalid, lockPayload(0));
      realFs.utimesSync(invalid, old, old);
      expect(() => access.withExclusiveLock('data/invalid.lock', 'invalid lock', () => undefined)).toThrow(/owner/);
      realFs.rmSync(invalid, { force: true });

      const guarded = path.join(repositoryRoot, 'data', 'guarded.lock');
      realFs.mkdirSync(guarded + '.reclaim');
      expect(() => access.withExclusiveLock('data/guarded.lock', 'guarded lock', () => undefined)).toThrow(/reclaim/);
      realFs.rmSync(guarded + '.reclaim', { recursive: true, force: true });

      const releaseBlocked = path.join(repositoryRoot, 'data', 'release-blocked.lock');
      expect(
        access.withExclusiveLock('data/release-blocked.lock', 'release blocked', () => {
          realFs.mkdirSync(releaseBlocked + '.reclaim');
          return 'held';
        }),
      ).toBe('held');
      realFs.rmSync(releaseBlocked, { force: true });
      realFs.rmSync(releaseBlocked + '.reclaim', { recursive: true, force: true });

      const changedOwner = path.join(repositoryRoot, 'data', 'changed-owner.lock');
      expect(
        access.withExclusiveLock('data/changed-owner.lock', 'changed owner', () => {
          realFs.writeFileSync(changedOwner, lockPayload(2_147_483_647));
          return 'changed';
        }),
      ).toBe('changed');
      realFs.rmSync(changedOwner, { force: true });
      expect(() =>
        access.withExclusiveLock('data/nested.lock', 'outer lock', () =>
          access.withExclusiveLock('data/nested.lock', 'inner lock', () => undefined),
        ),
      ).toThrow();
      realFs.rmSync(path.join(repositoryRoot, 'data', 'nested.lock'), { force: true });
    });

    test('keeps stale reclaim guards fail-closed when owner evidence is live, malformed, or mixed', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      const data = path.join(repositoryRoot, 'data');
      const old = new Date(Date.now() - 60_000);
      const staleLock = (name) => {
        const target = path.join(data, name);
        realFs.writeFileSync(
          target,
          JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: 2_147_483_647 }),
        );
        realFs.utimesSync(target, old, old);
        return target;
      };
      const guard = (lockPath, owner, { extraEntry = false } = {}) => {
        const guardPath = lockPath + '.reclaim';
        realFs.mkdirSync(guardPath);
        const ownerPath = path.join(guardPath, 'owner.json');
        if (owner !== undefined) realFs.writeFileSync(ownerPath, owner);
        if (extraEntry) realFs.writeFileSync(path.join(guardPath, 'unexpected.tmp'), 'preserve');
        realFs.utimesSync(guardPath, old, old);
        if (realFs.existsSync(ownerPath)) realFs.utimesSync(ownerPath, old, old);
        return guardPath;
      };

      const liveLock = staleLock('live-guard.lock');
      const liveGuard = guard(
        liveLock,
        JSON.stringify({
          schema: 'SafeRepositoryAccessReclaimGuard/v1',
          owner_pid: process.pid,
          owner_token: '1'.repeat(36),
          acquired_at: old.toISOString(),
        }),
      );
      expect(() => access.withExclusiveLock('data/live-guard.lock', 'live guard lock', () => undefined)).toThrow(
        /reclaim/,
      );
      expect(realFs.existsSync(liveLock)).toBe(true);
      expect(realFs.readFileSync(path.join(liveGuard, 'owner.json'), 'utf8')).toContain(String(process.pid));

      const malformedLock = staleLock('malformed-guard.lock');
      const malformedGuard = guard(malformedLock, '{invalid json');
      expect(() =>
        access.withExclusiveLock('data/malformed-guard.lock', 'malformed guard lock', () => undefined),
      ).toThrow(/reclaim/);
      expect(realFs.existsSync(malformedLock)).toBe(true);
      expect(realFs.readFileSync(path.join(malformedGuard, 'owner.json'), 'utf8')).toBe('{invalid json');

      const mixedLock = staleLock('mixed-guard.lock');
      const mixedGuard = guard(
        mixedLock,
        JSON.stringify({
          schema: 'SafeRepositoryAccessReclaimGuard/v1',
          owner_pid: 2_147_483_647,
          owner_token: '2'.repeat(36),
          acquired_at: old.toISOString(),
        }),
        { extraEntry: true },
      );
      expect(() => access.withExclusiveLock('data/mixed-guard.lock', 'mixed guard lock', () => undefined)).toThrow(
        /reclaim/,
      );
      expect(realFs.existsSync(mixedLock)).toBe(true);
      expect(realFs.readFileSync(path.join(mixedGuard, 'unexpected.tmp'), 'utf8')).toBe('preserve');
    });

    test('rejects an unsafe reclaim guard node without changing outside data', () => {
      const repositoryRoot = temporaryRoot();
      const outsideRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      const sentinel = path.join(outsideRoot, 'sentinel');
      realFs.writeFileSync(sentinel, 'preserve');
      const guardPath = path.join(repositoryRoot, 'data', 'unsafe.lock.reclaim');
      let linkedOutside = false;
      try {
        realFs.symlinkSync(outsideRoot, guardPath, 'junction');
        linkedOutside = true;
      } catch (error) {
        if (!['EPERM', 'ENOTSUP', 'EACCES'].includes(error.code)) throw error;
        realFs.writeFileSync(guardPath, 'preserve');
      }

      expect(() => access.withExclusiveLock('data/unsafe.lock', 'unsafe reclaim guard', () => undefined)).toThrow(
        /reclaim guard is unsafe/,
      );
      expect(realFs.readFileSync(sentinel, 'utf8')).toBe('preserve');
      if (linkedOutside) expect(realFs.lstatSync(guardPath).isSymbolicLink()).toBe(true);
      else expect(realFs.readFileSync(guardPath, 'utf8')).toBe('preserve');
      expect(realFs.existsSync(path.join(repositoryRoot, 'data', 'unsafe.lock'))).toBe(false);
    });

    test('recovers orphan backups and restores the original after clone failure', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      const data = path.join(repositoryRoot, 'data');

      access.writeExclusive('data/existing.txt', 'before', 'existing');
      realFs.copyFileSync(
        path.join(data, 'existing.txt'),
        path.join(data, '.existing.txt.11111111-1111-4111-8111-111111111111.cas-old'),
      );
      access.replaceAtomic('data/existing.txt', hash('before'), 'after', 'existing');
      expect(access.readText('data/existing.txt', 'existing')).toBe('after');

      access.writeExclusive('data/missing.txt', 'before', 'missing');
      realFs.renameSync(
        path.join(data, 'missing.txt'),
        path.join(data, '.missing.txt.22222222-2222-4222-8222-222222222222.cas-old'),
      );
      access.replaceAtomic('data/missing.txt', hash('before'), 'after', 'missing');
      expect(access.readText('data/missing.txt', 'missing')).toBe('after');

      access.writeExclusive('data/ambiguous.txt', 'before', 'ambiguous');
      realFs.copyFileSync(
        path.join(data, 'ambiguous.txt'),
        path.join(data, '.ambiguous.txt.33333333-3333-4333-8333-333333333333.cas-old'),
      );
      realFs.copyFileSync(
        path.join(data, 'ambiguous.txt'),
        path.join(data, '.ambiguous.txt.44444444-4444-4444-8444-444444444444.cas-old'),
      );
      expect(() => access.replaceAtomic('data/ambiguous.txt', hash('before'), 'after', 'ambiguous')).toThrow(
        /multiple|ambiguous/,
      );

      access.writeExclusive('data/restored.txt', 'before', 'restored');
      cloneFailuresRemaining = 1;
      expect(() => access.replaceAtomic('data/restored.txt', hash('before'), 'after', 'restored')).toThrow(
        /failed|simulated/,
      );
      expect(access.readText('data/restored.txt', 'restored')).toBe('before');

      access.writeExclusive('data/unlinked-temp.txt', 'before', 'unlinked temp');
      cloneFailuresRemaining = 1;
      removeCloneSourceBeforeFailure = true;
      expect(() => access.replaceAtomic('data/unlinked-temp.txt', hash('before'), 'after', 'unlinked temp')).toThrow(
        /failed|simulated/,
      );
      removeCloneSourceBeforeFailure = false;
      expect(access.readText('data/unlinked-temp.txt', 'unlinked temp')).toBe('before');

      access.writeExclusive('data/committed-before-error.txt', 'before', 'committed before error');
      cloneFailuresRemaining = 1;
      createCloneTargetBeforeFailure = true;
      expect(() =>
        access.replaceAtomic('data/committed-before-error.txt', hash('before'), 'after', 'committed before error'),
      ).toThrow(/failed|simulated/);
      createCloneTargetBeforeFailure = false;
      expect(access.readText('data/committed-before-error.txt', 'committed before error')).toBe('after');

      access.writeExclusive('data/restore-fails.txt', 'before', 'restore fails');
      cloneFailuresRemaining = 2;
      expect(() => access.replaceAtomic('data/restore-fails.txt', hash('before'), 'after', 'restore fails')).toThrow(
        /preserved for recovery/,
      );

      realFs.mkdirSync(path.join(data, 'wrong-type.txt'));
      realFs.writeFileSync(path.join(data, '.wrong-type.txt.55555555-5555-4555-8555-555555555555.cas-old'), 'before');
      expect(() => access.replaceAtomic('data/wrong-type.txt', hash('before'), 'after', 'wrong type')).toThrow(
        /regular/,
      );

      rootIdentityMismatchRemaining = 2;
      expect(() => access.ensureDirectory('identity-check', 'identity check')).toThrow(/identity/);
    });
  });
}
