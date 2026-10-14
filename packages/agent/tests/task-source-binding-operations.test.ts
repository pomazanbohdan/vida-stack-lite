import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Database, type Changes, type SQLQueryBindings } from 'bun:sqlite';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertWorkspaceDatabaseAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openAdmittedWorkspaceDatabase,
} from '../src/config/storage-read-admission.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../src/config/workspace-database-raw.ts';
import {
  HostStateStore,
  initializeTaskSourceBindingWorkProjectionSchema,
  openHostStateDatabase,
  type CoordinationLedger,
  type HostStateSnapshot,
  type StateVersion,
  type TaskSourceMutationPolicyVerifier,
  type WorkIdentity,
  type WorkState,
  type AssignmentAttempt,
} from '../src/host-state.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  readRuntimePackageResourceBytes,
  runtimePackageCodePaths,
  type WorkItemSelection,
} from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  assertExistingTaskSourceHostDatabase,
  createTaskSourceMutationPolicyRequest,
  executeTaskSourceBindingOperation,
} from '../src/orchestration/task-source-binding-operations.ts';
import {
  createTaskSourceBinding,
  resolveCurrentTaskSourceFileRoot,
  resolveTaskSourceFileRoot,
  type TaskSourceBindingRequest,
  type TaskSourceBindingReport,
} from '../src/orchestration/task-source-binding.ts';
import {
  snapshotAdmittedTaskSources,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
  type ScopedSourceSnapshot,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { buildAdmittedDevelopmentPacket } from '../src/orchestration/admitted-development-packet.ts';
import { buildAdmittedImplementationResult } from '../src/orchestration/admitted-implementation-result.ts';
import type { LocalWorkAdmissionInput } from '../src/orchestration/local-work-admission.ts';
import { sessionActionsForWave, type SessionAgentAction } from '../src/orchestration/session-handoff.ts';
import {
  openConfiguredMastraSessionLedger,
  sessionHandoffDatabasePath,
  type MastraLedgerItem,
  type MastraSessionLedgerSnapshot,
  type MastraSessionLedgerState,
} from '../src/orchestration/persistent-session-handoff.ts';
import type {
  TrustedWorkflowAssignment,
  WorkflowAssignmentRequest,
  WorkflowSessionReservation,
  WorkExecutionContext,
} from '../src/runtime-kernel.ts';
import { workflowWorkItemSchema } from '../src/orchestration/workflow-session-reservation-contract.ts';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
  type SessionBridgeObservation,
} from '../src/orchestration/mastra-session-bridge.ts';
import { run } from '../bin/run.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.ts';

const workspace = 'a'.repeat(64);
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const identity: WorkIdentity = {
  repository_id: 'vida-agent',
  project_ids: ['agent'],
  integrations_digest: '1'.repeat(64),
  work_id: 'work-1',
};
let root!: string;
let database!: Database;
let store!: HostStateStore;
type FixtureHostSnapshot = HostStateSnapshot & {
  readonly work: WorkState;
  readonly ledger: CoordinationLedger;
  readonly workVersion: StateVersion;
  readonly ledgerVersion: StateVersion;
};
type FixtureJournal = MastraSessionLedgerState & { readonly source_scope: ScopedSourceSnapshot };
function requireFixtureHostSnapshot(snapshot: HostStateSnapshot): FixtureHostSnapshot {
  assert.ok(snapshot.work && snapshot.ledger && snapshot.workVersion && snapshot.ledgerVersion);
  return {
    maintenanceGeneration: snapshot.maintenanceGeneration,
    work: snapshot.work,
    ledger: snapshot.ledger,
    workVersion: snapshot.workVersion,
    ledgerVersion: snapshot.ledgerVersion,
  };
}
function openFixtureDatabase(repositoryRoot: string, databasePath: string, workspaceId: string): Database {
  const databaseRelativePath = path.relative(repositoryRoot, databasePath);
  assert.ok(databaseRelativePath && !path.isAbsolute(databaseRelativePath));
  return openHostStateDatabase(repositoryRoot, databaseRelativePath, workspaceId);
}
interface ActionRow {
  readonly operation_id: string;
  readonly request_id: string;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
}
let initial!: FixtureHostSnapshot;
let journal!: FixtureJournal;
let request!: TaskSourceBindingRequest;

function makeWorkAndLedger(
  workIdentity: WorkIdentity = identity,
  selectedWorkspace = workspace,
  sourceScopeOverride?: ScopedSourceSnapshot,
) {
  const resource = 'file:src/task.ts';
  const scopeBody: Omit<ScopedSourceSnapshot, 'digest'> = {
    schema: 'ScopedSourceSnapshot/v1',
    entries: [{ path: 'src/task.ts', exists: true, bytes: 3, sha256: '2'.repeat(64) }],
  };
  const sourceScope: ScopedSourceSnapshot = sourceScopeOverride ?? {
    ...scopeBody,
    digest: canonicalJsonDigest(scopeBody),
  };
  const binding = {
    repository_id: workIdentity.repository_id,
    project_ids: [...workIdentity.project_ids],
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
  } satisfies WorkState['binding'];
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
  } satisfies CoordinationLedger['claims'][number];
  const ticket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: 'ticket-work-1',
    repository_id: workIdentity.repository_id,
    project_ids: [...workIdentity.project_ids],
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
  } satisfies CoordinationLedger['tickets'][number];
  const lifecycleReferences: WorkState['lifecycle']['references'][number][] = [];
  const artifacts: WorkState['artifacts'][number][] = [];
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
      references: lifecycleReferences,
    },
    artifacts,
  } satisfies WorkState;
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
    } satisfies CoordinationLedger,
    sourceScope,
  };
}

function operationRequest(overrides: Partial<TaskSourceBindingRequest> = {}): TaskSourceBindingRequest {
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
    project_ids: [...identity.project_ids],
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
  // Package resources resolve through the executing package, not this consumer root.
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
    configuredProject = config.projects[0];
  assert.ok(configuredProject);
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [
    configuredProject.project_id,
  ]);
  return { repositoryRoot, config, project };
}

interface PrewriterFixtureOptions {
  lifecycleRisk?: string;
  packetRiskFlags?: string[];
  includeSourceAuthorization?: boolean;
}

function makePrewriterHostFixture({
  lifecycleRisk = 'high',
  packetRiskFlags = ['high'],
  includeSourceAuthorization = false,
}: PrewriterFixtureOptions = {}) {
  const fixture = makeConfiguredFixtureRoot(),
    { repositoryRoot, config, project } = fixture,
    workId = 'source-plan-report-' + createHash('sha256').update(String(Math.random())).digest('hex').slice(0, 12),
    threadId = 'source-plan-thread-' + workId,
    workflowId = 'task_execution',
    workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
    projectId = project.project_ids.at(0);
  assert.ok(projectId);
  const teamId = Object.keys(config.teams).find((id) => config.teams[id]?.enabled);
  assert.ok(teamId);
  const workflow = config.workflows[workflowId];
  assert.ok(workflow);
  const workIdentity: WorkIdentity = {
      repository_id: project.repository_id,
      project_ids: [...project.project_ids],
      integrations_digest: project.integrations_digest,
      work_id: workId,
    },
    taskSourcePath = path.join(repositoryRoot, 'src', 'task.ts'),
    scopePath = '.agent/scope.json',
    acceptancePath = '.agent/acceptance.json',
    sessionDatabasePath = sessionHandoffDatabasePath(repositoryRoot, config);
  let configuredDatabase!: Database;
  let ledger!: ReturnType<typeof openConfiguredMastraSessionLedger>;
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
    contracts: [
      {
        id: 'AC-1',
        definition: 'The planner report is bound to current scope and verification.',
        sr: 'The current admitted Source plan and security policy use the exact scope.',
        evidence: ['Focused Host preparation regression.'],
      },
    ],
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
    } satisfies LocalWorkAdmissionInput['workItem'];
  work.lease.thread_id = threadId;
  const seedTicket = seed.nextLedger.tickets[0],
    seedClaim = seed.nextLedger.claims[0];
  assert.ok(seedTicket && seedClaim);
  seedTicket.thread_id = threadId;
  seedClaim.thread_id = threadId;
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
    const writerStage = workflow.stages.find(
      (candidate) =>
        candidate.kind === 'develop' &&
        candidate.assignments.some(
          (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
        ),
    );
    assert.ok(writerStage);
    const authorization = {
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
    intakeBytes = Buffer.from(
      canonicalJson({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: workItem,
        runtime_code_paths: runtimeCodePaths,
        native_session_handle: threadId,
      }),
    );
  mkdirSync(path.dirname(path.join(repositoryRoot, intakePath)), { recursive: true });
  writeFileSync(path.join(repositoryRoot, intakePath), intakeBytes);
  work.artifacts = [
    {
      artifact_id: 'local-session-intake',
      schema: 'VidaLocalSessionIntake/v1',
      path: intakePath,
      sha256: createHash('sha256').update(intakeBytes).digest('hex'),
      stage_id: 'intake',
      source_revision: taskScope.digest,
      scope_id: scope.scope_id,
      ac_ids: ['AC-1'],
    },
  ];
  seedTicket.contour_keys = ['tenant:local', 'project:local/' + projectId, 'file:src/task.ts'];
  configuredDatabase = openFixtureDatabase(repositoryRoot, sessionDatabasePath, workspaceId);
  assert.ok(configuredDatabase);
  const store = new HostStateStore(
    configuredDatabase,
    workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    repositoryRoot,
  );
  store.compareAndSwapHostState({
    expectedWork: null,
    expectedLedger: null,
    nextWork: work,
    nextLedger: seed.nextLedger,
  });
  const context = { work_id: workId, attempt: 1, scope_digest: taskScope.digest };
  let stage: (typeof config.workflows)[string]['stages'][number] | undefined;
  let actions: readonly SessionAgentAction[] | undefined;
  let waveIndex = 0;
  for (; waveIndex < 12 && !actions; waveIndex++) {
    const candidate = sessionActionsForWave(
      config,
      { team: teamId, kind: 'task', intent: workflowId, project: projectId, risk_flags: packetRiskFlags, labels: [] },
      context,
      workflowId,
      waveIndex,
      [],
    );
    const prewriter = candidate.filter((action) => action.stage_id === 'review_source_prewrite');
    if (prewriter.length > 0) {
      stage = workflow.stages.find((item) => item.id === 'review_source_prewrite');
      actions = prewriter;
    }
  }
  assert.ok(stage && actions && waveIndex !== 12, 'Configured Source prewriter wave was not found.');
  const selection = {
    team: teamId,
    kind: 'task',
    intent: workflowId,
    project: projectId,
    risk_flags: packetRiskFlags,
    labels: [],
  } satisfies WorkItemSelection;
  let synthesisAction: SessionAgentAction | undefined;
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
    synthesisIssueId = 'e04b9a12-6c3f-4e52-a18d-79c1f3b62480',
    initialJournal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: workId,
      attempt: 1,
      run_id: work.execution.run_id,
      step_id: stage.id,
      source_scope: taskScope,
      items: requests.map((request) => ({ request, issue_id: null, observation: null })),
      completed: [
        {
          step_id: synthesisAction.stage_id,
          items: [
            {
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
            },
          ],
        },
      ],
    } satisfies MastraSessionLedgerState;
  configuredDatabase.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  configuredDatabase
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspaceId, workId, 1, 1, canonicalJson(initialJournal), canonicalJsonDigest(initialJournal));
  ledger = openConfiguredMastraSessionLedger(repositoryRoot);
  assert.ok(ledger);
  return {
    ...fixture,
    workId,
    threadId,
    workflowId,
    workIdentity,
    taskScope,
    actions,
    ledger,
    store,
    close({ retainRoot = false, deadline }: { readonly retainRoot?: boolean; readonly deadline?: number } = {}) {
      try {
        ledger.close();
        configuredDatabase.close();
        if (retainRoot || (deadline !== undefined && performance.now() >= deadline))
          console.warn(`Retained task-source fixture root after incomplete case: ${repositoryRoot}`);
        else rmSync(repositoryRoot, { recursive: true, force: true });
      } catch (error) {
        console.error(`Task-source fixture cleanup failed; root retained or uncertain: ${repositoryRoot}`, error);
        throw error;
      }
    },
  };
}

