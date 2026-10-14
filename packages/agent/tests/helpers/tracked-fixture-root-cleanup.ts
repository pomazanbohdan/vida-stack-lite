import { rm } from 'node:fs/promises';

type RemoveTrackedRoot = (root: string, options: { readonly recursive: true; readonly force: true }) => unknown;

/** Remove owned filesystem fixture roots once, retaining and reporting failed removals. */
export async function cleanupTrackedFixtureRoots(
  activeRoots: Set<string>,
  retainedRoots: Set<string>,
  removeRoot: RemoveTrackedRoot = rm,
): Promise<void> {
  if (activeRoots === retainedRoots) throw new Error('Tracked fixture active and retained root sets must be distinct');

  const roots = [...activeRoots];
  const eligibleRoots = roots.filter((root) => !retainedRoots.has(root));
  const outcomes = await Promise.allSettled(
    eligibleRoots.map((root) => Promise.resolve().then(() => removeRoot(root, { recursive: true, force: true }))),
  );

  const errors: unknown[] = [];
  const failedRoots: string[] = [];
  for (let index = 0; index < eligibleRoots.length; index += 1) {
    const root = eligibleRoots[index];
    const outcome = outcomes[index];
    if (root === undefined || outcome === undefined) continue;
    if (outcome.status === 'rejected') {
      retainedRoots.add(root);
      failedRoots.push(root);
      errors.push(outcome.reason);
    }
    activeRoots.delete(root);
  }

  for (const root of roots) {
    if (retainedRoots.has(root)) activeRoots.delete(root);
  }

  if (errors.length > 0)
    throw new AggregateError(errors, `Failed to remove tracked fixture roots; retained: ${failedRoots.join(', ')}`);
}
