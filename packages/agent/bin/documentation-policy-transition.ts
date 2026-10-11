import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import scopeSchema from '../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import policySchema from '../schemas/documentation-policy.v1.schema.json' with { type: 'json' };
import baselineSchema from '../schemas/documentation-clear-checkpoint.v1.schema.json' with { type: 'json' };
import eventSchema from '../schemas/documentation-change-event.v1.schema.json' with { type: 'json' };
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { loadProjectContext, projectBindingFor } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

import { currentState } from './runtime-config-rebind.ts';
import { hasForwardOverlay, verifyForwardCandidateAdmission } from './forward-candidate-admission.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { executeDocumentationClearFromWork } from '../src/documentation/clear.ts';
import {
  documentationPolicyTransitionPath,
  validatePolicyMapAddition,
  parseDocumentationPolicyTransition,
  documentationPolicyTransitionFence,
} from '../src/documentation/policy-transition.ts';
import type { Database as SqliteDatabase } from 'bun:sqlite';
import type { MaintenanceFenceBinding as FenceBinding } from '../src/host-state.ts';

type CliValues = Record<string, string> & {
  '--mode': string;
  '--project-root': string;
  '--repair-id': string;
  '--kind': string;
  '--work-id': string;
  '--repository': string;
  '--project': string;
  '--actor'?: string;
  '--instruction-ref'?: string;
  '--baseline'?: string;
  '--timestamp'?: string;
  '--target-policy'?: string;
  '--forward-operation'?: string;
  '--payload-root'?: string;
};
type PlanningCliValues = CliValues &
  Required<Pick<CliValues, '--actor' | '--instruction-ref' | '--baseline' | '--timestamp'>>;
