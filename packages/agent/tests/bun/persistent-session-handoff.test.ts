import { runSessionPrincipalRetry } from '../helpers/session-principal-retry-fixture.ts';
import { resumePausedLocalWork } from '../../src/orchestration/resume-paused-local-work.ts';
import { boundedSpawnSync, executionBudget, pinnedEnvironment, readPin } from '../../bin/bun.ts';
import { requireSynchronousChildSuccess } from '../helpers/synchronous-child-outcome.ts';
import { buildAdmittedDevelopmentPacket } from '../../src/orchestration/admitted-development-packet.ts';
import {
  readLocalSourceWriteAuthorization,
  type LocalSourceWriteAuthorization,
} from '../../src/orchestration/local-source-authorization.ts';
import { validateImplementationScope } from '../../src/contracts/implementation-scope.ts';
import { validateAcceptanceManifestSchema } from '../../src/contracts/acceptance-manifest-schema.ts';
import { afterEach, describe, expect, setSystemTime, spyOn, test } from 'bun:test';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { link, lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { stringify as stringifyYaml } from 'yaml';
import path from 'node:path';
import { Database } from 'bun:sqlite';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from '../../src/config/runtime-config.ts';
import type { WorkItemSelection } from '../../src/config/runtime-config.ts';
import {
  HostStateStore,
  openHostStateDatabase,
  type RuntimeCodeRebindRequest,
  type WorkIdentity,
} from '../../src/host-state.ts';
import { loadProjectContext, loadProjectSetContext } from '../../src/config/project-context.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../../src/config/workspace-database-raw.ts';
import { makeFreshRepository } from '../helpers/project-upgrade-fixture.ts';
import { configuredTestContext } from '../configured-context.ts';
import { expectAsyncReturned, expectReturned, rejectionReason } from '../helpers/expect-rejection.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from '../../src/orchestration/scoped-source-snapshot.ts';
import {
  createInitialSourceWorkFixture,
  prepareInitialSourceFrontier,
  issueInitialSourceFixtureWriter,
  expiredOwnerTime as initialSourceExpiredOwnerTime,
  withInitialSourceCleanup,
  hostStore as initialSourceHostStore,
  hostLedger as initialSourceHostLedger,
  hostDatabase as initialSourceHostDatabase,
  type InitialWorkFixture,
  admittedInput as initialSourceAdmissionInput,
  currentJournal as initialSourceJournal,
  changeOneAcceptedDocument,
} from '../helpers/initial-source-work-fixture.ts';
import { requireHostState, workAndLedger } from '../helpers/task-source-host-fixture.ts';
import { suspendLocalWork } from '../../src/orchestration/suspend-local-work.ts';
import type { TaskSourceBindingRequest } from '../../src/orchestration/task-source-binding.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import type {
  MastraLedgerItem,
  MastraSessionLedgerSnapshot,
  MastraSessionLedgerState,
  PersistentSessionSnapshot,
  SynthesisObservationCorrectionPlan,
} from '../../src/orchestration/persistent-session-handoff.ts';
import {
  buildSessionBridgeRequest,
  sessionBridgeRunId,
  parseSessionBridgeObservation,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from '../../src/orchestration/mastra-session-bridge-contract.ts';
import { configuredContextForStage } from '../../src/orchestration/configured-context.ts';
import type {
  SessionAgentAction,
  SessionAgentOutcome,
  SessionHandoffContext,
} from '../../src/orchestration/session-handoff.ts';
import { validateActivationUse } from '../../src/research-decision.ts';
import type { ObservedActivationUseWritePlan } from '../../src/research-decision.ts';
import {
  MastraSessionLedger,
  mastraLedgerStatus,
  PersistentSessionHandoffStore,
  openConfiguredMastraSessionLedger,
  openConfiguredSessionHandoffStore,
  sessionHandoffDatabasePath,
} from '../../src/orchestration/persistent-session-handoff.ts';
import { sessionActionsForWave } from '../../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../../src/orchestration/workflow-plan.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';
import {
  pauseReadonlyDispatchHostFixture,
  withReadonlyDispatchHostFixture,
} from '../helpers/readonly-dispatch-host-fixture.ts';
import { prepareNativeUnnormalizedSynthesis } from '../helpers/native-synthesis-correction-fixture.ts';
import {
  createPrewriterPreparationObservation,
  runPreparationFixtureInProcess,
  runSynthesisFixtureInProcess,
} from '../helpers/public-prewriter-fixture.ts';
import { nativeDatabaseSnapshotReader } from '../helpers/native-database-snapshot.ts';
import { prepareQueuedInitialSourceTaskSource } from '../helpers/queued-initial-source-tasksource-fixture.ts';
import { acquireLocalSourceWriterLease, admitLocalSessionWork } from '../../src/orchestration/local-work-admission.ts';
import { createFailedFinalCorrectionFixture } from '../helpers/failed-final-correction-fixture.ts';
import { prepareLifecycleForCorrection } from '../../src/orchestration/final-assurance.ts';
import { MastraSessionBridge } from '../../src/orchestration/mastra-session-bridge.ts';
import { bindControlledRuntimeInitialization } from '../helpers/controlled-runtime-initialization-fixture.ts';
import { readRetainedUnissuedSessionEngineSnapshot } from '../../src/orchestration/session-engine-snapshot.ts';
import {
  projectConfiguredFrontierContinuationAction,
  projectConfiguredPrewriterContinuationRequests,
  type DeliveredWorkContinuationRequest,
} from '../../src/orchestration/delivered-work-continuation.ts';
import { normalConfigEndpointProof } from '../helpers/configured-frontier-host-fixture.ts';
import { requestFixture as continuationRequestSeed } from '../helpers/delivered-work-continuation-fixture.ts';
import { runtimePackageBeforeimageFixture } from '../helpers/runtime-package-beforeimage-fixture.ts';
import {
  openAdmittedSessionExecution,
  readAdmittedSessionExecutionContext,
} from '../../src/orchestration/admitted-session-execution.ts';
import * as admittedSessionExecution from '../../src/orchestration/admitted-session-execution.ts';
import {
  dispatchWorkflowAssignment,
  prepareWorkflowExecution,
  reserveWorkflowAssignmentForSession,
  createTrustedLocalSessionComposition,
  type WorkflowAssignmentRequest,
} from '../../src/runtime-kernel.ts';
import { parseTaskSourceResourceTransitionReceipt } from '../../src/orchestration/task-source-resource-transition.ts';
import { isCurrentLocalSourceAuthorizationReference } from '../../src/orchestration/local-source-authorization-reference.ts';

const { repositoryRoot: root, config } = configuredTestContext();
const workspaceId = 'a'.repeat(64);
const context = { work_id: 'new-work', attempt: 1, scope_digest: 'b'.repeat(64) };
const flows: [string, WorkItemSelection['kind'], WorkItemSelection['intent']][] = [
  ['information_research_light', 'research', 'information_research'],
  ['implementation_new', 'feature', 'implementation_new'],
  ['implementation_change', 'feature', 'implementation_change'],
  ['bug_fix', 'bug', 'bug_fix'],
  ['task_execution', 'task', 'task_execution'],
];
let scratch: string | undefined;
let retainScratch = false;
let caseDeadline: number | undefined;
const stores: PersistentSessionHandoffStore[] = [];
const mastraLedgers: MastraSessionLedger[] = [];

function scratchPath(): string {
  if (scratch === undefined) throw new Error('test scratch directory is not initialized');
  return scratch;
}

function actionAt(snapshot: PersistentSessionSnapshot, index: number): SessionAgentAction {
  const action = snapshot.state.handoff.actions[index];
  if (!action) throw new Error(`session handoff action ${index} is missing`);
  return action;
}

function mastraItemAt(snapshot: MastraSessionLedgerSnapshot, index: number): MastraLedgerItem {
  const item = snapshot.state.items[index];
  if (!item) throw new Error(`Mastra ledger item ${index} is missing`);
  return item;
}

function requestAt(requests: readonly SessionBridgeRequest[], index: number): SessionBridgeRequest {
  const request = requests[index];
  if (!request) throw new Error(`session bridge request ${index} is missing`);
  return request;
}

function requiredMastraSnapshot(snapshot: MastraSessionLedgerSnapshot | null): MastraSessionLedgerSnapshot {
  if (snapshot === null) throw new Error('Mastra ledger snapshot is missing');
  return snapshot;
}

function requiredPersistentSnapshot(snapshot: PersistentSessionSnapshot | null): PersistentSessionSnapshot {
  if (snapshot === null) throw new Error('persistent session handoff snapshot is missing');
  return snapshot;
}

function requiredValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(label + ' is missing');
  return value;
}

type PrincipalRetryReceipt = Awaited<ReturnType<typeof runSessionPrincipalRetry>>;

function store(): PersistentSessionHandoffStore {
  const instance = new PersistentSessionHandoffStore(
    openHostStateDatabase(scratchPath(), 'host.sqlite', workspaceId),
    workspaceId,
    config,
  );
  stores.push(instance);
  return instance;
}

function selection(
  kind: WorkItemSelection['kind'],
  intent: WorkItemSelection['intent'],
  selectedConfig = config,
): WorkItemSelection {
  const team = selectedConfig.teams['default-development'];
  if (!team) throw new Error('default development team is not configured');
  const project = team.allowed_projects[0];
  if (project === undefined) throw new Error('default development team has no allowed project');
  return {
    team: 'default-development',
    kind,
    intent,
    project,
    risk_flags: [],
    labels: [],
  };
}

function observed(
  snapshot: PersistentSessionSnapshot,
  action: SessionAgentAction,
  issueId: string,
  options: { readonly agentId?: string; readonly toolCallRef?: string } = {},
): SessionAgentOutcome {
  const summary = `Simulated observed result for ${action.role}`;
  return {
    action_id: action.action_id,
    handoff_digest: snapshot.state.handoff.digest,
    work_id: action.work_id,
    attempt: action.attempt,
    scope_digest: action.scope_digest,
    wave_index: action.wave_index,
    action_order: action.action_order,
    stage_id: action.stage_id,
    role: action.role,
    status: 'reported_complete',
    summary,
    session_result: {
      issue_id: issueId,
      agent_id: options.agentId ?? `simulated-agent-${action.action_id}`,
      tool_call_ref: options.toolCallRef ?? `simulated-tool-${issueId}`,
      output_digest: canonicalJsonDigest(summary),
    },
    evidence_refs: [`simulated-evidence:${issueId}`],
  };
}

function mastraLedger(workId = 'mastra-work'): { database: Database; instance: MastraSessionLedger; workId: string } {
  const database = openHostStateDatabase(scratchPath(), `host-${mastraLedgers.length}.sqlite`, workspaceId);
  const host = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
  const instance = new MastraSessionLedger(database, workspaceId, config, root, host);
  mastraLedgers.push(instance);
  return { database, instance, workId };
}

function bridgeRequest({
  actionId,
  workflowId,
  stageId,
  assignmentIndex,
  waveIndex = 0,
  runId = 'run-1',
}: {
  readonly actionId: string;
  readonly workflowId: string;
  readonly stageId: string;
  readonly assignmentIndex: number;
  readonly waveIndex?: number;
  readonly runId?: string;
}): SessionBridgeRequest {
  const workflow = config.workflows[workflowId];
  if (!workflow) throw new Error(`configured workflow ${workflowId} is missing`);
  const stage = workflow.stages.find((entry) => entry.id === stageId);
  if (!stage) throw new Error(`configured stage ${stageId} is missing from ${workflowId}`);
  const assignment = stage.assignments[assignmentIndex];
  if (!assignment) throw new Error(`configured assignment ${assignmentIndex} is missing from ${stageId}`);
  return {
    schema: 'VidaSessionRequest/v1',
    run_id: runId,
    workflow_id: workflowId,
    wave_index: waveIndex,
    action_id: actionId,
    assignment_index: assignmentIndex,
    stage_id: stageId,
    role: assignment.role,
    config_digest: runtimeConfigDigest(config),
    scope_digest: 'b'.repeat(64),
    bindings_manifest_ref: 'e'.repeat(64),
  };
}

function actualFocusedValidatorRequests(
  workId: string,
  input: {
    readonly repositoryRoot: string;
    readonly config: ReturnType<typeof loadRuntimeConfig>;
    readonly workspaceId: string;
  } = { repositoryRoot: root, config, workspaceId },
): {
  readonly requestContext: SessionHandoffContext;
  readonly runId: string;
  readonly waveIndex: number;
  readonly requests: SessionBridgeRequest[];
} {
  const workflowId = 'task_execution';
  const { repositoryRoot: requestRoot, config: requestConfig, workspaceId: requestWorkspaceId } = input;
  const selected = selection('task', workflowId, requestConfig);
  const requestContext = { ...context, work_id: workId };
  const compiled = compileDevelopmentWorkflow(requestConfig, selected.team, workflowId, selected.risk_flags);
  const waveIndex = compiled.waves.findIndex((wave) => wave.some((stage) => stage.id === 'validate_focused'));
  if (waveIndex < 0) throw new Error('focused validator wave is not configured');
  const actions = sessionActionsForWave(requestConfig, selected, requestContext, workflowId, waveIndex, []);
  const runId = sessionBridgeRunId(requestWorkspaceId, requestContext, workflowId);
  const requests = actions
    .filter((action) => action.stage_id === 'validate_focused')
    .map((action) =>
      buildSessionBridgeRequest({
        runId,
        workflowId,
        configDigest: runtimeConfigDigest(requestConfig),
        context: requestContext,
        waveIndex,
        action,
        configuredContext: configuredContextForStage(
          requestRoot,
          requestConfig,
          workflowId,
          action.stage_id,
          requestContext,
        ),
        priorResults: [],
      }),
    );
  return { requestContext, runId, waveIndex, requests };
}

function seedMastraLedger(database: Database, state: MastraSessionLedgerState): void {
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const payload = canonicalJson(state);
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspaceId, state.work_id, state.attempt, 1, payload, canonicalJsonDigest(state));
}

function mastraState(
  workId: string,
  requests: readonly SessionBridgeRequest[],
  items?: readonly MastraLedgerItem[],
  overrides: Partial<MastraSessionLedgerState> = {},
): MastraSessionLedgerState {
  const firstRequest = requests[0];
  if (firstRequest === undefined) throw new Error('Mastra ledger fixture requires at least one request');
  return {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspaceId,
    work_id: workId,
    attempt: 1,
    run_id: firstRequest.run_id,
    step_id: firstRequest.stage_id,
    items: items ?? requests.map((request) => ({ request, issue_id: null, observation: null })),
    completed: [],
    ...overrides,
  };
}

function mastraObservation(
  request: SessionBridgeRequest,
  issueId: string | null,
  toolCallRef: string,
  summary = `result-${request.assignment_index}`,
  agentId = `agent-${request.assignment_index}`,
): SessionBridgeObservation {
  if (issueId === null) throw new Error(`issue identifier is missing for ${request.action_id}`);
  return {
    schema: 'VidaSessionObservation/v1',
    action_id: request.action_id,
    issue_id: issueId,
    agent_id: agentId,
    tool_call_ref: toolCallRef,
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: [],
  };
}

afterEach(async () => {
  try {
    completeOwnedCleanup([
      ...[...mastraLedgers.splice(0), ...stores.splice(0)].map((instance) => () => {
        instance.close();
        return undefined;
      }),
    ]);
    if (caseDeadline !== undefined && performance.now() >= caseDeadline) {
      retainScratch = true;
      throw new Error('Mastra lifecycle cleanup exhausted its monotonic case deadline');
    }
    if (scratch && !retainScratch) await rm(scratch, { recursive: true, force: true });
  } catch (error) {
    retainScratch = true;
    throw error;
  } finally {
    if (scratch && retainScratch) console.error(`Retained failed session handoff fixture root: ${scratch}`);
    scratch = undefined;
    retainScratch = false;
    caseDeadline = undefined;
  }
});

async function configuredFactoryFixture(name: string): Promise<string> {
  const repositoryRoot = await makeFreshRepository(`session-handoff-${name}-`);
  scratch = repositoryRoot;
  return repositoryRoot;
}

async function withAdmittedHandoffFixture(
  body: (fixture: InitialWorkFixture) => void | Promise<void>,
  options: Parameters<typeof createInitialSourceWorkFixture>[0] & { readonly holdExpiredOwnerClock?: boolean } = {},
  timeoutMs: 5_000 | 20_000 = 5_000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  caseDeadline = deadline;
  let fixture: InitialWorkFixture | undefined, ownedRoot: string | undefined;
  const { holdExpiredOwnerClock = false, ...fixtureOptions } = options;
  let clockHeld = false;
  await withInitialSourceCleanup(
    async () => {
      fixture = await expectAsyncReturned(() =>
        createInitialSourceWorkFixture({
          ...fixtureOptions,
          onRoot: (allocated) => {
            ownedRoot = allocated;
            console.info('Admitted handoff fixture root: ' + allocated);
          },
        }),
      );
      if (performance.now() >= deadline) throw new Error('Admitted handoff setup exhausted its deadline');
      if (holdExpiredOwnerClock) {
        setSystemTime(new Date(initialSourceExpiredOwnerTime(fixture)));
        clockHeld = true;
      }
      await body(fixture);
      expect(performance.now()).toBeLessThan(deadline);
    },
    async () => {
      try {
        if (fixture) await fixture.close();
      } finally {
        if (clockHeld) setSystemTime();
        if (ownedRoot) console.info('Retained admitted handoff fixture: ' + ownedRoot);
      }
      if (performance.now() >= deadline) throw new Error('Admitted handoff cleanup exhausted its deadline');
    },
    'Admitted handoff fixture',
  );
}

function combinedConstructorAndCloseFailure(
  repositoryRoot: string,
  factory: (repositoryRoot: string) => unknown,
  closeFailure: unknown,
): void {
  const fixtureConfig = loadRuntimeConfig(repositoryRoot);
  const fixtureWorkspaceId = deriveWorkspaceId(fixtureConfig.repository.repository_id, repositoryRoot);
  const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
  const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  const admittedDatabases: Database[] = [];
  let constructorError: Error | undefined;
  let synchronousFullCount = 0;
  const order: string[] = [];
  const nativeCloseReceivers: Database[] = [];
  const observedExec = function (this: Database, sql: string) {
    if (sql === 'PRAGMA journal_mode=WAL' && admittedDatabases.length === 0) {
      const main = this.query<{ name: string; file: string }, []>('PRAGMA database_list')
        .all()
        .find((entry) => entry.name === 'main');
      if (main?.file === sessionHandoffDatabasePath(repositoryRoot, fixtureConfig)) admittedDatabases.push(this);
    }
    if (this === admittedDatabases[0] && sql === 'PRAGMA synchronous=FULL') {
      synchronousFullCount += 1;
      if (synchronousFullCount === 2) {
        constructorError ??= new Error('injected Host constructor SQL failure');
        order.push('constructor');
        throw constructorError;
      }
    }
    return originalExec.call(this, sql);
  } as typeof Database.prototype.exec;
  const observedClose = function (this: Database, throwOnError?: boolean) {
    if (this === admittedDatabases[0]) {
      nativeCloseReceivers.push(this);
      if (nativeCloseReceivers.length <= 2) {
        if (nativeCloseReceivers.length === 1) order.push('close');
        throw closeFailure;
      }
    }
    return originalClose.call(this, throwOnError);
  } as typeof Database.prototype.close;

  Database.prototype.exec = observedExec;
  Database.prototype.close = observedClose;
  let caught: unknown;
  try {
    factory(repositoryRoot);
  } catch (error) {
    caught = error;
  } finally {
    Database.prototype.exec = originalExec;
  }
  let assertionError: unknown;
  let hasAssertionError = false;
  let retrySucceeded = false;
  try {
    const admittedDatabase = admittedDatabases[0];
    expect(admittedDatabase).toBeDefined();
    if (admittedDatabase === undefined) throw new Error('configured factory did not open its admitted source');
    expect(constructorError).toBeDefined();
    expect(caught).toBeInstanceOf(AggregateError);
    const aggregate = caught as AggregateError;
    const originalCauses = (error: unknown): unknown[] =>
      error instanceof AggregateError ? error.errors.flatMap(originalCauses) : [error];
    const causes = originalCauses(aggregate);
    expect(causes).toHaveLength(2);
    expect(causes[0]).toBe(constructorError);
    expect(causes[1]).toBe(closeFailure);
    expect(order).toEqual(['constructor', 'close']);
    expect(nativeCloseReceivers).toEqual([admittedDatabase]);

    let contenderFailed = false;
    let contenderError: unknown;
    try {
      openHostStateDatabase(
        repositoryRoot,
        path.relative(repositoryRoot, sessionHandoffDatabasePath(repositoryRoot, fixtureConfig)),
        fixtureWorkspaceId,
      );
    } catch (error) {
      contenderFailed = true;
      contenderError = error;
    }
    expect(contenderFailed).toBe(true);
    expect(contenderError).toBeInstanceOf(AggregateError);
    expect(originalCauses(contenderError)).toEqual([closeFailure]);
    expect(nativeCloseReceivers).toEqual([admittedDatabase, admittedDatabase]);
  } catch (error) {
    assertionError = error;
    hasAssertionError = true;
  } finally {
    Database.prototype.close = originalClose;
    try {
      retryPendingWorkspaceDatabaseCloses();
      retrySucceeded = true;
    } catch (error) {
      retainScratch = true;
      if (!hasAssertionError) {
        assertionError = error;
        hasAssertionError = true;
      }
    }
  }
  if (hasAssertionError) throw assertionError;
  expect(retrySucceeded).toBe(true);
  const admittedDatabase = admittedDatabases[0];
  if (admittedDatabase === undefined) throw new Error('configured factory did not retain its admitted source');
  expect(() => admittedDatabase.query('SELECT 1').get()).toThrow();
}

