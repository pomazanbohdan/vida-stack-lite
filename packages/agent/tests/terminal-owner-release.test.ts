import { expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { run } from '../bin/run.ts';
import { HostStateStore, type WorkState } from '../src/host-state.ts';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { createSessionActionProjector, sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import type { CorrectiveExecution } from '../src/orchestration/final-assurance.ts';
import {
  inspectTerminalOwnerWork,
  suspendTerminalOwnerWork,
  type TerminalOwnerSuspensionInput,
} from '../src/orchestration/suspend-local-work.ts';
import { readSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';
import {
  buildSessionBridgeRequest,
  parseSessionBridgeRunState,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import type { MastraLedgerItem, MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import {
  historicalFixture,
  registerRuntimeConfigFixtureCleanup,
  withDatabase,
} from './helpers/runtime-config-rebind-fixture.ts';

registerRuntimeConfigFixtureCleanup();
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
function record(value: unknown): Record<string, unknown> {
  if (!isPlainRecord(value)) throw Error('Expected a fixture result object');
  return value;
}

/** Cooperative persisted corrective image; actual Host/Mastra readers and CAS run against disposable DBs. */
async function correctiveFixture(testerPass: boolean) {
  const subject = historicalFixture('settled_writer_failed_validators'),
    { f, state, request: oldRequest } = subject;
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  const config = loadRuntimeConfig(f.root),
    identity = oldRequest.identity;
  const current = withDatabase(f, (database) =>
    new HostStateStore(database, f.workspace).readWorkSessionSnapshot(identity, 1),
  );
  const work = current.host.work;
  const originalSource = state.completed.flatMap((wave) => wave.items).find((item) => item.host_reservation);
  if (!work?.execution.run_id || !current.journal || !originalSource?.host_reservation || !originalSource.observation)
    throw Error('Fixture completed Source result is missing');
  const stageIds = ['develop_task', 'validate_focused', 'test_task'];
  const engineId = randomUUID(),
    authorizationPath = '.agent/work/' + identity.work_id + '/correction-1-authorization.json';
  const authority = {
    schema: 'CorrectiveAssignmentAuthorization/v1',
    work_id: identity.work_id,
    attempt: 1,
    run_id: work.execution.run_id,
    base_run_id: work.execution.run_id,
    engine_run_id: engineId,
    correction_generation: 1,
    source_revision: work.binding.work_source_revision,
    scope_id: work.binding.scope_id,
    config_digest: runtimeConfigDigest(config),
    implementation_fingerprint: state.source_scope?.digest,
    ac_ids: work.binding.ac_ids,
    allowed_paths: work.lifecycle.scope.allowed_paths,
    stage_ids: stageIds,
    predecessor_attempt_ids: work.execution.assignment_attempts.map((attempt) => attempt.attempt_id),
    failed_action_ids: state.items.map((item) => item.request.action_id),
    user_instruction_ref: 'fixture:cooperative-authority',
    issued_at: new Date().toISOString(),
    work_version: current.host.workVersion,
    ledger_version: current.host.ledgerVersion,
    journal_version: current.journal.version,
  };
  const authorityBytes = Buffer.from(json(authority));
  f.put(authorizationPath, authorityBytes);
  const execution: CorrectiveExecution = {
    schema: 'CorrectiveExecution/v1',
    base_run_id: work.execution.run_id,
    engine_run_id: engineId,
    correction_generation: 1,
    stage_ids: stageIds,
    authorization: {
      schema: 'CorrectiveAssignmentAuthorization/v1',
      path: authorizationPath,
      sha256: sha(authorityBytes),
    },
  };
  const context = { work_id: identity.work_id, attempt: 1, scope_digest: work.binding.work_source_revision };
  const selection = {
    team: work.binding.team_id,
    kind: 'task' as const,
    intent: 'task_execution' as const,
    project: identity.project_ids[0]!,
    risk_flags: [],
    labels: [],
  };
  let prior = parseSessionBridgeRunState({
    ...context,
    workflow_id: work.binding.workflow_id,
    config_digest: runtimeConfigDigest(config),
    selection,
    observations: [],
  });
  const engineContext: Record<string, unknown> = { input: prior },
    completed: Array<MastraSessionLedgerState['completed'][number]> = [];
  const projector = createSessionActionProjector(config, selection, work.binding.workflow_id, work.lifecycle.risk);
  const waves = projector.executableWaveIndices(stageIds);
  let failedItems: MastraLedgerItem[] = [],
    sourceObservation = originalSource.observation;
  for (const wave of waves) {
    const items: MastraLedgerItem[] = projector.actionsForWave(context, wave, [], execution).map((action) => {
      const request = buildSessionBridgeRequest({
        runId: engineId,
        workflowId: work.binding.workflow_id,
        configDigest: runtimeConfigDigest(config),
        context,
        waveIndex: wave,
        action,
        configuredContext: null,
        priorResults: prior.observations,
        correctiveExecution: execution,
      });
      const issue_id = randomUUID(),
        failed = action.stage_kind === 'test' && !testerPass;
      const body =
        action.stage_kind === 'validate'
          ? {
              schema: 'VidaValidatorVerdict/v1',
              verdict: 'pass',
              findings: [],
              evidence_refs: ['local://fixture/code'],
            }
          : {
              schema: 'VidaTesterVerdict/v1',
              status: testerPass ? 'pass' : 'fail',
              evidence_refs: ['local://fixture/test'],
            };
      const summary = action.stage_kind === 'develop' ? originalSource.observation!.summary : json(body);
      const { host_attempt_id, changed_paths, ...readonlyObservation } = originalSource.observation!;
      const observation = {
        ...readonlyObservation,
        action_id: request.action_id,
        issue_id,
        status: failed ? ('reported_failed' as const) : ('reported_complete' as const),
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: action.stage_kind === 'develop' ? originalSource.observation!.evidence_refs : body.evidence_refs,
        ...(action.stage_kind === 'develop' ? { host_attempt_id, changed_paths } : {}),
      };
      if (action.stage_kind === 'develop') sourceObservation = observation;
      return {
        request,
        issue_id,
        observation,
        ...(action.stage_kind === 'develop' ? { host_reservation: originalSource.host_reservation } : {}),
      };
    });
    const id = 'wave-' + wave;
    if (!testerPass && wave === waves.at(-1)) {
      failedItems = items;
      engineContext[id] = {
        status: 'suspended',
        payload: prior,
        suspendPayload: { requests: items.map((item) => item.request) },
      };
    } else {
      const output = {
        ...prior,
        observations: [...prior.observations, ...items.flatMap((item) => (item.observation ? [item.observation] : []))],
      };
      engineContext[id] = {
        status: 'success',
        payload: prior,
        resumePayload: { observations: items.map((item) => item.observation) },
        output,
      };
      completed.push({ step_id: id, items });
      prior = output;
    }
  }
  const nextWork: WorkState = {
    ...work,
    revision: work.revision + 1,
    execution: {
      ...work.execution,
      assignment_attempts: work.execution.assignment_attempts.map((attempt) =>
        attempt.attempt_id === sourceObservation.host_attempt_id
          ? { ...attempt, result: sourceObservation, result_digest: canonicalJsonDigest(sourceObservation) }
          : attempt,
      ),
    },
    lifecycle: {
      ...work.lifecycle,
      revision: work.lifecycle.revision + 1,
      assurance: { ...work.lifecycle.assurance, correction_count: 1 },
      references: [
        ...work.lifecycle.references,
        {
          schema: 'LifecycleArtifactReference/v1',
          kind: 'correction_authorization',
          artifact_schema: authority.schema,
          record_id: 'cooperative-correction-1',
          path: authorizationPath,
          sha256: sha(authorityBytes),
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          ac_ids: work.binding.ac_ids,
          generation: null,
          implementation_fingerprint: null,
          delivery_cycle_id: null,
          principal: null,
          decision: 'approved',
          disposition: 'current',
        },
      ],
    },
  };
  const step = testerPass ? null : 'wave-' + waves.at(-1);
  const journal: MastraSessionLedgerState = {
    ...state,
    run_id: engineId,
    corrective_execution: execution,
    step_id: step,
    items: failedItems,
    completed,
  };
  withDatabase(f, (database) => {
    database
      .query("UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE kind='work'")
      .run(nextWork.revision, json(nextWork), canonicalJsonDigest(nextWork));
    database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=?')
      .run(json(journal), canonicalJsonDigest(journal));
  });
  const native = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), { strict: true });
  try {
    native.query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))').run(
      work.binding.workflow_id,
      engineId,
      json({
        runId: engineId,
        status: testerPass ? 'success' : 'suspended',
        context: engineContext,
        ...(testerPass ? { result: prior } : {}),
        suspendedPaths: step ? { [step]: [waves.length - 1] } : {},
      }),
    );
  } finally {
    native.close();
  }
  const requestPath = path.join(f.root, 'terminal-release.json');
  writeFileSync(
    requestPath,
    json({
      schema: 'TerminalOwnerReleaseRequest/v1',
      kind: 'corrective_source_frontier',
      identity,
      attempt: 1,
      userRequestPointer: 'fixture:terminal-corrective-release',
      requestIntent: 'next_work',
    }),
  );
  const args = (mode: string) => [
    '--release-terminal-owner',
    'true',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    'terminal-release.json',
  ];
  const snapshot = () =>
    withDatabase(f, (database) => new HostStateStore(database, f.workspace).readWorkSessionSnapshot(identity, 1));
  return { f, identity, args, requestPath, execution, snapshot, config, selection, context };
}

