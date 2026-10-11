import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import { randomUUID } from 'node:crypto';
import { expectRejection } from './helpers/expect-rejection.ts';
import { createInitializationBundle } from './helpers/init-bundle.ts';
import { selectCorrectiveEvidence } from '../src/orchestration/final-assurance.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import type { AgentRuntimeConfig, WorkflowStage, WorkItemSelection } from '../src/config/runtime-config.ts';
import type { DevelopmentTaskPacketInput } from '../src/orchestration/mastra-boundary.ts';
import type {
  TrustedWorkflowAssignment,
  TrustedHostServices,
  TrustedHostComposition,
  WorkflowExecutionCapability,
  WorkflowAssignmentRequest,
  WorkExecutionContextRequest,
} from '../src/runtime-kernel.ts';
import type { WorkExecutionContext } from '../src/orchestration/workflow-session-reservation-contract.ts';
import { workflowWorkItemSchema } from '../src/orchestration/workflow-session-reservation-contract.ts';
import type {
  MigrationRebindVerifier,
  WorkflowAttemptApprovalAuthorization,
  WorkflowAttemptReceipt,
} from '../src/host-state.ts';
import type { EvaluationResult } from '../src/governance/operation-policy.ts';
import type { WorkflowApprovalConsumptionRecord } from '../src/governance/edictum-boundary.ts';
import type { z } from 'zod';

type WorkflowWorkItem = z.infer<typeof workflowWorkItemSchema>;
type MutableTree<Value> = Value extends readonly (infer Item)[]
  ? MutableTree<Item>[]
  : Value extends object
    ? { -readonly [Key in keyof Value]: MutableTree<Value[Key]> }
    : Value;
type FixtureRequest = Omit<WorkflowAssignmentRequest, 'input' | 'workContextDigest'> & {
  input: { work_item_id: string };
  workContextDigest?: string;
  riskFlags?: readonly string[];
  profile?: string;
};
type PacketTextField =
  | 'objective'
  | 'source_revision'
  | 'risk_flags'
  | 'work_item.risk_flags'
  | 'work_item.labels'
  | 'work_item.kind'
  | 'work_item.intent'
  | 'acceptance'
  | 'out_of_scope'
  | 'implementation_constraints'
  | 'security_constraints'
  | 'research_artifact_refs'
  | 'skill_refs'
  | 'documentation_refs'
  | 'code_evidence_refs'
  | 'in_scope'
  | 'affected_symbols'
  | 'failed_approaches'
  | 'prohibited_patterns'
  | 'expected_tests'
  | 'delivery_conditions';
type ApprovalConsumer = (
  invocation: TrustedWorkflowAssignment,
  action: 'source.write' | 'delivery.execute',
  requestDigest: string,
  apply: () => Promise<boolean>,
) => unknown;
type ApprovalAdmissionCase = readonly [string, ApprovalConsumer, RegExp];
type AttemptPort = NonNullable<TrustedHostServices['workflowAttempts']>;
type MutableAttemptPort = { -readonly [Key in keyof AttemptPort]: AttemptPort[Key] };
type AttemptFixture = Omit<
  MutableAttemptPort,
  | 'claimWorkflowAssignment'
  | 'completeWorkflowAttempt'
  | 'markWorkflowAttemptUncertain'
  | 'claimWorkflowAssignmentWithApproval'
  | 'beginWorkflowAttemptEffect'
  | 'completeWorkflowAttemptWithApproval'
> & {
  attemptCount: () => number;
  approvalPolicy: ApprovalConsumer | null;
  claimWorkflowAssignment: (
    invocation: TrustedWorkflowAssignment,
    requestDigest: string,
  ) => Promise<WorkflowAttemptReceipt>;
  completeWorkflowAttempt: (receipt: WorkflowAttemptReceipt, result: unknown) => Promise<WorkflowAttemptReceipt>;
  markWorkflowAttemptUncertain: (receipt: WorkflowAttemptReceipt) => Promise<WorkflowAttemptReceipt>;
  claimWorkflowAssignmentWithApproval: (
    invocation: TrustedWorkflowAssignment,
    requestDigest: string,
    action: 'source.write' | 'delivery.execute',
  ) => Promise<WorkflowAttemptApprovalAuthorization>;
  beginWorkflowAttemptEffect: (
    authorization: WorkflowAttemptApprovalAuthorization,
  ) => Promise<WorkflowAttemptApprovalAuthorization>;
  completeWorkflowAttemptWithApproval: (
    authorization: WorkflowAttemptApprovalAuthorization,
    result: unknown,
  ) => Promise<WorkflowAttemptApprovalAuthorization>;
};

