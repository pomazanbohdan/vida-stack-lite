import { randomUUID } from 'node:crypto';
import { expect, test } from 'bun:test';
import { configuredTestContext } from './configured-context.ts';
import { runtimeConfigDigest, type WorkItemSelection } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import type { AssignmentAttempt, HostStateSnapshot, WorkState } from '../src/host-state.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import {
  buildDevelopmentTaskPacket,
  buildImplementationResult,
  type DeliveryEvidenceAuthority,
  type DevelopmentTaskPacketInput,
  type ImplementationResultInput,
  type ValidationReceipt,
  type ValidationReceiptInput,
} from '../src/orchestration/mastra-boundary.ts';
import type {
  MastraSessionLedgerSnapshot,
  MastraSessionLedgerState,
} from '../src/orchestration/persistent-session-handoff.ts';
import type { SessionBridgeObservation, SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import {
  issueObservedValidationReceipt,
  parseObservedValidatorVerdict,
} from '../src/orchestration/observed-validation.ts';
import { observedReceiptEvidenceReference } from '../src/orchestration/observed-receipt-evidence.ts';
import { buildAdmittedImplementationResult } from '../src/orchestration/admitted-implementation-result.ts';
import type { TrustedWorkflowAssignment, WorkflowSessionReservation } from '../src/runtime-kernel.ts';
import type { WorkExecutionContext } from '../src/orchestration/workflow-session-reservation-contract.ts';

const { repositoryRoot: root, config } = configuredTestContext();
const workId = 'observed-validator-test';
const owned = ['packages/agent/TESTING.md'];
const initial = snapshotDeclaredSources(requireSafeRepositoryAccess(root), owned);
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
const context = { work_id: workId, attempt: 1, scope_digest: initial.digest };
const packetInput = {
  packet_id: 'observed-validator-packet',
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
  objective: 'Verify the bounded candidate test contract.',
  acceptance: ['The candidate test contract remains readable.'],
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
  implementation_constraints: ['Read only the accepted path.'],
  security_constraints: [],
  expected_tests: ['Verify the bounded file hash.'],
  delivery_conditions: ['All validators pass.'],
  source_revision: initial.digest,
  lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
} satisfies DevelopmentTaskPacketInput;
const packet = buildDevelopmentTaskPacket(config, packetInput);
const implementationResultInput = {
  result_id: 'observed-validator-implementation',
  packet_id: packet.packet_id,
  source_revision: packet.source_revision,
  implementation_fingerprint: initial.digest,
  changed_paths: [],
  test_refs: [],
} satisfies ImplementationResultInput;
const result = buildImplementationResult(packet, implementationResultInput);
const workflow = compileDevelopmentWorkflow(config, selection.team, 'implementation_change', []);
const waveIndex = workflow.waves.findIndex((wave) =>
  wave.some((stage) => stage.kind === 'validate' && stage.produces.includes('ValidationReceipt/v1')),
);
if (waveIndex < 0) throw new Error('Configured workflow has no validation receipt stage.');
const action = sessionActionsForWave(config, selection, context, 'implementation_change', waveIndex, []).find(
  (entry) => entry.role === 'correctness-validator',
);
if (!action) throw new Error('Configured correctness validator action is unavailable.');
const request = {
  schema: 'VidaSessionRequest/v1',
  run_id: 'fixture-run',
  workflow_id: 'implementation_change',
  wave_index: waveIndex,
  action_id: action.action_id,
  assignment_index: action.assignment_index,
  stage_id: action.stage_id,
  role: action.role,
  config_digest: runtimeConfigDigest(config),
  scope_digest: initial.digest,
  bindings_manifest_ref: 'b'.repeat(64),
} satisfies SessionBridgeRequest;
const issueId = randomUUID();
const evidenceRefs = ['packages/agent/TESTING.md#validator'];
const summary = JSON.stringify({
  schema: 'VidaValidatorVerdict/v1',
  verdict: 'pass',
  findings: [],
  evidence_refs: evidenceRefs,
});
const observation = {
  schema: 'VidaSessionObservation/v1',
  action_id: action.action_id,
  issue_id: issueId,
  agent_id: 'native-validator',
  tool_call_ref: 'observed-test-ref',
  status: 'reported_complete',
  summary,
  output_digest: canonicalJsonDigest(summary),
  evidence_refs: evidenceRefs,
} satisfies SessionBridgeObservation;
const authority: DeliveryEvidenceAuthority = {
  issueValidationReceipt: (input: ValidationReceiptInput): ValidationReceipt => ({
    schema: 'ValidationReceipt/v1',
    ...input,
  }),
  issueTestReceipt: () => {
    throw new Error('Observed validator fixture does not issue tester receipts.');
  },
};
const journalState = {
  schema: 'MastraSessionLedger/v1',
  workspace_id: 'observed-validator-workspace',
  work_id: workId,
  attempt: 1,
  run_id: request.run_id,
  source_scope: initial,
  step_id: null,
  items: [],
  completed: [{ step_id: 'wave-' + waveIndex, items: [{ request, issue_id: issueId, observation }] }],
} satisfies MastraSessionLedgerState;
const journal = {
  version: { revision: 1, digest: canonicalJsonDigest(journalState) },
  state: journalState,
  resume_status: 'complete',
} satisfies MastraSessionLedgerSnapshot;
const receiptInput = {
  repositoryRoot: root,
  config,
  packet,
  implementationResult: result,
  journal,
  actionId: request.action_id,
  authority,
} satisfies Parameters<typeof issueObservedValidationReceipt>[0];

test('issues a role and final-fingerprint bound receipt from a matching observed validator', () => {
  expect(packet.skill_refs).toEqual([]);
  expect(packet.documentation_refs).toEqual([]);
  expect(packet.code_evidence_refs).toEqual([]);
  expect(result.test_refs).toEqual([]);
  const receipt = issueObservedValidationReceipt(receiptInput);
  expect(receipt.validator_role).toBe('correctness-validator');
  expect(receipt.packet_digest).toBe(packet.digest);
  expect(receipt.implementation_fingerprint).toBe(initial.digest);
  expect(receipt.evidence_refs).toEqual([
    `artifact://session-observation/${request.run_id}/${request.action_id}/${observation.output_digest}`,
  ]);
  expect(observation.evidence_refs).toEqual(evidenceRefs);
  expect(() => observedReceiptEvidenceReference(journal, request.action_id, 'f'.repeat(64))).toThrow(
    /unique persisted observation/,
  );
  expect(() => observedReceiptEvidenceReference(journal, 'f'.repeat(64), observation.output_digest)).toThrow(
    /unique persisted observation/,
  );
});

test('optional packet reference categories still reject malformed entries', () => {
  expect(() => buildDevelopmentTaskPacket(config, { ...packetInput, skill_refs: [''] })).toThrow(
    /packet skill references/,
  );
  expect(() => buildDevelopmentTaskPacket(config, { ...packetInput, documentation_refs: ['same', 'same'] })).toThrow(
    /packet documentation references/,
  );
  const malformedCodeReferences: unknown = { ...packetInput, code_evidence_refs: [null] };
  expect(() => {
    Reflect.apply(buildDevelopmentTaskPacket, undefined, [config, malformedCodeReferences]);
  }).toThrow(/packet code evidence references/);
  expect(() =>
    buildImplementationResult(packet, {
      ...implementationResultInput,
      result_id: 'malformed-test-ref',
      test_refs: [''],
    }),
  ).toThrow(/implementation result test references/);
});

test('rejects foreign action, work, report, stale fingerprint, and inconsistent verdict bindings', () => {
  expect(() => issueObservedValidationReceipt({ ...receiptInput, actionId: 'f'.repeat(64) })).toThrow(
    /persisted observation/,
  );
  expect(() =>
    issueObservedValidationReceipt({
      ...receiptInput,
      implementationResult: { ...result, implementation_fingerprint: 'f'.repeat(64) },
    }),
  ).toThrow();
  expect(() =>
    issueObservedValidationReceipt({
      ...receiptInput,
      journal: { ...journal, state: { ...journal.state, work_id: 'foreign-work' } },
    }),
  ).toThrow(/persisted validation source or work binding differs/);
  expect(() =>
    issueObservedValidationReceipt({
      ...receiptInput,
      journal: { ...journal, state: { ...journal.state, run_id: 'foreign-run' } },
    }),
  ).toThrow(/persisted validation source or work binding differs/);
  expect(() =>
    issueObservedValidationReceipt({
      ...receiptInput,
      journal: {
        ...journal,
        state: {
          ...journal.state,
          completed: [
            {
              step_id: 'wave-' + waveIndex,
              items: [{ request: { ...request, run_id: 'foreign-run' }, issue_id: issueId, observation }],
            },
          ],
        },
      },
    }),
  ).toThrow(/persisted validation source or work binding differs/);
  expect(() =>
    issueObservedValidationReceipt({
      ...receiptInput,
      journal: {
        ...journal,
        state: {
          ...journal.state,
          completed: [
            {
              step_id: 'wave-' + waveIndex,
              items: [{ request, issue_id: 'foreign-issue', observation }],
            },
          ],
        },
      },
    }),
  ).toThrow(/validator observation is not bound to the issued action/);
  expect(() => parseObservedValidatorVerdict({ ...observation, status: 'reported_failed' })).toThrow(/status differs/);
  for (const evidence_refs of [
    ['../outside.txt'],
    ['packages/agent/TESTING.md#../outside.txt'],
    ['https://example.com/report'],
    ['C:/outside.txt'],
    ['packages/agent\\TESTING.md'],
  ]) {
    const unsafeSummary = JSON.stringify({
      schema: 'VidaValidatorVerdict/v1',
      verdict: 'pass',
      findings: [],
      evidence_refs,
    });
    expect(() => parseObservedValidatorVerdict({ ...observation, summary: unsafeSummary, evidence_refs })).toThrow(
      /safe internal citation/,
    );
  }
  expect(() =>
    issueObservedValidationReceipt({
      ...receiptInput,
      journal: {
        ...journal,
        state: {
          ...journal.state,
          completed: [
            {
              step_id: 'wave-' + waveIndex,
              items: [{ request: { ...request, role: 'requirements-validator' }, issue_id: issueId, observation }],
            },
          ],
        },
      },
    }),
  ).toThrow(/configured stage/);
});

function completedDevelopmentFixture(): {
  readonly host: HostStateSnapshot;
  readonly ledger: MastraSessionLedgerSnapshot;
  readonly attemptId: string;
  readonly stageId: string;
  readonly assignmentIndex: number;
  readonly developObservation: SessionBridgeObservation;
} {
  // Synthetic persisted data for this pure reader test; it is not a Host CAS or authorization receipt.
  const developerWave = workflow.waves.findIndex((wave) => wave.some((stage) => stage.kind === 'develop'));
  if (developerWave < 0) throw new Error('Configured workflow has no developer stage.');
  const developer = sessionActionsForWave(config, selection, context, 'implementation_change', developerWave, [])[0];
  if (!developer) throw new Error('Configured developer action is unavailable.');
  const attemptId = 'd'.repeat(64);
  const developIssue = randomUUID();
  const developSummary = 'Observed bounded fixture execution';
  const developObservation = {
    schema: 'VidaSessionObservation/v1',
    action_id: developer.action_id,
    issue_id: developIssue,
    host_attempt_id: attemptId,
    changed_paths: [],
    agent_id: 'native-developer',
    tool_call_ref: 'native-developer-ref',
    status: 'reported_complete',
    summary: developSummary,
    output_digest: canonicalJsonDigest(developSummary),
    evidence_refs: [],
  } satisfies SessionBridgeObservation;
  const developRequest = {
    ...request,
    wave_index: developerWave,
    action_id: developer.action_id,
    assignment_index: developer.assignment_index,
    stage_id: developer.stage_id,
    role: developer.role,
  } satisfies SessionBridgeRequest;
  const developerStage = config.workflows[packet.workflow_id]?.stages.find((stage) => stage.id === developer.stage_id);
  const developerAssignment = developerStage?.assignments[developer.assignment_index];
  if (!developerStage || !developerAssignment) throw new Error('Configured developer assignment is unavailable.');
  const operation = config.operations.registry.find(
    (entry) => entry.profile === config.orchestration.mastra.default_profile && entry.tool === 'runtime.read',
  );
  const profile = operation && config.agents.profiles[operation.profile];
  const roleInstruction = config.agents.role_instructions[developer.role];
  if (!operation || !profile || !roleInstruction)
    throw new Error('Configured workflow invocation evidence is unavailable.');
  const projectContext = loadProjectSetContext(root, config, config.repository.repository_id, [selection.project]);
  const workItemDigest = canonicalJsonDigest({
    kind: selection.kind,
    intent: selection.intent,
    project: selection.project,
  });
  const binding = {
    repository_id: config.repository.repository_id,
    project_ids: [selection.project],
    integrations_digest: 'c'.repeat(64),
    team_id: selection.team,
    workflow_id: 'implementation_change',
    provider_work_item_id: workId,
    lifecycle_work_id: workId,
    work_item_digest: workItemDigest,
    work_source_revision: initial.digest,
    scope_id: 'observed-validator-scope',
    scope_contract_digest: 'd'.repeat(64),
    acceptance_manifest_digest: 'e'.repeat(64),
    ac_ids: ['observed-validator-ac'],
    implementation_paths: owned,
    allowed_resources: owned,
    config_digest: runtimeConfigDigest(config),
    runtime_source_revision: initial.digest,
    schema_digest: 'f'.repeat(64),
    runtime_code_digest: 'a'.repeat(64),
  } satisfies WorkState['binding'];
  const developerAttempt = {
    assignment_id: developer.action_id,
    attempt_id: attemptId,
    previous_attempt_id: null,
    request_digest: canonicalJsonDigest(developRequest),
    stage_id: developer.stage_id,
    assignment_index: developer.assignment_index,
    correction_generation: 0,
    correction_authorization: null,
    lease: { thread_id: 'observed-validator-caller', ticket_id: 'observed-validator-ticket', generation: 1 },
    status: 'completed',
    result: developObservation,
    result_digest: canonicalJsonDigest(developObservation),
    reconciliation: null,
  } satisfies AssignmentAttempt;
  const assignmentRequest = {
    repositoryRoot: root,
    configDigest: runtimeConfigDigest(config),
    teamId: selection.team,
    workflowId: 'implementation_change',
    stageId: developer.stage_id,
    assignmentIndex: developer.assignment_index,
    workItemId: workId,
    workItemDigest,
    workContextDigest: '1'.repeat(64),
    input: {},
  };
  const workContext = {
    schema: 'WorkExecutionContext/v1',
    binding,
    permit: {
      context_digest: '1'.repeat(64),
      checkpoint_revision: 1,
      checkpoint_digest: '2'.repeat(64),
      runtime_current_revision: 1,
      stage_id: developer.stage_id,
      assignment_index: developer.assignment_index,
      dispatch_authorized: false,
      lease: {
        thread_id: developerAttempt.lease.thread_id,
        ticket_id: developerAttempt.lease.ticket_id,
        generation: developerAttempt.lease.generation,
        ledger_revision: 1,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        active_resources: owned,
        blocked_resources: [],
      },
    },
  } satisfies WorkExecutionContext;
  const invocation = {
    operation,
    authentication: {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: config.repository.repository_id,
      projectIds: [selection.project],
      integrationsDigest: binding.integrations_digest,
      principal: 'observed-validator-test',
      configRevision: 1,
      permittedOperations: [],
    },
    configDigest: runtimeConfigDigest(config),
    project: projectContext,
    teamId: selection.team,
    workflowId: 'implementation_change',
    stage: developerStage,
    assignment: developerAssignment,
    assignmentIndex: developer.assignment_index,
    attempt: developerAttempt,
    profile,
    roleInstruction,
    roleInstructionDigest: canonicalJsonDigest(roleInstruction),
    riskFlags: selection.risk_flags,
    workItem: {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'fixture',
      provider_type: 'fixture',
      canonical_kind: 'feature',
      intent: 'implementation_change',
      project_id: selection.project,
      title: 'Observed validator fixture',
      description: 'Typed persisted workflow reservation fixture.',
      labels: [],
      risk_flags: [],
    },
    workContext,
    input: {},
  } satisfies TrustedWorkflowAssignment;
  const hostReservation = {
    schema: 'WorkflowSessionReservation/v1',
    request: assignmentRequest,
    invocation,
    receipt: {
      identity: {
        repository_id: binding.repository_id,
        project_ids: binding.project_ids,
        integrations_digest: binding.integrations_digest,
        work_id: binding.lifecycle_work_id,
      },
      workVersion: { revision: 1, digest: '3'.repeat(64) },
      attempt: developerAttempt,
      maintenanceGeneration: 0,
    },
    requestDigest: canonicalJsonDigest(assignmentRequest),
    approvalAction: null,
    authorization: null,
  } satisfies WorkflowSessionReservation;
  const state = {
    ...journal.state,
    completed: [
      {
        step_id: 'wave-' + developerWave,
        items: [
          {
            request: developRequest,
            issue_id: developIssue,
            observation: developObservation,
            host_reservation: hostReservation,
          },
        ],
      },
    ],
  } satisfies MastraSessionLedgerState;
  const ledger = {
    version: { revision: 1, digest: canonicalJsonDigest(state) },
    state,
    resume_status: 'complete',
  } satisfies MastraSessionLedgerSnapshot;
  const work = {
    schema: 'WorkState/v1',
    workspace_id: journal.state.workspace_id,
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'Scope/v1', path: 'scope.json', sha256: 'd'.repeat(64) },
      acceptance: { schema: 'Acceptance/v1', path: 'acceptance.json', sha256: 'e'.repeat(64) },
      decisions: [],
    },
    lease: { thread_id: 'observed-validator-caller', ticket_id: 'observed-validator-ticket', generation: 1 },
    execution: {
      run_id: request.run_id,
      input_digest: 'b'.repeat(64),
      phase: 'execute',
      status: 'active',
      assignment_attempts: [developerAttempt],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'EXECUTE',
      source_revision: initial.digest,
      next_action: 'validate',
      route: 'R1',
      risk: 'low',
      change_kind: 'feature',
      config_binding: {
        config_digest: runtimeConfigDigest(config),
        schema_digest: 'f'.repeat(64),
        runtime_code_digest: 'a'.repeat(64),
      },
      scope: {
        scope_id: 'observed-validator-scope',
        allowed_paths: owned,
        fingerprint_paths: owned,
        implementation_paths: owned,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'observed-validator-epoch',
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
    host: {
      work,
      ledger: null,
      workVersion: { revision: 1, digest: '1'.repeat(64) },
      ledgerVersion: null,
      maintenanceGeneration: 0,
    },
    ledger,
    attemptId,
    stageId: developer.stage_id,
    assignmentIndex: developer.assignment_index,
    developObservation,
  };
}

test('builds implementation evidence from a matching persisted completion and rejects unknown outcomes', () => {
  const fixture = completedDevelopmentFixture();
  const actual = buildAdmittedImplementationResult({
    repositoryRoot: root,
    config,
    packet,
    host: fixture.host,
    ledger: fixture.ledger,
  });
  expect(actual.implementation_fingerprint).toBe(initial.digest);
  expect(actual.test_refs).toEqual([]);
  for (const status of ['started', 'uncertain'] as const) {
    const work = fixture.host.work;
    if (!work) throw new Error('Completed development fixture lost its Host Work.');
    expect(() =>
      buildAdmittedImplementationResult({
        repositoryRoot: root,
        config,
        packet,
        host: {
          ...fixture.host,
          work: {
            ...work,
            execution: {
              ...work.execution,
              assignment_attempts: work.execution.assignment_attempts.map((attempt) => ({ ...attempt, status })),
            },
          },
        },
        ledger: fixture.ledger,
      }),
    ).toThrow(/durably completed/);
  }
});

test('does not issue a validation receipt when admitted source changes after implementation evidence', () => {
  const fixture = completedDevelopmentFixture();
  const changedEntries = initial.entries.map((entry) =>
    entry.path === owned[0] ? { ...entry, sha256: 'f'.repeat(64) } : entry,
  );
  const changedSource = {
    schema: 'ScopedSourceSnapshot/v1' as const,
    entries: changedEntries,
    digest: canonicalJsonDigest({ schema: 'ScopedSourceSnapshot/v1', entries: changedEntries }),
  };
  let snapshotCalls = 0;
  const hostWork = fixture.host.work;
  if (!hostWork) throw new Error('Observed validator fixture lost its Host Work.');
  const expectedIdentity = {
    repository_id: hostWork.binding.repository_id,
    project_ids: hostWork.binding.project_ids,
    integrations_digest: hostWork.binding.integrations_digest,
    work_id: hostWork.binding.lifecycle_work_id,
  };
  const sourceStore: NonNullable<Parameters<typeof issueObservedValidationReceipt>[0]['sourceStore']> = {
    snapshotCurrentTaskSourceSources(identity, threadId, paths, attempt) {
      snapshotCalls += 1;
      expect(identity).toEqual(expectedIdentity);
      expect(threadId).toBe('observed-validator-caller');
      expect(paths).toEqual(owned);
      expect(attempt).toBe(1);
      return changedSource;
    },
  };
  let receiptCalls = 0;
  const observedAuthority: DeliveryEvidenceAuthority = {
    ...authority,
    issueValidationReceipt: (input) => {
      receiptCalls += 1;
      return authority.issueValidationReceipt(input);
    },
  };

  expect(() =>
    issueObservedValidationReceipt({
      ...receiptInput,
      host: fixture.host,
      sourceStore,
      authority: observedAuthority,
    }),
  ).toThrow('observed validation: source changed after implementation evidence');
  expect(snapshotCalls).toBe(1);
  expect(receiptCalls).toBe(0);
});
