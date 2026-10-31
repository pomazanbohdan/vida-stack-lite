import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
  PROJECT_INITIALIZATION_PATH,
  RUNTIME_INITIALIZATION_PATH,
} from '../src/config/project-paths.ts';
import {
  assertGateOnlyUnderInitAdmission,
  withCleanInitializationPublicationLocks,
  withExclusiveInitConfigAdmission,
  type InitConfigAdmissionProof,
} from '../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

test('clean publication holds both existing receipt locks under the live gate', async () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-locks-')));
  mkdirSync(path.join(root, '.agent'));
  const workspace = deriveWorkspaceId('locks', root);
  const access = requireSafeRepositoryAccess(root);
  let stale: InitConfigAdmissionProof | undefined;
  let publishCalls = 0;
  let competingCalls = 0;
  await withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
    stale = proof;
    expect(() => assertGateOnlyUnderInitAdmission({ ...proof }, root, workspace)).toThrow(
      'invalid init/config admission proof',
    );
    expect(() => assertGateOnlyUnderInitAdmission(proof, path.dirname(root), workspace)).toThrow(
      'invalid init/config admission proof',
    );
    expect(() => assertGateOnlyUnderInitAdmission(proof, root, '0'.repeat(64))).toThrow(
      'invalid init/config admission proof',
    );
    assertGateOnlyUnderInitAdmission(proof, root, workspace);
    await withCleanInitializationPublicationLocks(proof, root, workspace, async () => {
      publishCalls++;
      for (const receipt of [RUNTIME_INITIALIZATION_PATH, PROJECT_INITIALIZATION_PATH])
        await Promise.resolve(
          expect(
            access.withExclusiveLockAsync(receipt, 'competing binder', async () => {
              competingCalls++;
            }),
          ).rejects.toMatchObject({
            code: process.platform === 'win32' ? 'file_lock_timeout' : 'EEXIST',
          }),
        );
      expect(competingCalls).toBe(0);
      writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), 'retained marker');
    });
    expect(publishCalls).toBe(1);
    await Promise.resolve(
      expect(
        withCleanInitializationPublicationLocks(proof, root, workspace, async () => {
          publishCalls++;
        }),
      ).rejects.toThrow('Clean initialization is pending'),
    );
    expect(publishCalls).toBe(1);
    expect(readFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), 'utf8')).toBe('retained marker');
  });
  expect(() => assertGateOnlyUnderInitAdmission(stale!, root, workspace)).toThrow(
    'invalid init/config admission proof',
  );
  console.info('Retained clean publication fixture: ' + root);
});

test('publication callback failure is not retried and retains its marker', async () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-lock-failure-')));
  mkdirSync(path.join(root, '.agent'));
  const workspace = deriveWorkspaceId('locks', root);
  const failure = new Error('published callback failure');
  let calls = 0;
  await withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
    await Promise.resolve(
      expect(
        withCleanInitializationPublicationLocks(proof, root, workspace, async () => {
          calls++;
          writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), 'retained failure marker');
          throw failure;
        }),
      ).rejects.toBe(failure),
    );
    expect(calls).toBe(1);
    assertGateOnlyUnderInitAdmission(proof, root, workspace);
    expect(readFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), 'utf8')).toBe(
      'retained failure marker',
    );
  });
  console.info('Retained failed publication fixture: ' + root);
});