function preparationRecord(
  fixture: ReturnType<typeof makePrewriterHostFixture>,
  action: SessionAgentAction,
  kind: 'source_plan' | 'implementation_policy',
  status: 'pass' | 'gap' = 'pass',
) {
  const observerId = 'fixture:' + action.role,
    mechanics =
      kind === 'source_plan'
        ? [
            {
              mechanic: 'scope_acceptance_trace',
              actual: 'Current scope and AC-1 trace to the acceptance manifest.',
              evidence_ref: 'source-plan.md',
            },
            {
              mechanic: 'verification_rollback',
              actual: 'The focused check and source restoration are identified.',
              evidence_ref: 'source-plan.md',
            },
          ]
        : [
            {
              mechanic: 'root_cause_owner',
              actual: 'The likely cause and owning component are recorded.',
              evidence_ref: 'security-review.md',
            },
            {
              mechanic: 'affected_callers',
              actual: 'Affected callers are listed.',
              evidence_ref: 'security-review.md',
            },
            {
              mechanic: 'existing_primitives',
              actual: 'Existing primitives are checked before changes.',
              evidence_ref: 'security-review.md',
            },
            {
              mechanic: 'prewriter_security_gate',
              actual: 'The proposed change is bounded to the current scope.',
              evidence_ref: 'security-review.md',
            },
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

function acceptedPreparationObservation(
  action: SessionAgentAction,
  record: ReturnType<typeof preparationRecord>,
  issueId: string,
): SessionBridgeObservation {
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

function fixtureActionForRole(fixture: ReturnType<typeof makePrewriterHostFixture>, role: string): SessionAgentAction {
  const action = fixture.actions.find((candidate) => candidate.role === role);
  assert.ok(action, `Configured action for ${role} was not found.`);
  return action;
}

function hostWork(snapshot: HostStateSnapshot): WorkState {
  assert.ok(snapshot.work);
  return snapshot.work;
}

function requiredJournalVersion(journalSnapshot: ReturnType<HostStateStore['readWorkSessionJournal']>): StateVersion {
  assert.ok(journalSnapshot);
  return journalSnapshot.version;
}
function requiredSourceScope(state: MastraSessionLedgerState): ScopedSourceSnapshot {
  assert.ok(state.source_scope);
  return state.source_scope;
}
function requiredLedgerIssueId(item: MastraLedgerItem): string {
  assert.ok(item.issue_id);
  return item.issue_id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

interface OperationResult extends Record<string, unknown> {
  readonly schema: 'TaskSourceBindingOperationResult/v1';
  readonly status: string;
  readonly operation: Record<string, unknown> | null;
  readonly state_version: StateVersion | null;
}

interface PreparedOperationResult extends OperationResult {
  readonly status: 'prepared';
  readonly operation: Record<string, unknown>;
  readonly state_version: StateVersion;
}

interface ActionResult extends Record<string, unknown> {
  readonly schema: 'TaskSourceBindingActionResult/v1';
  readonly status: string;
  readonly action: Record<string, unknown> | null;
  readonly state_version: StateVersion | null;
  readonly command_argv: readonly (readonly string[])[] | null;
}

interface RetainedActionResult extends ActionResult {
  readonly action: Record<string, unknown>;
  readonly state_version: StateVersion;
}

function isStateVersion(value: unknown): value is StateVersion {
  return isRecord(value) && Number.isSafeInteger(value.revision) && typeof value.digest === 'string';
}

function isCommandArgv(value: unknown): value is readonly (readonly string[])[] {
  return Array.isArray(value) && value.every((command: unknown) => isStringArray(command));
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((part: unknown) => typeof part === 'string');
}

function sourceRootFor(requestValue: TaskSourceBindingRequest): string {
  assert.ok(requestValue.source_root);
  return requestValue.source_root;
}

function operationResult(value: Readonly<Record<string, unknown>>): OperationResult {
  if (
    value.schema !== 'TaskSourceBindingOperationResult/v1' ||
    typeof value.status !== 'string' ||
    !(value.operation === null || isRecord(value.operation)) ||
    !(value.state_version === null || isStateVersion(value.state_version))
  )
    throw new Error('Host returned an invalid task source operation result.');
  return {
    ...value,
    schema: 'TaskSourceBindingOperationResult/v1',
    status: value.status,
    operation: value.operation,
    state_version: value.state_version,
  };
}

function actionResult(value: Readonly<Record<string, unknown>>): ActionResult {
  if (
    value.schema !== 'TaskSourceBindingActionResult/v1' ||
    typeof value.status !== 'string' ||
    !(value.action === null || isRecord(value.action)) ||
    !(value.state_version === null || isStateVersion(value.state_version)) ||
    !(value.command_argv === null || isCommandArgv(value.command_argv))
  )
    throw new Error('Host returned an invalid task source action result.');
  return {
    ...value,
    schema: 'TaskSourceBindingActionResult/v1',
    status: value.status,
    action: value.action,
    state_version: value.state_version,
    command_argv: value.command_argv,
  };
}

function retainedActionResult(value: Readonly<Record<string, unknown>>): RetainedActionResult {
  const result = actionResult(value);
  if (result.action === null || result.state_version === null)
    throw new Error('Host action result does not retain its action and state version.');
  return { ...result, action: result.action, state_version: result.state_version };
}

const verifyCurrent: Parameters<HostStateStore['prepareTaskSourceBindingOperation']>[0]['verifyCurrent'] = ({
  journal: currentJournal,
}) => {
  assert.ok(currentJournal.source_scope);
  return {
    source_authorization_sha256: 'c'.repeat(64),
    source_scope_digest: currentJournal.source_scope.digest,
  };
};

function prepare(candidate: typeof request = request) {
  const result = operationResult(
    store.prepareTaskSourceBindingOperation({ request: candidate, identity, verifyCurrent }),
  );
  if (result.status !== 'prepared' || result.operation === null || result.state_version === null)
    throw new Error('Host did not prepare the task source operation.');
  return {
    ...result,
    status: 'prepared',
    operation: result.operation,
    state_version: result.state_version,
  } satisfies PreparedOperationResult;
}

function inspect(candidate: typeof request = request) {
  return operationResult(store.inspectTaskSourceBindingOperation({ request: candidate, identity, verifyCurrent }));
}

function inspectAction(candidate: typeof request = request): ActionResult {
  return actionResult(store.inspectTaskSourceBindingAction({ request: candidate, identity, verifyCurrent }));
}

async function issue(candidate: typeof request = request): Promise<RetainedActionResult> {
  return issueOn(store, candidate, identity);
}

async function issueOn(
  hostStore: HostStateStore,
  candidate: TaskSourceBindingRequest,
  workIdentity: WorkIdentity,
): Promise<RetainedActionResult> {
  return retainedActionResult(
    await hostStore.issueTaskSourceBindingOperation({ request: candidate, identity: workIdentity }),
  );
}

function reportOn(
  hostStore: HostStateStore,
  input: {
    request: TaskSourceBindingRequest;
    identity: WorkIdentity;
    expectedActionStateVersion: StateVersion;
    report: TaskSourceBindingReport;
  },
): RetainedActionResult {
  return retainedActionResult(hostStore.reportTaskSourceBindingOperation(input));
}

function reportAction(input: {
  request: TaskSourceBindingRequest;
  identity: WorkIdentity;
  expectedActionStateVersion: StateVersion;
  report: TaskSourceBindingReport;
}): RetainedActionResult {
  return reportOn(store, input);
}

type PolicyVerifier = TaskSourceMutationPolicyVerifier['verify'];
type PolicyDecision = Awaited<ReturnType<PolicyVerifier>>;

function setPolicyStore(policyVerifier: PolicyVerifier) {
  store = new HostStateStore(database, workspace, undefined, undefined, undefined, undefined, root, undefined, {
    verify: policyVerifier,
  });
}

function allowTaskSourcePolicy({ request: policyRequest }: Parameters<PolicyVerifier>[0]): PolicyDecision {
  return {
    operation_id: policyRequest.operation_id,
    request_id: policyRequest.request_id,
    operation_hash: policyRequest.operation_hash,
    prepared_record_cas: policyRequest.prepared_record_cas,
    authorization: {
      decision: 'allow',
      diagnostics: [],
      receipt: {
        schema: 'AuthorizationReceipt/v1',
        source: 'cedar',
        decision: 'allow',
        decision_id: 'task-source-authorization-1',
        principal: 'fixture:task-source-policy',
        role: 'source-writer',
        action: 'write',
        tenant: 'tenant',
        project: 'agent',
        resourceTenant: 'tenant',
        resourceProject: 'agent',
        registry_hash: 'e'.repeat(64),
        operation_hash: policyRequest.operation_hash,
        issued_at: '2026-10-07T00:00:00.000Z',
      },
    },
    edictum_operation: { operation_hash: policyRequest.operation_hash, tenant: 'tenant', project: 'agent' },
    edictum_evaluation: {
      action: 'pending_approval',
      reason: 'Fixture policy evaluation is pending its separately modeled approval.',
      stageId: 'source.write',
      audit: null,
      events: [],
      records: [],
    },
    source_authorization_reference: {
      schema: 'LifecycleArtifactReference/v1',
      kind: 'execution_approval',
      artifact_schema: 'LocalSourceWriteAuthorization/v1',
      record_id: 'authorization-1',
      path: '.agent/work/authorization.json',
      sha256: 'c'.repeat(64),
      source_revision: '7'.repeat(64),
      scope_id: 'scope-work-1',
      ac_ids: ['AC-1'],
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: 'fixture:task-source-policy',
      decision: 'approved',
      disposition: 'current',
    },
    source_authorization_sha256: 'c'.repeat(64),
    preflight_evidence_digest: 'd'.repeat(64),
  };
}

describe('persisted TaskSource binding operations', () => {
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'vida-task-source-operation-'));
    database = openFixtureDatabase(root, path.join(root, 'host.sqlite'), workspace);
    store = new HostStateStore(database, workspace);
    const seed = makeWorkAndLedger();
    const initialSnapshot = store.compareAndSwapHostState({
      expectedWork: seed.expectedWork,
      expectedLedger: seed.expectedLedger,
      nextWork: seed.nextWork,
      nextLedger: seed.nextLedger,
    });
    assert.ok(initialSnapshot.work);
    assert.ok(initialSnapshot.work.execution.run_id);
    assert.ok(initialSnapshot.ledger);
    assert.ok(initialSnapshot.workVersion);
    assert.ok(initialSnapshot.ledgerVersion);
    initial = requireFixtureHostSnapshot(initialSnapshot);
    const initialRunId = initial.work.execution.run_id;
    assert.ok(initialRunId);
    journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspace,
      work_id: identity.work_id,
      attempt: 1,
      run_id: initialRunId,
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
    if (database) closeWorkspaceDatabaseWithAdmission(database);
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
    });
    assert.equal(prepared.state_version.revision, 1);
    assert.match(prepared.state_version.digest, /^[a-f0-9]{64}$/);
    expect(prepare()).toEqual(prepared);
    expect(inspect()).toMatchObject({
      schema: 'TaskSourceBindingOperationResult/v1',
      status: 'inspected',
      operation: prepared.operation,
      state_version: prepared.state_version,
    });
    const operationCount = database
      .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM agent_host_task_source_binding_operation')
      .get();
    assert.ok(operationCount);
    expect(operationCount.count).toBe(1);
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
      source_root: sourceRootFor(request),
      proposed_argv: ['git', '-C', root, 'worktree', 'add', '--branch', 'codex/task-source', sourceRootFor(request)],
      prepared_record_cas: { operation_id: request.operation_id, state_version: prepared.state_version },
    });
    const { operation_hash, ...unsigned } = dto;
    expect(operation_hash).toBe(canonicalJsonDigest(unsigned));
    expect(() =>
      createTaskSourceMutationPolicyRequest({
        repositoryRoot: root,
        operation: prepared.operation,
        preparedStateVersion: prepared.state_version,
        hostSnapshot: { ...initial, workVersion: { ...initial.workVersion, digest: 'd'.repeat(64) } },
      }),
    ).toThrow(/stale/);
  });

  test('source snapshots use only a current typed binding and preserve canonical-root behavior without one', () => {
    const taskRequest = operationRequest({ source_root: path.join(root, 'task-source') });
    const binding = createTaskSourceBinding({
      request: taskRequest,
      source_scope: journal.source_scope,
      canonical_host_common_dir: path.join(root, '.git'),
      git: {
        source_root: sourceRootFor(taskRequest),
        common_dir: path.join(root, '.git'),
        branch: 'codex/task-source',
        head: 'a'.repeat(40),
        cwd: sourceRootFor(taskRequest),
      },
    });
    expect(
      resolveTaskSourceFileRoot({
        canonicalHostRoot: root,
        binding,
        identity,
        attempt: 1,
        threadId: 'thread-1',
        configDigest: taskRequest.config_digest,
        projectContextDigest: taskRequest.project_context_digest,
        sourceScopeDigest: journal.source_scope.digest,
      }),
    ).toBe(sourceRootFor(taskRequest));
    expect(
      resolveTaskSourceFileRoot({
        canonicalHostRoot: root,
        binding: null,
        identity,
        attempt: 1,
        threadId: 'thread-1',
        configDigest: taskRequest.config_digest,
        projectContextDigest: taskRequest.project_context_digest,
        sourceScopeDigest: journal.source_scope.digest,
      }),
    ).toBe(root);
    expect(
      resolveCurrentTaskSourceFileRoot({
        store,
        host: initial,
        canonicalHostRoot: root,
        attempt: 1,
      }),
    ).toBe(root);
    expect(() =>
      resolveTaskSourceFileRoot({
        canonicalHostRoot: root,
        binding,
        identity,
        attempt: 1,
        threadId: 'thread-1',
        configDigest: 'f'.repeat(64),
        projectContextDigest: taskRequest.project_context_digest,
        sourceScopeDigest: journal.source_scope.digest,
      }),
    ).toThrow(/differs from the admitted file context/);

    const calls: Parameters<HostStateStore['snapshotCurrentTaskSourceSources']>[] = [];
    const sourceStore: Pick<HostStateStore, 'snapshotCurrentTaskSourceSources'> = {
      snapshotCurrentTaskSourceSources(...args) {
        calls.push(args);
        return journal.source_scope;
      },
    };
    expect(
      snapshotAdmittedTaskSources({
        store: sourceStore,
        host: initial,
        canonicalHostRoot: root,
        paths: ['src/task.ts'],
        attempt: 1,
      }),
    ).toEqual(journal.source_scope);
    expect(calls).toEqual([[identity, 'thread-1', ['src/task.ts'], 1]]);
  });

  test('changed payload, stale Host CAS and foreign owner are denied without adding operation rows', () => {
    prepare();
    expect(() => prepare(operationRequest({ branch_ref: 'refs/heads/codex/changed' }))).toThrow(/retry changed/);
    const expectedWork = request.expected_host.work;
    assert.ok(expectedWork);
    const stale = operationRequest({
      operation_id: 'task-source-op-stale',
      request_id: 'task-source-request-stale',
      expected_host: {
        ...request.expected_host,
        work: { revision: expectedWork.revision, digest: 'd'.repeat(64) },
      },
    });
    expect(() => prepare(stale)).toThrow(/compare-and-swap conflict/);
    const foreign = operationRequest({
      operation_id: 'task-source-op-foreign',
      request_id: 'task-source-request-foreign',
      thread_id: 'foreign-thread',
    });
    expect(() => prepare(foreign)).toThrow(/active Host owner/);
    const operationCount = database
      .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM agent_host_task_source_binding_operation')
      .get();
    assert.ok(operationCount);
    expect(operationCount.count).toBe(1);
  });

  test('inspection without the lazy table has no database effects and missing Host storage is rejected before creation', () => {
    const before = database
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'",
      )
      .get();
    expect(before).toBeNull();
    expect(inspect()).toMatchObject({ status: 'not_found', operation: null, state_version: null });
    const after = database
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'",
      )
      .get();
    expect(after).toBeNull();

    const missing = path.join(root, 'missing-host', 'session-handoff.v1.sqlite');
    expect(() => assertExistingTaskSourceHostDatabase(root, missing)).toThrow(/database is missing/);
    expect(existsSync(path.dirname(missing))).toBe(false);
    expect(existsSync(missing)).toBe(false);
  });

  test('missing Host work denies preparation before creating the operation table', () => {
    const emptyRoot = mkdtempSync(path.join(tmpdir(), 'vida-task-source-empty-'));
    const emptyDatabase = openFixtureDatabase(
      emptyRoot,
      path.join(emptyRoot, 'empty.sqlite'),
      deriveWorkspaceId(identity.repository_id, emptyRoot),
    );
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
          .query<{ name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_operation'",
          )
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
    const issued = await issue(request);
    expect(issued).toMatchObject({
      schema: 'TaskSourceBindingActionResult/v1',
      status: 'issued',
      command_argv: [['-C', root, 'worktree', 'add', '--branch', 'codex/task-source', sourceRootFor(request)]],
      action: {
        schema: 'TaskSourceBindingAction/v1',
        status: 'issued',
        policy_decision: { authorization: { decision: 'allow' }, edictum_evaluation: { action: 'pending_approval' } },
      },
    });
    const retry = await issue(request);
    expect(retry).toMatchObject({ status: 'already_issued', command_argv: null, action: issued.action });
    expect(evaluations).toBe(1);
    expect(inspectAction()).toMatchObject({
      status: 'issued',
      command_argv: null,
      action: issued.action,
    });
  });

  test.each(['issued', 'unknown', 'malformed_reported', 'reported_observed'])(
    'policy denial occurs before Host issue and branch/source claims are unique (%s)',
    async (pendingStatus) => {
      request = operationRequest({ source_root: path.join(root, 'task-source') });
      setPolicyStore(async () => {
        throw new Error('configured Cedar or Edictum denied');
      });
      prepare();
      await Promise.resolve(expect(issue(request)).rejects.toThrow(/denied/));
      expect(
        database
          .query<{ name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'",
          )
          .get(),
      ).toBeNull();

      setPolicyStore(async (input) => allowTaskSourcePolicy(input));
      const issued = await issue(request);
      if (pendingStatus === 'unknown') {
        reportAction({
          request,
          identity,
          expectedActionStateVersion: issued.state_version,
          report: {
            schema: 'TaskSourceBindingReport/v1',
            operation: request.operation,
            operation_id: request.operation_id,
            request_id: request.request_id,
            report_id: 'pending-task-source-unknown',
            expected_host: request.expected_host,
            status: 'unknown',
            binding: null,
            reason: 'The issued command outcome is unknown.',
          },
        });
      }
      if (pendingStatus === 'malformed_reported') {
        // Fault injection in the isolated fixture: a terminal label without a retained result.
        const malformed = { ...issued.action, status: 'reported', revision: issued.state_version.revision + 1 };
        database
          .query(
            'UPDATE agent_host_task_source_binding_action SET revision=?,payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
          )
          .run(
            malformed.revision,
            canonicalJson(malformed),
            canonicalJsonDigest(malformed),
            workspace,
            request.operation_id,
          );
      }
      let observedReport: TaskSourceBindingReport | undefined;
      if (pendingStatus === 'reported_observed') {
        mkdirSync(path.join(root, '.git'));
        mkdirSync(sourceRootFor(request), { recursive: true });
        const binding = createTaskSourceBinding({
          request,
          source_scope: journal.source_scope,
          canonical_host_common_dir: path.join(root, '.git'),
          git: {
            source_root: sourceRootFor(request),
            common_dir: path.join(root, '.git'),
            branch: 'codex/task-source',
            head: 'a'.repeat(40),
            cwd: sourceRootFor(request),
          },
        });
        observedReport = {
          schema: 'TaskSourceBindingReport/v1',
          operation: request.operation,
          operation_id: request.operation_id,
          request_id: request.request_id,
          report_id: 'pending-task-source-observed',
          expected_host: request.expected_host,
          status: 'observed',
          binding,
        };
        assert.ok(observedReport);
        const reported = reportAction({
          request,
          identity,
          expectedActionStateVersion: issued.state_version,
          report: observedReport,
        });
        expect(
          reportAction({
            request,
            identity,
            expectedActionStateVersion: issued.state_version,
            report: observedReport,
          }),
        ).toEqual(reported);
      }
      const latestHost = store.readHostStateSnapshot(identity);
      assert.ok(latestHost.workVersion && latestHost.ledgerVersion);
      const second = operationRequest({
        operation_id: 'task-source-op-2',
        request_id: 'task-source-request-2',
        branch_ref: 'refs/heads/codex/other',
        source_root: sourceRootFor(request),
        expected_host: {
          ...request.expected_host,
          work: latestHost.workVersion,
          ledger: latestHost.ledgerVersion,
          maintenance_generation: latestHost.maintenanceGeneration,
        },
      });
      prepare(second);
      const beforeDeniedIssue = store.readWorkspaceSnapshot();
      await Promise.resolve(
        expect(issue(second)).rejects.toThrow(
          pendingStatus === 'reported_observed'
            ? /already has a reported observed binding/
            : pendingStatus === 'malformed_reported'
              ? /^task source action status differs from its retained report pair$/
              : /already claimed|retained observed result/,
        ),
      );
      expect(store.readWorkspaceSnapshot()).toEqual(beforeDeniedIssue);
      expect(inspectAction(second)).toMatchObject({
        status: 'prepared',
      });
      const actionCount = database
        .query<{ count: number }, []>('SELECT COUNT(*) AS count FROM agent_host_task_source_binding_action')
        .get();
      assert.ok(actionCount);
      expect(actionCount.count).toBe(1);
      expect(issued.status).toBe('issued');
      if (pendingStatus === 'malformed_reported') {
        await Promise.resolve(
          expect(issue(request)).rejects.toThrow(/^task source action status differs from its retained report pair$/),
        );
        expect(() => inspectAction()).toThrow(/^task source action status differs from its retained report pair$/);
        expect(store.readWorkspaceSnapshot()).toEqual(beforeDeniedIssue);
      } else {
        expect((await issue(request)).command_argv).toBeNull();
        expect(inspectAction().command_argv).toBeNull();
      }
    },
  );

  test('unknown reports remain fenced and one late observed report can settle without reissuing', async () => {
    request = operationRequest({ source_root: path.join(root, 'task-source') });
    setPolicyStore(async (input) => allowTaskSourcePolicy(input));
    prepare();
    const issued = await issue(request);
    const unknown: TaskSourceBindingReport = {
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
    const first = reportAction({
      request,
      identity,
      expectedActionStateVersion: issued.state_version,
      report: unknown,
    });
    expect(first.status).toBe('unknown');
    assert.ok(first.state_version);
    expect((await issue(request)).command_argv).toBeNull();
    const recoveredReport: TaskSourceBindingReport = {
      schema: 'TaskSourceBindingReport/v1',
      operation: request.operation,
      operation_id: request.operation_id,
      request_id: request.request_id,
      report_id: 'task-source-report-recovered',
      expected_host: request.expected_host,
      status: 'observed',
      binding: createTaskSourceBinding({
        request,
        source_scope: journal.source_scope,
        canonical_host_common_dir: root,
        git: {
          source_root: sourceRootFor(request),
          common_dir: root,
          branch: 'codex/task-source',
          head: 'a'.repeat(40),
          cwd: sourceRootFor(request),
        },
      }),
    };
    const recovered = reportAction({
      request,
      identity,
      expectedActionStateVersion: first.state_version,
      report: recoveredReport,
    });
    expect(recovered).toMatchObject({
      status: 'reported',
      action: { report: unknown, recovery_report: { status: 'observed' } },
    });
    expect(
      reportAction({
        request,
        identity,
        expectedActionStateVersion: first.state_version,
        report: recoveredReport,
      }),
    ).toEqual(recovered);
    expect((await issue(request)).command_argv).toBeNull();
  });

  test.each(['orphan_action', 'missing_preparation_table', 'missing_reserved_action'])(
    'historical source reads retain the observed alternate tree and reject uncertain effects or foreign scope (%s)',
    async (fault) => {
      const historyRoot = mkdtempSync(path.join(tmpdir(), 'vida-historical-task-source-')),
        historyWorkspace = deriveWorkspaceId(identity.repository_id, historyRoot),
        historyDatabase = openFixtureDatabase(historyRoot, path.join(historyRoot, 'host.sqlite'), historyWorkspace);
      try {
        const alternate = path.join(historyRoot, 'task-tree');
        mkdirSync(path.join(historyRoot, '.git'));
        mkdirSync(path.join(historyRoot, 'src'));
        mkdirSync(path.join(alternate, 'src'), { recursive: true });
        writeFileSync(path.join(historyRoot, 'src/task.ts'), 'Original source.\n');
        writeFileSync(path.join(alternate, 'src/task.ts'), 'Original source.\n');
        const originalScope = snapshotDeclaredSources(requireSafeRepositoryAccess(historyRoot), ['src/task.ts']),
          historyStore = new HostStateStore(
            historyDatabase,
            historyWorkspace,
            undefined,
            undefined,
            undefined,
            undefined,
            historyRoot,
            undefined,
            { verify: async (policyInput) => allowTaskSourcePolicy(policyInput) },
          ),
          seed = makeWorkAndLedger(identity, historyWorkspace, originalScope),
          originalHost = historyStore.compareAndSwapHostState({
            expectedWork: seed.expectedWork,
            expectedLedger: seed.expectedLedger,
            nextWork: seed.nextWork,
            nextLedger: seed.nextLedger,
          }),
          historyJournal = { ...journal, workspace_id: historyWorkspace, source_scope: originalScope };
        historyDatabase.exec(
          'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
        );
        assert.ok(originalHost.workVersion && originalHost.ledgerVersion);
        historyDatabase
          .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
          .run(
            historyWorkspace,
            identity.work_id,
            1,
            1,
            canonicalJson(historyJournal),
            canonicalJsonDigest(historyJournal),
          );
        const historyRequest = operationRequest({
          operation_id: 'historical-source-op',
          request_id: 'historical-source-request',
          canonical_host_root: historyRoot,
          source_root: alternate,
          expected_host: {
            work: originalHost.workVersion,
            ledger: originalHost.ledgerVersion,
            journal: { attempt: 1, version: { revision: 1, digest: canonicalJsonDigest(historyJournal) } },
            maintenance_generation: originalHost.maintenanceGeneration,
          },
        });
        historyStore.prepareTaskSourceBindingOperation({
          request: historyRequest,
          identity,
          verifyCurrent: () => ({
            source_authorization_sha256: 'c'.repeat(64),
            source_scope_digest: originalScope.digest,
          }),
        });
        const issued = await issueOn(historyStore, historyRequest, identity),
          readInput = {
            identity,
            threadId: historyRequest.thread_id,
            attempt: 1,
            canonicalHostRoot: historyRoot,
            paths: ['src/task.ts'],
          };
        expect(() => historyStore.snapshotHistoricalTaskSourceSources(readInput)).toThrow(/issued or unknown/);
        const binding = createTaskSourceBinding({
          request: historyRequest,
          source_scope: originalScope,
          canonical_host_common_dir: historyRoot,
          git: {
            source_root: alternate,
            common_dir: historyRoot,
            branch: 'codex/task-source',
            head: 'a'.repeat(40),
            cwd: alternate,
          },
        });
        reportOn(historyStore, {
          request: historyRequest,
          identity,
          expectedActionStateVersion: issued.state_version,
          report: {
            schema: 'TaskSourceBindingReport/v1',
            operation: historyRequest.operation,
            operation_id: historyRequest.operation_id,
            request_id: historyRequest.request_id,
            report_id: 'historical-source-observed',
            expected_host: historyRequest.expected_host,
            status: 'observed',
            binding,
            reason: 'The fixture retains the observed source binding.',
          },
        });
        writeFileSync(path.join(historyRoot, 'src/task.ts'), 'Different canonical-root source.\n');
        writeFileSync(path.join(alternate, 'src/task.ts'), 'Observed alternate-tree postimage.\n');
        const before = historyStore.readWorkspaceSnapshot(),
          expected = snapshotDeclaredSources(requireSafeRepositoryAccess(alternate), ['src/task.ts']);
        expect(historyStore.snapshotHistoricalTaskSourceSources(readInput)).toEqual(expected);
        expect(() => historyStore.snapshotHistoricalTaskSourceSources({ ...readInput, threadId: 'foreign' })).toThrow(
          /owner/,
        );
        expect(() =>
          historyStore.snapshotHistoricalTaskSourceSources({ ...readInput, paths: ['src/extra.ts'] }),
        ).toThrow(/scope/);
        expect(historyStore.readWorkspaceSnapshot()).toEqual(before);
        if (fault === 'orphan_action')
          historyDatabase
            .query('DELETE FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?')
            .run(historyWorkspace, historyRequest.operation_id);
        else if (fault === 'missing_preparation_table')
          historyDatabase.exec('DROP TABLE agent_host_task_source_binding_operation');
        else
          historyDatabase
            .query('DELETE FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?')
            .run(historyWorkspace, historyRequest.operation_id);
        expect(() => historyStore.snapshotHistoricalTaskSourceSources(readInput)).toThrow(
          /orphan|preparation storage|effect record/,
        );
        expect(historyStore.readWorkspaceSnapshot()).toEqual(before);
      } finally {
        historyDatabase.close();
        rmSync(historyRoot, { recursive: true, force: true });
      }
    },
  );
});

