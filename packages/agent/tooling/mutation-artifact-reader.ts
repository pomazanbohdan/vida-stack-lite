import type { Stats } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import path from 'node:path';

export const mutationEvidenceByteLimit = 4 * 1024 * 1024;
export const mutationArtifactByteLimit = 32 * 1024 * 1024;

function isBoundedRegularFile(info: Stats, byteLimit: number, allowEmpty: boolean): boolean {
  return (
    info.isFile() &&
    !info.isSymbolicLink() &&
    info.nlink === 1 &&
    (allowEmpty || info.size >= 1) &&
    info.size <= byteLimit
  );
}

function matchesOpenedEvidence(opened: Stats, original: Stats): boolean {
  return (
    opened.isFile() &&
    opened.nlink === 1 &&
    opened.dev === original.dev &&
    opened.ino === original.ino &&
    opened.size === original.size
  );
}

export async function readBoundedMutationArtifact(
  reportDirectory: string,
  file: string,
  byteLimit = mutationEvidenceByteLimit,
  allowEmpty = false,
): Promise<Buffer> {
  if (!Number.isSafeInteger(byteLimit) || byteLimit < 0 || byteLimit > mutationArtifactByteLimit)
    throw new Error('Evidence byte limit is invalid.');
  if (path.basename(file) !== file) throw new Error('Evidence file name escapes its report directory.');
  const fullPath = path.join(reportDirectory, file);
  const info = await lstat(fullPath);
  if (!isBoundedRegularFile(info, byteLimit, allowEmpty))
    throw new Error('Evidence file is missing, linked or outside its size bound.');
  const handle = await open(fullPath, 'r');
  const failures: unknown[] = [];
  let result: Buffer | undefined;
  try {
    const opened = await handle.stat();
    if (!matchesOpenedEvidence(opened, info)) throw new Error('Evidence file changed while opening.');
    const buffer = Buffer.alloc(info.size + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const after = await handle.stat();
    if (!matchesOpenedEvidence(after, info) || bytesRead !== info.size || bytesRead > byteLimit)
      throw new Error('Evidence file changed or exceeded its size bound.');
    result = buffer.subarray(0, bytesRead);
  } catch (error) {
    failures.push(error);
  }
  try {
    await handle.close();
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, `Evidence read and close failed: ${fullPath}`);
  return result!;
}
