import { afterEach, test, expect } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runRuntimeCodeRebind } from '../bin/runtime-code-rebind.mjs';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { runtimeConfigDigest, loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { buildSessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { compareScopedSourceSnapshots } from '../src/orchestration/scoped-source-snapshot.ts';
import * as continuationProjection from '../src/orchestration/delivered-work-continuation.ts';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import {
  cleanupContinuationFixtures,
  continuationFixture,
  continuationRequestFor,
  fixtureWorkspace,
  requestFixture,
  runtimeConfig,
  runtimeRoot,
  sourceScope,
  trackContinuationFixtureRoot,
  lifecycleFor,
} from './helpers/delivered-work-continuation-fixture.mjs';
import {
  projectConfiguredFrontierContinuationAction,
  projectHistoricalTerminalReviewAction,
  validateClosedConfigTransitionProof,
  validateCurrentSourceScopeBridge,
  validateDeliveredWorkContinuationAction,
  validateDeliveredWorkContinuationAuthorization,
  validateDeliveredWorkContinuationRequest,
} from '../src/orchestration/delivered-work-continuation.ts';
import { applyDeliveredWorkContinuationPlan } from '../bin/runtime-code-rebind.mjs';
import {
  assertApplicableRepairBranch,
  validateConfiguredFrontierRepairReceipt,
  runDeliveredWorkContinuationRepair,
} from '../bin/repair-delivered-work-continuation.mjs';
import * as continuationRepair from '../bin/repair-delivered-work-continuation.mjs';

afterEach(() => cleanupContinuationFixtures());
function prewriterProjectionFixture(config = runtimeConfig, repositoryRoot = runtimeRoot, workspaceId = fixtureWorkspace) {
  const source = requestFixture().currentSourceScope;
  const context = { work_id: 'work-1', attempt: 1, scope_digest: source.digest };
  const selection = { team: 'default-development', kind: 'task', intent: 'task_execution', project: 'agent', risk_flags: ['high'], labels: [] };
  const workflowId = 'task_execution';
  const plan = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags);
  const waveIndex = plan.waves.findIndex(wave => wave.some(stage => stage.id === 'review_source_prewrite'));
  const developerIndex = plan.waves.findIndex(wave => wave.some(stage => stage.kind === 'develop'));
  const makeRequest = (index, action) => buildSessionBridgeRequest({
    runId: 'same-original-run', workflowId, configDigest: runtimeConfigDigest(config), context,
    waveIndex: index, action, configuredContext: null, priorResults: [],
  });
  const developer = makeRequest(developerIndex, sessionActionsForWave(config, selection, context, workflowId, developerIndex, [])[0]);
  const oldRequest = { ...developer, wave_index: waveIndex, config_digest: '5'.repeat(64) };
  const completed = plan.waves.slice(0, waveIndex).map((_, index) => ({
    step_id: 'wave-' + index,
    items: sessionActionsForWave(config, selection, context, workflowId, index, []).map(action => {
      const request = { ...makeRequest(index, action), config_digest: oldRequest.config_digest };
      const summary = 'Original completed synthesis';
      const observation = {
        schema: 'VidaSessionObservation/v1', action_id: request.action_id,
        issue_id: '71e62a38-b44b-470e-b732-81cefbaf983a', agent_id: 'original-synth',
        tool_call_ref: 'original-call', status: 'reported_complete', summary,
        output_digest: canonicalJsonDigest(summary), evidence_refs: [],
      };
      return { request, issue_id: observation.issue_id, observation };
    }),
  }));
  const engine = { run_id: oldRequest.run_id, status: 'suspended', step_id: 'wave-' + waveIndex, requests: [oldRequest], observations: completed.flatMap(wave => wave.items.map(item => item.observation)) };
  const journal = { schema: 'MastraSessionLedger/v1', workspace_id: workspaceId, work_id: context.work_id, attempt: 1, run_id: engine.run_id, source_scope: source, step_id: engine.step_id, completed, items: [{ request: oldRequest, issue_id: null, observation: null }] };
  const binding = { repositoryRoot, config, selection, context, workflowId, engine, journal, currentSourceScope: source };
  return { binding, engine, journal, source, context, waveIndex, developerIndex, oldRequest };
}
test('current prewriter projection preserves the unissued developer and offers every configured reviewer', () => {
  const { binding, engine, journal, source, context, waveIndex, developerIndex, oldRequest } = prewriterProjectionFixture();
  const before = structuredClone({ engine, journal });
  const requests = continuationProjection.projectConfiguredPrewriterContinuationRequests(binding);
  expect(requests.map(request => request.role).sort()).toEqual(['security-prewriter', 'source-planner']);
  expect(requests.every(request => request.run_id === engine.run_id && request.wave_index === waveIndex && request.stage_id === 'review_source_prewrite' && request.config_digest === runtimeConfigDigest(runtimeConfig))).toBe(true);
  expect(new Set(requests.map(request => request.action_id)).size).toBe(2);
  expect({ engine, journal }).toEqual(before);
  const changedScope = sourceScope(source.entries.map(entry => ({ ...entry, bytes: entry.bytes + 1, sha256: '7'.repeat(64) })));
  const changedBinding = { ...binding, currentSourceScope: changedScope, context: { ...context, scope_digest: changedScope.digest } };
  const changedRequests = continuationProjection.projectConfiguredPrewriterContinuationRequests(changedBinding);
  expect(changedRequests.every(request => request.scope_digest === changedScope.digest)).toBe(true);
  expect(projectConfiguredFrontierContinuationAction({ engine, journal, targetConfigDigest: runtimeConfigDigest(runtimeConfig), currentSourceScope: changedScope })).toMatchObject({ source_scope_digest: changedScope.digest, request: oldRequest });
  expect({ engine, journal }).toEqual(before);
  for (const changed of [
    { ...binding, journal: { ...journal, items: [{ ...journal.items[0], issue_id: 'already-issued' }] } },
    { ...binding, engine: { ...engine, observations: [] } },
    { ...binding, context: { ...context, work_id: 'another-work' } },
    { ...binding, engine: { ...engine, step_id: 'wave-' + developerIndex }, journal: { ...journal, step_id: 'wave-' + developerIndex } },
    { ...binding, journal: { ...journal, research_wave_exposure: 'possible' } },
  ]) expect(() => continuationProjection.projectConfiguredPrewriterContinuationRequests(changed)).toThrow();
});
test('a configured frontier is offered only when its exact persisted request is wholly unissued', () => {
  const request = requestFixture().action.request,
    engine = {
      run_id: 'run-1',
      status: 'suspended',
      step_id: 'validate_parallel',
      requests: [request],
      observations: [],
    },
    journal = {
      run_id: 'run-1',
      step_id: 'validate_parallel',
      items: [{ request, issue_id: null, observation: null }],
    },
    currentSourceScope = requestFixture().currentSourceScope;

  expect(
    projectConfiguredFrontierContinuationAction({
      engine,
      journal,
      targetConfigDigest: '6'.repeat(64),
      currentSourceScope,
    }),
  ).toMatchObject({ kind: 'configured_frontier', request });

  for (const changed of [
    { ...journal.items[0], issue_id: 'issued-once' },
    { ...journal.items[0], observation: { status: 'reported_failed' } },
    { ...journal.items[0], host_reservation: { issued: true } },
    { ...journal.items[0], research_activation: { issued: true } },
  ]) {
    expect(() =>
      projectConfiguredFrontierContinuationAction({
        engine,
        journal: { ...journal, items: [changed] },
        targetConfigDigest: '6'.repeat(64),
        currentSourceScope,
      }),
    ).toThrow();
  }

  expect(() =>
    projectConfiguredFrontierContinuationAction({
      engine,
      journal: { ...journal, items: [journal.items[0], journal.items[0]] },
      targetConfigDigest: '6'.repeat(64),
      currentSourceScope,
    }),
  ).toThrow(/one exact unissued journal action/);
});

test('an authorized Source bridge preserves the original path set and rejects any unmatched drift', () => {
  const original = sourceScope([
      { path: 'packages/agent/src/work.ts', exists: true, bytes: 4, sha256: '1'.repeat(64) },
      { path: 'packages/agent/tests/work.test.mjs', exists: true, bytes: 3, sha256: '2'.repeat(64) },
    ]),
    current = sourceScope([
      { path: 'packages/agent/src/work.ts', exists: true, bytes: 5, sha256: '3'.repeat(64) },
      { path: 'packages/agent/tests/work.test.mjs', exists: true, bytes: 3, sha256: '2'.repeat(64) },
    ]),
    authorizedChanges = [
      {
        path: 'packages/agent/src/work.ts',
        kind: 'changed',
        before: original.entries[0],
        after: current.entries[0],
      },
    ];

  expect(validateCurrentSourceScopeBridge({ original, current, authorizedChanges })).toEqual(current);
  expect(() => validateCurrentSourceScopeBridge({ original, current, authorizedChanges: [
    ...authorizedChanges,
    { path: original.entries[1].path, kind: 'changed', before: original.entries[1], after: { ...original.entries[1], bytes: 4, sha256: '8'.repeat(64) } },
  ] })).toThrow();
  expect(() =>
    validateCurrentSourceScopeBridge({ original, current, authorizedChanges: [] }),
  ).toThrow(/outside the accepted beforeimage bridge/);
  expect(() =>
    validateCurrentSourceScopeBridge({
      original,
      current: sourceScope([
        { path: 'packages/agent/src/work.ts', exists: true, bytes: 5, sha256: '3'.repeat(64) },
        { path: 'packages/agent/tests/work.test.mjs', exists: true, bytes: 4, sha256: '4'.repeat(64) },
      ]),
      authorizedChanges,
    }),
  ).toThrow(/outside the accepted beforeimage bridge/);
  expect(() =>
    validateCurrentSourceScopeBridge({
      original,
      current: sourceScope([{ path: 'packages/agent/src/work.ts', exists: true, bytes: 5, sha256: '3'.repeat(64) }]),
      authorizedChanges,
    }),
  ).toThrow(/different scope/);
});

test('closed transition and continuation request bind the original configuration, current scope, and one real next action', () => {
  const request = requestFixture(),
    validated = validateDeliveredWorkContinuationRequest(request);
  expect(validateClosedConfigTransitionProof(request.sourceTransition).baseline_config_digest).toBe(
    request.priorConfigDigest,
  );
  expect(validated.action).toEqual(request.action);

  const authorization = {
    schema: 'VidaDeliveredWorkContinuationAuthorization/v1',
    request_digest: canonicalJsonDigest(validated),
    principal: 'vida-agent-delivered-work-continuation',
    transition_digest: validated.sourceTransition.transition_digest,
    action_digest: canonicalJsonDigest(validated.action),
  };
  expect(
    validateDeliveredWorkContinuationAuthorization(
      authorization,
      validated,
      'vida-agent-delivered-work-continuation',
    ),
  ).toEqual(authorization);

  const wrongBaseline = structuredClone(request);
  wrongBaseline.sourceTransition.baseline_config_digest = 'e'.repeat(64);
  expect(() => validateDeliveredWorkContinuationRequest(wrongBaseline)).toThrow();

  const wrongSource = structuredClone(request);
  wrongSource.action.source_scope_digest = 'f'.repeat(64);
  expect(() => validateDeliveredWorkContinuationRequest(wrongSource)).toThrow();

  const historical = projectHistoricalTerminalReviewAction({
    workflowId: 'implementation_change',
    sourceScopeDigest: request.currentSourceScope.digest,
    targetConfigDigest: request.targetConfigDigest,
    capture: {
      action_id: '1'.repeat(64),
      issue_id: 'original-terminal-issue',
      receipt_digest: '2'.repeat(64),
      body_sha256: '3'.repeat(64),
      body_ref: '.tmp/captured-body.json',
    },
    originalRequestPointer: request.originalRequestPointer,
    request: {
      ...request.action.request,
      action_id: '4'.repeat(64),
      assignment_index: 0,
      role: 'correctness-validator',
      config_digest: request.targetConfigDigest,
      bindings_manifest_ref: '5'.repeat(64),
    },
  });
  expect(historical.kind).toBe('historical_terminal_review');
  expect(historical.request.stage_id).toBe('validate_parallel');
  expect(historical.request.role).toBe('correctness-validator');

  const pointerMismatch = {
    ...request,
    action: historical,
    originalRequestPointer: 'WORK.md#different-request',
  };
  expect(() => validateDeliveredWorkContinuationRequest(pointerMismatch)).toThrow(/action binding is invalid/);
});

test('public runtime-code entry requires and accepts the finite delivered-config continuation basis', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-delivered-continuation-cli-'));
  trackContinuationFixtureRoot(root);
  const args = [
    '--kind', 'runtime-code',
    '--mode', 'plan',
    '--project-root', root,
    '--repair-id', 'continuation-plan-20261007',
    '--actor', 'test-owner',
    '--timestamp', '2026-10-07T00:00:00.000Z',
    '--projects', 'agent',
    '--work-id', 'audit-36-core-20261001',
    '--attempt', '1',
    '--action-id', '4'.repeat(64),
    '--issue-id', 'original-terminal-issue',
    '--native-handle', 'original-thread',
    '--forward-operation-id', 'forward-20261007',
    '--owner-no-call-ref', 'WORK.md#accepted-request',
    '--basis', 'delivered-config-continuation',
  ];

  await expect(runRuntimeCodeRebind(args)).rejects.toThrow(/missing or unexpected arguments/);
  const completeArgs = [...args, '--source-transition-id', 'p0-delivered-config-local-20261006'];
  let message = '';
  try {
    await runRuntimeCodeRebind(completeArgs);
  } catch (error) {
    message = error.message;
  }
  expect(message.length).toBeGreaterThan(0);
  expect(message).not.toMatch(/missing or unexpected arguments/);
});

