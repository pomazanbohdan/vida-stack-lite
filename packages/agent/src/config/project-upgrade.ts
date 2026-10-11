import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import {
  HostStateStore,
  type MaintenanceFenceBinding,
  type MaintenanceFenceReceipt,
  type MaintenanceReleaseVerifier,
} from '../host-state.js';
import { deriveWorkspaceId } from '../workspace-identity.js';
import {
  captureProjectUpgradeDependencies,
  prepareProjectUpgradeArtifacts,
  projectUpgradeDependencyPaths,
} from './project-upgrade-artifacts.js';
import {
  LEGACY_RUNTIME_CONFIGURATION_PATH,
  PROJECT_UPGRADE_OPERATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
  PROJECT_ACTIVATION_PATH,
  PROJECT_INITIALIZATION_PATH,
  projectUpgradeHistoryPath,
  sessionHandoffDatabaseRelativePath,
  sessionBridgeDatabaseRelativePath,
} from './project-paths.js';
import {
  initialWorkspaceImageSchema,
  prepareInitialWorkspaceDatabaseImage,
  validateInitialWorkspaceDatabaseImage,
  inspectInitialWorkspaceDatabaseImage,
  type ClosedWorkspaceDatabaseImage,
  assertFreshWorkspaceDatabaseSchema,
  checkpointAndCloseWorkspaceDatabase,
  inspectClosedWorkspaceDatabaseImage,
  type WorkspaceBootstrapBinding,
} from './project-upgrade-storage.js';
import { closeWorkspaceDatabaseWithAdmission, openAdmittedWorkspaceDatabase } from './storage-read-admission.js';
import { assertOnlyStorageAdmissionGate } from './storage-read-admission.js';
import {
  existingMergeBindingSchema,
  unifiedDatabaseImageSchema,
  validateUnifiedDatabaseImage,
  prepareUnifiedExistingStorageImage,
  type UnifiedDatabaseImage,
} from './project-upgrade-existing-storage.js';
import {
  assertExistingStorageMergeCapability,
  withExistingStorageMergeCapability,
} from './project-upgrade-existing-storage-admission.js';
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
  assertProjectConfigurationBundleCapability,
} from './runtime-config.js';
import {
  readRepositoryTextImage,
  requireSafeRepositoryAccess,
  SafeRepositoryMoveError,
  type SafeRepositoryAccess,
} from './safe-repository-access.js';

export { PROJECT_UPGRADE_OPERATION_PATH } from './project-paths.js';
const byteLimit = 8 * 1024 * 1024;
const label = 'VIDA project upgrade';
// GAP: no repository-level mechanism currently excludes installed ungated bundles.
// Keep existing-storage merge blocked until an enforceable version boundary exists.
const legacyStorageOverlapExcluded = false;
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
export interface ProjectUpgradeAttribution {
  readonly operation_id: string;
  readonly actor: string;
  readonly instruction_ref: string;
}
/** Source-only launcher verification. Journal attribution is data and cannot supply this authority. */
export interface ProjectUpgradeBootstrapVerifier {
  readonly verify: (plan: Readonly<ProjectUpgradePlan>) => void;
}
const validatedOperations = new WeakSet<object>();
const bootstrapVerifiers = new WeakSet<object>();
const originalConfigurations = new WeakMap<ProjectUpgradePlan, ReturnType<typeof validateRuntimeConfig>>();

function requireUpgrade(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(label + ': ' + message);
}

function image(access: SafeRepositoryAccess, file: string): string | null {
  return readRepositoryTextImage(access, file, label);
}

function bundleDigest(): string {
  const access = runtimePackageAccess();
  const prefix = 'runtime-package/';
  const files = runtimePackageCodePaths('runtime-package', access);
  return canonicalJsonDigest(
    files.map((file) => ({
      path: file,
      digest: new Bun.CryptoHasher('sha256').update(access.readBytes(file.slice(prefix.length), label)).digest('hex'),
    })),
  );
}

function originalConfig(plan: ProjectUpgradePlan) {
  const cached = originalConfigurations.get(plan);
  if (cached !== undefined) return cached;
  const source = plan.dependencies.find((entry) => entry.path === LEGACY_RUNTIME_CONFIGURATION_PATH);
  requireUpgrade(source?.bytes !== null && source?.bytes !== undefined, 'original configuration is missing');
  const config = validateRuntimeConfig(parseRuntimeConfigDocument(source.bytes));
  // Only the immutable plan's original bytes are cached; filesystem/bundle/Host proofs stay live.
  if (Object.isFrozen(plan)) originalConfigurations.set(plan, config);
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

function assertFreshStorageAbsent(access: SafeRepositoryAccess, config: ReturnType<typeof originalConfig>): void {
  assertLegacyStorageAbsent(access, config);
  assertStorageFileAbsent(access, PROJECT_WORKSPACE_DATABASE_PATH);
}

function assertLegacyStorageAbsent(access: SafeRepositoryAccess, config: ReturnType<typeof originalConfig>): void {
  for (const file of [sessionHandoffDatabaseRelativePath(config), sessionBridgeDatabaseRelativePath(config)])
    assertStorageFileAbsent(access, file);
}

function assertStorageFileAbsent(access: SafeRepositoryAccess, file: string): void {
  for (const suffix of ['', '-wal', '-shm', '-journal'])
    requireUpgrade(
      !access.fileExists(file + suffix, label),
      'fresh storage conflicts with an existing database or sidecar',
    );
}

function assertBootstrapAuthority(verifier: ProjectUpgradeBootstrapVerifier, operation: ProjectUpgradeOperation): void {
  requireUpgrade(
    verifier !== null && typeof verifier === 'object' && bootstrapVerifiers.has(verifier),
    'trusted synchronous bootstrap verifier required',
  );
  requireUpgrade(verifier.verify(operation.plan) === undefined, 'bootstrap verifier must throw on denial');
}

/** Package-owned manual initialization repair. It cannot grant admitted Work, execution or acceptance. */
function bootstrapVerifier(operation: ProjectUpgradeOperation): ProjectUpgradeBootstrapVerifier {
  const retained = validateProjectUpgradeOperation(operation);
  requireUpgrade(retained.plan.database_mode === 'fresh', 'only fresh initialization may use the bootstrap owner');
  const verifier = Object.freeze({
    verify(plan: Readonly<ProjectUpgradePlan>): void {
      requireUpgrade(canonicalJsonDigest(plan) === retained.plan_digest, 'bootstrap owner is bound to another plan');
      const access = requireSafeRepositoryAccess(plan.repository_root);
      assertDependencies(access, retained.plan);
      assertLegacyStorageAbsent(access, originalConfig(retained.plan));
      requireUpgrade(bundleDigest() === retained.plan.bundle_digest, 'bootstrap owner bundle changed');
    },
  });
  bootstrapVerifiers.add(verifier);
  return verifier;
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
  assertPreparedArtifactClosure(plan, config);
  assertPublicationProgress(operation);
  assertStorageProgress(operation);
  assertActivationProgress(operation);
  const frozen = freezeJsonValue(operation);
  validatedOperations.add(frozen);
  return frozen;
}

function assertPreparedArtifactClosure(plan: ProjectUpgradePlan, config: ReturnType<typeof originalConfig>): void {
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

function serialized(operation: ProjectUpgradeOperation): string {
  const bytes = JSON.stringify(validateProjectUpgradeOperation(operation), null, 2) + '\n';
  requireUpgrade(Buffer.byteLength(bytes) <= byteLimit, 'operation exceeds its byte bound');
  return bytes;
}

/** Capture one supported transform and complete exact beforeimages, without moving any operational state. */
export function inspectProjectUpgrade(
  repositoryRoot: string,
  attribution: ProjectUpgradeAttribution,
): ProjectUpgradeOperation {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  if (access.fileExists('.vida', label)) {
    access.assertDirectory('.vida', label);
    requireUpgrade(access.listFiles('.vida', label).length === 0, 'existing VIDA data requires its retained operation');
  }
  const raw = image(access, LEGACY_RUNTIME_CONFIGURATION_PATH);
  requireUpgrade(raw !== null, 'original configuration is missing');
  const config = validateRuntimeConfig(parseRuntimeConfigDocument(raw), access.repository_root);
  assertOnlyStorageAdmissionGate(
    access.repository_root,
    deriveWorkspaceId(config.repository.repository_id, access.repository_root),
  );
  const dependencies = captureProjectUpgradeDependencies(access, config);
  requireUpgrade(
    dependencies.find((entry) => entry.path === LEGACY_RUNTIME_CONFIGURATION_PATH)?.bytes === raw,
    'configuration changed during inspection',
  );
  const context = {
    operation_id: attribution.operation_id,
    created_at: new Date().toISOString(),
    bundle_digest: bundleDigest(),
    workspace_id: deriveWorkspaceId(config.repository.repository_id, access.repository_root),
  };
  const prepared = prepareProjectUpgradeArtifacts(config, dependencies, context);
  const databaseMode = access.fileExists(sessionHandoffDatabaseRelativePath(config), label) ? 'existing' : 'fresh';
  if (databaseMode === 'fresh') assertFreshStorageAbsent(access, config);
  const plan: ProjectUpgradePlan = {
    schema: 'VidaProjectUpgradePlan/v1',
    ...attribution,
    ...context,
    repository_root: access.repository_root,
    repository_identity: access.directoryIdentity('.', label),
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((entry) => entry.project_id).sort(),
    token: randomUUID(),
    input_digest: prepared.input_digest,
    database_mode: databaseMode,
    dependencies,
    files: prepared.files.map((file) => ({ ...file, before: image(access, file.path) })),
  };
  const operation = validateProjectUpgradeOperation({
    schema: 'VidaProjectUpgradeOperation/v1',
    revision: 1,
    phase: 'planned',
    next_file: 0,
    plan,
    plan_digest: canonicalJsonDigest(plan),
    initial_database: null,
    existing_database: null,
    storage_phase: databaseMode === 'fresh' ? 'absent' : 'existing',
    staging_identity: null,
    activation: null,
  });
  serialized(operation);
  return operation;
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

function assertFileSet(
  access: SafeRepositoryAccess,
  operation: ProjectUpgradeOperation,
): ReadonlyMap<string, string | null> {
  const images = new Map<string, string | null>();
  for (const [index, file] of operation.plan.files.entries()) {
    const current = image(access, file.path);
    requireUpgrade(
      index < operation.next_file ? current === file.after : current === file.before || current === file.after,
      'output changed; preserve its beforeimage and do not overwrite it',
    );
    images.set(file.path, current);
  }
  return images;
}

/** Persist the token and all beforeimages before acquiring maintenance or publishing an output. */
export async function planProjectUpgrade(
  operation: ProjectUpgradeOperation,
  store: HostStateStore,
): Promise<ProjectUpgradeOperation> {
  const current = validateProjectUpgradeOperation(operation);
  requireUpgrade(current.phase === 'planned' && current.revision === 1, 'only initial intent may be planned');
  requireUpgrade(current.plan.database_mode === 'existing', 'fresh storage requires the bootstrap owner');
  const access = requireSafeRepositoryAccess(current.plan.repository_root);
  assertUpgradeOwner(access, store, current);
  store.assertMaintenancePlanningAuthority(projectUpgradeFenceBinding(current));
  access.ensureDirectory('.vida', label);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    requireUpgrade(bundleDigest() === current.plan.bundle_digest, 'executing bundle changed before planning');
    if (access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label)) {
      const prior = readOperation(access, current.plan.operation_id).operation;
      requireUpgrade(
        canonicalJson(prior.plan) === canonicalJson(current.plan),
        'different upgrade intent already exists',
      );
      assertDependencies(access, prior.plan);
      assertFileSet(access, prior);
      return prior;
    }
    assertDependencies(access, current.plan);
    for (const file of current.plan.files)
      requireUpgrade(image(access, file.path) === file.before, 'target changed since inspection');
    return publishUpgradeIntent(access, current);
  });
}

