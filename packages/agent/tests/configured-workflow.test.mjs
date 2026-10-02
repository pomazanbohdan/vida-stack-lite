import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';
import { randomUUID } from 'node:crypto';
import { selectCorrectiveEvidence } from '../src/orchestration/final-assurance.ts';

const correctiveEvidenceWorkflow = {
  stages: [
    { id: 'validator', kind: 'validate' },
    { id: 'tester', kind: 'test' },
  ],
};
function correctiveFailure(stage = 'validator') {
  const action = stage === 'validator' ? 'a'.repeat(64) : 'b'.repeat(64);
  const issue = randomUUID(),
    evidence = ['local://fixture/negative'];
  return {
    request: { action_id: action, stage_id: stage },
    issue_id: issue,
    observation: {
      action_id: action,
      issue_id: issue,
      status: 'reported_failed',
      summary: JSON.stringify(
        stage === 'validator'
          ? { schema: 'VidaValidatorVerdict/v1', verdict: 'fail', findings: ['defect'], evidence_refs: evidence }
          : { schema: 'VidaTesterVerdict/v1', status: 'fail', evidence_refs: evidence },
      ),
      evidence_refs: evidence,
    },
  };
}

test('corrective evidence accepts archived negative verdict and preserves wholly unissued downstream wave', () => {
  const failed = correctiveFailure(),
    unissued = { request: { stage_id: 'tester', action_id: 'c'.repeat(64) }, issue_id: null, observation: null };
  const journal = { completed: [{ step_id: 'validator-wave', items: [failed] }], items: [unissued] },
    before = JSON.stringify(journal);
  expect(selectCorrectiveEvidence(journal, correctiveEvidenceWorkflow)).toEqual({
    observed: [failed],
    failed: [failed],
  });
  expect(JSON.stringify(journal)).toBe(before);
  expect(
    selectCorrectiveEvidence(
      { completed: [{ items: [correctiveFailure('tester')] }], items: [] },
      correctiveEvidenceWorkflow,
    ).failed,
  ).toHaveLength(1);
});

test('corrective evidence rejects unknown mixed waves, reservations, malformed and foreign negative reports', () => {
  const failed = correctiveFailure(),
    ready = { request: { stage_id: 'tester', action_id: 'c'.repeat(64) }, issue_id: null, observation: null };
  for (const unsafe of [
    { ...ready, issue_id: randomUUID() },
    { ...ready, host_reservation: {} },
    { ...ready, research_activation: {} },
    { ...ready, research_normalization: {} },
  ])
    expect(() =>
      selectCorrectiveEvidence(
        { completed: [{ items: [failed] }], items: [ready, unsafe] },
        correctiveEvidenceWorkflow,
      ),
    ).toThrow('unfinished issued effects');
  for (const observation of [
    { ...failed.observation, action_id: 'd'.repeat(64) },
    { ...failed.observation, issue_id: randomUUID() },
  ])
    expect(() =>
      selectCorrectiveEvidence({ completed: [], items: [{ ...failed, observation }] }, correctiveEvidenceWorkflow),
    ).toThrow('unfinished issued effects');
  expect(() =>
    selectCorrectiveEvidence(
      {
        completed: [],
        items: [{ ...failed, observation: { ...failed.observation, summary: 'unstructured failure' } }],
      },
      correctiveEvidenceWorkflow,
    ),
  ).toThrow('structured JSON');
  expect(() =>
    selectCorrectiveEvidence(
      { completed: [], items: [{ ...failed, request: { ...failed.request, stage_id: 'writer' } }] },
      correctiveEvidenceWorkflow,
    ),
  ).toThrow('not a focused verdict');
});

const engineFault = vi.hoisted(() => ({
  rejection: /** @type {Promise<never> | null} */ (null),
  pending: /** @type {Promise<unknown>[]} */ ([]),
}));
const governanceFault = vi.hoisted(() => ({
  evaluate: /** @type {((...args: unknown[]) => Promise<unknown>) | null} */ (null),
}));
vi.mock('@mastra/core/workflows', async (original) => {
  const module = await original();
  return {
    ...module,
    createWorkflow: (...args) => {
      const workflow = module.createWorkflow(...args);
      const createRun = workflow.createRun.bind(workflow);
      workflow.createRun = async (...runArgs) => {
        const run = await createRun(...runArgs);
        if (workflow.id === 'information_research_light' && engineFault.rejection) {
          const start = run.start.bind(run);
          run.start = (...startArgs) => {
            const pending = start(...startArgs);
            engineFault.pending.push(pending);
            return Promise.race([pending, engineFault.rejection]);
          };
        }
        return run;
      };
      return workflow;
    },
  };
});

vi.mock('../src/governance/edictum-boundary.ts', async (original) => ({
  ...(await original()),
  createFileOperationReservationStore: async () => ({}),
  createCompositionRootControlKernel: () => ({}),
  createGovernanceGuard: () => ({ evaluate: (...args) => governanceFault.evaluate?.(...args) ?? Promise.resolve({}) }),
  createFileWorkflowHostCapabilityWithProof: async () => ({}),
}));

import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import {
  buildDevelopmentTaskPacket as buildPublicDevelopmentTaskPacket,
  loadRuntimeConfig as loadPublicRuntimeConfig,
} from '../src/index.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { issueHostGovernanceCapability } from '../src/governance/edictum-boundary.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { createConfiguredMastra } from '../src/orchestration/mastra-boundary.ts';
import {
  createRuntimeKernel,
  createRuntimeKernelHost,
  createRuntimeKernelHostProofForCompositionRoot,
  createRuntimeKernelHostWithProof,
  createTestTrustedHostLauncherCapability,
  createTrustedHostComposition,
  dispatchWorkflowAssignment,
  isRuntimeKernelHost,
  prepareWorkflowExecution,
} from '../src/runtime-kernel.ts';

const bundle = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
let root;
let yaml;
let config;
let calls;
let workItem;
let contextState;
let resolverCalls;
let fixtureProjectIntegrationsDigest;

function fixtureIntegrationsDigest() {
  return fixtureProjectIntegrationsDigest;
}

