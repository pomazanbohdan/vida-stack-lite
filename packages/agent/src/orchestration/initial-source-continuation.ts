import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  canonicalJsonAtDepth,
  canonicalJsonDigest,
  freezeJsonValue,
  isPlainRecord,
} from '../contracts/public-ingress.js';
import { runtimeConfigDigest, type AgentRuntimeConfig, type WorkItemSelection } from '../config/runtime-config.js';
import type { CoordinationLedger } from '../contracts/envelopes.js';
import type { LifecycleArtifactReference } from '../lifecycle/lifecycle-state.js';
import type { StateVersion, WorkArtifactReference, WorkIdentity, WorkState } from '../host-state.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
  parseSessionBridgeRequest,
  type SessionBridgeRequest,
  type SessionBridgeSnapshot,
} from './mastra-session-bridge.js';
import {
  compareScopedSourceSnapshots,
  type ScopedSourceChange,
  type ScopedSourceSnapshot,
} from './scoped-source-snapshot.js';
import { sessionActionsForWave } from './session-handoff.js';

const digestPattern = /^[a-f0-9]{64}$/;
const receiptByteLimit = 64 * 1024 * 1024;
const receiptKeys = [
  'schema',
  'continuation_id',
  'request_digest',
  'request',
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
  'rights_granted',
  'accepted_result',
  'runtime_acceptance',
  'status',
] as const;
function receiptEnvelope(value: unknown): asserts value is InitialSourceContinuationReceipt {
  requireInitial(
    isPlainRecord(value) &&
      Reflect.ownKeys(value).length === receiptKeys.length &&
      Reflect.ownKeys(value).every(
        (key) => typeof key === 'string' && receiptKeys.includes(key as (typeof receiptKeys)[number]),
      ),
    'receipt envelope keys differ',
  );
  for (const key of receiptKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireInitial(
      descriptor?.enumerable &&
        Object.hasOwn(descriptor, 'value') &&
        descriptor.get === undefined &&
        descriptor.set === undefined,
      'receipt fields must be data properties',
    );
  }
}
function receiptComponent(value: unknown, depth: number): string {
  return canonicalJsonAtDepth(value, depth);
}
/** Serialize each retained state component under its normal 10k-node / 8 MiB / depth-64 limits. */
export function serializeInitialSourceContinuationReceipt(
  receipt: InitialSourceContinuationReceipt,
  depth = 0,
): string {
  canonicalJsonAtDepth(null, depth);
  receiptEnvelope(receipt);
  const payload =
    '{' +
    [...receiptKeys]
      .sort()
      .map((key) => JSON.stringify(key) + ':' + receiptComponent(receipt[key], depth + 1))
      .join(',') +
    '}';
  requireInitial(Buffer.byteLength(payload, 'utf8') <= receiptByteLimit, 'receipt exceeds its 64 MiB envelope limit');
  return payload;
}
export function initialSourceContinuationRecord(receipt: InitialSourceContinuationReceipt): {
  payload: string;
  digest: string;
} {
  const payload = serializeInitialSourceContinuationReceipt(receipt);
  return { payload, digest: createHash('sha256').update(payload).digest('hex') };
}
export function readInitialSourceContinuationRecord(payload: string, digest: string): InitialSourceContinuationReceipt {
  requireInitial(
    typeof payload === 'string' && Buffer.byteLength(payload, 'utf8') <= receiptByteLimit && digestPattern.test(digest),
    'stored receipt record exceeds its bound or has an invalid digest',
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('initial source continuation: stored receipt JSON is invalid');
  }
  const receipt = validateInitialSourceContinuationReceipt(parsed),
    encoded = initialSourceContinuationRecord(receipt);
  requireInitial(encoded.payload === payload && encoded.digest === digest, 'stored receipt checksum differs');
  return receipt;
}
export function snapshotInitialSourceContinuationReceipt(
  receipt: InitialSourceContinuationReceipt,
): InitialSourceContinuationReceipt {
  return freezeJsonValue(
    JSON.parse(serializeInitialSourceContinuationReceipt(receipt)) as InitialSourceContinuationReceipt,
  );
}

