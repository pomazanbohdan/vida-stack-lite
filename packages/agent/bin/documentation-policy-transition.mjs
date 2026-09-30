import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import scopeSchema from '../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import policySchema from '../schemas/documentation-policy.v1.schema.json' with { type: 'json' };
import baselineSchema from '../schemas/documentation-clear-checkpoint.v1.schema.json' with { type: 'json' };
import eventSchema from '../schemas/documentation-change-event.v1.schema.json' with { type: 'json' };
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectContext, projectBindingFor } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { currentState } from './runtime-config-rebind.mjs';
import { hasForwardOverlay, verifyForwardCandidateAdmission } from './forward-candidate-admission.mjs';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { executeDocumentationClearFromWork } from '../src/documentation/clear.ts';
import {
  documentationPolicyTransitionPath,
  validatePolicyMapAddition,
  parseDocumentationPolicyTransition,
  documentationPolicyTransitionFence,
} from '../src/documentation/policy-transition.ts';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const seal = (value) => {
  const { operation_digest: _digest, ...body } = value;
  return { ...body, operation_digest: canonicalJsonDigest(body) };
};
const requireTransition = (condition, message) => {
  if (!condition) throw Error(`documentation policy transition: ${message}`);
};
const ajv = new Ajv2020({ strict: true, allErrors: true, formats: { 'date-time': true } });
const validScope = ajv.compile(scopeSchema),
  validPolicy = ajv.compile(policySchema),
  validBaseline = ajv.compile(baselineSchema),
  validEvent = ajv.compile(eventSchema);

function parse(args) {
  const values = {};
  requireTransition(args.length % 2 === 0, 'arguments must be paired');
  for (let i = 0; i < args.length; i += 2) {
    requireTransition(args[i]?.startsWith('--') && args[i + 1] && !Object.hasOwn(values, args[i]), 'invalid arguments');
    values[args[i]] = args[i + 1];
  }
  const planning = ['inspect', 'plan'].includes(values['--mode']);
  const keys = [
    '--kind',
    '--mode',
    '--project-root',
    '--repository',
    '--project',
    '--work-id',
    '--repair-id',
    ...(planning ? ['--target-policy', '--baseline', '--actor', '--instruction-ref', '--timestamp'] : []),
    ...(values['--forward-operation'] || values['--payload-root'] ? ['--forward-operation', '--payload-root'] : []),
  ];
  requireTransition(
    Object.keys(values).sort().join('|') === keys.sort().join('|') &&
      values['--kind'] === 'documentation-policy' &&
      ['inspect', 'plan', 'apply', 'resume', 'restore'].includes(values['--mode']) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(values['--repair-id']),
    'mode, root or arguments invalid',
  );
  return values;
}

