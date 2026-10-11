import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
};

const linuxTest = test.skipIf(process.platform !== 'linux' || !safeRepositoryProviderAvailable);
const nativeRequire = createRequire(import.meta.url);

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
    { source: guardName, prefix: '.' + guardName + '.', suffix: '.released' },
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
