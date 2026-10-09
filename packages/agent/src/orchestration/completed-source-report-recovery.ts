import { canonicalJsonDigest, freezeJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import { projectQualifiedRuntimeCodeAncestor } from './qualified-runtime-code-continuation.js';
import type { CoordinationClaim, CoordinationTicket } from '../contracts/envelopes.js';
import type { AssignmentAttempt, HostStateSnapshot, StateVersion, WorkIdentity, WorkState } from '../host-state.js';
import { completedSourceJournalObservationMatches } from '../host-state.js';
import type { WorkflowSessionReservation } from '../runtime-kernel.js';
import type { InitialSourceContinuationReceipt } from './initial-source-continuation.js';
import { validateInitialSourceContinuationReceipt } from './initial-source-continuation.js';
import type { InitialSourceFrontierCodeRebindReceipt } from './initial-source-frontier-code-rebind.js';
import { validateInitialSourceFrontierCodeRebindReceipt } from './initial-source-frontier-code-rebind.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import { compareScopedSourceSnapshots } from './scoped-source-snapshot.js';

const hashPattern = /^[a-f0-9]{64}$/;
const requestKeys = [
  'schema',
  'identity',
  'attempt',
  'actionId',
  'issueId',
  'hostAttemptId',
  'nativeSessionHandle',
  'leaseGeneration',
  'expectedWork',
  'expectedLedger',
  'expectedJournal',
  'expectedMaintenanceGeneration',
  'initialContinuationId',
  'initialContinuationRequestDigest',
  'frontierReceiptId',
  'frontierRequestDigest',
  'sourceReservationDigest',
  'originalSourceAuthorizationDigest',
  'originalSourceScopeDigest',
  'evolvedJournalSourceScopeDigest',
  'reportId',
  'reportDigest',
  'sourceDiffDigest',
  'reportSourcePaths',
  'nextJournal',
  'sourceSnapshotRef',
  'sourceDiffRef',
  'changedPaths',
  'oldRuntimeCodeDigest',
  'oldRuntimeCodePaths',
  'currentRuntimeCodeDigest',
  'currentRuntimeCodePaths',
  'oldManifestRef',
  'oldManifestDigest',
  'oldInstallRef',
  'currentManifestRef',
  'currentManifestDigest',
  'currentInstallRef',
  'systemUpdateRef',
  'systemUpdateOperationId',
  'nativeSelfAttestationDigest',
  'terminalCallerObservationRef',
  'terminalCommandReceiptRef',
] as const;
const verifiedKeys = [
  'schema',
  'terminal',
  'source',
  'oldRuntime',
  'currentRuntime',
  'systemUpdate',
  'nativeSelfAttestationDigest',
] as const;
const terminalKeys = [
  'ownerId',
  'ownerThreadId',
  'nativeSessionHandle',
  'attempt',
  'actionId',
  'issueId',
  'hostAttemptId',
  'leaseGeneration',
  'quiescent',
  'outcome',
  'callerObservationRef',
  'commandReceiptRef',
  'reportId',
  'reportDigest',
  'sourceDiffDigest',
  'reportSourcePaths',
] as const;
const sourceKeys = [
  'reservationDigest',
  'authorizationDigest',
  'originalScopeDigest',
  'evolvedScopeDigest',
  'snapshotRef',
  'diffRef',
  'changedPaths',
] as const;
const runtimeKeys = ['codeDigest', 'codePaths', 'manifestRef', 'manifestDigest', 'installRef'] as const;
const systemUpdateKeys = ['ref', 'operationId'] as const;
const recordKeys = [
  'schema',
  'identity',
  'attempt',
  'request',
  'request_digest',
  'prior_work',
  'prior_work_version',
  'prior_ledger_version',
  'prior_journal',
  'prior_journal_version',
  'original_reservation',
  'original_source_ticket',
  'original_source_claim',
  'completed_attempt',
  'verified_current',
  'successor_work',
  'work_version',
  'successor_ledger_version',
  'successor_journal',
  'journal_version',
  'execution_ticket',
  'execution_claim',
  'source_write_rights',
  'runtime_acceptance',
  'status',
] as const;
const receiptKeys = [
  'schema',
  'identity',
  'attempt',
  'action_id',
  'issue_id',
  'report_id',
  'request_digest',
  'record_digest',
  'work_version',
  'ledger_version',
  'journal_version',
  'maintenance_generation',
  'status',
  'source_write_rights',
  'runtime_acceptance',
  'record',
] as const;

function requireRecovery(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('completed Source report recovery: ' + message);
}
function exactKeys(value: unknown, keys: readonly string[]): boolean {
  return (
    isPlainRecord(value) &&
    Reflect.ownKeys(value).length === keys.length &&
    Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key as never))
  );
}
function exactEnvelope(
  value: unknown,
  keys: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  requireRecovery(exactKeys(value, keys), `${label} fields differ`);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireRecovery(
      descriptor?.enumerable &&
        Object.hasOwn(descriptor, 'value') &&
        descriptor.get === undefined &&
        descriptor.set === undefined,
      `${label} fields must be data properties`,
    );
  }
}
function hash(value: unknown): value is string {
  return typeof value === 'string' && hashPattern.test(value);
}
function text(value: unknown, maximum = 4096): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximum &&
    value.trim() === value &&
    !/\p{Cc}/u.test(value)
  );
}
function stateVersion(value: unknown): value is StateVersion {
  return (
    exactKeys(value, ['revision', 'digest']) &&
    Number.isSafeInteger((value as StateVersion).revision) &&
    (value as StateVersion).revision > 0 &&
    hash((value as StateVersion).digest)
  );
}
function same(left: unknown, right: unknown): boolean {
  try {
    return canonicalJsonDigest(left) === canonicalJsonDigest(right);
  } catch {
    return false;
  }
}
function validIdentity(value: unknown): value is WorkIdentity {
  if (!exactKeys(value, ['repository_id', 'project_ids', 'integrations_digest', 'work_id'])) return false;
  const identity = value as WorkIdentity;
  return (
    text(identity.repository_id, 256) &&
    Array.isArray(identity.project_ids) &&
    identity.project_ids.length > 0 &&
    identity.project_ids.length <= 64 &&
    identity.project_ids.every((item) => text(item, 256)) &&
    same(identity.project_ids, [...new Set(identity.project_ids)].sort()) &&
    hash(identity.integrations_digest) &&
    text(identity.work_id, 256)
  );
}
function canonicalPaths(value: unknown, maximumCount: number): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= maximumCount &&
    value.every(
      (entry) =>
        typeof entry === 'string' &&
        entry.length > 0 &&
        entry.length <= 1024 &&
        !entry.includes('\\') &&
        !entry.startsWith('/') &&
        !/\p{Cc}/u.test(entry) &&
        entry.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..'),
    ) &&
    same(
      value,
      [...new Set(value)].sort((left: unknown, right: unknown) =>
        String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0,
      ),
    )
  );
}
function runtimePaths(value: unknown): value is readonly string[] {
  return canonicalPaths(value, 4096);
}
function sourcePaths(value: unknown): value is readonly string[] {
  return canonicalPaths(value, 512);
}
function equalsWorkIdentity(work: WorkState, identity: WorkIdentity): boolean {
  return (
    work.binding.repository_id === identity.repository_id &&
    same(work.binding.project_ids, identity.project_ids) &&
    work.binding.integrations_digest === identity.integrations_digest &&
    work.binding.lifecycle_work_id === identity.work_id
  );
}
function workIdentityCore(work: Pick<WorkState, 'binding' | 'lifecycle'>): Record<string, unknown> {
  const result = { ...work } as unknown as Record<string, unknown>;
  delete result.revision;
  delete result.lease;
  const binding = { ...work.binding } as unknown as Record<string, unknown>;
  delete binding.runtime_code_digest;
  delete binding.runtime_source_revision;
  result.binding = binding;
  const lifecycle = { ...work.lifecycle } as unknown as Record<string, unknown>;
  delete lifecycle.revision;
  const config = { ...work.lifecycle.config_binding } as unknown as Record<string, unknown>;
  delete config.runtime_code_digest;
  lifecycle.config_binding = config;
  result.lifecycle = lifecycle;
  return result;
}
function recoveryWorkDescendantCore(work: WorkState): Record<string, unknown> {
  const lifecycle = { ...work.lifecycle } as unknown as Record<string, unknown>;
  delete lifecycle.revision;
  delete lifecycle.phase;
  delete lifecycle.next_action;
  delete lifecycle.seal;
  delete lifecycle.assurance;
  const configBinding = { ...work.lifecycle.config_binding } as unknown as Record<string, unknown>;
  delete configBinding.runtime_code_digest;
  lifecycle.config_binding = configBinding;
  return {
    schema: work.schema,
    workspace_id: work.workspace_id,
    binding: work.binding,
    contracts: work.contracts,
    migration: work.migration ?? null,
    request_transition: work.request_transition ?? null,
    execution: { run_id: work.execution.run_id, input_digest: work.execution.input_digest },
    lifecycle,
    artifacts: work.artifacts,
  };
}
function preservesAttemptPrefix(ancestor: WorkState, descendant: WorkState): boolean {
  const prefix = ancestor.execution.assignment_attempts,
    current = descendant.execution.assignment_attempts;
  return current.length >= prefix.length && prefix.every((attempt, index) => same(attempt, current[index]));
}
function recoveryExecutionTicketMatches(
  ticket: unknown,
  request: CompletedSourceReportRecoveryRequest,
  source: CoordinationTicket,
): ticket is CoordinationTicket {
  const resource = `execution:${request.identity.work_id}`;
  return (
    isPlainRecord(ticket) &&
    ticket.schema === 'CoordinationTicket/v1' &&
    ticket.repository_id === request.identity.repository_id &&
    same(ticket.project_ids, request.identity.project_ids) &&
    ticket.integrations_digest === request.identity.integrations_digest &&
    ticket.work_id === request.identity.work_id &&
    ticket.thread_id === request.nativeSessionHandle &&
    ticket.source_revision === source.source_revision &&
    same(ticket.contour_keys, source.contour_keys) &&
    same(ticket.exclusive_resources, [resource]) &&
    Array.isArray(ticket.claim_ids) &&
    ticket.claim_ids.length === 1 &&
    Array.isArray(ticket.blocked_resources) &&
    ticket.blocked_resources.length === 0 &&
    typeof ticket.generation === 'number' &&
    Number.isSafeInteger(ticket.generation) &&
    ticket.generation > 0
  );
}
function recoveryExecutionClaimMatches(
  claim: unknown,
  ticket: CoordinationTicket,
  request: CompletedSourceReportRecoveryRequest,
  claimId?: string,
): claim is CoordinationClaim {
  return (
    isPlainRecord(claim) &&
    claim.schema === 'WorkstreamClaim/v1' &&
    (claimId === undefined || claim.claim_id === claimId) &&
    claim.ticket_id === ticket.ticket_id &&
    claim.work_id === request.identity.work_id &&
    claim.thread_id === request.nativeSessionHandle &&
    claim.generation === ticket.generation &&
    same(claim.resources, [`execution:${request.identity.work_id}`])
  );
}
function validExpiredExecutionRebindChain(
  ledger: NonNullable<HostStateSnapshot['ledger']>,
  work: WorkState,
  record: CompletedSourceReportRecoveryRecord,
): boolean {
  const request = record.request,
    workId = request.identity.work_id,
    resource = `execution:${workId}`;
  const predecessor = record.execution_ticket,
    predecessorClaim = record.execution_claim;
  const scopedRebinds = ledger.rebinds.filter((entry) => isPlainRecord(entry) && entry.work_id === workId);
  if (scopedRebinds.some((entry) => !Number.isSafeInteger(entry.to_ledger_revision))) return false;
  const recoveries = scopedRebinds.filter(
    (entry) => Number(entry.to_ledger_revision) > record.successor_ledger_version.revision,
  );
  let previousTicketId = predecessor.ticket_id,
    previousClaimId = predecessorClaim.claim_id;
  let previousGeneration = predecessor.generation;
  let previousRebindRevision = record.successor_ledger_version.revision;
  const expectedRebindKeys = [
    'schema',
    'rebind_id',
    'work_id',
    'previous_ticket_id',
    'previous_source_revision',
    'ticket_id',
    'thread_id',
    'source_revision',
    'resources',
    'claimed_resources',
    'retired_claim_ids',
    'reason',
    'decided_by',
    'decision_pointer',
    'from_ledger_revision',
    'to_ledger_revision',
    'created_at',
  ] as const;
  for (const rebind of recoveries) {
    if (
      !exactKeys(rebind, expectedRebindKeys) ||
      rebind.schema !== 'CoordinationScopeRebind/v1' ||
      rebind.work_id !== workId ||
      rebind.thread_id !== request.nativeSessionHandle ||
      rebind.decided_by !== request.nativeSessionHandle ||
      rebind.reason !== 'expired same-owner quiescent lease recovery' ||
      rebind.previous_ticket_id !== previousTicketId ||
      rebind.previous_source_revision !== predecessor.source_revision ||
      rebind.source_revision !== predecessor.source_revision ||
      !text(rebind.rebind_id, 256) ||
      !text(rebind.ticket_id, 256) ||
      !text(rebind.decision_pointer, 512) ||
      !same(rebind.resources, [resource]) ||
      !same(rebind.claimed_resources, [resource]) ||
      !same(rebind.retired_claim_ids, [previousClaimId]) ||
      !Number.isSafeInteger(rebind.from_ledger_revision) ||
      !Number.isSafeInteger(rebind.to_ledger_revision) ||
      Number(rebind.from_ledger_revision) < previousRebindRevision ||
      Number(rebind.to_ledger_revision) !== Number(rebind.from_ledger_revision) + 1 ||
      Number(rebind.to_ledger_revision) > ledger.revision ||
      !text(rebind.created_at, 64) ||
      !Number.isFinite(Date.parse(rebind.created_at))
    )
      return false;
    const oldTicket = ledger.tickets.find((entry) => entry.ticket_id === previousTicketId);
    const oldClaim = ledger.claims.find((entry) => entry.claim_id === previousClaimId);
    if (
      !oldTicket ||
      !recoveryExecutionTicketMatches(oldTicket, request, predecessor) ||
      oldTicket.generation !== previousGeneration ||
      oldTicket.status !== 'read_only' ||
      oldTicket.expires_at !== null ||
      oldTicket.active_resources.length !== 0 ||
      oldTicket.blocked_resources.length !== 0 ||
      !same(oldTicket.claim_ids, [previousClaimId]) ||
      !oldClaim ||
      !recoveryExecutionClaimMatches(oldClaim, oldTicket, request, predecessorClaim.claim_id) ||
      oldClaim.status !== 'recovered' ||
      !Number.isFinite(Date.parse(oldClaim.lease_expires_at)) ||
      Date.parse(oldClaim.lease_expires_at) > Date.parse(rebind.created_at)
    )
      return false;
    const nextTicket = ledger.tickets.find((entry) => entry.ticket_id === rebind.ticket_id);
    const nextClaims = nextTicket ? ledger.claims.filter((entry) => nextTicket.claim_ids.includes(entry.claim_id)) : [];
    if (
      !nextTicket ||
      !recoveryExecutionTicketMatches(nextTicket, request, predecessor) ||
      nextClaims.length !== 1 ||
      !recoveryExecutionClaimMatches(nextClaims[0], nextTicket, request)
    )
      return false;
    const nextClaim = nextClaims[0]!;
    if (nextTicket.status === 'active') {
      if (
        !same(nextTicket.active_resources, [resource]) ||
        nextTicket.expires_at === null ||
        nextClaim.status !== 'active'
      )
        return false;
    } else if (nextTicket.status === 'read_only') {
      if (
        nextTicket.expires_at !== null ||
        nextTicket.active_resources.length !== 0 ||
        nextClaim.status !== 'recovered'
      )
        return false;
    } else return false;
    previousTicketId = nextTicket.ticket_id;
    previousClaimId = nextClaim.claim_id;
    previousGeneration = nextTicket.generation;
    previousRebindRevision = Number(rebind.to_ledger_revision);
  }
  const currentLease = work.lease;
  const currentTicket = currentLease && ledger.tickets.find((entry) => entry.ticket_id === currentLease.ticket_id);
  const currentClaims = currentTicket
    ? ledger.claims.filter((entry) => currentTicket.claim_ids.includes(entry.claim_id) && entry.status === 'active')
    : [];
  const activeOwners = ledger.claims.filter((entry) => entry.status === 'active' && entry.resources.includes(resource));
  return Boolean(
    currentLease &&
    currentLease.ticket_id === previousTicketId &&
    currentLease.thread_id === request.nativeSessionHandle &&
    currentTicket &&
    recoveryExecutionTicketMatches(currentTicket, request, predecessor) &&
    currentTicket.status === 'active' &&
    same(currentTicket.active_resources, [resource]) &&
    currentTicket.expires_at !== null &&
    currentLease.generation === currentTicket.generation &&
    currentClaims.length === 1 &&
    currentClaims[0]!.claim_id === previousClaimId &&
    recoveryExecutionClaimMatches(currentClaims[0], currentTicket, request, previousClaimId) &&
    currentClaims[0]!.status === 'active' &&
    activeOwners.length === 1 &&
    activeOwners[0]!.claim_id === previousClaimId &&
    activeOwners[0]!.ticket_id === currentTicket.ticket_id,
  );
}
function exactCompletedItems(journal: MastraSessionLedgerState, actionId: string, issueId: string) {
  return [...journal.completed.flatMap((wave) => wave.items), ...journal.items].filter(
    (item) => item.request.action_id === actionId && item.issue_id === issueId && item.observation !== null,
  );
}
function checkJournal(
  value: unknown,
  identity: WorkIdentity,
  attempt: number,
): asserts value is MastraSessionLedgerState {
  requireRecovery(
    isPlainRecord(value) &&
      value.schema === 'MastraSessionLedger/v1' &&
      value.work_id === identity.work_id &&
      Number.isSafeInteger(value.attempt) &&
      value.attempt === attempt &&
      text(value.workspace_id, 256) &&
      text(value.run_id, 256) &&
      Array.isArray(value.items) &&
      Array.isArray(value.completed) &&
      value.completed.every((wave) => isPlainRecord(wave) && text(wave.step_id, 256) && Array.isArray(wave.items)),
    'Journal identity or shape invalid',
  );
}

