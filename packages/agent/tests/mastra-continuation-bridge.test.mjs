import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
} from '../src/orchestration/mastra-session-bridge.ts';
import { readConfiguredContinuationSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';
import {
  projectConfiguredFrontierContinuationAction,
  projectConfiguredPrewriterContinuationRequests,
} from '../src/orchestration/delivered-work-continuation.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = new Set();
afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.clear();
});

function scope(entries) {
  const body = { schema: 'ScopedSourceSnapshot/v1', entries };
  return { ...body, digest: canonicalJsonDigest(body) };
}

function fixture({ afterBoundary = false } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-mastra-continuation-'));
  roots.add(root);
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'continuation-fixture')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('.agent/work', '.agent/current-work'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    project = config.projects[0].project_id,
    workId = 'continuation-work',
    attempt = 4,
    workflowId = 'task_execution',
    runId = 'vida-original-configured-run',
    priorConfigDigest = '1'.repeat(64),
    targetConfigDigest = runtimeConfigDigest(config),
    originalScope = scope([{ path: 'src/example.ts', exists: true, bytes: 10, sha256: '2'.repeat(64) }]),
    currentScope = scope([{ path: 'src/example.ts', exists: true, bytes: 11, sha256: '3'.repeat(64) }]),
    selection = {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project,
      risk_flags: ['high'],
      labels: [],
    },
    oldContext = { work_id: workId, attempt, scope_digest: originalScope.digest },
    currentContext = { ...oldContext, scope_digest: currentScope.digest },
    plan = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags, 'high'),
    boundaryWave = plan.waves.findIndex((wave) => wave.some((stage) => stage.id === 'review_source_prewrite')),
    developerWave = plan.waves.findIndex((wave) => wave.some((stage) => stage.kind === 'develop'));
  expect(boundaryWave).toBeGreaterThanOrEqual(0);
  expect(developerWave).toBe(boundaryWave + 1);

  const workItem = {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'fixture',
      provider_type: 'fixture',
      canonical_kind: selection.kind,
      intent: selection.intent,
      project_id: project,
      title: 'Continuation reader fixture',
      description: '',
      labels: [],
      risk_flags: ['high'],
    },
    intake = {
      schema: 'VidaLocalSessionIntake/v1',
      native_session_handle: 'fixture-session',
      risk: 'high',
      work_item: workItem,
    },
    intakeBytes = Buffer.from(JSON.stringify(intake));
  writeFileSync(path.join(root, 'accepted-intake.json'), intakeBytes);
  const work = {
    schema: 'WorkState/v1',
    workspace_id: 'workspace-fixture',
    revision: 1,
    binding: {
      repository_id: config.repository.repository_id,
      project_ids: [project],
      integrations_digest: '3'.repeat(64),
      team_id: selection.team,
      workflow_id: workflowId,
      lifecycle_work_id: workId,
      work_item_digest: canonicalJsonDigest(workItem),
      work_source_revision: originalScope.digest,
      config_digest: priorConfigDigest,
    },
    execution: { run_id: runId, input_digest: '4'.repeat(64), phase: 'execute', status: 'active', assignment_attempts: [] },
    lifecycle: { risk: 'high' },
    artifacts: [{
      artifact_id: 'local-session-intake',
      schema: 'VidaLocalSessionIntake/v1',
      path: 'accepted-intake.json',
      sha256: createHash('sha256').update(intakeBytes).digest('hex'),
    }],
  };
  const input = {
    work_id: workId,
    attempt,
    workflow_id: workflowId,
    scope_digest: originalScope.digest,
    config_digest: priorConfigDigest,
    selection,
    observations: [],
  };
  const requestFor = (waveIndex, action, context, configDigest, priorResults) =>
    buildSessionBridgeRequest({
      runId,
      workflowId,
      configDigest,
      context,
      waveIndex,
      action,
      configuredContext: configuredContextForStage(root, config, workflowId, action.stage_id, context),
      priorResults,
    });
  const completed = [];
  let oldState = input;
  for (let waveIndex = 0; waveIndex < boundaryWave; waveIndex++) {
    const actions = sessionActionsForWave(config, selection, oldContext, workflowId, waveIndex, [], undefined, 'high');
    expect(actions.length).toBeGreaterThan(0);
    const items = actions.map((action) => {
      const request = requestFor(waveIndex, action, oldContext, priorConfigDigest, oldState.observations),
        summary = `Original completed wave ${waveIndex}`,
        observation = {
          schema: 'VidaSessionObservation/v1',
          action_id: request.action_id,
          issue_id: randomUUID(),
          agent_id: action.role,
          tool_call_ref: `fixture-wave-${waveIndex}`,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: [],
        };
      return { request, issue_id: observation.issue_id, observation };
    });
    completed.push({ step_id: `wave-${waveIndex}`, items });
    oldState = { ...oldState, observations: [...oldState.observations, ...items.map((item) => item.observation)] };
  }
  const developerAction = sessionActionsForWave(
      config,
      selection,
      oldContext,
      workflowId,
      developerWave,
      [],
      undefined,
      'high',
    )[0],
    oldDeveloperRequest = requestFor(boundaryWave, developerAction, oldContext, priorConfigDigest, oldState.observations),
    journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: work.workspace_id,
      work_id: workId,
      attempt,
      run_id: runId,
      source_scope: originalScope,
      step_id: `wave-${boundaryWave}`,
      items: [{ request: oldDeveloperRequest, issue_id: null, observation: null }],
      completed,
    },
    beforeEngine = {
      run_id: runId,
      status: 'suspended',
      step_id: journal.step_id,
      requests: [oldDeveloperRequest],
      observations: oldState.observations,
    },
    identity = {
      repository_id: config.repository.repository_id,
      project_ids: [project],
      integrations_digest: '3'.repeat(64),
      work_id: workId,
    },
    binding = {
      repositoryRoot: root,
      config,
      selection,
      context: currentContext,
      workflowId,
      runId,
      lifecycleRisk: 'high',
    },
    action = projectConfiguredFrontierContinuationAction({
      engine: beforeEngine,
      journal,
      targetConfigDigest,
      currentSourceScope: currentScope,
    }),
    request = {
      schema: 'DeliveredWorkContinuationRequest/v1',
      identity,
      attempt,
      nativeSessionHandle: 'fixture-session',
      expectedWork: { revision: work.revision, digest: canonicalJsonDigest(work) },
      expectedLedger: { revision: 1, digest: '5'.repeat(64) },
      expectedJournal: { revision: 1, digest: canonicalJsonDigest(journal) },
      expectedMaintenanceGeneration: 0,
      priorConfigDigest,
      targetConfigDigest,
      sourceTransition: { transition_digest: '6'.repeat(64) },
      currentSourceScope: currentScope,
      action,
    },
    beforeBytes = Buffer.from(canonicalJson(beforeEngine)),
    currentRequests = projectConfiguredPrewriterContinuationRequests({
      repositoryRoot: root,
      config,
      selection,
      context: currentContext,
      workflowId,
      engine: beforeEngine,
      journal,
      currentSourceScope: currentScope,
      lifecycleRisk: 'high',
    }),
    successorJournal = {
      ...journal,
      source_scope: currentScope,
      items: currentRequests.map((item) => ({ request: item, issue_id: null, observation: null })),
    },
    receipt = {
      schema: 'DeliveredWorkContinuationReceipt/v1',
      continuation_id: 'fixture-continuation',
      attempt,
      request_digest: canonicalJsonDigest(request),
      authorization: {
        request_digest: canonicalJsonDigest(request),
        action_digest: canonicalJsonDigest(action),
        transition_digest: request.sourceTransition.transition_digest,
      },
      request,
      prior_work: work,
      prior_journal: journal,
      historical_capture: null,
      frontier_snapshot: {
        snapshot_bytes_base64: beforeBytes.toString('base64'),
        snapshot_sha256: createHash('sha256').update(beforeBytes).digest('hex'),
      },
      successor_journal: successorJournal,
      rights_granted: false,
      accepted_result: false,
      runtime_acceptance: false,
      status: 'action_ready',
    };

  const waveContexts = { input };
  let persistedStatus = 'suspended', suspendedPaths = { [journal.step_id]: [boundaryWave] };
  if (afterBoundary) {
    let prefixState = input;
    for (const wave of completed) {
      const observations = wave.items.map((item) => item.observation),
        output = { ...prefixState, observations: [...prefixState.observations, ...observations] };
      waveContexts[wave.step_id] = {
        status: 'success',
        payload: prefixState,
        suspendPayload: { requests: wave.items.map((item) => item.request) },
        resumePayload: { observations },
        output,
      };
      prefixState = output;
    }
    const boundaryObservations = currentRequests.map((currentRequest, index) => {
        const summary = `Current prewriter report ${index}`;
        return {
          schema: 'VidaSessionObservation/v1',
          action_id: currentRequest.action_id,
          issue_id: randomUUID(),
          agent_id: currentRequest.role,
          tool_call_ref: `fixture-prewriter-${index}`,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: [],
        };
      }),
      boundaryOutput = {
        ...prefixState,
        config_digest: targetConfigDigest,
        scope_digest: currentScope.digest,
        observations: [...prefixState.observations, ...boundaryObservations],
      };
    waveContexts[journal.step_id] = {
      status: 'success',
      payload: prefixState,
      suspendPayload: { requests: currentRequests },
      resumePayload: { observations: boundaryObservations },
      output: boundaryOutput,
    };
    const laterActions = sessionActionsForWave(
        config,
        selection,
        currentContext,
        workflowId,
        developerWave,
        [],
        undefined,
        'high',
      ),
      laterRequests = laterActions.map((action) => requestFor(
        developerWave,
        action,
        currentContext,
        targetConfigDigest,
        boundaryOutput.observations,
      )),
      executedWaves = [...plan.waves.entries()].filter(([, wave]) => !wave.every((stage) => stage.assignments.length === 0)),
      executionIndex = executedWaves.findIndex(([index]) => index === developerWave);
    waveContexts[`wave-${developerWave}`] = {
      status: 'suspended',
      payload: boundaryOutput,
      suspendPayload: { requests: laterRequests },
    };
    persistedStatus = 'suspended';
    suspendedPaths = { [`wave-${developerWave}`]: [executionIndex] };
  }
  if (!afterBoundary) {
    let state = input;
    for (const wave of completed) {
      const observations = wave.items.map((item) => item.observation),
        output = { ...state, observations: [...state.observations, ...observations] };
      waveContexts[wave.step_id] = {
        status: 'success',
        payload: state,
        suspendPayload: { requests: wave.items.map((item) => item.request) },
        resumePayload: { observations },
        output,
      };
      state = output;
    }
    waveContexts[journal.step_id] = {
      status: 'suspended',
      payload: state,
      suspendPayload: { requests: [oldDeveloperRequest] },
    };
  }
  const persisted = { runId, status: persistedStatus, context: waveContexts, suspendedPaths },
    databasePath = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  mkdirSync(path.join(root, '.agent', 'work'), { recursive: true });
  writeFileSync(path.join(root, '.agent', 'work', 'mastra-workflows.v1.sqlite'), 'old-config decoy');
  const database = new Database(databasePath, { create: true, strict: true });
  try {
    database.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot TEXT)');
    database.query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)').run(workflowId, runId, JSON.stringify(persisted));
  } finally {
    database.close();
  }
  return {
    root,
    databasePath,
    binding,
    receipt,
    persisted,
    currentRequests,
    boundaryWave,
    developerWave,
    originalObservations: oldState.observations,
    currentObservations: afterBoundary ? waveContexts[journal.step_id].resumePayload.observations : [],
  };
}