const correctiveEvidenceWorkflow: AgentRuntimeConfig['workflows'][string] = {
  assurance_profile: 'task_focused',
  max_attempts: 1,
  entry_stage: 'validator',
  terminal_stages: ['tester'],
  stages: [
    {
      id: 'validator',
      kind: 'validate',
      mode: 'single',
      assignments: [],
      consumes: [],
      produces: ['ValidationReceipt/v1'],
      required_after: [],
    },
    {
      id: 'tester',
      kind: 'test',
      mode: 'single',
      assignments: [],
      consumes: [],
      produces: ['TestReceipt/v1'],
      required_after: ['validator'],
    },
  ],
  edges: [['validator', 'tester']],
};
function correctiveFailure(stage: 'validator' | 'tester' = 'validator') {
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

function selectCorrectiveEvidenceFixture(journal: unknown, workflow: unknown): unknown {
  return Reflect.apply(selectCorrectiveEvidence, undefined, [journal, workflow]);
}

function failedEvidenceItems(value: unknown): readonly unknown[] {
  if (typeof value !== 'object' || value === null || !('failed' in value) || !Array.isArray(value.failed))
    throw new Error('corrective evidence result has no failed items');
  return value.failed;
}

function setFixtureField(target: object, field: PropertyKey, value: unknown): void {
  if (!Reflect.set(target, field, value)) throw new Error('Fixture mutation requires a mutable document.');
}

function mutableFixtureConfig(): AgentRuntimeConfig {
  return structuredClone(parseRuntimeConfigYaml(yaml));
}

function requireFixtureValue<Value>(value: Value | undefined): Value {
  if (value === undefined) throw new Error('configured fixture is missing a required element');
  return value;
}

async function dispatchFixture(capability: unknown, requestValue: unknown): Promise<unknown> {
  const result: unknown = await Reflect.apply(dispatchWorkflowAssignment, undefined, [capability, requestValue]);
  return result;
}

function requireWorkflowCapability(host: TrustedHostComposition): WorkflowExecutionCapability {
  const capability = host.workflowExecutionCapability;
  if (capability === null) throw new Error('configured workflow fixture requires its issued execution capability');
  return capability;
}

async function dispatchMastraWithUnknownExecution(execution: unknown): Promise<unknown> {
  const graph: unknown = Reflect.apply(createConfiguredMastra, undefined, [root, {}, execution]);
  if (typeof graph !== 'object' || graph === null) throw new Error('configured graph did not return an object');
  const dispatch: unknown = Reflect.get(graph, 'dispatch');
  if (typeof dispatch !== 'function') throw new Error('configured graph has no dispatch function');
  const result: unknown = await Reflect.apply(dispatch, graph, [workItem.id]);
  return result;
}

function readRecordField(value: unknown, field: string): unknown {
  if (typeof value !== 'object' || value === null) throw new Error('expected an object field');
  return Reflect.get(value, field);
}

function arrayValues(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error('expected an array of object records');
  return value;
}

function verifyMigrationRebindFixture(
  verifier: NonNullable<TrustedHostComposition['migrationRebindVerifier']>,
  requestValue: unknown,
  state: unknown,
): unknown {
  return Reflect.apply(verifier.verify, verifier, [requestValue, state]);
}

function requireMigrationRebindVerifier(
  host: TrustedHostComposition,
): NonNullable<TrustedHostComposition['migrationRebindVerifier']> {
  const verifier = host.migrationRebindVerifier;
  if (verifier === null) throw new Error('migration rebind fixture did not produce its verifier');
  return verifier;
}

function callNegativeSourceBoundary(source: unknown): unknown {
  if (typeof source !== 'function') throw new Error('negative Source boundary must be callable');
  const result: unknown = Reflect.apply(source, undefined, [{}]);
  return result;
}

test('corrective evidence accepts archived negative verdict and preserves wholly unissued downstream wave', () => {
  const failed = correctiveFailure(),
    unissued = { request: { stage_id: 'tester', action_id: 'c'.repeat(64) }, issue_id: null, observation: null };
  const journal = { completed: [{ step_id: 'validator-wave', items: [failed] }], items: [unissued] },
    before = JSON.stringify(journal);
  expect(selectCorrectiveEvidenceFixture(journal, correctiveEvidenceWorkflow)).toEqual({
    observed: [failed],
    failed: [failed],
  });
  expect(JSON.stringify(journal)).toBe(before);
  expect(
    failedEvidenceItems(
      selectCorrectiveEvidenceFixture(
        { completed: [{ items: [correctiveFailure('tester')] }], items: [] },
        correctiveEvidenceWorkflow,
      ),
    ),
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
      selectCorrectiveEvidenceFixture(
        { completed: [{ items: [failed] }], items: [ready, unsafe] },
        correctiveEvidenceWorkflow,
      ),
    ).toThrow('unfinished issued effects');
  for (const observation of [
    { ...failed.observation, action_id: 'd'.repeat(64) },
    { ...failed.observation, issue_id: randomUUID() },
  ])
    expect(() =>
      selectCorrectiveEvidenceFixture(
        { completed: [], items: [{ ...failed, observation }] },
        correctiveEvidenceWorkflow,
      ),
    ).toThrow('unfinished issued effects');
  expect(() =>
    selectCorrectiveEvidenceFixture(
      {
        completed: [],
        items: [{ ...failed, observation: { ...failed.observation, summary: 'unstructured failure' } }],
      },
      correctiveEvidenceWorkflow,
    ),
  ).toThrow('structured JSON');
  expect(() =>
    selectCorrectiveEvidenceFixture(
      { completed: [], items: [{ ...failed, request: { ...failed.request, stage_id: 'writer' } }] },
      correctiveEvidenceWorkflow,
    ),
  ).toThrow('not a focused verdict');
});

const engineFault: { rejection: Promise<never> | null; pending: Promise<unknown>[] } = {
  rejection: null,
  pending: [],
};
type GovernanceEvaluation = (tool: string, args: Record<string, unknown>) => Promise<EvaluationResult>;
const governanceFault: { evaluate: GovernanceEvaluation | null } = { evaluate: null };
const defaultEvaluation: EvaluationResult = {
  decision: 'allow',
  toolName: 'runtime.read',
  rules: [],
  denyReasons: [],
  warnReasons: [],
  contractsEvaluated: 0,
  policyError: false,
  workflowSkipped: false,
  workflowReason: null,
};

const actualMastraWorkflows = await import('@mastra/core/workflows');
const originalMastraWorkflowExports = { ...actualMastraWorkflows };
const realCreateWorkflow = originalMastraWorkflowExports.createWorkflow;
let configuredWorkflowTestDoublesActive = false;
await mock.module('@mastra/core/workflows', () => ({
  ...originalMastraWorkflowExports,
  createWorkflow: (...args: Parameters<typeof realCreateWorkflow>) => {
    if (!configuredWorkflowTestDoublesActive) {
      return realCreateWorkflow(...args);
    }
    const workflow = realCreateWorkflow(...args);
    const createRun = workflow.createRun.bind(workflow);
    Object.defineProperty(workflow, 'createRun', {
      value: async (...runArgs: Parameters<typeof workflow.createRun>) => {
        const run = await createRun(...runArgs);
        if (workflow.id === 'information_research_light') {
          const start = run.start.bind(run);
          Object.defineProperty(run, 'start', {
            value: (...startArgs: Parameters<typeof run.start>) => {
              const pending = start(...startArgs);
              engineFault.pending.push(pending);
              const rejection = engineFault.rejection;
              return rejection === null ? pending : Promise.race([pending, rejection]);
            },
          });
        }
        return run;
      },
    });
    return workflow;
  },
}));

const actualGovernanceBoundary = await import('../src/governance/edictum-boundary.ts');
const originalGovernanceBoundaryExports = { ...actualGovernanceBoundary };
await mock.module('../src/governance/edictum-boundary.ts', () => ({
  ...originalGovernanceBoundaryExports,
  createFileOperationReservationStore: (
    ...args: Parameters<typeof originalGovernanceBoundaryExports.createFileOperationReservationStore>
  ) => {
    return configuredWorkflowTestDoublesActive
      ? Promise.resolve({})
      : originalGovernanceBoundaryExports.createFileOperationReservationStore(...args);
  },
  createCompositionRootControlKernel: (
    ...args: Parameters<typeof originalGovernanceBoundaryExports.createCompositionRootControlKernel>
  ) => {
    return configuredWorkflowTestDoublesActive
      ? {}
      : originalGovernanceBoundaryExports.createCompositionRootControlKernel(...args);
  },
  createGovernanceGuard: (...args: Parameters<typeof originalGovernanceBoundaryExports.createGovernanceGuard>) => {
    return configuredWorkflowTestDoublesActive
      ? {
          evaluate: (tool: string, args: Record<string, unknown>) =>
            governanceFault.evaluate?.(tool, args) ?? Promise.resolve({ ...defaultEvaluation, toolName: tool }),
          rejectPreparation: (error: Error): Promise<never> => Promise.reject(error),
        }
      : originalGovernanceBoundaryExports.createGovernanceGuard(...args);
  },
  createFileWorkflowHostCapabilityWithProof: (
    ...args: Parameters<typeof originalGovernanceBoundaryExports.createFileWorkflowHostCapabilityWithProof>
  ) => {
    return configuredWorkflowTestDoublesActive
      ? Promise.resolve({})
      : originalGovernanceBoundaryExports.createFileWorkflowHostCapabilityWithProof(...args);
  },
}));

const { loadRuntimeConfig, runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
const { buildDevelopmentTaskPacket: buildPublicDevelopmentTaskPacket, loadRuntimeConfig: loadPublicRuntimeConfig } =
  await import('../src/index.ts');
const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
const { issueHostGovernanceCapability } = actualGovernanceBoundary;
const { loadProjectSetContext } = await import('../src/config/project-context.ts');
const { createConfiguredMastra } = await import('../src/orchestration/mastra-boundary.ts');
const {
  createRuntimeKernel,
  createRuntimeKernelHost,
  createRuntimeKernelHostProofForCompositionRoot,
  createRuntimeKernelHostWithProof,
  createTestTrustedHostLauncherCapability,
  createTrustedHostComposition,
  dispatchWorkflowAssignment,
  isRuntimeKernelHost,
  prepareWorkflowExecution,
} = await import('../src/runtime-kernel.ts');

const bundle = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
let root: string;
let yaml: string;
let config: AgentRuntimeConfig;
let calls: TrustedWorkflowAssignment[];
let workItem: WorkflowWorkItem;
let contextState: {
  checkpointRevision: number;
  checkpointDigest: string;
  runtimeRevision: number;
  ledgerRevision: number;
  expiresAt: string;
};
let resolverCalls: number;
let fixtureProjectIntegrationsDigest: string;

function fixtureIntegrationsDigest() {
  return fixtureProjectIntegrationsDigest;
}

beforeEach(async () => {
  configuredWorkflowTestDoublesActive = true;
  try {
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
    createInitializationBundle(bundle, root, ['schemas', 'instructions', 'TESTING.md'], 'runtime');
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
  } catch (error) {
    configuredWorkflowTestDoublesActive = false;
    throw error;
  }
});

afterEach(async () => {
  configuredWorkflowTestDoublesActive = false;
  if (root) await rm(root, { recursive: true, force: true });
});

function publicPacketInput(
  overrides: Partial<MutableTree<DevelopmentTaskPacketInput>> = {},
): MutableTree<DevelopmentTaskPacketInput> {
  const riskFlags: string[] = [];
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
    expected_tests: ['bun test tests/configured-workflow.test.ts'],
    delivery_conditions: ['The public packet contract is verified.'],
    source_revision: 'git:test',
    lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
    ...overrides,
  };
}

function packetInputWithText(field: PacketTextField, text: string): MutableTree<DevelopmentTaskPacketInput> {
  const input = publicPacketInput();
  if (field === 'objective' || field === 'source_revision') {
    input[field] = text;
  } else if (field === 'risk_flags' || field === 'work_item.risk_flags') {
    input.risk_flags = [text];
    input.work_item = { ...input.work_item, risk_flags: [text] };
  } else if (field === 'work_item.labels') {
    input.work_item = { ...input.work_item, labels: [text] };
  } else if (field === 'work_item.kind' || field === 'work_item.intent') {
    Reflect.set(input.work_item, field.slice('work_item.'.length), text);
  } else if (field === 'acceptance') input.acceptance = [text];
  else if (field === 'out_of_scope') input.out_of_scope = [text];
  else if (field === 'implementation_constraints') input.implementation_constraints = [text];
  else if (field === 'security_constraints') input.security_constraints = [text];
  else if (field === 'research_artifact_refs') input.research_artifact_refs = [text];
  else if (field === 'skill_refs') input.skill_refs = [text];
  else if (field === 'documentation_refs') input.documentation_refs = [text];
  else if (field === 'code_evidence_refs') input.code_evidence_refs = [text];
  else if (field === 'in_scope') input.in_scope = [text];
  else if (field === 'affected_symbols') input.affected_symbols = [text];
  else if (field === 'failed_approaches') input.failed_approaches = [text];
  else if (field === 'prohibited_patterns') input.prohibited_patterns = [text];
  else if (field === 'expected_tests') input.expected_tests = [text];
  else if (field === 'delivery_conditions') input.delivery_conditions = [text];
  else {
    const exhaustive: never = field;
    return exhaustive;
  }
  return input;
}

function buildPublicPacketFromInput(
  config: AgentRuntimeConfig,
  input: DevelopmentTaskPacketInput,
): ReturnType<typeof buildPublicDevelopmentTaskPacket> {
  return buildPublicDevelopmentTaskPacket(config, input);
}

function packetFieldValue(
  packet: ReturnType<typeof buildPublicDevelopmentTaskPacket>,
  field: PacketTextField,
): unknown {
  if (field === 'objective') return packet.objective;
  if (field === 'source_revision') return packet.source_revision;
  if (field === 'risk_flags' || field === 'work_item.risk_flags') return packet.risk_flags;
  if (field === 'work_item.labels') return packet.work_item.labels;
  if (field === 'work_item.kind') return packet.work_item.kind;
  if (field === 'work_item.intent') return packet.work_item.intent;
  if (field === 'acceptance') return packet.acceptance;
  if (field === 'out_of_scope') return packet.out_of_scope;
  if (field === 'implementation_constraints') return packet.implementation_constraints;
  if (field === 'security_constraints') return packet.security_constraints;
  if (field === 'research_artifact_refs') return packet.research_artifact_refs;
  if (field === 'skill_refs') return packet.skill_refs;
  if (field === 'documentation_refs') return packet.documentation_refs;
  if (field === 'code_evidence_refs') return packet.code_evidence_refs;
  if (field === 'in_scope') return packet.in_scope;
  if (field === 'affected_symbols') return packet.affected_symbols;
  if (field === 'failed_approaches') return packet.failed_approaches;
  if (field === 'prohibited_patterns') return packet.prohibited_patterns;
  if (field === 'expected_tests') return packet.expected_tests;
  return packet.delivery_conditions;
}

test('public DevelopmentTaskPacket screening accepts ordinary prose and short protocol labels', () => {
  const publicConfig = loadPublicRuntimeConfig(root);
  const ordinary: readonly (readonly [PacketTextField, string])[] = [
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
    const packet = buildPublicPacketFromInput(publicConfig, packetInputWithText(field, text));
    const result = packetFieldValue(packet, field);
    expect(result).toEqual(field === 'objective' || field === 'source_revision' ? text : [text]);
  }
});

test('public DevelopmentTaskPacket screening rejects credentials across descriptive fields', () => {
  const publicConfig = loadPublicRuntimeConfig(root);
  const fields: readonly PacketTextField[] = [
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
    expect(() => buildPublicPacketFromInput(publicConfig, packetInputWithText(field, 'api_key=opaque'))).toThrow(
      /sensitive material/,
    );
  }

  const sensitive: readonly (readonly [PacketTextField, string])[] = [
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
    expect(() => buildPublicPacketFromInput(publicConfig, packetInputWithText(field, text))).toThrow(
      /sensitive material/,
    );
  }
});

function fixtureAttempts(): AttemptFixture {
  const records = new Map<string, WorkflowAttemptReceipt>();
  const previewReceipt = (invocation: TrustedWorkflowAssignment, requestDigest: string): WorkflowAttemptReceipt => {
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
        correction_generation: 0,
        correction_authorization: null,
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
    approvalPolicy: null,
    governanceCapability: issueHostGovernanceCapability({
      workspaceId: 'f'.repeat(64),
      reserveOperation: () => null,
      inspectOperation: () => null,
      transitionOperation: () => {},
      consumeApproval: async () => {},
    }),
    async claimWorkflowAssignment(
      invocation: TrustedWorkflowAssignment,
      requestDigest: string,
    ): Promise<WorkflowAttemptReceipt> {
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
    async claimWorkflowAssignmentWithApproval(
      invocation: TrustedWorkflowAssignment,
      requestDigest: string,
      action: 'source.write' | 'delivery.execute',
    ): Promise<WorkflowAttemptApprovalAuthorization> {
      const preview = previewReceipt(invocation, requestDigest);
      const prior = records.get(preview.attempt.assignment_id);
      if (prior?.attempt.status === 'completed')
        return { receipt: await this.claimWorkflowAssignment(invocation, requestDigest), approval: null };
      if (prior) throw new Error('attempt requires reconciliation');
      let approved = false;
      await this.approvalPolicy?.({ ...invocation, attempt: preview.attempt }, action, requestDigest, async () => {
        if (approved) throw new Error('workflow approval callback replay');
        approved = true;
        return true;
      });
      if (!approved) throw new Error('workflow approval consumer did not invoke the authorization callback');
      const receipt = await this.claimWorkflowAssignment(invocation, requestDigest);
      const approval: WorkflowApprovalConsumptionRecord = {
        schema: 'EdictumWorkflowApprovalConsumption/v1',
        store_id: 'fixture-store',
        store_generation: randomUUID(),
        binding: {
          stage_id: invocation.stage.id,
          approval_id: randomUUID(),
          operation_hash: requestDigest,
          tenant: invocation.workContext.binding.repository_id,
          project: requireFixtureValue(invocation.workContext.binding.project_ids[0]),
        },
        fencing_token: randomUUID(),
        status: 'reserved',
        reserved_at: new Date().toISOString(),
        approval_expires_at: null,
        attempt_id: receipt.attempt.attempt_id,
      };
      return { receipt, approval };
    },
    async beginWorkflowAttemptEffect(
      authorization: WorkflowAttemptApprovalAuthorization,
    ): Promise<WorkflowAttemptApprovalAuthorization> {
      if (authorization.approval?.status !== 'reserved') throw new Error('approval reservation invalid');
      return { ...authorization, approval: { ...authorization.approval, status: 'commit_unknown' } };
    },
    async completeWorkflowAttemptWithApproval(
      authorization: WorkflowAttemptApprovalAuthorization,
      result: unknown,
    ): Promise<WorkflowAttemptApprovalAuthorization> {
      if (authorization.approval?.status !== 'commit_unknown') throw new Error('approval outcome invalid');
      return {
        receipt: await this.completeWorkflowAttempt(authorization.receipt, result),
        approval: {
          ...authorization.approval,
          status: 'applied',
          terminal_at: new Date().toISOString(),
        },
      };
    },
    abortUnstartedWorkflowAttempt(
      authorization: Parameters<
        NonNullable<TrustedHostServices['workflowAttempts']>['abortUnstartedWorkflowAttempt']
      >[0],
    ) {
      if ('receipt' in authorization) {
        if (authorization.approval?.status !== 'reserved') throw new Error('approval outcome unknown');
        records.delete(authorization.receipt.attempt.assignment_id);
      } else {
        records.delete(authorization.attempt.assignment_id);
      }
    },
    async completeWorkflowAttempt(receipt: WorkflowAttemptReceipt, result: unknown): Promise<WorkflowAttemptReceipt> {
      const completed: WorkflowAttemptReceipt = {
        ...receipt,
        attempt: { ...receipt.attempt, status: 'completed', result, result_digest: canonicalJsonDigest(result) },
      };
      records.set(receipt.attempt.assignment_id, completed);
      return completed;
    },
    async markWorkflowAttemptUncertain(receipt: WorkflowAttemptReceipt): Promise<WorkflowAttemptReceipt> {
      const uncertain: WorkflowAttemptReceipt = { ...receipt, attempt: { ...receipt.attempt, status: 'uncertain' } };
      records.set(receipt.attempt.assignment_id, uncertain);
      return uncertain;
    },
  };
}

function withoutWorkflowApproval(attempts: AttemptFixture): NonNullable<TrustedHostServices['workflowAttempts']> {
  const {
    claimWorkflowAssignmentWithApproval: _claimWithApproval,
    beginWorkflowAttemptEffect: _beginEffect,
    completeWorkflowAttemptWithApproval: _completeWithApproval,
    ...workflowAttempts
  } = attempts;
  return workflowAttempts;
}

async function compose(
  permittedOperations: Parameters<
    typeof createTestTrustedHostLauncherCapability
  >[0]['authentication']['permittedOperations'] = ['workflow', 'runtime.write'],
  service: NonNullable<TrustedHostServices['dispatchWorkflowAssignment']> | null = async (value) => {
    calls.push(value);
    return { observed: value.assignment.role };
  },
  validateResult: TrustedHostServices['validateWorkflowAssignmentResult'] | null = () => {},
  resolveContext: TrustedHostServices['resolveWorkExecutionContext'] | null = fixtureWorkContext,
  attempts: AttemptFixture | null = fixtureAttempts(),
  migrationRebindVerifier?: TrustedHostServices['migrationRebindVerifier'],
  consumeWorkflowApproval: ApprovalConsumer | null = (_invocation, _action, _requestDigest, apply) => apply(),
  authenticationIntegrationsDigest: string = fixtureIntegrationsDigest(),
) {
  const services = {
    ...(attempts ? { governanceCapability: attempts.governanceCapability } : {}),
    ...(attempts
      ? {
          workflowAttempts:
            consumeWorkflowApproval === null
              ? withoutWorkflowApproval(attempts)
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

function request(overrides: Partial<FixtureRequest> = {}): FixtureRequest {
  const value = {
    repositoryRoot: root,
    configDigest: runtimeConfigDigest(config),
    teamId: 'default-development',
    workflowId: 'information_research_light',
    stageId: requireFixtureValue(config.workflows.information_research_light).entry_stage,
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

function fixtureWorkContext(
  invocation: Pick<WorkExecutionContextRequest, 'teamId' | 'workflowId' | 'workItem' | 'stageId' | 'assignmentIndex'>,
): WorkExecutionContext {
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

function contextAuthorityDigest(context: WorkExecutionContext): string {
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
  const unsafeScopedPathCases: readonly (readonly [string, (context: WorkExecutionContext) => void])[] = [
    '.git/config',
    'a/CON.txt',
    'a/file.',
    'a/file ',
    'a/*.ts',
    '~user/file',
    'a/COM¹',
    'a/\u0000file',
  ].map((unsafePath): readonly [string, (context: WorkExecutionContext) => void] => [
    'unsafe scoped path ' + JSON.stringify(unsafePath),
    (context) => {
      setFixtureField(context.binding, 'implementation_paths', [unsafePath]);
      setFixtureField(context.binding, 'allowed_resources', ['file:' + unsafePath]);
      setFixtureField(context.permit.lease, 'active_resources', ['file:' + unsafePath]);
    },
  ]);
  test.each(['valid', 'attempt', 'principal', 'future-ledger', 'work-digest'])(
    'reconciled completion is revalidated without dispatch; proof=%s',
    async (proof) => {
      const foreign = proof !== 'valid';
      const attempts = fixtureAttempts();
      attempts.reconciliationPrincipal = 'runtime:test-verifier';
      const claim = attempts.claimWorkflowAssignment;
      attempts.claimWorkflowAssignment = async (invocation, digest) => {
        const started = await claim(invocation, digest);
        const completed = await attempts.completeWorkflowAttempt(started, { recovered: true });
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
        await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), /reconciliation binding/);
      else
        expect(await dispatchFixture(host.workflowExecutionCapability, request())).toEqual({
          recovered: true,
        });
      expect(dispatched).toBe(0);
      expect(validated).toBe(foreign ? 0 : 1);
    },
  );

  test('rejects a completed attempt from a future or mismatched checkpoint version', async () => {
    const attempts = fixtureAttempts();
    const claim = attempts.claimWorkflowAssignment;
    attempts.claimWorkflowAssignment = async (invocation, digest) => {
      const started = await claim(invocation, digest);
      const completed = await attempts.completeWorkflowAttempt(started, { recovered: true });
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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), /work (binding|version)/);
  });

  test('rejects composition without a shared durable governance owner', async () => {
    await expectRejection(
      compose(
        ['workflow', 'runtime.write'],
        async () => ({}),
        () => {},
        fixtureWorkContext,
        null,
      ),
      /host governance capability is required/,
    );
  });

  test('rejects a trusted host whose integrations digest differs from ProjectContext', async () => {
    let dispatched = 0;
    await expectRejection(
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
      /integrations digest does not match the current project context/,
    );
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
      await expectRejection(createRuntimeKernel(root, host), /test-only trusted host issuer/);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  test('distributed runtime denies implicit governance even with test process flags', async () => {
    const packageRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
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
    const result = await promisify(execFile)('node', [path.join(packageRoot, 'bin/bun.ts'), '-e', script], {
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
        expect(requireFixtureValue(invocation.attempt).status).toBe('started');
        return { result: 'observed' };
      },
      () => {
        validated++;
        if (validated === 1) throw new Error('validator unavailable');
      },
    );
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), 'validator unavailable');
    await expectRejection(
      dispatchFixture(host.workflowExecutionCapability, request()),
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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), /work version is not current/);
    expect(attempts.attemptCount()).toBe(0);
  });

  test('unknown provider failure leaves an uncertain attempt and blocks redispatch', async () => {
    let dispatched = 0;
    let aborted = 0;
    const attempts = fixtureAttempts();
    const abort = attempts.abortUnstartedWorkflowAttempt;
    attempts.abortUnstartedWorkflowAttempt = async function (authorization) {
      aborted++;
      return await abort.call(this, authorization);
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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), 'provider outcome unknown');
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), 'reconciliation');
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
    await dispatchFixture(host.workflowExecutionCapability, request());
    const context = requireFixtureValue(calls[0]).workContext;
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
      (c: WorkExecutionContext) => {
        setFixtureField(c, 'schema', 'WorkExecutionContext/v2');
      },
    ],
    [
      'unknown field',
      (c: WorkExecutionContext) => {
        setFixtureField(c, 'checkpoint_protocol', 'old');
      },
    ],
    [
      'foreign project',
      (c: WorkExecutionContext) => {
        setFixtureField(c.binding, 'provider_work_item_id', 'foreign-project-work');
      },
    ],
    [
      'foreign work item',
      (c: WorkExecutionContext) => {
        setFixtureField(c.binding, 'provider_work_item_id', 'foreign');
      },
    ],
    [
      'changed work item',
      (c: WorkExecutionContext) => {
        setFixtureField(c.binding, 'work_item_digest', '0'.repeat(64));
      },
    ],
    [
      'foreign config',
      (c: WorkExecutionContext) => {
        setFixtureField(c.binding, 'config_digest', '0'.repeat(64));
      },
    ],
    [
      'stale runtime revision',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit, 'runtime_current_revision', 9);
      },
    ],
    [
      'foreign stage',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit, 'stage_id', 'foreign');
      },
    ],
    [
      'foreign assignment',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit, 'assignment_index', 12);
      },
    ],
    [
      'revoked dispatch',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit, 'dispatch_authorized', false);
      },
    ],
    [
      'expired lease',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit.lease, 'expires_at', '2020-01-01T00:00:00Z');
      },
    ],
    [
      'blocked lease',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit.lease, 'blocked_resources', ['file:src/task.ts']);
      },
    ],
    [
      'unowned scope path',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit.lease, 'active_resources', []);
      },
    ],
    [
      'path traversal',
      (c: WorkExecutionContext) => {
        setFixtureField(c.binding, 'implementation_paths', ['../task.ts']);
      },
    ],
    [
      'out-of-scope lease resource',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit.lease, 'active_resources', [...c.permit.lease.active_resources, 'file:src/other.ts']);
      },
    ],
    [
      'unsafe allowed resource',
      (c: WorkExecutionContext) => {
        setFixtureField(c.binding, 'allowed_resources', [...c.binding.allowed_resources, 'file:.git/config']);
      },
    ],
    [
      'zero runtime revision',
      (c: WorkExecutionContext) => {
        setFixtureField(c.permit, 'runtime_current_revision', 0);
        contextState.runtimeRevision = 0;
      },
    ],
    ...unsafeScopedPathCases,
    [
      'duplicate acceptance ID',
      (c: WorkExecutionContext) => {
        setFixtureField(c.binding, 'ac_ids', [...c.binding.ac_ids, 'AC-UNIT']);
      },
    ],
  ])('rejects %s before dispatch', async (_name: string, modify: (context: WorkExecutionContext) => void) => {
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
        setFixtureField(value.permit, 'context_digest', canonicalJsonDigest(value.binding));
        return value;
      },
    );
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()));
    expect(calls).toHaveLength(0);
  });

  test('permits monotonic checkpoint progress and lease renewal without changing authority', async () => {
    const validated: WorkExecutionContext[] = [];
    const host = await compose(undefined, undefined, (invocation) => {
      validated.push(invocation.workContext);
    });
    const input = request();
    await dispatchFixture(host.workflowExecutionCapability, input);
    contextState.checkpointRevision++;
    contextState.checkpointDigest = 'f'.repeat(64);
    contextState.runtimeRevision++;
    contextState.ledgerRevision++;
    contextState.expiresAt = new Date(Date.parse(contextState.expiresAt) + 3600000).toISOString();
    await dispatchFixture(host.workflowExecutionCapability, input);
    expect(calls).toHaveLength(1);
    expect(requireFixtureValue(validated[1]).permit.checkpoint_revision).toBe(2);
  });

  test.each(['checkpoint', 'ledger', 'runtime'])('rejects %s revision regression', async (kind) => {
    contextState.checkpointRevision = contextState.ledgerRevision = contextState.runtimeRevision = 2;
    const host = await compose();
    const input = request();
    await dispatchFixture(host.workflowExecutionCapability, input);
    contextState[
      kind === 'checkpoint' ? 'checkpointRevision' : kind === 'ledger' ? 'ledgerRevision' : 'runtimeRevision'
    ] = 1;
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), /revision regressed/);
    expect(calls).toHaveLength(1);
  });

  test('rejects changed checkpoint bytes without a new revision', async () => {
    const host = await compose();
    const input = request();
    await dispatchFixture(host.workflowExecutionCapability, input);
    contextState.checkpointDigest = 'f'.repeat(64);
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), /without revision/);
    expect(calls).toHaveLength(1);
  });

  test.each(['schema_digest', 'scope_contract_digest', 'acceptance_manifest_digest', 'runtime_code_digest'])(
    'requires explicit rebind after %s changes, even with a caller-recomputed digest',
    async (field) => {
      let changed = false;
      const resolve = (invocation: Parameters<typeof fixtureWorkContext>[0]) => {
        const value = fixtureWorkContext(invocation);
        if (changed) setFixtureField(value.binding, field, 'f'.repeat(64));
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
      await dispatchFixture(host.workflowExecutionCapability, request());
      changed = true;
      const changedContext = resolve({
        workItem,
        teamId: 'default-development',
        workflowId: 'information_research_light',
        stageId: 'research_parallel',
        assignmentIndex: 0,
      });
      await expectRejection(
        dispatchFixture(
          host.workflowExecutionCapability,
          request({ workContextDigest: contextAuthorityDigest(changedContext) }),
        ),
        /explicit rebind/,
      );
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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), /not authorized/);
    expect(calls).toHaveLength(1);
  });
});

