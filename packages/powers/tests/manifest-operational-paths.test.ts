import { afterAll, expect, spyOn, test } from 'bun:test';
import * as fsPromises from 'node:fs/promises';
import * as crypto from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifestPlan, checkManifestPlan, writeManifestPlan } from '../scripts/build-manifests.ts';
import { planFormationPayload } from '../scripts/formation-payload.ts';

const roots: string[] = [];
const fixture = fileURLToPath(new URL('./fixtures/manifest-build/', import.meta.url));
const schema = fileURLToPath(new URL('../config/vppluginmanifest.v1.schema.json', import.meta.url));

afterAll(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

async function project(targets: readonly string[] = ['portable']): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'vp-ledger-path-'));
  roots.push(root);
  await mkdir(join(root, 'config'));
  await cp(join(fixture, 'package.json'), join(root, 'package.json'));
  await cp(join(fixture, 'skills'), join(root, 'skills'), { recursive: true });
  const inputs: unknown = JSON.parse(await readFile(join(fixture, 'plugin-manifest-inputs.json'), 'utf8'));
  if (typeof inputs !== 'object' || inputs === null || Array.isArray(inputs)) throw new Error('Invalid test inputs');
  await writeFile(join(root, 'config/plugin-manifest-inputs.json'), JSON.stringify({ ...inputs, targets }));
  await cp(schema, join(root, 'config/vppluginmanifest.v1.schema.json'));
  return root;
}

for (const kind of ['directory', 'junction']) {
  test(`manifest preflight rejects the actual ownership ledger when it is a ${kind}`, async () => {
    const root = await project();
    const plan = await buildManifestPlan(root);
    const ledger = join(root, '.tmp/vp-manifest-ownership.json');
    await mkdir(join(root, '.tmp'));
    let sentinel: string;
    if (kind === 'directory') {
      await mkdir(ledger);
      sentinel = join(ledger, 'sentinel');
    } else {
      const outside = await mkdtemp(join(tmpdir(), 'vp-ledger-outside-'));
      roots.push(outside);
      sentinel = join(outside, 'sentinel');
      await symlink(outside, ledger, 'junction');
    }
    await writeFile(sentinel, 'retained foreign bytes');

    await expect(writeManifestPlan(root, plan)).rejects.toMatchObject({
      code: 'MANIFEST_OUTPUT_UNSAFE',
      message: 'Manifest ownership ledger must be a regular file.',
    });
    expect(await readFile(sentinel, 'utf8')).toBe('retained foreign bytes');
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
    expect(await lstat(join(root, '.tmp/vp-manifest-build.transaction')).catch(() => undefined)).toBeUndefined();
    expect((await lstat(ledger)).isSymbolicLink()).toBe(kind === 'junction');
  });
}

async function outsideDirectory(): Promise<string> {
  const outside = await mkdtemp(join(tmpdir(), 'vp-race-outside-'));
  roots.push(outside);
  await writeFile(join(outside, 'sentinel'), 'retained foreign bytes');
  return outside;
}

async function expectJunctionRaceRejected(
  inspectedPath: string,
  replacedPath: string,
  backupPath: string,
  outside: string,
  operation: () => Promise<unknown>,
  message: string,
): Promise<void> {
  let swaps = 0;
  const nativeLstat = fsPromises.lstat;
  const intercepted = spyOn(fsPromises, 'lstat').mockImplementation(new Proxy(nativeLstat, {
    async apply(fn, receiver: unknown, args: unknown[]) {
      const metadata: unknown = await Reflect.apply(fn, receiver, args);
      if (args[0] === inspectedPath && swaps === 0) {
        swaps += 1;
        await rename(replacedPath, backupPath);
        await symlink(outside, replacedPath, 'junction');
      }
      return metadata;
    },
  }));
  try {
    await expect(operation()).rejects.toMatchObject({ message });
  } finally {
    intercepted.mockRestore();
  }
  expect(swaps).toBe(1);
  expect(await readFile(join(outside, 'sentinel'), 'utf8')).toBe('retained foreign bytes');
  expect((await lstat(replacedPath)).isSymbolicLink()).toBe(true);
}

const operationalRaces = [
  { path: '.tmp', message: 'Manifest ownership state escapes the project root.' },
  { path: '.tmp/vp-manifest-ownership.json', message: 'Manifest ownership ledger escapes the project root.' },
  { path: '.tmp/vp-manifest-build.transaction', message: 'Manifest transaction state escapes the project root.' },
  { path: '.tmp/vp-manifest-formations', message: 'Native formation output root escapes the package root.' },
];
for (const scenario of operationalRaces) {
  test(`manifest preflight rejects a real junction swap after inspecting ${scenario.path}`, async () => {
    const root = await project();
    const plan = await buildManifestPlan(root);
    await mkdir(join(root, '.tmp'));
    const replacedPath = join(root, scenario.path);
    if (scenario.path.endsWith('.json')) await writeFile(replacedPath, '{}');
    else if (scenario.path !== '.tmp') await mkdir(replacedPath);
    await expectJunctionRaceRejected(replacedPath, replacedPath, join(root, 'beforeimage'), await outsideDirectory(),
      () => writeManifestPlan(root, plan), scenario.message);
    expect(await lstat(join(root, 'plugin.json')).catch(() => undefined)).toBeUndefined();
  });
}