function rewritePersisted(fixtureValue, mutate) {
  const changed = structuredClone(fixtureValue.persisted);
  mutate(changed);
  const database = new Database(fixtureValue.databasePath, { strict: true });
  try {
    database.query('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
      .run(JSON.stringify(changed), fixtureValue.receipt.prior_work.execution.run_id);
  } finally {
    database.close();
  }
}

test('configured continuation retains the original run and presents the current prewriter wave', () => {
  const value = fixture();
  const snapshot = readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt);
  expect(snapshot).toMatchObject({
    run_id: value.receipt.prior_work.execution.run_id,
    status: 'suspended',
    step_id: `wave-${value.boundaryWave}`,
    observations: value.originalObservations,
  });
  expect(snapshot.requests).toEqual(value.currentRequests);
  expect(snapshot.requests.every((request) => request.config_digest === value.receipt.request.targetConfigDigest)).toBe(true);
  expect(snapshot.requests.every((request) => request.scope_digest === value.receipt.request.currentSourceScope.digest)).toBe(true);
});

test('configured continuation accepts only the completed current wave and resumes the current developer suffix after restart', () => {
  const value = fixture({ afterBoundary: true }),
    first = readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt),
    restarted = readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt);
  expect(first).toEqual(restarted);
  expect(first.run_id).toBe(value.receipt.prior_work.execution.run_id);
  expect(first.step_id).toBe(`wave-${value.developerWave}`);
  expect(first.requests.length).toBeGreaterThan(0);
  expect(first.requests.every((request) => request.config_digest === runtimeConfigDigest(value.binding.config))).toBe(true);
  expect(first.requests.every((request) => request.scope_digest === value.binding.context.scope_digest)).toBe(true);
  expect(first.observations).toEqual([...value.originalObservations, ...value.currentObservations]);
});

