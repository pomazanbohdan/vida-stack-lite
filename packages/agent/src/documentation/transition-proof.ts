import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import canonicalize from 'canonicalize';
import transitionSchema from '../../schemas/documentation-policy-transition.v1.schema.json' with { type: 'json' };
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import policySchema from '../../schemas/documentation-policy.v1.schema.json' with { type: 'json' };
import eventSchema from '../../schemas/documentation-change-event.v1.schema.json' with { type: 'json' };
import checkpointSchema from '../../schemas/documentation-clear-checkpoint.v1.schema.json' with { type: 'json' };

type RecordValue = Record<string, unknown>;
const sha = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const digest = (value: unknown): string => sha(canonicalize(value)!);
const Constructor = Ajv2020 as unknown as new (options: object) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validScope = new Constructor({ strict: true, allErrors: true }).compile(scopeSchema);
const validPolicy = new Constructor({
  strict: true,
  allErrors: true,
  formats: { 'date-time': true },
}).compile(policySchema);
const validTransition = new Constructor({ strict: true, allErrors: true }).compile(transitionSchema);
const validEvent = new Constructor({
  strict: true,
  allErrors: true,
  formats: { 'date-time': true },
}).compile(eventSchema);
const validCheckpoint = new Constructor({ strict: true, allErrors: true }).compile(checkpointSchema);
const requireProof = (condition: unknown, message: string): void => {
  if (!condition) throw Error('forward documentation proof: ' + message);
};

/** Pure current-v1 integrity check shared by transition readers and committed-forward proof. */
export function parseDocumentationPolicyTransitionEnvelope(bytes: Uint8Array): RecordValue {
  requireProof(bytes.byteLength <= 16 * 1024 * 1024, 'operation exceeds bound');
  const operation = JSON.parse(Buffer.from(bytes).toString('utf8'));
  requireProof(validTransition(operation), 'operation schema invalid');
  const { operation_digest, ...body } = operation;
  requireProof(operation_digest === digest(body), 'whole operation integrity differs');
  requireProof(operation.plan_digest === digest(operation.plan), 'frozen plan integrity differs');
  const { fence_binding, ...planBody } = operation.plan;
  const planDigest = digest(planBody);
  requireProof(
    digest(fence_binding) ===
      digest({
        schema: 'MaintenanceFenceBinding/v1',
        project_ids: operation.plan.project_ids,
        operation_id: operation.plan.operation_id,
        manifest_digest: planDigest,
        request_digest: planDigest,
        bindings_digest: operation.plan.state_digest,
        closure_digest: digest({
          baseline: operation.plan.baseline_digest,
          target: operation.plan.target_policy_bytes,
        }),
        bundle_digest: operation.plan.bundle_digest,
      }),
    'fence does not bind frozen preimages',
  );
  return operation;
}

export function parseForwardClearCheckpoint(bytes: Uint8Array): RecordValue {
  const checkpoint = JSON.parse(Buffer.from(bytes).toString('utf8'));
  const { digest: expected, ...body } = checkpoint;
  requireProof(
    validCheckpoint(checkpoint) && expected === digest(body) && checkpoint.status === 'pass',
    'CLEAR checkpoint integrity/status differs',
  );
  return checkpoint;
}

export function parseForwardDocumentationEvent(bytes: Uint8Array): RecordValue {
  const event = JSON.parse(Buffer.from(bytes).toString('utf8'));
  requireProof(validEvent(event), 'documentation event schema invalid');
  return event;
}

type FileChange = {
  path: string;
  old_sha256: string | null;
  new_sha256: string;
  old_size: number | null;
  new_size: number;
};
type LeafProof = {
  operationBytes: Uint8Array;
  baselineBytes: Uint8Array;
  closeoutBytes: Uint8Array;
  changelogBytes: Uint8Array;
  scopeBytes: Uint8Array;
  priorFiles: { path: string; sha256: string; size: number }[];
  successorFiles: { path: string; sha256: string; size: number }[];
  operationId: string;
  parentSelectorDigest: string;
  parentManifestDigest: string;
  successorManifestDigest: string;
  intentDigest: string;
  authorizationDigest: string;
  changes: FileChange[];
};