for (const kind of ['directory', 'file']) {
  test(`native payload rejects a real ${kind} containment race after metadata inspection`, async () => {
    const root = await project();
    await mkdir(join(root, '.tmp'));
    const directory = join(root, 'race-source');
    await mkdir(directory);
    const file = join(directory, 'sentinel');
    await writeFile(file, 'owned source bytes');
    const inspected = kind === 'directory' ? directory : file;
    const path = kind === 'directory' ? 'race-source' : 'race-source/sentinel';
    await expectJunctionRaceRejected(inspected, directory, join(root, '.tmp/beforeimage'), await outsideDirectory(),
      () => planFormationPayload(root, []), `Native formation source ${kind} escapes the package root: ${path}.`);
    expect(await readFile(join(root, '.tmp/beforeimage/sentinel'), 'utf8')).toBe('owned source bytes');
  });
}

test('native manifest check reports a changed owned payload without rebuilding or overwriting it', async () => {
  const root = await project(['antigravity']);
  const plan = await buildManifestPlan(root);
  await writeManifestPlan(root, plan);
  const path = '.tmp/vp-manifest-formations/antigravity/skills/vp-mode/SKILL.md';
  const ledger = join(root, '.tmp/vp-manifest-ownership.json');
  const ownershipBefore = await readFile(ledger);
  await writeFile(join(root, path), 'foreign changed payload');

  expect(await checkManifestPlan(root, plan)).toEqual({
    ok: false,
    issues: [{ code: 'MANIFEST_OUTPUT_CONFLICT', path, message: `Output differs from its manifest ownership digest: ${path}.` }],
  });
  expect(await readFile(join(root, path), 'utf8')).toBe('foreign changed payload');
  expect(await readFile(ledger)).toEqual(ownershipBefore);
});

for (const unsafeName of ['unsafe:name', '..']) {
  test(`native payload rejects an injected unsafe directory entry ${unsafeName}`, async () => {
    const root = await project();
    let observedReads = 0;
    const nativeReaddir = fsPromises.readdir;
    const intercepted = spyOn(fsPromises, 'readdir').mockImplementation(new Proxy(nativeReaddir, {
      async apply(fn, receiver: unknown, args: unknown[]) {
        const entries: unknown = await Reflect.apply(fn, receiver, args);
        if (args[0] !== root) return entries;
        observedReads += 1;
        if (!Array.isArray(entries)) throw new Error('Expected native directory entries');
        const first: unknown = entries[0];
        if (typeof first !== 'object' || first === null) throw new Error('Expected native directory entry');
        return [new Proxy(first, { get(target, key, actualReceiver) {
          return key === 'name' ? unsafeName : Reflect.get(target, key, actualReceiver);
        } })];
      },
    }));
    try {
      await expect(planFormationPayload(root, [])).rejects.toMatchObject({ code: 'MANIFEST_INPUT_UNSAFE' });
    } finally {
      intercepted.mockRestore();
    }
    expect(observedReads).toBe(1);
    expect((await lstat(join(root, 'config'))).isDirectory()).toBe(true);
  });
}

test('native payload rejects an injected non-regular native file type', async () => {
  const root = await project();
  const path = join(root, 'special-node');
  await writeFile(path, 'retained input');
  let observedStats = 0;
  const nativeLstat = fsPromises.lstat;
  const intercepted = spyOn(fsPromises, 'lstat').mockImplementation(new Proxy(nativeLstat, {
    async apply(fn, receiver: unknown, args: unknown[]) {
      const metadata: unknown = await Reflect.apply(fn, receiver, args);
      if (args[0] !== path) return metadata;
      observedStats += 1;
      if (typeof metadata !== 'object' || metadata === null) throw new Error('Expected native metadata');
      return new Proxy(metadata, { get(target, key, actualReceiver) {
        return key === 'isFile' ? () => false : Reflect.get(target, key, actualReceiver);
      } });
    },
  }));
  try {
    await expect(planFormationPayload(root, [])).rejects.toMatchObject({
      code: 'MANIFEST_INPUT_UNSAFE', message: 'Native formation source contains a non-regular file: special-node.',
    });
  } finally {
    intercepted.mockRestore();
  }
  expect(observedStats).toBe(1);
  expect(await readFile(path, 'utf8')).toBe('retained input');
});

test('native manifest formation preserves an injected hashing failure after observing the native call', async () => {
  const root = await project(['antigravity']);
  const nativeHash = crypto.createHash;
  const failure = new Error('injected native hashing failure');
  let observedHashCalls = 0;
  const intercepted = spyOn(crypto, 'createHash').mockImplementation(new Proxy(nativeHash, {
    apply(fn, receiver: unknown, args: unknown[]) {
      Reflect.apply(fn, receiver, args);
      observedHashCalls += 1;
      throw failure;
    },
  }));
  try {
    await expect(buildManifestPlan(root)).rejects.toBe(failure);
  } finally {
    intercepted.mockRestore();
  }
  expect(observedHashCalls).toBe(1);
  expect(await lstat(join(root, '.tmp/vp-manifest-formations')).catch(() => undefined)).toBeUndefined();
  expect(await lstat(join(root, '.tmp/vp-manifest-ownership.json')).catch(() => undefined)).toBeUndefined();
});
