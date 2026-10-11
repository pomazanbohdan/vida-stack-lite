import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  HostStateStore,
  type HistoricalTerminalSynthesisCaptureRequest,
  type HistoricalTerminalSynthesisProvenance,
  type CoordinationClaim,
  type CoordinationLedger,
  type CoordinationTicket,
  type HostStateSnapshot,
  type MaintenanceFenceBinding,
  type MaintenanceReleaseVerifier,
  type StateVersion,
  type WorkIdentity,
  type WorkState,
} from '../src/host-state.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import { run } from '../bin/run.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';

interface JournalRow {
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
}

type RequiredHostSnapshot = Omit<HostStateSnapshot, 'work' | 'ledger' | 'workVersion' | 'ledgerVersion'> & {
  readonly work: WorkState;
  readonly ledger: NonNullable<HostStateSnapshot['ledger']>;
  readonly workVersion: StateVersion;
  readonly ledgerVersion: StateVersion;
};

interface Fixture {
  readonly root: string;
  readonly db: Database;
  readonly store: HostStateStore;
  readonly initial: RequiredHostSnapshot;
  readonly journal: MastraSessionLedgerState;
}

type CaptureFixtureInput = HistoricalTerminalSynthesisCaptureRequest & {
  readonly nextWork: WorkState;
  readonly nextLedger: CoordinationLedger;
  readonly before: RequiredHostSnapshot;
  readonly journal: MastraSessionLedgerState;
};

type PublicCaptureMode =
  | 'invalid_utf8'
  | 'unsafe_reference'
  | 'oversize'
  | 'not_blocked'
  | 'denial'
  | 'report_body_mismatch';

function requireHostSnapshot(snapshot: HostStateSnapshot): RequiredHostSnapshot {
  if (!snapshot.work || !snapshot.ledger || !snapshot.workVersion || !snapshot.ledgerVersion)
    throw new Error('Historical terminal capture fixture requires current Work and Ledger state.');
  return {
    ...snapshot,
    work: snapshot.work,
    ledger: snapshot.ledger,
    workVersion: snapshot.workVersion,
    ledgerVersion: snapshot.ledgerVersion,
  };
}

function readJournalRow(db: Database): JournalRow {
  const row = db
    .query<JournalRow, [string, string, number]>(
      'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
    )
    .get(workspace, identity.work_id, 1);
  if (!row) throw new Error('Historical terminal capture fixture requires its persisted Journal row.');
  return row;
}

function parseJournalPayload(payload: string): MastraSessionLedgerState {
  const value: unknown = JSON.parse(payload);
  return parseMastraSessionLedgerState(value);
}

function requiredActiveTicket(ledger: CoordinationLedger): CoordinationTicket {
  const ticket = ledger.tickets.find((entry) => entry.status === 'active');
  if (!ticket) throw new Error('Historical terminal capture fixture requires an active owner ticket.');
  return ticket;
}

function requiredActiveClaim(ledger: CoordinationLedger, ticketId: string): CoordinationClaim {
  const claim = ledger.claims.find((entry) => entry.ticket_id === ticketId && entry.status === 'active');
  if (!claim) throw new Error('Historical terminal capture fixture requires the owner claim.');
  return claim;
}

function requiredQueuedTicket(ledger: CoordinationLedger): CoordinationTicket {
  const ticket = ledger.tickets.find((entry) => entry.status === 'queued');
  if (!ticket) throw new Error('Historical terminal capture fixture requires its queued ticket.');
  return ticket;
}

function requiredLease(work: WorkState): NonNullable<WorkState['lease']> {
  if (!work.lease) throw new Error('Historical terminal capture fixture requires its original owner lease.');
  return work.lease;
}

function requiredLastOperation(ledger: CoordinationLedger): Readonly<Record<string, unknown>> {
  const operation = ledger.operations.at(-1);
  if (!operation) throw new Error('Historical terminal capture fixture requires a release operation.');
  return operation;
}

function requiredPredecessor(
  provenance: HistoricalTerminalSynthesisProvenance,
  index: number,
): HistoricalTerminalSynthesisProvenance['predecessor_refs'][number] {
  const predecessor = provenance.predecessor_refs[index];
  if (!predecessor) throw new Error('Historical terminal capture fixture requires both predecessor references.');
  return predecessor;
}

function requiredProjectId(workIdentity: WorkIdentity): string {
  const projectId = workIdentity.project_ids[0];
  if (projectId === undefined) throw new Error('Historical terminal capture fixture requires a project identity.');
  return projectId;
}

