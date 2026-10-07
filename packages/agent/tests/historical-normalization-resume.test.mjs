import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'vitest';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { resumeHistoricalObservedResearchResult } from '../src/research-decision.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { createHistoricalResearchFixture } from './helpers/historical-research-fixture.mjs';

function input(f, host, overrides = {}) {
  return {
    root: f.root,
    feature: f.feature,
    result: f.result,
    observation: f.observation,
    binding: f.binding,
    activation_use: f.activationUse,
    activation_plan: f.activationPlan,
    plan: f.plan,
    host_state: host.store,
    identity: host.identity,
    attempt: 1,
    expectedWork: host.state.workVersion,
    expectedLedger: host.state.ledgerVersion,
    expectedJournal: host.journalVersion,
    expectedMaintenanceGeneration: host.state.maintenanceGeneration,
    ...overrides,
  };
}

function createHostMutationFixture(f) {
  const identity = {
    repository_id: 'synthetic-repository',
    project_ids: ['synthetic-project'],
    integrations_digest: 'e'.repeat(64),
    work_id: f.binding.work_id,
  };
  const workspaceId = deriveWorkspaceId(identity.repository_id, f.root);
  const databasePath = path.join(f.root, '.tmp', 'host-state.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = openHostStateDatabase(databasePath);
  const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, f.root);
  const binding = {
    repository_id: identity.repository_id,
    project_ids: [...identity.project_ids],
    integrations_digest: identity.integrations_digest,
    team_id: 'synthetic-team',
    workflow_id: 'bug_fix',
    provider_work_item_id: 'external-' + identity.work_id,
    lifecycle_work_id: identity.work_id,
    work_item_digest: 'b'.repeat(64),
    work_source_revision: f.binding.source_revision,
    scope_id: f.binding.scope_id,
    scope_contract_digest: 'c'.repeat(64),
    acceptance_manifest_digest: 'd'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: ['docs/research.md'],
    allowed_resources: ['file:docs/research.md'],
    config_digest: f.binding.config_digest,
    runtime_source_revision: 'synthetic-runtime',
    schema_digest: 'f'.repeat(64),
    runtime_code_digest: '0'.repeat(64),
  };
  const expiresAt = new Date(Date.now() + 60 * 60_000).toISOString();
  const claim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-' + identity.work_id,
    ticket_id: f.binding.lease_ticket_id,
    work_id: identity.work_id,
    thread_id: f.binding.lease_thread_id,
    generation: f.binding.lease_generation,
    resources: ['file:docs/research.md'],
    lease_expires_at: expiresAt,
    status: 'active',
    created_at: new Date().toISOString(),
    renewed_at: new Date().toISOString(),
  };
  const ticket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: f.binding.lease_ticket_id,
    repository_id: identity.repository_id,
    project_ids: [...identity.project_ids],
    integrations_digest: identity.integrations_digest,
    work_id: identity.work_id,
    thread_id: f.binding.lease_thread_id,
    source_revision: f.binding.source_revision,
    generation: f.binding.lease_generation,
    sequence: 1,
    contour_keys: ['project:synthetic'],
    exclusive_resources: ['file:docs/research.md'],
    status: 'active',
    claim_ids: [claim.claim_id],
    expires_at: expiresAt,
    active_resources: ['file:docs/research.md'],
    blocked_resources: [],
    created_at: new Date().toISOString(),
  };
  const work = {
    schema: 'WorkState/v1',
    workspace_id: workspaceId,
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
      run_id: 'run-' + identity.work_id,
      input_digest: '1'.repeat(64),
      phase: 'implementation',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: binding.work_source_revision,
      next_action: 'Trace the accepted work request.',
      route: 'R1',
      risk: 'medium',
      change_kind: 'feature',
      config_binding: {
        config_digest: binding.config_digest,
        schema_digest: binding.schema_digest,
        runtime_code_digest: binding.runtime_code_digest,
      },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: ['docs/research.md'],
        fingerprint_paths: ['docs/research.md'],
        implementation_paths: ['docs/research.md'],
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
    },
    artifacts: [],
  };
  const ledger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: workspaceId,
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
  };
  const state = store.compareAndSwapHostState({
    expectedWork: null,
    expectedLedger: null,
    nextWork: work,
    nextLedger: ledger,
  });
  const journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspaceId,
    work_id: identity.work_id,
    attempt: 1,
    run_id: 'run-' + identity.work_id,
    step_id: null,
    items: [],
    completed: [],
  };
  database.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const journalDigest = canonicalJsonDigest(journal);
  database
    .query('INSERT INTO agent_host_mastra_session_ledger VALUES (?,?,?,?,?,?)')
    .run(workspaceId, identity.work_id, 1, 1, canonicalJson(journal), journalDigest);
  return {
    identity,
    store,
    database,
    state,
    journalVersion: { revision: 1, digest: journalDigest },
    close: () => database.close(),
  };
}