describe('persistent advisory session handoff', () => {
  test('derives one state file from root YAML work root', () => {
    expect(sessionHandoffDatabasePath(root, config)).toBe(
      path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'),
    );
  });

  test.each([
    ['handoff store', openConfiguredSessionHandoffStore, new Error('injected native admitted database close failure')],
    ['Mastra ledger', openConfiguredMastraSessionLedger, new Error('injected native admitted database close failure')],
    ['handoff store when close throws undefined', openConfiguredSessionHandoffStore, undefined],
    ['Mastra ledger when close throws undefined', openConfiguredMastraSessionLedger, undefined],
  ] as const)(
    'preserves constructor and close failures for the configured %s factory',
    async (name, factory, closeFailure) => {
      const repositoryRoot = await configuredFactoryFixture(name.replaceAll(' ', '-'));
      retainScratch = true;
      combinedConstructorAndCloseFailure(repositoryRoot, factory, closeFailure);
      retainScratch = false;
    },
  );

  test.each(flows)('persists issue and report barriers for %s', async (workflow, kind, intent) => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const active = store();
    let snapshot = active.prepare(selection(kind, intent), context);
    expect(snapshot.state.handoff.workflow_id).toBe(workflow);
    while (snapshot.resume_status === 'ready') {
      const actions = snapshot.state.handoff.actions;
      const issued: [SessionAgentAction, string][] = [];
      for (const action of actions) {
        const result = active.issue(context.work_id, context.attempt, snapshot.version, action.action_id);
        snapshot = result.snapshot;
        issued.push([action, result.issue_id]);
      }
      expect(snapshot.resume_status).toBe('issued_outcome_uncertain');
      for (const [action, issueId] of issued)
        snapshot = active.report(
          context.work_id,
          context.attempt,
          snapshot.version,
          observed(snapshot, action, issueId),
        );
    }
    expect(snapshot.resume_status).toBe('all_reports_collected');
    expect(snapshot.state.handoff.status).toBe('all_reports_collected');
    const reopened = store();
    expect(reopened.resume(context.work_id, context.attempt)).toEqual(snapshot);
  });

  test('persists a complete failed wave as blocked across restart', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-failed-wave-'));
    const active = store();
    const prepared = active.prepare(selection('research', 'information_research'), context);
    const issued = active.issueWave(context.work_id, context.attempt, prepared.version);
    expect(issued.issuances.length).toBeGreaterThan(1);

    let snapshot = issued.snapshot;
    for (const [index, issuance] of issued.issuances.entries()) {
      const action = snapshot.state.handoff.actions.find((entry) => entry.action_id === issuance.action_id);
      if (!action) throw new Error(`issued action ${issuance.action_id} is missing from the current handoff`);
      const complete = observed(snapshot, action, issuance.issue_id);
      const failureSummary = 'The researcher reported a failed session outcome';
      const outcome =
        index === 0
          ? {
              ...complete,
              status: 'reported_failed' as const,
              summary: failureSummary,
              session_result: { ...complete.session_result, output_digest: canonicalJsonDigest(failureSummary) },
            }
          : complete;
      snapshot = active.report(context.work_id, context.attempt, snapshot.version, outcome);
      if (index < issued.issuances.length - 1) expect(snapshot.resume_status).toBe('issued_outcome_uncertain');
    }

    expect(snapshot.resume_status).toBe('blocked');
    expect(snapshot.state.handoff.status).toBe('blocked');
    expect(snapshot.state.handoff.actions).toEqual([]);
    expect(store().resume(context.work_id, context.attempt)).toEqual(snapshot);
  });

  test.each(flows)('atomically issues each complete ready wave for %s', async (workflow, kind, intent) => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const first = store();
    let snapshot = first.prepare(selection(kind, intent), context);
    expect(snapshot.state.handoff.workflow_id).toBe(workflow);
    while (snapshot.resume_status === 'ready') {
      const actions = snapshot.state.handoff.actions;
      const issued = first.issueWave(context.work_id, context.attempt, snapshot.version);
      expect(issued.issuances.map((item) => item.action_id)).toEqual(actions.map((action) => action.action_id));
      expect(new Set(issued.issuances.map((item) => item.issue_id)).size).toBe(actions.length);
      expect(issued.snapshot.version.revision).toBe(snapshot.version.revision + 1);
      expect(issued.snapshot.resume_status).toBe('issued_outcome_uncertain');
      const restarted = store();
      snapshot = requiredPersistentSnapshot(restarted.resume(context.work_id, context.attempt));
      expect(snapshot).toEqual(issued.snapshot);
      expect(() => restarted.issueWave(context.work_id, context.attempt, snapshot.version)).toThrow(/already issued/);
      for (const [index, action] of actions.entries()) {
        const issuance = issued.issuances[index];
        if (!issuance) throw new Error(`wave issuance ${index} is missing`);
        snapshot = restarted.report(
          context.work_id,
          context.attempt,
          snapshot.version,
          observed(snapshot, action, issuance.issue_id),
        );
        if (index < actions.length - 1) {
          expect(snapshot.state.handoff.wave_index).toBe(action.wave_index);
          expect(snapshot.resume_status).toBe('issued_outcome_uncertain');
        }
      }
    }
    expect(snapshot.resume_status).toBe('all_reports_collected');
  });

  test('persists the shared invocation reference only for the two configured focused validator slots', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-same-invocation-'));
    const active = store();
    let snapshot = active.prepare(selection('task', 'task_execution'), context);
    let sharedValidatorRef: string | undefined;
    while (snapshot.resume_status === 'ready') {
      const issued = active.issueWave(context.work_id, context.attempt, snapshot.version);
      snapshot = issued.snapshot;
      for (const { action_id, issue_id } of issued.issuances) {
        const action = snapshot.state.handoff.actions.find((entry) => entry.action_id === action_id);
        if (!action) throw new Error(`issued action ${action_id} is missing from the current handoff`);
        const share = action.stage_id === 'validate_focused';
        snapshot = active.report(
          context.work_id,
          context.attempt,
          snapshot.version,
          observed(snapshot, action, issue_id, {
            ...(share
              ? { toolCallRef: (sharedValidatorRef ??= 'one-focused-validator-invocation'), agentId: 'same-validator' }
              : {}),
          }),
        );
      }
    }
    expect(snapshot.resume_status).toBe('all_reports_collected');
    const outcomes = snapshot.state.handoff.outcomes.filter(
      (item) => item.session_result.tool_call_ref === sharedValidatorRef,
    );
    expect(outcomes.map((item) => item.role).sort()).toEqual(['correctness-validator', 'requirements-validator']);
    expect(new Set(outcomes.map((item) => item.session_result.issue_id)).size).toBe(2);
  });

  test('wave issuance rejects stale versions and a partially issued wave without writing peers', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const first = store();
    const prepared = first.prepare(selection('research', 'information_research'), context);
    const action = actionAt(prepared, 0);
    const partial = first.issue(context.work_id, context.attempt, prepared.version, action.action_id);
    const restarted = store();
    expect(() => restarted.issueWave(context.work_id, context.attempt, prepared.version)).toThrow(/compare-and-swap/);
    expect(() => restarted.issueWave(context.work_id, context.attempt, partial.snapshot.version)).toThrow(
      /already issued/,
    );
    expect(restarted.resume(context.work_id, context.attempt)).toEqual(partial.snapshot);
  });

  test('restart exposes an issued outcome as uncertain and refuses reissue', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const first = store();
    const prepared = first.prepare(selection('research', 'information_research'), context);
    expect(store().resume(context.work_id, context.attempt)?.resume_status).toBe('ready');
    const action = actionAt(prepared, 0);
    const issued = first.issue(context.work_id, context.attempt, prepared.version, action.action_id);
    const restarted = store();
    const uncertain = requiredPersistentSnapshot(restarted.resume(context.work_id, context.attempt));
    expect(uncertain.resume_status).toBe('issued_outcome_uncertain');
    expect(() => restarted.issue(context.work_id, context.attempt, uncertain.version, action.action_id)).toThrow(
      /already issued/,
    );
    expect(() =>
      restarted.issue(context.work_id, context.attempt, uncertain.version, actionAt(uncertain, 1).action_id),
    ).toThrow(/uncertain after restart/);
    expect(() =>
      restarted.report(context.work_id, context.attempt, uncertain.version, observed(uncertain, action, 'wrong-issue')),
    ).toThrow(/matching open issuance/);
    expect(restarted.resume(context.work_id, context.attempt)).toEqual(uncertain);
    const recorded = restarted.report(
      context.work_id,
      context.attempt,
      uncertain.version,
      observed(uncertain, action, issued.issue_id),
    );
    expect(recorded.version.revision).toBe(uncertain.version.revision + 1);
  });

  test('restart after a committed partial report exposes only the unissued peer', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const first = store();
    const prepared = first.prepare(selection('research', 'information_research'), context);
    const action = actionAt(prepared, 0);
    const issued = first.issue(context.work_id, context.attempt, prepared.version, action.action_id);
    const partial = first.report(
      context.work_id,
      context.attempt,
      issued.snapshot.version,
      observed(issued.snapshot, action, issued.issue_id),
    );
    const restarted = store();
    const resumed = requiredPersistentSnapshot(restarted.resume(context.work_id, context.attempt));
    expect(resumed).toEqual(partial);
    expect(resumed.resume_status).toBe('ready');
    expect(() => restarted.issue(context.work_id, context.attempt, resumed.version, action.action_id)).toThrow(
      /already issued/,
    );
    const nextAction = actionAt(resumed, 1);
    expect(
      restarted.issue(context.work_id, context.attempt, resumed.version, nextAction.action_id).snapshot.resume_status,
    ).toBe('issued_outcome_uncertain');
  });

  test('CAS and identity reject duplicate, stale and foreign writes', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const first = store();
    const prepared = first.prepare(selection('research', 'information_research'), context);
    expect(() => first.prepare(selection('research', 'information_research'), context)).toThrow(/already exists/);
    const action = actionAt(prepared, 0);
    first.issue(context.work_id, context.attempt, prepared.version, action.action_id);
    expect(() =>
      first.issue(context.work_id, context.attempt, prepared.version, actionAt(prepared, 1).action_id),
    ).toThrow(/compare-and-swap/);
    expect(first.resume('foreign-work', context.attempt)).toBeNull();
    expect(first.resume(context.work_id, 2)).toBeNull();
  });

  test('prepare-or-resume binds the original scope and selection', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const first = store();
    const selected = selection('research', 'information_research');
    const prepared = first.prepareOrResume(selected, context);
    expect(prepared.created).toBe(true);
    const reopened = store().prepareOrResume(selected, context);
    expect(reopened.created).toBe(false);
    expect(reopened.snapshot).toEqual(prepared.snapshot);
    expect(() => first.prepareOrResume(selected, { ...context, scope_digest: 'c'.repeat(64) })).toThrow(
      /differs from persisted binding/,
    );
    expect(() => first.prepareOrResume(selection('task', 'task_execution'), context)).toThrow(
      /differs from persisted binding/,
    );
  });

  test('prepare-or-resume propagates the exact non-race boundary failure', async () => {
    caseDeadline = performance.now() + 5_000;
    scratch = await mkdtemp(path.join(tmpdir(), 'session-prepare-failure-'));
    retainScratch = true;
    const active = store();
    const selected = selection('research', 'information_research');
    for (const cause of [undefined, 'native boundary failure', new Error('unrelated native failure')]) {
      const prepare = spyOn(active, 'prepare').mockImplementationOnce(() => {
        throw cause;
      });
      await withInitialSourceCleanup(
        async () => {
          expect(await rejectionReason(Promise.resolve().then(() => active.prepareOrResume(selected, context)))).toBe(
            cause,
          );
          expect(prepare).toHaveBeenCalledTimes(1);
          expect(active.resume(context.work_id, context.attempt)).toBeNull();
        },
        () => prepare.mockRestore(),
        'Preparation fault boundary restoration',
      );
    }
    expect(performance.now()).toBeLessThan(caseDeadline);
    retainScratch = false;
  });

  test('configured store denies issue after root configuration changes without changing the persisted row', async () => {
    scratch = await makeFreshRepository('session-config-drift-');
    retainScratch = true;
    const active = openConfiguredSessionHandoffStore(scratch);
    stores.push(active);
    const prepared = expectReturned(() =>
      active.prepare(selection('research', 'information_research', loadRuntimeConfig(scratchPath())), context),
    );
    const configPath = path.join(scratch, 'agent-runtime.config.v1.yaml');
    const originalConfig = await readFile(configPath, 'utf8');
    const changedConfig = originalConfig.replace(/^  work_root: \.agent\/work$/mu, '  work_root: .agent/work-drift');
    if (changedConfig === originalConfig) throw new Error('legacy fixture did not expose its declared work root');
    await writeFile(configPath, changedConfig);
    expect(() => active.issueWave(context.work_id, context.attempt, prepared.version)).toThrow(
      'session root configuration changed during attempt',
    );
    await writeFile(configPath, originalConfig);
    expect(expectReturned(() => active.resume(context.work_id, context.attempt))).toEqual(prepared);
    retainScratch = false;
  });

  test.each(['identical', 'foreign-scope', 'foreign-selection'] as const)(
    'prepare-or-resume reconciles a native insert race with %s winner binding',
    async (kind) => {
      caseDeadline = performance.now() + 5_000;
      scratch = await mkdtemp(path.join(tmpdir(), 'session-insert-race-'));
      retainScratch = true;
      const winner = store(),
        contender = store();
      const selected = selection('research', 'information_research');
      const winnerSelection = kind === 'foreign-selection' ? selection('task', 'task_execution') : selected;
      const winnerContext = kind === 'foreign-scope' ? { ...context, scope_digest: 'c'.repeat(64) } : context;
      const originalPrepare = contender.prepare.bind(contender);
      const barrier = spyOn(contender, 'prepare').mockImplementationOnce((requestedSelection, requestedContext) => {
        expectReturned(() => winner.prepare(winnerSelection, winnerContext));
        return originalPrepare(requestedSelection, requestedContext);
      });
      let failure: { error: unknown } | undefined;
      try {
        if (kind === 'identical') {
          const result = expectReturned(() => contender.prepareOrResume(selected, context));
          expect(result.created).toBe(false);
          expect(result.snapshot).toEqual(
            requiredPersistentSnapshot(expectReturned(() => winner.resume(context.work_id, context.attempt))),
          );
        } else {
          expect(() => contender.prepareOrResume(selected, context)).toThrow('differs from persisted binding');
        }
        expect(barrier).toHaveBeenCalledTimes(1);
        const winning = requiredPersistentSnapshot(
          expectReturned(() => winner.resume(context.work_id, context.attempt)),
        );
        expect(winning.state.handoff.context).toEqual(winnerContext);
        expect(winning.state.handoff.selection).toEqual(winnerSelection);
        expect(expectReturned(() => contender.resume(context.work_id, context.attempt))).toEqual(winning);
        expect(winning.version.revision).toBe(1);
      } catch (error) {
        failure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              barrier.mockRestore();
            },
          ],
          failure,
        );
      }
      retainScratch = false;
    },
  );

  test('configured Mastra ledger refuses drift and preserves its exact journal until config restoration', async () => {
    caseDeadline = performance.now() + 5_000;
    scratch = await makeFreshRepository('mastra-config-drift-', {
      onRoot: (allocated) => {
        scratch = allocated;
        retainScratch = true;
      },
    });
    const localConfig = loadRuntimeConfig(scratch);
    const localWorkspaceId = deriveWorkspaceId(localConfig.repository.repository_id, scratch);
    const fixture = actualFocusedValidatorRequests('mastra-config-drift', {
      repositoryRoot: scratch,
      config: localConfig,
      workspaceId: localWorkspaceId,
    });
    const instance = expectReturned(() => openConfiguredMastraSessionLedger(scratchPath()));
    mastraLedgers.push(instance);
    const before = expectReturned(() =>
      instance.sync('mastra-config-drift', 1, fixture.runId, 'validate_focused', fixture.requests),
    );
    const database = instance.sessionProducerBinding().database;
    const row = () =>
      database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(localWorkspaceId, 'mastra-config-drift', 1);
    const originalRow = row();
    const configPath = path.join(scratch, 'agent-runtime.config.v1.yaml');
    const originalConfig = await readFile(configPath, 'utf8');
    const changedConfig = originalConfig.replace(/^  work_root: \.agent\/work$/mu, '  work_root: .agent/work-drift');
    if (changedConfig === originalConfig) throw new Error('Fixture work root replacement did not match');
    let failure: { error: unknown } | undefined;
    try {
      writeFileSync(configPath, changedConfig);
      expect(() => instance.issueWave('mastra-config-drift', 1, before.version)).toThrow(
        'Mastra session root configuration changed during attempt',
      );
      expect(row()).toEqual(originalRow);
    } catch (error) {
      failure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            writeFileSync(configPath, originalConfig);
          },
        ],
        failure,
      );
    }
    expect(expectReturned(() => instance.resume('mastra-config-drift', 1))).toEqual(before);
    retainScratch = false;
  });

  test('only current v1 session rows are readable', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const active = store();
    const prepared = active.prepare(selection('research', 'information_research'), context);
    const old = { ...prepared.state, schema: 'PersistentSessionHandoffState/v0' };
    const tamper = openHostStateDatabase(scratchPath(), 'host.sqlite', workspaceId);
    try {
      tamper
        .query(
          'UPDATE agent_host_session_handoff SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .run(canonicalJson(old), canonicalJsonDigest(old), workspaceId, context.work_id, context.attempt);
    } finally {
      closeWorkspaceDatabaseWithAdmission(tamper);
    }
    expect(() => active.resume(context.work_id, context.attempt)).toThrow(/schema is invalid/);
  });
});

describe('durable Mastra research exposure and invocation identity', () => {
  test('absent optional Mastra receipts remain absent under read-only inspection', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-optional-reads-'));
    const { database, instance, workId } = mastraLedger('missing-optional-receipts');
    const binding = instance.sessionProducerBinding();
    expect(binding).toMatchObject({
      database,
      host: instance.hostState,
      repositoryRoot: root,
      config,
      workspaceId,
    });
    const project = loadProjectContext(root, config, config.repository.repository_id, config.projects[0]!.project_id);
    const identity: WorkIdentity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: workId,
    };
    expect(instance.readInitialSourceContinuationReceipt(identity, 1)).toBeNull();
    expect(() => instance.readInitialSourceContinuationReceipt(identity, 0)).toThrow(
      'initial-source receipt ProjectContext or attempt differs',
    );

    const actionId = 'a'.repeat(64);
    const request = bridgeRequest({
      actionId,
      workflowId: 'information_research_light',
      stageId: 'research_parallel',
      assignmentIndex: 0,
    });
    const observation = mastraObservation(request, '77777777-7777-4777-8777-777777777777', 'missing-ref');
    expect(instance.resume(workId, 1)).toBeNull();
    expect(instance.currentSnapshot(workId)).toBeNull();
    expect(() => instance.currentSnapshot('../foreign-work')).toThrow('session work ID is invalid');
    expect(instance.preparedReadOnlyReplacement(workId, 1, actionId)).toBeNull();
    expect(instance.replacementDispatch(workId, 1, actionId)).toBeNull();
    expect(instance.replacementNativeHandle(workId, 1, actionId)).toBeNull();
    expect(instance.synthesisCorrection(workId, 1, actionId)).toBeNull();
    expect(instance.retrieveReportedObservation(workId, 1, observation)).toBeNull();

    const tables = database
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((row) => row.name);
    expect(tables).not.toContain('agent_host_readonly_dispatch_repair');
    expect(tables).not.toContain('agent_host_readonly_dispatch_activation');
    expect(tables).not.toContain('agent_host_synthesis_observation_correction');
  });

  test('Mastra resume status distinguishes blocked, uncertain, completed-failed and ready outcomes', () => {
    const request = bridgeRequest({
      actionId: 'e'.repeat(64),
      workflowId: 'information_research_light',
      stageId: 'research_parallel',
      assignmentIndex: 0,
    });
    const issueId = '66666666-6666-4666-8666-666666666666';
    const open = mastraState('resume-status-work', [request]);
    expect(mastraLedgerStatus(open)).toBe('ready');
    expect(mastraLedgerStatus({ ...open, step_id: null })).toBe('blocked');
    expect(
      mastraLedgerStatus({
        ...open,
        items: [{ request, issue_id: issueId, observation: null }],
      }),
    ).toBe('issued_outcome_uncertain');

    const complete = mastraObservation(request, issueId, 'resume-status-invocation');
    expect(
      mastraLedgerStatus({
        ...open,
        items: [{ request, issue_id: issueId, observation: complete }],
      }),
    ).toBe('ready_to_resume');
    expect(
      mastraLedgerStatus({
        ...open,
        items: [{ request, issue_id: issueId, observation: { ...complete, status: 'reported_failed' } }],
      }),
    ).toBe('blocked');
  });

  test('keeps research preparation resumable until the one-way exposure barrier', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-preparation-'));
    const { database, instance, workId } = mastraLedger('research-wave');
    const request = bridgeRequest({
      actionId: 'f'.repeat(64),
      workflowId: 'information_research_light',
      stageId: 'research_parallel',
      assignmentIndex: 0,
    });
    seedMastraLedger(database, mastraState(workId, [request]));
    const prepared = requiredMastraSnapshot(instance.resume(workId, 1));
    const issued = instance.issueWave(workId, 1, prepared.version);
    expect(issued.state.research_wave_exposure).toBe('preparing');
    expect(mastraItemAt(issued, 0).issue_id).toBeTruthy();
    expect(() => instance.markResearchWaveExposurePossible(workId, 1, issued.version)).toThrow(
      /every instruction activation to be committed/,
    );
    expect(() =>
      instance.report(
        workId,
        1,
        issued.version,
        mastraObservation(request, mastraItemAt(issued, 0).issue_id, 'premature-report'),
      ),
    ).toThrow(/report is premature/);
    expect(instance.resume(workId, 1)).toEqual(issued);

    const issueId = mastraItemAt(issued, 0).issue_id;
    if (issueId === null) throw new Error('issued research action has no issue identifier');
    const actionId = request.action_id;
    const binding = {
      work_id: workId,
      attempt: 1,
      run_id: request.run_id,
      action_id: actionId,
      issue_id: issueId,
      scope_id: 'scope-1',
      scope_digest: request.scope_digest,
      source_revision: 'revision-1',
      source_scope_digest: request.scope_digest,
      config_digest: request.config_digest,
      maintenance_generation: 0,
      lease_ticket_id: 'ticket-1',
      lease_thread_id: 'thread-1',
      lease_generation: 1,
    };
    const useBody = {
      schema: 'InstructionActivationUse/v1',
      use_id: 'research-recovery-use',
      work_item_id: workId,
      source_revision: binding.source_revision,
      scope_id: binding.scope_id,
      risk: 'low',
      phase: 'trace',
      lane: 'researcher',
      trigger: 'research_intent',
      required_instruction_ids: [],
      instruction_ids: ['fixture-instruction'],
      registry_digest: '1'.repeat(64),
      source_digests: [{ instruction_id: 'fixture-instruction', source_sha256: '2'.repeat(64) }],
      cache_status: 'hit',
      actor: 'fixture-agent',
      pointer: '.agent/work/research-recovery',
      timestamp: '2026-10-02T00:00:00.000Z',
    };
    const use = validateActivationUse({ ...useBody, digest: canonicalJsonDigest(useBody) });
    const planBody: Omit<ObservedActivationUseWritePlan, 'digest'> = {
      schema: 'ObservedActivationUseWritePlan/v1',
      binding,
      use_digest: use.digest,
      history_path: `research/activation/${workId}/instruction-activation-history.jsonl`,
      history_pre_sha256: null,
      history_sha256: '3'.repeat(64),
    };
    const plan: ObservedActivationUseWritePlan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    const reserved = instance.reserveResearchActivation(workId, 1, issued.version, actionId, use, plan);
    const exposed = instance.markResearchWaveExposurePossible(workId, 1, reserved.version);
    expect(exposed.state.research_wave_exposure).toBe('possible');
    expect(() => instance.beginLegacyResearchPreparationRecovery(workId, 1, exposed.version)).toThrow(
      /unmarked journal/,
    );
    expect(() => instance.issueWave(workId, 1, exposed.version)).toThrow(/already issued/);
  });

  test.each(['research_parallel', 'synthesize_research'])(
    'adopts a seeded legacy %s wave only with incomplete activation and no observed effect',
    async (stageId) => {
      scratch = await mkdtemp(path.join(tmpdir(), 'mastra-legacy-recovery-'));
      const { database, instance, workId } = mastraLedger('legacy-recovery');
      const request = bridgeRequest({
        actionId: '9'.repeat(64),
        workflowId: 'information_research_light',
        stageId,
        assignmentIndex: 0,
      });
      const issueId = '66666666-6666-4666-8666-666666666666';
      seedMastraLedger(database, mastraState(workId, [request], [{ request, issue_id: issueId, observation: null }]));
      const legacy = requiredMastraSnapshot(instance.resume(workId, 1));
      const recovered = instance.beginLegacyResearchPreparationRecovery(workId, 1, legacy.version);
      expect(recovered.state.research_wave_exposure).toBe('preparing');
      expect(mastraItemAt(recovered, 0).issue_id).toBe(issueId);
      expect(mastraItemAt(recovered, 0).observation).toBeNull();
      expect(recovered.state.items).toEqual(legacy.state.items);
      expect(recovered.version.revision).toBe(legacy.version.revision + 1);
      expect(() => instance.beginLegacyResearchPreparationRecovery(workId, 1, recovered.version)).toThrow(
        /unmarked journal/,
      );
      expect(instance.resume(workId, 1)).toEqual(recovered);
    },
  );

  test('allows one invocation for actual focused validator requests with distinct action-bound manifests', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-batch-report-'));
    const workId = 'batch-report';
    const { requestContext, runId, requests } = actualFocusedValidatorRequests(workId);
    expect(requests).toHaveLength(2);
    expect(new Set(requests.map((request) => request.action_id)).size).toBe(2);
    expect(new Set(requests.map((request) => request.bindings_manifest_ref)).size).toBe(2);
    expect(requests.map((request) => request.role).sort()).toEqual(['correctness-validator', 'requirements-validator']);
    const { instance } = mastraLedger(workId);
    let current = instance.sync(workId, requestContext.attempt, runId, 'validate_focused', requests);
    current = instance.issueWave(workId, requestContext.attempt, current.version);
    expect(current.state.items.every((item) => item.host_reservation === undefined)).toBe(true);
    const sharedRef = 'one-controlled-tool-invocation';
    const firstItem = mastraItemAt(current, 0);
    const secondItem = mastraItemAt(current, 1);
    expect(firstItem.issue_id).not.toBe(secondItem.issue_id);
    const first = mastraObservation(firstItem.request, firstItem.issue_id, sharedRef, undefined, 'same-agent');
    current = instance.report(workId, requestContext.attempt, current.version, first);
    const exactRetry = instance.report(workId, requestContext.attempt, current.version, first);
    expect(exactRetry.version).toEqual(current.version);
    expect(exactRetry).toEqual(current);
    expect(() =>
      instance.report(workId, requestContext.attempt, current.version, {
        ...first,
        summary: 'conflicting duplicate slot',
      }),
    ).toThrow(/retry differs/);
    current = instance.report(
      workId,
      requestContext.attempt,
      current.version,
      mastraObservation(secondItem.request, secondItem.issue_id, sharedRef, undefined, 'same-agent'),
    );
    expect(current.state.items.map((item) => item.observation?.tool_call_ref)).toEqual([sharedRef, sharedRef]);
    expect(instance.currentSnapshot(workId)).toEqual(current);
    expect(instance.currentSnapshot('unrecorded-work')).toBeNull();
  });

  test('rejects generated validator batching across mismatched context, role, identity, stage, wave, or scope', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-batch-bindings-'));
    const changes: readonly [
      string,
      (
        request: SessionBridgeRequest,
        fixture: ReturnType<typeof actualFocusedValidatorRequests>,
      ) => SessionBridgeRequest,
    ][] = [
      [
        'context',
        (request) => ({
          ...request,
          configured_context_digest: 'c'.repeat(64),
          configured_context_files: [{ path: 'packages/agent/TESTING.md', sha256: 'd'.repeat(64) }],
        }),
      ],
      ['role', (request) => ({ ...request, role: 'code-researcher' })],
      ['stage', (request) => ({ ...request, stage_id: 'synthesize_task' })],
      ['wave', (request, fixture) => ({ ...request, wave_index: fixture.waveIndex + 1 })],
      ['scope', (request) => ({ ...request, scope_digest: 'c'.repeat(64) })],
    ];

    for (const [label, change] of changes) {
      const workId = `batch-mismatch-${label}`;
      const fixture = actualFocusedValidatorRequests(workId);
      const requests = fixture.requests.map((request, index) => (index === 1 ? change(request, fixture) : request));
      const { instance } = mastraLedger(workId);
      expect(() => {
        let current = instance.sync(
          workId,
          fixture.requestContext.attempt,
          fixture.runId,
          'validate_focused',
          requests,
        );
        current = instance.issueWave(workId, fixture.requestContext.attempt, current.version);
        const left = mastraItemAt(current, 0);
        const right = mastraItemAt(current, 1);
        const sharedRef = `mismatch-${label}`;
        current = instance.report(
          workId,
          fixture.requestContext.attempt,
          current.version,
          mastraObservation(left.request, left.issue_id, sharedRef, undefined, 'same-agent'),
        );
        instance.report(
          workId,
          fixture.requestContext.attempt,
          current.version,
          mastraObservation(right.request, right.issue_id, sharedRef, undefined, 'same-agent'),
        );
      }).toThrow(/outside an allowed read-only slot batch/);
    }

    const workId = 'batch-mismatch-run';
    const fixture = actualFocusedValidatorRequests(workId);
    const firstRequest = fixture.requests[0];
    const secondRequest = fixture.requests[1];
    if (!firstRequest || !secondRequest) throw new Error('validator pair fixture did not retain both requests');
    const requests = [firstRequest, { ...secondRequest, run_id: 'foreign-run' }];
    const { instance } = mastraLedger(workId);
    expect(() =>
      instance.sync(workId, fixture.requestContext.attempt, fixture.runId, 'validate_focused', requests),
    ).toThrow(/invalid suspended requests/);
  });

  test('rejects a different agent identity for an otherwise valid generated validator pair', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-batch-agent-'));
    const workId = 'batch-mismatch-agent';
    const fixture = actualFocusedValidatorRequests(workId);
    const { instance } = mastraLedger(workId);
    let current = instance.sync(
      workId,
      fixture.requestContext.attempt,
      fixture.runId,
      'validate_focused',
      fixture.requests,
    );
    current = instance.issueWave(workId, fixture.requestContext.attempt, current.version);
    const left = mastraItemAt(current, 0);
    const right = mastraItemAt(current, 1);
    const sharedRef = 'different-agent-invocation';
    current = instance.report(
      workId,
      fixture.requestContext.attempt,
      current.version,
      mastraObservation(left.request, left.issue_id, sharedRef, undefined, 'first-agent'),
    );
    expect(() =>
      instance.report(
        workId,
        fixture.requestContext.attempt,
        current.version,
        mastraObservation(right.request, right.issue_id, sharedRef, undefined, 'second-agent'),
      ),
    ).toThrow(/outside an allowed read-only slot batch/);
  });

  test('rejects reuse of a batched invocation reference from a completed wave', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-cross-wave-ref-'));
    const { database, instance, workId } = mastraLedger('cross-wave-ref');
    const workflowId = 'task_execution';
    const stageId = 'validate_focused';
    const oldRequest = bridgeRequest({
      actionId: 'a'.repeat(64),
      workflowId,
      stageId,
      assignmentIndex: 0,
      waveIndex: 1,
    });
    const currentRequests = [0, 1].map((assignmentIndex) =>
      bridgeRequest({
        actionId: (assignmentIndex === 0 ? 'c' : 'd').repeat(64),
        workflowId,
        stageId,
        assignmentIndex,
        waveIndex: 2,
      }),
    );
    const oldIssue = '33333333-3333-4333-8333-333333333333';
    const currentIssue: readonly [string, string] = [
      '44444444-4444-4444-8444-444444444444',
      '55555555-5555-4555-8555-555555555555',
    ];
    const sharedRef = 'reused-tool-invocation';
    const oldObservation = mastraObservation(oldRequest, oldIssue, sharedRef);
    const state = mastraState(
      workId,
      currentRequests,
      [
        { request: requestAt(currentRequests, 0), issue_id: currentIssue[0], observation: null },
        { request: requestAt(currentRequests, 1), issue_id: currentIssue[1], observation: null },
      ],
      {
        completed: [
          {
            step_id: 'prior_validate',
            items: [{ request: oldRequest, issue_id: oldIssue, observation: oldObservation }],
          },
        ],
      },
    );
    seedMastraLedger(database, state);
    const current = requiredMastraSnapshot(instance.resume(workId, 1));
    expect(() =>
      instance.report(
        workId,
        1,
        current.version,
        mastraObservation(requestAt(currentRequests, 0), currentIssue[0], sharedRef),
      ),
    ).toThrow(/outside an allowed read-only slot batch/);
  });
});

test('completed Host source report binds its actual scoped changes and preserves exact retries', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await expectAsyncReturned(() => prepareInitialSourceFrontier(fixture, 'writer'));
      const issued = await expectAsyncReturned(() => issueInitialSourceFixtureWriter(fixture));
      const host = initialSourceHostStore(fixture),
        ledger = initialSourceHostLedger(fixture);
      const item = issued.journal.state.items[0],
        reservation = item?.host_reservation;
      if (!item || !reservation) throw new Error('Native writer reservation is missing');
      const changedPath = fixture.documents[0],
        file = path.join(fixture.root, changedPath);
      await writeFile(file, Buffer.concat([await readFile(file), Buffer.from('controlled source result\n')]));
      const sourceAfter = snapshotDeclaredSources(requireSafeRepositoryAccess(fixture.root), fixture.documents);
      const summary = 'Controlled fixture Source result';
      const observation = expectReturned(() =>
        parseSessionBridgeObservation({
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          host_attempt_id: reservation.receipt.attempt.attempt_id,
          changed_paths: [changedPath],
          agent_id: 'fixture:host-source-writer',
          tool_call_ref: 'fixture:host-source-report',
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture://host-source-report'],
        }),
      );
      expectReturned(() => host.completeWorkflowAttempt(reservation.receipt, observation));
      const before = {
        host: host.readHostStateSnapshot(fixture.identity),
        journal: ledger.resume(fixture.identity.work_id, 1),
      };
      expect(() =>
        ledger.report(fixture.identity.work_id, 1, issued.journal.version, observation, {
          ...sourceAfter,
          digest: 'f'.repeat(64),
        }),
      ).toThrow();
      expect(host.readHostStateSnapshot(fixture.identity)).toEqual(before.host);
      expect(ledger.resume(fixture.identity.work_id, 1)).toEqual(before.journal);
      expect(initialSourceHostDatabase(fixture).inTransaction).toBe(false);
      const accepted = expectReturned(() =>
        ledger.report(fixture.identity.work_id, 1, issued.journal.version, observation, sourceAfter),
      );
      expect(accepted.state.source_scope).toEqual(sourceAfter);
      expect(accepted.state.items[0]?.host_reservation).toEqual(reservation);
      expect(accepted.state.items[0]?.observation).toEqual(observation);
      const after = host.readHostStateSnapshot(fixture.identity);
      expect(
        after.work?.execution.assignment_attempts.find(
          (attempt) => attempt.attempt_id === reservation.receipt.attempt.attempt_id,
        ),
      ).toMatchObject({ status: 'completed', result: observation, result_digest: canonicalJsonDigest(observation) });
      expect(expectReturned(() => ledger.report(fixture.identity.work_id, 1, accepted.version, observation))).toEqual(
        accepted,
      );
      expect(() =>
        ledger.report(
          fixture.identity.work_id,
          1,
          accepted.version,
          {
            ...observation,
            summary: 'changed report',
            output_digest: canonicalJsonDigest('changed report'),
          },
          sourceAfter,
        ),
      ).toThrow('retry differs');
      expect(host.readHostStateSnapshot(fixture.identity)).toEqual(after);
      expect(ledger.resume(fixture.identity.work_id, 1)).toEqual(accepted);
    },
    { holdExpiredOwnerClock: true },
    20_000,
  );
}, 20_000);

