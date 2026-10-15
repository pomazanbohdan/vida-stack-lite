import { test, expect } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import { executeDocumentationClearOperation } from '../src/documentation/clear.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { validateLifecycleReferencePreservation } from '../src/lifecycle/lifecycle-state.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.ts';
import type { LocalWorkAdmissionInput } from '../src/orchestration/local-work-admission.ts';
import type { RuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import type { StateVersion } from '../src/host-state.ts';
import type { HostStateSnapshot, WorkState } from '../src/host-state.ts';
import type { MastraLedgerItem } from '../src/orchestration/persistent-session-handoff.ts';
import type { FinalAssuranceReport } from '../src/orchestration/final-assurance.ts';
import { z } from 'zod';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import type { TrustedWorkflowAssignment, WorkflowAssignmentRequest } from '../src/runtime-kernel.ts';
import type { WorkExecutionContext } from '../src/orchestration/workflow-session-reservation-contract.ts';
import { workflowWorkItemSchema } from '../src/orchestration/workflow-session-reservation-contract.ts';
import { expectReturned } from './helpers/expect-rejection.ts';
import type {
  SessionBridgeObservation,
  SessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
type MutableAdmissionInput = Omit<
  LocalWorkAdmissionInput,
  'selection' | 'workItem' | 'sourceAuthorizationPath' | 'intakePath'
> & {
  selection: {
    -readonly [Key in keyof LocalWorkAdmissionInput['selection']]: LocalWorkAdmissionInput['selection'][Key];
  };
  workItem: { -readonly [Key in keyof LocalWorkAdmissionInput['workItem']]: LocalWorkAdmissionInput['workItem'][Key] };
  sourceAuthorizationPath?: string;
  intakePath?: string;
};
const publicRunResultSchema = z
  .object({
    schema: z.literal('VidaAgentRunResult/v1'),
    status: z.enum([
      'assurance_resumed',
      'assurance_wave_issued',
      'assurance_report_retrieved',
      'assurance_reported',
      'delivery',
    ]),
    assurance_status: z.enum(['ready', 'issued_outcome_uncertain', 'blocked', 'reviewed']),
    runtime_acceptance: z.literal('pending_attributable_user_testing'),
    delivery_gap: z.string().nullable(),
    state_version: z.object({ revision: z.number().int(), digest: z.string() }),
    next_actions: z.array(z.unknown()),
    issued_actions: z.array(
      z.object({
        action_id: z.string(),
        issue_id: z.string(),
        perspective: z.enum(['correctness', 'security', 'assurance']),
        packet: z.object({
          packet_id: z.string(),
          role: z.string(),
          generation: z.number(),
          implementation_fingerprint: z.string(),
          scope_id: z.string(),
        }),
      }),
    ),
    delivery_manifest: z.object({ path: z.string() }).passthrough().nullable(),
  })
  .passthrough();
type PublicRunResult = z.infer<typeof publicRunResultSchema>;
const deniedRunResultSchema = z.object({ status: z.literal('blocked') }).passthrough();
function requireWork(work: WorkState | null): asserts work is WorkState {
  if (!work) throw new Error('Expected the admitted public fixture work state.');
}
function requireVersion(version: StateVersion | null): StateVersion {
  if (!version) throw new Error('Expected the admitted public fixture state version.');
  return version;
}
function currentWork(snapshot: HostStateSnapshot): WorkState {
  requireWork(snapshot.work);
  return snapshot.work;
}
function listed<T>(values: readonly T[] | undefined, index: number): T {
  const value = values?.[index];
  if (value === undefined) throw new Error('Expected the indexed public fixture result.');
  return value;
}
async function expectAsyncReturned<T>(operation: () => Promise<T>): Promise<T> {
  let result: { value: T } | undefined;
  await assert.doesNotReject(async () => {
    result = { value: await operation() };
  });
  if (!result) throw new Error('Expected async public fixture operation to fulfill.');
  return result.value;
}
function fixture(sourceWriter: boolean = false, publicStore: boolean = false) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-absorption-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'absorption-repository')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Test fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Test fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root);
  if (publicStore) mkdirSync(path.join(root, config.control.work_root), { recursive: true });
  const workspaceId = publicStore ? deriveWorkspaceId(config.repository.repository_id, root) : 'a'.repeat(64);
  const database = openHostStateDatabase(
      root,
      publicStore ? path.posix.join(config.control.work_root, 'session-handoff.v1.sqlite') : 'fixture.sqlite',
      workspaceId,
    ),
    store = new HostStateStore(database, workspaceId),
    source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const selection: MutableAdmissionInput['selection'] = {
    team: 'default-development',
    kind: sourceWriter ? 'feature' : 'research',
    intent: sourceWriter ? 'implementation_change' : 'information_research',
    project: 'sample',
    risk_flags: [],
    labels: [],
  };
  function prepare(id: string, pointer: string, thread = 'session'): MutableAdmissionInput {
    mkdirSync(path.join(root, '.agent', 'work', id), { recursive: true });
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + id,
      work_id: id,
      source_revision: source.digest,
      ac_ids: ['AC-SHARED'],
      allowed_paths: ['AGENT.sidecar.md'],
      implementation_paths: ['AGENT.sidecar.md'],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Source mutation'],
      acceptance_trace: ['AC-SHARED'],
      behavior_trace: ['SR-SHARED'],
      test_trace: ['fixture'],
      diagnostic_trace: ['fixture'],
      attribution: { thread_id: thread, pointer },
      owner: 'fixture',
      created_at: new Date().toISOString(),
    };
    const acceptance = {
      schema: 'AcceptanceManifest/v1',
      id: 'acceptance-' + id,
      version: 1,
      ac_ids: scope.ac_ids,
      source: 'AGENT.sidecar.md',
      scope: scope.scope_id,
      source_revision: source.digest,
      contracts: [{ id: 'AC-SHARED', definition: 'Preserve unfinished scope', sr: 'SR-SHARED', evidence: ['fixture'] }],
    };
    const scopePath = `.agent/work/${id}/scope.json`,
      acceptancePath = `.agent/work/${id}/acceptance.json`;
    writeFileSync(path.join(root, scopePath), JSON.stringify(scope));
    writeFileSync(path.join(root, acceptancePath), JSON.stringify(acceptance));
    return {
      repositoryRoot: root,
      config,
      store,
      selection,
      context: { work_id: id, attempt: 1, scope_digest: source.digest },
      nativeSessionHandle: thread,
      workItem: {
        schema: 'WorkItem/v1',
        id,
        canonical_kind: selection.kind,
        intent: selection.intent,
        project_id: 'sample',
        title: 'Fixture ' + id,
        description: 'Unfinished acceptance',
        risk_flags: [],
        labels: [],
        provider: 'local',
        provider_type: 'Research',
      },
      scopePath,
      acceptancePath,
      runtimeCodePaths: ['vida-agent/bin/run.mjs'],
      route: 'R2',
      risk: 'low',
      changeKind: 'feature',
    };
  }
  return {
    root,
    config,
    database,
    store,
    prepare,
    close(options?: { completed: boolean; deadline: number }) {
      try {
        closeWorkspaceDatabaseWithAdmission(database);
      } catch (error) {
        console.error('Retaining public final assurance fixture after database close failure:', root, error);
        throw error;
      }
      if (options?.completed && Number.isFinite(options.deadline) && performance.now() < options.deadline) {
        try {
          rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        } catch (error) {
          console.error('Retaining public final assurance fixture after cleanup failure:', root, error);
          throw error;
        }
      } else {
        console.error('Retaining public final assurance fixture for incomplete or expired case:', root);
      }
    },
  };
}

