import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { open as openAsync } from 'node:fs/promises';

export const resourceDigest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const resourceEntryExists = (file) => lstatSync(file, { throwIfNoEntry: false }) !== undefined;

export function resourcePath(value) {
  assert.ok(typeof value === 'string' && value.length > 0 && !path.isAbsolute(value), 'Resource path must be relative');
  assert.ok(
    value
      .split('/')
      .every((part) => part && part !== '.' && part !== '..' && !/[\\:\x00-\x1f]/.test(part) && !/[. ]$/.test(part)),
    'Resource path is unsafe',
  );
  return value;
}

export function resourceDirectory(directory, create = false) {
  assert.equal(path.resolve(directory), directory, 'Resource directory must be canonical and absolute');
  const parent = path.dirname(directory);
  if (parent !== directory) resourceDirectory(parent, create);
  let info = lstatSync(directory, { throwIfNoEntry: false });
  if (create && !info) {
    try {
      mkdirSync(directory, { mode: 0o700 });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    info = lstatSync(directory);
  }
  assert.ok(info?.isDirectory() && !info.isSymbolicLink(), 'Resource directory is linked or missing');
}

function privateDirectory(directory) {
  resourceDirectory(directory);
  // Standard POSIX metadata is available only on those runtimes. This is not a Windows ACL or sandbox claim.
  if (typeof process.getuid === 'function') {
    const info = lstatSync(directory);
    assert.ok(info.uid === process.getuid() && (info.mode & 0o077) === 0, 'Resource cache permissions are not private');
  }
}

export function readResource(root, relative) {
  const file = path.join(root, resourcePath(relative));
  resourceDirectory(path.dirname(file));
  const before = lstatSync(file);
  assert.ok(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `Resource file must be regular and unlinked: ${relative}`,
  );
  const descriptor = openSync(file, 'r');
  try {
    const opened = fstatSync(descriptor);
    assert.ok(
      opened.dev === before.dev && opened.ino === before.ino && opened.nlink === 1,
      'Resource identity changed',
    );
    const bytes = readFileSync(descriptor),
      after = lstatSync(file);
    assert.ok(
      after.dev === opened.dev &&
        after.ino === opened.ino &&
        after.size === opened.size &&
        after.nlink === 1 &&
        !after.isSymbolicLink(),
      'Resource changed during read',
    );
    return bytes;
  } finally {
    closeSync(descriptor);
  }
}

function inventory(index) {
  assert.ok(Array.isArray(index) && index.length > 0, 'Resource inventory is empty');
  const files = new Map(),
    directories = new Set();
  const folded = new Set();
  for (const entry of index) {
    const relative = resourcePath(entry.path);
    assert.ok(
      !folded.has(relative.toLowerCase()) &&
        /^[a-f0-9]{64}$/.test(entry.sha256) &&
        Number.isSafeInteger(entry.bytes) &&
        entry.bytes >= 0,
      'Resource inventory is invalid',
    );
    folded.add(relative.toLowerCase());
    files.set(relative, entry);
    const parts = relative.split('/');
    parts.pop();
    for (let length = 1; length <= parts.length; length++) directories.add(parts.slice(0, length).join('/'));
  }
  assert.ok(
    [...directories].every((relative) => !files.has(relative)),
    'Resource file/directory collision',
  );
  return { files, directories };
}

export function verifyResourceTree(root, index) {
  privateDirectory(root);
  const { files, directories } = inventory(index),
    found = new Set();
  function visit(directory, prefix = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relative = prefix + entry.name,
        file = path.join(directory, entry.name);
      assert.ok(!entry.isSymbolicLink(), 'Resource tree contains a link');
      if (entry.isDirectory()) {
        assert.ok(directories.has(relative), 'Resource tree contains an unknown directory');
        privateDirectory(file);
        visit(file, relative + '/');
      } else {
        const expected = files.get(relative);
        assert.ok(entry.isFile() && expected, 'Resource tree contains an unknown file');
        const bytes = readResource(root, relative);
        assert.ok(
          bytes.length === expected.bytes && resourceDigest(bytes) === expected.sha256,
          'Resource payload differs',
        );
        found.add(relative);
      }
    }
  }
  visit(root);
  assert.equal(found.size, files.size, 'Resource tree is partial');
  return root;
}

