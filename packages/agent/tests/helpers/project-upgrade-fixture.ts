import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.js';
import { deriveWorkspaceId } from '../../src/workspace-identity.js';
import {
  HostStateStore,
  openHostStateDatabase,
  type MaintenanceFence,
  type MaintenanceReleaseAuthorization,
} from '../../src/host-state.js';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.js';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.js';
import {
  PROJECT_ACTIVATION_PATH,
  PROJECT_UPGRADE_OPERATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
  projectUpgradeHistoryPath,
} from '../../src/config/project-paths.js';
import {
  parseRuntimeConfigDocument,
  runtimePackageAccess,
  runtimePackageCodePaths,
  validateRuntimeConfig,
} from '../../src/config/runtime-config.js';
import {
  captureProjectUpgradeDependencies,
  prepareProjectUpgradeArtifacts,
} from '../../src/config/project-upgrade-artifacts.js';
import { prepareInitialWorkspaceDatabaseImage } from '../../src/config/project-upgrade-storage.js';
import { prepareProjectUpgradeActivation } from '../../src/config/project-activation.js';
import {
  projectUpgradeFenceBinding,
  validateProjectUpgradeOperation,
  type ProjectUpgradeOperation,
  type ProjectUpgradePlan,
} from '../../src/config/project-upgrade.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const UPGRADE_LABEL = 'VIDA project upgrade';
const sha256hex = (value: string | Uint8Array): string =>
  typeof value === 'string'
    ? createHash('sha256').update(value, 'utf8').digest('hex')
    : createHash('sha256').update(value).digest('hex');

