import { appendFileSync, statSync } from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import assertStrict from 'node:assert/strict';
import {
  afterAll as bunAfterAll,
  afterEach as bunAfterEach,
  beforeAll as bunBeforeAll,
  beforeEach as bunBeforeEach,
  describe as bunDescribe,
  expect as bunExpect,
  it as bunIt,
  test as bunTest,
} from 'bun:test';

type AssertionSource = 'bun-expect' | 'node-assert';
interface BodyState {
  id: number;
  assertionError: unknown;
  assertionSource: AssertionSource | null;
}
type Callable = (this: unknown, ...args: unknown[]) => unknown;
type TestCallback = Callable;
const bodyContext = new AsyncLocalStorage<BodyState>();
const receiptFile = process.env.AGENT_MUTATION_BODY_RECEIPTS;
let bodyId = 0;
const file = new URL(import.meta.url).searchParams.get('file');
let receiptBytes = 0;

function append(event: Record<string, unknown>): void {
  if (!receiptFile || !file) throw new Error('Mutation body receipt channel is not configured.');
  const line = `${JSON.stringify({ schema: 'MutationBodyEvent/v1', test_file: file, ...event })}\n`;
  receiptBytes += Buffer.byteLength(line);
  if (receiptBytes + statSync(receiptFile).size > 4 * 1024 * 1024)
    throw new Error('Mutation body receipts exceeded their size bound.');
  appendFileSync(receiptFile, line, { encoding: 'utf8' });
}

function noteAssertion(error: unknown, source: AssertionSource): void {
  const current = bodyContext.getStore();
  if (current) {
    current.assertionError = error;
    current.assertionSource = source;
  }
}

function matcherTree(value: unknown): unknown {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return value;
  const target = value;
  return new Proxy(target, {
    get(current, key) {
      const member: unknown = Reflect.get(current, key, current);
      if (typeof member !== 'function') return matcherTree(member);

      const callMatcher = (...args: unknown[]) => {
        const state = bodyContext.getStore();
        const clearConsumedEvidence = (): void => {
          if (state) {
            state.assertionError = null;
            state.assertionSource = null;
          }
        };
        const result = callAssertion(member, target, args, 'bun-expect');
        // Successful matchers consume assertion failures; ambiguous overlap remains unproven.
        if (result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result) {
          void Promise.resolve(result).then(clearConsumedEvidence, () => undefined);
          return result;
        }
        clearConsumedEvidence();
        return matcherTree(result);
      };
      return callMatcher;
    },
  });
}

function callAssertion(
  target: unknown,
  receiver: unknown,
  args: unknown[],
  source: AssertionSource = 'node-assert',
): unknown {
  try {
    const result: unknown = Reflect.apply(target as Callable, receiver, args);
    if (result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result) {
      return Promise.resolve(result).catch((error: unknown) => {
        noteAssertion(error, source);
        throw error;
      });
    }
    return result;
  } catch (error) {
    noteAssertion(error, source);
    throw error;
  }
}

function assertionTree(value: unknown): unknown {
  if ((typeof value !== 'object' && typeof value !== 'function') || value === null) return value;
  const target = value;
  return new Proxy(target, {
    apply(fn, thisArg, args) {
      return callAssertion(fn, thisArg, args);
    },
    get(current, key) {
      const member: unknown = Reflect.get(current, key, current);
      if (typeof member === 'function') {
        const callMethod = (...args: unknown[]) => callAssertion(member, target, args);
        return callMethod;
      }
      return assertionTree(member);
    },
  });
}
const assert = assertionTree(assertStrict);

const expect = new Proxy(bunExpect, {
  apply(target, thisArg, args) {
    return matcherTree(Reflect.apply(target as Callable, thisArg, args));
  },
  get(target, key) {
    if (key === 'extend')
      return () => {
        throw new Error('Mutation body adapter does not support expect.extend.');
      };
    const member: unknown = Reflect.get(target, key, target);
    if (typeof member !== 'function') return member;

    const callStatic = (...args: unknown[]) => Reflect.apply(member as Callable, target, args);
    return callStatic;
  },
});

