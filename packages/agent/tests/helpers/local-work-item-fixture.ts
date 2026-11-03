import { mkdtemp } from 'node:fs/promises';
import { test } from 'bun:test';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { cleanupTrackedFixtureRoots } from './tracked-fixture-root-cleanup.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from '../../src/config/safe-repository-access.js';
import type { ProductDefinition } from '../../src/config/product-model.js';
import type { LocalWorkItemBinding } from '../../src/work-items/store.js';

interface BoundaryEvent {
  readonly method: string;
  readonly target: string;
  readonly resolved_target: string;
  readonly label: string;
  readonly started_at: string;
  readonly elapsed_ms: number;
  readonly result: 'ok' | 'error';
  readonly error?: { readonly name: string; readonly code?: string; readonly message: string; readonly stack?: string };
}

interface FixtureCase {
  readonly roots: Set<string>;
  readonly retained: Set<string>;
  readonly deadline: number;
  readonly monotonicNow: () => number;
  readonly instrument: boolean;
  sequence: number;
}

let activeCase: FixtureCase | undefined;

export async function withLocalWorkItemFixtureCase<TResult>(
  body: () => TResult | Promise<TResult>,
  options: {
    readonly timeout_ms?: number;
    readonly instrument?: boolean;
    readonly monotonic_now?: () => number;
  } = {},
): Promise<TResult> {
  const timeout = options.timeout_ms ?? 5_000;
  if (!Number.isSafeInteger(timeout) || timeout <= 0) throw new Error('local work item case timeout must be positive');
  if (activeCase) throw new Error('local work item fixture cases cannot overlap');
  const monotonicNow = options.monotonic_now ?? (() => performance.now());
  const custody: FixtureCase = {
    roots: new Set(),
    retained: new Set(),
    deadline: monotonicNow() + timeout,
    monotonicNow,
    instrument: options.instrument ?? false,
    sequence: 0,
  };
  activeCase = custody;
  let bodyFailed = false;
  let bodyError: unknown;
  let value: TResult | undefined;
  try {
    value = await body();
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
  }
  const timeAfterBody = custody.monotonicNow();
  const lateAfterBody =
    !Number.isFinite(custody.deadline) || !Number.isFinite(timeAfterBody) || timeAfterBody >= custody.deadline;
  let cleanupError: unknown;
  let cleanupFailed = false;
  try {
    await cleanupTrackedFixtureRoots(custody.roots, custody.retained);
  } catch (error) {
    cleanupFailed = true;
    cleanupError = error;
  } finally {
    activeCase = undefined;
  }
  const timeAfterCleanup = custody.monotonicNow();
  const lateAfterCleanup =
    !Number.isFinite(custody.deadline) || !Number.isFinite(timeAfterCleanup) || timeAfterCleanup >= custody.deadline;
  if (bodyFailed && cleanupFailed)
    throw new AggregateError([bodyError, cleanupError], 'LocalWorkItem test and fixture cleanup both failed');
  if (bodyFailed) throw bodyError;
  if (cleanupFailed) throw cleanupError;
  if (lateAfterBody || lateAfterCleanup)
    throw new Error('LocalWorkItem fixture case exceeded its monotonic deadline; root retained');
  return value as TResult;
}

export function localWorkItemTest(
  name: string,
  body: () => void | Promise<void>,
  options: { readonly timeout_ms?: number; readonly instrument?: boolean } = {},
): void {
  const timeout = options.timeout_ms ?? 5_000;
  test(name, () => withLocalWorkItemFixtureCase(body, options), timeout);
}

function errorShape(error: unknown): NonNullable<BoundaryEvent['error']> {
  if (!(error instanceof Error)) return { name: typeof error, message: String(error) };
  const coded = error as NodeJS.ErrnoException;
  return {
    name: error.name,
    ...(coded.code ? { code: coded.code } : {}),
    message: error.message,
    ...(error.stack ? { stack: error.stack.slice(0, 1_200) } : {}),
  };
}

function beginBoundary(root: string, method: string, args: readonly unknown[]) {
  const target = typeof args[0] === 'string' ? args[0] : '(no-target)';
  const label = typeof args[1] === 'string' ? args[1] : '(no-label)';
  const resolvedTarget = target === '(no-target)' ? target : path.resolve(root, ...target.split('/'));
  const sequence = (activeCase?.sequence ?? 0) + 1;
  if (activeCase) activeCase.sequence = sequence;
  const started = performance.now();
  const startedAt = new Date().toISOString();
  const startedEvent = {
    sequence,
    phase: 'start',
    method,
    target,
    resolved_target: resolvedTarget,
    label,
    started_at: startedAt,
  };
  process.stderr.write(`[local-work-item-boundary] ${JSON.stringify(startedEvent)}\n`);
  const finish = (result: 'ok' | 'error', error?: unknown): void => {
    const event: BoundaryEvent = {
      method,
      target,
      resolved_target: resolvedTarget,
      label,
      started_at: startedAt,
      elapsed_ms: performance.now() - started,
      result,
      ...(result === 'error' ? { error: errorShape(error) } : {}),
    };
    process.stderr.write(`[local-work-item-boundary] ${JSON.stringify({ sequence, phase: 'end', ...event })}\n`);
  };
  return { finish };
}

