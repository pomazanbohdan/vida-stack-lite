import { appendFileSync, statSync } from 'node:fs';
import { bodyContext, mutationCoverage, type MutationBodyState } from './mutation-assertion-context.ts';
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
type BodyState = MutationBodyState;
type Callable = (this: unknown, ...args: unknown[]) => unknown;
type TestCallback = Callable;
type EachInput =
  | { kind: 'array'; tableRows: unknown[][] }
  | { kind: 'object'; key: string; tableRows: Array<{ copy: object; row: unknown }> };
type BoundEachInput =
  | { kind: 'array'; ids: Set<number> }
  | { kind: 'object'; key: string; rows: WeakMap<object, { id: number; row: unknown }>; ids: Set<number> };
type EachFactory = { method: Callable; receiver: unknown; args: unknown[] };
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

function clearAssertion(): void {
  const current = bodyContext.getStore();
  if (current) {
    current.assertionError = null;
    current.assertionSource = null;
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
  consumesThrownError = false,
): unknown {
  try {
    const result: unknown = Reflect.apply(target as Callable, receiver, args);
    if (result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result) {
      return Promise.resolve(result)
        .catch((error: unknown) => {
          noteAssertion(error, source);
          throw error;
        })
        .then((value: unknown) => {
          if (consumesThrownError) clearAssertion();
          return value;
        });
    }
    if (consumesThrownError) clearAssertion();
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
        const consumesThrownError = key === 'throws' || key === 'rejects';
        const callMethod = (...args: unknown[]) =>
          callAssertion(member, target, args, 'node-assert', consumesThrownError);
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

function withBody(
  callback: TestCallback,
  id: number,
  expectedFailure: boolean,
  eachInput?: BoundEachInput,
): TestCallback {
  return function mutationBody(this: unknown, ...args: unknown[]) {
    let bodyId = id;
    let bodyArgs = args;
    if (eachInput?.kind === 'array') {
      const candidate = args[0];
      if (typeof candidate !== 'number' || !Number.isSafeInteger(candidate) || !eachInput.ids.has(candidate))
        throw new Error('Mutation body adapter could not bind a parametrized array row.');
      bodyId = candidate;
      bodyArgs = args.slice(1);
    } else if (eachInput?.kind === 'object') {
      const candidate = args[0];
      const binding = candidate !== null && typeof candidate === 'object' ? eachInput.rows.get(candidate) : undefined;
      if (!binding) throw new Error('Mutation body adapter could not bind a parametrized object row.');
      bodyId = binding.id;
      bodyArgs = [binding.row, ...args.slice(1)];
    }
    if (!file) throw new Error('Mutation body file is not configured.');
    const state: BodyState = { id: bodyId, testFile: file, active: true, assertionError: null, assertionSource: null };
    const run = () => {
      let result;
      try {
        result = callback.apply(this, bodyArgs);
      } catch (error) {
        if (!expectedFailure)
          append({
            kind: 'body',
            body_id: bodyId,
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
              body_id: bodyId,
              assertion_cause: state.assertionError === error,
              assertion_source: state.assertionSource,
            });
          throw error;
        });
      }
      return result;
    };
    const invoke = () => bodyContext.run(state, run);
    return mutationCoverage ? mutationCoverage.body(state, invoke) : invoke();
  };
}

function withHook(callback: TestCallback, hook: string): TestCallback {
  return function mutationHook(this: unknown, ...args: unknown[]) {
    const recordFailure = (error: unknown): never => {
      append({ kind: 'hook', hook, error_observed: true });
      throw error;
    };
    const invoke = () => {
      try {
        const result = callback.apply(this, args);
        return result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result
          ? Promise.resolve(result).catch(recordFailure)
          : result;
      } catch (error) {
        return recordFailure(error);
      }
    };
    if (!file) throw new Error('Mutation hook file is not configured.');
    return mutationCoverage ? mutationCoverage.hook(file, hook, invoke) : invoke();
  };
}

function registerArgs(
  args: unknown[],
  bodies: boolean,
  expectedFailure: boolean,
  eachArgumentCount: number | null,
  eachInput?: BoundEachInput,
): unknown[] {
  const next = [...args];
  if (!bodies) return next;
  const callbackIndex = next.findLastIndex((value) => typeof value === 'function');
  if (callbackIndex < 0) {
    // Boolean modifier setup returns a registrar; a title is the registration itself.
    if (mutationCoverage && typeof next[0] === 'string')
      throw new Error('Mutation per-test capture requires a callback for every test registration.');
    return next;
  }
  const callback = next[callbackIndex] as Callable;
  if (eachArgumentCount === null ? callback.length > 0 : callback.length > eachArgumentCount)
    throw new Error('Mutation body adapter does not support Bun done-callback test forms.');
  if (typeof next[0] !== 'string') throw new Error('Mutation body adapter requires a test title string.');
  const id = eachInput ? 0 : ++bodyId;
  if (eachInput?.kind === 'array') next[0] = `[mutation-body:%i] ${next[0]}`;
  else if (eachInput?.kind === 'object') next[0] = `[mutation-body:$${eachInput.key}] ${next[0]}`;
  else next[0] = `[mutation-body:${id}] ${next[0]}`;
  if (mutationCoverage) {
    if (!file) throw new Error('Mutation registration file is not configured.');
    const ids = eachInput ? [...eachInput.ids] : [id];
    for (const bodyId of ids) mutationCoverage.register(file, bodyId, expectedFailure);
    next[0] = (next[0] as string).replace(
      /^(\[mutation-body:[^\]]+\] )/u,
      `$1[mutation-file:${Buffer.from(file).toString('base64url')}] `,
    );
  }
  next[callbackIndex] = withBody(next[callbackIndex] as TestCallback, id, expectedFailure, eachInput);
  return next;
}

