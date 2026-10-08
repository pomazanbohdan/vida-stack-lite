import { createHash } from 'node:crypto';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from '../config/runtime-config.js';
import { loadProjectSetContext } from '../config/project-context.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { HostStateStore, WorkIdentity } from '../host-state.js';
import { createTrustedLocalSessionComposition, requireLiveLocalSessionAdmission } from '../runtime-kernel.js';
import { snapshotRuntimePackageSources } from './scoped-source-snapshot.js';
import { resolveTaskSourceFileRoot } from './task-source-binding.js';
import { validateConfiguredFrontierReceiptStructure, type ConfiguredFrontierReceipt } from './delivered-work-continuation-repair.js';

function requireExecution(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Read the one bound current-v1 intake; historical ownership cleanup grants no executable freshness. */
export function readAdmittedSessionIntake(
  repositoryRoot: string,
  store: HostStateStore,
  identity: WorkIdentity,
): { work_item: unknown; runtime_code_paths: string[]; native_session_handle: string } {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const work = store.readHostStateSnapshot(identity).work;
  requireExecution(work, 'admitted local session work is unavailable');
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
      intake.native_session_handle.length > 0,
    'admitted local session intake identity differs',
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
  const work = store.readHostStateSnapshot(identity).work!;
  const config = loadRuntimeConfig(repositoryRoot);
  const currentPaths = runtimePackageCodePaths(config.runtime.bundle);
  let runtimePaths: readonly string[] = intake.runtime_code_paths;
  if (canonicalJsonDigest(runtimePaths) !== canonicalJsonDigest(currentPaths)) {
    const journal = store.readWorkSessionJournal(identity),
      receipt = journal && store.readDeliveredWorkContinuationReceipt(identity, journal.attempt);
    requireExecution(receipt?.request.action.kind === 'configured_frontier' &&
      receipt.request.sourceTransition.status === 'closed_config_rebind_proven' &&
      receipt.historical_capture === null && receipt.frontier_snapshot !== undefined,
    'admitted runtime inventory differs; qualified runtime repair/rebind is required');
    validateConfiguredFrontierReceiptStructure({ receipt: receipt as ConfiguredFrontierReceipt });
    const request = receipt.request, transition = request.sourceTransition.transition,
      intakeRef = work.artifacts.find(ref => ref.artifact_id === 'local-session-intake' && ref.schema === 'VidaLocalSessionIntake/v1'),
      project = loadProjectSetContext(repositoryRoot, config, identity.repository_id, identity.project_ids),
      schemaDigest = createHash('sha256').update(runtimePackageAccess().readBytes('schemas/agent-runtime-config.v1.schema.json', 'current runtime schema')).digest('hex');
    requireExecution(intakeRef && 'original_intake_ref' in transition && transition.original_intake_ref === intakeRef.path &&
      transition.original_intake_sha256 === intakeRef.sha256 && request.nativeSessionHandle === intake.native_session_handle &&
      receipt.prior_work.execution.run_id === work.execution.run_id &&
      receipt.prior_work.binding.runtime_code_digest === request.priorRuntimeCodeDigest &&
      receipt.prior_work.binding.config_digest === request.priorConfigDigest &&
      request.targetRuntimeCodeDigest === work.binding.runtime_code_digest &&
      request.targetConfigDigest === runtimeConfigDigest(config) && request.targetConfigDigest === work.binding.config_digest &&
      request.targetSchemaDigest === schemaDigest && request.targetSchemaDigest === work.binding.schema_digest &&
      request.targetProjectContextDigest === project.project_context_digest,
    'admitted runtime continuation does not bind the protected intake and current endpoint');
    runtimePaths = currentPaths;
  }
  const current = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    config.runtime.bundle,
    runtimePaths,
  );
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
  const currentProjectContext = loadProjectSetContext(repositoryRoot, config, work.binding.repository_id, work.binding.project_ids);
  requireExecution(
    work.binding.config_digest === runtimeConfigDigest(config) &&
      work.binding.repository_id === config.repository.repository_id &&
      work.binding.project_ids.length === 1 &&
      work.binding.integrations_digest ===
        currentProjectContext.integrations_digest,
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
  const { identity, workItem, work, sourceFileRoot } = readAdmittedSessionExecutionContext(repositoryRoot, store, projectId, workId);
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
