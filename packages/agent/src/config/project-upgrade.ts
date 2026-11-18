import path from 'node:path';
import { z } from 'zod';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import { HostStateStore, type MaintenanceFenceBinding, type MaintenanceFenceReceipt } from '../host-state.js';
import { deriveWorkspaceId } from '../workspace-identity.js';
import { prepareProjectUpgradeArtifacts, projectUpgradeDependencyPaths } from './project-upgrade-artifacts.js';
import {
  LEGACY_RUNTIME_CONFIGURATION_PATH,
  PROJECT_UPGRADE_OPERATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
  PROJECT_ACTIVATION_PATH,
  PROJECT_INITIALIZATION_PATH,
  projectUpgradeHistoryPath,
} from './project-paths.js';
import { validateInitialWorkspaceDatabaseImage } from './project-upgrade-storage.js';
import {
  initialWorkspaceImageSchema,
  unifiedDatabaseImageSchema,
  validateUnifiedDatabaseImage,
  type WorkspaceBootstrapBinding,
} from './project-upgrade-existing-storage.js';
import {
  prepareProjectUpgradeActivation,
  validateProjectActivation,
  projectInitializationIdentityDigest,
} from './project-activation.js';
import type { ProjectInitializationReceipt } from './project-initialization-record.js';
import {
  parseRuntimeConfigDocument,
  validateRuntimeConfig,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from './runtime-config.js';
import {
  repositoryReadOnlyObservation,
  requireSafeRepositoryAccess,
  type SafeRepositoryAccess,
} from './safe-repository-access.js';

export { PROJECT_UPGRADE_OPERATION_PATH } from './project-paths.js';
const byteLimit = 8 * 1024 * 1024;
const label = 'VIDA project upgrade';
const digest = (text: string): string => new Bun.CryptoHasher('sha256').update(text).digest('hex');
const id = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/u);
const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const attribution = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => value === value.trim() && !/\p{Cc}/u.test(value));
const text = z.string().refine((value) => Buffer.from(value, 'utf8').toString('utf8') === value);
const relative = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.includes('\\') &&
      !path.posix.isAbsolute(value) &&
      value.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
  );
const fileSchema = z.strictObject({ path: relative, before: text.nullable(), after: text });
const dependencySchema = z.strictObject({ path: relative, bytes: text.nullable() });
const planSchema = z.strictObject({
  schema: z.literal('VidaProjectUpgradePlan/v1'),
  operation_id: id,
  repository_root: z.string().refine((value) => path.isAbsolute(value) && path.resolve(value) === value),
  repository_identity: z.string().min(1).max(2048),
  repository_id: z.string().min(1).max(128),
  project_ids: z.array(z.string().min(1).max(128)).min(1),
  workspace_id: hash,
  actor: attribution,
  instruction_ref: attribution,
  token: z.uuid(),
  bundle_digest: hash,
  input_digest: hash,
  database_mode: z.enum(['existing', 'fresh']),
  created_at: z.iso.datetime({ precision: 3 }),
  dependencies: z.array(dependencySchema).min(1).max(256),
  files: z.array(fileSchema).min(7).max(256),
});
const operationSchema = z.strictObject({
  schema: z.literal('VidaProjectUpgradeOperation/v1'),
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  phase: z.enum([
    'intent_prepared',
    'intent_moving',
    'unknown_intent_move',
    'planned',
    'fenced',
    'publishing',
    'files_published',
    'unknown',
    'activation_writing',
    'activation_staged',
    'activating',
    'activated',
    'unknown_activation_write',
    'unknown_activation_move',
    'releasing',
    'released',
    'unknown_release',
    'retiring',
    'unknown_retirement',
    'completed',
  ]),
  next_file: z.number().int().min(0).max(256),
  plan: planSchema,
  plan_digest: hash,
  initial_database: initialWorkspaceImageSchema.nullable(),
  existing_database: unifiedDatabaseImageSchema.nullable(),
  storage_phase: z.enum([
    'existing',
    'merge_preparing',
    'merge_prepared',
    'merge_writing',
    'merge_staged',
    'merge_moving',
    'merge_published',
    'merge_unknown_write',
    'merge_unknown_move',
    'absent',
    'writing',
    'staged',
    'moving',
    'published',
    'unknown_write',
    'unknown_move',
  ]),
  staging_identity: z
    .strictObject({ device: z.string(), inode: z.string(), size: z.number().int().positive(), sha256: hash })
    .nullable(),
  activation: text.nullable(),
});
export type ProjectUpgradePlan = z.infer<typeof planSchema>;
export type ProjectUpgradeOperation = z.infer<typeof operationSchema>;
const validatedOperations = new WeakSet<object>();
let originalConfiguration: { bytes: string; config: ReturnType<typeof validateRuntimeConfig> } | undefined;
// One process-local marker for a pure closure; no files, live ownership or authority are cached.
let verifiedArtifactPlanDigest: string | null = null;