function bindEachInput(input: EachInput): BoundEachInput {
  if (input.kind === 'array') {
    const ids = new Set<number>();
    for (const row of input.tableRows) {
      const id = ++bodyId;
      row[0] = id;
      ids.add(id);
    }
    return { kind: 'array', ids };
  }
  const rows = new WeakMap<object, { id: number; row: unknown }>();
  const ids = new Set<number>();
  for (const { copy, row } of input.tableRows) {
    const id = ++bodyId;
    ids.add(id);
    Object.defineProperty(copy, input.key, { value: id, enumerable: true, configurable: true });
    rows.set(copy, { id, row });
  }
  return { kind: 'object', key: input.key, rows, ids };
}

function tableArgumentCount(args: unknown[]): number | null {
  const table = args[0];
  if (!Array.isArray(table)) return null;
  const rows: unknown[] = table;
  const first = rows[0];
  if (first === undefined) return 0;
  return Array.isArray(first) ? first.length : 1;
}

function instrumentEachTable(args: unknown[]): { args: unknown[]; input: EachInput } {
  const table = args[0];
  if (!Array.isArray(table)) throw new Error('Mutation body adapter requires a Bun test.each table.');
  const rows: unknown[] = table;
  const next = [...args];
  if (!rows.length) return { args: next, input: { kind: 'array', tableRows: [] } };
  const first = rows[0];
  if (Array.isArray(first)) {
    if (rows.some((row) => !Array.isArray(row)))
      throw new Error('Mutation body adapter does not support mixed Bun test.each row shapes.');
    const tableRows = rows.map((row) => [0, ...(row as unknown[])]);
    next[0] = tableRows;
    return { args: next, input: { kind: 'array', tableRows } };
  }
  if (first !== null && typeof first === 'object') {
    if (rows.some((row) => row === null || typeof row !== 'object' || Array.isArray(row)))
      throw new Error('Mutation body adapter does not support mixed Bun test.each row shapes.');
    let key = '__vidaMutationBodyId';
    while (rows.some((row) => key in (row as object))) key += '_';
    const tableRows = rows.map((row) => {
      const original = row as object;
      const copy = Object.create(Object.getPrototypeOf(original) as object | null) as object;
      Object.defineProperties(copy, Object.getOwnPropertyDescriptors(original));
      Object.defineProperty(copy, key, { value: 0, enumerable: true, configurable: true });
      return { copy, row: original };
    });
    next[0] = tableRows.map(({ copy }) => copy);
    return { args: next, input: { kind: 'object', key, tableRows } };
  }
  if (rows.some((row) => row !== null && typeof row === 'object'))
    throw new Error('Mutation body adapter does not support mixed Bun test.each row shapes.');
  const tableRows = rows.map((row) => [0, row]);
  next[0] = tableRows;
  return { args: next, input: { kind: 'array', tableRows } };
}

function registrationProxy(
  target: unknown,
  bodies: boolean,
  expectedFailure = false,
  eachArgumentCount: number | null = null,
  eachFactory?: EachFactory,
): unknown {
  if (typeof target !== 'function') return target;
  return new Proxy(target, {
    apply(fn, thisArg, args) {
      const registration = eachFactory ? makeEachRegistration(eachFactory) : { target: fn, input: undefined };
      return Reflect.apply(
        registration.target as Callable,
        thisArg,
        registerArgs(args, bodies, expectedFailure, eachArgumentCount, registration.input),
      );
    },
    get(fn, key) {
      const member: unknown = Reflect.get(fn, key, fn);
      if (key === 'each' && typeof member === 'function') {
        const each = (...args: unknown[]) => {
          if (!bodies) return registrationProxy(Reflect.apply(member as Callable, fn, args), bodies);
          return registrationProxy(
            Reflect.apply(member as Callable, fn, args),
            bodies,
            expectedFailure,
            tableArgumentCount(args),
            { method: member as Callable, receiver: fn, args: [...args] },
          );
        };
        return each;
      }
      if (typeof member === 'function') {
        const callModifier = (...args: unknown[]) => {
          const failingMethod = key === 'failing' || (key === 'failingIf' && args[0] === true);
          const registration = eachFactory ? makeEachRegistration(eachFactory) : { target: fn, input: undefined };
          const registrationMember: unknown = eachFactory
            ? Reflect.get(registration.target, key, registration.target)
            : member;
          if (typeof registrationMember !== 'function') return registrationMember;
          const result: unknown = Reflect.apply(
            registrationMember as Callable,
            registration.target,
            bodies
              ? registerArgs(args, true, expectedFailure || failingMethod, eachArgumentCount, registration.input)
              : args,
          );
          return typeof result === 'function'
            ? registrationProxy(result, bodies, expectedFailure || failingMethod, eachArgumentCount, eachFactory)
            : result;
        };
        return callModifier;
      }
      return member;
    },
  });
}

function isCallable(value: unknown): value is Callable {
  return typeof value === 'function';
}

function makeEachRegistration(factory: EachFactory): { target: Callable; input: BoundEachInput } {
  const instrumented = instrumentEachTable(factory.args);
  const input = bindEachInput(instrumented.input);
  const value: unknown = Reflect.apply(factory.method, factory.receiver, instrumented.args);
  if (!isCallable(value)) throw new Error('Mutation body adapter requires Bun test.each to return a registrar.');
  return { target: value, input };
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
