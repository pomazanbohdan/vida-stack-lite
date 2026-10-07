import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'bun:test';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { computeEdictumWorkflowApprovalEvidenceDigest } from '../src/governance/edictum-boundary.ts';
import { canonicalHostSourceWriteApproval } from '../src/host-state.ts';
import { validateSourceWritePreflight } from '../src/orchestration/source-preflight.ts';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const now = () => new Date().toISOString();

function fixture(options = {}) {
  const {
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
  const securityRequired = lifecycleRisk === 'high' ||
    taskRiskFlags.some((flag) => ['security', 'data_loss', 'migration', 'high'].includes(flag));
  const ids = ['AC-1'],
    allowedPaths = ['packages/agent/src'],
    implementationPaths = ['packages/agent/src/orchestration'],
    lease = { ticket_id: 'ticket-1', thread_id: 'thread-1', generation: 2 },
    identity = {
      repository_id: 'vida-agent',
      project_ids: ['agent'],
      integrations_digest: 'c'.repeat(64),
      work_id: 'work-1',
    };

  const prewriter = {
    id: 'review_source_prewrite',
    kind: 'validate',
    mode: 'parallel',
    assignments: [
      { role: 'source-planner', profile: 'architect', contour: 'requirements' },
      { role: 'security-prewriter', profile: 'reviewer-security', contour: 'security_data', risk_flags: ['security', 'data_loss', 'migration', 'high'] },
    ],
    consumes: ['DevelopmentTaskPacket/v1'],
    produces: ['LifecyclePreparationObservation/v1'],
    required_after: ['synthesize_task'],
  };
  const config = {
    schema: 'AgentRuntimeConfig/v1',
    repository: { repository_id: identity.repository_id },
    projects: [{ project_id: configuredProjectId }],
    teams: {
      'team-1': {
        enabled: true,
        stage_overrides: {},
        roles: {
          developer: 'source-writer',
          'source-planner': 'architect',
          'security-prewriter': 'reviewer-security',
        },
      },
    },
    workflows: {
      'workflow-1': {
        stages: [
          ...(securityRequired && reviewerLocation === 'prewrite'
            ? [{ id: 'synthesize_task', kind: 'synthesize', mode: 'single', assignments: [{ role: 'synthesizer', profile: 'source-writer' }], consumes: [], produces: ['DevelopmentTaskPacket/v1'], required_after: [] }, prewriter]
            : []),
          {
            id: 'source',
            kind: 'develop',
            mode: 'single',
            assignments: [{ role: 'developer', profile: 'source-writer', contour: 'code' }],
            consumes: ['DevelopmentTaskPacket/v1'],
            produces: ['ImplementationResult/v1'],
            required_after: securityRequired && reviewerLocation === 'prewrite' ? ['review_source_prewrite'] : [],
          },
          ...(securityRequired && reviewerLocation === 'postwrite'
            ? [
                {
                  id: 'postwrite_security',
                  kind: 'validate',
                  mode: 'single',
                  assignments: [{ role: 'security-reviewer', profile: 'reviewer-security', contour: 'security_data' }],
                  consumes: ['ImplementationResult/v1'],
                  produces: ['ValidationResult/v1'],
                  required_after: ['source'],
                },
              ]
            : []),
        ],
      },
    },
    agents: {
      profiles: {
        'source-writer': {
          mutation_scope: 'repository_source',
          egress_policy: 'none',
          tools_policy: 'source-write',
        },
        architect: {
          mutation_scope: 'none',
          egress_policy: 'none',
          tools_policy: 'read_only',
        },
        'reviewer-security': {
          mutation_scope: reviewerConfigured ? 'none' : 'repository_source',
          egress_policy: 'none',
          tools_policy: reviewerConfigured ? 'read_only' : 'source-write',
        },
      },
      tool_policies: {
        'source-write': { source_write: writerCanWrite || !reviewerConfigured, allowed_tools: ['read', 'write'] },
        read_only: { source_write: false, allowed_tools: ['read'] },
      },
    },
    governance: {
      edictum: {
        workflow: {
          stages: [
            { id: 'governed-write-approval', tools: [], approval_required: true, require_result: false },
            { id: 'governed-write', tools: ['runtime.write'], approval_required: false, require_result: true },
          ],
        },
      },
    },
  };
  const configDigest = runtimeConfigDigest(config);
  const runId = 'run-1';
  const writerActionId = 'e'.repeat(64);
  const reviewerActionId = 'f'.repeat(64);
  const makeJournalItem = (actionId, role, stageId, assignmentIndex, summary) => {
    const outputDigest = canonicalJsonDigest(summary);
    const issueId = `${role}-issue`;
    return {
      request: {
        action_id: actionId,
        run_id: runId,
        workflow_id: 'workflow-1',
        config_digest: configDigest,
        scope_digest: 'source-1',
        role,
        stage_id: stageId,
        assignment_index: assignmentIndex,
      },
      issue_id: issueId,
      observation: {
        action_id: actionId,
        issue_id: issueId,
        output_digest: outputDigest,
        summary,
        status: 'reported_complete',
      },
    };
  };
  const writerItem = makeJournalItem(writerActionId, 'developer', 'source', 0, 'source preparation observed');
  const reviewerItem = reviewerLocation === 'postwrite'
    ? makeJournalItem(reviewerActionId, 'security-reviewer', 'postwrite_security', 0, 'security review observed')
    : makeJournalItem(reviewerActionId, 'security-prewriter', 'review_source_prewrite', 1, 'security review observed');
  const journalItems = securityRequired && includeSecurityObservation ? [writerItem, reviewerItem] : [writerItem];
  const journal = {
    version: { revision: 1 },
    state: {
      schema: 'MastraSessionLedger/v1',
      workspace_id: 'workspace-1',
      work_id: identity.work_id,
      attempt: 1,
      run_id: runId,
      step_id: null,
      items: [],
      completed: journalItems.map((item) => ({ step_id: item.request.stage_id, items: [item] })),
    },
    resume_status: 'ready',
  };
  journal.version.digest = canonicalJsonDigest(journal.state);
  const writerEvidenceRef = `artifact://session-observation/${runId}/${writerActionId}/${writerItem.observation.output_digest}`;
  const reviewerEvidenceRef = `artifact://session-observation/${runId}/${reviewerActionId}/${reviewerItem.observation.output_digest}`;

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
    team_id: 'team-1',
    lifecycle_work_id: identity.work_id,
    workflow_id: 'workflow-1',
    work_source_revision: 'source-1',
    scope_id: 'scope-1',
    scope_contract_digest: sha(scopeBytes),
    acceptance_manifest_digest: sha(acceptanceBytes),
    ac_ids: ids,
    implementation_paths: implementationPaths,
    config_digest: configDigest,
  };
  const projectContext = {
    schema: 'ProjectContext/v1',
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    integrations_digest: identity.integrations_digest,
    config_digest: configDigest,
    registry_hash: 'registry-1',
  };
  const trustedIdentity = {
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'human-1',
    role: 'operator',
    tenant: identity.repository_id,
    project: 'agent',
    registry_hash: projectContext.registry_hash,
  };
  const operation = {
    store_id: 'store-1',
    action: 'source.write',
    identity,
    config_digest: configDigest,
    workflow_id: binding.workflow_id,
    stage_id: 'source',
    assignment_id: canonicalJsonDigest({
      binding,
      run_id: runId,
      input_digest: 'd'.repeat(64),
      stage_id: 'source',
      assignment_index: 0,
    }),
    assignment_index: 0,
    request_digest: 'b'.repeat(64),
    attempt_id: '',
    lease,
  };
  operation.attempt_id = canonicalJsonDigest({
    assignment_id: operation.assignment_id,
    request_digest: operation.request_digest,
    lease,
    previous_attempt_id: null,
  });
  const request = {
    schema: 'WorkflowAttemptApprovalRequest/v1',
    ...operation,
    operation_hash: canonicalJsonDigest(operation),
  };

  const mechanics = {
    source_plan: ['scope_acceptance_trace', 'verification_rollback'],
    platform_knowledge: ['platform_contracts', 'official_reference_lookup'],
    implementation_policy: ['root_cause_owner', 'affected_callers', 'existing_primitives'],
    change_impact_pre: ['affected_paths', 'invalidation', 'rollback'],
    documentation_validation: ['current_inventory', 'current_clear'],
  };
  if (securityRequired && includeSecurityObservation) mechanics.implementation_policy.push('prewriter_security_gate');
  const preparations = withPreparations
    ? Object.entries(mechanics).map(([kind, names]) => {
        const observations = names.map((mechanic) => {
          const evidenceRef = mechanic === 'prewriter_security_gate' ? reviewerEvidenceRef : writerEvidenceRef;
          return { mechanic, actual: 'Observed current evidence', evidence_ref: evidenceRef };
        });
        const record = {
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
        };
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
        };
        return { reference, bytes };
      })
    : [];

  const work = {
    schema: 'WorkState/v1',
    workspace_id: 'workspace-1',
    revision: 1,
    binding,
    contracts: {
      scope: { sha256: sha(scopeBytes) },
      acceptance: { sha256: sha(acceptanceBytes) },
      decisions: [],
    },
    lease,
    execution: {
      run_id: runId,
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
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: preparations.map((item) => item.reference),
    },
    artifacts: [],
  };
  const ledger = { workspace_id: work.workspace_id, revision: 1 };
  const hostSnapshot = {
    work,
    ledger,
    workVersion: { revision: work.revision, digest: canonicalJsonDigest(work) },
    ledgerVersion: { revision: ledger.revision, digest: canonicalJsonDigest(ledger) },
    maintenanceGeneration: 0,
  };

  const unsignedPacket = {
    schema: 'DevelopmentTaskPacket/v1',
    packet_id: 'packet-1',
    work_item_id: identity.work_id,
    team_id: 'team-1',
    workflow_id: binding.workflow_id,
    work_item: { kind: 'task', intent: 'fix', project: 'agent', risk_flags: taskRiskFlags, labels: [] },
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
  const taskPacket = { ...unsignedPacket, digest: canonicalJsonDigest(unsignedPacket) };
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
  };
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
  };
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
  };

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

