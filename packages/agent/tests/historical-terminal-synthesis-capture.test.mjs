import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HostStateStore } from '../src/host-state.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { run } from '../bin/run.mjs';

const workspace = 'a'.repeat(64);
const identity = {
  repository_id: 'fixture-repository',
  project_ids: ['agent'],
  integrations_digest: 'b'.repeat(64),
  work_id: 'fixture-work',
};
const roots = [];
const databases = [];
const json = canonicalJson;

function lifecycle(binding, revision = 1) {
  return {
    schema: 'LifecycleState/v1',
    revision,
    phase: 'INTAKE',
    source_revision: binding.work_source_revision,
    next_action: 'Continue the original work after review.',
    route: 'R3',
    risk: 'high',
    change_kind: 'migration',
    config_binding: {
      config_digest: binding.config_digest,
      schema_digest: binding.schema_digest,
      runtime_code_digest: binding.runtime_code_digest,
    },
    scope: {
      scope_id: binding.scope_id,
      allowed_paths: ['src/task.ts'],
      fingerprint_paths: ['src/task.ts'],
      implementation_paths: ['src/task.ts'],
      documentation_paths: [],
    },
    seal: null,
    assurance: {
      epoch: 'epoch-1',
      review_generation: 0,
      correction_count: 0,
      review_failure_count: 0,
      delivery_cycle_id: null,
    },
    references: [],
  };
}

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'historical-terminal-capture-'));
  roots.push(root);
  const db = new Database(path.join(root, 'host.db'), { create: true, strict: true });
  databases.push(db);
  const store = new HostStateStore(db, workspace);
  const binding = {
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    integrations_digest: identity.integrations_digest,
    team_id: 'default-development',
    workflow_id: 'task_execution',
    provider_work_item_id: 'provider-work-item',
    lifecycle_work_id: identity.work_id,
    work_item_digest: 'c'.repeat(64),
    work_source_revision: 'd'.repeat(64),
    scope_id: 'scope-fixture',
    scope_contract_digest: 'e'.repeat(64),
    acceptance_manifest_digest: 'f'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: ['file:src/task.ts'],
    config_digest: '1'.repeat(64),
    runtime_source_revision: '2'.repeat(64),
    schema_digest: '3'.repeat(64),
    runtime_code_digest: '4'.repeat(64),
  };
  const now = new Date(Date.now()).toISOString(),
    leaseExpiresAt = new Date(Date.now() + 3600_000).toISOString(),
    claim = {
      schema: 'WorkstreamClaim/v1',
      claim_id: 'claim-fixture',
      ticket_id: 'ticket-fixture',
      work_id: identity.work_id,
      thread_id: 'fixture-thread',
      generation: 1,
      resources: ['file:src/task.ts'],
      lease_expires_at: leaseExpiresAt,
      status: 'active',
      created_at: now,
      renewed_at: now,
    },
    ticket = {
      schema: 'CoordinationTicket/v1',
      ticket_id: 'ticket-fixture',
      repository_id: identity.repository_id,
      project_ids: identity.project_ids,
      integrations_digest: identity.integrations_digest,
      work_id: identity.work_id,
      thread_id: 'fixture-thread',
      source_revision: binding.work_source_revision,
      generation: 1,
      sequence: 1,
      contour_keys: ['tenant:tenant', 'project:tenant/agent', 'file:src/task.ts'],
      exclusive_resources: ['file:src/task.ts'],
      status: 'active',
      claim_ids: [claim.claim_id],
      expires_at: leaseExpiresAt,
      active_resources: ['file:src/task.ts'],
      blocked_resources: [],
      created_at: now,
    },
    initial = store.compareAndSwapHostState({
      expectedWork: null,
      expectedLedger: null,
      nextWork: {
        schema: 'WorkState/v1',
        workspace_id: workspace,
        revision: 1,
        binding,
        contracts: {
          scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
          acceptance: {
            schema: 'AcceptanceManifest/v1',
            path: '.agent/acceptance.json',
            sha256: binding.acceptance_manifest_digest,
          },
          decisions: [],
        },
        lease: { ticket_id: ticket.ticket_id, thread_id: ticket.thread_id, generation: ticket.generation },
        execution: {
          run_id: 'run-fixture',
          input_digest: '5'.repeat(64),
          phase: 'implementation',
          status: 'active',
          assignment_attempts: [],
        },
        lifecycle: lifecycle(binding),
        artifacts: [],
      },
      nextLedger: {
        schema: 'CoordinationLedger/v1',
        workspace_id: workspace,
        revision: 1,
        open_generation: 1,
        next_sequence: 2,
        tickets: [ticket],
        claims: [claim],
        notices: [],
        dispositions: [],
        contours: [],
        batches: [],
        rebinds: [],
        operations: [],
        retirements: [],
      },
    });
  const journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: 'run-fixture',
    step_id: 'wave-0',
    source_scope: { schema: 'ScopedSourceSnapshot/v1', digest: binding.work_source_revision, entries: [] },
    items: [],
    completed: [],
  };
  db.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  db.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
    workspace,
    identity.work_id,
    1,
    1,
    json(journal),
    canonicalJsonDigest(journal),
  );
  return { root, db, store, initial, journal };
}

