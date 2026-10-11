import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'bun:test';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { coordinationLedgerDigest, type CoordinationLedger } from '../src/contracts/envelopes.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { computeEdictumWorkflowApprovalEvidenceDigest } from '../src/governance/edictum-boundary.ts';
import {
  canonicalHostSourceWriteApproval,
  type HostStateSnapshot,
  type WorkState,
  type WorkflowAttemptApprovalRequest,
} from '../src/host-state.ts';
import { validateSourceWritePreflight } from '../src/orchestration/source-preflight.ts';
import type { SourceWritePreflightInput } from '../src/orchestration/source-preflight.ts';
import type { MastraLedgerItem, MastraSessionLedgerSnapshot } from '../src/orchestration/persistent-session-handoff.ts';
import type { DevelopmentTaskPacket } from '../src/orchestration/mastra-boundary.ts';
import { sourcePreparationJournalEvidence } from '../src/orchestration/observed-receipt-evidence.ts';
import {
  correctiveExecutionSchema,
  lifecyclePreparationObservationSchema,
} from '../src/orchestration/final-assurance.ts';
import { configuredTestContext } from './configured-context.ts';

type MutablePreflightInput = { -readonly [K in keyof SourceWritePreflightInput]: SourceWritePreflightInput[K] };
interface FixtureOptions {
  corrective?: boolean;
  highRisk?: boolean;
  lifecycleRisk?: 'high' | 'low' | 'medium';
  taskRiskFlags?: string[];
  includeSecurityObservation?: boolean;
  writerCanWrite?: boolean;
  reviewerConfigured?: boolean;
  reviewerLocation?: 'prewrite' | 'postwrite';
  withPreparations?: boolean;
  configuredProjectId?: string;
}
interface PreflightFixture {
  input: MutablePreflightInput;
  writerEvidenceRef: string;
  reviewerEvidenceRef: string;
}

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const now = (): string => new Date().toISOString();

function clone<T>(value: T): T {
  return structuredClone(value);
}

function setProperty(target: object, key: string, value: unknown): void {
  if (!Reflect.set(target, key, value)) throw new Error(`Unable to set fixture property ${key}.`);
}

function record(value: unknown, label: string): object {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  return value;
}

function observationRecords(value: unknown): object[] {
  assert.ok(Array.isArray(value), 'preparation observations must be an array');
  return value.map((item: unknown) => record(item, 'preparation observation'));
}

function workOf(fixtureValue: PreflightFixture): NonNullable<SourceWritePreflightInput['hostSnapshot']['work']> {
  const work = fixtureValue.input.hostSnapshot.work;
  assert.ok(work, 'fixture Host snapshot contains Work');
  return work;
}

