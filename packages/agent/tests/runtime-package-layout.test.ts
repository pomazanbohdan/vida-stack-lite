import { expect, mock, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import * as fsNamespace from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as runtimeConfig from '../src/config/runtime-config.js';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.js';
import * as runtimeInventory from '../tooling/maintained-source-inventory.ts';

const originalFsExports = Object.freeze({ ...fsNamespace });
const originalInventoryExports = Object.freeze({ ...runtimeInventory });

test('runtime package paths reuse the owned access and preserve live inventory parity', () => {
  const access = runtimeConfig.runtimePackageAccess();
  const expected = runtimeInventory
    .runtimeExecutableInventory(access.repository_root, 'source')
    .map((file) => 'runtime-package/' + file);
  let accessCalls = 0;
  const observedAccess = {
    ...access,
    fileExists(target: string, label: string): boolean {
      accessCalls += 1;
      return access.fileExists(target, label);
    },
    listFiles(target: string, label: string): readonly string[] {
      accessCalls += 1;
      return access.listFiles(target, label);
    },
    readBytes(target: string, label: string): Buffer {
      accessCalls += 1;
      return access.readBytes(target, label);
    },
  };

  expect(runtimeConfig.runtimePackageCodePaths('runtime-package', observedAccess)).toEqual(expected);
  expect(expected).toContain('runtime-package/bin/cli-metadata.ts');
  expect(expected).not.toContain('runtime-package/bin/cli-metadata.mjs');
  expect(expected).toContain('runtime-package/tooling/maintained-source-inventory.ts');
  expect(expected).not.toContain('runtime-package/tooling/maintained-source-inventory.mjs');
  // Discovery retains the original scanner; consumers live-read bytes through the owned access.
  expect(accessCalls).toBe(0);
});

test('runtime package paths reject a wrong root before calling its access methods', () => {
  const unrelatedRoot = mkdtempSync(path.join(tmpdir(), 'runtime-package-access-reuse-'));
  try {
    const safeAccess = safeRepositoryAccess.requireSafeRepositoryAccess(unrelatedRoot);
    let accessReads = 0;
    const countedAccess = {
      ...safeAccess,
      fileExists(target: string, label: string): boolean {
        accessReads += 1;
        return safeAccess.fileExists(target, label);
      },
      listFiles(target: string, label: string): readonly string[] {
        accessReads += 1;
        return safeAccess.listFiles(target, label);
      },
      readBytes(target: string, label: string): Buffer {
        accessReads += 1;
        return safeAccess.readBytes(target, label);
      },
    };

    expect(() => runtimeConfig.runtimePackageCodePaths('runtime-package', countedAccess)).toThrow(
      'runtime package access root differs',
    );
    expect(accessReads).toBe(0);
  } finally {
    rmSync(unrelatedRoot, { recursive: true, force: true });
  }
});

// `mock.module` changes global module bindings; keep this test in a lightweight, exclusive coverage lane.
test('runtime package fallback selects dist paths through the owned root', async () => {
  const packageRoot = path.resolve(import.meta.dirname, '..');
  const fallbackRoot = path.dirname(packageRoot);
  const packageManifestProbe = path.join(packageRoot, 'package.json');
  const access = safeRepositoryAccess.requireSafeRepositoryAccess(fallbackRoot);
  const inventorySpecifier = fileURLToPath(new URL('../tooling/maintained-source-inventory.ts', import.meta.url));
  const packageProbeCalls: string[] = [];
  const inventoryCalls: Array<{ root: string; shape: string | undefined }> = [];
  const logicalFiles = ['package.json', 'dist/src/runtime.js'];
  const cleanupErrors: unknown[] = [];
  let bodyFailed = false;
  let bodyError: unknown;

  try {
    await mock.module('node:fs', () => ({
      ...originalFsExports,
      existsSync(target: Parameters<typeof fsNamespace.existsSync>[0]): boolean {
        const candidate = path.resolve(String(target));
        if (candidate === packageManifestProbe) {
          packageProbeCalls.push(candidate);
          return false;
        }
        return originalFsExports.existsSync(target);
      },
    }));
    await mock.module(inventorySpecifier, () => ({
      ...originalInventoryExports,
      runtimeExecutableInventory(root: string, shape?: 'source' | 'dist'): readonly string[] {
        inventoryCalls.push({ root, shape });
        return logicalFiles;
      },
    }));

    const isolated = (await import(
      `../src/config/runtime-config.ts?runtime-package-layout=${randomUUID()}`
    )) as typeof runtimeConfig;
    expect(isolated.runtimePackageCodePaths('runtime-package', access)).toEqual([
      'runtime-package/package.json',
      'runtime-package/dist/src/runtime.js',
    ]);
    expect(packageProbeCalls).toEqual([packageManifestProbe]);
    expect(inventoryCalls).toEqual([{ root: access.repository_root, shape: 'dist' }]);
    expect(access.repository_root).toBe(fallbackRoot);
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
  }

  for (const [specifier, exports] of [
    ['node:fs', originalFsExports],
    [inventorySpecifier, originalInventoryExports],
  ] as const) {
    try {
      await mock.module(specifier, () => exports);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  try {
    mock.restore();
  } catch (error) {
    cleanupErrors.push(error);
  }
  if (bodyFailed && cleanupErrors.length)
    throw new AggregateError(
      [bodyError, ...cleanupErrors],
      'Runtime package layout test and module restoration failed',
    );
  if (bodyFailed) throw bodyError;
  if (cleanupErrors.length) throw new AggregateError(cleanupErrors, 'Runtime package layout module restoration failed');
});