test('Host atomically bridges the original capture to one current Core review under the same owner and attempt', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      beforeJournal = JSON.parse(
        f.db
          .query('SELECT payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
          .get(fixtureWorkspace, f.identity.work_id, 1).payload,
      ),
      planBody = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-plan-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      },
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) },
      result = await applyDeliveredWorkContinuationPlan({
        database: f.db,
        root: f.root,
        workspaceId: fixtureWorkspace,
        plan,
        rebuildPlan: async () => plan,
      }),
      after = result.snapshot,
      afterJournal = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1),
      nextJournal = JSON.parse(afterJournal.payload);

    expect(result.status).toBe('continued');
    expect(result.action).toEqual(request.action);
    expect(after.work.binding).toMatchObject({
      config_digest: request.targetConfigDigest,
      work_source_revision: request.currentSourceScope.digest,
      runtime_source_revision: request.targetRuntimeCodeDigest,
      runtime_code_digest: request.targetRuntimeCodeDigest,
      schema_digest: request.targetSchemaDigest,
    });
    expect(after.work.binding.lifecycle_work_id).toBe(f.identity.work_id);
    expect(after.work.execution.run_id).toBe('run-fixture');
    expect(after.work.execution.status).toBe('active');
    expect(after.work.lease.thread_id).toBe('fixture-thread');
    expect(after.work.lifecycle.phase).toBe('INTAKE');
    expect(after.work.lifecycle.next_action).toContain('body remains unaccepted');
    expect(result.receipt.rights_granted).toBe(false);
    expect(result.receipt.accepted_result).toBe(false);
    expect(result.receipt.runtime_acceptance).toBe(false);
    expect(result.receipt.prior_work.binding.config_digest).toBe(request.priorConfigDigest);
    expect(result.receipt.prior_work.binding.work_source_revision).toBe(f.originalSource.digest);
    expect(result.receipt.prior_journal).toEqual(beforeJournal);
    expect(result.receipt.historical_capture).toEqual(f.capture);
    expect(nextJournal.source_scope).toEqual(request.currentSourceScope);
    expect(nextJournal.completed).toEqual([{ step_id: beforeJournal.step_id, items: beforeJournal.items }]);
    expect(nextJournal.items).toEqual([{ request: request.action.request, issue_id: null, observation: null }]);
    expect(afterJournal.revision).toBe(request.expectedJournal.revision + 1);
    expect(afterJournal.digest).toBe(canonicalJsonDigest(nextJournal));
    expect(after.ledger.tickets.at(-1).exclusive_resources).toEqual(['execution:' + f.identity.work_id]);
    expect(after.ledger.tickets.at(-1).source_revision).toBe(request.currentSourceScope.digest);

    const lookup = f.store.readDeliveredWorkContinuation(f.identity, 1);
    expect(lookup.action_status).toBe('unissued');
    expect(lookup.receipt).toEqual(result.receipt);
    expect(lookup.snapshot.work.binding).toEqual(result.receipt.successor_binding);
    expect(lookup.journal.version).toEqual({ revision: afterJournal.revision, digest: afterJournal.digest });
    expect(lookup.item).toEqual(nextJournal.items[0]);

    const replay = await applyDeliveredWorkContinuationPlan({
      database: f.db,
      root: f.root,
      workspaceId: fixtureWorkspace,
      plan,
      rebuildPlan: async () => plan,
    });
    expect(replay.status).toBe('already_continued');
    expect(replay.action).toBeNull();
    expect(replay.snapshot).toEqual(after);
  } finally {}
});

