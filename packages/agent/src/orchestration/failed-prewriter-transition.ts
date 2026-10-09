import { createHash } from 'node:crypto';
import {
  canonicalJsonAtDepth,
  canonicalJsonDigest,
  freezeJsonValue,
  isPlainRecord,
} from '../contracts/public-ingress.js';
import type { CoordinationLedger } from '../contracts/envelopes.js';
import type { WorkIdentity, WorkState, StateVersion } from '../host-state.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import type { SessionBridgeRequest } from './mastra-session-bridge.js';
import type { ScopedSourceSnapshot, ScopedSourceChange } from './scoped-source-snapshot.js';
import { compareScopedSourceSnapshots } from './scoped-source-snapshot.js';
import {
  validateClosedConfigRebindProof,
  validateContinuationSourceChangePaths,
  validateCurrentSourceScopeBridge,
  type ClosedConfigRebindProof,
} from './delivered-work-continuation.js';
import { validateFailedPrewriterRecoveryBasis } from './failed-prewriter-recovery.js';
import {
  projectQualifiedRuntimeCodeAncestor,
  validateQualifiedRuntimeCodeContinuationReceipt,
  type QualifiedRuntimeCodeContinuationReceipt,
} from './qualified-runtime-code-continuation.js';
import type { ConfiguredFrontierReceipt } from './delivered-work-continuation-repair.js';

export interface FailedPrewriterTransitionRequest {
  readonly schema: 'FailedPrewriterTransitionRequest/v1';
  readonly recovery_id: string;
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly nativeSessionHandle: string;
  readonly original_receipt_digest: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly currentSourceScope: ScopedSourceSnapshot;
  readonly authorizedSourceChanges: readonly ScopedSourceChange[];
  readonly sourceTransition: ClosedConfigRebindProof;
  readonly targetProjectContextDigest: string;
}

export interface FailedPrewriterRecoveryReceipt {
  readonly schema: 'FailedPrewriterRecoveryReceipt/v1';
  readonly request: FailedPrewriterTransitionRequest;
  readonly request_digest: string;
  readonly original: ConfiguredFrontierReceipt;
  readonly prior_work: WorkState;
  readonly prior_ledger: CoordinationLedger;
  readonly prior_journal: MastraSessionLedgerState;
  readonly prior_work_version: StateVersion;
  readonly prior_ledger_version: StateVersion;
  readonly prior_journal_version: StateVersion;
  readonly successor_work: WorkState;
  readonly successor_ledger: CoordinationLedger;
  readonly successor_journal: MastraSessionLedgerState;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly journal_version: StateVersion;
  readonly created_at: string;
  readonly rights_granted: false;
  readonly accepted_result: false;
  readonly runtime_acceptance: false;
}

export interface ConfiguredFrontierRecoveryView {
  readonly original: ConfiguredFrontierReceipt;
  readonly recovery: FailedPrewriterRecoveryReceipt | null;
  readonly runtimeCodeContinuations?: readonly QualifiedRuntimeCodeContinuationReceipt[];
}

const recoveryKeys = [
  'schema',
  'request',
  'request_digest',
  'original',
  'prior_work',
  'prior_ledger',
  'prior_journal',
  'prior_work_version',
  'prior_ledger_version',
  'prior_journal_version',
  'successor_work',
  'successor_ledger',
  'successor_journal',
  'work_version',
  'ledger_version',
  'journal_version',
  'created_at',
  'rights_granted',
  'accepted_result',
  'runtime_acceptance',
] as const;
const recoveryByteLimit = 64 * 1024 * 1024;

