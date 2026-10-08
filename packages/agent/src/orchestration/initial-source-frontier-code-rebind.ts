import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import {
  canonicalJsonAtDepth,
  canonicalJsonDigest,
  freezeJsonValue,
  isPlainRecord,
} from '../contracts/public-ingress.js';
import { validateCoordinationLedgerV1, type CoordinationLedger } from '../contracts/envelopes.js';
import type { HostStateSnapshot, StateVersion, WorkIdentity, WorkState } from '../host-state.js';
import type { InitialSourceContinuationReceipt } from './initial-source-continuation.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';

const hashPattern = /^[a-f0-9]{64}$/;
const byteLimit = 64 * 1024 * 1024;
const requestKeys = [
  'schema',
  'identity',
  'attempt',
  'actionId',
  'nativeSessionHandle',
  'leaseGeneration',
  'expectedWork',
  'expectedLedger',
  'expectedJournal',
  'expectedMaintenanceGeneration',
  'initialContinuationId',
  'initialContinuationRequestDigest',
  'configDigest',
  'sourceScopeDigest',
  'oldRuntimeCodeDigest',
  'newRuntimeCodeDigest',
  'runtimeCodePaths',
  'parentManifestRef',
  'parentManifestDigest',
  'successorManifestRef',
  'successorManifestDigest',
  'systemUpdateRef',
  'systemUpdateOperationId',
  'nativeSelfAttestationDigest',
] as const;
const proofKeys = [
  'runtimeCodePaths',
  'oldRuntimeCodeDigest',
  'newRuntimeCodeDigest',
  'parentManifestRef',
  'parentManifestDigest',
  'successorManifestRef',
  'successorManifestDigest',
  'systemUpdateRef',
  'systemUpdateOperationId',
  'nativeSelfAttestationDigest',
] as const;
const recordKeys = [
  'schema',
  'identity',
  'attempt',
  'original_receipt_id',
  'request',
  'request_digest',
  'prior_work',
  'prior_work_version',
  'prior_ledger',
  'prior_ledger_version',
  'prior_journal',
  'prior_journal_version',
  'successor_work',
  'work_version',
  'endpoint_proof',
  'rights_granted',
  'accepted_result',
  'runtime_acceptance',
  'status',
] as const;
const receiptKeys = [
  'schema',
  'record',
  'record_digest',
  'original_receipt_id',
  'current_runtime_code_digest',
  'rights_granted',
  'accepted_result',
  'runtime_acceptance',
  'status',
] as const;

function requireFrontier(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('initial-source frontier code rebind: ' + message);
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
  requireFrontier(exactKeys(value, keys), label + ' fields differ');
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireFrontier(
      descriptor?.enumerable &&
        Object.hasOwn(descriptor, 'value') &&
        descriptor.get === undefined &&
        descriptor.set === undefined,
      label + ' fields must be data properties',
    );
  }
}
function encodeEnvelope(value: Record<string, unknown>, keys: readonly string[], depth: number): string {
  canonicalJsonAtDepth(null, depth);
  return (
    '{' +
    [...keys]
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonicalJsonAtDepth(value[key], depth + 1))
      .join(',') +
    '}'
  );
}
function digest(value: unknown): value is string {
  return typeof value === 'string' && hashPattern.test(value);
}
function text(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 4096 &&
    value.trim() === value &&
    !/\p{Cc}/u.test(value)
  );
}
function version(value: unknown): value is StateVersion {
  return (
    exactKeys(value, ['revision', 'digest']) &&
    Number.isSafeInteger((value as StateVersion).revision) &&
    (value as StateVersion).revision > 0 &&
    digest((value as StateVersion).digest)
  );
}
function same(left: unknown, right: unknown): boolean {
  return canonicalJsonDigest(left) === canonicalJsonDigest(right);
}

