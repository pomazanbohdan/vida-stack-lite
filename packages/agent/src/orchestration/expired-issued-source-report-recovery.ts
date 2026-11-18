import { assertCanonicalJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import type { HostStateSnapshot, StateVersion, WorkIdentity } from '../host-state.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';

/** The only recovery marker a Host-issued expired-lease Source report may carry. */
export const expiredLeaseCompletedReportReason = 'expired_lease_completed_report' as const;

export interface ExpiredIssuedSourceReportRecoveryRequest {
  readonly schema: 'ExpiredIssuedSourceReportRecoveryRequest/v1';
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
  /** The retained caller report body; the Host adds the recovery marker itself. */
  readonly observation: unknown;
  /** The evolved scoped Source snapshot covering the exact declared entries. */
  readonly sourceScope: unknown;
  readonly decisionPointer: string;
}

export type ExpiredIssuedSourceReportRecoveryInspectionRequest = Omit<
  ExpiredIssuedSourceReportRecoveryRequest,
  'expectedWork' | 'expectedLedger' | 'expectedJournal' | 'expectedMaintenanceGeneration'
>;

export interface ExpiredIssuedSourceReportRecoveryState {
  readonly host: HostStateSnapshot;
  readonly journal: { readonly version: StateVersion; readonly state: MastraSessionLedgerState };
}

export type ExpiredIssuedSourceReportRecoveryVerifyCurrent = (
  request: ExpiredIssuedSourceReportRecoveryRequest,
  state: ExpiredIssuedSourceReportRecoveryState,
) => unknown;

export interface ExpiredIssuedSourceReportRecoveryInspection {
  readonly schema: 'ExpiredIssuedSourceReportRecoveryInspection/v1';
  readonly action_id: string;
  readonly issue_id: string;
  readonly host_attempt_id: string;
  readonly lease_generation: number;
  readonly lease_expires_at: string;
  readonly changed_paths: readonly string[];
  readonly marked_observation_digest: string;
  readonly expected_work: StateVersion;
  readonly expected_ledger: StateVersion;
  readonly expected_journal: StateVersion;
  readonly expected_maintenance_generation: number;
  readonly journal_resume_status: 'ready' | 'ready_to_resume';
  readonly source_write_rights: false;
  readonly runtime_acceptance: false;
}

const hashPattern = /^[a-f0-9]{64}$/;
const baseKeys = [
  'schema',
  'identity',
  'attempt',
  'actionId',
  'issueId',
  'hostAttemptId',
  'nativeSessionHandle',
  'leaseGeneration',
  'observation',
  'sourceScope',
  'decisionPointer',
] as const;
const requestKeys = [
  ...baseKeys.slice(0, 8),
  'expectedWork',
  'expectedLedger',
  'expectedJournal',
  'expectedMaintenanceGeneration',
  ...baseKeys.slice(8),
] as const;
const inspectionKeys = [
  'schema',
  'action_id',
  'issue_id',
  'host_attempt_id',
  'lease_generation',
  'lease_expires_at',
  'changed_paths',
  'marked_observation_digest',
  'expected_work',
  'expected_ledger',
  'expected_journal',
  'expected_maintenance_generation',
  'journal_resume_status',
  'source_write_rights',
  'runtime_acceptance',
] as const;

function requireRecovery(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('expired issued Source report recovery: ' + message);
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
function validIdentity(value: unknown): value is WorkIdentity {
  return (
    exactKeys(value, ['repository_id', 'project_ids', 'integrations_digest', 'work_id']) &&
    text((value as WorkIdentity).repository_id, 256) &&
    Array.isArray((value as WorkIdentity).project_ids) &&
    (value as WorkIdentity).project_ids.every((entry) => text(entry, 256)) &&
    hash((value as WorkIdentity).integrations_digest) &&
    text((value as WorkIdentity).work_id, 256)
  );
}
function sourcePaths(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 512 &&
    value.every(
      (entry) =>
        typeof entry === 'string' &&
        entry.length > 0 &&
        entry.length <= 512 &&
        !entry.includes('\\') &&
        !entry.startsWith('/') &&
        !/^[A-Za-z]:/.test(entry) &&
        entry.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..'),
    ) &&
    new Set(value).size === value.length
  );
}
function canonicalPayload(value: unknown): void {
  try {
    assertCanonicalJsonValue(value);
  } catch {
    requireRecovery(false, 'payload is not canonical JSON data');
  }
}

function validateBasisFields(value: Record<string, unknown>): void {
  requireRecovery(
    value.schema === 'ExpiredIssuedSourceReportRecoveryRequest/v1' &&
      validIdentity(value.identity) &&
      Number.isSafeInteger(value.attempt) &&
      (value.attempt as number) > 0 &&
      text(value.actionId, 256) &&
      text(value.issueId, 256) &&
      text(value.hostAttemptId, 256) &&
      text(value.nativeSessionHandle, 256) &&
      Number.isSafeInteger(value.leaseGeneration) &&
      (value.leaseGeneration as number) >= 0 &&
      isPlainRecord(value.observation) &&
      isPlainRecord(value.sourceScope) &&
      text(value.decisionPointer, 2048),
    'request fields or bounds invalid',
  );
  canonicalPayload(value.observation);
  canonicalPayload(value.sourceScope);
}

export function validateExpiredIssuedSourceReportRecoveryRequest(
  value: unknown,
): ExpiredIssuedSourceReportRecoveryRequest {
  exactEnvelope(value, requestKeys, 'request');
  validateBasisFields(value);
  requireRecovery(
    stateVersion(value.expectedWork) &&
      stateVersion(value.expectedLedger) &&
      stateVersion(value.expectedJournal) &&
      Number.isSafeInteger(value.expectedMaintenanceGeneration) &&
      (value.expectedMaintenanceGeneration as number) >= 0,
    'expected Host and Journal versions invalid',
  );
  return value as unknown as ExpiredIssuedSourceReportRecoveryRequest;
}

export function validateExpiredIssuedSourceReportRecoveryInspectionRequest(
  value: unknown,
): ExpiredIssuedSourceReportRecoveryInspectionRequest {
  exactEnvelope(value, baseKeys, 'inspection request');
  validateBasisFields(value);
  return value as unknown as ExpiredIssuedSourceReportRecoveryInspectionRequest;
}

export function validateExpiredIssuedSourceReportRecoveryInspection(
  value: unknown,
): ExpiredIssuedSourceReportRecoveryInspection {
  exactEnvelope(value, inspectionKeys, 'inspection');
  const inspection = value as unknown as ExpiredIssuedSourceReportRecoveryInspection;
  requireRecovery(
    inspection.schema === 'ExpiredIssuedSourceReportRecoveryInspection/v1' &&
      text(inspection.action_id, 256) &&
      text(inspection.issue_id, 256) &&
      text(inspection.host_attempt_id, 256) &&
      Number.isSafeInteger(inspection.lease_generation) &&
      inspection.lease_generation >= 0 &&
      text(inspection.lease_expires_at, 64) &&
      sourcePaths(inspection.changed_paths) &&
      hash(inspection.marked_observation_digest) &&
      stateVersion(inspection.expected_work) &&
      stateVersion(inspection.expected_ledger) &&
      stateVersion(inspection.expected_journal) &&
      Number.isSafeInteger(inspection.expected_maintenance_generation) &&
      inspection.expected_maintenance_generation >= 0 &&
      (inspection.journal_resume_status === 'ready' || inspection.journal_resume_status === 'ready_to_resume') &&
      inspection.source_write_rights === false &&
      inspection.runtime_acceptance === false,
    'inspection fields invalid',
  );
  return inspection;
}