/** Keep ordinary component limits and their actual depth inside the artifact. */
function componentJson(value: unknown, depth: number): string {
  return canonicalJsonAtDepth(value, depth);
}
function envelopeGuard(value: unknown, keys: readonly string[]): void {
  requireTransition(
    isPlainRecord(value) &&
      Reflect.ownKeys(value).length === keys.length &&
      Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key)),
    'artifact envelope keys differ',
  );
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireTransition(
      descriptor?.enumerable &&
        Object.hasOwn(descriptor, 'value') &&
        descriptor.get === undefined &&
        descriptor.set === undefined,
      'artifact envelope must contain data properties',
    );
  }
}
function boundedArtifact(text: string): string {
  requireTransition(Buffer.byteLength(text, 'utf8') <= recoveryByteLimit, 'recovery artifact exceeds its byte bound');
  return text;
}
/** Identical canonical v1 bytes, with each existing state component checked separately. */
export function serializeFailedPrewriterRecoveryReceipt(receipt: FailedPrewriterRecoveryReceipt, depth = 0): string {
  canonicalJsonAtDepth(null, depth);
  envelopeGuard(receipt, recoveryKeys);
  return boundedArtifact(
    '{' +
      [...recoveryKeys]
        .sort()
        .map((key) => JSON.stringify(key) + ':' + componentJson(receipt[key], depth + 1))
        .join(',') +
      '}',
  );
}
export function failedPrewriterRecoveryDigest(receipt: FailedPrewriterRecoveryReceipt): string {
  return failedPrewriterRecoveryRecord(receipt).digest;
}
export function failedPrewriterRecoveryRecord(receipt: FailedPrewriterRecoveryReceipt): {
  payload: string;
  digest: string;
} {
  const payload = serializeFailedPrewriterRecoveryReceipt(receipt);
  return { payload, digest: createHash('sha256').update(payload).digest('hex') };
}
export function snapshotFailedPrewriterRecoveryReceipt(
  receipt: FailedPrewriterRecoveryReceipt,
): FailedPrewriterRecoveryReceipt {
  return freezeJsonValue(
    JSON.parse(serializeFailedPrewriterRecoveryReceipt(receipt)) as FailedPrewriterRecoveryReceipt,
  );
}
export function configuredFrontierRecoveryViewDigest(view: ConfiguredFrontierRecoveryView | null): string {
  if (view === null) return canonicalJsonDigest(null);
  const hasHistory = Object.hasOwn(view, 'runtimeCodeContinuations');
  envelopeGuard(view, hasHistory ? ['original', 'recovery', 'runtimeCodeContinuations'] : ['original', 'recovery']);
  requireTransition(
    !hasHistory || Array.isArray(view.runtimeCodeContinuations),
    'configured code history must be an array',
  );
  const history = view.runtimeCodeContinuations?.map(validateQualifiedRuntimeCodeContinuationReceipt) ?? [];
  const text = boundedArtifact(
    '{"original":' +
      componentJson(view.original, 1) +
      ',"recovery":' +
      (view.recovery === null ? 'null' : serializeFailedPrewriterRecoveryReceipt(view.recovery, 1)) +
      (history.length ? ',"runtimeCodeContinuations":' + componentJson(history, 1) : '') +
      '}',
  );
  return createHash('sha256').update(text).digest('hex');
}

const same = (left: unknown, right: unknown) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
function requireTransition(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(`failed prewriter transition: ${message}`);
}
const exactKeys = (value: unknown, expected: string) =>
  value !== null &&
  typeof value === 'object' &&
  Object.keys(value).sort().join(',') === expected.split(',').sort().join(',');
const stateVersion = (value: StateVersion) =>
  value && Number.isSafeInteger(value.revision) && value.revision > 0 && /^[a-f0-9]{64}$/.test(value.digest);

