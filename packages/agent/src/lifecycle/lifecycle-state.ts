import { assertCanonicalJsonValue, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import { safeWorkflowOwnedPath } from '../runtime-kernel.js';
import { verifyDocumentationClearReference } from '../documentation/clear.js';

export type LifecyclePhase = 'INTAKE' | 'TRACE' | 'PLAN' | 'EXECUTE' | 'VERIFY' | 'DELIVERY' | 'COMPLETE';
export type LifecycleArtifactKind =
  | 'source_plan'
  | 'acceptance_manifest'
  | 'implementation_scope'
  | 'scope_snapshot'
  | 'execution_approval'
  | 'platform_knowledge'
  | 'implementation_policy'
  | 'change_impact_pre'
  | 'change_impact_post'
  | 'documentation_validation'
  | 'documentation_clear'
  | 'implementation_result'
  | 'validation_receipt'
  | 'test_receipt'
  | 'review_packet'
  | 'review_receipt'
  | 'reverse_validation'
  | 'dispatch_reservation'
  | 'dispatch_attestation'
  | 'architect_decision'
  | 'delivery_manifest'
  | 'delivery_receipt'
  | 'runtime_receipt'
  | 'user_testing_receipt'
  | 'feedback'
  | 'feedback_consumption'
  | 'correction_authorization'
  | 'decision'
  | 'recovery';
export type LifecycleArtifactDisposition = 'current' | 'consumed' | 'retired';
export type LifecycleArtifactDecision = 'pass' | 'fail' | 'approved' | 'accepted' | 'feedback' | 'rejected' | 'unknown';

export interface LifecycleArtifactReference {
  readonly schema: 'LifecycleArtifactReference/v1';
  readonly kind: LifecycleArtifactKind;
  readonly artifact_schema: string;
  readonly record_id: string;
  readonly path: string;
  readonly sha256: string;
  readonly source_revision: string;
  readonly scope_id: string;
  readonly ac_ids: readonly string[];
  readonly generation: number | null;
  readonly implementation_fingerprint: string | null;
  readonly delivery_cycle_id: string | null;
  readonly principal: string | null;
  readonly decision: LifecycleArtifactDecision | null;
  readonly disposition: LifecycleArtifactDisposition;
}

export interface LifecycleState {
  readonly schema: 'LifecycleState/v1';
  readonly revision: number;
  readonly phase: LifecyclePhase;
  readonly source_revision: string;
  readonly next_action: string;
  readonly route: 'R1' | 'R2' | 'R3' | 'R4';
  readonly risk: 'low' | 'medium' | 'high';
  readonly change_kind: 'feature' | 'fix' | 'refactor' | 'migration' | 'documentation' | 'incident';
  readonly config_binding: {
    readonly config_digest: string;
    readonly schema_digest: string;
    readonly runtime_code_digest: string;
  };
  readonly scope: {
    readonly scope_id: string;
    readonly allowed_paths: readonly string[];
    readonly fingerprint_paths: readonly string[];
    readonly implementation_paths: readonly string[];
    readonly documentation_paths: readonly string[];
  };
  readonly seal: {
    readonly sealed_revision: number;
    readonly sealed_at: string;
    readonly implementation_fingerprint: string;
  } | null;
  readonly assurance: {
    readonly epoch: string;
    readonly review_generation: number;
    readonly correction_count: number;
    readonly review_failure_count: number;
    readonly delivery_cycle_id: string | null;
  };
  readonly references: readonly LifecycleArtifactReference[];
}

interface LifecycleBinding {
  readonly work_source_revision: string;
  readonly scope_id: string;
  readonly ac_ids: readonly string[];
  readonly implementation_paths: readonly string[];
  readonly allowed_resources: readonly string[];
  readonly config_digest: string;
  readonly schema_digest: string;
  readonly runtime_code_digest: string;
}
export interface LifecycleWorkState {
  readonly revision: number;
  readonly binding: LifecycleBinding;
  readonly lifecycle: LifecycleState;
}
export interface DocumentationVerificationContext {
  readonly repository_root: string;
  readonly repository_id: string;
  readonly project_id: string;
  readonly work_id: string;
}

function verifyCurrentDocumentation(
  work: LifecycleWorkState,
  context: DocumentationVerificationContext | undefined,
): void {
  requireLifecycle(context !== undefined, 'documentation CLEAR verification context required');
  const reference = current(work.lifecycle, 'documentation_clear')[0];
  requireLifecycle(reference !== undefined, 'documentation CLEAR reference missing');
  requireLifecycle(
    reference.generation === work.lifecycle.assurance.review_generation,
    'documentation CLEAR generation invalid',
  );
  verifyDocumentationClearReference({
    ...context,
    source_revision: work.binding.work_source_revision,
    scope_paths: [...work.lifecycle.scope.allowed_paths],
    reference_path: reference.path,
    reference_sha256: reference.sha256,
    reference_id: reference.record_id,
    expected_cycle: work.lifecycle.assurance.review_generation,
  });
}

const digestPattern = /^[a-f0-9]{64}$/;
const schemaPattern = /^[A-Za-z][A-Za-z0-9]*\/v1$/;
const phases: readonly LifecyclePhase[] = ['INTAKE', 'TRACE', 'PLAN', 'EXECUTE', 'VERIFY', 'DELIVERY', 'COMPLETE'];
const legalTransitions = new Set([
  'INTAKE:TRACE',
  'TRACE:PLAN',
  'PLAN:EXECUTE',
  'EXECUTE:VERIFY',
  'VERIFY:DELIVERY',
  'DELIVERY:COMPLETE',
  'VERIFY:EXECUTE',
  'DELIVERY:EXECUTE',
]);
const singletonKinds = new Set<LifecycleArtifactKind>([
  'source_plan',
  'acceptance_manifest',
  'implementation_scope',
  'scope_snapshot',
  'execution_approval',
  'platform_knowledge',
  'implementation_policy',
  'change_impact_pre',
  'change_impact_post',
  'documentation_validation',
  'documentation_clear',
  'implementation_result',
  'test_receipt',
  'review_packet',
  'delivery_manifest',
  'delivery_receipt',
  'runtime_receipt',
  'user_testing_receipt',
  'feedback',
  'feedback_consumption',
  'correction_authorization',
]);
const correctionInvalidates = new Set<LifecycleArtifactKind>([
  'implementation_result',
  'change_impact_post',
  'documentation_clear',
  'validation_receipt',
  'test_receipt',
  'review_packet',
  'review_receipt',
  'reverse_validation',
  'dispatch_reservation',
  'dispatch_attestation',
  'delivery_manifest',
  'delivery_receipt',
  'runtime_receipt',
  'user_testing_receipt',
  'feedback',
]);
const admissionPhases: Readonly<Record<LifecycleArtifactKind, readonly LifecyclePhase[]>> = {
  source_plan: ['TRACE'],
  acceptance_manifest: ['TRACE'],
  implementation_scope: ['TRACE'],
  scope_snapshot: ['TRACE', 'PLAN', 'EXECUTE', 'VERIFY'],
  execution_approval: ['PLAN'],
  platform_knowledge: ['PLAN'],
  implementation_policy: ['PLAN'],
  change_impact_pre: ['PLAN'],
  change_impact_post: ['EXECUTE'],
  documentation_validation: ['PLAN'],
  documentation_clear: ['VERIFY'],
  implementation_result: ['EXECUTE'],
  validation_receipt: ['VERIFY'],
  test_receipt: ['VERIFY'],
  review_packet: ['VERIFY'],
  review_receipt: ['VERIFY'],
  reverse_validation: ['VERIFY'],
  dispatch_reservation: ['VERIFY'],
  dispatch_attestation: ['VERIFY'],
  architect_decision: ['VERIFY'],
  delivery_manifest: ['VERIFY'],
  delivery_receipt: ['DELIVERY'],
  runtime_receipt: ['DELIVERY'],
  user_testing_receipt: ['DELIVERY'],
  feedback: ['DELIVERY'],
  feedback_consumption: ['VERIFY', 'DELIVERY'],
  correction_authorization: ['VERIFY', 'DELIVERY'],
  decision: ['TRACE', 'PLAN', 'EXECUTE', 'VERIFY', 'DELIVERY'],
  recovery: ['EXECUTE', 'VERIFY', 'DELIVERY'],
};
const fingerprintKinds = new Set<LifecycleArtifactKind>([
  'implementation_result',
  'change_impact_post',
  'documentation_clear',
  'validation_receipt',
  'test_receipt',
  'review_packet',
  'review_receipt',
  'reverse_validation',
  'delivery_manifest',
  'delivery_receipt',
  'runtime_receipt',
  'user_testing_receipt',
  'feedback',
]);
const deliveryKinds = new Set<LifecycleArtifactKind>([
  'delivery_manifest',
  'delivery_receipt',
  'runtime_receipt',
  'user_testing_receipt',
  'feedback',
]);

export class LifecycleStateError extends Error {
  readonly code = 'GAP-LIFECYCLE-STATE-001';
}
function requireLifecycle(condition: unknown, message: string): asserts condition {
  if (!condition) throw new LifecycleStateError(message);
}
function unique(values: readonly string[], message: string): void {
  requireLifecycle(new Set(values).size === values.length, message);
}
function current(lifecycle: LifecycleState, kind: LifecycleArtifactKind): readonly LifecycleArtifactReference[] {
  return lifecycle.references.filter((reference) => reference.kind === kind && reference.disposition === 'current');
}
function requireCurrent(lifecycle: LifecycleState, ...kinds: LifecycleArtifactKind[]): void {
  for (const kind of kinds) requireLifecycle(current(lifecycle, kind).length > 0, `current ${kind} reference required`);
}
function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return canonicalJsonDigest([...left].sort()) === canonicalJsonDigest([...right].sort());
}
function pathList(values: readonly string[], name: string): void {
  unique(
    values.map((value) => value.toLowerCase()),
    `${name} contains aliases or duplicates`,
  );
  for (const value of values) requireLifecycle(safeWorkflowOwnedPath(value), `${name} contains an unsafe path`);
}
function validateReference(reference: LifecycleArtifactReference, work: LifecycleWorkState): void {
  requireLifecycle(reference.schema === 'LifecycleArtifactReference/v1', 'lifecycle reference schema invalid');
  requireLifecycle(schemaPattern.test(reference.artifact_schema), 'lifecycle artifact schema must be current v1');
  requireLifecycle(reference.record_id.trim().length > 0, 'lifecycle record id missing');
  requireLifecycle(safeWorkflowOwnedPath(reference.path), 'lifecycle artifact path unsafe');
  requireLifecycle(digestPattern.test(reference.sha256), 'lifecycle artifact digest invalid');
  requireLifecycle(
    reference.source_revision === work.lifecycle.source_revision &&
      reference.scope_id === work.lifecycle.scope.scope_id,
    'lifecycle artifact authority binding differs from current work',
  );
  requireLifecycle(
    reference.ac_ids.length > 0 && reference.ac_ids.every((id) => work.binding.ac_ids.includes(id)),
    'lifecycle artifact acceptance binding exceeds current work',
  );
  requireLifecycle(reference.generation === null || reference.generation >= 1, 'lifecycle artifact generation invalid');
  requireLifecycle(
    reference.implementation_fingerprint === null || digestPattern.test(reference.implementation_fingerprint),
    'lifecycle artifact fingerprint invalid',
  );
  requireLifecycle(
    reference.principal === null ||
      (reference.principal.trim() === reference.principal && reference.principal.length > 0),
    'lifecycle artifact principal invalid',
  );
  if (reference.disposition === 'current' && fingerprintKinds.has(reference.kind))
    requireLifecycle(
      work.lifecycle.seal !== null &&
        reference.implementation_fingerprint === work.lifecycle.seal.implementation_fingerprint,
      `${reference.kind} does not bind the current seal`,
    );
  if (reference.disposition === 'current' && deliveryKinds.has(reference.kind))
    requireLifecycle(
      work.lifecycle.assurance.delivery_cycle_id !== null &&
        reference.delivery_cycle_id === work.lifecycle.assurance.delivery_cycle_id,
      `${reference.kind} does not bind the current delivery cycle`,
    );
  if (
    reference.disposition === 'current' &&
    ['execution_approval', 'correction_authorization'].includes(reference.kind)
  )
    requireLifecycle(reference.decision === 'approved', `${reference.kind} is not approved`);
  if (
    reference.disposition === 'current' &&
    ['documentation_validation', 'documentation_clear', 'validation_receipt', 'test_receipt'].includes(reference.kind)
  )
    requireLifecycle(reference.decision === 'pass', `${reference.kind} did not pass`);
  if (reference.disposition === 'current' && ['review_receipt', 'reverse_validation'].includes(reference.kind))
    requireLifecycle(reference.decision === 'pass', `${reference.kind} did not pass`);
}

