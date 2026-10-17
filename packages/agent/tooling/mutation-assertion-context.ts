import { AsyncLocalStorage } from 'node:async_hooks';
import { writeFileSync } from 'node:fs';
import type { InstrumenterContext, MutantCoverage } from '@stryker-mutator/api/core';

export interface MutationBodyState {
  id: number;
  testFile: string;
  active: boolean;
  activationHits: number;
  assertionError: unknown;
  assertionSource: 'bun-expect' | 'node-assert' | null;
}

/** One child-run context shared by registered tests and their loader-owned helpers. */
export const bodyContext = new AsyncLocalStorage<MutationBodyState>();

/** Keep the instrumenter's process counter while attributing each hit to its active body. */
export function installMutationActivationTracking(): void {
  const namespace = (globalThis as typeof globalThis & { __stryker__?: unknown }).__stryker__;
  if (namespace === null || typeof namespace !== 'object' || Array.isArray(namespace))
    throw new Error('Mutation activation namespace is unavailable.');
  const state = namespace as Record<string, unknown>;
  const initial = state.hitCount;
  if (typeof initial !== 'number' || !Number.isSafeInteger(initial) || initial < 0)
    throw new Error('Mutation activation counter is invalid.');
  let total = initial;
  Object.defineProperty(state, 'hitCount', {
    enumerable: true,
    configurable: false,
    get: () => total,
    set(next: unknown) {
      if (typeof next !== 'number' || !Number.isSafeInteger(next) || (next !== total && next !== total + 1))
        throw new Error('Mutation activation counter did not advance by one hit.');
      if (next === total) return;
      total = next;
      const body = bodyContext.getStore();
      if (body?.active) body.activationHits++;
    },
  });
}

type BodyRegistration = { test_file: string; body_id: number; expected_failure: boolean; describe_ids: number[] };
type DescribeRegistration = { test_file: string; describe_id: number; parent_ids: number[]; title: string };
type HookRegistration = { test_file: string; hook_id: number; hook: string; describe_ids: number[] };
type Invocation = {
  test_file: string;
  kind: 'body' | 'hook';
  id: number;
  hook?: string;
  hook_id?: number;
  outcome: 'pending' | 'returned' | 'threw';
  elapsed_ms: number;
};
export type MutationPerTestCapture = {
  schema: 'MutationPerTestCapture/v2';
  describes: DescribeRegistration[];
  hooks: HookRegistration[];
  registrations: BodyRegistration[];
  invocations: Invocation[];
  coverage_observed: boolean;
  mutant_coverage: MutantCoverage;
};

/** Filled only by the loader from its invocation-owned adapter directory. */
const captureFile: string | undefined = undefined;

function coverageCounters(value: unknown): value is Record<string, number> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => 'value' in descriptor && Number.isSafeInteger(descriptor.value) && descriptor.value >= 0,
  );
}

class MutationCoverageCapture {
  readonly #namespace: InstrumenterContext;
  readonly #registrations = new Map<string, BodyRegistration>();
  readonly #describes = new Map<string, DescribeRegistration>();
  readonly #hooks = new Map<string, HookRegistration>();
  readonly #invocations: Invocation[] = [];
  readonly #started = new Set<string>();
  #finished = false;
  #hookId = 0;
  #unsupported: string | undefined;

  constructor(readonly output: string) {
    const globals = globalThis as typeof globalThis & { __stryker__?: InstrumenterContext };
    const namespace = (globals.__stryker__ ??= {});
    if (Object.hasOwn(namespace, 'currentTestId')) throw new Error('Mutation coverage context is already configured.');
    // The instrumenter reads this public property for every hit. ALS also keeps
    // concurrent bodies separate; settled background tasks become static hits.
    Object.defineProperty(namespace, 'currentTestId', {
      get() {
        const state = bodyContext.getStore();
        return state?.active ? `${state.testFile}#body:${state.id}` : undefined;
      },
    });
    this.#namespace = namespace;
  }

  unsupported(message: string): never {
    this.#unsupported ??= message;
    throw new Error(message);
  }