/** Cooperative disposable Host/T3 fixture; no provider authentication or native TestEvidence. */
function readonlyFixture(status = 'completed', history = false) {
  const subject = historicalFixture('unknown_readonly', { officialDocs: true });
  const { f, state, request } = subject;
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  const item = state.items[0];
  if (!item?.issue_id) throw Error('Pending readonly fixture issue is missing');
  const config = loadRuntimeConfig(f.root);
  const action = sessionActionsForWave(
    config,
    {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project: 'agent',
      risk_flags: [],
      labels: [],
    },
    { work_id: request.identity.work_id, attempt: 1, scope_digest: item.request.scope_digest },
    item.request.workflow_id,
    item.request.wave_index,
    [],
  )[0];
  if (!action || action.action_id !== item.request.action_id) throw Error('Fixture action projection differs');
  const prefix = '.agent/work/' + request.identity.work_id;
  const launch = {
    taskId: 'fixture-task',
    childThreadId: 'fixture-child',
    childRunId: 'fixture-run',
    childNodeId: 'fixture-node',
    providerInstanceId: 'codex',
  };
  const summary =
    status === 'stopped' ? 'Stopped on a safety refusal; no artifact accepted.' : 'Completed readonly fixture result.';
  const task = {
    ...launch,
    model: action.model,
    status,
    workState: 'result_available',
    hasPendingChildRuns: false,
    latestTerminalRunId: launch.childRunId,
    latestTerminalStatus: status,
    hasPendingQuestion: false,
    pendingApproval: null,
    waitTimedOut: false,
    summary,
  };
  const thread = {
    threadId: launch.childThreadId,
    parentThreadId: 'fixture-thread',
    latestRunId: launch.childRunId,
    providerInstanceId: launch.providerInstanceId,
    model: action.model,
    status,
    activeRunId: null,
    pendingRequestCount: 0,
  };
  const threadRead = {
    thread,
    hasMore: false,
    items: [{ type: 'assistant_message', runId: launch.childRunId, text: summary }],
  };
  const brief = `# Actual issued bounded synthesis\n\nIssue ${item.issue_id}; action ${item.request.action_id}; work ${request.identity.work_id}; attempt1. Readonly only.\n`;
  const frozen = history
    ? json({
        thread: { ...thread, status: 'completed' },
        hasMore: false,
        items: [
          {
            type: 'user_message',
            position: 0,
            sourceThreadId: launch.childThreadId,
            senderThreadId: 'fixture-thread',
            runId: launch.childRunId,
            textTruncated: false,
            text: brief,
          },
        ],
      })
    : brief;
  const entries = {
    originalIssue: {
      path: prefix + '/issue.json',
      text: json({ request: item.request, issue_id: item.issue_id, action }),
    },
    originalDispatch: { path: prefix + '/dispatch.json', text: json(launch) },
    frozenBrief: { path: prefix + '/brief.txt', text: frozen },
    currentTask: { path: prefix + '/current-task.json', text: json(task) },
    currentThread: { path: prefix + '/current-thread.json', text: json(threadRead) },
  };
  for (const entry of Object.values(entries)) f.put(entry.path, entry.text);
  const evidence = Object.fromEntries(
    Object.entries(entries).map(([key, entry]) => [
      key,
      {
        path: entry.path,
        sha256: sha(Buffer.from(entry.text)),
      },
    ]),
  );
  const base = {
    schema: 'TerminalOwnerReleaseRequest/v1',
    kind: 'observed_terminal_readonly',
    identity: request.identity,
    attempt: 1,
    userRequestPointer: 'fixture:terminal-owner',
    requestIntent: 'next_work',
    evidence,
  };
  f.put('terminal-release.json', json(base));
  const args = (mode: string) => [
    '--release-terminal-owner',
    'true',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    'terminal-release.json',
  ];
  const snapshot = () =>
    withDatabase(f, (database) =>
      new HostStateStore(database, f.workspace).readWorkSessionSnapshot(request.identity, 1),
    );
  const rewrite = (key: keyof typeof entries, value: unknown) => {
    const text = typeof value === 'string' ? value : json(value);
    f.put(entries[key].path, text);
    evidence[key] = { path: entries[key].path, sha256: sha(Buffer.from(text)) };
    f.put('terminal-release.json', json(base));
  };
  return { ...subject, args, snapshot, base, entries, task, threadRead, launch, rewrite };
}

