import { createHash } from 'node:crypto';
import { canonicalJson, canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { TrustedProjectIdentity } from '../contracts/public-ingress.js';
import { runtimeConfigDigest } from '../config/runtime-config.js';
import type { AgentRuntimeConfig } from '../config/runtime-config.js';
import type { ProjectContext } from '../config/project-context.js';
import type { ProjectAuthorizationResult } from '../authorization/cedar-boundary.js';
import type { WorkflowEvaluation } from '@edictum/core';
import { computeEdictumWorkflowApprovalEvidenceDigest } from '../governance/edictum-boundary.js';
import type {
  CanonicalHostSourceWriteApproval,
  HostStateSnapshot,
  WorkIdentity,
  WorkflowAttemptApprovalRequest,
} from '../host-state.js';
import type { LifecycleArtifactReference } from '../lifecycle/lifecycle-state.js';
import type { DevelopmentTaskPacket } from './mastra-boundary.js';
import type { MastraLedgerItem, MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { observedReceiptEvidenceReference, validateObservedEvidenceReferences } from './observed-receipt-evidence.js';
import { lifecyclePreparationObservationSchema } from './final-assurance.js';
import { acceptedContractSourceRevision } from './admitted-development-packet.js';
import type { ConfiguredFrontierRecoveryView } from './failed-prewriter-transition.js';

const preparationKinds = lifecyclePreparationObservationSchema.shape.kind.options;
const sourcePrewriterSecurityRiskFlags = new Set(['security', 'data_loss', 'migration', 'high']);
type PreparationKind = (typeof preparationKinds)[number];
type LifecyclePreparationObservation = ReturnType<typeof lifecyclePreparationObservationSchema.parse>;

export function requiresSourcePrewriterSecurityReview(
  lifecycleRisk: string,
  packetRiskFlags: readonly string[],
): boolean {
  return lifecycleRisk === 'high' || packetRiskFlags.some((flag) => sourcePrewriterSecurityRiskFlags.has(flag));
}

export interface SourcePreflightArtifactInput {
  readonly reference: LifecycleArtifactReference;
  readonly bytes: Uint8Array;
}

export interface SourceWritePreflightInput {
  /** A fresh trusted HostState read. Do not construct or accept caller-supplied WorkState here. */
  readonly hostSnapshot: HostStateSnapshot;
  /** The trusted same-thread session journal snapshot. */
  readonly journal: MastraSessionLedgerSnapshot;
  /** The genuine Host-created pending Source request preview, before attempt reservation. */
  readonly request: WorkflowAttemptApprovalRequest;
  /** The exact current configuration used to derive the Host assignment and ProjectContext. */
  readonly config: AgentRuntimeConfig;
  readonly projectContext: ProjectContext;
  readonly trustedIdentity: TrustedProjectIdentity;
  /** Real Cedar and Edictum objects from the trusted integration; this validator never mints them. */
  readonly authorization: ProjectAuthorizationResult;
  /** Exact operation arguments supplied to the configured Edictum workflow evaluator. */
  readonly edictumOperation: {
    readonly operation_hash: string;
    readonly tenant: string;
    readonly project: string;
  };
  /** Actual configured Edictum `evaluate('runtime.write', edictumOperation)` result. */
  readonly edictumEvaluation: WorkflowEvaluation;
  /** Existing Host-local verifier identity and its canonical pre-reservation approval; no SDK approve call is made here. */
  readonly hostApprovalPrincipal: string;
  readonly hostApproval: CanonicalHostSourceWriteApproval | null;
  readonly taskPacket: DevelopmentTaskPacket;
  readonly scopeBytes: Uint8Array;
  readonly acceptanceBytes: Uint8Array;
  /** Trusted Host-owned continuation custody; absent for an ordinary current admission. */
  readonly continuation?: ConfiguredFrontierRecoveryView | null;
  /** Current preparation artifacts required by the Work lifecycle state and selected route. */
  readonly preparations: readonly SourcePreflightArtifactInput[];
}

function fail(message: string): never {
  throw new Error('source write preflight: ' + message);
}

function same(left: unknown, right: unknown): boolean {
  try {
    return canonicalJson(left) === canonicalJson(right);
  } catch {
    return false;
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function workIdentity(work: NonNullable<HostStateSnapshot['work']>): WorkIdentity {
  const binding = work.binding;
  return {
    repository_id: binding.repository_id,
    project_ids: [...binding.project_ids],
    integrations_digest: binding.integrations_digest,
    work_id: binding.lifecycle_work_id,
  };
}

function currentHostWork(snapshot: HostStateSnapshot): NonNullable<HostStateSnapshot['work']> {
  const { work, ledger, workVersion, ledgerVersion, maintenanceGeneration } = snapshot;
  if (!work || !ledger || !workVersion || !ledgerVersion)
    return fail('fresh Host work and coordination state are required');
  if (
    !Number.isSafeInteger(workVersion.revision) ||
    workVersion.revision !== work.revision ||
    !/^[a-f0-9]{64}$/.test(workVersion.digest) ||
    workVersion.digest !== canonicalJsonDigest(work) ||
    !Number.isSafeInteger(ledgerVersion.revision) ||
    ledgerVersion.revision !== ledger.revision ||
    !/^[a-f0-9]{64}$/.test(ledgerVersion.digest) ||
    ledgerVersion.digest !== canonicalJsonDigest(ledger) ||
    ledger.workspace_id !== work.workspace_id ||
    !Number.isSafeInteger(maintenanceGeneration) ||
    maintenanceGeneration < 0
  ) return fail('Host snapshot versions or workspace binding are stale');
  return work;
}

function currentWorkflowAssignment(
  config: AgentRuntimeConfig,
  request: WorkflowAttemptApprovalRequest,
): void {
  const workflow = config.workflows[request.workflow_id];
  const stage = workflow?.stages.find((candidate) => candidate.id === request.stage_id);
  const assignment = stage?.assignments[request.assignment_index];
  const profile = assignment && config.agents.profiles[assignment.profile];
  const policy = profile && config.agents.tool_policies[profile.tools_policy];
  if (
    !assignment ||
    typeof assignment.role !== 'string' ||
    assignment.role.length === 0 ||
    !profile ||
    !policy ||
    profile.mutation_scope !== 'repository_source' ||
    profile.egress_policy !== 'none' ||
    policy.source_write !== true
  ) fail('pending Host request is not a configured Source-writing assignment');
}

function verifyEdictumWriteGate(
  config: AgentRuntimeConfig,
  operation: SourceWritePreflightInput['edictumOperation'],
  evaluation: WorkflowEvaluation,
  request: WorkflowAttemptApprovalRequest,
  trustedIdentity: TrustedProjectIdentity,
): void {
  const stages = config.governance.edictum.workflow.stages;
  const gateIndex = stages.findIndex((stage) => stage.id === evaluation.stageId);
  const gate = stages[gateIndex];
  const writeStage = stages[gateIndex + 1];
  if (
    operation.operation_hash !== request.operation_hash ||
    operation.tenant !== trustedIdentity.tenant ||
    operation.project !== trustedIdentity.project ||
    evaluation.action !== 'pending_approval' ||
    typeof evaluation.reason !== 'string' ||
    !Array.isArray(evaluation.records) ||
    !Array.isArray(evaluation.events) ||
    !gate ||
    gate.approval_required !== true ||
    !writeStage?.tools.includes('runtime.write')
  ) fail('configured Edictum runtime.write evaluation is absent, denied, or bound to another gate');
}

function verifyPendingRequestPreview(
  work: NonNullable<HostStateSnapshot['work']>,
  request: WorkflowAttemptApprovalRequest,
): void {
  const identity = workIdentity(work);
  if (
    request.schema !== 'WorkflowAttemptApprovalRequest/v1' ||
    request.action !== 'source.write' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(request.store_id) ||
    !/^[a-f0-9]{64}$/.test(request.request_digest) ||
    !/^[a-f0-9]{64}$/.test(request.assignment_id) ||
    !/^[a-f0-9]{64}$/.test(request.attempt_id) ||
    !/^[a-f0-9]{64}$/.test(request.operation_hash) ||
    !Number.isSafeInteger(request.assignment_index) ||
    request.assignment_index < 0 ||
    !same(request.identity, identity) ||
    request.config_digest !== work.binding.config_digest ||
    request.workflow_id !== work.binding.workflow_id ||
    !work.lease ||
    !same(request.lease, work.lease) ||
    request.lease.thread_id !== work.lease.thread_id
  ) fail('pending Host request differs from current work or lease');

  const prior = work.execution.assignment_attempts
    .filter((item) => item.stage_id === request.stage_id && item.assignment_index === request.assignment_index)
    .at(-1);
  const fields = {
    store_id: request.store_id,
    action: request.action,
    identity: request.identity,
    config_digest: request.config_digest,
    workflow_id: request.workflow_id,
    stage_id: request.stage_id,
    assignment_id: request.assignment_id,
    assignment_index: request.assignment_index,
    request_digest: request.request_digest,
    attempt_id: request.attempt_id,
    lease: request.lease,
  };
  const expectedAttemptId = canonicalJsonDigest({
    assignment_id: request.assignment_id,
    request_digest: request.request_digest,
    lease: request.lease,
    previous_attempt_id: prior?.attempt_id ?? null,
  });
  if (work.lifecycle.assurance.correction_count === 0) {
    const expectedAssignmentId = canonicalJsonDigest({
      binding: work.binding,
      run_id: work.execution.run_id,
      input_digest: work.execution.input_digest,
      stage_id: request.stage_id,
      assignment_index: request.assignment_index,
    });
    if (request.assignment_id !== expectedAssignmentId)
      fail('Host request assignment differs from current work preview');
  }
  if (
    prior?.correction_generation === work.lifecycle.assurance.correction_count &&
    (prior.status !== 'no_effect' ||
      prior.request_digest !== request.request_digest ||
      !prior.reconciliation?.retry_lease ||
      !same(prior.reconciliation.retry_lease, request.lease))
  ) fail('Host request does not match a replay-safe no-effect predecessor');
  const operationFields = { ...fields } as Record<string, unknown>;
  if (
    request.attempt_id !== expectedAttemptId ||
    request.operation_hash !== canonicalJsonDigest(operationFields) ||
    work.execution.assignment_attempts.some((item) => item.attempt_id === request.attempt_id)
  ) fail('Host request is not a current unreserved Source attempt preview');
}

function parsePreparation(bytes: Uint8Array): LifecyclePreparationObservation {
  try {
    return lifecyclePreparationObservationSchema.parse(JSON.parse(Buffer.from(bytes).toString('utf8')));
  } catch {
    return fail('lifecycle preparation record does not match LifecyclePreparationObservation/v1');
  }
}

function allJournalItems(journal: MastraSessionLedgerSnapshot): readonly MastraLedgerItem[] {
  return [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items];
}

function currentJournalEvidence(
  journal: MastraSessionLedgerSnapshot,
  work: NonNullable<HostStateSnapshot['work']>,
): ReadonlyMap<string, MastraLedgerItem> {
  const evidence = new Map<string, MastraLedgerItem>();
  for (const item of allJournalItems(journal)) {
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
      // Non-unique or malformed observations cannot satisfy a lifecycle preparation reference.
    }
  }
  return evidence;
}

function configuredSecurityReviewer(
  config: AgentRuntimeConfig,
  teamId: string,
  workflowId: string,
): readonly { readonly stageId: string; readonly assignmentIndex: number; readonly role: string }[] {
  const workflow = config.workflows[workflowId];
  const team = config.teams[teamId];
  const matches = workflow?.stages.filter((stage) => stage.id === 'review_source_prewrite') ?? [];
  const stage = matches.length === 1 ? matches[0] : undefined;
  const plannerAssignments = stage?.assignments.flatMap((assignment, assignmentIndex) =>
    assignment.role === 'source-planner' && assignment.profile === 'architect'
      ? [{ assignment, assignmentIndex }]
      : [],
  ) ?? [];
  const securityAssignments = stage?.assignments.flatMap((assignment, assignmentIndex) =>
    assignment.role === 'security-prewriter' && assignment.profile === 'reviewer-security'
      ? [{ assignment, assignmentIndex }]
      : [],
  ) ?? [];
  const planner = plannerAssignments.length === 1 ? plannerAssignments[0] : undefined;
  const security = securityAssignments.length === 1 ? securityAssignments[0] : undefined;
  const plannerProfile = planner && config.agents.profiles[planner.assignment.profile];
  const plannerPolicy = plannerProfile && config.agents.tool_policies[plannerProfile.tools_policy];
  const securityProfile = security && config.agents.profiles[security.assignment.profile];
  const securityPolicy = securityProfile && config.agents.tool_policies[securityProfile.tools_policy];
  const developers = workflow?.stages.filter((candidate) => candidate.kind === 'develop') ?? [];
  const sourceWriters = developers.flatMap((developer) => developer.assignments.filter((assignment) => {
    const profile = config.agents.profiles[assignment.profile];
    const policy = profile && config.agents.tool_policies[profile.tools_policy];
    return profile?.mutation_scope === 'repository_source' && policy?.source_write === true;
  }));
  const securityRiskFlags = ['security', 'data_loss', 'migration', 'high'];
  if (
    !stage || !team || team.enabled !== true || matches.length !== 1 || stage.kind !== 'validate' || stage.mode !== 'parallel' ||
    !same(stage.required_after, ['synthesize_task']) || stage.assignments.length !== 2 ||
    plannerAssignments.length !== 1 || securityAssignments.length !== 1 ||
    (stage.risk_flags ?? []).length !== 0 || planner!.assignment.risk_flags?.length ||
    !same([...(security!.assignment.risk_flags ?? [])].sort(), [...securityRiskFlags].sort()) ||
    !same(stage.consumes, ['DevelopmentTaskPacket/v1']) ||
    !same(stage.produces, ['LifecyclePreparationObservation/v1']) ||
    (team.stage_overrides[stage.id] ?? team.roles['source-planner']) !== planner!.assignment.profile ||
    (team.stage_overrides[stage.id] ?? team.roles['security-prewriter']) !== security!.assignment.profile ||
    plannerProfile?.mutation_scope !== 'none' || plannerPolicy?.source_write !== false ||
    securityProfile?.mutation_scope !== 'none' || securityPolicy?.source_write !== false ||
    developers.length !== 1 || sourceWriters.length === 0 || !same(developers[0]!.required_after, [stage.id])
  ) return [];
  return [{ stageId: stage.id, assignmentIndex: security!.assignmentIndex, role: security!.assignment.role }];
}

function validateSecurityObservation(
  record: LifecyclePreparationObservation | undefined,
  evidence: ReadonlyMap<string, MastraLedgerItem>,
  config: AgentRuntimeConfig,
  teamId: string,
  workflowId: string,
): void {
  const security = record?.observations.filter((item) => item.mechanic === 'prewriter_security_gate') ?? [];
  if (security.length !== 1 || !security[0]!.actual.trim())
    fail('high-risk Source write requires one configured prewriter security observation');
  const item = evidence.get(security[0]!.evidence_ref);
  const reviewers = configuredSecurityReviewer(config, teamId, workflowId);
  if (
    !item ||
    !reviewers.some(
      (reviewer) =>
        item.request.workflow_id === workflowId &&
        item.request.stage_id === reviewer.stageId &&
        item.request.assignment_index === reviewer.assignmentIndex &&
        item.request.role === reviewer.role,
    )
  ) fail('prewriter security evidence is not from an issued configured reviewer observation');
}

/**
 * Validates current authority, work bindings and applicable preparation evidence before
 * a Source writer can be reserved or issued. This function is pure: the trusted Host
 * integration supplies current snapshots and real decision objects; this function
 * creates no identity, approval, attempt, rights or effects.
 */
export function validateSourceWritePreflight(input: SourceWritePreflightInput): readonly LifecycleArtifactReference[] {
  const { journal, request, config, projectContext, trustedIdentity, authorization, taskPacket } = input;
  const work = currentHostWork(input.hostSnapshot);
  const binding = work.binding;
  const identity = workIdentity(work);
  const lease = work.lease;

  if (
    work.schema !== 'WorkState/v1' ||
    work.lifecycle.schema !== 'LifecycleState/v1' ||
    work.execution.status !== 'active' ||
    !lease
  ) return fail('current active Host work state is required');
  verifyPendingRequestPreview(work, request);
  currentWorkflowAssignment(config, request);
  if (
    config.schema !== 'AgentRuntimeConfig/v1' ||
    config.repository.repository_id !== binding.repository_id ||
    runtimeConfigDigest(config) !== binding.config_digest ||
    projectContext.schema !== 'ProjectContext/v1' ||
    projectContext.repository_id !== binding.repository_id ||
    !same(projectContext.project_ids, binding.project_ids) ||
    projectContext.integrations_digest !== binding.integrations_digest ||
    projectContext.config_digest !== binding.config_digest ||
    !projectContext.project_ids.every((projectId) =>
      config.projects.some((project) => project.project_id === projectId),
    ) ||
    trustedIdentity.schema !== 'TrustedProjectIdentity/v1' ||
    trustedIdentity.source !== 'authenticated-context' ||
    trustedIdentity.tenant !== binding.repository_id ||
    trustedIdentity.registry_hash !== projectContext.registry_hash ||
    !projectContext.project_ids.includes(trustedIdentity.project)
  ) return fail('current trusted configuration, project context or identity differs from Host work');

  const receipt = authorization.receipt;
  if (
    authorization.decision !== 'allow' ||
    !receipt ||
    receipt.schema !== 'AuthorizationReceipt/v1' ||
    receipt.source !== 'cedar' ||
    receipt.decision !== 'allow' ||
    receipt.action !== 'write' ||
    receipt.operation_hash !== request.operation_hash ||
    receipt.principal !== trustedIdentity.principal ||
    receipt.role !== trustedIdentity.role ||
    receipt.tenant !== trustedIdentity.tenant ||
    receipt.project !== trustedIdentity.project ||
    receipt.registry_hash !== trustedIdentity.registry_hash ||
    receipt.resourceTenant !== trustedIdentity.tenant ||
    receipt.resourceProject !== trustedIdentity.project
  ) fail('Cedar authorization is missing, denied, or bound to another operation');

  const now = Date.now();
  verifyEdictumWriteGate(config, input.edictumOperation, input.edictumEvaluation, request, trustedIdentity);
  const hostApproval = input.hostApproval;
  const hostApprovalKeys = ['schema', 'principal', 'request', 'receipt'];
  const hostReceiptKeys = [
    'schema',
    'stage_id',
    'approval_id',
    'approver',
    'operation_hash',
    'tenant',
    'project',
    'approved_at',
    'expires_at',
    'evidence_digest',
  ];
  if (
    !hostApproval ||
    !isRecord(hostApproval) ||
    Object.keys(hostApproval).length !== hostApprovalKeys.length ||
    !hostApprovalKeys.every((key) => Object.hasOwn(hostApproval, key)) ||
    hostApproval.schema !== 'CanonicalHostSourceWriteApproval/v1' ||
    typeof input.hostApprovalPrincipal !== 'string' ||
    input.hostApprovalPrincipal.length === 0 ||
    hostApproval.principal !== input.hostApprovalPrincipal ||
    !same(hostApproval.request, request) ||
    !isRecord(hostApproval.receipt) ||
    Object.keys(hostApproval.receipt).length !== hostReceiptKeys.length ||
    !hostReceiptKeys.every((key) => Object.hasOwn(hostApproval.receipt, key)) ||
    hostApproval.receipt.schema !== 'EdictumWorkflowApproval/v1' ||
    hostApproval.receipt.stage_id !== request.stage_id ||
    hostApproval.receipt.operation_hash !== request.operation_hash ||
    hostApproval.receipt.tenant !== trustedIdentity.tenant ||
    !projectContext.project_ids.includes(hostApproval.receipt.project) ||
    hostApproval.receipt.approver !== hostApproval.principal ||
    hostApproval.receipt.approver !== input.hostApprovalPrincipal ||
    typeof hostApproval.receipt.approval_id !== 'string' ||
    hostApproval.receipt.approval_id.length === 0 ||
    !/^[a-f0-9]{64}$/.test(hostApproval.receipt.evidence_digest) ||
    hostApproval.receipt.evidence_digest !== computeEdictumWorkflowApprovalEvidenceDigest({
      schema: hostApproval.receipt.schema,
      stage_id: hostApproval.receipt.stage_id,
      approval_id: hostApproval.receipt.approval_id,
      approver: hostApproval.receipt.approver,
      operation_hash: hostApproval.receipt.operation_hash,
      tenant: hostApproval.receipt.tenant,
      project: hostApproval.receipt.project,
      approved_at: hostApproval.receipt.approved_at,
      expires_at: hostApproval.receipt.expires_at,
    }) ||
    !Number.isFinite(Date.parse(hostApproval.receipt.approved_at)) ||
    !Number.isFinite(Date.parse(hostApproval.receipt.expires_at)) ||
    Date.parse(hostApproval.receipt.approved_at) > now ||
    Date.parse(hostApproval.receipt.expires_at) <= now
  ) fail('Host-local permission receipt is missing, expired, or bound to another operation');

  if (
    journal.state.schema !== 'MastraSessionLedger/v1' ||
    journal.state.workspace_id !== work.workspace_id ||
    journal.state.work_id !== identity.work_id ||
    !Number.isSafeInteger(journal.state.attempt) ||
    journal.state.attempt < 1 ||
    journal.state.run_id !== work.execution.run_id ||
    !Number.isSafeInteger(journal.version.revision) ||
    journal.version.revision < 1 ||
    !/^[a-f0-9]{64}$/.test(journal.version.digest) ||
    journal.version.digest !== canonicalJsonDigest(journal.state) ||
    !['ready', 'ready_to_resume'].includes(journal.resume_status) ||
    allJournalItems(journal).some((item) => item.issue_id !== null && item.observation === null)
  ) fail('same-thread journal is stale, foreign, uncertain, or not ready');

  const scopeHash = sha256(input.scopeBytes),
    acceptanceHash = sha256(input.acceptanceBytes);
  if (
    scopeHash !== work.contracts.scope.sha256 ||
    scopeHash !== binding.scope_contract_digest ||
    acceptanceHash !== work.contracts.acceptance.sha256 ||
    acceptanceHash !== binding.acceptance_manifest_digest
  ) fail('scope or acceptance bytes differ from current admitted contracts');

  let scope: unknown, acceptance: unknown;
  try {
    scope = JSON.parse(Buffer.from(input.scopeBytes).toString('utf8'));
    acceptance = JSON.parse(Buffer.from(input.acceptanceBytes).toString('utf8'));
  } catch {
    return fail('scope or acceptance contract is not valid JSON');
  }
  const scopeRecord = isRecord(scope) ? scope : fail('scope contract is not an object');
  const acceptanceRecord = isRecord(acceptance) ? acceptance : fail('acceptance contract is not an object');
  const acceptedRevision = acceptedContractSourceRevision(work, journal, input.continuation);
  if (
    scopeRecord.schema !== 'ImplementationScope/v1' ||
    scopeRecord.scope_id !== binding.scope_id ||
    scopeRecord.work_id !== identity.work_id ||
    scopeRecord.source_revision !== acceptedRevision ||
    !same(scopeRecord.ac_ids, binding.ac_ids) ||
    !same(scopeRecord.allowed_paths, work.lifecycle.scope.allowed_paths) ||
    !same(scopeRecord.implementation_paths, binding.implementation_paths) ||
    (scopeRecord.attribution as Record<string, unknown> | undefined)?.thread_id !== lease.thread_id ||
    acceptanceRecord.schema !== 'AcceptanceManifest/v1' ||
    acceptanceRecord.scope !== binding.scope_id ||
    acceptanceRecord.source_revision !== acceptedRevision ||
    !same(acceptanceRecord.ac_ids, binding.ac_ids)
  ) fail('scope or acceptance contract binding differs from Host state');

  const unsignedPacket = { ...taskPacket } as Record<string, unknown>;
  delete unsignedPacket.digest;
  const acceptanceContracts = Array.isArray(acceptanceRecord.contracts)
    ? (acceptanceRecord.contracts as readonly { id: string; definition: string }[])
    : [];
  if (
    taskPacket.schema !== 'DevelopmentTaskPacket/v1' ||
    taskPacket.work_item_id !== identity.work_id ||
    taskPacket.attempt !== journal.state.attempt ||
    taskPacket.workflow_id !== binding.workflow_id ||
    taskPacket.source_revision !== binding.work_source_revision ||
    taskPacket.digest !== canonicalJsonDigest(unsignedPacket) ||
    !same(taskPacket.in_scope, binding.implementation_paths) ||
    !same(taskPacket.owned_paths, scopeRecord.allowed_paths) ||
    !same(
      taskPacket.acceptance,
      acceptanceContracts.map((contract) => `${contract.id}: ${contract.definition}`),
    ) ||
    !Number.isFinite(Date.parse(taskPacket.lease_expires_at)) ||
    Date.parse(taskPacket.lease_expires_at) <= now
  ) fail('development task packet is stale or differs from admitted scope');

  const currentPreparationReferences = work.lifecycle.references.filter(
    (reference) =>
      preparationKinds.includes(reference.kind as PreparationKind) &&
      reference.artifact_schema === 'LifecyclePreparationObservation/v1' &&
      reference.disposition === 'current',
  );
  if (input.preparations.length !== currentPreparationReferences.length)
    fail('preparation artifacts do not match current applicable lifecycle references');
  const journalEvidence = currentJournalEvidence(journal, work);
  const references: LifecycleArtifactReference[] = [];
  const records = new Map<PreparationKind, LifecyclePreparationObservation>();
  for (const item of input.preparations) {
    const reference = item.reference;
    if (
      reference.schema !== 'LifecycleArtifactReference/v1' ||
      !preparationKinds.includes(reference.kind as PreparationKind) ||
      reference.artifact_schema !== 'LifecyclePreparationObservation/v1' ||
      reference.disposition !== 'current' ||
      reference.source_revision !== binding.work_source_revision ||
      reference.scope_id !== binding.scope_id ||
      !same(reference.ac_ids, binding.ac_ids) ||
      sha256(item.bytes) !== reference.sha256 ||
      !currentPreparationReferences.some((current) => same(current, reference))
    ) fail('preparation reference is not current or its bytes changed');
    const record = parsePreparation(item.bytes);
    if (
      record.kind !== reference.kind ||
      record.record_id !== reference.record_id ||
      record.work_id !== identity.work_id ||
      record.attempt !== journal.state.attempt ||
      record.source_revision !== binding.work_source_revision ||
      record.scope_id !== binding.scope_id ||
      record.config_digest !== binding.config_digest ||
      !same(record.ac_ids, binding.ac_ids) ||
      record.status !== 'pass' ||
      record.gaps.length !== 0
    ) fail('lifecycle preparation is stale, foreign, or has a GAP');
    validateObservedEvidenceReferences(record.evidence_refs);
    if (!record.observations.every((observation) => record.evidence_refs.includes(observation.evidence_ref)))
      fail('preparation observation is missing its evidence reference');
    const mechanics: Record<PreparationKind, readonly string[]> = {
      source_plan: ['scope_acceptance_trace', 'verification_rollback'],
      platform_knowledge: ['platform_contracts', 'official_reference_lookup'],
      implementation_policy: ['root_cause_owner', 'affected_callers', 'existing_primitives'],
      change_impact_pre: ['affected_paths', 'invalidation', 'rollback'],
      documentation_validation: ['current_inventory', 'current_clear'],
    };
    if (!mechanics[record.kind].every((mechanic) => record.observations.some((item) => item.mechanic === mechanic)))
      fail('required lifecycle preparation observations are missing: ' + record.kind);
    for (const evidenceRef of record.evidence_refs) {
      if (evidenceRef.startsWith('artifact://session-observation/') && !journalEvidence.has(evidenceRef))
        fail('preparation cites a journal observation that is not current');
    }
    records.set(record.kind, record);
    references.push(reference);
  }
  if (new Set(records.keys()).size !== records.size) fail('lifecycle preparation set has duplicate kinds');
  if (!records.has('source_plan')) fail('Source write requires a current source plan');

  if (requiresSourcePrewriterSecurityReview(work.lifecycle.risk, taskPacket.risk_flags))
    validateSecurityObservation(records.get('implementation_policy'), journalEvidence, config, binding.team_id, request.workflow_id);

  return references;
}
