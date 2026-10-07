import { afterEach, beforeEach, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  assertExistingTaskSourceHostDatabase,
  createTaskSourceMutationPolicyRequest,
  executeTaskSourceBindingOperation,
  readSourceExecutionContext,
} from '../src/orchestration/task-source-binding-operations.ts';
import {
  createTaskSourceBinding,
  resolveCurrentTaskSourceFileRoot,
  resolveTaskSourceFileRoot,
} from '../src/orchestration/task-source-binding.ts';
import {
  snapshotAdmittedTaskSources,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { buildAdmittedDevelopmentPacket } from '../src/orchestration/admitted-development-packet.ts';
import { buildAdmittedImplementationResult } from '../src/orchestration/admitted-implementation-result.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { openConfiguredMastraSessionLedger, sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { buildSessionBridgeRequest, configuredContextForStage } from '../src/orchestration/mastra-session-bridge.ts';
import { run } from '../bin/run.mjs';

const workspace = 'a'.repeat(64);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identity = {
  repository_id: 'vida-agent',
  project_ids: ['agent'],
  integrations_digest: '1'.repeat(64),
  work_id: 'work-1',
};
let root, database, store, initial, journal, request;

function makeWorkAndLedger(workIdentity = identity, selectedWorkspace = workspace, sourceScopeOverride) {
  const resource = 'file:src/task.ts';
  const scopeBody = {
    schema: 'ScopedSourceSnapshot/v1',
    entries: [{ path: 'src/task.ts', exists: true, bytes: 3, sha256: '2'.repeat(64) }],
  };
  const sourceScope = sourceScopeOverride ?? { ...scopeBody, digest: canonicalJsonDigest(scopeBody) };
  const binding = {
    repository_id: workIdentity.repository_id,
    project_ids: workIdentity.project_ids,
    integrations_digest: workIdentity.integrations_digest,
    team_id: 'core',
    workflow_id: 'bug_fix',
    provider_work_item_id: 'external-work-1',
    lifecycle_work_id: workIdentity.work_id,
    work_item_digest: '3'.repeat(64),
    work_source_revision: sourceScope.digest,
    scope_id: 'scope-work-1',
    scope_contract_digest: '4'.repeat(64),
    acceptance_manifest_digest: '5'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: [resource],
    config_digest: '6'.repeat(64),
    runtime_source_revision: '7'.repeat(64),
    schema_digest: '8'.repeat(64),
    runtime_code_digest: '9'.repeat(64),
  };
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const claim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-work-1',
    ticket_id: 'ticket-work-1',
    work_id: workIdentity.work_id,
    thread_id: 'thread-1',
    generation: 1,
    resources: [resource],
    lease_expires_at: expires,
    status: 'active',
    created_at: new Date().toISOString(),
    renewed_at: new Date().toISOString(),
  };
  const ticket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: 'ticket-work-1',
    repository_id: workIdentity.repository_id,
    project_ids: workIdentity.project_ids,
    integrations_digest: workIdentity.integrations_digest,
    work_id: workIdentity.work_id,
    thread_id: 'thread-1',
    source_revision: sourceScope.digest,
    generation: 1,
    sequence: 1,
    contour_keys: ['tenant:tenant', 'project:tenant/agent', resource],
    exclusive_resources: [resource],
    status: 'active',
    claim_ids: [claim.claim_id],
    expires_at: expires,
    active_resources: [resource],
    blocked_resources: [],
    created_at: new Date().toISOString(),
  };
  const work = {
    schema: 'WorkState/v1',
    workspace_id: selectedWorkspace,
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
      acceptance: {
        schema: 'AcceptanceManifest/v1',
        path: '.agent/acceptance.json',
        sha256: binding.acceptance_manifest_digest,
      },
      decisions: [],
    },
    lease: { ticket_id: ticket.ticket_id, thread_id: ticket.thread_id, generation: ticket.generation },
    execution: {
      run_id: 'run-work-1',
      input_digest: 'a'.repeat(64),
      phase: 'implementation',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: binding.work_source_revision,
      next_action: 'Trace the accepted work request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'fix',
      config_binding: {
        config_digest: binding.config_digest,
        schema_digest: binding.schema_digest,
        runtime_code_digest: binding.runtime_code_digest,
      },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: ['src/task.ts'],
        fingerprint_paths: ['src/task.ts'],
        implementation_paths: ['src/task.ts'],
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
      references: [],
    },
    artifacts: [],
  };
  return {
    expectedWork: null,
    expectedLedger: null,
    nextWork: work,
    nextLedger: {
      schema: 'CoordinationLedger/v1',
      workspace_id: selectedWorkspace,
      revision: 1,
      open_generation: 1,
      next_sequence: 2,
      tickets: [ticket],
      claims: [claim],
      notices: [],
      dispositions: [],
      contours: [],
      batches: [],
      rebinds: [],
      operations: [],
      retirements: [],
    },
    sourceScope,
  };
}

function operationRequest(overrides = {}) {
  return {
    schema: 'TaskSourceBindingRequest/v1',
    operation: 'propose-create',
    operation_id: 'task-source-op-1',
    request_id: 'task-source-request-1',
    branch_ref: 'refs/heads/codex/task-source',
    expected_host: {
      work: initial.workVersion,
      ledger: initial.ledgerVersion,
      journal: { attempt: 1, version: { revision: 1, digest: canonicalJsonDigest(journal) } },
      maintenance_generation: initial.maintenanceGeneration,
    },
    work_id: identity.work_id,
    attempt: 1,
    thread_id: 'thread-1',
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    canonical_host_root: root,
    config_digest: '6'.repeat(64),
    project_context_digest: 'b'.repeat(64),
    ...overrides,
  };
}

function makeConfiguredFixtureRoot() {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-task-source-real-host-')),
    runtimeRoot = path.join(repositoryRoot, 'runtime');
  mkdirSync(runtimeRoot, { recursive: true });
  for (const directory of ['schemas', 'instructions', 'tooling'])
    cpSync(path.join(packageRoot, directory), path.join(runtimeRoot, directory), { recursive: true });
  cpSync(path.join(packageRoot, 'TESTING.md'), path.join(runtimeRoot, 'TESTING.md'));
  mkdirSync(path.join(repositoryRoot, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(repositoryRoot, 'AGENTS.md'), '# Isolated Host fixture\n');
  writeFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), '# Isolated project fixture\n');
  const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
  writeFileSync(
    path.join(repositoryRoot, policyPath),
    JSON.stringify({
      schema: 'DocumentationPolicy/v1',
      policy_id: 'task-source-fixture',
      project_id: 'agent',
      source_path: policyPath,
      owner: 'task-source-test',
      required: false,
      canonical_roots: ['docs'],
      map_paths: ['AGENT.sidecar.md'],
      excluded_roots: [],
      changelog_required: false,
      changelog_path: null,
      relations: ['documents'],
      updated_at: '2026-10-07T00:00:00.000Z',
    }),
  );
  const configText = readFileSync(path.join(packageRoot, 'templates', 'agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{BUNDLE}}', 'runtime')
    .replaceAll('{{REPOSITORY}}', 'task-source-fixture')
    .replaceAll('{{PROJECT}}', 'agent');
  writeFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'), configText);
  const config = loadRuntimeConfig(repositoryRoot),
    project = loadProjectSetContext(
      repositoryRoot,
      config,
      config.repository.repository_id,
      [config.projects[0].project_id],
    );
  return { repositoryRoot, config, project };
}

