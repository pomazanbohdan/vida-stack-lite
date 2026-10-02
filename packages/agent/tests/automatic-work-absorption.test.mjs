import { test, expect } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
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
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import { runWorkStateRepair } from '../bin/repair-work-state.mjs';
import { MastraSessionBridge } from '../src/orchestration/mastra-session-bridge.ts';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { assertAdmittedRuntimeCodeCurrent } from '../src/orchestration/admitted-session-execution.ts';
import { runtimePackageCodePaths } from '../src/config/runtime-config.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { run } from '../bin/run.mjs';
import { executeDocumentationClearOperation } from '../src/documentation/clear.ts';
import { prepareLifecycleForCorrection } from '../src/orchestration/final-assurance.ts';
import { issueObservedResearchActivation } from '../src/orchestration/observed-research-activation.ts';
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture(sourceWriter = false, publicStore = false) {
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
  const config = loadRuntimeConfig(root);
  if (publicStore) mkdirSync(path.join(root, config.control.work_root), { recursive: true });
  const database = openHostStateDatabase(
      publicStore
        ? path.join(root, config.control.work_root, 'session-handoff.v1.sqlite')
        : path.join(root, 'fixture.sqlite'),
    ),
    store = new HostStateStore(
      database,
      publicStore ? deriveWorkspaceId(config.repository.repository_id, root) : 'a'.repeat(64),
      undefined,
      undefined,
      undefined,
      undefined,
      publicStore ? root : undefined,
    ),
    source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const selection = {
    team: 'default-development',
    kind: sourceWriter ? 'feature' : 'research',
    intent: sourceWriter ? 'implementation_change' : 'information_research',
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
        canonical_kind: selection.kind,
        intent: selection.intent,
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
    source,
    prepare,
    admit,
    close() {
      database.close();
      rmSync(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    },
  };
}

test('admission normalizes a caller runtime subset into one immutable canonical intake without changing raw input', () => {
  const f = fixture();
  try {
    const input = f.prepare('canonical', 'user:canonical');
    input.intakePath = '.agent/work/canonical/raw-intake.json';
    const raw = JSON.stringify({
      schema: 'VidaLocalSessionIntake/v1',
      work_item: input.workItem,
      native_session_handle: input.nativeSessionHandle,
      scope_path: input.scopePath,
      acceptance_path: input.acceptancePath,
      runtime_code_paths: input.runtimeCodePaths,
      route: input.route,
      risk: input.risk,
      change_kind: input.changeKind,
    });
    writeFileSync(path.join(f.root, input.intakePath), raw);
    const result = f.admit(input),
      reference = result.host.work.artifacts.find((artifact) => artifact.artifact_id === 'local-session-intake');
    expect(reference.path).not.toBe(input.intakePath);
    const normalized = JSON.parse(readFileSync(path.join(f.root, reference.path), 'utf8'));
    expect(normalized.runtime_code_paths).toEqual(runtimePackageCodePaths(f.config.runtime.bundle));
    expect(normalized.runtime_code_paths).toContain('vida-agent/src/runtime-kernel.ts');
    expect(readFileSync(path.join(f.root, input.intakePath), 'utf8')).toBe(raw);
    const work = result.host.work,
      identity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: 'canonical',
      };
    expect(assertAdmittedRuntimeCodeCurrent(f.root, f.store, identity).native_session_handle).toBe(
      input.nativeSessionHandle,
    );
    writeFileSync(
      path.join(f.root, input.intakePath),
      JSON.stringify({ ...JSON.parse(raw), runtime_code_paths: ['vida-agent/bin/scope.mjs'] }),
    );
    expect(assertAdmittedRuntimeCodeCurrent(f.root, f.store, identity).native_session_handle).toBe(
      input.nativeSessionHandle,
    );
    writeFileSync(path.join(f.root, reference.path), raw);
    expect(() => assertAdmittedRuntimeCodeCurrent(f.root, f.store, identity)).toThrow(/intake changed/);
  } finally {
    f.close();
  }
});

test('effective artifact producers reject risk omission and unsupported tester or delivery cardinality', () => {
  const f = fixture(),
    file = path.join(f.root, 'agent-runtime.config.v1.yaml'),
    original = readFileSync(file, 'utf8');
  try {
    for (const scenario of ['filtered-tester', 'multiple-testers', 'multiple-deliveries']) {
      const yaml = parseYaml(original),
        stages = yaml.workflows.implementation_change.stages;
      const stage = stages.find((stage) => stage.kind === (scenario === 'multiple-deliveries' ? 'deliver' : 'test'));
      if (scenario === 'filtered-tester') stage.assignments[0].risk_flags = ['security'];
      else stage.assignments.push({ ...stage.assignments[0] });
      writeFileSync(file, stringifyYaml(yaml));
      expect(() =>
        compileDevelopmentWorkflow(loadRuntimeConfig(f.root), 'default-development', 'implementation_change', []),
      ).toThrow();
    }
    const yaml = parseYaml(original),
      research = yaml.workflows.implementation_change.stages[0];
    research.assignments.unshift({ ...research.assignments[0], risk_flags: ['security'] });
    writeFileSync(file, stringifyYaml(yaml));
    const valid = compileDevelopmentWorkflow(
      loadRuntimeConfig(f.root),
      'default-development',
      'implementation_change',
      [],
    );
    expect(
      valid.waves
        .flat()
        .find((stage) => stage.kind === 'test')
        .assignments.filter((item) => item.role === 'tester'),
    ).toHaveLength(1);
    expect(
      valid.waves
        .flat()
        .find((stage) => stage.kind === 'deliver')
        .assignments.filter((item) => item.role === 'delivery-agent'),
    ).toHaveLength(1);
  } finally {
    f.close();
  }
});

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
}, 10000);

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