type AddedMap = { readonly path: string; readonly sha256: string; readonly bytes: string; readonly size: number };
type TransitionEvent = { readonly path: string; readonly bytes: string };
type TransitionCloseout = { readonly path: string; readonly sha256: string; readonly checkpoint_digest: string };
type TransitionChanges = Partial<Pick<TransitionOperation, 'phase' | 'maintenance_released' | 'events' | 'closeout'>>;
type ForwardAdmission = ReturnType<typeof verifyForwardCandidateAdmission>;
type VerifiedForwardAdmission = ForwardAdmission & {
  readonly payload_root: string;
  readonly target_path: string;
  readonly operation_id: string;
};
type TransitionPlan = {
  readonly operation_id: string;
  readonly repository_root: string;
  readonly repository_id: string;
  readonly project_ids: string[];
  readonly project_id: string;
  readonly work_id: string;
  readonly source_revision: string;
  readonly scope_digest: string;
  readonly scope_file_digest: string;
  readonly project_context_digest: string;
  readonly config_digest: string;
  readonly baseline_path: string;
  readonly baseline_digest: string;
  readonly baseline_file_digest: string;
  readonly policy_path: string;
  readonly old_policy_bytes: string;
  readonly target_policy_bytes: string;
  readonly added_maps: AddedMap[];
  readonly changelog_path: string;
  readonly changelog_preimage: string;
  readonly actor: string;
  readonly instruction_ref: string;
  readonly created_at: string;
  readonly workspace_id: string;
  readonly state_digest: string;
  readonly selector_digest: string;
  readonly bundle_digest: string;
  readonly source_admission: VerifiedForwardAdmission | null;
  readonly token: string;
  readonly fence_binding: FenceBinding;
};
type TransitionPlanBase = Omit<TransitionPlan, 'fence_binding'>;
type TransitionOperation = {
  readonly schema: 'DocumentationPolicyTransition/v1';
  readonly revision: number;
  readonly phase: string;
  readonly maintenance_released: boolean;
  readonly plan: TransitionPlan;
  readonly plan_digest: string;
  readonly events: TransitionEvent[];
  readonly closeout: TransitionCloseout | null;
};
type ScopeEvidence = {
  readonly work_id: string;
  readonly owner: string;
  readonly attribution: { readonly pointer: string };
  readonly allowed_paths: string[];
  readonly documentation_paths: string[];
  readonly source_revision: string;
};
type BaselineEvidence = {
  readonly digest: string;
  readonly phase: string;
  readonly status: string;
  readonly work_id: string;
  readonly source_revision: string;
  readonly scope_digest: string;
  readonly config_digest: string;
  readonly project_context_digest: string;
  readonly policy_path: string;
  readonly policy_digest: string;
  readonly documents: Array<{ readonly path: string; readonly sha256: string }>;
  readonly created_at: string;
};
type PolicyEvidence = {
  readonly source_path: string;
  readonly changelog_required: boolean;
  readonly changelog_path: string;
  readonly excluded_roots: string[];
};
type ActiveSelectorEvidence = { readonly schema: 'ActiveRuntimeSelector/v1'; readonly payload_manifest_sha256: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCliValues(value: Record<string, string>): value is CliValues {
  return ['--mode', '--project-root', '--repair-id', '--kind', '--work-id', '--repository', '--project'].every(
    (key) => typeof value[key] === 'string',
  );
}

function isPlanningCliValues(value: CliValues): value is PlanningCliValues {
  return ['--actor', '--instruction-ref', '--baseline', '--timestamp'].every((key) => typeof value[key] === 'string');
}

function checkedCliValues(value: Record<string, string>): CliValues {
  if (!isCliValues(value)) throw Error('documentation policy transition: required option absent');
  return value;
}

function isForwardAdmission(value: unknown): value is VerifiedForwardAdmission {
  return (
    isRecord(value) &&
    typeof value.payload_root === 'string' &&
    typeof value.target_path === 'string' &&
    typeof value.operation_id === 'string'
  );
}

function isFenceBinding(value: unknown): value is FenceBinding {
  return (
    isRecord(value) &&
    value.schema === 'MaintenanceFenceBinding/v1' &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((entry) => typeof entry === 'string') &&
    typeof value.operation_id === 'string' &&
    typeof value.manifest_digest === 'string' &&
    typeof value.request_digest === 'string' &&
    typeof value.bindings_digest === 'string' &&
    typeof value.closure_digest === 'string' &&
    typeof value.bundle_digest === 'string'
  );
}

function requiredTargetPath(value: string | undefined): string {
  if (typeof value !== 'string' || !value)
    throw Error('documentation policy transition: target policy path is required');
  return value;
}

function requiredAdmissionString(value: string | undefined, field: string): string {
  requireTransition(typeof value === 'string' && value.length > 0, 'forward admission ' + field + ' is required');
  return value;
}

function isScopeEvidence(value: unknown): value is ScopeEvidence {
  return (
    isRecord(value) &&
    typeof value.work_id === 'string' &&
    typeof value.owner === 'string' &&
    isRecord(value.attribution) &&
    typeof value.attribution.pointer === 'string' &&
    Array.isArray(value.allowed_paths) &&
    value.allowed_paths.every((entry) => typeof entry === 'string') &&
    Array.isArray(value.documentation_paths) &&
    value.documentation_paths.every((entry) => typeof entry === 'string') &&
    typeof value.source_revision === 'string'
  );
}

function isBaselineEvidence(value: unknown): value is BaselineEvidence {
  return isRecord(value) && hasBaselineIdentity(value) && hasBaselineDocuments(value);
}

function hasBaselineIdentity(value: Record<string, unknown>): boolean {
  return hasBaselineDigestFields(value) && hasBaselineScopeFields(value) && hasBaselinePolicyFields(value);
}

function hasBaselineDigestFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.digest === 'string' &&
    typeof value.phase === 'string' &&
    typeof value.status === 'string' &&
    typeof value.work_id === 'string'
  );
}

function hasBaselineScopeFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.source_revision === 'string' &&
    typeof value.scope_digest === 'string' &&
    typeof value.config_digest === 'string' &&
    typeof value.project_context_digest === 'string'
  );
}

function hasBaselinePolicyFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.policy_path === 'string' &&
    typeof value.policy_digest === 'string' &&
    typeof value.created_at === 'string'
  );
}

function hasBaselineDocuments(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.documents) &&
    value.documents.every(
      (entry) => isRecord(entry) && typeof entry.path === 'string' && typeof entry.sha256 === 'string',
    )
  );
}

function isPolicyEvidence(value: unknown): value is PolicyEvidence {
  return (
    isRecord(value) &&
    typeof value.source_path === 'string' &&
    typeof value.changelog_required === 'boolean' &&
    typeof value.changelog_path === 'string' &&
    Array.isArray(value.excluded_roots) &&
    value.excluded_roots.every((entry) => typeof entry === 'string')
  );
}