function makePrewriterHostFixture({ lifecycleRisk = 'high', packetRiskFlags = ['high'], includeSourceAuthorization = false } = {}) {
  const fixture = makeConfiguredFixtureRoot(),
    { repositoryRoot, config, project } = fixture,
    workId = 'source-plan-report-' + createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 12),
    threadId = 'source-plan-thread-' + workId,
    workflowId = 'task_execution',
    teamId = Object.keys(config.teams).find((id) => config.teams[id].enabled),
    workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
    projectId = project.project_ids[0],
    workIdentity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: workId,
    },
    taskSourcePath = path.join(repositoryRoot, 'src', 'task.ts'),
    scopePath = '.agent/scope.json',
    acceptancePath = '.agent/acceptance.json',
    sessionDatabasePath = sessionHandoffDatabasePath(repositoryRoot, config);
  let configuredDatabase, ledger;
  mkdirSync(path.dirname(taskSourcePath), { recursive: true });
  mkdirSync(path.dirname(sessionDatabasePath), { recursive: true });
  mkdirSync(path.join(repositoryRoot, '.agent'), { recursive: true });
  mkdirSync(path.join(repositoryRoot, '.git'), { recursive: true });
  writeFileSync(taskSourcePath, 'Current source for readonly planning.\n');
  const taskScope = snapshotDeclaredSources(requireSafeRepositoryAccess(repositoryRoot), ['src/task.ts']);
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: 'scope-' + workId,
    work_id: workId,
    source_revision: taskScope.digest,
    ac_ids: ['AC-1'],
    allowed_paths: ['src/task.ts'],
    implementation_paths: ['src/task.ts'],
    documentation_paths: [],
    changed_symbols: [],
    non_goals: [],
    acceptance_trace: ['AC-1'],
    behavior_trace: ['Read current source and plan the scoped change.'],
    test_trace: ['Report a current read-only plan.'],
    diagnostic_trace: ['Keep source evidence bound to the current scope.'],
    attribution: { thread_id: threadId, pointer: 'local:source-plan-report' },
    owner: 'source-plan-report-test',
    created_at: '2026-10-07T00:00:00.000Z',
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: 'acceptance-' + workId,
    version: 1,
    ac_ids: ['AC-1'],
    source: 'local:source-plan-report',
    scope: scope.scope_id,
    source_revision: taskScope.digest,
    contracts: [{
      id: 'AC-1',
      definition: 'The planner report is bound to current scope and verification.',
      sr: 'The current admitted Source plan and security policy use the exact scope.',
      evidence: ['Focused Host preparation regression.'],
    }],
  };
  const scopeBytes = Buffer.from(canonicalJson(scope)),
    acceptanceBytes = Buffer.from(canonicalJson(acceptance));
  writeFileSync(path.join(repositoryRoot, scopePath), scopeBytes);
  writeFileSync(path.join(repositoryRoot, acceptancePath), acceptanceBytes);
  const seed = makeWorkAndLedger(workIdentity, workspaceId, taskScope),
    work = seed.nextWork,
    workItem = {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'local',
      provider_type: 'Task',
      canonical_kind: 'task',
      intent: workflowId,
      project_id: projectId,
      title: 'Plan the current Source change',
      description: 'Read and plan the current scoped Source change.',
      risk_flags: packetRiskFlags,
      labels: [],
    };
  work.lease.thread_id = threadId;
  seed.nextLedger.tickets[0].thread_id = threadId;
  seed.nextLedger.claims[0].thread_id = threadId;
  Object.assign(work.binding, {
    team_id: teamId,
    workflow_id: workflowId,
    provider_work_item_id: workId,
    work_item_digest: canonicalJsonDigest(workItem),
    scope_id: scope.scope_id,
    scope_contract_digest: createHash('sha256').update(scopeBytes).digest('hex'),
    acceptance_manifest_digest: createHash('sha256').update(acceptanceBytes).digest('hex'),
    ac_ids: ['AC-1'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: ['file:src/task.ts'],
    config_digest: runtimeConfigDigest(config),
  });
  const runtimeCodePaths = runtimePackageCodePaths(config.runtime.bundle),
    runtimeCodeDigest = snapshotRuntimePackageSources(
      runtimePackageAccess(),
      config.runtime.bundle,
      runtimeCodePaths,
    ).digest;
  work.binding.runtime_code_digest = runtimeCodeDigest;
  Object.assign(work.contracts.scope, {
    schema: scope.schema,
    path: scopePath,
    sha256: work.binding.scope_contract_digest,
  });
  Object.assign(work.contracts.acceptance, {
    schema: acceptance.schema,
    path: acceptancePath,
    sha256: work.binding.acceptance_manifest_digest,
  });
  work.execution.run_id = 'run-' + workId;
  Object.assign(work.lifecycle, {
    phase: 'INTAKE',
    risk: lifecycleRisk,
    source_revision: taskScope.digest,
    config_binding: {
      config_digest: work.binding.config_digest,
      schema_digest: work.binding.schema_digest,
      runtime_code_digest: work.binding.runtime_code_digest,
    },
    scope: {
      scope_id: scope.scope_id,
      allowed_paths: ['src/task.ts'],
      fingerprint_paths: ['src/task.ts'],
      implementation_paths: ['src/task.ts'],
      documentation_paths: [],
    },
  });
  work.lifecycle.references = [
    {
      schema: 'LifecycleArtifactReference/v1',
      kind: 'acceptance_manifest',
      artifact_schema: acceptance.schema,
      record_id: acceptance.id,
      path: acceptancePath,
      sha256: work.binding.acceptance_manifest_digest,
      source_revision: taskScope.digest,
      scope_id: scope.scope_id,
      ac_ids: ['AC-1'],
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: null,
      decision: null,
      disposition: 'current',
    },
    {
      schema: 'LifecycleArtifactReference/v1',
      kind: 'implementation_scope',
      artifact_schema: scope.schema,
      record_id: scope.scope_id,
      path: scopePath,
      sha256: work.binding.scope_contract_digest,
      source_revision: taskScope.digest,
      scope_id: scope.scope_id,
      ac_ids: ['AC-1'],
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: null,
      decision: null,
      disposition: 'current',
    },
  ];
  if (includeSourceAuthorization) {
    const writerStage = config.workflows[workflowId].stages.find((candidate) =>
        candidate.kind === 'develop' && candidate.assignments.some(
          (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
        ),
      ),
      authorization = {
        schema: 'LocalSourceWriteAuthorization/v1',
        action: 'source.write',
        user_instruction_ref: 'fixture-source-authorization-' + workId,
        work_id: workId,
        attempt: 1,
        scope_digest: taskScope.digest,
        config_digest: work.binding.config_digest,
        workflow_id: workflowId,
        stage_ids: [writerStage.id],
        implementation_paths: ['src/task.ts'],
        native_session_handle: threadId,
      },
      authorizationPath = `.agent/work/${workId}/local-source-write-authorization.v1.json`,
      authorizationBytes = Buffer.from(canonicalJson(authorization));
    mkdirSync(path.dirname(path.join(repositoryRoot, authorizationPath)), { recursive: true });
    writeFileSync(path.join(repositoryRoot, authorizationPath), authorizationBytes);
    work.lifecycle.references.push({
      schema: 'LifecycleArtifactReference/v1',
      kind: 'execution_approval',
      artifact_schema: authorization.schema,
      record_id: authorization.user_instruction_ref,
      path: authorizationPath,
      sha256: createHash('sha256').update(authorizationBytes).digest('hex'),
      source_revision: taskScope.digest,
      scope_id: scope.scope_id,
      ac_ids: ['AC-1'],
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: 'local-session:' + canonicalJsonDigest(threadId),
      decision: 'approved',
      disposition: 'current',
    });
  }
  const intakePath = `.agent/work/${workId}/local-session-intake.v1.json`,
    intakeBytes = Buffer.from(canonicalJson({
      schema: 'VidaLocalSessionIntake/v1',
      work_item: workItem,
      runtime_code_paths: runtimeCodePaths,
      native_session_handle: threadId,
    }));
  mkdirSync(path.dirname(path.join(repositoryRoot, intakePath)), { recursive: true });
  writeFileSync(path.join(repositoryRoot, intakePath), intakeBytes);
  work.artifacts = [{
    artifact_id: 'local-session-intake',
    schema: 'VidaLocalSessionIntake/v1',
    path: intakePath,
    sha256: createHash('sha256').update(intakeBytes).digest('hex'),
    stage_id: 'intake',
    source_revision: taskScope.digest,
    scope_id: scope.scope_id,
    ac_ids: ['AC-1'],
  }];
  seed.nextLedger.tickets[0].contour_keys = ['tenant:local', 'project:local/' + projectId, 'file:src/task.ts'];
  configuredDatabase = openHostStateDatabase(sessionDatabasePath);
  const store = new HostStateStore(configuredDatabase, workspaceId, undefined, undefined, undefined, undefined, repositoryRoot);
  store.compareAndSwapHostState({ expectedWork: null, expectedLedger: null, nextWork: work, nextLedger: seed.nextLedger });
  const context = { work_id: workId, attempt: 1, scope_digest: taskScope.digest };
  let stage, actions, waveIndex = 0;
  for (; waveIndex < 12 && !actions; waveIndex++) {
    const candidate = sessionActionsForWave(config, { team: teamId, kind: 'task', intent: workflowId, project: projectId, risk_flags: packetRiskFlags, labels: [] }, context, workflowId, waveIndex, []);
    const prewriter = candidate.filter((action) => action.stage_id === 'review_source_prewrite');
    if (prewriter.length > 0) {
      stage = config.workflows[workflowId].stages.find((item) => item.id === 'review_source_prewrite');
      actions = prewriter;
    }
  }
  if (!stage || !actions || waveIndex === 12) throw new Error('Configured Source prewriter wave was not found.');
  const selection = { team: teamId, kind: 'task', intent: workflowId, project: projectId, risk_flags: packetRiskFlags, labels: [] };
  let synthesisAction;
  for (let synthWave = 0; synthWave < 12 && !synthesisAction; synthWave++)
    synthesisAction = sessionActionsForWave(config, selection, context, workflowId, synthWave, []).find(
      (action) => action.stage_id === 'synthesize_task',
    );
  if (!synthesisAction) throw new Error('Configured task synthesis wave was not found.');
  const requests = actions.map((action) =>
      buildSessionBridgeRequest({
        runId: work.execution.run_id,
        workflowId,
        configDigest: runtimeConfigDigest(config),
        context,
        waveIndex: action.wave_index,
        action,
        configuredContext: configuredContextForStage(repositoryRoot, config, workflowId, action.stage_id, context),
        priorResults: [],
      }),
    ),
    synthesisSummary = 'The admitted packet retains the exact task intent and current scope.',
    synthesisRequest = buildSessionBridgeRequest({
      runId: work.execution.run_id,
      workflowId,
      configDigest: runtimeConfigDigest(config),
      context,
      waveIndex: synthesisAction.wave_index,
      action: synthesisAction,
      configuredContext: configuredContextForStage(
        repositoryRoot,
        config,
        workflowId,
        synthesisAction.stage_id,
        context,
      ),
      priorResults: [],
    }),
    synthesisIssueId = 'prewriter-synthesis-issue-' + workId,
    initialJournal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: workId,
      attempt: 1,
      run_id: work.execution.run_id,
      step_id: stage.id,
      source_scope: taskScope,
      items: requests.map((request) => ({ request, issue_id: null, observation: null })),
      completed: [{
        step_id: synthesisAction.stage_id,
        items: [{
          request: synthesisRequest,
          issue_id: synthesisIssueId,
          observation: {
            schema: 'VidaSessionObservation/v1',
            action_id: synthesisRequest.action_id,
            issue_id: synthesisIssueId,
            agent_id: 'fixture:research-synthesizer',
            tool_call_ref: 'fixture:task-synthesis',
            status: 'reported_complete',
            summary: synthesisSummary,
            output_digest: canonicalJsonDigest(synthesisSummary),
            evidence_refs: [],
          },
        }],
      }],
    };
  configuredDatabase.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  configuredDatabase
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspaceId, workId, 1, 1, canonicalJson(initialJournal), canonicalJsonDigest(initialJournal));
  ledger = openConfiguredMastraSessionLedger(repositoryRoot);
  return {
    ...fixture,
    workId,
    threadId,
    workflowId,
    workIdentity,
    taskScope,
    ledger,
    store,
    close() {
      ledger.close();
      configuredDatabase.close();
      rmSync(repositoryRoot, { recursive: true, force: true });
    },
  };
}

