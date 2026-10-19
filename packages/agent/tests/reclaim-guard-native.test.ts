import { expect, test } from 'bun:test';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  requireSafeRepositoryAccess,
  SafeRepositoryLockContentionError,
  safeRepositoryProviderAvailable,
} from '../src/config/safe-repository-access.js';

const linuxTest = test.skipIf(process.platform !== 'linux' || !safeRepositoryProviderAvailable);
const staleTime = new Date(Date.now() - 60_000);
const lockBytes = JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: 2_147_483_647, label: 'fixture' });

type Identity = { readonly dev: number; readonly ino: number };

function identity(filePath: string): Identity {
  const stats = lstatSync(filePath);
  return { dev: stats.dev, ino: stats.ino };
}

function age(filePath: string, when = staleTime): void {
  utimesSync(filePath, when, when);
}

function deadGuardOwner(acquiredAt = staleTime.toISOString()): string {
  return JSON.stringify({
    schema: 'SafeRepositoryAccessReclaimGuard/v1',
    owner_pid: 2_147_483_647,
    owner_token: '1'.repeat(36),
    acquired_at: acquiredAt,
  });
}

function exerciseNativeReclaimGuard(rootParent: string, prefix: string): void {
  const root = mkdtempSync(path.join(rootParent, prefix));
  let completed = false;
  try {
    const access = requireSafeRepositoryAccess(root);
    access.ensureDirectory('data', 'reclaim guard fixture data');
    const directory = path.join(root, 'data');
    const lock = path.join(directory, 'probe.lock.lock');
    const guard = lock + '.reclaim';
    const owner = path.join(guard, 'owner.json');

    // Successful reclaim control: both lock and valid dead-owner guard exceed the stale age.
    writeFileSync(lock, lockBytes);
    age(lock);
    mkdirSync(guard);
    writeFileSync(owner, deadGuardOwner());
    age(owner);
    age(guard);
    for (const entry of [lock, guard, owner]) expect(lstatSync(entry).mtimeMs).toBeLessThan(Date.now() - 30_000);
    expect(access.withExclusiveLock('data/probe.lock', 'stale lock fixture', () => 'reclaimed')).toBe('reclaimed');
    expect(lstatSync(lock, { throwIfNoEntry: false })).toBeUndefined();
    expect(lstatSync(guard, { throwIfNoEntry: false })).toBeUndefined();

    const expectDeniedPreserved = (name: string, guardOwner: string | undefined, guardAge: Date): void => {
      const targetLock = path.join(directory, name + '.lock');
      const targetGuard = targetLock + '.reclaim';
      const targetOwner = path.join(targetGuard, 'owner.json');
      writeFileSync(targetLock, lockBytes);
      age(targetLock);
      mkdirSync(targetGuard);
      if (guardOwner !== undefined) writeFileSync(targetOwner, guardOwner);
      age(targetGuard, guardAge);
      if (guardOwner !== undefined) age(targetOwner, guardAge);

      const beforeLockBytes = readFileSync(targetLock);
      const beforeLockIdentity = identity(targetLock);
      const beforeGuardIdentity = identity(targetGuard);
      const beforeOwnerBytes = guardOwner === undefined ? undefined : readFileSync(targetOwner);
      const beforeOwnerIdentity = guardOwner === undefined ? undefined : identity(targetOwner);
      expect(() => access.withExclusiveLock('data/' + name, 'preserved guard fixture', () => undefined)).toThrow(
        /reclaim/,
      );
      expect(readFileSync(targetLock)).toEqual(beforeLockBytes);
      expect(identity(targetLock)).toEqual(beforeLockIdentity);
      expect(identity(targetGuard)).toEqual(beforeGuardIdentity);
      if (beforeOwnerBytes !== undefined) {
        if (beforeOwnerIdentity === undefined) throw new Error('owner identity snapshot is missing');
        expect(readFileSync(targetOwner)).toEqual(beforeOwnerBytes);
        expect(identity(targetOwner)).toEqual(beforeOwnerIdentity);
      } else {
        expect(lstatSync(targetOwner, { throwIfNoEntry: false })).toBeUndefined();
      }
    };

    const young = new Date();
    expectDeniedPreserved('young-guard.lock', deadGuardOwner(young.toISOString()), young);
    expectDeniedPreserved(
      'live-owner.lock',
      JSON.stringify({
        schema: 'SafeRepositoryAccessReclaimGuard/v1',
        owner_pid: process.pid,
        owner_token: '2'.repeat(36),
        acquired_at: staleTime.toISOString(),
      }),
      staleTime,
    );
    expectDeniedPreserved('malformed-owner.lock', '{invalid json', staleTime);
    expectDeniedPreserved('ownerless.lock', undefined, staleTime);

    completed = true;
  } finally {
    if (completed) rmSync(root, { recursive: true, force: true });
    else console.error(`native reclaim guard fixture retained at ${root}`);
  }
}

