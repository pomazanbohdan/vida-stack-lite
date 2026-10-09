import { canonicalJsonDigest, freezeJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import type { HostStateSnapshot, StateVersion, WorkIdentity, WorkState } from '../host-state.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';

export interface QualifiedRuntimeCodeContinuationRequest {
  readonly schema: 'QualifiedRuntimeCodeContinuationRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly nativeSessionHandle: string;
  readonly leaseGeneration: number;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly originalSourceScopeDigest: string;
  readonly journalSourceScopeDigest: string;
  readonly oldRuntimeCodeDigest: string;
  readonly currentRuntimeCodeDigest: string;
  readonly oldRuntimeCodePaths: readonly string[];
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
}

export interface QualifiedRuntimeCodeEndpoints {
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

export interface QualifiedRuntimeCodeContinuationReceipt {
  readonly schema: 'QualifiedRuntimeCodeContinuationReceipt/v1';
  readonly request: QualifiedRuntimeCodeContinuationRequest;
  readonly request_digest: string;
  readonly endpoint_proof: QualifiedRuntimeCodeEndpoints;
  readonly protected_work_digest: string;
  readonly work_version: StateVersion;
  readonly status: 'adopted';
  readonly rights_granted: false;
  readonly accepted_result: false;
  readonly runtime_acceptance: false;
}

const requestKeys = [
  'schema',
  'identity',
  'attempt',
  'nativeSessionHandle',
  'leaseGeneration',
  'expectedWork',
  'expectedLedger',
  'expectedJournal',
  'expectedMaintenanceGeneration',
  'originalSourceScopeDigest',
  'journalSourceScopeDigest',
  'oldRuntimeCodeDigest',
  'currentRuntimeCodeDigest',
  'oldRuntimeCodePaths',
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
];
const receiptKeys = [
  'schema',
  'request',
  'request_digest',
  'endpoint_proof',
  'protected_work_digest',
  'work_version',
  'status',
  'rights_granted',
  'accepted_result',
  'runtime_acceptance',
];
const hash = /^[a-f0-9]{64}$/;
const compareIdentifiers = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);
const same = (a: unknown, b: unknown) => canonicalJsonDigest(a) === canonicalJsonDigest(b);
function requireContinuation(value: unknown, message: string): asserts value {
  if (!value) throw new Error('qualified runtime code continuation: ' + message);
}
function exact(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  requireContinuation(
    isPlainRecord(value) &&
      Reflect.ownKeys(value).length === keys.length &&
      Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key)),
    'strict envelope differs',
  );
}
function version(value: unknown): value is StateVersion {
  return (
    isPlainRecord(value) &&
    Object.keys(value).length === 2 &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) > 0 &&
    typeof value.digest === 'string' &&
    hash.test(value.digest)
  );
}
function paths(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 4096 &&
    value.every(
      (item) =>
        typeof item === 'string' &&
        item.length > 0 &&
        item.length <= 2048 &&
        !item.startsWith('/') &&
        !/[\\:\p{Cc}]/u.test(item) &&
        !item.split('/').some((part) => part === '' || part === '.' || part === '..'),
    ) &&
    same(value, [...new Set(value)].sort(compareIdentifiers))
  );
}
export function validateQualifiedRuntimeCodeContinuationRequest(
  value: unknown,
): QualifiedRuntimeCodeContinuationRequest {
  exact(value, requestKeys);
  const request = value as unknown as QualifiedRuntimeCodeContinuationRequest;
  exact(request.identity, ['repository_id', 'project_ids', 'integrations_digest', 'work_id']);
  requireContinuation(
    request.schema === 'QualifiedRuntimeCodeContinuationRequest/v1' &&
      Number.isSafeInteger(request.attempt) &&
      request.attempt > 0 &&
      Number.isSafeInteger(request.leaseGeneration) &&
      request.leaseGeneration > 0 &&
      Number.isSafeInteger(request.expectedMaintenanceGeneration) &&
      request.expectedMaintenanceGeneration >= 0 &&
      version(request.expectedWork) &&
      version(request.expectedLedger) &&
      version(request.expectedJournal),
    'identity, schema or CAS invalid',
  );
  requireContinuation(
    [
      request.identity.repository_id,
      request.identity.work_id,
      request.nativeSessionHandle,
      request.systemUpdateOperationId,
    ].every(
      (item) =>
        typeof item === 'string' &&
        item.length > 0 &&
        item.length <= 256 &&
        item.trim() === item &&
        !/\p{Cc}/u.test(item),
    ) &&
      Array.isArray(request.identity.project_ids) &&
      request.identity.project_ids.length > 0 &&
      request.identity.project_ids.every(
        (item) =>
          typeof item === 'string' &&
          item.length > 0 &&
          item.length <= 256 &&
          item.trim() === item &&
          !/\p{Cc}/u.test(item),
      ) &&
      same(request.identity.project_ids, [...new Set(request.identity.project_ids)].sort(compareIdentifiers)),
    'owner or identity invalid',
  );
  requireContinuation(
    [
      request.identity.integrations_digest,
      request.originalSourceScopeDigest,
      request.journalSourceScopeDigest,
      request.oldRuntimeCodeDigest,
      request.currentRuntimeCodeDigest,
      request.oldManifestDigest,
      request.currentManifestDigest,
      request.nativeSelfAttestationDigest,
    ].every((item) => typeof item === 'string' && hash.test(item)) &&
      request.oldRuntimeCodeDigest !== request.currentRuntimeCodeDigest &&
      paths(request.oldRuntimeCodePaths) &&
      paths(request.currentRuntimeCodePaths),
    'code, Source or native integrity invalid',
  );
  requireContinuation(
    [
      request.oldManifestRef,
      request.currentManifestRef,
      request.oldInstallRef,
      request.currentInstallRef,
      request.systemUpdateRef,
    ].every(
      (item) =>
        typeof item === 'string' &&
        item.length > 0 &&
        item.length <= 2048 &&
        !/[\\:\p{Cc}]/u.test(item) &&
        !item.startsWith('/') &&
        !item.split('/').some((part) => part === '' || part === '.' || part === '..'),
    ),
    'native reference invalid',
  );
  return freezeJsonValue(request);
}
export function validateQualifiedRuntimeCodeEndpoints(
  value: unknown,
  request: QualifiedRuntimeCodeContinuationRequest,
): QualifiedRuntimeCodeEndpoints {
  exact(value, ['oldRuntime', 'currentRuntime', 'systemUpdate', 'nativeSelfAttestationDigest']);
  exact(value.oldRuntime, ['codeDigest', 'codePaths', 'manifestRef', 'manifestDigest', 'installRef']);
  exact(value.currentRuntime, ['codeDigest', 'codePaths', 'manifestRef', 'manifestDigest', 'installRef']);
  exact(value.systemUpdate, ['ref', 'operationId']);
  const proof = value as unknown as QualifiedRuntimeCodeEndpoints;
  requireContinuation(
    same(proof.oldRuntime, {
      codeDigest: request.oldRuntimeCodeDigest,
      codePaths: request.oldRuntimeCodePaths,
      manifestRef: request.oldManifestRef,
      manifestDigest: request.oldManifestDigest,
      installRef: request.oldInstallRef,
    }) &&
      same(proof.currentRuntime, {
        codeDigest: request.currentRuntimeCodeDigest,
        codePaths: request.currentRuntimeCodePaths,
        manifestRef: request.currentManifestRef,
        manifestDigest: request.currentManifestDigest,
        installRef: request.currentInstallRef,
      }) &&
      same(proof.systemUpdate, { ref: request.systemUpdateRef, operationId: request.systemUpdateOperationId }) &&
      proof.nativeSelfAttestationDigest === request.nativeSelfAttestationDigest,
    'native endpoint proof differs',
  );
  return freezeJsonValue(proof);
}
export function runtimeCodeContinuationProtectedWorkDigest(work: WorkState): string {
  const { runtime_code_digest: _code, runtime_source_revision: _source, ...binding } = work.binding;
  return canonicalJsonDigest({
    binding,
    contracts: work.contracts,
    scope: work.lifecycle.scope,
    intake: work.artifacts.filter((ref) => ref.artifact_id === 'local-session-intake'),
    authority: work.lifecycle.references.filter((ref) => ref.artifact_schema === 'LocalSourceWriteAuthorization/v1'),
  });
}
export function validateQualifiedRuntimeCodeContinuationReceipt(
  value: unknown,
): QualifiedRuntimeCodeContinuationReceipt {
  exact(value, receiptKeys);
  const receipt = value as unknown as QualifiedRuntimeCodeContinuationReceipt;
  const request = validateQualifiedRuntimeCodeContinuationRequest(receipt.request);
  validateQualifiedRuntimeCodeEndpoints(receipt.endpoint_proof, request);
  requireContinuation(
    receipt.schema === 'QualifiedRuntimeCodeContinuationReceipt/v1' &&
      receipt.request_digest === canonicalJsonDigest(request) &&
      typeof receipt.protected_work_digest === 'string' &&
      hash.test(receipt.protected_work_digest) &&
      version(receipt.work_version) &&
      receipt.work_version.revision === request.expectedWork.revision + 1 &&
      receipt.status === 'adopted' &&
      receipt.rights_granted === false &&
      receipt.accepted_result === false &&
      receipt.runtime_acceptance === false,
    'receipt integrity or rights differ',
  );
  return freezeJsonValue(receipt);
}