function preparationRecord(fixture, action, kind, status = 'pass') {
  const observerId = 'fixture:' + action.role,
    mechanics =
      kind === 'source_plan'
        ? [
            { mechanic: 'scope_acceptance_trace', actual: 'Current scope and AC-1 trace to the acceptance manifest.', evidence_ref: 'source-plan.md' },
            { mechanic: 'verification_rollback', actual: 'The focused check and source restoration are identified.', evidence_ref: 'source-plan.md' },
          ]
        : [
            { mechanic: 'root_cause_owner', actual: 'The likely cause and owning component are recorded.', evidence_ref: 'security-review.md' },
            { mechanic: 'affected_callers', actual: 'Affected callers are listed.', evidence_ref: 'security-review.md' },
            { mechanic: 'existing_primitives', actual: 'Existing primitives are checked before changes.', evidence_ref: 'security-review.md' },
            { mechanic: 'prewriter_security_gate', actual: 'The proposed change is bounded to the current scope.', evidence_ref: 'security-review.md' },
          ];
  return {
    schema: 'LifecyclePreparationObservation/v1',
    record_id: 'report-' + action.action_id,
    kind,
    work_id: fixture.workId,
    attempt: 1,
    source_revision: fixture.taskScope.digest,
    scope_id: 'scope-' + fixture.workId,
    config_digest: runtimeConfigDigest(fixture.config),
    ac_ids: ['AC-1'],
    observed_at: '2026-10-07T00:00:00.000Z',
    observer_id: observerId,
    status,
    evidence_refs: [kind === 'source_plan' ? 'source-plan.md' : 'security-review.md'],
    observations:
      status === 'pass'
        ? mechanics
        : [
            {
              mechanic: kind === 'source_plan' ? 'scope_acceptance_trace' : 'root_cause_owner',
              actual: 'The available evidence identifies the remaining gap for this prerequisite.',
              evidence_ref: kind === 'source_plan' ? 'source-plan.md' : 'security-review.md',
            },
          ],
    gaps: status === 'pass' ? [] : ['The plan does not establish a safe verification and rollback path.'],
  };
}

function acceptedPreparationObservation(action, record, issueId) {
  const summary = canonicalJson(record),
    evidenceRefs = record.evidence_refs;
  return {
    schema: 'VidaSessionObservation/v1',
    action_id: action.action_id,
    issue_id: issueId,
    agent_id: record.observer_id,
    tool_call_ref: 'tool:' + action.action_id,
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: evidenceRefs,
  };
}

function verifyCurrent({ journal: currentJournal }) {
  return {
    source_authorization_sha256: 'c'.repeat(64),
    source_scope_digest: currentJournal.source_scope.digest,
  };
}

function prepare(candidate = request) {
  return store.prepareTaskSourceBindingOperation({ request: candidate, identity, verifyCurrent });
}

function inspect(candidate = request) {
  return store.inspectTaskSourceBindingOperation({ request: candidate, identity, verifyCurrent });
}

function setPolicyStore(policyVerifier) {
  store = new HostStateStore(
    database,
    workspace,
    undefined,
    undefined,
    undefined,
    undefined,
    root,
    undefined,
    { verify: policyVerifier },
  );
}

function allowTaskSourcePolicy({ request: policyRequest }) {
  return {
    operation_id: policyRequest.operation_id,
    request_id: policyRequest.request_id,
    operation_hash: policyRequest.operation_hash,
    prepared_record_cas: policyRequest.prepared_record_cas,
    authorization: { decision: 'allow', receipt: { decision: 'allow' } },
    edictum_operation: { operation_hash: policyRequest.operation_hash, tenant: 'tenant', project: 'agent' },
    edictum_evaluation: { action: 'pending_approval', events: [], records: [] },
    source_authorization_reference: { schema: 'LifecycleArtifactReference/v1', record_id: 'authorization-1' },
    source_authorization_sha256: 'c'.repeat(64),
    preflight_evidence_digest: 'd'.repeat(64),
  };
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'vida-task-source-operation-'));
  database = openHostStateDatabase(path.join(root, 'host.sqlite'));
  store = new HostStateStore(database, workspace);
  const seed = makeWorkAndLedger();
  initial = store.compareAndSwapHostState({
    expectedWork: seed.expectedWork,
    expectedLedger: seed.expectedLedger,
    nextWork: seed.nextWork,
    nextLedger: seed.nextLedger,
  });
  journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: initial.work.execution.run_id,
    step_id: null,
    source_scope: seed.sourceScope,
    items: [],
    completed: [],
  };
  database.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspace, identity.work_id, 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
  request = operationRequest();
});

afterEach(() => {
  database?.close();
  rmSync(root, { recursive: true, force: true });
});

test('prepare persists one typed Host operation and exact retries return its stored CAS payload', () => {
  const prepared = prepare();
  expect(prepared).toMatchObject({
    schema: 'TaskSourceBindingOperationResult/v1',
    status: 'prepared',
    operation_id: request.operation_id,
    request_id: request.request_id,
    operation: {
      schema: 'TaskSourceBindingOperation/v1',
      status: 'prepared',
      operation_id: request.operation_id,
      request_id: request.request_id,
      request,
      authority: {
        source_authorization_sha256: 'c'.repeat(64),
        source_scope_digest: journal.source_scope.digest,
      },
      revision: 1,
    },
    state_version: { revision: 1, digest: expect.any(String) },
  });
  expect(prepare()).toEqual(prepared);
  expect(inspect()).toMatchObject({
    schema: 'TaskSourceBindingOperationResult/v1',
    status: 'inspected',
    operation: prepared.operation,
    state_version: prepared.state_version,
  });
  expect(database.query('SELECT COUNT(*) AS count FROM agent_host_task_source_binding_operation').get().count).toBe(1);
});

test('Source mutation policy DTO is Host-computed from the prepared CAS, active lease and fixed Git action', () => {
  request = operationRequest({ source_root: path.join(root, 'task-source') });
  const prepared = prepare();
  const dto = createTaskSourceMutationPolicyRequest({
    repositoryRoot: root,
    operation: prepared.operation,
    preparedStateVersion: prepared.state_version,
    hostSnapshot: initial,
  });
  expect(dto).toMatchObject({
    schema: 'TaskSourceMutationPolicyRequest/v1',
    action: 'source.write',
    operation_id: request.operation_id,
    request_id: request.request_id,
    work_id: request.work_id,
    thread_id: request.thread_id,
    branch_ref: request.branch_ref,
    source_root: request.source_root,
    proposed_argv: ['git', '-C', root, 'worktree', 'add', '--branch', 'codex/task-source', request.source_root],
    prepared_record_cas: { operation_id: request.operation_id, state_version: prepared.state_version },
  });
  const { operation_hash, ...unsigned } = dto;
  expect(operation_hash).toBe(canonicalJsonDigest(unsigned));
  expect(() => createTaskSourceMutationPolicyRequest({
    repositoryRoot: root,
    operation: prepared.operation,
    preparedStateVersion: prepared.state_version,
    hostSnapshot: { ...initial, workVersion: { ...initial.workVersion, digest: 'd'.repeat(64) } },
  })).toThrow(/stale/);
});

test('source snapshots use only a current typed binding and preserve canonical-root behavior without one', () => {
  const taskRequest = operationRequest({ source_root: path.join(root, 'task-source') });
  const binding = createTaskSourceBinding({
    request: taskRequest,
    source_scope: journal.source_scope,
    canonical_host_common_dir: path.join(root, '.git'),
    git: {
      source_root: taskRequest.source_root,
      common_dir: path.join(root, '.git'),
      branch: 'codex/task-source',
      head: 'a'.repeat(40),
      cwd: taskRequest.source_root,
    },
  });
  expect(resolveTaskSourceFileRoot({
    canonicalHostRoot: root,
    binding,
    identity,
    attempt: 1,
    threadId: 'thread-1',
    configDigest: taskRequest.config_digest,
    projectContextDigest: taskRequest.project_context_digest,
    sourceScopeDigest: journal.source_scope.digest,
  })).toBe(taskRequest.source_root);
  expect(resolveTaskSourceFileRoot({
    canonicalHostRoot: root,
    binding: null,
    identity,
    attempt: 1,
    threadId: 'thread-1',
    configDigest: taskRequest.config_digest,
    projectContextDigest: taskRequest.project_context_digest,
    sourceScopeDigest: journal.source_scope.digest,
  })).toBe(root);
  expect(resolveCurrentTaskSourceFileRoot({
    store,
    host: initial,
    canonicalHostRoot: root,
    attempt: 1,
  })).toBe(root);
  expect(() => resolveTaskSourceFileRoot({
    canonicalHostRoot: root,
    binding,
    identity,
    attempt: 1,
    threadId: 'thread-1',
    configDigest: 'f'.repeat(64),
    projectContextDigest: taskRequest.project_context_digest,
    sourceScopeDigest: journal.source_scope.digest,
  })).toThrow(/differs from the admitted file context/);

  const calls = [];
  const sourceStore = {
    snapshotCurrentTaskSourceSources(...args) {
      calls.push(args);
      return journal.source_scope;
    },
  };
  expect(snapshotAdmittedTaskSources({
    store: sourceStore,
    host: initial,
    canonicalHostRoot: root,
    paths: ['src/task.ts'],
    attempt: 1,
  }))
    .toEqual(journal.source_scope);
  expect(calls).toEqual([[identity, 'thread-1', ['src/task.ts'], 1]]);
});

