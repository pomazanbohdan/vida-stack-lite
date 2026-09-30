import { afterAll, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

const roots = [];
function fixture() {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'runtime-exclusive-')));
  roots.push(root);
  return { root, access: requireSafeRepositoryAccess(root) };
}
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

test('exclusive creation preserves collisions and arbitrates competing creators', async () => {
  const { root, access } = fixture();
  const creator = await access.prepareExclusiveCreation();
  await creator.ensureDirectory('nested/data', 'nested data');
  const results = await Promise.allSettled([
    creator.writeExclusive('nested/data/value.txt', 'one', 'value'),
    creator.writeExclusive('nested/data/value.txt', 'two', 'value'),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  const value = readFileSync(path.join(root, 'nested/data/value.txt'), 'utf8');
  expect(['one', 'two']).toContain(value);
  await expect(creator.writeExclusive('nested/data/value.txt', 'replacement', 'value')).rejects.toThrow();
  expect(readFileSync(path.join(root, 'nested/data/value.txt'), 'utf8')).toBe(value);
  if (process.platform === 'win32') {
    expect(access.attested).toBe(true);
    const expected = createHash('sha256').update(value).digest('hex');
    await expect(
      access.replaceAtomicAsync('nested/data/value.txt', expected, 'replacement', 'value'),
    ).resolves.toBeUndefined();
    expect(readFileSync(path.join(root, 'nested/data/value.txt'), 'utf8')).toBe('replacement');

    let entered;
    let release;
    const enteredPromise = new Promise((resolve) => {
      entered = resolve;
    });
    const releasePromise = new Promise((resolve) => {
      release = resolve;
    });
    const holder = access.withExclusiveLockAsync('nested/data/held.lock', 'held lock', async () => {
      entered();
      await releasePromise;
    });
    await enteredPromise;
    await expect(
      access.withExclusiveLockAsync('nested/data/held.lock', 'held lock', async () => undefined),
    ).rejects.toThrow(/file lock timeout|already held/);
    release();
    await holder;
    expect(readdirSync(path.join(root, 'nested/data'))).not.toContain('held.lock');
  }
});

test('unsafe ancestors, outside targets and non-directory parents cannot receive writes', async () => {
  const { root, access } = fixture();
  const creator = await access.prepareExclusiveCreation();
  const outside = fixture().root;
  symlinkSync(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  writeFileSync(path.join(root, 'parent-file'), 'preserve');
  for (const target of ['../escape.txt', '.git/config', 'linked/escape.txt', 'parent-file/value.txt']) {
    await expect(creator.writeExclusive(target, 'unsafe', 'unsafe target')).rejects.toThrow();
  }
  await expect(creator.ensureDirectory('linked/new', 'unsafe directory')).rejects.toThrow();
  expect(readdirSync(outside)).toEqual([]);
  expect(readFileSync(path.join(root, 'parent-file'), 'utf8')).toBe('preserve');
});

test('disabled live native capability fails before output even after provider creation', async () => {
  if (process.platform !== 'win32') return;
  const { root, access } = fixture();
  const creator = await access.prepareExclusiveCreation();
  const prior = process.env.FS_SAFE_NATIVE_MODE;
  process.env.FS_SAFE_NATIVE_MODE = 'off';
  try {
    await expect(access.prepareExclusiveCreation()).rejects.toThrow(/native provider/);
    await expect(creator.ensureDirectory('new', 'new directory')).rejects.toThrow(/native provider/);
    await expect(creator.writeExclusive('new.txt', 'new', 'new file')).rejects.toThrow(/native provider/);
    expect(readdirSync(root)).toEqual([]);
  } finally {
    if (prior === undefined) delete process.env.FS_SAFE_NATIVE_MODE;
    else process.env.FS_SAFE_NATIVE_MODE = prior;
  }
});

test('oversized contents fail before destination creation', async () => {
  const { root, access } = fixture();
  const creator = await access.prepareExclusiveCreation();
  await expect(creator.writeExclusive('oversized.txt', 'x'.repeat(8 * 1024 * 1024 + 1), 'oversized')).rejects.toThrow(
    /bounded/,
  );
  expect(readdirSync(root)).toEqual([]);
});
