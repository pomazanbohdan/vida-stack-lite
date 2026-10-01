import { afterAll, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
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

test('resource sidecar locks preserve existing payloads and exclude concurrent holders', async () => {
  const { root, access } = fixture();
  const contender = requireSafeRepositoryAccess(root);
  const payload = '{"phase":"planned"}';
  access.writeExclusive('operation.json', payload, 'operation');
  let entered;
  let release;
  const enteredPromise = new Promise((resolve) => {
    entered = resolve;
  });
  const releasePromise = new Promise((resolve) => {
    release = resolve;
  });
  const holder = access.withExclusiveLockAsync('operation.json', 'operation', async () => {
    entered();
    await releasePromise;
    const expected = createHash('sha256').update(payload).digest('hex');
    await access.replaceAtomicAsync('operation.json', expected, '{"phase":"complete"}', 'operation');
  });
  await enteredPromise;
  try {
    expect(readFileSync(path.join(root, 'operation.json'), 'utf8')).toBe(payload);
    expect(existsSync(path.join(root, 'operation.json.lock'))).toBe(true);
    await expect(
      contender.withExclusiveLockAsync('operation.json', 'contender', async () => {
        throw new Error('contender callback must not run');
      }),
    ).rejects.toThrow(/EEXIST|file lock timeout|already held/);
    if (process.platform === 'linux') {
      const child = spawnSync(
        'bun',
        [
          '-e',
          `
        const { requireSafeRepositoryAccess } = await import('./src/config/safe-repository-access.ts');
        const access = requireSafeRepositoryAccess(process.argv[1]);
        try {
          await access.withExclusiveLockAsync('operation.json', 'child contender', async () => process.exit(9));
          process.exit(8);
        } catch (error) {
          if (error.code !== 'EEXIST') throw error;
        }
      `,
          root,
        ],
        { cwd: process.cwd(), encoding: 'utf8', timeout: 10_000 },
      );
      expect(child.error).toBeUndefined();
      expect(child.status, child.stderr).toBe(0);
    }
  } finally {
    release();
    await holder;
  }
  expect(readFileSync(path.join(root, 'operation.json'), 'utf8')).toBe('{"phase":"complete"}');
  expect(existsSync(path.join(root, 'operation.json.lock'))).toBe(false);
  await expect(
    access.withExclusiveLockAsync('operation.json', 'throwing operation', async () => {
      throw new Error('operation failed');
    }),
  ).rejects.toThrow('operation failed');
  expect(existsSync(path.join(root, 'operation.json.lock'))).toBe(false);
  expect(readFileSync(path.join(root, 'operation.json'), 'utf8')).toBe('{"phase":"complete"}');
  await expect(
    contender.withExclusiveLockAsync('operation.json', 'new holder', async () => 'reacquired'),
  ).resolves.toBe('reacquired');
});

test('Linux resource locks recover only dead stale sidecars and preserve unsafe collisions', async () => {
  if (process.platform !== 'linux') return;
  const { root, access } = fixture();
  access.writeExclusive('operation.json', '{"phase":"planned"}', 'operation');
  const payload = readFileSync(path.join(root, 'operation.json'));
  const sidecar = path.join(root, 'operation.json.lock');
  const old = new Date(Date.now() - 60_000);
  writeFileSync(sidecar, JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: 2_147_483_647 }));
  utimesSync(sidecar, old, old);
  await expect(
    access.withExclusiveLockAsync('operation.json', 'stale operation', async () => 'recovered'),
  ).resolves.toBe('recovered');
  expect(existsSync(sidecar)).toBe(false);
  writeFileSync(sidecar, JSON.stringify({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: process.pid }));
  utimesSync(sidecar, old, old);
  await expect(access.withExclusiveLockAsync('operation.json', 'live owner', async () => undefined)).rejects.toThrow(
    /owner is alive/,
  );
  rmSync(sidecar);
  const outside = fixture().root;
  const sentinel = path.join(outside, 'sentinel');
  writeFileSync(sentinel, 'preserve');
  symlinkSync(sentinel, sidecar);
  await expect(
    access.withExclusiveLockAsync('operation.json', 'symlink sidecar', async () => undefined),
  ).rejects.toThrow();
  expect(readFileSync(sentinel, 'utf8')).toBe('preserve');
  rmSync(sidecar);
  linkSync(sentinel, sidecar);
  await expect(
    access.withExclusiveLockAsync('operation.json', 'hardlink sidecar', async () => undefined),
  ).rejects.toThrow();
  expect(readFileSync(sentinel, 'utf8')).toBe('preserve');
  rmSync(sidecar);
  symlinkSync(outside, path.join(root, 'linked'), 'dir');
  for (const target of ['../escape', '.git', '.git/config', 'linked/escape']) {
    await expect(access.withExclusiveLockAsync(target, 'unsafe resource', async () => undefined)).rejects.toThrow();
  }
  expect(readdirSync(outside)).toEqual(['sentinel']);
  expect(readFileSync(path.join(root, 'operation.json'))).toEqual(payload);
});
