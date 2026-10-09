import { createHash } from 'node:crypto';
import { projectRecoveryRuntimeCodeAncestor } from './failed-prewriter-transition.js';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from '../config/runtime-config.js';
import { loadProjectSetContext } from '../config/project-context.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import type { HostStateStore, WorkIdentity, WorkState } from '../host-state.js';
import { createTrustedLocalSessionComposition, requireLiveLocalSessionAdmission } from '../runtime-kernel.js';
import { snapshotRuntimePackageSources } from './scoped-source-snapshot.js';
import { resolveTaskSourceFileRoot } from './task-source-binding.js';
import {
  validateConfiguredFrontierReceiptStructure,
  type ConfiguredFrontierReceipt,
} from './delivered-work-continuation-repair.js';
import { validateInitialSourceContinuationReceipt } from './initial-source-continuation.js';
import {
  readInitialSourceContinuationLineageView,
  validateInitialSourceContinuationLineage,
} from './admitted-development-packet.js';
import { validateCompletedSourceReportRecoveryCurrentWorkJoin } from './completed-source-report-recovery.js';

function requireExecution(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Read the one bound current-v1 intake; historical ownership cleanup grants no executable freshness. */
export function readAdmittedSessionIntake(
  repositoryRoot: string,
  store: HostStateStore,
  identity: WorkIdentity,
): { work_item: unknown; runtime_code_paths: string[]; native_session_handle: string } {
  const work = store.readHostStateSnapshot(identity).work;
  requireExecution(work, 'admitted local session work is unavailable');
  return readAdmittedSessionIntakeForWork(repositoryRoot, work);
}

/** Read protected intake bytes from an already checked Host snapshot, including inside its transaction. */
export function readAdmittedSessionIntakeForWork(
  repositoryRoot: string,
  work: WorkState,
): { work_item: unknown; runtime_code_paths: string[]; native_session_handle: string } {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const intakeRef = work.artifacts.find(
    (item) => item.artifact_id === 'local-session-intake' && item.schema === 'VidaLocalSessionIntake/v1',
  );
  requireExecution(intakeRef, 'admitted local session intake reference is missing');
  const intakeBytes = access.readBytes(intakeRef.path, 'local session intake');
  requireExecution(
    intakeBytes.length <= 32768 && createHash('sha256').update(intakeBytes).digest('hex') === intakeRef.sha256,
    'admitted local session intake changed',
  );
  const intake = JSON.parse(intakeBytes.toString('utf8')) as {
    work_item: unknown;
    runtime_code_paths: string[];
    native_session_handle: string;
  };
  requireExecution(
    canonicalJsonDigest(intake.work_item) === work.binding.work_item_digest &&
      typeof intake.native_session_handle === 'string' &&
      intake.native_session_handle.length > 0 &&
      Array.isArray(intake.runtime_code_paths) &&
      intake.runtime_code_paths.every(
        (entry) =>
          typeof entry === 'string' &&
          entry.length > 0 &&
          !entry.includes('\\') &&
          !entry.startsWith('/') &&
          entry.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..'),
      ) &&
      canonicalJsonDigest(intake.runtime_code_paths) ===
        canonicalJsonDigest([...new Set(intake.runtime_code_paths)].sort()),
    'admitted local session intake identity or protected runtime path inventory differs',
  );
  return intake;
}

/** Check the canonical package closure before issuing any native action. */
export function assertAdmittedRuntimeCodeCurrent(
  repositoryRoot: string,
  store: HostStateStore,
  identity: WorkIdentity,
): { work_item: unknown; native_session_handle: string } {
  const intake = readAdmittedSessionIntake(repositoryRoot, store, identity);
  const host = store.readHostStateSnapshot(identity);
  const work = host.work!;
  const config = loadRuntimeConfig(repositoryRoot);
  const currentPaths = runtimePackageCodePaths(config.runtime.bundle);
  const journal = store.readWorkSessionJournal(identity);
  const initialView = journal ? readInitialSourceContinuationLineageView(store, identity, journal.attempt) : null;
  const initialReceipt = initialView?.receipt ?? null;
  const configuredContinuation = journal ? store.readConfiguredFrontierRecoveryView(identity, journal.attempt) : null;
  requireExecution(
    !(initialReceipt && configuredContinuation),
    'multiple Host runtime continuation records are ambiguous',
  );
  let runtimePaths: readonly string[] = currentPaths;
  if (initialReceipt) {
    const receipt = validateInitialSourceContinuationReceipt(initialReceipt);
    const completedRecovery = initialView?.completedSourceReportRecovery ?? null;
    validateInitialSourceContinuationLineage(
      work,
      receipt,
      journal!.state,
      initialView?.frontierCodeRebind,
      completedRecovery,
      initialView?.runtimeCodeContinuations,
    );
    if (completedRecovery) {
      validateCompletedSourceReportRecoveryCurrentWorkJoin(
        host,
        { version: journal!.version, state: journal!.state as unknown as MastraSessionLedgerState },
        receipt,
        initialView?.frontierCodeRebind ?? null,
        completedRecovery,
      );
    }
    const current = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, currentPaths);
    const adoptedCode = initialView?.runtimeCodeContinuations?.at(-1)?.request;
    const expectedCurrentCode =
      adoptedCode?.currentRuntimeCodeDigest ??
      completedRecovery?.record.request.currentRuntimeCodeDigest ??
      initialView?.frontierCodeRebind?.current_runtime_code_digest ??
      receipt.request.currentRuntimeCodeDigest;
    const expectedCurrentPaths =
      adoptedCode?.currentRuntimeCodePaths ?? completedRecovery?.record.request.currentRuntimeCodePaths ?? currentPaths;
    requireExecution(
      current.digest === work.binding.runtime_code_digest &&
        current.digest === expectedCurrentCode &&
        canonicalJsonDigest(currentPaths) === canonicalJsonDigest(expectedCurrentPaths) &&
        (adoptedCode
          ? adoptedCode.currentRuntimeCodeDigest === current.digest
          : !initialView?.frontierCodeRebind && !completedRecovery
            ? receipt.request.currentRuntimeCodeDigest === current.digest
            : completedRecovery
              ? completedRecovery.record.request.currentRuntimeCodeDigest === current.digest
              : initialView!.frontierCodeRebind!.current_runtime_code_digest === current.digest),
      'initial Source continuation does not bind the canonical runtime inventory and protected intake paths',
    );
  } else if (canonicalJsonDigest(intake.runtime_code_paths) !== canonicalJsonDigest(currentPaths)) {
    const receipt = journal && store.readDeliveredWorkContinuationReceipt(identity, journal.attempt);
    requireExecution(
      receipt?.request.action.kind === 'configured_frontier' &&
        receipt.request.sourceTransition.status === 'closed_config_rebind_proven' &&
        receipt.historical_capture === null &&
        receipt.frontier_snapshot !== undefined,
      'admitted runtime inventory differs; qualified runtime repair/rebind is required',
    );
    validateConfiguredFrontierReceiptStructure({ receipt: receipt as ConfiguredFrontierReceipt });
    const recovery = store.readFailedPrewriterRecoveryReceipt(identity, journal!.attempt);
    const request = receipt.request,
      transition = recovery?.request.sourceTransition.transition ?? request.sourceTransition.transition,
      intakeRef = work.artifacts.find(
        (ref) => ref.artifact_id === 'local-session-intake' && ref.schema === 'VidaLocalSessionIntake/v1',
      ),
      project = loadProjectSetContext(repositoryRoot, config, identity.repository_id, identity.project_ids),
      schemaDigest = createHash('sha256')
        .update(
          runtimePackageAccess().readBytes('schemas/agent-runtime-config.v1.schema.json', 'current runtime schema'),
        )
        .digest('hex');
    requireExecution(
      intakeRef &&
        'original_intake_ref' in transition &&
        transition.original_intake_ref === intakeRef.path &&
        transition.original_intake_sha256 === intakeRef.sha256 &&
        request.nativeSessionHandle === intake.native_session_handle &&
        receipt.prior_work.execution.run_id === work.execution.run_id &&
        receipt.prior_work.binding.runtime_code_digest === request.priorRuntimeCodeDigest &&
        receipt.prior_work.binding.config_digest === request.priorConfigDigest &&
        (recovery?.successor_work.binding.runtime_code_digest ?? request.targetRuntimeCodeDigest) ===
          projectRecoveryRuntimeCodeAncestor(
            work,
            host.runtimeCodeContinuations,
            recovery?.work_version.revision ?? receipt.work_version.revision,
            recovery,
          ).binding.runtime_code_digest &&
        request.targetConfigDigest === runtimeConfigDigest(config) &&
        request.targetConfigDigest === work.binding.config_digest &&
        (recovery?.successor_work.binding.schema_digest ?? request.targetSchemaDigest) === schemaDigest &&
        schemaDigest === work.binding.schema_digest &&
        (recovery?.request.targetProjectContextDigest ?? request.targetProjectContextDigest) ===
          project.project_context_digest,
      'admitted runtime continuation does not bind the protected intake and current endpoint',
    );
  }
  const current = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, runtimePaths);
  requireExecution(current.digest === work.binding.runtime_code_digest, 'admitted runtime code changed');
  return { work_item: intake.work_item, native_session_handle: intake.native_session_handle };
}