export interface CompletedSourceReportRecoveryRequest {
  readonly schema: 'CompletedSourceReportRecoveryRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
  readonly hostAttemptId: string;
  readonly nativeSessionHandle: string;
  readonly leaseGeneration: number;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly initialContinuationId: string;
  readonly initialContinuationRequestDigest: string;
  readonly frontierReceiptId: string | null;
  readonly frontierRequestDigest: string | null;
  readonly sourceReservationDigest: string;
  readonly originalSourceAuthorizationDigest: string;
  readonly originalSourceScopeDigest: string;
  readonly evolvedJournalSourceScopeDigest: string;
  readonly reportId: string;
  readonly reportDigest: string;
  readonly sourceDiffDigest: string;
  readonly reportSourcePaths: readonly string[];
  readonly nextJournal: MastraSessionLedgerState;
  readonly sourceSnapshotRef: string;
  readonly sourceDiffRef: string;
  readonly changedPaths: readonly string[];
  readonly oldRuntimeCodeDigest: string;
  readonly oldRuntimeCodePaths: readonly string[];
  readonly currentRuntimeCodeDigest: string;
  readonly currentRuntimeCodePaths: readonly string[];
  readonly oldManifestRef: string;
  readonly oldManifestDigest: string;
  readonly oldInstallRef: string;
  readonly currentManifestRef: string;
  readonly currentManifestDigest: string;
  readonly currentInstallRef: string;
  readonly systemUpdateRef: string;
  readonly systemUpdateOperationId: string;
  readonly nativeSelfAttestationDigest: string;
  readonly terminalCallerObservationRef: string;
  readonly terminalCommandReceiptRef: string;
}