function readScopeEvidence(bytes: Uint8Array): ScopeEvidence {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  requireTransition(isScopeEvidence(value), 'scope shape invalid');
  requireTransition(validScope(value), 'scope schema invalid');
  return value;
}

function readBaselineEvidence(bytes: Uint8Array): BaselineEvidence {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  requireTransition(isBaselineEvidence(value), 'baseline shape invalid');
  requireTransition(validBaseline(value), 'baseline schema invalid');
  return value;
}

function readPolicyEvidence(bytes: Uint8Array): PolicyEvidence {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  requireTransition(isPolicyEvidence(value), 'policy shape invalid');
  requireTransition(validPolicy(value), 'policy schema invalid');
  return value;
}

function isActiveSelector(value: unknown): value is ActiveSelectorEvidence {
  return (
    isRecord(value) &&
    value.schema === 'ActiveRuntimeSelector/v1' &&
    typeof value.payload_manifest_sha256 === 'string' &&
    /^[a-f0-9]{64}$/.test(value.payload_manifest_sha256)
  );
}

function readActiveSelector(bytes: Uint8Array): ActiveSelectorEvidence {
  const value: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
  requireTransition(isActiveSelector(value), 'selected runtime invalid');
  return value;
}

function isTransitionPlan(value: unknown): value is TransitionPlan {
  const strings = [
    'operation_id',
    'repository_root',
    'repository_id',
    'project_id',
    'work_id',
    'source_revision',
    'scope_digest',
    'scope_file_digest',
    'project_context_digest',
    'config_digest',
    'baseline_path',
    'baseline_digest',
    'baseline_file_digest',
    'policy_path',
    'old_policy_bytes',
    'target_policy_bytes',
    'changelog_path',
    'changelog_preimage',
    'actor',
    'instruction_ref',
    'created_at',
    'workspace_id',
    'state_digest',
    'selector_digest',
    'bundle_digest',
    'token',
  ];
  return (
    isRecord(value) &&
    strings.every((key) => typeof value[key] === 'string') &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((entry) => typeof entry === 'string') &&
    Array.isArray(value.added_maps) &&
    value.added_maps.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.path === 'string' &&
        typeof entry.sha256 === 'string' &&
        typeof entry.bytes === 'string' &&
        typeof entry.size === 'number',
    ) &&
    (value.source_admission === null || isForwardAdmission(value.source_admission)) &&
    isFenceBinding(value.fence_binding)
  );
}

function isTransitionOperation(value: unknown): value is TransitionOperation {
  return (
    isRecord(value) &&
    hasTransitionOperationFields(value) &&
    hasTransitionEvents(value) &&
    hasTransitionCloseout(value) &&
    isTransitionPlan(value.plan)
  );
}

function hasTransitionOperationFields(value: Record<string, unknown>): boolean {
  return (
    value.schema === 'DocumentationPolicyTransition/v1' &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    typeof value.phase === 'string' &&
    typeof value.maintenance_released === 'boolean' &&
    typeof value.plan_digest === 'string'
  );
}

function hasTransitionEvents(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.events) &&
    value.events.every((event) => isRecord(event) && typeof event.path === 'string' && typeof event.bytes === 'string')
  );
}

function hasTransitionCloseout(value: Record<string, unknown>): boolean {
  return (
    value.closeout === null ||
    (isRecord(value.closeout) &&
      typeof value.closeout.path === 'string' &&
      typeof value.closeout.sha256 === 'string' &&
      typeof value.closeout.checkpoint_digest === 'string')
  );
}

function parseTransition(bytes: Uint8Array): TransitionOperation {
  const value = parseDocumentationPolicyTransition(bytes);
  if (!isTransitionOperation(value)) throw Error('documentation policy transition: parsed operation shape differs');
  return value;
}

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';
const seal = (value: Record<string, unknown>): Record<string, unknown> => {
  const { operation_digest: _digest, ...body } = value;
  return { ...body, operation_digest: canonicalJsonDigest(body) };
};
function requireTransition(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(`documentation policy transition: ${message}`);
}
const ajv = new Ajv2020({ strict: true, allErrors: true, formats: { 'date-time': true } });
const validScope = ajv.compile(scopeSchema),
  validPolicy = ajv.compile(policySchema),
  validBaseline = ajv.compile(baselineSchema),
  validEvent = ajv.compile(eventSchema);