test('public final assurance commits three synthetic review reverse pairs at a released nonzero maintenance generation', async () => {
  const deadline = performance.now() + 90000;
  const f = fixture(true, true);
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const invoke = (args: string[]) =>
    spawnSync(
      process.execPath,
      [
        '--no-env-file',
        '--no-install',
        '--config=' + path.join(bundle, 'bunfig.toml'),
        path.join(bundle, 'bin/run.ts'),
        ...args,
      ],
      { cwd: bundle, encoding: 'utf8', windowsHide: true, timeout: 30000 },
    );
  const publicRun = (args: string[]) => {
    const result = expectReturned(() => invoke(args));
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(typeof result.stdout).toBe('string');
    if (typeof result.stdout !== 'string') throw new Error('Public run succeeded without string stdout.');
    const output: unknown = JSON.parse(result.stdout);
    return publicRunResultSchema.parse(output);
  };
  const denied = (args: string[]) => {
    const result = invoke(args);
    expect(result.status).toBe(1);
    expect(result.error).toBeUndefined();
    const lines = result.stderr
      .trim()
      .split(/\r?\n/u)
      .filter((line) => line.startsWith('{"schema":"VidaAgentRunResult/v1"'));
    expect(lines).toHaveLength(1);
    const line = lines[0];
    if (line === undefined) throw new Error('Public denial result line is absent.');
    const output: unknown = JSON.parse(line);
    expect(deniedRunResultSchema.parse(output).status).toBe('blocked');
  };
  try {
    const maintenancePrincipal = 'fixture:maintenance-host',
      maintenanceStore = new HostStateStore(f.database, f.store.workspaceId, undefined, undefined, undefined, {
        principal: maintenancePrincipal,
        projectIds: ['sample'],
        verify: (fence) => ({
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: maintenancePrincipal,
          fence_digest: canonicalJsonDigest(fence),
          closure_digest: fence.binding.closure_digest,
          bundle_digest: fence.binding.bundle_digest,
        }),
      }),
      maintenanceReceipt = maintenanceStore.acquireMaintenanceFence({
        schema: 'MaintenanceFenceBinding/v1',
        project_ids: ['sample'],
        operation_id: 'assurance-public-maintenance',
        manifest_digest: '1'.repeat(64),
        request_digest: '2'.repeat(64),
        bindings_digest: '3'.repeat(64),
        closure_digest: '4'.repeat(64),
        bundle_digest: '5'.repeat(64),
      });
    expect(maintenanceReceipt.fence.generation).toBe(1);
    const maintenanceRelease = await expectAsyncReturned(() =>
      maintenanceStore.releaseMaintenanceFence(maintenanceReceipt),
    );
    expect(maintenanceRelease.status).toBe('released');

    const id = 'assurance-public',
      input = f.prepare(id, 'user:current-correction');
    input.selection.kind = 'task';
    input.selection.intent = 'task_execution';
    input.workItem = { ...input.workItem, canonical_kind: 'task', intent: 'task_execution', provider_type: 'Task' };
    const sourceAuthorizationPath = `.agent/work/${id}/authorization.json`;
    input.sourceAuthorizationPath = sourceAuthorizationPath;
    writeFileSync(
      path.join(f.root, sourceAuthorizationPath),
      JSON.stringify({
        schema: 'LocalSourceWriteAuthorization/v1',
        action: 'source.write',
        user_instruction_ref: 'fixture:actual-owner-directive',
        work_id: id,
        attempt: 1,
        scope_digest: input.context.scope_digest,
        config_digest: runtimeConfigDigest(f.config),
        workflow_id: 'task_execution',
        stage_ids: ['develop_task'],
        implementation_paths: ['AGENT.sidecar.md'],
        native_session_handle: 'session',
      }),
    );
    const intakePath = `.agent/work/${id}/raw-intake.json`;
    input.intakePath = intakePath;
    writeFileSync(
      path.join(f.root, intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        source_authorization_path: input.sourceAuthorizationPath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const initial = admitLocalSessionWork(input);
    expect(initial.host.maintenanceGeneration).toBe(1);
    const work = initial.host.work;
    requireWork(work);
    const runId = work.execution.run_id;
    if (!runId) throw new Error('Admitted public fixture has no execution run ID.');
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: id,
    };
    const initialization = {
      schema: 'RuntimeInitialization/v1',
      version: 1,
      repository_id: f.config.repository.repository_id,
      project_ids: ['sample'],
      integrations_digest: canonicalJsonDigest(f.config.integrations),
      workspace_id: f.store.workspaceId,
      workspace_binding_status: 'pending',
      bundle: f.config.runtime.bundle,
      config_digest: runtimeConfigDigest(f.config),
      schema_sha256: createHash('sha256')
        .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
        .digest('hex'),
      templates: fixtureInitializationTemplates(f.root, bundle),
      created_at: new Date().toISOString(),
    } satisfies RuntimeInitializationReceipt;
    writeFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), JSON.stringify(initialization));
    const sourceLease = acquireLocalSourceWriterLease({
      repositoryRoot: f.root,
      config: f.config,
      store: f.store,
      identity,
      nativeSessionHandle: 'session',
      stageId: 'develop_task',
      assignmentIndex: 0,
      expectedWork: requireVersion(initial.host.workVersion),
      expectedLedger: requireVersion(initial.host.ledgerVersion),
    });
    const writerStage = f.config.workflows.task_execution?.stages.find((stage) => stage.id === 'develop_task');
    const writerAssignment = writerStage?.assignments[0];
    const writerOperation = f.config.operations.registry.find(
      (entry) => entry.profile === f.config.orchestration.mastra.default_profile && entry.tool === 'runtime.read',
    );
    const writerProfile = writerOperation && f.config.agents.profiles[writerOperation.profile];
    const writerRoleInstruction = writerAssignment && f.config.agents.role_instructions[writerAssignment.role];
    const writerLease = sourceLease.work?.lease;
    if (
      !writerStage ||
      !writerAssignment ||
      !writerOperation ||
      !writerProfile ||
      !writerRoleInstruction ||
      !writerLease
    )
      throw new Error('Configured workflow assignment evidence is unavailable.');
    const workContext = {
      schema: 'WorkExecutionContext/v1',
      binding: work.binding,
      permit: {
        context_digest: canonicalJsonDigest({ work_id: id, stage_id: writerStage.id, assignment_index: 0 }),
        checkpoint_revision: requireVersion(sourceLease.workVersion).revision,
        checkpoint_digest: requireVersion(sourceLease.workVersion).digest,
        runtime_current_revision: 1,
        stage_id: writerStage.id,
        assignment_index: 0,
        dispatch_authorized: false,
        lease: {
          thread_id: writerLease.thread_id,
          ticket_id: writerLease.ticket_id,
          generation: writerLease.generation,
          ledger_revision: requireVersion(sourceLease.ledgerVersion).revision,
          expires_at: new Date(Date.now() + 60_000).toISOString(),
          active_resources: work.binding.allowed_resources,
          blocked_resources: [],
        },
      },
    } satisfies WorkExecutionContext;
    const workflowWorkItem = workflowWorkItemSchema.parse(input.workItem);
    const assignmentRequest = {
      repositoryRoot: f.root,
      configDigest: runtimeConfigDigest(f.config),
      teamId: input.selection.team,
      workflowId: 'task_execution',
      stageId: writerStage.id,
      assignmentIndex: 0,
      workItemId: id,
      workItemDigest: canonicalJsonDigest(workflowWorkItem),
      workContextDigest: canonicalJsonDigest(workContext),
      input: {},
    } satisfies WorkflowAssignmentRequest;
    const claimed = f.store.claimWorkflowAttempt({
      identity,
      expectedWork: requireVersion(sourceLease.workVersion),
      expectedLedger: requireVersion(sourceLease.ledgerVersion),
      expectedMaintenanceGeneration: sourceLease.maintenanceGeneration,
      stageId: 'develop_task',
      assignmentIndex: 0,
      requestDigest: canonicalJsonDigest(assignmentRequest),
      lease:
        sourceLease.work?.lease ??
        (() => {
          throw new Error('Admitted source writer lease is absent.');
        })(),
    });
    const args = [
      '--project-root',
      f.root,
      '--repository',
      f.config.repository.repository_id,
      '--project',
      'sample',
      '--work-path',
      'AGENT.sidecar.md',
      '--work-id',
      id,
      '--attempt',
      '1',
      '--scope-digest',
      work.binding.work_source_revision,
      '--team',
      'default-development',
      '--kind',
      'task',
      '--intent',
      'task_execution',
      '--workflow',
      'task_execution',
    ];

    // Synthetic focused history is a fixture precondition, not an observation of native workers.
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), work.lifecycle.scope.allowed_paths);
    const waves = compileDevelopmentWorkflow(f.config, input.selection.team, 'task_execution', []).waves;
    const makeItem = (stage: string, index: number = 0): MastraLedgerItem => {
      const wave = waves.findIndex((stages) => stages.some((value) => value.id === stage));
      expect(wave).toBeGreaterThanOrEqual(0);
      if (wave < 0) throw new Error('Synthetic fixture stage is absent from the selected workflow: ' + stage);
      const action = sessionActionsForWave(f.config, input.selection, input.context, 'task_execution', wave, []).find(
        (action) => action.stage_id === stage && action.assignment_index === index,
      );
      if (!action) throw new Error('Synthetic fixture assignment is absent from the selected workflow: ' + stage);
      const request = {
        schema: 'VidaSessionRequest/v1',
        run_id: runId,
        workflow_id: 'task_execution',
        wave_index: wave,
        action_id: action.action_id,
        assignment_index: index,
        stage_id: stage,
        role: action.role,
        config_digest: work.binding.config_digest,
        scope_digest: work.binding.work_source_revision,
        bindings_manifest_ref: '3'.repeat(64),
      } satisfies SessionBridgeRequest;
      const summary =
        stage === 'review_source_prewrite'
          ? JSON.stringify({
              schema: 'LifecyclePreparationObservation/v1',
              record_id: 'synthetic-source-plan',
              kind: 'source_plan',
              work_id: id,
              attempt: 1,
              source_revision: work.binding.work_source_revision,
              scope_id: work.binding.scope_id,
              config_digest: work.binding.config_digest,
              ac_ids: work.binding.ac_ids,
              observed_at: new Date().toISOString(),
              observer_id: 'synthetic-source-planner',
              status: 'pass',
              evidence_refs: ['local://synthetic-fixture/focused'],
              observations: ['scope_acceptance_trace', 'verification_rollback'].map((mechanic) => ({
                mechanic,
                actual: 'Explicit synthetic prerequisite fixture',
                evidence_ref: 'local://synthetic-fixture/focused',
              })),
              gaps: [],
            })
          : stage === 'validate_focused'
            ? JSON.stringify({
                schema: 'VidaValidatorVerdict/v1',
                verdict: 'pass',
                findings: [],
                evidence_refs: ['local://synthetic-fixture/focused'],
              })
            : stage === 'test_task'
              ? JSON.stringify({
                  schema: 'VidaTesterVerdict/v1',
                  status: 'pass',
                  evidence_refs: ['local://synthetic-fixture/focused'],
                })
              : 'Synthetic fixture focused writer outcome';
      const observation = {
        schema: 'VidaSessionObservation/v1',
        action_id: action.action_id,
        issue_id: randomUUID(),
        agent_id: 'synthetic-focused-' + stage + '-' + index,
        tool_call_ref: 'local:synthetic-focused-' + action.action_id,
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['local://synthetic-fixture/focused'],
        ...(stage === 'develop_task' ? { host_attempt_id: claimed.attempt.attempt_id, changed_paths: [] } : {}),
      } satisfies SessionBridgeObservation;
      return { request, issue_id: observation.issue_id, observation };
    };
    const focused: MastraLedgerItem[] = [
      makeItem('develop_task'),
      makeItem('validate_focused', 0),
      makeItem('validate_focused', 1),
      makeItem('test_task'),
    ];
    const focusedWriter = listed(focused, 0);
    if (!focusedWriter.observation) throw new Error('Synthetic focused writer observation is absent.');
    f.store.completeWorkflowAttempt(claimed, focusedWriter.observation);
    const writerAttempt = listed(currentWork(f.store.readHostStateSnapshot(identity)).execution.assignment_attempts, 0);
    const invocation = {
      operation: writerOperation,
      authentication: {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot: f.root,
        repositoryId: f.config.repository.repository_id,
        projectIds: identity.project_ids,
        integrationsDigest: identity.integrations_digest,
        principal: 'final-assurance-public-fixture',
        configRevision: 1,
        permittedOperations: [],
      },
      configDigest: runtimeConfigDigest(f.config),
      project: loadProjectSetContext(f.root, f.config, identity.repository_id, identity.project_ids),
      teamId: input.selection.team,
      workflowId: 'task_execution',
      stage: writerStage,
      assignment: writerAssignment,
      assignmentIndex: 0,
      attempt: writerAttempt,
      profile: writerProfile,
      roleInstruction: writerRoleInstruction,
      roleInstructionDigest: canonicalJsonDigest(writerRoleInstruction),
      riskFlags: input.selection.risk_flags,
      workItem: workflowWorkItem,
      workContext,
      input: {},
    } satisfies TrustedWorkflowAssignment;
    const writerWithReservation: MastraLedgerItem = {
      ...focusedWriter,
      host_reservation: {
        schema: 'WorkflowSessionReservation/v1',
        request: assignmentRequest,
        invocation,
        receipt: {
          ...claimed,
          attempt: writerAttempt,
        },
        requestDigest: canonicalJsonDigest(assignmentRequest),
        approvalAction: null,
        authorization: null,
      },
    };
    focused.splice(0, 1, writerWithReservation);
    const journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: f.store.workspaceId,
      work_id: id,
      attempt: 1,
      run_id: runId,
      source_scope: source,
      step_id: null,
      items: [],
      completed: [makeItem('review_source_prewrite'), ...focused].map((item, index) => ({
        step_id: 'synthetic-focused-' + index,
        items: [item],
      })),
    };
    f.database
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(f.store.workspaceId, id, 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
    const originalJournal = f.store.readWorkSessionJournal(identity);
    if (!originalJournal) throw new Error('Expected the committed synthetic session journal.');
    const originalVersion = requireVersion(originalJournal.version);
    const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
    writeFileSync(
      path.join(f.root, policyPath),
      JSON.stringify({
        schema: 'DocumentationPolicy/v1',
        policy_id: 'corrective-public-fixture',
        project_id: 'sample',
        source_path: policyPath,
        owner: 'fixture',
        required: false,
        canonical_roots: ['docs'],
        map_paths: ['AGENT.sidecar.md'],
        excluded_roots: [],
        changelog_required: false,
        changelog_path: null,
        relations: ['documents'],
        updated_at: new Date().toISOString(),
      }),
    );
    const doc = {
      repository_root: f.root,
      repository_id: work.binding.repository_id,
      project_id: 'sample',
      work_id: id,
      source_revision: work.binding.work_source_revision,
      scope_paths: ['AGENT.sidecar.md'],
    };
    const baselineClear = await expectAsyncReturned(() => executeDocumentationClearOperation(doc, 'baseline'));
    expect(typeof baselineClear.path).toBe('string');
    const clear = await expectAsyncReturned(() => executeDocumentationClearOperation(doc, 'closeout'));
    expect(typeof clear.path).toBe('string');
    const mechanics: Record<string, string[]> = {
      source_plan: ['scope_acceptance_trace', 'verification_rollback'],
      platform_knowledge: ['platform_contracts', 'official_reference_lookup'],
      implementation_policy: ['root_cause_owner', 'affected_callers', 'existing_primitives'],
      change_impact_pre: ['affected_paths', 'invalidation', 'rollback'],
      documentation_validation: ['current_inventory', 'current_clear'],
    };
    const prerequisites = Object.entries(mechanics).map(([kind, labels]) => {
      const file = `.agent/work/${id}/${kind}.json`;
      writeFileSync(
        path.join(f.root, file),
        JSON.stringify({
          schema: 'LifecyclePreparationObservation/v1',
          record_id: kind,
          kind,
          work_id: id,
          attempt: 1,
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          config_digest: work.binding.config_digest,
          ac_ids: work.binding.ac_ids,
          observed_at: new Date().toISOString(),
          observer_id: 'fixture-observer',
          status: 'pass',
          evidence_refs: ['local://fixture/current-source'],
          observations: labels.map((mechanic) => ({
            mechanic,
            actual: 'Explicit isolated current contract fixture observation',
            evidence_ref: 'local://fixture/current-source',
          })),
          gaps: [],
        }),
      );
      return { kind, path: file };
    });
    const preparationPath = `.agent/work/${id}/preparation.json`;
    writeFileSync(
      path.join(f.root, preparationPath),
      JSON.stringify({
        schema: 'FinalAssurancePreparation/v1',
        work_id: id,
        attempt: 1,
        prerequisites,
        documentation_precheck_path: clear.path,
        clear_path: clear.path,
        delivery_manifest_path: `.agent/work/${id}/delivery.json`,
      }),
    );

    writeFileSync(
      path.join(f.root, '.agent/work/' + id + '/delivery.json'),
      JSON.stringify({
        schema: 'FinalAssuranceDelivery/v1',
        work_id: id,
        implementation_fingerprint: source.digest,
        destination: 'synthetic-fixture-only',
        order: ['AGENT.sidecar.md'],
        post_deployment_checks: ['Inspect isolated fixture source'],
        created_files: [],
        modified_files: ['AGENT.sidecar.md'],
        repository_only_files: [],
      }),
    );
    const preparation = path.join(f.root, preparationPath);
    const withVersion = (version: StateVersion, ...tail: string[]) => [
      ...args,
      ...tail,
      '--expected-revision',
      String(version.revision),
      '--expected-digest',
      version.digest,
    ];
    const sourceFile = path.join(f.root, 'AGENT.sidecar.md'),
      originalSource = readFileSync(sourceFile);
    writeFileSync(sourceFile, 'Synthetic source drift');
    const beforeDriftDenial = f.store.readHostStateSnapshot(identity);
    denied(withVersion(originalVersion, '--prepare-assurance', preparation));
    const afterDriftDenial = f.store.readHostStateSnapshot(identity);
    expect(afterDriftDenial.work).toEqual(beforeDriftDenial.work);
    expect(afterDriftDenial.ledger).toEqual(beforeDriftDenial.ledger);
    writeFileSync(sourceFile, originalSource);

    const retainedReferences = currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.references;
    let response = publicRun(withVersion(originalVersion, '--prepare-assurance', preparation));
    const preparedReferences = currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.references;
    expect(preparedReferences.length).toBeGreaterThan(retainedReferences.length);
    expect(() => validateLifecycleReferencePreservation(retainedReferences, preparedReferences)).not.toThrow();
    expect(response.assurance_status).toBe('ready');
    expect(response.next_actions).toHaveLength(3);
    expect(
      currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.references.filter(
        (item) => item.kind === 'validation_receipt',
      ),
    ).toHaveLength(2);
    response = publicRun(withVersion(response.state_version, '--issue-wave', 'true'));
    expect(response.issued_actions).toHaveLength(3);
    const initialAssuranceVersion = response.state_version,
      packet = listed(response.issued_actions, 0).packet,
      reviews: Array<Extract<FinalAssuranceReport, { schema: 'FinalAssuranceReview/v1' }>> = [];
    expect(packet.role).toBe('correctness-validator');
    const checks = {
      scope_and_trace: 'pass',
      tests_security_rollback: 'pass',
      evidence_invalidation_binding: 'pass',
    } satisfies Extract<FinalAssuranceReport, { schema: 'FinalAssuranceReview/v1' }>['checks'];
    const reportFile = path.join(f.root, '.agent/work/' + id + '/synthetic-assurance-report.json');
    const report = (value: unknown, version: StateVersion = response.state_version): PublicRunResult => {
      writeFileSync(reportFile, JSON.stringify(value));
      return publicRun(withVersion(version, '--report', reportFile));
    };
    for (const [index, action] of (response.issued_actions ?? []).entries())
      reviews.push({
        schema: 'FinalAssuranceReview/v1',
        work_id: id,
        attempt: 1,
        packet_id: packet.packet_id,
        action_id: action.action_id,
        issue_id: action.issue_id,
        generation: packet.generation,
        implementation_fingerprint: packet.implementation_fingerprint,
        scope_id: packet.scope_id,
        agent_id: 'synthetic-reviewer-' + index,
        history_id: 'synthetic-isolated-history-' + index,
        tool_call_ref: 'local:synthetic-review-' + index,
        verdict: 'pass',
        evidence_refs: ['local://synthetic-fixture/review-' + index],
        perspective: action.perspective,
        findings: [],
        checks,
      });
    const firstReview = listed(reviews, 0);
    writeFileSync(reportFile, JSON.stringify({ ...firstReview, attempt: 2 }));
    denied(withVersion(response.state_version, '--report', reportFile));
    response = report(firstReview);
    expect(response.assurance_status).toBe('issued_outcome_uncertain');
    expect(report(firstReview, initialAssuranceVersion).status).toBe('assurance_report_retrieved');
    const secondReview = listed(reviews, 1);
    writeFileSync(reportFile, JSON.stringify(secondReview));
    denied(withVersion(initialAssuranceVersion, '--report', reportFile));
    response = report(secondReview);
    expect(currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.phase).toBe('VERIFY');
    response = report(listed(reviews, 2));
    response = publicRun(withVersion(response.state_version, '--issue-wave', 'true'));
    expect(response.issued_actions).toHaveLength(3);
    const reverseActions = response.issued_actions;
    if (!reverseActions) throw new Error('Public reverse action list is absent.');
    const reverses = reverseActions.map((action) => {
      const prior = reviews.find((review) => review.perspective === action.perspective);
      if (!prior) throw new Error('Public reverse action has no matching review.');
      const { schema: _schema, perspective: _perspective, findings: _findings, ...binding } = prior;
      return {
        ...binding,
        schema: 'FinalAssuranceReverse/v1',
        action_id: action.action_id,
        issue_id: action.issue_id,
        tool_call_ref: 'local:synthetic-reverse-' + prior.perspective,
        evidence_refs: ['local://synthetic-fixture/reverse-' + prior.perspective],
        review_action_id: prior.action_id,
        review_issue_id: prior.issue_id,
      };
    });
    for (const reverse of reverses.slice(0, 2)) {
      response = report(reverse);
      expect(currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.phase).toBe('VERIFY');
    }
    // A changed CLEAR artifact cannot publish DELIVERY. The six reports stay durable.
    const clearFile = path.join(f.root, clear.path),
      clearBytes = readFileSync(clearFile),
      clearValue: unknown = JSON.parse(clearBytes.toString('utf8')),
      badClear = z.object({ work_id: z.string() }).passthrough().parse(clearValue);
    badClear.work_id = 'synthetic-foreign-work';
    writeFileSync(clearFile, JSON.stringify(badClear));
    const finalReverse = listed(reverses, 2);
    response = report(finalReverse);
    expect(response.assurance_status).toBe('reviewed');
    expect(response.delivery_gap).toBeTruthy();
    expect(currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.phase).toBe('VERIFY');
    expect(
      currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.references.filter(
        (ref) =>
          ref.disposition === 'current' &&
          ['review_receipt', 'reverse_validation', 'documentation_clear', 'delivery_manifest'].includes(ref.kind),
      ),
    ).toHaveLength(0);
    writeFileSync(clearFile, clearBytes);
    response = report(finalReverse);
    expect(response.status).toBe('delivery');
    expect(response.runtime_acceptance).toBe('pending_attributable_user_testing');
    expect(response.delivery_gap).toBeNull();
    const final = currentWork(f.store.readHostStateSnapshot(identity)),
      current = final.lifecycle.references.filter((ref) => ref.disposition === 'current');
    expect(final.lifecycle.phase).toBe('DELIVERY');
    expect(final.execution.run_id).toBe(runId);
    const eight = current.filter((ref) =>
      ['review_receipt', 'reverse_validation', 'documentation_clear', 'delivery_manifest'].includes(ref.kind),
    );
    expect(eight).toHaveLength(8);
    expect(eight.every((ref) => ref.generation === packet.generation || ref.kind === 'delivery_manifest')).toBe(true);
    expect(response.delivery_manifest?.path).toBe('.agent/work/' + id + '/delivery.json');
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close({ completed, deadline });
          return undefined;
        },
      ],
      bodyFailed ? { error: bodyError } : undefined,
    );
  }
}, 90000);
