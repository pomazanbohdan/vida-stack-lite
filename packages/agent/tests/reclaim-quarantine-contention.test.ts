import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  requireSafeRepositoryAccess,
  SafeRepositoryLockContentionError,
  safeRepositoryProviderAvailable,
} from '../src/config/safe-repository-access.js';

type NativePathArgs = [sourceRootFd: number, sourceRelPath: string, targetRootFd: number, targetRelPath: string];
type NativeBinding = { readonly renameNoReplace: (...args: NativePathArgs) => void };
type Identity = { readonly dev: number; readonly ino: number };
type RenameTarget = {
  readonly source: string;
  readonly prefix: string;
  readonly suffix: '.reclaimed' | '.released';
  readonly enabled?: () => boolean;
};

const linuxTest = test.skipIf(process.platform !== 'linux' || !safeRepositoryProviderAvailable);
const nativeRequire = createRequire(import.meta.url);

linuxTest('live lock contender refuses before admission guard', () => verifyLockRepairPhase('live'));
linuxTest('fresh lock create holds its guard through payload publication', () => verifyLockRepairPhase('fresh'));
linuxTest('lock removal and guard release failures preserve both errors and custody', () =>
  verifyLockRepairPhase('fault'),
);

async function verifyLockRepairPhase(phase: 'live' | 'fresh' | 'fault'): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-lock-create-release-guard-'));
  const data = path.join(root, 'data');
  const control = path.join(root, 'control');
  mkdirSync(data, { mode: 0o700 });
  mkdirSync(control, { mode: 0o700 });
  const resource = 'data/race';
  const lockName = 'race.lock';
  const lockPath = path.join(data, lockName);
  const guardPath = lockPath + '.reclaim';
  const sourceUrl = pathToFileURL(path.resolve('src/config/safe-repository-access.ts')).href;
  const markerPath = (name: string): string => path.join(control, name + '.json');
  const writeMarker = (name: string, value: unknown): void => writeFileSync(markerPath(name), JSON.stringify(value));
  const readMarker = <T>(name: string): T => JSON.parse(readFileSync(markerPath(name), 'utf8')) as T;
  const markerExists = (name: string): boolean => existsSync(markerPath(name));
  const waitForAny = async (names: readonly string[], timeoutMs = 2_000): Promise<string> => {
    const deadline = performance.now() + timeoutMs;
    while (performance.now() < deadline) {
      const found = names.find(markerExists);
      if (found !== undefined) return found;
      await Bun.sleep(10);
    }
    throw new Error('timed out waiting for child protocol marker: ' + names.join(' or '));
  };
  const childSource = (role: 'owner' | 'candidate' | 'fresh' | 'fault'): string => `
    const role = ${JSON.stringify(role)};
    const root = ${JSON.stringify(root)};
    const data = ${JSON.stringify(data)};
    const control = ${JSON.stringify(control)};
    const sourceUrl = ${JSON.stringify(sourceUrl)};
    const lockName = ${JSON.stringify(lockName)};
    const resource = ${JSON.stringify(resource)};
    const lockPath = ${JSON.stringify(lockPath)};
    const guardPath = ${JSON.stringify(guardPath)};
    const guardName = lockName + '.reclaim';
    const nodePath = await import('node:path');
    const realFs = Object.freeze({ ...(await import('node:fs')) });
    const marker = (name, value) => realFs.writeFileSync(nodePath.join(control, name + '.json'), JSON.stringify(value));
    const waitFor = (name, timeoutMs = 2_000) => {
      const deadline = Date.now() + timeoutMs;
      while (!realFs.existsSync(nodePath.join(control, name + '.json'))) {
        if (Date.now() >= deadline) {
          marker(role + '-protocol-timeout', { waitingFor: name });
          return false;
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
      }
      return true;
    };
    const markerValue = (name) => {
     const file = nodePath.join(control, name + '.json');
     return realFs.existsSync(file) ? JSON.parse(realFs.readFileSync(file, 'utf8')) : null;
   };
   const identity = (stats) => stats === undefined || stats === null
      ? null
      : { dev: String(stats.dev), ino: String(stats.ino) };
    const isParentEntry = (target, basename) => {
      if (typeof target !== 'string' || nodePath.basename(target) !== basename) return false;
      try { return realFs.realpathSync(nodePath.dirname(target)) === realFs.realpathSync(data); }
      catch { return false; }
    };
    const guardStat = () => realFs.lstatSync(guardPath, { bigint: true, throwIfNoEntry: false });
    const lockStats = () => realFs.lstatSync(lockPath, { bigint: true, throwIfNoEntry: false });
    const lockFds = new Set();
    const guardOwnerFds = new Set();
    let wrappedOpen;
    let wrappedMkdir;
    let wrappedWriteFile;
    let wrappedUnlink;
   let faultArmed = false;
   let callbackCount = 0;
   const primaryFailure = Object.assign(new Error('injected lock quarantine unlink failure'), { code: 'EIO' });
   const guardFailure = Object.assign(new Error('injected reclaim guard unlink failure'), { code: 'EACCES' });
   let lockBefore;
   let lockBytesBefore;
   let guardBytesBefore;
    wrappedMkdir = (target, ...args) => {
      const result = realFs.mkdirSync(target, ...args);
      if (role === 'candidate' && isParentEntry(target, guardName))
        marker('candidate-gate-created', { guard: identity(guardStat()) });
      if (role === 'fresh' && isParentEntry(target, guardName) &&
          !realFs.existsSync(nodePath.join(control, 'fresh-exclusive-open.json')))
        marker('fresh-gate-created', { guard: identity(guardStat()) });
      return result;
    };
    wrappedOpen = (target, flags, ...args) => {
      const isLockCreate = role !== 'owner' && isParentEntry(target, lockName) &&
        typeof flags === 'number' && (flags & realFs.constants.O_EXCL) !== 0;
      if (role === 'candidate' && isLockCreate)
        marker('candidate-exclusive-attempt', { lock: identity(lockStats()), guard: identity(guardStat()) });
      if (role === 'fresh' && isLockCreate) {
        const before = identity(guardStat());
        const fd = realFs.openSync(target, flags, ...args);
        lockFds.add(fd);
        marker('fresh-exclusive-open', {
          beforeGuard: before,
          afterGuard: identity(guardStat()),
          lock: identity(realFs.fstatSync(fd, { bigint: true })),
          pathLock: identity(lockStats()),
        });
        return fd;
      }
      const fd = realFs.openSync(target, flags, ...args);
      if (role === 'fault' && faultArmed && typeof target === 'string' &&
          nodePath.basename(target) === 'owner.json' && isParentEntry(nodePath.dirname(target), guardName))
        guardOwnerFds.add(fd);
      if (role === 'candidate' && isLockCreate) marker('candidate-created', { lock: identity(realFs.fstatSync(fd, { bigint: true })) });
      return fd;
    };
    wrappedWriteFile = (target, ...args) => {
      const result = realFs.writeFileSync(target, ...args);
      if (role === 'fault' && faultArmed && typeof target === 'number' && guardOwnerFds.has(target)) {
        guardBytesBefore = realFs.readFileSync(nodePath.join(guardPath, 'owner.json')).toString('base64');
        marker('fault-guard-owner-created', { identity: identity(realFs.lstatSync(guardPath, { bigint: true })), bytes: guardBytesBefore });
      }
      if (role === 'fresh' && typeof target === 'number' && lockFds.has(target))
        marker('fresh-payload-published', {
          lock: identity(realFs.fstatSync(target, { bigint: true })),
          pathLock: identity(lockStats()),
          guard: identity(guardStat()),
        });
      return result;
    };
    wrappedUnlink = (target, ...args) => {
      if (role === 'fault' && faultArmed && typeof target === 'string' &&
          nodePath.basename(target).startsWith('.' + lockName + '.') &&
          nodePath.basename(target).endsWith('.reclaimed') && isParentEntry(target, nodePath.basename(target))) {
        const quarantined = realFs.lstatSync(target, { bigint: true });
        marker('fault-lock-quarantine-before-unlink', {
          identity: identity(quarantined), bytes: realFs.readFileSync(target).toString('base64'), path: target,
        });
        throw primaryFailure;
      }
      if (role === 'fault' && faultArmed && typeof target === 'string' &&
          nodePath.basename(target) === 'owner.json' &&
          nodePath.basename(nodePath.dirname(target)).startsWith('.' + guardName + '.') &&
          nodePath.basename(nodePath.dirname(target)).endsWith('.released') &&
          isParentEntry(nodePath.dirname(target), nodePath.basename(nodePath.dirname(target)))) {
        const quarantinedGuard = nodePath.dirname(target);
        const owner = realFs.lstatSync(quarantinedGuard, { bigint: true });
        marker('fault-guard-quarantine-before-owner-unlink', {
          identity: identity(owner), ownerBytes: realFs.readFileSync(target).toString('base64'), path: quarantinedGuard,
        });
        throw guardFailure;
      }
      if (role === 'owner' && typeof target === 'string' &&
          nodePath.basename(target).startsWith('.' + lockName + '.') &&
          nodePath.basename(target).endsWith('.reclaimed') &&
          isParentEntry(target, nodePath.basename(target))) {
        const quarantined = realFs.lstatSync(target, { bigint: true, throwIfNoEntry: false });
        const result = realFs.unlinkSync(target, ...args);
        marker('owner-unlinked', { lock: identity(quarantined), guard: identity(guardStat()) });
        waitFor('continue-owner');
        return result;
      }
      return realFs.unlinkSync(target, ...args);
    };
    try {
      const bunTest = await import('bun:test');
      if (!bunTest.mock || typeof bunTest.mock.module !== 'function')
        throw new Error('fresh child cannot access Bun mock.module');
      await bunTest.mock.module('node:fs', () => ({
        ...realFs,
        default: realFs,
        openSync: wrappedOpen,
        mkdirSync: wrappedMkdir,
        writeFileSync: wrappedWriteFile,
        unlinkSync: wrappedUnlink,
      }));
      const mockedFs = await import('node:fs');
      if (mockedFs.openSync !== wrappedOpen || mockedFs.mkdirSync !== wrappedMkdir ||
          mockedFs.writeFileSync !== wrappedWriteFile || mockedFs.unlinkSync !== wrappedUnlink)
        throw new Error('fresh node:fs mock did not intercept lock protocol syscalls');
      const safe = await import(sourceUrl);
      const access = safe.requireSafeRepositoryAccess(root);
      if (role === 'owner') {
        access.withExclusiveLock(resource, 'guard serialization owner', () => {
          marker('owner-ready', { lock: identity(lockStats()) });
          waitFor('release-owner');
          return 'owner released';
        });
        marker('owner-done', {});
      } else if (role === 'candidate') {
        let callbackEntered = false;
        try {
          access.withExclusiveLock(resource, 'live lock contender', () => {
            callbackEntered = true;
            marker('candidate-entered', { guard: identity(guardStat()) });
            return 'must not enter';
          });
          marker('candidate-returned', { callbackEntered });
        } catch (error) {
          marker('candidate-denied', {
            callbackEntered,
            name: error instanceof Error ? error.name : null,
            code: typeof error === 'object' && error !== null && 'code' in error ? error.code : null,
          });
        }
        marker('candidate-done', {});
      } else if (role === 'fresh') {
        access.withExclusiveLock(resource, 'fresh lock contender', () => {
          marker('fresh-callback', {
            guard: identity(guardStat()),
            lock: identity(lockStats()),
          });
          return 'fresh callback';
        });
        marker('fresh-done', {});
      } else {
        let caught;
        try {
          access.withExclusiveLock(resource, 'dual cleanup failure', () => {
            callbackCount += 1;
            lockBefore = identity(lockStats());
            lockBytesBefore = realFs.readFileSync(lockPath).toString('base64');
            faultArmed = true;
            return 'callback once';
          });
        } catch (error) { caught = error; }
        if (!(caught instanceof AggregateError) || caught.errors.length !== 2 ||
            caught.errors[0] !== primaryFailure || caught.errors[1] !== guardFailure ||
            caught.cause !== primaryFailure || callbackCount !== 1 || guardBytesBefore === undefined)
          throw new Error('public release failure did not preserve exact primary-first errors or callback count');
        const restoredLock = realFs.lstatSync(lockPath, { bigint: true, throwIfNoEntry: false });
        const restoredGuard = realFs.lstatSync(guardPath, { bigint: true, throwIfNoEntry: false });
        const restoredOwner = restoredGuard && realFs.readFileSync(nodePath.join(guardPath, 'owner.json')).toString('base64');
        const lockQuarantine = realFs.readdirSync(data).filter((name) => name.startsWith('.' + lockName + '.') && name.endsWith('.reclaimed'));
        const guardQuarantine = realFs.readdirSync(data).filter((name) => name.startsWith('.' + guardName + '.') && name.endsWith('.released'));
        const restoredLockIdentity = identity(restoredLock);
        const restoredGuardIdentity = identity(restoredGuard);
        const lockRestored = !!restoredLock && restoredLockIdentity.dev === lockBefore.dev && restoredLockIdentity.ino === lockBefore.ino &&
          realFs.readFileSync(lockPath).toString('base64') === lockBytesBefore;
        const guardWindow = markerValue('fault-guard-quarantine-before-owner-unlink');
        const guardRetained = !!restoredGuard && !!guardWindow && restoredGuardIdentity.dev === guardWindow.identity.dev &&
          restoredGuardIdentity.ino === guardWindow.identity.ino && restoredOwner === guardBytesBefore;
        marker('fault-result', {
          callbackCount, lockRestored, guardRetained, guardUnresolved: guardRetained, lockQuarantine, guardQuarantine,
          lock: restoredLockIdentity, guard: restoredGuardIdentity,
          lockBytes: restoredLock ? realFs.readFileSync(lockPath).toString('base64') : null,
          guardOwnerBytes: restoredOwner,
          primaryQuarantine: markerValue('fault-lock-quarantine-before-unlink'),
          guardOwnerCreated: markerValue('fault-guard-owner-created'), guardQuarantineWindow: guardWindow,
        });
      }
    } catch (error) {
      marker(role + '-error', {
        name: error instanceof Error ? error.name : null,
        code: typeof error === 'object' && error !== null && 'code' in error ? error.code : null,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      });
      process.exitCode = 1;
    }
  `;
  const launch = (role: 'owner' | 'candidate' | 'fresh' | 'fault') => {
    const child = spawn(process.execPath, ['--eval', childSource(role)], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk));
    const terminal = once(child, 'close').then((event) => ({ event, stdout: () => stdout, stderr: () => stderr }));
    return { child, terminal };
  };
  const identity = (
    stats: { readonly dev: number | bigint; readonly ino: number | bigint } | undefined,
  ): { dev: string; ino: string } | null =>
    stats === undefined ? null : { dev: String(stats.dev), ino: String(stats.ino) };
  let owner: ReturnType<typeof launch> | undefined;
  let candidate: ReturnType<typeof launch> | undefined;
  let fresh: ReturnType<typeof launch> | undefined;
  let fault: ReturnType<typeof launch> | undefined;
  let passed = false;
  try {
    if (phase === 'live') {
      owner = launch('owner');
      const ownerReady = await waitForAny(['owner-ready', 'owner-error']);
      if (ownerReady === 'owner-error')
        throw new Error('owner child failed: ' + JSON.stringify(readMarker('owner-error')));
      const originalLock = readMarker<{ lock: { dev: string; ino: string } }>('owner-ready').lock;

      candidate = launch('candidate');
      const candidateDone = await waitForAny(['candidate-done', 'candidate-error']);
      if (candidateDone === 'candidate-error')
        throw new Error('candidate child failed: ' + JSON.stringify(readMarker('candidate-error')));
      const denial = readMarker<{ callbackEntered: boolean; name: string; code: string }>('candidate-denied');
      expect(denial.callbackEntered).toBe(false);
      expect(denial.name).toBe('SafeRepositoryLockContentionError');
      expect(markerExists('candidate-entered')).toBe(false);
      expect(markerExists('candidate-returned')).toBe(false);
      expect(markerExists('candidate-created')).toBe(false);
      expect(markerExists('candidate-exclusive-attempt')).toBe(false);
      expect(markerExists('candidate-gate-created')).toBe(false);
      expect(identity(lstatSync(lockPath, { bigint: true }))).toEqual(originalLock);
      expect(lstatSync(guardPath, { throwIfNoEntry: false })).toBeUndefined();
      const candidateTerminal = await candidate.terminal;
      expect(candidateTerminal.event).toEqual([0, null]);
      expect(candidateTerminal.stderr()).toBe('');

      writeMarker('release-owner', {});
      const ownerWindow = await waitForAny(['owner-unlinked', 'owner-error']);
      if (ownerWindow !== 'owner-unlinked')
        throw new Error('owner failed before the one release unlink: ' + JSON.stringify(readMarker('owner-error')));
      const release = readMarker<{ lock: { dev: string; ino: string }; guard: { dev: string; ino: string } }>(
        'owner-unlinked',
      );
      expect(release.lock).toEqual(originalLock);
      expect(release.guard).not.toBeNull();
      expect(identity(lstatSync(guardPath, { bigint: true }))).toEqual(release.guard);
      expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
      writeMarker('continue-owner', {});
      const ownerDone = await waitForAny(['owner-done', 'owner-error']);
      if (ownerDone === 'owner-error')
        throw new Error('owner release failed: ' + JSON.stringify(readMarker('owner-error')));
      const ownerTerminal = await owner.terminal;
      expect(ownerTerminal.event).toEqual([0, null]);
      expect(ownerTerminal.stderr()).toBe('');
      expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
      expect(lstatSync(guardPath, { throwIfNoEntry: false })).toBeUndefined();
    } else if (phase === 'fresh') {
      fresh = launch('fresh');
      const freshDone = await waitForAny(['fresh-done', 'fresh-error']);
      if (freshDone === 'fresh-error')
        throw new Error('fresh create failed: ' + JSON.stringify(readMarker('fresh-error')));
      expect(markerExists('fresh-gate-created')).toBe(true);
      const gate = readMarker<{ guard: { dev: string; ino: string } }>('fresh-gate-created').guard;
      const opened = readMarker<{
        beforeGuard: { dev: string; ino: string } | null;
        afterGuard: { dev: string; ino: string } | null;
        lock: { dev: string; ino: string };
        pathLock: { dev: string; ino: string };
      }>('fresh-exclusive-open');
      const payload = readMarker<{
        lock: { dev: string; ino: string };
        pathLock: { dev: string; ino: string };
        guard: { dev: string; ino: string };
      }>('fresh-payload-published');
      const entered = readMarker<{ guard: { dev: string; ino: string } | null; lock: { dev: string; ino: string } }>(
        'fresh-callback',
      );
      expect(opened.beforeGuard).toEqual(gate);
      expect(opened.afterGuard).toEqual(gate);
      expect(payload.guard).toEqual(gate);
      expect(opened.pathLock).toEqual(opened.lock);
      expect(payload.pathLock).toEqual(opened.lock);
      expect(payload.lock).toEqual(opened.lock);
      expect(entered.guard).toBeNull();
      expect(entered.lock).toEqual(opened.lock);
      const freshTerminal = await fresh.terminal;
      expect(freshTerminal.event).toEqual([0, null]);
      expect(freshTerminal.stderr()).toBe('');
      expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
      expect(lstatSync(guardPath, { throwIfNoEntry: false })).toBeUndefined();
    } else {
      fault = launch('fault');
      const faultDone = await waitForAny(['fault-result', 'fault-error']);
      if (faultDone === 'fault-error')
        console.error('dual cleanup fault child failed: ' + JSON.stringify(readMarker('fault-error')));
      expect(faultDone).toBe('fault-result');
      const faultResult = readMarker<{
        callbackCount: number;
        lockRestored: boolean;
        guardRetained: boolean;
        guardUnresolved: boolean;
        lockQuarantine: string[];
        guardQuarantine: string[];
        lock: { dev: string; ino: string };
        guard: { dev: string; ino: string };
        lockBytes: string;
        guardOwnerBytes: string;
        primaryQuarantine: { identity: { dev: string; ino: string }; bytes: string };
        guardOwnerCreated: { identity: { dev: string; ino: string }; bytes: string };
        guardQuarantineWindow: { identity: { dev: string; ino: string }; ownerBytes: string };
      }>('fault-result');
      expect(faultResult.callbackCount).toBe(1);
      expect(faultResult.lockRestored).toBe(true);
      expect(faultResult.guardRetained).toBe(true);
      expect(faultResult.guardUnresolved).toBe(true);
      expect(faultResult.lock).toEqual(faultResult.primaryQuarantine.identity);
      expect(faultResult.guard).toEqual(faultResult.guardQuarantineWindow.identity);
      expect(faultResult.guard).toEqual(faultResult.guardOwnerCreated.identity);
      expect(faultResult.lockBytes).toBe(faultResult.primaryQuarantine.bytes);
      expect(faultResult.guardOwnerBytes).toBe(faultResult.guardQuarantineWindow.ownerBytes);
      expect(faultResult.guardOwnerBytes).toBe(faultResult.guardOwnerCreated.bytes);
      expect(faultResult.lockQuarantine).toEqual([]);
      expect(faultResult.guardQuarantine).toEqual([]);
      const faultTerminal = await fault.terminal;
      expect(faultTerminal.event).toEqual([0, null]);
      expect(faultTerminal.stderr()).toBe('');
    }
    passed = true;
  } finally {
    if (owner && !markerExists('release-owner')) writeMarker('release-owner', {});
    if (owner && !markerExists('continue-owner')) writeMarker('continue-owner', {});
    await Promise.allSettled([
      ...(owner ? [owner.terminal] : []),
      ...(candidate ? [candidate.terminal] : []),
      ...(fresh ? [fresh.terminal] : []),
      ...(fault ? [fault.terminal] : []),
    ]);
    if (passed && phase !== 'fault') rmSync(root, { recursive: true, force: true });
    else console.error(`preserved ${phase} lock guard fixture root: ${root}`);
  }
}

