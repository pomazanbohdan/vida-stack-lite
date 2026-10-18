import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

export const QUALITY_BASELINE_REF = 'b549951';
export const QUALITY_BASELINE_COMMIT = 'b5499511e64b2165a8c97ae3d2b455b25b1ac5b6';
export const QUALITY_BUDGET_FILE = '.agent/work/core-runtime-reactivation/crap-budgets.reviewed-partial.v1.json';

export type QualityGitBlob = Readonly<{
  commit: string;
  path: string;
  mode: '100644' | '100755' | '120000';
  oid: string;
  sha256: string;
  bytes: string;
}>;

export type QualityGitSnapshot = Readonly<{
  schema: 'VidaQualityGitSnapshot/v1';
  baselineRef: typeof QUALITY_BASELINE_REF;
  baselineCommit: string;
  baselinePaths: readonly string[];
  budgetRef: string;
  budgetCommit: string;
  blobs: readonly QualityGitBlob[];
}>;

const MAX_SNAPSHOT_BYTES = 64 * 1024 * 1024;
const MAX_BLOBS = 100_000;
const hash = (bytes: Uint8Array, algorithm = 'sha256') => createHash(algorithm).update(bytes).digest('hex');
const isMode = (value: unknown): value is QualityGitBlob['mode'] =>
  value === '100644' || value === '100755' || value === '120000';
const isSafePath = (value: string) =>
  Boolean(value) &&
  !value.startsWith('/') &&
  !value.includes('\\') &&
  !value.includes('\0') &&
  !value.split('/').some((part) => !part || part === '.' || part === '..');

function nativeGit(repositoryRoot: string, args: string[], input?: Buffer): Buffer {
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    input,
    timeout: 30_000,
    maxBuffer: MAX_SNAPSHOT_BYTES + 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.signal || result.status !== 0)
    throw new Error(`Unable to capture immutable quality Git input: git ${args.join(' ')}`);
  return result.stdout;
}

function commitFor(repositoryRoot: string, ref: string): string {
  return nativeGit(repositoryRoot, ['rev-parse', '--verify', `${ref}^{commit}`])
    .toString('ascii')
    .trim();
}

function parseTreeRecord(record: string, commit: string, scope: string): QualityGitBlob {
  const tab = record.indexOf('\t');
  if (tab < 0) throw new Error('Malformed native Git tree response.');
  const [mode, type, oid] = record.slice(0, tab).split(' ');
  const fullPath = record.slice(tab + 1);
  if (type !== 'blob' || !isMode(mode) || !oid || !/^[0-9a-f]{40}$/u.test(oid))
    throw new Error('Quality Git snapshot encountered an unsupported tree entry.');
  const file = fullPath;
  if (!isSafePath(file) || (scope === 'packages/agent' ? !file.startsWith('packages/agent/') : file !== scope))
    throw new Error('Quality Git snapshot encountered an unsafe or foreign path.');
  return { commit, path: file, mode, oid, sha256: '', bytes: '' };
}

function parseTree(bytes: Buffer, commit: string, scope: string): { blobs: QualityGitBlob[]; paths: string[] } {
  const blobs = bytes
    .toString('utf8')
    .split('\0')
    .filter(Boolean)
    .map((row) => parseTreeRecord(row, commit, scope));
  return { blobs, paths: blobs.map(({ path: file }) => file).sort() };
}

function parseBatchObject(raw: Buffer, cursor: number, oid: string): { bytes: Buffer; cursor: number } {
  const lineEnd = raw.indexOf(0x0a, cursor);
  if (lineEnd < 0) throw new Error('Truncated native Git batch header.');
  const [actualOid, type, sizeText] = raw.toString('ascii', cursor, lineEnd).split(' ');
  const size = Number(sizeText);
  const start = lineEnd + 1;
  const end = start + size;
  if (
    actualOid !== oid ||
    type !== 'blob' ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    end >= raw.length ||
    raw[end] !== 0x0a
  )
    throw new Error('Native Git batch object is malformed or mismatched.');
  const bytes = raw.subarray(start, end);
  if (hash(Buffer.concat([Buffer.from(`blob ${size}\0`), bytes]), 'sha1') !== oid)
    throw new Error('Native Git blob object hash mismatch.');
  return { bytes: Buffer.from(bytes), cursor: end + 1 };
}

