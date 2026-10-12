import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as actualAccess from '../src/config/safe-repository-access.js';
import { SafeRepositoryMoveError } from '../src/config/safe-repository-access.js';
import { PROJECT_WORKSPACE_DATABASE_PATH } from '../src/config/project-paths.js';
import type { ProjectUpgradeOperation } from '../src/config/project-upgrade.js';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.js';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.ts';

type Upgrade = typeof import('../src/config/project-upgrade.js');
type MoveFault = {
  target: string;
  code?: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' | 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN';
  calls: number;
};
type RootDisposition = 'ready' | 'known-pending' | 'failed-or-unknown';

// Bun's mock.module() updates already-imported module namespaces in place.
// Keep the original callable before registering the override so this seam
// delegates to the real repository access implementation instead of itself.
const originalAccessModule = Object.freeze({ ...actualAccess });
const originalRequireSafeRepositoryAccess = originalAccessModule.requireSafeRepositoryAccess;
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const accessModule = pathToFileURL(path.join(packageRoot, 'src/config/safe-repository-access.ts')).href;
const runtimeConfigModule = pathToFileURL(path.join(packageRoot, 'src/config/runtime-config.ts')).href;
const workerCase = process.env.VIDA_PROJECT_UPGRADE_DENIAL_WORKER;
const measureCpuPhases = process.env.VIDA_PROJECT_UPGRADE_DENIAL_CPU_PHASES === '1';
let originalRuntimeConfigModule: Readonly<typeof import('../src/config/runtime-config.js')> | undefined;
if (workerCase !== undefined && measureCpuPhases) {
  const started = performance.now();
  console.error('denial module import start', { worker: workerCase, module: 'runtime-config' });
  originalRuntimeConfigModule = Object.freeze({ ...(await import('../src/config/runtime-config.js')) });
  console.error('denial module import completed', {
    worker: workerCase,
    module: 'runtime-config',
    elapsed_ms: performance.now() - started,
  });
}
const tracePackageReads = process.env.VIDA_PROJECT_UPGRADE_DENIAL_PACKAGE_TRACE === '1';
const countPackageReads = process.env.VIDA_PROJECT_UPGRADE_DENIAL_READ_COUNTS === '1';
const packageReadTotals = {
  reads: 0,
  read_bytes: 0,
  read_text: 0,
  failed: 0,
  bytes_returned: 0,
  text_utf16_code_units: 0,
  elapsed_ms: 0,
  max_ms: 0,
};
const cpuPhaseTotals = {
  parseRuntimeConfigDocument: { calls: 0, failed: 0, elapsed_ms: 0 },
  validateRuntimeConfig: { calls: 0, failed: 0, elapsed_ms: 0 },
  runtimePackageCodePaths: { calls: 0, failed: 0, elapsed_ms: 0 },
};
let activeCpuPhase = 'outside-measured-phase';
const phaseCpuTotals = {
  calls: 0,
  failed: 0,
  elapsed_ms: 0,
};

function observeCpuPhase<TArgs extends unknown[], TResult>(
  name: keyof typeof cpuPhaseTotals,
  original: (this: unknown, ...args: TArgs) => TResult,
): (this: unknown, ...args: TArgs) => TResult {
  return function (this: unknown, ...args: TArgs): TResult {
    const started = performance.now();
    const totals = cpuPhaseTotals[name];
    totals.calls += 1;
    // Emit a bounded start checkpoint before expensive synchronous validation
    // or package discovery can block the worker's next phase completion.
    if (measureCpuPhases && (totals.calls === 1 || totals.calls % 16 === 0))
      console.error('denial CPU phase in-flight', {
        worker: workerCase,
        phase: activeCpuPhase,
        api: name,
        call: totals.calls,
      });
    try {
      return original.apply(this, args);
    } catch (error: unknown) {
      totals.failed += 1;
      phaseCpuTotals.failed += 1;
      throw error;
    } finally {
      const elapsed = performance.now() - started;
      totals.elapsed_ms += elapsed;
      phaseCpuTotals.calls += 1;
      phaseCpuTotals.elapsed_ms += elapsed;
      // A child may be terminated before measurePhase's completion report.
      // Emit bounded scalar progress for completed API calls as they return.
      if (measureCpuPhases && (totals.calls === 1 || totals.calls % 16 === 0))
        console.error('denial CPU phase completed', {
          worker: workerCase,
          phase: activeCpuPhase,
          api: name,
          calls: totals.calls,
          failed: totals.failed,
          call_elapsed_ms: elapsed,
          cumulative_elapsed_ms: totals.elapsed_ms,
        });
    }
  };
}

