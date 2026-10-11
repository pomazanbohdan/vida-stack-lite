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
import { materializeResources, resourceDigest } from '../bin/standalone-resources.mjs';

function fixture() {
  const cache = mkdtempSync(path.join(tmpdir(), 'vida-resource-custody-'));
  const bytes = Buffer.from('captured resource bytes');
  const index = [{ path: 'instructions/owned.md', bytes: bytes.length, sha256: resourceDigest(bytes) }];
  return {
    cache,
    version: '0.1.2',
    payloadId: resourceDigest(JSON.stringify(index)),
    index,
    loadFiles: async () => new Map([['instructions/owned.md', new Blob([bytes])]]),
  };
}

async function rejectedValue(promise) {
  let rejected = false,
    value;
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
          Object.defineProperty(files.get(entries[0].path), 'arrayBuffer', {
            value: async () => {
              await Bun.sleep(15);
              throw new Error('owned archive failure');
            },
          });
          Object.defineProperty(files.get(entries[1].path), 'arrayBuffer', {
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
  let stagePath, replacement;
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
  let identityFailureRoot = identityFailure.cache,
    cleanupFailureRoot;
  await mock.module('node:fs', () => ({
    ...fs,
    /** @param {Parameters<typeof fs.lstatSync>[0]} file @param {Parameters<typeof fs.lstatSync>[1]} options */
    lstatSync(file, options) {
      if (
        identityFailureRoot &&
        String(file).startsWith(identityFailureRoot + path.sep) &&
        path.basename(String(file)).startsWith('.pending-')
      )
        throw undefined;
      return fs.lstatSync(file, options);
    },
    /** @param {Parameters<typeof fs.rmSync>[0]} file @param {Parameters<typeof fs.rmSync>[1]} options */
    rmSync(file, options) {
      if (
        cleanupFailureRoot &&
        String(file).startsWith(cleanupFailureRoot + path.sep) &&
        path.basename(String(file)).startsWith('.pending-')
      )
        throw null;
      return fs.rmSync(file, options);
    },
  }));
  try {
    const isolated = /** @type {typeof import('../bin/standalone-resources.mjs')} */ (
      await import('../bin/standalone-resources.mjs?identity-inspection-' + randomUUID())
    );
    assert.strictEqual(await rejectedValue(isolated.materializeResources(identityFailure)), undefined);
    const stageName = readdirSync(identityFailure.cache).find((name) => name.startsWith('.pending-'));
    assert.ok(stageName);
    assert.ok(fs.lstatSync(path.join(identityFailure.cache, stageName)).isDirectory());
    assert.equal(readdirSync(identityFailure.cache).filter((name) => name.endsWith('.lock')).length, 1);

    identityFailureRoot = undefined;
    const cleanupFailure = fixture();
    cleanupFailureRoot = cleanupFailure.cache;
    let materializationError;
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
    fs.rmSync(cleanupFailure.cache, { recursive: true, force: true });
  } finally {
    mock.restore();
    fs.rmSync(identityFailure.cache, { recursive: true, force: true });
  }
});