  #scope(testFile: string, ids: readonly number[]): number[] {
    for (const [index, id] of ids.entries()) {
      const scope = this.#describes.get(`${testFile}#describe:${id}`);
      if (
        !scope ||
        scope.parent_ids.length !== index ||
        scope.parent_ids.some((parent, offset) => parent !== ids[offset])
      )
        throw new Error('Mutation coverage describe ancestry is invalid.');
    }
    return [...ids];
  }

  describe(testFile: string, id: number, parentIds: readonly number[], title: string): void {
    const key = `${testFile}#describe:${id}`;
    if (this.#describes.has(key) || this.#describes.size >= 50_000)
      throw new Error('Mutation coverage describe registration is duplicate or exceeds its bound.');
    this.#describes.set(key, {
      test_file: testFile,
      describe_id: id,
      parent_ids: this.#scope(testFile, parentIds),
      title,
    });
  }

  registerHook(testFile: string, id: number, hook: string, describeIds: readonly number[]): void {
    const key = `${testFile}#hook:${id}`;
    if (
      this.#hooks.has(key) ||
      this.#hooks.size >= 50_000 ||
      !['beforeAll', 'beforeEach', 'afterEach', 'afterAll'].includes(hook)
    )
      throw new Error('Mutation coverage hook registration is invalid or exceeds its bound.');
    this.#hooks.set(key, { test_file: testFile, hook_id: id, hook, describe_ids: this.#scope(testFile, describeIds) });
  }

  register(testFile: string, id: number, expectedFailure: boolean, describeIds: readonly number[]): void {
    const key = `${testFile}#body:${id}`;
    if (this.#registrations.has(key) || this.#registrations.size >= 50_000)
      throw new Error('Mutation coverage registration is duplicate or exceeds its bound.');
    this.#registrations.set(key, {
      test_file: testFile,
      body_id: id,
      expected_failure: expectedFailure,
      describe_ids: this.#scope(testFile, describeIds),
    });
  }

  body(state: MutationBodyState, run: () => unknown): unknown {
    const key = `${state.testFile}#body:${state.id}`;
    if (!this.#registrations.has(key) || this.#started.has(key))
      throw new Error('Mutation coverage body has no unique registration.');
    this.#started.add(key);
    return this.#observe({ test_file: state.testFile, kind: 'body', id: state.id }, run, () => {
      state.active = false;
    });
  }

  hook(testFile: string, hookId: number, run: () => unknown): unknown {
    const registration = this.#hooks.get(`${testFile}#hook:${hookId}`);
    if (!registration) throw new Error('Mutation coverage hook has no registration.');
    return bodyContext.exit(() =>
      this.#observe(
        { test_file: testFile, kind: 'hook', id: ++this.#hookId, hook: registration.hook, hook_id: hookId },
        run,
      ),
    );
  }

  #observe(
    identity: Pick<Invocation, 'test_file' | 'kind' | 'id' | 'hook' | 'hook_id'>,
    run: () => unknown,
    settle: () => void = () => undefined,
  ): unknown {
    if (this.#finished || this.#invocations.length >= 50_000)
      throw new Error('Mutation coverage invocation is late or exceeds its bound.');
    const entry: Invocation = { ...identity, outcome: 'pending', elapsed_ms: 0 };
    this.#invocations.push(entry);
    const start = performance.now();
    const finish = (outcome: 'returned' | 'threw'): void => {
      settle();
      entry.outcome = outcome;
      entry.elapsed_ms = performance.now() - start;
    };
    try {
      const result = run();
      if (result !== null && (typeof result === 'object' || typeof result === 'function') && 'then' in result) {
        return Promise.resolve(result).then(
          (value: unknown) => {
            finish('returned');
            return value;
          },
          (error: unknown) => {
            finish('threw');
            throw error;
          },
        );
      }
      finish('returned');
      return result;
    } catch (error) {
      finish('threw');
      throw error;
    }
  }

  finish(): void {
    if (this.#finished) throw new Error('Mutation coverage capture was already finalized.');
    this.#finished = true;
    if (this.#unsupported) throw new Error(this.#unsupported);
    const coverage: MutantCoverage =
      this.#namespace.mutantCoverage === undefined ? { static: {}, perTest: {} } : this.#namespace.mutantCoverage;
    if (
      !coverage ||
      typeof coverage !== 'object' ||
      Array.isArray(coverage) ||
      !coverageCounters(coverage.static) ||
      !coverage.perTest ||
      typeof coverage.perTest !== 'object' ||
      Array.isArray(coverage.perTest)
    )
      throw new Error('Mutation coverage map shape is invalid.');
    for (const [id, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(coverage.perTest)))
      if (!this.#started.has(id) || !('value' in descriptor) || !coverageCounters(descriptor.value))
        throw new Error('Mutation coverage map has an unknown test or invalid counters.');
    const capture: MutationPerTestCapture = {
      schema: 'MutationPerTestCapture/v2',
      describes: [...this.#describes.values()],
      hooks: [...this.#hooks.values()],
      registrations: [...this.#registrations.values()],
      invocations: this.#invocations,
      coverage_observed: this.#namespace.mutantCoverage !== undefined,
      mutant_coverage: coverage,
    };
    const bytes = JSON.stringify(capture);
    if (Buffer.byteLength(bytes) > 4 * 1024 * 1024)
      throw new Error('Mutation per-test capture exceeds its size bound.');
    writeFileSync(this.output, bytes + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }
}

/** Diagnostic producer only; no filtered-run or Killed admission is implied. */
export const mutationCoverage = captureFile === undefined ? undefined : new MutationCoverageCapture(captureFile);
