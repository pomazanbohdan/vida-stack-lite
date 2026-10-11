import { randomUUID } from 'node:crypto';
import { expect, test } from 'bun:test';
import { configuredTestContext } from './configured-context.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import type { HostStateSnapshot, WorkState } from '../src/host-state.ts';
import {
  buildDevelopmentTaskPacket,
  buildImplementationResult,
  type DeliveryEvidenceAuthority,
  type TestReceipt,
  type TestReceiptInput,
} from '../src/orchestration/mastra-boundary.ts';
import type { MastraSessionLedgerSnapshot } from '../src/orchestration/persistent-session-handoff.ts';
import type { SessionBridgeObservation, SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { issueObservedTestReceipt } from '../src/orchestration/observed-testing.ts';
import type { AgentRuntimeConfig, WorkItemSelection } from '../src/config/runtime-config.ts';
import type { HostStateStore } from '../src/host-state.ts';

const { repositoryRoot: root, config } = configuredTestContext();
const owned = ['packages/agent/TESTING.md'];
const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), owned);
const configuredTeam = config.teams['default-development'];
if (!configuredTeam) throw new Error('Test configuration requires default-development');
const project = configuredTeam.allowed_projects[0];
if (!project) throw new Error('Configured development team has no allowed project.');
const selection = {
  team: 'default-development',
  kind: 'feature',
  intent: 'implementation_change',
  project,
  risk_flags: [],
  labels: [],
} satisfies WorkItemSelection;
const workId = 'observed-tester-report-contract';
const packet = buildDevelopmentTaskPacket(config, {
  packet_id: 'observed-tester-packet',
  work_item_id: workId,
  team_id: selection.team,
  workflow_id: 'implementation_change',
  work_item: {
    kind: selection.kind,
    intent: selection.intent,
    project: selection.project,
    risk_flags: [],
    labels: [],
  },
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
if (waveIndex < 0) throw new Error('Configured workflow has no tester stage.');
const action = sessionActionsForWave(
  config,
  selection,
  { work_id: workId, attempt: 1, scope_digest: source.digest },
  'implementation_change',
  waveIndex,
  [],
).find((candidate) => candidate.stage_kind === 'test');
if (!action) throw new Error('Configured tester action is unavailable.');

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
} satisfies SessionBridgeObservation;
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
} satisfies SessionBridgeRequest;
const journal = {
  version: { revision: 1, digest: 'e'.repeat(64) },
  state: {
    schema: 'MastraSessionLedger/v1',
    workspace_id: 'observed-tester-workspace',
    work_id: workId,
    attempt: 1,
    run_id: request.run_id,
    source_scope: source,
    step_id: null,
    items: [],
    completed: [{ step_id: 'wave-' + waveIndex, items: [{ request, issue_id: issueId, observation }] }],
  },
  resume_status: 'complete',
} satisfies MastraSessionLedgerSnapshot;
const authority: DeliveryEvidenceAuthority = {
  issueValidationReceipt: () => {
    throw new Error('Observed tester fixture does not issue validator receipts.');
  },
  issueTestReceipt: (input: TestReceiptInput): TestReceipt => ({ schema: 'TestReceipt/v1', ...input }),
};
const receiptInput = {
  repositoryRoot: root,
  config,
  packet,
  implementationResult,
  journal,
  authority,
} satisfies Parameters<typeof issueObservedTestReceipt>[0];

function hostSnapshot(
  runtimeConfig: AgentRuntimeConfig,
  workItem: WorkItemSelection,
  runId: string,
): HostStateSnapshot {
  const work = {
    schema: 'WorkState/v1',
    workspace_id: 'observed-tester-workspace',
    revision: 1,
    binding: {
      repository_id: runtimeConfig.repository.repository_id,
      project_ids: [workItem.project],
      integrations_digest: 'c'.repeat(64),
      team_id: workItem.team,
      workflow_id: 'implementation_change',
      provider_work_item_id: workId,
      lifecycle_work_id: workId,
      work_item_digest: canonicalJsonDigest({
        kind: workItem.kind,
        intent: workItem.intent,
        project: workItem.project,
      }),
      work_source_revision: source.digest,
      scope_id: 'observed-tester-scope',
      scope_contract_digest: 'd'.repeat(64),
      acceptance_manifest_digest: 'e'.repeat(64),
      ac_ids: ['observed-tester-ac'],
      implementation_paths: owned,
      allowed_resources: owned,
      config_digest: runtimeConfigDigest(runtimeConfig),
      runtime_source_revision: source.digest,
      schema_digest: 'f'.repeat(64),
      runtime_code_digest: 'a'.repeat(64),
    },
    contracts: {
      scope: { schema: 'Scope/v1', path: 'scope.json', sha256: 'd'.repeat(64) },
      acceptance: { schema: 'Acceptance/v1', path: 'acceptance.json', sha256: 'e'.repeat(64) },
      decisions: [],
    },
    lease: { thread_id: 'delivery-caller', ticket_id: 'delivery-ticket', generation: 1 },
    execution: {
      run_id: runId,
      input_digest: 'b'.repeat(64),
      phase: 'execute',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'EXECUTE',
      source_revision: source.digest,
      next_action: 'test',
      route: 'R1',
      risk: 'low',
      change_kind: 'feature',
      config_binding: {
        config_digest: runtimeConfigDigest(runtimeConfig),
        schema_digest: 'f'.repeat(64),
        runtime_code_digest: 'a'.repeat(64),
      },
      scope: {
        scope_id: 'observed-tester-scope',
        allowed_paths: owned,
        fingerprint_paths: owned,
        implementation_paths: owned,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'observed-tester-epoch',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    artifacts: [],
  } satisfies WorkState;
  return {
    work,
    ledger: null,
    workVersion: { revision: 1, digest: '1'.repeat(64) },
    ledgerVersion: null,
    maintenanceGeneration: 0,
  };
}

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
  const forgedInput = {
    ...receiptInput,
    classification: 'trusted_test_execution',
    test_execution_verified: true,
  };
  expect(() => issueObservedTestReceipt(forgedInput)).toThrow(/classification is runtime-derived/);
});

test('the full delivery caller uses Host-bound Source and still rejects drift and unknown fields', () => {
  const host = hostSnapshot(config, selection, request.run_id);
  let sourceCalls = 0;
  const sourceStore: Pick<HostStateStore, 'snapshotCurrentTaskSourceSources'> = {
    snapshotCurrentTaskSourceSources(identity, owner, paths, attempt) {
      sourceCalls++;
      expect(identity.work_id).toBe(workId);
      expect(owner).toBe('delivery-caller');
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
  const unexpectedCaller = { ...fullCaller, unexpected: true };
  expect(() => issueObservedTestReceipt(unexpectedCaller)).toThrow(/caller fields are closed/);
  expect(sourceCalls).toBe(1);
  const driftedSourceStore: Pick<HostStateStore, 'snapshotCurrentTaskSourceSources'> = {
    snapshotCurrentTaskSourceSources: (_identity, _owner, _paths, _attempt) => ({ ...source, digest: 'd'.repeat(64) }),
  };
  expect(() => issueObservedTestReceipt({ ...fullCaller, sourceStore: driftedSourceStore })).toThrow(
    /source or work changed/,
  );
});