test('changed payload, stale Host CAS and foreign owner are denied without adding operation rows', () => {
  prepare();
  expect(() => prepare(operationRequest({ branch_ref: 'refs/heads/codex/changed' }))).toThrow(/retry changed/);
  const stale = operationRequest({
    operation_id: 'task-source-op-stale',
    request_id: 'task-source-request-stale',
    expected_host: {
      ...request.expected_host,
      work: { revision: request.expected_host.work.revision, digest: 'd'.repeat(64) },
    },
  });
  expect(() => prepare(stale)).toThrow(/compare-and-swap conflict/);
  const foreign = operationRequest({
    operation_id: 'task-source-op-foreign',
    request_id: 'task-source-request-foreign',
    thread_id: 'foreign-thread',
  });
  expect(() => prepare(foreign)).toThrow(/active Host owner/);
  expect(database.query('SELECT COUNT(*) AS count FROM agent_host_task_source_binding_operation').get().count).toBe(1);
});

test('inspection without the lazy table has no database effects and missing Host storage is rejected before creation', () => {
  const before = database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'").get();
  expect(before).toBeNull();
  expect(inspect()).toMatchObject({ status: 'not_found', operation: null, state_version: null });
  const after = database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'").get();
  expect(after).toBeNull();

  const missing = path.join(root, 'missing-host', 'session-handoff.v1.sqlite');
  expect(() => assertExistingTaskSourceHostDatabase(root, missing)).toThrow(/database is missing/);
  expect(existsSync(path.dirname(missing))).toBe(false);
  expect(existsSync(missing)).toBe(false);
});

test('missing Host work denies preparation before creating the operation table', () => {
  const emptyRoot = mkdtempSync(path.join(tmpdir(), 'vida-task-source-empty-'));
  const emptyDatabase = openHostStateDatabase(path.join(emptyRoot, 'empty.sqlite'));
  try {
    const emptyStore = new HostStateStore(emptyDatabase, workspace);
    expect(() =>
      emptyStore.prepareTaskSourceBindingOperation({
        request,
        identity,
        verifyCurrent,
      }),
    ).toThrow(/Host work is missing/);
    expect(
      emptyDatabase
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'")
        .get(),
    ).toBeNull();
  } finally {
    emptyDatabase.close();
    rmSync(emptyRoot, { recursive: true, force: true });
  }
});

test('create issue requires configured policy evidence and cannot replay its Git action after acknowledgement loss', async () => {
  request = operationRequest({ source_root: path.join(root, 'task-source') });
  let evaluations = 0;
  setPolicyStore(async (input) => {
    evaluations++;
    return allowTaskSourcePolicy(input);
  });
  prepare();
  const issued = await store.issueTaskSourceBindingOperation({ request, identity });
  expect(issued).toMatchObject({
    schema: 'TaskSourceBindingActionResult/v1',
    status: 'issued',
    command_argv: [['-C', root, 'worktree', 'add', '--branch', 'codex/task-source', request.source_root]],
    action: {
      schema: 'TaskSourceBindingAction/v1',
      status: 'issued',
      policy_decision: { authorization: { decision: 'allow' }, edictum_evaluation: { action: 'pending_approval' } },
    },
  });
  const retry = await store.issueTaskSourceBindingOperation({ request, identity });
  expect(retry).toMatchObject({ status: 'already_issued', command_argv: null, action: issued.action });
  expect(evaluations).toBe(1);
  expect(store.inspectTaskSourceBindingAction({ request, identity, verifyCurrent })).toMatchObject({
    status: 'issued', command_argv: null, action: issued.action,
  });
});