export function validateLifecycleAggregate(work: LifecycleWorkState): LifecycleState {
  assertCanonicalJsonValue(work.lifecycle, '$.lifecycle');
  const lifecycle = work.lifecycle;
  requireLifecycle(lifecycle.schema === 'LifecycleState/v1', 'lifecycle schema invalid');
  requireLifecycle(lifecycle.revision === work.revision, 'lifecycle revision differs from work revision');
  requireLifecycle(phases.includes(lifecycle.phase), 'lifecycle phase invalid');
  requireLifecycle(lifecycle.source_revision === work.binding.work_source_revision, 'lifecycle source binding invalid');
  requireLifecycle(lifecycle.next_action.trim().length > 0, 'lifecycle next action missing');
  requireLifecycle(
    lifecycle.config_binding.config_digest === work.binding.config_digest &&
      lifecycle.config_binding.schema_digest === work.binding.schema_digest &&
      lifecycle.config_binding.runtime_code_digest === work.binding.runtime_code_digest,
    'lifecycle configuration binding differs from work authority',
  );
  requireLifecycle(lifecycle.scope.scope_id === work.binding.scope_id, 'lifecycle scope binding invalid');
  pathList(lifecycle.scope.allowed_paths, 'allowed paths');
  pathList(lifecycle.scope.fingerprint_paths, 'fingerprint paths');
  pathList(lifecycle.scope.implementation_paths, 'implementation paths');
  pathList(lifecycle.scope.documentation_paths, 'documentation paths');
  requireLifecycle(
    sameStrings(lifecycle.scope.implementation_paths, work.binding.implementation_paths),
    'lifecycle implementation paths differ from work authority',
  );
  requireLifecycle(
    lifecycle.scope.implementation_paths.every((path) => lifecycle.scope.allowed_paths.includes(path)) &&
      lifecycle.scope.documentation_paths.every((path) => lifecycle.scope.allowed_paths.includes(path)) &&
      lifecycle.scope.fingerprint_paths.every((path) => lifecycle.scope.allowed_paths.includes(path)),
    'lifecycle scoped path is outside allowed paths',
  );
  requireLifecycle(
    sameStrings(
      lifecycle.scope.allowed_paths.map((path) => 'file:' + path),
      work.binding.allowed_resources.filter((resource) => resource.startsWith('file:')),
    ),
    'lifecycle allowed paths differ from file resource authority',
  );
  if (lifecycle.seal) {
    requireLifecycle(lifecycle.seal.sealed_revision <= lifecycle.revision, 'lifecycle seal revision invalid');
    requireLifecycle(Number.isFinite(Date.parse(lifecycle.seal.sealed_at)), 'lifecycle seal timestamp invalid');
    requireLifecycle(
      digestPattern.test(lifecycle.seal.implementation_fingerprint),
      'lifecycle seal fingerprint invalid',
    );
  }
  requireLifecycle(lifecycle.assurance.review_generation >= 0, 'review generation invalid');
  requireLifecycle(lifecycle.assurance.correction_count >= 0, 'correction count invalid');
  requireLifecycle(lifecycle.assurance.review_failure_count >= 0, 'review failure count invalid');
  for (const reference of lifecycle.references) validateReference(reference, work);
  unique(
    lifecycle.references.map((reference) => `${reference.kind}:${reference.record_id}`),
    'lifecycle reference identity',
  );
  unique(
    lifecycle.references.map((reference) => reference.path.toLowerCase()),
    'lifecycle reference paths',
  );
  for (const kind of singletonKinds)
    requireLifecycle(current(lifecycle, kind).length <= 1, `multiple current ${kind} references`);
  for (const kind of ['review_receipt', 'reverse_validation'] as const) {
    const references = current(lifecycle, kind);
    requireLifecycle(references.length <= 3, `too many current ${kind} references`);
    unique(
      references.map((reference) => reference.principal ?? ''),
      `${kind} principals are missing or duplicated`,
    );
    for (const reference of references)
      requireLifecycle(
        reference.principal !== null &&
          reference.generation === lifecycle.assurance.review_generation &&
          reference.implementation_fingerprint === lifecycle.seal?.implementation_fingerprint,
        `${kind} is not bound to the current review generation and seal`,
      );
  }
  const phaseIndex = phases.indexOf(lifecycle.phase);
  if (phaseIndex >= phases.indexOf('PLAN'))
    requireCurrent(lifecycle, 'source_plan', 'acceptance_manifest', 'implementation_scope');
  if (phaseIndex >= phases.indexOf('EXECUTE'))
    requireCurrent(
      lifecycle,
      'execution_approval',
      'platform_knowledge',
      'implementation_policy',
      'change_impact_pre',
      'documentation_validation',
    );
  if (phaseIndex >= phases.indexOf('VERIFY')) {
    requireLifecycle(lifecycle.seal !== null, 'sealed lifecycle state required');
    requireCurrent(lifecycle, 'implementation_result');
  }
  if (phaseIndex >= phases.indexOf('DELIVERY')) {
    requireLifecycle(
      current(lifecycle, 'review_receipt').length === 3,
      'exactly three current review receipts required',
    );
    requireLifecycle(
      current(lifecycle, 'reverse_validation').length === 3,
      'exactly three current reverse validations required',
    );
    requireCurrent(lifecycle, 'documentation_clear', 'delivery_manifest');
    requireLifecycle(lifecycle.assurance.delivery_cycle_id !== null, 'delivery cycle required');
  }
  if (lifecycle.phase === 'COMPLETE') {
    requireCurrent(lifecycle, 'delivery_receipt', 'runtime_receipt', 'user_testing_receipt');
    for (const kind of ['delivery_receipt', 'runtime_receipt', 'user_testing_receipt'] as const) {
      const reference = current(lifecycle, kind)[0]!;
      requireLifecycle(
        reference.decision === 'accepted' || reference.decision === 'approved',
        `${kind} is not accepted`,
      );
      requireLifecycle(
        reference.delivery_cycle_id === lifecycle.assurance.delivery_cycle_id &&
          reference.implementation_fingerprint === lifecycle.seal?.implementation_fingerprint,
        `${kind} is stale or belongs to another delivery cycle`,
      );
    }
  }
  return lifecycle;
}

