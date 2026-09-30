import { createHash } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

const candidateRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(candidateRoot, '..');
const repositoryAccess = requireSafeRepositoryAccess(repositoryRoot);
const excludedDirectories = new Set(['.pack-inspect', 'coverage', 'dist', 'node_modules']);
const excludedFiles = new Set(['.DS_Store']);

function relativePath(absolute) {
  const relative = path.relative(repositoryRoot, absolute);
  if (!relative || path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep))
    throw new Error('fingerprint path escapes repository root');
  return relative.replaceAll(path.sep, '/');
}

function isExcludedDirectory(absolute) {
  const relative = path.relative(candidateRoot, absolute).replaceAll(path.sep, '/');
  return !relative.includes('/') && excludedDirectories.has(relative);
}

async function walk(directory) {
  const before = repositoryAccess.directoryIdentity(directory, 'fingerprint directory');
  const names = repositoryAccess.listFiles(directory, 'fingerprint directory listing').slice().sort();
  const files = [];
  for (const name of names) {
    const absolute = path.join(directory, name);
    const stats = await lstat(absolute);
    if (stats.isSymbolicLink()) {
      throw new Error('fingerprint refuses symbolic-link/reparse entry: ' + relativePath(absolute));
    }
    if (stats.isDirectory() && isExcludedDirectory(absolute)) continue;
    if (stats.isDirectory()) {
      files.push(...(await walk(absolute)));
      continue;
    }
    if (stats.isFile() && name.toLowerCase().endsWith('.tgz')) {
      throw new Error('fingerprint refuses generated package archive: ' + relativePath(absolute));
    }
    if (stats.isFile() && !excludedFiles.has(name)) {
      files.push(absolute);
      continue;
    }
    throw new Error('fingerprint refuses unsupported filesystem entry: ' + relativePath(absolute));
  }
  const after = repositoryAccess.directoryIdentity(directory, 'fingerprint directory stability');
  if (before !== after) throw new Error('fingerprint directory changed during enumeration: ' + relativePath(directory));
  return files;
}

function fileIdentity(stats) {
  return [stats.dev, stats.ino, stats.size, stats.mtimeMs, stats.ctimeMs, stats.mode, stats.nlink]
    .map(String)
    .join(':');
}

async function readStableFile(absolute, label) {
  const before = await lstat(absolute);
  if (!before.isFile() || before.isSymbolicLink())
    throw new Error('fingerprint refuses unstable filesystem entry: ' + relativePath(absolute));
  const bytes = repositoryAccess.readBytes(relativePath(absolute), label);
  const after = await lstat(absolute);
  if (fileIdentity(before) !== fileIdentity(after))
    throw new Error('fingerprint file changed during read: ' + relativePath(absolute));
  return { bytes, mode: before.mode & 0o777 };
}
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
const authorityPath = path.join(repositoryRoot, 'agent-runtime.config.v1.yaml');
repositoryAccess.directoryIdentity(candidateRoot, 'fingerprint candidate root');
const files = [authorityPath, ...(await walk(candidateRoot))]
  .filter((file, index, all) => all.indexOf(file) === index)
  .sort((left, right) =>
    relativePath(left) < relativePath(right) ? -1 : Number(relativePath(left) > relativePath(right)),
  );
const manifest = [];
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
const fingerprintDigest = createHash('sha256');
const zero = String.fromCharCode(0);
manifest.forEach((entry) => {
  fingerprintDigest.update(['file', entry.path, entry.mode, entry.bytes, entry.sha256, ''].join(zero));
  fingerprintDigest.update(zero);
});
fingerprintDigest.update('{"absence":[]}');
const output = {
  schema: 'CandidateFingerprint/v1',
  algorithm:
    'agent-runtime ScopeIntegrity.capture serialization over sorted path, mode, byte length, file SHA-256 and empty absence assertions',
  fingerprint: fingerprintDigest.digest('hex'),
  files: manifest,
};
process.stdout.write(JSON.stringify(output, null, 2) + '\n');