export interface CompletedSourceReportRecoveryVerifiedCurrent {
  readonly schema: 'CompletedSourceReportRecoveryVerifiedCurrent/v1';
  readonly terminal: {
    readonly ownerId: string;
    readonly ownerThreadId: string;
    readonly nativeSessionHandle: string;
    readonly attempt: number;
    readonly actionId: string;
    readonly issueId: string;
    readonly hostAttemptId: string;
    readonly leaseGeneration: number;
    readonly quiescent: true;
    readonly outcome: 'reported_complete';
    readonly callerObservationRef: string;
    readonly commandReceiptRef: string;
    readonly reportId: string;
    readonly reportDigest: string;
    readonly sourceDiffDigest: string;
    readonly reportSourcePaths: readonly string[];
  };
  readonly source: {
    readonly reservationDigest: string;
    readonly authorizationDigest: string;
    readonly originalScopeDigest: string;
    readonly evolvedScopeDigest: string;
    readonly snapshotRef: string;
    readonly diffRef: string;
    readonly changedPaths: readonly string[];
  };
  readonly oldRuntime: {
    readonly codeDigest: string;
    readonly codePaths: readonly string[];
    readonly manifestRef: string;
    readonly manifestDigest: string;
    readonly installRef: string;
  };
  readonly currentRuntime: {
    readonly codeDigest: string;
    readonly codePaths: readonly string[];
    readonly manifestRef: string;
    readonly manifestDigest: string;
    readonly installRef: string;
  };
  readonly systemUpdate: { readonly ref: string; readonly operationId: string };
  readonly nativeSelfAttestationDigest: string;
}
export interface CompletedSourceReportRecoveryState {
  readonly host: HostStateSnapshot;
  readonly journal: { readonly version: StateVersion; readonly state: MastraSessionLedgerState };
  readonly initialReceipt: InitialSourceContinuationReceipt | null;
  readonly frontierReceipt: InitialSourceFrontierCodeRebindReceipt | null;
  readonly recoveryReceipt: CompletedSourceReportRecoveryReceipt | null;
}
export type CompletedSourceReportRecoveryVerifyCurrent = (
  request: CompletedSourceReportRecoveryRequest,
  state: CompletedSourceReportRecoveryState,
) => CompletedSourceReportRecoveryVerifiedCurrent;
export interface CompletedSourceReportRecoveryRecord {
  readonly schema: 'CompletedSourceReportRecoveryRecord/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly request: CompletedSourceReportRecoveryRequest;
  readonly request_digest: string;
  readonly prior_work: WorkState;
  readonly prior_work_version: StateVersion;
  readonly prior_ledger_version: StateVersion;
  readonly prior_journal: MastraSessionLedgerState;
  readonly prior_journal_version: StateVersion;
  readonly original_reservation: WorkflowSessionReservation;
  readonly original_source_ticket: CoordinationTicket;
  readonly original_source_claim: CoordinationClaim;
  readonly completed_attempt: AssignmentAttempt;
  readonly verified_current: CompletedSourceReportRecoveryVerifiedCurrent;
  readonly successor_work: WorkState;
  readonly work_version: StateVersion;
  readonly successor_ledger_version: StateVersion;
  readonly successor_journal: MastraSessionLedgerState;
  readonly journal_version: StateVersion;
  readonly execution_ticket: CoordinationTicket;
  readonly execution_claim: CoordinationClaim;
  readonly source_write_rights: false;
  readonly runtime_acceptance: false;
  readonly status: 'completed_report_recovered';
}
export interface CompletedSourceReportRecoveryReceipt {
  readonly schema: 'CompletedSourceReportRecoveryReceipt/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly action_id: string;
  readonly issue_id: string;
  readonly report_id: string;
  readonly request_digest: string;
  readonly record_digest: string;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly journal_version: StateVersion;
  readonly maintenance_generation: number;
  readonly status: 'completed_report_recovered';
  readonly source_write_rights: false;
  readonly runtime_acceptance: false;
  readonly record: CompletedSourceReportRecoveryRecord;
}