function planning(values, root, access, config, db, sourceAdmission) {
  const workId = values['--work-id'],
    context = loadProjectContext(root, config, values['--repository'], values['--project']);
  const project = projectBindingFor(context, values['--project']);
  requireTransition(project, 'project binding absent');
  const scopeBytes = access.readBytes(`.agent/work/${workId}/scope.json`, 'accepted documentation scope'),
    scope = JSON.parse(scopeBytes);
  requireTransition(
    validScope(scope) &&
      scope.work_id === workId &&
      scope.owner === values['--actor'] &&
      scope.attribution.pointer === values['--instruction-ref'] &&
      snapshotDeclaredSources(access, scope.allowed_paths).digest === scope.source_revision,
    'actual source scope/attribution differs',
  );
  const baselinePath = values['--baseline'];
  requireTransition(
    new RegExp(`^\\.agent/work/${workId}/documentation-baseline-[0-9]{4}\\.v1\\.json$`).test(baselinePath),
    'baseline path differs',
  );
  const baselineBytes = access.readBytes(baselinePath, 'genuine pre-edit baseline'),
    baseline = JSON.parse(baselineBytes);
  const { digest, ...baselineBody } = baseline;
  const scopeDigest = canonicalJsonDigest([...new Set(scope.allowed_paths)].sort());
  requireTransition(
    validBaseline(baseline) &&
      digest === canonicalJsonDigest(baselineBody) &&
      baseline.phase === 'baseline' &&
      baseline.status === 'pass' &&
      baseline.work_id === workId &&
      baseline.source_revision === scope.source_revision &&
      baseline.scope_digest === scopeDigest &&
      baseline.config_digest === runtimeConfigDigest(config) &&
      baseline.project_context_digest === context.project_context_digest,
    'baseline is not current actual authorized scope',
  );
  const policyPath = project.path_profile.paths.documentation_policy_path,
    oldBytes = access.readBytes(policyPath, 'old policy');
  const targetBytes = sourceAdmission
    ? readFileSync(path.join(sourceAdmission.payload_root, sourceAdmission.target_path))
    : access.readBytes(values['--target-policy'], 'authored target policy');
  const oldPolicy = JSON.parse(oldBytes),
    target = JSON.parse(targetBytes);
  requireTransition(
    validPolicy(oldPolicy) &&
      validPolicy(target) &&
      baseline.policy_path === policyPath &&
      sha(oldBytes) === baseline.policy_digest &&
      scope.allowed_paths.includes(policyPath) &&
      oldPolicy.source_path === policyPath &&
      oldPolicy.changelog_required &&
      oldPolicy.changelog_path,
    'policy schema/path/baseline differs',
  );
  const added = validatePolicyMapAddition(oldBytes.toString('utf8'), targetBytes.toString('utf8'));
  const approvedMaps = scope.documentation_paths
    .filter((file) => !baseline.documents.some((entry) => entry.path === file))
    .sort();
  requireTransition(
    canonicalJsonDigest(added) === canonicalJsonDigest(approvedMaps),
    'target map additions differ from exact accepted documentation scope',
  );
  const addedMaps = added.map((file) => {
    requireTransition(
      scope.allowed_paths.includes(file) &&
        !baseline.documents.some((entry) => entry.path === file) &&
        !target.excluded_roots.some((directory) => file === directory || file.startsWith(directory + '/')),
      'added map is outside scope or already governed/excluded',
    );
    const bytes = access.readBytes(file, 'new map pre-edit body');
    return { path: file, bytes: bytes.toString('utf8'), sha256: sha(bytes), size: bytes.length };
  });
  const changelog = access.readBytes(oldPolicy.changelog_path, 'changelog preimage');
  requireTransition(!changelog.length || changelog.at(-1) === 10, 'changelog preimage incomplete');
  requireTransition(
    changelog
      .toString('utf8')
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .every((line) => validEvent(JSON.parse(line))),
    'changelog schema invalid',
  );
  requireTransition(
    Number.isFinite(Date.parse(values['--timestamp'])) &&
      Date.parse(values['--timestamp']) >= Date.parse(baseline.created_at) &&
      Date.parse(values['--timestamp']) <= Date.now(),
    'planning time predates baseline or is future',
  );
  const selectedBytes = access.readBytes('.agent/active-runtime-selector.v1.json', 'selected runtime'),
    selected = JSON.parse(selectedBytes);
  requireTransition(
    selected.schema === 'ActiveRuntimeSelector/v1' && /^[a-f0-9]{64}$/.test(selected.payload_manifest_sha256),
    'selected runtime invalid',
  );
  const workspace = deriveWorkspaceId(config.repository.repository_id, root);
  const plan = {
    operation_id: values['--repair-id'],
    repository_root: root,
    repository_id: values['--repository'],
    project_ids: config.projects.map((entry) => entry.project_id).sort(),
    project_id: values['--project'],
    work_id: workId,
    source_revision: scope.source_revision,
    scope_digest: scopeDigest,
    scope_file_digest: sha(scopeBytes),
    project_context_digest: context.project_context_digest,
    config_digest: runtimeConfigDigest(config),
    baseline_path: baselinePath,
    baseline_digest: digest,
    baseline_file_digest: sha(baselineBytes),
    policy_path: policyPath,
    old_policy_bytes: oldBytes.toString('utf8'),
    target_policy_bytes: targetBytes.toString('utf8'),
    added_maps: addedMaps,
    changelog_path: oldPolicy.changelog_path,
    changelog_preimage: changelog.toString('utf8'),
    actor: values['--actor'],
    instruction_ref: values['--instruction-ref'],
    created_at: values['--timestamp'],
    workspace_id: workspace,
    state_digest: currentState(db, workspace, root, config),
    selector_digest: sha(selectedBytes),
    bundle_digest: selected.payload_manifest_sha256,
    source_admission: sourceAdmission,
    token: randomUUID(),
  };
  plan.fence_binding = documentationPolicyTransitionFence(plan);
  const operation = seal({
    schema: 'DocumentationPolicyTransition/v1',
    revision: 1,
    phase: 'planned',
    maintenance_released: false,
    plan,
    plan_digest: canonicalJsonDigest(plan),
    events: [],
    closeout: null,
  });
  parseDocumentationPolicyTransition(Buffer.from(json(operation)));
  return operation;
}

