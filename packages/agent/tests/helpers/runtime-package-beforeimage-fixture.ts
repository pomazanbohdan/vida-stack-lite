import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spyOn } from 'bun:test';
import * as runtimeConfig from '../../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import * as sourceSnapshots from '../../src/orchestration/scoped-source-snapshot.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';

/** One changed package resource is test data; unchanged bytes use their current verified reader. */
export function runtimePackageBeforeimageFixture(parent: string, bundle: string, onRoot: (root: string) => void) {
  const currentAccess = runtimeConfig.runtimePackageAccess();
  const currentPaths = runtimeConfig.runtimePackageCodePaths(bundle, currentAccess);
  const boundPaths = JSON.stringify([...currentPaths].sort());
  const root = mkdtempSync(path.join(parent, 'runtime-beforeimage-'));
  onRoot(root);
  const relativePaths = currentPaths.map((file) => {
    if (!file.startsWith(bundle + '/')) throw new Error('Runtime beforeimage path is outside its bundle');
    return file.slice(bundle.length + 1);
  });
  const changedPath = relativePaths.find((file) => file.endsWith('/runtime-kernel.ts'));
  if (!changedPath) throw new Error('Runtime beforeimage needs the maintained kernel resource');
  const changedFile = path.join(root, changedPath);
  mkdirSync(path.dirname(changedFile), { recursive: true });
  writeFileSync(
    changedFile,
    Buffer.concat([
      runtimeConfig.readRuntimePackageResourceBytes(currentAccess, changedPath, 'Host package beforeimage data'),
      Buffer.from('\n/* Host beforeimage data, never executed. */\n'),
    ]),
  );
  const changedAccess = requireSafeRepositoryAccess(root);
  const access: Parameters<typeof sourceSnapshots.snapshotRuntimePackageSources>[0] = {
    fileExists: (file, label) => (file === changedPath ? changedAccess : currentAccess).fileExists(file, label),
    readBytes: (file, label) =>
      sourceSnapshots.readRuntimePackageSourceResourceBytes(
        file === changedPath ? changedAccess : currentAccess,
        file,
        label,
      ),
    readVerifiedCaptureBytes: (file, label, maxBytes) =>
      sourceSnapshots.readRuntimePackageSourceResourceBytes(
        file === changedPath ? changedAccess : currentAccess,
        file,
        label,
        maxBytes,
      ),
  };
  const snapshotRuntimePackageSources = sourceSnapshots.snapshotRuntimePackageSources;
  const before = snapshotRuntimePackageSources(access, bundle, currentPaths);
  const current = snapshotRuntimePackageSources(currentAccess, bundle, currentPaths);
  if (before.digest === current.digest) throw new Error('Runtime beforeimage data did not change');
  return {
    root,
    access,
    before,
    current,
    async bindBeforeimage<T>(body: (restore: () => void) => Promise<T>): Promise<T> {
      const snapshotSpy = spyOn(sourceSnapshots, 'snapshotRuntimePackageSources').mockImplementation(
        (reader, selectedBundle, selectedPaths) => {
          if (
            !('repository_root' in reader) ||
            reader.repository_root !== currentAccess.repository_root ||
            selectedBundle !== bundle ||
            JSON.stringify([...selectedPaths].sort()) !== boundPaths
          )
            throw new Error('Runtime beforeimage snapshot escaped its selected package');
          return before;
        },
      );
      let restored = false;
      const restore = () => {
        if (restored) return;
        snapshotSpy.mockRestore();
        restored = true;
      };
      let failure: { error: unknown } | undefined;
      try {
        return await body(restore);
      } catch (error) {
        failure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              restore();
            },
          ],
          failure,
        );
      }
    },
  };
}