test('configured inspect and admitted packet/result read current TaskSource bytes while Host files stay unchanged', async () => {
  const fixture = makeConfiguredFixtureRoot(),
    hostRoot = fixture.repositoryRoot,
    config = fixture.config,
    project = fixture.project,
    projectId = project.project_ids.at(0),
    workId = 'task-source-integration-work',
    threadId = 'task-source-integration-thread',
    workflowId = 'task_execution',
    teamId = Object.keys(config.teams).find((id) => config.teams[id]?.enabled),
    taskRoot = path.join(hostRoot, '.tmp', 'task-source-tree'),
    hostSourcePath = path.join(hostRoot, 'src', 'task.ts'),
    taskSourcePath = path.join(taskRoot, 'src', 'task.ts'),
    databasePath = sessionHandoffDatabasePath(hostRoot, config);
  assert.ok(projectId);
  assert.ok(teamId);
  const workflow = config.workflows[workflowId];
  assert.ok(workflow);
  let configuredDatabase: Database | undefined;
  let sessionLedger: ReturnType<typeof openConfiguredMastraSessionLedger> | undefined;
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
      workIdentity: WorkIdentity = {
        repository_id: config.repository.repository_id,
        project_ids: [projectId],
        integrations_digest: project.integrations_digest,
        work_id: workId,
      },
      workspaceId = deriveWorkspaceId(config.repository.repository_id, hostRoot);
    expect(taskScope.digest).not.toBe(hostScope.digest);
    expect(taskBytes.toString('utf8')).not.toBe(hostBytesBefore.toString('utf8'));

    const workItem = workflowWorkItemSchema.parse({
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
    });
    const selection = {
      team: teamId,
      kind: 'task',
      intent: workflowId,
      project: projectId,
      risk_flags: ['high'],
      labels: [],
    } satisfies WorkItemSelection;
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

    const writerStage = workflow.stages.find((stage) => stage.kind === 'develop'),
      writerAssignment = writerStage?.assignments[0];
    assert.ok(writerStage && writerAssignment);
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
    const ticket = seed.nextLedger.tickets[0],
      claim = seed.nextLedger.claims[0];
    assert.ok(ticket && claim);
    ticket.thread_id = threadId;
    claim.thread_id = threadId;
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
    ticket.contour_keys = ['tenant:local', 'project:local/' + projectId, 'file:src/task.ts'];
    configuredDatabase = openFixtureDatabase(hostRoot, databasePath, workspaceId);
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
    assert.ok(hostBefore.workVersion && hostBefore.ledgerVersion);
    const journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: workId,
      attempt: 1,
      run_id: work.execution.run_id,
      step_id: workflow.stages.find((stage) => stage.id !== writerStage.id)?.id ?? null,
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
    const sourceRequest: TaskSourceBindingRequest = {
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
      verifyCurrent: ({ journal: currentJournal }) => {
        const sourceScope = requiredSourceScope(currentJournal);
        return {
          source_authorization_sha256: authorizationReference.sha256,
          source_scope_digest: sourceScope.digest,
        };
      },
    });
    const issued = await issueOn(configuredStore, sourceRequest, workIdentity);
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
    const sourceReport: TaskSourceBindingReport = {
      schema: 'TaskSourceBindingReport/v1',
      operation: sourceRequest.operation,
      operation_id: sourceRequest.operation_id,
      request_id: sourceRequest.request_id,
      report_id: 'task-source-integration-report',
      expected_host: expectedHost,
      status: 'observed',
      binding,
    };
    reportOn(configuredStore, {
      request: sourceRequest,
      identity: workIdentity,
      expectedActionStateVersion: issued.state_version,
      report: sourceReport,
    });
    const inspected = await executeTaskSourceBindingOperation({
      repositoryRoot: hostRoot,
      mode: 'inspect',
      requestPath,
    });
    if (!isRecord(inspected.source_execution_context) || typeof inspected.source_execution_context.cwd !== 'string')
      throw new Error('TaskSource inspect did not return a valid source execution context.');
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

    const renewFromBoundSource = (allowWriterChanges = false) => {
      const current = configuredStore.readHostStateSnapshot(workIdentity),
        currentJournal = configuredStore.readWorkSessionJournal(workIdentity),
        currentWork = hostWork(current);
      assert.ok(currentWork.lease);
      assert.ok(current.workVersion && current.ledgerVersion && currentJournal);
      return configuredStore.renewActiveLocalLease({
        identity: workIdentity,
        attempt: 1,
        nativeSessionHandle: threadId,
        generation: currentWork.lease.generation,
        expectedWork: current.workVersion,
        expectedLedger: current.ledgerVersion,
        expectedJournal: currentJournal.version,
        expectedMaintenanceGeneration: current.maintenanceGeneration,
        verifyCurrent: (_work, state, sourceRoot) => {
          assert.ok(sourceRoot);
          expect(sourceRoot).toBe(taskRoot);
          const currentDatabase = configuredDatabase;
          assert.ok(currentDatabase);
          expect(currentDatabase.inTransaction).toBe(true);
          const observed = snapshotDeclaredSources(requireSafeRepositoryAccess(sourceRoot), ['src/task.ts']);
          const sourceScope = requiredSourceScope(state);
          if (!allowWriterChanges && observed.digest !== sourceScope.digest) throw Error('unauthorized Source drift');
        },
      });
    };
    renewFromBoundSource();
    const beforeIllegalDrift = configuredStore.readHostStateSnapshot(workIdentity);
    writeFileSync(taskSourcePath, 'Unreported external Source change.\n');
    expect(() => renewFromBoundSource()).toThrow(/unauthorized Source drift/);
    expect(configuredStore.readHostStateSnapshot(workIdentity)).toEqual(beforeIllegalDrift);
    writeFileSync(taskSourcePath, taskBytes);

    const currentHost = configuredStore.readHostStateSnapshot(workIdentity),
      synthStage = workflow.stages.find((stage) => stage.produces.includes('DevelopmentTaskPacket/v1'));
    assert.ok(synthStage);
    const currentWork = hostWork(currentHost),
      currentLease = currentWork.lease;
    assert.ok(currentLease && currentHost.ledger && currentHost.workVersion && currentHost.ledgerVersion);
    const runId = currentWork.execution.run_id;
    assert.ok(runId);
    const leaseTicket = currentHost.ledger.tickets.find((ticket) => ticket.ticket_id === currentLease.ticket_id);
    assert.ok(leaseTicket?.expires_at);
    let synthesisAction: SessionAgentAction | undefined;
    for (let waveIndex = 0; waveIndex < 10 && !synthesisAction; waveIndex++)
      synthesisAction = sessionActionsForWave(
        config,
        selection,
        { work_id: workId, attempt: 1, scope_digest: taskScope.digest },
        workflowId,
        waveIndex,
        [],
      ).find((action) => action.stage_id === synthStage.id);
    assert.ok(synthesisAction);
    const synthesisRequest = buildSessionBridgeRequest({
        runId,
        workflowId,
        configDigest: runtimeConfigDigest(config),
        context: { work_id: workId, attempt: 1, scope_digest: taskScope.digest },
        waveIndex: synthesisAction.wave_index,
        action: synthesisAction,
        configuredContext: configuredContextForStage(hostRoot, config, workflowId, synthesisAction.stage_id, {
          work_id: workId,
          attempt: 1,
          scope_digest: taskScope.digest,
        }),
        priorResults: [],
      }),
      synthesisIssueId = '7f83a148-7c1d-4f87-9d5e-2b51a1d6c901',
      synthesisSummary = 'Use only the validated TaskSource root for source reads.',
      synthesisObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: synthesisRequest.action_id,
        issue_id: synthesisIssueId,
        agent_id: 'fixture:task-source-synthesizer',
        tool_call_ref: 'fixture:task-source-synthesis',
        status: 'reported_complete',
        summary: synthesisSummary,
        output_digest: canonicalJsonDigest(synthesisSummary),
        evidence_refs: [],
      } satisfies SessionBridgeObservation,
      synthesisItem = {
        request: synthesisRequest,
        issue_id: synthesisIssueId,
        observation: synthesisObservation,
      } satisfies MastraLedgerItem,
      packetJournal: MastraSessionLedgerState = {
        ...journal,
        schema: 'MastraSessionLedger/v1',
        completed: [{ step_id: synthStage.id, items: [synthesisItem] }],
      },
      packetLedger: MastraSessionLedgerSnapshot = {
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

    let developer: SessionAgentAction | undefined;
    for (let waveIndex = 0; waveIndex < 10 && !developer; waveIndex++) {
      const action = sessionActionsForWave(
        config,
        selection,
        { work_id: workId, attempt: 1, scope_digest: taskScope.digest },
        workflowId,
        waveIndex,
        [],
      ).find((entry) => entry.stage_kind === 'develop');
      if (action) developer = action;
    }
    assert.ok(developer);
    const attemptId = 'task-source-writer-attempt';
    const developerRequest = buildSessionBridgeRequest({
      runId,
      workflowId,
      configDigest: runtimeConfigDigest(config),
      context: { work_id: workId, attempt: 1, scope_digest: taskScope.digest },
      waveIndex: developer.wave_index,
      action: developer,
      configuredContext: configuredContextForStage(hostRoot, config, workflowId, developer.stage_id, {
        work_id: workId,
        attempt: 1,
        scope_digest: taskScope.digest,
      }),
      priorResults: [],
    });
    const developerSummary = 'Wrote the admitted TaskSource file.',
      developerObservation = {
        schema: 'VidaSessionObservation/v1',
        issue_id: '42a8cc63-3b7c-4a91-8e62-f07b5134d2a8',
        action_id: developerRequest.action_id,
        agent_id: 'fixture:task-source-developer',
        tool_call_ref: 'fixture:task-source-developer-call',
        status: 'reported_complete',
        summary: developerSummary,
        output_digest: canonicalJsonDigest(developerSummary),
        evidence_refs: [],
        host_attempt_id: attemptId,
        changed_paths: ['src/task.ts'],
      } satisfies SessionBridgeObservation,
      developerStage = workflow.stages.find((stage) => stage.id === developer.stage_id),
      developerAssignment = developerStage?.assignments[developer.assignment_index];
    assert.ok(developerStage && developerAssignment && currentWork.lease && currentHost.workVersion);
    const operation = config.operations.registry.find(
        (entry) => entry.profile === config.orchestration.mastra.default_profile && entry.tool === 'runtime.read',
      ),
      profile = operation && config.agents.profiles[operation.profile],
      roleInstruction = config.agents.role_instructions[developer.role];
    assert.ok(operation && profile && roleInstruction);
    const assignmentRequest: WorkflowAssignmentRequest = {
        repositoryRoot: hostRoot,
        configDigest: runtimeConfigDigest(config),
        teamId,
        workflowId,
        stageId: developer.stage_id,
        assignmentIndex: developer.assignment_index,
        workItemId: workId,
        workItemDigest: work.binding.work_item_digest,
        workContextDigest: canonicalJsonDigest({ binding: work.binding, permit: currentWork.lease }),
        input: developerRequest,
      },
      workContext: WorkExecutionContext = {
        schema: 'WorkExecutionContext/v1',
        binding: { ...work.binding, project_ids: [...work.binding.project_ids] },
        permit: {
          context_digest: assignmentRequest.workContextDigest,
          checkpoint_revision: currentWork.revision,
          checkpoint_digest: currentHost.workVersion.digest,
          runtime_current_revision: 1,
          stage_id: developer.stage_id,
          assignment_index: developer.assignment_index,
          dispatch_authorized: false,
          lease: {
            thread_id: currentWork.lease.thread_id,
            ticket_id: currentWork.lease.ticket_id,
            generation: currentWork.lease.generation,
            ledger_revision: currentHost.ledger.revision,
            expires_at: leaseTicket.expires_at,
            active_resources: [...leaseTicket.active_resources],
            blocked_resources: [...leaseTicket.blocked_resources],
          },
        },
      },
      developerAttempt: AssignmentAttempt = {
        assignment_id: developer.action_id,
        attempt_id: attemptId,
        previous_attempt_id: null,
        request_digest: canonicalJsonDigest(developerRequest),
        stage_id: developer.stage_id,
        assignment_index: developer.assignment_index,
        correction_generation: 0,
        correction_authorization: null,
        lease: currentWork.lease,
        status: 'completed',
        result: developerObservation,
        result_digest: canonicalJsonDigest(developerObservation),
        reconciliation: null,
      },
      invocation: TrustedWorkflowAssignment = {
        operation,
        authentication: {
          schema: 'TrustedHostAuthentication/v1',
          repositoryRoot: hostRoot,
          repositoryId: config.repository.repository_id,
          projectIds: [projectId],
          integrationsDigest: work.binding.integrations_digest,
          principal: 'task-source-integration-test',
          configRevision: 1,
          permittedOperations: [],
        },
        configDigest: runtimeConfigDigest(config),
        project,
        teamId,
        workflowId,
        stage: developerStage,
        assignment: developerAssignment,
        assignmentIndex: developer.assignment_index,
        attempt: developerAttempt,
        profile,
        roleInstruction,
        roleInstructionDigest: canonicalJsonDigest(roleInstruction),
        riskFlags: selection.risk_flags,
        workItem,
        workContext,
        input: developerRequest,
      },
      developerReservation: WorkflowSessionReservation = {
        schema: 'WorkflowSessionReservation/v1',
        request: assignmentRequest,
        invocation,
        receipt: {
          identity: workIdentity,
          workVersion: currentHost.workVersion,
          attempt: developerAttempt,
          maintenanceGeneration: currentHost.maintenanceGeneration,
        },
        requestDigest: canonicalJsonDigest(assignmentRequest),
        approvalAction: 'source.write',
        authorization: null,
      },
      developerItem = {
        request: developerRequest,
        issue_id: developerObservation.issue_id,
        observation: developerObservation,
        host_reservation: developerReservation,
      } satisfies MastraLedgerItem,
      finalJournal: MastraSessionLedgerState = {
        ...packetJournal,
        schema: 'MastraSessionLedger/v1',
        completed: [...packetJournal.completed, { step_id: developer.stage_id, items: [developerItem] }],
      },
      finalLedger: MastraSessionLedgerSnapshot = {
        version: { revision: 3, digest: canonicalJsonDigest(finalJournal) },
        state: finalJournal,
        resume_status: 'ready',
      },
      resultWork: WorkState = {
        ...currentWork,
        execution: {
          ...currentWork.execution,
          assignment_attempts: [...currentWork.execution.assignment_attempts, developerAttempt],
        },
      },
      resultHost: FixtureHostSnapshot = requireFixtureHostSnapshot({ ...currentHost, work: resultWork }),
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
      writerLease = hostWork(writerHost).lease;
    assert.ok(writerHost.workVersion && writerHost.ledgerVersion && writerLease);
    const writerReceipt = configuredStore.claimWorkflowAttempt({
      identity: workIdentity,
      expectedWork: writerHost.workVersion,
      expectedLedger: writerHost.ledgerVersion,
      stageId: developer.stage_id,
      assignmentIndex: developer.assignment_index,
      requestDigest: canonicalJsonDigest(writerRequest),
      lease: writerLease,
    });
    const writerAssignmentRequest: WorkflowAssignmentRequest = {
        ...assignmentRequest,
        input: writerRequest,
      },
      writerInvocation: TrustedWorkflowAssignment = {
        ...invocation,
        attempt: writerReceipt.attempt,
        input: writerRequest,
      },
      reservation: WorkflowSessionReservation = {
        ...developerReservation,
        request: writerAssignmentRequest,
        invocation: writerInvocation,
        receipt: writerReceipt,
        requestDigest: canonicalJsonDigest(writerAssignmentRequest),
      };
    const issuedWriter = sessionLedger.issueWave(workId, 1, preparedWriter.version, {
      [writerRequest.action_id]: reservation,
    });
    writeFileSync(taskSourcePath, 'Authorized writer postimage.\n');
    renewFromBoundSource(true);
    const writerIssue = issuedWriter.state.items[0];
    assert.ok(writerIssue);
    const writerIssueId = requiredLedgerIssueId(writerIssue);
    const updatedScope = snapshotDeclaredSources(requireSafeRepositoryAccess(taskRoot), ['src/task.ts']),
      writerSummary = 'Wrote the authorized TaskSource file.',
      writerObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: writerRequest.action_id,
        issue_id: writerIssueId,
        agent_id: 'fixture:task-source-writer',
        tool_call_ref: 'fixture:task-source-writer-call',
        status: 'reported_complete',
        summary: writerSummary,
        output_digest: canonicalJsonDigest(writerSummary),
        evidence_refs: [],
        host_attempt_id: writerReceipt.attempt.attempt_id,
        changed_paths: ['src/task.ts'],
      } satisfies SessionBridgeObservation;
    assert.ok(writerObservation.issue_id);
    configuredStore.completeWorkflowAttempt(writerReceipt, writerObservation);
    const nextWriterJournal: MastraSessionLedgerState = {
      ...issuedWriter.state,
      schema: 'MastraSessionLedger/v1',
      source_scope: updatedScope,
      items: issuedWriter.state.items.map((item) => ({ ...item, observation: writerObservation })),
    };
    configuredStore.commitCompletedSourceReport({
      identity: workIdentity,
      attempt: 1,
      expectedJournal: requiredJournalVersion(configuredStore.readWorkSessionJournal(workIdentity)),
      actionId: writerRequest.action_id,
      nextJournal: nextWriterJournal,
      verifyCurrent: () => {
        expect(snapshotDeclaredSources(requireSafeRepositoryAccess(taskRoot), ['src/task.ts']).digest).toBe(
          updatedScope.digest,
        );
      },
    });
    expect(hostWork(configuredStore.readHostStateSnapshot(workIdentity)).binding.work_source_revision).toBe(
      taskScope.digest,
    );
    expect(configuredStore.readCurrentTaskSourceBinding(workIdentity, threadId, 1)).toMatchObject({
      source_root: taskRoot,
      source_scope: { digest: taskScope.digest },
    });
    expect(configuredStore.snapshotCurrentTaskSourceSources(workIdentity, threadId, ['src/task.ts'], 1)).toEqual(
      updatedScope,
    );
    renewFromBoundSource();
    const actionRow = configuredDatabase
      .query<ActionRow, [string, string]>(
        'SELECT operation_id,request_id,revision,payload,digest FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
      )
      .get(workspaceId, sourceRequest.operation_id);
    assert.ok(actionRow);
    const malformedActionValue: unknown = JSON.parse(actionRow.payload);
    if (!isRecord(malformedActionValue) || !isRecord(malformedActionValue.prepared_state_version))
      throw new Error('Task source action fixture has no prepared state version.');
    const malformedAction = {
      ...malformedActionValue,
      prepared_state_version: {
        ...malformedActionValue.prepared_state_version,
        digest: '0'.repeat(64),
      },
    };
    const malformedPayload = canonicalJson(malformedAction),
      malformedDigest = canonicalJsonDigest(malformedAction);
    configuredDatabase
      .query(
        'UPDATE agent_host_task_source_binding_action SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
      )
      .run(malformedPayload, malformedDigest, workspaceId, sourceRequest.operation_id);
    expect(() => configuredStore.readCurrentTaskSourceBinding(workIdentity, threadId, 1)).toThrow(
      /action\/preparation/,
    );
    const beforeMalformedRenewal = configuredStore.readHostStateSnapshot(workIdentity);
    expect(() => renewFromBoundSource()).toThrow(/action\/preparation/);
    expect(configuredStore.readHostStateSnapshot(workIdentity)).toEqual(beforeMalformedRenewal);
    expect(() =>
      configuredStore.inspectTaskSourceBindingAction({
        request: sourceRequest,
        identity: workIdentity,
        verifyCurrent: () => ({
          source_authorization_sha256: authorizationReference.sha256,
          source_scope_digest: taskScope.digest,
        }),
      }),
    ).toThrow(/action\/preparation/);
    expect(() =>
      reportOn(configuredStore, {
        request: sourceRequest,
        identity: workIdentity,
        expectedActionStateVersion: { revision: actionRow.revision, digest: malformedDigest },
        report: sourceReport,
      }),
    ).toThrow(/action\/preparation/);
  } finally {
    sessionLedger?.close();
    configuredDatabase?.close();
    if (path.basename(hostRoot).startsWith('vida-task-source-real-host-') && path.dirname(hostRoot) === tmpdir())
      rmSync(hostRoot, { recursive: true, force: true });
  }
});