const workspace = 'a'.repeat(64);
const identity: WorkIdentity = {
  repository_id: 'fixture-repository',
  project_ids: ['agent'],
  integrations_digest: 'b'.repeat(64),
  work_id: 'fixture-work',
};
const roots: string[] = [];
const databases: Database[] = [];
const json = canonicalJson;

function lifecycle(binding: WorkState['binding'], revision = 1): WorkState['lifecycle'] {
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

function fixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), 'historical-terminal-capture-'));
  roots.push(root);
  const db = new Database(path.join(root, 'host.db'), { create: true, strict: true });
  databases.push(db);
  const store = new HostStateStore(db, workspace);
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['src/task.ts']);
  const binding: WorkState['binding'] = {
    repository_id: identity.repository_id,
    project_ids: [...identity.project_ids],
    integrations_digest: identity.integrations_digest,
    team_id: 'default-development',
    workflow_id: 'task_execution',
    provider_work_item_id: 'provider-work-item',
    lifecycle_work_id: identity.work_id,
    work_item_digest: 'c'.repeat(64),
    work_source_revision: source.digest,
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
    claim: CoordinationClaim = {
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
    ticket: CoordinationTicket = {
      schema: 'CoordinationTicket/v1',
      ticket_id: 'ticket-fixture',
      repository_id: identity.repository_id,
      project_ids: [...identity.project_ids],
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
    initial = requireHostSnapshot(
      store.compareAndSwapHostState({
        expectedWork: null,
        expectedLedger: null,
        nextWork: {
          schema: 'WorkState/v1',
          workspace_id: workspace,
          revision: 1,
          binding,
          contracts: {
            scope: {
              schema: 'ImplementationScope/v1',
              path: '.agent/scope.json',
              sha256: binding.scope_contract_digest,
            },
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
      }),
    );
  const journal: MastraSessionLedgerState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: 'run-fixture',
    step_id: 'wave-0',
    source_scope: source,
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

function captureInput(f: Fixture): CaptureFixtureInput {
  const before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
    ticket = requiredActiveTicket(before.ledger),
    claim = requiredActiveClaim(before.ledger, ticket.ticket_id),
    row = readJournalRow(f.db),
    journal = parseJournalPayload(row.payload),
    now = new Date(Date.now() + 60_000).toISOString(),
    body = Buffer.from('{"schema":"VidaSessionObservation/v1","status":"reported_complete"}\n');
  const nextWork: WorkState = {
      ...before.work,
      revision: before.work.revision + 1,
      lease: null,
      execution: { ...before.work.execution, status: 'suspended', phase: 'awaiting_followup' },
      lifecycle: {
        ...before.work.lifecycle,
        revision: before.work.revision + 1,
        next_action:
          'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.',
      },
    },
    nextLedger: CoordinationLedger = {
      ...before.ledger,
      revision: before.ledger.revision + 1,
      tickets: before.ledger.tickets.map((entry) =>
        entry.ticket_id === ticket.ticket_id
          ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
          : entry,
      ),
      claims: before.ledger.claims.map((entry) =>
        entry.claim_id === claim.claim_id ? { ...entry, status: 'released', renewed_at: now } : entry,
      ),
      operations: [
        ...before.ledger.operations,
        {
          schema: 'CoordinationOperation/v1',
          operation_id: 'capture-release-fixture',
          kind: 'release',
          ticket_id: ticket.ticket_id,
          work_id: identity.work_id,
          thread_id: 'fixture-thread',
          source_revision: ticket.source_revision,
          resources: [...ticket.exclusive_resources],
          from_ledger_revision: before.ledger.revision,
          to_ledger_revision: before.ledger.revision + 1,
          decided_by: 'fixture-thread',
          decision_pointer: 'fixture:human-request',
          created_at: now,
        },
      ],
    };
  const provenance: HistoricalTerminalSynthesisProvenance = {
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
      project_id: requiredProjectId(identity),
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

function appendSameOwnerQueuedTicket(f: Fixture) {
  const before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
    owner = requiredActiveTicket(before.ledger),
    now = new Date().toISOString();
  const work: WorkState = {
      ...before.work,
      revision: before.work.revision + 1,
      lifecycle: { ...before.work.lifecycle, revision: before.work.revision + 1 },
    },
    queued: CoordinationTicket = {
      ...owner,
      ticket_id: 'ticket-queued-same-owner',
      sequence: before.ledger.next_sequence,
      project_ids: [...owner.project_ids],
      contour_keys: [...owner.contour_keys],
      exclusive_resources: [...owner.exclusive_resources],
      status: 'queued',
      claim_ids: [],
      expires_at: null,
      active_resources: [],
      blocked_resources: [...owner.exclusive_resources],
      created_at: now,
    },
    ledger: CoordinationLedger = {
      ...before.ledger,
      revision: before.ledger.revision + 1,
      next_sequence: before.ledger.next_sequence + 1,
      tickets: [...before.ledger.tickets, queued],
    };
  return f.store.compareAndSwapHostState({
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    nextWork: work,
    nextLedger: ledger,
  });
}

function seedQueuedOverlap(f: Fixture) {
  const before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
    owner = requiredActiveTicket(before.ledger),
    now = new Date().toISOString();
  const work: WorkState = {
      ...before.work,
      revision: before.work.revision + 1,
      lifecycle: { ...before.work.lifecycle, revision: before.work.revision + 1 },
    },
    queued: CoordinationTicket = {
      ...owner,
      ticket_id: 'ticket-queued-fixture',
      work_id: identity.work_id,
      thread_id: 'queued-fixture-thread',
      sequence: before.ledger.next_sequence,
      project_ids: [...owner.project_ids],
      contour_keys: [...owner.contour_keys],
      exclusive_resources: [...owner.exclusive_resources],
      status: 'queued',
      claim_ids: [],
      expires_at: null,
      active_resources: [],
      blocked_resources: [...owner.exclusive_resources],
      created_at: now,
    },
    ledger: CoordinationLedger = {
      ...before.ledger,
      revision: before.ledger.revision + 1,
      next_sequence: before.ledger.next_sequence + 1,
      tickets: [...before.ledger.tickets, queued],
    };
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

function publicCaptureFixture({ mode = 'invalid_utf8' }: { readonly mode?: PublicCaptureMode } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'historical-terminal-cli-'));
  roots.push(root);
  mkdirSync(path.join(root, '.git'));
  mkdirSync(path.join(root, '.tmp'));
  writeFileSync(path.join(root, 'AGENTS.md'), 'Synthetic isolated fixture.\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic source map.\n');
  const identity: WorkIdentity = {
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
    bodyData = {
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
    inputData = { status: bodyData.status, agent_id: bodyData.agent_id, tool_call_ref: bodyData.tool_call_ref },
    denialData = {
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: mode === 'denial' ? 'GAP-FOREIGN' : 'GAP-VIDA-RUN-EXECUTION-001',
      message: 'The requested run was blocked by runtime validation.',
    },
    reportData = {
      exit_code: 1,
      input_path: path.resolve(root, base.input_ref),
      command: ['vida-agent', '--report', path.resolve(root, '.tmp/report-body.json')],
      stderr: JSON.stringify(denialData),
    };
  const requestValue: unknown = base,
    bodyValue: unknown = bodyData,
    inputValue: unknown = inputData,
    reportValue: unknown = reportData,
    reportBodyValue: unknown =
      mode === 'report_body_mismatch' ? { ...bodyData, evidence_refs: ['different-evidence'] } : bodyData;
  writeFileSync(path.join(root, '.tmp/request.json'), json(requestValue));
  writeFileSync(path.join(root, '.tmp/body.json'), mode === 'invalid_utf8' ? Buffer.from([0xff]) : json(bodyValue));
  writeFileSync(path.join(root, '.tmp/input.json'), json(inputValue));
  writeFileSync(path.join(root, '.tmp/report.json'), json(reportValue));
  writeFileSync(path.join(root, '.tmp/report-body.json'), json(reportBodyValue));
  if (mode === 'oversize') writeFileSync(path.join(root, '.tmp/body.json'), Buffer.alloc(65537, 32));
  return { root, identity, request: base };
}

const publicCaptureCases: readonly (readonly [PublicCaptureMode, RegExp])[] = [
  ['invalid_utf8', /not valid UTF-8/],
  ['unsafe_reference', /references/],
  ['oversize', /exceeds bound/],
  ['not_blocked', /not a blocked unaccepted candidate/],
  ['denial', /original report denial differs/],
  ['report_body_mismatch', /retained synthesis body, follow-up or report body differs/],
];

test.each(publicCaptureCases)(
  'public capture CLI denies %s before Host effects',
  async (mode, expected) => {
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
    await Promise.resolve(
      expect(
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
      ).rejects.toThrow(expected),
    );
    expect(tracked.map((relative) => readFileSync(path.join(f.root, relative)))).toEqual(before);
    expect(existsSync(path.join(f.root, '.agent/work/session-handoff.v1.sqlite'))).toBe(false);
  },
  30000,
);

test('known-terminal custody and original-owner release commit atomically and exact retry preserves rights', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      receipt = f.store.captureHistoricalTerminalSynthesisAndRelease(input).receipt,
      after = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      journalAfter = readJournalRow(f.db);
    expect(receipt.terminal_status).toBe('known_terminal_unaccepted');
    expect(receipt.task_status).toBe('unfinished');
    expect(receipt.body_base64).toBe(Buffer.from(input.bodyBytes).toString('base64'));
    expect(Buffer.from(receipt.body_base64, 'base64')).toEqual(Buffer.from(input.bodyBytes));
    expect(receipt.rights_granted).toBe(false);
    expect(receipt.accepted_result).toBe(false);
    expect(receipt.runtime_acceptance).toBe(false);
    expect(after.work.lease).toBeNull();
    expect(after.work.execution.status).toBe('suspended');
    expect(after.work.execution.assignment_attempts).toEqual(f.initial.work.execution.assignment_attempts);
    expect(after.work.binding).toEqual(f.initial.work.binding);
    expect(after.work.artifacts).toEqual(f.initial.work.artifacts);
    expect(after.work.lifecycle.phase).toBe(f.initial.work.lifecycle.phase);
    expect(after.ledger.tickets.at(0)?.status).toBe('released');
    expect(after.ledger.claims.at(0)?.status).toBe('released');
    expect(journalAfter.revision).toBe(input.expectedJournal.revision);
    expect(journalAfter.digest).toBe(input.expectedJournal.digest);
    expect(parseJournalPayload(journalAfter.payload)).toEqual(input.journal);
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
  } finally {
  }
});

test('exact terminal synthesis receipt verification is read-only and binds all request bytes', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      receipt = f.store.captureHistoricalTerminalSynthesisAndRelease(input).receipt,
      hostBefore = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      journalBefore = readJournalRow(f.db),
      readOnlyDatabase = new Database(path.join(f.root, 'host.db'), { readonly: true, strict: true });
    databases.push(readOnlyDatabase);
    const readOnlyStore = new HostStateStore(
        readOnlyDatabase,
        workspace,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      ),
      verified = readOnlyStore.readHistoricalTerminalSynthesisCaptureForRequest(input);
    expect(verified?.receipt).toEqual(receipt);
    expect(verified?.snapshot).toEqual(hostBefore);
    expect(() =>
      readOnlyStore.readHistoricalTerminalSynthesisCaptureForRequest({
        ...input,
        bodyBytes: Buffer.from('changed terminal body'),
      }),
    ).toThrow(/exact retry differs/);
    expect(() =>
      readOnlyStore.readHistoricalTerminalSynthesisCaptureForRequest({
        ...input,
        bodyBytes: new Uint8Array(65537),
      }),
    ).toThrow(/body is invalid or oversized/);
    const advancedLedger = { ...hostBefore.ledger, revision: hostBefore.ledger.revision + 1 },
      ledgerPayload = json(advancedLedger);
    f.db
      .query(
        "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND id='shared'",
      )
      .run(advancedLedger.revision, ledgerPayload, canonicalJsonDigest(advancedLedger), workspace);
    expect(() => readOnlyStore.readHistoricalTerminalSynthesisCaptureForRequest(input)).toThrow(
      /dependent Host or Journal write/,
    );
    expect(requireHostSnapshot(f.store.readHostStateSnapshot(identity)).work.lease).toBeNull();
    expect(readJournalRow(f.db)).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toEqual(receipt);
  } finally {
  }
});

test('read-only terminal synthesis verification preserves pending and UNKNOWN producer custody', () => {
  const statuses: readonly ('reserved' | 'commit_unknown')[] = ['reserved', 'commit_unknown'];
  for (const status of statuses) {
    const f = fixture(),
      input = captureInput(f),
      receipt = f.store.captureHistoricalTerminalSynthesisAndRelease(input).receipt,
      marker = {
        schema: 'OperationReservation/v1',
        store_id: 'vida-session-producers',
        operation_key: 'b'.repeat(64),
        request_digest: 'c'.repeat(64),
        revision: 1,
        fencing_token: randomUUID(),
        status,
        created_at: new Date().toISOString(),
        ...(status === 'commit_unknown' ? { terminal_revision: 2 } : {}),
      },
      generation = randomUUID(),
      revision = status === 'reserved' ? 1 : 2;
    f.db.query('INSERT INTO agent_host_governance_stores VALUES(?,?,?,?)').run(
      workspace,
      marker.store_id,
      generation,
      canonicalJsonDigest({
        workspace_id: workspace,
        store_id: marker.store_id,
        kind: 'store',
        record_key: generation,
        revision: 1,
        payload: null,
      }),
    );
    f.db.query('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)').run(
      workspace,
      marker.store_id,
      'operation',
      marker.operation_key,
      revision,
      json(marker),
      canonicalJsonDigest({
        workspace_id: workspace,
        store_id: marker.store_id,
        kind: 'operation',
        record_key: marker.operation_key,
        revision,
        payload: marker,
      }),
    );
    const before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      markersBefore = f.db.query('SELECT * FROM agent_host_governance ORDER BY store_id,record_key').all(),
      readOnlyDatabase = new Database(path.join(f.root, 'host.db'), { readonly: true, strict: true });
    databases.push(readOnlyDatabase);
    const reader = new HostStateStore(
      readOnlyDatabase,
      workspace,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true,
    );
    expect(() => reader.readHistoricalTerminalSynthesisCaptureForRequest(input)).toThrow(/pending or unknown/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(f.db.query('SELECT * FROM agent_host_governance ORDER BY store_id,record_key').all()).toEqual(markersBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toEqual(receipt);
  }
});

test('terminal synthesis releases only the original owner and preserves same-owner queued tickets and operations', () => {
  const f = fixture();
  try {
    appendSameOwnerQueuedTicket(f);
    const before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      input = captureInput(f),
      queued = requiredQueuedTicket(before.ledger),
      priorOperations = before.ledger.operations;
    const result = f.store.captureHistoricalTerminalSynthesisAndRelease(input),
      after = requireHostSnapshot(result.snapshot),
      retainedQueued = after.ledger.tickets.find((entry) => entry.ticket_id === queued.ticket_id);
    expect(after.work.lease).toBeNull();
    expect(after.ledger.tickets.find((entry) => entry.ticket_id === requiredLease(before.work).ticket_id)?.status).toBe(
      'released',
    );
    expect(retainedQueued).toEqual(queued);
    expect([...after.ledger.operations.slice(0, priorOperations.length)]).toEqual([...priorOperations]);
    expect(after.ledger.operations).toHaveLength(priorOperations.length + 1);
    expect(after.ledger.operations.at(-1)?.ticket_id).toBe(requiredLease(before.work).ticket_id);
  } finally {
  }
});

test('terminal synthesis exact retry denies after a completed maintenance generation without changing Host or Journal', async () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      receipt = f.store.captureHistoricalTerminalSynthesisAndRelease(input).receipt,
      hostBeforeMaintenance = f.db
        .query('SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id')
        .all(workspace),
      journalBeforeMaintenance = readJournalRow(f.db),
      verifier: MaintenanceReleaseVerifier = {
        principal: 'fixture:maintenance-host',
        projectIds: ['agent'],
        verify: (fence) => ({
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: 'fixture:maintenance-host',
          fence_digest: canonicalJsonDigest(fence),
          closure_digest: fence.binding.closure_digest,
          bundle_digest: fence.binding.bundle_digest,
        }),
      },
      maintenance = new HostStateStore(f.db, workspace, undefined, undefined, undefined, verifier),
      binding: MaintenanceFenceBinding = {
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
    const releasedFence = maintenance.readMaintenanceFence();
    if (!releasedFence) throw new Error('Historical terminal maintenance fixture lost its released fence.');
    expect(releasedFence.generation).toBe(input.expectedMaintenanceGeneration + 1);
    expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(input)).toThrow(
      /maintenance generation is stale or missing/,
    );
    expect(
      f.db
        .query('SELECT kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? ORDER BY kind,id')
        .all(workspace),
    ).toEqual(hostBeforeMaintenance);
    expect(readJournalRow(f.db)).toEqual(journalBeforeMaintenance);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toEqual(receipt);
  } finally {
  }
});

test.each(['changed queued ticket', 'extra release operation'])(
  'Host rejects terminal synthesis release with %s without effects',
  (change: 'changed queued ticket' | 'extra release operation') => {
    const f = fixture();
    try {
      appendSameOwnerQueuedTicket(f);
      const input = captureInput(f),
        before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
        journalBefore = readJournalRow(f.db);
      if (change === 'changed queued ticket') {
        const alteredLedger: CoordinationLedger = {
            ...input.nextLedger,
            tickets: input.nextLedger.tickets.map((entry) =>
              entry.ticket_id === 'ticket-queued-same-owner'
                ? { ...entry, status: 'released', blocked_resources: [], expires_at: null }
                : entry,
            ),
          },
          alteredInput: HistoricalTerminalSynthesisCaptureRequest = { ...input, nextLedger: alteredLedger };
        expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(alteredInput)).toThrow(
          /historical synthesis custody release operation is incomplete/,
        );
      } else {
        const alteredLedger: CoordinationLedger = {
            ...input.nextLedger,
            operations: [
              ...input.nextLedger.operations,
              { ...requiredLastOperation(input.nextLedger), operation_id: 'extra-release' },
            ],
          },
          alteredInput: HistoricalTerminalSynthesisCaptureRequest = { ...input, nextLedger: alteredLedger };
        expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(alteredInput)).toThrow(
          /historical synthesis custody release operation is incomplete/,
        );
      }
      expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
      expect(readJournalRow(f.db)).toEqual(journalBefore);
      expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
    } finally {
    }
  },
);

test('stale Work, Ledger, Journal or maintenance versions and foreign owner deny before effects', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      journalBefore = readJournalRow(f.db);
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
    expect(readJournalRow(f.db)).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
  } finally {
  }
});

