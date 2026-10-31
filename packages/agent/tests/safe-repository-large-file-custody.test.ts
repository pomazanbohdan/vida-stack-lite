import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  ftruncateSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureFsSafeNative, getFsSafeNativeConfig } from '@openclaw/fs-safe';
import { requireSafeRepositoryAccess, SafeRepositoryMoveError } from '../src/config/safe-repository-access.js';

const onlyWindows = test.skipIf(process.platform !== 'win32');
const chunk = Buffer.alloc(64 * 1024, 0x5a);
const count = 144; // 9 MiB: exceeds the ordinary 8 MiB read boundary.
function fixture(): { root: string; digest: string } {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'vida-large-custody-')));
  const fd = openSync(path.join(root, 'source'), 'wx');
  const hash = createHash('sha256');
  try {
    for (let i = 0; i < count; i++) {
      let offset = 0;
      while (offset < chunk.length) offset += writeSync(fd, chunk, offset, chunk.length - offset);
      hash.update(chunk);
    }
  } finally {
    closeSync(fd);
  }
  // Retain all roots: a test timeout or unknown move must never trigger recursive cleanup.
  return { root, digest: hash.digest('hex') };
}

onlyWindows(
  'observes and moves a bounded large file with identity and ADS intact',
  async () => {
    const { root, digest } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile || !access.moveLargeFileNoReplace || !access.observeFileIdentity)
      throw new Error('large-file capability unavailable');
    writeFileSync(path.join(root, 'source:proof'), 'preserved stream');
    const before = await access.observeLargeFile('source', 'source');
    expect(before).toEqual({
      identity: access.observeFileIdentity('source', 'identity'),
      size: count * chunk.length,
      sha256: digest,
    });
    expect(() => access.readBytes('source', 'ordinary read')).toThrow();
    await Promise.resolve(
      expect(access.moveNoReplaceAsync('source', 'ordinary-target', digest, 'ordinary move')).rejects.toThrow(),
    );
    expect(existsSync(path.join(root, 'source'))).toBe(true);
    expect(await access.moveLargeFileNoReplace('source', 'target', before, 'large move')).toBe('moved');
    expect(await access.observeLargeFile('target', 'target')).toEqual(before);
    expect(readFileSync(path.join(root, 'target:proof'), 'utf8')).toBe('preserved stream');
    expect(await access.moveLargeFileNoReplace('source', 'target', before, 'recovery')).toBe('already_moved');
  },
  90_000,
);

onlyWindows(
  'denies collision and stale identity, size and digest without overwriting',
  async () => {
    const { root } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile || !access.moveLargeFileNoReplace)
      throw new Error('large-file capability unavailable');
    const before = await access.observeLargeFile('source', 'source');
    writeFileSync(path.join(root, 'target'), 'occupied');
    await Promise.resolve(
      expect(access.moveLargeFileNoReplace('source', 'target', before, 'collision')).rejects.toBeInstanceOf(
        SafeRepositoryMoveError,
      ),
    );
    expect(readFileSync(path.join(root, 'target'), 'utf8')).toBe('occupied');
    for (const changed of [
      { ...before, identity: 'foreign' },
      { ...before, size: before.size - 1 },
      { ...before, sha256: '0'.repeat(64) },
    ]) {
      await Promise.resolve(
        expect(access.moveLargeFileNoReplace('source', 'free', changed, 'stale')).rejects.toBeInstanceOf(
          SafeRepositoryMoveError,
        ),
      );
      expect(existsSync(path.join(root, 'source'))).toBe(true);
      expect(existsSync(path.join(root, 'free'))).toBe(false);
    }
    expect(await access.observeLargeFile('source', 'unchanged')).toEqual(before);
    const fd = openSync(path.join(root, 'source'), 'r+');
    try {
      writeSync(fd, Buffer.from('changed'), 0, 7, 0);
    } finally {
      closeSync(fd);
    }
    await Promise.resolve(
      expect(access.moveLargeFileNoReplace('source', 'free', before, 'changed bytes')).rejects.toBeInstanceOf(
        SafeRepositoryMoveError,
      ),
    );
    expect(existsSync(path.join(root, 'free'))).toBe(false);
  },
  90_000,
);

onlyWindows(
  'rejects a same-byte replacement and a file over the fixed limit',
  async () => {
    const { root } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile || !access.moveLargeFileNoReplace)
      throw new Error('large-file capability unavailable');
    const before = await access.observeLargeFile('source', 'source');
    renameSync(path.join(root, 'source'), path.join(root, 'original'));
    const replacement = openSync(path.join(root, 'source'), 'wx');
    try {
      for (let i = 0; i < count; i++) {
        let offset = 0;
        while (offset < chunk.length) offset += writeSync(replacement, chunk, offset, chunk.length - offset);
      }
    } finally {
      closeSync(replacement);
    }
    await Promise.resolve(
      expect(access.moveLargeFileNoReplace('source', 'target', before, 'foreign inode')).rejects.toBeInstanceOf(
        SafeRepositoryMoveError,
      ),
    );
    expect(existsSync(path.join(root, 'target'))).toBe(false);
    const fd = openSync(path.join(root, 'oversized'), 'wx');
    try {
      ftruncateSync(fd, 64 * 1024 * 1024 + 1);
    } finally {
      closeSync(fd);
    }
    await Promise.resolve(expect(access.observeLargeFile('oversized', 'oversized')).rejects.toThrow());
  },
  90_000,
);