export function transitionLifecycleState<T extends LifecycleWorkState>(
  work: T,
  target: LifecyclePhase,
  nextAction: string,
  documentationContext?: DocumentationVerificationContext,
): T {
  validateLifecycleAggregate(work);
  const before = work.lifecycle;
  requireLifecycle(before.phase !== 'COMPLETE', 'completed lifecycle is immutable');
  requireLifecycle(legalTransitions.has(`${before.phase}:${target}`), 'illegal lifecycle transition');
  requireLifecycle(nextAction.trim().length > 0, 'next lifecycle action missing');
  let references = [...before.references];
  let seal = before.seal;
  let assurance = before.assurance;
  if (target === 'PLAN') requireCurrent(before, 'source_plan', 'acceptance_manifest', 'implementation_scope');
  if (target === 'EXECUTE' && before.phase === 'PLAN')
    requireCurrent(
      before,
      'execution_approval',
      'platform_knowledge',
      'implementation_policy',
      'change_impact_pre',
      'documentation_validation',
    );
  if (target === 'VERIFY') {
    requireLifecycle(before.seal !== null && before.seal.sealed_revision === work.revision, 'current seal required');
    requireCurrent(before, 'implementation_result');
  }
  if (target === 'DELIVERY') {
    requireLifecycle(before.seal !== null, 'delivery requires a seal');
    requireLifecycle(current(before, 'review_receipt').length === 3, 'delivery requires three reviews');
    requireLifecycle(current(before, 'reverse_validation').length === 3, 'delivery requires three reverse validations');
    requireCurrent(before, 'documentation_clear', 'delivery_manifest');
    verifyCurrentDocumentation(work, documentationContext);
    requireLifecycle(before.assurance.delivery_cycle_id !== null, 'delivery requires a delivery cycle');
  }
  if (target === 'COMPLETE') {
    verifyCurrentDocumentation(work, documentationContext);
    requireCurrent(before, 'delivery_receipt', 'runtime_receipt', 'user_testing_receipt');
    for (const kind of ['delivery_receipt', 'runtime_receipt', 'user_testing_receipt'] as const) {
      const reference = current(before, kind)[0]!;
      requireLifecycle(reference.decision === 'accepted' || reference.decision === 'approved', `${kind} not accepted`);
      requireLifecycle(
        reference.delivery_cycle_id === before.assurance.delivery_cycle_id &&
          reference.implementation_fingerprint === before.seal?.implementation_fingerprint,
        `${kind} does not bind the current delivery`,
      );
    }
  }
  if (target === 'EXECUTE' && (before.phase === 'VERIFY' || before.phase === 'DELIVERY')) {
    requireCurrent(before, 'correction_authorization', 'feedback_consumption');
    references = references.map((reference) => {
      if (reference.disposition !== 'current') return reference;
      if (reference.kind === 'feedback_consumption') return { ...reference, disposition: 'consumed' as const };
      if (reference.kind === 'correction_authorization' || correctionInvalidates.has(reference.kind))
        return { ...reference, disposition: 'retired' as const };
      return reference;
    });
    seal = null;
    assurance = {
      ...assurance,
      correction_count: assurance.correction_count + 1,
      review_generation: assurance.review_generation + 1,
      delivery_cycle_id: null,
    };
  }
  const nextLifecycle: LifecycleState = {
    ...before,
    revision: work.revision + 1,
    phase: target,
    next_action: nextAction.trim(),
    references,
    seal,
    assurance,
  };
  const next = freezeJsonValue({ ...work, revision: work.revision + 1, lifecycle: nextLifecycle }) as T;
  validateLifecycleAggregate(next);
  return next;
}