for (const [status, history] of [
  ['completed', false],
  ['stopped', false],
  ['completed', true],
] as const) {
  test(`readonly terminal ${status}/${history ? 'history' : 'brief'} disposes once and preserves UNKNOWN`, async () => {
    const subject = readonlyFixture(status, history),
      before = subject.snapshot();
    const inspected = record(await run(subject.args('inspect')));
    expect(inspected.status).toBe('terminal_owner_release_inspected');
    expect(subject.snapshot()).toEqual(before);
    subject.f.put('terminal-release.json', json(inspected.request));
    const result = record(await run(subject.args('apply'))),
      after = subject.snapshot();
    expect(result.status).toBe('terminal_owner_released');
    expect(result.native_outcome).toBe('preserved_unknown');
    expect(result.rights_granted).toBe(false);
    expect(after.host.work?.lease).toBeNull();
    expect(after.host.work?.execution.status).toBe('suspended');
    expect(after.host.work?.lifecycle.phase).toBe(before.host.work?.lifecycle.phase);
    expect(after.host.work?.execution.assignment_attempts).toEqual(before.host.work?.execution.assignment_attempts);
    expect(after.journal).toEqual(before.journal);
    expect(after.journal?.state.items[0]?.observation).toBeNull();
    expect(record(await run(subject.args('apply'))).status).toBe('terminal_owner_release_replayed');
    expect(subject.snapshot()).toEqual(after);
    const changed = { ...record(inspected.request), userRequestPointer: 'fixture:substituted-request' };
    subject.f.put('terminal-release.json', json(changed));
    await assert.rejects(run(subject.args('apply')));
    expect(subject.snapshot()).toEqual(after);
  });
}