/** New leaf changes require their actual applied dependency, never an ancestor fallback. */
export function verifySelectedForwardPolicyProof(input: LeafProof): string {
  const operation = parseDocumentationPolicyTransitionEnvelope(input.operationBytes);
  const plan = operation.plan as RecordValue;
  const admission = plan.source_admission as RecordValue | null;
  const baseline = parseForwardClearCheckpoint(input.baselineBytes);
  const closeout = parseForwardClearCheckpoint(input.closeoutBytes);
  const reference = operation.closeout as RecordValue | null;
  requireProof(
    operation.phase === 'applied' && operation.maintenance_released === true && admission && reference,
    'selected policy leaf has no applied transition closure',
  );
  requireProof(
    admission!.operation_id === input.operationId &&
      admission!.parent_selector_sha256 === input.parentSelectorDigest &&
      admission!.parent_manifest_sha256 === input.parentManifestDigest &&
      admission!.successor_manifest_sha256 === input.successorManifestDigest &&
      admission!.intent_sha256 === input.intentDigest &&
      admission!.authorization_sha256 === input.authorizationDigest &&
      admission!.target_path === plan.policy_path &&
      plan.operation_id === input.operationId,
    'selected policy source admission differs from committed forward',
  );
  const policyPath = String(plan.policy_path);
  const change = input.changes.find((entry) => entry.path === policyPath);
  const beforeBytes = String(plan.old_policy_bytes),
    afterBytes = String(plan.target_policy_bytes);
  requireProof(
    change &&
      sha(beforeBytes) === change.old_sha256 &&
      Buffer.byteLength(beforeBytes) === change.old_size &&
      sha(afterBytes) === change.new_sha256 &&
      Buffer.byteLength(afterBytes) === change.new_size &&
      admission!.target_sha256 === change.new_sha256,
    'policy preimages differ from committed manifests',
  );
  const scope = JSON.parse(Buffer.from(input.scopeBytes).toString('utf8'));
  requireProof(
    validScope(scope) &&
      Array.isArray(scope.documentation_paths) &&
      sha(input.scopeBytes) === plan.scope_file_digest &&
      scope.work_id === plan.work_id &&
      scope.source_revision === plan.source_revision,
    'durable accepted scope differs',
  );
  const addedMaps = plan.added_maps as {
    path: string;
    bytes: string;
    sha256: string;
    size: number;
  }[];
  const addedPaths = addedMaps.map((entry) => entry.path).sort();
  const oldDocuments = baseline.documents as RecordValue[];
  requireProof(
    digest(addedPaths) ===
      digest(
        scope.documentation_paths.filter((file: string) => !oldDocuments.some((entry) => entry.path === file)).sort(),
      ),
    'policy addition differs from accepted documentation target',
  );
  for (const entry of addedMaps) {
    const prior = input.priorFiles.find((file) => file.path === entry.path);
    requireProof(
      sha(entry.bytes) === entry.sha256 &&
        Buffer.byteLength(entry.bytes) === entry.size &&
        prior?.sha256 === entry.sha256 &&
        prior?.size === entry.size &&
        input.successorFiles.some((file) => file.path === entry.path),
      'added map preimage differs from committed manifests',
    );
  }
  const before = JSON.parse(beforeBytes),
    after = JSON.parse(afterBytes);
  requireProof(
    before.schema === 'DocumentationPolicy/v1' &&
      after.schema === 'DocumentationPolicy/v1' &&
      before.source_path === policyPath &&
      after.source_path === policyPath &&
      Array.isArray(before.map_paths) &&
      Array.isArray(after.map_paths) &&
      new Set(after.map_paths).size === after.map_paths.length &&
      digest(after.map_paths.filter((file: string) => before.map_paths.includes(file))) === digest(before.map_paths) &&
      digest(after.map_paths.filter((file: string) => !before.map_paths.includes(file)).sort()) ===
        digest(addedPaths) &&
      digest({ ...after, map_paths: before.map_paths }) === digest(before),
    'selected policy must add only accepted map registration',
  );
  requireProof(
    baseline.phase === 'baseline' &&
      closeout.phase === 'closeout' &&
      baseline.work_id === plan.work_id &&
      closeout.work_id === plan.work_id &&
      baseline.source_revision === plan.source_revision &&
      closeout.source_revision === plan.source_revision &&
      baseline.policy_path === policyPath &&
      closeout.policy_path === policyPath &&
      baseline.policy_digest === change!.old_sha256 &&
      closeout.policy_digest === change!.new_sha256 &&
      baseline.digest === plan.baseline_digest &&
      sha(input.baselineBytes) === plan.baseline_file_digest &&
      closeout.baseline_digest === baseline.digest &&
      sha(input.closeoutBytes) === reference!.sha256 &&
      closeout.digest === reference!.checkpoint_digest &&
      ['repository_id', 'project_id', 'project_context_digest', 'config_digest', 'scope_digest'].every(
        (field) => baseline[field] === closeout[field] && baseline[field] === plan[field],
      ),
    'actual leaf CLEAR binding differs',
  );
  const events = operation.events as { path: string; bytes: string }[];
  const policyEvent = events.find((entry) => entry.path === policyPath);
  requireProof(policyEvent, 'actual policy event missing');
  for (const entry of events) {
    const event = parseForwardDocumentationEvent(Buffer.from(entry.bytes));
    requireProof(
      event.work_id === plan.work_id &&
        event.source_revision === plan.source_revision &&
        event.operation === 'finalize' &&
        event.path_before === entry.path &&
        event.path_after === entry.path,
      'leaf event work/source differs',
    );
    const fileChange = input.changes.find((item) => item.path === entry.path);
    requireProof(
      fileChange && event.before_sha256 === fileChange.old_sha256 && event.after_sha256 === fileChange.new_sha256,
      'leaf event differs from committed changed bytes',
    );
  }
  requireProof(
    after.changelog_path === plan.changelog_path &&
      Buffer.from(input.changelogBytes)
        .toString('utf8')
        .startsWith(String(plan.changelog_preimage) + events.map((entry) => entry.bytes).join('')),
    'actual leaf event publication differs',
  );
  return policyPath;
}