function requireUpgrade(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(label + ': ' + message);
}

function image(access: SafeRepositoryAccess, file: string): string | null {
  const observation = repositoryReadOnlyObservation(access);
  if (!observation.fileExists(file, label)) {
    requireUpgrade(!observation.fileExists(file, label), 'target appeared during observation');
    return null;
  }
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(observation.readBytes(file, label));
}

function bundleDigest(): string {
  const access = runtimePackageAccess();
  const read = access.readVerifiedCaptureBytes ?? access.readBytes;
  const prefix = 'runtime-package/';
  const files = runtimePackageCodePaths('runtime-package', access);
  return canonicalJsonDigest(
    files.map((file) => ({
      path: file,
      digest: new Bun.CryptoHasher('sha256').update(read(file.slice(prefix.length), label)).digest('hex'),
    })),
  );
}

function originalConfig(plan: ProjectUpgradePlan) {
  const source = plan.dependencies.find((entry) => entry.path === LEGACY_RUNTIME_CONFIGURATION_PATH);
  requireUpgrade(source?.bytes !== null && source?.bytes !== undefined, 'original configuration is missing');
  if (originalConfiguration?.bytes === source.bytes) return originalConfiguration.config;
  // Only exact original YAML data is memoized; filesystem, bundle and Host proofs stay live.
  const config = freezeJsonValue(validateRuntimeConfig(parseRuntimeConfigDocument(source.bytes)));
  originalConfiguration = { bytes: source.bytes, config };
  return config;
}

function projectUpgradeBootstrapBinding(operation: ProjectUpgradeOperation): WorkspaceBootstrapBinding {
  return {
    schema: 'VidaWorkspaceBootstrap/v1',
    operation_id: operation.plan.operation_id,
    workspace_id: operation.plan.workspace_id,
    plan_digest: operation.plan_digest,
    bundle_digest: operation.plan.bundle_digest,
    input_digest: operation.plan.input_digest,
    authority_digest: canonicalJsonDigest({
      actor: operation.plan.actor,
      instruction_ref: operation.plan.instruction_ref,
    }),
    token_digest: digest(operation.plan.token),
  };
}

