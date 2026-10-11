import { describe, expect, test } from 'bun:test';
import {
  citedSynthesisConstraints,
  correctivePacketEvidence,
} from '../src/orchestration/admitted-development-packet.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import type { SessionBridgeObservation } from '../src/orchestration/mastra-session-bridge.ts';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import type { WorkItemSelection } from '../src/config/runtime-config.ts';
import type { ResearchSynthesis } from '../src/research-decision.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { configuredTestContext } from './configured-context.ts';

describe('admitted synthesis packet projection', () => {
  test('carries confirmed findings, material uncertainty, unresolved conflicts, options and recommendation', () => {
    const synthesis: ResearchSynthesis = {
      schema: 'ResearchSynthesis/v1',
      bundle_id: 'synthesis-current',
      work_item_id: 'work-current',
      source_revision: 'revision-current',
      scope_id: 'scope-current',
      topic: 'security boundary',
      result_refs: [{ result_id: 'research-current', digest: 'a'.repeat(64) }],
      findings: [
        {
          finding_id: 'finding-security',
          status: 'confirmed',
          evidence_class: 'Static',
          source_refs: ['r0:source-1'],
          statement: 'The token permission boundary is security sensitive.',
        },
        {
          finding_id: 'finding-tentative',
          status: 'tentative',
          evidence_class: 'Static',
          source_refs: ['r0:source-1'],
          statement: 'Do not promote tentative synthesis to a developer constraint.',
        },
      ],
      uncertainties: [
        { uncertainty_id: 'material', material: true, statement: 'The deployment target remains uncertain.' },
        { uncertainty_id: 'minor', material: false, statement: 'Omit immaterial detail.' },
      ],
      conflicts: [
        {
          conflict_id: 'open',
          status: 'open',
          source_refs: ['r0:source-1'],
          statement: 'Two supported sources disagree.',
        },
        {
          conflict_id: 'resolved',
          status: 'reconciled',
          source_refs: ['r0:source-1'],
          statement: 'Resolved conflict is omitted.',
        },
      ],
      br_ids: [],
      sr_ids: [],
      ac_ids: [],
      gap_ids: [],
      options: [
        { option_id: 'option-a', label: 'Option A', description: 'Use the restricted token.', evidence_refs: [] },
      ],
      recommendation: { option_id: 'option-a', rationale: 'It preserves least privilege.', evidence_refs: [] },
      completeness: {
        status: 'blocked',
        required_questions: [],
        answered_questions: [],
        missing_questions: [],
        material_gaps: ['Security review must cover token scope.'],
        external_validation: { required: false, source_count: 0, minimum_sources: 0, status: 'not_required' },
      },
      readiness: 'blocked',
      instruction_activation: {
        use_id: 'activation-current',
        risk: 'low',
        phase: 'research',
        lane: 'code',
        trigger: 'test fixture',
        required_instruction_ids: [],
        instruction_ids: [],
        registry_digest: 'a'.repeat(64),
        source_digests: [],
      },
      actor: 'test',
      pointer: 'artifact://synthesis/current',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      digest: 'b'.repeat(64),
    };

    const content = citedSynthesisConstraints(synthesis);
    expect(content).toContain(
      'Synthesis synthesis-current/finding-security [r0:source-1]: The token permission boundary is security sensitive.',
    );
    expect(content).toContain('Synthesis uncertainty material: The deployment target remains uncertain.');
    expect(content).toContain('Synthesis conflict open (open): Two supported sources disagree.');
    expect(content).toContain('Synthesis option option-a: Option A — Use the restricted token.');
    expect(content).toContain('Synthesis recommendation option-a: It preserves least privilege.');
    expect(content).toContain('Synthesis completeness gap: Security review must cover token scope.');
    expect(content.some((entry) => entry.includes('tentative'))).toBe(false);
    expect(content.some((entry) => entry.includes('immaterial'))).toBe(false);
    expect(content.some((entry) => entry.includes('Resolved conflict'))).toBe(false);
  });
});

test('projects only typed failed validator findings with an observation-bound diagnostic reference', () => {
  const { config } = configuredTestContext();
  const workflowId = 'implementation_change';
  const workflow: AgentRuntimeConfig['workflows'][string] | undefined = config.workflows[workflowId];
  if (!workflow) throw new Error(`Test configuration requires ${workflowId}`);
  const stage = workflow.stages.find(
    (entry) =>
      entry.id === 'validate_parallel' && entry.kind === 'validate' && entry.produces.includes('ValidationReceipt/v1'),
  );
  if (!stage) throw new Error('Test configuration requires the focused validation stage');
  const team = config.teams['default-development'];
  if (!team) throw new Error('Test configuration requires default-development');
  const project = team.allowed_projects[0];
  if (!project) throw new Error('Test configuration requires an allowed development project');
  const selection = {
    team: 'default-development',
    kind: 'feature',
    intent: workflowId,
    project,
    risk_flags: ['security'],
    labels: [],
  } satisfies WorkItemSelection;
  const compiled = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags);
  const waveIndex = compiled.waves.findIndex((wave) => wave.some((candidate) => candidate.id === stage.id));
  if (waveIndex < 0) throw new Error('Focused validation stage is not in the configured workflow');
  const action = sessionActionsForWave(
    config,
    selection,
    { work_id: 'work-item', attempt: 1, scope_digest: 'b'.repeat(64) },
    workflowId,
    waveIndex,
    [],
  ).find((candidate) => candidate.stage_id === stage.id && candidate.role === 'security-data-validator');
  if (!action) throw new Error('Configured security validator action is unavailable');
  const actionId = action.action_id;
  const evidenceRefs = ['artifact://validation/current'];
  const verdict = {
    schema: 'VidaValidatorVerdict/v1',
    verdict: 'fail',
    findings: ['Security finding: token permissions exceed the admitted scope.'],
    evidence_refs: evidenceRefs,
  };
  const summary = JSON.stringify(verdict);
  const observation: SessionBridgeObservation = {
    schema: 'VidaSessionObservation/v1',
    action_id: actionId,
    issue_id: '00000000-0000-4000-8000-000000000001',
    agent_id: 'validator-agent',
    tool_call_ref: 'validator-call-current',
    status: 'reported_failed',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: evidenceRefs,
  };
  const journal: MastraSessionLedgerState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: 'workspace-current',
    work_id: 'work-item',
    attempt: 1,
    run_id: 'run-current',
    step_id: null,
    completed: [
      {
        step_id: 'validation-wave',
        items: [
          {
            request: {
              schema: 'VidaSessionRequest/v1',
              run_id: 'run-current',
              workflow_id: workflowId,
              wave_index: waveIndex,
              action_id: actionId,
              assignment_index: action.assignment_index,
              stage_id: stage.id,
              role: action.role,
              config_digest: runtimeConfigDigest(config),
              scope_digest: 'b'.repeat(64),
              bindings_manifest_ref: 'c'.repeat(64),
            },
            issue_id: observation.issue_id,
            observation,
          },
        ],
      },
    ],
    items: [],
  };

  const result = correctivePacketEvidence(journal, workflow);
  expect(result.diagnostics).toEqual([
    {
      error_class: 'validator_failure',
      log_ref: `artifact://session-observation/${journal.run_id}/${actionId}/${observation.output_digest}`,
      message: verdict.findings[0]!,
    },
  ]);
  expect(result.failed_approaches[0]).toContain(actionId);
  expect(result.security_constraints).toEqual([`Prior validator security finding: ${verdict.findings[0]}`]);
});