test('failed Host report preserves the uncertain source reservation and rejects a foreign attempt', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await expectAsyncReturned(() => prepareInitialSourceFrontier(fixture, 'writer'));
      const issued = await expectAsyncReturned(() => issueInitialSourceFixtureWriter(fixture));
      const host = initialSourceHostStore(fixture),
        ledger = initialSourceHostLedger(fixture);
      const item = issued.journal.state.items[0],
        reservation = item?.host_reservation;
      if (!item || !reservation) throw new Error('Native writer reservation is missing');
      expectReturned(() => host.markWorkflowAttemptUncertain(reservation.receipt));
      const summary = 'Writer outcome remains uncertain';
      const observation = expectReturned(() =>
        parseSessionBridgeObservation({
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          host_attempt_id: reservation.receipt.attempt.attempt_id,
          agent_id: 'fixture:host-source-writer',
          tool_call_ref: 'fixture:uncertain-source-report',
          status: 'reported_failed',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture://uncertain-source-report'],
        }),
      );
      const before = {
        host: host.readHostStateSnapshot(fixture.identity),
        journal: ledger.resume(fixture.identity.work_id, 1),
      };
      expect(() =>
        ledger.report(fixture.identity.work_id, 1, issued.journal.version, {
          ...observation,
          host_attempt_id: '0'.repeat(64),
        }),
      ).toThrow('host attempt identity differs');
      expect(host.readHostStateSnapshot(fixture.identity)).toEqual(before.host);
      expect(ledger.resume(fixture.identity.work_id, 1)).toEqual(before.journal);
      const reported = expectReturned(() =>
        ledger.report(fixture.identity.work_id, 1, issued.journal.version, observation),
      );
      expect(reported.resume_status).toBe('blocked');
      expect(reported.state.items[0]?.observation).toEqual(observation);
      expect(reported.state.items[0]?.host_reservation).toEqual(reservation);
      const retained = host.readHostStateSnapshot(fixture.identity);
      expect(
        retained.work?.execution.assignment_attempts.find(
          (attempt) => attempt.attempt_id === reservation.receipt.attempt.attempt_id,
        ),
      ).toMatchObject({ status: 'uncertain', result: null, result_digest: null });
      expect(expectReturned(() => ledger.report(fixture.identity.work_id, 1, reported.version, observation))).toEqual(
        reported,
      );
      expect(host.readHostStateSnapshot(fixture.identity)).toEqual(retained);
    },
    { holdExpiredOwnerClock: true },
    20_000,
  );
}, 20_000);

test('configured handoff factories reject unsafe native database paths without opening or replacing them', async () => {
  caseDeadline = performance.now() + 5_000;
  const repositoryRoot = await configuredFactoryFixture('unsafe-database');
  retainScratch = true;
  const fixtureConfig = loadRuntimeConfig(repositoryRoot);
  const file = sessionHandoffDatabasePath(repositoryRoot, fixtureConfig);
  const target = path.join(repositoryRoot, 'unsafe-database-target');
  const bytes = Buffer.from('inert native path refusal control');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(target, bytes);
  for (const kind of ['symlink', 'hardlink', 'directory']) {
    await withInitialSourceCleanup(
      async () => {
        if (kind === 'symlink') await symlink(target, file);
        else if (kind === 'hardlink') await link(target, file);
        else await mkdir(file);
        const entry = await lstat(file);
        const symlinkTarget = kind === 'symlink' ? await readlink(file) : null;
        expect(() => openConfiguredSessionHandoffStore(repositoryRoot)).toThrow(
          'session handoff database path is unsafe',
        );
        expect(() => openConfiguredMastraSessionLedger(repositoryRoot)).toThrow(
          'Mastra session ledger database path is unsafe',
        );
        expect(await lstat(file)).toMatchObject({
          dev: entry.dev,
          ino: entry.ino,
          mode: entry.mode,
          nlink: entry.nlink,
          size: entry.size,
        });
        if (symlinkTarget !== null) expect(await readlink(file)).toBe(symlinkTarget);
        expect(await readFile(target)).toEqual(bytes);
      },
      () => rm(file, { recursive: true, force: true }),
      'Unsafe database path refusal and controlled pathname restoration',
    );
  }
  expect(performance.now()).toBeLessThan(caseDeadline);
  retainScratch = false;
});

test('Mastra sync recovers an actual same-key insert race without replacing the winning suspension', async () => {
  caseDeadline = performance.now() + 5_000;
  scratch = await mkdtemp(path.join(tmpdir(), 'mastra-insert-race-'));
  retainScratch = true;
  const { database, instance, workId } = mastraLedger('mastra-insert-race');
  const winnerDatabase = openHostStateDatabase(scratchPath(), 'host-0.sqlite', workspaceId);
  const winnerHost = new HostStateStore(winnerDatabase, workspaceId, undefined, undefined, undefined, undefined, root);
  const winner = new MastraSessionLedger(winnerDatabase, workspaceId, config, root, winnerHost);
  mastraLedgers.push(winner);
  const fixture = actualFocusedValidatorRequests(workId);
  const transaction = database.transaction.bind(database);
  let winning: MastraSessionLedgerSnapshot | undefined;
  const raced = spyOn(database, 'transaction').mockImplementationOnce((body) => {
    winning = winner.sync(workId, 1, fixture.runId, 'validate_focused', fixture.requests);
    return transaction(body);
  });
  await withInitialSourceCleanup(
    () => {
      const current = expectReturned(() =>
        instance.sync(workId, 1, fixture.runId, 'validate_focused', fixture.requests),
      );
      if (!winning) throw new Error('Native Mastra insertion winner did not run');
      expect(current).toEqual(winning);
      expect(current.version.revision).toBe(1);
      expect(winner.resume(workId, 1)).toEqual(current);
      expect(database.query('SELECT COUNT(*) AS count FROM agent_host_mastra_session_ledger').get()).toEqual({
        count: 1,
      });
    },
    () => raced.mockRestore(),
    'Mastra insertion race and native transaction observer restoration',
  );
  expect(performance.now()).toBeLessThan(caseDeadline);
  retainScratch = false;
});

test('native database snapshots detect secondary-table writes and preserve semantic row order', () => {
  const database = new Database(':memory:');
  try {
    database.exec('CREATE TABLE state (id TEXT PRIMARY KEY,payload TEXT NOT NULL)');
    database.exec('CREATE TABLE "secondary "" records" (id INTEGER PRIMARY KEY,payload TEXT NOT NULL)');
    database.query('INSERT INTO state VALUES (?,?)').run('a', 'first');
    database.query('INSERT INTO state VALUES (?,?)').run('b', 'second');
    database.query('INSERT INTO "secondary "" records" VALUES (?,?)').run(1, 'original');
    const read = nativeDatabaseSnapshotReader(database);
    const before = read();
    database.query('UPDATE "secondary "" records" SET payload=? WHERE id=1').run('changed');
    const changed = read();
    expect(changed.schema).toEqual(before.schema);
    expect(changed.tables.state).toEqual(before.tables.state);
    expect(changed).not.toEqual(before);
    expect(changed.tables['secondary " records']).toEqual([{ id: 1, payload: 'changed' }]);
    database.query('UPDATE "secondary "" records" SET payload=? WHERE id=1').run('original');
    database.query('DELETE FROM state WHERE id=?').run('a');
    database.query('INSERT INTO state VALUES (?,?)').run('a', 'first');
    expect(read()).toEqual(before);
    database.exec('CREATE TABLE later (id TEXT)');
    const schemaChanged = read();
    expect(schemaChanged).not.toEqual(before);
    expect(schemaChanged.schema).not.toEqual(before.schema);
    expect(schemaChanged.tables.later).toEqual([]);
    database.query('INSERT INTO later VALUES (?)').run('observed');
    expect(read().tables.later).toEqual([{ id: 'observed' }]);
  } finally {
    database.close();
  }
});

test('configured writer preflight refuses disappeared Host or Journal and changed authorization before approval', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await prepareInitialSourceFrontier(fixture, 'writer');
      const host = initialSourceHostStore(fixture),
        ledger = initialSourceHostLedger(fixture),
        database = initialSourceHostDatabase(fixture);
      const nativeRows = nativeDatabaseSnapshotReader(database);
      const claim = host.claimWorkflowAssignmentWithApproval.bind(host);
      const lookup = ledger.currentSnapshot.bind(ledger);
      const authorizationPath = path.join(fixture.root, fixture.sourceAuthorizationPath);
      const authorizationBytes = await readFile(authorizationPath);
      const refused: string[] = [];
      const boundary = spyOn(host, 'claimWorkflowAssignmentWithApproval').mockImplementationOnce(async (...args) => {
        const hostPreimage = nativeRows();
        const hostRows = hostPreimage.tables.agent_host_state;
        if (!hostRows) throw new Error('Configured preflight snapshot has no Host table');
        const ownerRow = database
          .query<{ id: string; revision: number; payload: string; digest: string }, [string, string]>(
            "SELECT id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
          )
          .get(host.workspaceId, fixture.identity.work_id);
        if (!ownerRow) throw new Error('Configured preflight fixture has no original Host owner');
        const coordinationRow = database
          .query<{ revision: number; payload: string; digest: string }, [string]>(
            "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
          )
          .get(host.workspaceId);
        if (!coordinationRow) throw new Error('Configured preflight fixture has no original coordination row');
        const readHost = host.readHostStateSnapshot.bind(host);
        const readLineage = host.readInitialSourceContinuationLineageView.bind(host);
        let armed = false,
          removedHost = false,
          removedCoordination = false,
          hostReadCompleted = false;
        let observedIdentity: WorkIdentity | undefined;
        let observedWork: ReturnType<typeof readHost>['work'] | undefined;
        const lineageBoundary = spyOn(host, 'readInitialSourceContinuationLineageView').mockImplementationOnce(
          (...input) => {
            const actual = readLineage(...input);
            armed = true;
            return actual;
          },
        );
        const hostBoundary = spyOn(host, 'readHostStateSnapshot').mockImplementation((identity) => {
          if (!armed) return readHost(identity);
          armed = false;
          observedIdentity = identity;
          const changes = database
            .transaction(() => ({
              work: database
                .query("DELETE FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
                .run(host.workspaceId, ownerRow.id).changes,
              ledger: database
                .query("DELETE FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'")
                .run(host.workspaceId).changes,
            }))
            .immediate();
          removedHost = changes.work === 1;
          removedCoordination = changes.ledger === 1;
          const actual = readHost(identity);
          observedWork = actual.work;
          hostReadCompleted = true;
          return actual;
        });
        await withInitialSourceCleanup(
          async () => {
            const denial = await rejectionReason(claim(...args));
            expect(() => {
              throw denial;
            }).toThrow('workflow approval denied');
            expect(lineageBoundary).toHaveBeenCalledTimes(1);
            expect(observedIdentity).toEqual(fixture.identity);
            expect(removedHost).toBe(true);
            expect(removedCoordination).toBe(true);
            expect(hostReadCompleted).toBe(true);
            expect(observedWork ?? null).toBeNull();
            expect(database.inTransaction).toBe(false);
            expect(nativeRows()).toEqual({
              ...hostPreimage,
              tables: {
                ...hostPreimage.tables,
                agent_host_state: hostRows.filter(
                  (row) =>
                    !(
                      isPlainRecord(row) &&
                      ((row.kind === 'work' && row.id === ownerRow.id) ||
                        (row.kind === 'ledger' && row.id === 'shared'))
                    ),
                ),
              },
            });
            refused.push('host');
          },
          () =>
            completeOwnedCleanup([
              () => {
                hostBoundary.mockRestore();
                return undefined;
              },
              () => {
                lineageBoundary.mockRestore();
                return undefined;
              },
              () => {
                if (removedHost)
                  expect(
                    database
                      .query(
                        "INSERT INTO agent_host_state (workspace_id,kind,id,revision,payload,digest) VALUES (?,'work',?,?,?,?)",
                      )
                      .run(host.workspaceId, ownerRow.id, ownerRow.revision, ownerRow.payload, ownerRow.digest).changes,
                  ).toBe(1);
                return undefined;
              },
              () => {
                if (removedCoordination)
                  expect(
                    database
                      .query(
                        "INSERT INTO agent_host_state (workspace_id,kind,id,revision,payload,digest) VALUES (?,'ledger','shared',?,?,?)",
                      )
                      .run(host.workspaceId, coordinationRow.revision, coordinationRow.payload, coordinationRow.digest)
                      .changes,
                  ).toBe(1);
                return undefined;
              },
            ]),
          'Configured preflight Host disappearance and exact restoration',
        );
        expect(nativeRows()).toEqual(hostPreimage);
        for (const fault of ['journal', 'authorization'] as const) {
          const preimage = nativeRows();
          const original = database
            .query<{ revision: number; payload: string; digest: string }, [string, string]>(
              'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=1',
            )
            .get(host.workspaceId, fixture.identity.work_id);
          if (!original) throw new Error('Configured preflight fixture has no original journal');
          let removed = false;
          let observedWorkId: string | undefined;
          let observedLookup: MastraSessionLedgerSnapshot | null | undefined;
          let removalChanges: number | undefined;
          const missing = spyOn(ledger, 'currentSnapshot').mockImplementationOnce((workId) => {
            observedWorkId = workId;
            if (fault === 'journal') {
              removalChanges = database
                .query('DELETE FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=1')
                .run(host.workspaceId, workId).changes;
              removed = removalChanges === 1;
            } else {
              writeFileSync(authorizationPath, Buffer.concat([authorizationBytes, Buffer.from('\n')]));
            }
            observedLookup = lookup(workId);
            return observedLookup;
          });
          await withInitialSourceCleanup(
            async () => {
              const denial = await rejectionReason(claim(...args));
              expect(() => {
                throw denial;
              }).toThrow('workflow approval denied');
              expect(missing).toHaveBeenCalledTimes(1);
              expect(observedWorkId).toBe(fixture.identity.work_id);
              expect(database.inTransaction).toBe(false);
              const after = nativeRows();
              if (fault === 'journal') {
                expect(removalChanges).toBe(1);
                expect(observedLookup).toBeNull();
                expect(after).toEqual({
                  ...preimage,
                  tables: { ...preimage.tables, agent_host_mastra_session_ledger: [] },
                });
              } else {
                expect(observedLookup?.version).toEqual({ revision: original.revision, digest: original.digest });
                expect(await readFile(authorizationPath)).toEqual(
                  Buffer.concat([authorizationBytes, Buffer.from('\n')]),
                );
                expect(after).toEqual(preimage);
              }
              refused.push(fault);
            },
            () => {
              completeOwnedCleanup([
                () => {
                  missing.mockRestore();
                  return undefined;
                },
                () => {
                  if (!removed) return undefined;
                  expect(
                    database
                      .query(
                        'INSERT INTO agent_host_mastra_session_ledger (workspace_id,work_id,attempt,revision,payload,digest) VALUES (?,?,1,?,?,?)',
                      )
                      .run(
                        host.workspaceId,
                        fixture.identity.work_id,
                        original.revision,
                        original.payload,
                        original.digest,
                      ).changes,
                  ).toBe(1);
                  return undefined;
                },
                () => {
                  if (fault === 'authorization') writeFileSync(authorizationPath, authorizationBytes);
                  return undefined;
                },
              ]);
            },
            'Configured preflight missing-journal refusal and native row restoration',
          );
          expect(nativeRows()).toEqual(preimage);
          expect(await readFile(authorizationPath)).toEqual(authorizationBytes);
        }
        return claim(...args);
      });
      await withInitialSourceCleanup(
        async () => {
          const issued = await expectAsyncReturned(() => issueInitialSourceFixtureWriter(fixture));
          expect(refused).toEqual(['host', 'journal', 'authorization']);
          expect(boundary).toHaveBeenCalledTimes(1);
          expect(issued.journal.state.items[0]?.host_reservation?.receipt.attempt.attempt_id).toBe(
            issued.hostAttemptId,
          );
          expect(issued.journal.state.items[0]?.observation).toBeNull();
          expect(issued.journal.state.items[0]?.issue_id).toBe(issued.writer.issue_id);
        },
        () => boundary.mockRestore(),
        'Configured native writer approval observer restoration',
      );
    },
    { holdExpiredOwnerClock: true },
    20_000,
  );
}, 20_000);

test('configured writer preflight refuses peer admission across snapshot and policy boundaries before fresh reservation', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await prepareInitialSourceFrontier(fixture, 'writer');
      const host = initialSourceHostStore(fixture),
        ledger = initialSourceHostLedger(fixture),
        database = initialSourceHostDatabase(fixture);
      const nativeRows = nativeDatabaseSnapshotReader(database);
      const claim = host.claimWorkflowAssignmentWithApproval.bind(host);
      const readHost = host.readHostStateSnapshot.bind(host);
      const readLineage = host.readInitialSourceContinuationLineageView.bind(host);
      const lookup = ledger.currentSnapshot.bind(ledger);
      for (const phase of ['snapshot', 'policy'] as const) {
        const peerPath = 'docs/PEER-' + phase + '.md',
          peerId = 'session-' + phase + '-peer';
        await writeFile(path.join(fixture.root, peerPath), 'Disjoint native policy peer\n');
        const peerInput = fixture.preparePeerAdmission(peerId, [peerPath]);
        let peerAdmission: ReturnType<typeof admitLocalSessionWork> | undefined;
        let postAdmission: ReturnType<typeof nativeRows> | undefined;
        let beforeAdmission: ReturnType<typeof readHost> | undefined;
        let afterAdmission: ReturnType<typeof readHost> | undefined;
        let journalReads = 0,
          lineageReads = 0,
          armed = false,
          rereadLineageCompleted = false;
        const boundary = spyOn(host, 'claimWorkflowAssignmentWithApproval').mockImplementationOnce(async (...args) => {
          beforeAdmission = readHost(fixture.identity);
          const lineageBoundary = spyOn(host, 'readInitialSourceContinuationLineageView').mockImplementation(
            (...input) => {
              const actual = readLineage(...input);
              lineageReads++;
              if (phase === 'snapshot' && lineageReads === 1) armed = true;
              if (journalReads >= 2) rereadLineageCompleted = true;
              return actual;
            },
          );
          const journalBoundary = spyOn(ledger, 'currentSnapshot').mockImplementation((...input) => {
            const actual = lookup(...input);
            journalReads++;
            if (phase === 'policy' && journalReads === 1) armed = true;
            return actual;
          });
          const hostBoundary = spyOn(host, 'readHostStateSnapshot').mockImplementation((identity) => {
            if (armed) {
              armed = false;
              peerAdmission = admitLocalSessionWork(peerInput);
              postAdmission = nativeRows();
              afterAdmission = readHost(fixture.identity);
            }
            return readHost(identity);
          });
          return withInitialSourceCleanup(
            () => claim(...args),
            () =>
              completeOwnedCleanup([
                () => {
                  hostBoundary.mockRestore();
                  return undefined;
                },
                () => {
                  lineageBoundary.mockRestore();
                  return undefined;
                },
                () => {
                  journalBoundary.mockRestore();
                  return undefined;
                },
              ]),
            'Native peer-admission policy observer restoration',
          );
        });
        await withInitialSourceCleanup(
          async () => {
            const denial = await rejectionReason(issueInitialSourceFixtureWriter(fixture));
            expect(() => {
              throw denial;
            }).toThrow('workflow approval denied');
            expect(boundary).toHaveBeenCalledTimes(1);
            expect(journalReads).toBe(phase === 'policy' ? 2 : 1);
            expect(rereadLineageCompleted).toBe(phase === 'policy');
            expect(peerAdmission?.host.work?.binding.lifecycle_work_id).toBe(peerId);
            if (!beforeAdmission || !afterAdmission || !postAdmission)
              throw new Error('Native peer admission and Host reread did not complete');
            expect(beforeAdmission.work?.binding.lifecycle_work_id).toBe(fixture.identity.work_id);
            expect(afterAdmission.work).toEqual(beforeAdmission.work);
            expect(afterAdmission.ledgerVersion).not.toEqual(beforeAdmission.ledgerVersion);
            expect(nativeRows()).toEqual(postAdmission);
            expect(database.inTransaction).toBe(false);
          },
          () => boundary.mockRestore(),
          'Native peer-admission configured writer claim observer restoration',
        );
      }
      const issued = await expectAsyncReturned(() => issueInitialSourceFixtureWriter(fixture));
      expect(issued.journal.state.items[0]?.host_reservation?.receipt.attempt.attempt_id).toBe(issued.hostAttemptId);
      expect(issued.journal.state.items[0]?.observation).toBeNull();
      expect(issued.journal.state.items[0]?.issue_id).toBe(issued.writer.issue_id);
    },
    { holdExpiredOwnerClock: true },
    20_000,
  );
}, 20_000);

test('local Source reference classification requires each current approved declaration field', () => {
  type Facts = Parameters<typeof isCurrentLocalSourceAuthorizationReference>[0];
  const reference: Facts = {
    kind: 'execution_approval',
    disposition: 'current',
    decision: 'approved',
    artifact_schema: 'LocalSourceWriteAuthorization/v1',
  };
  expect(isCurrentLocalSourceAuthorizationReference(reference)).toBe(true);
  const rejected: readonly Facts[] = [
    { ...reference, kind: 'implementation_scope' },
    { ...reference, disposition: 'retired' },
    { ...reference, disposition: 'consumed' },
    { ...reference, decision: 'rejected' },
    { ...reference, artifact_schema: 'WorkflowAttemptRecoveryDecision/v1' },
  ];
  for (const facts of rejected) expect(isCurrentLocalSourceAuthorizationReference(facts)).toBe(false);
  const historicalScope = { ...reference, source_revision: 'historical-scope' };
  expect(isCurrentLocalSourceAuthorizationReference(historicalScope)).toBe(true);
});

test('configured writer preflight refuses a serialized identity transfer between captured and admitted reads', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      const preparationOwner = initialSourceHostStore(fixture).readHostStateSnapshot(fixture.identity);
      requireHostState(preparationOwner);
      if (!fixture.bridge) throw new Error('Identity transfer fixture has no native bridge');
      await bindControlledRuntimeInitialization(fixture.root, fixture.config, initialSourceHostStore(fixture));
      await runSynthesisFixtureInProcess(
        {
          args: [],
          publicRun: () => {
            throw new Error('Identity transfer fixture must use its native preparation owner');
          },
          sync: () => initialSourceJournal(fixture),
          repositoryRoot: fixture.root,
          workId: fixture.identity.work_id,
          attempt: 1,
          work: preparationOwner.work,
        },
        { ledger: initialSourceHostLedger(fixture), bridge: fixture.bridge, source: fixture.originalSource },
      );
      const host = initialSourceHostStore(fixture),
        database = initialSourceHostDatabase(fixture),
        nativeRows = nativeDatabaseSnapshotReader(database),
        admission = initialSourceAdmissionInput(fixture),
        readHost = host.readHostStateSnapshot.bind(host),
        readLineage = host.readInitialSourceContinuationLineageView.bind(host),
        claim = host.claimWorkflowAssignmentWithApproval.bind(host);
      const originalAuthorizationBytes = await readFile(path.join(fixture.root, fixture.sourceAuthorizationPath));
      const originalRawIntakeBytes = await readFile(path.join(fixture.root, fixture.rawIntakePath));
      const canonicalIntakePath = path.join(
        fixture.root,
        '.agent/work/' + fixture.identity.work_id + '/local-session-intake.v1.json',
      );
      const originalCanonicalIntakeBytes = await readFile(canonicalIntakePath);
      const originalJournal = initialSourceJournal(fixture);
      const originalJournalRows = nativeRows().tables.agent_host_mastra_session_ledger;
      const originalLineage = host.readInitialSourceContinuationLineageView(
        fixture.identity,
        originalJournal.state.attempt,
      );
      let resolverAState: ReturnType<typeof readHost> | undefined;
      let admittedBState: ReturnType<typeof readHost> | undefined;
      let admittedBIdentity: WorkIdentity | undefined;
      let bAdmission: ReturnType<typeof admitLocalSessionWork> | undefined;
      let postAdmissionRows: ReturnType<typeof nativeRows> | undefined;
      let lineageReads = 0;
      let armed = false;
      let transitionCompleted = false;
      let transitionFailure: { readonly error: unknown } | undefined;
      let returnedAdmittedIdentity: WorkIdentity | undefined;
      const readAdmitted = admittedSessionExecution.readAdmittedSessionExecutionContext;

      const boundary = spyOn(host, 'claimWorkflowAssignmentWithApproval').mockImplementationOnce(async (...args) => {
        const admittedBoundary = spyOn(
          admittedSessionExecution,
          'readAdmittedSessionExecutionContext',
        ).mockImplementation((...input) => {
          const actual = readAdmitted(...input);
          if (transitionCompleted) returnedAdmittedIdentity = actual.identity;
          return actual;
        });
        const lineageBoundary = spyOn(host, 'readInitialSourceContinuationLineageView').mockImplementation(
          (...input) => {
            const actual = readLineage(...input);
            lineageReads++;
            if (lineageReads === 1) armed = true;
            return actual;
          },
        );
        const hostBoundary = spyOn(host, 'readHostStateSnapshot').mockImplementation((identity) => {
          const actual = readHost(identity);
          if (armed && canonicalJsonDigest(identity) === canonicalJsonDigest(fixture.identity)) {
            armed = false;
            resolverAState = actual;
            try {
              if (!actual.work || !actual.workVersion || !actual.ledgerVersion)
                throw new Error('Resolver did not capture native active Work A before the transition');
              const journal = initialSourceJournal(fixture);
              suspendLocalWork({
                store: host,
                identity: fixture.identity,
                journal,
                expectedWork: actual.workVersion,
                expectedLedger: actual.ledgerVersion,
                expectedMaintenanceGeneration: actual.maintenanceGeneration,
                nativeSessionHandle: admission.nativeSessionHandle,
                userRequestPointer: 'user:initial-source-regression',
                requestIntent: 'linked_correction',
                config: fixture.config,
                documentationContext: {
                  repository_root: fixture.root,
                  repository_id: fixture.identity.repository_id,
                  project_id: 'sample',
                  work_id: fixture.identity.work_id,
                },
              });

              const configPath = path.join(fixture.root, 'agent-runtime.config.v1.yaml');
              writeFileSync(
                configPath,
                stringifyYaml({
                  ...fixture.config,
                  integrations: {
                    ...fixture.config.integrations,
                    providers: fixture.config.integrations.providers.map((provider) => ({
                      ...provider,
                      namespace: provider.namespace + '-identity-b',
                    })),
                  },
                }),
              );
              const changedConfig = loadRuntimeConfig(fixture.root);
              const freshAdmission = { ...admission, config: changedConfig };
              delete freshAdmission.sourceAuthorizationPath;
              bAdmission = admitLocalSessionWork(freshAdmission);
              const workB = bAdmission.host.work;
              if (!workB) throw new Error('Native admission did not create active Work B');
              admittedBIdentity = {
                repository_id: workB.binding.repository_id,
                project_ids: workB.binding.project_ids,
                integrations_digest: workB.binding.integrations_digest,
                work_id: fixture.identity.work_id,
              };
              postAdmissionRows = nativeRows();
              transitionCompleted = true;
            } catch (error) {
              transitionFailure = { error };
              throw error;
            }
          } else if (admittedBIdentity && canonicalJsonDigest(identity) === canonicalJsonDigest(admittedBIdentity)) {
            admittedBState = actual;
          }
          return actual;
        });
        return withInitialSourceCleanup(
          () => claim(...args),
          () =>
            completeOwnedCleanup([
              () => {
                admittedBoundary.mockRestore();
                return undefined;
              },
              () => {
                hostBoundary.mockRestore();
                return undefined;
              },
              () => {
                lineageBoundary.mockRestore();
                return undefined;
              },
            ]),
          'Native serialized identity transfer observer restoration',
        );
      });

      await withInitialSourceCleanup(
        async () => {
          const denial = await rejectionReason(issueInitialSourceFixtureWriter(fixture));
          if (transitionFailure) throw transitionFailure.error;
          expect(() => {
            throw denial;
          }).toThrow('workflow approval denied');
          expect(boundary).toHaveBeenCalledTimes(1);
          expect(lineageReads).toBeGreaterThan(0);
          expect(transitionCompleted).toBe(true);
          expect(resolverAState?.work?.binding.lifecycle_work_id).toBe(fixture.identity.work_id);
          expect(resolverAState?.work?.execution.status).toBe('active');
          expect(bAdmission?.host.work?.binding.lifecycle_work_id).toBe(fixture.identity.work_id);
          expect(admittedBIdentity?.integrations_digest).not.toBe(fixture.identity.integrations_digest);
          expect(admittedBIdentity?.repository_id).toBe(fixture.identity.repository_id);
          expect(admittedBIdentity?.project_ids).toEqual(fixture.identity.project_ids);
          expect(admittedBIdentity?.work_id).toBe(fixture.identity.work_id);
          expect(returnedAdmittedIdentity).toEqual(admittedBIdentity);
          expect(admittedBState?.work?.binding.integrations_digest).toBe(admittedBIdentity?.integrations_digest);
          expect(admittedBState?.work?.execution.status).toBe('active');
          expect(admittedBState?.work?.lease).toBeDefined();
          if (!postAdmissionRows) throw new Error('Native post-admission database snapshot was not captured');
          expect(nativeRows()).toEqual(postAdmissionRows);
          expect(
            host
              .readHostStateSnapshot(fixture.identity)
              .work?.lifecycle.references.filter((reference) => reference.kind === 'execution_approval'),
          ).toEqual(
            resolverAState?.work?.lifecycle.references.filter((reference) => reference.kind === 'execution_approval'),
          );
          expect(nativeRows().tables.agent_host_mastra_session_ledger).toEqual(originalJournalRows);
          expect(() => initialSourceJournal(fixture)).toThrow('root configuration changed during attempt');
          expect(
            host.readInitialSourceContinuationLineageView(fixture.identity, originalJournal.state.attempt),
          ).toEqual(originalLineage);
          expect(await readFile(path.join(fixture.root, fixture.sourceAuthorizationPath))).toEqual(
            originalAuthorizationBytes,
          );
          expect(await readFile(path.join(fixture.root, fixture.rawIntakePath))).toEqual(originalRawIntakeBytes);
          expect(await readFile(canonicalIntakePath)).toEqual(originalCanonicalIntakeBytes);
          expect(database.inTransaction).toBe(false);
        },
        () => boundary.mockRestore(),
        'Native serialized identity transfer claim observer restoration',
      );
    },
    { legacyTaskFrontier: true },
    20_000,
  );
}, 20_000);