async function publishExistingMergeImage(
  access: SafeRepositoryAccess,
  initial: ReturnType<typeof readOperation>,
  image: UnifiedDatabaseImage,
  assertActive: () => void,
): Promise<ReturnType<typeof readOperation>> {
  const staging = '.vida/work/.upgrade-' + initial.operation.plan.operation_id + '.sqlite';
  const target = PROJECT_WORKSPACE_DATABASE_PATH;
  requireUpgrade(initial.operation.storage_phase === 'merge_prepared', 'prepared merge image required');
  assertActive();
  assertStorageFileAbsent(access, staging);
  assertStorageFileAbsent(access, target);
  let stored = await saveStorage(access, initial, 'merge_writing', null, image);
  try {
    assertActive();
    await access.ensureDirectoryAsync(path.posix.dirname(staging), label);
    await access.writeExclusiveBytesAsync(staging, Buffer.from(image.bytes_base64, 'base64'), label);
    assertActive();
    const actual = inspectClosedWorkspaceDatabaseImage(access.repository_root, staging);
    requireUpgrade(actual.size === image.size && actual.sha256 === image.sha256, 'merge staging image differs');
    stored = await saveStorage(access, stored, 'merge_staged', actual, image);
  } catch (error) {
    return retainUpgradeFailure(
      () => saveStorage(access, stored, 'merge_unknown_write', null, image),
      error,
      'Existing merge staging and UNKNOWN recording failed',
    );
  }
  requireUpgrade(stored.operation.staging_identity !== null, 'merge staging identity missing');
  assertStorageFileAbsent(access, target);
  const staged = inspectClosedWorkspaceDatabaseImage(access.repository_root, staging);
  requireUpgrade(canonicalJson(staged) === canonicalJson(stored.operation.staging_identity), 'merge staging changed');
  const moving = await saveStorage(access, stored, 'merge_moving', staged, image);
  try {
    assertActive();
    await access.moveNoReplaceAsync(staging, target, staged.sha256, label);
    assertActive();
    const published = inspectClosedWorkspaceDatabaseImage(access.repository_root, target);
    requireUpgrade(canonicalJson(published) === canonicalJson(staged), 'published merge image differs');
    requireUpgrade(!access.fileExists(staging, label), 'merge staging remains after publication');
    return await saveStorage(access, moving, 'merge_published', published, image);
  } catch (error) {
    return retainUpgradeFailure(
      () => saveStorage(access, moving, 'merge_unknown_move', staged, image),
      error,
      'Existing merge move and UNKNOWN recording failed',
    );
  }
}

/** Existing storage remains blocked until `legacyStorageOverlapExcluded` has a real version proof. */
export async function prepareExistingProjectUpgradeDatabase(
  repositoryRoot: string,
  operationId: string,
  store: HostStateStore,
  closeHostOwner: () => void,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(legacyStorageOverlapExcluded, 'legacy ungated storage openers are not excluded');
  requireUpgrade(typeof closeHostOwner === 'function', 'exact Host owner close callback required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    let stored = readOperation(access, operationId);
    const operation = stored.operation;
    requireUpgrade(operation.plan.database_mode === 'existing', 'only existing storage uses merge preparation');
    requireUpgrade(operation.phase === 'planned' || operation.phase === 'fenced', 'merge preparation is out of phase');
    assertUpgradeOwner(access, store, operation);
    if (operation.storage_phase === 'merge_published') {
      requireUpgrade(operation.staging_identity !== null, 'published merge identity is missing');
      const published = inspectClosedWorkspaceDatabaseImage(repositoryRoot, PROJECT_WORKSPACE_DATABASE_PATH);
      requireUpgrade(
        canonicalJson(published) === canonicalJson(operation.staging_identity),
        'published merge afterimage differs',
      );
      const receipt = retainedFence(store, operation);
      store.assertMaintenanceFence(receipt);
      return operation;
    }
    let preparedImage: UnifiedDatabaseImage | undefined;
    if (operation.storage_phase === 'merge_prepared') {
      preparedImage = validateUnifiedDatabaseImage(operation.existing_database);
      requireUpgrade(
        preparedImage.binding.operation_id === operation.plan.operation_id &&
          preparedImage.binding.workspace_id === operation.plan.workspace_id &&
          preparedImage.binding.plan_digest === operation.plan_digest,
        'retained merge image belongs to another operation',
      );
      requireUpgrade(
        !access.fileExists('.vida/work/.upgrade-' + operation.plan.operation_id + '.sqlite', label),
        'partial existing merge staging is unresolved',
      );
    }
    requireUpgrade(
      ['existing', 'merge_prepared'].includes(operation.storage_phase),
      'existing merge source/checkpoint outcome is UNKNOWN; preserve this operation for explicit inspection',
    );
    let receipt: MaintenanceFenceReceipt;
    if (operation.phase === 'planned') {
      receipt = store.acquireMaintenanceFenceWithRecordedToken(
        projectUpgradeFenceBinding(operation),
        operation.plan.token,
      );
      stored = await saveOperation(access, stored, 'fenced', 0);
    } else receipt = retainedFence(store, operation);
    store.assertMaintenanceFence(receipt);
    if (stored.operation.storage_phase === 'existing')
      stored = await saveStorage(access, stored, 'merge_preparing', null, null);
    const expectedBinding = projectUpgradeFenceBinding(stored.operation);
    return withExistingStorageMergeCapability({
      repositoryRoot,
      workspaceId: stored.operation.plan.workspace_id,
      operationId: stored.operation.plan.operation_id,
      planDigest: stored.operation.plan_digest,
      expectedFenceBinding: expectedBinding,
      receipt,
      hostRelative: sessionHandoffDatabaseRelativePath(originalConfig(stored.operation.plan)),
      mastraRelative: sessionBridgeDatabaseRelativePath(originalConfig(stored.operation.plan)),
      closeHostOwner,
      operation: async (capability) => {
        assertExistingStorageMergeCapability(capability);
        const binding = existingMergeBindingSchema.parse(capability.binding);
        requireUpgrade(
          binding.operation_id === stored.operation.plan.operation_id &&
            binding.workspace_id === stored.operation.plan.workspace_id &&
            binding.plan_digest === stored.operation.plan_digest &&
            binding.held_fence_token_digest === receipt.fence.token_digest,
          'closed-source merge binding differs from retained operation and fence',
        );
        let image: UnifiedDatabaseImage;
        if (preparedImage !== undefined) {
          image = preparedImage;
          requireUpgrade(canonicalJson(image.binding) === canonicalJson(binding), 'retained merge binding differs');
        } else image = await prepareUnifiedExistingStorageImage(capability.host, capability.mastra, binding);
        capability.assertSourcesUnchanged();
        capability.assertActive();
        if (stored.operation.storage_phase !== 'merge_prepared')
          stored = await saveStorage(access, stored, 'merge_prepared', null, image);
        capability.assertActive();
        return (await publishExistingMergeImage(access, stored, image, () => capability.assertActive())).operation;
      },
    });
  });
}

/** Recover only the exact merge image already retained by this operation. */
function retainedExistingMergeImage(
  operation: ProjectUpgradeOperation,
  operationId: string,
  reconcileUnknown: boolean,
): UnifiedDatabaseImage {
  requireUpgrade(
    ['merge_writing', 'merge_staged', 'merge_moving', 'merge_unknown_write', 'merge_unknown_move'].includes(
      operation.storage_phase,
    ),
    'merge source outcome is UNKNOWN; retain this operation for inspection',
  );
  const image = validateUnifiedDatabaseImage(operation.existing_database);
  requireUpgrade(image.binding.operation_id === operationId, 'retained merge image identity differs');
  const uncertain = ['merge_writing', 'merge_moving', 'merge_unknown_write', 'merge_unknown_move'].includes(
    operation.storage_phase,
  );
  requireUpgrade(!uncertain || reconcileUnknown, 'UNKNOWN merge effect requires same-operation reconciliation');
  return image;
}

async function recoverExistingMergeWrite(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  image: UnifiedDatabaseImage,
  repositoryRoot: string,
  staging: string,
  target: string,
): Promise<ReturnType<typeof readOperation>> {
  if (!['merge_writing', 'merge_unknown_write'].includes(stored.operation.storage_phase)) return stored;
  requireUpgrade(stored.operation.staging_identity === null, 'unexpected merge staging identity');
  assertStorageFileAbsent(access, target);
  if (!access.fileExists(staging, label)) {
    await access.ensureDirectoryAsync(path.posix.dirname(staging), label);
    await access.writeExclusiveBytesAsync(staging, Buffer.from(image.bytes_base64, 'base64'), label);
  }
  const recovered = inspectClosedWorkspaceDatabaseImage(repositoryRoot, staging);
  requireUpgrade(
    recovered.size === image.size && recovered.sha256 === image.sha256,
    'merge staging is not the exact retained image; preserve UNKNOWN state',
  );
  return saveStorage(access, stored, 'merge_staged', recovered, image);
}