const taskDenials: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ['running', { status: 'running' }],
  ['wrong run', { childRunId: 'other-run' }],
  ['wrong node', { childNodeId: 'other-node' }],
  ['wrong task', { taskId: 'other-task' }],
  ['wrong model', { model: 'foreign-model' }],
  ['active child', { hasPendingChildRuns: true }],
  ['pending question', { hasPendingQuestion: true }],
  ['pending approval', { pendingApproval: {} }],
  ['unknown terminal', { latestTerminalStatus: 'unknown' }],
  ['missing result', { workState: 'working' }],
  ['timeout', { waitTimedOut: true }],
  ['substituted final', { summary: 'different final content' }],
];
for (const [name, patch] of taskDenials) {
  test(`readonly terminal refuses ${name} without mutation`, async () => {
    const subject = readonlyFixture(),
      before = subject.snapshot();
    subject.rewrite('currentTask', { ...subject.task, ...patch });
    await assert.rejects(run(subject.args('inspect')));
    expect(subject.snapshot()).toEqual(before);
  });
}

test('readonly terminal refuses foreign parent, active thread and unrelated brief', async () => {
  const subject = readonlyFixture(),
    before = subject.snapshot();
  for (const patch of [
    { parentThreadId: 'other-parent' },
    { activeRunId: 'still-running' },
    { pendingRequestCount: 1 },
  ]) {
    subject.rewrite('currentThread', { ...subject.threadRead, thread: { ...subject.threadRead.thread, ...patch } });
    await assert.rejects(run(subject.args('inspect')));
    expect(subject.snapshot()).toEqual(before);
  }
  subject.rewrite('currentThread', subject.threadRead);
  subject.rewrite('frozenBrief', '# Unrelated substituted brief\n');
  await assert.rejects(run(subject.args('inspect')), /brief/);
  expect(subject.snapshot()).toEqual(before);
});