test('the current read-only review issue and report are recoverable without reissue or engine resume', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      planBody = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-plan-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      },
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    await applyDeliveredWorkContinuationPlan({
      database: f.db,
      root: f.root,
      workspaceId: fixtureWorkspace,
      plan,
      rebuildPlan: async () => plan,
    });
    const ledger = new MastraSessionLedger(f.db, fixtureWorkspace, runtimeConfig, runtimeRoot, f.store),
      beforeIssue = ledger.resume(f.identity.work_id, 1),
      issued = ledger.issueWave(f.identity.work_id, 1, beforeIssue.version),
      issuedItem = issued.state.items[0],
      firstLookup = f.store.readDeliveredWorkContinuation(f.identity, 1),
      retryLookup = f.store.readDeliveredWorkContinuation(f.identity, 1);
    expect(issuedItem.request).toEqual(request.action.request);
    expect(firstLookup.action_status).toBe('issued');
    expect(firstLookup.item.issue_id).toBe(issuedItem.issue_id);
    expect(retryLookup.item.issue_id).toBe(issuedItem.issue_id);
    expect(retryLookup.journal.version).toEqual(issued.version);
    expect(retryLookup.receipt.accepted_result).toBe(false);

    const summary = 'Current read-only review completed; captured synthesis remains unaccepted.',
      observation = {
        schema: 'VidaSessionObservation/v1',
        action_id: request.action.request.action_id,
        issue_id: issuedItem.issue_id,
        agent_id: 'fixture:correctness-validator',
        tool_call_ref: 'fixture:review-call',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:review-evidence'],
      },
      reported = ledger.report(
        f.identity.work_id,
        1,
        issued.version,
        observation,
        request.currentSourceScope,
      ),
      retryReport = ledger.report(
        f.identity.work_id,
        1,
        issued.version,
        observation,
        request.currentSourceScope,
      ),
      reportedLookup = f.store.readDeliveredWorkContinuation(f.identity, 1);
    expect(reported.state.items[0].observation).toEqual(observation);
    expect(retryReport.version).toEqual(reported.version);
    expect(reportedLookup.action_status).toBe('reported');
    expect(reportedLookup.item.observation).toEqual(observation);
    expect(reportedLookup.receipt.runtime_acceptance).toBe(false);
    expect(reportedLookup.receipt.accepted_result).toBe(false);
    expect(() => ledger.report(f.identity.work_id, 1, issued.version, { ...observation, summary: 'different' }, request.currentSourceScope)).toThrow(
      /retry differs/,
    );
  } finally {}
});

test('public runtime-code apply denies a changed rebuild before any Host or Journal write', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      stateBefore = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1),
      planBody = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-plan-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      },
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    await expect(
      applyDeliveredWorkContinuationPlan({
        database: f.db,
        root: f.root,
        workspaceId: fixtureWorkspace,
        plan,
        rebuildPlan: async () => ({ ...plan, digest: 'f'.repeat(64) }),
      }),
    ).rejects.toThrow(/plan, owner CAS or current Source proof changed/);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(stateBefore);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {}
});