function captureInput(f) {
  const before = f.store.readHostStateSnapshot(identity),
    ticket = before.ledger.tickets.find((entry) => entry.status === 'active'),
    claim = before.ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id && entry.status === 'active'),
    row = f.db
      .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
      .get(workspace, identity.work_id, 1),
    journal = JSON.parse(row.payload),
    now = new Date(Date.now() + 60_000).toISOString(),
    nextWork = structuredClone(before.work),
    nextLedger = structuredClone(before.ledger),
    body = Buffer.from('{"schema":"VidaSessionObservation/v1","status":"reported_complete"}\n');
  nextWork.revision++;
  nextWork.lease = null;
  nextWork.execution.status = 'suspended';
  nextWork.execution.phase = 'awaiting_followup';
  nextWork.lifecycle.revision = nextWork.revision;
  nextWork.lifecycle.next_action =
    'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.';
  nextLedger.revision++;
  nextLedger.tickets = nextLedger.tickets.map((entry) =>
    entry.ticket_id === ticket.ticket_id
      ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
      : entry,
  );
  nextLedger.claims = nextLedger.claims.map((entry) =>
    entry.claim_id === claim.claim_id ? { ...entry, status: 'released', renewed_at: now } : entry,
  );
  nextLedger.operations.push({
    schema: 'CoordinationOperation/v1',
    operation_id: 'capture-release-fixture',
    kind: 'release',
    ticket_id: ticket.ticket_id,
    work_id: identity.work_id,
    thread_id: 'fixture-thread',
    source_revision: ticket.source_revision,
    resources: [...ticket.exclusive_resources],
    from_ledger_revision: before.ledger.revision,
    to_ledger_revision: nextLedger.revision,
    decided_by: 'fixture-thread',
    decision_pointer: 'fixture:human-request',
    created_at: now,
  });
  const provenance = {
    schema: 'HistoricalTerminalSynthesisProvenance/v1',
    body_ref: '.tmp/body.json',
    input_ref: '.tmp/input.json',
    report_ref: '.tmp/report.json',
    followup_ref: 'fixture:followup',
    original_actor_id: 'fixture:agent',
    denial_status: 'blocked',
    denial_code: 'GAP-VIDA-RUN-EXECUTION-001',
    denial_message: 'The requested run was blocked by runtime validation.',
    denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
    input_bytes_base64: Buffer.from('{}').toString('base64'),
    report_bytes_base64: Buffer.from('{}').toString('base64'),
    predecessor_refs: [
      { result_id: 'result-1', digest: '6'.repeat(64) },
      { result_id: 'result-2', digest: '7'.repeat(64) },
    ],
  };
  return {
    schema: 'HistoricalTerminalSynthesisCapture/v1',
    identity,
    attempt: 1,
    actionId: 'action-fixture',
    issueId: 'issue-fixture',
    nativeSessionHandle: 'fixture-thread',
    userRequestPointer: 'fixture:human-request',
    requestIntent: 'linked_correction',
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
    expectedJournal: { revision: row.revision, digest: row.digest },
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    documentationContext: {
      repository_root: f.root,
      repository_id: identity.repository_id,
      project_id: identity.project_ids[0],
      work_id: identity.work_id,
    },
    nextWork,
    nextLedger,
    bodyBytes: body,
    provenance,
    before,
    journal,
  };
}

