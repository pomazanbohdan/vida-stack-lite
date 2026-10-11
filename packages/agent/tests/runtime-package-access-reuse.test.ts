import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { runtimePackageAccess, runtimePackageCodePaths } from '../src/config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';

test('runtime package paths reuse the owned access and preserve live inventory parity', () => {
  const access = runtimePackageAccess();
  const expected = runtimeExecutableInventory(access.repository_root, 'source').map(
    (file) => 'runtime-package/' + file,
  );
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

  expect(runtimePackageCodePaths('runtime-package', observedAccess)).toEqual(expected);
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
    const safeAccess = requireSafeRepositoryAccess(unrelatedRoot);
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

    expect(() => runtimePackageCodePaths('runtime-package', countedAccess)).toThrow(
      'runtime package access root differs',
    );
    expect(accessReads).toBe(0);
  } finally {
    rmSync(unrelatedRoot, { recursive: true, force: true });
  }
});
