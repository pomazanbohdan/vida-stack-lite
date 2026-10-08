import { createHash } from 'node:crypto';
import type { SafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import type { HostStateSnapshot, HostStateStore, WorkIdentity } from '../host-state.js';

type SourceReader = Pick<SafeRepositoryAccess, 'fileExists' | 'readBytes'>;

/** Retain declared logical identities while reading runtime bytes from the installed package. */
export function snapshotRuntimePackageSources(
  reader: SourceReader,
  bundlePath: string,
  paths: readonly string[],
): ScopedSourceSnapshot {
  const prefix = `${bundlePath}/`;
  const packagePath = (relative: string): string => {
    requireSnapshot(relative.startsWith(prefix), 'runtime source is outside the configured package identity');
    return relative.slice(prefix.length);
  };
  return snapshotDeclaredSources(
    {
      fileExists: (relative, purpose) => reader.fileExists(packagePath(relative), purpose),
      readBytes: (relative, purpose) => reader.readBytes(packagePath(relative), purpose),
    },
    paths,
  );
}

export interface ScopedSourceEntry {
  readonly path: string;
  readonly exists: boolean;
  readonly bytes: number | null;
  readonly sha256: string | null;
}

export interface ScopedSourceSnapshot {
  readonly schema: 'ScopedSourceSnapshot/v1';
  readonly entries: readonly ScopedSourceEntry[];
  readonly digest: string;
}

export interface ScopedSourceChange {
  readonly path: string;
  readonly kind: 'changed' | 'appeared' | 'disappeared';
  readonly before: ScopedSourceEntry;
  readonly after: ScopedSourceEntry;
}

function hasExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

const sourceHash = /^[a-f0-9]{64}$/;

/** Read declared runtime bytes from a retained formation manifest. This is byte evidence only. */
export function snapshotRuntimeManifestSources(
  manifest: unknown,
  bundlePath: string,
  paths: readonly string[],
): ScopedSourceSnapshot {
  requireSnapshot(manifest !== null && typeof manifest === 'object' && !Array.isArray(manifest), 'runtime manifest is invalid');
  const value = manifest as Record<string, unknown>;
  requireSnapshot(value.schema === 'VidaStandaloneBuild/v1' && Array.isArray(value.inputs) &&
    value.inputs.length > 0 && value.inputs.length <= 2048, 'runtime manifest inputs are invalid');
  canonicalPaths([bundlePath]);
  const inputs = new Map<string, { bytes: number; sha256: string }>();
  for (const input of value.inputs) {
    requireSnapshot(hasExactKeys(input, ['path', 'bytes', 'sha256']) &&
      typeof input.path === 'string' && Number.isSafeInteger(input.bytes) && (input.bytes as number) >= 0 &&
      (input.bytes as number) <= 8 * 1024 * 1024 && typeof input.sha256 === 'string' && sourceHash.test(input.sha256),
    'runtime manifest input shape is invalid');
    canonicalPaths([input.path]);
    requireSnapshot(!inputs.has(input.path), 'runtime manifest input paths contain duplicates');
    inputs.set(input.path, { bytes: input.bytes as number, sha256: input.sha256 });
  }
  let totalBytes = 0;
  const entries = canonicalPaths(paths).map((relative) => {
    requireSnapshot(relative.startsWith(`${bundlePath}/`), 'runtime source is outside the configured package identity');
    const input = inputs.get(relative.slice(bundlePath.length + 1));
    requireSnapshot(input, 'runtime path is missing from the exact manifest');
    totalBytes += input.bytes;
    requireSnapshot(totalBytes <= 64 * 1024 * 1024, 'runtime manifest scope exceeds total byte limit');
    return Object.freeze({ path: relative, exists: true, bytes: input.bytes, sha256: input.sha256 });
  });
  const body = { schema: 'ScopedSourceSnapshot/v1' as const, entries: Object.freeze(entries) };
  return Object.freeze({ ...body, digest: canonicalJsonDigest(body) });
}

/** Preserve endpoint inventories; a temporary union represents only their per-file differences. */
export function compareRuntimeEndpointSnapshots(
  before: ScopedSourceSnapshot,
  after: ScopedSourceSnapshot,
): readonly ScopedSourceChange[] {
  for (const snapshot of [before, after]) {
    requireSnapshot(hasExactKeys(snapshot, ['schema', 'entries', 'digest']) &&
      snapshot.schema === 'ScopedSourceSnapshot/v1' && Array.isArray(snapshot.entries) &&
      typeof snapshot.digest === 'string' && sourceHash.test(snapshot.digest), 'runtime endpoint shape is invalid');
    const paths = canonicalPaths(snapshot.entries.map((entry) => entry.path));
    let totalBytes = 0;
    requireSnapshot(snapshot.entries.every((entry, index) => {
      if (!hasExactKeys(entry, ['path', 'exists', 'bytes', 'sha256']) || entry.path !== paths[index] ||
        typeof entry.exists !== 'boolean') return false;
      if (!entry.exists) return entry.bytes === null && entry.sha256 === null;
      if (!Number.isSafeInteger(entry.bytes) || (entry.bytes as number) < 0 ||
        (entry.bytes as number) > 8 * 1024 * 1024 || typeof entry.sha256 !== 'string' || !sourceHash.test(entry.sha256)) return false;
      totalBytes += entry.bytes as number;
      return totalBytes <= 64 * 1024 * 1024;
    }) && snapshot.digest === canonicalJsonDigest({ schema: snapshot.schema, entries: snapshot.entries }),
    'runtime endpoint entries or digest are invalid');
  }
  const paths = canonicalPaths([...new Set([...before.entries, ...after.entries].map((entry) => entry.path))]);
  const expand = (snapshot: ScopedSourceSnapshot): ScopedSourceSnapshot => {
    const entriesByPath = new Map(snapshot.entries.map((entry) => [entry.path, entry]));
    const entries = paths.map((relative) => entriesByPath.get(relative) ??
      Object.freeze({ path: relative, exists: false, bytes: null, sha256: null }));
    const body = { schema: snapshot.schema, entries };
    return { ...body, digest: canonicalJsonDigest(body) };
  };
  return compareScopedSourceSnapshots(expand(before), expand(after));
}

/** Re-read declared task files through the Host-validated current TaskSource binding. */
export function snapshotAdmittedTaskSources(input: {
  readonly store: Pick<HostStateStore, 'snapshotCurrentTaskSourceSources'>;
  readonly host: HostStateSnapshot;
  readonly canonicalHostRoot: string;
  readonly paths: readonly string[];
  readonly attempt: number;
}): ScopedSourceSnapshot {
  const work = input.host.work;
  requireSnapshot(
    work !== null && work !== undefined && work.lease !== null,
    'current Host lease is required for task source files',
  );
  const identity: WorkIdentity = {
    repository_id: work.binding.repository_id,
    project_ids: work.binding.project_ids,
    integrations_digest: work.binding.integrations_digest,
    work_id: work.binding.lifecycle_work_id,
  };
  try {
    return input.store.snapshotCurrentTaskSourceSources(identity, work.lease.thread_id, input.paths, input.attempt);
  } catch (error) {
    if (error instanceof Error && error.message === 'task source snapshot requires a configured canonical Host root')
      return snapshotDeclaredSources(requireSafeRepositoryAccess(input.canonicalHostRoot), input.paths);
    throw error;
  }
}

function requireSnapshot(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function canonicalPaths(paths: readonly string[]): readonly string[] {
  requireSnapshot(
    Array.isArray(paths) && paths.length > 0 && paths.length <= 512,
    'scoped source paths must be a nonempty bounded list',
  );
  const result = [...paths].sort();
  requireSnapshot(
    result.every(
      (value) =>
        typeof value === 'string' &&
        value.length > 0 &&
        value.length <= 512 &&
        !value.includes('\\') &&
        !value.startsWith('/') &&
        !value.endsWith('/') &&
        !/^[A-Za-z]:/.test(value) &&
        !/[\u0000-\u001f]/.test(value) &&
        value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..'),
    ),
    'scoped source path is not canonical repository-relative',
  );
  requireSnapshot(new Set(result).size === result.length, 'scoped source paths contain duplicates');
  return result;
}

/** Cooperative evidence read. It never prevents a human or native tool from editing a file. */
export function snapshotDeclaredSources(reader: SourceReader, paths: readonly string[]): ScopedSourceSnapshot {
  const entries: ScopedSourceEntry[] = [];
  let totalBytes = 0;
  for (const relativePath of canonicalPaths(paths)) {
    const exists = reader.fileExists(relativePath, 'scoped source existence');
    if (!exists) {
      requireSnapshot(
        !reader.fileExists(relativePath, 'scoped source stable absence'),
        'scoped source appeared during snapshot',
      );
      entries.push(Object.freeze({ path: relativePath, exists: false, bytes: null, sha256: null }));
      continue;
    }
    const first = reader.readBytes(relativePath, 'scoped source first read');
    requireSnapshot(
      Buffer.isBuffer(first) && first.length <= 8 * 1024 * 1024,
      'scoped source exceeds per-file byte limit',
    );
    totalBytes += first.length;
    requireSnapshot(totalBytes <= 64 * 1024 * 1024, 'scoped source exceeds total byte limit');
    requireSnapshot(
      reader.fileExists(relativePath, 'scoped source second existence'),
      'scoped source disappeared during snapshot',
    );
    const second = reader.readBytes(relativePath, 'scoped source second read');
    requireSnapshot(first.equals(second), 'scoped source changed during snapshot');
    entries.push(
      Object.freeze({
        path: relativePath,
        exists: true,
        bytes: first.length,
        sha256: createHash('sha256').update(first).digest('hex'),
      }),
    );
  }
  const body = { schema: 'ScopedSourceSnapshot/v1' as const, entries: Object.freeze(entries) };
  return Object.freeze({ ...body, digest: canonicalJsonDigest(body) });
}

export function compareScopedSourceSnapshots(
  before: ScopedSourceSnapshot,
  after: ScopedSourceSnapshot,
): readonly ScopedSourceChange[] {
  requireSnapshot(
    before.schema === 'ScopedSourceSnapshot/v1' &&
      after.schema === 'ScopedSourceSnapshot/v1' &&
      before.digest === canonicalJsonDigest({ schema: before.schema, entries: before.entries }) &&
      after.digest === canonicalJsonDigest({ schema: after.schema, entries: after.entries }) &&
      before.entries.length === after.entries.length &&
      before.entries.every((entry, index) => entry.path === after.entries[index]?.path),
    'scoped source snapshots have different scope or invalid digest',
  );
  return Object.freeze(
    before.entries.flatMap((entry, index) => {
      const next = after.entries[index]!;
      if (entry.exists === next.exists && entry.sha256 === next.sha256 && entry.bytes === next.bytes) return [];
      return [
        Object.freeze({
          path: entry.path,
          kind: !entry.exists ? ('appeared' as const) : !next.exists ? ('disappeared' as const) : ('changed' as const),
          before: entry,
          after: next,
        }),
      ];
    }),
  );
}