function fixture(options: FixtureOptions = {}): PreflightFixture {
  const {
    corrective = false,
    highRisk = false,
    lifecycleRisk: lifecycleRiskOverride,
    taskRiskFlags: taskRiskFlagsOverride,
    includeSecurityObservation = true,
    writerCanWrite = true,
    reviewerConfigured = true,
    reviewerLocation = 'prewrite',
    withPreparations = true,
    configuredProjectId = 'agent',
  } = options;
  const lifecycleRisk = lifecycleRiskOverride ?? (highRisk ? 'high' : 'low');
  const taskRiskFlags = taskRiskFlagsOverride ?? (highRisk ? ['security'] : []);
  const workspaceId = sha(Buffer.from('workspace-1'));
  const securityRequired =
    lifecycleRisk === 'high' ||
    taskRiskFlags.some((flag) => ['security', 'data_loss', 'migration', 'high'].includes(flag));
  const ids = ['AC-1'],
    allowedPaths = ['packages/agent/src'],
    implementationPaths = ['packages/agent/src/orchestration'],
    lease = { ticket_id: 'ticket-1', thread_id: 'thread-1', generation: 2 },
    configured = configuredTestContext(),
    identity = {
      repository_id: configured.context.repository_id,
      project_ids: [...configured.context.project_ids],
      integrations_digest: configured.context.integrations_digest,
      work_id: 'work-1',
    };

  const config = clone(configured.config);
  const workflowId = 'implementation_change';
  const workflow = config.workflows[workflowId];
  if (!workflow) throw new Error('Current config lacks implementation_change workflow.');
  const sourceStage = workflow.stages.find((stage) => stage.id === 'develop_change');
  const prewriterStage = workflow.stages.find((stage) => stage.id === 'review_source_prewrite');
  const postwriterStage = workflow.stages.find((stage) => stage.id === 'validate_parallel');
  const writerAssignment = sourceStage?.assignments[0];
  const reviewerAssignmentIndex = prewriterStage?.assignments.findIndex(
    (assignment) => assignment.role === 'security-prewriter',
  );
  if (
    !sourceStage ||
    !prewriterStage ||
    !postwriterStage ||
    !writerAssignment ||
    reviewerAssignmentIndex === undefined ||
    reviewerAssignmentIndex < 0
  )
    throw new Error('Current config lacks the Source writer or configured prewriter reviewer.');
  const reviewerAssignment = prewriterStage.assignments[reviewerAssignmentIndex];
  if (!reviewerAssignment) throw new Error('Current config lacks the configured prewriter assignment.');
  const teamId = 'default-development';
  const reviewerRole = reviewerLocation === 'postwrite' ? 'security-data-validator' : reviewerAssignment.role;
  const reviewerStageId = reviewerLocation === 'postwrite' ? postwriterStage.id : prewriterStage.id;
  const reviewerIndex =
    reviewerLocation === 'postwrite'
      ? postwriterStage.assignments.findIndex((assignment) => assignment.role === reviewerRole)
      : reviewerAssignmentIndex;
  if (reviewerIndex < 0) throw new Error('Current config lacks the postwrite security reviewer.');
  const profile = config.agents.profiles[writerAssignment.profile];
  const writerPolicy = profile && config.agents.tool_policies[profile.tools_policy];
  if (!profile || !writerPolicy) throw new Error('Current Source writer profile is incomplete.');
  if (!writerCanWrite) setProperty(writerPolicy, 'source_write', false);
  if (!reviewerConfigured) {
    const securityProfile = config.agents.profiles[reviewerAssignment.profile];
    if (!securityProfile) throw new Error('Current prewriter reviewer profile is unavailable.');
    setProperty(securityProfile, 'mutation_scope', 'repository_source');
  }
  const project = config.projects.find((candidate) => candidate.project_id === 'agent');
  if (!project) throw new Error(`Current config lacks project ${configuredProjectId}.`);
  if (configuredProjectId !== project.project_id) setProperty(project, 'project_id', configuredProjectId);
  const configDigest = runtimeConfigDigest(config);
  const projectId = identity.project_ids[0];
  if (!projectId) throw new Error('Current ProjectContext has no project identity.');
  const baseRunId = 'run-1';
  const correctiveExecution = corrective
    ? correctiveExecutionSchema.parse({
        schema: 'CorrectiveExecution/v1',
        base_run_id: baseRunId,
        engine_run_id: '33333333-3333-4333-8333-333333333333',
        correction_generation: 1,
        stage_ids: [sourceStage.id],
        authorization: {
          schema: 'CorrectiveAssignmentAuthorization/v1',
          path: '.agent/corrective-authority.json',
          sha256: '9'.repeat(64),
        },
      })
    : null;
  const runId = correctiveExecution?.engine_run_id ?? baseRunId;
  const writerActionId = 'e'.repeat(64);
  const reviewerActionId = 'f'.repeat(64);
  const makeJournalItem = (
    actionId: string,
    role: string,
    stageId: string,
    assignmentIndex: number,
    summary: string,
  ): MastraLedgerItem => {
    const outputDigest = canonicalJsonDigest(summary);
    const issueId =
      actionId === writerActionId ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222';
    return {
      request: {
        schema: 'VidaSessionRequest/v1',
        action_id: actionId,
        run_id: runId,
        workflow_id: workflowId,
        wave_index: 1,
        bindings_manifest_ref: 'a'.repeat(64),
        config_digest: configDigest,
        scope_digest: 'source-1',
        role,
        stage_id: stageId,
        assignment_index: assignmentIndex,
        ...(correctiveExecution ? { corrective_execution: correctiveExecution } : {}),
      },
      issue_id: issueId,
      observation: {
        schema: 'VidaSessionObservation/v1',
        action_id: actionId,
        issue_id: issueId,
        agent_id: role,
        tool_call_ref: 'source-preflight-fixture',
        output_digest: outputDigest,
        summary,
        status: 'reported_complete',
        evidence_refs: [],
      },
    };
  };
  const writerItem = makeJournalItem(
    writerActionId,
    writerAssignment.role,
    sourceStage.id,
    0,
    'source preparation observed',
  );
  const reviewerItem =
    reviewerLocation === 'postwrite'
      ? makeJournalItem(reviewerActionId, reviewerRole, reviewerStageId, reviewerIndex, 'security review observed')
      : makeJournalItem(reviewerActionId, reviewerRole, reviewerStageId, reviewerIndex, 'security review observed');
  const journalItems = securityRequired && includeSecurityObservation ? [writerItem, reviewerItem] : [writerItem];
  const journal = {
    version: { revision: 1, digest: '' },
    state: {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: identity.work_id,
      attempt: 1,
      run_id: runId,
      step_id: null,
      ...(correctiveExecution ? { corrective_execution: correctiveExecution } : {}),
      items: [],
      completed: journalItems.map((item) => ({ step_id: item.request.stage_id, items: [item] })),
    },
    resume_status: 'ready',
  } satisfies MastraSessionLedgerSnapshot;
  setProperty(journal.version, 'digest', canonicalJsonDigest(journal.state));
  const writerObservation = writerItem.observation;
  const reviewerObservation = reviewerItem.observation;
  if (!writerObservation || !reviewerObservation) {
    throw new Error('Fixture journal items must include their observations.');
  }
  const writerEvidenceRef = `artifact://session-observation/${runId}/${writerActionId}/${writerObservation.output_digest}`;
  const reviewerEvidenceRef = `artifact://session-observation/${runId}/${reviewerActionId}/${reviewerObservation.output_digest}`;

  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'scope-1',
    work_id: identity.work_id,
    source_revision: 'source-1',
    ac_ids: ids,
    allowed_paths: allowedPaths,
    implementation_paths: implementationPaths,
    attribution: { thread_id: lease.thread_id },
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    scope: 'scope-1',
    source_revision: 'source-1',
    ac_ids: ids,
    contracts: [{ id: 'AC-1', definition: 'A source change is authorized', sr: 'scope-1', evidence: ['test'] }],
  };
  const scopeBytes = Buffer.from(JSON.stringify(scope));
  const acceptanceBytes = Buffer.from(JSON.stringify(acceptance));
  const binding = {
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    integrations_digest: identity.integrations_digest,
    team_id: teamId,
    provider_work_item_id: identity.work_id,
    lifecycle_work_id: identity.work_id,
    work_item_digest: canonicalJsonDigest({ schema: 'WorkItem/v1', id: identity.work_id }),
    workflow_id: workflowId,
    work_source_revision: 'source-1',
    scope_id: 'scope-1',
    scope_contract_digest: sha(scopeBytes),
    acceptance_manifest_digest: sha(acceptanceBytes),
    ac_ids: ids,
    implementation_paths: implementationPaths,
    allowed_resources: allowedPaths,
    config_digest: configDigest,
    runtime_source_revision: 'source-1',
    schema_digest: 'schema-1',
    runtime_code_digest: 'runtime-1',
  } satisfies WorkState['binding'];
  const projectContext = clone(configured.context);
  setProperty(projectContext, 'config_digest', configDigest);
  const trustedIdentity = {
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'human-1',
    role: 'operator',
    tenant: identity.repository_id,
    project: projectId,
    registry_hash: projectContext.registry_hash,
  } satisfies SourceWritePreflightInput['trustedIdentity'];
  const operation: Omit<WorkflowAttemptApprovalRequest, 'schema' | 'operation_hash'> = {
    store_id: 'store-1',
    action: 'source.write',
    identity,
    config_digest: configDigest,
    workflow_id: binding.workflow_id,
    stage_id: sourceStage.id,
    assignment_id: canonicalJsonDigest({
      binding,
      run_id: runId,
      input_digest: 'd'.repeat(64),
      stage_id: sourceStage.id,
      assignment_index: 0,
    }),
    assignment_index: 0,
    request_digest: 'b'.repeat(64),
    attempt_id: '',
    lease,
  };
  setProperty(
    operation,
    'attempt_id',
    canonicalJsonDigest({
      assignment_id: operation.assignment_id,
      request_digest: operation.request_digest,
      lease,
      previous_attempt_id: null,
    }),
  );
  const request = {
    schema: 'WorkflowAttemptApprovalRequest/v1',
    ...operation,
    operation_hash: canonicalJsonDigest(operation),
  } satisfies WorkflowAttemptApprovalRequest;

  const mechanics = [
    ['source_plan', ['scope_acceptance_trace', 'verification_rollback']],
    ['platform_knowledge', ['platform_contracts', 'official_reference_lookup']],
    [
      'implementation_policy',
      [
        'root_cause_owner',
        'affected_callers',
        'existing_primitives',
        ...(securityRequired && includeSecurityObservation ? ['prewriter_security_gate'] : []),
      ],
    ],
    ['change_impact_pre', ['affected_paths', 'invalidation', 'rollback']],
    ['documentation_validation', ['current_inventory', 'current_clear']],
  ] as const;
  const preparations = withPreparations
    ? mechanics.map(([kind, names]) => {
        const observations = names.map((mechanic) => {
          const evidenceRef = mechanic === 'prewriter_security_gate' ? reviewerEvidenceRef : writerEvidenceRef;
          return { mechanic, actual: 'Observed current evidence', evidence_ref: evidenceRef };
        });
        const record = lifecyclePreparationObservationSchema.parse({
          schema: 'LifecyclePreparationObservation/v1',
          record_id: `${kind}-1`,
          kind,
          work_id: identity.work_id,
          attempt: 1,
          source_revision: 'source-1',
          scope_id: 'scope-1',
          config_digest: configDigest,
          ac_ids: ids,
          observed_at: now(),
          observer_id: 'observer-1',
          status: 'pass',
          evidence_refs: [...new Set(observations.map((item) => item.evidence_ref))],
          observations,
          gaps: [],
        });
        const bytes = Buffer.from(JSON.stringify(record));
        const reference = {
          schema: 'LifecycleArtifactReference/v1',
          kind,
          artifact_schema: 'LifecyclePreparationObservation/v1',
          record_id: record.record_id,
          path: `.agent/preparations/${kind}.json`,
          sha256: sha(bytes),
          source_revision: 'source-1',
          scope_id: 'scope-1',
          ac_ids: ids,
          generation: null,
          implementation_fingerprint: null,
          delivery_cycle_id: null,
          principal: null,
          decision: null,
          disposition: 'current',
        } satisfies SourceWritePreflightInput['preparations'][number]['reference'];
        return { reference, bytes } satisfies SourceWritePreflightInput['preparations'][number];
      })
    : [];

  const work = {
    schema: 'WorkState/v1',
    workspace_id: workspaceId,
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'ContractReference/v1', path: '.agent/scope.json', sha256: sha(scopeBytes) },
      acceptance: {
        schema: 'ContractReference/v1',
        path: '.agent/acceptance.json',
        sha256: sha(acceptanceBytes),
      },
      decisions: [],
    },
    lease,
    execution: {
      run_id: baseRunId,
      input_digest: 'd'.repeat(64),
      phase: 'execute',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'EXECUTE',
      source_revision: 'source-1',
      next_action: 'source.write',
      route: 'R1',
      risk: lifecycleRisk,
      change_kind: 'fix',
      config_binding: { config_digest: configDigest, schema_digest: 'schema-1', runtime_code_digest: 'runtime-1' },
      scope: {
        scope_id: 'scope-1',
        allowed_paths: allowedPaths,
        fingerprint_paths: allowedPaths,
        implementation_paths: implementationPaths,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'epoch-1',
        review_generation: 0,
        correction_count: corrective ? 1 : 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: preparations.map((item) => item.reference),
    },
    artifacts: [],
  } satisfies WorkState;
  const ledger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: work.workspace_id,
    revision: 1,
    open_generation: 1,
    next_sequence: 1,
    tickets: [],
    claims: [],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    operations: [],
    retirements: [],
  } satisfies CoordinationLedger;
  const hostSnapshot = {
    work,
    ledger,
    workVersion: { revision: work.revision, digest: canonicalJsonDigest(work) },
    ledgerVersion: { revision: ledger.revision, digest: coordinationLedgerDigest(ledger) },
    maintenanceGeneration: 0,
  } satisfies HostStateSnapshot;

  const unsignedPacket: Omit<DevelopmentTaskPacket, 'digest'> = {
    schema: 'DevelopmentTaskPacket/v1',
    packet_id: 'packet-1',
    work_item_id: identity.work_id,
    team_id: teamId,
    workflow_id: binding.workflow_id,
    work_item: {
      kind: 'task',
      intent: 'bug_fix',
      project: projectId,
      risk_flags: taskRiskFlags,
      labels: [],
    },
    attempt: 1,
    risk_flags: taskRiskFlags,
    objective: 'Implement source change',
    acceptance: ['AC-1: A source change is authorized'],
    in_scope: implementationPaths,
    out_of_scope: [],
    owned_paths: allowedPaths,
    affected_symbols: [],
    skill_refs: [],
    documentation_refs: [],
    code_evidence_refs: [],
    research_artifact_refs: [],
    diagnostics: [],
    failed_approaches: [],
    prohibited_patterns: [],
    implementation_constraints: [],
    security_constraints: [],
    expected_tests: [],
    delivery_conditions: [],
    source_revision: 'source-1',
    lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const taskPacket = { ...unsignedPacket, digest: canonicalJsonDigest(unsignedPacket) } satisfies DevelopmentTaskPacket;
  const authorization = {
    decision: 'allow',
    diagnostics: [],
    receipt: {
      schema: 'AuthorizationReceipt/v1',
      source: 'cedar',
      decision: 'allow',
      decision_id: 'cedar-1',
      principal: trustedIdentity.principal,
      role: trustedIdentity.role,
      action: 'write',
      tenant: trustedIdentity.tenant,
      project: trustedIdentity.project,
      resourceTenant: trustedIdentity.tenant,
      resourceProject: trustedIdentity.project,
      registry_hash: trustedIdentity.registry_hash,
      operation_hash: request.operation_hash,
      issued_at: now(),
    },
  } satisfies SourceWritePreflightInput['authorization'];
  const hostApprovalPrincipal = 'trusted-host-local-source-write';
  const approvalFields = {
    schema: 'EdictumWorkflowApproval/v1',
    stage_id: request.stage_id,
    approval_id: 'approval-1',
    approver: hostApprovalPrincipal,
    operation_hash: request.operation_hash,
    tenant: trustedIdentity.tenant,
    project: trustedIdentity.project,
    approved_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  } satisfies Parameters<typeof computeEdictumWorkflowApprovalEvidenceDigest>[0];
  const hostApprovalReceipt = {
    ...approvalFields,
    evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(approvalFields),
  };
  const hostApproval = canonicalHostSourceWriteApproval(request, hostApprovalPrincipal, hostApprovalReceipt);
  const edictumOperation = {
    operation_hash: request.operation_hash,
    tenant: trustedIdentity.tenant,
    project: trustedIdentity.project,
  };
  const edictumEvaluation = {
    action: 'pending_approval',
    reason: 'configured workflow requires host-local approval',
    stageId: 'governed-write-approval',
    records: [],
    audit: null,
    events: [],
  } satisfies SourceWritePreflightInput['edictumEvaluation'];

  return {
    input: {
      hostSnapshot,
      journal,
      request,
      config,
      projectContext,
      trustedIdentity,
      authorization,
      edictumOperation,
      edictumEvaluation,
      hostApprovalPrincipal,
      hostApproval,
      taskPacket,
      scopeBytes,
      acceptanceBytes,
      preparations,
    },
    writerEvidenceRef,
    reviewerEvidenceRef,
  };
}

