import { createHash } from 'node:crypto';
import { canonicalJson, canonicalJsonDigest, rfc3339TimestampMilliseconds } from '../contracts/public-ingress.js';
import { validateCoordinationLedgerV1, type CoordinationLedger } from '../contracts/envelopes.js';
import type { DeliveredWorkContinuationReceipt, WorkState, StateVersion } from '../host-state.js';
import { parseSessionBridgeRequest, type SessionBridgeSnapshot } from './mastra-session-bridge.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import {
  projectConfiguredFrontierContinuationAction,
  projectConfiguredPrewriterContinuationRequests,
  validateCurrentSourceScopeBridge,
  validateConfiguredFrontierOwnerRelease,
  validateDeliveredWorkContinuationRequest,
  deliveredContinuationProofBinding,
} from './delivered-work-continuation.js';

export interface ConfiguredFrontierReceipt extends Omit<DeliveredWorkContinuationReceipt, 'historical_capture'> {
  readonly historical_capture: null;
  readonly frontier_snapshot: { readonly snapshot_bytes_base64: string; readonly snapshot_sha256: string };
}
export interface FrontierRepairCurrent {
  readonly work: WorkState;
  readonly work_version: StateVersion;
  readonly ledger: CoordinationLedger;
  readonly ledger_version: StateVersion;
  readonly journal: MastraSessionLedgerState;
  readonly journal_version: StateVersion;
}
export interface FrontierValidationInput {
  readonly receipt: ConfiguredFrontierReceipt;
  readonly current?: FrontierRepairCurrent;
  readonly prewriterBinding?: Omit<Parameters<typeof projectConfiguredPrewriterContinuationRequests>[0], 'engine' | 'journal' | 'currentSourceScope'>;
}
function required(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('vida repair delivered-work-continuation: ' + message);
}
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const digestPattern = /^[a-f0-9]{64}$/;
const exactKeys = (value: unknown, keys: readonly string[]) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) &&
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0');
const same = (a: unknown, b: unknown) => canonicalJsonDigest(a) === canonicalJsonDigest(b);

