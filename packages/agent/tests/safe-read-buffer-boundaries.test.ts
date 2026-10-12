import { expect, spyOn, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { BufferView, NonSharedBuffer } from 'node:buffer';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
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
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.ts';

const maximumReadBytes = 8 * 1024 * 1024;

function createRepositoryFixture(): string {
  return mkdtempSync(path.join(tmpdir(), 'vida-safe-read-bounds-'));
}

test.skipIf(process.platform !== 'linux')(
  'locked readBytes reuses its owned parent descriptor for target capture',
  () => {
    const root = createRepositoryFixture();
    writeFileSync(path.join(root, 'owned-parent.bin'), Buffer.from([0, 255, 4]));
    const originalOpen = fs.openSync;
    let rootOpens = 0;
    const opens = spyOn(fs, 'openSync').mockImplementation((...args: Parameters<typeof fs.openSync>) => {
      if (args[0] === root) rootOpens++;
      return originalOpen(...args);
    });
    let passed = false;
    try {
      const access = requireSafeRepositoryAccess(root);
      const actual = access.readBytes('owned-parent.bin', 'owned parent fixture');
      expect(actual).toEqual(Buffer.from([0, 255, 4]));
      expect(rootOpens).toBe(1);
      expect(fs.readdirSync(root)).toEqual(['owned-parent.bin']);
      const ownerPath = path.join(root, '.owned-parent.bin.cas.lock');
      access.withExclusiveLock('.owned-parent.bin.cas', 'retained read owner fixture', () => {
        const ownerBytes = fs.readFileSync(ownerPath);
        expect(() => access.readBytes('owned-parent.bin', 'competing read fixture')).toThrow();
        expect(fs.readFileSync(ownerPath)).toEqual(ownerBytes);
        expect([...fs.readFileSync(path.join(root, 'owned-parent.bin'))]).toEqual([...actual]);
      });
      const backup = path.join(root, '.owned-parent.bin.00000000-0000-4000-8000-000000000001.cas-old');
      writeFileSync(backup, 'unresolved owned backup');
      expect(() => access.readBytes('owned-parent.bin', 'unresolved read fixture')).toThrow(
        'unresolved private backup',
      );
      expect(fs.readFileSync(backup, 'utf8')).toBe('unresolved owned backup');
      expect(fs.existsSync(ownerPath)).toBe(false);
      rmSync(backup);
      expect(access.readBytes('owned-parent.bin', 'released read fixture')).toEqual(actual);
      passed = true;
    } finally {
      opens.mockRestore();
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error(`safe-read fixture retained at ${root}`);
    }
  },
);

for (const scenario of [
  { method: 'readStableBytes', present: true },
  { method: 'readStableBytes', present: false },
  { method: 'readBytes', present: true },
  { method: 'readText', present: true },
  { method: 'fileExists', present: true },
  { method: 'fileExists', present: false },
] as const) {
  const { method, present } = scenario;
  test.skipIf(process.platform !== 'linux')(
    `${method} retains its locked namespace when the root is replaced (${present ? 'present' : 'absent'})`,
    () => {
      const root = createRepositoryFixture();
      const retainedRoot = root + '.owned';
      const target = 'namespace.bin';
      const ownedBytes = Buffer.from([0, 255, 17]);
      const replacementBytes = Buffer.from('replacement namespace');
      if (present) writeFileSync(path.join(root, target), ownedBytes);
      const access = requireSafeRepositoryAccess(root);
      const read: ((target: string, label: string) => string | Buffer | boolean | null) | undefined = access[method];
      if (!read) throw new Error('Linux stable read capability is unavailable');
      const originalOpen = fs.openSync;
      let rootOpens = 0;
      let replaced = false;
      const opens = spyOn(fs, 'openSync').mockImplementation((...args: Parameters<typeof fs.openSync>) => {
        if (args[0] === root) rootOpens++;
        const fd = originalOpen(...args);
        if (!replaced && typeof args[0] === 'string' && args[0].endsWith('/.' + target + '.cas.lock')) {
          replaced = true;
          // Actual directory descriptors retain the moved inode; only pathname consumers see the replacement.
          fs.renameSync(root, retainedRoot);
          fs.mkdirSync(root);
          writeFileSync(path.join(root, target), replacementBytes);
        }
        return fd;
      });
      let passed = false;
      try {
        const result = read.call(access, target, 'locked namespace fixture');
        expect(replaced).toBe(true);
        expect(result).toEqual(
          method === 'fileExists'
            ? present
            : method === 'readText'
              ? ownedBytes.toString('utf8')
              : present
                ? ownedBytes
                : null,
        );
        expect(rootOpens).toBe(1);
        expect(fs.readFileSync(path.join(root, target))).toEqual(replacementBytes);
        expect(fs.readdirSync(root)).toEqual([target]);
        expect(fs.readdirSync(retainedRoot)).toEqual(present ? [target] : []);
        if (present) expect(fs.readFileSync(path.join(retainedRoot, target))).toEqual(ownedBytes);
        passed = true;
      } finally {
        opens.mockRestore();
        if (passed) {
          rmSync(root, { recursive: true, force: true });
          rmSync(retainedRoot, { recursive: true, force: true });
        } else console.error(`stable-read namespace fixture retained at ${root} and ${retainedRoot}`);
      }
    },
  );
}

// Inject only the owned regular file's syscall. CAS lock-owner reads and
// descriptor cleanup keep their actual filesystem behavior.
function interceptTargetRead(
  target: string,
  fault: (read: (limit?: number) => number, buffer: NodeJS.ArrayBufferView) => number,
) {
  const originalRead = fs.readSync;
  const originalStat = fs.fstatSync;
  const identity = fs.statSync(target);
  return spyOn(fs, 'readSync').mockImplementation(
    (
      fd: number,
      buffer: NodeJS.ArrayBufferView,
      offsetOrOptions?: number | fs.ReadOptions,
      length?: number,
      position?: fs.ReadPosition | null,
    ): number => {
      const read = (limit?: number): number => {
        if (typeof offsetOrOptions === 'number')
          return originalRead(
            fd,
            buffer,
            offsetOrOptions,
            Math.min(length ?? buffer.byteLength - offsetOrOptions, limit ?? Infinity),
            position ?? null,
          );
        const options = offsetOrOptions ?? {};
        return originalRead(fd, buffer, {
          ...options,
          length: Math.min(options.length ?? buffer.byteLength - (options.offset ?? 0), limit ?? Infinity),
        });
      };
      const descriptor = originalStat(fd);
      return descriptor.dev === identity.dev && descriptor.ino === identity.ino ? fault(read, buffer) : read();
    },
  );
}

for (const scenario of ['appeared', 'disappeared', 'changed', 'read-error'] as const) {
  test.skipIf(process.platform !== 'linux')(
    `stable read rejects same-parent ${scenario} without losing custody`,
    () => {
      const root = createRepositoryFixture();
      const target = path.join(root, 'drift.bin');
      const initial = Buffer.from('protected');
      const changed = Buffer.from('changed!!');
      const failure = Object.assign(new Error('stable target read failed'), { code: 'EIO' });
      if (scenario !== 'appeared') writeFileSync(target, initial);
      const originalOpen = fs.openSync;
      let rootOpens = 0;
      let faulted = false;
      const opens = spyOn(fs, 'openSync').mockImplementation((...args: Parameters<typeof fs.openSync>) => {
        if (args[0] === root) rootOpens++;
        try {
          return originalOpen(...args);
        } catch (error) {
          if (
            scenario === 'appeared' &&
            !faulted &&
            typeof args[0] === 'string' &&
            args[0].endsWith('/drift.bin') &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'
          ) {
            faulted = true;
            writeFileSync(target, changed);
          }
          throw error;
        }
      });
      const reads =
        scenario === 'appeared'
          ? undefined
          : interceptTargetRead(target, (read) => {
              const count = read();
              if (!faulted && count > 0) {
                faulted = true;
                if (scenario === 'disappeared') rmSync(target);
                else if (scenario === 'changed') writeFileSync(target, changed);
                else throw failure;
              }
              return count;
            });
      let passed = false;
      try {
        const access = requireSafeRepositoryAccess(root);
        const stableRead = access.readStableBytes;
        if (!stableRead) throw new Error('Linux stable read capability is unavailable');
        let caught: unknown;
        try {
          stableRead.call(access, 'drift.bin', 'same-parent stable fixture');
        } catch (error) {
          caught = error;
        }
        expect(faulted).toBe(true);
        if (scenario === 'read-error') expect(caught).toBe(failure);
        else {
          expect(caught).toBeInstanceOf(Error);
          if (!(caught instanceof Error)) throw new Error('stable read did not reject the drift');
          expect(caught.message).toContain(`scoped source ${scenario} during snapshot`);
        }
        expect(rootOpens).toBe(1);
        expect(fs.readdirSync(root)).toEqual(scenario === 'disappeared' ? [] : ['drift.bin']);
        if (scenario !== 'disappeared')
          expect(fs.readFileSync(target)).toEqual(scenario === 'read-error' ? initial : changed);
        passed = true;
      } finally {
        reads?.mockRestore();
        opens.mockRestore();
        if (passed) rmSync(root, { recursive: true, force: true });
        else console.error(`stable-read drift fixture retained at ${root}`);
      }
    },
  );
}

test.skipIf(process.platform !== 'linux')(
  'owned lock removal reuses its read descriptor and rereads the owner after rename',
  () => {
    const root = createRepositoryFixture();
    const owner = path.join(root, 'owned-resource.lock');
    const originalOpen = fs.openSync;
    let quarantineOpens = 0;
    let ownerReads = 0;
    const state: { reads?: ReturnType<typeof interceptTargetRead> } = {};
    const opens = spyOn(fs, 'openSync').mockImplementation((...args: Parameters<typeof fs.openSync>) => {
      if (typeof args[0] === 'string' && /[.]owned-resource[.]lock[.][0-9a-f-]{36}[.]reclaimed$/.test(args[0]))
        quarantineOpens++;
      return originalOpen(...args);
    });
    let passed = false;
    try {
      requireSafeRepositoryAccess(root).withExclusiveLock('owned-resource', 'owned removal fixture', () => {
        state.reads = interceptTargetRead(owner, (read) => {
          ownerReads++;
          return read();
        });
      });
      expect(quarantineOpens).toBe(0);
      // Both pre-rename and post-rename owner captures read the payload and EOF.
      expect(ownerReads).toBe(4);
      expect(fs.readdirSync(root)).toEqual([]);
      passed = true;
    } finally {
      state.reads?.mockRestore();
      opens.mockRestore();
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error(`safe-read fixture retained at ${root}`);
    }
  },
);

test.skipIf(process.platform !== 'linux')(
  'borrowed lock descriptor rereads changed ownership after quarantine rename',
  () => {
    const root = createRepositoryFixture();
    const originalStat = fs.lstatSync;
    const foreignPayload = JSON.stringify({
      schema: 'SafeRepositoryAccessLock/v1',
      owner_pid: 2147483647,
      label: 'changed owner',
    });
    let changed = false;
    const stats = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
      if (
        !changed &&
        typeof args[0] === 'string' &&
        /[.]owned-resource[.]lock[.][0-9a-f-]{36}[.]reclaimed$/.test(args[0])
      ) {
        changed = true;
        writeFileSync(args[0], foreignPayload);
      }
      return originalStat(...args);
    }) as typeof fs.lstatSync);
    let passed = false;
    try {
      const access = requireSafeRepositoryAccess(root);
      expect(access.withExclusiveLock('owned-resource', 'changed ownership fixture', () => 'completed')).toBe(
        'completed',
      );
      expect(changed).toBe(true);
      expect(fs.readFileSync(path.join(root, 'owned-resource.lock'), 'utf8')).toBe(foreignPayload);
      expect(fs.readdirSync(root)).toEqual(['owned-resource.lock']);
      passed = true;
    } finally {
      stats.mockRestore();
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error(`safe-read fixture retained at ${root}`);
    }
  },
);