onlyWindows(
  'denies observation and move when the native provider is disabled',
  async () => {
    const { root } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile || !access.moveLargeFileNoReplace)
      throw new Error('large-file capability unavailable');
    const before = await access.observeLargeFile('source', 'source');
    const config = getFsSafeNativeConfig();
    try {
      configureFsSafeNative({ mode: 'off' });
      await Promise.resolve(expect(access.observeLargeFile('source', 'disabled')).rejects.toThrow());
      await Promise.resolve(
        expect(access.moveLargeFileNoReplace('source', 'target', before, 'disabled')).rejects.toThrow(),
      );
      expect(existsSync(path.join(root, 'source'))).toBe(true);
      expect(existsSync(path.join(root, 'target'))).toBe(false);
    } finally {
      configureFsSafeNative(config);
    }
  },
  90_000,
);

onlyWindows(
  'move snapshots the caller tuple before the native hash suspends',
  async () => {
    const { root } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile || !access.moveLargeFileNoReplace)
      throw new Error('large-file capability unavailable');
    const original = await access.observeLargeFile('source', 'source');
    const expected = { ...original };
    const pending = access.moveLargeFileNoReplace('source', 'target', expected, 'snapshot');
    expected.identity = 'changed';
    expected.size = 0;
    expected.sha256 = '0'.repeat(64);
    expect(await pending).toBe('moved');
    expect(await access.observeLargeFile('target', 'target')).toEqual(original);
    expect(existsSync(path.join(root, 'source'))).toBe(false);
  },
  90_000,
);

onlyWindows(
  'changing an initially wrong digest during the native hash cannot authorize a move',
  async () => {
    const { root } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile || !access.moveLargeFileNoReplace)
      throw new Error('large-file capability unavailable');
    const original = await access.observeLargeFile('source', 'source');
    const expected = { ...original, sha256: '0'.repeat(64) };
    const pending = access.moveLargeFileNoReplace('source', 'target', expected, 'stale snapshot');
    expected.sha256 = original.sha256;
    await Promise.resolve(expect(pending).rejects.toBeInstanceOf(SafeRepositoryMoveError));
    expect(await access.observeLargeFile('source', 'unchanged')).toEqual(original);
    expect(existsSync(path.join(root, 'target'))).toBe(false);
  },
  90_000,
);

onlyWindows(
  'disabling native configuration during a real hash denies the observation after await',
  async () => {
    const { root } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile) throw new Error('large-file capability unavailable');
    const original = await access.observeLargeFile('source', 'control');
    const config = getFsSafeNativeConfig();
    const pending = access.observeLargeFile('source', 'mid-hash');
    try {
      configureFsSafeNative({ mode: 'off' });
      await Promise.resolve(
        expect(pending).rejects.toThrow('requires the pinned fs-safe native provider to remain enabled'),
      );
    } finally {
      await pending.catch(() => undefined);
      configureFsSafeNative(config);
    }
    expect(await access.observeLargeFile('source', 'after')).toEqual(original);
  },
  90_000,
);

onlyWindows(
  'disabling native configuration during the source hash fences the move',
  async () => {
    const { root } = fixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.observeLargeFile || !access.moveLargeFileNoReplace)
      throw new Error('large-file capability unavailable');
    const original = await access.observeLargeFile('source', 'control');
    const config = getFsSafeNativeConfig();
    const pending = access.moveLargeFileNoReplace('source', 'target', original, 'mid-hash move');
    try {
      configureFsSafeNative({ mode: 'off' });
      const failure: unknown = await pending.then(
        () => null,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(SafeRepositoryMoveError);
      if (!(failure instanceof SafeRepositoryMoveError) || !(failure.cause instanceof Error))
        throw new Error('missing provider failure cause');
      expect(failure.cause.message).toContain('requires the pinned fs-safe native provider to remain enabled');
      expect(failure.code).toBe('SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN');
    } finally {
      await pending.catch(() => undefined);
      configureFsSafeNative(config);
    }
    expect(await access.observeLargeFile('source', 'after')).toEqual(original);
    expect(existsSync(path.join(root, 'target'))).toBe(false);
  },
  90_000,
);

onlyWindows(
  'denies a move when a file grows, truncates or changes during the native hash',
  async () => {
    for (const change of ['grow', 'truncate', 'overwrite'] as const) {
      const { root } = fixture();
      const access = requireSafeRepositoryAccess(root);
      if (!access.observeLargeFile || !access.moveLargeFileNoReplace)
        throw new Error('large-file capability unavailable');
      const original = await access.observeLargeFile('source', 'control');
      const pending = access.moveLargeFileNoReplace('source', 'target', original, change);
      try {
        const fd = openSync(path.join(root, 'source'), 'r+');
        try {
          if (change === 'grow') writeSync(fd, Buffer.from('growth'), 0, 6, original.size);
          else if (change === 'truncate') ftruncateSync(fd, original.size - 1);
          else writeSync(fd, Buffer.from('changed'), 0, 7, 0);
        } finally {
          closeSync(fd);
        }
        const failure: unknown = await pending.then(
          () => null,
          (error: unknown) => error,
        );
        expect(failure).toBeInstanceOf(SafeRepositoryMoveError);
        if (!(failure instanceof SafeRepositoryMoveError) || !(failure.cause instanceof Error))
          throw new Error('missing native hash failure cause');
        expect(failure.cause.message).toContain('changed during hashing or failed exact EOF');
        const changed = await access.observeLargeFile('source', 'changed control');
        if (change === 'grow') expect(statSync(path.join(root, 'source')).size).toBe(original.size + 6);
        else if (change === 'truncate') expect(changed.size).toBe(original.size - 1);
        else expect(changed.sha256).not.toBe(original.sha256);
        expect(existsSync(path.join(root, 'target'))).toBe(false);
      } finally {
        await pending.catch(() => undefined);
      }
    }
  },
  90_000,
);
