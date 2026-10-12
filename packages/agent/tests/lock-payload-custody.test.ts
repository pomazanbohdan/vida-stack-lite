import { afterAll, expect, mock, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isolated = process.env.LOCK_PAYLOAD_CUSTODY_ISOLATED === '1';
const underStryker = process.env.STRYKER_MUTATOR_WORKER !== undefined;
const linuxTest = test.skipIf(process.platform !== 'linux');

if (!isolated && !underStryker) {
  linuxTest(
    'runs lock payload custody cases in an isolated Bun process',
    () => {
      // This child runs the complete isolated pool; its process budget is not a per-test timeout.
      const child = spawnSync(process.execPath, ['test', '--timeout', '5000', fileURLToPath(import.meta.url)], {
        cwd: packageRoot,
        env: { ...process.env, LOCK_PAYLOAD_CUSTODY_ISOLATED: '1' },
        encoding: 'utf8',
        timeout: 120_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      if (child.status !== 0) console.error(`${child.stdout ?? ''}\n${child.stderr ?? ''}`);
      expect(child.error).toBeUndefined();
      expect(child.signal).toBeNull();
      expect(child.status).toBe(0);
      expect(`${child.stdout ?? ''}\n${child.stderr ?? ''}`).toContain('BUN_TEST_SUITE_COMPLETE:lock payload custody');
    },
    // Exception: the wrapper observes the entire child pool and its terminal receipt.
    150_000,
  );
} else {
  const fsModule = await import('node:fs');
  // Bun updates imported module namespaces when mock.module registers. Keep stable original callables.
  const actualFs = Object.freeze({ ...fsModule });
  const { mkdtempSync, rmSync, readFileSync, lstatSync, fstatSync, readlinkSync } = actualFs;
  const { tmpdir } = await import('node:os');
  const roots: string[] = [];
  const completedRoots = new Set<string>();
  let payloadLockPath: string | undefined;
  let payloadRootPath: string | undefined;
  let reclaimGuardOwnerPath: string | undefined;
  let failPayloadFsync = false;
  let payloadFsyncCount = 0;
  let failedPayloadFd: number | undefined;
  let ownedLockFd: number | undefined;
  let ownedParentFd: number | undefined;
  let failReclaimGuardFsync = false;
  let reclaimGuardFsyncCount = 0;
  let reclaimGuardFsyncFailure: Error | undefined;
  let releaseCallbackSettled = false;
  let reclaimGuardFsyncSawSettledCallback = false;
  const payloadFailure = Object.assign(new Error('injected lock payload fsync failure'), { code: 'EIO' });
  const payloadCloseFailure = Object.assign(new Error('injected lock payload close failure'), { code: 'EIO' });
  let failPayloadClose = false;
  type DescriptorIdentity = { readonly dev: bigint; readonly ino: bigint };
  const ownedDescriptorIdentities = new Map<number, DescriptorIdentity>();
  const outstandingCloseFailures = new Map<number, DescriptorIdentity>();
  const ownedLockCloseFailure = Object.assign(new Error('injected owned lock close failure'), { code: 'EIO' });
  const ownedParentCloseFailure = Object.assign(new Error('injected owned parent close failure'), { code: 'EIO' });
  let failOwnedLockClose = false;
  let failOwnedParentClose = false;
  let ownedLockCloseValue: unknown = ownedLockCloseFailure;
  const ownedCloseAttempts: number[] = [];
  let watchedReclaimGuardPath: string | undefined;
  let watchReclaimGuardMkdir = false;
  let watchedReclaimGuardMkdirAttempts = 0;
  let postDeleteFsyncRoot: string | undefined;
  let postDeleteFsyncQuarantine: { readonly prefix: string; readonly suffix: string } | undefined;
  let postDeleteRemovalObserved = false;
  let postDeleteFsyncFailure: Error | undefined;
  let postDeleteFsyncCount = 0;

  function isWatchedReclaimGuardDirectory(directory: string | Buffer | URL): boolean {
    if (!watchedReclaimGuardPath || typeof directory !== 'string') return false;
    if (path.basename(directory) !== path.basename(watchedReclaimGuardPath)) return false;
    const parent = path.dirname(directory);
    if (parent === path.dirname(watchedReclaimGuardPath)) return true;
    try {
      return readlinkSync(parent) === path.dirname(watchedReclaimGuardPath);
    } catch {
      return false;
    }
  }

  function observeQuarantineRemoval(removedPath: string | Buffer | URL): void {
    if (!postDeleteFsyncRoot || !postDeleteFsyncQuarantine || typeof removedPath !== 'string') return;
    let parentPath = path.dirname(removedPath);
    try {
      parentPath = readlinkSync(parentPath);
    } catch {
      // A direct path already names its actual parent.
    }
    const basename = path.basename(removedPath);
    if (
      parentPath === postDeleteFsyncRoot &&
      basename.startsWith(postDeleteFsyncQuarantine.prefix) &&
      basename.endsWith(postDeleteFsyncQuarantine.suffix)
    )
      postDeleteRemovalObserved = true;
  }

  void mock.module('node:fs', () => ({
    ...actualFs,
    unlinkSync(...args: Parameters<typeof actualFs.unlinkSync>): ReturnType<typeof actualFs.unlinkSync> {
      const result = actualFs.unlinkSync(...args);
      observeQuarantineRemoval(args[0]);
      return result;
    },
    rmdirSync(...args: Parameters<typeof actualFs.rmdirSync>): ReturnType<typeof actualFs.rmdirSync> {
      const result = actualFs.rmdirSync(...args);
      observeQuarantineRemoval(args[0]);
      return result;
    },
    mkdirSync(...args: Parameters<typeof actualFs.mkdirSync>): ReturnType<typeof actualFs.mkdirSync> {
      const [directory] = args;
      if (watchReclaimGuardMkdir && isWatchedReclaimGuardDirectory(directory)) watchedReclaimGuardMkdirAttempts += 1;
      return actualFs.mkdirSync(...args);
    },
    openSync(file: string | Buffer | URL, flags: number | string, mode?: number | string): number {
      const fd = actualFs.openSync(file, flags, mode);
      const descriptorPath = readlinkSync(`/proc/self/fd/${fd}`);
      if (payloadLockPath && descriptorPath === payloadLockPath && ownedLockFd === undefined) {
        ownedLockFd = fd;
        ownedDescriptorIdentities.set(fd, descriptorIdentity(fd));
      }
      if (
        payloadRootPath &&
        descriptorPath === payloadRootPath &&
        actualFs.fstatSync(fd).isDirectory() &&
        ownedParentFd === undefined
      ) {
        ownedParentFd = fd;
        ownedDescriptorIdentities.set(fd, descriptorIdentity(fd));
      }
      return fd;
    },
    closeSync(fd: number): void {
      if (fd === ownedLockFd || fd === ownedParentFd) {
        ownedCloseAttempts.push(fd);
        if (fd === ownedLockFd && failOwnedLockClose) {
          failOwnedLockClose = false;
          outstandingCloseFailures.set(fd, descriptorIdentity(fd));
          throw ownedLockCloseValue;
        }
        if (fd === ownedParentFd && failOwnedParentClose) {
          failOwnedParentClose = false;
          outstandingCloseFailures.set(fd, descriptorIdentity(fd));
          throw ownedParentCloseFailure;
        }
      }
      const descriptorPath = readlinkSync(`/proc/self/fd/${fd}`);
      if (payloadLockPath && descriptorPath === payloadLockPath && failPayloadClose) {
        failPayloadClose = false;
        failedPayloadFd = fd;
        outstandingCloseFailures.set(fd, descriptorIdentity(fd));
        throw payloadCloseFailure;
      }
      actualFs.closeSync(fd);
    },
    fsyncSync(fd: number): void {
      const descriptorPath = readlinkSync(`/proc/self/fd/${fd}`);
      if (postDeleteFsyncRoot && descriptorPath === postDeleteFsyncRoot && postDeleteRemovalObserved) {
        postDeleteFsyncCount += 1;
        postDeleteRemovalObserved = false;
        const error = postDeleteFsyncFailure;
        if (!error) throw new Error('post-delete fsync fault was armed without its error');
        throw error;
      }
      if (reclaimGuardOwnerPath && descriptorPath === reclaimGuardOwnerPath) {
        reclaimGuardFsyncCount += 1;
        if (failReclaimGuardFsync) {
          failReclaimGuardFsync = false;
          reclaimGuardFsyncSawSettledCallback = releaseCallbackSettled;
          const error = reclaimGuardFsyncFailure;
          if (!error) throw new Error('release fsync fault was armed without its error');
          throw error;
        }
      }
      if (payloadLockPath && descriptorPath === payloadLockPath) {
        payloadFsyncCount += 1;
        if (failPayloadFsync) {
          failPayloadFsync = false;
          failedPayloadFd = fd;
          throw payloadFailure;
        }
      }
      actualFs.fsyncSync(fd);
    },
  }));

  const { requireSafeRepositoryAccess, SafeRepositoryLockContentionError } =
    await import('../src/config/safe-repository-access.js');

  function freshRoot(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-lock-payload-custody-'));
    roots.push(root);
    return root;
  }

  function lockPath(root: string): string {
    // withExclusiveLock appends the sidecar suffix to its resource name.
    return path.join(root, 'owner.lock.lock');
  }

  function armReleaseFsync(root: string): void {
    payloadLockPath = lockPath(root);
    payloadRootPath = root;
    reclaimGuardOwnerPath = path.join(root, 'owner.lock.lock.reclaim', 'owner.json');
    payloadFsyncCount = 0;
    ownedLockFd = undefined;
    ownedParentFd = undefined;
    reclaimGuardFsyncFailure = Object.assign(new Error('injected reclaim guard owner fsync failure'), { code: 'EIO' });
    reclaimGuardFsyncCount = 0;
    failReclaimGuardFsync = true;
    releaseCallbackSettled = false;
    reclaimGuardFsyncSawSettledCallback = false;
  }

  function armPostDeleteFsync(root: string, quarantinePrefix: string, quarantineSuffix: string): Error {
    postDeleteFsyncRoot = root;
    postDeleteFsyncQuarantine = { prefix: quarantinePrefix, suffix: quarantineSuffix };
    postDeleteRemovalObserved = false;
    postDeleteFsyncCount = 0;
    postDeleteFsyncFailure = Object.assign(new Error('injected parent fsync after quarantine removal'), {
      code: 'EIO',
    });
    return postDeleteFsyncFailure;
  }

  function expectClosedWithEbafd(fd: number): void {
    let descriptorError: unknown;
    try {
      fstatSync(fd);
    } catch (error) {
      descriptorError = error;
    }
    const descriptorErrorCode =
      typeof descriptorError === 'object' && descriptorError !== null && 'code' in descriptorError
        ? descriptorError.code
        : undefined;
    expect(descriptorErrorCode).toBe('EBADF');
  }

  function descriptorIdentity(fd: number): DescriptorIdentity {
    const stats = actualFs.fstatSync(fd, { bigint: true });
    return { dev: stats.dev, ino: stats.ino };
  }

  function closeOnlyCapturedDescriptor(fd: number | undefined, expectedPath: string): void {
    if (fd === undefined) return;
    let actualPath: string;
    try {
      actualPath = readlinkSync(`/proc/self/fd/${fd}`);
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 'EBADF' || code === 'ENOENT') return;
      throw error;
    }
    const retainedIdentity = outstandingCloseFailures.get(fd);
    if (retainedIdentity) {
      const current = descriptorIdentity(fd);
      if (current.dev !== retainedIdentity.dev || current.ino !== retainedIdentity.ino) {
        throw new Error('Captured fixture descriptor inode changed before cleanup');
      }
    } else if (actualPath !== expectedPath && actualPath !== expectedPath + ' (deleted)') {
      throw new Error('Captured fixture descriptor path changed before cleanup');
    }
    actualFs.closeSync(fd);
    outstandingCloseFailures.delete(fd);
  }

  function resetOwnedCloseCase(root: string): void {
    payloadLockPath = lockPath(root);
    payloadRootPath = root;
    ownedLockFd = undefined;
    ownedParentFd = undefined;
    ownedCloseAttempts.length = 0;
    ownedDescriptorIdentities.clear();
    failOwnedLockClose = false;
    failOwnedParentClose = false;
    ownedLockCloseValue = ownedLockCloseFailure;
    failPayloadClose = false;
    failPayloadFsync = false;
    failReclaimGuardFsync = false;
  }

  function expectRetainedLock(
    root: string,
    label: string,
    beforeBytes: Buffer | undefined,
    beforeIdentity: { readonly dev: bigint; readonly ino: bigint } | undefined,
  ): void {
    const target = lockPath(root);
    const bytes = readFileSync(target);
    expect(bytes).toEqual(
      Buffer.from(JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: process.pid, label })),
    );
    expect(beforeBytes).toBeDefined();
    expect(beforeIdentity).toBeDefined();
    if (!beforeBytes || !beforeIdentity) throw new Error('owned lock beforeimage was not captured');
    expect(Buffer.from(bytes)).toEqual(Buffer.from(beforeBytes));
    const afterIdentity = lstatSync(target, { bigint: true });
    expect(afterIdentity.dev).toBe(beforeIdentity.dev);
    expect(afterIdentity.ino).toBe(beforeIdentity.ino);
  }

  linuxTest('failed first payload flush closes its descriptor and retains the exclusive lock without replay', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');

    payloadLockPath = lockPath(root);
    payloadFsyncCount = 0;
    failedPayloadFd = undefined;
    failPayloadFsync = true;
    let callbackCalls = 0;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', 'payload custody failure', () => {
        callbackCalls += 1;
        throw new Error('callback must not run after payload fsync failure');
      });
    } catch (error) {
      observedError = error;
    }
    expect(observedError).toBe(payloadFailure);
    expect(callbackCalls).toBe(0);
    expect(payloadFsyncCount).toBe(1);

    const descriptor = failedPayloadFd;
    expect(descriptor).toBeDefined();
    if (descriptor === undefined) throw new Error('payload fsync descriptor was not captured');
    let descriptorError: unknown;
    try {
      fstatSync(descriptor);
    } catch (error) {
      descriptorError = error;
    }
    expect(descriptorError).toBeDefined();
    const descriptorErrorCode =
      typeof descriptorError === 'object' && descriptorError !== null && 'code' in descriptorError
        ? descriptorError.code
        : undefined;
    expect(descriptorErrorCode).toBe('EBADF');

    const beforeBytes = readFileSync(payloadLockPath);
    expect(beforeBytes).toEqual(
      Buffer.from(
        JSON.stringify({
          schema: 'SafeRepositoryAccessLock/v1',
          owner_pid: process.pid,
          label: 'payload custody failure',
        }),
      ),
    );
    const beforeIdentity = lstatSync(payloadLockPath, { bigint: true });
    let replayed = 0;
    expect(() => access.withExclusiveLock('owner.lock', 'replay attempt', () => ++replayed)).toThrow();
    expect(replayed).toBe(0);
    expect(readFileSync(payloadLockPath)).toEqual(beforeBytes);
    const afterIdentity = lstatSync(payloadLockPath, { bigint: true });
    expect(afterIdentity.dev).toBe(beforeIdentity.dev);
    expect(afterIdentity.ino).toBe(beforeIdentity.ino);
    completedRoots.add(root);
  });

  linuxTest('successful public lock acquisition fsyncs the sidecar once, calls once, then releases it', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');

    payloadLockPath = lockPath(root);
    payloadFsyncCount = 0;
    failPayloadFsync = false;
    let calls = 0;
    expect(access.withExclusiveLock('owner.lock', 'successful payload', () => ++calls)).toBe(1);
    expect(calls).toBe(1);
    expect(payloadFsyncCount).toBe(1);
    expect(actualFs.existsSync(payloadLockPath)).toBe(false);
    completedRoots.add(root);
  });

  linuxTest('a nested contender does not create a reclaim guard for the current owner lock', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');
    const target = lockPath(root);
    watchedReclaimGuardPath = target + '.reclaim';
    watchedReclaimGuardMkdirAttempts = 0;
    let ownerCalls = 0;
    let contenderCalls = 0;
    let contenderError: unknown;

    expect(
      access.withExclusiveLock('owner.lock', 'young owned lock', () => {
        ownerCalls += 1;
        const before = actualFs.lstatSync(target, { bigint: true });
        expect(before.isFile()).toBe(true);
        expect(Date.now() - Number(before.mtimeMs) < 30_000).toBe(true);
        expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual({
          schema: 'SafeRepositoryAccessLock/v1',
          owner_pid: process.pid,
          label: 'young owned lock',
        });

        watchReclaimGuardMkdir = true;
        try {
          access.withExclusiveLock('owner.lock', 'nested contender', () => {
            contenderCalls += 1;
          });
        } catch (error) {
          contenderError = error;
        } finally {
          watchReclaimGuardMkdir = false;
        }

        expect(contenderError).toBeInstanceOf(SafeRepositoryLockContentionError);
        expect(contenderCalls).toBe(0);
        expect(watchedReclaimGuardMkdirAttempts).toBe(0);
        const after = actualFs.lstatSync(target, { bigint: true });
        expect(after.dev).toBe(before.dev);
        expect(after.ino).toBe(before.ino);
        return 'owner released';
      }),
    ).toBe('owner released');

    expect(ownerCalls).toBe(1);
    expect(actualFs.existsSync(target)).toBe(false);
    expect(access.withExclusiveLock('owner.lock', 'fresh admission', () => 'admitted')).toBe('admitted');
    expect(actualFs.existsSync(target)).toBe(false);
    completedRoots.add(root);
  });

  linuxTest('fresh, malformed, and nonempty reclaim guards stay in place without namespace mutation', () => {
    const cases = [
      { owner: 'live', aged: false, extraEntry: false },
      { owner: 'live', aged: true, extraEntry: false },
      { owner: 'dead', aged: false, extraEntry: false },
      { owner: 'malformed', aged: true, extraEntry: false },
      { owner: 'dead', aged: true, extraEntry: true },
    ];

    for (const entry of cases) {
      const root = freshRoot();
      const access = requireSafeRepositoryAccess(root);
      expect(access.provider).toBe('linux-proc-fd');
      const guardPath = lockPath(root) + '.reclaim';
      const ownerPath = path.join(guardPath, 'owner.json');
      actualFs.mkdirSync(guardPath, 0o700);
      const ownerBytes =
        entry.owner === 'malformed'
          ? '{malformed'
          : JSON.stringify({
              schema: 'SafeRepositoryAccessReclaimGuard/v1',
              owner_pid: entry.owner === 'live' ? process.pid : 2_147_483_647,
              owner_token: '00000000-0000-4000-8000-000000000000',
              acquired_at: new Date().toISOString(),
            });
      actualFs.writeFileSync(ownerPath, ownerBytes);
      if (entry.extraEntry) actualFs.writeFileSync(path.join(guardPath, 'retain.txt'), 'retained');
      if (entry.aged) {
        actualFs.utimesSync(ownerPath, new Date(0), new Date(0));
        actualFs.utimesSync(guardPath, new Date(0), new Date(0));
      }

      // A successful quarantine rename changes the parent's mtime even when cleanup restores the same inode.
      const stableParentTime = new Date(1_600_000_000_000);
      actualFs.utimesSync(root, stableParentTime, stableParentTime);
      const parentBefore = actualFs.statSync(root, { bigint: true });
      const guardBefore = lstatSync(guardPath, { bigint: true });
      let callbackCalls = 0;
      expect(() =>
        access.withExclusiveLock('owner.lock', 'ineligible reclaim guard', () => {
          callbackCalls += 1;
        }),
      ).toThrow(SafeRepositoryLockContentionError);

      const guardAfter = lstatSync(guardPath, { bigint: true });
      const parentAfter = actualFs.statSync(root, { bigint: true });
      expect(callbackCalls).toBe(0);
      expect(guardAfter.dev).toBe(guardBefore.dev);
      expect(guardAfter.ino).toBe(guardBefore.ino);
      expect(parentAfter.mtimeNs).toBe(parentBefore.mtimeNs);
      expect(actualFs.readFileSync(ownerPath, 'utf8')).toBe(ownerBytes);
      expect(actualFs.readdirSync(root)).toEqual([path.basename(guardPath)]);
      expect(actualFs.readdirSync(guardPath).sort()).toEqual(
        entry.extraEntry ? ['owner.json', 'retain.txt'] : ['owner.json'],
      );
      completedRoots.add(root);
    }
  });

  linuxTest('payload fsync and cleanup close failures preserve both errors and retain the owned lock', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');

    payloadLockPath = lockPath(root);
    payloadFsyncCount = 0;
    failedPayloadFd = undefined;
    failPayloadFsync = true;
    failPayloadClose = true;
    let callbackCalls = 0;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', 'payload and close failure', () => {
        callbackCalls += 1;
      });
    } catch (error) {
      observedError = error;
    }

    const descriptor = failedPayloadFd;
    expect(descriptor).toBeDefined();
    if (descriptor === undefined) throw new Error('failed payload descriptor was not captured');
    let assertionsPassed = false;
    try {
      expect(observedError).toBeInstanceOf(AggregateError);
      if (!(observedError instanceof AggregateError)) throw new Error('lock setup did not aggregate cleanup failure');
      expect(observedError.errors).toHaveLength(2);
      expect(observedError.errors[0]).toBe(payloadFailure);
      expect(observedError.errors[1]).toBe(payloadCloseFailure);
      expect(callbackCalls).toBe(0);
      expect(payloadFsyncCount).toBe(1);
      expect(readlinkSync('/proc/self/fd/' + String(descriptor))).toBe(payloadLockPath);

      const beforeBytes = readFileSync(payloadLockPath);
      expect(beforeBytes).toEqual(
        Buffer.from(
          JSON.stringify({
            schema: 'SafeRepositoryAccessLock/v1',
            owner_pid: process.pid,
            label: 'payload and close failure',
          }),
        ),
      );
      const beforeIdentity = lstatSync(payloadLockPath, { bigint: true });
      let replayed = 0;
      expect(() => access.withExclusiveLock('owner.lock', 'after close failure', () => ++replayed)).toThrow();
      expect(replayed).toBe(0);
      expect(readFileSync(payloadLockPath)).toEqual(beforeBytes);
      const afterIdentity = lstatSync(payloadLockPath, { bigint: true });
      expect(afterIdentity.dev).toBe(beforeIdentity.dev);
      expect(afterIdentity.ino).toBe(beforeIdentity.ino);
      assertionsPassed = true;
    } finally {
      // Test teardown closes the deliberately still-open descriptor without retrying production cleanup.
      if (outstandingCloseFailures.delete(descriptor)) actualFs.closeSync(descriptor);
    }
    if (assertionsPassed) completedRoots.add(root);
  });

  linuxTest('sync release flush failure preserves the lock and closes both owned descriptors', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');
    armReleaseFsync(root);

    const label = 'sync release flush failure';
    const releaseError = reclaimGuardFsyncFailure;
    if (!releaseError) throw new Error('release fsync fault was not prepared');
    let callbackCalls = 0;
    let beforeBytes: Buffer | undefined;
    let beforeIdentity: { readonly dev: bigint; readonly ino: bigint } | undefined;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', label, () => {
        callbackCalls += 1;
        beforeBytes = readFileSync(lockPath(root));
        beforeIdentity = lstatSync(lockPath(root), { bigint: true });
        releaseCallbackSettled = true;
        return 'sync callback complete';
      });
    } catch (error) {
      observedError = error;
    }

    const lockFd = ownedLockFd;
    const parentFd = ownedParentFd;
    let assertionsPassed = false;
    try {
      expect(observedError).toBe(releaseError);
      expect(callbackCalls).toBe(1);
      expect(reclaimGuardFsyncCount).toBe(1);
      expect(reclaimGuardFsyncSawSettledCallback).toBe(true);
      expect(lockFd).toBeDefined();
      expect(parentFd).toBeDefined();
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned lock descriptors were not captured');
      expect(lockFd).not.toBe(parentFd);
      expectClosedWithEbafd(lockFd);
      expectClosedWithEbafd(parentFd);
      expectRetainedLock(root, label, beforeBytes, beforeIdentity);
      assertionsPassed = true;
    } finally {
      closeOnlyCapturedDescriptor(lockFd, lockPath(root));
      closeOnlyCapturedDescriptor(parentFd, root);
    }
    if (assertionsPassed) completedRoots.add(root);
  });

  linuxTest('sync release failure aggregates its exact error with the callback error', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');
    armReleaseFsync(root);

    const label = 'sync callback and release failure';
    const callbackError = new Error('sync operation sentinel');
    const releaseError = reclaimGuardFsyncFailure;
    if (!releaseError) throw new Error('release fsync fault was not prepared');
    let callbackCalls = 0;
    let beforeBytes: Buffer | undefined;
    let beforeIdentity: { readonly dev: bigint; readonly ino: bigint } | undefined;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', label, () => {
        callbackCalls += 1;
        beforeBytes = readFileSync(lockPath(root));
        beforeIdentity = lstatSync(lockPath(root), { bigint: true });
        releaseCallbackSettled = true;
        throw callbackError;
      });
    } catch (error) {
      observedError = error;
    }

    const lockFd = ownedLockFd;
    const parentFd = ownedParentFd;
    let assertionsPassed = false;
    try {
      expect(observedError).toBeInstanceOf(AggregateError);
      if (!(observedError instanceof AggregateError))
        throw new Error('callback and release errors were not aggregated');
      expect(observedError.errors).toHaveLength(2);
      expect(observedError.errors.some((error) => error === callbackError)).toBe(true);
      expect(observedError.errors.some((error) => error === releaseError)).toBe(true);
      expect(callbackCalls).toBe(1);
      expect(reclaimGuardFsyncCount).toBe(1);
      expect(reclaimGuardFsyncSawSettledCallback).toBe(true);
      expect(lockFd).toBeDefined();
      expect(parentFd).toBeDefined();
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned lock descriptors were not captured');
      expect(lockFd).not.toBe(parentFd);
      expectClosedWithEbafd(lockFd);
      expectClosedWithEbafd(parentFd);
      expectRetainedLock(root, label, beforeBytes, beforeIdentity);
      assertionsPassed = true;
    } finally {
      closeOnlyCapturedDescriptor(lockFd, lockPath(root));
      closeOnlyCapturedDescriptor(parentFd, root);
    }
    if (assertionsPassed) completedRoots.add(root);
  });

  linuxTest('async release flush failure waits for callback settlement and closes both owned descriptors', async () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');
    armReleaseFsync(root);

    const label = 'async release flush failure';
    const releaseError = reclaimGuardFsyncFailure;
    if (!releaseError) throw new Error('release fsync fault was not prepared');
    let callbackCalls = 0;
    let beforeBytes: Buffer | undefined;
    let beforeIdentity: { readonly dev: bigint; readonly ino: bigint } | undefined;
    let observedError: unknown;
    try {
      await access.withExclusiveLockAsync('owner.lock', label, async () => {
        callbackCalls += 1;
        await Promise.resolve();
        beforeBytes = readFileSync(lockPath(root));
        beforeIdentity = lstatSync(lockPath(root), { bigint: true });
        releaseCallbackSettled = true;
        return 'async callback complete';
      });
    } catch (error) {
      observedError = error;
    }

    const lockFd = ownedLockFd;
    const parentFd = ownedParentFd;
    let assertionsPassed = false;
    try {
      expect(observedError).toBe(releaseError);
      expect(callbackCalls).toBe(1);
      expect(reclaimGuardFsyncCount).toBe(1);
      expect(reclaimGuardFsyncSawSettledCallback).toBe(true);
      expect(lockFd).toBeDefined();
      expect(parentFd).toBeDefined();
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned lock descriptors were not captured');
      expect(lockFd).not.toBe(parentFd);
      expectClosedWithEbafd(lockFd);
      expectClosedWithEbafd(parentFd);
      expectRetainedLock(root, label, beforeBytes, beforeIdentity);
      assertionsPassed = true;
    } finally {
      closeOnlyCapturedDescriptor(lockFd, lockPath(root));
      closeOnlyCapturedDescriptor(parentFd, root);
    }
    if (assertionsPassed) completedRoots.add(root);
  });

  linuxTest('stale reclaim-guard post-delete fsync preserves its EIO without reporting failed restoration', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    const guardPath = lockPath(root) + '.reclaim';
    const ownerPath = path.join(guardPath, 'owner.json');
    actualFs.mkdirSync(guardPath, 0o700);
    actualFs.writeFileSync(
      ownerPath,
      JSON.stringify({
        schema: 'SafeRepositoryAccessReclaimGuard/v1',
        owner_pid: 2_147_483_647,
        owner_token: '00000000-0000-4000-8000-000000000000',
        acquired_at: new Date(0).toISOString(),
      }),
    );
    actualFs.utimesSync(ownerPath, new Date(0), new Date(0));
    actualFs.utimesSync(guardPath, new Date(0), new Date(0));
    const failure = armPostDeleteFsync(root, '.' + path.basename(guardPath) + '.', '.reclaimed');
    let callbackCalls = 0;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', 'post-delete stale guard fsync', () => {
        callbackCalls += 1;
        return 'must not acquire';
      });
    } catch (error) {
      observedError = error;
    }

    expect(observedError).toBe(failure);
    expect(observedError).toMatchObject({ code: 'EIO' });
    expect(observedError).not.toHaveProperty('name', 'SafeRepositoryLockRestoreError');
    expect(postDeleteFsyncCount).toBe(1);
    expect(callbackCalls).toBe(0);
    expect(actualFs.existsSync(guardPath)).toBe(false);
    expect(actualFs.readdirSync(root)).toEqual([]);
    completedRoots.add(root);
  });

  linuxTest('stale lock post-delete fsync preserves its EIO and leaves the removed lock absent', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    const target = lockPath(root);
    actualFs.writeFileSync(
      target,
      JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: 2_147_483_647, label: 'stale lock' }),
    );
    actualFs.utimesSync(target, new Date(0), new Date(0));
    const failure = armPostDeleteFsync(root, '.' + path.basename(target) + '.', '.reclaimed');
    let callbackCalls = 0;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', 'post-delete stale lock fsync', () => {
        callbackCalls += 1;
        return 'must not acquire';
      });
    } catch (error) {
      observedError = error;
    }

    expect(observedError).toBe(failure);
    expect(observedError).toMatchObject({ code: 'EIO' });
    expect(observedError).not.toHaveProperty('name', 'SafeRepositoryLockRestoreError');
    expect(postDeleteFsyncCount).toBe(1);
    expect(callbackCalls).toBe(0);
    expect(actualFs.existsSync(target)).toBe(false);
    expect(actualFs.readdirSync(root)).toEqual([]);
    completedRoots.add(root);
  });

  linuxTest('release-guard post-delete fsync preserves EIO after one successful callback', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    const guardPath = lockPath(root) + '.reclaim';
    const failure = armPostDeleteFsync(root, '.' + path.basename(guardPath) + '.', '.released');
    let callbackCalls = 0;
    let result: unknown;
    let observedError: unknown;
    try {
      result = access.withExclusiveLock('owner.lock', 'post-delete release guard fsync', () => {
        callbackCalls += 1;
        return 'callback result is withheld by failed durability confirmation';
      });
    } catch (error) {
      observedError = error;
    }

    expect(observedError).toBe(failure);
    expect(observedError).toMatchObject({ code: 'EIO' });
    expect(observedError).not.toHaveProperty('name', 'SafeRepositoryLockRestoreError');
    expect(postDeleteFsyncCount).toBe(1);
    expect(callbackCalls).toBe(1);
    expect(result).toBeUndefined();
    expect(actualFs.existsSync(lockPath(root))).toBe(false);
    expect(actualFs.existsSync(guardPath)).toBe(false);
    expect(actualFs.readdirSync(root)).toEqual([]);
    completedRoots.add(root);
  });

  linuxTest('sync and async callback throw undefined remains a thrown outcome', async () => {
    for (const mode of ['sync', 'async'] as const) {
      const root = freshRoot();
      const access = requireSafeRepositoryAccess(root);
      resetOwnedCloseCase(root);
      let calls = 0;
      let didThrow = false;
      let observedError: unknown;
      try {
        if (mode === 'sync') {
          access.withExclusiveLock('owner.lock', 'sync undefined callback', () => {
            calls += 1;
            throw undefined;
          });
        } else {
          await access.withExclusiveLockAsync('owner.lock', 'async undefined callback', async () => {
            calls += 1;
            await Promise.resolve();
            throw undefined;
          });
        }
      } catch (error) {
        didThrow = true;
        observedError = error;
      }
      const lockFd = ownedLockFd;
      const parentFd = ownedParentFd;
      expect(didThrow).toBe(true);
      expect(observedError).toBeUndefined();
      expect(calls).toBe(1);
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned descriptors were not captured');
      expectClosedWithEbafd(lockFd);
      expectClosedWithEbafd(parentFd);
      expect(ownedCloseAttempts).toEqual([lockFd, parentFd]);
      expect(actualFs.existsSync(lockPath(root))).toBe(false);
      completedRoots.add(root);
    }
  });

  linuxTest('lock close EIO preserves its identity and still attempts parent close', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    resetOwnedCloseCase(root);
    let calls = 0;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', 'lock close EIO', () => {
        calls += 1;
        failOwnedLockClose = true;
      });
    } catch (error) {
      observedError = error;
    }
    const lockFd = ownedLockFd;
    const parentFd = ownedParentFd;
    let passed = false;
    try {
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned descriptors were not captured');
      expect(observedError).toBe(ownedLockCloseFailure);
      expect(calls).toBe(1);
      expect(ownedCloseAttempts).toEqual([lockFd, parentFd]);
      expect<DescriptorIdentity | undefined>(descriptorIdentity(lockFd)).toEqual(ownedDescriptorIdentities.get(lockFd));
      expectClosedWithEbafd(parentFd);
      expect(actualFs.existsSync(lockPath(root))).toBe(false);
      passed = true;
    } finally {
      closeOnlyCapturedDescriptor(lockFd, lockPath(root));
      closeOnlyCapturedDescriptor(parentFd, root);
    }
    if (passed) completedRoots.add(root);
  });

  linuxTest('parent close EIO preserves its identity after lock close', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    resetOwnedCloseCase(root);
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', 'parent close EIO', () => {
        failOwnedParentClose = true;
      });
    } catch (error) {
      observedError = error;
    }
    const lockFd = ownedLockFd;
    const parentFd = ownedParentFd;
    let passed = false;
    try {
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned descriptors were not captured');
      expect(observedError).toBe(ownedParentCloseFailure);
      expect(ownedCloseAttempts).toEqual([lockFd, parentFd]);
      expectClosedWithEbafd(lockFd);
      expect(readlinkSync(`/proc/self/fd/${parentFd}`)).toBe(root);
      expect(actualFs.existsSync(lockPath(root))).toBe(false);
      passed = true;
    } finally {
      closeOnlyCapturedDescriptor(lockFd, lockPath(root));
      closeOnlyCapturedDescriptor(parentFd, root);
    }
    if (passed) completedRoots.add(root);
  });

  linuxTest('cleanup throw undefined remains a thrown outcome and parent close still runs', () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    resetOwnedCloseCase(root);
    let didThrow = false;
    let observedError: unknown;
    try {
      access.withExclusiveLock('owner.lock', 'undefined close failure', () => {
        ownedLockCloseValue = undefined;
        failOwnedLockClose = true;
      });
    } catch (error) {
      didThrow = true;
      observedError = error;
    }
    const lockFd = ownedLockFd;
    const parentFd = ownedParentFd;
    let passed = false;
    try {
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned descriptors were not captured');
      expect(didThrow).toBe(true);
      expect(observedError).toBeUndefined();
      expect(ownedCloseAttempts).toEqual([lockFd, parentFd]);
      expect<DescriptorIdentity | undefined>(descriptorIdentity(lockFd)).toEqual(ownedDescriptorIdentities.get(lockFd));
      expectClosedWithEbafd(parentFd);
      passed = true;
    } finally {
      closeOnlyCapturedDescriptor(lockFd, lockPath(root));
      closeOnlyCapturedDescriptor(parentFd, root);
    }
    if (passed) completedRoots.add(root);
  });

  linuxTest('async callback release and both close failures preserve all causes in order', async () => {
    const root = freshRoot();
    const access = requireSafeRepositoryAccess(root);
    resetOwnedCloseCase(root);
    armReleaseFsync(root);
    const label = 'async callback release and close failures';
    const callbackError = new Error('async operation sentinel');
    const releaseError = reclaimGuardFsyncFailure;
    if (!releaseError) throw new Error('release fsync fault was not prepared');
    let calls = 0;
    let beforeBytes: Buffer | undefined;
    let beforeIdentity: { readonly dev: bigint; readonly ino: bigint } | undefined;
    let observedError: unknown;
    try {
      await access.withExclusiveLockAsync('owner.lock', label, async () => {
        calls += 1;
        await Promise.resolve();
        beforeBytes = readFileSync(lockPath(root));
        beforeIdentity = lstatSync(lockPath(root), { bigint: true });
        releaseCallbackSettled = true;
        failOwnedLockClose = true;
        failOwnedParentClose = true;
        throw callbackError;
      });
    } catch (error) {
      observedError = error;
    }
    const lockFd = ownedLockFd;
    const parentFd = ownedParentFd;
    let passed = false;
    try {
      if (lockFd === undefined || parentFd === undefined) throw new Error('owned descriptors were not captured');
      expect(observedError).toBeInstanceOf(AggregateError);
      if (!(observedError instanceof AggregateError))
        throw new Error('operation and cleanup errors were not aggregated');
      expect(observedError.errors).toEqual([
        callbackError,
        releaseError,
        ownedLockCloseFailure,
        ownedParentCloseFailure,
      ]);
      expect(observedError.cause).toBe(callbackError);
      expect(calls).toBe(1);
      expect(ownedCloseAttempts).toEqual([lockFd, parentFd]);
      expect(reclaimGuardFsyncCount).toBe(1);
      expect(reclaimGuardFsyncSawSettledCallback).toBe(true);
      expectRetainedLock(root, label, beforeBytes, beforeIdentity);
      passed = true;
    } finally {
      closeOnlyCapturedDescriptor(lockFd, lockPath(root));
      closeOnlyCapturedDescriptor(parentFd, root);
    }
    if (passed) completedRoots.add(root);
  });

  afterAll(() => {
    void mock.module('node:fs', () => actualFs);
    outstandingCloseFailures.forEach((identity, fd) => {
      const current = descriptorIdentity(fd);
      if (current.dev !== identity.dev || current.ino !== identity.ino) {
        throw new Error('Retained fixture descriptor identity changed before final cleanup');
      }
      actualFs.closeSync(fd);
      outstandingCloseFailures.delete(fd);
    });
    roots.forEach((root) => {
      if (completedRoots.has(root)) rmSync(root, { recursive: true, force: true });
      else console.error(`Preserved failed lock payload custody fixture at ${root}`);
    });
    process.stdout.write('BUN_TEST_SUITE_COMPLETE:lock payload custody\n');
  });
}
