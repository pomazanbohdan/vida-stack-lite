import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { assertLoadedRuntimeConfig, runtimeConfigDigest, type AgentRuntimeConfig, type WorkItemSelection } from '../config/runtime-config.js';
import type { HostStateSnapshot, StateVersion, WorkIdentity, WorkState } from '../host-state.js';
import type { MaintenanceFence } from '../host-state.js';
import type { CoordinationLedger } from '../contracts/envelopes.js';
import {
  parseSessionBridgeRequest,
  buildSessionBridgeRequest,
  configuredContextForStage,
  type SessionBridgeSnapshot,
  type SessionBridgeRequest,
} from './mastra-session-bridge.js';
import type { ScopedSourceSnapshot } from './scoped-source-snapshot.js';
import { compareScopedSourceSnapshots, type ScopedSourceChange } from './scoped-source-snapshot.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import { sessionActionsForWave, type SessionHandoffContext } from './session-handoff.js';
import { compileDevelopmentWorkflow, type WorkflowLifecycleRisk } from './workflow-plan.js';

export interface RuntimeConfigDeliveryTransition {
  readonly schema: 'RuntimeConfigDeliveryTransition/v1';
  readonly operation_path: string;
  readonly operation_sha256: string;
  readonly operation_plan_digest: string;
  readonly request_id: string;
  readonly request_digest: string;
  readonly report_digest: string;
  readonly source_snapshot_digest: string;
  readonly target_config_digest: string;
  readonly target_yaml_sha256: string;
  readonly receipt_path: string;
  readonly receipt_sha256: string;
  readonly fence: MaintenanceFence;
  readonly native_self_attestation_digest: string;
  readonly runtime_accepted: false;
}

/** Output from the Source-owned repair-transition inspection. It carries no Host rights. */
export interface ClosedConfigTransitionProof {
  readonly status: 'closed_config_transition_proven';
  readonly operation_id: string;
  readonly baseline_config_digest: string;
  readonly transition: RuntimeConfigDeliveryTransition;
  readonly transition_digest: string;
  readonly caller_owner_cas_required: true;
  readonly runtime_accepted: false;
  readonly writes_host_state: false;
}

/** Exact normal config operation and native endpoint references; never a delivery fence. */
export interface ConfiguredRuntimeEndpointTransition {
  readonly schema: 'ConfiguredRuntimeEndpointTransition/v1';
  readonly workspace_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly operation_path: string;
  readonly operation_sha256: string;
  readonly operation_plan_digest: string;
  readonly operation_release_digest: string;
  readonly target_config_digest: string;
  readonly target_schema_digest: string;
  readonly target_yaml_sha256: string;
  readonly receipt_path: string;
  readonly receipt_sha256: string;
  readonly prior_runtime_code_digest: string;
  readonly target_runtime_code_digest: string;
  readonly parent_manifest_digest: string;
  readonly successor_manifest_digest: string;
  readonly parent_manifest_ref: string;
  readonly successor_manifest_ref: string;
  readonly system_update_operation_id: string;
  readonly system_update_ref: string;
  readonly system_update_sha256: string;
  readonly source_correction_ref: string;
  readonly source_correction_sha256: string;
  readonly native_self_attestation_digest: string;
  readonly original_intake_ref: string;
  readonly original_intake_sha256: string;
  readonly runtime_accepted: false;
}

export interface ClosedConfigRebindProof extends Omit<ClosedConfigTransitionProof, 'status' | 'transition'> {
  readonly status: 'closed_config_rebind_proven';
  readonly transition: ConfiguredRuntimeEndpointTransition;
}

export type DeliveredContinuationProof = ClosedConfigTransitionProof | ClosedConfigRebindProof;

export interface ConfiguredFrontierContinuationAction {
  readonly schema: 'DeliveredWorkContinuationAction/v1';
  readonly kind: 'configured_frontier';
  readonly workflow_id: string;
  readonly run_id: string;
  readonly step_id: string;
  readonly engine_snapshot_digest: string;
  readonly source_scope_digest: string;
  readonly target_config_digest: string;
  readonly request: SessionBridgeRequest;
}

/** A historical result is reviewed from its retained Host receipt; its old issue is never replayed. */
export interface HistoricalTerminalReviewAction {
  readonly schema: 'DeliveredWorkContinuationAction/v1';
  readonly kind: 'historical_terminal_review';
  readonly workflow_id: string;
  readonly source_scope_digest: string;
  readonly target_config_digest: string;
  readonly capture: {
    readonly action_id: string;
    readonly issue_id: string;
    readonly receipt_digest: string;
    readonly body_sha256: string;
    readonly body_ref: string;
  };
  readonly original_request_pointer: string;
  /** A current-config Core review request. It is a new action and never replays synthesis. */
  readonly request: SessionBridgeRequest;
}

export type DeliveredWorkContinuationAction =
  | ConfiguredFrontierContinuationAction
  | HistoricalTerminalReviewAction;

