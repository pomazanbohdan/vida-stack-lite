import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configuredTestContext } from '../configured-context.mjs';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { buildObservedResearchResult } from '../../src/orchestration/observed-research-result.ts';
import { digest, resolveInstructionActivation } from '../../src/research-decision.ts';

const sha = (value) => createHash('sha256').update(value).digest('hex');

export function createHistoricalResearchFixture(overrides = {}) {
  const { repositoryRoot } = configuredTestContext();
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-historical-research-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml')),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), '# Synthetic test policy\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Synthetic test source map\n');
  const config = overrides.config ?? loadRuntimeConfig(root),
    sourceRevision = overrides.binding?.source_revision ?? 'b'.repeat(64),
    actionId = overrides.request?.action_id ?? overrides.binding?.action_id ?? 'a'.repeat(64),
    issueId = overrides.issueId ?? overrides.binding?.issue_id ?? '11111111-1111-4111-8111-111111111111',
    timestamp = new Date(Date.now() - 60_000).toISOString(),
    workId = overrides.binding?.work_id ?? 'work-1',
    scopeId = overrides.binding?.scope_id ?? 'scope-1',
    threadId = overrides.binding?.lease_thread_id ?? 'thread-1',
    workflowId = overrides.request?.workflow_id ?? 'information_research_light';
  const workItem = overrides.workItem ?? {
    schema: 'WorkItem/v1',
    id: workId,
    canonical_kind: 'research',
    intent: 'information_research',
    project_id: config.projects[0].project_id,
    title: 'Inspect bounded sources',
    description: 'Research one scoped question.',
    risk_flags: [],
    labels: [],
    provider: 'internal',
    provider_type: 'local',
  };
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: scopeId,
    work_id: workId,
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
    attribution: { thread_id: threadId, pointer: 'WORK.md' },
    owner: 'fixture-owner',
    created_at: timestamp,
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: 'acceptance-1',
    version: 1,
    ac_ids: ['AC-1'],
    source: 'fixture',
    scope: scopeId,
    source_revision: sourceRevision,
    contracts: [{ id: 'AC-1', definition: 'Answer the research question.', sr: 'SR-1', evidence: ['source audit'] }],
  };
  const scopeBytes = overrides.scopeBytes ? Buffer.from(overrides.scopeBytes) : Buffer.from(JSON.stringify(scope)),
    acceptanceBytes = overrides.acceptanceBytes
      ? Buffer.from(overrides.acceptanceBytes)
      : Buffer.from(JSON.stringify(acceptance));
  const binding = {
    work_id: workId,
    attempt: 1,
    run_id: 'run-1',
    action_id: actionId,
    issue_id: issueId,
    scope_id: scopeId,
    scope_digest: sourceRevision,
    source_revision: sourceRevision,
    source_scope_digest: sourceRevision,
    config_digest: runtimeConfigDigest(config),
    maintenance_generation: 0,
    lease_ticket_id: 'ticket-1',
    lease_thread_id: threadId,
    lease_generation: 1,
    ...overrides.binding,
  };
  const work = {
    schema: 'WorkState/v1',
    lease: { ticket_id: binding.lease_ticket_id, thread_id: threadId, generation: 1 },
    execution: { run_id: binding.run_id, status: 'active' },
    contracts: { scope: { sha256: sha(scopeBytes) }, acceptance: { sha256: sha(acceptanceBytes) } },
    binding: {
      provider_work_item_id: workItem.id,
      work_item_digest: canonicalJsonDigest(workItem),
      workflow_id: workflowId,
      config_digest: binding.config_digest,
      work_source_revision: sourceRevision,
      scope_id: scopeId,
      lifecycle_work_id: workId,
      scope_contract_digest: sha(scopeBytes),
      acceptance_manifest_digest: sha(acceptanceBytes),
      ac_ids: ['AC-1'],
    },
  };
  const feature = overrides.feature ?? config.research_decision;
  const resolved = resolveInstructionActivation(
    {
      intent: 'research_intent',
      risk: 'medium',
      lane: 'researcher',
      phase: 'trace',
      lifecycle_phase: 'trace',
      contour: scopeId,
      scope_id: scopeId,
      work_item_id: workId,
      source_revision: sourceRevision,
      artifact_kind: 'research',
      triggers: ['research_intent'],
      required_instruction_ids: [],
    },
    { root, write_cache: false },
  );
  const defaultActivationUse = {
    schema: 'InstructionActivationUse/v1',
    use_id: `use-${actionId.slice(0, 40)}`,
    work_item_id: workId,
    source_revision: sourceRevision,
    scope_id: scopeId,
    risk: 'medium',
    phase: 'trace',
    lane: 'researcher',
    trigger: 'research_intent',
    required_instruction_ids: [],
    instruction_ids: resolved.deterministic_order,
    registry_digest: resolved.registry_digest,
    source_digests: resolved.bindings.map((entry) => ({
      instruction_id: entry.instruction_id,
      source_sha256: entry.source_sha256,
    })),
    cache_status: resolved.cache_status,
    actor: 'fixture-host',
    pointer: 'WORK.md',
    timestamp,
  };
  defaultActivationUse.digest = canonicalJsonDigest(defaultActivationUse);
  const activationUse = overrides.activationUse ?? defaultActivationUse;
  const request = overrides.request ?? {
    schema: 'VidaSessionRequest/v1',
    run_id: binding.run_id,
    workflow_id: workflowId,
    wave_index: 0,
    action_id: actionId,
    assignment_index: 0,
    stage_id: 'research_parallel',
    role: 'documentation-researcher',
    config_digest: binding.config_digest,
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
    topic: overrides.topic ?? 'bounded research',
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
  const summary = JSON.stringify(output),
    observation = {
      schema: 'VidaSessionObservation/v1',
      action_id: actionId,
      issue_id: issueId,
      agent_id: 'fixture-agent',
      tool_call_ref: 'fixture-research-call',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: sourceRefs.map((entry) => entry.source_id),
    };
  const result =
    overrides.result ??
    buildObservedResearchResult({
      config,
      observation,
      request,
      issueId,
      activationUse,
      work,
      scopeBytes,
      acceptanceBytes,
      workItem,
    });
  const topicSlug = String(result.topic)
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100),
    safeTopic = /^[a-z0-9][a-z0-9._-]{0,127}$/.test(topicSlug)
      ? topicSlug
      : 'research-' + digest(result.topic).slice(0, 16),
    recordPath = path.posix.join(
      feature.paths.research_records,
      `${safeTopic}--${digest({ work_item_id: result.work_item_id, scope_id: result.scope_id, source_revision: result.source_revision }).slice(0, 16)}.research.json`,
    );
  const recordBytes = JSON.stringify(JSON.parse(canonicalJson(result)), null, 2) + '\n',
    recordSha = sha(recordBytes);
  const eventBody = {
    work_item_id: workId,
    logical_edit_id: 'ResearchResult/v1:' + recordPath,
    operation: 'init',
    before: null,
    after: recordSha,
  };
  const event = {
    schema: 'DocumentationChangeEvent/v1',
    event_id: 'documentation-event-' + digest(eventBody),
    logical_edit_id: eventBody.logical_edit_id,
    work_id: workId,
    source_revision: sourceRevision,
    operation: 'init',
    document_id: result.result_id,
    path_before: null,
    path_after: recordPath,
    before_sha256: '0'.repeat(64),
    after_sha256: recordSha,
    actor: result.actor,
    pointer: result.pointer,
    timestamp: result.updated_at,
  };
  const changelogBytes = canonicalJson(event) + '\n';
  const historyPath = path.posix.join(feature.paths.activation_history, workId, 'instruction-activation-history.jsonl');
  const historyBytes = canonicalJson(activationUse) + '\n';
  const researchBody = {
    schema: 'ObservedResearchRecordPlan/v1',
    binding,
    observation_digest: canonicalJsonDigest(observation),
    result_digest: result.digest,
    record_path: recordPath,
    record_pre_sha256: null,
    record_sha256: recordSha,
    changelog_path: feature.paths.changelog,
    changelog_pre_sha256: null,
    changelog_sha256: sha(changelogBytes),
    before_digest: null,
  };
  const plan = { ...researchBody, digest: canonicalJsonDigest(researchBody) };
  const activationBody = {
    schema: 'ObservedActivationUseWritePlan/v1',
    binding,
    use_digest: activationUse.digest,
    history_path: historyPath,
    history_pre_sha256: null,
    history_sha256: sha(historyBytes),
  };
  const activationPlan = { ...activationBody, digest: canonicalJsonDigest(activationBody) };
  const write = (relative, bytes) => {
    const target = path.join(root, ...relative.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  };
  write(recordPath, recordBytes);
  write(plan.changelog_path, changelogBytes);
  write(historyPath, historyBytes);
  return {
    root,
    config,
    feature,
    binding,
    work,
    workItem,
    request,
    observation,
    activationUse,
    result,
    plan,
    activationPlan,
    scopeBytes,
    acceptanceBytes,
    workItem,
    recordPath,
    recordBytes,
    historyPath,
    historyBytes,
    changelogPath: plan.changelog_path,
    changelogBytes,
    write,
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
}