test.each(['issued', 'unknown', 'malformed_reported', 'reported_observed'])('policy denial occurs before Host issue and branch/source claims are unique (%s)', async (pendingStatus) => {
  request = operationRequest({ source_root: path.join(root, 'task-source') });
  setPolicyStore(async () => { throw new Error('configured Cedar or Edictum denied'); });
  prepare();
  await expect(store.issueTaskSourceBindingOperation({ request, identity })).rejects.toThrow(/denied/);
  expect(database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'").get()).toBeNull();

  setPolicyStore(async (input) => allowTaskSourcePolicy(input));
  const issued = await store.issueTaskSourceBindingOperation({ request, identity });
  if (pendingStatus === 'unknown') {
    store.reportTaskSourceBindingOperation({
      request, identity, expectedActionStateVersion: issued.state_version,
      report: {
        schema: 'TaskSourceBindingReport/v1', operation: request.operation,
        operation_id: request.operation_id, request_id: request.request_id,
        report_id: 'pending-task-source-unknown', expected_host: request.expected_host,
        status: 'unknown', binding: null, reason: 'The issued command outcome is unknown.',
      },
    });
  }
  if (pendingStatus === 'malformed_reported') {
    // Fault injection in the isolated fixture: a terminal label without a retained result.
    const malformed = { ...issued.action, status: 'reported', revision: issued.state_version.revision + 1 };
    database.query('UPDATE agent_host_task_source_binding_action SET revision=?,payload=?,digest=? WHERE workspace_id=? AND operation_id=?')
      .run(malformed.revision, canonicalJson(malformed), canonicalJsonDigest(malformed), workspace, request.operation_id);
  }
  let observedReport;
  if (pendingStatus === 'reported_observed') {
    mkdirSync(path.join(root, '.git'));
    mkdirSync(request.source_root, { recursive: true });
    const binding = createTaskSourceBinding({
      request,
      source_scope: journal.source_scope,
      canonical_host_common_dir: path.join(root, '.git'),
      git: {
        source_root: request.source_root,
        common_dir: path.join(root, '.git'),
        branch: 'codex/task-source',
        head: 'a'.repeat(40),
        cwd: request.source_root,
      },
    });
    observedReport = {
      schema: 'TaskSourceBindingReport/v1', operation: request.operation,
      operation_id: request.operation_id, request_id: request.request_id,
      report_id: 'pending-task-source-observed', expected_host: request.expected_host,
      status: 'observed', binding,
    };
    const reported = store.reportTaskSourceBindingOperation({
      request, identity, expectedActionStateVersion: issued.state_version, report: observedReport,
    });
    expect(store.reportTaskSourceBindingOperation({
      request, identity, expectedActionStateVersion: issued.state_version, report: observedReport,
    })).toEqual(reported);
  }
  const latestHost = store.readHostStateSnapshot(identity);
  const second = operationRequest({
    operation_id: 'task-source-op-2',
    request_id: 'task-source-request-2',
    branch_ref: 'refs/heads/codex/other',
    source_root: request.source_root,
    expected_host: {
      ...request.expected_host,
      work: latestHost.workVersion,
      ledger: latestHost.ledgerVersion,
      maintenance_generation: latestHost.maintenanceGeneration,
    },
  });
  prepare(second);
  const beforeDeniedIssue = store.readWorkspaceSnapshot();
  await expect(store.issueTaskSourceBindingOperation({ request: second, identity })).rejects.toThrow(
    pendingStatus === 'reported_observed'
      ? /already has a reported observed binding/
      : pendingStatus === 'malformed_reported'
        ? /^task source action status differs from its retained report pair$/
        : /already claimed|retained observed result/,
  );
  expect(store.readWorkspaceSnapshot()).toEqual(beforeDeniedIssue);
  expect(store.inspectTaskSourceBindingAction({ request: second, identity, verifyCurrent })).toMatchObject({ status: 'prepared' });
  expect(database.query('SELECT COUNT(*) AS count FROM agent_host_task_source_binding_action').get().count).toBe(1);
  expect(issued.status).toBe('issued');
  if (pendingStatus === 'malformed_reported') {
    await expect(store.issueTaskSourceBindingOperation({ request, identity })).rejects.toThrow(
      /^task source action status differs from its retained report pair$/,
    );
    expect(() => store.inspectTaskSourceBindingAction({ request, identity, verifyCurrent })).toThrow(
      /^task source action status differs from its retained report pair$/,
    );
    expect(store.readWorkspaceSnapshot()).toEqual(beforeDeniedIssue);
  } else {
    expect((await store.issueTaskSourceBindingOperation({ request, identity })).command_argv).toBeNull();
    expect(store.inspectTaskSourceBindingAction({ request, identity, verifyCurrent }).command_argv).toBeNull();
  }
});

test('unknown reports remain fenced and one late observed report can settle without reissuing', async () => {
  request = operationRequest({ source_root: path.join(root, 'task-source') });
  setPolicyStore(async (input) => allowTaskSourcePolicy(input));
  prepare();
  const issued = await store.issueTaskSourceBindingOperation({ request, identity });
  const unknown = {
    schema: 'TaskSourceBindingReport/v1',
    operation: request.operation,
    operation_id: request.operation_id,
    request_id: request.request_id,
    report_id: 'task-source-report-unknown',
    expected_host: request.expected_host,
    status: 'unknown',
    binding: null,
    reason: 'caller outcome was not retained',
  };
  const first = store.reportTaskSourceBindingOperation({
    request, identity, expectedActionStateVersion: issued.state_version, report: unknown,
  });
  expect(first.status).toBe('unknown');
  expect((await store.issueTaskSourceBindingOperation({ request, identity })).command_argv).toBeNull();
  const binding = createTaskSourceBinding({
    request,
    source_scope: journal.source_scope,
    canonical_host_common_dir: root,
    git: {
      source_root: request.source_root,
      common_dir: root,
      branch: 'codex/task-source',
      head: 'a'.repeat(40),
      cwd: request.source_root,
    },
  });
  const recovered = store.reportTaskSourceBindingOperation({
    request,
    identity,
    expectedActionStateVersion: first.state_version,
    report: {
      schema: 'TaskSourceBindingReport/v1',
      operation: request.operation,
      operation_id: request.operation_id,
      request_id: request.request_id,
      report_id: 'task-source-report-recovered',
      expected_host: request.expected_host,
      status: 'observed',
      binding,
    },
  });
  expect(recovered).toMatchObject({ status: 'reported', action: { report: unknown, recovery_report: { status: 'observed' } } });
  expect(store.reportTaskSourceBindingOperation({
    request, identity, expectedActionStateVersion: first.state_version,
    report: recovered.action.recovery_report,
  })).toEqual(recovered);
  expect((await store.issueTaskSourceBindingOperation({ request, identity })).command_argv).toBeNull();
});

test.each(['orphan_action', 'missing_preparation_table', 'missing_reserved_action'])('historical source reads retain the observed alternate tree and reject uncertain effects or foreign scope (%s)', async (fault) => {
  const historyRoot = mkdtempSync(path.join(tmpdir(), 'vida-historical-task-source-')),
    historyWorkspace = deriveWorkspaceId(identity.repository_id, historyRoot),
    historyDatabase = openHostStateDatabase(path.join(historyRoot, 'host.sqlite'));
  try {
    const alternate = path.join(historyRoot, 'task-tree');
    mkdirSync(path.join(historyRoot, '.git'));
    mkdirSync(path.join(historyRoot, 'src'));
    mkdirSync(path.join(alternate, 'src'), { recursive: true });
    writeFileSync(path.join(historyRoot, 'src/task.ts'), 'Original source.\n');
    writeFileSync(path.join(alternate, 'src/task.ts'), 'Original source.\n');
    const originalScope = snapshotDeclaredSources(requireSafeRepositoryAccess(historyRoot), ['src/task.ts']),
      historyStore = new HostStateStore(historyDatabase, historyWorkspace, undefined, undefined, undefined,
        undefined, historyRoot, undefined, { verify: async (policyInput) => allowTaskSourcePolicy(policyInput) }),
      seed = makeWorkAndLedger(identity, historyWorkspace, originalScope),
      originalHost = historyStore.compareAndSwapHostState({
        expectedWork: seed.expectedWork, expectedLedger: seed.expectedLedger,
        nextWork: seed.nextWork, nextLedger: seed.nextLedger,
      }),
      historyJournal = { ...journal, workspace_id: historyWorkspace, source_scope: originalScope };
    historyDatabase.exec('CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))');
    historyDatabase.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
      historyWorkspace, identity.work_id, 1, 1, canonicalJson(historyJournal), canonicalJsonDigest(historyJournal),
    );
    const historyRequest = operationRequest({
      operation_id: 'historical-source-op', request_id: 'historical-source-request',
      canonical_host_root: historyRoot, source_root: alternate,
      expected_host: { work: originalHost.workVersion, ledger: originalHost.ledgerVersion,
        journal: { attempt: 1, version: { revision: 1, digest: canonicalJsonDigest(historyJournal) } },
        maintenance_generation: originalHost.maintenanceGeneration },
    });
    historyStore.prepareTaskSourceBindingOperation({ request: historyRequest, identity,
      verifyCurrent: () => ({ source_authorization_sha256: 'c'.repeat(64), source_scope_digest: originalScope.digest }) });
    const issued = await historyStore.issueTaskSourceBindingOperation({ request: historyRequest, identity }),
      readInput = { identity, threadId: historyRequest.thread_id, attempt: 1,
        canonicalHostRoot: historyRoot, paths: ['src/task.ts'] };
    expect(() => historyStore.snapshotHistoricalTaskSourceSources(readInput)).toThrow(/issued or unknown/);
    const binding = createTaskSourceBinding({ request: historyRequest, source_scope: originalScope,
      canonical_host_common_dir: historyRoot,
      git: { source_root: alternate, common_dir: historyRoot, branch: 'codex/task-source',
        head: 'a'.repeat(40), cwd: alternate } });
    historyStore.reportTaskSourceBindingOperation({ request: historyRequest, identity,
      expectedActionStateVersion: issued.state_version,
      report: { schema: 'TaskSourceBindingReport/v1', operation: historyRequest.operation,
        operation_id: historyRequest.operation_id, request_id: historyRequest.request_id,
        report_id: 'historical-source-observed', expected_host: historyRequest.expected_host,
        status: 'observed', binding, reason: 'The fixture retains the observed source binding.' } });
    writeFileSync(path.join(historyRoot, 'src/task.ts'), 'Different canonical-root source.\n');
    writeFileSync(path.join(alternate, 'src/task.ts'), 'Observed alternate-tree postimage.\n');
    const before = historyStore.readWorkspaceSnapshot(),
      expected = snapshotDeclaredSources(requireSafeRepositoryAccess(alternate), ['src/task.ts']);
    expect(historyStore.snapshotHistoricalTaskSourceSources(readInput)).toEqual(expected);
    expect(() => historyStore.snapshotHistoricalTaskSourceSources({ ...readInput, threadId: 'foreign' })).toThrow(/owner/);
    expect(() => historyStore.snapshotHistoricalTaskSourceSources({ ...readInput, paths: ['src/extra.ts'] })).toThrow(/scope/);
    expect(historyStore.readWorkspaceSnapshot()).toEqual(before);
    if (fault === 'orphan_action') historyDatabase.query(
      'DELETE FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
    ).run(historyWorkspace, historyRequest.operation_id);
    else if (fault === 'missing_preparation_table') historyDatabase.exec('DROP TABLE agent_host_task_source_binding_operation');
    else historyDatabase.query(
      'DELETE FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
    ).run(historyWorkspace, historyRequest.operation_id);
    expect(() => historyStore.snapshotHistoricalTaskSourceSources(readInput)).toThrow(/orphan|preparation storage|effect record/);
    expect(historyStore.readWorkspaceSnapshot()).toEqual(before);
  } finally {
    historyDatabase.close();
    rmSync(historyRoot, { recursive: true, force: true });
  }
});

