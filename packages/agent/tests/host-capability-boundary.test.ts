import { afterEach, describe, expect, mock, test } from 'bun:test';
import * as fsNamespace from 'node:fs';
import path from 'node:path';
import type { NativeNoFollowCapability } from '../src/config/host-capability.ts';
import * as realSafeAccessNamespace from '../src/config/safe-repository-access.ts';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { fsSafeIntegrity, fsSafeVersion } from '../src/config/fs-safe-attestation.ts';

const realFsExports = { ...fsNamespace };
const realSafeAccessExports = { ...realSafeAccessNamespace };

const providerAccess = (provider: SafeRepositoryAccess['provider']) =>
  ({ provider }) satisfies Pick<SafeRepositoryAccess, 'provider'>;

async function importFreshHostCapability(caseName: string): Promise<typeof import('../src/config/host-capability.ts')> {
  return (await import(
    `../src/config/host-capability.ts?provider-case=${encodeURIComponent(caseName)}`
  )) as typeof import('../src/config/host-capability.ts');
}

function expectCapabilityCall(
  call: () => NativeNoFollowCapability | null,
): NativeNoFollowCapability | null | undefined {
  const observed: { value?: NativeNoFollowCapability | null } = {};
  expect(() => {
    observed.value = call();
  }).not.toThrow();
  return observed.value;
}

describe('host capability native boundary', () => {
  test('rejects non-string, relative and noncanonical repository roots', async () => {
    const host = await import('../src/config/host-capability.ts');
    expect(() => {
      Reflect.apply(host.detectNativeNoFollowCapability, undefined, [null]);
    }).toThrow(/absolute/);
    expect(() => host.detectNativeNoFollowCapability('relative')).toThrow(/absolute/);
    expect(() => host.detectNativeNoFollowCapability(process.cwd() + path.sep + '.')).toThrow(/canonical/);
  });

  test('reports and requires the qualified native Linux descriptor capability', async () => {
    const host = await import('../src/config/host-capability.ts');
    expect(host.nativeNoFollowAvailable).toBe(true);
    const capability = expectCapabilityCall(() => host.detectNativeNoFollowCapability(process.cwd()));
    expect(capability).toStrictEqual({
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
    expect(capability?.attested).toBe(true);
    expect(capability).toStrictEqual(expectCapabilityCall(() => host.requireNativeNoFollowCapability(process.cwd())));
  });
});

describe('host capability provider boundary', () => {
  // Keep these namespace mocks exclusive until parallel coverage is qualified.
  afterEach(async () => {
    const cleanupErrors: unknown[] = [];
    for (const [specifier, exports] of [
      ['node:fs', realFsExports],
      ['../src/config/safe-repository-access.ts', realSafeAccessExports],
    ] as const) {
      try {
        await mock.module(specifier, () => exports);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
    if (cleanupErrors.length > 0) {
      throw new AggregateError(cleanupErrors, 'Host capability provider module restoration failed.');
    }
  });

  test('returns null and rejects when the provider identity is not recognized', async () => {
    const parsedProvider: unknown = JSON.parse('"unrecognized"');
    if (typeof parsedProvider !== 'string') throw new Error('provider fixture must be a string');
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      ...realSafeAccessExports,
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({ provider: parsedProvider }),
    }));
    const host = await importFreshHostCapability(
      'returns null and rejects when the provider identity is not recognized',
    );
    const repositoryRoot = process.cwd();

    expect(expectCapabilityCall(() => host.detectNativeNoFollowCapability(repositoryRoot))).toBeNull();
    expect(() => host.requireNativeNoFollowCapability(repositoryRoot)).toThrow(
      'native no-follow host capability is unavailable; persistent path operations fail closed',
    );
  });

  test('reports the Linux descriptor capability when the native flags and provider are present', async () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    await mock.module('node:fs', () => ({
      ...realFsExports,
      constants: { ...realFsExports.constants, O_NOFOLLOW: 1 },
    }));
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      ...realSafeAccessExports,
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => providerAccess('linux-proc-fd'),
    }));
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    try {
      const host = await importFreshHostCapability(
        'reports the Linux descriptor capability when the native flags and provider are present',
      );
      const repositoryRoot = process.cwd();
      const capability = expectCapabilityCall(() => host.detectNativeNoFollowCapability(repositoryRoot));

      expect(host.noFollowFlag).toBe(1);
      expect(host.nativeNoFollowAvailable).toBe(true);
      expect(capability).toStrictEqual({
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
      expect(expectCapabilityCall(() => host.requireNativeNoFollowCapability(repositoryRoot))).toStrictEqual(
        capability,
      );
    } finally {
      if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
    }
  });

  test('does not attest unknown Windows filesystems for durable operations', async () => {
    await mock.module('node:fs', () => ({
      ...realFsExports,
      constants: { ...realFsExports.constants, O_NOFOLLOW: 0 },
    }));
    const malformedResidualRisks: unknown = JSON.parse('"not-an-array"');
    if (typeof malformedResidualRisks !== 'string') throw new Error('malformed fixture must remain a string');
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      ...realSafeAccessExports,
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({
        provider: 'fs-safe-windows',
        package: { name: '@openclaw/fs-safe', version: '0.26.2', integrity: 'package-integrity' },
        residual_risks: malformedResidualRisks,
        attested: false,
      }),
    }));
    const host = await importFreshHostCapability('does not attest unknown Windows filesystems for durable operations');
    const capability = expectCapabilityCall(() => host.detectNativeNoFollowCapability(process.cwd()));

    expect(capability).toStrictEqual({
      schema: 'NativeNoFollowCapability/v1',
      platform: process.platform,
      node_version: process.versions.node,
      primitive: 'fs-safe-root-boundary',
      provider: 'fs-safe-windows',
      ancestor_binding: 'root-identity',
      atomic_replace: 'fsync-temp-rename',
      containment: 'best-effort',
      assurance_profile: 'windows-best-effort-v1',
      filesystem: 'unknown',
      package: { name: '@openclaw/fs-safe', version: '0.26.2', integrity: 'package-integrity' },
      attested: false,
    });
    expect(host.nativeNoFollowAvailable).toBe(false);
    expect(() => host.requireNativeNoFollowCapability(process.cwd())).toThrow(
      'native no-follow host capability is unavailable; persistent path operations fail closed',
    );
  });

  test('reports unavailable when the safe provider is absent', async () => {
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      ...realSafeAccessExports,
      safeRepositoryProviderAvailable: false,
      detectSafeRepositoryAccess: () => providerAccess('unavailable'),
    }));
    const host = await importFreshHostCapability('reports unavailable when the safe provider is absent');

    expect(host.nativeNoFollowAvailable).toBe(false);
  });

  test('requires a nonzero native flag when the Linux provider is available', async () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    await mock.module('node:fs', () => ({
      ...realFsExports,
      constants: { ...realFsExports.constants, O_NOFOLLOW: 0 },
    }));
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      ...realSafeAccessExports,
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => providerAccess('linux-proc-fd'),
    }));
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    try {
      const host = await importFreshHostCapability(
        'requires a nonzero native flag when the Linux provider is available',
      );
      expect(host.noFollowFlag).toBe(0);
      expect(host.nativeNoFollowAvailable).toBe(false);
    } finally {
      if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
    }
  });

  test('defaults a missing O_NOFOLLOW flag to zero', async () => {
    await mock.module('node:fs', () => ({
      ...realFsExports,
      constants: { ...realFsExports.constants, O_NOFOLLOW: undefined },
    }));
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      ...realSafeAccessExports,
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => providerAccess('linux-proc-fd'),
    }));
    const host = await importFreshHostCapability('defaults a missing O_NOFOLLOW flag to zero');

    expect(host.noFollowFlag).toBe(0);
    expect(host.nativeNoFollowAvailable).toBe(false);
  });

  test('does not advertise Windows durability without a positive filesystem proof', async () => {
    await mock.module('node:fs', () => ({
      ...realFsExports,
      constants: { ...realFsExports.constants, O_NOFOLLOW: 0 },
    }));
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      ...realSafeAccessExports,
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => providerAccess('unavailable'),
    }));
    const host = await importFreshHostCapability(
      'does not advertise Windows durability without a positive filesystem proof',
    );

    expect(host.nativeNoFollowAvailable).toBe(false);
  });

  test('attests the exact NTFS descriptor metadata and required capability', async () => {
    await assertWindowsFilesystemCapability('ntfs');
  });

  test('attests the exact ReFS descriptor metadata and required capability', async () => {
    await assertWindowsFilesystemCapability('refs');
  });

  test('rejects an unattested NTFS descriptor despite its supported filesystem', async () => {
    await assertWindowsFilesystemCapability('ntfs', false, false);
  });

  test('rejects an unknown filesystem despite the provider claiming attestation', async () => {
    await assertWindowsFilesystemCapability('unknown', true, false);
  });
});