function appendSameOwnerQueuedTicket(f) {
  const before = f.store.readHostStateSnapshot(identity),
    work = structuredClone(before.work),
    ledger = structuredClone(before.ledger),
    owner = ledger.tickets.find((entry) => entry.status === 'active'),
    now = new Date().toISOString();
  work.revision++;
  work.lifecycle.revision = work.revision;
  ledger.revision++;
  ledger.next_sequence++;
  ledger.tickets.push({
    ...owner,
    ticket_id: 'ticket-queued-same-owner',
    sequence: before.ledger.next_sequence,
    status: 'queued',
    claim_ids: [],
    expires_at: null,
    active_resources: [],
    blocked_resources: [...owner.exclusive_resources],
    created_at: now,
  });
  return f.store.compareAndSwapHostState({
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    nextWork: work,
    nextLedger: ledger,
  });
}

function seedQueuedOverlap(f) {
  const before = f.store.readHostStateSnapshot(identity),
    work = structuredClone(before.work),
    ledger = structuredClone(before.ledger),
    owner = ledger.tickets.find((entry) => entry.status === 'active'),
    now = new Date().toISOString();
  work.revision++;
  work.lifecycle.revision = work.revision;
  ledger.revision++;
  ledger.next_sequence++;
  ledger.tickets.push({
    ...owner,
    ticket_id: 'ticket-queued-fixture',
    work_id: identity.work_id,
    thread_id: 'queued-fixture-thread',
    sequence: before.ledger.next_sequence,
    status: 'queued',
    claim_ids: [],
    expires_at: null,
    active_resources: [],
    blocked_resources: [...owner.exclusive_resources],
    created_at: now,
  });
  return f.store.compareAndSwapHostState({
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    nextWork: work,
    nextLedger: ledger,
  });
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function publicCaptureFixture({ mode = 'invalid_utf8' } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'historical-terminal-cli-'));
  roots.push(root);
  mkdirSync(path.join(root, '.git'));
  mkdirSync(path.join(root, '.tmp'));
  writeFileSync(path.join(root, 'AGENTS.md'), 'Synthetic isolated fixture.\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic source map.\n');
  const identity = {
      repository_id: 'fixture-repository',
      project_ids: ['agent'],
      integrations_digest: '8'.repeat(64),
      work_id: 'fixture-work',
    },
    base = {
      schema: 'HistoricalTerminalSynthesisCaptureRequest/v1',
      identity,
      attempt: 1,
      action_id: 'fixture-action',
      issue_id: 'fixture-issue',
      body_ref: '.tmp/body.json',
      input_ref: '.tmp/input.json',
      report_ref: '.tmp/report.json',
      followup_ref: 'fixture:followup',
      userRequestPointer: 'fixture:human-request',
      requestIntent: 'linked_correction',
    },
    summary = JSON.stringify({
      schema: 'VidaSynthesisObservationOutput/v1',
      readiness: mode === 'not_blocked' ? 'ready' : 'blocked',
      completeness: { status: 'blocked', material_gaps: ['GAP-VIDA-RUN-EXECUTION-001'] },
    }),
    body = {
      schema: 'VidaSessionObservation/v1',
      action_id: base.action_id,
      issue_id: base.issue_id,
      agent_id: 'fixture:research-synthesizer',
      tool_call_ref: base.followup_ref,
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: [],
    },
    input = { status: body.status, agent_id: body.agent_id, tool_call_ref: body.tool_call_ref },
    denial = {
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: mode === 'denial' ? 'GAP-FOREIGN' : 'GAP-VIDA-RUN-EXECUTION-001',
      message: 'The requested run was blocked by runtime validation.',
    },
    report = {
      exit_code: 1,
      input_path: path.resolve(root, base.input_ref),
      command: ['vida-agent', '--report', path.resolve(root, '.tmp/report-body.json')],
      stderr: JSON.stringify(denial),
    };
  writeFileSync(path.join(root, '.tmp/request.json'), json(base));
  writeFileSync(path.join(root, '.tmp/body.json'), mode === 'invalid_utf8' ? Buffer.from([0xff]) : json(body));
  writeFileSync(path.join(root, '.tmp/input.json'), json(input));
  writeFileSync(path.join(root, '.tmp/report.json'), json(report));
  writeFileSync(
    path.join(root, '.tmp/report-body.json'),
    json(mode === 'report_body_mismatch' ? { ...body, evidence_refs: ['different-evidence'] } : body),
  );
  if (mode === 'oversize') writeFileSync(path.join(root, '.tmp/body.json'), Buffer.alloc(65537, 32));
  return { root, identity, request: base };
}