function replacePreparationRecord(fixtureValue, kind, change) {
  const entry = fixtureValue.input.preparations.find((item) => item.reference.kind === kind);
  const record = JSON.parse(entry.bytes.toString('utf8'));
  change(record);
  entry.bytes = Buffer.from(JSON.stringify(record));
  entry.reference = { ...entry.reference, sha256: sha(entry.bytes) };
  fixtureValue.input.hostSnapshot.work.lifecycle.references = fixtureValue.input.hostSnapshot.work.lifecycle.references.map(
    (reference) => (reference.kind === kind ? entry.reference : reference),
  );
  fixtureValue.input.hostSnapshot.workVersion = {
    ...fixtureValue.input.hostSnapshot.workVersion,
    digest: canonicalJsonDigest(fixtureValue.input.hostSnapshot.work),
  };
  return entry;
}

function assertNoAttemptMarker(fixtureValue) {
  assert.equal(fixtureValue.input.hostSnapshot.work.execution.assignment_attempts.length, 0);
}

test('fully bound current preflight passes before Host attempt reservation', () => {
  const value = fixture();
  const result = validateSourceWritePreflight(value.input);
  assert.equal(result.length, 5);
  assert.equal(result.every((reference) => value.input.hostSnapshot.work.lifecycle.references.includes(reference)), true);
  assertNoAttemptMarker(value);
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
    record.scope_id = 'stale-scope';
  });
  assert.throws(() => validateSourceWritePreflight(stale.input), /lifecycle preparation is stale/);
  assertNoAttemptMarker(stale);

  const foreign = fixture();
  replacePreparationRecord(foreign, 'source_plan', (record) => {
    record.work_id = 'foreign-work';
  });
  assert.throws(() => validateSourceWritePreflight(foreign.input), /lifecycle preparation is stale/);
  assertNoAttemptMarker(foreign);
});

