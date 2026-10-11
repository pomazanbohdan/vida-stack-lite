import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
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

const linuxTest = test.skipIf(process.platform !== 'linux' || !safeRepositoryProviderAvailable);
const staleTime = new Date(Date.now() - 60_000);
const nativeRequire = createRequire(import.meta.url);

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

function failRestoreFor(
  binding: NativeBinding,
  guardName: string,
  failure: Error,
): {
  readonly restore: () => void;
  readonly quarantineNames: () => readonly string[];
} {
  const original = binding.renameNoReplace;
  const quarantineNames: string[] = [];
  let injected = false;
  const replacement = (...args: NativePathArgs): void => {
    const [, sourceRelPath, , targetRelPath] = args;
    if (
      !injected &&
      targetRelPath === guardName &&
      sourceRelPath.startsWith('.' + guardName + '.') &&
      sourceRelPath.endsWith('.reclaimed')
    ) {
      injected = true;
      quarantineNames.push(sourceRelPath);
      throw failure;
    }
    original(...args);
  };
  if (!Reflect.set(binding, 'renameNoReplace', replacement))
    throw new Error('attested fs-safe native binding does not permit scoped rename fault injection');
  return {
    restore: () => {
      if (!Reflect.set(binding, 'renameNoReplace', original))
        throw new Error('could not restore the attested fs-safe native binding');
    },
    quarantineNames: () => quarantineNames,
  };
}

function errorChain(error: unknown): readonly unknown[] {
  const pending: unknown[] = [error];
  const chain: unknown[] = [];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || chain.includes(current)) continue;
    chain.push(current);
    if (current instanceof Error) {
      if (current.cause !== undefined) pending.push(current.cause);
      if (current instanceof AggregateError) {
        const errors: readonly unknown[] = current.errors;
        pending.push(...errors);
      }
    }
  }
  return chain;
}

function liveStaleOwner(): string {
  return JSON.stringify({
    schema: 'SafeRepositoryAccessReclaimGuard/v1',
    owner_pid: process.pid,
    owner_token: '4'.repeat(36),
    acquired_at: staleTime.toISOString(),
  });
}

function createForeignGuard(parent: string, guardName: string): { readonly ownerPath: string; readonly bytes: string } {
  const guardPath = path.join(parent, guardName);
  mkdirSync(guardPath, { mode: 0o700 });
  const ownerPath = path.join(guardPath, 'owner.json');
  const bytes = liveStaleOwner();
  writeFileSync(ownerPath, bytes, { mode: 0o600 });
  utimesSync(ownerPath, staleTime, staleTime);
  utimesSync(guardPath, staleTime, staleTime);
  return { ownerPath, bytes };
}