test.each(['prepare', 'issue'] as const)(
  'public TaskSource %s preserves its Host validation error when the admitted database close fails',
  async (mode) => {
    const fixture = makeConfiguredFixtureRoot(),
      { repositoryRoot, config, project } = fixture,
      workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
      databasePath = sessionHandoffDatabasePath(repositoryRoot, config),
      databaseRelativePath = path.relative(repositoryRoot, databasePath),
      requestPath = '.agent/work/task-source-close-fault-request.json';
    let closeSpy: { mockRestore(): void } | undefined;
    let execSpy: { mockRestore(): void } | undefined;
    let issueSpy: { mockRestore(): void } | undefined;
    let sourceHandle: Database | undefined;
    const sourceHandles: Database[] = [];
    const gateHandles: Database[] = [];
    let issueBodyError: unknown;
    let passed = false;
    try {
      mkdirSync(path.dirname(databasePath), { recursive: true });
      const setupDatabase = openFixtureDatabase(repositoryRoot, databasePath, workspaceId);
      new HostStateStore(setupDatabase, workspaceId, undefined, undefined, undefined, undefined, repositoryRoot);
      closeWorkspaceDatabaseWithAdmission(setupDatabase);
      const setupLedger = openConfiguredMastraSessionLedger(repositoryRoot);
      setupLedger.close();
      const schemaDatabase = openFixtureDatabase(repositoryRoot, databasePath, workspaceId);
      initializeTaskSourceBindingWorkProjectionSchema(schemaDatabase);
      closeWorkspaceDatabaseWithAdmission(schemaDatabase);
      const databaseBefore = readFileSync(databasePath),
        request: TaskSourceBindingRequest = {
          schema: 'TaskSourceBindingRequest/v1',
          operation: 'propose-create',
          operation_id: 'task-source-close-fault-operation',
          request_id: 'task-source-close-fault-request',
          branch_ref: 'refs/heads/codex/task-source-close-fault',
          expected_host: {
            work: { revision: 1, digest: 'a'.repeat(64) },
            ledger: { revision: 1, digest: 'b'.repeat(64) },
            journal: { attempt: 1, version: { revision: 1, digest: 'c'.repeat(64) } },
            maintenance_generation: 0,
          },
          canonical_host_root: repositoryRoot,
          work_id: 'task-source-close-fault-work',
          attempt: 1,
          thread_id: 'task-source-close-fault-thread',
          repository_id: config.repository.repository_id,
          project_ids: [...project.project_ids],
          config_digest: runtimeConfigDigest(config),
          project_context_digest: project.project_context_digest,
        };
      mkdirSync(path.dirname(path.join(repositoryRoot, requestPath)), { recursive: true });
      writeFileSync(path.join(repositoryRoot, requestPath), canonicalJson(request));
      const closeError = new Error('injected admitted Host native close failure'),
        originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close,
        originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec,
        originalIssue = Reflect.get(
          HostStateStore.prototype,
          'issueTaskSourceBindingOperation',
        ) as HostStateStore['issueTaskSourceBindingOperation'],
        gatePath = path.join(repositoryRoot, '.vida/storage-admission.v1.sqlite'),
        closeHandles: Database[] = [];
      assert.ok(existsSync(gatePath), 'fixture setup must bootstrap the native admission gate before injection');
      closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
        this: Database,
        force?: boolean,
      ): void {
        if (path.resolve(this.filename) === databasePath) {
          closeHandles.push(this);
          if (closeHandles.length === 1) throw closeError;
        }
        originalClose.call(this, force);
      });
      execSpy = spyOn(Database.prototype, 'exec').mockImplementation(function <ParamsType extends SQLQueryBindings[]>(
        this: Database,
        sql: string,
        ...bindings: ParamsType[]
      ): Changes {
        if (path.resolve(this.filename) === databasePath && sql === 'PRAGMA synchronous=FULL' && !sourceHandle) {
          assertWorkspaceDatabaseAdmission(this, repositoryRoot, databaseRelativePath, workspaceId);
          sourceHandles.push(this);
          sourceHandle = sourceHandles[0];
        }
        if (path.resolve(this.filename) === gatePath && sql.trim().toUpperCase() === 'BEGIN DEFERRED')
          gateHandles.push(this);
        return originalExec.call(this, sql, ...bindings);
      });
      if (mode === 'issue')
        issueSpy = spyOn(HostStateStore.prototype, 'issueTaskSourceBindingOperation').mockImplementation(function (
          this: HostStateStore,
          input: Parameters<HostStateStore['issueTaskSourceBindingOperation']>[0],
        ) {
          return originalIssue.call(this, input).catch((error: unknown) => {
            issueBodyError = error;
            throw error;
          });
        });

      const failure = await executeTaskSourceBindingOperation({
        repositoryRoot,
        mode,
        requestPath,
      }).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error('TaskSource prepare did not preserve both failures');
      expect(failure.errors).toHaveLength(2);
      const bodyError: unknown = failure.errors[0],
        cleanupError: unknown = failure.errors[1];
      expect(bodyError).toBeInstanceOf(Error);
      expect(bodyError).toHaveProperty('code', 'GAP-HOST-STATE-001');
      if (mode === 'prepare')
        expect(bodyError).toHaveProperty('message', 'task source preparation Host work is missing');
      else {
        expect(bodyError).toHaveProperty('message', 'task source operation must be prepared before issue');
        expect(issueBodyError).toBe(bodyError);
      }
      expect(cleanupError).toBeInstanceOf(AggregateError);
      if (!(cleanupError instanceof AggregateError)) throw new Error('Native close failure was not retained');
      expect(cleanupError.errors).toEqual([closeError]);
      expect(cleanupError.errors[0]).toBe(closeError);
      expect(sourceHandle).toBeInstanceOf(Database);
      expect(gateHandles.at(-1)).toBeInstanceOf(Database);
      const admittedSource = sourceHandle;
      const admittedGate = gateHandles.at(-1);
      if (!admittedSource || !admittedGate) throw new Error('Admitted source or its paired gate was not captured');
      expect(closeHandles).toEqual([admittedSource]);
      expect(admittedSource.query<{ value: number }, []>('SELECT 1 AS value').get()?.value).toBe(1);
      expect(admittedGate.inTransaction).toBe(true);
      expect(
        admittedSource
          .query<{ operation_id: string }, [string, string]>(
            'SELECT operation_id FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
          )
          .get(workspaceId, request.operation_id),
      ).toBeNull();
      expect(readFileSync(databasePath)).toEqual(databaseBefore);

      retryPendingWorkspaceDatabaseCloses();
      expect(closeHandles).toEqual([admittedSource, admittedSource]);
      expect(() => admittedSource.query('SELECT 1 AS value').get()).toThrow();
      expect(() => admittedGate.query('SELECT 1 AS value').get()).toThrow();
      closeSpy.mockRestore();
      closeSpy = undefined;
      execSpy.mockRestore();
      execSpy = undefined;
      issueSpy?.mockRestore();
      issueSpy = undefined;
      const admitted = openAdmittedWorkspaceDatabase(repositoryRoot, databaseRelativePath, workspaceId, false);
      closeWorkspaceDatabaseWithAdmission(admitted);
      expect(readFileSync(databasePath)).toEqual(databaseBefore);
      passed = true;
    } finally {
      closeSpy?.mockRestore();
      execSpy?.mockRestore();
      issueSpy?.mockRestore();
      try {
        retryPendingWorkspaceDatabaseCloses();
      } catch {
        // Preserve the fixture if the registered close owner still cannot settle.
      }
      if (passed) rmSync(repositoryRoot, { recursive: true, force: true });
    }
  },
);

