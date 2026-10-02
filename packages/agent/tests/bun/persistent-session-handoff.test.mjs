import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { HostStateStore, openHostStateDatabase } from '../../src/host-state.ts';
import { validateActivationUse } from '../../src/research-decision.ts';
import {
  MastraSessionLedger,
  PersistentSessionHandoffStore,
  sessionHandoffDatabasePath,
} from '../../src/orchestration/persistent-session-handoff.ts';

const root =
  process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const config = loadRuntimeConfig(root);
const workspaceId = 'a'.repeat(64);
const context = { work_id: 'new-work', attempt: 1, scope_digest: 'b'.repeat(64) };
const flows = [
  ['information_research_light', 'research', 'information_research'],
  ['implementation_new', 'feature', 'implementation_new'],
  ['implementation_change', 'feature', 'implementation_change'],
  ['bug_fix', 'bug', 'bug_fix'],
  ['task_execution', 'task', 'task_execution'],
];
let scratch;
const stores = [];
const mastraLedgers = [];

function store() {
  const instance = new PersistentSessionHandoffStore(
    openHostStateDatabase(path.join(scratch, 'host.sqlite')),
    workspaceId,
    config,
  );
  stores.push(instance);
  return instance;
}

function selection(kind, intent) {
  return {
    team: 'default-development',
    kind,
    intent,
    project: config.teams['default-development'].allowed_projects[0],
    risk_flags: [],
    labels: [],
  };
}

function observed(snapshot, action, issueId, options = {}) {
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

function mastraLedger(workId = 'mastra-work') {
  const database = openHostStateDatabase(path.join(scratch, `host-${mastraLedgers.length}.sqlite`));
  const host = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
  const instance = new MastraSessionLedger(database, workspaceId, config, root, host);
  mastraLedgers.push(instance);
  return { database, instance, workId };
}

function bridgeRequest({ actionId, workflowId, stageId, assignmentIndex, waveIndex = 0, runId = 'run-1' }) {
  const stage = config.workflows[workflowId].stages.find((entry) => entry.id === stageId);
  return {
    schema: 'VidaSessionRequest/v1',
    run_id: runId,
    workflow_id: workflowId,
    wave_index: waveIndex,
    action_id: actionId,
    assignment_index: assignmentIndex,
    stage_id: stageId,
    role: stage.assignments[assignmentIndex].role,
    config_digest: runtimeConfigDigest(config),
    scope_digest: 'b'.repeat(64),
    bindings_manifest_ref: 'e'.repeat(64),
  };
}

function seedMastraLedger(database, state) {
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const payload = canonicalJson(state);
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspaceId, state.work_id, state.attempt, 1, payload, canonicalJsonDigest(state));
}

function mastraState(workId, requests, items, overrides = {}) {
  return {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspaceId,
    work_id: workId,
    attempt: 1,
    run_id: requests[0].run_id,
    step_id: requests[0].stage_id,
    items: items ?? requests.map((request) => ({ request, issue_id: null, observation: null })),
    completed: [],
    ...overrides,
  };
}

function mastraObservation(
  request,
  issueId,
  toolCallRef,
  summary = `result-${request.assignment_index}`,
  agentId = `agent-${request.assignment_index}`,
) {
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
  if (scratch) await rm(scratch, { recursive: true, force: true });
  scratch = undefined;
});