function parse(args: string[]): CliValues {
  const values: Record<string, string> = {};
  requireTransition(args.length % 2 === 0, 'arguments must be paired');
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i],
      value = args[i + 1];
    requireTransition(
      typeof key === 'string' &&
        key.startsWith('--') &&
        typeof value === 'string' &&
        value.length > 0 &&
        !Object.hasOwn(values, key),
      'invalid arguments',
    );
    values[key] = value;
  }
  const cliValues = checkedCliValues(values);
  const mode = cliValues['--mode'],
    projectRoot = cliValues['--project-root'],
    repairId = cliValues['--repair-id'];
  const keys = expectedOptionKeys(mode, cliValues);
  requireTransition(
    Object.keys(cliValues).sort().join('|') === keys.sort().join('|') &&
      cliValues['--kind'] === 'documentation-policy' &&
      path.isAbsolute(projectRoot) &&
      path.resolve(projectRoot) === projectRoot &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(repairId),
    'mode, root or arguments invalid',
  );
  return cliValues;
}

function expectedOptionKeys(mode: string, values: CliValues): string[] {
  const contract = reconcileCliContracts['documentation-policy'];
  requireTransition(contract !== undefined && contract.modes.includes(mode), 'CLI contract or mode is absent');
  return reconcileExpectedOptions('documentation-policy', mode, values) ?? [];
}