beforeEach(async () => {
  engineFault.rejection = null;
  engineFault.pending = [];
  governanceFault.evaluate = null;
  root = await mkdtemp(path.join(tmpdir(), 'configured-workflow-unit-'));
  await mkdir(path.join(root, 'runtime'), { recursive: true });
  await mkdir(path.join(root, 'docs'), { recursive: true });
  const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
  await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
  await writeFile(
    path.join(root, policyPath),
    `${JSON.stringify(
      {
        schema: 'DocumentationPolicy/v1',
        policy_id: 'configured-workflow-fixture',
        project_id: 'example-project',
        source_path: policyPath,
        owner: 'workflow-test',
        required: false,
        canonical_roots: ['docs'],
        map_paths: ['AGENT.sidecar.md'],
        excluded_roots: [],
        changelog_required: false,
        changelog_path: null,
        relations: ['documents'],
        updated_at: '2026-09-28T00:00:00.000Z',
      },
      null,
      2,
    )}\n`,
  );
  await cp(path.join(bundle, 'schemas'), path.join(root, 'runtime/schemas'), { recursive: true });
  await cp(path.join(bundle, 'instructions'), path.join(root, 'runtime/instructions'), { recursive: true });
  await cp(path.join(bundle, 'TESTING.md'), path.join(root, 'runtime/TESTING.md'));
  yaml = (await readFile(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8'))
    .replaceAll('{{BUNDLE}}', 'runtime')
    .replaceAll('{{REPOSITORY}}', 'example-repository')
    .replaceAll('{{PROJECT}}', 'example-project');
  await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), yaml);
  await writeFile(path.join(root, 'AGENTS.md'), '# Generic test entry\n');
  await writeFile(path.join(root, 'AGENT.sidecar.md'), '# Isolated project fixture\n');
  config = loadRuntimeConfig(root);
  fixtureProjectIntegrationsDigest = loadProjectSetContext(
    root,
    config,
    config.repository.repository_id,
    [...config.projects.map((entry) => entry.project_id)].sort(),
  ).integrations_digest;
  calls = [];
  resolverCalls = 0;
  workItem = {
    schema: 'WorkItem/v1',
    id: 'fixture-work',
    provider: 'internal',
    provider_type: 'Research',
    canonical_kind: 'research',
    intent: 'information_research',
    project_id: 'example-project',
    title: 'Research fixture',
    description: '',
    labels: [],
    risk_flags: [],
  };
  contextState = {
    checkpointRevision: 1,
    checkpointDigest: 'c'.repeat(64),
    runtimeRevision: 1,
    ledgerRevision: 1,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
});

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

function publicPacketInput(overrides = {}) {
  const riskFlags = [];
  return {
    packet_id: 'packet-public-screening',
    work_item_id: 'work-public-screening',
    team_id: 'default-development',
    workflow_id: 'task_execution',
    work_item: {
      kind: 'task',
      intent: 'task_execution',
      project: 'example-project',
      risk_flags: riskFlags,
      labels: [],
    },
    attempt: 1,
    risk_flags: riskFlags,
    objective: 'Complete the configured work safely.',
    acceptance: ['The focused acceptance passes.'],
    in_scope: ['packages/agent/src/orchestration/mastra-boundary.ts'],
    out_of_scope: [],
    owned_paths: ['packages/agent/src/orchestration/mastra-boundary.ts'],
    affected_symbols: [],
    skill_refs: [],
    documentation_refs: [],
    code_evidence_refs: [],
    research_artifact_refs: [],
    diagnostics: [],
    failed_approaches: [],
    prohibited_patterns: [],
    implementation_constraints: ['Keep packet validation at the input boundary.'],
    security_constraints: [],
    expected_tests: ['bun test tests/configured-workflow.test.mjs'],
    delivery_conditions: ['The public packet contract is verified.'],
    source_revision: 'git:test',
    lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

function packetInputWithText(field, text) {
  const input = publicPacketInput();
  if (field === 'objective' || field === 'source_revision') {
    input[field] = text;
  } else if (field === 'risk_flags' || field === 'work_item.risk_flags') {
    input.risk_flags = [text];
    input.work_item = { ...input.work_item, risk_flags: [text] };
  } else if (field === 'work_item.labels') {
    input.work_item = { ...input.work_item, labels: [text] };
  } else if (field === 'work_item.kind' || field === 'work_item.intent') {
    input.work_item = { ...input.work_item, [field.slice('work_item.'.length)]: text };
  } else {
    input[field] = [text];
  }
  return input;
}

test('public DevelopmentTaskPacket screening accepts ordinary prose and short protocol labels', () => {
  const publicConfig = loadPublicRuntimeConfig(root);
  const ordinary = [
    ['objective', 'Both Source documents explicitly state: packet prose remains valid.'],
    ['source_revision', 'state: pending'],
    ['acceptance', 'session: active'],
    ['out_of_scope', 'code: generated'],
    ['implementation_constraints', 'signature: required'],
    ['security_constraints', 'sig: required'],
    ['security_constraints', 'password=[REDACTED]'],
    ['security_constraints', 'Bearer [REDACTED]'],
    ['security_constraints', 'Authorization: Bearer [REDACTED]'],
    ['security_constraints', '{"password":"[REDACTED]"}'],
    ['security_constraints', "{'api_key':'[REDACTED]'}"],
    ['out_of_scope', 'state=ordinary'],
    ['out_of_scope', 'passwordx=opaque'],
    ['work_item.labels', 'signature: required'],
    ['research_artifact_refs', 'artifact://research/reference-1/' + 'a'.repeat(64)],
  ];
  for (const [field, text] of ordinary) {
    const packet = buildPublicDevelopmentTaskPacket(publicConfig, packetInputWithText(field, text));
    const result =
      field === 'objective' || field === 'source_revision'
        ? packet[field]
        : field === 'work_item.labels'
          ? packet.work_item.labels
          : packet[field];
    expect(result).toEqual(field === 'objective' || field === 'source_revision' ? text : [text]);
  }
});

test('public DevelopmentTaskPacket screening rejects credentials across descriptive fields', () => {
  const publicConfig = loadPublicRuntimeConfig(root);
  const fields = [
    'objective',
    'source_revision',
    'acceptance',
    'risk_flags',
    'in_scope',
    'out_of_scope',
    'affected_symbols',
    'skill_refs',
    'documentation_refs',
    'code_evidence_refs',
    'failed_approaches',
    'prohibited_patterns',
    'implementation_constraints',
    'security_constraints',
    'expected_tests',
    'delivery_conditions',
    'work_item.labels',
    'work_item.kind',
    'work_item.intent',
  ];
  for (const field of fields) {
    expect(() => buildPublicDevelopmentTaskPacket(publicConfig, packetInputWithText(field, 'api_key=opaque'))).toThrow(
      /sensitive material/,
    );
  }

  const sensitive = [
    ['out_of_scope', 'password=opaque'],
    ['out_of_scope', '{"password":"secret-value"}'],
    ['out_of_scope', "{'api_key':'secret-value'}"],
    ['out_of_scope', 'jwt=opaque'],
    ['out_of_scope', 'token:opaque'],
    ['implementation_constraints', 'api_key=opaque'],
    ['security_constraints', 'Authorization: Bearer opaque'],
    ['security_constraints', 'Cookie: session=opaque'],
    ['acceptance', 'client_secret=opaque'],
    ['out_of_scope', 'Bearer opaque'],
    ['out_of_scope', '-----BEGIN PRIVATE KEY-----'],
    ['out_of_scope', 'x-amz-signature=opaque'],
    ['out_of_scope', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature123'],
    ['out_of_scope', 'https://user:secret@example.test/path'],
    ['out_of_scope', 'https://example.test/callback?state=opaque'],
    ['out_of_scope', 'https://example.test/callback?relay=ok&state=opaque'],
    ['out_of_scope', 'https://example.test/callback#code=opaque'],
    ['out_of_scope', 'https://example.test/callback?code=opaque'],
    ['out_of_scope', 'https://example.test/callback?oauth_state=opaque'],
    ['out_of_scope', 'https://example.test/callback?oidc_nonce=opaque'],
    ['out_of_scope', 'https://example.test/callback?SAMLResponse=opaque'],
    ['out_of_scope', 'https://example.test/callback?sessionId=opaque'],
    ['research_artifact_refs', 'artifact://research/reference-1/' + 'a'.repeat(64) + '?state=opaque'],
  ];
  for (const [field, text] of sensitive) {
    expect(() => buildPublicDevelopmentTaskPacket(publicConfig, packetInputWithText(field, text))).toThrow(
      /sensitive material/,
    );
  }
});

function fixtureAttempts() {
  const records = new Map();
  const previewReceipt = (invocation, requestDigest) => {
    const { binding, permit } = invocation.workContext;
    const assignmentId = canonicalJsonDigest({
      binding,
      stage: invocation.stage.id,
      index: invocation.assignmentIndex,
    });
    const { ticket_id, thread_id, generation } = permit.lease;
    const lease = { ticket_id, thread_id, generation };
    return {
      identity: {
        repository_id: binding.repository_id,
        project_ids: [...binding.project_ids],
        integrations_digest: binding.integrations_digest,
        work_id: binding.lifecycle_work_id,
      },
      workVersion: { revision: permit.checkpoint_revision, digest: permit.checkpoint_digest },
      maintenanceGeneration: 0,
      attempt: {
        assignment_id: assignmentId,
        attempt_id: canonicalJsonDigest({
          assignment_id: assignmentId,
          request_digest: requestDigest,
          lease,
          previous_attempt_id: null,
        }),
        previous_attempt_id: null,
        request_digest: requestDigest,
        stage_id: invocation.stage.id,
        assignment_index: invocation.assignmentIndex,
        lease,
        status: 'started',
        result: null,
        result_digest: null,
        reconciliation: null,
      },
    };
  };
  return {
    attemptCount: () => records.size,
    governanceCapability: issueHostGovernanceCapability({
      workspaceId: 'f'.repeat(64),
      reserveOperation: () => null,
      inspectOperation: () => null,
      transitionOperation: () => {},
      consumeApproval: async () => {},
    }),
    claimWorkflowAssignment(invocation, requestDigest) {
      const { binding, permit } = invocation.workContext;
      const assignmentId = canonicalJsonDigest({
        binding,
        stage: invocation.stage.id,
        index: invocation.assignmentIndex,
      });
      const prior = records.get(assignmentId);
      if (prior) {
        if (prior.attempt.request_digest !== requestDigest || prior.attempt.status !== 'completed')
          throw new Error('attempt requires reconciliation');
        return { ...prior, workVersion: { revision: permit.checkpoint_revision, digest: permit.checkpoint_digest } };
      }
      const receipt = previewReceipt(invocation, requestDigest);
      records.set(assignmentId, receipt);
      return receipt;
    },
    async claimWorkflowAssignmentWithApproval(invocation, requestDigest, action) {
      const preview = previewReceipt(invocation, requestDigest);
      const prior = records.get(preview.attempt.assignment_id);
      if (prior?.attempt.status === 'completed')
        return { receipt: this.claimWorkflowAssignment(invocation, requestDigest), approval: null };
      if (prior) throw new Error('attempt requires reconciliation');
      let approved = false;
      await this.approvalPolicy?.({ ...invocation, attempt: preview.attempt }, action, requestDigest, async () => {
        if (approved) throw new Error('workflow approval callback replay');
        approved = true;
        return true;
      });
      if (!approved) throw new Error('workflow approval consumer did not invoke the authorization callback');
      const receipt = this.claimWorkflowAssignment(invocation, requestDigest);
      return { receipt, approval: { status: 'reserved', fencing_token: 'fixture-fence' } };
    },
    beginWorkflowAttemptEffect(authorization) {
      if (authorization.approval?.status !== 'reserved') throw new Error('approval reservation invalid');
      return { ...authorization, approval: { ...authorization.approval, status: 'commit_unknown' } };
    },
    completeWorkflowAttemptWithApproval(authorization, result) {
      if (authorization.approval?.status !== 'commit_unknown') throw new Error('approval outcome invalid');
      return {
        receipt: this.completeWorkflowAttempt(authorization.receipt, result),
        approval: { ...authorization.approval, status: 'applied' },
      };
    },
    abortUnstartedWorkflowAttempt(authorization) {
      if ('receipt' in authorization) {
        if (authorization.approval?.status !== 'reserved') throw new Error('approval outcome unknown');
        records.delete(authorization.receipt.attempt.assignment_id);
      } else {
        records.delete(authorization.attempt.assignment_id);
      }
    },
    completeWorkflowAttempt(receipt, result) {
      const completed = {
        ...receipt,
        attempt: { ...receipt.attempt, status: 'completed', result, result_digest: canonicalJsonDigest(result) },
      };
      records.set(receipt.attempt.assignment_id, completed);
      return completed;
    },
    markWorkflowAttemptUncertain(receipt) {
      const uncertain = { ...receipt, attempt: { ...receipt.attempt, status: 'uncertain' } };
      records.set(receipt.attempt.assignment_id, uncertain);
      return uncertain;
    },
  };
}

async function compose(
  permittedOperations = ['workflow', 'runtime.write'],
  service = async (value) => {
    calls.push(value);
    return { observed: value.assignment.role };
  },
  validateResult = () => {},
  resolveContext = fixtureWorkContext,
  attempts = fixtureAttempts(),
  migrationRebindVerifier,
  consumeWorkflowApproval = (_invocation, _action, _requestDigest, apply) => apply(),
  authenticationIntegrationsDigest = fixtureIntegrationsDigest(),
) {
  const services = {
    ...(attempts ? { governanceCapability: attempts.governanceCapability } : {}),
    ...(attempts
      ? {
          workflowAttempts:
            consumeWorkflowApproval === null
              ? Object.fromEntries(
                  Object.entries(attempts).filter(
                    ([name]) =>
                      ![
                        'claimWorkflowAssignmentWithApproval',
                        'beginWorkflowAttemptEffect',
                        'completeWorkflowAttemptWithApproval',
                      ].includes(name),
                  ),
                )
              : Object.assign(attempts, { approvalPolicy: consumeWorkflowApproval }),
        }
      : {}),
    ...(migrationRebindVerifier ? { migrationRebindVerifier } : {}),
    resolveWorkflowWorkItem: () => {
      resolverCalls += 1;
      return workItem;
    },
    ...(validateResult ? { validateWorkflowAssignmentResult: validateResult } : {}),
    ...(resolveContext ? { resolveWorkExecutionContext: resolveContext } : {}),
    resolveIdentity: () => null,
    verifyApproval: () => null,
    runtimeRevision: () => ({ sourceRevision: 'fixture-source', currentRevision: contextState.runtimeRevision }),
    timingSink: { record: () => {} },
    casWriter: () => {
      throw new Error('Unit dispatch must not write source');
    },
    ...(service ? { dispatchWorkflowAssignment: service } : {}),
  };
  const launcher = createTestTrustedHostLauncherCapability({
    authentication: {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: authenticationIntegrationsDigest,
      principal: 'fixture:executor',
      configRevision: config.config_revision,
      permittedOperations,
    },
    services,
  });
  return createTrustedHostComposition(launcher);
}

function request(overrides = {}) {
  const value = {
    repositoryRoot: root,
    configDigest: runtimeConfigDigest(config),
    teamId: 'default-development',
    workflowId: 'information_research_light',
    stageId: config.workflows.information_research_light.entry_stage,
    assignmentIndex: 0,
    workItemId: 'fixture-work',
    workItemDigest: canonicalJsonDigest(workItem),
    input: { work_item_id: 'fixture-work' },
    ...overrides,
  };
  const context = fixtureWorkContext({
    workItem,
    teamId: value.teamId,
    workflowId: value.workflowId,
    stageId: value.stageId,
    assignmentIndex: value.assignmentIndex,
  });
  return { ...value, workContextDigest: contextAuthorityDigest(context), ...overrides };
}

function fixtureWorkContext(invocation) {
  const binding = {
    repository_id: config.repository.repository_id,
    project_ids: [...config.projects.map((entry) => entry.project_id)].sort(),
    integrations_digest: fixtureIntegrationsDigest(),
    team_id: invocation.teamId,
    workflow_id: invocation.workflowId,
    provider_work_item_id: invocation.workItem.id,
    lifecycle_work_id: 'lifecycle-task-fixture',
    work_item_digest: canonicalJsonDigest(invocation.workItem),
    work_source_revision: 'work-source',
    scope_id: 'approved-work-scope',
    scope_contract_digest: 'a'.repeat(64),
    acceptance_manifest_digest: 'b'.repeat(64),
    ac_ids: ['AC-UNIT'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: ['file:src/task.ts'],
    config_digest: runtimeConfigDigest(config),
    runtime_source_revision: 'fixture-source',
    schema_digest: 'd'.repeat(64),
    runtime_code_digest: 'e'.repeat(64),
  };
  return {
    schema: 'WorkExecutionContext/v1',
    binding,
    permit: {
      context_digest: canonicalJsonDigest(binding),
      checkpoint_revision: contextState.checkpointRevision,
      checkpoint_digest: contextState.checkpointDigest,
      runtime_current_revision: contextState.runtimeRevision,
      stage_id: invocation.stageId,
      assignment_index: invocation.assignmentIndex,
      dispatch_authorized: true,
      lease: {
        thread_id: 'fixture-thread',
        ticket_id: 'fixture-ticket',
        generation: 1,
        ledger_revision: contextState.ledgerRevision,
        expires_at: contextState.expiresAt,
        active_resources: ['file:src/task.ts'],
        blocked_resources: [],
      },
    },
  };
}

function contextAuthorityDigest(context) {
  const lease = context.permit.lease;
  return canonicalJsonDigest({
    binding: context.binding,
    lease: {
      thread_id: lease.thread_id,
      ticket_id: lease.ticket_id,
      generation: lease.generation,
      active_resources: [...lease.active_resources].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    },
  });
}

describe('semantic current-v1 work context and live permits (unit authority adapter)', () => {
  test.each(['valid', 'attempt', 'principal', 'future-ledger', 'work-digest'])(
    'reconciled completion is revalidated without dispatch; proof=%s',
    async (proof) => {
      const foreign = proof !== 'valid';
      const attempts = fixtureAttempts();
      attempts.reconciliationPrincipal = 'runtime:test-verifier';
      const claim = attempts.claimWorkflowAssignment;
      attempts.claimWorkflowAssignment = (invocation, digest) => {
        const started = claim(invocation, digest);
        const completed = attempts.completeWorkflowAttempt(started, { recovered: true });
        return {
          ...completed,
          workVersion: { revision: started.workVersion.revision + 1, digest: 'd'.repeat(64) },
          attempt: {
            ...completed.attempt,
            reconciliation: {
              schema: 'WorkflowAttemptReconciliationAuthorization/v1',
              principal: proof === 'principal' ? 'other-machine' : 'runtime:test-verifier',
              work_binding_digest: canonicalJsonDigest(invocation.workContext.binding),
              work_version:
                proof === 'work-digest' ? { ...started.workVersion, digest: '9'.repeat(64) } : started.workVersion,
              ledger_version: {
                revision: invocation.workContext.permit.lease.ledger_revision + Number(proof === 'future-ledger'),
                digest: 'a'.repeat(64),
              },
              attempt_id: proof === 'attempt' ? '9'.repeat(64) : completed.attempt.attempt_id,
              request_digest: digest,
              outcome: 'completed',
              result_digest: completed.attempt.result_digest,
              provider_evidence: {
                schema: 'ProviderObservation/v1',
                path: '.agent/provider.json',
                sha256: 'b'.repeat(64),
              },
              decision: null,
              retry_lease: null,
            },
          },
        };
      };
      let dispatched = 0,
        validated = 0;
      const host = await compose(
        ['workflow', 'runtime.write'],
        () => {
          dispatched++;
          return {};
        },
        (_invocation, result) => {
          validated++;
          expect(result).toEqual({ recovered: true });
        },
        fixtureWorkContext,
        attempts,
      );
      if (foreign)
        await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
          /reconciliation binding/,
        );
      else
        expect(await dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).toEqual({
          recovered: true,
        });
      expect(dispatched).toBe(0);
      expect(validated).toBe(foreign ? 0 : 1);
    },
  );

  test('rejects a completed attempt from a future or mismatched checkpoint version', async () => {
    const attempts = fixtureAttempts();
    const claim = attempts.claimWorkflowAssignment;
    attempts.claimWorkflowAssignment = (invocation, digest) => {
      const started = claim(invocation, digest);
      const completed = attempts.completeWorkflowAttempt(started, { recovered: true });
      return {
        ...completed,
        workVersion: { revision: started.workVersion.revision + 2, digest: 'f'.repeat(64) },
      };
    };
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        throw new Error('a stale completed result must not dispatch');
      },
      () => {
        throw new Error('a stale completed result must not validate');
      },
      fixtureWorkContext,
      attempts,
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      /work (binding|version)/,
    );
  });

  test('rejects composition without a shared durable governance owner', async () => {
    await expect(
      compose(
        ['workflow', 'runtime.write'],
        async () => ({}),
        () => {},
        fixtureWorkContext,
        null,
      ),
    ).rejects.toThrow(/host governance capability is required/);
  });

  test('rejects a trusted host whose integrations digest differs from ProjectContext', async () => {
    let dispatched = 0;
    await expect(
      compose(
        ['workflow', 'runtime.write'],
        async () => {
          dispatched++;
          return {};
        },
        () => {},
        fixtureWorkContext,
        fixtureAttempts(),
        undefined,
        undefined,
        '0'.repeat(64),
      ),
    ).rejects.toThrow(/integrations digest does not match the current project context/);
    expect(dispatched).toBe(0);
    expect(resolverCalls).toBe(0);
  });

  test('composition-root host proofs are single-use and identify only issued hosts', () => {
    const proof = createRuntimeKernelHostProofForCompositionRoot({
      repositoryRoot: root,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: fixtureIntegrationsDigest(),
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'fixture-source', currentRevision: 1 }),
      casWriter: () => undefined,
    });
    const host = createRuntimeKernelHostWithProof(proof);
    expect(isRuntimeKernelHost(host)).toBe(true);
    expect(isRuntimeKernelHost({})).toBe(false);
    expect(() => createRuntimeKernelHostWithProof(proof)).toThrow(/host authentication proof is required/);
  });

  test('production lower-level kernel rejects the file reservation fallback', async () => {
    const host = createRuntimeKernelHost({
      repositoryRoot: root,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: fixtureIntegrationsDigest(),
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'fixture', currentRevision: 1 }),
      casWriter: () => undefined,
    });
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await expect(createRuntimeKernel(root, host)).rejects.toThrow(/test-only trusted host issuer/);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  test('distributed runtime denies implicit governance even with test process flags', async () => {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const bindings = {
      repositoryRoot: root,
      repositoryId: config.repository.repository_id,
      projectIds: [...config.projects.map((entry) => entry.project_id)].sort(),
      integrationsDigest: fixtureIntegrationsDigest(),
    };
    const script = `
      import assert from 'node:assert/strict';
      const distributed = await import('./dist/src/index.js');
      const bindings = {
        ...${JSON.stringify(bindings)},
        resolveIdentity: () => null,
        verifyApproval: () => null,
        runtimeRevision: () => ({ sourceRevision: 'fixture', currentRevision: 1 }),
        casWriter: () => undefined,
      };
      assert.throws(() => distributed.createRuntimeKernelHost(bindings), /authentication proof is required/);
      assert.equal(Object.keys(distributed).some((name) => name.startsWith('createTest')), false);
      console.log('distributed authentication denial verified');
    `;
    const result = await promisify(execFile)('node', [path.join(packageRoot, 'bin/bun.mjs'), '-e', script], {
      cwd: packageRoot,
      env: { ...process.env, NODE_ENV: 'test', BUN_TEST: '1', VITEST: 'true' },
      windowsHide: true,
      timeout: 30_000,
    });
    expect(result.stderr).toBe('');
    expect(result.stdout.trim()).toBe('distributed authentication denial verified');
    const bundled = await readFile(path.join(packageRoot, 'dist/src/runtime.js'), 'utf8');
    expect(bundled).toMatch(
      /requireCondition2\(false, "test-only trusted host issuer is unavailable outside a test process"\)/,
    );
  });

  test('a rejected provider result leaves the effect uncertain and blocks replay', async () => {
    let dispatched = 0,
      validated = 0;
    const host = await compose(
      ['workflow', 'runtime.write'],
      async (invocation) => {
        dispatched++;
        expect(invocation.attempt.status).toBe('started');
        return { result: 'observed' };
      },
      () => {
        validated++;
        if (validated === 1) throw new Error('validator unavailable');
      },
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      'validator unavailable',
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      /attempt requires reconciliation/,
    );
    expect(dispatched).toBe(1);
    expect(validated).toBe(1);
  });

  test('pre-provider context failure removes an unprotected attempt for retry', async () => {
    const attempts = fixtureAttempts();
    let reads = 0;
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        throw new Error('stale context must not dispatch');
      },
      () => {},
      (value) => {
        const context = fixtureWorkContext(value);
        if (++reads === 2) context.permit.checkpoint_revision = 1;
        return context;
      },
      attempts,
    );
    contextState.checkpointRevision = 2;
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      /work version is not current/,
    );
    expect(attempts.attemptCount()).toBe(0);
  });

  test('unknown provider failure leaves an uncertain attempt and blocks redispatch', async () => {
    let dispatched = 0;
    let aborted = 0;
    const attempts = fixtureAttempts();
    const abort = attempts.abortUnstartedWorkflowAttempt;
    attempts.abortUnstartedWorkflowAttempt = function (authorization) {
      aborted++;
      return abort.call(this, authorization);
    };
    const host = await compose(
      ['workflow', 'runtime.write'],
      async () => {
        dispatched++;
        throw new Error('provider outcome unknown');
      },
      () => {},
      fixtureWorkContext,
      attempts,
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      'provider outcome unknown',
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      'reconciliation',
    );
    expect(dispatched).toBe(1);
    expect(aborted).toBe(0);
  });
  test('requires a trusted work context service', async () => {
    const host = await compose(
      ['workflow', 'runtime.write'],
      async () => ({}),
      () => {},
      null,
    );
    expect(host.workflowExecutionCapability).toBeNull();
  });

  test('keeps provider and lifecycle work identities distinct and freezes the host context', async () => {
    const host = await compose();
    await dispatchWorkflowAssignment(host.workflowExecutionCapability, request());
    const context = calls[0].workContext;
    expect(context.schema).toBe('WorkExecutionContext/v1');
    expect(context.binding.provider_work_item_id).toBe(workItem.id);
    expect(context.binding.lifecycle_work_id).toBe('lifecycle-task-fixture');
    expect(context.binding.work_source_revision).not.toBe(context.binding.runtime_source_revision);
    expect(Object.isFrozen(context.binding)).toBe(true);
    expect(Object.isFrozen(context.permit.lease)).toBe(true);
  });

  test.each([
    [
      'unrecognized schema',
      (c) => {
        c.schema = 'WorkExecutionContext/v2';
      },
    ],
    [
      'unknown field',
      (c) => {
        c.checkpoint_protocol = 'old';
      },
    ],
    [
      'foreign project',
      (c) => {
        c.binding.provider_work_item_id = 'foreign-project-work';
      },
    ],
    [
      'foreign work item',
      (c) => {
        c.binding.provider_work_item_id = 'foreign';
      },
    ],
    [
      'changed work item',
      (c) => {
        c.binding.work_item_digest = '0'.repeat(64);
      },
    ],
    [
      'foreign config',
      (c) => {
        c.binding.config_digest = '0'.repeat(64);
      },
    ],
    [
      'stale runtime revision',
      (c) => {
        c.permit.runtime_current_revision = 9;
      },
    ],
    [
      'foreign stage',
      (c) => {
        c.permit.stage_id = 'foreign';
      },
    ],
    [
      'foreign assignment',
      (c) => {
        c.permit.assignment_index = 12;
      },
    ],
    [
      'revoked dispatch',
      (c) => {
        c.permit.dispatch_authorized = false;
      },
    ],
    [
      'expired lease',
      (c) => {
        c.permit.lease.expires_at = '2020-01-01T00:00:00Z';
      },
    ],
    [
      'blocked lease',
      (c) => {
        c.permit.lease.blocked_resources = ['file:src/task.ts'];
      },
    ],
    [
      'unowned scope path',
      (c) => {
        c.permit.lease.active_resources = [];
      },
    ],
    [
      'path traversal',
      (c) => {
        c.binding.implementation_paths = ['../task.ts'];
      },
    ],
    [
      'out-of-scope lease resource',
      (c) => {
        c.permit.lease.active_resources.push('file:src/other.ts');
      },
    ],
    [
      'unsafe allowed resource',
      (c) => {
        c.binding.allowed_resources.push('file:.git/config');
      },
    ],
    [
      'zero runtime revision',
      (c) => {
        c.permit.runtime_current_revision = 0;
        contextState.runtimeRevision = 0;
      },
    ],
    ...['.git/config', 'a/CON.txt', 'a/file.', 'a/file ', 'a/*.ts', '~user/file', 'a/COM¹', 'a/\u0000file'].map(
      (unsafePath) => [
        'unsafe scoped path ' + JSON.stringify(unsafePath),
        (c) => {
          c.binding.implementation_paths = [unsafePath];
          c.binding.allowed_resources = ['file:' + unsafePath];
          c.permit.lease.active_resources = ['file:' + unsafePath];
        },
      ],
    ),
    [
      'duplicate acceptance ID',
      (c) => {
        c.binding.ac_ids.push('AC-UNIT');
      },
    ],
  ])('rejects %s before dispatch', async (_name, modify) => {
    const host = await compose(
      ['workflow', 'runtime.write'],
      async (call) => {
        calls.push(call);
        return {};
      },
      () => {},
      (invocation) => {
        const value = fixtureWorkContext(invocation);
        modify(value);
        value.permit.context_digest = canonicalJsonDigest(value.binding);
        return value;
      },
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  test('permits monotonic checkpoint progress and lease renewal without changing authority', async () => {
    const validated = [];
    const host = await compose(undefined, undefined, (invocation) => validated.push(invocation.workContext));
    const input = request();
    await dispatchWorkflowAssignment(host.workflowExecutionCapability, input);
    contextState.checkpointRevision++;
    contextState.checkpointDigest = 'f'.repeat(64);
    contextState.runtimeRevision++;
    contextState.ledgerRevision++;
    contextState.expiresAt = new Date(Date.parse(contextState.expiresAt) + 3600000).toISOString();
    await dispatchWorkflowAssignment(host.workflowExecutionCapability, input);
    expect(calls).toHaveLength(1);
    expect(validated[1].permit.checkpoint_revision).toBe(2);
  });

  test.each(['checkpoint', 'ledger', 'runtime'])('rejects %s revision regression', async (kind) => {
    contextState.checkpointRevision = contextState.ledgerRevision = contextState.runtimeRevision = 2;
    const host = await compose();
    const input = request();
    await dispatchWorkflowAssignment(host.workflowExecutionCapability, input);
    contextState[
      kind === 'checkpoint' ? 'checkpointRevision' : kind === 'ledger' ? 'ledgerRevision' : 'runtimeRevision'
    ] = 1;
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(
      /revision regressed/,
    );
    expect(calls).toHaveLength(1);
  });

  test('rejects changed checkpoint bytes without a new revision', async () => {
    const host = await compose();
    const input = request();
    await dispatchWorkflowAssignment(host.workflowExecutionCapability, input);
    contextState.checkpointDigest = 'f'.repeat(64);
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(
      /without revision/,
    );
    expect(calls).toHaveLength(1);
  });

  test.each(['schema_digest', 'scope_contract_digest', 'acceptance_manifest_digest', 'runtime_code_digest'])(
    'requires explicit rebind after %s changes, even with a caller-recomputed digest',
    async (field) => {
      let changed = false;
      const resolve = (invocation) => {
        const value = fixtureWorkContext(invocation);
        if (changed) value.binding[field] = 'f'.repeat(64);
        value.permit.context_digest = canonicalJsonDigest(value.binding);
        return value;
      };
      const host = await compose(
        ['workflow', 'runtime.write'],
        async (call) => {
          calls.push(call);
          return {};
        },
        () => {},
        resolve,
      );
      await dispatchWorkflowAssignment(host.workflowExecutionCapability, request());
      changed = true;
      const changedContext = resolve({
        workItem,
        teamId: 'default-development',
        workflowId: 'information_research_light',
        stageId: 'research_parallel',
        assignmentIndex: 0,
      });
      await expect(
        dispatchWorkflowAssignment(
          host.workflowExecutionCapability,
          request({ workContextDigest: contextAuthorityDigest(changedContext) }),
        ),
      ).rejects.toThrow(/explicit rebind/);
      expect(calls).toHaveLength(1);
    },
  );

  test('does not release a result after its permit was revoked during execution', async () => {
    let revoked = false;
    const host = await compose(
      ['workflow', 'runtime.write'],
      async (call) => {
        calls.push(call);
        revoked = true;
        return {};
      },
      () => {},
      (invocation) => {
        const value = fixtureWorkContext(invocation);
        value.permit.dispatch_authorized = !revoked;
        return value;
      },
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      /not authorized/,
    );
    expect(calls).toHaveLength(1);
  });
});

describe('configured workflow host dispatch (isolated persistence adapters)', () => {
  test('returns the Edictum result when configuration remains current', async () => {
    const result = { allowed: true, reason: 'current configuration' };
    governanceFault.evaluate = async () => result;
    const host = await compose(['workflow', 'runtime.read', 'runtime.write']);

    await expect(host.runtimeKernel.evaluateGovernance('runtime.read', {})).resolves.toBe(result);
  });

  test('rejects an Edictum result when configuration changes during governance evaluation', async () => {
    let markStarted;
    let releaseEvaluation;
    const started = new Promise((resolve) => {
      markStarted = resolve;
    });
    const evaluation = new Promise((resolve) => {
      releaseEvaluation = resolve;
    });
    governanceFault.evaluate = async () => {
      markStarted();
      return evaluation;
    };
    const host = await compose(['workflow', 'runtime.read', 'runtime.write']);
    let returned = false;
    const pending = host.runtimeKernel.evaluateGovernance('runtime.read', {}).then((result) => {
      returned = true;
      return result;
    });
    await started;
    await writeFile(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      yaml.replace('config_id: "example-repository"', 'config_id: "changed-repository"'),
    );
    releaseEvaluation({ allowed: true });
    await expect(pending).rejects.toThrow(/configuration changed after composition/i);
    expect(returned).toBe(false);
  });

  test('rejects a forged capability before any operation', async () => {
    await expect(dispatchWorkflowAssignment({}, request())).rejects.toThrow(/opaque host capability/);
    expect(calls).toHaveLength(0);
  });

  test.each(['readConfig', 'readProjectContext', 'evaluateGovernance', 'runGovernedWrite'])(
    'blocks kernel %s when its configured operation is absent',
    async (id) => {
      const document = parse(yaml);
      document.operations.registry = document.operations.registry.filter((entry) => entry.id !== id);
      await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
      config = loadRuntimeConfig(root);
      const host = await compose(['workflow', 'runtime.read', 'runtime.write']);
      const invoke = {
        readConfig: () => host.runtimeKernel.readConfig(),
        readProjectContext: () => host.runtimeKernel.readProjectContext(),
        evaluateGovernance: () => host.runtimeKernel.evaluateGovernance('runtime.read', {}),
        runGovernedWrite: () => host.runtimeKernel.runGovernedWrite({}),
      }[id];
      await expect(invoke()).rejects.toThrow('configured kernel operation is unavailable: ' + id);
      expect(calls).toHaveLength(0);
    },
  );

  test.each([
    ['tool', 'runtime.write'],
    ['governance_stage', 'source-write'],
    ['evidence_class', 'Runtime'],
    ['profile', 'researcher'],
  ])('blocks readConfig when configured %s is incompatible', async (field, value) => {
    const document = parse(yaml);
    document.operations.registry.find((entry) => entry.id === 'readConfig')[field] = value;
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
    config = loadRuntimeConfig(root);
    const host = await compose(['workflow', 'runtime.read', 'runtime.write']);
    await expect(host.runtimeKernel.readConfig()).rejects.toThrow(
      'configured kernel operation is unavailable: readConfig',
    );
    expect(calls).toHaveLength(0);
  });

  test('issues execution only for an authorized host with a service', async () => {
    expect((await compose(['runtime.read'])).workflowExecutionCapability).toBeNull();
    expect((await compose(['workflow'], null)).workflowExecutionCapability).toBeNull();
    const host = await compose();
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).resolves.toEqual({
      observed: 'documentation-researcher',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].operation.id).toBe('executeConfiguredWorkflow');
    expect(calls[0].profile).toEqual(config.agents.profiles[calls[0].assignment.profile]);
    expect(calls[0].roleInstruction).toEqual(config.agents.role_instructions[calls[0].assignment.role]);
    expect(calls[0].roleInstructionDigest).toBe(canonicalJsonDigest(calls[0].roleInstruction));
    expect(calls[0].authentication.projectIds).toEqual(['example-project']);
    expect(Object.isFrozen(calls[0].input)).toBe(true);
  });

  test('passes edited role instructions from project YAML into the host assignment', async () => {
    const original = config.agents.role_instructions['documentation-researcher'].rules[0];
    const updated = original + ' Preserve the configured source order.';
    yaml = yaml.replace(original, updated);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), yaml);
    config = loadRuntimeConfig(root);
    const host = await compose();
    await dispatchWorkflowAssignment(host.workflowExecutionCapability, request());
    expect(calls).toHaveLength(1);
    expect(calls[0].roleInstruction.rules).toContain(updated);
    expect(calls[0].roleInstructionDigest).toBe(
      canonicalJsonDigest(config.agents.role_instructions['documentation-researcher']),
    );
  });

  test('blocks a bound host when project role instructions change', async () => {
    const host = await compose();
    const original = config.agents.role_instructions['documentation-researcher'].rules[0];
    await writeFile(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      yaml.replace(original, original + ' Changed after host binding.'),
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(/config/i);
    expect(calls).toHaveLength(0);
  });

  test.each([
    ['tool', 'runtime.read'],
    ['governance_stage', 'read-evidence'],
    ['evidence_class', 'Decision'],
    ['profile', 'researcher'],
  ])('blocks workflow dispatch when configured operation %s is incompatible', async (field, value) => {
    const document = parse(yaml);
    document.operations.registry.find((entry) => entry.id === 'executeConfiguredWorkflow')[field] = value;
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
    config = loadRuntimeConfig(root);
    const host = await compose();
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      'configured workflow operation is unavailable',
    );
    expect(calls).toHaveLength(0);
  });

  test.each([
    ['missing', null],
    ['tool', 'runtime.write'],
    ['governance_stage', 'source-write'],
    ['evidence_class', 'Runtime'],
    ['profile', 'researcher'],
  ])('blocks workflow selection when registry declaration %s is incompatible', async (field, value) => {
    const document = parse(yaml);
    if (field === 'missing')
      document.operations.registry = document.operations.registry.filter((entry) => entry.id !== 'selectWorkflow');
    else document.operations.registry.find((entry) => entry.id === 'selectWorkflow')[field] = value;
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
    config = loadRuntimeConfig(root);
    const host = await compose();
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      'configured kernel operation is unavailable: selectWorkflow',
    );
    expect(calls).toHaveLength(0);
    expect(resolverCalls).toBe(0);
  });

  test.each([
    { configDigest: '0'.repeat(64) },
    { workflowId: 'unknown' },
    { teamId: 'unknown' },
    { stageId: 'unknown' },
    { assignmentIndex: 99 },
    { assignmentIndex: -1 },
    { profile: 'executor' },
    { riskFlags: ['security', 'security'] },
  ])('rejects substituted invocation %j before dispatch', async (override) => {
    const host = await compose();
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request(override))).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  test('blocks changed configuration even without a revision bump', async () => {
    const host = await compose();
    await writeFile(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      yaml.replace('config_id: "example-repository"', 'config_id: "changed-repository"'),
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(/config/i);
    expect(calls).toHaveLength(0);
  });

  test('rejects a different repository before invoking the service', async () => {
    const host = await compose();
    await expect(
      dispatchWorkflowAssignment(host.workflowExecutionCapability, request({ repositoryRoot: path.dirname(root) })),
    ).rejects.toThrow(/repository binding/);
    expect(calls).toHaveLength(0);
  });

  test('snapshots caller inputs before the asynchronous host boundary', async () => {
    const host = await compose();
    const input = request();
    const result = dispatchWorkflowAssignment(host.workflowExecutionCapability, input);
    input.input.work_item_id = 'substituted';
    input.assignmentIndex = 1;
    await result;
    expect(calls[0].input.work_item_id).toBe('fixture-work');
    expect(calls[0].assignment.role).toBe('documentation-researcher');
  });

  test('rejects a risk-gated assignment when its risk is absent', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    const host = await compose();
    const workflow = config.workflows.implementation_new;
    const stage = workflow.stages.find((value) => value.assignments.some((assignment) => assignment.risk_flags));
    const assignmentIndex = stage.assignments.findIndex((assignment) => assignment.risk_flags);
    const input = request({ workflowId: 'implementation_new', stageId: stage.id, assignmentIndex });
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(/risk binding/);
    expect(calls).toHaveLength(0);
    workItem.risk_flags = [...stage.assignments[assignmentIndex].risk_flags];
    await dispatchWorkflowAssignment(
      host.workflowExecutionCapability,
      request({ workflowId: 'implementation_new', stageId: stage.id, assignmentIndex }),
    );
    expect(calls).toHaveLength(1);
  });

  test('does not grant source-write permission through workflow permission', async () => {
    const host = await compose(['workflow']);
    const stage = config.workflows.implementation_new.stages.find((value) => value.kind === 'develop');
    await expect(
      dispatchWorkflowAssignment(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: stage.id }),
      ),
    ).rejects.toThrow(/runtime.write/);
    expect(calls).toHaveLength(0);
  });

  test('requires a host approval consumer before claiming a protected source assignment', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    const host = await compose(
      ['workflow', 'runtime.write'],
      async () => {
        throw new Error('provider must not run');
      },
      () => {},
      fixtureWorkContext,
      fixtureAttempts(),
      undefined,
      null,
    );
    await expect(
      dispatchWorkflowAssignment(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: 'develop_change' }),
      ),
    ).rejects.toThrow('trusted host atomic workflow approval service is required');
    expect(calls).toHaveLength(0);
  });

  test.each([
    ['develop_change', 'source.write'],
    ['prepare_delivery', 'delivery.execute'],
  ])('consumes the configured %s approval before provider dispatch', async (stageId, action) => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    const order = [];
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        order.push('provider');
        return { accepted: true };
      },
      () => {},
      fixtureWorkContext,
      fixtureAttempts(),
      undefined,
      async (invocation, protectedAction, requestDigest, apply) => {
        expect(protectedAction).toBe(action);
        expect(requestDigest).toBe(invocation.attempt.request_digest);
        expect(invocation.workContext.binding.project_ids).toEqual(['example-project']);
        expect(invocation.attempt.status).toBe('started');
        order.push('approval');
        return apply();
      },
    );
    await expect(
      dispatchWorkflowAssignment(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId }),
      ),
    ).resolves.toEqual({ accepted: true });
    expect(order).toEqual(['approval', 'provider']);
  });

  test('does not require HITL approval for a research assignment', async () => {
    const host = await compose(
      ['workflow', 'runtime.write'],
      async () => ({ observed: true }),
      () => {},
      fixtureWorkContext,
      fixtureAttempts(),
      undefined,
      null,
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).resolves.toEqual({
      observed: true,
    });
  });

  test.each([
    [
      'denied',
      async () => {
        throw new Error('approval denied');
      },
      /approval denied/,
    ],
    ['missing callback', async () => ({ accepted: true }), /did not invoke the authorization callback/],
    [
      'callback replay',
      async (_invocation, _action, _digest, apply) => {
        await apply();
        return apply();
      },
      /callback replay/,
    ],
    [
      'post-callback failure',
      async (_invocation, _action, _digest, apply) => {
        await apply();
        throw new Error('approval commit failed');
      },
      /approval commit failed/,
    ],
  ])('does not claim an attempt when host approval admission is %s', async (_case, consume, error) => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    let dispatched = 0;
    const attempts = fixtureAttempts();
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        dispatched++;
        return { accepted: true };
      },
      () => {},
      fixtureWorkContext,
      attempts,
      undefined,
      consume,
    );
    const input = request({ workflowId: 'implementation_new', stageId: 'develop_change' });
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(error);
    expect(dispatched).toBe(0);
    expect(attempts.attemptCount()).toBe(0);
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(error);
    expect(dispatched).toBe(0);
    expect(attempts.attemptCount()).toBe(0);
  });

  test('provider failure after approval entry remains uncertain and cannot redispatch', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    let dispatched = 0;
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        dispatched++;
        throw new Error('provider failed');
      },
      () => {},
      fixtureWorkContext,
      fixtureAttempts(),
      undefined,
      async (_invocation, _action, _digest, apply) => apply(),
    );
    const input = request({ workflowId: 'implementation_new', stageId: 'develop_change' });
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(
      'provider failed',
    );
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(/reconciliation/);
    expect(dispatched).toBe(1);
  });

  test('a protected provider result is validated before its attempt can complete', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    const attempts = fixtureAttempts();
    let dispatched = 0;
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        dispatched++;
        return { invalid: true };
      },
      () => {
        throw new Error('artifact validation failed');
      },
      fixtureWorkContext,
      attempts,
    );
    const input = request({ workflowId: 'implementation_new', stageId: 'develop_change' });
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(
      /artifact validation failed/,
    );
    expect(dispatched).toBe(1);
    expect(attempts.attemptCount()).toBe(1);
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(/reconciliation/);
    expect(dispatched).toBe(1);
  });

  test('malformed protected claim receipt is aborted before provider entry', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    const attempts = fixtureAttempts();
    const claim = attempts.claimWorkflowAssignmentWithApproval;
    attempts.claimWorkflowAssignmentWithApproval = async function (...args) {
      const authorization = await claim.apply(this, args);
      return {
        ...authorization,
        receipt: {
          ...authorization.receipt,
          attempt: { ...authorization.receipt.attempt, request_digest: '0'.repeat(64) },
        },
      };
    };
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        throw new Error('malformed claim must not dispatch');
      },
      () => {},
      fixtureWorkContext,
      attempts,
    );
    await expect(
      dispatchWorkflowAssignment(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: 'develop_change' }),
      ),
    ).rejects.toThrow(/attempt/);
    expect(attempts.attemptCount()).toBe(0);
  });

  test('aborts a protected attempt when pre-effect context refresh fails', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    const attempts = fixtureAttempts();
    let contextReads = 0;
    let dispatched = 0;
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        dispatched++;
        return { accepted: true };
      },
      () => {},
      (invocation) => {
        if (++contextReads === 3) throw new Error('pre-effect context unavailable');
        return fixtureWorkContext(invocation);
      },
      attempts,
    );

    await expect(
      dispatchWorkflowAssignment(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: 'develop_change' }),
      ),
    ).rejects.toThrow('pre-effect context unavailable');
    expect(dispatched).toBe(0);
    expect(attempts.attemptCount()).toBe(0);
  });

  test('rechecks the live lease after approval and before a provider effect', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
    };
    let dispatched = 0;
    const host = await compose(
      ['workflow', 'runtime.write'],
      () => {
        dispatched++;
        return { accepted: true };
      },
      () => {},
      fixtureWorkContext,
      fixtureAttempts(),
      undefined,
      async (_invocation, _action, _digest, apply) => {
        contextState.expiresAt = new Date(Date.now() - 1000).toISOString();
        return apply();
      },
    );
    const input = request({ workflowId: 'implementation_new', stageId: 'develop_change' });
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow(/lease/);
    expect(dispatched).toBe(0);
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, input)).rejects.toThrow();
    expect(dispatched).toBe(0);
  });

  test('requires the declared operation permission even for a research assignment', async () => {
    const host = await compose(['workflow']);
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      /runtime.write/,
    );
    expect(calls).toHaveLength(0);
  });

  test.each([
    { project_id: 'foreign-project' },
    { id: 'foreign-work' },
    { canonical_kind: 'task' },
    { intent: 'task_execution' },
    { provider_type: 'Unknown' },
    { risk_flags: ['security', 'security'] },
  ])('rejects invalid authoritative work-item binding %j', async (override) => {
    const host = await compose();
    workItem = { ...workItem, ...override };
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  test('rejects an allowlisted workflow that does not match the authoritative work item', async () => {
    const host = await compose();
    await expect(
      dispatchWorkflowAssignment(
        host.workflowExecutionCapability,
        request({ workflowId: 'task_execution', stageId: config.workflows.task_execution.entry_stage }),
      ),
    ).rejects.toThrow(/route binding/);
    expect(calls).toHaveLength(0);
  });

  test('does not accept caller-supplied risk flags in place of host work-item risks', async () => {
    workItem.risk_flags = ['security'];
    const host = await compose();
    await expect(
      dispatchWorkflowAssignment(host.workflowExecutionCapability, request({ riskFlags: [] })),
    ).rejects.toThrow(/fields are invalid/);
    expect(calls).toHaveLength(0);
  });

  test('propagates service failure without a synthetic successful result', async () => {
    const host = await compose(['workflow', 'runtime.write'], async () => {
      throw new Error('assignment failed');
    });
    await expect(dispatchWorkflowAssignment(host.workflowExecutionCapability, request())).rejects.toThrow(
      'assignment failed',
    );
  });
});