test.each([
  ['source-planner', 'security-prewriter'],
  ['security-prewriter', 'source-planner'],
] as const)(
  'real Host reports attach source plan and high-risk policy: %s then %s with exact retry',
  async (firstRole, secondRole) => {
    const reportOrder = [firstRole, secondRole];
    const fixture = makePrewriterHostFixture();
    try {
      let journal = fixture.ledger.resume(fixture.workId, 1);
      assert.ok(journal);
      const issued = fixture.ledger.issueWave(fixture.workId, 1, journal.version),
        items = new Map(issued.state.items.map((item) => [item.request.role, item]));
      journal = issued;
      expect([...items.keys()].sort()).toEqual(['security-prewriter', 'source-planner']);
      let planObservation: ReturnType<typeof acceptedPreparationObservation> | undefined;
      for (const role of reportOrder) {
        const item = items.get(role);
        assert.ok(item);
        const action = fixtureActionForRole(fixture, role),
          kind = role === 'source-planner' ? 'source_plan' : 'implementation_policy',
          record = preparationRecord(fixture, action, kind),
          observation = acceptedPreparationObservation(action, record, requiredLedgerIssueId(item));
        if (role === 'source-planner') planObservation = observation;
        journal = fixture.ledger.report(fixture.workId, 1, journal.version, observation, fixture.taskScope);
        const host = fixture.store.readHostStateSnapshot(fixture.workIdentity),
          currentPlans = hostWork(host).lifecycle.references.filter(
            (reference) => reference.kind === 'source_plan' && reference.disposition === 'current',
          ),
          currentPolicies = hostWork(host).lifecycle.references.filter(
            (reference) => reference.kind === 'implementation_policy' && reference.disposition === 'current',
          );
        if (role === 'security-prewriter' && reportOrder[0] === 'security-prewriter') {
          expect(hostWork(host).lifecycle.phase).toBe('INTAKE');
          expect(currentPlans).toHaveLength(0);
          expect(currentPolicies).toHaveLength(0);
        } else if (role === 'source-planner' && reportOrder[0] === 'source-planner') {
          expect(hostWork(host).lifecycle.phase).toBe('PLAN');
          expect(currentPlans).toHaveLength(1);
          expect(currentPolicies).toHaveLength(0);
        } else if (role === 'source-planner') {
          expect(hostWork(host).lifecycle.phase).toBe('PLAN');
          expect(currentPlans).toHaveLength(1);
          expect(currentPolicies).toHaveLength(1);
        }
      }
      assert.ok(planObservation);
      const retry = fixture.ledger.report(fixture.workId, 1, issued.version, planObservation, fixture.taskScope);
      const afterRetry = fixture.store.readHostStateSnapshot(fixture.workIdentity);
      expect(retry.version).toEqual(journal.version);
      expect(hostWork(afterRetry).lifecycle.phase).toBe('PLAN');
      const sourcePlans = hostWork(afterRetry).lifecycle.references.filter(
        (reference) => reference.kind === 'source_plan',
      );
      assert.ok(sourcePlans[0]);
      expect(sourcePlans).toHaveLength(1);
      expect(
        hostWork(afterRetry).lifecycle.references.filter((reference) => reference.kind === 'implementation_policy'),
      ).toHaveLength(1);
    } finally {
      fixture.close();
    }
  },
);