export function validateCompletedSourceReportRecoveryRequest(value: unknown): CompletedSourceReportRecoveryRequest {
  exactEnvelope(value, requestKeys, 'request');
  const r = value as unknown as CompletedSourceReportRecoveryRequest;
  requireRecovery(
    r.schema === 'CompletedSourceReportRecoveryRequest/v1' &&
      validIdentity(r.identity) &&
      Number.isSafeInteger(r.attempt) &&
      r.attempt > 0 &&
      text(r.actionId, 256) &&
      text(r.issueId, 256) &&
      text(r.hostAttemptId, 256) &&
      text(r.nativeSessionHandle, 256) &&
      Number.isSafeInteger(r.leaseGeneration) &&
      r.leaseGeneration > 0 &&
      stateVersion(r.expectedWork) &&
      stateVersion(r.expectedLedger) &&
      stateVersion(r.expectedJournal) &&
      Number.isSafeInteger(r.expectedMaintenanceGeneration) &&
      r.expectedMaintenanceGeneration >= 0 &&
      text(r.initialContinuationId, 256) &&
      hash(r.initialContinuationRequestDigest) &&
      ((r.frontierReceiptId === null && r.frontierRequestDigest === null) ||
        (text(r.frontierReceiptId, 256) && hash(r.frontierRequestDigest))) &&
      hash(r.sourceReservationDigest) &&
      hash(r.originalSourceAuthorizationDigest) &&
      hash(r.originalSourceScopeDigest) &&
      hash(r.evolvedJournalSourceScopeDigest) &&
      text(r.reportId, 256) &&
      hash(r.reportDigest) &&
      hash(r.sourceDiffDigest) &&
      sourcePaths(r.reportSourcePaths) &&
      text(r.sourceSnapshotRef, 2048) &&
      text(r.sourceDiffRef, 2048) &&
      sourcePaths(r.changedPaths) &&
      hash(r.oldRuntimeCodeDigest) &&
      runtimePaths(r.oldRuntimeCodePaths) &&
      hash(r.currentRuntimeCodeDigest) &&
      runtimePaths(r.currentRuntimeCodePaths) &&
      text(r.oldManifestRef, 2048) &&
      hash(r.oldManifestDigest) &&
      text(r.oldInstallRef, 2048) &&
      text(r.currentManifestRef, 2048) &&
      hash(r.currentManifestDigest) &&
      text(r.currentInstallRef, 2048) &&
      text(r.systemUpdateRef, 2048) &&
      text(r.systemUpdateOperationId, 256) &&
      hash(r.nativeSelfAttestationDigest) &&
      text(r.terminalCallerObservationRef, 2048) &&
      text(r.terminalCommandReceiptRef, 2048),
    'request fields or bounds invalid',
  );
  checkJournal(r.nextJournal, r.identity, r.attempt);
  return r;
}