test.skipIf(process.platform !== 'linux')('stale lock reclamation reuses its pinned read descriptor', () => {
  const root = createRepositoryFixture();
  const owner = path.join(root, 'stale-resource.lock');
  writeFileSync(
    owner,
    JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: 2147483647, label: 'dead owner' }),
  );
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(owner, old, old);
  const originalOpen = fs.openSync;
  let quarantineOpens = 0;
  let ownerReads = 0;
  const reads = interceptTargetRead(owner, (read) => {
    ownerReads++;
    return read();
  });
  const opens = spyOn(fs, 'openSync').mockImplementation((...args: Parameters<typeof fs.openSync>) => {
    if (typeof args[0] === 'string' && /[.]stale-resource[.]lock[.][0-9a-f-]{36}[.]reclaimed$/.test(args[0]))
      quarantineOpens++;
    return originalOpen(...args);
  });
  let passed = false;
  try {
    expect(
      requireSafeRepositoryAccess(root).withExclusiveLock('stale-resource', 'stale removal fixture', () => 'reclaimed'),
    ).toBe('reclaimed');
    expect(quarantineOpens).toBe(0);
    expect(ownerReads).toBe(4);
    expect(fs.readdirSync(root)).toEqual([]);
    passed = true;
  } finally {
    reads.mockRestore();
    opens.mockRestore();
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`safe-read fixture retained at ${root}`);
  }
});