test('rejects a changed Host owner after the TRACE snapshot and before source-plan publication', () => {
  const deadline = performance.now() + 5_000;
  const fixture = makePrewriterHostFixture();
  let completed = false;
  let bodyError: unknown;
  let cleanupError: unknown;
  let cleanupFailed = false;
  try {
    const admitted = fixture.store.readHostStateSnapshot(fixture.workIdentity),
      admittedWork = hostWork(admitted),
      admittedLedger = admitted.ledger;
    assert.ok(admittedLedger && admitted.workVersion && admitted.ledgerVersion);
    const traced = fixture.store.projectLifecycleTransition(
      admittedWork,
      'TRACE',
      'Trace the accepted source plan against the current scope and acceptance.',
    );
    const traceSnapshot = fixture.store.compareAndSwapHostState({
      expectedWork: admitted.workVersion,
      expectedLedger: admitted.ledgerVersion,
      expectedMaintenanceGeneration: admitted.maintenanceGeneration,
      nextWork: traced,
      nextLedger: { ...admittedLedger, revision: admittedLedger.revision + 1 },
    });
    expect(hostWork(traceSnapshot).lifecycle.phase).toBe('TRACE');

    const journal = fixture.ledger.resume(fixture.workId, 1);
    assert.ok(journal);
    const issued = fixture.ledger.issueWave(fixture.workId, 1, journal.version),
      planner = issued.state.items.find((item) => item.request.role === 'source-planner');
    assert.ok(planner);
    const action = fixtureActionForRole(fixture, 'source-planner'),
      record = preparationRecord(fixture, action, 'source_plan'),
      observation = acceptedPreparationObservation(action, record, requiredLedgerIssueId(planner));

    const reportHost = fixture.ledger.hostState;
    const originalReadWorkspaceSnapshot = reportHost.readWorkspaceSnapshot.bind(reportHost);
    let workspaceReads = 0;
    let racedHost: HostStateSnapshot | undefined;
    const workspaceRead = spyOn(reportHost, 'readWorkspaceSnapshot').mockImplementation(() => {
      const captured = originalReadWorkspaceSnapshot();
      workspaceReads += 1;
      if (workspaceReads === 2) {
        const beforeRace = fixture.store.readHostStateSnapshot(fixture.workIdentity),
          raceWork = hostWork(beforeRace),
          raceLedger = beforeRace.ledger;
        assert.ok(raceLedger && beforeRace.workVersion && beforeRace.ledgerVersion);
        racedHost = fixture.store.compareAndSwapHostState({
          expectedWork: beforeRace.workVersion,
          expectedLedger: beforeRace.ledgerVersion,
          expectedMaintenanceGeneration: beforeRace.maintenanceGeneration,
          nextWork: {
            ...raceWork,
            revision: raceWork.revision + 1,
            lifecycle: { ...raceWork.lifecycle, revision: raceWork.lifecycle.revision + 1 },
          },
          nextLedger: { ...raceLedger, revision: raceLedger.revision + 1 },
        });
      }
      return captured;
    });
    let reportError: unknown;
    try {
      fixture.ledger.report(fixture.workId, 1, issued.version, observation, fixture.taskScope);
    } catch (error) {
      reportError = error;
    } finally {
      workspaceRead.mockRestore();
    }

    expect(workspaceReads).toBe(2);
    assert.ok(racedHost);
    expect(hostWork(racedHost).revision).toBe(traceSnapshot.work!.revision + 1);
    expect(hostWork(racedHost).lifecycle.phase).toBe('TRACE');
    expect(hostWork(racedHost).lifecycle.references.filter((entry) => entry.kind === 'source_plan')).toHaveLength(0);
    expect(fixture.store.readHostStateSnapshot(fixture.workIdentity)).toEqual(racedHost);
    const retainedJournal = fixture.ledger.resume(fixture.workId, 1);
    assert.ok(retainedJournal);
    expect(
      retainedJournal.state.items.find((item) => item.request.action_id === observation.action_id)?.observation,
    ).toEqual(observation);
    expect(
      existsSync(
        path.join(
          fixture.repositoryRoot,
          fixture.config.control.work_root,
          fixture.workId,
          'preparations',
          `source-plan-${action.action_id}.v1.json`,
        ),
      ),
    ).toBe(false);
    assert.ok(reportError instanceof Error);
    expect(reportError.message).toContain('prewriter attachment Host owner, phase or configuration differs');
    assert.ok(performance.now() < deadline, 'prewriter race regression exceeded its five-second case deadline');
    completed = true;
  } catch (error) {
    bodyError = error;
  }
  try {
    fixture.close({ retainRoot: !completed, deadline });
  } catch (error) {
    cleanupError = error;
    cleanupFailed = true;
  }
  if (cleanupFailed)
    throw new AggregateError(completed ? [cleanupError] : [bodyError, cleanupError], 'Prewriter race cleanup failed');
  if (!completed) throw bodyError;
}, 5_000);

