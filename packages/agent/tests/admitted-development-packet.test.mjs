import { afterAll, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { configuredTestContext } from './configured-context.mjs';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildAdmittedDevelopmentPacket } from '../src/orchestration/admitted-development-packet.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

const { repositoryRoot: root, config } = configuredTestContext();
const projectId = config.projects[0].project_id;
const scratchRoot = path.join(root, '.planning', 'agent-flow');
mkdirSync(scratchRoot, { recursive: true });
const fixture = mkdtempSync(path.join(scratchRoot, 'packet-adapter-'));
afterAll(() => {
  if (!fixture.startsWith(scratchRoot + path.sep)) throw new Error('unsafe packet fixture cleanup');
  rmSync(fixture, { recursive: true, force: true });
});
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
let fixtureNumber = 0;

function admitted(intent = 'task_execution') {
  const directory = path.join(fixture, String(++fixtureNumber));
  mkdirSync(directory);
  const relative = (name) => path.relative(root, path.join(directory, name)).replaceAll('\\', '/');
  const workItem = {
    schema: 'WorkItem/v1',
    id: 'packet-test-work',
    provider: 'local',
    provider_type: 'Task',
    canonical_kind: intent === 'task_execution' ? 'task' : 'story',
    intent,
    project_id: projectId,
    title: 'Add one scoped file',
    description: 'Create the agreed scoped file and verify its acceptance.',
    risk_flags: [],
    labels: [],
  };
  const selection = {
    team: 'default-development',
    kind: workItem.canonical_kind,
    intent,
    project: projectId,
    risk_flags: [],
    labels: [],
  };
  const target = relative('new-file.ts');
  const contextPath = 'packages/agent/TESTING.md';
  const allowedPaths = [target, contextPath].sort();
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), allowedPaths);
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'packet-test-scope',
    work_id: workItem.id,
    source_revision: source.digest,
    ac_ids: ['AC-1'],
    allowed_paths: allowedPaths,
    implementation_paths: [target],
    documentation_paths: [],
    changed_symbols: [],
    non_goals: [],
    acceptance_trace: ['AC-1'],
    behavior_trace: ['Create the scoped file.'],
    test_trace: ['Run the focused acceptance check.'],
    diagnostic_trace: ['Observe the file result.'],
    attribution: { thread_id: 'packet-test-thread', pointer: 'local:packet-test' },
    owner: 'packet-test-owner',
    created_at: '2026-09-25T00:00:00.000Z',
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: 'packet-test-acceptance',
    version: 1,
    ac_ids: ['AC-1'],
    source: 'local:packet-test',
    scope: scope.scope_id,
    source_revision: source.digest,
    contracts: [
      {
        id: 'AC-1',
        definition: 'The scoped file is created.',
        sr: 'Create only the admitted file.',
        evidence: ['focused acceptance check'],
      },
    ],
  };
  const scopePath = relative('scope.json');
  const acceptancePath = relative('acceptance.json');
  writeFileSync(path.join(root, scopePath), JSON.stringify(scope));
  writeFileSync(path.join(root, acceptancePath), JSON.stringify(acceptance));
  const scopeBytes = readFileSync(path.join(root, scopePath));
  const acceptanceBytes = readFileSync(path.join(root, acceptancePath));
  const expiry = new Date(Date.now() + 60_000).toISOString();
  const workflowId = intent;
  const binding = {
    lifecycle_work_id: workItem.id,
    provider_work_item_id: workItem.id,
    work_item_digest: canonicalJsonDigest(workItem),
    team_id: selection.team,
    workflow_id: workflowId,
    project_ids: [projectId],
    config_digest: runtimeConfigDigest(config),
    scope_id: scope.scope_id,
    scope_contract_digest: digest(scopeBytes),
    acceptance_manifest_digest: digest(acceptanceBytes),
    ac_ids: scope.ac_ids,
    implementation_paths: scope.implementation_paths,
    work_source_revision: source.digest,
  };
  const host = {
    work: {
      schema: 'WorkState/v1',
      workspace_id: 'a'.repeat(64),
      binding,
      contracts: { scope: { path: scopePath }, acceptance: { path: acceptancePath } },
      lease: { ticket_id: 'packet-test-ticket', thread_id: 'packet-test-thread', generation: 1 },
      execution: { run_id: 'packet-test-run' },
      lifecycle: { assurance: { correction_count: 0 } },
      artifacts: [],
    },
    ledger: {
      claims: [
        {
          ticket_id: 'packet-test-ticket',
          thread_id: 'packet-test-thread',
          generation: 1,
          status: 'active',
          lease_expires_at: expiry,
        },
      ],
      tickets: [
        {
          ticket_id: 'packet-test-ticket',
          thread_id: 'packet-test-thread',
          generation: 1,
          status: 'active',
          expires_at: expiry,
        },
      ],
    },
  };
  const taskSynthesisStage = config.workflows[workflowId].stages.find((stage) =>
    stage.produces.includes('DevelopmentTaskPacket/v1'),
  );
  const taskSummary = 'Baseline task synthesis summary for the admitted fixture.';
  const completed =
    intent === 'task_execution'
      ? [
          {
            step_id: taskSynthesisStage.id,
            items: [
              {
                request: {
                  stage_id: taskSynthesisStage.id,
                  workflow_id: workflowId,
                  scope_digest: source.digest,
                  config_digest: binding.config_digest,
                  action_id: 'd'.repeat(64),
                },
                issue_id: 'packet-test-synthesis-issue',
                observation: {
                  issue_id: 'packet-test-synthesis-issue',
                  action_id: 'd'.repeat(64),
                  status: 'reported_complete',
                  summary: taskSummary,
                  output_digest: canonicalJsonDigest(taskSummary),
                },
              },
            ],
          },
        ]
      : [];
  const state = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: 'a'.repeat(64),
    work_id: workItem.id,
    attempt: 1,
    run_id: 'packet-test-run',
    step_id: 'develop',
    source_scope: source,
    items: [],
    completed,
  };
  const ledger = { version: { revision: 1, digest: canonicalJsonDigest(state) }, state };
  return {
    repositoryRoot: root,
    config,
    host,
    ledger,
    workItem,
    selection,
    scopeBytes,
    acceptanceBytes,
    configuredContext: null,
    target,
    allowedPaths,
  };
}