async function freshMultiProjectApprovalSetup(kind: 'source' | 'tasksource') {
  const repositoryRoot = await configuredFactoryFixture(`multi-project-${kind}-refusal-`);
  retainScratch = true;
  const packageRoot = path.resolve(import.meta.dir, '../..');
  writeFileSync(
    path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.resolve(packageRoot, '../..', 'agent-runtime.config.v1.yaml')),
  );
  const config = loadRuntimeConfig(repositoryRoot);
  const projectIds = ['agent', 'plugin'];
  const projectContext = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
  const workflowId = 'task_execution' as const;
  const workflow = config.workflows[workflowId];
  if (!workflow) throw new Error('Configured task workflow is unavailable');
  const sourceStage = workflow.stages.find((stage) =>
    stage.assignments.some(
      (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
    ),
  );
  const assignmentIndex = sourceStage?.assignments.findIndex(
    (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
  );
  if (!sourceStage || assignmentIndex === undefined || assignmentIndex < 0)
    throw new Error('Configured task workflow has no Source-writing assignment');
  const sourceAssignment = sourceStage.assignments[assignmentIndex];
  if (!sourceAssignment) throw new Error('Configured task Source assignment is unavailable');
  const riskFlags = [...new Set([...(sourceStage.risk_flags ?? []), ...(sourceAssignment.risk_flags ?? [])])];
  const selectedProject = config.teams['default-development']?.allowed_projects.find((id) => projectIds.includes(id));
  if (!selectedProject) throw new Error('Configured development team has no project in the fresh project set');

  const workId = `multi-project-${kind}-` + randomUUID();
  const nativeSessionHandle = 'fixture-multi-project-session-' + randomUUID();
  const selectedRoot = config.projects.find((project) => project.project_id === selectedProject)?.project_root;
  if (!selectedRoot) throw new Error('Fresh configured project has no Source root');
  const implementationPaths = [path.posix.join(selectedRoot, 'src/task.ts')];
  const sourcePath = requiredValue(implementationPaths[0], 'Fresh project Source path');
  await mkdir(path.dirname(path.join(repositoryRoot, sourcePath)), { recursive: true });
  writeFileSync(path.join(repositoryRoot, sourcePath), 'fresh temporary project source\n');
  const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(repositoryRoot), implementationPaths);
  return {
    repositoryRoot,
    config,
    projectIds,
    projectContext,
    workflowId,
    sourceStage,
    assignmentIndex,
    riskFlags,
    selectedProject,
    workId,
    nativeSessionHandle,
    implementationPaths,
    sourceScope,
  };
}

test('configured source approval reaches the fresh multi-project refusal without writes', async () => {
  caseDeadline = performance.now() + 5_000;
  const {
    repositoryRoot,
    config,
    projectIds,
    projectContext,
    workflowId,
    sourceStage,
    assignmentIndex,
    riskFlags,
    selectedProject,
    workId,
    nativeSessionHandle,
    implementationPaths,
    sourceScope,
  } = await freshMultiProjectApprovalSetup('source');
  const scopePath = `.agent/work/${workId}/scope.json`;
  const acceptancePath = `.agent/work/${workId}/acceptance.json`;
  const authorizationPath = `.agent/work/${workId}/source-authorization.json`;
  await mkdir(path.dirname(path.join(repositoryRoot, scopePath)), { recursive: true });
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: `scope-${workId}`,
    work_id: workId,
    source_revision: sourceScope.digest,
    ac_ids: ['AC-MULTI-PROJECT-SOURCE'],
    allowed_paths: implementationPaths,
    implementation_paths: implementationPaths,
    documentation_paths: [],
    changed_symbols: [],
    non_goals: ['No writer is dispatched by this refusal case'],
    acceptance_trace: ['AC-MULTI-PROJECT-SOURCE'],
    behavior_trace: ['SR-MULTI-PROJECT-SOURCE'],
    test_trace: ['persistent-session-handoff.test.ts'],
    diagnostic_trace: ['fresh multi-project refusal fixture'],
    attribution: { thread_id: nativeSessionHandle, pointer: 'fixture:multi-project-source-refusal' },
    owner: 'fixture',
    created_at: new Date().toISOString(),
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: `acceptance-${workId}`,
    version: 1,
    ac_ids: scope.ac_ids,
    source: implementationPaths[0],
    scope: scope.scope_id,
    source_revision: sourceScope.digest,
    contracts: [
      {
        id: scope.ac_ids[0],
        definition: 'A fresh multi-project Source request is refused before any write or dispatch.',
        sr: 'SR-MULTI-PROJECT-SOURCE',
        evidence: ['Configured local Source approval resolver'],
      },
    ],
  };
  const configDigest = runtimeConfigDigest(config);
  const authorization: LocalSourceWriteAuthorization = {
    schema: 'LocalSourceWriteAuthorization/v1',
    action: 'source.write',
    user_instruction_ref: `fixture:${workId}:source-authorization`,
    work_id: workId,
    attempt: 1,
    scope_digest: sourceScope.digest,
    config_digest: configDigest,
    workflow_id: workflowId,
    stage_ids: [sourceStage.id],
    implementation_paths: implementationPaths,
    native_session_handle: nativeSessionHandle,
  };
  const scopeBytes = Buffer.from(JSON.stringify(scope) + '\n');
  const acceptanceBytes = Buffer.from(JSON.stringify(acceptance) + '\n');
  const authorizationBytes = Buffer.from(JSON.stringify(authorization) + '\n');
  expect(validateImplementationScope(scope)).toBe(true);
  expect(validateAcceptanceManifestSchema(acceptance)).toBe(true);
  writeFileSync(path.join(repositoryRoot, scopePath), scopeBytes);
  writeFileSync(path.join(repositoryRoot, acceptancePath), acceptanceBytes);
  writeFileSync(path.join(repositoryRoot, authorizationPath), authorizationBytes);

  const item = {
    schema: 'WorkItem/v1',
    id: workId,
    canonical_kind: 'task',
    intent: 'task_execution',
    project_id: selectedProject,
    title: 'Exercise the configured multi-project Source refusal',
    description: 'Use a fresh trusted Host Work and stop at native Source preflight.',
    risk_flags: riskFlags,
    labels: [],
    provider: 'local',
    provider_type: 'Task',
  };
  const identity: WorkIdentity = {
    repository_id: config.repository.repository_id,
    project_ids: projectIds,
    integrations_digest: projectContext.integrations_digest,
    work_id: workId,
  };
  const runtimeSnapshot = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    config.runtime.bundle,
    runtimePackageCodePaths(config.runtime.bundle),
  );
  const schemaEntry = runtimeSnapshot.entries.find(
    (entry) => entry.path === config.runtime.bundle + '/schemas/agent-runtime-config.v1.schema.json',
  );
  if (!schemaEntry?.exists) throw new Error('Fresh multi-project runtime schema snapshot is unavailable');
  const databaseLedger = openConfiguredMastraSessionLedger(repositoryRoot);
  mastraLedgers.push(databaseLedger);
  const store = databaseLedger.hostState;
  const seed = workAndLedger(
    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    identity,
    configDigest,
    store.workspaceId,
    [],
    sourceScope,
  );
  const runId = sessionBridgeRunId(
    store.workspaceId,
    { work_id: workId, attempt: 1, scope_digest: sourceScope.digest },
    workflowId,
  );
  const scopeSha256 = createHash('sha256').update(scopeBytes).digest('hex');
  const acceptanceSha256 = createHash('sha256').update(acceptanceBytes).digest('hex');
  const authorizationSha256 = createHash('sha256').update(authorizationBytes).digest('hex');
  const commonReference = {
    schema: 'LifecycleArtifactReference/v1' as const,
    source_revision: sourceScope.digest,
    scope_id: scope.scope_id,
    ac_ids: scope.ac_ids,
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    disposition: 'current' as const,
  };
  const nextWork = {
    ...seed.work,
    binding: {
      ...seed.work.binding,
      repository_id: identity.repository_id,
      project_ids: [...projectIds],
      integrations_digest: identity.integrations_digest,
      team_id: 'default-development',
      workflow_id: workflowId,
      provider_work_item_id: workId,
      lifecycle_work_id: workId,
      work_item_digest: canonicalJsonDigest(item),
      work_source_revision: sourceScope.digest,
      scope_id: scope.scope_id,
      scope_contract_digest: scopeSha256,
      acceptance_manifest_digest: acceptanceSha256,
      ac_ids: [...scope.ac_ids],
      implementation_paths: [...implementationPaths],
      allowed_resources: implementationPaths.map((sourcePath) => `file:${sourcePath}`),
      config_digest: configDigest,
      runtime_source_revision: runtimeSnapshot.digest,
      runtime_code_digest: runtimeSnapshot.digest,
      schema_digest: schemaEntry.sha256,
    },
    contracts: {
      scope: { schema: 'ImplementationScope/v1' as const, path: scopePath, sha256: scopeSha256 },
      acceptance: { schema: 'AcceptanceManifest/v1' as const, path: acceptancePath, sha256: acceptanceSha256 },
      decisions: [],
    },
    lease: { ...seed.work.lease!, thread_id: nativeSessionHandle },
    execution: {
      ...seed.work.execution,
      run_id: runId,
      input_digest: canonicalJsonDigest({
        item,
        scope: scopeSha256,
        acceptance: acceptanceSha256,
        source: sourceScope.digest,
      }),
      assignment_attempts: [],
    },
    lifecycle: {
      ...seed.work.lifecycle,
      source_revision: sourceScope.digest,
      config_binding: {
        config_digest: configDigest,
        schema_digest: schemaEntry.sha256,
        runtime_code_digest: runtimeSnapshot.digest,
      },
      scope: {
        scope_id: scope.scope_id,
        allowed_paths: [...implementationPaths],
        fingerprint_paths: [...implementationPaths],
        implementation_paths: [...implementationPaths],
        documentation_paths: [],
      },
      references: [
        {
          ...commonReference,
          kind: 'implementation_scope' as const,
          artifact_schema: 'ImplementationScope/v1',
          record_id: scope.scope_id,
          path: scopePath,
          sha256: scopeSha256,
          principal: null,
          decision: null,
        },
        {
          ...commonReference,
          kind: 'acceptance_manifest' as const,
          artifact_schema: 'AcceptanceManifest/v1',
          record_id: acceptance.id,
          path: acceptancePath,
          sha256: acceptanceSha256,
          principal: null,
          decision: null,
        },
        {
          ...commonReference,
          kind: 'execution_approval' as const,
          artifact_schema: 'LocalSourceWriteAuthorization/v1',
          record_id: authorization.user_instruction_ref,
          path: authorizationPath,
          sha256: authorizationSha256,
          principal: 'local-session:' + canonicalJsonDigest(nativeSessionHandle),
          decision: 'approved' as const,
        },
      ],
    },
  };
  const nextLedger = {
    ...seed.ledger,
    tickets: seed.ledger.tickets.map((ticket) => ({
      ...ticket,
      repository_id: identity.repository_id,
      project_ids: [...projectIds],
      integrations_digest: identity.integrations_digest,
      thread_id: nativeSessionHandle,
      source_revision: sourceScope.digest,
      contour_keys: [
        ...new Set([
          ...config.integrations.providers
            .filter((provider) => projectIds.includes(provider.project_id))
            .flatMap((provider) => [
              `tenant:${provider.tenant_id}`,
              `project:${provider.tenant_id}/${provider.project_id}`,
            ]),
          ...implementationPaths.map((sourcePath) => `file:${sourcePath}`),
        ]),
      ].sort(),
      exclusive_resources: [...implementationPaths].map((sourcePath) => `file:${sourcePath}`),
      active_resources: [...implementationPaths].map((sourcePath) => `file:${sourcePath}`),
    })),
    claims: seed.ledger.claims.map((claim) => ({
      ...claim,
      thread_id: nativeSessionHandle,
      resources: implementationPaths.map((sourcePath) => `file:${sourcePath}`),
    })),
  };
  const admitted = store.compareAndSwapHostState({
    expectedWork: null,
    expectedLedger: null,
    nextWork,
    nextLedger,
  });
  requireHostState(admitted);
  expect(admitted.work.execution.assignment_attempts).toEqual([]);
  expect(store.readWorkSessionJournal(identity)).toBeNull();
  expect(readLocalSourceWriteAuthorization(repositoryRoot, authorizationPath)).toEqual({
    authorization,
    sha256: authorizationSha256,
  });

  let dispatchCalls = 0;
  const composition = await createTrustedLocalSessionComposition({
    repositoryRoot,
    repositoryId: identity.repository_id,
    projectIds,
    nativeSessionHandle,
    admittedWork: { workId, store },
    services: {
      governanceCapability: store.governanceCapability,
      resolveWorkflowWorkItem: (requestedId) => {
        if (requestedId !== workId) throw new Error('Fresh multi-project fixture received a foreign WorkItem request');
        return item;
      },
      resolveWorkExecutionContext: (request) => {
        const current = store.readHostStateSnapshot(identity);
        requireHostState(current);
        const lease = current.work.lease;
        const ticket = current.ledger.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
        if (!lease || !ticket?.expires_at) throw new Error('Fresh multi-project fixture lost its active lease');
        return {
          schema: 'WorkExecutionContext/v1' as const,
          binding: current.work.binding,
          permit: {
            context_digest: canonicalJsonDigest(current.work.binding),
            checkpoint_revision: current.workVersion.revision,
            checkpoint_digest: current.workVersion.digest,
            runtime_current_revision: 1,
            stage_id: request.stageId,
            assignment_index: request.assignmentIndex,
            dispatch_authorized: true,
            lease: {
              thread_id: lease.thread_id,
              ticket_id: lease.ticket_id,
              generation: lease.generation,
              ledger_revision: current.ledgerVersion.revision,
              expires_at: ticket.expires_at,
              active_resources: ticket.active_resources,
              blocked_resources: ticket.blocked_resources,
            },
          },
        };
      },
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: admitted.work.binding.runtime_code_digest, currentRevision: 1 }),
      casWriter: () => {
        throw new Error('Fresh multi-project refusal must stop before the writer');
      },
      dispatchWorkflowAssignment: () => {
        dispatchCalls++;
        throw new Error('Fresh multi-project refusal must not dispatch writer code');
      },
      validateWorkflowAssignmentResult: () => undefined,
    },
  });
  const capability = composition.workflowExecutionCapability;
  if (!capability) throw new Error('Fresh multi-project fixture has no workflow execution capability');
  const prepared = await prepareWorkflowExecution(capability, {
    repositoryRoot,
    configDigest: configDigest,
    teamId: 'default-development',
    workItemId: workId,
  });
  const rows = nativeDatabaseSnapshotReader(databaseLedger.sessionProducerBinding().database);
  const beforeRows = rows();
  const beforeHost = store.readHostStateSnapshot(identity);
  requireHostState(beforeHost);
  expect(store.readWorkSessionJournal(identity)).toBeNull();
  let approvalClaimCalls = 0;
  let observedInvocation: Parameters<typeof store.claimWorkflowAssignmentWithApproval>[0] | undefined;
  const claimWorkflowAttempt = store.claimWorkflowAssignmentWithApproval.bind(store);
  const claimObserver = spyOn(store, 'claimWorkflowAssignmentWithApproval').mockImplementation(
    (invocation, requestDigest, action, storeId) => {
      approvalClaimCalls++;
      observedInvocation = invocation;
      return claimWorkflowAttempt(invocation, requestDigest, action, storeId);
    },
  );
  let verifierJournalReads = 0;
  let verifierJournalValue: ReturnType<typeof store.readWorkSessionJournal> | undefined;
  const approvalTrace: string[] = [];
  let resolverHostSnapshot: ReturnType<typeof store.readHostStateSnapshot> | undefined;
  const readHost = store.readHostStateSnapshot.bind(store);
  const hostObserver = spyOn(store, 'readHostStateSnapshot').mockImplementation((candidateIdentity) => {
    const snapshot = readHost(candidateIdentity);
    if (candidateIdentity.work_id === workId) {
      approvalTrace.push('host');
      if (verifierJournalReads > 0) resolverHostSnapshot = snapshot;
    }
    return snapshot;
  });
  const readJournal = store.readWorkSessionJournal.bind(store);
  const journalObserver = spyOn(store, 'readWorkSessionJournal').mockImplementation((candidateIdentity) => {
    const journal = readJournal(candidateIdentity);
    if (candidateIdentity.work_id === workId) {
      verifierJournalReads++;
      verifierJournalValue = journal;
      approvalTrace.push('journal');
    }
    return journal;
  });
  const refusal = await withInitialSourceCleanup(
    () =>
      rejectionReason(
        reserveWorkflowAssignmentForSession(capability, {
          repositoryRoot,
          configDigest: configDigest,
          teamId: 'default-development',
          workflowId,
          stageId: sourceStage.id,
          assignmentIndex,
          workItemId: workId,
          workItemDigest: prepared.workItemDigest,
          workContextDigest: prepared.workContextDigest,
          input: {},
        }),
      ),
    () => {
      journalObserver.mockRestore();
      hostObserver.mockRestore();
      claimObserver.mockRestore();
    },
    'Fresh multi-project Source verifier observer restoration',
  );
  expect(() => {
    throw refusal;
  }).toThrow('workflow approval denied');
  expect(approvalClaimCalls).toBe(1);
  expect(observedInvocation).toMatchObject({
    authentication: { repositoryRoot, repositoryId: identity.repository_id, projectIds },
    workflowId,
    stage: { id: sourceStage.id },
    workItem: item,
  });
  expect(verifierJournalReads).toBe(1);
  expect(verifierJournalValue).toBeNull();
  const verifierJournalIndex = approvalTrace.indexOf('journal');
  expect(verifierJournalIndex).toBeGreaterThan(0);
  expect(approvalTrace.slice(verifierJournalIndex)).toEqual(['journal', 'host']);
  expect(resolverHostSnapshot).toEqual(beforeHost);
  expect(dispatchCalls).toBe(0);
  expect(rows()).toEqual(beforeRows);
  expect(store.readHostStateSnapshot(identity)).toEqual(beforeHost);
  expect(store.readWorkSessionJournal(identity)).toBeNull();
  expect(beforeHost.work.execution.assignment_attempts).toEqual([]);
  expect(readFileSync(path.join(repositoryRoot, authorizationPath))).toEqual(authorizationBytes);
  expect(readFileSync(path.join(repositoryRoot, scopePath))).toEqual(scopeBytes);
  expect(readFileSync(path.join(repositoryRoot, acceptancePath))).toEqual(acceptanceBytes);
  expect(performance.now()).toBeLessThan(caseDeadline);
  await withInitialSourceCleanup(
    () => undefined,
    () => {
      databaseLedger.close();
      const ledgerIndex = mastraLedgers.indexOf(databaseLedger);
      if (ledgerIndex >= 0) mastraLedgers.splice(ledgerIndex, 1);
    },
    'Fresh multi-project Source ledger cleanup',
  );
  expect(performance.now()).toBeLessThan(caseDeadline);
  retainScratch = false;
});

