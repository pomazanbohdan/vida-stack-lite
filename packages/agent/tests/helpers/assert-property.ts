import { check, type IProperty, type Parameters } from 'fast-check';

/** Run once and retain the original failure identity for assertion-cause evidence. */
export function assertProperty<T>(property: IProperty<T>, parameters?: Parameters<T>): void {
  const result = check(property, parameters);
  if (!result.failed && !result.interrupted) return;
  const replay = JSON.stringify({
    seed: result.seed,
    path: result.counterexamplePath,
    runs: result.numRuns,
    skips: result.numSkips,
    shrinks: result.numShrinks,
    interrupted: result.interrupted,
  });
  process.stderr.write(`VIDA property replay: ${replay}\n`);
  if (result.failed && result.errorInstance !== null) throw result.errorInstance;
  throw new Error(`Property check did not complete: ${replay}`);
}