test.each([
  ['invalid_utf8', /not valid UTF-8/],
  ['unsafe_reference', /references/],
  ['oversize', /exceeds bound/],
  ['not_blocked', /not a blocked unaccepted candidate/],
  ['denial', /original report denial differs/],
  ['report_body_mismatch', /retained synthesis body, follow-up or report body differs/],
])('public capture CLI denies %s before Host effects', async (mode, expected) => {
  const f = publicCaptureFixture({ mode });
  if (mode === 'unsafe_reference') {
    f.request.body_ref = '../outside.json';
    writeFileSync(path.join(f.root, '.tmp/request.json'), json(f.request));
  }
  const tracked = [
      '.tmp/request.json',
      '.tmp/body.json',
      '.tmp/input.json',
      '.tmp/report.json',
      '.tmp/report-body.json',
    ],
    before = tracked.map((relative) => readFileSync(path.join(f.root, relative)));
  await expect(
    run([
      '--capture-historical-terminal-synthesis',
      'true',
      '--mode',
      'inspect',
      '--project-root',
      f.root,
      '--native-session-handle',
      'fixture-thread',
      '--baseline-config',
      'baseline.yaml',
      '--request',
      '.tmp/request.json',
    ]),
  ).rejects.toThrow(expected);
  expect(tracked.map((relative) => readFileSync(path.join(f.root, relative)))).toEqual(before);
  expect(existsSync(path.join(f.root, '.agent/work/session-handoff.v1.sqlite'))).toBe(false);
}, 30000);

test('known-terminal custody and original-owner release commit atomically and exact retry preserves rights', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      receipt = f.store.captureHistoricalTerminalSynthesisAndRelease(input).receipt,
      after = f.store.readHostStateSnapshot(identity),
      journalAfter = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1);
    expect(receipt.terminal_status).toBe('known_terminal_unaccepted');
    expect(receipt.task_status).toBe('unfinished');
    expect(receipt.body_base64).toBe(input.bodyBytes.toString('base64'));
    expect(Buffer.from(receipt.body_base64, 'base64')).toEqual(input.bodyBytes);
    expect(receipt.rights_granted).toBe(false);
    expect(receipt.accepted_result).toBe(false);
    expect(receipt.runtime_acceptance).toBe(false);
    expect(after.work.lease).toBeNull();
    expect(after.work.execution.status).toBe('suspended');
    expect(after.work.execution.assignment_attempts).toEqual(f.initial.work.execution.assignment_attempts);
    expect(after.work.binding).toEqual(f.initial.work.binding);
    expect(after.work.artifacts).toEqual(f.initial.work.artifacts);
    expect(after.work.lifecycle.phase).toBe(f.initial.work.lifecycle.phase);
    expect(after.ledger.tickets[0].status).toBe('released');
    expect(after.ledger.claims[0].status).toBe('released');
    expect(journalAfter.revision).toBe(input.expectedJournal.revision);
    expect(journalAfter.digest).toBe(input.expectedJournal.digest);
    expect(JSON.parse(journalAfter.payload)).toEqual(input.journal);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toEqual(receipt);
    const replay = f.store.captureHistoricalTerminalSynthesisAndRelease(input);
    expect(replay.receipt).toEqual(receipt);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(after);
    expect(() =>
      f.store.captureHistoricalTerminalSynthesisAndRelease({
        ...input,
        bodyBytes: Buffer.from('{"changed":true}\n'),
      }),
    ).toThrow(/exact retry differs/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(after);
  } finally {}
});

