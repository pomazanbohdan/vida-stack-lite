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
  type LifecyclePhase,
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
import { compareScopedSourceSnapshots, snapshotDeclaredSources } from './orchestration/scoped-source-snapshot.js';
import { loadRuntimeConfig, runtimeConfigDigest, selectWorkflow, type WorkItemSelection } from './config/runtime-config.js';
import { loadProjectSetContext } from './config/project-context.js';
import { MastraSessionLedger } from './orchestration/persistent-session-handoff.js';
import {
  readSessionEngineSnapshot,
  readRetainedUnissuedSessionEngineSnapshot,
  readConfiguredContinuationSessionEngineSnapshot,
  assertUnpreparedSessionEngineAbsent,
  type SessionEngineBinding,
} from './orchestration/session-engine-snapshot.js';
import type { SessionBridgeObservation, SessionBridgeSnapshot, SessionBridgeRequest } from './orchestration/mastra-session-bridge.js';
import type { ScopedSourceSnapshot } from './orchestration/scoped-source-snapshot.js';
import {
  createTaskSourceBinding,
  parseTaskSourceGitObservation,
  resolveTaskSourceRoot,
  taskSourceGitArgv,
  validateTaskSourceBindingExchange,
  validateTaskSourceBinding,
  validateTaskSourceBindingRequest,
  type TaskSourceBindingReport,
  type TaskSourceBinding,
  type TaskSourceBindingRequest,
} from './orchestration/task-source-binding.js';
import type {
  TaskSourceMutationPolicyDecision,
  TaskSourceMutationPolicyRequest,
} from './orchestration/source-preflight-operations.js';
import type {
  DeliveredWorkContinuationAuthorization,
  DeliveredWorkContinuationRequest,
  DeliveredWorkContinuationVerifier,
} from './orchestration/delivered-work-continuation.js';
import { projectConfiguredPrewriterContinuationRequests } from './orchestration/delivered-work-continuation.js';
import {
  validateConfiguredFrontierReceiptStructure,
  validateConfiguredFrontierRepairReceipt,
  type ConfiguredFrontierReceipt,
} from './orchestration/delivered-work-continuation-repair.js';

const sessionProducerStore = 'vida-session-producers';
const recoveryReviewStore = 'vida-recovery-reviews';
const deliveredContinuationRepairStore = 'vida-delivered-continuation-repairs';
interface DeliveredContinuationRepairDigestOverlay {
  readonly work_id: string;
  readonly attempt: number;
  readonly action_id: string;
  readonly before_digest: string;
  readonly after_digest: string;
}
interface DeliveredContinuationRepairInspection {
  readonly schema: 'DeliveredWorkContinuationRepairInspection/v1';
  readonly workspace_id: string;
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly action_id: string;
  readonly row: { readonly payload: string; readonly before_digest: string; readonly after_digest: string };
  readonly work: WorkState;
  readonly work_version: StateVersion;
  readonly ledger: CoordinationLedger;
  readonly ledger_version: StateVersion;
  readonly journal: { readonly revision: number; readonly payload: string; readonly digest: string; readonly state: MastraSessionLedgerState };
  readonly maintenance_generation: number;
  readonly transition_digest: string;
}
interface DeliveredContinuationRepairPlan {
  readonly schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1';
  readonly branch: 'historical_terminal_review' | 'configured_frontier';
  readonly repair_id: string;
  readonly actor: string;
  readonly timestamp: string;
  readonly inspection: DeliveredContinuationRepairInspection;
  readonly digest: string;
}
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

