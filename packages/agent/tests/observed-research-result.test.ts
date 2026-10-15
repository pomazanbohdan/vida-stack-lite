import { expect, test } from 'bun:test';
import { createHash, randomUUID } from 'node:crypto';
import { observeAjvCompiles } from './helpers/ajv-compile-observer.ts';
import { configuredTestContext } from './configured-context.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { validateAcceptanceManifestSchema } from '../src/contracts/acceptance-manifest-schema.ts';
import type { WorkState } from '../src/host-state.ts';
import type { ActivationUse } from '../src/research-decision.ts';
import type { SessionBridgeObservation, SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import {
  buildObservedResearchResult,
  researchObservationOutputContract,
  type ObservedResearchResultInput,
} from '../src/orchestration/observed-research-result.ts';

const { config } = configuredTestContext();
const configuredProject = config.projects[0];
if (!configuredProject) throw new Error('Test configuration requires a project');
const projectId = configuredProject.project_id;

const sha = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const timestamp = new Date(Date.now() - 60_000).toISOString();

interface ResearchObservationSource {
  readonly source_id: string;
  readonly source_kind: 'external';
  readonly locator: string;
  readonly title: string;
  readonly version_or_date: string;
  readonly claim: string;
  readonly retrieved_at: string;
  readonly independence_group: string;
  readonly digest: null;
}

interface ResearchObservationOutput {
  readonly schema: 'VidaResearchObservationOutput/v1';
  readonly topic: string;
  readonly objective: string;
  readonly question: string;
  readonly source_refs: readonly ResearchObservationSource[];
  readonly findings: readonly {
    readonly finding_id: string;
    readonly statement: string;
    readonly source_ids: readonly string[];
    readonly evidence_class: 'Static';
    readonly status: 'confirmed';
  }[];
  readonly uncertainties: readonly unknown[];
  readonly conflicts: readonly unknown[];
  readonly evidence_classes: readonly 'Static'[];
  readonly br_ids: readonly string[];
  readonly sr_ids: readonly string[];
  readonly ac_ids: readonly string[];
  readonly gap_ids: readonly string[];
  readonly options: readonly {
    readonly option_id: string;
    readonly label: string;
    readonly description: string;
    readonly evidence_refs: readonly string[];
  }[];
  readonly recommendation: {
    readonly option_id: string;
    readonly rationale: string;
    readonly evidence_refs: readonly string[];
  };
  readonly completeness: {
    readonly status: 'pass';
    readonly required_questions: readonly string[];
    readonly answered_questions: readonly string[];
    readonly missing_questions: readonly string[];
    readonly material_gaps: readonly string[];
    readonly external_validation: {
      readonly required: true;
      readonly source_count: number;
      readonly minimum_sources: number;
      readonly status: 'pass';
      readonly live_check: true;
    };
  };
  readonly readiness: 'ready';
}

interface ObservedResearchFixture extends ObservedResearchResultInput {
  readonly output: ResearchObservationOutput;
}

function fixture(): ObservedResearchFixture {
  const sourceRevision = 'b'.repeat(64);
  const actionId = 'a'.repeat(64);
  const workItem = {
    schema: 'WorkItem/v1',
    id: 'work-1',
    canonical_kind: 'research',
    intent: 'information_research',
    project_id: projectId,
    title: 'Inspect bounded sources',
    description: 'Research one scoped question.',
    risk_flags: [],
    labels: [],
    provider: 'internal',
    provider_type: 'local',
  } satisfies ObservedResearchResultInput['workItem'];
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'scope-1',
    work_id: 'work-1',
    source_revision: sourceRevision,
    ac_ids: ['AC-1'],
    allowed_paths: ['docs/research.md'],
    implementation_paths: ['docs/research.md'],
    changed_symbols: [],
    non_goals: [],
    acceptance_trace: ['AC-1'],
    behavior_trace: ['SR-1'],
    test_trace: ['source audit'],
    diagnostic_trace: ['bounded fixture'],
    attribution: { thread_id: 'thread-1', pointer: 'WORK.md' },
    owner: 'fixture-owner',
    created_at: timestamp,
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: 'acceptance-1',
    version: 1,
    ac_ids: ['AC-1'],
    source: 'fixture',
    scope: 'scope-1',
    source_revision: sourceRevision,
    contracts: [{ id: 'AC-1', definition: 'Answer the research question.', sr: 'SR-1', evidence: ['source audit'] }],
  };
  const scopeBytes = Buffer.from(JSON.stringify(scope));
  const acceptanceBytes = Buffer.from(JSON.stringify(acceptance));
  const scopeDigest = sha(scopeBytes);
  const acceptanceDigest = sha(acceptanceBytes);
  const work = {
    schema: 'WorkState/v1',
    workspace_id: 'workspace-fixture',
    revision: 1,
    binding: {
      repository_id: config.repository.repository_id,
      project_ids: [projectId],
      integrations_digest: '1'.repeat(64),
      team_id: 'default-development',
      workflow_id: 'information_research_light',
      provider_work_item_id: workItem.id,
      lifecycle_work_id: scope.work_id,
      work_item_digest: canonicalJsonDigest(workItem),
      work_source_revision: sourceRevision,
      scope_id: scope.scope_id,
      scope_contract_digest: scopeDigest,
      acceptance_manifest_digest: acceptanceDigest,
      ac_ids: scope.ac_ids,
      implementation_paths: scope.implementation_paths,
      allowed_resources: [],
      config_digest: runtimeConfigDigest(config),
      runtime_source_revision: 'fixture-runtime-revision',
      schema_digest: '2'.repeat(64),
      runtime_code_digest: '3'.repeat(64),
    },
    contracts: {
      scope: { schema: 'ContractReference/v1', path: 'scope.json', sha256: scopeDigest },
      acceptance: { schema: 'ContractReference/v1', path: 'acceptance.json', sha256: acceptanceDigest },
      decisions: [],
    },
    lease: { ticket_id: 'ticket-1', thread_id: 'thread-1', generation: 1 },
    execution: {
      run_id: 'run-1',
      input_digest: '4'.repeat(64),
      phase: 'execute',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'EXECUTE',
      source_revision: sourceRevision,
      next_action: 'Research the bounded question.',
      route: 'R1',
      risk: 'medium',
      change_kind: 'documentation',
      config_binding: {
        config_digest: runtimeConfigDigest(config),
        schema_digest: '2'.repeat(64),
        runtime_code_digest: '3'.repeat(64),
      },
      scope: {
        scope_id: scope.scope_id,
        allowed_paths: scope.allowed_paths,
        fingerprint_paths: [],
        implementation_paths: scope.implementation_paths,
        documentation_paths: scope.allowed_paths,
      },
      seal: null,
      assurance: {
        epoch: 'fixture-epoch',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    artifacts: [],
  } satisfies WorkState;
  const activationUseBody = {
    schema: 'InstructionActivationUse/v1',
    use_id: 'use-1',
    work_item_id: scope.work_id,
    source_revision: sourceRevision,
    scope_id: scope.scope_id,
    risk: 'medium',
    phase: 'trace',
    lane: 'documentation-researcher',
    trigger: 'research_intent',
    required_instruction_ids: [],
    instruction_ids: ['research-protocol'],
    registry_digest: 'c'.repeat(64),
    source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'd'.repeat(64) }],
    cache_status: 'cold',
    actor: 'fixture-host',
    pointer: 'WORK.md',
    timestamp,
  } satisfies Omit<ActivationUse, 'digest'>;
  const boundActivationUse: ActivationUse = {
    ...activationUseBody,
    digest: canonicalJsonDigest(activationUseBody),
  };
  const request = {
    schema: 'VidaSessionRequest/v1',
    run_id: work.execution.run_id ?? 'unreachable-run',
    workflow_id: work.binding.workflow_id,
    wave_index: 0,
    action_id: actionId,
    assignment_index: 0,
    stage_id: 'research_parallel',
    role: 'documentation-researcher',
    config_digest: work.binding.config_digest,
    scope_digest: sourceRevision,
    bindings_manifest_ref: 'e'.repeat(64),
  } satisfies SessionBridgeRequest;
  const sourceRefs = [
    {
      source_id: 'source-one',
      source_kind: 'external',
      locator: 'https://example.test/one',
      title: 'Primary one',
      version_or_date: '2026-09-20',
      claim: 'BR-1, SR-1 and AC-1 are supported.',
      retrieved_at: timestamp,
      independence_group: 'one',
      digest: null,
    },
    {
      source_id: 'source-two',
      source_kind: 'external',
      locator: 'https://example.test/two',
      title: 'Primary two',
      version_or_date: '2026-09-20',
      claim: 'Independent BR-1 and SR-1 support.',
      retrieved_at: timestamp,
      independence_group: 'two',
      digest: null,
    },
  ] satisfies readonly ResearchObservationSource[];
  const output = {
    schema: 'VidaResearchObservationOutput/v1',
    topic: 'bounded research',
    objective: 'answer one question',
    question: 'Which source is current?',
    source_refs: sourceRefs,
    findings: [
      {
        finding_id: 'finding-1',
        statement: 'The sources agree.',
        source_ids: ['source-one', 'source-two'],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [],
    evidence_classes: ['Static'],
    br_ids: ['BR-1'],
    sr_ids: ['SR-1'],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      {
        option_id: 'option-1',
        label: 'Use evidence',
        description: 'Current evidence.',
        evidence_refs: ['source-one', 'source-two'],
      },
    ],
    recommendation: {
      option_id: 'option-1',
      rationale: 'Both sources support it.',
      evidence_refs: ['source-one', 'source-two'],
    },
    completeness: {
      status: 'pass',
      required_questions: ['Which source is current?'],
      answered_questions: ['Which source is current?'],
      missing_questions: [],
      material_gaps: [],
      external_validation: { required: true, source_count: 2, minimum_sources: 2, status: 'pass', live_check: true },
    },
    readiness: 'ready',
  } satisfies ResearchObservationOutput;
  const summary = JSON.stringify(output);
  const issueId = '11111111-1111-4111-8111-111111111111';
  const observation = {
    schema: 'VidaSessionObservation/v1',
    action_id: actionId,
    issue_id: issueId,
    agent_id: 'fixture-agent',
    tool_call_ref: 'fixture-research-call',
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: sourceRefs.map((source) => source.source_id),
  } satisfies SessionBridgeObservation;
  return {
    config,
    observation,
    request,
    issueId,
    activationUse: boundActivationUse,
    work,
    scopeBytes,
    acceptanceBytes,
    workItem,
    output,
  };
}

test('uses only substantive observed research and host-bound identity', async () => {
  const input = fixture();
  const acceptanceSchemaId = 'https://vida-agent.invalid/schemas/acceptance-manifest.v1.schema.json';
  const compilation = observeAjvCompiles(
    (schema) => typeof schema === 'object' && schema !== null && '$id' in schema && schema.$id === acceptanceSchemaId,
  );
  try {
    const parsedAcceptance: unknown = JSON.parse(input.acceptanceBytes.toString('utf8'));
    expect(validateAcceptanceManifestSchema(parsedAcceptance)).toBe(true);
    const compilesAfterPrime = compilation.schemas.length;
    expect(compilesAfterPrime).toBeLessThanOrEqual(1);

    const freshConsumer = (await import(
      `../src/orchestration/observed-research-result.ts?acceptance-reuse=${randomUUID()}`
    )) as typeof import('../src/orchestration/observed-research-result.ts');
    const freshResult = freshConsumer.buildObservedResearchResult(input);
    expect(freshResult.result_id).toBe(`research-${input.request.action_id.slice(0, 40)}`);
    expect(freshResult.actor).toBe(input.observation.agent_id);
    expect(freshResult.br_ids).toEqual(input.output.br_ids);
    expect(freshResult.pointer).toBe('.agent/work/session-handoff.v1.sqlite');
    expect(() => freshConsumer.buildObservedResearchResult({ ...input, acceptanceBytes: Buffer.from('{}') })).toThrow(
      'observed research result: accepted acceptance schema is invalid',
    );
    const repeatedFreshResult = freshConsumer.buildObservedResearchResult(input);
    expect(repeatedFreshResult.result_id).toBe(freshResult.result_id);
    expect(repeatedFreshResult.actor).toBe(freshResult.actor);
    expect(repeatedFreshResult.br_ids).toEqual(freshResult.br_ids);
    expect(repeatedFreshResult.pointer).toBe(freshResult.pointer);
    expect(compilation.schemas).toHaveLength(compilesAfterPrime);
  } finally {
    compilation.restore();
  }

  const result = buildObservedResearchResult(input);
  expect(result.result_id).toBe(`research-${input.request.action_id.slice(0, 40)}`);
  expect(result.actor).toBe(input.observation.agent_id);
  expect(result.br_ids).toEqual(input.output.br_ids);
  expect(result.pointer).toBe('.agent/work/session-handoff.v1.sqlite');
  expect(researchObservationOutputContract.summary_json_schema).toBe(input.output.schema);
  expect(() =>
    buildObservedResearchResult({
      ...input,
      observation: { ...input.observation, summary: 'free text', output_digest: canonicalJsonDigest('free text') },
    }),
  ).toThrow('not structured JSON');
  expect(() =>
    buildObservedResearchResult({
      ...input,
      observation: { ...input.observation, summary: input.observation.summary + ' ' },
    }),
  ).toThrow('observed research result: native report is outside the admitted research action');
  expect(() =>
    buildObservedResearchResult({
      ...input,
      observation: { ...input.observation, issue_id: '22222222-2222-4222-8222-222222222222' },
    }),
  ).toThrow('outside the admitted research action');
  const foreign = { ...input.output, ac_ids: ['AC-FOREIGN'] };
  const foreignSummary = JSON.stringify(foreign);
  expect(() =>
    buildObservedResearchResult({
      ...input,
      observation: {
        ...input.observation,
        summary: foreignSummary,
        output_digest: canonicalJsonDigest(foreignSummary),
      },
    }),
  ).toThrow('must exactly match accepted scope and be source-backed');
  const invalidOutputs: readonly ResearchObservationOutput[] = [
    { ...input.output, ac_ids: [] },
    {
      ...input.output,
      source_refs: input.output.source_refs.map((source) => ({
        ...source,
        claim: source.claim.replace('AC-1', 'unbound criterion'),
      })),
    },
  ];
  for (const invalid of invalidOutputs) {
    const invalidSummary = JSON.stringify(invalid);
    expect(() =>
      buildObservedResearchResult({
        ...input,
        observation: {
          ...input.observation,
          summary: invalidSummary,
          output_digest: canonicalJsonDigest(invalidSummary),
        },
      }),
    ).toThrow('must exactly match accepted scope and be source-backed');
  }
  const provenance = { ...input.output, actor: 'forged-agent' };
  const provenanceSummary = JSON.stringify(provenance);
  expect(() =>
    buildObservedResearchResult({
      ...input,
      observation: {
        ...input.observation,
        summary: provenanceSummary,
        output_digest: canonicalJsonDigest(provenanceSummary),
      },
    }),
  ).toThrow('unsupported or missing fields');
});
