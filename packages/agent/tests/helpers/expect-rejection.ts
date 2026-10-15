import { expect } from 'bun:test';
import assert from 'node:assert/strict';

/** Assert normal synchronous completion before a caller inspects the returned value. */
export function expectReturned<T>(operation: () => T): T {
  let result: { value: T } | undefined;
  expect(() => {
    result = { value: operation() };
  }).not.toThrow();
  return result!.value;
}

/** Await normal completion and retain the returned value, including undefined. */
export async function expectAsyncReturned<T>(operation: () => Promise<T>): Promise<T> {
  let result: { value: T } | undefined;
  await assert.doesNotReject(async () => {
    result = { value: await operation() };
  });
  if (result === undefined) throw new Error('Expected async operation to fulfill.');
  return result.value;
}

/** Await the actual operation and distinguish rejected undefined from successful fulfillment. */
export async function rejectionReason(operation: unknown): Promise<unknown> {
  let rejected = false;
  let reason: unknown;
  try {
    await operation;
  } catch (error) {
    rejected = true;
    reason = error;
  }
  expect(rejected).toBe(true);
  return reason;
}

/** Wait for rejection before callers inspect or dispose of owned fixtures. */
export async function expectRejection(operation: Promise<unknown>, message?: string | RegExp): Promise<void> {
  const failure = await rejectionReason(operation);
  expect(() => {
    throw failure;
  }).toThrow(message);
}
