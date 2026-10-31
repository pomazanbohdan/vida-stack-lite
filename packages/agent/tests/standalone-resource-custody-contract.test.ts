import assert from 'node:assert/strict';
import { mock, test } from 'bun:test';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  lstatSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { materializeResources, resourceDigest } from '../bin/standalone-resources.ts';
import type { ResourceIndexEntry } from '../bin/standalone-resources.ts';

// Keep these references before mock.module updates Bun's live ESM bindings.
const originalFsExports = Object.freeze({ ...fs });

function fixture() {
  const cache = mkdtempSync(path.join(tmpdir(), 'vida-resource-custody-'));
  const bytes = Buffer.from('captured resource bytes');
  const index: [ResourceIndexEntry] = [
    { path: 'instructions/owned.md', bytes: bytes.length, sha256: resourceDigest(bytes) },
  ];
  return {
    cache,
    version: '0.1.2',
    payloadId: resourceDigest(JSON.stringify(index)),
    index,
    loadFiles: async () => new Map([['instructions/owned.md', new Blob([bytes])]]),
  };
}

async function rejectedValue(promise: Promise<unknown>): Promise<unknown> {
  let rejected = false;
  let value: unknown;
  try {
    await promise;
  } catch (error) {
    rejected = true;
    value = error;
  }
  assert.equal(rejected, true, 'expected operation to reject');
  return value;
}