function withBody(callback: TestCallback, id: number, expectedFailure: boolean): TestCallback {
  return function mutationBody(this: unknown, ...args: unknown[]) {
    const state: BodyState = { id, assertionError: null, assertionSource: null };
    const run = () => {
      let result;
      try {
        result = callback.apply(this, args);
      } catch (error) {
        if (!expectedFailure)
          append({
            kind: 'body',
            body_id: id,
            assertion_cause: state.assertionError === error,
            assertion_source: state.assertionSource,
          });
        throw error;
      }
      if (result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result) {
        return Promise.resolve(result).catch((error: unknown) => {
          if (!expectedFailure)
            append({
              kind: 'body',
              body_id: id,
              assertion_cause: state.assertionError === error,
              assertion_source: state.assertionSource,
            });
          throw error;
        });
      }
      return result;
    };
    return bodyContext.run(state, run);
  };
}

function withHook(callback: TestCallback, hook: string): TestCallback {
  return function mutationHook(this: unknown, ...args: unknown[]) {
    const recordFailure = (error: unknown): never => {
      append({ kind: 'hook', hook, error_observed: true });
      throw error;
    };
    try {
      const result = callback.apply(this, args);
      return result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result
        ? Promise.resolve(result).catch(recordFailure)
        : result;
    } catch (error) {
      return recordFailure(error);
    }
  };
}

function registerArgs(
  args: unknown[],
  bodies: boolean,
  expectedFailure: boolean,
  eachArgumentCount: number | null,
): unknown[] {
  const next = [...args];
  if (!bodies) return next;
  const callbackIndex = next.findLastIndex((value) => typeof value === 'function');
  if (callbackIndex < 0) return next;
  const callback = next[callbackIndex] as Callable;
  if (eachArgumentCount === null ? callback.length > 0 : callback.length > eachArgumentCount)
    throw new Error('Mutation body adapter does not support Bun done-callback test forms.');
  const id = ++bodyId;
  if (typeof next[0] !== 'string') throw new Error('Mutation body adapter requires a test title string.');
  next[0] = `[mutation-body:${id}] ${next[0]}`;
  next[callbackIndex] = withBody(next[callbackIndex] as TestCallback, id, expectedFailure);
  return next;
}

function tableArgumentCount(args: unknown[]): number | null {
  const table = args[0];
  if (!Array.isArray(table)) return null;
  const rows: unknown[] = table;
  const first = rows[0];
  if (first === undefined) return 0;
  return Array.isArray(first) ? first.length : 1;
}

function registrationProxy(
  target: unknown,
  bodies: boolean,
  expectedFailure = false,
  eachArgumentCount: number | null = null,
): unknown {
  if (typeof target !== 'function') return target;
  return new Proxy(target, {
    apply(fn, thisArg, args) {
      return Reflect.apply(fn as Callable, thisArg, registerArgs(args, bodies, expectedFailure, eachArgumentCount));
    },
    get(fn, key) {
      const member: unknown = Reflect.get(fn, key, fn);
      if (key === 'each' && typeof member === 'function') {
        const each = (...args: unknown[]) =>
          registrationProxy(
            Reflect.apply(member as Callable, fn, args),
            bodies,
            expectedFailure,
            tableArgumentCount(args),
          );
        return each;
      }
      if (typeof member === 'function') {
        const callModifier = (...args: unknown[]) => {
          const failingMethod = key === 'failing' || (key === 'failingIf' && args[0] === true);
          const result: unknown = Reflect.apply(
            member as Callable,
            fn,
            bodies ? registerArgs(args, true, expectedFailure || failingMethod, eachArgumentCount) : args,
          );
          return typeof result === 'function'
            ? registrationProxy(result, bodies, expectedFailure || failingMethod, eachArgumentCount)
            : result;
        };
        return callModifier;
      }
      return member;
    },
  });
}

function lifecycle(register: unknown, name: string): unknown {
  if (typeof register !== 'function') throw new Error(`Bun lifecycle hook ${name} is unavailable.`);

  const registerLifecycle = (...args: unknown[]) => {
    const next = [...args];
    const callbackIndex = next.findLastIndex((value) => typeof value === 'function');
    if (callbackIndex >= 0) next[callbackIndex] = withHook(next[callbackIndex] as TestCallback, name);
    return Reflect.apply(register as Callable, undefined, next);
  };
  return registerLifecycle;
}

export const test = registrationProxy(bunTest, true);
export const it = registrationProxy(bunIt, true);
export const describe = registrationProxy(bunDescribe, false);
export { expect };
export default assert;
export const beforeAll = lifecycle(bunBeforeAll, 'beforeAll');
export const beforeEach = lifecycle(bunBeforeEach, 'beforeEach');
export const afterAll = lifecycle(bunAfterAll, 'afterAll');
export const afterEach = lifecycle(bunAfterEach, 'afterEach');
export * from 'bun:test';