export function validateCompletedSourceReportRecoveryVerifiedCurrent(
  value: unknown,
  requestValue: unknown,
): CompletedSourceReportRecoveryVerifiedCurrent {
  const r = validateCompletedSourceReportRecoveryRequest(requestValue);
  exactEnvelope(value, verifiedKeys, 'verified current');
  const p = value as unknown as CompletedSourceReportRecoveryVerifiedCurrent;
  exactEnvelope(p.terminal, terminalKeys, 'verified terminal');
  exactEnvelope(p.source, sourceKeys, 'verified source');
  exactEnvelope(p.oldRuntime, runtimeKeys, 'verified old runtime');
  exactEnvelope(p.currentRuntime, runtimeKeys, 'verified target runtime');
  exactEnvelope(p.systemUpdate, systemUpdateKeys, 'verified update');
  requireRecovery(
    p.schema === 'CompletedSourceReportRecoveryVerifiedCurrent/v1' &&
      text(p.terminal.ownerId, 256) &&
      text(p.terminal.ownerThreadId, 256) &&
      p.terminal.nativeSessionHandle === r.nativeSessionHandle &&
      p.terminal.attempt === r.attempt &&
      p.terminal.actionId === r.actionId &&
      p.terminal.issueId === r.issueId &&
      p.terminal.hostAttemptId === r.hostAttemptId &&
      p.terminal.leaseGeneration === r.leaseGeneration &&
      p.terminal.quiescent === true &&
      p.terminal.outcome === 'reported_complete' &&
      p.terminal.callerObservationRef === r.terminalCallerObservationRef &&
      p.terminal.commandReceiptRef === r.terminalCommandReceiptRef &&
      p.terminal.reportId === r.reportId &&
      p.terminal.reportDigest === r.reportDigest &&
      p.terminal.sourceDiffDigest === r.sourceDiffDigest &&
      same(p.terminal.reportSourcePaths, r.reportSourcePaths) &&
      p.source.reservationDigest === r.sourceReservationDigest &&
      p.source.authorizationDigest === r.originalSourceAuthorizationDigest &&
      p.source.originalScopeDigest === r.originalSourceScopeDigest &&
      p.source.evolvedScopeDigest === r.evolvedJournalSourceScopeDigest &&
      p.source.snapshotRef === r.sourceSnapshotRef &&
      p.source.diffRef === r.sourceDiffRef &&
      same(p.source.changedPaths, r.changedPaths) &&
      p.oldRuntime.codeDigest === r.oldRuntimeCodeDigest &&
      same(p.oldRuntime.codePaths, r.oldRuntimeCodePaths) &&
      p.oldRuntime.manifestRef === r.oldManifestRef &&
      p.oldRuntime.manifestDigest === r.oldManifestDigest &&
      p.oldRuntime.installRef === r.oldInstallRef &&
      p.currentRuntime.codeDigest === r.currentRuntimeCodeDigest &&
      same(p.currentRuntime.codePaths, r.currentRuntimeCodePaths) &&
      p.currentRuntime.manifestRef === r.currentManifestRef &&
      p.currentRuntime.manifestDigest === r.currentManifestDigest &&
      p.currentRuntime.installRef === r.currentInstallRef &&
      p.systemUpdate.ref === r.systemUpdateRef &&
      p.systemUpdate.operationId === r.systemUpdateOperationId &&
      p.nativeSelfAttestationDigest === r.nativeSelfAttestationDigest,
    'verified terminal, source, native, or update proof differs from request',
  );
  return p;
}