describe('configured workflow host dispatch (isolated persistence adapters)', () => {
  test('returns the Edictum result when configuration remains current', async () => {
    const result: EvaluationResult = { ...defaultEvaluation, toolName: 'runtime.read' };
    governanceFault.evaluate = async () => result;
    const host = await compose(['workflow', 'runtime.read', 'runtime.write']);

    expect(await host.runtimeKernel.evaluateGovernance('runtime.read', {})).toBe(result);
  });

  test('rejects an Edictum result when configuration changes during governance evaluation', async () => {
    let markStarted: () => void = () => {};
    let releaseEvaluation: (result: EvaluationResult) => void = () => {};
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const evaluation = new Promise<EvaluationResult>((resolve) => {
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
      stringify({ ...mutableFixtureConfig(), config_id: 'changed-repository' }),
    );
    releaseEvaluation({ ...defaultEvaluation, toolName: 'runtime.read' });
    await expectRejection(pending, /configuration changed after composition/i);
    expect(returned).toBe(false);
  });

  test('rejects a forged capability before any operation', async () => {
    await expectRejection(dispatchFixture({}, request()), /opaque host capability/);
    expect(calls).toHaveLength(0);
  });

  test.each(['readConfig', 'readProjectContext', 'evaluateGovernance', 'runGovernedWrite'])(
    'blocks kernel %s when its configured operation is absent',
    async (id) => {
      const document = mutableFixtureConfig();
      setFixtureField(
        document.operations,
        'registry',
        document.operations.registry.filter((entry) => entry.id !== id),
      );
      await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
      config = loadRuntimeConfig(root);
      const host = await compose(['workflow', 'runtime.read', 'runtime.write']);
      const invoke = {
        readConfig: () => host.runtimeKernel.readConfig(),
        readProjectContext: () => host.runtimeKernel.readProjectContext(),
        evaluateGovernance: () => host.runtimeKernel.evaluateGovernance('runtime.read', {}),
        runGovernedWrite: () => host.runtimeKernel.runGovernedWrite({}),
      }[id];
      await expectRejection(invoke(), 'configured kernel operation is unavailable: ' + id);
      expect(calls).toHaveLength(0);
    },
  );

  test.each([
    ['tool', 'runtime.write'],
    ['governance_stage', 'source-write'],
    ['evidence_class', 'Runtime'],
    ['profile', 'researcher'],
  ])('blocks readConfig when configured %s is incompatible', async (field, value) => {
    const document = mutableFixtureConfig();
    setFixtureField(
      requireFixtureValue(document.operations.registry.find((entry) => entry.id === 'readConfig')),
      field,
      value,
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
    config = loadRuntimeConfig(root);
    const host = await compose(['workflow', 'runtime.read', 'runtime.write']);
    await expectRejection(host.runtimeKernel.readConfig(), 'configured kernel operation is unavailable: readConfig');
    expect(calls).toHaveLength(0);
  });

  test('issues execution only for an authorized host with a service', async () => {
    expect((await compose(['runtime.read'])).workflowExecutionCapability).toBeNull();
    expect((await compose(['workflow'], null)).workflowExecutionCapability).toBeNull();
    const host = await compose();
    expect(await dispatchFixture(host.workflowExecutionCapability, request())).toEqual({
      observed: 'documentation-researcher',
    });
    expect(calls).toHaveLength(1);
    expect(requireFixtureValue(calls[0]).operation.id).toBe('executeConfiguredWorkflow');
    expect(requireFixtureValue(calls[0]).profile).toEqual(
      requireFixtureValue(config.agents.profiles[requireFixtureValue(calls[0]).assignment.profile]),
    );
    expect(requireFixtureValue(calls[0]).roleInstruction).toEqual(
      requireFixtureValue(config.agents.role_instructions[requireFixtureValue(calls[0]).assignment.role]),
    );
    expect(requireFixtureValue(calls[0]).roleInstructionDigest).toBe(
      canonicalJsonDigest(requireFixtureValue(calls[0]).roleInstruction),
    );
    expect(requireFixtureValue(calls[0]).authentication.projectIds).toEqual(['example-project']);
    expect(Object.isFrozen(requireFixtureValue(calls[0]).input)).toBe(true);
  });

  test('passes edited role instructions from project YAML into the host assignment', async () => {
    const original = requireFixtureValue(config.agents.role_instructions['documentation-researcher']).rules[0];
    const originalRule = requireFixtureValue(original);
    const updated = originalRule + ' Preserve the configured source order.';
    yaml = yaml.replace(originalRule, updated);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), yaml);
    config = loadRuntimeConfig(root);
    const host = await compose();
    await dispatchFixture(host.workflowExecutionCapability, request());
    expect(calls).toHaveLength(1);
    expect(requireFixtureValue(calls[0]).roleInstruction.rules).toContain(updated);
    expect(requireFixtureValue(calls[0]).roleInstructionDigest).toBe(
      canonicalJsonDigest(requireFixtureValue(config.agents.role_instructions['documentation-researcher'])),
    );
  });

  test('blocks a bound host when project role instructions change', async () => {
    const host = await compose();
    const original = requireFixtureValue(
      requireFixtureValue(config.agents.role_instructions['documentation-researcher']).rules[0],
    );
    await writeFile(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      yaml.replace(original, original + ' Changed after host binding.'),
    );
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), /config/i);
    expect(calls).toHaveLength(0);
  });

  test.each([
    ['tool', 'runtime.read'],
    ['governance_stage', 'read-evidence'],
    ['evidence_class', 'Decision'],
    ['profile', 'researcher'],
  ])('blocks workflow dispatch when configured operation %s is incompatible', async (field, value) => {
    const document = mutableFixtureConfig();
    setFixtureField(
      requireFixtureValue(document.operations.registry.find((entry) => entry.id === 'executeConfiguredWorkflow')),
      field,
      value,
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
    config = loadRuntimeConfig(root);
    const host = await compose();
    await expectRejection(
      dispatchFixture(host.workflowExecutionCapability, request()),
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
    const document = mutableFixtureConfig();
    if (field === 'missing')
      setFixtureField(
        document.operations,
        'registry',
        document.operations.registry.filter((entry) => entry.id !== 'selectWorkflow'),
      );
    else
      setFixtureField(
        requireFixtureValue(document.operations.registry.find((entry) => entry.id === 'selectWorkflow')),
        field,
        value,
      );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(document));
    config = loadRuntimeConfig(root);
    const host = await compose();
    await expectRejection(
      dispatchFixture(host.workflowExecutionCapability, request()),
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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request(override)));
    expect(calls).toHaveLength(0);
  });

  test('blocks changed configuration even without a revision bump', async () => {
    const host = await compose();
    await writeFile(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      stringify({ ...mutableFixtureConfig(), config_id: 'changed-repository' }),
    );
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), /config/i);
    expect(calls).toHaveLength(0);
  });

  test('rejects a different repository before invoking the service', async () => {
    const host = await compose();
    await expectRejection(
      dispatchFixture(host.workflowExecutionCapability, request({ repositoryRoot: path.dirname(root) })),
      /repository binding/,
    );
    expect(calls).toHaveLength(0);
  });

  test('snapshots caller inputs before the asynchronous host boundary', async () => {
    const host = await compose();
    const input = request();
    const result = dispatchFixture(host.workflowExecutionCapability, input);
    input.input.work_item_id = 'substituted';
    setFixtureField(input, 'assignmentIndex', 1);
    await result;
    expect(readRecordField(requireFixtureValue(calls[0]).input, 'work_item_id')).toBe('fixture-work');
    expect(requireFixtureValue(calls[0]).assignment.role).toBe('documentation-researcher');
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
    const workflow = requireFixtureValue(config.workflows.implementation_new);
    const stage = requireFixtureValue(
      workflow.stages.find((value) => value.assignments.some((assignment) => assignment.risk_flags)),
    );
    const assignmentIndex = stage.assignments.findIndex((assignment) => assignment.risk_flags);
    const input = request({ workflowId: 'implementation_new', stageId: stage.id, assignmentIndex });
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), /risk binding/);
    expect(calls).toHaveLength(0);
    workItem.risk_flags = [...requireFixtureValue(requireFixtureValue(stage.assignments[assignmentIndex]).risk_flags)];
    await dispatchFixture(
      host.workflowExecutionCapability,
      request({ workflowId: 'implementation_new', stageId: stage.id, assignmentIndex }),
    );
    expect(calls).toHaveLength(1);
  });

  test('does not grant source-write permission through workflow permission', async () => {
    const host = await compose(['workflow']);
    const stage = requireFixtureValue(
      requireFixtureValue(config.workflows.implementation_new).stages.find((value) => value.kind === 'develop'),
    );
    await expectRejection(
      dispatchFixture(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: stage.id }),
      ),
      /runtime.write/,
    );
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
    await expectRejection(
      dispatchFixture(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: 'develop_change' }),
      ),
      'trusted host atomic workflow approval service is required',
    );
    expect(calls).toHaveLength(0);
  });

  const protectedApprovalCases: readonly (readonly [string, 'source.write' | 'delivery.execute'])[] = [
    ['develop_change', 'source.write'],
    ['prepare_delivery', 'delivery.execute'],
  ];
  test.each(protectedApprovalCases)(
    'consumes the configured %s approval before provider dispatch',
    async (stageId: string, action: 'source.write' | 'delivery.execute') => {
      workItem = {
        ...workItem,
        provider: 'azure',
        provider_type: 'Feature',
        canonical_kind: 'feature',
        intent: 'implementation_new',
      };
      const order: string[] = [];
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
          expect(requestDigest).toBe(requireFixtureValue(invocation.attempt).request_digest);
          expect(invocation.workContext.binding.project_ids).toEqual(['example-project']);
          expect(requireFixtureValue(invocation.attempt).status).toBe('started');
          order.push('approval');
          return apply();
        },
      );
      expect(
        await dispatchFixture(host.workflowExecutionCapability, request({ workflowId: 'implementation_new', stageId })),
      ).toEqual({ accepted: true });
      expect(order).toEqual(['approval', 'provider']);
    },
  );

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
    expect(await dispatchFixture(host.workflowExecutionCapability, request())).toEqual({
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
  ] satisfies readonly ApprovalAdmissionCase[])(
    'does not claim an attempt when host approval admission is %s',
    async (_case: string, consume: ApprovalConsumer, error: RegExp) => {
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
      await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), error);
      expect(dispatched).toBe(0);
      expect(attempts.attemptCount()).toBe(0);
      await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), error);
      expect(dispatched).toBe(0);
      expect(attempts.attemptCount()).toBe(0);
    },
  );

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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), 'provider failed');
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), /reconciliation/);
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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), /artifact validation failed/);
    expect(dispatched).toBe(1);
    expect(attempts.attemptCount()).toBe(1);
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), /reconciliation/);
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
    const claim = attempts.claimWorkflowAssignmentWithApproval.bind(attempts);
    attempts.claimWorkflowAssignmentWithApproval = async function (invocation, requestDigest, action) {
      const authorization = await claim(invocation, requestDigest, action);
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
    await expectRejection(
      dispatchFixture(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: 'develop_change' }),
      ),
      /attempt/,
    );
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

    await expectRejection(
      dispatchFixture(
        host.workflowExecutionCapability,
        request({ workflowId: 'implementation_new', stageId: 'develop_change' }),
      ),
      'pre-effect context unavailable',
    );
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
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input), /lease/);
    expect(dispatched).toBe(0);
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, input));
    expect(dispatched).toBe(0);
  });

  test('requires the declared operation permission even for a research assignment', async () => {
    const host = await compose(['workflow']);
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), /runtime.write/);
    expect(calls).toHaveLength(0);
  });

  test.each([
    { project_id: 'foreign-project' },
    { id: 'foreign-work' },
    { canonical_kind: 'task' },
    { intent: 'task_execution' },
    { provider_type: 'Unknown' },
    { risk_flags: ['security', 'security'] },
  ] satisfies readonly Partial<WorkflowWorkItem>[])(
    'rejects invalid authoritative work-item binding %j',
    async (override: Partial<WorkflowWorkItem>) => {
      const host = await compose();
      workItem = { ...workItem, ...override };
      await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()));
      expect(calls).toHaveLength(0);
    },
  );

  test('rejects an allowlisted workflow that does not match the authoritative work item', async () => {
    const host = await compose();
    await expectRejection(
      dispatchFixture(
        host.workflowExecutionCapability,
        request({
          workflowId: 'task_execution',
          stageId: requireFixtureValue(config.workflows.task_execution).entry_stage,
        }),
      ),
      /route binding/,
    );
    expect(calls).toHaveLength(0);
  });

  test('does not accept caller-supplied risk flags in place of host work-item risks', async () => {
    workItem.risk_flags = ['security'];
    const host = await compose();
    await expectRejection(
      dispatchFixture(host.workflowExecutionCapability, request({ riskFlags: [] })),
      /fields are invalid/,
    );
    expect(calls).toHaveLength(0);
  });

  test('propagates service failure without a synthetic successful result', async () => {
    const host = await compose(['workflow', 'runtime.write'], async () => {
      throw new Error('assignment failed');
    });
    await expectRejection(dispatchFixture(host.workflowExecutionCapability, request()), 'assignment failed');
  });
});

