import { HostStateStore } from '../host-state.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { canonicalRepositoryRoot, deriveWorkspaceId } from '../workspace-identity.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from './safe-repository-access.js';
import { PROJECT_CONFIGURATION_PATHS, PROJECT_INITIALIZATION_PATH } from './project-paths.js';
import { parseProjectConfiguration } from './project-configuration.js';
import { assertCurrentProjectConfigurationBinding } from './project-configuration-rebind.js';
import {
  readProjectInitializationReceipt,
  validateProjectInitializationReceipt,
  type ProjectInitializationReceipt,
} from './project-initialization-record.js';
import { assertProjectInitializationUpgradeOwner } from './project-upgrade.js';
import { runtimeConfigDigest } from './runtime-config.js';

function configurationInputs(access: SafeRepositoryAccess) {
  return {
    project: access.readText(PROJECT_CONFIGURATION_PATHS.project, 'project initialization config'),
    agents: access.readText(PROJECT_CONFIGURATION_PATHS.agents, 'project initialization agents'),
    flows: access.readText(PROJECT_CONFIGURATION_PATHS.flows, 'project initialization flows'),
  };
}

function assertProjectReceiptConfiguration(access: SafeRepositoryAccess, receipt: ProjectInitializationReceipt): void {
  const inputs = configurationInputs(access);
  const prepared = parseProjectConfiguration(inputs, access.repository_root, PROJECT_CONFIGURATION_PATHS.project);
  const config = prepared.config;
  if (
    receipt.repository_id !== config.repository.repository_id ||
    receipt.workspace_id !== deriveWorkspaceId(config.repository.repository_id, access.repository_root) ||
    canonicalJsonDigest(receipt.project_ids) !==
      canonicalJsonDigest(config.projects.map((project) => project.project_id).sort()) ||
    receipt.current_config_digest !== runtimeConfigDigest(config) ||
    receipt.current_input_digest !== prepared.input_digest ||
    receipt.bundle !== config.runtime.bundle
  )
    throw new Error('Project initialization configuration identity is stale or foreign.');
  assertCurrentProjectConfigurationBinding(access, config, prepared.input_digest, receipt, inputs);
  if (canonicalJsonDigest(configurationInputs(access)) !== canonicalJsonDigest(inputs))
    throw new Error('Project initialization configuration changed during binding.');
}

/** Explicit Host-owned v2 transition; normal reads and prepared records grant no execution rights. */
export async function bindProjectInitialization(
  repositoryRoot: string,
  store: HostStateStore,
): Promise<ProjectInitializationReceipt> {
  if (!HostStateStore.isHostStateStore(store)) throw new Error('Project initialization requires a trusted Host.');
  const root = canonicalRepositoryRoot(repositoryRoot);
  const access = requireSafeRepositoryAccess(root);
  return access.withExclusiveLockAsync(PROJECT_INITIALIZATION_PATH, 'bind project initialization', async () => {
    const { receipt, bytes } = readProjectInitializationReceipt(access);
    assertProjectReceiptConfiguration(access, receipt);
    assertProjectInitializationUpgradeOwner(root, store, receipt);
    if (receipt.workspace_binding_status === 'bound') return receipt;
    const bound = validateProjectInitializationReceipt({ ...receipt, workspace_binding_status: 'bound' });
    await access.replaceAtomicAsync(
      PROJECT_INITIALIZATION_PATH,
      new Bun.CryptoHasher('sha256').update(bytes).digest('hex'),
      JSON.stringify(bound, null, 2) + '\n',
      'bind project initialization',
    );
    return bound;
  });
}