export interface InitialSourceContinuationRequest {
  readonly schema: 'InitialSourceContinuationRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly nativeSessionHandle: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly configDigest: string;
  readonly priorRuntimeCodeDigest: string;
  readonly currentRuntimeCodeDigest: string;
  readonly currentSourceScope: ScopedSourceSnapshot;
  readonly authorizedSourceChanges: readonly ScopedSourceChange[];
  readonly sourceAuthorizationReference: LifecycleArtifactReference;
  readonly sourceAuthorizationSha256: string;
  readonly priorEngineSnapshot: SessionBridgeSnapshot;
  readonly currentInitialRequest: SessionBridgeRequest;
}

export interface InitialSourceContinuationReceipt {
  readonly schema: 'InitialSourceContinuationReceipt/v1';
  readonly continuation_id: string;
  readonly request_digest: string;
  readonly request: InitialSourceContinuationRequest;
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
  readonly rights_granted: false;
  readonly accepted_result: false;
  readonly runtime_acceptance: false;
  readonly status: 'initial_request_ready';
}

export interface InitialSourceContinuationState {
  readonly work: WorkState;
  readonly ledger: CoordinationLedger;
  readonly journal: MastraSessionLedgerState;
  readonly workVersion: StateVersion;
  readonly ledgerVersion: StateVersion;
  readonly journalVersion: StateVersion;
  readonly maintenanceGeneration: number;
}

export interface InitialSourceContinuationVerifiedCurrent {
  readonly configDigest: string;
  readonly currentRuntimeCodeDigest: string;
  readonly currentSourceScope: ScopedSourceSnapshot;
  readonly sourceAuthorizationReference: LifecycleArtifactReference;
  readonly sourceAuthorizationSha256: string;
  readonly intakeReference: WorkArtifactReference;
  readonly intakeSha256: string;
  readonly priorEngineSnapshot: SessionBridgeSnapshot;
  readonly currentInitialRequest: SessionBridgeRequest;
}

function requireInitial(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('initial source continuation: ' + message);
}

function exactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function validVersion(value: unknown): value is StateVersion {
  return (
    exactKeys(value, ['revision', 'digest']) &&
    Number.isSafeInteger(value.revision) &&
    (value.revision as number) > 0 &&
    typeof value.digest === 'string' &&
    digestPattern.test(value.digest)
  );
}

function validSourceScope(value: unknown): value is ScopedSourceSnapshot {
  if (!exactKeys(value, ['schema', 'entries', 'digest'])) return false;
  const scope = value as unknown as ScopedSourceSnapshot;
  return (
    scope.schema === 'ScopedSourceSnapshot/v1' &&
    digestPattern.test(scope.digest) &&
    Array.isArray(scope.entries) &&
    scope.entries.every(
      (entry, index) =>
        exactKeys(entry, ['path', 'exists', 'bytes', 'sha256']) &&
        typeof entry.path === 'string' &&
        !entry.path.includes('\\') &&
        !entry.path.startsWith('/') &&
        entry.path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..') &&
        (index === 0 || scope.entries[index - 1]!.path < entry.path) &&
        typeof entry.exists === 'boolean' &&
        (entry.exists
          ? Number.isSafeInteger(entry.bytes) &&
            (entry.bytes as number) >= 0 &&
            typeof entry.sha256 === 'string' &&
            digestPattern.test(entry.sha256)
          : entry.bytes === null && entry.sha256 === null),
    ) &&
    scope.digest === canonicalJsonDigest({ schema: scope.schema, entries: scope.entries })
  );
}

function validSnapshot(value: unknown): value is SessionBridgeSnapshot {
  if (!exactKeys(value, ['run_id', 'status', 'step_id', 'requests', 'observations'])) return false;
  const snapshot = value as unknown as SessionBridgeSnapshot;
  return (
    typeof snapshot.run_id === 'string' &&
    snapshot.run_id.length > 0 &&
    snapshot.status === 'suspended' &&
    snapshot.step_id === 'wave-0' &&
    Array.isArray(snapshot.requests) &&
    snapshot.requests.length === 1 &&
    Array.isArray(snapshot.observations) &&
    snapshot.observations.length === 0 &&
    snapshot.requests.every((request) => {
      try {
        return canonicalJsonDigest(parseSessionBridgeRequest(request)) === canonicalJsonDigest(request);
      } catch {
        return false;
      }
    })
  );
}