export function buildCompletedSourceReportRecoverySuccessorWork(
  priorWork: WorkState,
  requestValue: unknown,
  completedAttempt: AssignmentAttempt,
  executionTicket: CoordinationTicket,
): WorkState {
  const request = validateCompletedSourceReportRecoveryRequest(requestValue);
  requireRecovery(
    priorWork.schema === 'WorkState/v1' &&
      equalsWorkIdentity(priorWork, request.identity) &&
      priorWork.revision === request.expectedWork.revision &&
      priorWork.lease?.thread_id === request.nativeSessionHandle &&
      priorWork.lease.generation === request.leaseGeneration &&
      priorWork.execution.status === 'active',
    'prior Work or owner differs',
  );
  const resource = `execution:${request.identity.work_id}`;
  requireRecovery(
    executionTicket.schema === 'CoordinationTicket/v1' &&
      executionTicket.work_id === request.identity.work_id &&
      executionTicket.thread_id === request.nativeSessionHandle &&
      executionTicket.generation === request.leaseGeneration &&
      executionTicket.status === 'active' &&
      same(executionTicket.exclusive_resources, [resource]) &&
      same(executionTicket.active_resources, [resource]) &&
      !executionTicket.exclusive_resources.some((entry) => entry.startsWith('file:')),
    'successor ticket is not execution-only',
  );
  const priorAttempt = priorWork.execution.assignment_attempts.find(
    (entry) => entry.attempt_id === request.hostAttemptId,
  );
  requireRecovery(
    priorAttempt?.status === 'started' &&
      priorAttempt.result === null &&
      priorAttempt.result_digest === null &&
      completedAttempt.attempt_id === request.hostAttemptId &&
      completedAttempt.status === 'completed' &&
      completedAttempt.result !== null &&
      completedAttempt.result_digest === canonicalJsonDigest(completedAttempt.result) &&
      completedAttempt.request_digest === priorAttempt.request_digest &&
      completedAttempt.stage_id === priorAttempt.stage_id &&
      completedAttempt.assignment_index === priorAttempt.assignment_index &&
      same(completedAttempt.lease, priorAttempt.lease) &&
      priorWork.execution.assignment_attempts.filter((entry) => ['started', 'uncertain'].includes(entry.status))
        .length === 1,
    'successor must complete only the exact started source attempt',
  );
  const reported = exactCompletedItems(request.nextJournal, request.actionId, request.issueId);
  requireRecovery(
    reported.length === 1 &&
      same(completedAttempt.result, reported[0]!.observation) &&
      completedAttempt.result_digest === request.reportDigest,
    'completed attempt does not carry the exact Journal report',
  );
  const successor: WorkState = {
    ...priorWork,
    revision: priorWork.revision + 2,
    execution: {
      ...priorWork.execution,
      assignment_attempts: priorWork.execution.assignment_attempts.map((entry) =>
        entry.attempt_id === request.hostAttemptId ? completedAttempt : entry,
      ),
    },
    binding: {
      ...priorWork.binding,
      runtime_code_digest: request.currentRuntimeCodeDigest,
      runtime_source_revision: request.currentRuntimeCodeDigest,
    },
    lease: {
      ticket_id: executionTicket.ticket_id,
      thread_id: executionTicket.thread_id,
      generation: executionTicket.generation,
    },
    lifecycle: {
      ...priorWork.lifecycle,
      revision: priorWork.lifecycle.revision + 2,
      config_binding: { ...priorWork.lifecycle.config_binding, runtime_code_digest: request.currentRuntimeCodeDigest },
    },
  };
  const priorAfterCompletion = {
    ...priorWork,
    execution: {
      ...priorWork.execution,
      assignment_attempts: priorWork.execution.assignment_attempts.map((entry) =>
        entry.attempt_id === request.hostAttemptId ? completedAttempt : entry,
      ),
    },
  };
  requireRecovery(
    same(workIdentityCore(priorAfterCompletion), workIdentityCore(successor)),
    'successor Work changed beyond the exact completed attempt, runtime binding, lease, and revisions',
  );
  return freezeJsonValue(successor);
}