/** Fresh admitted data checks; no kernel construction or capability issuance. */
export function readAdmittedSessionExecutionContext(
  repositoryRoot: string,
  store: HostStateStore,
  projectId: string,
  workId: string,
) {
  const config = loadRuntimeConfig(repositoryRoot);
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [projectId]);
  const identity: WorkIdentity = {
    repository_id: project.repository_id,
    project_ids: project.project_ids,
    integrations_digest: project.integrations_digest,
    work_id: workId,
  };
  const state = store.readHostStateSnapshot(identity);
  const work = state.work;
  requireExecution(
    work?.lease && work.execution.status === 'active',
    'admitted local session work or lease is unavailable',
  );
  const currentProjectContext = loadProjectSetContext(
    repositoryRoot,
    config,
    work.binding.repository_id,
    work.binding.project_ids,
  );
  requireExecution(
    work.binding.config_digest === runtimeConfigDigest(config) &&
      work.binding.repository_id === config.repository.repository_id &&
      work.binding.project_ids.length === 1 &&
      work.binding.integrations_digest === currentProjectContext.integrations_digest,
    'admitted local session configuration or project differs',
  );
  const taskSourceBinding = store.readCurrentTaskSourceBinding(identity, work.lease.thread_id);
  const sourceFileRoot = resolveTaskSourceFileRoot({
    canonicalHostRoot: repositoryRoot,
    binding: taskSourceBinding,
    identity,
    attempt: taskSourceBinding?.attempt ?? 1,
    threadId: work.lease.thread_id,
    configDigest: runtimeConfigDigest(config),
    projectContextDigest: currentProjectContext.project_context_digest,
    sourceScopeDigest: work.binding.work_source_revision,
  });
  requireLiveLocalSessionAdmission({ repositoryRoot, identity, store, nativeSessionHandle: work.lease.thread_id });
  const intake = assertAdmittedRuntimeCodeCurrent(repositoryRoot, store, identity);
  const successorBound = work.execution.assignment_attempts.some(
    (attempt) =>
      attempt.status === 'no_effect' &&
      attempt.lease.thread_id === intake.native_session_handle &&
      canonicalJsonDigest(attempt.reconciliation?.retry_lease) === canonicalJsonDigest(work.lease),
  );
  requireExecution(
    canonicalJsonDigest(intake.work_item) === work.binding.work_item_digest &&
      (intake.native_session_handle === work.lease.thread_id || successorBound),
    'admitted local session work item or thread differs',
  );
  return { identity, workItem: intake.work_item, work, sourceFileRoot };
}