/** Owner authors policy; this command publishes only audit/checkpoints and its owned fence. */
export async function runDocumentationPolicyTransition(args, { onPhase } = {}) {
  const values = parse(args),
    root = values['--project-root'],
    access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root);
  const operationPath = documentationPolicyTransitionPath(values['--work-id']);
  const saved = ['inspect', 'plan'].includes(values['--mode'])
    ? null
    : parseDocumentationPolicyTransition(access.readBytes(operationPath, 'policy transition admission'));
  const frozenAdmission = saved?.plan.source_admission ?? null;
  const admitted = values['--forward-operation'] || frozenAdmission;
  requireTransition(
    !hasForwardOverlay(root) || admitted,
    'forward maintenance requires sealed administrative admission',
  );
  let sourceAdmission = null;
  if (admitted) {
    const targetPath = values['--target-policy'] ?? frozenAdmission?.target_path;
    const admittedContext = loadProjectContext(root, config, values['--repository'], values['--project']);
    requireTransition(
      targetPath ===
        projectBindingFor(admittedContext, values['--project'])?.path_profile.paths.documentation_policy_path,
      'admitted target differs from configured canonical policy',
    );
    sourceAdmission = verifyForwardCandidateAdmission({
      root,
      payloadRoot: values['--payload-root'] ?? frozenAdmission?.payload_root,
      operationId: values['--forward-operation'] ?? frozenAdmission?.operation_id,
      moduleUrl: import.meta.url,
      targetPath,
    });
    requireTransition(
      !frozenAdmission || canonicalJsonDigest(sourceAdmission) === canonicalJsonDigest(frozenAdmission),
      'frozen administrative source admission differs',
    );
  }
  const databasePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
  access.readBytes(databasePath, 'existing host database');
  const db = new Database(path.join(root, databasePath), {
    readonly: ['inspect', 'plan'].includes(values['--mode']),
    strict: true,
  });
  try {
    if (['inspect', 'plan'].includes(values['--mode'])) {
      const operation = planning(values, root, access, config, db, sourceAdmission);
      if (values['--mode'] === 'plan')
        access.writeExclusive(operationPath, json(operation), 'policy transition operation');
      return {
        status: values['--mode'] === 'plan' ? 'planned' : 'inspect_ready_unauthorized',
        operation_path: operationPath,
        writes_policy: false,
      };
    }
    return await access.withExclusiveLockAsync(operationPath, 'policy transition', async () => {
      let bytes = access.readBytes(operationPath, 'policy transition'),
        operation = parseDocumentationPolicyTransition(bytes);
      const plan = operation.plan;
      requireTransition(
        plan.operation_id === values['--repair-id'] &&
          plan.repository_root === root &&
          plan.work_id === values['--work-id'] &&
          plan.repository_id === values['--repository'] &&
          plan.project_id === values['--project'],
        'operation identity differs',
      );
      const input = {
        repository_root: root,
        repository_id: plan.repository_id,
        project_id: plan.project_id,
        work_id: plan.work_id,
        source_revision: plan.source_revision,
      };
      const save = async (changes) => {
        const next = seal({ ...operation, ...changes, revision: operation.revision + 1 });
        parseDocumentationPolicyTransition(Buffer.from(json(next)));
        await access.replaceAtomicAsync(operationPath, sha(bytes), json(next), 'policy transition phase');
        bytes = Buffer.from(json(next));
        operation = next;
      };
      const context = () => {
        requireTransition(
          runtimeConfigDigest(loadRuntimeConfig(root)) === plan.config_digest &&
            sha(access.readBytes(`.agent/work/${plan.work_id}/scope.json`, 'accepted scope')) ===
              plan.scope_file_digest &&
            sha(access.readBytes(plan.baseline_path, 'immutable baseline')) === plan.baseline_file_digest &&
            sha(access.readBytes('.agent/active-runtime-selector.v1.json', 'selector')) === plan.selector_digest &&
            currentState(db, plan.workspace_id, root, config) === plan.state_digest,
          'config/scope/baseline/selector/global versions changed',
        );
        const policy = access.readText(plan.policy_path, 'authored policy');
        requireTransition(
          policy === plan.old_policy_bytes || policy === plan.target_policy_bytes,
          'third policy bytes',
        );
        const expectedChangelog = plan.changelog_preimage + operation.events.map((event) => event.bytes).join('');
        const actual = access.readText(plan.changelog_path, 'current changelog');
        requireTransition(
          actual === plan.changelog_preimage || actual === expectedChangelog,
          'changelog preimage/suffix differs',
        );
        return { old: policy === plan.old_policy_bytes, expectedChangelog, actual };
      };
      const verifier = {
        principal: 'vida-agent-documentation-policy-transition',
        projectIds: plan.project_ids,
        verify: async (held) => {
          const current = context();
          if (canonicalJsonDigest(held.binding) !== canonicalJsonDigest(plan.fence_binding)) return null;
          if (operation.phase === 'abandoned_no_effect') {
            if (!current.old || current.actual !== plan.changelog_preimage) return null;
          } else if (operation.phase === 'applied') {
            if (current.old || current.actual !== current.expectedChangelog) return null;
            await executeDocumentationClearFromWork(input, 'verify');
          } else return null;
          return {
            schema: 'MaintenanceReleaseAuthorization/v1',
            principal: verifier.principal,
            fence_digest: canonicalJsonDigest(held),
            closure_digest: plan.fence_binding.closure_digest,
            bundle_digest: plan.bundle_digest,
          };
        },
      };
      const store = new HostStateStore(db, plan.workspace_id, undefined, undefined, undefined, verifier, root);
      const current = context();
      if (values['--mode'] === 'restore')
        requireTransition(
          current.old &&
            current.actual === plan.changelog_preimage &&
            operation.events.length === 0 &&
            operation.closeout === null,
          'actual rollback forbidden; resume forward',
        );
      if (operation.maintenance_released) {
        requireTransition(['applied', 'abandoned_no_effect'].includes(operation.phase), 'terminal phase differs');
        if (operation.phase === 'applied') await executeDocumentationClearFromWork(input, 'verify');
        return { status: operation.phase, rollback_performed: false, writes_policy: false };
      }
      let held = store.readMaintenanceFence();
      const own = held && canonicalJsonDigest(held.binding) === canonicalJsonDigest(plan.fence_binding);
      if (values['--mode'] === 'restore') {
        requireTransition(
          current.old &&
            current.actual === plan.changelog_preimage &&
            operation.events.length === 0 &&
            !operation.closeout &&
            plan.added_maps.every((entry) => sha(access.readBytes(entry.path, 'unchanged map')) === entry.sha256),
          'actual rollback forbidden; resume forward',
        );
        requireTransition(
          !access.fileExists(plan.baseline_path.replace('baseline', 'closeout'), 'no-effect closeout absence'),
          'closeout exists; cleanup is not no-effect',
        );
        requireTransition(!held || held.status === 'released' || own, 'foreign fence');
        await save({ phase: 'abandoned_no_effect', maintenance_released: !own });
        if (!own) return { status: 'abandoned_no_effect', rollback_performed: false, writes_policy: false };
      } else if (operation.phase === 'planned') {
        requireTransition(
          current.old &&
            plan.added_maps.every((entry) => sha(access.readBytes(entry.path, 'pre-edit map')) === entry.sha256),
          'policy/maps edited before fence',
        );
        held = store.acquireMaintenanceFenceWithRecordedToken(plan.fence_binding, plan.token).fence;
        onPhase?.('fence_acquired');
        await save({ phase: 'fenced' });
        onPhase?.('fenced');
        return { status: 'author_policy_required', maintenance_held: true, writes_policy: false };
      } else {
        requireTransition(
          own && (held.status === 'held' || (held.status === 'released' && operation.phase === 'applied')),
          'own held fence or applied release required',
        );
        if (held.status === 'released') {
          await executeDocumentationClearFromWork(input, 'verify');
          await save({ maintenance_released: true });
          return { status: 'applied', writes_policy: false, rollback_performed: false };
        }
        store.assertMaintenanceFence({ fence: held, token: plan.token });
        if (current.old) return { status: 'author_policy_required', maintenance_held: true, writes_policy: false };
        if (!operation.events.length) {
          const baseline = JSON.parse(access.readText(plan.baseline_path, 'baseline'));
          const scope = JSON.parse(access.readText(`.agent/work/${plan.work_id}/scope.json`, 'scope'));
          const before = [...baseline.documents, ...plan.added_maps];
          const events = before.flatMap((entry) => {
            const after = sha(access.readBytes(entry.path, 'governed current document'));
            if (after === entry.sha256) return [];
            requireTransition(scope.allowed_paths.includes(entry.path), 'unscoped documentation mutation');
            const eventId = `documentation-transition-${canonicalJsonDigest({ work: plan.work_id, path: entry.path, before: entry.sha256, after })}`;
            const event = {
              schema: 'DocumentationChangeEvent/v1',
              event_id: eventId,
              logical_edit_id: eventId,
              work_id: plan.work_id,
              source_revision: plan.source_revision,
              operation: 'finalize',
              document_id: entry.path,
              path_before: entry.path,
              path_after: entry.path,
              before_sha256: entry.sha256,
              after_sha256: after,
              actor: plan.actor,
              pointer: plan.instruction_ref,
              timestamp: plan.created_at,
            };
            requireTransition(validEvent(event), 'event schema invalid');
            return [{ path: entry.path, bytes: JSON.stringify(event) + '\n' }];
          });
          requireTransition(
            events.some((event) => event.path === plan.policy_path),
            'policy change event absent',
          );
          await save({ events });
          onPhase?.('events_frozen');
        }
        await access.withExclusiveLockAsync(`${plan.changelog_path}.lock`, 'policy transition changelog', async () => {
          const latest = context();
          if (latest.actual === plan.changelog_preimage)
            await access.replaceAtomicAsync(
              plan.changelog_path,
              sha(Buffer.from(latest.actual)),
              latest.expectedChangelog,
              'documentation transition events',
            );
        });
        onPhase?.('events_published');
        const closeoutPath = plan.baseline_path.replace('baseline', 'closeout');
        if (!access.fileExists(closeoutPath, 'actual closeout'))
          await executeDocumentationClearFromWork(input, 'closeout');
        const result = await executeDocumentationClearFromWork(input, 'verify');
        const closeout = { path: result.path, sha256: result.sha256, checkpoint_digest: result.checkpoint_digest };
        requireTransition(
          !operation.closeout || canonicalJsonDigest(operation.closeout) === canonicalJsonDigest(closeout),
          'closeout replay differs',
        );
        await save({ phase: 'applied', closeout });
        onPhase?.('applied');
      }
      if (held.status === 'held') await store.releaseMaintenanceFence({ fence: held, token: plan.token });
      else requireTransition(held.status === 'released', 'release state differs');
      onPhase?.('released');
      await save({ maintenance_released: true });
      return { status: operation.phase, rollback_performed: false, writes_policy: false };
    });
  } finally {
    db.close();
  }
}