test('Host denies a current CAS conflict without changing the newer Host or Journal state', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      before = f.store.readHostStateSnapshot(f.identity),
      nextWork = {
        ...before.work,
        revision: before.work.revision + 1,
        lifecycle: { ...before.work.lifecycle, revision: before.work.revision + 1 },
      },
      nextLedger = { ...before.ledger, revision: before.ledger.revision + 1 };
    f.store.compareAndSwapHostState({
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      nextWork,
      nextLedger,
    });
    const afterConcurrentWrite = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1);
    await expect(f.store.continueDeliveredWork(request)).rejects.toThrow();
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(afterConcurrentWrite);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {}
});

test('Host denies a fresh overlapping FIFO owner before any continuation write', async () => {
  const f = await continuationFixture({ queued: true });
  try {
    const request = continuationRequestFor(f),
      before = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1);
    await expect(f.store.continueDeliveredWork(request)).rejects.toThrow(/FIFO/);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {}
});

test('stale continuation digest repair fences producers and changes only the row binding', async () => {
  const f = await continuationFixture();
  try {
    const request = continuationRequestFor(f),
      body = {
        schema: 'VidaDeliveredWorkContinuationPlan/v1',
        repair_id: 'continuation-integrity-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        source_transition_id: request.sourceTransition.operation_id,
        runtime_code_paths: ['packages/agent/src/runtime-kernel.ts'],
        request,
      },
      continuation = await applyDeliveredWorkContinuationPlan({
        database: f.db,
        root: f.root,
        workspaceId: f.workspaceId,
        plan: { ...body, digest: canonicalJsonDigest(body) },
        rebuildPlan: async () => ({ ...body, digest: canonicalJsonDigest(body) }),
      }),
      before = continuation.snapshot,
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(f.workspaceId, f.identity.work_id, 1),
      rowBefore = f.db
        .query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?')
        .get(f.workspaceId, f.identity.work_id, 1, request.action.capture.action_id);
    expect(continuation.status).toBe('continued');
    f.db
      .query('UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?')
      .run('0'.repeat(64), f.workspaceId, f.identity.work_id, 1, request.action.capture.action_id);
    const inspection = f.store.inspectDeliveredWorkContinuationRepair(
        f.identity,
        1,
        request.action.capture.action_id,
      ),
      planBody = {
        schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1',
        branch: 'historical_terminal_review',
        repair_id: 'continuation-integrity-20261007',
        actor: 'fixture-owner',
        timestamp: '2026-10-07T00:00:00.000Z',
        inspection,
      },
      plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    f.store.reserveDeliveredWorkContinuationRepair(plan);
    expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow(/repair is pending or unknown/);
    expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(/repair is pending or unknown/);
    f.db.exec(`CREATE TRIGGER interrupt_continuation_repair
      BEFORE UPDATE OF digest ON agent_host_delivered_work_continuation
      BEGIN SELECT RAISE(ABORT, 'continuation repair interrupted'); END`);
    expect(() => f.store.applyDeliveredWorkContinuationRepair(plan)).toThrow(/repair interrupted/);
    expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(/repair is pending or unknown/);
    expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow(/repair is pending or unknown/);
    const interruptedRow = f.db
      .query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?')
      .get(f.workspaceId, f.identity.work_id, 1, request.action.capture.action_id);
    expect(interruptedRow.payload).toBe(rowBefore.payload);
    expect(interruptedRow.digest).toBe('0'.repeat(64));
    f.db.exec('DROP TRIGGER interrupt_continuation_repair');
    expect(f.store.applyDeliveredWorkContinuationRepair(plan).status).toBe('applied');
    const repaired = f.store.readHostStateSnapshot(f.identity),
      rowAfter = f.db
        .query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?')
        .get(f.workspaceId, f.identity.work_id, 1, request.action.capture.action_id),
      journalAfter = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(f.workspaceId, f.identity.work_id, 1);
    expect(rowAfter.payload).toBe(rowBefore.payload);
    expect(rowAfter.digest).toBe(canonicalJsonDigest(JSON.parse(rowBefore.payload)));
    expect(repaired).toEqual(before);
    expect(journalAfter).toEqual(journalBefore);
    expect(f.store.readDeliveredWorkContinuation(f.identity, 1).action_status).toBe('unissued');
    expect(f.store.applyDeliveredWorkContinuationRepair(plan)).toEqual({
      status: 'already_applied',
      digest: rowAfter.digest,
    });
    f.db
      .query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1 WHERE workspace_id=? AND work_id=? AND attempt=?')
      .run(f.workspaceId, f.identity.work_id, 1);
    expect(() => f.store.applyDeliveredWorkContinuationRepair(plan)).toThrow(/afterimage differs/);
  } finally {}
});

