import { expect, test } from 'bun:test';
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
import { snapshotDeclaredSources, snapshotRuntimePackageSources } from '../src/orchestration/scoped-source-snapshot.js';

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
  try {
    const access = requireSafeRepositoryAccess(root);
    expect(access.provider).toBe('linux-proc-fd');
    const readStable = access.readStableBytes;
    if (!readStable) throw new Error('Linux stable read capability is unavailable');
    operation(root, (target) => readStable.call(access, target, 'native stable Source read'));
  } finally {
    rmSync(root, { recursive: true, force: true });
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