test('readonly terminal binds evidence bytes, owner generation and fresh CAS before apply', async () => {
  const subject = readonlyFixture(),
    before = subject.snapshot();
  const inspected = record(await run(subject.args('inspect'))),
    request = record(inspected.request);
  const inspection = record(request.inspection);
  subject.f.put('terminal-release.json', json({ ...request, inspection: { ...inspection, ownerGeneration: 999 } }));
  await assert.rejects(run(subject.args('apply')));
  expect(subject.snapshot()).toEqual(before);
  subject.f.put(
    'terminal-release.json',
    json({
      ...request,
      inspection: { ...inspection, expectedLedger: { ...record(inspection.expectedLedger), revision: 999 } },
    }),
  );
  await assert.rejects(run(subject.args('apply')));
  expect(subject.snapshot()).toEqual(before);
  subject.f.put('terminal-release.json', json(request));
  subject.f.put(subject.entries.currentTask.path, json({ ...subject.task, hasPendingChildRuns: true }));
  await assert.rejects(run(subject.args('apply')), /digest|bytes/);
  expect(subject.snapshot()).toEqual(before);
});

test('terminal request rejects oversized, invalid UTF-8, unknown-key and unsafe-path input before effects', async () => {
  const subject = readonlyFixture(),
    before = subject.snapshot();
  for (const bytes of [
    Buffer.alloc(65537, 32),
    Buffer.from([0xff]),
    Buffer.from(json({ ...subject.base, extra: true })),
  ]) {
    subject.f.put('terminal-release.json', bytes);
    await assert.rejects(run(subject.args('inspect')));
    expect(subject.snapshot()).toEqual(before);
  }
  subject.f.put('terminal-release.json', json(subject.base));
  const args = subject.args('inspect');
  args[args.length - 1] = '../escape.json';
  await assert.rejects(run(args), /path/);
  expect(subject.snapshot()).toEqual(before);
});

