import { test, expect, spyOn } from 'bun:test';
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
import { mastraLedgerStatus } from '../src/orchestration/persistent-session-handoff.ts';
import {
  finalAssuranceReceiptReferences,
  prepareFinalAssurance,
  prepareLifecycleForCorrection,
  readCorrectivePlanningJournal,
  validateWorkSessionBindingAndReturnCorrectiveAuthority,
} from '../src/orchestration/final-assurance.ts';
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
import { createFailedFinalCorrectionFixture } from './helpers/failed-final-correction-fixture.ts';
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
          observer_id: 'synthetic-caller-report-fixture',
          status: 'pass',
          evidence_refs: ['local://fixture/current-source'],
          observations: labels.map((mechanic) => ({
            mechanic,
            actual:
              'Synthetic typed fixture input; no native planning, research, or documentation observation occurred.',
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
    expect(response.status).toBe('assurance_resumed');
    const preparedReferences = currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.references;
    expect(preparedReferences.length).toBeGreaterThan(retainedReferences.length);
    expect(() => validateLifecycleReferencePreservation(retainedReferences, preparedReferences)).not.toThrow();
    expect(response.assurance_status).toBe('ready');
    const directHostBefore = f.store.readHostStateSnapshot(identity),
      directJournal = f.store.readWorkSessionJournal(identity),
      existingAssurance = f.store.readFinalAssurance(identity, 1);
    if (!directJournal || !existingAssurance || !directHostBefore.workVersion || !directHostBefore.ledgerVersion)
      throw new Error('Expected persisted public preparation state before direct retry.');
    const directInput = {
      root: f.root,
      config: f.config,
      store: f.store,
      identity,
      journal: { ...directJournal, resume_status: mastraLedgerStatus(directJournal.state) },
      preparationPath,
    };
    const packetReference = currentWork(directHostBefore).lifecycle.references.find(
      (reference) => reference.kind === 'review_packet' && reference.disposition === 'current',
    );
    if (!packetReference) throw new Error('Expected the current public assurance packet reference.');
    const packetFile = path.join(f.root, packetReference.path),
      packetBefore = readFileSync(packetFile),
      directRetry = expectReturned(() => prepareFinalAssurance(directInput));
    expect(directRetry.version).toEqual(response.state_version);
    expect(directRetry).toEqual(existingAssurance);
    const packetValue: unknown = JSON.parse(packetBefore.toString('utf8'));
    assert.equal(canonicalJson(packetValue), canonicalJson(directRetry.state.packet));
    expect(readFileSync(packetFile)).toEqual(packetBefore);
    const directHostAfter = f.store.readHostStateSnapshot(identity);
    expect(directHostAfter.work).toEqual(directHostBefore.work);
    expect(directHostAfter.ledger).toEqual(directHostBefore.ledger);
    expect(directHostAfter.workVersion).toEqual(directHostBefore.workVersion);
    expect(directHostAfter.ledgerVersion).toEqual(directHostBefore.ledgerVersion);

    writeFileSync(sourceFile, 'Synthetic source drift after assurance publication');
    let driftFailure: { error: unknown } | undefined;
    try {
      expect(() => prepareFinalAssurance(directInput)).toThrow(
        'GAP-FINAL-ASSURANCE-001: current source differs from accepted focused evidence',
      );
    } catch (error) {
      driftFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            writeFileSync(sourceFile, originalSource);
            return undefined;
          },
        ],
        driftFailure,
      );
    }
    expect(readFileSync(sourceFile)).toEqual(originalSource);
    const directHostAfterDrift = f.store.readHostStateSnapshot(identity);
    expect(directHostAfterDrift.work).toEqual(directHostBefore.work);
    expect(directHostAfterDrift.ledger).toEqual(directHostBefore.ledger);
    expect(directHostAfterDrift.workVersion).toEqual(directHostBefore.workVersion);
    expect(directHostAfterDrift.ledgerVersion).toEqual(directHostBefore.ledgerVersion);
    expect(readFileSync(packetFile)).toEqual(packetBefore);
    expect(response.next_actions).toHaveLength(3);
    expect(
      currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.references.filter(
        (item) => item.kind === 'validation_receipt',
      ),
    ).toHaveLength(2);
    response = publicRun(withVersion(response.state_version, '--issue-wave', 'true'));
    expect(response.status).toBe('assurance_wave_issued');
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
    expect(response.status).toBe('assurance_reported');
    expect(response.assurance_status).toBe('issued_outcome_uncertain');
    const beforeReplay = f.store.readHostStateSnapshot(identity);
    const replayed = report(firstReview, initialAssuranceVersion);
    const afterReplay = f.store.readHostStateSnapshot(identity);
    expect(replayed.status).toBe('assurance_report_retrieved');
    expect(replayed.assurance_status).toBe('issued_outcome_uncertain');
    expect(replayed.state_version).toEqual(response.state_version);
    expect(afterReplay.work).toEqual(beforeReplay.work);
    expect(afterReplay.ledger).toEqual(beforeReplay.ledger);
    expect(afterReplay.workVersion).toEqual(beforeReplay.workVersion);
    expect(afterReplay.ledgerVersion).toEqual(beforeReplay.ledgerVersion);
    const secondReview = listed(reviews, 1);
    writeFileSync(reportFile, JSON.stringify(secondReview));
    const beforeStaleReportDenial = f.store.readHostStateSnapshot(identity);
    denied(withVersion(initialAssuranceVersion, '--report', reportFile));
    const afterStaleReportDenial = f.store.readHostStateSnapshot(identity);
    expect(afterStaleReportDenial.work).toEqual(beforeStaleReportDenial.work);
    expect(afterStaleReportDenial.ledger).toEqual(beforeStaleReportDenial.ledger);
    expect(afterStaleReportDenial.workVersion).toEqual(beforeStaleReportDenial.workVersion);
    expect(afterStaleReportDenial.ledgerVersion).toEqual(beforeStaleReportDenial.ledgerVersion);
    response = report(secondReview);
    expect(response.status).toBe('assurance_reported');
    expect(currentWork(f.store.readHostStateSnapshot(identity)).lifecycle.phase).toBe('VERIFY');
    response = report(listed(reviews, 2));
    expect(response.status).toBe('assurance_reported');
    response = publicRun(withVersion(response.state_version, '--issue-wave', 'true'));
    expect(response.status).toBe('assurance_wave_issued');
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
      expect(response.status).toBe('assurance_reported');
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
    expect(response.status).toBe('assurance_reported');
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
    const deliveredHost = f.store.readHostStateSnapshot(identity),
      final = currentWork(deliveredHost),
      current = final.lifecycle.references.filter((ref) => ref.disposition === 'current');
    expect(final.lifecycle.phase).toBe('DELIVERY');
    expect(final.execution.run_id).toBe(runId);
    const eight = current.filter((ref) =>
      ['review_receipt', 'reverse_validation', 'documentation_clear', 'delivery_manifest'].includes(ref.kind),
    );
    expect(eight).toHaveLength(8);
    const published = eight.map((reference) => {
      const file = path.join(f.root, reference.path),
        bytes = readFileSync(file);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(reference.sha256);
      return { file, bytes };
    });
    const reviewedAssurance = f.store.readFinalAssurance(identity, 1);
    if (!reviewedAssurance) throw new Error('Expected persisted reviewed final assurance.');
    const sourceReferences = expectReturned(() =>
      finalAssuranceReceiptReferences(f.root, final, reviewedAssurance.state),
    );
    assert.equal(canonicalJson(eight), canonicalJson(sourceReferences));
    for (const { file, bytes } of published) expect(readFileSync(file)).toEqual(bytes);
    const afterReferences = f.store.readHostStateSnapshot(identity);
    expect(afterReferences.work).toEqual(deliveredHost.work);
    expect(afterReferences.ledger).toEqual(deliveredHost.ledger);
    expect(afterReferences.workVersion).toEqual(deliveredHost.workVersion);
    expect(afterReferences.ledgerVersion).toEqual(deliveredHost.ledgerVersion);
    expect(f.store.readFinalAssurance(identity, 1)).toEqual(reviewedAssurance);
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

