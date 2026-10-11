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
