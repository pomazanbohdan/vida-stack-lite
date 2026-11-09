import type { Database } from 'bun:sqlite';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import operationSchema from '../schemas/consumer-configuration-operation.v3.schema.json' with { type: 'json' };
import { createHash } from 'node:crypto';
import path from 'node:path';
import { stringify } from 'yaml';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  applyProductModelToRuntimeConfig,
  assertProjectUpgradeInactive,
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
} from '../src/config/runtime-config.ts';
import { validateRuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import {
  RUNTIME_INITIALIZATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
  sessionHandoffDatabaseRelativePath,
  sessionBridgeDatabaseRelativePath,
  assertConsumerCleanInitializationInactive,
} from '../src/config/project-paths.ts';
import {
  acquireStorageReadAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithConfigurationAdoptionIntent,
  withExclusiveInitConfigAdmission,
  withExclusiveStorageInitConfigAdmission,
  withCleanInitializationPublicationLocks,
  withCleanInitializationReceiptLocks,
  type JoinedInitConfigAdmissionProof,
} from '../src/config/storage-read-admission.ts';
import {
  openUnadmittedWorkspaceDatabase,
  withWorkspaceDatabaseClose,
  withWorkspaceDatabaseCloseAsync,
} from '../src/config/workspace-database-raw.ts';
import {
  withConfigurationAdoptionHostAdmission,
  assertConfigurationAdoptionHostAdmission,
} from '../src/config/clean-initialization-admission.ts';
import {
  HostStateStore,
  inspectHostWorkspaceDatabase,
  type MaintenanceFence,
  type MaintenanceFenceBinding,
  type MaintenanceFenceReceipt,
  type MaintenanceReleaseVerifier,
} from '../src/host-state.ts';
import { derivePendingConfigurationReceipt, initializationObservationContext } from './init-core.ts';
import {
  finishOperation,
  observeArchivedCompletion,
  validateConsumerConfigurationOperation,
  type ConsumerConfigurationOperationBase,
  type Bytes,
} from './consumer-configuration-operation.ts';
import {
  consumerConfigurationProjectMappings,
  validateConfigurationAdoptionRequest,
  type ConsumerConfigurationRequestV3,
  type ConfigurationRecovery,
} from './init-configuration.ts';

const outputs = [
  'AGENTS.md',
  'AGENT.sidecar.md',
  'agent-runtime.config.v1.yaml',
  'docs/agent-instructions/documentation-policy.v1.json',
];
const templates = [
  'templates/AGENTS.template.md',
  'templates/AGENT.sidecar.template.md',
  'templates/agent-runtime.config.template.v1.yaml',
  'templates/documentation-policy.template.v1.json',
];
const pending = '.agent/runtime-initialization.pending.v1.json';
const hash = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const decode = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
const encoded = (bytes: string | Uint8Array): Bytes => ({
  base64: Buffer.from(bytes).toString('base64'),
  sha256: hash(bytes),
});
const decoded = (bytes: Bytes) => Buffer.from(bytes.base64, 'base64');
const archivePath = (id: string) => `.agent/consumer-configuration-operation.${id}.v3.json`;

function requireAdoption(value: unknown, message: string): asserts value {
  if (!value) throw new Error('Configuration adoption: ' + message);
}

export interface AdoptionStorageSnapshot {
  readonly relative_path: string;
  readonly exists: boolean;
  readonly identity: string | null;
  readonly parent_identity: string;
  readonly data_digest: string | null;
}

export interface ConfigurationAdoptionBinding {
  readonly mode: 'host_present_pending_receipt';
  readonly host: AdoptionStorageSnapshot;
  readonly workflow: AdoptionStorageSnapshot;
  readonly projects: readonly (readonly [string, string, string])[];
  readonly original_receipt_sha256: string;
  readonly output_drift: readonly string[];
  readonly template_drift: readonly string[];
  readonly runtime: readonly (readonly [string, string])[];
}

export interface ConfigurationAdoptionPlan {
  readonly schema: 'ConsumerConfigurationPlan/v3';
  readonly operation_id: string;
  readonly binding: string;
  readonly request: {
    readonly repository: string;
    readonly projects: readonly { readonly id: string; readonly root: string }[];
    readonly team_project_grants: readonly [];
    readonly product_model: ConsumerConfigurationRequestV3['productModel'];
    readonly legacy_project_id_map: Readonly<Record<string, string>>;
    readonly adoption: 'host_present_pending_receipt';
    readonly project_moves?: never;
  };
  readonly changes: {
    readonly added_projects: readonly [];
    readonly team_project_grants: readonly [];
    readonly relocation: 'none';
  };
  readonly adoption: ConfigurationAdoptionBinding;
}

type AjvConstructor = new (options: Record<string, unknown>) => { compile<T>(schema: object): ValidateFunction<T> };
const AdoptionAjv = Ajv2020 as unknown as AjvConstructor;
export const validateConfigurationAdoptionBinding = new AdoptionAjv({
  strict: true,
  allErrors: false,
  ownProperties: true,
}).compile<ConfigurationAdoptionBinding>({ $defs: operationSchema.$defs, ...operationSchema.properties.adoption });

export type ConsumerConfigurationOperationV3 = ConsumerConfigurationOperationBase & {
  readonly schema: 'ConsumerConfigurationOperation/v3';
  readonly version: 3;
  readonly request: ConsumerConfigurationRequestV3;
  readonly adoption: ConfigurationAdoptionBinding;
  readonly receipt: { readonly before: Bytes; readonly target: Bytes };
};

interface ActiveAdoption {
  readonly record: ConsumerConfigurationOperationV3;
  readonly proof: JoinedInitConfigAdmissionProof<MaintenanceFence>;
  readonly receipt: MaintenanceFenceReceipt;
  readonly assertActive: () => void;
}
const activeAdoptions = new WeakMap<object, ActiveAdoption>();

function sqliteValue(value: unknown): unknown {
  if (value instanceof Uint8Array) return { blob: Buffer.from(value).toString('base64') };
  requireAdoption(value === null || ['string', 'number', 'bigint'].includes(typeof value), 'unsupported SQLite value');
  return typeof value === 'bigint' ? { integer: value.toString() } : value;
}

/** Retain every schema and data row; only the native maintenance row may change. */
function adoptionDatabaseDigest(database: Database): string {
  const definitions = database
    .query<{ type: string; name: string; sql: string | null }, []>(
      "SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
    .all();
  const tables = definitions.filter((row) => row.type === 'table');
  requireAdoption(tables.length <= 256, 'database table inventory exceeds bound');
  const data = tables
    .filter((row) => row.name !== 'agent_host_maintenance')
    .map((table) => {
      const identifier = '"' + table.name.replaceAll('"', '""') + '"';
      const rows = database.query<Record<string, unknown>, []>('SELECT * FROM ' + identifier + ' LIMIT 100001').all();
      requireAdoption(rows.length <= 100000, 'database row inventory exceeds bound');
      const digests = rows
        .map((row) =>
          canonicalJsonDigest(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, sqliteValue(value)]))),
        )
        .sort();
      return [table.name, digests];
    });
  return canonicalJsonDigest({ definitions, data });
}