function exerciseNativeReleaseGuardCollision(rootParent: string, prefix: string): void {
  const root = mkdtempSync(path.join(rootParent, prefix));
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory('data', 'release guard collision fixture data');
  const lock = path.join(root, 'data', 'release-collision.lock');
  const guard = lock + '.reclaim';
  const owner = path.join(guard, 'owner.json');
  const token = '3'.repeat(36);
  const liveOwnerBytes = JSON.stringify({
    schema: 'SafeRepositoryAccessReclaimGuard/v1',
    owner_pid: process.pid,
    owner_token: token,
    acquired_at: staleTime.toISOString(),
  });
  let callbackCalls = 0;
  let lockBytes: Buffer<ArrayBuffer> | undefined;
  let lockIdentity: Identity | undefined;
  let guardIdentity: Identity | undefined;
  let ownerIdentity: Identity | undefined;
  let releaseError: unknown;
  let returned = false;

  try {
    let result: string | undefined;
    try {
      result = access.withExclusiveLock('data/release-collision', 'release guard collision fixture', () => {
        callbackCalls += 1;
        lockBytes = readFileSync(lock);
        lockIdentity = identity(lock);
        mkdirSync(guard, { mode: 0o700 });
        writeFileSync(owner, liveOwnerBytes, { mode: 0o600 });
        age(guard);
        age(owner);
        guardIdentity = identity(guard);
        ownerIdentity = identity(owner);
        return 'must not be returned';
      });
      returned = true;
    } catch (error) {
      releaseError = error;
    }

    expect(callbackCalls).toBe(1);
    expect(returned).toBe(false);
    expect(releaseError).toBeInstanceOf(Error);
    expect(releaseError).not.toBeInstanceOf(SafeRepositoryLockContentionError);
    expect(releaseError).toMatchObject({ code: 'SAFE_REPOSITORY_LOCK_RELEASE_INCOMPLETE' });
    expect(result).toBeUndefined();
    if (
      lockBytes === undefined ||
      lockIdentity === undefined ||
      guardIdentity === undefined ||
      ownerIdentity === undefined
    )
      throw new Error('owned lock or live guard snapshot is missing');
    expect(readFileSync(lock)).toEqual(lockBytes);
    expect(identity(lock)).toEqual(lockIdentity);
    const retainedLock: unknown = JSON.parse(readFileSync(lock, 'utf8'));
    expect(retainedLock).toMatchObject({ owner_pid: process.pid });
    expect(readFileSync(owner, 'utf8')).toBe(liveOwnerBytes);
    expect(identity(guard)).toEqual(guardIdentity);
    expect(identity(owner)).toEqual(ownerIdentity);
    expect(JSON.parse(readFileSync(owner, 'utf8'))).toEqual({
      schema: 'SafeRepositoryAccessReclaimGuard/v1',
      owner_pid: process.pid,
      owner_token: token,
      acquired_at: staleTime.toISOString(),
    });
  } finally {
    if (lstatSync(lock, { throwIfNoEntry: false }) === undefined) rmSync(root, { recursive: true, force: true });
    else console.error(`native release guard collision fixture retained with unresolved lock at ${root}`);
  }
}

linuxTest(
  'reclaims a stale native Linux lock in a /tmp fixture only with valid stale dead-owner guard evidence',
  () => {
    exerciseNativeReclaimGuard(tmpdir(), 'vida-reclaim-guard-native-');
  },
);

const packageTemp = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.tmp');

linuxTest(
  'reclaims a stale native Linux lock in writable package scratch only with valid stale dead-owner guard evidence',
  () => {
    mkdirSync(packageTemp, { recursive: true });
    exerciseNativeReclaimGuard(packageTemp, 'vida-reclaim-guard-native-');
  },
);

linuxTest('fails an owned native Linux lock release when its exact reclaim guard has a live owner', () => {
  exerciseNativeReleaseGuardCollision(tmpdir(), 'vida-release-guard-collision-');
});
