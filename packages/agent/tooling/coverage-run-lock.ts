import { closeSync, fstatSync, lstatSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface CoverageRunLock {
  readonly path: string;
  readonly dev: bigint;
  readonly ino: bigint;
}

/** Exclusive custody precedes run staging; an existing lock is never reclaimed. */
export function acquireCoverageRunLock(outputRoot: string): CoverageRunLock {
  mkdirSync(outputRoot, { recursive: true });
  const lockPath = path.join(outputRoot, 'coverage-run.lock');
  let descriptor: number | undefined;
  let opened = false;
  let owned: CoverageRunLock | undefined;
  try {
    descriptor = openSync(lockPath, 'wx', 0o600);
    opened = true;
    const identity = fstatSync(descriptor, { bigint: true });
    owned = { path: lockPath, dev: identity.dev, ino: identity.ino };
    writeFileSync(descriptor, JSON.stringify({ schema: 'VidaBunCoverageLock/v1', pid: process.pid }) + '\n');
    const closing = descriptor;
    descriptor = undefined;
    closeSync(closing);
    return owned;
  } catch (error) {
    if (!opened) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST')
        throw new Error('Bun coverage run is already locked; preserve existing custody.', { cause: error });
      throw error;
    }
    const failures: unknown[] = [error];
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
    }
    if (!owned) failures.push(new Error('Coverage lock identity is unavailable; preserve the lock.'));
    else {
      try {
        releaseCoverageRunLock(owned);
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
    }
    if (failures.length > 1)
      throw new AggregateError(failures, 'Coverage lock acquisition failed and cleanup was incomplete.');
    throw error;
  }
}

/** Called only after a known terminal outcome; UNKNOWN owners retain their custody. */
export function releaseCoverageRunLock(lock: CoverageRunLock): boolean {
  let current;
  try {
    current = lstatSync(lock.path, { bigint: true });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return false;
    throw error;
  }
  if (!current.isFile() || current.dev !== lock.dev || current.ino !== lock.ino)
    throw new Error('Coverage lock path no longer identifies the owned lock; preserve it.');
  unlinkSync(lock.path);
  return true;
}