test('queued overlapping FIFO ownership blocks terminal custody release without effects', () => {
  const f = fixture();
  try {
    seedQueuedOverlap(f);
    const input = captureInput(f),
      before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      journalBefore = readJournalRow(f.db);
    expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(input)).toThrow(/FIFO release differs/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(readJournalRow(f.db)).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
  } finally {
  }
});

test('invalid terminal provenance or predecessor bindings deny before Host or Journal effects', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      journalBefore = readJournalRow(f.db),
      firstPredecessor = requiredPredecessor(input.provenance, 0),
      secondPredecessor = requiredPredecessor(input.provenance, 1),
      invalid: unknown[] = [
        {
          ...input.provenance,
          denial_reason_gap: 'GAP-FOREIGN',
        },
        {
          ...input.provenance,
          predecessor_refs: [firstPredecessor, firstPredecessor],
        },
        {
          ...input.provenance,
          predecessor_refs: [{ ...firstPredecessor, digest: 'invalid' }, secondPredecessor],
        },
      ];
    for (const provenance of invalid)
      expect(() => {
        Reflect.apply(f.store.captureHistoricalTerminalSynthesisAndRelease.bind(f.store), undefined, [
          { ...input, provenance },
        ]);
      }).toThrow(/historical synthesis provenance invalid/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(readJournalRow(f.db)).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
  } finally {
  }
});