export function validateFailedPrewriterTransitionRequest(
  request: FailedPrewriterTransitionRequest,
  original: ConfiguredFrontierReceipt,
): FailedPrewriterTransitionRequest {
  requireTransition(
    exactKeys(
      request,
      'schema,recovery_id,identity,attempt,nativeSessionHandle,original_receipt_digest,expectedWork,expectedLedger,expectedJournal,expectedMaintenanceGeneration,currentSourceScope,authorizedSourceChanges,sourceTransition,targetProjectContextDigest',
    ) &&
      request.schema === 'FailedPrewriterTransitionRequest/v1' &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(request.recovery_id) &&
      same(request.identity, original.request.identity) &&
      request.attempt === original.attempt &&
      request.nativeSessionHandle === original.request.nativeSessionHandle &&
      request.original_receipt_digest === canonicalJsonDigest(original) &&
      stateVersion(request.expectedWork) &&
      stateVersion(request.expectedLedger) &&
      stateVersion(request.expectedJournal) &&
      Number.isSafeInteger(request.expectedMaintenanceGeneration) &&
      request.expectedMaintenanceGeneration >= 0 &&
      /^[a-f0-9]{64}$/.test(request.targetProjectContextDigest),
    'request identity, keys or current versions differ',
  );
  const proof = validateClosedConfigRebindProof(request.sourceTransition);
  requireTransition(
    proof.baseline_config_digest === original.prior_work.binding.config_digest &&
      proof.transition.workspace_id === original.prior_work.workspace_id &&
      proof.transition.repository_id === request.identity.repository_id &&
      same(proof.transition.project_ids, request.identity.project_ids) &&
      proof.transition.target_config_digest === original.request.targetConfigDigest &&
      proof.transition.prior_runtime_code_digest === original.prior_work.binding.runtime_code_digest,
    'native endpoint proof is outside the original continuation',
  );
  validateContinuationSourceChangePaths(original.prior_work, request.authorizedSourceChanges);
  return request;
}