test('configured TaskSource approval reaches the fresh multi-project refusal without writes', async () => {
  caseDeadline = performance.now() + 5_000;
  const {
    repositoryRoot,
    config,
    projectIds,
    projectContext,
    workflowId,
    sourceStage,
    assignmentIndex,
    riskFlags,
    selectedProject,
    workId,
    nativeSessionHandle: threadId,
    implementationPaths,
    sourceScope,
  } = await freshMultiProjectApprovalSetup('tasksource');
  const scopePath = `.agent/work/${workId}/scope.json`;
  const acceptancePath = `.agent/work/${workId}/acceptance.json`;
  const authorizationPath = `.agent/work/${workId}/source-authorization.json`;
  await mkdir(path.dirname(path.join(repositoryRoot, scopePath)), { recursive: true });
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: `scope-${workId}`,
    work_id: workId,
    source_revision: sourceScope.digest,
    ac_ids: ['AC-MULTI-PROJECT-TASKSOURCE'],
    allowed_paths: implementationPaths,
    implementation_paths: implementationPaths,
    documentation_paths: [],
    changed_symbols: [],
    non_goals: ['No TaskSource command is issued by this refusal case'],
    acceptance_trace: ['AC-MULTI-PROJECT-TASKSOURCE'],
    behavior_trace: ['SR-MULTI-PROJECT-TASKSOURCE'],
    test_trace: ['persistent-session-handoff.test.ts'],
    diagnostic_trace: ['fresh multi-project TaskSource refusal fixture'],
    attribution: { thread_id: threadId, pointer: 'fixture:multi-project-tasksource-refusal' },
    owner: 'fixture',
    created_at: new Date().toISOString(),
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: `acceptance-${workId}`,
    version: 1,
    ac_ids: scope.ac_ids,
    source: implementationPaths[0],
    scope: scope.scope_id,
    source_revision: sourceScope.digest,
    contracts: [
      {
        id: scope.ac_ids[0],
        definition: 'Configured TaskSource policy refuses a fresh multi-project request before mutation.',
        sr: 'SR-MULTI-PROJECT-TASKSOURCE',
        evidence: ['Configured TaskSource policy resolver'],
      },
    ],
  };
  const configDigest = runtimeConfigDigest(config);
  const authorization: LocalSourceWriteAuthorization = {
    schema: 'LocalSourceWriteAuthorization/v1',
    action: 'source.write',
    user_instruction_ref: `fixture:${workId}:source-authorization`,
    work_id: workId,
    attempt: 1,
    scope_digest: sourceScope.digest,
    config_digest: configDigest,
    workflow_id: workflowId,
    stage_ids: [sourceStage.id],
    implementation_paths: implementationPaths,
    native_session_handle: threadId,
  };
  const scopeBytes = Buffer.from(JSON.stringify(scope) + '\n');
  const acceptanceBytes = Buffer.from(JSON.stringify(acceptance) + '\n');
  const authorizationBytes = Buffer.from(JSON.stringify(authorization) + '\n');
  expect(validateImplementationScope(scope)).toBe(true);
  expect(validateAcceptanceManifestSchema(acceptance)).toBe(true);
  writeFileSync(path.join(repositoryRoot, scopePath), scopeBytes);
  writeFileSync(path.join(repositoryRoot, acceptancePath), acceptanceBytes);
  writeFileSync(path.join(repositoryRoot, authorizationPath), authorizationBytes);

  const item = {
    schema: 'WorkItem/v1',
    id: workId,
    canonical_kind: 'task',
    intent: 'task_execution',
    project_id: selectedProject,
    title: 'Exercise configured multi-project TaskSource refusal',
    description: 'Use a fresh trusted Host Work and stop at native TaskSource policy preflight.',
    risk_flags: riskFlags,
    labels: [],
    provider: 'local',
    provider_type: 'Task',
  };
  const identity: WorkIdentity = {
    repository_id: config.repository.repository_id,
    project_ids: projectIds,
    integrations_digest: projectContext.integrations_digest,
    work_id: workId,
  };
  const runtimeSnapshot = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    config.runtime.bundle,
    runtimePackageCodePaths(config.runtime.bundle),
  );
  const schemaEntry = runtimeSnapshot.entries.find(
    (entry) => entry.path === config.runtime.bundle + '/schemas/agent-runtime-config.v1.schema.json',
  );
  if (!schemaEntry?.exists) throw new Error('Fresh multi-project runtime schema snapshot is unavailable');
  const databaseLedger = openConfiguredMastraSessionLedger(repositoryRoot);
  mastraLedgers.push(databaseLedger);
  const store = databaseLedger.hostState;
  const seed = workAndLedger(
    new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    identity,
    configDigest,
    store.workspaceId,
    [],
    sourceScope,
  );
  const context = { work_id: workId, attempt: 1, scope_digest: sourceScope.digest };
  const runId = sessionBridgeRunId(store.workspaceId, context, workflowId);
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: 'task',
    intent: workflowId,
    project: selectedProject,
    risk_flags: riskFlags,
    labels: [],
  };
  const compiled = compileDevelopmentWorkflow(config, selection.team, workflowId, riskFlags);
  const waveIndex = compiled.waves.findIndex((wave) => wave.some((stage) => stage.id === sourceStage.id));
  if (waveIndex < 0) throw new Error('Configured Source stage has no workflow wave');
  const action = sessionActionsForWave(config, selection, context, workflowId, waveIndex, []).find(
    (entry) => entry.stage_id === sourceStage.id && entry.assignment_index === assignmentIndex,
  );
  if (!action) throw new Error('Configured Source assignment has no real session action');
  const bridgeRequest = buildSessionBridgeRequest({
    runId,
    workflowId,
    configDigest,
    context,
    waveIndex,
    action,
    configuredContext: configuredContextForStage(repositoryRoot, config, workflowId, sourceStage.id, context),
    priorResults: [],
  });
  const initialJournal = databaseLedger.sync(workId, 1, runId, sourceStage.id, [bridgeRequest], sourceScope);
  expect(initialJournal.state.items).toHaveLength(1);
  expect(initialJournal.state.items[0]).toMatchObject({ issue_id: null, observation: null });
  expect(initialJournal.state.items[0]?.request).toEqual(bridgeRequest);
  expect(initialJournal.state.run_id).toBe(runId);
  expect(initialJournal.state.source_scope).toEqual(sourceScope);
  expect(initialJournal.state.completed).toEqual([]);

  const scopeSha256 = createHash('sha256').update(scopeBytes).digest('hex');
  const acceptanceSha256 = createHash('sha256').update(acceptanceBytes).digest('hex');
  const authorizationSha256 = createHash('sha256').update(authorizationBytes).digest('hex');
  const commonReference = {
    schema: 'LifecycleArtifactReference/v1' as const,
    source_revision: sourceScope.digest,
    scope_id: scope.scope_id,
    ac_ids: scope.ac_ids,
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    disposition: 'current' as const,
  };
  const nextWork = {
    ...seed.work,
    binding: {
      ...seed.work.binding,
      repository_id: identity.repository_id,
      project_ids: [...projectIds],
      integrations_digest: identity.integrations_digest,
      team_id: 'default-development',
      workflow_id: workflowId,
      provider_work_item_id: workId,
      lifecycle_work_id: workId,
      work_item_digest: canonicalJsonDigest(item),
      work_source_revision: sourceScope.digest,
      scope_id: scope.scope_id,
      scope_contract_digest: scopeSha256,
      acceptance_manifest_digest: acceptanceSha256,
      ac_ids: [...scope.ac_ids],
      implementation_paths: [...implementationPaths],
      allowed_resources: implementationPaths.map((sourcePath) => `file:${sourcePath}`),
      config_digest: configDigest,
      runtime_source_revision: runtimeSnapshot.digest,
      runtime_code_digest: runtimeSnapshot.digest,
      schema_digest: schemaEntry.sha256,
    },
    contracts: {
      scope: { schema: 'ImplementationScope/v1' as const, path: scopePath, sha256: scopeSha256 },
      acceptance: { schema: 'AcceptanceManifest/v1' as const, path: acceptancePath, sha256: acceptanceSha256 },
      decisions: [],
    },
    lease: { ...seed.work.lease!, thread_id: threadId },
    execution: {
      ...seed.work.execution,
      run_id: runId,
      input_digest: canonicalJsonDigest({
        item,
        scope: scopeSha256,
        acceptance: acceptanceSha256,
        source: sourceScope.digest,
      }),
      assignment_attempts: [],
    },
    lifecycle: {
      ...seed.work.lifecycle,
      source_revision: sourceScope.digest,
      config_binding: {
        config_digest: configDigest,
        schema_digest: schemaEntry.sha256,
        runtime_code_digest: runtimeSnapshot.digest,
      },
      scope: {
        scope_id: scope.scope_id,
        allowed_paths: [...implementationPaths],
        fingerprint_paths: [...implementationPaths],
        implementation_paths: [...implementationPaths],
        documentation_paths: [],
      },
      references: [
        {
          ...commonReference,
          kind: 'implementation_scope' as const,
          artifact_schema: 'ImplementationScope/v1',
          record_id: scope.scope_id,
          path: scopePath,
          sha256: scopeSha256,
          principal: null,
          decision: null,
        },
        {
          ...commonReference,
          kind: 'acceptance_manifest' as const,
          artifact_schema: 'AcceptanceManifest/v1',
          record_id: acceptance.id,
          path: acceptancePath,
          sha256: acceptanceSha256,
          principal: null,
          decision: null,
        },
        {
          ...commonReference,
          kind: 'execution_approval' as const,
          artifact_schema: 'LocalSourceWriteAuthorization/v1',
          record_id: authorization.user_instruction_ref,
          path: authorizationPath,
          sha256: authorizationSha256,
          principal: 'local-session:' + canonicalJsonDigest(threadId),
          decision: 'approved' as const,
        },
      ],
    },
  };
  const nextLedger = {
    ...seed.ledger,
    tickets: seed.ledger.tickets.map((ticket) => ({
      ...ticket,
      repository_id: identity.repository_id,
      project_ids: [...projectIds],
      integrations_digest: identity.integrations_digest,
      thread_id: threadId,
      source_revision: sourceScope.digest,
      contour_keys: [
        ...new Set([
          ...config.integrations.providers
            .filter((provider) => projectIds.includes(provider.project_id))
            .flatMap((provider) => [
              `tenant:${provider.tenant_id}`,
              `project:${provider.tenant_id}/${provider.project_id}`,
            ]),
          ...implementationPaths.map((sourcePath) => `file:${sourcePath}`),
        ]),
      ].sort(),
      exclusive_resources: implementationPaths.map((sourcePath) => `file:${sourcePath}`),
      active_resources: implementationPaths.map((sourcePath) => `file:${sourcePath}`),
    })),
    claims: seed.ledger.claims.map((claim) => ({
      ...claim,
      thread_id: threadId,
      resources: implementationPaths.map((sourcePath) => `file:${sourcePath}`),
    })),
  };
  const admitted = store.compareAndSwapHostState({ expectedWork: null, expectedLedger: null, nextWork, nextLedger });
  requireHostState(admitted);
  expect(admitted.work.execution.run_id).toBe(runId);
  expect(admitted.work.execution.assignment_attempts).toEqual([]);
  const projectSet = loadProjectSetContext(repositoryRoot, config, identity.repository_id, projectIds);
  const request: TaskSourceBindingRequest = {
    schema: 'TaskSourceBindingRequest/v1',
    operation: 'propose-create',
    operation_id: `fixture-${randomUUID()}`,
    request_id: `fixture-${randomUUID()}`,
    branch_ref: 'refs/heads/codex/fresh-multi-project-tasksource-refusal',
    source_root: path.join(repositoryRoot, '.tmp', 'task-source-target-not-created'),
    expected_host: {
      work: admitted.workVersion,
      ledger: admitted.ledgerVersion,
      journal: { attempt: 1, version: initialJournal.version },
      maintenance_generation: admitted.maintenanceGeneration,
    },
    work_id: workId,
    attempt: 1,
    thread_id: threadId,
    repository_id: identity.repository_id,
    project_ids: projectIds,
    canonical_host_root: repositoryRoot,
    config_digest: configDigest,
    project_context_digest: projectSet.project_context_digest,
  };
  const prepared = store.prepareTaskSourceBindingOperation({
    request,
    identity,
    verifyCurrent: ({ journal }) => {
      if (!journal.source_scope) throw new Error('Fresh TaskSource Journal has no Source scope');
      return { source_authorization_sha256: authorizationSha256, source_scope_digest: journal.source_scope.digest };
    },
  });
  expect(prepared.status).toBe('prepared');
  const rows = nativeDatabaseSnapshotReader(databaseLedger.sessionProducerBinding().database);
  const beforeRows = rows();
  const beforeHost = store.readHostStateSnapshot(identity);
  requireHostState(beforeHost);
  const beforeJournal = databaseLedger.resume(workId, 1);
  if (!beforeJournal) throw new Error('Fresh TaskSource Journal disappeared before issue');
  expect(store.readWorkSessionJournal(identity)).toEqual({
    attempt: beforeJournal.state.attempt,
    version: beforeJournal.version,
    state: beforeJournal.state,
  });
  expect(request.expected_host.journal).toEqual({
    attempt: beforeJournal.state.attempt,
    version: beforeJournal.version,
  });
  let issuedInput: Parameters<typeof store.issueTaskSourceBindingOperation>[0] | undefined;
  const issue = store.issueTaskSourceBindingOperation.bind(store);
  const issueObserver = spyOn(store, 'issueTaskSourceBindingOperation').mockImplementation((input) => {
    issuedInput = input;
    return issue(input);
  });
  let nativeHostReads = 0;
  let observedHost: ReturnType<typeof store.readHostStateSnapshot> | undefined;
  const observedIdentities: WorkIdentity[] = [];
  const readHost = store.readHostStateSnapshot.bind(store);
  const hostObserver = spyOn(store, 'readHostStateSnapshot').mockImplementation((candidate) => {
    const snapshot = readHost(candidate);
    if (candidate.work_id === workId) {
      nativeHostReads++;
      observedIdentities.push(candidate);
      observedHost = snapshot;
    }
    return snapshot;
  });
  const refusal = await withInitialSourceCleanup(
    () => rejectionReason(store.issueTaskSourceBindingOperation({ request, identity })),
    () => {
      hostObserver.mockRestore();
      issueObserver.mockRestore();
    },
    'Fresh multi-project TaskSource native observer restoration',
  );
  expect(() => {
    throw refusal;
  }).toThrow('task-source policy requires one admitted project');
  expect(issuedInput).toEqual({ request, identity });
  expect(nativeHostReads).toBe(1);
  expect(observedIdentities.every((candidate) => canonicalJson(candidate) === canonicalJson(identity))).toBe(true);
  expect(observedHost).toEqual(beforeHost);
  expect(rows()).toEqual(beforeRows);
  expect(
    databaseLedger
      .sessionProducerBinding()
      .database.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'",
      )
      .all(),
  ).toEqual([]);
  expect(store.readHostStateSnapshot(identity)).toEqual(beforeHost);
  expect(databaseLedger.resume(workId, 1)).toEqual(beforeJournal);
  expect(readFileSync(path.join(repositoryRoot, authorizationPath))).toEqual(authorizationBytes);
  expect(readFileSync(path.join(repositoryRoot, scopePath))).toEqual(scopeBytes);
  expect(readFileSync(path.join(repositoryRoot, acceptancePath))).toEqual(acceptanceBytes);
  expect(existsSync(requiredValue(request.source_root, 'Fresh TaskSource target'))).toBe(false);
  expect(beforeHost.work.execution.assignment_attempts).toEqual([]);
  expect(performance.now()).toBeLessThan(caseDeadline);
  await withInitialSourceCleanup(
    () => undefined,
    () => {
      databaseLedger.close();
      const index = mastraLedgers.indexOf(databaseLedger);
      if (index >= 0) mastraLedgers.splice(index, 1);
    },
    'Fresh multi-project TaskSource ledger cleanup',
  );
  expect(performance.now()).toBeLessThan(caseDeadline);
  retainScratch = false;
});

test('configured Source principal race retains native reserved no-effect retries and rejects fresh handle B before writes', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      const host = initialSourceHostStore(fixture);
      const admitted = host.readHostStateSnapshot(fixture.identity);
      requireHostState(admitted);
      await bindControlledRuntimeInitialization(fixture.root, fixture.config, host);
      await runPreparationFixtureInProcess(
        {
          args: [],
          publicRun: () => {
            throw new Error('Principal fixture must not enter public CLI');
          },
          sync: () => initialSourceJournal(fixture),
          repositoryRoot: fixture.root,
          workId: fixture.identity.work_id,
          attempt: 1,
          work: admitted.work,
        },
        {
          ledger: initialSourceHostLedger(fixture),
          bridge: requiredValue(fixture.bridge, 'Native preparation bridge'),
          source: fixture.originalSource,
        },
      );
      const database = initialSourceHostDatabase(fixture);
      const nativeRows = nativeDatabaseSnapshotReader(database);
      const admission = initialSourceAdmissionInput(fixture);
      const journal = initialSourceJournal(fixture);
      const item = requiredValue(journal.state.items[0], 'current configured writer');
      if (journal.state.items.length !== 1 || item.request.stage_id !== 'develop_task')
        throw new Error('Principal race fixture did not reach the single configured Source writer');
      const initial = host.readHostStateSnapshot(fixture.identity);
      requireHostState(initial);
      const initialLease = requiredValue(initial.work.lease, 'initial Source lease');
      const originalAuthorization = readFileSync(path.join(fixture.root, fixture.sourceAuthorizationPath));
      const originalIntake = readFileSync(path.join(fixture.root, fixture.rawIntakePath));
      const canonicalIntakePath = path.join(
        fixture.root,
        '.agent/work/' + fixture.identity.work_id + '/local-session-intake.v1.json',
      );
      const originalCanonicalIntake = readFileSync(canonicalIntakePath);
      const journalBefore = nativeRows().tables.agent_host_mastra_session_ledger;
      const seed = await runSessionPrincipalRetry({
        mode: 'seed',
        root: fixture.root,
        identity: fixture.identity,
        selection: admission.selection,
        nativeSessionHandle: initialLease.thread_id,
      });
      expect(seed.mode).toBe('seed');
      expect(seed.approvalAction).toBe('source.write');
      expect(seed.approval).not.toBeNull();
      expect(seed.previousAttemptId).toBeNull();
      expect(seed.successor).toBe(initialLease.thread_id);
      expect(seed.dispatchCalls).toBe(0);
      expect(seed.casWriterCalls).toBe(0);
      expect(seed.stageId).toBe(item.request.stage_id);
      expect(seed.assignmentIndex).toBe(item.request.assignment_index);
      expect(seed.actionId).toBe(item.request.action_id);
      expect(seed.noEffectAfterimage).toMatchObject({
        attempt_id: seed.attemptId,
        request_digest: seed.requestDigest,
        status: 'no_effect',
        result: null,
        result_digest: null,
      });
      expect(seed.journalItem).toMatchObject({ issue_id: null, observation: null });
      expect(host.readHostStateSnapshot(fixture.identity).work?.lease).toEqual(seed.retryLease);
      expect(nativeRows().tables.agent_host_mastra_session_ledger).toEqual(journalBefore);

      let lineageReads = 0;
      let armed = true;
      let transitionLineageRead: number | undefined;
      let nested: PrincipalRetryReceipt | undefined;
      let nestedFailure: { readonly error: unknown } | undefined;
      let admittedCompositionPrincipal: string | undefined;
      let outerCapturedLease: unknown;
      let nestedTransitionAfterimage: ReturnType<typeof nativeRows> | undefined;
      const originalClaim = host.claimWorkflowAssignmentWithApproval.bind(host);
      const claimBoundary = spyOn(host, 'claimWorkflowAssignmentWithApproval').mockImplementationOnce(
        async (...args) => {
          const openAdmitted = admittedSessionExecution.openAdmittedSessionExecution;
          const admittedBoundary = spyOn(admittedSessionExecution, 'openAdmittedSessionExecution').mockImplementation(
            async (...input) => {
              if (armed) {
                armed = false;
                transitionLineageRead = lineageReads;
                try {
                  nested = await runSessionPrincipalRetry({
                    mode: 'nested',
                    root: fixture.root,
                    identity: fixture.identity,
                    selection: admission.selection,
                    nativeSessionHandle: initialLease.thread_id,
                    successorSessionHandle: 'native-principal-successor-B',
                    previousAttemptId: seed.attemptId,
                  });
                  nestedTransitionAfterimage = nativeRows();
                } catch (error) {
                  nestedFailure = { error };
                  throw error;
                }
              }
              const execution = await openAdmitted(...input);
              if (nested) admittedCompositionPrincipal = execution.composition.authentication.principal;
              return execution;
            },
          );
          const readLineage = host.readInitialSourceContinuationLineageView.bind(host);
          const readHost = host.readHostStateSnapshot.bind(host);
          const lineageBoundary = spyOn(host, 'readInitialSourceContinuationLineageView').mockImplementation(
            (...lineageArgs) => {
              const view = readLineage(...lineageArgs);
              lineageReads++;
              return view;
            },
          );
          const hostBoundary = spyOn(host, 'readHostStateSnapshot').mockImplementation((identity) => {
            const actual = readHost(identity);
            if (
              outerCapturedLease === undefined &&
              canonicalJsonDigest(identity) === canonicalJsonDigest(fixture.identity)
            )
              outerCapturedLease = actual.work?.lease;
            return actual;
          });
          return withInitialSourceCleanup(
            () => originalClaim(...args),
            () =>
              completeOwnedCleanup([
                () => {
                  admittedBoundary.mockRestore();
                  return undefined;
                },
                () => {
                  hostBoundary.mockRestore();
                  return undefined;
                },
                () => {
                  lineageBoundary.mockRestore();
                  return undefined;
                },
              ]),
            'Native Source principal retry observer restoration',
          );
        },
      );

      await withInitialSourceCleanup(
        async () => {
          const denial = await rejectionReason(issueInitialSourceFixtureWriter(fixture));
          if (nestedFailure) throw nestedFailure.error;
          expect(() => {
            throw denial;
          }).toThrow('workflow approval denied');
          expect(claimBoundary).toHaveBeenCalledTimes(1);
          expect(transitionLineageRead).toBeGreaterThan(0);
          expect(lineageReads).toBeGreaterThan(0);
          expect(outerCapturedLease).toEqual(seed.retryLease);
          if (!nested) throw new Error('Native nested reserved retry did not produce a child receipt');
          expect(nested.mode).toBe('nested');
          expect(nested.approvalAction).toBe('source.write');
          expect(nested.approval).not.toBeNull();
          expect(nested.successor).toBe('native-principal-successor-B');
          expect(nested.attemptId).not.toBe(seed.attemptId);
          expect(nested.previousAttemptId).toBe(seed.attemptId);
          expect(nested.requestDigest).toBe(seed.requestDigest);
          expect(nested.workItemDigest).toBe(seed.workItemDigest);
          expect(nested.input).toEqual(seed.input);
          expect(nested.workContextDigest).not.toBe(seed.workContextDigest);
          expect(nested.attemptLease).toEqual(seed.retryLease);
          expect(nested.stageId).toBe(item.request.stage_id);
          expect(nested.assignmentIndex).toBe(item.request.assignment_index);
          expect(nested.actionId).toBe(item.request.action_id);
          expect(nested.noEffectAfterimage).toMatchObject({
            attempt_id: nested.attemptId,
            request_digest: nested.requestDigest,
            status: 'no_effect',
            result: null,
            result_digest: null,
          });
          expect(nested.approval).not.toBeNull();
          expect(nested.actualCompositionPrincipal).toBe(
            'local-session:' + canonicalJsonDigest(seed.retryLease.thread_id),
          );
          expect(nested.reservationSchema).toBe('WorkflowSessionReservation/v1');
          expect(nested.reservationRequest).toMatchObject({
            stageId: item.request.stage_id,
            assignmentIndex: item.request.assignment_index,
          });
          expect(admittedCompositionPrincipal).toBe(
            'local-session:' + canonicalJsonDigest('native-principal-successor-B'),
          );
          expect(admittedCompositionPrincipal).not.toBe(
            'local-session:' + canonicalJsonDigest(seed.retryLease.thread_id),
          );
          expect(nested.retryLease).toEqual({
            ticket_id: seed.retryLease.ticket_id,
            thread_id: 'native-principal-successor-B',
            generation: seed.retryLease.generation + 1,
          });
          expect(nested.dispatchCalls).toBe(0);
          expect(nested.casWriterCalls).toBe(0);
          expect(nested.journalItem).toMatchObject({ issue_id: null, observation: null });
          const finalWork = requiredValue(host.readHostStateSnapshot(fixture.identity).work, 'final Host Work');
          expect(finalWork.lease).toEqual(nested.retryLease);
          for (const receipt of [seed, nested]) {
            const afterimage = finalWork.execution.assignment_attempts.find(
              (entry) => entry.attempt_id === receipt.attemptId,
            );
            expect(afterimage).toMatchObject({
              attempt_id: receipt.attemptId,
              request_digest: receipt.requestDigest,
              status: 'no_effect',
              result: null,
              result_digest: null,
              reconciliation: { retry_lease: receipt.retryLease },
            });
          }
          const transitionedRows = requiredValue(
            nestedTransitionAfterimage,
            'nested retry transition database afterimage',
          );
          expect(transitionedRows.tables.agent_host_mastra_session_ledger).toEqual(journalBefore);
          expect(nativeRows()).toEqual(transitionedRows);
          expect(readFileSync(path.join(fixture.root, fixture.sourceAuthorizationPath))).toEqual(originalAuthorization);
          expect(readFileSync(path.join(fixture.root, fixture.rawIntakePath))).toEqual(originalIntake);
          expect(readFileSync(canonicalIntakePath)).toEqual(originalCanonicalIntake);
          expect(database.inTransaction).toBe(false);
        },
        () => claimBoundary.mockRestore(),
        'Native Source principal retry claim observer restoration',
      );
    },
    {},
    20_000,
  );
}, 20_000);

test('configured native continuation reaches the retained TaskSource authorization refusal without writes', async () => {
  const beforeimage = runtimePackageBeforeimageFixture(tmpdir(), 'vida-agent', (allocated) => {
    console.info('Configured continuation retained package beforeimage: ' + allocated);
  });
  await beforeimage.bindBeforeimage(async (restorePackage) => {
    await withAdmittedHandoffFixture(
      async (fixture) => {
        let continuationLedger: MastraSessionLedger | undefined;
        await withInitialSourceCleanup(
          async () => {
            const host = initialSourceHostStore(fixture);
            const admission = initialSourceAdmissionInput(fixture);
            const retainedAuthorization = await readFile(path.join(fixture.root, fixture.sourceAuthorizationPath));
            await bindControlledRuntimeInitialization(fixture.root, fixture.config, host);
            await runSynthesisFixtureInProcess(
              {
                args: [],
                publicRun: () => {
                  throw new Error('Native continuation fixture must not enter public CLI');
                },
                sync: () => initialSourceJournal(fixture),
                repositoryRoot: fixture.root,
                workId: fixture.identity.work_id,
                attempt: 1,
                work: (() => {
                  const state = host.readHostStateSnapshot(fixture.identity);
                  requireHostState(state);
                  return state.work;
                })(),
              },
              {
                ledger: initialSourceHostLedger(fixture),
                bridge: fixture.bridge!,
                source: fixture.originalSource,
              },
            );
            const preparationOwner = host.readHostStateSnapshot(fixture.identity);
            requireHostState(preparationOwner);
            const journal = requiredMastraSnapshot(initialSourceJournal(fixture));
            expect(journal.state.items).toHaveLength(1);
            expect(journal.state.items[0]).toMatchObject({ issue_id: null, observation: null });
            acquireLocalSourceWriterLease({
              repositoryRoot: fixture.root,
              config: fixture.config,
              store: host,
              identity: fixture.identity,
              nativeSessionHandle: admission.nativeSessionHandle,
              stageId: 'develop_task',
              assignmentIndex: 0,
              expectedWork: preparationOwner.workVersion,
              expectedLedger: preparationOwner.ledgerVersion,
              expectedSessionJournal: { attempt: 1, version: journal.version },
            });
            const before = host.readHostStateSnapshot(fixture.identity);
            requireHostState(before);
            const source = requiredValue(journal.state.source_scope, 'Native continuation Source');
            const engineBinding = {
              repositoryRoot: fixture.root,
              config: fixture.config,
              selection: admission.selection,
              context: { ...admission.context, scope_digest: source.digest },
              workflowId: before.work.binding.workflow_id,
              runId: requiredValue(before.work.execution.run_id, 'Native continuation run'),
            };
            const engine = readRetainedUnissuedSessionEngineSnapshot(engineBinding, {
              work: before.work,
              journal: journal.state,
            });
            suspendLocalWork({
              store: host,
              identity: fixture.identity,
              journal,
              expectedWork: before.workVersion,
              expectedLedger: before.ledgerVersion,
              expectedMaintenanceGeneration: before.maintenanceGeneration,
              nativeSessionHandle: admission.nativeSessionHandle,
              userRequestPointer: 'fixture:configured-native-tasksource-continuation',
              requestIntent: 'linked_correction',
              config: fixture.config,
              documentationContext: {
                repository_root: fixture.root,
                repository_id: fixture.identity.repository_id,
                project_id: 'sample',
                work_id: fixture.identity.work_id,
              },
            });
            const paused = host.readHostStateSnapshot(fixture.identity);
            requireHostState(paused);
            restorePackage();
            const configPath = path.join(fixture.root, 'agent-runtime.config.v1.yaml');
            writeFileSync(configPath, fixture.currentConfigBytes);
            const targetConfig = loadRuntimeConfig(fixture.root);
            const targetConfigDigest = runtimeConfigDigest(targetConfig);
            const evolvedSource = changeOneAcceptedDocument(fixture);
            const authorizedSourceChanges = compareScopedSourceSnapshots(source, evolvedSource);
            const project = loadProjectSetContext(
              fixture.root,
              targetConfig,
              fixture.identity.repository_id,
              fixture.identity.project_ids,
            );
            const action = projectConfiguredFrontierContinuationAction({
              engine,
              journal: journal.state,
              targetConfigDigest,
              currentSourceScope: evolvedSource,
            });
            const requests = projectConfiguredPrewriterContinuationRequests({
              ...engineBinding,
              config: targetConfig,
              context: { ...engineBinding.context, scope_digest: evolvedSource.digest },
              engine,
              journal: journal.state,
              currentSourceScope: evolvedSource,
              lifecycleRisk: paused.work.lifecycle.risk,
            });
            expect(requests.map((item) => item.role)).toEqual(['source-planner']);
            const seed = continuationRequestSeed({
              priorConfigDigest: paused.work.binding.config_digest,
              targetConfigDigest,
              projectIds: fixture.identity.project_ids,
              workspaceId: host.workspaceId,
            });
            const unsigned: DeliveredWorkContinuationRequest = {
              ...seed,
              identity: fixture.identity,
              nativeSessionHandle: admission.nativeSessionHandle,
              expectedWork: paused.workVersion,
              expectedLedger: paused.ledgerVersion,
              expectedJournal: journal.version,
              expectedMaintenanceGeneration: paused.maintenanceGeneration,
              priorRuntimeCodeDigest: paused.work.binding.runtime_code_digest,
              targetRuntimeCodeDigest: beforeimage.current.digest,
              targetSchemaDigest: paused.work.binding.schema_digest,
              targetProjectContextDigest: project.project_context_digest,
              currentSourceScope: evolvedSource,
              authorizedSourceChanges,
              action,
              originalRequestPointer: 'fixture:configured-native-tasksource-continuation',
            };
            const request = { ...unsigned, sourceTransition: normalConfigEndpointProof(unsigned) };
            const db = initialSourceHostDatabase(fixture);
            const principal = 'fixture:configured-native-tasksource-continuation';
            const continuationStore = new HostStateStore(
              db,
              host.workspaceId,
              undefined,
              undefined,
              undefined,
              undefined,
              fixture.root,
              undefined,
              undefined,
              {
                principal,
                verify: (candidate) =>
                  canonicalJsonDigest(candidate) === canonicalJsonDigest(request)
                    ? {
                        schema: 'VidaDeliveredWorkContinuationAuthorization/v1',
                        request_digest: canonicalJsonDigest(candidate),
                        principal,
                        transition_digest: candidate.sourceTransition.transition_digest,
                        action_digest: canonicalJsonDigest(candidate.action),
                      }
                    : null,
              },
            );
            const continued = await continuationStore.continueDeliveredWork(request);
            expect(continued.status).toBe('continued');
            expect(continued.receipt.rights_granted).toBe(false);
            expect(before.work.binding.runtime_code_digest).toBe(beforeimage.before.digest);
            expect(continued.snapshot.work?.binding.runtime_code_digest).toBe(beforeimage.current.digest);

            continuationLedger = openConfiguredMastraSessionLedger(fixture.root);
            const continuationContext = { ...admission.context, scope_digest: evolvedSource.digest };
            const bridge = await MastraSessionBridge.open({
              repositoryRoot: fixture.root,
              config: targetConfig,
              ledger: continuationLedger,
              projectIds: fixture.identity.project_ids,
              selection: admission.selection,
              context: continuationContext,
              workflowId: paused.work.binding.workflow_id,
              workspaceId: host.workspaceId,
              configuredFrontier: { identity: fixture.identity, attempt: 1 },
            });
            await withInitialSourceCleanup(
              async () => {
                const currentJournal = requiredMastraSnapshot(continuationLedger!.resume(fixture.identity.work_id, 1));
                const stepId = requiredValue(currentJournal.state.step_id, 'Native continuation planner step');
                let issued = continuationLedger!.issueWave(fixture.identity.work_id, 1, currentJournal.version);
                for (const item of issued.state.items) {
                  const preparation = createPrewriterPreparationObservation(
                    { request: item.request, issue_id: requiredValue(item.issue_id, 'Continuation planner issue') },
                    {
                      work: requiredValue(
                        continuationLedger!.hostState.readHostStateSnapshot(fixture.identity).work,
                        'Continuation planner Work',
                      ),
                      workId: fixture.identity.work_id,
                    },
                    1,
                  );
                  const summary = JSON.stringify(preparation);
                  issued = continuationLedger!.report(
                    fixture.identity.work_id,
                    1,
                    issued.version,
                    {
                      schema: 'VidaSessionObservation/v1',
                      action_id: item.request.action_id,
                      issue_id: requiredValue(item.issue_id, 'Continuation planner report issue'),
                      agent_id: preparation.observer_id,
                      tool_call_ref: 'fixture:configured-continuation-planner-' + item.issue_id,
                      status: 'reported_complete',
                      summary,
                      output_digest: canonicalJsonDigest(summary),
                      evidence_refs: preparation.evidence_refs,
                    },
                    evolvedSource,
                  );
                }
                const observations = issued.state.items.map((item) =>
                  requiredValue(item.observation, 'Continuation planner observation'),
                );
                await bridge.resume(stepId, observations, evolvedSource);
              },
              () => bridge.close(),
              'Configured TaskSource continuation bridge cleanup',
            );

            const configured = continuationLedger;
            expect(configured.hostState.readInitialSourceContinuationLineageView(fixture.identity, 1)).toBeNull();
            expect(
              canonicalJson(
                configured.hostState.readConfiguredFrontierRecoveryView(fixture.identity, 1)?.original ?? null,
              ),
            ).toBe(canonicalJson(continued.receipt));
            const owner = configured.hostState.readHostStateSnapshot(fixture.identity);
            requireHostState(owner);
            const developerJournal = requiredMastraSnapshot(configured.resume(fixture.identity.work_id, 1));
            expect(developerJournal.state.items.map((item) => item.request.stage_id)).toEqual(['develop_task']);
            expect(
              developerJournal.state.items.every((item) => item.issue_id === null && item.observation === null),
            ).toBe(true);
            const developer = developerJournal.state.items[0]!;
            acquireLocalSourceWriterLease({
              repositoryRoot: fixture.root,
              config: targetConfig,
              store: configured.hostState,
              identity: fixture.identity,
              nativeSessionHandle: admission.nativeSessionHandle,
              stageId: developer.request.stage_id,
              assignmentIndex: developer.request.assignment_index,
              expectedWork: owner.workVersion,
              expectedLedger: owner.ledgerVersion,
              expectedSessionJournal: { attempt: 1, version: developerJournal.version },
            });
            const taskSourceOwner = configured.hostState.readHostStateSnapshot(fixture.identity);
            requireHostState(taskSourceOwner);
            const projectContext = loadProjectContext(
              fixture.root,
              targetConfig,
              fixture.identity.repository_id,
              'sample',
            );
            const taskSourceRequest: TaskSourceBindingRequest = {
              schema: 'TaskSourceBindingRequest/v1',
              operation: 'propose-create',
              operation_id: 'fixture-configured-continuation-old-authorization',
              request_id: 'fixture-configured-continuation-old-authorization-request',
              branch_ref: 'refs/heads/codex/configured-continuation-old-authorization',
              expected_host: {
                work: taskSourceOwner.workVersion,
                ledger: taskSourceOwner.ledgerVersion,
                journal: { attempt: 1, version: developerJournal.version },
                maintenance_generation: taskSourceOwner.maintenanceGeneration,
              },
              work_id: fixture.identity.work_id,
              attempt: 1,
              thread_id: admission.nativeSessionHandle,
              repository_id: fixture.identity.repository_id,
              project_ids: fixture.identity.project_ids,
              canonical_host_root: fixture.root,
              source_root: path.join(fixture.root, '.tmp', 'configured-continuation-task-source'),
              config_digest: runtimeConfigDigest(targetConfig),
              project_context_digest: projectContext.project_context_digest,
            };
            const authorizationSha = createHash('sha256')
              .update(await readFile(path.join(fixture.root, fixture.sourceAuthorizationPath)))
              .digest('hex');
            const preparation = expectReturned(() =>
              configured.hostState.prepareTaskSourceBindingOperation({
                request: taskSourceRequest,
                identity: fixture.identity,
                verifyCurrent: ({ journal: current }) => {
                  if (!current.source_scope) throw new Error('Continued TaskSource Journal has no Source scope');
                  return {
                    source_authorization_sha256: authorizationSha,
                    source_scope_digest: current.source_scope.digest,
                  };
                },
              }),
            );
            expect(preparation.status).toBe('prepared');
            const readRows = nativeDatabaseSnapshotReader(db);
            const beforeRefusal = readRows();
            const beforeJournal = configured.resume(fixture.identity.work_id, 1);
            const beforeSource = snapshotDeclaredSources(requireSafeRepositoryAccess(fixture.root), fixture.documents);
            const authorizationPath = path.join(fixture.root, fixture.sourceAuthorizationPath);
            const beforeAuthorization = await readFile(authorizationPath);
            expect(beforeAuthorization).toEqual(retainedAuthorization);
            const readContinuation = configured.hostState.readConfiguredFrontierRecoveryView.bind(configured.hostState);
            let nativeContinuationReads = 0;
            const continuationObserver = spyOn(
              configured.hostState,
              'readConfiguredFrontierRecoveryView',
            ).mockImplementation((...args) => {
              const view = readContinuation(...args);
              if (view && canonicalJsonDigest(view.original) === canonicalJsonDigest(continued.receipt))
                nativeContinuationReads++;
              return view;
            });
            const refusal = await withInitialSourceCleanup(
              () =>
                rejectionReason(
                  configured.hostState.issueTaskSourceBindingOperation({
                    request: taskSourceRequest,
                    identity: fixture.identity,
                  }),
                ),
              () => continuationObserver.mockRestore(),
              'Configured continuation native read observer restoration',
            );
            expect(() => {
              throw refusal;
            }).toThrow('current scoped human Source permission does not authorize this task-source operation');
            expect(nativeContinuationReads).toBeGreaterThanOrEqual(2);
            expect(readRows()).toEqual(beforeRefusal);
            expect(configured.resume(fixture.identity.work_id, 1)).toEqual(beforeJournal);
            expect(
              db
                .query(
                  "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'",
                )
                .all(),
            ).toEqual([]);
            expect(snapshotDeclaredSources(requireSafeRepositoryAccess(fixture.root), fixture.documents)).toEqual(
              beforeSource,
            );
            expect(await readFile(authorizationPath)).toEqual(beforeAuthorization);
            expect(configured.hostState.readDeliveredWorkContinuationReceipt(fixture.identity, 1)).toEqual(
              continued.receipt,
            );
            expect(db.inTransaction).toBe(false);
            expect(configured.sessionProducerBinding().database.inTransaction).toBe(false);
          },
          () => continuationLedger?.close(),
          'Configured native TaskSource continuation ledger cleanup',
        );
      },
      { legacyTaskFrontier: true },
      20_000,
    );
  });
}, 20_000);

