import { mock } from 'bun:test';
import { fileURLToPath } from 'node:url';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as admission from '../../src/orchestration/local-work-admission.js';
import * as execution from '../../src/orchestration/admitted-session-execution.js';
import * as kernel from '../../src/runtime-kernel.js';
import * as snapshots from '../../src/orchestration/scoped-source-snapshot.js';
import { initialSourcePhases, type InitialSourcePhase } from './initial-source-phase-timing.js';

// Capture callable values before Bun replaces live exports, including internal imports.
const admissionExports = { ...admission };
const executionExports = { ...execution };
const kernelExports = { ...kernel };
const snapshotExports = { ...snapshots };
const acquire = admission.acquireLocalSourceWriterLease;
const open = execution.openAdmittedSessionExecution;
const prepare = kernel.prepareWorkflowExecution;
const reserve = kernel.reserveWorkflowAssignmentForSession;
const compose = kernel.createTrustedLocalSessionComposition;
const assertCurrent = execution.assertAdmittedRuntimeCodeCurrent;
const snapshotRuntime = snapshots.snapshotRuntimePackageSources;
const runtimeScope = new AsyncLocalStorage<{ root: string; workId: string | null }>();

function observeScope<T>(
  phase: InitialSourcePhase,
  root: string,
  workId: string | null,
  stage: string | null,
  operation: () => T,
): T {
  return runtimeScope.run({ root, workId }, () => initialSourcePhases.measure(phase, root, workId, stage, operation));
}

function observeRuntime<T>(phase: InitialSourcePhase, operation: () => T): T {
  const scope = runtimeScope.getStore();
  return scope === undefined
    ? operation()
    : initialSourcePhases.measure(phase, scope.root, scope.workId, null, operation);
}

if (initialSourcePhases.enabled && process.env.VIDA_INITIAL_SOURCE_FIXTURE_CHILD === '1') {
  await mock.module(fileURLToPath(new URL('../../src/orchestration/local-work-admission.ts', import.meta.url)), () => ({
    ...admissionExports,
    acquireLocalSourceWriterLease: (...args: Parameters<typeof acquire>) =>
      observeScope('lease', args[0].repositoryRoot, args[0].identity.work_id, args[0].stageId, () => acquire(...args)),
  }));
  await mock.module(
    fileURLToPath(new URL('../../src/orchestration/admitted-session-execution.ts', import.meta.url)),
    () => ({
      ...executionExports,
      openAdmittedSessionExecution: (...args: Parameters<typeof open>) =>
        observeScope('execution_open', args[0], args[3], null, () => open(...args)),
      assertAdmittedRuntimeCodeCurrent: (...args: Parameters<typeof assertCurrent>) =>
        observeScope('runtime_current', args[0], args[2].work_id, null, () => assertCurrent(...args)),
    }),
  );
  await mock.module(
    fileURLToPath(new URL('../../src/orchestration/scoped-source-snapshot.ts', import.meta.url)),
    () => ({
      ...snapshotExports,
      snapshotRuntimePackageSources: (...args: Parameters<typeof snapshotRuntime>) =>
        observeRuntime('runtime_snapshot', () => snapshotRuntime(...args)),
    }),
  );

  await mock.module(fileURLToPath(new URL('../../src/runtime-kernel.ts', import.meta.url)), () => ({
    ...kernelExports,
    prepareWorkflowExecution: (...args: Parameters<typeof prepare>) =>
      observeScope('workflow_prepare', args[1].repositoryRoot, args[1].workItemId, null, () => prepare(...args)),
    reserveWorkflowAssignmentForSession: (...args: Parameters<typeof reserve>) =>
      observeScope('workflow_reserve', args[1].repositoryRoot, args[1].workItemId, args[1].stageId, () =>
        reserve(...args),
      ),
    createTrustedLocalSessionComposition: (...args: Parameters<typeof compose>) =>
      observeScope('composition', args[0].repositoryRoot, args[0].admittedWork?.workId ?? null, null, () =>
        compose(...args),
      ),
  }));
  initialSourcePhases.installDelegates();
}
