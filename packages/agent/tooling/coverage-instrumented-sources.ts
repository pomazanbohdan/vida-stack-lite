import { closeSync, fstatSync } from 'node:fs';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
import path from 'node:path';

export type InstrumentedSourceDigest = {
  path: string;
  source_sha256: string;
  artifact_path: string;
  artifact_sha256: string;
};

export const maxInstrumentedArtifactBytes = 32 * 1024 * 1024;
export const maxInstrumentedArtifactsBytes = 256 * 1024 * 1024;

export function instrumentedArtifactPath(sourcePath: string): string {
  return `__coverage_instrumented__/${sourcePath}`;
}

function canonicalSourcePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0') || value.includes('\\')) return false;
  if (value.startsWith('/') || /^[A-Za-z]:/u.test(value)) return false;
  const parts = value.split('/');
  return parts.every((part) => part !== '' && part !== '.' && part !== '..') && path.posix.normalize(value) === value;
}

/** Validate a complete ordered one-to-one binding between sources and derived artifacts. */
export function parseInstrumentedSourceDigests(
  value: unknown,
  sources: readonly { path: string; sha256: string }[],
  capturedInputPaths: ReadonlySet<string> = new Set(),
): InstrumentedSourceDigest[] {
  if (!Array.isArray(value) || value.length !== sources.length)
    throw new Error('Coverage instrumented-source manifest cardinality differs from sources.');
  const seenSources = new Set<string>();
  const seenArtifacts = new Set<string>();
  return value.map((raw, index) => {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      throw new Error('Coverage instrumented-source entry is invalid.');
    const entry = raw as Record<string, unknown>;
    if (Object.keys(entry).sort().join(',') !== 'artifact_path,artifact_sha256,path,source_sha256')
      throw new Error('Coverage instrumented-source entry fields are invalid.');
    const source = sources[index];
    if (
      !source ||
      !canonicalSourcePath(source.path) ||
      entry.path !== source.path ||
      entry.source_sha256 !== source.sha256 ||
      !/^[0-9a-f]{64}$/u.test(source.sha256)
    )
      throw new Error('Coverage instrumented-source order or source identity differs.');
    const expectedPath = instrumentedArtifactPath(source.path);
    if (
      entry.artifact_path !== expectedPath ||
      !canonicalSourcePath(entry.artifact_path) ||
      typeof entry.artifact_sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/u.test(entry.artifact_sha256)
    )
      throw new Error('Coverage instrumented-source artifact identity is invalid.');
    if (
      seenSources.has(entry.path) ||
      seenArtifacts.has(entry.artifact_path) ||
      capturedInputPaths.has(entry.artifact_path)
    )
      throw new Error('Coverage instrumented-source path is duplicated or collides with a captured input.');
    seenSources.add(entry.path);
    seenArtifacts.add(entry.artifact_path);
    return entry as InstrumentedSourceDigest;
  });
}

/** Read a derived code artifact through the existing bounded, no-symlink root reader. */
export function readInstrumentedArtifact(root: string, entry: InstrumentedSourceDigest): Buffer {
  const absolutePath = path.resolve(root, ...entry.artifact_path.split('/'));
  const opened = openRootFileSync({
    absolutePath,
    rootPath: root,
    boundaryLabel: 'coverage instrumented artifact',
    maxBytes: maxInstrumentedArtifactBytes,
    rejectHardlinks: true,
    rejectSymlinks: true,
    allowedType: 'file',
  });
  if (!opened.ok)
    throw new Error(`Coverage instrumented artifact rejected (${opened.reason}): ${entry.artifact_path}`, {
      cause: opened.error,
    });
  const failures: unknown[] = [];
  let result: Buffer | undefined;
  try {
    const before = fstatSync(opened.fd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size > BigInt(maxInstrumentedArtifactBytes))
      throw new Error('Coverage instrumented artifact exceeds its file bound: ' + entry.artifact_path);
    result = readFileDescriptorBoundedSync(opened.fd, maxInstrumentedArtifactBytes);
    const after = fstatSync(opened.fd, { bigint: true });
    if (
      !after.isFile() ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs ||
      result.length !== Number(before.size)
    )
      throw new Error('Coverage instrumented artifact changed during read: ' + entry.artifact_path);
  } catch (error) {
    failures.push(error);
  }
  try {
    closeSync(opened.fd);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(failures, 'Coverage instrumented artifact read and descriptor cleanup failed');
  return result!;
}