test('configured TaskSource proposal binds real admitted policy evidence before issuing its inert argv', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await prepareInitialSourceFrontier(fixture, 'writer');
      const host = initialSourceHostStore(fixture),
        ledger = initialSourceHostLedger(fixture);
      const before = host.readHostStateSnapshot(fixture.identity);
      requireHostState(before);
      expect(
        before.work.lifecycle.references
          .filter(
            (reference) =>
              reference.artifact_schema === 'LifecyclePreparationObservation/v1' && reference.disposition === 'current',
          )
          .map((reference) => reference.kind)
          .sort(),
      ).toEqual(['source_plan']);
      const journal = requiredMastraSnapshot(ledger.resume(fixture.identity.work_id, 1));
      if (!before.work.lease) throw new Error('Configured TaskSource fixture has no lease');
      const project = loadProjectContext(fixture.root, fixture.config, fixture.identity.repository_id, 'sample');
      const request: TaskSourceBindingRequest = {
        schema: 'TaskSourceBindingRequest/v1',
        operation: 'propose-create',
        operation_id: 'fixture-configured-policy',
        request_id: 'fixture-configured-policy-request',
        branch_ref: 'refs/heads/codex/fixture-configured-policy',
        expected_host: {
          work: before.workVersion,
          ledger: before.ledgerVersion,
          journal: { attempt: 1, version: journal.version },
          maintenance_generation: before.maintenanceGeneration,
        },
        work_id: fixture.identity.work_id,
        attempt: 1,
        thread_id: before.work.lease.thread_id,
        repository_id: fixture.identity.repository_id,
        project_ids: fixture.identity.project_ids,
        canonical_host_root: fixture.root,
        source_root: path.join(fixture.root, '.tmp', 'task-source-policy'),
        config_digest: runtimeConfigDigest(fixture.config),
        project_context_digest: project.project_context_digest,
      };
      const authorizationSha = createHash('sha256')
        .update(await readFile(path.join(fixture.root, fixture.sourceAuthorizationPath)))
        .digest('hex');
      const prepared = expectReturned(() =>
        host.prepareTaskSourceBindingOperation({
          request,
          identity: fixture.identity,
          verifyCurrent: ({ journal: current }) => {
            if (!current.source_scope) throw new Error('Configured TaskSource journal has no Source scope');
            return { source_authorization_sha256: authorizationSha, source_scope_digest: current.source_scope.digest };
          },
        }),
      );
      expect(prepared.status).toBe('prepared');
      const issued = await expectAsyncReturned(() =>
        host.issueTaskSourceBindingOperation({ request, identity: fixture.identity }),
      );
      expect(issued.status).toBe('issued');
      if (!isPlainRecord(issued.action)) throw new Error('Configured TaskSource issued action is missing');
      expect(issued.action).toMatchObject({
        status: 'issued',
        operation_id: request.operation_id,
        request_id: request.request_id,
      });
      expect(issued.action.command_argv).toEqual([
        ['-C', fixture.root, 'worktree', 'add', '--branch', 'codex/fixture-configured-policy', request.source_root],
      ]);
      expect(ledger.resume(fixture.identity.work_id, 1)).toEqual(journal);
      const pendingTaskSource = initialSourceHostDatabase(fixture).query<Record<string, unknown>, [string, string]>(
        'SELECT * FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
      );
      const originalAction = pendingTaskSource.get(host.workspaceId, request.operation_id);
      if (!originalAction) throw new Error('Issued TaskSource proposal action is missing');
      const transitioned = host.readHostStateSnapshot(fixture.identity);
      requireHostState(transitioned);
      const lineage = host.readInitialSourceContinuationLineageView(fixture.identity, 1);
      if (!lineage?.bindingCheckpoint) throw new Error('Issued TaskSource proposal has no native binding checkpoint');
      expect(lineage.bindingCheckpoint).toEqual({
        schema: 'InitialSourceBindingCheckpoint/v1',
        continuation_id: lineage.receipt.continuation_id,
        request_digest: lineage.receipt.request_digest,
        work_version: transitioned.workVersion,
        boundary_binding_digest: canonicalJsonDigest(lineage.receipt.successor_work.binding),
      });
      const nativeRows = nativeDatabaseSnapshotReader(initialSourceHostDatabase(fixture));
      const beforeWriter = nativeRows();
      const refusal = await rejectionReason(issueInitialSourceFixtureWriter(fixture));
      expect(() => {
        throw refusal;
      }).toThrow('task source action outcome remains unknown; Source root resolution is blocked');
      expect(nativeRows()).toEqual(beforeWriter);
      expect(pendingTaskSource.get(host.workspaceId, request.operation_id)).toEqual(originalAction);
    },
    { holdExpiredOwnerClock: true },
    20_000,
  );
}, 20_000);

test('queued TaskSource history carries a native checkpoint through configured writer approval without replaying actions', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await prepareInitialSourceFrontier(fixture, 'writer');
      const prepared = await prepareQueuedInitialSourceTaskSource(fixture);
      const host = initialSourceHostStore(fixture);
      const before = host.readHostStateSnapshot(fixture.identity);
      requireHostState(before);
      const lineage = host.readInitialSourceContinuationLineageView(fixture.identity, 1);
      if (!lineage?.bindingCheckpoint) throw new Error('Queued TaskSource transition has no native checkpoint');
      expect(lineage.bindingCheckpoint).toEqual({
        schema: 'InitialSourceBindingCheckpoint/v1',
        continuation_id: lineage.receipt.continuation_id,
        request_digest: lineage.receipt.request_digest,
        work_version: before.workVersion,
        boundary_binding_digest: canonicalJsonDigest(lineage.receipt.successor_work.binding),
      });
      const peer = host.readHostStateSnapshot(prepared.peerIdentity);
      requireHostState(peer);
      const actions = prepared.db.query<Record<string, unknown>, [string, string]>(
        'SELECT * FROM agent_host_task_source_binding_action WHERE workspace_id=? AND operation_id=?',
      );
      const peerAction = actions.get(host.workspaceId, prepared.peerIssued.request.operation_id);
      if (!peerAction) throw new Error('Native queued TaskSource peer has no original issued action');
      expect(actions.get(host.workspaceId, prepared.queued.request.operation_id)).toBeNull();
      const writer = await expectAsyncReturned(() => issueInitialSourceFixtureWriter(fixture));
      expect(writer.journal.state.items[0]?.issue_id).toBe(writer.writer.issue_id);
      expect(writer.journal.state.items[0]?.host_reservation?.receipt.attempt.attempt_id).toBe(writer.hostAttemptId);
      expect(writer.journal.state.items[0]?.observation).toBeNull();
      expect(actions.get(host.workspaceId, prepared.queued.request.operation_id)).toBeNull();
      expect(actions.get(host.workspaceId, prepared.peerIssued.request.operation_id)).toEqual(peerAction);
      const retainedPeer = host.readHostStateSnapshot(prepared.peerIdentity);
      expect(retainedPeer.work).toEqual(peer.work);
      expect(retainedPeer.workVersion).toEqual(peer.workVersion);
      const after = host.readHostStateSnapshot(fixture.identity);
      requireHostState(after);
      expect(
        host.readInitialSourceContinuationLineageView(fixture.identity, 1)?.bindingCheckpoint?.work_version,
      ).toEqual(after.workVersion);
    },
    { holdExpiredOwnerClock: true },
    20_000,
  );
}, 20_000);

test('native synthesis correction preserves admitted predecessors and refuses changed caller plans before exact retry', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      const prepared = await prepareNativeUnnormalizedSynthesis(fixture);
      const host = initialSourceHostStore(fixture),
        ledger = initialSourceHostLedger(fixture),
        db = initialSourceHostDatabase(fixture);
      const before = host.readHostStateSnapshot(fixture.identity);
      requireHostState(before);
      const admitted = initialSourceAdmissionInput(fixture);
      const correctionPointer = 'fixture:correct-selected-synthesis';
      suspendLocalWork({
        store: host,
        identity: fixture.identity,
        journal: prepared.journal,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        nativeSessionHandle: admitted.nativeSessionHandle,
        userRequestPointer: correctionPointer,
        requestIntent: 'linked_correction',
        config: fixture.config,
        documentationContext: {
          repository_root: fixture.root,
          repository_id: fixture.identity.repository_id,
          project_id: 'sample',
          work_id: fixture.identity.work_id,
        },
      });
      const paused = host.readHostStateSnapshot(fixture.identity);
      requireHostState(paused);
      const priorIssue = prepared.originalItem.issue_id;
      if (!priorIssue) throw new Error('Observed synthesis issue is missing');
      const body: Omit<SynthesisObservationCorrectionPlan, 'digest'> = {
        schema: 'VidaSynthesisObservationCorrectionPlan/v1',
        correction_id: 'fixture-selected-synthesis',
        actor: admitted.nativeSessionHandle,
        timestamp: new Date().toISOString(),
        workspace_id: host.workspaceId,
        repository_id: fixture.identity.repository_id,
        project_ids: fixture.identity.project_ids,
        integrations_digest: fixture.identity.integrations_digest,
        work_id: fixture.identity.work_id,
        attempt: 1,
        action_id: prepared.originalItem.request.action_id,
        prior_issue_id: priorIssue,
        native_session_handle: admitted.nativeSessionHandle,
        owner_correction_pointer: correctionPointer,
        config_digest: paused.work.binding.config_digest,
        source_digest: paused.work.binding.work_source_revision,
        predecessor_refs: prepared.catalog.result_refs,
        catalog_digest: canonicalJsonDigest(prepared.catalog),
        expected_work: paused.workVersion,
        expected_ledger: paused.ledgerVersion,
        expected_journal: prepared.journal.version,
        original_item: prepared.originalItem,
      };
      const correction = { ...body, digest: canonicalJsonDigest(body) };
      const rows = nativeDatabaseSnapshotReader(db);
      const preimage = rows();
      for (const changed of [
        { ...body, workspace_id: '0'.repeat(64) },
        { ...body, config_digest: '0'.repeat(64) },
        { ...body, predecessor_refs: [] },
        { ...body, catalog_digest: 'invalid' },
        { ...body, owner_correction_pointer: '' },
      ]) {
        expect(() => ledger.correctObservedSynthesis({ ...changed, digest: canonicalJsonDigest(changed) })).toThrow(
          'synthesis correction plan is invalid',
        );
        expect(rows()).toEqual(preimage);
      }
      for (const [changed, message] of [
        [
          { ...body, expected_journal: { ...body.expected_journal, revision: body.expected_journal.revision + 1 } },
          'synthesis correction journal CAS or source changed',
        ],
        [{ ...body, source_digest: '0'.repeat(64) }, 'synthesis correction journal CAS or source changed'],
        [
          { ...body, action_id: '0'.repeat(64) },
          'synthesis correction is not the exact observed unnormalized native item',
        ],
        [
          { ...body, prior_issue_id: '11111111-1111-4111-8111-111111111111' },
          'synthesis correction is not the exact observed unnormalized native item',
        ],
        [
          { ...body, expected_work: { ...body.expected_work, revision: body.expected_work.revision + 1 } },
          'synthesis correction owner, artifacts or coordination CAS changed',
        ],
        [
          { ...body, expected_ledger: { ...body.expected_ledger, digest: '0'.repeat(64) } },
          'synthesis correction owner, artifacts or coordination CAS changed',
        ],
      ] satisfies readonly (readonly [Omit<SynthesisObservationCorrectionPlan, 'digest'>, string])[]) {
        expect(() => ledger.correctObservedSynthesis({ ...changed, digest: canonicalJsonDigest(changed) })).toThrow(
          message,
        );
        expect(rows()).toEqual(preimage);
      }
      const ownerRow = db
        .query<{ id: string; revision: number; payload: string; digest: string }, [string, string]>(
          "SELECT id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
        )
        .get(host.workspaceId, fixture.identity.work_id);
      if (!ownerRow) throw new Error('Native synthesis correction owner row is missing');
      await withInitialSourceCleanup(
        () => {
          expect(
            db
              .query("DELETE FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
              .run(host.workspaceId, ownerRow.id).changes,
          ).toBe(1);
          const missingOwner = rows();
          expect(() => ledger.correctObservedSynthesis(correction)).toThrow(
            'synthesis correction owner, artifacts or coordination CAS changed',
          );
          expect(rows()).toEqual(missingOwner);
          expect(db.inTransaction).toBe(false);
        },
        () => {
          expect(
            db
              .query(
                "INSERT INTO agent_host_state (workspace_id,kind,id,revision,payload,digest) VALUES (?,'work',?,?,?,?)",
              )
              .run(host.workspaceId, ownerRow.id, ownerRow.revision, ownerRow.payload, ownerRow.digest).changes,
          ).toBe(1);
        },
        'Missing native synthesis owner refusal and exact restoration',
      );
      expect(rows()).toEqual(preimage);
      const originalArtifact = paused.work.artifacts.find((artifact) => artifact.schema === 'ResearchResult/v1');
      if (!originalArtifact) throw new Error('Native synthesis correction has no real research artifact');
      const corruptedOwner = canonicalJson({
        ...paused.work,
        artifacts: paused.work.artifacts.map((artifact) =>
          artifact === originalArtifact
            ? { ...artifact, schema: 'ResearchSynthesis/v1', stage_id: prepared.originalItem.request.stage_id }
            : artifact,
        ),
      });
      const replaceOwnerPayload = (next: string, expected: string) =>
        db
          .query(
            "UPDATE agent_host_state SET payload=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=? AND payload=?",
          )
          .run(next, host.workspaceId, ownerRow.id, ownerRow.revision, ownerRow.digest, expected).changes;
      await withInitialSourceCleanup(
        () => {
          expect(replaceOwnerPayload(corruptedOwner, ownerRow.payload)).toBe(1);
          const corrupted = rows();
          expect(() => ledger.correctObservedSynthesis(correction)).toThrow(
            'synthesis correction owner, artifacts or coordination CAS changed',
          );
          expect(rows()).toEqual(corrupted);
          expect(db.inTransaction).toBe(false);
        },
        () => {
          expect(replaceOwnerPayload(ownerRow.payload, corruptedOwner)).toBe(1);
        },
        'Corrupted native artifact schema/stage refusal and exact payload restoration',
      );
      expect(rows()).toEqual(preimage);
      const corrected = expectReturned(() => ledger.correctObservedSynthesis(correction));
      expect(corrected.state.items).toEqual([
        { request: prepared.originalItem.request, issue_id: null, observation: null },
      ]);
      expect(corrected.state.completed).toEqual(prepared.journal.state.completed);
      expect(ledger.synthesisCorrection(fixture.identity.work_id, 1, body.action_id)).toEqual(correction);
      expect(ledger.synthesisCorrection(fixture.identity.work_id, 1, '0'.repeat(64))).toBeNull();
      expect(expectReturned(() => ledger.correctObservedSynthesis(correction))).toEqual(corrected);
      const receiptRow = () =>
        db
          .query<{ payload: string; digest: string }, [string, string, number, string]>(
            'SELECT payload,digest FROM agent_host_synthesis_observation_correction WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
          )
          .get(host.workspaceId, fixture.identity.work_id, 1, body.action_id);
      const originalReceipt = receiptRow();
      if (!originalReceipt) throw new Error('Native synthesis correction receipt is missing');
      for (const invalid of [
        { ...correction, schema: 'foreign' },
        { ...correction, workspace_id: '0'.repeat(64) },
        { ...correction, work_id: 'foreign' },
        { ...correction, attempt: 2 },
        { ...correction, action_id: '0'.repeat(64) },
        { ...correction, digest: '0'.repeat(64) },
        { ...correction, actor: 'changed receipt actor' },
      ]) {
        await withInitialSourceCleanup(
          () => {
            expect(
              db
                .query(
                  'UPDATE agent_host_synthesis_observation_correction SET payload=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
                )
                .run(canonicalJson(invalid), host.workspaceId, fixture.identity.work_id, 1, body.action_id).changes,
            ).toBe(1);
            const corrupted = receiptRow();
            expect(() => ledger.synthesisCorrection(fixture.identity.work_id, 1, body.action_id)).toThrow(
              'synthesis correction receipt is invalid',
            );
            expect(receiptRow()).toEqual(corrupted);
            expect(db.inTransaction).toBe(false);
          },
          () => {
            expect(
              db
                .query(
                  'UPDATE agent_host_synthesis_observation_correction SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
                )
                .run(
                  originalReceipt.payload,
                  originalReceipt.digest,
                  host.workspaceId,
                  fixture.identity.work_id,
                  1,
                  body.action_id,
                ).changes,
            ).toBe(1);
          },
          'Synthesis receipt refusal and exact row restoration',
        );
        expect(receiptRow()).toEqual(originalReceipt);
      }
      const changed = { ...body, owner_correction_pointer: 'fixture:conflicting-correction' };
      expect(() => ledger.correctObservedSynthesis({ ...changed, digest: canonicalJsonDigest(changed) })).toThrow(
        'synthesis correction receipt conflicts',
      );
      expect(ledger.resume(fixture.identity.work_id, 1)).toEqual(corrected);
      expect(host.readHostStateSnapshot(fixture.identity)).toEqual(paused);
    },
    { cooperativeSynthesis: true, researchSynthesis: true },
  );
});