function addObservedSynthesis(input) {
  const researchStage = config.workflows[input.selection.intent].stages.find((stage) =>
    stage.produces.includes('ResearchResult/v1'),
  );
  const synthesisStage = config.workflows[input.selection.intent].stages.find((stage) =>
    stage.produces.includes('ResearchSynthesis/v1'),
  );
  const issueIds = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
  const actionIds = ['f'.repeat(64), 'e'.repeat(64)];
  const timestamp = new Date(Date.now() - 60_000).toISOString();
  const sourceRevision = input.host.work.binding.work_source_revision;
  const activation = {
    use_id: 'use-packet-synthesis',
    risk: 'medium',
    phase: 'trace',
    lane: 'documentation-researcher',
    trigger: 'research_intent',
    required_instruction_ids: [],
    instruction_ids: ['research-protocol'],
    registry_digest: 'a'.repeat(64),
    source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'b'.repeat(64) }],
  };
  const source = {
    source_id: 'source-1',
    source_kind: 'internal',
    locator: 'repository://current/source',
    title: 'Current source',
    version_or_date: 'current',
    claim: 'The admitted AC-1 requirement is supported by the current source.',
    retrieved_at: timestamp,
    independence_group: null,
    digest: null,
  };
  const resultBody = {
    schema: 'ResearchResult/v1',
    result_id: 'research-packet-synthesis',
    work_item_id: input.workItem.id,
    source_revision: sourceRevision,
    scope_id: 'packet-test-scope',
    contour: 'requirements',
    topic: 'Current source requirements',
    objective: 'Identify supported requirements.',
    question: 'What must be preserved?',
    source_refs: [source],
    findings: [
      {
        finding_id: 'research-finding',
        statement: 'Preserve the current file format.',
        source_ids: [source.source_id],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [],
    evidence_classes: ['Static'],
    br_ids: [],
    sr_ids: [],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      {
        option_id: 'research-option',
        label: 'Preserve',
        description: 'Keep the current format.',
        evidence_refs: [source.source_id],
      },
    ],
    recommendation: {
      option_id: 'research-option',
      rationale: 'The source supports preserving the format.',
      evidence_refs: [source.source_id],
    },
    completeness: {
      status: 'blocked',
      required_questions: ['What must be preserved?'],
      answered_questions: [],
      missing_questions: ['What must be preserved?'],
      material_gaps: [],
      external_validation: {
        required: false,
        source_count: 0,
        minimum_sources: 0,
        status: 'not_required',
        live_check: false,
      },
    },
    readiness: 'blocked',
    instruction_activation: activation,
    actor: 'fixture-agent',
    pointer: 'WORK.md',
    created_at: timestamp,
    updated_at: timestamp,
  };
  const result = { ...resultBody, digest: canonicalJsonDigest(resultBody) };
  const synthesisBody = {
    schema: 'ResearchSynthesis/v1',
    bundle_id: 'synthesis-packet-current',
    work_item_id: input.workItem.id,
    source_revision: sourceRevision,
    scope_id: 'packet-test-scope',
    topic: 'Current source requirements',
    result_refs: [{ result_id: result.result_id, digest: result.digest }],
    findings: [
      {
        finding_id: 'synthesis-requirement',
        statement: 'Unique synthesis requirement: preserve the canonical file format.',
        source_refs: ['r0:source-1'],
        evidence_class: 'Static',
        status: 'confirmed',
      },
    ],
    uncertainties: [],
    conflicts: [],
    br_ids: [],
    sr_ids: [],
    ac_ids: ['AC-1'],
    gap_ids: [],
    options: [
      {
        option_id: 'option-preserve',
        label: 'Preserve',
        description: 'Keep the format.',
        evidence_refs: ['r0:source-1'],
      },
    ],
    recommendation: {
      option_id: 'option-preserve',
      rationale: 'The source confirms this requirement.',
      evidence_refs: ['r0:source-1'],
    },
    completeness: {
      status: 'blocked',
      required_questions: [],
      answered_questions: [],
      missing_questions: [],
      material_gaps: ['Synthesis leaves one acceptance question open.'],
      external_validation: {
        required: false,
        source_count: 0,
        minimum_sources: 0,
        status: 'not_required',
        live_check: false,
      },
    },
    readiness: 'blocked',
    instruction_activation: activation,
    actor: 'fixture-agent',
    pointer: 'WORK.md',
    created_at: timestamp,
    updated_at: timestamp,
  };
  const synthesis = { ...synthesisBody, digest: canonicalJsonDigest(synthesisBody) };
  const recordsRoot = path.join(root, config.research_decision.paths.research_records);
  mkdirSync(recordsRoot, { recursive: true });
  const artifacts = [
    {
      record: result,
      stage: researchStage,
      schema: 'ResearchResult/v1',
      suffix: '.research.json',
      issue: issueIds[0],
      action: actionIds[0],
    },
    {
      record: synthesis,
      stage: synthesisStage,
      schema: 'ResearchSynthesis/v1',
      suffix: '.synthesis.json',
      issue: issueIds[1],
      action: actionIds[1],
    },
  ];
  const entries = [];
  const completed = [];
  for (const fixtureArtifact of artifacts) {
    const bytes = Buffer.from(JSON.stringify(fixtureArtifact.record));
    const recordName = `${fixtureArtifact.record.result_id ?? fixtureArtifact.record.bundle_id}${fixtureArtifact.suffix}`;
    const fullPath = path.join(recordsRoot, recordName);
    writeFileSync(fullPath, bytes);
    const recordPath = path.relative(root, fullPath).replaceAll('\\', '/');
    const changelogPath = `${recordPath}.jsonl`;
    const recordSha = digest(bytes);
    const binding = {
      work_id: input.workItem.id,
      attempt: input.ledger.state.attempt,
      run_id: input.ledger.state.run_id,
      action_id: fixtureArtifact.action,
      issue_id: fixtureArtifact.issue,
      scope_id: 'packet-test-scope',
      scope_digest: sourceRevision,
      source_revision: sourceRevision,
      source_scope_digest: input.ledger.state.source_scope.digest,
      config_digest: input.host.work.binding.config_digest,
      maintenance_generation: 0,
      lease_ticket_id: input.host.work.lease.ticket_id,
      lease_thread_id: input.host.work.lease.thread_id,
      lease_generation: input.host.work.lease.generation,
    };
    const observation = {
      issue_id: fixtureArtifact.issue,
      action_id: fixtureArtifact.action,
      status: 'reported_complete',
      summary: `Observed ${fixtureArtifact.schema}`,
    };
    observation.output_digest = canonicalJsonDigest(observation.summary);
    const activationUse = {
      schema: 'InstructionActivationUse/v1',
      ...{
        use_id: `use-${fixtureArtifact.action.slice(0, 8)}`,
        work_item_id: input.workItem.id,
        source_revision: sourceRevision,
        scope_id: 'packet-test-scope',
        risk: 'medium',
        phase: 'trace',
        lane: 'documentation-researcher',
        trigger: 'research_intent',
        required_instruction_ids: [],
        instruction_ids: ['research-protocol'],
        registry_digest: 'a'.repeat(64),
        source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'b'.repeat(64) }],
        cache_status: 'cold',
        actor: 'fixture-agent',
        pointer: 'WORK.md',
        timestamp,
      },
    };
    activationUse.digest = canonicalJsonDigest(activationUse);
    const activationPlanBody = {
      schema: 'ObservedActivationUseWritePlan/v1',
      binding,
      use_digest: activationUse.digest,
      history_path: `${config.research_decision.paths.research_records}/packet-synthesis-instruction-activation-history.jsonl`,
      history_pre_sha256: null,
      history_sha256: digest(Buffer.from('')),
    };
    const activationPlan = { ...activationPlanBody, digest: canonicalJsonDigest(activationPlanBody) };
    const planBody = {
      schema:
        fixtureArtifact.schema === 'ResearchSynthesis/v1'
          ? 'ObservedSynthesisRecordPlan/v1'
          : 'ObservedResearchRecordPlan/v1',
      binding,
      observation_digest: canonicalJsonDigest(observation),
      result_digest: fixtureArtifact.record.digest,
      record_path: recordPath,
      record_pre_sha256: null,
      record_sha256: recordSha,
      changelog_path: changelogPath,
      changelog_pre_sha256: null,
      changelog_sha256: digest(Buffer.from('')),
      before_digest: null,
    };
    const plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    entries.push({
      artifact_id: fixtureArtifact.record.result_id ?? fixtureArtifact.record.bundle_id,
      schema: fixtureArtifact.schema,
      stage_id: fixtureArtifact.stage.id,
      path: recordPath,
      sha256: recordSha,
    });
    completed.push({
      step_id: fixtureArtifact.stage.id,
      items: [
        {
          request: {
            stage_id: fixtureArtifact.stage.id,
            workflow_id: input.selection.intent,
            scope_digest: sourceRevision,
            config_digest: input.host.work.binding.config_digest,
            action_id: fixtureArtifact.action,
          },
          issue_id: fixtureArtifact.issue,
          observation,
          research_activation: { plan: activationPlan, use: activationUse },
          research_normalization: plan,
        },
      ],
    });
  }
  const work = { ...input.host.work, artifacts: entries };
  const host = { ...input.host, work };
  const state = { ...input.ledger.state, completed };
  return {
    ...input,
    host,
    ledger: { version: { revision: 2, digest: canonicalJsonDigest(state) }, state },
    artifactPaths: artifacts.map((item) =>
      path.join(recordsRoot, `${item.record.result_id ?? item.record.bundle_id}${item.suffix}`),
    ),
  };
}

