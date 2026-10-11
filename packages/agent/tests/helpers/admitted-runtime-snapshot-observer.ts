import { expect } from 'bun:test';
import type { HostStateStore, WorkIdentity } from '../../src/host-state.js';
import { assertAdmittedRuntimeCodeCurrent } from '../../src/orchestration/admitted-session-execution.js';

/** Observe genuine persisted Host reads without replacing data or authority. */
export function assertAdmittedRuntimeWithSingleSnapshot(
  repositoryRoot: string,
  store: HostStateStore,
  identity: WorkIdentity,
): ReturnType<typeof assertAdmittedRuntimeCodeCurrent> {
  const reads = { paired: 0, host: 0, journal: 0 };
  const observed = new Proxy(store, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]): unknown => {
        if (key === 'readWorkSessionSnapshot') reads.paired += 1;
        else if (key === 'readHostStateSnapshot') reads.host += 1;
        else if (key === 'readWorkSessionJournal') reads.journal += 1;
        // Host private fields and internal checks retain their actual owner.
        return Reflect.apply(value, target, args);
      };
    },
  });
  const result = assertAdmittedRuntimeCodeCurrent(repositoryRoot, observed, identity);
  expect(reads).toEqual({ paired: 1, host: 0, journal: 0 });
  return result;
}