test('public report retrieves an exact durable observation before stale CAS and source-delta checks', async () => {
  const f = fixture(false, true);
  try {
    const input = f.prepare('ack', 'user:ack');
    input.intakePath = '.agent/work/ack/raw-intake.json';
    writeFileSync(
      path.join(f.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const initial = f.admit(input),
      work = initial.host.work;
    writeFileSync(
      path.join(f.root, '.agent', 'runtime-initialization.v1.json'),
      JSON.stringify({
        schema: 'RuntimeInitialization/v1',
        version: 1,
        repository_id: f.config.repository.repository_id,
        project_ids: ['sample'],
        integrations_digest: canonicalJsonDigest(f.config.integrations),
        workspace_id: f.store.workspaceId,
        workspace_binding_status: 'pending',
        bundle: f.config.runtime.bundle,
        config_digest: runtimeConfigDigest(f.config),
        schema_sha256: createHash('sha256')
          .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
          .digest('hex'),
        templates: [],
        created_at: new Date().toISOString(),
      }),
    );
    f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run('ack');
    const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
    const request = {
      schema: 'VidaSessionRequest/v1',
      run_id: work.execution.run_id,
      workflow_id: work.binding.workflow_id,
      wave_index: 0,
      action_id: '2'.repeat(64),
      assignment_index: 0,
      stage_id: 'research_parallel',
      role: 'facts-researcher',
      config_digest: work.binding.config_digest,
      scope_digest: work.binding.work_source_revision,
      bindings_manifest_ref: '3'.repeat(64),
    };
    let journal = ledger.sync('ack', 1, work.execution.run_id, 'research_parallel', [request], f.source);
    journal = ledger.issueWave('ack', 1, journal.version);
    const activation = await issueObservedResearchActivation({
      repositoryRoot: f.root,
      config: f.config,
      ledger,
      identity: {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: 'ack',
      },
      journal,
      actionId: request.action_id,
    });
    journal = ledger.markResearchWaveExposurePossible('ack', 1, activation.journal.version);
    const summary = 'Observed readonly fixture result',
      observation = {
        schema: 'VidaSessionObservation/v1',
        action_id: request.action_id,
        issue_id: journal.state.items[0].issue_id,
        agent_id: 'fixture-reader',
        tool_call_ref: 'fixture-ack',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:observed-result'],
      };
    const recorded = ledger.report('ack', 1, journal.version, observation, f.source),
      report = path.join(f.root, 'report.json');
    writeFileSync(report, JSON.stringify(observation));
    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'changed source after accepted report');
    const args = [
      '--project-root',
      f.root,
      '--repository',
      f.config.repository.repository_id,
      '--project',
      'sample',
      '--work-path',
      'AGENT.sidecar.md',
      '--work-id',
      'ack',
      '--attempt',
      '1',
      '--scope-digest',
      f.source.digest,
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
      '--report',
      report,
      '--expected-revision',
      String(journal.version.revision),
      '--expected-digest',
      journal.version.digest,
    ];
    const before = f.store.readHostStateSnapshot({
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: 'ack',
    });
    const result = await run(args);
    expect(result.status).toBe('report_retrieved');
    expect(result.state_version).toEqual(recorded.version);
    expect(result.issued_actions).toEqual([]);
    expect(ledger.resume('ack', 1)).toEqual(recorded);
    expect(
      f.store.readHostStateSnapshot({
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: 'ack',
      }),
    ).toEqual(before);
    expect(f.database.query("SELECT name FROM sqlite_master WHERE name='mastra_workflow_snapshot'").get()).toBeNull();
    writeFileSync(
      report,
      JSON.stringify({ ...observation, summary: 'changed retry', output_digest: canonicalJsonDigest('changed retry') }),
    );
    await expect(run(args)).rejects.toThrow(/retry differs/);
  } finally {
    f.close();
  }
});

test.each(['new-report', 'durable-expired', 'durable-drift'])(
  'accepted completed source report atomically releases file ownership for readonly assurance and exact retry: %s',
  (scenario) => {
    const f = fixture(true);
    try {
      const initial = f.admit(f.prepare('writer', 'user:writer')),
        identity = {
          repository_id: initial.host.work.binding.repository_id,
          project_ids: initial.host.work.binding.project_ids,
          integrations_digest: initial.host.work.binding.integrations_digest,
          work_id: 'writer',
        };
      const active = acquireLocalSourceWriterLease({
        repositoryRoot: f.root,
        config: f.config,
        store: f.store,
        identity,
        nativeSessionHandle: 'session',
        expectedWork: initial.host.workVersion,
        expectedLedger: initial.host.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
      });
      const claimed = f.store.claimWorkflowAttempt({
        identity,
        expectedWork: active.workVersion,
        expectedLedger: active.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
        requestDigest: '1'.repeat(64),
        lease: active.work.lease,
      });
      f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run('writer');
      const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
      const request = {
        schema: 'VidaSessionRequest/v1',
        run_id: initial.host.work.execution.run_id,
        step_id: 'develop_change',
        action_id: '2'.repeat(64),
        workflow_id: 'implementation_change',
        wave_index: 0,
        assignment_index: 0,
        role: 'developer-orchestrator',
        bindings_manifest_ref: '3'.repeat(64),
        stage_id: 'develop_change',
        scope_digest: f.source.digest,
        config_digest: active.work.binding.config_digest,
      };
      let journal = ledger.sync('writer', 1, request.run_id, request.step_id, [request], f.source);
      journal = ledger.issueWave('writer', 1, journal.version, {
        [request.action_id]: {
          schema: 'WorkflowSessionReservation/v1',
          receipt: claimed,
          request: { workItemId: 'writer', stageId: request.stage_id, assignmentIndex: 0 },
        },
      });
      const summary = 'Observed completed fixture writer';
      const observation = {
        schema: 'VidaSessionObservation/v1',
        action_id: request.action_id,
        issue_id: journal.state.items[0].issue_id,
        host_attempt_id: claimed.attempt.attempt_id,
        agent_id: 'fixture-writer',
        tool_call_ref: 'fixture-completed-source-call',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:observed-source-completion'],
        changed_paths: [],
      };
      const inflight = f.store.readHostStateSnapshot(identity);
      expect(
        f.store.reconcileCompletedSourceOwnership({ identity, nativeSessionHandle: 'session', verifyCurrent() {} }),
      ).toEqual(inflight);
      expect(() =>
        f.store.reconcileCompletedSourceOwnership({
          identity,
          nativeSessionHandle: 'foreign-session',
          verifyCurrent() {},
        }),
      ).toThrow(/owner differs/);
      f.store.completeWorkflowAttempt(claimed, observation);
      let peerIdentity, peerQueued;
      if (scenario === 'new-report') {
        const peer = f.admit(f.prepare('peer', 'user:peer', 'peer-session'));
        peerIdentity = { ...identity, work_id: 'peer' };
        expect(() =>
          acquireLocalSourceWriterLease({
            repositoryRoot: f.root,
            config: f.config,
            store: f.store,
            identity: peerIdentity,
            nativeSessionHandle: 'peer-session',
            expectedWork: peer.host.workVersion,
            expectedLedger: peer.host.ledgerVersion,
            stageId: 'develop_change',
            assignmentIndex: 0,
          }),
        ).toThrow(/queued/);
        peerQueued = f.store
          .readHostStateSnapshot(peerIdentity)
          .ledger.tickets.find((ticket) => ticket.work_id === 'peer' && ticket.status === 'queued');
      }
      const originalClock = Date.now;
      if (scenario !== 'new-report') {
        const durable = { ...journal.state, items: journal.state.items.map((item) => ({ ...item, observation })) };
        f.database
          .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE work_id=?')
          .run(journal.version.revision + 1, canonicalJson(durable), canonicalJsonDigest(durable), 'writer');
        journal = ledger.resume('writer', 1);
        if (scenario === 'durable-expired')
          Date.now = () =>
            Date.parse(
              active.ledger.tickets.find((ticket) => ticket.ticket_id === active.work.lease.ticket_id).expires_at,
            ) + 1;
        if (scenario === 'durable-drift')
          writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'external source edit after durable success');
      }
      const publish = () =>
        scenario === 'new-report'
          ? ledger.report('writer', 1, journal.version, observation, f.source)
          : (f.store.reconcileCompletedSourceOwnership({
              identity,
              nativeSessionHandle: 'session',
              verifyCurrent() {},
            }),
            ledger.resume('writer', 1));
      try {
        const before = f.store.readHostStateSnapshot(identity);
        f.database.exec(
          `CREATE TRIGGER source_report_fault BEFORE UPDATE ON ${scenario === 'new-report' ? 'agent_host_mastra_session_ledger' : 'agent_host_state'} BEGIN SELECT RAISE(ABORT,'source journal commit fault'); END`,
        );
        expect(publish).toThrow(/source journal commit fault/);
        expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
        expect(ledger.resume('writer', 1)).toEqual(journal);
        f.database.exec('DROP TRIGGER source_report_fault');
        const recorded = publish(),
          after = f.store.readHostStateSnapshot(identity);
        expect(
          after.ledger.claims
            .filter((claim) => claim.status === 'active' && claim.work_id === 'writer')
            .flatMap((claim) => claim.resources),
        ).toEqual(['execution:writer']);
        expect(after.ledger.tickets.find((ticket) => ticket.ticket_id === active.work.lease.ticket_id).status).toBe(
          'released',
        );
        expect(after.work.lifecycle.phase).toBe(before.work.lifecycle.phase);
        expect(after.work.lifecycle.assurance).toEqual(before.work.lifecycle.assurance);
        expect(after.work.artifacts).toEqual(before.work.artifacts);
        expect(ledger.report('writer', 1, journal.version, observation, f.source)).toEqual(recorded);
        expect(f.store.readHostStateSnapshot(identity)).toEqual(after);
        if (scenario !== 'new-report') expect(recorded).toEqual(journal);
        if (scenario === 'durable-drift')
          expect(
            snapshotDeclaredSources(
              requireSafeRepositoryAccess(f.root),
              f.source.entries.map((entry) => entry.path),
            ).digest,
          ).not.toBe(f.source.digest);
        else if (scenario === 'new-report') {
          expect(after.ledger.tickets.find((ticket) => ticket.ticket_id === peerQueued.ticket_id)).toEqual(peerQueued);
          const peer = f.store.readHostStateSnapshot(peerIdentity);
          const granted = acquireLocalSourceWriterLease({
            repositoryRoot: f.root,
            config: f.config,
            store: f.store,
            identity: peerIdentity,
            nativeSessionHandle: 'peer-session',
            expectedWork: peer.workVersion,
            expectedLedger: peer.ledgerVersion,
            stageId: 'develop_change',
            assignmentIndex: 0,
          });
          const current = f.store.readHostStateSnapshot(identity);
          expect(() =>
            acquireLocalSourceWriterLease({
              repositoryRoot: f.root,
              config: f.config,
              store: f.store,
              identity,
              nativeSessionHandle: 'session',
              expectedWork: current.workVersion,
              expectedLedger: current.ledgerVersion,
              stageId: 'develop_change',
              assignmentIndex: 0,
            }),
          ).toThrow(/queued/);
          const correction = f.store.readHostStateSnapshot(identity);
          expect(
            correction.ledger.tickets.find((ticket) => ticket.work_id === 'writer' && ticket.status === 'queued')
              .sequence,
          ).toBeGreaterThan(peerQueued.sequence);
          expect(ledger.report('writer', 1, journal.version, observation, f.source)).toEqual(recorded);
          expect(
            f.store.reconcileCompletedSourceOwnership({ identity, nativeSessionHandle: 'session', verifyCurrent() {} }),
          ).toEqual(correction);
          expect(
            f.store
              .readHostStateSnapshot(peerIdentity)
              .ledger.claims.find(
                (claim) => claim.ticket_id === granted.work.lease.ticket_id && claim.status === 'active',
              ).resources,
          ).toContain('file:AGENT.sidecar.md');
        } else
          expect(
            acquireLocalSourceWriterLease({
              repositoryRoot: f.root,
              config: f.config,
              store: f.store,
              identity,
              nativeSessionHandle: 'session',
              expectedWork: after.workVersion,
              expectedLedger: after.ledgerVersion,
              stageId: 'develop_change',
              assignmentIndex: 0,
            })
              .ledger.claims.filter((claim) => claim.status === 'active')
              .flatMap((claim) => claim.resources),
          ).toEqual(['execution:writer', 'file:AGENT.sidecar.md']);
      } finally {
        Date.now = originalClock;
      }
    } finally {
      f.close();
    }
  },
);