/** The exact finite continuation offer accepted by HostState. */
export interface DeliveredWorkContinuationRequest {
  readonly schema: 'DeliveredWorkContinuationRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly nativeSessionHandle: string;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
  readonly priorConfigDigest: string;
  readonly targetConfigDigest: string;
  readonly targetSchemaDigest: string;
  readonly targetProjectContextDigest: string;
  readonly priorRuntimeCodeDigest: string;
  readonly targetRuntimeCodeDigest: string;
  readonly forwardOperationId: string;
  readonly parentManifestDigest: string;
  readonly successorManifestDigest: string;
  /** Explicit current snapshot of the original accepted scope; no digest-only fallback is valid. */
  readonly currentSourceScope: ScopedSourceSnapshot;
  /** Exact before/after entries authorized by the accepted Source transition. */
  readonly authorizedSourceChanges: readonly ScopedSourceChange[];
  readonly sourceTransition: DeliveredContinuationProof;
  readonly action: DeliveredWorkContinuationAction;
  readonly originalRequestPointer: string;
}

export interface DeliveredWorkContinuationAuthorization {
  readonly schema: 'VidaDeliveredWorkContinuationAuthorization/v1';
  readonly request_digest: string;
  readonly principal: string;
  readonly transition_digest: string;
  readonly action_digest: string;
}

export interface DeliveredWorkContinuationVerifier {
  readonly principal: string;
  readonly verify: (
    request: DeliveredWorkContinuationRequest,
    state: HostStateSnapshot,
  ) => DeliveredWorkContinuationAuthorization | null | Promise<DeliveredWorkContinuationAuthorization | null>;
}

const digestPattern = /^[a-f0-9]{64}$/;
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const pathPattern = /^[^\\\0\r\n]+$/;

function requireContinuation(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`delivered work continuation: ${message}`);
}

/** Current CAS is independent from the recorded original owner disposition. */
export function validateConfiguredFrontierOwnerRelease(input: {
  readonly work: WorkState;
  readonly ledger: CoordinationLedger;
  readonly identity: WorkIdentity;
  readonly nativeSessionHandle: string;
}) {
  const { work, ledger, identity, nativeSessionHandle } = input,
    resources = [`execution:${identity.work_id}`, ...work.binding.implementation_paths.map(path => `file:${path}`)].sort(),
    candidates = ledger.tickets.filter(ticket => ticket.work_id === identity.work_id && ticket.thread_id === nativeSessionHandle &&
      ticket.source_revision === work.binding.work_source_revision).sort((left, right) => right.sequence - left.sequence),
    ticket = candidates[0],
    claims = ticket ? ledger.claims.filter(claim => claim.ticket_id === ticket.ticket_id) : [],
    releases = ticket ? ledger.operations.filter(operation => operation.ticket_id === ticket.ticket_id && operation.kind === 'release') : [],
    release = releases[0];
  const same = (left: unknown, right: unknown) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
  requireContinuation(ticket && release && candidates.filter(entry => entry.sequence === ticket.sequence).length === 1 &&
    resources.length === new Set(resources).size && resources.every(resource => work.binding.allowed_resources.includes(resource)) &&
    ticket.schema === 'CoordinationTicket/v1' && ticket.status === 'released' && ticket.repository_id === identity.repository_id && same(ticket.project_ids, identity.project_ids) &&
    ticket.integrations_digest === identity.integrations_digest && ticket.expires_at === null && ticket.active_resources.length === 0 &&
    ticket.blocked_resources.length === 0 && same(ticket.exclusive_resources, resources) &&
    claims.length === 1 && ticket.claim_ids.length === 1 && ticket.claim_ids[0] === claims[0]!.claim_id &&
    claims[0]!.schema === 'WorkstreamClaim/v1' && claims[0]!.status === 'released' && claims[0]!.generation === ticket.generation &&
    claims[0]!.work_id === identity.work_id && claims[0]!.thread_id === nativeSessionHandle && same(claims[0]!.resources, resources) &&
    releases.length === 1 && release.schema === 'CoordinationOperation/v1' &&
    typeof release.decided_by === 'string' && release.decided_by.trim().length > 0 &&
    typeof release.created_at === 'string' && Number.isFinite(Date.parse(release.created_at)) && release.work_id === identity.work_id && release.thread_id === nativeSessionHandle &&
    release.source_revision === work.binding.work_source_revision && Array.isArray(release.resources) && same(release.resources, resources) &&
    typeof release.decision_pointer === 'string' && release.decision_pointer.trim().length > 0 &&
    typeof release.from_ledger_revision === 'number' && Number.isSafeInteger(release.from_ledger_revision) && release.from_ledger_revision >= 1 &&
    typeof release.to_ledger_revision === 'number' && Number.isSafeInteger(release.to_ledger_revision) &&
    release.to_ledger_revision === release.from_ledger_revision + 1 && release.to_ledger_revision <= ledger.revision &&
    !ledger.operations.some(operation => operation.ticket_id === ticket.ticket_id &&
      (typeof operation.to_ledger_revision !== 'number' || operation.to_ledger_revision > (release.to_ledger_revision as number))) &&
    !ledger.tickets.some(other => other.ticket_id !== ticket.ticket_id &&
      ['active', 'queued', 'ready_for_handoff', 'blocked'].includes(other.status) &&
      other.exclusive_resources.some(resource => resources.includes(resource))),
  'configured frontier original release, resources or FIFO changed');
  return { ticket, claim: claims[0]!, release, resources };
}

