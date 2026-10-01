import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { executeDocumentationClearOperation } from '../../src/documentation/clear.ts';
import {
  assertCodexDesktopAdapterContract,
  HostStateStore,
  openHostStateDatabase,
  inspectHostWorkspaceDatabase,
  workMigrationId,
} from '../../src/host-state.ts';
import * as trustedHostSurface from '../../src/trusted-host.ts';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../../src/config/project-context.ts';
import { createTestTrustedHostLauncherCapability, createTrustedHostComposition } from '../../src/runtime-kernel.ts';
import { createConfiguredMastra } from '../../src/orchestration/mastra-boundary.ts';
import { suspendLocalWork, suspendCompletedReadOnlyWork } from '../../src/orchestration/suspend-local-work.ts';
import { acquireLocalSourceWriterLease } from '../../src/orchestration/local-work-admission.ts';
import { resumePausedLocalWork } from '../../src/orchestration/resume-paused-local-work.ts';
import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  createHostOperationReservationStore,
} from '../../src/governance/edictum-boundary.ts';

const workspace = 'a'.repeat(64);
const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const identity = {
  repository_id: 'project-repository',
  project_ids: ['project'],
  integrations_digest: 'e'.repeat(64),
  work_id: 'work',
};
let root, databasePath, database, store;
const handles = [];
const children = [];
const clone = (value) => JSON.parse(JSON.stringify(value));

test('trusted host source entrypoint exposes host state without a test issuer', () => {
  expect(trustedHostSurface.HostStateStore).toBe(HostStateStore);
  expect(trustedHostSurface.openHostStateDatabase).toBe(openHostStateDatabase);
  expect(typeof trustedHostSurface.createTrustedHostComposition).toBe('function');
  expect('createTestTrustedHostLauncherCapability' in trustedHostSurface).toBe(false);
});
test('Codex Desktop adapter contract binds identity, digests, opaque host capability and service closure', () => {
  const contract = {
    schema: 'CodexDesktopAdapterContract/v1',
    issuer: 'codex-desktop',
    session_id: 'session-1',
    thread_id: 'thread-1',
    repository_id: 'repository',
    project_ids: ['project'],
    integrations_digest: 'a'.repeat(64),
    principal: 'codex:desktop',
    repository_root: root,
    config_digest: 'b'.repeat(64),
    schema_digest: 'c'.repeat(64),
    source_digest: 'd'.repeat(64),
    bundle_digest: 'e'.repeat(64),
    issuer_attestation_digest: 'f'.repeat(64),
    host_capability: store.governanceCapability,
    services: {
      runtime_revision: () => undefined,
      resolve_identity: () => undefined,
      verify_approval: () => undefined,
      cas_writer: () => undefined,
      workflow_attempts: {
        claimWorkflowAssignment: () => undefined,
        completeWorkflowAttempt: () => undefined,
        markWorkflowAttemptUncertain: () => undefined,
      },
    },
  };
  expect(assertCodexDesktopAdapterContract(contract)).toBe(contract);
  expect(() => assertCodexDesktopAdapterContract({ ...contract, host_capability: {} })).toThrow(
    /opaque SQLite capability/,
  );
  expect(() => assertCodexDesktopAdapterContract({ ...contract, thread_id: '' })).toThrow(/identity or digest binding/);
  expect(() => assertCodexDesktopAdapterContract({ ...contract, issuer_attestation_digest: 'not-a-digest' })).toThrow(
    /identity or digest binding/,
  );
  expect(() =>
    assertCodexDesktopAdapterContract({ ...contract, services: { ...contract.services, cas_writer: null } }),
  ).toThrow(/service closure/);
});
test('trusted host composition rejects missing governance before loading project configuration', async () => {
  const launcher = createTestTrustedHostLauncherCapability({
    authentication: {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: 'project-repository',
      projectIds: ['project'],
      integrationsDigest: 'e'.repeat(64),
      principal: 'fixture:executor',
      configRevision: 1,
      permittedOperations: ['runtime.read'],
    },
    services: {
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'fixture', currentRevision: 1 }),
      casWriter: () => undefined,
    },
  });
  await expect(createTrustedHostComposition(launcher)).rejects.toThrow(/host governance capability is required/);
});
function lifecycle(binding, revision = 1) {
  return {
    schema: 'LifecycleState/v1',
    revision,
    phase: 'INTAKE',
    source_revision: binding.work_source_revision,
    next_action: 'Trace the accepted work request.',
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
      allowed_paths: binding.allowed_resources
        .filter((value) => value.startsWith('file:'))
        .map((value) => value.slice(5)),
      fingerprint_paths: binding.implementation_paths,
      implementation_paths: binding.implementation_paths,
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
function fixture(id = 'work', resource = 'file:src/task.ts') {
  const binding = {
    repository_id: 'project-repository',
    project_ids: ['project'],
    integrations_digest: 'e'.repeat(64),
    team_id: 'team',
    workflow_id: 'bug_fix',
    provider_work_item_id: 'external-' + id,
    lifecycle_work_id: id,
    work_item_digest: 'b'.repeat(64),
    work_source_revision: 'source',
    scope_id: 'scope-' + id,
    scope_contract_digest: 'c'.repeat(64),
    acceptance_manifest_digest: 'd'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: [resource.slice(5)],
    allowed_resources: [resource],
    config_digest: 'e'.repeat(64),
    runtime_source_revision: 'runtime-source',
    schema_digest: 'f'.repeat(64),
    runtime_code_digest: '0'.repeat(64),
  };
  const leaseExpiresAt = new Date(Date.now() + 3600_000).toISOString();
  const claim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-' + id,
    ticket_id: 'ticket-' + id,
    work_id: id,
    thread_id: 'thread',
    generation: 1,
    resources: [resource],
    lease_expires_at: leaseExpiresAt,
    status: 'active',
    created_at: new Date().toISOString(),
    renewed_at: new Date().toISOString(),
  };
  const ticket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: 'ticket-' + id,
    repository_id: 'project-repository',
    project_ids: ['project'],
    integrations_digest: 'e'.repeat(64),
    work_id: id,
    thread_id: 'thread',
    source_revision: 'source',
    generation: 1,
    sequence: 1,
    contour_keys: ['tenant:tenant', 'project:tenant/project', resource],
    exclusive_resources: [resource],
    status: 'active',
    claim_ids: [claim.claim_id],
    expires_at: leaseExpiresAt,
    active_resources: [resource],
    blocked_resources: [],
    created_at: new Date().toISOString(),
  };
  return {
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
        run_id: 'run-' + id,
        input_digest: '1'.repeat(64),
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
  };
}
function next(snapshot = store.readHostStateSnapshot(identity)) {
  const work = clone(snapshot.work),
    ledger = clone(snapshot.ledger);
  work.revision++;
  work.lifecycle.revision++;
  ledger.revision++;
  return {
    expectedWork: clone(snapshot.workVersion),
    expectedLedger: clone(snapshot.ledgerVersion),
    expectedMaintenanceGeneration: snapshot.maintenanceGeneration,
    nextWork: work,
    nextLedger: ledger,
  };
}

test('successor admission atomically releases predecessor rights and rejects changed retry or stale CAS', () => {
  const first = store.compareAndSwapHostState(fixture('work', 'file:src/one.ts'));
  const journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: 'work',
    attempt: 1,
    run_id: 'run-work',
    step_id: 'wave0',
    items: [],
    completed: [],
  };
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspace, 'work', 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
  const incoming = includeExistingLedger(fixture('successor', 'file:src/two.ts'), first.ledger);
  const request = {
    ...incoming,
    expectedLedger: first.ledgerVersion,
    expectedMaintenanceGeneration: first.maintenanceGeneration,
    nativeSessionHandle: 'thread',
    requestPointer: 'user:second',
    predecessors: [
      {
        identity,
        expectedWork: first.workVersion,
        attempt: 1,
        expectedJournal: { revision: 1, digest: canonicalJsonDigest(journal) },
        requestPointer: 'user:first',
      },
    ],
    verifySuccessor() {},
    verifyCurrent(work, current, pointer) {
      expect(pointer).toBe('user:first');
      expect(current).toEqual(journal);
    },
  };
  delete request.expectedWork;
  const bad = {
    ...request,
    predecessors: [
      { ...request.predecessors[0], expectedJournal: { revision: 2, digest: canonicalJsonDigest(journal) } },
    ],
  };
  expect(() => store.admitSuccessorWork(bad)).toThrow(/journal CAS/);
  expect(store.readHostStateSnapshot(identity)).toEqual(first);
  expect(store.readHostStateSnapshot({ ...identity, work_id: 'successor' }).work).toBeNull();
  const admitted = store.admitSuccessorWork(request);
  const prior = store.readHostStateSnapshot(identity);
  expect(prior.work.lease).toBeNull();
  expect(prior.work.execution.status).toBe('suspended');
  expect(prior.work.lifecycle.phase).toBe(first.work.lifecycle.phase);
  expect(prior.work.artifacts).toEqual(first.work.artifacts);
  expect(prior.work.request_transition.successor_work_id).toBe('successor');
  expect(admitted.work.request_transition.predecessor_work_ids).toEqual(['work']);
  expect(admitted.ledger.claims.find((claim) => claim.work_id === 'work').status).toBe('released');
  expect(store.admitSuccessorWork(request)).toEqual(admitted);
  expect(() => store.admitSuccessorWork({ ...request, requestPointer: 'user:changed' })).toThrow(/retry differs/);
  expect(
    JSON.parse(
      database.query('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?').get('work').payload,
    ),
  ).toEqual(journal);
});

test('bundled work-state repair plans atomically, resumes exact postimages and restores without evidence loss', () => {
  const original = store.compareAndSwapHostState(fixture());
  const inspection = store.repairRequestTransitionFields({ mode: 'inspect', operationId: 'fixture-repair' });
  expect(inspection.changed_work).toHaveLength(1);
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  const plan = store.repairRequestTransitionFields({
    mode: 'plan',
    operationId: 'fixture-repair',
    actor: 'fixture-owner',
  });
  expect(plan.status).toBe('planned');
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  const applied = store.repairRequestTransitionFields({ mode: 'apply', operationId: 'fixture-repair' });
  expect(applied.status).toBe('applied');
  const saved = store.readHostStateSnapshot(identity);
  expect(saved.work.request_transition).toBeNull();
  expect(saved.work.artifacts).toEqual(original.work.artifacts);
  expect(saved.work.execution).toEqual(original.work.execution);
  expect(saved.ledgerVersion).toEqual(original.ledgerVersion);
  expect(store.repairRequestTransitionFields({ mode: 'resume', operationId: 'fixture-repair' })).toEqual(applied);
  const restored = store.repairRequestTransitionFields({ mode: 'restore', operationId: 'fixture-repair' });
  expect(restored.status).toBe('restored');
  const after = store.readHostStateSnapshot(identity);
  expect(Object.hasOwn(after.work, 'request_transition')).toBe(false);
  expect(after.work.revision).toBe(saved.work.revision + 1);
  expect(after.work.lifecycle.phase).toBe(original.work.lifecycle.phase);
  expect(after.work.lifecycle.assurance).toEqual(original.work.lifecycle.assurance);
  expect(store.repairRequestTransitionFields({ mode: 'restore', operationId: 'fixture-repair' })).toEqual(restored);
});

test('readonly canonical workspace inspection preserves populated governance and database bytes', async () => {
  const original = store.compareAndSwapHostState(fixture());
  const operation = store.reserveOperation('inspection','1'.repeat(64),'2'.repeat(64));
  store.transitionOperation(operation,'commit_unknown');
  store.transitionOperation(operation,'applied','3'.repeat(64));
  const bytes = await readFile(databasePath);
  const schema = database.query("SELECT name,sql FROM sqlite_master ORDER BY name").all();
  const journalMode = database.query('PRAGMA journal_mode').get();
  const observed = inspectHostWorkspaceDatabase(databasePath, workspace);
  expect(observed.schema).toBe('HostWorkspaceInspection/v1');
  expect(observed.work[0].state).toEqual(original.work);
  expect(observed.ledger_version).toEqual(original.ledgerVersion);
  expect(observed.governance).toHaveLength(1);
  expect(observed.governance[0].state.status).toBe('applied');
  expect(await readFile(databasePath)).toEqual(bytes);
  expect(database.query("SELECT name,sql FROM sqlite_master ORDER BY name").all()).toEqual(schema);
  expect(database.query('PRAGMA journal_mode').get()).toEqual(journalMode);
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  expect(() => inspectHostWorkspaceDatabase(path.join(root, 'missing.sqlite'), workspace)).toThrow();
});

test('same live writer heartbeat preserves its fence and unknown outcome while revocation and expiry deny renewal', () => {
  let state = store.compareAndSwapHostState(fixture());
  const started = store.claimWorkflowAttempt({
    identity,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    stageId: 'implementation',
    assignmentIndex: 0,
    requestDigest: '5'.repeat(64),
    lease: clone(state.work.lease),
  });
  state = store.readHostStateSnapshot(identity);
  const journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: 'work',
    attempt: 1,
    run_id: 'run-work',
    step_id: 'writer-wave',
    items: [
      { issue_id: 'fixture-issued', observation: null, host_reservation: { receipt: { attempt: started.attempt } } },
    ],
    completed: [],
  };
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspace, 'work', 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
  const request = {
    identity,
    attempt: 1,
    nativeSessionHandle: 'thread',
    generation: 1,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: { revision: 1, digest: canonicalJsonDigest(journal) },
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    verifyCurrent() {},
  };
  expect(() =>
    store.renewActiveLocalLease({
      ...request,
      verifyCurrent() {
        throw Error('source authority revoked');
      },
    }),
  ).toThrow(/revoked/);
  expect(store.readHostStateSnapshot(identity)).toEqual(state);
  const renewed = store.renewActiveLocalLease(request);
  expect(renewed.work.lease).toEqual(state.work.lease);
  expect(renewed.work.execution.assignment_attempts).toEqual(state.work.execution.assignment_attempts);
  expect(renewed.work.execution.assignment_attempts[0].status).toBe('started');
  const row = database
    .query('SELECT revision,payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
    .get('work');
  expect(row.revision).toBe(2);
  expect(JSON.parse(row.payload)).toEqual(journal);
  expect(() => store.renewActiveLocalLease({ ...request, nativeSessionHandle: 'foreign' })).toThrow();
  const readClock = Date.now;
  const expiredClock = Date.parse(renewed.ledger.tickets.find((ticket) => ticket.ticket_id === renewed.work.lease.ticket_id).expires_at) + 1;
  try {
    Date.now = () => expiredClock;
    expect(() => store.renewActiveLocalLease({
      ...request,
      expectedWork: renewed.workVersion,
      expectedLedger: renewed.ledgerVersion,
      expectedJournal: { revision: row.revision, digest: canonicalJsonDigest(journal) },
    })).toThrow(/live expiry differs/);
    expect(store.readHostStateSnapshot(identity)).toEqual(renewed);
  } finally { Date.now = readClock; }
});
function quiesceImportedState(states, ledger) {
  for (const state of states) {
    state.lease = null;
    state.execution.status = 'suspended';
  }
  for (const claim of ledger.claims) claim.status = 'released';
  for (const ticket of ledger.tickets) {
    ticket.status = 'released';
    ticket.active_resources = [];
    ticket.blocked_resources = [];
    ticket.expires_at = null;
  }
}
function includeExistingLedger(input, existing) {
  const ownTickets = input.nextLedger.tickets;
  input.nextLedger.revision = existing.revision + 1;
  ownTickets.forEach((ticket, index) => {
    ticket.sequence = existing.next_sequence + index;
  });
  input.nextLedger.open_generation = existing.open_generation;
  input.nextLedger.next_sequence = existing.next_sequence + ownTickets.length;
  input.nextLedger.tickets = [...clone(existing.tickets), ...ownTickets];
  input.nextLedger.claims = [...clone(existing.claims), ...input.nextLedger.claims];
  for (const field of ['notices', 'dispositions', 'contours', 'batches', 'rebinds', 'operations', 'retirements'])
    input.nextLedger[field] = [...clone(existing[field]), ...input.nextLedger[field]];
  return input;
}
function quiescentJournal(workId = 'work', runId = 'run-work') {
  return {
    version: { revision: 1, digest: '9'.repeat(64) },
    resume_status: 'complete',
    state: {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspace,
      work_id: workId,
      attempt: 1,
      run_id: runId,
      source_scope: null,
      step_id: null,
      items: [],
      completed: [],
    },
  };
}
function ownerRecoveryPreviewJournal() {
  const journal = quiescentJournal();
  journal.resume_status = 'ready';
  journal.state.step_id = 'wave-0';
  journal.state.source_scope = { schema: 'ScopedSourceSnapshot/v1', entries: [], digest: 'source' };
  journal.state.items = [
    {
      issue_id: null,
      observation: null,
      request: {
        schema: 'VidaSessionRequest/v1',
        action_id: 'preview-action',
        assignment_index: 0,
        bindings_manifest_ref: '8'.repeat(64),
        config_digest: 'e'.repeat(64),
        role: 'diagnostics-researcher',
        run_id: 'run-work',
        scope_digest: 'source',
        stage_id: 'research_bug',
        wave_index: 0,
        workflow_id: 'bug_fix',
      },
    },
  ];
  return journal;
}
function ownerRecoveryPreviewRequest(initial, journal = ownerRecoveryPreviewJournal()) {
  return {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:nonapplied-owner-recovery-preview',
    requestIntent: 'next_work',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: 'project',
      work_id: 'work',
    },
  };
}
function ownerRecoveryPreviewExpired(callback) {
  const originalNow = Date.now;
  Date.now = () => originalNow() + 7200_000;
  try {
    callback();
  } finally {
    Date.now = originalNow;
  }
}

test('owner recovery preview: expired unissued owner releases once and admits a distinct fresh successor', () => {
  const initial = store.compareAndSwapHostState(fixture());
  const request = ownerRecoveryPreviewRequest(initial);
  ownerRecoveryPreviewExpired(() => {
    const released = suspendLocalWork(request);
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(released.work.lifecycle).toEqual({
      ...initial.work.lifecycle,
      revision: 2,
      next_action: released.work.lifecycle.next_action,
    });
    expect(released.work.binding).toEqual(initial.work.binding);
    expect(released.ledger.tickets[0].status).toBe('released');
    expect(released.ledger.claims[0].status).toBe('released');
    expect(released.ledger.claims[0].generation).toBe(1);
    expect(released.ledger.operations).toHaveLength(1);
    expect(suspendLocalWork(request)).toEqual(released);
    const successor = includeExistingLedger(fixture('fresh-successor'), released.ledger);
    successor.expectedLedger = released.ledgerVersion;
    const admitted = store.compareAndSwapHostState(successor);
    expect(admitted.work.binding.lifecycle_work_id).toBe('fresh-successor');
    expect(admitted.work.execution.run_id).toBe('run-fresh-successor');
    expect(store.readHostStateSnapshot(identity).work.execution.status).toBe('suspended');
    expect(admitted.ledger.claims.filter((claim) => claim.status === 'active')).toHaveLength(1);
  });
});

test('owner recovery preview: expired issued, observed, reserved, activation and unknown journals stay unchanged', () => {
  const initial = store.compareAndSwapHostState(fixture());
  for (const mutate of [
    (journal) => {
      journal.state.items[0].issue_id = 'original-unknown-issue';
      journal.resume_status = 'issued_outcome_uncertain';
    },
    (journal) => {
      journal.state.items[0].issue_id = 'completed-issue';
      journal.state.items[0].observation = { status: 'reported_complete' };
    },
    (journal) => {
      journal.state.items[0].observation = { status: 'reported_complete' };
    },
    (journal) => {
      journal.state.items[0].host_reservation = {};
    },
    (journal) => {
      journal.state.items[0].research_activation = {};
    },
    (journal) => {
      journal.state.items[0].research_normalization = {};
    },
    (journal) => {
      journal.resume_status = 'blocked';
    },
    (journal) => {
      journal.state.completed = [{ step_id: 'prior-wave', items: [] }];
    },
    (journal) => {
      journal.state.source_scope.digest = 'drift';
    },
    (journal) => {
      journal.state.items[0].request.config_digest = 'drift';
    },
    (journal) => {
      journal.state.items[0].request.run_id = 'foreign-run';
    },
  ]) {
    const journal = ownerRecoveryPreviewJournal();
    mutate(journal);
    ownerRecoveryPreviewExpired(() =>
      expect(() => suspendLocalWork(ownerRecoveryPreviewRequest(initial, journal))).toThrow(),
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});

test('owner recovery preview: current terminal actor does not turn original readonly UNKNOWN into completion', () => {
  const initial = store.compareAndSwapHostState(fixture());
  const journal = ownerRecoveryPreviewJournal();
  journal.resume_status = 'issued_outcome_uncertain';
  journal.state.items[0].issue_id = 'original-unknown-readonly';
  // SuspensionInput has no configured-rights/terminal-actor verifier. A role name cannot authorize release.
  const original = clone(journal);
  ownerRecoveryPreviewExpired(() =>
    expect(() => suspendLocalWork(ownerRecoveryPreviewRequest(initial, journal))).toThrow('uncertain'),
  );
  expect(journal).toEqual(original);
  expect(journal.state.items[0].observation).toBeNull();
  expect(store.readHostStateSnapshot(identity)).toEqual(initial);
});

test('owner recovery preview: expired owner rejects foreign identity and stale versions', () => {
  const initial = store.compareAndSwapHostState(fixture());
  const request = ownerRecoveryPreviewRequest(initial);
  for (const changes of [
    { nativeSessionHandle: 'foreign' },
    { expectedWork: { ...initial.workVersion, revision: 0 } },
    { expectedLedger: { ...initial.ledgerVersion, revision: 0 } },
    { identity: { ...identity, project_ids: ['other'] } },
  ]) {
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork({ ...request, ...changes })).toThrow());
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});

test('owner recovery preview: release preserves a newer queued waiter and is idempotent', () => {
  const initial = store.compareAndSwapHostState(fixture());
  const queued = fixture('other');
  queued.nextWork.lease = null;
  Object.assign(queued.nextLedger.tickets[0], {
    status: 'queued',
    active_resources: [],
    blocked_resources: ['file:src/task.ts'],
    expires_at: null,
  });
  queued.nextLedger.claims[0].status = 'recovered';
  queued.expectedLedger = initial.ledgerVersion;
  includeExistingLedger(queued, initial.ledger);
  store.compareAndSwapHostState(queued);
  const before = store.readHostStateSnapshot(identity);
  const request = ownerRecoveryPreviewRequest(before);
  ownerRecoveryPreviewExpired(() => {
    const released = suspendLocalWork(request);
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(released.ledger.tickets[0].status).toBe('released');
    expect(released.ledger.claims[0].status).toBe('released');
    expect(released.ledger.tickets[1]).toEqual(before.ledger.tickets[1]);
    expect(released.ledger.tickets[1].status).toBe('queued');
    expect(released.ledger.claims[1]).toEqual(before.ledger.claims[1]);
    expect(released.ledger.operations).toHaveLength(1);
    expect(suspendLocalWork(request)).toEqual(released);
  });
});

test('owner recovery preview: earlier FIFO blocker and foreign active claim still deny release', () => {
  const initial = store.compareAndSwapHostState(fixture());
  const older = fixture('older');
  Object.assign(older.nextLedger.tickets[0], {
    sequence: 1,
    status: 'queued',
    active_resources: [],
    blocked_resources: ['file:src/task.ts'],
    expires_at: null,
  });
  older.nextLedger.claims[0].status = 'recovered';
  const foreign = fixture('foreign');
  foreign.nextLedger.tickets[0].sequence = 3;
  for (const contender of [older, foreign]) {
    // Exercise read-side guards without manufacturing a competing claim in a live store.
    const host = clone(initial);
    host.ledger.tickets[0].sequence = 2;
    host.ledger.tickets.push(contender.nextLedger.tickets[0]);
    host.ledger.claims.push(contender.nextLedger.claims[0]);
    const request = {
      ...ownerRecoveryPreviewRequest(initial),
      store: {
        workspaceId: workspace,
        readHostStateSnapshot: () => host,
        compareAndSwapHostState: () => {
          throw new Error('unexpected write');
        },
      },
    };
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork(request)).toThrow('same-thread lease'));
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});