function parseBatch(raw: Buffer, objectIds: string[]): Map<string, Buffer> {
  const result = new Map<string, Buffer>();
  let cursor = 0;
  for (const oid of objectIds) {
    const object = parseBatchObject(raw, cursor, oid);
    result.set(oid, object.bytes);
    cursor = object.cursor;
  }
  if (cursor !== raw.length) throw new Error('Unexpected trailing native Git batch content.');
  return result;
}

function readBatch(repositoryRoot: string, blobs: QualityGitBlob[]): QualityGitBlob[] {
  if (blobs.length > MAX_BLOBS) throw new Error('Quality Git snapshot exceeds the bounded blob count.');
  const objectIds = [...new Set(blobs.map(({ oid }) => oid))];
  const raw = nativeGit(
    repositoryRoot,
    ['cat-file', '--batch'],
    Buffer.from(objectIds.map((oid) => `${oid}\n`).join('')),
  );
  if (raw.length > MAX_SNAPSHOT_BYTES) throw new Error('Quality Git snapshot exceeds the bounded byte size.');
  const contents = parseBatch(raw, objectIds);
  const captured = blobs.map((blob) => {
    const bytes = contents.get(blob.oid);
    if (!bytes) throw new Error('Native Git batch omitted a requested blob.');
    return Object.freeze({ ...blob, sha256: hash(bytes), bytes: bytes.toString('base64') });
  });
  if (captured.reduce((sum, blob) => sum + Buffer.byteLength(blob.bytes, 'base64'), 0) > MAX_SNAPSHOT_BYTES)
    throw new Error('Quality Git snapshot exceeds the bounded aggregate blob size.');
  return captured;
}

function assertPinnedRefs(repositoryRoot: string, budgetRef: string): string {
  if (!/^[0-9a-f]{40}$/u.test(budgetRef)) throw new Error('Quality budget reference must be a full immutable commit.');
  const baselineCommit = commitFor(repositoryRoot, QUALITY_BASELINE_REF);
  if (baselineCommit !== QUALITY_BASELINE_COMMIT || commitFor(repositoryRoot, budgetRef) !== budgetRef)
    throw new Error('Quality Git snapshot refs do not resolve to the pinned immutable commits.');
  return baselineCommit;
}

/** Capture the published baseline package and one pinned budget file with bounded native Git calls. */
function captureQualityGitSnapshot(repositoryRoot: string, budgetRef: string): QualityGitSnapshot {
  const baselineCommit = assertPinnedRefs(repositoryRoot, budgetRef);
  const baseline = parseTree(
    nativeGit(repositoryRoot, ['ls-tree', '-r', '-z', baselineCommit, '--', 'packages/agent']),
    baselineCommit,
    'packages/agent',
  );
  const budget = parseTree(
    nativeGit(repositoryRoot, ['ls-tree', '-z', budgetRef, '--', QUALITY_BUDGET_FILE]),
    budgetRef,
    QUALITY_BUDGET_FILE,
  );
  if (budget.blobs.length !== 1) throw new Error('Pinned quality budget file is absent from its reviewed commit.');
  const blobs = readBatch(repositoryRoot, [...baseline.blobs, ...budget.blobs]);
  return Object.freeze({
    schema: 'VidaQualityGitSnapshot/v1',
    baselineRef: QUALITY_BASELINE_REF,
    baselineCommit,
    baselinePaths: Object.freeze(baseline.paths),
    budgetRef,
    budgetCommit: budgetRef,
    blobs: Object.freeze(blobs),
  });
}