/** Immutable receipt structure only. Full wave derivation and live dependencies are checked separately. */
export function validateConfiguredFrontierReceiptStructure(input: FrontierValidationInput) {
  const receipt = input?.receipt;
  required(
    receipt && Buffer.byteLength(JSON.stringify(receipt), 'utf8') <= 64 * 1024 * 1024 &&
      Array.isArray(receipt.prior_journal?.completed) && Array.isArray(receipt.prior_journal?.items) &&
      Array.isArray(receipt.successor_journal?.completed) && Array.isArray(receipt.successor_journal?.items),
    'future configured-frontier receipt exceeds bounds or lacks journal arrays',
  );
  required(validateCoordinationLedgerV1(receipt.prior_ledger).ok && validateCoordinationLedgerV1(receipt.successor_ledger).ok,
    'configured-frontier immutable ledger contract is invalid');
  required(
    exactKeys(receipt, [
      'schema', 'continuation_id', 'attempt', 'request_digest', 'authorization', 'request', 'prior_work', 'prior_ledger',
      'prior_journal', 'prior_work_version', 'prior_ledger_version', 'prior_journal_version', 'historical_capture',
      'frontier_snapshot', 'successor_work', 'successor_ledger', 'successor_binding', 'successor_journal',
      'work_version', 'ledger_version', 'journal_version', 'rights_granted', 'accepted_result', 'runtime_acceptance', 'status',
    ]) && receipt?.schema === 'DeliveredWorkContinuationReceipt/v1' &&
      receipt.status === 'action_ready' &&
      receipt.rights_granted === false && receipt.accepted_result === false && receipt.runtime_acceptance === false &&
      receipt.historical_capture === null &&
      exactKeys(receipt.frontier_snapshot, ['snapshot_bytes_base64', 'snapshot_sha256']) &&
      typeof receipt.frontier_snapshot.snapshot_bytes_base64 === 'string' &&
      receipt.frontier_snapshot.snapshot_bytes_base64.length <= 8 * 1024 * 1024 &&
      digestPattern.test(receipt.frontier_snapshot.snapshot_sha256),
    'future configured-frontier receipt or immutable snapshot is malformed',
  );
  const request = validateDeliveredWorkContinuationRequest(receipt.request),
    action = request.action,
    proofBinding = deliveredContinuationProofBinding(request.sourceTransition);
  required(action.kind === 'configured_frontier', 'repair-only frontier validator received a historical action');
  required(proofBinding.maintenance_generation === undefined || request.expectedMaintenanceGeneration === proofBinding.maintenance_generation,
    'configured-frontier receipt maintenance generation differs from its closed transition fence');
  required(
    exactKeys(receipt.authorization, ['schema', 'request_digest', 'principal', 'transition_digest', 'action_digest']) &&
      receipt.authorization.schema === 'VidaDeliveredWorkContinuationAuthorization/v1' &&
      typeof receipt.authorization.principal === 'string' && receipt.authorization.principal.trim().length > 0 &&
      receipt.authorization.principal === receipt.authorization.principal.trim() &&
      !/\p{Cc}/u.test(receipt.authorization.principal) &&
      receipt.authorization.request_digest === canonicalJsonDigest(request) &&
      receipt.authorization.transition_digest === request.sourceTransition.transition_digest &&
      receipt.authorization.action_digest === canonicalJsonDigest(action) &&
      receipt.request_digest === canonicalJsonDigest(request) &&
      receipt.attempt === request.attempt &&
      receipt.continuation_id === canonicalJsonDigest({
        identity: request.identity,
        attempt: request.attempt,
        action_id: action.request.action_id,
        transition_digest: request.sourceTransition.transition_digest,
      }),
    'future configured-frontier authorization or continuation identity differs',
  );
  const bytes = Buffer.from(receipt.frontier_snapshot.snapshot_bytes_base64, 'base64');
  required(
    bytes.toString('base64') === receipt.frontier_snapshot.snapshot_bytes_base64 &&
      sha256(bytes) === receipt.frontier_snapshot.snapshot_sha256,
    'future configured-frontier snapshot bytes or checksum differs',
  );
  const snapshot = JSON.parse(bytes.toString('utf8')) as SessionBridgeSnapshot;
  required(
    snapshot !== null && typeof snapshot === 'object' && !Array.isArray(snapshot) &&
      Buffer.from(canonicalJson(snapshot)).equals(bytes),
    'future configured-frontier engine snapshot is not canonical JSON',
  );
  validateCurrentSourceScopeBridge({
    original: receipt.prior_journal.source_scope!,
    current: request.currentSourceScope,
    authorizedChanges: request.authorizedSourceChanges,
  });
  required(
    action.request.config_digest === receipt.prior_work.binding.config_digest &&
      action.request.scope_digest === receipt.prior_journal.source_scope!.digest &&
      ['low', 'medium', 'high'].includes(receipt.prior_work.lifecycle.risk),
    'future configured-frontier original configuration, scope or lifecycle risk differs',
  );
  const projected = projectConfiguredFrontierContinuationAction({
      engine: snapshot,
      journal: receipt.prior_journal,
      targetConfigDigest: request.targetConfigDigest,
      currentSourceScope: request.currentSourceScope,
    }),
    completedObservations = receipt.prior_journal.completed.flatMap((wave: MastraSessionLedgerState['completed'][number]) => wave.items.map(item => item.observation)),
    expectedRequests = receipt.successor_journal.items.map(item => parseSessionBridgeRequest(item.request));
  required(
    expectedRequests.length > 0 && expectedRequests.length <= 2 &&
      (receipt.prior_work.lifecycle.risk !== 'high' || expectedRequests.length === 2) &&
      new Set(expectedRequests.map(entry => entry.action_id)).size === expectedRequests.length &&
      expectedRequests.every((entry, index) =>
        entry.config_digest === request.targetConfigDigest && entry.scope_digest === request.currentSourceScope.digest &&
        entry.run_id === action.run_id && entry.workflow_id === action.workflow_id &&
        entry.wave_index === action.request.wave_index && entry.assignment_index === index &&
        entry.stage_id === 'review_source_prewrite' && entry.corrective_execution === undefined &&
        entry.role === (index === 0 ? 'source-planner' : 'security-prewriter')),
    'future configured-frontier current prewriter shape differs',
  );
  required(
    Buffer.from(canonicalJson(snapshot)).equals(bytes) &&
      canonicalJsonDigest(snapshot) === action.engine_snapshot_digest && same(projected, action) &&
      same(snapshot.observations, completedObservations) &&
      receipt.prior_work_version.revision === request.expectedWork.revision &&
      receipt.prior_work_version.digest === request.expectedWork.digest &&
      receipt.prior_ledger_version.revision === request.expectedLedger.revision &&
      receipt.prior_ledger_version.digest === request.expectedLedger.digest &&
      receipt.prior_journal_version.revision === receipt.request.expectedJournal.revision &&
      receipt.prior_journal_version.digest === request.expectedJournal.digest &&
      receipt.prior_work.revision === receipt.prior_work_version.revision &&
      canonicalJsonDigest(receipt.prior_work) === receipt.prior_work_version.digest &&
      receipt.prior_ledger.revision === receipt.prior_ledger_version.revision &&
      canonicalJsonDigest(receipt.prior_ledger) === receipt.prior_ledger_version.digest &&
      canonicalJsonDigest(receipt.prior_journal) === receipt.prior_journal_version.digest &&
      receipt.prior_journal.workspace_id === proofBinding.workspace_id &&
      receipt.prior_journal.work_id === request.identity.work_id &&
      receipt.prior_journal.attempt === receipt.attempt &&
      receipt.prior_journal.run_id === action.run_id &&
      receipt.prior_work.execution.run_id === action.run_id &&
      receipt.prior_work.binding.workflow_id === action.workflow_id &&
      receipt.prior_work.binding.work_source_revision === receipt.prior_journal.source_scope!.digest &&
      same([...receipt.prior_work.lifecycle.scope.allowed_paths].sort(), receipt.prior_journal.source_scope!.entries.map(entry => entry.path).sort()) &&
      receipt.successor_journal.workspace_id === receipt.prior_journal.workspace_id &&
      receipt.successor_journal.work_id === receipt.prior_journal.work_id &&
      receipt.successor_journal.attempt === receipt.prior_journal.attempt &&
      receipt.successor_journal.run_id === action.run_id &&
      receipt.successor_journal.completed.length === receipt.prior_journal.completed.length &&
      same(receipt.successor_journal.completed, receipt.prior_journal.completed) &&
      receipt.successor_journal.step_id === action.step_id &&
      same(receipt.successor_journal.source_scope, request.currentSourceScope) &&
      receipt.successor_journal.items.length === expectedRequests.length &&
      receipt.successor_journal.items.every((item, index) =>
        same(item.request, expectedRequests[index]) &&
        item.issue_id === null && item.observation === null &&
        item.host_reservation === undefined && item.research_activation === undefined &&
        item.research_normalization === undefined) &&
      receipt.successor_journal.corrective_execution == null &&
      receipt.successor_journal.research_wave_exposure === undefined &&
      receipt.journal_version.revision === receipt.prior_journal_version.revision + 1 &&
      canonicalJsonDigest(receipt.successor_journal) === receipt.journal_version.digest &&
      receipt.successor_work.schema === 'WorkState/v1' &&
      receipt.successor_work.workspace_id === proofBinding.workspace_id &&
      receipt.successor_work.binding.lifecycle_work_id === request.identity.work_id &&
      receipt.successor_ledger.schema === 'CoordinationLedger/v1' &&
      receipt.successor_ledger.workspace_id === proofBinding.workspace_id &&
      receipt.successor_journal.schema === 'MastraSessionLedger/v1' &&
      receipt.successor_journal.workspace_id === proofBinding.workspace_id &&
      receipt.successor_journal.work_id === request.identity.work_id &&
      receipt.work_version.revision === receipt.successor_work.revision &&
      canonicalJsonDigest(receipt.successor_work) === receipt.work_version.digest &&
      receipt.ledger_version.revision === receipt.successor_ledger.revision &&
      receipt.successor_ledger.revision === receipt.prior_ledger.revision + 1 &&
      canonicalJsonDigest(receipt.successor_ledger) === receipt.ledger_version.digest &&
      canonicalJsonDigest(receipt.successor_binding) === canonicalJsonDigest(receipt.successor_work.binding) &&
      action.request.corrective_execution === undefined &&
      Array.isArray(receipt.successor_work.execution.assignment_attempts) &&
      receipt.successor_work.execution.assignment_attempts.every((attempt) => ['completed', 'no_effect'].includes(attempt.status)),
    'future configured-frontier snapshot, prefix or prior CAS differs',
  );
  const priorWork = receipt.prior_work,
    priorLedger = receipt.prior_ledger,
    owner = validateConfiguredFrontierOwnerRelease({ work: priorWork, ledger: priorLedger, identity: request.identity, nativeSessionHandle: request.nativeSessionHandle }),
    priorTicket = owner.ticket,
    priorClaims = [owner.claim],
    resources = owner.resources,
    work = receipt.successor_work,
    ledger = receipt.successor_ledger,
    lease = work.lease,
    ticket = lease && ledger.tickets.find((entry) => entry.ticket_id === lease.ticket_id),
    claims = ticket ? ledger.claims.filter((entry) => entry.ticket_id === ticket.ticket_id) : [],
    nextTicket = ticket && priorTicket && {
      ...priorTicket,
      ticket_id: ticket.ticket_id,
      generation: ticket.generation,
      sequence: ticket.sequence,
      source_revision: ticket.source_revision,
      status: 'active',
      claim_ids: ticket.claim_ids,
      expires_at: ticket.expires_at,
      active_resources: ticket.active_resources,
      blocked_resources: ticket.blocked_resources,
      created_at: ticket.created_at,
    },
    nextClaim = claims.length === 1 && priorClaims?.length === 1 && {
      ...priorClaims[0]!,
      claim_id: claims[0]!.claim_id,
      ticket_id: claims[0]!.ticket_id,
      generation: claims[0]!.generation,
      status: 'active',
      lease_expires_at: claims[0]!.lease_expires_at,
      created_at: claims[0]!.created_at,
      renewed_at: claims[0]!.renewed_at,
    };
  const expectedBinding = {
    ...priorWork.binding,
    config_digest: request.targetConfigDigest,
    work_source_revision: request.currentSourceScope.digest,
    runtime_source_revision: request.targetRuntimeCodeDigest,
    runtime_code_digest: request.targetRuntimeCodeDigest,
    schema_digest: request.targetSchemaDigest,
  };
  const expectedWork = {
    ...priorWork,
    revision: priorWork.revision + 1,
    binding: expectedBinding,
    lease: ticket ? { ticket_id: ticket.ticket_id, thread_id: request.nativeSessionHandle, generation: ticket.generation } : null,
    execution: { ...priorWork.execution, status: 'active', phase: 'review' },
    lifecycle: {
      ...priorWork.lifecycle,
      revision: priorWork.revision + 1,
      source_revision: request.currentSourceScope.digest,
      config_binding: { config_digest: request.targetConfigDigest, schema_digest: request.targetSchemaDigest, runtime_code_digest: request.targetRuntimeCodeDigest },
    },
  };
  required(same(work, expectedWork) && same(receipt.successor_binding, expectedBinding),
    'configured-frontier successor Work differs from the permitted original-work projection');
  required(
    priorWork.lease === null &&
      priorWork.execution.status === 'suspended' &&
      ['implementation', 'awaiting_followup'].includes(priorWork.execution.phase) &&
      priorWork.lifecycle.phase === 'INTAKE' &&
      priorWork.lifecycle.seal === null &&
      receipt.successor_ledger.next_sequence === priorLedger.next_sequence + 1 &&
      receipt.successor_ledger.open_generation === priorLedger.open_generation &&
      receipt.successor_ledger.operations.length === priorLedger.operations.length &&
      same(receipt.successor_ledger.operations, priorLedger.operations) &&
      receipt.successor_ledger.tickets.length === priorLedger.tickets.length + 1 &&
      same(receipt.successor_ledger.tickets.filter((entry) => entry.ticket_id !== ticket?.ticket_id), priorLedger.tickets) &&
      same(receipt.successor_ledger.tickets.find((entry) => entry.ticket_id === ticket?.ticket_id), ticket) &&
      receipt.successor_ledger.claims.length === priorLedger.claims.length + 1 &&
      same(receipt.successor_ledger.claims.filter((entry) => entry.claim_id !== claims[0]!?.claim_id), priorLedger.claims) &&
      same(receipt.successor_ledger.claims.find((entry) => entry.claim_id === claims[0]!?.claim_id), claims[0]!) &&
      nextTicket?.sequence === priorLedger.next_sequence &&
      nextTicket?.generation === priorLedger.open_generation &&
      same(nextTicket, ticket) &&
      same(nextClaim, claims[0]!),
    'future configured-frontier prior owner release or FIFO beforeimage differs',
  );
  required(
    work.execution.status === 'active' && work.execution.phase === 'review' &&
      lease?.thread_id === receipt.request.nativeSessionHandle &&
      ticket?.status === 'active' && ticket.work_id === receipt.request.identity.work_id &&
      ticket.thread_id === receipt.request.nativeSessionHandle &&
      ticket.source_revision === receipt.request.currentSourceScope.digest &&
      same(ticket.exclusive_resources, resources) && same(ticket.active_resources, resources) &&
      ticket.expires_at !== null && rfc3339TimestampMilliseconds(ticket.expires_at) !== null &&
      claims.length === 1 && claims[0]!.status === 'active' &&
      claims[0]!.thread_id === receipt.request.nativeSessionHandle &&
      claims[0]!.work_id === receipt.request.identity.work_id && same(claims[0]!.resources, resources) &&
      rfc3339TimestampMilliseconds(claims[0]!.lease_expires_at) !== null &&
      !ledger.tickets.some((candidate) =>
        candidate.ticket_id !== ticket.ticket_id &&
        (['active', 'ready_for_handoff', 'blocked'].includes(candidate.status) || candidate.status === 'queued' && candidate.sequence < ticket.sequence) &&
        candidate.exclusive_resources.some(resource => resources.includes(resource))),
    'future configured-frontier owner or FIFO beforeimage differs',
  );
  return { branch: 'configured_frontier' as const, snapshot_sha256: receipt.frontier_snapshot.snapshot_sha256 };
}