test('stale implementation policy and unconfigured Source writer fail before Host attempt reservation', () => {
  const stalePolicy = fixture();
  replacePreparationRecord(stalePolicy, 'implementation_policy', (record) => {
    record.config_digest = '0'.repeat(64);
  });
  assert.throws(() => validateSourceWritePreflight(stalePolicy.input), /lifecycle preparation is stale/);
  assertNoAttemptMarker(stalePolicy);

  const deniedPolicy = fixture({ writerCanWrite: false });
  assert.throws(() => validateSourceWritePreflight(deniedPolicy.input), /configured Source-writing assignment/);
  assertNoAttemptMarker(deniedPolicy);
});

test('stale runtime configuration and session journal versions fail before Host attempt reservation', () => {
  const staleConfig = fixture();
  staleConfig.input.config.config_revision = 2;
  assert.throws(() => validateSourceWritePreflight(staleConfig.input), /current trusted configuration/);
  assertNoAttemptMarker(staleConfig);

  const staleJournal = fixture();
  staleJournal.input.journal.state.step_id = 'changed-after-read';
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
    record.observations = record.observations.filter((item) => item.mechanic !== 'prewriter_security_gate');
  });
  assert.throws(() => validateSourceWritePreflight(missing.input), /prewriter security observation/);
  assertNoAttemptMarker(missing);

  const writerEvidence = fixture({ highRisk: true });
  replacePreparationRecord(writerEvidence, 'implementation_policy', (record) => {
    const security = record.observations.find((item) => item.mechanic === 'prewriter_security_gate');
    security.evidence_ref = writerEvidence.writerEvidenceRef;
    record.evidence_refs = [...new Set(record.observations.map((item) => item.evidence_ref))];
  });
  assert.throws(() => validateSourceWritePreflight(writerEvidence.input), /configured reviewer observation/);
  assertNoAttemptMarker(writerEvidence);

  const staleReviewer = fixture({ highRisk: true });
  const reviewerItem = staleReviewer.input.journal.state.completed
    .flatMap((wave) => wave.items)
    .find((item) => item.request.role === 'security-prewriter');
  reviewerItem.request.scope_digest = 'old-source-revision';
  staleReviewer.input.journal.version.digest = canonicalJsonDigest(staleReviewer.input.journal.state);
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
  assert.throws(() => validateSourceWritePreflight(syntheticAllow.input), /configured Edictum runtime.write evaluation/);
  assertNoAttemptMarker(syntheticAllow);

  const edictumForeignOperation = fixture();
  edictumForeignOperation.input.edictumOperation = {
    ...edictumForeignOperation.input.edictumOperation,
    operation_hash: '0'.repeat(64),
  };
  assert.throws(() => validateSourceWritePreflight(edictumForeignOperation.input), /configured Edictum runtime.write evaluation/);
  assertNoAttemptMarker(edictumForeignOperation);

  const expired = fixture();
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
  foreignLease.input.request = { ...foreignLease.input.request, lease: { ...foreignLease.input.request.lease, thread_id: 'other-thread' } };
  assert.throws(() => validateSourceWritePreflight(foreignLease.input), /pending Host request differs/);
  assertNoAttemptMarker(foreignLease);

  const wrongHostPrincipal = fixture();
  wrongHostPrincipal.input.hostApprovalPrincipal = 'other-host-principal';
  assert.throws(() => validateSourceWritePreflight(wrongHostPrincipal.input), /Host-local permission receipt/);
  assertNoAttemptMarker(wrongHostPrincipal);

  const wrongWrappedPrincipal = fixture();
  wrongWrappedPrincipal.input.hostApproval = {
    ...wrongWrappedPrincipal.input.hostApproval,
    principal: 'other-host-principal',
  };
  assert.throws(() => validateSourceWritePreflight(wrongWrappedPrincipal.input), /Host-local permission receipt/);
  assertNoAttemptMarker(wrongWrappedPrincipal);
});
