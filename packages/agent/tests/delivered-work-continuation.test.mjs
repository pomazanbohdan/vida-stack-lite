import { afterEach, test, expect } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runRuntimeCodeRebind } from '../bin/runtime-code-rebind.mjs';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
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

afterEach(() => cleanupContinuationFixtures());
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
  expect(() => validateDeliveredWorkContinuationAction(wrongSource.action)).toThrow();

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
