import { createHash } from 'node:crypto';
import type { SafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';

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