/** Retain native formation bytes separately from the captured runtime inputs. */
export function retainQualityGitSnapshot(
  repository: string,
  directory: string,
  budgetRef: string,
): Record<string, string> {
  const bytes = Buffer.from(JSON.stringify(captureQualityGitSnapshot(repository, budgetRef)) + '\n');
  const file = path.join(directory, 'quality-git-snapshot.json');
  writeFileSync(file, bytes, { flag: 'wx', mode: 0o444 });
  return { VIDA_QUALITY_GIT_SNAPSHOT: file, VIDA_QUALITY_GIT_SNAPSHOT_SHA256: hash(bytes) };
}

export type QualityGitSnapshotReader = Readonly<{
  resolveCommit(ref: string): string;
  readBlob(commit: string, file: string): string | null;
  listPaths(commit: string, prefix: string): string[];
}>;

type BlobIndex = Map<string, Map<string, Buffer>>;
type SnapshotInput = {
  schema: 'VidaQualityGitSnapshot/v1';
  baselineRef: typeof QUALITY_BASELINE_REF;
  baselineCommit: string;
  baselinePaths: string[];
  budgetRef: string;
  budgetCommit: string;
  blobs: unknown[];
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function hasSnapshotKeys(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    hasExactKeys(value, [
      'schema',
      'baselineRef',
      'baselineCommit',
      'baselinePaths',
      'budgetRef',
      'budgetCommit',
      'blobs',
    ])
  );
}

function hasPinnedBaseline(value: Record<string, unknown>): boolean {
  return (
    value.schema === 'VidaQualityGitSnapshot/v1' &&
    value.baselineRef === QUALITY_BASELINE_REF &&
    value.baselineCommit === QUALITY_BASELINE_COMMIT
  );
}

function hasPinnedBudget(value: Record<string, unknown>, expectedBudgetRef?: string): boolean {
  return (
    typeof value.budgetRef === 'string' &&
    /^[0-9a-f]{40}$/u.test(value.budgetRef) &&
    value.budgetCommit === value.budgetRef &&
    (expectedBudgetRef === undefined || value.budgetRef === expectedBudgetRef)
  );
}

function hasSnapshotArrays(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.baselinePaths) &&
    value.baselinePaths.every((item) => typeof item === 'string') &&
    Array.isArray(value.blobs)
  );
}

function isSnapshotHeader(value: unknown, expectedBudgetRef?: string): value is SnapshotInput {
  if (!hasSnapshotKeys(value)) return false;
  return hasPinnedBaseline(value) && hasPinnedBudget(value, expectedBudgetRef) && hasSnapshotArrays(value);
}

function hasBlobKeys(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && hasExactKeys(value, ['commit', 'path', 'mode', 'oid', 'sha256', 'bytes']);
}

function hasBlobMetadata(value: Record<string, unknown>): boolean {
  return (
    typeof value.commit === 'string' &&
    typeof value.path === 'string' &&
    isSafePath(value.path) &&
    isMode(value.mode) &&
    typeof value.oid === 'string' &&
    /^[0-9a-f]{40}$/u.test(value.oid) &&
    typeof value.sha256 === 'string' &&
    /^[0-9a-f]{64}$/u.test(value.sha256) &&
    typeof value.bytes === 'string'
  );
}

function belongsToPinnedCommit(value: Record<string, unknown>, snapshot: SnapshotInput): boolean {
  if (value.commit === QUALITY_BASELINE_COMMIT)
    return typeof value.path === 'string' && value.path.startsWith('packages/agent/');
  return value.commit === snapshot.budgetCommit && value.path === QUALITY_BUDGET_FILE;
}

function isValidBlob(value: unknown, snapshot: SnapshotInput): value is QualityGitBlob {
  return hasBlobKeys(value) && hasBlobMetadata(value) && belongsToPinnedCommit(value, snapshot);
}

function checkedContent(blob: QualityGitBlob): Buffer {
  const bytes = Buffer.from(blob.bytes, 'base64');
  if (
    bytes.toString('base64') !== blob.bytes ||
    hash(bytes) !== blob.sha256 ||
    hash(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]), 'sha1') !== blob.oid
  )
    throw new Error('Quality Git snapshot blob content digest is invalid.');
  return bytes;
}

