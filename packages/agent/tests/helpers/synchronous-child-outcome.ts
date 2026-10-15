import type { SpawnSyncReturns } from 'node:child_process';

/** A normal nonzero exit is a terminal denial; abnormal or missing results retain custody. */
export function isUnknownSynchronousChild(
  result: Pick<SpawnSyncReturns<unknown>, 'error' | 'signal' | 'status'>,
): boolean {
  return Boolean(result.error) || Boolean(result.signal) || !Number.isInteger(result.status);
}

export function requireSynchronousChildSuccess(
  result: Partial<Pick<SpawnSyncReturns<string | Buffer | null>, 'error' | 'signal' | 'status' | 'stdout' | 'stderr'>>,
  completionMarker: string,
): void {
  const output = `${String(result.stdout ?? '')}\n${String(result.stderr ?? '')}`;
  if (result.error !== undefined || result.signal !== null || result.status !== 0 || !output.includes(completionMarker))
    throw new Error(
      `Child test did not complete successfully: ${completionMarker}; status=${String(result.status)}; ` +
        `signal=${String(result.signal)}; error=${String(result.error)}\n${output.slice(-8_000)}`,
    );
}