test('terminal synthesis releases only the original owner and preserves same-owner queued tickets and operations', () => {
  const f = fixture();
  try {
    appendSameOwnerQueuedTicket(f);
    const before = f.store.readHostStateSnapshot(identity),
      input = captureInput(f),
      queued = before.ledger.tickets.find((entry) => entry.status === 'queued'),
      priorOperations = before.ledger.operations;
    const result = f.store.captureHistoricalTerminalSynthesisAndRelease(input),
      after = result.snapshot,
      retainedQueued = after.ledger.tickets.find((entry) => entry.ticket_id === queued.ticket_id);
    expect(after.work.lease).toBeNull();
    expect(after.ledger.tickets.find((entry) => entry.ticket_id === before.work.lease.ticket_id).status).toBe('released');
    expect(retainedQueued).toEqual(queued);
    expect(after.ledger.operations.slice(0, priorOperations.length)).toEqual(priorOperations);
    expect(after.ledger.operations).toHaveLength(priorOperations.length + 1);
    expect(after.ledger.operations.at(-1).ticket_id).toBe(before.work.lease.ticket_id);
  } finally {}
});

test('terminal synthesis exact retry denies after a completed maintenance generation without changing Host or Journal', async () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      receipt = f.store.captureHistoricalTerminalSynthesisAndRelease(input).receipt,
      hostBeforeMaintenance = f.db
        .query("SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id")
        .all(workspace),
      journalBeforeMaintenance = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1),
      maintenance = new HostStateStore(f.db, workspace, undefined, undefined, undefined, {
        principal: 'fixture:maintenance-host',
        projectIds: ['agent'],
        verify: (fence) => ({
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: 'fixture:maintenance-host',
          fence_digest: canonicalJsonDigest(fence),
          closure_digest: fence.binding.closure_digest,
          bundle_digest: fence.binding.bundle_digest,
        }),
      }),
      binding = {
        schema: 'MaintenanceFenceBinding/v1',
        project_ids: ['agent'],
        operation_id: 'terminal-synthesis-maintenance-cycle',
        manifest_digest: '8'.repeat(64),
        request_digest: '9'.repeat(64),
        bindings_digest: 'a'.repeat(64),
        closure_digest: 'b'.repeat(64),
        bundle_digest: 'c'.repeat(64),
      },
      fence = maintenance.acquireMaintenanceFence(binding);
    await maintenance.releaseMaintenanceFence(fence);
    expect(maintenance.readMaintenanceFence().generation).toBe(receipt.request.expected_maintenance_generation + 1);
    expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(input)).toThrow(/maintenance generation is stale or missing/);
    expect(
      f.db
        .query("SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id")
        .all(workspace),
    ).toEqual(hostBeforeMaintenance);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1),
    ).toEqual(journalBeforeMaintenance);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toEqual(receipt);
  } finally {}
});

