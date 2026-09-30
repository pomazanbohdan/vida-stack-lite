import { createHash } from 'node:crypto';
import path from 'node:path';
import { canonicalJsonDigest } from './contracts/public-ingress.js';
import { loadRuntimeConfig, runtimeConfigDigest, runtimePackageAccess } from './config/runtime-config.js';
import { requireSafeRepositoryAccess } from './config/safe-repository-access.js';
import { HostStateStore } from './host-state.js';
import { canonicalRepositoryRoot, deriveWorkspaceId } from './workspace-identity.js';

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

async function withBindingLock<T>(operation: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if ((error as { readonly code?: unknown })?.code !== 'file_lock_timeout' || Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

/** Host-owned pending -> bound transition. The receipt is never edited by callers. */
export async function bindRuntimeInitialization(repositoryRoot: string, store: HostStateStore): Promise<unknown> {
  if (!HostStateStore.isHostStateStore(store)) fail('trusted HostStateStore is required');
  const root = canonicalRepositoryRoot(repositoryRoot);
  const receiptPath = path.join(root, '.agent', 'runtime-initialization.v1.json');
  const access = requireSafeRepositoryAccess(root);
  try {
    return await withBindingLock(() =>
      access.withExclusiveLockAsync(receiptPath, 'bind runtime initialization', async () => {
        if (!access.fileExists(receiptPath, 'runtime initialization receipt'))
          fail('runtime initialization receipt is unavailable');
        const rawBytes = access.readBytes(receiptPath, 'runtime initialization receipt');
        const receipt = JSON.parse(rawBytes.toString('utf8')) as Record<string, unknown>;
        const config = loadRuntimeConfig(root);
        const expectedWorkspaceId = deriveWorkspaceId(config.repository.repository_id, root);
        const expectedProjects = [...config.projects.map((entry) => entry.project_id)].sort();
        if (receipt.schema !== 'RuntimeInitialization/v1' || receipt.version !== 1)
          fail('initialization receipt schema is invalid');
        if (receipt.workspace_id !== expectedWorkspaceId) fail('initialization workspace identity differs');
        if (store.workspaceId !== expectedWorkspaceId) fail('trusted host workspace differs from repository identity');
        if (receipt.repository_id !== config.repository.repository_id)
          fail('initialization repository identity differs');
        if (canonicalJsonDigest(receipt.project_ids) !== canonicalJsonDigest(expectedProjects))
          fail('initialization project set differs');
        if (receipt.integrations_digest !== canonicalJsonDigest(config.integrations))
          fail('initialization integrations are stale');
        if (receipt.config_digest !== runtimeConfigDigest(config)) fail('initialization config digest is stale');
        const schemaSha = createHash('sha256')
          .update(
            runtimePackageAccess().readBytes(
              'schemas/runtime-initialization.v1.schema.json',
              'runtime initialization schema',
            ),
          )
          .digest('hex');
        if (receipt.schema_sha256 !== schemaSha) fail('initialization schema digest is stale');
        if (receipt.workspace_binding_status === 'bound') {
          return receipt;
        }
        if (receipt.workspace_binding_status !== 'pending') fail('initialization receipt is not pending');
        const next = { ...receipt, workspace_binding_status: 'bound' };
        await access.replaceAtomicAsync(
          receiptPath,
          createHash('sha256').update(rawBytes).digest('hex'),
          JSON.stringify(next, null, 2) + '\n',
          'bind runtime initialization',
        );
        return next;
      }),
    );
  } catch (error) {
    if (error instanceof RuntimeInitializationBindingError) throw error;
    throw new RuntimeInitializationBindingError(
      `runtime initialization binding failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}