for (const scenario of ['release', 'stale', 'guard']) {
  test.skipIf(process.platform !== 'linux')(`lock ${scenario} denies actual FIFO replacement without blocking`, () => {
    const root = createRepositoryFixture();
    let passed = false;
    try {
      const child = spawnSync(
        process.execPath,
        [
          '--no-env-file',
          '--no-install',
          fileURLToPath(new URL('./helpers/lock-fifo-fixture.ts', import.meta.url)),
          root,
          scenario,
        ],
        {
          encoding: 'utf8',
          timeout: 2000,
          killSignal: 'SIGKILL',
          maxBuffer: 65536,
          env: { PATH: process.env.PATH ?? '' },
        },
      );
      if (child.error || child.signal || child.status !== 0)
        console.error(
          JSON.stringify({
            root,
            scenario,
            status: child.status,
            signal: child.signal,
            error: child.error?.message,
            stdout: child.stdout,
            stderr: child.stderr,
          }),
        );
      expect(child.error).toBeUndefined();
      expect(child.signal).toBeNull();
      expect(child.status).toBe(0);
      expect(child.stderr).toBe('');
      expect(JSON.parse(child.stdout.trimEnd().split('\n').at(-1) ?? '')).toEqual({
        schema: 'LockFifoDenied/v1',
        scenario,
        denied: true,
        replacement_kind: 'fifo',
        original_payload_preserved: true,
        guard_released: scenario !== 'guard',
      });
      passed = true;
    } finally {
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error(`safe-read FIFO fixture retained at ${root}`);
    }
  });
}

test.skipIf(process.platform !== 'linux')('readBytes bounds backing storage through fragmented actual syscalls', () => {
  const root = createRepositoryFixture();
  const target = path.join(root, 'fragmented-storage.bin');
  const expected = Buffer.alloc(256 * 1024, 0xa7);
  writeFileSync(target, expected);
  const backingStores = new Set<ArrayBufferLike>();
  let storageBytes = 0;
  let intercepted = 0;
  const reads = interceptTargetRead(target, (read, buffer) => {
    intercepted++;
    if (!backingStores.has(buffer.buffer)) {
      backingStores.add(buffer.buffer);
      storageBytes += buffer.buffer.byteLength;
      expect(storageBytes).toBeLessThanOrEqual(expected.byteLength + 65536);
    }
    return read(16);
  });
  let passed = false;
  try {
    const actual = requireSafeRepositoryAccess(root).readBytes('fragmented-storage.bin', 'fragmented storage fixture');
    expect(actual).toEqual(expected);
    expect(intercepted).toBeGreaterThan(expected.byteLength / 16);
    expect(storageBytes).toBeLessThanOrEqual(expected.byteLength + 65536);
    expect(fs.readdirSync(root)).toEqual(['fragmented-storage.bin']);
    passed = true;
  } finally {
    reads.mockRestore();
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`safe-read fixture retained at ${root}`);
  }
});