async function assertWindowsFilesystemCapability(
  filesystem: 'ntfs' | 'refs' | 'unknown',
  providerAttested = true,
  expectedAttested = true,
): Promise<void> {
  const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  await mock.module('node:fs', () => ({
    ...realFsExports,
    constants: { ...realFsExports.constants, O_NOFOLLOW: 0 },
  }));
  await mock.module('../src/config/safe-repository-access.ts', () => ({
    ...realSafeAccessExports,
    safeRepositoryProviderAvailable: true,
    detectSafeRepositoryAccess: () => ({
      provider: 'fs-safe-windows',
      filesystem,
      package: { name: '@openclaw/fs-safe', version: fsSafeVersion, integrity: fsSafeIntegrity },
      residual_risks: ['Windows filesystem attestation is simulated by this descriptor fixture'],
      attested: providerAttested,
    }),
  }));
  Object.defineProperty(process, 'platform', { configurable: true, value: 'win32' });
  try {
    const host = await importFreshHostCapability(`${filesystem} descriptor provider attested ${providerAttested}`);
    const repositoryRoot = process.cwd();
    const capability = expectCapabilityCall(() => host.detectNativeNoFollowCapability(repositoryRoot));
    const expected: NativeNoFollowCapability = {
      schema: 'NativeNoFollowCapability/v1',
      platform: 'win32',
      node_version: process.versions.node,
      primitive: 'fs-safe-root-boundary',
      provider: 'fs-safe-windows',
      ancestor_binding: 'root-identity',
      atomic_replace: 'fsync-temp-rename',
      containment: 'best-effort',
      assurance_profile: 'windows-best-effort-v1',
      filesystem,
      package: { name: '@openclaw/fs-safe', version: fsSafeVersion, integrity: fsSafeIntegrity },
      residual_risks: ['Windows filesystem attestation is simulated by this descriptor fixture'],
      attested: expectedAttested,
    };

    expect(capability).toStrictEqual(expected);
    if (expectedAttested) {
      expect(expectCapabilityCall(() => host.requireNativeNoFollowCapability(repositoryRoot))).toStrictEqual(expected);
    } else {
      expect(() => host.requireNativeNoFollowCapability(repositoryRoot)).toThrow(
        'native no-follow host capability is unavailable; persistent path operations fail closed',
      );
    }
  } finally {
    if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
  }
}
