import { createHash } from 'node:crypto';
import type { BigIntStats } from 'node:fs';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import { activeRuntimeConfigurationSource } from '../src/config/runtime-config.js';
import { PROJECT_CONFIGURATION_PATHS } from '../src/config/project-paths.js';

type ManifestEntry = { path: string; bytes: number; mode: number; sha256: string };

const candidateRoot = path.resolve(import.meta.dirname, '..');
const excludedDirectories = new Set(['.pack-inspect', 'coverage', 'dist', 'node_modules']);
const excludedFiles = new Set(['.DS_Store']);

function fileIdentity(stats: BigIntStats): string {
  return [stats.dev, stats.ino, stats.size, stats.mtimeMs, stats.ctimeMs, stats.mode, stats.nlink]
    .map(String)
    .join(':');
}

function sha256(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function fingerprintDigestForManifest(manifest: readonly ManifestEntry[]): string {
  const digest = createHash('sha256');
  const zero = String.fromCharCode(0);
  manifest.forEach((entry) => {
    digest.update(['file', entry.path, entry.mode, entry.bytes, entry.sha256, ''].join(zero));
    digest.update(zero);
  });
  digest.update('{"absence":[]}');
  return digest.digest('hex');
}

export async function captureFingerprint(packageRoot: string = candidateRoot): Promise<{
  schema: string;
  algorithm: string;
  fingerprint: string;
  files: ManifestEntry[];
}> {
  const candidateRoot = path.resolve(packageRoot);
  const repositoryRoot = path.resolve(candidateRoot, '..', '..');
  const repositoryAccess = requireSafeRepositoryAccess(repositoryRoot);
  function relativePath(absolute: string): string {
    const relative = path.relative(repositoryRoot, absolute);
    if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep))
      throw new Error('fingerprint path escapes repository root');
    return relative.replaceAll(path.sep, '/');
  }

  function isExcludedDirectory(absolute: string): boolean {
    const relative = path.relative(candidateRoot, absolute).replaceAll(path.sep, '/');
    return !relative.includes('/') && excludedDirectories.has(relative);
  }

  async function fingerprintEntryFiles(directory: string, name: string): Promise<string[]> {
    const absolute = path.join(directory, name);
    const stats = await lstat(absolute);
    if (stats.isSymbolicLink())
      throw new Error('fingerprint refuses symbolic-link/reparse entry: ' + relativePath(absolute));
    if (stats.isDirectory()) return isExcludedDirectory(absolute) ? [] : walk(absolute);
    if (stats.isFile() && name.toLowerCase().endsWith('.tgz'))
      throw new Error('fingerprint refuses generated package archive: ' + relativePath(absolute));
    if (stats.isFile()) return excludedFiles.has(name) ? [] : [absolute];
    throw new Error('fingerprint refuses unsupported filesystem entry: ' + relativePath(absolute));
  }

  async function walk(directory: string): Promise<string[]> {
    const before = repositoryAccess.directoryIdentity(directory, 'fingerprint directory');
    const names = repositoryAccess.listFiles(directory, 'fingerprint directory listing').slice().sort();
    const files: string[] = [];
    for (const name of names) files.push(...(await fingerprintEntryFiles(directory, name)));
    const after = repositoryAccess.directoryIdentity(directory, 'fingerprint directory stability');
    if (before !== after)
      throw new Error('fingerprint directory changed during enumeration: ' + relativePath(directory));
    return files;
  }

  async function readStableFile(absolute: string, label: string): Promise<{ bytes: Buffer; mode: number }> {
    const before = await lstat(absolute, { bigint: true });
    if (!before.isFile() || before.isSymbolicLink())
      throw new Error('fingerprint refuses unstable filesystem entry: ' + relativePath(absolute));
    const bytes = repositoryAccess.readBytes(relativePath(absolute), label);
    const after = await lstat(absolute, { bigint: true });
    if (fileIdentity(before) !== fileIdentity(after))
      throw new Error('fingerprint file changed during read: ' + relativePath(absolute));
    return { bytes, mode: Number(before.mode & 0o777n) };
  }

  const configurationSource = activeRuntimeConfigurationSource(repositoryAccess);
  const authorityPaths =
    configurationSource === '.vida/project.yaml'
      ? Object.values(PROJECT_CONFIGURATION_PATHS).map((relative) => path.join(repositoryRoot, relative))
      : [path.join(repositoryRoot, configurationSource)];
  repositoryAccess.directoryIdentity(candidateRoot, 'fingerprint candidate root');
  const files = [...new Set([...authorityPaths, ...(await walk(candidateRoot))])].sort((left, right) =>
    relativePath(left) < relativePath(right) ? -1 : Number(relativePath(left) > relativePath(right)),
  );
  const manifest: ManifestEntry[] = [];
  for (const file of files) {
    const sample = await readStableFile(file, 'fingerprint file');
    manifest.push({
      path: relativePath(file),
      bytes: sample.bytes.byteLength,
      mode: sample.mode,
      sha256: sha256(sample.bytes),
    });
  }
  repositoryAccess.directoryIdentity(candidateRoot, 'fingerprint candidate stability');
  return {
    schema: 'CandidateFingerprint/v1',
    algorithm:
      'agent-runtime ScopeIntegrity.capture serialization over sorted path, mode, byte length, file SHA-256 and empty absence assertions',
    fingerprint: fingerprintDigestForManifest(manifest),
    files: manifest,
  };
}

if (import.meta.main) {
  const output = await captureFingerprint();
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}