export async function makeFreshRepository(
  prefix = 'project-upgrade-lifecycle-',
  options: { includeLocalInstructions?: boolean; onRoot?: (root: string) => void } = {},
): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  options.onRoot?.(root);
  await mkdir(path.join(root, '.git'));
  await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
  if (options.includeLocalInstructions !== false)
    await cp(path.join(packageRoot, 'instructions'), path.join(root, 'docs/agent-instructions'), { recursive: true });

  const render = (value: string): string =>
    value
      .replaceAll('{{REPOSITORY}}', 'lifecycle-fixture')
      .replaceAll('{{REPOSITORY_PREFIX}}', 'LIFECYCLEFIXTURE')
      .replaceAll('{{PRODUCT_PREFIX}}', 'FIXTURE')
      .replaceAll('{{PROJECT}}', 'fixture')
      .replaceAll('{{PROJECTS}}', 'fixture')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('{{CREATED_AT}}', '2026-10-10T00:00:00.000Z');
  const templates: ReadonlyArray<readonly [string, string]> = [
    ['templates/AGENTS.template.md', 'AGENTS.md'],
    ['templates/AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
    ['templates/agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
  ];
  for (const [source, target] of templates)
    await writeFile(path.join(root, target), render(await readFile(path.join(packageRoot, source), 'utf8')));
  await writeFile(
    path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
    render(await readFile(path.join(packageRoot, 'templates/documentation-policy.template.v1.json'), 'utf8')),
  );
  return root;
}

function upgradeBundleDigest(): string {
  const access = runtimePackageAccess();
  const read = access.readVerifiedCaptureBytes ?? access.readBytes;
  const prefix = 'runtime-package/';
  return canonicalJsonDigest(
    runtimePackageCodePaths('runtime-package', access).map((file) => ({
      path: file,
      digest: sha256hex(read(file.slice(prefix.length), UPGRADE_LABEL)),
    })),
  );
}

function writeRepositoryFile(root: string, relative: string, bytes: string): void {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
}

export interface CompletedProjectUpgradeFixture {
  readonly root: string;
  readonly operationId: string;
  readonly workspaceId: string;
  readonly plan: ProjectUpgradePlan;
  readonly operation: ProjectUpgradeOperation;
}

/**
 * Publishes the exact `.vida` state a retired same-operation upgrade leaves behind:
 * prepared artifacts, a closed workspace database with its bootstrap sentinel, a
 * released same-operation maintenance fence, the activation file and the completed
 * history journal. No deleted planner or repair route is invoked.
 */
export async function completeProjectUpgradeFixture(
  root: string,
  options: {
    operationId?: string;
    actor?: string;
    instructionRef?: string;
  } = {},
): Promise<CompletedProjectUpgradeFixture> {
  const operationId = options.operationId ?? 'fixture-upgrade-001';
  const actor = options.actor ?? 'test-owner: completed upgrade fixture';
  const instructionRef = options.instructionRef ?? 'tests/helpers/project-upgrade-fixture.ts';
  const access = requireSafeRepositoryAccess(root);
  const repositoryRoot = access.repository_root;
  const config = validateRuntimeConfig(
    parseRuntimeConfigDocument(readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'), 'utf8')),
  );
  const dependencies = captureProjectUpgradeDependencies(access, config);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
  const bundleDigest = upgradeBundleDigest();
  const createdAt = new Date().toISOString();
  const prepared = prepareProjectUpgradeArtifacts(config, dependencies, {
    operation_id: operationId,
    created_at: createdAt,
    bundle_digest: bundleDigest,
    workspace_id: workspaceId,
  });
  const originalPolicy = dependencies.find((entry) => entry.path === 'AGENTS.md')?.bytes;
  if (typeof originalPolicy !== 'string') throw new Error('Upgrade fixture requires the legacy policy source.');
  const plan: ProjectUpgradePlan = {
    schema: 'VidaProjectUpgradePlan/v1',
    operation_id: operationId,
    repository_root: repositoryRoot,
    repository_identity: access.directoryIdentity('.', UPGRADE_LABEL),
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((project) => project.project_id).sort(),
    workspace_id: workspaceId,
    actor,
    instruction_ref: instructionRef,
    token: randomUUID(),
    bundle_digest: bundleDigest,
    input_digest: prepared.input_digest,
    database_mode: 'fresh',
    created_at: createdAt,
    dependencies,
    files: prepared.files.map((file) => ({
      path: file.path,
      before: file.path === 'AGENTS.md' ? originalPolicy : null,
      after: file.after,
    })),
  };
  const planDigest = canonicalJsonDigest(plan);
  const bootstrapBinding = {
    schema: 'VidaWorkspaceBootstrap/v1' as const,
    operation_id: operationId,
    workspace_id: workspaceId,
    plan_digest: planDigest,
    bundle_digest: bundleDigest,
    input_digest: prepared.input_digest,
    authority_digest: canonicalJsonDigest({ actor, instruction_ref: instructionRef }),
    token_digest: sha256hex(plan.token),
  };
  const initialDatabase = await prepareInitialWorkspaceDatabaseImage(bootstrapBinding);
  const databaseRelative = PROJECT_WORKSPACE_DATABASE_PATH;
  const databasePath = path.join(repositoryRoot, databaseRelative);
  mkdirSync(path.dirname(databasePath), { recursive: true });
  writeFileSync(databasePath, Buffer.from(initialDatabase.bytes_base64, 'base64'));
  const databaseIdentity = lstatSync(databasePath, { bigint: true });
  const stagingIdentity = {
    device: String(databaseIdentity.dev),
    inode: String(databaseIdentity.ino),
    size: initialDatabase.size,
    sha256: initialDatabase.sha256,
  };
  const fenced = validateProjectUpgradeOperation({
    schema: 'VidaProjectUpgradeOperation/v1',
    revision: 1,
    phase: 'fenced',
    next_file: 0,
    plan,
    plan_digest: planDigest,
    initial_database: initialDatabase,
    existing_database: null,
    storage_phase: 'published',
    staging_identity: stagingIdentity,
    activation: null,
  });
  const binding = projectUpgradeFenceBinding(fenced);
  const principal = 'fixture:completed-upgrade-owner';
  const verifier = {
    principal,
    projectIds: plan.project_ids,
    verify: (fence: MaintenanceFence): MaintenanceReleaseAuthorization => ({
      schema: 'MaintenanceReleaseAuthorization/v1',
      principal,
      fence_digest: canonicalJsonDigest(fence),
      closure_digest: fence.binding.closure_digest,
      bundle_digest: fence.binding.bundle_digest,
    }),
  };
  const hostDatabase = openHostStateDatabase(repositoryRoot, databaseRelative, workspaceId);
  let operation: ProjectUpgradeOperation | undefined;
  try {
    const store = new HostStateStore(
      hostDatabase,
      workspaceId,
      undefined,
      undefined,
      undefined,
      verifier,
      repositoryRoot,
    );
    const receipt = store.acquireMaintenanceFenceWithRecordedToken(binding, plan.token);
    const released = await store.releaseMaintenanceFence(receipt);
    const activation = prepareProjectUpgradeActivation(fenced, released.generation);
    operation = validateProjectUpgradeOperation({
      ...fenced,
      revision: 2,
      phase: 'completed',
      next_file: plan.files.length,
      activation,
    });
  } finally {
    closeWorkspaceDatabaseWithAdmission(hostDatabase);
  }
  if (operation === undefined) throw new Error('Completed upgrade fixture operation was not produced.');
  for (const file of plan.files) writeRepositoryFile(repositoryRoot, file.path, file.after);
  writeRepositoryFile(repositoryRoot, PROJECT_ACTIVATION_PATH, operation.activation!);
  writeRepositoryFile(
    repositoryRoot,
    projectUpgradeHistoryPath(operationId),
    JSON.stringify(operation, null, 2) + '\n',
  );
  if (existsSync(path.join(repositoryRoot, PROJECT_UPGRADE_OPERATION_PATH)))
    throw new Error('Completed upgrade fixture must not retain the active operation journal.');
  return { root: repositoryRoot, operationId, workspaceId, plan, operation };
}