function expectRetainedQuarantinedGuard(
  parent: string,
  guardName: string,
  quarantineName: string,
  expectedIdentity: Identity,
  expectedOwnerBytes: string,
): void {
  expect(quarantineName).toMatch(
    new RegExp('^[.]' + guardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[.].+[.]reclaimed$'),
  );
  const quarantinePath = path.join(parent, quarantineName);
  expect(identity(quarantinePath)).toEqual(expectedIdentity);
  expect(readFileSync(path.join(quarantinePath, 'owner.json'), 'utf8')).toBe(expectedOwnerBytes);
}

linuxTest('does not admit a callback after foreign reclaim-guard restoration fails', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reclaim-restore-admission-'));
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory('data', 'reclaim restore admission fixture');
  const parent = path.join(root, 'data');
  const lockName = 'admission.lock';
  const guardName = lockName + '.reclaim';
  const guard = createForeignGuard(parent, guardName);
  const guardIdentity = identity(path.join(parent, guardName));
  const restoreFailure = Object.assign(new Error('injected guard restore EIO'), { code: 'EIO' });
  const fault = failRestoreFor(nativeBinding(), guardName, restoreFailure);
  let callbackCalls = 0;
  let returned = false;
  let operationError: unknown;

  try {
    try {
      access.withExclusiveLock('data/admission', 'restore failure admission fixture', () => {
        callbackCalls += 1;
        return 'must not be returned';
      });
      returned = true;
    } catch (error) {
      operationError = error;
    }
  } finally {
    fault.restore();
    console.error(`retained reclaim-guard restoration fixture root: ${root}`);
  }

  expect(fault.quarantineNames()).toHaveLength(1);
  expect(callbackCalls).toBe(0);
  expect(returned).toBe(false);
  expect(operationError).toBeInstanceOf(Error);
  expect(operationError).not.toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(errorChain(operationError).includes(restoreFailure)).toBe(true);
  const quarantineName = fault.quarantineNames()[0];
  if (quarantineName === undefined) throw new Error('failed guard restoration did not retain quarantine identity');
  expectRetainedQuarantinedGuard(parent, guardName, quarantineName, guardIdentity, guard.bytes);
  expect(operationError).toMatchObject({ code: 'SAFE_REPOSITORY_LOCK_RESTORE_INCOMPLETE' });
  expect(lstatSync(path.join(parent, 'admission.lock'), { throwIfNoEntry: false })).toBeUndefined();

  const contender = requireSafeRepositoryAccess(root);
  let contenderCalls = 0;
  let contenderReturned = false;
  let contenderError: unknown;
  try {
    contender.withExclusiveLock('data/admission', 'quarantined guard contender', () => {
      contenderCalls += 1;
      return 'must remain blocked';
    });
    contenderReturned = true;
  } catch (error) {
    contenderError = error;
  }
  expect(contenderCalls).toBe(0);
  expect(contenderReturned).toBe(false);
  expect(contenderError).toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(contenderError).toMatchObject({
    name: 'SafeRepositoryLockPendingQuarantineError',
    code: 'SAFE_REPOSITORY_LOCK_CONTENTION',
  });
  expectRetainedQuarantinedGuard(parent, guardName, quarantineName, guardIdentity, guard.bytes);
  expect(lstatSync(path.join(parent, 'admission.lock'), { throwIfNoEntry: false })).toBeUndefined();
});

linuxTest('reports failed foreign guard restoration as incomplete release and withholds callback result', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reclaim-restore-release-'));
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory('data', 'reclaim restore release fixture');
  const parent = path.join(root, 'data');
  const lockName = 'release.lock';
  const guardName = lockName + '.reclaim';
  const restoreFailure = Object.assign(new Error('injected guard restore EIO'), { code: 'EIO' });
  const fault = failRestoreFor(nativeBinding(), guardName, restoreFailure);
  let callbackCalls = 0;
  let returned = false;
  let operationError: unknown;
  let lockBytes: Buffer<ArrayBuffer> | undefined;
  let lockIdentity: Identity | undefined;
  let guardIdentity: Identity | undefined;
  let guardBytes: string | undefined;

  try {
    try {
      access.withExclusiveLock('data/release', 'restore failure release fixture', () => {
        callbackCalls += 1;
        lockBytes = readFileSync(path.join(parent, 'release.lock'));
        lockIdentity = identity(path.join(parent, 'release.lock'));
        const guard = createForeignGuard(parent, guardName);
        guardBytes = guard.bytes;
        guardIdentity = identity(path.join(parent, guardName));
        return 'must not be returned';
      });
      returned = true;
    } catch (error) {
      operationError = error;
    }
  } finally {
    fault.restore();
    console.error(`retained reclaim-guard release fixture root: ${root}`);
  }

  expect(fault.quarantineNames()).toHaveLength(1);
  expect(callbackCalls).toBe(1);
  expect(returned).toBe(false);
  expect(operationError).toBeInstanceOf(Error);
  expect(operationError).not.toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(operationError).toMatchObject({ code: 'SAFE_REPOSITORY_LOCK_RESTORE_INCOMPLETE' });
  expect(errorChain(operationError).includes(restoreFailure)).toBe(true);
  if (lockBytes === undefined || lockIdentity === undefined || guardIdentity === undefined || guardBytes === undefined)
    throw new Error('release lock or foreign guard custody snapshot is incomplete');
  expect(readFileSync(path.join(parent, 'release.lock'))).toEqual(lockBytes);
  expect(identity(path.join(parent, 'release.lock'))).toEqual(lockIdentity);
  const quarantineName = fault.quarantineNames()[0];
  if (quarantineName === undefined) throw new Error('failed guard restoration did not retain quarantine identity');
  expectRetainedQuarantinedGuard(parent, guardName, quarantineName, guardIdentity, guardBytes);
});