test.skipIf(process.platform !== 'linux')('Git marker probes remain advisory and deny metadata access', () => {
  const root = createRepositoryFixture();
  const marker = path.join(root, '.git');
  let passed = false;
  try {
    const access = requireSafeRepositoryAccess(root);
    expect(access.fileExists('.git', 'absent Git marker')).toBe(false);
    writeFileSync(marker, 'gitdir: fixture-only');
    expect(access.fileExists('.git', 'worktree Git marker')).toBe(true);
    expect(() => access.readText('.git', 'marker bytes')).toThrow('unsafe path segment');
    expect(fs.readdirSync(root)).toEqual(['.git']);
    rmSync(marker);
    fs.mkdirSync(marker);
    writeFileSync(path.join(marker, 'config'), 'private metadata');
    expect(access.fileExists('.git', 'directory Git marker')).toBe(true);
    expect(() => access.fileExists('.git/config', 'metadata existence')).toThrow('unsafe path segment');
    expect(() => access.readText('.git/config', 'metadata bytes')).toThrow('unsafe path segment');
    expect(() => access.fileExists('.GIT/config', 'mixed case metadata')).toThrow('unsafe path segment');
    expect(fs.readdirSync(root)).toEqual(['.git']);
    expect(fs.readFileSync(path.join(marker, 'config'), 'utf8')).toBe('private metadata');
    rmSync(marker, { recursive: true });
    fs.mkdirSync(path.join(root, 'foreign-marker'));
    fs.symlinkSync(path.join(root, 'foreign-marker'), marker);
    expect(() => access.fileExists('.git', 'symlink marker')).toThrow();
    expect(fs.lstatSync(marker).isSymbolicLink()).toBe(true);
    expect(fs.readdirSync(root).sort()).toEqual(['.git', 'foreign-marker']);
    writeFileSync(path.join(root, 'ordinary.txt'), 'ordinary payload');
    access.withExclusiveLock('.ordinary.txt.cas', 'ordinary probe owner', () => {
      const owner = path.join(root, '.ordinary.txt.cas.lock');
      const ownerBytes = fs.readFileSync(owner);
      expect(() => access.fileExists('ordinary.txt', 'contended ordinary probe')).toThrow();
      expect(fs.readFileSync(owner)).toEqual(ownerBytes);
      expect(fs.readFileSync(path.join(root, 'ordinary.txt'), 'utf8')).toBe('ordinary payload');
    });
    expect(access.fileExists('ordinary.txt', 'released ordinary probe')).toBe(true);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`safe-read marker fixture retained at ${root}`);
  }
});

test.skipIf(process.platform !== 'linux')('readBytes reaches EOF through thousands of actual short syscalls', () => {
  const root = createRepositoryFixture();
  const target = path.join(root, 'short-syscalls.bin');
  const expected = Buffer.alloc(maximumReadBytes, 0xa7);
  writeFileSync(target, expected);
  let intercepted = 0;
  const reads = interceptTargetRead(target, (read) => {
    intercepted += 1;
    return read(1024);
  });
  let passed = false;
  try {
    const actual = requireSafeRepositoryAccess(root).readBytes('short-syscalls.bin', 'short syscall fixture');
    expect(actual.byteLength).toBe(expected.byteLength);
    expect(actual.equals(expected)).toBe(true);
    expect(intercepted).toBeGreaterThan(maximumReadBytes / 1024);
    passed = true;
  } finally {
    reads.mockRestore();
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`safe-read fixture retained at ${root}`);
  }
});

test.skipIf(process.platform !== 'linux')('readBytes includes growth after its initial size inspection', () => {
  const root = createRepositoryFixture();
  const target = path.join(root, 'growing.bin');
  const initial = Buffer.alloc(65536 + 17, 0x91);
  const appended = Buffer.from([0, 255, 31, 0, 7]);
  writeFileSync(target, initial);
  let grew = false;
  const reads = interceptTargetRead(target, (read) => {
    const count = read();
    if (!grew) {
      fs.appendFileSync(target, appended);
      grew = true;
    }
    return count;
  });
  let passed = false;
  try {
    const actual = requireSafeRepositoryAccess(root).readBytes('growing.bin', 'growth fixture');
    expect(grew).toBe(true);
    expect(actual.equals(Buffer.concat([initial, appended]))).toBe(true);
    passed = true;
  } finally {
    reads.mockRestore();
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`safe-read fixture retained at ${root}`);
  }
});

test.skipIf(process.platform !== 'linux')(
  'readBytes denies growth beyond the cap after its initial size inspection',
  () => {
    const root = createRepositoryFixture();
    const target = path.join(root, 'growing-over-cap.bin');
    writeFileSync(target, Buffer.alloc(maximumReadBytes, 0x25));
    let grew = false;
    const reads = interceptTargetRead(target, (read) => {
      if (!grew) {
        fs.appendFileSync(target, Buffer.from([0x26]));
        grew = true;
      }
      return read();
    });
    let passed = false;
    try {
      expect(() => requireSafeRepositoryAccess(root).readBytes('growing-over-cap.bin', 'growing cap fixture')).toThrow(
        'growing cap fixture exceeds the bounded repository read size',
      );
      expect(grew).toBe(true);
      expect(fs.statSync(target).size).toBe(maximumReadBytes + 1);
      passed = true;
    } finally {
      reads.mockRestore();
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error(`safe-read fixture retained at ${root}`);
    }
  },
);