test('ten successive source writers release file rights while their work and Runtime acceptance remain incomplete', () => {
  const f = fixture(true);
  try {
    for (let index = 0; index < 10; index++) {
      const id = 'writer-' + index,
        initial = f.admit(f.prepare(id, 'user:request-' + index)),
        work = initial.host.work;
      const identity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: id,
      };
      const active = acquireLocalSourceWriterLease({
        repositoryRoot: f.root,
        config: f.config,
        store: f.store,
        identity,
        nativeSessionHandle: 'session',
        expectedWork: initial.host.workVersion,
        expectedLedger: initial.host.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
      });
      const claimed = f.store.claimWorkflowAttempt({
        identity,
        expectedWork: active.workVersion,
        expectedLedger: active.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
        requestDigest: '1'.repeat(64),
        lease: active.work.lease,
      });
      f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run(id);
      const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store),
        action = createHash('sha256').update(id).digest('hex');
      const request = {
        schema: 'VidaSessionRequest/v1',
        run_id: work.execution.run_id,
        workflow_id: work.binding.workflow_id,
        wave_index: 0,
        action_id: action,
        assignment_index: 0,
        stage_id: 'develop_change',
        role: 'developer-orchestrator',
        config_digest: work.binding.config_digest,
        scope_digest: work.binding.work_source_revision,
        bindings_manifest_ref: '3'.repeat(64),
      };
      let journal = ledger.sync(id, 1, work.execution.run_id, 'develop_change', [request], f.source);
      journal = ledger.issueWave(id, 1, journal.version, {
        [action]: {
          schema: 'WorkflowSessionReservation/v1',
          receipt: claimed,
          request: { workItemId: id, stageId: request.stage_id, assignmentIndex: 0 },
        },
      });
      const summary = 'Observed completed writer ' + index,
        observation = {
          schema: 'VidaSessionObservation/v1',
          action_id: action,
          issue_id: journal.state.items[0].issue_id,
          host_attempt_id: claimed.attempt.attempt_id,
          agent_id: 'fixture-writer-' + index,
          tool_call_ref: 'fixture-completed-source-' + index,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture:observed-source-completion'],
          changed_paths: [],
        };
      f.store.completeWorkflowAttempt(claimed, observation);
      ledger.report(id, 1, journal.version, observation, f.source);
      const current = f.store.readHostStateSnapshot(identity);
      expect(
        current.ledger.claims.filter((claim) => claim.status === 'active').flatMap((claim) => claim.resources),
      ).toEqual(['execution:' + id]);
      expect(current.work.lifecycle.phase).toBe('INTAKE');
      expect(
        current.work.lifecycle.references.filter((reference) =>
          ['runtime_receipt', 'user_testing_receipt'].includes(reference.kind),
        ),
      ).toEqual([]);
    }
    expect(
      f.store.readWorkspaceSnapshot().work.filter((row) => row.work.execution.status === 'suspended'),
    ).toHaveLength(9);
  } finally {
    f.close();
  }
}, 20000);

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
    let journal = ledger.sync('old', 1, work.execution.run_id, 'fixture-writer-wave', [request], f.source);
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
    expect(recorded.state.source_scope).toEqual(f.source);
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

test('admission rejects forged foreign implementation paths before source snapshot or writer ownership', () => {
  const f = fixture();
  try {
    const rawConfig = parseYaml(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    const project = rawConfig.projects[0];
    const broadProject = structuredClone(project);
    const foreignProject = structuredClone(project);
    rawConfig.projects = [
      { ...broadProject, project_root: 'products' },
      {
        ...foreignProject,
        project_id: 'foreign',
        title: 'foreign',
        delivery_group: 'foreign',
        project_root: 'products/foreign',
      },
    ];
    const integration = rawConfig.integrations.providers[0];
    const sampleIntegration = structuredClone(integration);
    const foreignIntegration = structuredClone(integration);
    rawConfig.integrations.providers = [
      { ...sampleIntegration, project_id: 'sample', namespace: 'sample' },
      { ...foreignIntegration, id: 'local-foreign', project_id: 'foreign', namespace: 'foreign' },
    ];
    writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), stringifyYaml(rawConfig));
    const config = loadRuntimeConfig(f.root);
    mkdirSync(path.join(f.root, 'products/foreign/src'), { recursive: true });
    writeFileSync(path.join(f.root, 'products/foreign/src/secret.ts'), 'foreign source');

    const input = f.prepare('forged-foreign-scope', 'user:forged-foreign-scope');
    const scopePath = path.join(f.root, input.scopePath);
    const scope = JSON.parse(readFileSync(scopePath, 'utf8'));
    scope.allowed_paths = ['products/foreign/src/secret.ts'];
    scope.implementation_paths = ['products/foreign/src/secret.ts'];
    writeFileSync(scopePath, JSON.stringify(scope));

    expect(() => admitLocalSessionWork({ ...input, config })).toThrow(/outside selected project membership/);
    expect(f.store.readWorkspaceSnapshot().work).toEqual([]);
    expect(f.database.query('SELECT work_id,attempt FROM agent_host_admission_attempt').all()).toEqual([
      { work_id: 'forged-foreign-scope', attempt: 1 },
    ]);
  } finally {
    f.close();
  }
});

