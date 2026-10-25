import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

export type FormationPayload = {
  readonly files: ReadonlyMap<string, Buffer>;
  readonly receipt: Buffer;
};

export class FormationPayloadError extends Error {
  readonly code: 'MANIFEST_INPUT_UNSAFE' | 'MANIFEST_INPUT_READ_FAILED';
  readonly details: readonly string[];

  constructor(code: FormationPayloadError['code'], message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'FormationPayloadError';
    this.code = code;
    this.details = details;
  }
}

const excludedDirectories = new Set(['.tmp', '.git', '.hg', '.svn', 'node_modules', 'coverage']);
const receiptDomain = Buffer.from('VPFormationPayload/v1\0', 'utf8');

function isWithin(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === '' || (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path));
}

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function validateRelativePath(path: string): void {
  if (path.length === 0 || path.includes('\\') || path.includes(':') || path.startsWith('/') || /^[a-z]:/iu.test(path)) {
    throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Source path is not a normalized relative path: ${path}.`);
  }
  if (path.split('/').some((segment) => segment.length === 0 || segment === '.' || segment === '..')) {
    throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Source path contains an unsafe segment: ${path}.`);
  }
}

function pathIdentity(path: string): string {
  return path.normalize('NFC').toUpperCase().toLowerCase();
}

export function encodeFormationPathLength(byteLength: number, path: string): Buffer {
  if (!Number.isInteger(byteLength) || byteLength < 0) {
    throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source path byte length is invalid: ${path}.`);
  }
  if (byteLength > 0xffff_ffff) {
    throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source path is too long: ${path}.`);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(byteLength);
  return length;
}

export async function planFormationPayload(
  projectRoot: string,
  excludedOutputPaths: readonly string[],
): Promise<FormationPayload> {
  const root = resolve(projectRoot);
  let rootStat: Awaited<ReturnType<typeof lstat>>;
  let rootReal: string;
  try {
    rootStat = await lstat(root);
    rootReal = await realpath(root);
  } catch (error) {
    throw new FormationPayloadError('MANIFEST_INPUT_READ_FAILED', 'Cannot inspect the package root for native formation.', [String(error)]);
  }
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', 'Native formation requires a regular package-root directory.');
  }

  const excludedFiles = new Set(excludedOutputPaths);
  const files = new Map<string, Buffer>();
  const identities = new Map<string, string>();

  const visit = async (directory: string, prefix: string): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      throw new FormationPayloadError('MANIFEST_INPUT_READ_FAILED', `Cannot read native formation source directory: ${prefix || '.'}.`, [String(error)]);
    }
    entries.sort((left, right) => compareUtf8(left.name, right.name));
    for (const entry of entries) {
      const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      validateRelativePath(path);
      if (excludedFiles.has(path)) continue;
      const absolute = join(directory, entry.name);
      let item: Awaited<ReturnType<typeof lstat>>;
      try {
        item = await lstat(absolute);
      } catch (error) {
        throw new FormationPayloadError('MANIFEST_INPUT_READ_FAILED', `Cannot inspect native formation source path: ${path}.`, [String(error)]);
      }
      if (item.isSymbolicLink()) {
        throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source contains a symlink or reparse point: ${path}.`);
      }
      if (item.isDirectory()) {
        if (excludedDirectories.has(entry.name)) continue;
        let resolved: string;
        try {
          resolved = await realpath(absolute);
        } catch (error) {
          throw new FormationPayloadError('MANIFEST_INPUT_READ_FAILED', `Cannot resolve native formation source directory: ${path}.`, [String(error)]);
        }
        if (!isWithin(rootReal, resolved)) {
          throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source directory escapes the package root: ${path}.`);
        }
        await visit(absolute, path);
        continue;
      }
      if (!item.isFile()) {
        throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source contains a non-regular file: ${path}.`);
      }

      const identity = pathIdentity(path);
      const previous = identities.get(identity);
      if (previous !== undefined && previous !== path) {
        throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source paths collide after Unicode normalization or case folding: ${previous} and ${path}.`);
      }
      identities.set(identity, path);

      let bytes: Buffer;
      try {
        const resolved = await realpath(absolute);
        if (!isWithin(rootReal, resolved)) {
          throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source file escapes the package root: ${path}.`);
        }
        bytes = await readFile(absolute);
        const afterRead = await lstat(absolute);
        if (afterRead.isSymbolicLink()
          || !afterRead.isFile()
          || afterRead.dev !== item.dev
          || afterRead.ino !== item.ino
          || afterRead.size !== item.size
          || afterRead.mtimeMs !== item.mtimeMs
          || bytes.length !== item.size) {
          throw new FormationPayloadError('MANIFEST_INPUT_UNSAFE', `Native formation source changed type while being read: ${path}.`);
        }
      } catch (error) {
        if (error instanceof FormationPayloadError) throw error;
        throw new FormationPayloadError('MANIFEST_INPUT_READ_FAILED', `Cannot read native formation source file: ${path}.`, [String(error)]);
      }
      files.set(path, bytes);
    }
  };

  await visit(root, '');
  const sortedEntries = [...files.entries()].sort(([left], [right]) => compareUtf8(left, right));
  const hash = createHash('sha256').update(receiptDomain);
  const receiptFiles: { path: string; bytes: number; sha256: string }[] = [];
  for (const [path, bytes] of sortedEntries) {
    const pathBytes = Buffer.from(path, 'utf8');
    const pathLength = encodeFormationPathLength(pathBytes.length, path);
    const contentLength = Buffer.alloc(8);
    contentLength.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(pathLength).update(pathBytes).update(contentLength).update(bytes);
    receiptFiles.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  const receipt = Buffer.from(`${JSON.stringify({
    schema: 'VPFormationPayload/v1',
    algorithm: 'sha256-v1-framed',
    fingerprint: `sha256:${hash.digest('hex')}`,
    files: receiptFiles,
  }, null, 2)}\n`, 'utf8');
  return { files: new Map(sortedEntries), receipt };
}
