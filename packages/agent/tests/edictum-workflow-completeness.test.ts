import { afterAll, describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initializeProject } from '../bin/init.ts';
import { loadRuntimeConfig, type AgentRuntimeConfig } from '../src/config/runtime-config.js';
import { runtimeConfigurationSourceFor } from '../src/config/project-paths.js';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  createConfiguredEdictumWorkflow,
  createFileWorkflowHostCapability,
  createFileWorkflowHostCapabilityWithProof,
  createTestFileWorkflowHostCapability,
  createTestWorkflowHostCapability,
  createWorkflowHostAuthenticationProofForCompositionRoot,
  type ConfiguredEdictumWorkflow,
  type EdictumWorkflowApprovalReceipt,
  type EdictumWorkflowApprovalReceiptInput,
  type WorkflowApprovalBinding,
  type WorkflowHostCapability,
} from '../src/governance/edictum-boundary.js';
import { nativeNoFollowAvailable } from '../src/config/host-capability.js';
const repositoryRoot = await createInitializedFixture();
let sessionSequence = 0;

function workflow(root = repositoryRoot, principal = 'human:workflow-reviewer'): ConfiguredEdictumWorkflow {
  sessionSequence += 1;
  const host = createTestWorkflowHostCapability(root, principal);
  return createConfiguredEdictumWorkflow(root, `quality-${sessionSequence}`, host);
}

function operationFor(root: string): Readonly<{ operation_hash: string; tenant: string; project: string }> {
  const config = loadRuntimeConfig(root);
  const provider = config.integrations.providers[0];
  if (provider === undefined) throw new Error('initialized workflow fixture requires a configured provider');
  return Object.freeze({ operation_hash: 'a'.repeat(64), tenant: provider.tenant_id, project: provider.project_id });
}

const operation = operationFor(repositoryRoot);

