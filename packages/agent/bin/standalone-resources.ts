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
import {
  ownedDirectoryIdentity,
  removeOwnedDirectoryOrThrow,
  type OwnedDirectoryIdentity,
} from '../tooling/owned-staging.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';

export interface ResourceIndexEntry {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
}
type EmbeddedResourceFiles = Map<string, Blob>;
interface ResourceDirectoryEntry {
  readonly name: string;
  isSymbolicLink(): boolean;
  isDirectory(): boolean;
  isFile(): boolean;
}

export const resourceDigest = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const resourceEntryExists = (file: string) => lstatSync(file, { throwIfNoEntry: false }) !== undefined;
const unsafeResourceComponents = Object.freeze(['', '.', '..']);

export function resourcePath(value: string) {
  assert.ok(typeof value === 'string' && value.length > 0 && !path.isAbsolute(value), 'Resource path must be relative');
  assert.ok(value.split('/').every(isSafeResourceComponent), 'Resource path is unsafe');
  return value;
}

function isSafeResourceComponent(part: string) {
  return Boolean(
    !unsafeResourceComponents.includes(part) &&
    !/[\\:]/.test(part) &&
    !hasControlCharacter(part) &&
    !/[. ]$/.test(part),
  );
}

function hasControlCharacter(value: string) {
  for (let index = 0; index < value.length; index++) if (value.charCodeAt(index) < 32) return true;
  return false;
}

export function resourceDirectory(directory: string, create = false) {
  assert.equal(path.resolve(directory), directory, 'Resource directory must be canonical and absolute');
  const parent = path.dirname(directory);
  if (parent !== directory) resourceDirectory(parent, create);
  let info = lstatSync(directory, { throwIfNoEntry: false });
  if (create && !info) {
    try {
      mkdirSync(directory, { mode: 0o700 });
    } catch (error) {
      if (!hasErrorCode(error, 'EEXIST')) throw error;
    }
    info = lstatSync(directory);
  }
  assert.ok(info?.isDirectory() && !info.isSymbolicLink(), 'Resource directory is linked or missing');
}

function hasErrorCode(error: unknown, code: string) {
  return error instanceof Error && 'code' in error && error.code === code;
}

function privateDirectory(directory: string) {
  resourceDirectory(directory);
  // Standard POSIX metadata is available only on those runtimes. This is not a Windows ACL or sandbox claim.
  if (typeof process.getuid === 'function') {
    const info = lstatSync(directory);
    assert.ok(info.uid === process.getuid() && (info.mode & 0o077) === 0, 'Resource cache permissions are not private');
  }
}

export function readResource(root: string, relative: string) {
  const file = path.join(root, resourcePath(relative));
  resourceDirectory(path.dirname(file));
  const before = lstatSync(file);
  assert.ok(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `Resource file must be regular and unlinked: ${relative}`,
  );
  const descriptor = openSync(file, 'r');
  let outcome: { readonly ok: true; readonly value: Buffer } | { readonly ok: false; readonly error: unknown };
  let closeFailure: { readonly error: unknown } | undefined;
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
    outcome = { ok: true, value: bytes };
  } catch (error) {
    outcome = { ok: false, error };
  } finally {
    try {
      closeSync(descriptor);
    } catch (error) {
      closeFailure = { error };
    }
  }
  if (closeFailure) {
    if (!outcome.ok)
      throw new AggregateError([outcome.error, closeFailure.error], 'Standalone resource read and close failed');
    throw closeFailure.error;
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

function isResourceIndexEntry(value: unknown): value is ResourceIndexEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof value.path === 'string' &&
    'sha256' in value &&
    typeof value.sha256 === 'string' &&
    'bytes' in value &&
    typeof value.bytes === 'number'
  );
}

function isResourceIndex(value: unknown): value is readonly ResourceIndexEntry[] {
  return Array.isArray(value) && value.every(isResourceIndexEntry);
}

function isEmbeddedResourceFiles(value: unknown): value is EmbeddedResourceFiles {
  return value instanceof Map && [...value].every(([name, blob]) => typeof name === 'string' && blob instanceof Blob);
}

function isResourceDirectoryEntry(value: unknown): value is ResourceDirectoryEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'isSymbolicLink' in value &&
    typeof value.isSymbolicLink === 'function' &&
    'isDirectory' in value &&
    typeof value.isDirectory === 'function' &&
    'isFile' in value &&
    typeof value.isFile === 'function'
  );
}

function readDirectoryEntries(directory: string): ResourceDirectoryEntry[] {
  const entries: unknown = readdirSync(directory, { withFileTypes: true });
  if (!Array.isArray(entries)) throw new Error('Resource directory listing is invalid');
  const selected: ResourceDirectoryEntry[] = [];
  for (const entry of entries) {
    if (!isResourceDirectoryEntry(entry)) throw new Error('Resource directory entry is invalid');
    selected.push(entry);
  }
  return selected;
}

function resourceChildPath(prefix: string, name: string) {
  return prefix + name;
}