function reportCpuPhaseTotals(phase: string): void {
  if (!measureCpuPhases) return;
  // Inclusive exported-API timings may overlap. Internal lexical calls and
  // module import/cold-start work are not observed by this test-only seam.
  console.error('denial CPU phase totals', {
    worker: workerCase,
    phase,
    timing_scope: 'inclusive exported API calls; timings overlap and must not be summed as total wall time',
    unmeasured: 'internal lexical calls and module import/cold-start work',
    phase_totals: phaseCpuTotals,
    lifecycle_totals: cpuPhaseTotals,
  });
}

function recordPackageRead(
  target: string,
  started: number,
  kind: 'readBytes' | 'readText',
  returnedLength: number,
  failed: boolean,
): void {
  if (!countPackageReads) return;
  const elapsed = performance.now() - started;
  packageReadTotals.reads += 1;
  packageReadTotals[kind === 'readBytes' ? 'read_bytes' : 'read_text'] += 1;
  packageReadTotals.failed += Number(failed);
  if (kind === 'readBytes') packageReadTotals.bytes_returned += returnedLength;
  else packageReadTotals.text_utf16_code_units += returnedLength;
  packageReadTotals.elapsed_ms += elapsed;
  packageReadTotals.max_ms = Math.max(packageReadTotals.max_ms, elapsed);
  // Inclusive API counters reuse the exact current read; they add no traversal.
  // A killed synchronous read can still prevent the next checkpoint.
  if (failed || packageReadTotals.reads % 64 === 0)
    console.error('denial package read totals', { worker: workerCase, target, ...packageReadTotals });
}

function observePackageRead<TResult extends Buffer | string, TArgs extends [string, string, ...unknown[]]>(
  kind: 'readBytes' | 'readText',
  original: (this: unknown, ...args: TArgs) => TResult,
): (this: unknown, ...args: TArgs) => TResult {
  return function (this: unknown, ...args: TArgs): TResult {
    const [target, label] = args;
    const started = performance.now();
    if (tracePackageReads) console.error('denial package read start', { worker: workerCase, target });
    try {
      const value = Reflect.apply(original, this, args);
      recordPackageRead(target, started, kind, value.length, false);
      return value;
    } catch (error: unknown) {
      recordPackageRead(target, started, kind, 0, true);
      if (process.env.VIDA_PROJECT_UPGRADE_DENIAL_TIMING === '1')
        console.error('denial package read failure', {
          worker: workerCase,
          target,
          label,
          elapsed_ms: performance.now() - started,
          code: error instanceof Error && 'code' in error ? error.code : undefined,
        });
      throw error;
    }
  };
}