test.each(['writer', 'task-source'] as const)(
  'authorized corrective engine reaches configured %s policy after its native journal suspension',
  async (mode) => {
    const deadline = performance.now() + 20_000;
    caseDeadline = deadline;
    let fixture: Awaited<ReturnType<typeof createFailedFinalCorrectionFixture>> | undefined;
    let bridge: MastraSessionBridge | undefined;
    let completed = false,
      bridgeClosed = false,
      writerReserved = false;
    await withInitialSourceCleanup(
      async () => {
        const current = await createFailedFinalCorrectionFixture('failed');
        fixture = current;
        console.info('Corrective handoff fixture root: ' + current.root);
        if (performance.now() >= deadline) throw new Error('Corrective handoff setup exhausted its deadline');
        const prepared = prepareLifecycleForCorrection({
          root: current.root,
          config: current.config,
          store: current.store,
          identity: current.identity,
          journal: current.journal,
          preparationPath: current.preparationPath,
        });
        const before = current.store.readHostStateSnapshot(current.identity);
        requireHostState(before);
        const original = current.store.readWorkSessionJournal(current.identity);
        if (!prepared.workVersion || !prepared.ledgerVersion || !original)
          throw new Error('Prepared corrective input is missing');
        const issued = expectReturned(() =>
          current.store.authorizeCorrectiveExecution({
            identity: current.identity,
            attempt: 1,
            expectedWork: before.workVersion,
            expectedLedger: before.ledgerVersion,
            expectedJournal: original.version,
            stageIds: ['develop_task', 'validate_focused', 'test_task'],
            userInstructionRef: 'fixture:selected-corrective-owner',
            config: current.config,
          }),
        );
        const corrected = requiredMastraSnapshot(current.ledger.resume(current.identity.work_id, 1));
        expect(corrected.state).toMatchObject({
          run_id: issued.engine_run_id,
          corrective_execution: issued,
          step_id: null,
          items: [],
          completed: [],
        });
        const archived = [...original.state.completed.flatMap((wave) => wave.items), ...original.state.items].find(
          (item) => item.observation !== null,
        )?.observation;
        if (!archived) throw new Error('Corrective fixture has no original reported observation');
        const authorizedHost = current.store.readHostStateSnapshot(current.identity);
        expect(corrected.state.items).toEqual([]);
        expect(current.ledger.retrieveReportedObservation(current.identity.work_id, 1, archived)).toEqual(corrected);
        expect(current.ledger.resume(current.identity.work_id, 1)).toEqual(corrected);
        expect(current.store.readHostStateSnapshot(current.identity)).toEqual(authorizedHost);
        bridge = await MastraSessionBridge.open({
          ...current.producerInput,
          repositoryRoot: current.root,
          config: current.config,
          workspaceId: current.store.workspaceId,
          ledger: current.ledger,
          correctiveExecution: issued,
        });
        const started = await expectAsyncReturned(() => bridge!.start(corrected.state.source_scope));
        const journal = requiredMastraSnapshot(current.ledger.resume(current.identity.work_id, 1));
        expect(started.status).toBe('suspended');
        expect(started.run_id).toBe(issued.engine_run_id);
        expect(journal.version.revision).toBe(corrected.version.revision + 1);
        expect(journal.state.step_id).toBe(started.step_id);
        expect(journal.state.corrective_execution).toEqual(issued);
        expect(journal.state.completed).toEqual([]);
        expect(journal.state.items.map((item) => item.request)).toEqual([...started.requests]);
        expect(journal.state.items.length).toBeGreaterThan(0);
        for (const item of journal.state.items) {
          expect(item.issue_id).toBeNull();
          expect(item.observation).toBeNull();
          expect(item.request.run_id).toBe(issued.engine_run_id);
          expect(issued.stage_ids).toContain(item.request.stage_id);
        }
        expect(current.store.readHostStateSnapshot(current.identity)).toEqual(authorizedHost);
        const configured = openConfiguredMastraSessionLedger(current.root);
        await withInitialSourceCleanup(
          async () => {
            const item = journal.state.items[0];
            if (journal.state.items.length !== 1 || item?.request.stage_id !== 'develop_task')
              throw new Error('Corrective fixture did not reach its native writer frontier');
            const projectId = current.identity.project_ids[0];
            if (!projectId) throw new Error('Corrective fixture has no admitted project');
            const owner = configured.hostState.readHostStateSnapshot(current.identity);
            requireHostState(owner);
            if (!owner.work.lease) throw new Error('Corrective fixture has no current owner lease');
            acquireLocalSourceWriterLease({
              repositoryRoot: current.root,
              config: current.config,
              store: configured.hostState,
              identity: current.identity,
              nativeSessionHandle: owner.work.lease.thread_id,
              stageId: item.request.stage_id,
              assignmentIndex: item.request.assignment_index,
              expectedWork: owner.workVersion,
              expectedLedger: owner.ledgerVersion,
              expectedSessionJournal: { attempt: 1, version: journal.version },
            });
            if (mode === 'task-source') {
              const beforeProposal = configured.hostState.readHostStateSnapshot(current.identity);
              requireHostState(beforeProposal);
              const project = loadProjectSetContext(
                current.root,
                current.config,
                current.identity.repository_id,
                current.identity.project_ids,
              );
              const reference = beforeProposal.work.lifecycle.references.find(
                (entry) =>
                  entry.kind === 'execution_approval' &&
                  entry.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
                  entry.disposition === 'current' &&
                  entry.decision === 'approved',
              );
              if (!reference) throw new Error('Corrective fixture has no current scoped Source permission');
              const proposedRoot = current.root + '-unexecuted-corrective-proposal';
              const request: TaskSourceBindingRequest = {
                schema: 'TaskSourceBindingRequest/v1',
                operation: 'propose-create',
                operation_id: 'corrective-source-proposal',
                request_id: 'corrective-source-request',
                branch_ref: 'refs/heads/corrective-source-proposal',
                source_root: proposedRoot,
                expected_host: {
                  work: beforeProposal.workVersion,
                  ledger: beforeProposal.ledgerVersion,
                  journal: { attempt: 1, version: journal.version },
                  maintenance_generation: beforeProposal.maintenanceGeneration,
                },
                work_id: current.identity.work_id,
                attempt: 1,
                thread_id: owner.work.lease.thread_id,
                repository_id: current.identity.repository_id,
                project_ids: current.identity.project_ids,
                canonical_host_root: current.root,
                config_digest: runtimeConfigDigest(current.config),
                project_context_digest: project.project_context_digest,
              };
              const prepared = configured.hostState.prepareTaskSourceBindingOperation({
                request,
                identity: current.identity,
                verifyCurrent: (state) => {
                  expect(state.work).toEqual(beforeProposal.work);
                  expect(state.ledger).toEqual(beforeProposal.ledger);
                  expect(state.journal).toEqual(journal.state);
                  return {
                    source_authorization_sha256: reference.sha256,
                    source_scope_digest: beforeProposal.work.binding.work_source_revision,
                  };
                },
              });
              expect(prepared.status).toBe('prepared');
              const result = await configured.hostState.issueTaskSourceBindingOperation({
                request,
                identity: current.identity,
              });
              writerReserved = true;
              expect(result.status).toBe('issued');
              expect(result.command_argv).not.toBeNull();
              expect(existsSync(proposedRoot)).toBe(false);
              const retained = requiredMastraSnapshot(configured.resume(current.identity.work_id, 1));
              expect(retained.state.corrective_execution).toEqual(issued);
              expect(retained.state.items[0]?.issue_id).toBeNull();
              expect(retained.state.items[0]?.observation).toBeNull();
              const resource = current.database
                .query<{ payload: string }, [string, string]>(
                  'SELECT payload FROM agent_host_task_source_resource_transition WHERE workspace_id=? AND operation_id=?',
                )
                .get(configured.hostState.workspaceId, request.operation_id);
              if (!resource) throw new Error('Corrective TaskSource reservation has no retained history');
              const receipt = parseTaskSourceResourceTransitionReceipt(JSON.parse(resource.payload));
              if (receipt.schema !== 'TaskSourceResourceTransitionReceipt/v2')
                throw new Error('Corrective TaskSource history has no terminal-attempt witness');
              expect(receipt.prior_work).toEqual(beforeProposal.work);
              expect(() => parseTaskSourceResourceTransitionReceipt({ ...receipt, prior_work: undefined })).toThrow(
                'receipt schema invalid',
              );
              expect(() => parseTaskSourceResourceTransitionReceipt({ ...receipt, unexpected: true })).toThrow(
                'receipt schema invalid',
              );
              expect(() =>
                parseTaskSourceResourceTransitionReceipt({
                  ...receipt,
                  schema: 'TaskSourceResourceTransitionReceipt/v1',
                }),
              ).toThrow('receipt schema invalid');
              expect(() =>
                parseTaskSourceResourceTransitionReceipt({
                  ...receipt,
                  prior_work: { ...receipt.prior_work, workspace_id: 'foreign-workspace' },
                }),
              ).toThrow('prior terminal Work witness differs');
              const activeWitness = {
                ...receipt.prior_work,
                execution: {
                  ...receipt.prior_work.execution,
                  assignment_attempts: receipt.prior_work.execution.assignment_attempts.map((attempt, index) =>
                    index === 0
                      ? { ...attempt, status: 'started' as const, result: null, result_digest: null }
                      : attempt,
                  ),
                },
              };
              const activeVersion = { revision: activeWitness.revision, digest: canonicalJsonDigest(activeWitness) };
              expect(() =>
                parseTaskSourceResourceTransitionReceipt({
                  ...receipt,
                  prior_work: activeWitness,
                  prior_work_version: activeVersion,
                  request: {
                    ...receipt.request,
                    expected_host: { ...receipt.request.expected_host, work: activeVersion },
                  },
                }),
              ).toThrow('prior terminal Work witness differs');
              const issuedState = configured.hostState.readHostStateSnapshot(current.identity);
              requireHostState(issuedState);
              const native = configured.hostState.compareAndSwapHostState({
                expectedWork: issuedState.workVersion,
                expectedLedger: issuedState.ledgerVersion,
                expectedMaintenanceGeneration: issuedState.maintenanceGeneration,
                expectedSessionJournal: { attempt: 1, version: retained.version },
                nextWork: {
                  ...issuedState.work,
                  revision: issuedState.work.revision + 1,
                  lifecycle: {
                    ...issuedState.work.lifecycle,
                    revision: issuedState.work.lifecycle.revision + 1,
                    next_action: 'Inspect the original TaskSource proposal; its result remains unknown.',
                  },
                },
                nextLedger: { ...issuedState.ledger, revision: issuedState.ledger.revision + 1 },
              });
              requireHostState(native);
              expect(native.workVersion.revision).toBe(receipt.successor_work_version.revision + 1);
              expect(native.work.execution.assignment_attempts).toEqual(
                beforeProposal.work.execution.assignment_attempts,
              );
              const first = native.work.execution.assignment_attempts[0];
              const reopened = openConfiguredMastraSessionLedger(current.root);
              await withInitialSourceCleanup(
                async () => {
                  expect(reopened.hostState.readHostStateSnapshot(current.identity)).toEqual(native);
                  expect(reopened.resume(current.identity.work_id, 1)).toEqual(retained);
                },
                () => reopened.close(),
                'TaskSource terminal-witness reopened ledger cleanup',
              );
              if (!first || first.status !== 'completed')
                throw new Error('Corrective fixture has no original terminal result');
              const row = current.database
                .query<{ id: string; revision: number; payload: string; digest: string }, [string, string]>(
                  "SELECT id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
                )
                .get(configured.hostState.workspaceId, current.identity.work_id);
              if (!row) throw new Error('Corrective TaskSource fixture has no native Work row');
              const changedResult = { corruption: 'changed retained terminal result' };
              const changed = {
                ...native.work,
                execution: {
                  ...native.work.execution,
                  assignment_attempts: native.work.execution.assignment_attempts.map((attempt, index) =>
                    index === 0
                      ? { ...attempt, result: changedResult, result_digest: canonicalJsonDigest(changedResult) }
                      : attempt,
                  ),
                },
              };
              const changedPayload = canonicalJson(changed),
                changedDigest = canonicalJsonDigest(changed);
              const rows = nativeDatabaseSnapshotReader(current.database),
                beforeCorruption = rows();
              expect(
                current.database
                  .query(
                    "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
                  )
                  .run(
                    changedPayload,
                    changedDigest,
                    configured.hostState.workspaceId,
                    row.id,
                    row.revision,
                    row.digest,
                  ).changes,
              ).toBe(1);
              await withInitialSourceCleanup(
                async () => {
                  expect(() => configured.hostState.readHostStateSnapshot(current.identity)).toThrow(
                    'TaskSource resource history terminal assignment prefix changed',
                  );
                },
                () => {
                  expect(
                    current.database
                      .query(
                        "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND payload=? AND digest=?",
                      )
                      .run(
                        row.payload,
                        row.digest,
                        configured.hostState.workspaceId,
                        row.id,
                        row.revision,
                        changedPayload,
                        changedDigest,
                      ).changes,
                  ).toBe(1);
                  expect(rows()).toEqual(beforeCorruption);
                  expect(configured.hostState.readHostStateSnapshot(current.identity)).toEqual(native);
                },
                'TaskSource retained terminal-result refusal and exact native restoration',
              );
              return;
            }
            const execution = await openAdmittedSessionExecution(
              current.root,
              configured.hostState,
              projectId,
              current.identity.work_id,
            );
            const capability = execution.composition.workflowExecutionCapability;
            if (!capability) throw new Error('Corrective fixture has no native workflow capability');
            const configDigest = runtimeConfigDigest(current.config);
            const preparedWriter = await prepareWorkflowExecution(capability, {
              repositoryRoot: current.root,
              configDigest,
              teamId: current.producerInput.selection.team,
              workItemId: current.identity.work_id,
            });
            const reservation = await reserveWorkflowAssignmentForSession(capability, {
              repositoryRoot: current.root,
              configDigest,
              teamId: current.producerInput.selection.team,
              workflowId: item.request.workflow_id,
              stageId: item.request.stage_id,
              assignmentIndex: item.request.assignment_index,
              workItemId: current.identity.work_id,
              workItemDigest: preparedWriter.workItemDigest,
              workContextDigest: preparedWriter.workContextDigest,
              input: { bindings_manifest_ref: item.request.bindings_manifest_ref },
            });
            writerReserved = true;
            expect(reservation.receipt.attempt.correction_generation).toBe(issued.correction_generation);
            expect(reservation.receipt.attempt.correction_authorization).toEqual(issued.authorization);
            const exposed = configured.issueWave(current.identity.work_id, 1, journal.version, {
              [item.request.action_id]: reservation,
            });
            expect(exposed.state.corrective_execution).toEqual(issued);
            expect(exposed.state.items[0]?.host_reservation).toEqual(reservation);
            expect(exposed.state.items[0]?.observation).toBeNull();
          },
          () => configured.close(),
          'Configured corrective writer ledger cleanup',
        );
        expect(performance.now()).toBeLessThan(deadline);
        completed = true;
      },
      async () => {
        await withInitialSourceCleanup(
          async () => {
            if (bridge) await bridge.close();
            bridgeClosed = true;
          },
          () => {
            if (fixture) {
              fixture.close(() => completed && bridgeClosed && !writerReserved && performance.now() < deadline);
            }
          },
          'Corrective bridge and fixture cleanup',
        );
        if (performance.now() >= deadline) throw new Error('Corrective handoff cleanup exhausted its deadline');
      },
      'Host-produced corrective suspension fixture',
    );
  },
  20_000,
);

test('Mastra readers bind native maintenance generations and reject corrupted fence rows without writes', async () => {
  caseDeadline = performance.now() + 5_000;
  scratch = await mkdtemp(path.join(tmpdir(), 'mastra-maintenance-integrity-'));
  retainScratch = true;
  const { database, instance, workId } = mastraLedger('maintenance-integrity');
  const maintenance = new HostStateStore(database, workspaceId, undefined, undefined, undefined, {
    principal: 'fixture:maintenance-reader',
    projectIds: ['project'],
    verify: (fence) => ({
      schema: 'MaintenanceReleaseAuthorization/v1',
      principal: 'fixture:maintenance-reader',
      fence_digest: canonicalJsonDigest(fence),
      closure_digest: fence.binding.closure_digest,
      bundle_digest: fence.binding.bundle_digest,
    }),
  });
  const receipt = expectReturned(() =>
    maintenance.acquireMaintenanceFence({
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: ['project'],
      operation_id: 'fixture-maintenance-reader',
      manifest_digest: '1'.repeat(64),
      request_digest: '2'.repeat(64),
      bindings_digest: '3'.repeat(64),
      closure_digest: '4'.repeat(64),
      bundle_digest: '5'.repeat(64),
    }),
  );
  expect(() => instance.resume(workId, 1)).toThrow('session journal is fenced by maintenance generation');
  const released = await expectAsyncReturned(() => maintenance.releaseMaintenanceFence(receipt));
  expect(released.status).toBe('released');
  expect(() => instance.resume(workId, 1)).toThrow('session journal is fenced by maintenance generation');
  const rebound = expectReturned(
    () => new MastraSessionLedger(database, workspaceId, config, root, instance.hostState),
  );
  expect(rebound.resume(workId, 1)).toBeNull();
  const row = () =>
    database
      .query<{ revision: number; payload: string; digest: string }, [string]>(
        'SELECT revision,payload,digest FROM agent_host_maintenance WHERE workspace_id=?',
      )
      .get(workspaceId);
  const original = row();
  if (!original) throw new Error('Native maintenance fence is missing');
  for (const changed of [
    { ...original, revision: original.revision + 1 },
    { ...original, digest: '0'.repeat(64) },
  ]) {
    await withInitialSourceCleanup(
      () => {
        expect(
          database
            .query('UPDATE agent_host_maintenance SET revision=?,digest=? WHERE workspace_id=?')
            .run(changed.revision, changed.digest, workspaceId).changes,
        ).toBe(1);
        const corrupted = row();
        expect(() => rebound.resume(workId, 1)).toThrow('session maintenance state checksum invalid');
        expect(row()).toEqual(corrupted);
        expect(database.inTransaction).toBe(false);
      },
      () => {
        expect(
          database
            .query('UPDATE agent_host_maintenance SET revision=?,digest=? WHERE workspace_id=?')
            .run(original.revision, original.digest, workspaceId).changes,
        ).toBe(1);
      },
      'Maintenance integrity refusal and row restoration',
    );
    expect(row()).toEqual(original);
    expect(rebound.resume(workId, 1)).toBeNull();
  }
  expect(performance.now()).toBeLessThan(caseDeadline);
  retainScratch = false;
});

test('native source approval refusal observes the retired authorization after real runtime rebind', async () => {
  const beforeimage = runtimePackageBeforeimageFixture(tmpdir(), 'vida-agent', (allocated) => {
    console.info('Session authorization rebind package beforeimage: ' + allocated);
  });
  await beforeimage.bindBeforeimage(async (restorePackage) => {
    await withAdmittedHandoffFixture(
      async (fixture) => {
        const deadline = requiredValue(caseDeadline, 'Retirement fixture deadline');
        const preparation = initialSourceHostStore(fixture).readHostStateSnapshot(fixture.identity);
        requireHostState(preparation);
        if (!fixture.bridge) throw new Error('Retirement fixture has no native bridge');
        await bindControlledRuntimeInitialization(fixture.root, fixture.config, initialSourceHostStore(fixture));
        await runSynthesisFixtureInProcess(
          {
            args: [],
            publicRun: () => {
              throw new Error('Retirement fixture must use its preparation owner');
            },
            sync: () => initialSourceJournal(fixture),
            repositoryRoot: fixture.root,
            workId: fixture.identity.work_id,
            attempt: 1,
            work: preparation.work,
          },
          { ledger: initialSourceHostLedger(fixture), bridge: fixture.bridge, source: fixture.originalSource },
        );
        const { store, ledger, item, journal, plan, db } = pauseReadonlyDispatchHostFixture(fixture);
        expect(store.commitReadOnlyDispatchRepair(plan)).toEqual(plan);
        const activated = ledger.activateReadOnlyReplacement(
          fixture.identity.work_id,
          1,
          journal.version,
          item.request.action_id,
        );
        const paused = store.readHostStateSnapshot(fixture.identity);
        requireHostState(paused);
        const resumed = expectReturned(() =>
          resumePausedLocalWork({
            store,
            ledger,
            identity: fixture.identity,
            attempt: 1,
            expectedWork: paused.workVersion,
            expectedLedger: paused.ledgerVersion,
            expectedJournal: activated.snapshot.version,
            nativeSessionHandle: initialSourceAdmissionInput(fixture).nativeSessionHandle,
            configDigest: paused.work.binding.config_digest,
            sourceDigest: paused.work.binding.work_source_revision,
          }),
        );
        expect(resumed.status).toBe('resumed');
        const resumedHost = store.readHostStateSnapshot(fixture.identity);
        requireHostState(resumedHost);
        acquireLocalSourceWriterLease({
          repositoryRoot: fixture.root,
          config: fixture.config,
          store,
          identity: fixture.identity,
          nativeSessionHandle: initialSourceAdmissionInput(fixture).nativeSessionHandle,
          stageId: 'develop_task',
          assignmentIndex: 0,
          expectedWork: resumedHost.workVersion,
          expectedLedger: resumedHost.ledgerVersion,
          expectedSessionJournal: { attempt: 1, version: activated.snapshot.version },
        });
        const active = store.readHostStateSnapshot(fixture.identity);
        requireHostState(active);
        expect(active.work.binding.runtime_code_digest).toBe(beforeimage.before.digest);
        expect(beforeimage.current.digest).not.toBe(beforeimage.before.digest);
        const initialAuthorizations = active.work.lifecycle.references.filter(
          isCurrentLocalSourceAuthorizationReference,
        );
        expect(initialAuthorizations).toHaveLength(1);
        const initialAuthorization = requiredValue(initialAuthorizations[0], 'Original local authorization');

        const authorizationBytes = readFileSync(path.join(fixture.root, fixture.sourceAuthorizationPath));
        const { authorization } = readLocalSourceWriteAuthorization(fixture.root, fixture.sourceAuthorizationPath);
        const stageId = 'develop_task';
        const stage = fixture.config.workflows.task_execution?.stages.find((entry) => entry.id === stageId);
        if (!stage) throw new Error('Configured source-writing stage is unavailable');
        const assignmentIndex = stage.assignments.findIndex(
          (assignment) => fixture.config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
        );
        expect(assignmentIndex).toBeGreaterThanOrEqual(0);
        expect(authorization.stage_ids).toContain(stageId);

        const rebind: RuntimeCodeRebindRequest = {
          identity: fixture.identity,
          attempt: 1,
          actionId: item.request.action_id,
          issueId: activated.dispatch.issue_id,
          nativeSessionHandle: requiredValue(active.work.lease, 'Resumed readonly owner').thread_id,
          expectedWork: active.workVersion,
          expectedLedger: active.ledgerVersion,
          expectedJournal: activated.snapshot.version,
          expectedMaintenanceGeneration: active.maintenanceGeneration,
          oldRuntimeCodeDigest: beforeimage.before.digest,
          newRuntimeCodeDigest: beforeimage.current.digest,
          forwardOperationId: 'fixture:session-authorization-count-rebind',
          parentManifestDigest: beforeimage.before.digest,
          successorManifestDigest: beforeimage.current.digest,
          ownerNoCallPointer: 'fixture:activated-readonly-replacement-not-dispatched',
        };
        const rebindInputPath = path.join(fixture.root, '.agent', 'session-authorization-rebind.json');
        writeFileSync(rebindInputPath, JSON.stringify({ repositoryRoot: fixture.root, request: rebind }));
        const nativeRows = nativeDatabaseSnapshotReader(db);
        const executionBefore = active.work.execution;
        const packageRoot = path.resolve(import.meta.dir, '../..');
        expect(process.versions.bun).toBe(readPin(packageRoot));
        const childPath = path.join(packageRoot, 'tests', 'helpers', 'session-authorization-rebind-child.ts');
        const childArgs = [
          '--no-env-file',
          '--no-install',
          '--config=' + path.join(packageRoot, 'bunfig.toml'),
          childPath,
          rebindInputPath,
        ];
        let armed = false;
        let lineageReads = 0;
        let outerVerifierLineageObserved = false;
        let childRuns = 0;
        let claimCalls = 0;
        let admittedContextValidated = false;
        let packetValidated = false;
        let afterTransition: ReturnType<typeof nativeRows> | undefined;
        let transitionedSnapshot: ReturnType<typeof store.readHostStateSnapshot> | undefined;
        let childResult:
          | {
              marker: 'SESSION_AUTHORIZATION_REBIND_DONE';
              result?: {
                authCount: number;
                journalVersion: unknown;
                runtimeCodeDigest: string;
                receiptDigest: string;
                retiredExecutionApprovalIds: string[];
                workVersion: unknown;
                ledgerVersion: unknown;
              };
            }
          | undefined;
        const claim = store.claimWorkflowAssignmentWithApproval.bind(store);
        const claimBoundary = spyOn(store, 'claimWorkflowAssignmentWithApproval').mockImplementationOnce(
          async (...args) => {
            claimCalls++;
            const readLineage = store.readInitialSourceContinuationLineageView.bind(store);
            const readHost = store.readHostStateSnapshot.bind(store);
            const lineageBoundary = spyOn(store, 'readInitialSourceContinuationLineageView').mockImplementation(
              (...lineageArgs) => {
                const actual = readLineage(...lineageArgs);
                lineageReads++;
                if (lineageReads === 1) {
                  armed = true;
                  outerVerifierLineageObserved = true;
                }
                return actual;
              },
            );
            const hostBoundary = spyOn(store, 'readHostStateSnapshot').mockImplementation((identity) => {
              if (armed && canonicalJsonDigest(identity) === canonicalJsonDigest(fixture.identity)) {
                armed = false;
                restorePackage();
                childRuns++;
                const childDiagnosticPath = path.join(
                  fixture.root,
                  '.agent',
                  'session-authorization-rebind-child-result.json',
                );
                const diagnostic = {
                  command: process.execPath,
                  cwd: packageRoot,
                  args: childArgs,
                  status: null as number | null,
                  signal: null as NodeJS.Signals | null,
                  error: null as unknown,
                  stdout: '',
                  stderr: '',
                  elapsedMs: null as number | null,
                  childElapsedMs: null as number | null,
                  timedOut: null as boolean | null,
                  timeoutMs: null as number | null,
                  cleanupTimeoutMs: null as number | null,
                  cleanupAttempted: null as boolean | null,
                  cleanupOutcome: null as string | null | undefined,
                  cleanupStatus: null as number | null | undefined,
                  cleanupErrorCode: null as string | null | undefined,
                  cleanupElapsedMs: null as number | null,
                };
                let child: ReturnType<typeof boundedSpawnSync>;
                try {
                  child = boundedSpawnSync(
                    spawnSync,
                    process.execPath,
                    childArgs,
                    {
                      cwd: packageRoot,
                      encoding: 'utf8',
                      env: pinnedEnvironment(process.execPath, process.env, packageRoot),
                      windowsHide: true,
                      maxBuffer: 16_384,
                      budget: executionBudget(Math.min(3_000, Math.floor(deadline - performance.now())), 0, deadline),
                    },
                    'session authorization Host rebind child',
                  );
                  Object.assign(diagnostic, {
                    status: child.status,
                    signal: child.signal,
                    error:
                      child.error === undefined
                        ? null
                        : {
                            name: child.error.name,
                            message: child.error.message,
                            code: (child.error as NodeJS.ErrnoException).code,
                            errno: (child.error as NodeJS.ErrnoException).errno,
                            syscall: (child.error as NodeJS.ErrnoException).syscall,
                          },
                    stdout: String(child.stdout ?? ''),
                    stderr: String(child.stderr ?? ''),
                    elapsedMs: child.elapsedMs ?? null,
                    childElapsedMs: child.childElapsedMs ?? null,
                    timedOut: child.timedOut ?? null,
                    timeoutMs: child.timeoutMs ?? null,
                    cleanupTimeoutMs: child.cleanupTimeoutMs ?? null,
                    cleanupAttempted: child.cleanupAttempted ?? null,
                    cleanupOutcome: child.cleanupOutcome,
                    cleanupStatus: child.cleanupStatus,
                    cleanupErrorCode: child.cleanupErrorCode,
                    cleanupElapsedMs: child.cleanupElapsedMs ?? null,
                  });
                } catch (error) {
                  diagnostic.error =
                    error instanceof Error ? { name: error.name, message: error.message } : { thrown: String(error) };
                  writeFileSync(childDiagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n');
                  throw error;
                }
                writeFileSync(childDiagnosticPath, JSON.stringify(diagnostic, null, 2) + '\n');
                if (child.error || child.signal || !Number.isInteger(child.status))
                  throw new Error(
                    `Session authorization child outcome unknown: status=${String(child.status)}; ` +
                      `signal=${String(child.signal)}; error=${String(child.error)}; ` +
                      String(child.stdout ?? '') +
                      String(child.stderr ?? ''),
                  );
                requireSynchronousChildSuccess(child, 'SESSION_AUTHORIZATION_REBIND_DONE');
                const lines = String(child.stdout ?? '')
                  .trim()
                  .split(/\r?\n/u);
                const parsedChildResult: unknown = JSON.parse(lines[lines.length - 1]!);
                if (
                  !isPlainRecord(parsedChildResult) ||
                  Object.keys(parsedChildResult).length !== 2 ||
                  parsedChildResult.marker !== 'SESSION_AUTHORIZATION_REBIND_DONE' ||
                  !isPlainRecord(parsedChildResult.result) ||
                  Object.keys(parsedChildResult.result).length !== 7 ||
                  !Array.isArray(parsedChildResult.result.retiredExecutionApprovalIds) ||
                  !parsedChildResult.result.retiredExecutionApprovalIds.every(
                    (id: unknown) => typeof id === 'string',
                  ) ||
                  parsedChildResult.result.authCount !== 0 ||
                  parsedChildResult.result.runtimeCodeDigest !== beforeimage.current.digest ||
                  typeof parsedChildResult.result.receiptDigest !== 'string' ||
                  !/^[a-f0-9]{64}$/u.test(parsedChildResult.result.receiptDigest)
                )
                  throw new Error('Session authorization child completion payload is malformed');
                for (const field of ['workVersion', 'ledgerVersion', 'journalVersion'] as const) {
                  const version = parsedChildResult.result[field];
                  if (
                    !isPlainRecord(version) ||
                    !Number.isSafeInteger(version.revision) ||
                    typeof version.digest !== 'string' ||
                    !/^[a-f0-9]{64}$/u.test(version.digest)
                  )
                    throw new Error(`Session authorization child ${field} is malformed`);
                }
                childResult = {
                  marker: 'SESSION_AUTHORIZATION_REBIND_DONE',
                  result: {
                    authCount: 0,
                    journalVersion: parsedChildResult.result.journalVersion,
                    runtimeCodeDigest: parsedChildResult.result.runtimeCodeDigest,
                    receiptDigest: parsedChildResult.result.receiptDigest,
                    retiredExecutionApprovalIds: parsedChildResult.result.retiredExecutionApprovalIds,
                    workVersion: parsedChildResult.result.workVersion,
                    ledgerVersion: parsedChildResult.result.ledgerVersion,
                  },
                };
              }
              const actual = readHost(identity);
              if (
                childRuns === 1 &&
                transitionedSnapshot === undefined &&
                canonicalJsonDigest(identity) === canonicalJsonDigest(fixture.identity)
              ) {
                transitionedSnapshot = actual;
                afterTransition = nativeRows();
                requireHostState(actual);
                readAdmittedSessionExecutionContext(fixture.root, store, 'sample', fixture.identity.work_id);
                admittedContextValidated = true;
                const admittedInput = initialSourceAdmissionInput(fixture);
                const access = requireSafeRepositoryAccess(fixture.root);
                const currentJournal = ledger.currentSnapshot(fixture.identity.work_id);
                if (!currentJournal) throw new Error('Post-rebind admitted Journal is unavailable');
                buildAdmittedDevelopmentPacket({
                  repositoryRoot: fixture.root,
                  config: fixture.config,
                  host: actual,
                  sourceStore: store,
                  ledger: currentJournal,
                  workItem: admittedInput.workItem,
                  selection: admittedInput.selection,
                  scopeBytes: access.readBytes(actual.work.contracts.scope.path, 'test post-rebind scope'),
                  acceptanceBytes: access.readBytes(
                    actual.work.contracts.acceptance.path,
                    'test post-rebind acceptance',
                  ),
                  configuredContext: null,
                });
                packetValidated = true;
              }
              return actual;
            });
            let claimBoundaryFailure: { readonly error: unknown } | undefined;
            try {
              return await claim(...args);
            } catch (error) {
              claimBoundaryFailure = { error };
              throw error;
            } finally {
              completeOwnedCleanup(
                [
                  () => {
                    hostBoundary.mockRestore();
                    return undefined;
                  },
                  () => {
                    lineageBoundary.mockRestore();
                    return undefined;
                  },
                ],
                claimBoundaryFailure,
              );
            }
          },
        );
        const admitted = await openAdmittedSessionExecution(fixture.root, store, 'sample', fixture.identity.work_id);
        const capability = requiredValue(
          admitted.composition.workflowExecutionCapability,
          'Native admitted workflow capability',
        );
        const prepared = await prepareWorkflowExecution(capability, {
          repositoryRoot: fixture.root,
          configDigest: runtimeConfigDigest(fixture.config),
          teamId: 'default-development',
          workItemId: fixture.identity.work_id,
        });
        expect(prepared.workflowId).toBe('task_execution');
        const workflowRequest: WorkflowAssignmentRequest = {
          repositoryRoot: fixture.root,
          configDigest: runtimeConfigDigest(fixture.config),
          teamId: 'default-development',
          workflowId: prepared.workflowId,
          stageId,
          assignmentIndex,
          workItemId: fixture.identity.work_id,
          workItemDigest: prepared.workItemDigest,
          workContextDigest: prepared.workContextDigest,
          input: { work_item_id: fixture.identity.work_id, stage_outputs: {} },
        };
        let denial: unknown;
        let claimFailure: { readonly error: unknown } | undefined;
        try {
          denial = await rejectionReason(dispatchWorkflowAssignment(capability, workflowRequest));
        } catch (error) {
          claimFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                claimBoundary.mockRestore();
                return undefined;
              },
            ],
            claimFailure,
          );
        }
        writeFileSync(
          path.join(fixture.root, '.agent', 'session-authorization-observer-result.json'),
          JSON.stringify(
            {
              claimCalls,
              lineageReads,
              childRuns,
              admittedContextValidated,
              packetValidated,
              denial: denial instanceof Error ? denial.message : String(denial),
            },
            null,
            2,
          ) + '\n',
        );
        expect(() => {
          throw denial;
        }).toThrow('workflow approval denied');
        expect(claimCalls).toBe(1);
        expect(outerVerifierLineageObserved).toBe(true);
        expect(lineageReads).toBeGreaterThanOrEqual(1);
        expect(childRuns).toBe(1);
        expect(admittedContextValidated).toBe(true);
        expect(packetValidated).toBe(true);
        expect(childResult).toMatchObject({
          marker: 'SESSION_AUTHORIZATION_REBIND_DONE',
          result: { authCount: 0, runtimeCodeDigest: beforeimage.current.digest },
        });
        expect(childResult?.result?.retiredExecutionApprovalIds).toEqual([initialAuthorization.record_id]);
        expect(childResult?.result?.receiptDigest).toMatch(/^[a-f0-9]{64}$/u);
        if (!transitionedSnapshot || !afterTransition)
          throw new Error('Native rebind child did not produce a complete Host/database afterimage');
        requireHostState(transitionedSnapshot);
        expect(childResult?.result?.workVersion).toEqual(transitionedSnapshot.workVersion);
        expect(childResult?.result?.ledgerVersion).toEqual(transitionedSnapshot.ledgerVersion);
        expect(childResult?.result?.journalVersion).toEqual(activated.snapshot.version);
        expect(
          transitionedSnapshot.work.lifecycle.references.filter(
            (reference) =>
              reference.kind === 'execution_approval' &&
              reference.disposition === 'current' &&
              reference.decision === 'approved' &&
              reference.artifact_schema === 'LocalSourceWriteAuthorization/v1',
          ),
        ).toHaveLength(0);
        expect(transitionedSnapshot.work.execution).toEqual(executionBefore);
        expect(initialSourceJournal(fixture)).toEqual(activated.snapshot);
        expect(readFileSync(path.join(fixture.root, fixture.sourceAuthorizationPath))).toEqual(authorizationBytes);
        expect(nativeRows()).toEqual(afterTransition);
        expect(db.inTransaction).toBe(false);
      },
      {
        cooperativeSynthesis: true,
        configure: (configured) => {
          const architect = configured.agents.profiles.architect;
          if (!architect) throw new Error('Retirement fixture needs its configured architect');
          return {
            ...configured,
            agents: {
              ...configured.agents,
              profiles: {
                ...configured.agents.profiles,
                architect: { ...architect, egress_policy: 'none' },
              },
            },
          };
        },
      },
      20_000,
    );
  });
}, 20_000);