linuxTest('an entered release refuses pending quarantine without becoming admission contention', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reclaim-quarantine-release-refusal-'));
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory('data', 'release quarantine refusal fixture');
  const lockPath = path.join(root, 'data', 'entered.lock');
  const quarantinePath = path.join(root, 'data', `.entered.lock.${randomUUID()}.reclaimed`);
  const quarantineBytes = Buffer.from('opaque unresolved quarantine fixture\n');
  let calls = 0;
  let result: unknown;
  let failure: unknown;
  let ownedBytes: Buffer<ArrayBuffer> | undefined;
  let ownedIdentity: Identity | undefined;
  try {
    result = access.withExclusiveLock('data/entered', 'entered release quarantine refusal', () => {
      calls += 1;
      ownedBytes = readFileSync(lockPath);
      ownedIdentity = identity(lockPath);
      writeFileSync(quarantinePath, quarantineBytes, { flag: 'wx' });
      return 'withheld after release refusal';
    });
  } catch (error) {
    failure = error;
  }
  if (ownedBytes === undefined || ownedIdentity === undefined)
    throw new Error('entered operation did not capture its owned lock');
  expect(calls).toBe(1);
  expect(result).toBeUndefined();
  expect(failure).not.toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(failure).toMatchObject({ code: 'SAFE_REPOSITORY_LOCK_RELEASE_INCOMPLETE' });
  expect(readFileSync(lockPath)).toEqual(ownedBytes);
  expect(identity(lockPath)).toEqual(ownedIdentity);
  expect(readFileSync(quarantinePath)).toEqual(quarantineBytes);
  console.error(`retained entered release quarantine refusal fixture root: ${root}`);
});

