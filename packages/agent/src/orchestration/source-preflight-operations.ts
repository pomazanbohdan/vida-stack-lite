import { createHash } from 'node:crypto';
import path from 'node:path';
import { validateProjectContext } from '../config/project-context.js';
import { loadRuntimeConfig, runtimeConfigDigest, type WorkItemSelection } from '../config/runtime-config.js';
import type { TrustedProjectIdentity } from '../contracts/public-ingress.js';
import { canonicalJson, canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { ProjectContext } from '../config/project-context.js';
import type { ProjectAuthorizationResult } from '../authorization/cedar-boundary.js';
import type { WorkflowEvaluation } from '@edictum/core';
import type { WorkflowHostCapability } from '../governance/edictum-boundary.js';
import { HostStateStore } from '../host-state.js';
import type {
  CanonicalHostSourceWriteApproval,
  HostStateSnapshot,
  StateVersion,
  WorkIdentity,
  WorkflowAttemptApprovalRequest,
  WorkState,
} from '../host-state.js';
import {
  createRuntimeKernelSourcePreflightPolicySession,
  type RuntimeKernelSourcePreflightPolicySession,
} from '../runtime-kernel.js';
import {
  requiresSourcePrewriterSecurityReview,
  validateSourceWritePreflight,
  type SourceWritePreflightInput,
} from './source-preflight.js';
import { buildAdmittedDevelopmentPacket } from './admitted-development-packet.js';
import { readAdmittedSessionExecutionContext } from './admitted-session-execution.js';
import type { LocalWorkAdmissionInput } from './local-work-admission.js';
import { lifecyclePreparationObservationSchema } from './final-assurance.js';
import { observedReceiptEvidenceReference, validateObservedEvidenceReferences } from './observed-receipt-evidence.js';
import type { LocalSourceWriteAuthorization } from './local-source-authorization.js';
import type { LifecycleArtifactReference } from '../lifecycle/lifecycle-state.js';
import type { MastraLedgerItem, MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { parseSessionBridgeObservation, type SessionBridgeObservation } from './mastra-session-bridge.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { transitionLifecycleState } from '../lifecycle/lifecycle-state.js';

type PolicyDerivedInput =
  | 'authorization'
  | 'edictumOperation'
  | 'edictumEvaluation'
  | 'hostApprovalPrincipal'
  | 'hostApproval';

type SourcePolicyCommonInput = Omit<SourceWritePreflightInput, PolicyDerivedInput | 'request'>;

/** Current evidence supplied by the trusted local Host/session composition. */
export interface SourceWritePreflightContext extends SourcePolicyCommonInput {
  readonly workflowHostCapability: WorkflowHostCapability;
  /** Re-read Host, journal and source inputs after asynchronous policy evaluation. */
  readonly assertCurrent: () => void | Promise<void>;
}

export type SourceWritePreflightContextResolver = (
  request: WorkflowAttemptApprovalRequest,
  hostSnapshot: HostStateSnapshot,
) => SourceWritePreflightContext | null | Promise<SourceWritePreflightContext | null>;

export interface SourceWritePreflightApprovalInput {
  readonly repositoryRoot: string;
  readonly context: SourceWritePreflightContext;
  readonly request: WorkflowAttemptApprovalRequest;
  readonly hostApprovalPrincipal: string;
  readonly hostApproval: CanonicalHostSourceWriteApproval;
}

/** Host-computed request for the separately prepared task-source Git mutation. */
export interface TaskSourceMutationPolicyRequest {
  readonly schema: 'TaskSourceMutationPolicyRequest/v1';
  readonly action: 'source.write';
  readonly operation_id: string;
  readonly request_id: string;
  readonly operation_hash: string;
  readonly work_id: string;
  readonly thread_id: string;
  readonly scope_digest: string;
  readonly config_digest: string;
  readonly lease: NonNullable<WorkState['lease']>;
  readonly branch_ref: string;
  readonly source_root: string;
  readonly proposed_argv: readonly string[];
  readonly prepared_record_cas: { readonly operation_id: string; readonly state_version: StateVersion };
}

/** Stable projection of the exact operation payload read from HostState. */
export interface TaskSourcePreparedOperationBinding {
  readonly operation_id: string;
  readonly request_id: string;
  readonly operation_hash: string;
  readonly work_id: string;
  readonly thread_id: string;
  readonly scope_digest: string;
  readonly config_digest: string;
  readonly lease: NonNullable<WorkState['lease']>;
  readonly branch_ref: string;
  readonly source_root: string;
  readonly proposed_argv: readonly string[];
}

/** Trusted current Host/session inputs for task-source mutation policy evaluation. */
export interface TaskSourceMutationPolicyContext extends SourcePolicyCommonInput {
  readonly repositoryRoot: string;
  readonly taskSourceRequest: TaskSourceMutationPolicyRequest;
  readonly preparedOperation: TaskSourcePreparedOperationBinding;
  readonly preparedStateVersion: StateVersion;
  readonly sourceAuthorizationReference: LifecycleArtifactReference;
  readonly sourceAuthorization: LocalSourceWriteAuthorization;
  readonly workflowHostCapability: WorkflowHostCapability;
  readonly assertCurrent: () => void | Promise<void>;
}

/** Decision evidence only. Host owns its single approval/CAS consumption and marker. */
export interface TaskSourceMutationPolicyDecision {
  readonly operation_id: string;
  readonly request_id: string;
  readonly operation_hash: string;
  readonly prepared_record_cas: TaskSourceMutationPolicyRequest['prepared_record_cas'];
  readonly authorization: ProjectAuthorizationResult;
  readonly edictum_operation: { readonly operation_hash: string; readonly tenant: string; readonly project: string };
  readonly edictum_evaluation: WorkflowEvaluation;
  readonly source_authorization_reference: LifecycleArtifactReference;
  readonly source_authorization_sha256: string;
  readonly preflight_evidence_digest: string;
}

function requireCurrent(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('source write preflight: ' + message);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

interface ConfiguredSourcePrewriter {
  readonly stageId: 'review_source_prewrite';
  readonly plannerAssignmentIndex: number;
  readonly securityAssignmentIndex: number;
  readonly developerStageId: string;
}

function configuredSourcePrewriter(
  config: ReturnType<typeof loadRuntimeConfig>,
  teamId: string,
  workflowId: string,
): ConfiguredSourcePrewriter | null {
  const workflow = config.workflows[workflowId];
  const team = config.teams[teamId];
  const matches = workflow?.stages.filter((stage) => stage.id === 'review_source_prewrite') ?? [];
  const stage = matches.length === 1 ? matches[0] : undefined;
  const planners = stage?.assignments.flatMap((assignment, assignmentIndex) =>
    assignment.role === 'source-planner' && assignment.profile === 'architect'
      ? [{ assignment, assignmentIndex }]
      : [],
  ) ?? [];
  const reviewers = stage?.assignments.flatMap((assignment, assignmentIndex) =>
    assignment.role === 'security-prewriter' && assignment.profile === 'reviewer-security'
      ? [{ assignment, assignmentIndex }]
      : [],
  ) ?? [];
  const planner = planners.length === 1 ? planners[0] : undefined;
  const reviewer = reviewers.length === 1 ? reviewers[0] : undefined;
  const plannerProfile = planner && config.agents.profiles[planner.assignment.profile];
  const plannerPolicy = plannerProfile && config.agents.tool_policies[plannerProfile.tools_policy];
  const reviewerProfile = reviewer && config.agents.profiles[reviewer.assignment.profile];
  const reviewerPolicy = reviewerProfile && config.agents.tool_policies[reviewerProfile.tools_policy];
  const developers = workflow?.stages.filter((candidate) => candidate.kind === 'develop') ?? [];
  const writerAssignments = developers.flatMap((developer) => developer.assignments.filter((assignment) => {
    const profile = config.agents.profiles[assignment.profile];
    const policy = profile && config.agents.tool_policies[profile.tools_policy];
    return profile?.mutation_scope === 'repository_source' && policy?.source_write === true;
  }));
  const securityRiskFlags = ['security', 'data_loss', 'migration', 'high'];
  if (
    !stage || matches.length !== 1 || !team || team.enabled !== true || stage.kind !== 'validate' || stage.mode !== 'parallel' ||
    canonicalJsonDigest(stage.required_after) !== canonicalJsonDigest(['synthesize_task']) ||
    stage.assignments.length !== 2 || planners.length !== 1 || reviewers.length !== 1 ||
    (stage.risk_flags ?? []).length !== 0 || planner!.assignment.risk_flags?.length ||
    canonicalJsonDigest([...(reviewer!.assignment.risk_flags ?? [])].sort()) !== canonicalJsonDigest([...securityRiskFlags].sort()) ||
    canonicalJsonDigest(stage.consumes) !== canonicalJsonDigest(['DevelopmentTaskPacket/v1']) ||
    canonicalJsonDigest(stage.produces) !== canonicalJsonDigest(['LifecyclePreparationObservation/v1']) ||
    (team.stage_overrides[stage.id] ?? team.roles['source-planner']) !== planner!.assignment.profile ||
    (team.stage_overrides[stage.id] ?? team.roles['security-prewriter']) !== reviewer!.assignment.profile ||
    plannerProfile?.mutation_scope !== 'none' || plannerPolicy?.source_write !== false ||
    reviewerProfile?.mutation_scope !== 'none' || reviewerPolicy?.source_write !== false ||
    developers.length !== 1 || writerAssignments.length === 0 ||
    !developers[0]!.assignments.every((assignment) =>
      (team.stage_overrides[developers[0]!.id] ?? team.roles[assignment.role]) === assignment.profile,
    ) ||
    canonicalJsonDigest(developers[0]!.required_after) !== canonicalJsonDigest([stage.id])
  ) return null;
  return {
    stageId: 'review_source_prewrite',
    plannerAssignmentIndex: planner!.assignmentIndex,
    securityAssignmentIndex: reviewer!.assignmentIndex,
    developerStageId: developers[0]!.id,
  };
}

/**
 * Attach the configured read-only prewriter's accepted report as the current
 * Host implementation-policy prerequisite. The journal record is authoritative
 * for the observed report; this derived lifecycle artifact adds a receipt URI
 * only after that report has a persisted digest, avoiding a self-referential
 * report hash.
 */
function attachObservedImplementationPolicyPreparation(input: {
  readonly repositoryRoot: string;
  readonly hostState: HostStateStore;
  readonly workId: string;
  readonly attempt: number;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly observation: SessionBridgeObservation;
}): HostStateSnapshot {
  requireCurrent(
    input !== null && typeof input === 'object' &&
      exactKeys(input as unknown as Record<string, unknown>, [
        'repositoryRoot', 'hostState', 'workId', 'attempt', 'journal', 'observation',
      ]) && path.isAbsolute(input.repositoryRoot) && path.resolve(input.repositoryRoot) === input.repositoryRoot &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.workId) &&
      Number.isSafeInteger(input.attempt) && input.attempt > 0 &&
      HostStateStore.isHostStateStore(input.hostState),
    'prewriter attachment input is invalid',
  );
  const journal = input.journal;
  requireCurrent(
    journal !== null && typeof journal === 'object' &&
      journal.state?.schema === 'MastraSessionLedger/v1' &&
      journal.state.work_id === input.workId && journal.state.attempt === input.attempt &&
      Number.isSafeInteger(journal.version?.revision) && journal.version.revision > 0 &&
      /^[a-f0-9]{64}$/.test(journal.version.digest) &&
      canonicalJsonDigest(journal.state) === journal.version.digest,
    'prewriter attachment journal is stale or invalid',
  );
  const observation = parseSessionBridgeObservation(input.observation);
  requireCurrent(
    observation.status === 'reported_complete' &&
      observation.output_digest === canonicalJsonDigest(observation.summary),
    'prewriter attachment requires an accepted complete observation',
  );

  const workspace = input.hostState.readWorkspaceSnapshot();
  const ownerRows = workspace.work.filter((entry) => entry.work?.binding.lifecycle_work_id === input.workId);
  requireCurrent(ownerRows.length === 1, 'prewriter attachment requires one current Host Work');
  const owner = ownerRows[0]!.work!;
  const identity: WorkIdentity = {
    repository_id: owner.binding.repository_id,
    project_ids: [...owner.binding.project_ids],
    integrations_digest: owner.binding.integrations_digest,
    work_id: owner.binding.lifecycle_work_id,
  };
  const host = input.hostState.readHostStateSnapshot(identity);
  const work = host.work;
  requireCurrent(
    work && host.ledger && host.workVersion && host.ledgerVersion &&
      canonicalJsonDigest(work) === canonicalJsonDigest(owner) &&
      work.binding.lifecycle_work_id === input.workId &&
      work.execution.status === 'active' && work.execution.run_id === journal.state.run_id &&
      work.lifecycle.phase === 'PLAN' && work.lease !== null &&
      work.lifecycle.assurance.correction_count === 0 &&
      work.binding.config_digest === runtimeConfigDigest(loadRuntimeConfig(input.repositoryRoot)) &&
      work.lifecycle.config_binding.config_digest === work.binding.config_digest,
    'prewriter attachment Host owner, phase, risk or configuration differs',
  );
  requireCurrent(
    journal.state.workspace_id === work.workspace_id && journal.state.work_id === work.binding.lifecycle_work_id &&
      journal.state.run_id === work.execution.run_id && journal.state.attempt === input.attempt,
    'prewriter attachment journal differs from current Host execution',
  );

  const access = requireSafeRepositoryAccess(input.repositoryRoot);
  const scopeBytes = access.readBytes(work.contracts.scope.path, 'prewriter attachment current scope');
  requireCurrent(
    sha256(scopeBytes) === work.contracts.scope.sha256 &&
      work.contracts.scope.sha256 === work.binding.scope_contract_digest,
    'prewriter attachment scope bytes differ from Host',
  );
  const scope = parseJsonRecord(scopeBytes, 'current implementation scope');
  requireCurrent(
    scope.schema === 'ImplementationScope/v1' && scope.work_id === input.workId &&
      scope.source_revision === work.binding.work_source_revision && scope.scope_id === work.binding.scope_id &&
      canonicalJsonDigest(scope.ac_ids) === canonicalJsonDigest(work.binding.ac_ids) &&
      record(scope.attribution) && scope.attribution.thread_id === work.lease.thread_id,
    'prewriter attachment scope or owning thread differs from Host',
  );

  const config = loadRuntimeConfig(input.repositoryRoot);
  const projectId = work.binding.project_ids.length === 1 ? work.binding.project_ids[0]! : null;
  requireCurrent(projectId !== null, 'prewriter attachment requires one admitted project');
  const admitted = readAdmittedSessionExecutionContext(
    input.repositoryRoot,
    input.hostState,
    projectId,
    input.workId,
  );
  requireCurrent(
    canonicalJsonDigest(admitted.identity) === canonicalJsonDigest(identity) &&
      canonicalJsonDigest(admitted.work) === canonicalJsonDigest(work),
    'prewriter attachment admitted Host state changed',
  );
  const workItem = admitted.workItem as LocalWorkAdmissionInput['workItem'];
  requireCurrent(
    workItem?.schema === 'WorkItem/v1' && workItem.id === input.workId &&
      canonicalJsonDigest(workItem) === work.binding.work_item_digest,
    'prewriter attachment admitted work item differs from Host',
  );
  const selection: WorkItemSelection = {
    team: work.binding.team_id,
    kind: workItem.canonical_kind as WorkItemSelection['kind'],
    intent: workItem.intent as WorkItemSelection['intent'],
    project: workItem.project_id,
    risk_flags: [...workItem.risk_flags],
    labels: [...workItem.labels],
  };
  const acceptanceBytes = access.readBytes(work.contracts.acceptance.path, 'prewriter attachment current acceptance');
  const taskPacket = buildAdmittedDevelopmentPacket({
    repositoryRoot: input.repositoryRoot,
    config,
    host,
    sourceStore: input.hostState,
    ledger: journal,
    workItem,
    selection,
    scopeBytes,
    acceptanceBytes,
    configuredContext: null,
  });
  requireCurrent(
    taskPacket.work_item_id === input.workId && taskPacket.attempt === input.attempt &&
      taskPacket.workflow_id === work.binding.workflow_id &&
      requiresSourcePrewriterSecurityReview(work.lifecycle.risk, taskPacket.risk_flags),
    'prewriter attachment is not applicable to the current lifecycle risk or admitted packet flags',
  );
  const workflow = config.workflows[work.binding.workflow_id];
  const team = config.teams[work.binding.team_id];
  const workflowStages = workflow?.stages ?? [];
  const prewriterMatches = workflowStages.filter((stage) => stage.id === 'review_source_prewrite');
  const prewriter = prewriterMatches.length === 1 ? prewriterMatches[0] : undefined;
  const securityAssignments = prewriter?.assignments.flatMap((assignment, assignmentIndex) =>
    assignment.role === 'security-prewriter' && assignment.profile === 'reviewer-security'
      ? [{ assignment, assignmentIndex }]
      : [],
  ) ?? [];
  const prewriterAssignment = securityAssignments.length === 1 ? securityAssignments[0]!.assignment : undefined;
  const prewriterAssignmentIndex = securityAssignments.length === 1 ? securityAssignments[0]!.assignmentIndex : -1;
  const plannerAssignments = prewriter?.assignments.filter(
    (assignment) => assignment.role === 'source-planner' && assignment.profile === 'architect',
  ) ?? [];
  const prewriterProfile = prewriterAssignment && config.agents.profiles[prewriterAssignment.profile];
  const prewriterPolicy = prewriterProfile && config.agents.tool_policies[prewriterProfile.tools_policy];
  const developers = workflowStages.filter((stage) => stage.kind === 'develop');
  const highRiskFlags = ['security', 'data_loss', 'migration', 'high'];
  requireCurrent(
    prewriter && prewriterAssignment && prewriterMatches.length === 1 &&
      prewriter.kind === 'validate' && prewriter.mode === 'parallel' &&
      canonicalJsonDigest(prewriter.required_after) === canonicalJsonDigest(['synthesize_task']) &&
      prewriter.assignments.length === 2 && plannerAssignments.length === 1 &&
      !plannerAssignments[0]!.risk_flags?.length &&
      canonicalJsonDigest(prewriter.consumes) === canonicalJsonDigest(['DevelopmentTaskPacket/v1']) &&
      canonicalJsonDigest(prewriter.produces) === canonicalJsonDigest(['LifecyclePreparationObservation/v1']) &&
      (prewriter.risk_flags ?? []).length === 0 &&
      canonicalJsonDigest([...(prewriterAssignment.risk_flags ?? [])].sort()) === canonicalJsonDigest([...highRiskFlags].sort()) &&
      team?.enabled === true &&
      (team.stage_overrides[prewriter.id] ?? team.roles['security-prewriter']) === prewriterAssignment.profile &&
      (team.stage_overrides[prewriter.id] ?? team.roles['source-planner']) === plannerAssignments[0]!.profile &&
      config.agents.profiles.architect?.mutation_scope === 'none' &&
      config.agents.profiles.architect?.tools_policy === 'read_only' &&
      prewriterProfile?.mutation_scope === 'none' && prewriterPolicy?.source_write === false &&
      developers.length === 1 && canonicalJsonDigest(developers[0]!.required_after) === canonicalJsonDigest(['review_source_prewrite']),
    'current configured read-only prewriter does not gate the Source writer',
  );

  const journalItems = [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items];
  const matches = journalItems.filter((item) => item.request.action_id === observation.action_id);
  requireCurrent(matches.length === 1, 'prewriter attachment action is missing or ambiguous in the journal');
  const item = matches[0]!;
  requireCurrent(
      item.issue_id !== null && item.observation !== null && !item.host_reservation &&
      item.issue_id === observation.issue_id && canonicalJsonDigest(item.observation) === canonicalJsonDigest(observation) &&
      item.request.run_id === journal.state.run_id && item.request.workflow_id === work.binding.workflow_id &&
      item.request.stage_id === 'review_source_prewrite' && item.request.assignment_index === prewriterAssignmentIndex &&
      item.request.role === 'security-prewriter' && item.request.config_digest === work.binding.config_digest &&
      item.request.scope_digest === work.binding.work_source_revision &&
      !work.execution.assignment_attempts.some((attempt) => attempt.stage_id === developers[0]!.id),
    'prewriter attachment report is not the current configured read-only action',
  );

  let sourceRecord: ReturnType<typeof lifecyclePreparationObservationSchema.parse>;
  try {
    sourceRecord = lifecyclePreparationObservationSchema.parse(JSON.parse(observation.summary));
  } catch {
    throw new Error('source write preflight: accepted prewriter report is not a LifecyclePreparationObservation/v1');
  }
  requireCurrent(
    sourceRecord.kind === 'implementation_policy' && sourceRecord.work_id === input.workId &&
      sourceRecord.attempt === input.attempt && sourceRecord.source_revision === work.binding.work_source_revision &&
      sourceRecord.scope_id === work.binding.scope_id && sourceRecord.config_digest === work.binding.config_digest &&
      canonicalJsonDigest(sourceRecord.ac_ids) === canonicalJsonDigest(work.binding.ac_ids) &&
      sourceRecord.observer_id === observation.agent_id &&
      (sourceRecord.status === 'pass' ? sourceRecord.gaps.length === 0 : sourceRecord.gaps.length > 0),
    'prewriter preparation report is stale, foreign or inconsistent',
  );
  validateObservedEvidenceReferences(sourceRecord.evidence_refs);
  validateObservedEvidenceReferences(observation.evidence_refs);
  requireCurrent(
    sourceRecord.observations.every((entry) => sourceRecord.evidence_refs.includes(entry.evidence_ref)) &&
      new Set(sourceRecord.observations.map((entry) => entry.mechanic)).size === sourceRecord.observations.length,
    'prewriter preparation evidence or mechanics are ambiguous',
  );
  const gateObservations = sourceRecord.observations.filter((entry) => entry.mechanic === 'prewriter_security_gate');
  requireCurrent(
    gateObservations.length <= 1 &&
      (sourceRecord.status !== 'pass' || (
        sourceRecord.observations.some((entry) => entry.mechanic === 'root_cause_owner') &&
        sourceRecord.observations.some((entry) => entry.mechanic === 'affected_callers') &&
        sourceRecord.observations.some((entry) => entry.mechanic === 'existing_primitives') &&
        gateObservations.length === 1 && gateObservations[0]!.actual.trim().length > 0
      )),
    'prewriter preparation is missing or duplicates a required mechanic',
  );
  const receiptReference = observedReceiptEvidenceReference(journal, item.request.action_id, observation.output_digest);
  const derivedRecord = {
    ...sourceRecord,
    record_id: 'prewriter-' + item.request.action_id,
    evidence_refs: sourceRecord.evidence_refs.includes(receiptReference)
      ? [...sourceRecord.evidence_refs]
      : [...sourceRecord.evidence_refs, receiptReference],
    observations: sourceRecord.observations.map((entry) =>
      entry.mechanic === 'prewriter_security_gate' ? { ...entry, evidence_ref: receiptReference } : entry,
    ),
  };
  const derivedBytes = Buffer.from(canonicalJson(derivedRecord) + '\n');
  const relativePath = path.posix.join(
    config.control.work_root,
    input.workId,
    'preparations',
    `implementation-policy-prewriter-${item.request.action_id}.v1.json`,
  );
  const reference: LifecycleArtifactReference = {
    schema: 'LifecycleArtifactReference/v1',
    kind: 'implementation_policy',
    artifact_schema: 'LifecyclePreparationObservation/v1',
    record_id: derivedRecord.record_id,
    path: relativePath,
    sha256: sha256(derivedBytes),
    source_revision: work.binding.work_source_revision,
    scope_id: work.binding.scope_id,
    ac_ids: [...work.binding.ac_ids],
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: null,
    decision: null,
    disposition: 'current',
  };
  const currentPolicyRefs = work.lifecycle.references.filter(
    (candidate) => candidate.kind === 'implementation_policy' && candidate.disposition === 'current',
  );
  if (currentPolicyRefs.length) {
    requireCurrent(
      currentPolicyRefs.length === 1 && canonicalJsonDigest(currentPolicyRefs[0]) === canonicalJsonDigest(reference) &&
        access.fileExists(relativePath, 'prewriter preparation retry') &&
        access.readBytes(relativePath, 'prewriter preparation retry').equals(derivedBytes),
      'current implementation policy preparation belongs to a different observation',
    );
    return host;
  }
  requireCurrent(work.lifecycle.phase === 'PLAN', 'prewriter preparation attachment is outside PLAN');
  access.ensureDirectory(path.posix.dirname(relativePath), 'prewriter preparation directory');
  if (access.fileExists(relativePath, 'prewriter preparation retry'))
    requireCurrent(
      access.readBytes(relativePath, 'prewriter preparation retry').equals(derivedBytes),
      'prewriter preparation retry bytes differ',
    );
  else access.writeExclusive(relativePath, derivedBytes.toString('utf8'), 'prewriter preparation');
  const nextWork: WorkState = {
    ...work,
    revision: work.revision + 1,
    lifecycle: {
      ...work.lifecycle,
      revision: work.lifecycle.revision + 1,
      references: [...work.lifecycle.references, reference],
    },
  };
  return input.hostState.compareAndSwapHostState({
    expectedWork: host.workVersion,
    expectedLedger: host.ledgerVersion,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    expectedSessionJournal: { attempt: input.attempt, version: journal.version },
    nextWork,
    nextLedger: { ...host.ledger, revision: host.ledger.revision + 1 },
  });
}

function readAcceptedPrewriterObservation(
  journal: MastraSessionLedgerSnapshot,
  work: WorkState,
  assignmentIndex: number,
  role: 'source-planner' | 'security-prewriter',
): { readonly item: MastraLedgerItem; readonly observation: SessionBridgeObservation } | undefined {
  const items = [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items].filter(
    (item) => item.request.stage_id === 'review_source_prewrite' && item.request.assignment_index === assignmentIndex &&
      item.request.role === role && item.request.run_id === journal.state.run_id &&
      item.request.workflow_id === work.binding.workflow_id && item.request.config_digest === work.binding.config_digest &&
      item.request.scope_digest === work.binding.work_source_revision,
  );
  requireCurrent(items.length <= 1, 'configured prewriter assignment has multiple persisted observations');
  const item = items[0];
  if (!item || item.issue_id === null || !item.observation || item.host_reservation) return undefined;
  const observation = parseSessionBridgeObservation(item.observation);
  if (
    observation.status !== 'reported_complete' || observation.action_id !== item.request.action_id ||
    observation.issue_id !== item.issue_id || observation.output_digest !== canonicalJsonDigest(observation.summary)
  ) return undefined;
  return { item, observation };
}

function preparationFromPrewriterObservation(input: {
  readonly config: ReturnType<typeof loadRuntimeConfig>;
  readonly work: WorkState;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly item: MastraLedgerItem;
  readonly observation: SessionBridgeObservation;
  readonly kind: 'source_plan' | 'implementation_policy';
}): { readonly record: ReturnType<typeof lifecyclePreparationObservationSchema.parse>; readonly bytes: Uint8Array; readonly reference: LifecycleArtifactReference } {
  let sourceRecord: ReturnType<typeof lifecyclePreparationObservationSchema.parse>;
  try {
    sourceRecord = lifecyclePreparationObservationSchema.parse(JSON.parse(input.observation.summary));
  } catch {
    throw new Error('source write preflight: accepted prewriter report is not a LifecyclePreparationObservation/v1');
  }
  const { work, item, observation, kind } = input;
  requireCurrent(
    sourceRecord.kind === kind && sourceRecord.work_id === work.binding.lifecycle_work_id &&
      sourceRecord.attempt === input.journal.state.attempt && sourceRecord.source_revision === work.binding.work_source_revision &&
      sourceRecord.scope_id === work.binding.scope_id && sourceRecord.config_digest === work.binding.config_digest &&
      canonicalJsonDigest(sourceRecord.ac_ids) === canonicalJsonDigest(work.binding.ac_ids) &&
      sourceRecord.observer_id === observation.agent_id &&
      (sourceRecord.status === 'pass' ? sourceRecord.gaps.length === 0 : sourceRecord.gaps.length > 0),
    'prewriter preparation report is stale, foreign or inconsistent',
  );
  validateObservedEvidenceReferences(sourceRecord.evidence_refs);
  requireCurrent(
    sourceRecord.observations.every((entry) => sourceRecord.evidence_refs.includes(entry.evidence_ref)) &&
      new Set(sourceRecord.observations.map((entry) => entry.mechanic)).size === sourceRecord.observations.length,
    'prewriter preparation evidence or mechanics are ambiguous',
  );
  const requiredMechanics = kind === 'source_plan'
    ? ['scope_acceptance_trace', 'verification_rollback']
    : ['root_cause_owner', 'affected_callers', 'existing_primitives'];
  if (sourceRecord.status === 'pass')
    requireCurrent(
      requiredMechanics.every((mechanic) =>
        sourceRecord.observations.filter((entry) => entry.mechanic === mechanic && entry.actual.trim().length > 0).length === 1,
      ),
      'prewriter preparation is missing a required current observation',
    );
  const receiptReference = observedReceiptEvidenceReference(input.journal, item.request.action_id, observation.output_digest);
  const record = kind === 'implementation_policy'
    ? {
        ...sourceRecord,
        record_id: 'prewriter-' + item.request.action_id,
        evidence_refs: sourceRecord.evidence_refs.includes(receiptReference)
          ? [...sourceRecord.evidence_refs]
          : [...sourceRecord.evidence_refs, receiptReference],
        observations: sourceRecord.observations.map((entry) =>
          entry.mechanic === 'prewriter_security_gate' ? { ...entry, evidence_ref: receiptReference } : entry,
        ),
      }
    : {
        ...sourceRecord,
        record_id: 'source-plan-' + item.request.action_id,
        evidence_refs: sourceRecord.evidence_refs.includes(receiptReference)
          ? [...sourceRecord.evidence_refs]
          : [...sourceRecord.evidence_refs, receiptReference],
      };
  const bytes = Buffer.from(canonicalJson(record) + '\n');
  const reference: LifecycleArtifactReference = {
    schema: 'LifecycleArtifactReference/v1',
    kind,
    artifact_schema: 'LifecyclePreparationObservation/v1',
    record_id: record.record_id,
    path: path.posix.join(
      input.config.control.work_root,
      work.binding.lifecycle_work_id,
      'preparations',
      `${kind === 'source_plan' ? 'source-plan' : 'implementation-policy-prewriter'}-${item.request.action_id}.v1.json`,
    ),
    sha256: sha256(bytes),
    source_revision: work.binding.work_source_revision,
    scope_id: work.binding.scope_id,
    ac_ids: [...work.binding.ac_ids],
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: null,
    decision: null,
    disposition: 'current',
  };
  return { record, bytes, reference };
}

function attachPreparationArtifact(input: {
  readonly hostState: HostStateStore;
  readonly host: HostStateSnapshot;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly attempt: number;
  readonly access: ReturnType<typeof requireSafeRepositoryAccess>;
  readonly artifact: ReturnType<typeof preparationFromPrewriterObservation>;
  readonly expectedPhase: 'TRACE' | 'PLAN';
}): HostStateSnapshot {
  const work = input.host.work;
  const ledger = input.host.ledger;
  requireCurrent(
    work && ledger && input.host.workVersion && input.host.ledgerVersion &&
      work.lifecycle.phase === input.expectedPhase,
    'prewriter preparation attachment phase or Host state changed',
  );
  const existing = work.lifecycle.references.filter(
    (reference) => reference.kind === input.artifact.reference.kind && reference.disposition === 'current',
  );
  if (existing.length) {
    requireCurrent(
      existing.length === 1 && canonicalJsonDigest(existing[0]) === canonicalJsonDigest(input.artifact.reference) &&
        input.access.fileExists(input.artifact.reference.path, 'prewriter preparation retry') &&
        input.access.readBytes(input.artifact.reference.path, 'prewriter preparation retry').equals(input.artifact.bytes),
      'current prewriter preparation belongs to a different accepted observation',
    );
    return input.host;
  }
  input.access.ensureDirectory(path.posix.dirname(input.artifact.reference.path), 'prewriter preparation directory');
  if (input.access.fileExists(input.artifact.reference.path, 'prewriter preparation retry'))
    requireCurrent(
      input.access.readBytes(input.artifact.reference.path, 'prewriter preparation retry').equals(input.artifact.bytes),
      'prewriter preparation retry bytes differ',
    );
  else input.access.writeExclusive(input.artifact.reference.path, input.artifact.bytes.toString('utf8'), 'prewriter preparation');
  const nextWork: WorkState = {
    ...work,
    revision: work.revision + 1,
    lifecycle: {
      ...work.lifecycle,
      revision: work.lifecycle.revision + 1,
      references: [...work.lifecycle.references, input.artifact.reference],
    },
  };
  return input.hostState.compareAndSwapHostState({
    expectedWork: input.host.workVersion,
    expectedLedger: input.host.ledgerVersion,
    expectedMaintenanceGeneration: input.host.maintenanceGeneration,
    expectedSessionJournal: { attempt: input.attempt, version: input.journal.version },
    nextWork,
    nextLedger: { ...ledger, revision: ledger.revision + 1 },
  });
}

function transitionObservedLifecycle(input: {
  readonly hostState: HostStateStore;
  readonly host: HostStateSnapshot;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly attempt: number;
  readonly target: 'TRACE' | 'PLAN';
}): HostStateSnapshot {
  const work = input.host.work;
  const ledger = input.host.ledger;
  requireCurrent(
    work && ledger && input.host.workVersion && input.host.ledgerVersion,
    'prewriter lifecycle transition lacks a fresh Host snapshot',
  );
  const nextWork = transitionLifecycleState(
    work,
    input.target,
    input.target === 'TRACE'
      ? 'Trace the accepted source plan against the current scope and acceptance.'
      : 'Complete planning with the accepted source plan before Source execution.',
  );
  return input.hostState.compareAndSwapHostState({
    expectedWork: input.host.workVersion,
    expectedLedger: input.host.ledgerVersion,
    expectedMaintenanceGeneration: input.host.maintenanceGeneration,
    expectedSessionJournal: { attempt: input.attempt, version: input.journal.version },
    nextWork,
    nextLedger: { ...ledger, revision: ledger.revision + 1 },
  });
}

/**
 * Attach accepted `review_source_prewrite` observations in canonical lifecycle order.
 * The planner report is appended in TRACE and moves the Work to PLAN only when it
 * passes; the security report remains journal-only until PLAN and is attached only
 * for the configured high-risk assignment. Rescanning persisted items makes reverse
 * report order and exact retries converge on the same Host state.
 */
export function attachObservedSourcePreparation(input: {
  readonly repositoryRoot: string;
  readonly hostState: HostStateStore;
  readonly workId: string;
  readonly attempt: number;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly observation: SessionBridgeObservation;
}): HostStateSnapshot {
  requireCurrent(
    input !== null && typeof input === 'object' &&
      exactKeys(input as unknown as Record<string, unknown>, [
        'repositoryRoot', 'hostState', 'workId', 'attempt', 'journal', 'observation',
      ]) && path.isAbsolute(input.repositoryRoot) && path.resolve(input.repositoryRoot) === input.repositoryRoot &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.workId) &&
      Number.isSafeInteger(input.attempt) && input.attempt > 0 &&
      HostStateStore.isHostStateStore(input.hostState),
    'prewriter attachment input is invalid',
  );
  const journal = input.journal;
  requireCurrent(
    journal?.state?.schema === 'MastraSessionLedger/v1' && journal.state.work_id === input.workId &&
      journal.state.attempt === input.attempt && Number.isSafeInteger(journal.version?.revision) &&
      journal.version.revision > 0 && /^[a-f0-9]{64}$/.test(journal.version.digest) &&
      canonicalJsonDigest(journal.state) === journal.version.digest,
    'prewriter attachment journal is stale or invalid',
  );
  const suppliedObservation = parseSessionBridgeObservation(input.observation);
  requireCurrent(
    suppliedObservation.status === 'reported_complete' &&
      suppliedObservation.output_digest === canonicalJsonDigest(suppliedObservation.summary),
    'prewriter attachment requires an accepted complete observation',
  );
  const workspace = input.hostState.readWorkspaceSnapshot();
  const ownerRows = workspace.work.filter((entry) => entry.work?.binding.lifecycle_work_id === input.workId);
  requireCurrent(ownerRows.length === 1, 'prewriter attachment requires one current Host Work');
  const owner = ownerRows[0]!.work!;
  const identity: WorkIdentity = {
    repository_id: owner.binding.repository_id,
    project_ids: [...owner.binding.project_ids],
    integrations_digest: owner.binding.integrations_digest,
    work_id: owner.binding.lifecycle_work_id,
  };
  let host = input.hostState.readHostStateSnapshot(identity);
  let work = host.work;
  requireCurrent(
    work && host.ledger && host.workVersion && host.ledgerVersion &&
      canonicalJsonDigest(work) === canonicalJsonDigest(owner) &&
      work.binding.lifecycle_work_id === input.workId && work.execution.status === 'active' &&
      work.execution.run_id === journal.state.run_id && work.lease !== null &&
      work.lifecycle.assurance.correction_count === 0 &&
      work.binding.config_digest === runtimeConfigDigest(loadRuntimeConfig(input.repositoryRoot)) &&
      work.lifecycle.config_binding.config_digest === work.binding.config_digest,
    'prewriter attachment Host owner, phase or configuration differs',
  );
  requireCurrent(
    journal.state.workspace_id === work.workspace_id && journal.state.work_id === work.binding.lifecycle_work_id &&
      journal.state.run_id === work.execution.run_id,
    'prewriter attachment journal differs from current Host execution',
  );
  const config = loadRuntimeConfig(input.repositoryRoot);
  const route = configuredSourcePrewriter(config, work.binding.team_id, work.binding.workflow_id);
  requireCurrent(route !== null, 'current workflow lacks the configured read-only source planner/security prewriter');
  const journalItems = [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items];
  const suppliedItems = journalItems.filter((item) => item.request.action_id === suppliedObservation.action_id);
  requireCurrent(
    suppliedItems.length === 1 && suppliedItems[0]!.observation !== null &&
      suppliedItems[0]!.observation !== undefined &&
      suppliedItems[0]!.issue_id === suppliedObservation.issue_id &&
      canonicalJsonDigest(suppliedItems[0]!.observation) === canonicalJsonDigest(suppliedObservation),
    'prewriter attachment observation is not the exact persisted journal result',
  );
  const planner = readAcceptedPrewriterObservation(journal, work, route.plannerAssignmentIndex, 'source-planner');
  const reviewer = readAcceptedPrewriterObservation(journal, work, route.securityAssignmentIndex, 'security-prewriter');
  requireCurrent(
    (planner && planner.item.request.action_id === suppliedObservation.action_id) ||
      (reviewer && reviewer.item.request.action_id === suppliedObservation.action_id),
    'accepted observation is not from the configured source planner or security prewriter',
  );
  const access = requireSafeRepositoryAccess(input.repositoryRoot);
  if (planner) {
    const planArtifact = preparationFromPrewriterObservation({
      config,
      work,
      journal,
      item: planner.item,
      observation: planner.observation,
      kind: 'source_plan',
    });
    if (work.lifecycle.phase === 'INTAKE') {
      host = transitionObservedLifecycle({
        hostState: input.hostState,
        host,
        journal,
        attempt: input.attempt,
        target: 'TRACE',
      });
      work = host.work!;
    }
    if (work.lifecycle.phase === 'TRACE') {
      host = attachPreparationArtifact({
        hostState: input.hostState,
        host,
        journal,
        attempt: input.attempt,
        access,
        artifact: planArtifact,
        expectedPhase: 'TRACE',
      });
      work = host.work!;
      if (planArtifact.record.status === 'pass') {
        host = transitionObservedLifecycle({
          hostState: input.hostState,
          host,
          journal,
          attempt: input.attempt,
          target: 'PLAN',
        });
        work = host.work!;
      }
    }
  }

  if (work.lifecycle.phase === 'PLAN') {
    const currentPlans = work.lifecycle.references.filter(
      (reference) => reference.kind === 'source_plan' && reference.disposition === 'current',
    );
    requireCurrent(currentPlans.length === 1, 'current Source plan is required before policy attachment');
    const planBytes = access.readBytes(currentPlans[0]!.path, 'current source plan');
    requireCurrent(
      sha256(planBytes) === currentPlans[0]!.sha256,
      'current Source plan bytes differ from Host state',
    );
    const currentPlan = lifecyclePreparationObservationSchema.parse(JSON.parse(planBytes.toString('utf8')));
    if (currentPlan.status === 'pass' && reviewer)
      host = attachObservedImplementationPolicyPreparation({ ...input, observation: reviewer.observation });
  }
  return host;
}

/** Backward-compatible name for callers that only had the high-risk review hook. */
export function attachObservedPrewriterPreparation(input: {
  readonly repositoryRoot: string;
  readonly hostState: HostStateStore;
  readonly workId: string;
  readonly attempt: number;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly observation: SessionBridgeObservation;
}): HostStateSnapshot {
  return attachObservedSourcePreparation(input);
}

function currentReadEvidence(context: SourcePolicyCommonInput, operationBinding: unknown): Record<string, unknown> {
  const snapshot = context.hostSnapshot;
  return {
    schema: 'SourceWritePreflightEvidence/v1',
    operation_binding: operationBinding,
    host_work_revision: snapshot.workVersion?.revision ?? null,
    host_work_digest: snapshot.workVersion?.digest ?? null,
    host_ledger_revision: snapshot.ledgerVersion?.revision ?? null,
    host_ledger_digest: snapshot.ledgerVersion?.digest ?? null,
    journal_revision: context.journal.version.revision,
    journal_digest: context.journal.version.digest,
    config_digest: runtimeConfigDigest(context.config),
    project_context_digest: context.projectContext.project_context_digest,
    task_packet_digest: context.taskPacket.digest,
    scope_digest: sha256(context.scopeBytes),
    acceptance_digest: sha256(context.acceptanceBytes),
    preparations: context.preparations
      .map(({ reference, bytes }) => ({ kind: reference.kind, record_id: reference.record_id, sha256: sha256(bytes) }))
      .sort((left, right) => `${left.kind}:${left.record_id}`.localeCompare(`${right.kind}:${right.record_id}`)),
  };
}

function exactContext(
  root: string,
  configDigest: string,
  repositoryId: string,
  projectIds: readonly string[],
  context: SourcePolicyCommonInput,
  policy: RuntimeKernelSourcePreflightPolicySession,
): ProjectContext {
  requireCurrent(
    runtimeConfigDigest(policy.config) === configDigest &&
      runtimeConfigDigest(context.config) === configDigest,
    'current runtime configuration differs from the pending Host operation',
  );
  const current = validateProjectContext(context.projectContext, root);
  requireCurrent(
    current.repository_id === repositoryId &&
      canonicalJsonDigest(current.project_ids) === canonicalJsonDigest(projectIds) &&
      current.config_digest === runtimeConfigDigest(policy.config),
    'current ProjectContext differs from the Host repository binding',
  );
  return current;
}

interface ActualSourcePolicyDecision {
  readonly authorization: ProjectAuthorizationResult;
  readonly edictumOperation: { readonly operation_hash: string; readonly tenant: string; readonly project: string };
  readonly edictumEvaluation: WorkflowEvaluation;
  readonly preflightEvidenceDigest: string;
}

async function evaluateConfiguredSourcePolicy(input: {
  readonly repositoryRoot: string;
  readonly operation: { readonly operation_hash: string; readonly config_digest: string };
  readonly repositoryId: string;
  readonly projectIds: readonly string[];
  readonly sessionId: string;
  readonly context: SourcePolicyCommonInput & {
    readonly workflowHostCapability: WorkflowHostCapability;
    readonly assertCurrent: () => void | Promise<void>;
  };
  readonly operationBinding: unknown;
}): Promise<ActualSourcePolicyDecision> {
  const { repositoryRoot, operation, repositoryId, projectIds, sessionId, context, operationBinding } = input;
  await context.assertCurrent();
  const policy = createRuntimeKernelSourcePreflightPolicySession(
    repositoryRoot,
    operation.config_digest,
    sessionId,
    context.workflowHostCapability,
  );
  const projectContext = exactContext(repositoryRoot, operation.config_digest, repositoryId, projectIds, context, policy);
  const identity: TrustedProjectIdentity = context.trustedIdentity;
  const edictumOperation = Object.freeze({
    operation_hash: operation.operation_hash,
    tenant: identity.tenant,
    project: identity.project,
  });
  const authorization: ProjectAuthorizationResult = policy.authorizeProject(
    {
      principal: identity.principal,
      role: identity.role,
      action: 'write',
      tenant: identity.tenant,
      project: identity.project,
      resourceTenant: identity.tenant,
      resourceProject: identity.project,
      registryHash: projectContext.registry_hash,
      operationHash: operation.operation_hash,
    },
    identity,
    projectContext,
  );
  requireCurrent(
    authorization.decision === 'allow' && authorization.receipt?.decision === 'allow',
    'configured Cedar policy denied Source write',
  );

  const stages = policy.config.governance.edictum.workflow.stages;
  const gateIndex = stages.findIndex(
    (stage, index) => stage.approval_required === true && stages[index + 1]?.tools.includes('runtime.write'),
  );
  const predecessor = stages[gateIndex - 1];
  requireCurrent(
    gateIndex === 1 &&
      predecessor !== undefined &&
      predecessor.approval_required === false &&
      predecessor.tools.length === 1 &&
      predecessor.tools[0] === 'runtime.read',
    'configured Edictum approval gate has no supported current read-evidence predecessor',
  );

  const readEvidence = currentReadEvidence(context, operationBinding);
  const edictumReadArguments = Object.freeze({
    operation_hash: operation.operation_hash,
    tenant: identity.tenant,
    project: identity.project,
    evidence_digest: canonicalJsonDigest(readEvidence),
  });
  const readEvaluation = await policy.workflow.evaluate('runtime.read', edictumReadArguments);
  requireCurrent(
    readEvaluation.action === 'allow' && readEvaluation.stageId === predecessor.id,
    'configured Edictum current-read stage did not allow the observed evidence',
  );
  await policy.workflow.recordResult(predecessor.id, 'runtime.read', edictumReadArguments, readEvidence);
  const edictumEvaluation = await policy.workflow.evaluate('runtime.write', edictumOperation);
  const edictumState = await policy.workflow.state();
  requireCurrent(
    edictumState.completedStages.includes(predecessor.id) &&
      edictumState.evidence.mcpResults['runtime.read']?.some(
        (result) => canonicalJsonDigest(result) === canonicalJsonDigest(readEvidence),
      ) === true,
    'configured Edictum did not retain the observed predecessor evidence',
  );
  requireCurrent(
    edictumEvaluation.action === 'pending_approval' &&
      edictumState.pendingApproval.required === true &&
      edictumState.pendingApproval.stageId === edictumEvaluation.stageId,
    'configured Edictum did not reach its pending Source-write approval gate',
  );
  await context.assertCurrent();
  policy.assertCurrent();
  return {
    authorization,
    edictumOperation,
    edictumEvaluation,
    preflightEvidenceDigest: canonicalJsonDigest(readEvidence),
  };
}

/**
 * Runs the configured Cedar decision and the real configured Edictum workflow
 * before Host reserves a Source attempt. The Host's scoped human permission is
 * validated separately and remains the only approval consumption path.
 */
export async function produceSourceWritePreflightApproval(
  input: SourceWritePreflightApprovalInput,
): Promise<void> {
  const { repositoryRoot, context, request, hostApprovalPrincipal, hostApproval } = input;
  const { authorization, edictumOperation, edictumEvaluation } = await evaluateConfiguredSourcePolicy({
    repositoryRoot,
    operation: request,
    repositoryId: request.identity.repository_id,
    projectIds: request.identity.project_ids,
    sessionId: context.journal.state.run_id,
    context,
    operationBinding: request,
  });

  const {
    workflowHostCapability: _workflowHostCapability,
    assertCurrent: _assertCurrent,
    ...preflight
  } = context;
  validateSourceWritePreflight({
    ...preflight,
    request,
    authorization,
    edictumOperation,
    edictumEvaluation,
    hostApprovalPrincipal,
    hostApproval,
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function parseJsonRecord(bytes: Uint8Array, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(bytes).toString('utf8'));
  } catch {
    throw new Error('source write preflight: ' + label + ' is not valid JSON');
  }
  requireCurrent(record(value), `${label} is not an object`);
  return value;
}

function journalEvidence(
  journal: MastraSessionLedgerSnapshot,
  work: NonNullable<HostStateSnapshot['work']>,
): ReadonlyMap<string, MastraLedgerItem> {
  const items = [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items];
  const evidence = new Map<string, MastraLedgerItem>();
  for (const item of items) {
    const observation = item.observation;
    if (
      item.issue_id === null ||
      !observation ||
      observation.status !== 'reported_complete' ||
      observation.action_id !== item.request.action_id ||
      observation.issue_id !== item.issue_id ||
      item.request.run_id !== journal.state.run_id ||
      item.request.workflow_id !== work.binding.workflow_id ||
      item.request.config_digest !== work.binding.config_digest ||
      item.request.scope_digest !== work.binding.work_source_revision
    ) continue;
    try {
      const reference = observedReceiptEvidenceReference(journal, item.request.action_id, observation.output_digest);
      evidence.set(reference, item);
    } catch {
      // Invalid or ambiguous observations cannot satisfy a preparation reference.
    }
  }
  return evidence;
}

function securityReviewers(
  config: SourceWritePreflightContext['config'],
  workflowId: string,
): readonly { readonly stageId: string; readonly assignmentIndex: number; readonly role: string }[] {
  const workflow = config.workflows[workflowId];
  if (!workflow) return [];
  const result: { stageId: string; assignmentIndex: number; role: string }[] = [];
  for (const stage of workflow.stages) {
    if (stage.kind !== 'validate') continue;
    stage.assignments.forEach((assignment, assignmentIndex) => {
      const profile = config.agents.profiles[assignment.profile];
      const policy = profile && config.agents.tool_policies[profile.tools_policy];
      if (
        (assignment.contour === 'security_data' || /security/i.test(assignment.role)) &&
        profile?.mutation_scope === 'none' &&
        policy?.source_write === false
      ) result.push({ stageId: stage.id, assignmentIndex, role: assignment.role });
    });
  }
  return result;
}

function validateTaskSourcePlanAndSecurity(context: TaskSourceMutationPolicyContext): void {
  const work = context.hostSnapshot.work;
  requireCurrent(work?.lease, 'active Host Work and current lease are required');
  const binding = work.binding;
  const { journal, taskPacket, config } = context;
  requireCurrent(
    journal.state.schema === 'MastraSessionLedger/v1' &&
      journal.state.workspace_id === work.workspace_id &&
      journal.state.work_id === binding.lifecycle_work_id &&
      journal.state.run_id === work.execution.run_id &&
      Number.isSafeInteger(journal.state.attempt) &&
      journal.state.attempt > 0 &&
      Number.isSafeInteger(journal.version.revision) &&
      journal.version.revision > 0 &&
      journal.version.digest === canonicalJsonDigest(journal.state) &&
      ['ready', 'ready_to_resume'].includes(journal.resume_status) &&
      [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items].every(
        (item) => item.issue_id === null || item.observation !== null,
      ),
    'same-thread journal is stale, foreign, uncertain, or not ready',
  );

  const scopeHash = sha256(context.scopeBytes);
  const acceptanceHash = sha256(context.acceptanceBytes);
  requireCurrent(
    scopeHash === work.contracts.scope.sha256 &&
      scopeHash === binding.scope_contract_digest &&
      acceptanceHash === work.contracts.acceptance.sha256 &&
      acceptanceHash === binding.acceptance_manifest_digest,
    'scope or acceptance bytes differ from current admitted contracts',
  );
  const scope = parseJsonRecord(context.scopeBytes, 'scope contract');
  const acceptance = parseJsonRecord(context.acceptanceBytes, 'acceptance contract');
  requireCurrent(
    scope.schema === 'ImplementationScope/v1' &&
      scope.scope_id === binding.scope_id &&
      scope.work_id === binding.lifecycle_work_id &&
      scope.source_revision === binding.work_source_revision &&
      canonicalJsonDigest(scope.ac_ids) === canonicalJsonDigest(binding.ac_ids) &&
      canonicalJsonDigest(scope.allowed_paths) === canonicalJsonDigest(work.lifecycle.scope.allowed_paths) &&
      canonicalJsonDigest(scope.implementation_paths) === canonicalJsonDigest(binding.implementation_paths) &&
      record(scope.attribution) &&
      scope.attribution.thread_id === work.lease.thread_id &&
      acceptance.schema === 'AcceptanceManifest/v1' &&
      acceptance.scope === binding.scope_id &&
      acceptance.source_revision === binding.work_source_revision &&
      canonicalJsonDigest(acceptance.ac_ids) === canonicalJsonDigest(binding.ac_ids),
    'scope or acceptance contract binding differs from Host state',
  );

  const unsignedPacket = { ...taskPacket } as Record<string, unknown>;
  delete unsignedPacket.digest;
  const acceptanceContracts = Array.isArray(acceptance.contracts)
    ? (acceptance.contracts as readonly { id: string; definition: string }[])
    : [];
  requireCurrent(
    taskPacket.schema === 'DevelopmentTaskPacket/v1' &&
      taskPacket.work_item_id === binding.lifecycle_work_id &&
      taskPacket.attempt === journal.state.attempt &&
      taskPacket.workflow_id === binding.workflow_id &&
      taskPacket.source_revision === binding.work_source_revision &&
      taskPacket.digest === canonicalJsonDigest(unsignedPacket) &&
      canonicalJsonDigest(taskPacket.in_scope) === canonicalJsonDigest(binding.implementation_paths) &&
      canonicalJsonDigest(taskPacket.owned_paths) === canonicalJsonDigest(scope.allowed_paths) &&
      canonicalJsonDigest(taskPacket.acceptance) ===
        canonicalJsonDigest(acceptanceContracts.map((contract) => `${contract.id}: ${contract.definition}`)) &&
      Number.isFinite(Date.parse(taskPacket.lease_expires_at)) &&
      Date.parse(taskPacket.lease_expires_at) > Date.now(),
    'development task packet is stale or differs from admitted scope',
  );

  const kinds = lifecyclePreparationObservationSchema.shape.kind.options;
  const currentReferences = work.lifecycle.references.filter(
    (reference) =>
      kinds.includes(reference.kind as (typeof kinds)[number]) &&
      reference.artifact_schema === 'LifecyclePreparationObservation/v1' &&
      reference.disposition === 'current',
  );
  requireCurrent(context.preparations.length === currentReferences.length, 'current preparation set is incomplete');
  const journalItems = journalEvidence(journal, work);
  const records = new Map<string, ReturnType<typeof lifecyclePreparationObservationSchema.parse>>();
  const mechanics: Readonly<Record<string, readonly string[]>> = {
    source_plan: ['scope_acceptance_trace', 'verification_rollback'],
    platform_knowledge: ['platform_contracts', 'official_reference_lookup'],
    implementation_policy: ['root_cause_owner', 'affected_callers', 'existing_primitives'],
    change_impact_pre: ['affected_paths', 'invalidation', 'rollback'],
    documentation_validation: ['current_inventory', 'current_clear'],
  };
  for (const item of context.preparations) {
    const reference = item.reference;
    requireCurrent(
      reference.schema === 'LifecycleArtifactReference/v1' &&
        kinds.includes(reference.kind as (typeof kinds)[number]) &&
        reference.artifact_schema === 'LifecyclePreparationObservation/v1' &&
        reference.disposition === 'current' &&
        reference.source_revision === binding.work_source_revision &&
        reference.scope_id === binding.scope_id &&
        canonicalJsonDigest(reference.ac_ids) === canonicalJsonDigest(binding.ac_ids) &&
        sha256(item.bytes) === reference.sha256 &&
        currentReferences.some((current) => canonicalJsonDigest(current) === canonicalJsonDigest(reference)),
      'preparation reference is not current or its bytes changed',
    );
    let prepared: ReturnType<typeof lifecyclePreparationObservationSchema.parse>;
    try {
      prepared = lifecyclePreparationObservationSchema.parse(JSON.parse(Buffer.from(item.bytes).toString('utf8')));
    } catch {
      throw new Error('source write preflight: lifecycle preparation record is invalid');
    }
    requireCurrent(
      prepared.kind === reference.kind &&
        prepared.record_id === reference.record_id &&
        prepared.work_id === binding.lifecycle_work_id &&
        prepared.attempt === journal.state.attempt &&
        prepared.source_revision === binding.work_source_revision &&
        prepared.scope_id === binding.scope_id &&
        prepared.config_digest === binding.config_digest &&
        canonicalJsonDigest(prepared.ac_ids) === canonicalJsonDigest(binding.ac_ids) &&
        prepared.status === 'pass' &&
        prepared.gaps.length === 0 &&
        (mechanics[prepared.kind] ?? []).every((mechanic) =>
          prepared.observations.some((observation) => observation.mechanic === mechanic),
        ),
      'lifecycle preparation is stale, foreign, has a GAP, or lacks required observations',
    );
    validateObservedEvidenceReferences(prepared.evidence_refs);
    requireCurrent(
      prepared.observations.every((observation) => prepared.evidence_refs.includes(observation.evidence_ref)),
      'preparation observation is missing its evidence reference',
    );
    for (const referenceValue of prepared.evidence_refs) {
      if (referenceValue.startsWith('artifact://session-observation/'))
        requireCurrent(journalItems.has(referenceValue), 'preparation cites a journal observation that is not current');
    }
    requireCurrent(!records.has(prepared.kind), 'lifecycle preparation set has duplicate kinds');
    records.set(prepared.kind, prepared);
  }
  requireCurrent(records.has('source_plan'), 'task-source mutation requires a current source plan');

  if (
    requiresSourcePrewriterSecurityReview(work.lifecycle.risk, taskPacket.risk_flags)
  ) {
    const security = records.get('implementation_policy')?.observations.filter(
      (observation) => observation.mechanic === 'prewriter_security_gate' && observation.actual.trim().length > 0,
    ) ?? [];
    const reviewers = securityReviewers(config, binding.workflow_id);
    const evidence = security[0] && journalItems.get(security[0].evidence_ref);
    requireCurrent(
      records.has('implementation_policy') && security.length === 1 &&
        evidence !== undefined &&
        reviewers.some(
          (reviewer) =>
            evidence.request.workflow_id === binding.workflow_id &&
            evidence.request.stage_id === reviewer.stageId &&
            evidence.request.assignment_index === reviewer.assignmentIndex &&
            evidence.request.role === reviewer.role,
        ),
      'high-risk task-source mutation requires a current configured prewriter security observation',
    );
  }
}

function validateTaskSourceMutationBinding(
  input: {
    readonly repositoryRoot: string;
    readonly request: TaskSourceMutationPolicyRequest;
    readonly context: TaskSourceMutationPolicyContext;
  },
): string {
  const { repositoryRoot, request, context } = input;
  const requestKeys = [
    'schema', 'action', 'operation_id', 'request_id', 'operation_hash', 'work_id', 'thread_id', 'scope_digest',
    'config_digest', 'lease', 'branch_ref', 'source_root', 'proposed_argv', 'prepared_record_cas',
  ];
  requireCurrent(record(request) && exactKeys(request as unknown as Record<string, unknown>, requestKeys),
    'task-source policy request has unexpected fields');
  requireCurrent(
    request.schema === 'TaskSourceMutationPolicyRequest/v1' &&
      request.action === 'source.write' &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(request.operation_id) &&
      /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(request.request_id) &&
      /^[a-f0-9]{64}$/.test(request.operation_hash) &&
      typeof request.work_id === 'string' && request.work_id.length > 0 &&
      typeof request.thread_id === 'string' && request.thread_id.length > 0 &&
      /^[a-f0-9]{64}$/.test(request.scope_digest) &&
      /^[a-f0-9]{64}$/.test(request.config_digest) &&
      typeof request.branch_ref === 'string' && request.branch_ref.startsWith('refs/heads/') &&
      typeof request.source_root === 'string' && path.isAbsolute(request.source_root) && path.resolve(request.source_root) === request.source_root &&
      Array.isArray(request.proposed_argv) && request.proposed_argv.length > 0 &&
      request.proposed_argv.every((argument) => typeof argument === 'string' && argument.length > 0),
    'task-source policy request is invalid',
  );
  requireCurrent(
    exactKeys(request.prepared_record_cas as unknown as Record<string, unknown>, ['operation_id', 'state_version']) &&
      request.prepared_record_cas.operation_id === request.operation_id &&
      exactKeys(request.prepared_record_cas.state_version as unknown as Record<string, unknown>, ['digest', 'revision']) &&
      Number.isSafeInteger(request.prepared_record_cas.state_version.revision) &&
      request.prepared_record_cas.state_version.revision > 0 &&
      /^[a-f0-9]{64}$/.test(request.prepared_record_cas.state_version.digest),
    'task-source prepared-record CAS is invalid',
  );
  requireCurrent(
    context.repositoryRoot === repositoryRoot &&
      repositoryRoot === context.repositoryRoot &&
      canonicalJsonDigest(context.taskSourceRequest) === canonicalJsonDigest(request),
    'task-source policy request differs from the trusted Host operation',
  );
  const work = context.hostSnapshot.work;
  const ledger = context.hostSnapshot.ledger;
  const workVersion = context.hostSnapshot.workVersion;
  const ledgerVersion = context.hostSnapshot.ledgerVersion;
  requireCurrent(
    work && ledger && workVersion && ledgerVersion &&
      workVersion.revision === work.revision && workVersion.digest === canonicalJsonDigest(work) &&
      ledgerVersion.revision === ledger.revision && ledgerVersion.digest === canonicalJsonDigest(ledger) &&
      ledger.workspace_id === work.workspace_id &&
      context.hostSnapshot.maintenanceGeneration >= 0 &&
      work.execution.status === 'active' && work.lease !== null &&
      work.binding.lifecycle_work_id === request.work_id &&
      work.lease.thread_id === request.thread_id &&
      canonicalJsonDigest(work.lease) === canonicalJsonDigest(request.lease) &&
      work.binding.work_source_revision === request.scope_digest &&
      work.binding.config_digest === request.config_digest &&
      context.config.repository.repository_id === work.binding.repository_id &&
      runtimeConfigDigest(context.config) === request.config_digest &&
      context.projectContext.repository_id === work.binding.repository_id &&
      canonicalJsonDigest(context.projectContext.project_ids) === canonicalJsonDigest(work.binding.project_ids) &&
      context.projectContext.integrations_digest === work.binding.integrations_digest &&
      context.projectContext.config_digest === request.config_digest &&
      context.trustedIdentity.schema === 'TrustedProjectIdentity/v1' &&
      context.trustedIdentity.source === 'authenticated-context' &&
      context.trustedIdentity.tenant === work.binding.repository_id &&
      context.trustedIdentity.registry_hash === context.projectContext.registry_hash &&
      context.projectContext.project_ids.includes(context.trustedIdentity.project),
    'task-source operation differs from current trusted Host state, scope or identity',
  );
  const prepared = context.preparedOperation;
  const preparedBinding = {
    schema: request.schema,
    action: request.action,
    operation_id: prepared.operation_id,
    request_id: prepared.request_id,
    operation_hash: prepared.operation_hash,
    work_id: prepared.work_id,
    thread_id: prepared.thread_id,
    scope_digest: prepared.scope_digest,
    config_digest: prepared.config_digest,
    lease: prepared.lease,
    branch_ref: prepared.branch_ref,
    source_root: prepared.source_root,
    proposed_argv: prepared.proposed_argv,
  };
  const requestBinding = { ...request } as Record<string, unknown>;
  delete requestBinding.prepared_record_cas;
  requireCurrent(
    canonicalJsonDigest(preparedBinding) === canonicalJsonDigest(requestBinding) &&
      canonicalJsonDigest(context.preparedStateVersion) === canonicalJsonDigest(request.prepared_record_cas.state_version),
    'task-source policy request differs from the current prepared operation or CAS',
  );
  const reference = context.sourceAuthorizationReference;
  const authorization = context.sourceAuthorization;
  const assignedSourceWriter = (stageId: string): boolean => {
    const stage = context.config.workflows[work.binding.workflow_id]?.stages.find((candidate) => candidate.id === stageId);
    return stage?.assignments.some(
      (assignment) => context.config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
    ) === true;
  };
  requireCurrent(
    reference.kind === 'execution_approval' &&
      reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      reference.disposition === 'current' &&
      reference.decision === 'approved' &&
      reference.scope_id === work.binding.scope_id &&
      reference.source_revision === work.binding.work_source_revision &&
      work.lifecycle.references.some((current) => canonicalJsonDigest(current) === canonicalJsonDigest(reference)) &&
      authorization.schema === 'LocalSourceWriteAuthorization/v1' &&
      authorization.action === 'source.write' &&
      authorization.user_instruction_ref === reference.record_id &&
      authorization.work_id === request.work_id &&
      authorization.attempt === context.journal.state.attempt &&
      authorization.scope_digest === request.scope_digest &&
      authorization.config_digest === request.config_digest &&
      authorization.workflow_id === work.binding.workflow_id &&
      authorization.native_session_handle === request.thread_id &&
      authorization.stage_ids.length > 0 && authorization.stage_ids.every(assignedSourceWriter) &&
      canonicalJsonDigest([...authorization.implementation_paths].sort()) ===
        canonicalJsonDigest([...work.binding.implementation_paths].sort()) &&
      reference.principal === 'local-session:' + canonicalJsonDigest(authorization.native_session_handle),
    'current scoped human Source permission does not authorize this task-source operation',
  );
  validateTaskSourcePlanAndSecurity(context);
  return reference.sha256;
}

/**
 * Evaluate the exact Host-prepared task-source mutation with current Cedar and
 * Edictum policy plus scoped user permission and plan/security evidence. This
 * does not approve Edictum, consume Host authority, run Git, or create a marker.
 */
export async function evaluateTaskSourceMutationPolicy(input: {
  readonly repositoryRoot: string;
  readonly request: TaskSourceMutationPolicyRequest;
  readonly context: TaskSourceMutationPolicyContext;
}): Promise<TaskSourceMutationPolicyDecision> {
  const { repositoryRoot, request, context } = input;
  const requestDigest = canonicalJsonDigest(request);
  const sourceAuthorizationSha256 = validateTaskSourceMutationBinding({ repositoryRoot, request, context });
  const { authorization, edictumOperation, edictumEvaluation, preflightEvidenceDigest } =
    await evaluateConfiguredSourcePolicy({
      repositoryRoot,
      operation: request,
      repositoryId: context.hostSnapshot.work!.binding.repository_id,
      projectIds: context.hostSnapshot.work!.binding.project_ids,
      sessionId: context.journal.state.run_id,
      context,
      operationBinding: {
        request,
        prepared_operation: context.preparedOperation,
        prepared_state_version: context.preparedStateVersion,
        source_authorization_reference: context.sourceAuthorizationReference,
      },
    });
  await context.assertCurrent();
  requireCurrent(canonicalJsonDigest(request) === requestDigest, 'task-source policy request changed during evaluation');
  return Object.freeze({
    operation_id: request.operation_id,
    request_id: request.request_id,
    operation_hash: request.operation_hash,
    prepared_record_cas: Object.freeze({
      operation_id: request.prepared_record_cas.operation_id,
      state_version: Object.freeze({ ...request.prepared_record_cas.state_version }),
    }),
    authorization,
    edictum_operation: edictumOperation,
    edictum_evaluation: edictumEvaluation,
    source_authorization_reference: context.sourceAuthorizationReference,
    source_authorization_sha256: sourceAuthorizationSha256,
    preflight_evidence_digest: preflightEvidenceDigest,
  });
}