test('low lifecycle risk still attaches security policy when the admitted packet has the high flag', async () => {
  const fixture = makePrewriterHostFixture({ lifecycleRisk: 'low', packetRiskFlags: ['high'] });
  try {
    const journal = fixture.ledger.resume(fixture.workId, 1);
    assert.ok(journal);
    const issued = fixture.ledger.issueWave(fixture.workId, 1, journal.version),
      items = new Map(issued.state.items.map((item) => [item.request.role, item]));
    expect([...items.keys()].sort()).toEqual(['security-prewriter', 'source-planner']);
    let current = issued;
    for (const role of ['source-planner', 'security-prewriter']) {
      const item = items.get(role);
      assert.ok(item);
      const action = fixtureActionForRole(fixture, role),
        kind = role === 'source-planner' ? 'source_plan' : 'implementation_policy',
        record = preparationRecord(fixture, action, kind),
        observation = acceptedPreparationObservation(action, record, requiredLedgerIssueId(item));
      current = fixture.ledger.report(fixture.workId, 1, current.version, observation, fixture.taskScope);
    }
    const host = fixture.store.readHostStateSnapshot(fixture.workIdentity),
      policies = hostWork(host).lifecycle.references.filter(
        (reference) => reference.kind === 'implementation_policy' && reference.disposition === 'current',
      );
    expect(hostWork(host).lifecycle.risk).toBe('low');
    expect(policies).toHaveLength(1);
    assert.ok(policies[0]);
    expect(JSON.parse(readFileSync(path.join(fixture.repositoryRoot, policies[0].path), 'utf8'))).toMatchObject({
      kind: 'implementation_policy',
      status: 'pass',
      observer_id: 'fixture:security-prewriter',
    });
  } finally {
    fixture.close();
  }
});

