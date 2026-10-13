import path from 'node:path';
import { sha256 } from './bun-coverage-evidence.ts';

/** Capture the configured test caller's real consumer root; this opens no workspace database. */
export async function captureCoverageConsumerBinding(packageRoot: string, environment: NodeJS.ProcessEnv) {
  const repositoryRoot = environment.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? path.resolve(packageRoot, '../..');
  const { loadRuntimeConfig, capturedRuntimeConfigurationBinding } = await import('../src/config/runtime-config.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const identity = access.directoryIdentity('.', 'coverage consumer configuration');
  const origin = capturedRuntimeConfigurationBinding(loadRuntimeConfig(repositoryRoot));
  if (access.directoryIdentity('.', 'coverage consumer configuration') !== identity)
    throw new Error('Coverage consumer root changed during configuration capture.');
  return Object.freeze({ ...origin, root_identity_sha256: sha256(identity) });
}

/** Freshness join only. Resolve the expected root from the caller, never from report metadata. */
export async function assertCoverageConsumerBinding(
  value: unknown,
  packageRoot: string,
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Coverage consumer configuration binding is malformed.');
  const keys = ['repository_root', 'root_identity_sha256', 'source', 'source_digest'];
  if (Object.keys(value).sort().join(',') !== keys.join(','))
    throw new Error('Coverage consumer configuration binding is malformed.');
  if (Object.values(value).some((entry) => typeof entry !== 'string'))
    throw new Error('Coverage consumer configuration binding is malformed.');
  const current = await captureCoverageConsumerBinding(packageRoot, environment);
  for (const key of keys)
    if (Reflect.get(value, key) !== Reflect.get(current, key))
      throw new Error('Coverage consumer configuration changed since collection: ' + key);
}