const faults = new Map<string, MoveFault>();
const roots = new Map<string, RootDisposition>();
if (workerCase !== undefined) {
  void mock.module(accessModule, () => ({
    ...actualAccess,
    requireSafeRepositoryAccess(repositoryRoot: string) {
      const access = originalRequireSafeRepositoryAccess(repositoryRoot);
      if (repositoryRoot === packageRoot) {
        return {
          ...access,
          readBytes: observePackageRead('readBytes', access.readBytes),
          ...(access.readVerifiedCaptureBytes
            ? { readVerifiedCaptureBytes: observePackageRead('readBytes', access.readVerifiedCaptureBytes) }
            : {}),
          readText: observePackageRead('readText', access.readText),
        };
      }
      const fault = faults.get(repositoryRoot);
      if (fault === undefined) return access;
      return {
        ...access,
        async moveNoReplaceAsync(source: string, target: string, expectedHash: string, label: string) {
          if (fault.target !== target) return access.moveNoReplaceAsync(source, target, expectedHash, label);
          fault.calls += 1;
          faults.delete(repositoryRoot);
          expect(access.fileExists(source, label)).toBe(true);
          expect(access.fileExists(target, label)).toBe(false);
          expect(createHash('sha256').update(access.readBytes(source, label)).digest('hex')).toBe(expectedHash);
          // Model only the provider's typed no-effect result after checking real fixture bytes and paths.
          throw new SafeRepositoryMoveError(
            fault.code ?? 'SAFE_REPOSITORY_MOVE_NOT_APPLIED',
            'fixture provider denial after exact no-effect beforeimage verification',
            { cause: new Error('fixture native no-replace denial') },
          );
        },
      };
    },
  }));
  if (measureCpuPhases) {
    if (originalRuntimeConfigModule === undefined) throw new Error('CPU phase diagnostic module is unavailable');
    void mock.module(runtimeConfigModule, () => ({
      ...originalRuntimeConfigModule,
      parseRuntimeConfigDocument: observeCpuPhase(
        'parseRuntimeConfigDocument',
        originalRuntimeConfigModule.parseRuntimeConfigDocument,
      ),
      validateRuntimeConfig: observeCpuPhase(
        'validateRuntimeConfig',
        originalRuntimeConfigModule.validateRuntimeConfig,
      ),
      runtimePackageCodePaths: observeCpuPhase(
        'runtimePackageCodePaths',
        originalRuntimeConfigModule.runtimePackageCodePaths,
      ),
    }));
  }
}

let upgrade: Upgrade | undefined;
if (workerCase !== undefined) {
  const started = performance.now();
  if (measureCpuPhases) console.error('denial module import start', { worker: workerCase, module: 'project-upgrade' });
  upgrade = await import('../src/config/project-upgrade.js');
  if (measureCpuPhases)
    console.error('denial module import completed', {
      worker: workerCase,
      module: 'project-upgrade',
      elapsed_ms: performance.now() - started,
    });
}
const stagingFor = (operationId: string): string => `.vida/.upgrade-intent-${operationId}.json`;
const parseJson = (source: string): unknown => JSON.parse(source) as unknown;
type PreparedIntent = { root: string; operationId: string; operation: ProjectUpgradeOperation; staging: string };
type PreparedStorage = { root: string; operationId: string; operation: ProjectUpgradeOperation };
let intentCase: PreparedIntent | undefined;
let bootstrapCase: PreparedStorage | undefined;
let unknownIntentCase: PreparedIntent | undefined;
let unknownStorageCase: PreparedStorage | undefined;

async function fixture(): Promise<string> {
  const root = await measurePhase('fixture', () => makeFreshRepository('project-upgrade-denial-'));
  roots.set(root, 'ready');
  return root;
}

function retainKnownPending(root: string): void {
  const disposition = roots.get(root);
  if (disposition === undefined) throw new Error('upgrade fixture root is not registered');
  if (disposition === 'ready') roots.set(root, 'known-pending');
}

function assertCaseActive(...fixtureRoots: string[]): void {
  for (const root of fixtureRoots) {
    if (roots.get(root) !== 'ready')
      throw new Error('upgrade denial case failed or timed out; fixture custody is retained');
  }
}

function requireSetup<T>(setup: T | undefined): T {
  if (setup === undefined) throw new Error('upgrade denial fixture setup is missing');
  return setup;
}

async function createIntentSetup(operationId: string): Promise<PreparedIntent> {
  const root = await fixture();
  const operation = await plannedFreshOperation(root, operationId);
  const staging = await measurePhase('intent-setup', () => installLegacyPreparedIntent(root, operation));
  return { root, operationId, operation, staging };
}

async function createStorageSetup(operationId: string): Promise<PreparedStorage> {
  const root = await fixture();
  const operation = await plannedFreshOperation(root, operationId);
  return { root, operationId, operation };
}

async function plannedFreshOperation(root: string, operationId: string): Promise<ProjectUpgradeOperation> {
  return measurePhase('planning', () =>
    requireUpgrade().planProjectUpgradeRepair(root, {
      operation_id: operationId,
      actor: 'test-owner',
      instruction_ref: 'project-upgrade-denial-contract.test.ts',
    }),
  );
}