type ParentProof = {
  baselineBytes: Uint8Array;
  closeoutBytes: Uint8Array;
  baselinePath: string;
  policyEventBytes: Uint8Array;
  documentEventBytes: Uint8Array;
  changes: FileChange[];
};

/** Observes an already committed parent. It grants no new policy-effect authority. */
export function verifyCommittedParentPolicyProof(input: ParentProof): string {
  const baseline = parseForwardClearCheckpoint(input.baselineBytes);
  const closeout = parseForwardClearCheckpoint(input.closeoutBytes);
  const policyEvent = parseForwardDocumentationEvent(input.policyEventBytes);
  const documentEvent = parseForwardDocumentationEvent(input.documentEventBytes);
  const policyPath = String(baseline.policy_path);
  const policyChange = input.changes.find((entry) => entry.path === policyPath);
  const documentChange = input.changes.find((entry) => entry.path === documentEvent.path_after);
  requireProof(
    baseline.phase === 'baseline' &&
      closeout.phase === 'closeout' &&
      closeout.baseline_path === input.baselinePath &&
      closeout.baseline_digest === baseline.digest &&
      [
        'work_id',
        'source_revision',
        'repository_id',
        'project_id',
        'project_context_digest',
        'config_digest',
        'scope_digest',
        'policy_path',
        'policy_id',
      ].every((field) => baseline[field] === closeout[field]),
    'committed parent CLEAR pair differs',
  );
  requireProof(
    policyChange &&
      documentChange &&
      policyPath !== documentChange.path &&
      baseline.policy_digest === policyChange.new_sha256 &&
      closeout.policy_digest === policyChange.new_sha256,
    'committed parent policy/CLEAR identity differs',
  );
  for (const [event, change] of [
    [policyEvent, policyChange],
    [documentEvent, documentChange],
  ] as const) {
    requireProof(
      change &&
        event.work_id === baseline.work_id &&
        event.source_revision === baseline.source_revision &&
        event.operation === 'finalize' &&
        event.path_before === change.path &&
        event.path_after === change.path &&
        event.before_sha256 === change.old_sha256 &&
        event.after_sha256 === change.new_sha256,
      'committed parent event differs from work/source/manifests',
    );
  }
  requireProof(
    policyEvent.actor === documentEvent.actor && policyEvent.pointer === documentEvent.pointer,
    'committed parent event attribution differs',
  );
  const before = (baseline.documents as RecordValue[]).find((entry) => entry.path === documentChange!.path);
  const after = (closeout.documents as RecordValue[]).find((entry) => entry.path === documentChange!.path);
  requireProof(
    before?.sha256 === documentChange!.old_sha256 &&
      before?.size === documentChange!.old_size &&
      after?.sha256 === documentChange!.new_sha256 &&
      after?.size === documentChange!.new_size,
    'committed parent document CLEAR bytes differ',
  );
  // The historical baseline already saw the target policy. No additive-policy
  // comparison or pre-edit policy-body claim follows from its digest alone.
  return policyPath;
}

/** Current canonical identity locates retained lineage; it does not reinterpret old configuration. */
export function parseForwardPolicyIdentity(bytes: Uint8Array, expectedPath: string): RecordValue {
  const policy = JSON.parse(Buffer.from(bytes).toString('utf8'));
  requireProof(validPolicy(policy) && policy.source_path === expectedPath, 'canonical policy identity differs');
  return policy;
}
