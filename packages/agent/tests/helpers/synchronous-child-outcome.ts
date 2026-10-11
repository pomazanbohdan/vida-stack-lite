import type { SpawnSyncReturns } from 'node:child_process';

/** A normal nonzero exit is a terminal denial; abnormal or missing results retain custody. */
export function isUnknownSynchronousChild(
  result: Pick<SpawnSyncReturns<unknown>, 'error' | 'signal' | 'status'>,
): boolean {
  return Boolean(result.error) || Boolean(result.signal) || !Number.isInteger(result.status);
}