/**
 * Validate only the frozen same-attempt initial frontier. The caller supplies
 * fresh bytes/code snapshots; this function never admits a new Work or issues an action.
 */
export function validateInitialSourceContinuationRequest(
  value: unknown,
  state: InitialSourceContinuationState,
  config: AgentRuntimeConfig,
): InitialSourceContinuationRequest {
  const keys = [
    'schema',
    'identity',
    'attempt',
    'nativeSessionHandle',
    'expectedWork',
    'expectedLedger',
    'expectedJournal',
    'expectedMaintenanceGeneration',
    'configDigest',
    'priorRuntimeCodeDigest',
    'currentRuntimeCodeDigest',
    'currentSourceScope',
    'authorizedSourceChanges',
    'sourceAuthorizationReference',
    'sourceAuthorizationSha256',
    'priorEngineSnapshot',
    'currentInitialRequest',
  ];
  requireInitial(exactKeys(value, keys), 'request fields are invalid');
  const request = value as unknown as InitialSourceContinuationRequest;
  const { work, ledger, journal } = state;
  const ticket = ledger.tickets.find((entry) => entry.ticket_id === work.lease?.ticket_id);
  const claims = ledger.claims.filter((entry) => entry.ticket_id === ticket?.ticket_id && entry.status === 'active');
  const approvalRefs = work.lifecycle.references.filter(
    (reference) =>
      reference.kind === 'execution_approval' &&
      reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      reference.decision === 'approved' &&
      reference.disposition === 'current',
  );

  requireInitial(
    request.schema === 'InitialSourceContinuationRequest/v1' &&
      exactKeys(request.identity, ['repository_id', 'project_ids', 'integrations_digest', 'work_id']) &&
      request.identity.work_id === work.binding.lifecycle_work_id &&
      request.identity.repository_id === work.binding.repository_id &&
      canonicalJsonDigest(request.identity.project_ids) === canonicalJsonDigest(work.binding.project_ids) &&
      request.identity.integrations_digest === work.binding.integrations_digest &&
      request.attempt === journal.attempt &&
      Number.isSafeInteger(request.attempt) &&
      request.attempt > 0 &&
      request.nativeSessionHandle === work.lease?.thread_id &&
      request.nativeSessionHandle.length > 0 &&
      validVersion(request.expectedWork) &&
      canonicalJsonDigest(request.expectedWork) === canonicalJsonDigest(state.workVersion) &&
      validVersion(request.expectedLedger) &&
      canonicalJsonDigest(request.expectedLedger) === canonicalJsonDigest(state.ledgerVersion) &&
      validVersion(request.expectedJournal) &&
      canonicalJsonDigest(request.expectedJournal) === canonicalJsonDigest(state.journalVersion) &&
      request.expectedMaintenanceGeneration === state.maintenanceGeneration &&
      Number.isSafeInteger(request.expectedMaintenanceGeneration) &&
      request.expectedMaintenanceGeneration >= 0 &&
      request.configDigest === work.binding.config_digest &&
      request.configDigest === runtimeConfigDigest(config) &&
      digestPattern.test(request.priorRuntimeCodeDigest) &&
      request.priorRuntimeCodeDigest === work.binding.runtime_code_digest &&
      digestPattern.test(request.currentRuntimeCodeDigest) &&
      validSourceScope(request.currentSourceScope) &&
      request.currentSourceScope.entries.map((entry) => entry.path).join('\0') ===
        [...work.lifecycle.scope.allowed_paths].sort().join('\0') &&
      Array.isArray(request.authorizedSourceChanges) &&
      request.authorizedSourceChanges.length > 0 &&
      isPlainRecord(request.sourceAuthorizationReference) &&
      typeof request.sourceAuthorizationSha256 === 'string' &&
      request.sourceAuthorizationSha256 === request.sourceAuthorizationReference.sha256 &&
      digestPattern.test(request.sourceAuthorizationSha256) &&
      approvalRefs.length === 1 &&
      canonicalJsonDigest(request.sourceAuthorizationReference) === canonicalJsonDigest(approvalRefs[0]) &&
      request.sourceAuthorizationReference.source_revision === work.binding.work_source_revision &&
      request.sourceAuthorizationReference.scope_id === work.binding.scope_id &&
      validSnapshot(request.priorEngineSnapshot) &&
      request.priorEngineSnapshot.run_id === work.execution.run_id &&
      request.currentInitialRequest.workflow_id === work.binding.workflow_id &&
      request.currentInitialRequest.run_id === work.execution.run_id &&
      request.currentInitialRequest.config_digest === request.configDigest &&
      request.currentInitialRequest.scope_digest === request.currentSourceScope.digest &&
      request.currentInitialRequest.wave_index === 0 &&
      state.maintenanceGeneration >= 0,
    'request does not bind the original Work, permission, run, scope or code endpoint',
  );

  requireInitial(
    work.execution.status === 'active' &&
      work.execution.phase === 'implementation' &&
      work.execution.assignment_attempts.length === 0 &&
      work.lifecycle.phase === 'INTAKE' &&
      work.lifecycle.seal === null &&
      work.lifecycle.assurance.review_generation === 0 &&
      work.lifecycle.assurance.delivery_cycle_id === null &&
      work.lease !== null &&
      ticket?.status === 'active' &&
      ticket.thread_id === request.nativeSessionHandle &&
      ticket.generation === work.lease.generation &&
      ticket.generation === ledger.open_generation &&
      ticket.claim_ids.includes(claims[0]!.claim_id) &&
      ticket.expires_at !== null &&
      Date.parse(ticket.expires_at) <= Date.now() &&
      claims.length === 1 &&
      Date.parse(claims[0]!.lease_expires_at) <= Date.now() &&
      ticket.expires_at === claims[0]!.lease_expires_at &&
      canonicalJsonDigest(ticket.active_resources) === canonicalJsonDigest(ticket.exclusive_resources) &&
      ticket.blocked_resources.length === 0 &&
      canonicalJsonDigest(claims[0]!.resources) === canonicalJsonDigest(ticket.active_resources) &&
      claims[0]!.thread_id === request.nativeSessionHandle &&
      claims[0]!.generation === work.lease.generation &&
      canonicalJsonDigest(ticket.exclusive_resources) ===
        canonicalJsonDigest(['execution:' + request.identity.work_id]) &&
      journal.schema === 'MastraSessionLedger/v1' &&
      journal.workspace_id === work.workspace_id &&
      journal.work_id === request.identity.work_id &&
      journal.run_id === work.execution.run_id &&
      journal.step_id === 'wave-0' &&
      journal.completed.length === 0 &&
      journal.items.length === 1 &&
      journal.research_wave_exposure === undefined &&
      journal.source_scope?.digest === work.binding.work_source_revision &&
      journal.items[0]!.issue_id === null &&
      journal.items[0]!.observation === null &&
      journal.items[0]!.host_reservation === undefined &&
      journal.items[0]!.research_activation === undefined &&
      journal.items[0]!.research_normalization === undefined &&
      canonicalJsonDigest(parseSessionBridgeRequest(request.priorEngineSnapshot.requests[0]!)) ===
        canonicalJsonDigest(parseSessionBridgeRequest(journal.items[0]!.request)) &&
      request.priorEngineSnapshot.observations.length === 0,
    'Work is not the expired, execution-only, unissued first readonly wave',
  );

  const stage = config.workflows[work.binding.workflow_id]?.stages.find(
    (entry) => entry.id === journal.items[0]!.request.stage_id,
  );
  const assignment = stage?.assignments[journal.items[0]!.request.assignment_index];
  const profile = assignment && config.agents.profiles[assignment.profile];
  requireInitial(
    (stage?.kind === 'research' || stage?.kind === 'synthesize') &&
      assignment?.role === journal.items[0]!.request.role &&
      profile?.mutation_scope === 'none' &&
      journal.items[0]!.request.config_digest === request.configDigest &&
      journal.items[0]!.request.scope_digest === work.binding.work_source_revision &&
      journal.items[0]!.request.wave_index === 0 &&
      journal.items[0]!.request.run_id === journal.run_id,
    'initial request is not the configured readonly synthesis action',
  );

  const changes = compareScopedSourceSnapshots(journal.source_scope!, request.currentSourceScope);
  const documentationPaths = new Set(work.lifecycle.scope.documentation_paths);
  requireInitial(
    changes.length === request.authorizedSourceChanges.length &&
      changes.length > 0 &&
      changes.length <= documentationPaths.size &&
      changes.every(
        (change) =>
          documentationPaths.has(change.path) &&
          canonicalJsonDigest(request.authorizedSourceChanges.find((entry) => entry.path === change.path)) ===
            canonicalJsonDigest(change),
      ) &&
      request.currentInitialRequest.action_id !== journal.items[0]!.request.action_id &&
      request.currentInitialRequest.stage_id === journal.items[0]!.request.stage_id &&
      request.currentInitialRequest.role === journal.items[0]!.request.role &&
      !ledger.claims.some(
        (entry) =>
          entry.status === 'active' &&
          entry.ticket_id !== ticket.ticket_id &&
          entry.resources.includes('execution:' + request.identity.work_id),
      ) &&
      !ledger.tickets.some(
        (entry) =>
          entry.status === 'queued' &&
          entry.sequence < ledger.next_sequence &&
          entry.exclusive_resources.includes('execution:' + request.identity.work_id),
      ),
    'Source bridge changed paths, readonly action, ownership or FIFO',
  );
  return request;
}