function replacePreparationRecord(fixtureValue: PreflightFixture, kind: string, change: (record: object) => void) {
  const entry = fixtureValue.input.preparations.find((item) => item.reference.kind === kind);
  assert.ok(entry, `preparation record ${kind} exists`);
  if (!entry) throw new Error(`preparation record ${kind} is missing`);
  const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(entry.bytes));
  assert.ok(parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed));
  const preparation = record(parsed, `preparation record ${kind}`);
  change(preparation);
  const serialized = JSON.stringify(preparation);
  if (serialized === undefined) throw new Error(`Unable to serialize preparation record ${kind}.`);
  const nextBytes = Buffer.from(serialized);
  const nextReference = { ...entry.reference, sha256: sha(nextBytes) };
  setProperty(entry, 'bytes', nextBytes);
  setProperty(entry, 'reference', nextReference);
  const work = workOf(fixtureValue);
  setProperty(
    work.lifecycle,
    'references',
    work.lifecycle.references.map((reference) => (reference.kind === kind ? entry.reference : reference)),
  );
  const workVersion = fixtureValue.input.hostSnapshot.workVersion;
  assert.ok(workVersion, 'fixture Host snapshot contains the Work version');
  setProperty(fixtureValue.input.hostSnapshot, 'workVersion', {
    ...workVersion,
    digest: canonicalJsonDigest(work),
  });
  return entry;
}