/** Validate frozen intent again on restart. A valid journal grants no execution or activation rights. */
export function validateProjectUpgradeOperation(value: unknown): ProjectUpgradeOperation {
  if (value !== null && typeof value === 'object' && validatedOperations.has(value))
    return value as ProjectUpgradeOperation;
  const checked: unknown = JSON.parse(canonicalJson(value));
  const operation = operationSchema.parse(checked);
  const plan = operation.plan;
  requireUpgrade(canonicalJsonDigest(plan) === operation.plan_digest, 'frozen plan differs');
  requireUpgrade(
    deriveWorkspaceId(plan.repository_id, plan.repository_root) === plan.workspace_id,
    'foreign workspace',
  );
  requireUpgrade(
    plan.project_ids.every((project, index) => index === 0 || plan.project_ids[index - 1]! < project),
    'project set is not exact and sorted',
  );
  requireUpgrade(
    new Set(plan.dependencies.map((entry) => entry.path)).size === plan.dependencies.length,
    'duplicate dependency',
  );
  const config = originalConfig(plan);
  if (operation.initial_database !== null) {
    requireUpgrade(plan.database_mode === 'fresh', 'existing storage cannot receive an empty image');
    const initial = validateInitialWorkspaceDatabaseImage(operation.initial_database);
    operation.initial_database = initial;
    requireUpgrade(
      canonicalJson(initial.binding) === canonicalJson(projectUpgradeBootstrapBinding(operation)),
      'initial database belongs to another intent',
    );
  }
  if (operation.existing_database !== null) {
    requireUpgrade(plan.database_mode === 'existing', 'fresh storage cannot contain a merged image');
    operation.existing_database = validateUnifiedDatabaseImage(operation.existing_database);
    const binding = operation.existing_database.binding;
    requireUpgrade(
      binding.operation_id === plan.operation_id &&
        binding.workspace_id === plan.workspace_id &&
        binding.plan_digest === operation.plan_digest,
      'existing image is bound to another operation',
    );
  }
  requireUpgrade(
    config.repository.repository_id === plan.repository_id &&
      canonicalJson(config.projects.map((entry) => entry.project_id).sort()) === canonicalJson(plan.project_ids),
    'original project identity differs',
  );
  assertPreparedArtifactClosure(plan, config, operation.plan_digest);
  assertPublicationProgress(operation);
  assertStorageProgress(operation);
  assertActivationProgress(operation);
  const frozen = freezeJsonValue(operation);
  validatedOperations.add(frozen);
  return frozen;
}

function assertPreparedArtifactClosure(
  plan: ProjectUpgradePlan,
  config: ReturnType<typeof originalConfig>,
  verifiedPlanDigest: string,
): void {
  // The caller has just validated the complete canonical plan digest and captured config.
  if (verifiedArtifactPlanDigest === verifiedPlanDigest) return;
  const prepared = prepareProjectUpgradeArtifacts(config, plan.dependencies, plan);
  requireUpgrade(prepared.input_digest === plan.input_digest, 'prepared configuration binding differs');
  requireUpgrade(plan.files.length === prepared.files.length, 'prepared artifact inventory differs');
  const originalPolicy = plan.dependencies.find((entry) => entry.path === 'AGENTS.md')?.bytes;
  for (const [index, output] of prepared.files.entries()) {
    const file = plan.files[index]!;
    requireUpgrade(
      file.path === output.path && file.after === output.after,
      'prepared output differs from the bundle converter',
    );
    const allowed =
      file.path === 'AGENTS.md' ? file.before === originalPolicy : file.before === null || file.before === file.after;
    requireUpgrade(allowed, 'existing artifact conflicts with legacy upgrade');
  }
  verifiedArtifactPlanDigest = verifiedPlanDigest;
}

function assertActivationProgress(operation: ProjectUpgradeOperation): void {
  const closure = [
    'activation_writing',
    'activation_staged',
    'activating',
    'activated',
    'unknown_activation_write',
    'unknown_activation_move',
    'releasing',
    'released',
    'unknown_release',
    'retiring',
    'unknown_retirement',
    'completed',
  ];
  requireUpgrade(closure.includes(operation.phase) === (operation.activation !== null), 'activation state differs');
  if (operation.activation === null) return;
  requireUpgrade(operation.next_file === operation.plan.files.length, 'activation requires the complete file closure');
  const value: unknown = JSON.parse(operation.activation);
  const activation = validateProjectActivation(value);
  requireUpgrade(
    operation.activation === prepareProjectUpgradeActivation(operation, activation.maintenance_generation),
    'activation differs from frozen intent',
  );
}