test('owner recovery preview: non-INTAKE and completed host assignment are not unissued preparation', () => {
  const initial = store.compareAndSwapHostState(fixture());
  // Read-only test double varies persisted evidence without mutating the scratch database.
  for (const alter of [
    (work) => {
      work.lifecycle.phase = 'TRACE';
    },
    (work) => {
      work.lifecycle.seal = {};
    },
    (work) => {
      work.execution.assignment_attempts = [{ status: 'completed' }];
    },
    (work) => {
      work.lifecycle.assurance.review_generation = 1;
    },
    (work) => {
      work.lifecycle.assurance.delivery_cycle_id = 'prior-delivery';
    },
  ]) {
    const host = clone(initial);
    alter(host.work);
    const request = {
      ...ownerRecoveryPreviewRequest(initial),
      store: {
        workspaceId: workspace,
        readHostStateSnapshot: () => host,
        compareAndSwapHostState: () => {
          throw new Error('unexpected write');
        },
      },
    };
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork(request)).toThrow('expired'));
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});
function activeClaimFor(ledger, ticket = ledger.tickets[0]) {
  return ledger.claims.find((claim) => claim.ticket_id === ticket.ticket_id && claim.status === 'active');
}
function setActiveLease(ledger, expiresAt, ticket = ledger.tickets[0]) {
  const claim = activeClaimFor(ledger, ticket);
  claim.lease_expires_at = expiresAt;
  claim.renewed_at = new Date().toISOString();
  ticket.expires_at = expiresAt;
  return claim;
}
function revokeTicket(ledger, ticket = ledger.tickets[0]) {
  const claim = activeClaimFor(ledger, ticket);
  if (claim) claim.status = 'recovered';
  ticket.status = 'read_only';
  ticket.active_resources = [];
  ticket.blocked_resources = [];
  ticket.expires_at = null;
}
function frozenContour(ledger, id = 'contour-work') {
  const ticket = ledger.tickets[0];
  const contour = {
    schema: 'ReleaseContour/v1',
    contour_id: id,
    generation: ticket.generation,
    work_ids: [ticket.work_id],
    ticket_ids: [ticket.ticket_id],
    frozen: true,
    created_at: '2026-09-18T00:00:00.000Z',
  };
  return { ...contour, contour_digest: canonicalJsonDigest(contour) };
}
function artifact() {
  return {
    artifact_id: 'result',
    schema: 'ResearchResult/v1',
    path: '.agent/result.json',
    sha256: '2'.repeat(64),
    stage_id: 'research',
    source_revision: 'source',
    scope_id: 'scope-work',
    ac_ids: ['AC-1'],
  };
}
function attemptRequest(state = store.readHostStateSnapshot(identity), assignmentIndex = 0) {
  return {
    identity,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    stageId: 'implementation',
    assignmentIndex,
    requestDigest: '5'.repeat(64),
    lease: clone(state.work.lease),
  };
}
const decision = { schema: 'DecisionRecord/v1', path: '.agent/retry-decision.json', sha256: '3'.repeat(64) };
function reconciliationRequest(receipt, outcome = 'completed') {
  const state = store.readHostStateSnapshot(identity);
  return {
    identity,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    attemptId: receipt.attempt.attempt_id,
    outcome,
    result: outcome === 'completed' ? { recovered: true } : null,
    providerEvidence: {
      schema: 'ProviderObservation/v1',
      path: '.agent/provider-evidence.json',
      sha256: '4'.repeat(64),
    },
    decision: outcome === 'no_effect' ? decision : null,
    retryLease:
      outcome === 'no_effect'
        ? { ...receipt.attempt.lease, thread_id: 'recovery', generation: receipt.attempt.lease.generation + 1 }
        : null,
  };
}
// Unit host verifier fixture, not a production provider attestation adapter.
function verifyingStore(handle, verify) {
  return new HostStateStore(handle, workspace, { principal: 'runtime:test-verifier', verify });
}
function reconciliationAuthorization(request, state) {
  const attempt = state.work.execution.assignment_attempts.find((entry) => entry.attempt_id === request.attemptId);
  return {
    schema: 'WorkflowAttemptReconciliationAuthorization/v1',
    principal: 'runtime:test-verifier',
    work_binding_digest: canonicalJsonDigest(state.work.binding),
    work_version: request.expectedWork,
    ledger_version: request.expectedLedger,
    attempt_id: request.attemptId,
    request_digest: attempt.request_digest,
    outcome: request.outcome,
    result_digest: request.outcome === 'completed' ? canonicalJsonDigest(request.result) : null,
    provider_evidence: request.providerEvidence,
    decision: request.decision,
    retry_lease: request.retryLease,
  };
}
beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'host-state-'));
  databasePath = path.join(root, 'authority.db');
  database = openHostStateDatabase(databasePath);
  handles.push(database);
  store = new HostStateStore(database, workspace);
});
afterEach(async () => {
  identity.integrations_digest = 'e'.repeat(64);
  for (const child of children.splice(0)) if (child.exitCode === null) child.kill();
  for (const handle of handles.splice(0)) handle.close();
  const relative = path.relative(path.resolve(tmpdir()), path.resolve(root));
  if (!relative.startsWith('host-state-') || relative.includes(path.sep)) throw new Error('unsafe scratch cleanup');
  await rm(root, { recursive: true, force: true });
});

test('ten quiescent pre-delivery same-thread follow-ups release only their own claims', () => {
  store.compareAndSwapHostState(fixture());
  let currentId = 'work';
  for (let index = 1; index <= 10; index++) {
    const currentIdentity = { ...identity, work_id: currentId };
    const prior = store.readHostStateSnapshot(currentIdentity);
    const request = {
      store,
      identity: currentIdentity,
      journal: quiescentJournal(currentId, `run-${currentId}`),
      expectedWork: prior.workVersion,
      expectedLedger: prior.ledgerVersion,
      nativeSessionHandle: 'thread',
      userRequestPointer: `user-request:thread/${index}`,
      requestIntent: 'next_work',
      documentationContext: {
        repository_root: root,
        repository_id: identity.repository_id,
        project_id: identity.project_ids[0],
        work_id: currentId,
      },
    };
    const suspended = suspendLocalWork(request);
    expect(suspended.work.lifecycle.phase).toBe('INTAKE');
    expect(suspended.work.execution.status).toBe('suspended');
    expect(suspended.work.lease).toBeNull();
    expect(suspendLocalWork(request).workVersion).toEqual(suspended.workVersion);
    const nextId = `work-${index}`;
    const admission = includeExistingLedger(fixture(nextId), suspended.ledger);
    admission.expectedLedger = suspended.ledgerVersion;
    store.compareAndSwapHostState(admission);
    currentId = nextId;
  }
  const latest = store.readHostStateSnapshot({ ...identity, work_id: currentId });
  expect(latest.ledger.operations.filter((entry) => entry.kind === 'release')).toHaveLength(10);
  expect(latest.ledger.claims.filter((entry) => entry.status === 'active')).toHaveLength(1);
}, 60_000);

test('same-thread suspension denies foreign owner and uncertain native issue', () => {
  const initial = store.compareAndSwapHostState(fixture());
  const request = {
    store,
    identity: { ...identity },
    journal: quiescentJournal(),
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'other-thread',
    userRequestPointer: 'user-request:foreign',
    requestIntent: 'next_work',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: identity.project_ids[0],
      work_id: identity.work_id,
    },
  };
  expect(() => suspendLocalWork(request)).toThrow(/same-thread lease/);
  const uncertain = quiescentJournal();
  uncertain.resume_status = 'issued_outcome_uncertain';
  uncertain.state.items = [{ issue_id: 'issued', observation: null }];
  expect(() => suspendLocalWork({ ...request, nativeSessionHandle: 'thread', journal: uncertain })).toThrow(
    /issued|uncertain|quiescent/,
  );
  expect(store.readHostStateSnapshot(identity).workVersion).toEqual(initial.workVersion);
});

test('host database opener pins recoverable SQLite settings and preserves state across reopen', () => {
  expect(path.isAbsolute(databasePath)).toBe(true);
  expect(database.query('PRAGMA journal_mode').get().journal_mode).toBe('wal');
  expect(database.query('PRAGMA synchronous').get().synchronous).toBe(2);
  expect(database.query('PRAGMA busy_timeout').get().timeout).toBe(1000);
  const saved = store.compareAndSwapHostState(fixture());
  reopenStore();
  expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  expect(() => openHostStateDatabase(':memory:')).toThrow(/absolute file-backed database path/);
  expect(() => openHostStateDatabase('relative.sqlite')).toThrow(/absolute file-backed database path/);
});

const operationKey = '6'.repeat(64);
const requestDigest = '7'.repeat(64);
const resultDigest = '8'.repeat(64);
const approvalBinding = () => ({
  stage_id: 'review',
  approval_id: 'approval-1',
  operation_hash: operationKey,
  tenant: 'tenant',
  project: 'project',
});
const governanceRows = () =>
  database.query('SELECT * FROM agent_host_governance ORDER BY store_id,kind,record_key').all();
function protectedInvocation(initial) {
  return {
    configDigest: initial.work.binding.config_digest,
    workflowId: initial.work.binding.workflow_id,
    stage: { id: 'implementation' },
    assignmentIndex: 0,
    workContext: {
      binding: initial.work.binding,
      permit: {
        checkpoint_revision: initial.workVersion.revision,
        checkpoint_digest: initial.workVersion.digest,
        stage_id: 'implementation',
        assignment_index: 0,
        dispatch_authorized: true,
        lease: { ...initial.work.lease, ledger_revision: initial.ledgerVersion.revision },
      },
    },
  };
}
function verifiedWorkflowApproval(request, approvalId = 'approval-protected-1') {
  const unsigned = {
    schema: 'EdictumWorkflowApproval/v1',
    stage_id: request.stage_id,
    approval_id: approvalId,
    approver: 'fixture:approver',
    operation_hash: request.operation_hash,
    tenant: request.identity.repository_id,
    project: request.identity.project_ids[0],
    approved_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
}
function reopenStore() {
  database.close();
  handles.pop();
  database = openHostStateDatabase(databasePath);
  handles.push(database);
  store = new HostStateStore(database, workspace);
}

const reconciliationBinding = (saved) => ({
  schema: 'ReconciliationGateBinding/v1',
  operation_id: 'reconcile-work',
  manifest_digest: '2'.repeat(64),
  request_digest: '3'.repeat(64),
  bindings_digest: '4'.repeat(64),
  closure_digest: '5'.repeat(64),
  work: [{ identity, version: saved.workVersion }],
});

const maintenanceBinding = () => ({
  schema: 'MaintenanceFenceBinding/v1',
  project_ids: ['project'],
  operation_id: 'reconcile-work',
  manifest_digest: '2'.repeat(64),
  request_digest: '3'.repeat(64),
  bindings_digest: '4'.repeat(64),
  closure_digest: '5'.repeat(64),
  bundle_digest: '4'.repeat(64),
});
const maintenanceVerifier = {
  principal: 'fixture:maintenance-host',
  projectIds: ['project'],
  verify: (fence) => ({
    schema: 'MaintenanceReleaseAuthorization/v1',
    principal: 'fixture:maintenance-host',
    fence_digest: canonicalJsonDigest(fence),
    closure_digest: fence.binding.closure_digest,
    bundle_digest: fence.binding.bundle_digest,
  }),
};
const maintenanceStore = (handle = database) =>
  new HostStateStore(handle, workspace, undefined, undefined, undefined, maintenanceVerifier);
const workingStore = (handle = database) =>
  new HostStateStore(handle, workspace, undefined, undefined, undefined, maintenanceVerifier, root);

test('consumer migration keeps canonical SQLite in place, clears active rows and restores exact state under its held fence', async () => {
  const initial = fixture();
  quiesceImportedState([initial.nextWork], initial.nextLedger);
  store.compareAndSwapHostState(initial);
  const before = store.readWorkspaceSnapshot();
  const consumerFile = path.join(root,'consumer-source.txt');
  const originalBytes = Buffer.from('original consumer source\n');
  writeFileSync(consumerFile,originalBytes);
  const competingHandle = new Database(databasePath,{strict:true});
  handles.push(competingHandle);
  const competing = new HostStateStore(competingHandle,workspace);
  const migration = maintenanceStore(), fence = migration.acquireMaintenanceFence(maintenanceBinding());
  expect(()=>competing.recordAdmissionAttempt('held-fence',1,{valid:'fixture'})).toThrow(/maintenance fence/);
  expect(database.query('SELECT count(*) AS count FROM agent_host_admission_attempt').get().count).toBe(0);
  let callbacks = 0;
  const baseline = migration.consumerMigrationState(fence, 'baseline', () => {
    callbacks++;
    expect(() => store.recordAdmissionAttempt('blocked',1,{valid:'fixture'})).toThrow(/maintenance|nested/);
    return 'files archived';
  });
  expect(baseline.status).toBe('baseline');
  expect(migration.readWorkspaceSnapshot().work).toHaveLength(0);
  expect(migration.readWorkspaceSnapshot().ledger).toBeNull();
  writeFileSync(consumerFile,'deterministic initialization failure output');
  expect(()=>migration.consumerMigrationState(fence,'restore',()=>{
    writeFileSync(consumerFile,originalBytes);
    throw Error('interrupted restore after exact file publication');
  })).toThrow(/interrupted restore/);
  expect(readFileSync(consumerFile)).toEqual(originalBytes);
  expect(migration.readWorkspaceSnapshot().work).toHaveLength(0);
  expect(()=>competing.recordAdmissionAttempt('interrupted-fence',1,{valid:'fixture'})).toThrow(/maintenance fence/);
  const restored = migration.consumerMigrationState(fence,'restore',()=>{
    callbacks++;
    expect(() => store.recordAdmissionAttempt('blocked',1,{valid:'fixture'})).toThrow(/maintenance|nested/);
    expect(readFileSync(consumerFile)).toEqual(originalBytes);
    return 'files restored';
  });
  expect(restored.status).toBe('restored');
  await migration.releaseMaintenanceFence(fence);
  const after = migration.readWorkspaceSnapshot();
  expect(after).toEqual({...before, work: before.work.map(row=>({...row,maintenanceGeneration:fence.fence.generation}))});
  expect(after.work[0].maintenanceGeneration).toBeGreaterThan(before.work[0].maintenanceGeneration);
  expect(callbacks).toBe(2);
  expect(readFileSync(consumerFile)).toEqual(originalBytes);
});

test('consumer migration restore refuses a prepared admission even when no WorkState was created', async () => {
  const migration = maintenanceStore(), binding = maintenanceBinding();
  const first = migration.acquireMaintenanceFence(binding);
  migration.consumerMigrationState(first,'baseline',()=>undefined);
  await migration.releaseMaintenanceFence(first);
  migration.recordAdmissionAttempt('failed-before-work',1,{minimum_valid_identity:'fixture'});
  const second = migration.acquireMaintenanceFence(binding);
  let called = false;
  expect(()=>migration.consumerMigrationState(second,'restore',()=>{called=true;})).toThrow(/new admission/);
  expect(called).toBe(false);
  expect(migration.readWorkspaceSnapshot().work).toHaveLength(0);
});

test('consumer migration rejects issued unknown journals before baseline filesystem effects', () => {
  const initial = fixture();
  quiesceImportedState([initial.nextWork],initial.nextLedger);
  store.compareAndSwapHostState(initial);
  const journal = {schema:'MastraSessionLedger/v1',workspace_id:workspace,work_id:'work',attempt:1,run_id:'run-work',items:[{issue_id:'fixture-issued',observation:null}],completed:[]};
  database.exec('CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))');
  database.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(workspace,'work',1,1,canonicalJson(journal),canonicalJsonDigest(journal));
  const before = database.query('SELECT * FROM agent_host_state ORDER BY kind,id').all();
  const migration = maintenanceStore(),fence=migration.acquireMaintenanceFence(maintenanceBinding());
  let called=false;
  expect(()=>migration.consumerMigrationState(fence,'baseline',()=>{called=true;})).toThrow(/outcome remains unknown/);
  expect(called).toBe(false);
  expect(database.query('SELECT * FROM agent_host_state ORDER BY kind,id').all()).toEqual(before);
  expect(JSON.parse(database.query('SELECT payload FROM agent_host_mastra_session_ledger').get().payload)).toEqual(journal);
});

test('consumer migration rejects foreign canonical rows appearing after its baseline', () => {
  const migration=maintenanceStore(),fence=migration.acquireMaintenanceFence(maintenanceBinding());
  migration.consumerMigrationState(fence,'baseline',()=>undefined);
  const foreign=fixture('foreign').nextWork;
  const key=JSON.stringify([foreign.binding.repository_id,foreign.binding.project_ids,foreign.binding.integrations_digest,foreign.binding.lifecycle_work_id]);
  database.query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)').run(workspace,'work',key,foreign.revision,canonicalJson(foreign),canonicalJsonDigest(foreign));
  let called=false;
  expect(()=>migration.consumerMigrationState(fence,'restore',()=>{called=true;})).toThrow(/new admission|changed canonical state/);
  expect(called).toBe(false);
  expect(database.query('SELECT payload FROM agent_host_state WHERE id=?').get(key).payload).toBe(canonicalJson(foreign));
});

describe('host-owned durable maintenance fence', () => {
  const seedQuiescentWork = (id, projectIds, workspaceId = workspace, repositoryId = 'project-repository') => {
    const work = fixture(id).nextWork;
    work.workspace_id = workspaceId;
    work.binding.repository_id = repositoryId;
    work.binding.project_ids = projectIds;
    work.lease = null;
    work.execution.status = 'suspended';
    const key = JSON.stringify([repositoryId, projectIds, work.binding.integrations_digest, id]);
    database
      .query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)')
      .run(workspaceId, 'work', key, work.revision, canonicalJson(work), canonicalJsonDigest(work));
  };

  test('one workspace maintenance fence contains disjoint persisted project work', async () => {
    const verifier = { ...maintenanceVerifier, projectIds: ['other', 'project'] };
    store = new HostStateStore(database, workspace, undefined, undefined, undefined, verifier);
    seedQuiescentWork('first', ['project']);
    seedQuiescentWork('second', ['other']);
    const receipt = store.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['other', 'project'] });
    expect(receipt.fence.status).toBe('held');
    expect((await store.releaseMaintenanceFence(receipt)).status).toBe('released');
  });

  test('maintenance acquisition rejects a persisted project outside the exact fence before effects', () => {
    const verifier = { ...maintenanceVerifier, projectIds: ['other', 'project'] };
    store = new HostStateStore(database, workspace, undefined, undefined, undefined, verifier);
    seedQuiescentWork('foreign', ['third']);
    expect(() => store.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['other', 'project'] })).toThrow(
      /maintenance scope excludes persisted project/,
    );
    expect(store.readMaintenanceFence()).toBeNull();
  });

  test('maintenance acquisition rejects a foreign repository in the same workspace before effects', () => {
    const actualWorkspace = deriveWorkspaceId('project-repository', root);
    const verifier = { ...maintenanceVerifier };
    store = new HostStateStore(database, actualWorkspace, undefined, undefined, undefined, verifier, root);
    seedQuiescentWork('foreign', ['project'], actualWorkspace, 'foreign-repository');
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(
      /maintenance scope excludes persisted project/,
    );
    expect(store.readMaintenanceFence()).toBeNull();
  });

  test('working mutation excludes a competing maintenance acquisition', () => {
    store = workingStore();
    const competing = new Database(databasePath, { strict: true });
    handles.push(competing);
    const other = workingStore(competing);
    let rollbackCount = 0;
    const result = store.withWorkingMutation(
      root,
      0,
      () => {
        expect(() => other.acquireMaintenanceFence(maintenanceBinding())).toThrow(/locked|busy/i);
        return 'committed';
      },
      () => rollbackCount++,
    );
    expect(result).toBe('committed');
    expect(rollbackCount).toBe(0);
    expect(other.readMaintenanceFence()).toBeNull();
  });

  test('working mutation rejects a store bound to another repository root', async () => {
    store = workingStore();
    const foreignRoot = path.join(root, 'foreign-repository');
    await mkdir(foreignRoot);
    let effects = 0;
    expect(() =>
      store.withWorkingMutation(
        foreignRoot,
        0,
        () => ++effects,
        () => undefined,
      ),
    ).toThrow(/foreign repository working mutation/);
    expect(effects).toBe(0);
  });

  test('working mutation store rejects a file as repository root', async () => {
    const fileRoot = path.join(root, 'not-a-directory');
    await writeFile(fileRoot, 'x');
    expect(
      () => new HostStateStore(database, workspace, undefined, undefined, undefined, maintenanceVerifier, fileRoot),
    ).toThrow(/repository root must be a directory/);
  });

  test('working mutation rejects held and stale generations before a file effect', async () => {
    store = workingStore();
    let effects = 0;
    let rollbacks = 0;
    const write = (generation) =>
      store.withWorkingMutation(
        root,
        generation,
        () => ++effects,
        () => ++rollbacks,
      );
    expect(write(0)).toBe(1);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => write(0)).toThrow(/working access blocked by maintenance fence/);
    expect(effects).toBe(1);
    expect(rollbacks).toBe(0);
    await store.releaseMaintenanceFence(receipt);
    expect(() => write(0)).toThrow(/maintenance generation is stale/);
    expect(effects).toBe(1);
    expect(write(1)).toBe(2);
  });

  test('working mutation invokes rollback when its transaction fails after the action', () => {
    store = workingStore();
    let fileBytes = 'before';
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          fileBytes = 'after';
          return Promise.resolve('invalid asynchronous effect');
        },
        () => {
          fileBytes = 'before';
        },
      ),
    ).toThrow(/working mutation callback must be synchronous/);
    expect(fileBytes).toBe('before');
  });

  test('working mutation restores an effect when its action throws synchronously', () => {
    store = workingStore();
    let fileBytes = 'before';
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          fileBytes = 'after';
          throw new Error('write failed after effect');
        },
        () => {
          fileBytes = 'before';
        },
      ),
    ).toThrow(/write failed after effect/);
    expect(fileBytes).toBe('before');
  });

  test('working mutation restores a failed effect before releasing its maintenance exclusion', () => {
    store = workingStore();
    const competing = new Database(databasePath, { strict: true });
    handles.push(competing);
    const other = workingStore(competing);
    let restored = false;
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          throw new Error('write failed');
        },
        () => {
          expect(() => other.acquireMaintenanceFence(maintenanceBinding())).toThrow(/locked|busy/i);
          restored = true;
        },
      ),
    ).toThrow(/write failed/);
    expect(restored).toBe(true);
    expect(other.readMaintenanceFence()).toBeNull();
  });

  test('working mutation rejects a thenable and rolls back its effect', () => {
    store = workingStore();
    let fileBytes = 'before';
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          fileBytes = 'after';
          return { then() {} };
        },
        () => {
          fileBytes = 'before';
        },
      ),
    ).toThrow(/working mutation callback must be synchronous/);
    expect(fileBytes).toBe('before');
  });

  test('Node can read the exact Bun maintenance row across the process boundary', async () => {
    store = maintenanceStore();
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const readWithNode = () =>
      new Promise((resolve, reject) => {
        const code = `const { DatabaseSync } = require('node:sqlite');
          const db = new DatabaseSync(process.argv[1], { readOnly: true });
          const row = db.prepare('SELECT revision,payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
            .get(process.argv[2]);
          console.log(JSON.stringify(row));
          db.close();`;
        const child = spawn('node', ['-e', code, databasePath, workspace], {
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        children.push(child);
        let output = '';
        let errors = '';
        child.stdout.on('data', (data) => (output += data));
        child.stderr.on('data', (data) => (errors += data));
        child.on('error', reject);
        child.on('close', (exitCode) =>
          exitCode === 0 ? resolve(JSON.parse(output)) : reject(new Error(errors || 'Node fence read failed')),
        );
      });
    const held = await readWithNode();
    expect(held.revision).toBe(receipt.fence.revision);
    expect(held.digest).toBe(canonicalJsonDigest(JSON.parse(held.payload)));
    expect(JSON.parse(held.payload)).toEqual(receipt.fence);
    const released = await store.releaseMaintenanceFence(receipt);
    const observed = await readWithNode();
    expect(observed.revision).toBe(released.revision);
    expect(JSON.parse(observed.payload)).toEqual(released);
  });

  test('a Node write transaction excludes concurrent Bun fence acquisition', async () => {
    store = maintenanceStore();
    const code = `const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.argv[1]);
      db.exec('PRAGMA busy_timeout=1000; BEGIN IMMEDIATE');
      console.log('LOCKED');
      process.stdin.once('data', () => { db.exec('COMMIT'); db.close(); });`;
    const child = spawn('node', ['-e', code, databasePath], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    children.push(child);
    let output = '';
    let errors = '';
    const locked = new Promise((resolve, reject) => {
      child.stdout.on('data', (data) => {
        output += data;
        if (output.includes('LOCKED')) resolve();
      });
      child.stderr.on('data', (data) => (errors += data));
      child.on('error', reject);
      child.on('close', (exitCode) => {
        if (exitCode !== 0) reject(new Error(errors || 'Node transaction failed'));
      });
    });
    await locked;
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow();
    expect(store.readMaintenanceFence()).toBeNull();
    const finished = new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (exitCode) =>
        exitCode === 0 ? resolve() : reject(new Error(errors || 'Node transaction failed')),
      );
    });
    child.stdin.end('release\n');
    await finished;
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(receipt.fence.status).toBe('held');
    await store.releaseMaintenanceFence(receipt);
  });

  test('never imports authoritative state without a held maintenance receipt', () => {
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const binding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding)).toThrow(
      /held maintenance receipt required/,
    );
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, null)).toThrow(
      /held maintenance receipt required/,
    );
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
  });

  test('rejects a foreign project even with a valid workspace maintenance receipt', async () => {
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    seed.nextWork.binding.project_ids = ['foreign'];
    seed.nextLedger.tickets[0].project_ids = ['foreign'];
    seed.nextLedger.tickets[0].contour_keys[1] = 'project:tenant/foreign';
    const binding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    binding.work[0].identity = { ...identity, project_ids: ['foreign'] };
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toThrow(
      /outside maintenance authority/,
    );
    await store.releaseMaintenanceFence(fence);
    expect(store.readHostStateSnapshot({ ...identity, project_ids: ['foreign'] }).work).toBeNull();
  });

  test('binds the full project scope to host authority and persisted workspace state', async () => {
    store = maintenanceStore();
    expect(() => store.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['foreign'] })).toThrow(
      /project authority mismatch/,
    );
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextLedger.claims[0].status = 'released';
    seed.nextLedger.tickets[0].status = 'released';
    seed.nextLedger.tickets[0].active_resources = [];
    seed.nextLedger.tickets[0].expires_at = null;
    store.compareAndSwapHostState(seed);
    const foreignAuthority = new HostStateStore(database, workspace, undefined, undefined, undefined, {
      ...maintenanceVerifier,
      projectIds: ['foreign'],
    });
    expect(() =>
      foreignAuthority.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['foreign'] }),
    ).toThrow(/excludes persisted project/);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(receipt.fence.binding.project_ids).toEqual(['project']);
    await store.releaseMaintenanceFence(receipt);
  });

  test('rejects a pre-fence state snapshot after release even when state versions did not change', async () => {
    store = maintenanceStore();
    const before = store.readHostStateSnapshot(identity);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    await store.releaseMaintenanceFence(receipt);
    const stale = { ...fixture(), expectedMaintenanceGeneration: before.maintenanceGeneration };
    expect(() => store.compareAndSwapHostState(stale)).toThrow(/maintenance generation/);
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
    const current = store.readHostStateSnapshot(identity);
    expect(current.maintenanceGeneration).toBe(1);
    const saved = store.compareAndSwapHostState({
      ...fixture(),
      expectedMaintenanceGeneration: current.maintenanceGeneration,
    });
    expect(saved.maintenanceGeneration).toBe(1);
  });

  test('rejects pre-fence attempt requests and receipts after lease revocation and release', async () => {
    store = maintenanceStore();
    const saved = store.compareAndSwapHostState(fixture());
    const staleRequest = attemptRequest(saved);
    const started = store.claimWorkflowAttempt(staleRequest);
    store.completeWorkflowAttempt(started, { ok: true });
    const revoke = next();
    revoke.nextWork.lease = null;
    revoke.nextLedger.tickets[0].generation = 2;
    revokeTicket(revoke.nextLedger);
    store.compareAndSwapHostState(revoke);
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    await store.releaseMaintenanceFence(fence);
    expect(() => store.claimWorkflowAttempt(staleRequest)).toThrow(/maintenance generation/);
    expect(() => store.completeWorkflowAttempt(started, { ok: true })).toThrow(/maintenance generation/);
    expect(() => store.markWorkflowAttemptUncertain(started)).toThrow(/maintenance generation/);
  });

  test('survives restart, blocks working access and rejects forged or stale tokens', async () => {
    store = maintenanceStore();
    const first = store.acquireMaintenanceFence(maintenanceBinding());
    expect(first.fence).toMatchObject({ status: 'held', generation: 1, revision: 1 });
    expect(first.fence.token_digest).not.toBe(first.token);
    expect(store.readMaintenanceFence()).toEqual(first.fence);
    expect(() => store.readHostStateSnapshot(identity)).toThrow(/maintenance fence/);
    expect(() => store.compareAndSwapHostState(fixture())).toThrow(/maintenance fence/);
    expect(() => store.reserveOperation('operations', operationKey, requestDigest)).toThrow(/maintenance fence/);
    const competing = new Database(databasePath, { strict: true });
    handles.push(competing);
    const other = maintenanceStore(competing);
    expect(() => other.acquireMaintenanceFence(maintenanceBinding())).toThrow(/already held/);
    expect(() => other.assertMaintenanceFence({ ...first, token: randomUUID() })).toThrow(/stale or forged/);
    expect(() => other.assertMaintenanceFence({ ...first, fence: { ...first.fence, generation: 2 } })).toThrow(
      /stale or forged/,
    );
    expect(() =>
      other.assertMaintenanceFence({
        ...first,
        fence: { ...first.fence, binding: { ...first.fence.binding, project_ids: ['foreign'] } },
      }),
    ).toThrow(/stale or forged/);
    competing.close();
    handles.pop();
    reopenStore();
    store = maintenanceStore();
    expect(store.assertMaintenanceFence(first)).toEqual(first.fence);
    expect((await store.releaseMaintenanceFence(first)).status).toBe('released');
    await expect(store.releaseMaintenanceFence(first)).rejects.toThrow(/stale or forged/);
    expect(() => store.assertMaintenanceFence(first)).toThrow(/stale or forged/);
    const second = store.acquireMaintenanceFence(maintenanceBinding());
    expect(second.fence.generation).toBe(2);
    expect(second.token).not.toBe(first.token);
    expect(() => store.assertMaintenanceFence(first)).toThrow(/stale or forged/);
    await store.releaseMaintenanceFence(second);
  });

  test('rejects acquisition while a work lease is active', () => {
    store = maintenanceStore();
    const saved = store.compareAndSwapHostState(fixture());
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(/active work lease/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    expect(store.readMaintenanceFence()).toBeNull();
  });

  test('rejects acquisition while a governance operation is unresolved', async () => {
    store = maintenanceStore();
    const reservation = store.reserveOperation('operations', operationKey, requestDigest);
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(/governance is not quiescent/);
    store.transitionOperation(reservation, 'commit_unknown');
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(/governance is not quiescent/);
    store.transitionOperation(reservation, 'applied', resultDigest);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(receipt.fence.status).toBe('held');
    await store.releaseMaintenanceFence(receipt);
  });

  test('requires an authoritative closure verifier and fences reconciliation control mutations', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, undefined, {
      principal: 'fixture:maintenance-host',
      projectIds: ['project'],
      verify: () => null,
    });
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const seed = fixture();
    const binding = reconciliationBinding({ workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) } });
    expect(() => store.openReconciliationGate(binding)).toThrow(/maintenance receipt required/);
    expect(() => store.openReconciliationGate(binding, null)).toThrow(/maintenance receipt required/);
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding)).toThrow(
      /maintenance receipt required/,
    );
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, receipt)).toThrow(
      /imported work lease blocks maintenance/,
    );
    await expect(store.releaseMaintenanceFence(receipt)).rejects.toThrow(/closure verification failed/);
    expect(store.readMaintenanceFence().status).toBe('held');
  });

  test('imports quiesced state only with the held maintenance receipt', async () => {
    store = maintenanceStore();
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextLedger.claims[0].status = 'released';
    seed.nextLedger.tickets[0].status = 'released';
    seed.nextLedger.tickets[0].active_resources = [];
    seed.nextLedger.tickets[0].expires_at = null;
    const binding = reconciliationBinding({ workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) } });
    for (const field of ['operation_id', 'manifest_digest', 'request_digest', 'bindings_digest', 'closure_digest']) {
      const changed = { ...binding, [field]: field === 'operation_id' ? 'different-operation' : '0'.repeat(64) };
      expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, changed, receipt)).toThrow(
        /maintenance fence does not bind reconciliation gate/,
      );
    }
    expect(database.query('SELECT COUNT(*) AS count FROM agent_host_state').get().count).toBe(0);
    const gate = store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, receipt);
    expect(gate.status).toBe('open');
    expect(() => store.readHostStateSnapshot(identity)).toThrow(/maintenance fence/);
    expect((await store.releaseMaintenanceFence(receipt)).status).toBe('released');
    expect(store.readHostStateSnapshot(identity).work).toEqual(seed.nextWork);
  });

  test('rejects an imported active task without a lease before creating host state', async () => {
    store = maintenanceStore();
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    seed.nextWork.execution.status = 'active';
    const activeBinding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, activeBinding, receipt)).toThrow(
      /imported active work requires a lease/,
    );
    expect(database.query('SELECT COUNT(*) AS count FROM agent_host_state').get().count).toBe(0);
    seed.nextWork.execution.status = 'suspended';
    const suspendedBinding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    expect(store.importReconciledHostState([seed.nextWork], seed.nextLedger, suspendedBinding, receipt).status).toBe(
      'open',
    );
    await store.releaseMaintenanceFence(receipt);
  });

  test('binds a held maintenance fence to gate opening and restore transitions', async () => {
    store = maintenanceStore();
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const saved = store.compareAndSwapHostState(seed);
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    const binding = reconciliationBinding(saved);
    const wrong = { ...binding, closure_digest: '0'.repeat(64) };
    for (const field of ['manifest_digest', 'bindings_digest', 'closure_digest']) {
      expect(() => store.openReconciliationGate({ ...binding, [field]: '0'.repeat(64) }, fence)).toThrow(
        /maintenance fence does not bind/,
      );
    }
    expect(store.readReconciliationGate()).toBeNull();
    expect(store.openReconciliationGate(binding, fence).status).toBe('open');
    expect(() => store.reserveReconciliationRestore(wrong, fence)).toThrow(/maintenance fence does not bind/);
    expect(store.readReconciliationGate().status).toBe('open');
    const reservation = store.reserveReconciliationRestore(binding, fence);
    expect(() => store.completeReconciliationRestore({ ...reservation, binding: wrong }, fence)).toThrow(
      /maintenance fence does not bind/,
    );
    expect(store.readReconciliationGate().status).toBe('restoring');
    expect(store.completeReconciliationRestore(reservation, fence).status).toBe('restored');
    await store.releaseMaintenanceFence(fence);
  });
});