async function measurePhase<T>(label: string, action: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const previousPhase = activeCpuPhase;
  activeCpuPhase = label;
  phaseCpuTotals.calls = 0;
  phaseCpuTotals.failed = 0;
  phaseCpuTotals.elapsed_ms = 0;
  try {
    return await action();
  } finally {
    if (process.env.VIDA_PROJECT_UPGRADE_DENIAL_TIMING === '1')
      console.error(`denial phase ${workerCase ?? 'parent'}/${label}: ${(performance.now() - started).toFixed(1)} ms`);
    reportCpuPhaseTotals(label);
    activeCpuPhase = previousPhase;
  }
}

async function installLegacyPreparedIntent(root: string, operation: ProjectUpgradeOperation): Promise<string> {
  const prepared = requireUpgrade().validateProjectUpgradeOperation({
    ...operation,
    revision: operation.revision + 1,
    phase: 'intent_prepared',
  });
  const staging = stagingFor(operation.plan.operation_id);
  await unlink(path.join(root, requireUpgrade().PROJECT_UPGRADE_OPERATION_PATH));
  await writeFile(path.join(root, staging), JSON.stringify(prepared, null, 2) + '\n');
  return staging;
}

async function captureError(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await measurePhase('attempt', action);
  } catch (error: unknown) {
    return error;
  }
  return null;
}

function requireUpgrade(): Upgrade {
  if (upgrade === undefined) throw new Error('denial worker did not load project upgrade');
  return upgrade;
}

const workerTitles = {
  'known-intent': 'denial worker: known no-effect initial-intent denial',
  'known-bootstrap': 'denial worker: known no-effect bootstrap denial',
  'unknown-intent': 'denial worker: retained intent UNKNOWN state',
  'unknown-bootstrap': 'denial worker: bootstrap UNKNOWN state',
} as const;

