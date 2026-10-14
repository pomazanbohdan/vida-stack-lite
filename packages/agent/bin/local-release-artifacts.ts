import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  closeSync,
  constants as fileConstants,
  existsSync,
  fsyncSync,
  fstatSync,
  lstatSync,
  mkdirSync,
  opendirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Stats } from 'node:fs';
import { withWorkspaceDatabaseClose, withWorkspaceDatabaseCloseAsync } from '../src/config/workspace-database-raw.js';

type ReleaseStatus =
  | 'awaiting_assurance'
  | 'running'
  | 'qualified'
  | 'packing'
  | 'packed'
  | 'installing'
  | 'successful'
  | 'failed';
type ReleaseAssertion = (value: unknown, message: string) => asserts value;
export type ReleaseState = Record<string, unknown> & {
  schema: 'VidaLocalReleaseState/v1';
  operation_id: string;
  version: string;
  status: ReleaseStatus;
};
type ReleasePackFile = Record<string, unknown> & { path: string; size: number };
type ReleasePackEntry = Record<string, unknown> & { filename: string; files: ReleasePackFile[] };
type SourceIdentity = readonly [number, number, number, number, number];
type ReleaseSourceInput = { path: string; sha256: string };
type SourceDirectoryIdentity = { path: string; identity: SourceIdentity };
export type SourceObservation =
  | (ReleaseSourceInput & { identity: SourceIdentity; kind?: never })
  | (SourceDirectoryIdentity & { kind: 'directory' });
type SourceNodeMarker = { path: string };
type RepairSourcePass = object & { readonly __repairSourcePass: never };
type RepairSourceState = {
  root: string | null;
  rootInput: string | null;
  rootIdentity: SourceIdentity | null;
  physicalNodes: Set<string | SourceNodeMarker>;
  nodePaths: Map<string, string | SourceNodeMarker>;
  paths: Map<string, { entries: ReleaseSourceInput[]; observations: SourceObservation[] }>;
};
type ReleaseSourceBinding = {
  source_binding: string;
  entries: ReleaseSourceInput[];
  observations?: SourceObservation[];
};
type PackedMetadataEntry = { files: Array<{ path: unknown }> };
type ArchiveMetadataEntry = {
  name: unknown;
  version: unknown;
  filename: unknown;
  integrity: unknown;
  files: Array<{ path: unknown }>;
};
type SqliteConnection = import('bun:sqlite').Database | import('node:sqlite').DatabaseSync;

export const releaseIdPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
export const releaseJSON = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';
export const releaseDigest = (bytes: Parameters<ReturnType<typeof createHash>['update']>[0]): string =>
  createHash('sha256').update(bytes).digest('hex');
export function parseReleaseVersion(value: unknown): { major: number; minor: number; patch: number } | null {
  const match = typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return [major, minor, patch].every(Number.isSafeInteger) ? { major, minor, patch } : null;
}
export const requireRelease: ReleaseAssertion = (value, message) => {
  if (!value) throw Error('Local release: ' + message);
};
export const releaseRootDefault = fileURLToPath(new URL('../../../', import.meta.url));

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !isUnknownArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Data-only projection; it grants no release or installation authority.
 */
export function parseReleasePackMetadata(value: unknown): [ReleasePackEntry] {
  requireRelease(isUnknownArray(value) && value.length === 1, 'release pack metadata invalid');
  const entry: unknown = value[0];
  requireRelease(
    isRecord(entry) && typeof entry.filename === 'string' && isUnknownArray(entry.files),
    'release pack metadata invalid',
  );
  const files = entry.files.map(parseReleasePackFile);
  return [{ ...entry, filename: entry.filename, files }];
}
function parseReleasePackFile(value: unknown): ReleasePackFile {
  requireRelease(
    isRecord(value) &&
      typeof value.path === 'string' &&
      typeof value.size === 'number' &&
      Number.isSafeInteger(value.size) &&
      value.size >= 0,
    'release pack file metadata invalid',
  );
  return { ...value, path: value.path, size: value.size };
}