test('terminal evidence rejects oversized, invalid UTF-8 and malformed JSON before effects', async () => {
  const subject = readonlyFixture(),
    before = subject.snapshot();
  for (const bytes of [Buffer.alloc(1024 * 1024 + 1, 32), Buffer.from([0xff]), Buffer.from('{not-json')]) {
    subject.f.put(subject.entries.currentTask.path, bytes);
    subject.base.evidence.currentTask = { path: subject.entries.currentTask.path, sha256: sha(bytes) };
    subject.f.put('terminal-release.json', json(subject.base));
    await assert.rejects(run(subject.args('inspect')));
    expect(subject.snapshot()).toEqual(before);
  }
  expect(readFileSync(path.join(subject.f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(subject.f.oldYaml);
});

for (const passing of [true, false]) {
  test(`corrective Source frontier retains tester ${passing ? 'PASS' : 'FAIL'} and releases without delivery`, async () => {
    const subject = await correctiveFixture(passing);
    withDatabase(subject.f, (database) => {
      const store = new HostStateStore(
        database,
        subject.f.workspace,
        undefined,
        undefined,
        undefined,
        undefined,
        subject.f.root,
      );
      const before = store.readWorkSessionSnapshot(subject.identity, 1);
      const lease = before.host.work?.lease,
        claim = before.host.ledger?.claims.find((item) => item.ticket_id === lease?.ticket_id);
      if (!lease || !claim || !before.host.workVersion || !before.host.ledgerVersion || !before.journal)
        throw Error('Corrective ownership is missing');
      const engineSnapshot = readSessionEngineSnapshot({
        repositoryRoot: subject.f.root,
        config: subject.config,
        selection: subject.selection,
        context: subject.context,
        workflowId: before.host.work!.binding.workflow_id,
        runId: subject.execution.engine_run_id,
        correctiveExecution: subject.execution,
        lifecycleRisk: before.host.work!.lifecycle.risk,
      });
      if (!engineSnapshot) throw Error('Corrective engine is missing');
      const input = {
        store,
        identity: subject.identity,
        config: subject.config,
        kind: 'corrective_source_frontier' as const,
        journal: {
          state: before.journal.state,
          version: before.journal.version,
          resume_status: 'ready_to_resume' as const,
        },
        expectedWork: before.host.workVersion,
        expectedLedger: before.host.ledgerVersion,
        expectedMaintenanceGeneration: before.host.maintenanceGeneration,
        nativeSessionHandle: 'fixture-thread',
        userRequestPointer: 'fixture:terminal-corrective-release',
        requestIntent: 'next_work' as const,
        ownerTicketId: lease.ticket_id,
        ownerClaimId: claim.claim_id,
        ownerGeneration: lease.generation,
        engineSnapshot,
        documentationContext: {
          repository_root: subject.f.root,
          repository_id: subject.identity.repository_id,
          project_id: subject.identity.project_ids[0]!,
          work_id: subject.identity.work_id,
        },
      };
      const requestDigest = canonicalJsonDigest({
        fixture: 'corrective-disposal',
        work: subject.identity.work_id,
        passing,
      });
      inspectTerminalOwnerWork(input, requestDigest);
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(before);
      suspendTerminalOwnerWork(input, requestDigest);
      const after = store.readWorkSessionSnapshot(subject.identity, 1);
      expect(after.host.work?.lease).toBeNull();
      expect(after.host.work?.lifecycle.phase).toBe(before.host.work?.lifecycle.phase);
      expect(after.journal).toEqual(before.journal);
      expect(after.host.work?.execution.assignment_attempts).toEqual(before.host.work?.execution.assignment_attempts);
      suspendTerminalOwnerWork(input, requestDigest);
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(after);
    });
  });
}

test('corrective terminal owner refuses foreign binding, stale CAS, changed engine and authority bytes', async () => {
  const subject = await correctiveFixture(false);
  withDatabase(subject.f, (database) => {
    const store = new HostStateStore(
      database,
      subject.f.workspace,
      undefined,
      undefined,
      undefined,
      undefined,
      subject.f.root,
    );
    const before = store.readWorkSessionSnapshot(subject.identity, 1),
      work = before.host.work;
    const lease = work?.lease,
      claim = before.host.ledger?.claims.find((item) => item.ticket_id === lease?.ticket_id);
    if (!work || !lease || !claim || !before.journal || !before.host.workVersion || !before.host.ledgerVersion)
      throw Error('Fixture ownership is missing');
    const engineSnapshot = readSessionEngineSnapshot({
      repositoryRoot: subject.f.root,
      config: subject.config,
      selection: subject.selection,
      context: subject.context,
      workflowId: work.binding.workflow_id,
      runId: subject.execution.engine_run_id,
      correctiveExecution: subject.execution,
      lifecycleRisk: work.lifecycle.risk,
    });
    if (!engineSnapshot) throw Error('Fixture engine is missing');
    const input: TerminalOwnerSuspensionInput = {
      store,
      identity: subject.identity,
      config: subject.config,
      kind: 'corrective_source_frontier',
      engineSnapshot,
      journal: { state: before.journal.state, version: before.journal.version, resume_status: 'ready_to_resume' },
      expectedWork: before.host.workVersion,
      expectedLedger: before.host.ledgerVersion,
      expectedMaintenanceGeneration: before.host.maintenanceGeneration,
      nativeSessionHandle: 'fixture-thread',
      userRequestPointer: 'fixture:denied-corrective-release',
      requestIntent: 'next_work',
      ownerTicketId: lease.ticket_id,
      ownerClaimId: claim.claim_id,
      ownerGeneration: lease.generation,
      documentationContext: {
        repository_root: subject.f.root,
        repository_id: subject.identity.repository_id,
        project_id: subject.identity.project_ids[0]!,
        work_id: subject.identity.work_id,
      },
    };
    const requestDigest = canonicalJsonDigest('corrective refusal controls');
    const changes: Partial<TerminalOwnerSuspensionInput>[] = [
      { nativeSessionHandle: 'foreign-actor' },
      { ownerGeneration: lease.generation + 1 },
      { expectedWork: { ...input.expectedWork, revision: input.expectedWork.revision + 1 } },
      { expectedMaintenanceGeneration: input.expectedMaintenanceGeneration + 1 },
      { engineSnapshot: { ...engineSnapshot, run_id: 'foreign-engine' } },
      { engineSnapshot: { ...engineSnapshot, observations: [] } },
      {
        journal: {
          ...input.journal,
          version: { ...input.journal.version, revision: input.journal.version.revision + 1 },
        },
      },
    ];
    for (const change of changes) {
      expect(() => inspectTerminalOwnerWork({ ...input, ...change }, requestDigest)).toThrow();
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(before);
    }
    const raw = () => ({
      host: database.query('SELECT * FROM agent_host_state ORDER BY kind,id').all(),
      journal: database.query('SELECT * FROM agent_host_mastra_session_ledger ORDER BY work_id,attempt').all(),
    });
    const rows = raw();
    const authorityPath = path.join(subject.f.root, subject.execution.authorization.path);
    writeFileSync(authorityPath, Buffer.concat([readFileSync(authorityPath), Buffer.from(' ')]));
    expect(() => inspectTerminalOwnerWork(input, requestDigest)).toThrow(/authority bytes/);
    expect(raw()).toEqual(rows);
  });
});