// Fresh admission, writer completion and dependent reports share the measured fixture's composite budget.
test('direct Source preparation recovers interrupted packet publication from the completed current Journal', async () => {
  const f = await createFailedFinalCorrectionFixture('passing');
  let completed = false;
  let bodyFailure: { error: unknown } | undefined;
  try {
    const before = f.store.readHostStateSnapshot(f.identity),
      journal = f.store.readWorkSessionJournal(f.identity);
    if (!journal || !before.workVersion || !before.ledgerVersion)
      throw new Error('Expected fresh persisted Host and Journal state before direct preparation.');
    assert.ok(journal.state.source_scope);
    expect(f.store.readFinalAssurance(f.identity, 1)).toBeNull();
    expect(journal.state.work_id).toBe(f.identity.work_id);
    expect(journal.state.source_scope?.digest).toBe(
      snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), currentWork(before).lifecycle.scope.allowed_paths)
        .digest,
    );
    const reports = journal.state.completed.flatMap((wave) => wave.items),
      validators = reports.filter((item) => item.request.stage_id === 'validate_focused'),
      tester = reports.filter((item) => item.request.stage_id === 'test_task'),
      writer = reports.find((item) => item.request.stage_id === 'develop_task');
    expect(validators).toHaveLength(2);
    expect(validators.every((item) => item.observation?.status === 'reported_complete')).toBe(true);
    expect(validators.every((item) => item.issue_id === item.observation?.issue_id)).toBe(true);
    expect(
      validators.map((item) => {
        const value: unknown = JSON.parse(item.observation!.summary);
        const verdict = z
          .object({
            schema: z.literal('VidaValidatorVerdict/v1'),
            verdict: z.literal('pass'),
            findings: z.array(z.string()).length(0),
            evidence_refs: z.array(z.string()),
          })
          .strict()
          .parse(value);
        expect(verdict.evidence_refs).toEqual(item.observation!.evidence_refs);
        return verdict.verdict;
      }),
    ).toEqual(['pass', 'pass']);
    expect(tester).toHaveLength(1);
    expect(tester[0]?.observation?.status).toBe('reported_complete');
    expect(tester[0]?.issue_id).toBe(tester[0]?.observation?.issue_id);
    const testerReport: unknown = JSON.parse(tester[0]!.observation!.summary);
    expect(testerReport).toEqual({
      schema: 'VidaTesterVerdict/v1',
      status: 'pass',
      evidence_refs: tester[0]!.observation!.evidence_refs,
    });
    expect(writer?.observation?.status).toBe('reported_complete');
    expect(writer?.host_reservation).toBeDefined();
    expect(writer?.observation?.host_attempt_id).toBe(writer?.host_reservation?.receipt.attempt.attempt_id);
    expect(currentWork(before).execution.assignment_attempts[0]?.status).toBe('completed');

    expect(f.store.readFinalAssurance(f.identity, 1)).toBeNull();
    const preparation = {
      root: f.root,
      config: f.config,
      store: f.store,
      identity: f.identity,
      journal: { ...journal, resume_status: mastraLedgerStatus(journal.state) },
      preparationPath: f.preparationPath,
    };
    const projectTransition = f.store.projectLifecycleTransition.bind(f.store),
      sealInterruption = new Error('Controlled interruption after implementation seal publication.'),
      transition = spyOn(f.store, 'projectLifecycleTransition').mockImplementation((work, target, action, context) => {
        if (target === 'VERIFY') throw sealInterruption;
        return projectTransition(work, target, action, context);
      });
    let transitionFailure: { error: unknown } | undefined;
    try {
      assert.throws(
        () => prepareFinalAssurance(preparation),
        (error: unknown) => error === sealInterruption,
      );
    } catch (error) {
      transitionFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            transition.mockRestore();
            return undefined;
          },
        ],
        transitionFailure,
      );
    }
    const sealedHost = f.store.readHostStateSnapshot(f.identity),
      sealedWork = currentWork(sealedHost);
    expect(sealedWork.lifecycle.phase).toBe('EXECUTE');
    expect(sealedWork.lifecycle.seal?.implementation_fingerprint).toBe(journal.state.source_scope.digest);
    expect(
      sealedWork.lifecycle.references.some(
        (reference) =>
          reference.kind === 'implementation_result' &&
          reference.disposition === 'current' &&
          reference.implementation_fingerprint === journal.state.source_scope?.digest,
      ),
    ).toBe(true);
    expect(f.store.readFinalAssurance(f.identity, 1)).toBeNull();
    const interruption = new Error('Controlled interruption before assurance CAS.'),
      publication = spyOn(f.store, 'compareAndSwapFinalAssurance').mockImplementationOnce(() => {
        throw interruption;
      });
    let interruptedFailure: { error: unknown } | undefined;
    try {
      assert.throws(
        () => prepareFinalAssurance(preparation),
        (error: unknown) => error === interruption,
      );
      expect(publication).toHaveBeenCalledTimes(1);
    } catch (error) {
      interruptedFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            publication.mockRestore();
            return undefined;
          },
        ],
        interruptedFailure,
      );
    }
    expect(f.store.readFinalAssurance(f.identity, 1)).toBeNull();
    const interruptedHost = f.store.readHostStateSnapshot(f.identity),
      interruptedWork = currentWork(interruptedHost),
      interruptedPacket = interruptedWork.lifecycle.references.find(
        (reference) => reference.kind === 'review_packet' && reference.disposition === 'current',
      );
    expect(interruptedWork.lifecycle.phase).toBe('VERIFY');
    assert.ok(interruptedPacket?.path);
    const retainedPacket = readFileSync(path.join(f.root, interruptedPacket.path));
    expect(createHash('sha256').update(retainedPacket).digest('hex')).toBe(interruptedPacket.sha256);
    const prepared = expectReturned(() => prepareFinalAssurance(preparation));
    const persisted = f.store.readFinalAssurance(f.identity, 1),
      after = f.store.readHostStateSnapshot(f.identity),
      work = currentWork(after);
    expect(persisted).toEqual(prepared);
    expect(persisted).not.toBeNull();
    expect(prepared.state.packet.work_id).toBe(f.identity.work_id);
    expect(prepared.state.packet.attempt).toBe(1);
    expect(prepared.state.packet.scope_id).toBe(work.binding.scope_id);
    expect(prepared.state.packet.implementation_fingerprint).toBe(journal.state.source_scope.digest);
    expect(work.lifecycle.phase).toBe('VERIFY');
    const packetReference = work.lifecycle.references.find(
      (reference) => reference.kind === 'review_packet' && reference.disposition === 'current',
    );
    assert.ok(packetReference?.path);
    const packetBytes = readFileSync(path.join(f.root, packetReference.path)),
      packetValue: unknown = JSON.parse(packetBytes.toString('utf8'));
    expect(createHash('sha256').update(packetBytes).digest('hex')).toBe(packetReference.sha256);
    expect(canonicalJson(packetValue)).toBe(canonicalJson(prepared.state.packet));
    expect(packetBytes).toEqual(retainedPacket);
    expect(packetReference).toEqual(interruptedPacket);
    expect(after).toEqual(interruptedHost);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
    completed = true;
  } catch (error) {
    bodyFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(completed);
          return undefined;
        },
      ],
      bodyFailure,
    );
  }
}, 20000);