function assertNoAttemptMarker(fixtureValue: PreflightFixture): void {
  assert.equal(workOf(fixtureValue).execution.assignment_attempts.length, 0);
}

function correctivePlanningFixture(): PreflightFixture {
  const value = fixture({ corrective: true, highRisk: true });
  const planning = clone(value.input.journal.state);
  const engineRunId = planning.run_id;
  setProperty(planning, 'run_id', workOf(value).execution.run_id);
  Reflect.deleteProperty(planning, 'corrective_execution');
  for (const wave of planning.completed) {
    for (const item of wave.items) {
      setProperty(item.request, 'run_id', planning.run_id);
      Reflect.deleteProperty(item.request, 'corrective_execution');
    }
  }
  setProperty(value.input, 'planningJournal', planning);
  setProperty(value.input.journal.state, 'completed', []);
  setProperty(value.input.journal.version, 'digest', canonicalJsonDigest(value.input.journal.state));
  for (const preparation of value.input.preparations) {
    replacePreparationRecord(value, preparation.reference.kind, (record) => {
      const bytes = JSON.stringify(record).replaceAll(
        `artifact://session-observation/${engineRunId}/`,
        `artifact://session-observation/${planning.run_id}/`,
      );
      const updated = lifecyclePreparationObservationSchema.parse(JSON.parse(bytes));
      setProperty(record, 'evidence_refs', updated.evidence_refs);
      setProperty(record, 'observations', updated.observations);
    });
  }
  return value;
}