function assertStorageProgress(operation: ProjectUpgradeOperation): void {
  const fresh = operation.plan.database_mode === 'fresh';
  requireUpgrade(
    fresh ===
      ![
        'existing',
        'merge_preparing',
        'merge_prepared',
        'merge_writing',
        'merge_staged',
        'merge_moving',
        'merge_published',
        'merge_unknown_write',
        'merge_unknown_move',
      ].includes(operation.storage_phase),
    'storage mode differs',
  );
  requireUpgrade(
    fresh || (operation.initial_database === null && operation.staging_identity === null),
    'existing storage cannot receive bootstrap effects',
  );
  if (!fresh) {
    requireUpgrade(
      (operation.existing_database !== null) ===
        [
          'merge_prepared',
          'merge_writing',
          'merge_staged',
          'merge_moving',
          'merge_published',
          'merge_unknown_write',
          'merge_unknown_move',
        ].includes(operation.storage_phase),
      'existing merge image differs from journal phase',
    );
    const mergeStaged = ['merge_staged', 'merge_moving', 'merge_published', 'merge_unknown_move'].includes(
      operation.storage_phase,
    );
    requireUpgrade(mergeStaged === (operation.staging_identity !== null), 'existing staging identity differs');
    requireUpgrade(
      ['planned', 'fenced'].includes(operation.phase) || operation.storage_phase === 'merge_published',
      'configuration requires a prepared existing merge image',
    );
    return;
  }
  requireUpgrade(operation.existing_database === null, 'fresh storage cannot contain an existing merge image');
  requireUpgrade(
    operation.storage_phase === 'absent' || operation.initial_database !== null,
    'storage image is missing',
  );
  const staged = ['staged', 'moving', 'published', 'unknown_move'].includes(operation.storage_phase);
  requireUpgrade(staged === (operation.staging_identity !== null), 'staging identity differs from storage phase');
  if (operation.staging_identity !== null)
    requireUpgrade(
      operation.staging_identity.size === operation.initial_database?.size &&
        operation.staging_identity.sha256 === operation.initial_database.sha256,
      'staging identity does not match the frozen image',
    );
  requireUpgrade(
    ['intent_prepared', 'intent_moving', 'unknown_intent_move', 'planned'].includes(operation.phase) ||
      operation.storage_phase === 'published',
    'configuration requires published storage',
  );
}

function assertPublicationProgress(operation: ProjectUpgradeOperation): void {
  const plan = operation.plan;
  requireUpgrade(
    !['intent_prepared', 'intent_moving', 'unknown_intent_move', 'planned'].includes(operation.phase) ||
      operation.next_file === 0,
    'unfenced publication progress',
  );
  if (operation.phase.startsWith('intent') || operation.phase === 'unknown_intent_move')
    requireUpgrade(
      ['existing', 'absent'].includes(operation.storage_phase),
      'initial intent cannot contain storage effects',
    );
  requireUpgrade(operation.phase !== 'fenced' || operation.next_file < plan.files.length, 'invalid fenced progress');
  requireUpgrade(
    operation.phase !== 'files_published' || operation.next_file === plan.files.length,
    'publication closure is incomplete',
  );
  requireUpgrade(
    !['publishing', 'unknown'].includes(operation.phase) || operation.next_file < plan.files.length,
    'invalid publication cursor',
  );
}

export function projectUpgradeFenceBinding(operation: ProjectUpgradeOperation): MaintenanceFenceBinding {
  const current = validateProjectUpgradeOperation(operation);
  return freezeJsonValue({
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: current.plan.project_ids,
    operation_id: current.plan.operation_id,
    manifest_digest: current.plan_digest,
    request_digest: canonicalJsonDigest({
      plan_digest: current.plan_digest,
      initial_database: current.initial_database?.sha256 ?? null,
    }),
    bindings_digest: canonicalJsonDigest(current.plan.dependencies),
    closure_digest: canonicalJsonDigest({
      files: current.plan.files,
      initial_database: current.initial_database?.sha256 ?? null,
    }),
    bundle_digest: current.plan.bundle_digest,
  });
}

function readOperation(
  access: SafeRepositoryAccess,
  operationId: string,
  journalPath = PROJECT_UPGRADE_OPERATION_PATH,
): { bytes: string; operation: ProjectUpgradeOperation } {
  const bytes = image(access, journalPath);
  requireUpgrade(bytes !== null && Buffer.byteLength(bytes) <= byteLimit, 'frozen operation is missing or oversized');
  const value: unknown = JSON.parse(bytes);
  const operation = validateProjectUpgradeOperation(value);
  requireUpgrade(
    operation.plan.operation_id === operationId && operation.plan.repository_root === access.repository_root,
    'foreign operation or repository',
  );
  return { bytes, operation };
}