test('same Host connection rejects a reentrant writer until the historical mutation releases', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  let enterAction;
  const entered = new Promise((resolve) => (enterAction = resolve));
  let releaseAction;
  const actionGate = new Promise((resolve) => (releaseAction = resolve));
  try {
    const publication = host.store.withHistoricalNormalizationMutation({
      repositoryRoot: f.root,
      identity: host.identity,
      attempt: 1,
      expectedWork: host.state.workVersion,
      expectedLedger: host.state.ledgerVersion,
      expectedJournal: host.journalVersion,
      expectedMaintenanceGeneration: host.state.maintenanceGeneration,
      action: async () => {
        enterAction();
        await actionGate;
      },
      rollback: () => undefined,
    });
    await entered;
    assert.throws(
      () => host.store.recordAdmissionAttempt('blocked-during-historical-publication', 1, { fixture: true }),
      /nested admission attempt transaction forbidden|reserved by a historical normalization mutation/,
    );
    assert.equal(host.database.query('SELECT COUNT(*) AS count FROM agent_host_admission_attempt').get().count, 0);
    releaseAction();
    await publication;
    host.store.recordAdmissionAttempt('after-historical-publication', 1, { fixture: true });
    assert.equal(host.database.query('SELECT COUNT(*) AS count FROM agent_host_admission_attempt').get().count, 1);
  } finally {
    releaseAction?.();
    host.close();
    f.dispose();
  }
});

function removePublication(f) {
  for (const relative of [f.recordPath, f.changelogPath]) {
    const target = path.join(f.root, ...relative.split('/'));
    if (existsSync(target)) rmSync(target);
  }
}

function pathFor(f, relative) {
  const target = path.join(f.root, ...relative.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  return target;
}

test('historical normalization publishes and exactly replays the reserved pair', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  try {
    removePublication(f);
    const published = await resumeHistoricalObservedResearchResult(input(f, host));
    assert.equal(published.recordSha256, f.plan.record_sha256);
    assert.equal(published.replay, false);
    assert.equal(readFileSync(pathFor(f, f.recordPath), 'utf8'), f.recordBytes);
    assert.equal(readFileSync(pathFor(f, f.changelogPath), 'utf8'), f.changelogBytes);
    const replay = await resumeHistoricalObservedResearchResult(input(f, host));
    assert.equal(replay.replay, true);
    assert.equal(replay.changelogSha256, published.changelogSha256);
  } finally {
    host.close();
    f.dispose();
  }
});

test('historical normalization resumes an exact record-first partial publication', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  try {
    removePublication(f);
    writeFileSync(pathFor(f, f.recordPath), f.recordBytes);
    const resumed = await resumeHistoricalObservedResearchResult(input(f, host));
    assert.equal(resumed.replay, false);
    assert.equal(readFileSync(pathFor(f, f.changelogPath), 'utf8'), f.changelogBytes);
    assert.equal(readFileSync(pathFor(f, f.recordPath), 'utf8'), f.recordBytes);
  } finally {
    host.close();
    f.dispose();
  }
});

test('historical normalization restores the exact record and changelog pair after a publication fault', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  const originalMutation = host.store.withHistoricalNormalizationMutation.bind(host.store);
  try {
    removePublication(f);
    host.store.withHistoricalNormalizationMutation = (mutation) =>
      originalMutation({
        ...mutation,
        action: async () => {
          await mutation.action();
          throw new Error('injected failure after both files were published');
        },
      });
    await assert.rejects(
      () => resumeHistoricalObservedResearchResult(input(f, host)),
      /injected failure after both files were published/,
    );
    assert.equal(readFileSync(pathFor(f, f.recordPath), 'utf8'), f.recordBytes);
    assert.equal(readFileSync(pathFor(f, f.changelogPath), 'utf8'), f.changelogBytes);
    delete host.store.withHistoricalNormalizationMutation;
    const resumed = await resumeHistoricalObservedResearchResult(input(f, host));
    assert.equal(resumed.replay, true);
  } finally {
    delete host.store.withHistoricalNormalizationMutation;
    host.close();
    f.dispose();
  }
});