test('fully bound current preflight passes before Host attempt reservation', () => {
  const value = fixture();
  const result = validateSourceWritePreflight(value.input);
  assert.equal(result.length, 5);
  assert.equal(
    result.every((reference) => workOf(value).lifecycle.references.includes(reference)),
    true,
  );
  assertNoAttemptMarker(value);
});

test('corrective preflight binds the engine run to its unchanged Host base run before reservation', () => {
  const value = fixture({ corrective: true });
  assert.notEqual(value.input.journal.state.run_id, workOf(value).execution.run_id);
  assert.equal(validateSourceWritePreflight(value.input).length, 5);
  assertNoAttemptMarker(value);
});

test('corrective preflight uses authenticated original planning observations without reissuing them', () => {
  const value = correctivePlanningFixture();
  assert.equal(value.input.journal.state.completed.length, 0);
  assert.equal(validateSourceWritePreflight(value.input).length, 5);
  assertNoAttemptMarker(value);
});

test('corrective preflight rejects foreign planning lineage and ambiguous base observations', () => {
  for (const [key, invalid] of [
    ['workspace_id', 'foreign-workspace'],
    ['work_id', 'foreign-work'],
    ['attempt', 2],
    ['run_id', 'foreign-base'],
    ['schema', 'ForeignJournal/v1'],
    ['corrective_execution', { schema: 'ForeignExecution/v1' }],
  ] as const) {
    const value = correctivePlanningFixture();
    const planning = record(Reflect.get(value.input, 'planningJournal'), 'planning journal');
    setProperty(planning, key, invalid);
    assert.throws(() => validateSourceWritePreflight(value.input), /planning journal/);
    assertNoAttemptMarker(value);
  }
  const ordinary = fixture();
  setProperty(ordinary.input, 'planningJournal', clone(ordinary.input.journal.state));
  assert.throws(() => validateSourceWritePreflight(ordinary.input), /planning journal/);
  assertNoAttemptMarker(ordinary);

  for (const change of [
    (item: MastraLedgerItem) => setProperty(item.observation!, 'status', 'reported_failed'),
    (item: MastraLedgerItem) => setProperty(item.request, 'config_digest', 'foreign-config'),
    (item: MastraLedgerItem) => setProperty(item.request, 'run_id', 'foreign-run'),
    (item: MastraLedgerItem) => setProperty(item.observation!, 'summary', undefined),
  ]) {
    const ambiguous = correctivePlanningFixture();
    const planning = ambiguous.input.planningJournal;
    assert.ok(planning);
    const duplicate = clone(planning.completed[0]!.items[0]!);
    change(duplicate);
    setProperty(planning, 'items', [duplicate]);
    assert.throws(() => validateSourceWritePreflight(ambiguous.input), /journal observation that is not current/);
    assertNoAttemptMarker(ambiguous);
  }
});