/** Validate a durable transition without granting caller or execution authority. */
export function validateFailedPrewriterRecoveryReceipt(
  receipt: FailedPrewriterRecoveryReceipt,
): FailedPrewriterRecoveryReceipt {
  requireTransition(
    exactKeys(
      receipt,
      'schema,request,request_digest,original,prior_work,prior_ledger,prior_journal,prior_work_version,prior_ledger_version,prior_journal_version,successor_work,successor_ledger,successor_journal,work_version,ledger_version,journal_version,created_at,rights_granted,accepted_result,runtime_acceptance',
    ) &&
      receipt.schema === 'FailedPrewriterRecoveryReceipt/v1' &&
      receipt.rights_granted === false &&
      receipt.accepted_result === false &&
      receipt.runtime_acceptance === false &&
      Number.isFinite(Date.parse(receipt.created_at)),
    'receipt keys or disposition differ',
  );
  const request = validateFailedPrewriterTransitionRequest(receipt.request, receipt.original);
  requireTransition(
    receipt.request_digest === canonicalJsonDigest(request) &&
      same(receipt.prior_work_version, request.expectedWork) &&
      same(receipt.prior_ledger_version, request.expectedLedger) &&
      same(receipt.prior_journal_version, request.expectedJournal),
    'receipt request or prior versions differ',
  );
  for (const [before, after, beforeVersion, afterVersion] of [
    [receipt.prior_work, receipt.successor_work, receipt.prior_work_version, receipt.work_version],
    [receipt.prior_ledger, receipt.successor_ledger, receipt.prior_ledger_version, receipt.ledger_version],
    [receipt.prior_journal, receipt.successor_journal, receipt.prior_journal_version, receipt.journal_version],
  ] as const)
    requireTransition(
      canonicalJsonDigest(before) === beforeVersion.digest &&
        canonicalJsonDigest(after) === afterVersion.digest &&
        afterVersion.revision === beforeVersion.revision + 1,
      'receipt beforeimage, afterimage or version differs',
    );
  validateFailedPrewriterRecoveryBasis({
    original: receipt.original,
    work: receipt.prior_work,
    ledger: receipt.prior_ledger,
    journal: receipt.prior_journal,
    nativeSessionHandle: request.nativeSessionHandle,
    now: Date.parse(receipt.created_at),
    leaseState: 'live',
  });
  validateCurrentSourceScopeBridge({
    original: receipt.prior_journal.source_scope!,
    current: request.currentSourceScope,
    authorizedChanges: request.authorizedSourceChanges,
  });
  requireTransition(
    same(
      request.authorizedSourceChanges,
      compareScopedSourceSnapshots(receipt.prior_journal.source_scope!, request.currentSourceScope),
    ),
    'Source transition differs',
  );
  const endpoint = request.sourceTransition.transition;
  const binding = {
    ...receipt.prior_work.binding,
    work_source_revision: request.currentSourceScope.digest,
    config_digest: endpoint.target_config_digest,
    schema_digest: endpoint.target_schema_digest,
    runtime_code_digest: endpoint.target_runtime_code_digest,
    runtime_source_revision: endpoint.target_runtime_code_digest,
  };
  requireTransition(
    same(receipt.successor_work.binding, binding) &&
      same(receipt.successor_work.contracts, receipt.prior_work.contracts) &&
      same(receipt.successor_work.artifacts, receipt.prior_work.artifacts) &&
      same(receipt.successor_work.execution, receipt.prior_work.execution) &&
      receipt.successor_work.lease?.thread_id === request.nativeSessionHandle &&
      same(receipt.successor_journal.completed, receipt.original.prior_journal.completed) &&
      same(receipt.successor_journal.source_scope, request.currentSourceScope) &&
      receipt.successor_journal.run_id === receipt.prior_journal.run_id &&
      receipt.successor_journal.step_id === receipt.prior_journal.step_id &&
      receipt.successor_journal.items.length === receipt.prior_journal.items.length &&
      receipt.successor_journal.items.every(
        (item, index) =>
          item.issue_id === null &&
          item.observation === null &&
          same(Object.keys(item).sort(), ['issue_id', 'observation', 'request']) &&
          item.request.run_id === receipt.prior_journal.run_id &&
          item.request.scope_digest === request.currentSourceScope.digest &&
          item.request.config_digest === binding.config_digest &&
          item.request.stage_id === receipt.prior_journal.items[index]!.request.stage_id &&
          item.request.role === receipt.prior_journal.items[index]!.request.role &&
          item.request.assignment_index === receipt.prior_journal.items[index]!.request.assignment_index &&
          item.request.wave_index === receipt.prior_journal.items[index]!.request.wave_index &&
          !receipt.prior_journal.items.some((prior) => prior.request.action_id === item.request.action_id),
      ),
    'successor state or fresh readonly cohort differs',
  );
  const before = receipt.prior_ledger,
    after = receipt.successor_ledger;
  const priorTicket = before.tickets.find((item) => item.ticket_id === receipt.prior_work.lease!.ticket_id)!;
  const oldClaim = before.claims.find((item) => item.ticket_id === priorTicket.ticket_id && item.status === 'active')!;
  const nextTicket = after.tickets.find((item) => item.ticket_id === receipt.successor_work.lease!.ticket_id);
  const newClaims = after.claims.filter((item) => item.ticket_id === nextTicket?.ticket_id && item.status === 'active');
  requireTransition(
    receipt.successor_work.revision === receipt.work_version.revision &&
      receipt.successor_work.lifecycle.revision === receipt.work_version.revision &&
      after.revision === receipt.ledger_version.revision &&
      after.next_sequence === before.next_sequence + 1 &&
      nextTicket?.status === 'active' &&
      nextTicket.sequence === before.next_sequence &&
      nextTicket.generation === before.open_generation &&
      receipt.successor_work.lease!.generation === nextTicket.generation &&
      nextTicket.thread_id === request.nativeSessionHandle &&
      nextTicket.work_id === request.identity.work_id &&
      nextTicket.source_revision === request.currentSourceScope.digest &&
      same(nextTicket.exclusive_resources, priorTicket.exclusive_resources) &&
      same(nextTicket.active_resources, priorTicket.exclusive_resources) &&
      nextTicket.blocked_resources.length === 0 &&
      nextTicket.expires_at !== null &&
      Date.parse(nextTicket.expires_at) > Date.parse(receipt.created_at) &&
      newClaims.length === 1 &&
      newClaims[0]!.thread_id === request.nativeSessionHandle &&
      newClaims[0]!.lease_expires_at === nextTicket.expires_at &&
      same(newClaims[0]!.resources, oldClaim.resources) &&
      after.tickets.find((item) => item.ticket_id === priorTicket.ticket_id)?.status === 'read_only' &&
      after.claims.find((item) => item.claim_id === oldClaim.claim_id)?.status === 'recovered',
    'successor full-resource ownership differs',
  );
  requireTransition(
    receipt.prior_work.revision === receipt.prior_work_version.revision &&
      receipt.prior_ledger.revision === receipt.prior_ledger_version.revision &&
      same(receipt.successor_work, {
        ...receipt.prior_work,
        revision: receipt.work_version.revision,
        binding,
        lease: receipt.successor_work.lease,
        lifecycle: {
          ...receipt.prior_work.lifecycle,
          revision: receipt.work_version.revision,
          source_revision: request.currentSourceScope.digest,
          config_binding: {
            config_digest: endpoint.target_config_digest,
            schema_digest: endpoint.target_schema_digest,
            runtime_code_digest: endpoint.target_runtime_code_digest,
          },
        },
      }) &&
      same(receipt.successor_journal, {
        ...receipt.prior_journal,
        source_scope: request.currentSourceScope,
        items: receipt.successor_journal.items,
      }) &&
      same(after, {
        ...before,
        revision: receipt.ledger_version.revision,
        next_sequence: before.next_sequence + 1,
        tickets: [
          ...before.tickets.map((item) =>
            item.ticket_id === priorTicket.ticket_id
              ? { ...item, status: 'read_only', active_resources: [], blocked_resources: [], expires_at: null }
              : item,
          ),
          nextTicket,
        ],
        claims: [
          ...before.claims.map((item) =>
            item.claim_id === oldClaim.claim_id ? { ...item, status: 'recovered' } : item,
          ),
          newClaims[0],
        ],
      }) &&
      same(nextTicket, {
        ...priorTicket,
        ticket_id: nextTicket.ticket_id,
        sequence: before.next_sequence,
        generation: before.open_generation,
        source_revision: request.currentSourceScope.digest,
        claim_ids: [newClaims[0]!.claim_id],
        expires_at: nextTicket.expires_at,
        created_at: receipt.created_at,
      }) &&
      same(newClaims[0], {
        ...oldClaim,
        claim_id: newClaims[0]!.claim_id,
        ticket_id: nextTicket.ticket_id,
        generation: before.open_generation,
        lease_expires_at: nextTicket.expires_at,
        created_at: receipt.created_at,
        renewed_at: receipt.created_at,
      }),
    'transition changed unrelated state or rights',
  );
  return receipt;
}