test('configured continuation rejects missing, changed and mismatched beforeimage receipts', () => {
  const value = fixture();
  expect(() => readConfiguredContinuationSessionEngineSnapshot(value.binding, null)).toThrow();
  expect(() => readConfiguredContinuationSessionEngineSnapshot(value.binding, {
    ...value.receipt,
    frontier_snapshot: { ...value.receipt.frontier_snapshot, snapshot_sha256: '0'.repeat(64) },
  })).toThrow(/beforeimage encoding or digest/);
  expect(() => readConfiguredContinuationSessionEngineSnapshot(value.binding, {
    ...value.receipt,
    request: { ...value.receipt.request, targetConfigDigest: '9'.repeat(64) },
  })).toThrow(/receipt identity or integrity/);
});

test('configured continuation rejects original input or successful prefix drift after the boundary', () => {
  for (const mutate of [
    (snapshot, value) => { snapshot.context.input.config_digest = value.receipt.request.targetConfigDigest; },
    (snapshot) => { snapshot.context['wave-0'].output.observations[0].summary = 'changed old prefix'; },
    (snapshot) => { snapshot.context[`wave-${snapshot.context.input.attempt}`] = { status: 'success' }; },
  ]) {
    const value = fixture({ afterBoundary: true });
    rewritePersisted(value, (snapshot) => mutate(snapshot, value));
    expect(() => readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt)).toThrow();
  }
});

test('configured continuation rejects partial, failed, mismatched and stale-digest current reports', () => {
  const mutations = [
    (snapshot, value) => { snapshot.context[`wave-${value.boundaryWave}`].resumePayload.observations.pop(); },
    (snapshot, value) => { snapshot.context[`wave-${value.boundaryWave}`].resumePayload.observations[0].status = 'reported_failed'; },
    (snapshot, value) => { snapshot.context[`wave-${value.boundaryWave}`].resumePayload.observations[0].action_id = 'f'.repeat(64); },
    (snapshot, value) => { snapshot.context[`wave-${value.boundaryWave}`].resumePayload.observations[0].output_digest = 'e'.repeat(64); },
    (snapshot, value) => { snapshot.context[`wave-${value.boundaryWave}`].output.config_digest = value.receipt.request.priorConfigDigest; },
    (snapshot, value) => { snapshot.context[`wave-${value.boundaryWave}`].output.scope_digest = value.receipt.prior_journal.source_scope.digest; },
  ];
  for (const mutate of mutations) {
    const value = fixture({ afterBoundary: true });
    rewritePersisted(value, (snapshot) => mutate(snapshot, value));
    expect(() => readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt)).toThrow();
  }
});
