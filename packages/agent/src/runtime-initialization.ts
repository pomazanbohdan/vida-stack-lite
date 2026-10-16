import { canonicalJsonDigest } from './contracts/public-ingress.js';
import {
  activeRuntimeConfigurationSource,
  assertProjectUpgradeInactive,
  assertLoadedRuntimeConfig,
  loadRuntimeConfig,
  runtimeConfigDigest,
} from './config/runtime-config.js';
import {
  requireSafeRepositoryAccess,
  SafeRepositoryLockContentionError,
  type SafeRepositoryAccess,
} from './config/safe-repository-access.js';
import { HostStateStore } from './host-state.js';
import { canonicalRepositoryRoot, deriveWorkspaceId } from './workspace-identity.js';
import { readRuntimeInitializationReceipt } from './config/initialization-record.js';
import {
  LEGACY_RUNTIME_CONFIGURATION_PATH,
  PROJECT_CONFIGURATION_PATHS,
  RUNTIME_INITIALIZATION_PATH,
  runtimeConfigurationSourceFor,
} from './config/project-paths.js';
import { bindProjectInitialization } from './config/project-initialization-binding.js';
import {
  readProjectInitializationReceipt,
  type ProjectInitializationReceipt,
} from './config/project-initialization-record.js';
import type { AgentRuntimeConfig } from './config/runtime-config.js';

export type RuntimeInitializationAuthority =
  | {
      readonly format: 'RuntimeInitialization/v1';
      readonly receipt: ReturnType<typeof readRuntimeInitializationReceipt>['receipt'];
      readonly binding: {
        readonly repository_id: string;
        readonly project_ids: readonly string[];
        readonly workspace_id: string;
        readonly config_digest: string;
        readonly integrations_digest: string;
      };
    }
  | {
      readonly format: 'RuntimeInitialization/v2';
      readonly receipt: ProjectInitializationReceipt;
      readonly binding: {
        readonly repository_id: string;
        readonly project_ids: readonly string[];
        readonly workspace_id: string;
        readonly config_digest: string;
      };
    };

/** Read the receipt selected by the already loaded configuration without changing the legacy SDK reader. */
export function readRuntimeInitializationAuthority(
  repositoryRoot: string,
  config: AgentRuntimeConfig,
): RuntimeInitializationAuthority {
  const root = canonicalRepositoryRoot(repositoryRoot);
  const access = requireSafeRepositoryAccess(root);
  assertLoadedRuntimeConfig(config, root);
  assertProjectUpgradeInactive(access);
  const selected = activeRuntimeConfigurationSource(access);
  const loaded = runtimeConfigurationSourceFor(config);
  if (selected !== loaded) fail('runtime configuration selection changed');
  if (selected === LEGACY_RUNTIME_CONFIGURATION_PATH) {
    const receipt = readRuntimeInitializationReceipt(access).receipt;
    return {
      format: 'RuntimeInitialization/v1',
      receipt,
      binding: {
        repository_id: receipt.repository_id,
        project_ids: receipt.project_ids,
        workspace_id: receipt.workspace_id,
        config_digest: receipt.config_digest,
        integrations_digest: receipt.integrations_digest,
      },
    };
  }
  const receipt = readProjectInitializationReceipt(access).receipt;
  return {
    format: 'RuntimeInitialization/v2',
    receipt,
    binding: {
      repository_id: receipt.repository_id,
      project_ids: receipt.project_ids,
      workspace_id: receipt.workspace_id,
      config_digest: receipt.current_config_digest,
    },
  };
}

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

function initializationBindingFailure(error: unknown): RuntimeInitializationBindingError {
  if (error instanceof RuntimeInitializationBindingError) return error;
  return new RuntimeInitializationBindingError(
    `runtime initialization binding failed: ${error instanceof Error ? error.message : String(error)}`,
    { cause: error },
  );
}

const bindingLockRetryCodes: ReadonlySet<unknown> = new Set(['file_lock_timeout', 'EEXIST']);

async function withBindingLock<T>(
  access: SafeRepositoryAccess,
  receiptPath: string,
  operation: () => Promise<T>,
  deadline: number,
): Promise<T> {
  for (;;) {
    let entered = false;
    try {
      return await access.withExclusiveLockAsync(receiptPath, 'bind runtime initialization', async () => {
        entered = true;
        return await operation();
      });
    } catch (error) {
      const code = (error as { readonly code?: unknown })?.code;
      if (
        entered ||
        (!(error instanceof SafeRepositoryLockContentionError) && !bindingLockRetryCodes.has(code)) ||
        Date.now() >= deadline
      )
        throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

/** Retry only synchronous read admission; binding effects never enter this loop. */
async function readInitializationWithAdmission<T>(reader: () => T, deadline: number): Promise<T> {
  for (;;) {
    try {
      return reader();
    } catch (error) {
      if (!(error instanceof SafeRepositoryLockContentionError) || Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

/** Host-owned pending -> bound transition. The receipt is never edited by callers. */
export async function bindRuntimeInitialization(repositoryRoot: string, store: HostStateStore): Promise<unknown> {
  if (!HostStateStore.isHostStateStore(store)) fail('trusted HostStateStore is required');
  const root = canonicalRepositoryRoot(repositoryRoot);
  const access = requireSafeRepositoryAccess(root);
  const deadline = Date.now() + 5_000;
  try {
    const selected = await readInitializationWithAdmission(() => {
      assertProjectUpgradeInactive(access);
      return activeRuntimeConfigurationSource(access);
    }, deadline);
    if (selected === PROJECT_CONFIGURATION_PATHS.project) return await bindProjectInitialization(root, store);
    const receiptPath = RUNTIME_INITIALIZATION_PATH;
    return await withBindingLock(
      access,
      receiptPath,
      async () => {
        const { receipt, rawBytes } = await readInitializationWithAdmission(() => {
          if (!access.fileExists(receiptPath, 'runtime initialization receipt'))
            fail('runtime initialization receipt is unavailable');
          const { receipt, bytes: rawBytes } = readRuntimeInitializationReceipt(access);
          const config = loadRuntimeConfig(root);
          if (runtimeConfigurationSourceFor(config) !== LEGACY_RUNTIME_CONFIGURATION_PATH)
            fail('runtime configuration selection changed');
          const expectedWorkspaceId = deriveWorkspaceId(config.repository.repository_id, root);
          const expectedProjects = config.projects.map((entry) => entry.project_id).sort();
          if (receipt.workspace_id !== expectedWorkspaceId) fail('initialization workspace identity differs');
          if (store.workspaceId !== expectedWorkspaceId)
            fail('trusted host workspace differs from repository identity');
          if (receipt.repository_id !== config.repository.repository_id)
            fail('initialization repository identity differs');
          if (canonicalJsonDigest(receipt.project_ids) !== canonicalJsonDigest(expectedProjects))
            fail('initialization project set differs');
          if (receipt.integrations_digest !== canonicalJsonDigest(config.integrations))
            fail('initialization integrations are stale');
          if (receipt.config_digest !== runtimeConfigDigest(config)) fail('initialization config digest is stale');
          return { receipt, rawBytes };
        }, deadline);
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
      },
      deadline,
    );
  } catch (error) {
    throw initializationBindingFailure(error);
  }
}