/** Validate code-only history and expose the historical code to immutable receipt readers. */
export function projectQualifiedRuntimeCodeAncestor(
  work: WorkState,
  values: readonly QualifiedRuntimeCodeContinuationReceipt[] | undefined,
): WorkState {
  if (!values?.length) return work;
  let prior: QualifiedRuntimeCodeContinuationReceipt | null = null;
  for (const value of values) {
    const receipt = validateQualifiedRuntimeCodeContinuationReceipt(value),
      request = receipt.request;
    requireContinuation(
      request.identity.repository_id === work.binding.repository_id &&
        request.identity.work_id === work.binding.lifecycle_work_id &&
        same(request.identity.project_ids, work.binding.project_ids) &&
        request.identity.integrations_digest === work.binding.integrations_digest &&
        request.originalSourceScopeDigest === work.binding.work_source_revision &&
        receipt.protected_work_digest === runtimeCodeContinuationProtectedWorkDigest(work) &&
        receipt.work_version.revision <= work.revision &&
        (!prior ||
          (request.oldRuntimeCodeDigest === prior.request.currentRuntimeCodeDigest &&
            request.oldManifestRef === prior.request.currentManifestRef &&
            request.oldManifestDigest === prior.request.currentManifestDigest &&
            request.oldInstallRef === prior.request.currentInstallRef &&
            same(request.oldRuntimeCodePaths, prior.request.currentRuntimeCodePaths) &&
            request.expectedWork.revision >= prior.work_version.revision &&
            request.attempt === prior.request.attempt &&
            request.nativeSessionHandle === prior.request.nativeSessionHandle)),
      'code history is not the protected same-attempt descendant',
    );
    prior = receipt;
  }
  requireContinuation(
    prior &&
      work.binding.runtime_code_digest === prior.request.currentRuntimeCodeDigest &&
      work.binding.runtime_source_revision === prior.request.currentRuntimeCodeDigest &&
      work.lifecycle.config_binding.runtime_code_digest === prior.request.currentRuntimeCodeDigest,
    'current Work differs from adopted code',
  );
  const oldest = values[0]!.request.oldRuntimeCodeDigest;
  return {
    ...work,
    binding: { ...work.binding, runtime_code_digest: oldest, runtime_source_revision: oldest },
    lifecycle: { ...work.lifecycle, config_binding: { ...work.lifecycle.config_binding, runtime_code_digest: oldest } },
  };
}
export function validateQualifiedRuntimeCodeContinuationState(
  request: QualifiedRuntimeCodeContinuationRequest,
  host: HostStateSnapshot,
  journal: { readonly version: StateVersion; readonly state: MastraSessionLedgerState },
): WorkState {
  const work = host.work,
    ledger = host.ledger,
    state = journal.state;
  requireContinuation(
    work &&
      ledger &&
      same(host.workVersion, request.expectedWork) &&
      same(host.ledgerVersion, request.expectedLedger) &&
      same(journal.version, request.expectedJournal) &&
      host.maintenanceGeneration === request.expectedMaintenanceGeneration,
    'current CAS or maintenance differs',
  );
  requireContinuation(
    work.binding.repository_id === request.identity.repository_id &&
      work.binding.lifecycle_work_id === request.identity.work_id &&
      same(work.binding.project_ids, request.identity.project_ids) &&
      work.binding.integrations_digest === request.identity.integrations_digest &&
      state.work_id === request.identity.work_id &&
      state.attempt === request.attempt &&
      state.run_id === work.execution.run_id &&
      work.execution.status === 'active' &&
      work.lifecycle.seal === null &&
      work.lease?.thread_id === request.nativeSessionHandle &&
      work.lease.generation === request.leaseGeneration &&
      work.binding.runtime_code_digest === request.oldRuntimeCodeDigest &&
      work.binding.runtime_source_revision === request.oldRuntimeCodeDigest &&
      work.lifecycle.config_binding.runtime_code_digest === request.oldRuntimeCodeDigest &&
      work.binding.work_source_revision === request.originalSourceScopeDigest &&
      state.source_scope?.digest === request.journalSourceScopeDigest &&
      !state.corrective_execution &&
      state.research_wave_exposure === undefined &&
      !work.execution.assignment_attempts.some((item) => ['started', 'uncertain'].includes(item.status)) &&
      !state.items.some((item) => item.issue_id && item.observation === null),
    'owner, Source, run or quiescence differs',
  );
  const resource = 'execution:' + request.identity.work_id,
    ticket = ledger.tickets.find((item) => item.ticket_id === work.lease!.ticket_id),
    claims = ledger.claims.filter((item) => item.status === 'active' && item.ticket_id === work.lease!.ticket_id);
  requireContinuation(
    ticket?.status === 'active' &&
      ticket.thread_id === request.nativeSessionHandle &&
      ticket.generation === request.leaseGeneration &&
      ticket.work_id === request.identity.work_id &&
      same(ticket.exclusive_resources, [resource]) &&
      same(ticket.active_resources, [resource]) &&
      ticket.blocked_resources.length === 0 &&
      typeof ticket.expires_at === 'string' &&
      Number.isFinite(Date.parse(ticket.expires_at)) &&
      claims.length === 1 &&
      claims[0]!.thread_id === request.nativeSessionHandle &&
      claims[0]!.generation === request.leaseGeneration &&
      same(claims[0]!.resources, [resource]) &&
      claims[0]!.lease_expires_at === ticket.expires_at &&
      ticket.claim_ids.includes(claims[0]!.claim_id),
    'sole execution-only ownership differs',
  );
  requireContinuation(
    !ledger.claims.some(
      (item) => item.status === 'active' && item.ticket_id !== ticket.ticket_id && item.resources.includes(resource),
    ) &&
      !ledger.tickets.some(
        (item) =>
          item.ticket_id !== ticket.ticket_id &&
          !['released', 'read_only'].includes(item.status) &&
          item.exclusive_resources.includes(resource) &&
          item.sequence < ticket.sequence,
      ),
    'foreign ownership or earlier FIFO contender',
  );
  return work;
}
