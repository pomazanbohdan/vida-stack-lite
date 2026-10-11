import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { test } from 'bun:test';
import { configuredTestContext } from './configured-context.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import type { ProjectContext } from '../src/config/project-context.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import type { TrustedProjectIdentity } from '../src/contracts/public-ingress.ts';
import { coordinationLedgerDigest, type CoordinationLedger } from '../src/contracts/envelopes.ts';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  createTestWorkflowHostCapability,
  type EdictumWorkflowApprovalReceiptInput,
} from '../src/governance/edictum-boundary.ts';
import {
  canonicalHostSourceWriteApproval,
  type CanonicalHostSourceWriteApproval,
  type HostStateSnapshot,
  type WorkIdentity,
  type WorkflowAttemptApprovalRequest,
  type WorkState,
} from '../src/host-state.ts';
import type { LifecycleArtifactReference } from '../src/lifecycle/lifecycle-state.ts';
import type { DevelopmentTaskPacket } from '../src/orchestration/mastra-boundary.ts';
import { lifecyclePreparationObservationSchema } from '../src/orchestration/final-assurance.ts';
import type { MastraLedgerItem, MastraSessionLedgerSnapshot } from '../src/orchestration/persistent-session-handoff.ts';
import { observedReceiptEvidenceReference } from '../src/orchestration/observed-receipt-evidence.ts';
import {
  produceSourceWritePreflightApproval,
  type SourceWritePreflightContext,
} from '../src/orchestration/source-preflight-operations.ts';

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

interface Fixture {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly context: SourceWritePreflightContext;
  readonly request: WorkflowAttemptApprovalRequest;
  readonly hostApproval: CanonicalHostSourceWriteApproval;
  readonly hostApprovalPrincipal: string;
  readonly runId: string;
  readonly currentChecks: () => number;
}

