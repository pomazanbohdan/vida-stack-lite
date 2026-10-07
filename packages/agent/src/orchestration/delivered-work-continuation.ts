import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { HostStateSnapshot, StateVersion, WorkIdentity } from '../host-state.js';
import type { MaintenanceFence } from '../host-state.js';
import {
  parseSessionBridgeRequest,
  type SessionBridgeSnapshot,
  type SessionBridgeRequest,
} from './mastra-session-bridge.js';
import type { ScopedSourceSnapshot } from './scoped-source-snapshot.js';
import { compareScopedSourceSnapshots, type ScopedSourceChange } from './scoped-source-snapshot.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';

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
  readonly sourceTransition: ClosedConfigTransitionProof;
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
  for (const change of input.authorizedChanges) {
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
    changes.every((change) => {
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
        request.run_id === candidate.run_id &&
        request.scope_digest === candidate.source_scope_digest,
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
  requireContinuation(
    engine.status === 'suspended' &&
      engine.step_id !== null &&
      journal.run_id === engine.run_id &&
      journal.step_id === engine.step_id &&
      engine.requests.length === 1 &&
      digestPattern.test(targetConfigDigest) &&
      validScope(currentSourceScope),
    'configured continuation has no current suspended frontier',
  );
  const byAction = new Map(journal.items.map((item) => [item.request.action_id, item]));
  requireContinuation(
    engine.requests.every((request) => {
      const item = byAction.get(request.action_id);
      return (
        request.run_id === engine.run_id &&
        request.workflow_id === journal.items[0]?.request.workflow_id &&
        request.scope_digest === currentSourceScope.digest &&
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
  const transition = validateClosedConfigTransitionProof(request.sourceTransition);
  const action = validateDeliveredWorkContinuationAction(request.action);
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
      request.forwardOperationId === transition.operation_id &&
      request.parentManifestDigest === transition.transition.fence.binding.manifest_digest &&
      request.successorManifestDigest === transition.transition.fence.binding.bundle_digest &&
      transition.transition.target_config_digest === request.targetConfigDigest &&
      transition.baseline_config_digest === request.priorConfigDigest &&
      action.target_config_digest === request.targetConfigDigest &&
      action.source_scope_digest === request.currentSourceScope.digest &&
      (action.kind !== 'historical_terminal_review' ||
        action.original_request_pointer === request.originalRequestPointer) &&
      (action.kind !== 'configured_frontier' || action.request.config_digest === request.priorConfigDigest) &&
      canonicalJsonDigest(transition.transition.fence.binding.project_ids) ===
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