/** Scope maintenance is not a grant: implementation, documentation and evidence stay distinct. */
export function validateContinuationSourceChangePaths(work: WorkState, changes: readonly ScopedSourceChange[]): void {
  const allowed = new Set(work.lifecycle.scope.allowed_paths),
    implementation = work.binding.implementation_paths,
    documentation = work.lifecycle.scope.documentation_paths ?? [];
  requireContinuation(implementation.every(relative => allowed.has(relative)) && documentation.every(relative => allowed.has(relative)),
    'continuation mutation paths differ from the accepted scope');
  const maintained = new Set([...implementation, ...documentation]);
  requireContinuation(changes.every(change => maintained.has(change.path)),
    'continuation Source changes are outside accepted implementation or documentation paths');
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

function validScope(value: unknown): value is ScopedSourceSnapshot {
  if (!exactKeys(value, ['schema', 'entries', 'digest'])) return false;
  const scope = value as unknown as ScopedSourceSnapshot;
  return (
    scope.schema === 'ScopedSourceSnapshot/v1' &&
    digestPattern.test(scope.digest) &&
    Array.isArray(scope.entries) &&
    scope.entries.length > 0 &&
    scope.entries.every(
      (entry, index) =>
        exactKeys(entry, ['path', 'exists', 'bytes', 'sha256']) &&
        typeof entry.path === 'string' &&
        pathPattern.test(entry.path) &&
        !entry.path.startsWith('/') &&
        !/^[A-Za-z]:/.test(entry.path) &&
        entry.path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..') &&
        (index === 0 || scope.entries[index - 1]!.path < entry.path) &&
        typeof entry.exists === 'boolean' &&
        (entry.exists
          ? Number.isSafeInteger(entry.bytes) && (entry.bytes as number) >= 0 && typeof entry.sha256 === 'string' && digestPattern.test(entry.sha256)
          : entry.bytes === null && entry.sha256 === null),
    ) &&
    scope.digest === canonicalJsonDigest({ schema: scope.schema, entries: scope.entries })
  );
}

/**
 * Bridge an original task scope to the exact current bytes only when every
 * changed entry is present in the accepted Source transition's before/after
 * change set. Unchanged entries must remain byte-identical. This carries no
 * Source or Runtime rights; HostState still performs the owner/CAS transition.
 */
export function validateCurrentSourceScopeBridge(input: {
  readonly original: ScopedSourceSnapshot;
  readonly current: ScopedSourceSnapshot;
  readonly authorizedChanges: readonly ScopedSourceChange[];
}): ScopedSourceSnapshot {
  requireContinuation(
    validScope(input.original) && validScope(input.current) && Array.isArray(input.authorizedChanges),
    'original, current or authorized Source scope is invalid',
  );
  const authorized = new Map<string, ScopedSourceChange>();
  for (const change of input.authorizedChanges as readonly ScopedSourceChange[]) {
    requireContinuation(
      exactKeys(change, ['path', 'kind', 'before', 'after']) &&
        typeof change.path === 'string' &&
        pathPattern.test(change.path) &&
        !change.path.startsWith('/') &&
        !/^[A-Za-z]:/.test(change.path) &&
        change.path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..') &&
        ['changed', 'appeared', 'disappeared'].includes(change.kind) &&
        exactKeys(change.before, ['path', 'exists', 'bytes', 'sha256']) &&
        exactKeys(change.after, ['path', 'exists', 'bytes', 'sha256']) &&
        change.before.path === change.path &&
        change.after.path === change.path &&
        (change.before.exists
          ? Number.isSafeInteger(change.before.bytes) &&
            (change.before.bytes as number) >= 0 &&
            typeof change.before.sha256 === 'string' &&
            digestPattern.test(change.before.sha256)
          : change.before.bytes === null && change.before.sha256 === null) &&
        (change.after.exists
          ? Number.isSafeInteger(change.after.bytes) &&
            (change.after.bytes as number) >= 0 &&
            typeof change.after.sha256 === 'string' &&
            digestPattern.test(change.after.sha256)
          : change.after.bytes === null && change.after.sha256 === null) &&
        (change.kind === 'appeared'
          ? !change.before.exists && change.after.exists
          : change.kind === 'disappeared'
            ? change.before.exists && !change.after.exists
            : change.before.exists &&
              change.after.exists &&
              (change.before.bytes !== change.after.bytes || change.before.sha256 !== change.after.sha256)) &&
        !authorized.has(change.path),
      'authorized Source change is invalid or duplicated',
    );
    authorized.set(change.path, change);
  }
  const changes = compareScopedSourceSnapshots(input.original, input.current);
  requireContinuation(
    authorized.size === changes.length && changes.every((change) => {
      const authorizedChange = authorized.get(change.path);
      return authorizedChange !== undefined && canonicalJsonDigest(authorizedChange) === canonicalJsonDigest(change);
    }),
    'current task Source changed outside the accepted beforeimage bridge',
  );
  return input.current;
}

function validateTransition(value: unknown): RuntimeConfigDeliveryTransition {
  const keys = [
    'schema',
    'operation_path',
    'operation_sha256',
    'operation_plan_digest',
    'request_id',
    'request_digest',
    'report_digest',
    'source_snapshot_digest',
    'target_config_digest',
    'target_yaml_sha256',
    'receipt_path',
    'receipt_sha256',
    'fence',
    'native_self_attestation_digest',
    'runtime_accepted',
  ];
  requireContinuation(exactKeys(value, keys), 'closed Source transition fields are invalid');
  const transition = value as unknown as RuntimeConfigDeliveryTransition;
  requireContinuation(
    transition.schema === 'RuntimeConfigDeliveryTransition/v1' &&
      [
        transition.operation_sha256,
        transition.operation_plan_digest,
        transition.request_digest,
        transition.report_digest,
        transition.source_snapshot_digest,
        transition.target_config_digest,
        transition.target_yaml_sha256,
        transition.receipt_sha256,
        transition.native_self_attestation_digest,
      ].every((entry) => typeof entry === 'string' && digestPattern.test(entry)) &&
      typeof transition.operation_path === 'string' &&
      pathPattern.test(transition.operation_path) &&
      typeof transition.receipt_path === 'string' &&
      pathPattern.test(transition.receipt_path) &&
      typeof transition.request_id === 'string' &&
      identifierPattern.test(transition.request_id) &&
      exactKeys(transition.fence, [
        'schema',
        'workspace_id',
        'revision',
        'generation',
        'status',
        'binding',
        'token_digest',
      ]) &&
      exactKeys(transition.fence.binding, [
        'schema',
        'project_ids',
        'operation_id',
        'manifest_digest',
        'request_digest',
        'bindings_digest',
        'closure_digest',
        'bundle_digest',
      ]) &&
      transition.fence.schema === 'MaintenanceFence/v1' &&
      transition.fence.status === 'released' &&
      Number.isSafeInteger(transition.fence.generation) &&
      transition.fence.generation > 0 &&
      typeof transition.fence.token_digest === 'string' &&
      digestPattern.test(transition.fence.token_digest) &&
      transition.runtime_accepted === false,
    'closed Source transition binding is invalid',
  );
  return transition;
}

export function validateClosedConfigTransitionProof(value: unknown): ClosedConfigTransitionProof {
  const keys = [
    'status',
    'operation_id',
    'baseline_config_digest',
    'transition',
    'transition_digest',
    'caller_owner_cas_required',
    'runtime_accepted',
    'writes_host_state',
  ];
  requireContinuation(exactKeys(value, keys), 'Source transition proof fields are invalid');
  const proof = value as unknown as ClosedConfigTransitionProof;
  const transition = validateTransition(proof.transition);
  requireContinuation(
      proof.status === 'closed_config_transition_proven' &&
      typeof proof.operation_id === 'string' &&
      identifierPattern.test(proof.operation_id) &&
      proof.operation_id === transition.fence.binding.operation_id &&
      digestPattern.test(proof.baseline_config_digest) &&
      digestPattern.test(proof.transition_digest) &&
      proof.transition_digest === canonicalJsonDigest(transition) &&
      proof.caller_owner_cas_required === true &&
      proof.runtime_accepted === false &&
      proof.writes_host_state === false,
    'Source transition proof is not a closed current transition',
  );
  return proof;
}

export function validateClosedConfigRebindProof(value: unknown): ClosedConfigRebindProof {
  requireContinuation(exactKeys(value, ['status', 'operation_id', 'baseline_config_digest', 'transition',
    'transition_digest', 'caller_owner_cas_required', 'runtime_accepted', 'writes_host_state']),
  'normal config proof fields are invalid');
  const proof = value as unknown as ClosedConfigRebindProof;
  const transition = proof.transition;
  const hashes = ['operation_sha256', 'operation_plan_digest', 'operation_release_digest', 'target_config_digest', 'target_schema_digest',
    'target_yaml_sha256', 'receipt_sha256', 'prior_runtime_code_digest', 'target_runtime_code_digest',
    'parent_manifest_digest', 'successor_manifest_digest', 'system_update_sha256', 'source_correction_sha256',
    'native_self_attestation_digest', 'original_intake_sha256'] as const;
  const refs = ['operation_path', 'receipt_path', 'parent_manifest_ref', 'successor_manifest_ref',
    'system_update_ref', 'source_correction_ref', 'original_intake_ref'] as const;
  requireContinuation(exactKeys(transition, ['schema', 'workspace_id', 'repository_id', 'project_ids',
    'system_update_operation_id', 'runtime_accepted', ...hashes, ...refs]), 'normal config transition fields are invalid');
  requireContinuation(proof.status === 'closed_config_rebind_proven' &&
    typeof proof.operation_id === 'string' && identifierPattern.test(proof.operation_id) &&
    typeof proof.baseline_config_digest === 'string' && digestPattern.test(proof.baseline_config_digest) &&
    typeof proof.transition_digest === 'string' && digestPattern.test(proof.transition_digest) &&
    proof.transition_digest === canonicalJsonDigest(transition) &&
    proof.caller_owner_cas_required === true && proof.runtime_accepted === false && proof.writes_host_state === false &&
    transition.schema === 'ConfiguredRuntimeEndpointTransition/v1' &&
    typeof transition.workspace_id === 'string' && digestPattern.test(transition.workspace_id) &&
    typeof transition.repository_id === 'string' && identifierPattern.test(transition.repository_id) &&
    Array.isArray(transition.project_ids) && transition.project_ids.length > 0 && transition.project_ids.length <= 64 &&
    transition.project_ids.every((id, index) => typeof id === 'string' && identifierPattern.test(id) &&
      (index === 0 || transition.project_ids[index - 1]! < id)) &&
    typeof transition.system_update_operation_id === 'string' && identifierPattern.test(transition.system_update_operation_id) &&
    transition.system_update_operation_id !== proof.operation_id && transition.runtime_accepted === false &&
    hashes.every(key => typeof transition[key] === 'string' && digestPattern.test(transition[key])) &&
    refs.every(key => typeof transition[key] === 'string' && transition[key].length <= 512 &&
      pathPattern.test(transition[key]) && !transition[key].startsWith('/') && !/^[A-Za-z]:/.test(transition[key]) &&
      !/\p{Cc}/u.test(transition[key]) && transition[key].split('/').every(part => part.length > 0 && part !== '.' && part !== '..')) &&
    transition.operation_path.endsWith(`/${proof.operation_id}/runtime-config-rebind-operation.v1.json`) &&
    transition.prior_runtime_code_digest !== transition.target_runtime_code_digest &&
    proof.baseline_config_digest !== transition.target_config_digest,
  'normal config operation or runtime endpoints are invalid');
  return proof;
}

/** Read only validated proof bindings. Normal config and native update identities stay separate. */
export function deliveredContinuationProofBinding(proof: DeliveredContinuationProof) {
  if (proof.status === 'closed_config_rebind_proven') return {
    workspace_id: proof.transition.workspace_id,
    project_ids: proof.transition.project_ids,
    forward_operation_id: proof.transition.system_update_operation_id,
    parent_manifest_digest: proof.transition.parent_manifest_digest,
    successor_manifest_digest: proof.transition.successor_manifest_digest,
    maintenance_generation: undefined,
  };
  return {
    workspace_id: proof.transition.fence.workspace_id,
    project_ids: proof.transition.fence.binding.project_ids,
    forward_operation_id: proof.operation_id,
    parent_manifest_digest: proof.transition.fence.binding.manifest_digest,
    successor_manifest_digest: proof.transition.fence.binding.bundle_digest,
    maintenance_generation: proof.transition.fence.generation,
  };
}

export function validateDeliveredWorkContinuationAction(value: unknown): DeliveredWorkContinuationAction {
  requireContinuation(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'next action must be an object',
  );
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === 'configured_frontier') {
    requireContinuation(
      exactKeys(candidate, [
        'schema',
        'kind',
        'workflow_id',
        'run_id',
        'step_id',
        'engine_snapshot_digest',
        'source_scope_digest',
        'target_config_digest',
        'request',
      ]),
      'configured frontier action fields are invalid',
    );
    const request = parseSessionBridgeRequest(candidate.request);
    requireContinuation(
      candidate.schema === 'DeliveredWorkContinuationAction/v1' &&
        typeof candidate.workflow_id === 'string' &&
        typeof candidate.run_id === 'string' &&
        typeof candidate.step_id === 'string' &&
        digestPattern.test(candidate.engine_snapshot_digest as string) &&
        digestPattern.test(candidate.source_scope_digest as string) &&
        digestPattern.test(candidate.target_config_digest as string) &&
        request.workflow_id === candidate.workflow_id &&
        request.run_id === candidate.run_id,
      'configured frontier action binding is invalid',
    );
    return { ...candidate, request } as unknown as ConfiguredFrontierContinuationAction;
  }
  requireContinuation(candidate.kind === 'historical_terminal_review', 'next action kind is unsupported');
  requireContinuation(
    exactKeys(candidate, [
      'schema',
      'kind',
      'workflow_id',
      'source_scope_digest',
      'target_config_digest',
      'capture',
      'original_request_pointer',
      'request',
    ]),
    'historical review action fields are invalid',
  );
  const capture = candidate.capture as Record<string, unknown>;
  const request = parseSessionBridgeRequest(candidate.request);
  requireContinuation(
    candidate.schema === 'DeliveredWorkContinuationAction/v1' &&
      typeof candidate.workflow_id === 'string' &&
      digestPattern.test(candidate.source_scope_digest as string) &&
      digestPattern.test(candidate.target_config_digest as string) &&
      exactKeys(capture, ['action_id', 'issue_id', 'receipt_digest', 'body_sha256', 'body_ref']) &&
      typeof capture.action_id === 'string' &&
      digestPattern.test(capture.action_id) &&
      typeof capture.issue_id === 'string' &&
      capture.issue_id.length > 0 &&
      digestPattern.test(capture.receipt_digest as string) &&
      digestPattern.test(capture.body_sha256 as string) &&
      typeof capture.body_ref === 'string' &&
      pathPattern.test(capture.body_ref) &&
      !capture.body_ref.startsWith('/') &&
      !/^[A-Za-z]:/.test(capture.body_ref) &&
      capture.body_ref.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..') &&
      typeof candidate.original_request_pointer === 'string' &&
      candidate.original_request_pointer.length > 0 &&
      candidate.original_request_pointer.length <= 2048 &&
      candidate.original_request_pointer.trim() === candidate.original_request_pointer &&
      !/\p{Cc}/u.test(candidate.original_request_pointer) &&
      request.workflow_id === candidate.workflow_id &&
      request.config_digest === candidate.target_config_digest &&
      request.scope_digest === candidate.source_scope_digest &&
      request.stage_id === 'validate_parallel' &&
      request.assignment_index === 0 &&
      request.role === 'correctness-validator' &&
      request.corrective_execution === undefined,
    'historical terminal review action binding is invalid',
  );
  return { ...candidate, request } as unknown as HistoricalTerminalReviewAction;
}