test('configured inspect and admitted packet/result read current TaskSource bytes while Host files stay unchanged', async () => {
  const fixture = makeConfiguredFixtureRoot(),
    hostRoot = fixture.repositoryRoot,
    config = fixture.config,
    project = fixture.project,
    projectId = project.project_ids[0],
    workId = 'task-source-integration-work',
    threadId = 'task-source-integration-thread',
    workflowId = 'task_execution',
    teamId = Object.keys(config.teams).find((id) => config.teams[id].enabled),
    taskRoot = path.join(hostRoot, '.tmp', 'task-source-tree'),
    hostSourcePath = path.join(hostRoot, 'src', 'task.ts'),
    taskSourcePath = path.join(taskRoot, 'src', 'task.ts'),
    databasePath = sessionHandoffDatabasePath(hostRoot, config);
  let configuredDatabase, sessionLedger;
  try {
    mkdirSync(path.dirname(hostSourcePath), { recursive: true });
    mkdirSync(path.dirname(taskSourcePath), { recursive: true });
    mkdirSync(path.dirname(databasePath), { recursive: true });
    mkdirSync(path.join(hostRoot, '.git'), { recursive: true });
    writeFileSync(hostSourcePath, 'Host source bytes stay here.\n');
    writeFileSync(taskSourcePath, 'TaskSource working bytes.\n');
    const hostBytesBefore = readFileSync(hostSourcePath),
      taskBytes = readFileSync(taskSourcePath),
      taskScope = snapshotDeclaredSources(requireSafeRepositoryAccess(taskRoot), ['src/task.ts']),
      hostScope = snapshotDeclaredSources(requireSafeRepositoryAccess(hostRoot), ['src/task.ts']),
      workIdentity = {
        repository_id: config.repository.repository_id,
        project_ids: [projectId],
        integrations_digest: project.integrations_digest,
        work_id: workId,
      },
      workspaceId = deriveWorkspaceId(config.repository.repository_id, hostRoot);
    expect(taskScope.digest).not.toBe(hostScope.digest);
    expect(taskBytes.toString('utf8')).not.toBe(hostBytesBefore.toString('utf8'));

    const workItem = {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'local',
      provider_type: 'Task',
      canonical_kind: 'task',
      intent: workflowId,
      project_id: projectId,
      title: 'Use the current TaskSource tree',
      description: 'Read and report only current TaskSource bytes.',
      risk_flags: ['high'],
      labels: [],
    };
    const selection = {
      team: teamId,
      kind: 'task',
      intent: workflowId,
      project: projectId,
      risk_flags: ['high'],
      labels: [],
    };
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'task-source-integration-scope',
      work_id: workId,
      source_revision: taskScope.digest,
      ac_ids: ['AC-1'],
      allowed_paths: ['src/task.ts'],
      implementation_paths: ['src/task.ts'],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: [],
      acceptance_trace: ['AC-1'],
      behavior_trace: ['Use the current TaskSource tree.'],
      test_trace: ['Assert the admitted fingerprint matches TaskSource bytes.'],
      diagnostic_trace: ['Compare TaskSource and canonical Host bytes.'],
      attribution: { thread_id: threadId, pointer: 'local:task-source-integration' },
      owner: 'task-source-integration-test',
      created_at: '2026-10-07T00:00:00.000Z',
    };
    const acceptance = {
      schema: 'AcceptanceManifest/v1',
      id: 'task-source-integration-acceptance',
      version: 1,
      ac_ids: ['AC-1'],
      source: 'local:task-source-integration',
      scope: scope.scope_id,
      source_revision: taskScope.digest,
      contracts: [
        {
          id: 'AC-1',
          definition: 'The admitted fingerprint matches TaskSource bytes.',
          sr: 'Read source only from the validated TaskSource root.',
          evidence: ['Focused integration regression.'],
        },
      ],
    };
    const scopeBytes = Buffer.from(JSON.stringify(scope)),
      acceptanceBytes = Buffer.from(JSON.stringify(acceptance)),
      scopePath = '.agent/scope.json',
      acceptancePath = '.agent/acceptance.json';
    mkdirSync(path.join(hostRoot, '.agent'), { recursive: true });
    writeFileSync(path.join(hostRoot, scopePath), scopeBytes);
    writeFileSync(path.join(hostRoot, acceptancePath), acceptanceBytes);

    const writerStage = config.workflows[workflowId].stages.find((stage) => stage.kind === 'develop'),
      writerAssignment = writerStage?.assignments[0];
    expect(writerStage).toBeDefined();
    expect(writerAssignment).toBeDefined();
    const authorization = {
      schema: 'LocalSourceWriteAuthorization/v1',
      action: 'source.write',
      user_instruction_ref: 'task-source-integration-authorization',
      work_id: workId,
      attempt: 1,
      scope_digest: taskScope.digest,
      config_digest: runtimeConfigDigest(config),
      workflow_id: workflowId,
      stage_ids: [writerStage.id],
      implementation_paths: ['src/task.ts'],
      native_session_handle: threadId,
    };
    const authorizationPath = '.agent/work/task-source-authorization.json',
      authorizationBytes = Buffer.from(JSON.stringify(authorization));
    mkdirSync(path.dirname(path.join(hostRoot, authorizationPath)), { recursive: true });
    writeFileSync(path.join(hostRoot, authorizationPath), authorizationBytes);
    const authorizationReference = {
      schema: 'LifecycleArtifactReference/v1',
      kind: 'execution_approval',
      artifact_schema: authorization.schema,
      record_id: authorization.user_instruction_ref,
      path: authorizationPath,
      sha256: createHash('sha256').update(authorizationBytes).digest('hex'),
      source_revision: taskScope.digest,
      scope_id: scope.scope_id,
      ac_ids: ['AC-1'],
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: 'local-session:' + canonicalJsonDigest(threadId),
      decision: 'approved',
      disposition: 'current',
    };

    const seed = makeWorkAndLedger(workIdentity, workspaceId, taskScope),
      work = seed.nextWork;
    work.lease.thread_id = threadId;
    seed.nextLedger.tickets[0].thread_id = threadId;
    seed.nextLedger.claims[0].thread_id = threadId;
    Object.assign(work.binding, {
      team_id: teamId,
      workflow_id: workflowId,
      provider_work_item_id: workId,
      work_item_digest: canonicalJsonDigest(workItem),
      scope_id: scope.scope_id,
      scope_contract_digest: createHash('sha256').update(scopeBytes).digest('hex'),
      acceptance_manifest_digest: createHash('sha256').update(acceptanceBytes).digest('hex'),
      ac_ids: ['AC-1'],
      implementation_paths: ['src/task.ts'],
      allowed_resources: ['execution:' + workId, 'file:src/task.ts'],
      config_digest: runtimeConfigDigest(config),
    });
    Object.assign(work.contracts.scope, {
      schema: scope.schema,
      path: scopePath,
      sha256: work.binding.scope_contract_digest,
    });
    Object.assign(work.contracts.acceptance, {
      schema: acceptance.schema,
      path: acceptancePath,
      sha256: work.binding.acceptance_manifest_digest,
    });
    work.execution.run_id = 'task-source-integration-run';
    Object.assign(work.lifecycle, {
      phase: 'INTAKE',
      source_revision: taskScope.digest,
      config_binding: {
        config_digest: work.binding.config_digest,
        schema_digest: work.binding.schema_digest,
        runtime_code_digest: work.binding.runtime_code_digest,
      },
      scope: {
        scope_id: scope.scope_id,
        allowed_paths: ['src/task.ts'],
        fingerprint_paths: ['src/task.ts'],
        implementation_paths: ['src/task.ts'],
        documentation_paths: [],
      },
      references: [authorizationReference],
    });
    seed.nextLedger.tickets[0].contour_keys = ['tenant:local', 'project:local/' + projectId, 'file:src/task.ts'];
    configuredDatabase = openHostStateDatabase(databasePath);
    const configuredStore = new HostStateStore(
      configuredDatabase,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      hostRoot,
      undefined,
      {
        verify: async (input) => ({
          ...allowTaskSourcePolicy(input),
          source_authorization_sha256: authorizationReference.sha256,
        }),
      },
    );
    const hostBefore = configuredStore.compareAndSwapHostState({
      expectedWork: null,
      expectedLedger: null,
      nextWork: work,
      nextLedger: seed.nextLedger,
    });
    const journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: workId,
      attempt: 1,
      run_id: work.execution.run_id,
      step_id: config.workflows[workflowId].stages.find((stage) => stage.id !== writerStage.id)?.id ?? null,
      source_scope: taskScope,
      items: [],
      completed: [],
    };
    configuredDatabase.exec(
      'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
    );
    configuredDatabase
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(workspaceId, workId, 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
    const expectedHost = {
      work: hostBefore.workVersion,
      ledger: hostBefore.ledgerVersion,
      journal: { attempt: 1, version: { revision: 1, digest: canonicalJsonDigest(journal) } },
      maintenance_generation: hostBefore.maintenanceGeneration,
    };
    const sourceRequest = {
      schema: 'TaskSourceBindingRequest/v1',
      operation: 'propose-create',
      operation_id: 'task-source-integration-operation',
      request_id: 'task-source-integration-request',
      branch_ref: 'refs/heads/codex/task-source-integration',
      expected_host: expectedHost,
      canonical_host_root: hostRoot,
      source_root: taskRoot,
      work_id: workId,
      attempt: 1,
      thread_id: threadId,
      repository_id: config.repository.repository_id,
      project_ids: [projectId],
      config_digest: runtimeConfigDigest(config),
      project_context_digest: project.project_context_digest,
    };
    const requestPath = '.agent/work/task-source-request.json';
    writeFileSync(path.join(hostRoot, requestPath), JSON.stringify(sourceRequest));
    configuredStore.prepareTaskSourceBindingOperation({
      request: sourceRequest,
      identity: workIdentity,
      verifyCurrent: ({ journal: currentJournal }) => ({
        source_authorization_sha256: authorizationReference.sha256,
        source_scope_digest: currentJournal.source_scope.digest,
      }),
    });
    const issued = await configuredStore.issueTaskSourceBindingOperation({ request: sourceRequest, identity: workIdentity });
    const binding = createTaskSourceBinding({
      request: sourceRequest,
      source_scope: taskScope,
      canonical_host_common_dir: path.join(hostRoot, '.git'),
      git: {
        source_root: taskRoot,
        common_dir: path.join(hostRoot, '.git'),
        branch: 'codex/task-source-integration',
        head: 'b'.repeat(40),
        cwd: taskRoot,
      },
    });
    configuredStore.reportTaskSourceBindingOperation({
      request: sourceRequest,
      identity: workIdentity,
      expectedActionStateVersion: issued.state_version,
      report: {
        schema: 'TaskSourceBindingReport/v1',
        operation: sourceRequest.operation,
        operation_id: sourceRequest.operation_id,
        request_id: sourceRequest.request_id,
        report_id: 'task-source-integration-report',
        expected_host: expectedHost,
        status: 'observed',
        binding,
      },
    });
    const inspected = await executeTaskSourceBindingOperation({
      repositoryRoot: hostRoot,
      mode: 'inspect',
      requestPath,
    });
    expect(inspected.source_execution_context).toMatchObject({
      schema: 'SourceExecutionContext/v1',
      canonical_host_root: hostRoot,
      source_root: taskRoot,
      cwd: taskRoot,
      binding_ref: {
        operation_id: sourceRequest.operation_id,
        request_id: sourceRequest.request_id,
        work_id: workId,
        attempt: 1,
        thread_id: threadId,
        source_scope_digest: taskScope.digest,
      },
    });
    const contextBytes = requireSafeRepositoryAccess(inspected.source_execution_context.cwd).readBytes(
      'src/task.ts',
      'test SourceExecutionContext consumer',
    );
    expect(contextBytes).toEqual(taskBytes);

    const currentHost = configuredStore.readHostStateSnapshot(workIdentity),
      synthStage = config.workflows[workflowId].stages.find((stage) =>
        stage.produces.includes('DevelopmentTaskPacket/v1'),
      );
    expect(synthStage).toBeDefined();
    const summary = 'Use only the validated TaskSource root for source reads.',
      synthAction = 'task-source-synthesis-action',
      synthItem = {
        request: {
          stage_id: synthStage.id,
          workflow_id: workflowId,
          scope_digest: taskScope.digest,
          config_digest: runtimeConfigDigest(config),
          action_id: synthAction,
        },
        issue_id: 'task-source-synthesis-issue',
        observation: {
          issue_id: 'task-source-synthesis-issue',
          action_id: synthAction,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
        },
      },
      packetJournal = { ...journal, completed: [{ step_id: synthStage.id, items: [synthItem] }] },
      packetLedger = {
        version: { revision: 2, digest: canonicalJsonDigest(packetJournal) },
        state: packetJournal,
        resume_status: 'ready',
      },
      packet = buildAdmittedDevelopmentPacket({
        repositoryRoot: hostRoot,
        config,
        host: currentHost,
        sourceStore: configuredStore,
        ledger: packetLedger,
        workItem,
        selection,
        scopeBytes,
        acceptanceBytes,
        configuredContext: null,
      });
    expect(packet.code_evidence_refs).toContain('src/task.ts');

    let developer;
    for (let waveIndex = 0; waveIndex < 10 && !developer; waveIndex++) {
      const action = sessionActionsForWave(
        config,
        selection,
        { work_id: workId, attempt: 1, scope_digest: taskScope.digest },
        workflowId,
        waveIndex,
        [],
      ).find((entry) => entry.stage_kind === 'develop');
      if (action) developer = { ...action, config_digest: runtimeConfigDigest(config), workflow_id: workflowId };
    }
    expect(developer).toBeDefined();
    const attemptId = 'task-source-writer-attempt',
      developerObservation = {
        issue_id: 'task-source-developer-issue',
        action_id: developer.action_id,
        status: 'reported_complete',
        summary: 'Wrote the admitted TaskSource file.',
        output_digest: canonicalJsonDigest('Wrote the admitted TaskSource file.'),
        host_attempt_id: attemptId,
        changed_paths: ['src/task.ts'],
      },
      developerItem = {
        request: { ...developer, scope_digest: taskScope.digest },
        issue_id: developerObservation.issue_id,
        observation: developerObservation,
        host_reservation: { receipt: { attempt: { attempt_id: attemptId } } },
      },
      finalJournal = {
        ...packetJournal,
        completed: [...packetJournal.completed, { step_id: developer.stage_id, items: [developerItem] }],
      },
      finalLedger = {
        version: { revision: 3, digest: canonicalJsonDigest(finalJournal) },
        state: finalJournal,
        resume_status: 'ready',
      },
      resultHost = {
        ...currentHost,
        work: {
          ...currentHost.work,
          execution: {
            ...currentHost.work.execution,
            assignment_attempts: [{
              attempt_id: attemptId,
              status: 'completed',
              result_digest: canonicalJsonDigest(developerObservation),
              stage_id: developer.stage_id,
              assignment_index: developer.assignment_index,
            }],
          },
        },
      },
      result = buildAdmittedImplementationResult({
        repositoryRoot: hostRoot,
        config,
        packet,
        host: resultHost,
        sourceStore: configuredStore,
        ledger: finalLedger,
      });
    expect(result.implementation_fingerprint).toBe(taskScope.digest);
    expect(result.implementation_fingerprint).not.toBe(hostScope.digest);
    expect(readFileSync(hostSourcePath)).toEqual(hostBytesBefore);

    sessionLedger = openConfiguredMastraSessionLedger(hostRoot);
    const writerContext = { work_id: workId, attempt: 1, scope_digest: taskScope.digest },
      writerRequest = buildSessionBridgeRequest({
        runId: work.execution.run_id,
        workflowId,
        configDigest: runtimeConfigDigest(config),
        context: writerContext,
        waveIndex: developer.wave_index,
        action: developer,
        configuredContext: configuredContextForStage(hostRoot, config, workflowId, developer.stage_id, writerContext),
        priorResults: [],
      });
    const preparedWriter = sessionLedger.sync(
      workId,
      1,
      work.execution.run_id,
      developer.stage_id,
      [writerRequest],
      taskScope,
    );
    const writerHost = configuredStore.readHostStateSnapshot(workIdentity),
      writerReceipt = configuredStore.claimWorkflowAttempt({
        identity: workIdentity,
        expectedWork: writerHost.workVersion,
        expectedLedger: writerHost.ledgerVersion,
        stageId: developer.stage_id,
        assignmentIndex: developer.assignment_index,
        requestDigest: canonicalJsonDigest(writerRequest),
        lease: writerHost.work.lease,
      }),
      reservation = {
        schema: 'WorkflowSessionReservation/v1',
        request: {
          workItemId: workId,
          stageId: developer.stage_id,
          assignmentIndex: developer.assignment_index,
        },
        invocation: {},
        receipt: writerReceipt,
        requestDigest: writerReceipt.attempt.request_digest,
        approvalAction: 'source.write',
        authorization: null,
      },
      issuedWriter = sessionLedger.issueWave(workId, 1, preparedWriter.version, {
        [writerRequest.action_id]: reservation,
      });
    writeFileSync(taskSourcePath, 'Authorized writer postimage.\n');
    const updatedScope = snapshotDeclaredSources(requireSafeRepositoryAccess(taskRoot), ['src/task.ts']),
      writerSummary = 'Wrote the authorized TaskSource file.',
      writerObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: writerRequest.action_id,
        issue_id: issuedWriter.state.items[0].issue_id,
        agent_id: 'fixture:task-source-writer',
        tool_call_ref: 'fixture:task-source-writer-call',
        status: 'reported_complete',
        summary: writerSummary,
        output_digest: canonicalJsonDigest(writerSummary),
        evidence_refs: [],
        host_attempt_id: writerReceipt.attempt.attempt_id,
        changed_paths: ['src/task.ts'],
      };
    configuredStore.completeWorkflowAttempt(writerReceipt, writerObservation);
    const nextWriterJournal = {
      ...issuedWriter.state,
      source_scope: updatedScope,
      items: issuedWriter.state.items.map((item) => ({ ...item, observation: writerObservation })),
    };
    configuredStore.commitCompletedSourceReport({
      identity: workIdentity,
      attempt: 1,
      expectedJournal: issuedWriter.version,
      actionId: writerRequest.action_id,
      nextJournal: nextWriterJournal,
      verifyCurrent: () => {
        expect(snapshotDeclaredSources(requireSafeRepositoryAccess(taskRoot), ['src/task.ts']).digest)
          .toBe(updatedScope.digest);
      },
    });
    expect(configuredStore.readHostStateSnapshot(workIdentity).work.binding.work_source_revision).toBe(taskScope.digest);
    expect(configuredStore.readCurrentTaskSourceBinding(workIdentity, threadId, 1)).toMatchObject({
      source_root: taskRoot,
      source_scope: { digest: taskScope.digest },
    });
    expect(configuredStore.snapshotCurrentTaskSourceSources(workIdentity, threadId, ['src/task.ts'], 1))
      .toEqual(updatedScope);
    const actionRow = configuredDatabase.query(
      'SELECT operation_id,request_id,revision,payload,digest FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
    ).get(workspaceId, sourceRequest.operation_id);
    const malformedAction = JSON.parse(actionRow.payload);
    malformedAction.prepared_state_version = {
      ...malformedAction.prepared_state_version,
      digest: '0'.repeat(64),
    };
    const malformedPayload = canonicalJson(malformedAction),
      malformedDigest = canonicalJsonDigest(malformedAction);
    configuredDatabase.query(
      'UPDATE agent_host_task_source_binding_action SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
    ).run(malformedPayload, malformedDigest, workspaceId, sourceRequest.operation_id);
    expect(() => configuredStore.readCurrentTaskSourceBinding(workIdentity, threadId, 1))
      .toThrow(/action\/preparation/);
    expect(() => configuredStore.inspectTaskSourceBindingAction({
      request: sourceRequest,
      identity: workIdentity,
      verifyCurrent: () => ({
        source_authorization_sha256: authorizationReference.sha256,
        source_scope_digest: taskScope.digest,
      }),
    })).toThrow(/action\/preparation/);
    expect(() => configuredStore.reportTaskSourceBindingOperation({
      request: sourceRequest,
      identity: workIdentity,
      expectedActionStateVersion: { revision: actionRow.revision, digest: malformedDigest },
      report: malformedAction.report,
    })).toThrow(/action\/preparation/);
  } finally {
    sessionLedger?.close();
    configuredDatabase?.close();
    if (path.basename(hostRoot).startsWith('vida-task-source-real-host-') && path.dirname(hostRoot) === tmpdir())
      rmSync(hostRoot, { recursive: true, force: true });
  }
});