function planning(
  values: CliValues,
  root: string,
  access: ReturnType<typeof requireSafeRepositoryAccess>,
  config: ReturnType<typeof loadRuntimeConfig>,
  db: SqliteDatabase,
  sourceAdmission: VerifiedForwardAdmission | null,
): TransitionOperation {
  requireTransition(isPlanningCliValues(values), 'planning inputs are absent');
  const workId = values['--work-id'],
    context = loadProjectContext(root, config, values['--repository'], values['--project']);
  const project = projectBindingFor(context, values['--project']);
  requireTransition(project, 'project binding absent');
  const scopeBytes = access.readBytes(`.agent/work/${workId}/scope.json`, 'accepted documentation scope');
  const scope = readScopeEvidence(scopeBytes);
  requireTransition(
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
  const baselineBytes = access.readBytes(baselinePath, 'genuine pre-edit baseline');
  const baseline = readBaselineEvidence(baselineBytes);
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
  const authoredTargetPath = values['--target-policy'];
  const targetBytes = sourceAdmission
    ? readFileSync(path.join(sourceAdmission.payload_root, sourceAdmission.target_path))
    : access.readBytes(requiredTargetPath(authoredTargetPath), 'authored target policy');
  const oldPolicy = readPolicyEvidence(oldBytes),
    target = readPolicyEvidence(targetBytes);
  requireTransition(
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
      .every((line) => {
        const event: unknown = JSON.parse(line);
        return validEvent(event);
      }),
    'changelog schema invalid',
  );
  requireTransition(
    Number.isFinite(Date.parse(values['--timestamp'])) &&
      Date.parse(values['--timestamp']) >= Date.parse(baseline.created_at) &&
      Date.parse(values['--timestamp']) <= Date.now(),
    'planning time predates baseline or is future',
  );
  const selectedBytes = access.readBytes('.agent/active-runtime-selector.v1.json', 'selected runtime');
  const selected = readActiveSelector(selectedBytes);
  const workspace = deriveWorkspaceId(config.repository.repository_id, root);
  const plan: TransitionPlanBase = {
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
  const generatedFenceBinding = documentationPolicyTransitionFence(plan);
  requireTransition(isFenceBinding(generatedFenceBinding), 'generated maintenance fence binding is malformed');
  const completePlan = { ...plan, fence_binding: generatedFenceBinding };
  const operation = seal({
    schema: 'DocumentationPolicyTransition/v1',
    revision: 1,
    phase: 'planned',
    maintenance_released: false,
    plan: completePlan,
    plan_digest: canonicalJsonDigest(completePlan),
    events: [],
    closeout: null,
  });
  return parseTransition(Buffer.from(json(operation)));
}

/** Owner authors policy; this command publishes only audit/checkpoints and its owned fence. */
export async function runDocumentationPolicyTransition(
  args: string[],
  { onPhase }: { readonly onPhase?: (phase: string) => void } = {},
): Promise<Record<string, unknown>> {
  const values = parse(args),
    root = values['--project-root'],
    access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root);
  const operationPath = documentationPolicyTransitionPath(values['--work-id']);
  const saved = ['inspect', 'plan'].includes(values['--mode'])
    ? null
    : parseTransition(access.readBytes(operationPath, 'policy transition admission'));
  const frozenAdmission = saved?.plan.source_admission ?? null;
  const admitted = values['--forward-operation'] || frozenAdmission;
  requireTransition(
    !hasForwardOverlay(root) || admitted,
    'forward maintenance requires sealed administrative admission',
  );
  let sourceAdmission: VerifiedForwardAdmission | null = null;
  if (admitted) {
    const targetPath = requiredTargetPath(values['--target-policy'] ?? frozenAdmission?.target_path);
    const admittedContext = loadProjectContext(root, config, values['--repository'], values['--project']);
    requireTransition(
      targetPath ===
        projectBindingFor(admittedContext, values['--project'])?.path_profile.paths.documentation_policy_path,
      'admitted target differs from configured canonical policy',
    );
    const verifiedAdmission = verifyForwardCandidateAdmission({
      root,
      payloadRoot: requiredAdmissionString(values['--payload-root'] ?? frozenAdmission?.payload_root, 'payload root'),
      operationId: requiredAdmissionString(
        values['--forward-operation'] ?? frozenAdmission?.operation_id,
        'operation ID',
      ),
      moduleUrl: import.meta.url,
      targetPath,
    });
    requireTransition(isForwardAdmission(verifiedAdmission), 'forward admission evidence is malformed');
    sourceAdmission = verifiedAdmission;
    requireTransition(
      !frozenAdmission || canonicalJsonDigest(sourceAdmission) === canonicalJsonDigest(frozenAdmission),
      'frozen administrative source admission differs',
    );
  }
  const databasePath = sessionHandoffDatabaseRelativePath(config);
  access.readBytes(databasePath, 'existing host database');
  const db = openCliWorkspaceDatabase(
    root,
    path.join(root, databasePath),
    deriveWorkspaceId(config.repository.repository_id, root),
    ['inspect', 'plan'].includes(values['--mode']),
  );
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
        operation = parseTransition(bytes);
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
      const save = async (changes: TransitionChanges): Promise<void> => {
        const next = seal({ ...operation, ...changes, revision: operation.revision + 1 });
        const parsedNext = parseTransition(Buffer.from(json(next)));
        await access.replaceAtomicAsync(operationPath, sha(bytes), json(next), 'policy transition phase');
        bytes = Buffer.from(json(next));
        operation = parsedNext;
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
      const verifier: import('../src/host-state.ts').MaintenanceReleaseVerifier = {
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
      const store = createCliHostStateStore(db, plan.workspace_id, undefined, undefined, undefined, verifier, root);
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
        requireTransition(held !== null, 'owned maintenance fence is unavailable');
        requireTransition(
          own && (held.status === 'held' || (held.status === 'released' && operation.phase === 'applied')),
          'own held fence or applied release required',
        );
        requireTransition(held !== null, 'owned maintenance fence is unavailable');
        if (held.status === 'released') {
          await executeDocumentationClearFromWork(input, 'verify');
          await save({ maintenance_released: true });
          return { status: 'applied', writes_policy: false, rollback_performed: false };
        }
        store.assertMaintenanceFence({ fence: held, token: plan.token });
        if (current.old) return { status: 'author_policy_required', maintenance_held: true, writes_policy: false };
        if (!operation.events.length) {
          const baseline = readBaselineEvidence(Buffer.from(access.readText(plan.baseline_path, 'baseline')));
          const scope = readScopeEvidence(
            Buffer.from(access.readText(`.agent/work/${plan.work_id}/scope.json`, 'scope')),
          );
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
      requireTransition(held !== null, 'maintenance fence is unavailable for release');
      if (held.status === 'held') await store.releaseMaintenanceFence({ fence: held, token: plan.token });
      else requireTransition(held.status === 'released', 'release state differs');
      onPhase?.('released');
      await save({ maintenance_released: true });
      return { status: operation.phase, rollback_performed: false, writes_policy: false };
    });
  } finally {
    closeWorkspaceDatabaseWithAdmission(db);
  }
}