function configuredFrontierRepairFixture(prewriter = false, changedSource = false, runtime = { config: runtimeConfig, root: runtimeRoot, workspaceId: fixtureWorkspace }) {
  const projection = prewriter ? prewriterProjectionFixture(runtime.config, runtime.root, runtime.workspaceId) : null;
  const requestBase = requestFixture(prewriter ? { targetConfigDigest: runtimeConfigDigest(runtime.config), workspaceId: runtime.workspaceId } : {});
  if (prewriter) requestBase.identity.integrations_digest = loadProjectSetContext(runtime.root, runtime.config, 'vida-agent', ['agent']).integrations_digest;
  const
    source = requestBase.currentSourceScope,
    targetScope = changedSource ? sourceScope(source.entries.map(entry => ({ ...entry, bytes: entry.bytes + 1, sha256: '7'.repeat(64) }))) : source;
  if (projection) projection.binding = { ...projection.binding, currentSourceScope: targetScope, context: { ...projection.binding.context, scope_digest: targetScope.digest } };
  const
    priorJournal = projection?.journal ?? {
      schema: 'MastraSessionLedger/v1',
      workspace_id: runtime.workspaceId,
      work_id: requestBase.identity.work_id,
      attempt: requestBase.attempt,
      run_id: requestBase.action.run_id,
      source_scope: source,
      step_id: requestBase.action.step_id,
      items: [{ request: requestBase.action.request, issue_id: null, observation: null }],
      completed: [],
    },
    engine = projection?.engine ?? {
      run_id: requestBase.action.run_id,
      status: 'suspended',
      step_id: requestBase.action.step_id,
      requests: [requestBase.action.request],
      observations: [],
    },
    action = projectConfiguredFrontierContinuationAction({
      engine,
      journal: priorJournal,
      targetConfigDigest: requestBase.targetConfigDigest,
      currentSourceScope: targetScope,
    }),
    priorBinding = {
      repository_id: requestBase.identity.repository_id, project_ids: requestBase.identity.project_ids,
      integrations_digest: requestBase.identity.integrations_digest, team_id: 'default-development',
      workflow_id: action.workflow_id, provider_work_item_id: requestBase.identity.work_id,
      lifecycle_work_id: requestBase.identity.work_id, work_item_digest: 'c'.repeat(64),
      scope_id: 'scope-fixture', scope_contract_digest: 'e'.repeat(64), acceptance_manifest_digest: 'f'.repeat(64),
      ac_ids: ['AC-1'], implementation_paths: source.entries.map(entry => entry.path), allowed_resources: ['execution:' + requestBase.identity.work_id, ...source.entries.map(entry => 'file:' + entry.path)],
      config_digest: requestBase.priorConfigDigest, runtime_code_digest: requestBase.priorRuntimeCodeDigest,
      runtime_source_revision: requestBase.priorRuntimeCodeDigest, schema_digest: '3'.repeat(64),
      work_source_revision: source.digest,
    },
    priorWork = {
      schema: 'WorkState/v1', workspace_id: runtime.workspaceId, revision: 10,
      binding: priorBinding,
      contracts: { scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: priorBinding.scope_contract_digest }, acceptance: { schema: 'AcceptanceManifest/v1', path: '.agent/acceptance.json', sha256: priorBinding.acceptance_manifest_digest }, decisions: [] },
      lease: null,
      execution: { run_id: action.run_id, input_digest: '5'.repeat(64), status: 'suspended', phase: 'awaiting_followup', assignment_attempts: [] },
      lifecycle: { ...lifecycleFor(priorBinding, 10), scope: { scope_id: priorBinding.scope_id,
        allowed_paths: source.entries.map(entry => entry.path), fingerprint_paths: source.entries.map(entry => entry.path),
        implementation_paths: source.entries.map(entry => entry.path), documentation_paths: [] } },
      artifacts: [],
    },
    resource = 'execution:' + requestBase.identity.work_id,
    priorTicket = {
      schema: 'CoordinationTicket/v1', ticket_id: 'prior-ticket', repository_id: requestBase.identity.repository_id,
      project_ids: requestBase.identity.project_ids, integrations_digest: requestBase.identity.integrations_digest,
      work_id: requestBase.identity.work_id, thread_id: requestBase.nativeSessionHandle, source_revision: source.digest,
      generation: 1, sequence: 1, contour_keys: [], exclusive_resources: [resource], status: 'released',
      claim_ids: ['prior-claim'], expires_at: null, active_resources: [], blocked_resources: [],
      created_at: '2026-10-07T00:00:00.000Z',
    },
    priorClaim = {
      schema: 'WorkstreamClaim/v1', claim_id: 'prior-claim', ticket_id: 'prior-ticket',
      work_id: requestBase.identity.work_id, thread_id: requestBase.nativeSessionHandle, generation: 1,
      resources: [resource], lease_expires_at: '2026-10-07T00:00:00.000Z', status: 'released',
      created_at: '2026-10-07T00:00:00.000Z', renewed_at: '2026-10-07T00:00:00.000Z',
    },
    priorRelease = {
      schema: 'CoordinationOperation/v1', operation_id: 'prior-release', kind: 'release',
      ticket_id: 'prior-ticket', work_id: requestBase.identity.work_id,
      thread_id: requestBase.nativeSessionHandle, source_revision: source.digest, resources: [resource],
      from_ledger_revision: 94, to_ledger_revision: 95, decided_by: 'fixture-owner',
      decision_pointer: requestBase.originalRequestPointer, created_at: '2026-10-07T00:00:00.000Z',
    },
    priorLedger = {
      schema: 'CoordinationLedger/v1', workspace_id: runtime.workspaceId, revision: 95,
      open_generation: 1, next_sequence: 2, tickets: [priorTicket], claims: [priorClaim],
      notices: [], dispositions: [], contours: [], batches: [], rebinds: [],
      operations: [priorRelease], retirements: [],
    },
    priorWorkVersion = { revision: priorWork.revision, digest: canonicalJsonDigest(priorWork) },
    priorLedgerVersion = { revision: priorLedger.revision, digest: canonicalJsonDigest(priorLedger) },
    priorJournalVersion = { revision: 11, digest: canonicalJsonDigest(priorJournal) },
    request = {
      ...requestBase,
      expectedWork: priorWorkVersion,
      expectedLedger: priorLedgerVersion,
      expectedJournal: priorJournalVersion,
      currentSourceScope: targetScope,
      authorizedSourceChanges: compareScopedSourceSnapshots(source, targetScope),
      action,
    },
    successorWork = {
      ...priorWork,
      revision: 11,
      binding: { ...priorWork.binding, config_digest: request.targetConfigDigest, runtime_code_digest: request.targetRuntimeCodeDigest, runtime_source_revision: request.targetRuntimeCodeDigest, schema_digest: request.targetSchemaDigest, work_source_revision: targetScope.digest },
      lease: { ticket_id: 'repair-ticket', thread_id: request.nativeSessionHandle, generation: 1 },
      execution: { ...priorWork.execution, status: 'active', phase: 'review', assignment_attempts: [] },
    },
    successorJournal = prewriter ? {
      ...priorJournal,
      source_scope: targetScope,
      items: continuationProjection.projectConfiguredPrewriterContinuationRequests(projection.binding)
        .map(request => ({ request, issue_id: null, observation: null })),
    } : priorJournal,
    expiresAt = new Date(Date.now() + 60_000).toISOString(),
    successorLedger = {
      ...priorLedger,
      revision: 96,
      next_sequence: 3,
      tickets: [priorTicket, {
        ...priorTicket, ticket_id: 'repair-ticket', sequence: 2, status: 'active',
        source_revision: targetScope.digest,
        claim_ids: ['repair-claim'], expires_at: expiresAt, active_resources: [resource],
        created_at: '2026-10-07T00:00:01.000Z',
      }],
      claims: [priorClaim, {
        ...priorClaim, claim_id: 'repair-claim', ticket_id: 'repair-ticket', status: 'active',
        lease_expires_at: expiresAt, created_at: '2026-10-07T00:00:01.000Z', renewed_at: '2026-10-07T00:00:01.000Z',
      }],
    },
    snapshotBytes = Buffer.from(canonicalJson(engine));
  successorWork.lifecycle = { ...priorWork.lifecycle, revision: 11, source_revision: targetScope.digest,
    config_binding: { config_digest: successorWork.binding.config_digest, schema_digest: successorWork.binding.schema_digest, runtime_code_digest: successorWork.binding.runtime_code_digest } };
  const
    workVersion = { revision: successorWork.revision, digest: canonicalJsonDigest(successorWork) },
    ledgerVersion = { revision: successorLedger.revision, digest: canonicalJsonDigest(successorLedger) },
    journalVersion = { revision: priorJournalVersion.revision + 1, digest: canonicalJsonDigest(successorJournal) },
    requestDigest = canonicalJsonDigest(request),
    receipt = {
      schema: 'DeliveredWorkContinuationReceipt/v1',
      continuation_id: canonicalJsonDigest({
        identity: request.identity, attempt: request.attempt, action_id: action.request.action_id,
        transition_digest: request.sourceTransition.transition_digest,
      }),
      attempt: request.attempt, request_digest: requestDigest,
      authorization: {
        schema: 'VidaDeliveredWorkContinuationAuthorization/v1', request_digest: requestDigest,
        principal: 'fixture-owner', transition_digest: request.sourceTransition.transition_digest,
        action_digest: canonicalJsonDigest(action),
      },
      request, prior_work: priorWork, prior_ledger: priorLedger, prior_journal: priorJournal,
      prior_work_version: priorWorkVersion, prior_ledger_version: priorLedgerVersion, prior_journal_version: priorJournalVersion,
      historical_capture: null,
      frontier_snapshot: {
        snapshot_bytes_base64: snapshotBytes.toString('base64'),
        snapshot_sha256: createHash('sha256').update(snapshotBytes).digest('hex'),
      },
      successor_work: successorWork, successor_ledger: successorLedger, successor_binding: successorWork.binding,
      successor_journal: successorJournal, work_version: workVersion, ledger_version: ledgerVersion, journal_version: journalVersion,
      rights_granted: false, accepted_result: false, runtime_acceptance: false, status: 'action_ready',
    },
    current = {
      work: successorWork, work_version: workVersion, ledger: successorLedger, ledger_version: ledgerVersion,
      journal: successorJournal, journal_version: journalVersion,
    };
  return { receipt, current, ...(projection ? { prewriterBinding: projection.binding } : {}) };
}
test('configured-frontier snapshot validation rejects changed bytes and unsupported repair branches', () => {
  const input = configuredFrontierRepairFixture(true);
  const { receipt } = input;
  expect(validateConfiguredFrontierRepairReceipt(input).branch).toBe('configured_frontier');
  expect(() => assertApplicableRepairBranch('configured_frontier')).not.toThrow();
  expect(() => assertApplicableRepairBranch('unvalidated-frontier')).toThrow(/unsupported/);
  const altered = structuredClone(receipt);
  altered.frontier_snapshot.snapshot_bytes_base64 = Buffer.from('changed').toString('base64');
  expect(() => validateConfiguredFrontierRepairReceipt({ ...input, receipt: altered })).toThrow();
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(configuredFrontierRepairFixture())).toThrow();
});

