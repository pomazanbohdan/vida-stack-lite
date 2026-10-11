export type OwnedCleanupStatus = 'removed' | 'missing' | 'identity-mismatch' | 'indeterminate' | 'cleanup-failed';

/** Retain every cleanup failure and the original operation error without deleting uncertain paths. */
export function completeOwnedCleanup(
  cleanups: readonly (() => OwnedCleanupStatus | undefined)[],
  primaryFailure?: { readonly error: unknown },
): void {
  const failures: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      const status = cleanup();
      if (status !== undefined && status !== 'removed' && status !== 'missing')
        failures.push(new Error(`Owned staging cleanup did not complete: ${status}`));
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0)
    throw new AggregateError(
      primaryFailure === undefined ? failures : [primaryFailure.error, ...failures],
      'Operation has unresolved owned staging cleanup',
    );
}