test('failed prepublication materialization drains writes and removes only its original stage', async () => {
  const value = fixture();
  const bytes = Buffer.from('captured resource bytes');
  const entries = Array.from({ length: 2 }, (_, index) => ({
    path: `instructions/${index}.md`,
    bytes: bytes.length,
    sha256: resourceDigest(bytes),
  }));
  let slowWriteSettled = false;
  try {
    await assert.rejects(
      materializeResources({
        ...value,
        index: entries,
        payloadId: resourceDigest(JSON.stringify(entries)),
        loadFiles: async () => {
          const files = new Map(entries.map((entry) => [entry.path, new Blob([bytes])]));
          const first = entries[0];
          const second = entries[1];
          assert.ok(first && second);
          Object.defineProperty(files.get(first.path), 'arrayBuffer', {
            value: async () => {
              await Bun.sleep(15);
              throw new Error('owned archive failure');
            },
          });
          Object.defineProperty(files.get(second.path), 'arrayBuffer', {
            value: async () => {
              await Bun.sleep(30);
              slowWriteSettled = true;
              return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length);
            },
          });
          return files;
        },
      }),
      /owned archive failure/,
    );
    assert.equal(slowWriteSettled, true);
    assert.deepEqual(
      readdirSync(value.cache).filter((name) => name.startsWith('.pending-')),
      [],
    );
    assert.deepEqual(
      readdirSync(value.cache).filter((name) => name.endsWith('.lock')),
      [],
    );
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('prepublication cleanup retains a replaced stage and its foreign contents', async () => {
  const value = fixture();
  let stagePath: string | undefined;
  let replacement: string | undefined;
  try {
    await assert.rejects(
      materializeResources({
        ...value,
        loadFiles: async () => {
          const stageName = readdirSync(value.cache).find((name) => name.startsWith('.pending-'));
          assert.ok(stageName);
          const stage = path.join(value.cache, stageName);
          stagePath = stage;
          replacement = path.join(value.cache, '.pending-foreign-replacement');
          renameSync(stage, replacement);
          mkdirSync(stage);
          writeFileSync(path.join(stage, 'foreign.txt'), 'foreign owner');
          throw new Error('loader stopped before publication');
        },
      }),
      /loader stopped before publication/,
    );
    assert.ok(stagePath && replacement);
    assert.equal(readFileSync(path.join(stagePath, 'foreign.txt'), 'utf8'), 'foreign owner');
    assert.equal(readdirSync(value.cache).filter((name) => name.endsWith('.lock')).length, 0);
    assert.ok(lstatSync(stagePath).isDirectory());
    assert.ok(lstatSync(replacement).isDirectory());
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('prepublication failures preserve falsy rejection values', async () => {
  const value = fixture();
  try {
    for (const reason of [undefined, null, 0, false, '']) {
      const actual = await rejectedValue(
        materializeResources({
          ...value,
          loadFiles: async () => {
            throw reason;
          },
        }),
      );
      assert.strictEqual(actual, reason);
      assert.equal(readdirSync(value.cache).filter((name) => name.startsWith('.pending-')).length, 0);
      assert.equal(readdirSync(value.cache).filter((name) => name.endsWith('.lock')).length, 0);

      const blob = new Blob();
      Object.defineProperty(blob, 'arrayBuffer', { value: async () => Promise.reject(reason) });
      const writeFailure = await rejectedValue(
        materializeResources({ ...value, loadFiles: async () => new Map([[value.index[0].path, blob]]) }),
      );
      assert.strictEqual(writeFailure, reason);
      assert.equal(readdirSync(value.cache).filter((name) => name.startsWith('.pending-')).length, 0);
      assert.equal(readdirSync(value.cache).filter((name) => name.endsWith('.lock')).length, 0);
    }
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('unknown stage identity and cleanup custody retains stages and locks', async () => {
  const identityFailure = fixture();
  let identityFailureRoot: string | undefined = identityFailure.cache;
  let cleanupFailureRoot: string | undefined;
  await mock.module('node:fs', () => ({
    ...originalFsExports,
    lstatSync(file: Parameters<typeof fs.lstatSync>[0], options: Parameters<typeof fs.lstatSync>[1]) {
      if (
        identityFailureRoot &&
        String(file).startsWith(identityFailureRoot + path.sep) &&
        path.basename(String(file)).startsWith('.pending-')
      )
        throw undefined;
      return originalFsExports.lstatSync(file, options);
    },
    rmSync(file: Parameters<typeof fs.rmSync>[0], options: Parameters<typeof fs.rmSync>[1]) {
      if (
        cleanupFailureRoot &&
        String(file).startsWith(cleanupFailureRoot + path.sep) &&
        path.basename(String(file)).startsWith('.pending-')
      )
        throw null;
      return originalFsExports.rmSync(file, options);
    },
  }));
  try {
    try {
      const isolated = (await import(
        '../bin/standalone-resources.ts?identity-inspection-' + randomUUID()
      )) as typeof import('../bin/standalone-resources.ts');
      assert.strictEqual(await rejectedValue(isolated.materializeResources(identityFailure)), undefined);
      const stageName = readdirSync(identityFailure.cache).find((name) => name.startsWith('.pending-'));
      assert.ok(stageName);
      assert.ok(fs.lstatSync(path.join(identityFailure.cache, stageName)).isDirectory());
      assert.equal(readdirSync(identityFailure.cache).filter((name) => name.endsWith('.lock')).length, 1);

      identityFailureRoot = undefined;
      const cleanupFailure = fixture();
      cleanupFailureRoot = cleanupFailure.cache;
      let materializationError: unknown;
      try {
        await isolated.materializeResources({
          ...cleanupFailure,
          loadFiles: async () => {
            throw undefined;
          },
        });
      } catch (error) {
        materializationError = error;
      }
      assert.ok(materializationError instanceof AggregateError);
      assert.deepEqual(materializationError.errors, [undefined, null]);
      assert.equal(readdirSync(cleanupFailure.cache).filter((name) => name.startsWith('.pending-')).length, 1);
      assert.equal(readdirSync(cleanupFailure.cache).filter((name) => name.endsWith('.lock')).length, 1);
      cleanupFailureRoot = undefined;
      originalFsExports.rmSync(cleanupFailure.cache, { recursive: true, force: true });
    } finally {
      try {
        await mock.module('node:fs', () => originalFsExports);
      } finally {
        mock.restore();
      }
    }

    const restoredFs = await import('node:fs');
    assert.strictEqual(restoredFs.lstatSync, originalFsExports.lstatSync);
    assert.strictEqual(restoredFs.rmSync, originalFsExports.rmSync);
    assert.strictEqual(restoredFs.readFileSync, originalFsExports.readFileSync);
    const probe = path.join(identityFailure.cache, 'restored-fs-probe.txt');
    originalFsExports.writeFileSync(probe, 'original filesystem export');
    assert.equal(restoredFs.readFileSync(probe, 'utf8'), 'original filesystem export');
  } finally {
    originalFsExports.rmSync(identityFailure.cache, { recursive: true, force: true });
  }
});

test('readResource preserves primary and close failures after the native descriptor is closed', async () => {
  const value = fixture();
  const directory = path.join(value.cache, 'instructions');
  mkdirSync(directory);
  writeFileSync(path.join(directory, 'owned.md'), 'resource bytes');
  const closeError = new Error('injected close wrapper failure');

  async function readWithCloseFault(primaryFailure?: { readonly error: unknown }, injectCloseFailure = true) {
    let descriptor: number | undefined;
    let closeAttempts = 0;
    await mock.module('node:fs', () => ({
      ...originalFsExports,
      openSync(...args: Parameters<typeof fs.openSync>) {
        const opened = originalFsExports.openSync(...args);
        descriptor = opened;
        return opened;
      },
      readFileSync(...args: Parameters<typeof fs.readFileSync>) {
        if (typeof args[0] === 'number' && primaryFailure !== undefined) throw primaryFailure.error;
        return originalFsExports.readFileSync(...args);
      },
      closeSync(fd: number) {
        closeAttempts += 1;
        originalFsExports.closeSync(fd);
        if (injectCloseFailure) throw closeError;
      },
    }));
    try {
      const isolated = (await import(
        '../bin/standalone-resources.ts?read-close-' + randomUUID()
      )) as typeof import('../bin/standalone-resources.ts');
      let outcome: unknown;
      let rejected = false;
      try {
        outcome = isolated.readResource(value.cache, 'instructions/owned.md');
      } catch (error) {
        rejected = true;
        outcome = error;
      }
      assert.equal(rejected, primaryFailure !== undefined || injectCloseFailure);
      assert.equal(closeAttempts, 1);
      assert.notEqual(descriptor, undefined);
      assert.throws(() => originalFsExports.fstatSync(descriptor as number));
      return outcome;
    } finally {
      await mock.module('node:fs', () => originalFsExports);
      mock.restore();
      const restoredFs = await import('node:fs');
      assert.strictEqual(restoredFs.closeSync, originalFsExports.closeSync);
      assert.strictEqual(restoredFs.readFileSync, originalFsExports.readFileSync);
    }
  }

  try {
    const primary = new Error('injected resource read failure');
    const bodyAndClose = await readWithCloseFault({ error: primary });
    assert.ok(bodyAndClose instanceof AggregateError);
    assert.deepEqual((bodyAndClose as AggregateError).errors, [primary, closeError]);

    const undefinedAndClose = await readWithCloseFault({ error: undefined });
    assert.ok(undefinedAndClose instanceof AggregateError);
    assert.deepEqual((undefinedAndClose as AggregateError).errors, [undefined, closeError]);

    const closeOnly = await readWithCloseFault();
    assert.strictEqual(closeOnly, closeError);
    assert.strictEqual(await readWithCloseFault({ error: primary }, false), primary);
    assert.strictEqual(await readWithCloseFault({ error: undefined }, false), undefined);
    assert.deepEqual(await readWithCloseFault(undefined, false), Buffer.from('resource bytes'));
  } finally {
    originalFsExports.rmSync(value.cache, { recursive: true, force: true });
  }
});

test('nested cache revalidates warm resources and rejects altered inventories', async () => {
  const value = fixture();
  const cache = path.join(value.cache, 'nested', 'cache');
  const options = { ...value, cache, privateRoot: value.cache };
  try {
    const destination = await materializeResources(options);
    assert.equal(
      await materializeResources({
        ...options,
        loadFiles: async () => {
          throw Error('unexpected reload');
        },
      }),
      destination,
    );
    const file = path.join(destination, 'instructions', 'owned.md');
    const original = readFileSync(file);
    writeFileSync(file, 'tampered');
    await assert.rejects(materializeResources(options), /Resource payload differs/);
    writeFileSync(file, original);
    rmSync(file);
    await assert.rejects(materializeResources(options), /Resource tree is partial/);
    writeFileSync(file, original);
    const foreign = path.join(destination, 'unmanaged.txt');
    writeFileSync(foreign, 'foreign');
    await assert.rejects(materializeResources(options), /Resource tree contains an unknown file/);
    rmSync(foreign);
    assert.equal(await materializeResources(options), destination);
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});

test('nested cache rejects substituted cache and ancestor at admission', async () => {
  const value = fixture();
  const ancestor = path.join(value.cache, 'nested');
  const cache = path.join(ancestor, 'cache');
  const options = { ...value, cache, privateRoot: value.cache };
  try {
    const destination = await materializeResources(options);
    for (const component of [cache, ancestor]) {
      const retained = component + '-retained';
      renameSync(component, retained);
      try {
        writeFileSync(component, 'foreign replacement');
        await assert.rejects(materializeResources(options), /Resource directory is linked or missing/);
        assert.equal(readFileSync(component, 'utf8'), 'foreign replacement');
      } finally {
        rmSync(component, { force: true });
        renameSync(retained, component);
      }
      assert.equal(await materializeResources(options), destination);
    }
  } finally {
    rmSync(value.cache, { recursive: true, force: true });
  }
});
