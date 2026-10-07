import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { HostStateStore, openHostStateDatabase } from '../../src/host-state.ts';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { suspendLocalWork } from '../../src/orchestration/suspend-local-work.ts';

const workspaceId = 'a'.repeat(64);
const identity = {
  repository_id: 'vida-agent',
  project_ids: ['agent'],
  integrations_digest: '1'.repeat(64),
  work_id: 'task-source-expiry',
};
const resource = 'file:src/task.ts';

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function workAndLedger(expiresAt) {
  const scopeBody = {
    schema: 'ScopedSourceSnapshot/v1',
    entries: [{ path: 'src/task.ts', exists: true, bytes: 3, sha256: '2'.repeat(64) }],
  };
  const sourceScope = { ...scopeBody, digest: canonicalJsonDigest(scopeBody) };
  const activeClaim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-task-source-expiry',
    ticket_id: 'ticket-task-source-expiry',
    work_id: identity.work_id,
    thread_id: 'thread-task-source-expiry',
    generation: 1,
    resources: [resource],
    lease_expires_at: expiresAt,
    status: 'active',
    created_at: new Date().toISOString(),
    renewed_at: new Date().toISOString(),
  };
  const activeTicket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: 'ticket-task-source-expiry',
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    integrations_digest: identity.integrations_digest,
    work_id: identity.work_id,
    thread_id: activeClaim.thread_id,
    source_revision: sourceScope.digest,
    generation: 1,
    sequence: 1,
    contour_keys: ['tenant:tenant', 'project:tenant/agent', resource],
    exclusive_resources: [resource],
    status: 'active',
    claim_ids: [activeClaim.claim_id],
    expires_at: expiresAt,
    active_resources: [resource],
    blocked_resources: [],
    created_at: new Date().toISOString(),
  };
  const binding = {
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    integrations_digest: identity.integrations_digest,
    team_id: 'core',
    workflow_id: 'bug_fix',
    provider_work_item_id: 'external-task-source-expiry',
    lifecycle_work_id: identity.work_id,
    work_item_digest: '3'.repeat(64),
    work_source_revision: sourceScope.digest,
    scope_id: 'scope-task-source-expiry',
    scope_contract_digest: '4'.repeat(64),
    acceptance_manifest_digest: '5'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: [resource],
    config_digest: '6'.repeat(64),
    runtime_source_revision: '7'.repeat(64),
    schema_digest: '8'.repeat(64),
    runtime_code_digest: '9'.repeat(64),
  };
  const work = {
    schema: 'WorkState/v1',
    workspace_id: workspaceId,
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
      acceptance: { schema: 'AcceptanceManifest/v1', path: '.agent/acceptance.json', sha256: binding.acceptance_manifest_digest },
      decisions: [],
    },
    lease: { ticket_id: activeTicket.ticket_id, thread_id: activeTicket.thread_id, generation: activeTicket.generation },
    execution: {
      run_id: 'run-task-source-expiry',
      input_digest: 'a'.repeat(64),
      phase: 'implementation',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: sourceScope.digest,
      next_action: 'Trace the accepted work request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'fix',
      config_binding: { config_digest: binding.config_digest, schema_digest: binding.schema_digest, runtime_code_digest: binding.runtime_code_digest },
      scope: { scope_id: binding.scope_id, allowed_paths: ['src/task.ts'], fingerprint_paths: ['src/task.ts'], implementation_paths: ['src/task.ts'], documentation_paths: [] },
      seal: null,
      assurance: { epoch: 'epoch-1', review_generation: 0, correction_count: 0, review_failure_count: 0, delivery_cycle_id: null },
      references: [],
    },
    artifacts: [],
  };
  return {
    work,
    sourceScope,
    ledger: {
      schema: 'CoordinationLedger/v1',
      workspace_id: workspaceId,
      revision: 1,
      open_generation: 1,
      next_sequence: 2,
      tickets: [activeTicket],
      claims: [activeClaim],
      notices: [],
      dispositions: [],
      contours: [],
      batches: [],
      rebinds: [],
      operations: [],
      retirements: [],
    },
  };
}