test('real Host reports attach the source plan and high-risk policy in either report order with exact retry', async () => {
  for (const reportOrder of [
    ['source-planner', 'security-prewriter'],
    ['security-prewriter', 'source-planner'],
  ]) {
    const fixture = makePrewriterHostFixture();
    try {
      let journal = fixture.ledger.resume(fixture.workId, 1);
      const issued = fixture.ledger.issueWave(fixture.workId, 1, journal.version),
        items = new Map(issued.state.items.map((item) => [item.request.role, item]));
      journal = issued;
      expect([...items.keys()].sort()).toEqual(['security-prewriter', 'source-planner']);
      let planObservation;
      for (const role of reportOrder) {
        const item = items.get(role),
          kind = role === 'source-planner' ? 'source_plan' : 'implementation_policy',
          record = preparationRecord(fixture, item.request, kind),
          observation = acceptedPreparationObservation(item.request, record, item.issue_id);
        if (role === 'source-planner') planObservation = observation;
        journal = fixture.ledger.report(fixture.workId, 1, journal.version, observation, fixture.taskScope);
        const host = fixture.store.readHostStateSnapshot(fixture.workIdentity),
          currentPlans = host.work.lifecycle.references.filter(
            (reference) => reference.kind === 'source_plan' && reference.disposition === 'current',
          ),
          currentPolicies = host.work.lifecycle.references.filter(
            (reference) => reference.kind === 'implementation_policy' && reference.disposition === 'current',
          );
        if (role === 'security-prewriter' && reportOrder[0] === 'security-prewriter') {
          expect(host.work.lifecycle.phase).toBe('INTAKE');
          expect(currentPlans).toHaveLength(0);
          expect(currentPolicies).toHaveLength(0);
        } else if (role === 'source-planner' && reportOrder[0] === 'source-planner') {
          expect(host.work.lifecycle.phase).toBe('PLAN');
          expect(currentPlans).toHaveLength(1);
          expect(currentPolicies).toHaveLength(0);
        } else if (role === 'source-planner') {
          expect(host.work.lifecycle.phase).toBe('PLAN');
          expect(currentPlans).toHaveLength(1);
          expect(currentPolicies).toHaveLength(1);
        }
      }
      const retry = fixture.ledger.report(
        fixture.workId,
        1,
        issued.version,
        planObservation,
        fixture.taskScope,
      );
      const afterRetry = fixture.store.readHostStateSnapshot(fixture.workIdentity);
      expect(retry.version).toEqual(journal.version);
      expect(afterRetry.work.lifecycle.phase).toBe('PLAN');
      expect(afterRetry.work.lifecycle.references.filter((reference) => reference.kind === 'source_plan')).toHaveLength(1);
      expect(afterRetry.work.lifecycle.references.filter((reference) => reference.kind === 'implementation_policy')).toHaveLength(1);
    } finally {
      fixture.close();
    }
  }
});