test('future repair validates the full current prewriter wave and rejects omitted security or old developer requests', () => {
  const input = configuredFrontierRepairFixture(true);
  expect(validateConfiguredFrontierRepairReceipt(input).branch).toBe('configured_frontier');
  expect(input.receipt.successor_journal.items).toHaveLength(2);
  expect(input.receipt.successor_journal.completed).toEqual(input.receipt.prior_journal.completed);
  const replaceJournal = journal => {
    const receipt = { ...input.receipt, successor_journal: journal, journal_version: { ...input.receipt.journal_version, digest: canonicalJsonDigest(journal) } };
    return { ...input, receipt, current: { ...input.current, journal, journal_version: receipt.journal_version } };
  };
  const original = input.receipt.successor_journal;
  for (const items of [
    original.items.filter(item => item.request.role !== 'security-prewriter'),
    [{ ...original.items[0], request: input.receipt.request.action.request }, original.items[1]],
    [original.items[0], original.items[0]],
    [original.items[0], { ...original.items[1], issue_id: 'already-issued' }],
  ]) expect(() => validateConfiguredFrontierRepairReceipt(replaceJournal({ ...original, items }))).toThrow();
  expect(() => validateConfiguredFrontierRepairReceipt({ ...input, prewriterBinding: { ...input.prewriterBinding, workflowId: 'bug_fix' } })).toThrow();
  const missingSecurity = replaceJournal({ ...original, items: original.items.filter(item => item.request.role !== 'security-prewriter') });
  expect(() => validateConfiguredFrontierRepairReceipt({
    ...missingSecurity,
    prewriterBinding: { ...input.prewriterBinding, selection: { ...input.prewriterBinding.selection, risk_flags: [] }, lifecycleRisk: 'low' },
  })).toThrow();
  const changedSource = configuredFrontierRepairFixture(true, true);
  expect(validateConfiguredFrontierRepairReceipt(changedSource).branch).toBe('configured_frontier');
  expect(changedSource.receipt.request.action.request.scope_digest).not.toBe(changedSource.receipt.request.action.source_scope_digest);
  expect(() => validateConfiguredFrontierRepairReceipt({
    ...changedSource,
    receipt: { ...changedSource.receipt, request: { ...changedSource.receipt.request, authorizedSourceChanges: [] } },
  })).toThrow();
});

test('frontier receipt history survives lease expiry while live repair still rejects expired or advanced dependencies', () => {
  const input = configuredFrontierRepairFixture(true);
  const ledger = {
    ...input.receipt.successor_ledger,
    tickets: input.receipt.successor_ledger.tickets.map(ticket => ticket.status === 'active' ? { ...ticket, expires_at: '2020-01-01T00:00:00.000Z' } : ticket),
    claims: input.receipt.successor_ledger.claims.map(claim => claim.status === 'active' ? { ...claim, lease_expires_at: '2020-01-01T00:00:00.000Z' } : claim),
  };
  const receipt = { ...input.receipt, successor_ledger: ledger, ledger_version: { ...input.receipt.ledger_version, digest: canonicalJsonDigest(ledger) } };
  const current = { ...input.current, ledger, ledger_version: receipt.ledger_version };
  const historical = { receipt, prewriterBinding: input.prewriterBinding };
  expect(continuationRepair.validateConfiguredFrontierReceiptStructure(historical).branch).toBe('configured_frontier');
  expect(() => validateConfiguredFrontierRepairReceipt({ ...historical, current })).toThrow(/expired/);
  const advanced = { ...input.current, work: { ...input.current.work, revision: input.current.work.revision + 1 } };
  expect(() => validateConfiguredFrontierRepairReceipt({ ...input, current: advanced })).toThrow(/dependency/);
  expect(continuationRepair.validateConfiguredFrontierReceiptStructure({ ...input, current: advanced }).branch).toBe('configured_frontier');
  expect(continuationRepair.validateConfiguredFrontierReceiptStructure({ receipt }).branch).toBe('configured_frontier');
  expect(() => validateConfiguredFrontierRepairReceipt({ receipt: input.receipt, current: input.current })).toThrow(/trusted current prewriter binding/);
});