async function recoverExistingMergeMove(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  image: UnifiedDatabaseImage,
  repositoryRoot: string,
  staging: string,
  target: string,
  assertActive: () => void,
): Promise<ReturnType<typeof readOperation>> {
  if (!['merge_moving', 'merge_unknown_move'].includes(stored.operation.storage_phase)) return stored;
  requireUpgrade(stored.operation.staging_identity !== null, 'moving merge identity is missing');
  const stagedExists = access.fileExists(staging, label);
  const targetExists = access.fileExists(target, label);
  requireUpgrade(stagedExists !== targetExists, 'merge move beforeimage is ambiguous; retain UNKNOWN state');
  if (targetExists) {
    const published = inspectClosedWorkspaceDatabaseImage(repositoryRoot, target);
    requireUpgrade(
      canonicalJson(published) === canonicalJson(stored.operation.staging_identity),
      'merge target is not the exact retained afterimage; preserve UNKNOWN state',
    );
    return saveStorage(access, stored, 'merge_published', published, image);
  }
  assertStorageFileAbsent(access, target);
  const staged = inspectClosedWorkspaceDatabaseImage(repositoryRoot, staging);
  requireUpgrade(canonicalJson(staged) === canonicalJson(stored.operation.staging_identity), 'merge stage changed');
  assertActive();
  try {
    await access.moveNoReplaceAsync(staging, target, staged.sha256, label);
    const published = inspectClosedWorkspaceDatabaseImage(repositoryRoot, target);
    requireUpgrade(canonicalJson(published) === canonicalJson(staged), 'published merge image differs');
    requireUpgrade(!access.fileExists(staging, label), 'merge staging remains after publication');
    return saveStorage(access, stored, 'merge_published', published, image);
  } catch (error) {
    return retainUpgradeFailure(
      () => saveStorage(access, stored, 'merge_unknown_move', staged, image),
      error,
      'Existing merge move and UNKNOWN recording failed',
    );
  }
}

async function recoverExistingMergePublicationLocked(
  access: SafeRepositoryAccess,
  repositoryRoot: string,
  operationId: string,
  store: HostStateStore,
  reconcileUnknown: boolean,
): Promise<ProjectUpgradeOperation> {
  let stored = readOperation(access, operationId);
  const operation = stored.operation;
  assertUpgradeOwner(access, store, operation);
  requireUpgrade(operation.plan.database_mode === 'existing', 'existing merge recovery required');
  requireUpgrade(['planned', 'fenced'].includes(operation.phase), 'merge recovery is out of phase');
  requireUpgrade(operation.next_file === 0, 'merge recovery cannot follow file publication');
  const receipt = assertRetainedUpgradeFence(store, operation);
  requireUpgrade(receipt.fence.status === 'held', 'held Host fence required for merge recovery');
  if (operation.storage_phase === 'merge_published') {
    requireUpgrade(operation.staging_identity !== null, 'published merge identity is missing');
    const published = inspectClosedWorkspaceDatabaseImage(repositoryRoot, PROJECT_WORKSPACE_DATABASE_PATH);
    requireUpgrade(canonicalJson(published) === canonicalJson(operation.staging_identity), 'merge afterimage differs');
    return operation;
  }
  const image = retainedExistingMergeImage(operation, operationId, reconcileUnknown);
  const staging = '.vida/work/.upgrade-' + operationId + '.sqlite';
  const assertActive = (): void => {
    assertUpgradeOwner(access, store, stored.operation);
    store.assertMaintenanceFence(receipt);
  };
  assertActive();
  stored = await recoverExistingMergeWrite(
    access,
    stored,
    image,
    repositoryRoot,
    staging,
    PROJECT_WORKSPACE_DATABASE_PATH,
  );
  if (stored.operation.storage_phase === 'merge_staged') {
    requireUpgrade(stored.operation.staging_identity !== null, 'staged merge identity is missing');
    assertStorageFileAbsent(access, PROJECT_WORKSPACE_DATABASE_PATH);
    const staged = inspectClosedWorkspaceDatabaseImage(repositoryRoot, staging);
    requireUpgrade(canonicalJson(staged) === canonicalJson(stored.operation.staging_identity), 'merge stage changed');
    stored = await saveStorage(access, stored, 'merge_moving', staged, image);
  }
  stored = await recoverExistingMergeMove(
    access,
    stored,
    image,
    repositoryRoot,
    staging,
    PROJECT_WORKSPACE_DATABASE_PATH,
    assertActive,
  );
  requireUpgrade(stored.operation.storage_phase === 'merge_published', 'existing merge recovery is incomplete');
  return stored.operation;
}

async function recoverExistingMergePublication(
  repositoryRoot: string,
  operationId: string,
  store: HostStateStore,
  reconcileUnknown: boolean,
): Promise<ProjectUpgradeOperation> {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, () =>
    recoverExistingMergePublicationLocked(access, repositoryRoot, operationId, store, reconcileUnknown),
  );
}

function intentStagingPath(operationId: string): string {
  return '.vida/.upgrade-intent-' + id.parse(operationId) + '.json';
}

async function retainPreparedIntentMoveFailure(
  access: SafeRepositoryAccess,
  moving: ReturnType<typeof readOperation>,
  staging: string,
  revalidate: () => Promise<void>,
  error: unknown,
): Promise<never> {
  if (!(error instanceof SafeRepositoryMoveError) || error.code !== 'SAFE_REPOSITORY_MOVE_NOT_APPLIED') throw error;
  try {
    await revalidate();
    requireUpgrade(
      access.fileExists(staging, label) &&
        image(access, staging) === moving.bytes &&
        !access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label),
      'initial intent move denial beforeimage changed before restoration',
    );
  } catch (validationError) {
    return retainUpgradeFailure(
      () => saveOperation(access, moving, 'unknown_intent_move', 0, undefined, staging),
      new AggregateError([error, validationError], 'Initial intent move denial could not be revalidated'),
      'Initial intent denial and UNKNOWN recording failed',
    );
  }
  return retainUpgradeFailure(
    () => saveOperation(access, moving, 'intent_prepared', 0, undefined, staging),
    error,
    'Initial intent move denial and phase restoration failed',
  );
}

async function issuePreparedIntentMove(
  access: SafeRepositoryAccess,
  moving: ReturnType<typeof readOperation>,
  staging: string,
  revalidate: () => Promise<void>,
): Promise<ProjectUpgradeOperation> {
  try {
    await access.moveNoReplaceAsync(staging, PROJECT_UPGRADE_OPERATION_PATH, digest(moving.bytes), label);
  } catch (error) {
    return retainPreparedIntentMoveFailure(access, moving, staging, revalidate, error);
  }
  requireUpgrade(
    image(access, PROJECT_UPGRADE_OPERATION_PATH) === moving.bytes && !access.fileExists(staging, label),
    'intent move afterimage differs',
  );
  return (await saveOperation(access, moving, 'planned', 0)).operation;
}

async function movePreparedIntent(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  revalidate: () => Promise<void>,
): Promise<ProjectUpgradeOperation> {
  const staging = intentStagingPath(stored.operation.plan.operation_id);
  requireUpgrade(stored.operation.phase === 'intent_prepared', 'unissued intent move required');
  const moving = await saveOperation(access, stored, 'intent_moving', 0, undefined, staging);
  return issuePreparedIntentMove(access, moving, staging, revalidate);
}

async function publishUpgradeIntent(
  access: SafeRepositoryAccess,
  operation: ProjectUpgradeOperation,
): Promise<ProjectUpgradeOperation> {
  const prepared = validateProjectUpgradeOperation({ ...operation, phase: 'intent_prepared' });
  const bytes = serialized(prepared);
  const target = PROJECT_UPGRADE_OPERATION_PATH;
  const retainedLegacyIntent = access
    .listFiles('.vida', label)
    .find((name) => name.startsWith('.upgrade-intent-') && name.endsWith('.json'));
  requireUpgrade(
    retainedLegacyIntent === undefined,
    'retained legacy intent staging exists at ' +
      retainedLegacyIntent +
      '; recover that same operation explicitly before new publication',
  );
  if (access.fileExists(target, label)) {
    const retained = readOperation(access, prepared.plan.operation_id);
    requireUpgrade(retained.bytes === bytes, 'different or unresolved upgrade intent already exists');
    return retained.operation;
  }
  requireUpgrade(
    !access.fileExists('.vida/work', label),
    'initial intent custody already exists without its complete journal; do not reissue publication',
  );
  // Acknowledged directory custody survives absent/UNKNOWN atomic-create outcomes.
  // It blocks replacement inspection and in-memory reissue without inventing a journal.
  await access.ensureDirectoryAsync('.vida/work', label);
  try {
    await access.writeExclusiveAtomicAsync(target, bytes, label);
  } catch (error) {
    if (access.fileExists(target, label)) {
      const actual = image(access, target);
      requireUpgrade(
        actual === bytes,
        'initial intent publication outcome is unknown; preserve custody and inspect the same operation id',
      );
      return (await saveOperation(access, { bytes: actual, operation: prepared }, 'planned', 0)).operation;
    }
    throw new Error(
      'initial intent publication outcome is unknown; no source effects were started; preserve the original operation id and inspect custody before retrying',
      { cause: error },
    );
  }
  requireUpgrade(image(access, target) === bytes, 'published initial intent differs from its frozen complete image');
  return (await saveOperation(access, { bytes, operation: prepared }, 'planned', 0)).operation;
}

/** Prepare fresh empty storage in memory, then retain its exact image and token before publishing a database. */
export async function planFreshProjectUpgrade(
  operation: ProjectUpgradeOperation,
  verifier: ProjectUpgradeBootstrapVerifier,
): Promise<ProjectUpgradeOperation> {
  const current = validateProjectUpgradeOperation(operation);
  requireUpgrade(
    current.phase === 'planned' && current.revision === 1 && current.plan.database_mode === 'fresh',
    'initial fresh intent required',
  );
  assertBootstrapAuthority(verifier, current);
  const access = requireSafeRepositoryAccess(current.plan.repository_root);
  if (access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label)) {
    const retained = readOperation(access, current.plan.operation_id).operation;
    requireUpgrade(canonicalJson(retained.plan) === canonicalJson(current.plan), 'different bootstrap intent exists');
    assertBootstrapAuthority(verifier, retained);
    return retained;
  }
  assertDependencies(access, current.plan);
  assertFreshStorageAbsent(access, originalConfig(current.plan));
  const initialDatabase = await prepareInitialWorkspaceDatabaseImage(projectUpgradeBootstrapBinding(current));
  const prepared = validateProjectUpgradeOperation({ ...current, initial_database: initialDatabase });
  serialized(prepared);
  assertBootstrapAuthority(verifier, prepared);
  await access.ensureDirectoryAsync('.vida', label);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    assertBootstrapAuthority(verifier, prepared);
    if (access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label)) {
      const retained = readOperation(access, prepared.plan.operation_id).operation;
      requireUpgrade(
        canonicalJson(retained.plan) === canonicalJson(prepared.plan),
        'different bootstrap intent exists',
      );
      return retained;
    }
    assertDependencies(access, prepared.plan);
    assertFreshStorageAbsent(access, originalConfig(prepared.plan));
    for (const file of prepared.plan.files)
      requireUpgrade(image(access, file.path) === file.before, 'bootstrap target changed since inspection');
    return publishUpgradeIntent(access, prepared);
  });
}