export interface UnpreparedWorkRecoveryContext {
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly operatorHandle: string;
  readonly decisionPointer: string;
  readonly config: import('./config/runtime-config.js').AgentRuntimeConfig;
}
export interface UnpreparedWorkRecoveryRequest {
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly operatorHandle: string;
  readonly decisionPointer: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly originalWork: WorkState;
  readonly originalTicket: CoordinationTicket;
  readonly originalClaims: CoordinationLedger['claims'];
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
export interface RetiredSourceCaptureChange {
  readonly path: string;
  readonly event_ref: string;
  readonly kind: 'command' | 'patch' | 'file_change';
  readonly evidence_sha256: string;
  readonly patch_ref?: string;
}
export interface RetiredSourceCaptureTerminalEvidence {
  readonly schema: 'RetiredSourceTerminalEvidence/v1';
  readonly source_thread_id: string;
  readonly source_thread_status: string;
  readonly source_turn_id: string;
  readonly source_turn_status: 'interrupted';
  readonly operator_thread_id: string;
  readonly original_actor_id: string;
  readonly final_message_id: null;
  readonly action_id: string;
  readonly issue_id: string;
  readonly host_attempt_id: string;
  readonly active_source_writer_ids: readonly string[];
  readonly observed_commands: readonly {
    readonly ref: string;
    readonly status: 'completed' | 'failed';
    readonly exit_code: number;
    readonly command_sha256: string;
    readonly output_sha256: string | null;
    readonly output_present: boolean;
    readonly output_truncated: boolean;
  }[];
  readonly original_tool_records: readonly {
    readonly call_ref: string;
    readonly actor_id: string;
    readonly action_id: string;
    readonly issue_id: string;
    readonly host_attempt_id: string;
    readonly status: 'completed';
    readonly changed_paths: readonly string[];
  }[];
  readonly later_grants: readonly {
    readonly work_id: string;
    readonly ticket_id: string;
    readonly claim_id: string;
    readonly actor_id: string;
    readonly action_id: string;
    readonly issue_id: string;
    readonly host_attempt_id: string;
    readonly changed_paths: readonly string[];
    readonly evidence_ref: string;
  }[];
}
export interface RetiredSourceNativeReadResult {
  readonly schema: 'RetiredSourceNativeTurnEvidence/v1';
  readonly artifact_ref: string;
  readonly artifact_sha256: string;
  readonly thread_id: string;
  readonly thread_status: string;
  readonly turn_id: string;
  readonly turn_status: 'interrupted';
  readonly issue: {
    readonly action_id: string;
    readonly issue_id: string;
    readonly host_attempt_id: string;
    readonly packet_id: string;
    readonly packet_digest: string;
    readonly work_item_id: string;
    readonly attempt: number;
    readonly stage_id: string;
    readonly scope_digest: string;
  };
  readonly command_refs: readonly string[];
  readonly file_change_refs: readonly string[];
  readonly source_effects: readonly RetiredSourceCaptureChange[];
}
export interface RetiredSourceCaptureRequest {
  readonly schema: 'RetiredSourceCapture/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly retirementOperationId: string;
  readonly retirementClaimId: string;
  readonly operatorHandle: string;
  readonly nativeTurnEvidenceRef: string;
  readonly nativeReadResult: RetiredSourceNativeReadResult;
  readonly observation: MastraSessionLedgerState['items'][number]['observation'];
  readonly terminalEvidence: RetiredSourceCaptureTerminalEvidence;
  readonly candidateSnapshot: {
    readonly schema: 'UnverifiedSourceSnapshot/v1';
    readonly entries: readonly { readonly path: string; readonly sha256: string; readonly size: number }[];
  };
  readonly attributions: readonly RetiredSourceCaptureChange[];
  readonly verifyCurrent: () => void;
  readonly fault?: () => void;
}
export interface RetiredSourceCaptureResult {
  readonly snapshot: HostStateSnapshot;
  readonly request_digest: string;
}
export interface HistoricalTerminalSynthesisProvenance {
  readonly schema: 'HistoricalTerminalSynthesisProvenance/v1';
  readonly body_ref: string;
  readonly input_ref: string;
  readonly report_ref: string;
  readonly followup_ref: string;
  readonly original_actor_id: string;
  readonly denial_status: 'blocked';
  readonly denial_code: string;
  readonly denial_message: string;
  readonly denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001';
  readonly input_bytes_base64: string;
  readonly report_bytes_base64: string;
  readonly predecessor_refs: readonly { readonly result_id: string; readonly digest: string }[];
}
export interface HistoricalTerminalSynthesisCaptureRequest {
  readonly schema: 'HistoricalTerminalSynthesisCapture/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
  readonly nativeSessionHandle: string;
  readonly userRequestPointer: string;
  readonly requestIntent: 'next_work' | 'linked_correction';
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly documentationContext: DocumentationVerificationContext;
  readonly nextWork?: WorkState;
  readonly nextLedger?: CoordinationLedger;
  readonly bodyBytes: Uint8Array;
  readonly provenance: HistoricalTerminalSynthesisProvenance;
}
export interface HistoricalTerminalSynthesisCaptureReceipt {
  readonly schema: 'HistoricalTerminalSynthesisCustodyReceipt/v1';
  readonly request_digest: string;
  readonly request: Readonly<Record<string, unknown>>;
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly action_id: string;
  readonly issue_id: string;
  readonly terminal_status: 'known_terminal_unaccepted';
  readonly task_status: 'unfinished';
  readonly body_base64: string;
  readonly body_sha256: string;
  readonly body_byte_length: number;
  readonly provenance: HistoricalTerminalSynthesisProvenance;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly journal_version: StateVersion;
  readonly rights_granted: false;
  readonly accepted_result: false;
  readonly runtime_acceptance: false;
}
export interface HistoricalTerminalSynthesisCaptureResult {
  readonly snapshot: HostStateSnapshot;
  readonly request_digest: string;
  readonly receipt: HistoricalTerminalSynthesisCaptureReceipt;
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
/** Host-local source permission bound to the exact Host-created pending request. */
export interface CanonicalHostSourceWriteApproval {
  readonly schema: 'CanonicalHostSourceWriteApproval/v1';
  readonly principal: string;
  readonly request: WorkflowAttemptApprovalRequest;
  readonly receipt: EdictumWorkflowApprovalReceipt;
}

/** Keep local human permission distinct from the configured Edictum policy evaluation. */
export function canonicalHostSourceWriteApproval(
  requestCandidate: WorkflowAttemptApprovalRequest,
  principalCandidate: string,
  receiptCandidate: EdictumWorkflowApprovalReceipt,
): CanonicalHostSourceWriteApproval {
  const request = snapshot(requestCandidate),
    principal = principalCandidate,
    receipt = snapshot(receiptCandidate),
    requestKeys = [
      'schema',
      'store_id',
      'action',
      'identity',
      'config_digest',
      'workflow_id',
      'stage_id',
      'assignment_id',
      'assignment_index',
      'request_digest',
      'attempt_id',
      'lease',
      'operation_hash',
    ],
    receiptKeys = [
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
  requireState(
    Object.keys(request).length === requestKeys.length && requestKeys.every((key) => Object.hasOwn(request, key)) &&
      request.schema === 'WorkflowAttemptApprovalRequest/v1' &&
      request.action === 'source.write' &&
      typeof request.store_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(request.store_id) &&
      request.identity !== null && typeof request.identity === 'object' &&
      typeof request.config_digest === 'string' && hashPattern.test(request.config_digest) &&
      typeof request.workflow_id === 'string' && request.workflow_id.length > 0 &&
      typeof request.stage_id === 'string' && request.stage_id.length > 0 &&
      typeof request.assignment_id === 'string' && hashPattern.test(request.assignment_id) &&
      Number.isSafeInteger(request.assignment_index) && request.assignment_index >= 0 &&
      typeof request.request_digest === 'string' && hashPattern.test(request.request_digest) &&
      typeof request.attempt_id === 'string' && hashPattern.test(request.attempt_id) &&
      typeof request.operation_hash === 'string' && hashPattern.test(request.operation_hash) &&
      typeof principal === 'string' && principal.trim().length > 0 && principal.length <= 256 && !/\p{Cc}/u.test(principal),
    'canonical Host source-write request or principal invalid',
  );
  requireState(
    Object.keys(receipt).length === receiptKeys.length && receiptKeys.every((key) => Object.hasOwn(receipt, key)) &&
      receipt.schema === 'EdictumWorkflowApproval/v1' &&
      receipt.stage_id === request.stage_id &&
      receipt.approver === principal &&
      receipt.operation_hash === request.operation_hash &&
      receipt.tenant === request.identity.repository_id &&
      request.identity.project_ids.includes(receipt.project) &&
      timestamp(receipt.approved_at) <= Date.now() &&
      timestamp(receipt.expires_at) > Date.now() &&
      receipt.evidence_digest === computeEdictumWorkflowApprovalEvidenceDigest({
        schema: receipt.schema,
        stage_id: receipt.stage_id,
        approval_id: receipt.approval_id,
        approver: receipt.approver,
        operation_hash: receipt.operation_hash,
        tenant: receipt.tenant,
        project: receipt.project,
        approved_at: receipt.approved_at,
        expires_at: receipt.expires_at,
      }),
    'canonical Host source-write receipt differs from its pending request',
  );
  return snapshot({
    schema: 'CanonicalHostSourceWriteApproval/v1' as const,
    principal,
    request,
    receipt,
  });
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
export interface DeliveredWorkContinuationReceipt {
  readonly schema: 'DeliveredWorkContinuationReceipt/v1';
  readonly continuation_id: string;
  readonly attempt: number;
  readonly request_digest: string;
  readonly authorization: DeliveredWorkContinuationAuthorization;
  readonly request: DeliveredWorkContinuationRequest;
  readonly prior_work: WorkState;
  readonly prior_ledger: CoordinationLedger;
  readonly prior_journal: MastraSessionLedgerState;
  readonly prior_work_version: StateVersion;
  readonly prior_ledger_version: StateVersion;
  readonly prior_journal_version: StateVersion;
  readonly historical_capture: HistoricalTerminalSynthesisCaptureReceipt | null;
  readonly frontier_snapshot?: { readonly snapshot_bytes_base64: string; readonly snapshot_sha256: string };
  readonly successor_work: WorkState;
  readonly successor_ledger: CoordinationLedger;
  readonly successor_binding: WorkState['binding'];
  readonly successor_journal: MastraSessionLedgerState;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly journal_version: StateVersion;
  readonly rights_granted: false;
  readonly accepted_result: false;
  readonly runtime_acceptance: false;
  readonly status: 'action_ready';
}
export interface DeliveredWorkContinuationResult {
  readonly status: 'continued' | 'already_continued';
  readonly snapshot: HostStateSnapshot;
  readonly receipt: DeliveredWorkContinuationReceipt;
  /** Present only on the first successful CAS; retries never reissue this action. */
  readonly action: DeliveredWorkContinuationRequest['action'] | null;
}
export interface DeliveredWorkContinuationLookup {
  readonly receipt: DeliveredWorkContinuationReceipt;
  readonly snapshot: HostStateSnapshot;
  readonly journal: {
    readonly version: StateVersion;
    readonly state: MastraSessionLedgerState;
  };
  readonly item: MastraSessionLedgerState['items'][number];
  readonly items: MastraSessionLedgerState['items'];
  readonly item_statuses: readonly ('unissued' | 'issued' | 'reported')[];
  readonly action_status: 'unissued' | 'issued' | 'reported';
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

export interface TaskSourceMutationPolicyVerifier {
  verify(input: {
    readonly repositoryRoot: string;
    readonly request: TaskSourceMutationPolicyRequest;
    readonly operation: Readonly<Record<string, unknown>>;
    readonly stateVersion: StateVersion;
    readonly hostSnapshot: HostStateSnapshot;
  }): Promise<TaskSourceMutationPolicyDecision>;
}

/** Host-created policy input for the one permitted TaskSource create effect. */
export function createTaskSourceMutationPolicyRequest(input: {
  readonly repositoryRoot: string;
  readonly operation: Readonly<Record<string, unknown>>;
  readonly preparedStateVersion: StateVersion;
  readonly hostSnapshot: HostStateSnapshot;
}): TaskSourceMutationPolicyRequest {
  const { repositoryRoot, operation, preparedStateVersion, hostSnapshot } = input;
  requireState(
    path.isAbsolute(repositoryRoot) && path.resolve(repositoryRoot) === repositoryRoot &&
      operation.schema === 'TaskSourceBindingOperation/v1' && operation.status === 'prepared' &&
      operation.request !== null && typeof operation.request === 'object' && !Array.isArray(operation.request),
    'task source mutation policy requires a canonical Host root and prepared operation',
  );
  const request = validateTaskSourceBindingRequest(operation.request),
    work = hostSnapshot.work,
    lease = work?.lease,
    stateVersion = operation.revision === preparedStateVersion.revision &&
      typeof preparedStateVersion.digest === 'string' && hashPattern.test(preparedStateVersion.digest)
      ? preparedStateVersion
      : null;
  const reservationTicket = work && hostSnapshot.ledger && request.operation !== 'inspect'
    ? hostSnapshot.ledger.tickets.find((ticket) => ticket.ticket_id === taskSourceTicketId(request)) ?? null
    : null;
  let reservationMatches = false;
  if (work && hostSnapshot.ledger && reservationTicket) {
    const prior = taskSourcePriorTicket(hostSnapshot.ledger, work, request);
    if (prior) {
      const reservation = taskSourceReservationResources(repositoryRoot, request, work, prior);
      taskSourceTicketMatches(hostSnapshot.ledger, work, request, reservation.resources);
      reservationMatches = taskSourceExpectedWorkMatches(
        work,
        hostSnapshot.ledger,
        request,
        reservation.resources,
        reservation.added,
        reservationTicket,
      );
    }
  }
  const expectedWorkMatches = hostSnapshot.workVersion?.revision === request.expected_host.work.revision &&
    hostSnapshot.workVersion.digest === request.expected_host.work.digest || reservationMatches;
  const expectedLedgerMatches = hostSnapshot.ledgerVersion?.revision === request.expected_host.ledger.revision &&
    hostSnapshot.ledgerVersion.digest === request.expected_host.ledger.digest || reservationMatches;
  requireState(
    stateVersion !== null && request.operation === 'propose-create' && request.canonical_host_root === repositoryRoot &&
      work !== null && work !== undefined && lease !== null && lease !== undefined &&
      hostSnapshot.workVersion !== null && hostSnapshot.workVersion !== undefined &&
      hostSnapshot.ledgerVersion !== null && hostSnapshot.ledgerVersion !== undefined &&
      expectedWorkMatches && expectedLedgerMatches &&
      hostSnapshot.maintenanceGeneration === request.expected_host.maintenance_generation &&
      work.execution.status === 'active' && lease.thread_id === request.thread_id &&
      work.binding.lifecycle_work_id === request.work_id &&
      work.binding.config_digest === request.config_digest &&
      request.source_root !== undefined && resolveTaskSourceRoot(repositoryRoot, request.source_root) !== repositoryRoot &&
      request.branch_ref !== undefined,
    'task source mutation request is stale, same-root, or not a create proposal',
  );
  const sourceRoot = resolveTaskSourceRoot(repositoryRoot, request.source_root),
    branchName = request.branch_ref.slice('refs/heads/'.length),
    unsigned = {
      schema: 'TaskSourceMutationPolicyRequest/v1' as const,
      action: 'source.write' as const,
      operation_id: request.operation_id,
      request_id: request.request_id,
      work_id: request.work_id,
      thread_id: request.thread_id,
      scope_digest: work.binding.work_source_revision,
      config_digest: work.binding.config_digest,
      lease,
      branch_ref: request.branch_ref,
      source_root: sourceRoot,
      proposed_argv: Object.freeze(['git', '-C', repositoryRoot, 'worktree', 'add', '--branch', branchName, sourceRoot]),
      prepared_record_cas: Object.freeze({
        operation_id: request.operation_id,
        state_version: Object.freeze({ revision: stateVersion.revision, digest: stateVersion.digest }),
      }),
    };
  return Object.freeze({ ...unsigned, operation_hash: canonicalJsonDigest(unsigned) });
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
function taskSourceReservationResources(
  repositoryRoot: string,
  request: TaskSourceBindingRequest,
  work: WorkState,
  prior: CoordinationTicket,
): { readonly sourceRoot: string; readonly added: readonly string[]; readonly resources: readonly string[] } {
  requireState(
    request.operation !== 'inspect' && request.source_root !== undefined && request.branch_ref !== undefined,
    'TaskSource resource reservation requires an explicit branch and Source root',
  );
  const sourceRoot = resolveTaskSourceRoot(repositoryRoot, request.source_root),
    rootKey = process.platform === 'win32' ? sourceRoot.toLocaleLowerCase('en-US') : sourceRoot,
    added = [`branch:${request.branch_ref}`, `worktree:${rootKey}`].sort(),
    logical = work.binding.implementation_paths.map((relative) => `file:${relative}`),
    retained = prior.exclusive_resources.filter(
      (resource) => !resource.startsWith('file:') && !added.includes(resource),
    ),
    resources = [...new Set([...logical, ...retained, ...added])].sort();
  requireState(
    logical.every((resource) => work.binding.allowed_resources.includes(resource)) &&
      retained.every((resource) => work.binding.allowed_resources.includes(resource)),
    'TaskSource request exceeds the current Work resource scope',
  );
  return { sourceRoot, added, resources };
}
function taskSourceTicketId(request: TaskSourceBindingRequest): string {
  return `task-source-ticket:${request.work_id}:${request.attempt}:${request.operation_id}`;
}
function taskSourceClaimId(request: TaskSourceBindingRequest): string {
  return `task-source-claim:${request.work_id}:${request.attempt}:${request.operation_id}`;
}
type TaskSourceOperationRow = {
  readonly operation_id: string;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
  readonly request_id: string;
  readonly request_digest: string;
};
type TaskSourceActionRow = {
  readonly operation_id: string;
  readonly request_id: string;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
};
function validateTaskSourceJournalScope(candidate: unknown): ScopedSourceSnapshot {
  requireState(
    candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate) &&
      Object.keys(candidate).sort().join(',') === 'digest,entries,schema',
    'task source journal scope shape is invalid',
  );
  const scope = candidate as unknown as ScopedSourceSnapshot;
  requireState(
    scope.schema === 'ScopedSourceSnapshot/v1' && Array.isArray(scope.entries) &&
      scope.entries.length > 0 && scope.entries.length <= 512 &&
      scope.entries.every((entry, index) => {
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry) ||
            Object.keys(entry).sort().join(',') !== 'bytes,exists,path,sha256') return false;
        const prior = scope.entries[index - 1];
        return typeof entry.path === 'string' && entry.path.length > 0 && entry.path.length <= 512 &&
          !entry.path.includes('\\') && !entry.path.startsWith('/') && !entry.path.endsWith('/') &&
          !/^[A-Za-z]:/.test(entry.path) && !/[\u0000-\u001f\u007f]/.test(entry.path) &&
          entry.path.split('/').every((part: string) => part.length > 0 && part !== '.' && part !== '..') &&
          (prior === undefined || prior.path < entry.path) &&
          (entry.exists
            ? typeof entry.exists === 'boolean' && Number.isSafeInteger(entry.bytes) && entry.bytes! >= 0 &&
              typeof entry.sha256 === 'string' && hashPattern.test(entry.sha256)
            : entry.exists === false && entry.bytes === null && entry.sha256 === null);
      }),
    'task source journal scope entries are invalid',
  );
  compareScopedSourceSnapshots(scope, scope);
  return scope;
}
function assertTaskSourceJournalScopeWithinWork(scope: ScopedSourceSnapshot, work: WorkState): void {
  const allowedPaths = [...new Set([
    ...work.lifecycle.scope.allowed_paths,
    ...work.lifecycle.scope.implementation_paths,
  ])];
  requireState(scope.entries.every((entry) =>
    allowedPaths.some((allowed) => entry.path === allowed || entry.path.startsWith(allowed.replace(/\/$/, '') + '/')),
  ), 'task source current journal scope exceeds the active Work scope');
}
function validateTaskSourceActionPair(
  operationRow: TaskSourceOperationRow,
  actionRow: TaskSourceActionRow,
  expectedRequest?: TaskSourceBindingRequest,
): { readonly operation: Readonly<Record<string, unknown>>; readonly request: TaskSourceBindingRequest; readonly action: Readonly<Record<string, unknown>> } {
  const operation = JSON.parse(operationRow.payload) as Record<string, unknown>;
  requireState(
    Object.keys(operation).sort().join(',') ===
      'authority,created_at,operation_id,request,request_digest,request_id,revision,schema,status' &&
      operation.schema === 'TaskSourceBindingOperation/v1' && operation.status === 'prepared' &&
      typeof operation.created_at === 'string' && Number.isFinite(Date.parse(operation.created_at)) &&
      operation.operation_id === operationRow.operation_id && operation.revision === operationRow.revision &&
      operation.request_id === operationRow.request_id && operation.request_digest === operationRow.request_digest &&
      canonicalJsonDigest(operation) === operationRow.digest,
    'task source action preparation integrity differs',
  );
  const request = validateTaskSourceBindingRequest(operation.request);
  requireState(
    request.operation_id === operationRow.operation_id && request.request_id === operationRow.request_id &&
      canonicalJsonDigest(request) === operationRow.request_digest && sameJson(operation.request, request) &&
      (expectedRequest === undefined || sameJson(request, validateTaskSourceBindingRequest(expectedRequest))),
    'task source action request identity or digest differs from its preparation row',
  );
  const action = JSON.parse(actionRow.payload) as Record<string, unknown>;
  requireState(
    Object.keys(action).sort().join(',') ===
      'command_argv,created_at,issue_id,operation_digest,operation_id,policy_decision,prepared_state_version,recovery_report,recovery_report_digest,report,report_digest,request_id,revision,schema,status,updated_at' &&
      action.schema === 'TaskSourceBindingAction/v1' && action.operation_id === operationRow.operation_id &&
      actionRow.operation_id === operationRow.operation_id && action.request_id === operationRow.request_id &&
      actionRow.request_id === operationRow.request_id && action.revision === actionRow.revision &&
      canonicalJsonDigest(action) === actionRow.digest && action.operation_digest === operationRow.digest &&
      sameJson(action.prepared_state_version, { revision: operationRow.revision, digest: operationRow.digest }) &&
      typeof action.issue_id === 'string' && action.issue_id.length > 0 &&
      typeof action.created_at === 'string' && Number.isFinite(Date.parse(action.created_at)) &&
      (action.updated_at === null || (typeof action.updated_at === 'string' && Number.isFinite(Date.parse(action.updated_at)))) &&
      ['issued', 'reported', 'unknown'].includes(String(action.status)),
    'task source action/preparation row binding differs',
  );
  const checkedReport = (candidate: unknown, digest: unknown) => {
    if (candidate === null) {
      requireState(digest === null, 'task source action has a digest without its report');
      return null;
    }
    const report = validateTaskSourceBindingExchange(request, candidate);
    requireState(digest === canonicalJsonDigest(report), 'task source action report integrity differs');
    return report;
  };
  const report = checkedReport(action.report, action.report_digest),
    recoveryReport = checkedReport(action.recovery_report, action.recovery_report_digest);
  requireState(
    action.status === 'issued'
      ? report === null && recoveryReport === null && action.updated_at === null
      : action.status === 'unknown'
        ? report !== null && report.status !== 'observed' && recoveryReport === null
        : recoveryReport !== null
          ? report?.status === 'unknown' && recoveryReport.status === 'observed'
          : report?.status === 'observed',
    'task source action status differs from its retained report pair',
  );
  return { operation, request, action };
}
function taskSourcePriorTicket(
  ledger: CoordinationLedger,
  work: WorkState,
  request: TaskSourceBindingRequest,
): CoordinationTicket | null {
  const ownId = taskSourceTicketId(request);
  if (work.lease?.ticket_id !== ownId) {
    return ledger.tickets.find((ticket) => ticket.ticket_id === work.lease?.ticket_id) ?? null;
  }
  const own = ledger.tickets.find((ticket) => ticket.ticket_id === ownId);
  if (!own) return null;
  const prior = ledger.tickets
    .filter(
      (ticket) =>
        ticket.ticket_id !== ownId &&
        ticket.status === 'released' &&
        identityKey(ticketIdentity(ticket)) === identityKey(workIdentity(work)) &&
        ticket.thread_id === request.thread_id &&
        ticket.source_revision === work.binding.work_source_revision &&
        ticket.generation === own.generation &&
        ticket.sequence < own.sequence,
    )
    .sort((left, right) => right.sequence - left.sequence);
  return prior[0] ?? null;
}
function taskSourceTicketMatches(
  ledger: CoordinationLedger,
  work: WorkState,
  request: TaskSourceBindingRequest,
  resources: readonly string[],
): CoordinationTicket | null {
  const ticket = ledger.tickets.find((entry) => entry.ticket_id === taskSourceTicketId(request));
  if (!ticket) return null;
  requireState(
    identityKey(ticketIdentity(ticket)) === identityKey(workIdentity(work)) &&
      ticket.thread_id === request.thread_id &&
      ticket.source_revision === work.binding.work_source_revision &&
      ticket.generation === ledger.open_generation &&
      sameJson(ticket.exclusive_resources, resources) &&
      resources.every((resource) => ticket.contour_keys.includes(resource)),
    'TaskSource coordination ticket differs from its exact request',
  );
  if (ticket.status === 'queued')
    requireState(
      ticket.claim_ids.length === 0 && ticket.active_resources.length === 0 && ticket.expires_at === null &&
        sameJson(ticket.blocked_resources, resources) &&
        !ledger.claims.some((claim) => claim.ticket_id === ticket.ticket_id && claim.status === 'active'),
      'queued TaskSource ticket has active or incomplete ownership',
    );
  else if (ticket.status === 'active') {
    const claims = ledger.claims.filter((claim) => claim.ticket_id === ticket.ticket_id && claim.status === 'active');
    requireState(
      work.lease?.ticket_id === ticket.ticket_id && work.lease.thread_id === ticket.thread_id &&
        work.lease.generation === ticket.generation && ticket.blocked_resources.length === 0 &&
        sameJson(ticket.active_resources, resources) && claims.length === 1 &&
        ticket.claim_ids.includes(claims[0]!.claim_id) &&
        claims[0]!.work_id === ticket.work_id && claims[0]!.thread_id === ticket.thread_id &&
        claims[0]!.generation === ticket.generation && sameJson(claims[0]!.resources, resources) &&
        ticket.expires_at !== null && claims[0]!.lease_expires_at === ticket.expires_at &&
        timestamp(claims[0]!.lease_expires_at) > Date.now(),
      'active TaskSource ticket or claim is stale',
    );
  } else requireState(false, 'TaskSource ticket is terminal or not ready for issue');
  return ticket;
}
function taskSourceExpectedWorkMatches(
  work: WorkState,
  ledger: CoordinationLedger,
  request: TaskSourceBindingRequest,
  resources: readonly string[],
  addedResources: readonly string[],
  ticket: CoordinationTicket,
): boolean {
  const expected = request.expected_host.work;
  if (work.revision === expected.revision && canonicalJsonDigest(work) === expected.digest) return true;
  const revisionDelta = work.revision - expected.revision;
  if (ticket.status === 'queued' ? revisionDelta !== 1 : revisionDelta < 1 || revisionDelta > 2) return false;
  const prior = taskSourcePriorTicket(ledger, work, request);
  if (!prior) return false;
  const expectedLease = ticket.status === 'queued'
    ? work.lease
    : { ticket_id: prior.ticket_id, thread_id: prior.thread_id, generation: prior.generation };
  if (!expectedLease) return false;
  const subsets = [
    [],
    ...addedResources.map((resource) => [resource]),
    [...addedResources],
  ];
  const uniqueSubsets = new Map(subsets.map((subset) => [canonicalJsonDigest(subset), subset]));
  for (const removed of uniqueSubsets.values()) {
    if (!removed.every((resource) => work.binding.allowed_resources.includes(resource))) continue;
    const baseline = {
      ...work,
      revision: expected.revision,
      binding: {
        ...work.binding,
        allowed_resources: work.binding.allowed_resources.filter((resource) => !removed.includes(resource)),
      },
      lease: expectedLease,
      lifecycle: { ...work.lifecycle, revision: work.lifecycle.revision - revisionDelta },
    };
    if (baseline.lifecycle.revision > 0 && canonicalJsonDigest(baseline) === expected.digest) return true;
  }
  return false;
}
function taskSourceReservationForRequest(
  repositoryRoot: string,
  host: HostStateSnapshot,
  request: TaskSourceBindingRequest,
): {
  readonly prior: CoordinationTicket;
  readonly ticket: CoordinationTicket;
  readonly resources: ReturnType<typeof taskSourceReservationResources>;
} | null {
  if (request.operation === 'inspect' || !host.work || !host.ledger) return null;
  const prior = taskSourcePriorTicket(host.ledger, host.work, request);
  if (!prior) return null;
  const resources = taskSourceReservationResources(repositoryRoot, request, host.work, prior),
    ticket = taskSourceTicketMatches(host.ledger, host.work, request, resources.resources);
  if (!ticket || !taskSourceExpectedWorkMatches(
    host.work,
    host.ledger,
    request,
    resources.resources,
    resources.added,
    ticket,
  )) return null;
  return { prior, ticket, resources };
}
function validateReferences(refs: readonly ContractReference[]): void {
  for (const ref of refs) requireState(safeWorkflowOwnedPath(ref.path), 'artifact reference path is unsafe');
  unique(
    refs.map((ref) => ref.path.toLowerCase()),
    'artifact paths',
  );
}
interface ContinuationAdmissionHistory {
  readonly references: readonly LifecycleArtifactReference[];
  readonly artifacts: readonly WorkArtifactReference[];
}

function checkedWork(
  value: unknown,
  historicalBindings: ReadonlyMap<string, WorkState['binding']> = new Map(),
  admissionHistory: ContinuationAdmissionHistory = { references: [], artifacts: [] },
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
  validateLifecycleAggregate(work, admissionHistory.references);
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
      (ref.source_revision === binding.work_source_revision || admissionHistory.artifacts.some(original => sameJson(original, ref))) &&
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
  pendingReceipt?: RuntimeCodeRebindReceipt | DeliveredWorkContinuationReceipt,
  continuationRepairOverlay?: DeliveredContinuationRepairDigestOverlay,
  observeAdmissionHistory?: (history: ContinuationAdmissionHistory) => void,
): WorkState {
  const candidate = value as WorkState,
    bindings = new Map<string, WorkState['binding']>(),
    admissionReferences: LifecycleArtifactReference[] = [],
    admissionArtifacts: WorkArtifactReference[] = [],
    continuationRepairOverlayUsed = { value: false },
    records: ({ readonly kind: 'runtime'; readonly receipt: RuntimeCodeRebindReceipt } | {
      readonly kind: 'continuation';
      readonly receipt: DeliveredWorkContinuationReceipt;
    })[] = [];
  const table = database
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_runtime_code_rebind'")
    .get();
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
        records.push({ kind: 'runtime', receipt });
      }
    }
  }
  const continuationTable = database
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_delivered_work_continuation'")
    .get();
  if (continuationTable) {
    const rows = database
      .query('SELECT payload,digest,action_id,attempt FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=?')
      .all(workspaceId, candidate.binding?.lifecycle_work_id) as {
      payload: string;
      digest: string;
      action_id: string;
      attempt: number;
    }[];
    for (const row of rows) {
      const receipt = JSON.parse(row.payload) as DeliveredWorkContinuationReceipt;
      const repairOverlayMatches =
        continuationRepairOverlay?.work_id === candidate.binding?.lifecycle_work_id &&
        continuationRepairOverlay.attempt === row.attempt &&
        continuationRepairOverlay.action_id === row.action_id;
      if (repairOverlayMatches) {
        requireState(
          !continuationRepairOverlayUsed.value &&
            hashPattern.test(row.digest) &&
            row.digest === continuationRepairOverlay.before_digest &&
            continuationRepairOverlay.after_digest === canonicalJsonDigest(receipt),
          'delivered-work continuation repair digest beforeimage differs',
        );
        continuationRepairOverlayUsed.value = true;
      }
      const storedDigest = repairOverlayMatches ? continuationRepairOverlay!.after_digest : row.digest;
      requireState(
        canonicalJsonDigest(receipt) === storedDigest &&
          ((receipt.request?.action?.kind === 'historical_terminal_review' &&
            receipt.request.action.capture.action_id === row.action_id) ||
           (receipt.request?.action?.kind === 'configured_frontier' &&
            receipt.request.action.request.action_id === row.action_id)) &&
          receipt.attempt === row.attempt,
        'delivered-work continuation history receipt checksum or identity differs',
      );
      records.push({ kind: 'continuation', receipt });
    }
  }
  if (continuationRepairOverlay)
    requireState(continuationRepairOverlayUsed.value, 'delivered-work continuation repair row is missing');
  if (pendingReceipt) {
    records.push(
      pendingReceipt.schema === 'VidaRuntimeCodeRebindAuthorization/v1'
        ? { kind: 'runtime', receipt: pendingReceipt }
        : { kind: 'continuation', receipt: pendingReceipt },
    );
  }
  records.sort((a, b) => {
    const revision = (record: (typeof records)[number]) =>
      record.kind === 'runtime' ? record.receipt.prior_work_version.revision : record.receipt.request.expectedWork.revision;
    return revision(b) - revision(a);
  });
  let expected = candidate.binding;
  for (const record of records) {
    if (record.kind === 'continuation') {
      const receipt = record.receipt,
        request = receipt.request,
        original = receipt.prior_work,
        successorWork = receipt.successor_work,
        successor = receipt.successor_binding,
        journal = receipt.prior_journal,
        successorJournal = receipt.successor_journal,
        capture = receipt.historical_capture,
        action = request?.action;
      const scopedChanges =
        journal?.source_scope && request?.currentSourceScope
          ? compareScopedSourceSnapshots(journal.source_scope, request.currentSourceScope)
          : null;
      if (action?.kind === 'configured_frontier') {
        requireState(receipt.historical_capture === null && receipt.frontier_snapshot !== undefined,
          'configured-frontier history snapshot is missing');
        validateConfiguredFrontierReceiptStructure({ receipt: receipt as ConfiguredFrontierReceipt });
        requireState(
          sameJson(request.identity, workIdentity(candidate)) &&
            original.workspace_id === workspaceId &&
            sameJson(successor, expected) &&
            sameJson(successor, {
              ...original.binding,
              config_digest: request.targetConfigDigest,
              work_source_revision: request.currentSourceScope.digest,
              runtime_source_revision: request.targetRuntimeCodeDigest,
              runtime_code_digest: request.targetRuntimeCodeDigest,
              schema_digest: request.targetSchemaDigest,
            }) &&
            original.binding.config_digest === request.priorConfigDigest &&
            original.binding.runtime_code_digest === request.priorRuntimeCodeDigest &&
            receipt.work_version.revision === original.revision + 1 &&
            successorWork.lifecycle.revision === successorWork.revision &&
            sameJson(successorWork.execution.assignment_attempts, original.execution.assignment_attempts),
          'configured-frontier binding history is not continuous',
        );
        for (const reference of original.lifecycle.references) {
          const schema = { implementation_scope: 'ImplementationScope/v1', acceptance_manifest: 'AcceptanceManifest/v1',
            execution_approval: 'LocalSourceWriteAuthorization/v1' }[reference.kind as 'implementation_scope' | 'acceptance_manifest' | 'execution_approval'];
          if (schema && reference.artifact_schema === schema && reference.source_revision === original.binding.work_source_revision &&
              reference.scope_id === original.binding.scope_id && reference.ac_ids.every(id => original.binding.ac_ids.includes(id)))
            admissionReferences.push(reference);
        }
        for (const artifact of original.artifacts) {
          const schema = { 'admission-source-snapshot': 'ScopedSourceSnapshot/v1', 'local-session-intake': 'VidaLocalSessionIntake/v1' }[
            artifact.artifact_id as 'admission-source-snapshot' | 'local-session-intake'];
          if (schema && artifact.schema === schema && artifact.stage_id === 'intake' &&
              artifact.source_revision === original.binding.work_source_revision && artifact.scope_id === original.binding.scope_id &&
              artifact.ac_ids.every(id => original.binding.ac_ids.includes(id))) admissionArtifacts.push(artifact);
        }
        for (const attempt of original.execution.assignment_attempts) {
          const current = candidate.execution.assignment_attempts.find(entry => entry.attempt_id === attempt.attempt_id);
          requireState(current && sameJson(current, attempt), 'configured-frontier terminal assignment result changed');
          bindings.set(attempt.attempt_id, original.binding);
        }
        expected = original.binding;
        continue;
      }
      requireState(capture !== null && receipt.frontier_snapshot === undefined,
        'historical continuation capture or receipt shape differs');
      requireState(
        receipt.schema === 'DeliveredWorkContinuationReceipt/v1' &&
          receipt.status === 'action_ready' &&
          receipt.rights_granted === false &&
          receipt.accepted_result === false &&
          receipt.runtime_acceptance === false &&
          receipt.request_digest === canonicalJsonDigest(request) &&
          request.schema === 'DeliveredWorkContinuationRequest/v1' &&
          sameJson(request.identity, workIdentity(candidate)) &&
          request.attempt === receipt.attempt &&
          sameJson(request.expectedWork, receipt.prior_work_version) &&
          receipt.prior_ledger.revision === request.expectedLedger.revision &&
          canonicalJsonDigest(receipt.prior_ledger) === request.expectedLedger.digest &&
          receipt.prior_journal_version.revision === request.expectedJournal.revision &&
          canonicalJsonDigest(receipt.prior_journal) === request.expectedJournal.digest &&
          receipt.prior_work_version.revision === original.revision &&
          canonicalJsonDigest(original) === receipt.prior_work_version.digest &&
          receipt.prior_ledger.revision === receipt.prior_ledger_version.revision &&
          canonicalJsonDigest(receipt.prior_ledger) === receipt.prior_ledger_version.digest &&
          journal.workspace_id === workspaceId &&
          journal.work_id === request.identity.work_id &&
          journal.attempt === request.attempt &&
          canonicalJsonDigest(journal) === receipt.prior_journal_version.digest &&
          capture.schema === 'HistoricalTerminalSynthesisCustodyReceipt/v1' &&
          action?.kind === 'historical_terminal_review' &&
          canonicalJsonDigest(capture) === action?.capture?.receipt_digest &&
          capture.identity.work_id === request.identity.work_id &&
          capture.attempt === request.attempt &&
          capture.action_id === action?.capture?.action_id &&
          capture.issue_id === action?.capture?.issue_id &&
          capture.terminal_status === 'known_terminal_unaccepted' &&
          capture.task_status === 'unfinished' &&
          capture.accepted_result === false &&
          capture.rights_granted === false &&
          capture.runtime_acceptance === false &&
          typeof capture.body_base64 === 'string' &&
          Buffer.from(capture.body_base64, 'base64').byteLength === capture.body_byte_length &&
          createHash('sha256').update(Buffer.from(capture.body_base64, 'base64')).digest('hex') === capture.body_sha256 &&
          action?.kind === 'historical_terminal_review' &&
          action.original_request_pointer === capture.request.user_request_pointer &&
          action.capture.body_sha256 === capture.body_sha256 &&
          action.capture.body_ref === capture.provenance.body_ref &&
          action.request.config_digest === request.targetConfigDigest &&
          action.request.scope_digest === request.currentSourceScope.digest &&
          successorJournal.workspace_id === workspaceId &&
          successorJournal.work_id === request.identity.work_id &&
          successorJournal.attempt === request.attempt &&
          successorJournal.run_id === original.execution.run_id &&
          successorJournal.step_id === action.request.stage_id &&
          successorJournal.source_scope?.digest === request.currentSourceScope.digest &&
          successorJournal.items.length === 1 &&
          canonicalJsonDigest(successorJournal.items[0]?.request) === canonicalJsonDigest(action.request) &&
          successorJournal.items[0]?.issue_id === null &&
          successorJournal.items[0]?.observation === null &&
          receipt.journal_version.revision === request.expectedJournal.revision + 1 &&
          canonicalJsonDigest(successorJournal) === receipt.journal_version.digest &&
          receipt.work_version.revision === receipt.prior_work_version.revision + 1 &&
          successorWork.revision === receipt.work_version.revision &&
          successorWork.lifecycle.revision === successorWork.revision &&
          canonicalJsonDigest(successorWork) === receipt.work_version.digest &&
          receipt.ledger_version.revision === request.expectedLedger.revision + 1 &&
          receipt.successor_ledger.revision === receipt.ledger_version.revision &&
          canonicalJsonDigest(receipt.successor_ledger) === receipt.ledger_version.digest &&
          successorWork.binding &&
          sameJson(successorWork.binding, successor) &&
          sameJson(successor, expected) &&
          sameJson(successor, {
            ...original.binding,
            config_digest: request.targetConfigDigest,
            work_source_revision: request.currentSourceScope.digest,
            runtime_source_revision: request.targetRuntimeCodeDigest,
            runtime_code_digest: request.targetRuntimeCodeDigest,
            schema_digest: request.targetSchemaDigest,
          }) &&
          original.binding.config_digest === request.priorConfigDigest &&
          original.binding.runtime_code_digest === request.priorRuntimeCodeDigest &&
          original.execution.status === 'suspended' &&
          original.lease === null &&
          original.execution.assignment_attempts.every((attempt) => ['completed', 'no_effect'].includes(attempt.status)) &&
          successorWork.execution.assignment_attempts.length === original.execution.assignment_attempts.length &&
          sameJson(successorWork.execution.assignment_attempts, original.execution.assignment_attempts) &&
          scopedChanges !== null &&
          sameJson(scopedChanges, request.authorizedSourceChanges) &&
          receipt.authorization.schema === 'VidaDeliveredWorkContinuationAuthorization/v1' &&
          receipt.authorization.request_digest === receipt.request_digest &&
          receipt.authorization.transition_digest === request.sourceTransition.transition_digest &&
          receipt.authorization.action_digest === canonicalJsonDigest(action) &&
          typeof receipt.authorization.principal === 'string' &&
          receipt.authorization.principal.trim().length > 0,
        'delivered-work continuation binding history is not continuous',
      );
      for (const attempt of original.execution.assignment_attempts) {
        const current = candidate.execution.assignment_attempts.find((entry) => entry.attempt_id === attempt.attempt_id);
        requireState(current && sameJson(current, attempt), 'delivered-work terminal assignment result changed');
        bindings.set(attempt.attempt_id, original.binding);
      }
      expected = original.binding;
      continue;
    }
    const receipt = record.receipt;
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
  const admissionHistory = { references: admissionReferences, artifacts: admissionArtifacts };
  const checked = checkedWork(value, bindings, admissionHistory);
  observeAdmissionHistory?.(admissionHistory);
  return checked;
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
function exactJsonKeys(value: unknown, keys: readonly string[]): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    sameJson(Object.keys(value as Record<string, unknown>).sort(), [...keys].sort());
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
  taskSourceResourceAdditions: readonly string[] = [],
  admissionHistory: readonly LifecycleArtifactReference[] = [],
): void {
  requireState(
    work.revision === (before.work?.revision ?? 0) + 1 && ledger.revision === (before.ledger?.revision ?? 0) + 1,
    'state revisions must advance exactly once',
  );
  if (before.work) {
    const old = before.work;
    validateLifecycleProgress(old, work, documentationContext, admissionHistory);
    requireState(
      sameJson(old.execution.assignment_attempts, work.execution.assignment_attempts),
      'attempt history requires its dedicated transaction',
    );
    const bindingMatches = taskSourceResourceAdditions.length === 0
      ? sameJson(old.binding, work.binding)
      : (() => {
          const additions = [...taskSourceResourceAdditions].sort();
          return new Set(additions).size === additions.length &&
            additions.every(
              (resource) =>
                (resource.startsWith('branch:') || resource.startsWith('worktree:')) &&
                !old.binding.allowed_resources.includes(resource) &&
                work.binding.allowed_resources.includes(resource),
            ) &&
            sameJson(old.binding, {
              ...work.binding,
              allowed_resources: work.binding.allowed_resources.filter((resource) => !additions.includes(resource)),
            });
        })();
    requireState(bindingMatches, 'work authority changed; explicit rebind required');
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
    database.close(true);
  }
}

export function openHostStateDatabase(databasePath: string): Database {
  requireState(
    typeof databasePath === 'string' && path.isAbsolute(databasePath),
    'host state requires an absolute file-backed database path',
  );
  assertHostStateDatabasePathSafe(databasePath);
  const database = new Database(databasePath, { create: true, strict: true });
  try {
    database.exec('PRAGMA journal_mode=WAL');
    database.exec('PRAGMA synchronous=FULL');
    database.exec('PRAGMA busy_timeout=1000');
    return database;
  } catch (error) {
    database.close(true);
    throw error;
  }
}

function assertHostStateDatabasePathSafe(databasePath: string): void {
  const stats = lstatSync(databasePath, { throwIfNoEntry: false });
  requireState(
    !stats || (stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1),
    'host state database path is unsafe',
  );
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
    database.close(true);
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
  assertHostStateDatabasePathSafe(databasePath);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, input.repositoryRoot);
  if (access.fileExists(relativeDatabase, 'consumer migration canonical database')) {
    const probe = new Database(databasePath, { readonly: true, strict: true });
    try {
      assertConsumerAdmissionMetadata(probe, workspaceId);
    } finally {
      probe.close(true);
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
          workflow.close(true);
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
    database.close(true);
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
  readonly #verifyTaskSourceMutation: TaskSourceMutationPolicyVerifier['verify'] | undefined;
  readonly #verifyDeliveredWorkContinuation: DeliveredWorkContinuationVerifier['verify'] | undefined;
  readonly #verifyWorkflowApproval: WorkflowAttemptApprovalVerifier['verify'] | undefined;
  readonly #verifyMaintenanceRelease: MaintenanceReleaseVerifier['verify'] | undefined;
  readonly #verifyMaintenanceAcquisition: MaintenanceReleaseVerifier['verifyAcquisition'];
  #maintenanceSnapshotReadScopeActive = false;
  readonly #maintenancePrincipal: string | undefined;
  readonly #maintenanceProjectIds: readonly string[] | undefined;
  readonly #workflowApprovalPrincipal: string | undefined;
  #historicalNormalizationMutationActive = false;
  readonly reconciliationPrincipal: string | undefined;
  readonly migrationRebindPrincipal: string | undefined;
  readonly runtimeCodeRebindPrincipal: string | undefined;
  readonly deliveredWorkContinuationPrincipal: string | undefined;
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
    verifyTaskSourceMutation?: TaskSourceMutationPolicyVerifier,
    verifyDeliveredWorkContinuation?: DeliveredWorkContinuationVerifier,
    readOnlyInspection = false,
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
    requireState(
      verifyTaskSourceMutation === undefined ||
        (verifyTaskSourceMutation !== null &&
          typeof verifyTaskSourceMutation === 'object' &&
          Object.keys(verifyTaskSourceMutation).length === 1 &&
          typeof verifyTaskSourceMutation.verify === 'function'),
      'trusted task source policy verifier invalid',
    );
    this.#verifyTaskSourceMutation = verifyTaskSourceMutation?.verify.bind(verifyTaskSourceMutation);
    requireState(
      verifyDeliveredWorkContinuation === undefined ||
        (verifyDeliveredWorkContinuation !== null &&
          typeof verifyDeliveredWorkContinuation === 'object' &&
          Object.keys(verifyDeliveredWorkContinuation).length === 2 &&
          typeof verifyDeliveredWorkContinuation.principal === 'string' &&
          verifyDeliveredWorkContinuation.principal.trim().length > 0 &&
          verifyDeliveredWorkContinuation.principal === verifyDeliveredWorkContinuation.principal.trim() &&
          !/\p{Cc}/u.test(verifyDeliveredWorkContinuation.principal) &&
          typeof verifyDeliveredWorkContinuation.verify === 'function'),
      'trusted delivered-work continuation verifier invalid',
    );
    this.#verifyDeliveredWorkContinuation = verifyDeliveredWorkContinuation?.verify.bind(
      verifyDeliveredWorkContinuation,
    );
    this.runtimeCodeRebindPrincipal = verifyRuntimeCodeRebind?.principal;
    Object.defineProperty(this, 'runtimeCodeRebindPrincipal', { writable: false, configurable: false });
    this.deliveredWorkContinuationPrincipal = verifyDeliveredWorkContinuation?.principal;
    Object.defineProperty(this, 'deliveredWorkContinuationPrincipal', { writable: false, configurable: false });
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
    if (readOnlyInspection) {
      const requiredTables = [
        'agent_host_state',
        'agent_host_governance',
        'agent_host_governance_stores',
        'agent_host_reconciliation',
        'agent_host_maintenance',
        'agent_host_admission_attempt',
        'agent_host_final_assurance',
      ];
      requireState(
        requiredTables.every((table) =>
          database.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(table),
        ),
        'read-only Host inspection requires the existing current schema',
      );
    } else database.exec('PRAGMA synchronous=FULL');
    this.#assertDatabaseSupport();
    if (!readOnlyInspection) database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_state (workspace_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY (workspace_id, kind, id))',
    );
    if (!readOnlyInspection) database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_governance (workspace_id TEXT NOT NULL, store_id TEXT NOT NULL, kind TEXT NOT NULL, record_key TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,store_id,kind,record_key))',
    );
    if (!readOnlyInspection) database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_governance_stores (workspace_id TEXT NOT NULL, store_id TEXT NOT NULL, generation TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,store_id))',
    );
    if (!readOnlyInspection) database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_reconciliation (workspace_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL)',
    );
    if (!readOnlyInspection) database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_maintenance (workspace_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL)',
    );
    if (!readOnlyInspection) database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_admission_attempt (workspace_id TEXT NOT NULL,generation INTEGER NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,request_digest TEXT NOT NULL,PRIMARY KEY(workspace_id,generation,work_id,attempt))',
    );
    if (!readOnlyInspection) database.exec(
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
  #assertNoPendingSessionProducer(): void {
    const rows = this.#database
      .query("SELECT record_key FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind='operation'")
      .all(this.#workspaceId, sessionProducerStore) as { record_key: string }[];
    const pending = rows
      .map(
        (row) =>
          this.#governanceRead(sessionProducerStore, 'operation', row.record_key)!.record as OperationReservation,
      )
      .filter((record) => record.status === 'reserved' || record.status === 'commit_unknown');
    requireState(pending.length === 0, 'session producer is pending or unknown');
  }
  #assertNoPendingDeliveredContinuationRepair(exceptOperationKey?: string): void {
    const rows = this.#database
      .query("SELECT record_key FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind='operation'")
      .all(this.#workspaceId, deliveredContinuationRepairStore) as { record_key: string }[];
    const pending = rows
      .map(
        (row) =>
          this.#governanceRead(deliveredContinuationRepairStore, 'operation', row.record_key)!
            .record as OperationReservation,
      )
      .filter(
        (record) =>
          record.operation_key !== exceptOperationKey &&
          (record.status === 'reserved' || record.status === 'commit_unknown'),
      );
    requireState(pending.length === 0, 'delivered-work continuation repair is pending or unknown');
  }
  /** All producers share the one configured engine file; UNKNOWN never expires. */
  assertSessionProducerWriteAllowed(handle?: SessionProducerHandle): void {
    this.#assertNoPendingDeliveredContinuationRepair();
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
    requireState(
      !this.#historicalNormalizationMutationActive,
      'Host connection is reserved by a historical normalization mutation',
    );
    return this.#database.transaction(() => {
      this.assertSessionProducerWriteAllowed();
      return operation();
    });
  }

  #assertUnpreparedWorkContext(input: UnpreparedWorkRecoveryContext, original: WorkState): void {
    this.#assertReconciliationWritesAllowed();
    requireState(
      this.#repositoryRoot &&
        input.operatorHandle.trim().length > 0 &&
        input.operatorHandle.length <= 256 &&
        !/\p{Cc}/u.test(input.operatorHandle) &&
        input.decisionPointer.trim().length > 0 &&
        input.decisionPointer.length <= 512 &&
        Number.isSafeInteger(input.attempt) &&
        input.attempt > 0,
      'unprepared recovery caller or intent invalid',
    );
    const current = loadRuntimeConfig(this.#repositoryRoot);
    const physical = lstatSync(this.#database.filename);
    requireState(
      physical.isFile() &&
        !physical.isSymbolicLink() &&
        physical.nlink === 1 &&
        physical.dev === this.#producerDatabaseIdentity?.dev &&
        physical.ino === this.#producerDatabaseIdentity?.ino &&
        realpathSync.native(this.#database.filename) ===
          realpathSync.native(path.join(this.#repositoryRoot, current.control.work_root, 'session-handoff.v1.sqlite')),
      'unprepared recovery Host storage differs',
    );
    requireState(
      current.control.work_root === input.config.control.work_root &&
        runtimeConfigDigest(input.config) === original.binding.config_digest &&
        deriveWorkspaceId(input.config.repository.repository_id, this.#repositoryRoot) === this.#workspaceId &&
        original.workspace_id === this.#workspaceId &&
        sameJson(workIdentity(original), input.identity),
      'unprepared recovery original storage or identity differs',
    );
    const project = loadProjectSetContext(
      this.#repositoryRoot,
      current,
      input.identity.repository_id,
      input.identity.project_ids,
    );
    requireState(
      project.integrations_digest === input.identity.integrations_digest &&
        sameJson(project.project_ids, input.identity.project_ids),
      'unprepared recovery project differs',
    );
    requireState(
      original.lifecycle.phase === 'INTAKE' &&
        original.lifecycle.seal === null &&
        original.lifecycle.assurance.correction_count === 0 &&
        original.execution.status === 'active' &&
        original.execution.assignment_attempts.length === 0 &&
        original.lease?.thread_id === input.operatorHandle,
      'unprepared recovery requires original unstarted same-owner intake',
    );
    const intakeRef = original.artifacts.find(
      (item) => item.artifact_id === 'local-session-intake' && item.schema === 'VidaLocalSessionIntake/v1',
    );
    requireState(intakeRef, 'unprepared recovery original intake missing');
    const bytes = requireSafeRepositoryAccess(this.#repositoryRoot).readBytes(
        intakeRef.path,
        'unprepared original intake',
      ),
      intake = JSON.parse(bytes.toString('utf8'));
    requireState(
      bytes.length <= 32768 &&
        createHash('sha256').update(bytes).digest('hex') === intakeRef.sha256 &&
        intake.native_session_handle === input.operatorHandle &&
        intake.work_item?.id === input.identity.work_id &&
        canonicalJsonDigest(intake.work_item) === original.binding.work_item_digest,
      'unprepared recovery original intake differs',
    );
    const context = {
      work_id: input.identity.work_id,
      attempt: input.attempt,
      scope_digest: original.binding.work_source_revision,
    };
    requireState(
      original.execution.run_id ===
        'vida-' +
          canonicalJsonDigest({ workspaceId: this.#workspaceId, context, workflowId: original.binding.workflow_id }),
      'unprepared recovery original attempt differs',
    );
    requireState(
      !this.#database
        .query('SELECT 1 FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? LIMIT 1')
        .get(this.#workspaceId, input.identity.work_id),
      'unprepared recovery journal exists',
    );
    assertUnpreparedSessionEngineAbsent({
      repositoryRoot: this.#repositoryRoot,
      config: input.config,
      hostDatabase: this.#database,
      workspaceId: this.#workspaceId,
      work: original,
      attempt: input.attempt,
    });
  }

  #unpreparedWorkOwner(input: UnpreparedWorkRecoveryContext, before: HostStateSnapshot) {
    const work = before.work,
      ledger = before.ledger;
    requireState(work && ledger && work.lease, 'unprepared recovery owner missing');
    this.#assertUnpreparedWorkContext(input, work);
    const ticket = ledger.tickets.find((item) => item.ticket_id === work.lease!.ticket_id),
      claims = ledger.claims.filter((item) => item.ticket_id === ticket?.ticket_id && item.status === 'active'),
      resources = ['execution:' + input.identity.work_id];
    requireState(
      ticket?.status === 'active' &&
        sameJson(ticketIdentity(ticket), input.identity) &&
        ticket.thread_id === input.operatorHandle &&
        ticket.generation === work.lease.generation &&
        sameJson(ticket.exclusive_resources, resources) &&
        sameJson(ticket.active_resources, resources) &&
        ticket.blocked_resources.length === 0 &&
        claims.length === 1 &&
        sameJson(ticket.claim_ids, [claims[0]!.claim_id]) &&
        claims[0]!.thread_id === input.operatorHandle &&
        claims[0]!.generation === ticket.generation &&
        sameJson(claims[0]!.resources, resources),
      'unprepared recovery exact execution ownership differs',
    );
    requireState(
      !ledger.tickets.some(
        (item) =>
          item.ticket_id !== ticket.ticket_id &&
          ['queued', 'active', 'ready_for_handoff', 'blocked'].includes(item.status) &&
          (item.work_id === input.identity.work_id ||
            (item.sequence < ticket.sequence &&
              item.exclusive_resources.some((resource) => resources.includes(resource)))),
      ),
      'unprepared recovery pending ownership or FIFO conflict',
    );
    return { work, ledger, ticket, claims };
  }

  /** Read-only eligibility only. Apply rechecks under the existing immediate producer fence. */
  inspectUnpreparedWorkRecovery(input: UnpreparedWorkRecoveryContext): UnpreparedWorkRecoveryRequest {
    requireState(!this.#database.inTransaction, 'nested unprepared recovery inspection forbidden');
    return this.#database
      .transaction(() => {
        const before = this.#read(input.identity),
          owned = this.#unpreparedWorkOwner(input, before);
        return snapshot({
          identity: input.identity,
          attempt: input.attempt,
          operatorHandle: input.operatorHandle,
          decisionPointer: input.decisionPointer,
          expectedWork: before.workVersion!,
          expectedLedger: before.ledgerVersion!,
          expectedMaintenanceGeneration: before.maintenanceGeneration,
          originalWork: owned.work,
          originalTicket: owned.ticket,
          originalClaims: owned.claims,
        });
      })
      .deferred();
  }

  /** Finite no-journal disposal. This grants no new lease, Source rights or acceptance. */
  releaseUnpreparedWork(
    input: UnpreparedWorkRecoveryContext,
    supplied: UnpreparedWorkRecoveryRequest,
  ): HostStateSnapshot {
    const request = snapshot(supplied),
      operationId = 'unprepared-release-' + canonicalJsonDigest(request);
    requireState(
      !this.#database.inTransaction &&
        sameJson(request.identity, input.identity) &&
        request.attempt === input.attempt &&
        request.operatorHandle === input.operatorHandle &&
        request.decisionPointer === input.decisionPointer &&
        sameJson(version(request.originalWork), request.expectedWork),
      'unprepared recovery retained request differs',
    );
    return this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      this.#assertMaintenanceGeneration(request.expectedMaintenanceGeneration);
      const before = this.#read(input.identity),
        ledger = before.ledger;
      requireState(before.work && ledger, 'unprepared recovery work unavailable');
      const prior = ledger.operations.find((item) => item.operation_id === operationId),
        now = prior ? prior.created_at : new Date().toISOString();
      requireState(
        typeof now === 'string' && rfc3339TimestampMilliseconds(now) !== null,
        'unprepared recovery operation timestamp invalid',
      );
      const nextWork: WorkState = {
        ...request.originalWork,
        revision: request.originalWork.revision + 1,
        lease: null,
        execution: { ...request.originalWork.execution, status: 'suspended' },
        lifecycle: {
          ...request.originalWork.lifecycle,
          revision: request.originalWork.revision + 1,
          next_action:
            'Preparation released; current admission is required. Original attempt and evidence remain preserved.',
        },
      };
      const releasedTicket = {
        ...request.originalTicket,
        status: 'released' as const,
        active_resources: [],
        blocked_resources: [],
        expires_at: null,
      };
      const releasedClaims = request.originalClaims.map((claim) => ({
        ...claim,
        status: 'released' as const,
        renewed_at: now,
      }));
      if (prior) {
        this.#assertUnpreparedWorkContext(input, request.originalWork);
        requireState(
          prior.kind === 'release' &&
            prior.ticket_id === request.originalTicket.ticket_id &&
            prior.work_id === input.identity.work_id &&
            prior.thread_id === input.operatorHandle &&
            prior.decision_pointer === input.decisionPointer &&
            prior.from_ledger_revision === request.expectedLedger.revision &&
            prior.to_ledger_revision === request.expectedLedger.revision + 1 &&
            sameJson(before.work, nextWork) &&
            sameJson(
              ledger.tickets.find((item) => item.ticket_id === prior.ticket_id),
              releasedTicket,
            ) &&
            sameJson(
              ledger.claims.filter((item) => item.ticket_id === prior.ticket_id),
              releasedClaims,
            ),
          'unprepared recovery retry postcondition differs',
        );
        return before;
      }
      matchesExpected(before.workVersion, request.expectedWork);
      matchesExpected(before.ledgerVersion, request.expectedLedger);
      const owned = this.#unpreparedWorkOwner(input, before);
      requireState(
        sameJson(owned.work, request.originalWork) &&
          sameJson(owned.ticket, request.originalTicket) &&
          sameJson(owned.claims, request.originalClaims),
        'unprepared recovery retained owner changed',
      );
      const nextLedger: CoordinationLedger = {
        ...ledger,
        revision: ledger.revision + 1,
        tickets: ledger.tickets.map((ticket) =>
          ticket.ticket_id === owned.ticket.ticket_id ? releasedTicket : ticket,
        ),
        claims: ledger.claims.map(
          (claim) => releasedClaims.find((released) => released.claim_id === claim.claim_id) ?? claim,
        ),
        operations: [
          ...ledger.operations,
          {
            schema: 'CoordinationOperation/v1',
            operation_id: operationId,
            kind: 'release',
            ticket_id: owned.ticket.ticket_id,
            work_id: input.identity.work_id,
            thread_id: input.operatorHandle,
            source_revision: owned.ticket.source_revision,
            resources: [...owned.ticket.exclusive_resources],
            from_ledger_revision: ledger.revision,
            to_ledger_revision: ledger.revision + 1,
            decided_by: input.operatorHandle,
            decision_pointer: input.decisionPointer,
            created_at: now,
          },
        ],
      };
      return this.#commitHostState(
        {
          expectedWork: request.expectedWork,
          expectedLedger: request.expectedLedger,
          expectedMaintenanceGeneration: request.expectedMaintenanceGeneration,
          nextWork,
          nextLedger,
        },
        undefined,
        true,
      );
    }).immediate();
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
    const continuation = this.#readDeliveredWorkContinuationReceipt(identity, input.context.attempt);
    const configuredContinuation = continuation?.request.action.kind === 'configured_frontier' ? continuation : null;
    requireState(
      work.execution.run_id ===
        'vida-' +
          canonicalJsonDigest({
            workspaceId: this.#workspaceId,
            context: input.context,
            workflowId: input.workflowId,
          }) || (configuredContinuation !== null &&
            configuredContinuation.prior_work.execution.run_id === work.execution.run_id &&
            configuredContinuation.request.action.request.run_id === input.runId &&
            configuredContinuation.request.currentSourceScope.digest === input.context.scope_digest &&
            configuredContinuation.request.targetConfigDigest === runtimeConfigDigest(currentConfig)),
      'session producer original attempt differs',
    );
    requireState(
        (!journal?.state.corrective_execution ||
          journal.state.corrective_execution.base_run_id === work.execution.run_id),
      'session producer corrective base differs',
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
        const journal = MastraSessionLedger.prototype.resume.call(ledger, input.context.work_id, input.context.attempt);
        const project = loadProjectSetContext(input.repositoryRoot, config, config.repository.repository_id, input.projectIds);
        const continuation = this.#readDeliveredWorkContinuationReceipt({ repository_id: project.repository_id,
          project_ids: project.project_ids, integrations_digest: project.integrations_digest, work_id: input.context.work_id }, input.context.attempt);
        const configuredContinuation = continuation?.request.action.kind === 'configured_frontier' ? continuation : null;
        const engineBinding = {
          ...input,
          config,
          correctiveExecution: journal?.state.corrective_execution ?? undefined,
        };
        const engine = configuredContinuation
          ? readConfiguredContinuationSessionEngineSnapshot(engineBinding, configuredContinuation as ConfiguredFrontierReceipt)
          : readSessionEngineSnapshot(engineBinding);
        const atOldFrontier = configuredContinuation !== null && engine?.status === 'suspended' &&
          engine.step_id === 'wave-' + configuredContinuation.request.action.request.wave_index &&
          journal?.state.step_id === engine.step_id;
        const expectedRequests = atOldFrontier
          ? configuredContinuation.successor_journal.items.map(item => item.request)
          : engine?.requests;
        if (atOldFrontier) {
          requireState(journal && configuredContinuation &&
            journal.state.step_id === 'wave-' + configuredContinuation.request.action.request.wave_index &&
            sameJson(journal.state.completed, configuredContinuation.prior_journal.completed) &&
            sameJson(journal.state.items.map(item => item.request), expectedRequests),
          'configured producer current reviewer wave differs from retained receipt');
          if (input.phase === 'resume') requireState(
            journal.state.items.every(item => item.issue_id !== null && item.observation?.status === 'reported_complete' &&
              item.observation.issue_id === item.issue_id && item.observation.action_id === item.request.action_id &&
              item.observation.output_digest === canonicalJsonDigest(item.observation.summary)),
          'configured producer requires the complete successful current prewriter reports');
        }
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
                expectedRequests,
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
                    expectedRequests,
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
        const journal = MastraSessionLedger.prototype.resume.call(
          entry.ledger,
          entry.input.context.work_id,
          entry.input.context.attempt,
        );
        const project = loadProjectSetContext(entry.input.repositoryRoot, config, config.repository.repository_id, entry.input.projectIds);
        const continuation = this.#readDeliveredWorkContinuationReceipt({ repository_id: project.repository_id,
          project_ids: project.project_ids, integrations_digest: project.integrations_digest, work_id: entry.input.context.work_id }, entry.input.context.attempt);
        const binding = {
          ...entry.input,
          config,
          correctiveExecution: journal?.state.corrective_execution ?? undefined,
        };
        const engine = continuation?.request.action.kind === 'configured_frontier'
          ? readConfiguredContinuationSessionEngineSnapshot(binding, continuation as ConfiguredFrontierReceipt)
          : readSessionEngineSnapshot(binding);
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
    if (this.#verifyMaintenanceAcquisition) {
      this.#withMaintenanceSnapshotReadScope(() =>
        requireState(
          this.#verifyMaintenanceAcquisition!(snapshot(binding), snapshot(prior)) === undefined,
          'maintenance acquisition verifier must be synchronous and throw on drift',
        ),
      );
    }
  }
  #withMaintenanceSnapshotReadScope<T>(callback: () => T): T {
    requireState(
      !this.#maintenanceSnapshotReadScopeActive,
      'maintenance snapshot read scope cannot be re-entered',
    );
    this.#maintenanceSnapshotReadScopeActive = true;
    try {
      const result = callback();
      requireState(
        result === null ||
          (typeof result !== 'object' && typeof result !== 'function') ||
          typeof (result as { then?: unknown }).then !== 'function',
        'maintenance snapshot read callback must be synchronous',
      );
      return result;
    } finally {
      this.#maintenanceSnapshotReadScopeActive = false;
    }
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
  /** Keep a historical record publication behind one checked Host writer fence. */
  async withHistoricalNormalizationMutation<T>(input: {
    readonly repositoryRoot: string;
    readonly identity: WorkIdentity;
    readonly attempt: number;
    readonly expectedWork: StateVersion;
    readonly expectedLedger: StateVersion;
    readonly expectedJournal: StateVersion;
    readonly expectedMaintenanceGeneration: number;
    readonly action: () => T | Promise<T>;
    readonly rollback: () => void | Promise<void>;
  }): Promise<T> {
    const guard = snapshot({
      repositoryRoot: input.repositoryRoot,
      identity: input.identity,
      attempt: input.attempt,
      expectedWork: input.expectedWork,
      expectedLedger: input.expectedLedger,
      expectedJournal: input.expectedJournal,
      expectedMaintenanceGeneration: input.expectedMaintenanceGeneration,
    });
    const action = input.action;
    const rollback = input.rollback;
    this.assertWorkingRepositoryRoot(guard.repositoryRoot);
    requireState(
      Number.isSafeInteger(guard.attempt) &&
        guard.attempt > 0 &&
        Number.isSafeInteger(guard.expectedMaintenanceGeneration) &&
        guard.expectedMaintenanceGeneration >= 0 &&
        typeof action === 'function' &&
        typeof rollback === 'function',
      'historical normalization mutation input invalid',
    );
    requireState(
      !this.#historicalNormalizationMutationActive,
      'historical normalization mutation already active on this Host connection',
    );
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    this.#historicalNormalizationMutationActive = true;
    let entered = false;
    let restored = false;
    let transactionOpen = false;
    const restore = async (): Promise<void> => {
      if (!entered || restored) return;
      restored = true;
      try {
        await rollback();
      } catch {
        throw new HostStateError('historical normalization rollback failed after transaction failure');
      }
    };
    try {
      this.#database.exec('BEGIN IMMEDIATE');
      transactionOpen = true;
      this.assertSessionProducerWriteAllowed();
      this.#assertMaintenanceAvailable();
      this.#assertMaintenanceGeneration(guard.expectedMaintenanceGeneration);
      const before = this.#read(guard.identity);
      matchesExpected(before.workVersion, guard.expectedWork);
      matchesExpected(before.ledgerVersion, guard.expectedLedger);
      requireState(before.work !== null && before.ledger !== null, 'historical normalization Host state is missing');
      const journal = this.#database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(this.#workspaceId, guard.identity.work_id, guard.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null;
      requireState(
        journal &&
          journal.revision === guard.expectedJournal.revision &&
          journal.digest === guard.expectedJournal.digest,
        'historical normalization Journal CAS conflict',
      );
      const state = JSON.parse(journal.payload) as MastraSessionLedgerState;
      requireState(
        canonicalJsonDigest(state) === journal.digest &&
          state.work_id === guard.identity.work_id &&
          state.attempt === guard.attempt &&
          state.workspace_id === this.#workspaceId,
        'historical normalization Journal identity differs',
      );
      entered = true;
      const result = await action();
      this.#database.exec('COMMIT');
      transactionOpen = false;
      return result;
    } catch (error) {
      try {
        await restore();
      } finally {
        if (transactionOpen || this.#database.inTransaction) {
          this.#database.exec('ROLLBACK');
          transactionOpen = false;
        }
      }
      throw error;
    } finally {
      this.#historicalNormalizationMutationActive = false;
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
  #checkedWork(
    value: unknown,
    pendingReceipt?: RuntimeCodeRebindReceipt | DeliveredWorkContinuationReceipt,
    continuationRepairOverlay?: DeliveredContinuationRepairDigestOverlay,
  ): WorkState {
    return checkedStoredWork(this.#database, this.#workspaceId, value, pendingReceipt, continuationRepairOverlay);
  }
  #admissionHistory(work: WorkState): ContinuationAdmissionHistory {
    let history: ContinuationAdmissionHistory = { references: [], artifacts: [] };
    checkedStoredWork(this.#database, this.#workspaceId, work, undefined, undefined, value => { history = value; });
    return history;
  }
  /** Pure projection; persistence revalidates the stored receipt chain under CAS. */
  projectLifecycleTransition(work: WorkState, target: LifecyclePhase, nextAction: string,
    documentationContext?: DocumentationVerificationContext): WorkState {
    return transitionLifecycleState(work, target, nextAction, documentationContext, this.#admissionHistory(work).references);
  }
  #validateProgress(before: HostStateSnapshot, work: WorkState, ledger: CoordinationLedger,
    documentationContext?: DocumentationVerificationContext, taskSourceResourceAdditions: readonly string[] = []): void {
    validateProgress(before, work, ledger, documentationContext, taskSourceResourceAdditions, this.#admissionHistory(work).references);
  }
  #load(
    kind: 'work' | 'ledger',
    id: string,
    continuationRepairOverlay?: DeliveredContinuationRepairDigestOverlay,
  ): WorkState | CoordinationLedger | null {
    const row = this.#database
      .query('SELECT revision, payload, digest FROM agent_host_state WHERE workspace_id=? AND kind=? AND id=?')
      .get(this.#workspaceId, kind, id) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const parsed: unknown = JSON.parse(row.payload);
    assertCanonicalJsonValue(parsed, '$');
    const value = kind === 'work' ? this.#checkedWork(parsed, undefined, continuationRepairOverlay) : checkedLedger(parsed);
    requireState(
      value.workspace_id === this.#workspaceId &&
        value.revision === row.revision &&
        canonicalJsonDigest(value) === row.digest,
      'stored state checksum or identity mismatch',
    );
    if (kind === 'work') requireState(identityKey(workIdentity(value as WorkState)) === id, 'stored work key mismatch');
    return value;
  }
  #read(
    identity: WorkIdentity,
    allowHeldMaintenance = false,
    continuationRepairOverlay?: DeliveredContinuationRepairDigestOverlay,
  ): HostStateSnapshot {
    requireState(
      !allowHeldMaintenance || (this.#database.inTransaction && this.#maintenanceSnapshotReadScopeActive),
      'held maintenance read is limited to maintenance snapshot inspection',
    );
    this.#assertDatabaseSupport();
    if (!allowHeldMaintenance) this.#assertMaintenanceAvailable();
    const work = this.#load('work', identityKey(identity), continuationRepairOverlay) as WorkState | null;
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
    if (this.#database.inTransaction && this.#maintenanceSnapshotReadScopeActive) return this.#read(identity, true);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#database.transaction(() => this.#read(identity)).deferred();
  }
  withMaintenanceInspection<T>(receipt: MaintenanceFenceReceipt, inspect: () => T): T {
    requireState(
      typeof inspect === 'function' && inspect.constructor.name !== 'AsyncFunction',
      'maintenance snapshot inspection callback must be synchronous',
    );
    const input = snapshot(receipt);
    requireState(!this.#database.inTransaction, 'nested host state transaction forbidden');
    return this.#database
      .transaction(() => {
        const held = this.#assertMaintenanceReceipt(input);
        this.#assertMaintenanceProjects(held.binding);
        return this.#withMaintenanceSnapshotReadScope(inspect);
      })
      .deferred();
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

  /** Revalidate the live Source owner against the canonical Host journal and ticket queue. */
  #assertLiveTaskSourceOwner(
    host: HostStateSnapshot,
    request: TaskSourceBindingRequest,
    identity: WorkIdentity,
    journal: { readonly attempt: number; readonly state: Readonly<Record<string, unknown>> },
  ): CoordinationTicket {
    const work = host.work,
      ledger = host.ledger;
    requireState(
      work && ledger && host.workVersion && host.ledgerVersion &&
        work.execution.status === 'active' && work.lease &&
        work.lease.thread_id === request.thread_id && work.lease.ticket_id.length > 0 &&
        journal.attempt === request.attempt &&
        work.binding.lifecycle_work_id === request.work_id &&
        work.binding.repository_id === identity.repository_id &&
        sameJson(work.binding.project_ids, identity.project_ids) &&
        work.binding.config_digest === request.config_digest,
      'task source preparation has no matching active Host owner',
    );
    const ticket = ledger.tickets.find((entry) => entry.ticket_id === work.lease!.ticket_id),
      claims = ledger.claims.filter(
        (entry) => entry.ticket_id === work.lease!.ticket_id && entry.status === 'active',
      ),
      journalScope = validateTaskSourceJournalScope(
        (journal.state as { source_scope?: unknown }).source_scope,
      ),
      now = Date.now();
    assertTaskSourceJournalScopeWithinWork(journalScope, work);
    requireState(
      ticket &&
        ticket.status === 'active' &&
        ticket.work_id === identity.work_id &&
        ticket.thread_id === request.thread_id &&
        ticket.generation === work.lease.generation &&
        ticket.repository_id === identity.repository_id &&
        sameJson(ticket.project_ids, identity.project_ids) &&
        ticket.expires_at !== null &&
        timestamp(ticket.expires_at) > now &&
        claims.length === 1 &&
        ticket.claim_ids.includes(claims[0]!.claim_id) &&
        claims[0]!.work_id === identity.work_id &&
        claims[0]!.thread_id === request.thread_id &&
        claims[0]!.generation === work.lease.generation &&
        timestamp(claims[0]!.lease_expires_at) > now &&
        sameJson(claims[0]!.resources, ticket.active_resources) &&
        journalScope.digest.length === 64,
      'task source owner ticket, claim, lease expiry or journal scope is stale',
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
    return ticket;
  }

  /** Persist preparation metadata only after the current Host owner and CAS are verified. */
  prepareTaskSourceBindingOperation(input: {
    readonly request: TaskSourceBindingRequest;
    readonly identity: WorkIdentity;
    readonly verifyCurrent: (context: {
      readonly work: WorkState;
      readonly ledger: CoordinationLedger;
      readonly journal: Readonly<Record<string, unknown>>;
    }) => { readonly source_authorization_sha256: string; readonly source_scope_digest: string };
  }): Readonly<Record<string, unknown>> {
    requireState(
      input !== null &&
        typeof input === 'object' &&
        Object.keys(input).sort().join(',') === 'identity,request,verifyCurrent' &&
        typeof input.verifyCurrent === 'function' &&
        input.verifyCurrent.constructor.name !== 'AsyncFunction',
      'task source preparation input invalid',
    );
    const request = validateTaskSourceBindingRequest(input.request),
      identity = snapshot(input.identity);
    requireState(
      request.work_id === identity.work_id &&
        request.repository_id === identity.repository_id &&
        sameJson(request.project_ids, identity.project_ids),
      'task source request identity differs from the Host identity',
    );
    const readJournal = (work: WorkState): {
      attempt: number;
      version: StateVersion;
      state: Readonly<Record<string, unknown>>;
    } => {
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
      requireState(row, 'task source preparation requires the current Host journal');
      const state = JSON.parse(row.payload) as Record<string, unknown>;
      validateWorkSessionBinding(work, state as unknown as MastraSessionLedgerState, this.#repositoryRoot);
      requireState(
        state.schema === 'MastraSessionLedger/v1' &&
          state.workspace_id === this.#workspaceId &&
          state.work_id === identity.work_id &&
          state.attempt === row.attempt &&
          canonicalJsonDigest(state) === row.digest,
        'task source preparation journal integrity differs',
      );
      return snapshot({ attempt: row.attempt, version: { revision: row.revision, digest: row.digest }, state });
    };
    const tableExists = (): boolean =>
      Boolean(
        this.#database
          .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'")
          .get(),
      );
    const readRecord = (operationId: string) => {
      if (!tableExists()) return null;
      const row = this.#database
        .query(
          'SELECT revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
        )
        .get(this.#workspaceId, operationId) as {
        revision: number;
        payload: string;
        digest: string;
        request_id: string;
        request_digest: string;
      } | null;
      if (!row) return null;
      const operation = JSON.parse(row.payload) as Record<string, unknown>;
      requireState(
        Object.keys(operation).sort().join(',') ===
          'authority,created_at,operation_id,request,request_digest,request_id,revision,schema,status' &&
          operation.schema === 'TaskSourceBindingOperation/v1' &&
          operation.status === 'prepared' &&
          typeof operation.created_at === 'string' &&
          Number.isFinite(Date.parse(operation.created_at)) &&
          operation.revision === row.revision &&
          operation.operation_id === operationId &&
          operation.request_id === row.request_id &&
          operation.request_digest === row.request_digest &&
          canonicalJsonDigest(operation) === row.digest,
        'task source operation record integrity differs',
      );
      return { operation, state_version: { revision: row.revision, digest: row.digest } };
    };
    const checkOwnerAndAuthority = (before: HostStateSnapshot, journal: ReturnType<typeof readJournal>) => {
      const work = before.work,
        ledger = before.ledger;
      requireState(work && ledger, 'task source preparation Host work or ledger is missing');
      this.#assertLiveTaskSourceOwner(before, request, identity, journal);
      const journalScope = validateTaskSourceJournalScope(
        (journal.state as { source_scope?: unknown }).source_scope,
      );
      requireState(
        journalScope.digest.length === 64,
        'task source preparation current journal scope is invalid',
      );
      const checked = input.verifyCurrent({
        work,
        ledger,
        journal: journal.state,
      });
      requireState(
        checked !== null &&
          typeof checked === 'object' &&
          Object.keys(checked).sort().join(',') === 'source_authorization_sha256,source_scope_digest' &&
          hashPattern.test(checked.source_authorization_sha256) &&
          checked.source_scope_digest === work.binding.work_source_revision,
        'task source preparation authorization is invalid',
      );
      return checked;
    };
    const createResult = (
      status: 'prepared' | 'inspected' | 'not_found',
      stored: ReturnType<typeof readRecord>,
    ) =>
      snapshot({
        schema: 'TaskSourceBindingOperationResult/v1',
        status,
        operation_id: request.operation_id,
        request_id: request.request_id,
        operation: stored?.operation ?? null,
        state_version: stored?.state_version ?? null,
      });

    return this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      const before = this.#read(identity);
      requireState(before.work, 'task source preparation Host work is missing');
      const journal = readJournal(before.work),
        authority = checkOwnerAndAuthority(before, journal),
        stored = readRecord(request.operation_id),
        requestDigest = canonicalJsonDigest(request);
      if (stored) {
        requireState(
          stored.operation.request_id === request.request_id &&
            stored.operation.request_digest === requestDigest &&
            sameJson(stored.operation.request, request) &&
            sameJson(stored.operation.authority, authority),
          'task source operation retry changed or its current authority differs',
        );
        return createResult('prepared', stored);
      }
      if (tableExists()) {
        const priorRequest = this.#database
          .query(
            'SELECT operation_id FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND request_id=?',
          )
          .get(this.#workspaceId, request.request_id) as { operation_id: string } | null;
        requireState(!priorRequest, 'task source request ID is already bound to another operation');
      }
      matchesExpected(before.workVersion, request.expected_host.work);
      matchesExpected(before.ledgerVersion, request.expected_host.ledger);
      requireState(
        journal.attempt === request.expected_host.journal.attempt &&
          journal.version.revision === request.expected_host.journal.version.revision &&
          journal.version.digest === request.expected_host.journal.version.digest &&
          before.maintenanceGeneration === request.expected_host.maintenance_generation,
        'task source preparation Host journal or maintenance CAS changed',
      );
      const operation = snapshot({
        schema: 'TaskSourceBindingOperation/v1',
        operation_id: request.operation_id,
        request_id: request.request_id,
        request_digest: requestDigest,
        request,
        authority,
        status: 'prepared' as const,
        revision: 1,
        created_at: new Date().toISOString(),
      });
      const payload = canonicalJson(operation), operationDigest = canonicalJsonDigest(operation);
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_task_source_binding_operation (workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,request_id TEXT NOT NULL,request_digest TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id),UNIQUE(workspace_id,request_id))',
      );
      this.#database
        .query(
          'INSERT INTO agent_host_task_source_binding_operation (workspace_id,operation_id,request_id,request_digest,revision,payload,digest) VALUES(?,?,?,?,?,?,?)',
        )
        .run(
          this.#workspaceId,
          request.operation_id,
          request.request_id,
          requestDigest,
          operation.revision,
          payload,
          operationDigest,
        );
      return createResult('prepared', {
        operation,
        state_version: { revision: operation.revision, digest: operationDigest },
      });
    }).immediate();
  }

  /** Read a prepared task source operation without creating its lazy operation table. */
  inspectTaskSourceBindingOperation(input: {
    readonly request: TaskSourceBindingRequest;
    readonly identity: WorkIdentity;
    readonly verifyCurrent: (context: {
      readonly work: WorkState;
      readonly ledger: CoordinationLedger;
      readonly journal: Readonly<Record<string, unknown>>;
    }) => { readonly source_authorization_sha256: string; readonly source_scope_digest: string };
  }): Readonly<Record<string, unknown>> {
    requireState(
      input !== null &&
        typeof input === 'object' &&
        Object.keys(input).sort().join(',') === 'identity,request,verifyCurrent' &&
        typeof input.verifyCurrent === 'function' &&
        input.verifyCurrent.constructor.name !== 'AsyncFunction',
      'task source inspection input invalid',
    );
    const request = validateTaskSourceBindingRequest(input.request),
      identity = snapshot(input.identity);
    requireState(
      request.work_id === identity.work_id &&
        request.repository_id === identity.repository_id &&
        sameJson(request.project_ids, identity.project_ids),
      'task source request identity differs from the Host identity',
    );
    requireState(!this.#database.inTransaction, 'nested task source operation inspection forbidden');
    return this.#database
      .transaction(() => {
        this.#assertMaintenanceAvailable();
        const before = this.#read(identity);
        requireState(before.work, 'task source inspection Host work is missing');
        const journalRow = this.#database
          .query(
            'SELECT attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
          )
          .get(this.#workspaceId, identity.work_id) as {
          attempt: number;
          revision: number;
          payload: string;
          digest: string;
        } | null;
        requireState(journalRow, 'task source inspection requires the current Host journal');
        const journalState = JSON.parse(journalRow.payload) as Record<string, unknown>;
        validateWorkSessionBinding(before.work, journalState as unknown as MastraSessionLedgerState, this.#repositoryRoot);
        requireState(
          journalState.schema === 'MastraSessionLedger/v1' &&
            journalState.workspace_id === this.#workspaceId &&
            journalState.work_id === identity.work_id &&
            journalState.attempt === journalRow.attempt &&
            canonicalJsonDigest(journalState) === journalRow.digest,
          'task source inspection journal integrity differs',
        );
        const journal = snapshot({
          attempt: journalRow.attempt,
          version: { revision: journalRow.revision, digest: journalRow.digest },
          state: journalState,
        });
        const work = before.work,
          ledger = before.ledger;
        requireState(
          ledger &&
            before.workVersion &&
            before.ledgerVersion &&
            work.execution.status === 'active' &&
            work.lease &&
            work.lease.thread_id === request.thread_id &&
            journal.attempt === request.attempt &&
            work.binding.lifecycle_work_id === request.work_id &&
            work.binding.repository_id === request.repository_id &&
            sameJson(work.binding.project_ids, request.project_ids),
          'task source inspection has no matching active Host owner',
        );
        const ticket = ledger.tickets.find((entry) => entry.ticket_id === work.lease!.ticket_id),
          claims = ledger.claims.filter(
            (entry) => entry.ticket_id === work.lease!.ticket_id && entry.status === 'active',
          ),
          journalScope = validateTaskSourceJournalScope(
            (journal.state as { source_scope?: unknown }).source_scope,
          );
        assertTaskSourceJournalScopeWithinWork(journalScope, work);
        requireState(
          ticket?.status === 'active' &&
            ticket.work_id === identity.work_id &&
            ticket.thread_id === request.thread_id &&
            ticket.generation === work.lease.generation &&
            ticket.repository_id === identity.repository_id &&
            sameJson(ticket.project_ids, identity.project_ids) &&
            ticket.expires_at !== null &&
            timestamp(ticket.expires_at) > Date.now() &&
            claims.length === 1 &&
            claims[0]!.ticket_id === work.lease.ticket_id &&
            claims[0]!.thread_id === request.thread_id &&
            claims[0]!.generation === work.lease.generation &&
            timestamp(claims[0]!.lease_expires_at) > Date.now() &&
            journalScope.digest.length === 64,
          'task source inspection owner, lease or current scope differs',
        );
        const authority = input.verifyCurrent({
          work,
          ledger,
          journal: journal.state,
        });
        requireState(
          authority !== null &&
            typeof authority === 'object' &&
            Object.keys(authority).sort().join(',') === 'source_authorization_sha256,source_scope_digest' &&
            hashPattern.test(authority.source_authorization_sha256) &&
            authority.source_scope_digest === work.binding.work_source_revision,
          'task source inspection authorization is invalid',
        );
        const table = this.#database
          .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'")
          .get();
        if (!table)
          return snapshot({
            schema: 'TaskSourceBindingOperationResult/v1',
            status: 'not_found' as const,
            operation_id: request.operation_id,
            request_id: request.request_id,
            operation: null,
            state_version: null,
          });
        const row = this.#database
          .query(
            'SELECT revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
          )
          .get(this.#workspaceId, request.operation_id) as {
          revision: number;
          payload: string;
          digest: string;
          request_id: string;
          request_digest: string;
        } | null;
        if (!row)
          return snapshot({
            schema: 'TaskSourceBindingOperationResult/v1',
            status: 'not_found' as const,
            operation_id: request.operation_id,
            request_id: request.request_id,
            operation: null,
            state_version: null,
          });
        const operation = JSON.parse(row.payload) as Record<string, unknown>;
        requireState(
          Object.keys(operation).sort().join(',') ===
            'authority,created_at,operation_id,request,request_digest,request_id,revision,schema,status' &&
            operation.schema === 'TaskSourceBindingOperation/v1' &&
            operation.status === 'prepared' &&
            typeof operation.created_at === 'string' &&
            Number.isFinite(Date.parse(operation.created_at)) &&
            operation.revision === row.revision &&
            operation.operation_id === request.operation_id &&
            operation.request_id === row.request_id &&
            operation.request_digest === row.request_digest &&
            canonicalJsonDigest(operation) === row.digest &&
            operation.request_digest === canonicalJsonDigest(request) &&
            sameJson(operation.request, request) &&
            sameJson(operation.authority, authority),
          'task source inspection request or current authority differs',
        );
        return snapshot({
          schema: 'TaskSourceBindingOperationResult/v1',
          status: 'inspected' as const,
          operation_id: request.operation_id,
          request_id: request.request_id,
          operation,
          state_version: { revision: row.revision, digest: row.digest },
        });
      })
      .deferred();
  }

  /** Recovery observation is read-only and never returns an issued argv for replay. */
  inspectTaskSourceBindingAction(input: {
    readonly request: TaskSourceBindingRequest;
    readonly identity: WorkIdentity;
    readonly verifyCurrent: Parameters<HostStateStore['inspectTaskSourceBindingOperation']>[0]['verifyCurrent'];
  }): Readonly<Record<string, unknown>> {
    const prepared = this.inspectTaskSourceBindingOperation(input);
    if (prepared.status === 'not_found') return snapshot({
      schema: 'TaskSourceBindingActionResult/v1', status: 'not_found',
      operation_id: input.request.operation_id, request_id: input.request.request_id,
      action: null, state_version: null, command_argv: null,
    });
    const table = this.#database.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'",
    ).get();
    if (!table) return snapshot({
      schema: 'TaskSourceBindingActionResult/v1', status: 'prepared',
      operation_id: input.request.operation_id, request_id: input.request.request_id,
      action: null, state_version: null, command_argv: null,
    });
    const actionRow = this.#database.query(
      'SELECT operation_id,request_id,revision,payload,digest FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
    ).get(this.#workspaceId, input.request.operation_id) as TaskSourceActionRow | null;
    if (!actionRow) return snapshot({
      schema: 'TaskSourceBindingActionResult/v1', status: 'prepared',
      operation_id: input.request.operation_id, request_id: input.request.request_id,
      action: null, state_version: null, command_argv: null,
    });
    const operationRow = this.#database.query(
      'SELECT operation_id,revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
    ).get(this.#workspaceId, input.request.operation_id) as TaskSourceOperationRow | null;
    requireState(operationRow, 'task source recovery action has no prepared operation');
    const pair = validateTaskSourceActionPair(operationRow, actionRow as TaskSourceActionRow, input.request),
      action = pair.action;
    return snapshot({
      schema: 'TaskSourceBindingActionResult/v1', status: action.status,
      operation_id: input.request.operation_id, request_id: input.request.request_id,
      action, state_version: { revision: actionRow.revision, digest: actionRow.digest }, command_argv: null,
    });
  }

  /** Resolve only a reported current binding; absence keeps the original Host root. */
  readCurrentTaskSourceBinding(
    identity: WorkIdentity,
    threadId: string,
    attempt?: number,
  ): TaskSourceBinding | null {
    const repositoryRoot = this.#repositoryRoot;
    requireState(repositoryRoot !== undefined &&
      (attempt === undefined || (Number.isSafeInteger(attempt) && attempt > 0)) &&
      typeof threadId === 'string' && threadId.length > 0, 'task source binding read context is invalid');
    requireState(!this.#database.inTransaction, 'nested task source binding read forbidden');
    return this.#database.transaction(() => {
      this.#assertMaintenanceAvailable();
      const current = this.#read(identity), work = current.work;
      requireState(work && work.execution.status === 'active' && work.lease?.thread_id === threadId &&
        work.binding.lifecycle_work_id === identity.work_id && work.binding.repository_id === identity.repository_id &&
        sameJson(work.binding.project_ids, identity.project_ids), 'task source binding has no matching current Host owner');
      const config = loadRuntimeConfig(repositoryRoot),
        projectContext = loadProjectSetContext(repositoryRoot, config, identity.repository_id, identity.project_ids);
      requireState(work.binding.config_digest === runtimeConfigDigest(config),
        'task source binding runtime configuration differs from current Host Work');
      const operationsTable = this.#database.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'",
      ).get();
      const actionsTable = this.#database.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'",
      ).get();
      requireState(!actionsTable || operationsTable, 'task source action has no preparation storage');
      if (actionsTable) requireState(!this.#database.query(
        'SELECT a.operation_id FROM agent_host_task_source_binding_action a LEFT JOIN agent_host_task_source_binding_operation p ON p.workspace_id=a.workspace_id AND p.operation_id=a.operation_id WHERE a.workspace_id=? AND p.operation_id IS NULL LIMIT 1',
      ).get(this.#workspaceId), 'orphan task source action prevents Source root resolution');
      const reservedTickets = current.ledger?.tickets.filter((ticket) =>
        ticket.work_id === identity.work_id && ticket.ticket_id.startsWith('task-source-ticket:') && ticket.status !== 'queued',
      ) ?? [];
      requireState(reservedTickets.length === 0 || operationsTable && actionsTable,
        'reserved task source ticket has no effect storage');
      if (!operationsTable || !actionsTable) return null;
      const rows = this.#database.query(
        'SELECT operation_id,revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=?',
      ).all(this.#workspaceId) as { operation_id: string; revision: number; payload: string; digest: string; request_id: string; request_digest: string }[];
      const workRows = rows.filter((row) => {
        const operation = JSON.parse(row.payload) as Record<string, unknown>;
        const request = validateTaskSourceBindingRequest(operation.request);
        return request.work_id === identity.work_id;
      });
      requireState(reservedTickets.every((ticket) => workRows.some((row) =>
        taskSourceTicketId(validateTaskSourceBindingRequest(JSON.parse(row.payload).request)) === ticket.ticket_id &&
        this.#database.query('SELECT operation_id FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?')
          .get(this.#workspaceId, row.operation_id),
      )), 'reserved task source ticket has no retained effect record');
      if (!workRows.some((row) => this.#database.query(
        'SELECT operation_id FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, row.operation_id))) return null;
      const journalRow = this.#database.query(
        'SELECT attempt,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
      ).get(this.#workspaceId, identity.work_id) as { attempt: number; payload: string; digest: string } | null;
      requireState(journalRow && (attempt === undefined || journalRow.attempt === attempt),
        'task source binding Host journal attempt differs');
      const currentAttempt = journalRow.attempt;
      const journal = JSON.parse(journalRow.payload) as Record<string, unknown>,
        durableSourceScope = validateTaskSourceJournalScope(journal.source_scope);
      assertTaskSourceJournalScopeWithinWork(durableSourceScope, work);
      requireState(
        canonicalJsonDigest(journal) === journalRow.digest,
        'task source binding Host journal or Source scope integrity differs',
      );
      let binding: TaskSourceBinding | null = null;
      let uncertain = false;
      for (const row of workRows) {
        const operationRow = row as TaskSourceOperationRow,
          operation = JSON.parse(row.payload) as Record<string, unknown>,
          request = validateTaskSourceBindingRequest(operation.request);
        requireState(sameJson(request.project_ids, identity.project_ids),
          'task source prepared operation identity differs during binding read');
        const actionRow = this.#database.query(
          'SELECT operation_id,request_id,revision,payload,digest FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
        ).get(this.#workspaceId, request.operation_id) as TaskSourceActionRow | null;
        if (!actionRow) continue;
        const pair = validateTaskSourceActionPair(operationRow, actionRow),
          action = pair.action;
        if (request.operation === 'inspect') continue;
        if (action.status === 'issued' || action.status === 'unknown') {
          uncertain = true;
          continue;
        }
        requireState(action.status === 'reported', 'task source action status is invalid');
        const report = validateTaskSourceBindingExchange(request, action.recovery_report ?? action.report);
        requireState(report.status === 'observed' && report.binding !== null,
          'reported task source binding has no valid retained observed result');
        if (request.attempt !== currentAttempt || request.thread_id !== threadId) continue;
        const next = report.binding;
        const authority = operation.authority as { source_authorization_sha256?: unknown; source_scope_digest?: unknown };
        requireState(next.work_id === identity.work_id && next.attempt === currentAttempt && next.thread_id === threadId &&
          next.canonical_host_root === this.#repositoryRoot && next.repository_id === identity.repository_id &&
          sameJson(next.project_ids, identity.project_ids) && next.config_digest === work.binding.config_digest &&
          next.source_scope.digest === work.binding.work_source_revision &&
          authority.source_scope_digest === work.binding.work_source_revision &&
          typeof authority.source_authorization_sha256 === 'string' && hashPattern.test(authority.source_authorization_sha256) &&
          next.project_context_digest === projectContext.project_context_digest &&
          next.common_dir === next.canonical_host_common_dir,
          'reported task source binding differs from current Host identity, configuration or scope');
        requireState(binding === null, 'multiple current task source bindings are ambiguous');
        const stats = lstatSync(next.source_root);
        requireState(stats.isDirectory() && !stats.isSymbolicLink() && realpathSync.native(next.source_root) === next.source_root,
          'reported task source root is not a physical canonical directory');
        binding = validateTaskSourceBinding(next);
      }
      requireState(!uncertain, 'task source action outcome remains unknown; Source root resolution is blocked');
      const sourceRoot = binding?.source_root ?? repositoryRoot,
        currentSource = snapshotDeclaredSources(
          requireSafeRepositoryAccess(sourceRoot),
          durableSourceScope!.entries.map((entry) => entry.path),
        );
      requireState(
        compareScopedSourceSnapshots(durableSourceScope!, currentSource).length === 0,
        'current task Source bytes differ from the durable Host journal scope',
      );
      return binding;
    }).deferred();
  }

  /** Read original scoped bytes for historical release; this grants no current execution rights. */
  snapshotHistoricalTaskSourceSources(input: {
    identity: WorkIdentity;
    threadId: string;
    attempt: number;
    canonicalHostRoot: string;
    paths: readonly string[];
  }): ScopedSourceSnapshot {
    requireState(!this.#database.inTransaction && Number.isSafeInteger(input.attempt) && input.attempt > 0,
      'historical task source read context is invalid');
    const access = requireSafeRepositoryAccess(input.canonicalHostRoot);
    requireState(deriveWorkspaceId(input.identity.repository_id, input.canonicalHostRoot) === this.#workspaceId &&
      (this.#repositoryRoot === undefined || this.#repositoryRoot === input.canonicalHostRoot),
      'historical task source canonical Host root differs');
    return this.#database.transaction(() => {
      const host = this.#read(input.identity), work = host.work;
      requireState(work && host.ledger && work.binding.lifecycle_work_id === input.identity.work_id &&
        work.binding.repository_id === input.identity.repository_id && sameJson(work.binding.project_ids, input.identity.project_ids) &&
        (work.lease?.thread_id === input.threadId || work.lease === null && host.ledger.operations.some((operation) =>
          operation.kind === 'release' && operation.work_id === input.identity.work_id && operation.thread_id === input.threadId)),
        'historical task source original owner differs');
      requireState(sameJson([...input.paths].sort(), [...work.lifecycle.scope.fingerprint_paths].sort()),
        'historical task source paths differ from original fingerprint scope');
      const journal = this.#database.query(
        'SELECT payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      ).get(this.#workspaceId, input.identity.work_id, input.attempt) as { payload: string; digest: string } | null;
      const journalState = journal ? JSON.parse(journal.payload) as Record<string, unknown> : null;
      requireState(journal && journalState?.schema === 'MastraSessionLedger/v1' &&
        journalState.workspace_id === this.#workspaceId && journalState.work_id === input.identity.work_id &&
        journalState.attempt === input.attempt && canonicalJsonDigest(journalState) === journal.digest,
        'historical task source original journal is missing or changed');
      const tables = this.#database.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('agent_host_task_source_binding_operation','agent_host_task_source_binding_action')",
      ).all() as { name: string }[];
      requireState(!tables.some((table) => table.name === 'agent_host_task_source_binding_action') || tables.length === 2,
        'historical task source action has no preparation storage');
      if (tables.length === 2) requireState(!this.#database.query(
        'SELECT a.operation_id FROM agent_host_task_source_binding_action a LEFT JOIN agent_host_task_source_binding_operation p ON p.workspace_id=a.workspace_id AND p.operation_id=a.operation_id WHERE a.workspace_id=? AND p.operation_id IS NULL LIMIT 1',
      ).get(this.#workspaceId), 'orphan historical task source action prevents Source root resolution');
      const reservedTickets = host.ledger.tickets.filter((ticket) =>
        ticket.work_id === input.identity.work_id && ticket.ticket_id.startsWith('task-source-ticket:') && ticket.status !== 'queued',
      );
      requireState(reservedTickets.length === 0 || tables.length === 2,
        'historical reserved task source ticket has no effect storage');
      let sourceRoot: string | null = null;
      if (tables.length === 2) {
        const pairs = this.#database.query(
          'SELECT p.operation_id,p.revision,p.payload,p.digest,p.request_id,p.request_digest,a.revision AS action_revision,a.payload AS action_payload,a.digest AS action_digest FROM agent_host_task_source_binding_operation p LEFT JOIN agent_host_task_source_binding_action a ON a.workspace_id=p.workspace_id AND a.operation_id=p.operation_id WHERE p.workspace_id=?',
        ).all(this.#workspaceId) as {
          operation_id: string; revision: number; payload: string; digest: string; request_id: string; request_digest: string;
          action_revision: number | null; action_payload: string | null; action_digest: string | null;
        }[];
        requireState(reservedTickets.every((ticket) => pairs.some((pair) =>
          taskSourceTicketId(validateTaskSourceBindingRequest(JSON.parse(pair.payload).request)) === ticket.ticket_id &&
          pair.action_payload !== null,
        )), 'historical reserved task source ticket has no retained effect record');
        for (const pair of pairs) {
          const operation = JSON.parse(pair.payload) as Record<string, unknown>;
          const request = validateTaskSourceBindingRequest(operation.request);
          if (request.work_id !== input.identity.work_id || pair.action_payload === null) continue;
          const action = JSON.parse(pair.action_payload) as Record<string, unknown>;
          requireState(Object.keys(operation).sort().join(',') ===
              'authority,created_at,operation_id,request,request_digest,request_id,revision,schema,status' &&
            operation.schema === 'TaskSourceBindingOperation/v1' && operation.status === 'prepared' &&
            operation.operation_id === pair.operation_id && operation.revision === pair.revision &&
            operation.request_id === pair.request_id && operation.request_digest === pair.request_digest &&
            canonicalJsonDigest(operation) === pair.digest && canonicalJsonDigest(request) === pair.request_digest &&
            request.operation_id === pair.operation_id && request.request_id === pair.request_id &&
            Object.keys(action).sort().join(',') ===
              'command_argv,created_at,issue_id,operation_digest,operation_id,policy_decision,prepared_state_version,recovery_report,recovery_report_digest,report,report_digest,request_id,revision,schema,status,updated_at' &&
            action.schema === 'TaskSourceBindingAction/v1' && action.operation_id === pair.operation_id &&
            action.request_id === pair.request_id && action.revision === pair.action_revision &&
            canonicalJsonDigest(action) === pair.action_digest && action.operation_digest === pair.digest &&
            sameJson(action.prepared_state_version, { revision: pair.revision, digest: pair.digest }),
            'historical task source action/preparation integrity differs');
          if (request.operation === 'inspect') continue;
          requireState(action.status === 'reported', 'historical task source effect remains issued or unknown');
          const report = validateTaskSourceBindingExchange(request, action.recovery_report ?? action.report);
          requireState(report.status === 'observed' && report.binding !== null && canonicalJsonDigest(report) ===
            (action.recovery_report !== null ? action.recovery_report_digest : action.report_digest),
            'historical task source has no valid retained observed result');
          if (request.attempt !== input.attempt) continue;
          const binding = report.binding;
          requireState(sourceRoot === null && request.thread_id === input.threadId &&
            binding.thread_id === input.threadId && binding.work_id === input.identity.work_id && binding.attempt === input.attempt &&
            binding.repository_id === input.identity.repository_id && sameJson(binding.project_ids, input.identity.project_ids) &&
            binding.canonical_host_root === input.canonicalHostRoot && binding.config_digest === work.binding.config_digest &&
            binding.source_scope.digest === work.binding.work_source_revision &&
            (operation.authority as { source_scope_digest?: unknown })?.source_scope_digest === work.binding.work_source_revision &&
            binding.project_context_digest === request.project_context_digest && binding.common_dir === binding.canonical_host_common_dir,
            'historical task source retained binding is foreign or ambiguous');
          sourceRoot = binding.source_root;
        }
      }
      return snapshotDeclaredSources(sourceRoot === null ? access : requireSafeRepositoryAccess(sourceRoot), input.paths);
    }).deferred();
  }

  /** Snapshot only the Work-declared source files from its current bound tree. */
  snapshotCurrentTaskSourceSources(
    identity: WorkIdentity,
    threadId: string,
    paths: readonly string[],
    attempt?: number,
  ): ScopedSourceSnapshot {
    requireState(this.#repositoryRoot !== undefined, 'task source snapshot requires a configured canonical Host root');
    const binding = this.readCurrentTaskSourceBinding(identity, threadId, attempt),
      work = this.readHostStateSnapshot(identity).work;
    requireState(work, 'task source snapshot Work is missing');
    const allowedPaths = new Set([...work.lifecycle.scope.allowed_paths, ...work.lifecycle.scope.implementation_paths]);
    requireState(Array.isArray(paths) && paths.length > 0 && paths.every((relative) =>
      typeof relative === 'string' && [...allowedPaths].some((allowed) =>
        relative === allowed || relative.startsWith(allowed.replace(/\/$/, '') + '/'))),
      'task source snapshot paths exceed current Work scope');
    const sourceRoot = binding?.source_root ?? this.#repositoryRoot;
    return snapshotDeclaredSources(requireSafeRepositoryAccess(sourceRoot), paths);
  }

  /** Consume current TaskSource policy evidence and issue one durable fixed Git action. */
  async issueTaskSourceBindingOperation(input: {
    readonly request: TaskSourceBindingRequest;
    readonly identity: WorkIdentity;
  }): Promise<Readonly<Record<string, unknown>>> {
    requireState(input !== null && typeof input === 'object' &&
      Object.keys(input).sort().join(',') === 'identity,request', 'task source issue input invalid');
    const request = validateTaskSourceBindingRequest(input.request), identity = snapshot(input.identity);
    requireState(this.#repositoryRoot !== undefined &&
      (request.operation !== 'propose-create' || this.#verifyTaskSourceMutation !== undefined),
      'trusted task source mutation policy verifier is unavailable');
    requireState(request.work_id === identity.work_id && request.repository_id === identity.repository_id &&
      sameJson(request.project_ids, identity.project_ids), 'task source request identity differs from the Host identity');
    const tableExists = (): boolean => Boolean(this.#database.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'",
    ).get());
    const readAction = (operationId: string) => {
      if (!tableExists()) return null;
      const actionRow = this.#database.query(
        'SELECT operation_id,request_id,revision,payload,digest FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, operationId) as TaskSourceActionRow | null;
      if (!actionRow) return null;
      const operationRow = this.#database.query(
        'SELECT operation_id,revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, operationId) as TaskSourceOperationRow | null;
      requireState(operationRow, 'task source action has no prepared operation');
      const pair = validateTaskSourceActionPair(operationRow, actionRow);
      return { action: pair.action, state_version: { revision: actionRow.revision, digest: actionRow.digest } };
    };
    const result = (status: string, stored: ReturnType<typeof readAction>, argv: unknown = null) => snapshot({
      schema: 'TaskSourceBindingActionResult/v1', status, operation_id: request.operation_id,
      request_id: request.request_id, action: stored?.action ?? null,
      state_version: stored?.state_version ?? null, command_argv: argv,
    });
    const existing = this.#database.transaction(() => {
      this.#assertMaintenanceAvailable();
      const action = readAction(request.operation_id);
      if (!action) return null;
      const row = this.#database.query(
        'SELECT payload,digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, request.operation_id) as { payload: string; digest: string } | null;
      requireState(row, 'issued task source operation preparation is missing');
      const prepared = JSON.parse(row.payload) as Record<string, unknown>;
      requireState(prepared.request_id === request.request_id && sameJson(prepared.request, request) &&
        (action.action as { operation_digest?: unknown }).operation_digest === row.digest,
        'task source action retry changed its prepared request');
      return action;
    }).deferred();
    if (existing) return result('already_issued', existing);

    const prepared = this.#database.transaction(() => {
      this.#assertMaintenanceAvailable();
      const row = this.#database.query(
        'SELECT revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, request.operation_id) as {
        revision: number; payload: string; digest: string; request_id: string; request_digest: string;
      } | null;
      requireState(row, 'task source operation must be prepared before issue');
      const operation = JSON.parse(row.payload) as Record<string, unknown>;
      requireState(Object.keys(operation).sort().join(',') ===
        'authority,created_at,operation_id,request,request_digest,request_id,revision,schema,status' &&
        operation.schema === 'TaskSourceBindingOperation/v1' && operation.status === 'prepared' &&
        operation.revision === row.revision && operation.operation_id === request.operation_id &&
        operation.request_id === row.request_id && operation.request_digest === row.request_digest &&
        canonicalJsonDigest(operation) === row.digest && row.request_digest === canonicalJsonDigest(request) &&
        sameJson(operation.request, request), 'task source prepared operation is stale or changed');
      const before = this.#read(identity);
      requireState(before.work && before.ledger && before.workVersion && before.ledgerVersion &&
        before.work.execution.status === 'active' && before.work.lease?.thread_id === request.thread_id &&
        before.work.binding.lifecycle_work_id === request.work_id &&
        before.work.binding.config_digest === request.config_digest &&
        before.work.binding.work_source_revision === (operation.authority as { source_scope_digest?: unknown }).source_scope_digest,
        'task source issue has no matching active Host owner or scope');
      const reservation = taskSourceReservationForRequest(this.#repositoryRoot!, before, request),
        exactHostCas = before.workVersion.revision === request.expected_host.work.revision &&
          before.workVersion.digest === request.expected_host.work.digest &&
          before.ledgerVersion.revision === request.expected_host.ledger.revision &&
          before.ledgerVersion.digest === request.expected_host.ledger.digest;
      requireState(exactHostCas || reservation !== null,
        'task source issue Host compare-and-swap changed outside its canonical reservation');
      requireState(before.maintenanceGeneration === request.expected_host.maintenance_generation,
        'task source issue maintenance generation changed');
      const journalRow = this.#database.query(
        'SELECT attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
      ).get(this.#workspaceId, request.work_id) as { attempt: number; revision: number; payload: string; digest: string } | null;
      requireState(journalRow && journalRow.attempt === request.expected_host.journal.attempt &&
        journalRow.revision === request.expected_host.journal.version.revision &&
        journalRow.digest === request.expected_host.journal.version.digest,
        'task source issue journal compare-and-swap changed');
      const journal = JSON.parse(journalRow.payload) as Record<string, unknown>,
        journalScope = validateTaskSourceJournalScope(journal.source_scope);
      requireState(canonicalJsonDigest(journal) === journalRow.digest && journalScope.digest.length === 64,
        'task source issue journal or current scope integrity differs');
      return { operation, state_version: { revision: row.revision, digest: row.digest }, hostSnapshot: before };
    }).deferred();

    let decision: TaskSourceMutationPolicyDecision | null = null;
    let policyRequest: TaskSourceMutationPolicyRequest | null = null;
    if (request.operation === 'propose-create') {
      policyRequest = createTaskSourceMutationPolicyRequest({
        repositoryRoot: this.#repositoryRoot,
        operation: prepared.operation,
        preparedStateVersion: prepared.state_version,
        hostSnapshot: prepared.hostSnapshot,
      });
      decision = await this.#verifyTaskSourceMutation!({
        repositoryRoot: this.#repositoryRoot,
        request: policyRequest,
        operation: prepared.operation,
        stateVersion: prepared.state_version,
        hostSnapshot: prepared.hostSnapshot,
      });
      requireState(decision !== null && typeof decision === 'object' &&
        Object.keys(decision).sort().join(',') ===
          'authorization,edictum_evaluation,edictum_operation,operation_hash,operation_id,preflight_evidence_digest,prepared_record_cas,request_id,source_authorization_reference,source_authorization_sha256' &&
        decision.operation_id === policyRequest.operation_id && decision.request_id === policyRequest.request_id &&
        decision.operation_hash === policyRequest.operation_hash && decision.authorization?.decision === 'allow' &&
        decision.edictum_operation?.operation_hash === policyRequest.operation_hash &&
        decision.edictum_evaluation?.action === 'pending_approval' &&
        canonicalJsonDigest(decision.prepared_record_cas) === canonicalJsonDigest(policyRequest.prepared_record_cas) &&
        hashPattern.test(decision.preflight_evidence_digest) && hashPattern.test(decision.source_authorization_sha256) &&
        decision.source_authorization_sha256 ===
          (prepared.operation.authority as { source_authorization_sha256?: unknown }).source_authorization_sha256,
        'task source mutation policy evidence is invalid or denied');
    }

    const commandArgv = policyRequest
      ? [policyRequest.proposed_argv.slice(1)]
      : taskSourceGitArgv(resolveTaskSourceRoot(this.#repositoryRoot, request.source_root));
    const committed = this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      const current = this.#read(identity);
      requireState(current.work && current.workVersion && current.ledgerVersion,
        'task source owner changed during policy evaluation');
      const journalRow = this.#database.query(
        'SELECT attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
      ).get(this.#workspaceId, request.work_id) as {
        attempt: number; revision: number; payload: string; digest: string;
      } | null;
      requireState(journalRow, 'task source issue requires the current Host journal');
      const currentJournal = JSON.parse(journalRow.payload) as Record<string, unknown>;
      requireState(
        journalRow.attempt === request.attempt && canonicalJsonDigest(currentJournal) === journalRow.digest,
        'task source issue journal integrity differs during policy evaluation',
      );
      this.#assertLiveTaskSourceOwner(current, request, identity, {
        attempt: journalRow.attempt,
        state: currentJournal,
      });
      const reservation = taskSourceReservationForRequest(this.#repositoryRoot!, current, request),
        exactHostCas = current.workVersion.revision === request.expected_host.work.revision &&
          current.workVersion.digest === request.expected_host.work.digest &&
          current.ledgerVersion.revision === request.expected_host.ledger.revision &&
          current.ledgerVersion.digest === request.expected_host.ledger.digest;
      requireState(exactHostCas || reservation !== null,
        'task source Host compare-and-swap changed outside its canonical reservation');
      requireState(current.maintenanceGeneration === request.expected_host.maintenance_generation,
        'task source maintenance generation changed during policy evaluation');
      const row = this.#database.query(
        'SELECT revision,payload,digest,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, request.operation_id) as { revision: number; payload: string; digest: string; request_digest: string } | null;
      requireState(row && row.digest === prepared.state_version.digest && row.revision === prepared.state_version.revision &&
        row.request_digest === canonicalJsonDigest(request), 'task source prepared record changed during policy evaluation');
      if (request.operation !== 'inspect') {
        const previousActions = tableExists() ? this.#database.query(
          'SELECT operation_id FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id<>?',
        ).all(this.#workspaceId, request.operation_id) as { operation_id: string }[] : [];
        for (const previous of previousActions) {
          const action = readAction(previous.operation_id)!.action;
          const priorRow = this.#database.query(
            'SELECT revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
          ).get(this.#workspaceId, previous.operation_id) as {
            revision: number; payload: string; digest: string; request_id: string; request_digest: string;
          } | null;
          requireState(priorRow, 'pending TaskSource action preparation is missing');
          const operation = JSON.parse(priorRow.payload) as Record<string, unknown>;
          requireState(
            Object.keys(operation).sort().join(',') ===
              'authority,created_at,operation_id,request,request_digest,request_id,revision,schema,status' &&
              operation.schema === 'TaskSourceBindingOperation/v1' && operation.status === 'prepared' &&
              typeof operation.created_at === 'string' && Number.isFinite(Date.parse(operation.created_at)) &&
              operation.revision === priorRow.revision && operation.operation_id === previous.operation_id &&
              operation.request_id === priorRow.request_id && operation.request_digest === priorRow.request_digest &&
              canonicalJsonDigest(operation) === priorRow.digest &&
              action.operation_digest === priorRow.digest && action.request_id === priorRow.request_id &&
              sameJson(action.prepared_state_version, { revision: priorRow.revision, digest: priorRow.digest }),
            'pending TaskSource action preparation integrity differs',
          );
          const priorRequest = validateTaskSourceBindingRequest(operation.request);
          requireState(priorRequest.operation_id === previous.operation_id &&
            priorRequest.request_id === priorRow.request_id && canonicalJsonDigest(priorRequest) === priorRow.request_digest,
            'pending TaskSource request integrity differs');
          if (action.status === 'reported') {
            requireState(action.recovery_report !== null || action.report !== null,
              'reported TaskSource action has no retained observed result');
            const report = validateTaskSourceBindingExchange(priorRequest, action.recovery_report ?? action.report);
            requireState(report.status === 'observed' && canonicalJsonDigest(report) ===
              (action.recovery_report !== null ? action.recovery_report_digest : action.report_digest),
              'reported TaskSource action lacks a valid retained observed result');
            requireState(
              priorRequest.operation === 'inspect' || priorRequest.work_id !== request.work_id ||
                priorRequest.attempt !== request.attempt || priorRequest.thread_id !== request.thread_id,
              'this TaskSource attempt already has a reported observed binding',
            );
            continue;
          }
          requireState(priorRequest.operation === 'inspect' || priorRequest.work_id !== request.work_id,
            'TaskSource resources are already claimed by an issued or unknown operation for this Work');
        }
        const prior = taskSourcePriorTicket(current.ledger!, current.work, request);
        requireState(prior && prior.status === 'active' && prior.expires_at !== null &&
          timestamp(prior.expires_at) > Date.now() && current.work.lease?.ticket_id === prior.ticket_id,
          'TaskSource reservation has no current active predecessor ticket');
        const reservation = taskSourceReservationResources(this.#repositoryRoot!, request, current.work, prior),
          ownId = taskSourceTicketId(request),
          existingTicket = current.ledger!.tickets.find((ticket) => ticket.ticket_id === ownId) ?? null,
          sequence = existingTicket?.sequence ?? current.ledger!.next_sequence,
          resourceKeys = new Set(reservation.resources.map(coordinationResourceKey)),
          conflicts = current.ledger!.tickets.some((candidate) =>
            candidate.ticket_id !== ownId && candidate.ticket_id !== prior.ticket_id &&
            (['active', 'ready_for_handoff', 'blocked'].includes(candidate.status) ||
              (candidate.status === 'queued' && candidate.sequence < sequence)) &&
            candidate.exclusive_resources.some((resource) => resourceKeys.has(coordinationResourceKey(resource))),
          );
        if (existingTicket) {
          taskSourceTicketMatches(current.ledger!, current.work, request, reservation.resources);
          requireState(taskSourceExpectedWorkMatches(
            current.work,
            current.ledger!,
            request,
            reservation.resources,
            reservation.added,
            existingTicket,
          ), 'TaskSource reservation is not a continuation of its original Work scope');
        }
        if (conflicts && existingTicket?.status === 'queued')
          return { status: 'queued' as const, action: null, state_version: null };

        const queued = conflicts,
          now = new Date().toISOString(),
          expiry = queued ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          ticketId = ownId,
          claimId = taskSourceClaimId(request),
          generation = existingTicket?.generation ?? current.ledger!.open_generation,
          sourceTicket: CoordinationTicket = {
            ...prior,
            ticket_id: ticketId,
            sequence,
            generation,
            contour_keys: [...new Set([...prior.contour_keys, ...reservation.resources])].sort(),
            exclusive_resources: [...reservation.resources],
            status: queued ? 'queued' : 'active',
            claim_ids: queued ? [] : [claimId],
            expires_at: expiry,
            active_resources: queued ? [] : [...reservation.resources],
            blocked_resources: queued ? [...reservation.resources] : [],
            created_at: existingTicket?.created_at ?? now,
          },
          additions = reservation.added.filter((resource) => !current.work!.binding.allowed_resources.includes(resource)),
          nextWork = {
            ...current.work!,
            revision: current.work!.revision + 1,
            binding: {
              ...current.work!.binding,
              allowed_resources: [...new Set([...current.work!.binding.allowed_resources, ...reservation.added])].sort(),
            },
            lifecycle: { ...current.work!.lifecycle, revision: current.work!.lifecycle.revision + 1 },
            lease: queued ? current.work!.lease : { ticket_id: ticketId, thread_id: request.thread_id, generation },
          };
        const releasedPrior: CoordinationTicket = {
          ...prior,
          status: 'released',
          active_resources: [],
          blocked_resources: [],
          expires_at: null,
        };
        const nextTickets = current.ledger!.tickets.map((ticket) =>
          ticket.ticket_id === ticketId ? sourceTicket :
            !queued && ticket.ticket_id === prior.ticket_id ? releasedPrior : ticket,
        );
        if (!existingTicket) nextTickets.push(sourceTicket);
        const nextClaims = current.ledger!.claims.map((claim) =>
          !queued && claim.ticket_id === prior.ticket_id && claim.status === 'active'
            ? { ...claim, status: 'released' as const, renewed_at: now }
            : claim,
        );
        if (!queued) nextClaims.push({
          schema: 'WorkstreamClaim/v1',
          claim_id: claimId,
          ticket_id: ticketId,
          work_id: request.work_id,
          thread_id: request.thread_id,
          generation,
          resources: [...reservation.resources],
          lease_expires_at: expiry!,
          status: 'active',
          created_at: now,
          renewed_at: now,
        });
        const nextOperations = !queued
          ? [...current.ledger!.operations, {
              schema: 'CoordinationOperation/v1',
              operation_id: 'task-source-release-' + ticketId,
              kind: 'release',
              ticket_id: prior.ticket_id,
              work_id: prior.work_id,
              thread_id: prior.thread_id,
              source_revision: prior.source_revision,
              resources: [...prior.exclusive_resources],
              from_ledger_revision: current.ledger!.revision,
              to_ledger_revision: current.ledger!.revision + 1,
              decided_by: request.thread_id,
              decision_pointer: request.source_root!,
              created_at: now,
            }]
          : current.ledger!.operations;
        const nextLedger = checkedLedger({
          ...current.ledger!,
          revision: current.ledger!.revision + 1,
          next_sequence: current.ledger!.next_sequence + Number(!existingTicket),
          tickets: nextTickets,
          claims: nextClaims,
          operations: nextOperations,
        });
        this.#commitHostState({
          expectedWork: current.workVersion,
          expectedLedger: current.ledgerVersion,
          expectedMaintenanceGeneration: current.maintenanceGeneration,
          nextWork,
          nextLedger,
        }, undefined, true, additions);
        if (queued) return { status: 'queued' as const, action: null, state_version: null };
      }
      const action = snapshot({
        schema: 'TaskSourceBindingAction/v1', operation_id: request.operation_id, request_id: request.request_id,
        operation_digest: row.digest, prepared_state_version: prepared.state_version, issue_id: randomUUID(),
        command_argv: commandArgv, policy_decision: request.operation === 'propose-create' ? decision : null,
        status: 'issued' as const, report: null, report_digest: null,
        recovery_report: null, recovery_report_digest: null, revision: 1,
        created_at: new Date().toISOString(), updated_at: null,
      });
      const payload = canonicalJson(action), digest = canonicalJsonDigest(action);
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_task_source_binding_action (workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,request_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id),UNIQUE(workspace_id,request_id))',
      );
      this.#database.query(
        'INSERT INTO agent_host_task_source_binding_action (workspace_id,operation_id,request_id,revision,payload,digest) VALUES(?,?,?,?,?,?)',
      ).run(this.#workspaceId, request.operation_id, request.request_id, action.revision, payload, digest);
      return { status: 'issued' as const, action, state_version: { revision: action.revision, digest } };
    }).immediate();
    return committed.status === 'queued'
      ? result('queued', null)
      : result('issued', committed, commandArgv);
  }

  /** Persist one exact cooperative report; uncertain outcomes remain inspect-only and keep their claims. */
  reportTaskSourceBindingOperation(input: {
    readonly request: TaskSourceBindingRequest;
    readonly identity: WorkIdentity;
    readonly expectedActionStateVersion: StateVersion;
    readonly report: TaskSourceBindingReport;
  }): Readonly<Record<string, unknown>> {
    requireState(input !== null && typeof input === 'object' &&
      Object.keys(input).sort().join(',') === 'expectedActionStateVersion,identity,report,request',
      'task source report input invalid');
    const request = validateTaskSourceBindingRequest(input.request), identity = snapshot(input.identity),
      report = validateTaskSourceBindingExchange(request, input.report);
    requireState(request.work_id === identity.work_id && request.repository_id === identity.repository_id &&
      sameJson(request.project_ids, identity.project_ids), 'task source report identity differs from the Host');
    const stored = this.#transactionWithProducerFence(() => {
      this.#assertMaintenanceAvailable();
      const actionRow = this.#database.query(
        'SELECT operation_id,request_id,revision,payload,digest FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, request.operation_id) as TaskSourceActionRow | null;
      requireState(actionRow, 'task source report has no issued Host action');
      const operationRow = this.#database.query(
        'SELECT operation_id,revision,payload,digest,request_id,request_digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
      ).get(this.#workspaceId, request.operation_id) as TaskSourceOperationRow | null;
      requireState(operationRow, 'task source report has no prepared operation');
      const action = validateTaskSourceActionPair(operationRow, actionRow, request).action,
        reportDigest = canonicalJsonDigest(report);
      if (action.status === 'reported' && action.report_digest === reportDigest ||
          action.status === 'reported' && action.recovery_report_digest === reportDigest) {
        return { action, state_version: { revision: actionRow.revision, digest: actionRow.digest } };
      }
      const recoveringUnknown = action.status === 'unknown';
      if (recoveringUnknown) {
        requireState(action.recovery_report === null && action.recovery_report_digest === null && report.status === 'observed',
          'uncertain task source action accepts only one later observed recovery report');
      } else requireState(action.status === 'issued', 'task source action is not awaiting its first report');
      requireState(actionRow.revision === input.expectedActionStateVersion.revision &&
        actionRow.digest === input.expectedActionStateVersion.digest, 'task source report action CAS is stale or already settled');
      if (report.status === 'observed') {
        const current = this.#read(identity);
        requireState(current.work && current.workVersion && current.ledgerVersion &&
          current.work.execution.status === 'active' && current.work.lease?.thread_id === request.thread_id,
          'observed task source report has no current Host owner');
        if (request.operation === 'inspect') {
          matchesExpected(current.workVersion, request.expected_host.work);
          matchesExpected(current.ledgerVersion, request.expected_host.ledger);
        } else {
          const reservation = taskSourceReservationForRequest(this.#repositoryRoot!, current, request);
          requireState(reservation?.ticket.status === 'active',
            'observed TaskSource report has no exact active canonical reservation');
        }
        requireState(current.maintenanceGeneration === request.expected_host.maintenance_generation,
          'observed task source report maintenance CAS changed');
        const journalRow = this.#database.query(
          'SELECT attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
        ).get(this.#workspaceId, request.work_id) as { attempt: number; revision: number; payload: string; digest: string } | null;
        requireState(journalRow && journalRow.attempt === request.expected_host.journal.attempt &&
          journalRow.revision === request.expected_host.journal.version.revision &&
          journalRow.digest === request.expected_host.journal.version.digest,
          'observed task source report journal CAS changed');
        const currentJournal = JSON.parse(journalRow.payload) as { source_scope?: unknown };
        const currentJournalScope = validateTaskSourceJournalScope(currentJournal.source_scope);
        assertTaskSourceJournalScopeWithinWork(currentJournalScope, current.work);
        if (request.operation !== 'inspect') this.#assertLiveTaskSourceOwner(current, request, identity, {
          attempt: journalRow.attempt,
          state: currentJournal,
        });
        const binding = report.binding;
        requireState(binding && binding.source_scope.digest === current.work.binding.work_source_revision &&
          binding.source_scope.digest !== undefined && currentJournalScope.digest.length === 64 &&
          binding.cwd === binding.source_root,
          'observed task source binding differs from its original Work authorization or working root');
      }
      const next = snapshot(recoveringUnknown
        ? { ...action, status: 'reported', recovery_report: report, recovery_report_digest: reportDigest,
            revision: actionRow.revision + 1, updated_at: new Date().toISOString() }
        : { ...action, status: report.status === 'observed' ? 'reported' : 'unknown',
            report, report_digest: reportDigest, revision: actionRow.revision + 1, updated_at: new Date().toISOString() });
      const payload = canonicalJson(next), digest = canonicalJsonDigest(next);
      const update = this.#database.query(
        'UPDATE agent_host_task_source_binding_action SET revision=?,payload=?,digest=? WHERE workspace_id=? AND operation_id=? AND revision=? AND digest=?',
      ).run(next.revision, payload, digest, this.#workspaceId, request.operation_id, actionRow.revision, actionRow.digest);
      requireState(update.changes === 1, 'task source report compare-and-swap conflict');
      return { action: next, state_version: { revision: next.revision, digest } };
    }).immediate();
    return snapshot({ schema: 'TaskSourceBindingActionResult/v1', status: stored.action.status,
      operation_id: request.operation_id, request_id: request.request_id, action: stored.action,
      state_version: stored.state_version, command_argv: null });
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
      this.#validateProgress(before, successor, incomingLedger);
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
        this.#validateProgress(prior, { ...next, request_transition: work.request_transition ?? null }, projection);
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
      validateLifecycleProgress(current.work!, work, undefined, this.#admissionHistory(work).references);
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
  /** Continue the exact retained terminal review or wholly unissued frontier under its original attempt. */
  async continueDeliveredWork(request: DeliveredWorkContinuationRequest): Promise<DeliveredWorkContinuationResult> {
    requireState(this.#verifyDeliveredWorkContinuation, 'trusted delivered-work continuation verifier required');
    const contract = await import('./orchestration/delivered-work-continuation.js'),
      input = snapshot(contract.validateDeliveredWorkContinuationRequest(request)),
      action = input.action,
      proofBinding = contract.deliveredContinuationProofBinding(input.sourceTransition);
    requireState(
      proofBinding.maintenance_generation === undefined || input.expectedMaintenanceGeneration === proofBinding.maintenance_generation,
      'delivered continuation maintenance fence differs',
    );
    const actionId = action.kind === 'historical_terminal_review' ? action.capture.action_id : action.request.action_id,
      lookupExisting = (): DeliveredWorkContinuationReceipt | null => {
        const table = this.#database
          .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_delivered_work_continuation'")
          .get();
        if (!table) return null;
        const row = this.#database
          .query(
            'SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
          )
          .get(this.#workspaceId, input.identity.work_id, input.attempt, actionId) as {
          payload: string;
          digest: string;
        } | null;
        if (!row) return null;
        const receipt = JSON.parse(row.payload) as DeliveredWorkContinuationReceipt;
        requireState(
          canonicalJsonDigest(receipt) === row.digest &&
            receipt.schema === 'DeliveredWorkContinuationReceipt/v1' &&
            receipt.request_digest === canonicalJsonDigest(input) &&
            receipt.continuation_id === canonicalJsonDigest({
              identity: input.identity,
              attempt: input.attempt,
              action_id: actionId,
              transition_digest: input.sourceTransition.transition_digest,
            }),
          'delivered-work continuation exact retry differs from its retained receipt',
        );
        return receipt;
      },
      existing = lookupExisting();
    if (existing) {
      const current = this.readHostStateSnapshot(input.identity);
      return Object.freeze({ status: 'already_continued', snapshot: current, receipt: snapshot(existing), action: null });
    }

    const inspect = (
      current: HostStateSnapshot,
      capture: HistoricalTerminalSynthesisCaptureReceipt | null,
      journal: MastraSessionLedgerState | null,
      journalVersion: StateVersion | null,
    ): { engine: SessionBridgeSnapshot; requests: readonly SessionBridgeRequest[] } | undefined => {
      const work = current.work,
        ledger = current.ledger,
        selected = actionId;
      let projectedFrontier: { engine: SessionBridgeSnapshot; requests: readonly SessionBridgeRequest[] } | undefined;
      if (action.kind === 'configured_frontier') {
        requireState(work && ledger && current.workVersion && current.ledgerVersion && journal && journalVersion &&
          sameJson(current.workVersion, input.expectedWork) && sameJson(current.ledgerVersion, input.expectedLedger) &&
          sameJson(journalVersion, input.expectedJournal) && sameJson(workIdentity(work), input.identity) &&
          work.execution.status === 'suspended' && ['implementation', 'awaiting_followup'].includes(work.execution.phase) && work.lease === null &&
          work.lifecycle.phase === 'INTAKE' && work.lifecycle.seal === null &&
          work.lifecycle.assurance.review_generation === 0 && work.lifecycle.assurance.delivery_cycle_id === null &&
          work.binding.config_digest === input.priorConfigDigest && work.binding.runtime_code_digest === input.priorRuntimeCodeDigest &&
          work.binding.work_source_revision === journal.source_scope?.digest && work.execution.run_id === journal.run_id &&
          proofBinding.workspace_id === this.#workspaceId &&
          sameJson(proofBinding.project_ids, input.identity.project_ids) &&
          work.execution.assignment_attempts.every(entry => ['completed', 'no_effect'].includes(entry.status)),
        'original unissued frontier Work, Journal or owner differs');
        if (input.sourceTransition.status === 'closed_config_rebind_proven')
          contract.validateContinuationSourceChangePaths(work, input.authorizedSourceChanges);
        const binding = this.#configuredFrontierRepairBinding({ prior_work: work, request: input, attempt: input.attempt });
        const engine = readRetainedUnissuedSessionEngineSnapshot({
          ...binding, context: { ...binding.context, scope_digest: work.binding.work_source_revision }, runId: work.execution.run_id!,
        }, { work, journal });
        requireState(sameJson(contract.projectConfiguredFrontierContinuationAction({ engine, journal,
          targetConfigDigest: input.targetConfigDigest, currentSourceScope: input.currentSourceScope }), action),
        'unissued frontier action differs from its actual retained engine');
        projectedFrontier = { engine, requests: projectConfiguredPrewriterContinuationRequests({
          ...binding, engine, journal, currentSourceScope: input.currentSourceScope, lifecycleRisk: work.lifecycle.risk,
        }) };
      } else {
      requireState(
        work && ledger && current.workVersion && current.ledgerVersion && capture && journal && journalVersion &&
          sameJson(current.workVersion, input.expectedWork) &&
          sameJson(current.ledgerVersion, input.expectedLedger) &&
          sameJson(journalVersion, input.expectedJournal) &&
          sameJson(capture.work_version, input.expectedWork) &&
          sameJson(capture.ledger_version, input.expectedLedger) &&
          sameJson(capture.journal_version, input.expectedJournal) &&
          sameJson(workIdentity(work), input.identity) &&
          work.execution.status === 'suspended' &&
          work.execution.phase === 'awaiting_followup' &&
          work.lease === null &&
          work.lifecycle.phase === 'INTAKE' &&
          work.lifecycle.seal === null &&
          work.lifecycle.assurance.review_generation === 0 &&
          work.lifecycle.assurance.delivery_cycle_id === null &&
          work.lifecycle.next_action ===
            'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.' &&
          work.binding.config_digest === input.priorConfigDigest &&
          work.binding.runtime_code_digest === input.priorRuntimeCodeDigest &&
          input.sourceTransition.status === 'closed_config_transition_proven' &&
          proofBinding.workspace_id === this.#workspaceId &&
          input.sourceTransition.transition.fence.binding.operation_id === input.forwardOperationId &&
          sameJson(proofBinding.project_ids, input.identity.project_ids) &&
          work.binding.work_source_revision === journal.source_scope?.digest &&
          work.execution.run_id === journal.run_id &&
          !work.execution.assignment_attempts.some((attempt) => attempt.status === 'started' || attempt.status === 'uncertain') &&
          capture.schema === 'HistoricalTerminalSynthesisCustodyReceipt/v1' &&
          capture.identity.work_id === input.identity.work_id &&
          capture.attempt === input.attempt &&
          capture.action_id === selected &&
          capture.terminal_status === 'known_terminal_unaccepted' &&
          capture.task_status === 'unfinished' &&
          capture.accepted_result === false &&
          capture.rights_granted === false &&
          capture.runtime_acceptance === false &&
          capture.request.native_session_handle === input.nativeSessionHandle &&
          capture.request.user_request_pointer === input.originalRequestPointer &&
          capture.body_byte_length > 0 &&
          Buffer.from(capture.body_base64, 'base64').byteLength === capture.body_byte_length &&
          createHash('sha256').update(Buffer.from(capture.body_base64, 'base64')).digest('hex') === capture.body_sha256 &&
          actionId === action.capture.action_id &&
          action.capture.issue_id === capture.issue_id &&
          action.capture.receipt_digest === canonicalJsonDigest(capture) &&
          action.capture.body_sha256 === capture.body_sha256 &&
          action.capture.body_ref === capture.provenance.body_ref &&
          action.original_request_pointer === capture.request.user_request_pointer &&
          journal.schema === 'MastraSessionLedger/v1' &&
          journal.workspace_id === this.#workspaceId &&
          journal.work_id === input.identity.work_id &&
          journal.attempt === input.attempt &&
          journal.run_id === work.execution.run_id &&
          journal.source_scope?.digest === work.binding.work_source_revision &&
          journal.corrective_execution == null &&
          journal.research_wave_exposure === undefined &&
          input.action.workflow_id === work.binding.workflow_id &&
          input.action.request.workflow_id === work.binding.workflow_id &&
          input.action.request.run_id === work.execution.run_id &&
          input.action.request.config_digest === input.targetConfigDigest &&
          input.action.request.scope_digest === input.currentSourceScope.digest &&
          input.action.request.stage_id === 'validate_parallel' &&
          input.action.request.role === 'correctness-validator' &&
          input.action.request.assignment_index === 0 &&
          input.action.request.corrective_execution === undefined,
        'original known-terminal work, captured body, owner or current review action changed',
      );
      }
      requireState(work && ledger && journal, 'original continuation state is missing');
      requireState(
        sameJson(input.currentSourceScope.entries.map((entry) => entry.path), [...work.lifecycle.scope.allowed_paths].sort()) &&
          sameJson(
            contract.validateCurrentSourceScopeBridge({
              original: journal.source_scope!,
              current: input.currentSourceScope,
              authorizedChanges: input.authorizedSourceChanges,
            }),
            input.currentSourceScope,
          ),
        'current task Source scope is not the exact authorized beforeimage bridge',
      );
      const unresolved = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)].some(
        (item) =>
          (item.issue_id !== null && item.observation === null) ||
          item.host_reservation !== undefined ||
          item.research_activation !== undefined ||
          item.research_normalization !== undefined,
      );
      requireState(!unresolved, 'issued or reserved action has an unresolved outcome and cannot be reissued');
      if (action.kind === 'configured_frontier') {
        contract.validateConfiguredFrontierOwnerRelease({ work, ledger, identity: input.identity, nativeSessionHandle: input.nativeSessionHandle });
      } else {
        const release = ledger.operations.at(-1),
          priorTicket = release && ledger.tickets.find((entry) => entry.ticket_id === release.ticket_id),
          priorClaims = priorTicket && ledger.claims.filter((entry) => entry.ticket_id === priorTicket.ticket_id);
        requireState(
          priorTicket?.status === 'released' &&
            priorTicket.work_id === input.identity.work_id &&
            priorTicket.repository_id === input.identity.repository_id &&
            sameJson(priorTicket.project_ids, input.identity.project_ids) &&
            priorTicket.integrations_digest === input.identity.integrations_digest &&
            priorTicket.thread_id === input.nativeSessionHandle &&
            priorTicket.source_revision === work.binding.work_source_revision &&
            priorTicket.exclusive_resources.length === 1 &&
            priorTicket.exclusive_resources[0] === 'execution:' + input.identity.work_id &&
            priorTicket.expires_at === null &&
            priorClaims?.length === 1 &&
            priorClaims[0]!.status === 'released' &&
            priorClaims[0]!.thread_id === input.nativeSessionHandle &&
            priorClaims[0]!.work_id === input.identity.work_id &&
            release?.kind === 'release' &&
            release.ticket_id === priorTicket.ticket_id &&
            release.work_id === input.identity.work_id &&
            release.thread_id === input.nativeSessionHandle &&
            release.source_revision === work.binding.work_source_revision &&
            release.decision_pointer === input.originalRequestPointer &&
            capture !== null && validGateVersion(capture.request.expected_ledger) && release.from_ledger_revision === capture.request.expected_ledger.revision &&
            release.to_ledger_revision === input.expectedLedger.revision &&
            !ledger.tickets.some(
              (ticket) =>
                ticket.ticket_id !== priorTicket.ticket_id &&
                ['active', 'queued', 'ready_for_handoff', 'blocked'].includes(ticket.status) &&
                ticket.exclusive_resources.some((resource) => priorTicket.exclusive_resources.includes(resource)),
            ),
          'original execution owner release or FIFO position changed',
        );
      }
      return projectedFrontier;
    };

    const first = this.readHostStateSnapshot(input.identity),
      capture = action.kind === 'historical_terminal_review' ? this.readHistoricalTerminalSynthesisCapture(input.identity, input.attempt, actionId) : null,
      journalRow = this.#database
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
        revision: number;
        payload: string;
        digest: string;
      } | null,
      firstJournal = journalRow ? (JSON.parse(journalRow.payload) as MastraSessionLedgerState) : null,
      firstJournalVersion = journalRow ? { revision: journalRow.revision, digest: journalRow.digest } : null;
    this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
    inspect(first, capture, firstJournal, firstJournalVersion);
    const expectedAuthorization = {
      schema: 'VidaDeliveredWorkContinuationAuthorization/v1' as const,
      request_digest: canonicalJsonDigest(input),
      principal: this.deliveredWorkContinuationPrincipal!,
      transition_digest: input.sourceTransition.transition_digest,
      action_digest: canonicalJsonDigest(input.action),
    };
    const authorization = contract.validateDeliveredWorkContinuationAuthorization(
      snapshot(await this.#verifyDeliveredWorkContinuation(input, first)),
      input,
      this.deliveredWorkContinuationPrincipal!,
    );
    requireState(
      canonicalJsonDigest(authorization) === canonicalJsonDigest(expectedAuthorization),
      'trusted Source continuation authorization differs from the accepted transition',
    );

    requireState(!this.#database.inTransaction, 'nested delivered-work continuation transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.assertSessionProducerWriteAllowed();
      this.#assertMaintenanceAvailable();
      this.#assertReconciliationWritesAllowed();
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      const current = this.#read(input.identity),
        currentCapture = action.kind === 'historical_terminal_review' ? this.readHistoricalTerminalSynthesisCapture(input.identity, input.attempt, actionId) : null,
        currentJournalRow = this.#database
          .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
          .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
          revision: number;
          payload: string;
          digest: string;
        } | null,
        currentJournal = currentJournalRow ? (JSON.parse(currentJournalRow.payload) as MastraSessionLedgerState) : null,
        currentJournalVersion = currentJournalRow
          ? { revision: currentJournalRow.revision, digest: currentJournalRow.digest }
          : null;
      const projectedFrontier = inspect(current, currentCapture, currentJournal, currentJournalVersion);
      const work = current.work!,
        ledger = current.ledger!,
        priorTicket = action.kind === 'configured_frontier'
          ? contract.validateConfiguredFrontierOwnerRelease({ work, ledger, identity: input.identity, nativeSessionHandle: input.nativeSessionHandle }).ticket
          : ledger.tickets.find((ticket) => ticket.status === 'released' && ticket.thread_id === input.nativeSessionHandle && ticket.source_revision === work.binding.work_source_revision && ticket.exclusive_resources.length === 1 && ticket.exclusive_resources[0] === 'execution:' + input.identity.work_id)!,
        priorClaim = ledger.claims.find((claim) => claim.ticket_id === priorTicket.ticket_id && claim.status === 'released')!,
        sequence = ledger.next_sequence,
        generation = ledger.open_generation,
        ticketId = 'ticket-' + canonicalJsonDigest({
          identity: input.identity,
          nativeSessionHandle: input.nativeSessionHandle,
          sequence,
          generation,
          continuation: input.sourceTransition.transition_digest,
        }).slice(0, 40),
        claimId = 'claim-' + canonicalJsonDigest({ ticket_id: ticketId, source: input.currentSourceScope.digest }).slice(0, 40),
        now = new Date().toISOString(),
        expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        resources = [...priorTicket.exclusive_resources],
        ticket = {
          ...priorTicket,
          ticket_id: ticketId,
          generation,
          sequence,
          source_revision: input.currentSourceScope.digest,
          status: 'active' as const,
          claim_ids: [claimId],
          expires_at: expiresAt,
          active_resources: resources,
          blocked_resources: [],
          created_at: now,
        },
        claim = {
          ...priorClaim,
          claim_id: claimId,
          ticket_id: ticketId,
          generation,
          status: 'active' as const,
          lease_expires_at: expiresAt,
          created_at: now,
          renewed_at: now,
        },
        nextLedger = checkedLedger({
          ...ledger,
          revision: ledger.revision + 1,
          next_sequence: sequence + 1,
          tickets: [...ledger.tickets, ticket],
          claims: [...ledger.claims, claim],
        }),
        sourceChanged = work.binding.work_source_revision !== input.currentSourceScope.digest,
        nextBinding = {
          ...work.binding,
          config_digest: input.targetConfigDigest,
          work_source_revision: input.currentSourceScope.digest,
          runtime_source_revision: input.targetRuntimeCodeDigest,
          runtime_code_digest: input.targetRuntimeCodeDigest,
          schema_digest: input.targetSchemaDigest,
        },
        nextJournal: MastraSessionLedgerState = {
          ...currentJournal!,
          step_id: projectedFrontier ? projectedFrontier.engine.step_id : input.action.request.stage_id,
          source_scope: input.currentSourceScope,
          items: (projectedFrontier ? projectedFrontier.requests : [input.action.request]).map(request => ({ request, issue_id: null, observation: null })),
          completed: projectedFrontier ? currentJournal!.completed : [
            ...currentJournal!.completed,
            ...(currentJournal!.items.length > 0 && currentJournal!.step_id
              ? [{ step_id: currentJournal!.step_id, items: currentJournal!.items }]
              : []),
          ],
        },
        nextWork: WorkState = {
          ...work,
          revision: work.revision + 1,
          binding: nextBinding,
          lease: { ticket_id: ticketId, thread_id: input.nativeSessionHandle, generation },
          execution: { ...work.execution, phase: 'review', status: 'active' },
          lifecycle: {
            ...work.lifecycle,
            revision: work.revision + 1,
            source_revision: input.currentSourceScope.digest,
            ...(!projectedFrontier ? { next_action:
              'Review the retained known-terminal body against the current Source/configuration; the body remains unaccepted and the work remains unfinished.' } : {}),
            config_binding: {
              config_digest: input.targetConfigDigest,
              schema_digest: input.targetSchemaDigest,
              runtime_code_digest: input.targetRuntimeCodeDigest,
            },
            ...(!projectedFrontier && sourceChanged
              ? {
                  references: work.lifecycle.references.map((reference) => ({
                    ...reference,
                    source_revision: input.currentSourceScope.digest,
                    disposition: 'retired' as const,
                  })),
                }
              : {}),
          },
        };
      const journalVersion = {
          revision: currentJournalVersion!.revision + 1,
          digest: canonicalJsonDigest(nextJournal),
        },
        priorWorkVersion = current.workVersion!,
        priorLedgerVersion = current.ledgerVersion!,
        workVersion = version(nextWork)!,
        ledgerVersion = version(nextLedger)!;
      const receipt: DeliveredWorkContinuationReceipt = {
        schema: 'DeliveredWorkContinuationReceipt/v1',
        continuation_id: canonicalJsonDigest({
          identity: input.identity,
          attempt: input.attempt,
          action_id: actionId,
          transition_digest: input.sourceTransition.transition_digest,
        }),
        attempt: input.attempt,
        request_digest: canonicalJsonDigest(input),
        authorization,
        request: input,
        prior_work: work,
        prior_ledger: ledger,
        prior_journal: currentJournal!,
        prior_work_version: priorWorkVersion,
        prior_ledger_version: priorLedgerVersion,
        prior_journal_version: currentJournalVersion!,
        ...(projectedFrontier ? { historical_capture: null, frontier_snapshot: {
          snapshot_bytes_base64: Buffer.from(canonicalJson(projectedFrontier.engine)).toString('base64'),
          snapshot_sha256: createHash('sha256').update(canonicalJson(projectedFrontier.engine)).digest('hex'),
        } } : { historical_capture: currentCapture! }),
        successor_work: nextWork,
        successor_ledger: nextLedger,
        successor_binding: nextBinding,
        successor_journal: nextJournal,
        work_version: workVersion,
        ledger_version: ledgerVersion,
        journal_version: journalVersion,
        rights_granted: false,
        accepted_result: false,
        runtime_acceptance: false,
        status: 'action_ready',
      };
      requireState(
        receipt.work_version.revision === priorWorkVersion.revision + 1 &&
          receipt.ledger_version.revision === priorLedgerVersion.revision + 1 &&
          sameJson(this.#checkedWork(nextWork, receipt), nextWork),
        'delivered-work successor state is invalid',
      );
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_delivered_work_continuation (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,action_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
      );
      this.#database
        .query('INSERT INTO agent_host_delivered_work_continuation VALUES(?,?,?,?,?,?)')
        .run(
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          actionId,
          canonicalJson(receipt),
          canonicalJsonDigest(receipt),
        );
      for (const [kind, id, value, expected] of [
        ['work', identityKey(input.identity), nextWork, priorWorkVersion],
        ['ledger', 'shared', nextLedger, priorLedgerVersion],
      ] as const) {
        const changed = this.#database
          .query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=? AND id=? AND revision=? AND digest=?')
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
        requireState(changed.changes === 1, `delivered-work ${kind} CAS conflict`);
      }
      const journalChanged = this.#database
        .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?')
        .run(
          journalVersion.revision,
          canonicalJson(nextJournal),
          journalVersion.digest,
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          input.expectedJournal.revision,
          input.expectedJournal.digest,
        );
      requireState(journalChanged.changes === 1, 'delivered-work Journal CAS conflict');
      this.#onReconciledWorkWrite(input.identity, current.workVersion, workVersion);
      const saved = this.#read(input.identity);
      requireState(
        sameJson(saved.workVersion, workVersion) &&
          sameJson(saved.ledgerVersion, ledgerVersion) &&
          canonicalJsonDigest(nextJournal) === journalVersion.digest,
        'delivered-work continuation did not persist its exact successor state',
      );
      return Object.freeze({ status: 'continued' as const, snapshot: saved, receipt: snapshot(receipt), action: snapshot(input.action) });
    }).immediate();
  }
  #configuredFrontierRepairBinding(receipt: Pick<ConfiguredFrontierReceipt, 'prior_work' | 'request' | 'attempt'>) {
    requireState(this.#repositoryRoot, 'configured-frontier repair requires the configured repository root');
    const root = this.#repositoryRoot, config = loadRuntimeConfig(root), original = receipt.prior_work,
      identity = receipt.request.identity;
    const project = loadProjectSetContext(root, config, identity.repository_id, identity.project_ids);
    requireState(runtimeConfigDigest(config) === receipt.request.targetConfigDigest &&
      project.integrations_digest === identity.integrations_digest &&
      sameJson(project.project_ids, identity.project_ids), 'configured-frontier repair current configuration or project differs');
    const intakes = original.artifacts.filter(entry => entry.artifact_id === 'local-session-intake' && entry.schema === 'VidaLocalSessionIntake/v1');
    requireState(intakes.length === 1, 'configured-frontier repair requires the original accepted intake');
    const reference = intakes[0]!, bytes = requireSafeRepositoryAccess(root).readBytes(reference.path, 'configured-frontier accepted intake');
    requireState(bytes.length <= 32768 && createHash('sha256').update(bytes).digest('hex') === reference.sha256,
      'configured-frontier repair original intake bytes differ');
    const intake = JSON.parse(bytes.toString('utf8')) as {
      schema: string; native_session_handle: string; risk: string;
      work_item: { schema: string; id: string; canonical_kind: WorkItemSelection['kind']; intent: WorkItemSelection['intent']; project_id: string; risk_flags: string[]; labels: string[] };
    }, item = intake.work_item;
    requireState(intake.schema === 'VidaLocalSessionIntake/v1' && item?.schema === 'WorkItem/v1' &&
      intake.native_session_handle === receipt.request.nativeSessionHandle &&
      intake.risk === original.lifecycle.risk && item.id === identity.work_id &&
      identity.project_ids.includes(item.project_id) &&
      canonicalJsonDigest(item) === original.binding.work_item_digest &&
      Array.isArray(item.risk_flags) && Array.isArray(item.labels),
    'configured-frontier repair original task or attribution differs');
    const selection: WorkItemSelection = {
      team: original.binding.team_id, kind: item.canonical_kind, intent: item.intent, project: item.project_id,
      risk_flags: [...item.risk_flags], labels: [...item.labels],
    };
    requireState(selectWorkflow(config, selection).workflow_id === original.binding.workflow_id &&
      receipt.request.action.workflow_id === original.binding.workflow_id,
    'configured-frontier repair original workflow differs');
    return { repositoryRoot: root, config, selection,
      context: { work_id: identity.work_id, attempt: receipt.attempt, scope_digest: receipt.request.currentSourceScope.digest },
      workflowId: original.binding.workflow_id };
  }
  #inspectDeliveredWorkContinuationRepairInTransaction(
    identity: WorkIdentity,
    attempt: number,
    actionId: string,
  ): DeliveredContinuationRepairInspection {
    requireState(
      Number.isSafeInteger(attempt) && attempt > 0 && hashPattern.test(actionId),
      'delivered-work continuation repair identity invalid',
    );
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_delivered_work_continuation'")
      .get();
    requireState(table, 'delivered-work continuation repair row is missing');
    const row = this.#database
      .query(
        'SELECT payload,digest,action_id,attempt FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      )
      .get(this.#workspaceId, identity.work_id, attempt, actionId) as {
      payload: string;
      digest: string;
      action_id: string;
      attempt: number;
    } | null;
    requireState(
      row && row.action_id === actionId && row.attempt === attempt && hashPattern.test(row.digest),
      'delivered-work continuation repair row identity or digest invalid',
    );
    const receipt = JSON.parse(row.payload) as DeliveredWorkContinuationReceipt;
    assertCanonicalJsonValue(receipt, '$.continuationRepair');
    const afterDigest = canonicalJsonDigest(receipt);
    requireState(
      row.payload === canonicalJson(receipt) && row.digest !== afterDigest,
      'delivered-work continuation repair is limited to a stale stored digest',
    );
    const overlay: DeliveredContinuationRepairDigestOverlay = {
      work_id: identity.work_id,
      attempt,
      action_id: actionId,
      before_digest: row.digest,
      after_digest: afterDigest,
    };
    const current = this.#read(identity, false, overlay);
    const journalRow = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, identity.work_id, attempt) as {
      revision: number;
      payload: string;
      digest: string;
    } | null;
    requireState(journalRow, 'delivered-work continuation repair Journal is missing');
    const journal = JSON.parse(journalRow.payload) as MastraSessionLedgerState;
    assertCanonicalJsonValue(journal, '$.continuationRepair.journal');
    if (receipt.request.action.kind === 'configured_frontier') {
      requireState(receipt.historical_capture === null && receipt.frontier_snapshot !== undefined &&
        receipt.request.action.request.action_id === actionId && receipt.attempt === attempt &&
        current.work && current.ledger && current.workVersion && current.ledgerVersion &&
        journalRow.payload === canonicalJson(journal) && journalRow.digest === canonicalJsonDigest(journal),
      'configured-frontier repair dependency or action identity differs');
      validateConfiguredFrontierRepairReceipt({
        receipt: receipt as ConfiguredFrontierReceipt,
        current: { work: current.work, work_version: current.workVersion, ledger: current.ledger,
          ledger_version: current.ledgerVersion, journal,
          journal_version: { revision: journalRow.revision, digest: journalRow.digest } },
        prewriterBinding: this.#configuredFrontierRepairBinding(receipt as ConfiguredFrontierReceipt),
      });
    } else {
    requireState(
      journalRow.payload === canonicalJson(journal) &&
        journalRow.digest === canonicalJsonDigest(journal) &&
        receipt.request.action.kind === 'historical_terminal_review' &&
        receipt.request.action.capture.action_id === actionId &&
        receipt.attempt === attempt &&
        current.work && current.ledger && current.workVersion && current.ledgerVersion &&
        sameJson(current.work, receipt.successor_work) &&
        sameJson(current.ledger, receipt.successor_ledger) &&
        sameJson(current.workVersion, receipt.work_version) &&
        sameJson(current.ledgerVersion, receipt.ledger_version) &&
        journalRow.revision === receipt.journal_version.revision &&
        journalRow.digest === receipt.journal_version.digest &&
        sameJson(journal, receipt.successor_journal) &&
        journal.corrective_execution == null &&
        journal.research_wave_exposure === undefined &&
        journal.items.length === 1 &&
        journal.items[0]?.request.action_id === receipt.request.action.request.action_id &&
        journal.items[0]?.issue_id === null &&
        journal.items[0]?.observation === null &&
        journal.items[0]?.host_reservation === undefined &&
        journal.items[0]?.research_activation === undefined &&
        journal.items[0]?.research_normalization === undefined &&
        receipt.request.action.request.corrective_execution === undefined &&
        current.work.execution.assignment_attempts.every((attempt) => !['started', 'uncertain'].includes(attempt.status)) &&
        typeof receipt.request.sourceTransition?.transition_digest === 'string' &&
        hashPattern.test(receipt.request.sourceTransition.transition_digest) &&
        receipt.authorization.transition_digest === receipt.request.sourceTransition.transition_digest,
      'delivered-work continuation repair dependency, transition or unissued action differs',
    );
    }
    return snapshot({
      schema: 'DeliveredWorkContinuationRepairInspection/v1' as const,
      workspace_id: this.#workspaceId,
      identity,
      attempt,
      action_id: actionId,
      row: { payload: row.payload, before_digest: row.digest, after_digest: afterDigest },
      work: current.work,
      work_version: current.workVersion,
      ledger: current.ledger,
      ledger_version: current.ledgerVersion,
      journal: { revision: journalRow.revision, payload: journalRow.payload, digest: journalRow.digest, state: journal },
      maintenance_generation: current.maintenanceGeneration,
      transition_digest: receipt.request.sourceTransition.transition_digest,
    });
  }
  inspectDeliveredWorkContinuationRepair(
    identity: WorkIdentity,
    attempt: number,
    actionId: string,
  ): DeliveredContinuationRepairInspection {
    requireState(!this.#database.inTransaction, 'nested delivered-work continuation repair inspection forbidden');
    return this.#database
      .transaction(() => this.#inspectDeliveredWorkContinuationRepairInTransaction(identity, attempt, actionId))
      .deferred();
  }
  #validateDeliveredContinuationRepairPlan(value: unknown): DeliveredContinuationRepairPlan {
    requireState(value !== null && typeof value === 'object' && !Array.isArray(value), 'repair plan object required');
    const plan = value as DeliveredContinuationRepairPlan,
      { digest, ...body } = plan;
    requireState(
      exactJsonKeys(plan, ['schema', 'branch', 'repair_id', 'actor', 'timestamp', 'inspection', 'digest']) &&
        exactJsonKeys(plan.inspection, [
          'schema', 'workspace_id', 'identity', 'attempt', 'action_id', 'row', 'work', 'work_version',
          'ledger', 'ledger_version', 'journal', 'maintenance_generation', 'transition_digest',
        ]) &&
        exactJsonKeys(plan.inspection.identity, ['repository_id', 'project_ids', 'integrations_digest', 'work_id']) &&
        exactJsonKeys(plan.inspection.row, ['payload', 'before_digest', 'after_digest']) &&
        exactJsonKeys(plan.inspection.work_version, ['revision', 'digest']) &&
        exactJsonKeys(plan.inspection.ledger_version, ['revision', 'digest']) &&
        exactJsonKeys(plan.inspection.journal, ['revision', 'payload', 'digest', 'state']) &&
        plan.schema === 'DeliveredWorkContinuationIntegrityRepairPlan/v1' &&
        ['historical_terminal_review', 'configured_frontier'].includes(plan.branch) &&
        JSON.parse(plan.inspection.row.payload).request.action.kind === plan.branch &&
        typeof plan.repair_id === 'string' && /^[a-z0-9][a-z0-9._-]{0,79}$/.test(plan.repair_id) &&
        typeof plan.actor === 'string' && plan.actor.trim().length > 0 && plan.actor === plan.actor.trim() &&
        plan.actor.length <= 256 && !/\p{Cc}/u.test(plan.actor) &&
        rfc3339TimestampMilliseconds(plan.timestamp) !== null &&
        plan.inspection?.schema === 'DeliveredWorkContinuationRepairInspection/v1' &&
        plan.inspection.workspace_id === this.#workspaceId &&
        typeof digest === 'string' && hashPattern.test(digest) && canonicalJsonDigest(body) === digest,
      'delivered-work continuation repair plan is malformed or changed',
    );
    return plan;
  }
  #deliveredContinuationRepairOperationKey(plan: DeliveredContinuationRepairPlan): string {
    return canonicalJsonDigest({
      repair_id: plan.repair_id,
      workspace_id: plan.inspection.workspace_id,
      work_id: plan.inspection.identity.work_id,
      attempt: plan.inspection.attempt,
      action_id: plan.inspection.action_id,
    });
  }
  reserveDeliveredWorkContinuationRepair(value: unknown): OperationReservation {
    const plan = this.#validateDeliveredContinuationRepairPlan(value),
      operationKey = this.#deliveredContinuationRepairOperationKey(plan);
    requireState(!this.#database.inTransaction, 'nested delivered-work continuation repair reservation forbidden');
    // Exact own-operation retries are resolved before the shared producer gate observes this repair's
    // RESERVED/UNKNOWN marker. The check is read-only and permits no other pending repair or producer.
    const ownRetry = this.#database
      .transaction(() => {
        const existing = this.#governanceRead(deliveredContinuationRepairStore, 'operation', operationKey);
        if (!existing) return null;
        const operation = existing.record as OperationReservation;
        requireState(operation.request_digest === plan.digest, 'delivered-work continuation repair retry differs');
        this.#assertNoPendingSessionProducer();
        this.#assertNoPendingDeliveredContinuationRepair(operationKey);
        return snapshot(operation);
      })
      .deferred();
    if (ownRetry) return ownRetry;
    return this.#transactionWithProducerFence(() => {
      this.#assertReconciliationWritesAllowed();
      this.#assertMaintenanceGeneration(plan.inspection.maintenance_generation);
      // The shared immediate writer gate serializes this reservation with every producer.
      // Recheck explicitly before recording RESERVED so an active/UNKNOWN producer cannot race it.
      this.#assertNoPendingSessionProducer();
      const current = this.#inspectDeliveredWorkContinuationRepairInTransaction(
        plan.inspection.identity,
        plan.inspection.attempt,
        plan.inspection.action_id,
      );
      requireState(sameJson(current, plan.inspection), 'delivered-work continuation repair beforeimage changed');
      const existing = this.#governanceRead(deliveredContinuationRepairStore, 'operation', operationKey);
      if (existing) {
        const operation = existing.record as OperationReservation;
        requireState(operation.request_digest === plan.digest, 'delivered-work continuation repair retry differs');
        requireState(operation.status === 'applied', 'repair is already reserved or UNKNOWN; resume that exact plan');
        return snapshot(operation);
      }
      this.#governanceGeneration(deliveredContinuationRepairStore, true);
      const record: OperationReservation = {
        schema: 'OperationReservation/v1',
        store_id: deliveredContinuationRepairStore,
        operation_key: operationKey,
        revision: 1,
        fencing_token: randomUUID(),
        status: 'reserved',
        created_at: new Date().toISOString(),
        request_digest: plan.digest,
      };
      this.#governanceWrite('operation', operationKey, record, null);
      return snapshot(record);
    }).immediate();
  }
  applyDeliveredWorkContinuationRepair(value: unknown): { readonly status: 'applied' | 'already_applied'; readonly digest: string } {
    const plan = this.#validateDeliveredContinuationRepairPlan(value),
      operationKey = this.#deliveredContinuationRepairOperationKey(plan),
      { identity, attempt, action_id: actionId } = plan.inspection;
    requireState(!this.#database.inTransaction, 'nested delivered-work continuation repair apply forbidden');
    // Persist UNKNOWN in its own transaction before the only row effect. A restart resumes this exact plan.
    this.#database.transaction(() => {
      this.#assertNoPendingSessionProducer();
      const stored = this.#governanceRead(deliveredContinuationRepairStore, 'operation', operationKey);
      requireState(stored, 'delivered-work continuation repair reservation is missing');
      const current = stored.record as OperationReservation;
      requireState(current.request_digest === plan.digest, 'delivered-work continuation repair plan changed');
      if (current.status === 'reserved')
        this.#governanceWrite(
          'operation',
          operationKey,
          { ...current, status: 'commit_unknown', terminal_revision: 2 },
          stored,
        );
      else requireState(current.status === 'commit_unknown' || current.status === 'applied', 'repair operation is terminally denied');
    }).immediate();
    return this.#database.transaction(() => {
      this.#assertNoPendingSessionProducer();
      const stored = this.#governanceRead(deliveredContinuationRepairStore, 'operation', operationKey);
      requireState(stored, 'delivered-work continuation repair reservation is missing');
      const operation = stored.record as OperationReservation;
      requireState(operation.request_digest === plan.digest, 'delivered-work continuation repair plan changed');
      if (operation.status === 'applied') {
        const row = this.#database
          .query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?')
          .get(this.#workspaceId, identity.work_id, attempt, actionId) as { payload: string; digest: string } | null;
        const current = this.#read(identity),
          journal = this.#database
            .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
            .get(this.#workspaceId, identity.work_id, attempt) as { revision: number; payload: string; digest: string } | null;
        requireState(
          row && row.payload === plan.inspection.row.payload && row.digest === plan.inspection.row.after_digest &&
            operation.result_digest === canonicalJsonDigest({ payload: row.payload, digest: row.digest }) &&
            current.work && current.ledger &&
            sameJson(current.work, plan.inspection.work) && sameJson(current.ledger, plan.inspection.ledger) &&
            sameJson(current.workVersion, plan.inspection.work_version) &&
            sameJson(current.ledgerVersion, plan.inspection.ledger_version) &&
            current.maintenanceGeneration === plan.inspection.maintenance_generation &&
            journal?.revision === plan.inspection.journal.revision &&
            journal.payload === plan.inspection.journal.payload &&
            journal.digest === plan.inspection.journal.digest,
          'applied delivered-work continuation repair afterimage differs',
        );
        return { status: 'already_applied' as const, digest: row.digest };
      }
      requireState(operation.status === 'commit_unknown', 'delivered-work continuation repair is not UNKNOWN');
      const current = this.#inspectDeliveredWorkContinuationRepairInTransaction(identity, attempt, actionId);
      requireState(sameJson(current, plan.inspection), 'delivered-work continuation repair dependency CAS changed');
      const changed = this.#database
        .query('UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=? AND payload=? AND digest=?')
        .run(
          plan.inspection.row.after_digest,
          this.#workspaceId,
          identity.work_id,
          attempt,
          actionId,
          plan.inspection.row.payload,
          plan.inspection.row.before_digest,
        );
      requireState(changed.changes === 1, 'delivered-work continuation repair row CAS changed');
      const after = this.#read(identity);
      requireState(
        after.work && after.ledger && sameJson(after.work, plan.inspection.work) && sameJson(after.ledger, plan.inspection.ledger),
        'delivered-work continuation repair changed linked state',
      );
      const resultDigest = canonicalJsonDigest({ payload: plan.inspection.row.payload, digest: plan.inspection.row.after_digest });
      this.#governanceWrite(
        'operation',
        operationKey,
        { ...operation, status: 'applied', terminal_revision: 3, result_digest: resultDigest },
        stored,
      );
      return { status: 'applied' as const, digest: plan.inspection.row.after_digest };
    }).immediate();
  }
  /** Read immutable continuation custody after current journal progress; this grants no execution. */
  readDeliveredWorkContinuationReceipt(identity: WorkIdentity, attempt: number): DeliveredWorkContinuationReceipt | null {
    requireState(Number.isSafeInteger(attempt) && attempt > 0 && !this.#database.inTransaction,
      'delivered-work receipt inspection requires a valid nonnested attempt');
    return this.#database.transaction(() => this.#readDeliveredWorkContinuationReceipt(identity, attempt)).deferred();
  }
  #readDeliveredWorkContinuationReceipt(identity: WorkIdentity, attempt: number): DeliveredWorkContinuationReceipt | null {
    this.#assertNoPendingDeliveredContinuationRepair();
    const current = this.#read(identity);
    if (!current.work) return null;
    const table = this.#database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_delivered_work_continuation'").get();
    if (!table) return null;
    const rows = this.#database.query('SELECT payload,digest,action_id FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=?')
      .all(this.#workspaceId, identity.work_id, attempt) as { payload: string; digest: string; action_id: string }[];
    requireState(rows.length <= 1, 'delivered-work receipt identity is ambiguous');
    if (rows.length === 0) return null;
    const row = rows[0]!, receipt = JSON.parse(row.payload) as DeliveredWorkContinuationReceipt,
      action = receipt.request.action;
    requireState(row.payload === canonicalJson(receipt) && row.digest === canonicalJsonDigest(receipt) &&
      sameJson(receipt.request.identity, identity) && receipt.attempt === attempt &&
      receipt.request_digest === canonicalJsonDigest(receipt.request) &&
      sameJson(current.work.binding, receipt.successor_binding) &&
      (action.kind === 'configured_frontier' ? action.request.action_id === row.action_id : action.capture.action_id === row.action_id),
    'delivered-work receipt or current binding differs');
    return snapshot(receipt);
  }
  /** Read the current retained review/prewriter wave for this original Work attempt. */
  readDeliveredWorkContinuation(identity: WorkIdentity, attempt: number): DeliveredWorkContinuationLookup | null {
    requireState(Number.isSafeInteger(attempt) && attempt > 0, 'delivered-work continuation attempt is invalid');
    requireState(!this.#database.inTransaction, 'nested delivered-work continuation inspection forbidden');
    this.#assertNoPendingDeliveredContinuationRepair();
    const current = this.readHostStateSnapshot(identity);
    if (!current.work || !current.workVersion) return null;
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_delivered_work_continuation'")
      .get();
    if (!table) return null;
    const rows = this.#database
      .query(
        'SELECT payload,digest,action_id FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .all(this.#workspaceId, identity.work_id, attempt) as { payload: string; digest: string; action_id: string }[];
    requireState(rows.length <= 1, 'delivered-work continuation lookup is ambiguous for this attempt');
    if (rows.length === 0) return null;
    const row = rows[0]!,
      receipt = JSON.parse(row.payload) as DeliveredWorkContinuationReceipt;
    requireState(
      canonicalJsonDigest(receipt) === row.digest &&
        receipt.schema === 'DeliveredWorkContinuationReceipt/v1' &&
        receipt.status === 'action_ready' &&
        receipt.request_digest === canonicalJsonDigest(receipt.request) &&
        receipt.attempt === attempt &&
        sameJson(receipt.request.identity, identity) &&
        ((receipt.request.action.kind === 'historical_terminal_review' &&
          receipt.request.action.capture.action_id === row.action_id &&
          receipt.request.action.request.action_id !== row.action_id) ||
         (receipt.request.action.kind === 'configured_frontier' &&
          receipt.request.action.request.action_id === row.action_id)) &&
        current.work.binding &&
        sameJson(current.work.binding, receipt.successor_binding),
      'delivered-work continuation lookup receipt or current Work binding differs',
    );
    const work = current.work!,
      ledger = current.ledger,
      lease = work.lease,
      executionResource = `execution:${identity.work_id}`,
      ticket = lease && ledger?.tickets.find((entry) => entry.ticket_id === lease.ticket_id),
      claims = ticket && ledger ? ledger.claims.filter((entry) => entry.ticket_id === ticket.ticket_id) : [],
      resources = receipt.request.action.kind === 'configured_frontier'
        ? [executionResource, ...receipt.prior_work.binding.implementation_paths.map(path => 'file:' + path)].sort()
        : [executionResource],
      now = Date.now();
    requireState(
      ledger &&
        work.execution.status === 'active' &&
        work.execution.phase === 'review' &&
        work.lifecycle.phase === 'INTAKE' &&
        work.lifecycle.seal === null &&
        lease?.thread_id === receipt.request.nativeSessionHandle &&
        ticket?.status === 'active' &&
        ticket.work_id === identity.work_id &&
        ticket.thread_id === receipt.request.nativeSessionHandle &&
        ticket.source_revision === receipt.request.currentSourceScope.digest &&
        sameJson(ticket.exclusive_resources, resources) &&
        sameJson(ticket.active_resources, resources) &&
        ticket.expires_at !== null &&
        Date.parse(ticket.expires_at) > now &&
        claims.length === 1 &&
        claims[0]!.status === 'active' &&
        claims[0]!.thread_id === receipt.request.nativeSessionHandle &&
        claims[0]!.work_id === identity.work_id &&
        sameJson(claims[0]!.resources, resources) &&
        Date.parse(claims[0]!.lease_expires_at) > now &&
        !ledger.tickets.some(
          (candidate) =>
            candidate.ticket_id !== ticket.ticket_id &&
            (receipt.request.action.kind === 'configured_frontier'
              ? (['active', 'ready_for_handoff', 'blocked'].includes(candidate.status) || candidate.status === 'queued' && candidate.sequence < ticket.sequence) &&
                candidate.exclusive_resources.some(resource => resources.includes(resource))
              : candidate.sequence < ticket.sequence && ['active', 'queued', 'ready_for_handoff', 'blocked'].includes(candidate.status) &&
                candidate.exclusive_resources.includes(executionResource)),
        ),
      'delivered-work continuation original owner lease or FIFO position is no longer current',
    );
    const journalRow = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, identity.work_id, attempt) as {
      revision: number;
      payload: string;
      digest: string;
    } | null;
    requireState(journalRow, 'delivered-work continuation has no retained original-attempt Journal');
    const journal = JSON.parse(journalRow.payload) as MastraSessionLedgerState,
      version = { revision: journalRow.revision, digest: journalRow.digest };
    validateWorkSessionBinding(current.work, journal, this.#repositoryRoot);
    requireState(
      Number.isSafeInteger(journalRow.revision) &&
        journalRow.revision > 0 &&
        journal.schema === 'MastraSessionLedger/v1' &&
        journal.workspace_id === this.#workspaceId &&
        journal.work_id === identity.work_id &&
        journal.attempt === attempt &&
        journal.run_id === current.work.execution.run_id &&
        canonicalJsonDigest(journal) === journalRow.digest,
      'delivered-work continuation Journal identity or digest differs',
    );
    if (receipt.request.action.kind === 'configured_frontier') {
      requireState(receipt.historical_capture === null && receipt.frontier_snapshot !== undefined,
        'configured-frontier lookup immutable beforeimage is missing');
      const frontier = receipt as ConfiguredFrontierReceipt,
        engine = JSON.parse(Buffer.from(frontier.frontier_snapshot.snapshot_bytes_base64, 'base64').toString('utf8')),
        requests = projectConfiguredPrewriterContinuationRequests({
          ...this.#configuredFrontierRepairBinding(frontier), engine, journal: frontier.prior_journal,
          currentSourceScope: frontier.request.currentSourceScope, lifecycleRisk: frontier.prior_work.lifecycle.risk,
        });
      if (journal.step_id !== 'wave-' + frontier.request.action.request.wave_index) {
        const prewriter = journal.completed[frontier.prior_journal.completed.length];
        requireState(prewriter && prewriter.step_id === 'wave-' + frontier.request.action.request.wave_index &&
          sameJson(journal.completed.slice(0, frontier.prior_journal.completed.length), frontier.prior_journal.completed) &&
          prewriter.items.length === requests.length && prewriter.items.every((item, index) =>
            sameJson(item.request, requests[index]) && item.issue_id !== null && item.observation?.status === 'reported_complete' &&
            item.observation.issue_id === item.issue_id && item.observation.action_id === item.request.action_id &&
            item.observation.output_digest === canonicalJsonDigest(item.observation.summary)),
        'configured continuation current prewriter history is incomplete or changed');
        const binding = this.#configuredFrontierRepairBinding(frontier),
          engine = readConfiguredContinuationSessionEngineSnapshot({ ...binding, runId: frontier.prior_work.execution.run_id! }, frontier);
        requireState(engine.run_id === journal.run_id && engine.step_id === journal.step_id &&
          sameJson(engine.requests, journal.items.map(item => item.request)) &&
          sameJson(engine.observations, journal.completed.flatMap(wave => wave.items.map(item => item.observation))),
        'configured continuation current engine suffix differs from its Journal');
        return null;
      }
      requireState(
        journal.step_id === 'wave-' + frontier.request.action.request.wave_index &&
          journal.items.length === requests.length && sameJson(journal.completed, frontier.prior_journal.completed) &&
          journal.items.every((item, index) => sameJson(item.request, requests[index]) &&
            item.host_reservation === undefined && item.research_activation === undefined && item.research_normalization === undefined &&
            (item.issue_id === null ? item.observation === null : typeof item.issue_id === 'string' && item.issue_id.length > 0 &&
              (item.observation === null || (item.observation.action_id === item.request.action_id && item.observation.issue_id === item.issue_id &&
                item.observation.output_digest === canonicalJsonDigest(item.observation.summary))))),
        'configured-frontier lookup current reviewer wave or issue custody differs',
      );
      const statuses = journal.items.map(item => item.observation ? 'reported' as const : item.issue_id ? 'issued' as const : 'unissued' as const);
      const frozenJournal = snapshot({ version, state: journal });
      return Object.freeze({ receipt: snapshot(receipt), snapshot: current, journal: frozenJournal, item: frozenJournal.state.items[0]!,
        items: frozenJournal.state.items, item_statuses: Object.freeze(statuses),
        action_status: statuses.every(status => status === 'reported') ? 'reported' as const : statuses.some(status => status !== 'unissued') ? 'issued' as const : 'unissued' as const });
    }
    const matches = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)].filter(
      (item) => item.request.action_id === receipt.request.action.request.action_id,
    );
    requireState(
      matches.length === 1 &&
        sameJson(matches[0]!.request, receipt.request.action.request) &&
        matches[0]!.host_reservation === undefined &&
        matches[0]!.research_activation === undefined &&
        matches[0]!.research_normalization === undefined,
      'delivered-work continuation review action is missing, duplicated or reserved',
    );
    const item = matches[0]!;
    requireState(
      item.issue_id === null
        ? item.observation === null
        : typeof item.issue_id === 'string' &&
          item.issue_id.length > 0 &&
          (item.observation === null ||
            (item.observation.action_id === receipt.request.action.request.action_id &&
              item.observation.issue_id === item.issue_id)),
      'delivered-work continuation review issuance is malformed',
    );
    const frozenItem = snapshot(item);
    return Object.freeze({
      receipt: snapshot(receipt),
      snapshot: current,
      journal: snapshot({ version, state: journal }),
      item: frozenItem,
      items: Object.freeze([frozenItem]),
      item_statuses: Object.freeze([item.observation ? 'reported' as const : item.issue_id ? 'issued' as const : 'unissued' as const]),
      action_status: item.observation ? 'reported' : item.issue_id ? 'issued' : 'unissued',
    });
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
      this.#validateProgress(host, middle, middleLedger);
      const next = this.projectLifecycleTransition(
          middle,
          'EXECUTE',
          'Issue only the Host-authorized corrective configured stages; preserve original terminal evidence.',
        ),
        nextLedger = { ...middleLedger, revision: middleLedger.revision + 1 };
      this.#validateProgress(
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

  /** Settle only the original reported failure after its Source owner was retired. */
  captureRetiredSourceObservation(input: RetiredSourceCaptureRequest): RetiredSourceCaptureResult {
    const { verifyCurrent: _verify, fault: _fault, ...bounded } = input,
      request = snapshot(bounded),
      evidence = input.terminalEvidence,
      observation = input.observation;
    requireState(
      Object.keys(request).length === 18 &&
        request.schema === 'RetiredSourceCapture/v1' &&
        Number.isSafeInteger(request.attempt) &&
        request.attempt > 0 &&
        Number.isSafeInteger(request.expectedMaintenanceGeneration) &&
        request.expectedMaintenanceGeneration >= 0 &&
        typeof input.verifyCurrent === 'function',
      'retired-source capture request invalid',
    );
    requireState(
      evidence?.schema === 'RetiredSourceTerminalEvidence/v1' &&
        typeof evidence.source_thread_status === 'string' &&
        evidence.source_thread_status.length > 0 &&
        evidence.source_thread_status.length <= 256 &&
        evidence.source_turn_status === 'interrupted' &&
        evidence.final_message_id === null &&
        typeof evidence.source_turn_id === 'string' &&
        evidence.source_turn_id.trim().length > 0 &&
        evidence.source_thread_id === input.nativeReadResult?.thread_id &&
        evidence.source_thread_id !== input.operatorHandle &&
        evidence.operator_thread_id === input.operatorHandle &&
        evidence.original_actor_id === observation?.agent_id &&
        evidence.original_actor_id !== input.operatorHandle &&
        evidence.action_id === input.actionId &&
        evidence.issue_id === input.issueId &&
        evidence.host_attempt_id === observation?.host_attempt_id &&
        input.nativeReadResult?.schema === 'RetiredSourceNativeTurnEvidence/v1' &&
        input.nativeReadResult.thread_id === evidence.source_thread_id &&
        input.nativeReadResult.thread_status === evidence.source_thread_status &&
        input.nativeReadResult.turn_id === evidence.source_turn_id &&
        input.nativeReadResult.turn_status === evidence.source_turn_status &&
        input.nativeReadResult.issue.action_id === input.actionId &&
        input.nativeReadResult.issue.issue_id === input.issueId &&
        input.nativeReadResult.issue.host_attempt_id === evidence.host_attempt_id &&
        Array.isArray(input.nativeReadResult.command_refs) &&
        Array.isArray(input.nativeReadResult.file_change_refs) &&
        evidence.active_source_writer_ids?.length === 0 &&
        Array.isArray(evidence.observed_commands) &&
        evidence.observed_commands.length > 0 &&
        evidence.observed_commands.length <= 512 &&
        evidence.observed_commands.every(
          (entry) =>
            typeof entry.ref === 'string' &&
            entry.ref.trim().length > 0 &&
            ['completed', 'failed'].includes(entry.status) &&
            Number.isSafeInteger(entry.exit_code) &&
            hashPattern.test(entry.command_sha256) &&
            (entry.output_sha256 === null || hashPattern.test(entry.output_sha256)) &&
            typeof entry.output_present === 'boolean' &&
            typeof entry.output_truncated === 'boolean',
        ) &&
        sameJson(
          evidence.observed_commands.map((entry) => entry.ref),
          input.nativeReadResult.command_refs,
        ) &&
        Array.isArray(evidence.original_tool_records) &&
        evidence.original_tool_records.length > 0 &&
        evidence.original_tool_records.length <= 256 &&
        evidence.original_tool_records.every(
          (entry) =>
            entry.status === 'completed' &&
            entry.actor_id === evidence.original_actor_id &&
            entry.action_id === input.actionId &&
            entry.issue_id === input.issueId &&
            entry.host_attempt_id === observation?.host_attempt_id &&
            typeof entry.call_ref === 'string' &&
            entry.call_ref.trim().length > 0 &&
            Array.isArray(entry.changed_paths) &&
            entry.changed_paths.every((value: unknown) => typeof value === 'string' && value.trim().length > 0),
        ),
      'retired-source terminal caller evidence is incomplete or mismatched',
    );
    requireState(
      observation?.schema === 'VidaSessionObservation/v1' &&
        observation.status === 'reported_failed' &&
        observation.action_id === input.actionId &&
        observation.issue_id === input.issueId &&
        observation.output_digest === canonicalJsonDigest(observation.summary) &&
        Array.isArray(observation.changed_paths) &&
        observation.evidence_refs.length > 0 &&
        input.candidateSnapshot?.schema === 'UnverifiedSourceSnapshot/v1' &&
        Array.isArray(input.candidateSnapshot.entries) &&
        input.candidateSnapshot.entries.length <= 4096 &&
        Array.isArray(input.attributions) &&
        input.attributions.length <= 8192,
      'retired-source partial observation or candidate inventory invalid',
    );
    const requestDigest = canonicalJsonDigest(request);
    requireState(!this.#database.inTransaction, 'nested retired-source capture forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_retired_source_capture (workspace_id TEXT,work_id TEXT,attempt INTEGER,action_id TEXT,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
      );
      this.#assertReconciliationWritesAllowed();
      const existing = this.#database
        .query(
          'SELECT payload,digest FROM agent_host_retired_source_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt, input.actionId) as {
        payload: string;
        digest: string;
      } | null;
      if (existing) {
        const record = JSON.parse(existing.payload) as Record<string, unknown>,
          current = this.#read(input.identity),
          journal = this.#database
            .query(
              'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
            )
            .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
            revision: number;
            payload: string;
            digest: string;
          } | null;
        requireState(
          canonicalJsonDigest(record) === existing.digest && record.request_digest === requestDigest,
          'retired-source capture retry differs',
        );
        input.verifyCurrent();
        requireState(
          current.work?.lease === null &&
            current.work.execution.status === 'suspended' &&
            sameJson(current.workVersion, record.work_version) &&
            sameJson(current.ledgerVersion, record.ledger_version) &&
            journal &&
            sameJson({ revision: journal.revision, digest: journal.digest }, record.journal_version) &&
            canonicalJsonDigest(JSON.parse(journal.payload)) === journal.digest,
          'retired-source capture retry follows dependent Host or Journal write',
        );
        return { snapshot: current, request_digest: requestDigest };
      }
      const before = this.#read(input.identity),
        work = before.work,
        ledger = before.ledger;
      matchesExpected(before.workVersion, input.expectedWork);
      matchesExpected(before.ledgerVersion, input.expectedLedger);
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      requireState(
        work && ledger && work.execution.status === 'suspended' && work.lease === null,
        'retired-source capture requires suspended Work with no lease',
      );
      const attempt = input.terminalEvidence.host_attempt_id,
        retiredAttempt = work.execution.assignment_attempts.find((entry) => entry.attempt_id === attempt),
        ticketId = retiredAttempt?.lease.ticket_id,
        ticket = ledger.tickets.find((entry) => entry.ticket_id === ticketId),
        claim = ledger.claims.find((entry) => entry.claim_id === input.retirementClaimId),
        release = ledger.operations.find((entry) => entry.operation_id === input.retirementOperationId) as
          | Record<string, unknown>
          | undefined;
      requireState(
        retiredAttempt &&
          retiredAttempt.status === 'uncertain' &&
          retiredAttempt.result === null &&
          retiredAttempt.result_digest === null &&
          retiredAttempt.lease.thread_id === input.operatorHandle &&
          ticket?.status === 'released' &&
          ticket.work_id === input.identity.work_id &&
          ticket.thread_id === input.operatorHandle &&
          ticket.generation === retiredAttempt.lease.generation &&
          ticket.ticket_id === retiredAttempt.lease.ticket_id &&
          ticket.claim_ids.includes(input.retirementClaimId) &&
          claim?.ticket_id === ticket.ticket_id &&
          claim.status === 'released' &&
          claim.thread_id === input.operatorHandle &&
          claim.generation === ticket.generation &&
          release?.kind === 'release' &&
          release.ticket_id === ticket.ticket_id &&
          release.work_id === ticket.work_id &&
          release.thread_id === ticket.thread_id &&
          release.source_revision === ticket.source_revision &&
          sameJson(release.resources, ticket.exclusive_resources) &&
          release.decided_by === input.operatorHandle,
        'exact original retired ticket, claim or release operation differs',
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
        row &&
          row.revision === input.expectedJournal.revision &&
          row.digest === input.expectedJournal.digest &&
          canonicalJsonDigest(JSON.parse(row.payload)) === row.digest,
        'retired-source Journal CAS differs',
      );
      const state = JSON.parse(row.payload) as MastraSessionLedgerState,
        allItems = [...state.items, ...state.completed.flatMap((wave) => wave.items)],
        item = allItems.find((entry) => entry.request.action_id === input.actionId),
        reservation = item?.host_reservation,
        authorization = reservation?.authorization,
        started = reservation?.receipt.attempt;
      requireState(
        state.schema === 'MastraSessionLedger/v1' &&
          state.work_id === input.identity.work_id &&
          state.attempt === input.attempt &&
          item?.issue_id === input.issueId &&
          item.observation === null &&
          reservation &&
          reservation.approvalAction === 'source.write' &&
          reservation.invocation.profile.mutation_scope === 'repository_source' &&
          reservation.invocation.profile.egress_policy === 'none' &&
          started?.attempt_id === attempt &&
          started.status === 'started' &&
          started.result === null &&
          started.result_digest === null &&
          started.lease.ticket_id === ticket.ticket_id &&
          started.lease.thread_id === input.operatorHandle &&
          sameJson(reservation.invocation.workContext.binding, work.binding) &&
          reservation.request.workItemId === work.binding.lifecycle_work_id &&
          reservation.request.configDigest === work.binding.config_digest &&
          reservation.request.workflowId === work.binding.workflow_id &&
          item.request.config_digest === work.binding.config_digest &&
          item.request.scope_digest === state.source_scope?.digest &&
          input.nativeReadResult.issue.work_item_id === work.binding.lifecycle_work_id &&
          input.nativeReadResult.issue.attempt === input.attempt &&
          input.nativeReadResult.issue.stage_id === item.request.stage_id &&
          input.nativeReadResult.issue.scope_digest === item.request.scope_digest &&
          state.source_scope?.digest === work.binding.work_source_revision &&
          allItems.every(
            (entry) =>
              entry === item ||
              entry.observation !== null ||
              (entry.issue_id === null &&
                !entry.host_reservation &&
                !entry.research_activation &&
                !entry.research_normalization),
          ) &&
          work.execution.assignment_attempts.every(
            (entry) => entry.attempt_id === attempt || entry.status === 'completed' || entry.status === 'no_effect',
          ),
        'retired-source pending issue, protected reservation or scope differs',
      );
      const uncertain = { ...started!, status: 'uncertain' as const, result: null, result_digest: null };
      requireState(sameJson(retiredAttempt, uncertain), 'retired Host attempt differs from original started receipt');
      const approval = authorization?.approval,
        stored = approval && this.#governanceRead(approval.store_id, 'approval', canonicalJsonDigest(approval.binding));
      requireState(
        approval?.status === 'commit_unknown' &&
          approval.attempt_id === attempt &&
          stored &&
          sameJson(stored.record, approval),
        'retired-source commit-unknown approval fence differs',
      );
      const original = state.source_scope!,
        paths = original.entries.map((entry) => entry.path),
        candidate = input.candidateSnapshot.entries,
        byCandidate = new Map(candidate.map((entry) => [entry.path, entry]));
      requireState(
        candidate.length === paths.length &&
          byCandidate.size === paths.length &&
          paths.every((value) => byCandidate.has(value)) &&
          candidate.every(
            (entry) => hashPattern.test(entry.sha256) && Number.isSafeInteger(entry.size) && entry.size >= 0,
          ),
        'retired-source candidate snapshot is incomplete',
      );
      const originalPaths = [
          ...new Set(evidence.original_tool_records.flatMap((entry) => [...entry.changed_paths])),
        ].sort(),
        later = evidence.later_grants,
        overlap = (entry: CoordinationTicket) =>
          entry.exclusive_resources.some((resource) => paths.some((value) => resource === 'file:' + value)),
        releaseIndex = ledger.operations.findIndex((entry) => entry.operation_id === input.retirementOperationId),
        retiredClaimIndex = ledger.claims.findIndex((entry) => entry.claim_id === claim.claim_id),
        laterClaims = ledger.claims.filter(
          (entry, index) =>
            entry.ticket_id !== ticket.ticket_id &&
            entry.resources.some((resource) => paths.some((value) => resource === 'file:' + value)) &&
            (index > retiredClaimIndex ||
              ledger.operations.some(
                (operation, operationIndex) =>
                  operationIndex > releaseIndex &&
                  operation.kind === 'release' &&
                  operation.ticket_id === entry.ticket_id,
              )) &&
            ledger.tickets.some((grant) => grant.ticket_id === entry.ticket_id && grant.status !== 'read_only'),
        ),
        laterTickets = laterClaims.map((entry) => ledger.tickets.find((grant) => grant.ticket_id === entry.ticket_id)!);
      requireState(
        sameJson([...observation.changed_paths!].sort(), originalPaths) &&
          releaseIndex >= 0 &&
          retiredClaimIndex >= 0 &&
          !ledger.tickets.some((entry) => overlap(entry) && ['active', 'ready_for_handoff'].includes(entry.status)) &&
          !ledger.claims.some(
            (entry) =>
              entry.status === 'active' &&
              entry.resources.some((resource) => paths.some((value) => resource === 'file:' + value)),
          ) &&
          laterClaims.every((entry, index) => {
            const grant = laterTickets[index]!,
              released = ledger.operations.findIndex(
                (operation, operationIndex) =>
                  operationIndex > releaseIndex &&
                  operation.kind === 'release' &&
                  operation.ticket_id === grant.ticket_id &&
                  operation.work_id === grant.work_id &&
                  operation.thread_id === grant.thread_id &&
                  sameJson(
                    [...((operation.resources as string[]) ?? [])].sort(),
                    [...grant.exclusive_resources].sort(),
                  ),
              );
            return (
              grant.status === 'released' &&
              entry.status === 'released' &&
              grant.claim_ids.includes(entry.claim_id) &&
              released > releaseIndex
            );
          }) &&
          sameJson(
            later.map((entry) => ({ ticket_id: entry.ticket_id, claim_id: entry.claim_id })),
            laterClaims.map((entry) => ({ ticket_id: entry.ticket_id, claim_id: entry.claim_id })),
          ),
        'original writes, later grants or active Source ownership are incomplete',
      );
      requireState(
        input.attributions.every(
          (entry) =>
            paths.includes(entry.path) &&
            ['command', 'patch', 'file_change'].includes(entry.kind) &&
            hashPattern.test(entry.evidence_sha256) &&
            typeof entry.event_ref === 'string' &&
            entry.event_ref.trim().length > 0 &&
            (entry.kind === 'file_change'
              ? input.nativeReadResult.file_change_refs
              : input.nativeReadResult.command_refs
            ).includes(entry.event_ref),
        ),
        'retired-source attribution entry invalid',
      );
      const attributedPaths = new Set(input.attributions.map((entry) => entry.path));
      requireState(
        sameJson(input.attributions, input.nativeReadResult.source_effects) &&
          sameJson([...attributedPaths].sort(), originalPaths),
        'retired-source source-change attribution is incomplete',
      );
      const allWork = this.#database
        .query("SELECT payload FROM agent_host_state WHERE workspace_id=? AND kind='work'")
        .all(this.#workspaceId) as { payload: string }[];
      for (const grant of later) {
        const claimRows = ledger.claims.filter((entry) => entry.ticket_id === grant.ticket_id);
        requireState(
          claimRows.length === 1 &&
            claimRows[0]!.claim_id === grant.claim_id &&
            grant.actor_id.length > 0 &&
            grant.action_id.length > 0 &&
            grant.issue_id.length > 0 &&
            grant.host_attempt_id.length > 0 &&
            grant.evidence_ref.trim().length > 0 &&
            Array.isArray(grant.changed_paths),
          'later Source grant claim or terminal issue mapping differs',
        );
        const journalRows = this.#database
            .query('SELECT payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=?')
            .all(this.#workspaceId, grant.work_id) as { payload: string; digest: string }[],
          witnessed = journalRows.flatMap((entry) => {
            const journal = JSON.parse(entry.payload) as MastraSessionLedgerState;
            if (canonicalJsonDigest(journal) !== entry.digest) return [];
            return [...journal.items, ...journal.completed.flatMap((wave) => wave.items)].filter(
              (candidate) =>
                candidate.request.action_id === grant.action_id &&
                candidate.issue_id === grant.issue_id &&
                candidate.host_reservation?.receipt.attempt.attempt_id === grant.host_attempt_id &&
                candidate.host_reservation.receipt.attempt.lease.ticket_id === grant.ticket_id &&
                candidate.host_reservation.approvalAction === 'source.write' &&
                candidate.observation?.agent_id === grant.actor_id &&
                candidate.observation?.host_attempt_id === grant.host_attempt_id &&
                ['reported_complete', 'reported_failed'].includes(candidate.observation.status) &&
                sameJson([...candidate.observation.changed_paths!].sort(), [...grant.changed_paths].sort()) &&
                candidate.observation.evidence_refs.includes(grant.evidence_ref),
            );
          });
        const matchingWork = allWork
            .map((entry) => JSON.parse(entry.payload) as WorkState)
            .filter((entry) => entry.binding.lifecycle_work_id === grant.work_id),
          completed =
            witnessed.length === 1 &&
            matchingWork.length === 1 &&
            matchingWork[0]!.execution.assignment_attempts.some(
              (entry) =>
                entry.attempt_id === grant.host_attempt_id &&
                entry.lease.ticket_id === grant.ticket_id &&
                entry.status === 'completed' &&
                canonicalJsonDigest(entry.result) === canonicalJsonDigest(witnessed[0]!.observation),
            );
        requireState(completed, 'later Source grant lacks its exact terminal Host and Journal evidence');
      }
      const overlappingIds = new Set(ledger.tickets.filter(overlap).map((entry) => entry.ticket_id));
      requireState(
        allWork.every((entry) => {
          const other = JSON.parse(entry.payload) as WorkState;
          return other.execution.assignment_attempts.every(
            (value) =>
              value.attempt_id === attempt ||
              value.status !== 'uncertain' ||
              !overlappingIds.has(value.lease.ticket_id),
          );
        }),
        'another uncertain Source writer remains unresolved',
      );
      input.verifyCurrent();
      const attempts = work.execution.assignment_attempts.map((entry) =>
          entry.attempt_id === attempt
            ? {
                ...started!,
                status: 'completed' as const,
                result: observation,
                result_digest: canonicalJsonDigest(observation),
              }
            : entry,
        ),
        staged = this.#writeAttempts(before, attempts),
        applied = { ...approval!, status: 'applied' as const, terminal_at: new Date().toISOString() };
      this.#governanceWrite('approval', canonicalJsonDigest(approval!.binding), applied, stored!);
      const nextJournal = {
          ...state,
          items: state.items.map((entry) => (entry === item ? { ...entry, observation } : entry)),
          completed: state.completed.map((wave) => ({
            ...wave,
            items: wave.items.map((entry) => (entry === item ? { ...entry, observation } : entry)),
          })),
        },
        after = this.#commitHostState(
          {
            expectedWork: staged.workVersion!,
            expectedLedger: before.ledgerVersion,
            expectedMaintenanceGeneration: before.maintenanceGeneration,
            expectedSessionJournal: { attempt: input.attempt, version: input.expectedJournal },
            nextWork: {
              ...staged.work!,
              revision: staged.work!.revision + 1,
              lifecycle: { ...staged.work!.lifecycle, revision: staged.work!.revision + 1 },
            },
            nextLedger: { ...ledger, revision: ledger.revision + 1 },
          },
          { actionId: input.actionId, next: nextJournal, verifyCurrent: input.verifyCurrent, stoppedSource: true },
          true,
        );
      const receipt = {
        schema: 'RetiredSourceCapture/v1',
        request_digest: requestDigest,
        request,
        retirement_operation: release,
        retirement_ticket: ticket,
        retirement_claim: claim,
        terminal_evidence: evidence,
        attributions: input.attributions,
        candidate_snapshot: input.candidateSnapshot,
        observation,
        work_version: after.workVersion,
        ledger_version: after.ledgerVersion,
        journal_version: { revision: input.expectedJournal.revision + 1, digest: canonicalJsonDigest(nextJournal) },
        rights_granted: false,
        runtime_acceptance: false,
        canonical_acceptance: false,
      };
      input.fault?.();
      this.#database
        .query('INSERT INTO agent_host_retired_source_capture VALUES(?,?,?,?,?,?)')
        .run(
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          input.actionId,
          canonicalJson(receipt),
          canonicalJsonDigest(receipt),
        );
      return { snapshot: after, request_digest: requestDigest };
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
      this.#validateProgress(before, nextWork, nextLedger);
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
      this.#validateProgress(
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
  /** Preserve one exact denied synthesis body while releasing only its original owner. */
  captureHistoricalTerminalSynthesisAndRelease(
    input: HistoricalTerminalSynthesisCaptureRequest,
  ): HistoricalTerminalSynthesisCaptureResult {
    requireState(
      input.schema === 'HistoricalTerminalSynthesisCapture/v1' &&
        Number.isSafeInteger(input.attempt) &&
        input.attempt > 0 &&
        input.actionId.length > 0 &&
        input.actionId.length <= 256 &&
        input.issueId.length > 0 &&
        input.issueId.length <= 256 &&
        input.nativeSessionHandle.length > 0 &&
        input.nativeSessionHandle.length <= 256 &&
        input.userRequestPointer.length > 0 &&
        input.userRequestPointer.length <= 2048 &&
        !/\p{Cc}/u.test(input.nativeSessionHandle + input.userRequestPointer) &&
        input.bodyBytes instanceof Uint8Array &&
        input.bodyBytes.byteLength > 0 &&
        input.bodyBytes.byteLength <= 65536,
      'historical synthesis custody request invalid',
    );
    const provenance = snapshot(input.provenance);
    assertCanonicalJsonValue(provenance);
    requireState(
      provenance.schema === 'HistoricalTerminalSynthesisProvenance/v1' &&
        [provenance.body_ref, provenance.input_ref, provenance.report_ref, provenance.followup_ref].every(
          (value) => typeof value === 'string' && value.length > 0 && value.length <= 2048 && !/\p{Cc}/u.test(value),
        ) &&
        typeof provenance.original_actor_id === 'string' &&
        provenance.original_actor_id.length > 0 &&
        provenance.original_actor_id.length <= 256 &&
        provenance.denial_status === 'blocked' &&
        provenance.denial_code === 'GAP-VIDA-RUN-EXECUTION-001' &&
        provenance.denial_message.length > 0 &&
        provenance.denial_message.length <= 2048 &&
        provenance.denial_reason_gap === 'GAP-VIDA-RUN-EXECUTION-001' &&
        typeof provenance.input_bytes_base64 === 'string' &&
        typeof provenance.report_bytes_base64 === 'string' &&
        provenance.predecessor_refs.length === 2 &&
        new Set(provenance.predecessor_refs.map((ref) => ref.result_id)).size === 2 &&
        provenance.predecessor_refs.every(
          (ref) =>
            typeof ref.result_id === 'string' &&
            ref.result_id.length > 0 &&
            typeof ref.digest === 'string' &&
            /^[a-f0-9]{64}$/.test(ref.digest),
        ),
      'historical synthesis provenance invalid',
    );
    const bodyBytes = Buffer.from(input.bodyBytes),
      bodyBase64 = bodyBytes.toString('base64'),
      request = snapshot({
        schema: input.schema,
        identity: input.identity,
        attempt: input.attempt,
        action_id: input.actionId,
        issue_id: input.issueId,
        native_session_handle: input.nativeSessionHandle,
        user_request_pointer: input.userRequestPointer,
        request_intent: input.requestIntent,
        expected_work: input.expectedWork,
        expected_ledger: input.expectedLedger,
        expected_journal: input.expectedJournal,
        expected_maintenance_generation: input.expectedMaintenanceGeneration,
        body_base64: bodyBase64,
        provenance,
      }),
      requestDigest = canonicalJsonDigest(request);
    requireState(!this.#database.inTransaction, 'nested historical synthesis custody transaction forbidden');
    return this.#transactionWithProducerFence(() => {
      this.#database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_historical_terminal_synthesis_capture (workspace_id TEXT,work_id TEXT,attempt INTEGER,action_id TEXT,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
      );
      this.#assertReconciliationWritesAllowed();
      const existing = this.#database
        .query(
          'SELECT payload,digest FROM agent_host_historical_terminal_synthesis_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        )
        .get(this.#workspaceId, input.identity.work_id, input.attempt, input.actionId) as {
        payload: string;
        digest: string;
      } | null;
      if (existing) {
        const receipt = JSON.parse(existing.payload) as HistoricalTerminalSynthesisCaptureReceipt,
          current = this.#read(input.identity),
          journal = this.#database
            .query(
              'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
            )
            .get(this.#workspaceId, input.identity.work_id, input.attempt) as {
            revision: number;
            payload: string;
            digest: string;
          } | null;
        requireState(
          canonicalJsonDigest(receipt) === existing.digest &&
            receipt.request_digest === requestDigest &&
            receipt.identity.work_id === input.identity.work_id &&
            receipt.action_id === input.actionId &&
            receipt.issue_id === input.issueId,
          'historical synthesis custody exact retry differs',
        );
        const expectedMaintenanceGeneration = receipt.request.expected_maintenance_generation;
        requireState(
          typeof expectedMaintenanceGeneration === 'number' &&
            Number.isSafeInteger(expectedMaintenanceGeneration) &&
            expectedMaintenanceGeneration >= 0,
          'historical synthesis custody retry maintenance generation invalid',
        );
        this.#assertMaintenanceGeneration(expectedMaintenanceGeneration);
        requireState(
          current.work?.lease === null &&
            current.work.execution.status === 'suspended' &&
            sameJson(current.workVersion, receipt.work_version) &&
            sameJson(current.ledgerVersion, receipt.ledger_version) &&
            journal &&
            sameJson({ revision: journal.revision, digest: journal.digest }, receipt.journal_version) &&
            canonicalJsonDigest(JSON.parse(journal.payload)) === journal.digest,
          'historical synthesis custody retry follows dependent Host or Journal write',
        );
        return { snapshot: current, request_digest: requestDigest, receipt: snapshot(receipt) };
      }

      const before = this.#read(input.identity),
        work = before.work,
        ledger = before.ledger;
      matchesExpected(before.workVersion, input.expectedWork);
      matchesExpected(before.ledgerVersion, input.expectedLedger);
      this.#assertMaintenanceGeneration(input.expectedMaintenanceGeneration);
      const nextWork = input.nextWork,
        nextLedger = input.nextLedger;
      requireState(
        nextWork !== undefined && nextWork !== null && nextLedger !== undefined && nextLedger !== null,
        'historical synthesis custody requires one exact active original owner release',
      );
      requireState(
        work && ledger &&
          work.execution.status === 'active' &&
          work.lease?.thread_id === input.nativeSessionHandle &&
          work.lease.generation > 0 &&
          nextWork.lease === null &&
          nextWork.execution.status === 'suspended' &&
          nextWork.revision === work.revision + 1 &&
          nextLedger.revision === ledger.revision + 1 &&
          sameJson(nextWork.binding, work.binding) &&
          sameJson(nextWork.execution.assignment_attempts, work.execution.assignment_attempts) &&
          sameJson(nextWork.artifacts, work.artifacts),
        'historical synthesis custody requires one exact active original owner release',
      );
      const ticket = ledger.tickets.find((entry) => entry.ticket_id === work.lease!.ticket_id),
        activeClaims = ledger.claims.filter(
          (entry) => entry.ticket_id === work.lease!.ticket_id && entry.status === 'active',
        ),
        resources = [...(ticket?.exclusive_resources ?? [])].sort();
      requireState(
        ticket?.status === 'active' &&
          ticket.thread_id === input.nativeSessionHandle &&
          ticket.work_id === input.identity.work_id &&
          ticket.generation === work.lease.generation &&
          activeClaims.length === 1 &&
          activeClaims[0]!.thread_id === input.nativeSessionHandle &&
          activeClaims[0]!.work_id === input.identity.work_id &&
          activeClaims[0]!.generation === work.lease.generation &&
          canonicalJsonDigest([...activeClaims[0]!.resources].sort()) === canonicalJsonDigest(resources) &&
          resources.length > 0 &&
          !ledger.tickets.some(
            (other) =>
              other.ticket_id !== ticket.ticket_id &&
              !(other.status === 'queued' &&
                other.work_id === input.identity.work_id &&
                other.thread_id === input.nativeSessionHandle &&
                other.generation === work.lease!.generation &&
                other.repository_id === input.identity.repository_id &&
                sameJson(other.project_ids, input.identity.project_ids) &&
                other.integrations_digest === input.identity.integrations_digest &&
                other.source_revision === work.binding.work_source_revision) &&
              ['queued', 'active', 'ready_for_handoff', 'blocked'].includes(other.status) &&
              other.exclusive_resources.some((resource) => resources.includes(resource)),
          ),
        'historical synthesis custody owner, claim or FIFO release differs',
      );
      const releasedTicket = nextLedger.tickets.find((entry) => entry.ticket_id === ticket.ticket_id),
        releasedClaim = nextLedger.claims.find((entry) => entry.claim_id === activeClaims[0]!.claim_id),
        releaseOperation = nextLedger.operations.at(-1);
      requireState(
        releasedTicket?.status === 'released' &&
          releasedTicket.expires_at === null &&
          releasedClaim?.status === 'released' &&
          typeof releasedClaim.renewed_at === 'string' &&
          Number.isFinite(Date.parse(releasedClaim.renewed_at)) &&
          nextLedger.operations.length === ledger.operations.length + 1 &&
          sameJson(nextLedger.operations.slice(0, -1), ledger.operations) &&
          releaseOperation !== undefined &&
          releaseOperation.schema === 'CoordinationOperation/v1' &&
          typeof releaseOperation.operation_id === 'string' &&
          typeof releaseOperation.created_at === 'string' &&
          Object.keys(releaseOperation).sort().join('|') ===
            [
              'created_at',
              'decided_by',
              'decision_pointer',
              'from_ledger_revision',
              'kind',
              'operation_id',
              'resources',
              'schema',
              'source_revision',
              'thread_id',
              'ticket_id',
              'to_ledger_revision',
              'work_id',
            ]
              .sort()
              .join('|') &&
          releaseOperation.operation_id.length > 0 &&
          releaseOperation.kind === 'release' &&
          releaseOperation.ticket_id === ticket.ticket_id &&
          releaseOperation.work_id === input.identity.work_id &&
          releaseOperation.thread_id === input.nativeSessionHandle &&
          releaseOperation.source_revision === ticket.source_revision &&
          sameJson(releaseOperation.resources, resources) &&
          releaseOperation.decision_pointer === input.userRequestPointer &&
          releaseOperation.decided_by === input.nativeSessionHandle &&
          releaseOperation.from_ledger_revision === ledger.revision &&
          releaseOperation.to_ledger_revision === ledger.revision + 1 &&
          Number.isFinite(Date.parse(releaseOperation.created_at)) &&
          sameJson(
            nextLedger.tickets,
            ledger.tickets.map((entry) =>
              entry.ticket_id === ticket.ticket_id
                ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
                : entry,
            ),
          ) &&
          sameJson(
            nextLedger.claims,
            ledger.claims.map((entry) =>
              entry.claim_id === activeClaims[0]!.claim_id
                ? { ...entry, status: 'released', renewed_at: releasedClaim.renewed_at }
                : entry,
            ),
          ) &&
          sameJson(
            (() => {
              const { revision: _revision, tickets: _tickets, claims: _claims, operations: _operations, ...rest } = nextLedger;
              return rest;
            })(),
            (() => {
              const { revision: _revision, tickets: _tickets, claims: _claims, operations: _operations, ...rest } = ledger;
              return rest;
            })(),
          ) &&
          sameJson(
            nextWork,
            {
              ...work,
              revision: work.revision + 1,
              lease: null,
              execution: { ...work.execution, phase: 'awaiting_followup', status: 'suspended' },
              lifecycle: {
                ...work.lifecycle,
                revision: work.revision + 1,
                next_action:
                  'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.',
              },
            },
          ),
        'historical synthesis custody release operation is incomplete',
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
          journal.revision === input.expectedJournal.revision &&
          journal.digest === input.expectedJournal.digest &&
          canonicalJsonDigest(JSON.parse(journal.payload)) === journal.digest,
        'historical synthesis custody Journal CAS differs',
      );
      const after = this.#commitHostState(
        {
          expectedWork: input.expectedWork,
          expectedLedger: input.expectedLedger,
          expectedMaintenanceGeneration: input.expectedMaintenanceGeneration,
          documentationContext: input.documentationContext,
          expectedSessionJournal: { attempt: input.attempt, version: input.expectedJournal },
          nextWork,
          nextLedger,
        },
        undefined,
        true,
      );
      const receipt: HistoricalTerminalSynthesisCaptureReceipt = {
        schema: 'HistoricalTerminalSynthesisCustodyReceipt/v1',
        request_digest: requestDigest,
        request,
        identity: input.identity,
        attempt: input.attempt,
        action_id: input.actionId,
        issue_id: input.issueId,
        terminal_status: 'known_terminal_unaccepted',
        task_status: 'unfinished',
        body_base64: bodyBase64,
        body_sha256: createHash('sha256').update(bodyBytes).digest('hex'),
        body_byte_length: bodyBytes.byteLength,
        provenance,
        work_version: after.workVersion!,
        ledger_version: after.ledgerVersion!,
        journal_version: input.expectedJournal,
        rights_granted: false,
        accepted_result: false,
        runtime_acceptance: false,
      };
      this.#database
        .query('INSERT INTO agent_host_historical_terminal_synthesis_capture VALUES(?,?,?,?,?,?)')
        .run(
          this.#workspaceId,
          input.identity.work_id,
          input.attempt,
          input.actionId,
          canonicalJson(receipt),
          canonicalJsonDigest(receipt),
        );
      return { snapshot: after, request_digest: requestDigest, receipt: snapshot(receipt) };
    }).immediate();
  }
  readHistoricalTerminalSynthesisCapture(
    identity: WorkIdentity,
    attempt: number,
    actionId: string,
  ): HistoricalTerminalSynthesisCaptureReceipt | null {
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get('agent_host_historical_terminal_synthesis_capture') as { name: string } | null;
    if (!table) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_historical_terminal_synthesis_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      )
      .get(this.#workspaceId, identity.work_id, attempt, actionId) as { payload: string; digest: string } | null;
    if (!row) return null;
    const receipt = JSON.parse(row.payload) as HistoricalTerminalSynthesisCaptureReceipt;
    requireState(
        receipt.schema === 'HistoricalTerminalSynthesisCustodyReceipt/v1' &&
        receipt.identity.work_id === identity.work_id &&
        receipt.attempt === attempt &&
        receipt.action_id === actionId &&
        canonicalJsonDigest(receipt) === row.digest &&
        canonicalJsonDigest(receipt.request) === receipt.request_digest &&
        receipt.terminal_status === 'known_terminal_unaccepted' &&
        receipt.task_status === 'unfinished' &&
        receipt.accepted_result === false &&
        receipt.rights_granted === false &&
        receipt.runtime_acceptance === false,
      'historical synthesis custody receipt is corrupt or foreign',
    );
    return snapshot(receipt);
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
      this.#validateProgress(
        before,
        this.#checkedWork(verified),
        checkedLedger(verificationLedger),
        input.documentationContext,
      );
      const delivered = this.projectLifecycleTransition(
        verified,
        'DELIVERY',
        'Present the current manifest; wait for attributable current-version testing.',
        input.documentationContext,
      );
      const deliveryLedger = { ...verificationLedger, revision: verificationLedger.revision + 1 };
      this.#validateProgress(
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
    taskSourceResourceAdditions: readonly string[] = [],
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
      this.#validateProgress(before, work, ledger, documentationContext, taskSourceResourceAdditions);
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
