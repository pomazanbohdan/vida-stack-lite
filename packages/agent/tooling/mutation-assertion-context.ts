import { AsyncLocalStorage } from 'node:async_hooks';
import { writeFileSync } from 'node:fs';
import type { InstrumenterContext, MutantCoverage } from '@stryker-mutator/api/core';

export interface MutationBodyState {
  id: number;
  testFile: string;
  active: boolean;
  assertionError: unknown;
  assertionSource: 'bun-expect' | 'node-assert' | null;
}

/** One child-run context shared by registered tests and their loader-owned helpers. */
export const bodyContext = new AsyncLocalStorage<MutationBodyState>();

type BodyRegistration = { test_file: string; body_id: number; expected_failure: boolean };
type Invocation = {
  test_file: string;
  kind: 'body' | 'hook';
  id: number;
  hook?: string;
  outcome: 'pending' | 'returned' | 'threw';
  elapsed_ms: number;
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
  readonly #invocations: Invocation[] = [];
  readonly #started = new Set<string>();
  #finished = false;
  #hookId = 0;

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

  register(testFile: string, id: number, expectedFailure: boolean): void {
    const key = `${testFile}#body:${id}`;
    if (this.#registrations.has(key) || this.#registrations.size >= 50_000)
      throw new Error('Mutation coverage registration is duplicate or exceeds its bound.');
    this.#registrations.set(key, { test_file: testFile, body_id: id, expected_failure: expectedFailure });
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

  hook(testFile: string, hook: string, run: () => unknown): unknown {
    return bodyContext.exit(() => this.#observe({ test_file: testFile, kind: 'hook', id: ++this.#hookId, hook }, run));
  }

  #observe(
    identity: Pick<Invocation, 'test_file' | 'kind' | 'id' | 'hook'>,
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
    const bytes = JSON.stringify({
      schema: 'MutationPerTestCapture/v1',
      registrations: [...this.#registrations.values()],
      invocations: this.#invocations,
      coverage_observed: this.#namespace.mutantCoverage !== undefined,
      mutant_coverage: coverage,
    });
    if (Buffer.byteLength(bytes) > 4 * 1024 * 1024)
      throw new Error('Mutation per-test capture exceeds its size bound.');
    writeFileSync(this.output, bytes + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }
}

/** Diagnostic producer only; no filtered-run or Killed admission is implied. */
export const mutationCoverage = captureFile === undefined ? undefined : new MutationCoverageCapture(captureFile);
