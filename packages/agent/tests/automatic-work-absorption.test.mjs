import { test, expect } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import {
  HostStateStore,
  openHostStateDatabase,
  runConsumerMigrationState,
  inspectHostWorkspaceDatabase,
} from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork } from '../src/orchestration/local-work-admission.ts';
import { runWorkStateRepair } from '../bin/repair-work-state.mjs';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-absorption-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'absorption-repository')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Test fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Test fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    database = openHostStateDatabase(path.join(root, 'fixture.sqlite')),
    store = new HostStateStore(database, 'a'.repeat(64)),
    source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const selection = {
    team: 'default-development',
    kind: 'research',
    intent: 'information_research',
    project: 'sample',
    risk_flags: [],
    labels: [],
  };
  function prepare(id, pointer, thread = 'session') {
    mkdirSync(path.join(root, '.agent', 'work', id), { recursive: true });
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + id,
      work_id: id,
      source_revision: source.digest,
      ac_ids: ['AC-SHARED'],
      allowed_paths: ['AGENT.sidecar.md'],
      implementation_paths: ['AGENT.sidecar.md'],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Source mutation'],
      acceptance_trace: ['AC-SHARED'],
      behavior_trace: ['SR-SHARED'],
      test_trace: ['fixture'],
      diagnostic_trace: ['fixture'],
      attribution: { thread_id: thread, pointer },
      owner: 'fixture',
      created_at: new Date().toISOString(),
    };
    const acceptance = {
      schema: 'AcceptanceManifest/v1',
      id: 'acceptance-' + id,
      version: 1,
      ac_ids: scope.ac_ids,
      source: 'AGENT.sidecar.md',
      scope: scope.scope_id,
      source_revision: source.digest,
      contracts: [{ id: 'AC-SHARED', definition: 'Preserve unfinished scope', sr: 'SR-SHARED', evidence: ['fixture'] }],
    };
    const scopePath = `.agent/work/${id}/scope.json`,
      acceptancePath = `.agent/work/${id}/acceptance.json`;
    writeFileSync(path.join(root, scopePath), JSON.stringify(scope));
    writeFileSync(path.join(root, acceptancePath), JSON.stringify(acceptance));
    return {
      repositoryRoot: root,
      config,
      store,
      selection,
      context: { work_id: id, attempt: 1, scope_digest: source.digest },
      nativeSessionHandle: thread,
      workItem: {
        schema: 'WorkItem/v1',
        id,
        canonical_kind: 'research',
        intent: 'information_research',
        project_id: 'sample',
        title: 'Fixture ' + id,
        description: 'Unfinished acceptance',
        risk_flags: [],
        labels: [],
        provider: 'local',
        provider_type: 'Research',
      },
      scopePath,
      acceptancePath,
      runtimeCodePaths: ['vida-agent/bin/run.mjs'],
      route: 'R2',
      risk: 'low',
      changeKind: 'feature',
    };
  }
  function admit(input) {
    const admitted = admitLocalSessionWork(input);
    const journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: store.workspaceId,
      work_id: input.context.work_id,
      attempt: 1,
      run_id: admitted.host.work.execution.run_id,
      step_id: 'unissued-fixture-wave',
      items: [],
      completed: [],
    };
    database
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(store.workspaceId, input.context.work_id, 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
    return admitted;
  }
  return {
    root,
    config,
    database,
    store,
    prepare,
    admit,
    close() {
      database.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

test('workspace projection bounds individual rows and includes its shared ledger only once', () => {
  const f = fixture();
  try {
    for (let index = 0; index < 12; index++) f.admit(f.prepare('parallel-' + index, 'user:parallel'));
    const current = f.store.readWorkspaceSnapshot();
    expect(current.work).toHaveLength(12);
    expect(current.work.every((row) => !Object.hasOwn(row, 'ledger') && !Object.hasOwn(row, 'ledgerVersion'))).toBe(
      true,
    );
    for (const row of current.work) expect(row.workVersion.digest).toBe(canonicalJsonDigest(row.work));
    expect(current.ledger_version.digest).toBe(canonicalJsonDigest(current.ledger));
    const inspected = inspectHostWorkspaceDatabase(path.join(f.root, 'fixture.sqlite'), f.store.workspaceId);
    expect(inspected.work).toHaveLength(12);
    expect(inspected.ledger_version).toEqual(current.ledger_version);
  } finally {
    f.close();
  }
});

test('public admission preserves same-request parallel contours and atomically absorbs old same-session requests', () => {
  const f = fixture();
  try {
    const first = f.prepare('first', 'user:one'),
      parallel = f.prepare('parallel', 'user:one');
    f.admit(first);
    f.admit(parallel);
    const before = f.store.readWorkspaceSnapshot();
    expect(before.work.every((entry) => entry.work.execution.status === 'active')).toBe(true);
    const successor = f.prepare('next', 'user:two');
    const admitted = admitLocalSessionWork(successor);
    expect(admitted.host.work.request_transition.predecessor_work_ids).toEqual(['first', 'parallel']);
    const after = f.store.readWorkspaceSnapshot();
    expect(after.work.filter((entry) => entry.work.execution.status === 'suspended')).toHaveLength(2);
    expect(after.ledger.claims.filter((claim) => claim.status === 'active')).toHaveLength(1);
    expect(admitLocalSessionWork(successor).host).toEqual(admitted.host);
    successor.workItem = { ...successor.workItem, title: 'Changed retry' };
    expect(() => admitLocalSessionWork(successor)).toThrow(/retry differs/);
  } finally {
    f.close();
  }
});

test('expired real execution-only admission rebinds only its owned execution resource', () => {
  const f = fixture();
  try {
    const initial = f.admit(f.prepare('old', 'user:old'));
    const historical = JSON.parse(
      f.database.query('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?').get('old').payload,
    );
    historical.completed = [
      {
        step_id: 'fixture-accepted-readonly',
        items: [{ issue_id: randomUUID(), observation: { status: 'reported_complete' } }],
      },
    ];
    historical.items = [{ issue_id: null, observation: null }];
    f.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=2,payload=?,digest=? WHERE work_id=?')
      .run(canonicalJson(historical), canonicalJsonDigest(historical), 'old');
    const work = initial.host.work,
      journal = f.store.readWorkSessionJournal({
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: 'old',
      });
    const originalClock = Date.now;
    try {
      Date.now = () =>
        Date.parse(initial.host.ledger.tickets.find((ticket) => ticket.ticket_id === work.lease.ticket_id).expires_at) +
        1;
      const recovered = f.store.recoverExpiredLocalLease({
        identity: {
          repository_id: work.binding.repository_id,
          project_ids: work.binding.project_ids,
          integrations_digest: work.binding.integrations_digest,
          work_id: 'old',
        },
        attempt: 1,
        nativeSessionHandle: 'session',
        generation: work.lease.generation,
        expectedWork: initial.host.workVersion,
        expectedLedger: initial.host.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: initial.host.maintenanceGeneration,
        verifyCurrent() {
          return { runtimeCodeDigest: work.binding.runtime_code_digest, authorityPointer: 'fixture:current-package' };
        },
      });
      expect(recovered.ledger.rebinds.at(-1).resources).toEqual(['execution:old']);
      expect(recovered.ledger.claims.filter((claim) => claim.status === 'active')[0].resources).toEqual([
        'execution:old',
      ]);
      expect(recovered.work.binding.allowed_resources).toEqual(work.binding.allowed_resources);
    } finally {
      Date.now = originalClock;
    }
  } finally {
    f.close();
  }
});

test('known failed source report persists while its host effect remains uncertain and fenced', () => {
  const f = fixture();
  try {
    const initial = f.admit(f.prepare('old', 'user:old')),
      work = initial.host.work;
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: 'old',
    };
    const claimed = f.store.claimWorkflowAttempt({
      identity,
      expectedWork: initial.host.workVersion,
      expectedLedger: initial.host.ledgerVersion,
      stageId: 'fixture-source-action',
      assignmentIndex: 0,
      requestDigest: '1'.repeat(64),
      lease: work.lease,
    });
    f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run('old');
    const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
    const request = {
      schema: 'VidaSessionRequest/v1',
      run_id: work.execution.run_id,
      workflow_id: work.binding.workflow_id,
      wave_index: 0,
      action_id: '2'.repeat(64),
      assignment_index: 0,
      stage_id: 'fixture-source-action',
      role: 'fixture-writer',
      config_digest: work.binding.config_digest,
      scope_digest: work.binding.work_source_revision,
      bindings_manifest_ref: '3'.repeat(64),
    };
    const reservation = {
      schema: 'WorkflowSessionReservation/v1',
      receipt: claimed,
      request: { workItemId: 'old', stageId: request.stage_id, assignmentIndex: 0 },
    };
    let journal = ledger.sync('old', 1, work.execution.run_id, 'fixture-writer-wave', [request], initial.source);
    journal = ledger.issueWave('old', 1, journal.version, { [request.action_id]: reservation });
    f.store.markWorkflowAttemptUncertain(claimed);
    const before = f.store.readHostStateSnapshot(identity);
    const summary = 'Observed writer failure; filesystem outcome remains uncertain';
    const failed = {
      schema: 'VidaSessionObservation/v1',
      action_id: request.action_id,
      issue_id: journal.state.items[0].issue_id,
      host_attempt_id: claimed.attempt.attempt_id,
      agent_id: 'fixture-writer',
      tool_call_ref: 'fixture-failed-source-call',
      status: 'reported_failed',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: ['fixture:observed-failure'],
    };
    const recorded = ledger.report('old', 1, journal.version, failed, null);
    expect(recorded.state.items[0].observation).toEqual(failed);
    expect(recorded.resume_status).toBe('blocked');
    expect(recorded.state.source_scope).toEqual(initial.source);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(before.work.execution.assignment_attempts[0].status).toBe('uncertain');
    expect(before.work.lease).toEqual(work.lease);
    expect(ledger.report('old', 1, journal.version, failed, null)).toEqual(recorded);
  } finally {
    f.close();
  }
});

test('public admission rejects drifted predecessor attribution without any effects and preserves foreign sessions', () => {
  const f = fixture();
  try {
    const foreign = f.prepare('foreign', 'user:foreign', 'another-session');
    f.admit(foreign);
    const old = f.prepare('old', 'user:old');
    f.admit(old);
    const foreignBefore = f.store
      .readWorkspaceSnapshot()
      .work.find((entry) => entry.work.binding.lifecycle_work_id === 'foreign').work;
    const previous = f.store.readWorkspaceSnapshot();
    const bytes = readFileSync(path.join(f.root, old.scopePath));
    writeFileSync(path.join(f.root, old.scopePath), Buffer.concat([bytes, Buffer.from('\n')]));
    const next = f.prepare('next', 'user:next');
    expect(() => admitLocalSessionWork(next)).toThrow(/scope artifact changed/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(previous);
    writeFileSync(path.join(f.root, old.scopePath), bytes);
    const admitted = admitLocalSessionWork(next);
    expect(admitted.host.work.request_transition.predecessor_work_ids).toEqual(['old']);
    expect(
      f.store.readWorkspaceSnapshot().work.find((entry) => entry.work.binding.lifecycle_work_id === 'foreign').work,
    ).toEqual(foreignBefore);
  } finally {
    f.close();
  }
});

test('work-state inspection CLI refuses missing canonical SQLite without creating it', () => {
  const f = fixture();
  try {
    expect(() => runWorkStateRepair(['--kind', 'work-state', '--mode', 'inspect', '--project-root', f.root])).toThrow(
      /unavailable/,
    );
  } finally {
    f.close();
  }
});

test('valid public intake records the admission cutoff before failed scope preparation', async () => {
  const f = fixture();
  try {
    const verifier = {
      principal: 'fixture:consumer-maintenance',
      projectIds: ['sample'],
      verify(fence) {
        return {
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: this.principal,
          fence_digest: canonicalJsonDigest(fence),
          closure_digest: fence.binding.closure_digest,
          bundle_digest: fence.binding.bundle_digest,
        };
      },
    };
    const migration = new HostStateStore(f.database, f.store.workspaceId, undefined, undefined, undefined, verifier);
    const binding = {
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: ['sample'],
      operation_id: 'fixture-migration',
      manifest_digest: '1'.repeat(64),
      request_digest: '2'.repeat(64),
      bindings_digest: '3'.repeat(64),
      closure_digest: '4'.repeat(64),
      bundle_digest: '5'.repeat(64),
    };
    const baseline = migration.acquireMaintenanceFence(binding);
    migration.consumerMigrationState(baseline, 'baseline', () => undefined);
    await migration.releaseMaintenanceFence(baseline);
    expect(() => admitLocalSessionWork(f.prepare('failed-preparation', ''))).toThrow(/schema is invalid/);
    expect(f.store.readWorkspaceSnapshot().work).toHaveLength(0);
    expect(f.database.query('SELECT work_id,attempt FROM agent_host_admission_attempt').all()).toEqual([
      { work_id: 'failed-preparation', attempt: 1 },
    ]);
    const restore = migration.acquireMaintenanceFence(binding);
    let called = false;
    expect(() =>
      migration.consumerMigrationState(restore, 'restore', () => {
        called = true;
      }),
    ).toThrow(/new admission/);
    expect(called).toBe(false);
  } finally {
    f.close();
  }
});

test('public consumer wrapper checks the separate Mastra store and recovers the same fenced operation', async () => {
  const f = fixture();
  try {
    const workflowPath = path.join(f.root, f.config.control.work_root, 'mastra-workflows.v1.sqlite');
    mkdirSync(path.dirname(workflowPath), { recursive: true });
    const workflow = openHostStateDatabase(workflowPath);
    workflow.exec('CREATE TABLE mastra_workflow_snapshot(snapshot TEXT)');
    workflow.query('INSERT INTO mastra_workflow_snapshot VALUES(?)').run(JSON.stringify({ status: 'running' }));
    workflow.close();
    const input = {
      repositoryRoot: f.root,
      operationId: 'public-consumer-fixture',
      actor: 'fixture:consumer',
      mode: 'baseline',
    };
    let called = false;
    await expect(
      runConsumerMigrationState(input, () => {
        called = true;
      }),
    ).rejects.toThrow(/unknown or inflight/);
    expect(called).toBe(false);
    const settled = openHostStateDatabase(workflowPath);
    settled.query('UPDATE mastra_workflow_snapshot SET snapshot=?').run(JSON.stringify({ status: 'suspended' }));
    settled.close();
    let databasePath, backup;
    const result = await runConsumerMigrationState(input, (bindings) => {
      databasePath = bindings.database_path;
      backup = bindings.backup;
      expect(bindings.workflow_database_path).toBe(workflowPath);
      return 'baseline-files';
    });
    expect(result.status).toBe('baseline');
    expect(Buffer.from(backup).subarray(0, 16).toString()).toBe('SQLite format 3\u0000');
    expect(databasePath).toBe(path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite'));
    await runConsumerMigrationState(input, (bindings) => {
      expect(bindings.backup).toBeNull();
      return 'retry-files';
    });
    const consumerFile = path.join(f.root, 'consumer-init-output.txt');
    writeFileSync(consumerFile, 'known init failure');
    await expect(
      runConsumerMigrationState({ ...input, mode: 'restore' }, () => {
        writeFileSync(consumerFile, 'original consumer bytes');
        throw Error('fixture interruption after file restore');
      }),
    ).rejects.toThrow(/fixture interruption/);
    const restored = await runConsumerMigrationState({ ...input, mode: 'restore' }, () => {
      expect(readFileSync(consumerFile, 'utf8')).toBe('original consumer bytes');
      return 'recovered-files';
    });
    expect(restored.status).toBe('restored');
    const corrupt = openHostStateDatabase(databasePath);
    corrupt.exec('DROP TABLE agent_host_admission_attempt');
    const schemaBefore = corrupt.query('SELECT name,sql FROM sqlite_master ORDER BY name').all();
    corrupt.close();
    const bytesBefore = readFileSync(databasePath);
    let unexpectedCallback = false;
    await expect(
      runConsumerMigrationState({ ...input, mode: 'restore' }, () => {
        unexpectedCallback = true;
      }),
    ).rejects.toThrow(/admission metadata missing/);
    expect(unexpectedCallback).toBe(false);
    expect(() =>
      inspectHostWorkspaceDatabase(databasePath, deriveWorkspaceId(f.config.repository.repository_id, f.root)),
    ).toThrow(/admission metadata missing/);
    expect(readFileSync(databasePath)).toEqual(bytesBefore);
    const unchanged = openHostStateDatabase(databasePath);
    expect(unchanged.query('SELECT name,sql FROM sqlite_master ORDER BY name').all()).toEqual(schemaBefore);
    unchanged.close();
  } finally {
    f.close();
  }
});

test('second predecessor verification failure leaves every canonical row and raw journal unchanged', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('one', 'user:old'));
    f.admit(f.prepare('two', 'user:old'));
    const before = f.store.readWorkspaceSnapshot();
    const journals = f.database.query('SELECT * FROM agent_host_mastra_session_ledger ORDER BY work_id').all();
    const admit = f.store.admitSuccessorWork.bind(f.store);
    let verified = 0;
    f.store.admitSuccessorWork = (input) =>
      admit({
        ...input,
        verifyCurrent(work, journal, pointer) {
          input.verifyCurrent(work, journal, pointer);
          if (++verified === 2) throw new Error('injected second predecessor verification fault');
        },
      });
    expect(() => admitLocalSessionWork(f.prepare('next', 'user:next'))).toThrow(/second predecessor/);
    expect(verified).toBe(2);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    expect(f.database.query('SELECT * FROM agent_host_mastra_session_ledger ORDER BY work_id').all()).toEqual(journals);
  } finally {
    f.close();
  }
});