/** Explicit repair entry: existing storage needs its configured Host; fresh storage uses the finite package owner. */
export async function planProjectUpgradeRepair(
  repositoryRoot: string,
  attribution: ProjectUpgradeAttribution,
  store?: HostStateStore,
  closeHostOwner?: () => void,
): Promise<ProjectUpgradeOperation> {
  const operation = inspectProjectUpgrade(repositoryRoot, attribution);
  if (operation.plan.database_mode === 'fresh') return planFreshProjectUpgrade(operation, bootstrapVerifier(operation));
  requireUpgrade(store !== undefined, 'existing storage requires the trusted configured maintenance owner');
  requireUpgrade(typeof closeHostOwner === 'function', 'existing storage requires the exact Host owner close callback');
  const planned = await planProjectUpgrade(operation, store);
  return prepareExistingProjectUpgradeDatabase(repositoryRoot, planned.plan.operation_id, store, closeHostOwner);
}

/** Public package-owned planning path; existing mode uses the exact configured Host owner. */
export async function planConfiguredProjectUpgradeRepair(
  repositoryRoot: string,
  attribution: ProjectUpgradeAttribution,
): Promise<ProjectUpgradeOperation> {
  const operation = inspectProjectUpgrade(repositoryRoot, attribution);
  if (operation.plan.database_mode === 'fresh') return planFreshProjectUpgrade(operation, bootstrapVerifier(operation));
  return withConfiguredExistingUpgradeHost(repositoryRoot, operation, async (store, closeHostOwner) => {
    const planned = await planProjectUpgrade(operation, store);
    return prepareExistingProjectUpgradeDatabase(repositoryRoot, planned.plan.operation_id, store, closeHostOwner);
  });
}

async function assertRetainedInitialSchema(operation: ProjectUpgradeOperation): Promise<void> {
  requireUpgrade(operation.initial_database !== null, 'retained initial database is missing');
  const current = await prepareInitialWorkspaceDatabaseImage(projectUpgradeBootstrapBinding(operation));
  requireUpgrade(
    canonicalJson(current.database_schema) === canonicalJson(operation.initial_database.database_schema),
    'retained schema differs from the executing bundle',
  );
}

async function recoverInitialIntentAfterimage(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  canonical: boolean,
  revalidate: () => Promise<void>,
): Promise<ProjectUpgradeOperation> {
  const phase = stored.operation.phase;
  const staging = intentStagingPath(stored.operation.plan.operation_id);
  if (canonical) {
    requireUpgrade(!access.fileExists(staging, label), 'canonical intent has conflicting staging');
    if (phase === 'planned') return stored.operation;
    requireUpgrade(
      phase === 'intent_prepared' || phase === 'intent_moving',
      'canonical initial intent phase is unsupported',
    );
    return (await saveOperation(access, stored, 'planned', 0)).operation;
  }
  if (phase === 'intent_prepared') return movePreparedIntent(access, stored, revalidate);
  if (phase === 'intent_moving') await saveOperation(access, stored, 'unknown_intent_move', 0, undefined, staging);
  throw new Error(label + ': initial intent move remains UNKNOWN; a staged beforeimage cannot authorize replay');
}

export async function recoverProjectUpgradeIntent(
  repositoryRoot: string,
  operationId: string,
  store?: HostStateStore,
): Promise<ProjectUpgradeOperation> {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    const canonical = access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label);
    const staging = intentStagingPath(operationId);
    requireUpgrade(
      canonical || access.fileExists(staging, label),
      'no complete initial intent is retained under this operation id',
    );
    const stored = readOperation(access, operationId, canonical ? PROJECT_UPGRADE_OPERATION_PATH : staging);
    requireUpgrade(
      ['intent_prepared', 'intent_moving', 'unknown_intent_move', 'planned'].includes(stored.operation.phase),
      'initial intent recovery cannot resume product effects',
    );
    const revalidate = async (): Promise<void> => {
      if (stored.operation.plan.database_mode === 'fresh') {
        assertBootstrapAuthority(bootstrapVerifier(stored.operation), stored.operation);
        assertDependencies(access, stored.operation.plan);
        assertFreshStorageAbsent(access, originalConfig(stored.operation.plan));
        await assertRetainedInitialSchema(stored.operation);
      } else {
        requireUpgrade(store !== undefined, 'existing storage requires its configured maintenance owner');
        assertUpgradeOwner(access, store, stored.operation);
        store.assertMaintenancePlanningAuthority(projectUpgradeFenceBinding(stored.operation));
        assertDependencies(access, stored.operation.plan);
      }
      for (const file of stored.operation.plan.files)
        requireUpgrade(image(access, file.path) === file.before, 'initial intent target changed');
    };
    await revalidate();
    return recoverInitialIntentAfterimage(access, stored, canonical, revalidate);
  });
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

