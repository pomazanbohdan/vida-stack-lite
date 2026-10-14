import { expect, spyOn, test } from 'bun:test';
import * as fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.js';
import { readRepositoryTextImage, requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import {
  MAX_RUNTIME_PACKAGE_RESOURCE_BYTES,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.js';

test('source snapshots use one stable read per canonical path and retain absent entries', () => {
  const calls: string[] = [];
  const reader = {
    fileExists(): boolean {
      throw new Error('stable reader must not reopen existence lock');
    },
    readBytes(): Buffer {
      throw new Error('stable reader must not reopen byte lock');
    },
    readStableBytes(target: string): Buffer | null {
      calls.push(target);
      return target === 'absent.ts' ? null : Buffer.from('source bytes');
    },
  };
  const result = snapshotDeclaredSources(reader, ['present.ts', 'absent.ts']);
  expect(calls).toEqual(['absent.ts', 'present.ts']);
  expect(result.entries[0]).toEqual({ path: 'absent.ts', exists: false, bytes: null, sha256: null });
  expect(result.entries[1]).toMatchObject({ path: 'present.ts', exists: true, bytes: 12 });
  expect(result.digest).toBe(canonicalJsonDigest({ schema: 'ScopedSourceSnapshot/v1', entries: result.entries }));
  expect(Object.isFrozen(result.entries[0])).toBe(true);
  const present = result.entries[1];
  if (present?.exists !== true) throw new Error('present captured entry is unavailable');
  expect(present.sha256).toMatch(/^[a-f0-9]{64}$/u);
  expect(Object.isFrozen(present)).toBe(true);
  expect(Object.isFrozen(result.entries)).toBe(true);
  expect(Object.isFrozen(result)).toBe(true);
  const digest = result.digest;
  expect(Reflect.set(present, 'sha256', null)).toBe(false);
  expect(Reflect.set(present, 'exists', false)).toBe(false);
  expect(Reflect.set(result.entries, '0', present)).toBe(false);
  expect(Reflect.set(result, 'digest', 'changed')).toBe(false);
  expect(result.entries[0]?.exists).toBe(false);
  expect(result.entries[1]?.exists).toBe(true);
  expect(result.digest).toBe(digest);
  expect(result.digest).toBe(canonicalJsonDigest({ schema: result.schema, entries: result.entries }));
});

test('stable source snapshots retain exact per-file aggregate and canonical path bounds', () => {
  const bytes = Buffer.alloc(8 * 1024 * 1024);
  const reader = { fileExists: () => true, readBytes: () => bytes, readStableBytes: () => bytes };
  expect(snapshotDeclaredSources(reader, ['boundary.ts']).entries[0]?.bytes).toBe(bytes.length);
  expect(() =>
    snapshotDeclaredSources({ ...reader, readStableBytes: () => Buffer.alloc(bytes.length + 1) }, ['too-large.ts']),
  ).toThrow('per-file byte limit');
  const paths = Array.from({ length: 8 }, (_, index) => index + '.ts');
  expect(snapshotDeclaredSources(reader, paths).entries).toHaveLength(8);
  expect(() => snapshotDeclaredSources(reader, [...paths, 'extra.ts'])).toThrow('total byte limit');
  expect(() => snapshotDeclaredSources(reader, ['boundary.ts', 'boundary.ts'])).toThrow('duplicates');
  expect(() => snapshotDeclaredSources(reader, ['../foreign.ts'])).toThrow('canonical repository-relative');
});

const linuxTest = test.skipIf(process.platform !== 'linux');
function withNativeFixture(operation: (root: string, read: (target: string) => Buffer | null) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-stable-source-read-'));
  let observedSuccess = false;
  try {
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');
    const readStable = access.readStableBytes;
    if (!readStable) throw new Error('Linux stable read capability is unavailable');
    operation(root, (target) => readStable.call(access, target, 'native stable Source read'));
    observedSuccess = true;
  } finally {
    if (observedSuccess) rmSync(root, { recursive: true, force: true });
    else process.stderr.write('Retained failed or uncertain stable Source fixture: ' + root + '\n');
  }
}

test('native capture reads are bounded without CAS sidecars and deny unsafe aliases', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-read-only-capture-'));
  const outside = mkdtempSync(path.join(tmpdir(), 'vida-read-only-outside-'));
  try {
    writeFileSync(path.join(root, 'subject.txt'), 'exact bytes');
    writeFileSync(path.join(outside, 'foreign.txt'), 'foreign bytes');
    symlinkSync(path.join(outside, 'foreign.txt'), path.join(root, 'link.txt'));
    symlinkSync(outside, path.join(root, 'linked-directory'), 'dir');
    const access = requireSafeRepositoryAccess(root);
    const before = readdirSync(root).sort();
    expect(access.readCapturedBytes('subject.txt', 'read-only capture', 11)).toEqual(Buffer.from('exact bytes'));
    expect(() => access.readCapturedBytes('subject.txt', 'bounded capture', 10)).toThrow();
    expect(() => access.readCapturedBytes('link.txt', 'linked capture')).toThrow();
    expect(() => access.readCapturedBytes('linked-directory/foreign.txt', 'ancestor capture')).toThrow();
    expect(() => access.readCapturedBytes('../foreign.txt', 'escaped capture')).toThrow();
    expect(() => access.readCapturedBytes('subject.txt', 'invalid bound', 0)).toThrow();
    expect(() => access.readCapturedBytes('subject.txt', 'invalid bound', 8388609)).toThrow();
    expect(() => access.readCapturedBytes('subject.txt', 'invalid bound', 1.5)).toThrow();
    expect(readdirSync(root).sort()).toEqual(before);
    expect(readFileSync(path.join(root, 'subject.txt'), 'utf8')).toBe('exact bytes');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

linuxTest(
  'native text images use one stable operation and preserve exact Unicode absence and invalid UTF-8 denial',
  () => {
    withNativeFixture((root) => {
      const access = requireSafeRepositoryAccess(root);
      const stable = access.readStableBytes;
      if (!stable) throw new Error('Linux stable read capability is unavailable');
      const contents = '\uFEFFУкраїна';
      writeFileSync(path.join(root, 'text.txt'), contents);
      writeFileSync(path.join(root, 'invalid.txt'), Buffer.from([0xc3, 0x28]));
      const calls: string[] = [];
      const observed = {
        ...access,
        fileExists(): boolean {
          throw new Error('text image reopened existence lock');
        },
        readBytes(): Buffer {
          throw new Error('text image reopened byte lock');
        },
        readStableBytes(target: string, label: string): Buffer | null {
          expect(this).toBe(observed);
          calls.push(target);
          return stable.call(access, target, label);
        },
      };
      expect(readRepositoryTextImage(observed, 'text.txt', 'native text image')).toBe(contents);
      expect(readRepositoryTextImage(observed, 'absent-parent/text.txt', 'native text image')).toBeNull();
      expect(() => readRepositoryTextImage(observed, 'invalid.txt', 'native text image')).toThrow();
      expect(calls).toEqual(['text.txt', 'absent-parent/text.txt', 'invalid.txt']);
      expect(readFileSync(path.join(root, 'invalid.txt'))).toEqual(Buffer.from([0xc3, 0x28]));
    });
  },
);

linuxTest('native text image fallback retains existence byte reads empty text and invalid UTF-8 denial', () => {
  withNativeFixture((root) => {
    const access = requireSafeRepositoryAccess(root);
    const { readStableBytes, ...fallback } = access;
    expect(readStableBytes).toBeDefined();
    writeFileSync(path.join(root, 'empty.txt'), '');
    writeFileSync(path.join(root, 'text.txt'), '\uFEFFУкраїна');
    writeFileSync(path.join(root, 'invalid.txt'), Buffer.from([0xc3, 0x28]));
    expect(readRepositoryTextImage(fallback, 'absent.txt', 'native fallback')).toBeNull();
    expect(readRepositoryTextImage(fallback, 'empty.txt', 'native fallback')).toBe('');
    expect(readRepositoryTextImage(fallback, 'text.txt', 'native fallback')).toBe('\uFEFFУкраїна');
    expect(() => readRepositoryTextImage(fallback, 'invalid.txt', 'native fallback')).toThrow();
  });
});

linuxTest('native stable Source reader retains existing nested and absent bytes and releases its locks', () => {
  withNativeFixture((root, read) => {
    mkdirSync(path.join(root, 'nested'));
    writeFileSync(path.join(root, 'nested/source.ts'), 'owned Source bytes');
    expect(read('nested/source.ts')).toEqual(Buffer.from('owned Source bytes'));
    expect(read('nested/absent.ts')).toBeNull();
    expect(read('absent-parent/source.ts')).toBeNull();
    expect(existsSync(path.join(root, 'nested/.source.ts.cas.lock'))).toBe(false);
    expect(existsSync(path.join(root, 'nested/.absent.ts.cas.lock'))).toBe(false);
    const access = requireSafeRepositoryAccess(root);
    expect(snapshotDeclaredSources(access, ['nested/source.ts', 'nested/absent.ts']).entries).toEqual(
      snapshotDeclaredSources({ fileExists: access.fileExists, readBytes: access.readBytes }, [
        'nested/source.ts',
        'nested/absent.ts',
      ]).entries,
    );
  });
});

linuxTest('native stable Source reader rejects unsafe links and unresolved backups without changing bytes', () => {
  withNativeFixture((root, read) => {
    const source = path.join(root, 'source.ts');
    writeFileSync(source, 'protected');
    symlinkSync(source, path.join(root, 'linked.ts'));
    expect(() => read('linked.ts')).toThrow();
    linkSync(source, path.join(root, 'hard.ts'));
    expect(() => read('hard.ts')).toThrow();
    rmSync(path.join(root, 'hard.ts'));
    const backup = path.join(root, '.source.ts.' + randomUUID() + '.cas-old');
    writeFileSync(backup, 'unresolved private bytes');
    expect(() => read('source.ts')).toThrow('unresolved private backup');
    expect(readFileSync(backup, 'utf8')).toBe('unresolved private bytes');
    expect(readFileSync(source, 'utf8')).toBe('protected');
    expect(existsSync(path.join(root, '.source.ts.cas.lock'))).toBe(false);
  });
});

linuxTest('native stable Source reader preserves an API-owned live CAS lock and succeeds only after release', () => {
  withNativeFixture((root, read) => {
    writeFileSync(path.join(root, 'source.ts'), 'protected');
    const access = requireSafeRepositoryAccess(root);
    const ownerPath = path.join(root, '.source.ts.cas.lock');
    access.withExclusiveLock('.source.ts.cas', 'actual retained CAS owner', () => {
      const ownerBytes = readFileSync(ownerPath);
      const owner = lstatSync(ownerPath);
      expect(() => read('source.ts')).toThrow();
      expect(readFileSync(ownerPath)).toEqual(ownerBytes);
      expect(lstatSync(ownerPath).ino).toBe(owner.ino);
      expect(readFileSync(path.join(root, 'source.ts'), 'utf8')).toBe('protected');
    });
    expect(existsSync(ownerPath)).toBe(false);
    expect(read('source.ts')).toEqual(Buffer.from('protected'));
  });
});

test('runtime snapshots retain logical bundle identities while forwarding stable physical reads', () => {
  const calls: string[] = [];
  const reader = {
    fileExists(): boolean {
      throw new Error('runtime stable reader must not reopen existence lock');
    },
    readBytes(): Buffer {
      throw new Error('runtime stable reader must not reopen byte lock');
    },
    readStableBytes(target: string): Buffer {
      calls.push(target);
      return Buffer.from(target);
    },
  };
  const result = snapshotRuntimePackageSources(reader, 'runtime-package', ['runtime-package/bin/a.ts']);
  expect(calls).toEqual(['bin/a.ts']);
  expect(result.entries[0]).toMatchObject({ path: 'runtime-package/bin/a.ts', exists: true, bytes: 8 });
  expect(() => snapshotRuntimePackageSources(reader, 'runtime-package', ['foreign/bin/a.ts'])).toThrow(
    'outside the configured package identity',
  );
  expect(calls).toEqual(['bin/a.ts']);
});

test('runtime snapshots prefer a fresh verified package read and bind it to the runtime reader', () => {
  const calls: string[] = [];
  let stableCalls = 0;
  let contents = Buffer.from('first package bytes');
  const reader = {
    fileExists(): boolean {
      throw new Error('runtime verified capture must not check mutable existence');
    },
    readBytes(): Buffer {
      throw new Error('runtime verified capture must not use mutable byte reads');
    },
    readStableBytes(): Buffer | null {
      stableCalls += 1;
      return Buffer.from(contents);
    },
    readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
      expect(this).toBe(reader);
      calls.push(`${target}:${label}:${maxBytes ?? 'default'}`);
      return contents;
    },
  };
  const first = snapshotRuntimePackageSources(reader, 'runtime-package', ['runtime-package/bin/a.ts']);
  contents = Buffer.from('changed package bytes');
  const second = snapshotRuntimePackageSources(reader, 'runtime-package', ['runtime-package/bin/a.ts']);

  expect(stableCalls).toBe(0);
  expect(calls).toEqual([
    `bin/a.ts:scoped source stable read:${MAX_RUNTIME_PACKAGE_RESOURCE_BYTES}`,
    `bin/a.ts:scoped source stable read:${MAX_RUNTIME_PACKAGE_RESOURCE_BYTES}`,
  ]);
  expect(first.entries[0]).toMatchObject({ path: 'runtime-package/bin/a.ts', exists: true, bytes: 19 });
  expect(second.entries[0]).toMatchObject({ path: 'runtime-package/bin/a.ts', exists: true, bytes: 21 });
  expect(second.entries[0]?.sha256).not.toBe(first.entries[0]?.sha256);
  expect(second.digest).not.toBe(first.digest);
});

test('declared source snapshots keep cooperative stable-read behavior when verified capture is available', () => {
  const calls: string[] = [];
  const reader = {
    fileExists: () => true,
    readBytes: () => Buffer.from('mutable bytes'),
    readStableBytes(target: string): Buffer {
      calls.push(target);
      return Buffer.from('stable bytes');
    },
    readVerifiedCaptureBytes(): Buffer {
      throw new Error('declared source snapshot must not use runtime verified capture');
    },
  };

  const result = snapshotDeclaredSources(reader, ['task/source.ts']);
  expect(calls).toEqual(['task/source.ts']);
  expect(result.entries[0]).toMatchObject({ path: 'task/source.ts', exists: true, bytes: 12 });
});

test('runtime verified capture propagates missing and unsafe errors without mutable fallback', () => {
  const calls: string[] = [];
  let legacyCalls = 0;
  const reader = {
    fileExists(): boolean {
      legacyCalls++;
      return false;
    },
    readBytes(): Buffer {
      legacyCalls++;
      return Buffer.from('fallback');
    },
    readStableBytes(): Buffer | null {
      legacyCalls++;
      return null;
    },
    readVerifiedCaptureBytes(target: string): Buffer {
      calls.push(target);
      throw new Error(target === 'absent.ts' ? 'ENOENT verified absence' : 'unsafe verified capture');
    },
  };

  expect(() => snapshotRuntimePackageSources(reader, 'runtime-package', ['runtime-package/absent.ts'])).toThrow(
    'ENOENT verified absence',
  );
  expect(() => snapshotRuntimePackageSources(reader, 'runtime-package', ['runtime-package/link.ts'])).toThrow(
    'unsafe verified capture',
  );
  expect(calls).toEqual(['absent.ts', 'link.ts']);
  expect(legacyCalls).toBe(0);
});

test('runtime package verified reads retain per-file byte bounds', () => {
  const tooLarge = Buffer.alloc(8 * 1024 * 1024 + 1);
  let calls = 0;
  const reader = {
    fileExists: () => true,
    readBytes: () => tooLarge,
    readVerifiedCaptureBytes: () => {
      calls++;
      return tooLarge;
    },
  };
  expect(() => snapshotRuntimePackageSources(reader, 'runtime-package', ['runtime-package/large.ts'])).toThrow(
    'per-file byte limit',
  );
  expect(calls).toBe(1);
});

linuxTest('runtime package verified reads are read-only and fail closed around retained CAS recovery state', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-runtime-verified-capture-'));
  const sourceBytes = Buffer.from('retained exact bytes');
  let observedSuccess = false;
  try {
    writeFileSync(path.join(root, 'module.ts'), sourceBytes);
    const access = requireSafeRepositoryAccess(root);
    if (!access.readVerifiedCaptureBytes) throw new Error('Linux verified capture capability is unavailable');
    const limits: Array<number | undefined> = [];
    const reader = {
      ...access,
      fileExists(): boolean {
        throw new Error('runtime capture called fileExists');
      },
      readBytes(): Buffer {
        throw new Error('runtime capture called readBytes');
      },
      readStableBytes(): Buffer | null {
        throw new Error('runtime capture called readStableBytes');
      },
      readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
        limits.push(maxBytes);
        return access.readVerifiedCaptureBytes!.call(access, target, label, maxBytes);
      },
    };
    const capture = () => snapshotRuntimePackageSources(reader, 'runtime-package', ['runtime-package/module.ts']);
    const snapshot = capture();
    expect(snapshot.entries[0]).toMatchObject({
      path: 'runtime-package/module.ts',
      exists: true,
      bytes: sourceBytes.length,
    });
    const rootEntries = readdirSync(root).sort();
    const writes = spyOn(fs, 'writeSync');
    const syncs = spyOn(fs, 'fsyncSync');
    try {
      expect(() => capture()).not.toThrow();
      expect(writes).not.toHaveBeenCalled();
      expect(syncs).not.toHaveBeenCalled();
      expect(readdirSync(root).sort()).toEqual(rootEntries);

      const lockPath = path.join(root, '.module.ts.cas.lock');
      access.withExclusiveLock('.module.ts.cas', 'runtime capture retained active owner', () => {
        const lockBytes = readFileSync(lockPath);
        const lockIdentity = lstatSync(lockPath, { bigint: true });
        expect(() => capture()).toThrow('active CAS writer');
        expect(readFileSync(lockPath)).toEqual(lockBytes);
        const lockAfter = lstatSync(lockPath, { bigint: true });
        expect(lockAfter.dev).toBe(lockIdentity.dev);
        expect(lockAfter.ino).toBe(lockIdentity.ino);
      });

      const guardPath = path.join(root, '.module.ts.cas.lock.reclaim');
      mkdirSync(guardPath);
      const ownerPath = path.join(guardPath, 'owner.json');
      writeFileSync(ownerPath, '{"schema":"retained"}');
      const guardIdentity = lstatSync(guardPath, { bigint: true });
      const ownerBytes = readFileSync(ownerPath);
      const ownerIdentity = lstatSync(ownerPath, { bigint: true });
      expect(() => capture()).toThrow('CAS reclaim is active');
      expect(readFileSync(ownerPath)).toEqual(ownerBytes);
      const guardAfter = lstatSync(guardPath, { bigint: true });
      const ownerAfter = lstatSync(ownerPath, { bigint: true });
      expect(guardAfter.dev).toBe(guardIdentity.dev);
      expect(guardAfter.ino).toBe(guardIdentity.ino);
      expect(ownerAfter.dev).toBe(ownerIdentity.dev);
      expect(ownerAfter.ino).toBe(ownerIdentity.ino);
      rmSync(guardPath, { recursive: true });

      const backupPath = path.join(root, '.module.ts.' + randomUUID() + '.cas-old');
      writeFileSync(backupPath, 'retained backup bytes');
      const backupBytes = readFileSync(backupPath);
      const backupIdentity = lstatSync(backupPath, { bigint: true });
      expect(() => capture()).toThrow('unresolved private backup');
      expect(readFileSync(backupPath)).toEqual(backupBytes);
      const backupAfter = lstatSync(backupPath, { bigint: true });
      expect(backupAfter.dev).toBe(backupIdentity.dev);
      expect(backupAfter.ino).toBe(backupIdentity.ino);
      rmSync(backupPath);

      const quarantinePath = path.join(root, '..module.ts.cas.lock.' + randomUUID() + '.reclaimed');
      writeFileSync(quarantinePath, 'retained quarantine bytes');
      const quarantineBytes = readFileSync(quarantinePath);
      const quarantineIdentity = lstatSync(quarantinePath, { bigint: true });
      expect(() => capture()).toThrow('quarantine');
      expect(readFileSync(quarantinePath)).toEqual(quarantineBytes);
      const quarantineAfter = lstatSync(quarantinePath, { bigint: true });
      expect(quarantineAfter.dev).toBe(quarantineIdentity.dev);
      expect(quarantineAfter.ino).toBe(quarantineIdentity.ino);
      expect(readFileSync(path.join(root, 'module.ts'))).toEqual(sourceBytes);
      expect(limits.length).toBeGreaterThan(0);
      expect(limits.every((limit) => limit === MAX_RUNTIME_PACKAGE_RESOURCE_BYTES)).toBe(true);
    } finally {
      writes.mockRestore();
      syncs.mockRestore();
    }
    observedSuccess = true;
  } finally {
    if (observedSuccess) rmSync(root, { recursive: true, force: true });
    else process.stderr.write('Retained failed or uncertain runtime verified capture fixture: ' + root + '\n');
  }
});

test('source snapshot fallback preserves appearance disappearance and byte drift rejection', () => {
  let existence = 0;
  expect(() =>
    snapshotDeclaredSources(
      {
        fileExists: () => ++existence === 2,
        readBytes: () => Buffer.from('unused'),
      },
      ['source.ts'],
    ),
  ).toThrow('appeared during snapshot');
  expect(existence).toBe(2);
  existence = 0;
  expect(() =>
    snapshotDeclaredSources(
      {
        fileExists: () => ++existence === 1,
        readBytes: () => Buffer.from('first'),
      },
      ['source.ts'],
    ),
  ).toThrow('disappeared during snapshot');
  let reads = 0;
  expect(() =>
    snapshotDeclaredSources(
      {
        fileExists: () => true,
        readBytes: () => Buffer.from(++reads === 1 ? 'before' : 'after'),
      },
      ['source.ts'],
    ),
  ).toThrow('changed during snapshot');
  expect(reads).toBe(2);
});