/** Project an actually persisted, wholly unissued Mastra frontier without advancing its engine. */
export function projectConfiguredFrontierContinuationAction(input: {
  readonly engine: SessionBridgeSnapshot;
  readonly journal: MastraSessionLedgerState;
  readonly targetConfigDigest: string;
  readonly currentSourceScope: ScopedSourceSnapshot;
}): ConfiguredFrontierContinuationAction {
  const { engine, journal, targetConfigDigest, currentSourceScope } = input;
  const priorScope = journal.source_scope ?? currentSourceScope;
  requireContinuation(
    engine.status === 'suspended' &&
      engine.step_id !== null &&
      journal.run_id === engine.run_id &&
      journal.step_id === engine.step_id &&
      engine.requests.length === 1 &&
      digestPattern.test(targetConfigDigest) &&
      validScope(currentSourceScope) && validScope(priorScope),
    'configured continuation has no current suspended frontier',
  );
  const byAction = new Map(journal.items.map((item) => [item.request.action_id, item]));
  requireContinuation(
    engine.requests.every((request) => {
      const item = byAction.get(request.action_id);
      return (
        request.run_id === engine.run_id &&
        request.workflow_id === journal.items[0]?.request.workflow_id &&
        request.scope_digest === priorScope.digest &&
        item !== undefined &&
        item.issue_id === null &&
        item.observation === null &&
        !item.host_reservation &&
        !item.research_activation &&
        !item.research_normalization &&
        canonicalJsonDigest(item.request) === canonicalJsonDigest(request)
      );
    }),
    'configured frontier is already issued, observed, foreign or changed',
  );
  requireContinuation(
    journal.items.length === 1 &&
      engine.requests.length === journal.items.length &&
      new Set(engine.requests.map((request) => request.action_id)).size === engine.requests.length,
    'configured frontier is not one exact unissued journal action',
  );
  return validateDeliveredWorkContinuationAction({
    schema: 'DeliveredWorkContinuationAction/v1',
    kind: 'configured_frontier',
    workflow_id: engine.requests[0]!.workflow_id,
    run_id: engine.run_id,
    step_id: engine.step_id,
    engine_snapshot_digest: canonicalJsonDigest(engine),
    source_scope_digest: currentSourceScope.digest,
    target_config_digest: targetConfigDigest,
    request: engine.requests[0]!,
  }) as ConfiguredFrontierContinuationAction;
}

