import { configuredTestContext } from './configured-context.mjs';
import { randomUUID } from 'node:crypto';
import { test, expect } from 'bun:test';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildDevelopmentTaskPacket, buildImplementationResult } from '../src/orchestration/mastra-boundary.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { issueObservedTestReceipt } from '../src/orchestration/observed-testing.ts';

const { repositoryRoot: root, config } = configuredTestContext();
const owned = ['packages/agent/TESTING.md'];
const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), owned);
const selection = {
  team: 'default-development',
  kind: 'feature',
  intent: 'implementation_change',
  project: config.teams['default-development'].allowed_projects[0],
  risk_flags: [],
  labels: [],
};
const workId = 'observed-tester-report-contract';
const packet = buildDevelopmentTaskPacket(config, {
  packet_id: 'observed-tester-packet',
  work_item_id: workId,
  team_id: selection.team,
  workflow_id: 'implementation_change',
  work_item: { kind: selection.kind, intent: selection.intent, project: selection.project, risk_flags: [], labels: [] },
  attempt: 1,
  risk_flags: [],
  objective: 'Check the cooperative tester evidence contract.',
  acceptance: ['The observed tester report is bound to the current implementation.'],
  in_scope: owned,
  out_of_scope: [],
  owned_paths: owned,
  affected_symbols: [],
  skill_refs: [],
  documentation_refs: [],
  code_evidence_refs: [],
  research_artifact_refs: ['artifact://research/fixture/' + 'a'.repeat(64)],
  diagnostics: [],
  failed_approaches: [],
  prohibited_patterns: [],
  implementation_constraints: ['Preserve the observed report contract.'],
  security_constraints: [],
  expected_tests: ['Run the focused candidate acceptance check.'],
  delivery_conditions: ['Configured evidence is present.'],
  source_revision: source.digest,
  lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
});
const implementationResult = buildImplementationResult(packet, {
  result_id: 'observed-tester-implementation',
  packet_id: packet.packet_id,
  source_revision: packet.source_revision,
  implementation_fingerprint: source.digest,
  changed_paths: [],
  test_refs: [],
});
const workflow = compileDevelopmentWorkflow(config, selection.team, 'implementation_change', []);
const waveIndex = workflow.waves.findIndex((wave) => wave.some((stage) => stage.kind === 'test'));
const action = sessionActionsForWave(
  config,
  selection,
  { work_id: workId, attempt: 1, scope_digest: source.digest },
  'implementation_change',
  waveIndex,
  [],
).find((candidate) => candidate.stage_kind === 'test');
const issueId = randomUUID();
const evidenceRefs = ['packages/agent/TESTING.md#candidate-check'];
const summary = JSON.stringify({ schema: 'VidaTesterVerdict/v1', status: 'pass', evidence_refs: evidenceRefs });
const observation = {
  schema: 'VidaSessionObservation/v1',
  action_id: action.action_id,
  issue_id: issueId,
  agent_id: 'native-tester',
  tool_call_ref: 'observed-tester-report',
  status: 'reported_complete',
  summary,
  output_digest: canonicalJsonDigest(summary),
  evidence_refs: evidenceRefs,
};
const request = {
  schema: 'VidaSessionRequest/v1',
  run_id: 'observed-tester-run',
  workflow_id: 'implementation_change',
  wave_index: waveIndex,
  action_id: action.action_id,
  assignment_index: action.assignment_index,
  stage_id: action.stage_id,
  role: action.role,
  config_digest: runtimeConfigDigest(config),
  scope_digest: source.digest,
  bindings_manifest_ref: 'b'.repeat(64),
};
const journal = {
  state: {
    work_id: workId,
    attempt: 1,
    run_id: request.run_id,
    source_scope: source,
    items: [],
    completed: [{ step_id: 'wave-' + waveIndex, items: [{ request, issue_id: issueId, observation }] }],
  },
};
const authority = {
  issueTestReceipt: (input) => ({ schema: 'TestReceipt/v1', ...input }),
};
const receiptInput = {
  repositoryRoot: root,
  config,
  packet,
  implementationResult,
  journal,
  authority,
};

test('a current observed tester pass remains caller report consistency, not execution proof', () => {
  const result = issueObservedTestReceipt(receiptInput);

  expect(result.receipt.status).toBe('pass');
  expect(result.receipt.evidence_refs).toEqual([
    `artifact://session-observation/${request.run_id}/${request.action_id}/${observation.output_digest}`,
  ]);
  expect(result.evidence).toEqual({
    classification: 'caller_report_consistency',
    test_execution_verified: false,
  });
});

test('caller-supplied evidence classification claims are rejected', () => {
  expect(() =>
    issueObservedTestReceipt({
      ...receiptInput,
      classification: 'trusted_test_execution',
      test_execution_verified: true,
    }),
  ).toThrow(/classification is runtime-derived/);
});

test('the full delivery caller uses Host-bound Source and still rejects drift and unknown fields', () => {
  const host = {
    work: {
      binding: {
        repository_id: config.repository.repository_id,
        project_ids: [selection.project],
        integrations_digest: 'c'.repeat(64),
        lifecycle_work_id: workId,
      },
      lease: { thread_id: 'delivery-caller', ticket_id: 'delivery-ticket', generation: 1 },
    },
  };
  let sourceCalls = 0;
  const sourceStore = {
    snapshotCurrentTaskSourceSources(identity, owner, paths, attempt) {
      sourceCalls++;
      expect(identity.work_id).toBe(workId);
      expect(owner).toBe(host.work.lease.thread_id);
      expect(paths).toEqual(packet.owned_paths);
      expect(attempt).toBe(journal.state.attempt);
      return snapshotDeclaredSources(requireSafeRepositoryAccess(root), paths);
    },
  };
  const fullCaller = { ...receiptInput, host, sourceStore };
  const result = issueObservedTestReceipt(fullCaller);
  expect(sourceCalls).toBe(1);
  expect(result.receipt.status).toBe('pass');
  expect(result.evidence.test_execution_verified).toBe(false);
  expect(() => issueObservedTestReceipt({ ...fullCaller, unexpected: true })).toThrow(/caller fields are closed/);
  expect(sourceCalls).toBe(1);
  expect(() => issueObservedTestReceipt({
    ...fullCaller,
    sourceStore: { snapshotCurrentTaskSourceSources: () => ({ ...source, digest: 'd'.repeat(64) }) },
  })).toThrow(/source or work changed/);
});