function assertDependencies(access: SafeRepositoryAccess, plan: ProjectUpgradePlan): void {
  requireUpgrade(access.directoryIdentity('.', label) === plan.repository_identity, 'repository root was replaced');
  requireUpgrade(
    canonicalJson(projectUpgradeDependencyPaths(access, originalConfig(plan))) ===
      canonicalJson(plan.dependencies.map((entry) => entry.path)),
    'local instruction inventory changed',
  );
  for (const entry of plan.dependencies) {
    const current = image(access, entry.path);
    const output = plan.files.find((file) => file.path === entry.path && file.before === entry.bytes);
    requireUpgrade(
      current === entry.bytes || (output !== undefined && current === output.after),
      'dependency changed; retain the original operation',
    );
  }
}

function assertUpgradeOwner(
  access: SafeRepositoryAccess,
  store: HostStateStore,
  operation: ProjectUpgradeOperation,
): void {
  requireUpgrade(
    HostStateStore.isHostStateStore(store) && store.workspaceId === operation.plan.workspace_id,
    'trusted configured Host owner required',
  );
  store.assertWorkingRepositoryRoot(access.repository_root);
  if (operation.plan.database_mode === 'existing') store.assertConfiguredDatabase(originalConfig(operation.plan));
  else {
    requireUpgrade(
      operation.storage_phase === 'published' &&
        operation.staging_identity !== null &&
        operation.initial_database !== null,
      'fresh storage has not been published',
    );
    store.assertWorkspaceDatabaseBootstrap(
      access.repository_root,
      PROJECT_WORKSPACE_DATABASE_PATH,
      operation.staging_identity,
      operation.initial_database.binding,
    );
  }
  assertDependencies(access, operation.plan);
  requireUpgrade(bundleDigest() === operation.plan.bundle_digest, 'executing bundle changed');
}

function assertRetainedUpgradeFence(
  store: HostStateStore,
  operation: ProjectUpgradeOperation,
): MaintenanceFenceReceipt {
  const fence = store.readMaintenanceFence();
  requireUpgrade(
    fence !== null && canonicalJson(fence.binding) === canonicalJson(projectUpgradeFenceBinding(operation)),
    'same-operation maintenance fence required',
  );
  const receipt = { fence, token: operation.plan.token };
  if (fence.status === 'held') store.assertMaintenanceFence(receipt);
  else {
    requireUpgrade(
      ['releasing', 'released', 'unknown_release', 'retiring', 'unknown_retirement', 'completed'].includes(
        operation.phase,
      ),
      'release was not issued by this operation',
    );
    store.assertReleasedMaintenanceFence(receipt);
  }
  return receipt;
}

/** Verify actual Host custody before the project receipt's one allowed pending-to-bound transition. */
export function assertProjectInitializationUpgradeOwner(
  repositoryRoot: string,
  store: HostStateStore,
  receipt: ProjectInitializationReceipt,
): void {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  requireUpgrade(!access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label), 'upgrade is not retired');
  const operation = readOperation(
    access,
    receipt.operation_id,
    projectUpgradeHistoryPath(receipt.operation_id),
  ).operation;
  requireUpgrade(operation.phase === 'completed', 'completed upgrade required');
  assertUpgradeOwner(access, store, operation);
  const fence = assertRetainedUpgradeFence(store, operation);
  requireUpgrade(fence.fence.status === 'released', 'verified release required');
  requireUpgrade(
    operation.activation === prepareProjectUpgradeActivation(operation, fence.fence.generation) &&
      image(access, PROJECT_ACTIVATION_PATH) === operation.activation,
    'initialization activation differs',
  );
  const activation: unknown = JSON.parse(operation.activation!);
  requireUpgrade(
    projectInitializationIdentityDigest(receipt) === validateProjectActivation(activation).receipt_identity_digest,
    'initialization identity differs from activation',
  );
  for (const file of operation.plan.files) {
    if (file.path !== PROJECT_INITIALIZATION_PATH)
      requireUpgrade(image(access, file.path) === file.after, 'initialization artifact changed');
  }
}
