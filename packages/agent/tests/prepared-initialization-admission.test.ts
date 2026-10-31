import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { finishPreparedInitializationUnderAdmission, prepareInitializationUnderAdmission } from '../bin/init-core.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  withExclusiveInitConfigAdmission,
  type InitConfigAdmissionProof,
} from '../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH } from '../src/config/project-paths.ts';

const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const pendingPath = '.agent/runtime-initialization.pending.v1.json';

test('prepared intent requires the live bound gate and resumes the exact journaled operation once', async () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-prepared-init-')));
  const request = {
    projectRoot: root,
    repository: 'prepared-repo',
    projectMappings: ['agent=agent', 'codex=codex', 'powers=powers'],
  };
  let expired: InitConfigAdmissionProof | undefined;
  {
    for (const directory of ['.agent', 'agent', 'codex', 'powers']) mkdirSync(path.join(root, directory));
    const workspace = deriveWorkspaceId(request.repository, root);
    const clean =
      JSON.stringify({
        schema: 'ConsumerCleanInitializationOperation/v1',
        version: 1,
        phase: 'initializing',
        operation_id: 'test',
        root,
        workspace_id: workspace,
      }) + '\n';
    writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), clean);
    const access = requireSafeRepositoryAccess(root);
    await withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
      expired = proof;
      const before = readdirSync(path.join(root, '.agent')).sort();
      for (const forged of [{ assertActive: () => {} }, { ...proof }])
        await Promise.resolve(
          expect(
            Promise.resolve().then(() => prepareInitializationUnderAdmission(forged, request, digest(clean))),
          ).rejects.toThrow(),
        );
      await Promise.resolve(
        expect(
          Promise.resolve().then(() =>
            prepareInitializationUnderAdmission(proof, { ...request, projectRoot: path.dirname(root) }, digest(clean)),
          ),
        ).rejects.toThrow(),
      );
      await Promise.resolve(
        expect(
          Promise.resolve().then(() => prepareInitializationUnderAdmission(proof, request, digest('foreign'))),
        ).rejects.toThrow(),
      );
      writeFileSync(path.join(root, pendingPath), 'foreign');
      await Promise.resolve(
        expect(
          Promise.resolve().then(() => prepareInitializationUnderAdmission(proof, request, digest(clean))),
        ).rejects.toThrow(),
      );
      expect(readFileSync(path.join(root, pendingPath), 'utf8')).toBe('foreign');
      unlinkSync(path.join(root, pendingPath));
      const prepared = prepareInitializationUnderAdmission(proof, request, digest(clean));
      expect(Object.isFrozen(prepared)).toBe(true);
      expect(Object.isFrozen(prepared.projectIdentities)).toBe(true);
      expect(readdirSync(path.join(root, '.agent')).sort()).toEqual(before);
      expect(readFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), 'utf8')).toBe(clean);
      await access.writeExclusiveAtomicAsync(pendingPath, prepared.intent, 'test handoff');
      const stale = { ...prepared, resourceDigest: '0'.repeat(64) };
      await Promise.resolve(
        expect(
          Promise.resolve().then(() =>
            finishPreparedInitializationUnderAdmission(proof, request, stale, digest(clean)),
          ),
        ).rejects.toThrow(),
      );
      await Promise.resolve(
        expect(
          Promise.resolve().then(() =>
            finishPreparedInitializationUnderAdmission(
              proof,
              { ...request, projectMappings: ['agent=codex', 'codex=agent', 'powers=powers'] },
              prepared,
              digest(clean),
            ),
          ),
        ).rejects.toThrow(),
      );
      expect(readFileSync(path.join(root, pendingPath), 'utf8')).toBe(prepared.intent);
      const foreign = prepared.intent.replace('prepared-repo', 'foreign-repo');
      await access.replaceAtomicAsync(pendingPath, digest(prepared.intent), foreign, 'test foreign intent');
      await Promise.resolve(
        expect(
          Promise.resolve().then(() =>
            finishPreparedInitializationUnderAdmission(proof, request, prepared, digest(clean)),
          ),
        ).rejects.toThrow(),
      );
      expect(readFileSync(path.join(root, pendingPath), 'utf8')).toBe(foreign);
      await access.replaceAtomicAsync(pendingPath, digest(foreign), prepared.intent, 'restore test intent');
      const mutableRequest = { ...request, projectMappings: [...request.projectMappings] };
      const rehydrated = {
        resourceDigest: prepared.resourceDigest,
        projectIdentities: [...prepared.projectIdentities],
        bundleIdentity: prepared.bundleIdentity,
        rootIdentity: prepared.rootIdentity,
        intent: prepared.intent,
      };
      await Promise.resolve(
        expect(
          Promise.resolve().then(() =>
            finishPreparedInitializationUnderAdmission(proof, request, prepared, digest('drift')),
          ),
        ).rejects.toThrow(),
      );
      writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), clean + ' ');
      await Promise.resolve(
        expect(
          Promise.resolve().then(() =>
            finishPreparedInitializationUnderAdmission(proof, request, prepared, digest(clean)),
          ),
        ).rejects.toThrow(),
      );
      expect(readFileSync(path.join(root, pendingPath), 'utf8')).toBe(prepared.intent);
      writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), clean);
      const running = finishPreparedInitializationUnderAdmission(proof, mutableRequest, rehydrated, digest(clean));
      mutableRequest.repository = 'changed-repo';
      mutableRequest.projectMappings[0] = 'agent=powers';
      rehydrated.resourceDigest = '0'.repeat(64);
      rehydrated.projectIdentities[0] = 'changed';
      rehydrated.intent = '{}';
      const finished = await running;
      expect(finished.status).toBe('resumed_initialization');
      const receipt = readFileSync(path.join(root, finished.receipt), 'utf8');
      expect(receipt).toBe(prepared.intent);
      expect(readFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), 'utf8')).toBe(clean);
      expect((await finishPreparedInitializationUnderAdmission(proof, request, prepared, digest(clean))).status).toBe(
        'already_completed',
      );
      expect(readFileSync(path.join(root, finished.receipt), 'utf8')).toBe(receipt);
      expect(readFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), 'utf8')).toBe(clean);
    });
    if (!expired) throw new Error('Proof was not captured');
    await Promise.resolve(
      expect(
        Promise.resolve().then(() => prepareInitializationUnderAdmission(expired!, request, digest('unused'))),
      ).rejects.toThrow(),
    );
    let failedProof: InitConfigAdmissionProof | undefined;
    await Promise.resolve(
      expect(
        withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
          failedProof = proof;
          throw new Error('callback failure');
        }),
      ).rejects.toThrow('callback failure'),
    );
    await Promise.resolve(
      expect(
        Promise.resolve().then(() =>
          finishPreparedInitializationUnderAdmission(failedProof!, request, {} as never, digest(clean)),
        ),
      ).rejects.toThrow(),
    );
  }
}, 30_000);
