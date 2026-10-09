import { canonicalJsonDigest } from './contracts/public-ingress.js';
import { loadRuntimeConfig, runtimeConfigDigest } from './config/runtime-config.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from './config/safe-repository-access.js';
import { HostStateStore } from './host-state.js';
import { canonicalRepositoryRoot, deriveWorkspaceId } from './workspace-identity.js';
import { readRuntimeInitializationReceipt } from './config/initialization-record.js';
import { RUNTIME_INITIALIZATION_PATH } from './config/project-paths.js';

export class RuntimeInitializationBindingError extends Error {
  readonly code = 'GAP-RUNTIME-INIT-BIND-001';

  constructor(message: string, options?: { readonly cause?: unknown }) {
    super(message, options);
    this.name = 'RuntimeInitializationBindingError';
  }
}

function fail(message: string): never {
  throw new RuntimeInitializationBindingError(message);
}

async function withBindingLock<T>(
  access: SafeRepositoryAccess,
  receiptPath: string,
  operation: () => Promise<T>,
): Promise<T> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    let entered = false;
    try {
      return await access.withExclusiveLockAsync(receiptPath, 'bind runtime initialization', async () => {
        entered = true;
        return await operation();
      });
    } catch (error) {
      const code = (error as { readonly code?: unknown })?.code;
      if (entered || (code !== 'file_lock_timeout' && code !== 'EEXIST') || Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

/** Host-owned pending -> bound transition. The receipt is never edited by callers. */
export async function bindRuntimeInitialization(repositoryRoot: string, store: HostStateStore): Promise<unknown> {
  if (!HostStateStore.isHostStateStore(store)) fail('trusted HostStateStore is required');
  const root = canonicalRepositoryRoot(repositoryRoot);
  const receiptPath = RUNTIME_INITIALIZATION_PATH;
  const access = requireSafeRepositoryAccess(root);
  try {
    return await withBindingLock(access, receiptPath, async () => {
      if (!access.fileExists(receiptPath, 'runtime initialization receipt'))
        fail('runtime initialization receipt is unavailable');
      const { receipt, bytes: rawBytes } = readRuntimeInitializationReceipt(access);
      const config = loadRuntimeConfig(root);
      const expectedWorkspaceId = deriveWorkspaceId(config.repository.repository_id, root);
      const expectedProjects = config.projects.map((entry) => entry.project_id).sort();
      if (receipt.workspace_id !== expectedWorkspaceId) fail('initialization workspace identity differs');
      if (store.workspaceId !== expectedWorkspaceId) fail('trusted host workspace differs from repository identity');
      if (receipt.repository_id !== config.repository.repository_id) fail('initialization repository identity differs');
      if (canonicalJsonDigest(receipt.project_ids) !== canonicalJsonDigest(expectedProjects))
        fail('initialization project set differs');
      if (receipt.integrations_digest !== canonicalJsonDigest(config.integrations))
        fail('initialization integrations are stale');
      if (receipt.config_digest !== runtimeConfigDigest(config)) fail('initialization config digest is stale');
      if (receipt.workspace_binding_status === 'bound') {
        return receipt;
      }
      const next = { ...receipt, workspace_binding_status: 'bound' };
      await access.replaceAtomicAsync(
        receiptPath,
        new Bun.CryptoHasher('sha256').update(rawBytes).digest('hex'),
        JSON.stringify(next, null, 2) + '\n',
        'bind runtime initialization',
      );
      return next;
    });
  } catch (error) {
    if (error instanceof RuntimeInitializationBindingError) throw error;
    throw new RuntimeInitializationBindingError(
      `runtime initialization binding failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
