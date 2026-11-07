import { expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  captureInitializationRuntimeBinding,
  finishPreparedInitializationUnderAdmission,
  prepareInitializationUnderAdmission,
} from '../bin/init-core.ts';
import { sealCleanInitializationOperationV2 } from '../bin/consumer-clean-initialization-v2.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  withExclusiveInitConfigAdmission,
  type InitConfigAdmissionProof,
} from '../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH } from '../src/config/project-paths.ts';

const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const pendingPath = '.agent/runtime-initialization.pending.v1.json';
const preservedPreparationTimeoutMs = 30_000;

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
      const forgedIntent = {
        ...prepared,
        intent: JSON.stringify({ ...JSON.parse(prepared.intent), config_digest: '0'.repeat(64) }) + '\n',
      };
      await Promise.resolve(
        expect(finishPreparedInitializationUnderAdmission(proof, request, forgedIntent, digest(clean))).rejects.toThrow(
          'Prepared initialization inputs changed',
        ),
      );
      await Promise.resolve(
        expect(
          finishPreparedInitializationUnderAdmission(
            proof,
            { ...request, reconcileExisting: true },
            prepared,
            digest(clean),
          ),
        ).rejects.toThrow('requires a fresh request'),
      );
      expect(readdirSync(path.join(root, '.agent')).sort()).toEqual(before);
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

test(
  'v2 preparation adopts exact preserved bytes into the fresh initialization receipt',
  async () => {
    const startedAt = performance.now();
    const assertWithinBudget = () => {
      if (performance.now() - startedAt >= preservedPreparationTimeoutMs)
        throw new Error('Preserved preparation fixture exceeded its 30000ms whole-case budget');
    };
    let allocatedRoot: string | undefined;
    let failed = false;
    let bodyError: unknown;
    try {
      assertWithinBudget();
      allocatedRoot = mkdtempSync(path.join(tmpdir(), 'vida-clean-preserved-'));
      console.error('Allocated v2 preservation fixture: ' + allocatedRoot);
      assertWithinBudget();
      const root = realpathSync(allocatedRoot);
      const request = {
        projectRoot: root,
        repository: 'prepared-repo',
        projectMappings: ['agent=agent', 'codex=codex', 'powers=powers'],
      };
      const sidecar = Buffer.from('project-owned sidecar bytes\n', 'utf8');
      for (const directory of ['.agent', 'agent', 'codex', 'powers']) {
        assertWithinBudget();
        mkdirSync(path.join(root, directory));
      }
      assertWithinBudget();
      writeFileSync(path.join(root, 'AGENT.sidecar.md'), sidecar);
      assertWithinBudget();
      const access = requireSafeRepositoryAccess(root);
      assertWithinBudget();
      const identity = access.observeFileIdentity?.('AGENT.sidecar.md', 'test preserved sidecar');
      if (!identity) throw new Error('verified capture is unavailable');
      assertWithinBudget();
      const operationId = randomUUID();
      const workspace = deriveWorkspaceId(request.repository, root);
      const operation = sealCleanInitializationOperationV2({
        schema: 'ConsumerCleanInitializationOperation/v2',
        version: 2,
        operation_id: operationId,
        root,
        root_identity: access.directoryIdentity('.', 'test root'),
        workspace_id: workspace,
        request,
        runtime: captureInitializationRuntimeBinding(),
        archive_root: `.agent/clean-initialization-history/${operationId}/payload`,
        inventory: [],
        preserved: [
          {
            type: 'file',
            path: 'AGENT.sidecar.md',
            identity,
            size: sidecar.length,
            sha256: digest(sidecar),
          },
        ],
        protected_paths: ['.agent/coordination', '.agent/work'],
        moves: [],
        containers: [],
        phase: 'archive_complete',
        prepared: null,
        initialization: 'not-started',
      });
      const clean = JSON.stringify(operation) + '\n';
      assertWithinBudget();
      writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), clean);
      assertWithinBudget();
      await withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
        assertWithinBudget();
        const prepared = prepareInitializationUnderAdmission(proof, request, digest(clean));
        assertWithinBudget();
        const receipt = JSON.parse(prepared.intent) as {
          provenance: string;
          templates: Array<{ output: string; output_sha256: string }>;
        };
        expect(receipt.provenance).toBe('adopted_existing');
        expect(receipt.templates.find((entry) => entry.output === 'AGENT.sidecar.md')?.output_sha256).toBe(
          digest(sidecar),
        );
        expect(prepared.preserved).toEqual(operation.preserved);
        expect(readFileSync(path.join(root, 'AGENT.sidecar.md')).equals(sidecar)).toBe(true);
        expect(readdirSync(path.join(root, '.agent')).sort()).toEqual([
          'consumer-clean-initialization.pending.v1.json',
        ]);
        assertWithinBudget();
        const completed = sealCleanInitializationOperationV2({
          ...Object.fromEntries(Object.entries(operation).filter(([key]) => key !== 'binding')),
          phase: 'complete',
          prepared: {
            intent: prepared.intent,
            rootIdentity: prepared.rootIdentity,
            bundleIdentity: prepared.bundleIdentity,
            projectIdentities: prepared.projectIdentities,
            resourceDigest: prepared.resourceDigest,
          },
          initialization: 'completed',
        });
        const completedBytes = JSON.stringify(completed) + '\n';
        assertWithinBudget();
        writeFileSync(path.join(root, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH), completedBytes);
        assertWithinBudget();
        writeFileSync(path.join(root, pendingPath), prepared.intent);
        assertWithinBudget();
        const result = await finishPreparedInitializationUnderAdmission(
          proof,
          request,
          prepared,
          digest(completedBytes),
        );
        expect(result.status).toBe('resumed_initialization');
        expect(readFileSync(path.join(root, 'AGENT.sidecar.md')).equals(sidecar)).toBe(true);
        expect(readFileSync(path.join(root, result.receipt), 'utf8')).toBe(prepared.intent);
      });
    } catch (error) {
      failed = true;
      bodyError = error;
    } finally {
      if (allocatedRoot !== undefined) console.error('Retained v2 preservation fixture: ' + allocatedRoot);
    }
    const elapsedMs = performance.now() - startedAt;
    const budgetError =
      elapsedMs >= preservedPreparationTimeoutMs
        ? new Error('Preserved preparation fixture completed after its 30000ms budget: ' + elapsedMs.toFixed(3) + 'ms')
        : undefined;
    if (failed && budgetError) throw new AggregateError([bodyError, budgetError], 'Fixture body and budget failed');
    if (failed) throw bodyError;
    if (budgetError) throw budgetError;
  },
  preservedPreparationTimeoutMs,
);
