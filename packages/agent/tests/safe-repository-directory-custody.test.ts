import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureFsSafeNative, getFsSafeNativeConfig } from '@openclaw/fs-safe';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';

const windows = test.skipIf(process.platform !== 'win32');
const rootFixture = () => realpathSync(mkdtempSync(path.join(os.tmpdir(), 'vida-directory-custody-')));
const digest = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
const identity = (file: string) => {
  const s = lstatSync(file, { bigint: true });
  return [s.dev, s.ino, s.birthtimeNs, s.mode].map(String);
};

windows(
  'moves the exact directory and preserves descendants and supported streams',
  async () => {
    const root = rootFixture();
    const access = requireSafeRepositoryAccess(root);
    if (!access.moveDirectoryNoReplaceAsync) throw new Error('directory capability absent');
    const source = path.join(root, 'source');
    mkdirSync(path.join(source, 'nested', 'empty'), { recursive: true });
    const file = path.join(source, 'nested', 'leaf');
    writeFileSync(file, Buffer.alloc(9 * 1024 * 1024, 0x5a));
    const streams: string[] = [];
    for (const entry of [source, file]) {
      try {
        writeFileSync(entry + ':custody', 'stream');
        streams.push(path.relative(root, entry));
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (!['ENOTSUP', 'EOPNOTSUPP', 'EINVAL', 'ENOSYS'].includes(code ?? '')) throw error;
        console.log('ADS unsupported', entry, code);
      }
    }
    const entries = ['source', 'source/nested', 'source/nested/empty', 'source/nested/leaf'];
    const before = entries.map((entry) => identity(path.join(root, entry)));
    const hash = digest(file);
    const expected = access.directoryIdentity('source', 'source');
    expect(await access.moveDirectoryNoReplaceAsync('source', 'target', expected, 'move')).toBe('moved');
    expect(existsSync(source)).toBe(false);
    expect(entries.map((entry) => identity(path.join(root, entry.replace(/^source/, 'target'))))).toEqual(before);
    expect(digest(path.join(root, 'target/nested/leaf'))).toBe(hash);
    for (const entry of streams)
      expect(readFileSync(path.join(root, entry.replace(/^source/, 'target')) + ':custody', 'utf8')).toBe('stream');
    expect(await access.moveDirectoryNoReplaceAsync('source', 'target', expected, 'recovery')).toBe('already_moved');
  },
  90_000,
);

windows(
  'refuses collisions, stale identities and overlapping paths',
  async () => {
    const root = rootFixture();
    mkdirSync(path.join(root, 'source', 'nested'), { recursive: true });
    mkdirSync(path.join(root, 'foreign'));
    mkdirSync(path.join(root, 'target'));
    writeFileSync(path.join(root, 'source', 'data'), 'same');
    writeFileSync(path.join(root, 'foreign', 'data'), 'same');
    writeFileSync(path.join(root, 'target', 'data'), 'foreign');
    const access = requireSafeRepositoryAccess(root);
    if (!access.moveDirectoryNoReplaceAsync) throw new Error('directory capability absent');
    const move = access.moveDirectoryNoReplaceAsync;
    const expected = access.directoryIdentity('source', 'source');
    const foreign = access.directoryIdentity('foreign', 'foreign');
    await Promise.resolve(expect(move('source', 'target', expected, 'collision')).rejects.toThrow());
    await Promise.resolve(expect(move('source', 'free', foreign, 'stale')).rejects.toThrow());
    await Promise.resolve(expect(move('source', 'source/nested', expected, 'overlap')).rejects.toThrow());
    await Promise.resolve(expect(move('source', 'SOURCE', expected, 'casefold')).rejects.toThrow());
    expect(readFileSync(path.join(root, 'target', 'data'), 'utf8')).toBe('foreign');
    expect(readFileSync(path.join(root, 'source', 'data'), 'utf8')).toBe('same');
    expect(existsSync(path.join(root, 'free'))).toBe(false);
  },
  90_000,
);

windows(
  'disabled provider refuses before effects and ordinary access remains available',
  async () => {
    const root = rootFixture();
    mkdirSync(path.join(root, 'source'));
    writeFileSync(path.join(root, 'ordinary'), 'ordinary');
    const access = requireSafeRepositoryAccess(root);
    if (!access.moveDirectoryNoReplaceAsync) throw new Error('directory capability absent');
    const expected = access.directoryIdentity('source', 'source');
    const previous = getFsSafeNativeConfig();
    try {
      configureFsSafeNative({ mode: 'off' });
      await Promise.resolve(
        expect(access.moveDirectoryNoReplaceAsync('source', 'target', expected, 'disabled')).rejects.toThrow(),
      );
    } finally {
      configureFsSafeNative(previous);
    }
    expect(existsSync(path.join(root, 'source'))).toBe(true);
    expect(existsSync(path.join(root, 'target'))).toBe(false);
    expect(access.readText('ordinary', 'ordinary')).toBe('ordinary');
  },
  90_000,
);
