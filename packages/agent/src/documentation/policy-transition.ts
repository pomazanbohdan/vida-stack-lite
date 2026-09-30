import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { parseDocumentationPolicyTransitionEnvelope } from './transition-proof.js';
import eventSchema from '../../schemas/documentation-change-event.v1.schema.json' with { type: 'json' };
import checkpointSchema from '../../schemas/documentation-clear-checkpoint.v1.schema.json' with { type: 'json' };
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { loadRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { deriveWorkspaceId } from '../workspace-identity.js';

type Entry = { path: string; bytes: string; sha256: string; size: number };
type RecordValue = Record<string, unknown>;
const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const assert = (condition: unknown, message: string): void => {
  if (!condition) throw new Error(`documentation policy transition: ${message}`);
};
const Constructor = Ajv2020 as unknown as new (options: object) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validEvent = new Constructor({
  strict: true,
  allErrors: true,
  formats: { 'date-time': true },
}).compile(eventSchema);
const validCheckpoint = new Constructor({ strict: true, allErrors: true }).compile(checkpointSchema);

export function documentationPolicyTransitionPath(workId: string): string {
  assert(/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(workId), 'work identity invalid');
  return `.agent/work/${workId}/documentation-policy-transition.v1.json`;
}

/** Registration may add maps only; policy ownership and every other field stay exact. */
export function validatePolicyMapAddition(beforeBytes: string, afterBytes: string): string[] {
  const before = JSON.parse(beforeBytes) as RecordValue;
  const after = JSON.parse(afterBytes) as RecordValue;
  assert(Array.isArray(before.map_paths) && Array.isArray(after.map_paths), 'map paths missing');
  const oldMaps = before.map_paths as string[],
    newMaps = after.map_paths as string[];
  assert(
    new Set(newMaps).size === newMaps.length && oldMaps.every((file) => newMaps.includes(file)),
    'map removal or duplicate',
  );
  assert(
    canonicalJsonDigest({ ...after, map_paths: oldMaps }) === canonicalJsonDigest(before),
    'non-map policy field changed',
  );
  const added = newMaps.filter((file) => !oldMaps.includes(file)).sort();
  assert(
    added.length > 0 && newMaps.filter((file) => oldMaps.includes(file)).join('\n') === oldMaps.join('\n'),
    'empty addition or existing map order changed',
  );
  return added;
}

export function parseDocumentationPolicyTransition(bytes: Uint8Array): RecordValue {
  return parseDocumentationPolicyTransitionEnvelope(bytes) as RecordValue;
}

export function documentationPolicyTransitionFence(plan: RecordValue): RecordValue {
  const { fence_binding: _binding, ...body } = plan;
  const digest = canonicalJsonDigest(body);
  return {
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: plan.project_ids,
    operation_id: plan.operation_id,
    manifest_digest: digest,
    request_digest: digest,
    bindings_digest: plan.state_digest,
    closure_digest: canonicalJsonDigest({
      baseline: plan.baseline_digest,
      target: plan.target_policy_bytes,
    }),
    bundle_digest: plan.bundle_digest,
  };
}

/** Optional dependency is discovered by exact work identity, never by filesystem guessing. */
export function documentationPolicyTransitionPreimages(
  input: {
    repository_root: string;
    repository_id: string;
    project_id: string;
    work_id: string;
    source_revision: string;
    scope_paths: string[];
  },
  baseline: RecordValue,
  currentPolicyBytes: Uint8Array,
): Entry[] {
  const access = requireSafeRepositoryAccess(input.repository_root);
  const file = documentationPolicyTransitionPath(input.work_id);
  if (!access.fileExists(file, 'policy transition dependency')) return [];
  const operation = parseDocumentationPolicyTransition(access.readBytes(file, 'policy transition dependency'));
  const plan = operation.plan as RecordValue;
  const config = loadRuntimeConfig(input.repository_root);
  assert(['fenced', 'applied'].includes(String(operation.phase)), 'dependency is not fenced or applied');
  assert(
    plan.repository_root === input.repository_root &&
      plan.repository_id === input.repository_id &&
      plan.project_id === input.project_id &&
      plan.work_id === input.work_id &&
      plan.source_revision === input.source_revision &&
      plan.scope_digest === canonicalJsonDigest([...new Set(input.scope_paths)].sort()) &&
      plan.config_digest === runtimeConfigDigest(config) &&
      plan.config_digest === baseline.config_digest &&
      plan.project_context_digest === baseline.project_context_digest &&
      plan.baseline_digest === baseline.digest &&
      plan.policy_path === baseline.policy_path &&
      sha(Buffer.from(String(plan.old_policy_bytes))) === baseline.policy_digest &&
      sha(currentPolicyBytes) === sha(Buffer.from(String(plan.target_policy_bytes))),
    'baseline/current policy authority differs',
  );
  const added = validatePolicyMapAddition(String(plan.old_policy_bytes), String(plan.target_policy_bytes));
  const entries = plan.added_maps as Entry[];
  assert(
    canonicalJsonDigest(entries.map((entry) => entry.path)) === canonicalJsonDigest(added),
    'added map inventory differs',
  );
  for (const entry of entries)
    assert(
      input.scope_paths.includes(entry.path) &&
        sha(Buffer.from(entry.bytes)) === entry.sha256 &&
        Buffer.byteLength(entry.bytes) === entry.size,
      'map preimage differs from scope',
    );
  const scopeBytes = access.readBytes(`.agent/work/${input.work_id}/scope.json`, 'accepted transition scope');
  assert(sha(scopeBytes) === plan.scope_file_digest, 'accepted source scope changed');
  const scope = JSON.parse(scopeBytes.toString('utf8')) as { documentation_paths: string[] };
  const oldDocuments = baseline.documents as { path: string; sha256: string }[];
  assert(
    Array.isArray(scope.documentation_paths) &&
      canonicalJsonDigest(added) ===
        canonicalJsonDigest(
          scope.documentation_paths.filter((file) => !oldDocuments.some((entry) => entry.path === file)).sort(),
        ),
    'map addition differs from accepted documentation target',
  );
  const baselineBytes = access.readBytes(String(plan.baseline_path), 'immutable transition baseline');
  assert(sha(baselineBytes) === plan.baseline_file_digest, 'baseline bytes changed');
  const beforeEntries = [...(baseline.documents as { path: string; sha256: string }[]), ...entries];
  const changed = beforeEntries.filter(
    (entry) => sha(access.readBytes(entry.path, 'current governed document')) !== entry.sha256,
  );
  const events = operation.events as { path: string; bytes: string }[];
  assert(
    changed.length > 0 &&
      canonicalJsonDigest(events.map((entry) => entry.path).sort()) ===
        canonicalJsonDigest(changed.map((entry) => entry.path).sort()),
    'actual changed document/event set differs',
  );
  for (const entry of events) {
    const event = JSON.parse(entry.bytes) as RecordValue;
    const before = beforeEntries.find((document) => document.path === entry.path);
    assert(
      validEvent(event) &&
        entry.bytes === JSON.stringify(event) + '\n' &&
        before &&
        input.scope_paths.includes(entry.path) &&
        event.work_id === input.work_id &&
        event.source_revision === input.source_revision &&
        event.operation === 'finalize' &&
        event.path_before === entry.path &&
        event.path_after === entry.path &&
        event.before_sha256 === before.sha256 &&
        event.after_sha256 === sha(access.readBytes(entry.path, 'audited document')) &&
        event.actor === plan.actor &&
        event.pointer === plan.instruction_ref &&
        event.timestamp === plan.created_at,
      'actual transition event binding differs',
    );
  }
  assert(
    access.readText(String(plan.changelog_path), 'actual transition lineage') ===
      String(plan.changelog_preimage) + events.map((entry) => entry.bytes).join(''),
    'transition event publication differs',
  );
  if (operation.phase === 'applied') {
    const reference = operation.closeout as RecordValue | null;
    assert(
      reference && reference.path === String(plan.baseline_path).replace('baseline', 'closeout'),
      'applied closeout reference missing',
    );
    const bytes = access.readBytes(String(reference!.path), 'actual transition closeout');
    const checkpoint = JSON.parse(bytes.toString('utf8')) as RecordValue;
    const { digest, ...body } = checkpoint;
    assert(
      validCheckpoint(checkpoint) &&
        digest === canonicalJsonDigest(body) &&
        sha(bytes) === reference!.sha256 &&
        digest === reference!.checkpoint_digest &&
        checkpoint.status === 'pass' &&
        checkpoint.phase === 'closeout' &&
        checkpoint.work_id === input.work_id &&
        checkpoint.source_revision === input.source_revision &&
        checkpoint.baseline_digest === baseline.digest &&
        checkpoint.policy_digest === sha(currentPolicyBytes) &&
        checkpoint.config_digest === plan.config_digest &&
        checkpoint.scope_digest === plan.scope_digest,
      'actual applied closeout differs',
    );
  } else
    assert(
      operation.closeout === null && operation.maintenance_released === false,
      'intermediate phase has forged closure',
    );
  // Read-only database access verifies the real fence; a caller's phase/token is insufficient.
  const databasePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
  access.readBytes(databasePath, 'existing transition fence database');
  const db = new Database(path.join(input.repository_root, databasePath), {
    readonly: true,
    strict: true,
  });
  try {
    const row = db
      .query('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
      .get(deriveWorkspaceId(input.repository_id, input.repository_root)) as {
      payload: string;
      digest: string;
    } | null;
    assert(row, 'maintenance fence missing');
    const fence = JSON.parse(row!.payload) as RecordValue;
    assert(
      row!.digest === canonicalJsonDigest(fence) &&
        canonicalJsonDigest(fence.binding) === canonicalJsonDigest(plan.fence_binding),
      'maintenance fence binding differs',
    );
    assert(
      fence.status === 'held' || (operation.phase === 'applied' && fence.status === 'released'),
      'maintenance status differs',
    );
  } finally {
    db.close();
  }
  return entries;
}