test('competing successor requests prepared against identical versions permit only one commit', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('one', 'user:old'));
    f.admit(f.prepare('two', 'user:old'));
    const admit = f.store.admitSuccessorWork.bind(f.store);
    const proposals = [];
    f.store.admitSuccessorWork = (input) => {
      proposals.push(input);
      throw new Error('freeze proposal before transaction');
    };
    expect(() => admitLocalSessionWork(f.prepare('winner', 'user:new-one'))).toThrow(/freeze proposal/);
    expect(() => admitLocalSessionWork(f.prepare('loser', 'user:new-two'))).toThrow(/freeze proposal/);
    expect(proposals[0].expectedLedger).toEqual(proposals[1].expectedLedger);
    expect(proposals[0].predecessors).toEqual(proposals[1].predecessors);
    const result = admit(proposals[0]);
    const committed = f.store.readWorkspaceSnapshot();
    expect(() => admit(proposals[1])).toThrow(/compare-and-swap conflict/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(committed);
    expect(admit(proposals[0])).toEqual(result);
    expect(committed.work.filter((row) => row.work.execution.status === 'active')).toHaveLength(1);
  } finally {
    f.close();
  }
});

test('two-predecessor SQL commit fault rolls back all work and coordination rows and preserves raw journals', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('one', 'user:first'));
    f.admit(f.prepare('two', 'user:first'));
    const before = f.store.readWorkspaceSnapshot();
    const journalBytes = f.database
      .query('SELECT payload FROM agent_host_mastra_session_ledger ORDER BY work_id')
      .all();
    const next = f.prepare('next', 'user:second');
    f.database.exec(
      "CREATE TRIGGER fixture_commit_fault BEFORE UPDATE ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT,'fixture SQL commit fault'); END",
    );
    expect(() => admitLocalSessionWork(next)).toThrow(/fixture SQL commit fault/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    expect(f.database.query('SELECT payload FROM agent_host_mastra_session_ledger ORDER BY work_id').all()).toEqual(
      journalBytes,
    );
    f.database.exec('DROP TRIGGER fixture_commit_fault');
    const admitted = admitLocalSessionWork(next);
    expect(admitted.host.work.request_transition.predecessor_work_ids).toEqual(['one', 'two']);
  } finally {
    f.close();
  }
});