function identity(filePath: string): Identity {
  const stats = lstatSync(filePath);
  return { dev: stats.dev, ino: stats.ino };
}

function isNativeBinding(value: unknown): value is NativeBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    'renameNoReplace' in value &&
    typeof value.renameNoReplace === 'function'
  );
}

function nativeBinding(): NativeBinding {
  const entry = nativeRequire.resolve('@openclaw/fs-safe');
  const packageRoot = path.resolve(path.dirname(entry), '..');
  const nativeModule: unknown = nativeRequire(path.join(packageRoot, 'dist', 'native.js'));
  if (typeof nativeModule !== 'object' || nativeModule === null || !('getNativeBinding' in nativeModule))
    throw new TypeError('fs-safe native module has no binding accessor');
  if (typeof nativeModule.getNativeBinding !== 'function')
    throw new TypeError('fs-safe native binding accessor is invalid');
  const binding: unknown = nativeModule.getNativeBinding.call(nativeModule);
  if (!isNativeBinding(binding)) throw new TypeError('fs-safe native binding has no no-replace rename');
  return binding;
}

function interleaveAfterRealRename(
  binding: NativeBinding,
  target: RenameTarget,
  beforeRename: (quarantineName: string) => void,
  afterRename: (quarantineName: string) => void,
): { readonly restore: () => void; readonly quarantineNames: () => readonly string[] } {
  const original = binding.renameNoReplace;
  const quarantineNames: string[] = [];
  let interleaved = false;
  const replacement = (...args: NativePathArgs): void => {
    const [, sourceName, , targetName] = args;
    const matches =
      !interleaved &&
      (target.enabled?.() ?? true) &&
      sourceName === target.source &&
      targetName.startsWith(target.prefix) &&
      targetName.endsWith(target.suffix);
    if (matches) {
      interleaved = true;
      beforeRename(targetName);
      original(...args);
      quarantineNames.push(targetName);
      afterRename(targetName);
    } else {
      original(...args);
    }
  };
  if (!Reflect.set(binding, 'renameNoReplace', replacement))
    throw new Error('attested fs-safe native binding does not permit scoped interleaving');
  return {
    restore: () => {
      if (!Reflect.set(binding, 'renameNoReplace', original))
        throw new Error('could not restore the attested fs-safe native binding');
    },
    quarantineNames: () => quarantineNames,
  };
}

