import { afterEach, describe, expect, setSystemTime, spyOn, test } from 'bun:test';
import { writeFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Database } from 'bun:sqlite';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import type { WorkItemSelection } from '../../src/config/runtime-config.ts';
import { HostStateStore, openHostStateDatabase, type WorkIdentity } from '../../src/host-state.ts';
import { loadProjectContext } from '../../src/config/project-context.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../../src/config/workspace-database-raw.ts';
import { makeFreshRepository } from '../helpers/project-upgrade-fixture.ts';
import { configuredTestContext } from '../configured-context.ts';
import { expectAsyncReturned, expectReturned, rejectionReason } from '../helpers/expect-rejection.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.ts';
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
} from '../helpers/initial-source-work-fixture.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import type {
  MastraLedgerItem,
  MastraSessionLedgerSnapshot,
  MastraSessionLedgerState,
  PersistentSessionSnapshot,
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
      throw new Error('Mastra lifecycle cleanup exhausted its monotonic 5s deadline');
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

  test('adopts only a legacy wave with at least one unprepared research action and no observed effect', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-legacy-recovery-'));
    const { database, instance, workId } = mastraLedger('legacy-recovery');
    const request = bridgeRequest({
      actionId: '9'.repeat(64),
      workflowId: 'information_research_light',
      stageId: 'research_parallel',
      assignmentIndex: 0,
    });
    const issueId = '66666666-6666-4666-8666-666666666666';
    seedMastraLedger(database, mastraState(workId, [request], [{ request, issue_id: issueId, observation: null }]));
    const legacy = requiredMastraSnapshot(instance.resume(workId, 1));
    const recovered = instance.beginLegacyResearchPreparationRecovery(workId, 1, legacy.version);
    expect(recovered.state.research_wave_exposure).toBe('preparing');
    expect(mastraItemAt(recovered, 0).issue_id).toBe(issueId);
    expect(mastraItemAt(recovered, 0).observation).toBeNull();
    expect(() => instance.beginLegacyResearchPreparationRecovery(workId, 1, recovered.version)).toThrow(
      /unmarked journal/,
    );
  });

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

test('readonly replacement report atomically binds raw and projected observations to its prepared dispatch', async () => {
  await withReadonlyDispatchHostFixture(async (fixture, deadline) => {
    const { store, ledger, item, plan, journal, db } = pauseReadonlyDispatchHostFixture(fixture);
    expect(expectReturned(() => store.commitReadOnlyDispatchRepair(plan))).toEqual(plan);
    const activated = expectReturned(() =>
      ledger.activateReadOnlyReplacement(fixture.identity.work_id, 1, journal.version, item.request.action_id),
    );
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