test('planning observation evidence independently binds identity, status, source and canonical summary', () => {
  for (const change of [
    (item: MastraLedgerItem) => setProperty(item.observation!, 'summary', 'unbound changed summary'),
    (item: MastraLedgerItem) => setProperty(item.observation!, 'status', 'reported_failed'),
    (item: MastraLedgerItem) => setProperty(item.observation!, 'issue_id', 'foreign-issue'),
    (item: MastraLedgerItem) => setProperty(item.observation!, 'action_id', '0'.repeat(64)),
    (item: MastraLedgerItem) => setProperty(item.request, 'action_id', '0'.repeat(64)),
    (item: MastraLedgerItem) => setProperty(item.request, 'run_id', 'foreign-run'),
    (item: MastraLedgerItem) => setProperty(item.request, 'workflow_id', 'foreign-workflow'),
    (item: MastraLedgerItem) => setProperty(item.request, 'config_digest', 'foreign-config'),
    (item: MastraLedgerItem) => setProperty(item.request, 'scope_digest', 'foreign-source'),
  ]) {
    const value = correctivePlanningFixture();
    assert.ok(value.input.planningJournal);
    change(value.input.planningJournal.completed[0]!.items[0]!);
    assert.throws(() => validateSourceWritePreflight(value.input), /journal observation that is not current/);
    assertNoAttemptMarker(value);
  }
});

test('evidence uniqueness is per run and ignores structurally mismatched duplicates', () => {
  const value = correctivePlanningFixture();
  const planning = value.input.planningJournal;
  assert.ok(planning);
  const base = planning.completed[0]!.items[0]!;
  assert.ok(base.observation);
  const current = clone(base);
  setProperty(current.request, 'run_id', value.input.journal.state.run_id);
  setProperty(current.request, 'corrective_execution', value.input.journal.state.corrective_execution);
  setProperty(value.input.journal.state, 'items', [current]);
  setProperty(value.input.journal.version, 'digest', canonicalJsonDigest(value.input.journal.state));
  const evidence = sourcePreparationJournalEvidence(value.input.journal, workOf(value), planning);
  for (const runId of [planning.run_id, value.input.journal.state.run_id]) {
    assert.ok(
      evidence.has(
        `artifact://session-observation/${runId}/${base.request.action_id}/${base.observation.output_digest}`,
      ),
    );
  }
  for (const change of [
    (item: MastraLedgerItem) => setProperty(item.observation!, 'action_id', '0'.repeat(64)),
    (item: MastraLedgerItem) => setProperty(item.observation!, 'issue_id', 'foreign-issue'),
    (item: MastraLedgerItem) => {
      setProperty(item.request, 'action_id', '0'.repeat(64));
      setProperty(item.observation!, 'action_id', '0'.repeat(64));
      setProperty(item.observation!, 'summary', undefined);
    },
  ]) {
    const unrelated = clone(base);
    change(unrelated);
    setProperty(planning, 'items', [unrelated]);
    assert.equal(validateSourceWritePreflight(value.input).length, 5);
    assertNoAttemptMarker(value);
  }
});

test('corrective preflight denies engine, base, generation and schema drift before reservation', () => {
  for (const [key, invalid] of [
    ['engine_run_id', '44444444-4444-4444-8444-444444444444'],
    ['base_run_id', 'foreign-base-run'],
    ['correction_generation', 2],
    ['correction_generation', 0],
    ['schema', 'ForeignExecution/v1'],
  ] as const) {
    const value = fixture({ corrective: true });
    const execution = value.input.journal.state.corrective_execution;
    assert.ok(execution);
    setProperty(execution, key, invalid);
    setProperty(value.input.journal.version, 'digest', canonicalJsonDigest(value.input.journal.state));
    assert.throws(() => validateSourceWritePreflight(value.input), /same-thread journal/);
    assertNoAttemptMarker(value);
  }
  const missing = fixture({ corrective: true });
  setProperty(missing.input.journal.state, 'corrective_execution', null);
  setProperty(missing.input.journal.version, 'digest', canonicalJsonDigest(missing.input.journal.state));
  assert.throws(() => validateSourceWritePreflight(missing.input), /same-thread journal/);
  assertNoAttemptMarker(missing);
});

