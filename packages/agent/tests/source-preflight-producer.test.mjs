import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { test } from 'bun:test';
import { configuredTestContext } from './configured-context.mjs';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  createTestWorkflowHostCapability,
} from '../src/governance/edictum-boundary.ts';
import { canonicalHostSourceWriteApproval } from '../src/host-state.ts';
import { produceSourceWritePreflightApproval } from '../src/orchestration/source-preflight-operations.ts';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

function fixture(role = 'developer-orchestrator') {
  const { repositoryRoot, config, context: projectContext } = configuredTestContext();
  const projectId = projectContext.project_ids[0];
  const workId = 'source-preflight-producer-' + randomUUID();
  const threadId = 'source-preflight-thread-' + randomUUID();
  const runId = 'source-preflight-run-' + randomUUID();
  const workflowId = Object.keys(config.workflows).find((id) =>
    config.workflows[id].stages.some((stage) =>
      stage.assignments.some((assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source'),
    ),
  );
  assert.ok(workflowId, 'configured workflow has a Source-writing assignment');
  const sourceStage = config.workflows[workflowId].stages.find((stage) =>
    stage.assignments.some((assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source'),
  );
  const assignmentIndex = sourceStage.assignments.findIndex(
    (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
  );
  const configDigest = runtimeConfigDigest(config);
  const lease = { ticket_id: 'producer-ticket', thread_id: threadId, generation: 1 };
  const identity = {
    repository_id: projectContext.repository_id,
    project_ids: projectContext.project_ids,
    integrations_digest: projectContext.integrations_digest,
    work_id: workId,
  };
  const trustedIdentity = {
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'producer-test-user',
    role,
    tenant: identity.repository_id,
    project: projectId,
    registry_hash: projectContext.registry_hash,
  };
  const acIds = ['AC-1'];
  const allowedPaths = ['packages/agent/src'];
  const implementationPaths = ['packages/agent/src/orchestration'];
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'scope-1',
    work_id: workId,
    source_revision: 'source-1',
    ac_ids: acIds,
    allowed_paths: allowedPaths,
    implementation_paths: implementationPaths,
    attribution: { thread_id: threadId },
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    scope: 'scope-1',
    source_revision: 'source-1',
    ac_ids: acIds,
    contracts: [{ id: 'AC-1', definition: 'Configured Source policy and Host permission are both required' }],
  };
  const scopeBytes = Buffer.from(JSON.stringify(scope));
  const acceptanceBytes = Buffer.from(JSON.stringify(acceptance));
  const sourcePlan = {
    schema: 'LifecyclePreparationObservation/v1',
    record_id: 'source-plan-test-' + workId,
    kind: 'source_plan',
    work_id: workId,
    attempt: 1,
    source_revision: 'source-1',
    scope_id: scope.scope_id,
    config_digest: runtimeConfigDigest(config),
    ac_ids: acIds,
    observed_at: new Date().toISOString(),
    observer_id: 'source-planner-test',
    status: 'pass',
    evidence_refs: ['source-plan.md'],
    observations: [
      { mechanic: 'scope_acceptance_trace', actual: 'Current scope paths and AC-1 trace to the admitted acceptance contract.', evidence_ref: 'source-plan.md' },
      { mechanic: 'verification_rollback', actual: 'Focused verification and source restoration were identified for the scoped edit.', evidence_ref: 'source-plan.md' },
    ],
    gaps: [],
  };
  const sourcePlanBytes = Buffer.from(JSON.stringify(sourcePlan));
  const sourcePlanReference = {
    schema: 'LifecycleArtifactReference/v1',
    kind: 'source_plan',
    artifact_schema: 'LifecyclePreparationObservation/v1',
    record_id: sourcePlan.record_id,
    path: `${config.control.work_root}/${workId}/preparations/source-plan-test.v1.json`,
    sha256: sha(sourcePlanBytes),
    source_revision: scope.source_revision,
    scope_id: scope.scope_id,
    ac_ids: acIds,
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: null,
    decision: null,
    disposition: 'current',
  };
  const binding = {
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    integrations_digest: identity.integrations_digest,
    lifecycle_work_id: workId,
    workflow_id: workflowId,
    work_source_revision: 'source-1',
    scope_id: scope.scope_id,
    scope_contract_digest: sha(scopeBytes),
    acceptance_manifest_digest: sha(acceptanceBytes),
    ac_ids: acIds,
    implementation_paths: implementationPaths,
    config_digest: configDigest,
  };
  const inputDigest = 'd'.repeat(64);
  const requestFields = {
    store_id: 'producer-test-store',
    action: 'source.write',
    identity,
    config_digest: configDigest,
    workflow_id: workflowId,
    stage_id: sourceStage.id,
    assignment_id: canonicalJsonDigest({ binding, run_id: runId, input_digest: inputDigest, stage_id: sourceStage.id, assignment_index: assignmentIndex }),
    assignment_index: assignmentIndex,
    request_digest: 'b'.repeat(64),
    attempt_id: '',
    lease,
  };
  requestFields.attempt_id = canonicalJsonDigest({
    assignment_id: requestFields.assignment_id,
    request_digest: requestFields.request_digest,
    lease,
    previous_attempt_id: null,
  });
  const request = {
    schema: 'WorkflowAttemptApprovalRequest/v1',
    ...requestFields,
    operation_hash: canonicalJsonDigest(requestFields),
  };
  const packetUnsigned = {
    schema: 'DevelopmentTaskPacket/v1',
    packet_id: 'packet-1',
    work_item_id: workId,
    team_id: 'team-1',
    workflow_id: workflowId,
    work_item: { kind: 'task', intent: 'fix', project: projectId, risk_flags: [], labels: [] },
    attempt: 1,
    risk_flags: [],
    objective: 'Verify configured Source approval production',
    acceptance: acceptance.contracts.map((contract) => `${contract.id}: ${contract.definition}`),
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
  const taskPacket = { ...packetUnsigned, digest: canonicalJsonDigest(packetUnsigned) };
  const hostApprovalPrincipal = 'trusted-local-session-source-write';
  const approvalFields = {
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
  const ledger = { workspace_id: 'producer-test-workspace', revision: 1 };
  const work = {
    schema: 'WorkState/v1',
    workspace_id: ledger.workspace_id,
    revision: 1,
    binding,
    contracts: { scope: { sha256: sha(scopeBytes) }, acceptance: { sha256: sha(acceptanceBytes) }, decisions: [] },
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
      source_revision: 'source-1',
      next_action: 'source.write',
      route: 'R1',
      risk: 'low',
      change_kind: 'fix',
      config_binding: { config_digest: configDigest, schema_digest: 'schema-1', runtime_code_digest: 'runtime-1' },
      scope: { scope_id: scope.scope_id, allowed_paths: allowedPaths, fingerprint_paths: allowedPaths, implementation_paths: implementationPaths, documentation_paths: [] },
      seal: null,
      assurance: { epoch: 'epoch-1', review_generation: 0, correction_count: 0, review_failure_count: 0, delivery_cycle_id: null },
      references: [sourcePlanReference],
    },
    artifacts: [],
  };
  const hostSnapshot = {
    work,
    ledger,
    workVersion: { revision: work.revision, digest: canonicalJsonDigest(work) },
    ledgerVersion: { revision: ledger.revision, digest: canonicalJsonDigest(ledger) },
    maintenanceGeneration: 0,
  };
  const journalState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: ledger.workspace_id,
    work_id: workId,
    run_id: runId,
    attempt: 1,
    completed: [],
    items: [],
  };
  const journal = {
    state: journalState,
    version: { revision: 1, digest: canonicalJsonDigest(journalState) },
    resume_status: 'ready',
  };
  const workflowHostCapability = createTestWorkflowHostCapability(repositoryRoot, hostApprovalPrincipal);
  let currentChecks = 0;
  const context = {
    hostSnapshot,
    journal,
    config,
    projectContext,
    trustedIdentity,
    taskPacket,
    scopeBytes,
    acceptanceBytes,
    preparations: [{ reference: sourcePlanReference, bytes: sourcePlanBytes }],
    workflowHostCapability,
    assertCurrent: () => { currentChecks += 1; },
  };
  return { repositoryRoot, config, context, request, hostApproval, hostApprovalPrincipal, runId, currentChecks: () => currentChecks };
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
  assert.deepEqual(value.context.hostSnapshot.work.execution.assignment_attempts, []);
});

test('configured Cedar denial stops the Source producer before any Host attempt marker', async () => {
  const value = fixture('researcher');
  await assert.rejects(
    produceSourceWritePreflightApproval({
      repositoryRoot: value.repositoryRoot,
      context: value.context,
      request: value.request,
      hostApprovalPrincipal: value.hostApprovalPrincipal,
      hostApproval: value.hostApproval,
    }),
    /configured Cedar policy denied Source write/,
  );
  assert.equal(value.currentChecks(), 1);
  assert.deepEqual(value.context.hostSnapshot.work.execution.assignment_attempts, []);
});

test('missing Host-local permission blocks even when configured Cedar and Edictum policy pass', async () => {
  const value = fixture();
  await assert.rejects(
    produceSourceWritePreflightApproval({
      repositoryRoot: value.repositoryRoot,
      context: value.context,
      request: value.request,
      hostApprovalPrincipal: value.hostApprovalPrincipal,
      hostApproval: null,
    }),
    /Host-local permission receipt is missing/,
  );
  assert.equal(value.currentChecks(), 2);
  assert.deepEqual(value.context.hostSnapshot.work.execution.assignment_attempts, []);
});

test('a stale Host configuration digest stops the Source producer before Host attempt reservation', async () => {
  const value = fixture();
  value.request.config_digest = '0'.repeat(64);
  await assert.rejects(
    produceSourceWritePreflightApproval({
      repositoryRoot: value.repositoryRoot,
      context: value.context,
      request: value.request,
      hostApprovalPrincipal: value.hostApprovalPrincipal,
      hostApproval: value.hostApproval,
    }),
    /configuration differs from the current Host request/,
  );
  assert.equal(value.currentChecks(), 1);
  assert.deepEqual(value.context.hostSnapshot.work.execution.assignment_attempts, []);
});