test('Host transaction rolls back owner release when immutable custody publication fails, then exact request can resume', () => {
  const f = fixture();
  try {
    const input = captureInput(f),
      before = requireHostSnapshot(f.store.readHostStateSnapshot(identity)),
      journalBefore = readJournalRow(f.db);
    f.db.exec(
      "CREATE TABLE agent_host_historical_terminal_synthesis_capture (workspace_id TEXT,work_id TEXT,attempt INTEGER,action_id TEXT,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt,action_id)); CREATE TRIGGER fail_historical_terminal_capture BEFORE INSERT ON agent_host_historical_terminal_synthesis_capture BEGIN SELECT RAISE(FAIL,'injected custody publication fault'); END;",
    );
    expect(() => f.store.captureHistoricalTerminalSynthesisAndRelease(input)).toThrow(
      /injected custody publication fault/,
    );
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(readJournalRow(f.db)).toEqual(journalBefore);
    expect(f.store.readHistoricalTerminalSynthesisCapture(identity, 1, input.actionId)).toBeNull();
    f.db.exec('DROP TRIGGER fail_historical_terminal_capture');
    const result = f.store.captureHistoricalTerminalSynthesisAndRelease(input);
    expect(result.receipt.terminal_status).toBe('known_terminal_unaccepted');
    expect(requireHostSnapshot(f.store.readHostStateSnapshot(identity)).work.lease).toBeNull();
  } finally {
  }
});