test.skipIf(process.platform !== 'linux')(
  'readBytes propagates an error after a real read and releases its custody',
  () => {
    const root = createRepositoryFixture();
    const target = path.join(root, 'read-error.bin');
    const expected = Buffer.alloc(65536 + 17, 0x58);
    writeFileSync(target, expected);
    const failure = Object.assign(new Error('injected target read failure'), { code: 'EIO' });
    let readCount = 0;
    const reads = interceptTargetRead(target, (read) => {
      readCount += 1;
      if (readCount === 2) throw failure;
      return read();
    });
    let passed = false;
    try {
      const access = requireSafeRepositoryAccess(root);
      let caught: unknown;
      try {
        access.readBytes('read-error.bin', 'read failure fixture');
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(failure);
      expect(readCount).toBe(2);
      reads.mockRestore();
      expect(access.readBytes('read-error.bin', 'read recovery fixture').equals(expected)).toBe(true);
      expect(fs.readdirSync(root)).toEqual(['read-error.bin']);
      passed = true;
    } finally {
      reads.mockRestore();
      if (passed) rmSync(root, { recursive: true, force: true });
      else console.error(`safe-read fixture retained at ${root}`);
    }
  },
);

test.skipIf(process.platform !== 'linux')('readBytes returns an empty file as an empty Buffer', () => {
  const root = createRepositoryFixture();
  let passed = false;
  try {
    writeFileSync(path.join(root, 'empty.bin'), Buffer.alloc(0));
    const actual = requireSafeRepositoryAccess(root).readBytes('empty.bin', 'empty boundary fixture');
    expect(Buffer.isBuffer(actual)).toBe(true);
    expect(actual).toEqual(Buffer.alloc(0));
    passed = true;
  } catch (error) {
    throw new Error(`safe-read fixture retained at ${root}`, { cause: error });
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== 'linux')('readBytes preserves short binary files byte for byte', () => {
  const root = createRepositoryFixture();
  let passed = false;
  try {
    const expected = Buffer.from([0, 1, 0, 127, 128, 254, 255, 42]);
    writeFileSync(path.join(root, 'short.bin'), expected);
    const actual = requireSafeRepositoryAccess(root).readBytes('short.bin', 'short binary fixture');
    expect(Buffer.isBuffer(actual)).toBe(true);
    expect(actual).toEqual(expected);
    passed = true;
  } catch (error) {
    throw new Error(`safe-read fixture retained at ${root}`, { cause: error });
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== 'linux')(
  'readBytes preserves binary content across multiple 65536-byte read boundaries',
  () => {
    const root = createRepositoryFixture();
    let passed = false;
    try {
      const expected = Buffer.alloc(2 * 65536 + 37);
      for (let offset = 0; offset < expected.length; offset += 1) expected[offset] = (offset * 131 + 17) & 0xff;
      writeFileSync(path.join(root, 'multichunk.bin'), expected);
      const actual = requireSafeRepositoryAccess(root).readBytes('multichunk.bin', 'multichunk boundary fixture');
      expect(Buffer.isBuffer(actual)).toBe(true);
      expect(actual.byteLength).toBe(expected.byteLength);
      expect(actual).toEqual(expected);
      passed = true;
    } catch (error) {
      throw new Error(`safe-read fixture retained at ${root}`, { cause: error });
    } finally {
      if (passed) rmSync(root, { recursive: true, force: true });
    }
  },
);

test.skipIf(process.platform !== 'linux')('readBytes admits a file exactly at the 8 MiB bound', () => {
  const root = createRepositoryFixture();
  let passed = false;
  try {
    const expected = Buffer.alloc(maximumReadBytes, 0xa5);
    writeFileSync(path.join(root, 'exact-limit.bin'), expected);
    const actual = requireSafeRepositoryAccess(root).readBytes('exact-limit.bin', 'exact limit fixture');
    expect(Buffer.isBuffer(actual)).toBe(true);
    expect(actual.byteLength).toBe(maximumReadBytes);
    expect(actual).toEqual(expected);
    passed = true;
  } catch (error) {
    throw new Error(`safe-read fixture retained at ${root}`, { cause: error });
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== 'linux')(
  'readBytes denies a file one byte over 8 MiB with its bounded-read label',
  () => {
    const root = createRepositoryFixture();
    let passed = false;
    try {
      writeFileSync(path.join(root, 'over-limit.bin'), Buffer.alloc(maximumReadBytes + 1, 0x5a));
      const label = 'over-limit boundary fixture';
      expect(() => requireSafeRepositoryAccess(root).readBytes('over-limit.bin', label)).toThrow(
        `${label} exceeds the bounded repository read size`,
      );
      passed = true;
    } catch (error) {
      throw new Error(`safe-read fixture retained at ${root}`, { cause: error });
    } finally {
      if (passed) rmSync(root, { recursive: true, force: true });
    }
  },
);

test.skipIf(process.platform !== 'linux')(
  'read-only capture enforces its smaller bound after opened-file growth',
  () => {
    const root = createRepositoryFixture();
    const target = path.join(root, 'capture-growth.bin');
    const limit = 1024;
    writeFileSync(target, Buffer.alloc(limit, 0xa7));
    let observedBytes = 0;
    let grew = false;
    const reads = interceptTargetRead(target, (read) => {
      if (!grew) {
        grew = true;
        // Mutate the owned inode after its descriptor-size admission, before the actual syscall.
        fs.appendFileSync(target, Buffer.alloc(limit, 0xa7));
      }
      const count = read();
      observedBytes += count;
      return count;
    });
    try {
      const access = requireSafeRepositoryAccess(root);
      expect(() => access.readCapturedBytes('capture-growth.bin', 'capture growth', limit)).toThrow(
        'bounded repository read size',
      );
      expect(grew).toBe(true);
      expect(observedBytes).toBe(limit + 1);
      expect(fs.readdirSync(root)).toEqual(['capture-growth.bin']);
      expect(fs.statSync(target).size).toBe(limit * 2);
    } finally {
      reads.mockRestore();
      rmSync(root, { recursive: true, force: true });
    }
  },
);

function observedProcStat(state: string): string {
  return `${process.pid} (worker ) with spaces) ${state} ${Array<string>(49).fill('0').join(' ')}\n`;
}

function withObservedProcState(
  outcome: string | Error,
  check: (root: string, owner: string, reads: () => number) => void,
): void {
  const root = createRepositoryFixture();
  const owner = path.join(root, 'proc-owner.lock');
  writeFileSync(
    owner,
    JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: process.pid, label: 'isolated proc owner' }),
  );
  const old = new Date(Date.now() - 60000);
  fs.utimesSync(owner, old, old);
  const originalRead = fs.readFileSync;
  let procReads = 0;
  function observedRead<T extends NodeJS.ArrayBufferView>(
    target: fs.PathOrFileDescriptor,
    options: fs.ReadFileSyncOptionsWithBuffer<T>,
  ): BufferView<T>;
  function observedRead(
    target: fs.PathOrFileDescriptor,
    options?: fs.ReadFileSyncOptionsWithBufferEncoding | null,
  ): NonSharedBuffer;
  function observedRead(
    target: fs.PathOrFileDescriptor,
    options: fs.ReadFileSyncOptionsWithStringEncoding | BufferEncoding,
  ): string;
  function observedRead(target: fs.PathOrFileDescriptor, options: fs.ReadFileSyncOptions): string | NonSharedBuffer;
  function observedRead(
    target: fs.PathOrFileDescriptor,
    options?: fs.ReadFileSyncOptions | BufferEncoding | null,
  ): string | Buffer {
    if (target === `/proc/${process.pid}/stat` && options === 'utf8') {
      procReads++;
      if (outcome instanceof Error) throw outcome;
      return outcome;
    }
    if (typeof options === 'string') return originalRead(target, options);
    if (options == null) return originalRead(target, options);
    return originalRead(target, options);
  }
  const reads = spyOn(fs, 'readFileSync').mockImplementation(observedRead);
  let passed = false;
  try {
    check(root, owner, () => procReads);
    passed = true;
  } finally {
    reads.mockRestore();
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`proc-state fixture retained at ${root}`);
  }
}

test.skipIf(process.platform !== 'linux')(
  'stale lock reclamation treats a confirmed zombie as exited and rechecks its state',
  () => {
    withObservedProcState(observedProcStat('Z'), (root, _owner, reads) => {
      let calls = 0;
      expect(
        requireSafeRepositoryAccess(root).withExclusiveLock('proc-owner', 'zombie state fixture', () => ++calls),
      ).toBe(1);
      expect(calls).toBe(1);
      expect(reads()).toBeGreaterThanOrEqual(2);
      expect(fs.readdirSync(root)).toEqual([]);
    });
  },
);

test.skipIf(process.platform !== 'linux')(
  'stale lock retains live or unknown proc owners without entering the callback',
  () => {
    const denied = [
      ...['R', 'S', 'D', 'T', 'I', '?'].map(observedProcStat),
      '',
      `${process.pid} (truncated) Z 0`,
      observedProcStat('Z').replace('\n', ' 0\n'),
      observedProcStat('Z') + '\n',
      observedProcStat('Z').replace(`${process.pid} (`, '2147483647 ('),
      Object.assign(new Error('proc lookup denied'), { code: 'EACCES' }),
      Object.assign(new Error('proc read failed'), { code: 'EIO' }),
    ];
    for (const outcome of denied) {
      withObservedProcState(outcome, (root, owner) => {
        const bytes = fs.readFileSync(owner);
        const identity = fs.statSync(owner, { bigint: true });
        let calls = 0;
        expect(() =>
          requireSafeRepositoryAccess(root).withExclusiveLock('proc-owner', 'denied proc fixture', () => ++calls),
        ).toThrow('lock owner is alive');
        expect(calls).toBe(0);
        expect(fs.readFileSync(owner)).toEqual(bytes);
        const after = fs.statSync(owner, { bigint: true });
        expect(after.dev).toBe(identity.dev);
        expect(after.ino).toBe(identity.ino);
        expect(fs.readdirSync(root)).toEqual(['proc-owner.lock']);
      });
    }
  },
);

const linuxTest = test.skipIf(process.platform !== 'linux');
const repositoryRoot = path.resolve(import.meta.dir, '../../..');
const childFile = fileURLToPath(new URL('./helpers/verified-package-capture-child.ts', import.meta.url));

async function withRoot(run: (root: string) => void | Promise<void>): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-package-capture-'));
  const retainedRoot = root + '-retained';
  let observedSuccess = false;
  try {
    await run(root);
    observedSuccess = true;
  } finally {
    if (observedSuccess) {
      rmSync(root, { recursive: true, force: true });
      rmSync(retainedRoot, { recursive: true, force: true });
    } else {
      process.stderr.write('Retained failed or uncertain package-capture fixture: ' + root + '\n');
      if (existsSync(retainedRoot))
        process.stderr.write('Retained original package-capture root: ' + retainedRoot + '\n');
    }
  }
}

function capture(root: string, target: string, limit?: number): Buffer {
  const access = requireSafeRepositoryAccess(root);
  if (typeof access.readVerifiedCaptureBytes !== 'function')
    throw new Error('Linux verified capture capability is absent');
  return access.readVerifiedCaptureBytes(target, 'package capture candidate', limit);
}

function assertCaptureAvailable(root: string): void {
  const access = requireSafeRepositoryAccess(root);
  expect(typeof access.readVerifiedCaptureBytes).toBe('function');
}

function expectRejectedWith(root: string, target: string, fragment: string, limit?: number): void {
  expect(() => capture(root, target, limit)).toThrow(fragment);
}

async function raceCapture(
  root: string,
  race: 'rename' | 'inplace' | 'ancestor' | 'root',
): Promise<Record<string, unknown>> {
  const child = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', childFile, root, race], {
    cwd: repositoryRoot,
    timeoutMs: 5000,
    stdoutLimitBytes: 8192,
    stderrLimitBytes: 8192,
  });
  expect(child.closeObserved).toBe(true);
  expect(child.timedOut).toBe(false);
  expect(child.exitCode, subprocessFailure('verified capture ' + race + ' race child', child)).toBe(0);
  const value: unknown = JSON.parse(child.stdout.toString('utf8'));
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Verified capture child result must be an object.');
  return value as Record<string, unknown>;
}

linuxTest('verified capture returns BOM-identical bytes, accepts 8 MiB, rejects overflow, and leaves no sidecars', () =>
  withRoot((root) => {
    assertCaptureAvailable(root);
    const expected = Buffer.from('\uFEFFУкраїна', 'utf8');
    const edge = Buffer.alloc(8 * 1024 * 1024, 0x5a);
    const oversize = Buffer.alloc(edge.length + 1, 0x6b);
    writeFileSync(path.join(root, 'module.ts'), expected);
    writeFileSync(path.join(root, 'edge.bin'), edge);
    writeFileSync(path.join(root, 'oversize.bin'), oversize);
    const before = readdirSync(root).sort();
    const syncs = spyOn(fs, 'fsyncSync');
    const writes = spyOn(fs, 'writeSync');
    try {
      expect(capture(root, 'module.ts')).toEqual(expected);
      expect(capture(root, 'edge.bin')).toEqual(edge);
      expectRejectedWith(root, 'edge.bin', 'exceeds the bounded repository read size', edge.length - 1);
      expectRejectedWith(root, 'oversize.bin', 'exceeds the bounded repository read size');
      expect(readdirSync(root).sort()).toEqual(before);
      expect(syncs).not.toHaveBeenCalled();
      expect(writes).not.toHaveBeenCalled();
    } finally {
      syncs.mockRestore();
      writes.mockRestore();
    }
  }),
);

linuxTest('candidate rejects FIFO, symbolic link, hard link, missing ancestor, and oversize', () =>
  withRoot((root) => {
    assertCaptureAvailable(root);
    writeFileSync(path.join(root, 'source.ts'), 'protected');
    writeFileSync(path.join(root, 'bounded.ts'), 'source');
    symlinkSync(path.join(root, 'source.ts'), path.join(root, 'symbolic.ts'));
    linkSync(path.join(root, 'source.ts'), path.join(root, 'hard.ts'));
    const fifo = path.join(root, 'pipe.ts');
    const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8', timeout: 1000, killSignal: 'SIGKILL' });
    expect(made.error).toBeUndefined();
    expect(made.status).toBe(0);
    expectRejectedWith(root, 'pipe.ts', 'regular single-link file');
    expectRejectedWith(root, 'symbolic.ts', 'ELOOP');
    expectRejectedWith(root, 'hard.ts', 'regular single-link file');
    expectRejectedWith(root, 'missing/child.ts', 'ENOENT');
    expectRejectedWith(root, 'bounded.ts', 'exceeds the bounded repository read size', 5);
    expect(readFileSync(path.join(root, 'source.ts'), 'utf8')).toBe('protected');
  }),
);

linuxTest('candidate rejects an actual exclusive CAS writer without changing its lock', () =>
  withRoot((root) => {
    assertCaptureAvailable(root);
    writeFileSync(path.join(root, 'source.ts'), 'protected');
    const access = requireSafeRepositoryAccess(root);
    const lockPath = path.join(root, '.source.ts.cas.lock');
    access.withExclusiveLock('.source.ts.cas', 'candidate writer fence', () => {
      const lockBytes = readFileSync(lockPath);
      const identity = lstatSync(lockPath, { bigint: true });
      expectRejectedWith(root, 'source.ts', 'active CAS writer');
      expect(readFileSync(lockPath)).toEqual(lockBytes);
      const after = lstatSync(lockPath, { bigint: true });
      expect(after.dev).toBe(identity.dev);
      expect(after.ino).toBe(identity.ino);
      expect(readFileSync(path.join(root, 'source.ts'), 'utf8')).toBe('protected');
    });
    expect(existsSync(lockPath)).toBe(false);
  }),
);

linuxTest('candidate rejects orphan backup and leaves its bytes and identity unchanged', () =>
  withRoot((root) => {
    assertCaptureAvailable(root);
    writeFileSync(path.join(root, 'source.ts'), 'protected');
    const backup = path.join(root, '.source.ts.' + randomUUID() + '.cas-old');
    writeFileSync(backup, 'unresolved private bytes');
    const bytes = readFileSync(backup);
    const identity = lstatSync(backup, { bigint: true });
    expectRejectedWith(root, 'source.ts', 'unresolved private backup');
    expect(readFileSync(backup)).toEqual(bytes);
    const after = lstatSync(backup, { bigint: true });
    expect(after.dev).toBe(identity.dev);
    expect(after.ino).toBe(identity.ino);
    expect(readFileSync(path.join(root, 'source.ts'), 'utf8')).toBe('protected');
  }),
);

linuxTest('candidate rejects a reclaim directory and preserves its identity and owner bytes', () =>
  withRoot((root) => {
    assertCaptureAvailable(root);
    writeFileSync(path.join(root, 'source.ts'), 'protected');
    const guard = path.join(root, '.source.ts.cas.lock.reclaim');
    mkdirSync(guard);
    const owner = path.join(guard, 'owner.json');
    const ownerBytes = Buffer.from('{"schema":"retained candidate owner"}');
    writeFileSync(owner, ownerBytes);
    const guardIdentity = lstatSync(guard, { bigint: true });
    const ownerIdentity = lstatSync(owner, { bigint: true });
    expectRejectedWith(root, 'source.ts', 'CAS reclaim is active');
    expect(readFileSync(owner)).toEqual(ownerBytes);
    const afterGuard = lstatSync(guard, { bigint: true });
    const afterOwner = lstatSync(owner, { bigint: true });
    expect(afterGuard.dev).toBe(guardIdentity.dev);
    expect(afterGuard.ino).toBe(guardIdentity.ino);
    expect(afterGuard.mode).toBe(guardIdentity.mode);
    expect(afterOwner.dev).toBe(ownerIdentity.dev);
    expect(afterOwner.ino).toBe(ownerIdentity.ino);
    expect(afterOwner.mode).toBe(ownerIdentity.mode);
    expect(readdirSync(root).sort()).toEqual(['.source.ts.cas.lock.reclaim', 'source.ts']);
  }),
);

linuxTest('candidate rejects a retained lock quarantine and preserves its bytes and identity', () =>
  withRoot((root) => {
    assertCaptureAvailable(root);
    writeFileSync(path.join(root, 'source.ts'), 'protected');
    const quarantine = path.join(root, '..source.ts.cas.lock.' + randomUUID() + '.reclaimed');
    const retainedBytes = Buffer.from('retained lock quarantine bytes');
    writeFileSync(quarantine, retainedBytes);
    const identity = lstatSync(quarantine, { bigint: true });
    expectRejectedWith(root, 'source.ts', 'quarantine');
    expect(readFileSync(quarantine)).toEqual(retainedBytes);
    const after = lstatSync(quarantine, { bigint: true });
    expect(after.dev).toBe(identity.dev);
    expect(after.ino).toBe(identity.ino);
    expect(readdirSync(root).sort()).toEqual([path.basename(quarantine), 'source.ts'].sort());
  }),
);

for (const race of ['rename', 'inplace', 'ancestor', 'root'] as const) {
  linuxTest('candidate rejects controlled ' + race + ' drift in an isolated module-mocked child', async () =>
    withRoot(async (root) => {
      assertCaptureAvailable(root);
      const directory = race === 'ancestor' ? path.join(root, 'nested') : root;
      if (race === 'ancestor') mkdirSync(directory);
      const file = path.join(directory, 'module.ts');
      writeFileSync(file, Buffer.alloc(256 * 1024, 0x41));
      const originalInode = lstatSync(file, { bigint: true }).ino;
      const result = await raceCapture(root, race);
      const reason =
        race === 'rename'
          ? 'changed during capture'
          : race === 'inplace'
            ? 'changed during capture'
            : 'root or parent-chain identity changed during capture';
      expect(result).toMatchObject({ schema: 'VerifiedCaptureRace/v1', race, denied: true, mutation_applied: true });
      expect(result.denial_message).toContain(reason);
      if (race === 'rename') {
        expect(readFileSync(path.join(root, 'renamed-original.ts'))).toEqual(Buffer.alloc(256 * 1024, 0x41));
        expect(readFileSync(file)).toEqual(Buffer.alloc(256 * 1024, 0x42));
      } else if (race === 'inplace') {
        expect(readFileSync(file)).toEqual(Buffer.alloc(256 * 1024, 0x42));
        expect(lstatSync(file, { bigint: true }).ino).toBe(originalInode);
      } else if (race === 'ancestor') {
        expect(readFileSync(path.join(root, 'nested-moved/module.ts'))).toEqual(Buffer.alloc(256 * 1024, 0x41));
        expect(readFileSync(path.join(root, 'nested/module.ts'))).toEqual(Buffer.alloc(256 * 1024, 0x42));
      } else {
        expect(readFileSync(path.join(root + '-retained', 'module.ts'))).toEqual(Buffer.alloc(256 * 1024, 0x41));
        expect(readFileSync(path.join(root, 'module.ts'))).toEqual(Buffer.alloc(256 * 1024, 0x42));
      }
    }),
  );
}