test('route without a current Source plan is denied before Host attempt reservation', () => {
  const value = fixture({ withPreparations: false });
  assert.throws(() => validateSourceWritePreflight(value.input), /current source plan/);
  assertNoAttemptMarker(value);
});

test('current project selection resolves the configured project_id and rejects foreign projects', () => {
  const current = fixture();
  assert.equal(validateSourceWritePreflight(current.input).length, 5);
  assertNoAttemptMarker(current);

  const foreign = fixture({ configuredProjectId: 'foreign-agent' });
  assert.throws(() => validateSourceWritePreflight(foreign.input), /current trusted configuration/);
  assertNoAttemptMarker(foreign);
});

test('missing, stale, or foreign current plan fails before Host attempt reservation', () => {
  const missing = fixture();
  missing.input.preparations = missing.input.preparations.filter((item) => item.reference.kind !== 'source_plan');
  assert.throws(() => validateSourceWritePreflight(missing.input), /preparation artifacts do not match/);
  assertNoAttemptMarker(missing);

  const stale = fixture();
  replacePreparationRecord(stale, 'source_plan', (record) => {
    setProperty(record, 'scope_id', 'stale-scope');
  });
  assert.throws(() => validateSourceWritePreflight(stale.input), /lifecycle preparation is stale/);
  assertNoAttemptMarker(stale);

  const foreign = fixture();
  replacePreparationRecord(foreign, 'source_plan', (record) => {
    setProperty(record, 'work_id', 'foreign-work');
  });
  assert.throws(() => validateSourceWritePreflight(foreign.input), /lifecycle preparation is stale/);
  assertNoAttemptMarker(foreign);
});

test('stale implementation policy and unconfigured Source writer fail before Host attempt reservation', () => {
  const stalePolicy = fixture();
  replacePreparationRecord(stalePolicy, 'implementation_policy', (record) => {
    setProperty(record, 'config_digest', '0'.repeat(64));
  });
  assert.throws(() => validateSourceWritePreflight(stalePolicy.input), /lifecycle preparation is stale/);
  assertNoAttemptMarker(stalePolicy);

  const deniedPolicy = fixture({ writerCanWrite: false });
  assert.throws(() => validateSourceWritePreflight(deniedPolicy.input), /configured Source-writing assignment/);
  assertNoAttemptMarker(deniedPolicy);
});

test('stale runtime configuration and session journal versions fail before Host attempt reservation', () => {
  const staleConfig = fixture();
  setProperty(staleConfig.input.config, 'config_revision', 2);
  assert.throws(() => validateSourceWritePreflight(staleConfig.input), /current trusted configuration/);
  assertNoAttemptMarker(staleConfig);

  const staleJournal = fixture();
  setProperty(staleJournal.input.journal.state, 'step_id', 'changed-after-read');
  assert.throws(() => validateSourceWritePreflight(staleJournal.input), /same-thread journal is stale/);
  assertNoAttemptMarker(staleJournal);
});

test('high-risk preflight accepts only the configured prewriter reviewer observation in the current journal', () => {
  const value = fixture({ highRisk: true });
  assert.equal(validateSourceWritePreflight(value.input).length, 5);
  assertNoAttemptMarker(value);

  const packetHigh = fixture({ lifecycleRisk: 'low', taskRiskFlags: ['high'] });
  assert.equal(validateSourceWritePreflight(packetHigh.input).length, 5);
  assertNoAttemptMarker(packetHigh);

  const packetHighWithoutSecurity = fixture({
    lifecycleRisk: 'low',
    taskRiskFlags: ['high'],
    includeSecurityObservation: false,
  });
  assert.throws(() => validateSourceWritePreflight(packetHighWithoutSecurity.input), /prewriter security observation/);
  assertNoAttemptMarker(packetHighWithoutSecurity);

  const postwriteOnly = fixture({ highRisk: true, reviewerLocation: 'postwrite' });
  assert.throws(() => validateSourceWritePreflight(postwriteOnly.input), /configured reviewer observation/);
  assertNoAttemptMarker(postwriteOnly);

  const missing = fixture({ highRisk: true });
  replacePreparationRecord(missing, 'implementation_policy', (record) => {
    const observations = observationRecords(Reflect.get(record, 'observations'));
    setProperty(
      record,
      'observations',
      observations.filter((item) => Reflect.get(item, 'mechanic') !== 'prewriter_security_gate'),
    );
  });
  assert.throws(() => validateSourceWritePreflight(missing.input), /prewriter security observation/);
  assertNoAttemptMarker(missing);

  const writerEvidence = fixture({ highRisk: true });
  replacePreparationRecord(writerEvidence, 'implementation_policy', (record) => {
    const observations = observationRecords(Reflect.get(record, 'observations'));
    const security = observations.find((item) => Reflect.get(item, 'mechanic') === 'prewriter_security_gate');
    assert.ok(security, 'security observation exists');
    setProperty(security, 'evidence_ref', writerEvidence.writerEvidenceRef);
    const evidenceRefs = observations.map((item) => {
      const evidenceRef: unknown = Reflect.get(item, 'evidence_ref');
      if (typeof evidenceRef !== 'string') throw new Error('Preparation evidence reference must be a string.');
      return evidenceRef;
    });
    setProperty(record, 'evidence_refs', [...new Set(evidenceRefs)]);
  });
  assert.throws(() => validateSourceWritePreflight(writerEvidence.input), /configured reviewer observation/);
  assertNoAttemptMarker(writerEvidence);

  const staleReviewer = fixture({ highRisk: true });
  const reviewerItem = staleReviewer.input.journal.state.completed
    .flatMap((wave) => wave.items)
    .find((item) => item.request.role === 'security-prewriter');
  assert.ok(reviewerItem, 'current journal includes the configured security prewriter');
  setProperty(reviewerItem.request, 'scope_digest', 'old-source-revision');
  setProperty(staleReviewer.input.journal.version, 'digest', canonicalJsonDigest(staleReviewer.input.journal.state));
  assert.throws(() => validateSourceWritePreflight(staleReviewer.input), /journal observation that is not current/);
  assertNoAttemptMarker(staleReviewer);

  const unconfigured = fixture({ highRisk: true, reviewerConfigured: false });
  assert.throws(() => validateSourceWritePreflight(unconfigured.input), /configured reviewer observation/);
  assertNoAttemptMarker(unconfigured);
});