export function validateCompletedSourceReportRecoveryRecord(value: unknown): CompletedSourceReportRecoveryRecord {
  exactEnvelope(value, recordKeys, 'record');
  const record = value as unknown as CompletedSourceReportRecoveryRecord;
  const request = validateCompletedSourceReportRecoveryRequest(record.request);
  validateCompletedSourceReportRecoveryVerifiedCurrent(record.verified_current, request);
  const priorWorkRecord = isPlainRecord(record.prior_work) ? record.prior_work : null;
  const priorExecution = priorWorkRecord && isPlainRecord(priorWorkRecord.execution) ? priorWorkRecord.execution : null;
  const priorAttempts: readonly unknown[] =
    priorExecution && Array.isArray(priorExecution.assignment_attempts) ? priorExecution.assignment_attempts : [];
  const successorWorkRecord = isPlainRecord(record.successor_work) ? record.successor_work : null;
  const successorExecution =
    successorWorkRecord && isPlainRecord(successorWorkRecord.execution) ? successorWorkRecord.execution : null;
  const successorAttempts: readonly unknown[] =
    successorExecution && Array.isArray(successorExecution.assignment_attempts)
      ? successorExecution.assignment_attempts
      : [];
  const priorAttempt = priorAttempts.find(
    (entry) => isPlainRecord(entry) && entry.attempt_id === request.hostAttemptId,
  ) as AssignmentAttempt | undefined;
  const completedInSuccessor = successorAttempts.find(
    (entry) => isPlainRecord(entry) && entry.attempt_id === request.hostAttemptId,
  ) as AssignmentAttempt | undefined;
  const priorAfterCompletion =
    priorWorkRecord && priorExecution
      ? {
          ...priorWorkRecord,
          execution: {
            ...priorExecution,
            assignment_attempts: priorAttempts.map((entry) =>
              isPlainRecord(entry) && entry.attempt_id === request.hostAttemptId ? record.completed_attempt : entry,
            ),
          },
        }
      : null;
  checkJournal(record.prior_journal, request.identity, request.attempt);
  checkJournal(record.successor_journal, request.identity, request.attempt);
  requireRecovery(priorAfterCompletion !== null, 'completed Source recovery preimage is missing');
  requireRecovery(
    record.schema === 'CompletedSourceReportRecoveryRecord/v1' &&
      validIdentity(record.identity) &&
      same(record.identity, request.identity) &&
      record.attempt === request.attempt &&
      hash(record.request_digest) &&
      record.request_digest === canonicalJsonDigest(request) &&
      stateVersion(record.prior_work_version) &&
      same(record.prior_work_version, request.expectedWork) &&
      stateVersion(record.prior_ledger_version) &&
      same(record.prior_ledger_version, request.expectedLedger) &&
      stateVersion(record.prior_journal_version) &&
      same(record.prior_journal_version, request.expectedJournal) &&
      stateVersion(record.work_version) &&
      stateVersion(record.successor_ledger_version) &&
      stateVersion(record.journal_version) &&
      record.prior_work?.schema === 'WorkState/v1' &&
      record.successor_work?.schema === 'WorkState/v1' &&
      equalsWorkIdentity(record.prior_work, request.identity) &&
      equalsWorkIdentity(record.successor_work, request.identity) &&
      record.prior_work.revision === request.expectedWork.revision &&
      record.successor_work.revision === record.prior_work.revision + 2 &&
      record.successor_work.lifecycle.revision === record.prior_work.lifecycle.revision + 2 &&
      record.work_version.revision === record.successor_work.revision &&
      record.successor_work.binding.runtime_code_digest === request.currentRuntimeCodeDigest &&
      record.successor_work.binding.runtime_source_revision === request.currentRuntimeCodeDigest &&
      record.successor_work.lifecycle.config_binding.runtime_code_digest === request.currentRuntimeCodeDigest &&
      record.prior_work.binding.runtime_code_digest === request.oldRuntimeCodeDigest &&
      record.prior_work.binding.work_source_revision === request.originalSourceScopeDigest &&
      record.successor_work.binding.work_source_revision === record.prior_work.binding.work_source_revision &&
      record.successor_work.lifecycle.source_revision === record.prior_work.lifecycle.source_revision &&
      record.prior_journal?.schema === 'MastraSessionLedger/v1' &&
      record.prior_journal.work_id === request.identity.work_id &&
      record.prior_journal.attempt === request.attempt &&
      record.successor_journal?.schema === 'MastraSessionLedger/v1' &&
      record.successor_journal.work_id === request.identity.work_id &&
      record.successor_journal.attempt === request.attempt &&
      same(record.successor_journal, request.nextJournal) &&
      record.successor_journal.source_scope?.digest === request.evolvedJournalSourceScopeDigest &&
      record.original_reservation?.schema === 'WorkflowSessionReservation/v1' &&
      record.original_reservation.receipt.attempt.attempt_id === request.hostAttemptId &&
      priorAttempt?.status === 'started' &&
      priorAttempt.result === null &&
      priorAttempt.result_digest === null &&
      priorAttempt.request_digest === record.original_reservation?.receipt.attempt.request_digest &&
      same(priorAttempt.lease, record.original_reservation?.receipt.attempt.lease) &&
      record.prior_work.execution.assignment_attempts.filter((entry) => ['started', 'uncertain'].includes(entry.status))
        .length === 1 &&
      record.original_reservation?.receipt.attempt.status === 'started' &&
      record.original_reservation.receipt.attempt.result === null &&
      record.original_reservation.receipt.attempt.result_digest === null &&
      record.completed_attempt?.attempt_id === request.hostAttemptId &&
      record.completed_attempt.status === 'completed' &&
      record.completed_attempt.result_digest === canonicalJsonDigest(record.completed_attempt.result) &&
      same(completedInSuccessor, record.completed_attempt) &&
      record.completed_attempt.result_digest === request.reportDigest &&
      same(workIdentityCore(priorAfterCompletion), workIdentityCore(record.successor_work)) &&
      record.original_source_ticket?.schema === 'CoordinationTicket/v1' &&
      record.original_source_ticket.ticket_id === record.original_reservation.receipt.attempt.lease.ticket_id &&
      record.original_source_ticket.thread_id === request.nativeSessionHandle &&
      record.original_source_ticket.exclusive_resources.some((entry) => entry.startsWith('file:')) &&
      record.original_source_claim?.schema === 'WorkstreamClaim/v1' &&
      record.original_source_claim.ticket_id === record.original_source_ticket.ticket_id &&
      record.original_source_claim.thread_id === request.nativeSessionHandle &&
      record.execution_ticket?.schema === 'CoordinationTicket/v1' &&
      record.execution_claim?.schema === 'WorkstreamClaim/v1' &&
      record.execution_ticket.ticket_id === record.successor_work.lease?.ticket_id &&
      record.execution_ticket.thread_id === request.nativeSessionHandle &&
      record.execution_ticket.status === 'active' &&
      record.execution_claim.ticket_id === record.execution_ticket.ticket_id &&
      record.execution_claim.thread_id === request.nativeSessionHandle &&
      same(record.execution_ticket.exclusive_resources, [`execution:${request.identity.work_id}`]) &&
      same(record.execution_ticket.active_resources, [`execution:${request.identity.work_id}`]) &&
      same(record.execution_claim.resources, [`execution:${request.identity.work_id}`]) &&
      record.source_write_rights === false &&
      record.runtime_acceptance === false &&
      record.status === 'completed_report_recovered',
    'record identity, immutable ancestry, or execution-only afterimage invalid',
  );
  const items = exactCompletedItems(record.successor_journal, request.actionId, request.issueId);
  requireRecovery(
    items.length === 1 &&
      completedSourceJournalObservationMatches(record.successor_work, items[0]!) &&
      items[0]!.observation?.host_attempt_id === request.hostAttemptId &&
      items[0]!.observation?.tool_call_ref === request.reportId &&
      same(items[0]!.host_reservation, record.original_reservation) &&
      canonicalJsonDigest(items[0]!.observation) === request.reportDigest &&
      same(items[0]!.observation?.changed_paths, request.reportSourcePaths),
    'successor Journal report is not the exact completed Host result',
  );
  requireRecovery(
    record.prior_journal.completed.length <= record.successor_journal.completed.length &&
      same(
        record.prior_journal.completed,
        record.successor_journal.completed.slice(0, record.prior_journal.completed.length),
      ),
    'successor Journal does not preserve its completed prefix',
  );
  const oldAuth = record.prior_work.lifecycle.references.filter(
    (ref) =>
      ref.kind === 'execution_approval' &&
      ref.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      ref.decision === 'approved' &&
      ref.disposition === 'current',
  );
  requireRecovery(
    oldAuth.length === 1 && oldAuth[0]!.sha256 === request.originalSourceAuthorizationDigest,
    'original Source authorization digest differs',
  );
  const changes =
    record.prior_journal.source_scope && record.successor_journal.source_scope
      ? compareScopedSourceSnapshots(record.prior_journal.source_scope, record.successor_journal.source_scope)
      : null;
  requireRecovery(
    changes !== null &&
      record.prior_journal.source_scope!.digest === request.originalSourceScopeDigest &&
      canonicalJsonDigest(changes) === request.sourceDiffDigest &&
      same(
        changes.map((change) => change.path),
        request.changedPaths,
      ) &&
      same(request.changedPaths, request.reportSourcePaths) &&
      canonicalJsonDigest(items[0]!.host_reservation) === request.sourceReservationDigest,
    'retained source authorization, reservation, or exact diff digest differs',
  );
  return record;
}

export function validateCompletedSourceReportRecoveryReceipt(value: unknown): CompletedSourceReportRecoveryReceipt {
  exactEnvelope(value, receiptKeys, 'receipt');
  const receipt = value as unknown as CompletedSourceReportRecoveryReceipt;
  const record = validateCompletedSourceReportRecoveryRecord(receipt.record);
  requireRecovery(
    receipt.schema === 'CompletedSourceReportRecoveryReceipt/v1' &&
      same(receipt.identity, record.identity) &&
      receipt.attempt === record.attempt &&
      receipt.action_id === record.request.actionId &&
      receipt.issue_id === record.request.issueId &&
      receipt.report_id === record.request.reportId &&
      receipt.request_digest === record.request_digest &&
      hash(receipt.record_digest) &&
      receipt.record_digest === canonicalJsonDigest(record) &&
      stateVersion(receipt.work_version) &&
      same(receipt.work_version, record.work_version) &&
      stateVersion(receipt.ledger_version) &&
      same(receipt.ledger_version, record.successor_ledger_version) &&
      stateVersion(receipt.journal_version) &&
      same(receipt.journal_version, record.journal_version) &&
      Number.isSafeInteger(receipt.maintenance_generation) &&
      receipt.maintenance_generation === record.request.expectedMaintenanceGeneration &&
      receipt.status === 'completed_report_recovered' &&
      receipt.source_write_rights === false &&
      receipt.runtime_acceptance === false,
    'outer receipt differs from its immutable record',
  );
  return receipt;
}
export function snapshotCompletedSourceReportRecoveryReceipt(value: unknown): CompletedSourceReportRecoveryReceipt {
  return freezeJsonValue(validateCompletedSourceReportRecoveryReceipt(value));
}
export function readCompletedSourceReportRecoveryReceiptRecord(
  payload: string,
  expectedDigest: string,
): CompletedSourceReportRecoveryReceipt {
  requireRecovery(
    typeof payload === 'string' && payload.length <= 64 * 1024 * 1024 && hash(expectedDigest),
    'stored recovery receipt envelope is invalid',
  );
  const value: unknown = JSON.parse(payload);
  requireRecovery(canonicalJsonDigest(value) === expectedDigest, 'stored recovery receipt integrity differs');
  return validateCompletedSourceReportRecoveryReceipt(value);
}

