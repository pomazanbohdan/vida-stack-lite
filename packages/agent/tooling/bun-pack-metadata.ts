import { createHash } from 'node:crypto';
import { closeSync, fstatSync } from 'node:fs';
import path from 'node:path';
import { openRootFileSync, readFileDescriptorBoundedSync } from '@openclaw/fs-safe/advanced';
import { Parser, type ReadEntry } from 'tar';

type BunPackFile = { path: string; size: number };
export type BunPackEntry = {
  name: string;
  version: string;
  filename: string;
  integrity: string;
  files: BunPackFile[];
};

const maxArchiveBytes = 256 * 1024 * 1024;
const maxFiles = 20_000;
const maxFileBytes = 64 * 1024 * 1024;
const maxExpandedBytes = 512 * 1024 * 1024;
const maxManifestBytes = 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function canonicalPackagePath(value: string): string {
  if (
    value.includes('\\') ||
    value.startsWith('/') ||
    value.includes('\0') ||
    path.posix.normalize(value) !== value ||
    !value.startsWith('package/')
  )
    throw new Error(`Bun package archive path is not canonical: ${value}`);
  const relative = value.slice('package/'.length);
  if (!relative || relative.split('/').some((part) => part === '' || part === '.' || part === '..'))
    throw new Error(`Bun package archive path is not canonical: ${value}`);
  return relative;
}

/** Reads typed package metadata from the exact Bun-produced archive bytes. */
export async function readBunPackMetadata(input: {
  archive: string;
  name: string;
  version: string;
  filename: string;
}): Promise<BunPackEntry[]> {
  const { archive, name, version, filename } = input;
  if (!path.isAbsolute(archive)) throw new Error('Bun package archive path must be absolute');
  if (!filename || path.basename(filename) !== filename || filename !== path.basename(archive))
    throw new Error('Bun package archive filename differs');
  const opened = openRootFileSync({
    absolutePath: archive,
    rootPath: path.dirname(archive),
    boundaryLabel: 'Bun package archive',
    maxBytes: maxArchiveBytes,
    rejectHardlinks: true,
    rejectSymlinks: true,
    allowedType: 'file',
  });
  if (!opened.ok) throw new Error(`Bun package archive rejected (${opened.reason})`, { cause: opened.error });
  let bytes: Buffer;
  try {
    const before = fstatSync(opened.fd, { bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size <= 0n || before.size > BigInt(maxArchiveBytes))
      throw new Error('Bun package archive exceeds its size limit');
    bytes = readFileDescriptorBoundedSync(opened.fd, maxArchiveBytes);
    const after = fstatSync(opened.fd, { bigint: true });
    if (
      !after.isFile() ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.nlink !== before.nlink ||
      after.size !== before.size ||
      after.mtimeNs !== before.mtimeNs ||
      after.ctimeNs !== before.ctimeNs ||
      bytes.length !== Number(before.size)
    )
      throw new Error('Bun package archive changed during bounded read');
  } finally {
    closeSync(opened.fd);
  }

  const paths = new Set<string>();
  let expandedBytes = 0;
  let manifestBytes: Buffer | undefined;
  const files: BunPackFile[] = [];
  const parser = new Parser({ strict: true, maxMetaEntrySize: maxManifestBytes });
  parser.on('entry', (entry: ReadEntry) => {
    let relative: string;
    try {
      if (entry.type !== 'File') throw new Error('Bun package archive must contain regular files only');
      relative = canonicalPackagePath(entry.path);
      if (paths.has(relative)) throw new Error(`Bun package archive contains a duplicate path: ${relative}`);
      if (paths.size >= maxFiles) throw new Error('Bun package archive contains too many files');
      if (!Number.isSafeInteger(entry.size) || entry.size < 0 || entry.size > maxFileBytes)
        throw new Error(`Bun package archive file exceeds its size limit: ${relative}`);
      paths.add(relative);
    } catch (error: unknown) {
      parser.abort(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    const collect = relative === 'package.json';
    const chunks: Buffer[] = [];
    let actualSize = 0;
    let fileFailure = false;
    entry.on('data', (chunk: Buffer | string) => {
      const value = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      actualSize += value.length;
      if (actualSize > entry.size || (collect && actualSize > maxManifestBytes)) {
        fileFailure = true;
        parser.abort(new Error(`Bun package archive file exceeds its size limit: ${relative}`));
        return;
      }
      if (collect) chunks.push(value);
    });
    entry.once('end', () => {
      if (fileFailure) return;
      if (actualSize !== entry.size) {
        parser.abort(new Error(`Bun package archive file size differs: ${relative}`));
        return;
      }
      expandedBytes += actualSize;
      if (expandedBytes > maxExpandedBytes) {
        parser.abort(new Error('Bun package archive exceeds its expanded size limit'));
        return;
      }
      files.push({ path: relative, size: actualSize });
      if (collect) manifestBytes = Buffer.concat(chunks);
    });
    entry.resume();
  });
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    parser.once('end', () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    parser.once('error', (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    parser.end(bytes);
  });
  if (manifestBytes === undefined) throw new Error('Bun package archive has no package.json');
  let manifest: unknown;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
  } catch {
    throw new Error('Bun package archive package.json is invalid');
  }
  if (!isRecord(manifest) || manifest.name !== name || manifest.version !== version)
    throw new Error('Bun package archive identity differs');
  return [
    {
      name,
      version,
      filename,
      integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
      files: files.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
    },
  ];
}
