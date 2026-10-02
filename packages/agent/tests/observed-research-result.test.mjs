import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  buildObservedResearchResult,
  researchObservationOutputContract,
} from '../src/orchestration/observed-research-result.ts';

const root =
  process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const config = loadRuntimeConfig(root);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const timestamp = new Date(Date.now() - 60_000).toISOString();

function fixture() {
  const sourceRevision = 'b'.repeat(64);
  const actionId = 'a'.repeat(64);
  const workItem = {
    schema: 'WorkItem/v1',
    id: 'work-1',
    canonical_kind: 'research',
    intent: 'information_research',
    project_id: 'refactoring',
    title: 'Inspect bounded sources',
    description: 'Research one scoped question.',
    risk_flags: [],
    labels: [],
    provider: 'internal',
    provider_type: 'local',
  };
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
  const work = {
    schema: 'WorkState/v1',
    lease: { ticket_id: 'ticket-1', thread_id: 'thread-1', generation: 1 },
    execution: { run_id: 'run-1', status: 'active' },
    contracts: { scope: { sha256: sha(scopeBytes) }, acceptance: { sha256: sha(acceptanceBytes) } },
    binding: {
      provider_work_item_id: workItem.id,
      work_item_digest: canonicalJsonDigest(workItem),
      workflow_id: 'information_research_light',
      config_digest: runtimeConfigDigest(config),
      work_source_revision: sourceRevision,
      scope_id: scope.scope_id,
      lifecycle_work_id: scope.work_id,
      scope_contract_digest: sha(scopeBytes),
      acceptance_manifest_digest: sha(acceptanceBytes),
      ac_ids: scope.ac_ids,
    },
  };
  const activationUse = {
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
  };
  activationUse.digest = canonicalJsonDigest(activationUse);
  const request = {
    schema: 'VidaSessionRequest/v1',
    run_id: work.execution.run_id,
    workflow_id: work.binding.workflow_id,
    wave_index: 0,
    action_id: actionId,
    assignment_index: 0,
    stage_id: 'research_parallel',
    role: 'documentation-researcher',
    config_digest: work.binding.config_digest,
    scope_digest: sourceRevision,
    bindings_manifest_ref: 'e'.repeat(64),
  };
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
  ];
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
  };
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
  };
  return { config, observation, request, issueId, activationUse, work, scopeBytes, acceptanceBytes, workItem, output };
}

test('uses only substantive observed research and host-bound identity', () => {
  const input = fixture();
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
  for (const invalid of [
    { ...input.output, ac_ids: [] },
    {
      ...input.output,
      source_refs: input.output.source_refs.map((source) => ({
        ...source,
        claim: source.claim.replace('AC-1', 'unbound criterion'),
      })),
    },
  ]) {
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