describe('host-owned reconciliation rollback gate', () => {
  test('imports a reconciled current-v1 revision and its gate in one transaction', async () => {
    const seed = fixture();
    seed.nextWork.revision = 7;
    seed.nextWork.lifecycle.revision = 7;
    seed.nextLedger.revision = 9;
    expect(() => store.compareAndSwapHostState(seed)).toThrow(/advance exactly once/);
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const binding = reconciliationBinding({
      workVersion: { revision: 7, digest: canonicalJsonDigest(seed.nextWork) },
    });
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    const gate = store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence);
    expect(gate.status).toBe('open');
    expect(store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toEqual(gate);
    reopenStore();
    store = maintenanceStore();
    expect(store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toEqual(gate);
    expect(() =>
      store.importReconciledHostState(
        [seed.nextWork],
        seed.nextLedger,
        {
          ...binding,
          manifest_digest: '6'.repeat(64),
        },
        fence,
      ),
    ).toThrow(/maintenance fence does not bind reconciliation gate/);
    database
      .query("UPDATE agent_host_state SET digest=? WHERE workspace_id=? AND kind='work'")
      .run('0'.repeat(64), workspace);
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toThrow();
    database
      .query("UPDATE agent_host_state SET digest=? WHERE workspace_id=? AND kind='work'")
      .run(canonicalJsonDigest(seed.nextWork), workspace);
    await store.releaseMaintenanceFence(fence);
    expect(store.readHostStateSnapshot(identity).work).toEqual(seed.nextWork);
    expect(store.readHostStateSnapshot(identity).ledger).toEqual(seed.nextLedger);
    const updated = store.compareAndSwapHostState(next());
    const secondFence = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, secondFence)).toThrow(
      /already exists/,
    );
    await store.releaseMaintenanceFence(secondFence);
    expect(store.readReconciliationGate().closed_work_version).toEqual(updated.workVersion);
    expect(() => store.reserveReconciliationRestore(binding, undefined, 2)).toThrow(/closed/);
  });

  test('sorts multiple imported work versions by canonical identity before binding the gate', async () => {
    const first = fixture();
    first.nextWork.revision = 7;
    first.nextWork.lifecycle.revision = 7;
    first.nextLedger.revision = 9;
    const second = fixture('other', 'file:src/other.ts');
    second.nextWork.revision = 3;
    second.nextWork.lifecycle.revision = 3;
    const ledger = clone(first.nextLedger);
    ledger.next_sequence = 3;
    ledger.tickets.push({ ...clone(second.nextLedger.tickets[0]), sequence: 2 });
    ledger.claims.push(...clone(second.nextLedger.claims));
    quiesceImportedState([first.nextWork, second.nextWork], ledger);
    const firstIdentity = identity;
    const secondIdentity = { ...identity, work_id: 'other' };
    const binding = {
      ...reconciliationBinding({ workVersion: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } }),
      work: [
        { identity: secondIdentity, version: { revision: 3, digest: canonicalJsonDigest(second.nextWork) } },
        { identity: firstIdentity, version: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } },
      ],
    };
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    const gate = store.importReconciledHostState([first.nextWork, second.nextWork], ledger, binding, fence);
    expect(gate.binding.work.map((item) => item.identity.work_id)).toEqual(['other', 'work']);
    await store.releaseMaintenanceFence(fence);
  });

  test('failed gate insert rolls back every imported row', async () => {
    const seed = fixture();
    seed.nextWork.revision = 7;
    seed.nextWork.lifecycle.revision = 7;
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const binding = reconciliationBinding({
      workVersion: { revision: 7, digest: canonicalJsonDigest(seed.nextWork) },
    });
    database.exec(
      "CREATE TRIGGER deny_gate_import BEFORE INSERT ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected import failure'); END",
    );
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toThrow(
      /injected import failure/,
    );
    await store.releaseMaintenanceFence(fence);
    expect(store.readHostStateSnapshot(identity)).toEqual({
      work: null,
      ledger: null,
      workVersion: null,
      ledgerVersion: null,
      maintenanceGeneration: 1,
    });
    expect(store.readReconciliationGate()).toBeNull();
  });

  test('first paired work CAS closes the gate in the same durable transaction', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const binding = reconciliationBinding(saved);
    const gate = store.openReconciliationGate(binding);
    expect(store.openReconciliationGate(binding)).toEqual(gate);
    expect(() => store.openReconciliationGate({ ...binding, manifest_digest: '6'.repeat(64) })).toThrow();
    const updated = store.compareAndSwapHostState(next(saved));
    expect(store.readReconciliationGate()).toMatchObject({
      status: 'closed',
      closed_work_version: updated.workVersion,
      closed_ledger_version: updated.ledgerVersion,
    });
    reopenStore();
    expect(store.readReconciliationGate().status).toBe('closed');
    expect(() => store.reserveReconciliationRestore(binding)).toThrow(/closed/);
  });

  test('opening the reconciliation gate requires quiescent governance', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const binding = reconciliationBinding(saved);
    const operation = store.reserveOperation('operations', operationKey, requestDigest);
    expect(operation).not.toBeNull();
    expect(() => store.openReconciliationGate(binding)).toThrow(/governance is not quiescent/);
    expect(store.readReconciliationGate()).toBeNull();
    store.transitionOperation(operation, 'commit_unknown');
    expect(() => store.openReconciliationGate(binding)).toThrow(/governance is not quiescent/);
    expect(store.readReconciliationGate()).toBeNull();
    store.transitionOperation(operation, 'applied', resultDigest);
    expect(store.openReconciliationGate(binding).status).toBe('open');
  });

  test('replaying an open gate cannot bypass a newly reserved operation', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const binding = reconciliationBinding(saved);
    const gate = store.openReconciliationGate(binding);
    const operation = store.reserveOperation('operations', operationKey, requestDigest);
    expect(() => store.openReconciliationGate(binding)).toThrow(/governance is not quiescent/);
    expect(store.readReconciliationGate()).toEqual(gate);
    store.transitionOperation(operation, 'commit_unknown');
    store.transitionOperation(operation, 'applied', resultDigest);
    expect(store.openReconciliationGate(binding)).toEqual(gate);
  });

  test('opening the reconciliation gate rejects started and uncertain workflow attempts', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const attempt = store.claimWorkflowAttempt(attemptRequest(saved));
    expect(() => store.openReconciliationGate(reconciliationBinding(attempt))).toThrow(
      /workflow attempt is not quiescent/,
    );
    store.markWorkflowAttemptUncertain(attempt);
    const current = store.readHostStateSnapshot(identity);
    expect(() => store.openReconciliationGate(reconciliationBinding(current))).toThrow(
      /workflow attempt is not quiescent/,
    );
    expect(store.readReconciliationGate()).toBeNull();
  });

  test('attempt writes close the gate and a failed gate CAS rolls back the work write', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const binding = reconciliationBinding(saved);
    store.openReconciliationGate(binding);
    database.exec(
      "CREATE TRIGGER deny_gate_close BEFORE UPDATE ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected gate failure'); END",
    );
    expect(() => store.claimWorkflowAttempt(attemptRequest(saved))).toThrow(/injected gate failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    expect(store.readReconciliationGate().status).toBe('open');
    database.exec('DROP TRIGGER deny_gate_close');
    const attempt = store.claimWorkflowAttempt(attemptRequest(saved));
    expect(attempt.attempt.status).toBe('started');
    expect(store.readReconciliationGate().closed_work_version).toEqual(attempt.workVersion);
  });

  test('failed gate close rolls back both paired host-state rows', () => {
    const saved = store.compareAndSwapHostState(fixture());
    store.openReconciliationGate(reconciliationBinding(saved));
    database.exec(
      "CREATE TRIGGER deny_gate_close BEFORE UPDATE ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected gate failure'); END",
    );
    expect(() => store.compareAndSwapHostState(next(saved))).toThrow(/injected gate failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    expect(store.readReconciliationGate().status).toBe('open');
  });

  test('reopened gate rejects a malformed stored binding even with a recomputed checksum', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const gate = store.openReconciliationGate(reconciliationBinding(saved));
    const malformed = { ...gate, binding: { ...gate.binding, manifest_digest: 'invalid' } };
    database
      .query('UPDATE agent_host_reconciliation SET payload=?,digest=? WHERE workspace_id=?')
      .run(canonicalJson(malformed), canonicalJsonDigest(malformed), workspace);
    reopenStore();
    expect(() => store.readReconciliationGate()).toThrow(/binding invalid/);
    expect(() => store.compareAndSwapHostState(next(saved))).toThrow(/binding invalid/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('restore reservation fences work writes before filesystem recovery and survives restart', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const binding = reconciliationBinding(saved);
    store.openReconciliationGate(binding);
    const reservation = store.reserveReconciliationRestore(binding);
    expect(reservation.status).toBe('restoring');
    expect(store.reserveReconciliationRestore(binding)).toEqual(reservation);
    expect(() => store.compareAndSwapHostState(next(saved))).toThrow(/blocked during reconciliation restore/);
    expect(() => store.claimWorkflowAttempt(attemptRequest(saved))).toThrow(/blocked during reconciliation restore/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    reopenStore();
    expect(store.readReconciliationGate()).toEqual(reservation);
    expect(() => store.completeReconciliationRestore({ ...reservation, fencing_token: 'forged' })).toThrow(/fencing/);
    expect(store.completeReconciliationRestore(reservation).status).toBe('restored');
    expect(() => store.compareAndSwapHostState(next(saved))).toThrow(/blocked during reconciliation restore/);
  });

  test('restore waits for governance quiescence and fences every governance write across restart', async () => {
    const saved = store.compareAndSwapHostState(fixture());
    const binding = reconciliationBinding(saved);
    store.openReconciliationGate(binding);
    const operation = store.reserveOperation('operations', operationKey, requestDigest);
    expect(operation).not.toBeNull();
    expect(() => store.reserveReconciliationRestore(binding)).toThrow(/governance is not quiescent/);
    store.transitionOperation(operation, 'commit_unknown');
    expect(() => store.reserveReconciliationRestore(binding)).toThrow(/governance is not quiescent/);
    store.transitionOperation(operation, 'applied', resultDigest);
    const reservation = store.reserveReconciliationRestore(binding);
    expect(() => store.reserveOperation('operations', '9'.repeat(64), requestDigest)).toThrow(
      /governance write blocked during reconciliation restore/,
    );
    expect(() => store.transitionOperation(operation, 'applied', resultDigest)).toThrow(
      /governance write blocked during reconciliation restore/,
    );
    let callbackCalled = false;
    await expect(
      store.consumeApproval('approvals', approvalBinding(), async () => {
        callbackCalled = true;
      }),
    ).rejects.toThrow(/governance write blocked during reconciliation restore/);
    expect(callbackCalled).toBe(false);
    expect(store.inspectOperation('operations', operationKey)?.status).toBe('applied');
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    reopenStore();
    expect(store.readReconciliationGate()).toEqual(reservation);
    expect(store.inspectOperation('operations', operationKey)?.status).toBe('applied');
    expect(store.completeReconciliationRestore(reservation).status).toBe('restored');
    expect(() => store.reserveOperation('operations', '9'.repeat(64), requestDigest)).toThrow(
      /governance write blocked during reconciliation restore/,
    );
  });
});

describe('host SQLite governance persistence', () => {
  test('rejects malformed namespaces and approval records before any persistent state exists', async () => {
    for (const storeId of ['', '../other', 'a'.repeat(129), 123])
      expect(() => store.reserveOperation(storeId, operationKey, requestDigest)).toThrow(/namespace/);
    expect(() => store.reserveOperation('operations', 'invalid', requestDigest)).toThrow(/namespace/);
    expect(() => store.reserveOperation('operations', operationKey, 'invalid')).toThrow(/digest/);
    await expect(
      store.consumeApproval('approvals', { ...approvalBinding(), extra: true }, async () => {}),
    ).rejects.toThrow(/record/);
    expect(governanceRows()).toEqual([]);
    expect(database.query('SELECT * FROM agent_host_governance_stores').all()).toEqual([]);
  });
  test('reservation and strict terminal transitions survive reopening without changing work or coordination', () => {
    const before = store.compareAndSwapHostState(fixture());
    const reservation = store.reserveOperation('operations', operationKey, requestDigest);
    expect(store.reserveOperation('operations', operationKey, requestDigest)).toBeNull();
    expect(() => store.transitionOperation(reservation, 'applied', resultDigest)).toThrow(/state conflict/);
    reopenStore();
    expect(store.inspectOperation('operations', operationKey)).toEqual(reservation);
    store.transitionOperation(reservation, 'commit_unknown');
    expect(() => store.transitionOperation(reservation, 'aborted')).toThrow(/state conflict/);
    reopenStore();
    expect(store.inspectOperation('operations', operationKey).status).toBe('commit_unknown');
    store.transitionOperation(reservation, 'applied', resultDigest);
    const rows = governanceRows();
    store.transitionOperation(reservation, 'applied', resultDigest);
    expect(governanceRows()).toEqual(rows);
    expect(() => store.transitionOperation(reservation, 'applied', requestDigest)).toThrow(/result conflict/);
    reopenStore();
    expect(store.inspectOperation('operations', operationKey)).toMatchObject({
      status: 'applied',
      result_digest: resultDigest,
      terminal_revision: 3,
    });
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
  });
  test('pre-commit abort is terminal and namespace ownership cannot be substituted', () => {
    const first = store.reserveOperation('first', operationKey, requestDigest);
    const other = store.reserveOperation('second', operationKey, requestDigest);
    const adapter = createHostOperationReservationStore(store.governanceCapability, 'first');
    expect(adapter.scope).toBe('host-sqlite');
    expect(adapter.host_capability).toBeUndefined();
    expect(() => adapter.abort(other)).toThrow(/different store/);
    adapter.abort(first);
    expect(() => adapter.markCommitStarted(first)).toThrow(/state conflict/);
    expect(() => adapter.complete(first, resultDigest)).toThrow(/state conflict/);
    expect(store.inspectOperation('second', operationKey)).toEqual(other);
    const foreign = new HostStateStore(database, 'b'.repeat(64));
    expect(foreign.inspectOperation('first', operationKey)).toBeNull();
    expect(() => foreign.transitionOperation(first, 'aborted')).toThrow(/missing/);
  });
  test.each(['fencing_token', 'request_digest', 'created_at', 'revision'])(
    'rejects a forged reservation %s without changing persisted bytes',
    (field) => {
      const reserved = store.reserveOperation('operations', operationKey, requestDigest);
      const forged = {
        ...reserved,
        [field]: {
          fencing_token: '00000000-0000-0000-0000-000000000000',
          request_digest: resultDigest,
          created_at: '2020-01-01T00:00:00.000Z',
          revision: 2,
        }[field],
      };
      const rows = governanceRows();
      expect(() => store.transitionOperation(forged, 'commit_unknown')).toThrow(/fencing/);
      expect(governanceRows()).toEqual(rows);
    },
  );
  test('corrupt payload, row identity, revision or store identity fails closed', () => {
    store.reserveOperation('operations', operationKey, requestDigest);
    const original = governanceRows()[0];
    for (const [column, value] of [
      ['payload', '{}'],
      ['revision', 8],
      ['digest', '0'.repeat(64)],
    ]) {
      database.query(`UPDATE agent_host_governance SET ${column}=?`).run(value);
      expect(() => store.inspectOperation('operations', operationKey)).toThrow();
      database.query(`UPDATE agent_host_governance SET ${column}=?`).run(original[column]);
    }
    database.query('UPDATE agent_host_governance SET store_id=?').run('foreign');
    expect(() => store.inspectOperation('foreign', operationKey)).toThrow(/identity/);
    database.query('UPDATE agent_host_governance SET store_id=?').run('operations');
    database.query('UPDATE agent_host_governance_stores SET digest=?').run('0'.repeat(64));
    expect(() => store.inspectOperation('operations', operationKey)).toThrow(/identity/);
  });
  test('SQLite insert/transition failures roll back and preserve the external-effect boundary', async () => {
    database.exec(
      "CREATE TRIGGER reject_governance_insert BEFORE INSERT ON agent_host_governance BEGIN SELECT RAISE(ABORT,'injected insert failure'); END",
    );
    expect(() => store.reserveOperation('operations', operationKey, requestDigest)).toThrow(/injected/);
    expect(governanceRows()).toEqual([]);
    expect(database.query('SELECT * FROM agent_host_governance_stores').all()).toEqual([]);
    database.exec('DROP TRIGGER reject_governance_insert');
    database.exec(
      "CREATE TRIGGER reject_governance_update BEFORE UPDATE ON agent_host_governance BEGIN SELECT RAISE(ABORT,'injected transition failure'); END",
    );
    let calls = 0;
    await expect(
      store.consumeApproval('approvals', approvalBinding(), async () => {
        calls++;
      }),
    ).rejects.toThrow(/injected/);
    expect(calls).toBe(0);
    expect(JSON.parse(governanceRows()[0].payload).status).toBe('reserved');
    database.exec('DROP TRIGGER reject_governance_update');
    await expect(
      store.consumeApproval('approvals', approvalBinding(), async () => {
        calls++;
      }),
    ).rejects.toThrow(/replay/);
    expect(calls).toBe(0);
  });
  test('approval commits its unknown marker before callback and never replays a successful or throwing callback', async () => {
    let calls = 0;
    const apply = async () => {
      calls++;
      expect(database.inTransaction).toBe(false);
      expect(JSON.parse(governanceRows().find((row) => row.kind === 'approval').payload).status).toBe('commit_unknown');
    };
    await store.consumeApproval('approvals', approvalBinding(), apply);
    expect(JSON.parse(governanceRows()[0].payload).status).toBe('applied');
    const generation = JSON.parse(governanceRows()[0].payload).store_generation;
    reopenStore();
    await expect(store.consumeApproval('approvals', approvalBinding(), apply)).rejects.toThrow(/replay/);
    const second = { ...approvalBinding(), approval_id: 'approval-2' };
    await expect(
      store.consumeApproval('approvals', second, async () => {
        calls++;
        throw new Error('external outcome unknown');
      }),
    ).rejects.toThrow(/external outcome/);
    expect(governanceRows().map((row) => JSON.parse(row.payload).store_generation)).toEqual([generation, generation]);
    reopenStore();
    await expect(store.consumeApproval('approvals', second, apply)).rejects.toThrow(/replay/);
    expect(calls).toBe(2);
  });
  test('failed final approval commit leaves an inspectable unknown outcome after reopen', async () => {
    database.exec(
      "CREATE TRIGGER reject_approval_final BEFORE UPDATE ON agent_host_governance WHEN NEW.revision=3 BEGIN SELECT RAISE(ABORT,'final commit failure'); END",
    );
    let calls = 0;
    await expect(
      store.consumeApproval('approvals', approvalBinding(), async () => {
        calls++;
      }),
    ).rejects.toThrow(/final commit/);
    reopenStore();
    expect(JSON.parse(governanceRows()[0].payload).status).toBe('commit_unknown');
    await expect(
      store.consumeApproval('approvals', approvalBinding(), async () => {
        calls++;
      }),
    ).rejects.toThrow(/replay/);
    expect(calls).toBe(1);
  });
  test('another connection cannot consume an approval while its callback is in flight', async () => {
    const otherDb = new Database(databasePath, { strict: true });
    handles.push(otherDb);
    const other = new HostStateStore(otherDb, workspace);
    let release,
      calls = 0;
    const pending = store.consumeApproval('approvals', approvalBinding(), async () => {
      calls++;
      await new Promise((resolve) => {
        release = resolve;
      });
    });
    await expect(
      other.consumeApproval('approvals', approvalBinding(), async () => {
        calls++;
      }),
    ).rejects.toThrow(/replay/);
    release();
    await pending;
    expect(calls).toBe(1);
  });
  test('opaque governance capability is pinned and cannot be fabricated or paired with a different attempt store', () => {
    expect(() => createHostOperationReservationStore({})).toThrow(/opaque/);
    const capability = store.governanceCapability;
    expect(() => {
      store.governanceCapability = {};
    }).toThrow();
    const adapter = createHostOperationReservationStore(capability, 'operations');
    const reservation = store.reserveOperation('operations', operationKey, requestDigest);
    store.transitionOperation = () => {
      throw new Error('replaced method');
    };
    adapter.markCommitStarted(reservation);
    const other = new HostStateStore(database, workspace);
    expect(() =>
      createTestTrustedHostLauncherCapability({
        authentication: {
          schema: 'TrustedHostAuthentication/v1',
          repositoryRoot: root,
          repositoryId: 'project-repository',
          projectIds: ['project'],
          integrationsDigest: 'e'.repeat(64),
          principal: 'fixture:host',
          configRevision: 1,
          permittedOperations: ['workflow'],
        },
        services: {
          governanceCapability: capability,
          workflowAttempts: other,
          resolveIdentity: () => null,
          verifyApproval: () => null,
          runtimeRevision: () => ({}),
          casWriter: () => {},
        },
      }),
    ).toThrow(/same|share one/);
  });
  test('workflow attempts require the same explicit governance owner for operation reservations', () => {
    const authentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: 'project-repository',
      projectIds: ['project'],
      integrationsDigest: 'e'.repeat(64),
      principal: 'fixture:host',
      configRevision: 1,
      permittedOperations: ['workflow'],
    };
    const services = {
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({}),
      casWriter: () => {},
    };
    expect(() =>
      createTestTrustedHostLauncherCapability({
        authentication,
        services: { ...services, workflowAttempts: store },
      }),
    ).toThrow(/share one host state owner/);
    expect(() => createTestTrustedHostLauncherCapability({ authentication, services })).not.toThrow();
    const attemptsWithoutOwner = {
      claimWorkflowAssignment: store.claimWorkflowAssignment.bind(store),
      completeWorkflowAttempt: store.completeWorkflowAttempt.bind(store),
      markWorkflowAttemptUncertain: store.markWorkflowAttemptUncertain.bind(store),
      abortUnstartedWorkflowAttempt: store.abortUnstartedWorkflowAttempt.bind(store),
    };
    expect(() =>
      createTestTrustedHostLauncherCapability({
        authentication,
        services: { ...services, workflowAttempts: attemptsWithoutOwner },
      }),
    ).toThrow(/share one host state owner/);
  });
  test('trusted host rejects malformed attempt persistence before issuing a launcher capability', () => {
    const authentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: 'project-repository',
      projectIds: ['project'],
      integrationsDigest: 'e'.repeat(64),
      principal: 'fixture:host',
      configRevision: 1,
      permittedOperations: ['workflow'],
    };
    const services = {
      governanceCapability: store.governanceCapability,
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({}),
      casWriter: () => {},
    };
    for (const workflowAttempts of [null, 1, 'attempts']) {
      expect(() =>
        createTestTrustedHostLauncherCapability({
          authentication,
          services: { ...services, workflowAttempts },
        }),
      ).toThrow(/trusted attempt persistence service is invalid/);
    }
    const methods = {
      governanceCapability: store.governanceCapability,
      claimWorkflowAssignment: () => {},
      completeWorkflowAttempt: () => {},
      markWorkflowAttemptUncertain: () => {},
      abortUnstartedWorkflowAttempt: () => {},
    };
    for (const method of [
      'claimWorkflowAssignment',
      'completeWorkflowAttempt',
      'markWorkflowAttemptUncertain',
      'abortUnstartedWorkflowAttempt',
    ]) {
      const workflowAttempts = { ...methods };
      delete workflowAttempts[method];
      expect(() =>
        createTestTrustedHostLauncherCapability({
          authentication,
          services: { ...services, workflowAttempts },
        }),
      ).toThrow(/trusted attempt persistence service is invalid/);
    }
    expect(() =>
      createTestTrustedHostLauncherCapability({
        authentication,
        services: { ...services, workflowAttempts: { ...methods, reconciliationPrincipal: '' } },
      }),
    ).toThrow(/trusted reconciliation principal is required/);
    for (const service of [
      'resolveWorkExecutionContext',
      'dispatchWorkflowAssignment',
      'validateWorkflowAssignmentResult',
      'resolveWorkflowWorkItem',
    ]) {
      expect(() =>
        createTestTrustedHostLauncherCapability({
          authentication,
          services: { ...services, [service]: true },
        }),
      ).toThrow(/invalid/);
    }
    for (const method of [
      'claimWorkflowAssignmentWithApproval',
      'beginWorkflowAttemptEffect',
      'completeWorkflowAttemptWithApproval',
    ]) {
      expect(() =>
        createTestTrustedHostLauncherCapability({
          authentication,
          services: { ...services, workflowAttempts: { ...methods, [method]: true } },
        }),
      ).toThrow(/trusted protected attempt persistence service is invalid/);
    }
  });
});