test('readonly replacement report atomically binds raw and projected observations to its prepared dispatch', async () => {
  await withReadonlyDispatchHostFixture(async (fixture, deadline) => {
    const { store, ledger, item, plan, journal, db } = pauseReadonlyDispatchHostFixture(fixture);
    expect(expectReturned(() => store.commitReadOnlyDispatchRepair(plan))).toEqual(plan);
    expect(ledger.preparedReadOnlyReplacement(fixture.identity.work_id, 1, item.request.action_id)).toEqual({
      native_session_handle: plan.prior_native_handle,
      plan_digest: plan.digest,
    });
    expect(ledger.preparedReadOnlyReplacement(fixture.identity.work_id, 1, '0'.repeat(64))).toBeNull();
    expect(ledger.replacementDispatch(fixture.identity.work_id, 1, item.request.action_id)).toBeNull();
    expect(ledger.replacementNativeHandle(fixture.identity.work_id, 1, item.request.action_id)).toBeNull();
    const activated = expectReturned(() =>
      ledger.activateReadOnlyReplacement(fixture.identity.work_id, 1, journal.version, item.request.action_id),
    );
    expect(ledger.preparedReadOnlyReplacement(fixture.identity.work_id, 1, item.request.action_id)).toBeNull();
    expect(ledger.replacementDispatch(fixture.identity.work_id, 1, item.request.action_id)).toEqual(activated.dispatch);
    expect(ledger.replacementNativeHandle(fixture.identity.work_id, 1, item.request.action_id)).toBe(
      plan.prior_native_handle,
    );
    expect(ledger.replacementDispatch(fixture.identity.work_id, 1, '0'.repeat(64))).toBeNull();
    const source = journal.state.source_scope;
    if (!source) throw new Error('Prepared readonly source scope is missing');
    const summary = 'Cooperative replacement report';
    const raw = expectReturned(() =>
      parseSessionBridgeObservation({
        schema: 'VidaSessionObservation/v1',
        action_id: activated.dispatch.dispatch_action_id,
        issue_id: activated.dispatch.issue_id,
        agent_id: 'fixture:replacement',
        tool_call_ref: 'fixture:replacement-report',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: [],
      }),
    );
    const rows = () => ({
      host: db.query('SELECT * FROM agent_host_state ORDER BY workspace_id,kind,id').all(),
      journal: db.query('SELECT * FROM agent_host_mastra_session_ledger ORDER BY workspace_id,work_id,attempt').all(),
      plan: db.query('SELECT * FROM agent_host_readonly_dispatch_repair').all(),
      activation: db.query('SELECT * FROM agent_host_readonly_dispatch_activation').all(),
      schema: db.query('SELECT name,sql FROM sqlite_master ORDER BY name').all(),
    });
    const before = rows();
    for (const changed of [
      { ...raw, action_id: '0'.repeat(64) },
      { ...raw, issue_id: '11111111-1111-4111-8111-111111111111' },
      { ...raw, host_attempt_id: '0'.repeat(64) },
    ]) {
      expect(() =>
        ledger.reportReadOnlyReplacement(fixture.identity.work_id, 1, activated.snapshot.version, changed, source),
      ).toThrow('replacement report has no matching read-only dispatch');
      expect(rows()).toEqual(before);
    }
    expect(() =>
      ledger.reportReadOnlyReplacement(
        fixture.identity.work_id,
        1,
        activated.snapshot.version,
        { ...raw, output_digest: '0'.repeat(64) },
        source,
      ),
    ).toThrow('replacement output digest or tool reference differs');
    expect(rows()).toEqual(before);
    expect(() =>
      ledger.reportReadOnlyReplacement(fixture.identity.work_id, 1, activated.snapshot.version, raw, {
        ...source,
        digest: '0'.repeat(64),
      }),
    ).toThrow('replacement current issue or source binding changed');
    expect(rows()).toEqual(before);
    expect(() =>
      ledger.reportReadOnlyReplacement(
        fixture.identity.work_id + '-foreign',
        1,
        activated.snapshot.version,
        raw,
        source,
      ),
    ).toThrow('replacement report CAS version changed');
    expect(rows()).toEqual(before);
    const reported = expectReturned(() =>
      ledger.reportReadOnlyReplacement(fixture.identity.work_id, 1, activated.snapshot.version, raw, source),
    );
    const projected = { ...raw, action_id: item.request.action_id };
    expect(reported.state.items[0]?.observation).toEqual(projected);
    expect(reported.state.items[0]?.issue_id).toBe(plan.replacement_issue_id);
    const row = db
      .query<{ payload: string; digest: string }, [string, string, number, string]>(
        'SELECT payload,digest FROM agent_host_readonly_dispatch_outcome WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=?',
      )
      .get(store.workspaceId, fixture.identity.work_id, 1, item.request.action_id);
    if (!row) throw new Error('Readonly replacement outcome is missing');
    const outcome: unknown = JSON.parse(row.payload);
    if (!isPlainRecord(outcome)) throw new Error('Readonly replacement outcome is not a record');
    expect(canonicalJsonDigest(outcome)).toBe(row.digest);
    expect(outcome).toEqual({
      schema: 'VidaReadOnlyDispatchOutcome/v1',
      plan_digest: plan.digest,
      dispatch_action_id: activated.dispatch.dispatch_action_id,
      logical_action_id: item.request.action_id,
      issue_id: plan.replacement_issue_id,
      raw_observation: raw,
      projected_observation_digest: canonicalJsonDigest(projected),
    });
    const after = rows();
    expect(after.host).toEqual(before.host);
    expect(after.plan).toEqual(before.plan);
    expect(after.activation).toEqual(before.activation);
    expect(performance.now()).toBeLessThan(deadline);
  });
});

test('readonly replacement rejects a completed-prefix tool reference and preserves the native history', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await prepareInitialSourceFrontier(fixture, 'readonly');
      const { store, ledger, item, plan, journal } = pauseReadonlyDispatchHostFixture(fixture);
      expect(journal.state.completed.length).toBeGreaterThan(0);
      const prior = journal.state.completed
        .flatMap((wave) => wave.items)
        .find((entry) => entry.observation !== null)?.observation;
      if (!prior) throw new Error('Readonly frontier fixture has no completed-prefix observation');
      expectReturned(() => store.commitReadOnlyDispatchRepair(plan));
      const activated = expectReturned(() =>
        ledger.activateReadOnlyReplacement(fixture.identity.work_id, 1, journal.version, item.request.action_id),
      );
      const source = activated.snapshot.state.source_scope;
      if (!source) throw new Error('Readonly replacement has no native source scope');
      const observation = mastraObservation(
        { ...item.request, action_id: activated.dispatch.dispatch_action_id },
        activated.dispatch.issue_id,
        prior.tool_call_ref,
      );
      const hostBefore = store.readHostStateSnapshot(fixture.identity);
      expect(() =>
        ledger.reportReadOnlyReplacement(fixture.identity.work_id, 1, activated.snapshot.version, observation, source),
      ).toThrow('replacement output digest or tool reference differs');
      expect(ledger.resume(fixture.identity.work_id, 1)).toEqual(activated.snapshot);
      expect(store.readHostStateSnapshot(fixture.identity)).toEqual(hostBefore);
      const fresh = { ...observation, tool_call_ref: 'fixture:completed-prefix-replacement' };
      const reported = expectReturned(() =>
        ledger.reportReadOnlyReplacement(fixture.identity.work_id, 1, activated.snapshot.version, fresh, source),
      );
      expect(reported.state.completed).toEqual(journal.state.completed);
      expect(reported.state.items[0]?.observation).toEqual({ ...fresh, action_id: item.request.action_id });
      expect(store.readHostStateSnapshot(fixture.identity)).toEqual(hostBefore);
    },
    {
      cooperativeSynthesis: true,
      holdExpiredOwnerClock: true,
      configure: (configured) => {
        const architect = configured.agents.profiles.architect;
        if (!architect) throw new Error('Readonly prewriter fixture needs the configured architect');
        return {
          ...configured,
          agents: {
            ...configured.agents,
            profiles: { ...configured.agents.profiles, architect: { ...architect, egress_policy: 'none' } },
          },
        };
      },
    },
    20_000,
  );
}, 20_000);

test('cooperative prewriter reports persist without creating a Host work or preparation authority', async () => {
  caseDeadline = performance.now() + 5_000;
  scratch = await mkdtemp(path.join(tmpdir(), 'mastra-ownerless-prewriter-'));
  retainScratch = true;
  const { instance, workId } = mastraLedger('ownerless-prewriter');
  const request = bridgeRequest({
    actionId: 'a'.repeat(64),
    workflowId: 'task_execution',
    stageId: 'review_source_prewrite',
    assignmentIndex: 0,
  });
  let journal = instance.sync(workId, 1, request.run_id, request.stage_id, [request]);
  const before = instance.hostState.readWorkspaceSnapshot();
  expect(before.work).toEqual([]);
  journal = instance.issueWave(workId, 1, journal.version);
  const item = mastraItemAt(journal, 0);
  expect(item.host_reservation).toBeUndefined();
  const observation = mastraObservation(item.request, item.issue_id, 'fixture:cooperative-prewriter');
  const reported = expectReturned(() => instance.report(workId, 1, journal.version, observation));
  expect(reported.state.items[0]?.observation).toEqual(observation);
  expect(instance.retrieveReportedObservation(workId, 1, observation)).toEqual(reported);
  expect(instance.hostState.readWorkspaceSnapshot()).toEqual(before);
  expect(instance.resume(workId, 1)).toEqual(reported);
  expect(performance.now()).toBeLessThan(caseDeadline);
  retainScratch = false;
});

test('readonly replacement preserves an already reported peer in the same native wave', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      await prepareInitialSourceFrontier(fixture, 'readonly');
      const ledger = initialSourceHostLedger(fixture);
      const first = requiredMastraSnapshot(ledger.resume(fixture.identity.work_id, 1));
      expect(first.state.items).toHaveLength(2);
      let observed = ledger.issueWave(fixture.identity.work_id, 1, first.version);
      const host = initialSourceHostStore(fixture);
      const owner = host.readHostStateSnapshot(fixture.identity);
      requireHostState(owner);
      const peers = observed.state.items.filter((entry) => entry.request.role === 'source-planner');
      expect(peers).toHaveLength(1);
      for (const peer of peers) {
        if (!peer.issue_id) throw new Error('Readonly prewriter peer was not issued');
        const preparation = createPrewriterPreparationObservation(
          { request: peer.request, issue_id: peer.issue_id },
          { work: owner.work, workId: fixture.identity.work_id },
          1,
        );
        const observation = {
          ...mastraObservation(
            peer.request,
            peer.issue_id,
            'fixture:readonly-peer:' + peer.request.action_id,
            JSON.stringify(preparation),
            preparation.observer_id,
          ),
          evidence_refs: preparation.evidence_refs,
        };
        observed = expectReturned(() =>
          ledger.report(fixture.identity.work_id, 1, observed.version, observation, observed.state.source_scope),
        );
        expect(
          observed.state.items.find((entry) => entry.request.action_id === peer.request.action_id)?.observation,
        ).toEqual(observation);
      }
      const { store, item, plan, journal } = pauseReadonlyDispatchHostFixture(fixture);
      const originalPeers = observed.state.items.filter((entry) => entry.request.action_id !== item.request.action_id);
      expect(originalPeers).toHaveLength(1);
      expectReturned(() => store.commitReadOnlyDispatchRepair(plan));
      const activated = expectReturned(() =>
        ledger.activateReadOnlyReplacement(fixture.identity.work_id, 1, journal.version, item.request.action_id),
      );
      expect(
        activated.snapshot.state.items.filter((entry) => entry.request.action_id !== item.request.action_id),
      ).toEqual(originalPeers);
      const source = activated.snapshot.state.source_scope;
      if (!source) throw new Error('Readonly peer fixture has no native Source scope');
      const hostBefore = store.readHostStateSnapshot(fixture.identity);
      const observation = mastraObservation(
        { ...item.request, action_id: activated.dispatch.dispatch_action_id },
        activated.dispatch.issue_id,
        'fixture:replacement-with-peer',
      );
      const reported = expectReturned(() =>
        ledger.reportReadOnlyReplacement(fixture.identity.work_id, 1, activated.snapshot.version, observation, source),
      );
      expect(reported.state.items.filter((entry) => entry.request.action_id !== item.request.action_id)).toEqual(
        originalPeers,
      );
      expect(
        reported.state.items.find((entry) => entry.request.action_id === item.request.action_id)?.observation,
      ).toEqual({ ...observation, action_id: item.request.action_id });
      expect(reported.state.completed).toEqual(journal.state.completed);
      expect(store.readHostStateSnapshot(fixture.identity)).toEqual(hostBefore);
    },
    {
      cooperativeSynthesis: true,
      holdExpiredOwnerClock: true,
      riskFlags: ['high'],
      configure: (configured) => {
        const architect = configured.agents.profiles.architect;
        const security = configured.agents.profiles['reviewer-security'];
        if (!architect || !security) throw new Error('Readonly peer fixture needs both configured prewriter profiles');
        return {
          ...configured,
          agents: {
            ...configured.agents,
            profiles: {
              ...configured.agents.profiles,
              architect: { ...architect, egress_policy: 'none' },
              'reviewer-security': { ...security, tools_policy: 'read_only', egress_policy: 'none' },
            },
          },
        };
      },
    },
    20_000,
  );
}, 20_000);

test('native research normalization reserves only the observed plan and survives a closed-ledger reopen', async () => {
  await withAdmittedHandoffFixture(
    async (fixture) => {
      const ledger = initialSourceHostLedger(fixture),
        host = initialSourceHostStore(fixture),
        db = initialSourceHostDatabase(fixture);
      let reservations = 0;
      const checkpoint = new Error('Native research normalization checkpoint reached');
      const stopped = await rejectionReason(
        prepareNativeUnnormalizedSynthesis(fixture, {
          stopBeforeSynthesisReport: true,
          normalizeResearch: ({ journal, request, plan }) => {
            const before = {
              host: host.readHostStateSnapshot(fixture.identity),
              journal: ledger.resume(fixture.identity.work_id, 1),
            };
            const row = () =>
              db
                .query(
                  'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
                )
                .get(host.workspaceId, fixture.identity.work_id, 1);
            const beforeRow = row();
            const { digest, ...body } = plan;
            void digest;
            const wrongBody = { ...body, observation_digest: '0'.repeat(64) };
            expect(() =>
              ledger.reserveResearchNormalization(fixture.identity.work_id, 1, journal.version, request.action_id, {
                ...wrongBody,
                digest: canonicalJsonDigest(wrongBody),
              }),
            ).toThrow('normalization plan differs from observation');
            expect(row()).toEqual(beforeRow);
            const unobserved = journal.state.items.find((entry) => entry.observation === null);
            expect(journal.state.items).toHaveLength(2);
            if (!unobserved) throw new Error('Native normalization fixture has no unobserved sibling');
            expect(() =>
              ledger.reserveResearchNormalization(
                fixture.identity.work_id,
                1,
                journal.version,
                unobserved.request.action_id,
                plan,
              ),
            ).toThrow('normalization needs one observed activated action');
            expect(row()).toEqual(beforeRow);
            expect(host.readHostStateSnapshot(fixture.identity)).toEqual(before.host);
            expect(ledger.resume(fixture.identity.work_id, 1)).toEqual(before.journal);
            const reserved = expectReturned(() =>
              ledger.reserveResearchNormalization(
                fixture.identity.work_id,
                1,
                journal.version,
                request.action_id,
                plan,
              ),
            );
            expect(reserved.version.revision).toBe(journal.version.revision + 1);
            expect(
              reserved.state.items.find((entry) => entry.request.action_id === request.action_id)
                ?.research_normalization,
            ).toEqual(plan);
            expect(reserved.state.items.filter((entry) => entry.request.action_id !== request.action_id)).toEqual(
              journal.state.items.filter((entry) => entry.request.action_id !== request.action_id),
            );
            const afterRow = row();
            expect(() =>
              ledger.reserveResearchNormalization(
                fixture.identity.work_id,
                1,
                reserved.version,
                request.action_id,
                plan,
              ),
            ).toThrow('normalization needs one observed activated action');
            expect(row()).toEqual(afterRow);
            expect(expectReturned(() => ledger.resume(fixture.identity.work_id, 1))).toEqual(reserved);
            expect(host.readHostStateSnapshot(fixture.identity)).toEqual(before.host);
            reservations++;
            throw checkpoint;
          },
        }),
      );
      expect(stopped).toBe(checkpoint);
      expect(reservations).toBe(1);
      const beforeClose = expectReturned(() => ledger.resume(fixture.identity.work_id, 1));
      await expectAsyncReturned(() => fixture.close());
      let reopened: MastraSessionLedger | undefined;
      await withInitialSourceCleanup(
        () => {
          reopened = expectReturned(() => openConfiguredMastraSessionLedger(fixture.root));
          expect(expectReturned(() => reopened?.resume(fixture.identity.work_id, 1))).toEqual(beforeClose);
        },
        () => {
          if (reopened) reopened.close();
        },
        'Research normalization reopened ledger',
      );
    },
    { cooperativeSynthesis: true, researchSynthesis: true, researchAssignments: 2 },
  );
});

describe('Mastra configured-wave ledger projections', () => {
  function nextConfiguredWave(
    fixture: ReturnType<typeof actualFocusedValidatorRequests>,
    priorResults: readonly SessionBridgeObservation[],
  ): { readonly stepId: string; readonly waveIndex: number; readonly requests: SessionBridgeRequest[] } {
    const workflowId = 'task_execution';
    const selected = selection('task', workflowId);
    const compiled = compileDevelopmentWorkflow(config, selected.team, workflowId, selected.risk_flags);
    const waveIndex = fixture.waveIndex + 1;
    if (compiled.waves[waveIndex] === undefined) throw new Error('configured workflow has no next wave');
    const actions = sessionActionsForWave(config, selected, fixture.requestContext, workflowId, waveIndex, []);
    const firstAction = actions[0];
    if (firstAction === undefined) throw new Error('configured next wave has no session actions');
    const stepId = firstAction.stage_id;
    if (actions.some((action) => action.stage_id !== stepId))
      throw new Error('configured next wave spans more than one Mastra step');
    const requests = actions.map((action) =>
      buildSessionBridgeRequest({
        runId: fixture.runId,
        workflowId,
        configDigest: runtimeConfigDigest(config),
        context: fixture.requestContext,
        waveIndex,
        action,
        configuredContext: configuredContextForStage(root, config, workflowId, action.stage_id, fixture.requestContext),
        priorResults,
      }),
    );
    return { stepId, waveIndex, requests };
  }

  function persistedRow(database: Database, workId: string) {
    return database
      .query<{ revision: number; payload: string; digest: string }, [string, string, number]>(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(workspaceId, workId, 1);
  }

  test('replays an exact sync without version change and refuses incomplete advance without rewriting the row', async () => {
    const deadline = performance.now() + 5000;
    caseDeadline = deadline;
    const checkDeadline = () => {
      if (performance.now() >= deadline) throw new Error('Mastra lifecycle case exceeded its monotonic 5s deadline');
    };
    let succeeded = false;
    try {
      scratch = await mkdtemp(path.join(tmpdir(), 'mastra-lifecycle-replay-'));
      checkDeadline();
      const workId = 'mastra-lifecycle-incomplete-advance';
      const fixture = actualFocusedValidatorRequests(workId);
      const { database, instance } = mastraLedger(workId);
      let current = instance.sync(
        workId,
        fixture.requestContext.attempt,
        fixture.runId,
        'validate_focused',
        fixture.requests,
      );
      checkDeadline();
      const exactReplay = instance.sync(
        workId,
        fixture.requestContext.attempt,
        fixture.runId,
        'validate_focused',
        fixture.requests,
      );
      expect(exactReplay).toEqual(current);
      expect(exactReplay.version).toEqual(current.version);

      current = instance.issueWave(workId, fixture.requestContext.attempt, current.version);
      expect(current.state.items.every((item) => item.host_reservation === undefined)).toBe(true);
      const issued = mastraItemAt(current, 0);
      const firstObservation = mastraObservation(issued.request, issued.issue_id, 'incomplete-advance-validator');
      current = instance.report(workId, fixture.requestContext.attempt, current.version, firstObservation);
      checkDeadline();

      const next = nextConfiguredWave(fixture, [firstObservation]);
      const before = persistedRow(database, workId);
      expect(before).toBeDefined();
      expect(() =>
        instance.sync(workId, fixture.requestContext.attempt, fixture.runId, next.stepId, next.requests),
      ).toThrow(/advanced without all unique observed effects/);
      expect(persistedRow(database, workId)).toEqual(before);
      expect(requiredMastraSnapshot(instance.resume(workId, fixture.requestContext.attempt))).toEqual(current);
      checkDeadline();
      succeeded = true;
    } finally {
      if (!succeeded) retainScratch = true;
    }
  }, 5000);

  test('advances once after both configured readonly validators and retrieves exact completed-history retries', async () => {
    const deadline = performance.now() + 5000;
    caseDeadline = deadline;
    const checkDeadline = () => {
      if (performance.now() >= deadline) throw new Error('Mastra lifecycle case exceeded its monotonic 5s deadline');
    };
    let succeeded = false;
    try {
      scratch = await mkdtemp(path.join(tmpdir(), 'mastra-lifecycle-advance-'));
      checkDeadline();
      const workId = 'mastra-lifecycle-complete-advance';
      const fixture = actualFocusedValidatorRequests(workId);
      expect(fixture.requests.map((request) => request.role).sort()).toEqual([
        'correctness-validator',
        'requirements-validator',
      ]);
      const { database, instance } = mastraLedger(workId);
      let current = instance.sync(
        workId,
        fixture.requestContext.attempt,
        fixture.runId,
        'validate_focused',
        fixture.requests,
      );
      current = instance.issueWave(workId, fixture.requestContext.attempt, current.version);
      expect(current.state.items.every((item) => item.host_reservation === undefined)).toBe(true);
      const observations = current.state.items.map((item) =>
        mastraObservation(item.request, item.issue_id, `completed-focused-validator-${item.request.action_id}`),
      );
      for (const observation of observations) {
        current = instance.report(workId, fixture.requestContext.attempt, current.version, observation);
        checkDeadline();
      }

      const priorStep = current.state.step_id;
      if (priorStep === null) throw new Error('Configured validator step is already terminal');
      const priorCompleted = { step_id: priorStep, items: current.state.items };
      const next = nextConfiguredWave(fixture, observations);
      const advanced = instance.sync(workId, fixture.requestContext.attempt, fixture.runId, next.stepId, next.requests);
      expect(advanced.version.revision).toBe(current.version.revision + 1);
      expect(advanced.state.step_id).toBe(next.stepId);
      expect(advanced.state.items.map((item) => item.request)).toEqual(next.requests);
      expect(advanced.state.completed).toEqual([priorCompleted]);
      const firstObservation = observations[0];
      if (firstObservation === undefined) throw new Error('configured validator wave produced no observation');
      expect(instance.retrieveReportedObservation(workId, fixture.requestContext.attempt, firstObservation)).toEqual(
        advanced,
      );
      const beforeRetry = persistedRow(database, workId);
      expect(instance.report(workId, fixture.requestContext.attempt, advanced.version, firstObservation)).toEqual(
        advanced,
      );
      expect(() =>
        instance.retrieveReportedObservation(workId, fixture.requestContext.attempt, {
          ...firstObservation,
          summary: 'changed retry for completed history',
          output_digest: canonicalJsonDigest('changed retry for completed history'),
        }),
      ).toThrow(/retry differs from recorded terminal observation/);
      expect(persistedRow(database, workId)).toEqual(beforeRetry);
      checkDeadline();
      succeeded = true;
    } finally {
      if (!succeeded) retainScratch = true;
    }
  }, 5000);

  test.each([
    ['success', 'complete'],
    ['failed', 'blocked'],
    ['canceled', 'blocked'],
    ['unknown', 'blocked'],
  ] as const)(
    'projects terminal %s status for its own work ID and leaves persisted history stable',
    async (workflowStatus, expectedStatus) => {
      const deadline = performance.now() + 5000;
      caseDeadline = deadline;
      const checkDeadline = () => {
        if (performance.now() >= deadline) throw new Error('Mastra lifecycle case exceeded its monotonic 5s deadline');
      };
      let succeeded = false;
      try {
        scratch = await mkdtemp(path.join(tmpdir(), `mastra-lifecycle-terminal-${workflowStatus}-`));
        checkDeadline();
        const workId = `mastra-lifecycle-terminal-${workflowStatus}`;
        const fixture = actualFocusedValidatorRequests(workId);
        const { database, instance } = mastraLedger(workId);
        let current = instance.sync(
          workId,
          fixture.requestContext.attempt,
          fixture.runId,
          'validate_focused',
          fixture.requests,
        );
        current = instance.issueWave(workId, fixture.requestContext.attempt, current.version);
        for (const item of current.state.items) {
          current = instance.report(
            workId,
            fixture.requestContext.attempt,
            current.version,
            mastraObservation(item.request, item.issue_id, `terminal-${workflowStatus}-${item.request.action_id}`),
          );
          checkDeadline();
        }
        const terminal = instance.sync(
          workId,
          fixture.requestContext.attempt,
          fixture.runId,
          null,
          [],
          null,
          workflowStatus,
        );
        expect(terminal.resume_status).toBe(expectedStatus);
        const before = persistedRow(database, workId);
        expect(before).toBeDefined();
        const exactTerminalReplay = instance.sync(
          workId,
          fixture.requestContext.attempt,
          fixture.runId,
          null,
          [],
          null,
          workflowStatus,
        );
        expect(exactTerminalReplay).toEqual(terminal);
        expect(exactTerminalReplay.resume_status).toBe(expectedStatus);
        expect(persistedRow(database, workId)).toEqual(before);
        expect(exactTerminalReplay.state.completed).toEqual(terminal.state.completed);
        checkDeadline();
        succeeded = true;
      } finally {
        if (!succeeded) retainScratch = true;
      }
    },
    5000,
  );
});