/** Derive read-only current reviewers; the retained developer frontier is never issued or completed here. */
export function projectConfiguredPrewriterContinuationRequests(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly selection: WorkItemSelection;
  readonly context: SessionHandoffContext;
  readonly workflowId: string;
  readonly engine: SessionBridgeSnapshot;
  readonly journal: MastraSessionLedgerState;
  readonly currentSourceScope: ScopedSourceSnapshot;
  readonly lifecycleRisk?: WorkflowLifecycleRisk;
}): readonly SessionBridgeRequest[] {
  const { repositoryRoot, config, selection, context, workflowId, engine, journal, currentSourceScope } = input;
  assertLoadedRuntimeConfig(config, repositoryRoot);
  requireContinuation(
    validScope(currentSourceScope) && validScope(journal.source_scope) &&
      context.work_id === journal.work_id && context.attempt === journal.attempt &&
      context.scope_digest === currentSourceScope.digest &&
      journal.corrective_execution == null && journal.research_wave_exposure === undefined,
    'current prewriter context or original journal differs',
  );
  const frontier = projectConfiguredFrontierContinuationAction({
    engine, journal, targetConfigDigest: runtimeConfigDigest(config), currentSourceScope,
  });
  const step = /^wave-(0|[1-9][0-9]*)$/.exec(frontier.step_id);
  const waveIndex = step ? Number(step[1]) : -1;
  const plan = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags, input.lifecycleRisk);
  const wave = plan.waves[waveIndex];
  const developer = plan.waves[waveIndex + 1]?.find(stage => stage.kind === 'develop');
  requireContinuation(
    frontier.workflow_id === workflowId && developer?.id === frontier.request.stage_id &&
      frontier.request.role === 'developer-orchestrator' &&
      frontier.request.wave_index === waveIndex && Number.isSafeInteger(waveIndex) &&
      wave?.length === 1 && wave[0]!.id === 'review_source_prewrite' && wave[0]!.kind !== 'develop',
    'current prewriter does not replace the exact unissued developer wave',
  );
  const priorObservations = journal.completed.flatMap(entry => entry.items.map(item => item.observation));
  requireContinuation(
    journal.completed.length === waveIndex &&
      journal.completed.every((entry, index) => {
        const actions = sessionActionsForWave(config, selection, context, workflowId, index, [], undefined, input.lifecycleRisk);
        return entry.step_id === 'wave-' + index && entry.items.length === actions.length &&
          new Set(entry.items.map(item => canonicalJsonDigest({ stage: item.request.stage_id, role: item.request.role, index: item.request.assignment_index }))).size === actions.length &&
          entry.items.every(item => item.issue_id !== null && item.observation?.status === 'reported_complete' &&
            item.observation.action_id === item.request.action_id && item.observation.issue_id === item.issue_id &&
            item.observation.output_digest === canonicalJsonDigest(item.observation.summary) &&
            item.request.run_id === engine.run_id && item.request.workflow_id === workflowId &&
            item.request.config_digest === frontier.request.config_digest && item.request.wave_index === index &&
            item.request.scope_digest === journal.source_scope!.digest &&
            actions.some(action => action.stage_id === item.request.stage_id && action.role === item.request.role &&
              action.assignment_index === item.request.assignment_index)) &&
          new Set(entry.items.map(item => item.request.action_id)).size === actions.length;
      }) && new Set(engine.observations.map(observation => observation.action_id)).size === engine.observations.length &&
      canonicalJsonDigest(priorObservations) === canonicalJsonDigest(engine.observations),
    'current prewriter completed prefix differs',
  );
  const actions = sessionActionsForWave(config, selection, context, workflowId, waveIndex, [], undefined, input.lifecycleRisk);
  requireContinuation(actions.length > 0 && actions.every(action =>
    action.stage_id === 'review_source_prewrite' && !action.resolved_profile.tools_policy.source_write),
  'current prewriter assignments are missing or permit Source writes');
  return actions.map(action => buildSessionBridgeRequest({
    runId: engine.run_id, workflowId, configDigest: runtimeConfigDigest(config), context, waveIndex, action,
    configuredContext: configuredContextForStage(repositoryRoot, config, workflowId, action.stage_id, context),
    priorResults: engine.observations,
  }));
}