test('admission accepts an exact out-of-root shared path under the selected project context', () => {
  const f = fixture();
  try {
    const rawConfig = parseYaml(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8'));
    rawConfig.projects[0].project_root = 'products/sample';
    writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), stringifyYaml(rawConfig));
    mkdirSync(path.join(f.root, 'products/sample'), { recursive: true });
    const config = loadRuntimeConfig(f.root);
    const input = f.prepare('shared-path', 'user:shared-path');
    const admitted = admitLocalSessionWork({ ...input, config });
    expect(admitted.source.entries.map((entry) => entry.path)).toEqual(['AGENT.sidecar.md']);
    expect(admitted.host.work.binding.project_ids).toEqual(['sample']);
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
              request: {
                workflow_id: work.binding.workflow_id,
                action_id: actionId,
                stage_id: stage.id,
                assignment_index: 0,
                role: stage.assignments[0].role,
              },
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

test.each(['started', 'completed'])('explicit correction-generation repair (%s receipt)', (receiptStatus) => {
  const f = fixture(false, true);
  const repair = (mode, actor) =>
    runWorkStateRepair([
      '--kind',
      'work-state',
      '--authority',
      'correction-generation',
      '--mode',
      mode,
      '--project-root',
      f.root,
      '--repair-id',
      'base-authority',
      ...(actor ? ['--actor', actor] : []),
    ]);
  try {
    const admitted = f.admit(f.prepare('repair-base', 'user:repair')),
      work = admitted.host.work;
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: 'repair-base',
    };
    expect(() => repair('plan', 'fixture')).toThrow('released ownership');
    expect(() => repair('plan', 'x'.repeat(8_388_609))).toThrow('canonical JSON byte budget exceeded');
    const started = f.store.claimWorkflowAttempt({
      identity,
      expectedWork: admitted.host.workVersion,
      expectedLedger: admitted.host.ledgerVersion,
      stageId: 'fixture-stage',
      assignmentIndex: 0,
      requestDigest: '1'.repeat(64),
      lease: work.lease,
    });
    const terminalSummary = 'Observed terminal writer result for repair closure',
      repairIssue = randomUUID(),
      repairAction = '2'.repeat(64);
    const terminalObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: repairAction,
      issue_id: repairIssue,
      agent_id: 'repair-writer',
      tool_call_ref: 'local:repair-terminal',
      status: 'reported_complete',
      summary: terminalSummary,
      output_digest: canonicalJsonDigest(terminalSummary),
      evidence_refs: ['local://repair/terminal'],
      host_attempt_id: started.attempt.attempt_id,
    };
    f.store.completeWorkflowAttempt(started, terminalObservation);
    const row = f.database.query("SELECT id,payload FROM agent_host_state WHERE kind='work'").get();
    const old = JSON.parse(row.payload);
    old.lease = null;
    old.execution.status = 'suspended';
    for (const attempt of old.execution.assignment_attempts) {
      delete attempt.correction_generation;
      delete attempt.correction_authorization;
    }
    const journalRow = f.database
        .query('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
        .get('repair-base'),
      oldJournal = JSON.parse(journalRow.payload);
    oldJournal.items = [
      {
        request: {
          schema: 'VidaSessionRequest/v1',
          run_id: work.execution.run_id,
          workflow_id: work.binding.workflow_id,
          wave_index: 0,
          action_id: repairAction,
          assignment_index: 0,
          stage_id: 'fixture-stage',
          role: 'developer',
          config_digest: work.binding.config_digest,
          scope_digest: work.binding.work_source_revision,
          bindings_manifest_ref: '3'.repeat(64),
        },
        issue_id: repairIssue,
        observation: terminalObservation,
        host_reservation: {
          schema: 'WorkflowSessionReservation/v1',
          receipt: {
            ...started,
            attempt: {
              ...old.execution.assignment_attempts[0],
              ...(receiptStatus === 'started' ? { status: 'started', result: null, result_digest: null } : {}),
            },
          },
          request: { workItemId: 'repair-base', stageId: 'fixture-stage', assignmentIndex: 0 },
        },
      },
    ];
    if (receiptStatus === 'started') {
      const readonlyItem = structuredClone(oldJournal.items[0]);
      delete readonlyItem.host_reservation;
      const readonlyObservation = structuredClone(readonlyItem.observation);
      delete readonlyObservation.host_attempt_id;
      oldJournal.items.push(
        ...Array.from({ length: 200 }, (_, index) => ({
          ...readonlyItem,
          request: { ...readonlyItem.request, action_id: canonicalJsonDigest('readonly-' + index) },
          issue_id: 'readonly-issue-' + index,
          observation: {
            ...readonlyObservation,
            action_id: canonicalJsonDigest('readonly-' + index),
            issue_id: 'readonly-issue-' + index,
            tool_call_ref: 'local:readonly-' + index,
          },
        })),
      );
    }
    const saveJournal = (state) =>
      f.database
        .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=?')
        .run(canonicalJson(state), canonicalJsonDigest(state), 'repair-base');
    saveJournal(oldJournal);
    f.database
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work' AND id=?")
      .run(canonicalJson(old), canonicalJsonDigest(old), row.id);
    const ledgerRow = f.database.query("SELECT payload FROM agent_host_state WHERE kind='ledger'").get(),
      settledLedger = JSON.parse(ledgerRow.payload);
    settledLedger.claims = settledLedger.claims.map((claim) => ({ ...claim, status: 'released' }));
    settledLedger.tickets = settledLedger.tickets.map((ticket) => ({
      ...ticket,
      status: 'released',
      active_resources: [],
      blocked_resources: [],
      expires_at: null,
    }));
    f.database
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
      .run(canonicalJson(settledLedger), canonicalJsonDigest(settledLedger));
    expect(() => f.store.readHostStateSnapshot(identity)).toThrow();
    saveJournal({ ...oldJournal, items: [{ ...oldJournal.items[0], observation: null }] });
    expect(() => repair('plan', 'fixture')).toThrow('terminal issued observations');
    saveJournal(oldJournal);
    const mismatchedReceipt = structuredClone(oldJournal);
    mismatchedReceipt.items[0].host_reservation.receipt.attempt.request_digest = 'f'.repeat(64);
    saveJournal(mismatchedReceipt);
    expect(() => repair('inspect')).toThrow(
      'repair reservation is not an exact terminal or retained unknown Host attempt',
    );
    const mismatchedObservation = structuredClone(oldJournal);
    mismatchedObservation.items[0].observation.summary = 'A different reported outcome';
    saveJournal(mismatchedObservation);
    expect(() => repair('inspect')).toThrow(
      'repair reservation is not an exact terminal or retained unknown Host attempt',
    );
    saveJournal(oldJournal);
    expect(repair('inspect').status).toBe('repairable_current_v1');
    const planned = repair('plan', 'fixture');
    if (receiptStatus === 'started')
      expect(() => canonicalJson(planned)).toThrow('canonical JSON node budget exceeded');
    const planRow = f.database.query('SELECT payload,digest FROM agent_host_work_state_repair').get();
    f.database.query('UPDATE agent_host_work_state_repair SET payload=?').run(planRow.payload + ' ');
    expect(() => repair('resume')).toThrow('repair operation checksum differs');
    f.database.query('UPDATE agent_host_work_state_repair SET payload=?').run(planRow.payload);
    if (receiptStatus === 'completed') {
      f.database
        .query('UPDATE agent_host_work_state_repair SET payload=?,digest=?')
        .run(canonicalJson(planned), canonicalJsonDigest(planned));
      expect(repair('plan', 'fixture')).toEqual(planned);
    }
    expect(planned.work_changes).toHaveLength(1);
    expect(planned.work_changes[0].after.execution.assignment_attempts[0].attempt_id).toBe(started.attempt.attempt_id);
    f.database.exec(
      "CREATE TRIGGER repair_fault BEFORE UPDATE ON agent_host_state BEGIN SELECT RAISE(ABORT,'repair apply fault'); END",
    );
    expect(() => repair('apply')).toThrow('repair apply fault');
    expect(
      JSON.parse(f.database.query("SELECT payload FROM agent_host_state WHERE kind='work'").get().payload),
    ).toEqual(old);
    f.database.exec('DROP TRIGGER repair_fault');
    const applied = repair('resume');
    expect(applied.status).toBe('applied');
    expect(repair('resume')).toEqual(applied);
    const current = JSON.parse(
      f.database.query("SELECT payload FROM agent_host_state WHERE kind='work'").get().payload,
    );
    expect(current.execution.assignment_attempts[0]).toEqual({
      ...old.execution.assignment_attempts[0],
      correction_generation: 0,
      correction_authorization: null,
    });
    const repairedJournal = JSON.parse(
      f.database.query('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?').get('repair-base')
        .payload,
    );
    expect(repairedJournal.items[0].host_reservation.receipt.attempt.correction_generation).toBe(0);
    expect(repairedJournal.items[0].issue_id).toBe(repairIssue);
    expect(repair('restore').status).toBe('restored');
    const restored = f.store.readHostStateSnapshot(identity);
    expect(restored.work.execution.assignment_attempts[0].attempt_id).toBe(started.attempt.attempt_id);
    expect(restored.work.execution.assignment_attempts[0].result).toEqual(old.execution.assignment_attempts[0].result);
    expect(restored.work.execution.assignment_attempts[0].correction_generation).toBe(0);
    expect(restored.work.execution.assignment_attempts[0].correction_authorization).toBeNull();
    expect(repair('restore').status).toBe('restored');
    const stable = f.store.readHostStateSnapshot(identity);
    f.store.compareAndSwapHostState({
      expectedWork: stable.workVersion,
      expectedLedger: stable.ledgerVersion,
      nextWork: {
        ...stable.work,
        revision: stable.work.revision + 1,
        lifecycle: { ...stable.work.lifecycle, revision: stable.work.lifecycle.revision + 1 },
        execution: { ...stable.work.execution, status: 'failed' },
      },
      nextLedger: { ...stable.ledger, revision: stable.ledger.revision + 1 },
    });
    expect(() => repair('restore')).toThrow('restored repair changed');
    expect(() => repair('resume')).toThrow('restored repair changed');
    expect(f.store.readHostStateSnapshot(identity).work.execution.status).toBe('failed');
  } finally {
    f.close();
  }
});

for (const scenario of ['validate', 'test', 'runtime-rebind'])
  test(
    'public same-work correction after real report resume sync ' + scenario,
    async () => {
      const failureStage = scenario === 'runtime-rebind' ? 'validate' : scenario;
      const f = fixture(true, true);
      let failure;
      const publicRun = (args) => {
        const result = spawnSync(
          process.execPath,
          [
            '--no-env-file',
            '--no-install',
            '--config=' + path.join(bundle, 'bunfig.toml'),
            path.join(bundle, 'bin/run.mjs'),
            ...args,
          ],
          { cwd: bundle, encoding: 'utf8', windowsHide: true, timeout: 30000 },
        );
        if (result.status !== 0)
          throw new Error(
            JSON.stringify({
              status: result.status,
              signal: result.signal,
              error: result.error?.message,
              stderr: result.stderr?.slice(-4096),
              stdout: result.stdout?.slice(-4096),
            }),
          );
        return JSON.parse(result.stdout);
      };
      try {
        const id = 'corrective-public',
          input = f.prepare(id, 'user:current-correction');
        input.selection.kind = 'task';
        input.selection.intent = 'task_execution';
        input.workItem = { ...input.workItem, canonical_kind: 'task', intent: 'task_execution', provider_type: 'Task' };
        input.sourceAuthorizationPath = `.agent/work/${id}/authorization.json`;
        writeFileSync(
          path.join(f.root, input.sourceAuthorizationPath),
          JSON.stringify({
            schema: 'LocalSourceWriteAuthorization/v1',
            action: 'source.write',
            user_instruction_ref: 'fixture:actual-owner-directive',
            work_id: id,
            attempt: 1,
            scope_digest: input.context.scope_digest,
            config_digest: runtimeConfigDigest(f.config),
            workflow_id: 'task_execution',
            stage_ids: ['develop_task'],
            implementation_paths: ['AGENT.sidecar.md'],
            native_session_handle: 'session',
          }),
        );
        input.intakePath = `.agent/work/${id}/raw-intake.json`;
        writeFileSync(
          path.join(f.root, input.intakePath),
          JSON.stringify({
            schema: 'VidaLocalSessionIntake/v1',
            work_item: input.workItem,
            native_session_handle: input.nativeSessionHandle,
            scope_path: input.scopePath,
            acceptance_path: input.acceptancePath,
            source_authorization_path: input.sourceAuthorizationPath,
            runtime_code_paths: input.runtimeCodePaths,
            route: input.route,
            risk: input.risk,
            change_kind: input.changeKind,
          }),
        );
        const initial = admitLocalSessionWork(input),
          work = initial.host.work,
          identity = {
            repository_id: work.binding.repository_id,
            project_ids: work.binding.project_ids,
            integrations_digest: work.binding.integrations_digest,
            work_id: id,
          };
        writeFileSync(
          path.join(f.root, '.agent/runtime-initialization.v1.json'),
          JSON.stringify({
            schema: 'RuntimeInitialization/v1',
            version: 1,
            repository_id: f.config.repository.repository_id,
            project_ids: ['sample'],
            integrations_digest: canonicalJsonDigest(f.config.integrations),
            workspace_id: f.store.workspaceId,
            workspace_binding_status: 'pending',
            bundle: f.config.runtime.bundle,
            config_digest: runtimeConfigDigest(f.config),
            schema_sha256: createHash('sha256')
              .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
              .digest('hex'),
            templates: [],
            created_at: new Date().toISOString(),
          }),
        );
        const sourceLease = acquireLocalSourceWriterLease({
          repositoryRoot: f.root,
          config: f.config,
          store: f.store,
          identity,
          nativeSessionHandle: 'session',
          stageId: 'develop_task',
          assignmentIndex: 0,
          expectedWork: initial.host.workVersion,
          expectedLedger: initial.host.ledgerVersion,
        });
        const claimed = f.store.claimWorkflowAttempt({
          identity,
          expectedWork: sourceLease.workVersion,
          expectedLedger: sourceLease.ledgerVersion,
          stageId: 'develop_task',
          assignmentIndex: 0,
          requestDigest: '1'.repeat(64),
          lease: sourceLease.work.lease,
        });
        const args = [
          '--project-root',
          f.root,
          '--repository',
          f.config.repository.repository_id,
          '--project',
          'sample',
          '--work-path',
          'AGENT.sidecar.md',
          '--work-id',
          id,
          '--attempt',
          '1',
          '--scope-digest',
          work.binding.work_source_revision,
          '--team',
          'default-development',
          '--kind',
          'task',
          '--intent',
          'task_execution',
          '--workflow',
          'task_execution',
        ];
        const fixtureSource = snapshotDeclaredSources(
          requireSafeRepositoryAccess(f.root),
          work.lifecycle.scope.allowed_paths,
        );
        const bridge = await MastraSessionBridge.open({
          repositoryRoot: f.root,
          config: f.config,
          selection: input.selection,
          context: input.context,
          workflowId: 'task_execution',
          workspaceId: f.store.workspaceId,
        });
        const fixtureHost = new HostStateStore(
          f.database,
          f.store.workspaceId,
          undefined,
          undefined,
          undefined,
          undefined,
          f.root,
        );
        const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, fixtureHost);
        let snapshot = await bridge.start();
        const sync = () =>
          ledger.sync(id, 1, snapshot.run_id, snapshot.step_id, snapshot.requests, fixtureSource, snapshot.status);
        let journal = sync();
        const observed = (item, summary, status = 'reported_complete') => ({
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          agent_id: item.request.stage_id + '-' + item.request.assignment_index,
          tool_call_ref: 'local:original-' + item.request.action_id,
          status,
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['local://fixture/terminal'],
        });
        journal = ledger.issueWave(id, 1, journal.version);
        for (const item of journal.state.items)
          journal = ledger.report(id, 1, journal.version, observed(item, 'Observed fixture synthesis'), fixtureSource);
        snapshot = await bridge.resume(
          journal.state.step_id,
          journal.state.items.map((item) => item.observation),
        );
        journal = sync();
        const developer = journal.state.items[0].request;
        const reservation = {
          schema: 'WorkflowSessionReservation/v1',
          receipt: claimed,
          request: { workItemId: id, stageId: 'develop_task', assignmentIndex: 0 },
        };
        journal = ledger.issueWave(id, 1, journal.version, { [developer.action_id]: reservation });
        const writer = {
          ...observed(journal.state.items[0], 'Actual isolated fixture writer terminal'),
          host_attempt_id: claimed.attempt.attempt_id,
          changed_paths: [],
        };
        f.store.completeWorkflowAttempt(claimed, writer);
        journal = ledger.report(id, 1, journal.version, writer, fixtureSource);
        snapshot = await bridge.resume(
          journal.state.step_id,
          journal.state.items.map((item) => item.observation),
        );
        journal = sync();
        journal = ledger.issueWave(id, 1, journal.version);
        const report = (item, summary, status) => {
          const observation = observed(item, summary, status),
            file = path.join(
              f.root,
              '.agent/work/' + id + '/report-' + item.request.stage_id + '-' + item.request.assignment_index + '.json',
            );
          writeFileSync(file, JSON.stringify(observation));
          return publicRun([
            ...args,
            '--report',
            file,
            '--expected-revision',
            String(journal.version.revision),
            '--expected-digest',
            journal.version.digest,
          ]);
        };
        const validatorItems = [...journal.state.items];
        for (const item of validatorItems) {
          const verdict = failureStage === 'validate' ? 'fail' : 'pass';
          report(
            item,
            JSON.stringify({
              schema: 'VidaValidatorVerdict/v1',
              verdict,
              findings: verdict === 'fail' ? ['Actual fixture correctness defect'] : [],
              evidence_refs: ['local://fixture/terminal'],
            }),
            verdict === 'fail' ? 'reported_failed' : 'reported_complete',
          );
          journal = ledger.resume(id, 1);
        }
        if (failureStage === 'test') {
          journal = ledger.issueWave(id, 1, journal.version);
          report(
            journal.state.items[0],
            JSON.stringify({
              schema: 'VidaTesterVerdict/v1',
              status: 'fail',
              evidence_refs: ['local://fixture/terminal'],
            }),
            'reported_failed',
          );
          journal = ledger.resume(id, 1);
        }
        const original = journal.state;
        expect(original.items.filter((item) => item.observation?.status === 'reported_failed')).toHaveLength(
          failureStage === 'validate' ? 2 : 1,
        );
        expect(ledger.resume(id, 1).resume_status).toBe('blocked');
        expect((await bridge.snapshot()).status).toBe('suspended');
        expect(original.run_id).toBe(work.execution.run_id);
        if (failureStage === 'validate') {
          const beforeHost = f.store.readHostStateSnapshot(identity),
            beforeJournal = ledger.resume(id, 1);
          const denied = spawnSync(
            process.execPath,
            [
              '--no-env-file',
              '--no-install',
              '--config=' + path.join(bundle, 'bunfig.toml'),
              path.join(bundle, 'bin/run.mjs'),
              ...args,
              '--issue-wave',
              'true',
              '--expected-revision',
              String(beforeJournal.version.revision),
              '--expected-digest',
              beforeJournal.version.digest,
            ],
            { cwd: bundle, encoding: 'utf8', windowsHide: true, timeout: 30000 },
          );
          expect(denied.status).toBe(1);
          expect(denied.signal).toBeNull();
          expect(denied.error).toBeUndefined();
          const denialLines = denied.stderr
            .trim()
            .split(/\r?\n/u)
            .filter((line) => line.startsWith('{"schema":"VidaAgentRunResult/v1"'));
          expect(denialLines).toHaveLength(1);
          const denial = JSON.parse(denialLines[0]);
          expect(denial).toMatchObject({
            schema: 'VidaAgentRunResult/v1',
            status: 'blocked',
            code: 'GAP-VIDA-RUN-EXECUTION-001',
          });
          expect(denied.stdout.trim()).toBe('');
          expect(denial.issued_actions ?? []).toEqual([]);
          expect(denial.next_actions ?? []).toEqual([]);
          expect(ledger.resume(id, 1)).toEqual(beforeJournal);
          expect(f.store.readHostStateSnapshot(identity).work.execution.assignment_attempts).toEqual(
            beforeHost.work.execution.assignment_attempts,
          );
          expect(
            snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), work.lifecycle.scope.allowed_paths),
          ).toEqual(fixtureSource);
          expect((await bridge.snapshot()).status).toBe('suspended');
        }
        await bridge.close();
        const originalVersion = f.store.readWorkSessionJournal(identity).version;
        const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
        writeFileSync(
          path.join(f.root, policyPath),
          JSON.stringify({
            schema: 'DocumentationPolicy/v1',
            policy_id: 'corrective-public-fixture',
            project_id: 'sample',
            source_path: policyPath,
            owner: 'fixture',
            required: false,
            canonical_roots: ['docs'],
            map_paths: ['AGENT.sidecar.md'],
            excluded_roots: [],
            changelog_required: false,
            changelog_path: null,
            relations: ['documents'],
            updated_at: new Date().toISOString(),
          }),
        );
        const doc = {
          repository_root: f.root,
          repository_id: work.binding.repository_id,
          project_id: 'sample',
          work_id: id,
          source_revision: work.binding.work_source_revision,
          scope_paths: ['AGENT.sidecar.md'],
        };
        await executeDocumentationClearOperation(doc, 'baseline');
        const clear = await executeDocumentationClearOperation(doc, 'closeout');
        const mechanics = {
          source_plan: ['scope_acceptance_trace', 'verification_rollback'],
          platform_knowledge: ['platform_contracts', 'official_reference_lookup'],
          implementation_policy: ['root_cause_owner', 'affected_callers', 'existing_primitives'],
          change_impact_pre: ['affected_paths', 'invalidation', 'rollback'],
          documentation_validation: ['current_inventory', 'current_clear'],
        };
        const prerequisites = Object.entries(mechanics).map(([kind, labels]) => {
          const file = `.agent/work/${id}/${kind}.json`;
          writeFileSync(
            path.join(f.root, file),
            JSON.stringify({
              schema: 'LifecyclePreparationObservation/v1',
              record_id: kind,
              kind,
              work_id: id,
              attempt: 1,
              source_revision: work.binding.work_source_revision,
              scope_id: work.binding.scope_id,
              config_digest: work.binding.config_digest,
              ac_ids: work.binding.ac_ids,
              observed_at: new Date().toISOString(),
              observer_id: 'fixture-observer',
              status: 'pass',
              evidence_refs: ['local://fixture/current-source'],
              observations: labels.map((mechanic) => ({
                mechanic,
                actual: 'Explicit isolated current contract fixture observation',
                evidence_ref: 'local://fixture/current-source',
              })),
              gaps: [],
            }),
          );
          return { kind, path: file };
        });
        const preparationPath = `.agent/work/${id}/preparation.json`;
        writeFileSync(
          path.join(f.root, preparationPath),
          JSON.stringify({
            schema: 'FinalAssurancePreparation/v1',
            work_id: id,
            attempt: 1,
            prerequisites,
            documentation_precheck_path: clear.path,
            clear_path: clear.path,
            delivery_manifest_path: `.agent/work/${id}/delivery.json`,
          }),
        );
        const planPath = path.join(f.root, `.agent/work/${id}/correction-plan.json`);
        writeFileSync(
          planPath,
          JSON.stringify({
            schema: 'CorrectiveExecutionPlan/v1',
            work_id: id,
            attempt: 1,
            stage_ids: ['develop_task', 'validate_focused', 'test_task'],
            user_instruction_ref: 'fixture:actual-correction-owner',
            preparation_path: preparationPath,
          }),
        );

        if (scenario === 'runtime-rebind') {
          prepareLifecycleForCorrection({
            root: f.root,
            config: f.config,
            store: fixtureHost,
            identity,
            journal: ledger.resume(id, 1),
            preparationPath,
          });
          let current = fixtureHost.readHostStateSnapshot(identity);
          const negative = original.items.find((item) => item.observation?.status === 'reported_failed');
          const verifier = {
            principal: 'synthetic-forward-rebind-verifier',
            verify: (request) => ({
              schema: 'VidaRuntimeCodeRebindAuthorization/v1',
              request_digest: canonicalJsonDigest(request),
              principal: verifier.principal,
              forward_operation_id: request.forwardOperationId,
              parent_manifest_digest: request.parentManifestDigest,
              successor_manifest_digest: request.successorManifestDigest,
              owner_correction_pointer: request.focusedFailureCorrection.ownerCorrectionPointer,
            }),
          };
          const reboundStore = new HostStateStore(
            f.database,
            f.store.workspaceId,
            undefined,
            undefined,
            undefined,
            undefined,
            f.root,
            verifier,
          );
          const request = {
            identity,
            attempt: 1,
            actionId: negative.request.action_id,
            issueId: negative.issue_id,
            nativeSessionHandle: 'session',
            expectedWork: current.workVersion,
            expectedLedger: current.ledgerVersion,
            expectedJournal: ledger.resume(id, 1).version,
            expectedMaintenanceGeneration: current.maintenanceGeneration,
            oldRuntimeCodeDigest: current.work.binding.runtime_code_digest,
            newRuntimeCodeDigest: canonicalJsonDigest('synthetic-fixture-successor-package'),
            forwardOperationId: 'synthetic-forward-operation',
            parentManifestDigest: canonicalJsonDigest('synthetic-parent-manifest'),
            successorManifestDigest: canonicalJsonDigest('synthetic-successor-manifest'),
            focusedFailureCorrection: { ownerCorrectionPointer: 'synthetic-owner:correct-known-terminal-failures' },
          };
          const oldAttempts = structuredClone(current.work.execution.assignment_attempts),
            oldJournal = structuredClone(ledger.resume(id, 1)),
            priorImplementation = current.work.lifecycle.references.find(
              (reference) => reference.kind === 'implementation_result' && reference.disposition === 'current',
            );
          expect(priorImplementation).toBeDefined();
          f.database.exec(
            'CREATE TABLE agent_host_runtime_code_rebind (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
          );
          f.database.exec(
            "CREATE TRIGGER reject_synthetic_rebind BEFORE INSERT ON agent_host_runtime_code_rebind BEGIN SELECT RAISE(ABORT,'synthetic receipt rollback'); END",
          );
          await expect(reboundStore.rebindRuntimeCode(request)).rejects.toThrow('synthetic receipt rollback');
          expect(reboundStore.readHostStateSnapshot(identity)).toEqual(current);
          expect(
            f.database.query('SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE work_id=?').get(id),
          ).toBeNull();
          f.database.exec('DROP TRIGGER reject_synthetic_rebind');
          const rebound = await reboundStore.rebindRuntimeCode(request);
          expect(rebound.work.binding.runtime_code_digest).toBe(request.newRuntimeCodeDigest);
          expect(rebound.work.execution.assignment_attempts).toEqual(oldAttempts);
          expect(rebound.work.lifecycle.phase).toBe('EXECUTE');
          expect(rebound.work.lifecycle.seal).toBeNull();
          expect(rebound.work.lifecycle.assurance.correction_count).toBe(
            current.work.lifecycle.assurance.correction_count + 1,
          );
          expect(
            rebound.work.lifecycle.references.find((reference) => reference.kind === 'execution_approval').disposition,
          ).toBe('current');
          expect(
            rebound.work.lifecycle.references.find(
              (reference) =>
                reference.kind === 'implementation_result' && reference.record_id === priorImplementation.record_id,
            ).disposition,
          ).toBe('retired');
          expect(ledger.resume(id, 1)).toEqual(oldJournal);
          const restarted = new HostStateStore(
            f.database,
            f.store.workspaceId,
            undefined,
            undefined,
            undefined,
            undefined,
            f.root,
            verifier,
          );
          const databasePath = path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite');
          expect(restarted.readHostStateSnapshot(identity).work.execution.assignment_attempts).toEqual(oldAttempts);
          expect(
            inspectHostWorkspaceDatabase(databasePath, f.store.workspaceId).work.find(
              (row) => row.identity.work_id === id,
            ).state.execution.assignment_attempts,
          ).toEqual(oldAttempts);
          const row = f.database
              .query('SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE work_id=?')
              .get(id),
            receipt = JSON.parse(row.payload);
          expect(receipt.binding_history.original_work.binding).toEqual(current.work.binding);
          expect(receipt.binding_history.terminal_attempt_ids).toEqual(
            oldAttempts.map((attempt) => attempt.attempt_id),
          );
          const successorRow = f.database
            .query(
              "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
            )
            .get(f.store.workspaceId, id);
          expect(successorRow).not.toBeNull();
          f.database
            .query(
              "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
            )
            .run(
              current.work.revision,
              canonicalJson(current.work),
              canonicalJsonDigest(current.work),
              f.store.workspaceId,
              id,
            );
          expect(() => restarted.readHostStateSnapshot(identity)).toThrow('runtime binding history authority differs');
          expect(() => inspectHostWorkspaceDatabase(databasePath, f.store.workspaceId)).toThrow(
            'runtime binding history authority differs',
          );
          f.database
            .query(
              "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
            )
            .run(successorRow.revision, successorRow.payload, successorRow.digest, f.store.workspaceId, id);
          expect(restarted.readHostStateSnapshot(identity).work.binding.runtime_code_digest).toBe(
            request.newRuntimeCodeDigest,
          );
          expect(
            inspectHostWorkspaceDatabase(databasePath, f.store.workspaceId).work.find(
              (row) => row.identity.work_id === id,
            ).state.binding.runtime_code_digest,
          ).toBe(request.newRuntimeCodeDigest);
          const bad = structuredClone(receipt);
          bad.binding_history.terminal_attempt_ids = ['foreign-terminal-attempt'];
          f.database
            .query('UPDATE agent_host_runtime_code_rebind SET payload=?,digest=? WHERE work_id=?')
            .run(canonicalJson(bad), canonicalJsonDigest(bad), id);
          expect(() => restarted.readHostStateSnapshot(identity)).toThrow('unknown or unlisted');
          f.database
            .query('UPDATE agent_host_runtime_code_rebind SET payload=?,digest=? WHERE work_id=?')
            .run(row.payload, row.digest, id);
          expect(restarted.readHostStateSnapshot(identity).work.binding.runtime_code_digest).toBe(
            request.newRuntimeCodeDigest,
          );
          return;
        }

        const authorized = publicRun([
          ...args,
          '--correct',
          planPath,
          '--expected-revision',
          String(originalVersion.revision),
          '--expected-digest',
          originalVersion.digest,
        ]);
        expect(
          publicRun([
            ...args,
            '--correct',
            planPath,
            '--expected-revision',
            String(originalVersion.revision),
            '--expected-digest',
            originalVersion.digest,
          ]).corrective_execution,
        ).toEqual(authorized.corrective_execution);
        expect(f.store.readHostStateSnapshot(identity).work.lifecycle.assurance.correction_count).toBe(1);
        const originalPlan = readFileSync(planPath);
        const changedPlan = JSON.parse(originalPlan);
        changedPlan.user_instruction_ref = 'fixture:changed-owner';
        writeFileSync(planPath, JSON.stringify(changedPlan));
        expect(() =>
          publicRun([
            ...args,
            '--correct',
            planPath,
            '--expected-revision',
            String(originalVersion.revision),
            '--expected-digest',
            originalVersion.digest,
          ]),
        ).toThrow('blocked');
        writeFileSync(planPath, originalPlan);
        expect(authorized.status).toBe('correction_authorized');
        expect(authorized.corrective_execution.base_run_id).toBe(work.execution.run_id);
        expect(authorized.corrective_execution.engine_run_id).not.toBe(work.execution.run_id);
        expect(
          f.store
            .readHostStateSnapshot(identity)
            .work.lifecycle.references.find((ref) => ref.kind === 'correction_authorization').disposition,
        ).toBe('retired');
        const resumed = publicRun(args);
        expect(resumed.mastra_run_id).toBe(authorized.corrective_execution.engine_run_id);
        expect(resumed.next_actions.map((action) => action.request.stage_id)).toEqual(['develop_task']);
        const issued = publicRun([
          ...args,
          '--issue-wave',
          'true',
          '--expected-revision',
          String(resumed.state_version.revision),
          '--expected-digest',
          resumed.state_version.digest,
        ]);
        expect(issued.issued_actions).toHaveLength(1);
        expect(issued.issued_actions[0].request.corrective_execution).toEqual(authorized.corrective_execution);
        const currentAttempts = f.store.readHostStateSnapshot(identity).work.execution.assignment_attempts;
        const boundHost = new HostStateStore(
          f.database,
          f.store.workspaceId,
          undefined,
          undefined,
          undefined,
          undefined,
          f.root,
        );
        expect(() => boundHost.assertCorrectiveExecutionForWork(id, 2, authorized.corrective_execution)).toThrow(
          'corrective authority contract differs',
        );
        expect(currentAttempts).toHaveLength(2);
        expect(currentAttempts[1].correction_generation).toBe(1);
        expect(currentAttempts[1].previous_attempt_id).toBe(claimed.attempt.attempt_id);
        expect(f.store.readHostStateSnapshot(identity).work.execution.assignment_attempts[0].attempt_id).toBe(
          claimed.attempt.attempt_id,
        );
        expect(
          JSON.parse(
            f.database.query('SELECT payload FROM agent_host_corrective_recovery WHERE work_id=?').get(id).payload,
          ).original_journal.state,
        ).toEqual(original);
        if (failureStage === 'validate') {
          journal = ledger.resume(id, 1);
          const correctionWriter = journal.state.items[0];
          const corrected = {
            ...observed(correctionWriter, 'Observed corrective writer terminal'),
            host_attempt_id: issued.issued_actions[0].host_attempt_id,
            changed_paths: [],
          };
          const correctionReport = path.join(f.root, '.agent/work/' + id + '/correction-writer-report.json');
          writeFileSync(correctionReport, JSON.stringify(corrected));
          publicRun([
            ...args,
            '--report',
            correctionReport,
            '--expected-revision',
            String(journal.version.revision),
            '--expected-digest',
            journal.version.digest,
          ]);
          journal = ledger.resume(id, 1);
          expect(journal.state.items.map((item) => item.request.stage_id)).toEqual([
            'validate_focused',
            'validate_focused',
          ]);
          publicRun([
            ...args,
            '--issue-wave',
            'true',
            '--expected-revision',
            String(journal.version.revision),
            '--expected-digest',
            journal.version.digest,
          ]);
          journal = ledger.resume(id, 1);
          for (const item of [...journal.state.items]) {
            report(
              item,
              JSON.stringify({
                schema: 'VidaValidatorVerdict/v1',
                verdict: 'pass',
                findings: [],
                evidence_refs: ['local://fixture/terminal'],
              }),
              'reported_complete',
            );
            journal = ledger.resume(id, 1);
          }
          expect(journal.state.items.map((item) => item.request.stage_id)).toEqual(['test_task']);
          publicRun([
            ...args,
            '--issue-wave',
            'true',
            '--expected-revision',
            String(journal.version.revision),
            '--expected-digest',
            journal.version.digest,
          ]);
          journal = ledger.resume(id, 1);
          report(
            journal.state.items[0],
            JSON.stringify({
              schema: 'VidaTesterVerdict/v1',
              status: 'fail',
              evidence_refs: ['local://fixture/terminal'],
            }),
            'reported_failed',
          );
          journal = ledger.resume(id, 1);
          expect(journal.resume_status).toBe('blocked');
          expect(journal.state.attempt).toBe(1);
          expect(journal.state.work_id).toBe(id);
          expect(
            journal.state.completed
              .flatMap((wave) => wave.items)
              .find((item) => item.request.stage_id === 'develop_task').observation.host_attempt_id,
          ).toBe(issued.issued_actions[0].host_attempt_id);
        }
      } catch (error) {
        failure = error;
        throw error;
      } finally {
        try {
          f.close();
        } catch (cleanup) {
          if (failure)
            throw new AggregateError([failure, cleanup], 'Public correction failed; owned fixture cleanup also failed');
          throw cleanup;
        }
      }
    },
    60000,
  );