linuxTest('preserves an unsafe foreign owner failure when restoring its guard also fails', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reclaim-restore-unsafe-owner-'));
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory('data', 'unsafe owner restoration fixture');
  const parent = path.join(root, 'data');
  const lockName = 'unsafe-owner.lock';
  const guardName = lockName + '.reclaim';
  const guardPath = path.join(parent, guardName);
  mkdirSync(guardPath, { mode: 0o700 });
  const ownerPath = path.join(guardPath, 'owner.json');
  const targetPath = path.join(parent, 'foreign-owner-target.json');
  const targetBytes = liveStaleOwner();
  writeFileSync(targetPath, targetBytes, { mode: 0o600 });
  utimesSync(targetPath, staleTime, staleTime);
  symlinkSync(targetPath, ownerPath);
  utimesSync(guardPath, staleTime, staleTime);
  const guardIdentity = identity(guardPath);
  const ownerLinkIdentity = identity(ownerPath);
  const restoreFailure = Object.assign(new Error('injected unsafe guard restore EIO'), { code: 'EIO' });
  const fault = failRestoreFor(nativeBinding(), guardName, restoreFailure);
  let callbackCalls = 0;
  let operationError: unknown;

  try {
    try {
      access.withExclusiveLock('data/unsafe-owner', 'unsafe owner restoration fixture', () => {
        callbackCalls += 1;
        return 'must not be returned';
      });
    } catch (error) {
      operationError = error;
    }
  } finally {
    fault.restore();
    console.error(`retained unsafe-owner restoration fixture root: ${root}`);
  }

  expect(fault.quarantineNames()).toHaveLength(1);
  expect(callbackCalls).toBe(0);
  expect(operationError).toBeInstanceOf(Error);
  expect(operationError).toMatchObject({ code: 'SAFE_REPOSITORY_LOCK_RESTORE_INCOMPLETE' });
  const errors = errorChain(operationError);
  expect(errors.includes(restoreFailure)).toBe(true);
  expect(errors.some((error) => error instanceof Error && /reclaim guard owner is unsafe/.test(error.message))).toBe(
    true,
  );
  const quarantineName = fault.quarantineNames()[0];
  if (quarantineName === undefined)
    throw new Error('failed unsafe-owner restoration did not retain quarantine identity');
  const quarantinePath = path.join(parent, quarantineName);
  expect(identity(quarantinePath)).toEqual(guardIdentity);
  expect(identity(path.join(quarantinePath, 'owner.json'))).toEqual(ownerLinkIdentity);
  expect(readFileSync(targetPath)).toEqual(Buffer.from(targetBytes));
  expect(readlinkSync(path.join(quarantinePath, 'owner.json'))).toBe(targetPath);
  expect(lstatSync(path.join(parent, 'unsafe-owner.lock'), { throwIfNoEntry: false })).toBeUndefined();
});