export interface InitialSourceFrontierCodeRebindRequest {
  readonly schema: 'InitialSourceFrontierCodeRebindRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly actionId: string;
  readonly nativeSessionHandle: string;
  readonly leaseGeneration: number;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly initialContinuationId: string;
  readonly initialContinuationRequestDigest: string;
  readonly configDigest: string;
  readonly sourceScopeDigest: string;
  readonly oldRuntimeCodeDigest: string;
  readonly newRuntimeCodeDigest: string;
  readonly runtimeCodePaths: readonly string[];
  readonly parentManifestRef: string;
  readonly parentManifestDigest: string;
  readonly successorManifestRef: string;
  readonly successorManifestDigest: string;
  readonly systemUpdateRef: string;
  readonly systemUpdateOperationId: string;
  readonly nativeSelfAttestationDigest: string;
}
export interface InitialSourceFrontierCodeRebindVerifiedCurrent {
  readonly runtimeCodePaths: readonly string[];
  readonly oldRuntimeCodeDigest: string;
  readonly newRuntimeCodeDigest: string;
  readonly parentManifestRef: string;
  readonly parentManifestDigest: string;
  readonly successorManifestRef: string;
  readonly successorManifestDigest: string;
  readonly systemUpdateRef: string;
  readonly systemUpdateOperationId: string;
  readonly nativeSelfAttestationDigest: string;
}
export interface InitialSourceFrontierCodeRebindState {
  readonly host: HostStateSnapshot;
  readonly journal: { readonly version: StateVersion; readonly state: MastraSessionLedgerState };
  readonly initialReceipt: InitialSourceContinuationReceipt;
}
export type InitialSourceFrontierCodeRebindVerifyCurrent = (
  request: InitialSourceFrontierCodeRebindRequest,
  state: InitialSourceFrontierCodeRebindState,
) => InitialSourceFrontierCodeRebindVerifiedCurrent;
export interface InitialSourceFrontierCodeRebindRecord {
  readonly schema: 'InitialSourceFrontierCodeRebindRecord/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly original_receipt_id: string;
  readonly request: InitialSourceFrontierCodeRebindRequest;
  readonly request_digest: string;
  readonly prior_work: WorkState;
  readonly prior_work_version: StateVersion;
  readonly prior_ledger: CoordinationLedger;
  readonly prior_ledger_version: StateVersion;
  readonly prior_journal: MastraSessionLedgerState;
  readonly prior_journal_version: StateVersion;
  readonly successor_work: WorkState;
  readonly work_version: StateVersion;
  readonly endpoint_proof: InitialSourceFrontierCodeRebindVerifiedCurrent;
  readonly rights_granted: false;
  readonly accepted_result: false;
  readonly runtime_acceptance: false;
  readonly status: 'rebound';
}
export interface InitialSourceFrontierCodeRebindReceipt {
  readonly schema: 'InitialSourceFrontierCodeRebindReceipt/v1';
  readonly record: InitialSourceFrontierCodeRebindRecord;
  readonly record_digest: string;
  readonly original_receipt_id: string;
  readonly current_runtime_code_digest: string;
  readonly rights_granted: false;
  readonly accepted_result: false;
  readonly runtime_acceptance: false;
  readonly status: 'rebound';
}
export interface InitialSourceFrontierCodeRebindHostApi {
  commitReadOnlyFrontierRuntimeCode(
    request: InitialSourceFrontierCodeRebindRequest,
    verifyCurrent: InitialSourceFrontierCodeRebindVerifyCurrent,
  ): InitialSourceFrontierCodeRebindReceipt;
  readInitialSourceFrontierCodeRebindReceipt(
    identity: WorkIdentity,
    attempt: number,
    originalReceiptId: string,
  ): InitialSourceFrontierCodeRebindReceipt | null;
}