test('historical normalization rejects invalid UTF-8 changelog bytes without rewriting them', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  const invalidBytes = Buffer.from([0xff, 0xfe, 0x7b]);
  try {
    removePublication(f);
    writeFileSync(pathFor(f, f.changelogPath), invalidBytes);
    await assert.rejects(() => resumeHistoricalObservedResearchResult(input(f, host)), /exact UTF-8/);
    assert.deepEqual(readFileSync(pathFor(f, f.changelogPath)), invalidBytes);
    assert.equal(existsSync(pathFor(f, f.recordPath)), false);
  } finally {
    host.close();
    f.dispose();
  }
});

test('historical normalization denies an existing-record and absent-changelog preimage before effects', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  try {
    removePublication(f);
    const mixedPlan = structuredClone(f.plan);
    mixedPlan.record_pre_sha256 = '1'.repeat(64);
    mixedPlan.before_digest = '2'.repeat(64);
    delete mixedPlan.digest;
    mixedPlan.digest = canonicalJsonDigest(mixedPlan);
    const before = host.store.readHostStateSnapshot(host.identity);
    await assert.rejects(
      () => resumeHistoricalObservedResearchResult(input(f, host, { plan: mixedPlan })),
      /existing-record publication without a changelog beforeimage is unsupported/,
    );
    assert.equal(existsSync(pathFor(f, f.recordPath)), false);
    assert.equal(existsSync(pathFor(f, f.changelogPath)), false);
    const after = host.store.readHostStateSnapshot(host.identity);
    assert.deepEqual(after.workVersion, before.workVersion);
    assert.deepEqual(after.ledgerVersion, before.ledgerVersion);
  } finally {
    host.close();
    f.dispose();
  }
});

test('historical normalization keeps its original scope binding when current source code has changed', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  try {
    removePublication(f);
    const changedCurrentCode = pathFor(f, 'packages/agent/bin/scope.mjs');
    writeFileSync(changedCurrentCode, 'Current code changed after the original reservation.\n');
    const result = await resumeHistoricalObservedResearchResult(input(f, host));
    assert.equal(result.recordSha256, f.plan.record_sha256);
    assert.equal(f.plan.binding.source_scope_digest, f.binding.source_scope_digest);
    assert.equal(readFileSync(changedCurrentCode, 'utf8'), 'Current code changed after the original reservation.\n');
  } finally {
    host.close();
    f.dispose();
  }
});

test('historical normalization preserves foreign bytes and denies stale, foreign and event-only state', async () => {
  const f = createHistoricalResearchFixture();
  const host = createHostMutationFixture(f);
  try {
    removePublication(f);
    const record = pathFor(f, f.recordPath);
    writeFileSync(record, '{"foreign":true}\n');
    await assert.rejects(() => resumeHistoricalObservedResearchResult(input(f, host)));
    assert.equal(readFileSync(record, 'utf8'), '{"foreign":true}\n');

    rmSync(record);
    await assert.rejects(() =>
      resumeHistoricalObservedResearchResult(input(f, host, { binding: { ...f.binding, scope_id: 'foreign-scope' } })),
    );

    writeFileSync(record, f.recordBytes);
    const stalePlan = { ...f.plan, record_pre_sha256: '0'.repeat(64) };
    delete stalePlan.digest;
    stalePlan.digest = f.plan.digest;
    await assert.rejects(() => resumeHistoricalObservedResearchResult(input(f, host, { plan: stalePlan })));

    const changedScopePlan = structuredClone(f.plan);
    changedScopePlan.binding.source_scope_digest = 'c'.repeat(64);
    delete changedScopePlan.digest;
    changedScopePlan.digest = canonicalJsonDigest(changedScopePlan);
    await assert.rejects(() => resumeHistoricalObservedResearchResult(input(f, host, { plan: changedScopePlan })));
    await assert.rejects(() =>
      resumeHistoricalObservedResearchResult(input(f, host, { result: { ...f.result, topic: 'tampered result' } })),
    );

    rmSync(record);
    writeFileSync(pathFor(f, f.changelogPath), f.changelogBytes);
    const eventOnly = readFileSync(pathFor(f, f.changelogPath), 'utf8');
    await assert.rejects(() => resumeHistoricalObservedResearchResult(input(f, host)));
    assert.equal(readFileSync(pathFor(f, f.changelogPath), 'utf8'), eventOnly);
  } finally {
    host.close();
    f.dispose();
  }
});
