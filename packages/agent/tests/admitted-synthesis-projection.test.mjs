import { describe, expect, test } from 'bun:test';
import {
  citedSynthesisConstraints,
  correctivePacketEvidence,
} from '../src/orchestration/admitted-development-packet.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { configuredTestContext } from './configured-context.mjs';

describe('admitted synthesis packet projection', () => {
  test('carries confirmed findings, material uncertainty, unresolved conflicts, options and recommendation', () => {
    const synthesis = {
      bundle_id: 'synthesis-current',
      result_refs: [{ result_id: 'research-current', digest: 'a'.repeat(64) }],
      findings: [
        {
          finding_id: 'finding-security',
          status: 'confirmed',
          source_refs: ['r0:source-1'],
          statement: 'The token permission boundary is security sensitive.',
        },
        {
          finding_id: 'finding-tentative',
          status: 'tentative',
          source_refs: ['r0:source-1'],
          statement: 'Do not promote tentative synthesis to a developer constraint.',
        },
      ],
      uncertainties: [
        { uncertainty_id: 'material', material: true, statement: 'The deployment target remains uncertain.' },
        { uncertainty_id: 'minor', material: false, statement: 'Omit immaterial detail.' },
      ],
      conflicts: [
        { conflict_id: 'open', status: 'open', statement: 'Two supported sources disagree.' },
        { conflict_id: 'resolved', status: 'reconciled', statement: 'Resolved conflict is omitted.' },
      ],
      options: [{ option_id: 'option-a', label: 'Option A', description: 'Use the restricted token.' }],
      recommendation: { option_id: 'option-a', rationale: 'It preserves least privilege.' },
      completeness: { material_gaps: ['Security review must cover token scope.'] },
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
  const workflow = config.workflows.task_execution;
  const stage = workflow.stages.find((entry) => entry.kind === 'validate');
  const actionId = 'e'.repeat(64);
  const evidenceRefs = ['artifact://validation/current'];
  const verdict = {
    schema: 'VidaValidatorVerdict/v1',
    verdict: 'fail',
    findings: ['Security finding: token permissions exceed the admitted scope.'],
    evidence_refs: evidenceRefs,
  };
  const summary = JSON.stringify(verdict);
  const observation = {
    action_id: actionId,
    issue_id: 'validator-issue',
    status: 'reported_failed',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: evidenceRefs,
  };
  const journal = {
    work_id: 'work-item',
    attempt: 1,
    run_id: 'run-current',
    completed: [
      {
        items: [
          {
            request: { action_id: actionId, stage_id: stage.id, role: 'security-data-validator' },
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
      message: verdict.findings[0],
    },
  ]);
  expect(result.failed_approaches[0]).toContain(actionId);
  expect(result.security_constraints).toEqual([`Prior validator security finding: ${verdict.findings[0]}`]);
});
