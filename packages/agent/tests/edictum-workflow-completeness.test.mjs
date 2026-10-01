import { createConsumerFixture } from './helpers/consumer-fixture.mjs';
import { afterAll, describe, expect, test } from 'vitest';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  createConfiguredEdictumWorkflow,
  createFileWorkflowHostCapability,
  createFileWorkflowHostCapabilityWithProof,
  createTestFileWorkflowHostCapability,
  createTestWorkflowHostCapability,
  createWorkflowHostAuthenticationProofForCompositionRoot,
} from '../src/governance/edictum-boundary.ts';
import { nativeNoFollowAvailable } from '../src/config/host-capability.ts';
const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? createConsumerFixture(packageRoot);
afterAll(() => {
  if (!process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT) rmSync(repositoryRoot, { recursive: true, force: true });
});
const operation = Object.freeze({
  operation_hash: 'a'.repeat(64),
  tenant: 'fixture-repository',
  project: 'fixture-project',
});
let sessionSequence = 0;

function workflow(principal = 'human:workflow-reviewer') {
  sessionSequence += 1;
  const host = createTestWorkflowHostCapability(repositoryRoot, principal);
  return createConfiguredEdictumWorkflow(repositoryRoot, `quality-${sessionSequence}`, host);
}

function receipt(stageId, overrides = {}) {
  const unsigned = {
    schema: 'EdictumWorkflowApproval/v1',
    stage_id: stageId,
    approval_id: `approval-${sessionSequence}`,
    approver: 'human:workflow-reviewer',
    ...operation,
    approved_at: new Date(Date.now() - 1_000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
  return {
    ...unsigned,
    evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned),
  };
}

async function pendingWriteWorkflow() {
  const candidate = workflow();
  expect((await candidate.evaluate('runtime.write', operation)).action).toBe('pending_approval');
  return candidate;
}

describe('configured Edictum workflow completeness', () => {
  test('valid workflow advances through both approvals and result stages', async () => {
    const candidate = workflow();
    expect(candidate.approval_authority).toBe('workflow-gate-only');
    expect(candidate.config_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(candidate.definition.stages).toHaveLength(5);
    expect((await candidate.evaluate('runtime.read')).action).toBe('allow');
    await expect(candidate.recordResult('read-evidence', 'runtime.read')).resolves.toEqual([]);
    expect((await candidate.evaluate('runtime.write', operation)).action).toBe('pending_approval');

    await candidate.approve(receipt('governed-write-approval'));
    expect((await candidate.evaluate('runtime.write', operation)).action).toBe('allow');
    await expect(
      candidate.recordResult('governed-write', 'runtime.write', operation, { accepted: true }),
    ).resolves.toEqual([]);
    expect((await candidate.evaluate('delivery.execute')).action).toBe('pending_approval');
    await candidate.approve(receipt('delivery-approval', { approval_id: 'delivery-approval' }));
    expect((await candidate.evaluate('delivery.execute')).action).toBe('allow');
    await expect(candidate.recordResult('delivery', 'delivery.execute', {}, { delivered: true })).resolves.toEqual([]);
    await expect(candidate.assertRequiredStageEvidence()).resolves.toBeUndefined();
    expect((await candidate.state()).approvals).toEqual({
      'governed-write-approval': 'approved',
      'delivery-approval': 'approved',
    });
  });

  test('terminal acceptance rejects missing configured stage evidence and accepts exact completion evidence', async () => {
    const incomplete = workflow();
    expect((await incomplete.evaluate('runtime.write', operation)).action).toBe('pending_approval');
    await incomplete.approve(receipt('governed-write-approval'));
    await incomplete.recordResult('governed-write', 'runtime.write', operation, { accepted: true });
    expect((await incomplete.evaluate('delivery.execute')).action).toBe('pending_approval');
    await incomplete.approve(receipt('delivery-approval', { approval_id: 'missing-stage-delivery' }));
    await expect(
      incomplete.recordResult('delivery', 'delivery.execute', {}, { delivered: true }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/GAP-RTNEW-EDICTUM-EVIDENCE-001.*read-evidence/),
    });

    const complete = workflow();
    await complete.evaluate('runtime.read');
    await complete.recordResult('read-evidence', 'runtime.read');
    await complete.evaluate('runtime.write', operation);
    await complete.approve(receipt('governed-write-approval', { approval_id: 'complete-write-approval' }));
    await complete.recordResult('governed-write', 'runtime.write', operation, { accepted: true });
    await complete.evaluate('delivery.execute');
    await complete.approve(receipt('delivery-approval', { approval_id: 'complete-delivery-approval' }));
    await expect(complete.recordResult('delivery', 'delivery.execute', {}, { delivered: true })).resolves.toEqual([]);
  });

  test('the configured required stage list changes terminal acceptance behavior', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'edictum-required-stages-'));
    try {
      mkdirSync(path.join(root, '.git'), { recursive: true });
      mkdirSync(path.join(root, 'docs'), { recursive: true });
      mkdirSync(path.join(root, 'vida-agent'), { recursive: true });
      copyFileSync(
        path.join(packageRoot, 'docs/system-specification.md'),
        path.join(root, 'docs/system-specification.md'),
      );
      copyFileSync(path.join(packageRoot, 'TESTING.md'), path.join(root, 'vida-agent/TESTING.md'));
      for (const name of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
        copyFileSync(path.join(repositoryRoot, name), path.join(root, name));
      const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
      writeFileSync(
        configPath,
        readFileSync(configPath, 'utf8').replace(
          /(\r?\n)        - read-evidence(?=\r?\n        - governed-write-approval)/,
          '',
        ),
        'utf8',
      );
      const candidate = createConfiguredEdictumWorkflow(
        root,
        'configured-required-stages',
        createTestWorkflowHostCapability(root),
      );
      await candidate.evaluate('runtime.write', operation);
      await candidate.approve(receipt('governed-write-approval', { approval_id: 'configured-write-approval' }));
      await candidate.recordResult('governed-write', 'runtime.write', operation, { accepted: true });
      await candidate.evaluate('delivery.execute');
      await candidate.approve(receipt('delivery-approval', { approval_id: 'configured-delivery-approval' }));
      await expect(candidate.recordResult('delivery', 'delivery.execute', {}, { delivered: true })).resolves.toEqual(
        [],
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('workflow capability, root, session, and write bindings fail closed', async () => {
    expect(() => createTestWorkflowHostCapability('relative')).toThrow(/absolute/);
    expect(() => createTestWorkflowHostCapability(repositoryRoot, '')).toThrow(/principal|invalid/);
    const host = createTestWorkflowHostCapability(repositoryRoot);
    expect(() => createConfiguredEdictumWorkflow(repositoryRoot, '', host)).toThrow(/session/);
    expect(() => createConfiguredEdictumWorkflow(repositoryRoot, 'untrusted', {})).toThrow(/trusted/);
    const packageHost = createTestWorkflowHostCapability(packageRoot);
    expect(() => createConfiguredEdictumWorkflow(repositoryRoot, 'wrong-root', packageHost)).toThrow(/root mismatch/);
    const forgedHost = {
      schema: 'WorkflowHostCapability/v1',
      authenticatedPrincipal: 'human:forged',
      repositoryRoot,
      storeId: 'forged-store',
      consumeApproval: async (_binding, apply) => apply(),
    };
    expect(() => createConfiguredEdictumWorkflow(repositoryRoot, 'forged', forgedHost)).toThrow(/host-issued|opaque/);
    for (const storeId of ['.', '..', '../escape']) {
      expect(() =>
        createWorkflowHostAuthenticationProofForCompositionRoot(repositoryRoot, 'human:workflow-reviewer', storeId),
      ).toThrow(/store id/);
    }
    const registryKey = Symbol.for('agent-runtime-new.edictum.workflow-host-capability-registry.v1');
    const previousRegistry = globalThis[registryKey];
    globalThis[registryKey] = { issued: new WeakSet(), bindings: new WeakMap() };
    try {
      expect(() => createConfiguredEdictumWorkflow(repositoryRoot, 'global-poison', forgedHost)).toThrow(
        /host-issued|opaque/,
      );
    } finally {
      if (previousRegistry === undefined) delete globalThis[registryKey];
      else globalThis[registryKey] = previousRegistry;
    }
    for (const args of [
      { ...operation, operation_hash: '' },
      { ...operation, tenant: '' },
      { ...operation, project: '' },
    ]) {
      expect(() => workflow().evaluate('runtime.write', args)).toThrow(/required/);
    }
    const bound = workflow();
    await bound.evaluate('runtime.write', operation);
    expect(() => bound.evaluate('runtime.write', { ...operation, project: 'other' })).toThrow(/binding changed/);
  });
  test('workflow rejects configuration drift after composition', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'edictum-config-drift-'));
    try {
      mkdirSync(path.join(root, '.git'), { recursive: true });
      mkdirSync(path.join(root, 'docs'), { recursive: true });
      mkdirSync(path.join(root, 'vida-agent'), { recursive: true });
      copyFileSync(
        path.join(packageRoot, 'docs/system-specification.md'),
        path.join(root, 'docs/system-specification.md'),
      );
      copyFileSync(path.join(packageRoot, 'TESTING.md'), path.join(root, 'vida-agent/TESTING.md'));
      copyFileSync(path.join(repositoryRoot, 'AGENTS.md'), path.join(root, 'AGENTS.md'));
      copyFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), path.join(root, 'AGENT.sidecar.md'));
      copyFileSync(
        path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'),
        path.join(root, 'agent-runtime.config.v1.yaml'),
      );

      const host = createTestWorkflowHostCapability(root);
      const candidate = createConfiguredEdictumWorkflow(root, 'configuration-drift', host);
      const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
      writeFileSync(
        configPath,
        readFileSync(configPath, 'utf8').replace(
          /config_revision: (\d+)/,
          (_match, revision) => 'config_revision: ' + (Number(revision) + 1),
        ),
        'utf8',
      );

      expect(() => candidate.evaluate('runtime.read')).toThrow(/configuration changed after composition/);
      expect(() => createConfiguredEdictumWorkflow(root, 'configuration-drift-recompose', host)).toThrow(
        /host configuration snapshot is stale/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('workflow fences awaited runtime operations and rolls back stale approval', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'edictum-async-drift-'));
    try {
      mkdirSync(path.join(root, '.git'), { recursive: true });
      mkdirSync(path.join(root, 'docs'), { recursive: true });
      mkdirSync(path.join(root, 'vida-agent'), { recursive: true });
      copyFileSync(
        path.join(packageRoot, 'docs/system-specification.md'),
        path.join(root, 'docs/system-specification.md'),
      );
      copyFileSync(path.join(packageRoot, 'TESTING.md'), path.join(root, 'vida-agent/TESTING.md'));
      copyFileSync(path.join(repositoryRoot, 'AGENTS.md'), path.join(root, 'AGENTS.md'));
      copyFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), path.join(root, 'AGENT.sidecar.md'));
      copyFileSync(
        path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'),
        path.join(root, 'agent-runtime.config.v1.yaml'),
      );

      const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
      const originalConfig = readFileSync(configPath, 'utf8');
      const mutateConfig = () =>
        writeFileSync(
          configPath,
          readFileSync(configPath, 'utf8').replace(
            /config_revision: (\d+)/,
            (_match, revision) => 'config_revision: ' + (Number(revision) + 1),
          ),
          'utf8',
        );
      const restoreConfig = () => writeFileSync(configPath, originalConfig, 'utf8');
      const host = createTestWorkflowHostCapability(root);
      const candidate = createConfiguredEdictumWorkflow(root, 'async-evaluate-drift', host);
      const originalEvaluate = candidate.runtime.evaluate.bind(candidate.runtime);
      candidate.runtime.evaluate = async (...args) => {
        const result = await originalEvaluate(...args);
        mutateConfig();
        return result;
      };
      await expect(candidate.evaluate('runtime.read')).rejects.toThrow(/configuration changed after composition/);

      restoreConfig();
      const approvalCandidate = createConfiguredEdictumWorkflow(root, 'async-approval-drift', host);
      await expect(approvalCandidate.evaluate('runtime.write', operation)).resolves.toMatchObject({
        action: 'pending_approval',
      });
      const originalRecordApproval = approvalCandidate.runtime.recordApproval.bind(approvalCandidate.runtime);
      approvalCandidate.runtime.recordApproval = async (...args) => {
        const result = await originalRecordApproval(...args);
        mutateConfig();
        return result;
      };
      await expect(
        approvalCandidate.approve(receipt('governed-write-approval', { approval_id: 'async-approval' })),
      ).rejects.toThrow(/configuration changed after composition/);
      const state = await approvalCandidate.runtime.state(approvalCandidate.session);
      expect(state.pendingApproval?.stageId).toBe('governed-write-approval');
      expect(state.approvals).toEqual({});
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test('approval receipt shape, identity, binding, expiry, and digest are enforced', async () => {
    await expect(workflow().approve(null)).rejects.toThrow(/plain object/);

    const symbolReceipt = receipt('governed-write-approval');
    symbolReceipt[Symbol('hostile')] = true;
    await expect(workflow().approve(symbolReceipt)).rejects.toThrow(/fields/);

    const accessorReceipt = receipt('governed-write-approval');
    Object.defineProperty(accessorReceipt, 'stage_id', { enumerable: true, get: () => 'governed-write-approval' });
    await expect(workflow().approve(accessorReceipt)).rejects.toThrow(/accessors/);

    for (const malformed of [
      { ...receipt('governed-write-approval'), extra: true },
      { ...receipt('governed-write-approval'), stage_id: 1 },
    ])
      await expect(workflow().approve(malformed)).rejects.toThrow(/fields|types/);

    const cases = [
      [{ schema: 'wrong' }, /schema/],
      [{ stage_id: '' }, /stage identity/],
      [{ approval_id: '' }, /approval identity/],
      [{ approver: '' }, /approver identity/],
      [{ approver: 'other' }, /authenticated/],
      [{ operation_hash: '' }, /operation fields/],
      [{ tenant: '' }, /operation fields/],
      [{ project: '' }, /operation fields/],
      [{ operation_hash: 'b'.repeat(64) }, /binding/],
      [{ approved_at: 'bad' }, /expiry/],
      [{ approved_at: new Date(Date.now() + 120_000).toISOString() }, /expiry/],
      [{ approved_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1_000).toISOString() }, /expiry/],
      [{ expires_at: new Date(Date.now() - 2_000).toISOString() }, /expiry/],
      [{ evidence_digest: '' }, /digest format/],
      [{ evidence_digest: 'b'.repeat(64) }, /digest is invalid/],
    ];
    for (const [overrides, pattern] of cases) {
      const candidate = await pendingWriteWorkflow();
      const valid = receipt('governed-write-approval');
      const malformed = Object.assign({}, valid, overrides);
      if (!Object.hasOwn(overrides, 'evidence_digest')) {
        const { evidence_digest: _discarded, ...unsigned } = malformed;
        malformed.evidence_digest = computeEdictumWorkflowApprovalEvidenceDigest(unsigned);
      }
      await expect(candidate.approve(malformed)).rejects.toThrow(pattern);
    }
  });

  test('approval consumption retries failed application and rejects replay', async () => {
    const candidate = await pendingWriteWorkflow();
    const wrongStage = receipt('wrong-stage', { approval_id: 'retryable-approval' });
    await expect(candidate.approve(wrongStage)).rejects.toThrow(/not pending/);
    const retried = receipt('governed-write-approval', { approval_id: 'retryable-approval' });
    await expect(candidate.approve(retried)).resolves.toBeUndefined();
    await expect(candidate.approve(retried)).rejects.toThrow(/replay/);
  });

  test('write result normalization accepts optional evidence and rejects wrong accepted type', async () => {
    const candidate = workflow();
    await expect(candidate.recordResult('read-evidence', 'runtime.read')).resolves.toEqual([]);
    await expect(candidate.recordResult('read-evidence', 'runtime.read', {}, null)).resolves.toEqual([]);
    await expect(candidate.recordResult('governed-write', 'runtime.write', operation, {})).resolves.toEqual([]);
    expect(() => candidate.recordResult('governed-write', 'runtime.write', operation, { accepted: 'yes' })).toThrow(
      /boolean/,
    );
  });

  test('result evidence is accepted only for a configured stage and one of its tools', async () => {
    const candidate = workflow();
    expect(() => candidate.recordResult('unknown-stage', 'runtime.read')).toThrow(/stage is not configured/);
    expect(() => candidate.recordResult('read-evidence', 'runtime.write', operation)).toThrow(
      /tool is not configured for the stage/,
    );
    await expect(candidate.state()).resolves.toMatchObject({
      activeStage: 'read-evidence',
      evidence: { mcpResults: {} },
    });
  });

  test.skipIf(!nativeNoFollowAvailable)(
    'file workflow capability persists approval consumption and replay fencing',
    async () => {
      const storeId = 'quality-file-' + randomUUID();
      const corruptStoreId = 'corrupt-' + randomUUID();
      const storeRoot = path.join(repositoryRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
      const corruptRoot = path.join(repositoryRoot, '.agent', 'work', 'runtime-workflow-approvals', corruptStoreId);
      try {
        const raceStoreId = 'race-' + randomUUID();
        const raceRoot = path.join(repositoryRoot, '.agent', 'work', 'runtime-workflow-approvals', raceStoreId);
        try {
          const [first, second] = await Promise.all([
            createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', raceStoreId),
            createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', raceStoreId),
          ]);
          expect(first).toBeDefined();
          expect(second).toBeDefined();
        } finally {
          rmSync(raceRoot, { recursive: true, force: true });
        }
        sessionSequence += 1;
        const approvalId = 'durable-' + sessionSequence;
        const approval = receipt('governed-write-approval', { approval_id: approvalId });
        const host = await createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', storeId);
        const candidate = createConfiguredEdictumWorkflow(repositoryRoot, 'durable-' + sessionSequence, host);
        expect((await candidate.evaluate('runtime.write', operation)).action).toBe('pending_approval');
        await expect(candidate.approve(receipt('wrong-stage', { approval_id: approvalId }))).rejects.toThrow(
          /not pending/,
        );
        await candidate.approve(approval);

        const reloadedHost = await createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', storeId);
        const reloaded = createConfiguredEdictumWorkflow(
          repositoryRoot,
          'durable-reload-' + sessionSequence,
          reloadedHost,
        );
        expect((await reloaded.evaluate('runtime.write', operation)).action).toBe('pending_approval');
        await expect(reloaded.approve(approval)).rejects.toThrow(/replay/);
        await expect(createFileWorkflowHostCapability(repositoryRoot, '', storeId)).rejects.toThrow(
          /principal|invalid/,
        );
        await expect(
          createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', 'bad/id'),
        ).rejects.toThrow(/store id/);

        mkdirSync(corruptRoot, { recursive: true });
        writeFileSync(path.join(corruptRoot, '.identity.json'), '{', 'utf8');
        await expect(
          createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', corruptStoreId),
        ).rejects.toThrow(/identity|JSON|parse/i);
      } finally {
        rmSync(storeRoot, { recursive: true, force: true });
        rmSync(corruptRoot, { recursive: true, force: true });
      }
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'durable workflow consumption records commit-unknown and fences replay',
    async () => {
      const storeId = 'commit-unknown-' + randomUUID();
      const storeRoot = path.join(repositoryRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
      let beforeCommitCalls = 0;
      try {
        const host = await createTestFileWorkflowHostCapability(
          repositoryRoot,
          'human:workflow-reviewer',
          storeId,
          () => {
            beforeCommitCalls += 1;
            if (beforeCommitCalls === 1) throw new Error('injected final commit failure');
          },
        );
        const candidate = createConfiguredEdictumWorkflow(repositoryRoot, 'commit-unknown-' + sessionSequence, host);
        sessionSequence += 1;
        const approval = receipt('governed-write-approval', { approval_id: 'commit-unknown-' + sessionSequence });
        expect((await candidate.evaluate('runtime.write', operation)).action).toBe('pending_approval');
        await expect(candidate.approve(approval)).rejects.toMatchObject({
          code: 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001',
        });
        expect(beforeCommitCalls).toBe(1);
        const markerRecords = readdirSync(storeRoot)
          .filter((name) => name.endsWith('.json') || name.endsWith('.commit-unknown'))
          .map((name) => JSON.parse(readFileSync(path.join(storeRoot, name), 'utf8')));
        expect(markerRecords.some((record) => record.status === 'commit_unknown')).toBe(true);
        await expect(candidate.approve(approval)).rejects.toThrow(/not pending|receipt replay/);
        const restarted = createConfiguredEdictumWorkflow(
          repositoryRoot,
          'commit-unknown-restarted-' + sessionSequence,
          host,
        );
        expect((await restarted.evaluate('runtime.write', operation)).action).toBe('pending_approval');
        await expect(restarted.approve(approval)).rejects.toMatchObject({
          code: 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001',
        });
        expect(beforeCommitCalls).toBe(1);
      } finally {
        rmSync(storeRoot, { recursive: true, force: true });
      }
    },
  );
  test('workflow proof composition is failure-atomic and single-use after success', async () => {
    const storeId = 'proof-once-' + randomUUID();
    const storeRoot = path.join(repositoryRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
    const proof = createWorkflowHostAuthenticationProofForCompositionRoot(
      repositoryRoot,
      'human:workflow-reviewer',
      storeId,
    );
    try {
      mkdirSync(storeRoot, { recursive: true });
      const identityPath = path.join(storeRoot, '.identity.json');
      writeFileSync(identityPath, '{', 'utf8');
      await expect(createFileWorkflowHostCapabilityWithProof(proof)).rejects.toThrow(/identity|JSON|parse/i);
      rmSync(identityPath, { force: true });
      await expect(createFileWorkflowHostCapabilityWithProof(proof)).resolves.toBeDefined();
      await expect(createFileWorkflowHostCapabilityWithProof(proof)).rejects.toThrow(/authentication proof/);
    } finally {
      rmSync(storeRoot, { recursive: true, force: true });
    }
  });
});
