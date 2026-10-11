import { AsyncLocalStorage } from 'node:async_hooks';

export interface MutationBodyState {
  id: number;
  assertionError: unknown;
  assertionSource: 'bun-expect' | 'node-assert' | null;
}

/** One child-run context shared by registered tests and their loader-owned helpers. */
export const bodyContext = new AsyncLocalStorage<MutationBodyState>();