function storageSnapshot(root: string, workspace: string, relative: string): AdoptionStorageSnapshot {
  const access = requireSafeRepositoryAccess(root),
    exists = access.fileExists(relative, 'adoption storage');
  const base = {
    relative_path: relative,
    exists,
    parent_identity: access.directoryIdentity(path.posix.dirname(relative), 'adoption storage parent'),
  };
  if (!exists) return { ...base, identity: null, data_digest: null };
  requireAdoption(access.observeFileIdentity, 'native storage identity observation unavailable');
  const identity = access.observeFileIdentity(relative, 'adoption storage');
  const admission = acquireStorageReadAdmission(root, workspace, relative);
  const database = openExistingWorkspaceDatabaseWithAdmission(root, relative, admission, true, false);
  try {
    return { ...base, identity, data_digest: adoptionDatabaseDigest(database) };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}

function validateExistingReceipt(
  request: ConsumerConfigurationRequestV3,
  ctx: ReturnType<typeof initializationObservationContext>,
  config: ReturnType<typeof parseRuntimeConfigYaml>,
  bytes: Buffer,
) {
  const schema = ctx.readPackageBytes('schemas/runtime-initialization.v1.schema.json');
  const receipt = validateRuntimeInitializationReceipt(JSON.parse(decode(bytes)), decode(schema));
  requireAdoption(receipt.workspace_binding_status === 'pending', 'initialization workspace is bound');
  requireAdoption(
    receipt.repository_id === request.repository &&
      receipt.workspace_id === deriveWorkspaceId(request.repository, ctx.canonicalRoot) &&
      receipt.config_digest === runtimeConfigDigest(config) &&
      receipt.integrations_digest === canonicalJsonDigest(config.integrations) &&
      receipt.bundle === config.runtime.bundle &&
      receipt.schema_sha256 === hash(schema) &&
      canonicalJsonDigest(receipt.project_ids) ===
        canonicalJsonDigest(config.projects.map((project) => project.project_id).sort()),
    'pending receipt identity or configuration differs',
  );
  return receipt;
}

function validateProjectIdentities(
  ctx: ReturnType<typeof initializationObservationContext>,
  config: ReturnType<typeof parseRuntimeConfigYaml>,
  request: ConsumerConfigurationRequestV3,
): readonly (readonly [string, string, string])[] {
  const mapped = config.projects.map((project) => ({
    id: request.legacyProjectIdMap?.[project.project_id] ?? project.project_id,
    root: project.project_root,
  }));
  requireAdoption(
    canonicalJsonDigest([...mapped].sort((left, right) => left.id.localeCompare(right.id))) ===
      canonicalJsonDigest([...ctx.selectedProjects].sort((left, right) => left.id.localeCompare(right.id))),
    'adoption cannot add, remove or relocate projects',
  );
  return config.projects
    .flatMap((project) => {
      const target = request.legacyProjectIdMap?.[project.project_id] ?? project.project_id;
      const identity = ctx.projectDirectoryIdentity(project.project_root);
      return [...new Set([project.project_id, target])].map((id) => [id, project.project_root, identity] as const);
    })
    .sort((left, right) => left[0].localeCompare(right[0]));
}

function adoptionStorageForCapture(
  ctx: ReturnType<typeof initializationObservationContext>,
  config: ReturnType<typeof parseRuntimeConfigYaml>,
  workspace: string,
  replay: ActiveAdoption | null,
) {
  if (replay) return { host: replay.record.adoption.host, workflow: replay.record.adoption.workflow };
  const relative = sessionHandoffDatabaseRelativePath(config);
  inspectHostWorkspaceDatabase(ctx.canonicalRoot, relative, workspace);
  return {
    host: storageSnapshot(ctx.canonicalRoot, workspace, relative),
    workflow: storageSnapshot(ctx.canonicalRoot, workspace, sessionBridgeDatabaseRelativePath(config)),
  };
}

export function captureHostPresentConfiguration(
  requestValue: ConsumerConfigurationRequestV3,
  recovery?: ConfigurationRecovery,
) {
  const request = validateConfigurationAdoptionRequest(requestValue);
  const replay = recovery ? requireRecovery(request, recovery) : null;
  const ctx = initializationObservationContext({
    ...request,
    projectMappings: consumerConfigurationProjectMappings(request),
  });
  const view = ctx.observation,
    access = requireSafeRepositoryAccess(ctx.canonicalRoot);
  assertProjectUpgradeInactive(view);
  assertConsumerCleanInitializationInactive(view);
  requireAdoption(
    replay !== null || !view.fileExists(pending, 'configuration intent'),
    'pending operation requires exact recovery',
  );
  requireAdoption(
    !view.fileExists(PROJECT_WORKSPACE_DATABASE_PATH, 'project storage'),
    'unified project storage adoption is unsupported',
  );
  const before = replay
    ? replay.record.before.map(decoded)
    : outputs.map((file) => view.readBytes(file, 'existing adoption output'));
  const config = parseRuntimeConfigYaml(decode(before[2]!));
  requireAdoption(
    config.schema === 'AgentRuntimeConfig/v1' && config.repository.repository_id === request.repository,
    'adoption requires the bound v1 repository',
  );
  requireAdoption(
    config.repository.policy === outputs[0] && config.repository.sidecar === outputs[1],
    'integration output paths differ',
  );
  ctx.validatePolicy(config, decode(before[3]!));
  const projects = validateProjectIdentities(ctx, config, request);
  const receiptBytes = replay
    ? decoded(replay.record.receipt.before)
    : view.readBytes(RUNTIME_INITIALIZATION_PATH, 'pending adoption receipt');
  const receipt = validateExistingReceipt(request, ctx, config, receiptBytes);
  const workspace = deriveWorkspaceId(request.repository, ctx.canonicalRoot),
    hostRelative = sessionHandoffDatabaseRelativePath(config);
  requireAdoption(view.fileExists(hostRelative, 'adoption Host'), 'existing Host is required');
  const { host, workflow } = adoptionStorageForCapture(ctx, config, workspace, replay);
  requireAdoption(host.relative_path !== workflow.relative_path, 'Host and workflow storage collide');
  const defaults = ctx.defaultConfig();
  const oldPrefix = config.runtime.bundle + '/';
  const rebound = {
    ...config,
    runtime: {
      ...config.runtime,
      bundle: defaults.runtime.bundle,
      schema_root: defaults.runtime.schema_root,
      instruction_root: defaults.runtime.instruction_root,
      tooling_root: defaults.runtime.tooling_root,
    },
    knowledge: {
      ...config.knowledge,
      sources: config.knowledge.sources.map((source) =>
        source.kind === 'local' && source.location.startsWith(oldPrefix)
          ? { ...source, location: defaults.runtime.bundle + '/' + source.location.slice(oldPrefix.length) }
          : source,
      ),
    },
  };
  const target = applyProductModelToRuntimeConfig(rebound, request.productModel, {
    legacy_project_id_map: request.legacyProjectIdMap ?? {},
  });
  ctx.validatePolicy(target, decode(before[3]!));
  ctx.validateReferences(target);
  const targetConfig = stringify(target, { aliasDuplicateObjects: false });
  const runtime = [
    ...new Set([
      ...ctx.packageCodePaths(),
      ...templates,
      'package.json',
      'schemas/runtime-initialization.v1.schema.json',
    ]),
  ]
    .sort()
    .map((file) => [file, hash(ctx.readPackageBytes(file))] as const);
  const adoption: ConfigurationAdoptionBinding = {
    mode: 'host_present_pending_receipt',
    host,
    workflow,
    projects,
    original_receipt_sha256: hash(receiptBytes),
    runtime,
    output_drift: receipt.templates
      .filter((entry, index) => entry.output_sha256 !== hash(before[index]!))
      .map((entry) => entry.output),
    template_drift: receipt.templates
      .filter((entry) => entry.template_sha256 !== hash(ctx.readPackageBytes(entry.template)))
      .map((entry) => entry.template),
  };
  const planRequest: ConfigurationAdoptionPlan['request'] = {
    repository: request.repository,
    projects: ctx.selectedProjects,
    team_project_grants: [],
    product_model: request.productModel,
    legacy_project_id_map: request.legacyProjectIdMap ?? {},
    adoption: request.adoption,
  };
  const binding = canonicalJsonDigest({
    request: planRequest,
    root: ctx.canonicalRoot,
    root_identity: access.directoryIdentity('.', 'adoption root'),
    before: before.map(hash),
    receipt: hash(receiptBytes),
    target: hash(targetConfig),
    adoption,
  });
  const plan: ConfigurationAdoptionPlan = {
    schema: 'ConsumerConfigurationPlan/v3',
    operation_id: 'config-' + binding,
    binding,
    request: planRequest,
    changes: { added_projects: [], team_project_grants: [], relocation: 'none' },
    adoption,
  };
  if (!replay) {
    requireAdoption(
      outputs.every((file, index) => view.readBytes(file, 'adoption currentness').equals(before[index]!)) &&
        view.readBytes(RUNTIME_INITIALIZATION_PATH, 'adoption receipt currentness').equals(receiptBytes),
      'adoption inputs changed during planning',
    );
    requireAdoption(
      canonicalJsonDigest(storageSnapshot(ctx.canonicalRoot, workspace, hostRelative)) === canonicalJsonDigest(host) &&
        canonicalJsonDigest(storageSnapshot(ctx.canonicalRoot, workspace, workflow.relative_path)) ===
          canonicalJsonDigest(workflow),
      'Host storage changed during planning',
    );
  }
  return {
    plan,
    targetConfig,
    targetPolicy: decode(before[3]!),
    relocationInventory: [],
    before,
    receipt: receiptBytes,
  };
}

function readOperation(bytes: Buffer): ConsumerConfigurationOperationV3 {
  const record = validateConsumerConfigurationOperation(JSON.parse(decode(bytes)));
  requireAdoption(record.schema === 'ConsumerConfigurationOperation/v3', 'operation is not v3');
  requireAdoption(
    record.operation_id === 'config-' + record.binding && !record.relocation,
    'operation identity or relocation differs',
  );
  return record;
}

function assertOwnedBytes(record: ConsumerConfigurationOperationV3, bytes: Buffer, archived = false): void {
  const access = requireSafeRepositoryAccess(record.root),
    file = archived ? archivePath(record.operation_id) : pending;
  requireAdoption(access.directoryIdentity('.', 'adoption root') === record.root_identity, 'physical root changed');
  requireAdoption(access.readBytes(file, 'adoption operation').equals(bytes), 'operation bytes changed');
  requireAdoption(
    !access.fileExists(archived ? pending : archivePath(record.operation_id), 'adoption conflicting operation'),
    'pending/archive conflict',
  );
}

function requireRecovery(request: ConsumerConfigurationRequestV3, recovery: ConfigurationRecovery): ActiveAdoption {
  requireAdoption(recovery.adoptionAdmission, 'native adoption admission is required');
  const active = activeAdoptions.get(recovery.adoptionAdmission);
  requireAdoption(active, 'adoption admission is forged or expired');
  active.assertActive();
  const bytes = recovery.archived ? recovery.archive : recovery.pending,
    record = readOperation(bytes);
  requireAdoption(
    canonicalJsonDigest(record.request) === canonicalJsonDigest(request) && record.binding === active.record.binding,
    'recovery request or operation differs',
  );
  assertOwnedBytes(record, bytes, recovery.archived === true);
  requireAdoption(
    record.before.every((entry, i) => decoded(entry).equals(recovery.before[i]!)) &&
      decoded(record.target).equals(recovery.target) &&
      decoded(record.receipt.before).equals(recovery.beforeReceipt!) &&
      decoded(record.receipt.target).equals(recovery.targetReceipt!),
    'recovery before/target image differs',
  );
  const access = requireSafeRepositoryAccess(record.root);
  for (const index of [0, 1, 3])
    requireAdoption(
      access.readBytes(outputs[index]!, 'preserved adoption output').equals(decoded(record.before[index]!)),
      'preserved output changed',
    );
  assertRecoveryOrdering(record);
  assertStoragePreserved(active);
  return { ...active, record };
}

function assertRecoveryOrdering(record: ConsumerConfigurationOperationV3): void {
  const access = requireSafeRepositoryAccess(record.root);
  const config = access.readBytes(outputs[2]!, 'adoption recovery configuration');
  const receipt = access.readBytes(RUNTIME_INITIALIZATION_PATH, 'adoption recovery receipt');
  const configTarget = config.equals(decoded(record.target));
  const receiptOld = receipt.equals(decoded(record.receipt.before));
  const receiptTarget = receipt.equals(decoded(record.receipt.target));
  requireAdoption(configTarget || config.equals(decoded(record.before[2]!)), 'configuration is a third afterimage');
  requireAdoption(receiptOld || receiptTarget, 'receipt is a third afterimage');
  requireAdoption(record.progress === 'intent' || configTarget, 'configuration precedes recorded progress');
  requireAdoption(!receiptTarget || receiptOld || configTarget, 'receipt precedes configuration');
  requireAdoption(record.progress !== 'intent' || receiptOld, 'receipt precedes intent progress');
  if (record.progress === 'receipt_applied' || record.progress === 'complete')
    requireAdoption(receiptTarget, 'receipt progress lacks its target');
}

function assertPristineBeforeImages(record: ConsumerConfigurationOperationV3): void {
  const access = requireSafeRepositoryAccess(record.root);
  requireAdoption(
    outputs.every((file, index) =>
      access.readBytes(file, 'pristine adoption intent').equals(decoded(record.before[index]!)),
    ),
    'a fresh fence requires unchanged beforeimages',
  );
  requireAdoption(
    access.readBytes(RUNTIME_INITIALIZATION_PATH, 'pristine adoption receipt').equals(decoded(record.receipt.before)),
    'a fresh fence cannot adopt an unowned receipt afterimage',
  );
}

function fenceBinding(record: ConsumerConfigurationOperationV3): MaintenanceFenceBinding {
  return {
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: [...new Set(record.adoption.projects.map((row) => row[0]))].sort(),
    operation_id: record.operation_id,
    manifest_digest: record.binding,
    request_digest: canonicalJsonDigest(record.request),
    bindings_digest: canonicalJsonDigest({
      root: record.root,
      root_identity: record.root_identity,
      workspace_id: record.workspace_id,
      adoption: record.adoption,
    }),
    closure_digest: canonicalJsonDigest({
      operation: record.operation_id,
      target: record.target.sha256,
      receipt: record.receipt.target.sha256,
      preservation: record.adoption,
      contract: 'Only exact target config/receipt and preserved outputs/history permit native release then archive',
    }),
    bundle_digest: canonicalJsonDigest(record.adoption.runtime),
  };
}

function fenceToken(record: ConsumerConfigurationOperationV3): string {
  const value = hash('configuration-adoption-token\0' + record.binding + '\0' + record.root_identity);
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-4${value.slice(13, 16)}-8${value.slice(17, 20)}-${value.slice(20, 32)}`;
}

function nativeStore(
  database: Database,
  record: ConsumerConfigurationOperationV3,
  verifier: MaintenanceReleaseVerifier,
) {
  return new HostStateStore(
    database,
    record.workspace_id,
    undefined,
    undefined,
    undefined,
    verifier,
    record.root,
    undefined,
    undefined,
    undefined,
    true,
  );
}

function assertStoragePath(root: string, expected: AdoptionStorageSnapshot): void {
  const access = requireSafeRepositoryAccess(root);
  requireAdoption(
    access.directoryIdentity(path.posix.dirname(expected.relative_path), 'adoption storage parent') ===
      expected.parent_identity,
    'storage parent changed',
  );
  requireAdoption(
    access.fileExists(expected.relative_path, 'adoption storage') === expected.exists,
    'storage presence changed',
  );
  if (expected.exists)
    requireAdoption(
      access.observeFileIdentity?.(expected.relative_path, 'adoption storage') === expected.identity,
      'storage path identity changed',
    );
}

function assertStoragePreserved(active: ActiveAdoption): void {
  active.assertActive();
  for (const expected of [active.record.adoption.host, active.record.adoption.workflow]) {
    assertStoragePath(active.record.root, expected);
    if (!expected.exists) continue;
    const database = openUnadmittedWorkspaceDatabase(
      active.record.root,
      expected.relative_path,
      true,
      false,
      active.proof.captureSource,
    );
    withWorkspaceDatabaseClose(
      database,
      () => requireAdoption(adoptionDatabaseDigest(database) === expected.data_digest, 'stored work/history changed'),
      active.proof.closeSource,
      'adoption history verification and close failed',
    );
  }
}

function assertRuntimeAndProjects(record: ConsumerConfigurationOperationV3): void {
  const ctx = initializationObservationContext({
    ...record.request,
    projectMappings: consumerConfigurationProjectMappings(record.request),
  });
  requireAdoption(
    record.adoption.runtime.every(([file, digest]) => hash(ctx.readPackageBytes(file)) === digest),
    'executing runtime changed',
  );
  for (const [, relative, identity] of record.adoption.projects)
    requireAdoption(ctx.projectDirectoryIdentity(relative) === identity, 'project physical identity changed');
}

function acquisitionVerifier(
  record: ConsumerConfigurationOperationV3,
  bytes: Buffer,
  database: Database,
): MaintenanceReleaseVerifier {
  const expected = fenceBinding(record);
  return {
    principal: 'vida:configuration-adoption',
    projectIds: expected.project_ids,
    verify: () => null,
    verifyAcquisition(binding, prior) {
      requireAdoption(
        canonicalJsonDigest(binding) === canonicalJsonDigest(expected),
        'native acquisition binding differs',
      );
      assertOwnedBytes(record, bytes);
      assertRuntimeAndProjects(record);
      requireAdoption(
        adoptionDatabaseDigest(database) === record.adoption.host.data_digest,
        'Host changed before acquisition',
      );
      if (prior?.status === 'held')
        requireAdoption(
          canonicalJsonDigest(prior.binding) === canonicalJsonDigest(expected),
          'foreign maintenance fence held',
        );
      else {
        requireAdoption(
          record.progress === 'intent' && prior?.binding.operation_id !== record.operation_id,
          'only a fresh intent can acquire native maintenance',
        );
        assertPristineBeforeImages(record);
      }
    },
  };
}

function planningAuthority(record: ConsumerConfigurationOperationV3): void {
  const expected = record.adoption.host,
    admission = acquireStorageReadAdmission(record.root, record.workspace_id, expected.relative_path);
  const database = openExistingWorkspaceDatabaseWithAdmission(
    record.root,
    expected.relative_path,
    admission,
    true,
    false,
  );
  try {
    const binding = fenceBinding(record);
    const verifier: MaintenanceReleaseVerifier = {
      principal: 'vida:configuration-adoption',
      projectIds: binding.project_ids,
      verify: () => null,
      verifyAcquisition(current, prior) {
        requireAdoption(
          canonicalJsonDigest(current) === canonicalJsonDigest(binding) && prior?.status !== 'held',
          'maintenance planning binding or foreign fence differs',
        );
        requireAdoption(adoptionDatabaseDigest(database) === expected.data_digest, 'Host changed before intent');
      },
    };
    nativeStore(database, record, verifier).assertMaintenancePlanningAuthority(binding);
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}

function openFence(record: ConsumerConfigurationOperationV3, bytes: Buffer, archived: boolean) {
  const host = record.adoption.host,
    admission = acquireStorageReadAdmission(record.root, record.workspace_id, host.relative_path);
  const database = archived
    ? openExistingWorkspaceDatabaseWithAdmission(record.root, host.relative_path, admission, false, false)
    : openExistingWorkspaceDatabaseWithConfigurationAdoptionIntent(
        record.root,
        host.relative_path,
        admission,
        record.operation_id,
        bytes,
      );
  let closeAttempted = false;
  const close = () => {
    if (!closeAttempted) {
      closeAttempted = true;
      closeWorkspaceDatabaseWithAdmission(database);
    }
  };
  try {
    assertStoragePath(record.root, host);
    database.exec('PRAGMA synchronous=FULL');
    const store = nativeStore(database, record, acquisitionVerifier(record, bytes, database)),
      binding = fenceBinding(record),
      token = fenceToken(record),
      prior = store.readMaintenanceFence();
    if (prior?.status === 'released' && canonicalJsonDigest(prior.binding) === canonicalJsonDigest(binding)) {
      requireAdoption(record.progress === 'complete', 'released fence has incomplete operation');
      const receipt = { fence: prior, token };
      store.assertReleasedMaintenanceFence(receipt);
      return { kind: 'released' as const, receipt, close };
    }
    requireAdoption(!archived, 'archived operation cannot acquire maintenance');
    const receipt = store.acquireMaintenanceFenceWithRecordedToken(binding, token);
    return { kind: 'held' as const, receipt, close };
  } catch (error) {
    close();
    throw error;
  }
}

async function inNativeAdoption<T>(
  record: ConsumerConfigurationOperationV3,
  bytes: Buffer,
  archived: boolean,
  action: (proof: JoinedInitConfigAdmissionProof<MaintenanceFence>) => Promise<T>,
): Promise<T> {
  const native = openFence(record, bytes, archived),
    binding = fenceBinding(record);
  const run = async (proof: JoinedInitConfigAdmissionProof<MaintenanceFence>, assertActive: () => void) => {
    const active: ActiveAdoption = { record, proof, receipt: native.receipt, assertActive };
    activeAdoptions.set(proof, active);
    try {
      assertStoragePreserved(active);
      return await action(proof);
    } finally {
      activeAdoptions.delete(proof);
    }
  };
  try {
    if (native.kind === 'held')
      return await withConfigurationAdoptionHostAdmission({
        repositoryRoot: record.root,
        workspaceId: record.workspace_id,
        operationId: record.operation_id,
        expectedFenceBinding: binding,
        receipt: native.receipt,
        hostRelative: record.adoption.host.relative_path,
        workflowRelative: record.adoption.workflow.relative_path,
        expectedPendingBytes: bytes,
        closeHostOwner: native.close,
        operation: (capability, proof) =>
          withCleanInitializationReceiptLocks(
            proof,
            record.root,
            record.workspace_id,
            requireSafeRepositoryAccess(record.root),
            'configuration adoption',
            () =>
              run(proof, () =>
                assertConfigurationAdoptionHostAdmission(
                  capability,
                  record.root,
                  record.workspace_id,
                  record.operation_id,
                ),
              ),
          ),
      });
    native.close();
    return await withExclusiveStorageInitConfigAdmission(
      record.root,
      record.workspace_id,
      (owner) => {
        const database = openUnadmittedWorkspaceDatabase(
          record.root,
          record.adoption.host.relative_path,
          false,
          false,
          owner.captureSource,
        );
        return withWorkspaceDatabaseClose(
          database,
          () => {
            assertStoragePath(record.root, record.adoption.host);
            nativeStore(database, record, {
              principal: 'vida:configuration-adoption',
              projectIds: binding.project_ids,
              verify: () => null,
            }).assertReleasedMaintenanceFence(native.receipt);
            return native.receipt.fence;
          },
          owner.closeSource,
          'released adoption Host verification and close failed',
        );
      },
      (proof) =>
        withCleanInitializationReceiptLocks(
          proof,
          record.root,
          record.workspace_id,
          requireSafeRepositoryAccess(record.root),
          'configuration adoption archive',
          () => run(proof, proof.assertActive),
        ),
    );
  } finally {
    native.close();
  }
}

export async function applyConfigurationAdoption(
  requestValue: ConsumerConfigurationRequestV3,
  expectedBinding: string,
  operationId: string,
) {
  const request = validateConfigurationAdoptionRequest(structuredClone(requestValue)),
    capture = captureHostPresentConfiguration(request);
  requireAdoption(
    capture.plan.binding === expectedBinding && capture.plan.operation_id === operationId,
    'approved plan changed',
  );
  const access = requireSafeRepositoryAccess(request.projectRoot),
    workspace = deriveWorkspaceId(request.repository, request.projectRoot);
  const assertPlanningCurrent = () => {
    requireAdoption(
      capture.before.every((bytes, index) =>
        access.readBytes(outputs[index]!, 'adoption receipt planning').equals(bytes),
      ) && access.readBytes(RUNTIME_INITIALIZATION_PATH, 'adoption receipt planning').equals(capture.receipt),
      'receipt planning inputs changed',
    );
  };
  const derived = await derivePendingConfigurationReceipt(request, assertPlanningCurrent);
  requireAdoption(
    derived.plan.binding === capture.plan.binding && derived.beforeReceipt.equals(capture.receipt),
    'receipt derivation changed',
  );
  const recordValue = {
    schema: 'ConsumerConfigurationOperation/v3',
    version: 3,
    operation_id: operationId,
    root: request.projectRoot,
    root_identity: access.directoryIdentity('.', 'adoption root'),
    workspace_id: workspace,
    request,
    binding: expectedBinding,
    before: capture.before.map(encoded),
    target: encoded(capture.targetConfig),
    receipt: { before: encoded(derived.beforeReceipt), target: encoded(derived.targetReceipt) },
    adoption: capture.plan.adoption,
    progress: 'intent',
  };
  const bytes = Buffer.from(JSON.stringify(recordValue) + '\n'),
    record = readOperation(bytes);
  planningAuthority(record);
  await withExclusiveInitConfigAdmission(record.root, workspace, (proof) =>
    withCleanInitializationPublicationLocks(proof, record.root, workspace, async () => {
      proof.assertActive();
      requireAdoption(
        !access.fileExists(pending, 'configuration intent') &&
          !access.fileExists(archivePath(operationId), 'configuration archive'),
        'operation already exists',
      );
      requireAdoption(
        outputs.every((file, index) =>
          access.readBytes(file, 'adoption intent currentness').equals(decoded(record.before[index]!)),
        ) &&
          access
            .readBytes(RUNTIME_INITIALIZATION_PATH, 'adoption receipt currentness')
            .equals(decoded(record.receipt.before)),
        'inputs changed before intent',
      );
      assertRuntimeAndProjects(record);
      await access.writeExclusiveAtomicAsync(pending, bytes.toString('utf8'), 'configuration adoption intent');
    }),
  );
  return inNativeAdoption(record, bytes, false, (proof) => finishOperation(record, bytes, proof));
}

export async function resumeConfigurationAdoption(requestValue: ConsumerConfigurationRequestV3, operationId: string) {
  const request = validateConfigurationAdoptionRequest(structuredClone(requestValue)),
    access = requireSafeRepositoryAccess(request.projectRoot);
  requireAdoption(/^config-[a-f0-9]{64}$/.test(operationId), 'operation identity invalid');
  const hasPending = access.fileExists(pending, 'adoption intent'),
    archived = !hasPending;
  requireAdoption(hasPending || access.fileExists(archivePath(operationId), 'adoption archive'), 'operation missing');
  const bytes = access.readBytes(archived ? archivePath(operationId) : pending, 'adoption operation'),
    record = readOperation(bytes);
  requireAdoption(
    record.operation_id === operationId && canonicalJsonDigest(record.request) === canonicalJsonDigest(request),
    'resume request differs',
  );
  assertOwnedBytes(record, bytes, archived);
  return inNativeAdoption(record, bytes, archived, (proof) =>
    archived ? observeArchivedCompletion(record, bytes, proof) : finishOperation(record, bytes, proof),
  );
}

/** Called by the existing effect owner only after exact complete afterimages. */
export async function assertAdoptionArchiveReady(
  record: ConsumerConfigurationOperationV3,
  bytes: Buffer,
  proof: object,
): Promise<void> {
  const active = activeAdoptions.get(proof);
  requireAdoption(active && active.record.binding === record.binding, 'native adoption closure authority missing');
  active.assertActive();
  assertOwnedBytes(record, bytes);
  assertStoragePreserved(active);
  assertRuntimeAndProjects(record);
  requireAdoption(record.progress === 'complete', 'adoption is not complete');
  assertAdoptionClosureOutputs(record);
  const database = openUnadmittedWorkspaceDatabase(
    record.root,
    record.adoption.host.relative_path,
    false,
    false,
    active.proof.captureSource,
  );
  await withWorkspaceDatabaseCloseAsync(
    database,
    async () => {
      const binding = fenceBinding(record),
        verifier: MaintenanceReleaseVerifier = {
          principal: 'vida:configuration-adoption',
          projectIds: binding.project_ids,
          verify: (fence) => {
            active.assertActive();
            assertOwnedBytes(record, bytes);
            assertAdoptionClosureOutputs(record);
            requireAdoption(
              canonicalJsonDigest(fence.binding) === canonicalJsonDigest(binding) &&
                adoptionDatabaseDigest(database) === record.adoption.host.data_digest,
              'native closure binding or stored history differs',
            );
            return {
              schema: 'MaintenanceReleaseAuthorization/v1',
              principal: 'vida:configuration-adoption',
              fence_digest: canonicalJsonDigest(fence),
              closure_digest: binding.closure_digest,
              bundle_digest: binding.bundle_digest,
            };
          },
        };
      const store = nativeStore(database, record, verifier),
        current = store.readMaintenanceFence();
      requireAdoption(
        current && canonicalJsonDigest(current.binding) === canonicalJsonDigest(binding),
        'native closure operation differs',
      );
      const receipt = { fence: current, token: fenceToken(record) };
      if (current.status === 'released') {
        store.assertReleasedMaintenanceFence(receipt);
        return;
      }
      store.assertMaintenanceFence(receipt);
      const released: MaintenanceFenceReceipt = {
        fence: { ...current, status: 'released', revision: current.revision + 1 },
        token: receipt.token,
      };
      try {
        await store.releaseMaintenanceFence(receipt);
      } catch (error) {
        try {
          store.assertReleasedMaintenanceFence(released);
        } catch (unknown) {
          throw new AggregateError([error, unknown], 'adoption release remains UNKNOWN');
        }
      }
      store.assertReleasedMaintenanceFence(released);
    },
    active.proof.closeSource,
    'adoption native release and close failed',
  );
}

function assertAdoptionClosureOutputs(record: ConsumerConfigurationOperationV3): void {
  const access = requireSafeRepositoryAccess(record.root);
  for (const index of [0, 1, 3])
    requireAdoption(
      access.readBytes(outputs[index]!, 'adoption closure preserved output').equals(decoded(record.before[index]!)),
      'preserved closure output changed',
    );
  requireAdoption(
    access.readBytes(outputs[2]!, 'adopted configuration').equals(decoded(record.target)) &&
      access.readBytes(RUNTIME_INITIALIZATION_PATH, 'adopted receipt').equals(decoded(record.receipt.target)),
    'adoption target not complete',
  );
}