test('frontier receipt rejects changes to successor run, risk, scope, contracts and retained artifacts', () => {
  const input = configuredFrontierRepairFixture(true);
  const work = input.receipt.successor_work;
  const changed = [
    { ...work, execution: { ...work.execution, run_id: 'replacement-run' } },
    { ...work, lifecycle: { ...work.lifecycle, risk: 'low' } },
    { ...work, lifecycle: { ...work.lifecycle, scope: { ...work.lifecycle.scope, allowed_paths: [...work.lifecycle.scope.allowed_paths, 'extra.ts'] } } },
    { ...work, contracts: { ...work.contracts, scope: { ...work.contracts.scope, path: '.agent/another-scope.json' } } },
    { ...work, artifacts: [{ artifact_id: 'forged', path: 'extra.json', schema: 'WorkItem/v1', sha256: '7'.repeat(64), stage_id: 'intake', source_revision: work.binding.work_source_revision, scope_id: work.binding.scope_id, ac_ids: ['AC-1'] }] },
  ];
  for (const successor of changed) {
    const receipt = { ...input.receipt, successor_work: successor, successor_binding: successor.binding,
      work_version: { revision: successor.revision, digest: canonicalJsonDigest(successor) } };
    expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure({ receipt })).toThrow();
  }
});

test('frontier repair joins prior Work with the exact run and accepted scope and rejects a ledger revision jump', () => {
  const input = configuredFrontierRepairFixture(true);
  const rebind = (prior, successor, priorLedger = input.receipt.prior_ledger, successorLedger = input.receipt.successor_ledger) => {
    const priorVersion = { revision: prior.revision, digest: canonicalJsonDigest(prior) };
    const priorLedgerVersion = { revision: priorLedger.revision, digest: canonicalJsonDigest(priorLedger) };
    const request = { ...input.receipt.request, expectedWork: priorVersion, expectedLedger: priorLedgerVersion };
    return { receipt: { ...input.receipt, request, request_digest: canonicalJsonDigest(request),
      authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
      prior_work: prior, prior_work_version: priorVersion, prior_ledger: priorLedger, prior_ledger_version: priorLedgerVersion,
      successor_work: successor, successor_binding: successor.binding, work_version: { revision: successor.revision, digest: canonicalJsonDigest(successor) },
      successor_ledger: successorLedger, ledger_version: { revision: successorLedger.revision, digest: canonicalJsonDigest(successorLedger) },
    } };
  };
  const prior = input.receipt.prior_work, next = input.receipt.successor_work;
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(rebind(
    { ...prior, execution: { ...prior.execution, run_id: 'borrowed-run' } },
    { ...next, execution: { ...next.execution, run_id: 'borrowed-run' } },
  ))).toThrow();
  const scope = { ...prior.lifecycle.scope, allowed_paths: ['unrelated.ts'], fingerprint_paths: ['unrelated.ts'], implementation_paths: ['unrelated.ts'] };
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(rebind(
    { ...prior, lifecycle: { ...prior.lifecycle, scope } },
    { ...next, lifecycle: { ...next.lifecycle, scope } },
  ))).toThrow();
  const wrongSource = '7'.repeat(64);
  const wrongPriorLedger = { ...input.receipt.prior_ledger,
    tickets: input.receipt.prior_ledger.tickets.map(ticket => ({ ...ticket, source_revision: wrongSource })),
    operations: input.receipt.prior_ledger.operations.map(operation => ({ ...operation, source_revision: wrongSource })),
  };
  const wrongNextLedger = { ...input.receipt.successor_ledger,
    tickets: input.receipt.successor_ledger.tickets.map(ticket => ticket.status === 'released' ? { ...ticket, source_revision: wrongSource } : ticket),
    operations: wrongPriorLedger.operations,
  };
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(rebind(
    { ...prior, binding: { ...prior.binding, work_source_revision: wrongSource }, lifecycle: { ...prior.lifecycle, source_revision: wrongSource } },
    next, wrongPriorLedger, wrongNextLedger,
  ))).toThrow();
  const wrongRevision = { ...input.receipt.successor_ledger, revision: input.receipt.prior_ledger.revision + 2 };
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure(rebind(prior, next, input.receipt.prior_ledger, wrongRevision))).toThrow();
  const request = { ...input.receipt.request, expectedMaintenanceGeneration: input.receipt.request.sourceTransition.transition.fence.generation + 1 };
  const receipt = { ...input.receipt, request, request_digest: canonicalJsonDigest(request),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) } };
  expect(() => continuationRepair.validateConfiguredFrontierReceiptStructure({ receipt })).toThrow();
});

function seedFrontierHostFixture(f, input, staleDigest = false) {
  const { receipt } = input;
  for (const [kind, state, version] of [
    ['work', receipt.successor_work, receipt.work_version],
    ['ledger', receipt.successor_ledger, receipt.ledger_version],
  ]) f.db.query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=?')
    .run(version.revision, canonicalJson(state), version.digest, f.workspaceId, kind);
  f.db.query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?')
    .run(receipt.journal_version.revision, canonicalJson(receipt.successor_journal), receipt.journal_version.digest, f.workspaceId, f.identity.work_id, 1);
  f.db.exec('CREATE TABLE IF NOT EXISTS agent_host_delivered_work_continuation (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,action_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,action_id))');
  f.db.query('INSERT INTO agent_host_delivered_work_continuation VALUES(?,?,?,?,?,?)')
    .run(f.workspaceId, f.identity.work_id, 1, receipt.request.action.request.action_id, canonicalJson(receipt), staleDigest ? '0'.repeat(64) : canonicalJsonDigest(receipt));
}