/** Reconstruct a fresh opaque kernel capability only for actual capability consumers. */
export async function openAdmittedSessionExecution(
  repositoryRoot: string,
  store: HostStateStore,
  projectId: string,
  workId: string,
) {
  const { identity, workItem, work, sourceFileRoot } = readAdmittedSessionExecutionContext(
    repositoryRoot,
    store,
    projectId,
    workId,
  );
  const runtimeSource = () => {
    assertAdmittedRuntimeCodeCurrent(repositoryRoot, store, identity);
    return { sourceRevision: work.binding.runtime_code_digest, currentRevision: 1 };
  };
  const composition = await createTrustedLocalSessionComposition({
    repositoryRoot,
    repositoryId: work.binding.repository_id,
    projectIds: work.binding.project_ids,
    nativeSessionHandle: work.lease!.thread_id,
    admittedWork: { workId, store },
    services: {
      governanceCapability: store.governanceCapability,
      resolveWorkflowWorkItem: (requestedId) => {
        requireExecution(requestedId === workId, 'local session requested foreign work');
        return workItem;
      },
      resolveWorkExecutionContext: (request) => {
        requireExecution(request.workItem.id === workId, 'local session requested foreign work');
        const current = store.readHostStateSnapshot(identity);
        const leased = current.work?.lease;
        const ticket = current.ledger?.tickets.find((item) => item.ticket_id === leased?.ticket_id);
        requireExecution(
          current.work && leased && ticket && ticket.expires_at,
          'local session lease or ticket is unavailable',
        );
        return {
          schema: 'WorkExecutionContext/v1' as const,
          binding: current.work.binding,
          permit: {
            context_digest: canonicalJsonDigest(current.work.binding),
            checkpoint_revision: current.workVersion!.revision,
            checkpoint_digest: current.workVersion!.digest,
            runtime_current_revision: 1,
            stage_id: request.stageId,
            assignment_index: request.assignmentIndex,
            dispatch_authorized: true,
            lease: {
              thread_id: leased.thread_id,
              ticket_id: leased.ticket_id,
              generation: leased.generation,
              ledger_revision: current.ledgerVersion!.revision,
              expires_at: ticket.expires_at,
              active_resources: ticket.active_resources,
              blocked_resources: ticket.blocked_resources,
            },
          },
        };
      },
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: runtimeSource,
      casWriter: () => {
        throw new Error('native session writes require observed assignment results');
      },
      dispatchWorkflowAssignment: () => {
        throw new Error('native session tools are only available in the active caller session');
      },
      validateWorkflowAssignmentResult: (_invocation, result) => {
        requireExecution(
          result !== null &&
            typeof result === 'object' &&
            (result as { status?: unknown }).status === 'reported_complete',
          'native session result is not a successful observation',
        );
      },
    },
  });
  requireExecution(
    composition.workflowExecutionCapability !== null,
    'admitted local session workflow capability is unavailable',
  );
  return { composition, workItem, identity, sourceFileRoot };
}