function allowedPolicyDecision(request) {
  return {
    operation_id: request.operation_id,
    request_id: request.request_id,
    operation_hash: request.operation_hash,
    prepared_record_cas: request.prepared_record_cas,
    authorization: { decision: 'allow', receipt: { decision: 'allow' } },
    edictum_operation: { operation_hash: request.operation_hash, tenant: 'tenant', project: 'agent' },
    edictum_evaluation: { action: 'pending_approval', events: [], records: [] },
    source_authorization_reference: { schema: 'LifecycleArtifactReference/v1', record_id: 'source-auth' },
    source_authorization_sha256: 'c'.repeat(64),
    preflight_evidence_digest: 'd'.repeat(64),
  };
}

function createFixture({ expiresAt, policyVerifier }) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-task-source-coordination-'));
  mkdirSync(path.join(root, '.git'));
  const database = openHostStateDatabase(path.join(root, 'host.sqlite'));
  const store = new HostStateStore(
    database,
    workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    root,
    undefined,
    { verify: policyVerifier },
  );
  const seed = workAndLedger(expiresAt);
  const initial = store.compareAndSwapHostState({
    expectedWork: null,
    expectedLedger: null,
    nextWork: seed.work,
    nextLedger: seed.ledger,
  });
  const journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspaceId,
    work_id: identity.work_id,
    attempt: 1,
    run_id: seed.work.execution.run_id,
    step_id: null,
    source_scope: seed.sourceScope,
    items: [],
    completed: [],
  };
  database.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
    workspaceId,
    identity.work_id,
    1,
    1,
    canonicalJson(journal),
    canonicalJsonDigest(journal),
  );
  const request = {
    schema: 'TaskSourceBindingRequest/v1',
    operation: 'propose-create',
    operation_id: 'task-source-op-expiry',
    request_id: 'task-source-request-expiry',
    branch_ref: 'refs/heads/codex/task-source',
    expected_host: {
      work: initial.workVersion,
      ledger: initial.ledgerVersion,
      journal: { attempt: 1, version: { revision: 1, digest: canonicalJsonDigest(journal) } },
      maintenance_generation: initial.maintenanceGeneration,
    },
    work_id: identity.work_id,
    attempt: 1,
    thread_id: 'thread-task-source-expiry',
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    canonical_host_root: root,
    source_root: path.join(root, 'task-source'),
    config_digest: '6'.repeat(64),
    project_context_digest: 'b'.repeat(64),
  };
  return {
    root,
    database,
    store,
    initial,
    journal,
    request,
    prepare() {
      return store.prepareTaskSourceBindingOperation({
        request,
        identity,
        verifyCurrent: ({ journal: current }) => ({
          source_authorization_sha256: 'c'.repeat(64),
          source_scope_digest: current.source_scope.digest,
        }),
      });
    },
    seedPeerReservation() {
      const peerIdentity = { ...identity, work_id: 'task-source-peer' },
        peerThread = 'thread-task-source-peer',
        sourceRoot = path.resolve(root, 'task-source'),
        rootKey = process.platform === 'win32' ? sourceRoot.toLocaleLowerCase('en-US') : sourceRoot,
        peerResources = [
          'branch:' + request.branch_ref,
          'execution:' + peerIdentity.work_id,
          'file:peer.ts',
          'worktree:' + rootKey,
        ].sort(),
        peerTicketId = 'ticket-task-source-peer',
        peerClaimId = 'claim-task-source-peer',
        now = new Date().toISOString(),
        expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        current = store.readHostStateSnapshot(identity),
        peerWork = structuredClone(seed.work);
      peerWork.binding.lifecycle_work_id = peerIdentity.work_id;
      peerWork.binding.provider_work_item_id = 'external-task-source-peer';
      peerWork.binding.implementation_paths = ['peer.ts'];
      peerWork.binding.allowed_resources = peerResources;
      peerWork.lifecycle.scope = {
        ...peerWork.lifecycle.scope,
        allowed_paths: ['peer.ts'],
        fingerprint_paths: ['peer.ts'],
        implementation_paths: ['peer.ts'],
      };
      peerWork.execution.run_id = 'run-task-source-peer';
      peerWork.lease = { ticket_id: peerTicketId, thread_id: peerThread, generation: 1 };
      const peerTicket = {
        schema: 'CoordinationTicket/v1',
        ticket_id: peerTicketId,
        repository_id: peerIdentity.repository_id,
        project_ids: peerIdentity.project_ids,
        integrations_digest: peerIdentity.integrations_digest,
        work_id: peerIdentity.work_id,
        thread_id: peerThread,
        source_revision: seed.sourceScope.digest,
        generation: 1,
        sequence: current.ledger.next_sequence,
        contour_keys: ['tenant:tenant', 'project:tenant/agent', ...peerResources],
        exclusive_resources: peerResources,
        status: 'active',
        claim_ids: [peerClaimId],
        expires_at: expires,
        active_resources: peerResources,
        blocked_resources: [],
        created_at: now,
      };
      const peerClaim = {
        schema: 'WorkstreamClaim/v1',
        claim_id: peerClaimId,
        ticket_id: peerTicketId,
        work_id: peerIdentity.work_id,
        thread_id: peerThread,
        generation: 1,
        resources: peerResources,
        lease_expires_at: expires,
        status: 'active',
        created_at: now,
        renewed_at: now,
      };
      peerWork.binding.allowed_resources = [...peerResources];
      const peerHost = store.compareAndSwapHostState({
        expectedWork: null,
        expectedLedger: current.ledgerVersion,
        expectedMaintenanceGeneration: current.maintenanceGeneration,
        nextWork: peerWork,
        nextLedger: {
          ...current.ledger,
          revision: current.ledger.revision + 1,
          next_sequence: current.ledger.next_sequence + 1,
          tickets: [...current.ledger.tickets, peerTicket],
          claims: [...current.ledger.claims, peerClaim],
        },
      });
      const peerJournalState = {
        schema: 'MastraSessionLedger/v1',
        workspace_id: workspaceId,
        work_id: peerIdentity.work_id,
        attempt: 1,
        run_id: peerWork.execution.run_id,
        step_id: null,
        source_scope: seed.sourceScope,
        items: [],
        completed: [],
      };
      database.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
        workspaceId,
        peerIdentity.work_id,
        1,
        1,
        canonicalJson(peerJournalState),
        canonicalJsonDigest(peerJournalState),
      );
      const targetAfterPeerAdmission = store.readHostStateSnapshot(identity);
      request.expected_host = {
        ...request.expected_host,
        work: targetAfterPeerAdmission.workVersion,
        ledger: targetAfterPeerAdmission.ledgerVersion,
        maintenance_generation: targetAfterPeerAdmission.maintenanceGeneration,
      };
      return {
        identity: peerIdentity,
        thread_id: peerThread,
        journal: {
          state: peerJournalState,
          version: { revision: 1, digest: canonicalJsonDigest(peerJournalState) },
          resume_status: 'ready',
        },
        host: peerHost,
      };
    },
    close() {
      database.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('TaskSource uses a canonical FIFO reservation, then promotes the same ticket after a supported peer release', async () => {
  const fixture = createFixture({
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    policyVerifier: async ({ request }) => allowedPolicyDecision(request),
  });
  try {
    const peer = fixture.seedPeerReservation();
    fixture.prepare();
    const queued = await fixture.store.issueTaskSourceBindingOperation({ request: fixture.request, identity });
    expect(queued.status).toBe('queued');
    expect(queued.action).toBeNull();
    expect(queued.command_argv).toBeNull();
    let target = fixture.store.readHostStateSnapshot(identity);
    const ownTicketId = `task-source-ticket:${fixture.request.work_id}:${fixture.request.attempt}:${fixture.request.operation_id}`;
    let ticket = target.ledger.tickets.find((entry) => entry.ticket_id === ownTicketId);
    expect(ticket?.status).toBe('queued');
    expect(ticket?.claim_ids).toEqual([]);
    expect(ticket?.blocked_resources).toContain(`branch:${fixture.request.branch_ref}`);
    expect(target.work.lease.ticket_id).toBe('ticket-task-source-expiry');
    expect(fixture.database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_claim'").get()).toBeNull();
    expect(fixture.database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'").get()).toBeNull();

    const peerBeforeRelease = fixture.store.readHostStateSnapshot(peer.identity);
    const released = suspendLocalWork({
      store: fixture.store,
      identity: peer.identity,
      journal: peer.journal,
      expectedWork: peerBeforeRelease.workVersion,
      expectedLedger: peerBeforeRelease.ledgerVersion,
      expectedMaintenanceGeneration: peerBeforeRelease.maintenanceGeneration,
      nativeSessionHandle: peer.thread_id,
      userRequestPointer: 'user:release-task-source-peer',
      requestIntent: 'next_work',
      documentationContext: {
        repository_root: fixture.root,
        repository_id: peer.identity.repository_id,
        project_id: peer.identity.project_ids[0],
        work_id: peer.identity.work_id,
      },
    });
    expect(released.work.execution.status).toBe('suspended');
    expect(released.ledger.tickets.find((entry) => entry.ticket_id === 'ticket-task-source-peer')?.status).toBe('released');

    const issued = await fixture.store.issueTaskSourceBindingOperation({ request: fixture.request, identity });
    expect(issued.status).toBe('issued');
    expect(issued.action?.status).toBe('issued');
    expect(Array.isArray(issued.command_argv)).toBe(true);
    target = fixture.store.readHostStateSnapshot(identity);
    ticket = target.ledger.tickets.find((entry) => entry.ticket_id === ownTicketId);
    expect(ticket?.status).toBe('active');
    expect(ticket?.sequence).toBe(3);
    expect(target.work.lease.ticket_id).toBe(ownTicketId);
    expect(target.ledger.claims.filter((claim) => claim.ticket_id === ownTicketId && claim.status === 'active')).toHaveLength(1);
    expect(target.ledger.tickets.find((entry) => entry.ticket_id === 'ticket-task-source-expiry')?.status).toBe('released');
  } finally {
    fixture.close();
  }
});

test('issue rechecks canonical owner expiry after async policy before writing action or exposing argv', async () => {
  const expiresAt = new Date(Date.now() + 500).toISOString();
  const policyEntered = deferred(), resumePolicy = deferred();
  const fixture = createFixture({
    expiresAt,
    policyVerifier: async ({ request }) => {
      policyEntered.resolve();
      await resumePolicy.promise;
      return allowedPolicyDecision(request);
    },
  });
  try {
    fixture.prepare();
    const before = fixture.store.readHostStateSnapshot(identity);
    const issue = fixture.store.issueTaskSourceBindingOperation({ request: fixture.request, identity });
    const policyWait = await Promise.race([
      policyEntered.promise.then(() => 'entered'),
      issue.then(() => 'returned', (error) => { throw error; }),
    ]);
    expect(policyWait).toBe('entered');
    const remaining = Date.parse(expiresAt) - Date.now();
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining + 10));
    resumePolicy.resolve();

    await expect(issue).rejects.toThrow(/expiry|expired|stale/i);

    const after = fixture.store.readHostStateSnapshot(identity);
    expect(after.workVersion).toEqual(before.workVersion);
    expect(after.ledgerVersion).toEqual(before.ledgerVersion);
    expect(fixture.store.readWorkSessionJournal(identity)?.version).toEqual(fixture.request.expected_host.journal.version);
    expect(fixture.database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'").get()).toBeNull();
    expect(fixture.database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_claim'").get()).toBeNull();
  } finally {
    resumePolicy.resolve();
    fixture.close();
  }
});