/** Recover the original intent after losing the caller's result; never generate a replacement token or identity. */
export function inspectPlannedProjectUpgrade(repositoryRoot: string, operationId: string): ProjectUpgradeOperation {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLock(
    PROJECT_UPGRADE_OPERATION_PATH,
    label,
    () => readOperation(access, operationId).operation,
  );
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

/** Open the frozen operation's configured Host DB and retain its exact close owner for existing-mode repair. */
async function withConfiguredExistingUpgradeHost<T>(
  repositoryRoot: string,
  operation: ProjectUpgradeOperation,
  action: (store: HostStateStore, closeHostOwner: () => void) => Promise<T>,
  journalPath = PROJECT_UPGRADE_OPERATION_PATH,
): Promise<T> {
  const current = validateProjectUpgradeOperation(operation);
  requireUpgrade(current.plan.database_mode === 'existing', 'existing database mode required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  requireUpgrade(access.repository_root === current.plan.repository_root, 'configured Host root differs from intent');
  const databaseRelative = sessionHandoffDatabaseRelativePath(originalConfig(current.plan));
  const database = openAdmittedWorkspaceDatabase(
    repositoryRoot,
    databaseRelative,
    current.plan.workspace_id,
    false,
    true,
  );
  const binding = projectUpgradeFenceBinding(current);
  let store!: HostStateStore;
  let observedFence: ReturnType<HostStateStore['readMaintenanceFence']> = null;
  let live = true;
  const closeHostOwner = (): void => {
    if (!live) return;
    closeWorkspaceDatabaseWithAdmission(database);
    live = false;
  };
  const verifier: MaintenanceReleaseVerifier = {
    principal: 'vida:project-upgrade',
    projectIds: current.plan.project_ids,
    verifyAcquisition(requested, prior): void {
      requireUpgrade(database.inTransaction, 'maintenance acquisition must verify inside the Host transaction');
      requireUpgrade(canonicalJson(requested) === canonicalJson(binding), 'upgrade fence request differs');
      if (access.fileExists(journalPath, label)) {
        const retained = readOperation(access, current.plan.operation_id, journalPath);
        requireUpgrade(retained.bytes === serialized(current), 'upgrade journal changed during acquisition');
        requireUpgrade(canonicalJson(retained.operation.plan) === canonicalJson(current.plan), 'upgrade plan changed');
      } else {
        requireUpgrade(current.phase === 'planned', 'only the initial intent may precede its journal');
      }
      requireUpgrade(canonicalJson(observedFence) === canonicalJson(prior), 'prior Host fence changed');
      assertUpgradeOwner(access, store, current);
    },
    verify(held) {
      if (!access.fileExists(journalPath, label)) return null;
      const retained = readOperation(access, current.plan.operation_id, journalPath).operation;
      if (retained.phase !== 'releasing' || canonicalJson(held.binding) !== canonicalJson(binding)) return null;
      assertUpgradeOwner(access, store, retained);
      assertActivationClosure(access, retained, held.generation);
      return {
        schema: 'MaintenanceReleaseAuthorization/v1',
        principal: verifier.principal,
        fence_digest: canonicalJsonDigest(held),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  };
  try {
    store = new HostStateStore(
      database,
      current.plan.workspace_id,
      undefined,
      undefined,
      undefined,
      verifier,
      repositoryRoot,
    );
    observedFence = store.readMaintenanceFence();
    assertUpgradeOwner(access, store, current);
    return await action(store, closeHostOwner);
  } finally {
    closeHostOwner();
  }
}

function retainedFence(store: HostStateStore, operation: ProjectUpgradeOperation): MaintenanceFenceReceipt {
  const fence = store.readMaintenanceFence();
  requireUpgrade(
    fence !== null && canonicalJson(fence.binding) === canonicalJson(projectUpgradeFenceBinding(operation)),
    'foreign or absent maintenance fence',
  );
  const receipt = { fence, token: operation.plan.token };
  store.assertMaintenanceFence(receipt);
  return receipt;
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

function assertActivationClosure(
  access: SafeRepositoryAccess,
  operation: ProjectUpgradeOperation,
  generation: number,
): void {
  requireUpgrade(
    operation.activation !== null && operation.activation === prepareProjectUpgradeActivation(operation, generation),
    'activation binding differs',
  );
  assertFileSet(access, operation);
  requireUpgrade(image(access, PROJECT_ACTIVATION_PATH) === operation.activation, 'activation afterimage differs');
  requireUpgrade(!access.fileExists(activationStagingPath(operation), label), 'activation retains conflicting staging');
}

function activationStagingPath(operation: ProjectUpgradeOperation): string {
  return '.vida/.activation-' + operation.plan.operation_id + '.json';
}

async function saveActivation(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  phase: ProjectUpgradeOperation['phase'],
  activation = stored.operation.activation,
): Promise<ReturnType<typeof readOperation>> {
  return saveOperation(
    access,
    stored,
    phase,
    stored.operation.next_file,
    undefined,
    PROJECT_UPGRADE_OPERATION_PATH,
    activation,
  );
}

async function retainUpgradeFailure(save: () => Promise<unknown>, error: unknown, message: string): Promise<never> {
  try {
    await save();
  } catch (journalError) {
    throw new AggregateError([error, journalError], message);
  }
  throw error;
}

async function retainActivationUnknown(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  phase: ProjectUpgradeOperation['phase'],
  error: unknown,
): Promise<never> {
  return retainUpgradeFailure(
    () => saveActivation(access, stored, phase),
    error,
    'Activation effect and UNKNOWN recording failed',
  );
}

/** A proven pre-effect denial restores its unissued phase; preserve both failures if that CAS fails. */
async function retainActivationPreflightFailure(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  phase: 'files_published' | 'activation_staged',
  activation: string | null,
  error: unknown,
): Promise<never> {
  return retainUpgradeFailure(
    () => saveActivation(access, stored, phase, activation),
    error,
    'Activation preflight denial and phase restoration failed',
  );
}

function assertResumeReconciliationConsent(operation: ProjectUpgradeOperation, reconcileUnknown: boolean): void {
  requireUpgrade(
    !['unknown_activation_write', 'unknown_activation_move'].includes(operation.phase) || reconcileUnknown,
    'UNKNOWN activation requires explicit same-operation reconciliation',
  );
  requireUpgrade(
    operation.plan.database_mode !== 'fresh' ||
      !['unknown_write', 'unknown_move'].includes(operation.storage_phase) ||
      reconcileUnknown,
    'UNKNOWN storage requires explicit same-operation reconciliation',
  );
  requireUpgrade(
    operation.phase !== 'unknown' || reconcileUnknown,
    'UNKNOWN file publication requires explicit same-operation reconciliation',
  );
  requireUpgrade(
    operation.phase !== 'unknown_release' || reconcileUnknown,
    'UNKNOWN release requires explicit same-operation reconciliation',
  );
}

async function reconcileActivationEffect(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  reconcileUnknown: boolean,
): Promise<ReturnType<typeof readOperation>> {
  const phase = stored.operation.phase;
  const writing = ['activation_writing', 'unknown_activation_write'].includes(phase);
  const moving = ['activating', 'unknown_activation_move'].includes(phase);
  if (!writing && !moving) return stored;
  assertResumeReconciliationConsent(stored.operation, reconcileUnknown);
  const staging = activationStagingPath(stored.operation);
  try {
    if (writing) {
      requireUpgrade(
        !access.fileExists(PROJECT_ACTIVATION_PATH, label),
        'activation was published before its move intent',
      );
      requireUpgrade(
        image(access, staging) === stored.operation.activation,
        'activation staging afterimage is unresolved',
      );
      return await saveActivation(access, stored, 'activation_staged');
    }
    requireUpgrade(
      !access.fileExists(staging, label) && image(access, PROJECT_ACTIVATION_PATH) === stored.operation.activation,
      'activation move afterimage is unresolved',
    );
    return await saveActivation(access, stored, 'activated');
  } catch (error) {
    if (phase.startsWith('unknown')) throw error;
    return retainActivationUnknown(
      access,
      stored,
      writing ? 'unknown_activation_write' : 'unknown_activation_move',
      error,
    );
  }
}

async function writeActivationStaging(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  store: HostStateStore,
): Promise<ReturnType<typeof readOperation>> {
  const receipt = retainedFence(store, stored.operation);
  const staging = activationStagingPath(stored.operation);
  requireUpgrade(
    !access.fileExists(PROJECT_ACTIVATION_PATH, label) && !access.fileExists(staging, label),
    'activation target or staging already exists',
  );
  const bytes = prepareProjectUpgradeActivation(stored.operation, receipt.fence.generation);
  assertUpgradeOwner(access, store, stored.operation);
  store.assertMaintenanceFence(receipt);
  assertFileSet(access, stored.operation);
  const writing = await saveActivation(access, stored, 'activation_writing', bytes);
  try {
    assertUpgradeOwner(access, store, writing.operation);
    store.assertMaintenanceFence(receipt);
    assertFileSet(access, writing.operation);
  } catch (error) {
    return retainActivationPreflightFailure(access, writing, 'files_published', null, error);
  }
  try {
    await access.writeExclusiveAsync(staging, bytes, label);
    requireUpgrade(image(access, staging) === bytes, 'activation staging afterimage differs');
    return await saveActivation(access, writing, 'activation_staged');
  } catch (error) {
    return retainActivationUnknown(access, writing, 'unknown_activation_write', error);
  }
}

async function retainActivationMoveFailure(
  access: SafeRepositoryAccess,
  moving: ReturnType<typeof readOperation>,
  staging: string,
  store: HostStateStore,
  error: unknown,
): Promise<never> {
  if (!(error instanceof SafeRepositoryMoveError) || error.code !== 'SAFE_REPOSITORY_MOVE_NOT_APPLIED')
    return retainActivationUnknown(access, moving, 'unknown_activation_move', error);
  try {
    assertUpgradeOwner(access, store, moving.operation);
    retainedFence(store, moving.operation);
    assertFileSet(access, moving.operation);
    requireUpgrade(
      access.fileExists(staging, label) &&
        image(access, staging) === moving.operation.activation &&
        !access.fileExists(PROJECT_ACTIVATION_PATH, label),
      'activation move denial beforeimage changed before restoration',
    );
  } catch (validationError) {
    return retainActivationUnknown(
      access,
      moving,
      'unknown_activation_move',
      new AggregateError([error, validationError], 'Activation move denial could not be revalidated'),
    );
  }
  return retainActivationPreflightFailure(access, moving, 'activation_staged', moving.operation.activation, error);
}

async function moveActivation(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  store: HostStateStore,
): Promise<ReturnType<typeof readOperation>> {
  retainedFence(store, stored.operation);
  const staging = activationStagingPath(stored.operation);
  requireUpgrade(
    stored.operation.activation !== null && image(access, staging) === stored.operation.activation,
    'activation staging differs',
  );
  requireUpgrade(!access.fileExists(PROJECT_ACTIVATION_PATH, label), 'activation target already exists');
  assertUpgradeOwner(access, store, stored.operation);
  assertFileSet(access, stored.operation);
  const moving = await saveActivation(access, stored, 'activating');
  try {
    assertUpgradeOwner(access, store, moving.operation);
    retainedFence(store, moving.operation);
    assertFileSet(access, moving.operation);
  } catch (error) {
    return retainActivationPreflightFailure(access, moving, 'activation_staged', moving.operation.activation, error);
  }
  try {
    await access.moveNoReplaceAsync(staging, PROJECT_ACTIVATION_PATH, digest(moving.operation.activation!), label);
    assertActivationClosure(access, moving.operation, retainedFence(store, moving.operation).fence.generation);
    return await saveActivation(access, moving, 'activated');
  } catch (error) {
    return retainActivationMoveFailure(access, moving, staging, store, error);
  }
}

async function reconcileUpgradeRelease(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  store: HostStateStore,
  reconcileUnknown: boolean,
): Promise<ReturnType<typeof readOperation>> {
  if (!['releasing', 'unknown_release'].includes(stored.operation.phase)) return stored;
  requireUpgrade(
    stored.operation.phase !== 'unknown_release' || reconcileUnknown,
    'UNKNOWN release requires explicit same-operation reconciliation',
  );
  const receipt = assertRetainedUpgradeFence(store, stored.operation);
  if (receipt.fence.status !== 'released') {
    if (stored.operation.phase === 'releasing') await saveActivation(access, stored, 'unknown_release');
    throw new Error(label + ': release remains UNKNOWN; a held beforeimage cannot authorize reissue');
  }
  assertActivationClosure(access, stored.operation, receipt.fence.generation);
  return saveActivation(access, stored, 'released');
}

async function releaseUpgradeActivation(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  store: HostStateStore,
): Promise<ReturnType<typeof readOperation>> {
  const receipt = retainedFence(store, stored.operation);
  assertActivationClosure(access, stored.operation, receipt.fence.generation);
  const releasing = await saveActivation(access, stored, 'releasing');
  try {
    const released = await store.releaseMaintenanceFence(receipt);
    store.assertReleasedMaintenanceFence({ fence: released, token: releasing.operation.plan.token });
    assertActivationClosure(access, releasing.operation, released.generation);
    return await saveActivation(access, releasing, 'released');
  } catch (error) {
    return retainActivationUnknown(access, releasing, 'unknown_release', error);
  }
}

/** Atomic activation under the real fence. Release requires the complete exact same-operation closure. */
export async function activateProjectUpgrade(
  repositoryRoot: string,
  operationId: string,
  store: HostStateStore,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(typeof reconcileUnknown === 'boolean', 'explicit reconciliation flag required');
  assertProjectConfigurationBundleCapability();
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    let stored = readOperation(access, operationId);
    assertUpgradeOwner(access, store, stored.operation);
    requireUpgrade(
      stored.operation.plan.database_mode === 'fresh' ||
        (stored.operation.storage_phase === 'merge_published' && stored.operation.existing_database !== null),
      'complete storage preparation required before activation',
    );
    if (stored.operation.plan.database_mode === 'existing')
      requireUpgrade(legacyStorageOverlapExcluded, 'legacy ungated storage openers are not excluded');
    requireUpgrade(
      stored.operation.next_file === stored.operation.plan.files.length,
      'complete file publication required',
    );
    const receipt = assertRetainedUpgradeFence(store, stored.operation);
    stored = await reconcileUpgradeRelease(access, stored, store, reconcileUnknown);
    if (stored.operation.phase === 'released') return stored.operation;
    requireUpgrade(receipt.fence.status === 'held', 'held activation fence required');
    stored = await reconcileActivationEffect(access, stored, reconcileUnknown);
    if (stored.operation.phase === 'files_published') stored = await writeActivationStaging(access, stored, store);
    if (stored.operation.phase === 'activation_staged') stored = await moveActivation(access, stored, store);
    requireUpgrade(stored.operation.phase === 'activated', 'activation is incomplete');
    return (await releaseUpgradeActivation(access, stored, store)).operation;
  });
}

/** Package-owned fresh activation/release with no caller-supplied Host verifier or database creation. */
export async function activateFreshProjectUpgrade(
  repositoryRoot: string,
  operationId: string,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  return withFreshUpgradeHost(repositoryRoot, operationId, (store) =>
    activateProjectUpgrade(repositoryRoot, operationId, store, reconcileUnknown),
  );
}

/** Complete same-operation fresh repair. UNKNOWN effects require explicit reconciliation, never replay. */
export async function resumeFreshProjectUpgrade(
  repositoryRoot: string,
  operationId: string,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(typeof reconcileUnknown === 'boolean', 'explicit reconciliation flag required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  if (!access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label)) {
    if (access.fileExists(projectUpgradeHistoryPath(operationId), label))
      return retireFreshProjectUpgrade(repositoryRoot, operationId, reconcileUnknown);
    await recoverProjectUpgradeIntent(repositoryRoot, operationId);
  }
  let operation = inspectPlannedProjectUpgrade(repositoryRoot, operationId);
  requireUpgrade(operation.plan.database_mode === 'fresh', 'fresh repair required');
  // A refusal from the validated same-operation journal grants no effect authority.
  assertResumeReconciliationConsent(operation, reconcileUnknown);
  if (['intent_prepared', 'intent_moving', 'unknown_intent_move'].includes(operation.phase))
    operation = await recoverProjectUpgradeIntent(repositoryRoot, operationId);
  if (['planned', 'fenced', 'publishing', 'unknown', 'files_published'].includes(operation.phase))
    operation = await applyFreshProjectUpgradeFiles(repositoryRoot, operationId, reconcileUnknown);
  if (!['released', 'retiring', 'unknown_retirement', 'completed'].includes(operation.phase))
    await activateFreshProjectUpgrade(repositoryRoot, operationId, reconcileUnknown);
  return retireFreshProjectUpgrade(repositoryRoot, operationId, reconcileUnknown);
}

function readUpgradeForResume(access: SafeRepositoryAccess, operationId: string): ReturnType<typeof readOperation> {
  const candidates = [
    PROJECT_UPGRADE_OPERATION_PATH,
    projectUpgradeHistoryPath(operationId),
    intentStagingPath(operationId),
  ];
  const present = candidates.filter((file) => access.fileExists(file, label));
  requireUpgrade(present.length > 0, 'same-operation intent is missing');
  requireUpgrade(present.length === 1, 'multiple same-operation journals require inspection');
  return readOperation(access, operationId, present[0]);
}

/** Dispatch recovery from the retained operation's database mode and preserve its exact operation identity. */
export async function resumeProjectUpgrade(
  repositoryRoot: string,
  operationId: string,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(typeof reconcileUnknown === 'boolean', 'explicit reconciliation flag required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const retained = readUpgradeForResume(access, operationId).operation;
  assertResumeReconciliationConsent(retained, reconcileUnknown);
  if (retained.plan.database_mode === 'fresh')
    return resumeFreshProjectUpgrade(repositoryRoot, operationId, reconcileUnknown);
  if (!access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label))
    return retireExistingProjectUpgrade(repositoryRoot, operationId, reconcileUnknown);
  let operation = retained;
  if (['intent_prepared', 'intent_moving', 'unknown_intent_move'].includes(operation.phase)) {
    operation = await withConfiguredExistingUpgradeHost(repositoryRoot, operation, (store) =>
      recoverProjectUpgradeIntent(repositoryRoot, operationId, store),
    );
  }
  if (
    [
      'merge_writing',
      'merge_staged',
      'merge_moving',
      'merge_published',
      'merge_unknown_write',
      'merge_unknown_move',
    ].includes(operation.storage_phase)
  ) {
    operation = await withConfiguredExistingUpgradeHost(repositoryRoot, operation, (store) =>
      recoverExistingMergePublication(repositoryRoot, operationId, store, reconcileUnknown),
    );
  } else {
    operation = await withConfiguredExistingUpgradeHost(repositoryRoot, operation, (store, closeHostOwner) =>
      prepareExistingProjectUpgradeDatabase(repositoryRoot, operationId, store, closeHostOwner),
    );
  }
  if (['planned', 'fenced', 'publishing', 'unknown', 'files_published'].includes(operation.phase)) {
    operation = await withConfiguredExistingUpgradeHost(repositoryRoot, operation, async (store) => {
      if (operation.phase === 'unknown') {
        requireUpgrade(reconcileUnknown, 'UNKNOWN file publication requires explicit same-operation reconciliation');
        await reconcileProjectUpgradeFiles(repositoryRoot, operationId, store);
      }
      return applyProjectUpgradeFiles(repositoryRoot, operationId, store);
    });
  }
  if (!['released', 'retiring', 'unknown_retirement', 'completed'].includes(operation.phase)) {
    operation = await withConfiguredExistingUpgradeHost(repositoryRoot, operation, (store) =>
      activateProjectUpgrade(repositoryRoot, operationId, store, reconcileUnknown),
    );
  }
  if (operation.phase === 'released' || operation.phase === 'retiring' || operation.phase === 'unknown_retirement')
    return retireExistingProjectUpgrade(repositoryRoot, operationId, reconcileUnknown);
  return operation;
}

/** Existing format retirement remains blocked until an actual old-opener exclusion proof is available. */
export async function retireExistingProjectUpgrade(
  repositoryRoot: string,
  operationId: string,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(typeof reconcileUnknown === 'boolean', 'explicit reconciliation flag required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const history = projectUpgradeHistoryPath(operationId);
  const canonical = access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label);
  const journal = canonical ? PROJECT_UPGRADE_OPERATION_PATH : history;
  const observed = readOperation(access, operationId, journal).operation;
  requireUpgrade(observed.plan.database_mode === 'existing', 'existing database operation required');
  if (!canonical && observed.phase === 'completed') return observed;
  assertProjectConfigurationBundleCapability();
  requireUpgrade(legacyStorageOverlapExcluded, 'legacy ungated storage openers are not excluded');
  await access.ensureDirectoryAsync(path.posix.dirname(history), label);
  return withConfiguredExistingUpgradeHost(
    repositoryRoot,
    observed,
    async (store) => {
      const receipt = assertRetainedUpgradeFence(store, observed);
      requireUpgrade(receipt.fence.status === 'released', 'verified release required before retirement');
      assertActivationClosure(access, observed, receipt.fence.generation);
      return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
        const current = access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label);
        const stored = readOperation(access, operationId, current ? PROJECT_UPGRADE_OPERATION_PATH : history);
        requireUpgrade(
          canonicalJson(stored.operation.plan) === canonicalJson(observed.plan),
          'retirement intent changed',
        );
        assertUpgradeOwner(access, store, stored.operation);
        if (!current) return finishUpgradeHistory(access, stored, history);
        if (stored.operation.phase === 'retiring') {
          await saveActivation(access, stored, 'unknown_retirement');
          throw new Error(label + ': retirement beforeimage remains UNKNOWN and cannot authorize another move');
        }
        requireUpgrade(
          stored.operation.phase !== 'unknown_retirement' || reconcileUnknown,
          'UNKNOWN retirement requires explicit same-operation reconciliation',
        );
        requireUpgrade(stored.operation.phase === 'released', 'retirement beforeimage remains UNKNOWN');
        return moveUpgradeHistory(access, stored, history);
      });
    },
    journal,
  );
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

async function finishUpgradeHistory(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  history: string,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(!access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label), 'active upgrade still exists');
  if (stored.operation.phase === 'completed') return stored.operation;
  requireUpgrade(stored.operation.phase === 'retiring', 'history is not a completed retirement afterimage');
  return (await saveOperation(access, stored, 'completed', stored.operation.next_file, undefined, history)).operation;
}