function fixture(role = 'developer-orchestrator'): Fixture {
  const { repositoryRoot, config, context: projectContext } = configuredTestContext();
  const currentConfig: AgentRuntimeConfig = config;
  const currentProjectContext: ProjectContext = projectContext;
  const projectId = projectContext.project_ids[0];
  assert.ok(projectId, 'configured project context has a project');
  const workspaceId = sha(Buffer.from('source-preflight-producer-workspace'));
  const workId = 'source-preflight-producer-' + randomUUID();
  const threadId = 'source-preflight-thread-' + randomUUID();
  const runId = 'source-preflight-run-' + randomUUID();
  const workflowId = Object.keys(currentConfig.workflows).find((id) =>
    currentConfig.workflows[id]?.stages.some((stage) =>
      stage.assignments.some(
        (assignment) => currentConfig.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
      ),
    ),
  );
  assert.ok(workflowId, 'configured workflow has a Source-writing assignment');
  const workflow = currentConfig.workflows[workflowId];
  assert.ok(workflow, 'configured workflow remains present');
  const workflowBinding = currentConfig.workflow_bindings.find((binding) => binding.workflow === workflowId);
  assert.ok(workflowBinding, 'configured workflow has a project binding');
  const sourceStage = workflow.stages.find((stage) =>
    stage.assignments.some(
      (assignment) => currentConfig.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
    ),
  );
  assert.ok(sourceStage, 'configured workflow has a Source-writing stage');
  const assignmentIndex = sourceStage.assignments.findIndex(
    (assignment) => currentConfig.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
  );
  const sourceAssignment = sourceStage.assignments[assignmentIndex];
  assert.ok(sourceAssignment, 'configured Source-writing assignment remains present');
  const configDigest = runtimeConfigDigest(currentConfig);
  const lease = { ticket_id: 'producer-ticket', thread_id: threadId, generation: 1 };
  const identity: WorkIdentity = {
    repository_id: currentProjectContext.repository_id,
    project_ids: currentProjectContext.project_ids,
    integrations_digest: currentProjectContext.integrations_digest,
    work_id: workId,
  };
  const trustedIdentity: TrustedProjectIdentity = {
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'producer-test-user',
    role,
    tenant: identity.repository_id,
    project: projectId,
    registry_hash: currentProjectContext.registry_hash,
  };
  const acIds = ['AC-1'];
  const allowedPaths = ['packages/agent/src'];
  const implementationPaths = ['packages/agent/src/orchestration'];
  const sourceRevision = 'source-1';
  const scopeId = 'scope-1';
  const scope: unknown = {
    schema: 'ImplementationScope/v1',
    scope_id: scopeId,
    work_id: workId,
    source_revision: sourceRevision,
    ac_ids: acIds,
    allowed_paths: allowedPaths,
    implementation_paths: implementationPaths,
    attribution: { thread_id: threadId },
  };
  const acceptanceContracts = [
    {
      id: 'AC-1',
      definition: 'Configured Source policy and Host permission are both required',
      sr: scopeId,
      evidence: ['test'],
    },
  ];
  const acceptance: unknown = {
    schema: 'AcceptanceManifest/v1',
    scope: scopeId,
    source_revision: sourceRevision,
    ac_ids: acIds,
    contracts: acceptanceContracts,
  };
  const scopeJson = JSON.stringify(scope);
  const acceptanceJson = JSON.stringify(acceptance);
  assert.ok(scopeJson);
  assert.ok(acceptanceJson);
  const scopeBytes = Buffer.from(scopeJson);
  const acceptanceBytes = Buffer.from(acceptanceJson);
  const binding: WorkState['binding'] = {
    repository_id: identity.repository_id,
    project_ids: [...identity.project_ids],
    integrations_digest: identity.integrations_digest,
    team_id: workflowBinding.team,
    provider_work_item_id: workId,
    lifecycle_work_id: workId,
    work_item_digest: canonicalJsonDigest({ schema: 'WorkItem/v1', id: workId }),
    workflow_id: workflowId,
    work_source_revision: sourceRevision,
    scope_id: scopeId,
    scope_contract_digest: sha(scopeBytes),
    acceptance_manifest_digest: sha(acceptanceBytes),
    ac_ids: acIds,
    implementation_paths: implementationPaths,
    allowed_resources: allowedPaths,
    config_digest: configDigest,
    runtime_source_revision: sourceRevision,
    schema_digest: 'schema-1',
    runtime_code_digest: 'runtime-1',
  };
  const inputDigest = 'd'.repeat(64);
  const operation: Omit<WorkflowAttemptApprovalRequest, 'schema' | 'operation_hash'> = {
    store_id: 'producer-test-store',
    action: 'source.write',
    identity,
    config_digest: configDigest,
    workflow_id: workflowId,
    stage_id: sourceStage.id,
    assignment_id: canonicalJsonDigest({
      binding,
      run_id: runId,
      input_digest: inputDigest,
      stage_id: sourceStage.id,
      assignment_index: assignmentIndex,
    }),
    assignment_index: assignmentIndex,
    request_digest: 'b'.repeat(64),
    attempt_id: '',
    lease,
  };
  assert.equal(
    Reflect.set(
      operation,
      'attempt_id',
      canonicalJsonDigest({
        assignment_id: operation.assignment_id,
        request_digest: operation.request_digest,
        lease,
        previous_attempt_id: null,
      }),
    ),
    true,
  );
  const request: WorkflowAttemptApprovalRequest = {
    schema: 'WorkflowAttemptApprovalRequest/v1',
    ...operation,
    operation_hash: canonicalJsonDigest(operation),
  };
  const packetUnsigned: Omit<DevelopmentTaskPacket, 'digest'> = {
    schema: 'DevelopmentTaskPacket/v1',
    packet_id: 'packet-1',
    work_item_id: workId,
    team_id: workflowBinding.team,
    workflow_id: workflowId,
    work_item: { kind: 'task', intent: 'bug_fix', project: projectId, risk_flags: [], labels: [] },
    attempt: 1,
    risk_flags: [],
    objective: 'Verify configured Source approval production',
    acceptance: acceptanceContracts.map((contract) => `${contract.id}: ${contract.definition}`),
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
    source_revision: sourceRevision,
    lease_expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const taskPacket: DevelopmentTaskPacket = { ...packetUnsigned, digest: canonicalJsonDigest(packetUnsigned) };
  const writerActionId = 'e'.repeat(64);
  const writerIssueId = '11111111-1111-4111-8111-111111111111';
  const writerSummary = 'source preparation observed';
  const writerOutputDigest = canonicalJsonDigest(writerSummary);
  const writerItem: MastraLedgerItem = {
    request: {
      schema: 'VidaSessionRequest/v1',
      action_id: writerActionId,
      run_id: runId,
      workflow_id: workflowId,
      wave_index: 1,
      bindings_manifest_ref: 'a'.repeat(64),
      config_digest: configDigest,
      scope_digest: sourceRevision,
      role: sourceAssignment.role,
      stage_id: sourceStage.id,
      assignment_index: assignmentIndex,
    },
    issue_id: writerIssueId,
    observation: {
      schema: 'VidaSessionObservation/v1',
      action_id: writerActionId,
      issue_id: writerIssueId,
      agent_id: sourceAssignment.role,
      tool_call_ref: 'source-preflight-producer-fixture',
      output_digest: writerOutputDigest,
      summary: writerSummary,
      status: 'reported_complete',
      evidence_refs: [],
    },
  };
  const journalState: MastraSessionLedgerSnapshot['state'] = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspaceId,
    work_id: workId,
    run_id: runId,
    attempt: 1,
    step_id: null,
    completed: [{ step_id: sourceStage.id, items: [writerItem] }],
    items: [],
  };
  const journal: MastraSessionLedgerSnapshot = {
    state: journalState,
    version: { revision: 1, digest: canonicalJsonDigest(journalState) },
    resume_status: 'ready',
  };
  const writerEvidenceRef = observedReceiptEvidenceReference(journal, writerActionId, writerOutputDigest);
  const preparationMechanics: ReadonlyArray<{
    kind: LifecycleArtifactReference['kind'];
    mechanics: readonly string[];
  }> = [
    { kind: 'source_plan', mechanics: ['scope_acceptance_trace', 'verification_rollback'] },
    { kind: 'platform_knowledge', mechanics: ['platform_contracts', 'official_reference_lookup'] },
    { kind: 'implementation_policy', mechanics: ['root_cause_owner', 'affected_callers', 'existing_primitives'] },
    { kind: 'change_impact_pre', mechanics: ['affected_paths', 'invalidation', 'rollback'] },
    { kind: 'documentation_validation', mechanics: ['current_inventory', 'current_clear'] },
  ];
  const preparations = preparationMechanics.map(({ kind, mechanics }) => {
    const observations = mechanics.map((mechanic) => ({
      mechanic,
      actual: 'Observed current evidence for the configured Source preflight fixture.',
      evidence_ref: writerEvidenceRef,
    }));
    const record = lifecyclePreparationObservationSchema.parse({
      schema: 'LifecyclePreparationObservation/v1',
      record_id: `${kind}-${workId}`,
      kind,
      work_id: workId,
      attempt: 1,
      source_revision: sourceRevision,
      scope_id: scopeId,
      config_digest: configDigest,
      ac_ids: acIds,
      observed_at: new Date().toISOString(),
      observer_id: 'source-preflight-producer-fixture',
      status: 'pass',
      evidence_refs: [writerEvidenceRef],
      observations,
      gaps: [],
    });
    const bytes = Buffer.from(JSON.stringify(record));
    const reference: LifecycleArtifactReference = {
      schema: 'LifecycleArtifactReference/v1',
      kind,
      artifact_schema: 'LifecyclePreparationObservation/v1',
      record_id: record.record_id,
      path: `${currentConfig.control.work_root}/${workId}/preparations/${kind}.v1.json`,
      sha256: sha(bytes),
      source_revision: sourceRevision,
      scope_id: scopeId,
      ac_ids: acIds,
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: null,
      decision: null,
      disposition: 'current',
    };
    return { reference, bytes };
  });
  const hostApprovalPrincipal = 'trusted-local-session-source-write';
  const approvalFields: EdictumWorkflowApprovalReceiptInput = {
    schema: 'EdictumWorkflowApproval/v1',
    stage_id: request.stage_id,
    approval_id: 'host-permission-1',
    approver: hostApprovalPrincipal,
    operation_hash: request.operation_hash,
    tenant: trustedIdentity.tenant,
    project: trustedIdentity.project,
    approved_at: new Date(Date.now() - 1_000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  const hostApproval = canonicalHostSourceWriteApproval(request, hostApprovalPrincipal, {
    ...approvalFields,
    evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(approvalFields),
  });
  const ledger: CoordinationLedger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: workspaceId,
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
  };
  const work: WorkState = {
    schema: 'WorkState/v1',
    workspace_id: ledger.workspace_id,
    revision: 1,
    binding,
    contracts: {
      scope: {
        schema: 'ContractReference/v1',
        path: '.agent/scope.json',
        sha256: sha(scopeBytes),
      },
      acceptance: {
        schema: 'ContractReference/v1',
        path: '.agent/acceptance.json',
        sha256: sha(acceptanceBytes),
      },
      decisions: [],
    },
    lease,
    execution: {
      run_id: runId,
      input_digest: inputDigest,
      phase: 'execute',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'EXECUTE',
      source_revision: sourceRevision,
      next_action: 'source.write',
      route: 'R1',
      risk: 'low',
      change_kind: 'fix',
      config_binding: { config_digest: configDigest, schema_digest: 'schema-1', runtime_code_digest: 'runtime-1' },
      scope: {
        scope_id: scopeId,
        allowed_paths: allowedPaths,
        fingerprint_paths: allowedPaths,
        implementation_paths: implementationPaths,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'epoch-1',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: preparations.map((item) => item.reference),
    },
    artifacts: [],
  };
  const hostSnapshot: HostStateSnapshot = {
    work,
    ledger,
    workVersion: { revision: work.revision, digest: canonicalJsonDigest(work) },
    ledgerVersion: { revision: ledger.revision, digest: coordinationLedgerDigest(ledger) },
    maintenanceGeneration: 0,
  };
  const workflowHostCapability = createTestWorkflowHostCapability(repositoryRoot, hostApprovalPrincipal);
  let currentChecks = 0;
  const context: SourceWritePreflightContext = {
    hostSnapshot,
    journal,
    config,
    projectContext,
    trustedIdentity,
    taskPacket,
    scopeBytes,
    acceptanceBytes,
    preparations,
    workflowHostCapability,
    assertCurrent: () => {
      currentChecks += 1;
    },
  };
  return {
    repositoryRoot,
    config,
    context,
    request,
    hostApproval,
    hostApprovalPrincipal,
    runId,
    currentChecks: () => currentChecks,
  };
}

async function callWithMalformedProducerInput(input: object): Promise<void> {
  await Reflect.apply(produceSourceWritePreflightApproval, undefined, [input]);
}

function workFrom(value: Fixture): WorkState {
  const work = value.context.hostSnapshot.work;
  assert.ok(work, 'fixture contains its current Host work');
  return work;
}

test('configured Source producer passes the pending Edictum gate without reserving a Host attempt', async () => {
  const value = fixture();
  await produceSourceWritePreflightApproval({
    repositoryRoot: value.repositoryRoot,
    context: value.context,
    request: value.request,
    hostApprovalPrincipal: value.hostApprovalPrincipal,
    hostApproval: value.hostApproval,
  });

  assert.equal(value.currentChecks(), 2);
  assert.deepEqual(workFrom(value).execution.assignment_attempts, []);
});

test('configured Cedar denial stops the Source producer before any Host attempt marker', async () => {
  const value = fixture('researcher');
  await Promise.resolve(
    assert.rejects(
      produceSourceWritePreflightApproval({
        repositoryRoot: value.repositoryRoot,
        context: value.context,
        request: value.request,
        hostApprovalPrincipal: value.hostApprovalPrincipal,
        hostApproval: value.hostApproval,
      }),
      /configured Cedar policy denied Source write/,
    ),
  );
  assert.equal(value.currentChecks(), 1);
  assert.deepEqual(workFrom(value).execution.assignment_attempts, []);
});

test('missing Host-local permission blocks even when configured Cedar and Edictum policy pass', async () => {
  const value = fixture();
  await Promise.resolve(
    assert.rejects(
      callWithMalformedProducerInput({
        repositoryRoot: value.repositoryRoot,
        context: value.context,
        request: value.request,
        hostApprovalPrincipal: value.hostApprovalPrincipal,
        hostApproval: null,
      }),
      /Host-local permission receipt is missing/,
    ),
  );
  assert.equal(value.currentChecks(), 2);
  assert.deepEqual(workFrom(value).execution.assignment_attempts, []);
});

test('a stale Host configuration digest stops the Source producer before Host attempt reservation', async () => {
  const value = fixture();
  assert.equal(Reflect.set(value.request, 'config_digest', '0'.repeat(64)), true);
  await Promise.resolve(
    assert.rejects(
      produceSourceWritePreflightApproval({
        repositoryRoot: value.repositoryRoot,
        context: value.context,
        request: value.request,
        hostApprovalPrincipal: value.hostApprovalPrincipal,
        hostApproval: value.hostApproval,
      }),
      /configuration differs from the current Host request/,
    ),
  );
  assert.equal(value.currentChecks(), 1);
  assert.deepEqual(workFrom(value).execution.assignment_attempts, []);
});