export function effectiveConfiguredFrontier(view: ConfiguredFrontierRecoveryView): {
  currentSourceScope: ScopedSourceSnapshot;
  currentBinding: WorkState['binding'];
  requests: readonly SessionBridgeRequest[];
} {
  const recovery = view.recovery && validateFailedPrewriterRecoveryReceipt(view.recovery);
  requireTransition(!recovery || same(recovery.original, view.original), 'recovery view original receipt differs');
  const base = recovery?.successor_work ?? view.original.successor_work;
  const adopted = view.runtimeCodeContinuations?.at(-1);
  let currentBinding = recovery?.successor_work.binding ?? view.original.successor_binding;
  if (adopted) {
    const projected = {
      ...base,
      revision: adopted.work_version.revision,
      binding: {
        ...base.binding,
        runtime_code_digest: adopted.request.currentRuntimeCodeDigest,
        runtime_source_revision: adopted.request.currentRuntimeCodeDigest,
      },
      lifecycle: {
        ...base.lifecycle,
        config_binding: {
          ...base.lifecycle.config_binding,
          runtime_code_digest: adopted.request.currentRuntimeCodeDigest,
        },
      },
    };
    requireTransition(
      same(projectQualifiedRuntimeCodeAncestor(projected, view.runtimeCodeContinuations).binding, base.binding),
      'configured code adoption does not retain its ancestor',
    );
    currentBinding = projected.binding;
  }
  return {
    currentSourceScope: recovery?.request.currentSourceScope ?? view.original.request.currentSourceScope,
    currentBinding,
    requests: (recovery?.successor_journal ?? view.original.successor_journal).items.map((item) => item.request),
  };
}
