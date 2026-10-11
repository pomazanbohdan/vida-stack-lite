import assert from 'node:assert/strict';
import { test } from 'bun:test';
import {
  chmodSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { materializeResources, resourceDigest, resourcePath, verifyResourceTree } from '../bin/standalone-resources.ts';
import { cliMetadataResult } from '../bin/cli-metadata.ts';
import { runStandalone } from '../bin/standalone.ts';

function fixture() {
  const cache = mkdtempSync(path.join(tmpdir(), 'vida-resource-test-'));
  const bytes = Buffer.from('owned physical instruction');
  const index = [{ path: 'instructions/owned.md', bytes: bytes.length, sha256: resourceDigest(bytes) }];
  return {
    cache,
    version: '0.1.2',
    payloadId: resourceDigest(JSON.stringify(index)),
    index,
    loadFiles: async () => new Map([['instructions/owned.md', new Blob([bytes])]]),
  };
}

test('resources preserve dangling foreign directory links', async () => {
  const value = fixture();
  try {
    const missing = path.join(value.cache, 'foreign-missing-target');
    const destination = path.join(value.cache, value.version + '-' + value.payloadId);
    symlinkSync(missing, destination, process.platform === 'win32' ? 'junction' : 'dir');
    await Promise.resolve(assert.rejects(materializeResources(value), /linked|link/));
    assert.ok(lstatSync(destination).isSymbolicLink());
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

(typeof process.getuid === 'function' ? test : test.skip)(
  'resources reject permissive existing POSIX cache parents without changing their permissions',
  async () => {
    const value = fixture();
    try {
      const parent = value.cache;
      const cache = path.join(parent, 'runtime');
      mkdirSync(cache, { mode: 0o700 });
      chmodSync(parent, 0o755);
      await Promise.resolve(
        assert.rejects(materializeResources({ ...value, cache, privateRoot: parent }), /permissions/),
      );
      chmodSync(parent, 0o700);
      chmodSync(cache, 0o777);
      await Promise.resolve(
        assert.rejects(materializeResources({ ...value, cache, privateRoot: parent }), /permissions/),
      );
    } finally {
      rmSync(value.cache, { recursive: true, force: true });
    }
  },
);

test('resources reject unsafe paths and partial or foreign publication without replacing owners', async () => {
  for (const name of ['../escape', 'a/../b', '/absolute', 'C:/escape', 'a\\b', 'a//b', 'a/b.'])
    assert.throws(() => resourcePath(name));
  const value = fixture();
  try {
    const destination = path.join(value.cache, value.version + '-' + value.payloadId);
    mkdirSync(destination);
    writeFileSync(path.join(destination, 'foreign.txt'), 'foreign owner');
    await Promise.resolve(assert.rejects(materializeResources(value)));
    assert.equal(readFileSync(path.join(destination, 'foreign.txt'), 'utf8'), 'foreign owner');
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('resources publish once under concurrency and reuse only exact regular bytes', async () => {
  const value = fixture();
  let loads = 0;
  const loadFiles = value.loadFiles;
  value.loadFiles = async () => {
    loads++;
    await Bun.sleep(30);
    return loadFiles();
  };
  try {
    const [first, second] = await Promise.all([materializeResources(value), materializeResources(value)]);
    assert.equal(first, second);
    assert.equal(loads, 1);
    value.loadFiles = async () => {
      throw Error('warm archive must not be decoded');
    };
    assert.equal(await materializeResources(value), first);
    writeFileSync(path.join(first, 'instructions/owned.md'), 'tampered');
    await Promise.resolve(assert.rejects(materializeResources(value), /payload differs/));
    assert.equal(readFileSync(path.join(first, 'instructions/owned.md'), 'utf8'), 'tampered');
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('resources reject a linked resource directory and preserve its external owner', async () => {
  const value = fixture();
  try {
    const root = await materializeResources(value);
    const directory = path.join(root, 'instructions');
    const owner = path.join(value.cache, 'external-owned-instructions');
    renameSync(directory, owner);
    symlinkSync(owner, directory, process.platform === 'win32' ? 'junction' : 'dir');
    await Promise.resolve(assert.rejects(materializeResources(value), /link/));
    assert.equal(readFileSync(path.join(owner, 'owned.md'), 'utf8'), 'owned physical instruction');
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('resources clean failed owned staging and refuse uncertain locks or linked payloads', async () => {
  const value = fixture();
  try {
    await Promise.resolve(
      assert.rejects(
        materializeResources({
          ...value,
          loadFiles: async () => {
            throw Error('interrupted owned loader');
          },
        }),
        /interrupted/,
      ),
    );
    assert.equal(readdirSync(value.cache).filter((name) => name.startsWith('.pending-')).length, 0);
    assert.equal(readdirSync(value.cache).filter((name) => name.endsWith('.lock')).length, 0);
    const root = await materializeResources(value);
    linkSync(path.join(root, 'instructions/owned.md'), path.join(value.cache, 'linked-owner'));
    assert.throws(() => verifyResourceTree(root, value.index), /unlinked/);
    const other = { ...value, payloadId: resourceDigest('other'), waitMs: 0 };
    const lock = path.join(other.cache, other.version + '-' + other.payloadId + '.lock');
    writeFileSync(lock, 'unknown prior publisher');
    await Promise.resolve(assert.rejects(materializeResources(other), /uncertain/));
    assert.equal(readFileSync(lock, 'utf8'), 'unknown prior publisher');
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('native metadata commands reuse the public CLI contract without touching resource cache', async () => {
  const stdout = process.stdout;
  const originalWriteDescriptor = Object.getOwnPropertyDescriptor(stdout, 'write');
  const argv = process.argv;
  let output = '';
  let primaryFailure: { error: unknown } | undefined;
  let cleanupFailure: { error: unknown } | undefined;
  try {
    stdout.write = (chunk: string | Uint8Array) => {
      output += String(chunk);
      return true;
    };
    for (const command of ['version', 'help', '--help']) {
      process.argv = [argv[0]!, 'TEST SETUP compiled entry', command];
      output = '';
      await runStandalone({
        payload: 'must not read this missing payload',
        index: [],
        payloadId: 'unused',
        resourceIndexDigest: 'unused',
        version: '0.1.2',
      });
      assert.deepEqual(JSON.parse(output), cliMetadataResult([command], { name: 'vida-agent', version: '0.1.2' }));
    }
    assert.throws(
      () => cliMetadataResult(['version', 'extra'], { name: 'vida-agent', version: '0.1.2' }),
      /no arguments/,
    );
    assert.throws(() => cliMetadataResult(['help', 'extra'], { name: 'vida-agent', version: '0.1.2' }), /no arguments/);
  } catch (error) {
    primaryFailure = { error };
  }
  process.argv = argv;
  try {
    const restored = originalWriteDescriptor
      ? Reflect.defineProperty(stdout, 'write', originalWriteDescriptor)
      : Reflect.deleteProperty(stdout, 'write');
    if (!restored) cleanupFailure = { error: Error('Could not restore stdout.write after metadata test') };
  } catch (error) {
    cleanupFailure = { error };
  }
  if (primaryFailure && cleanupFailure)
    throw new AggregateError([primaryFailure.error, cleanupFailure.error], 'Metadata test and stdout cleanup failed', {
      cause: primaryFailure.error,
    });
  if (primaryFailure) throw primaryFailure.error;
  if (cleanupFailure) throw cleanupFailure.error;
});

test('resources drain disjoint writes before releasing the owned lock on a failed batch', async () => {
  const value = fixture();
  const bytes = Buffer.from('owned physical instruction');
  const entries = Array.from({ length: 12 }, (_, index) => ({
    path: 'instructions/' + index + '.md',
    bytes: bytes.length,
    sha256: resourceDigest(bytes),
  }));
  try {
    const files = new Map(entries.map((entry) => [entry.path, new Blob([bytes])]));
    const fault = new Blob();
    fault.arrayBuffer = async () => {
      await Bun.sleep(10);
      throw Error('owned batch fault');
    };
    files.set(entries[3]!.path, fault);
    let completed = 0;
    let nextBatchStarted = false;
    for (const entry of entries.slice(8)) {
      const later = new Blob();
      later.arrayBuffer = async () => {
        nextBatchStarted = true;
        return new Blob([bytes]).arrayBuffer();
      };
      files.set(entry.path, later);
    }
    for (const [index, entry] of entries.slice(0, 8).entries()) {
      if (index === 3) continue;
      const pending = new Blob();
      pending.arrayBuffer = async () => {
        await Bun.sleep(20);
        assert.equal(readdirSync(value.cache).filter((name) => name.endsWith('.lock')).length, 1);
        completed++;
        return new Blob([bytes]).arrayBuffer();
      };
      files.set(entry.path, pending);
    }
    await Promise.resolve(
      assert.rejects(
        materializeResources({
          ...value,
          index: entries,
          payloadId: resourceDigest(JSON.stringify(entries)),
          loadFiles: async () => files,
        }),
        /owned batch fault/,
      ),
    );
    assert.equal(completed, 7);
    assert.equal(nextBatchStarted, false);
    assert.equal(readdirSync(value.cache).filter((name) => name.endsWith('.lock')).length, 0);
    const pending = readdirSync(value.cache).filter((name) => name.startsWith('.pending-'));
    assert.equal(pending.length, 1);
    const stage = path.join(value.cache, pending[0]!);
    const writtenFiles = ['0.md', '1.md', '2.md', '4.md', '5.md', '6.md', '7.md'];
    assert.deepEqual(readdirSync(path.join(stage, 'instructions')).sort(), writtenFiles);
    for (const name of writtenFiles)
      assert.equal(readFileSync(path.join(stage, 'instructions', name), 'utf8'), bytes.toString());
    assert.equal(
      lstatSync(path.join(value.cache, value.version + '-' + resourceDigest(JSON.stringify(entries))), {
        throwIfNoEntry: false,
      }),
      undefined,
    );
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

// Construction-like full-payload subprocess evidence is kept separate from the
// inert/resource cases above; delivery formation and installation are CI-owned.
test('runtime and initialization routes retain the complete payload outside the discovery view', async () => {
  const value = fixture();
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  let terminal = true;
  try {
    const payload = path.join(value.cache, 'payload.tar.gz');
    const owned = {
      'bin/vida-agent.ts': "throw Error('TEST SETUP complete route reached');",
      'node_modules/owned-runtime.txt': 'TEST SETUP production closure retained',
    };
    const index = Object.entries(owned).map(([name, content]) => ({
      path: name,
      bytes: Buffer.byteLength(content),
      sha256: resourceDigest(content),
    }));
    const payloadId = resourceDigest(JSON.stringify(index));
    await Bun.write(payload, await new Bun.Archive(owned).blob());
    for (const args of [['run'], ['init']] as const) {
      const home = path.join(value.cache, 'consumer-' + args.join('-').replaceAll('--', ''));
      mkdirSync(home);
      const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home };
      for (const name of Object.keys(env))
        if (
          ['NODE_OPTIONS', 'BUN_OPTIONS', 'BUN_BE_BUN', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE'].includes(
            name.toUpperCase(),
          )
        )
          delete env[name];
      const program =
        'const {runStandalone}=await import(' +
        JSON.stringify(path.join(root, 'bin/standalone.ts').replaceAll('\\', '/')) +
        '); process.argv=[process.execPath,"TEST SETUP owned entry",...' +
        JSON.stringify(args) +
        ']; await runStandalone(' +
        JSON.stringify({ payload, index, payloadId, resourceIndexDigest: payloadId, version: value.version }) +
        ');';
      const child = spawnSync(
        process.execPath,
        ['--no-env-file', '--no-install', '--config=' + path.join(root, 'bunfig.toml'), '-e', program],
        { env, encoding: 'utf8', windowsHide: true, timeout: 5_000 },
      );
      if (child.error || child.signal || child.status === null) terminal = false;
      assert.equal(child.error, undefined);
      assert.match(child.stderr, /TEST SETUP complete route reached/);
      const cache = path.join(home, '.vida-agent/runtime');
      const published = readdirSync(cache);
      assert.equal(published.length, 1);
      assert.equal(
        readFileSync(path.join(cache, published[0]!, 'node_modules/owned-runtime.txt'), 'utf8'),
        owned['node_modules/owned-runtime.txt'],
      );
    }
  } finally {
    if (terminal) rmSync(value.cache, { recursive: true, force: true });
    else console.error(JSON.stringify({ status: 'unknown_child_retained', fixture: value.cache }));
  }
}, 30_000);