/** Current repair dependencies remain exact and live; immutable history never supplies this check. */
export function validateConfiguredFrontierRepairReceipt(input: FrontierValidationInput) {
  const structure = validateConfiguredFrontierReceiptStructure(input);
  const { receipt, current } = input;
  required(input.prewriterBinding, 'trusted current prewriter binding is required for live repair');
  const snapshot = JSON.parse(Buffer.from(receipt.frontier_snapshot.snapshot_bytes_base64, 'base64').toString('utf8')) as SessionBridgeSnapshot;
  const expectedRequests = projectConfiguredPrewriterContinuationRequests({
    ...input.prewriterBinding,
    engine: snapshot,
    journal: receipt.prior_journal,
    currentSourceScope: receipt.request.currentSourceScope,
    lifecycleRisk: receipt.prior_work.lifecycle.risk,
  });
  required(
    input.prewriterBinding.workflowId === receipt.request.action.workflow_id &&
      expectedRequests.every(entry => entry.config_digest === receipt.request.targetConfigDigest) &&
      same(expectedRequests, receipt.successor_journal.items.map(item => item.request)),
    'future configured-frontier full current prewriter wave differs',
  );
  required(
    current?.work && current?.ledger && current?.journal &&
      same(current.work, receipt.successor_work) &&
      same(current.ledger, receipt.successor_ledger) &&
      same(current.journal, receipt.successor_journal) &&
      same(current.work_version, receipt.work_version) &&
      same(current.ledger_version, receipt.ledger_version) &&
      same(current.journal_version, receipt.journal_version),
    'future configured-frontier current repair dependency differs',
  );
  const lease = current.work.lease;
  required(lease, 'future configured-frontier current repair owner lease is missing');
  const ticket = current.ledger.tickets.find(entry => entry.ticket_id === lease.ticket_id);
  required(ticket && ticket.expires_at !== null, 'future configured-frontier current repair owner ticket is missing');
  const claims = current.ledger.claims.filter(entry => entry.ticket_id === ticket.ticket_id);
  const now = Date.now();
  required(
    Date.parse(ticket.expires_at) > now && claims.every(claim => Date.parse(claim.lease_expires_at) > now),
    'future configured-frontier current repair lease expired',
  );
  return structure;
}

export function assertApplicableRepairBranch(branch: string) {
  required(branch === 'historical_terminal_review' || branch === 'configured_frontier', 'delivered-work continuation repair branch is unsupported');
}