async function retainUpgradeHistoryMoveFailure(
  access: SafeRepositoryAccess,
  retiring: ReturnType<typeof readOperation>,
  history: string,
  error: unknown,
): Promise<never> {
  if (!(error instanceof SafeRepositoryMoveError) || error.code !== 'SAFE_REPOSITORY_MOVE_NOT_APPLIED') {
    if (access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label))
      return retainActivationUnknown(access, retiring, 'unknown_retirement', error);
    throw error;
  }
  try {
    requireUpgrade(
      access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label) &&
        image(access, PROJECT_UPGRADE_OPERATION_PATH) === retiring.bytes &&
        !access.fileExists(history, label),
      'retirement move denial beforeimage changed before restoration',
    );
  } catch (validationError) {
    return retainActivationUnknown(
      access,
      retiring,
      'unknown_retirement',
      new AggregateError([error, validationError], 'Retirement move denial could not be revalidated'),
    );
  }
  return retainUpgradeFailure(
    () => saveActivation(access, retiring, 'released'),
    error,
    'Retirement move denial and phase restoration failed',
  );
}

async function moveUpgradeHistory(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  history: string,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(stored.operation.phase === 'released', 'unissued retirement requires verified release');
  requireUpgrade(!access.fileExists(history, label), 'upgrade history already exists');
  const retiring = await saveActivation(access, stored, 'retiring');
  try {
    await access.moveNoReplaceAsync(PROJECT_UPGRADE_OPERATION_PATH, history, digest(retiring.bytes), label);
    requireUpgrade(image(access, history) === retiring.bytes, 'retirement afterimage differs');
    return await finishUpgradeHistory(access, retiring, history);
  } catch (error) {
    return retainUpgradeHistoryMoveFailure(access, retiring, history, error);
  }
}

/** Retire only after the executing loader supports the activated format and all Host connections are settled. */
export async function retireFreshProjectUpgrade(
  repositoryRoot: string,
  operationId: string,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(typeof reconcileUnknown === 'boolean', 'explicit reconciliation flag required');
  assertProjectConfigurationBundleCapability();
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const history = projectUpgradeHistoryPath(operationId);
  const canonical = access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label);
  const journal = canonical ? PROJECT_UPGRADE_OPERATION_PATH : history;
  const observed = readOperation(access, operationId, journal);
  if (!canonical && observed.operation.phase === 'completed') return observed.operation;
  await withFreshUpgradeHost(
    repositoryRoot,
    operationId,
    async (store) => {
      const receipt = assertRetainedUpgradeFence(store, observed.operation);
      requireUpgrade(receipt.fence.status === 'released', 'verified release required before retirement');
      assertActivationClosure(access, observed.operation, receipt.fence.generation);
    },
    journal,
  );
  await access.ensureDirectoryAsync(path.posix.dirname(history), label);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    const current = access.fileExists(PROJECT_UPGRADE_OPERATION_PATH, label);
    const stored = readOperation(access, operationId, current ? PROJECT_UPGRADE_OPERATION_PATH : history);
    requireUpgrade(
      canonicalJson(stored.operation.plan) === canonicalJson(observed.operation.plan),
      'retirement intent changed',
    );
    assertBootstrapAuthority(bootstrapVerifier(stored.operation), stored.operation);
    if (!current) return finishUpgradeHistory(access, stored, history);
    if (stored.operation.phase === 'retiring') {
      await saveActivation(access, stored, 'unknown_retirement');
      throw new Error(label + ': retirement beforeimage remains UNKNOWN and cannot authorize another move');
    }
    requireUpgrade(
      stored.operation.phase !== 'unknown_retirement' || reconcileUnknown,
      'UNKNOWN retirement requires explicit same-operation reconciliation',
    );
    requireUpgrade(
      stored.operation.phase === 'released',
      'retirement beforeimage remains UNKNOWN and cannot authorize another move',
    );
    return moveUpgradeHistory(access, stored, history);
  });
}