linuxTest(
  'an ordinary lock quarantine during release denies admission as contention, then admits after release',
  () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-reclaim-quarantine-lock-contention-'));
    const owner = requireSafeRepositoryAccess(root);
    owner.ensureDirectory('data', 'ordinary lock quarantine contention fixture');
    const contender = requireSafeRepositoryAccess(root);
    const parent = path.join(root, 'data');
    const lockName = 'ordinary.lock';
    const lockPath = path.join(parent, lockName);
    const guardPath = lockPath + '.reclaim';
    const native = nativeBinding();
    let callbackCalls = 0;
    let ownerResult: unknown;
    let ownerError: unknown;
    let lockBytes: Buffer<ArrayBuffer> | undefined;
    let lockIdentity: Identity | undefined;
    let guardBytes: Buffer<ArrayBuffer> | undefined;
    let guardIdentity: Identity | undefined;
    let peerCalls = 0;
    let peerReturned = false;
    let peerError: unknown;
    let quarantineIdentity: Identity | undefined;
    let quarantineBytes: Buffer<ArrayBuffer> | undefined;
    let passed = false;
    const captureGuardBeforeRename = (): void => {
      guardBytes = readFileSync(path.join(guardPath, 'owner.json'));
      guardIdentity = identity(guardPath);
    };
    const fault = interleaveAfterRealRename(
      native,
      { source: lockName, prefix: '.' + lockName + '.', suffix: '.reclaimed' },
      captureGuardBeforeRename,
      (quarantineName) => {
        const quarantinePath = path.join(parent, quarantineName);
        quarantineIdentity = identity(quarantinePath);
        quarantineBytes = readFileSync(quarantinePath);
        try {
          contender.withExclusiveLock('data/ordinary', 'ordinary quarantine peer', () => {
            peerCalls += 1;
            return 'must remain blocked while owner release is in progress';
          });
          peerReturned = true;
        } catch (error) {
          peerError = error;
        }
        if (
          lockBytes === undefined ||
          lockIdentity === undefined ||
          guardBytes === undefined ||
          guardIdentity === undefined
        )
          throw new Error('owner lock or reclaim guard snapshot is incomplete during the interleave');
        expect(quarantineIdentity).toEqual(lockIdentity);
        expect(quarantineBytes).toEqual(lockBytes);
        expect(readFileSync(path.join(guardPath, 'owner.json'))).toEqual(guardBytes);
        expect(identity(guardPath)).toEqual(guardIdentity);
        expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
      },
    );

    try {
      try {
        ownerResult = owner.withExclusiveLock('data/ordinary', 'ordinary quarantine owner', () => {
          callbackCalls += 1;
          lockBytes = readFileSync(lockPath);
          lockIdentity = identity(lockPath);
          return 'owner callback result';
        });
      } catch (error) {
        ownerError = error;
      }

      expect(fault.quarantineNames()).toHaveLength(1);
      const quarantineName = fault.quarantineNames()[0];
      if (quarantineName === undefined) throw new Error('ordinary lock rename did not expose its quarantine name');
      if (
        lockBytes === undefined ||
        lockIdentity === undefined ||
        guardBytes === undefined ||
        guardIdentity === undefined
      )
        throw new Error('owner lock or reclaim guard snapshot is incomplete');
      expect(ownerError).toBeUndefined();
      expect(ownerResult).toBe('owner callback result');
      expect(callbackCalls).toBe(1);
      expect(peerCalls).toBe(0);
      expect(peerReturned).toBe(false);
      expect(peerError).toBeInstanceOf(SafeRepositoryLockContentionError);
      expect(quarantineIdentity).toEqual(lockIdentity);
      expect(quarantineBytes).toEqual(lockBytes);
      expect(lstatSync(path.join(parent, quarantineName), { throwIfNoEntry: false })).toBeUndefined();
      expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
      expect(lstatSync(guardPath, { throwIfNoEntry: false })).toBeUndefined();

      let freshCalls = 0;
      expect(
        contender.withExclusiveLock('data/ordinary', 'ordinary fresh contender', () => {
          freshCalls += 1;
          return 'admitted after release';
        }),
      ).toBe('admitted after release');
      expect(freshCalls).toBe(1);
      expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
      expect(lstatSync(guardPath, { throwIfNoEntry: false })).toBeUndefined();
      passed = true;
    } finally {
      fault.restore();
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error(`preserved ordinary lock quarantine contention fixture root: ${root}`);
    }
  },
);