function indexBlobs(snapshot: SnapshotInput): BlobIndex {
  if (snapshot.blobs.length > MAX_BLOBS) throw new Error('Quality Git snapshot exceeds the bounded blob count.');
  const index: BlobIndex = new Map();
  const seen = new Set<string>();
  let total = 0;
  for (const item of snapshot.blobs) {
    if (!isValidBlob(item, snapshot)) throw new Error('Quality Git snapshot blob metadata is invalid or foreign.');
    const key = `${item.commit}\0${item.path}`;
    if (seen.has(key)) throw new Error('Quality Git snapshot contains duplicate paths.');
    seen.add(key);
    const bytes = checkedContent(item);
    total += bytes.length;
    if (total > MAX_SNAPSHOT_BYTES) throw new Error('Quality Git snapshot exceeds the bounded aggregate size.');
    let commitIndex = index.get(item.commit);
    if (!commitIndex) index.set(item.commit, (commitIndex = new Map<string, Buffer>()));
    commitIndex.set(item.path, bytes);
  }
  return index;
}

function hasExactBaselineInventory(snapshot: SnapshotInput, index: BlobIndex): boolean {
  const declared = snapshot.baselinePaths;
  if (
    !declared.every((path) => isSafePath(path) && path.startsWith('packages/agent/')) ||
    declared.some((path, position) => position > 0 && declared[position - 1]! >= path)
  )
    return false;
  const actual = [...(index.get(QUALITY_BASELINE_COMMIT)?.keys() ?? [])].sort();
  return actual.length === declared.length && actual.every((path, position) => path === declared[position]);
}

function createReader(snapshot: SnapshotInput, index: BlobIndex): QualityGitSnapshotReader {
  const paths = Object.freeze([...snapshot.baselinePaths]);
  return Object.freeze({
    resolveCommit(ref: string) {
      if (ref === QUALITY_BASELINE_REF || ref === `${QUALITY_BASELINE_REF}^{commit}`) return QUALITY_BASELINE_COMMIT;
      if (ref === snapshot.budgetRef || ref === `${snapshot.budgetRef}^{commit}`) return snapshot.budgetCommit;
      throw new Error(`Unsupported frozen quality Git ref: ${ref}`);
    },
    readBlob(commit: string, file: string) {
      const bytes = index.get(commit)?.get(file);
      if (commit !== QUALITY_BASELINE_COMMIT && !(commit === snapshot.budgetCommit && file === QUALITY_BUDGET_FILE))
        throw new Error('Unsupported frozen quality Git blob query.');
      return bytes ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : null;
    },
    listPaths(commit: string, prefix: string) {
      if (
        commit !== QUALITY_BASELINE_COMMIT ||
        !['packages/agent', 'packages/agent/tests', 'packages/agent/src', 'packages/agent/bin'].includes(prefix)
      )
        throw new Error(`Unsupported frozen quality Git tree query: ${prefix}`);
      return paths.filter((file) =>
        prefix === 'packages/agent' ? file.startsWith('packages/agent/') : file.startsWith(`${prefix}/`),
      );
    },
  });
}

/** Validate a root-attested capsule and expose only CRAP gate read capabilities. */
export function readQualityGitSnapshot(value: unknown, expectedBudgetRef?: string): QualityGitSnapshotReader {
  if (!isSnapshotHeader(value, expectedBudgetRef)) throw new Error('Quality Git snapshot refs or schema are invalid.');
  const index = indexBlobs(value);
  if (!hasExactBaselineInventory(value, index) || !value.baselinePaths.includes('packages/agent/package.json'))
    throw new Error('Quality Git snapshot baseline path inventory is incomplete or inconsistent.');
  if (!index.get(value.budgetCommit)?.has(QUALITY_BUDGET_FILE))
    throw new Error('Quality Git snapshot is missing its pinned budget bytes.');
  return createReader(value, index);
}