export function validateCompletedSourceReportRecoveryLineage(
  state: CompletedSourceReportRecoveryState,
): CompletedSourceReportRecoveryReceipt {
  if (state.host.work && state.host.runtimeCodeContinuations?.length)
    state = {
      ...state,
      host: {
        ...state.host,
        work: projectQualifiedRuntimeCodeAncestor(state.host.work, state.host.runtimeCodeContinuations),
      },
    };
  const receipt = validateCompletedSourceReportRecoveryReceipt(state.recoveryReceipt);
  const record = receipt.record,
    request = record.request;
  requireRecovery(
    state.host.work &&
      state.host.ledger &&
      state.host.workVersion &&
      state.host.ledgerVersion &&
      state.initialReceipt &&
      state.journal &&
      stateVersion(state.journal.version),
    'current Host, Journal, or initial lineage unavailable',
  );
  const initial = validateInitialSourceContinuationReceipt(state.initialReceipt);
  requireRecovery(
    initial.continuation_id === request.initialContinuationId &&
      initial.request_digest === request.initialContinuationRequestDigest &&
      initial.request.currentSourceScope.digest === request.originalSourceScopeDigest &&
      initial.request.sourceAuthorizationSha256 === request.originalSourceAuthorizationDigest &&
      record.prior_work.binding.runtime_code_digest === request.oldRuntimeCodeDigest &&
      record.prior_work.binding.work_source_revision === request.originalSourceScopeDigest &&
      state.host.work.binding.runtime_code_digest === request.currentRuntimeCodeDigest &&
      state.host.work.binding.runtime_source_revision === request.currentRuntimeCodeDigest &&
      state.host.work.lifecycle.config_binding.runtime_code_digest === request.currentRuntimeCodeDigest &&
      state.host.work.binding.work_source_revision === request.originalSourceScopeDigest &&
      state.host.work.lifecycle.source_revision === request.originalSourceScopeDigest &&
      state.journal.state.source_scope?.digest === request.evolvedJournalSourceScopeDigest &&
      state.host.work.revision >= record.work_version.revision &&
      state.host.ledgerVersion.revision >= record.successor_ledger_version.revision &&
      state.journal.version.revision >= record.journal_version.revision &&
      equalsWorkIdentity(state.host.work, request.identity) &&
      state.journal.state.work_id === request.identity.work_id &&
      state.journal.state.attempt === request.attempt &&
      state.journal.state.run_id === state.host.work.execution.run_id &&
      same(recoveryWorkDescendantCore(record.successor_work), recoveryWorkDescendantCore(state.host.work)) &&
      preservesAttemptPrefix(record.successor_work, state.host.work) &&
      state.host.work.revision >= record.successor_work.revision &&
      state.journal.state.completed.length >= record.successor_journal.completed.length &&
      same(
        record.successor_journal.completed,
        state.journal.state.completed.slice(0, record.successor_journal.completed.length),
      ),
    'current Work/Journal is not a descendant of the recovery afterimage',
  );
  const frontier = state.frontierReceipt;
  if (request.frontierReceiptId === null) {
    requireRecovery(
      frontier === null &&
        request.frontierRequestDigest === null &&
        request.oldRuntimeCodeDigest === initial.request.currentRuntimeCodeDigest,
      'unexpected frontier lineage',
    );
  } else {
    requireRecovery(frontier !== null, 'frontier receipt missing');
    const validated = validateInitialSourceFrontierCodeRebindReceipt(frontier);
    requireRecovery(
      validated.original_receipt_id === request.frontierReceiptId &&
        validated.record.request_digest === request.frontierRequestDigest &&
        validated.original_receipt_id === initial.continuation_id &&
        validated.record.request.initialContinuationRequestDigest === initial.request_digest &&
        validated.record.prior_work.binding.runtime_code_digest === initial.request.currentRuntimeCodeDigest &&
        validated.current_runtime_code_digest === request.oldRuntimeCodeDigest,
      'frontier receipt does not precede the completed report recovery',
    );
  }
  const items = exactCompletedItems(state.journal.state, request.actionId, request.issueId);
  requireRecovery(
    items.length === 1 &&
      completedSourceJournalObservationMatches(record.successor_work, items[0]!) &&
      items[0]!.observation?.host_attempt_id === request.hostAttemptId &&
      items[0]!.observation?.tool_call_ref === request.reportId &&
      same(items[0]!.host_reservation, record.original_reservation) &&
      canonicalJsonDigest(items[0]!.observation) === request.reportDigest &&
      same(items[0]!.observation?.changed_paths, request.reportSourcePaths) &&
      canonicalJsonDigest(items[0]!.host_reservation) === request.sourceReservationDigest,
    'current Journal does not retain the exact completed report',
  );
  requireRecovery(
    validExpiredExecutionRebindChain(state.host.ledger, state.host.work, record),
    'current Work does not hold the retained execution-only claim',
  );
  return receipt;
}

/** Validate that the receipt is the current Work/Journal descendant before admitting later actions. */
export function validateCompletedSourceReportRecoveryCurrentWorkJoin(
  host: HostStateSnapshot,
  journal: { readonly version: StateVersion; readonly state: MastraSessionLedgerState },
  initialReceipt: InitialSourceContinuationReceipt | null,
  frontierReceipt: InitialSourceFrontierCodeRebindReceipt | null,
  recoveryReceipt: CompletedSourceReportRecoveryReceipt | null,
): CompletedSourceReportRecoveryReceipt {
  return validateCompletedSourceReportRecoveryLineage({
    host,
    journal,
    initialReceipt,
    frontierReceipt,
    recoveryReceipt,
  });
}