function sameReleaseFileImage(left: Stats, right: Stats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs &&
    right.nlink === 1 &&
    right.isFile()
  );
}
function finiteReleaseIdentityNumber(value: unknown): number {
  requireRelease(typeof value === 'number' && Number.isFinite(value), 'release file identity number invalid');
  return value;
}
export function parseReleaseFileIdentity(value: unknown): SourceIdentity {
  requireRelease(isUnknownArray(value) && value.length === 5, 'release file identity invalid');
  return [
    finiteReleaseIdentityNumber(value[0]),
    finiteReleaseIdentityNumber(value[1]),
    finiteReleaseIdentityNumber(value[2]),
    finiteReleaseIdentityNumber(value[3]),
    finiteReleaseIdentityNumber(value[4]),
  ];
}
export function parseReleaseSourceObservation(value: unknown): SourceObservation {
  requireRelease(isRecord(value), 'release Source observation invalid');
  const observedPath = releaseRelative(value.path);
  const identity = parseReleaseFileIdentity(value.identity);
  if (value.kind === 'directory') {
    requireRelease(
      Object.keys(value).sort().join() === ['path', 'identity', 'kind'].sort().join(),
      'release Source directory fields differ',
    );
    return { path: observedPath, kind: 'directory', identity };
  }
  requireRelease(
    Object.keys(value).sort().join() === ['path', 'identity', 'sha256'].sort().join() &&
      typeof value.sha256 === 'string' &&
      /^[a-f0-9]{64}$/.test(value.sha256),
    'release Source file fields differ',
  );
  return { path: observedPath, sha256: value.sha256, identity };
}
function readBoundedReleaseDescriptor(descriptor: number, size: number): Buffer {
  const buffer = Buffer.alloc(size + 1);
  let length = 0;
  while (length < buffer.length) {
    const count = readSync(descriptor, buffer, length, buffer.length - length, null);
    if (count === 0) break;
    length += count;
  }
  requireRelease(length === size, 'release file changed during read');
  return buffer.subarray(0, length);
}
/** One descriptor-owned, bounded byte image. Operation-specific authorization stays with the caller.
 */
export function readReleaseBytes(root: string, relative: string, limit = 8 * 1024 * 1024): Buffer {
  const file = releasePath(root, relative);
  return readReleaseFileBytes(file, limit, () => releasePath(root, relative));
}
function readReleaseFileBytes(file: string, limit: number, currentPath: () => string): Buffer {
  requireRelease(
    Number.isSafeInteger(limit) && limit > 0 && limit <= 512 * 1024 * 1024,
    'release read byte bound invalid',
  );
  const descriptor = openSync(file, fileConstants.O_RDONLY | (fileConstants.O_NOFOLLOW ?? 0));
  return withWorkspaceDatabaseClose(
    descriptor,
    () => {
      const before = fstatSync(descriptor);
      requireRelease(before.isFile() && before.nlink === 1 && before.size <= limit, 'release file unsafe or oversized');
      const bytes = readBoundedReleaseDescriptor(descriptor, before.size);
      requireRelease(
        sameReleaseFileImage(before, fstatSync(descriptor)) && sameReleaseFileImage(before, lstatSync(currentPath())),
        'release file changed during read',
      );
      return bytes;
    },
    closeSync,
    'Release byte read and descriptor close both failed',
  );
}