// Both public calls re-enter the full initialized runtime and verify persisted policy, wire output, and Host CAS.
test('public run awaits configured TaskSource policy and serializes the persisted Host issue result', async () => {
  const fixture = makePrewriterHostFixture({ includeSourceAuthorization: true });
  let completed = false;
  try {
    const journal = fixture.ledger.resume(fixture.workId, 1);
    assert.ok(journal);
    const issuedPrewriter = fixture.ledger.issueWave(fixture.workId, 1, journal.version);
    let currentJournal = issuedPrewriter;
    for (const role of ['source-planner', 'security-prewriter']) {
      const item = issuedPrewriter.state.items.find((entry) => entry.request.role === role);
      assert.ok(item);
      const action = fixtureActionForRole(fixture, role),
        kind = role === 'source-planner' ? 'source_plan' : 'implementation_policy',
        record = preparationRecord(fixture, action, kind),
        observation = acceptedPreparationObservation(action, record, requiredLedgerIssueId(item));
      currentJournal = fixture.ledger.report(fixture.workId, 1, currentJournal.version, observation, fixture.taskScope);
    }

    const { repositoryRoot, config, project, workIdentity, workId, threadId } = fixture,
      workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
      initializationPath = path.join(repositoryRoot, '.agent', 'runtime-initialization.v1.json'),
      initializationSchema = readRuntimePackageResourceBytes(
        runtimePackageAccess(),
        'schemas/runtime-initialization.v1.schema.json',
        'TaskSource public run initialization schema',
      ),
      initialization = {
        schema: 'RuntimeInitialization/v1',
        version: 1,
        repository_id: config.repository.repository_id,
        project_ids: [...project.project_ids],
        integrations_digest: canonicalJsonDigest(config.integrations),
        workspace_id: workspaceId,
        workspace_binding_status: 'pending',
        bundle: config.runtime.bundle,
        config_digest: runtimeConfigDigest(config),
        schema_sha256: createHash('sha256').update(initializationSchema).digest('hex'),
        templates: fixtureInitializationTemplates(repositoryRoot, packageRoot),
        created_at: new Date().toISOString(),
      },
      host = requireFixtureHostSnapshot(fixture.store.readHostStateSnapshot(workIdentity)),
      sourceRoot = path.join(repositoryRoot, '.tmp', 'task-source-public-issue-' + workId),
      branchRef = 'refs/heads/codex/task-source-public-' + workId,
      requestPath = `.agent/work/${workId}/task-source-binding-request.json`,
      request: TaskSourceBindingRequest = {
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
        project_ids: [...project.project_ids],
        canonical_host_root: repositoryRoot,
        config_digest: runtimeConfigDigest(config),
        project_context_digest: project.project_context_digest,
      };
    mkdirSync(path.dirname(initializationPath), { recursive: true });
    writeFileSync(initializationPath, canonicalJson(initialization));
    mkdirSync(path.dirname(path.join(repositoryRoot, requestPath)), { recursive: true });
    writeFileSync(path.join(repositoryRoot, requestPath), canonicalJson(request));

    const prepared: unknown = await run([
        '--project-root',
        repositoryRoot,
        '--task-source-operation',
        'prepare',
        '--task-source-request',
        requestPath,
      ]),
      issued: unknown = await run([
        '--project-root',
        repositoryRoot,
        '--task-source-operation',
        'issue',
        '--task-source-request',
        requestPath,
      ]),
      wire: unknown = JSON.parse(JSON.stringify(issued));
    if (!isRecord(prepared) || prepared.status !== 'task_source_prepare')
      throw new Error('Public run did not return a task-source preparation result.');
    if (!isRecord(issued) || !isRecord(wire) || !isRecord(wire.operation) || !isRecord(wire.operation.action))
      throw new Error('Public run did not return a task-source issue result.');
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
        command_argv: [
          ['-C', repositoryRoot, 'worktree', 'add', '--branch', branchRef.slice('refs/heads/'.length), sourceRoot],
        ],
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
    const finalJournal = fixture.ledger.resume(workId, 1);
    assert.ok(finalJournal);
    expect(finalJournal.version).toEqual(currentJournal.version);
    completed = true;
  } finally {
    fixture.close({ retainRoot: !completed });
  }
}, 20_000);

test('a reported GAP source plan is retained in TRACE and does not advance lifecycle or attach policy', async () => {
  const fixture = makePrewriterHostFixture();
  try {
    const journal = fixture.ledger.resume(fixture.workId, 1);
    assert.ok(journal);
    const issued = fixture.ledger.issueWave(fixture.workId, 1, journal.version),
      planner = issued.state.items.find((item) => item.request.role === 'source-planner');
    assert.ok(planner);
    const plannerAction = fixtureActionForRole(fixture, 'source-planner'),
      gapRecord = preparationRecord(fixture, plannerAction, 'source_plan', 'gap'),
      observation = acceptedPreparationObservation(plannerAction, gapRecord, requiredLedgerIssueId(planner)),
      reported = fixture.ledger.report(fixture.workId, 1, issued.version, observation, fixture.taskScope),
      host = fixture.store.readHostStateSnapshot(fixture.workIdentity),
      reference = hostWork(host).lifecycle.references.find((entry) => entry.kind === 'source_plan');
    const reportedPlanner = reported.state.items.find((item) => item.request.role === 'source-planner');
    assert.ok(reportedPlanner);
    expect(reportedPlanner.observation).toEqual(observation);
    expect(hostWork(host).lifecycle.phase).toBe('TRACE');
    assert.ok(reference);
    expect(reference).toMatchObject({ kind: 'source_plan', disposition: 'current' });
    expect(JSON.parse(readFileSync(path.join(fixture.repositoryRoot, reference.path), 'utf8'))).toMatchObject({
      kind: 'source_plan',
      status: 'gap',
      gaps: ['The plan does not establish a safe verification and rollback path.'],
    });
    expect(hostWork(host).lifecycle.references.filter((entry) => entry.kind === 'implementation_policy')).toHaveLength(
      0,
    );
  } finally {
    fixture.close();
  }
});