function configurationPath(root: string): string {
  return path.join(root, runtimeConfigurationSourceFor(loadRuntimeConfig(root)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isApprovalInput(value: Record<string, unknown>): value is EdictumWorkflowApprovalReceiptInput {
  return (
    value.schema === 'EdictumWorkflowApproval/v1' &&
    typeof value.stage_id === 'string' &&
    typeof value.approval_id === 'string' &&
    typeof value.approver === 'string' &&
    typeof value.operation_hash === 'string' &&
    typeof value.tenant === 'string' &&
    typeof value.project === 'string' &&
    typeof value.approved_at === 'string' &&
    typeof value.expires_at === 'string'
  );
}

function receipt(
  stageId: string,
  overrides: Partial<EdictumWorkflowApprovalReceiptInput> = {},
  root = repositoryRoot,
): EdictumWorkflowApprovalReceipt {
  const unsigned: EdictumWorkflowApprovalReceiptInput = {
    schema: 'EdictumWorkflowApproval/v1',
    stage_id: stageId,
    approval_id: `approval-${sessionSequence}`,
    approver: 'human:workflow-reviewer',
    ...operationFor(root),
    approved_at: new Date(Date.now() - 1_000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
  return {
    ...unsigned,
    evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned),
  };
}

async function pendingWriteWorkflow(root = repositoryRoot): Promise<ConfiguredEdictumWorkflow> {
  const candidate = workflow(root);
  expect((await candidate.evaluate('runtime.write', operationFor(root))).action).toBe('pending_approval');
  return candidate;
}

function invokeUnknown(target: (...args: never[]) => unknown, receiver: unknown, args: readonly unknown[]): unknown {
  return Reflect.apply(target, receiver, args);
}

async function createInitializedFixture(): Promise<string> {
  const root = mkdtempSync(path.join(tmpdir(), 'edictum-workflow-'));
  try {
    mkdirSync(path.join(root, '.git'));
    await initializeProject({ projectRoot: root, repository: 'workflow-fixture', projectMappings: ['workflow=.'] });
    const config: AgentRuntimeConfig = loadRuntimeConfig(root);
    if (config.projects.length !== 1 || config.projects[0]?.project_id !== 'workflow')
      throw new Error('initialized workflow fixture did not retain its selected project');
    if (runtimeConfigurationSourceFor(config) !== 'agent-runtime.config.v1.yaml')
      throw new Error('initialized workflow fixture did not use its current loaded configuration source');
    return root;
  } catch (error: unknown) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

afterAll(() => rmSync(repositoryRoot, { recursive: true, force: true }));

describe('configured Edictum workflow completeness', () => {
  test('valid workflow advances through both approvals and result stages', async () => {
    const candidate = workflow();
    expect(candidate.approval_authority).toBe('workflow-gate-only');
    expect(candidate.config_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(candidate.definition.stages).toHaveLength(5);
    expect((await candidate.evaluate('runtime.read')).action).toBe('allow');
    await Promise.resolve(expect(candidate.recordResult('read-evidence', 'runtime.read')).resolves.toEqual([]));
    expect((await candidate.evaluate('runtime.write', operation)).action).toBe('pending_approval');

    await candidate.approve(receipt('governed-write-approval'));
    expect((await candidate.evaluate('runtime.write', operation)).action).toBe('allow');
    await Promise.resolve(
      expect(candidate.recordResult('governed-write', 'runtime.write', operation, { accepted: true })).resolves.toEqual(
        [],
      ),
    );
    expect((await candidate.evaluate('delivery.execute')).action).toBe('pending_approval');
    await candidate.approve(receipt('delivery-approval', { approval_id: 'delivery-approval' }));
    expect((await candidate.evaluate('delivery.execute')).action).toBe('allow');
    await Promise.resolve(
      expect(candidate.recordResult('delivery', 'delivery.execute', {}, { delivered: true })).resolves.toEqual([]),
    );
    await Promise.resolve(expect(candidate.assertRequiredStageEvidence()).resolves.toBeUndefined());
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
    const failure: unknown = await incomplete
      .recordResult('delivery', 'delivery.execute', {}, { delivered: true })
      .then(
        () => undefined,
        (error: unknown) => error,
      );
    expect(failure).toBeInstanceOf(Error);
    if (!(failure instanceof Error)) throw new Error('missing-stage completion did not reject with an Error');
    expect(failure.message).toMatch(/GAP-RTNEW-EDICTUM-EVIDENCE-001.*read-evidence/);

    const complete = workflow();
    await complete.evaluate('runtime.read');
    await complete.recordResult('read-evidence', 'runtime.read');
    await complete.evaluate('runtime.write', operation);
    await complete.approve(receipt('governed-write-approval', { approval_id: 'complete-write-approval' }));
    await complete.recordResult('governed-write', 'runtime.write', operation, { accepted: true });
    await complete.evaluate('delivery.execute');
    await complete.approve(receipt('delivery-approval', { approval_id: 'complete-delivery-approval' }));
    await Promise.resolve(
      expect(complete.recordResult('delivery', 'delivery.execute', {}, { delivered: true })).resolves.toEqual([]),
    );
  });

  test('the configured required stage list changes terminal acceptance behavior', async () => {
    const root = await createInitializedFixture();
    try {
      const configPath = configurationPath(root);
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
      await candidate.evaluate('runtime.write', operationFor(root));
      await candidate.approve(receipt('governed-write-approval', { approval_id: 'configured-write-approval' }, root));
      await candidate.recordResult('governed-write', 'runtime.write', operationFor(root), { accepted: true });
      await candidate.evaluate('delivery.execute');
      await candidate.approve(receipt('delivery-approval', { approval_id: 'configured-delivery-approval' }, root));
      await Promise.resolve(
        expect(candidate.recordResult('delivery', 'delivery.execute', {}, { delivered: true })).resolves.toEqual([]),
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
    expect(
      () => void Reflect.apply(createConfiguredEdictumWorkflow, undefined, [repositoryRoot, 'untrusted', {}]),
    ).toThrow(/trusted/);
    const otherRoot = await createInitializedFixture();
    try {
      const otherHost = createTestWorkflowHostCapability(otherRoot);
      expect(() => createConfiguredEdictumWorkflow(repositoryRoot, 'wrong-root', otherHost)).toThrow(/root mismatch/);
    } finally {
      rmSync(otherRoot, { recursive: true, force: true });
    }
    const forgedHost: WorkflowHostCapability = {
      schema: 'WorkflowHostCapability/v1',
      authenticatedPrincipal: 'human:forged',
      repositoryRoot,
      storeId: 'forged-store',
      consumeApproval: async (_binding: WorkflowApprovalBinding, apply: () => Promise<void>) => apply(),
    };
    expect(() => createConfiguredEdictumWorkflow(repositoryRoot, 'forged', forgedHost)).toThrow(/host-issued|opaque/);
    for (const storeId of ['.', '..', '../escape']) {
      expect(() =>
        createWorkflowHostAuthenticationProofForCompositionRoot(repositoryRoot, 'human:workflow-reviewer', storeId),
      ).toThrow(/store id/);
    }
    const registryKey = Symbol.for('agent-runtime-new.edictum.workflow-host-capability-registry.v1');
    const previousRegistry: unknown = Reflect.get(globalThis, registryKey);
    Reflect.set(globalThis, registryKey, { issued: new WeakSet(), bindings: new WeakMap() });
    try {
      expect(() => createConfiguredEdictumWorkflow(repositoryRoot, 'global-poison', forgedHost)).toThrow(
        /host-issued|opaque/,
      );
    } finally {
      if (previousRegistry === undefined) Reflect.deleteProperty(globalThis, registryKey);
      else Reflect.set(globalThis, registryKey, previousRegistry);
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
    const root = await createInitializedFixture();
    try {
      const host = createTestWorkflowHostCapability(root);
      const candidate = createConfiguredEdictumWorkflow(root, 'configuration-drift', host);
      const configPath = configurationPath(root);
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
    const root = await createInitializedFixture();
    try {
      const configPath = configurationPath(root);
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
      await Promise.resolve(
        expect(candidate.evaluate('runtime.read')).rejects.toThrow(/configuration changed after composition/),
      );

      restoreConfig();
      const approvalCandidate = createConfiguredEdictumWorkflow(root, 'async-approval-drift', host);
      await Promise.resolve(
        expect(approvalCandidate.evaluate('runtime.write', operationFor(root))).resolves.toMatchObject({
          action: 'pending_approval',
        }),
      );
      const originalRecordApproval = approvalCandidate.runtime.recordApproval.bind(approvalCandidate.runtime);
      approvalCandidate.runtime.recordApproval = async (...args) => {
        const result = await originalRecordApproval(...args);
        mutateConfig();
        return result;
      };
      await Promise.resolve(
        expect(
          approvalCandidate.approve(receipt('governed-write-approval', { approval_id: 'async-approval' }, root)),
        ).rejects.toThrow(/configuration changed after composition/),
      );
      const state = await approvalCandidate.runtime.state(approvalCandidate.session);
      expect(state.pendingApproval?.stageId).toBe('governed-write-approval');
      expect(state.approvals).toEqual({});
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test('approval receipt shape, identity, binding, expiry, and digest are enforced', async () => {
    await Promise.resolve(expect(workflow().approve(null)).rejects.toThrow(/plain object/));

    const symbolReceipt = receipt('governed-write-approval');
    Reflect.set(symbolReceipt, Symbol('hostile'), true);
    await Promise.resolve(expect(workflow().approve(symbolReceipt)).rejects.toThrow(/fields/));

    const accessorReceipt = receipt('governed-write-approval');
    Object.defineProperty(accessorReceipt, 'stage_id', { enumerable: true, get: () => 'governed-write-approval' });
    await Promise.resolve(expect(workflow().approve(accessorReceipt)).rejects.toThrow(/accessors/));

    for (const malformed of [
      { ...receipt('governed-write-approval'), extra: true },
      { ...receipt('governed-write-approval'), stage_id: 1 },
    ])
      await Promise.resolve(expect(workflow().approve(malformed)).rejects.toThrow(/fields|types/));

    const cases: readonly (readonly [Readonly<Record<string, unknown>>, RegExp])[] = [
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
      const malformed: Record<string, unknown> = Object.assign({}, valid, overrides);
      if (!Object.hasOwn(overrides, 'evidence_digest')) {
        const unsigned: Record<string, unknown> = { ...malformed };
        delete unsigned.evidence_digest;
        if (isApprovalInput(unsigned))
          malformed.evidence_digest = computeEdictumWorkflowApprovalEvidenceDigest(unsigned);
      }
      await Promise.resolve(expect(candidate.approve(malformed)).rejects.toThrow(pattern));
    }
  });

  test('approval consumption retries failed application and rejects replay', async () => {
    const candidate = await pendingWriteWorkflow();
    const wrongStage = receipt('wrong-stage', { approval_id: 'retryable-approval' });
    await Promise.resolve(expect(candidate.approve(wrongStage)).rejects.toThrow(/not pending/));
    const retried = receipt('governed-write-approval', { approval_id: 'retryable-approval' });
    await Promise.resolve(expect(candidate.approve(retried)).resolves.toBeUndefined());
    await Promise.resolve(expect(candidate.approve(retried)).rejects.toThrow(/replay/));
  });

  test('write result normalization accepts optional evidence and rejects wrong accepted type', async () => {
    const candidate = workflow();
    await Promise.resolve(expect(candidate.recordResult('read-evidence', 'runtime.read')).resolves.toEqual([]));
    const nullResult = Promise.resolve(
      invokeUnknown(candidate.recordResult, candidate, ['read-evidence', 'runtime.read', {}, null]),
    );
    await Promise.resolve(expect(nullResult).resolves.toEqual([]));
    await Promise.resolve(
      expect(candidate.recordResult('governed-write', 'runtime.write', operation, {})).resolves.toEqual([]),
    );
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
    await Promise.resolve(
      expect(candidate.state()).resolves.toMatchObject({
        activeStage: 'read-evidence',
        evidence: { mcpResults: {} },
      }),
    );
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
        await Promise.resolve(
          expect(candidate.approve(receipt('wrong-stage', { approval_id: approvalId }))).rejects.toThrow(/not pending/),
        );
        await candidate.approve(approval);

        const reloadedHost = await createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', storeId);
        const reloaded = createConfiguredEdictumWorkflow(
          repositoryRoot,
          'durable-reload-' + sessionSequence,
          reloadedHost,
        );
        expect((await reloaded.evaluate('runtime.write', operation)).action).toBe('pending_approval');
        await Promise.resolve(expect(reloaded.approve(approval)).rejects.toThrow(/replay/));
        await Promise.resolve(
          expect(createFileWorkflowHostCapability(repositoryRoot, '', storeId)).rejects.toThrow(/principal|invalid/),
        );
        await Promise.resolve(
          expect(createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', 'bad/id')).rejects.toThrow(
            /store id/,
          ),
        );

        mkdirSync(corruptRoot, { recursive: true });
        writeFileSync(path.join(corruptRoot, '.identity.json'), '{', 'utf8');
        await Promise.resolve(
          expect(
            createFileWorkflowHostCapability(repositoryRoot, 'human:workflow-reviewer', corruptStoreId),
          ).rejects.toThrow(/identity|JSON|parse/i),
        );
      } finally {
        rmSync(storeRoot, { recursive: true, force: true });
        rmSync(corruptRoot, { recursive: true, force: true });
      }
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'durable workflow consumption records commit-unknown and fences replay',
    async () => {
      const fixtureRoot = await createInitializedFixture();
      const storeId = 'commit-unknown-' + randomUUID();
      const storeRoot = path.join(fixtureRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
      let beforeCommitCalls = 0;
      try {
        const host = await createTestFileWorkflowHostCapability(fixtureRoot, 'human:workflow-reviewer', storeId, () => {
          beforeCommitCalls += 1;
          if (beforeCommitCalls === 1) throw new Error('injected final commit failure');
        });
        const candidate = createConfiguredEdictumWorkflow(fixtureRoot, 'commit-unknown-' + sessionSequence, host);
        sessionSequence += 1;
        const approval = receipt(
          'governed-write-approval',
          { approval_id: 'commit-unknown-' + sessionSequence },
          fixtureRoot,
        );
        expect((await candidate.evaluate('runtime.write', operationFor(fixtureRoot))).action).toBe('pending_approval');
        await Promise.resolve(
          expect(candidate.approve(approval)).rejects.toMatchObject({
            code: 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001',
          }),
        );
        expect(beforeCommitCalls).toBe(1);
        const markerRecords = readdirSync(storeRoot)
          .filter((name) => name.endsWith('.json') || name.endsWith('.commit-unknown'))
          .map((name): unknown => JSON.parse(readFileSync(path.join(storeRoot, name), 'utf8')))
          .filter(isRecord);
        expect(markerRecords.some((record) => record.status === 'commit_unknown')).toBe(true);
        await Promise.resolve(expect(candidate.approve(approval)).rejects.toThrow(/stage is not pending/));
        expect(beforeCommitCalls).toBe(1);
      } finally {
        process.stderr.write(`Retained UNKNOWN workflow fixture root: ${fixtureRoot}\n`);
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
      await Promise.resolve(
        expect(createFileWorkflowHostCapabilityWithProof(proof)).rejects.toThrow(/identity|JSON|parse/i),
      );
      rmSync(identityPath, { force: true });
      await Promise.resolve(expect(createFileWorkflowHostCapabilityWithProof(proof)).resolves.toBeDefined());
      await Promise.resolve(
        expect(createFileWorkflowHostCapabilityWithProof(proof)).rejects.toThrow(/authentication proof/),
      );
    } finally {
      rmSync(storeRoot, { recursive: true, force: true });
    }
  });
});
