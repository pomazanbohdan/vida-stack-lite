import { expect } from 'bun:test';

/** Wait for rejection before callers inspect or dispose of owned fixtures. */
export async function expectRejection(operation: Promise<unknown>, message: string | RegExp): Promise<void> {
  const failure = await operation.then(
    () => {
      throw new Error('Expected the operation to reject.');
    },
    (error: unknown) => error,
  );
  expect(() => {
    throw failure;
  }).toThrow(message);
}