export function validateLifecycleProgress(
  before: LifecycleWorkState,
  after: LifecycleWorkState,
  documentationContext?: DocumentationVerificationContext,
): void {
  validateLifecycleAggregate(before);
  validateLifecycleAggregate(after);
  requireLifecycle(after.revision === before.revision + 1, 'lifecycle work revision must advance exactly once');
  const stableBefore = {
    source_revision: before.lifecycle.source_revision,
    route: before.lifecycle.route,
    risk: before.lifecycle.risk,
    change_kind: before.lifecycle.change_kind,
    config_binding: before.lifecycle.config_binding,
    scope: before.lifecycle.scope,
  };
  const stableAfter = {
    source_revision: after.lifecycle.source_revision,
    route: after.lifecycle.route,
    risk: after.lifecycle.risk,
    change_kind: after.lifecycle.change_kind,
    config_binding: after.lifecycle.config_binding,
    scope: after.lifecycle.scope,
  };
  requireLifecycle(
    canonicalJsonDigest(stableBefore) === canonicalJsonDigest(stableAfter),
    'lifecycle authority changed; explicit reconcile or rebind required',
  );
  if (before.lifecycle.phase !== after.lifecycle.phase) {
    const expected = transitionLifecycleState(
      before,
      after.lifecycle.phase,
      after.lifecycle.next_action,
      documentationContext,
    );
    requireLifecycle(
      canonicalJsonDigest(expected.lifecycle) === canonicalJsonDigest(after.lifecycle),
      'lifecycle transition contains an untyped mutation',
    );
    return;
  }
  if (after.lifecycle.phase === 'DELIVERY') verifyCurrentDocumentation(after, documentationContext);
  requireLifecycle(before.lifecycle.phase !== 'COMPLETE', 'completed lifecycle is immutable');
  requireLifecycle(after.lifecycle.revision === after.revision, 'lifecycle revision did not follow work revision');
  if (canonicalJsonDigest(before.lifecycle.seal) !== canonicalJsonDigest(after.lifecycle.seal))
    requireLifecycle(
      before.lifecycle.phase === 'EXECUTE' &&
        before.lifecycle.seal === null &&
        after.lifecycle.seal?.sealed_revision === after.revision,
      'seal can only be created once during execution',
    );
  requireLifecycle(
    after.lifecycle.assurance.epoch === before.lifecycle.assurance.epoch,
    'assurance epoch changes only through explicit reconcile',
  );
  requireLifecycle(
    after.lifecycle.assurance.correction_count === before.lifecycle.assurance.correction_count,
    'correction count changes only through a correction transition',
  );
  requireLifecycle(
    after.lifecycle.assurance.review_generation >= before.lifecycle.assurance.review_generation &&
      after.lifecycle.assurance.review_generation <= before.lifecycle.assurance.review_generation + 1 &&
      after.lifecycle.assurance.review_failure_count >= before.lifecycle.assurance.review_failure_count &&
      after.lifecycle.assurance.review_failure_count <= before.lifecycle.assurance.review_failure_count + 1,
    'assurance counters cannot regress',
  );
  if (before.lifecycle.assurance.delivery_cycle_id !== after.lifecycle.assurance.delivery_cycle_id)
    requireLifecycle(
      before.lifecycle.phase === 'VERIFY' &&
        before.lifecycle.assurance.delivery_cycle_id === null &&
        after.lifecycle.assurance.delivery_cycle_id !== null,
      'delivery cycle can only open once during verification',
    );
  const afterReferences = new Map(
    after.lifecycle.references.map((reference) => [`${reference.kind}:${reference.record_id}`, reference]),
  );
  const beforeReferences = new Set(
    before.lifecycle.references.map((reference) => `${reference.kind}:${reference.record_id}`),
  );
  const added = after.lifecycle.references.filter(
    (reference) => !beforeReferences.has(`${reference.kind}:${reference.record_id}`),
  );
  for (const reference of added)
    requireLifecycle(
      admissionPhases[reference.kind].includes(before.lifecycle.phase),
      `${reference.kind} cannot be admitted during ${before.lifecycle.phase}`,
    );
  if (after.lifecycle.assurance.review_generation !== before.lifecycle.assurance.review_generation)
    requireLifecycle(
      before.lifecycle.phase === 'VERIFY' && added.some((reference) => reference.kind === 'review_packet'),
      'review generation requires a new review packet during verification',
    );
  for (const reference of before.lifecycle.references) {
    const next = afterReferences.get(`${reference.kind}:${reference.record_id}`);
    requireLifecycle(next !== undefined, 'lifecycle references are append-only');
    if (canonicalJsonDigest(reference) !== canonicalJsonDigest(next))
      requireLifecycle(
        reference.kind === 'feedback_consumption' &&
          reference.disposition === 'current' &&
          next.disposition === 'consumed' &&
          canonicalJsonDigest({ ...reference, disposition: 'consumed' }) === canonicalJsonDigest(next),
        'lifecycle reference replacement or invalidation requires a typed operation',
      );
  }
}