describe('persistent advisory session handoff', () => {
  test('derives one state file from root YAML work root', () => {
    expect(sessionHandoffDatabasePath(root, config)).toBe(
      path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'),
    );
  });

  test.each(flows)('persists issue and report barriers for %s', async (workflow, kind, intent) => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const active = store();
    let snapshot = active.prepare(selection(kind, intent), context);
    expect(snapshot.state.handoff.workflow_id).toBe(workflow);
    while (snapshot.resume_status === 'ready') {
      const actions = snapshot.state.handoff.actions;
      const issued = [];
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
      snapshot = restarted.resume(context.work_id, context.attempt);
      expect(snapshot).toEqual(issued.snapshot);
      expect(() => restarted.issueWave(context.work_id, context.attempt, snapshot.version)).toThrow(/already issued/);
      for (const [index, action] of actions.entries()) {
        snapshot = restarted.report(
          context.work_id,
          context.attempt,
          snapshot.version,
          observed(snapshot, action, issued.issuances[index].issue_id),
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
    let sharedValidatorRef;
    while (snapshot.resume_status === 'ready') {
      const issued = active.issueWave(context.work_id, context.attempt, snapshot.version);
      snapshot = issued.snapshot;
      for (const { action_id, issue_id } of issued.issuances) {
        const action = snapshot.state.handoff.actions.find((entry) => entry.action_id === action_id);
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
    const action = prepared.state.handoff.actions[0];
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
    const action = prepared.state.handoff.actions[0];
    const issued = first.issue(context.work_id, context.attempt, prepared.version, action.action_id);
    const restarted = store();
    const uncertain = restarted.resume(context.work_id, context.attempt);
    expect(uncertain.resume_status).toBe('issued_outcome_uncertain');
    expect(() => restarted.issue(context.work_id, context.attempt, uncertain.version, action.action_id)).toThrow(
      /already issued/,
    );
    expect(() =>
      restarted.issue(
        context.work_id,
        context.attempt,
        uncertain.version,
        uncertain.state.handoff.actions[1].action_id,
      ),
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
    const action = prepared.state.handoff.actions[0];
    const issued = first.issue(context.work_id, context.attempt, prepared.version, action.action_id);
    const partial = first.report(
      context.work_id,
      context.attempt,
      issued.snapshot.version,
      observed(issued.snapshot, action, issued.issue_id),
    );
    const restarted = store();
    const resumed = restarted.resume(context.work_id, context.attempt);
    expect(resumed).toEqual(partial);
    expect(resumed.resume_status).toBe('ready');
    expect(() => restarted.issue(context.work_id, context.attempt, resumed.version, action.action_id)).toThrow(
      /already issued/,
    );
    const nextAction = resumed.state.handoff.actions[1];
    expect(
      restarted.issue(context.work_id, context.attempt, resumed.version, nextAction.action_id).snapshot.resume_status,
    ).toBe('issued_outcome_uncertain');
  });

  test('CAS and identity reject duplicate, stale and foreign writes', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'session-state-'));
    const first = store();
    const prepared = first.prepare(selection('research', 'information_research'), context);
    expect(() => first.prepare(selection('research', 'information_research'), context)).toThrow(/already exists/);
    const action = prepared.state.handoff.actions[0];
    first.issue(context.work_id, context.attempt, prepared.version, action.action_id);
    expect(() =>
      first.issue(context.work_id, context.attempt, prepared.version, prepared.state.handoff.actions[1].action_id),
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
    const tamper = openHostStateDatabase(path.join(scratch, 'host.sqlite'));
    try {
      tamper
        .query(
          'UPDATE agent_host_session_handoff SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .run(canonicalJson(old), canonicalJsonDigest(old), workspaceId, context.work_id, context.attempt);
    } finally {
      tamper.close();
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
    const prepared = instance.resume(workId, 1);
    const issued = instance.issueWave(workId, 1, prepared.version);
    expect(issued.state.research_wave_exposure).toBe('preparing');
    expect(issued.state.items[0].issue_id).toBeTruthy();
    expect(() => instance.markResearchWaveExposurePossible(workId, 1, issued.version)).toThrow(
      /every instruction activation to be committed/,
    );
    expect(() =>
      instance.report(
        workId,
        1,
        issued.version,
        mastraObservation(request, issued.state.items[0].issue_id, 'premature-report'),
      ),
    ).toThrow(/report is premature/);
    expect(instance.resume(workId, 1)).toEqual(issued);

    const issueId = issued.state.items[0].issue_id;
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
    const planBody = {
      schema: 'ObservedActivationUseWritePlan/v1',
      binding,
      use_digest: use.digest,
      history_path: `research/activation/${workId}/instruction-activation-history.jsonl`,
      history_pre_sha256: null,
      history_sha256: '3'.repeat(64),
    };
    const plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
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
    const legacy = instance.resume(workId, 1);
    const recovered = instance.beginLegacyResearchPreparationRecovery(workId, 1, legacy.version);
    expect(recovered.state.research_wave_exposure).toBe('preparing');
    expect(recovered.state.items[0].issue_id).toBe(issueId);
    expect(recovered.state.items[0].observation).toBeNull();
    expect(() => instance.beginLegacyResearchPreparationRecovery(workId, 1, recovered.version)).toThrow(
      /unmarked journal/,
    );
  });

  test('allows one invocation to report the configured co-issued read-only validator slots', async () => {
    scratch = await mkdtemp(path.join(tmpdir(), 'mastra-batch-report-'));
    const { database, instance, workId } = mastraLedger('batch-report');
    const workflowId = 'task_execution';
    const stageId = 'validate_focused';
    const requests = [0, 1].map((assignmentIndex) =>
      bridgeRequest({
        actionId: (assignmentIndex === 0 ? 'c' : 'd').repeat(64),
        workflowId,
        stageId,
        assignmentIndex,
      }),
    );
    const issueIds = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
    seedMastraLedger(
      database,
      mastraState(
        workId,
        requests,
        requests.map((request, index) => ({ request, issue_id: issueIds[index], observation: null })),
      ),
    );
    let current = instance.resume(workId, 1);
    const sharedRef = 'one-controlled-tool-invocation';
    const first = mastraObservation(requests[0], issueIds[0], sharedRef, undefined, 'same-agent');
    current = instance.report(workId, 1, current.version, first);
    const exactRetry = instance.report(workId, 1, current.version, first);
    expect(exactRetry.version).toEqual(current.version);
    expect(() =>
      instance.report(workId, 1, current.version, { ...first, summary: 'conflicting duplicate slot' }),
    ).toThrow(/retry differs/);
    current = instance.report(
      workId,
      1,
      current.version,
      mastraObservation(requests[1], issueIds[1], sharedRef, undefined, 'same-agent'),
    );
    expect(current.state.items.map((item) => item.observation?.tool_call_ref)).toEqual([sharedRef, sharedRef]);
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
    const currentIssue = ['44444444-4444-4444-8444-444444444444', '55555555-5555-4555-8555-555555555555'];
    const sharedRef = 'reused-tool-invocation';
    const oldObservation = mastraObservation(oldRequest, oldIssue, sharedRef);
    const state = mastraState(
      workId,
      currentRequests,
      currentRequests.map((request, index) => ({ request, issue_id: currentIssue[index], observation: null })),
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
    const current = instance.resume(workId, 1);
    expect(() =>
      instance.report(workId, 1, current.version, mastraObservation(currentRequests[0], currentIssue[0], sharedRef)),
    ).toThrow(/outside an allowed read-only slot batch/);
  });
});