test('low lifecycle risk still attaches security policy when the admitted packet has the high flag', async () => {
  const fixture = makePrewriterHostFixture({ lifecycleRisk: 'low', packetRiskFlags: ['high'] });
  try {
    const journal = fixture.ledger.resume(fixture.workId, 1),
      issued = fixture.ledger.issueWave(fixture.workId, 1, journal.version),
      items = new Map(issued.state.items.map((item) => [item.request.role, item]));
    expect([...items.keys()].sort()).toEqual(['security-prewriter', 'source-planner']);
    let current = issued;
    for (const role of ['source-planner', 'security-prewriter']) {
      const item = items.get(role),
        kind = role === 'source-planner' ? 'source_plan' : 'implementation_policy',
        record = preparationRecord(fixture, item.request, kind),
        observation = acceptedPreparationObservation(item.request, record, item.issue_id);
      current = fixture.ledger.report(fixture.workId, 1, current.version, observation, fixture.taskScope);
    }
    const host = fixture.store.readHostStateSnapshot(fixture.workIdentity),
      policies = host.work.lifecycle.references.filter(
        (reference) => reference.kind === 'implementation_policy' && reference.disposition === 'current',
      );
    expect(host.work.lifecycle.risk).toBe('low');
    expect(policies).toHaveLength(1);
    expect(JSON.parse(readFileSync(path.join(fixture.repositoryRoot, policies[0].path), 'utf8'))).toMatchObject({
      kind: 'implementation_policy',
      status: 'pass',
      observer_id: 'fixture:security-prewriter',
    });
  } finally {
    fixture.close();
  }
});

test('public run awaits configured TaskSource policy and serializes the persisted Host issue result', async () => {
  const fixture = makePrewriterHostFixture({ includeSourceAuthorization: true });
  try {
    const journal = fixture.ledger.resume(fixture.workId, 1),
      issuedPrewriter = fixture.ledger.issueWave(fixture.workId, 1, journal.version);
    let currentJournal = issuedPrewriter;
    for (const role of ['source-planner', 'security-prewriter']) {
      const item = issuedPrewriter.state.items.find((entry) => entry.request.role === role),
        kind = role === 'source-planner' ? 'source_plan' : 'implementation_policy',
        record = preparationRecord(fixture, item.request, kind),
        observation = acceptedPreparationObservation(item.request, record, item.issue_id);
      currentJournal = fixture.ledger.report(
        fixture.workId,
        1,
        currentJournal.version,
        observation,
        fixture.taskScope,
      );
    }

    const { repositoryRoot, config, project, workIdentity, workId, threadId } = fixture,
      workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
      initializationPath = path.join(repositoryRoot, '.agent', 'runtime-initialization.v1.json'),
      initializationSchema = runtimePackageAccess().readBytes(
        'schemas/runtime-initialization.v1.schema.json',
        'TaskSource public run initialization schema',
      ),
      initialization = {
        schema: 'RuntimeInitialization/v1',
        version: 1,
        repository_id: config.repository.repository_id,
        project_ids: project.project_ids,
        integrations_digest: canonicalJsonDigest(config.integrations),
        workspace_id: workspaceId,
        workspace_binding_status: 'pending',
        bundle: config.runtime.bundle,
        config_digest: runtimeConfigDigest(config),
        schema_sha256: createHash('sha256').update(initializationSchema).digest('hex'),
        templates: [],
        created_at: new Date().toISOString(),
      },
      host = fixture.store.readHostStateSnapshot(workIdentity),
      sourceRoot = path.join(repositoryRoot, '.tmp', 'task-source-public-issue-' + workId),
      branchRef = 'refs/heads/codex/task-source-public-' + workId,
      requestPath = `.agent/work/${workId}/task-source-binding-request.json`,
      request = {
        schema: 'TaskSourceBindingRequest/v1',
        operation: 'propose-create',
        operation_id: 'task-source-public-operation-' + workId,
        request_id: 'task-source-public-request-' + workId,
        branch_ref: branchRef,
        source_root: sourceRoot,
        expected_host: {
          work: host.workVersion,
          ledger: host.ledgerVersion,
          journal: { attempt: 1, version: currentJournal.version },
          maintenance_generation: host.maintenanceGeneration,
        },
        work_id: workId,
        attempt: 1,
        thread_id: threadId,
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        canonical_host_root: repositoryRoot,
        config_digest: runtimeConfigDigest(config),
        project_context_digest: project.project_context_digest,
      };
    mkdirSync(path.dirname(initializationPath), { recursive: true });
    writeFileSync(initializationPath, canonicalJson(initialization));
    mkdirSync(path.dirname(path.join(repositoryRoot, requestPath)), { recursive: true });
    writeFileSync(path.join(repositoryRoot, requestPath), canonicalJson(request));

    const prepared = await run([
        '--project-root', repositoryRoot,
        '--task-source-operation', 'prepare',
        '--task-source-request', requestPath,
      ]),
      issued = await run([
        '--project-root', repositoryRoot,
        '--task-source-operation', 'issue',
        '--task-source-request', requestPath,
      ]),
      wire = JSON.parse(JSON.stringify(issued));
    expect(prepared.status).toBe('task_source_prepare');
    expect(prepared.operation).toMatchObject({
      schema: 'TaskSourceBindingOperationResult/v1',
      status: 'prepared',
      operation: { schema: 'TaskSourceBindingOperation/v1', status: 'prepared' },
    });
    expect(wire).toMatchObject({
      schema: 'VidaAgentRunResult/v1',
      status: 'task_source_issue',
      operation: {
        schema: 'TaskSourceBindingActionResult/v1',
        status: 'issued',
        command_argv: [[
          '-C', repositoryRoot, 'worktree', 'add', '--branch', branchRef.slice('refs/heads/'.length), sourceRoot,
        ]],
        action: {
          schema: 'TaskSourceBindingAction/v1',
          status: 'issued',
          policy_decision: {
            authorization: { decision: 'allow' },
            edictum_evaluation: { action: 'pending_approval' },
          },
        },
      },
    });
    expect(typeof wire.operation.action.issue_id).toBe('string');
    expect(fixture.ledger.resume(workId, 1).version).toEqual(currentJournal.version);
  } finally {
    fixture.close();
  }
});

test('a reported GAP source plan is retained in TRACE and does not advance lifecycle or attach policy', async () => {
  const fixture = makePrewriterHostFixture();
  try {
    const journal = fixture.ledger.resume(fixture.workId, 1),
      issued = fixture.ledger.issueWave(fixture.workId, 1, journal.version),
      planner = issued.state.items.find((item) => item.request.role === 'source-planner');
    const gapRecord = preparationRecord(fixture, planner.request, 'source_plan', 'gap'),
      observation = acceptedPreparationObservation(planner.request, gapRecord, planner.issue_id),
      reported = fixture.ledger.report(fixture.workId, 1, issued.version, observation, fixture.taskScope),
      host = fixture.store.readHostStateSnapshot(fixture.workIdentity),
      reference = host.work.lifecycle.references.find((entry) => entry.kind === 'source_plan');
    expect(reported.state.items.find((item) => item.request.role === 'source-planner').observation).toEqual(observation);
    expect(host.work.lifecycle.phase).toBe('TRACE');
    expect(reference).toMatchObject({ kind: 'source_plan', disposition: 'current' });
    expect(JSON.parse(readFileSync(path.join(fixture.repositoryRoot, reference.path), 'utf8'))).toMatchObject({
      kind: 'source_plan',
      status: 'gap',
      gaps: ['The plan does not establish a safe verification and rollback path.'],
    });
    expect(host.work.lifecycle.references.filter((entry) => entry.kind === 'implementation_policy')).toHaveLength(0);
  } finally {
    fixture.close();
  }
});