linuxTest('a release-guard quarantine during release denies admission as contention, then admits after release', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reclaim-quarantine-guard-contention-'));
  const owner = requireSafeRepositoryAccess(root);
  owner.ensureDirectory('data', 'release guard quarantine contention fixture');
  const contender = requireSafeRepositoryAccess(root);
  const parent = path.join(root, 'data');
  const lockName = 'guard-release.lock';
  const guardName = lockName + '.reclaim';
  const lockPath = path.join(parent, lockName);
  const guardPath = path.join(parent, guardName);
  const native = nativeBinding();
  let callbackCalls = 0;
  let ownerResult: unknown;
  let ownerError: unknown;
  let guardBytes: Buffer<ArrayBuffer> | undefined;
  let guardIdentity: Identity | undefined;
  let peerCalls = 0;
  let peerReturned = false;
  let peerError: unknown;
  let quarantineIdentity: Identity | undefined;
  let quarantineOwnerBytes: Buffer<ArrayBuffer> | undefined;
  let passed = false;
  const captureGuardBeforeRename = (): void => {
    guardBytes = readFileSync(path.join(guardPath, 'owner.json'));
    guardIdentity = identity(guardPath);
  };
  const fault = interleaveAfterRealRename(
    native,
    { source: guardName, prefix: '.' + guardName + '.', suffix: '.released', enabled: () => callbackCalls === 1 },
    captureGuardBeforeRename,
    (quarantineName) => {
      const quarantinePath = path.join(parent, quarantineName);
      quarantineIdentity = identity(quarantinePath);
      quarantineOwnerBytes = readFileSync(path.join(quarantinePath, 'owner.json'));
      try {
        contender.withExclusiveLock('data/guard-release', 'release quarantine peer', () => {
          peerCalls += 1;
          return 'must remain blocked while owner release is in progress';
        });
        peerReturned = true;
      } catch (error) {
        peerError = error;
      }
      if (guardBytes === undefined || guardIdentity === undefined)
        throw new Error('owner reclaim guard snapshot is incomplete during the interleave');
      expect(quarantineIdentity).toEqual(guardIdentity);
      expect(quarantineOwnerBytes).toEqual(guardBytes);
      expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
    },
  );

  try {
    try {
      ownerResult = owner.withExclusiveLock('data/guard-release', 'release quarantine owner', () => {
        callbackCalls += 1;
        return 'owner callback result';
      });
    } catch (error) {
      ownerError = error;
    }

    expect(fault.quarantineNames()).toHaveLength(1);
    const quarantineName = fault.quarantineNames()[0];
    if (quarantineName === undefined) throw new Error('reclaim guard rename did not expose its quarantine name');
    if (guardBytes === undefined || guardIdentity === undefined)
      throw new Error('owner reclaim guard snapshot is incomplete');
    expect(ownerError).toBeUndefined();
    expect(ownerResult).toBe('owner callback result');
    expect(callbackCalls).toBe(1);
    expect(peerCalls).toBe(0);
    expect(peerReturned).toBe(false);
    expect(peerError).toBeInstanceOf(SafeRepositoryLockContentionError);
    expect(quarantineIdentity).toEqual(guardIdentity);
    expect(quarantineOwnerBytes).toEqual(guardBytes);
    expect(lstatSync(path.join(parent, quarantineName), { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(guardPath, { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();

    let freshCalls = 0;
    expect(
      contender.withExclusiveLock('data/guard-release', 'guard release fresh contender', () => {
        freshCalls += 1;
        return 'admitted after release';
      }),
    ).toBe('admitted after release');
    expect(freshCalls).toBe(1);
    expect(lstatSync(lockPath, { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(guardPath, { throwIfNoEntry: false })).toBeUndefined();
    passed = true;
  } finally {
    fault.restore();
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`preserved release guard quarantine contention fixture root: ${root}`);
  }
});