function inventory(index: readonly ResourceIndexEntry[]) {
  assert.ok(index.length > 0, 'Resource inventory is empty');
  const typedFiles = new Map<string, ResourceIndexEntry>();
  const typedDirectories = new Set<string>();
  const folded = new Set<string>();
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
    typedFiles.set(relative, entry);
    const parts = relative.split('/');
    parts.pop();
    for (let length = 1; length <= parts.length; length++) typedDirectories.add(parts.slice(0, length).join('/'));
  }
  assert.ok(
    [...typedDirectories].every((relative) => !typedFiles.has(relative)),
    'Resource file/directory collision',
  );
  return { files: typedFiles, directories: typedDirectories };
}

export function verifyResourceTree(root: string, index: readonly ResourceIndexEntry[]) {
  privateDirectory(root);
  const { files, directories } = inventory(index);
  const found = new Set<string>();
  function visit(directory: string, prefix = '') {
    for (const currentEntry of readDirectoryEntries(directory)) {
      const relative = resourceChildPath(prefix, currentEntry.name);
      const file = path.join(directory, currentEntry.name);
      assert.ok(!currentEntry.isSymbolicLink(), 'Resource tree contains a link');
      if (currentEntry.isDirectory()) {
        assert.ok(directories.has(relative), 'Resource tree contains an unknown directory');
        privateDirectory(file);
        visit(file, relative + '/');
      } else {
        const expected = files.get(relative);
        assert.ok(currentEntry.isFile() && expected, 'Resource tree contains an unknown file');
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

function assertResourceIdentity(version: string, payloadId: string) {
  assert.ok(/^\d+\.\d+\.\d+$/.test(version) && /^[a-f0-9]{64}$/.test(payloadId), 'Resource identity is invalid');
}

function assertResourceCacheRoot(cache: string, privateRoot: string) {
  assert.ok(
    cache === privateRoot || cache.startsWith(privateRoot + path.sep),
    'Resource cache escapes its private root',
  );
}

export interface MaterializeResourcesOptions {
  cache: string;
  privateRoot?: string;
  version: string;
  payloadId: string;
  index: unknown;
  loadFiles: () => Promise<unknown>;
  waitMs?: number;
}

export async function materializeResources({
  cache,
  privateRoot = cache,
  version,
  payloadId,
  index,
  loadFiles,
  waitMs = 30_000,
}: MaterializeResourcesOptions): Promise<string> {
  assert.ok(isResourceIndex(index) && index.length > 0, 'Resource inventory is empty or invalid');
  assertResourceIdentity(version, payloadId);
  assert.ok(Number.isSafeInteger(waitMs) && waitMs >= 0, 'Resource wait bound is invalid');
  inventory(index);
  assertResourceCacheRoot(cache, privateRoot);
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
      if (!hasErrorCode(error, 'EEXIST')) throw error;
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
  let stage: string | undefined;
  let stageIdentity: OwnedDirectoryIdentity | undefined;
  let primaryFailure: { error: unknown } | undefined;
  let stagingCleanupAllowed = true;
  let publicationStarted = false;
  let retainLock = false;
  try {
    if (resourceEntryExists(destination)) return verifyResourceTree(destination, index);
    stage = mkdtempSync(path.join(cache, '.pending-' + version + '-'));
    stageIdentity = ownedDirectoryIdentity(stage);
    const ownedStage = stage;
    const loadedFiles = await loadFiles();
    if (!isEmbeddedResourceFiles(loadedFiles) || loadedFiles.size !== index.length)
      throw new Error('Embedded archive inventory differs');
    const files = loadedFiles;
    const writeEntry = async (entry: ResourceIndexEntry): Promise<void> => {
      const blob = files.get(entry.path);
      assert.ok(blob, 'Embedded resource is missing');
      const bytes = Buffer.from(await blob.arrayBuffer());
      assert.ok(bytes.length === entry.bytes && resourceDigest(bytes) === entry.sha256, 'Embedded resource differs');
      const file = path.join(ownedStage, entry.path);
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
    verifyResourceTree(ownedStage, index);
    checkCache();
    if (resourceEntryExists(destination)) throw Error('Conflicting resource publication; no replacement permitted');
    stagingCleanupAllowed = false;
    publicationStarted = true;
    renameSync(ownedStage, destination);
    return verifyResourceTree(destination, index);
  } catch (error) {
    primaryFailure = { error };
    retainLock = publicationStarted || (stage !== undefined && stageIdentity === undefined);
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          try {
            closeSync(descriptor);
          } catch (error) {
            retainLock = true;
            throw error;
          }
        },
        () => {
          if (stage === undefined || !stagingCleanupAllowed || stageIdentity === undefined) return;
          try {
            checkCache();
            const status = removeOwnedDirectoryOrThrow(stage, stageIdentity);
            // An observed replacement is foreign scratch. Preserve it and finish
            // the failed prepublication attempt; unknown inspection/removal throws.
            if (status === 'identity-mismatch') return;
            return status;
          } catch (error) {
            retainLock = true;
            throw error;
          }
        },
        () => {
          if (retainLock) return;
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
        },
      ],
      primaryFailure,
    );
  }
}
