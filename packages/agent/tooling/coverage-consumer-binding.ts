import path from 'node:path';
import { canonicalJson, coverageReviewEnvironmentSha256, sha256 } from './bun-coverage-evidence.ts';
import type { CoverageInputs, InputDigest } from './bun-coverage-evidence.ts';
import { canonicalCoverageReviewScope } from './coverage-shard-eligibility.ts';
import type { CoverageReviewScope } from './coverage-shard-eligibility.ts';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

const configurationPaths = ['.bun-version', 'bunfig.toml', 'package.json', 'bun.lock'] as const;
const digestPattern = /^[0-9a-f]{64}$/u;
const consumerBindingKeys = ['repository_root', 'root_identity_sha256', 'source', 'source_digest'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validDigest(value: unknown): value is string {
  return typeof value === 'string' && digestPattern.test(value);
}

function capturedConfigurationRows(toolInputs: readonly InputDigest[]): InputDigest[] {
  const selected = new Map<string, InputDigest>();
  for (const row of toolInputs) {
    if (
      !isRecord(row) ||
      typeof row.path !== 'string' ||
      !configurationPaths.includes(row.path as (typeof configurationPaths)[number])
    )
      continue;
    if (selected.has(row.path))
      throw new Error('Captured coverage configuration inputs contain a duplicate owner row.');
    if (!validDigest(row.sha256)) throw new Error('Captured coverage configuration input digest is malformed.');
    selected.set(row.path, { path: row.path, sha256: row.sha256 });
  }
  if (selected.size !== configurationPaths.length || configurationPaths.some((file) => !selected.has(file)))
    throw new Error('Captured coverage configuration owner rows are incomplete.');
  return configurationPaths.map((file) => selected.get(file)!);
}

function validatedConsumerOrigin(value: unknown): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || Object.keys(value).sort().join(',') !== [...consumerBindingKeys].sort().join(','))
    throw new Error('Captured coverage consumer configuration origin is malformed.');
  if (
    consumerBindingKeys.some((key) => typeof value[key] !== 'string') ||
    !validDigest(value.root_identity_sha256) ||
    !validDigest(value.source_digest) ||
    value.repository_root === '' ||
    value.source === ''
  )
    throw new Error('Captured coverage consumer configuration origin is malformed.');
  return {
    repository_root: value.repository_root as string,
    root_identity_sha256: value.root_identity_sha256,
    source: value.source as string,
    source_digest: value.source_digest,
  };
}

/** Build review identity from already captured inputs and the selected package-root provider. */
export function buildCoverageReviewScope(input: {
  packageAccess: SafeRepositoryAccess;
  inputs: Pick<CoverageInputs, 'source_fingerprint' | 'test_fingerprint' | 'tool_fingerprint' | 'tool_inputs'>;
  runtimeExecutableSha256: string;
  bunVersion: string;
  environment: NodeJS.ProcessEnv;
  wrappedInvocation?: boolean;
  consumerConfiguration?: Awaited<ReturnType<typeof captureCoverageConsumerBinding>>;
}): CoverageReviewScope {
  const packageAccess = input.packageAccess;
  if (packageAccess.schema !== 'SafeRepositoryAccess/v1' || packageAccess.platform !== process.platform)
    throw new Error('Coverage package provider metadata does not match the observed package root.');

  const identityBefore = packageAccess.directoryIdentity('.', 'coverage review package identity');
  let scope: CoverageReviewScope | undefined;
  let failed = false;
  let failure: unknown;
  try {
    const fingerprints = [
      input.inputs.source_fingerprint,
      input.inputs.test_fingerprint,
      input.inputs.tool_fingerprint,
    ];
    if (fingerprints.some((digest) => !validDigest(digest)))
      throw new Error('Captured coverage input fingerprints are malformed.');
    if (!validDigest(input.runtimeExecutableSha256))
      throw new Error('Coverage runtime executable digest is malformed.');
    const configRows = capturedConfigurationRows(input.inputs.tool_inputs);
    const consumerOrigin = validatedConsumerOrigin(input.consumerConfiguration);
    const configurationJson = canonicalJson({
      captured_configuration_inputs: configRows,
      consumer_configuration: consumerOrigin,
    });
    if (configurationJson === undefined) throw new Error('Coverage configuration fingerprint cannot be serialized.');
    if (typeof input.bunVersion !== 'string' || input.bunVersion.length === 0 || input.bunVersion.length > 128)
      throw new Error('Coverage Bun version is malformed.');

    scope = {
      source_fingerprint: input.inputs.source_fingerprint,
      test_fingerprint: input.inputs.test_fingerprint,
      tool_fingerprint: input.inputs.tool_fingerprint,
      configuration_fingerprint: sha256(configurationJson),
      runtime_executable_sha256: input.runtimeExecutableSha256,
      environment_sha256: coverageReviewEnvironmentSha256(input.environment, input.wrappedInvocation),
      bun_version: input.bunVersion,
      provider: packageAccess.provider,
      platform: packageAccess.platform,
      architecture: process.arch,
      package_root_identity_sha256: sha256(identityBefore),
    };
    canonicalCoverageReviewScope(scope);
  } catch (error) {
    failed = true;
    failure = error;
  }
  const identityAfter = packageAccess.directoryIdentity('.', 'coverage review package identity');
  if (identityAfter !== identityBefore) throw new Error('Coverage package root changed during scope preparation.');
  if (failed) throw failure;
  if (!scope) throw new Error('Coverage review scope could not be prepared.');
  return scope;
}

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
  const keys = [...consumerBindingKeys];
  if (Object.keys(value).sort().join(',') !== keys.join(','))
    throw new Error('Coverage consumer configuration binding is malformed.');
  if (Object.values(value).some((entry) => typeof entry !== 'string'))
    throw new Error('Coverage consumer configuration binding is malformed.');
  const current = await captureCoverageConsumerBinding(packageRoot, environment);
  for (const key of keys)
    if (Reflect.get(value, key) !== Reflect.get(current, key))
      throw new Error('Coverage consumer configuration changed since collection: ' + key);
}
