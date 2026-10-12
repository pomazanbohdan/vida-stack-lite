import { expect, spyOn, test, type Mock } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import * as runtimeConfig from '../src/config/runtime-config.js';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.js';
import { assertAdmittedRuntimeCodeCurrent } from '../src/orchestration/admitted-session-execution.js';
import { createAutomaticWorkAdmissionFixture } from './helpers/automatic-work-admission-fixture.js';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';

test('runtime package paths reuse the owned access and preserve live inventory parity', () => {
  const access = runtimeConfig.runtimePackageAccess();
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

test('one admission operation reuses its checked runtime package access for inventory and Source reads', () => {
  const fixture = createAutomaticWorkAdmissionFixture(false, true);
  let accessSpy: Mock<typeof safeRepositoryAccess.requireSafeRepositoryAccess> | undefined;
  try {
    const input = fixture.prepare('runtime-access-reuse', 'user:runtime-access-reuse');
    input.intakePath = '.agent/work/runtime-access-reuse/raw-intake.json';
    writeFileSync(
      path.join(fixture.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const packageRoot = path.resolve(import.meta.dirname, '..');
    const packageAccesses: string[] = [];
    const original = safeRepositoryAccess.requireSafeRepositoryAccess;
    accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((root) => {
      if (path.resolve(root) === packageRoot) packageAccesses.push(root);
      return original(root);
    });
    const admitted = fixture.admit(input);
    expect(packageAccesses).toHaveLength(1);
    const work = admitted.host.work;
    if (!work) throw new Error('admitted fixture has no work');
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: input.context.work_id,
    };

    assertAdmittedRuntimeCodeCurrent(fixture.root, fixture.store, identity);
    expect(packageAccesses).toHaveLength(2);
  } finally {
    accessSpy?.mockRestore();
    fixture.close();
  }
});