test.each(['changed queued ticket', 'extra release operation'])(
  'Host rejects terminal synthesis release with %s without effects',
  (change) => {
    const f = fixture();
    try {
      appendSameOwnerQueuedTicket(f);
      const input = captureInput(f),
        before = f.store.readHostStateSnapshot(identity),
        journalBefore = f.db
          .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
          .get(workspace, identity.work_id, 1);
      if (change === 'changed queued ticket') {
        input.nextLedger.tickets = input.nextLedger.tickets.map((entry) =>
          entry.ticket_id === 'ticket-queued-same-owner'
            ? { ...entry, status: 'released', blocked_resources: [], expires_at: null }
            : entry,
        );
      } else input.nextLedger.operations.push({ ...input.nextLedger.operations.at(-1), operation_id: 'extra-release' });
      expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(input)).toThrow(
        /historical synthesis custody release operation is incomplete/,
      );
      expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
      expect(
        f.db
          .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
          .get(workspace, identity.work_id, 1),
      ).toEqual(journalBefore);
      expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
    } finally {}
  },
);

test('stale Work, Ledger, Journal or maintenance versions and foreign owner deny before effects', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      before = f.store.readHostStateSnapshot(identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1);
    for (const stale of [
      { ...input, expectedWork: { ...input.expectedWork, revision: input.expectedWork.revision + 1 } },
      { ...input, expectedLedger: { ...input.expectedLedger, revision: input.expectedLedger.revision + 1 } },
      { ...input, expectedJournal: { ...input.expectedJournal, revision: input.expectedJournal.revision + 1 } },
      { ...input, expectedMaintenanceGeneration: input.expectedMaintenanceGeneration + 1 },
    ])
      expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(stale)).toThrow();
    expect(() =>
      f.store.captureHistoricalTerminalSynthesisAndRelease({ ...input, nativeSessionHandle: 'foreign-thread' }),
    ).toThrow(/original owner release/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1),
    ).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
  } finally {}
});

test('queued overlapping FIFO ownership blocks terminal custody release without effects', () => {
  const f = fixture();
  try {
    seedQueuedOverlap(f);
    const input = captureInput(f),
      before = f.store.readHostStateSnapshot(identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1);
    expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(input)).toThrow(/FIFO release differs/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1),
    ).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
  } finally {}
});

test('invalid terminal provenance or predecessor bindings deny before Host or Journal effects', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      before = f.store.readHostStateSnapshot(identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1),
      invalid = [
        { ...input.provenance, denial_reason_gap: 'GAP-FOREIGN' },
        {
          ...input.provenance,
          predecessor_refs: [input.provenance.predecessor_refs[0], input.provenance.predecessor_refs[0]],
        },
        {
          ...input.provenance,
          predecessor_refs: [
            { ...input.provenance.predecessor_refs[0], digest: 'invalid' },
            input.provenance.predecessor_refs[1],
          ],
        },
      ];
    for (const provenance of invalid)
      expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease({ ...input, provenance })).toThrow(
        /historical synthesis provenance invalid/,
      );
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1),
    ).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
  } finally {}
});

test('Host transaction rolls back owner release when immutable custody publication fails, then exact request can resume', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      before = f.store.readHostStateSnapshot(identity),
      journalBefore = f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1);
    f.db.exec(
      "CREATE TABLE agent_host_historical_terminal_synthesis_capture (workspace_id TEXT,work_id TEXT,attempt INTEGER,action_id TEXT,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt,action_id)); CREATE TRIGGER fail_historical_terminal_capture BEFORE INSERT ON agent_host_historical_terminal_synthesis_capture BEGIN SELECT RAISE(FAIL,'injected custody publication fault'); END;",
    );
    expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(input)).toThrow(/injected custody publication fault/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(
      f.db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(workspace, identity.work_id, 1),
    ).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
    f.db.exec('DROP TRIGGER fail_historical_terminal_capture');
    const result = f.store.captureHistoricalTerminalSynthesisAndRelease(input);
    expect(result.receipt.terminal_status).toBe('known_terminal_unaccepted');
    expect(f.store.readHostStateSnapshot(identity).work.lease).toBeNull();
  } finally {}
});