export function releaseRelative(value: unknown): string {
  requireRelease(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 1024 &&
      !/[\\\p{Cc}]/u.test(value) &&
      !value.startsWith('/') &&
      value
        .split('/')
        .every(
          (part) =>
            part &&
            part !== '.' &&
            part !== '..' &&
            !/[<>:"|?*]/.test(part) &&
            !/[. ]$/.test(part) &&
            !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
        ),
    'invalid relative path',
  );
  return value;
}

/**
 * The shared release namespace; no Host ledger or installation state is created here.
 */
export function releasePath(root: string, relative: string, allowMissing = false): string {
  requireRelease(path.isAbsolute(root), 'absolute root required');
  const base = realpathSync(root);
  requireRelease(!lstatSync(root).isSymbolicLink(), 'linked root');
  let current = base;
  for (const part of releaseRelative(relative).split('/')) {
    current = path.join(current, part);
    const stat = lstatSync(current, { throwIfNoEntry: false });
    if (!stat) {
      requireRelease(allowMissing, 'path missing');
      continue;
    }
    requireRelease(
      !stat.isSymbolicLink() && (stat.isDirectory() || (stat.isFile() && stat.nlink === 1)),
      'linked or non-regular path',
    );
  }
  return current;
}

export function releaseDirectory(root: string, relative: string): string {
  requireRelease(
    path.isAbsolute(root) && lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(),
    'root must be a real directory',
  );
  let current = realpathSync(root);
  for (const part of releaseRelative(relative).split('/')) {
    current = path.join(current, part);
    if (!existsSync(current)) mkdirSync(current);
    requireRelease(lstatSync(current).isDirectory() && !lstatSync(current).isSymbolicLink(), 'linked directory');
  }
  return current;
}

export function releaseJournalFile(root: string, operation: string): string {
  requireRelease(releaseIdPattern.test(operation), 'operation invalid');
  return releasePath(root, '.agent/work/agent-local-release/' + operation + '/release.json', true);
}

export function parseReleaseState(value: unknown): ReleaseState {
  requireRelease(isReleaseState(value), 'current state invalid');
  return value;
}

function isReleaseState(value: unknown): value is ReleaseState {
  const allowed = new Set([
    'schema',
    'operation_id',
    'version',
    'status',
    'pid',
    'elapsed_ms',
    'source_binding',
    'pack_metadata',
    'tarball_sha256',
    'install_started',
    'installed_root',
    'prefix',
    'path_command',
    'completed_at',
    'error',
  ]);
  return (
    isRecord(value) &&
    value.schema === 'VidaLocalReleaseState/v1' &&
    typeof value.operation_id === 'string' &&
    releaseIdPattern.test(value.operation_id) &&
    parseReleaseVersion(value.version) !== null &&
    isReleaseStatus(value.status) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function isReleaseStatus(value: unknown): value is ReleaseStatus {
  return (
    typeof value === 'string' &&
    ['awaiting_assurance', 'running', 'qualified', 'packing', 'packed', 'installing', 'successful', 'failed'].includes(
      value,
    )
  );
}

export function releaseState(file: string): ReleaseState {
  const bytes = readReleaseFileBytes(file, 8 * 1024 * 1024, () => file);
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const value: unknown = JSON.parse(text);
  return parseReleaseState(value);
}

export function saveReleaseState(file: string, value: unknown): void {
  const temporary = file + '.' + randomUUID() + '.tmp';
  const descriptor = openSync(temporary, 'wx', 0o600);
  withWorkspaceDatabaseClose(
    descriptor,
    () => {
      writeFileSync(descriptor, releaseJSON(value));
      fsyncSync(descriptor);
    },
    closeSync,
    'Release state save and descriptor close both failed',
  );
  renameSync(temporary, file);
}

function sqlite(file: string, timeout: number): SqliteConnection {
  const require = createRequire(import.meta.url);
  if (process.versions.bun) {
    const loaded: unknown = require('bun:sqlite');
    requireRelease(isBunSqliteModule(loaded), 'Bun SQLite module unavailable');
    const { Database } = loaded;
    const connection = new Database(file, { create: true, strict: true });
    connection.exec('PRAGMA busy_timeout=' + timeout);
    return connection;
  }
  const loaded: unknown = require('node:sqlite');
  requireRelease(isNodeSqliteModule(loaded), 'Node SQLite module unavailable');
  const { DatabaseSync } = loaded;
  return new DatabaseSync(file, { timeout });
}

function isBunSqliteModule(value: unknown): value is typeof import('bun:sqlite') {
  return isRecord(value) && typeof value.Database === 'function';
}

function isNodeSqliteModule(value: unknown): value is typeof import('node:sqlite') {
  return isRecord(value) && typeof value.DatabaseSync === 'function';
}

function isSqliteBusy(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    (('errcode' in error && error.errcode === 5) || ('code' in error && error.code === 'SQLITE_BUSY'))
  );
}
function openMutex(root: string, relative: string, timeout: number, busyIsNull = false): SqliteConnection | null {
  releaseDirectory(root, path.posix.dirname(relative));
  const connection = sqlite(releasePath(root, relative, true), timeout);
  try {
    connection.exec('BEGIN IMMEDIATE');
    return connection;
  } catch (error) {
    connection.close();
    if (busyIsNull && isSqliteBusy(error)) return null;
    throw error;
  }
}

export function operationMutex(root: string, operation: string): SqliteConnection | null {
  requireRelease(releaseIdPattern.test(operation), 'operation invalid');
  return openMutex(root, '.agent/work/agent-local-release/' + operation + '/worker.sqlite', 0, true);
}

export function admissionMutex(root: string, allowPreparation = false): SqliteConnection {
  const connection = openMutex(root, '.agent/work/agent-local-release/admission.sqlite', 1000);
  requireRelease(connection, 'admission mutex unavailable');
  try {
    if (!allowPreparation) assertPreparationSettled(root);
    return connection;
  } catch (error) {
    connection.close();
    throw error;
  }
}

function assertPreparationSettled(root: string): void {
  requireRelease(
    !existsSync(releasePath(root, '.agent/work/agent-local-release/preparation.json', true)),
    'preparation pending; resume release preparation before another operation',
  );
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}
export async function withReleaseAdmission<T>(root: string, action: () => T, allowPreparation = false): Promise<T> {
  const connection = admissionMutex(root, allowPreparation);
  let open = true;
  try {
    const result = action();
    requireRelease(!isThenable(result), 'admission action must be synchronous and bounded');
    connection.exec('COMMIT');
    open = false;
    return result;
  } finally {
    try {
      if (open) connection.exec('ROLLBACK');
    } finally {
      connection.close();
    }
  }
}

/** Repair publication only. Expensive extraction/copies happen before this lock pair. */
export async function withReleaseRepairLocks<T>(
  root: string,
  operation: string,
  action: () => T | Promise<T>,
): Promise<T> {
  const admission = admissionMutex(root);
  return withWorkspaceDatabaseCloseAsync(
    admission,
    async () => {
      const worker = operationMutex(root, operation);
      requireRelease(worker, 'operation busy');
      return withWorkspaceDatabaseCloseAsync(
        worker,
        action,
        (database) => database.close(),
        'release repair worker close failed',
      );
    },
    (database) => database.close(),
    'release repair admission close failed',
  );
}

function isPackedMetadata(value: unknown): value is [PackedMetadataEntry] {
  return (
    isUnknownArray(value) &&
    value.length === 1 &&
    isRecord(value[0]) &&
    isUnknownArray(value[0].files) &&
    value[0].files.every((file) => isRecord(file) && 'path' in file)
  );
}
function isArchiveMetadata(value: unknown): value is [ArchiveMetadataEntry] {
  if (!isUnknownArray(value) || value.length !== 1) return false;
  const entry = value[0];
  if (!isRecord(entry)) return false;
  if (!['name', 'version', 'filename', 'integrity', 'files'].every((key) => key in entry)) return false;
  if (!isUnknownArray(entry.files)) return false;
  return entry.files.every((file) => isRecord(file) && 'path' in file);
}
export function packedDistribution(metadata: unknown): 'native' | 'npm' {
  requireRelease(isPackedMetadata(metadata), 'exact metadata missing');
  const paths = metadata[0].files.map((file) => releaseRelative(file.path));
  requireRelease(new Set(paths).size === paths.length, 'ambiguous file set');
  return paths.some((file) => file.startsWith('dist/standalone/')) ? 'native' : 'npm';
}

export function assertReleaseArchiveIntegrity(metadata: unknown, bytes: Uint8Array): void {
  requireRelease(isArchiveMetadata(metadata), 'exact one archive required');
  requireRelease(
    metadata[0].integrity === 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
    'archive integrity differs',
  );
}

export function selectedTarball(metadata: unknown, folder: string, version: string): string {
  requireRelease(isArchiveMetadata(metadata), 'exact one archive required');
  const item = metadata[0];
  requireRelease(
    item.name === 'vida-agent' &&
      item.version === version &&
      typeof item.filename === 'string' &&
      path.basename(item.filename) === item.filename &&
      parseReleaseVersion(version) !== null &&
      item.filename === 'vida-agent-' + version + '.tgz' &&
      isUnknownArray(item.files) &&
      item.files.length > 0,
    'archive identity differs',
  );
  for (const file of item.files) releaseRelative(file.path);
  const file = releasePath(folder, item.filename);
  assertReleaseArchiveIntegrity(metadata, readReleaseBytes(folder, item.filename, 512 * 1024 * 1024));
  return file;
}

const excluded = new Set(['node_modules', 'dist', 'coverage', '.pack-inspect']);
const scratch = new Set(['.tmp', '.agent', 'packages/agent/.tmp', 'packages/agent/.agent']);
/**
 */
const repairSourcePasses = new WeakMap<RepairSourcePass, RepairSourceState>();
const repairSourceNodeLimit = 8192;
const sourceIdentity = (info: Stats): SourceIdentity => [info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs];
function registerRepairSourceNode(state: RepairSourceState, relative: string, file: string, stat: Stats): void {
  releaseRelative(relative);
  requireRelease(!stat.isSymbolicLink(), 'linked source');
  requireRelease(stat.isFile() ? stat.nlink === 1 : stat.isDirectory(), 'source is not regular');
  const physicalKey =
    Number.isFinite(stat.ino) && stat.ino !== 0
      ? JSON.stringify([stat.dev, stat.ino])
      : process.platform === 'win32'
        ? path.resolve(file).toLowerCase()
        : path.resolve(file);
  const previous = state.nodePaths.get(relative);
  if (previous !== undefined) {
    if (previous === physicalKey) return;
    requireRelease(typeof previous === 'object', 'Source changed during scan');
    state.physicalNodes.delete(previous);
    if (!state.physicalNodes.has(physicalKey)) state.physicalNodes.add(physicalKey);
    state.nodePaths.set(relative, physicalKey);
    return;
  }
  if (state.physicalNodes.has(physicalKey)) {
    state.nodePaths.set(relative, physicalKey);
    return;
  }
  requireRelease(state.physicalNodes.size < repairSourceNodeLimit, 'Source enumeration exceeds bounded inventory');
  state.physicalNodes.add(physicalKey);
  state.nodePaths.set(relative, physicalKey);
}
function verifySourceDirectories(directories: readonly SourceDirectoryIdentity[]): void {
  for (const expected of directories) {
    const current = lstatSync(expected.path);
    requireRelease(!current.isSymbolicLink() && current.isDirectory(), 'linked source');
    requireRelease(
      releaseJSON(sourceIdentity(current)) === releaseJSON(expected.identity),
      'Source directory changed during scan',
    );
  }
}
export function createRepairSourcePass(): RepairSourcePass {
  // Mirrors local-release-artifacts.ts: the phantom brands this frozen empty WeakMap key.
  const pass = Object.freeze({}) as RepairSourcePass;
  repairSourcePasses.set(pass, {
    root: null,
    rootInput: null,
    rootIdentity: null,
    physicalNodes: new Set(),
    nodePaths: new Map(),
    paths: new Map(),
  });
  return pass;
}
export function registerRepairSourcePath(pass: RepairSourcePass, relative: string): void {
  const state = repairSourcePasses.get(pass);
  requireRelease(state, 'invalid repair Source enumeration pass');
  const normalized = releaseRelative(relative),
    key = path.posix.normalize(normalized);
  if (state.nodePaths.has(key)) return;
  requireRelease(
    state.physicalNodes.size < repairSourceNodeLimit,
    'native evidence dependency closure exceeds bounded inventory',
  );
  const marker = { path: key };
  state.physicalNodes.add(marker);
  state.nodePaths.set(key, marker);
}
function releaseSourceInputsForRepair(
  root: string,
  relative: string,
  observations: SourceObservation[] | undefined,
  pass: RepairSourcePass,
  suppliedStat?: Stats,
  suppliedAncestors?: readonly SourceDirectoryIdentity[],
): ReleaseSourceInput[] {
  const state = repairSourcePasses.get(pass);
  requireRelease(state, 'invalid repair Source enumeration pass');
  const inputRoot = path.resolve(root),
    key = releaseRelative(relative);
  if (!state.root) {
    const physicalRoot = realpathSync(root);
    const rootStat = lstatSync(physicalRoot);
    requireRelease(!rootStat.isSymbolicLink() && rootStat.isDirectory(), 'linked source');
    state.root = physicalRoot;
    state.rootInput = inputRoot;
    state.rootIdentity = sourceIdentity(rootStat);
  }
  requireRelease(state.rootInput === inputRoot, 'repair Source enumeration root changed');
  requireRelease(state.rootIdentity !== null, 'repair Source root identity is missing');
  const physicalRoot = state.root,
    rootIdentity = state.rootIdentity;
  const cached = state.paths.get(key);
  if (cached) {
    if (observations && cached.observations) observations.push(...cached.observations);
    return cached.entries.slice();
  }
  const file = suppliedStat ? path.join(physicalRoot, ...key.split('/')) : releasePath(root, key),
    stat = suppliedStat ?? lstatSync(file),
    identity = sourceIdentity;
  const ancestors =
    suppliedAncestors ??
    (() => {
      const result = [{ path: physicalRoot, identity: rootIdentity }];
      let current = physicalRoot;
      for (const part of key.split('/').slice(0, -1)) {
        current = path.join(current, part);
        const info = lstatSync(current);
        requireRelease(!info.isSymbolicLink() && info.isDirectory(), 'linked source');
        result.push({ path: current, identity: identity(info) });
      }
      return result;
    })();
  if (stat.isDirectory() && scratch.has(relative)) {
    state.paths.set(key, { entries: [], observations: [] });
    return [];
  }
  registerRepairSourceNode(state, key, file, stat);
  if (stat.isFile()) {
    verifySourceDirectories(ancestors);
    requireRelease(stat.nlink === 1, 'linked or non-regular path');
    const before = identity(stat),
      sha256 = releaseDigest(readFileSync(file));
    requireRelease(releaseJSON(before) === releaseJSON(identity(lstatSync(file))), 'Source changed during read');
    verifySourceDirectories(ancestors);
    const entry = { path: relative, sha256 },
      observed = { path: relative, sha256, identity: before },
      result = { entries: [entry], observations: [observed] };
    state.paths.set(key, result);
    observations?.push(observed);
    return [entry];
  }
  requireRelease(stat.isDirectory(), 'source is not regular');
  const directoryChain = [...ancestors, { path: file, identity: identity(stat) }];
  verifySourceDirectories(directoryChain);
  const directory = opendirSync(file);
  const children: { name: string; child: string; info: Stats }[] = [];
  try {
    while (true) {
      const entry = directory.readSync();
      if (!entry) break;
      const name = entry.name,
        child = key + '/' + name;
      const childFile = path.join(physicalRoot, ...child.split('/')),
        info = lstatSync(childFile);
      requireRelease(!info.isSymbolicLink(), 'linked source');
      if (info.isDirectory() && (excluded.has(name) || scratch.has(child))) continue;
      registerRepairSourceNode(state, child, childFile, info);
      children.push({ name, child, info });
    }
  } finally {
    directory.closeSync();
  }
  verifySourceDirectories(directoryChain);
  children.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  const localObservations: SourceObservation[] = [];
  const result = children.flatMap(({ child, info }) =>
    releaseSourceInputsForRepair(root, child, localObservations, pass, info, directoryChain),
  );
  const before = identity(stat);
  const observed: SourceObservation = { path: relative, kind: 'directory', identity: before };
  verifySourceDirectories(directoryChain);
  requireRelease(
    releaseJSON(before) === releaseJSON(identity(lstatSync(file))),
    'Source directory changed during scan',
  );
  localObservations.push(observed);
  state.paths.set(key, { entries: result, observations: localObservations });
  observations?.push(...localObservations);
  return result.slice();
}
export function releaseSourceInputs(
  root: string,
  relative: string,
  observations?: SourceObservation[],
  repairPass?: RepairSourcePass,
): ReleaseSourceInput[] {
  if (repairPass) return releaseSourceInputsForRepair(root, relative, observations, repairPass);
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (stat.isFile()) {
    const before = sourceIdentity(stat),
      sha256 = releaseDigest(readFileSync(file));
    requireRelease(releaseJSON(before) === releaseJSON(sourceIdentity(lstatSync(file))), 'Source changed during read');
    observations?.push({ path: relative, sha256, identity: before });
    return [{ path: relative, sha256 }];
  }
  requireRelease(stat.isDirectory(), 'source is not regular');
  if (scratch.has(relative)) return [];
  const result = readdirSync(file)
    .sort()
    .flatMap((name) => {
      const child = relative + '/' + name,
        info = lstatSync(path.join(root, child));
      requireRelease(!info.isSymbolicLink(), 'linked source');
      if (info.isDirectory() && (excluded.has(name) || scratch.has(child))) return [];
      return releaseSourceInputs(root, child, observations);
    });
  if (observations) {
    const before = sourceIdentity(stat);
    requireRelease(
      releaseJSON(before) === releaseJSON(sourceIdentity(lstatSync(file))),
      'Source directory changed during scan',
    );
    observations.push({ path: relative, kind: 'directory', identity: before });
  }
  return result;
}

export function releaseSourceBinding(
  root = releaseRootDefault,
  withObservations = false,
  repairPass?: RepairSourcePass,
): ReleaseSourceBinding {
  const observations: SourceObservation[] | undefined = withObservations ? [] : undefined;
  const entries = [
    'package.json',
    'agent-runtime.config.v1.yaml',
    'AGENT.sidecar.md',
    'packages/agent',
    'tooling/agent/release-local.ts',
    'tooling/agent/release-assurance.ts',
    'tooling/agent/release-ci-evidence.ts',
    'tooling/agent/native-ci-delivery.ts',
    'tooling/agent/controllers/forward-review-proof.ts',
    '.github/workflows/agent-native-delivery.yml',
  ].flatMap((relative) => releaseSourceInputs(root, relative, observations, repairPass));
  return { source_binding: releaseDigest(JSON.stringify(entries)), entries, ...(observations ? { observations } : {}) };
}

export function retargetStateRelative(operation: string): string {
  requireRelease(releaseIdPattern.test(operation), 'operation invalid');
  return '.agent/work/agent-local-release/' + operation + '/retarget/state.json';
}

export function assertReleaseRetargetSettled(root: string, operation: string): void {
  const file = releasePath(root, retargetStateRelative(operation), true);
  const planFile = releasePath(root, '.agent/work/agent-local-release/' + operation + '/retarget/plan.json', true);
  if (!existsSync(file)) {
    requireRelease(!existsSync(planFile), 'retarget repair missing phase');
    return;
  }
  const state: unknown = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(readReleaseBytes(root, retargetStateRelative(operation))),
  );
  requireRelease(isRecord(state), 'retarget state must be an object');
  const { digest, ...body } = state;
  requireRelease(
    state.schema === 'VidaReleaseRetargetState/v1' &&
      state.operation_id === operation &&
      Object.keys(state).sort().join() ===
        ['schema', 'operation_id', 'plan_digest', 'phase', 'release_after_sha256', 'digest'].sort().join() &&
      state.phase === 'complete' &&
      digest === releaseDigest(releaseJSON(body)),
    'retarget repair active or invalid',
  );
  const plan: unknown = JSON.parse(
    new TextDecoder('utf-8', { fatal: true }).decode(
      readReleaseBytes(root, '.agent/work/agent-local-release/' + operation + '/retarget/plan.json'),
    ),
  );
  requireRelease(isRecord(plan) && isRecord(plan.release_after), 'retarget plan afterimage must be an object');
  const { digest: planDigest, ...planBody } = plan;
  requireRelease(
    plan.schema === 'VidaReleaseRetargetPlan/v1' &&
      plan.operation_id === operation &&
      planDigest === state.plan_digest &&
      planDigest === releaseDigest(releaseJSON(planBody)) &&
      state.release_after_sha256 === releaseDigest(releaseJSON(plan.release_after)),
    'retarget plan binding differs',
  );
  const current = releaseState(releaseJournalFile(root, operation));
  // A completed repair permits normal worker status/PID progress, while retaining its candidate binding.
  requireRelease(
    current.version === plan.version &&
      current.source_binding === plan.release_after.source_binding &&
      current.tarball_sha256 === plan.release_after.tarball_sha256 &&
      releaseJSON(current.pack_metadata) === releaseJSON(plan.release_after.pack_metadata),
    'retarget candidate binding changed',
  );
}
