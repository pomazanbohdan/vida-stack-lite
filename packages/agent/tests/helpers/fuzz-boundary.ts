import { expect } from 'bun:test';
import fc from 'fast-check';

export const parameters = Object.freeze({
  seed: Number(process.env.FAST_CHECK_SEED ?? '20260830'),
  numRuns: Number(process.env.FAST_CHECK_NUM_RUNS ?? '1000'),
  endOnFailure: true,
  ...(process.env.FAST_CHECK_PATH ? { path: process.env.FAST_CHECK_PATH } : {}),
});
if (!Number.isSafeInteger(parameters.seed) || !Number.isSafeInteger(parameters.numRuns) || parameters.numRuns < 1)
  throw new Error('Property seed and positive run count must be safe integers.');

export const unknownValue: fc.Arbitrary<unknown> = fc.anything({
  withBigInt: true,
  withDate: true,
  withMap: true,
  withNullPrototype: true,
  withObjectString: true,
  withSet: true,
  withSparseArray: true,
  withTypedArray: true,
});

export type Outcome<T> = { returned: true; value: T } | { returned: false; value: unknown };

export function outcome<T>(action: () => T): Outcome<T> {
  try {
    return { returned: true, value: action() };
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    return { returned: false, value: error };
  }
}
