import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync, realpathSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deriveWorkspaceId } from './workspace-identity.js';
import type {
  SynthesisObservationCorrectionPlan,
  MastraSessionLedgerState,
} from './orchestration/persistent-session-handoff.js';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import workSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };
import {
  safeHistoricalWorkflowOwnedPath,
  safeWorkflowOwnedPath,
  validateCoordinationLedgerV1,
  type CoordinationLedger,
  type CoordinationTicket,
} from './contracts/envelopes.js';
import {
  assertCanonicalJsonValue,
  canonicalJson,
  canonicalJsonDigest,
  freezeJsonValue,
  rfc3339TimestampMilliseconds,
} from './contracts/public-ingress.js';
import type { WorkExecutionContext, TrustedWorkflowAssignment, WorkflowApprovalAction } from './runtime-kernel.js';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  issueHostGovernanceCapability,
  requireHostGovernanceCapability,
  validateHostOperationReservation,
  validateHostWorkflowApprovalRecord,
  type HostGovernanceCapability,
  type OperationReservation,
  type OperationReservationStatus,
  type WorkflowApprovalBinding,
  type WorkflowApprovalConsumptionRecord,
  type EdictumWorkflowApprovalReceipt,
} from './governance/edictum-boundary.js';
import {
  validateLifecycleAggregate,
  validateLifecycleProgress,
  transitionLifecycleState,
  type LifecycleArtifactReference,
  type DocumentationVerificationContext,
  type LifecycleState,
} from './lifecycle/lifecycle-state.js';
import {
  validateFinalAssuranceState,
  validateFinalAssuranceProgress,
  finalAssuranceStatus,
  correctiveAssignmentAuthorizationSchema,
  correctiveExecutionSchema,
  type CorrectiveExecution,
  validateWorkSessionBinding,
  selectCorrectiveEvidence,
  type FinalAssuranceState,
  type FinalAssuranceSnapshot,
} from './orchestration/final-assurance.js';
import { requireSafeRepositoryAccess } from './config/safe-repository-access.js';
import { snapshotDeclaredSources } from './orchestration/scoped-source-snapshot.js';
import { loadRuntimeConfig, runtimeConfigDigest, selectWorkflow } from './config/runtime-config.js';
import { loadProjectSetContext } from './config/project-context.js';
import { MastraSessionLedger } from './orchestration/persistent-session-handoff.js';
import { readSessionEngineSnapshot, type SessionEngineBinding } from './orchestration/session-engine-snapshot.js';
import type { SessionBridgeObservation } from './orchestration/mastra-session-bridge.js';
import type { ScopedSourceSnapshot } from './orchestration/scoped-source-snapshot.js';

const sessionProducerStore = 'vida-session-producers';
const recoveryReviewStore = 'vida-recovery-reviews';
/** Internal trusted-caller consistency; no native attestation or write authority. */
export interface RecoveryReviewBinding {
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly callerSession: string;
  readonly controllerId: string;
  readonly userInstructionRef: string;
  readonly historicalOwner: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly maintenanceGeneration: number;
  readonly source: ScopedSourceSnapshot;
  readonly context: Readonly<Record<string, unknown>>;
}
export interface RecoveryReviewHandle {
  readonly operation: OperationReservation;
}

export interface SessionProducerHandle {
  readonly operation: OperationReservation;
}
type SessionProducerInput = SessionEngineBinding & {
  readonly projectIds: readonly string[];
  readonly phase: 'initialize' | 'start' | 'resume';
  readonly expectedWork: StateVersion | null;
  readonly expectedLedger: StateVersion | null;
  readonly expectedJournal: StateVersion | null;
  readonly maintenanceGeneration: number;
  readonly resumeIntent?: { readonly stepId: string; readonly observations: readonly SessionBridgeObservation[] };
  readonly sourceScope?: ScopedSourceSnapshot | null;
};

export interface ContractReference {
  readonly schema: string;
  readonly path: string;
  readonly sha256: string;
}
export interface WorkArtifactReference extends ContractReference {
  readonly artifact_id: string;
  readonly stage_id: string;
  readonly source_revision: string;
  readonly scope_id: string;
  readonly ac_ids: readonly string[];
}
export interface AssignmentAttempt {
  readonly assignment_id: string;
  readonly attempt_id: string;
  readonly previous_attempt_id: string | null;
  readonly request_digest: string;
  readonly stage_id: string;
  readonly assignment_index: number;
  readonly correction_generation: number;
  readonly correction_authorization: ContractReference | null;
  readonly lease: { readonly ticket_id: string; readonly thread_id: string; readonly generation: number };
  readonly status: 'started' | 'completed' | 'uncertain' | 'no_effect';
  readonly result: unknown;
  readonly result_digest: string | null;
  readonly reconciliation: WorkflowAttemptReconciliationAuthorization | null;
}
export interface WorkflowAttemptReconciliationRequest {
  readonly identity: WorkIdentity;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedMaintenanceGeneration?: number;
  readonly attemptId: string;
  readonly outcome: 'completed' | 'no_effect';
  readonly result: unknown;
  readonly providerEvidence: ContractReference;
  readonly decision: ContractReference | null;
  readonly retryLease: WorkState['lease'];
}
export interface WorkflowAttemptReconciliationAuthorization {
  readonly schema: 'WorkflowAttemptReconciliationAuthorization/v1';
  readonly principal: string;
  readonly work_binding_digest: string;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly attempt_id: string;
  readonly request_digest: string;
  readonly outcome: 'completed' | 'no_effect';
  readonly result_digest: string | null;
  readonly provider_evidence: ContractReference;
  readonly decision: ContractReference | null;
  readonly retry_lease: WorkState['lease'];
}
/** Trusted host service: verify provider proof and current canonical decision authority.
 * A no-effect authorization additionally attests permanent quiescence of the old
 * provider operation and authorizes exactly retry_lease, never a generic retry.
 */
export interface WorkflowAttemptReconciliationVerifier {
  readonly principal: string;
  readonly verify: (
    request: WorkflowAttemptReconciliationRequest,
    state: HostStateSnapshot,
  ) => WorkflowAttemptReconciliationAuthorization | null | Promise<WorkflowAttemptReconciliationAuthorization | null>;
}
export interface WorkflowAttemptRequest {
  readonly identity: WorkIdentity;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedMaintenanceGeneration?: number;
  readonly stageId: string;
  readonly assignmentIndex: number;
  readonly requestDigest: string;
  readonly lease: NonNullable<WorkState['lease']>;
}
export interface WorkflowAttemptReceipt {
  readonly identity: WorkIdentity;
  readonly workVersion: StateVersion;
  readonly attempt: AssignmentAttempt;
  readonly maintenanceGeneration: number;
}
/** Cooperative operator evidence; it records observations but does not authenticate a native tool call. */
export interface InterruptedSourceRetirementEvidence {
  readonly schema: 'InterruptedSourceRetirementEvidence/v1';
  readonly source_thread_id: string;
  readonly source_thread_status: 'interrupted';
  readonly read_thread_ref: string;
  readonly list_agents_ref: string;
  readonly active_source_writer_ids: readonly string[];
}
export interface InterruptedSourceRetirementRequest {
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly authorization: WorkflowAttemptApprovalAuthorization;
  readonly operatorHandle: string;
  readonly decisionPointer: string;
  readonly evidence: InterruptedSourceRetirementEvidence;
}
export interface InterruptedSourceRetirementResult {
  readonly snapshot: HostStateSnapshot;
  readonly attempt_receipt: WorkflowAttemptReceipt;
  readonly operation_id: string;
  readonly request_digest: string;
}
export interface WorkflowAttemptApprovalRequest {
  readonly schema: 'WorkflowAttemptApprovalRequest/v1';
  readonly store_id: string;
  readonly action: WorkflowApprovalAction;
  readonly identity: WorkIdentity;
  readonly config_digest: string;
  readonly workflow_id: string;
  readonly stage_id: string;
  readonly assignment_id: string;
  readonly assignment_index: number;
  readonly request_digest: string;
  readonly attempt_id: string;
  readonly lease: NonNullable<WorkState['lease']>;
  readonly operation_hash: string;
}
export interface WorkflowAttemptApprovalVerifier {
  readonly principal: string;
  readonly verify: (
    request: WorkflowAttemptApprovalRequest,
  ) => EdictumWorkflowApprovalReceipt | null | Promise<EdictumWorkflowApprovalReceipt | null>;
}
export interface WorkflowAttemptApprovalAuthorization {
  readonly receipt: WorkflowAttemptReceipt;
  readonly approval: WorkflowApprovalConsumptionRecord | null;
}
export interface MigrationRebindRequest {
  readonly identity: WorkIdentity;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedMaintenanceGeneration?: number;
  readonly sourceSha256: string;
  readonly migrationId: string;
  readonly decisionPointer: string;
}
export interface MigrationRebindReceipt {
  readonly schema: 'MigrationRebind/v1';
  readonly rebind_id: string;
  readonly identity: WorkIdentity;
  readonly principal: string;
  readonly decision_pointer: string;
  readonly source_sha256: string;
  readonly migration_id: string;
  readonly issued_run_id: string;
  readonly source_work_digest: string;
}
export type MigrationRebindAuthorization = Omit<MigrationRebindReceipt, 'issued_run_id' | 'source_work_digest'>;
export interface MigrationRebindVerifier {
  readonly principal: string;
  readonly verify: (
    request: MigrationRebindRequest,
    state: HostStateSnapshot,
  ) => MigrationRebindAuthorization | null | Promise<MigrationRebindAuthorization | null>;
}
export interface RuntimeCodeRebindRequest {
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
  readonly nativeSessionHandle: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration?: number;
  readonly oldRuntimeCodeDigest: string;
  readonly newRuntimeCodeDigest: string;
  readonly forwardOperationId: string;
  readonly parentManifestDigest: string;
  readonly successorManifestDigest: string;
  readonly ownerNoCallPointer?: string;
  readonly focusedFailureCorrection?: { readonly ownerCorrectionPointer: string };
  readonly synthesisCorrection?: {
    readonly correctionId: string;
    readonly correctionDigest: string;
    readonly ownerCorrectionPointer: string;
  };
}
export interface RuntimeCodeRebindAuthorization {
  readonly schema: 'VidaRuntimeCodeRebindAuthorization/v1';
  readonly request_digest: string;
  readonly principal: string;
  readonly forward_operation_id: string;
  readonly parent_manifest_digest: string;
  readonly successor_manifest_digest: string;
  readonly owner_no_call_pointer?: string;
  readonly owner_correction_pointer?: string;
  readonly synthesis_correction_digest?: string;
}
export interface RuntimeCodeRebindVerifier {
  readonly principal: string;
  readonly verify: (
    request: RuntimeCodeRebindRequest,
    state: HostStateSnapshot,
  ) => RuntimeCodeRebindAuthorization | null | Promise<RuntimeCodeRebindAuthorization | null>;
}
export interface WorkCheckpointMigrationLineage {
  readonly schema: 'WorkMigrationLineage/v1';
  readonly source_schema: 'WorkCheckpoint/v2';
  readonly source_sha256: string;
  readonly source_work_id: string;
  readonly source_revision: string;
  readonly original_run_id: string | null;
  readonly continuation_run_id: string | null;
  readonly migration_id: string;
  readonly rebind_status: 'pending' | 'accepted';
  readonly rebind_receipt: MigrationRebindReceipt | null;
}
/**
 * Provenance for a work state reconstructed from a live coordination ticket
 * when the historical checkpoint was never recorded.  The ticket snapshot is
 * part of the lineage instead of a synthetic WorkCheckpoint/v2.
 */
export interface CoordinationTicketMigrationLineage {
  readonly schema: 'WorkMigrationLineage/v1';
  readonly source_schema: 'CoordinationTicket/v1';
  readonly source_sha256: string;
  readonly source_work_id: string;
  readonly source_revision: string;
  readonly original_run_id: null;
  readonly continuation_run_id: string | null;
  readonly migration_id: string;
  readonly rebind_status: 'pending' | 'accepted';
  readonly rebind_receipt: MigrationRebindReceipt | null;
  readonly source_ticket: {
    readonly pointer: string;
    readonly ticket_id: string;
    readonly thread_id: string;
    readonly generation: number;
    readonly contour_keys: readonly string[];
    readonly exclusive_resources: readonly string[];
  };
}
export type WorkMigrationLineage = WorkCheckpointMigrationLineage | CoordinationTicketMigrationLineage;
export interface WorkState {
  readonly schema: 'WorkState/v1';
  readonly workspace_id: string;
  readonly revision: number;
  readonly binding: WorkExecutionContext['binding'];
  readonly contracts: {
    readonly scope: ContractReference;
    readonly acceptance: ContractReference;
    readonly decisions: readonly ContractReference[];
  };
  readonly lease: { readonly ticket_id: string; readonly thread_id: string; readonly generation: number } | null;
  readonly execution: {
    readonly run_id: string | null;
    readonly input_digest: string;
    readonly phase: string;
    readonly status: 'active' | 'suspended' | 'failed' | 'complete';
    readonly assignment_attempts: readonly AssignmentAttempt[];
  };
  readonly migration?: WorkMigrationLineage;
  readonly request_transition?: {
    readonly schema: 'WorkRequestTransition/v1';
    readonly request_pointer: string;
    readonly native_session_handle: string;
    readonly predecessor_work_ids: readonly string[];
    readonly successor_work_id: string | null;
  } | null;
  readonly lifecycle: LifecycleState;
  readonly artifacts: readonly WorkArtifactReference[];
}
export type { CoordinationClaim, CoordinationLedger, CoordinationTicket } from './contracts/envelopes.js';
export interface WorkIdentity {
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly integrations_digest: string;
  readonly work_id: string;
}
export interface StateVersion {
  readonly revision: number;
  readonly digest: string;
}
interface RuntimeCodeRebindHistory {
  readonly schema: 'RuntimeCodeRebindHistory/v1';
  readonly original_work: WorkState;
  readonly successor_binding: WorkState['binding'];
  readonly terminal_attempt_ids: readonly string[];
  readonly original_journal: MastraSessionLedgerState;
}
interface RuntimeCodeRebindReceipt extends RuntimeCodeRebindAuthorization {
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly action_id: string;
  readonly issue_id: string;
  readonly old_runtime_code_digest: string;
  readonly new_runtime_code_digest: string;
  readonly prior_work_version: StateVersion;
  readonly journal_version: StateVersion;
  readonly request: RuntimeCodeRebindRequest;
  readonly binding_history?: RuntimeCodeRebindHistory;
}
export interface HostStateSnapshot {
  readonly work: WorkState | null;
  readonly ledger: CoordinationLedger | null;
  readonly workVersion: StateVersion | null;
  readonly ledgerVersion: StateVersion | null;
  readonly maintenanceGeneration: number;
}

/** Historical Source success is settled only when the authoritative host retained this exact result. */
export function completedSourceJournalObservationMatches(
  work: WorkState,
  item: MastraSessionLedgerState['items'][number],
): boolean {
  const reservation = item.host_reservation,
    observation = item.observation;
  const completed = work.execution.assignment_attempts.find(
    (attempt) => attempt.attempt_id === reservation?.receipt.attempt.attempt_id,
  );
  return Boolean(
    reservation &&
    observation?.status === 'reported_complete' &&
    observation.issue_id === item.issue_id &&
    observation.host_attempt_id === completed?.attempt_id &&
    completed?.status === 'completed' &&
    completed.result_digest === canonicalJsonDigest(observation) &&
    sameJson(completed.result, observation) &&
    completed.stage_id === item.request.stage_id &&
    completed.assignment_index === item.request.assignment_index &&
    sameJson(completed.lease, reservation.receipt.attempt.lease) &&
    sameJson(reservation.receipt.identity, workIdentity(work)) &&
    completed.request_digest === reservation.receipt.attempt.request_digest,
  );
}

/**
 * The repository-side boundary for the Codex Desktop adapter.  The Desktop
 * issuer is deliberately not implemented here: it must provide the opaque
 * host capability and an authenticated session/thread binding.  Keeping this
 * contract beside the durable host state lets every state mutation fail
 * closed until that external attestation exists.
 */
export interface CodexDesktopAdapterContract {
  readonly schema: 'CodexDesktopAdapterContract/v1';
  readonly issuer: 'codex-desktop';
  readonly session_id: string;
  readonly thread_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly integrations_digest: string;
  readonly principal: string;
  readonly repository_root: string;
  readonly config_digest: string;
  readonly schema_digest: string;
  readonly source_digest: string;
  readonly bundle_digest: string;
  readonly issuer_attestation_digest: string;
  readonly host_capability: HostGovernanceCapability;
  readonly services: {
    readonly runtime_revision: (...args: never[]) => unknown;
    readonly resolve_identity: (...args: never[]) => unknown;
    readonly verify_approval: (...args: never[]) => unknown;
    readonly cas_writer: (...args: never[]) => unknown;
    readonly workflow_attempts: {
      readonly claimWorkflowAssignment: (...args: never[]) => unknown;
      readonly completeWorkflowAttempt: (...args: never[]) => unknown;
      readonly markWorkflowAttemptUncertain: (...args: never[]) => unknown;
    };
  };
}
export interface ReconciliationGateBinding {
  readonly schema: 'ReconciliationGateBinding/v1';
  readonly operation_id: string;
  readonly manifest_digest: string;
  readonly request_digest: string;
  readonly bindings_digest: string;
  readonly closure_digest: string;
  readonly work: readonly { readonly identity: WorkIdentity; readonly version: StateVersion }[];
}
export interface ReconciliationGate {
  readonly schema: 'ReconciliationGate/v1';
  readonly revision: number;
  readonly status: 'open' | 'restoring' | 'restored' | 'closed';
  readonly binding: ReconciliationGateBinding;
  readonly fencing_token: string;
  readonly closed_work_version: StateVersion | null;
  readonly closed_ledger_version: StateVersion | null;
}
export interface MaintenanceFenceBinding {
  readonly schema: 'MaintenanceFenceBinding/v1';
  readonly project_ids: readonly string[];
  readonly operation_id: string;
  readonly manifest_digest: string;
  readonly request_digest: string;
  readonly bindings_digest: string;
  readonly closure_digest: string;
  readonly bundle_digest: string;
}
export interface MaintenanceFence {
  readonly schema: 'MaintenanceFence/v1';
  readonly workspace_id: string;
  readonly revision: number;
  readonly generation: number;
  readonly status: 'held' | 'released';
  readonly binding: MaintenanceFenceBinding;
  readonly token_digest: string;
}
export interface MaintenanceFenceReceipt {
  readonly fence: MaintenanceFence;
  readonly token: string;
}
export interface MaintenanceReleaseAuthorization {
  readonly schema: 'MaintenanceReleaseAuthorization/v1';
  readonly principal: string;
  readonly fence_digest: string;
  readonly closure_digest: string;
  readonly bundle_digest: string;
}
export interface MaintenanceReleaseVerifier {
  readonly principal: string;
  readonly projectIds: readonly string[];
  readonly verify: (
    fence: MaintenanceFence,
  ) => MaintenanceReleaseAuthorization | null | Promise<MaintenanceReleaseAuthorization | null>;
  /** Trusted operation owner; called synchronously on this connection inside acquisition's immediate transaction. */
  readonly verifyAcquisition?: (binding: MaintenanceFenceBinding, prior: MaintenanceFence | null) => void;
}
function validGateVersion(value: unknown): value is StateVersion {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.keys(value).length === 2 &&
    Number.isSafeInteger((value as StateVersion).revision) &&
    (value as StateVersion).revision > 0 &&
    typeof (value as StateVersion).digest === 'string' &&
    hashPattern.test((value as StateVersion).digest)
  );
}
function checkedReconciliationGateBinding(value: unknown): ReconciliationGateBinding {
  requireState(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'reconciliation gate binding invalid',
  );
  const binding = value as ReconciliationGateBinding;
  requireState(
    Object.keys(binding).length === 7 &&
      binding.schema === 'ReconciliationGateBinding/v1' &&
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(binding.operation_id) &&
      [binding.manifest_digest, binding.request_digest, binding.bindings_digest, binding.closure_digest].every(
        (digest) => typeof digest === 'string' && hashPattern.test(digest),
      ) &&
      Array.isArray(binding.work) &&
      binding.work.length > 0,
    'reconciliation gate binding invalid',
  );
  const keys = new Set<string>();
  for (const item of binding.work) {
    requireState(item !== null && typeof item === 'object' && Object.keys(item).length === 2, 'gate work item invalid');
    const key = identityKey(item.identity),
      state = item.version;
    requireState(!keys.has(key), 'reconciliation gate work identity duplicate');
    keys.add(key);
    requireState(validGateVersion(state), 'gate work version invalid');
  }
  return binding;
}
function checkedReconciliationGate(value: unknown): ReconciliationGate {
  requireState(value !== null && typeof value === 'object' && !Array.isArray(value), 'reconciliation gate invalid');
  const gate = value as ReconciliationGate;
  checkedReconciliationGateBinding(gate.binding);
  requireState(
    Object.keys(gate).length === 7 &&
      gate.schema === 'ReconciliationGate/v1' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(gate.fencing_token) &&
      ((gate.status === 'open' && gate.revision === 1) ||
        (['restoring', 'closed'].includes(gate.status) && gate.revision === 2) ||
        (gate.status === 'restored' && gate.revision === 3)) &&
      (gate.status === 'closed'
        ? validGateVersion(gate.closed_work_version) && validGateVersion(gate.closed_ledger_version)
        : gate.closed_work_version === null && gate.closed_ledger_version === null),
    'reconciliation gate state invalid',
  );
  return gate;
}
export class HostStateError extends Error {
  readonly code = 'GAP-HOST-STATE-001';
}
function requireState(condition: unknown, message: string): asserts condition {
  if (!condition) throw new HostStateError(message);
}
export function assertCodexDesktopAdapterContract(value: unknown): CodexDesktopAdapterContract {
  requireState(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'Desktop adapter contract invalid',
  );
  const candidate = value as Record<string, unknown>;
  const required = [
    'schema',
    'issuer',
    'session_id',
    'thread_id',
    'repository_id',
    'project_ids',
    'integrations_digest',
    'principal',
    'repository_root',
    'config_digest',
    'schema_digest',
    'source_digest',
    'bundle_digest',
    'issuer_attestation_digest',
    'host_capability',
    'services',
  ];
  requireState(
    Object.keys(candidate).length === required.length && required.every((key) => Object.hasOwn(candidate, key)),
    'Desktop adapter contract fields invalid',
  );
  const projectIds = Array.isArray(candidate.project_ids) ? candidate.project_ids : [];
  requireState(
    candidate.schema === 'CodexDesktopAdapterContract/v1' &&
      candidate.issuer === 'codex-desktop' &&
      [candidate.session_id, candidate.thread_id, candidate.repository_id, candidate.principal].every(
        (item) => typeof item === 'string' && item.trim().length > 0 && item === item.trim() && !/\p{Cc}/u.test(item),
      ) &&
      Array.isArray(candidate.project_ids) &&
      projectIds.length > 0 &&
      projectIds.every((item) => typeof item === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(item)) &&
      projectIds.every((item, index) => index === 0 || String(projectIds[index - 1]) < String(item)) &&
      typeof candidate.integrations_digest === 'string' &&
      hashPattern.test(candidate.integrations_digest) &&
      typeof candidate.repository_root === 'string' &&
      [
        candidate.config_digest,
        candidate.schema_digest,
        candidate.source_digest,
        candidate.bundle_digest,
        candidate.issuer_attestation_digest,
      ].every((item) => typeof item === 'string' && hashPattern.test(item)),
    'Desktop adapter identity or digest binding invalid',
  );
  repositoryRootIdentity(candidate.repository_root as string);
  requireHostGovernanceCapability(candidate.host_capability as HostGovernanceCapability);
  requireState(
    candidate.services !== null && typeof candidate.services === 'object' && !Array.isArray(candidate.services),
    'Desktop adapter services invalid',
  );
  const services = candidate.services as Record<string, unknown>;
  const serviceKeys = ['runtime_revision', 'resolve_identity', 'verify_approval', 'cas_writer', 'workflow_attempts'];
  requireState(
    Object.keys(services).length === serviceKeys.length &&
      serviceKeys.every((key) => Object.hasOwn(services, key)) &&
      serviceKeys.slice(0, 4).every((key) => typeof services[key] === 'function'),
    'Desktop adapter service closure invalid',
  );
  const attempts = services.workflow_attempts;
  requireState(
    attempts !== null && typeof attempts === 'object' && !Array.isArray(attempts),
    'Desktop workflow service invalid',
  );
  const attemptServices = attempts as Record<string, unknown>;
  const attemptKeys = ['claimWorkflowAssignment', 'completeWorkflowAttempt', 'markWorkflowAttemptUncertain'];
  requireState(
    Object.keys(attemptServices).length === attemptKeys.length &&
      attemptKeys.every((key) => typeof attemptServices[key] === 'function'),
    'Desktop workflow service closure invalid',
  );
  return value as CodexDesktopAdapterContract;
}
function repositoryRootIdentity(root: string): string {
  requireState(typeof root === 'string' && path.isAbsolute(root), 'absolute repository root required');
  const resolved = realpathSync.native(root);
  requireState(statSync(resolved).isDirectory(), 'repository root must be a directory');
  return resolved;
}
const AjvConstructor = Ajv2020 as unknown as new (options: object) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const ajv = new AjvConstructor({ allErrors: true });
const validateWork = ajv.compile<WorkState>(workSchema);
const hashPattern = /^[a-f0-9]{64}$/;
const maintenanceIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function checkedMaintenanceBinding(value: unknown): MaintenanceFenceBinding {
  requireState(value !== null && typeof value === 'object' && !Array.isArray(value), 'maintenance binding invalid');
  const binding = value as MaintenanceFenceBinding;
  requireState(
    Object.keys(binding).length === 8 &&
      binding.schema === 'MaintenanceFenceBinding/v1' &&
      Array.isArray(binding.project_ids) &&
      binding.project_ids.length > 0 &&
      binding.project_ids.every((id) => typeof id === 'string' && maintenanceIdPattern.test(id)) &&
      binding.project_ids.every((id, index) => index === 0 || binding.project_ids[index - 1]! < id) &&
      maintenanceIdPattern.test(binding.operation_id) &&
      [
        binding.manifest_digest,
        binding.request_digest,
        binding.bindings_digest,
        binding.closure_digest,
        binding.bundle_digest,
      ].every((digest) => typeof digest === 'string' && hashPattern.test(digest)),
    'maintenance binding invalid',
  );
  return binding;
}
export function checkedMaintenanceFence(value: unknown): MaintenanceFence {
  requireState(value !== null && typeof value === 'object' && !Array.isArray(value), 'maintenance fence invalid');
  const fence = value as MaintenanceFence;
  checkedMaintenanceBinding(fence.binding);
  requireState(
    Object.keys(fence).length === 7 &&
      fence.schema === 'MaintenanceFence/v1' &&
      typeof fence.workspace_id === 'string' &&
      hashPattern.test(fence.workspace_id) &&
      Number.isSafeInteger(fence.revision) &&
      fence.revision > 0 &&
      Number.isSafeInteger(fence.generation) &&
      fence.generation > 0 &&
      ['held', 'released'].includes(fence.status) &&
      typeof fence.token_digest === 'string' &&
      hashPattern.test(fence.token_digest),
    'maintenance fence invalid',
  );
  return fence;
}
function maintenanceTokenDigest(fence: MaintenanceFence, token: string): string {
  return canonicalJsonDigest({
    workspace_id: fence.workspace_id,
    generation: fence.generation,
    request_digest: fence.binding.request_digest,
    token,
  });
}
function snapshot<T>(value: T): T {
  assertCanonicalJsonValue(value, '$');
  return freezeJsonValue(JSON.parse(JSON.stringify(value))) as T;
}
function unique(values: readonly string[], label: string): void {
  requireState(new Set(values).size === values.length, label + ' contains aliases or duplicate identifiers');
}
function timestamp(value: string): number {
  const parsed = rfc3339TimestampMilliseconds(value);
  requireState(parsed !== null && Number.isFinite(parsed), 'lease expiry is invalid');
  return parsed;
}
function resourceKey(resource: string): string {
  requireState(resource.trim() === resource && !/\p{Cc}/u.test(resource), 'resource key is invalid');
  if (!resource.startsWith('file:')) return resource;
  requireState(safeWorkflowOwnedPath(resource.slice(5)), 'resource file path is unsafe');
  return resource.toLowerCase();
}
function coordinationResourceKey(resource: string): string {
  requireState(resource.trim() === resource && !/\p{Cc}/u.test(resource), 'resource key is invalid');
  if (!resource.startsWith('file:')) return resource;
  requireState(safeHistoricalWorkflowOwnedPath(resource.slice(5)), 'resource file path is unsafe');
  return resource.toLowerCase();
}
function validateReferences(refs: readonly ContractReference[]): void {
  for (const ref of refs) requireState(safeWorkflowOwnedPath(ref.path), 'artifact reference path is unsafe');
  unique(
    refs.map((ref) => ref.path.toLowerCase()),
    'artifact paths',
  );
}
function checkedWork(
  value: unknown,
  historicalBindings: ReadonlyMap<string, WorkState['binding']> = new Map(),
): WorkState {
  requireState(validateWork(value), 'work record must match current WorkState/v1');
  const work = value as WorkState,
    binding = work.binding;
  requireState(
    binding.project_ids.every((id, index) => index === 0 || binding.project_ids[index - 1]! < id),
    'work project identity must be an exact sorted set',
  );
  if (work.request_transition) {
    const transition = work.request_transition;
    requireState(
      !/\p{Cc}/u.test(transition.request_pointer + transition.native_session_handle) &&
        transition.successor_work_id !== binding.lifecycle_work_id &&
        transition.predecessor_work_ids.every(
          (id, index) =>
            id !== binding.lifecycle_work_id && (index === 0 || transition.predecessor_work_ids[index - 1]! < id),
        ),
      'request transition identity invalid',
    );
  }
  validateLifecycleAggregate(work);
  if (work.migration) {
    const migration = work.migration;
    requireState(
      migration.source_work_id === binding.lifecycle_work_id &&
        migration.source_revision === binding.work_source_revision &&
        migration.continuation_run_id === work.execution.run_id &&
        migration.migration_id === workMigrationId(migration),
      'migration lineage identity invalid',
    );
    if (migration.source_schema === 'CoordinationTicket/v1')
      requireState(
        migration.original_run_id === null &&
          migration.source_ticket.ticket_id.length > 0 &&
          migration.source_ticket.thread_id.length > 0 &&
          migration.source_ticket.generation >= 1 &&
          migration.source_ticket.contour_keys.length > 0 &&
          migration.source_ticket.exclusive_resources.length > 0,
        'coordination ticket migration lineage is incomplete',
      );
    if (migration.rebind_status === 'pending')
      requireState(
        migration.continuation_run_id === null &&
          work.execution.run_id === null &&
          work.execution.status === 'suspended' &&
          work.lease === null &&
          work.execution.assignment_attempts.length === 0,
        'pending migration cannot execute',
      );
    else
      requireState(
        typeof work.execution.run_id === 'string' &&
          work.execution.run_id.length > 0 &&
          migration.rebind_receipt?.issued_run_id === work.execution.run_id,
        'accepted migration requires a host-issued run',
      );
    if (migration.rebind_receipt)
      requireState(
        identityKey(migration.rebind_receipt.identity) === identityKey(workIdentity(work)) &&
          migration.rebind_receipt.source_sha256 === migration.source_sha256 &&
          migration.rebind_receipt.migration_id === migration.migration_id &&
          migration.rebind_receipt.issued_run_id === migration.continuation_run_id &&
          migration.rebind_receipt.rebind_id ===
            canonicalJsonDigest({
              identity: migration.rebind_receipt.identity,
              migration_id: migration.migration_id,
              source_sha256: migration.source_sha256,
              principal: migration.rebind_receipt.principal,
              decision_pointer: migration.rebind_receipt.decision_pointer,
            }),
        'migration rebind receipt differs from lineage',
      );
  } else
    requireState(
      typeof work.execution.run_id === 'string' && work.execution.run_id.length > 0,
      'run identity required',
    );
  requireState(binding.implementation_paths.every(safeWorkflowOwnedPath), 'implementation path is unsafe');
  unique(
    binding.implementation_paths.map((path) => path.toLowerCase()),
    'implementation paths',
  );
  unique(binding.allowed_resources.map(resourceKey), 'allowed resources');
  requireState(
    binding.implementation_paths.every((path) => binding.allowed_resources.includes('file:' + path)),
    'implementation path is outside resource scope',
  );
  requireState(
    work.contracts.scope.sha256 === binding.scope_contract_digest &&
      work.contracts.acceptance.sha256 === binding.acceptance_manifest_digest,
    'contract reference digest differs from work binding',
  );
  validateReferences([work.contracts.scope, work.contracts.acceptance, ...work.contracts.decisions, ...work.artifacts]);
  unique(
    work.artifacts.map((ref) => ref.artifact_id),
    'artifact identifiers',
  );
  for (const ref of work.artifacts)
    requireState(
      ref.source_revision === binding.work_source_revision &&
        ref.scope_id === binding.scope_id &&
        ref.ac_ids.every((id) => binding.ac_ids.includes(id)),
      'artifact reference has foreign authority binding',
    );
  unique(
    work.execution.assignment_attempts.map((attempt) => attempt.attempt_id),
    'attempt identifiers',
  );
  const latest = new Map<string, AssignmentAttempt>();
  for (const attempt of work.execution.assignment_attempts) {
    const slot = canonicalJson({ stage_id: attempt.stage_id, assignment_index: attempt.assignment_index });
    const previous = latest.get(slot);
    requireState(attempt.previous_attempt_id === (previous?.attempt_id ?? null), 'attempt chain invalid');
    if (previous)
      requireState(
        (previous.correction_generation === attempt.correction_generation &&
          previous.status === 'no_effect' &&
          previous.request_digest === attempt.request_digest &&
          canonicalJsonDigest(previous.reconciliation!.retry_lease) === canonicalJsonDigest(attempt.lease)) ||
          (previous.status === 'completed' &&
            attempt.correction_generation > previous.correction_generation &&
            attempt.correction_authorization !== null),
        'retry lacks exact predecessor authorization',
      );
    latest.set(slot, attempt);
    requireState(
      attempt.correction_generation <= work.lifecycle.assurance.correction_count &&
        (attempt.correction_generation === 0
          ? attempt.correction_authorization === null
          : attempt.correction_authorization !== null &&
            work.lifecycle.references.some(
              (ref) =>
                ref.kind === 'correction_authorization' &&
                ref.decision === 'approved' &&
                ref.artifact_schema === attempt.correction_authorization!.schema &&
                ref.path === attempt.correction_authorization!.path &&
                ref.sha256 === attempt.correction_authorization!.sha256,
            )),
      'corrective assignment authority missing',
    );
    const historicalBinding = historicalBindings.get(attempt.attempt_id);
    requireState(
      !historicalBinding || ['completed', 'no_effect'].includes(attempt.status),
      'historical runtime binding cannot authorize active attempt',
    );
    const assignmentWork = historicalBinding ? { ...work, binding: historicalBinding } : work;
    requireState(
      attempt.assignment_id ===
        assignmentIdentity(
          assignmentWork,
          attempt.stage_id,
          attempt.assignment_index,
          attempt.correction_generation,
          attempt.correction_authorization,
        ),
      'attempt assignment binding invalid',
    );
    requireState(
      attempt.attempt_id ===
        canonicalJsonDigest({
          assignment_id: attempt.assignment_id,
          request_digest: attempt.request_digest,
          lease: attempt.lease,
          previous_attempt_id: attempt.previous_attempt_id,
        }),
      'attempt identity invalid',
    );
    requireState(
      attempt.status === 'completed'
        ? attempt.result_digest === canonicalJsonDigest(attempt.result)
        : attempt.result === null && attempt.result_digest === null,
      'attempt result binding invalid',
    );
    const authorization = attempt.reconciliation;
    requireState(attempt.status !== 'no_effect' || authorization !== null, 'no-effect proof required');
    if (authorization) {
      requireState(
        authorization.outcome === attempt.status &&
          authorization.attempt_id === attempt.attempt_id &&
          authorization.request_digest === attempt.request_digest &&
          authorization.work_binding_digest === canonicalJsonDigest(assignmentWork.binding) &&
          authorization.work_version.revision < work.revision &&
          authorization.result_digest === attempt.result_digest,
        'reconciliation authority binding invalid',
      );
      validateReferences([
        authorization.provider_evidence,
        ...(authorization.decision ? [authorization.decision] : []),
      ]);
      if (authorization.decision)
        requireState(
          work.contracts.decisions.some(
            (ref) => canonicalJsonDigest(ref) === canonicalJsonDigest(authorization.decision),
          ),
          'reconciliation decision is not bound to work',
        );
      if (attempt.status === 'no_effect')
        requireState(
          authorization.decision &&
            authorization.retry_lease &&
            authorization.retry_lease.ticket_id === attempt.lease.ticket_id &&
            authorization.retry_lease.generation > attempt.lease.generation,
          'retry requires a decision and newer same-ticket fence',
        );
      else requireState(authorization.retry_lease === null, 'completed reconciliation cannot authorize retry');
    }
  }
  return work;
}
/** Operational binding proof is exact and immutable; it never grants current assignment authority. */
function checkedStoredWork(
  database: Database,
  workspaceId: string,
  value: unknown,
  pendingReceipt?: RuntimeCodeRebindReceipt,
): WorkState {
  const candidate = value as WorkState,
    bindings = new Map<string, WorkState['binding']>();
  const table = database
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_runtime_code_rebind'")
    .get();
  const records: RuntimeCodeRebindReceipt[] = [];
  if (table) {
    const rows = database
      .query(
        'SELECT payload,digest,action_id,attempt FROM agent_host_runtime_code_rebind WHERE workspace_id=? AND work_id=?',
      )
      .all(workspaceId, candidate.binding?.lifecycle_work_id) as {
      payload: string;
      digest: string;
      action_id: string;
      attempt: number;
    }[];
    for (const row of rows) {
      const receipt = JSON.parse(row.payload) as RuntimeCodeRebindReceipt;
      requireState(canonicalJsonDigest(receipt) === row.digest, 'runtime binding history receipt checksum differs');
      if (receipt.binding_history) {
        requireState(
          receipt.action_id === row.action_id && receipt.attempt === row.attempt,
          'runtime binding history row identity differs',
        );
        records.push(receipt);
      }
    }
  }
  if (pendingReceipt) records.push(pendingReceipt);
  records.sort((a, b) => b.prior_work_version.revision - a.prior_work_version.revision);
  let expected = candidate.binding;
  for (const receipt of records) {
    const history = receipt.binding_history;
    requireState(
      history?.schema === 'RuntimeCodeRebindHistory/v1' &&
        Array.isArray(history.terminal_attempt_ids) &&
        new Set(history.terminal_attempt_ids).size === history.terminal_attempt_ids.length &&
        receipt.schema === 'VidaRuntimeCodeRebindAuthorization/v1' &&
        sameJson(receipt.identity, workIdentity(candidate)) &&
        receipt.request_digest === canonicalJsonDigest(receipt.request) &&
        sameJson(receipt.request.identity, receipt.identity) &&
        receipt.request.attempt === receipt.attempt &&
        receipt.request.actionId === receipt.action_id &&
        receipt.request.issueId === receipt.issue_id &&
        sameJson(receipt.request.expectedWork, receipt.prior_work_version) &&
        receipt.prior_work_version.revision < candidate.revision &&
        sameJson(receipt.request.expectedJournal, receipt.journal_version),
      'runtime binding history authority differs',
    );
    const original = history.original_work as WorkState,
      successor = history.successor_binding as WorkState['binding'];
    requireState(
      original?.schema === 'WorkState/v1' &&
        original.workspace_id === workspaceId &&
        sameJson(workIdentity(original), receipt.identity) &&
        canonicalJsonDigest(original) === receipt.prior_work_version.digest &&
        original.revision === receipt.prior_work_version.revision &&
        candidate.revision > original.revision &&
        sameJson(successor, expected) &&
        sameJson(successor, {
          ...original.binding,
          runtime_code_digest: receipt.new_runtime_code_digest,
          runtime_source_revision: receipt.new_runtime_code_digest,
        }) &&
        original.binding.runtime_code_digest === receipt.old_runtime_code_digest,
      'runtime binding history transition is not continuous',
    );
    const journal = history.original_journal as MastraSessionLedgerState;
    requireState(
      canonicalJsonDigest(journal) === receipt.journal_version.digest &&
        journal.workspace_id === workspaceId &&
        journal.work_id === candidate.binding.lifecycle_work_id &&
        journal.attempt === receipt.attempt &&
        journal.run_id === (journal.corrective_execution?.engine_run_id ?? original.execution.run_id),
      'runtime binding history journal differs',
    );
    const selected = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)].find(
      (item) => item.request.action_id === receipt.action_id,
    );
    requireState(
      selected &&
        (receipt.request.synthesisCorrection ? selected.issue_id === null : selected.issue_id === receipt.issue_id),
      'runtime binding history original issue differs',
    );
    requireState(
      sameJson(
        history.terminal_attempt_ids,
        original.execution.assignment_attempts
          .filter((attempt) => ['completed', 'no_effect'].includes(attempt.status))
          .map((attempt) => attempt.attempt_id),
      ) &&
        original.execution.assignment_attempts.every((attempt) => ['completed', 'no_effect'].includes(attempt.status)),
      'runtime binding history contains unknown or unlisted attempts',
    );
    for (const id of history.terminal_attempt_ids) {
      const old = original.execution.assignment_attempts.find((attempt) => attempt.attempt_id === id),
        current = candidate.execution.assignment_attempts.find((attempt) => attempt.attempt_id === id);
      requireState(old && current && sameJson(old, current), 'runtime binding history terminal result changed');
      bindings.set(id, original.binding);
    }
    expected = original.binding;
  }
  return checkedWork(value, bindings);
}

function assignmentIdentity(
  work: WorkState,
  stageId: string,
  assignmentIndex: number,
  correctionGeneration = 0,
  authority: ContractReference | null = null,
): string {
  requireState(typeof work.execution.run_id === 'string' && work.execution.run_id.length > 0, 'run identity required');
  const base = canonicalJsonDigest({
    binding: work.binding,
    run_id: work.execution.run_id,
    input_digest: work.execution.input_digest,
    stage_id: stageId,
    assignment_index: assignmentIndex,
  });
  return correctionGeneration === 0
    ? base
    : canonicalJsonDigest({
        base_assignment_id: base,
        correction_generation: correctionGeneration,
        correction_authorization: authority,
      });
}
export function workMigrationId(
  value: Pick<
    WorkMigrationLineage,
    'source_schema' | 'source_sha256' | 'source_work_id' | 'source_revision' | 'original_run_id'
  >,
): string {
  return canonicalJsonDigest({
    source_schema: value.source_schema,
    source_sha256: value.source_sha256,
    source_work_id: value.source_work_id,
    source_revision: value.source_revision,
    original_run_id: value.original_run_id,
  });
}
function checkedLedger(value: unknown): CoordinationLedger {
  const result = validateCoordinationLedgerV1(value, { currentTimeMs: Date.now() });
  requireState(result.ok, result.issues[0]?.message ?? 'ledger record must match current CoordinationLedger/v1');
  return result.ledger;
}
function identityKey(identity: WorkIdentity): string {
  assertCanonicalJsonValue(identity, '$');
  requireState(
    Object.keys(identity).length === 4 &&
      ['repository_id', 'project_ids', 'integrations_digest', 'work_id'].every((key) => Object.hasOwn(identity, key)),
    'work identity fields invalid',
  );
  requireState(
    Array.isArray(identity.project_ids) &&
      identity.project_ids.length > 0 &&
      identity.project_ids.every(
        (value, index) =>
          typeof value === 'string' && value.length > 0 && (index === 0 || identity.project_ids[index - 1]! < value),
      ),
    'work identity project ids invalid',
  );
  requireState(
    [identity.repository_id, identity.integrations_digest, identity.work_id].every(
      (value) => typeof value === 'string' && value.length > 0 && value.length <= 2048,
    ),
    'work identity invalid',
  );
  return JSON.stringify([identity.repository_id, identity.project_ids, identity.integrations_digest, identity.work_id]);
}
function workIdentity(work: WorkState): WorkIdentity {
  const binding = work.binding as WorkExecutionContext['binding'] & {
    repository_id?: string;
    project_ids?: readonly string[];
    integrations_digest?: string;
  };
  return {
    repository_id: binding.repository_id ?? '',
    project_ids: [...(binding.project_ids ?? [])],
    integrations_digest: binding.integrations_digest ?? '',
    work_id: work.binding.lifecycle_work_id,
  };
}
function ticketIdentity(ticket: CoordinationTicket): WorkIdentity {
  return {
    repository_id: ticket.repository_id,
    project_ids: [...ticket.project_ids],
    integrations_digest: ticket.integrations_digest,
    work_id: ticket.work_id,
  };
}
function validatePair(work: WorkState | null, ledger: CoordinationLedger | null): void {
  if (!work) return;
  requireState(ledger && work.workspace_id === ledger.workspace_id, 'work requires its workspace ledger');
  const tickets = ledger.tickets.filter(
    (ticket) => identityKey(ticketIdentity(ticket)) === identityKey(workIdentity(work)),
  );
  for (const ticket of tickets)
    requireState(
      [...ticket.active_resources, ...ticket.blocked_resources].every((resource) =>
        work.binding.allowed_resources.includes(resource),
      ),
      'ticket exceeds work resource scope',
    );
  if (work.lease) {
    const lease = work.lease;
    const ticket = tickets.find((entry) => entry.ticket_id === lease.ticket_id);
    requireState(
      ticket &&
        ticket.status === 'active' &&
        ticket.thread_id === lease.thread_id &&
        ticket.generation === lease.generation,
      'work lease reference is stale or foreign',
    );
    requireState(
      ticket.blocked_resources.length === 0 &&
        (!ticket.exclusive_resources.some((resource) => resource.startsWith('file:')) ||
          work.binding.implementation_paths.every((path) => ticket.active_resources.includes('file:' + path))),
      'work lease is blocked or incomplete',
    );
  }
}
function sameJson(left: unknown, right: unknown): boolean {
  return canonicalJson(left) === canonicalJson(right);
}
function appendOnly<T>(before: readonly T[], after: readonly T[], id: (value: T) => string, label: string): void {
  const next = new Map(after.map((value) => [id(value), canonicalJson(value)]));
  for (const value of before)
    requireState(next.get(id(value)) === canonicalJson(value), label + ' cannot be removed or replaced');
}
function recordId(value: Readonly<Record<string, unknown>>, field: string, label: string): string {
  const id = value[field];
  requireState(typeof id === 'string' && id.length > 0, label + ' identifier missing');
  return id;
}
function contourComponent(ledger: CoordinationLedger, seed: CoordinationTicket): readonly CoordinationTicket[] {
  const selected = new Set([seed.ticket_id]);
  const queue = [seed];
  while (queue.length > 0) {
    const ticket = queue.shift();
    requireState(ticket, 'contour traversal failed');
    const keys = new Set(ticket.exclusive_resources.map(coordinationResourceKey));
    for (const candidate of ledger.tickets) {
      if (
        selected.has(candidate.ticket_id) ||
        candidate.generation !== seed.generation ||
        ['read_only', 'released'].includes(candidate.status) ||
        !candidate.exclusive_resources.some((key) => keys.has(coordinationResourceKey(key)))
      )
        continue;
      selected.add(candidate.ticket_id);
      queue.push(candidate);
    }
  }
  return ledger.tickets
    .filter((ticket) => selected.has(ticket.ticket_id))
    .sort((left, right) => left.sequence - right.sequence);
}
function validateMutableHistories(before: CoordinationLedger, ledger: CoordinationLedger, ownerKey: string): void {
  const priorNotices = new Map(before.notices.map((notice) => [recordId(notice, 'notice_id', 'notices'), notice]));
  requireState(
    [...priorNotices.keys()].every((id, index) => ledger.notices[index]?.notice_id === id),
    'existing notice order cannot change',
  );
  for (const notice of ledger.notices) {
    const prior = priorNotices.get(String(notice.notice_id));
    if (!prior) continue;
    const owner = ledger.tickets.find((ticket) => ticket.ticket_id === notice.owner_ticket_id);
    const contender = ledger.tickets.find((ticket) => ticket.ticket_id === notice.contender_ticket_id);
    const authority = [owner, contender].some((ticket) => ticket && identityKey(ticketIdentity(ticket)) === ownerKey);
    const immutable = (value: Readonly<Record<string, unknown>>) => ({
      schema: value.schema,
      notice_id: value.notice_id,
      generation: value.generation,
      contender_ticket_id: value.contender_ticket_id,
      contender_work_id: value.contender_work_id,
      owner_ticket_id: value.owner_ticket_id,
      owner_work_id: value.owner_work_id,
      owner_thread_id: value.owner_thread_id,
      resources: value.resources,
      created_at: value.created_at,
    });
    const changed = canonicalJsonDigest(prior) !== canonicalJsonDigest(notice);
    requireState(!changed || authority, 'foreign notice mutation forbidden');
    requireState(
      canonicalJsonDigest(immutable(prior)) === canonicalJsonDigest(immutable(notice)),
      'notice authority changed',
    );
    appendOnly(
      prior.acknowledgements as readonly Readonly<Record<string, unknown>>[],
      notice.acknowledgements as readonly Readonly<Record<string, unknown>>[],
      (entry) => String(entry.actor),
      'notice acknowledgements',
    );
    const transition = String(prior.status) + '->' + String(notice.status);
    requireState(
      [
        'open->open',
        'open->acknowledged',
        'open->resolved',
        'acknowledged->acknowledged',
        'acknowledged->resolved',
        'resolved->resolved',
      ].includes(transition),
      'notice status transition invalid',
    );
    if (notice.status === 'acknowledged')
      requireState(
        (notice.acknowledgements as readonly unknown[]).length > 0,
        'acknowledged notice requires an acknowledgement',
      );
    if ((notice.acknowledgements as readonly unknown[]).length > (prior.acknowledgements as readonly unknown[]).length)
      requireState(notice.status !== 'open', 'notice acknowledgement must advance status');
    if (notice.status === 'resolved')
      requireState(
        ledger.dispositions.some((entry) => entry.subject_kind === 'notice' && entry.subject_id === notice.notice_id),
        'resolved notice requires a disposition',
      );
  }
  const priorBatches = new Map(before.batches.map((batch) => [recordId(batch, 'batch_id', 'batches'), batch]));
  requireState(
    [...priorBatches.keys()].every((id, index) => ledger.batches[index]?.batch_id === id),
    'existing batch order cannot change',
  );
  for (const batch of ledger.batches) {
    const prior = priorBatches.get(String(batch.batch_id));
    if (!prior) continue;
    const immutable = (value: Readonly<Record<string, unknown>>) => {
      const { status: _status, decision_pointer: _pointer, ...rest } = value;
      return rest;
    };
    const changed = canonicalJsonDigest(prior) !== canonicalJsonDigest(batch);
    const contour = ledger.contours.find((entry) => entry.contour_id === batch.contour_id);
    const owned = (contour?.ticket_ids as readonly string[] | undefined)?.some((id) => {
      const ticket = ledger.tickets.find((entry) => entry.ticket_id === id);
      return ticket && identityKey(ticketIdentity(ticket)) === ownerKey;
    });
    requireState(!changed || owned, 'foreign batch mutation forbidden');
    requireState(
      canonicalJsonDigest(immutable(prior)) === canonicalJsonDigest(immutable(batch)),
      'release batch authority changed',
    );
    const transition = String(prior.status) + '->' + String(batch.status);
    requireState(
      transition === 'ready_for_user_testing->accepted' ||
        transition === 'ready_for_user_testing->feedback' ||
        transition === 'ready_for_user_testing->rejected' ||
        (prior.status === batch.status && canonicalJsonDigest(prior) === canonicalJsonDigest(batch)),
      'release batch status transition invalid',
    );
  }
}
function validateProgress(
  before: HostStateSnapshot,
  work: WorkState,
  ledger: CoordinationLedger,
  documentationContext?: DocumentationVerificationContext,
): void {
  requireState(
    work.revision === (before.work?.revision ?? 0) + 1 && ledger.revision === (before.ledger?.revision ?? 0) + 1,
    'state revisions must advance exactly once',
  );
  if (before.work) {
    const old = before.work;
    validateLifecycleProgress(old, work, documentationContext);
    requireState(
      sameJson(old.execution.assignment_attempts, work.execution.assignment_attempts),
      'attempt history requires its dedicated transaction',
    );
    requireState(sameJson(old.binding, work.binding), 'work authority changed; explicit rebind required');
    requireState(
      sameJson(old.contracts.scope, work.contracts.scope) &&
        sameJson(old.contracts.acceptance, work.contracts.acceptance),
      'work contract reference changed',
    );
    requireState(
      old.execution.run_id === work.execution.run_id && old.execution.input_digest === work.execution.input_digest,
      'workflow resume identity changed',
    );
    requireState(
      sameJson(old.migration ?? null, work.migration ?? null),
      'migration lineage requires a dedicated rebind transaction',
    );
    requireState(
      sameJson(old.request_transition ?? null, work.request_transition ?? null),
      'request transition requires its dedicated admission transaction',
    );
    appendOnly(old.contracts.decisions, work.contracts.decisions, (ref) => ref.path, 'decision references');
    appendOnly(old.artifacts, work.artifacts, (ref) => ref.artifact_id, 'artifact references');
  }
  if (!before.work) {
    requireState(work.request_transition == null, 'new request lineage requires dedicated successor admission');
    requireState(work.execution.assignment_attempts.length === 0, 'new work cannot import attempt authority');
    requireState(
      !work.migration || work.migration.rebind_status === 'pending',
      'migration rebind requires host authority',
    );
  }
  const ownerKey = identityKey(workIdentity(work));
  if (before.ledger) {
    const generationDelta = ledger.open_generation - before.ledger.open_generation;
    requireState(generationDelta === 0 || generationDelta === 1, 'open generation transition invalid');
    const oldContourIds = new Set(before.ledger.contours.map((entry) => recordId(entry, 'contour_id', 'contours')));
    const newContours = ledger.contours.filter(
      (entry) => !oldContourIds.has(recordId(entry, 'contour_id', 'contours')),
    );
    requireState(
      generationDelta === Number(newContours.length === 1) &&
        (newContours.length === 0 ||
          (newContours[0]?.generation === before.ledger.open_generation &&
            newContours[0]?.frozen === true &&
            (() => {
              const ticketIds = newContours[0]?.ticket_ids as readonly string[];
              const seed = ledger.tickets.find((ticket) => ticket.ticket_id === ticketIds[0]);
              if (!seed) return false;
              const component = contourComponent(ledger, seed);
              return (
                component.every((ticket) => ticket.status === 'ready_for_handoff') &&
                canonicalJsonDigest(ticketIds) === canonicalJsonDigest(component.map((ticket) => ticket.ticket_id)) &&
                canonicalJsonDigest(newContours[0]?.work_ids) ===
                  canonicalJsonDigest(component.map((ticket) => ticket.work_id))
              );
            })())),
      'open generation requires one frozen prior-generation contour',
    );
    const newTickets = ledger.tickets.slice(before.ledger.tickets.length);
    requireState(
      newTickets.every((ticket, index) => ticket.sequence === before.ledger!.next_sequence + index) &&
        ledger.next_sequence === before.ledger.next_sequence + newTickets.length,
      'new tickets must consume the FIFO sequence exactly',
    );
    const oldClaims = new Map(before.ledger.claims.map((claim) => [claim.claim_id, claim]));
    requireState(
      [...oldClaims.keys()].every((id, index) => ledger.claims[index]?.claim_id === id),
      'existing claim order cannot change',
    );
    for (const claim of ledger.claims) {
      const ticket = ledger.tickets.find((entry) => entry.ticket_id === claim.ticket_id);
      const old = oldClaims.get(claim.claim_id);
      if (!old) {
        requireState(ticket && identityKey(ticketIdentity(ticket)) === ownerKey, 'new claim ownership invalid');
        continue;
      }
      if (!ticket || identityKey(ticketIdentity(ticket)) !== ownerKey) {
        requireState(canonicalJsonDigest(old) === canonicalJsonDigest(claim), 'foreign claim mutation forbidden');
        continue;
      }
      requireState(
        old.ticket_id === claim.ticket_id &&
          old.work_id === claim.work_id &&
          (old.status === 'active' || old.thread_id === claim.thread_id) &&
          old.created_at === claim.created_at &&
          (old.status === 'active' || canonicalJsonDigest(old.resources) === canonicalJsonDigest(claim.resources)),
        'claim authority changed',
      );
      requireState(
        old.status === claim.status || (old.status === 'active' && ['released', 'recovered'].includes(claim.status)),
        'claim status transition invalid',
      );
      if (old.status === 'active' && claim.status === 'active')
        requireState(
          claim.resources.every((resource) => old.resources.includes(resource)),
          'active claim resources cannot expand',
        );
      requireState(timestamp(claim.renewed_at) >= timestamp(old.renewed_at), 'claim renewal time regressed');
      requireState(
        old.status === 'active' && claim.status === 'active'
          ? claim.generation >= old.generation
          : claim.generation === old.generation,
        'claim generation transition invalid',
      );
      if (old.thread_id !== claim.thread_id)
        requireState(
          old.status === 'active' && claim.status === 'active' && claim.generation > old.generation,
          'claim thread transition requires a new active fence',
        );
      if (old.status === 'active' && claim.status !== 'active')
        requireState(
          claim.resources.every((resource) => old.resources.includes(resource)),
          'closed claim resources cannot expand',
        );
      if (old.status === 'active' && claim.status === 'active')
        requireState(
          timestamp(claim.lease_expires_at) >= timestamp(old.lease_expires_at),
          'claim lease expiry cannot regress',
        );
      if (
        old.status === 'active' &&
        claim.status === 'active' &&
        timestamp(old.lease_expires_at) <= Date.now() &&
        timestamp(claim.lease_expires_at) > timestamp(old.lease_expires_at)
      )
        requireState(claim.generation > old.generation, 'expired claim renewal requires a new fencing generation');
    }
    validateMutableHistories(before.ledger, ledger, ownerKey);
    const newOperations = ledger.operations.slice(before.ledger.operations.length);
    requireState(
      newOperations.every(
        (operation) =>
          operation.from_ledger_revision === before.ledger!.revision &&
          operation.to_ledger_revision === ledger.revision,
      ),
      'new coordination operation revision binding invalid',
    );
    requireState(
      newOperations.every((operation) => {
        if (operation.kind !== 'release') return true;
        const ticket = ledger.tickets.find((entry) => entry.ticket_id === operation.ticket_id);
        const resources = operation.resources as readonly string[];
        return Boolean(
          ticket &&
          ticket.work_id === operation.work_id &&
          ticket.thread_id === operation.thread_id &&
          ticket.source_revision === operation.source_revision &&
          resources.length > 0 &&
          resources.every(
            (resource) =>
              (resource.startsWith('file:')
                ? safeWorkflowOwnedPath(resource.slice(5))
                : resourceKey(resource) === resource) && ticket.exclusive_resources.includes(resource),
          ),
        );
      }),
      'new release operation ticket binding invalid',
    );
    const newRetirements = ledger.retirements.slice(before.ledger.retirements.length);
    requireState(
      newRetirements.every((retirement) => {
        const target = ledger.tickets.find((ticket) => ticket.ticket_id === retirement.ticket_id);
        const superseding = ledger.tickets.find((ticket) => ticket.ticket_id === retirement.superseding_ticket_id);
        const resources = retirement.resources as readonly string[];
        return Boolean(
          target &&
          superseding &&
          target.work_id === retirement.work_id &&
          target.thread_id === retirement.thread_id &&
          target.status === 'read_only' &&
          target.generation === retirement.generation &&
          target.source_revision === retirement.ticket_source_revision &&
          target.source_revision !== retirement.source_revision &&
          target.active_resources.length === 0 &&
          target.blocked_resources.length === 0 &&
          !ledger.claims.some((claim) => claim.ticket_id === target.ticket_id && claim.status === 'active') &&
          superseding.generation === target.generation &&
          ['queued', 'active', 'ready_for_handoff'].includes(superseding.status) &&
          superseding.source_revision === retirement.source_revision &&
          superseding.source_revision === retirement.superseding_source_revision &&
          resources.every(
            (resource) =>
              resource.startsWith('file:') &&
              safeWorkflowOwnedPath(resource.slice(5)) &&
              target.exclusive_resources.includes(resource),
          ) &&
          superseding.contour_keys.some((key) =>
            target.contour_keys.map(coordinationResourceKey).includes(coordinationResourceKey(key)),
          ),
        );
      }),
      'new retirement ticket binding invalid',
    );
    const newRebinds = ledger.rebinds.slice(before.ledger.rebinds.length);
    requireState(
      newRebinds.every((rebind) => {
        const ticket = ledger.tickets.find((entry) => entry.ticket_id === rebind.ticket_id);
        const resources = rebind.resources as readonly string[];
        const claimedResources = (rebind.claimed_resources as readonly string[] | undefined) ?? [];
        const retiredClaimIds = rebind.retired_claim_ids as readonly string[];
        return Boolean(
          ticket &&
          ticket.work_id === rebind.work_id &&
          ticket.thread_id === rebind.thread_id &&
          ticket.source_revision === rebind.source_revision &&
          resources.every(
            (resource) =>
              ((resource.startsWith('file:') && safeWorkflowOwnedPath(resource.slice(5))) ||
                resource === `execution:${rebind.work_id}`) &&
              ticket.exclusive_resources.includes(resource),
          ) &&
          claimedResources.every(
            (resource) => resources.includes(resource) && ticket.active_resources.includes(resource),
          ) &&
          retiredClaimIds.every((id) => {
            const claim = ledger.claims.find((entry) => entry.claim_id === id);
            return Boolean(claim && claim.status !== 'active');
          }) &&
          (rebind.previous_ticket_id === null ||
            ledger.tickets.some((entry) => entry.ticket_id === rebind.previous_ticket_id)),
        );
      }),
      'new coordination rebind binding invalid',
    );
    requireState(
      ledger.notices
        .slice(before.ledger.notices.length)
        .every((notice) => notice.status === 'open' && (notice.acknowledgements as readonly unknown[]).length === 0) &&
        ledger.batches
          .slice(before.ledger.batches.length)
          .every((batch) => batch.status === 'ready_for_user_testing') &&
        ledger.rebinds
          .slice(before.ledger.rebinds.length)
          .every(
            (rebind) =>
              rebind.from_ledger_revision === before.ledger!.revision && rebind.to_ledger_revision === ledger.revision,
          ) &&
        ledger.retirements
          .slice(before.ledger.retirements.length)
          .every(
            (retirement) =>
              retirement.from_ledger_revision === before.ledger!.revision &&
              retirement.to_ledger_revision === ledger.revision &&
              retirement.from_revision === before.work?.revision &&
              retirement.to_revision === work.revision,
          ),
      'new coordination history transition invalid',
    );
    const ownsTicket = (ticketId: unknown) => {
      const ticket = ledger.tickets.find((entry) => entry.ticket_id === ticketId);
      return Boolean(ticket && identityKey(ticketIdentity(ticket)) === ownerKey);
    };
    const ownsContour = (contourId: unknown) => {
      const contour = ledger.contours.find((entry) => entry.contour_id === contourId);
      return Boolean(contour && (contour.ticket_ids as readonly string[]).some((ticketId) => ownsTicket(ticketId)));
    };
    requireState(
      ledger.dispositions.slice(before.ledger.dispositions.length).every((entry) => {
        if (entry.subject_kind === 'claim') {
          const claim = ledger.claims.find((claim) => claim.claim_id === entry.subject_id);
          return Boolean(claim && ownsTicket(claim.ticket_id));
        }
        const notice = ledger.notices.find((notice) => notice.notice_id === entry.subject_id);
        return Boolean(notice && (ownsTicket(notice.owner_ticket_id) || ownsTicket(notice.contender_ticket_id)));
      }) &&
        ledger.rebinds.slice(before.ledger.rebinds.length).every((entry) => ownsTicket(entry.ticket_id)) &&
        newOperations.every((entry) =>
          entry.kind === 'release'
            ? ownsTicket(entry.ticket_id)
            : entry.integration_work_id === work.binding.lifecycle_work_id && ownsContour(entry.contour_id),
        ) &&
        ledger.retirements.slice(before.ledger.retirements.length).every((entry) => ownsTicket(entry.ticket_id)) &&
        ledger.contours.slice(before.ledger.contours.length).every((entry) => ownsContour(entry.contour_id)) &&
        ledger.batches.slice(before.ledger.batches.length).every((entry) => ownsContour(entry.contour_id)),
      'new coordination history ownership invalid',
    );
    for (const [field, id] of [
      ['dispositions', 'disposition_id'],
      ['contours', 'contour_id'],
      ['rebinds', 'rebind_id'],
      ['operations', 'operation_id'],
      ['retirements', 'retirement_id'],
    ] as const)
      appendOnly(before.ledger[field], ledger[field], (entry) => recordId(entry, id, field), field);
  }
  if (!before.ledger)
    requireState(
      ledger.tickets.every((ticket, index) => ticket.sequence === index + 1) &&
        ledger.next_sequence === ledger.tickets.length + 1 &&
        [
          ledger.notices,
          ledger.dispositions,
          ledger.contours,
          ledger.batches,
          ledger.rebinds,
          ledger.operations,
          ledger.retirements,
        ].every((history) => history.length === 0),
      'initial ledger must contain only exactly sequenced tickets and claims',
    );
  const oldTickets = new Map((before.ledger?.tickets ?? []).map((ticket) => [ticket.ticket_id, ticket]));
  const nextTickets = new Map(ledger.tickets.map((ticket) => [ticket.ticket_id, ticket]));
  requireState(
    [...oldTickets.keys()].every((id, index) => ledger.tickets[index]?.ticket_id === id),
    'existing ticket order cannot change',
  );
  for (const old of oldTickets.values()) {
    const next = nextTickets.get(old.ticket_id);
    requireState(next, 'tickets cannot be deleted; revoke with a new generation');
    requireState(
      identityKey(ticketIdentity(next)) === identityKey(ticketIdentity(old)),
      'ticket work identity changed',
    );
    requireState(
      old.source_revision === next.source_revision &&
        old.sequence === next.sequence &&
        canonicalJsonDigest(old.contour_keys) === canonicalJsonDigest(next.contour_keys) &&
        canonicalJsonDigest(old.exclusive_resources) === canonicalJsonDigest(next.exclusive_resources),
      'ticket authority changed',
    );
    if (identityKey(ticketIdentity(old)) !== ownerKey)
      requireState(canonicalJsonDigest(old) === canonicalJsonDigest(next), 'foreign ticket mutation forbidden');
    if (['released', 'read_only'].includes(old.status))
      requireState(canonicalJsonDigest(old) === canonicalJsonDigest(next), 'terminal ticket mutation forbidden');
  }
  for (const ticket of ledger.tickets) {
    const old = oldTickets.get(ticket.ticket_id);
    if (!old)
      requireState(
        identityKey(ticketIdentity(ticket)) === ownerKey && ticket.generation === ledger.open_generation,
        'new ticket ownership or generation invalid',
      );
    else {
      const authorityChanged =
        old.thread_id !== ticket.thread_id ||
        old.status !== ticket.status ||
        (old.expires_at !== null && old.expires_at !== ticket.expires_at && timestamp(old.expires_at) <= Date.now()) ||
        canonicalJsonDigest(old.claim_ids) !== canonicalJsonDigest(ticket.claim_ids) ||
        canonicalJsonDigest([...old.active_resources].sort()) !==
          canonicalJsonDigest([...ticket.active_resources].sort()) ||
        canonicalJsonDigest([...old.blocked_resources].sort()) !==
          canonicalJsonDigest([...ticket.blocked_resources].sort());
      const generationDelta = ticket.generation - old.generation;
      const noEffectRetryFence =
        generationDelta === 1 &&
        !authorityChanged &&
        work.lease?.ticket_id === ticket.ticket_id &&
        work.lease.thread_id === ticket.thread_id &&
        work.lease.generation === ticket.generation &&
        work.execution.assignment_attempts.some(
          (attempt) =>
            attempt.status === 'no_effect' &&
            attempt.lease.ticket_id === ticket.ticket_id &&
            canonicalJsonDigest(attempt.reconciliation?.retry_lease) === canonicalJsonDigest(work.lease),
        );
      requireState(
        (generationDelta === 0 || generationDelta === 1) &&
          (old.thread_id === ticket.thread_id || generationDelta === 1) &&
          (authorityChanged || generationDelta === 0 || noEffectRetryFence),
        'ticket fencing generation invalid',
      );
    }
  }
}
function version(value: WorkState | CoordinationLedger | null): StateVersion | null {
  return value ? { revision: value.revision, digest: canonicalJsonDigest(value) } : null;
}
function matchesExpected(actual: StateVersion | null, expected: StateVersion | null): void {
  if (expected !== null)
    requireState(
      expected &&
        Object.keys(expected).length === 2 &&
        Number.isSafeInteger(expected.revision) &&
        expected.revision > 0 &&
        hashPattern.test(expected.digest),
      'expected state version invalid',
    );
  requireState(
    actual?.revision === expected?.revision && actual?.digest === expected?.digest,
    'state compare-and-swap conflict',
  );
}
function expectedAttemptReconciliation(
  input: WorkflowAttemptReconciliationRequest,
  work: WorkState,
  attempt: AssignmentAttempt,
  principal: string,
): WorkflowAttemptReconciliationAuthorization {
  return {
    schema: 'WorkflowAttemptReconciliationAuthorization/v1',
    principal,
    work_binding_digest: canonicalJsonDigest(work.binding),
    work_version: input.expectedWork,
    ledger_version: input.expectedLedger,
    attempt_id: attempt.attempt_id,
    request_digest: attempt.request_digest,
    outcome: input.outcome,
    result_digest: input.outcome === 'completed' ? canonicalJsonDigest(input.result) : null,
    provider_evidence: input.providerEvidence,
    decision: input.decision,
    retry_lease: input.retryLease,
  };
}

/** Read canonical existing rows without creating a database, schema, journal mode or authority. */
export function inspectHostWorkspaceDatabase(
  databasePath: string,
  workspaceId: string,
): {
  readonly schema: 'HostWorkspaceInspection/v1';
  readonly workspace_id: string;
  readonly work: readonly {
    readonly identity: WorkIdentity;
    readonly version: StateVersion;
    readonly state: WorkState;
  }[];
  readonly ledger: CoordinationLedger | null;
  readonly ledger_version: StateVersion | null;
  readonly journals: readonly {
    readonly work_id: string;
    readonly attempt: number;
    readonly version: StateVersion;
    readonly state: Readonly<Record<string, unknown>>;
  }[];
  readonly governance: readonly {
    readonly store_id: string;
    readonly kind: string;
    readonly record_key: string;
    readonly version: StateVersion;
    readonly state: Readonly<Record<string, unknown>>;
  }[];
  readonly admission_attempts: readonly Readonly<Record<string, unknown>>[];
} {
  requireState(path.isAbsolute(databasePath) && hashPattern.test(workspaceId), 'workspace inspection identity invalid');
  const stat = lstatSync(databasePath);
  requireState(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'workspace inspection database is unsafe');
  const database = new Database(databasePath, { readonly: true, strict: true });
  try {
    return database
      .transaction(() => {
        requireState(
          (database.query('PRAGMA quick_check').get() as { quick_check: string })?.quick_check === 'ok',
          'workspace inspection database integrity failed',
        );
        assertConsumerAdmissionMetadata(database, workspaceId);
        const rows = database
          .query('SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id')
          .all(workspaceId) as { kind: string; id: string; revision: number; payload: string; digest: string }[];
        let ledger: CoordinationLedger | null = null;
        const work: { identity: WorkIdentity; version: StateVersion; state: WorkState }[] = [];
        for (const row of rows) {
          const value = JSON.parse(row.payload);
          requireState(
            canonicalJsonDigest(value) === row.digest &&
              value.revision === row.revision &&
              value.workspace_id === workspaceId,
            'workspace inspection row integrity differs',
          );
          if (row.kind === 'work') {
            const state = checkedStoredWork(database, workspaceId, value),
              identity = workIdentity(state);
            requireState(identityKey(identity) === row.id, 'workspace inspection work key differs');
            work.push({ identity, version: { revision: row.revision, digest: row.digest }, state });
          } else {
            requireState(
              row.kind === 'ledger' && row.id === 'shared' && ledger === null,
              'workspace inspection state kind invalid',
            );
            ledger = checkedLedger(value);
          }
        }
        for (const entry of work)
          requireState(
            ledger && (validatePair(entry.state, ledger), true),
            'workspace inspection coordination unavailable',
          );
        const hasJournals = Boolean(
          database
            .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_mastra_session_ledger'")
            .get(),
        );
        const journalRows = hasJournals
          ? (database
              .query(
                'SELECT work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? ORDER BY work_id,attempt',
              )
              .all(workspaceId) as {
              work_id: string;
              attempt: number;
              revision: number;
              payload: string;
              digest: string;
            }[])
          : [];
        const journals = journalRows.map((row) => {
          const state = JSON.parse(row.payload) as Record<string, unknown>;
          const owner = work.find((entry) => entry.identity.work_id === row.work_id);
          requireState(
            owner &&
              canonicalJsonDigest(state) === row.digest &&
              state.schema === 'MastraSessionLedger/v1' &&
              state.workspace_id === workspaceId &&
              state.work_id === row.work_id &&
              state.attempt === row.attempt &&
              state.run_id === owner.state.execution.run_id &&
              Array.isArray(state.items) &&
              Array.isArray(state.completed),
            'workspace inspection journal integrity differs',
          );
          return {
            work_id: row.work_id,
            attempt: row.attempt,
            version: { revision: row.revision, digest: row.digest },
            state,
          };
        });
        const governance = database
          .query(
            'SELECT store_id,kind,record_key,revision,payload,digest FROM agent_host_governance WHERE workspace_id=? ORDER BY store_id,kind,record_key',
          )
          .all(workspaceId)
          .map((value) => {
            const row = value as {
              store_id: string;
              kind: string;
              record_key: string;
              revision: number;
              payload: string;
              digest: string;
            };
            const state = JSON.parse(row.payload) as Record<string, unknown>;
            requireState(
              canonicalJsonDigest({
                workspace_id: workspaceId,
                store_id: row.store_id,
                kind: row.kind,
                record_key: row.record_key,
                revision: row.revision,
                payload: state,
              }) === row.digest && ['operation', 'approval'].includes(row.kind),
              'workspace inspection governance integrity differs',
            );
            return {
              store_id: row.store_id,
              kind: row.kind,
              record_key: row.record_key,
              version: { revision: row.revision, digest: row.digest },
              state,
            };
          });
        return freezeJsonValue({
          schema: 'HostWorkspaceInspection/v1' as const,
          workspace_id: workspaceId,
          work,
          ledger,
          ledger_version: version(ledger),
          journals,
          governance,
          admission_attempts: database
            .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_admission_attempt'")
            .get()
            ? (database
                .query(
                  'SELECT generation,work_id,attempt,request_digest FROM agent_host_admission_attempt WHERE workspace_id=? ORDER BY generation,work_id,attempt',
                )
                .all(workspaceId) as Record<string, unknown>[])
            : [],
        });
      })
      .deferred();
  } finally {
    database.close();
  }
}

export function openHostStateDatabase(databasePath: string): Database {
  requireState(
    typeof databasePath === 'string' && path.isAbsolute(databasePath),
    'host state requires an absolute file-backed database path',
  );
  const database = new Database(databasePath, { create: true, strict: true });
  try {
    database.exec('PRAGMA journal_mode=WAL');
    database.exec('PRAGMA synchronous=FULL');
    database.exec('PRAGMA busy_timeout=1000');
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

function assertConsumerAdmissionMetadata(database: Database, workspaceId: string): void {
  if (
    !database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_consumer_migration'").get()
  )
    return;
  const baseline = database
    .query('SELECT operation_id FROM agent_host_consumer_migration WHERE workspace_id=? LIMIT 1')
    .get(workspaceId);
  requireState(
    !baseline ||
      database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_admission_attempt'").get(),
    'consumer baseline admission metadata missing',
  );
}

/** SQLite's process-owned writer lock is released on termination; no persistent liveness marker is created. */
export function withHostStateExclusiveTransaction<T>(databasePath: string, operation: () => T): T {
  const database = openHostStateDatabase(databasePath);
  try {
    return database.transaction(operation).immediate();
  } finally {
    database.close();
  }
}

/** Package-owned consumer migration permission: local state consistency, never lifecycle acceptance. */
export async function runConsumerMigrationState<T>(
  input: {
    readonly repositoryRoot: string;
    readonly operationId: string;
    readonly actor: string;
    readonly mode: 'baseline' | 'restore';
  },
  files: (bindings: {
    readonly database_path: string;
    readonly workflow_database_path: string;
    readonly backup: Uint8Array | null;
  }) => T,
): Promise<{
  readonly schema: 'ConsumerMigrationState/v1';
  readonly operation_id: string;
  readonly status: 'baseline' | 'restored';
  readonly result: T;
}> {
  requireState(
    /^[a-z0-9][a-z0-9-]{0,79}$/.test(input.operationId) &&
      input.actor.trim().length > 0 &&
      !/\p{Cc}/u.test(input.actor),
    'consumer migration attribution invalid',
  );
  const { loadRuntimeConfig, runtimeConfigDigest, runtimePackageAccess } = await import('./config/runtime-config.js');
  const { requireSafeRepositoryAccess } = await import('./config/safe-repository-access.js');
  const { loadProjectSetContext } = await import('./config/project-context.js');
  const { snapshotRuntimePackageSources } = await import('./orchestration/scoped-source-snapshot.js');
  const { sessionHandoffDatabasePath } = await import('./orchestration/persistent-session-handoff.js');
  const { sessionBridgeDatabasePath } = await import('./orchestration/mastra-session-bridge.js');
  const config = loadRuntimeConfig(input.repositoryRoot),
    access = requireSafeRepositoryAccess(input.repositoryRoot);
  const projectIds = config.projects.map((project) => project.project_id).sort();
  loadProjectSetContext(input.repositoryRoot, config, config.repository.repository_id, projectIds);
  const databasePath = sessionHandoffDatabasePath(input.repositoryRoot, config);
  const relativeDatabase = path.relative(input.repositoryRoot, databasePath).split(path.sep).join('/');
  if (input.mode === 'restore') access.readBytes(relativeDatabase, 'existing consumer migration canonical database');
  else access.ensureDirectory(config.control.work_root, 'consumer migration canonical state root');
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, input.repositoryRoot);
  if (access.fileExists(relativeDatabase, 'consumer migration canonical database')) {
    const probe = new Database(databasePath, { readonly: true, strict: true });
    try {
      assertConsumerAdmissionMetadata(probe, workspaceId);
    } finally {
      probe.close();
    }
  }
  const database = openHostStateDatabase(databasePath);
  const packageSource = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    config.runtime.bundle,
    ['src/host-state.ts', 'src/orchestration/local-work-admission.ts', 'bin/run.mjs'].map(
      (item) => config.runtime.bundle + '/' + item,
    ),
  );
  const context = {
    repository_id: config.repository.repository_id,
    project_ids: projectIds,
    repository_root: input.repositoryRoot,
    operation_id: input.operationId,
    actor: input.actor,
    config_digest: runtimeConfigDigest(config),
  };
  const binding: MaintenanceFenceBinding = {
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: projectIds,
    operation_id: input.operationId,
    manifest_digest: canonicalJsonDigest({ kind: 'consumer-migration', context }),
    request_digest: canonicalJsonDigest(context),
    bindings_digest: canonicalJsonDigest(context),
    closure_digest: canonicalJsonDigest({ operation_id: input.operationId, closure: 'settled-consumer-state' }),
    bundle_digest: packageSource.digest,
  };
  const verifier: MaintenanceReleaseVerifier = {
    principal: 'vida:consumer-migration',
    projectIds,
    verify(fence) {
      const row = database
        .query('SELECT payload,digest FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?')
        .get(workspaceId, input.operationId) as { payload: string; digest: string } | null;
      if (!row) return null;
      const state = JSON.parse(row.payload) as { status: string; binding: unknown };
      if (
        createHash('sha256').update(row.payload).digest('hex') !== row.digest ||
        !sameJson(state.binding, binding) ||
        !['baseline', 'restored'].includes(state.status)
      )
        return null;
      return {
        schema: 'MaintenanceReleaseAuthorization/v1',
        principal: 'vida:consumer-migration',
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  };
  try {
    const store = new HostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      verifier,
      input.repositoryRoot,
    );
    const token = canonicalJsonDigest(context).slice(0, 32);
    // Persisted operation identity deterministically recovers the same held fence after interruption.
    const receipt = store.acquireMaintenanceFenceWithRecordedToken(
      binding,
      `${token.slice(0, 8)}-${token.slice(8, 12)}-4${token.slice(13, 16)}-8${token.slice(17, 20)}-${token.slice(20, 32)}`,
    );
    const workflowDatabasePath = sessionBridgeDatabasePath(input.repositoryRoot, config);
    const verifyWorkflowStore = (): void => {
      const relative = path.relative(input.repositoryRoot, workflowDatabasePath).split(path.sep).join('/');
      if (!access.fileExists(relative, 'consumer migration workflow store')) return;
      const sourceFiles = ['', '-wal', '-shm'].map((suffix) => ({ suffix, relative: relative + suffix }));
      const before = sourceFiles.map((file) => ({
        ...file,
        bytes: access.fileExists(file.relative, 'consumer workflow triplet')
          ? access.readBytes(file.relative, 'consumer workflow triplet')
          : null,
      }));
      const inspectionRoot = mkdtempSync(path.join(tmpdir(), 'vida-consumer-workflow-inspection-'));
      const inspectionPath = path.join(inspectionRoot, path.basename(workflowDatabasePath));
      try {
        for (const file of before)
          if (file.bytes) writeFileSync(inspectionPath + file.suffix, file.bytes, { flag: 'wx' });
        const workflow = new Database(inspectionPath, { readonly: true, strict: true });
        try {
          requireState(
            (workflow.query('PRAGMA quick_check').get() as { quick_check: string })?.quick_check === 'ok',
            'consumer workflow database corrupt',
          );
          const runs = workflow.query('SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot').all() as {
            snapshot: string;
          }[];
          requireState(
            runs.every((row) =>
              ['suspended', 'success', 'failed', 'canceled'].includes(
                (JSON.parse(row.snapshot) as { status: string }).status,
              ),
            ),
            'consumer workflow run remains unknown or inflight',
          );
        } finally {
          workflow.close();
        }
        for (const file of before) {
          const present = access.fileExists(file.relative, 'consumer workflow triplet stability');
          requireState(
            file.bytes
              ? present && access.readBytes(file.relative, 'consumer workflow triplet stability').equals(file.bytes)
              : !present,
            'consumer workflow triplet changed during inspection',
          );
        }
      } finally {
        rmSync(inspectionRoot, { recursive: true, force: true });
      }
    };
    const result = store.consumerMigrationState(receipt, input.mode, () => {
      verifyWorkflowStore();
      return files({
        database_path: databasePath,
        workflow_database_path: sessionBridgeDatabasePath(input.repositoryRoot, config),
        backup:
          input.mode === 'baseline' &&
          !database
            .query('SELECT operation_id FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?')
            .get(workspaceId, input.operationId)
            ? database.serialize()
            : null,
      });
    });
    await store.releaseMaintenanceFence(receipt);
    return result;
  } finally {
    database.close();
  }
}

export class HostStateStore {
  readonly #database: Database;
  readonly #producerDatabaseIdentity: { readonly dev: number; readonly ino: number } | undefined;
  readonly #sessionProducers = new WeakMap<
    SessionProducerHandle,
    { ledger: MastraSessionLedger; input: SessionProducerInput }
  >();
  readonly #recoveryReviews = new WeakMap<
    RecoveryReviewHandle,
    { binding: RecoveryReviewBinding; verifyContext: () => void }
  >();
  readonly #workspaceId: string;
  readonly #repositoryRoot: string | undefined;
  readonly #verifyReconciliation: WorkflowAttemptReconciliationVerifier['verify'] | undefined;
  readonly #verifyMigrationRebind: MigrationRebindVerifier['verify'] | undefined;
  readonly #verifyRuntimeCodeRebind: RuntimeCodeRebindVerifier['verify'] | undefined;
  readonly #verifyWorkflowApproval: WorkflowAttemptApprovalVerifier['verify'] | undefined;
  readonly #verifyMaintenanceRelease: MaintenanceReleaseVerifier['verify'] | undefined;
  readonly #verifyMaintenanceAcquisition: MaintenanceReleaseVerifier['verifyAcquisition'];
  readonly #maintenancePrincipal: string | undefined;
  readonly #maintenanceProjectIds: readonly string[] | undefined;
  readonly #workflowApprovalPrincipal: string | undefined;
  readonly reconciliationPrincipal: string | undefined;
  readonly migrationRebindPrincipal: string | undefined;
  readonly runtimeCodeRebindPrincipal: string | undefined;
  readonly governanceCapability: HostGovernanceCapability;
  get workspaceId(): string {
    return this.#workspaceId;
  }
  static isHostStateStore(value: unknown): value is HostStateStore {
    return value !== null && typeof value === 'object' && #database in value;
  }
  constructor(
    database: Database,
    workspaceId: string,
    verifyReconciliation?: WorkflowAttemptReconciliationVerifier,
    verifyMigrationRebind?: MigrationRebindVerifier,
    verifyWorkflowApproval?: WorkflowAttemptApprovalVerifier,
    verifyMaintenanceRelease?: MaintenanceReleaseVerifier,
    repositoryRoot?: string,
    verifyRuntimeCodeRebind?: RuntimeCodeRebindVerifier,
  ) {
    requireState(
      database instanceof Database && hashPattern.test(workspaceId),
      'trusted database handle and workspace digest required',
    );
    this.#database = database;
    this.#producerDatabaseIdentity =
      repositoryRoot === undefined
        ? undefined
        : (() => {
            const stat = lstatSync(database.filename);
            return { dev: stat.dev, ino: stat.ino };
          })();
    this.#workspaceId = workspaceId;
    this.#repositoryRoot = repositoryRoot === undefined ? undefined : repositoryRootIdentity(repositoryRoot);
    requireState(
      verifyReconciliation === undefined ||
        (verifyReconciliation !== null &&
          typeof verifyReconciliation === 'object' &&
          Object.keys(verifyReconciliation).length === 2 &&
          typeof verifyReconciliation.principal === 'string' &&
          verifyReconciliation.principal.trim().length > 0 &&
          verifyReconciliation.principal === verifyReconciliation.principal.trim() &&
          !/\p{Cc}/u.test(verifyReconciliation.principal) &&
          typeof verifyReconciliation.verify === 'function'),
      'trusted reconciliation verifier invalid',
    );
    this.#verifyReconciliation = verifyReconciliation?.verify.bind(verifyReconciliation);
    this.reconciliationPrincipal = verifyReconciliation?.principal;
    Object.defineProperty(this, 'reconciliationPrincipal', { writable: false, configurable: false });
    requireState(
      verifyMigrationRebind === undefined ||
        (verifyMigrationRebind !== null &&
          typeof verifyMigrationRebind === 'object' &&
          Object.keys(verifyMigrationRebind).length === 2 &&
          typeof verifyMigrationRebind.principal === 'string' &&
          verifyMigrationRebind.principal.trim().length > 0 &&
          verifyMigrationRebind.principal === verifyMigrationRebind.principal.trim() &&
          !/\p{Cc}/u.test(verifyMigrationRebind.principal) &&
          typeof verifyMigrationRebind.verify === 'function'),
      'trusted migration rebind verifier invalid',
    );
    this.#verifyMigrationRebind = verifyMigrationRebind?.verify.bind(verifyMigrationRebind);
    requireState(
      verifyRuntimeCodeRebind === undefined ||
        (verifyRuntimeCodeRebind !== null &&
          typeof verifyRuntimeCodeRebind === 'object' &&
          Object.keys(verifyRuntimeCodeRebind).length === 2 &&
          typeof verifyRuntimeCodeRebind.principal === 'string' &&
          verifyRuntimeCodeRebind.principal.trim().length > 0 &&
          verifyRuntimeCodeRebind.principal === verifyRuntimeCodeRebind.principal.trim() &&
          typeof verifyRuntimeCodeRebind.verify === 'function'),
      'trusted runtime-code rebind verifier invalid',
    );
    this.#verifyRuntimeCodeRebind = verifyRuntimeCodeRebind?.verify.bind(verifyRuntimeCodeRebind);
    this.runtimeCodeRebindPrincipal = verifyRuntimeCodeRebind?.principal;
    Object.defineProperty(this, 'runtimeCodeRebindPrincipal', { writable: false, configurable: false });
    requireState(
      verifyWorkflowApproval === undefined ||
        (verifyWorkflowApproval !== null &&
          typeof verifyWorkflowApproval === 'object' &&
          Object.keys(verifyWorkflowApproval).length === 2 &&
          typeof verifyWorkflowApproval.principal === 'string' &&
          verifyWorkflowApproval.principal.trim().length > 0 &&
          verifyWorkflowApproval.principal === verifyWorkflowApproval.principal.trim() &&
          typeof verifyWorkflowApproval.verify === 'function'),
      'trusted workflow approval verifier invalid',
    );
    this.#verifyWorkflowApproval = verifyWorkflowApproval?.verify.bind(verifyWorkflowApproval);
    this.#workflowApprovalPrincipal = verifyWorkflowApproval?.principal;
    requireState(
      verifyMaintenanceRelease === undefined ||
        (verifyMaintenanceRelease !== null &&
          typeof verifyMaintenanceRelease === 'object' &&
          (Object.keys(verifyMaintenanceRelease).length === 3 ||
            (Object.keys(verifyMaintenanceRelease).length === 4 &&
              typeof verifyMaintenanceRelease.verifyAcquisition === 'function' &&
              verifyMaintenanceRelease.verifyAcquisition.constructor.name !== 'AsyncFunction')) &&
          typeof verifyMaintenanceRelease.principal === 'string' &&
          verifyMaintenanceRelease.principal.trim().length > 0 &&
          verifyMaintenanceRelease.principal === verifyMaintenanceRelease.principal.trim() &&
          !/\p{Cc}/u.test(verifyMaintenanceRelease.principal) &&
          Array.isArray(verifyMaintenanceRelease.projectIds) &&
          verifyMaintenanceRelease.projectIds.length > 0 &&
          verifyMaintenanceRelease.projectIds.every(
            (id, index) =>
              typeof id === 'string' &&
              maintenanceIdPattern.test(id) &&
              (index === 0 || verifyMaintenanceRelease.projectIds[index - 1]! < id),
          ) &&
          typeof verifyMaintenanceRelease.verify === 'function'),
      'trusted maintenance release verifier invalid',
    );
    this.#verifyMaintenanceRelease = verifyMaintenanceRelease?.verify.bind(verifyMaintenanceRelease);
    this.#verifyMaintenanceAcquisition = verifyMaintenanceRelease?.verifyAcquisition?.bind(verifyMaintenanceRelease);
    this.#maintenancePrincipal = verifyMaintenanceRelease?.principal;
    this.#maintenanceProjectIds =
      verifyMaintenanceRelease?.projectIds && Object.freeze([...verifyMaintenanceRelease.projectIds]);
    this.migrationRebindPrincipal = verifyMigrationRebind?.principal;
    Object.defineProperty(this, 'migrationRebindPrincipal', { writable: false, configurable: false });
    requireState(!database.inTransaction, 'host state requires an unshared transaction boundary');
    const main = (database.query('PRAGMA database_list').all() as { name: string; file: string }[]).find(
      (entry) => entry.name === 'main',
    );
    requireState(main?.file, 'host state requires a file-backed database');
    database.exec('PRAGMA synchronous=FULL');
    this.#assertDatabaseSupport();
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_state (workspace_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY (workspace_id, kind, id))',
    );
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_governance (workspace_id TEXT NOT NULL, store_id TEXT NOT NULL, kind TEXT NOT NULL, record_key TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,store_id,kind,record_key))',
    );
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_governance_stores (workspace_id TEXT NOT NULL, store_id TEXT NOT NULL, generation TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,store_id))',
    );
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_reconciliation (workspace_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL)',
    );
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_maintenance (workspace_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL)',
    );
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_admission_attempt (workspace_id TEXT NOT NULL,generation INTEGER NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,request_digest TEXT NOT NULL,PRIMARY KEY(workspace_id,generation,work_id,attempt))',
    );
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_final_assurance (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,generation INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,generation))',
    );
    this.governanceCapability = issueHostGovernanceCapability({
      workspaceId,
      reserveOperation: this.reserveOperation.bind(this),
      inspectOperation: this.inspectOperation.bind(this),
      transitionOperation: this.transitionOperation.bind(this),
      consumeApproval: this.consumeApproval.bind(this),
    });
    Object.defineProperty(this, 'governanceCapability', { writable: false, configurable: false });
  }
  /** A valid fresh intake crosses the rollback cutoff before preparation, even if preparation later fails. */
  recordAdmissionAttempt(workId: string, attempt: number, request: unknown): void {
    requireState(
      typeof workId === 'string' &&
        workId.length > 0 &&
        workId.length <= 128 &&
        !/\p{Cc}/u.test(workId) &&
        Number.isSafeInteger(attempt) &&
        attempt > 0,
      'admission attempt identity invalid',
    );
    requireState(!this.#database.inTransaction, 'nested admission attempt transaction forbidden');
    this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      const generation = this.#maintenanceGeneration(),
        requestDigest = canonicalJsonDigest(request);
      const prior = this.#database
        .query(
          'SELECT request_digest FROM agent_host_admission_attempt WHERE workspace_id=? AND generation=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, generation, workId, attempt) as { request_digest: string } | null;
      requireState(!prior || prior.request_digest === requestDigest, 'admission attempt retry differs');
      if (!prior)
        this.#database
          .query('INSERT INTO agent_host_admission_attempt VALUES(?,?,?,?,?)')
          .run(this.#workspaceId, generation, workId, attempt, requestDigest);
    }).immediate();
  }
  /** Consumer-only state reset/restore; the canonical database remains at its configured path. */
  consumerMigrationState<T>(
    receipt: MaintenanceFenceReceipt,
    mode: 'baseline' | 'restore',
    files: () => T,
  ): {
    readonly schema: 'ConsumerMigrationState/v1';
    readonly operation_id: string;
    readonly status: 'baseline' | 'restored';
    readonly result: T;
  } {
    requireState(
      ['baseline', 'restore'].includes(mode) && typeof files === 'function',
      'consumer migration operation invalid',
    );
    requireState(!this.#database.inTransaction, 'nested consumer migration transaction forbidden');
    const operationId = receipt.fence.binding.operation_id;
    const tables = ['agent_host_state', 'agent_host_mastra_session_ledger', 'agent_host_governance'] as const;
    // Private SQL operation records retain ordered, individually bounded row payloads.
    // They are not one public ingress document and do not duplicate a shared ledger.
    const encodePlan = (plan: unknown): string => JSON.stringify(plan);
    const digestPlan = (payload: string): string => createHash('sha256').update(payload).digest('hex');
    const sameRecords = (actual: readonly unknown[], expected: unknown): boolean =>
      Array.isArray(expected) &&
      actual.length === expected.length &&
      actual.every((row, index) => sameJson(row, expected[index]));
    const sameRows = (actual: Record<string, Record<string, unknown>[]>, expected: unknown): boolean =>
      Boolean(
        expected &&
        typeof expected === 'object' &&
        sameJson(Object.keys(actual).sort(), Object.keys(expected).sort()) &&
        tables.every((table) => sameRecords(actual[table] ?? [], (expected as Record<string, unknown>)[table])),
      );

    const readRows = (): Record<string, Record<string, unknown>[]> =>
      Object.fromEntries(
        tables.map((table) => [
          table,
          this.#database.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table)
            ? (this.#database
                .query(`SELECT * FROM ${table} WHERE workspace_id=? ORDER BY rowid`)
                .all(this.#workspaceId) as Record<string, unknown>[])
            : [],
        ]),
      );
    const admissions = (): unknown[] =>
      this.#database
        .query(
          'SELECT generation,work_id,attempt,request_digest FROM agent_host_admission_attempt WHERE workspace_id=? ORDER BY generation,work_id,attempt',
        )
        .all(this.#workspaceId);
    const checkSettled = (): void => {
      this.#assertMaintenanceQuiescent();
      for (const row of readRows().agent_host_mastra_session_ledger ?? []) {
        const journal = JSON.parse(row.payload as string) as Record<string, unknown>;
        requireState(
          journal.schema === 'MastraSessionLedger/v1' &&
            canonicalJsonDigest(journal) === row.digest &&
            Array.isArray(journal.items) &&
            Array.isArray(journal.completed),
          'consumer migration journal integrity differs',
        );
        const items = [
          ...journal.items,
          ...journal.completed.flatMap((value) => {
            requireState(
              value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items),
              'consumer migration journal shape differs',
            );
            return (value as { items: unknown[] }).items;
          }),
        ] as Record<string, unknown>[];
        requireState(
          items.every((item) => item && !item.host_reservation && (!item.issue_id || item.observation)),
          'consumer migration native outcome remains unknown',
        );
      }
    };
    this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceReceipt(receipt);
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_consumer_migration (workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id))',
      );
      if (mode === 'restore') {
        const row = this.#database
          .query('SELECT payload,digest FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?')
          .get(this.#workspaceId, operationId) as { payload: string; digest: string } | null;
        requireState(row && digestPlan(row.payload) === row.digest, 'consumer migration baseline missing or corrupt');
        const plan = JSON.parse(row.payload) as Record<string, unknown>;
        requireState(sameJson(plan.binding, receipt.fence.binding), 'consumer migration maintenance binding differs');
        requireState(
          plan.status === 'baseline' || plan.status === 'restoring' || plan.status === 'restored',
          'consumer migration state invalid',
        );
        if (plan.status !== 'restored') {
          requireState(
            sameRows(readRows(), plan.after) && sameRecords(admissions(), plan.admissions),
            'new admission or changed canonical state blocks restore',
          );
          checkSettled();
          plan.status = 'restoring';
          this.#database
            .query(
              'UPDATE agent_host_consumer_migration SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
            )
            .run(encodePlan(plan), digestPlan(encodePlan(plan)), this.#workspaceId, operationId);
        }
      }
    }).immediate();
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceReceipt(receipt);
      const prior = this.#database
        .query('SELECT payload,digest FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?')
        .get(this.#workspaceId, operationId) as { payload: string; digest: string } | null;
      if (mode === 'baseline') {
        if (prior) {
          const plan = JSON.parse(prior.payload) as {
            status: string;
            binding: unknown;
            after: unknown;
            admissions: unknown;
          };
          requireState(
            digestPlan(prior.payload) === prior.digest &&
              plan.status === 'baseline' &&
              sameJson(plan.binding, receipt.fence.binding) &&
              sameRows(readRows(), plan.after) &&
              sameRecords(admissions(), plan.admissions),
            'consumer migration baseline retry differs',
          );
          const result = files();
          requireState(
            !result || typeof (result as { then?: unknown }).then !== 'function',
            'consumer migration callback must be synchronous',
          );
          return {
            schema: 'ConsumerMigrationState/v1' as const,
            operation_id: operationId,
            status: 'baseline' as const,
            result,
          };
        }
        checkSettled();
        const before = readRows(),
          attemptBaseline = admissions();
        // Validate every current-v1 pair before hiding old tasks; retired readers are never selected.
        for (const row of before.agent_host_state ?? [])
          if (row.kind === 'work') {
            const work = this.#checkedWork(JSON.parse(row.payload as string));
            requireState(canonicalJsonDigest(work) === row.digest, 'consumer migration work integrity differs');
            validatePair(work, this.#load('ledger', 'shared') as CoordinationLedger | null);
          }
        const result = files();
        requireState(
          !result || typeof (result as { then?: unknown }).then !== 'function',
          'consumer migration callback must be synchronous',
        );
        for (const table of tables)
          if (before[table]?.length)
            this.#database.query(`DELETE FROM ${table} WHERE workspace_id=?`).run(this.#workspaceId);
        const plan = {
          schema: 'ConsumerMigrationState/v1',
          operation_id: operationId,
          binding: receipt.fence.binding,
          status: 'baseline',
          before,
          after: readRows(),
          admissions: attemptBaseline,
        };
        this.#database
          .query('INSERT INTO agent_host_consumer_migration VALUES(?,?,?,?)')
          .run(this.#workspaceId, operationId, encodePlan(plan), digestPlan(encodePlan(plan)));
        return {
          schema: 'ConsumerMigrationState/v1' as const,
          operation_id: operationId,
          status: 'baseline' as const,
          result,
        };
      }
      requireState(prior && digestPlan(prior.payload) === prior.digest, 'consumer migration baseline corrupt');
      const plan = JSON.parse(prior.payload) as {
        status: string;
        before: Record<string, Record<string, unknown>[]>;
        after: unknown;
        admissions: unknown;
      };
      if (plan.status === 'restored') {
        requireState(
          sameRows(readRows(), plan.before) && sameRecords(admissions(), plan.admissions),
          'restored consumer state changed',
        );
        const result = files();
        requireState(
          !result || typeof (result as { then?: unknown }).then !== 'function',
          'consumer migration callback must be synchronous',
        );
        return {
          schema: 'ConsumerMigrationState/v1' as const,
          operation_id: operationId,
          status: 'restored' as const,
          result,
        };
      }
      requireState(
        plan.status === 'restoring' && sameRows(readRows(), plan.after) && sameRecords(admissions(), plan.admissions),
        'consumer migration restore postimage differs',
      );
      checkSettled();
      // Schema validation precedes filesystem effects; exact historic payloads and revisions are retained.
      for (const row of plan.before.agent_host_state ?? []) {
        if (row.kind === 'work') this.#checkedWork(JSON.parse(row.payload as string));
        else {
          requireState(row.kind === 'ledger', 'consumer migration state kind invalid');
          checkedLedger(JSON.parse(row.payload as string));
        }
        requireState(
          canonicalJsonDigest(JSON.parse(row.payload as string)) === row.digest,
          'consumer migration beforeimage integrity differs',
        );
      }
      const ledgerRow = plan.before.agent_host_state?.find((row) => row.kind === 'ledger');
      const priorLedger = ledgerRow ? checkedLedger(JSON.parse(ledgerRow.payload as string)) : null;
      for (const row of plan.before.agent_host_state ?? [])
        if (row.kind === 'work') validatePair(this.#checkedWork(JSON.parse(row.payload as string)), priorLedger);
      const tableColumns = new Map<string, string[]>();
      for (const table of tables) {
        const columns = this.#database.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
        tableColumns.set(
          table,
          columns.map((column) => column.name),
        );
        for (const row of plan.before[table] ?? [])
          requireState(
            sameJson(columns.map((column) => column.name).sort(), Object.keys(row).sort()),
            'consumer migration row columns differ',
          );
      }
      const result = files();
      requireState(
        !result || typeof (result as { then?: unknown }).then !== 'function',
        'consumer migration callback must be synchronous',
      );
      for (const table of tables)
        for (const row of plan.before[table] ?? []) {
          const columns = tableColumns.get(table)!;
          this.#database
            .query(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`)
            .run(...(columns.map((column) => row[column]) as (string | number | null)[]));
        }
      requireState(sameRows(readRows(), plan.before), 'consumer migration restored rows differ');
      plan.status = 'restored';
      this.#database
        .query('UPDATE agent_host_consumer_migration SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?')
        .run(encodePlan(plan), digestPlan(encodePlan(plan)), this.#workspaceId, operationId);
      return {
        schema: 'ConsumerMigrationState/v1' as const,
        operation_id: operationId,
        status: 'restored' as const,
        result,
      };
    }).immediate();
  }
  #governanceDigest(storeId: string, kind: string, key: string, revision: number, payload: unknown): string {
    return canonicalJsonDigest({
      workspace_id: this.#workspaceId,
      store_id: storeId,
      kind,
      record_key: key,
      revision,
      payload,
    });
  }
  #governanceGeneration(storeId: string, create = false): string {
    const row = this.#database
      .query('SELECT generation,digest FROM agent_host_governance_stores WHERE workspace_id=? AND store_id=?')
      .get(this.#workspaceId, storeId) as { generation: string; digest: string } | null;
    if (row) {
      requireState(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.generation) &&
          row.digest === this.#governanceDigest(storeId, 'store', row.generation, 1, null),
        'governance store identity mismatch',
      );
      return row.generation;
    }
    requireState(create, 'governance store identity missing');
    const generation = randomUUID();
    this.#database
      .query('INSERT INTO agent_host_governance_stores VALUES(?,?,?,?)')
      .run(this.#workspaceId, storeId, generation, this.#governanceDigest(storeId, 'store', generation, 1, null));
    return generation;
  }
  #governanceRead(
    storeId: string,
    kind: 'operation' | 'approval',
    key: string,
  ): {
    revision: number;
    digest: string;
    record: OperationReservation | WorkflowApprovalConsumptionRecord;
  } | null {
    requireState(
      typeof storeId === 'string' &&
        /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(storeId) &&
        typeof key === 'string' &&
        hashPattern.test(key),
      'governance namespace invalid',
    );
    this.#assertDatabaseSupport();
    const row = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind=? AND record_key=?',
      )
      .get(this.#workspaceId, storeId, kind, key) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const generation = this.#governanceGeneration(storeId);
    const parsed: unknown = JSON.parse(row.payload);
    assertCanonicalJsonValue(parsed, '$');
    const record =
      kind === 'operation' ? validateHostOperationReservation(parsed) : validateHostWorkflowApprovalRecord(parsed);
    requireState(
      Number.isSafeInteger(row.revision) &&
        row.revision > 0 &&
        record.store_id === storeId &&
        (kind === 'operation'
          ? (record as OperationReservation).operation_key
          : canonicalJsonDigest((record as WorkflowApprovalConsumptionRecord).binding)) === key &&
        row.digest === this.#governanceDigest(storeId, kind, key, row.revision, record),
      'governance checksum or identity mismatch',
    );
    if (kind === 'approval')
      requireState(
        (record as WorkflowApprovalConsumptionRecord).store_generation === generation,
        'workflow approval store generation mismatch',
      );
    const expectedRevision = record.status === 'reserved' ? 1 : record.status === 'applied' ? 3 : 2;
    requireState(row.revision === expectedRevision, 'governance state revision mismatch');
    if (kind === 'operation') {
      const operation = record as OperationReservation;
      requireState(
        operation.revision === 1 && (operation.status === 'reserved' || operation.terminal_revision === row.revision),
        'governance operation revision mismatch',
      );
    }
    return { ...row, record: snapshot(record) };
  }
  #governanceWrite(
    kind: 'operation' | 'approval',
    key: string,
    record: OperationReservation | WorkflowApprovalConsumptionRecord,
    previous: { revision: number; digest: string } | null,
  ): void {
    if (kind === 'operation') validateHostOperationReservation(record);
    else validateHostWorkflowApprovalRecord(record);
    const revision = (previous?.revision ?? 0) + 1;
    const digest = this.#governanceDigest(record.store_id, kind, key, revision, record);
    if (!previous) {
      this.#database
        .query('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)')
        .run(this.#workspaceId, record.store_id, kind, key, revision, JSON.stringify(record), digest);
    } else {
      const result = this.#database
        .query(
          'UPDATE agent_host_governance SET revision=?,payload=?,digest=? WHERE workspace_id=? AND store_id=? AND kind=? AND record_key=? AND revision=? AND digest=?',
        )
        .run(
          revision,
          JSON.stringify(record),
          digest,
          this.#workspaceId,
          record.store_id,
          kind,
          key,
          previous.revision,
          previous.digest,
        );
      requireState(result.changes === 1, 'governance compare-and-swap conflict');
    }
  }
  /** All producers share the one configured engine file; UNKNOWN never expires. */
  assertSessionProducerWriteAllowed(handle?: SessionProducerHandle): void {
    const rows = this.#database
      .query("SELECT record_key FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind='operation'")
      .all(this.#workspaceId, sessionProducerStore) as { record_key: string }[];
    const pending = rows
      .map(
        (row) =>
          this.#governanceRead(sessionProducerStore, 'operation', row.record_key)!.record as OperationReservation,
      )
      .filter((record) => record.status === 'reserved' || record.status === 'commit_unknown');
    if (!handle) {
      requireState(pending.length === 0, 'session producer is pending or unknown');
      return;
    }
    requireState(
      this.#sessionProducers.has(handle) &&
        pending.length === 1 &&
        sameJson(pending[0], { ...handle.operation, status: 'commit_unknown', terminal_revision: 2 }),
      'session producer handle is foreign, stale or settled',
    );
  }

  #transactionWithProducerFence<T>(operation: () => T) {
    return this.#database.transaction(() => {
      this.assertSessionProducerWriteAllowed();
      return operation();
    });
  }

  #assertSessionProducerContext(
    ledger: MastraSessionLedger,
    input: SessionProducerInput,
    journalExpected: StateVersion | null,
  ): import('./config/runtime-config.js').AgentRuntimeConfig {
    const bound = MastraSessionLedger.prototype.sessionProducerBinding.call(ledger);
    const physical = lstatSync(this.#database.filename);
    requireState(
      physical.isFile() &&
        !physical.isSymbolicLink() &&
        physical.nlink === 1 &&
        physical.dev === this.#producerDatabaseIdentity?.dev &&
        physical.ino === this.#producerDatabaseIdentity?.ino,
      'session producer Host database was substituted',
    );
    requireState(
      bound.host === this &&
        bound.database === this.#database &&
        bound.workspaceId === this.#workspaceId &&
        this.#repositoryRoot === repositoryRootIdentity(input.repositoryRoot) &&
        bound.repositoryRoot === this.#repositoryRoot &&
        realpathSync.native(this.#database.filename) ===
          realpathSync.native(
            path.join(input.repositoryRoot, input.config.control.work_root, 'session-handoff.v1.sqlite'),
          ) &&
        deriveWorkspaceId(input.config.repository.repository_id, input.repositoryRoot) === this.#workspaceId,
      'session producer ledger/root/database differs',
    );
    const currentConfig = loadRuntimeConfig(input.repositoryRoot);
    requireState(
      runtimeConfigDigest(currentConfig) === runtimeConfigDigest(input.config) &&
        runtimeConfigDigest(bound.config) === runtimeConfigDigest(currentConfig),
      'session producer configuration changed',
    );
    requireState(
      selectWorkflow(currentConfig, input.selection).workflow_id === input.workflowId,
      'session producer configured workflow differs',
    );
    const project = loadProjectSetContext(
      input.repositoryRoot,
      currentConfig,
      currentConfig.repository.repository_id,
      input.projectIds,
    );
    requireState(
      sameJson(project.project_ids, input.projectIds) && project.project_ids.includes(input.selection.project!),
      'session producer selected projects differ',
    );
    const identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: input.context.work_id,
    };
    const host = this.#read(identity);
    matchesExpected(host.workVersion, input.expectedWork);
    matchesExpected(host.ledgerVersion, input.expectedLedger);
    this.#assertMaintenanceGeneration(input.maintenanceGeneration);
    const journal = MastraSessionLedger.prototype.resume.call(ledger, input.context.work_id, input.context.attempt);
    matchesExpected(journal?.version ?? null, journalExpected);
    requireState(
      Number.isSafeInteger(input.context.attempt) &&
        input.context.attempt > 0 &&
        hashPattern.test(input.context.scope_digest),
      'session producer context is invalid',
    );
    if (!host.work) {
      const other = this.#database
        .query("SELECT id FROM agent_host_state WHERE workspace_id=? AND kind='work'")
        .all(this.#workspaceId) as { id: string }[];
      requireState(
        !other.some(
          (row) => (this.#load('work', row.id) as WorkState).binding.lifecycle_work_id === input.context.work_id,
        ),
        'mechanical producer conflicts with admitted Work',
      );
      requireState(!journal?.state.corrective_execution, 'mechanical producer cannot own correction');
      requireState(
        input.runId ===
          'vida-' +
            canonicalJsonDigest({
              workspaceId: this.#workspaceId,
              context: input.context,
              workflowId: input.workflowId,
            }),
        'mechanical producer run differs',
      );
      return currentConfig;
    }
    const work = host.work,
      lease = work.lease;
    const intakeRef = work.artifacts.find(
      (item) => item.artifact_id === 'local-session-intake' && item.schema === 'VidaLocalSessionIntake/v1',
    );
    requireState(intakeRef, 'session producer original intake is unavailable');
    const intakeBytes = requireSafeRepositoryAccess(input.repositoryRoot).readBytes(
      intakeRef.path,
      'session producer original intake',
    );
    requireState(
      intakeBytes.length <= 32768 && createHash('sha256').update(intakeBytes).digest('hex') === intakeRef.sha256,
      'session producer original intake changed',
    );
    const admittedItem = (
      JSON.parse(intakeBytes.toString('utf8')) as {
        work_item: {
          schema: string;
          id: string;
          canonical_kind: string;
          intent: string;
          project_id: string;
          risk_flags: readonly string[];
          labels: readonly string[];
        };
      }
    ).work_item;
    requireState(
      admittedItem?.schema === 'WorkItem/v1' &&
        admittedItem.id === input.context.work_id &&
        canonicalJsonDigest(admittedItem) === work.binding.work_item_digest &&
        sameJson(
          {
            kind: admittedItem.canonical_kind,
            intent: admittedItem.intent,
            project: admittedItem.project_id,
            risk_flags: admittedItem.risk_flags,
            labels: admittedItem.labels,
          },
          {
            kind: input.selection.kind,
            intent: input.selection.intent,
            project: input.selection.project,
            risk_flags: input.selection.risk_flags,
            labels: input.selection.labels,
          },
        ),
      'session producer selection differs from original admitted item',
    );
    requireState(
      work.binding.config_digest === runtimeConfigDigest(currentConfig) &&
        work.binding.team_id === input.selection.team &&
        work.binding.workflow_id === input.workflowId &&
        work.binding.work_source_revision === input.context.scope_digest &&
        work.execution.status === 'active' &&
        lease &&
        host.ledger,
      'session producer admitted work binding or live owner unavailable',
    );
    requireState(
      input.runId === (journal?.state.corrective_execution?.engine_run_id ?? work.execution.run_id),
      'session producer base/corrective run differs',
    );
    requireState(
      work.execution.run_id ===
        'vida-' +
          canonicalJsonDigest({
            workspaceId: this.#workspaceId,
            context: input.context,
            workflowId: input.workflowId,
          }) &&
        (!journal?.state.corrective_execution ||
          journal.state.corrective_execution.base_run_id === work.execution.run_id),
      'session producer original attempt differs',
    );
    const ticket = host.ledger.tickets.find((row) => row.ticket_id === lease.ticket_id);
    const claims = host.ledger.claims.filter((row) => row.status === 'active' && row.ticket_id === lease.ticket_id);
    requireState(
      ticket?.status === 'active' &&
        ticket.thread_id === lease.thread_id &&
        ticket.generation === lease.generation &&
        ticket.expires_at &&
        timestamp(ticket.expires_at) > Date.now() &&
        claims.length === 1 &&
        timestamp(claims[0]!.lease_expires_at) > Date.now() &&
        claims[0]!.thread_id === lease.thread_id &&
        claims[0]!.generation === lease.generation &&
        ticket.claim_ids.includes(claims[0]!.claim_id) &&
        sameJson(claims[0]!.resources, ticket.active_resources),
      'session producer owner claim/FIFO/expiry differs',
    );
    this.#assertNoOverlappingActiveSourceOwner(host.ledger, ticket);
    return currentConfig;
  }

  beginSessionProducer(ledger: MastraSessionLedger, supplied: SessionProducerInput): SessionProducerHandle {
    requireState(
      ledger instanceof MastraSessionLedger && !this.#database.inTransaction,
      'actual ledger and nonnested producer acquisition required',
    );
    const input = snapshot(supplied);
    const operation = this.#database
      .transaction(() => {
        this.#assertReconciliationWritesAllowed();
        this.assertSessionProducerWriteAllowed();
        const config = this.#assertSessionProducerContext(ledger, input, input.expectedJournal);
        const engine = readSessionEngineSnapshot({ ...input, config });
        const journal = MastraSessionLedger.prototype.resume.call(ledger, input.context.work_id, input.context.attempt);
        if (input.phase === 'start') {
          requireState(
            !engine &&
              (!journal ||
                (journal.state.corrective_execution &&
                  journal.state.step_id === null &&
                  journal.state.items.length === 0 &&
                  journal.state.completed.length === 0)),
            'session producer run already exists',
          );
        } else if (input.phase === 'resume') {
          requireState(
            engine?.status === 'suspended' &&
              engine.step_id === input.resumeIntent?.stepId &&
              journal?.resume_status === 'ready_to_resume' &&
              engine.step_id === journal.state.step_id &&
              engine.run_id === journal.state.run_id &&
              sameJson(
                engine.requests,
                journal.state.items.map((item) => item.request),
              ) &&
              sameJson(
                input.resumeIntent.observations,
                journal.state.items.map((item) => item.observation),
              ) &&
              sameJson(
                engine.observations,
                journal.state.completed.flatMap((wave) => wave.items.map((item) => item.observation)),
              ),
            'session producer resume intent is stale or unobserved',
          );
        } else {
          requireState(!input.resumeIntent, 'initialization has no resume intent');
          requireState(
            !engine
              ? !journal ||
                  (journal.state.corrective_execution &&
                    journal.state.step_id === null &&
                    journal.state.items.length === 0 &&
                    journal.state.completed.length === 0)
              : journal &&
                  engine.run_id === journal.state.run_id &&
                  engine.step_id === journal.state.step_id &&
                  sameJson(
                    engine.requests,
                    journal.state.items.map((item) => item.request),
                  ) &&
                  sameJson(
                    engine.observations,
                    journal.state.completed.flatMap((wave) => wave.items.map((item) => item.observation)),
                  ) &&
                  ['success', 'suspended'].includes(engine.status),
            'session producer initialization lacks matching persisted journal',
          );
        }
        if (input.phase !== 'initialize' && journal?.state.source_scope)
          requireState(
            input.sourceScope?.digest === journal.state.source_scope.digest,
            'session producer source scope changed',
          );
        if (input.sourceScope)
          requireState(
            input.sourceScope.schema === 'ScopedSourceSnapshot/v1' &&
              input.sourceScope.digest ===
                canonicalJsonDigest({ schema: input.sourceScope.schema, entries: input.sourceScope.entries }),
            'session producer source scope is invalid',
          );
        this.#governanceGeneration(sessionProducerStore, true);
        const record: OperationReservation = {
          schema: 'OperationReservation/v1',
          store_id: sessionProducerStore,
          operation_key: canonicalJsonDigest({ input, nonce: randomUUID() }),
          revision: 1,
          fencing_token: randomUUID(),
          status: 'reserved',
          created_at: new Date().toISOString(),
          request_digest: canonicalJsonDigest(input),
        };
        this.#governanceWrite('operation', record.operation_key, record, null);
        const stored = this.#governanceRead(sessionProducerStore, 'operation', record.operation_key)!;
        this.#governanceWrite(
          'operation',
          record.operation_key,
          { ...record, status: 'commit_unknown', terminal_revision: 2 },
          stored,
        );
        return snapshot(record);
      })
      .immediate();
    const handle = Object.freeze({ operation });
    this.#sessionProducers.set(handle, { ledger, input });
    return handle;
  }

  assertSessionProducerCurrent(handle: SessionProducerHandle): void {
    requireState(!this.#database.inTransaction, 'nested session producer recheck forbidden');
    this.#database
      .transaction(() => {
        this.assertSessionProducerWriteAllowed(handle);
        const entry = this.#sessionProducers.get(handle)!;
        this.#assertSessionProducerContext(entry.ledger, entry.input, entry.input.expectedJournal);
      })
      .immediate();
  }

  assertSessionProducerJournalWriteAllowed(handle?: SessionProducerHandle): void {
    this.assertSessionProducerWriteAllowed(handle);
    if (handle) {
      const entry = this.#sessionProducers.get(handle)!;
      this.#assertSessionProducerContext(entry.ledger, entry.input, entry.input.expectedJournal);
    }
  }

  settleSessionProducer(handle: SessionProducerHandle, expectedJournal: StateVersion | null): void {
    requireState(!this.#database.inTransaction, 'nested session producer settlement forbidden');
    this.#database
      .transaction(() => {
        this.assertSessionProducerWriteAllowed(handle);
        const entry = this.#sessionProducers.get(handle)!;
        const config = this.#assertSessionProducerContext(entry.ledger, entry.input, expectedJournal);
        const engine = readSessionEngineSnapshot({ ...entry.input, config });
        const journal = MastraSessionLedger.prototype.resume.call(
          entry.ledger,
          entry.input.context.work_id,
          entry.input.context.attempt,
        );
        if (!engine)
          requireState(
            entry.input.phase === 'initialize' &&
              (!journal ||
                (journal.state.corrective_execution &&
                  journal.state.step_id === null &&
                  journal.state.completed.length === 0 &&
                  journal.state.items.length === 0)),
            'producer engine absence differs from journal',
          );
        else {
          requireState(
            journal &&
              engine.run_id === journal.state.run_id &&
              engine.step_id === journal.state.step_id &&
              sameJson(
                engine.requests,
                journal.state.items.map((item) => item.request),
              ) &&
              sameJson(
                engine.observations,
                journal.state.completed.flatMap((wave) => wave.items.map((item) => item.observation)),
              ) &&
              ['success', 'suspended'].includes(engine.status),
            'actual engine and journal do not settle producer',
          );
        }
        const stored = this.#governanceRead(sessionProducerStore, 'operation', handle.operation.operation_key)!;
        this.#governanceWrite(
          'operation',
          handle.operation.operation_key,
          {
            ...(stored.record as OperationReservation),
            status: 'applied',
            terminal_revision: 3,
            result_digest: canonicalJsonDigest({ engine, journal: journal?.version ?? null }),
          },
          stored,
        );
        this.#sessionProducers.delete(handle);
      })
      .immediate();
  }

  #assertRecoveryReviewContext(binding: RecoveryReviewBinding, verifyContext: () => void): void {
    this.#assertReconciliationWritesAllowed();
    this.#assertMaintenanceGeneration(binding.maintenanceGeneration);
    const host = this.#read(binding.identity),
      work = host.work;
    matchesExpected(host.workVersion, binding.expectedWork);
    matchesExpected(host.ledgerVersion, binding.expectedLedger);
    requireState(work && host.ledger && this.#repositoryRoot, 'recovery original context unavailable');
    requireState(
      Number.isSafeInteger(binding.attempt) &&
        binding.attempt > 0 &&
        [binding.callerSession, binding.controllerId, binding.userInstructionRef, binding.historicalOwner].every(
          (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 512,
        ),
      'recovery caller/intent/owner binding missing',
    );
    const row = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, binding.identity.work_id, binding.attempt) as {
      revision: number;
      payload: string;
      digest: string;
    } | null;
    requireState(row, 'recovery original journal missing');
    matchesExpected({ revision: row.revision, digest: row.digest }, binding.expectedJournal);
    const journal = JSON.parse(row.payload) as MastraSessionLedgerState;
    requireState(canonicalJsonDigest(journal) === row.digest, 'recovery journal integrity differs');
    validateWorkSessionBinding(work, journal, this.#repositoryRoot);
    const ticket = host.ledger.tickets.find((t) => t.work_id === binding.identity.work_id);
    requireState(ticket && ticket.thread_id === binding.historicalOwner, 'recovery historical owner differs');
    requireState(
      sameJson(
        binding.source.entries.map((entry) => entry.path),
        journal.source_scope?.entries.map((entry) => entry.path),
      ) &&
        sameJson(
          binding.source,
          snapshotDeclaredSources(
            requireSafeRepositoryAccess(this.#repositoryRoot),
            binding.source.entries.map((e) => e.path),
          ),
        ),
      'recovery source scope changed',
    );
    // The isolated caller owns native observation; this checks local evidence only.
    requireState(
      typeof verifyContext === 'function' && verifyContext() === undefined,
      'recovery context check invalid',
    );
  }

  openRecoveryReview(
    binding: RecoveryReviewBinding,
    verifyContext: () => void,
    mode: 'reserve' | 'resume' = 'reserve',
  ): RecoveryReviewHandle {
    const frozen = snapshot(binding);
    requireState(!this.#database.inTransaction, 'nested recovery transaction forbidden');
    const operation = this.#transactionWithProducerFence(() => {
      this.#assertRecoveryReviewContext(frozen, verifyContext);
      const key = canonicalJsonDigest({
        identity: frozen.identity,
        attempt: frozen.attempt,
        action: 'recovery-review',
      });
      const digest = canonicalJsonDigest(frozen);
      const existing = this.#governanceRead(recoveryReviewStore, 'operation', key);
      requireState(mode === (existing ? 'resume' : 'reserve'), 'recovery reservation exists or resume body is missing');
      if (existing) {
        const current = existing.record as OperationReservation;
        requireState(current.request_digest === digest, 'recovery retained request differs');
        const original = { ...current, status: 'reserved' } as Record<string, unknown>;
        delete original.terminal_revision;
        delete original.result_digest;
        return validateHostOperationReservation(original);
      }
      this.#governanceGeneration(recoveryReviewStore, true);
      const record: OperationReservation = {
        schema: 'OperationReservation/v1',
        store_id: recoveryReviewStore,
        operation_key: key,
        revision: 1,
        fencing_token: randomUUID(),
        status: 'reserved',
        created_at: new Date().toISOString(),
        request_digest: digest,
      };
      this.#governanceWrite('operation', key, record, null);
      return record;
    }).immediate();
    const handle = Object.freeze({ operation: snapshot(operation) });
    this.#recoveryReviews.set(handle, { binding: frozen, verifyContext });
    return handle;
  }

  inspectRecoveryReview(handle: RecoveryReviewHandle): OperationReservation {
    requireState(this.#recoveryReviews.has(handle), 'recovery handle is foreign');
    const record = this.inspectOperation(recoveryReviewStore, handle.operation.operation_key);
    requireState(record, 'recovery reservation missing');
    return record;
  }

  #transitionRecoveryReview(handle: RecoveryReviewHandle, observed?: unknown): OperationReservation {
    const entry = this.#recoveryReviews.get(handle);
    requireState(entry, 'recovery handle is foreign');
    requireState(!this.#database.inTransaction, 'nested recovery transaction forbidden');
    const result = observed === undefined ? undefined : snapshot(observed);
    if (result !== undefined) {
      const value = result as Record<string, unknown>;
      requireState(
        value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          sameJson(
            Object.keys(value).sort(),
            ['action_id', 'caller_session', 'controller_id', 'observation', 'status'].sort(),
          ) &&
          value.action_id === handle.operation.operation_key &&
          value.caller_session === entry.binding.callerSession &&
          value.controller_id === entry.binding.controllerId &&
          ['PASS', 'FAIL'].includes(value.status as string) &&
          typeof value.observation === 'object' &&
          value.observation !== null &&
          !Array.isArray(value.observation),
        'recovery terminal observation differs',
      );
      const observation = value.observation as Record<string, unknown>;
      requireState(
        sameJson(Object.keys(observation).sort(), ['agent_id', 'result', 'tool_call_ref'].sort()) &&
          [observation.agent_id, observation.tool_call_ref].every(
            (v) => typeof v === 'string' && v.trim().length > 0 && v.length <= 512,
          ) &&
          observation.result !== null,
        'recovery actual native observation missing',
      );
    }
    return this.#transactionWithProducerFence(() => {
      this.#assertRecoveryReviewContext(entry.binding, entry.verifyContext);
      const stored = this.#governanceRead(recoveryReviewStore, 'operation', handle.operation.operation_key);
      requireState(stored, 'recovery reservation missing');
      const current = stored.record as OperationReservation;
      const original = { ...current, status: 'reserved' } as Record<string, unknown>;
      delete original.terminal_revision;
      delete original.result_digest;
      requireState(sameJson(original, handle.operation), 'recovery fencing conflict');
      const digest = result === undefined ? undefined : canonicalJsonDigest(result);
      if (result !== undefined && current.status === 'applied') {
        requireState(current.result_digest === digest, 'recovery terminal result conflict');
        return current;
      }
      requireState(
        current.status === (result === undefined ? 'reserved' : 'commit_unknown'),
        'recovery action already possible or terminal; reissue forbidden',
      );
      const next: OperationReservation = {
        ...current,
        status: result === undefined ? 'commit_unknown' : 'applied',
        terminal_revision: result === undefined ? 2 : 3,
        ...(digest === undefined ? {} : { result_digest: digest }),
      };
      this.#governanceWrite('operation', current.operation_key, next, stored);
      return snapshot(next);
    }).immediate();
  }
  beginRecoveryReview(handle: RecoveryReviewHandle): OperationReservation {
    return this.#transitionRecoveryReview(handle);
  }
  completeRecoveryReview(handle: RecoveryReviewHandle, observed: unknown): OperationReservation {
    requireState(observed !== undefined, 'recovery actual observation required');
    return this.#transitionRecoveryReview(handle, observed);
  }

  reserveOperation(
    storeId: string,
    key: string,
    requestDigest: string,
    expectedMaintenanceGeneration?: number,
  ): OperationReservation | null {
    requireState(
      storeId !== sessionProducerStore && storeId !== recoveryReviewStore,
      'protected session producer namespace or recovery review namespace',
    );
    requireState(
      typeof requestDigest === 'string' && hashPattern.test(requestDigest),
      'governance request digest invalid',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
      if (this.#governanceRead(storeId, 'operation', key)) return null;
      this.#governanceGeneration(storeId, true);
      const record: OperationReservation = {
        schema: 'OperationReservation/v1',
        store_id: storeId,
        operation_key: key,
        revision: 1,
        fencing_token: randomUUID(),
        status: 'reserved',
        created_at: new Date().toISOString(),
        request_digest: requestDigest,
      };
      this.#governanceWrite('operation', key, record, null);
      return snapshot(record);
    }).immediate();
  }
  inspectOperation(storeId: string, key: string): OperationReservation | null {
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#database
      .transaction(() => {
        this.#assertMaintenanceAvailable();
        return (this.#governanceRead(storeId, 'operation', key)?.record ?? null) as OperationReservation | null;
      })
      .deferred();
  }
  transitionOperation(
    reservation: OperationReservation,
    status: OperationReservationStatus,
    resultDigest?: string,
    expectedMaintenanceGeneration?: number,
  ): void {
    const token = snapshot(validateHostOperationReservation(reservation));
    requireState(
      token.store_id !== sessionProducerStore && token.store_id !== recoveryReviewStore,
      'protected session producer settlement or recovery review settlement',
    );
    requireState(token.status === 'reserved', 'original reservation receipt required');
    requireState(
      ['commit_unknown', 'applied', 'aborted'].includes(status) &&
        (status === 'applied'
          ? typeof resultDigest === 'string' && hashPattern.test(resultDigest)
          : resultDigest === undefined),
      'governance transition invalid',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
      const stored = this.#governanceRead(token.store_id, 'operation', token.operation_key);
      requireState(stored !== null, 'governance reservation missing');
      const current = stored.record as OperationReservation;
      const original = { ...current, status: 'reserved' } as Record<string, unknown>;
      delete original.terminal_revision;
      delete original.result_digest;
      requireState(
        canonicalJsonDigest(original) === canonicalJsonDigest(token),
        'governance reservation fencing conflict',
      );
      if (current.status === status) {
        requireState(current.result_digest === resultDigest, 'governance terminal result conflict');
        return;
      }
      requireState(
        status === 'applied' ? current.status === 'commit_unknown' : current.status === 'reserved',
        'governance terminal state conflict',
      );
      const next: OperationReservation = {
        ...current,
        status,
        terminal_revision: current.revision + (status === 'applied' ? 2 : 1),
        ...(resultDigest === undefined ? {} : { result_digest: resultDigest }),
      };
      this.#governanceWrite('operation', token.operation_key, next, stored);
    }).immediate();
  }
  async consumeApproval(
    storeId: string,
    binding: WorkflowApprovalBinding,
    apply: () => Promise<void>,
    expectedMaintenanceGeneration?: number,
  ): Promise<void> {
    const bound = snapshot(binding),
      key = canonicalJsonDigest(bound);
    requireState(typeof apply === 'function', 'workflow approval callback required');
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    const reserved = this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
      requireState(
        this.#governanceRead(storeId, 'approval', key) === null,
        'workflow approval receipt replay or commit unknown',
      );
      const record: WorkflowApprovalConsumptionRecord = {
        schema: 'EdictumWorkflowApprovalConsumption/v1',
        store_id: storeId,
        store_generation: this.#governanceGeneration(storeId, true),
        binding: bound,
        fencing_token: randomUUID(),
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        approval_expires_at: null,
        attempt_id: null,
      };
      this.#governanceWrite('approval', key, record, null);
      return snapshot(record);
    }).immediate();
    const transition = (from: 'reserved' | 'commit_unknown', status: 'commit_unknown' | 'applied'): void => {
      requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
      this.#transactionWithProducerFence(() => {
        this.#assertReconciliationWritesAllowed();
        this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
        const current = this.#governanceRead(storeId, 'approval', key);
        requireState(current !== null, 'workflow approval reservation missing');
        const value = current.record as WorkflowApprovalConsumptionRecord;
        requireState(
          value.status === from &&
            value.fencing_token === reserved.fencing_token &&
            value.store_generation === reserved.store_generation &&
            value.reserved_at === reserved.reserved_at &&
            canonicalJsonDigest(value.binding) === key,
          'workflow approval fencing conflict',
        );
        this.#governanceWrite('approval', key, { ...value, status, terminal_at: new Date().toISOString() }, current);
      }).immediate();
    };
    transition('reserved', 'commit_unknown');
    await apply();
    transition('commit_unknown', 'applied');
  }
  #assertDatabaseSupport(): void {
    const mode = (this.#database.query('PRAGMA journal_mode').get() as { journal_mode: string }).journal_mode;
    requireState(['wal', 'delete', 'truncate', 'persist'].includes(mode), 'recoverable database journal mode required');
    requireState(
      Number((this.#database.query('PRAGMA synchronous').get() as { synchronous: number }).synchronous) === 2,
      'FULL database synchronization required',
    );
  }
  #readMaintenanceFence(): MaintenanceFence | null {
    this.#assertDatabaseSupport();
    const row = this.#database
      .query('SELECT revision,payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
      .get(this.#workspaceId) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const fence = checkedMaintenanceFence(JSON.parse(row.payload));
    requireState(
      row.revision === fence.revision &&
        fence.workspace_id === this.#workspaceId &&
        row.digest === canonicalJsonDigest(fence),
      'maintenance fence checksum or identity invalid',
    );
    return fence;
  }
  #assertMaintenanceAvailable(): void {
    requireState(this.#readMaintenanceFence()?.status !== 'held', 'working access blocked by maintenance fence');
  }
  #maintenanceGeneration(): number {
    return this.#readMaintenanceFence()?.generation ?? 0;
  }
  #assertMaintenanceGeneration(expected: number | undefined): number {
    const value = expected === undefined ? 0 : expected;
    requireState(
      Number.isSafeInteger(value) && value >= 0 && value === this.#maintenanceGeneration(),
      'maintenance generation is stale or missing',
    );
    return value;
  }
  #assertMaintenanceQuiescent(): void {
    this.#assertGovernanceQuiescent();
    const rows = this.#database
      .query("SELECT id FROM agent_host_state WHERE workspace_id=? AND kind='work'")
      .all(this.#workspaceId) as { id: string }[];
    for (const row of rows) {
      const work = this.#load('work', row.id) as WorkState;
      requireState(work.lease === null, 'active work lease blocks maintenance');
    }
    const ledger = this.#load('ledger', 'shared') as CoordinationLedger | null;
    requireState(
      !ledger?.claims.some((claim) => claim.status === 'active') &&
        !ledger?.tickets.some((ticket) => ticket.status === 'active' || ticket.status === 'queued'),
      'queued/active coordination ownership blocks maintenance',
    );
  }
  #assertMaintenanceProjects(binding: MaintenanceFenceBinding): void {
    requireState(
      this.#maintenanceProjectIds !== undefined &&
        canonicalJsonDigest(binding.project_ids) === canonicalJsonDigest(this.#maintenanceProjectIds),
      'maintenance project authority mismatch',
    );
    const rows = this.#database
      .query("SELECT id FROM agent_host_state WHERE workspace_id=? AND kind='work'")
      .all(this.#workspaceId) as { id: string }[];
    for (const row of rows) {
      const work = this.#load('work', row.id) as WorkState;
      requireState(
        work.binding.project_ids.length > 0 &&
          new Set(work.binding.project_ids).size === work.binding.project_ids.length &&
          work.binding.project_ids.every((id) => binding.project_ids.includes(id)) &&
          (this.#repositoryRoot === undefined ||
            deriveWorkspaceId(work.binding.repository_id, this.#repositoryRoot) === this.#workspaceId),
        'maintenance scope excludes persisted project',
      );
    }
  }
  #assertMaintenanceReceipt(receipt: MaintenanceFenceReceipt): MaintenanceFence {
    requireState(
      receipt !== null && typeof receipt === 'object' && Object.keys(receipt).length === 2,
      'maintenance receipt invalid',
    );
    requireState(typeof receipt.token === 'string' && uuidPattern.test(receipt.token), 'maintenance token invalid');
    const expected = checkedMaintenanceFence(receipt.fence);
    const current = this.#readMaintenanceFence();
    requireState(
      current?.status === 'held' &&
        current.workspace_id === this.#workspaceId &&
        canonicalJsonDigest(current) === canonicalJsonDigest(expected) &&
        current.token_digest === maintenanceTokenDigest(current, receipt.token),
      'maintenance fence receipt stale or forged',
    );
    this.#assertMaintenanceProjects(current.binding);
    return current;
  }
  #assertMaintenanceControl(receipt?: MaintenanceFenceReceipt): void {
    const held = this.#readMaintenanceFence()?.status === 'held';
    requireState(
      held === (receipt !== undefined && receipt !== null),
      'maintenance receipt required only for a held fence',
    );
    if (receipt !== undefined && receipt !== null) this.#assertMaintenanceReceipt(receipt);
  }
  #assertMaintenanceGateBinding(
    receipt: MaintenanceFenceReceipt | undefined,
    binding: ReconciliationGateBinding,
  ): void {
    if (!receipt) return;
    requireState(
      receipt.fence.binding.operation_id === binding.operation_id &&
        receipt.fence.binding.manifest_digest === binding.manifest_digest &&
        receipt.fence.binding.request_digest === binding.request_digest &&
        receipt.fence.binding.bindings_digest === binding.bindings_digest &&
        receipt.fence.binding.closure_digest === binding.closure_digest,
      'maintenance fence does not bind reconciliation gate',
    );
  }
  #writeMaintenanceFence(next: MaintenanceFence, before: MaintenanceFence | null): void {
    const payload = canonicalJson(next),
      digest = canonicalJsonDigest(next);
    const result = before
      ? this.#database
          .query(
            'UPDATE agent_host_maintenance SET revision=?,payload=?,digest=? WHERE workspace_id=? AND revision=? AND digest=?',
          )
          .run(next.revision, payload, digest, this.#workspaceId, before.revision, canonicalJsonDigest(before))
      : this.#database
          .query('INSERT INTO agent_host_maintenance VALUES(?,?,?,?)')
          .run(this.#workspaceId, next.revision, payload, digest);
    requireState(result.changes === 1, 'maintenance fence compare-and-swap conflict');
  }
  #assertMaintenanceAcquisition(binding: MaintenanceFenceBinding, prior: MaintenanceFence | null): void {
    if (this.#verifyMaintenanceAcquisition)
      requireState(
        this.#verifyMaintenanceAcquisition(snapshot(binding), snapshot(prior)) === undefined,
        'maintenance acquisition verifier must be synchronous and throw on drift',
      );
  }
  acquireMaintenanceFence(binding: MaintenanceFenceBinding): MaintenanceFenceReceipt {
    const input = checkedMaintenanceBinding(snapshot(binding));
    requireState(this.#verifyMaintenanceRelease, 'trusted maintenance release verifier required');
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      const prior = this.#readMaintenanceFence();
      requireState(prior?.status !== 'held', 'maintenance fence already held');
      this.#assertMaintenanceProjects(input);
      this.#assertMaintenanceQuiescent();
      this.#assertMaintenanceAcquisition(input, prior);
      const token = randomUUID();
      const draft: MaintenanceFence = {
        schema: 'MaintenanceFence/v1',
        workspace_id: this.#workspaceId,
        revision: (prior?.revision ?? 0) + 1,
        generation: (prior?.generation ?? 0) + 1,
        status: 'held',
        binding: input,
        token_digest: '0'.repeat(64),
      };
      const fence = checkedMaintenanceFence({ ...draft, token_digest: maintenanceTokenDigest(draft, token) });
      this.#writeMaintenanceFence(fence, prior);
      return snapshot({ fence, token });
    }).immediate();
  }
  /** A durable, pre-recorded token closes the crash window before a repair can save its receipt. */
  acquireMaintenanceFenceWithRecordedToken(binding: MaintenanceFenceBinding, token: string): MaintenanceFenceReceipt {
    const input = checkedMaintenanceBinding(snapshot(binding));
    requireState(
      this.#verifyMaintenanceRelease && uuidPattern.test(token),
      'recorded maintenance token or release verifier invalid',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      const prior = this.#readMaintenanceFence();
      this.#assertMaintenanceAcquisition(input, prior);
      if (prior?.status === 'held') {
        const receipt = { fence: prior, token };
        requireState(
          canonicalJsonDigest(prior.binding) === canonicalJsonDigest(input),
          'held maintenance fence belongs to another operation',
        );
        this.#assertMaintenanceReceipt(receipt);
        return snapshot(receipt);
      }
      this.#assertMaintenanceProjects(input);
      this.#assertMaintenanceQuiescent();
      const draft: MaintenanceFence = {
        schema: 'MaintenanceFence/v1',
        workspace_id: this.#workspaceId,
        revision: (prior?.revision ?? 0) + 1,
        generation: (prior?.generation ?? 0) + 1,
        status: 'held',
        binding: input,
        token_digest: '0'.repeat(64),
      };
      const fence = checkedMaintenanceFence({ ...draft, token_digest: maintenanceTokenDigest(draft, token) });
      this.#writeMaintenanceFence(fence, prior);
      return snapshot({ fence, token });
    }).immediate();
  }
  readMaintenanceFence(): MaintenanceFence | null {
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#database.transaction(() => snapshot(this.#readMaintenanceFence())).deferred();
  }
  assertWorkingRepositoryRoot(repositoryRoot: string): void {
    requireState(
      this.#repositoryRoot !== undefined && this.#repositoryRoot === repositoryRootIdentity(repositoryRoot),
      'foreign repository working mutation',
    );
  }
  withWorkingMutation<T>(
    repositoryRoot: string,
    expectedMaintenanceGeneration: number,
    action: () => T,
    rollback: () => void,
  ): T {
    this.assertWorkingRepositoryRoot(repositoryRoot);
    requireState(typeof action === 'function', 'working mutation callback required');
    requireState(typeof rollback === 'function', 'working mutation rollback required');
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    let entered = false;
    let restored = false;
    const restore = (): void => {
      if (!entered || restored) return;
      restored = true;
      try {
        rollback();
      } catch {
        throw new HostStateError('working mutation rollback failed after transaction failure');
      }
    };
    try {
      return this.#transactionWithProducerFence(() => {
        this.#assertMaintenanceAvailable();
        this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
        entered = true;
        try {
          const result = action();
          requireState(
            result === null ||
              (typeof result !== 'object' && typeof result !== 'function') ||
              typeof (result as { then?: unknown }).then !== 'function',
            'working mutation callback must be synchronous',
          );
          return result;
        } catch (error) {
          restore();
          throw error;
        }
      }).immediate();
    } catch (error) {
      restore();
      throw error;
    }
  }
  assertMaintenanceFence(receipt: MaintenanceFenceReceipt): MaintenanceFence {
    const input = snapshot(receipt);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#database.transaction(() => snapshot(this.#assertMaintenanceReceipt(input))).deferred();
  }
  async releaseMaintenanceFence(receipt: MaintenanceFenceReceipt): Promise<MaintenanceFence> {
    requireState(this.#verifyMaintenanceRelease, 'trusted maintenance release verifier required');
    const input = snapshot(receipt);
    const observed = this.assertMaintenanceFence(input);
    const authorization = await this.#verifyMaintenanceRelease(observed);
    requireState(
      authorization?.schema === 'MaintenanceReleaseAuthorization/v1' &&
        authorization.principal === this.#maintenancePrincipal &&
        authorization.fence_digest === canonicalJsonDigest(observed) &&
        authorization.closure_digest === observed.binding.closure_digest &&
        authorization.bundle_digest === observed.binding.bundle_digest,
      'trusted maintenance closure verification failed',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      const current = this.#assertMaintenanceReceipt(input);
      this.#assertMaintenanceQuiescent();
      const next = checkedMaintenanceFence({ ...current, revision: current.revision + 1, status: 'released' });
      this.#writeMaintenanceFence(next, current);
      return snapshot(next);
    }).immediate();
  }
  #readReconciliationGate(): ReconciliationGate | null {
    this.#assertDatabaseSupport();
    const row = this.#database
      .query('SELECT revision,payload,digest FROM agent_host_reconciliation WHERE workspace_id=?')
      .get(this.#workspaceId) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const gate = checkedReconciliationGate(JSON.parse(row.payload));
    assertCanonicalJsonValue(gate, '$');
    requireState(
      Number.isSafeInteger(row.revision) &&
        row.revision === gate.revision &&
        row.digest === canonicalJsonDigest(gate) &&
        gate.schema === 'ReconciliationGate/v1',
      'reconciliation gate checksum or state invalid',
    );
    return gate;
  }
  #assertReconciliationWritesAllowed(): void {
    this.#assertMaintenanceAvailable();
    this.assertSessionProducerWriteAllowed();
    const status = this.#readReconciliationGate()?.status;
    requireState(
      status !== 'restoring' && status !== 'restored',
      'governance write blocked during reconciliation restore',
    );
  }
  #assertGovernanceQuiescent(): void {
    const workRows = this.#database
      .query("SELECT id FROM agent_host_state WHERE workspace_id=? AND kind='work'")
      .all(this.#workspaceId) as { id: string }[];
    for (const row of workRows) {
      const work = this.#load('work', row.id) as WorkState;
      requireState(
        work.execution.assignment_attempts.every(
          (attempt) => attempt.status !== 'started' && attempt.status !== 'uncertain',
        ),
        'workflow attempt is not quiescent for reconciliation',
      );
    }
    const records = this.#database
      .query('SELECT store_id,kind,record_key FROM agent_host_governance WHERE workspace_id=?')
      .all(this.#workspaceId) as { store_id: string; kind: string; record_key: string }[];
    for (const record of records) {
      requireState(record.kind === 'operation' || record.kind === 'approval', 'governance kind invalid');
      const status = this.#governanceRead(record.store_id, record.kind, record.record_key)?.record.status;
      requireState(status !== 'reserved' && status !== 'commit_unknown', 'governance is not quiescent for restore');
    }
  }
  #writeReconciliationGate(next: ReconciliationGate, before: ReconciliationGate | null): void {
    const payload = canonicalJson(next),
      digest = canonicalJsonDigest(next);
    const result = before
      ? this.#database
          .query(
            'UPDATE agent_host_reconciliation SET revision=?,payload=?,digest=? WHERE workspace_id=? AND revision=? AND digest=?',
          )
          .run(next.revision, payload, digest, this.#workspaceId, before.revision, canonicalJsonDigest(before))
      : this.#database
          .query('INSERT INTO agent_host_reconciliation VALUES(?,?,?,?)')
          .run(this.#workspaceId, next.revision, payload, digest);
    requireState(result.changes === 1, 'reconciliation gate compare-and-swap conflict');
  }
  openReconciliationGate(
    binding: ReconciliationGateBinding,
    maintenanceReceipt?: MaintenanceFenceReceipt,
    expectedMaintenanceGeneration?: number,
  ): ReconciliationGate {
    const input = checkedReconciliationGateBinding(snapshot(binding));
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceControl(maintenanceReceipt);
      this.#assertMaintenanceGateBinding(maintenanceReceipt, input);
      if (!maintenanceReceipt) this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
      const existing = this.#readReconciliationGate();
      this.#assertGovernanceQuiescent();
      if (existing) {
        requireState(
          existing.status === 'open' && canonicalJsonDigest(existing.binding) === canonicalJsonDigest(input),
          'reconciliation gate is already bound or terminal',
        );
        return snapshot(existing);
      }
      const keys = new Set<string>();
      for (const item of input.work) {
        const key = identityKey(item.identity);
        requireState(!keys.has(key), 'reconciliation gate work identity duplicate');
        keys.add(key);
        const current = this.#load('work', key) as WorkState | null;
        requireState(current !== null, 'reconciliation gate work state missing');
        matchesExpected(version(current), item.version);
      }
      const gate: ReconciliationGate = {
        schema: 'ReconciliationGate/v1',
        revision: 1,
        status: 'open',
        binding: input,
        fencing_token: randomUUID(),
        closed_work_version: null,
        closed_ledger_version: null,
      };
      this.#writeReconciliationGate(gate, null);
      return snapshot(gate);
    }).immediate();
  }
  importReconciledHostState(
    workStates: readonly WorkState[],
    coordinationLedger: CoordinationLedger,
    gateBinding: ReconciliationGateBinding,
    maintenanceReceipt?: MaintenanceFenceReceipt,
  ): ReconciliationGate {
    requireState(
      maintenanceReceipt !== undefined && maintenanceReceipt !== null,
      'held maintenance receipt required for host import',
    );
    requireState(Array.isArray(workStates) && workStates.length > 0, 'reconciled work state set is empty');
    const work = snapshot(workStates).map((value) => this.#checkedWork(value));
    const ledger = checkedLedger(snapshot(coordinationLedger));
    const binding = checkedReconciliationGateBinding(snapshot(gateBinding));
    requireState(ledger.workspace_id === this.#workspaceId, 'foreign workspace state');
    const keys = new Set<string>();
    for (const state of work) {
      const key = identityKey(workIdentity(state));
      requireState(state.workspace_id === this.#workspaceId && !keys.has(key), 'reconciled work identity invalid');
      requireState(
        !state.migration || state.migration.rebind_status === 'pending',
        'imported migration requires typed rebind',
      );
      keys.add(key);
      validatePair(state, ledger);
      if (state.lease) {
        const ticket = ledger.tickets.find((item) => item.ticket_id === state.lease!.ticket_id);
        requireState(ticket?.expires_at && timestamp(ticket.expires_at) > Date.now(), 'imported work lease expired');
      }
    }
    for (const ticket of ledger.tickets) {
      if (['queued', 'active', 'ready_for_handoff', 'blocked'].includes(ticket.status))
        requireState(keys.has(identityKey(ticketIdentity(ticket))), 'active ticket work state is missing');
    }
    const expectedWork = work
      .map((state) => ({ identity: workIdentity(state), version: version(state)! }))
      .sort((left, right) => {
        const a = identityKey(left.identity),
          b = identityKey(right.identity);
        return a < b ? -1 : a > b ? 1 : 0;
      });
    requireState(
      canonicalJsonDigest(binding.work) === canonicalJsonDigest(expectedWork),
      'reconciliation gate does not bind the imported work versions',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceControl(maintenanceReceipt);
      this.#assertMaintenanceGateBinding(maintenanceReceipt, binding);
      requireState(
        work.every(
          (state) =>
            canonicalJsonDigest(state.binding.project_ids) ===
            canonicalJsonDigest(maintenanceReceipt.fence.binding.project_ids),
        ),
        'imported project is outside maintenance authority',
      );
      requireState(
        work.every((state) => state.lease === null),
        'imported work lease blocks maintenance',
      );
      requireState(
        work.every((state) => state.execution.status !== 'active'),
        'imported active work requires a lease',
      );
      requireState(
        !ledger.claims.some((claim) => claim.status === 'active') &&
          !ledger.tickets.some((ticket) => ticket.status === 'active'),
        'imported coordination claim blocks maintenance',
      );
      const existing = this.#database
        .query('SELECT COUNT(*) AS count FROM agent_host_state WHERE workspace_id=?')
        .get(this.#workspaceId) as { count: number };
      const priorGate = this.#readReconciliationGate();
      if (existing.count !== 0 || priorGate !== null) {
        requireState(
          priorGate?.status === 'open' &&
            existing.count === work.length + 1 &&
            canonicalJsonDigest(priorGate.binding) === canonicalJsonDigest(binding),
          'reconciled host state already exists',
        );
        requireState(
          canonicalJsonDigest(this.#load('ledger', 'shared')) === canonicalJsonDigest(ledger) &&
            work.every(
              (state) =>
                canonicalJsonDigest(this.#load('work', identityKey(workIdentity(state)))) ===
                canonicalJsonDigest(state),
            ),
          'reconciled host state replay conflict',
        );
        return snapshot(priorGate);
      }
      this.#database
        .query(
          'INSERT INTO agent_host_state (revision, payload, digest, workspace_id, kind, id) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          ledger.revision,
          canonicalJson(ledger),
          canonicalJsonDigest(ledger),
          this.#workspaceId,
          'ledger',
          'shared',
        );
      for (const state of work)
        this.#database
          .query(
            'INSERT INTO agent_host_state (revision, payload, digest, workspace_id, kind, id) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .run(
            state.revision,
            canonicalJson(state),
            canonicalJsonDigest(state),
            this.#workspaceId,
            'work',
            identityKey(workIdentity(state)),
          );
      const gate: ReconciliationGate = {
        schema: 'ReconciliationGate/v1',
        revision: 1,
        status: 'open',
        binding,
        fencing_token: randomUUID(),
        closed_work_version: null,
        closed_ledger_version: null,
      };
      this.#writeReconciliationGate(gate, null);
      return snapshot(gate);
    }).immediate();
  }
  readReconciliationGate(): ReconciliationGate | null {
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#database.transaction(() => snapshot(this.#readReconciliationGate())).deferred();
  }
  reserveReconciliationRestore(
    binding: ReconciliationGateBinding,
    maintenanceReceipt?: MaintenanceFenceReceipt,
    expectedMaintenanceGeneration?: number,
  ): ReconciliationGate {
    const input = snapshot(binding);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceControl(maintenanceReceipt);
      this.#assertMaintenanceGateBinding(maintenanceReceipt, input);
      if (!maintenanceReceipt) this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
      const gate = this.#readReconciliationGate();
      requireState(
        gate && canonicalJsonDigest(gate.binding) === canonicalJsonDigest(input),
        'restore gate binding mismatch',
      );
      if (gate.status === 'restoring') return snapshot(gate);
      requireState(gate.status === 'open', 'restore closed after resumed work or prior restoration');
      this.#assertGovernanceQuiescent();
      for (const item of gate.binding.work) {
        const current = this.#load('work', identityKey(item.identity)) as WorkState | null;
        matchesExpected(version(current), item.version);
      }
      const next: ReconciliationGate = { ...gate, revision: gate.revision + 1, status: 'restoring' };
      this.#writeReconciliationGate(next, gate);
      return snapshot(next);
    }).immediate();
  }
  completeReconciliationRestore(
    reservation: ReconciliationGate,
    maintenanceReceipt?: MaintenanceFenceReceipt,
    expectedMaintenanceGeneration?: number,
  ): ReconciliationGate {
    const receipt = snapshot(reservation);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceControl(maintenanceReceipt);
      this.#assertMaintenanceGateBinding(maintenanceReceipt, receipt.binding);
      if (!maintenanceReceipt) this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
      const gate = this.#readReconciliationGate();
      requireState(
        gate &&
          gate.status === 'restoring' &&
          receipt.status === 'restoring' &&
          canonicalJsonDigest(gate) === canonicalJsonDigest(receipt),
        'restore reservation fencing conflict',
      );
      const next: ReconciliationGate = { ...gate, revision: gate.revision + 1, status: 'restored' };
      this.#writeReconciliationGate(next, gate);
      return snapshot(next);
    }).immediate();
  }
  #onReconciledWorkWrite(identity: WorkIdentity, before: StateVersion | null, after: StateVersion): void {
    const gate = this.#readReconciliationGate();
    if (!gate || gate.status === 'closed') return;
    requireState(gate.status === 'open', 'work write blocked during reconciliation restore');
    const item = gate.binding.work.find((entry) => identityKey(entry.identity) === identityKey(identity));
    requireState(item && before, 'work is outside the open reconciliation gate');
    matchesExpected(before, item.version);
    const next: ReconciliationGate = {
      ...gate,
      revision: gate.revision + 1,
      status: 'closed',
      closed_work_version: after,
      closed_ledger_version: version(this.#load('ledger', 'shared') as CoordinationLedger | null),
    };
    this.#writeReconciliationGate(next, gate);
  }
  #checkedWork(value: unknown, pendingReceipt?: RuntimeCodeRebindReceipt): WorkState {
    return checkedStoredWork(this.#database, this.#workspaceId, value, pendingReceipt);
  }
  #load(kind: 'work' | 'ledger', id: string): WorkState | CoordinationLedger | null {
    const row = this.#database
      .query('SELECT revision, payload, digest FROM agent_host_state WHERE workspace_id=? AND kind=? AND id=?')
      .get(this.#workspaceId, kind, id) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const parsed: unknown = JSON.parse(row.payload);
    assertCanonicalJsonValue(parsed, '$');
    const value = kind === 'work' ? this.#checkedWork(parsed) : checkedLedger(parsed);
    requireState(
      value.workspace_id === this.#workspaceId &&
        value.revision === row.revision &&
        canonicalJsonDigest(value) === row.digest,
      'stored state checksum or identity mismatch',
    );
    if (kind === 'work') requireState(identityKey(workIdentity(value as WorkState)) === id, 'stored work key mismatch');
    return value;
  }
  #read(identity: WorkIdentity): HostStateSnapshot {
    this.#assertDatabaseSupport();
    this.#assertMaintenanceAvailable();
    const work = this.#load('work', identityKey(identity)) as WorkState | null;
    const ledger = this.#load('ledger', 'shared') as CoordinationLedger | null;
    requireState(
      work || !ledger?.tickets.some((ticket) => identityKey(ticketIdentity(ticket)) === identityKey(identity)),
      'coordination ticket references missing work state',
    );
    validatePair(work, ledger);
    return snapshot({
      work,
      ledger,
      workVersion: version(work),
      ledgerVersion: version(ledger),
      maintenanceGeneration: this.#maintenanceGeneration(),
    });
  }
  readHostStateSnapshot(identity: WorkIdentity): HostStateSnapshot {
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#database.transaction(() => this.#read(identity)).deferred();
  }
  /** One transaction reads the existing authoritative rows; it grants no admission or completion. */
  readWorkspaceSnapshot(): {
    readonly schema: 'HostWorkspaceSnapshot/v1';
    readonly workspace_id: string;
    readonly work: readonly Pick<HostStateSnapshot, 'work' | 'workVersion' | 'maintenanceGeneration'>[];
    readonly ledger: CoordinationLedger | null;
    readonly ledger_version: StateVersion | null;
  } {
    requireState(!this.#database.inTransaction, 'nested workspace inspection forbidden');
    return this.#database
      .transaction(() => {
        const rows = this.#database
          .query("SELECT id FROM agent_host_state WHERE workspace_id=? AND kind='work' ORDER BY id")
          .all(this.#workspaceId) as { id: string }[];
        const work = rows.map((row) => {
          const current = this.#read(workIdentity(this.#load('work', row.id) as WorkState));
          return {
            work: current.work,
            workVersion: current.workVersion,
            maintenanceGeneration: current.maintenanceGeneration,
          };
        });
        const ledger = this.#load('ledger', 'shared') as CoordinationLedger | null;
        // Each authoritative row has already passed its own current-v1 ingress budget.
        // The trusted relational projection contains the shared ledger only once.
        return freezeJsonValue({
          schema: 'HostWorkspaceSnapshot/v1' as const,
          workspace_id: this.#workspaceId,
          work,
          ledger,
          ledger_version: version(ledger),
        });
      })
      .deferred();
  }
  readWorkSessionJournal(identity: WorkIdentity): {
    readonly attempt: number;
    readonly version: StateVersion;
    readonly state: Readonly<Record<string, unknown>>;
  } | null {
    requireState(!this.#database.inTransaction, 'nested journal inspection forbidden');
    return this.#database
      .transaction(() => {
        const work = this.#read(identity).work;
        requireState(work, 'journal work is unavailable');
        if (
          !this.#database
            .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_mastra_session_ledger'")
            .get()
        ) {
          requireState(work.execution.assignment_attempts.length === 0, 'journal missing for retained host effects');
          return null;
        }
        const row = this.#database
          .query(
            'SELECT attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
          )
          .get(this.#workspaceId, identity.work_id) as {
          attempt: number;
          revision: number;
          payload: string;
          digest: string;
        } | null;
        if (!row) {
          requireState(work.execution.assignment_attempts.length === 0, 'journal missing for retained host effects');
          return null;
        }
        const state = JSON.parse(row.payload) as Record<string, unknown>;
        validateWorkSessionBinding(work, state as unknown as MastraSessionLedgerState, this.#repositoryRoot);
        requireState(
          state.schema === 'MastraSessionLedger/v1' &&
            state.workspace_id === this.#workspaceId &&
            state.work_id === identity.work_id &&
            state.attempt === row.attempt &&
            canonicalJsonDigest(state) === row.digest,
          'journal inspection identity differs',
        );
        return snapshot({ attempt: row.attempt, version: { revision: row.revision, digest: row.digest }, state });
      })
      .deferred();
  }

  /** Bundle-owned current-v1 normalization with one atomic operation record and exact recovery preimages. */
  repairRequestTransitionFields(input: {
    readonly mode: 'inspect' | 'plan' | 'apply' | 'resume' | 'restore';
    readonly operationId: string;
    readonly actor?: string;
  }): Readonly<Record<string, unknown>> {
    return this.#repairWorkAuthority(input, 'request-transition');
  }
  repairCorrectionGeneration(input: {
    readonly mode: 'inspect' | 'plan' | 'apply' | 'resume' | 'restore';
    readonly operationId: string;
    readonly actor?: string;
  }): Readonly<Record<string, unknown>> {
    return this.#repairWorkAuthority(input, 'correction-generation');
  }

  /** Explicit repair input is the sole reader of missing assignment authority fields.
   * Preimages remain in this Host-owned operation; ordinary readers stay strict. */
  #repairWorkAuthority(
    input: {
      readonly mode: 'inspect' | 'plan' | 'apply' | 'resume' | 'restore';
      readonly operationId: string;
      readonly actor?: string;
    },
    kind: 'request-transition' | 'correction-generation',
  ): Readonly<Record<string, unknown>> {
    requireState(/^[a-z0-9][a-z0-9._-]{0,79}$/.test(input.operationId), 'correction repair identity invalid');
    requireState(
      ['inspect', 'plan', 'apply', 'resume', 'restore'].includes(input.mode) &&
        (input.mode === 'plan'
          ? Boolean(input.actor?.trim() && !/\p{Cc}/u.test(input.actor))
          : input.actor === undefined),
      'correction repair mode/attribution invalid',
    );
    requireState(!this.#database.inTransaction, 'nested correction repair forbidden');
    if (input.mode === 'plan') assertCanonicalJsonValue(input.actor);
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      type Row = { id: string; revision: number; payload: string; digest: string };
      const works = this.#database
        .query(
          "SELECT id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' ORDER BY id",
        )
        .all(this.#workspaceId) as Row[];
      const hasJournals = this.#database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_mastra_session_ledger'")
        .get();
      type JournalRow = { work_id: string; attempt: number; revision: number; payload: string; digest: string };
      const journals = hasJournals
        ? (this.#database
            .query(
              'SELECT work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? ORDER BY work_id,attempt',
            )
            .all(this.#workspaceId) as JournalRow[])
        : [];
      const maintenanceGeneration = this.#maintenanceGeneration();
      const normalizeAttempt = (value: AssignmentAttempt): AssignmentAttempt => {
        const hasGeneration = Object.hasOwn(value, 'correction_generation'),
          hasAuthority = Object.hasOwn(value, 'correction_authorization');
        requireState(hasGeneration === hasAuthority, 'partial assignment authority is ambiguous');
        return hasGeneration ? value : { ...value, correction_generation: 0, correction_authorization: null };
      };
      const journalItems = (state: MastraSessionLedgerState) => [
        ...state.items,
        ...state.completed.flatMap((wave) => wave.items),
      ];
      const unknownRepair = new Map<
        string,
        {
          readonly work: WorkState;
          readonly authorization: WorkflowAttemptApprovalAuthorization;
        }
      >();
      if (kind === 'correction-generation') {
        for (const row of works) {
          const work = JSON.parse(row.payload) as WorkState;
          const pendingAttempts = work.execution.assignment_attempts.filter(
            (attempt) => !['completed', 'no_effect'].includes(attempt.status),
          );
          if (pendingAttempts.length === 0) continue;
          requireState(
            work.lifecycle.assurance.correction_count === 0 && pendingAttempts.length === 1,
            'old corrective history cannot be inferred as base generation',
          );
          const attempt = normalizeAttempt(pendingAttempts[0]!);
          requireState(
            attempt.correction_generation === 0 &&
              attempt.correction_authorization === null &&
              attempt.status === 'started' &&
              attempt.result === null &&
              attempt.result_digest === null &&
              attempt.reconciliation === null,
            'only an original started unknown assignment can use the interrupted repair exception',
          );
          const matches: {
            journal: MastraSessionLedgerState;
            item: MastraSessionLedgerState['items'][number];
          }[] = [];
          for (const journalRow of journals) {
            if (journalRow.work_id !== work.binding.lifecycle_work_id) continue;
            requireState(
              canonicalJsonDigest(JSON.parse(journalRow.payload)) === journalRow.digest,
              'repair journal preimage integrity differs',
            );
            const journal = JSON.parse(journalRow.payload) as MastraSessionLedgerState;
            requireState(
              journal.schema === 'MastraSessionLedger/v1' &&
                journal.workspace_id === this.#workspaceId &&
                journal.work_id === work.binding.lifecycle_work_id &&
                journal.attempt === journalRow.attempt &&
                journal.run_id === work.execution.run_id &&
                journal.source_scope?.schema === 'ScopedSourceSnapshot/v1' &&
                journal.source_scope.digest === work.binding.work_source_revision &&
                journal.source_scope.digest ===
                  canonicalJsonDigest({
                    schema: journal.source_scope.schema,
                    entries: journal.source_scope.entries,
                  }),
              'repair journal identity differs',
            );
            for (const item of journalItems(journal)) {
              const reservation = item.host_reservation;
              if (reservation?.receipt.attempt.attempt_id === attempt.attempt_id) {
                matches.push({ journal, item });
              }
            }
          }
          requireState(matches.length === 1, 'interrupted repair requires one exact issued reservation');
          const match = matches[0]!,
            { item, journal } = match,
            reservation = item.host_reservation!,
            authorization = reservation.authorization;
          requireState(
            typeof item.issue_id === 'string' &&
              item.issue_id.length > 0 &&
              item.observation === null &&
              reservation.schema === 'WorkflowSessionReservation/v1' &&
              item.request.schema === 'VidaSessionRequest/v1' &&
              item.request.action_id ===
                canonicalJsonDigest({
                  context: {
                    work_id: work.binding.lifecycle_work_id,
                    attempt: journal.attempt,
                    scope_digest: work.binding.work_source_revision,
                  },
                  workflow_id: work.binding.workflow_id,
                  wave_index: item.request.wave_index,
                  stage_id: attempt.stage_id,
                  assignment_index: attempt.assignment_index,
                }) &&
              canonicalJson(normalizeAttempt(reservation.receipt.attempt)) === canonicalJson(attempt) &&
              identityKey(reservation.receipt.identity) === row.id &&
              reservation.receipt.maintenanceGeneration === maintenanceGeneration &&
              reservation.requestDigest === attempt.request_digest &&
              item.request.run_id === work.execution.run_id &&
              item.request.workflow_id === work.binding.workflow_id &&
              item.request.config_digest === work.binding.config_digest &&
              item.request.scope_digest === work.binding.work_source_revision &&
              item.request.stage_id === attempt.stage_id &&
              item.request.assignment_index === attempt.assignment_index &&
              !item.request.corrective_execution &&
              !journal.corrective_execution &&
              authorization?.approval?.status === 'commit_unknown' &&
              authorization.approval.attempt_id === attempt.attempt_id &&
              authorization.receipt.identity &&
              identityKey(authorization.receipt.identity) === row.id &&
              authorization.receipt.maintenanceGeneration === maintenanceGeneration &&
              canonicalJson(normalizeAttempt(authorization.receipt.attempt)) === canonicalJson(attempt) &&
              sameJson(authorization.receipt.workVersion, reservation.receipt.workVersion) &&
              canonicalJson(attempt.lease) === canonicalJson(work.lease) &&
              reservation.approvalAction === 'source.write' &&
              reservation.request.workItemId === work.binding.lifecycle_work_id &&
              reservation.request.stageId === item.request.stage_id &&
              reservation.request.assignmentIndex === item.request.assignment_index,
            'interrupted repair issue, authorization, or owner binding differs',
          );
          const invocation = reservation.invocation;
          requireState(
            invocation &&
              invocation.configDigest === work.binding.config_digest &&
              invocation.workflowId === work.binding.workflow_id &&
              invocation.teamId === work.binding.team_id &&
              invocation.profile.mutation_scope === 'repository_source' &&
              invocation.profile.egress_policy === 'none' &&
              sameJson(invocation.workContext.binding, work.binding) &&
              reservation.request.configDigest === work.binding.config_digest &&
              reservation.request.workflowId === work.binding.workflow_id &&
              reservation.request.teamId === work.binding.team_id &&
              invocation.stage.id === attempt.stage_id &&
              invocation.assignmentIndex === attempt.assignment_index &&
              sameJson(reservation.request.input, invocation.input) &&
              (invocation.input as Record<string, unknown>)?.bindings_manifest_ref ===
                item.request.bindings_manifest_ref &&
              attempt.request_digest ===
                canonicalJsonDigest({
                  binding: invocation.workContext.binding,
                  operation_digest: canonicalJsonDigest(invocation.operation),
                  stage_id: invocation.stage.id,
                  assignment_index: invocation.assignmentIndex,
                  role_instruction_digest: invocation.roleInstructionDigest,
                  input: invocation.input,
                }),
            'interrupted repair original invocation binding differs',
          );
          const approval = authorization!.approval!;
          const originalApprovalFields = {
            store_id: approval.store_id,
            action: 'source.write',
            identity: reservation.receipt.identity,
            config_digest: work.binding.config_digest,
            workflow_id: work.binding.workflow_id,
            stage_id: attempt.stage_id,
            assignment_id: attempt.assignment_id,
            assignment_index: attempt.assignment_index,
            request_digest: attempt.request_digest,
            attempt_id: attempt.attempt_id,
            lease: attempt.lease,
          };
          requireState(
            approval.binding.operation_hash === canonicalJsonDigest(originalApprovalFields) &&
              approval.binding.stage_id === attempt.stage_id &&
              approval.binding.tenant === work.binding.repository_id &&
              work.binding.project_ids.includes(approval.binding.project),
            'interrupted repair original approval binding differs',
          );
          const unknownIssuedItems = journals
            .filter((entry) => entry.work_id === work.binding.lifecycle_work_id)
            .flatMap((entry) => journalItems(JSON.parse(entry.payload) as MastraSessionLedgerState))
            .filter((entry) => entry.issue_id !== null && entry.observation === null);
          requireState(
            unknownIssuedItems.length === 1 && canonicalJson(unknownIssuedItems[0]) === canonicalJson(item),
            'interrupted repair has another issued unknown journal item',
          );
          unknownRepair.set(attempt.attempt_id, { work, authorization: authorization! });
        }
      }
      const states = works.map((row) => {
        const before = JSON.parse(row.payload) as WorkState;
        requireState(
          canonicalJsonDigest(before) === row.digest &&
            before.revision === row.revision &&
            before.workspace_id === this.#workspaceId &&
            identityKey(workIdentity(before)) === row.id,
          'repair work preimage integrity differs',
        );
        const missing = before.execution.assignment_attempts.some(
          (attempt) => !Object.hasOwn(attempt, 'correction_generation'),
        );
        requireState(
          !missing || before.lifecycle.assurance.correction_count === 0,
          'old corrective history cannot be inferred as base generation',
        );
        const current = this.#checkedWork(
          kind === 'correction-generation'
            ? {
                ...before,
                execution: {
                  ...before.execution,
                  assignment_attempts: before.execution.assignment_attempts.map(normalizeAttempt),
                },
              }
            : Object.hasOwn(before, 'request_transition')
              ? before
              : { ...before, request_transition: null },
        );
        requireState(
          current.execution.assignment_attempts.every(
            (attempt) =>
              attempt.status === 'completed' || attempt.status === 'no_effect' || unknownRepair.has(attempt.attempt_id),
          ),
          'repair requires terminal Host attempts',
        );
        return { row, before, current };
      });
      const ledger = this.#load('ledger', 'shared') as CoordinationLedger | null;
      if (kind === 'request-transition' || unknownRepair.size === 0) {
        requireState(
          kind === 'request-transition' || !ledger?.claims.some((claim) => claim.status === 'active'),
          'repair requires released ownership claims',
        );
      } else {
        requireState(unknownRepair.size === 1 && ledger, 'interrupted repair owner is ambiguous');
        const [entry] = [...unknownRepair.values()],
          work = entry!.work,
          lease = work.lease,
          ticket = ledger.tickets.find((candidate) => candidate.ticket_id === lease?.ticket_id),
          activeClaims = ledger.claims.filter(
            (claim) => claim.status === 'active' && claim.ticket_id === ticket?.ticket_id,
          );
        requireState(
          lease &&
            ticket?.status === 'active' &&
            ticket.work_id === work.binding.lifecycle_work_id &&
            ticket.repository_id === work.binding.repository_id &&
            canonicalJson(ticket.project_ids) === canonicalJson(work.binding.project_ids) &&
            ticket.thread_id === lease.thread_id &&
            ticket.generation === lease.generation &&
            activeClaims.length === 1 &&
            activeClaims[0]!.ticket_id === ticket.ticket_id &&
            ticket.claim_ids.includes(activeClaims[0]!.claim_id) &&
            activeClaims[0]!.work_id === ticket.work_id &&
            activeClaims[0]!.thread_id === ticket.thread_id &&
            activeClaims[0]!.generation === ticket.generation &&
            canonicalJson(activeClaims[0]!.resources) === canonicalJson(ticket.active_resources) &&
            ticket.active_resources.some((resource) => resource.startsWith('file:')) &&
            ticket.exclusive_resources.some((resource) => resource.startsWith('file:')),
          'interrupted repair source owner claim differs',
        );
        this.#assertNoOverlappingActiveSourceOwner(ledger, ticket);
        requireState(
          !ledger.tickets.some(
            (candidate) =>
              candidate.status === 'queued' &&
              candidate.sequence < ticket.sequence &&
              candidate.exclusive_resources.some((resource) => ticket.exclusive_resources.includes(resource)),
          ),
          'earlier FIFO Source owner is waiting for the resource',
        );
      }
      const governance = this.#database
        .query('SELECT store_id,kind,record_key FROM agent_host_governance WHERE workspace_id=?')
        .all(this.#workspaceId) as { store_id: string; kind: string; record_key: string }[];
      let matchedUnknownGovernance = 0;
      for (const record of governance) {
        requireState(record.kind === 'operation' || record.kind === 'approval', 'repair governance kind invalid');
        const current = this.#governanceRead(record.store_id, record.kind, record.record_key),
          matchingUnknown = [...unknownRepair.values()].some(({ authorization }) => {
            const approval = authorization?.approval;
            return (
              record.kind === 'approval' &&
              approval?.status === 'commit_unknown' &&
              record.store_id === approval.store_id &&
              record.record_key === canonicalJsonDigest(approval.binding) &&
              current?.record &&
              canonicalJson(current.record) === canonicalJson(approval)
            );
          });
        if (matchingUnknown) matchedUnknownGovernance++;
        requireState(
          current?.record.status !== 'reserved' && (current?.record.status !== 'commit_unknown' || matchingUnknown),
          'repair requires settled or exact retained unknown governance',
        );
      }
      requireState(
        matchedUnknownGovernance === unknownRepair.size,
        'interrupted repair retained approval governance is missing or duplicated',
      );
      const normalizeJournal = (before: MastraSessionLedgerState) => {
        const host = states.find((state) => state.current.binding.lifecycle_work_id === before.work_id)?.current;
        requireState(host && host.execution.run_id === before.run_id, 'repair journal/Host identity differs');
        const normalizeItem = (item: MastraSessionLedgerState['items'][number]) => {
          const rawAttempt = item.host_reservation?.receipt.attempt,
            interrupted = rawAttempt ? unknownRepair.get(rawAttempt.attempt_id) : undefined;
          requireState(
            item.issue_id === null ||
              item.observation !== null ||
              (interrupted !== undefined && item.issue_id !== null && item.observation === null),
            'repair requires terminal issued observations',
          );
          if (!item.host_reservation) return item;
          const reservation = item.host_reservation,
            attempt = normalizeAttempt(reservation.receipt.attempt);
          const authorization = reservation.authorization
            ? {
                ...reservation.authorization,
                receipt: {
                  ...reservation.authorization.receipt,
                  attempt: normalizeAttempt(reservation.authorization.receipt.attempt),
                },
              }
            : undefined;
          const actual = host.execution.assignment_attempts.find(
            (candidate) => candidate.attempt_id === attempt.attempt_id,
          );
          requireState(
            !authorization ||
              (sameJson(authorization.receipt.identity, reservation.receipt.identity) &&
                authorization.receipt.maintenanceGeneration === reservation.receipt.maintenanceGeneration &&
                (sameJson(authorization.receipt.attempt, attempt) ||
                  sameJson(authorization.receipt.attempt, {
                    ...attempt,
                    status: 'started',
                    result: null,
                    result_digest: null,
                  }))),
            'repair authorization receipt differs from its reservation',
          );
          requireState(
            actual &&
              (sameJson(actual, attempt) ||
                (actual.status === 'completed' &&
                  sameJson(attempt, { ...actual, status: 'started', result: null, result_digest: null }))) &&
              ((actual.status === 'completed' &&
                item.observation?.host_attempt_id === attempt.attempt_id &&
                actual.result_digest === canonicalJsonDigest(item.observation)) ||
                (interrupted !== undefined &&
                  actual.status === 'started' &&
                  item.issue_id !== null &&
                  item.observation === null &&
                  authorization !== undefined &&
                  canonicalJson(authorization.receipt.attempt) === canonicalJson(actual) &&
                  authorization.approval?.status === 'commit_unknown' &&
                  authorization.approval.attempt_id === actual.attempt_id)),
            'repair reservation is not an exact terminal or retained unknown Host attempt',
          );
          return {
            ...item,
            host_reservation: {
              ...reservation,
              receipt: { ...reservation.receipt, attempt },
              ...(authorization ? { authorization } : {}),
            },
          };
        };
        return {
          ...before,
          items: before.items.map(normalizeItem),
          completed: before.completed.map((wave) => ({ ...wave, items: wave.items.map(normalizeItem) })),
        };
      };
      const journalChanges =
        kind === 'request-transition'
          ? []
          : journals.flatMap((row) => {
              const before = JSON.parse(row.payload) as MastraSessionLedgerState;
              requireState(
                before.schema === 'MastraSessionLedger/v1' &&
                  before.work_id === row.work_id &&
                  before.attempt === row.attempt &&
                  canonicalJsonDigest(before) === row.digest,
                'repair journal preimage integrity differs',
              );
              const needsNormalization = journalItems(before).some((item) =>
                [item.host_reservation?.receipt.attempt, item.host_reservation?.authorization?.receipt.attempt].some(
                  (attempt) =>
                    attempt !== undefined &&
                    (!Object.hasOwn(attempt, 'correction_generation') ||
                      !Object.hasOwn(attempt, 'correction_authorization')),
                ),
              );
              if (!needsNormalization) return [];
              const normalized = normalizeJournal(before);
              return canonicalJson(normalized) === canonicalJson(before) ? [] : [{ row, before, after: normalized }];
            });
      const workChanges = states.flatMap(({ row, before, current }) =>
        canonicalJson(before) === canonicalJson(current)
          ? []
          : [
              {
                row,
                before,
                after: this.#checkedWork({
                  ...current,
                  revision: current.revision + 1,
                  lifecycle: { ...current.lifecycle, revision: current.lifecycle.revision + 1 },
                }),
              },
            ],
      );
      const bindings = {
        maintenance_generation: maintenanceGeneration,
        ledger: version(ledger),
        works: works.map((row) => ({ id: row.id, revision: row.revision, digest: row.digest })),
        journals: journals.map((row) => ({
          work_id: row.work_id,
          attempt: row.attempt,
          revision: row.revision,
          digest: row.digest,
        })),
        governance: governance.map((row) => ({
          ...row,
          digest: canonicalJsonDigest(
            this.#governanceRead(row.store_id, row.kind as 'operation' | 'approval', row.record_key),
          ),
        })),
      };
      if (input.mode === 'inspect')
        return snapshot({
          schema: 'CorrectionGenerationRepairInspection/v1',
          operation_id: input.operationId,
          status: 'repairable_current_v1',
          bindings,
          changed_work: workChanges.map((change) => ({
            identity: workIdentity(change.before),
            version: version(change.before),
          })),
          changed_journals: journalChanges.length,
        });
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_work_state_repair (workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id))',
      );
      const stored = this.#database
        .query('SELECT payload,digest FROM agent_host_work_state_repair WHERE workspace_id=? AND operation_id=?')
        .get(this.#workspaceId, input.operationId) as { payload: string; digest: string } | null;
      type Operation = {
        schema: 'CorrectionGenerationRepairOperation/v1' | 'WorkStateRepairOperation/v1';
        operation_id: string;
        workspace_id: string;
        actor: string;
        status: 'planned' | 'applied' | 'restored';
        bindings: typeof bindings;
        work_changes: typeof workChanges;
        journal_changes: typeof journalChanges;
        post_bindings?: typeof bindings;
      };
      const payloadDigest = (payload: string): string => createHash('sha256').update(payload).digest('hex');
      if (stored) requireState(payloadDigest(stored.payload) === stored.digest, 'repair operation checksum differs');
      const rawOperation = stored ? JSON.parse(stored.payload) : null;
      const serialize = (value: Operation): unknown =>
        kind === 'correction-generation'
          ? value
          : {
              schema: 'WorkStateRepairOperation/v1',
              operation_id: value.operation_id,
              workspace_id: value.workspace_id,
              actor: value.actor,
              status: value.status,
              bindings: {
                ledger_version: value.bindings.ledger,
                journals: value.bindings.journals.map((row) => ({
                  work_id: row.work_id,
                  attempt: row.attempt,
                  version: { revision: row.revision, digest: row.digest },
                })),
              },
              changes: value.work_changes.map((change) => ({
                identity: workIdentity(change.before),
                before: change.before,
                after: change.after,
              })),
              ...(value.status === 'restored'
                ? {
                    restored: value.work_changes.map((change) => ({
                      ...change.before,
                      revision: change.after.revision + 1,
                      lifecycle: { ...change.before.lifecycle, revision: change.after.lifecycle.revision + 1 },
                    })),
                  }
                : {}),
            };
      // Bundle-owned recovery aggregates contain individually bounded rows, not one public ingress document.
      const operationPayload = (value: Operation): string => JSON.stringify(serialize(value));
      const operationSnapshot = (payload: string): Readonly<Record<string, unknown>> =>
        freezeJsonValue(JSON.parse(payload));
      let operation: Operation | null = rawOperation
        ? kind === 'correction-generation'
          ? rawOperation
          : {
              ...rawOperation,
              bindings,
              work_changes: rawOperation.changes.map((change: { before: WorkState; after: WorkState }) => ({
                row: {
                  id: identityKey(workIdentity(change.before)),
                  revision: change.before.revision,
                  payload: canonicalJson(change.before),
                  digest: canonicalJsonDigest(change.before),
                },
                before: change.before,
                after: change.after,
              })),
              journal_changes: [],
            }
        : null;
      if (operation)
        requireState(
          operation.schema ===
            (kind === 'correction-generation'
              ? 'CorrectionGenerationRepairOperation/v1'
              : 'WorkStateRepairOperation/v1') &&
            operation.operation_id === input.operationId &&
            operation.workspace_id === this.#workspaceId,
          'repair operation integrity differs',
        );
      if (input.mode === 'plan') {
        if (operation) {
          requireState(operation.actor === input.actor, 'repair attribution differs');
          return operationSnapshot(operationPayload(operation));
        }
        operation = {
          schema:
            kind === 'correction-generation' ? 'CorrectionGenerationRepairOperation/v1' : 'WorkStateRepairOperation/v1',
          operation_id: input.operationId,
          workspace_id: this.#workspaceId,
          actor: input.actor!,
          status: 'planned',
          bindings,
          work_changes: workChanges,
          journal_changes: journalChanges,
        };
        const payload = operationPayload(operation);
        this.#database
          .query('INSERT INTO agent_host_work_state_repair VALUES(?,?,?,?)')
          .run(this.#workspaceId, input.operationId, payload, payloadDigest(payload));
        return operationSnapshot(payload);
      }
      requireState(operation, 'correction repair frozen plan unavailable');
      const restoring = input.mode === 'restore';
      if (operation.status === 'restored') {
        requireState(
          restoring &&
            (kind === 'request-transition'
              ? sameJson(
                  states
                    .filter((state) => operation!.work_changes.some((change) => change.row.id === state.row.id))
                    .map((state) => state.before),
                  rawOperation.restored,
                )
              : canonicalJson(bindings) === canonicalJson(operation.post_bindings)),
          'restored repair changed',
        );
        return operationSnapshot(operationPayload(operation));
      }
      if (operation.status === 'applied' && !restoring) {
        requireState(
          kind === 'request-transition'
            ? operation.work_changes.every((change) =>
                sameJson(states.find((state) => state.row.id === change.row.id)?.before, change.after),
              )
            : canonicalJson(bindings) === canonicalJson(operation.post_bindings),
          'applied repair changed',
        );
        return operationSnapshot(operationPayload(operation));
      }
      requireState(
        kind === 'request-transition'
          ? sameJson(rawOperation.bindings, {
              ledger_version: bindings.ledger,
              journals: bindings.journals.map((row) => ({
                work_id: row.work_id,
                attempt: row.attempt,
                version: { revision: row.revision, digest: row.digest },
              })),
            })
          : canonicalJson(bindings) ===
              canonicalJson(operation.status === 'applied' ? operation.post_bindings : operation.bindings),
        'repair dependency CAS conflict',
      );
      for (const change of operation.work_changes) {
        const expected = operation.status === 'applied' ? change.after : change.before,
          target = restoring
            ? kind === 'correction-generation'
              ? this.#checkedWork({
                  ...change.after,
                  revision: (operation.status === 'applied' ? change.after.revision : change.before.revision) + 1,
                  lifecycle: {
                    ...change.after.lifecycle,
                    revision:
                      (operation.status === 'applied'
                        ? change.after.lifecycle.revision
                        : change.before.lifecycle.revision) + 1,
                  },
                })
              : operation.status === 'applied'
                ? {
                    ...change.before,
                    revision: change.after.revision + 1,
                    lifecycle: { ...change.before.lifecycle, revision: change.after.lifecycle.revision + 1 },
                  }
                : change.before
            : change.after;
        requireState(canonicalJsonDigest(change.before) === change.row.digest, 'repair frozen work preimage differs');
        const normalized = {
          ...change.before,
          ...(kind === 'correction-generation'
            ? {
                execution: {
                  ...change.before.execution,
                  assignment_attempts: change.before.execution.assignment_attempts.map(normalizeAttempt),
                },
              }
            : { request_transition: null }),
          revision: change.before.revision + 1,
          lifecycle: { ...change.before.lifecycle, revision: change.before.lifecycle.revision + 1 },
        };
        requireState(canonicalJson(normalized) === canonicalJson(change.after), 'repair frozen transformation differs');
        const result = this.#database
          .query(
            "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
          )
          .run(
            target.revision,
            canonicalJson(target),
            canonicalJsonDigest(target),
            this.#workspaceId,
            change.row.id,
            expected.revision,
            canonicalJsonDigest(expected),
          );
        requireState(result.changes === 1, 'repair work CAS conflict');
      }
      for (const change of operation.journal_changes) {
        const expected = operation.status === 'applied' ? change.after : change.before,
          target = change.after;
        requireState(
          canonicalJsonDigest(change.before) === change.row.digest,
          'repair frozen journal preimage differs',
        );
        requireState(
          sameJson(normalizeJournal(change.before), change.after),
          'repair frozen journal transformation differs',
        );
        const result = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            restoring && operation.status === 'applied' ? change.row.revision + 2 : change.row.revision + 1,
            canonicalJson(target),
            canonicalJsonDigest(target),
            this.#workspaceId,
            change.row.work_id,
            change.row.attempt,
            operation.status === 'applied' ? change.row.revision + 1 : change.row.revision,
            canonicalJsonDigest(expected),
          );
        requireState(result.changes === 1, 'repair journal CAS conflict');
      }
      const post = {
        ...bindings,
        works: bindings.works.map((row) => {
          const change = operation!.work_changes.find((change) => change.row.id === row.id);
          const target = change
            ? restoring
              ? kind === 'correction-generation'
                ? {
                    ...change.after,
                    revision: (operation.status === 'applied' ? change.after.revision : change.before.revision) + 1,
                    lifecycle: {
                      ...change.after.lifecycle,
                      revision:
                        (operation.status === 'applied'
                          ? change.after.lifecycle.revision
                          : change.before.lifecycle.revision) + 1,
                    },
                  }
                : change.before
              : change.after
            : null;
          return target ? { id: row.id, revision: target.revision, digest: canonicalJsonDigest(target) } : row;
        }),
        journals: bindings.journals.map((row) => {
          const change = operation!.journal_changes.find(
            (change) => change.row.work_id === row.work_id && change.row.attempt === row.attempt,
          );
          const target = change ? change.after : null;
          return target
            ? {
                work_id: row.work_id,
                attempt: row.attempt,
                revision:
                  restoring && operation.status === 'applied' ? change!.row.revision + 2 : change!.row.revision + 1,
                digest: canonicalJsonDigest(target),
              }
            : row;
        }),
      };
      const next = {
        ...operation,
        status: restoring ? ('restored' as const) : ('applied' as const),
        post_bindings: post,
      };
      const payload = operationPayload(next);
      const saved = this.#database
        .query(
          'UPDATE agent_host_work_state_repair SET payload=?,digest=? WHERE workspace_id=? AND operation_id=? AND digest=?',
        )
        .run(payload, payloadDigest(payload), this.#workspaceId, input.operationId, stored!.digest);
      requireState(saved.changes === 1, 'repair operation CAS conflict');
      return operationSnapshot(payload);
    }).immediate();
  }

  /** Admit and supersede as one HostState/coordination transaction, without rewriting native journals. */
  admitSuccessorWork(input: {
    readonly nextWork: WorkState;
    readonly nextLedger: CoordinationLedger;
    readonly expectedLedger: StateVersion | null;
    readonly expectedMaintenanceGeneration: number;
    readonly nativeSessionHandle: string;
    readonly requestPointer: string;
    readonly predecessors: readonly {
      readonly identity: WorkIdentity;
      readonly expectedWork: StateVersion;
      readonly attempt: number;
      readonly expectedJournal: StateVersion;
      readonly requestPointer: string;
    }[];
    readonly verifySuccessor: () => void;
    readonly verifyCurrent: (
      work: WorkState,
      journal: Readonly<Record<string, unknown>>,
      requestPointer: string,
    ) => void;
  }): HostStateSnapshot {
    const successor = this.#checkedWork(snapshot(input.nextWork));
    const incomingLedger = checkedLedger(snapshot(input.nextLedger));
    requireState(
      successor.workspace_id === this.#workspaceId &&
        incomingLedger.workspace_id === this.#workspaceId &&
        input.requestPointer.length > 0 &&
        input.nativeSessionHandle.length > 0 &&
        !/\p{Cc}/u.test(input.requestPointer + input.nativeSessionHandle),
      'successor identity invalid',
    );
    requireState(!this.#database.inTransaction, 'nested successor admission forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      const gate = this.#readReconciliationGate();
      requireState(!gate || gate.status === 'closed', 'successor admission blocked by current reconciliation');
      const before = this.#read(workIdentity(successor));
      if (before.work) {
        requireState(
          sameJson(before.work.binding, successor.binding) &&
            sameJson(before.work.contracts, successor.contracts) &&
            before.work.execution.run_id === successor.execution.run_id &&
            before.work.execution.input_digest === successor.execution.input_digest &&
            before.work.request_transition?.request_pointer === input.requestPointer &&
            before.work.request_transition.native_session_handle === input.nativeSessionHandle &&
            sameJson(
              before.work.request_transition.predecessor_work_ids,
              input.predecessors.map((entry) => entry.identity.work_id).sort(),
            ),
          'successor retry differs from admitted intent',
        );
        return before;
      }
      matchesExpected(before.workVersion, null);
      matchesExpected(before.ledgerVersion, input.expectedLedger);
      input.verifySuccessor();
      validatePair(successor, incomingLedger);
      validateProgress(before, successor, incomingLedger);
      const baseline = before.ledger;
      requireState(input.predecessors.length === 0 || baseline !== null, 'predecessors need existing coordination');
      unique(
        input.predecessors.map((entry) => identityKey(entry.identity)),
        'successor predecessors',
      );
      const now = new Date().toISOString();
      let ledger = incomingLedger;
      const updates: { before: HostStateSnapshot; next: WorkState }[] = [];
      for (const candidate of input.predecessors) {
        const prior = this.#read(candidate.identity);
        matchesExpected(prior.workVersion, candidate.expectedWork);
        requireState(
          prior.work &&
            baseline &&
            prior.workVersion &&
            prior.work.binding.repository_id === successor.binding.repository_id &&
            sameJson(prior.work.binding.project_ids, successor.binding.project_ids) &&
            prior.work.binding.integrations_digest === successor.binding.integrations_digest &&
            candidate.identity.work_id !== successor.binding.lifecycle_work_id &&
            candidate.requestPointer.length > 0 &&
            candidate.requestPointer !== input.requestPointer &&
            prior.work.request_transition?.successor_work_id == null &&
            prior.work.execution.status !== 'complete' &&
            prior.work.lifecycle.phase !== 'COMPLETE' &&
            !prior.work.execution.assignment_attempts.some((entry) => ['started', 'uncertain'].includes(entry.status)),
          'predecessor authority or active source effect prevents absorption',
        );
        const work = prior.work;
        const tickets = baseline.tickets.filter(
          (ticket) =>
            identityKey(ticketIdentity(ticket)) === identityKey(candidate.identity) &&
            ['active', 'queued', 'blocked'].includes(ticket.status),
        );
        requireState(
          tickets.length > 0 && tickets.every((ticket) => ticket.thread_id === input.nativeSessionHandle),
          'predecessor owner or ticket differs',
        );
        const journalRow = this.#database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(this.#workspaceId, candidate.identity.work_id, candidate.attempt) as {
          revision: number;
          payload: string;
          digest: string;
        } | null;
        requireState(
          journalRow &&
            journalRow.revision === candidate.expectedJournal.revision &&
            journalRow.digest === candidate.expectedJournal.digest,
          'predecessor journal CAS changed',
        );
        const journal = JSON.parse(journalRow.payload) as Record<string, unknown>;
        requireState(
          canonicalJsonDigest(journal) === journalRow.digest &&
            journal.schema === 'MastraSessionLedger/v1' &&
            journal.workspace_id === this.#workspaceId &&
            journal.work_id === candidate.identity.work_id &&
            journal.attempt === candidate.attempt &&
            journal.run_id === work.execution.run_id &&
            Array.isArray(journal.items) &&
            Array.isArray(journal.completed),
          'predecessor journal identity invalid',
        );
        const journalItems = [
          ...(journal.items as Record<string, unknown>[]),
          ...(journal.completed as { items: Record<string, unknown>[] }[]).flatMap((wave) => wave.items),
        ];
        requireState(
          journalItems.every(
            (item) =>
              !item.host_reservation ||
              completedSourceJournalObservationMatches(
                work,
                item as unknown as MastraSessionLedgerState['items'][number],
              ),
          ),
          'reserved source action prevents absorption',
        );
        input.verifyCurrent(snapshot(work), snapshot(journal), candidate.requestPointer);
        const ids = new Set(tickets.map((ticket) => ticket.ticket_id));
        const next = this.#checkedWork({
          ...work,
          revision: work.revision + 1,
          lease: null,
          request_transition: {
            schema: 'WorkRequestTransition/v1',
            request_pointer: candidate.requestPointer,
            native_session_handle: input.nativeSessionHandle,
            predecessor_work_ids: work.request_transition?.predecessor_work_ids ?? [],
            successor_work_id: successor.binding.lifecycle_work_id,
          },
          execution: { ...work.execution, status: 'suspended' },
          lifecycle: {
            ...work.lifecycle,
            revision: work.lifecycle.revision + 1,
            next_action: 'Continue unfinished intent through successor ' + successor.binding.lifecycle_work_id + '.',
          },
        });
        const releaseTickets = (values: CoordinationLedger['tickets']) =>
          values.map((ticket) =>
            ids.has(ticket.ticket_id)
              ? {
                  ...ticket,
                  status: 'released' as const,
                  expires_at: null,
                  active_resources: [],
                  blocked_resources: [],
                }
              : ticket,
          );
        const releaseClaims = (values: CoordinationLedger['claims']) =>
          values.map((claim) =>
            ids.has(claim.ticket_id) && claim.status === 'active'
              ? { ...claim, status: 'released' as const, renewed_at: now }
              : claim,
          );
        const operations = tickets.map((ticket) => ({
          schema: 'CoordinationOperation/v1' as const,
          operation_id:
            'absorb-' +
            canonicalJsonDigest({ successor: successor.binding.lifecycle_work_id, ticket: ticket.ticket_id }).slice(
              0,
              40,
            ),
          kind: 'release' as const,
          ticket_id: ticket.ticket_id,
          work_id: ticket.work_id,
          thread_id: ticket.thread_id,
          source_revision: ticket.source_revision,
          resources: ticket.exclusive_resources,
          from_ledger_revision: baseline.revision,
          to_ledger_revision: incomingLedger.revision,
          decided_by: input.nativeSessionHandle,
          decision_pointer: input.requestPointer,
          created_at: now,
        }));
        const projection = checkedLedger({
          ...baseline,
          revision: baseline.revision + 1,
          tickets: releaseTickets(baseline.tickets),
          claims: releaseClaims(baseline.claims),
          operations: [...baseline.operations, ...operations],
        });
        validatePair(next, projection);
        validateProgress(prior, { ...next, request_transition: work.request_transition ?? null }, projection);
        ledger = checkedLedger({
          ...ledger,
          tickets: releaseTickets(ledger.tickets),
          claims: releaseClaims(ledger.claims),
          operations: [...ledger.operations, ...operations],
        });
        updates.push({ before: prior, next });
      }
      const nextSuccessor = this.#checkedWork({
        ...successor,
        request_transition: {
          schema: 'WorkRequestTransition/v1',
          request_pointer: input.requestPointer,
          native_session_handle: input.nativeSessionHandle,
          predecessor_work_ids: input.predecessors.map((entry) => entry.identity.work_id).sort(),
          successor_work_id: null,
        },
      });
      validatePair(nextSuccessor, ledger);
      for (const { next } of updates) validatePair(next, ledger);
      for (const entry of [...updates, { before, next: nextSuccessor }]) {
        const id = identityKey(workIdentity(entry.next));
        const priorVersion = entry.before.workVersion;
        const result = priorVersion
          ? this.#database
              .query(
                "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
              )
              .run(
                entry.next.revision,
                canonicalJson(entry.next),
                canonicalJsonDigest(entry.next),
                this.#workspaceId,
                id,
                priorVersion.revision,
                priorVersion.digest,
              )
          : this.#database
              .query(
                "INSERT INTO agent_host_state (revision,payload,digest,workspace_id,kind,id) VALUES(?,?,?,?,'work',?)",
              )
              .run(
                entry.next.revision,
                canonicalJson(entry.next),
                canonicalJsonDigest(entry.next),
                this.#workspaceId,
                id,
              );
        requireState(result.changes === 1, 'successor work CAS conflict');
      }
      const priorLedger = before.ledgerVersion;
      const result = priorLedger
        ? this.#database
            .query(
              "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND id='shared' AND revision=? AND digest=?",
            )
            .run(
              ledger.revision,
              canonicalJson(ledger),
              canonicalJsonDigest(ledger),
              this.#workspaceId,
              priorLedger.revision,
              priorLedger.digest,
            )
        : this.#database
            .query(
              "INSERT INTO agent_host_state (revision,payload,digest,workspace_id,kind,id) VALUES(?,?,?,?,'ledger','shared')",
            )
            .run(ledger.revision, canonicalJson(ledger), canonicalJsonDigest(ledger), this.#workspaceId);
      requireState(result.changes === 1, 'successor ledger CAS conflict');
      return this.#read(workIdentity(nextSuccessor));
    }).immediate();
  }
  #writeAttempts(before: HostStateSnapshot, attempts: readonly AssignmentAttempt[]): HostStateSnapshot {
    const revision = before.work!.revision + 1;
    const work = this.#checkedWork({
      ...before.work!,
      revision,
      execution: { ...before.work!.execution, assignment_attempts: attempts },
      lifecycle: { ...before.work!.lifecycle, revision },
    });
    const result = this.#database
      .query(
        'UPDATE agent_host_state SET revision=?, payload=?, digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
      )
      .run(
        work.revision,
        canonicalJson(work),
        canonicalJsonDigest(work),
        this.#workspaceId,
        'work',
        identityKey(workIdentity(work)),
        before.workVersion!.revision,
        before.workVersion!.digest,
      );
    requireState(result.changes === 1, 'attempt work compare-and-swap conflict');
    this.#onReconciledWorkWrite(workIdentity(work), before.workVersion, version(work)!);
    return this.#read(workIdentity(work));
  }
  async rebindMigratedWork(request: MigrationRebindRequest): Promise<HostStateSnapshot> {
    requireState(this.#verifyMigrationRebind, 'trusted migration rebind verifier required');
    const input = snapshot(request);
    requireState(
      Object.keys(input).length === (input.expectedMaintenanceGeneration === undefined ? 6 : 7) &&
        hashPattern.test(input.sourceSha256) &&
        hashPattern.test(input.migrationId) &&
        typeof input.decisionPointer === 'string' &&
        input.decisionPointer.trim() === input.decisionPointer &&
        input.decisionPointer.length > 0 &&
        input.decisionPointer.length <= 2048 &&
        !/\p{Cc}/u.test(input.decisionPointer),
      'migration rebind request invalid',
    );
    const before = this.readHostStateSnapshot(input.identity);
    this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
    const migration = before.work?.migration;
    requireState(
      migration && migration.source_sha256 === input.sourceSha256 && migration.migration_id === input.migrationId,
      'migration rebind source binding invalid',
    );
    const expected: MigrationRebindAuthorization = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity: input.identity,
        migration_id: input.migrationId,
        source_sha256: input.sourceSha256,
        principal: this.migrationRebindPrincipal!,
        decision_pointer: input.decisionPointer,
      }),
      identity: input.identity,
      principal: this.migrationRebindPrincipal!,
      decision_pointer: input.decisionPointer,
      source_sha256: input.sourceSha256,
      migration_id: input.migrationId,
    };
    if (migration.rebind_status === 'accepted') {
      const receipt: MigrationRebindReceipt = {
        ...expected,
        issued_run_id: before.work!.execution.run_id!,
        source_work_digest: input.expectedWork.digest,
      };
      requireState(
        before.workVersion?.revision === input.expectedWork.revision + 1 &&
          canonicalJsonDigest(before.ledgerVersion) === canonicalJsonDigest(input.expectedLedger) &&
          canonicalJsonDigest(migration.rebind_receipt) === canonicalJsonDigest(receipt),
        'migration rebind replay binding invalid',
      );
      return before;
    }
    matchesExpected(before.workVersion, input.expectedWork);
    matchesExpected(before.ledgerVersion, input.expectedLedger);
    requireState(migration.rebind_status === 'pending', 'migration rebind state invalid');
    const authorized = snapshot(await this.#verifyMigrationRebind(input, before));
    requireState(
      canonicalJsonDigest(authorized) === canonicalJsonDigest(expected),
      'migration rebind authorization differs from transition',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      const current = this.#read(input.identity);
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      matchesExpected(current.workVersion, input.expectedWork);
      matchesExpected(current.ledgerVersion, input.expectedLedger);
      requireState(
        current.work?.migration?.rebind_status === 'pending' &&
          canonicalJsonDigest(current.work.migration) === canonicalJsonDigest(migration),
        'migration rebind changed during authorization',
      );
      const revision = current.work!.revision + 1;
      const issuedRunId = randomUUID();
      const receipt: MigrationRebindReceipt = {
        ...expected,
        issued_run_id: issuedRunId,
        source_work_digest: current.workVersion!.digest,
      };
      const work = this.#checkedWork({
        ...current.work!,
        revision,
        execution: { ...current.work!.execution, run_id: issuedRunId },
        migration: {
          ...migration,
          continuation_run_id: issuedRunId,
          rebind_status: 'accepted',
          rebind_receipt: receipt,
        },
        lifecycle: { ...current.work!.lifecycle, revision },
      });
      validateLifecycleProgress(current.work!, work);
      const result = this.#database
        .query(
          'UPDATE agent_host_state SET revision=?, payload=?, digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
        )
        .run(
          revision,
          canonicalJson(work),
          canonicalJsonDigest(work),
          this.#workspaceId,
          'work',
          identityKey(input.identity),
          current.workVersion!.revision,
          current.workVersion!.digest,
        );
      requireState(result.changes === 1, 'migration rebind compare-and-swap conflict');
      this.#onReconciledWorkWrite(input.identity, current.workVersion, version(work)!);
      return this.#read(input.identity);
    }).immediate();
  }
  /** One forward-bound current-v1 runtime-code rebind; ordinary work CAS remains immutable. */
  async rebindRuntimeCode(request: RuntimeCodeRebindRequest): Promise<HostStateSnapshot> {
    requireState(this.#verifyRuntimeCodeRebind, 'trusted runtime-code rebind verifier required');
    const input = snapshot(request);
    requireState(
      Object.keys(input).length === (input.expectedMaintenanceGeneration === undefined ? 14 : 15) &&
        Number.isSafeInteger(input.attempt) &&
        input.attempt > 0 &&
        hashPattern.test(input.oldRuntimeCodeDigest) &&
        hashPattern.test(input.newRuntimeCodeDigest) &&
        input.oldRuntimeCodeDigest !== input.newRuntimeCodeDigest &&
        hashPattern.test(input.parentManifestDigest) &&
        hashPattern.test(input.successorManifestDigest) &&
        [input.actionId, input.issueId, input.nativeSessionHandle, input.forwardOperationId].every(
          (value) =>
            typeof value === 'string' &&
            value.length > 0 &&
            value.length <= 2048 &&
            value.trim() === value &&
            !/\p{Cc}/u.test(value),
        ) &&
        (input.focusedFailureCorrection
          ? Object.keys(input.focusedFailureCorrection).length === 1 &&
            typeof input.focusedFailureCorrection.ownerCorrectionPointer === 'string' &&
            input.focusedFailureCorrection.ownerCorrectionPointer.trim().length > 0 &&
            input.focusedFailureCorrection.ownerCorrectionPointer.length <= 2048 &&
            input.synthesisCorrection === undefined &&
            input.ownerNoCallPointer === undefined
          : input.synthesisCorrection === undefined
            ? typeof input.ownerNoCallPointer === 'string' &&
              input.ownerNoCallPointer.length > 0 &&
              input.ownerNoCallPointer.length <= 2048 &&
              input.ownerNoCallPointer.trim() === input.ownerNoCallPointer &&
              !/\p{Cc}/u.test(input.ownerNoCallPointer)
            : input.ownerNoCallPointer === undefined &&
              Object.keys(input.synthesisCorrection).length === 3 &&
              hashPattern.test(input.synthesisCorrection.correctionDigest) &&
              [input.synthesisCorrection.correctionId, input.synthesisCorrection.ownerCorrectionPointer].every(
                (value) =>
                  typeof value === 'string' &&
                  value.length > 0 &&
                  value.length <= 2048 &&
                  value.trim() === value &&
                  !/\p{Cc}/u.test(value),
              )),
      'runtime-code rebind request invalid',
    );
    const before = this.readHostStateSnapshot(input.identity);
    const focused = Boolean(input.focusedFailureCorrection);
    const { loadRuntimeConfig } = await import('./config/runtime-config.js');
    const focusedConfig = focused && this.#repositoryRoot ? loadRuntimeConfig(this.#repositoryRoot) : null;
    this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
    matchesExpected(before.workVersion, input.expectedWork);
    matchesExpected(before.ledgerVersion, input.expectedLedger);
    requireState(
      before.work?.binding.runtime_code_digest === input.oldRuntimeCodeDigest &&
        (focused
          ? before.work.lifecycle.phase === 'VERIFY' && focusedConfig !== null
          : before.work.lifecycle.phase === 'INTAKE' &&
            before.work.lifecycle.seal === null &&
            before.work.lifecycle.assurance.review_generation === 0 &&
            before.work.lifecycle.assurance.delivery_cycle_id === null) &&
        before.work.execution.status === 'active' &&
        before.work.lease?.thread_id === input.nativeSessionHandle &&
        !before.work.execution.assignment_attempts.some(
          (attempt) => attempt.status === 'started' || attempt.status === 'uncertain',
        ),
      'runtime-code rebind owner or assurance state changed',
    );
    const expectedAuthorization: RuntimeCodeRebindAuthorization = {
      schema: 'VidaRuntimeCodeRebindAuthorization/v1',
      request_digest: canonicalJsonDigest(input),
      principal: this.runtimeCodeRebindPrincipal!,
      forward_operation_id: input.forwardOperationId,
      parent_manifest_digest: input.parentManifestDigest,
      successor_manifest_digest: input.successorManifestDigest,
      ...(input.focusedFailureCorrection
        ? { owner_correction_pointer: input.focusedFailureCorrection.ownerCorrectionPointer }
        : input.synthesisCorrection
          ? {
              owner_correction_pointer: input.synthesisCorrection.ownerCorrectionPointer,
              synthesis_correction_digest: input.synthesisCorrection.correctionDigest,
            }
          : { owner_no_call_pointer: input.ownerNoCallPointer! }),
    };
    const authorization = snapshot(await this.#verifyRuntimeCodeRebind(input, before));
    requireState(
      canonicalJsonDigest(authorization) === canonicalJsonDigest(expectedAuthorization),
      'runtime-code rebind authorization differs from transition',
    );
    requireState(!this.#database.inTransaction, 'nested runtime-code rebind transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      const current = this.#read(input.identity);
      matchesExpected(current.workVersion, input.expectedWork);
      matchesExpected(current.ledgerVersion, input.expectedLedger);
      const work = current.work;
      const lease = work?.lease;
      const ticket = current.ledger?.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
      const claim = current.ledger?.claims.find(
        (entry) =>
          entry.ticket_id === lease?.ticket_id &&
          entry.status === 'active' &&
          entry.work_id === input.identity.work_id &&
          entry.thread_id === input.nativeSessionHandle,
      );
      requireState(
        work &&
          lease &&
          ticket &&
          claim &&
          work.binding.runtime_code_digest === input.oldRuntimeCodeDigest &&
          work.execution.status === 'active' &&
          lease.thread_id === input.nativeSessionHandle &&
          ticket.status === 'active' &&
          ticket.expires_at &&
          Date.parse(ticket.expires_at) > Date.now() &&
          Date.parse(claim.lease_expires_at) > Date.now(),
        'runtime-code rebind lease or owner changed',
      );
      const journalRow = this.#database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null;
      requireState(
        journalRow?.revision === input.expectedJournal.revision &&
          journalRow.digest === input.expectedJournal.digest &&
          canonicalJsonDigest(JSON.parse(journalRow.payload)) === journalRow.digest,
        'runtime-code rebind journal CAS changed',
      );
      const journal = JSON.parse(journalRow!.payload) as MastraSessionLedgerState & {
        run_id: string;
        items: readonly {
          request: { action_id: string; config_digest: string; scope_digest: string };
          issue_id: string | null;
          observation: unknown;
          research_activation?: unknown;
          research_normalization?: unknown;
          host_reservation?: unknown;
        }[];
      };
      const item = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)].find(
        (entry) => entry.request.action_id === input.actionId,
      );
      if (focused) {
        requireState(
          focusedConfig &&
            work.lifecycle.phase === 'VERIFY' &&
            work.execution.assignment_attempts.every((attempt) => ['completed', 'no_effect'].includes(attempt.status)),
          'VERIFY rebind has unresolved Host effects',
        );
        requireState(
          work.lifecycle.references.some(
            (reference) =>
              reference.kind === 'execution_approval' &&
              reference.disposition === 'current' &&
              reference.decision === 'approved' &&
              reference.generation === null &&
              reference.implementation_fingerprint === null,
          ),
          'VERIFY rebind requires current scope-level execution approval',
        );
        const findings = selectCorrectiveEvidence(journal, focusedConfig.workflows[work.binding.workflow_id]!);
        requireState(
          findings.failed.some(
            (entry) => entry.request.action_id === input.actionId && entry.issue_id === input.issueId,
          ),
          'VERIFY rebind requires exact accepted negative report',
        );
        validateWorkSessionBinding(work, journal, this.#repositoryRoot);
      }
      const dispatch =
        focused || input.synthesisCorrection
          ? null
          : (this.#database
              .query(
                'SELECT payload,digest FROM agent_host_readonly_dispatch_activation WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=?',
              )
              .get(this.#workspaceId, input.identity.work_id, input.attempt, input.actionId) as {
              payload: string;
              digest: string;
            } | null);
      const dispatchValue = dispatch && (JSON.parse(dispatch.payload) as { issue_id: string });
      const correctionRow =
        input.synthesisCorrection &&
        (this.#database
          .query(
            'SELECT payload,digest FROM agent_host_synthesis_observation_correction WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
          )
          .get(this.#workspaceId, input.identity.work_id, input.attempt, input.actionId) as {
          payload: string;
          digest: string;
        } | null);
      const correction =
        correctionRow && (JSON.parse(correctionRow.payload) as SynthesisObservationCorrectionPlan | null);
      const correctionValid =
        input.synthesisCorrection &&
        correction &&
        correctionRow &&
        correction.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
        correction.digest === correctionRow.digest &&
        canonicalJsonDigest((({ digest: _digest, ...body }) => body)(correction)) === correction.digest &&
        correction.correction_id === input.synthesisCorrection.correctionId &&
        correction.digest === input.synthesisCorrection.correctionDigest &&
        correction.owner_correction_pointer === input.synthesisCorrection.ownerCorrectionPointer &&
        correction.workspace_id === this.#workspaceId &&
        correction.repository_id === input.identity.repository_id &&
        canonicalJsonDigest(correction.project_ids) === canonicalJsonDigest(input.identity.project_ids) &&
        correction.integrations_digest === input.identity.integrations_digest &&
        correction.work_id === input.identity.work_id &&
        correction.attempt === input.attempt &&
        correction.action_id === input.actionId &&
        correction.prior_issue_id === input.issueId &&
        correction.original_item.issue_id === input.issueId &&
        correction.original_item.observation?.status === 'reported_complete' &&
        !correction.original_item.research_normalization &&
        canonicalJsonDigest(correction.original_item.request) === canonicalJsonDigest(item?.request);
      requireState(
        journal.run_id === work.execution.run_id &&
          item !== undefined &&
          (focused
            ? item?.issue_id === input.issueId && item.observation?.status === 'reported_failed'
            : input.synthesisCorrection
              ? item?.issue_id === null && correctionValid
              : item?.issue_id === input.issueId) &&
          (focused ||
            (item.observation === null &&
              !item.research_activation &&
              !item.research_normalization &&
              !item.host_reservation)) &&
          item.request.config_digest === work.binding.config_digest &&
          item.request.scope_digest === work.binding.work_source_revision &&
          (focused ||
            input.synthesisCorrection ||
            (dispatch &&
              canonicalJsonDigest(dispatchValue) === dispatch.digest &&
              dispatchValue &&
              dispatchValue.issue_id === input.issueId)),
        'runtime-code rebind issued read-only action changed',
      );
      const nextBinding = {
        ...work.binding,
        runtime_code_digest: input.newRuntimeCodeDigest,
        runtime_source_revision: input.newRuntimeCodeDigest,
      };
      const pendingReceipt: RuntimeCodeRebindReceipt = {
        ...expectedAuthorization,
        identity: input.identity,
        attempt: input.attempt,
        action_id: input.actionId,
        issue_id: input.issueId,
        old_runtime_code_digest: input.oldRuntimeCodeDigest,
        new_runtime_code_digest: input.newRuntimeCodeDigest,
        prior_work_version: input.expectedWork,
        journal_version: input.expectedJournal,
        request: input,
        binding_history: {
          schema: 'RuntimeCodeRebindHistory/v1',
          original_work: work,
          successor_binding: nextBinding,
          terminal_attempt_ids: work.execution.assignment_attempts.map((attempt) => attempt.attempt_id),
          original_journal: journal,
        },
      };
      const next = this.#checkedWork(
        {
          ...work,
          revision: work.revision + 1,
          binding: {
            ...work.binding,
            runtime_code_digest: input.newRuntimeCodeDigest,
            runtime_source_revision: input.newRuntimeCodeDigest,
          },
          lifecycle: {
            ...work.lifecycle,
            revision: work.revision + 1,
            ...(focused
              ? {
                  phase: 'EXECUTE' as const,
                  next_action:
                    'Authorize one corrective generation against the rebound runtime; prior implementation evidence and verification are retired.',
                  seal: null,
                  assurance: {
                    ...work.lifecycle.assurance,
                    correction_count: work.lifecycle.assurance.correction_count + 1,
                    review_generation: work.lifecycle.assurance.review_generation + 1,
                    delivery_cycle_id: null,
                  },
                }
              : {}),
            config_binding: { ...work.lifecycle.config_binding, runtime_code_digest: input.newRuntimeCodeDigest },
            references: work.lifecycle.references.map((reference) =>
              reference.disposition === 'current' &&
              ((!focused && reference.kind === 'execution_approval') ||
                (focused &&
                  reference.kind !== 'execution_approval' &&
                  (reference.generation !== null || reference.implementation_fingerprint !== null)))
                ? { ...reference, disposition: 'retired' as const }
                : reference,
            ),
          },
        },
        pendingReceipt,
      );
      const updated = this.#database
        .query(
          'UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
        )
        .run(
          next.revision,
          canonicalJson(next),
          canonicalJsonDigest(next),
          this.#workspaceId,
          'work',
          identityKey(input.identity),
          input.expectedWork.revision,
          input.expectedWork.digest,
        );
      requireState(updated.changes === 1, 'runtime-code rebind work CAS conflict');
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_runtime_code_rebind (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
      );
      const receipt = {
        ...pendingReceipt,
        identity: input.identity,
        attempt: input.attempt,
        action_id: input.actionId,
        issue_id: input.issueId,
        old_runtime_code_digest: input.oldRuntimeCodeDigest,
        new_runtime_code_digest: input.newRuntimeCodeDigest,
        prior_work_version: input.expectedWork,
        journal_version: input.expectedJournal,
        retired_execution_approval_ids: work.lifecycle.references
          .filter((reference) => reference.kind === 'execution_approval' && reference.disposition === 'current')
          .map((reference) => reference.record_id),
      };
      this.#database
        .query('INSERT INTO agent_host_runtime_code_rebind VALUES(?,?,?,?,?,?)')
        .run(
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          input.actionId,
          canonicalJson(receipt),
          canonicalJsonDigest(receipt),
        );
      this.#onReconciledWorkWrite(input.identity, current.workVersion, version(next)!);
      return this.#read(input.identity);
    }).immediate();
  }
  claimWorkflowAttempt(request: WorkflowAttemptRequest): WorkflowAttemptReceipt {
    const input = snapshot(request);
    requireState(
      Object.keys(input).length === (input.expectedMaintenanceGeneration === undefined ? 7 : 8) &&
        typeof input.stageId === 'string' &&
        input.stageId.length > 0 &&
        input.stageId.length <= 2048 &&
        Number.isSafeInteger(input.assignmentIndex) &&
        input.assignmentIndex >= 0 &&
        hashPattern.test(input.requestDigest),
      'attempt request invalid',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => this.#claimWorkflowAttemptInTransaction(input).receipt).immediate();
  }
  findArchivedReportedObservation(
    workId: string,
    attempt: number,
    observation: { action_id: string; issue_id: string },
  ): MastraSessionLedgerState['items'][number] | null {
    if (
      !this.#database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_corrective_recovery'")
        .get()
    )
      return null;
    const rows = this.#database
      .query(
        'SELECT generation,payload,digest FROM agent_host_corrective_recovery WHERE workspace_id=? AND work_id=? AND attempt=? ORDER BY generation',
      )
      .all(this.#workspaceId, workId, attempt) as { generation: number; payload: string; digest: string }[];
    for (const row of rows) {
      const recovery = JSON.parse(row.payload) as {
        schema: string;
        work_id: string;
        attempt: number;
        generation: number;
        original_journal: { state: MastraSessionLedgerState };
      };
      requireState(
        recovery.schema === 'CorrectiveExecutionRecovery/v1' &&
          recovery.work_id === workId &&
          recovery.attempt === attempt &&
          recovery.generation === row.generation &&
          canonicalJsonDigest(recovery) === row.digest,
        'corrective recovery integrity differs',
      );
      const state = recovery.original_journal.state,
        item = [...state.items, ...state.completed.flatMap((wave) => wave.items)].find(
          (item) => item.request.action_id === observation.action_id,
        );
      if (!item) continue;
      requireState(
        item.issue_id === observation.issue_id &&
          item.observation &&
          canonicalJson(item.observation) === canonicalJson(observation),
        'archived terminal report retry differs',
      );
      return snapshot(item);
    }
    return null;
  }

  retrieveCorrectiveAuthorization(input: {
    identity: WorkIdentity;
    attempt: number;
    journal: StateVersion;
    stageIds: readonly string[];
    userInstructionRef: string;
  }): CorrectiveExecution | null {
    const host = this.#read(input.identity),
      work = host.work;
    if (!work || work.lifecycle.assurance.correction_count === 0) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, input.identity.work_id, input.attempt) as { payload: string; digest: string } | null;
    if (!row) return null;
    const journal = JSON.parse(row.payload) as MastraSessionLedgerState,
      execution = journal.corrective_execution;
    if (!execution) return null;
    this.assertCorrectiveExecution(input.identity, input.attempt, execution);
    requireState(
      canonicalJsonDigest(journal) === row.digest && this.#repositoryRoot,
      'current corrective journal integrity differs',
    );
    const authority = correctiveAssignmentAuthorizationSchema.parse(
      JSON.parse(
        requireSafeRepositoryAccess(this.#repositoryRoot).readText(
          execution.authorization.path,
          'corrective authorization delivery retry',
        ),
      ),
    );
    if (!sameJson(authority.journal_version, input.journal)) return null;
    requireState(
      sameJson(authority.stage_ids, input.stageIds) && authority.user_instruction_ref === input.userInstructionRef,
      'corrective authorization retry differs',
    );
    return snapshot(execution);
  }

  authorizeCorrectiveExecution(input: {
    identity: WorkIdentity;
    attempt: number;
    expectedWork: StateVersion;
    expectedLedger: StateVersion;
    expectedJournal: StateVersion;
    stageIds: readonly string[];
    userInstructionRef: string;
    config: import('./config/runtime-config.js').AgentRuntimeConfig;
  }): CorrectiveExecution {
    requireState(
      this.#repositoryRoot && input.userInstructionRef.trim() && input.userInstructionRef.length <= 512,
      'attributable corrective authorization missing',
    );
    requireState(!this.#database.inTransaction, 'nested corrective authorization forbidden');
    return this.#transactionWithProducerFence(() => {
      this.assertSessionProducerWriteAllowed();
      const host = this.#read(input.identity),
        work = host.work;
      matchesExpected(host.workVersion, input.expectedWork);
      matchesExpected(host.ledgerVersion, input.expectedLedger);
      requireState(
        work && host.ledger && work.lease && work.execution.status === 'active' && work.lifecycle.phase === 'VERIFY',
        'corrective authorization requires truthfully prepared verification',
      );
      const ticket = host.ledger.tickets.find((ticket) => ticket.ticket_id === work.lease!.ticket_id);
      requireState(
        ticket?.status === 'active' && ticket.expires_at && timestamp(ticket.expires_at) > Date.now(),
        'corrective lease is not live',
      );
      requireState(
        work.execution.assignment_attempts.every(
          (attempt) => attempt.status === 'completed' || attempt.status === 'no_effect',
        ),
        'corrective authorization has unknown Host effects',
      );
      const row = this.#database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null;
      requireState(
        row && row.revision === input.expectedJournal.revision && row.digest === input.expectedJournal.digest,
        'corrective journal CAS conflict',
      );
      const original = JSON.parse(row.payload) as MastraSessionLedgerState;
      requireState(
        canonicalJsonDigest(original) === row.digest &&
          original.work_id === input.identity.work_id &&
          original.attempt === input.attempt &&
          original.workspace_id === this.#workspaceId &&
          original.run_id === (original.corrective_execution?.engine_run_id ?? work.execution.run_id),
        'corrective journal has unfinished issued effects',
      );
      const workflow = input.config.workflows[work.binding.workflow_id];
      requireState(
        workflow && work.binding.config_digest === canonicalJsonDigest(input.config),
        'corrective workflow configuration differs',
      );
      const { failed } = selectCorrectiveEvidence(original, workflow);
      requireState(
        failed.length > 0 &&
          failed.every((item) =>
            ['validate', 'test'].includes(
              workflow.stages.find((stage) => stage.id === item.request.stage_id)?.kind ?? '',
            ),
          ),
        'corrective operation requires accepted focused negative findings',
      );
      const ancestors = new Set<string>(),
        pending = failed.map((item) => item.request.stage_id);
      while (pending.length) {
        const id = pending.pop()!;
        if (ancestors.has(id)) continue;
        ancestors.add(id);
        pending.push(...(workflow.stages.find((stage) => stage.id === id)?.required_after ?? []));
      }
      const writers = workflow.stages.filter((stage) => stage.kind === 'develop' && ancestors.has(stage.id));
      requireState(
        writers.length > 0 &&
          writers.every((stage) =>
            work.execution.assignment_attempts.some(
              (attempt) => attempt.stage_id === stage.id && attempt.status === 'completed',
            ),
          ),
        'corrective operation requires completed original writer',
      );
      const invalidated = new Set(writers.map((stage) => stage.id));
      for (let iteration = 0; iteration < workflow.stages.length; iteration++)
        for (const stage of workflow.stages)
          if (['validate', 'test'].includes(stage.kind) && stage.required_after.some((id) => invalidated.has(id)))
            invalidated.add(stage.id);
      requireState(
        input.stageIds.length === invalidated.size &&
          new Set(input.stageIds).size === input.stageIds.length &&
          input.stageIds.every((id) => invalidated.has(id)),
        'corrective stage selection differs from invalidated configured closure',
      );
      const access = requireSafeRepositoryAccess(this.#repositoryRoot!),
        source = snapshotDeclaredSources(access, work.lifecycle.scope.allowed_paths);
      requireState(
        source.digest === original.source_scope?.digest &&
          source.digest === work.lifecycle.seal?.implementation_fingerprint,
        'corrective source/seal changed',
      );
      const generation = work.lifecycle.assurance.correction_count + 1;
      const base = `.agent/work/${input.identity.work_id}/correction-${generation}`;
      const proposed = access.fileExists(base + '-authorization.json', 'uncommitted correction proposal')
        ? correctiveAssignmentAuthorizationSchema.parse(
            JSON.parse(access.readText(base + '-authorization.json', 'uncommitted correction proposal')),
          )
        : null;
      const engineRunId = proposed?.engine_run_id ?? randomUUID();
      const authorization = correctiveAssignmentAuthorizationSchema.parse({
        schema: 'CorrectiveAssignmentAuthorization/v1',
        work_id: input.identity.work_id,
        attempt: input.attempt,
        run_id: work.execution.run_id,
        base_run_id: work.execution.run_id,
        engine_run_id: engineRunId,
        correction_generation: generation,
        source_revision: work.binding.work_source_revision,
        scope_id: work.binding.scope_id,
        config_digest: work.binding.config_digest,
        implementation_fingerprint: source.digest,
        ac_ids: work.binding.ac_ids,
        allowed_paths: work.lifecycle.scope.allowed_paths,
        stage_ids: input.stageIds,
        predecessor_attempt_ids: work.execution.assignment_attempts
          .filter((attempt) => attempt.status === 'completed')
          .map((attempt) => attempt.attempt_id),
        failed_action_ids: failed.map((item) => item.request.action_id),
        user_instruction_ref: input.userInstructionRef,
        issued_at: proposed?.issued_at ?? new Date().toISOString(),
        work_version: host.workVersion,
        ledger_version: host.ledgerVersion,
        journal_version: input.expectedJournal,
      });
      const write = (file: string, value: unknown) => {
        const bytes = Buffer.from(canonicalJson(value) + '\n');
        if (access.fileExists(file, 'corrective artifact'))
          requireState(
            access.readBytes(file, 'corrective artifact').equals(bytes),
            'corrective artifact retry differs',
          );
        else access.writeExclusive(file, bytes.toString('utf8'), 'corrective artifact');
        return { file, bytes };
      };
      const authorityFile = write(base + '-authorization.json', authorization),
        recovery = {
          schema: 'CorrectiveExecutionRecovery/v1',
          work_id: input.identity.work_id,
          attempt: input.attempt,
          generation,
          original_work: work,
          original_journal: { version: input.expectedJournal, state: original },
        },
        recoveryFile = write(base + '-recovery.json', recovery),
        feedbackFile = write(base + '-feedback.json', {
          schema: 'CorrectiveFeedbackConsumption/v1',
          work_id: input.identity.work_id,
          attempt: input.attempt,
          generation,
          failed_observations: failed.map((item) => item.observation),
        });
      const ref = (
        kind: LifecycleArtifactReference['kind'],
        artifact: typeof authorityFile,
        schema: string,
        decision: LifecycleArtifactReference['decision'],
      ): LifecycleArtifactReference => ({
        schema: 'LifecycleArtifactReference/v1',
        kind,
        artifact_schema: schema,
        record_id: kind + '-' + generation,
        path: artifact.file,
        sha256: createHash('sha256').update(artifact.bytes).digest('hex'),
        source_revision: work.binding.work_source_revision,
        scope_id: work.binding.scope_id,
        ac_ids: [...work.binding.ac_ids],
        generation: null,
        implementation_fingerprint: null,
        delivery_cycle_id: null,
        principal: null,
        decision,
        disposition: 'current',
      });
      const authorityRef = ref('correction_authorization', authorityFile, authorization.schema, 'approved');
      const execution = correctiveExecutionSchema.parse({
        schema: 'CorrectiveExecution/v1',
        base_run_id: work.execution.run_id,
        engine_run_id: engineRunId,
        correction_generation: generation,
        stage_ids: input.stageIds,
        authorization: { schema: authorization.schema, path: authorityRef.path, sha256: authorityRef.sha256 },
      });
      const middle = {
        ...work,
        revision: work.revision + 1,
        lifecycle: {
          ...work.lifecycle,
          revision: work.revision + 1,
          references: [
            ...work.lifecycle.references,
            authorityRef,
            ref('recovery', recoveryFile, recovery.schema, 'fail'),
            ref('feedback_consumption', feedbackFile, 'CorrectiveFeedbackConsumption/v1', 'accepted'),
          ],
        },
      };
      const middleLedger = { ...host.ledger, revision: host.ledger.revision + 1 };
      validateProgress(host, middle, middleLedger);
      const next = transitionLifecycleState(
          middle,
          'EXECUTE',
          'Issue only the Host-authorized corrective configured stages; preserve original terminal evidence.',
        ),
        nextLedger = { ...middleLedger, revision: middleLedger.revision + 1 };
      validateProgress(
        {
          ...host,
          work: middle,
          ledger: middleLedger,
          workVersion: version(middle),
          ledgerVersion: version(middleLedger),
        },
        next,
        nextLedger,
      );
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_corrective_recovery (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,generation INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,generation))',
      );
      this.#database
        .query('INSERT INTO agent_host_corrective_recovery VALUES(?,?,?,?,?,?)')
        .run(
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          generation,
          canonicalJson(recovery),
          canonicalJsonDigest(recovery),
        );
      const journal: MastraSessionLedgerState = {
        schema: 'MastraSessionLedger/v1',
        workspace_id: this.#workspaceId,
        work_id: input.identity.work_id,
        attempt: input.attempt,
        run_id: engineRunId,
        corrective_execution: execution,
        source_scope: source,
        step_id: null,
        items: [],
        completed: [],
      };
      const changed = this.#database
        .query(
          'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
        )
        .run(
          row.revision + 1,
          canonicalJson(journal),
          canonicalJsonDigest(journal),
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          row.revision,
          row.digest,
        );
      requireState(changed.changes === 1, 'corrective journal CAS conflict');
      for (const [kind, id, target, expected] of [
        ['work', identityKey(input.identity), next, host.workVersion],
        ['ledger', 'shared', nextLedger, host.ledgerVersion],
      ] as const) {
        const changed = this.#database
          .query(
            'UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
          )
          .run(
            target.revision,
            canonicalJson(target),
            canonicalJsonDigest(target),
            this.#workspaceId,
            kind,
            id,
            expected!.revision,
            expected!.digest,
          );
        requireState(changed.changes === 1, 'corrective Host CAS conflict');
      }
      return snapshot(execution);
    }).immediate();
  }

  assertCorrectiveExecution(identity: WorkIdentity, attempt: number, value: CorrectiveExecution): void {
    const execution = correctiveExecutionSchema.parse(value),
      host = this.#read(identity),
      work = host.work;
    requireState(work, 'corrective execution work unavailable');
    validateWorkSessionBinding(
      work,
      { attempt, run_id: execution.engine_run_id, corrective_execution: execution },
      this.#repositoryRoot,
    );
    const authority = this.#correctiveAuthority(work, execution.stage_ids[0]!);
    requireState(
      sameJson(authority.reference, execution.authorization) && this.#repositoryRoot,
      'corrective execution authority differs',
    );
    const payload = correctiveAssignmentAuthorizationSchema.parse(
      JSON.parse(
        requireSafeRepositoryAccess(this.#repositoryRoot).readText(
          execution.authorization.path,
          'corrective engine selection',
        ),
      ),
    );
    requireState(
      payload.engine_run_id === execution.engine_run_id &&
        payload.base_run_id === execution.base_run_id &&
        sameJson(payload.stage_ids, execution.stage_ids),
      'corrective execution engine/stages differ',
    );
  }
  /** Resolve the sole authoritative work without opening a nested projection transaction. */
  assertCorrectiveExecutionForWork(workId: string, attempt: number, value: CorrectiveExecution): void {
    const rows = this.#database
      .query(
        "SELECT payload FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
      )
      .all(this.#workspaceId, workId) as { payload: string }[];
    requireState(rows.length === 1, 'corrective journal Host owner missing');
    this.assertCorrectiveExecution(workIdentity(this.#checkedWork(JSON.parse(rows[0]!.payload))), attempt, value);
  }

  #correctiveAuthority(work: WorkState, stageId: string): { generation: number; reference: ContractReference | null } {
    const generation = work.lifecycle.assurance.correction_count;
    if (generation === 0) return { generation, reference: null };
    requireState(this.#repositoryRoot, 'corrective assignment requires bound repository');
    const access = requireSafeRepositoryAccess(this.#repositoryRoot);
    const candidates = work.lifecycle.references.filter(
      (ref) =>
        ref.kind === 'correction_authorization' &&
        ref.decision === 'approved' &&
        ref.artifact_schema === 'CorrectiveAssignmentAuthorization/v1',
    );
    for (const ref of [...candidates].reverse()) {
      const bytes = access.readBytes(ref.path, 'Host corrective authority');
      requireState(
        bytes.length <= 64 * 1024 && createHash('sha256').update(bytes).digest('hex') === ref.sha256,
        'corrective authority bytes differ',
      );
      const authority = correctiveAssignmentAuthorizationSchema.parse(JSON.parse(bytes.toString('utf8')));
      if (authority.correction_generation !== generation) continue;
      requireState(
        authority.work_id === work.binding.lifecycle_work_id &&
          authority.run_id === work.execution.run_id &&
          authority.source_revision === work.binding.work_source_revision &&
          authority.scope_id === work.binding.scope_id &&
          authority.config_digest === work.binding.config_digest &&
          sameJson(authority.ac_ids, work.binding.ac_ids) &&
          sameJson(authority.allowed_paths, work.lifecycle.scope.allowed_paths) &&
          authority.stage_ids.includes(stageId) &&
          authority.predecessor_attempt_ids.every((id) =>
            work.execution.assignment_attempts.some(
              (attempt) => attempt.attempt_id === id && attempt.status === 'completed',
            ),
          ),
        'corrective assignment authority binding differs',
      );
      return { generation, reference: { schema: ref.artifact_schema, path: ref.path, sha256: ref.sha256 } };
    }
    throw new HostStateError('current corrective assignment authority unavailable');
  }

  #claimWorkflowAttemptInTransaction(
    input: WorkflowAttemptRequest,
    reserve?: (before: HostStateSnapshot, attempt: AssignmentAttempt) => WorkflowApprovalConsumptionRecord,
  ): WorkflowAttemptApprovalAuthorization {
    const before = this.#read(input.identity);
    this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
    matchesExpected(before.workVersion, input.expectedWork);
    matchesExpected(before.ledgerVersion, input.expectedLedger);
    requireState(before.work, 'active leased work required');
    const work = before.work!;
    requireState(!work.migration || work.migration.rebind_status === 'accepted', 'migration rebind required');
    const authority = this.#correctiveAuthority(work, input.stageId);
    const assignmentId = assignmentIdentity(
      work,
      input.stageId,
      input.assignmentIndex,
      authority.generation,
      authority.reference,
    );
    const existing = work.execution.assignment_attempts.findLast(
      (entry) => entry.stage_id === input.stageId && entry.assignment_index === input.assignmentIndex,
    );
    const sameGeneration = existing?.correction_generation === authority.generation;
    if (existing && sameGeneration) {
      requireState(existing.request_digest === input.requestDigest, 'attempt request changed');
      if (existing.status === 'completed') {
        requireState(
          canonicalJsonDigest(existing.lease) === canonicalJsonDigest(input.lease),
          'completed replay lease binding invalid',
        );
        return {
          receipt: snapshot({
            identity: input.identity,
            workVersion: before.workVersion!,
            attempt: existing,
            maintenanceGeneration: before.maintenanceGeneration,
          }),
          approval: null,
        };
      }
    }
    requireState(before.ledger && work.execution.status === 'active' && work.lease, 'active leased work required');
    requireState(canonicalJsonDigest(work.lease) === canonicalJsonDigest(input.lease), 'attempt lease binding invalid');
    const ticket = before.ledger!.tickets.find((entry) => entry.ticket_id === work.lease!.ticket_id)!;
    requireState(
      ticket.expires_at !== null && timestamp(ticket.expires_at) > Date.now(),
      'attempt lease expired before start',
    );
    if (existing && sameGeneration) {
      requireState(existing.status === 'no_effect', 'attempt outcome requires reconciliation before replay');
      requireState(
        canonicalJsonDigest(existing.reconciliation!.retry_lease) === canonicalJsonDigest(input.lease),
        'retry fence differs from authorization',
      );
    }
    if (existing && !sameGeneration)
      requireState(
        existing.status === 'completed' &&
          existing.correction_generation < authority.generation &&
          authority.reference !== null,
        'corrective predecessor is not terminal',
      );
    const attempt: AssignmentAttempt = {
      assignment_id: assignmentId,
      attempt_id: canonicalJsonDigest({
        assignment_id: assignmentId,
        request_digest: input.requestDigest,
        lease: input.lease,
        previous_attempt_id: existing?.attempt_id ?? null,
      }),
      previous_attempt_id: existing?.attempt_id ?? null,
      request_digest: input.requestDigest,
      stage_id: input.stageId,
      assignment_index: input.assignmentIndex,
      correction_generation: authority.generation,
      correction_authorization: authority.reference,
      lease: input.lease,
      status: 'started',
      result: null,
      result_digest: null,
      reconciliation: null,
    };
    const approval = reserve?.(before, attempt) ?? null;
    const saved = this.#writeAttempts(before, [...work.execution.assignment_attempts, attempt]);
    return {
      receipt: snapshot({
        identity: input.identity,
        workVersion: saved.workVersion!,
        attempt,
        maintenanceGeneration: saved.maintenanceGeneration,
      }),
      approval,
    };
  }
  #workflowAttemptRequest(invocation: TrustedWorkflowAssignment, requestDigest: string): WorkflowAttemptRequest {
    const context = invocation.workContext;
    const identity: WorkIdentity = {
      repository_id: context.binding.repository_id,
      project_ids: [...context.binding.project_ids],
      integrations_digest: context.binding.integrations_digest,
      work_id: context.binding.lifecycle_work_id,
    };
    const before = this.readHostStateSnapshot(identity);
    requireState(
      before.work &&
        before.ledgerVersion &&
        canonicalJsonDigest(before.work.binding) === canonicalJsonDigest(context.binding),
      'assignment work binding differs from persisted state',
    );
    requireState(
      context.permit.dispatch_authorized &&
        context.permit.stage_id === invocation.stage.id &&
        context.permit.assignment_index === invocation.assignmentIndex,
      'assignment permit binding invalid',
    );
    const { ticket_id, thread_id, generation } = context.permit.lease;
    const lease = { ticket_id, thread_id, generation };
    const authority = this.#correctiveAuthority(before.work!, invocation.stage.id);
    const assignmentId = assignmentIdentity(
      before.work!,
      invocation.stage.id,
      invocation.assignmentIndex,
      authority.generation,
      authority.reference,
    );
    const completed = before.work!.execution.assignment_attempts.findLast(
      (entry) => entry.assignment_id === assignmentId,
    );
    if (completed?.status === 'completed') {
      requireState(completed.request_digest === requestDigest, 'attempt request changed');
      requireState(
        canonicalJsonDigest(completed.lease) === canonicalJsonDigest(lease),
        'completed replay lease binding invalid',
      );
      return {
        identity,
        expectedWork: before.workVersion!,
        expectedLedger: before.ledgerVersion!,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        stageId: invocation.stage.id,
        assignmentIndex: invocation.assignmentIndex,
        requestDigest,
        lease,
      };
    }
    requireState(
      before.ledgerVersion!.revision === context.permit.lease.ledger_revision,
      'assignment ledger revision is stale',
    );
    return {
      identity,
      expectedWork: { revision: context.permit.checkpoint_revision, digest: context.permit.checkpoint_digest },
      expectedLedger: before.ledgerVersion!,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      stageId: invocation.stage.id,
      assignmentIndex: invocation.assignmentIndex,
      requestDigest,
      lease,
    };
  }
  claimWorkflowAssignment(invocation: TrustedWorkflowAssignment, requestDigest: string): WorkflowAttemptReceipt {
    return this.claimWorkflowAttempt(this.#workflowAttemptRequest(invocation, requestDigest));
  }
  async claimWorkflowAssignmentWithApproval(
    invocation: TrustedWorkflowAssignment,
    requestDigest: string,
    action: WorkflowApprovalAction,
    storeId: string,
  ): Promise<WorkflowAttemptApprovalAuthorization> {
    requireState(action === 'source.write' || action === 'delivery.execute', 'workflow approval action invalid');
    requireState(
      typeof storeId === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(storeId),
      'workflow approval store invalid',
    );
    const input = this.#workflowAttemptRequest(invocation, requestDigest);
    const before = this.readHostStateSnapshot(input.identity);
    requireState(before.work, 'active leased work required');
    matchesExpected(before.workVersion, input.expectedWork);
    matchesExpected(before.ledgerVersion, input.expectedLedger);
    const authority = this.#correctiveAuthority(before.work!, input.stageId);
    const assignmentId = assignmentIdentity(
      before.work!,
      input.stageId,
      input.assignmentIndex,
      authority.generation,
      authority.reference,
    );
    const previous = before.work!.execution.assignment_attempts.findLast(
      (entry) => entry.stage_id === input.stageId && entry.assignment_index === input.assignmentIndex,
    );
    if (previous?.status === 'completed' && previous.correction_generation === authority.generation)
      return { receipt: this.claimWorkflowAttempt(input), approval: null };
    if (previous && previous.correction_generation === authority.generation) {
      requireState(previous.request_digest === requestDigest, 'attempt request changed');
      requireState(previous.status === 'no_effect', 'attempt outcome requires reconciliation before replay');
      requireState(
        canonicalJsonDigest(previous.reconciliation!.retry_lease) === canonicalJsonDigest(input.lease),
        'retry fence differs from authorization',
      );
    }
    requireState(this.#verifyWorkflowApproval, 'trusted workflow approval verifier required');
    const attemptId = canonicalJsonDigest({
      assignment_id: assignmentId,
      request_digest: requestDigest,
      lease: input.lease,
      previous_attempt_id: previous?.attempt_id ?? null,
    });
    const fields = {
      store_id: storeId,
      action,
      identity: input.identity,
      config_digest: invocation.configDigest,
      workflow_id: invocation.workflowId,
      stage_id: input.stageId,
      assignment_id: assignmentId,
      assignment_index: input.assignmentIndex,
      request_digest: requestDigest,
      attempt_id: attemptId,
      lease: input.lease,
    };
    const approvalRequest: WorkflowAttemptApprovalRequest = snapshot({
      schema: 'WorkflowAttemptApprovalRequest/v1',
      ...fields,
      operation_hash: canonicalJsonDigest(fields),
    });
    const receipt = snapshot(await this.#verifyWorkflowApproval!(approvalRequest));
    requireState(receipt !== null, 'workflow approval denied');
    const { evidence_digest: _evidenceDigest, ...unsigned } = receipt!;
    requireState(
      receipt!.schema === 'EdictumWorkflowApproval/v1' &&
        receipt!.stage_id === input.stageId &&
        receipt!.approver === this.#workflowApprovalPrincipal &&
        receipt!.tenant === input.identity.repository_id &&
        input.identity.project_ids.includes(receipt!.project) &&
        receipt!.operation_hash === approvalRequest.operation_hash &&
        receipt!.evidence_digest === computeEdictumWorkflowApprovalEvidenceDigest(unsigned) &&
        timestamp(receipt!.approved_at) <= Date.now() &&
        timestamp(receipt!.expires_at) > Date.now(),
      'workflow approval receipt binding invalid',
    );
    const binding: WorkflowApprovalBinding = {
      stage_id: receipt!.stage_id,
      approval_id: receipt!.approval_id,
      operation_hash: receipt!.operation_hash,
      tenant: receipt!.tenant,
      project: receipt!.project,
    };
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() =>
      this.#claimWorkflowAttemptInTransaction(input, (current, attempt) => {
        requireState(
          attempt.attempt_id === approvalRequest.attempt_id &&
            assignmentIdentity(
              current.work!,
              input.stageId,
              input.assignmentIndex,
              authority.generation,
              authority.reference,
            ) === approvalRequest.assignment_id &&
            current.work!.binding.config_digest === approvalRequest.config_digest &&
            current.work!.binding.workflow_id === approvalRequest.workflow_id &&
            timestamp(receipt!.expires_at) > Date.now(),
          'workflow approval changed before attempt reservation',
        );
        this.#assertReconciliationWritesAllowed();
        const key = canonicalJsonDigest(binding);
        requireState(this.#governanceRead(storeId, 'approval', key) === null, 'workflow approval receipt replay');
        const record: WorkflowApprovalConsumptionRecord = {
          schema: 'EdictumWorkflowApprovalConsumption/v1',
          store_id: storeId,
          store_generation: this.#governanceGeneration(storeId, true),
          binding,
          fencing_token: randomUUID(),
          status: 'reserved',
          reserved_at: new Date().toISOString(),
          approval_expires_at: receipt!.expires_at,
          attempt_id: attempt.attempt_id,
        };
        this.#governanceWrite('approval', key, record, null);
        return snapshot(record);
      }),
    ).immediate();
  }
  #storedWorkflowApproval(
    authorization: WorkflowAttemptApprovalAuthorization,
    status: 'reserved' | 'commit_unknown',
  ): {
    before: HostStateSnapshot;
    stored: { revision: number; digest: string };
    approval: WorkflowApprovalConsumptionRecord;
  } {
    const token = authorization.approval;
    requireState(token !== null && token.status === status, 'workflow approval reservation receipt invalid');
    const before = this.#read(authorization.receipt.identity);
    this.#assertMaintenanceGeneration(authorization.receipt.maintenanceGeneration);
    const attempt = before.work?.execution.assignment_attempts.find(
      (entry) => entry.attempt_id === authorization.receipt.attempt.attempt_id,
    );
    requireState(
      attempt?.status === 'started' &&
        canonicalJsonDigest(attempt) === canonicalJsonDigest(authorization.receipt.attempt),
      'workflow approval attempt binding invalid',
    );
    const stored = this.#governanceRead(token!.store_id, 'approval', canonicalJsonDigest(token!.binding));
    requireState(
      stored !== null && canonicalJsonDigest(stored.record) === canonicalJsonDigest(token),
      'workflow approval fencing conflict',
    );
    requireState(token!.attempt_id === authorization.receipt.attempt.attempt_id, 'workflow approval attempt mismatch');
    return { before, stored: stored!, approval: token! };
  }
  beginWorkflowAttemptEffect(
    authorization: WorkflowAttemptApprovalAuthorization,
  ): WorkflowAttemptApprovalAuthorization {
    const token = snapshot(authorization);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      const { before, stored, approval } = this.#storedWorkflowApproval(token, 'reserved');
      requireState(
        approval.approval_expires_at !== null && timestamp(approval.approval_expires_at) > Date.now(),
        'workflow approval expired before provider entry',
      );
      requireState(
        canonicalJsonDigest(before.workVersion) === canonicalJsonDigest(token.receipt.workVersion),
        'workflow approval work version changed before provider entry',
      );
      const lease = token.receipt.attempt.lease;
      const ticket = before.ledger?.tickets.find((entry) => entry.ticket_id === lease.ticket_id);
      requireState(
        before.work?.execution.status === 'active' &&
          canonicalJsonDigest(before.work.lease) === canonicalJsonDigest(lease) &&
          ticket?.expires_at !== null &&
          ticket?.expires_at !== undefined &&
          timestamp(ticket.expires_at) > Date.now(),
        'workflow approval lease expired before provider entry',
      );
      const next: WorkflowApprovalConsumptionRecord = {
        ...approval,
        status: 'commit_unknown',
        terminal_at: new Date().toISOString(),
      };
      this.#governanceWrite('approval', canonicalJsonDigest(approval.binding), next, stored);
      return snapshot({ receipt: token.receipt, approval: next });
    }).immediate();
  }
  completeWorkflowAttemptWithApproval(
    authorization: WorkflowAttemptApprovalAuthorization,
    result: unknown,
  ): WorkflowAttemptApprovalAuthorization {
    const token = snapshot(authorization),
      output = snapshot(result);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      const { stored, approval } = this.#storedWorkflowApproval(token, 'commit_unknown');
      const receipt = this.#finishAttemptInTransaction(token.receipt, 'completed', output);
      const next: WorkflowApprovalConsumptionRecord = {
        ...approval,
        status: 'applied',
        terminal_at: new Date().toISOString(),
      };
      this.#governanceWrite('approval', canonicalJsonDigest(approval.binding), next, stored);
      return snapshot({ receipt, approval: next });
    }).immediate();
  }
  abortUnstartedWorkflowAttempt(
    authorization: WorkflowAttemptApprovalAuthorization | WorkflowAttemptReceipt,
  ): HostStateSnapshot {
    const token = snapshot(authorization);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      if (!('receipt' in token)) {
        const before = this.#read(token.identity);
        this.#assertMaintenanceGeneration(token.maintenanceGeneration);
        const attempts = before.work?.execution.assignment_attempts ?? [];
        const index = attempts.findIndex((entry) => entry.attempt_id === token.attempt.attempt_id);
        requireState(
          index >= 0 &&
            token.attempt.status === 'started' &&
            canonicalJsonDigest(attempts[index]) === canonicalJsonDigest(token.attempt) &&
            !attempts.some((entry) => entry.previous_attempt_id === token.attempt.attempt_id),
          'unstarted attempt binding invalid',
        );
        const approvals = this.#database
          .query("SELECT store_id,record_key FROM agent_host_governance WHERE workspace_id=? AND kind='approval'")
          .all(this.#workspaceId) as { store_id: string; record_key: string }[];
        requireState(
          approvals.every(
            ({ store_id, record_key }) =>
              (
                this.#governanceRead(store_id, 'approval', record_key)?.record as
                  | WorkflowApprovalConsumptionRecord
                  | undefined
              )?.attempt_id !== token.attempt.attempt_id,
          ),
          'protected attempt requires approval authorization',
        );
        return this.#writeAttempts(
          before,
          attempts.filter((_, position) => position !== index),
        );
      }
      const { before, stored, approval } = this.#storedWorkflowApproval(token, 'reserved');
      const attempts = before.work!.execution.assignment_attempts;
      const index = attempts.findIndex((entry) => entry.attempt_id === token.receipt.attempt.attempt_id);
      requireState(
        index >= 0 && !attempts.some((entry) => entry.previous_attempt_id === token.receipt.attempt.attempt_id),
        'unstarted attempt has dependent state',
      );
      const next: WorkflowApprovalConsumptionRecord = {
        ...approval,
        status: 'aborted',
        terminal_at: new Date().toISOString(),
      };
      this.#governanceWrite('approval', canonicalJsonDigest(approval.binding), next, stored);
      return this.#writeAttempts(
        before,
        attempts.filter((_, position) => position !== index),
      );
    }).immediate();
  }
  #finishAttempt(
    receipt: WorkflowAttemptReceipt,
    status: 'completed' | 'uncertain',
    result: unknown,
  ): WorkflowAttemptReceipt {
    const token = snapshot(receipt),
      output = snapshot(result);
    requireState(Object.keys(token).length === 4, 'attempt receipt invalid');
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() =>
      this.#finishAttemptInTransaction(token, status, output),
    ).immediate();
  }
  #finishAttemptInTransaction(
    token: WorkflowAttemptReceipt,
    status: 'completed' | 'uncertain',
    output: unknown,
  ): WorkflowAttemptReceipt {
    const before = this.#read(token.identity);
    this.#assertMaintenanceGeneration(token.maintenanceGeneration);
    requireState(before.work, 'attempt work missing');
    const found = before.work!.execution.assignment_attempts.find(
      (entry) => entry.attempt_id === token.attempt.attempt_id,
    );
    const terminal: AssignmentAttempt = {
      ...token.attempt,
      status,
      result: output,
      result_digest: status === 'completed' ? canonicalJsonDigest(output) : null,
    };
    requireState(
      token.attempt.status === 'started' && token.attempt.result === null && token.attempt.result_digest === null,
      'attempt completion requires the original start receipt',
    );
    if (found && canonicalJsonDigest(found) === canonicalJsonDigest(terminal))
      return snapshot({
        identity: token.identity,
        workVersion: before.workVersion!,
        attempt: found,
        maintenanceGeneration: before.maintenanceGeneration,
      });
    requireState(
      found && found.status === 'started' && canonicalJsonDigest(found) === canonicalJsonDigest(token.attempt),
      'attempt completion binding invalid',
    );
    const saved = this.#writeAttempts(
      before,
      before.work!.execution.assignment_attempts.map((entry) =>
        entry.attempt_id === terminal.attempt_id ? terminal : entry,
      ),
    );
    return snapshot({
      identity: token.identity,
      workVersion: saved.workVersion!,
      attempt: terminal,
      maintenanceGeneration: saved.maintenanceGeneration,
    });
  }
  completeWorkflowAttempt(receipt: WorkflowAttemptReceipt, result: unknown): WorkflowAttemptReceipt {
    return this.#finishAttempt(receipt, 'completed', result);
  }
  markWorkflowAttemptUncertain(receipt: WorkflowAttemptReceipt): WorkflowAttemptReceipt {
    return this.#finishAttempt(receipt, 'uncertain', null);
  }
  async reconcileWorkflowAttempt(request: WorkflowAttemptReconciliationRequest): Promise<WorkflowAttemptReceipt> {
    requireState(this.#verifyReconciliation, 'trusted reconciliation verifier required');
    const input = snapshot(request);
    requireState(
      Object.keys(input).length === (input.expectedMaintenanceGeneration === undefined ? 9 : 10) &&
        ['completed', 'no_effect'].includes(input.outcome),
      'reconciliation request invalid',
    );
    requireState(input.outcome === 'completed' || input.result === null, 'no-effect result must be null');
    const before = this.readHostStateSnapshot(input.identity);
    this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
    const recorded = before.work?.execution.assignment_attempts.find((entry) => entry.attempt_id === input.attemptId);
    if (recorded?.reconciliation) {
      const expected = expectedAttemptReconciliation(input, before.work!, recorded, this.reconciliationPrincipal!);
      requireState(
        validGateVersion(input.expectedWork) &&
          validGateVersion(input.expectedLedger) &&
          before.workVersion?.revision === input.expectedWork.revision + 1 &&
          canonicalJsonDigest(before.ledgerVersion) === canonicalJsonDigest(input.expectedLedger) &&
          recorded.status === input.outcome &&
          canonicalJsonDigest(recorded.result) === canonicalJsonDigest(input.result) &&
          canonicalJsonDigest(recorded.reconciliation) === canonicalJsonDigest(expected),
        'reconciliation replay binding invalid',
      );
      return snapshot({
        identity: input.identity,
        workVersion: before.workVersion!,
        attempt: recorded,
        maintenanceGeneration: before.maintenanceGeneration,
      });
    }
    matchesExpected(before.workVersion, input.expectedWork);
    matchesExpected(before.ledgerVersion, input.expectedLedger);
    const attempt = before.work?.execution.assignment_attempts.find((entry) => entry.attempt_id === input.attemptId);
    requireState(
      attempt && ['started', 'uncertain'].includes(attempt.status),
      'reconciliation requires unresolved attempt',
    );
    const expected = expectedAttemptReconciliation(input, before.work!, attempt, this.reconciliationPrincipal!);
    this.#checkedWork({
      ...before.work!,
      revision: before.work!.revision + 1,
      lifecycle: { ...before.work!.lifecycle, revision: before.work!.revision + 1 },
      execution: {
        ...before.work!.execution,
        assignment_attempts: before.work!.execution.assignment_attempts.map((entry) =>
          entry.attempt_id === attempt.attempt_id
            ? {
                ...entry,
                status: input.outcome,
                result: input.result,
                result_digest: expected.result_digest,
                reconciliation: expected,
              }
            : entry,
        ),
      },
    });
    const authorized = snapshot(await this.#verifyReconciliation(input, before));
    requireState(authorized && typeof authorized === 'object', 'reconciliation authority denied');
    requireState(
      canonicalJsonDigest(authorized) === canonicalJsonDigest(expected),
      'reconciliation authorization differs from transition',
    );
    const terminal: AssignmentAttempt = {
      ...attempt,
      status: input.outcome,
      result: input.result,
      result_digest: expected.result_digest,
      reconciliation: authorized,
    };
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      const current = this.#read(input.identity);
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      matchesExpected(current.workVersion, input.expectedWork);
      matchesExpected(current.ledgerVersion, input.expectedLedger);
      const saved = this.#writeAttempts(
        current,
        current.work!.execution.assignment_attempts.map((entry) =>
          entry.attempt_id === terminal.attempt_id ? terminal : entry,
        ),
      );
      return snapshot({
        identity: input.identity,
        workVersion: saved.workVersion!,
        attempt: terminal,
        maintenanceGeneration: saved.maintenanceGeneration,
      });
    }).immediate();
  }
  /** Capture a stopped SOURCE invocation; failed work is terminal, never accepted. Releases no other owner and grants no rights. */
  captureStoppedSourceObservation(input: {
    identity: WorkIdentity;
    attempt: number;
    expectedWork: StateVersion;
    expectedLedger: StateVersion;
    expectedJournal: StateVersion;
    nativeSessionHandle: string;
    observation: MastraSessionLedgerState['items'][number]['observation'];
    terminalEvidence: {
      schema: 'StoppedSourceTerminalEvidence/v1';
      native_actor: string;
      observation_ref: string;
      owner_decision_ref: string;
      terminal: 'partial_stopped';
    };
    candidateSnapshot: {
      schema: 'UnverifiedSourceSnapshot/v1';
      entries: { path: string; sha256: string; size: number }[];
    };
    verifyCurrent: () => void;
    fault?: () => void;
  }): HostStateSnapshot {
    requireState(!this.#database.inTransaction, 'nested stopped-source capture forbidden');
    const { verifyCurrent: _verify, fault: _fault, ...boundedRequest } = input;
    const request = snapshot(boundedRequest);
    requireState(
      input.attempt > 0 && Number.isSafeInteger(input.attempt) && typeof input.verifyCurrent === 'function',
      'stopped-source capture input invalid',
    );
    requireState(
      input.terminalEvidence?.schema === 'StoppedSourceTerminalEvidence/v1' &&
        input.terminalEvidence.terminal === 'partial_stopped' &&
        [
          input.terminalEvidence.native_actor,
          input.terminalEvidence.observation_ref,
          input.terminalEvidence.owner_decision_ref,
        ].every((value) => typeof value === 'string' && value.trim().length > 0),
      'actual attributable stopped-source terminal evidence required',
    );
    const observation = input.observation;
    requireState(
      observation?.schema === 'VidaSessionObservation/v1' &&
        observation.status === 'reported_failed' &&
        observation.host_attempt_id &&
        observation.output_digest === canonicalJsonDigest(observation.summary) &&
        Array.isArray(observation.changed_paths) &&
        observation.evidence_refs.includes(input.terminalEvidence.observation_ref),
      'stopped-source partial observation required',
    );
    requireState(
      input.candidateSnapshot?.schema === 'UnverifiedSourceSnapshot/v1' &&
        Array.isArray(input.candidateSnapshot.entries),
      'unverified candidate inventory required',
    );
    const requestDigest = canonicalJsonDigest(request);
    return this.#transactionWithProducerFence(() => {
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_stopped_source_capture (workspace_id TEXT,work_id TEXT,attempt INTEGER,action_id TEXT,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
      );
      this.#assertReconciliationWritesAllowed();
      const existing = this.#database
        .query(
          'SELECT payload,digest FROM agent_host_stopped_source_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt, observation.action_id) as {
        payload: string;
        digest: string;
      } | null;
      if (existing) {
        const record = JSON.parse(existing.payload);
        requireState(
          canonicalJsonDigest(record) === existing.digest && record.request_digest === requestDigest,
          'stopped-source capture retry differs',
        );
        input.verifyCurrent();
        const current = this.#read(input.identity);
        requireState(
          current.work?.lease === null &&
            current.work.execution.status === 'suspended' &&
            sameJson(current.workVersion, record.work_version),
          'stopped-source capture retry follows dependent work write',
        );
        const journal = this.#database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
          revision: number;
          payload: string;
          digest: string;
        } | null;
        requireState(
          journal &&
            sameJson({ revision: journal.revision, digest: journal.digest }, record.captured_journal_version) &&
            canonicalJsonDigest(JSON.parse(journal.payload)) === journal.digest,
          'stopped-source capture retry follows journal change',
        );
        requireState(
          current.ledger &&
            sameJson(
              current.ledger.tickets.find((entry) => entry.ticket_id === record.released_ticket.ticket_id),
              record.released_ticket,
            ) &&
            sameJson(
              current.ledger.claims.filter((entry) => entry.ticket_id === record.released_ticket.ticket_id),
              record.released_claims,
            ) &&
            sameJson(
              current.ledger.operations.find((entry) => entry.operation_id === record.release_operation.operation_id),
              record.release_operation,
            ),
          'stopped-source capture retry released lineage changed',
        );
        const resources = record.released_ticket.exclusive_resources as readonly string[];
        const oldClaims = new Set(
          (record.original_ledger.claims as typeof current.ledger.claims).map((entry) => entry.claim_id),
        );
        requireState(
          !current.ledger.claims.some(
            (entry) =>
              entry.resources.some((resource) => resources.includes(resource)) &&
              (entry.status === 'active' || !oldClaims.has(entry.claim_id)),
          ),
          'stopped-source capture retry follows newer scope grant',
        );
        // Other disjoint work may advance shared coordination without reviving this old invocation.
        return current;
      }
      const before = this.#read(input.identity),
        work = before.work,
        ledger = before.ledger;
      matchesExpected(before.workVersion, input.expectedWork);
      matchesExpected(before.ledgerVersion, input.expectedLedger);
      requireState(
        work && ledger && work.execution.status === 'active' && work.lease?.thread_id === input.nativeSessionHandle,
        'stopped-source original owner differs',
      );
      const lease = work.lease,
        ticket = ledger.tickets.find((entry) => entry.ticket_id === lease.ticket_id),
        claims = ledger.claims.filter((entry) => entry.ticket_id === lease.ticket_id && entry.status === 'active');
      requireState(
        ticket?.status === 'active' &&
          ticket.thread_id === lease.thread_id &&
          ticket.generation === lease.generation &&
          claims.length === 1 &&
          claims[0]!.generation === lease.generation &&
          claims[0]!.thread_id === lease.thread_id &&
          ticket.exclusive_resources.some((resource) => resource.startsWith('file:')),
        'stopped-source original rights differ',
      );
      const row = this.#database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null;
      requireState(
        row && row.revision === input.expectedJournal.revision && row.digest === input.expectedJournal.digest,
        'stopped-source journal CAS differs',
      );
      const state = JSON.parse(row.payload) as MastraSessionLedgerState;
      requireState(
        canonicalJsonDigest(state) === row.digest &&
          state.work_id === input.identity.work_id &&
          state.attempt === input.attempt &&
          state.run_id === work.execution.run_id,
        'stopped-source journal identity differs',
      );
      const item = state.items.find((entry) => entry.request.action_id === observation.action_id),
        reservation = item?.host_reservation;
      requireState(
        item &&
          item.issue_id === observation.issue_id &&
          item.observation === null &&
          reservation &&
          sameJson(reservation.receipt.identity, input.identity) &&
          sameJson(reservation.receipt.attempt.lease, lease) &&
          reservation.receipt.attempt.attempt_id === observation.host_attempt_id,
        'stopped-source exact issued reservation required',
      );
      requireState(
        reservation.approvalAction === 'source.write' &&
          reservation.invocation.profile.mutation_scope === 'repository_source' &&
          reservation.invocation.profile.egress_policy === 'none' &&
          sameJson(reservation.invocation.workContext.binding, work.binding) &&
          reservation.request.workItemId === work.binding.lifecycle_work_id &&
          reservation.request.configDigest === work.binding.config_digest &&
          reservation.request.workflowId === work.binding.workflow_id &&
          reservation.request.teamId === work.binding.team_id &&
          reservation.request.stageId === item.request.stage_id &&
          reservation.request.assignmentIndex === item.request.assignment_index &&
          reservation.receipt.attempt.request_digest === reservation.requestDigest &&
          reservation.receipt.attempt.stage_id === item.request.stage_id &&
          reservation.receipt.attempt.assignment_index === item.request.assignment_index &&
          item.request.config_digest === work.binding.config_digest &&
          item.request.scope_digest === state.source_scope?.digest &&
          state.source_scope?.digest === work.binding.work_source_revision &&
          input.terminalEvidence.native_actor === observation.agent_id,
        'stopped-source protected original invocation binding differs',
      );
      requireState(
        state.items.every(
          (entry) =>
            entry === item ||
            (entry.issue_id === null &&
              entry.observation === null &&
              !entry.host_reservation &&
              !entry.research_activation &&
              !entry.research_normalization),
        ),
        'other issued outcome remains pending',
      );
      requireState(
        work.execution.assignment_attempts.every(
          (entry) =>
            entry.attempt_id === observation.host_attempt_id || ['completed', 'no_effect'].includes(entry.status),
        ),
        'another Host effect remains unresolved',
      );
      const original = state.source_scope!;
      requireState(
        input.candidateSnapshot.entries.length === original.entries.length &&
          new Set(input.candidateSnapshot.entries.map((entry) => entry.path)).size === original.entries.length,
        'candidate inventory incomplete or duplicated',
      );
      const changes = input.candidateSnapshot.entries
        .filter((entry) => {
          const old = original.entries.find((source) => source.path === entry.path);
          requireState(
            old && hashPattern.test(entry.sha256) && Number.isSafeInteger(entry.size) && entry.size >= 0,
            'candidate inventory invalid',
          );
          return old.sha256 !== entry.sha256;
        })
        .map((entry) => entry.path)
        .sort();
      requireState(
        changes.every((value) => work.binding.implementation_paths.includes(value)) &&
          sameJson(changes, [...observation.changed_paths!].sort()),
        'candidate change outside original scope or observation differs',
      );
      input.verifyCurrent();
      const authorization = reservation.authorization;
      requireState(authorization, 'bound local source approval required');
      const { stored, approval } = this.#storedWorkflowApproval(authorization, 'commit_unknown');
      requireState(approval.attempt_id === observation.host_attempt_id, 'stopped-source approval attempt differs');
      const receipt = this.#finishAttemptInTransaction(authorization.receipt, 'completed', observation);
      this.#governanceWrite(
        'approval',
        canonicalJsonDigest(approval.binding),
        { ...approval, status: 'applied', terminal_at: new Date().toISOString() },
        stored,
      );
      const settled = this.#read(input.identity),
        now = new Date().toISOString();
      const nextJournal = {
        ...state,
        items: state.items.map((entry) => (entry === item ? { ...entry, observation } : entry)),
      };
      const nextLedger = {
        ...ledger,
        revision: ledger.revision + 1,
        tickets: ledger.tickets.map((entry) =>
          entry.ticket_id === ticket.ticket_id
            ? { ...entry, status: 'released' as const, active_resources: [], blocked_resources: [], expires_at: null }
            : entry,
        ),
        claims: ledger.claims.map((entry) =>
          entry.ticket_id === ticket.ticket_id && entry.status === 'active'
            ? { ...entry, status: 'released' as const, renewed_at: now }
            : entry,
        ),
        operations: [
          ...ledger.operations,
          {
            schema: 'CoordinationOperation/v1' as const,
            operation_id: 'stopped-source-release-' + observation.action_id,
            kind: 'release' as const,
            ticket_id: ticket.ticket_id,
            work_id: ticket.work_id,
            thread_id: ticket.thread_id,
            source_revision: ticket.source_revision,
            resources: [...ticket.exclusive_resources],
            from_ledger_revision: ledger.revision,
            to_ledger_revision: ledger.revision + 1,
            decided_by: input.nativeSessionHandle,
            decision_pointer: input.terminalEvidence.owner_decision_ref,
            created_at: now,
          },
        ],
      };
      const after = this.#commitHostState(
        {
          expectedWork: settled.workVersion,
          expectedLedger: before.ledgerVersion,
          expectedMaintenanceGeneration: before.maintenanceGeneration,
          expectedSessionJournal: { attempt: input.attempt, version: input.expectedJournal },
          nextWork: {
            ...settled.work!,
            revision: settled.work!.revision + 1,
            lifecycle: { ...settled.work!.lifecycle, revision: settled.work!.revision + 1 },
            lease: null,
            execution: { ...settled.work!.execution, status: 'suspended' },
          },
          nextLedger,
        },
        {
          actionId: observation.action_id,
          next: nextJournal,
          verifyCurrent: input.verifyCurrent,
          stoppedSource: true,
        },
        true,
      );
      const record = {
        schema: 'StoppedSourceCaptureReceipt/v1',
        request_digest: requestDigest,
        request,
        original_work: before.work,
        original_journal: { version: input.expectedJournal, state },
        original_ledger: ledger,
        original_approval: approval,
        candidate_snapshot: input.candidateSnapshot,
        terminal_receipt: receipt,
        captured_journal_version: {
          revision: input.expectedJournal.revision + 1,
          digest: canonicalJsonDigest(nextJournal),
        },
        released_ticket: after.ledger!.tickets.find((entry) => entry.ticket_id === ticket.ticket_id),
        released_claims: after.ledger!.claims.filter((entry) => entry.ticket_id === ticket.ticket_id),
        release_operation: after.ledger!.operations.find(
          (entry) => entry.operation_id === 'stopped-source-release-' + observation.action_id,
        ),
        work_version: after.workVersion,
        ledger_version: after.ledgerVersion,
        canonical_acceptance: false,
        runtime_acceptance: false,
        rights_granted: false,
      };
      this.#database
        .query('INSERT INTO agent_host_stopped_source_capture VALUES(?,?,?,?,?,?)')
        .run(
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          observation.action_id,
          canonicalJson(record),
          canonicalJsonDigest(record),
        );
      input.fault?.();
      return after;
    }).immediate();
  }

  /** Extend one live owner's expiry without changing its fencing identity or issued journal payload. */
  renewActiveLocalLease(input: {
    identity: WorkIdentity;
    attempt: number;
    nativeSessionHandle: string;
    generation: number;
    expectedWork: StateVersion;
    expectedLedger: StateVersion;
    expectedJournal: StateVersion;
    expectedMaintenanceGeneration: number;
    verifyCurrent: (work: WorkState, journal: Record<string, unknown>) => void;
  }): HostStateSnapshot {
    requireState(
      Number.isSafeInteger(input.attempt) &&
        input.attempt > 0 &&
        Number.isSafeInteger(input.generation) &&
        input.generation > 0 &&
        typeof input.verifyCurrent === 'function',
      'lease renewal input invalid',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      const before = this.#read(input.identity);
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      matchesExpected(before.workVersion, input.expectedWork);
      matchesExpected(before.ledgerVersion, input.expectedLedger);
      const work = before.work,
        ledger = before.ledger,
        lease = work?.lease;
      const ticket = ledger?.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
      const claims =
        ledger?.claims.filter((entry) => entry.ticket_id === lease?.ticket_id && entry.status === 'active') ?? [];
      const now = Date.now();
      requireState(
        work &&
          ledger &&
          lease &&
          ticket &&
          claims.length === 1 &&
          work.execution.status === 'active' &&
          lease.thread_id === input.nativeSessionHandle &&
          lease.generation === input.generation &&
          ticket.thread_id === lease.thread_id &&
          ticket.generation === lease.generation &&
          ticket.status === 'active' &&
          ticket.expires_at !== null &&
          timestamp(ticket.expires_at) > now &&
          timestamp(claims[0]!.lease_expires_at) > now &&
          claims[0]!.thread_id === lease.thread_id &&
          claims[0]!.generation === lease.generation,
        'lease renewal owner, fencing identity or live expiry differs',
      );
      requireState(
        work.execution.assignment_attempts.every(
          (entry) => !['started', 'uncertain'].includes(entry.status) || sameJson(entry.lease, work.lease),
        ),
        'lease renewal cannot retain a foreign writer fence',
      );
      requireState(
        !ledger.claims.some(
          (entry) =>
            entry.status === 'active' &&
            entry.ticket_id !== ticket.ticket_id &&
            entry.resources.some((resource) => ticket.active_resources.includes(resource)),
        ),
        'lease renewal conflicts with another active claim',
      );
      requireState(
        !ledger.tickets.some(
          (entry) =>
            entry.status === 'queued' &&
            entry.sequence < ticket.sequence &&
            entry.exclusive_resources.some((resource) => ticket.active_resources.includes(resource)),
        ),
        'lease renewal conflicts with earlier FIFO ticket',
      );
      const row = this.#database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null;
      requireState(
        row && row.revision === input.expectedJournal.revision && row.digest === input.expectedJournal.digest,
        'lease renewal journal CAS changed',
      );
      const journal = JSON.parse(row.payload) as Record<string, unknown>;
      validateWorkSessionBinding(work, journal as unknown as MastraSessionLedgerState, this.#repositoryRoot);
      requireState(
        canonicalJsonDigest(journal) === row.digest &&
          journal.schema === 'MastraSessionLedger/v1' &&
          journal.workspace_id === this.#workspaceId &&
          journal.work_id === input.identity.work_id &&
          journal.attempt === input.attempt &&
          Array.isArray(journal.items),
        'lease renewal journal identity changed',
      );
      requireState(
        (journal.items as { host_reservation?: { receipt?: { attempt?: { lease?: unknown } } } }[]).every(
          (entry) => !entry.host_reservation || sameJson(entry.host_reservation.receipt?.attempt?.lease, work.lease),
        ),
        'lease renewal writer reservation fence differs',
      );
      input.verifyCurrent(snapshot(work), snapshot(journal));
      const expiry = new Date(
        Math.max(now + 60 * 60 * 1000, timestamp(ticket.expires_at), timestamp(claims[0]!.lease_expires_at)),
      ).toISOString();
      const nextWork = this.#checkedWork({
        ...work,
        revision: work.revision + 1,
        lifecycle: { ...work.lifecycle, revision: work.revision + 1 },
      });
      const nextLedger = checkedLedger({
        ...ledger,
        revision: ledger.revision + 1,
        tickets: ledger.tickets.map((entry) =>
          entry.ticket_id === ticket.ticket_id ? { ...entry, expires_at: expiry } : entry,
        ),
        claims: ledger.claims.map((entry) =>
          entry.claim_id === claims[0]!.claim_id
            ? { ...entry, lease_expires_at: expiry, renewed_at: new Date(now).toISOString() }
            : entry,
        ),
      });
      validatePair(nextWork, nextLedger);
      validateProgress(before, nextWork, nextLedger);
      for (const [kind, id, value, expected] of [
        ['work', identityKey(input.identity), nextWork, before.workVersion!],
        ['ledger', 'shared', nextLedger, before.ledgerVersion!],
      ] as const) {
        const changed = this.#database
          .query(
            'UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
          )
          .run(
            value.revision,
            canonicalJson(value),
            canonicalJsonDigest(value),
            this.#workspaceId,
            kind,
            id,
            expected.revision,
            expected.digest,
          );
        requireState(changed.changes === 1, 'lease renewal host CAS conflict');
      }
      // Revision advances to reject stale renewal/issue callers; all requests, issue IDs and accepted observations remain byte-identical.
      const bumped = this.#database
        .query(
          'UPDATE agent_host_mastra_session_ledger SET revision=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
        )
        .run(row.revision + 1, this.#workspaceId, input.identity.work_id, input.attempt, row.revision, row.digest);
      requireState(bumped.changes === 1, 'lease renewal journal CAS conflict');
      this.#onReconciledWorkWrite(input.identity, before.workVersion, version(nextWork)!);
      return this.#read(input.identity);
    }).immediate();
  }

  /** Forward one quiescent expired owner onto a fresh ticket without replaying accepted evidence. */
  recoverExpiredLocalLease(input: {
    identity: WorkIdentity;
    attempt: number;
    nativeSessionHandle: string;
    generation: number;
    expectedWork: StateVersion;
    expectedLedger: StateVersion;
    expectedJournal: StateVersion;
    expectedMaintenanceGeneration: number;
    verifyCurrent: (
      work: WorkState,
      journal: Record<string, unknown>,
    ) => { runtimeCodeDigest: string; authorityPointer: string };
  }): HostStateSnapshot {
    requireState(
      Number.isSafeInteger(input.attempt) &&
        input.attempt > 0 &&
        Number.isSafeInteger(input.generation) &&
        input.generation > 0 &&
        typeof input.verifyCurrent === 'function',
      'expired lease recovery input invalid',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      const before = this.#read(input.identity);
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      matchesExpected(before.workVersion, input.expectedWork);
      matchesExpected(before.ledgerVersion, input.expectedLedger);
      const work = before.work,
        ledger = before.ledger,
        lease = work?.lease;
      const ticket = ledger?.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
      const claims =
        ledger?.claims.filter((entry) => entry.ticket_id === lease?.ticket_id && entry.status === 'active') ?? [];
      const now = Date.now();
      requireState(
        work &&
          ledger &&
          lease &&
          ticket &&
          claims.length === 1 &&
          work.execution.status === 'active' &&
          lease.thread_id === input.nativeSessionHandle &&
          lease.generation === input.generation &&
          ticket.thread_id === lease.thread_id &&
          ticket.generation === lease.generation &&
          ticket.status === 'active' &&
          ticket.expires_at !== null &&
          timestamp(ticket.expires_at) <= now &&
          timestamp(claims[0]!.lease_expires_at) <= now &&
          claims[0]!.thread_id === lease.thread_id &&
          claims[0]!.generation === lease.generation,
        'expired lease recovery owner, fencing identity or live expiry differs',
      );
      requireState(
        work.lifecycle.phase === 'INTAKE' &&
          work.lifecycle.seal === null &&
          work.lifecycle.assurance.review_generation === 0 &&
          work.lifecycle.assurance.delivery_cycle_id === null &&
          work.execution.assignment_attempts.every((attempt) => attempt.status === 'completed') &&
          ticket.exclusive_resources.every((resource) => resource === 'execution:' + input.identity.work_id),
        'issued writer outcome must settle before expired lease recovery',
      );
      requireState(
        !ledger.claims.some(
          (entry) =>
            entry.status === 'active' &&
            entry.ticket_id !== ticket.ticket_id &&
            entry.resources.some((resource) => ticket.active_resources.includes(resource)),
        ),
        'expired lease recovery conflicts with another active claim',
      );
      requireState(
        !ledger.tickets.some(
          (entry) =>
            entry.status === 'queued' &&
            entry.sequence < ledger.next_sequence &&
            entry.exclusive_resources.some((resource) => ticket.active_resources.includes(resource)),
        ),
        'expired lease recovery conflicts with earlier FIFO ticket',
      );
      const row = this.#database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null;
      requireState(
        row && row.revision === input.expectedJournal.revision && row.digest === input.expectedJournal.digest,
        'expired lease recovery journal CAS changed',
      );
      const journal = JSON.parse(row.payload) as Record<string, unknown>;
      requireState(
        canonicalJsonDigest(journal) === row.digest &&
          journal.schema === 'MastraSessionLedger/v1' &&
          journal.workspace_id === this.#workspaceId &&
          journal.work_id === input.identity.work_id &&
          journal.attempt === input.attempt &&
          journal.run_id === work.execution.run_id &&
          Array.isArray(journal.items),
        'expired lease recovery journal identity changed',
      );
      requireState(
        !(journal.items as { host_reservation?: unknown }[]).some((entry) => entry.host_reservation),
        'issued writer-bound wave must advance before expired lease recovery',
      );
      const completed = journal.completed as {
        items: { issue_id: unknown; observation: { status: string } | null; host_reservation?: unknown }[];
      }[];
      requireState(
        Array.isArray(completed) &&
          completed.length > 0 &&
          completed.every(
            (wave) =>
              Array.isArray(wave.items) &&
              wave.items.length > 0 &&
              wave.items.every(
                (item) =>
                  item.issue_id !== null &&
                  item.observation?.status === 'reported_complete' &&
                  (!item.host_reservation ||
                    completedSourceJournalObservationMatches(
                      work,
                      item as unknown as MastraSessionLedgerState['items'][number],
                    )),
              ),
          ),
        'expired recovery historical outcomes must already be accepted',
      );
      requireState(
        work.execution.assignment_attempts.every((attempt) =>
          completed
            .flatMap((wave) => wave.items)
            .some(
              (item) =>
                (item as unknown as MastraSessionLedgerState['items'][number]).host_reservation?.receipt.attempt
                  .attempt_id === attempt.attempt_id &&
                completedSourceJournalObservationMatches(
                  work,
                  item as unknown as MastraSessionLedgerState['items'][number],
                ),
            ),
        ),
        'expired execution recovery requires every writer result durably accepted',
      );
      requireState(
        (journal.items as { issue_id: unknown; observation: unknown }[]).length > 0 &&
          (journal.items as { issue_id: unknown; observation: unknown }[]).every(
            (item) => item.issue_id === null && item.observation === null,
          ),
        'expired recovery requires an entirely unissued current wave',
      );
      const verified = input.verifyCurrent(snapshot(work), snapshot(journal));
      const newRuntimeDigest = verified.runtimeCodeDigest;
      requireState(
        typeof verified.authorityPointer === 'string' &&
          verified.authorityPointer.length > 0 &&
          verified.authorityPointer.length <= 512 &&
          !/\p{Cc}/u.test(verified.authorityPointer),
        'expired recovery authority reference invalid',
      );
      requireState(hashPattern.test(newRuntimeDigest), 'expired recovery current bundle binding invalid');
      const timestampNow = new Date(now).toISOString(),
        expiry = new Date(now + 60 * 60 * 1000).toISOString();
      const ticketId = 'ticket-' + randomUUID(),
        claimId = 'claim-' + randomUUID();
      const successorTicket = {
        ...ticket,
        ticket_id: ticketId,
        generation: ledger.open_generation,
        sequence: ledger.next_sequence,
        claim_ids: [claimId],
        expires_at: expiry,
        created_at: timestampNow,
      };
      const successorClaim = {
        ...claims[0]!,
        claim_id: claimId,
        ticket_id: ticketId,
        generation: ledger.open_generation,
        lease_expires_at: expiry,
        created_at: timestampNow,
        renewed_at: timestampNow,
      };
      const nextWork = this.#checkedWork({
        ...work,
        revision: work.revision + 1,
        lease: { ticket_id: ticketId, thread_id: input.nativeSessionHandle, generation: ledger.open_generation },
        binding: {
          ...work.binding,
          runtime_code_digest: newRuntimeDigest,
          runtime_source_revision: newRuntimeDigest,
        },
        lifecycle: {
          ...work.lifecycle,
          revision: work.revision + 1,
          config_binding: { ...work.lifecycle.config_binding, runtime_code_digest: newRuntimeDigest },
        },
      });
      const nextLedger = checkedLedger({
        ...ledger,
        revision: ledger.revision + 1,
        next_sequence: ledger.next_sequence + 1,
        tickets: [
          ...ledger.tickets.map((entry) =>
            entry.ticket_id === ticket.ticket_id
              ? { ...entry, status: 'read_only', active_resources: [], blocked_resources: [], expires_at: null }
              : entry,
          ),
          successorTicket,
        ],
        claims: [
          ...ledger.claims.map((entry) =>
            entry.claim_id === claims[0]!.claim_id ? { ...entry, status: 'recovered' } : entry,
          ),
          successorClaim,
        ],
        rebinds: [
          ...ledger.rebinds,
          {
            schema: 'CoordinationScopeRebind/v1',
            rebind_id: 'rebind-' + randomUUID(),
            work_id: work.binding.lifecycle_work_id,
            previous_ticket_id: ticket.ticket_id,
            previous_source_revision: ticket.source_revision,
            ticket_id: ticketId,
            thread_id: input.nativeSessionHandle,
            source_revision: ticket.source_revision,
            resources: [...claims[0]!.resources],
            claimed_resources: [...claims[0]!.resources],
            retired_claim_ids: [claims[0]!.claim_id],
            reason: 'expired same-owner quiescent lease recovery',
            decided_by: input.nativeSessionHandle,
            decision_pointer: verified.authorityPointer,
            from_ledger_revision: ledger.revision,
            to_ledger_revision: ledger.revision + 1,
            created_at: timestampNow,
          },
        ],
      });
      validatePair(nextWork, nextLedger);
      // This dedicated transition explicitly rebinds only the freshly verified bundle digest.
      // All remaining lifecycle, authority, resource and history deltas use the ordinary validator.
      requireState(
        sameJson(nextWork.binding, {
          ...work.binding,
          runtime_code_digest: newRuntimeDigest,
          runtime_source_revision: newRuntimeDigest,
        }) &&
          sameJson(nextWork.lifecycle.config_binding, {
            ...work.lifecycle.config_binding,
            runtime_code_digest: newRuntimeDigest,
          }),
        'expired recovery may rebind only the verified bundle digest',
      );
      // Keep the actual preimage intact. Project only the separately validated bundle delta
      // out of the successor while checking every ordinary lifecycle/history transition.
      validateProgress(
        before,
        {
          ...nextWork,
          binding: work.binding,
          lifecycle: { ...nextWork.lifecycle, config_binding: work.lifecycle.config_binding },
        },
        nextLedger,
      );
      for (const [kind, id, value, expected] of [
        ['work', identityKey(input.identity), nextWork, before.workVersion!],
        ['ledger', 'shared', nextLedger, before.ledgerVersion!],
      ] as const) {
        const changed = this.#database
          .query(
            'UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
          )
          .run(
            value.revision,
            canonicalJson(value),
            canonicalJsonDigest(value),
            this.#workspaceId,
            kind,
            id,
            expected.revision,
            expected.digest,
          );
        requireState(changed.changes === 1, 'expired lease recovery host CAS conflict');
      }
      // Revision advances to reject stale renewal/issue callers; all requests, issue IDs and accepted observations remain byte-identical.
      const bumped = this.#database
        .query(
          'UPDATE agent_host_mastra_session_ledger SET revision=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
        )
        .run(row.revision + 1, this.#workspaceId, input.identity.work_id, input.attempt, row.revision, row.digest);
      requireState(bumped.changes === 1, 'expired lease recovery journal CAS conflict');
      this.#onReconciledWorkWrite(input.identity, before.workVersion, version(nextWork)!);
      return this.#read(input.identity);
    }).immediate();
  }

  /** Retire an interrupted Source owner without resolving its unknown provider effect. */
  retireInterruptedSourceOwner(input: InterruptedSourceRetirementRequest): InterruptedSourceRetirementResult {
    const request = snapshot(input);
    requireState(
      Object.keys(request).length === 12 &&
        Number.isSafeInteger(request.attempt) &&
        request.attempt > 0 &&
        Number.isSafeInteger(request.expectedMaintenanceGeneration) &&
        request.expectedMaintenanceGeneration >= 0,
      'interrupted Source retirement request invalid',
    );
    requireState(
      request.evidence?.schema === 'InterruptedSourceRetirementEvidence/v1' &&
        request.evidence.source_thread_status === 'interrupted' &&
        typeof request.evidence.read_thread_ref === 'string' &&
        request.evidence.read_thread_ref.trim().length > 0 &&
        typeof request.evidence.list_agents_ref === 'string' &&
        request.evidence.list_agents_ref.trim().length > 0 &&
        typeof request.evidence.source_thread_id === 'string' &&
        request.evidence.source_thread_id.trim().length > 0 &&
        request.evidence.source_thread_id.length <= 256 &&
        Array.isArray(request.evidence.active_source_writer_ids) &&
        request.evidence.active_source_writer_ids.length === 0,
      'interrupted Source retirement evidence is missing, running, or competing',
    );
    requireState(
      typeof request.operatorHandle === 'string' &&
        request.operatorHandle.trim().length > 0 &&
        request.operatorHandle === request.authorization.receipt.attempt.lease.thread_id &&
        typeof request.decisionPointer === 'string' &&
        request.decisionPointer.trim().length > 0,
      'interrupted Source retirement owner attribution is required',
    );
    const requestDigest = canonicalJsonDigest(request),
      operationId = 'interrupted-source-release-' + requestDigest;
    requireState(!this.#database.inTransaction, 'nested Source retirement forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      this.#assertMaintenanceGeneration(request.expectedMaintenanceGeneration);
      const before = this.#read(request.identity),
        work = before.work,
        ledger = before.ledger;
      requireState(
        work && ledger && identityKey(workIdentity(work)) === identityKey(request.identity),
        'retirement work unavailable',
      );
      const priorRelease = ledger.operations.find((entry) => entry.operation_id === operationId),
        target = ledger.tickets.find((entry) => entry.ticket_id === (work.lease?.ticket_id ?? priorRelease?.ticket_id)),
        activeClaims = ledger.claims.filter(
          (entry) => entry.ticket_id === target?.ticket_id && entry.status === 'active',
        );
      if (priorRelease) {
        requireState(
          priorRelease.kind === 'release' &&
            priorRelease.decided_by === request.operatorHandle &&
            priorRelease.decision_pointer === request.decisionPointer,
          'interrupted Source retirement retry differs',
        );
        requireState(
          work.execution.status === 'suspended' &&
            work.lease === null &&
            target?.status === 'released' &&
            work.execution.assignment_attempts.some(
              (attempt) =>
                attempt.attempt_id === request.authorization.receipt.attempt.attempt_id &&
                attempt.status === 'uncertain' &&
                attempt.result === null &&
                attempt.result_digest === null,
            ),
          'interrupted Source retirement retry no longer has its retained unknown outcome',
        );
        this.#assertNoOverlappingActiveSourceOwner(ledger, target!);
        const attempt = work.execution.assignment_attempts.find(
          (entry) => entry.attempt_id === request.authorization.receipt.attempt.attempt_id,
        )!;
        return {
          snapshot: before,
          attempt_receipt: snapshot({
            identity: request.identity,
            workVersion: before.workVersion!,
            attempt,
            maintenanceGeneration: before.maintenanceGeneration,
          }),
          operation_id: operationId,
          request_digest: requestDigest,
        };
      }
      requireState(
        work.lease &&
          request.authorization.receipt.identity &&
          identityKey(request.authorization.receipt.identity) === identityKey(request.identity) &&
          request.authorization.receipt.maintenanceGeneration === request.expectedMaintenanceGeneration &&
          request.authorization.receipt.attempt.status === 'started' &&
          request.authorization.receipt.attempt.result === null &&
          request.authorization.receipt.attempt.result_digest === null &&
          canonicalJsonDigest(request.authorization.receipt.attempt.lease) === canonicalJsonDigest(work.lease) &&
          target?.status === 'active' &&
          target.thread_id === request.operatorHandle &&
          target.generation === work.lease.generation &&
          target.ticket_id === work.lease.ticket_id &&
          target.exclusive_resources.some((resource) => resource.startsWith('file:')) &&
          target.active_resources.some((resource) => resource.startsWith('file:')) &&
          activeClaims.length === 1 &&
          target.claim_ids.includes(activeClaims[0]!.claim_id) &&
          activeClaims[0]!.thread_id === target.thread_id &&
          activeClaims[0]!.generation === target.generation &&
          canonicalJsonDigest(activeClaims[0]!.resources) === canonicalJsonDigest(target.active_resources),
        'interrupted Source retirement owner, lease, ticket, or claim differs',
      );
      matchesExpected(before.workVersion, request.expectedWork);
      matchesExpected(before.ledgerVersion, request.expectedLedger);
      this.#assertNoOverlappingActiveSourceOwner(ledger, target);
      requireState(
        !ledger.tickets.some(
          (entry) =>
            entry.status === 'queued' &&
            entry.sequence < target.sequence &&
            entry.exclusive_resources.some((resource) => target.exclusive_resources.includes(resource)),
        ),
        'earlier FIFO Source owner is waiting for the resource',
      );
      const journalRow = this.#database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, request.identity.work_id, request.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null;
      requireState(
        journalRow &&
          journalRow.revision === request.expectedJournal.revision &&
          journalRow.digest === request.expectedJournal.digest &&
          canonicalJsonDigest(JSON.parse(journalRow.payload)) === journalRow.digest,
        'interrupted Source retirement journal CAS changed',
      );
      const journal = JSON.parse(journalRow.payload) as MastraSessionLedgerState;
      requireState(
        journal.schema === 'MastraSessionLedger/v1' &&
          journal.attempt === request.attempt &&
          journal.work_id === request.identity.work_id &&
          journal.workspace_id === this.#workspaceId,
        'interrupted Source retirement journal identity differs',
      );
      const journalItems = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)],
        item = journalItems.find((entry) => entry.request.action_id === request.actionId);
      const reservation = item?.host_reservation,
        authorization = request.authorization,
        approval = authorization.approval;
      requireState(
        item &&
          item.issue_id === request.issueId &&
          item.observation === null &&
          reservation &&
          reservation.request.stageId === item.request.stage_id &&
          reservation.request.assignmentIndex === item.request.assignment_index &&
          reservation.receipt.attempt.attempt_id === authorization.receipt.attempt.attempt_id &&
          reservation.approvalAction === 'source.write' &&
          reservation.authorization?.approval?.status === 'commit_unknown' &&
          approval?.status === 'commit_unknown' &&
          approval.attempt_id === authorization.receipt.attempt.attempt_id &&
          approval.store_id === reservation.authorization.approval.store_id &&
          canonicalJsonDigest(reservation.authorization.approval) === canonicalJsonDigest(approval),
        'interrupted Source retirement issue or commit-unknown approval differs',
      );
      const storedApproval = this.#governanceRead(approval.store_id, 'approval', canonicalJsonDigest(approval.binding));
      requireState(
        storedApproval && canonicalJsonDigest(storedApproval.record) === canonicalJsonDigest(approval),
        'interrupted Source retirement approval fence changed',
      );
      const expectedAttempt = authorization.receipt.attempt,
        presentAttempt = work.execution.assignment_attempts.find(
          (entry) => entry.attempt_id === expectedAttempt.attempt_id,
        ),
        uncertainAttempt = { ...expectedAttempt, status: 'uncertain' as const, result: null, result_digest: null };
      requireState(
        presentAttempt &&
          (canonicalJsonDigest(presentAttempt) === canonicalJsonDigest(expectedAttempt) ||
            canonicalJsonDigest(presentAttempt) === canonicalJsonDigest(uncertainAttempt)),
        'interrupted Source retirement attempt changed',
      );
      const uncertain = this.#finishAttemptInTransaction(authorization.receipt, 'uncertain', null),
        staged = this.#read(request.identity),
        now = new Date().toISOString(),
        nextLedger: CoordinationLedger = {
          ...ledger,
          revision: ledger.revision + 1,
          tickets: ledger.tickets.map((entry) =>
            entry.ticket_id === target.ticket_id
              ? {
                  ...entry,
                  status: 'released' as const,
                  active_resources: [],
                  blocked_resources: [],
                  expires_at: null,
                }
              : entry,
          ),
          claims: ledger.claims.map((entry) =>
            entry.claim_id === activeClaims[0]!.claim_id
              ? { ...entry, status: 'released' as const, renewed_at: now }
              : entry,
          ),
          operations: [
            ...ledger.operations,
            {
              schema: 'CoordinationOperation/v1',
              operation_id: operationId,
              kind: 'release',
              ticket_id: target.ticket_id,
              work_id: target.work_id,
              thread_id: target.thread_id,
              source_revision: target.source_revision,
              resources: [...target.exclusive_resources],
              from_ledger_revision: ledger.revision,
              to_ledger_revision: ledger.revision + 1,
              decided_by: request.operatorHandle,
              decision_pointer: request.decisionPointer,
              created_at: now,
            },
          ],
        };
      const after = this.#commitHostState(
        {
          expectedWork: staged.workVersion,
          expectedLedger: before.ledgerVersion,
          expectedMaintenanceGeneration: before.maintenanceGeneration,
          expectedSessionJournal: { attempt: request.attempt, version: request.expectedJournal },
          nextWork: {
            ...staged.work!,
            revision: staged.work!.revision + 1,
            lifecycle: { ...staged.work!.lifecycle, revision: staged.work!.revision + 1 },
            lease: null,
            execution: { ...staged.work!.execution, status: 'suspended' },
          },
          nextLedger,
        },
        undefined,
        true,
      );
      const finalAttempt = after.work!.execution.assignment_attempts.find(
        (entry) => entry.attempt_id === uncertain.attempt.attempt_id,
      )!;
      return {
        snapshot: after,
        attempt_receipt: snapshot({
          identity: request.identity,
          workVersion: after.workVersion!,
          attempt: finalAttempt,
          maintenanceGeneration: after.maintenanceGeneration,
        }),
        operation_id: operationId,
        request_digest: requestDigest,
      };
    }).immediate();
  }

  #assertNoOverlappingActiveSourceOwner(ledger: CoordinationLedger, target: CoordinationTicket): void {
    const resources = target.exclusive_resources.filter((resource) => resource.startsWith('file:'));
    requireState(
      !ledger.tickets.some(
        (ticket) =>
          ticket.ticket_id !== target.ticket_id &&
          ['active', 'ready_for_handoff'].includes(ticket.status) &&
          ticket.active_resources.some((resource) => resources.includes(resource)),
      ),
      'another active Source owner overlaps the retired resource',
    );
  }

  /** Accept the exact completed Source observation and retire its file ownership in one SQL commit. */
  reconcileCompletedSourceOwnership(input: {
    readonly identity: WorkIdentity;
    readonly nativeSessionHandle: string;
    readonly verifyCurrent: () => void;
  }): HostStateSnapshot {
    const before = this.readHostStateSnapshot(input.identity),
      work = before.work;
    requireState(
      work?.lease?.thread_id === input.nativeSessionHandle,
      'terminal ownership reconciliation owner differs',
    );
    const ticket = before.ledger?.tickets.find((ticket) => ticket.ticket_id === work.lease!.ticket_id);
    if (!ticket?.exclusive_resources.some((resource) => resource.startsWith('file:'))) return before;
    const journal = this.readWorkSessionJournal(input.identity);
    if (!journal) return before;
    const state = journal.state as unknown as MastraSessionLedgerState;
    const item = [...state.items, ...state.completed.flatMap((wave) => wave.items)].find(
      (item) =>
        completedSourceJournalObservationMatches(work, item) &&
        sameJson(item.host_reservation?.receipt.attempt.lease, work.lease),
    );
    if (!item) return before;
    return this.commitCompletedSourceReport({
      identity: input.identity,
      attempt: journal.attempt,
      expectedJournal: journal.version,
      actionId: item.request.action_id,
      nextJournal: state,
      verifyCurrent: input.verifyCurrent,
    });
  }
  commitCompletedSourceReport(input: {
    readonly identity: WorkIdentity;
    readonly attempt: number;
    readonly expectedJournal: StateVersion;
    readonly actionId: string;
    readonly nextJournal: MastraSessionLedgerState;
    readonly verifyCurrent: () => void;
  }): HostStateSnapshot {
    const before = this.readHostStateSnapshot(input.identity),
      work = before.work,
      ledger = before.ledger;
    requireState(
      work && ledger && work.lease && work.execution.status === 'active',
      'completed writer work ownership unavailable',
    );
    const item = [...input.nextJournal.items, ...input.nextJournal.completed.flatMap((wave) => wave.items)].find(
      (item) => item.request.action_id === input.actionId,
    );
    const reservation = item?.host_reservation;
    validateWorkSessionBinding(work, input.nextJournal, this.#repositoryRoot);
    const completed = work.execution.assignment_attempts.find(
      (attempt) => attempt.attempt_id === reservation?.receipt.attempt.attempt_id,
    );
    requireState(
      item &&
        completedSourceJournalObservationMatches(work, item) &&
        reservation &&
        completed?.status === 'completed' &&
        completed.result_digest === canonicalJsonDigest(item.observation) &&
        sameJson(reservation.receipt.identity, input.identity) &&
        input.nextJournal.work_id === input.identity.work_id &&
        input.nextJournal.workspace_id === this.#workspaceId &&
        input.nextJournal.attempt === input.attempt,
      'completed writer report identity or host outcome differs',
    );
    const prior = ledger.tickets.find((ticket) => ticket.ticket_id === work.lease!.ticket_id);
    const durableJournal = this.readWorkSessionJournal(input.identity);
    const durableState = durableJournal?.state as unknown as MastraSessionLedgerState | undefined;
    const alreadyDurable =
      durableState &&
      [...durableState.items, ...durableState.completed.flatMap((wave) => wave.items)].some(
        (recorded) =>
          recorded.request.action_id === input.actionId && completedSourceJournalObservationMatches(work, recorded),
      );
    requireState(
      prior &&
        sameJson(completed.lease, work.lease) &&
        prior.status === 'active' &&
        prior.generation === ledger.open_generation &&
        prior.thread_id === work.lease.thread_id &&
        prior.generation === work.lease.generation &&
        prior.expires_at !== null &&
        (timestamp(prior.expires_at) > Date.now() || alreadyDurable) &&
        !work.execution.assignment_attempts.some((attempt) => ['started', 'uncertain'].includes(attempt.status)),
      'completed writer lease is stale or an effect remains uncertain',
    );
    requireState(
      prior.exclusive_resources.some((resource) => resource.startsWith('file:')),
      'completed writer file ownership already reconciled',
    );
    const releaseTickets = ledger.tickets.filter(
      (ticket) =>
        ticket.ticket_id === prior.ticket_id ||
        (identityKey(ticketIdentity(ticket)) === identityKey(input.identity) &&
          ticket.thread_id === prior.thread_id &&
          ticket.generation === prior.generation &&
          ticket.status === 'queued' &&
          ticket.claim_ids.length === 0 &&
          ticket.active_resources.length === 0),
    );
    const releaseIds = new Set(releaseTickets.map((ticket) => ticket.ticket_id));
    const now = new Date().toISOString(),
      expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const ticketId =
      'execution-ticket-' + canonicalJsonDigest({ prior: prior.ticket_id, action: input.actionId }).slice(0, 40);
    const claimId = 'execution-claim-' + canonicalJsonDigest({ ticketId }).slice(0, 40),
      resources = ['execution:' + input.identity.work_id];
    const ticket = {
      ...prior,
      ticket_id: ticketId,
      sequence: ledger.next_sequence,
      contour_keys: [...new Set([...prior.contour_keys.filter((key) => !key.startsWith('file:')), ...resources])],
      exclusive_resources: resources,
      active_resources: resources,
      blocked_resources: [],
      claim_ids: [claimId],
      expires_at: expiry,
      created_at: now,
    };
    const nextLedger: CoordinationLedger = {
      ...ledger,
      revision: ledger.revision + 1,
      next_sequence: ledger.next_sequence + 1,
      tickets: [
        ...ledger.tickets.map((ticket) =>
          releaseIds.has(ticket.ticket_id)
            ? { ...ticket, status: 'released' as const, active_resources: [], blocked_resources: [], expires_at: null }
            : ticket,
        ),
        ticket,
      ],
      claims: [
        ...ledger.claims.map((claim) =>
          releaseIds.has(claim.ticket_id) && claim.status === 'active'
            ? { ...claim, status: 'released' as const, renewed_at: now }
            : claim,
        ),
        {
          schema: 'WorkstreamClaim/v1',
          claim_id: claimId,
          ticket_id: ticketId,
          work_id: prior.work_id,
          thread_id: prior.thread_id,
          generation: prior.generation,
          resources,
          lease_expires_at: expiry,
          status: 'active',
          created_at: now,
          renewed_at: now,
        },
      ],
      operations: [
        ...ledger.operations,
        ...releaseTickets.map((ticket) => ({
          schema: 'CoordinationOperation/v1' as const,
          operation_id: 'source-terminal-release-' + ticketId + '-' + ticket.ticket_id,
          kind: 'release' as const,
          ticket_id: ticket.ticket_id,
          work_id: ticket.work_id,
          thread_id: ticket.thread_id,
          source_revision: ticket.source_revision,
          resources: [...ticket.exclusive_resources],
          from_ledger_revision: ledger.revision,
          to_ledger_revision: ledger.revision + 1,
          decided_by: prior.thread_id,
          decision_pointer: work.contracts.scope.path,
          created_at: now,
        })),
      ],
    };
    return this.#commitHostState(
      {
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        expectedSessionJournal: { attempt: input.attempt, version: input.expectedJournal },
        nextWork: {
          ...work,
          revision: work.revision + 1,
          lifecycle: { ...work.lifecycle, revision: work.revision + 1 },
          lease: { ticket_id: ticketId, thread_id: prior.thread_id, generation: prior.generation },
        },
        nextLedger,
      },
      { actionId: input.actionId, next: input.nextJournal, verifyCurrent: input.verifyCurrent },
    );
  }

  compareAndSwapHostState(input: {
    expectedWork: StateVersion | null;
    expectedLedger: StateVersion | null;
    expectedMaintenanceGeneration?: number;
    documentationContext?: DocumentationVerificationContext;
    nextWork: WorkState;
    nextLedger: CoordinationLedger;
    expectedSessionJournal?: { readonly attempt: number; readonly version: StateVersion };
  }): HostStateSnapshot {
    return this.#commitHostState(input);
  }
  /** The Host owns the new assurance journal; references in WorkState remain the lifecycle authority. */
  readFinalAssurance(identity: WorkIdentity, attempt: number): FinalAssuranceSnapshot | null {
    const work = this.#read(identity).work;
    if (
      !work ||
      !work.lifecycle.references.some((ref) => ref.kind === 'review_packet' && ref.disposition === 'current')
    )
      return null;
    const row = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_final_assurance WHERE workspace_id=? AND work_id=? AND attempt=? AND generation=?',
      )
      .get(this.#workspaceId, identity.work_id, attempt, work.lifecycle.assurance.review_generation) as {
      revision: number;
      payload: string;
      digest: string;
    } | null;
    if (!row) return null;
    const state = validateFinalAssuranceState(JSON.parse(row.payload));
    requireState(
      row.digest === canonicalJsonDigest(state) && Number.isSafeInteger(row.revision) && row.revision > 0,
      'final assurance row binding invalid',
    );
    this.#assertFinalAssuranceBinding(work, state, false);
    return snapshot({ version: { revision: row.revision, digest: row.digest }, state });
  }
  #assertFinalAssuranceBinding(work: WorkState, state: FinalAssuranceState, currentSource: boolean): void {
    const packet = state.packet;
    requireState(
      packet.work_id === work.binding.lifecycle_work_id &&
        packet.source_revision === work.binding.work_source_revision &&
        packet.scope_id === work.binding.scope_id &&
        packet.config_digest === work.binding.config_digest &&
        packet.generation === work.lifecycle.assurance.review_generation &&
        packet.implementation_fingerprint === work.lifecycle.seal?.implementation_fingerprint &&
        ['VERIFY', 'DELIVERY'].includes(work.lifecycle.phase),
      'final assurance has stale or foreign lifecycle binding',
    );
    const ref = work.lifecycle.references.find(
      (ref) => ref.kind === 'review_packet' && ref.disposition === 'current' && ref.record_id === packet.packet_id,
    );
    requireState(ref, 'current review packet reference missing');
    if (currentSource) {
      requireState(this.#repositoryRoot, 'current assurance requires repository binding');
      const access = requireSafeRepositoryAccess(this.#repositoryRoot);
      requireState(
        snapshotDeclaredSources(access, work.lifecycle.scope.allowed_paths).digest ===
          packet.implementation_fingerprint,
        'source changed; normal correction and new assurance required',
      );
      const bytes = access.readBytes(ref.path, 'current review packet');
      requireState(
        createHash('sha256').update(bytes).digest('hex') === ref.sha256 &&
          sameJson(JSON.parse(bytes.toString('utf8')), packet),
        'current review packet bytes changed',
      );
    }
  }
  compareAndSwapFinalAssurance(input: {
    identity: WorkIdentity;
    attempt: number;
    expected: StateVersion | null;
    expectedWork: StateVersion;
    expectedLedger: StateVersion;
    next: FinalAssuranceState;
  }): FinalAssuranceSnapshot {
    const state = validateFinalAssuranceState(input.next);
    requireState(state.packet.attempt === input.attempt, 'final assurance attempt differs');
    requireState(!this.#database.inTransaction, 'nested final assurance transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      const host = this.#read(input.identity);
      matchesExpected(host.workVersion, input.expectedWork);
      matchesExpected(host.ledgerVersion, input.expectedLedger);
      requireState(host.work?.lease && host.ledger, 'current final assurance lease missing');
      const ticket = host.ledger.tickets.find((ticket) => ticket.ticket_id === host.work!.lease!.ticket_id);
      requireState(ticket?.expires_at && timestamp(ticket.expires_at) > Date.now(), 'final assurance lease expired');
      this.#assertFinalAssuranceBinding(host.work, state, true);
      requireState(host.work.lifecycle.phase === 'VERIFY', 'final assurance cannot progress after delivery');
      const before = this.readFinalAssurance(input.identity, input.attempt);
      matchesExpected(before?.version ?? null, input.expected);
      validateFinalAssuranceProgress(before?.state ?? null, state);
      const revision = (before?.version.revision ?? 0) + 1,
        digest = canonicalJsonDigest(state);
      const saved = before
        ? this.#database
            .query(
              'UPDATE agent_host_final_assurance SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND generation=? AND revision=? AND digest=?',
            )
            .run(
              revision,
              canonicalJson(state),
              digest,
              this.#workspaceId,
              input.identity.work_id,
              input.attempt,
              state.packet.generation,
              before.version.revision,
              before.version.digest,
            )
        : this.#database
            .query('INSERT INTO agent_host_final_assurance VALUES(?,?,?,?,?,?,?)')
            .run(
              this.#workspaceId,
              input.identity.work_id,
              input.attempt,
              state.packet.generation,
              revision,
              canonicalJson(state),
              digest,
            );
      requireState(saved.changes === 1, 'final assurance journal CAS conflict');
      return snapshot({ version: { revision, digest }, state });
    }).immediate();
  }
  /** Validate the append and phase transition separately, publish both in one Host transaction. */
  commitFinalAssuranceDelivery(input: {
    identity: WorkIdentity;
    attempt: number;
    expected: StateVersion;
    expectedWork: StateVersion;
    expectedLedger: StateVersion;
    references: readonly LifecycleArtifactReference[];
    documentationContext: DocumentationVerificationContext;
  }): HostStateSnapshot {
    requireState(!this.#database.inTransaction, 'nested assurance delivery transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      const before = this.#read(input.identity),
        assurance = this.readFinalAssurance(input.identity, input.attempt);
      matchesExpected(before.workVersion, input.expectedWork);
      matchesExpected(before.ledgerVersion, input.expectedLedger);
      matchesExpected(assurance?.version ?? null, input.expected);
      requireState(
        before.work?.lease && before.ledger && assurance && finalAssuranceStatus(assurance.state) === 'reviewed',
        'three matching review/reverse pairs required',
      );
      const work = before.work,
        ledger = before.ledger;
      this.#assertFinalAssuranceBinding(work, assurance.state, true);
      const ticket = ledger.tickets.find((ticket) => ticket.ticket_id === work.lease!.ticket_id);
      requireState(ticket?.expires_at && timestamp(ticket.expires_at) > Date.now(), 'assurance delivery lease expired');
      requireState(this.#repositoryRoot, 'assurance delivery repository missing');
      const access = requireSafeRepositoryAccess(this.#repositoryRoot);
      const reports = assurance.state.actions;
      requireState(input.references.length === 8, 'six reports, CLEAR and delivery manifest required');
      for (const action of reports) {
        const report = action.observation!,
          ref = input.references.find((ref) => ref.record_id === action.action_id);
        requireState(
          ref &&
            ref.kind === (action.kind === 'review' ? 'review_receipt' : 'reverse_validation') &&
            ref.principal === report.agent_id &&
            ref.decision === 'pass',
          'review reference differs from issued report',
        );
        const bytes = access.readBytes(ref.path, 'assurance report');
        requireState(
          createHash('sha256').update(bytes).digest('hex') === ref.sha256 &&
            sameJson(JSON.parse(bytes.toString('utf8')), report),
          'report bytes differ from accepted observation',
        );
      }
      for (const ref of input.references)
        requireState(
          createHash('sha256').update(access.readBytes(ref.path, 'assurance evidence')).digest('hex') === ref.sha256,
          'assurance reference bytes changed',
        );
      const verified: WorkState = {
        ...work,
        revision: work.revision + 1,
        lifecycle: {
          ...work.lifecycle,
          revision: work.revision + 1,
          references: [...work.lifecycle.references, ...input.references],
        },
      };
      const verificationLedger = { ...ledger, revision: ledger.revision + 1 };
      validateProgress(
        before,
        this.#checkedWork(verified),
        checkedLedger(verificationLedger),
        input.documentationContext,
      );
      const delivered = transitionLifecycleState(
        verified,
        'DELIVERY',
        'Present the current manifest; wait for attributable current-version testing.',
        input.documentationContext,
      );
      const deliveryLedger = { ...verificationLedger, revision: verificationLedger.revision + 1 };
      validateProgress(
        {
          ...before,
          work: verified,
          ledger: verificationLedger,
          workVersion: version(verified),
          ledgerVersion: version(verificationLedger),
        },
        this.#checkedWork(delivered),
        checkedLedger(deliveryLedger),
        input.documentationContext,
      );
      this.#assertFinalAssuranceBinding(delivered, assurance.state, true);
      for (const [kind, id, value, expected] of [
        ['work', identityKey(input.identity), delivered, before.workVersion!],
        ['ledger', 'shared', deliveryLedger, before.ledgerVersion!],
      ] as const) {
        const changed = this.#database
          .query(
            'UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
          )
          .run(
            value.revision,
            canonicalJson(value),
            canonicalJsonDigest(value),
            this.#workspaceId,
            kind,
            id,
            expected.revision,
            expected.digest,
          );
        requireState(changed.changes === 1, 'atomic assurance delivery CAS conflict');
      }
      this.#onReconciledWorkWrite(input.identity, before.workVersion, version(delivered)!);
      return this.#read(input.identity);
    }).immediate();
  }
  #commitHostState(
    input: Parameters<HostStateStore['compareAndSwapHostState']>[0],
    terminalJournal?: {
      readonly actionId: string;
      readonly next: MastraSessionLedgerState;
      readonly verifyCurrent: () => void;
      readonly stoppedSource?: boolean;
    },
    internalTransaction = false,
  ): HostStateSnapshot {
    const { documentationContext, expectedSessionJournal, ...stateInput } = input;
    const data = snapshot(stateInput);
    requireState(
      Object.keys(data).length === (data.expectedMaintenanceGeneration === undefined ? 4 : 5),
      'host state transaction fields invalid',
    );
    const work = this.#checkedWork(data.nextWork),
      ledger = checkedLedger(data.nextLedger);
    requireState(
      work.workspace_id === this.#workspaceId && ledger.workspace_id === this.#workspaceId,
      'foreign workspace state',
    );
    validatePair(work, ledger);
    requireState(!this.#database.inTransaction || internalTransaction, 'nested host state transaction forbidden');
    const commit = () => {
      this.assertSessionProducerWriteAllowed();
      const before = this.#read(workIdentity(work));
      this.#assertMaintenanceGeneration(data.expectedMaintenanceGeneration);
      matchesExpected(before.workVersion, data.expectedWork);
      matchesExpected(before.ledgerVersion, data.expectedLedger);
      if (expectedSessionJournal) {
        const journal = this.#database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(this.#workspaceId, work.binding.lifecycle_work_id, expectedSessionJournal.attempt) as {
          revision: number;
          payload: string;
          digest: string;
        } | null;
        requireState(
          journal &&
            journal.revision === expectedSessionJournal.version.revision &&
            journal.digest === expectedSessionJournal.version.digest &&
            canonicalJsonDigest(JSON.parse(journal.payload)) === journal.digest,
          'session journal CAS changed',
        );
        if (terminalJournal) {
          const state = JSON.parse(journal.payload) as MastraSessionLedgerState;
          const oldItem = [...state.items, ...state.completed.flatMap((wave) => wave.items)].find(
            (item) => item.request.action_id === terminalJournal.actionId,
          );
          const nextItem = [
            ...terminalJournal.next.items,
            ...terminalJournal.next.completed.flatMap((wave) => wave.items),
          ].find((item) => item.request.action_id === terminalJournal.actionId);
          const completed = before.work?.execution.assignment_attempts.find(
            (attempt) => attempt.attempt_id === oldItem?.host_reservation?.receipt.attempt.attempt_id,
          );
          requireState(
            oldItem &&
              nextItem?.observation?.status ===
                (terminalJournal.stoppedSource ? 'reported_failed' : 'reported_complete') &&
              oldItem.host_reservation &&
              oldItem.issue_id === nextItem.observation.issue_id &&
              nextItem.observation.host_attempt_id === completed?.attempt_id &&
              completed?.status === 'completed' &&
              completed.result_digest === canonicalJsonDigest(nextItem.observation) &&
              sameJson(terminalJournal.next, {
                ...state,
                source_scope: terminalJournal.stoppedSource ? state.source_scope : terminalJournal.next.source_scope,
                items: state.items.map((item) =>
                  item.request.action_id === terminalJournal.actionId
                    ? { ...item, observation: nextItem.observation }
                    : item,
                ),
                completed: state.completed.map((wave) => ({
                  ...wave,
                  items: wave.items.map((item) =>
                    item.request.action_id === terminalJournal.actionId
                      ? { ...item, observation: nextItem.observation }
                      : item,
                  ),
                })),
              }),
            'terminal writer journal transition differs from completed host outcome',
          );
          terminalJournal.verifyCurrent();
        }
      }
      validateProgress(before, work, ledger, documentationContext);
      if (work.lease) {
        const ticket = ledger.tickets.find((entry) => entry.ticket_id === work.lease!.ticket_id)!;
        requireState(
          ticket.expires_at !== null && timestamp(ticket.expires_at) > Date.now(),
          'work lease expired before commit',
        );
      }
      for (const [kind, id, value, expected] of [
        ['work', identityKey(workIdentity(work)), work, before.workVersion],
        ['ledger', 'shared', ledger, before.ledgerVersion],
      ] as const) {
        const values = [
          value.revision,
          canonicalJson(value),
          canonicalJsonDigest(value),
          this.#workspaceId,
          kind,
          id,
        ] as const;
        const result =
          expected === null
            ? this.#database
                .query(
                  'INSERT INTO agent_host_state (revision, payload, digest, workspace_id, kind, id) VALUES (?, ?, ?, ?, ?, ?)',
                )
                .run(...values)
            : this.#database
                .query(
                  'UPDATE agent_host_state SET revision=?, payload=?, digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?',
                )
                .run(...values, expected.revision, expected.digest);
        requireState(result.changes === 1, 'state write did not change exactly one row');
      }
      this.#onReconciledWorkWrite(workIdentity(work), before.workVersion, version(work)!);
      if (terminalJournal && canonicalJsonDigest(terminalJournal.next) !== expectedSessionJournal?.version.digest) {
        requireState(expectedSessionJournal, 'terminal writer journal CAS is required');
        const changed = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expectedSessionJournal.version.revision + 1,
            canonicalJson(terminalJournal.next),
            canonicalJsonDigest(terminalJournal.next),
            this.#workspaceId,
            work.binding.lifecycle_work_id,
            expectedSessionJournal.attempt,
            expectedSessionJournal.version.revision,
            expectedSessionJournal.version.digest,
          );
        requireState(changed.changes === 1, 'terminal writer journal compare-and-swap conflict');
      }
      return this.#read(workIdentity(work));
    };
    return internalTransaction ? commit() : this.#transactionWithProducerFence(commit).immediate();
  }
}