function configuredGraph(host, requestWorkItem) {
  return createConfiguredMastra(
    root,
    {
      team_id: 'default-development',
      work_item: requestWorkItem ?? {
        kind: workItem.canonical_kind,
        intent: workItem.intent,
        project: workItem.project_id,
        labels: workItem.labels,
        risk_flags: workItem.risk_flags,
      },
    },
    { workflowExecutionCapability: host.workflowExecutionCapability },
  );
}

describe('real configured Mastra graph (unit host adapters, not artifact or persistence acceptance)', () => {
  test.each([
    ['information_research_light', 'information_research', 'research', 'internal', 'Research'],
    ['implementation_new', 'implementation_new', 'feature', 'azure', 'Feature'],
    ['implementation_change', 'implementation_change', 'feature', 'azure', 'Feature'],
    ['bug_fix', 'bug_fix', 'bug', 'azure', 'Bug'],
    ['task_execution', 'task_execution', 'task', 'azure', 'Task'],
  ])(
    'executes every configured stage for %s through the host',
    async (workflowId, intent, kind, provider, providerType) => {
      workItem = { ...workItem, intent, canonical_kind: kind, provider, provider_type: providerType };
      const host = await compose();
      const graph = configuredGraph(host);
      const result = await graph.dispatch(workItem.id);
      expect(result.workflowId).toBe(workflowId);
      expect(result.failedAssignments).toEqual([]);
      for (const stage of config.workflows[workflowId].stages) {
        const expected = stage.assignments.filter((a) => !a.risk_flags?.length);
        expect(result.stageOutputs[stage.id].map((value) => value.role)).toEqual(expected.map((a) => a.role));
        for (const call of calls.filter((value) => value.stage.id === stage.id)) {
          for (const prior of stage.required_after)
            expect(call.input.stage_outputs[prior]).toEqual(result.stageOutputs[prior]);
        }
        for (const output of result.stageOutputs[stage.id])
          expect(output.outputDigest).toBe(canonicalJsonDigest(output.output));
      }
      expect(calls.length).toBe(Object.values(result.stageOutputs).flat().length);
    },
  );

  test('requires an actual execution capability even when preview compilation succeeded', async () => {
    await expect(createConfiguredMastra(root).dispatch(workItem.id)).rejects.toThrow(/opaque host capability/);
    await expect(configuredGraph({ workflowExecutionCapability: {} }).dispatch(workItem.id)).rejects.toThrow(
      /opaque host capability/,
    );
    expect(calls).toHaveLength(0);
  });

  test('rejects workflow edges that diverge from declared stage prerequisites', async () => {
    const fixture = parse(yaml);
    const workflow = fixture.workflows.information_research_light;
    workflow.edges = workflow.edges.filter(
      ([from, to]) => !(from === workflow.entry_stage && to === workflow.stages[1].id),
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(/prerequisites do not match edges/);
    expect(calls).toHaveLength(0);
  });

  test('test-only trusted host issuers reject a production process', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => createTestTrustedHostLauncherCapability({})).toThrow(/outside a test process/);
      expect(() => createRuntimeKernelHostProofForCompositionRoot({})).toThrow(/outside a test process/);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  test('binds migration rebind verification to the authenticated work and principal', async () => {
    const verify = vi.fn(() => null);
    const verifier = { principal: 'fixture:executor', verify };
    const host = await compose(undefined, undefined, undefined, undefined, undefined, verifier);
    const request = {
      identity: {
        repository_id: config.repository.repository_id,
        project_ids: ['example-project'],
        integrations_digest: fixtureIntegrationsDigest(),
        work_id: 'work-1',
      },
    };
    const state = {
      work: {
        binding: {
          repository_id: config.repository.repository_id,
          project_ids: ['example-project'],
          integrations_digest: fixtureIntegrationsDigest(),
          lifecycle_work_id: 'work-1',
        },
      },
    };
    expect(host.migrationRebindVerifier?.principal).toBe('fixture:executor');
    expect(host.migrationRebindVerifier.verify(request, state)).toBeNull();
    expect(verify).toHaveBeenCalledOnce();
    const foreignRequests = [
      {
        identity: { ...request.identity, repository_id: 'foreign-repository' },
        work: { binding: { ...state.work.binding, repository_id: 'foreign-repository' } },
      },
      {
        identity: { ...request.identity, project_ids: ['foreign-project'] },
        work: { binding: { ...state.work.binding, project_ids: ['foreign-project'] } },
      },
    ];
    for (const foreign of foreignRequests)
      expect(() => host.migrationRebindVerifier.verify({ identity: foreign.identity }, { work: foreign.work })).toThrow(
        /not bound to authenticated work/,
      );
    for (const [field, value] of [
      ['repository_id', 'foreign-repository'],
      ['project_ids', ['foreign-project']],
      ['lifecycle_work_id', 'foreign-work'],
    ])
      expect(() =>
        host.migrationRebindVerifier.verify(request, { work: { binding: { ...state.work.binding, [field]: value } } }),
      ).toThrow(/not bound to authenticated work/);
    expect(() => host.migrationRebindVerifier.verify(request, { work: null })).toThrow(
      /not bound to authenticated work/,
    );
    for (const malformed of [null, 'invalid', { identity: null }, { identity: 'invalid' }])
      expect(() => host.migrationRebindVerifier.verify(malformed, state)).toThrow(
        /migration rebind identity is invalid/,
      );
    const callableRequest = () => {};
    callableRequest.identity = request.identity;
    expect(() => host.migrationRebindVerifier.verify(callableRequest, state)).toThrow(
      /migration rebind identity is invalid/,
    );
    expect(verify).toHaveBeenCalledOnce();
    await expect(
      compose(undefined, undefined, undefined, undefined, undefined, { principal: 'foreign-principal', verify }),
    ).rejects.toThrow(/principal is not authenticated/);
    await expect(
      compose(undefined, undefined, undefined, undefined, undefined, { principal: ' fixture:executor ', verify }),
    ).rejects.toThrow(/trusted migration rebind verifier is invalid/);
    await expect(compose(['runtime.read'], undefined, undefined, undefined, undefined, verifier)).rejects.toThrow(
      /runtime.write/,
    );
  });

  test('requires a trusted result validator before issuing execution authority', async () => {
    expect(
      (await compose(['workflow', 'runtime.write'], async () => ({}), null)).workflowExecutionCapability,
    ).toBeNull();
  });

  test('rejects an unsupported standalone barrier stage during configuration loading', async () => {
    const fixture = parse(yaml);
    fixture.workflows.information_research_light.stages[0].mode = 'barrier';
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(/mode.*allowed values|must be equal to one of the allowed values/i);
    expect(calls).toHaveLength(0);
  });

  test('does not trust preview risk flags to omit a mandatory assignment', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
      risk_flags: ['security'],
    };
    const host = await compose();
    const graph = configuredGraph(host, {
      kind: 'feature',
      intent: 'implementation_new',
      project: 'example-project',
      risk_flags: [],
      labels: [],
    });
    await graph.dispatch(workItem.id);
    expect(calls.some((call) => call.assignment.risk_flags?.includes('security'))).toBe(true);
  });

  test('pins the authoritative work item and rejects drift before assignment', async () => {
    const host = await compose();
    const prepared = await prepareWorkflowExecution(host.workflowExecutionCapability, {
      repositoryRoot: root,
      configDigest: runtimeConfigDigest(config),
      teamId: 'default-development',
      workItemId: workItem.id,
    });
    workItem.title = 'Changed after preparation';
    await expect(
      dispatchWorkflowAssignment(
        host.workflowExecutionCapability,
        request({ workItemDigest: prepared.workItemDigest }),
      ),
    ).rejects.toThrow(/changed after preparation/);
    expect(calls).toHaveLength(0);
  });

  test('rejects invalid host results before any downstream stage consumes them', async () => {
    const host = await compose(
      ['workflow', 'runtime.write'],
      async (call) => {
        calls.push(call);
        return { invalid: true };
      },
      () => {
        throw new Error('artifact validation failed');
      },
    );
    await expect(configuredGraph(host).dispatch(workItem.id)).rejects.toThrow(/execution failed/);
    expect(calls.every((call) => call.stage.kind === 'research')).toBe(true);
  });

  test('waits for parallel peers after failure and never starts the dependent stage', async () => {
    let unblock;
    let markStarted;
    const blocked = new Promise((resolve) => {
      unblock = resolve;
    });
    const started = new Promise((resolve) => {
      markStarted = resolve;
    });
    let peerFinished = false;
    const host = await compose(['workflow', 'runtime.write'], async (call) => {
      calls.push(call);
      if (calls.length === 1) throw new Error('first branch failure');
      markStarted();
      await blocked;
      peerFinished = true;
      return { observed: call.assignment.role };
    });
    let settled = false;
    const run = configuredGraph(host).dispatch(workItem.id);
    void run.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await started;
    expect(settled).toBe(false);
    expect(peerFinished).toBe(false);
    unblock();
    await expect(run).rejects.toThrow(/execution failed/);
    expect(peerFinished).toBe(true);
    expect(calls.every((call) => call.stage.kind === 'research')).toBe(true);
  });

  test('drains started host calls when the engine start promise rejects unexpectedly', async () => {
    let rejectEngine;
    let unblock;
    let markStarted;
    engineFault.rejection = new Promise((_resolve, reject) => {
      rejectEngine = reject;
    });
    const started = new Promise((resolve) => {
      markStarted = resolve;
    });
    const blocked = new Promise((resolve) => {
      unblock = resolve;
    });
    let finished = 0;
    const host = await compose(['workflow', 'runtime.write'], async (call) => {
      calls.push(call);
      if (calls.length === config.workflows.information_research_light.stages[0].assignments.length) markStarted();
      await blocked;
      finished++;
      return { observed: call.assignment.role };
    });
    let settled = false;
    const run = configuredGraph(host).dispatch(workItem.id);
    void run.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await started;
    rejectEngine(new Error('injected engine rejection'));
    await new Promise((resolve) => setImmediate(resolve));
    try {
      expect(settled).toBe(false);
      expect(finished).toBe(0);
    } finally {
      unblock();
    }
    await expect(run).rejects.toThrow('injected engine rejection');
    await Promise.allSettled(engineFault.pending);
    expect(finished).toBe(calls.length);
    expect(calls.every((call) => call.stage.kind === 'research')).toBe(true);
  });

  test('joins independent stage branches before synthesis and keeps both outputs', async () => {
    const fixture = parse(yaml);
    const workflow = fixture.workflows.information_research_light;
    const entry = workflow.stages[0];
    const branches = ['branch-a', 'branch-b'].map((id) => ({
      ...structuredClone(entry),
      id,
      mode: 'single',
      assignments: [structuredClone(entry.assignments[0])],
      required_after: [entry.id],
    }));
    workflow.stages[1].required_after = branches.map((branch) => branch.id);
    workflow.stages.splice(1, 0, ...branches);
    workflow.edges = branches.flatMap((branch) => [
      [entry.id, branch.id],
      [branch.id, 'synthesize_research'],
    ]);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    config = loadRuntimeConfig(root);
    const pending = new Map();
    let bothStarted;
    const joined = new Promise((resolve) => {
      bothStarted = resolve;
    });
    const host = await compose(['workflow', 'runtime.write'], async (call) => {
      calls.push(call);
      if (call.stage.id.startsWith('branch-')) {
        await new Promise((resolve) => {
          pending.set(call.stage.id, resolve);
          if (pending.size === 2) bothStarted();
        });
      }
      return { stage: call.stage.id };
    });
    const run = configuredGraph(host).dispatch(workItem.id);
    await joined;
    expect(calls.some((call) => call.stage.kind === 'synthesize')).toBe(false);
    pending.get('branch-b')();
    pending.get('branch-a')();
    const result = await run;
    const synthesis = calls.find((call) => call.stage.kind === 'synthesize');
    for (const branch of branches) {
      expect(result.stageOutputs[branch.id][0].output).toEqual({ stage: branch.id });
      expect(synthesis.input.stage_outputs[branch.id]).toEqual(result.stageOutputs[branch.id]);
    }
  });
});
