import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import {
  detectSafeRepositoryAccess,
  safeRepositoryProviderAvailable,
  type SafeRepositoryAccess,
} from './safe-repository-access.js';
/**
 * Host capability asserted by the candidate before any path-bound persistent
 * operation. This is an observation of the running Node host, not a config
 * switch and not a substitute for DEV/UAT evidence.
 */
export interface NativeNoFollowCapability {
  readonly schema: 'NativeNoFollowCapability/v1';
  readonly platform: NodeJS.Platform;
  readonly node_version: string;
  readonly primitive: 'O_NOFOLLOW' | 'fs-safe-root-boundary';
  readonly provider: 'linux-proc-fd' | 'fs-safe-windows';
  readonly ancestor_binding: 'directory-handle' | 'root-identity';
  readonly atomic_replace: 'fsync-temp-rename';
  readonly containment: 'kernel-atomic' | 'best-effort';
  readonly assurance_profile: 'linux-kernel-atomic-v1' | 'windows-best-effort-v1';
  readonly filesystem: 'linux-native' | 'ntfs' | 'refs' | 'unknown';
  readonly package?: { readonly name: '@openclaw/fs-safe'; readonly version: '0.5.6'; readonly integrity: string };
  readonly residual_risks?: readonly string[];
  readonly attested: boolean;
}

export const noFollowFlag = (fsConstants as { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
export const nativeNoFollowAvailable = safeRepositoryProviderAvailable && noFollowFlag !== 0;

function reject(conditions: readonly boolean[], message: string): void {
  conditions.filter(Boolean).forEach(() => {
    throw new Error(message);
  });
}

function canonicalRepositoryRoot(repositoryRoot: string): string {
  const isString = typeof repositoryRoot === 'string';
  reject([!isString], 'native no-follow capability requires an absolute repository root');
  const isAbsolute = path.isAbsolute(repositoryRoot);
  reject([!isAbsolute], 'native no-follow capability requires an absolute repository root');
  const resolved = path.resolve(repositoryRoot);
  reject([resolved !== repositoryRoot], 'native no-follow capability requires a canonical repository root');
  return resolved;
}

const linuxCapability: NativeNoFollowCapability = Object.freeze({
  schema: 'NativeNoFollowCapability/v1',
  platform: 'linux',
  node_version: process.versions.node,
  primitive: 'O_NOFOLLOW',
  provider: 'linux-proc-fd',
  ancestor_binding: 'directory-handle',
  atomic_replace: 'fsync-temp-rename',
  containment: 'kernel-atomic',
  assurance_profile: 'linux-kernel-atomic-v1',
  filesystem: 'linux-native',
  attested: true,
});

function windowsCapability(access: SafeRepositoryAccess): NativeNoFollowCapability {
  const { filesystem = 'unknown', residual_risks } = access;
  return {
    schema: 'NativeNoFollowCapability/v1',
    platform: process.platform,
    node_version: process.versions.node,
    primitive: 'fs-safe-root-boundary',
    provider: 'fs-safe-windows',
    ancestor_binding: 'root-identity',
    atomic_replace: 'fsync-temp-rename',
    containment: 'best-effort',
    assurance_profile: 'windows-best-effort-v1',
    filesystem,
    package: access.package!,
    ...Object.fromEntries([['residual_risks', residual_risks]].filter(([, value]) => Array.isArray(value))),
    attested: access.attested && ['ntfs', 'refs'].includes(filesystem),
  };
}

export function detectNativeNoFollowCapability(repositoryRoot: string): NativeNoFollowCapability | null {
  const access = detectSafeRepositoryAccess(canonicalRepositoryRoot(repositoryRoot));
  const capabilities: Readonly<Record<string, NativeNoFollowCapability>> = {
    'linux-proc-fd': linuxCapability,
    'fs-safe-windows': windowsCapability(access),
  };
  const capability = capabilities[access.provider];
  return [capability, null].find((value) => value !== undefined)!;
}

export function requireNativeNoFollowCapability(repositoryRoot: string): NativeNoFollowCapability {
  const capability = detectNativeNoFollowCapability(repositoryRoot);
  reject(
    [!capability || !capability.attested],
    'native no-follow host capability is unavailable; persistent path operations fail closed',
  );
  return capability!;
}