// Real admission, writer completion and two durable failed validators exceed the default five-second case budget.
test('failed final correction preparation consumes persisted Host and CAS-bound failed Journal evidence', async () => {
  const f = await createFailedFinalCorrectionFixture();
  let completed = false;
  let bodyFailure: { error: unknown } | undefined;
  try {
    const preparation = {
      root: f.root,
      config: f.config,
      store: f.store,
      identity: f.identity,
      journal: f.journal,
      preparationPath: f.preparationPath,
    };
    assert.ok(f.tracedHost);
    assert.ok(f.plannedHost);
    expect(currentWork(f.tracedHost).lifecycle.phase).toBe('TRACE');
    expect(currentWork(f.plannedHost).lifecycle.phase).toBe('PLAN');
    const beforeRace = f.store.readHostStateSnapshot(f.identity),
      journalBeforeRace = f.store.readWorkSessionJournal(f.identity);
    for (const staleHost of [f.tracedHost, f.plannedHost]) {
      expect(staleHost.workVersion).not.toEqual(beforeRace.workVersion);
      const staleRead = spyOn(f.store, 'readHostStateSnapshot').mockReturnValueOnce(staleHost);
      let raceFailure: { error: unknown } | undefined;
      try {
        expect(() => prepareLifecycleForCorrection(preparation)).toThrow('state compare-and-swap conflict');
      } catch (error) {
        raceFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              staleRead.mockRestore();
              return undefined;
            },
          ],
          raceFailure,
        );
      }
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(beforeRace);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBeforeRace);
    }
    const prepared = expectReturned(() => prepareLifecycleForCorrection(preparation));
    const persisted = f.store.readHostStateSnapshot(f.identity),
      currentJournal = f.store.readWorkSessionJournal(f.identity),
      work = currentWork(persisted);
    if (!currentJournal) throw new Error('Expected the persisted failed-final fixture Journal.');
    expect(work.lifecycle.phase).toBe('VERIFY');
    expect(work.lifecycle.assurance.correction_count).toBe(0);
    expect(work.execution.assignment_attempts).toHaveLength(1);
    expect(prepared.work).toEqual(persisted.work);
    expect(prepared.ledger).toEqual(persisted.ledger);
    expect(prepared.workVersion).toEqual(persisted.workVersion);
    expect(prepared.ledgerVersion).toEqual(persisted.ledgerVersion);
    expect(f.journal.state).toEqual(currentJournal.state);
    expect(f.journal.version).toEqual(currentJournal.version);
    expect(() => readCorrectivePlanningJournal(f.root, work, f.journal)).toThrow(
      'corrective planning requested for base execution',
    );

    const all = [...f.journal.state.items, ...f.journal.state.completed.flatMap((wave) => wave.items)],
      failed = all.filter((item) => item.observation?.status === 'reported_failed'),
      writer = all.find((item) => item.request.stage_id === 'develop_task');
    expect(failed).toHaveLength(2);
    expect(failed.every((item) => item.request.stage_id === 'validate_focused')).toBe(true);
    expect(failed.every((item) => item.observation?.issue_id === item.issue_id)).toBe(true);
    expect(writer?.observation?.status).toBe('reported_complete');
    expect(writer?.host_reservation).toBeDefined();
    expect(writer?.observation?.host_attempt_id).toBe(writer?.host_reservation?.receipt.attempt.attempt_id);
    expect(f.preparationPath).toBe(`.agent/work/${f.identity.work_id}/preparation.json`);

    if (!prepared.workVersion || !prepared.ledgerVersion) throw new Error('Expected persisted preparation versions.');
    const issued = f.store.authorizeCorrectiveExecution({
        identity: f.identity,
        attempt: 1,
        expectedWork: prepared.workVersion,
        expectedLedger: prepared.ledgerVersion,
        expectedJournal: currentJournal.version,
        stageIds: ['develop_task', 'validate_focused', 'test_task'],
        userInstructionRef: 'fixture:actual-correction-owner',
        config: f.config,
      }),
      authorizedHost = f.store.readHostStateSnapshot(f.identity),
      authorizedJournal = f.store.readWorkSessionJournal(f.identity);
    if (!authorizedHost.work || !authorizedHost.workVersion || !authorizedHost.ledgerVersion)
      throw new Error('Expected the persisted Host correction authorization.');
    if (!authorizedJournal) throw new Error('Expected the persisted corrective Journal.');
    const authorizedWork = authorizedHost.work,
      journal = authorizedJournal,
      execution = journal.state.corrective_execution;
    if (!execution) throw new Error('Expected the persisted corrective Journal execution.');
    if (!authorizedWork.execution.run_id) throw new Error('Expected the persisted base run identity.');
    const correctiveJournal = {
      ...journal,
      resume_status: mastraLedgerStatus(journal.state),
    };
    const originalPlanning = readCorrectivePlanningJournal(f.root, authorizedWork, correctiveJournal);
    assert.equal(canonicalJson(originalPlanning), canonicalJson(f.journal.state));
    expect(originalPlanning.corrective_execution ?? null).toBeNull();
    expect(originalPlanning.run_id).toBe(authorizedWork.execution.run_id);
    expect(() =>
      readCorrectivePlanningJournal(
        f.root,
        {
          ...authorizedWork,
          lifecycle: {
            ...authorizedWork.lifecycle,
            references: authorizedWork.lifecycle.references.filter(
              (reference) =>
                reference.kind !== 'recovery' || reference.artifact_schema !== 'CorrectiveExecutionRecovery/v1',
            ),
          },
        },
        correctiveJournal,
      ),
    ).toThrow('immutable original planning recovery missing');
    const authorityPath = path.join(f.root, execution.authorization.path),
      authorityBytes = readFileSync(authorityPath),
      persistedAuthority: unknown = JSON.parse(authorityBytes.toString('utf8')),
      validateCurrentAuthority = (root?: string, current: WorkState = authorizedWork) =>
        validateWorkSessionBindingAndReturnCorrectiveAuthority(
          current,
          {
            attempt: journal.attempt,
            run_id: journal.state.run_id,
            corrective_execution: execution,
          },
          root,
        );
    expect(execution).toEqual(issued);
    const actualAuthority = validateCurrentAuthority(f.root);
    assert.deepEqual(actualAuthority, persistedAuthority);
    expect(actualAuthority).not.toBeNull();
    expect(actualAuthority?.attempt).toBe(journal.attempt);
    expect(actualAuthority?.work_id).toBe(authorizedWork.binding.lifecycle_work_id);
    expect(actualAuthority?.run_id).toBe(authorizedWork.execution.run_id);
    expect(actualAuthority?.base_run_id).toBe(execution.base_run_id);
    expect(actualAuthority?.engine_run_id).toBe(execution.engine_run_id);
    expect(actualAuthority?.correction_generation).toBe(authorizedWork.lifecycle.assurance.correction_count);
    expect(actualAuthority?.source_revision).toBe(authorizedWork.binding.work_source_revision);
    expect(actualAuthority?.scope_id).toBe(authorizedWork.binding.scope_id);
    expect(actualAuthority?.config_digest).toBe(authorizedWork.binding.config_digest);
    expect(actualAuthority?.implementation_fingerprint).toBe(work.lifecycle.seal?.implementation_fingerprint);
    expect(actualAuthority?.ac_ids).toEqual(authorizedWork.binding.ac_ids);
    expect(actualAuthority?.allowed_paths).toEqual([...authorizedWork.lifecycle.scope.allowed_paths]);
    expect(actualAuthority?.stage_ids).toEqual(execution.stage_ids);
    expect(actualAuthority?.predecessor_attempt_ids).toEqual(
      authorizedWork.execution.assignment_attempts
        .filter((attempt) => attempt.status === 'completed')
        .map((attempt) => attempt.attempt_id),
    );
    expect(actualAuthority?.failed_action_ids).toEqual(failed.map((item) => item.request.action_id));
    expect(actualAuthority?.user_instruction_ref).toBe('fixture:actual-correction-owner');
    expect(actualAuthority?.work_version).toEqual(prepared.workVersion);
    expect(actualAuthority?.ledger_version).toEqual(prepared.ledgerVersion);
    expect(actualAuthority?.journal_version).toEqual(currentJournal.version);
    expect(() => validateCurrentAuthority()).toThrow('corrective session binding differs');

    const withoutAuthority: WorkState = {
      ...authorizedWork,
      lifecycle: {
        ...authorizedWork.lifecycle,
        references: authorizedWork.lifecycle.references.filter(
          (reference) =>
            !(
              reference.kind === 'correction_authorization' &&
              reference.decision === 'approved' &&
              reference.artifact_schema === execution.authorization.schema &&
              reference.path === execution.authorization.path &&
              reference.sha256 === execution.authorization.sha256
            ),
        ),
      },
    };
    expect(() => validateCurrentAuthority(f.root, withoutAuthority)).toThrow(
      'consumed Host correction authority missing',
    );
    expect(() =>
      validateCurrentAuthority(f.root, {
        ...authorizedWork,
        binding: { ...authorizedWork.binding, scope_id: `${authorizedWork.binding.scope_id}-negative-control` },
      }),
    ).toThrow('corrective authority contract differs');
    const foreignPath = `${authorizedWork.lifecycle.scope.allowed_paths[0]}.foreign`;
    expect(authorizedWork.lifecycle.scope.allowed_paths).not.toContain(foreignPath);
    expect(() =>
      validateCurrentAuthority(f.root, {
        ...authorizedWork,
        lifecycle: {
          ...authorizedWork.lifecycle,
          scope: {
            ...authorizedWork.lifecycle.scope,
            allowed_paths: [...authorizedWork.lifecycle.scope.allowed_paths, foreignPath],
          },
        },
      }),
    ).toThrow('corrective authority contract differs');
    assert.deepEqual(validateCurrentAuthority(f.root), persistedAuthority);
    expect(readFileSync(authorityPath)).toEqual(authorityBytes);

    let tamperFailed = false;
    let tamperFailure: unknown;
    let restorationFailed = false;
    let restorationFailure: unknown;
    try {
      writeFileSync(authorityPath, Buffer.concat([authorityBytes, Buffer.from([0x20])]));
      expect(() => validateCurrentAuthority(f.root)).toThrow('corrective authority bytes differ');
    } catch (error) {
      tamperFailed = true;
      tamperFailure = error;
    } finally {
      try {
        writeFileSync(authorityPath, authorityBytes);
      } catch (error) {
        restorationFailed = true;
        restorationFailure = error;
      }
    }
    if (tamperFailed && restorationFailed)
      throw new AggregateError(
        [tamperFailure, restorationFailure],
        'Corrective authority tamper and restoration failed.',
      );
    if (tamperFailed) throw tamperFailure;
    if (restorationFailed) throw restorationFailure;
    expect(readFileSync(authorityPath)).toEqual(authorityBytes);
    const afterTamperHost = f.store.readHostStateSnapshot(f.identity),
      afterTamperJournal = f.store.readWorkSessionJournal(f.identity);
    expect(afterTamperHost).toEqual(authorizedHost);
    expect(afterTamperJournal).toEqual(authorizedJournal);
    assert.deepEqual(validateCurrentAuthority(f.root), persistedAuthority);
    completed = true;
  } catch (error) {
    bodyFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(completed);
          return undefined;
        },
      ],
      bodyFailure,
    );
  }
}, 20_000);