async function saveOperation(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  phase: ProjectUpgradeOperation['phase'],
  nextFile: number,
  storage?: Pick<ProjectUpgradeOperation, 'storage_phase' | 'staging_identity' | 'existing_database'>,
  journalPath = PROJECT_UPGRADE_OPERATION_PATH,
  activation: string | null = stored.operation.activation,
): Promise<ReturnType<typeof readOperation>> {
  requireUpgrade(stored.operation.revision < Number.MAX_SAFE_INTEGER, 'journal revision exhausted');
  requireUpgrade(validatedOperations.has(stored.operation), 'unvalidated journal successor');
  const operation = Object.freeze({
    ...stored.operation,
    revision: stored.operation.revision + 1,
    phase,
    next_file: nextFile,
    ...storage,
    activation,
  });
  assertPublicationProgress(operation);
  assertStorageProgress(operation);
  assertActivationProgress(operation);
  validatedOperations.add(operation);
  const bytes = serialized(operation);
  await access.replaceAtomicAsync(journalPath, digest(stored.bytes), bytes, label);
  return { bytes, operation };
}

function bootstrapStagingPath(operation: ProjectUpgradeOperation): string {
  return '.vida/work/.upgrade-' + operation.plan.operation_id + '.sqlite';
}

function assertBootstrapPublicationOwner(
  access: SafeRepositoryAccess,
  verifier: ProjectUpgradeBootstrapVerifier,
  operation: ProjectUpgradeOperation,
): void {
  assertBootstrapAuthority(verifier, operation);
  requireUpgrade(
    operation.plan.database_mode === 'fresh' && operation.initial_database !== null,
    'retained fresh image required',
  );
  requireUpgrade(access.repository_root === operation.plan.repository_root, 'foreign bootstrap repository');
}

async function saveStorage(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  phase: ProjectUpgradeOperation['storage_phase'],
  identity: ClosedWorkspaceDatabaseImage | null,
  existingDatabase: UnifiedDatabaseImage | null = stored.operation.existing_database,
): Promise<ReturnType<typeof readOperation>> {
  return saveOperation(access, stored, stored.operation.phase, stored.operation.next_file, {
    storage_phase: phase,
    staging_identity: identity,
    existing_database: existingDatabase,
  });
}

async function retainStorageUnknown(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  phase: 'unknown_write' | 'unknown_move',
  error: unknown,
): Promise<never> {
  return retainUpgradeFailure(
    () => saveStorage(access, stored, phase, stored.operation.staging_identity),
    error,
    'Bootstrap effect and UNKNOWN recording failed',
  );
}

function inspectPublishedBootstrap(access: SafeRepositoryAccess, operation: ProjectUpgradeOperation): void {
  const expected = operation.staging_identity;
  requireUpgrade(expected !== null && operation.initial_database !== null, 'published bootstrap identity is missing');
  requireUpgrade(!access.fileExists(bootstrapStagingPath(operation), label), 'published bootstrap still has staging');
  const actual = inspectInitialWorkspaceDatabaseImage(
    access.repository_root,
    PROJECT_WORKSPACE_DATABASE_PATH,
    operation.initial_database,
  );
  requireUpgrade(canonicalJson(actual) === canonicalJson(expected), 'published bootstrap file was replaced');
}

async function reconcileBootstrapEffect(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  reconcileUnknown: boolean,
): Promise<ReturnType<typeof readOperation>> {
  const operation = stored.operation;
  const phase = operation.storage_phase;
  if (!['writing', 'moving', 'unknown_write', 'unknown_move'].includes(phase)) return stored;
  assertResumeReconciliationConsent(operation, reconcileUnknown);
  requireUpgrade(operation.initial_database !== null, 'retained image required');
  try {
    if (phase === 'writing' || phase === 'unknown_write') {
      assertStorageFileAbsent(access, PROJECT_WORKSPACE_DATABASE_PATH);
      const actual = inspectInitialWorkspaceDatabaseImage(
        access.repository_root,
        bootstrapStagingPath(operation),
        operation.initial_database,
      );
      return await saveStorage(access, stored, 'staged', actual);
    }
    inspectPublishedBootstrap(access, operation);
    return await saveStorage(access, stored, 'published', operation.staging_identity);
  } catch (error) {
    if (phase.startsWith('unknown')) throw error;
    return retainStorageUnknown(access, stored, phase === 'writing' ? 'unknown_write' : 'unknown_move', error);
  }
}

async function writeBootstrapStaging(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  verifier: ProjectUpgradeBootstrapVerifier,
): Promise<ReturnType<typeof readOperation>> {
  assertBootstrapPublicationOwner(access, verifier, stored.operation);
  assertFreshStorageAbsent(access, originalConfig(stored.operation.plan));
  const staging = bootstrapStagingPath(stored.operation);
  assertStorageFileAbsent(access, staging);
  await access.ensureDirectoryAsync(path.posix.dirname(staging), label);
  const writing = await saveStorage(access, stored, 'writing', null);
  try {
    assertBootstrapPublicationOwner(access, verifier, writing.operation);
    assertFreshStorageAbsent(access, originalConfig(writing.operation.plan));
    const initial = writing.operation.initial_database!;
    await access.writeExclusiveBytesAsync(staging, Buffer.from(initial.bytes_base64, 'base64'), label);
    const actual = inspectInitialWorkspaceDatabaseImage(access.repository_root, staging, initial);
    assertBootstrapPublicationOwner(access, verifier, writing.operation);
    return await saveStorage(access, writing, 'staged', actual);
  } catch (error) {
    return retainStorageUnknown(access, writing, 'unknown_write', error);
  }
}

async function retainBootstrapMoveFailure(
  access: SafeRepositoryAccess,
  moving: ReturnType<typeof readOperation>,
  verifier: ProjectUpgradeBootstrapVerifier,
  staging: string,
  before: ClosedWorkspaceDatabaseImage,
  error: unknown,
): Promise<never> {
  if (!(error instanceof SafeRepositoryMoveError) || error.code !== 'SAFE_REPOSITORY_MOVE_NOT_APPLIED')
    return retainStorageUnknown(access, moving, 'unknown_move', error);
  try {
    assertBootstrapPublicationOwner(access, verifier, moving.operation);
    assertFreshStorageAbsent(access, originalConfig(moving.operation.plan));
    await assertRetainedInitialSchema(moving.operation);
    const actual = inspectInitialWorkspaceDatabaseImage(
      access.repository_root,
      staging,
      moving.operation.initial_database!,
    );
    requireUpgrade(
      canonicalJson(actual) === canonicalJson(before) &&
        canonicalJson(actual) === canonicalJson(moving.operation.staging_identity),
      'bootstrap move denial staging image differs',
    );
  } catch (validationError) {
    return retainStorageUnknown(
      access,
      moving,
      'unknown_move',
      new AggregateError([error, validationError], 'Bootstrap move denial could not be revalidated'),
    );
  }
  return retainUpgradeFailure(
    () => saveStorage(access, moving, 'staged', before),
    error,
    'Bootstrap move denial and phase restoration failed',
  );
}

async function moveBootstrapDatabase(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
  verifier: ProjectUpgradeBootstrapVerifier,
): Promise<ReturnType<typeof readOperation>> {
  assertBootstrapPublicationOwner(access, verifier, stored.operation);
  assertStorageFileAbsent(access, PROJECT_WORKSPACE_DATABASE_PATH);
  const staging = bootstrapStagingPath(stored.operation);
  const before = inspectInitialWorkspaceDatabaseImage(
    access.repository_root,
    staging,
    stored.operation.initial_database!,
  );
  requireUpgrade(
    canonicalJson(before) === canonicalJson(stored.operation.staging_identity),
    'staging identity changed',
  );
  const moving = await saveStorage(access, stored, 'moving', before);
  try {
    assertBootstrapPublicationOwner(access, verifier, moving.operation);
    await access.moveNoReplaceAsync(staging, PROJECT_WORKSPACE_DATABASE_PATH, before.sha256, label);
    inspectPublishedBootstrap(access, moving.operation);
    assertBootstrapPublicationOwner(access, verifier, moving.operation);
    return await saveStorage(access, moving, 'published', before);
  } catch (error) {
    return retainBootstrapMoveFailure(access, moving, verifier, staging, before, error);
  }
}

/** Finite same-operation publication. An uncertain beforeimage never authorizes another write or move. */
export async function applyFreshProjectUpgradeDatabase(
  repositoryRoot: string,
  operationId: string,
  verifier: ProjectUpgradeBootstrapVerifier,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(typeof reconcileUnknown === 'boolean', 'explicit reconciliation flag required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    let stored = readOperation(access, operationId);
    assertBootstrapPublicationOwner(access, verifier, stored.operation);
    requireUpgrade(
      stored.operation.phase === 'planned' || stored.operation.storage_phase === 'published',
      'storage cannot publish after configuration effects',
    );
    stored = await reconcileBootstrapEffect(access, stored, reconcileUnknown);
    if (stored.operation.storage_phase === 'absent') stored = await writeBootstrapStaging(access, stored, verifier);
    if (stored.operation.storage_phase === 'staged') stored = await moveBootstrapDatabase(access, stored, verifier);
    requireUpgrade(stored.operation.storage_phase === 'published', 'bootstrap publication is incomplete');
    inspectPublishedBootstrap(access, stored.operation);
    assertBootstrapPublicationOwner(access, verifier, stored.operation);
    return stored.operation;
  });
}

/** Explicit same-operation initialization repair; the verifier never crosses JSON/public ingress. */
export async function resumeFreshProjectUpgradeDatabase(
  repositoryRoot: string,
  operationId: string,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  requireUpgrade(typeof reconcileUnknown === 'boolean', 'explicit reconciliation flag required');
  const retained = inspectPlannedProjectUpgrade(repositoryRoot, operationId);
  requireUpgrade(retained.plan.database_mode === 'fresh', 'fresh repair required');
  assertResumeReconciliationConsent(retained, reconcileUnknown);
  await assertRetainedInitialSchema(retained);
  return applyFreshProjectUpgradeDatabase(repositoryRoot, operationId, bootstrapVerifier(retained), reconcileUnknown);
}

