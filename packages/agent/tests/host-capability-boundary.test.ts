import { describe, expect, mock, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { constants as realFsConstants } from 'node:fs';
import path from 'node:path';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { requireSynchronousChildSuccess } from './helpers/synchronous-child-outcome.ts';

const isolatedCaseEnvironment = 'HOST_CAPABILITY_BOUNDARY_ISOLATED_CASE';

function runIsolatedMockCase(name: string): void {
  const child = spawnSync(
    process.execPath,
    ['test', '--test-name-pattern', name, 'tests/host-capability-boundary.test.ts'],
    {
      cwd: process.cwd(),
      env: { ...process.env, [isolatedCaseEnvironment]: name },
      encoding: 'utf8',
      timeout: 4_500,
    },
  );
  const completionMarker = `BUN_TEST_CASE_COMPLETE:${name}`;
  requireSynchronousChildSuccess(child, completionMarker);
}

const providerAccess = (provider: SafeRepositoryAccess['provider']) =>
  ({ provider }) satisfies Pick<SafeRepositoryAccess, 'provider'>;

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
    const capability = host.detectNativeNoFollowCapability(process.cwd());
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
    expect(capability).toStrictEqual(host.requireNativeNoFollowCapability(process.cwd()));
  });
});

describe('host capability provider boundary', () => {
  test('returns null and rejects when the provider identity is not recognized', async () => {
    const name = 'returns null and rejects when the provider identity is not recognized';
    if (process.env[isolatedCaseEnvironment] !== name) return runIsolatedMockCase(name);
    const parsedProvider: unknown = JSON.parse('"unrecognized"');
    if (typeof parsedProvider !== 'string') throw new Error('provider fixture must be a string');
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({ provider: parsedProvider }),
    }));
    const host = await import('../src/config/host-capability.ts');
    const repositoryRoot = process.cwd();

    expect(host.detectNativeNoFollowCapability(repositoryRoot)).toBeNull();
    expect(() => host.requireNativeNoFollowCapability(repositoryRoot)).toThrow(
      'native no-follow host capability is unavailable; persistent path operations fail closed',
    );
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });

  test('reports the Linux descriptor capability when the native flags and provider are present', async () => {
    const name = 'reports the Linux descriptor capability when the native flags and provider are present';
    if (process.env[isolatedCaseEnvironment] !== name) return runIsolatedMockCase(name);
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    await mock.module('node:fs', () => ({
      constants: { ...realFsConstants, O_NOFOLLOW: 1 },
    }));
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => providerAccess('linux-proc-fd'),
    }));
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    try {
      const host = await import('../src/config/host-capability.ts');
      const repositoryRoot = process.cwd();
      const capability = host.detectNativeNoFollowCapability(repositoryRoot);
      if (!capability) throw new Error('Linux capability fixture is unavailable');

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
    }
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });

  test('does not attest unknown Windows filesystems for durable operations', async () => {
    const name = 'does not attest unknown Windows filesystems for durable operations';
    if (process.env[isolatedCaseEnvironment] !== name) return runIsolatedMockCase(name);
    await mock.module('node:fs', () => ({ constants: { ...realFsConstants, O_NOFOLLOW: 0 } }));
    const malformedResidualRisks: unknown = JSON.parse('"not-an-array"');
    if (typeof malformedResidualRisks !== 'string') throw new Error('malformed fixture must remain a string');
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => ({
        provider: 'fs-safe-windows',
        package: { name: '@openclaw/fs-safe', version: '0.26.2', integrity: 'package-integrity' },
        residual_risks: malformedResidualRisks,
        attested: false,
      }),
    }));
    const host = await import('../src/config/host-capability.ts');
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
      package: { name: '@openclaw/fs-safe', version: '0.26.2', integrity: 'package-integrity' },
      attested: false,
    });
    expect(host.nativeNoFollowAvailable).toBe(false);
    expect(() => host.requireNativeNoFollowCapability(process.cwd())).toThrow(
      'native no-follow host capability is unavailable; persistent path operations fail closed',
    );
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });

  test('reports unavailable when the safe provider is absent', async () => {
    const name = 'reports unavailable when the safe provider is absent';
    if (process.env[isolatedCaseEnvironment] !== name) return runIsolatedMockCase(name);
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: false,
      detectSafeRepositoryAccess: () => providerAccess('unavailable'),
    }));
    const host = await import('../src/config/host-capability.ts');

    expect(host.nativeNoFollowAvailable).toBe(false);
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });

  test('requires both native flags and the Linux platform for availability', async () => {
    const name = 'requires both native flags and the Linux platform for availability';
    if (process.env[isolatedCaseEnvironment] !== name) return runIsolatedMockCase(name);
    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    await mock.module('node:fs', () => ({ constants: { ...realFsConstants, O_NOFOLLOW: 0 } }));
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => providerAccess('linux-proc-fd'),
    }));
    Object.defineProperty(process, 'platform', { configurable: true, value: 'linux' });
    try {
      const host = await import('../src/config/host-capability.ts');
      expect(host.noFollowFlag).toBe(0);
      expect(host.nativeNoFollowAvailable).toBe(false);
    } finally {
      if (originalPlatform) Object.defineProperty(process, 'platform', originalPlatform);
    }
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });

  test('does not advertise Windows durability without a positive filesystem proof', async () => {
    const name = 'does not advertise Windows durability without a positive filesystem proof';
    if (process.env[isolatedCaseEnvironment] !== name) return runIsolatedMockCase(name);
    await mock.module('node:fs', () => ({ constants: { ...realFsConstants, O_NOFOLLOW: 0 } }));
    await mock.module('../src/config/safe-repository-access.ts', () => ({
      safeRepositoryProviderAvailable: true,
      detectSafeRepositoryAccess: () => providerAccess('unavailable'),
    }));
    const host = await import('../src/config/host-capability.ts');

    expect(host.nativeNoFollowAvailable).toBe(false);
    process.stdout.write(`BUN_TEST_CASE_COMPLETE:${name}\n`);
  });
});
