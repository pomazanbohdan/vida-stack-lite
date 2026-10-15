import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Database } from 'bun:sqlite';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import type { WorkItemSelection } from '../../src/config/runtime-config.ts';
import { HostStateStore, openHostStateDatabase } from '../../src/host-state.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../../src/config/workspace-database-raw.ts';
import { makeFreshRepository } from '../helpers/project-upgrade-fixture.ts';
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
  PersistentSessionHandoffStore,
  openConfiguredMastraSessionLedger,
  openConfiguredSessionHandoffStore,
  sessionHandoffDatabasePath,
} from '../../src/orchestration/persistent-session-handoff.ts';
import { sessionActionsForWave } from '../../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../../src/orchestration/workflow-plan.ts';

const root =
  process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const config = loadRuntimeConfig(root);
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

function selection(kind: WorkItemSelection['kind'], intent: WorkItemSelection['intent']): WorkItemSelection {
  const team = config.teams['default-development'];
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

function actualFocusedValidatorRequests(workId: string): {
  readonly requestContext: SessionHandoffContext;
  readonly runId: string;
  readonly waveIndex: number;
  readonly requests: SessionBridgeRequest[];
} {
  const workflowId = 'task_execution';
  const selected = selection('task', workflowId);
  const requestContext = { ...context, work_id: workId };
  const compiled = compileDevelopmentWorkflow(config, selected.team, workflowId, selected.risk_flags);
  const waveIndex = compiled.waves.findIndex((wave) => wave.some((stage) => stage.id === 'validate_focused'));
  if (waveIndex < 0) throw new Error('focused validator wave is not configured');
  const actions = sessionActionsForWave(config, selected, requestContext, workflowId, waveIndex, []);
  const runId = sessionBridgeRunId(workspaceId, requestContext, workflowId);
  const requests = actions
    .filter((action) => action.stage_id === 'validate_focused')
    .map((action) =>
      buildSessionBridgeRequest({
        runId,
        workflowId,
        configDigest: runtimeConfigDigest(config),
        context: requestContext,
        waveIndex,
        action,
        configuredContext: configuredContextForStage(root, config, workflowId, action.stage_id, requestContext),
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
  for (const instance of mastraLedgers.splice(0)) instance.close();
  for (const instance of stores.splice(0)) instance.close();
  if (scratch && retainScratch) console.error(`Retained failed session handoff fixture root: ${scratch}`);
  else if (scratch) await rm(scratch, { recursive: true, force: true });
  scratch = undefined;
  retainScratch = false;
});

async function configuredFactoryFixture(name: string): Promise<string> {
  const repositoryRoot = await makeFreshRepository(`session-handoff-${name}-`);
  scratch = repositoryRoot;
  return repositoryRoot;
}

function combinedConstructorAndCloseFailure(
  repositoryRoot: string,
  factory: (repositoryRoot: string) => unknown,
): void {
  const fixtureConfig = loadRuntimeConfig(repositoryRoot);
  const fixtureWorkspaceId = deriveWorkspaceId(fixtureConfig.repository.repository_id, repositoryRoot);
  const originalExec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
  const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  const admittedDatabases: Database[] = [];
  let constructorError: Error | undefined;
  let closeError: Error | undefined;
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
      closeError ??= new Error('injected native admitted database close failure');
      if (nativeCloseReceivers.length <= 2) {
        if (nativeCloseReceivers.length === 1) order.push('close');
        throw closeError;
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
  let retrySucceeded = false;
  try {
    const admittedDatabase = admittedDatabases[0];
    expect(admittedDatabase).toBeDefined();
    if (admittedDatabase === undefined) throw new Error('configured factory did not open its admitted source');
    expect(constructorError).toBeDefined();
    expect(closeError).toBeDefined();
    expect(caught).toBeInstanceOf(AggregateError);
    const aggregate = caught as AggregateError;
    const originalCauses = (error: unknown): unknown[] =>
      error instanceof AggregateError ? error.errors.flatMap(originalCauses) : [error];
    const causes = originalCauses(aggregate);
    expect(causes).toHaveLength(2);
    expect(causes[0]).toBe(constructorError);
    expect(causes[1]).toBe(closeError);
    expect(order).toEqual(['constructor', 'close']);
    expect(nativeCloseReceivers).toEqual([admittedDatabase]);

    let contenderError: unknown;
    try {
      openHostStateDatabase(
        repositoryRoot,
        path.relative(repositoryRoot, sessionHandoffDatabasePath(repositoryRoot, fixtureConfig)),
        fixtureWorkspaceId,
      );
    } catch (error) {
      contenderError = error;
    }
    expect(contenderError).toBeDefined();
    expect(nativeCloseReceivers).toEqual([admittedDatabase, admittedDatabase]);
  } catch (error) {
    assertionError = error;
  } finally {
    Database.prototype.close = originalClose;
    try {
      retryPendingWorkspaceDatabaseCloses();
      retrySucceeded = true;
    } catch (error) {
      retainScratch = true;
      assertionError ??= error;
    }
  }
  if (assertionError !== undefined) throw assertionError;
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
    ['handoff store', openConfiguredSessionHandoffStore],
    ['Mastra ledger', openConfiguredMastraSessionLedger],
  ] as const)('preserves constructor and close failures for the configured %s factory', async (name, factory) => {
    const repositoryRoot = await configuredFactoryFixture(name.replaceAll(' ', '-'));
    retainScratch = true;
    combinedConstructorAndCloseFailure(repositoryRoot, factory);
    retainScratch = false;
  });

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