describe('current-v1 paired host state on real Bun SQLite', () => {
  test('recognizes only genuine host state store instances', () => {
    expect(HostStateStore.isHostStateStore(store)).toBe(true);
    expect(HostStateStore.isHostStateStore({})).toBe(false);
    expect(HostStateStore.isHostStateStore(null)).toBe(false);
  });

  test.each([
    ['information_research_light', 'information_research', 'research', 'internal', 'Research'],
    ['implementation_new', 'implementation_new', 'feature', 'azure', 'Feature'],
    ['implementation_change', 'implementation_change', 'feature', 'azure', 'Feature'],
    ['bug_fix', 'bug_fix', 'bug', 'azure', 'Bug'],
    ['task_execution', 'task_execution', 'task', 'azure', 'Task'],
  ])(
    'real Mastra + SQLite executes and resumes %s without repeated dispatch (fixture host identity)',
    async (workflowId, intent, kind, provider, providerType) => {
      await mkdir(path.join(root, 'runtime'));
      await mkdir(path.join(root, 'docs'));
      await cp(new URL('../../schemas', import.meta.url), path.join(root, 'runtime/schemas'), { recursive: true });
      await mkdir(path.join(root, 'runtime/instructions'), { recursive: true });
      await Promise.all([
        cp(new URL('../../TESTING.md', import.meta.url), path.join(root, 'runtime/TESTING.md')),
        ...[
          'development-lifecycle',
          'agent-allocation',
          'request-clarification',
          'adaptive-reporting',
          'requirement-routing',
          'knowledge-graph',
        ].map((name) =>
          cp(
            new URL(`../../instructions/${name}.md`, import.meta.url),
            path.join(root, `runtime/instructions/${name}.md`),
          ),
        ),
      ]);
      const yaml = (
        await readFile(new URL('../../templates/agent-runtime.config.template.v1.yaml', import.meta.url), 'utf8')
      )
        .replaceAll('{{BUNDLE}}', 'runtime')
        .replaceAll('{{REPOSITORY}}', identity.repository_id)
        .replaceAll('{{PROJECT}}', identity.project_ids[0]);
      await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), yaml);
      const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
      await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
      await writeFile(
        path.join(root, policyPath),
        `${JSON.stringify(
          {
            schema: 'DocumentationPolicy/v1',
            policy_id: 'workflow-host-fixture',
            project_id: identity.project_ids[0],
            source_path: policyPath,
            owner: 'workflow-test',
            required: false,
            canonical_roots: ['docs'],
            map_paths: ['AGENT.sidecar.md'],
            excluded_roots: [],
            changelog_required: false,
            changelog_path: null,
            relations: ['documents'],
            updated_at: '2026-09-28T00:00:00.000Z',
          },
          null,
          2,
        )}\n`,
      );
      await writeFile(path.join(root, 'AGENTS.md'), '# Generic integration fixture\n');
      await writeFile(path.join(root, 'AGENT.sidecar.md'), '# Fixture project\n');
      const config = loadRuntimeConfig(root);
      identity.integrations_digest = loadProjectSetContext(
        root,
        config,
        identity.repository_id,
        identity.project_ids,
      ).integrations_digest;
      const workItem = {
        schema: 'WorkItem/v1',
        id: 'external-work',
        provider,
        provider_type: providerType,
        canonical_kind: kind,
        intent,
        project_id: identity.project_ids[0],
        title: 'Durable integration',
        description: '',
        labels: [],
        risk_flags: [],
      };
      const initial = fixture();
      Object.assign(initial.nextWork.binding, {
        integrations_digest: identity.integrations_digest,
        team_id: 'default-development',
        workflow_id: workflowId,
        work_item_digest: canonicalJsonDigest(workItem),
        config_digest: runtimeConfigDigest(config),
      });
      initial.nextLedger.tickets[0].integrations_digest = identity.integrations_digest;
      initial.nextWork.lifecycle.config_binding.config_digest = initial.nextWork.binding.config_digest;
      initial.nextWork.execution.phase = config.workflows[workflowId].entry_stage;
      const original = store.compareAndSwapHostState(initial);
      let dispatches = 0,
        validations = 0;
      const run = async (stateStore) => {
        let workflowApprovalStoreId;
        stateStore = new HostStateStore(database, workspace, undefined, undefined, {
          principal: 'fixture:executor',
          verify: async (request) => {
            const unsigned = {
              schema: 'EdictumWorkflowApproval/v1',
              stage_id: request.stage_id,
              approval_id: request.attempt_id,
              approver: 'fixture:executor',
              operation_hash: request.operation_hash,
              tenant: request.identity.repository_id,
              project: request.identity.project_ids[0],
              approved_at: new Date(Date.now() - 1000).toISOString(),
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            };
            return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
          },
        });
        const workflowAttempts = {
          governanceCapability: stateStore.governanceCapability,
          claimWorkflowAssignment: stateStore.claimWorkflowAssignment.bind(stateStore),
          completeWorkflowAttempt: stateStore.completeWorkflowAttempt.bind(stateStore),
          markWorkflowAttemptUncertain: stateStore.markWorkflowAttemptUncertain.bind(stateStore),
          claimWorkflowAssignmentWithApproval: (invocation, digest, action) =>
            stateStore.claimWorkflowAssignmentWithApproval(invocation, digest, action, workflowApprovalStoreId),
          beginWorkflowAttemptEffect: stateStore.beginWorkflowAttemptEffect.bind(stateStore),
          completeWorkflowAttemptWithApproval: stateStore.completeWorkflowAttemptWithApproval.bind(stateStore),
          abortUnstartedWorkflowAttempt: stateStore.abortUnstartedWorkflowAttempt.bind(stateStore),
        };
        // Identity, lifecycle permission and artifact validation are fixture services;
        // Mastra execution and every attempt admission/outcome use the actual store.
        const host = await createTrustedHostComposition(
          createTestTrustedHostLauncherCapability({
            authentication: {
              schema: 'TrustedHostAuthentication/v1',
              repositoryRoot: root,
              repositoryId: identity.repository_id,
              projectIds: identity.project_ids,
              integrationsDigest: identity.integrations_digest,
              principal: 'fixture:executor',
              configRevision: config.config_revision,
              permittedOperations: ['workflow', 'runtime.write'],
            },
            services: {
              governanceCapability: stateStore.governanceCapability,
              workflowAttempts,
              resolveWorkflowWorkItem: () => workItem,
              resolveWorkExecutionContext: (request) => {
                const state = stateStore.readHostStateSnapshot(identity),
                  ticket = state.ledger.tickets[0];
                return {
                  schema: 'WorkExecutionContext/v1',
                  binding: state.work.binding,
                  permit: {
                    context_digest: canonicalJsonDigest(state.work.binding),
                    checkpoint_revision: state.workVersion.revision,
                    checkpoint_digest: state.workVersion.digest,
                    runtime_current_revision: 1,
                    stage_id: request.stageId,
                    assignment_index: request.assignmentIndex,
                    dispatch_authorized: true,
                    lease: {
                      ...state.work.lease,
                      ledger_revision: state.ledgerVersion.revision,
                      expires_at: ticket.expires_at,
                      active_resources: ticket.active_resources,
                      blocked_resources: ticket.blocked_resources,
                    },
                  },
                };
              },
              dispatchWorkflowAssignment: (invocation) => {
                dispatches++;
                expect(invocation.attempt.status).toBe('started');
                const persisted = stateStore.readHostStateSnapshot(identity).work.execution.assignment_attempts;
                expect(persisted.find((entry) => entry.attempt_id === invocation.attempt.attempt_id)).toEqual(
                  invocation.attempt,
                );
                return { role: invocation.assignment.role, stage: invocation.stage.id };
              },
              validateWorkflowAssignmentResult: (invocation, result) => {
                validations++;
                expect(result).toEqual({ role: invocation.assignment.role, stage: invocation.stage.id });
                const persisted = stateStore.readHostStateSnapshot(identity).work.execution.assignment_attempts;
                expect(persisted.find((entry) => entry.attempt_id === invocation.attempt.attempt_id).status).toBe(
                  invocation.attempt.status,
                );
              },
              resolveIdentity: () => null,
              verifyApproval: () => null,
              runtimeRevision: () => ({ sourceRevision: 'runtime-source', currentRevision: 1 }),
              casWriter: () => {
                throw new Error('Integration fixture must not write source');
              },
              timingSink: { record: () => {} },
            },
          }),
        );
        workflowApprovalStoreId = host.workflowHostCapability.storeId;
        const approval = { ...approvalBinding(), approval_id: workflowId };
        if (dispatches === 0) {
          await host.workflowHostCapability.consumeApproval(approval, async () => {
            const row = governanceRows().find((entry) => entry.kind === 'approval');
            expect(JSON.parse(row.payload).status).toBe('commit_unknown');
          });
        } else {
          await expect(
            host.workflowHostCapability.consumeApproval(approval, async () => {
              throw new Error('persisted approval must not invoke another callback');
            }),
          ).rejects.toThrow(/replay/);
        }
        const graph = createConfiguredMastra(
          root,
          {
            team_id: 'default-development',
            work_item: {
              kind,
              intent,
              project: identity.project_ids[0],
              labels: [],
              risk_flags: [],
            },
          },
          { workflowExecutionCapability: host.workflowExecutionCapability },
        );
        return graph.dispatch(workItem.id);
      };
      const first = await run(store);
      expect(first.workflowId).toBe(workflowId);
      expect(first.failedAssignments).toEqual([]);
      const expected = config.workflows[workflowId].stages.flatMap((stage) =>
        stage.assignments.filter((assignment) => !assignment.risk_flags?.length),
      );
      expect(dispatches).toBe(expected.length);
      expect(validations).toBe(expected.length);
      const saved = store.readHostStateSnapshot(identity);
      expect(saved.ledgerVersion).toEqual(original.ledgerVersion);
      expect(saved.work.execution.assignment_attempts).toHaveLength(expected.length);
      database.close();
      handles.pop();
      database = new Database(databasePath, { strict: true });
      handles.push(database);
      store = new HostStateStore(database, workspace);
      const resumed = await run(store);
      expect(resumed.failedAssignments).toEqual([]);
      expect(resumed.stageOutputs).toEqual(first.stageOutputs);
      expect(dispatches).toBe(expected.length);
      expect(validations).toBe(expected.length * 2);
      expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    },
  );

  test('verifier principal and function are pinned at store construction', async () => {
    store.compareAndSwapHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    const verifier = { principal: 'runtime:test-verifier', verify: reconciliationAuthorization };
    const verified = new HostStateStore(database, workspace, verifier);
    verifier.principal = 'other-machine';
    verifier.verify = () => null;
    expect(() => {
      verified.reconciliationPrincipal = 'other-machine';
    }).toThrow();
    expect(() => Object.defineProperty(verified, 'reconciliationPrincipal', { value: 'other-machine' })).toThrow();
    expect(
      (await verified.reconcileWorkflowAttempt(reconciliationRequest(started))).attempt.reconciliation.principal,
    ).toBe('runtime:test-verifier');
  });

  test('observed completion requires a typed trusted authorization and persists for replay after reopen', async () => {
    store.compareAndSwapHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    store.markWorkflowAttemptUncertain(started);
    const request = reconciliationRequest(started);
    const before = store.readHostStateSnapshot(identity);
    await expect(store.reconcileWorkflowAttempt(request)).rejects.toThrow(/verifier required/);
    for (const response of [null, true, { accepted: true }]) {
      const denied = verifyingStore(database, () => response);
      await expect(denied.reconcileWorkflowAttempt(request)).rejects.toThrow();
      expect(store.readHostStateSnapshot(identity)).toEqual(before);
    }
    const verified = verifyingStore(database, reconciliationAuthorization);
    const completed = await verified.reconcileWorkflowAttempt(request);
    expect(completed.attempt.reconciliation.attempt_id).toBe(started.attempt.attempt_id);
    expect(completed.attempt.result).toEqual(request.result);
    expect(verified.readHostStateSnapshot(identity).ledgerVersion).toEqual(before.ledgerVersion);
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    const other = new HostStateStore(reopened, workspace);
    expect(other.claimWorkflowAttempt(attemptRequest(other.readHostStateSnapshot(identity)))).toEqual(completed);
    expect(() => other.completeWorkflowAttempt(started, request.result)).toThrow(/completion binding/);
  });

  test('reconciliation replay after reopen returns the persisted receipt and rejects changed proof inputs', async () => {
    store.compareAndSwapHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started);
    const verifierCalls = { count: 0 };
    const verified = verifyingStore(database, (input, state) => {
      verifierCalls.count++;
      return reconciliationAuthorization(input, state);
    });
    const completed = await verified.reconcileWorkflowAttempt(request);
    const beforeReplay = store.readHostStateSnapshot(identity);
    reopenStore();
    const reopened = verifyingStore(database, () => {
      verifierCalls.count++;
      throw new Error('replay must not reverify');
    });
    expect(await reopened.reconcileWorkflowAttempt(request)).toEqual(completed);
    expect(reopened.readHostStateSnapshot(identity)).toEqual(beforeReplay);
    expect(verifierCalls.count).toBe(1);
    for (const changed of [
      { ...request, result: { recovered: 'changed' } },
      { ...request, providerEvidence: { ...request.providerEvidence, sha256: '9'.repeat(64) } },
      { ...request, retryLease: { ticket_id: 'ticket-work', thread_id: 'changed', generation: 2 } },
    ]) {
      await expect(reopened.reconcileWorkflowAttempt(changed)).rejects.toThrow(/replay binding/);
      expect(reopened.readHostStateSnapshot(identity)).toEqual(beforeReplay);
    }
    expect(verifierCalls.count).toBe(1);
  });

  test('proven no effect retains predecessor and permits exactly the authorized new fence', async () => {
    const initial = fixture();
    initial.nextWork.contracts.decisions.push(decision);
    store.compareAndSwapHostState(initial);
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started, 'no_effect');
    const verified = verifyingStore(database, reconciliationAuthorization);
    await verified.reconcileWorkflowAttempt(request);
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/retry fence/);
    expect(() => store.completeWorkflowAttempt(started, { late: true })).toThrow(/completion binding/);
    const renew = next();
    Object.assign(renew.nextLedger.tickets[0], { thread_id: 'recovery', generation: 2 });
    Object.assign(activeClaimFor(renew.nextLedger), { thread_id: 'recovery', generation: 2 });
    renew.nextWork.lease = request.retryLease;
    store.compareAndSwapHostState(renew);
    const beforeRetry = store.readHostStateSnapshot(identity);
    const retry = store.claimWorkflowAttempt(attemptRequest(beforeRetry));
    expect(retry.attempt.previous_attempt_id).toBe(started.attempt.attempt_id);
    expect(retry.attempt.attempt_id).not.toBe(started.attempt.attempt_id);
    expect(() => store.claimWorkflowAttempt(attemptRequest(beforeRetry))).toThrow(/compare-and-swap/);
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/reconciliation/);
    store.completeWorkflowAttempt(retry, 'finished');
    expect(
      store.readHostStateSnapshot(identity).work.execution.assignment_attempts.map((entry) => entry.status),
    ).toEqual(['no_effect', 'completed']);
  });

  test('no-effect reconciliation replay after reopen binds the decision, evidence, lease and versions', async () => {
    const initial = fixture();
    initial.nextWork.contracts.decisions.push(decision);
    store.compareAndSwapHostState(initial);
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started, 'no_effect');
    const verified = verifyingStore(database, reconciliationAuthorization);
    const reconciled = await verified.reconcileWorkflowAttempt(request);
    const persisted = store.readHostStateSnapshot(identity);
    reopenStore();

    await expect(new HostStateStore(database, workspace).reconcileWorkflowAttempt(request)).rejects.toThrow(
      /verifier required/,
    );
    const reopened = verifyingStore(database, () => {
      throw new Error('exact replay must not reverify');
    });
    expect(await reopened.reconcileWorkflowAttempt(request)).toEqual(reconciled);
    expect(reopened.readHostStateSnapshot(identity)).toEqual(persisted);

    const changedInputs = [
      { ...request, decision: { ...decision, sha256: '9'.repeat(64) } },
      { ...request, providerEvidence: { ...request.providerEvidence, sha256: '9'.repeat(64) } },
      { ...request, retryLease: { ...request.retryLease, generation: request.retryLease.generation + 1 } },
      { ...request, expectedWork: { ...request.expectedWork, digest: '9'.repeat(64) } },
      { ...request, expectedLedger: { ...request.expectedLedger, digest: '9'.repeat(64) } },
    ];
    for (const changed of changedInputs) {
      await expect(reopened.reconcileWorkflowAttempt(changed)).rejects.toThrow(/replay binding/);
      expect(reopened.readHostStateSnapshot(identity)).toEqual(persisted);
    }
  });

  test.each(['principal', 'attempt_id', 'request_digest', 'work_binding_digest', 'result_digest'])(
    'rejects foreign authorization %s without mutation',
    async (field) => {
      store.compareAndSwapHostState(fixture());
      const started = store.claimWorkflowAttempt(attemptRequest());
      const request = reconciliationRequest(started),
        before = store.readHostStateSnapshot(identity);
      const verified = verifyingStore(database, (input, state) => ({
        ...reconciliationAuthorization(input, state),
        [field]: '9'.repeat(64),
      }));
      await expect(verified.reconcileWorkflowAttempt(request)).rejects.toThrow(/differs from transition/);
      expect(store.readHostStateSnapshot(identity)).toEqual(before);
    },
  );

  test.each(['work', 'ledger'])(
    'asynchronous reconciliation rechecks %s CAS after proof verification',
    async (kind) => {
      store.compareAndSwapHostState(fixture());
      const started = store.claimWorkflowAttempt(attemptRequest());
      const request = reconciliationRequest(started);
      let changed;
      const verified = verifyingStore(database, async (input, state) => {
        expect(Object.isFrozen(input)).toBe(true);
        expect(Object.isFrozen(state.work)).toBe(true);
        expect(database.inTransaction).toBe(false);
        if (kind === 'work') store.claimWorkflowAttempt(attemptRequest(undefined, 1));
        else {
          const foreign = fixture('other', 'file:src/other.ts');
          foreign.expectedLedger = state.ledgerVersion;
          foreign.nextLedger.revision = state.ledger.revision + 1;
          includeExistingLedger(foreign, state.ledger);
          store.compareAndSwapHostState(foreign);
        }
        changed = store.readHostStateSnapshot(identity);
        return reconciliationAuthorization(input, state);
      });
      await expect(verified.reconcileWorkflowAttempt(request)).rejects.toThrow(/compare-and-swap/);
      expect(store.readHostStateSnapshot(identity)).toEqual(changed);
    },
  );

  test('invalid no-effect proof requests fail before calling the host verifier', async () => {
    const initial = fixture();
    initial.nextWork.contracts.decisions.push(decision);
    store.compareAndSwapHostState(initial);
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started, 'no_effect'),
      before = store.readHostStateSnapshot(identity);
    let calls = 0;
    const verified = verifyingStore(database, (input, state) => {
      calls++;
      return reconciliationAuthorization(input, state);
    });
    const invalid = [
      { ...request, decision: null },
      { ...request, retryLease: started.attempt.lease },
      { ...request, providerEvidence: { ...request.providerEvidence, path: '../foreign.json' } },
      { ...request, outcome: 'unknown' },
      { ...request, result: 'not-no-effect' },
    ];
    for (const input of invalid) await expect(verified.reconcileWorkflowAttempt(input)).rejects.toThrow();
    await expect(
      verified.reconcileWorkflowAttempt({ ...request, decision: { ...decision, sha256: '9'.repeat(64) } }),
    ).rejects.toThrow(/reconciliation decision is not bound to work/);
    expect(calls).toBe(0);
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
  });

  test('competing reconciliation proofs commit once and a failed write leaves no authorization behind', async () => {
    store.compareAndSwapHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started),
      before = store.readHostStateSnapshot(identity);
    const verified = verifyingStore(database, reconciliationAuthorization);
    database.exec(
      "CREATE TRIGGER fail_resolution BEFORE UPDATE ON agent_host_state WHEN OLD.kind='work' BEGIN SELECT RAISE(ABORT, 'injected reconciliation failure'); END",
    );
    await expect(verified.reconcileWorkflowAttempt(request)).rejects.toThrow(/injected reconciliation failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
    database.exec('DROP TRIGGER fail_resolution');
    const otherDb = new Database(databasePath, { strict: true });
    handles.push(otherDb);
    const other = verifyingStore(otherDb, reconciliationAuthorization);
    const outcomes = await Promise.allSettled([
      verified.reconcileWorkflowAttempt(request),
      other.reconcileWorkflowAttempt(request),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected.reason.message).toMatch(/compare-and-swap/);
    expect(store.readHostStateSnapshot(identity).workVersion.revision).toBe(before.workVersion.revision + 1);
    expect(store.readHostStateSnapshot(identity).ledgerVersion).toEqual(before.ledgerVersion);
  });

  test.each(['completed', 'uncertain'])(
    'lost %s acknowledgment replays after reopen without another write',
    (status) => {
      store.compareAndSwapHostState(fixture());
      const receipt = store.claimWorkflowAttempt(attemptRequest());
      const finish = (target) =>
        status === 'completed'
          ? target.completeWorkflowAttempt(receipt, { answer: 'persisted' })
          : target.markWorkflowAttemptUncertain(receipt);
      const terminal = finish(store);
      const before = store.readHostStateSnapshot(identity);
      const reopened = new Database(databasePath, { strict: true });
      handles.push(reopened);
      const other = new HostStateStore(reopened, workspace);
      expect(finish(other)).toEqual(terminal);
      expect(other.readHostStateSnapshot(identity)).toEqual(before);
      expect(() => other.completeWorkflowAttempt(receipt, { answer: 'different' })).toThrow(/completion binding/);
      if (status === 'completed')
        expect(() => other.markWorkflowAttemptUncertain(receipt)).toThrow(/completion binding/);
      expect(() => other.completeWorkflowAttempt(terminal, { answer: 'persisted' })).toThrow(/original start receipt/);
      expect(other.readHostStateSnapshot(identity)).toEqual(before);
    },
  );

  test('host assignment adapter binds the persisted checkpoint, ledger, scope and permit before starting', () => {
    const initial = store.compareAndSwapHostState(fixture());
    const invocation = {
      stage: { id: 'implementation' },
      assignmentIndex: 0,
      workContext: {
        binding: initial.work.binding,
        permit: {
          checkpoint_revision: initial.workVersion.revision,
          checkpoint_digest: initial.workVersion.digest,
          stage_id: 'implementation',
          assignment_index: 0,
          dispatch_authorized: true,
          lease: { ...initial.work.lease, ledger_revision: initial.ledgerVersion.revision },
        },
      },
    };
    const changed = clone(invocation);
    changed.workContext.binding.scope_id = 'foreign-scope';
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/persisted state/);
    changed.workContext.binding = initial.work.binding;
    changed.workContext.permit.lease.ledger_revision++;
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/ledger revision/);
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    expect(store.claimWorkflowAssignment(invocation, '5'.repeat(64)).attempt.status).toBe('started');
    expect(() => store.claimWorkflowAssignment(invocation, '5'.repeat(64))).toThrow(/compare-and-swap/);
  });

  test('protected assignment denial writes neither an attempt nor an approval; successful claim reserves both atomically', async () => {
    let allowed = false;
    let verifierCalls = 0;
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => {
        verifierCalls++;
        if (!allowed) return null;
        return verifiedWorkflowApproval(request);
      },
    });
    const initial = store.compareAndSwapHostState(fixture());
    const invocation = protectedInvocation(initial);
    await expect(
      store.claimWorkflowAssignmentWithApproval(invocation, '5'.repeat(64), 'source.write', 'approvals'),
    ).rejects.toThrow(/approval denied/);
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    expect(governanceRows()).toHaveLength(0);
    allowed = true;
    const authorized = await store.claimWorkflowAssignmentWithApproval(
      invocation,
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    expect(authorized.receipt.attempt.status).toBe('started');
    expect(authorized.approval.status).toBe('reserved');
    expect(store.readHostStateSnapshot(identity).work.execution.assignment_attempts).toHaveLength(1);
    expect(governanceRows()).toHaveLength(1);
    const entered = store.beginWorkflowAttemptEffect(authorized);
    expect(entered.approval.status).toBe('commit_unknown');
    const completed = store.completeWorkflowAttemptWithApproval(entered, { accepted: true });
    expect(completed.receipt.attempt.status).toBe('completed');
    expect(completed.approval.status).toBe('applied');
    allowed = false;
    const replay = await store.claimWorkflowAssignmentWithApproval(
      invocation,
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    expect(replay.receipt.attempt).toEqual(completed.receipt.attempt);
    expect(replay.approval).toBeNull();
    expect(verifierCalls).toBe(2);
  });

  test('reserved protected attempt can be aborted after restart, but provider-entry uncertainty cannot', async () => {
    let approvalId = 'approval-recovery-1';
    const verifier = {
      principal: 'fixture:approver',
      verify: async (request) => verifiedWorkflowApproval(request, approvalId),
    };
    store = new HostStateStore(database, workspace, undefined, undefined, verifier);
    const initial = store.compareAndSwapHostState(fixture());
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(initial),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    const other = store.claimWorkflowAttempt(attemptRequest(store.readHostStateSnapshot(identity), 1));
    reopenStore();
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/work version changed/);
    expect(() => store.abortUnstartedWorkflowAttempt(reserved.receipt)).toThrow(/protected attempt/);
    const recovered = store.abortUnstartedWorkflowAttempt(reserved);
    expect(recovered.work.execution.assignment_attempts).toEqual([other.attempt]);
    expect(JSON.parse(governanceRows()[0].payload).status).toBe('aborted');
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/binding invalid/);
    approvalId = 'approval-recovery-2';
    store = new HostStateStore(database, workspace, undefined, undefined, verifier);
    const retry = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(recovered),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    const entered = store.beginWorkflowAttemptEffect(retry);
    expect(entered.approval.status).toBe('commit_unknown');
    expect(() => store.abortUnstartedWorkflowAttempt(entered)).toThrow(/reservation receipt invalid/);
    expect(store.readHostStateSnapshot(identity).work.execution.assignment_attempts.at(-1).status).toBe('started');
  });

  test('unprotected pre-provider attempt can be aborted without deleting another assignment', () => {
    const initial = store.compareAndSwapHostState(fixture());
    const first = store.claimWorkflowAttempt(attemptRequest(initial, 0));
    const second = store.claimWorkflowAttempt(attemptRequest(store.readHostStateSnapshot(identity), 1));
    const restored = store.abortUnstartedWorkflowAttempt(first);
    expect(restored.work.execution.assignment_attempts).toEqual([second.attempt]);
    expect(() => store.abortUnstartedWorkflowAttempt(first)).toThrow(/binding invalid/);
  });

  test('an approval that expires after reservation cannot enter the provider', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => {
        const receipt = verifiedWorkflowApproval(request);
        const unsigned = {
          ...receipt,
          expires_at: new Date(Date.now() + 800).toISOString(),
        };
        delete unsigned.evidence_digest;
        return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
      },
    });
    const initial = store.compareAndSwapHostState(fixture());
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(initial),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/expired before provider entry/);
    const restored = store.abortUnstartedWorkflowAttempt(reserved);
    expect(restored.work.execution.assignment_attempts).toEqual([]);
  });

  test('failed provider-entry marker leaves the protected attempt abortable', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => verifiedWorkflowApproval(request),
    });
    const initial = store.compareAndSwapHostState(fixture());
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(initial),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    database.exec(
      "CREATE TRIGGER fail_provider_entry BEFORE UPDATE ON agent_host_governance WHEN OLD.kind='approval' BEGIN SELECT RAISE(ABORT, 'injected provider-entry failure'); END",
    );
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/injected provider-entry failure/);
    expect(store.readHostStateSnapshot(identity).work.execution.assignment_attempts).toEqual([
      reserved.receipt.attempt,
    ]);
    expect(JSON.parse(governanceRows()[0].payload).status).toBe('reserved');
    database.exec('DROP TRIGGER fail_provider_entry');
    const restored = store.abortUnstartedWorkflowAttempt(reserved);
    expect(restored.work.execution.assignment_attempts).toEqual([]);
    expect(JSON.parse(governanceRows()[0].payload).status).toBe('aborted');
  });

  test('protected approval claim and completion roll back together when either SQLite write fails', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => verifiedWorkflowApproval(request),
    });
    const initial = store.compareAndSwapHostState(fixture());
    const invocation = protectedInvocation(initial);
    database.exec(
      "CREATE TRIGGER fail_protected_claim BEFORE UPDATE ON agent_host_state WHEN OLD.kind='work' BEGIN SELECT RAISE(ABORT, 'injected protected claim failure'); END",
    );
    await expect(
      store.claimWorkflowAssignmentWithApproval(invocation, '5'.repeat(64), 'source.write', 'approvals'),
    ).rejects.toThrow(/injected protected claim failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    expect(governanceRows()).toHaveLength(0);
    database.exec('DROP TRIGGER fail_protected_claim');
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      invocation,
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    const entered = store.beginWorkflowAttemptEffect(reserved);
    database.exec(
      "CREATE TRIGGER fail_protected_completion BEFORE UPDATE ON agent_host_governance WHEN OLD.kind='approval' BEGIN SELECT RAISE(ABORT, 'injected protected completion failure'); END",
    );
    expect(() => store.completeWorkflowAttemptWithApproval(entered, { accepted: true })).toThrow(
      /injected protected completion failure/,
    );
    expect(store.readHostStateSnapshot(identity).work.execution.assignment_attempts.at(-1).status).toBe('started');
    expect(JSON.parse(governanceRows()[0].payload).status).toBe('commit_unknown');
    database.exec('DROP TRIGGER fail_protected_completion');
    expect(store.completeWorkflowAttemptWithApproval(entered, { accepted: true }).receipt.attempt.status).toBe(
      'completed',
    );
  });

  test('foreign, stale and forged approval evidence cannot create a protected attempt', async () => {
    let alter = (receipt) => receipt;
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => alter(verifiedWorkflowApproval(request)),
    });
    const initial = store.compareAndSwapHostState(fixture());
    const invocation = protectedInvocation(initial);
    const resign = (receipt) => {
      const { evidence_digest: _digest, ...unsigned } = receipt;
      return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
    };
    for (const change of [
      (receipt) => resign({ ...receipt, project: 'foreign-project' }),
      (receipt) => resign({ ...receipt, operation_hash: '0'.repeat(64) }),
      (receipt) => resign({ ...receipt, expires_at: new Date(Date.now() - 1000).toISOString() }),
      (receipt) => ({ ...receipt, evidence_digest: '0'.repeat(64) }),
    ]) {
      alter = change;
      await expect(
        store.claimWorkflowAssignmentWithApproval(invocation, '5'.repeat(64), 'source.write', 'approvals'),
      ).rejects.toThrow(/approval receipt binding invalid/);
      expect(store.readHostStateSnapshot(identity)).toEqual(initial);
      expect(governanceRows()).toHaveLength(0);
    }
  });

  test('host assignment adapter replays a completed result after a lease revocation without another write', () => {
    const initial = store.compareAndSwapHostState(fixture());
    const invocation = {
      stage: { id: 'implementation' },
      assignmentIndex: 0,
      workContext: {
        binding: initial.work.binding,
        permit: {
          checkpoint_revision: initial.workVersion.revision,
          checkpoint_digest: initial.workVersion.digest,
          stage_id: 'implementation',
          assignment_index: 0,
          dispatch_authorized: true,
          lease: { ...initial.work.lease, ledger_revision: initial.ledgerVersion.revision },
        },
      },
    };
    const started = store.claimWorkflowAssignment(invocation, '5'.repeat(64));
    const completed = store.completeWorkflowAttempt(started, { answer: 'persisted' });
    const revoke = next();
    revoke.nextWork.lease = null;
    const ticket = revoke.nextLedger.tickets[0];
    ticket.generation++;
    revokeTicket(revoke.nextLedger, ticket);
    store.compareAndSwapHostState(revoke);
    const beforeReplay = store.readHostStateSnapshot(identity);
    const replay = store.claimWorkflowAssignment(invocation, '5'.repeat(64));
    expect(replay.attempt).toEqual(completed.attempt);
    expect(replay.workVersion).toEqual(beforeReplay.workVersion);
    expect(store.readHostStateSnapshot(identity)).toEqual(beforeReplay);
    const changed = clone(invocation);
    changed.workContext.permit.lease.generation++;
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/completed replay lease binding/);
    changed.workContext.permit = { ...invocation.workContext.permit, dispatch_authorized: false };
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/assignment permit binding/);
    expect(() => store.claimWorkflowAssignment(invocation, '6'.repeat(64))).toThrow(/request changed/);
    expect(store.readHostStateSnapshot(identity)).toEqual(beforeReplay);
  });

  test('attempt write failure preserves the pair and can be retried before any external effect', () => {
    const initial = store.compareAndSwapHostState(fixture());
    database.exec(
      "CREATE TRIGGER fail_attempt BEFORE UPDATE ON agent_host_state WHEN OLD.kind='work' BEGIN SELECT RAISE(ABORT, 'injected attempt failure'); END",
    );
    expect(() => store.claimWorkflowAttempt(attemptRequest(initial))).toThrow(/injected attempt failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    database.exec('DROP TRIGGER fail_attempt');
    expect(store.claimWorkflowAttempt(attemptRequest(initial)).attempt.status).toBe('started');
  });
  test('attempt start and completion write only work; completed replay survives reopening without another write', () => {
    const initial = store.compareAndSwapHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest(initial));
    expect(started.attempt.status).toBe('started');
    expect(store.readHostStateSnapshot(identity).ledgerVersion).toEqual(initial.ledgerVersion);
    const completed = store.completeWorkflowAttempt(started, { answer: 'persisted' });
    expect(completed.attempt.status).toBe('completed');
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    const other = new HostStateStore(reopened, workspace);
    const replay = other.claimWorkflowAttempt(attemptRequest(other.readHostStateSnapshot(identity)));
    expect(replay).toEqual(completed);
    expect(other.readHostStateSnapshot(identity).ledgerVersion).toEqual(initial.ledgerVersion);
  });

  test('started and uncertain outcomes cannot redispatch; independent assignments keep their own receipts', () => {
    store.compareAndSwapHostState(fixture());
    const first = store.claimWorkflowAttempt(attemptRequest());
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/reconciliation/);
    const second = store.claimWorkflowAttempt(attemptRequest(undefined, 1));
    store.completeWorkflowAttempt(second, null);
    store.markWorkflowAttemptUncertain(first);
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/reconciliation/);
    expect(() => store.completeWorkflowAttempt(first, {})).toThrow(/completion binding/);
    expect(store.readHostStateSnapshot(identity).work.execution.assignment_attempts.map((x) => x.status)).toEqual([
      'uncertain',
      'completed',
    ]);
  });

  test('attempt admission rejects stale CAS, wrong lease, changed replay input and unversioned v1 state', () => {
    const input = fixture();
    delete input.nextWork.execution.assignment_attempts;
    expect(() => store.compareAndSwapHostState(input)).toThrow(/current WorkState/);
    const initial = store.compareAndSwapHostState(fixture());
    const stale = attemptRequest(initial);
    expect(() => store.claimWorkflowAttempt({ ...stale, lease: { ...stale.lease, generation: 2 } })).toThrow(
      /lease binding/,
    );
    const receipt = store.claimWorkflowAttempt(stale);
    expect(() => store.claimWorkflowAttempt(stale)).toThrow(/compare-and-swap/);
    store.completeWorkflowAttempt(receipt, {});
    expect(() => store.claimWorkflowAttempt({ ...attemptRequest(), requestDigest: '6'.repeat(64) })).toThrow(
      /request changed/,
    );
  });

  test('completion records the started result after lease expiry or explicit revocation without new dispatch authority', () => {
    store.compareAndSwapHostState(fixture());
    const first = store.claimWorkflowAttempt(attemptRequest());
    const second = store.claimWorkflowAttempt(attemptRequest(undefined, 1));
    const now = Date.now;
    try {
      Date.now = () => now() + 7200000;
      expect(() => store.claimWorkflowAttempt(attemptRequest(undefined, 2))).toThrow(/expired/);
      const completed = store.completeWorkflowAttempt(first, 'observed');
      expect(completed.attempt.status).toBe('completed');
      const expiredSnapshot = store.readHostStateSnapshot(identity);
      expect(store.claimWorkflowAttempt(attemptRequest(expiredSnapshot))).toEqual(completed);
      expect(store.readHostStateSnapshot(identity)).toEqual(expiredSnapshot);
    } finally {
      Date.now = now;
    }
    const revoke = next();
    revoke.nextWork.lease = null;
    const ticket = revoke.nextLedger.tickets[0];
    ticket.generation++;
    revokeTicket(revoke.nextLedger, ticket);
    store.compareAndSwapHostState(revoke);
    const revokedCompletion = store.completeWorkflowAttempt(second, 'finished');
    expect(revokedCompletion.attempt.status).toBe('completed');
    const revokedSnapshot = store.readHostStateSnapshot(identity);
    const replay = { ...attemptRequest(revokedSnapshot, 1), lease: second.attempt.lease };
    expect(store.claimWorkflowAttempt(replay)).toEqual(revokedCompletion);
    expect(() => store.claimWorkflowAttempt({ ...replay, lease: { ...replay.lease, generation: 99 } })).toThrow(
      /completed replay lease binding/,
    );
    expect(() => store.claimWorkflowAttempt({ ...replay, requestDigest: '6'.repeat(64) })).toThrow(/request changed/);
    expect(store.readHostStateSnapshot(identity)).toEqual(revokedSnapshot);
    expect(() =>
      store.claimWorkflowAttempt({
        ...attemptRequest(store.readHostStateSnapshot(identity), 2),
        lease: first.attempt.lease,
      }),
    ).toThrow(/active leased/);
  });

  test('imported migration run requires a trusted typed rebind before ordinary activation', async () => {
    const seed = fixture();
    const sourceSha256 = 'a'.repeat(64);
    const migration = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: sourceSha256,
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
      migration_id: workMigrationId({
        source_schema: 'WorkCheckpoint/v2',
        source_sha256: sourceSha256,
        source_work_id: 'work',
        source_revision: 'source',
        original_run_id: null,
      }),
      rebind_status: 'pending',
      rebind_receipt: null,
    };
    seed.nextWork.migration = migration;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    seed.nextWork.lease = null;
    const imported = store.compareAndSwapHostState(seed);
    const request = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256,
      migrationId: migration.migration_id,
      decisionPointer: 'WORK.md#typed-migration-decision',
    };
    const promote = next(imported);
    promote.nextWork.execution.status = 'active';
    promote.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
    expect(() => store.compareAndSwapHostState(promote)).toThrow(/current WorkState\/v1/);
    expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    await expect(store.rebindMigratedWork(request)).rejects.toThrow(/trusted migration rebind verifier required/);
    const principal = 'trusted:migration-host';
    const receipt = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: migration.migration_id,
        source_sha256: sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: sourceSha256,
      migration_id: migration.migration_id,
    };
    const verified = new HostStateStore(database, workspace, undefined, { principal, verify: () => receipt });
    for (const changed of [
      { ...request, sourceSha256: 'b'.repeat(64) },
      { ...request, migrationId: 'b'.repeat(64) },
    ]) {
      await expect(verified.rebindMigratedWork(changed)).rejects.toThrow(/source binding/);
      expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    }
    const accepted = await verified.rebindMigratedWork(request);
    expect(accepted.work.execution.run_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(accepted.work.migration).toEqual({
      ...migration,
      continuation_run_id: accepted.work.execution.run_id,
      rebind_status: 'accepted',
      rebind_receipt: {
        ...receipt,
        issued_run_id: accepted.work.execution.run_id,
        source_work_digest: imported.workVersion.digest,
      },
    });
    expect(accepted.work.execution.status).toBe('suspended');
    expect(accepted.work.execution.assignment_attempts).toEqual([]);
    const changedRun = next(accepted);
    changedRun.nextWork.execution.run_id = 'caller-chosen-run';
    expect(() => store.compareAndSwapHostState(changedRun)).toThrow();
    expect(store.readHostStateSnapshot(identity)).toEqual(accepted);
    const forged = next(accepted);
    forged.nextWork.migration.rebind_receipt.decision_pointer = 'WORK.md#forged';
    forged.nextWork.migration.rebind_receipt.rebind_id = canonicalJsonDigest({
      identity,
      migration_id: migration.migration_id,
      source_sha256: sourceSha256,
      principal,
      decision_pointer: 'WORK.md#forged',
    });
    expect(() => store.compareAndSwapHostState(forged)).toThrow(/migration lineage requires a dedicated rebind/);
    expect(store.readHostStateSnapshot(identity)).toEqual(accepted);
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    const replayStore = new HostStateStore(reopened, workspace, undefined, {
      principal,
      verify: () => {
        throw new Error('exact replay must not reverify');
      },
    });
    expect(await replayStore.rebindMigratedWork(request)).toEqual(accepted);
    await expect(
      replayStore.rebindMigratedWork({
        ...request,
        expectedWork: { ...request.expectedWork, digest: '0'.repeat(64) },
      }),
    ).rejects.toThrow(/replay binding/);
    await expect(
      replayStore.rebindMigratedWork({
        ...request,
        expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 },
      }),
    ).rejects.toThrow(/replay binding/);
    await expect(
      replayStore.rebindMigratedWork({
        ...request,
        expectedLedger: { ...request.expectedLedger, digest: '0'.repeat(64) },
      }),
    ).rejects.toThrow(/replay binding/);
    await expect(replayStore.rebindMigratedWork({ ...request, decisionPointer: 'WORK.md#changed' })).rejects.toThrow(
      /replay binding/,
    );
    const active = next(accepted);
    active.nextWork.execution.status = 'active';
    active.nextWork.lease = promote.nextWork.lease;
    store.compareAndSwapHostState(active);
    expect(store.claimWorkflowAttempt(attemptRequest()).attempt.status).toBe('started');
  });

  test('host keeps every reset source kind suspended until its typed migration rebind', () => {
    for (const [changeKind, digestCharacter] of [
      ['feature', 'a'],
      ['fix', 'b'],
      ['refactor', 'c'],
      ['documentation', 'd'],
    ]) {
      const handle = openHostStateDatabase(path.join(root, `reset-${changeKind}.db`));
      handles.push(handle);
      const localStore = new HostStateStore(handle, workspace);
      const seed = fixture();
      const sourceSha256 = digestCharacter.repeat(64);
      seed.nextWork.lifecycle.phase = 'PLAN';
      seed.nextWork.lifecycle.change_kind = changeKind;
      seed.nextWork.lifecycle.references = [
        ['source_plan', 'SourcePlan/v1'],
        ['acceptance_manifest', 'AcceptanceManifest/v1'],
        ['implementation_scope', 'ImplementationScope/v1'],
      ].map(([kind, artifactSchema]) => ({
        schema: 'LifecycleArtifactReference/v1',
        kind,
        artifact_schema: artifactSchema,
        record_id: `${kind}-${changeKind}`,
        path: `.agent/${kind}-${changeKind}.json`,
        sha256: '1'.repeat(64),
        source_revision: seed.nextWork.binding.work_source_revision,
        scope_id: seed.nextWork.binding.scope_id,
        ac_ids: [...seed.nextWork.binding.ac_ids],
        generation: null,
        implementation_fingerprint: null,
        delivery_cycle_id: null,
        principal: null,
        decision: null,
        disposition: 'current',
      }));
      seed.nextWork.migration = {
        schema: 'WorkMigrationLineage/v1',
        source_schema: 'WorkCheckpoint/v2',
        source_sha256: sourceSha256,
        source_work_id: seed.nextWork.binding.lifecycle_work_id,
        source_revision: seed.nextWork.binding.work_source_revision,
        original_run_id: null,
        continuation_run_id: null,
        migration_id: workMigrationId({
          source_schema: 'WorkCheckpoint/v2',
          source_sha256: sourceSha256,
          source_work_id: seed.nextWork.binding.lifecycle_work_id,
          source_revision: seed.nextWork.binding.work_source_revision,
          original_run_id: null,
        }),
        rebind_status: 'pending',
        rebind_receipt: null,
      };
      quiesceImportedState([seed.nextWork], seed.nextLedger);
      seed.nextWork.execution.run_id = null;
      seed.nextWork.execution.assignment_attempts = [];
      const imported = localStore.compareAndSwapHostState(seed);
      expect(imported.work.lifecycle).toEqual(expect.objectContaining({ phase: 'PLAN', change_kind: changeKind }));
      expect(imported.work.execution).toEqual(
        expect.objectContaining({ status: 'suspended', run_id: null, assignment_attempts: [] }),
      );
      const forbidden = clone(imported);
      forbidden.work.revision++;
      forbidden.work.lifecycle.revision++;
      forbidden.ledger.revision++;
      forbidden.work.execution.status = 'active';
      forbidden.work.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
      expect(() =>
        localStore.compareAndSwapHostState({
          expectedWork: imported.workVersion,
          expectedLedger: imported.ledgerVersion,
          nextWork: forbidden.work,
          nextLedger: forbidden.ledger,
        }),
      ).toThrow(/current WorkState\/v1/);
    }
  });

  test('migration identity binds a known original run and rejects an omitted-run digest', () => {
    const lineage = {
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    expect(workMigrationId({ ...lineage, original_run_id: 'original-run' })).not.toBe(workMigrationId(lineage));
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    seed.nextWork.migration = {
      schema: 'WorkMigrationLineage/v1',
      ...lineage,
      original_run_id: 'original-run',
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    };
    expect(() => store.compareAndSwapHostState(seed)).toThrow(/migration lineage identity invalid/);
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
  });

  test('accepts only a suspended ticket-sourced migration with no fabricated run, lease, or attempt', () => {
    const seed = fixture();
    const sourceSha256 = 'b'.repeat(64);
    const lineage = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'CoordinationTicket/v1',
      source_sha256: sourceSha256,
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
      migration_id: workMigrationId({
        source_schema: 'CoordinationTicket/v1',
        source_sha256: sourceSha256,
        source_work_id: 'work',
        source_revision: 'source',
        original_run_id: null,
      }),
      rebind_status: 'pending',
      rebind_receipt: null,
      source_ticket: {
        pointer: '/tickets/114',
        ticket_id: 'ticket-work',
        thread_id: 'thread',
        generation: 1,
        contour_keys: ['br:BR-GENERIC', 'sr:SR-GENERIC', 'ac:AC-GENERIC'],
        exclusive_resources: ['file:agent-runtime-new/src/host-state.ts'],
      },
    };
    seed.nextWork.migration = lineage;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    seed.nextWork.execution.assignment_attempts = [];
    seed.nextWork.lease = null;
    expect(store.compareAndSwapHostState(seed).work?.migration).toEqual(lineage);
    const invalid = fixture();
    invalid.nextWork.migration = lineage;
    invalid.nextWork.execution.status = 'active';
    invalid.nextWork.execution.run_id = 'invented-run';
    invalid.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
    expect(() => store.compareAndSwapHostState(invalid)).toThrow(/current WorkState\/v1/);
  });

  test('migration rebind rejects a work and ledger change during trusted authorization', async () => {
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    const lineage = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    seed.nextWork.migration = {
      ...lineage,
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    };
    const imported = store.compareAndSwapHostState(seed);
    const request = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256: lineage.source_sha256,
      migrationId: seed.nextWork.migration.migration_id,
      decisionPointer: 'WORK.md#typed-migration-decision',
    };
    const principal = 'trusted:migration-host';
    const authorization = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: request.migrationId,
        source_sha256: request.sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: request.sourceSha256,
      migration_id: request.migrationId,
    };
    let competing;
    const verified = new HostStateStore(database, workspace, undefined, {
      principal,
      verify: () => {
        competing = store.compareAndSwapHostState(next(imported));
        return authorization;
      },
    });
    await expect(verified.rebindMigratedWork(request)).rejects.toThrow(/compare-and-swap|stale/);
    expect(store.readHostStateSnapshot(identity)).toEqual(competing);
    expect(competing.work.migration.rebind_status).toBe('pending');
  });

  test('migration rebind and rollback-gate close are one SQLite transaction', async () => {
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    const lineage = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    seed.nextWork.migration = {
      ...lineage,
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    };
    const imported = store.compareAndSwapHostState(seed);
    const gate = store.openReconciliationGate(reconciliationBinding(imported));
    const request = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256: lineage.source_sha256,
      migrationId: seed.nextWork.migration.migration_id,
      decisionPointer: 'WORK.md#typed-migration-decision',
    };
    const principal = 'trusted:migration-host';
    const expectedReceipt = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: request.migrationId,
        source_sha256: request.sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: request.sourceSha256,
      migration_id: request.migrationId,
    };
    for (const forged of [
      null,
      { ...expectedReceipt, principal: 'forged' },
      { ...expectedReceipt, decision_pointer: 'WORK.md#forged' },
      { ...expectedReceipt, source_sha256: 'b'.repeat(64) },
      { ...expectedReceipt, migration_id: 'b'.repeat(64) },
      { ...expectedReceipt, identity: { ...identity, project_ids: ['another-project'] } },
      { ...expectedReceipt, rebind_id: 'b'.repeat(64) },
      { ...expectedReceipt, issued_run_id: 'caller-chosen-run' },
      { ...expectedReceipt, source_work_digest: '0'.repeat(64) },
    ]) {
      const denied = new HostStateStore(database, workspace, undefined, { principal, verify: () => forged });
      await expect(denied.rebindMigratedWork(request)).rejects.toThrow(/authorization differs/);
      expect(store.readHostStateSnapshot(identity)).toEqual(imported);
      expect(store.readReconciliationGate()).toEqual(gate);
    }
    let verifyCalls = 0;
    const verified = new HostStateStore(database, workspace, undefined, {
      principal,
      verify: () => {
        verifyCalls++;
        return expectedReceipt;
      },
    });
    for (const stale of [
      { ...request, expectedWork: { ...request.expectedWork, digest: '0'.repeat(64) } },
      { ...request, expectedLedger: { ...request.expectedLedger, digest: '0'.repeat(64) } },
    ]) {
      await expect(verified.rebindMigratedWork(stale)).rejects.toThrow();
      expect(verifyCalls).toBe(0);
      expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    }
    database.exec(
      "CREATE TRIGGER deny_migration_gate_close BEFORE UPDATE ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected migration gate failure'); END",
    );
    await expect(verified.rebindMigratedWork(request)).rejects.toThrow(/injected migration gate failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    expect(store.readReconciliationGate()).toEqual(gate);
    database.exec('DROP TRIGGER deny_migration_gate_close');
    const accepted = await verified.rebindMigratedWork(request);
    expect(accepted.work.migration.rebind_status).toBe('accepted');
    expect(store.readReconciliationGate().closed_work_version).toEqual(accepted.workVersion);
  });

  test('concurrent migration rebind authorizations commit exactly once', async () => {
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    const lineage = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    seed.nextWork.migration = {
      ...lineage,
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    };
    const imported = store.compareAndSwapHostState(seed);
    store.openReconciliationGate(reconciliationBinding(imported));
    const request = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256: lineage.source_sha256,
      migrationId: seed.nextWork.migration.migration_id,
      decisionPointer: 'WORK.md#concurrent-rebind',
    };
    const principal = 'trusted:migration-host';
    const receipt = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: request.migrationId,
        source_sha256: request.sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: request.sourceSha256,
      migration_id: request.migrationId,
    };
    const secondDatabase = new Database(databasePath, { strict: true });
    handles.push(secondDatabase);
    let entered = 0;
    let release;
    const bothAuthorized = new Promise((resolve) => {
      release = resolve;
    });
    const verify = async () => {
      entered++;
      if (entered === 2) release();
      await bothAuthorized;
      return receipt;
    };
    const left = new HostStateStore(database, workspace, undefined, { principal, verify });
    const right = new HostStateStore(secondDatabase, workspace, undefined, { principal, verify });
    const results = await Promise.allSettled([left.rebindMigratedWork(request), right.rebindMigratedWork(request)]);
    expect(entered).toBe(2);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const accepted = store.readHostStateSnapshot(identity);
    expect(accepted.workVersion.revision).toBe(imported.workVersion.revision + 1);
    expect(accepted.work.migration.rebind_receipt).toEqual({
      ...receipt,
      issued_run_id: accepted.work.execution.run_id,
      source_work_digest: imported.workVersion.digest,
    });
    expect(store.readReconciliationGate().closed_work_version).toEqual(accepted.workVersion);
    const replay = new HostStateStore(database, workspace, undefined, {
      principal,
      verify: () => {
        throw new Error('replay must not authorize again');
      },
    });
    expect(await replay.rebindMigratedWork(request)).toEqual(accepted);
  });

  test('generic paired CAS cannot rewrite attempts; malformed results or forged receipts cannot complete them', () => {
    store.compareAndSwapHostState(fixture());
    const receipt = store.claimWorkflowAttempt(attemptRequest());
    const before = store.readHostStateSnapshot(identity);
    const edit = next(before);
    edit.nextWork.execution.assignment_attempts = [];
    expect(() => store.compareAndSwapHostState(edit)).toThrow(/dedicated transaction/);
    expect(() => store.completeWorkflowAttempt(receipt, undefined)).toThrow();
    expect(() =>
      store.completeWorkflowAttempt(
        { ...receipt, attempt: { ...receipt.attempt, request_digest: '9'.repeat(64) } },
        {},
      ),
    ).toThrow(/completion binding/);
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
  });
  test('exclusive creation, immutable snapshot and close/reopen preserve authority and artifact references', () => {
    expect(store.readHostStateSnapshot(identity)).toEqual({
      work: null,
      ledger: null,
      workVersion: null,
      ledgerVersion: null,
      maintenanceGeneration: 0,
    });
    const input = fixture();
    input.nextWork.artifacts.push(artifact());
    const saved = store.compareAndSwapHostState(input);
    expect(Object.isFrozen(saved.work.binding)).toBe(true);
    expect(saved.work.binding.provider_work_item_id).not.toBe(saved.work.binding.lifecycle_work_id);
    expect(() => store.compareAndSwapHostState(input)).toThrow(/compare-and-swap/);
    database.close();
    handles.pop();
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    expect(new HostStateStore(reopened, workspace).readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('commits work and ledger together and rejects competing stale CAS through another handle', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const otherDb = new Database(databasePath, { strict: true });
    handles.push(otherDb);
    const other = new HostStateStore(otherDb, workspace);
    const competing = next(other.readHostStateSnapshot(identity));
    const updated = store.compareAndSwapHostState(next(saved));
    expect(updated.workVersion.revision).toBe(2);
    expect(updated.ledgerVersion.revision).toBe(2);
    expect(() => other.compareAndSwapHostState(competing)).toThrow(/compare-and-swap/);
    expect(other.readHostStateSnapshot(identity)).toEqual(updated);
  });

  test('decision references survive progress and reject removal or replacement atomically', () => {
    const created = store.compareAndSwapHostState(fixture());
    const append = next(created);
    const decision = { schema: 'DecisionRecord/v1', path: '.agent/decision.json', sha256: '3'.repeat(64) };
    append.nextWork.contracts.decisions.push(decision);
    const saved = store.compareAndSwapHostState(append);
    const progressed = store.compareAndSwapHostState(next(saved));
    expect(progressed.work.contracts.decisions).toEqual([decision]);
    for (const decisions of [[], [{ ...decision, sha256: '4'.repeat(64) }]]) {
      const invalid = next(progressed);
      invalid.nextWork.contracts.decisions = decisions;
      expect(() => store.compareAndSwapHostState(invalid)).toThrow(/decision references/);
      expect(store.readHostStateSnapshot(identity)).toEqual(progressed);
    }
  });

  test('a new work cannot bypass a stale shared-ledger digest', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const input = fixture('other', 'file:src/other.ts');
    input.expectedLedger = { ...saved.ledgerVersion, digest: '9'.repeat(64) };
    input.nextLedger.revision = 2;
    includeExistingLedger(input, saved.ledger);
    expect(() => store.compareAndSwapHostState(input)).toThrow(/compare-and-swap/);
    expect(store.readHostStateSnapshot({ ...identity, work_id: 'other' }).work).toBeNull();
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('the work row identity includes repository and project set, while resource ownership remains workspace-wide', () => {
    const first = store.compareAndSwapHostState(fixture());
    const other = fixture('work', 'file:src/other-project.ts');
    other.nextWork.binding.project_ids = ['another-project'];
    other.nextWork.lease.ticket_id = 'other-project-ticket';
    Object.assign(other.nextLedger.tickets[0], { project_ids: ['another-project'], ticket_id: 'other-project-ticket' });
    Object.assign(other.nextLedger.claims[0], {
      claim_id: 'other-project-claim',
      ticket_id: 'other-project-ticket',
    });
    other.nextLedger.tickets[0].claim_ids = ['other-project-claim'];
    other.expectedLedger = first.ledgerVersion;
    other.nextLedger.revision = 2;
    includeExistingLedger(other, first.ledger);
    const saved = store.compareAndSwapHostState(other);
    expect(saved.work.binding.lifecycle_work_id).toBe(first.work.binding.lifecycle_work_id);
    expect(store.readHostStateSnapshot(identity).work).toEqual(first.work);
    expect(store.readHostStateSnapshot({ ...identity, project_ids: ['another-project'] }).work).toEqual(saved.work);
  });

  test('SQLite failure on second row rolls back first row and allows a later lawful commit', () => {
    const saved = store.compareAndSwapHostState(fixture());
    database.exec(
      "CREATE TRIGGER fail_ledger BEFORE UPDATE ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT, 'injected second row failure'); END",
    );
    expect(() => store.compareAndSwapHostState(next(saved))).toThrow(/injected second row failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    database.exec('DROP TRIGGER fail_ledger');
    expect(store.compareAndSwapHostState(next(saved)).work.revision).toBe(2);
  });

  test('first-create failure on ledger insert leaves no work row', () => {
    database.exec(
      "CREATE TRIGGER fail_create BEFORE INSERT ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT, 'injected create failure'); END",
    );
    expect(() => store.compareAndSwapHostState(fixture())).toThrow(/injected create failure/);
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
  });

  test.each([
    [
      'old checkpoint',
      (input) => {
        input.nextWork.schema = 'WorkCheckpoint/v2';
      },
    ],
    [
      'old ledger',
      (input) => {
        input.nextLedger.schema = 'CoordinationLedger/v2';
      },
    ],
    [
      'unknown field',
      (input) => {
        input.nextWork.legacy = true;
      },
    ],
    [
      'foreign workspace',
      (input) => {
        input.nextWork.workspace_id = '3'.repeat(64);
      },
    ],
    [
      'unsafe implementation path',
      (input) => {
        input.nextWork.binding.implementation_paths = ['.git/config'];
      },
    ],
    [
      'unsafe artifact path',
      (input) => {
        input.nextWork.contracts.scope.path = '../scope.json';
      },
    ],
    [
      'wrong contract digest',
      (input) => {
        input.nextWork.contracts.scope.sha256 = '4'.repeat(64);
      },
    ],
    [
      'legacy artifact reference',
      (input) => {
        const ref = artifact();
        ref.schema = 'ResearchResult/v2';
        input.nextWork.artifacts = [ref];
      },
    ],
    [
      'foreign artifact scope',
      (input) => {
        const ref = artifact();
        ref.scope_id = 'other';
        input.nextWork.artifacts = [ref];
      },
    ],
    [
      'duplicate artifact identity',
      (input) => {
        input.nextWork.artifacts = [artifact(), { ...artifact(), path: '.agent/other.json' }];
      },
    ],
    [
      'inactive resource ownership',
      (input) => {
        input.nextLedger.tickets[0].status = 'queued';
      },
    ],
    [
      'expired lease',
      (input) => {
        input.nextLedger.tickets[0].expires_at = '2020-01-01T00:00:00Z';
      },
    ],
    [
      'invalid lease date',
      (input) => {
        input.nextLedger.tickets[0].expires_at = 'not-a-date';
      },
    ],
    [
      'foreign lease reference',
      (input) => {
        input.nextWork.lease.ticket_id = 'other';
      },
    ],
    [
      'unscoped lease resource',
      (input) => {
        input.nextLedger.tickets[0].active_resources = ['file:other.ts'];
      },
    ],
    [
      'incomplete leased scope',
      (input) => {
        input.nextLedger.tickets[0].active_resources = [];
      },
    ],
    [
      'blocked leased scope',
      (input) => {
        input.nextWork.binding.allowed_resources.push('component:pending');
        input.nextLedger.tickets[0].blocked_resources = ['component:pending'];
      },
    ],
    [
      'aliased resource paths',
      (input) => {
        input.nextWork.binding.allowed_resources.push('file:SRC/task.ts');
      },
    ],
    [
      'resource duplicate',
      (input) => {
        input.nextLedger.tickets[0].blocked_resources = ['file:src/task.ts'];
      },
    ],
    [
      'generation other than one on create',
      (input) => {
        input.nextLedger.tickets[0].generation = 2;
        input.nextWork.lease.generation = 2;
      },
    ],
    [
      'revision jump',
      (input) => {
        input.nextWork.revision = 3;
      },
    ],
  ])('rejects %s without creating either row', (_name, mutate) => {
    const input = fixture();
    mutate(input);
    expect(() => store.compareAndSwapHostState(input)).toThrow();
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
    expect(store.readHostStateSnapshot(identity).ledger).toBeNull();
  });

  test('rejects unsafe contour keys and schema-valid payloads above the host aggregate limit', () => {
    const unsafe = fixture();
    unsafe.nextLedger.tickets[0].contour_keys.push('file:../escape.ts');
    expect(() => store.compareAndSwapHostState(unsafe)).toThrow(/resource file path is unsafe/);
    const oversized = fixture();
    oversized.nextLedger.claims = Array.from({ length: 4096 }, (_, index) => ({
      ...clone(oversized.nextLedger.claims[0]),
      claim_id: 'claim-oversized-' + index,
    }));
    expect(() => store.compareAndSwapHostState(oversized)).toThrow(/node budget|aggregate record limit/);
  });

  test.each([
    [
      'source',
      (data) => {
        data.nextWork.binding.work_source_revision = 'changed';
      },
    ],
    [
      'configuration',
      (data) => {
        data.nextWork.binding.config_digest = '5'.repeat(64);
      },
    ],
    [
      'run identity',
      (data) => {
        data.nextWork.execution.run_id = 'different';
      },
    ],
    [
      'input identity',
      (data) => {
        data.nextWork.execution.input_digest = '5'.repeat(64);
      },
    ],
    [
      'reference address',
      (data) => {
        data.nextWork.contracts.scope.path = '.agent/moved.json';
      },
    ],
    [
      'artifact removal',
      (data) => {
        data.nextWork.artifacts = [];
      },
    ],
    [
      'artifact replacement',
      (data) => {
        data.nextWork.artifacts[0].sha256 = '5'.repeat(64);
      },
    ],
    [
      'unfenced owner change',
      (data) => {
        data.nextLedger.tickets[0].thread_id = 'other';
        data.nextWork.lease.thread_id = 'other';
      },
    ],
    [
      'ticket deletion',
      (data) => {
        data.nextWork.lease = null;
        data.nextLedger.tickets = [];
      },
    ],
    [
      'expiry regression',
      (data) => {
        data.nextLedger.tickets[0].expires_at = new Date(Date.now() + 1000).toISOString();
      },
    ],
    [
      'wrong expected digest',
      (data) => {
        data.expectedWork.digest = '5'.repeat(64);
      },
    ],
  ])('rejects %s on update and preserves both rows', (_name, mutate) => {
    const input = fixture();
    input.nextWork.artifacts.push(artifact());
    const saved = store.compareAndSwapHostState(input);
    const data = next(saved);
    mutate(data);
    expect(() => store.compareAndSwapHostState(data)).toThrow();
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('allows append-only artifacts, phase progress, lease renewal and explicit fenced revocation', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const input = next(saved);
    input.nextWork.artifacts.push(artifact());
    input.nextWork.execution.phase = 'validation';
    setActiveLease(input.nextLedger, new Date(Date.now() + 7200_000).toISOString());
    const progressed = store.compareAndSwapHostState(input);
    const revoke = next(progressed);
    revoke.nextWork.lease = null;
    revoke.nextLedger.tickets[0].generation = 2;
    revokeTicket(revoke.nextLedger);
    const revoked = store.compareAndSwapHostState(revoke);
    expect(revoked.ledger.tickets[0].generation).toBe(2);
    expect(revoked.work.artifacts).toEqual([artifact()]);
  });

  test('rejects a later active claim behind an earlier blocked FIFO request', () => {
    const earlier = fixture();
    earlier.nextWork.lease = null;
    Object.assign(earlier.nextLedger.tickets[0], {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    earlier.nextLedger.claims[0].status = 'recovered';
    const saved = store.compareAndSwapHostState(earlier);
    const later = fixture('other');
    later.expectedLedger = saved.ledgerVersion;
    later.nextLedger.revision = saved.ledger.revision + 1;
    includeExistingLedger(later, saved.ledger);
    expect(() => store.compareAndSwapHostState(later)).toThrow(/FIFO/);
  });

  test('rejects shortening a current active claim lease', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const input = next(saved);
    setActiveLease(input.nextLedger, new Date(Date.parse(saved.ledger.tickets[0].expires_at) - 1000).toISOString());
    expect(() => store.compareAndSwapHostState(input)).toThrow(/expiry cannot regress/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('rejects incomplete operation history and unsupported generation jumps', () => {
    const invalidOperation = fixture();
    invalidOperation.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-incomplete',
      kind: 'release',
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      created_at: new Date().toISOString(),
    });
    expect(() => store.compareAndSwapHostState(invalidOperation)).toThrow(/current CoordinationLedger/);
    const missingNotice = fixture();
    missingNotice.nextLedger.dispositions.push({
      schema: 'ConflictDisposition/v1',
      disposition_id: 'disposition-orphan',
      subject_kind: 'notice',
      subject_id: 'notice-missing',
      kind: 'serialize',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/coordination.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(missingNotice)).toThrow(/disposition subject is missing/);
    const invalidContour = fixture();
    invalidContour.nextLedger.contours.push({
      schema: 'ReleaseContour/v1',
      contour_id: 'contour-invalid',
      generation: 1,
      work_ids: [identity.work_id],
      ticket_ids: [invalidContour.nextLedger.tickets[0].ticket_id],
      frozen: true,
      created_at: '2026-09-18T00:00:00.000Z',
      contour_digest: 'f'.repeat(64),
    });
    expect(() => store.compareAndSwapHostState(invalidContour)).toThrow(/contour digest binding/);
    const initialHistory = fixture();
    initialHistory.nextLedger.contours.push(frozenContour(initialHistory.nextLedger));
    expect(() => store.compareAndSwapHostState(initialHistory)).toThrow(/initial ledger/);
    const saved = store.compareAndSwapHostState(fixture());
    const generationJump = next(saved);
    generationJump.nextLedger.open_generation += 2;
    expect(() => store.compareAndSwapHostState(generationJump)).toThrow(/generation transition/);

    const progressed = store.compareAndSwapHostState(next(saved));
    const backdated = next(progressed);
    backdated.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-backdated',
      kind: 'release',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/release.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(backdated)).toThrow(/new coordination operation revision/);

    const wildcardRelease = next(progressed);
    wildcardRelease.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-wildcard',
      kind: 'release',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/**'],
      from_ledger_revision: progressed.ledger.revision,
      to_ledger_revision: progressed.ledger.revision + 1,
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/release.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(wildcardRelease)).toThrow(/new release operation ticket binding/);
  });

  test('rejects invalid FIFO insertion, unready freeze, orphan retirement and historical claim rewrites', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const invalidSequence = fixture('other', 'file:src/other.ts');
    invalidSequence.expectedLedger = saved.ledgerVersion;
    invalidSequence.nextLedger.revision = 2;
    includeExistingLedger(invalidSequence, saved.ledger);
    invalidSequence.nextLedger.tickets[1].sequence++;
    invalidSequence.nextLedger.next_sequence++;
    expect(() => store.compareAndSwapHostState(invalidSequence)).toThrow(/FIFO sequence/);

    const unreadyFreeze = next(saved);
    unreadyFreeze.nextLedger.open_generation = 2;
    unreadyFreeze.nextLedger.contours.push(frozenContour(unreadyFreeze.nextLedger));
    expect(() => store.compareAndSwapHostState(unreadyFreeze)).toThrow(/frozen prior-generation contour/);

    const orphanRetirement = next(saved);
    orphanRetirement.nextLedger.retirements.push({
      schema: 'CoordinationTicketRetirement/v1',
      retirement_id: 'retirement-orphan',
      work_id: identity.work_id,
      thread_id: 'thread',
      ticket_id: 'ticket-missing',
      generation: 1,
      source_revision: 'source-2',
      ticket_source_revision: 'source',
      superseding_ticket_id: 'ticket-superseding-missing',
      superseding_source_revision: 'source-2',
      from_status: 'active',
      to_status: 'read_only',
      resources: [],
      reason: 'superseded',
      pointer: '.agent/decisions/retirement.json',
      actor: 'principal-1',
      from_revision: 1,
      to_revision: 2,
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      timestamp: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(orphanRetirement)).toThrow(/retirement ticket is missing/);

    const revoke = next(saved);
    revoke.nextLedger.tickets[0].generation = 2;
    revokeTicket(revoke.nextLedger);
    revoke.nextWork.lease = null;
    const revoked = store.compareAndSwapHostState(revoke);
    const rewrite = next(revoked);
    rewrite.nextLedger.claims[0].generation = 2;
    expect(() => store.compareAndSwapHostState(rewrite)).toThrow(/claim generation transition/);
  });

  test('binds ticket retirement history to the exact work CAS transition', () => {
    const initial = fixture();
    const retiredTicket = initial.nextLedger.tickets[0];
    const retiredClaim = initial.nextLedger.claims[0];
    retiredTicket.ticket_id = 'ticket-retired';
    retiredTicket.source_revision = 'source-old';
    retiredTicket.claim_ids = ['claim-retired'];
    retiredClaim.claim_id = 'claim-retired';
    retiredClaim.ticket_id = 'ticket-retired';
    initial.nextWork.lease.ticket_id = 'ticket-retired';
    initial.nextLedger.tickets.push({
      ...clone(retiredTicket),
      ticket_id: 'ticket-superseding',
      source_revision: 'source',
      sequence: 2,
      status: 'queued',
      claim_ids: [],
      expires_at: null,
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
    });
    initial.nextLedger.next_sequence = 3;
    const saved = store.compareAndSwapHostState(initial);

    const staleRevision = next(saved);
    staleRevision.nextWork.lease = null;
    revokeTicket(staleRevision.nextLedger, staleRevision.nextLedger.tickets[0]);
    staleRevision.nextLedger.retirements.push({
      schema: 'CoordinationTicketRetirement/v1',
      retirement_id: 'retirement-stale-work-revision',
      work_id: identity.work_id,
      thread_id: 'thread',
      ticket_id: 'ticket-retired',
      generation: 1,
      source_revision: 'source',
      ticket_source_revision: 'source-old',
      superseding_ticket_id: 'ticket-superseding',
      superseding_source_revision: 'source',
      from_status: 'active',
      to_status: 'read_only',
      resources: ['file:src/task.ts'],
      reason: 'superseded',
      pointer: '.agent/decisions/retirement.json',
      actor: 'principal-1',
      from_revision: 100,
      to_revision: 101,
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      timestamp: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(staleRevision)).toThrow(
      /history transition invalid|coordination rebind binding invalid/,
    );
  });

  test('rejects incomplete handoff, cross-generation FIFO bypass and terminal ticket reactivation', () => {
    const incomplete = fixture();
    incomplete.nextWork.lease = null;
    Object.assign(incomplete.nextLedger.tickets[0], {
      status: 'ready_for_handoff',
      active_resources: [],
      expires_at: null,
    });
    incomplete.nextLedger.claims[0].status = 'recovered';
    expect(() => store.compareAndSwapHostState(incomplete)).toThrow(/complete current ownership/);

    const bypass = fixture();
    const laterTicket = {
      ...clone(bypass.nextLedger.tickets[0]),
      ticket_id: 'ticket-later-generation',
      generation: 2,
      sequence: 2,
      claim_ids: ['claim-later-generation'],
    };
    const laterClaim = {
      ...clone(bypass.nextLedger.claims[0]),
      claim_id: 'claim-later-generation',
      ticket_id: laterTicket.ticket_id,
      generation: 2,
    };
    Object.assign(bypass.nextLedger.tickets[0], {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    bypass.nextLedger.claims[0].status = 'recovered';
    bypass.nextLedger.tickets.push(laterTicket);
    bypass.nextLedger.claims.push(laterClaim);
    bypass.nextLedger.open_generation = 2;
    bypass.nextLedger.next_sequence = 3;
    bypass.nextWork.lease = {
      ticket_id: laterTicket.ticket_id,
      thread_id: laterTicket.thread_id,
      generation: laterTicket.generation,
    };
    expect(() => store.compareAndSwapHostState(bypass)).toThrow(/coordination FIFO/);

    const saved = store.compareAndSwapHostState(fixture());
    const revoke = next(saved);
    revoke.nextWork.lease = null;
    revoke.nextLedger.tickets[0].generation = 2;
    revokeTicket(revoke.nextLedger);
    const terminal = store.compareAndSwapHostState(revoke);
    const reactivate = next(terminal);
    reactivate.nextLedger.tickets[0].status = 'active';
    reactivate.nextLedger.tickets[0].generation = 3;
    reactivate.nextLedger.tickets[0].claim_ids.push('claim-reactivated');
    reactivate.nextLedger.tickets[0].active_resources = ['file:src/task.ts'];
    reactivate.nextLedger.tickets[0].expires_at = '2099-01-01T00:00:00.000Z';
    reactivate.nextLedger.claims.push({
      schema: 'WorkstreamClaim/v1',
      claim_id: 'claim-reactivated',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      generation: 3,
      resources: ['file:src/task.ts'],
      lease_expires_at: '2099-01-01T00:00:00.000Z',
      status: 'active',
      created_at: '2026-09-18T00:00:00.000Z',
      renewed_at: '2026-09-18T00:00:00.000Z',
    });
    reactivate.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 3 };
    expect(() => store.compareAndSwapHostState(reactivate)).toThrow(/terminal ticket mutation/);
  });

  test('accepts an authorized notice acknowledgement and partial claim release', () => {
    const first = store.compareAndSwapHostState(fixture());
    const queued = fixture('other');
    queued.nextWork.lease = null;
    Object.assign(queued.nextLedger.tickets[0], {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    queued.nextLedger.claims[0].status = 'recovered';
    queued.expectedLedger = first.ledgerVersion;
    queued.nextLedger.revision = 2;
    includeExistingLedger(queued, first.ledger);
    queued.nextLedger.notices.push({
      schema: 'ConflictNotice/v1',
      notice_id: 'notice-shared',
      generation: 1,
      contender_ticket_id: 'ticket-other',
      contender_work_id: 'other',
      owner_ticket_id: 'ticket-work',
      owner_work_id: 'work',
      owner_thread_id: 'thread',
      resources: ['file:src/task.ts'],
      status: 'open',
      acknowledgements: [],
      created_at: '2026-09-18T00:00:00.000Z',
    });
    const terminalNotice = clone(queued);
    terminalNotice.nextLedger.notices[0].status = 'acknowledged';
    expect(() => store.compareAndSwapHostState(terminalNotice)).toThrow(
      /acknowledged notice requires an acknowledgement|history transition invalid/,
    );
    const queuedSaved = store.compareAndSwapHostState(queued);
    const emptyAcknowledgement = next(queuedSaved);
    emptyAcknowledgement.nextLedger.notices[0].status = 'acknowledged';
    expect(() => store.compareAndSwapHostState(emptyAcknowledgement)).toThrow(
      /acknowledged notice requires an acknowledgement/,
    );
    const acknowledge = next(queuedSaved);
    acknowledge.nextLedger.notices[0].status = 'acknowledged';
    acknowledge.nextLedger.notices[0].acknowledgements.push({
      actor: 'principal-other',
      at: '2026-09-18T00:01:00.000Z',
    });
    expect(store.compareAndSwapHostState(acknowledge).ledger.notices[0].status).toBe('acknowledged');

    const partialDatabase = new Database(path.join(root, 'partial.sqlite'), { create: true, strict: true });
    handles.push(partialDatabase);
    const partialStore = new HostStateStore(partialDatabase, workspace);
    const initial = fixture();
    initial.nextWork.binding.allowed_resources.push('file:src/second.ts');
    initial.nextWork.lifecycle.scope.allowed_paths.push('src/second.ts');
    initial.nextLedger.tickets[0].contour_keys.push('file:src/second.ts');
    initial.nextLedger.tickets[0].exclusive_resources.push('file:src/second.ts');
    initial.nextLedger.tickets[0].active_resources.push('file:src/second.ts');
    initial.nextLedger.claims[0].resources.push('file:src/second.ts');
    const partialSaved = partialStore.compareAndSwapHostState(initial);
    const release = next(partialSaved);
    release.nextLedger.tickets[0].generation = 2;
    release.nextLedger.tickets[0].active_resources = ['file:src/task.ts'];
    release.nextLedger.claims[0].generation = 2;
    release.nextLedger.claims[0].resources = ['file:src/task.ts'];
    release.nextWork.lease.generation = 2;
    expect(partialStore.compareAndSwapHostState(release).ledger.tickets[0].active_resources).toEqual([
      'file:src/task.ts',
    ]);
  });

  test('rejects duplicate active ownership, active-claim expansion and orphan rebind history', () => {
    const duplicate = fixture();
    duplicate.nextLedger.claims.push({ ...clone(duplicate.nextLedger.claims[0]), claim_id: 'claim-duplicate' });
    duplicate.nextLedger.tickets[0].claim_ids.push('claim-duplicate');
    expect(() => store.compareAndSwapHostState(duplicate)).toThrow(/active claim ownership/);

    const expansionDatabase = new Database(path.join(root, 'expansion.sqlite'), { create: true, strict: true });
    handles.push(expansionDatabase);
    const expansionStore = new HostStateStore(expansionDatabase, workspace);
    const expansionInitial = fixture();
    expansionInitial.nextWork.binding.allowed_resources.push('file:src/second.ts');
    expansionInitial.nextWork.lifecycle.scope.allowed_paths.push('src/second.ts');
    expansionInitial.nextLedger.tickets[0].contour_keys.push('file:src/second.ts');
    expansionInitial.nextLedger.tickets[0].exclusive_resources.push('file:src/second.ts');
    const expansionSaved = expansionStore.compareAndSwapHostState(expansionInitial);
    const expansion = next(expansionSaved);
    expansion.nextLedger.tickets[0].generation = 2;
    expansion.nextLedger.tickets[0].active_resources.push('file:src/second.ts');
    expansion.nextLedger.claims[0].generation = 2;
    expansion.nextLedger.claims[0].resources.push('file:src/second.ts');
    expansion.nextWork.lease.generation = 2;
    expect(() => expansionStore.compareAndSwapHostState(expansion)).toThrow(/active claim resources cannot expand/);

    const saved = store.compareAndSwapHostState(fixture());
    const orphan = next(saved);
    orphan.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-orphan',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-missing',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: [],
      retired_claim_ids: ['claim-missing'],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(orphan)).toThrow(/rebind ticket is missing/);
    const staleRevision = next(saved);
    staleRevision.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-stale-revision',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-work',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: ['file:src/task.ts'],
      retired_claim_ids: [],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: 100,
      to_ledger_revision: 101,
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(staleRevision)).toThrow(
      /history transition invalid|coordination rebind binding invalid/,
    );
  });

  test('accepts an owned scope rebind and claim disposition in one history transition', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const input = next(saved);
    input.nextLedger.dispositions.push({
      schema: 'ConflictDisposition/v1',
      disposition_id: 'disposition-recover',
      subject_kind: 'claim',
      subject_id: 'claim-work',
      kind: 'recover_expired',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/coordination.json',
      created_at: '2026-09-18T00:01:00.000Z',
    });
    input.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-work',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-work',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: ['file:src/task.ts'],
      retired_claim_ids: [],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: saved.ledger.revision,
      to_ledger_revision: input.nextLedger.revision,
      created_at: '2026-09-18T00:01:00.000Z',
    });
    const rebound = store.compareAndSwapHostState(input);
    expect(rebound.ledger.dispositions[0].subject_id).toBe('claim-work');
    expect(rebound.ledger.rebinds[0].ticket_id).toBe('ticket-work');
  });

  test('accepts a same-ticket retired claim in an owned scope rebind', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const input = next(saved);
    input.nextLedger.claims.push({
      ...clone(input.nextLedger.claims[0]),
      claim_id: 'claim-retired-same-ticket',
      status: 'recovered',
    });
    input.nextLedger.tickets[0].claim_ids.push('claim-retired-same-ticket');
    input.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-retired-same-ticket',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-work',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: ['file:src/task.ts'],
      retired_claim_ids: ['claim-retired-same-ticket'],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: saved.ledger.revision,
      to_ledger_revision: input.nextLedger.revision,
      created_at: '2026-09-18T00:01:00.000Z',
    });
    const rebound = store.compareAndSwapHostState(input);
    expect(rebound.ledger.rebinds[0].retired_claim_ids).toEqual(['claim-retired-same-ticket']);
  });

  test('rejects a rebind that retires a claim from an unrelated ticket', async () => {
    const first = fixture();
    first.nextWork.revision = 7;
    first.nextWork.lifecycle.revision = 7;
    first.nextLedger.revision = 9;
    const second = fixture('other', 'file:src/other.ts');
    second.nextWork.revision = 3;
    second.nextWork.lifecycle.revision = 3;
    const ledger = clone(first.nextLedger);
    ledger.next_sequence = 3;
    ledger.tickets.push({ ...clone(second.nextLedger.tickets[0]), sequence: 2 });
    ledger.claims.push(...clone(second.nextLedger.claims));
    quiesceImportedState([first.nextWork, second.nextWork], ledger);
    const binding = {
      ...reconciliationBinding({ workVersion: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } }),
      work: [
        {
          identity: { ...identity, work_id: 'other' },
          version: { revision: 3, digest: canonicalJsonDigest(second.nextWork) },
        },
        { identity, version: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } },
      ],
    };
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    store.importReconciledHostState([first.nextWork, second.nextWork], ledger, binding, fence);
    await store.releaseMaintenanceFence(fence);
    const saved = store.readHostStateSnapshot(identity);
    const input = next(saved);
    input.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-unrelated-retired-claim',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-work',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: ['file:src/task.ts'],
      retired_claim_ids: ['claim-other'],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: saved.ledger.revision,
      to_ledger_revision: input.nextLedger.revision,
      created_at: '2026-09-18T00:01:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(input)).toThrow(/rebind binding invalid/);
  });

  test('requires contour assurance before batching and accepts one attributable batch decision', () => {
    const initial = store.compareAndSwapHostState(fixture());
    const ready = next(initial);
    ready.nextWork.lease = null;
    ready.nextLedger.tickets[0].status = 'ready_for_handoff';
    const readySaved = store.compareAndSwapHostState(ready);

    const freeze = next(readySaved);
    const contour = frozenContour(freeze.nextLedger);
    freeze.nextLedger.contours.push(contour);
    freeze.nextLedger.open_generation++;
    const frozen = store.compareAndSwapHostState(freeze);
    const batch = {
      schema: 'ReleaseBatch/v1',
      batch_id: 'batch-work',
      contour_id: contour.contour_id,
      generation: contour.generation,
      work_ids: [...contour.work_ids],
      operations: [{ order: 1, source: 'src/task.ts', destination: 'target/task.ts', operation: 'copy' }],
      do_not_deploy: [],
      post_deployment_checks: [
        { id: 'check-1', step: 'Run the task.', expected: 'The task succeeds.', ac_refs: ['AC-1'] },
      ],
      status: 'ready_for_user_testing',
      created_at: '2026-09-18T00:02:00.000Z',
    };
    const withoutAssurance = next(frozen);
    withoutAssurance.nextLedger.batches.push(batch);
    expect(() => store.compareAndSwapHostState(withoutAssurance)).toThrow(/requires contour assurance/);

    const assurance = next(frozen);
    assurance.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'assurance-work',
      kind: 'contour_assurance',
      contour_id: contour.contour_id,
      contour_digest: contour.contour_digest,
      integration_work_id: identity.work_id,
      test_receipts: ['test-receipt'],
      review_receipt_ids: ['review-1', 'review-2', 'review-3'],
      reverse_receipt_ids: ['reverse-1', 'reverse-2', 'reverse-3'],
      from_ledger_revision: frozen.ledger.revision,
      to_ledger_revision: frozen.ledger.revision + 1,
      created_at: '2026-09-18T00:03:00.000Z',
    });
    const assured = store.compareAndSwapHostState(assurance);
    const directAccepted = next(assured);
    directAccepted.nextLedger.batches.push({
      ...batch,
      status: 'accepted',
      decision_pointer: '.agent/decisions/direct-batch.json',
    });
    directAccepted.nextLedger.tickets[0].status = 'released';
    directAccepted.nextLedger.tickets[0].active_resources = [];
    directAccepted.nextLedger.tickets[0].expires_at = null;
    directAccepted.nextLedger.claims[0].status = 'released';
    directAccepted.nextLedger.claims[0].resources = [];
    expect(() => store.compareAndSwapHostState(directAccepted)).toThrow(/history transition invalid/);
    const build = next(assured);
    build.nextLedger.batches.push(batch);
    const built = store.compareAndSwapHostState(build);

    const inconsistent = next(built);
    inconsistent.nextLedger.batches[0].status = 'accepted';
    inconsistent.nextLedger.batches[0].decision_pointer = '.agent/decisions/batch-work.json';
    expect(() => store.compareAndSwapHostState(inconsistent)).toThrow(/atomically release contour tickets/);

    const accept = next(built);
    accept.nextLedger.batches[0].status = 'accepted';
    accept.nextLedger.batches[0].decision_pointer = '.agent/decisions/batch-work.json';
    accept.nextLedger.tickets[0].status = 'released';
    accept.nextLedger.tickets[0].active_resources = [];
    accept.nextLedger.tickets[0].expires_at = null;
    accept.nextLedger.claims[0].status = 'released';
    accept.nextLedger.claims[0].resources = [];
    expect(store.compareAndSwapHostState(accept).ledger.batches[0].status).toBe('accepted');
  });

  test('persists canonical bytes for the same canonical state digest', () => {
    const saved = store.compareAndSwapHostState(fixture());
    const rows = database.query('SELECT kind, payload FROM agent_host_state ORDER BY kind').all();
    expect(rows).toEqual([
      { kind: 'ledger', payload: canonicalJson(saved.ledger) },
      { kind: 'work', payload: canonicalJson(saved.work) },
    ]);
  });

  test('shared ledger rejects conflicting case-alias claims and permits disjoint work without touching foreign tickets', () => {
    const first = store.compareAndSwapHostState(fixture());
    const collision = fixture('other', 'file:SRC/task.ts');
    collision.expectedLedger = first.ledgerVersion;
    collision.nextLedger.revision = 2;
    includeExistingLedger(collision, first.ledger);
    expect(() => store.compareAndSwapHostState(collision)).toThrow(/coordination FIFO|conflicting owners/);
    const second = fixture('other', 'file:src/other.ts');
    second.expectedLedger = first.ledgerVersion;
    second.nextLedger.revision = 2;
    includeExistingLedger(second, first.ledger);
    const saved = store.compareAndSwapHostState(second);
    const changeForeign = next(saved);
    setActiveLease(changeForeign.nextLedger, new Date(Date.now() + 7200_000).toISOString());
    expect(() => store.compareAndSwapHostState(changeForeign)).toThrow(/foreign (ticket|claim)/);
    expect(store.readHostStateSnapshot(identity).work).toEqual(first.work);
  });

  test('rejects coordination history appended through a different work identity', () => {
    const first = store.compareAndSwapHostState(fixture());
    const other = fixture('other', 'file:src/other.ts');
    other.expectedLedger = first.ledgerVersion;
    other.nextLedger.revision = 2;
    includeExistingLedger(other, first.ledger);
    const saved = store.compareAndSwapHostState(other);
    const forged = next(saved);
    forged.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'release-foreign-work',
      kind: 'release',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      from_ledger_revision: saved.ledger.revision,
      to_ledger_revision: saved.ledger.revision + 1,
      decided_by: 'principal-other',
      decision_pointer: '.agent/decisions/foreign-release.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => store.compareAndSwapHostState(forged)).toThrow(/history ownership invalid/);
  });

  test('blocked requests grant no ownership', () => {
    const first = store.compareAndSwapHostState(fixture());
    const queued = fixture('other');
    queued.nextWork.lease = null;
    Object.assign(queued.nextLedger.tickets[0], {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    queued.nextLedger.claims[0].status = 'recovered';
    queued.expectedLedger = first.ledgerVersion;
    queued.nextLedger.revision = 2;
    includeExistingLedger(queued, first.ledger);
    expect(store.compareAndSwapHostState(queued).work.lease).toBeNull();
  });

  test('expired active resources stay occupied until explicit fenced revocation', () => {
    const initial = fixture();
    initial.nextWork.lease = null;
    setActiveLease(initial.nextLedger, '2020-01-01T00:00:00Z');
    const saved = store.compareAndSwapHostState(initial);
    const competing = fixture('other');
    competing.expectedLedger = saved.ledgerVersion;
    competing.nextLedger.revision = 2;
    includeExistingLedger(competing, saved.ledger);
    expect(() => store.compareAndSwapHostState(competing)).toThrow(/coordination FIFO|conflicting owners/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('an expired lease cannot be revived without a new fencing generation', () => {
    const initial = fixture();
    initial.nextWork.lease = null;
    setActiveLease(initial.nextLedger, '2020-01-01T00:00:00Z');
    const saved = store.compareAndSwapHostState(initial);
    const renewal = next(saved);
    setActiveLease(renewal.nextLedger, new Date(Date.now() + 3600_000).toISOString());
    renewal.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
    expect(() => store.compareAndSwapHostState(renewal)).toThrow(/fencing generation/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    renewal.nextLedger.tickets[0].generation = 2;
    activeClaimFor(renewal.nextLedger).generation = 2;
    renewal.nextWork.lease.generation = 2;
    expect(store.compareAndSwapHostState(renewal).work.lease.generation).toBe(2);
  });

  test('existing ticket order cannot be changed by a writer for another work', () => {
    const first = store.compareAndSwapHostState(fixture());
    const input = fixture('other', 'file:src/other.ts');
    input.expectedLedger = first.ledgerVersion;
    input.nextLedger.revision = 2;
    includeExistingLedger(input, first.ledger);
    const saved = store.compareAndSwapHostState(input);
    const reorder = next(saved);
    reorder.nextLedger.tickets.reverse();
    expect(() => store.compareAndSwapHostState(reorder)).toThrow(/ticket order/);
    expect(store.readHostStateSnapshot({ ...identity, work_id: 'other' })).toEqual(saved);
  });

  test.each(['payload', 'digest', 'revision'])('detects stored %s corruption before any mutation', (field) => {
    store.compareAndSwapHostState(fixture());
    const value = field === 'revision' ? 99 : 'tampered';
    const sql = {
      payload: "UPDATE agent_host_state SET payload=? WHERE kind='work'",
      digest: "UPDATE agent_host_state SET digest=? WHERE kind='work'",
      revision: "UPDATE agent_host_state SET revision=? WHERE kind='work'",
    }[field];
    database.query(sql).run(value);
    expect(() => store.readHostStateSnapshot(identity)).toThrow();
  });

  test.each(['work', 'ledger'])('rejects a missing %s row rather than recreate partial authority', (kind) => {
    store.compareAndSwapHostState(fixture());
    database.query('DELETE FROM agent_host_state WHERE kind=?').run(kind);
    expect(() => store.readHostStateSnapshot(identity)).toThrow();
    expect(() => store.compareAndSwapHostState(fixture())).toThrow();
  });

  test('requires file-backed recoverable database and rejects nested transaction ownership', () => {
    const memory = new Database(':memory:');
    handles.push(memory);
    let rejected;
    try {
      new HostStateStore(memory, workspace);
    } catch (error) {
      rejected = error;
    }
    expect(rejected).toMatchObject({
      code: 'GAP-HOST-STATE-001',
      message: expect.stringMatching(/file-backed/),
    });
    database.exec('PRAGMA journal_mode=MEMORY');
    expect(() => new HostStateStore(database, workspace)).toThrow(/journal/);
    expect(() => store.compareAndSwapHostState(fixture())).toThrow(/journal/);
    database.exec('PRAGMA journal_mode=WAL');
    database.exec('PRAGMA synchronous=OFF');
    expect(() => store.compareAndSwapHostState(fixture())).toThrow(/synchronization/);
    database.exec('PRAGMA synchronous=FULL');
    database.transaction(() => {
      expect(() => store.readHostStateSnapshot(identity)).toThrow(/nested/);
      expect(() => store.compareAndSwapHostState(fixture())).toThrow(/nested/);
    })();
  });

  test.each(['work-and-ledger', 'governance-reserve', 'governance-transition'])(
    'two independent Bun processes race on %s: exactly one commits',
    async (raceKind) => {
      const saved = store.compareAndSwapHostState(fixture());
      const reservation =
        raceKind === 'governance-transition' ? store.reserveOperation('race', operationKey, requestDigest) : null;
      const moduleUrl = new URL('../../src/host-state.ts', import.meta.url).href;
      const racers = [1, 2].map((number) => {
        const input = next(saved);
        input.nextWork.execution.phase = 'racer-' + number;
        const action =
          raceKind === 'work-and-ledger'
            ? `store.compareAndSwapHostState(${JSON.stringify(input)})`
            : raceKind === 'governance-reserve'
              ? `if (!store.reserveOperation('race',${JSON.stringify(operationKey)},${JSON.stringify(requestDigest)})) throw new Error('compare-and-swap conflict')`
              : `store.transitionOperation(${JSON.stringify(reservation)},${JSON.stringify(number === 1 ? 'commit_unknown' : 'aborted')})`;
        const code = `import { HostStateStore, openHostStateDatabase } from ${JSON.stringify(moduleUrl)};
        const db=openHostStateDatabase(${JSON.stringify(databasePath)});
        const store=new HostStateStore(db,${JSON.stringify(workspace)}); console.log('READY');
        process.stdin.once('data',()=>{try {${action};console.log('COMMITTED');}
        catch(error){console.log(/compare-and-swap|state conflict/.test(error.message)?'CONFLICT':'ERROR:'+error.message);}finally{db.close();process.exit(0);}});`;
        const child = spawn(process.execPath, ['--eval', code], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        children.push(child);
        let output = '',
          errors = '';
        let readyResolve;
        const ready = new Promise((resolve) => {
          readyResolve = resolve;
        });
        child.stdout.on('data', (data) => {
          output += data;
          if (output.includes('READY')) readyResolve();
        });
        child.stderr.on('data', (data) => {
          errors += data;
        });
        const done = new Promise((resolve, reject) => {
          child.on('error', reject);
          child.on('close', (code) =>
            code === 0 ? resolve(output) : reject(new Error(errors || 'race process failed')),
          );
        });
        return { child, ready, done };
      });
      await Promise.all(racers.map((racer) => racer.ready));
      for (const racer of racers) racer.child.stdin.end('go\n');
      const results = await Promise.all(racers.map((racer) => racer.done));
      expect(results.filter((result) => result.includes('COMMITTED'))).toHaveLength(1);
      expect(results.filter((result) => result.includes('CONFLICT'))).toHaveLength(1);
      expect(store.readHostStateSnapshot(identity).work.revision).toBe(raceKind === 'work-and-ledger' ? 2 : 1);
      if (raceKind !== 'work-and-ledger') expect(governanceRows()).toHaveLength(1);
    },
    15000,
  );
});

function markFixtureDelivered(input, closeout) {
  const work = input.nextWork;
  const lifecycle = work.lifecycle;
  const fingerprint = 'a'.repeat(64);
  lifecycle.phase = 'DELIVERY';
  lifecycle.seal = {
    sealed_revision: work.revision,
    sealed_at: new Date().toISOString(),
    implementation_fingerprint: fingerprint,
  };
  lifecycle.assurance.review_generation = 1;
  lifecycle.assurance.delivery_cycle_id = `delivery-${work.binding.lifecycle_work_id}`;
  const reference = (kind, id, extra = {}) => ({
    schema: 'LifecycleArtifactReference/v1',
    kind,
    artifact_schema: 'Evidence/v1',
    record_id: `${id}-${work.binding.lifecycle_work_id}`,
    path: `.agent/${id}-${work.binding.lifecycle_work_id}.json`,
    sha256: 'd'.repeat(64),
    source_revision: lifecycle.source_revision,
    scope_id: lifecycle.scope.scope_id,
    ac_ids: ['AC-1'],
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: null,
    decision: null,
    disposition: 'current',
    ...extra,
  });
  lifecycle.references = [
    ...[
      'source_plan',
      'acceptance_manifest',
      'implementation_scope',
      'platform_knowledge',
      'implementation_policy',
      'change_impact_pre',
    ].map((kind) => reference(kind, kind)),
    reference('execution_approval', 'approval', { decision: 'approved' }),
    reference('documentation_validation', 'docs-pre', { decision: 'pass' }),
    reference('implementation_result', 'implementation', { implementation_fingerprint: fingerprint }),
    reference('documentation_clear', 'docs-closeout', {
      decision: 'pass',
      generation: 1,
      record_id: closeout.clear_id,
      path: closeout.path,
      sha256: closeout.sha256,
      implementation_fingerprint: fingerprint,
    }),
    reference('delivery_manifest', 'manifest', {
      implementation_fingerprint: fingerprint,
      delivery_cycle_id: lifecycle.assurance.delivery_cycle_id,
    }),
  ];
  for (let index = 1; index <= 3; index++) {
    lifecycle.references.push(
      reference('review_receipt', `review-${index}`, {
        generation: 1,
        implementation_fingerprint: fingerprint,
        principal: `reviewer-${index}`,
        decision: 'pass',
      }),
      reference('reverse_validation', `reverse-${index}`, {
        generation: 1,
        implementation_fingerprint: fingerprint,
        principal: `reverse-reviewer-${index}`,
        decision: 'pass',
      }),
    );
  }
  return input;
}
async function clearContextFor(workId) {
  const write = async (relative, content) => {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  if (!(await Bun.file(path.join(root, 'agent-runtime.config.v1.yaml')).exists())) {
    await mkdir(path.join(root, '.git'));
    await write('AGENTS.md', '# Fixture\n');
    await write('AGENT.sidecar.md', '# Fixture\n');
    const config = (await readFile(path.join(bundleRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8'))
      .replaceAll('{{REPOSITORY}}', 'project-repository')
      .replaceAll('{{PROJECT}}', 'project')
      .replaceAll('{{BUNDLE}}', 'vida-agent');
    await write('agent-runtime.config.v1.yaml', config);
    await write(
      'vida-agent/schemas/documentation-policy.v1.schema.json',
      await readFile(path.join(bundleRoot, 'schemas/documentation-policy.v1.schema.json')),
    );
    await write('vida-agent/TESTING.md', 'fixture testing\n');
    await write('docs/creatio/map.md', 'map\n');
    await write('docs/agent-instructions/index.md', 'index\n');
    await write('docs/agent-instructions/current.md', 'current\n');
    await write(
      'docs/agent-instructions/documentation-policy.v1.json',
      JSON.stringify({
        schema: 'DocumentationPolicy/v1',
        policy_id: 'host-clear',
        project_id: 'project',
        source_path: 'docs/agent-instructions/documentation-policy.v1.json',
        owner: 'project:project',
        required: true,
        canonical_roots: ['docs/agent-instructions'],
        map_paths: ['docs/agent-instructions/index.md'],
        excluded_roots: ['.agent', '.planning'],
        changelog_required: false,
        changelog_path: null,
        relations: ['owns'],
        updated_at: new Date().toISOString(),
      }) + '\n',
    );
  }
  const context = {
    repository_root: root,
    repository_id: 'project-repository',
    project_id: 'project',
    work_id: workId,
  };
  await write(
    `.agent/work/${workId}/scope.json`,
    JSON.stringify({
      schema: 'ImplementationScope/v1',
      work_id: workId,
      source_revision: 'source',
      allowed_paths: ['src/task.ts'],
    }) + '\n',
  );
  const input = { ...context, source_revision: 'source', scope_paths: ['src/task.ts'] };
  await executeDocumentationClearOperation(input, 'baseline');
  const closeout = await executeDocumentationClearOperation(input, 'closeout');
  const record = JSON.parse(await readFile(path.join(root, closeout.path), 'utf8'));
  return { context, closeout: { ...closeout, clear_id: record.clear_id } };
}
test('ten quiescent same-thread follow-ups release only their prior exact claim without Runtime acceptance', async () => {
  let clear = await clearContextFor('work');
  store.compareAndSwapHostState(markFixtureDelivered(fixture(), clear.closeout));
  let currentId = 'work';
  for (let index = 1; index <= 10; index++) {
    const currentIdentity = { ...identity, work_id: currentId };
    const prior = store.readHostStateSnapshot(currentIdentity);
    const journal = quiescentJournal(currentId, `run-${currentId}`);
    const request = {
      store,
      identity: currentIdentity,
      journal,
      expectedWork: prior.workVersion,
      expectedLedger: prior.ledgerVersion,
      nativeSessionHandle: 'thread',
      userRequestPointer: `user-request:thread/${index}`,
      requestIntent: 'next_work',
      documentationContext: clear.context,
    };
    const suspended = suspendLocalWork(request);
    expect(suspended.work.execution.status).toBe('suspended');
    expect(suspended.work.lifecycle.phase).toBe('DELIVERY');
    expect(suspended.work.lease).toBeNull();
    expect(suspended.ledger.tickets.find((entry) => entry.work_id === currentId).status).toBe('released');
    expect(suspendLocalWork(request).workVersion).toEqual(suspended.workVersion);
    const nextId = `work-${index}`;
    clear = await clearContextFor(nextId);
    const admission = includeExistingLedger(markFixtureDelivered(fixture(nextId), clear.closeout), suspended.ledger);
    admission.expectedLedger = suspended.ledgerVersion;
    store.compareAndSwapHostState(admission);
    currentId = nextId;
  }
  const latest = store.readHostStateSnapshot({ ...identity, work_id: currentId });
  expect(latest.ledger.operations.filter((entry) => entry.kind === 'release')).toHaveLength(10);
  expect(latest.ledger.claims.filter((entry) => entry.status === 'active')).toHaveLength(1);
  expect(latest.ledger.tickets.filter((entry) => entry.status === 'active')).toHaveLength(1);
  // Ten real CLEAR baseline/closeout cycles share a finite integration budget under the full suite.
}, 120_000);

test('completed readonly owner release closes an expired exact lease without phase or rights change', async () => {
  const seed = fixture(),
    expiry = new Date(Date.now() + 150).toISOString();
  seed.nextLedger.tickets[0].expires_at = expiry;
  seed.nextLedger.claims[0].lease_expires_at = expiry;
  const initial = store.compareAndSwapHostState(seed);
  await Bun.sleep(180);
  const journal = quiescentJournal();
  journal.state.step_id = 'wave-1';
  journal.state.items = [
    {
      issue_id: 'completed-issue',
      observation: { status: 'reported_complete' },
      request: { action_id: 'completed-readonly-action' },
    },
  ];
  const request = {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:completed-readonly',
    requestIntent: 'linked_correction',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: identity.project_ids[0],
      work_id: identity.work_id,
    },
  };
  expect(() => suspendLocalWork(request)).toThrow('expired');
  const released = suspendCompletedReadOnlyWork(request);
  expect(released.work.lease).toBeNull();
  expect(released.work.execution.status).toBe('suspended');
  expect(released.work.execution.phase).toBe(initial.work.execution.phase);
  expect(released.work.lifecycle.phase).toBe(initial.work.lifecycle.phase);
  expect(released.work.binding).toEqual(initial.work.binding);
  expect(released.work.artifacts).toEqual(initial.work.artifacts);
  expect(released.ledger.tickets[0].generation).toBe(initial.ledger.tickets[0].generation);
  expect(released.ledger.claims[0].generation).toBe(initial.ledger.claims[0].generation);
  expect(released.ledger.operations).toHaveLength(1);
  expect(released.ledger.operations[0].operation_id).toMatch(/^completed-readonly-release-/);
  expect(suspendCompletedReadOnlyWork(request).workVersion).toEqual(released.workVersion);
});

test('completed readonly owner release denies missing, reserved, failed and foreign completion', () => {
  const initial = store.compareAndSwapHostState(fixture()),
    journal = quiescentJournal();
  journal.state.items = [
    { issue_id: 'issued', observation: { status: 'reported_complete' }, request: { action_id: 'readonly' } },
  ];
  const request = {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:completed-readonly-negative',
    requestIntent: 'linked_correction',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: identity.project_ids[0],
      work_id: identity.work_id,
    },
  };
  for (const change of [
    { observation: null },
    { observation: { status: 'reported_failed' } },
    { host_reservation: {} },
  ]) {
    const altered = clone(journal);
    Object.assign(altered.state.items[0], change);
    expect(() => suspendCompletedReadOnlyWork({ ...request, journal: altered })).toThrow(
      'unobserved, failed or reserved',
    );
    expect(store.readHostStateSnapshot(identity).workVersion).toEqual(initial.workVersion);
  }
  expect(() => suspendCompletedReadOnlyWork({ ...request, nativeSessionHandle: 'foreign-thread' })).toThrow(
    'same-thread lease',
  );
  expect(store.readHostStateSnapshot(identity).ledgerVersion).toEqual(initial.ledgerVersion);
});

test('completed readonly owner release denies stale CAS and a newer queued conflicting contour', () => {
  const initial = store.compareAndSwapHostState(fixture());
  const journal = quiescentJournal();
  journal.state.items = [
    { issue_id: 'issued', observation: { status: 'reported_complete' }, request: { action_id: 'readonly' } },
  ];
  const request = {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:completed-readonly-fifo',
    requestIntent: 'linked_correction',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: identity.project_ids[0],
      work_id: identity.work_id,
    },
  };
  expect(() =>
    suspendCompletedReadOnlyWork({ ...request, expectedWork: { ...initial.workVersion, revision: 0 } }),
  ).toThrow('compare-and-swap');
  expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  const queued = fixture('other');
  queued.nextWork.lease = null;
  Object.assign(queued.nextLedger.tickets[0], {
    status: 'queued',
    active_resources: [],
    blocked_resources: ['file:src/task.ts'],
    expires_at: null,
  });
  queued.nextLedger.claims[0].status = 'recovered';
  queued.expectedLedger = initial.ledgerVersion;
  includeExistingLedger(queued, initial.ledger);
  store.compareAndSwapHostState(queued);
  const before = store.readHostStateSnapshot(identity);
  expect(() =>
    suspendCompletedReadOnlyWork({
      ...request,
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
    }),
  ).toThrow('same-thread lease');
  expect(store.readHostStateSnapshot(identity)).toEqual(before);
  expect(before.ledger.tickets[1].sequence).toBeGreaterThan(before.ledger.tickets[0].sequence);
});

function resourceFreeFixture(id = 'work', resource = 'file:src/task.ts') {
  const seed = fixture(id, resource);
  const ticket = seed.nextLedger.tickets[0];
  const resources = ['execution:' + id];
  ticket.exclusive_resources = resources;
  ticket.active_resources = resources;
  seed.nextLedger.claims[0].resources = resources;
  seed.nextWork.binding.allowed_resources.push(...resources);
  return seed;
}
const sourceLeaseConfig = {
  workflows: {
    bug_fix: {
      stages: [
        { id: 'develop_fix', assignments: [{ role: 'developer', profile: 'writer' }] },
        { id: 'research_bug', assignments: [{ role: 'diagnostics-researcher', profile: 'readonly' }] },
      ],
    },
  },
  agents: {
    profiles: {
      writer: { mutation_scope: 'repository_source', tools_policy: 'write', egress_policy: 'none' },
      readonly: { mutation_scope: 'none', tools_policy: 'read_only', egress_policy: 'none' },
    },
    tool_policies: { write: { source_write: true }, read_only: { source_write: false } },
    egress_policies: { none: { allowed_hosts: [] } },
  },
};
async function writerFixture(id = 'work', resource = 'file:src/task.ts', config = sourceLeaseConfig) {
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, resource.slice(5)), 'original source');
  const seed = resourceFreeFixture(id, resource);
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [resource.slice(5)]);
  seed.nextWork.binding.work_source_revision = source.digest;
  seed.nextWork.binding.workflow_id = 'bug_fix';
  seed.nextWork.binding.config_digest = runtimeConfigDigest(config);
  seed.nextWork.lifecycle.source_revision = source.digest;
  seed.nextWork.lifecycle.config_binding.config_digest = seed.nextWork.binding.config_digest;
  seed.nextLedger.tickets[0].source_revision = source.digest;
  return { seed, source };
}
function writerAcquire(host) {
  return acquireLocalSourceWriterLease({
    repositoryRoot: root,
    config: sourceLeaseConfig,
    store,
    identity: { ...identity, work_id: host.work.binding.lifecycle_work_id },
    nativeSessionHandle: 'thread',
    stageId: 'develop_fix',
    assignmentIndex: 0,
    expectedWork: host.workVersion,
    expectedLedger: host.ledgerVersion,
  });
}
test('lazy ownership: execution-only intake admits and configured writer acquires exact claims', async () => {
  const { seed } = await writerFixture();
  const initial = store.compareAndSwapHostState(seed);
  expect(initial.ledger.claims[0].resources).toEqual(['execution:work']);
  expect(Date.parse(initial.ledger.tickets[0].expires_at)).toBeGreaterThan(Date.now());
  const active = writerAcquire(initial);
  expect(active.work.lease.ticket_id).not.toBe(initial.work.lease.ticket_id);
  expect(active.ledger.tickets[0].status).toBe('released');
  expect(active.ledger.tickets[0].exclusive_resources).toEqual(['execution:work']);
  expect(active.ledger.claims.find((claim) => claim.status === 'active').resources).toEqual([
    'execution:work',
    'file:src/task.ts',
  ]);
  expect(writerAcquire(active).workVersion).toEqual(active.workVersion);
});
test('lazy ownership: source drift and readonly assignment cannot acquire a writer claim', async () => {
  const { seed } = await writerFixture();
  const initial = store.compareAndSwapHostState(seed);
  expect(() =>
    acquireLocalSourceWriterLease({
      repositoryRoot: root,
      config: sourceLeaseConfig,
      store,
      identity,
      nativeSessionHandle: 'thread',
      stageId: 'research_bug',
      assignmentIndex: 0,
      expectedWork: initial.workVersion,
      expectedLedger: initial.ledgerVersion,
    }),
  ).toThrow('not a source writer');
  await writeFile(path.join(root, 'src/task.ts'), 'changed');
  expect(() => writerAcquire(initial)).toThrow('declared source changed');
  expect(store.readHostStateSnapshot(identity).workVersion).toEqual(initial.workVersion);
});
test('lazy ownership: same-file writers queue FIFO while disjoint project writer proceeds', async () => {
  const first = writerAcquire(store.compareAndSwapHostState((await writerFixture()).seed));
  const secondSeed = (await writerFixture('second')).seed;
  includeExistingLedger(secondSeed, first.ledger);
  secondSeed.expectedLedger = first.ledgerVersion;
  const second = store.compareAndSwapHostState(secondSeed);
  expect(() => writerAcquire(second)).toThrow('queued');
  const queued = store.readHostStateSnapshot({ ...identity, work_id: 'second' });
  expect(
    queued.ledger.tickets.find((ticket) => ticket.work_id === 'second' && ticket.status === 'queued').blocked_resources,
  ).toEqual(['execution:second', 'file:src/task.ts']);
  expect(queued.work.lease.ticket_id).toBe(second.work.lease.ticket_id);
  const disjointSeed = (await writerFixture('disjoint', 'file:src/disjoint.ts')).seed;
  includeExistingLedger(disjointSeed, queued.ledger);
  disjointSeed.expectedLedger = queued.ledgerVersion;
  const disjoint = writerAcquire(store.compareAndSwapHostState(disjointSeed));
  expect(
    disjoint.ledger.claims.find((claim) => claim.work_id === 'disjoint' && claim.status === 'active').resources,
  ).toEqual(['execution:disjoint', 'file:src/disjoint.ts']);
});
test('contour resources: disjoint same-project handoff freezes independently', () => {
  const first = store.compareAndSwapHostState(fixture());
  const secondSeed = includeExistingLedger(fixture('other', 'file:src/other.ts'), first.ledger);
  secondSeed.expectedLedger = first.ledgerVersion;
  store.compareAndSwapHostState(secondSeed);
  const ready = next(store.readHostStateSnapshot(identity));
  ready.nextWork.lease = null;
  ready.nextLedger.tickets[0].status = 'ready_for_handoff';
  const saved = store.compareAndSwapHostState(ready);
  const freeze = next(saved);
  freeze.nextLedger.contours.push(frozenContour(freeze.nextLedger));
  freeze.nextLedger.open_generation++;
  const frozen = store.compareAndSwapHostState(freeze);
  expect(frozen.ledger.contours[0].work_ids).toEqual(['work']);
  expect(frozen.ledger.tickets[1].status).toBe('active');
});
test('contour resources: explicit shared resource and three queued file aliases preserve FIFO component', () => {
  const first = store.compareAndSwapHostState(fixture());
  let current = first;
  for (const id of ['second', 'third']) {
    const seed = fixture(id, 'file:src/task.ts');
    seed.nextWork.lease = null;
    const ticket = seed.nextLedger.tickets[0];
    ticket.status = 'queued';
    ticket.active_resources = [];
    ticket.blocked_resources = ['file:src/task.ts'];
    ticket.claim_ids = [];
    ticket.expires_at = null;
    seed.nextLedger.claims = [];
    includeExistingLedger(seed, current.ledger);
    seed.expectedLedger = current.ledgerVersion;
    current = store.compareAndSwapHostState(seed);
  }
  const ready = next(store.readHostStateSnapshot(identity));
  ready.nextWork.lease = null;
  ready.nextLedger.tickets[0].status = 'ready_for_handoff';
  const saved = store.compareAndSwapHostState(ready);
  const freeze = next(saved);
  freeze.nextLedger.contours.push(frozenContour(freeze.nextLedger));
  freeze.nextLedger.open_generation++;
  expect(() => store.compareAndSwapHostState(freeze)).toThrow('frozen prior-generation contour');
});

async function unknownReadonlyFixture(resourceFree = false, config = sourceLeaseConfig) {
  const prepared = await writerFixture('work', 'file:src/task.ts', config);
  const seed = resourceFree ? prepared.seed : fixture();
  if (!resourceFree) {
    seed.nextWork.binding = prepared.seed.nextWork.binding;
    seed.nextWork.lifecycle = prepared.seed.nextWork.lifecycle;
    seed.nextLedger.tickets[0].source_revision = prepared.source.digest;
  }
  const initial = store.compareAndSwapHostState(seed);
  const journal = ownerRecoveryPreviewJournal();
  journal.resume_status = 'issued_outcome_uncertain';
  journal.state.source_scope = prepared.source;
  journal.state.items[0].issue_id = 'old-issued-unknown';
  journal.state.items[0].request.config_digest = initial.work.binding.config_digest;
  journal.state.items[0].request.scope_digest = prepared.source.digest;
  journal.version = { revision: 1, digest: canonicalJsonDigest(journal.state) };
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES (?,?,?,?,?,?)')
    .run(workspace, 'work', 1, 1, canonicalJson(journal.state), journal.version.digest);
  return { initial, journal, request: { ...ownerRecoveryPreviewRequest(initial, journal), config } };
}
test('issued readonly release: expired exact owner retires claims and preserves unknown journal bytes', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture();
  const row = database.query('SELECT * FROM agent_host_mastra_session_ledger').get();
  ownerRecoveryPreviewExpired(() => {
    const released = suspendLocalWork(request);
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(released.work.lifecycle.phase).toBe(initial.work.lifecycle.phase);
    expect(released.work.binding).toEqual(initial.work.binding);
    expect(released.ledger.tickets[0].status).toBe('released');
    expect(released.ledger.claims[0].status).toBe('released');
    expect(journal.state.items[0].issue_id).toBe('old-issued-unknown');
    expect(journal.state.items[0].observation).toBeNull();
    expect(database.query('SELECT * FROM agent_host_mastra_session_ledger').get()).toEqual(row);
    expect(suspendLocalWork(request).workVersion).toEqual(released.workVersion);
  });
});
test('issued readonly release: execution-only owner releases without file ownership', async () => {
  const { request } = await unknownReadonlyFixture(true);
  const released = suspendLocalWork(request);
  expect(released.ledger.claims.every((claim) => claim.status === 'released')).toBe(true);
  expect(released.work.lease).toBeNull();
  expect(released.ledger.operations[0].resources).toEqual(['execution:work']);
});
test('issued readonly release: stale journal CAS, reservation, second unknown and foreign thread deny without writes', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture();
  for (const modify of [
    (value) => {
      value.journal.version.digest = 'f'.repeat(64);
    },
    (value) => {
      value.journal.state.items[0].host_reservation = {};
    },
    (value) => {
      value.journal.state.items.push(clone(value.journal.state.items[0]));
    },
    (value) => {
      value.nativeSessionHandle = 'foreign';
    },
    (value) => {
      value.journal.state.items[0].research_normalization = {};
    },
  ]) {
    const candidate = { ...request, journal: clone(journal) };
    modify(candidate);
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork(candidate)).toThrow());
    expect(store.readHostStateSnapshot(identity).workVersion).toEqual(initial.workVersion);
  }
});
test('issued readonly release: configured source-writing or egress rights remain blocked', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture();
  const writingJournal = clone(journal);
  writingJournal.state.items[0].request.stage_id = 'develop_fix';
  writingJournal.state.items[0].request.role = 'developer';
  ownerRecoveryPreviewExpired(() =>
    expect(() => suspendLocalWork({ ...request, journal: writingJournal })).toThrow('uncertain'),
  );
  const wrongConfig = clone(sourceLeaseConfig);
  wrongConfig.agents.profiles.readonly.egress_policy = 'official_docs';
  ownerRecoveryPreviewExpired(() =>
    expect(() => suspendLocalWork({ ...request, config: wrongConfig })).toThrow('uncertain'),
  );
  expect(store.readHostStateSnapshot(identity).workVersion).toEqual(initial.workVersion);
});
test('issued readonly release: source drift does not block relinquishment or accept stale evidence', async () => {
  const { initial, request } = await unknownReadonlyFixture();
  await writeFile(path.join(root, 'src/task.ts'), 'changed accepted source');
  const released = suspendLocalWork(request);
  expect(released.work.lease).toBeNull();
  expect(released.work.binding).toEqual(initial.work.binding);
  expect(request.journal.state.items[0].observation).toBeNull();
  expect(request.journal.state.source_scope.digest).toBe(initial.work.binding.work_source_revision);
});

test('issued readonly release: later queued waiter survives owner relinquishment', async () => {
  const { initial, request } = await unknownReadonlyFixture();
  const seed = fixture('later');
  seed.nextWork.lease = null;
  const ticket = seed.nextLedger.tickets[0];
  ticket.status = 'queued';
  ticket.active_resources = [];
  ticket.blocked_resources = ['file:src/task.ts'];
  ticket.claim_ids = [];
  ticket.expires_at = null;
  seed.nextLedger.claims = [];
  includeExistingLedger(seed, initial.ledger);
  seed.expectedLedger = initial.ledgerVersion;
  const queued = store.compareAndSwapHostState(seed);
  const before = store.readHostStateSnapshot(identity);
  const released = suspendLocalWork({
    ...request,
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
  });
  expect(released.ledger.tickets.find((item) => item.work_id === 'later')).toEqual(
    queued.ledger.tickets.find((item) => item.work_id === 'later'),
  );
  expect(released.work.lease).toBeNull();
});
test('contour resources: explicitly claimed shared nonfile resource keeps joined handoff', () => {
  const firstSeed = fixture();
  firstSeed.nextWork.binding.allowed_resources.push('service:exclusive-report');
  for (const field of ['exclusive_resources', 'active_resources', 'contour_keys'])
    firstSeed.nextLedger.tickets[0][field].push('service:exclusive-report');
  firstSeed.nextLedger.claims[0].resources.push('service:exclusive-report');
  const first = store.compareAndSwapHostState(firstSeed);
  const seed = fixture('later', 'file:src/later.ts');
  seed.nextWork.lease = null;
  seed.nextWork.binding.allowed_resources.push('service:exclusive-report');
  const ticket = seed.nextLedger.tickets[0];
  ticket.status = 'queued';
  ticket.exclusive_resources.push('service:exclusive-report');
  ticket.active_resources = [];
  ticket.blocked_resources = [...ticket.exclusive_resources];
  ticket.contour_keys.push('service:exclusive-report');
  ticket.claim_ids = [];
  ticket.expires_at = null;
  seed.nextLedger.claims = [];
  includeExistingLedger(seed, first.ledger);
  seed.expectedLedger = first.ledgerVersion;
  store.compareAndSwapHostState(seed);
  const ready = next(store.readHostStateSnapshot(identity));
  ready.nextWork.lease = null;
  ready.nextLedger.tickets[0].status = 'ready_for_handoff';
  const saved = store.compareAndSwapHostState(ready);
  const freeze = next(saved);
  freeze.nextLedger.contours.push(frozenContour(freeze.nextLedger));
  freeze.nextLedger.open_generation++;
  expect(() => store.compareAndSwapHostState(freeze)).toThrow('frozen prior-generation contour');
});

test('lazy ownership: queued writer activates after owner release without changing FIFO history', async () => {
  const first = writerAcquire(store.compareAndSwapHostState((await writerFixture()).seed));
  const seed = (await writerFixture('second')).seed;
  includeExistingLedger(seed, first.ledger);
  seed.expectedLedger = first.ledgerVersion;
  const second = store.compareAndSwapHostState(seed);
  expect(() => writerAcquire(second)).toThrow('queued');
  const queued = store.readHostStateSnapshot({ ...identity, work_id: 'second' });
  const queuedTicket = queued.ledger.tickets.find(
    (ticket) => ticket.work_id === 'second' && ticket.status === 'queued',
  );
  const firstCurrent = store.readHostStateSnapshot(identity);
  suspendLocalWork(ownerRecoveryPreviewRequest(firstCurrent, quiescentJournal()));
  const current = store.readHostStateSnapshot({ ...identity, work_id: 'second' });
  const active = writerAcquire(current);
  const activated = active.ledger.tickets.find((ticket) => ticket.ticket_id === queuedTicket.ticket_id);
  expect(activated.sequence).toBe(queuedTicket.sequence);
  expect(activated.status).toBe('active');
  expect(activated.exclusive_resources).toEqual(queuedTicket.exclusive_resources);
});
test('lazy ownership: paused execution-only work resumes with execution rights and no file rights', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture(true);
  const suspended = suspendLocalWork(request);
  const fakeLedger = { resume: () => journal };
  const resumed = resumePausedLocalWork({
    store,
    ledger: fakeLedger,
    identity,
    attempt: 1,
    expectedWork: suspended.workVersion,
    expectedLedger: suspended.ledgerVersion,
    expectedJournal: journal.version,
    nativeSessionHandle: 'thread',
    configDigest: initial.work.binding.config_digest,
    sourceDigest: initial.work.binding.work_source_revision,
  });
  const host = store.readHostStateSnapshot(identity);
  expect(resumed.status).toBe('resumed');
  expect(host.ledger.claims.filter((claim) => claim.status === 'active')[0].resources).toEqual(['execution:work']);
  expect(
    Date.parse(host.ledger.tickets.find((ticket) => ticket.ticket_id === host.work.lease.ticket_id).expires_at),
  ).toBeGreaterThan(Date.now());
  expect(journal.state.items[0].observation).toBeNull();
});

test('issued readonly release: completed official-docs predecessor does not block pending no-egress owner', async () => {
  const config = clone(sourceLeaseConfig);
  config.agents.profiles.web = { mutation_scope: 'none', tools_policy: 'read_only', egress_policy: 'official_docs' };
  config.agents.egress_policies.official_docs = { allowed_hosts: ['learn.microsoft.com'] };
  config.workflows.bug_fix.stages.push({
    id: 'research_docs',
    assignments: [{ role: 'documentation-researcher', profile: 'web' }],
  });
  const { initial, journal, request } = await unknownReadonlyFixture(false, config);
  const prior = clone(journal.state.items[0]);
  prior.issue_id = 'actual-completed-docs-issue';
  prior.request.action_id = 'completed-docs-action';
  prior.request.stage_id = 'research_docs';
  prior.request.role = 'documentation-researcher';
  prior.observation = {
    schema: 'VidaSessionObservation/v1',
    action_id: prior.request.action_id,
    issue_id: prior.issue_id,
    agent_id: 'fixture-docs-researcher',
    tool_call_ref: 'fixture-docs-completion',
    status: 'reported_complete',
    summary: 'Observed docs research completion.',
    output_digest: 'a'.repeat(64),
    evidence_refs: ['fixture:completed-docs'],
  };
  journal.state.completed.push({ step_id: 'completed-docs', items: [prior] });
  journal.version = { revision: 2, digest: canonicalJsonDigest(journal.state) };
  database
    .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
    .run(2, canonicalJson(journal.state), journal.version.digest);
  const beforeRow = database.query('SELECT * FROM agent_host_mastra_session_ledger').get();
  const failed = clone(journal);
  failed.state.completed[0].items[0].observation.status = 'reported_failed';
  failed.version.digest = canonicalJsonDigest(failed.state);
  expect(() => suspendLocalWork({ ...request, journal: failed })).toThrow('uncertain');
  expect(store.readHostStateSnapshot(identity).workVersion).toEqual(initial.workVersion);
  ownerRecoveryPreviewExpired(() => {
    const released = suspendLocalWork({ ...request, journal });
    expect(released.work.lease).toBeNull();
    expect(journal.state.items[0].observation).toBeNull();
    expect(journal.state.completed[0].items[0]).toEqual(prior);
    expect(database.query('SELECT * FROM agent_host_mastra_session_ledger').get()).toEqual(beforeRow);
  });
});

test('expired recovery keeps runtime identity coupled across verified bundle changes without replaying research', () => {
  const seed = fixture();
  const digestA = 'a'.repeat(64),
    digestB = 'b'.repeat(64);
  seed.nextWork.binding.runtime_source_revision = digestA;
  seed.nextWork.binding.runtime_code_digest = digestA;
  seed.nextWork.lifecycle.config_binding.runtime_code_digest = digestA;
  const initial = store.compareAndSwapHostState(seed);
  database.exec(
    'CREATE TABLE agent_host_mastra_session_ledger(workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT)',
  );
  const journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: initial.work.execution.run_id,
    completed: [
      { step_id: 'research', items: [{ issue_id: 'observed-research', observation: { status: 'reported_complete' } }] },
    ],
    items: [{ issue_id: null, observation: null }],
  };
  const journalBytes = canonicalJson(journal),
    journalDigest = canonicalJsonDigest(journal);
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspace, identity.work_id, 1, 1, journalBytes, journalDigest);
  const now = Date.now;
  let recovered;
  try {
    Date.now = () => Date.parse(initial.ledger.tickets[0].expires_at) + 1;
    recovered = store.recoverExpiredLocalLease({
      identity,
      attempt: 1,
      nativeSessionHandle: 'thread',
      generation: 1,
      expectedWork: initial.workVersion,
      expectedLedger: initial.ledgerVersion,
      expectedJournal: { revision: 1, digest: journalDigest },
      expectedMaintenanceGeneration: initial.maintenanceGeneration,
      verifyCurrent: () => ({ runtimeCodeDigest: digestB, authorityPointer: 'user:verified-current-bundle' }),
    });
  } finally {
    Date.now = now;
  }
  expect(recovered.work.binding.runtime_source_revision).toBe(digestB);
  expect(recovered.work.binding.runtime_code_digest).toBe(digestB);
  expect(recovered.work.lifecycle.config_binding.runtime_code_digest).toBe(digestB);
  expect(recovered.work.execution.assignment_attempts).toEqual([]);
  expect(recovered.work.lease.ticket_id).not.toBe(initial.work.lease.ticket_id);
  expect(recovered.ledger.tickets[0].status).toBe('read_only');
  const stored = database.query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger').get();
  expect(stored.payload).toBe(journalBytes);
  expect(stored.digest).toBe(journalDigest);
  expect(stored.revision).toBe(2);
});
