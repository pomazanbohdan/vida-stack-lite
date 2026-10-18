import { afterAll, describe, expect, mock, onTestFinished, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initializeProject } from '../bin/init.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.js';
import { loadRuntimeConfig, runtimeConfigDigest, type AgentRuntimeConfig } from '../src/config/runtime-config.js';
import { runtimeConfigurationSourceFor, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.js';
import { HostStateStore, inspectHostWorkspaceDatabase, openHostStateDatabase } from '../src/host-state.js';
import { deriveWorkspaceId } from '../src/workspace-identity.js';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import { expectAsyncReturned } from './helpers/expect-rejection.ts';
import { PolicySession } from '../src/governance/operation-policy.js';
import { PolicyWorkflowRuntime, type WorkflowDefinition } from '../src/governance/policy-workflow.js';
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
import * as repositoryAccess from '../src/config/safe-repository-access.js';
const originalRepositoryAccess = Object.freeze({ ...repositoryAccess });
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

function emittedWorkflowMarker(
  storeRoot: string,
  binding: WorkflowApprovalBinding,
): Readonly<{ path: string; record: Record<string, unknown> }> {
  for (const name of readdirSync(storeRoot).filter((candidate) => candidate.endsWith('.json'))) {
    const markerPath = path.join(storeRoot, name);
    const value: unknown = JSON.parse(readFileSync(markerPath, 'utf8'));
    if (isRecord(value) && JSON.stringify(value.binding) === JSON.stringify(binding))
      return { path: markerPath, record: value };
  }
  throw new Error('expected workflow approval marker emitted for the requested binding');
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

async function createInitializedFixture(onCreated?: (root: string) => void): Promise<string> {
  const root = mkdtempSync(path.join(tmpdir(), 'edictum-workflow-'));
  try {
    onCreated?.(root);
    mkdirSync(path.join(root, '.git'));
    await initializeProject({ projectRoot: root, repository: 'workflow-fixture', projectMappings: ['workflow=.'] });
    const config: AgentRuntimeConfig = loadRuntimeConfig(root);
    if (config.projects.length !== 1 || config.projects[0]?.project_id !== 'workflow')
      throw new Error('initialized workflow fixture did not retain its selected project');
    if (runtimeConfigurationSourceFor(config) !== 'agent-runtime.config.v1.yaml')
      throw new Error('initialized workflow fixture did not use its current loaded configuration source');
    return root;
  } catch (error: unknown) {
    if (onCreated === undefined) rmSync(root, { recursive: true, force: true });
    throw error;
  }
}

afterAll(() => rmSync(repositoryRoot, { recursive: true, force: true }));

function terminalPolicyDefinition(
  tools: readonly string[],
  exit: WorkflowDefinition['stages'][number]['exit'],
): WorkflowDefinition {
  return {
    apiVersion: 'vida.agent/v1',
    kind: 'PolicyWorkflow',
    metadata: { name: 'direct-policy', description: 'Direct public policy boundary', version: '1' },
    stages: [
      { id: 'final', description: 'Final stage', tools, entry: [], checks: [], exit, approval: null, terminal: true },
    ],
  };
}

describe('configured Edictum workflow completeness', () => {
  test('zero-tool boundary retains exit evidence requirements', async () => {
    const definition = terminalPolicyDefinition(
      [],
      [{ condition: "result.accepted === 'true'", message: 'A successful result is required' }],
    );
    const candidate = new PolicyWorkflowRuntime(definition, 'exit-only-policy');
    const session = new PolicySession('exit-only-policy');
    const evaluation = await expectAsyncReturned(() =>
      candidate.evaluate(session, { toolName: 'runtime.any', args: {} }),
    );
    expect(evaluation).toMatchObject({
      action: 'block',
      reason: 'A successful result is required',
      stageId: 'final',
      records: [
        {
          passed: false,
          metadata: {
            gate_condition: "result.accepted === 'true'",
            gate_kind: 'mcp_result_matches',
            gate_evidence: '',
          },
        },
      ],
    });
    expect(evaluation.audit).not.toHaveProperty('lastRecordedEvidence');
    expect(await candidate.state(session)).toMatchObject({
      activeStage: 'final',
      completedStages: [],
      lastRecordedEvidence: null,
    });
  });

  test('zero-tool stage without a boundary admits arbitrary tools', async () => {
    const candidate = new PolicyWorkflowRuntime(terminalPolicyDefinition([], []), 'open-policy');
    const session = new PolicySession('open-policy');
    expect(
      await expectAsyncReturned(() => candidate.evaluate(session, { toolName: 'runtime.any', args: {} })),
    ).toMatchObject({
      action: 'allow',
      stageId: 'final',
      records: [{ passed: true, metadata: { gate_condition: 'tools', gate_evidence: 'runtime.any' } }],
    });
  });

  test('direct result validation rejects foreign inputs and retains an ungated terminal stage', async () => {
    const candidate = new PolicyWorkflowRuntime(terminalPolicyDefinition(['runtime.commit'], []), 'ungated-policy');
    const session = new PolicySession('ungated-policy');
    const call = { toolName: 'runtime.commit', args: {} };
    expect(() => candidate.recordResult(session, 'missing-stage', call)).toThrow(
      'workflow: unknown stage "missing-stage"',
    );
    expect(() => candidate.recordResult(session, 'final', { toolName: 'runtime.foreign', args: {} })).toThrow(
      'workflow result tool is not configured for stage',
    );
    expect(await expectAsyncReturned(() => candidate.recordResult(session, 'final', call))).toEqual([]);
    expect(await candidate.state(session)).toMatchObject({
      activeStage: 'final',
      completedStages: [],
      evidence: { mcpResults: {} },
    });
    expect(await candidate.recordedStages(session)).toEqual(['final']);
  });

  test('policy workflow rejects an empty public definition', () => {
    const definition: WorkflowDefinition = {
      apiVersion: 'vida.agent/v1',
      kind: 'PolicyWorkflow',
      metadata: { name: 'empty-policy', description: 'Empty policy boundary', version: '1' },
      stages: [],
    };

    expect(() => new PolicyWorkflowRuntime(definition, 'empty-policy-session')).toThrow(
      'governance workflow needs a stage',
    );
  });

  test('policy workflow gates, completes, rewinds, and replays terminal evidence', async () => {
    const definition: WorkflowDefinition = {
      apiVersion: 'vida.agent/v1',
      kind: 'PolicyWorkflow',
      metadata: { name: 'terminal-policy', description: 'Terminal evidence policy', version: '1' },
      stages: [
        {
          id: 'commit',
          description: 'Approve and record a governed commit',
          tools: ['runtime.commit'],
          entry: [],
          checks: [],
          exit: [{ condition: "result.accepted === 'true'", message: 'A successful commit result is required' }],
          approval: { message: 'Commit approval is required' },
          terminal: true,
        },
      ],
    };
    const candidate = new PolicyWorkflowRuntime(definition, 'terminal-policy-session');
    const session = new PolicySession('terminal-policy-session');
    const unrelatedCall = { toolName: 'runtime.deploy', args: {} };
    const commitCall = { toolName: 'runtime.commit', args: {} };

    expect(() => candidate.state(new PolicySession('foreign-session'))).toThrow(/session binding differs/);
    expect(await candidate.state(session)).toMatchObject({ activeStage: 'commit', completedStages: [] });

    const missingEvidence = await candidate.evaluate(session, unrelatedCall);
    expect(missingEvidence).toMatchObject({
      action: 'block',
      reason: 'A successful commit result is required',
      records: [{ passed: false, metadata: { gate_kind: 'mcp_result_matches' } }],
    });

    expect(await candidate.recordResult(session, 'commit', commitCall, { accepted: 'true' })).toEqual([]);
    expect(await candidate.evaluate(session, unrelatedCall)).toMatchObject({
      action: 'pending_approval',
      reason: 'Commit approval is required',
      records: [{ metadata: { approval_requested_for: 'commit' } }],
    });
    await candidate.recordApproval(session, 'commit');

    expect(await candidate.evaluate(session, unrelatedCall)).toMatchObject({
      action: 'block',
      reason: 'Tool is not allowed in this workflow stage',
    });
    expect(await candidate.evaluate(session, commitCall)).toMatchObject({ action: 'allow', stageId: 'commit' });

    expect(await candidate.recordResult(session, 'commit', commitCall, { accepted: 'true' })).toMatchObject([
      { action: 'workflow_completed', workflow: { activeStage: '', completedStages: ['commit'] } },
    ]);
    expect(await candidate.evaluate(session, unrelatedCall)).toMatchObject({ action: 'allow', stageId: '' });

    await candidate.reset(session, 'commit');
    expect(await candidate.state(session)).toMatchObject({
      activeStage: 'commit',
      completedStages: [],
      approvals: {},
      evidence: { mcpResults: {} },
    });
    expect(await candidate.evaluate(session, unrelatedCall)).toMatchObject({ action: 'block' });

    expect(await candidate.recordResult(session, 'commit', commitCall, { accepted: 'true' })).toEqual([]);
    expect(await candidate.evaluate(session, unrelatedCall)).toMatchObject({ action: 'pending_approval' });
    await candidate.recordApproval(session, 'commit');
    expect(await candidate.recordResult(session, 'commit', commitCall, { accepted: 'true' })).toMatchObject([
      { action: 'workflow_completed', workflow: { activeStage: '', completedStages: ['commit'] } },
    ]);
  });

  test('direct workflow controls preserve gate decisions and clear only rewound evidence', async () => {
    const candidate = workflow();
    const writeStage = candidate.definition.stages.find((stage) => stage.id === 'governed-write');
    const readStage = candidate.definition.stages.find((stage) => stage.id === 'read-evidence');
    if (!writeStage || !readStage) throw new Error('configured workflow omitted a required evidence stage');
    const writeCall = { toolName: 'runtime.write', args: operation };

    await candidate.runtime.setStage(candidate.session, readStage.id);
    await candidate.runtime.recordResult(
      candidate.session,
      readStage.id,
      { toolName: 'runtime.read', args: {} },
      {
        accepted: 'true',
        source: 'before-write-rewind',
      },
    );
    await candidate.runtime.setStage(candidate.session, writeStage.id);
    await candidate.runtime.recordApproval(candidate.session, 'governed-write-approval');
    await candidate.runtime.recordResult(candidate.session, writeStage.id, writeCall, { accepted: 'true' });
    const acceptedState = await candidate.runtime.state(candidate.session);
    expect(acceptedState.evidence.mcpResults['runtime.write']).toEqual([{ accepted: 'true' }]);
    expect(
      await candidate.runtime.evaluateWorkflowGates(writeStage, acceptedState, writeCall, writeStage.exit),
    ).toMatchObject({ blocked: false, evaluation: { action: 'allow' } });
    await Promise.resolve(
      expect(candidate.runtime.evaluateWorkflowGates(writeStage, acceptedState, writeCall, [])).rejects.toThrow(
        /unsupported governance gates/,
      ),
    );

    await candidate.runtime.reset(candidate.session, writeStage.id);
    const rewoundWriteState = await candidate.runtime.state(candidate.session);
    expect(rewoundWriteState.evidence.mcpResults).not.toHaveProperty('runtime.write');
    expect(rewoundWriteState.evidence.mcpResults['runtime.read']).toEqual([
      { accepted: 'true', source: 'before-write-rewind' },
    ]);
    expect(rewoundWriteState.evidence.stageCalls).toEqual({});
    expect(rewoundWriteState.approvals).toHaveProperty('governed-write-approval', 'approved');

    await candidate.runtime.setStage(candidate.session, readStage.id);
    await candidate.runtime.recordResult(
      candidate.session,
      readStage.id,
      { toolName: 'runtime.read', args: {} },
      {
        accepted: 'true',
        source: 'after-write-rewind',
      },
    );
    expect((await candidate.runtime.state(candidate.session)).evidence.mcpResults['runtime.read']).toEqual([
      { accepted: 'true', source: 'before-write-rewind' },
      { accepted: 'true', source: 'after-write-rewind' },
    ]);
    await candidate.runtime.reset(candidate.session, readStage.id);
    const rewoundReadState = await candidate.runtime.state(candidate.session);
    expect(rewoundReadState.evidence.mcpResults).toEqual({});
    expect(rewoundReadState.approvals).toEqual({});
  });

  test('valid workflow advances through both approvals and result stages', async () => {
    const candidate = workflow();
    expect(candidate.approval_authority).toBe('workflow-gate-only');
    expect(candidate.config_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(candidate.definition.stages).toHaveLength(5);
    expect((await candidate.evaluate('runtime.read')).action).toBe('allow');
    expect(await expectAsyncReturned(() => candidate.recordResult('read-evidence', 'runtime.read'))).toEqual([]);
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
    await expectAsyncReturned(() => complete.recordResult('read-evidence', 'runtime.read'));
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
  test.skipIf(!nativeNoFollowAvailable)(
    'test workflow host issuer omits configuration binding on an unconfigured real root',
    async () => {
      const caseDeadline = performance.now() + 5_000;
      let fixtureRoot: string | undefined;
      let bodyFailed = false;
      let bodyError: unknown;
      let bodyPassed = false;
      try {
        fixtureRoot = mkdtempSync(path.join(tmpdir(), 'edictum-workflow-configless-'));
        expect(readdirSync(fixtureRoot)).toEqual([]);
        const host = createTestWorkflowHostCapability(fixtureRoot);
        expect(host).toMatchObject({
          authenticatedPrincipal: 'human:workflow-reviewer',
          repositoryRoot: fixtureRoot,
          storeId: 'test-workflow',
        });
        expect(Object.hasOwn(host, 'configDigest')).toBe(false);

        const binding: WorkflowApprovalBinding = {
          stage_id: 'governed-write-approval',
          approval_id: 'configless-' + randomUUID(),
          operation_hash: 'a'.repeat(64),
          tenant: 'test-tenant',
          project: 'test-project',
        };
        let callbackCalls = 0;
        await host.consumeApproval(binding, async () => {
          callbackCalls += 1;
        });
        expect(callbackCalls).toBe(1);
        await Promise.resolve(
          expect(
            host.consumeApproval(binding, async () => {
              callbackCalls += 1;
            }),
          ).rejects.toThrow(/replay/),
        );
        expect(callbackCalls).toBe(1);
        bodyPassed = true;
      } catch (error: unknown) {
        bodyFailed = true;
        bodyError = error;
      }

      try {
        completeOwnedCleanup(
          [
            () => {
              if (!bodyPassed || fixtureRoot === undefined || performance.now() >= caseDeadline) {
                if (fixtureRoot !== undefined)
                  console.error('Retained failed or expired configless workflow fixture root: ' + fixtureRoot);
                return undefined;
              }
              rmSync(fixtureRoot, { recursive: true, force: true });
              return undefined;
            },
          ],
          bodyFailed ? { error: bodyError } : undefined,
        );
      } catch (cleanupError: unknown) {
        if (fixtureRoot !== undefined)
          console.error('Retained configless workflow fixture after cleanup failure: ' + fixtureRoot);
        throw cleanupError;
      }
      if (bodyFailed) throw bodyError;
    },
  );
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
    expect(await expectAsyncReturned(() => candidate.recordResult('read-evidence', 'runtime.read'))).toEqual([]);
    expect(
      await expectAsyncReturned(async () =>
        invokeUnknown(candidate.recordResult, candidate, ['read-evidence', 'runtime.read', {}, null]),
      ),
    ).toEqual([]);
    expect(
      await expectAsyncReturned(() => candidate.recordResult('governed-write', 'runtime.write', operation, {})),
    ).toEqual([]);
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
  for (const identityState of ['matching', 'foreign'] as const)
    test.skipIf(!nativeNoFollowAvailable)(
      `file workflow host checks a ${identityState} store identity after a real peer exclusive write`,
      async () => {
        let fixtureRoot: string | undefined;
        let bodyFailed = false;
        let bodyError: unknown;
        let bodyPassed = false;
        let restoreFailed = false;
        let restoreError: unknown;
        const safeAccessSpecifier = '../src/config/safe-repository-access.ts';
        try {
          fixtureRoot = await createInitializedFixture((created) => {
            fixtureRoot = created;
          });
          const storeId = 'identity-peer-' + randomUUID();
          const principal = 'human:identity-peer-reviewer';
          const identityPath = path.join(
            fixtureRoot,
            '.agent',
            'work',
            'runtime-workflow-approvals',
            storeId,
            '.identity.json',
          );
          let armed = true;
          let intercepted = 0;
          let peerCapability: WorkflowHostCapability | undefined;
          let createPeer: (() => Promise<WorkflowHostCapability>) | undefined;
          let peerIdentityBytes: string | undefined;
          let nativeCollision: unknown;

          await mock.module(safeAccessSpecifier, () => ({
            ...originalRepositoryAccess,
            requireSafeRepositoryAccess: (...args: Parameters<typeof repositoryAccess.requireSafeRepositoryAccess>) => {
              const access = originalRepositoryAccess.requireSafeRepositoryAccess(...args);
              if (path.resolve(args[0]) !== path.resolve(fixtureRoot!)) return access;
              const originalWrite = access.writeExclusiveAsync;
              return {
                ...access,
                writeExclusiveAsync: async (...writeArgs: Parameters<typeof access.writeExclusiveAsync>) => {
                  if (!armed || path.resolve(writeArgs[0]) !== identityPath) return originalWrite(...writeArgs);
                  armed = false;
                  intercepted += 1;
                  if (createPeer === undefined) throw new Error('peer workflow host factory was not prepared');
                  peerCapability = await createPeer();
                  peerIdentityBytes = readFileSync(identityPath, 'utf8');
                  if (identityState === 'foreign') {
                    const foreign: unknown = JSON.parse(peerIdentityBytes);
                    if (!isRecord(foreign)) throw new Error('peer identity is not a record');
                    foreign.store_id = 'foreign-store';
                    // Simulate an actor replacing the identity in the observed create gap.
                    await access.replaceAtomicAsync(
                      identityPath,
                      createHash('sha256').update(peerIdentityBytes).digest('hex'),
                      JSON.stringify(foreign),
                      'foreign identity fixture',
                    );
                    peerIdentityBytes = readFileSync(identityPath, 'utf8');
                  }
                  try {
                    return await originalWrite(...writeArgs);
                  } catch (error: unknown) {
                    nativeCollision = error;
                    throw error;
                  }
                },
              };
            },
          }));

          createPeer = () => createFileWorkflowHostCapability(fixtureRoot!, principal, storeId);
          let subjectCapability: WorkflowHostCapability | undefined;
          let subjectFailure: unknown;
          try {
            subjectCapability = await createFileWorkflowHostCapability(fixtureRoot, principal, storeId);
          } catch (error) {
            subjectFailure = error;
          }

          expect(intercepted).toBe(1);
          expect(armed).toBe(false);
          expect(peerCapability).toBeDefined();
          expect(nativeCollision).toMatchObject({ code: 'EEXIST' });
          expect(peerIdentityBytes).toBeDefined();
          if (peerCapability === undefined || peerIdentityBytes === undefined)
            throw new Error('peer identity collision control did not capture its actual identity');
          const identityAfterSubject = readFileSync(identityPath, 'utf8');
          expect(identityAfterSubject).toBe(peerIdentityBytes);
          const identity: unknown = JSON.parse(identityAfterSubject);
          expect(identity).toMatchObject({
            schema: 'EdictumWorkflowApprovalStoreIdentity/v1',
            repository_root: path.resolve(fixtureRoot),
            store_id: identityState === 'foreign' ? 'foreign-store' : storeId,
          });
          if (identityState === 'foreign') {
            expect(subjectCapability).toBeUndefined();
            expect(subjectFailure).toBe(nativeCollision);
            expect(subjectFailure).toBeInstanceOf(Error);
            bodyPassed = true;
            return;
          }
          expect(subjectFailure).toBeUndefined();
          if (subjectCapability === undefined) throw new Error('matching peer identity was not adopted');
          const binding: WorkflowApprovalBinding = {
            stage_id: 'identity-peer-stage',
            approval_id: 'identity-peer-' + randomUUID(),
            operation_hash: 'a'.repeat(64),
            tenant: 'identity-peer-tenant',
            project: 'identity-peer-project',
          };
          let peerApplyCalls = 0;
          await peerCapability.consumeApproval(binding, async () => {
            peerApplyCalls += 1;
          });
          expect(peerApplyCalls).toBe(1);
          let subjectReplayApplyCalls = 0;
          const replayFailure: unknown = await subjectCapability
            .consumeApproval(binding, async () => {
              subjectReplayApplyCalls += 1;
            })
            .then(
              () => undefined,
              (error: unknown) => error,
            );
          expect(replayFailure).toBeInstanceOf(Error);
          if (!(replayFailure instanceof Error)) throw new Error('shared identity generation did not reject replay');
          expect(replayFailure.message).toMatch(/replay/);
          expect(subjectReplayApplyCalls).toBe(0);
          bodyPassed = true;
        } catch (error: unknown) {
          bodyFailed = true;
          bodyError = error;
        } finally {
          try {
            await mock.module(safeAccessSpecifier, () => originalRepositoryAccess);
            const restored = (await import(
              safeAccessSpecifier
            )) as typeof import('../src/config/safe-repository-access.ts');
            expect(restored.requireSafeRepositoryAccess).toBe(originalRepositoryAccess.requireSafeRepositoryAccess);
          } catch (error: unknown) {
            restoreFailed = true;
            restoreError = error;
          }
          completeOwnedCleanup(
            [
              () => {
                if (restoreFailed) throw restoreError;
                return undefined;
              },
              () => {
                if (!bodyPassed || restoreFailed || fixtureRoot === undefined) {
                  if (fixtureRoot !== undefined)
                    process.stderr.write(`Retained failed identity-peer workflow fixture root: ${fixtureRoot}\n`);
                  return undefined;
                }
                rmSync(fixtureRoot, { recursive: true, force: true });
                return undefined;
              },
            ],
            bodyFailed ? { error: bodyError } : undefined,
          );
        }
        if (bodyFailed) throw bodyError;
      },
    );
  test.skipIf(!nativeNoFollowAvailable)(
    'file workflow aborts a failed application, retries the same binding, then denies replay',
    async () => {
      const caseDeadline = performance.now() + 5_000;
      let fixtureRoot: string | undefined;
      let bodyFailed = false;
      let bodyError: unknown;
      let bodyPassed = false;
      try {
        fixtureRoot = await createInitializedFixture((created) => {
          fixtureRoot = created;
        });
        const storeId = 'abort-retry-' + randomUUID();
        const storeRoot = path.join(fixtureRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
        const host = await createTestFileWorkflowHostCapability(fixtureRoot, 'human:workflow-reviewer', storeId);
        sessionSequence += 1;
        const candidate = createConfiguredEdictumWorkflow(fixtureRoot, 'abort-retry-' + sessionSequence, host);
        const operationBinding = operationFor(fixtureRoot);
        const approval = receipt(
          'governed-write-approval',
          { approval_id: 'abort-retry-' + sessionSequence },
          fixtureRoot,
        );
        const binding: WorkflowApprovalBinding = {
          stage_id: approval.stage_id,
          approval_id: approval.approval_id,
          ...operationBinding,
        };
        expect((await candidate.evaluate('runtime.write', operationBinding)).action).toBe('pending_approval');

        const originalRecordApproval = candidate.runtime.recordApproval.bind(candidate.runtime);
        const applicationError = new Error('injected workflow approval application failure');
        let applicationCalls = 0;
        candidate.runtime.recordApproval = async (...args) => {
          applicationCalls += 1;
          if (applicationCalls === 1) throw applicationError;
          return originalRecordApproval(...args);
        };
        try {
          await Promise.resolve(expect(candidate.approve(approval)).rejects.toBe(applicationError));
        } finally {
          candidate.runtime.recordApproval = originalRecordApproval;
        }
        const aborted = emittedWorkflowMarker(storeRoot, binding);
        expect(aborted.record.status).toBe('aborted');
        expect(applicationCalls).toBe(1);

        await candidate.approve(approval);
        const applied = emittedWorkflowMarker(storeRoot, binding);
        expect(applied.record.status).toBe('applied');
        let replayApplyCalls = 0;
        await Promise.resolve(
          expect(
            host.consumeApproval(binding, async () => {
              replayApplyCalls += 1;
            }),
          ).rejects.toThrow(/replay/),
        );
        expect(replayApplyCalls).toBe(0);
        bodyPassed = true;
      } catch (error: unknown) {
        bodyFailed = true;
        bodyError = error;
      }

      try {
        completeOwnedCleanup(
          [
            () => {
              if (!bodyPassed || fixtureRoot === undefined || performance.now() >= caseDeadline) {
                if (fixtureRoot !== undefined)
                  console.error('Retained failed or expired workflow fixture root: ' + fixtureRoot);
                return undefined;
              }
              rmSync(fixtureRoot, { recursive: true, force: true });
              return undefined;
            },
          ],
          bodyFailed ? { error: bodyError } : undefined,
        );
      } catch (cleanupError: unknown) {
        if (fixtureRoot !== undefined) console.error('Retained workflow fixture after cleanup failure: ' + fixtureRoot);
        throw cleanupError;
      }
      if (bodyFailed) throw bodyError;
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'file workflow denies malformed persisted marker reads without changing their bytes',
    async () => {
      let fixtureRoot: string | undefined;
      let bodyFailed = false;
      let bodyError: unknown;
      try {
        fixtureRoot = await createInitializedFixture((created) => {
          fixtureRoot = created;
        });
        const storeId = 'malformed-marker-' + randomUUID();
        const storeRoot = path.join(fixtureRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
        const host = await createTestFileWorkflowHostCapability(fixtureRoot, 'human:workflow-reviewer', storeId);
        const binding: WorkflowApprovalBinding = {
          stage_id: 'governed-write-approval',
          approval_id: 'malformed-marker-' + randomUUID(),
          ...operationFor(fixtureRoot),
        };
        let callbackCalls = 0;
        await host.consumeApproval(binding, async () => {
          callbackCalls += 1;
        });
        expect(callbackCalls).toBe(1);
        const emitted = emittedWorkflowMarker(storeRoot, binding);
        const malformedBytes = '{"schema":"EdictumWorkflowApprovalConsumption/v1",';
        writeFileSync(emitted.path, malformedBytes, 'utf8');
        await Promise.resolve(
          expect(
            host.consumeApproval(binding, async () => {
              callbackCalls += 1;
            }),
          ).rejects.toThrow(/JSON|parse|Unexpected end/i),
        );
        expect(callbackCalls).toBe(1);
        expect(readFileSync(emitted.path, 'utf8')).toBe(malformedBytes);
      } catch (error: unknown) {
        bodyFailed = true;
        bodyError = error;
      }
      // Keep the intentionally corrupted marker as negative-test evidence, including on success.
      // This root has no deferred remover and must not be reused as a valid approval store.
      if (fixtureRoot !== undefined)
        process.stderr.write(`Retained malformed-marker workflow fixture root: ${fixtureRoot}\n`);
      if (bodyFailed) throw bodyError;
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'test file workflow issuer defaults authorize one valid consumption',
    async () => {
      const caseDeadline = performance.now() + 5_000;
      let fixtureRoot: string | undefined;
      let bodyFailed = false;
      let bodyError: unknown;
      let bodyPassed = false;
      try {
        fixtureRoot = await createInitializedFixture((created) => {
          fixtureRoot = created;
        });
        const host = await createTestFileWorkflowHostCapability(fixtureRoot);
        expect(host.authenticatedPrincipal).toBe('human:workflow-reviewer');
        expect(host.storeId).toMatch(/^test-file-workflow-/);
        expect(host.repositoryRoot).toBe(fixtureRoot);
        const candidate = createConfiguredEdictumWorkflow(fixtureRoot, undefined, host);
        expect((await candidate.evaluate('runtime.read')).action).toBe('allow');
        const binding: WorkflowApprovalBinding = {
          stage_id: 'governed-write-approval',
          approval_id: 'default-issuer-' + randomUUID(),
          ...operationFor(fixtureRoot),
        };
        let callbackCalls = 0;
        await host.consumeApproval(binding, async () => {
          callbackCalls += 1;
        });
        expect(callbackCalls).toBe(1);
        const storeRoot = path.join(fixtureRoot, '.agent', 'work', 'runtime-workflow-approvals', host.storeId);
        expect(emittedWorkflowMarker(storeRoot, binding).record.status).toBe('applied');
        bodyPassed = true;
      } catch (error: unknown) {
        bodyFailed = true;
        bodyError = error;
      }
      try {
        completeOwnedCleanup(
          [
            () => {
              if (!bodyPassed || fixtureRoot === undefined || performance.now() >= caseDeadline) {
                if (fixtureRoot !== undefined)
                  console.error('Retained failed or expired default workflow fixture root: ' + fixtureRoot);
                return undefined;
              }
              rmSync(fixtureRoot, { recursive: true, force: true });
              return undefined;
            },
          ],
          bodyFailed ? { error: bodyError } : undefined,
        );
      } catch (cleanupError: unknown) {
        if (fixtureRoot !== undefined)
          console.error('Retained default workflow fixture after cleanup failure: ' + fixtureRoot);
        throw cleanupError;
      }
      if (bodyFailed) throw bodyError;
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'file workflow reads the exclusive commit-unknown fallback and fences replay',
    async () => {
      let fixtureRoot: string | undefined;
      const storeId = 'commit-unknown-fallback-' + randomUUID();
      let beforeCommitCalls = 0;
      let reservationPath: string | undefined;
      let alteredReservationBytes: string | undefined;
      try {
        fixtureRoot = await createInitializedFixture((created) => {
          fixtureRoot = created;
        });
        const storeRoot = path.join(fixtureRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
        const operationBinding = operationFor(fixtureRoot);
        sessionSequence += 1;
        const approvalId = 'fallback-replay-' + sessionSequence;
        const binding: WorkflowApprovalBinding = {
          stage_id: 'governed-write-approval',
          approval_id: approvalId,
          ...operationBinding,
        };
        const host = await createTestFileWorkflowHostCapability(fixtureRoot, 'human:workflow-reviewer', storeId, () => {
          beforeCommitCalls += 1;
          const emitted = emittedWorkflowMarker(storeRoot, binding);
          reservationPath = emitted.path;
          alteredReservationBytes = readFileSync(emitted.path, 'utf8') + '\n';
          writeFileSync(emitted.path, alteredReservationBytes, 'utf8');
        });
        const candidate = createConfiguredEdictumWorkflow(
          fixtureRoot,
          'commit-unknown-fallback-' + sessionSequence,
          host,
        );
        const approval = receipt('governed-write-approval', { approval_id: approvalId }, fixtureRoot);
        expect((await candidate.evaluate('runtime.write', operationBinding)).action).toBe('pending_approval');
        const failure: unknown = await candidate.approve(approval).then(
          () => undefined,
          (error: unknown) => error,
        );
        expect(failure).toBeInstanceOf(Error);
        expect(failure).toMatchObject({ code: 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001' });
        if (!(failure instanceof Error)) throw new Error('commit-unknown fallback did not return an Error');
        expect(failure.message).toBe(
          'Edictum workflow approval commit state is unknown; recovery marker recorded; recovery is required before replay',
        );
        expect(beforeCommitCalls).toBe(1);
        expect(reservationPath).toBeDefined();
        if (reservationPath === undefined || alteredReservationBytes === undefined)
          throw new Error('commit-unknown fallback did not retain the reserved marker');
        expect(readFileSync(reservationPath, 'utf8')).toBe(alteredReservationBytes);
        const alteredRecord: unknown = JSON.parse(alteredReservationBytes);
        expect(alteredRecord).toMatchObject({ status: 'reserved' });

        const unknownPath = reservationPath + '.commit-unknown';
        const unknownBytes = readFileSync(unknownPath, 'utf8');
        const unknown: unknown = JSON.parse(unknownBytes);
        expect(isRecord(unknown)).toBe(true);
        if (!isRecord(unknown)) throw new Error('commit-unknown fallback sidecar is not a record');
        expect(unknown).toMatchObject({ status: 'commit_unknown', binding });
        let replayApplyCalls = 0;
        const replayFailure: unknown = await host
          .consumeApproval(binding, async () => {
            replayApplyCalls += 1;
          })
          .then(
            () => undefined,
            (error: unknown) => error,
          );
        expect(replayFailure).toMatchObject({ code: 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001' });
        expect(replayApplyCalls).toBe(0);
        expect(readFileSync(unknownPath, 'utf8')).toBe(unknownBytes);
      } finally {
        if (fixtureRoot !== undefined)
          process.stderr.write(`Retained commit-unknown fallback workflow fixture root: ${fixtureRoot}\n`);
      }
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'file workflow reports when both commit-unknown recovery writes fail',
    async () => {
      let fixtureRoot: string | undefined;
      const storeId = 'commit-unknown-unrecorded-' + randomUUID();
      let beforeCommitCalls = 0;
      let applicationCalls = 0;
      let reservationPath: string | undefined;
      let alteredReservationBytes: string | undefined;
      let sidecarPath: string | undefined;
      try {
        fixtureRoot = await createInitializedFixture((created) => {
          fixtureRoot = created;
        });
        const storeRoot = path.join(fixtureRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
        const operationBinding = operationFor(fixtureRoot);
        sessionSequence += 1;
        const approvalId = 'unrecorded-' + sessionSequence;
        const binding: WorkflowApprovalBinding = {
          stage_id: 'governed-write-approval',
          approval_id: approvalId,
          ...operationBinding,
        };
        const host = await createTestFileWorkflowHostCapability(fixtureRoot, 'human:workflow-reviewer', storeId, () => {
          beforeCommitCalls += 1;
          const emitted = emittedWorkflowMarker(storeRoot, binding);
          reservationPath = emitted.path;
          alteredReservationBytes = readFileSync(emitted.path, 'utf8') + '\n';
          writeFileSync(emitted.path, alteredReservationBytes, 'utf8');
          sidecarPath = emitted.path + '.commit-unknown';
          mkdirSync(sidecarPath);
        });
        const candidate = createConfiguredEdictumWorkflow(
          fixtureRoot,
          'commit-unknown-unrecorded-' + sessionSequence,
          host,
        );
        const originalRecordApproval = candidate.runtime.recordApproval.bind(candidate.runtime);
        candidate.runtime.recordApproval = async (...args) => {
          applicationCalls += 1;
          return originalRecordApproval(...args);
        };
        const approval = receipt('governed-write-approval', { approval_id: approvalId }, fixtureRoot);
        expect((await candidate.evaluate('runtime.write', operationBinding)).action).toBe('pending_approval');
        const failure: unknown = await candidate.approve(approval).then(
          () => undefined,
          (error: unknown) => error,
        );
        expect(failure).toBeInstanceOf(Error);
        expect(failure).toMatchObject({ code: 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001' });
        if (!(failure instanceof Error)) throw new Error('unrecorded commit-unknown did not return an Error');
        expect(failure.message).toBe(
          'Edictum workflow approval commit state is unknown; durable recovery marker unavailable; recovery is required before replay',
        );
        expect(beforeCommitCalls).toBe(1);
        expect(applicationCalls).toBe(1);
        expect(reservationPath).toBeDefined();
        if (reservationPath === undefined || alteredReservationBytes === undefined)
          throw new Error('unrecorded commit-unknown did not retain the reserved marker');
        expect(readFileSync(reservationPath, 'utf8')).toBe(alteredReservationBytes);
        const alteredRecord: unknown = JSON.parse(alteredReservationBytes);
        expect(alteredRecord).toMatchObject({ status: 'reserved' });
        expect(sidecarPath).toBeDefined();
        expect(readdirSync(path.dirname(sidecarPath!))).toContain(path.basename(sidecarPath!));
      } finally {
        if (fixtureRoot !== undefined)
          process.stderr.write(`Retained unrecorded commit-unknown workflow fixture root: ${fixtureRoot}\n`);
      }
    },
  );
  test.skipIf(!nativeNoFollowAvailable)(
    'durable workflow consumption records commit-unknown and fences replay',
    async () => {
      let fixtureRoot: string | undefined;
      const storeId = 'commit-unknown-' + randomUUID();
      let beforeCommitCalls = 0;
      try {
        fixtureRoot = await createInitializedFixture((created) => {
          fixtureRoot = created;
        });
        const storeRoot = path.join(fixtureRoot, '.agent', 'work', 'runtime-workflow-approvals', storeId);
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
        let replayApplyCalls = 0;
        const binding: WorkflowApprovalBinding = {
          stage_id: approval.stage_id,
          approval_id: approval.approval_id,
          ...operationFor(fixtureRoot),
        };
        await Promise.resolve(
          expect(
            host.consumeApproval(binding, async () => {
              replayApplyCalls += 1;
            }),
          ).rejects.toMatchObject({
            code: 'GAP-RTNEW-EDICTUM-COMMIT-UNKNOWN-001',
            message:
              'Edictum workflow approval commit state is unknown; recovery marker recorded; recovery is required before replay',
          }),
        );
        expect(replayApplyCalls).toBe(0);
        await Promise.resolve(expect(candidate.approve(approval)).rejects.toThrow(/stage is not pending/));
        expect(beforeCommitCalls).toBe(1);
      } finally {
        if (fixtureRoot !== undefined) process.stderr.write(`Retained UNKNOWN workflow fixture root: ${fixtureRoot}\n`);
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

  test.skipIf(!nativeNoFollowAvailable)(
    'composition proof binds a native HostState workflow capability and consumes approval once',
    async () => {
      const caseDeadline = performance.now() + 5_000;
      let root: string | undefined;
      let database: ReturnType<typeof openHostStateDatabase> | undefined;
      let bodyFailed = false;
      let bodyError: unknown;
      let bodyPassed = false;
      try {
        root = await createInitializedFixture((created) => {
          root = created;
        });
        const config = loadRuntimeConfig(root);
        const configuredStoreId = config.governance.edictum.workflow_id;
        const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
        const databaseRelativePath = sessionHandoffDatabaseRelativePath(config);
        mkdirSync(path.join(root, path.dirname(databaseRelativePath)), { recursive: true });
        database = openHostStateDatabase(root, databaseRelativePath, workspaceId);
        const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
        expect(store.workspaceId).toBe(workspaceId);

        const principal = 'human:native-workflow-reviewer';
        const proof = createWorkflowHostAuthenticationProofForCompositionRoot(root, principal);
        const host = await createFileWorkflowHostCapabilityWithProof(proof, store.governanceCapability);
        expect(host).toMatchObject({
          authenticatedPrincipal: principal,
          repositoryRoot: root,
          storeId: configuredStoreId,
          configDigest: runtimeConfigDigest(config),
        });

        const binding: WorkflowApprovalBinding = {
          stage_id: 'governed-write-approval',
          approval_id: 'native-host-' + randomUUID(),
          ...operationFor(root),
        };
        const inspect = () => inspectHostWorkspaceDatabase(root!, databaseRelativePath, workspaceId).governance;
        const before = inspect();
        let callbackCalls = 0;
        await Promise.resolve(
          expect(
            host.consumeApproval({ ...binding, stage_id: '' }, async () => {
              callbackCalls += 1;
            }),
          ).rejects.toThrow(/binding is invalid/),
        );
        expect(callbackCalls).toBe(0);
        expect(inspect()).toEqual(before);

        await host.consumeApproval(binding, async () => {
          callbackCalls += 1;
        });
        expect(callbackCalls).toBe(1);
        const applied = inspect();
        expect(applied).toHaveLength(1);
        expect(applied[0]).toMatchObject({
          store_id: configuredStoreId,
          kind: 'approval',
          state: {
            schema: 'EdictumWorkflowApprovalConsumption/v1',
            store_id: configuredStoreId,
            status: 'applied',
            binding,
          },
        });

        await Promise.resolve(
          expect(
            host.consumeApproval(binding, async () => {
              callbackCalls += 1;
            }),
          ).rejects.toThrow(/replay/),
        );
        expect(callbackCalls).toBe(1);
        expect(inspect()).toEqual(applied);
        bodyPassed = true;
      } catch (error: unknown) {
        bodyFailed = true;
        bodyError = error;
      }

      try {
        completeOwnedCleanup(
          [
            () => {
              if (database !== undefined) {
                closeWorkspaceDatabaseWithAdmission(database);
                database = undefined;
              }
              if (!bodyPassed || root === undefined || performance.now() >= caseDeadline) {
                if (root !== undefined) {
                  console.error('Retained failed or expired native workflow fixture root: ' + root);
                }
                return undefined;
              }
              rmSync(root, { recursive: true, force: true });
              return undefined;
            },
          ],
          bodyFailed ? { error: bodyError } : undefined,
        );
      } catch (cleanupError: unknown) {
        if (root !== undefined) console.error('Retained native workflow fixture after cleanup failure: ' + root);
        throw cleanupError;
      }
      if (bodyFailed) throw bodyError;
    },
  );
  test('SDK timestamp failure fences the policy snapshot and prevents later session reuse', async () => {
    const runtime = new PolicyWorkflowRuntime(
      terminalPolicyDefinition(['runtime.commit'], []),
      'failed-policy-session',
    );
    const session = new PolicySession('failed-policy-session');
    expect(await runtime.evaluate(session, { toolName: 'runtime.commit', args: {} })).toMatchObject({
      action: 'allow',
      stageId: 'final',
    });

    const originalDescriptor = Object.getOwnPropertyDescriptor(Date.prototype, 'toISOString');
    if (typeof originalDescriptor?.value !== 'function')
      throw new Error('Date.prototype.toISOString is unavailable for the SDK failure control');
    const originalToISOString = originalDescriptor.value as (this: Date) => string;
    const injectedFailure = new Error('injected policy-step timestamp failure');
    let restored = false;
    const restore = () => {
      if (!restored) {
        Object.defineProperty(Date.prototype, 'toISOString', originalDescriptor);
        restored = true;
      }
    };
    onTestFinished(restore);
    let armed = true;
    let injectedCalls = 0;
    let evaluationFailure: unknown;
    Object.defineProperty(Date.prototype, 'toISOString', {
      ...originalDescriptor,
      value(this: Date) {
        if (armed) {
          armed = false;
          injectedCalls += 1;
          throw injectedFailure;
        }
        return originalToISOString.call(this);
      },
    });
    try {
      evaluationFailure = await runtime.evaluate(session, { toolName: 'runtime.foreign', args: {} }).then(
        () => undefined,
        (error: unknown) => error,
      );
    } finally {
      restore();
    }

    expect(new Date(0).toISOString()).toBe('1970-01-01T00:00:00.000Z');
    expect(injectedCalls).toBe(1);
    expect(evaluationFailure).toBeInstanceOf(Error);
    const stateFailure: unknown = await runtime.state(session).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(stateFailure).toMatchObject({ message: 'governance policy snapshot is unavailable' });
    const recordedStagesFailure: unknown = await runtime.recordedStages(session).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(recordedStagesFailure).toMatchObject({ message: 'governance policy snapshot is unavailable' });
    const retryFailure: unknown = await runtime.evaluate(session, { toolName: 'runtime.commit', args: {} }).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(retryFailure).toMatchObject({ message: 'governance policy snapshot failed; session is unavailable' });
    expect(injectedCalls).toBe(1);
  });

  test('workflow command validation rejection preserves its snapshot and recovers the serial queue', async () => {
    const candidate = workflow();
    const before = await candidate.runtime.state(candidate.session);
    await Promise.resolve(
      expect(candidate.runtime.evaluate(candidate.session, { toolName: '', args: {} })).rejects.toThrow(),
    );
    expect(await candidate.runtime.state(candidate.session)).toEqual(before);

    expect(await candidate.runtime.evaluate(candidate.session, { toolName: 'runtime.read', args: {} })).toMatchObject({
      action: 'allow',
      stageId: 'read-evidence',
    });
  });
});