export async function materializeResources({
  cache,
  privateRoot = cache,
  version,
  payloadId,
  index,
  loadFiles,
  waitMs = 30_000,
}) {
  assert.ok(/^\d+\.\d+\.\d+$/.test(version) && /^[a-f0-9]{64}$/.test(payloadId), 'Resource identity is invalid');
  assert.ok(Number.isSafeInteger(waitMs) && waitMs >= 0, 'Resource wait bound is invalid');
  inventory(index);
  assert.ok(
    cache === privateRoot || cache.startsWith(privateRoot + path.sep),
    'Resource cache escapes its private root',
  );
  resourceDirectory(cache, true);
  const checkCache = () => {
    for (let current = cache; ; current = path.dirname(current)) {
      privateDirectory(current);
      if (current === privateRoot) break;
    }
  };
  checkCache();
  const destination = path.join(cache, version + '-' + payloadId),
    lock = destination + '.lock';
  const started = performance.now();
  let descriptor;
  for (;;) {
    if (resourceEntryExists(destination)) return verifyResourceTree(destination, index);
    try {
      descriptor = openSync(lock, 'wx', 0o600);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const info = lstatSync(lock, { throwIfNoEntry: false });
      if (!info) continue;
      assert.ok(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, 'Resource lock is unsafe');
      if (performance.now() - started >= waitMs)
        throw Error('Resource publication remains in progress or uncertain; retain it for inspection');
      await Bun.sleep(Math.min(25, waitMs));
      checkCache();
    }
  }
  const lockInfo = fstatSync(descriptor),
    marker = randomUUID();
  writeFileSync(descriptor, marker);
  fsyncSync(descriptor);
  try {
    if (resourceEntryExists(destination)) return verifyResourceTree(destination, index);
    const stage = mkdtempSync(path.join(cache, '.pending-' + version + '-'));
    const files = await loadFiles();
    assert.ok(files instanceof Map && files.size === index.length, 'Embedded archive inventory differs');
    const writeEntry = async (entry) => {
      const blob = files.get(entry.path);
      assert.ok(blob, 'Embedded resource is missing');
      const bytes = Buffer.from(await blob.arrayBuffer());
      assert.ok(bytes.length === entry.bytes && resourceDigest(bytes) === entry.sha256, 'Embedded resource differs');
      const file = path.join(stage, entry.path);
      resourceDirectory(path.dirname(file), true);
      checkCache();
      const output = await openAsync(file, 'wx', 0o600);
      try {
        await output.writeFile(bytes);
      } finally {
        await output.close();
      }
    };
    for (let offset = 0; offset < index.length; offset += 8) {
      const outcomes = await Promise.allSettled(index.slice(offset, offset + 8).map(writeEntry));
      const failed = outcomes.find((result) => result.status === 'rejected');
      if (failed) throw failed.reason;
    }
    verifyResourceTree(stage, index);
    checkCache();
    if (resourceEntryExists(destination)) throw Error('Conflicting resource publication; no replacement permitted');
    renameSync(stage, destination);
    return verifyResourceTree(destination, index);
  } finally {
    closeSync(descriptor);
    checkCache();
    const current = lstatSync(lock);
    if (
      current.dev === lockInfo.dev &&
      current.ino === lockInfo.ino &&
      current.isFile() &&
      !current.isSymbolicLink() &&
      current.nlink === 1 &&
      readFileSync(lock, 'utf8') === marker
    )
      unlinkSync(lock);
  }
}