/** Derive wave-0 again from the retained run identity, unchanged config and current Source digest. */
export function projectCurrentInitialSourceRequest(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly selection: WorkItemSelection;
  readonly workId: string;
  readonly attempt: number;
  readonly workflowId: string;
  readonly runId: string;
  readonly currentSourceScope: ScopedSourceSnapshot;
}): SessionBridgeRequest {
  const context = {
    work_id: input.workId,
    attempt: input.attempt,
    scope_digest: input.currentSourceScope.digest,
  };
  const actions = sessionActionsForWave(input.config, input.selection, context, input.workflowId, 0, []);
  requireInitial(actions.length === 1, 'current config no longer has one initial assignment');
  const action = actions[0]!;
  const request = buildSessionBridgeRequest({
    runId: input.runId,
    workflowId: input.workflowId,
    configDigest: runtimeConfigDigest(input.config),
    context,
    waveIndex: 0,
    action,
    configuredContext: configuredContextForStage(
      input.repositoryRoot,
      input.config,
      input.workflowId,
      action.stage_id,
      context,
    ),
    priorResults: [],
  });
  return parseSessionBridgeRequest(request);
}

/** Receipt validator is used by retained-run readers before accepting old wave-0 input. */
export function validateInitialSourceContinuationReceipt(value: unknown): InitialSourceContinuationReceipt {
  const keys = [
    'schema',
    'continuation_id',
    'request_digest',
    'request',
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
    'rights_granted',
    'accepted_result',
    'runtime_acceptance',
    'status',
  ];
  requireInitial(exactKeys(value, keys), 'receipt fields are invalid');
  const receipt = value as unknown as InitialSourceContinuationReceipt;
  serializeInitialSourceContinuationReceipt(receipt);
  requireInitial(
    receipt.schema === 'InitialSourceContinuationReceipt/v1' &&
      digestPattern.test(receipt.continuation_id) &&
      digestPattern.test(receipt.request_digest) &&
      receipt.request_digest === canonicalJsonDigest(receipt.request) &&
      validVersion(receipt.prior_work_version) &&
      validVersion(receipt.prior_ledger_version) &&
      validVersion(receipt.prior_journal_version) &&
      validVersion(receipt.work_version) &&
      validVersion(receipt.ledger_version) &&
      validVersion(receipt.journal_version) &&
      receipt.rights_granted === false &&
      receipt.accepted_result === false &&
      receipt.runtime_acceptance === false &&
      receipt.status === 'initial_request_ready' &&
      receipt.prior_journal.completed.length === 0 &&
      receipt.prior_journal.research_wave_exposure === undefined &&
      receipt.successor_journal.completed.length === 0 &&
      receipt.successor_journal.research_wave_exposure === undefined &&
      receipt.successor_journal.items.length === 1 &&
      receipt.successor_journal.items[0]!.issue_id === null &&
      receipt.successor_journal.items[0]!.observation === null &&
      receipt.successor_journal.items[0]!.host_reservation === undefined &&
      receipt.successor_journal.items[0]!.request.action_id === receipt.request.currentInitialRequest.action_id &&
      receipt.successor_work.execution.run_id === receipt.prior_work.execution.run_id &&
      receipt.successor_work.binding.config_digest === receipt.prior_work.binding.config_digest &&
      receipt.successor_work.binding.scope_contract_digest === receipt.prior_work.binding.scope_contract_digest &&
      receipt.successor_work.binding.acceptance_manifest_digest ===
        receipt.prior_work.binding.acceptance_manifest_digest &&
      receipt.successor_work.binding.work_source_revision === receipt.request.currentSourceScope.digest &&
      receipt.successor_work.binding.runtime_code_digest === receipt.request.currentRuntimeCodeDigest &&
      receipt.successor_work.lifecycle.references.some(
        (reference) =>
          canonicalJsonDigest(reference) === canonicalJsonDigest(receipt.request.sourceAuthorizationReference),
      ),
    'receipt changes the original run/contracts/permission or contains an issued action',
  );
  const request = receipt.request,
    original = receipt.prior_work,
    successor = receipt.successor_work,
    priorLedger = receipt.prior_ledger,
    successorLedger = receipt.successor_ledger,
    priorJournal = receipt.prior_journal,
    successorJournal = receipt.successor_journal,
    oldTicket = priorLedger.tickets.find((entry) => entry.ticket_id === original.lease?.ticket_id),
    oldClaims = priorLedger.claims.filter(
      (entry) => entry.ticket_id === oldTicket?.ticket_id && entry.status === 'active',
    ),
    successorOldTicket = successorLedger.tickets.find((entry) => entry.ticket_id === oldTicket?.ticket_id),
    newTicket = successorLedger.tickets.find((entry) => entry.ticket_id === successor.lease?.ticket_id),
    newClaims = successorLedger.claims.filter(
      (entry) => entry.ticket_id === newTicket?.ticket_id && entry.status === 'active',
    ),
    rebind = successorLedger.rebinds[priorLedger.rebinds.length],
    changed =
      priorJournal.source_scope && compareScopedSourceSnapshots(priorJournal.source_scope, request.currentSourceScope),
    same = (left: unknown, right: unknown) => canonicalJsonDigest(left) === canonicalJsonDigest(right),
    intakeReferences = original.artifacts.filter(
      (entry) =>
        entry.artifact_id === 'local-session-intake' &&
        entry.schema === 'VidaLocalSessionIntake/v1' &&
        entry.stage_id === 'intake',
    ),
    sourcePermissions = original.lifecycle.references.filter(
      (reference) =>
        reference.kind === 'execution_approval' &&
        reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
        reference.disposition === 'current' &&
        reference.decision === 'approved',
    );
  requireInitial(
    same(request.identity, {
      repository_id: original.binding.repository_id,
      project_ids: original.binding.project_ids,
      integrations_digest: original.binding.integrations_digest,
      work_id: original.binding.lifecycle_work_id,
    }) &&
      request.attempt === priorJournal.attempt &&
      request.nativeSessionHandle === original.lease?.thread_id &&
      request.expectedWork.revision === receipt.prior_work_version.revision &&
      same(request.expectedWork, receipt.prior_work_version) &&
      same(request.expectedLedger, receipt.prior_ledger_version) &&
      same(request.expectedJournal, receipt.prior_journal_version) &&
      original.revision === receipt.prior_work_version.revision &&
      canonicalJsonDigest(original) === receipt.prior_work_version.digest &&
      priorLedger.revision === receipt.prior_ledger_version.revision &&
      canonicalJsonDigest(priorLedger) === receipt.prior_ledger_version.digest &&
      priorJournal.workspace_id === original.workspace_id &&
      priorJournal.work_id === request.identity.work_id &&
      priorJournal.run_id === original.execution.run_id &&
      canonicalJsonDigest(priorJournal) === receipt.prior_journal_version.digest &&
      receipt.work_version.revision === receipt.prior_work_version.revision + 1 &&
      successor.revision === receipt.work_version.revision &&
      successor.lifecycle.revision === successor.revision &&
      canonicalJsonDigest(successor) === receipt.work_version.digest &&
      receipt.ledger_version.revision === receipt.prior_ledger_version.revision + 1 &&
      successorLedger.revision === receipt.ledger_version.revision &&
      canonicalJsonDigest(successorLedger) === receipt.ledger_version.digest &&
      receipt.journal_version.revision === receipt.prior_journal_version.revision + 1 &&
      canonicalJsonDigest(successorJournal) === receipt.journal_version.digest &&
      successor.workspace_id === original.workspace_id &&
      same(successor.binding, {
        ...original.binding,
        work_source_revision: request.currentSourceScope.digest,
        runtime_code_digest: request.currentRuntimeCodeDigest,
        runtime_source_revision: request.currentRuntimeCodeDigest,
      }) &&
      successor.binding.config_digest === original.binding.config_digest &&
      successor.binding.scope_contract_digest === original.binding.scope_contract_digest &&
      successor.binding.acceptance_manifest_digest === original.binding.acceptance_manifest_digest &&
      same(successor.contracts, original.contracts) &&
      same(successor.artifacts, original.artifacts) &&
      same(successor.lifecycle.config_binding, {
        ...original.lifecycle.config_binding,
        runtime_code_digest: request.currentRuntimeCodeDigest,
      }) &&
      same(successor.lifecycle.references, original.lifecycle.references) &&
      successor.lifecycle.source_revision === request.currentSourceScope.digest &&
      same(
        {
          ...successor.lifecycle,
          revision: original.lifecycle.revision,
          source_revision: original.lifecycle.source_revision,
          config_binding: original.lifecycle.config_binding,
        },
        original.lifecycle,
      ) &&
      successor.execution.status === original.execution.status &&
      successor.execution.phase === original.execution.phase &&
      successor.execution.run_id === original.execution.run_id &&
      successor.execution.input_digest === original.execution.input_digest &&
      same(successor.execution.assignment_attempts, original.execution.assignment_attempts) &&
      priorJournal.completed.length === 0 &&
      priorJournal.items.length === 1 &&
      priorJournal.items[0]!.issue_id === null &&
      priorJournal.items[0]!.observation === null &&
      priorJournal.items[0]!.host_reservation === undefined &&
      canonicalJsonDigest(parseSessionBridgeRequest(priorJournal.items[0]!.request)) ===
        canonicalJsonDigest(parseSessionBridgeRequest(request.priorEngineSnapshot.requests[0]!)) &&
      successorJournal.workspace_id === priorJournal.workspace_id &&
      successorJournal.work_id === priorJournal.work_id &&
      successorJournal.attempt === priorJournal.attempt &&
      successorJournal.run_id === priorJournal.run_id &&
      successorJournal.step_id === 'wave-0' &&
      successorJournal.completed.length === 0 &&
      successorJournal.items.length === 1 &&
      same(successorJournal.source_scope, request.currentSourceScope) &&
      same(successorJournal.items[0]!.request, request.currentInitialRequest) &&
      successorJournal.items[0]!.issue_id === null &&
      successorJournal.items[0]!.observation === null &&
      successorJournal.items[0]!.host_reservation === undefined &&
      request.currentInitialRequest.action_id !== priorJournal.items[0]!.request.action_id &&
      request.currentInitialRequest.run_id === original.execution.run_id &&
      request.currentInitialRequest.config_digest === original.binding.config_digest &&
      request.currentInitialRequest.scope_digest === request.currentSourceScope.digest &&
      request.currentInitialRequest.wave_index === 0 &&
      Boolean(
        changed &&
        changed.length > 0 &&
        changed.length === request.authorizedSourceChanges.length &&
        changed.every(
          (change) =>
            original.lifecycle.scope.documentation_paths.includes(change.path) &&
            same(
              request.authorizedSourceChanges.find((entry) => entry.path === change.path),
              change,
            ),
        ),
      ) &&
      intakeReferences.length === 1 &&
      sourcePermissions.length === 1 &&
      same(request.sourceAuthorizationReference, sourcePermissions[0]) &&
      isPlainRecord(request.sourceAuthorizationReference) &&
      typeof request.sourceAuthorizationSha256 === 'string' &&
      request.sourceAuthorizationSha256 === request.sourceAuthorizationReference.sha256 &&
      oldTicket !== undefined &&
      oldTicket.status === 'active' &&
      oldTicket.thread_id === request.nativeSessionHandle &&
      oldTicket.source_revision === original.binding.work_source_revision &&
      oldTicket.generation === priorLedger.open_generation &&
      oldTicket.expires_at !== null &&
      oldClaims.length === 1 &&
      oldClaims[0]!.thread_id === request.nativeSessionHandle &&
      oldClaims[0]!.lease_expires_at === oldTicket.expires_at &&
      newTicket !== undefined &&
      newTicket.status === 'active' &&
      newTicket.thread_id === request.nativeSessionHandle &&
      newTicket.source_revision === request.currentSourceScope.digest &&
      newTicket.expires_at !== null &&
      oldTicket.expires_at !== null &&
      Date.parse(oldTicket.expires_at) <= Date.parse(newTicket.created_at) &&
      newTicket.ticket_id === successor.lease?.ticket_id &&
      newTicket.generation === successor.lease?.generation &&
      newClaims.length === 1 &&
      newClaims[0]!.ticket_id === newTicket.ticket_id &&
      newClaims[0]!.lease_expires_at === newTicket.expires_at &&
      successorOldTicket?.status === 'read_only' &&
      oldClaims.every(
        (claim) => successorLedger.claims.find((entry) => entry.claim_id === claim.claim_id)?.status === 'recovered',
      ) &&
      Boolean(
        rebind &&
        rebind.schema === 'CoordinationScopeRebind/v1' &&
        rebind.previous_ticket_id === oldTicket.ticket_id &&
        rebind.previous_source_revision === oldTicket.source_revision &&
        rebind.ticket_id === newTicket.ticket_id &&
        rebind.source_revision === request.currentSourceScope.digest &&
        rebind.work_id === request.identity.work_id &&
        rebind.thread_id === request.nativeSessionHandle &&
        rebind.from_ledger_revision === priorLedger.revision &&
        rebind.to_ledger_revision === successorLedger.revision,
      ) &&
      priorLedger.open_generation === successorLedger.open_generation &&
      !priorLedger.claims.some(
        (claim) =>
          claim.status === 'active' &&
          claim.ticket_id !== oldTicket.ticket_id &&
          claim.resources.some((resource) => oldTicket.exclusive_resources.includes(resource)),
      ) &&
      !priorLedger.tickets.some(
        (ticket) =>
          ticket.status === 'queued' &&
          ticket.exclusive_resources.some((resource) => oldTicket.exclusive_resources.includes(resource)),
      ) &&
      successorLedger.next_sequence === priorLedger.next_sequence + 1 &&
      successorLedger.tickets.length === priorLedger.tickets.length + 1 &&
      successorLedger.claims.length === priorLedger.claims.length + 1 &&
      successorLedger.rebinds.length === priorLedger.rebinds.length + 1,
    'receipt does not preserve the full same-attempt Work, contract, authorization, lease, journal and coordination lineage',
  );
  return receipt;
}