async function withFreshUpgradeHost<T>(
  repositoryRoot: string,
  operationId: string,
  action: (store: HostStateStore) => Promise<T>,
  journalPath = PROJECT_UPGRADE_OPERATION_PATH,
): Promise<T> {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const stored = access.withExclusiveLock(PROJECT_UPGRADE_OPERATION_PATH, label, () =>
    readOperation(access, operationId, journalPath),
  );
  const operation = stored.operation;
  assertBootstrapPublicationOwner(access, bootstrapVerifier(operation), operation);
  requireUpgrade(
    operation.storage_phase === 'published' &&
      operation.staging_identity !== null &&
      operation.initial_database !== null,
    'published initial database required',
  );
  await assertRetainedInitialSchema(operation);
  const database = openAdmittedWorkspaceDatabase(
    repositoryRoot,
    PROJECT_WORKSPACE_DATABASE_PATH,
    operation.plan.workspace_id,
    false,
  );
  const errors: unknown[] = [];
  let result!: T;
  try {
    const count = database
      .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM agent_host_maintenance')
      .get()?.count;
    requireUpgrade(count === 0 || count === 1, 'fresh database contains foreign maintenance rows');
    assertFreshWorkspaceDatabaseSchema(database, operation.initial_database, count === 1);
    if (count === 0)
      inspectInitialWorkspaceDatabaseImage(repositoryRoot, PROJECT_WORKSPACE_DATABASE_PATH, operation.initial_database);
    const binding = projectUpgradeFenceBinding(operation);
    let store!: HostStateStore;
    const verifier: MaintenanceReleaseVerifier = {
      principal: 'vida:project-upgrade',
      projectIds: operation.plan.project_ids,
      verifyAcquisition(requested, prior): void {
        requireUpgrade(database.inTransaction, 'bootstrap fence verification requires the Host transaction');
        requireUpgrade(canonicalJson(requested) === canonicalJson(binding), 'bootstrap fence request differs');
        requireUpgrade(
          digest(access.readText(PROJECT_UPGRADE_OPERATION_PATH, label)) === digest(stored.bytes),
          'bootstrap journal changed before fence acquisition',
        );
        store.assertWorkspaceDatabaseBootstrap(
          repositoryRoot,
          PROJECT_WORKSPACE_DATABASE_PATH,
          operation.staging_identity!,
          operation.initial_database!.binding,
        );
        assertFreshWorkspaceDatabaseSchema(database, operation.initial_database!, prior !== null);
      },
      verify(held) {
        const current = readOperation(access, operationId).operation;
        if (current.phase !== 'releasing' || canonicalJson(held.binding) !== canonicalJson(binding)) return null;
        assertUpgradeOwner(access, store, current);
        assertActivationClosure(access, current, held.generation);
        assertFreshWorkspaceDatabaseSchema(database, current.initial_database!, true);
        return {
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: 'vida:project-upgrade',
          fence_digest: canonicalJsonDigest(held),
          closure_digest: binding.closure_digest,
          bundle_digest: binding.bundle_digest,
        };
      },
    };
    store = new HostStateStore(
      database,
      operation.plan.workspace_id,
      undefined,
      undefined,
      undefined,
      verifier,
      repositoryRoot,
    );
    assertUpgradeOwner(access, store, operation);
    if (count === 1) assertRetainedUpgradeFence(store, operation);
    result = await action(store);
    assertFreshWorkspaceDatabaseSchema(database, operation.initial_database, true);
  } catch (error) {
    errors.push(error);
  }
  try {
    checkpointAndCloseWorkspaceDatabase(
      database,
      repositoryRoot,
      PROJECT_WORKSPACE_DATABASE_PATH,
      operation.staging_identity,
    );
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Fresh upgrade Host action and close failed');
  return result;
}

/** Fresh repair uses an existing-only real Host connection and its recorded-token fence; release awaits activation closure. */
export async function applyFreshProjectUpgradeFiles(
  repositoryRoot: string,
  operationId: string,
  reconcileUnknown = false,
): Promise<ProjectUpgradeOperation> {
  let operation = inspectPlannedProjectUpgrade(repositoryRoot, operationId);
  if (operation.storage_phase !== 'published')
    operation = await resumeFreshProjectUpgradeDatabase(repositoryRoot, operationId, reconcileUnknown);
  return withFreshUpgradeHost(repositoryRoot, operationId, async (store) => {
    if (operation.phase === 'unknown') {
      requireUpgrade(reconcileUnknown, 'UNKNOWN file publication requires explicit same-operation reconciliation');
      await reconcileProjectUpgradeFiles(repositoryRoot, operationId, store);
    }
    return applyProjectUpgradeFiles(repositoryRoot, operationId, store);
  });
}

/** Reconcile only an observed completed file publication; a beforeimage never proves absence of an UNKNOWN effect. */
export async function reconcileProjectUpgradeFiles(
  repositoryRoot: string,
  operationId: string,
  store: HostStateStore,
): Promise<ProjectUpgradeOperation> {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    const stored = readOperation(access, operationId);
    assertUpgradeOwner(access, store, stored.operation);
    retainedFence(store, stored.operation);
    requireUpgrade(stored.operation.phase === 'unknown', 'same UNKNOWN operation required');
    assertFileSet(access, stored.operation);
    const file = stored.operation.plan.files[stored.operation.next_file]!;
    requireUpgrade(image(access, file.path) === file.after, 'UNKNOWN publication outcome remains unresolved');
    const nextFile = stored.operation.next_file + 1;
    const next = await saveOperation(
      access,
      stored,
      nextFile === stored.operation.plan.files.length ? 'files_published' : 'fenced',
      nextFile,
    );
    assertUpgradeOwner(access, store, next.operation);
    retainedFence(store, next.operation);
    assertFileSet(access, next.operation);
    return next.operation;
  });
}

async function resumeInterruptedPublication(
  access: SafeRepositoryAccess,
  stored: ReturnType<typeof readOperation>,
): Promise<ReturnType<typeof readOperation>> {
  if (stored.operation.phase !== 'publishing') return stored;
  const uncertain = stored.operation.plan.files[stored.operation.next_file]!;
  if (image(access, uncertain.path) !== uncertain.after) {
    await saveOperation(access, stored, 'unknown', stored.operation.next_file);
    throw new Error(label + ': interrupted publication outcome remains unresolved');
  }
  const nextFile = stored.operation.next_file + 1;
  return saveOperation(
    access,
    stored,
    nextFile === stored.operation.plan.files.length ? 'files_published' : 'fenced',
    nextFile,
  );
}

async function ensureUpgradeOutputParent(
  access: SafeRepositoryAccess,
  target: string,
  repositoryIdentity: string,
): Promise<void> {
  const parent = path.posix.dirname(target);
  if (parent === '.') {
    requireUpgrade(access.directoryIdentity('.', label) === repositoryIdentity, 'repository root was replaced');
    return;
  }
  await access.ensureDirectoryAsync(parent, label);
}

/** Publish prepared configuration under the existing trusted Host fence. Activation remains a separate closure gate. */
export async function applyProjectUpgradeFiles(
  repositoryRoot: string,
  operationId: string,
  store: HostStateStore,
): Promise<ProjectUpgradeOperation> {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  return access.withExclusiveLockAsync(PROJECT_UPGRADE_OPERATION_PATH, label, async () => {
    let stored = readOperation(access, operationId);
    assertUpgradeOwner(access, store, stored.operation);
    requireUpgrade(
      stored.operation.phase !== 'unknown',
      'UNKNOWN publication requires explicit same-operation reconciliation',
    );
    requireUpgrade(
      ['planned', 'fenced', 'publishing', 'files_published'].includes(stored.operation.phase),
      'initial intent must be fully published before configuration effects',
    );
    requireUpgrade(
      stored.operation.plan.database_mode === 'fresh'
        ? stored.operation.storage_phase === 'published'
        : stored.operation.storage_phase === 'merge_published' && stored.operation.existing_database !== null,
      'database storage preparation is incomplete',
    );
    assertFileSet(access, stored.operation);
    const save = async (phase: ProjectUpgradeOperation['phase'], nextFile: number): Promise<void> => {
      stored = await saveOperation(access, stored, phase, nextFile);
    };
    const binding = projectUpgradeFenceBinding(stored.operation);
    let receipt: MaintenanceFenceReceipt;
    if (stored.operation.phase === 'planned') {
      receipt = store.acquireMaintenanceFenceWithRecordedToken(binding, stored.operation.plan.token);
      await save('fenced', 0);
    } else {
      receipt = retainedFence(store, stored.operation);
    }
    assertUpgradeOwner(access, store, stored.operation);
    store.assertMaintenanceFence(receipt);
    stored = await resumeInterruptedPublication(access, stored);
    if (stored.operation.phase === 'files_published') return stored.operation;
    for (let index = stored.operation.next_file; index < stored.operation.plan.files.length; index++) {
      const file = stored.operation.plan.files[index]!;
      store.assertMaintenanceFence(receipt);
      await ensureUpgradeOutputParent(access, file.path, stored.operation.plan.repository_identity);
      await save('publishing', index);
      store.assertMaintenanceFence(receipt);
      assertUpgradeOwner(access, store, stored.operation);
      const images = assertFileSet(access, stored.operation);
      const current = images.get(file.path);
      requireUpgrade(current !== undefined, 'publication target is missing from the boundary snapshot');
      try {
        if (current !== file.after) {
          if (current === null) await access.writeExclusiveAsync(file.path, file.after, label);
          else await access.replaceAtomicAsync(file.path, digest(current), file.after, label);
        }
        store.assertMaintenanceFence(receipt);
        assertUpgradeOwner(access, store, stored.operation);
        requireUpgrade(image(access, file.path) === file.after, 'publication afterimage not observed');
      } catch (error) {
        return retainUpgradeFailure(
          () => save('unknown', index),
          error,
          'Upgrade publication and UNKNOWN recording failed',
        );
      }
      await save(index + 1 === stored.operation.plan.files.length ? 'files_published' : 'fenced', index + 1);
    }
    assertUpgradeOwner(access, store, stored.operation);
    store.assertMaintenanceFence(receipt);
    assertFileSet(access, stored.operation);
    return stored.operation;
  });
}