test('invalid new request attribution and successor source drift fail before predecessor effects', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('old', 'user:old'));
    const next = f.prepare('next', '');
    const before = f.store.readWorkspaceSnapshot();
    expect(() => admitLocalSessionWork(next)).toThrow(/schema is invalid/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    const wrong = f.prepare('wrong', 'user:next', 'another-session');
    wrong.nativeSessionHandle = 'session';
    expect(() => admitLocalSessionWork(wrong)).toThrow(/session binding differs/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    const drift = f.prepare('drift', 'user:next');
    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Changed declared source');
    expect(() => admitLocalSessionWork(drift)).toThrow(/revision is stale/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
  } finally {
    f.close();
  }
});

test('successful normalized readonly research is retained as historical provenance on absorption', () => {
  const f = fixture();
  try {
    const old = f.prepare('old', 'user:old'),
      admitted = f.admit(old),
      work = admitted.host.work;
    const stage = f.config.workflows[work.binding.workflow_id].stages.find((stage) => stage.kind === 'research');
    const timestamp = new Date().toISOString(),
      question = 'What evidence remains unfinished?';
    const body = {
      schema: 'ResearchResult/v1',
      result_id: 'old-research',
      work_item_id: 'old',
      source_revision: work.binding.work_source_revision,
      scope_id: work.binding.scope_id,
      contour: work.binding.scope_id,
      topic: 'Fixture provenance',
      objective: 'Preserve source evidence',
      question,
      source_refs: [
        {
          source_id: 'source',
          source_kind: 'internal',
          locator: 'AGENT.sidecar.md',
          title: 'Fixture source',
          version_or_date: '2026-10-01',
          claim: 'AC-SHARED SR-SHARED evidence',
          retrieved_at: timestamp,
          independence_group: 'fixture-source',
          digest: 'd'.repeat(64),
        },
      ],
      findings: [
        {
          finding_id: 'finding',
          statement: 'Unfinished fixture evidence',
          source_ids: ['source'],
          evidence_class: 'Static',
          status: 'confirmed',
        },
      ],
      uncertainties: [],
      conflicts: [],
      evidence_classes: ['Static'],
      br_ids: ['BR-SHARED'],
      sr_ids: ['SR-SHARED'],
      ac_ids: ['AC-SHARED'],
      gap_ids: [],
      options: [
        {
          option_id: 'continue',
          label: 'Continue',
          description: 'Carry unfinished evidence',
          evidence_refs: ['source'],
        },
      ],
      recommendation: { option_id: 'continue', rationale: 'Current evidence', evidence_refs: ['source'] },
      completeness: {
        status: 'pass',
        required_questions: [question],
        answered_questions: [question],
        missing_questions: [],
        material_gaps: [],
        external_validation: {
          required: false,
          source_count: 0,
          minimum_sources: 0,
          status: 'not_required',
          live_check: null,
        },
      },
      readiness: 'ready',
      instruction_activation: {
        use_id: 'use-fixture',
        risk: 'medium',
        phase: 'trace',
        lane: 'researcher',
        trigger: 'research_intent',
        required_instruction_ids: [],
        instruction_ids: ['research-protocol'],
        registry_digest: 'b'.repeat(64),
        source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'c'.repeat(64) }],
      },
      actor: 'fixture-setup',
      pointer: 'TEST-SETUP',
      created_at: timestamp,
      updated_at: timestamp,
    };
    const result = { ...body, digest: canonicalJsonDigest(body) },
      bytes = Buffer.from(JSON.stringify(result));
    const recordPath = '.agent/work/old/old-research.research.json';
    writeFileSync(path.join(f.root, recordPath), bytes);
    const actionId = '7'.repeat(64),
      issueId = randomUUID();
    const observation = {
      schema: 'VidaSessionObservation/v1',
      action_id: actionId,
      issue_id: issueId,
      agent_id: 'fixture',
      tool_call_ref: 'fixture-readonly',
      status: 'reported_complete',
      summary: 'Completed fixture research',
      output_digest: canonicalJsonDigest('Completed fixture research'),
      evidence_refs: ['fixture:source'],
    };
    const binding = {
      work_id: 'old',
      attempt: 1,
      run_id: work.execution.run_id,
      action_id: actionId,
      issue_id: issueId,
      scope_id: work.binding.scope_id,
      scope_digest: work.binding.work_source_revision,
      source_revision: work.binding.work_source_revision,
      source_scope_digest: work.binding.work_source_revision,
      config_digest: work.binding.config_digest,
      maintenance_generation: admitted.host.maintenanceGeneration,
      lease_ticket_id: work.lease.ticket_id,
      lease_thread_id: work.lease.thread_id,
      lease_generation: work.lease.generation,
    };
    const planBody = {
      schema: 'ObservedResearchRecordPlan/v1',
      binding,
      observation_digest: canonicalJsonDigest(observation),
      result_digest: result.digest,
      record_path: recordPath,
      record_pre_sha256: null,
      record_sha256: createHash('sha256').update(bytes).digest('hex'),
      changelog_path: '.agent/work/old/research.changelog.jsonl',
      changelog_pre_sha256: null,
      changelog_sha256: 'a'.repeat(64),
      before_digest: null,
    };
    const plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    const nextWork = {
      ...work,
      revision: work.revision + 1,
      lifecycle: { ...work.lifecycle, revision: work.lifecycle.revision + 1 },
      artifacts: [
        {
          artifact_id: 'fixture-research',
          schema: 'ResearchResult/v1',
          path: recordPath,
          sha256: plan.record_sha256,
          stage_id: stage.id,
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          ac_ids: work.binding.ac_ids,
        },
      ],
    };
    f.store.compareAndSwapHostState({
      expectedWork: admitted.host.workVersion,
      expectedLedger: admitted.host.ledgerVersion,
      nextWork,
      nextLedger: { ...admitted.host.ledger, revision: admitted.host.ledger.revision + 1 },
    });
    const journal = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: f.store.workspaceId,
      work_id: 'old',
      attempt: 1,
      run_id: work.execution.run_id,
      step_id: 'unissued-next-wave',
      items: [],
      completed: [
        {
          step_id: 'observed-research',
          items: [
            {
              request: { stage_id: stage.id, assignment_index: 0, role: stage.assignments[0].role },
              issue_id: issueId,
              observation,
              research_normalization: plan,
            },
          ],
        },
      ],
    };
    f.database
      .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=?')
      .run(canonicalJson(journal), canonicalJsonDigest(journal), 'old');
    const before = f.store.readWorkspaceSnapshot().work[0].work;
    const successor = admitLocalSessionWork(f.prepare('next', 'user:next'));
    expect(successor.host.work.request_transition.predecessor_work_ids).toEqual(['old']);
    const prior = f.store
      .readWorkspaceSnapshot()
      .work.find((entry) => entry.work.binding.lifecycle_work_id === 'old').work;
    expect(prior.artifacts).toEqual(before.artifacts);
    expect(prior.lifecycle.assurance).toEqual(before.lifecycle.assurance);
    expect(readFileSync(path.join(f.root, recordPath))).toEqual(bytes);
    expect(
      JSON.parse(
        f.database.query('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?').get('old').payload,
      ),
    ).toEqual(journal);
  } finally {
    f.close();
  }
});