if (workerCase === undefined) {
  test(
    'runs all four denial contract cases in one bounded sequential worker',
    async () => {
      const result = await runBoundedSubprocess(
        process.execPath,
        [
          'test',
          '--no-env-file',
          '--no-install',
          '--parallel=1',
          '--timeout=5000',
          '--test-name-pattern',
          'denial worker:',
          fileURLToPath(import.meta.url),
        ],
        {
          cwd: packageRoot,
          env: {
            ...process.env,
            VIDA_PROJECT_UPGRADE_DENIAL_WORKER: 'all',
            VIDA_PROJECT_UPGRADE_DENIAL_TIMING: '1',
          },
          // The four existing 4.5s child limits define this shared worker pool;
          // 5s remains the individual Bun test deadline after cold-start amortization.
          timeoutMs: 18_000,
        },
      );
      const diagnostic = subprocessFailure('all four denial contract cases', result);
      const output = `${result.stdout.toString()}\n${result.stderr.toString()}`;
      const custodyLines = output.match(/^Retained upgrade denial fixture \(known-pending\): .*$/gm) ?? [];
      const passCounts = [...output.matchAll(/\b(\d+) pass\b/g)];
      const failCounts = [...output.matchAll(/\b(\d+) fail\b/g)];
      const healthProblems: string[] = [];
      // Child infrastructure failures are not assertion-confirmed mutant kills.
      // Nested assertion causality remains pending until it has bound child evidence.
      if (!result.closeObserved) healthProblems.push('child close was not observed');
      if (result.timedOut) healthProblems.push('child exceeded the 18s orchestration bound');
      if (result.signal !== null) healthProblems.push(`child exited on signal ${result.signal}`);
      if (result.childError !== null) healthProblems.push(`child process error: ${result.childError}`);
      if (result.exitCode !== 0) healthProblems.push(`child exit code was ${String(result.exitCode)}`);
      if (result.stdoutTruncated || result.stderrTruncated) healthProblems.push('child output was truncated');
      if (result.terminationError !== null) healthProblems.push(`child termination error: ${result.terminationError}`);
      if (result.stderrForwardingError !== null)
        healthProblems.push(`child stderr forwarding error: ${result.stderrForwardingError}`);
      for (const title of Object.values(workerTitles)) {
        const count = output.split(title).length - 1;
        if (count !== 1) healthProblems.push(`expected one result for ${JSON.stringify(title)}, found ${count}`);
      }
      if (passCounts.length !== 1 || passCounts[0]?.[1] !== '4')
        healthProblems.push(
          `expected exactly one "4 pass" counter, found ${passCounts.map((match) => match[0]).join(', ') || 'none'}`,
        );
      if (failCounts.length !== 1 || failCounts[0]?.[1] !== '0')
        healthProblems.push(
          `expected exactly one "0 fail" counter, found ${failCounts.map((match) => match[0]).join(', ') || 'none'}`,
        );
      if (custodyLines.length !== 4 || new Set(custodyLines).size !== 4)
        healthProblems.push(`expected four distinct retained-root custody lines, found ${custodyLines.length}`);
      if (healthProblems.length > 0)
        throw new Error(`${diagnostic}\nChild runner health/report failure:\n- ${healthProblems.join('\n- ')}`);

      for (const line of custodyLines) console.error(line);
    },
    { timeout: 20_000 },
  );
} else {
  afterAll(() => {
    for (const [root, disposition] of roots) {
      console.error(`Retained upgrade denial fixture (${disposition}): ${root}`);
    }
    faults.clear();
    void mock.module(accessModule, () => originalAccessModule);
    if (originalRuntimeConfigModule !== undefined)
      void mock.module(runtimeConfigModule, () => originalRuntimeConfigModule);
    mock.restore();
  });

  afterEach(() => {
    for (const [root, disposition] of roots) if (disposition === 'ready') roots.set(root, 'failed-or-unknown');
  });

  describe('known no-effect initial-intent denial', () => {
    beforeEach(async () => {
      intentCase = undefined;
      intentCase = await createIntentSetup('denial-intent-001');
    });

    test(workerTitles['known-intent'], async () => {
      const { root, operationId, operation, staging } = requireSetup(intentCase);
      const before = requireUpgrade().validateProjectUpgradeOperation(
        parseJson(await readFile(path.join(root, staging), 'utf8')),
      );
      faults.set(root, { target: requireUpgrade().PROJECT_UPGRADE_OPERATION_PATH, calls: 0 });

      const intentError = await captureError(() => requireUpgrade().recoverProjectUpgradeIntent(root, operationId));
      assertCaseActive(root);
      expect(intentError).toBeInstanceOf(SafeRepositoryMoveError);
      expect(intentError).toMatchObject({ code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' });
      const restored = requireUpgrade().validateProjectUpgradeOperation(
        parseJson(await readFile(path.join(root, staging), 'utf8')),
      );
      expect(restored.plan.operation_id).toBe(operationId);
      expect(restored.plan.token).toBe(operation.plan.token);
      expect(restored.phase).toBe('intent_prepared');
      expect(restored.revision).toBe(before.revision + 2);
      expect(
        await readFile(path.join(root, requireUpgrade().PROJECT_UPGRADE_OPERATION_PATH), 'utf8').catch(() => null),
      ).toBeNull();

      assertCaseActive(root);
      const resumed = await measurePhase('retry', () =>
        requireUpgrade().recoverProjectUpgradeIntent(root, operationId),
      );
      expect(resumed.phase).toBe('planned');
      expect(resumed.plan.operation_id).toBe(operationId);
      expect(resumed.plan.token).toBe(operation.plan.token);
      retainKnownPending(root);
    });
  });

  describe('known no-effect bootstrap denial', () => {
    beforeEach(async () => {
      bootstrapCase = undefined;
      bootstrapCase = await createStorageSetup('denial-bootstrap-001');
    });

    test(workerTitles['known-bootstrap'], async () => {
      const { root, operationId, operation } = requireSetup(bootstrapCase);
      const target = PROJECT_WORKSPACE_DATABASE_PATH;
      faults.set(root, { target, calls: 0 });

      const bootstrapError = await captureError(() =>
        requireUpgrade().resumeFreshProjectUpgradeDatabase(root, operationId),
      );
      assertCaseActive(root);
      expect(bootstrapError).toBeInstanceOf(SafeRepositoryMoveError);
      expect(bootstrapError).toMatchObject({ code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' });
      const staged = requireUpgrade().inspectPlannedProjectUpgrade(root, operationId);
      expect(staged.phase).toBe('planned');
      expect(staged.storage_phase).toBe('staged');
      expect(staged.plan.operation_id).toBe(operationId);
      expect(staged.plan.token).toBe(operation.plan.token);
      expect(await readFile(path.join(root, target)).catch(() => null)).toBeNull();
      for (const suffix of ['-wal', '-shm', '-journal'])
        expect(await readFile(path.join(root, target + suffix)).catch(() => null)).toBeNull();

      assertCaseActive(root);
      const published = await measurePhase('retry', () =>
        requireUpgrade().resumeFreshProjectUpgradeDatabase(root, operationId),
      );
      expect(published.storage_phase).toBe('published');
      expect(published.plan.operation_id).toBe(operationId);
      expect(published.plan.token).toBe(operation.plan.token);
      retainKnownPending(root);
    });
  });

  describe('retained intent UNKNOWN state', () => {
    beforeEach(async () => {
      unknownIntentCase = undefined;
      unknownIntentCase = await createIntentSetup('unknown-intent-001');
    });

    test(workerTitles['unknown-intent'], async () => {
      const {
        root: intentRoot,
        operationId: intentOperationId,
        staging: intentStaging,
      } = requireSetup(unknownIntentCase);
      const intentFault: MoveFault = {
        target: requireUpgrade().PROJECT_UPGRADE_OPERATION_PATH,
        code: 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
        calls: 0,
      };
      faults.set(intentRoot, intentFault);
      const intentFirstError = await captureError(() =>
        requireUpgrade().recoverProjectUpgradeIntent(intentRoot, intentOperationId),
      );
      assertCaseActive(intentRoot);
      expect(intentFirstError).toBeInstanceOf(SafeRepositoryMoveError);
      expect(intentFault.calls).toBe(1);
      const intentSecondError = await captureError(() =>
        requireUpgrade().recoverProjectUpgradeIntent(intentRoot, intentOperationId),
      );
      assertCaseActive(intentRoot);
      expect(intentSecondError).toBeInstanceOf(Error);
      const intentRetained = requireUpgrade().validateProjectUpgradeOperation(
        parseJson(await readFile(path.join(intentRoot, intentStaging), 'utf8')),
      );
      expect(intentRetained.phase).toBe('unknown_intent_move');
      expect(intentRetained.plan.operation_id).toBe(intentOperationId);
      assertCaseActive(intentRoot);
      await awaitNoMoveFromRetainedIntent(intentRoot, intentOperationId, intentFault);
      retainKnownPending(intentRoot);
    });
  });

  describe('bootstrap UNKNOWN state', () => {
    beforeEach(async () => {
      unknownStorageCase = undefined;
      unknownStorageCase = await createStorageSetup('unknown-storage-001');
    });

    test(workerTitles['unknown-bootstrap'], async () => {
      const { root, operationId, operation } = requireSetup(unknownStorageCase);
      const fault: MoveFault = {
        target: PROJECT_WORKSPACE_DATABASE_PATH,
        code: 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
        calls: 0,
      };
      faults.set(root, fault);
      const firstError = await captureError(() =>
        requireUpgrade().resumeFreshProjectUpgradeDatabase(root, operationId),
      );
      assertCaseActive(root);
      expect(firstError).toBeInstanceOf(SafeRepositoryMoveError);
      expect(fault.calls).toBe(1);
      const retained = requireUpgrade().inspectPlannedProjectUpgrade(root, operationId);
      assertCaseActive(root);
      expect(retained.storage_phase).toBe('unknown_move');
      expect(retained.plan.operation_id).toBe(operationId);
      expect(retained.plan.token).toBe(operation.plan.token);
      const secondError = await captureError(() =>
        requireUpgrade().resumeFreshProjectUpgradeDatabase(root, operationId),
      );
      expect(secondError).toBeInstanceOf(Error);
      expect(fault.calls).toBe(1);
      retainKnownPending(root);
    });
  });

  async function awaitNoMoveFromRetainedIntent(root: string, operationId: string, fault: MoveFault): Promise<void> {
    const error = await captureError(() => requireUpgrade().recoverProjectUpgradeIntent(root, operationId));
    expect(error).toBeInstanceOf(Error);
    expect(fault.calls).toBe(1);
  }
}