export function validateInitialSourceFrontierCodeRebindRequest(value: unknown): InitialSourceFrontierCodeRebindRequest {
  exactEnvelope(value, requestKeys, 'request');
  const request = value as unknown as InitialSourceFrontierCodeRebindRequest;
  requireFrontier(
    request.schema === 'InitialSourceFrontierCodeRebindRequest/v1' &&
      isPlainRecord(request.identity) &&
      text(request.identity.repository_id) &&
      Array.isArray(request.identity.project_ids) &&
      request.identity.project_ids.length > 0 &&
      request.identity.project_ids.every(text) &&
      new Set(request.identity.project_ids).size === request.identity.project_ids.length &&
      digest(request.identity.integrations_digest) &&
      text(request.identity.work_id) &&
      Number.isSafeInteger(request.attempt) &&
      request.attempt > 0 &&
      text(request.actionId) &&
      text(request.nativeSessionHandle) &&
      Number.isSafeInteger(request.leaseGeneration) &&
      request.leaseGeneration > 0 &&
      version(request.expectedWork) &&
      version(request.expectedLedger) &&
      version(request.expectedJournal) &&
      Number.isSafeInteger(request.expectedMaintenanceGeneration) &&
      request.expectedMaintenanceGeneration >= 0 &&
      digest(request.initialContinuationId) &&
      digest(request.initialContinuationRequestDigest) &&
      digest(request.configDigest) &&
      digest(request.sourceScopeDigest) &&
      digest(request.oldRuntimeCodeDigest) &&
      digest(request.newRuntimeCodeDigest) &&
      request.newRuntimeCodeDigest !== request.oldRuntimeCodeDigest &&
      Array.isArray(request.runtimeCodePaths) &&
      request.runtimeCodePaths.length > 0 &&
      request.runtimeCodePaths.every(text) &&
      same(request.runtimeCodePaths, [...request.runtimeCodePaths].sort()) &&
      new Set(request.runtimeCodePaths).size === request.runtimeCodePaths.length &&
      text(request.parentManifestRef) &&
      digest(request.parentManifestDigest) &&
      text(request.successorManifestRef) &&
      digest(request.successorManifestDigest) &&
      text(request.systemUpdateRef) &&
      text(request.systemUpdateOperationId) &&
      digest(request.nativeSelfAttestationDigest),
    'request values invalid',
  );
  return request;
}
export function validateInitialSourceFrontierCodeRebindVerifiedCurrent(
  value: unknown,
  request: InitialSourceFrontierCodeRebindRequest,
): InitialSourceFrontierCodeRebindVerifiedCurrent {
  exactEnvelope(value, proofKeys, 'endpoint proof');
  const proof = value as unknown as InitialSourceFrontierCodeRebindVerifiedCurrent;
  requireFrontier(
    Array.isArray(proof.runtimeCodePaths) &&
      same(proof.runtimeCodePaths, request.runtimeCodePaths) &&
      proof.oldRuntimeCodeDigest === request.oldRuntimeCodeDigest &&
      proof.newRuntimeCodeDigest === request.newRuntimeCodeDigest &&
      proof.parentManifestRef === request.parentManifestRef &&
      proof.parentManifestDigest === request.parentManifestDigest &&
      proof.successorManifestRef === request.successorManifestRef &&
      proof.successorManifestDigest === request.successorManifestDigest &&
      proof.systemUpdateRef === request.systemUpdateRef &&
      proof.systemUpdateOperationId === request.systemUpdateOperationId &&
      proof.nativeSelfAttestationDigest === request.nativeSelfAttestationDigest,
    'endpoint proof differs from request',
  );
  return proof;
}
export function initialSourceFrontierCodeRebindWorkProjection(work: WorkState): unknown {
  const value = JSON.parse(JSON.stringify(work)) as {
    revision?: unknown;
    binding: Record<string, unknown>;
    lifecycle: { revision?: unknown; config_binding: Record<string, unknown> };
  };
  delete value.revision;
  delete value.binding.runtime_code_digest;
  delete value.binding.runtime_source_revision;
  delete value.lifecycle.revision;
  delete value.lifecycle.config_binding.runtime_code_digest;
  return value;
}
export function serializeInitialSourceFrontierCodeRebindRecord(
  record: InitialSourceFrontierCodeRebindRecord,
  depth = 0,
): string {
  exactEnvelope(record, recordKeys, 'record');
  return encodeEnvelope(record as unknown as Record<string, unknown>, recordKeys, depth);
}
export function initialSourceFrontierCodeRebindRecord(record: InitialSourceFrontierCodeRebindRecord): {
  payload: string;
  digest: string;
} {
  const payload = serializeInitialSourceFrontierCodeRebindRecord(record);
  requireFrontier(Buffer.byteLength(payload, 'utf8') <= byteLimit, 'record exceeds its 64 MiB limit');
  return { payload, digest: createHash('sha256').update(payload).digest('hex') };
}
export function validateInitialSourceFrontierCodeRebindRecord(value: unknown): InitialSourceFrontierCodeRebindRecord {
  exactEnvelope(value, recordKeys, 'record');
  const record = value as unknown as InitialSourceFrontierCodeRebindRecord;
  requireFrontier(validateCoordinationLedgerV1(record.prior_ledger).ok, 'stored prior Ledger is invalid');
  const request = validateInitialSourceFrontierCodeRebindRequest(record.request);
  validateInitialSourceFrontierCodeRebindVerifiedCurrent(record.endpoint_proof, request);
  requireFrontier(
    record.schema === 'InitialSourceFrontierCodeRebindRecord/v1' &&
      same(record.identity, request.identity) &&
      record.attempt === request.attempt &&
      record.original_receipt_id === request.initialContinuationId &&
      record.request_digest === canonicalJsonDigest(request) &&
      version(record.prior_work_version) &&
      same(record.prior_work_version, request.expectedWork) &&
      version(record.prior_ledger_version) &&
      same(record.prior_ledger_version, request.expectedLedger) &&
      version(record.prior_journal_version) &&
      same(record.prior_journal_version, request.expectedJournal) &&
      version(record.work_version) &&
      record.prior_work?.schema === 'WorkState/v1' &&
      record.prior_work.revision === record.prior_work_version.revision &&
      canonicalJsonDigest(record.prior_work) === record.prior_work_version.digest &&
      isPlainRecord(record.prior_ledger) &&
      record.prior_ledger.revision === record.prior_ledger_version.revision &&
      canonicalJsonDigest(record.prior_ledger) === record.prior_ledger_version.digest &&
      isPlainRecord(record.prior_journal) &&
      canonicalJsonDigest(record.prior_journal) === record.prior_journal_version.digest &&
      record.successor_work?.schema === 'WorkState/v1' &&
      record.work_version.revision === record.prior_work_version.revision + 1 &&
      record.successor_work.revision === record.work_version.revision &&
      record.successor_work.lifecycle.revision === record.prior_work.lifecycle.revision + 1 &&
      canonicalJsonDigest(record.successor_work) === record.work_version.digest &&
      same(
        initialSourceFrontierCodeRebindWorkProjection(record.prior_work),
        initialSourceFrontierCodeRebindWorkProjection(record.successor_work),
      ) &&
      record.prior_work.binding.runtime_code_digest === request.oldRuntimeCodeDigest &&
      record.prior_work.binding.runtime_source_revision === request.oldRuntimeCodeDigest &&
      record.successor_work.binding.runtime_code_digest === request.newRuntimeCodeDigest &&
      record.successor_work.binding.runtime_source_revision === request.newRuntimeCodeDigest &&
      record.successor_work.lifecycle.config_binding.runtime_code_digest === request.newRuntimeCodeDigest &&
      record.rights_granted === false &&
      record.accepted_result === false &&
      record.runtime_acceptance === false &&
      record.status === 'rebound',
    'record binding differs',
  );
  serializeInitialSourceFrontierCodeRebindRecord(record);
  return record;
}
export function readInitialSourceFrontierCodeRebindRecord(
  payload: string,
  recordDigest: string,
): InitialSourceFrontierCodeRebindRecord {
  requireFrontier(
    typeof payload === 'string' && Buffer.byteLength(payload, 'utf8') <= byteLimit && digest(recordDigest),
    'stored record exceeds its bound or has an invalid digest',
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('initial-source frontier code rebind: stored record JSON is invalid');
  }
  const record = validateInitialSourceFrontierCodeRebindRecord(parsed),
    encoded = initialSourceFrontierCodeRebindRecord(record);
  requireFrontier(encoded.payload === payload && encoded.digest === recordDigest, 'stored record checksum differs');
  return record;
}
export function serializeInitialSourceFrontierCodeRebindReceipt(
  receipt: InitialSourceFrontierCodeRebindReceipt,
  depth = 0,
): string {
  exactEnvelope(receipt, receiptKeys, 'receipt');
  canonicalJsonAtDepth(null, depth);
  const payload =
    '{' +
    [...receiptKeys]
      .sort()
      .map(
        (key) =>
          JSON.stringify(key) +
          ':' +
          (key === 'record'
            ? serializeInitialSourceFrontierCodeRebindRecord(receipt.record, depth + 1)
            : canonicalJsonAtDepth(receipt[key], depth + 1)),
      )
      .join(',') +
    '}';
  requireFrontier(Buffer.byteLength(payload, 'utf8') <= byteLimit, 'receipt exceeds its 64 MiB limit');
  return payload;
}
export function initialSourceFrontierCodeRebindReceiptRecord(receipt: InitialSourceFrontierCodeRebindReceipt): {
  payload: string;
  digest: string;
} {
  const payload = serializeInitialSourceFrontierCodeRebindReceipt(receipt);
  requireFrontier(Buffer.byteLength(payload, 'utf8') <= byteLimit, 'receipt exceeds its 64 MiB limit');
  return { payload, digest: createHash('sha256').update(payload).digest('hex') };
}
export function validateInitialSourceFrontierCodeRebindReceipt(value: unknown): InitialSourceFrontierCodeRebindReceipt {
  exactEnvelope(value, receiptKeys, 'receipt');
  const receipt = value as unknown as InitialSourceFrontierCodeRebindReceipt;
  const record = validateInitialSourceFrontierCodeRebindRecord(receipt.record);
  requireFrontier(
    receipt.schema === 'InitialSourceFrontierCodeRebindReceipt/v1' &&
      receipt.record_digest === initialSourceFrontierCodeRebindRecord(record).digest &&
      receipt.original_receipt_id === record.original_receipt_id &&
      receipt.current_runtime_code_digest === record.request.newRuntimeCodeDigest &&
      receipt.rights_granted === false &&
      receipt.accepted_result === false &&
      receipt.runtime_acceptance === false &&
      receipt.status === 'rebound',
    'receipt values invalid',
  );
  serializeInitialSourceFrontierCodeRebindReceipt(receipt);
  return receipt;
}
export function readInitialSourceFrontierCodeRebindReceiptRecord(
  payload: string,
  recordDigest: string,
): InitialSourceFrontierCodeRebindReceipt {
  requireFrontier(
    typeof payload === 'string' && Buffer.byteLength(payload, 'utf8') <= byteLimit && digest(recordDigest),
    'stored receipt exceeds its bound or has an invalid digest',
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('initial-source frontier code rebind: stored receipt JSON is invalid');
  }
  const receipt = validateInitialSourceFrontierCodeRebindReceipt(parsed),
    encoded = initialSourceFrontierCodeRebindReceiptRecord(receipt);
  requireFrontier(encoded.payload === payload && encoded.digest === recordDigest, 'stored receipt checksum differs');
  return receipt;
}
export function snapshotInitialSourceFrontierCodeRebindReceipt(
  receipt: InitialSourceFrontierCodeRebindReceipt,
): InitialSourceFrontierCodeRebindReceipt {
  return freezeJsonValue(
    JSON.parse(serializeInitialSourceFrontierCodeRebindReceipt(receipt)) as InitialSourceFrontierCodeRebindReceipt,
  );
}