/** Construct the one permitted first action for a retained known-terminal synthesis body. */
export function projectHistoricalTerminalReviewAction(input: {
  readonly workflowId: string;
  readonly sourceScopeDigest: string;
  readonly targetConfigDigest: string;
  readonly capture: HistoricalTerminalReviewAction['capture'];
  readonly originalRequestPointer: string;
  readonly request: SessionBridgeRequest;
}): HistoricalTerminalReviewAction {
  return validateDeliveredWorkContinuationAction({
    schema: 'DeliveredWorkContinuationAction/v1',
    kind: 'historical_terminal_review',
    workflow_id: input.workflowId,
    source_scope_digest: input.sourceScopeDigest,
    target_config_digest: input.targetConfigDigest,
    capture: input.capture,
    original_request_pointer: input.originalRequestPointer,
    request: input.request,
  }) as HistoricalTerminalReviewAction;
}

export function validateDeliveredWorkContinuationRequest(value: unknown): DeliveredWorkContinuationRequest {
  const keys = [
    'schema',
    'identity',
    'attempt',
    'nativeSessionHandle',
    'expectedWork',
    'expectedLedger',
    'expectedJournal',
    'expectedMaintenanceGeneration',
    'priorConfigDigest',
    'targetConfigDigest',
    'targetSchemaDigest',
    'targetProjectContextDigest',
    'priorRuntimeCodeDigest',
    'targetRuntimeCodeDigest',
    'forwardOperationId',
    'parentManifestDigest',
    'successorManifestDigest',
    'currentSourceScope',
    'authorizedSourceChanges',
    'sourceTransition',
    'action',
    'originalRequestPointer',
  ];
  requireContinuation(exactKeys(value, keys), 'continuation request fields are invalid');
  const request = value as unknown as DeliveredWorkContinuationRequest;
  const transition = request.sourceTransition?.status === 'closed_config_rebind_proven'
    ? validateClosedConfigRebindProof(request.sourceTransition)
    : validateClosedConfigTransitionProof(request.sourceTransition);
  const action = validateDeliveredWorkContinuationAction(request.action);
  const proofBinding = deliveredContinuationProofBinding(transition);
  requireContinuation(transition.status !== 'closed_config_rebind_proven' ||
    (action.kind === 'configured_frontier' && transition.transition.repository_id === request.identity?.repository_id &&
      transition.transition.prior_runtime_code_digest === request.priorRuntimeCodeDigest &&
      transition.transition.target_runtime_code_digest === request.targetRuntimeCodeDigest &&
      transition.transition.target_schema_digest === request.targetSchemaDigest),
  'normal config proof is not bound to the configured frontier and exact runtime endpoints');
  const identity = request.identity;
  requireContinuation(
    request.schema === 'DeliveredWorkContinuationRequest/v1' &&
      identity !== null &&
      typeof identity === 'object' &&
      exactKeys(identity, ['repository_id', 'project_ids', 'integrations_digest', 'work_id']) &&
      typeof identity.repository_id === 'string' &&
      identity.repository_id.length > 0 &&
      Array.isArray(identity.project_ids) &&
      identity.project_ids.length > 0 &&
      identity.project_ids.every(
        (project, index) =>
          typeof project === 'string' &&
          project.length > 0 &&
          (index === 0 || identity.project_ids[index - 1]! < project),
      ) &&
      typeof identity.integrations_digest === 'string' &&
      digestPattern.test(identity.integrations_digest) &&
      typeof identity.work_id === 'string' &&
      identity.work_id.length > 0 &&
      Number.isSafeInteger(request.attempt) &&
      request.attempt > 0 &&
      typeof request.nativeSessionHandle === 'string' &&
      request.nativeSessionHandle.length > 0 &&
      request.nativeSessionHandle.length <= 256 &&
      request.nativeSessionHandle.trim() === request.nativeSessionHandle &&
      !/\p{Cc}/u.test(request.nativeSessionHandle) &&
      validVersion(request.expectedWork) &&
      validVersion(request.expectedLedger) &&
      validVersion(request.expectedJournal) &&
      Number.isSafeInteger(request.expectedMaintenanceGeneration) &&
      request.expectedMaintenanceGeneration >= 0 &&
      [
        request.priorConfigDigest,
        request.targetConfigDigest,
        request.targetSchemaDigest,
        request.targetProjectContextDigest,
        request.priorRuntimeCodeDigest,
        request.targetRuntimeCodeDigest,
        request.parentManifestDigest,
        request.successorManifestDigest,
      ].every((entry) => typeof entry === 'string' && digestPattern.test(entry)) &&
      request.priorConfigDigest !== request.targetConfigDigest &&
      request.priorRuntimeCodeDigest !== request.targetRuntimeCodeDigest &&
      typeof request.forwardOperationId === 'string' &&
      request.forwardOperationId.length > 0 &&
      request.forwardOperationId.length <= 512 &&
      !/\p{Cc}/u.test(request.forwardOperationId) &&
      validScope(request.currentSourceScope) &&
      Array.isArray(request.authorizedSourceChanges) &&
      transition.operation_id.length > 0 &&
      request.forwardOperationId === proofBinding.forward_operation_id &&
      request.parentManifestDigest === proofBinding.parent_manifest_digest &&
      request.successorManifestDigest === proofBinding.successor_manifest_digest &&
      transition.transition.target_config_digest === request.targetConfigDigest &&
      transition.baseline_config_digest === request.priorConfigDigest &&
      action.target_config_digest === request.targetConfigDigest &&
      action.source_scope_digest === request.currentSourceScope.digest &&
      (action.kind !== 'historical_terminal_review' ||
        action.original_request_pointer === request.originalRequestPointer) &&
      (action.kind !== 'configured_frontier' || action.request.config_digest === request.priorConfigDigest) &&
      canonicalJsonDigest(proofBinding.project_ids) ===
        canonicalJsonDigest(identity.project_ids) &&
      action.workflow_id.length > 0 &&
      typeof request.originalRequestPointer === 'string' &&
      request.originalRequestPointer.length > 0 &&
      request.originalRequestPointer.length <= 2048 &&
      request.originalRequestPointer.trim() === request.originalRequestPointer &&
      !/\p{Cc}/u.test(request.originalRequestPointer),
    'continuation request identity, scope, transition or action binding is invalid',
  );
  return { ...request, action, sourceTransition: transition };
}

export function validateDeliveredWorkContinuationAuthorization(
  value: unknown,
  request: DeliveredWorkContinuationRequest,
  principal: string,
): DeliveredWorkContinuationAuthorization {
  requireContinuation(
    exactKeys(value, ['schema', 'request_digest', 'principal', 'transition_digest', 'action_digest']),
    'continuation authorization fields are invalid',
  );
  const authorization = value as unknown as DeliveredWorkContinuationAuthorization;
  requireContinuation(
    authorization.schema === 'VidaDeliveredWorkContinuationAuthorization/v1' &&
      authorization.principal === principal &&
      digestPattern.test(authorization.request_digest) &&
      authorization.request_digest === canonicalJsonDigest(request) &&
      authorization.transition_digest === request.sourceTransition.transition_digest &&
      authorization.action_digest === canonicalJsonDigest(request.action),
    'continuation authorization differs from its request',
  );
  return authorization;
}
