import { expect, test } from 'bun:test';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.js';

test('preserves the primary failure and attempts every cleanup when custody is uncertain', () => {
  const primary = new Error('publication verification failed');
  const secondary = new Error('descriptor close failed');
  const calls: string[] = [];
  let result: unknown;
  try {
    completeOwnedCleanup(
      [
        () => {
          calls.push('publication');
          return 'identity-mismatch';
        },
        () => {
          calls.push('workspace');
          throw secondary;
        },
      ],
      { error: primary },
    );
  } catch (error) {
    result = error;
  }
  expect(result).toBeInstanceOf(AggregateError);
  if (!(result instanceof AggregateError)) throw new Error('Expected cleanup aggregate');
  expect(result.errors).toHaveLength(3);
  expect(result.errors[0]).toBe(primary);
  expect(result.errors[2]).toBe(secondary);
  expect(calls).toEqual(['publication', 'workspace']);
});

test('rejects indeterminate and failed cleanup even after an otherwise successful operation', () => {
  expect(() => completeOwnedCleanup([() => 'indeterminate'])).toThrow(/unresolved owned staging cleanup/u);
  expect(() => completeOwnedCleanup([() => 'cleanup-failed'])).toThrow(/unresolved owned staging cleanup/u);
  expect(() => completeOwnedCleanup([() => 'removed', () => 'missing', () => undefined])).not.toThrow();
});
