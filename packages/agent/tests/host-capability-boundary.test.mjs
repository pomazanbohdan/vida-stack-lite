import { afterEach, describe, expect, test, vi } from 'vitest';
import { constants as realFsConstants } from 'node:fs';

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../src/config/safe-repository-access.ts');
  vi.doUnmock('node:fs');
});

describe('host capability provider boundary', () => {
  test('returns null and rejects when the provider identity is not recognized', async () => {
    vi.doMock('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({ provider: 'unrecognized' }),
    }));
    const host = await import('../src/config/host-capability.ts?unrecognized-provider');
    const repositoryRoot = process.cwd();

    expect(host.detectNativeNoFollowCapability(repositoryRoot)).toBeNull();
    expect(() => host.requireNativeNoFollowCapability(repositoryRoot)).toThrow(
      'native no-follow host capability is unavailable; persistent path operations fail closed',
    );
  });

  test('reports the Linux descriptor capability when the native flags and provider are present', async () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    vi.doMock('node:fs', () => ({
      constants: { ...realFsConstants, O_NOFOLLOW: 1 },
    }));
    vi.doMock('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({ provider: 'linux-proc-fd' }),
    }));
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    try {
      const host = await import('../src/config/host-capability.ts?linux-provider');
      const repositoryRoot = process.cwd();
      const capability = host.detectNativeNoFollowCapability(repositoryRoot);

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
      expect(host.requireNativeNoFollowCapability(repositoryRoot)).toStrictEqual(capability);
    } finally {
      if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
      vi.doUnmock('node:fs');
    }
  });

  test('does not attest unknown Windows filesystems for durable operations', async () => {
    vi.doMock('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({
        provider: 'fs-safe-windows',
        package: { name: '@openclaw/fs-safe', version: '0.5.6', integrity: 'package-integrity' },
        residual_risks: 'not-an-array',
        attested: false,
      }),
    }));
    const host = await import('../src/config/host-capability.ts?windows-defaults');
    const capability = host.detectNativeNoFollowCapability(process.cwd());

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
      package: { name: '@openclaw/fs-safe', version: '0.5.6', integrity: 'package-integrity' },
      attested: false,
    });
    expect(host.nativeNoFollowAvailable).toBe(false);
    expect(() => host.requireNativeNoFollowCapability(process.cwd())).toThrow(
      'native no-follow host capability is unavailable; persistent path operations fail closed',
    );
  });

  test('reports unavailable when the safe provider is absent', async () => {
    vi.doMock('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: false,
      detectSafeRepositoryAccess: () => ({ provider: 'unrecognized' }),
    }));
    const host = await import('../src/config/host-capability.ts?provider-unavailable');

    expect(host.nativeNoFollowAvailable).toBe(false);
  });

  test('requires both native flags and the Linux platform for availability', async () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    vi.doMock('node:fs', () => ({ constants: { ...realFsConstants, O_NOFOLLOW: 0 } }));
    vi.doMock('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({ provider: 'linux-proc-fd' }),
    }));
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    try {
      const host = await import('../src/config/host-capability.ts?linux-without-flag');
      expect(host.noFollowFlag).toBe(0);
      expect(host.nativeNoFollowAvailable).toBe(false);
    } finally {
      if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
      vi.doUnmock('node:fs');
    }
  });

  test('does not advertise Windows durability without a positive filesystem proof', async () => {
    vi.doMock('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({ provider: 'unrecognized' }),
    }));
    const host = await import('../src/config/host-capability.ts?windows-platform');

    expect(host.nativeNoFollowAvailable).toBe(false);
  });
});
