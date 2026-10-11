import { expect } from 'bun:test';

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