linuxTest('retains stale-lock reclaim and guard-release failures together with native custody', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-reclaim-restore-combined-'));
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory('data', 'combined reclaim failure fixture');
  const parent = path.join(root, 'data');
  const lockName = 'combined.lock';
  const lockPath = path.join(parent, lockName);
  const guardName = lockName + '.reclaim';
  const lockBytes = Buffer.from(
    JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: 2_147_483_647, label: 'fixture' }),
  );
  writeFileSync(lockPath, lockBytes, { mode: 0o600 });
  utimesSync(lockPath, staleTime, staleTime);
  const lockIdentity = identity(lockPath);
  const primaryFailure = Object.assign(new Error('injected stale lock quarantine EIO'), { code: 'EIO' });
  const cleanupFailure = Object.assign(new Error('injected reclaim guard release EIO'), { code: 'EIO' });
  const binding = nativeBinding();
  const original = binding.renameNoReplace;
  let lockFaults = 0;
  let guardFaults = 0;
  let guardEntries: string[] | undefined;
  let guardIdentity: Identity | undefined;
  let ownerBytes: Buffer<ArrayBuffer> | undefined;
  let ownerIdentity: Identity | undefined;
  const replacement = (...args: NativePathArgs): void => {
    const [, sourceRelPath, , targetRelPath] = args;
    if (
      lockFaults === 0 &&
      sourceRelPath === lockName &&
      targetRelPath.startsWith('.' + lockName + '.') &&
      targetRelPath.endsWith('.reclaimed')
    ) {
      lockFaults += 1;
      throw primaryFailure;
    }
    if (
      guardFaults === 0 &&
      sourceRelPath === guardName &&
      targetRelPath.startsWith('.' + guardName + '.') &&
      targetRelPath.endsWith('.released')
    ) {
      guardFaults += 1;
      const guardPath = path.join(parent, guardName);
      const ownerPath = path.join(guardPath, 'owner.json');
      guardEntries = readdirSync(guardPath).sort();
      guardIdentity = identity(guardPath);
      ownerBytes = readFileSync(ownerPath);
      ownerIdentity = identity(ownerPath);
      throw cleanupFailure;
    }
    original(...args);
  };
  if (!Reflect.set(binding, 'renameNoReplace', replacement))
    throw new Error('attested fs-safe native binding does not permit scoped rename fault injection');

  let callbackCalls = 0;
  let returned = false;
  let operationError: unknown;
  let bindingRestored = false;
  try {
    try {
      access.withExclusiveLock('data/combined', 'combined reclaim failure fixture', () => {
        callbackCalls += 1;
        return 'must not be returned';
      });
      returned = true;
    } catch (error) {
      operationError = error;
    }
  } finally {
    bindingRestored = Reflect.set(binding, 'renameNoReplace', original);
    console.error(`retained unresolved reclaim custody fixture root: ${root}`);
  }

  expect(bindingRestored).toBe(true);
  expect(lockFaults).toBe(1);
  expect(guardFaults).toBe(1);
  expect(callbackCalls).toBe(0);
  expect(returned).toBe(false);
  expect(operationError).toBeInstanceOf(Error);
  expect(operationError).not.toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(operationError).toBeInstanceOf(AggregateError);
  if (!(operationError instanceof AggregateError)) throw new Error('combined reclaim failure was not aggregated');
  expect(operationError.errors).toEqual([primaryFailure, cleanupFailure]);
  expect(operationError.cause).toBe(primaryFailure);
  expect(errorChain(operationError).includes(primaryFailure)).toBe(true);
  expect(errorChain(operationError).includes(cleanupFailure)).toBe(true);
  expect(readFileSync(lockPath)).toEqual(lockBytes);
  expect(identity(lockPath)).toEqual(lockIdentity);
  if (
    guardEntries === undefined ||
    guardIdentity === undefined ||
    ownerBytes === undefined ||
    ownerIdentity === undefined
  )
    throw new Error('reclaim guard custody snapshot is incomplete');
  expect(readdirSync(path.join(parent, guardName)).sort()).toEqual(guardEntries);
  expect(identity(path.join(parent, guardName))).toEqual(guardIdentity);
  expect(readFileSync(path.join(parent, guardName, 'owner.json'))).toEqual(ownerBytes);
  expect(identity(path.join(parent, guardName, 'owner.json'))).toEqual(ownerIdentity);
});