function configuredGraph(host: Awaited<ReturnType<typeof compose>>, requestWorkItem?: WorkItemSelection) {
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
    { workflowExecutionCapability: requireWorkflowCapability(host) },
  );
}

describe('real configured Mastra graph (unit host adapters, not artifact or persistence acceptance)', () => {
  const configuredWorkflows: readonly (readonly [
    string,
    WorkItemSelection['intent'],
    WorkItemSelection['kind'],
    string,
    string,
  ])[] = [
    ['information_research_light', 'information_research', 'research', 'internal', 'Research'],
    ['implementation_new', 'implementation_new', 'feature', 'azure', 'Feature'],
    ['implementation_change', 'implementation_change', 'feature', 'azure', 'Feature'],
    ['bug_fix', 'bug_fix', 'bug', 'azure', 'Bug'],
    ['task_execution', 'task_execution', 'task', 'azure', 'Task'],
  ];
  test.each(configuredWorkflows)(
    'executes every configured stage for %s through the host',
    async (workflowId, intent, kind, provider, providerType) => {
      workItem = { ...workItem, intent, canonical_kind: kind, provider, provider_type: providerType };
      const host = await compose();
      const graph = configuredGraph(host);
      const result = await graph.dispatch(workItem.id);
      expect(result.workflowId).toBe(workflowId);
      expect(result.failedAssignments).toEqual([]);
      for (const stage of requireFixtureValue(config.workflows[workflowId]).stages) {
        const outputs = requireFixtureValue(result.stageOutputs[stage.id]);
        const stageMatchesRisk =
          !stage.risk_flags?.length || stage.risk_flags.some((risk) => workItem.risk_flags.includes(risk));
        const expected = stageMatchesRisk
          ? stage.assignments.filter(
              (assignment) =>
                !assignment.risk_flags?.length ||
                assignment.risk_flags.some((risk) => workItem.risk_flags.includes(risk)),
            )
          : [];
        expect(outputs.map((value) => value.role)).toEqual(expected.map((a) => a.role));
        for (const call of calls.filter((value) => value.stage.id === stage.id)) {
          for (const prior of stage.required_after)
            expect(readRecordField(readRecordField(call.input, 'stage_outputs'), prior)).toEqual(
              requireFixtureValue(result.stageOutputs[prior]),
            );
        }
        for (const output of outputs) expect(output.outputDigest).toBe(canonicalJsonDigest(output.output));
      }
      expect(calls.length).toBe(Object.values(result.stageOutputs).flat().length);
    },
  );

  test('always runs the read-only source plan and keeps security review risk-filtered', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
      risk_flags: [],
    };
    const compiled = compileDevelopmentWorkflow(config, 'default-development', 'implementation_new', []);
    const prewriter = compiled.waves.flat().find((stage) => stage.id === 'review_source_prewrite');
    expect(prewriter?.mode).toBe('parallel');
    expect(prewriter?.assignments).toEqual([expect.objectContaining({ role: 'source-planner', profile: 'architect' })]);
    expect(prewriter?.required_after).toEqual(['synthesize_task']);

    const result = await configuredGraph(await compose()).dispatch(workItem.id);
    expect(result.failedAssignments).toEqual([]);
    expect(requireFixtureValue(result.stageOutputs.review_source_prewrite).map((value) => value.role)).toEqual([
      'source-planner',
    ]);
    expect(
      calls.filter((call) => call.stage.id === 'review_source_prewrite').map((call) => call.assignment.role),
    ).toEqual(['source-planner']);
    const developer = calls.find((call) => call.stage.kind === 'develop');
    expect(
      arrayValues(readRecordField(readRecordField(developer?.input, 'stage_outputs'), 'review_source_prewrite')).map(
        (value) => readRecordField(value, 'role'),
      ),
    ).toEqual(['source-planner']);
    expect(calls.some((call) => call.stage.kind === 'validate')).toBe(true);
  });

  test.each(['implementation_new', 'implementation_change', 'bug_fix', 'task_execution'])(
    'keeps the planner at low risk and enables the security assignment only for protected risks in %s',
    (workflowId) => {
      const stageFor = (riskFlags: readonly string[]) =>
        compileDevelopmentWorkflow(config, 'default-development', workflowId, riskFlags)
          .waves.flat()
          .find((stage) => stage.id === 'review_source_prewrite');
      expect(stageFor([])?.assignments.map((assignment) => assignment.role)).toEqual(['source-planner']);
      for (const risk of ['security', 'data_loss', 'migration', 'high']) {
        expect(stageFor([risk])?.assignments.map((assignment) => assignment.role)).toEqual([
          'source-planner',
          'security-prewriter',
        ]);
      }
    },
  );

  test('high lifecycle risk enables the source prewriter with empty packet flags and keeps canonical action ids', () => {
    const riskFlags: string[] = [];
    const selection: WorkItemSelection = {
      team: 'default-development',
      kind: 'feature',
      intent: 'implementation_new',
      project: 'example-project',
      risk_flags: riskFlags,
      labels: [],
    };
    const context = { work_id: 'fixture-work', attempt: 1, scope_digest: 'a'.repeat(64) };
    const low = compileDevelopmentWorkflow(config, selection.team, selection.intent, riskFlags, 'low');
    const high = compileDevelopmentWorkflow(config, selection.team, selection.intent, riskFlags, 'high');
    const lowPrewriter = low.waves.flat().find((stage) => stage.id === 'review_source_prewrite');
    const highWaveIndex = high.waves.findIndex((wave) => wave.some((stage) => stage.id === 'review_source_prewrite'));
    const highPrewriter = high.waves[highWaveIndex]?.find((stage) => stage.id === 'review_source_prewrite');
    const actions = sessionActionsForWave(
      config,
      selection,
      context,
      selection.intent,
      highWaveIndex,
      [],
      undefined,
      'high',
    );

    expect(lowPrewriter?.assignments.map((assignment) => assignment.role)).toEqual(['source-planner']);
    expect(highPrewriter?.assignments.map((assignment) => assignment.role)).toEqual([
      'source-planner',
      'security-prewriter',
    ]);
    expect(actions.map((action) => action.role)).toEqual(['source-planner', 'security-prewriter']);
    expect(actions.map((action) => action.action_id)).toEqual(
      [0, 1].map((assignment_index) =>
        canonicalJsonDigest({
          context,
          workflow_id: selection.intent,
          wave_index: highWaveIndex,
          stage_id: 'review_source_prewrite',
          assignment_index,
        }),
      ),
    );
    expect(riskFlags).toEqual([]);
  });

  test('runs the configured read-only prewriter for high-risk Source work', async () => {
    workItem = {
      ...workItem,
      provider: 'azure',
      provider_type: 'Feature',
      canonical_kind: 'feature',
      intent: 'implementation_new',
      risk_flags: ['high'],
    };
    for (const risk of ['security', 'data_loss', 'migration', 'high']) {
      const compiled = compileDevelopmentWorkflow(config, 'default-development', 'implementation_new', [risk]);
      expect(
        compiled.waves
          .flat()
          .find((stage) => stage.id === 'review_source_prewrite')
          ?.assignments.map((assignment) => assignment.role),
      ).toEqual(['source-planner', 'security-prewriter']);
    }

    await configuredGraph(await compose()).dispatch(workItem.id);
    const prewriterCalls = calls.filter((call) => call.stage.id === 'review_source_prewrite');
    expect(prewriterCalls.map((call) => call.assignment.role)).toEqual(['source-planner', 'security-prewriter']);
    expect(prewriterCalls[0]?.assignment).toMatchObject({ role: 'source-planner', profile: 'architect' });
    expect(prewriterCalls[1]?.assignment).toMatchObject({ role: 'security-prewriter', profile: 'reviewer-security' });
    expect(
      prewriterCalls.every(
        (call) => readRecordField(readRecordField(call.input, 'stage_outputs'), 'synthesize_task') !== undefined,
      ),
    ).toBe(true);
    const developer = calls.find((call) => call.stage.kind === 'develop');
    expect(
      arrayValues(readRecordField(readRecordField(developer?.input, 'stage_outputs'), 'review_source_prewrite')).map(
        (value) => readRecordField(value, 'role'),
      ),
    ).toEqual(['source-planner', 'security-prewriter']);
  });

  test('loads and compiles legacy workflow configuration without the new prewrite stage for read-only inspection', async () => {
    const fixture = mutableFixtureConfig();
    const workflowIds = ['implementation_new', 'implementation_change', 'bug_fix', 'task_execution'];
    for (const workflowId of workflowIds) {
      const workflow = requireFixtureValue(fixture.workflows[workflowId]);
      const developer = requireFixtureValue(workflow.stages.find((stage) => stage.kind === 'develop'));
      setFixtureField(
        workflow,
        'stages',
        workflow.stages.filter((stage) => stage.id !== 'review_source_prewrite'),
      );
      setFixtureField(
        workflow,
        'edges',
        workflow.edges.filter(([from, to]) => from !== 'review_source_prewrite' && to !== 'review_source_prewrite'),
      );
      setFixtureField(developer, 'required_after', ['synthesize_task']);
      setFixtureField(workflow, 'edges', [...workflow.edges, ['synthesize_task', developer.id]]);
    }
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    const legacyConfig = loadRuntimeConfig(root);
    for (const workflowId of workflowIds) {
      for (const risks of [[], ['high']]) {
        const compiled = compileDevelopmentWorkflow(legacyConfig, 'default-development', workflowId, risks);
        expect(compiled.waves.flat().some((stage) => stage.id === 'review_source_prewrite')).toBe(false);
      }
    }
    expect(calls).toHaveLength(0);
  });

  test('rejects a foreign prewrite stage for low and high-risk Source workflows', async () => {
    const fixture = mutableFixtureConfig();
    const workflow = requireFixtureValue(fixture.workflows.implementation_new);
    const prewriter = requireFixtureValue(workflow.stages.find((stage) => stage.id === 'review_source_prewrite'));
    const developer = requireFixtureValue(workflow.stages.find((stage) => stage.kind === 'develop'));
    setFixtureField(prewriter, 'id', 'foreign_source_prewrite');
    setFixtureField(developer, 'required_after', ['foreign_source_prewrite']);
    setFixtureField(
      workflow,
      'edges',
      workflow.edges.map(([from, to]) => [
        from === 'review_source_prewrite' ? 'foreign_source_prewrite' : from,
        to === 'review_source_prewrite' ? 'foreign_source_prewrite' : to,
      ]),
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(
      /permits only the exact configured read-only source planner and risk-filtered security prewriter/,
    );
    expect(calls).toHaveLength(0);
  });

  test.each([
    [
      'planner absent',
      (stage: WorkflowStage) =>
        setFixtureField(
          stage,
          'assignments',
          stage.assignments.filter((assignment) => assignment.role !== 'source-planner'),
        ),
    ],
    [
      'planner replaced by another read-only role',
      (stage: WorkflowStage) => {
        const planner = requireFixtureValue(
          stage.assignments.find((assignment) => assignment.role === 'source-planner'),
        );
        setFixtureField(planner, 'role', 'correctness-validator');
        setFixtureField(planner, 'profile', 'reviewer-correctness');
      },
    ],
    [
      'planner risk-filtered',
      (stage: WorkflowStage) => {
        setFixtureField(
          requireFixtureValue(stage.assignments.find((assignment) => assignment.role === 'source-planner')),
          'risk_flags',
          ['high'],
        );
      },
    ],
    ['whole stage risk-filtered', (stage: WorkflowStage) => setFixtureField(stage, 'risk_flags', ['high'])],
    [
      'security filter moved to the whole stage',
      (stage: WorkflowStage) => {
        setFixtureField(stage, 'risk_flags', ['security', 'data_loss', 'migration', 'high']);
        Reflect.deleteProperty(
          requireFixtureValue(stage.assignments.find((assignment) => assignment.role === 'security-prewriter')),
          'risk_flags',
        );
      },
    ],
    ['planner and security made serial', (stage: WorkflowStage) => setFixtureField(stage, 'mode', 'single')],
    [
      'planner moved after the security assignment',
      (stage: WorkflowStage) => setFixtureField(stage, 'assignments', [...stage.assignments].reverse()),
    ],
  ])('rejects a read-only bypass shape when %s', async (_name, changeStage: (stage: WorkflowStage) => void) => {
    const fixture = mutableFixtureConfig();
    const stage = requireFixtureValue(
      requireFixtureValue(fixture.workflows.implementation_new).stages.find(
        (value) => value.id === 'review_source_prewrite',
      ),
    );
    changeStage(stage);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(
      /permits only the exact configured read-only source planner|cannot produce its stage artifacts/,
    );
    expect(calls).toHaveLength(0);
  });

  test('rejects a pre-development validator that produces ValidationReceipt/v1', async () => {
    const fixture = mutableFixtureConfig();
    const stage = requireFixtureValue(
      requireFixtureValue(fixture.workflows.implementation_new).stages.find(
        (value) => value.id === 'review_source_prewrite',
      ),
    );
    setFixtureField(requireFixtureValue(stage.assignments[0]), 'role', 'security-data-validator');
    setFixtureField(stage, 'produces', ['ValidationReceipt/v1']);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(
      /cannot produce its stage artifacts|requires the configured read-only source planner/,
    );
    expect(calls).toHaveLength(0);
  });

  test('rejects a source writer that precedes the configured prewriter', async () => {
    const fixture = mutableFixtureConfig();
    const workflow = requireFixtureValue(fixture.workflows.implementation_new);
    const prewriter = requireFixtureValue(workflow.stages.find((stage) => stage.id === 'review_source_prewrite'));
    const developer = requireFixtureValue(workflow.stages.find((stage) => stage.kind === 'develop'));
    setFixtureField(prewriter, 'required_after', ['develop_change']);
    setFixtureField(developer, 'required_after', ['synthesize_task']);
    setFixtureField(
      workflow,
      'edges',
      workflow.edges
        .filter(
          ([from, to]) =>
            !(from === 'synthesize_task' && to === 'review_source_prewrite') &&
            !(from === 'review_source_prewrite' && to === 'develop_change'),
        )
        .concat([
          ['synthesize_task', 'develop_change'],
          ['develop_change', 'review_source_prewrite'],
        ]),
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(
      /permits only the exact configured read-only source planner and risk-filtered security prewriter before development/,
    );
    expect(calls).toHaveLength(0);
  });

  test('rejects missing post-write validation even when the prewriter is configured', async () => {
    const fixture = mutableFixtureConfig();
    const workflow = requireFixtureValue(fixture.workflows.implementation_new);
    setFixtureField(
      workflow,
      'stages',
      workflow.stages.filter((stage) => stage.id !== 'validate_parallel'),
    );
    setFixtureField(
      workflow,
      'edges',
      workflow.edges.filter(([from, to]) => from !== 'validate_parallel' && to !== 'validate_parallel'),
    );
    const tester = requireFixtureValue(workflow.stages.find((stage) => stage.kind === 'test'));
    const delivery = requireFixtureValue(workflow.stages.find((stage) => stage.kind === 'deliver'));
    setFixtureField(tester, 'required_after', ['develop_change']);
    setFixtureField(
      tester,
      'consumes',
      tester.consumes.filter((artifact) => artifact !== 'ValidationReceipt/v1'),
    );
    setFixtureField(
      delivery,
      'consumes',
      delivery.consumes.filter((artifact) => artifact !== 'ValidationReceipt/v1'),
    );
    setFixtureField(workflow, 'edges', [...workflow.edges, ['develop_change', tester.id]]);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(/must include post-write validation, test, and delivery stages/);
    expect(calls).toHaveLength(0);
  });

  test.each([
    ['research_parallel', 'implementation_new'],
    ['develop_change', 'implementation_new'],
  ])('continues to reject an arbitrary empty required %s stage', async (stageId, workflowId) => {
    const fixture = mutableFixtureConfig();
    const workflow = requireFixtureValue(fixture.workflows[workflowId]);
    const stage = requireFixtureValue(workflow.stages.find((value) => value.id === stageId));
    if (stage.kind === 'research') {
      setFixtureField(
        stage,
        'assignments',
        stage.assignments.map((assignment) => ({ ...assignment, risk_flags: ['high'] })),
      );
    } else {
      setFixtureField(stage, 'risk_flags', ['high']);
    }
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    config = loadRuntimeConfig(root);
    expect(() => compileDevelopmentWorkflow(config, 'default-development', workflowId, [])).toThrow(
      /missing a required stage after risk filters|without an effective producer|requires effective terminal stage/,
    );
    expect(calls).toHaveLength(0);
  });

  test('requires an actual execution capability even when preview compilation succeeded', async () => {
    await expectRejection(createConfiguredMastra(root).dispatch(workItem.id), /opaque host capability/);
    await expectRejection(
      dispatchMastraWithUnknownExecution({ workflowExecutionCapability: {} }),
      /opaque host capability/,
    );
    expect(calls).toHaveLength(0);
  });

  test('rejects workflow edges that diverge from declared stage prerequisites', async () => {
    const fixture = mutableFixtureConfig();
    const workflow = requireFixtureValue(fixture.workflows.information_research_light);
    setFixtureField(
      workflow,
      'edges',
      workflow.edges.filter(
        ([from, to]) => !(from === workflow.entry_stage && to === requireFixtureValue(workflow.stages[1]).id),
      ),
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    expect(() => loadRuntimeConfig(root)).toThrow(/prerequisites do not match edges/);
    expect(calls).toHaveLength(0);
  });

  test('test-only trusted host issuers reject a production process', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(() => callNegativeSourceBoundary(createTestTrustedHostLauncherCapability)).toThrow(
        /outside a test process/,
      );
      expect(() => callNegativeSourceBoundary(createRuntimeKernelHostProofForCompositionRoot)).toThrow(
        /outside a test process/,
      );
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  test('binds migration rebind verification to the authenticated work and principal', async () => {
    const verify: MigrationRebindVerifier['verify'] = mock(
      (
        _request: Parameters<MigrationRebindVerifier['verify']>[0],
        _state: Parameters<MigrationRebindVerifier['verify']>[1],
      ) => null,
    );
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
    const rebindVerifier = requireMigrationRebindVerifier(host);
    expect(rebindVerifier.principal).toBe('fixture:executor');
    expect(verifyMigrationRebindFixture(rebindVerifier, request, state)).toBeNull();
    expect(verify).toHaveBeenCalledTimes(1);
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
      expect(() =>
        verifyMigrationRebindFixture(rebindVerifier, { identity: foreign.identity }, { work: foreign.work }),
      ).toThrow(/not bound to authenticated work/);
    const malformedBindingFields: readonly (readonly [
      'repository_id' | 'project_ids' | 'lifecycle_work_id',
      string | readonly string[],
    ])[] = [
      ['repository_id', 'foreign-repository'],
      ['project_ids', ['foreign-project']],
      ['lifecycle_work_id', 'foreign-work'],
    ];
    for (const [field, value] of malformedBindingFields)
      expect(() =>
        verifyMigrationRebindFixture(rebindVerifier, request, {
          work: { binding: { ...state.work.binding, [field]: value } },
        }),
      ).toThrow(/not bound to authenticated work/);
    expect(() => verifyMigrationRebindFixture(rebindVerifier, request, { work: null })).toThrow(
      /not bound to authenticated work/,
    );
    for (const malformed of [null, 'invalid', { identity: null }, { identity: 'invalid' }])
      expect(() => verifyMigrationRebindFixture(rebindVerifier, malformed, state)).toThrow(
        /migration rebind identity is invalid/,
      );
    const callableRequest = () => {};
    Reflect.set(callableRequest, 'identity', request.identity);
    expect(() => verifyMigrationRebindFixture(rebindVerifier, callableRequest, state)).toThrow(
      /migration rebind identity is invalid/,
    );
    expect(verify).toHaveBeenCalledTimes(1);
    await expectRejection(
      compose(undefined, undefined, undefined, undefined, undefined, { principal: 'foreign-principal', verify }),
      /principal is not authenticated/,
    );
    await expectRejection(
      compose(undefined, undefined, undefined, undefined, undefined, { principal: ' fixture:executor ', verify }),
      /trusted migration rebind verifier is invalid/,
    );
    await expectRejection(
      compose(['runtime.read'], undefined, undefined, undefined, undefined, verifier),
      /runtime.write/,
    );
  });

  test('requires a trusted result validator before issuing execution authority', async () => {
    expect(
      (await compose(['workflow', 'runtime.write'], async () => ({}), null)).workflowExecutionCapability,
    ).toBeNull();
  });

  test('rejects an unsupported standalone barrier stage during configuration loading', async () => {
    const fixture = mutableFixtureConfig();
    setFixtureField(
      requireFixtureValue(requireFixtureValue(fixture.workflows.information_research_light).stages[0]),
      'mode',
      'barrier',
    );
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
      team: 'default-development',
      risk_flags: [],
      labels: [],
    });
    await graph.dispatch(workItem.id);
    expect(calls.some((call) => call.assignment.risk_flags?.includes('security'))).toBe(true);
  });

  test('pins the authoritative work item and rejects drift before assignment', async () => {
    const host = await compose();
    const prepared = await prepareWorkflowExecution(requireWorkflowCapability(host), {
      repositoryRoot: root,
      configDigest: runtimeConfigDigest(config),
      teamId: 'default-development',
      workItemId: workItem.id,
    });
    workItem.title = 'Changed after preparation';
    await expectRejection(
      dispatchFixture(host.workflowExecutionCapability, request({ workItemDigest: prepared.workItemDigest })),
      /changed after preparation/,
    );
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
    await expectRejection(configuredGraph(host).dispatch(workItem.id), /execution failed/);
    expect(calls.every((call) => call.stage.kind === 'research')).toBe(true);
  });

  test('waits for parallel peers after failure and never starts the dependent stage', async () => {
    let unblock: () => void = () => {};
    let markStarted: () => void = () => {};
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    const started = new Promise<void>((resolve) => {
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
    await expectRejection(run, /execution failed/);
    expect(peerFinished).toBe(true);
    expect(calls.every((call) => call.stage.kind === 'research')).toBe(true);
  });

  test('drains started host calls when the engine start promise rejects unexpectedly', async () => {
    let rejectEngine: (error: unknown) => void = () => {};
    let unblock: () => void = () => {};
    let markStarted: () => void = () => {};
    engineFault.rejection = new Promise((_resolve, reject) => {
      rejectEngine = reject;
    });
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const blocked = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    let finished = 0;
    const host = await compose(['workflow', 'runtime.write'], async (call) => {
      calls.push(call);
      if (
        calls.length ===
        requireFixtureValue(requireFixtureValue(config.workflows.information_research_light).stages[0]).assignments
          .length
      )
        markStarted();
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
    await new Promise<void>((resolve) => setImmediate(resolve));
    try {
      expect(settled).toBe(false);
      expect(finished).toBe(0);
    } finally {
      unblock();
    }
    await expectRejection(run, 'injected engine rejection');
    await Promise.allSettled(engineFault.pending);
    expect(finished).toBe(calls.length);
    expect(calls.every((call) => call.stage.kind === 'research')).toBe(true);
  });

  test('joins independent stage branches before synthesis and keeps both outputs', async () => {
    const fixture = mutableFixtureConfig();
    const workflow = requireFixtureValue(fixture.workflows.information_research_light);
    const entry = requireFixtureValue(workflow.stages[0]);
    const branches = ['branch-a', 'branch-b'].map((id) => ({
      ...structuredClone(entry),
      id,
      mode: 'single',
      assignments: [structuredClone(entry.assignments[0])],
      required_after: [entry.id],
    }));
    setFixtureField(
      requireFixtureValue(workflow.stages[1]),
      'required_after',
      branches.map((branch) => branch.id),
    );
    setFixtureField(workflow, 'stages', [...workflow.stages.slice(0, 1), ...branches, ...workflow.stages.slice(1)]);
    setFixtureField(
      workflow,
      'edges',
      branches.flatMap((branch) => [
        [entry.id, branch.id],
        [branch.id, 'synthesize_research'],
      ]),
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(fixture));
    config = loadRuntimeConfig(root);
    const pending = new Map<string, () => void>();
    let bothStarted: () => void = () => {};
    const joined = new Promise<void>((resolve) => {
      bothStarted = resolve;
    });
    const host = await compose(['workflow', 'runtime.write'], async (call) => {
      calls.push(call);
      if (call.stage.id.startsWith('branch-')) {
        await new Promise<void>((resolve) => {
          pending.set(call.stage.id, resolve);
          if (pending.size === 2) bothStarted();
        });
      }
      return { stage: call.stage.id };
    });
    const run = configuredGraph(host).dispatch(workItem.id);
    await joined;
    expect(calls.some((call) => call.stage.kind === 'synthesize')).toBe(false);
    requireFixtureValue(pending.get('branch-b'))();
    requireFixtureValue(pending.get('branch-a'))();
    const result = await run;
    const synthesis = requireFixtureValue(calls.find((call) => call.stage.kind === 'synthesize'));
    for (const branch of branches) {
      expect(requireFixtureValue(requireFixtureValue(result.stageOutputs[branch.id])[0]).output).toEqual({
        stage: branch.id,
      });
      expect(readRecordField(readRecordField(synthesis.input, 'stage_outputs'), branch.id)).toEqual(
        requireFixtureValue(result.stageOutputs[branch.id]),
      );
    }
  });
});