function recordSync<T>(root: string, method: string, args: readonly unknown[], invoke: () => T): T {
  const { finish } = beginBoundary(root, method, args);
  try {
    const result = invoke();
    finish('ok');
    return result;
  } catch (error) {
    finish('error', error);
    throw error;
  }
}

async function recordAsync<T>(
  root: string,
  method: string,
  args: readonly unknown[],
  invoke: () => Promise<T>,
): Promise<T> {
  const { finish } = beginBoundary(root, method, args);
  try {
    const result = await invoke();
    finish('ok');
    return result;
  } catch (error) {
    finish('error', error);
    throw error;
  }
}

function instrumentAccess(root: string, access: SafeRepositoryAccess): SafeRepositoryAccess {
  const wrapped: SafeRepositoryAccess = {
    ...access,
    ensureDirectoryAsync: (target, label) =>
      recordAsync(root, 'ensureDirectoryAsync', [target, label], () => access.ensureDirectoryAsync(target, label)),
    withExclusiveLockAsync: async <T>(target: string, label: string, operation: () => Promise<T>) =>
      recordAsync(root, 'withExclusiveLockAsync', [target, label], () =>
        access.withExclusiveLockAsync(target, label, operation),
      ),
    writeExclusiveAtomicAsync: (target, contents, label) =>
      recordAsync(root, 'writeExclusiveAtomicAsync', [target, label], () =>
        access.writeExclusiveAtomicAsync(target, contents, label),
      ),
    replaceAtomicAsync: (target, expectedHash, contents, label) =>
      recordAsync(root, 'replaceAtomicAsync', [target, label], () =>
        access.replaceAtomicAsync(target, expectedHash, contents, label),
      ),
    fileExists: (target, label) =>
      recordSync(root, 'fileExists', [target, label], () => access.fileExists(target, label)),
    listFiles: (target, label) => recordSync(root, 'listFiles', [target, label], () => access.listFiles(target, label)),
    readBytes: (target, label) => recordSync(root, 'readBytes', [target, label], () => access.readBytes(target, label)),
    readText: (target, label) => recordSync(root, 'readText', [target, label], () => access.readText(target, label)),
    ...(access.readStableBytes
      ? {
          readStableBytes: (target: string, label: string) =>
            recordSync(root, 'readStableBytes', [target, label], () => access.readStableBytes!(target, label)),
        }
      : {}),
    ...(access.readCapturedBytes
      ? {
          readCapturedBytes: (target: string, label: string, maxBytes?: number) =>
            recordSync(root, 'readCapturedBytes', [target, label], () =>
              access.readCapturedBytes!(target, label, maxBytes),
            ),
        }
      : {}),
  };
  return Object.freeze(wrapped);
}

export async function createLocalWorkItemFixture(
  policy: ProductDefinition['work_items']['hierarchy'] = {
    mode: 'custom',
    allowed_children: { PBI: ['TASK', 'BUG'], BUG: [], TASK: [] },
  },
  options: { readonly instrument?: boolean } = {},
) {
  if (!activeCase) throw new Error('local work item fixture requires a tracked case owner');
  const root = await mkdtemp(path.join(tmpdir(), 'vida-local-work-item-'));
  activeCase.roots.add(root);
  activeCase.retained.add(root);
  process.stderr.write(
    `[local-work-item-fixture] ${JSON.stringify({ root, custody: 'retained', platform: process.platform, cwd: process.cwd() })}\n`,
  );
  const product: ProductDefinition = {
    project_id: 'demo',
    title: 'Demo',
    prefix: 'DEMO',
    project_root: '.',
    code_selectors: [],
    documents: {
      root: 'docs',
      index: 'docs/index.md',
      requirements: { root: 'requirements', areas: {} },
      research: 'research',
      decisions: 'decisions',
    },
    work_items: { storage_root: 'work', enabled_types: ['PBI', 'BUG', 'TASK'], hierarchy: policy },
  };
  const nativeAccess = requireSafeRepositoryAccess(root);
  const access = (options.instrument ?? activeCase.instrument) ? instrumentAccess(root, nativeAccess) : nativeAccess;
  const binding: LocalWorkItemBinding = {
    access,
    repository: { repository_id: 'repo', prefix: 'REPO' },
    product,
  };
  return { root, binding };
}