test('Cedar mismatch, invalid Edictum gate, expired local receipt, stale packet, and foreign lease fail before marker', () => {
  const cedar = fixture();
  cedar.input.authorization = { ...cedar.input.authorization, decision: 'deny' };
  assert.throws(() => validateSourceWritePreflight(cedar.input), /Cedar authorization/);
  assertNoAttemptMarker(cedar);

  const edictumDenied = fixture();
  edictumDenied.input.edictumEvaluation = { ...edictumDenied.input.edictumEvaluation, action: 'block' };
  assert.throws(() => validateSourceWritePreflight(edictumDenied.input), /configured Edictum runtime.write evaluation/);
  assertNoAttemptMarker(edictumDenied);

  const syntheticAllow = fixture();
  syntheticAllow.input.edictumEvaluation = { ...syntheticAllow.input.edictumEvaluation, action: 'allow' };
  assert.throws(
    () => validateSourceWritePreflight(syntheticAllow.input),
    /configured Edictum runtime.write evaluation/,
  );
  assertNoAttemptMarker(syntheticAllow);

  const edictumForeignOperation = fixture();
  edictumForeignOperation.input.edictumOperation = {
    ...edictumForeignOperation.input.edictumOperation,
    operation_hash: '0'.repeat(64),
  };
  assert.throws(
    () => validateSourceWritePreflight(edictumForeignOperation.input),
    /configured Edictum runtime.write evaluation/,
  );
  assertNoAttemptMarker(edictumForeignOperation);

  const expired = fixture();
  assert.ok(expired.input.hostApproval, 'valid fixture has a Host-local approval');
  expired.input.hostApproval = {
    ...expired.input.hostApproval,
    receipt: {
      ...expired.input.hostApproval.receipt,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    },
  };
  assert.throws(() => validateSourceWritePreflight(expired.input), /Host-local permission receipt/);
  assertNoAttemptMarker(expired);

  const foreignHostRequest = fixture();
  assert.ok(foreignHostRequest.input.hostApproval, 'valid fixture has a Host-local approval');
  foreignHostRequest.input.hostApproval = {
    ...foreignHostRequest.input.hostApproval,
    request: { ...foreignHostRequest.input.request, stage_id: 'foreign-stage' },
  };
  assert.throws(() => validateSourceWritePreflight(foreignHostRequest.input), /Host-local permission receipt/);
  assertNoAttemptMarker(foreignHostRequest);

  const stalePacket = fixture();
  stalePacket.input.taskPacket = { ...stalePacket.input.taskPacket, digest: '0'.repeat(64) };
  assert.throws(() => validateSourceWritePreflight(stalePacket.input), /development task packet/);
  assertNoAttemptMarker(stalePacket);

  const foreignLease = fixture();
  foreignLease.input.request = {
    ...foreignLease.input.request,
    lease: { ...foreignLease.input.request.lease, thread_id: 'other-thread' },
  };
  assert.throws(() => validateSourceWritePreflight(foreignLease.input), /pending Host request differs/);
  assertNoAttemptMarker(foreignLease);

  const wrongHostPrincipal = fixture();
  wrongHostPrincipal.input.hostApprovalPrincipal = 'other-host-principal';
  assert.throws(() => validateSourceWritePreflight(wrongHostPrincipal.input), /Host-local permission receipt/);
  assertNoAttemptMarker(wrongHostPrincipal);

  const wrongWrappedPrincipal = fixture();
  assert.ok(wrongWrappedPrincipal.input.hostApproval, 'valid fixture has a Host-local approval');
  wrongWrappedPrincipal.input.hostApproval = {
    ...wrongWrappedPrincipal.input.hostApproval,
    principal: 'other-host-principal',
  };
  assert.throws(() => validateSourceWritePreflight(wrongWrappedPrincipal.input), /Host-local permission receipt/);
  assertNoAttemptMarker(wrongWrappedPrincipal);
});