describe('admitted development packet', () => {
  test('keeps an absent new file truthful and derives stable task content', () => {
    const input = admitted();
    const first = buildAdmittedDevelopmentPacket(input);
    const second = buildAdmittedDevelopmentPacket(input);
    expect(first).toEqual(second);
    expect(first.in_scope).toEqual([input.target]);
    expect(first.owned_paths).toEqual(input.allowedPaths);
    expect(first.code_evidence_refs).toEqual([]);
    expect(first.skill_refs).toEqual([]);
    expect(first.documentation_refs).toEqual([]);
    expect(first.acceptance).toEqual(['AC-1: The scoped file is created.']);
    expect(first.expected_tests).toEqual(['Run the focused acceptance check.']);
  });

  test('projects a digest-bound task synthesis observation into the next packet', () => {
    const input = admitted();
    const stage = config.workflows.task_execution.stages.find((entry) =>
      entry.produces.includes('DevelopmentTaskPacket/v1'),
    );
    const summary = 'Unique task synthesis requirement: preserve the current file format.';
    const item = {
      request: {
        stage_id: stage.id,
        workflow_id: 'task_execution',
        scope_digest: input.host.work.binding.work_source_revision,
        config_digest: input.host.work.binding.config_digest,
        action_id: 'b'.repeat(64),
      },
      issue_id: 'task-synthesis-issue',
      observation: {
        issue_id: 'task-synthesis-issue',
        action_id: 'b'.repeat(64),
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
      },
    };
    const state = {
      ...input.ledger.state,
      completed: [...input.ledger.state.completed, { step_id: stage.id, items: [item] }],
    };
    const withSynthesis = {
      ...input,
      ledger: {
        version: { revision: 2, digest: canonicalJsonDigest(state) },
        state,
      },
    };
    const packet = buildAdmittedDevelopmentPacket(withSynthesis);
    expect(packet.implementation_constraints).toContain(
      `Observed task synthesis ${item.request.action_id}/${canonicalJsonDigest(summary)}: ${summary}`,
    );

    const staleState = {
      ...state,
      completed: [
        ...input.ledger.state.completed,
        {
          step_id: stage.id,
          items: [{ ...item, observation: { ...item.observation, output_digest: 'c'.repeat(64) } }],
        },
      ],
    };
    expect(() =>
      buildAdmittedDevelopmentPacket({
        ...withSynthesis,
        ledger: { version: { revision: 3, digest: canonicalJsonDigest(staleState) }, state: staleState },
      }),
    ).toThrow(/task synthesis summary is missing, stale, mismatched or over budget/);
  });

  test('consumes a current validated synthesis artifact and rejects changed artifact bytes', () => {
    const input = addObservedSynthesis(admitted('implementation_change'));
    try {
      const packet = buildAdmittedDevelopmentPacket(input);
      expect(packet.research_artifact_refs).toContain(
        `artifact://research/synthesis-packet-current/${input.host.work.artifacts.find((entry) => entry.schema === 'ResearchSynthesis/v1').sha256}`,
      );
      expect(
        packet.implementation_constraints.some((entry) =>
          entry.includes('Unique synthesis requirement: preserve the canonical file format.'),
        ),
      ).toBe(true);
      expect(
        packet.implementation_constraints.some((entry) =>
          entry.includes('Synthesis recommendation option-preserve: The source confirms this requirement.'),
        ),
      ).toBe(true);
      expect(packet.implementation_constraints).toContain(
        'Synthesis completeness gap: Synthesis leaves one acceptance question open.',
      );

      const synthesisPath = input.artifactPaths.find((entry) => entry.endsWith('.synthesis.json'));
      const originalSynthesisBytes = readFileSync(synthesisPath);
      const foreignRecord = JSON.parse(originalSynthesisBytes.toString('utf8'));
      foreignRecord.scope_id = 'foreign-scope';
      const { digest: _previousDigest, ...unsignedForeignRecord } = foreignRecord;
      foreignRecord.digest = canonicalJsonDigest(unsignedForeignRecord);
      const foreignBytes = Buffer.from(JSON.stringify(foreignRecord));
      writeFileSync(synthesisPath, foreignBytes);
      const foreignSha = digest(foreignBytes);
      const synthesisItem = input.ledger.state.completed
        .flatMap((wave) => wave.items)
        .find((item) => item.request.stage_id === 'synthesize_task');
      const foreignPlanBody = {
        ...synthesisItem.research_normalization,
        record_sha256: foreignSha,
        result_digest: foreignRecord.digest,
      };
      delete foreignPlanBody.digest;
      const foreignPlan = { ...foreignPlanBody, digest: canonicalJsonDigest(foreignPlanBody) };
      const foreignState = {
        ...input.ledger.state,
        completed: input.ledger.state.completed.map((wave) => ({
          ...wave,
          items: wave.items.map((item) =>
            item === synthesisItem ? { ...item, research_normalization: foreignPlan } : item,
          ),
        })),
      };
      const foreignInput = {
        ...input,
        host: {
          ...input.host,
          work: {
            ...input.host.work,
            artifacts: input.host.work.artifacts.map((entry) =>
              entry.schema === 'ResearchSynthesis/v1' ? { ...entry, sha256: foreignSha } : entry,
            ),
          },
        },
        ledger: {
          version: { revision: 3, digest: canonicalJsonDigest(foreignState) },
          state: foreignState,
        },
      };
      expect(() => buildAdmittedDevelopmentPacket(foreignInput)).toThrow(/synthesis differs from admitted work/);

      writeFileSync(synthesisPath, originalSynthesisBytes);
      writeFileSync(synthesisPath, `${readFileSync(synthesisPath, 'utf8')} `);
      expect(() => buildAdmittedDevelopmentPacket(input)).toThrow(/synthesis artifact bytes changed/);
    } finally {
      for (const artifactPath of input.artifactPaths) rmSync(artifactPath, { force: true });
    }
  });

  test('rejects changed accepted bytes and missing substantive research artifact', () => {
    const input = admitted();
    expect(() => buildAdmittedDevelopmentPacket({ ...input, acceptanceBytes: Buffer.from('{}') })).toThrow(
      /scope or acceptance bytes differ/,
    );
    const research = admitted('implementation_change');
    expect(() => buildAdmittedDevelopmentPacket(research)).toThrow(/typed research artifact/);
    const researchStage = config.workflows.implementation_change.stages.find((stage) =>
      stage.produces.includes('ResearchResult/v1'),
    );
    const researchState = {
      ...research.ledger.state,
      completed: [
        ...research.ledger.state.completed,
        {
          step_id: researchStage.id,
          items: [
            {
              request: {
                stage_id: researchStage.id,
                workflow_id: 'implementation_change',
                scope_digest: research.host.work.binding.work_source_revision,
                config_digest: research.host.work.binding.config_digest,
                action_id: 'research-action',
              },
              issue_id: 'research-issue',
              observation: {
                issue_id: 'research-issue',
                action_id: 'research-action',
                status: 'reported_complete',
                evidence_refs: [`artifact://research/foreign-result/${'a'.repeat(64)}`],
              },
            },
          ],
        },
      ],
    };
    const foreign = {
      ...research,
      ledger: {
        version: { revision: 2, digest: canonicalJsonDigest(researchState) },
        state: researchState,
      },
    };
    expect(() => buildAdmittedDevelopmentPacket(foreign)).toThrow(/canonical normalization reservation/);
  });

  test('accepts the observed sanctioned write and keeps identity after later validator reports', () => {
    const input = admitted();
    writeFileSync(path.join(root, input.target), 'export const created = true;');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), input.allowedPaths);
    const state = { ...input.ledger.state, source_scope: source };
    const afterWrite = {
      ...input,
      ledger: {
        version: { revision: 2, digest: canonicalJsonDigest(state) },
        state,
      },
    };
    const packet = buildAdmittedDevelopmentPacket(afterWrite);
    expect(packet.source_revision).toBe(input.host.work.binding.work_source_revision);
    expect(packet.code_evidence_refs).toEqual([input.target]);
    const validatorState = {
      ...state,
      completed: [
        ...state.completed,
        {
          step_id: 'validate_parallel',
          items: [
            {
              request: { stage_id: 'validate', action_id: 'validator-action' },
              issue_id: 'validator-issue',
              observation: { status: 'reported_complete' },
            },
          ],
        },
      ],
    };
    const later = {
      ...afterWrite,
      ledger: {
        version: { revision: 3, digest: canonicalJsonDigest(validatorState) },
        state: validatorState,
      },
    };
    const repeated = buildAdmittedDevelopmentPacket(later);
    expect(repeated.packet_id).toBe(packet.packet_id);
    expect(repeated.digest).toBe(packet.digest);
  });
});