test('Host reads configured-frontier binding history after later Work progress without replaying the old developer', async () => {
  const input = configuredFrontierRepairFixture(true);
  const f = await continuationFixture({ identity: input.receipt.request.identity });
  seedFrontierHostFixture(f, input);
  expect(f.store.readHostStateSnapshot(f.identity).workVersion).toEqual(input.receipt.work_version);
  const progressed = { ...input.receipt.successor_work, revision: 12, lifecycle: { ...input.receipt.successor_work.lifecycle, revision: 12 } };
  f.db.query("UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work'")
    .run(12, canonicalJson(progressed), canonicalJsonDigest(progressed), f.workspaceId);
  expect(f.store.readHostStateSnapshot(f.identity).work).toEqual(progressed);
  expect(f.db.query('SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(f.workspaceId).payload).toBe(canonicalJson(input.receipt));
  expect(input.receipt.successor_journal.completed).toEqual(input.receipt.prior_journal.completed);
});

function configuredFrontierRepairHostRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'frontier-repair-host-'));
  trackContinuationFixtureRoot(root);
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  const template = readFileSync(path.join(runtimeRoot, 'packages', 'agent', 'templates', 'agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{REPOSITORY}}', 'vida-agent').replaceAll('{{PROJECT}}', 'agent').replaceAll('{{BUNDLE}}', 'vida-agent');
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), template);
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture map\n');
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root), workspaceId = deriveWorkspaceId('vida-agent', root);
  const input = configuredFrontierRepairFixture(true, false, { root, config, workspaceId });
  const item = { schema: 'WorkItem/v1', id: input.receipt.request.identity.work_id, provider: 'local', provider_type: 'Task', canonical_kind: 'task', intent: 'task_execution', project_id: 'agent', title: 'Repair the original frontier', description: 'Fixture task', risk_flags: ['high'], labels: [] };
  const intake = { schema: 'VidaLocalSessionIntake/v1', native_session_handle: input.receipt.request.nativeSessionHandle, risk: 'high', route: 'R4', change_kind: 'fix', work_item: item };
  const intakePath = '.agent/work/work-1/local-session-intake.v1.json', bytes = Buffer.from(canonicalJson(intake));
  mkdirSync(path.dirname(path.join(root, intakePath)), { recursive: true });
  writeFileSync(path.join(root, intakePath), bytes);
  const prior = { ...input.receipt.prior_work,
    binding: { ...input.receipt.prior_work.binding, work_item_digest: canonicalJsonDigest(item) },
    artifacts: [{ artifact_id: 'local-session-intake', schema: 'VidaLocalSessionIntake/v1', path: intakePath, sha256: createHash('sha256').update(bytes).digest('hex'), stage_id: 'intake', scope_id: 'scope-fixture', source_revision: input.receipt.prior_work.binding.work_source_revision, ac_ids: ['AC-1'] }],
  };
  const successor = { ...input.receipt.successor_work, binding: { ...input.receipt.successor_work.binding, work_item_digest: canonicalJsonDigest(item) }, artifacts: prior.artifacts };
  const priorVersion = { revision: prior.revision, digest: canonicalJsonDigest(prior) };
  const successorVersion = { revision: successor.revision, digest: canonicalJsonDigest(successor) };
  const request = { ...input.receipt.request, expectedWork: priorVersion };
  input.receipt = { ...input.receipt, prior_work: prior, prior_work_version: priorVersion,
    successor_work: successor, successor_binding: successor.binding, work_version: successorVersion,
    request, request_digest: canonicalJsonDigest(request),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
  };
  input.current = { ...input.current, work: successor, work_version: successorVersion };
  return { root, config, workspaceId, input, intakePath };
}

test('configured-frontier public repair plans, applies and resumes the exact full-wave receipt without changing Host state', async () => {
  const fixture = configuredFrontierRepairHostRoot(), { root, config, workspaceId, input } = fixture;
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const f = await continuationFixture({ root, config, workspaceId, databasePath, repositoryRoot: root, identity: input.receipt.request.identity });
  seedFrontierHostFixture(f, input, true);
  const prefix = ['--kind', 'delivered-work-continuation', '--project-root', root, '--repair-id', 'frontier-integrity'];
  const details = ['--actor', 'fixture-owner', '--timestamp', '2026-10-08T00:00:00.000Z', '--projects', 'agent', '--work-id', f.identity.work_id, '--attempt', '1', '--action-id', input.receipt.request.action.request.action_id];
  const planned = await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'plan', ...details]);
  expect(planned.branch).toBe('configured_frontier');
  expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'apply'])).status).toBe('applied');
  expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'resume'])).status).toBe('already_applied');
  expect(f.store.readHostStateSnapshot(f.identity).work).toEqual(input.receipt.successor_work);
  expect(f.store.readHostStateSnapshot(f.identity).ledger).toEqual(input.receipt.successor_ledger);
  const row = f.db.query('SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(workspaceId);
  expect(row.payload).toBe(canonicalJson(input.receipt));
  expect(row.digest).toBe(canonicalJsonDigest(input.receipt));
});

test('frontier repair rechecks accepted intake before reservation and retains exact UNKNOWN recovery after interruption', async () => {
  const { root, config, workspaceId, input, intakePath } = configuredFrontierRepairHostRoot();
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const f = await continuationFixture({ root, config, workspaceId, databasePath, repositoryRoot: root, identity: input.receipt.request.identity });
  seedFrontierHostFixture(f, input, true);
  const prefix = ['--kind', 'delivered-work-continuation', '--project-root', root, '--repair-id', 'frontier-interrupted'];
  const details = ['--actor', 'fixture-owner', '--timestamp', '2026-10-08T00:00:00.000Z', '--projects', 'agent', '--work-id', f.identity.work_id, '--attempt', '1', '--action-id', input.receipt.request.action.request.action_id];
  await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'plan', ...details]);
  const original = readFileSync(path.join(root, intakePath));
  writeFileSync(path.join(root, intakePath), '{}');
  await expect(runDeliveredWorkContinuationRepair([...prefix, '--mode', 'apply'])).rejects.toThrow(/intake bytes differ/);
  expect(f.db.query("SELECT count(*) AS n FROM agent_host_governance WHERE workspace_id=? AND store_id='vida-delivered-continuation-repairs'").get(workspaceId).n).toBe(0);
  writeFileSync(path.join(root, intakePath), original);
  f.db.exec("CREATE TRIGGER frontier_repair_interrupt BEFORE UPDATE OF digest ON agent_host_delivered_work_continuation BEGIN SELECT RAISE(ABORT,'fixture interrupted frontier repair'); END");
  await expect(runDeliveredWorkContinuationRepair([...prefix, '--mode', 'apply'])).rejects.toThrow(/fixture interrupted frontier repair/);
  const operation = f.db.query("SELECT payload FROM agent_host_governance WHERE workspace_id=? AND store_id='vida-delivered-continuation-repairs' AND kind='operation'").get(workspaceId);
  expect(JSON.parse(operation.payload).status).toBe('commit_unknown');
  expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(/repair/);
  expect(f.db.query('SELECT digest FROM agent_host_delivered_work_continuation WHERE workspace_id=?').get(workspaceId).digest).toBe('0'.repeat(64));
  f.db.exec('DROP TRIGGER frontier_repair_interrupt');
  expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'resume'])).status).toBe('applied');
  expect((await runDeliveredWorkContinuationRepair([...prefix, '--mode', 'resume'])).status).toBe('already_applied');
  expect(f.store.readHostStateSnapshot(f.identity).work).toEqual(input.receipt.successor_work);
  expect(f.store.readHostStateSnapshot(f.identity).ledger).toEqual(input.receipt.successor_ledger);
});

test('Host preserves an issued UNKNOWN journal action and denies continuation without reissue', async () => {
  const f = await continuationFixture({ uncertain: true });
  try {
    const request = continuationRequestFor(f),
      before = f.store.readHostStateSnapshot(f.identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1);
    await expect(f.store.continueDeliveredWork(request)).rejects.toThrow(/unresolved outcome/);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(fixtureWorkspace, f.identity.work_id, 1),
    ).toEqual(journalBefore);
  } finally {}
});
