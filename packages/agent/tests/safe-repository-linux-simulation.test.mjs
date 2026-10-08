import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
const isolated = process.env.LINUX_SIMULATION_ISOLATED === '1';
const underStryker = process.env.STRYKER_MUTATOR_WORKER !== undefined;
if (!isolated && !underStryker) {
  test('runs Linux descriptor simulation in an isolated Bun process', () => {
    const child = spawnSync(
      'bun',
      [
        'x',
        '--bun',
        'vitest',
        'run',
        '--config',
        'vitest.config.mjs',
        'tests/safe-repository-linux-simulation.test.mjs',
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, LINUX_SIMULATION_ISOLATED: '1' },
        encoding: 'utf8',
        timeout: 120_000,
      },
    );
    if (!child.error && !child.signal && Number.isInteger(child.status) && child.status !== 0)
      console.error(`${child.stdout}\n${child.stderr}`);
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(`${child.stdout}\n${child.stderr}`).toMatch(/Tests\s+18 passed/);
  }, 180_000);
} else {
  const realFs = await vi.importActual('node:fs');
  const realNodeModule = await vi.importActual('node:module');
  const realRequire = realNodeModule.createRequire(import.meta.url);
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  const roots = [];
  const fdPaths = new Map();
  const fdAccess = new Map();
  const copyDescriptors = new Set();
  const simulatedNoFollow = 0x20000000;
  const simulatedDirectory = 0x10000000;
  let cloneFailuresRemaining = 0;
  let cloneUnavailableRemaining = 0;
  let cloneUnavailableCode = 'ENOTSUP';
  let shortCopyWrites = false;
  let copyWriteFault;
  let copyCleanupFault = false;
  let substituteRestoredTarget = false;
  let substituteTargetBeforePublication;
  let replaceCloneTargetAfterSuccess = false;
  let failRecoveryCloneAfterRenameFailure = false;
  let rootIdentityMismatchRemaining = 0;
  let casLockOpenCount = 0;
  let removeRaceAccess;
  let removeRaceActive = false;
  let removeRaceAttempted = false;
  let removeRaceError;
  let traversalRecoveryAccess;
  let traversalRecoveryActive = false;
  let traversalRecoveryAttempted = false;
  let traversalRecoveryError;
  let cooperatingReaderAccess;
  let cooperatingReaderTarget;
  let cooperatingReaderAttempted = false;
  let cooperatingReaderError;
  let renameReplaceFailureMode;
  let recoveryProbeFailureAt = 0;
  let recoveryProbeCalls = 0;
  let recoveryProbeArmed = false;
  let publicationPauseBeforeAtomicRenameMs = 0;
  let publicationPauseAfterAtomicRenameMs = 0;
  let publicationPauseBeforeCopyMs = 0;

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
    fdAccess.set(fd, cleanFlags);
    if (typeof cleanFlags === 'number' && cleanFlags & realFs.constants.O_CREAT && cleanFlags & realFs.constants.O_RDWR)
      copyDescriptors.add(fd);
    return fd;
  }

  function trackedClose(fd) {
    if (!fdPaths.has(fd)) return;
    try {
      const file = fdPaths.get(fd);
      if (
        substituteRestoredTarget &&
        copyDescriptors.has(fd) &&
        file &&
        path.basename(file) === 'fallback.txt' &&
        realFs.existsSync(file) &&
        realFs.readFileSync(file, 'utf8') === 'before'
      ) {
        substituteRestoredTarget = false;
        realFs.renameSync(file, file + '.displaced');
        realFs.writeFileSync(file, 'foreign');
      }
      realFs.closeSync(fd);
    } finally {
      fdPaths.delete(fd);
      fdAccess.delete(fd);
      copyDescriptors.delete(fd);
    }
  }

  function simulatedFsync(fd) {
    const file = fdPaths.get(fd);
    if (realFs.fstatSync(fd).isDirectory()) return;
    const flags = fdAccess.get(fd);
    if (
      originalPlatform.value === 'win32' &&
      typeof flags === 'number' &&
      (flags & (realFs.constants.O_WRONLY | realFs.constants.O_RDWR)) === 0
    ) {
      const original = realFs.fstatSync(fd);
      const owned = roots.some((candidate) => {
        const relative = path.relative(candidate, file);
        return (
          relative &&
          relative !== '..' &&
          !relative.startsWith('..' + path.sep) &&
          !path.isAbsolute(relative) &&
          realFs.realpathSync(candidate) === candidate
        );
      });
      if (
        !owned ||
        realFs.realpathSync(file) !== file ||
        !original.isFile() ||
        original.nlink !== 1 ||
        !realFs.lstatSync(file).isFile()
      )
        throw new Error('simulated readonly flush target is not an owned private file');
      const writable = realFs.openSync(file, realFs.constants.O_RDWR);
      try {
        const opened = realFs.fstatSync(writable);
        if (
          !opened.isFile() ||
          opened.nlink !== 1 ||
          opened.dev !== original.dev ||
          opened.ino !== original.ino ||
          realFs.realpathSync(file) !== file
        )
          throw new Error('simulated readonly flush target identity changed');
        realFs.fsyncSync(writable);
      } finally {
        realFs.closeSync(writable);
      }
      return;
    }
    realFs.fsyncSync(fd);
    if (substituteTargetBeforePublication && file && path.basename(file).endsWith('.tmp')) {
      const target = substituteTargetBeforePublication;
      substituteTargetBeforePublication = undefined;
      realFs.renameSync(target, target + '.displaced');
      realFs.writeFileSync(target, 'foreign');
    }
  }

  const fakeFs = {
    ...realFs,
    constants: { ...realFs.constants, O_NOFOLLOW: simulatedNoFollow, O_DIRECTORY: simulatedDirectory },
    openSync: trackedOpen,
    closeSync: trackedClose,
    writeSync(fd, buffer, offset, length, position) {
      const file = fdPaths.get(fd);
      if (file && path.basename(file).includes('fallback.txt') && path.basename(file).endsWith('.cas-old')) {
        if (publicationPauseBeforeCopyMs > 0) {
          const pause = publicationPauseBeforeCopyMs;
          publicationPauseBeforeCopyMs = 0;
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pause);
        }
        if (copyWriteFault) {
          const mode = copyWriteFault;
          copyWriteFault = undefined;
          if (mode === 'zero') return 0;
          if (mode === 'foreign') {
            realFs.unlinkSync(file);
            realFs.writeFileSync(file, 'foreign');
          }
          throw Object.assign(new Error('simulated copy write failure'), { code: 'EIO' });
        }
        if (shortCopyWrites) length = Math.min(length, 2);
      }
      return realFs.writeSync(fd, buffer, offset, length, position);
    },
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
      if (recoveryProbeArmed && ++recoveryProbeCalls === recoveryProbeFailureAt)
        throw Object.assign(new Error('simulated recovery listing failure'), {code: 'EIO'});
      return realFs.readdirSync(translatedPath(value), options);
    },
    renameSync(from, to) {
      const source = translatedPath(from);
      const target = translatedPath(to);
      const result = realFs.renameSync(source, target);
      return result;
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
    if (cloneUnavailableRemaining > 0) {
      cloneUnavailableRemaining -= 1;
      throw Object.assign(new Error('simulated unavailable reflink'), { code: cloneUnavailableCode });
    }
    if (cloneFailuresRemaining > 0) {
      cloneFailuresRemaining -= 1;
      throw Object.assign(new Error('simulated clone failure'), { code: 'EIO' });
    }
    if (
      traversalRecoveryActive &&
      !traversalRecoveryAttempted &&
      path.basename(source).endsWith('.cas-old')
    ) {
      traversalRecoveryAttempted = true;
      traversalRecoveryActive = false;
      try {
        traversalRecoveryAccess.replaceAtomic(
          'data/recovery.txt',
          createHash('sha256').update('before').digest('hex'),
          'second-writer',
          'recovery contender',
        );
      } catch (error) {
        traversalRecoveryError = error;
      }
    }
    const writeFd = trackedOpen(
      target,
      realFs.constants.O_WRONLY | realFs.constants.O_CREAT | realFs.constants.O_EXCL,
      0o600,
    );
    realFs.writeFileSync(writeFd, realFs.readFileSync(source));
    trackedClose(writeFd);
    const copied = trackedOpen(target, realFs.constants.O_WRONLY);
    if (replaceCloneTargetAfterSuccess) {
      replaceCloneTargetAfterSuccess = false;
      realFs.renameSync(target, target + '.displaced');
      realFs.writeFileSync(target, 'foreign');
    }
    return copied;
  }

  function renameNoReplace(sourceRootFd, sourceRelPath, targetRootFd, targetRelPath) {
    if ([sourceRelPath, targetRelPath].some((value) => value.split('/').some((part) => Buffer.byteLength(part, 'utf8') > 255)))
      throw Object.assign(new Error('simulated Linux component exceeds NAME_MAX'), { code: 'ENAMETOOLONG' });
    const sourceRoot = fdPaths.get(sourceRootFd);
    const targetRoot = fdPaths.get(targetRootFd);
    if (!sourceRoot || !targetRoot)
      throw Object.assign(new Error('unknown simulated rename descriptor'), { code: 'EBADF' });
    if (copyCleanupFault && sourceRelPath.includes('fallback.txt') && targetRelPath.endsWith('.reclaimed')) {
      copyCleanupFault = false;
      throw Object.assign(new Error('simulated copy cleanup failure'), { code: 'EIO' });
    }
    const source = path.join(sourceRoot, ...sourceRelPath.split('/'));
    const target = path.join(targetRoot, ...targetRelPath.split('/'));
    if (realFs.existsSync(target))
      throw Object.assign(new Error('simulated no-replace rename target exists'), { code: 'EEXIST' });
    realFs.renameSync(source, target);
  }

  function renameReplace(sourceRootFd, sourceRelPath, targetRootFd, targetRelPath) {
    const sourceRoot = fdPaths.get(sourceRootFd);
    const targetRoot = fdPaths.get(targetRootFd);
    if (!sourceRoot || !targetRoot)
      throw Object.assign(new Error('unknown simulated replacement descriptor'), { code: 'EBADF' });
    const source = path.join(sourceRoot, ...sourceRelPath.split('/'));
    const target = path.join(targetRoot, ...targetRelPath.split('/'));
    if (cooperatingReaderAccess && !cooperatingReaderAttempted) {
      cooperatingReaderAttempted = true;
      try {
        cooperatingReaderAccess.readBytes(cooperatingReaderTarget, 'cooperating reader during publication');
      } catch (error) {
        cooperatingReaderError = error;
      }
    }
    if (publicationPauseBeforeAtomicRenameMs > 0) {
      const pause = publicationPauseBeforeAtomicRenameMs;
      publicationPauseBeforeAtomicRenameMs = 0;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pause);
    }
    const failureMode = renameReplaceFailureMode;
    renameReplaceFailureMode = undefined;
    if (failureMode === 'remove-target') {
      realFs.unlinkSync(target);
      recoveryProbeArmed = recoveryProbeFailureAt > 0;
      if (failRecoveryCloneAfterRenameFailure) {
        failRecoveryCloneAfterRenameFailure = false;
        cloneFailuresRemaining = 1;
      }
      throw Object.assign(new Error('simulated native replacement failure'), { code: 'EIO' });
    }
    realFs.renameSync(source, target);
    if (publicationPauseAfterAtomicRenameMs > 0) {
      const pause = publicationPauseAfterAtomicRenameMs;
      publicationPauseAfterAtomicRenameMs = 0;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pause);
    }
    if (failureMode === 'after-effect')
      throw Object.assign(new Error('simulated native replacement outcome unknown'), { code: 'EIO' });
  }

  function fakeRequire(specifier) {
    if (typeof specifier === 'string' && /[\\/]native[.]js$/.test(specifier)) {
      return { getNativeBinding: () => ({ cloneFileExclusive, renameNoReplace, renameReplace }) };
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
    cloneUnavailableRemaining = 0;
    cloneUnavailableCode = 'ENOTSUP';
    shortCopyWrites = false;
    copyWriteFault = undefined;
    copyCleanupFault = false;
    substituteRestoredTarget = false;
    substituteTargetBeforePublication = undefined;
    replaceCloneTargetAfterSuccess = false;
    failRecoveryCloneAfterRenameFailure = false;
    rootIdentityMismatchRemaining = 0;
    casLockOpenCount = 0;
    removeRaceAccess = undefined;
    removeRaceActive = false;
    removeRaceAttempted = false;
    removeRaceError = undefined;
    traversalRecoveryAccess = undefined;
    traversalRecoveryActive = false;
    traversalRecoveryAttempted = false;
    traversalRecoveryError = undefined;
    cooperatingReaderAccess = undefined;
    cooperatingReaderTarget = undefined;
    cooperatingReaderAttempted = false;
    cooperatingReaderError = undefined;
    renameReplaceFailureMode = undefined;
    recoveryProbeFailureAt = 0;
    recoveryProbeCalls = 0;
    recoveryProbeArmed = false;
    publicationPauseBeforeAtomicRenameMs = 0;
    publicationPauseAfterAtomicRenameMs = 0;
    publicationPauseBeforeCopyMs = 0;
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
    test('releases CAS locks at the filename byte boundary without stranding custody', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      const data = path.join(repositoryRoot, 'data');
      for (const name of ['a'.repeat(190), 'b'.repeat(191), 'я'.repeat(95) + 'c']) {
        const target = 'data/' + name;
        access.writeExclusive(target, 'before', 'long filename');
        expect(realFs.readdirSync(data).sort()).toEqual([name]);
        expect(access.readText(target, 'long filename read')).toBe('before');
        access.replaceAtomic(target, hash('before'), 'after', 'long filename replacement');
        expect(access.fileExists(target, 'long filename existence')).toBe(true);
        expect(access.readText(target, 'long filename reread')).toBe('after');
        expect(realFs.readdirSync(data).sort()).toEqual([name]);
        const originalBackup = '.' + name + '.11111111-1111-4111-8111-111111111111.cas-old';
        realFs.writeFileSync(path.join(data, originalBackup), 'after');
        realFs.unlinkSync(path.join(data, name));
        access.replaceAtomic(target, hash('after'), 'recovered', 'original long backup recovery');
        expect(access.readText(target, 'recovered long filename')).toBe('recovered');
        expect(realFs.readdirSync(data).sort()).toEqual([name]);
        access.removeFile(target, 'long filename removal');
        expect(realFs.readdirSync(data)).toEqual([]);
      }
      const longName = 'd'.repeat(191);
      const shortName = 'vida-cas-' + hash(longName);
      const longBackup = '.' + shortName + '.11111111-1111-4111-8111-111111111111.cas-old-hashed';
      realFs.writeFileSync(path.join(data, longBackup), 'before');
      access.writeExclusive('data/' + shortName, 'before', 'colliding short target');
      access.replaceAtomic('data/' + shortName, hash('before'), 'short-after', 'short target replacement');
      expect(realFs.readFileSync(path.join(data, longBackup), 'utf8')).toBe('before');
      access.replaceAtomic('data/' + longName, hash('before'), 'long-after', 'bounded backup recovery');
      expect(access.readText('data/' + longName, 'long recovered target')).toBe('long-after');
      expect(access.readText('data/' + shortName, 'short preserved target')).toBe('short-after');
      expect(realFs.readdirSync(data).sort()).toEqual([longName, shortName].sort());
    });

    test('closes every owned descriptor after repeated traversal open and create faults', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      realFs.writeFileSync(path.join(repositoryRoot, 'data', 'blocker'), 'not a directory');

      for (const fail of [
        () => access.readBytes('missing/target.txt', 'root traversal fault'),
        () => access.readBytes('data/missing/target.txt', 'missing traversal fault'),
        () => access.ensureDirectory('data/blocker/child', 'create traversal fault'),
        () => access.directoryIdentity('data/missing', 'identity traversal fault'),
      ]) {
        const ownedBefore = new Set(fdPaths.keys());
        for (let attempt = 0; attempt < 25; attempt += 1) expect(fail).toThrow();
        const leaked = [...fdPaths.keys()].filter((fd) => !ownedBefore.has(fd));
        for (const fd of leaked) trackedClose(fd);
        expect(leaked).toHaveLength(0);
      }

      const ownedBefore = new Set(fdPaths.keys());
      for (let attempt = 0; attempt < 25; attempt += 1)
        expect(access.fileExists('data/missing/target.txt', 'existence traversal fault')).toBe(false);
      const leaked = [...fdPaths.keys()].filter((fd) => !ownedBefore.has(fd));
      for (const fd of leaked) trackedClose(fd);
      expect(leaked).toHaveLength(0);
    });

    test('publishes complete old or new bytes to raw readers through forced copy fallback', async () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      const target = path.join(repositoryRoot, 'data', 'fallback.txt');
      const before = 'complete-old';
      const after = 'complete-new-'.repeat(1024);
      access.writeExclusive('data/fallback.txt', before, 'copy source');
      cloneUnavailableRemaining = 1;
      publicationPauseBeforeCopyMs = 75;
      publicationPauseBeforeAtomicRenameMs = 75;
      publicationPauseAfterAtomicRenameMs = 75;
      cooperatingReaderAccess = access;
      cooperatingReaderTarget = 'data/fallback.txt';
      const readerSource = `
        const fs = require('node:fs');
        const target = ${JSON.stringify(target)};
        const oldBytes = ${JSON.stringify(before)};
        const newBytes = ${JSON.stringify(after)};
        const observed = { missing: 0, partial: 0, old: 0, next: 0 };
        const timer = setInterval(() => {
          try {
            const value = fs.readFileSync(target, 'utf8');
            if (value === oldBytes) observed.old += 1;
            else if (value === newBytes) observed.next += 1;
            else observed.partial += 1;
          } catch (error) {
            if (error.code === 'ENOENT') observed.missing += 1;
            else throw error;
          }
        }, 1);
        process.stdin.on('end', () => {
          clearInterval(timer);
          process.stdout.write(JSON.stringify(observed));
        });
        process.stdin.resume();
      `;
      const reader = spawn(process.execPath, ['--eval', readerSource], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let output = '';
      let stderr = '';
      reader.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));
      reader.stderr.setEncoding('utf8').on('data', (chunk) => (stderr += chunk));
      await new Promise((resolve) => setTimeout(resolve, 25));
      try {
        access.replaceAtomic('data/fallback.txt', hash(before), after, 'fallback reader race');
      } finally {
        reader.stdin.end();
      }
      const [code, signal] = await once(reader, 'close');
      expect({ code, signal, stderr }).toMatchObject({ code: 0, signal: null, stderr: '' });
      expect(JSON.parse(output)).toMatchObject({ missing: 0, partial: 0 });
      expect(JSON.parse(output).old).toBeGreaterThan(0);
      expect(JSON.parse(output).next).toBeGreaterThan(0);
      expect(cooperatingReaderAttempted).toBe(true);
      expect(cooperatingReaderError).toBeInstanceOf(Error);
      expect(cooperatingReaderError.message).toMatch(/lock/);
      expect(access.readText('data/fallback.txt', 'completed replacement')).toBe(after);
    });

    test('denies a second writer until failed replacement recovery completes', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      access.writeExclusive('data/recovery.txt', 'before', 'recovery source');
      traversalRecoveryAccess = access;
      traversalRecoveryActive = true;
      renameReplaceFailureMode = 'remove-target';

      expect(() => access.replaceAtomic('data/recovery.txt', hash('before'), 'first-writer', 'failed replacement')).toThrow(
        /failed|simulated/,
      );
      expect(traversalRecoveryAttempted).toBe(true);
      expect(traversalRecoveryError).toBeInstanceOf(Error);
      expect(traversalRecoveryError.message).toMatch(/lock/);
      expect(access.readText('data/recovery.txt', 'recovered original')).toBe('before');
    });

    test('retains original replacement and recovery-probe failures together', () => {
      for (const failureAt of [1, 3]) {
        const repositoryRoot = temporaryRoot();
        const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
        access.ensureDirectory('data', 'data directory');
        access.writeExclusive('data/probe.txt', 'before', 'probe source');
        renameReplaceFailureMode = 'remove-target';
        recoveryProbeFailureAt = failureAt;
        recoveryProbeCalls = 0;
        recoveryProbeArmed = false;
        let caught;
        try { access.replaceAtomic('data/probe.txt', hash('before'), 'after', 'probe replacement'); }
        catch (error) { caught = error; }
        expect(caught).toBeInstanceOf(AggregateError);
        expect(caught.errors[0].message).toBe('simulated native replacement failure');
        expect(caught.errors[1].message).toBe('simulated recovery listing failure');
        expect(caught.cause).toBe(caught.errors[0]);
        expect(realFs.readdirSync(path.join(repositoryRoot, 'data')).some(name => name.endsWith('.cas.lock'))).toBe(true);
        recoveryProbeFailureAt = 0;
        recoveryProbeArmed = false;
      }
    });

    test('real Linux FIFO and repeated traversal faults stay prompt and leak-free', () => {
      if (originalPlatform.value !== 'linux') return;
      const script = `
        const fs = require('node:fs');
        const os = require('node:os');
        const path = require('node:path');
        const { spawnSync } = require('node:child_process');
        const { requireSafeRepositoryAccess } = require('./src/config/safe-repository-access.ts');
        const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'agent-runtime-fifo-root-')));
        try {
          const access = requireSafeRepositoryAccess(root);
          access.ensureDirectory('data', 'data directory');
          fs.writeFileSync(path.join(root, 'blocked'), 'not a directory');
          const countFds = () => fs.readdirSync('/proc/self/fd').length;
          const before = countFds();
          for (let attempt = 0; attempt < 25; attempt += 1) {
            for (const fail of [
              () => access.readBytes('missing/target.txt', 'root traversal fault'),
              () => access.readBytes('data/missing/target.txt', 'nested traversal fault'),
              () => access.ensureDirectory('blocked/child', 'create traversal fault'),
              () => access.directoryIdentity('data/missing', 'identity traversal fault'),
            ]) {
              try { fail(); throw new Error('faulting traversal unexpectedly succeeded'); }
              catch (error) { if (error.message === 'faulting traversal unexpectedly succeeded') throw error; }
            }
            if (access.fileExists('data/missing/target.txt', 'existence traversal fault'))
              throw new Error('missing target unexpectedly exists');
          }
          const after = countFds();
          if (after !== before) throw new Error('directory traversal leaked descriptors: ' + before + ' -> ' + after);

          const fifo = path.join(root, 'no-writer.fifo');
          const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
          if (made.status !== 0) throw new Error(made.stderr || 'mkfifo failed');
          if (!access.fileExists('no-writer.fifo', 'FIFO existence')) throw new Error('FIFO was not found');
          try {
            access.readBytes('no-writer.fifo', 'FIFO read');
            throw new Error('FIFO read unexpectedly succeeded');
          } catch (error) {
            if (!/regular single-link file/.test(error.message)) throw error;
          }
        } finally {
          fs.rmSync(root, { recursive: true, force: true });
        }
      `;
      const child = spawnSync(process.execPath, ['--eval', script], {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5_000,
      });
      expect(child.error).toBeUndefined();
      expect(child.signal).toBeNull();
      expect(child.status).toBe(0);
    });

    test('performs descriptor-bound reads, creates, locks, and compare-reserve-replace', async () => {
      const repositoryRoot = temporaryRoot();
      const flushPath = path.join(repositoryRoot, 'flush-probe.txt'),
        displaced = flushPath + '.displaced';
      realFs.writeFileSync(flushPath, 'owned flush');
      const flushFd = trackedOpen(flushPath, realFs.constants.O_RDONLY);
      try {
        expect(() => simulatedFsync(flushFd)).not.toThrow();
        expect(realFs.readFileSync(flushPath, 'utf8')).toBe('owned flush');
        realFs.renameSync(flushPath, displaced);
        realFs.writeFileSync(flushPath, 'foreign replacement');
        if (originalPlatform.value === 'win32') expect(() => simulatedFsync(flushFd)).toThrow(/identity changed/);
        expect(realFs.readFileSync(flushPath, 'utf8')).toBe('foreign replacement');
        expect(realFs.readFileSync(displaced, 'utf8')).toBe('owned flush');
        if (originalPlatform.value === 'win32') {
          realFs.unlinkSync(flushPath);
          realFs.mkdirSync(flushPath);
          expect(() => simulatedFsync(flushFd)).toThrow(/not an owned private file/);
          expect(realFs.lstatSync(flushPath).isDirectory()).toBe(true);
          expect(realFs.readFileSync(displaced, 'utf8')).toBe('owned flush');
        }
      } finally {
        trackedClose(flushFd);
      }
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

    test('locks an existing payload without changing it and excludes other holders', async () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      const contender = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      access.writeExclusive('data/operation.json', '{"phase":"planned"}', 'operation');
      const payload = access.readBytes('data/operation.json', 'operation');
      const sidecar = path.join(repositoryRoot, 'data', 'operation.json.lock');
      expect(
        access.withExclusiveLock('data/operation.json', 'operation', () => {
          expect(realFs.existsSync(sidecar)).toBe(true);
          expect(() =>
            contender.withExclusiveLock('data/operation.json', 'nested operation', () => undefined),
          ).toThrow();
          return 'locked';
        }),
      ).toBe('locked');
      await access.withExclusiveLockAsync('data/operation.json', 'operation', async () => {
        await expect(
          contender.withExclusiveLockAsync('data/operation.json', 'contender', async () => undefined),
        ).rejects.toThrow();
        expect(access.readBytes('data/operation.json', 'operation')).toEqual(payload);
      });
      await expect(
        access.withExclusiveLockAsync('data/operation.json', 'throwing operation', async () => {
          throw new Error('operation failed');
        }),
      ).rejects.toThrow('operation failed');
      expect(realFs.existsSync(sidecar)).toBe(false);
      expect(access.readBytes('data/operation.json', 'operation')).toEqual(payload);
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

      const stale = path.join(repositoryRoot, 'data', 'stale.lock.lock');
      realFs.writeFileSync(stale, lockPayload(2_147_483_647));
      realFs.utimesSync(stale, old, old);
      expect(access.withExclusiveLock('data/stale.lock', 'stale lock', () => 'reclaimed')).toBe('reclaimed');

      const orphaned = path.join(repositoryRoot, 'data', 'orphaned.lock.lock');
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

      const recoverable = path.join(repositoryRoot, 'data', 'recoverable.lock.lock');
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

      const live = path.join(repositoryRoot, 'data', 'live.lock.lock');
      realFs.writeFileSync(live, lockPayload(process.pid));
      realFs.utimesSync(live, old, old);
      expect(() => access.withExclusiveLock('data/live.lock', 'live lock', () => undefined)).toThrow();
      realFs.rmSync(live, { force: true });

      const invalid = path.join(repositoryRoot, 'data', 'invalid.lock.lock');
      realFs.writeFileSync(invalid, lockPayload(0));
      realFs.utimesSync(invalid, old, old);
      expect(() => access.withExclusiveLock('data/invalid.lock', 'invalid lock', () => undefined)).toThrow(/owner/);
      realFs.rmSync(invalid, { force: true });

      const guarded = path.join(repositoryRoot, 'data', 'guarded.lock.lock');
      realFs.mkdirSync(guarded + '.reclaim');
      expect(() => access.withExclusiveLock('data/guarded.lock', 'guarded lock', () => undefined)).toThrow(/reclaim/);
      realFs.rmSync(guarded + '.reclaim', { recursive: true, force: true });

      const releaseBlocked = path.join(repositoryRoot, 'data', 'release-blocked.lock.lock');
      expect(
        access.withExclusiveLock('data/release-blocked.lock', 'release blocked', () => {
          realFs.mkdirSync(releaseBlocked + '.reclaim');
          return 'held';
        }),
      ).toBe('held');
      realFs.rmSync(releaseBlocked, { force: true });
      realFs.rmSync(releaseBlocked + '.reclaim', { recursive: true, force: true });

      const changedOwner = path.join(repositoryRoot, 'data', 'changed-owner.lock.lock');
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
      realFs.rmSync(path.join(repositoryRoot, 'data', 'nested.lock.lock'), { force: true });
    });

    test('keeps stale reclaim guards fail-closed when owner evidence is live, malformed, or mixed', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      const data = path.join(repositoryRoot, 'data');
      const old = new Date(Date.now() - 60_000);
      const staleLock = (name) => {
        const target = path.join(data, name + '.lock');
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
      const guardPath = path.join(repositoryRoot, 'data', 'unsafe.lock.lock.reclaim');
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
      expect(realFs.existsSync(path.join(repositoryRoot, 'data', 'unsafe.lock.lock'))).toBe(false);
    });

    test('rejects private backup inode substitution without overwriting the target', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      access.writeExclusive('data/clone.txt', 'before', 'clone source');
      replaceCloneTargetAfterSuccess = true;
      expect(() => access.replaceAtomic('data/clone.txt', hash('before'), 'after', 'clone')).toThrow(
        /identity changed|private backup content is not the expected original/,
      );
      expect(realFs.readFileSync(path.join(repositoryRoot, 'data', 'clone.txt'), 'utf8')).toBe('before');
      const backup = realFs.readdirSync(path.join(repositoryRoot, 'data')).find((name) => name.endsWith('.cas-old'));
      expect(realFs.readFileSync(path.join(repositoryRoot, 'data', backup), 'utf8')).toBe('foreign');
      expect(() => access.readText('data/clone.txt', 'unresolved clone backup')).toThrow();
    });

    for (const recovery of ['orphan', 'rollback']) {
      test(`preserves original backup when ${recovery} target is substituted after descriptor verification`, () => {
        const repositoryRoot = temporaryRoot();
        const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
        access.ensureDirectory('data', 'data directory');
        access.writeExclusive('data/fallback.txt', 'before', 'original');
        const data = path.join(repositoryRoot, 'data');
        if (recovery === 'orphan') {
          realFs.renameSync(
            path.join(data, 'fallback.txt'),
            path.join(data, '.fallback.txt.11111111-1111-4111-8111-111111111111.cas-old'),
          );
        } else {
          renameReplaceFailureMode = 'remove-target';
        }
        cloneUnavailableRemaining = 3;
        substituteRestoredTarget = true;
        expect(() => access.replaceAtomic('data/fallback.txt', hash('before'), 'after', 'restore race')).toThrow();
        expect(substituteRestoredTarget).toBe(false);
        expect(realFs.readFileSync(path.join(data, 'fallback.txt'), 'utf8')).toBe('foreign');
        const backups = realFs.readdirSync(data).filter((name) => name.endsWith('.cas-old'));
        expect(backups).toHaveLength(1);
        expect(realFs.readFileSync(path.join(data, backups[0]), 'utf8')).toBe('before');
        expect(() => access.readText('data/fallback.txt', 'unresolved recovery backup')).toThrow();
      });
    }

    test('copies without reflink using explicit offsets and completes partial writes', () => {
      const repositoryRoot = temporaryRoot();
      const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
      access.ensureDirectory('data', 'data directory');
      for (const code of ['EINVAL', 'ENOSYS', 'ENOTSUP', 'EOPNOTSUPP', 'EPERM', 'EXDEV']) {
        access.writeExclusive('data/fallback.txt', 'before', 'copy source');
        cloneUnavailableCode = code;
        cloneUnavailableRemaining = 1;
        shortCopyWrites = true;
        access.replaceAtomic('data/fallback.txt', hash('before'), 'after-copy', 'fallback');
        expect(access.readText('data/fallback.txt', 'copied file')).toBe('after-copy');
        access.removeFile('data/fallback.txt', 'copied file');
      }
      access.writeExclusive('data/fallback.txt', 'original', 'copy source');
      realFs.renameSync(
        path.join(repositoryRoot, 'data', 'fallback.txt'),
        path.join(repositoryRoot, 'data', '.fallback.txt.11111111-1111-4111-8111-111111111111.cas-old'),
      );
      cloneUnavailableRemaining = 2;
      access.replaceAtomic('data/fallback.txt', hash('original'), 'recovered-copy', 'fallback recovery');
      expect(access.readText('data/fallback.txt', 'recovered copy')).toBe('recovered-copy');
      expect(realFs.readdirSync(path.join(repositoryRoot, 'data'))).toEqual(['fallback.txt']);
    });

    test('cleans only its failed exclusive copies and preserves uncertain foreign or partial targets', () => {
      for (const mode of ['error', 'zero', 'foreign', 'cleanup-error']) {
        const repositoryRoot = temporaryRoot();
        const access = linuxSafe.requireSafeRepositoryAccess(repositoryRoot);
        access.ensureDirectory('data', 'data directory');
        access.writeExclusive('data/fallback.txt', 'before', 'copy source');
        cloneUnavailableRemaining = 2;
        copyWriteFault = mode === 'cleanup-error' ? 'error' : mode;
        copyCleanupFault = mode === 'cleanup-error';
        expect(() => access.replaceAtomic('data/fallback.txt', hash('before'), 'after', 'fallback')).toThrow();
        if (mode === 'error' || mode === 'zero') {
          expect(access.readText('data/fallback.txt', 'restored copy')).toBe('before');
          expect(realFs.readdirSync(path.join(repositoryRoot, 'data'))).toEqual(['fallback.txt']);
        } else {
          expect(realFs.readFileSync(path.join(repositoryRoot, 'data', 'fallback.txt'), 'utf8')).toBe('before');
          expect(() => access.readText('data/fallback.txt', 'unresolved private backup')).toThrow();
          const backup = realFs
            .readdirSync(path.join(repositoryRoot, 'data'))
            .find((name) => name.endsWith('.cas-old'));
          expect(backup).toBeDefined();
          expect(realFs.readFileSync(path.join(repositoryRoot, 'data', backup), 'utf8')).toBe(
            mode === 'foreign' ? 'foreign' : '',
          );
          expect(() => access.replaceAtomic('data/fallback.txt', hash('before'), 'after', 'uncertain recovery')).toThrow();
        }
      }
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

      access.writeExclusive('data/unlinked-temp.txt', 'before', 'prepublication substitution');
      substituteTargetBeforePublication = path.join(data, 'unlinked-temp.txt');
      expect(() => access.replaceAtomic('data/unlinked-temp.txt', hash('before'), 'after', 'prepublication substitution'))
        .toThrow(/path or content changed|orphan backup recovery is ambiguous/);
      expect(realFs.readFileSync(path.join(data, 'unlinked-temp.txt'), 'utf8')).toBe('foreign');
      expect(() => access.readText('data/unlinked-temp.txt', 'unresolved prepublication backup')).toThrow();
      const preservedBackup = realFs
        .readdirSync(data)
        .find((name) => name.startsWith('.unlinked-temp.txt.') && name.endsWith('.cas-old'));
      expect(realFs.readFileSync(path.join(data, preservedBackup), 'utf8')).toBe('before');

      access.writeExclusive('data/committed-before-error.txt', 'before', 'committed before error');
      renameReplaceFailureMode = 'after-effect';
      expect(() =>
        access.replaceAtomic('data/committed-before-error.txt', hash('before'), 'after', 'committed before error'),
      ).toThrow(/failed|simulated/);
      expect(access.readText('data/committed-before-error.txt', 'committed before error')).toBe('after');

      access.writeExclusive('data/restore-fails.txt', 'before', 'restore fails');
      failRecoveryCloneAfterRenameFailure = true;
      renameReplaceFailureMode = 'remove-target';
      expect(() => access.replaceAtomic('data/restore-fails.txt', hash('before'), 'after', 'restore fails')).toThrow(
        /simulated/,
      );
      expect(() => access.readText('data/restore-fails.txt', 'unresolved failed recovery')).toThrow();
      const failedRecoveryBackup = realFs
        .readdirSync(data)
        .find((name) => name.startsWith('.restore-fails.txt.') && name.endsWith('.cas-old'));
      expect(realFs.readFileSync(path.join(data, failedRecoveryBackup), 'utf8')).toBe('before');

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
