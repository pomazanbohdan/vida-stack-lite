import { afterAll, describe, expect, test, spyOn } from 'bun:test';
import { Database } from 'bun:sqlite';
import { HostStateStore, inspectHostWorkspaceDatabase } from '../src/host-state.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { sessionBridgeRunId } from '../src/orchestration/mastra-session-bridge.ts';
import {
  boundedSpawnSync,
  executionBudget,
  commandOutcomeUnknown,
  requireTerminalCommand,
  pinnedEnvironment,
} from '../bin/bun.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  cpSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { advanceCutoff, assertNoActiveCutoverMaintenance, run, writeDurable } from '../bin/run.mjs';
import { initializeProject } from '../bin/init.mjs';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId, loadRuntimeConfig, runtimeConfigDigest } from '../src/index.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// A interrupted admission fixture: real Host CAS, no Mastra producer or installation.
function unpreparedRecoveryFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-unprepared-state-'));
  const yaml = readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{REPOSITORY}}', 'recovery-repository')
    .replaceAll('{{PROJECT}}', 'project')
    .replaceAll('{{BUNDLE}}', 'vida-agent');
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), yaml);
  writeFileSync(path.join(root, 'baseline.yaml'), yaml);
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture sources');
  mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    project = loadProjectSetContext(root, config, 'recovery-repository', ['project']);
  const workspace = deriveWorkspaceId(project.repository_id, root),
    identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: 'partial-preparation',
    };
  const source = 'a'.repeat(64),
    resources = ['execution:' + identity.work_id],
    now = new Date().toISOString(),
    expiry = new Date(Date.now() + 3600000).toISOString(),
    owner = 'fixture-owner';
  const item = {
    schema: 'WorkItem/v1',
    id: identity.work_id,
    canonical_kind: 'task',
    intent: 'task_execution',
    project_id: 'project',
    title: 'Interrupted preparation',
    description: 'No issued work',
    risk_flags: [],
    labels: [],
    provider: 'local-project',
    provider_type: 'local',
  };
  const intakePath = '.agent/work/' + identity.work_id + '/local-session-intake.v1.json',
    intakeBytes = Buffer.from(
      JSON.stringify({ schema: 'VidaLocalSessionIntake/v1', work_item: item, native_session_handle: owner }),
    );
  mkdirSync(path.dirname(path.join(root, intakePath)), { recursive: true });
  writeFileSync(path.join(root, intakePath), intakeBytes);
  const binding = {
    ...identity,
    team_id: 'default-development',
    workflow_id: 'task_execution',
    provider_work_item_id: identity.work_id,
    lifecycle_work_id: identity.work_id,
    work_item_digest: canonicalJsonDigest(item),
    work_source_revision: source,
    scope_id: 'scope-preparation',
    scope_contract_digest: 'c'.repeat(64),
    acceptance_manifest_digest: 'd'.repeat(64),
    ac_ids: ['AC-PREPARATION'],
    implementation_paths: ['task.ts'],
    allowed_resources: ['file:task.ts', ...resources],
    config_digest: runtimeConfigDigest(config),
    runtime_source_revision: 'runtime-source',
    schema_digest: 'f'.repeat(64),
    runtime_code_digest: '0'.repeat(64),
  };
  delete binding.work_id;
  const context = { work_id: identity.work_id, attempt: 1, scope_digest: source };
  const work = {
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
    lease: { ticket_id: 'preparation-ticket', thread_id: owner, generation: 1 },
    execution: {
      run_id: sessionBridgeRunId(workspace, context, 'task_execution'),
      input_digest: '1'.repeat(64),
      phase: 'implementation',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: source,
      next_action: 'Trace the accepted request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'fix',
      config_binding: {
        config_digest: binding.config_digest,
        schema_digest: binding.schema_digest,
        runtime_code_digest: binding.runtime_code_digest,
      },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: ['task.ts'],
        fingerprint_paths: ['task.ts'],
        implementation_paths: ['task.ts'],
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
    artifacts: [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: intakePath,
        sha256: createHash('sha256').update(intakeBytes).digest('hex'),
        stage_id: 'intake',
        source_revision: source,
        scope_id: binding.scope_id,
        ac_ids: binding.ac_ids,
      },
    ],
  };
  const ticket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: work.lease.ticket_id,
    ...identity,
    thread_id: owner,
    source_revision: source,
    generation: 1,
    sequence: 1,
    contour_keys: resources,
    exclusive_resources: resources,
    status: 'active',
    claim_ids: ['preparation-claim'],
    expires_at: expiry,
    active_resources: resources,
    blocked_resources: [],
    created_at: now,
  };
  const claim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'preparation-claim',
    ticket_id: ticket.ticket_id,
    work_id: identity.work_id,
    thread_id: owner,
    generation: 1,
    resources,
    lease_expires_at: expiry,
    status: 'active',
    created_at: now,
    renewed_at: now,
  };
  const ledger = {
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
  };
  const file = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(file), { recursive: true });
  let db = new Database(file, { strict: true }),
    store = new HostStateStore(db, workspace, undefined, undefined, undefined, undefined, root);
  store.compareAndSwapHostState({ expectedWork: null, expectedLedger: null, nextWork: work, nextLedger: ledger });
  const journalOwner = openConfiguredMastraSessionLedger(root);
  journalOwner.close();
  const engineFile = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite'),
    engine = new Database(engineFile);
  engine.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot TEXT)');
  engine.close();
  const input = { identity, attempt: 1, operatorHandle: owner, decisionPointer: 'user:fixture-recovery', config };
  const observed = () => inspectHostWorkspaceDatabase(file, workspace);
  return {
    root,
    file,
    engineFile,
    identity,
    workspace,
    config,
    input,
    context,
    observed,
    get db() {
      return db;
    },
    get store() {
      return store;
    },
    reopen() {
      db.close();
      db = new Database(file, { strict: true });
      store = new HostStateStore(db, workspace, undefined, undefined, undefined, undefined, root);
    },
    close() {
      db.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

describe('unprepared recovery', () => {
  test('held maintenance and pending FIFO ownership deny even with matching versions', () => {
    for (const fault of ['maintenance', 'fifo']) {
      const f = unpreparedRecoveryFixture();
      try {
        if (fault === 'maintenance') {
          const digest = 'a'.repeat(64),
            fence = {
              schema: 'MaintenanceFence/v1',
              workspace_id: f.workspace,
              revision: 1,
              generation: 1,
              status: 'held',
              token_digest: digest,
              binding: {
                schema: 'MaintenanceFenceBinding/v1',
                project_ids: ['project'],
                operation_id: 'fixture-maintenance',
                manifest_digest: digest,
                request_digest: digest,
                bindings_digest: digest,
                closure_digest: digest,
                bundle_digest: digest,
              },
            };
          f.db
            .query('INSERT INTO agent_host_maintenance VALUES(?,?,?,?)')
            .run(f.workspace, 1, JSON.stringify(fence), canonicalJsonDigest(fence));
        } else {
          const row = f.db.query("SELECT payload FROM agent_host_state WHERE kind='ledger'").get(),
            ledger = JSON.parse(row.payload),
            ticket = ledger.tickets[0];
          ledger.revision++;
          ledger.next_sequence = 3;
          ticket.sequence = 2;
          ledger.tickets.push({
            ...ticket,
            ticket_id: 'earlier-queue',
            thread_id: 'foreign-owner',
            sequence: 1,
            status: 'queued',
            claim_ids: [],
            active_resources: [],
            expires_at: null,
          });
          f.db
            .query("UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE kind='ledger'")
            .run(ledger.revision, JSON.stringify(ledger), canonicalJsonDigest(ledger));
        }
        const before = f.observed();
        expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow(
          fault === 'maintenance' ? /maintenance fence/ : /FIFO conflict/,
        );
        expect(f.observed()).toEqual(before);
      } finally {
        f.close();
      }
    }
  });
  test('failure between Work and Ledger publication rolls back and same request can retry', () => {
    const f = unpreparedRecoveryFixture();
    let spy;
    try {
      const request = f.store.inspectUnpreparedWorkRecovery(f.input),
        before = f.observed(),
        original = Database.prototype.query;
      let updates = 0;
      spy = spyOn(Database.prototype, 'query').mockImplementation(function (sql) {
        if (sql.startsWith('UPDATE agent_host_state SET revision=') && ++updates === 2)
          return {
            run() {
              throw Error('injected ledger publication failure');
            },
          };
        return original.call(this, sql);
      });
      expect(() => f.store.releaseUnpreparedWork(f.input, request)).toThrow(/injected ledger publication/);
      spy.mockRestore();
      spy = undefined;
      expect(f.observed()).toEqual(before);
      expect(f.store.releaseUnpreparedWork(f.input, request).work.execution.status).toBe('suspended');
    } finally {
      spy?.mockRestore();
      f.close();
    }
  });
  test('read-only CLI exposes a retained request; release and lost-ack retry preserve original evidence', async () => {
    const f = unpreparedRecoveryFixture();
    try {
      const baseline = readFileSync(path.join(f.root, 'baseline.yaml'));
      const delivered = baseline.toString('utf8').replace('config_revision: 1', 'config_revision: 2');
      writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), delivered);
      expect(loadRuntimeConfig(f.root).config_revision).toBe(2);
      expect(f.config.config_revision).toBe(1);
      const before = f.observed(),
        base = {
          identity: f.identity,
          attempt: 1,
          baselinePath: 'baseline.yaml',
          decisionPointer: f.input.decisionPointer,
        };
      writeFileSync(path.join(f.root, 'inspect.json'), JSON.stringify(base));
      const args = [
        '--recover-unprepared-work',
        'true',
        '--mode',
        'inspect',
        '--project-root',
        f.root,
        '--native-session-handle',
        f.input.operatorHandle,
        '--request',
        'inspect.json',
      ];
      const inspected = await run(args);
      expect(inspected.next_operation).toBe('release_unprepared_work');
      expect(inspected.rights_granted).toBe(false);
      expect(f.observed()).toEqual(before);
      writeFileSync(path.join(f.root, 'apply.json'), JSON.stringify(inspected.request));
      const apply = args.map((value, index) =>
        args[index - 1] === '--mode' ? 'apply' : args[index - 1] === '--request' ? 'apply.json' : value,
      );
      const released = await run(apply);
      expect(released.status).toBe('unprepared_execution_released');
      expect(released.rights_granted).toBe(false);
      const after = f.observed(),
        state = after.work.find((row) => row.identity.work_id === f.identity.work_id).state;
      expect(state.lease).toBeNull();
      expect(state.execution.status).toBe('suspended');
      expect(state.artifacts).toEqual(before.work[0].state.artifacts);
      expect(state.binding).toEqual(before.work[0].state.binding);
      expect(state.execution.run_id).toBe(before.work[0].state.execution.run_id);
      expect(after.journals).toEqual(before.journals);
      f.reopen();
      expect((await run(apply)).work_version).toEqual(released.work_version);
      expect(f.observed()).toEqual(after);
      expect(readFileSync(path.join(f.root, 'baseline.yaml'))).toEqual(baseline);
      expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(delivered);
      writeFileSync(
        path.join(f.root, 'changed.json'),
        JSON.stringify({ ...inspected.request, decisionPointer: 'user:changed' }),
      );
      await expect(
        run(apply.map((value, index) => (apply[index - 1] === '--request' ? 'changed.json' : value))),
      ).rejects.toThrow();
      expect(f.observed()).toEqual(after);
    } finally {
      f.close();
    }
  });
  test('retained apply rejects current selected project integration and storage drift without effects', async () => {
    for (const fault of ['project', 'integration', 'storage']) {
      const f = unpreparedRecoveryFixture();
      try {
        const base = {
          identity: f.identity,
          attempt: 1,
          baselinePath: 'baseline.yaml',
          decisionPointer: f.input.decisionPointer,
        };
        writeFileSync(path.join(f.root, 'inspect.json'), JSON.stringify(base));
        const args = [
          '--recover-unprepared-work',
          'true',
          '--mode',
          'inspect',
          '--project-root',
          f.root,
          '--native-session-handle',
          f.input.operatorHandle,
          '--request',
          'inspect.json',
        ];
        const inspected = await run(args);
        writeFileSync(path.join(f.root, 'apply.json'), JSON.stringify(inspected.request));
        const baseline = readFileSync(path.join(f.root, 'baseline.yaml'));
        const current = baseline.toString('utf8').replace('config_revision: 1', 'config_revision: 2');
        const delivered =
          fault === 'project'
            ? current.replaceAll('"project"', '"other"')
            : fault === 'integration'
              ? current.replace('tenant_id: local', 'tenant_id: changed')
              : current.replaceAll('work_root: .agent/work', 'work_root: .agent/other');
        writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), delivered);
        expect(loadRuntimeConfig(f.root).config_revision).toBe(2);
        const before = f.observed(),
          engine = readFileSync(f.engineFile);
        expect(() => f.store.releaseUnpreparedWork(f.input, inspected.request.request)).toThrow();
        expect(f.observed()).toEqual(before);
        const apply = args.map((value, index) =>
          args[index - 1] === '--mode' ? 'apply' : args[index - 1] === '--request' ? 'apply.json' : value,
        );
        await expect(run(apply)).rejects.toThrow();
        expect(f.observed()).toEqual(before);
        expect(readFileSync(f.engineFile)).toEqual(engine);
        expect(readFileSync(path.join(f.root, 'baseline.yaml'))).toEqual(baseline);
        expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(delivered);
        expect(existsSync(path.join(f.root, '.agent/other/session-handoff.v1.sqlite'))).toBe(false);
      } finally {
        f.close();
      }
    }
  });
  test('stale Work Ledger maintenance and foreign caller deny without changes', () => {
    const f = unpreparedRecoveryFixture();
    try {
      const request = f.store.inspectUnpreparedWorkRecovery(f.input),
        before = f.observed();
      for (const change of [
        { expectedWork: { ...request.expectedWork, revision: 99 } },
        { expectedLedger: { ...request.expectedLedger, revision: 99 } },
        { expectedMaintenanceGeneration: 99 },
        { operatorHandle: 'foreign' },
        { attempt: 2 },
      ]) {
        expect(() => f.store.releaseUnpreparedWork(f.input, { ...request, ...change })).toThrow();
        expect(f.observed()).toEqual(before);
      }
      expect(() => f.store.inspectUnpreparedWorkRecovery({ ...f.input, operatorHandle: 'foreign' })).toThrow(
        /same-owner/,
      );
      expect(f.observed()).toEqual(before);
    } finally {
      f.close();
    }
  });
  test('missing engine journal and surviving base or unknown alias deny with custody intact', () => {
    for (const fault of ['missing', 'journal', 'base', 'alias', 'malformed', 'correction']) {
      const f = unpreparedRecoveryFixture();
      try {
        if (fault === 'missing') unlinkSync(f.engineFile);
        else if (fault === 'journal') {
          const retained = {
            schema: 'MastraSessionLedger/v1',
            workspace_id: f.workspace,
            work_id: f.identity.work_id,
            attempt: 1,
            run_id: f.store.readHostStateSnapshot(f.identity).work.execution.run_id,
            step_id: null,
            items: [],
            completed: [],
          };
          f.db
            .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
            .run(f.workspace, f.identity.work_id, 1, 1, JSON.stringify(retained), canonicalJsonDigest(retained));
        } else if (fault === 'correction') {
          f.db.exec(
            'CREATE TABLE agent_host_corrective_recovery (workspace_id TEXT,work_id TEXT,attempt INTEGER,generation INTEGER,payload TEXT,digest TEXT)',
          );
          f.db
            .query('INSERT INTO agent_host_corrective_recovery VALUES(?,?,?,?,?,?)')
            .run(f.workspace, f.identity.work_id, 1, 1, '{}', 'a'.repeat(64));
        } else {
          const engine = new Database(f.engineFile),
            runId =
              fault === 'base'
                ? f.store.readHostStateSnapshot(f.identity).work.execution.run_id
                : 'unknown-corrective-alias';
          const state = {
            work_id: f.identity.work_id,
            attempt: 1,
            workflow_id: 'task_execution',
            scope_digest: f.context.scope_digest,
            config_digest: runtimeConfigDigest(f.config),
            selection: {
              team: 'default-development',
              kind: 'task',
              intent: 'task_execution',
              project: 'project',
              risk_flags: [],
              labels: [],
            },
            observations: [],
          };
          engine
            .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)')
            .run(
              'task_execution',
              runId,
              fault === 'malformed' ? '{}' : JSON.stringify({ runId, status: 'suspended', context: { input: state } }),
            );
          engine.close();
        }
        const before = f.observed();
        expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow();
        expect(f.observed()).toEqual(before);
      } finally {
        f.close();
      }
    }
  });
  test.each(['unrelated', 'same-run', 'same-work', 'malformed', 'null', 'json5'])(
    'binary snapshot %s preserves absence controls and engine custody',
    (fault) => {
      const f = unpreparedRecoveryFixture();
      try {
        const workId = fault === 'same-work' ? f.identity.work_id : 'unrelated-work';
        const attempt = fault === 'same-work' ? 2 : 1;
        const runId =
          fault === 'same-run'
            ? f.store.readHostStateSnapshot(f.identity).work.execution.run_id
            : sessionBridgeRunId(f.workspace, { ...f.context, work_id: workId, attempt }, 'task_execution');
        if (fault === 'same-work')
          expect(runId).not.toBe(f.store.readHostStateSnapshot(f.identity).work.execution.run_id);
        if (fault === 'same-run') expect(workId).not.toBe(f.identity.work_id);
        const state = {
          work_id: workId,
          attempt,
          workflow_id: 'task_execution',
          scope_digest: f.context.scope_digest,
          config_digest: runtimeConfigDigest(f.config),
          selection: {
            team: 'default-development',
            kind: 'task',
            intent: 'task_execution',
            project: 'project',
            risk_flags: [],
            labels: [],
          },
          observations: [],
        };
        const snapshot = JSON.stringify({ runId, status: 'success', context: { input: state } });
        const engine = new Database(f.engineFile);
        try {
          if (['malformed', 'null', 'json5'].includes(fault)) {
            engine
              .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)')
              .run(
                'task_execution',
                runId,
                fault === 'null'
                  ? null
                  : fault === 'malformed'
                    ? Buffer.from([255, 238])
                    : snapshot.replace('{', '{/* comment */'),
              );
          } else {
            engine
              .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
              .run('task_execution', runId, snapshot);
            expect(engine.query('SELECT typeof(snapshot) AS kind FROM mastra_workflow_snapshot').get().kind).toBe(
              'blob',
            );
          }
        } finally {
          engine.close();
        }
        const before = f.observed(),
          bytes = readFileSync(f.engineFile);
        if (fault === 'unrelated') {
          const request = f.store.inspectUnpreparedWorkRecovery(f.input);
          expect(f.observed()).toEqual(before);
          expect(f.store.releaseUnpreparedWork(f.input, request).work.execution.status).toBe('suspended');
        } else {
          expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow();
          expect(f.observed()).toEqual(before);
        }
        expect(readFileSync(f.engineFile)).toEqual(bytes);
      } finally {
        f.close();
      }
    },
  );
  test('oversized engine snapshots deny before any payload census fetch', () => {
    const f = unpreparedRecoveryFixture();
    let guard;
    try {
      const engine = new Database(f.engineFile);
      try {
        engine
          .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)')
          .run('unrelated', 'unrelated', 'x'.repeat(8 * 1024 * 1024 + 1));
      } finally {
        engine.close();
      }
      const before = f.observed(),
        query = Database.prototype.query;
      let payloadFetches = 0;
      guard = spyOn(Database.prototype, 'query').mockImplementation(function (sql) {
        if (sql.startsWith('SELECT workflow_name,run_id,')) payloadFetches++;
        return query.call(this, sql);
      });
      expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow('census bytes exceed bound');
      expect(payloadFetches).toBe(0);
      expect(f.observed()).toEqual(before);
    } finally {
      guard?.mockRestore();
      f.close();
    }
  });

  test('decoded JSONB census bytes deny before fetching payloads even when storage fits', () => {
    const f = unpreparedRecoveryFixture();
    let guard;
    try {
      const engine = new Database(f.engineFile);
      try {
        engine
          .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
          .run('unrelated', 'unrelated', JSON.stringify({ padding: Array(1800000).fill(null) }));
        const size = engine
          .query(
            'SELECT length(CAST(snapshot AS BLOB)) AS stored, length(CAST(json(snapshot) AS BLOB)) AS decoded FROM mastra_workflow_snapshot',
          )
          .get();
        expect(size.stored).toBeLessThan(8 * 1024 * 1024);
        expect(size.decoded).toBeGreaterThan(8 * 1024 * 1024);
      } finally {
        engine.close();
      }
      const before = f.observed(),
        bytes = readFileSync(f.engineFile),
        query = Database.prototype.query;
      let payloadFetches = 0;
      guard = spyOn(Database.prototype, 'query').mockImplementation(function (sql) {
        if (sql.startsWith('SELECT workflow_name,run_id,')) payloadFetches++;
        return query.call(this, sql);
      });
      expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow('decoded census bytes exceed bound');
      expect(payloadFetches).toBe(0);
      expect(f.observed()).toEqual(before);
      expect(readFileSync(f.engineFile)).toEqual(bytes);
    } finally {
      guard?.mockRestore();
      f.close();
    }
  });

  test('pending and UNKNOWN producer markers block recovery and remain untouched', () => {
    for (const status of ['reserved', 'commit_unknown']) {
      const f = unpreparedRecoveryFixture();
      try {
        const marker = {
          schema: 'OperationReservation/v1',
          store_id: 'vida-session-producers',
          operation_key: 'b'.repeat(64),
          request_digest: 'c'.repeat(64),
          revision: 1,
          fencing_token: randomUUID(),
          status,
          created_at: new Date().toISOString(),
          ...(status === 'commit_unknown' ? { terminal_revision: 2 } : {}),
        };
        const generation = randomUUID();
        f.db.query('INSERT INTO agent_host_governance_stores VALUES(?,?,?,?)').run(
          f.workspace,
          marker.store_id,
          generation,
          canonicalJsonDigest({
            workspace_id: f.workspace,
            store_id: marker.store_id,
            kind: 'store',
            record_key: generation,
            revision: 1,
            payload: null,
          }),
        );
        f.db.query('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)').run(
          f.workspace,
          marker.store_id,
          'operation',
          marker.operation_key,
          status === 'reserved' ? 1 : 2,
          JSON.stringify(marker),
          canonicalJsonDigest({
            workspace_id: f.workspace,
            store_id: marker.store_id,
            kind: 'operation',
            record_key: marker.operation_key,
            revision: status === 'reserved' ? 1 : 2,
            payload: marker,
          }),
        );
        const before = f.observed();
        expect(() => f.store.inspectUnpreparedWorkRecovery(f.input)).toThrow(/pending or unknown/);
        expect(f.observed()).toEqual(before);
      } finally {
        f.close();
      }
    }
  });
  test('producer reservation cannot race the engine census held by recovery apply', () => {
    const f = unpreparedRecoveryFixture();
    let peer, spy;
    try {
      const request = f.store.inspectUnpreparedWorkRecovery(f.input);
      peer = openConfiguredMastraSessionLedger(f.root);
      const original = Database.prototype.query;
      let attempted = false;
      spy = spyOn(Database.prototype, 'query').mockImplementation(function (sql) {
        if (sql.startsWith('SELECT count(*) AS count,') && !attempted) {
          attempted = true;
          expect(() =>
            peer.beginSessionProducer({
              repositoryRoot: f.root,
              config: f.config,
              projectIds: ['project'],
              selection: {
                team: 'default-development',
                kind: 'task',
                intent: 'task_execution',
                project: 'project',
                risk_flags: [],
                labels: [],
              },
              context: f.context,
              workflowId: 'task_execution',
              runId: request.originalWork.execution.run_id,
              phase: 'start',
            }),
          ).toThrow(/locked|busy/i);
        }
        return original.call(this, sql);
      });
      f.store.releaseUnpreparedWork(f.input, request);
      expect(attempted).toBe(true);
      expect(f.observed().governance).toEqual([]);
    } finally {
      spy?.mockRestore();
      peer?.close();
      f.close();
    }
  });
});
const phaseBudget = executionBudget(undefined, 30_000);
const copiedEntries = [
  'src',
  'dist',
  'bin',
  'tooling',
  'schemas',
  'instructions',
  'templates',
  'package.json',
  'TESTING.md',
  'bun.lock',
  '.bun-version',
];
let sharedRecoveryBundle;
let sharedRecoveryRoot;
let sharedRecoveryBinding;
let recoveryOutcomeUnknown = false;

function copiedPackageBinding(bundle) {
  const access = requireSafeRepositoryAccess(bundle);
  const files = copiedEntries
    .flatMap((entry) => {
      if (!lstatSync(path.join(bundle, entry)).isDirectory()) return [entry];
      return readdirSync(path.join(bundle, entry), { recursive: true })
        .map((file) => path.posix.join(entry, file.replaceAll(path.sep, '/')))
        .filter((file) => lstatSync(path.join(bundle, file)).isFile());
    })
    .sort();
  const snapshots = [];
  for (let index = 0; index < files.length; index += 512)
    snapshots.push(snapshotDeclaredSources(access, files.slice(index, index + 512)));
  return canonicalJsonDigest(snapshots);
}

function recoveryBundle() {
  if (recoveryOutcomeUnknown) throw new Error('Prior recovery child outcome prevents shared fixture reuse.');
  if (sharedRecoveryBundle) {
    if (copiedPackageBinding(sharedRecoveryBundle) !== sharedRecoveryBinding) {
      recoveryOutcomeUnknown = true;
      throw new Error('Shared copied package changed before recovery route.');
    }
    return sharedRecoveryBundle;
  }
  const started = performance.now();
  sharedRecoveryRoot = mkdtempSync(path.join(tmpdir(), 'vida-recovery-package-'));
  sharedRecoveryBundle = path.join(sharedRecoveryRoot, 'tools', 'agents');
  mkdirSync(sharedRecoveryBundle, { recursive: true });
  for (const entry of copiedEntries)
    cpSync(path.join(packageRoot, entry), path.join(sharedRecoveryBundle, entry), {
      recursive: true,
      dereference: false,
      filter: (source) => path.resolve(source) !== path.join(packageRoot, 'dist', 'standalone'),
    });
  symlinkSync(
    path.join(packageRoot, 'node_modules'),
    path.join(sharedRecoveryBundle, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  sharedRecoveryBinding = copiedPackageBinding(sharedRecoveryBundle);
  phaseBudget.remaining();
  process.stderr.write(
    JSON.stringify({ stage: 'shared recovery package preparation', elapsed_ms: performance.now() - started }) + '\n',
  );
  return sharedRecoveryBundle;
}
afterAll(() => {
  if (sharedRecoveryRoot && !recoveryOutcomeUnknown) rmSync(sharedRecoveryRoot, { recursive: true, force: true });
});
const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-run-uninitialized-'));
afterAll(() => rmSync(repositoryRoot, { recursive: true, force: true }));
writeFileSync(
  path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'),
  readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{REPOSITORY}}', 'fixture-repository')
    .replaceAll('{{PROJECT}}', 'fixture-project')
    .replaceAll('{{BUNDLE}}', 'vida-agent'),
);
writeFileSync(path.join(repositoryRoot, 'AGENTS.md'), '# Uninitialized fixture\n');
writeFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), '# Uninitialized fixture\n');
const launcher = path.join(packageRoot, 'bin', 'run.mjs');
const mutationMode = process.env.AGENT_RUNTIME_MUTATION_PART === 'bun';
const v8CoverageMode = process.env.AGENT_RUNTIME_V8_COVERAGE === '1';
const ordinaryDescribe = mutationMode ? describe.skip : describe;
const liveInstallTest = v8CoverageMode ? test.skip : test;

test('durable controller publication cleans only its own pending file when publication fails', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-durable-fault-'));
  try {
    const target = path.join(root, 'occupied');
    mkdirSync(target);
    expect(() => writeDurable(target, { schema: 'FixtureController/v1' })).toThrow();
    expect(readdirSync(root)).toEqual(['occupied']);
    expect(readdirSync(target)).toEqual([]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('cutoff SQLite exclusion rejects a live owner and recovers after process termination without an orphan marker', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-cutoff-process-'));
  let child;
  try {
    for (const file of ['agent-runtime.config.v1.yaml', 'AGENTS.md', 'AGENT.sidecar.md'])
      writeFileSync(path.join(root, file), readFileSync(path.join(repositoryRoot, file)));
    const generationRoot = path.join(root, '.agent', 'cutover', 'fixture-generation');
    mkdirSync(generationRoot, { recursive: true });
    const selectorBytes = Buffer.from(JSON.stringify({ schema: 'FixtureSelector', generation: 'fixture-generation' }));
    const selectorSha = createHash('sha256').update(selectorBytes).digest('hex');
    writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), selectorBytes);
    const witnessPath = path.join(generationRoot, 'cutoff-witness.json');
    writeFileSync(
      witnessPath,
      JSON.stringify(
        {
          schema: 'VidaNewWorkCutoffWitness/v1',
          generation: 'fixture-generation',
          selector_sha256: selectorSha,
          first_admitted_work_attempt: null,
        },
        null,
        2,
      ) + '\n',
    );
    const config = loadRuntimeConfig(root);
    mkdirSync(path.join(root, config.control.work_root), { recursive: true });
    const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
    const sourceUrl = pathToFileURL(path.join(packageRoot, 'src', 'host-state.ts')).href;
    child = spawn(
      process.execPath,
      [
        '-e',
        `import {withHostStateExclusiveTransaction} from ${JSON.stringify(sourceUrl)};
    withHostStateExclusiveTransaction(${JSON.stringify(databasePath)},()=>{process.stdout.write('locked\\n');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);});`,
      ],
      { cwd: packageRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const exited = new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })));
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('fixture writer did not acquire SQLite exclusion')), 10000);
      child.stdout.once('data', (bytes) => {
        clearTimeout(timer);
        bytes.toString().includes('locked') ? resolve() : reject(Error('unexpected child output'));
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const selector = { generationRoot, generation: 'fixture-generation', selectorSha };
    const values = {
      project_root: root,
      repository: 'fixture-repository',
      work_id: 'new-work',
      attempt: '1',
      scope_digest: 'a'.repeat(64),
    };
    await expect(advanceCutoff(selector, values)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CUTOFF-001' });
    expect(JSON.parse(readFileSync(witnessPath)).first_admitted_work_attempt).toBeNull();
    child.kill('SIGKILL');
    await exited;
    await advanceCutoff(selector, values);
    expect(JSON.parse(readFileSync(witnessPath)).first_admitted_work_attempt).toBe(
      'fixture-repository/new-work/1/' + values.scope_digest,
    );
    expect(existsSync(path.join(generationRoot, 'cutoff-witness.lock'))).toBe(false);
  } finally {
    if (child?.exitCode === null && child?.signalCode === null) child.kill('SIGKILL');
    rmSync(root, { recursive: true, force: true });
  }
}, 20000);
const common = [
  '--project-root',
  repositoryRoot,
  '--repository',
  'fixture-repository',
  '--project',
  'fixture-project',
  '--work-path',
  'agent-runtime-new',
  '--work-id',
  'work-17',
  '--attempt',
  '2',
  '--scope-digest',
  'a'.repeat(64),
  '--team',
  'default-development',
  '--kind',
  'research',
  '--intent',
  'information_research',
];

function invoke(args, env = {}) {
  return spawnSync('bun', [launcher, ...args], {
    cwd: packageRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    windowsHide: true,
  });
}

describe('vida-agent run entrypoint fast checks', () => {
  test('blocks admission while the selected cutover still holds maintenance', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-maintenance-'));
    try {
      writeFileSync(path.join(root, 'maintenance-lock.v1.json'), '{}\n');
      let blocked;
      try {
        assertNoActiveCutoverMaintenance({ generationRoot: root });
      } catch (error) {
        blocked = error;
      }
      expect(blocked).toMatchObject({
        code: 'GAP-VIDA-RUN-SELECTOR-001',
        message: 'Cutover maintenance is still active.',
      });
      unlinkSync(path.join(root, 'maintenance-lock.v1.json'));
      expect(() => assertNoActiveCutoverMaintenance({ generationRoot: root })).toThrow('authority');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects incomplete or malformed CAS versions before opening a report', async () => {
    const args = [...common, '--workflow', 'information_research_light'];
    for (const extra of [
      ['--issue-wave', 'true'],
      ['--issue-wave', 'true', '--expected-revision', '0', '--expected-digest', 'a'.repeat(64)],
      ['--issue-wave', 'true', '--expected-revision', '2', '--expected-digest', 'not-a-digest'],
      ['--report', 'relative.json', '--expected-revision', '2', '--expected-digest', 'a'.repeat(64)],
    ]) {
      await expect(run([...args, ...extra])).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
    }
  });

  test('selects an equal-root work path from one explicit project and fails closed on ambiguous or foreign roots', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-run-project-membership-'));
    try {
      for (const directory of ['products/shared', 'products/foreign'])
        mkdirSync(path.join(root, directory), { recursive: true });
      await initializeProject({
        projectRoot: root,
        repository: 'shared-run-fixture',
        projectMappings: [
          'alpha=products/shared',
          'peer=products/shared',
          'broad=products',
          'foreign=products/foreign',
        ],
      });
      const base = [
        '--project-root',
        root,
        '--repository',
        'shared-run-fixture',
        '--work-id',
        'membership-work',
        '--attempt',
        '1',
        '--scope-digest',
        'a'.repeat(64),
        '--team',
        'default-development',
        '--kind',
        'research',
        '--intent',
        'information_research',
        '--workflow',
        'unsupported-for-membership-check',
      ];
      const invokeRoot = (args) =>
        spawnSync('bun', [launcher, ...args], {
          cwd: packageRoot,
          encoding: 'utf8',
          windowsHide: true,
        });
      const chosenEqualMember = invokeRoot([
        ...base,
        '--project',
        'alpha',
        '--work-path',
        'products/shared/src/probe.ts',
      ]);
      expect(JSON.parse(chosenEqualMember.stderr).code).toBe('GAP-VIDA-RUN-WORKFLOW-001');
      const outsideRoot = invokeRoot([...base, '--project', 'alpha', '--work-path', 'wiki/skills/guide.md']);
      expect(JSON.parse(outsideRoot.stderr).code).toBe('GAP-VIDA-RUN-WORKFLOW-001');
      const ambiguous = invokeRoot([
        ...base,
        '--project',
        'alpha',
        '--project',
        'peer',
        '--work-path',
        'products/shared/src/probe.ts',
      ]);
      expect(JSON.parse(ambiguous.stderr).code).toBe('GAP-VIDA-RUN-CONTEXT-001');
      const nestedForeign = invokeRoot([...base, '--project', 'broad', '--work-path', 'products/foreign/src/probe.ts']);
      expect(JSON.parse(nestedForeign.stderr).code).toBe('GAP-VIDA-RUN-CONTEXT-001');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }, 60_000);
});

ordinaryDescribe('vida-agent run entrypoint', () => {
  test('requires every explicit argument and rejects raw authority inputs', () => {
    const missing = invoke(common);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe('');
    expect(missing.stderr).toContain('GAP-VIDA-RUN-CLI-001');
    const rawThread = invoke([...common, '--workflow', 'information_research_light', '--thread-id', 'forged']);
    expect(rawThread.status).toBe(1);
    expect(rawThread.stderr).toContain('GAP-VIDA-RUN-CLI-001');
    const legacyTenant = invoke([
      '--project-root',
      repositoryRoot,
      '--tenant',
      'legacy-tenant',
      '--project',
      'fixture-project',
      '--work-path',
      'agent-runtime-new',
      '--work-id',
      'work-17',
      '--attempt',
      '2',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ]);
    expect(legacyTenant.status).toBe(1);
    expect(legacyTenant.stderr).toContain('GAP-VIDA-RUN-CLI-001');
  });

  test('blocks before workflow selection when the trusted initialization binding is absent', () => {
    const result = invoke([...common, '--workflow', 'information_research_light']);
    expect(result.status).toBe(1);
    const payload = JSON.parse(result.stderr);
    expect(payload).toMatchObject({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-CONTEXT-001',
    });
  });

  test('accepts a repeatable exact project set before trusted-host binding', () => {
    const result = invoke([
      '--project-root',
      repositoryRoot,
      '--repository',
      'fixture-repository',
      '--project',
      'fixture-project',
      '--project',
      'second-project',
      '--work-path',
      'agent-runtime-new',
      '--work-id',
      'work-17',
      '--attempt',
      '2',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr).code).toBe('GAP-VIDA-RUN-CONTEXT-001');
    expect(result.stderr).not.toContain('GAP-VIDA-RUN-CLI-001');
  });

  test('does not bypass trusted initialization for a workflow ID that is not configured', () => {
    const result = invoke([...common, '--workflow', 'task_execution']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('GAP-VIDA-RUN-CONTEXT-001');
  });

  test('does not use process environment as project or thread authority', () => {
    const result = invoke([...common, '--workflow', 'information_research_light'], {
      VIDA_PROJECT_ROOT: repositoryRoot,
      CODEX_THREAD_ID: 'forged',
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('GAP-VIDA-RUN-CONTEXT-001');
    expect(result.stderr).not.toContain('forged');
  });

  test('redacts absolute roots and config-derived diagnostics with a bounded stable error', () => {
    const secret = 'run-secret-' + 'x'.repeat(5000);
    const invalidRoot = path.join(repositoryRoot, secret);
    const result = invoke([
      '--project-root',
      invalidRoot,
      '--repository',
      'fixture-repository',
      '--project',
      'fixture-project',
      '--work-path',
      'agent-runtime-new',
      '--work-id',
      'work-17',
      '--attempt',
      '2',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ]);
    expect(result.status).toBe(1);
    expect(JSON.parse(result.stderr)).toEqual({
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-CLI-004',
      message: expect.stringMatching(
        /^The project root is unavailable or is not a canonical directory\. Next action: /,
      ),
    });
    expect(result.stderr).not.toContain(invalidRoot);
    expect(result.stderr.length).toBeLessThan(512);
  });

  const researchFirstRoutes = [
    { workflow: 'information_research_light', kind: 'research', intent: 'information_research' },
    { workflow: 'implementation_new', kind: 'feature', intent: 'implementation_new' },
    { workflow: 'implementation_change', kind: 'task', intent: 'implementation_change' },
    { workflow: 'bug_fix', kind: 'bug', intent: 'bug_fix' },
  ];
  for (const route of researchFirstRoutes)
    liveInstallTest(
      `copied bundle recovers interrupted ${route.workflow} research preparation by CAS`,
      async () => {
        const budget = phaseBudget.child(180_000);
        const root = mkdtempSync(path.join(tmpdir(), 'vida-run-session-'));
        try {
          const bundle = recoveryBundle();
          mkdirSync(path.join(root, 'tools', 'agents'), { recursive: true });
          const externalConfig = path.join(root, 'source-config.yaml');
          writeFileSync(
            externalConfig,
            readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
              .replaceAll('{{REPOSITORY}}', 'ignored-repository')
              .replaceAll('{{PROJECT}}', 'ignored-project')
              .replaceAll('{{BUNDLE}}', 'ignored-runtime'),
          );
          const invokeCopy = (args, env = {}) => {
            const result = boundedSpawnSync(
              spawnSync,
              process.execPath,
              args,
              {
                cwd: bundle,
                encoding: 'utf8',
                windowsHide: true,
                env: pinnedEnvironment(process.execPath, { ...process.env, ...env }, bundle),
                timeout: 180_000,
                budget,
                diagnostics: true,
              },
              `recovery ${route.workflow}/${path.basename(args[0])}`,
            );
            if (commandOutcomeUnknown(result)) recoveryOutcomeUnknown = true;
            return requireTerminalCommand(result, `recovery ${route.workflow}/${path.basename(args[0])}`);
          };
          const initialized = invokeCopy(
            [
              path.join(bundle, 'bin/init.mjs'),
              '--project-root',
              root,
              '--repository',
              'different-repository',
              '--project',
              'different-project',
            ],
            { AGENT_RUNTIME_CONFIG: externalConfig },
          );
          expect(initialized.status, initialized.stderr).toBe(0);
          expect(loadRuntimeConfig(root).runtime.bundle).toBe('vida-agent');
          expect(
            JSON.parse(readFileSync(path.join(root, '.agent/runtime-initialization.v1.json'), 'utf8')).bundle,
          ).toBe('vida-agent');
          const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
          const workDir = path.join(root, '.agent', 'work', 'session-work');
          mkdirSync(workDir, { recursive: true });
          const relative = (name) => `.agent/work/session-work/${name}`;
          const put = (name, value) => writeFileSync(path.join(workDir, name), JSON.stringify(value));
          put('scope.json', {
            schema: 'ImplementationScope/v1',
            scope_id: 'session-scope',
            work_id: 'session-work',
            source_revision: source.digest,
            ac_ids: ['AC-RESEARCH-1'],
            allowed_paths: ['AGENT.sidecar.md'],
            implementation_paths: ['AGENT.sidecar.md'],
            documentation_paths: [],
            changed_symbols: [],
            non_goals: ['Source mutation'],
            acceptance_trace: ['AC-RESEARCH-1'],
            behavior_trace: ['SR-RESEARCH-1'],
            test_trace: ['parallel wave and CAS fixture'],
            diagnostic_trace: ['fixture'],
            attribution: { thread_id: 'fixture-native-session', pointer: relative('intake.json') },
            owner: 'fixture',
            created_at: new Date().toISOString(),
          });
          put('acceptance.json', {
            schema: 'AcceptanceManifest/v1',
            id: 'session-acceptance',
            version: 1,
            ac_ids: ['AC-RESEARCH-1'],
            source: 'AGENT.sidecar.md',
            scope: 'session-scope',
            source_revision: source.digest,
            contracts: [
              {
                id: 'AC-RESEARCH-1',
                definition: 'Inspect the fixture without source mutation.',
                sr: 'SR-RESEARCH-1',
                evidence: ['fixture'],
              },
            ],
          });
          put('intake.json', {
            schema: 'VidaLocalSessionIntake/v1',
            native_session_handle: 'fixture-native-session',
            work_item: {
              schema: 'WorkItem/v1',
              id: 'session-work',
              provider: 'local',
              provider_type: 'Research',
              canonical_kind: route.kind,
              intent: route.intent,
              project_id: 'different-project',
              title: 'Read-only parallel research fixture',
              description: '',
              labels: [],
              risk_flags: [],
            },
            scope_path: relative('scope.json'),
            acceptance_path: relative('acceptance.json'),
            runtime_code_paths: ['vida-agent/bin/run.mjs'],
            route: 'R2',
            risk: 'low',
            change_kind: 'fix',
          });
          const args = [
            path.join(bundle, 'bin/run.mjs'),
            '--project-root',
            root,
            '--repository',
            'different-repository',
            '--project',
            'different-project',
            '--work-path',
            'tools/agents',
            '--work-id',
            'session-work',
            '--attempt',
            '1',
            '--scope-digest',
            source.digest,
            '--team',
            'default-development',
            '--kind',
            route.kind,
            '--intent',
            route.intent,
            '--workflow',
            route.workflow,
          ];
          const call = (extra = []) => {
            const result = invokeCopy([...args, ...extra]);
            return {
              ...result,
              payload: JSON.parse(
                (result.status === 0 ? result.stdout : result.stderr)
                  .split('\n')
                  .filter((line) => !line.startsWith('runtime call: '))
                  .join('\n'),
              ),
            };
          };
          const prepared = call(['--intake', path.join(workDir, 'intake.json')]);
          expect(prepared.status, prepared.stderr).toBe(0);
          const admittedIntake = JSON.parse(readFileSync(path.join(workDir, 'local-session-intake.v1.json'), 'utf8'));
          expect(admittedIntake.runtime_code_paths).toContain('vida-agent/bin/run.mjs');
          expect(admittedIntake.runtime_code_paths.every((file) => file.startsWith('vida-agent/'))).toBe(true);
          expect(prepared.payload.next_actions.length).toBeGreaterThan(1);
          const expected = (version) => [
            '--expected-revision',
            String(version.revision),
            '--expected-digest',
            version.digest,
          ];
          // Fail after durable issue reservation but before activation history append.
          // A live lock owner simulates a local preparation interruption without
          // making the external issued_actions response possible.
          const activationHistory = path.join(root, '.agent/work/session-work/instruction-activation-history.jsonl');
          writeFileSync(
            `${activationHistory}.lock.lock`,
            JSON.stringify({
              schema: 'SafeRepositoryAccessLock/v1',
              owner_pid: process.pid,
            }),
          );
          const interrupted = call([...expected(prepared.payload.state_version), '--issue-wave', 'true']);
          expect(interrupted.status, interrupted.stderr).toBe(1);
          unlinkSync(`${activationHistory}.lock.lock`);
          const { openConfiguredMastraSessionLedger } =
            await import('../src/orchestration/persistent-session-handoff.ts');
          const interruptedLedger = openConfiguredMastraSessionLedger(root);
          const interruptedSnapshot = interruptedLedger.resume('session-work', 1);
          interruptedLedger.close();
          expect(interruptedSnapshot?.state.research_wave_exposure).toBe('preparing');
          const reservedIssues = interruptedSnapshot.state.items
            .filter((item) => item.issue_id !== null)
            .map((item) => ({ action_id: item.request.action_id, issue_id: item.issue_id }));
          expect(reservedIssues).toHaveLength(prepared.payload.next_actions.length);
          expect(interruptedSnapshot.state.items.filter((item) => item.research_activation)).toHaveLength(1);
          expect(existsSync(activationHistory)).toBe(false);
          const preparationStatus = call();
          expect(preparationStatus.status, preparationStatus.stderr).toBe(0);
          expect(preparationStatus.payload.research_preparation_status).toBe('preparation_incomplete');
          expect(
            preparationStatus.payload.action_statuses.every(
              (item) => item.status === 'research_preparation_incomplete',
            ),
          ).toBe(true);

          const issued = call([...expected(interruptedSnapshot.version), '--issue-wave', 'true']);
          expect(issued.status, issued.stderr).toBe(0);
          expect(issued.payload.status).toBe('wave_recovered');
          expect(issued.payload.research_preparation_status).toBe('exposure_possible');
          expect(issued.payload.action_statuses.every((item) => item.status === 'issued_outcome_uncertain')).toBe(true);
          expect(
            issued.payload.issued_actions.every(
              (item) =>
                item.action.resolved_profile?.schema === 'ResolvedAgentProfile/v1' &&
                item.action.resolved_profile.enforcement_status === 'not_asserted',
            ),
          ).toBe(true);
          expect(issued.payload.issued_actions.map((item) => item.request.action_id)).toEqual(
            prepared.payload.next_actions.map((item) => item.request.action_id),
          );
          expect(
            issued.payload.issued_actions.map(({ request, issue_id }) => ({ action_id: request.action_id, issue_id })),
          ).toEqual(reservedIssues);
          expect(issued.payload.issued_actions.every((item) => item.instruction_activation)).toBe(true);
          expect(new Set(issued.payload.issued_actions.map((item) => item.issue_id)).size).toBe(
            issued.payload.issued_actions.length,
          );
          const stale = call([...expected(issued.payload.state_version), '--issue-wave', 'true']);
          expect(stale.status).toBe(1);
          const mixed = call([
            ...expected(issued.payload.state_version),
            '--issue-wave',
            'true',
            '--report',
            path.join(root, 'report.json'),
          ]);
          expect(mixed.status).toBe(1);
          expect(mixed.payload.code).toBe('GAP-VIDA-RUN-CLI-001');
          const reportFile = path.join(root, 'report.json');
          writeFileSync(reportFile, 'x'.repeat(32769));
          const oversized = call([...expected(issued.payload.state_version), '--report', reportFile]);
          expect(oversized.status).toBe(1);
          expect(oversized.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
          writeFileSync(reportFile, '{');
          const malformed = call([...expected(issued.payload.state_version), '--report', reportFile]);
          expect(malformed.status).toBe(1);
          expect(malformed.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
          writeFileSync(reportFile, '{}');
          const secondLink = path.join(root, 'report-hardlink.json');
          linkSync(reportFile, secondLink);
          const linked = call([...expected(issued.payload.state_version), '--report', reportFile]);
          expect(linked.status).toBe(1);
          expect(linked.payload.code).toBe('GAP-VIDA-RUN-REPORT-001');
          unlinkSync(secondLink);
          let version = issued.payload.state_version;
          let final;
          for (const item of issued.payload.issued_actions) {
            const action = item.request;
            const sourceId = `fixture-source-${action.assignment_index}`;
            const summary = JSON.stringify({
              schema: 'VidaResearchObservationOutput/v1',
              topic: `Read-only fixture research ${action.assignment_index}`,
              objective: 'Inspect fixture source without changing code.',
              question: 'What does the fixture show?',
              source_refs: [
                {
                  source_id: sourceId,
                  source_kind: 'internal',
                  locator: `AGENT.sidecar.md#fixture-${action.assignment_index}`,
                  title: 'Fixture sidecar',
                  claim: 'AC-RESEARCH-1 SR-RESEARCH-1: this fixture is read-only research.',
                  retrieved_at: '2026-09-30T00:00:00Z',
                  version_or_date: '2026-09-30',
                  independence_group: 'fixture',
                  digest: source.entries[0].sha256,
                },
              ],
              findings: [
                {
                  finding_id: `fixture-${action.assignment_index}`,
                  statement: 'The fixture source is present.',
                  source_ids: [sourceId],
                  evidence_class: 'Code',
                  status: 'confirmed',
                },
              ],
              evidence_classes: ['Code'],
              uncertainties: [],
              conflicts: [],
              br_ids: [],
              sr_ids: ['SR-RESEARCH-1'],
              ac_ids: ['AC-RESEARCH-1'],
              gap_ids: [],
              options: [
                {
                  option_id: 'retain',
                  label: 'Retain evidence',
                  description: 'Preserve the read-only finding.',
                  evidence_refs: [sourceId],
                },
              ],
              recommendation: {
                option_id: 'retain',
                rationale: 'Fixture source supports the finding.',
                evidence_refs: [sourceId],
              },
              completeness: {
                status: 'pass',
                required_questions: ['What does the fixture show?'],
                answered_questions: ['What does the fixture show?'],
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
              readiness: 'informational',
            });
            const outcome = {
              schema: 'VidaSessionObservation/v1',
              action_id: action.action_id,
              issue_id: item.issue_id,
              agent_id: `test-${action.assignment_index}`,
              tool_call_ref: `tool-${action.assignment_index}`,
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: [sourceId],
            };
            if (action.assignment_index === 0) {
              writeFileSync(reportFile, JSON.stringify({ ...outcome, action_id: 'wrong-action' }));
              const mismatched = call([...expected(version), '--report', reportFile]);
              expect(mismatched.status).toBe(1);
              expect(call().payload.state_version).toEqual(version);
            }
            writeFileSync(reportFile, JSON.stringify(outcome));
            final = call([...expected(version), '--report', reportFile]);
            expect(final.status, final.stderr).toBe(0);
            version = final.payload.state_version;
          }
          expect(final.payload.resume_status).toBe('ready');
          expect(final.payload.next_actions.length).toBeGreaterThan(0);
          expect(final.payload.next_actions[0].request.wave_index).toBe(1);
          const replay = call([...expected(version), '--report', path.join(root, 'report.json')]);
          expect(replay.status).toBe(0);
          expect(replay.payload.status).toBe('report_retrieved');
          expect(replay.payload.state_version).toEqual(final.payload.state_version);
          expect(replay.payload.issued_actions).toEqual([]);
        } finally {
          if (sharedRecoveryBundle && !recoveryOutcomeUnknown) {
            const started = performance.now();
            const observedBinding = copiedPackageBinding(sharedRecoveryBundle);
            if (observedBinding !== sharedRecoveryBinding) recoveryOutcomeUnknown = true;
            expect(observedBinding).toBe(sharedRecoveryBinding);
            process.stderr.write(
              JSON.stringify({
                stage: `recovery ${route.workflow} package immutability`,
                elapsed_ms: performance.now() - started,
              }) + '\n',
            );
            rmSync(root, { recursive: true, force: true });
          }
        }
      },
      180_000,
    );
});

if (mutationMode || v8CoverageMode) {
  const record = (value) => `${JSON.stringify(value, null, 2)}\n`;
  const createFixture = (root, bundleName = 'agent-runtime-new', multiProject = false) => {
    const fixtureBundle = path.join(root, bundleName);
    if (bundleName === 'vida-agent') {
      mkdirSync(fixtureBundle);
      for (const entry of [
        'src',
        'dist',
        'bin',
        'tooling',
        'schemas',
        'instructions',
        'templates',
        'package.json',
        'TESTING.md',
        'bun.lock',
        '.bun-version',
      ])
        cpSync(path.join(packageRoot, entry), path.join(fixtureBundle, entry), {
          recursive: true,
          dereference: false,
          filter: (source) => path.resolve(source) !== path.join(packageRoot, 'dist', 'standalone'),
        });
      symlinkSync(
        path.join(packageRoot, 'node_modules'),
        path.join(fixtureBundle, 'node_modules'),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
    } else {
      mkdirSync(path.join(fixtureBundle, 'schemas'), { recursive: true });
      cpSync(
        path.join(packageRoot, 'schemas', 'runtime-initialization.v1.schema.json'),
        path.join(fixtureBundle, 'schemas', 'runtime-initialization.v1.schema.json'),
      );
      cpSync(path.join(packageRoot, 'TESTING.md'), path.join(fixtureBundle, 'TESTING.md'));
    }
    writeFileSync(path.join(root, 'AGENTS.md'), '# Mutation fixture\n');
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Mutation fixture\n');
    let configText = readFileSync(path.join(packageRoot, 'templates', 'agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'mutation-repository')
      .replaceAll('{{PROJECT}}', 'mutation-project')
      .replaceAll('{{BUNDLE}}', bundleName);
    if (multiProject) {
      configText = configText.replaceAll('\r\n', '\n');
      const projectBlock = configText.match(/(?<=\nprojects:\n)[\s\S]*?(?=\nagents:)/)?.[0];
      if (!projectBlock) throw new Error('Mutation fixture project template is missing.');
      mkdirSync(path.join(root, 'mutation-project-root', bundleName), { recursive: true });
      mkdirSync(path.join(root, 'alpha-project-root'));
      configText = configText.replace(
        projectBlock,
        projectBlock.replace('    project_root: .', '    project_root: mutation-project-root') +
          '\n' +
          projectBlock
            .replaceAll('mutation-project', 'alpha-project')
            .replace('    project_root: .', '    project_root: alpha-project-root'),
      );
      configText = configText.replace(
        '\nruntime:',
        '\n    - id: local-alpha-project\n      provider: local\n      project_id: "alpha-project"\n      tenant_id: local\n      namespace: "alpha-project"\nruntime:',
      );
    }
    writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), configText);
    const config = loadRuntimeConfig(root);
    const schema = readFileSync(path.join(fixtureBundle, 'schemas', 'runtime-initialization.v1.schema.json'));
    const initializationPath = path.join(root, '.agent', 'runtime-initialization.v1.json');
    const initialization = {
      schema: 'RuntimeInitialization/v1',
      version: 1,
      repository_id: config.repository.repository_id,
      project_ids: config.projects.map((project) => project.project_id).sort(),
      integrations_digest: canonicalJsonDigest(config.integrations),
      workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
      workspace_binding_status: 'pending',
      bundle: config.runtime.bundle,
      config_digest: runtimeConfigDigest(config),
      schema_sha256: createHash('sha256').update(schema).digest('hex'),
      templates: [],
      created_at: new Date().toISOString(),
    };
    mkdirSync(path.dirname(initializationPath), { recursive: true });
    writeFileSync(initializationPath, record(initialization));
    const args = [
      '--project-root',
      root,
      '--repository',
      'mutation-repository',
      '--project',
      'mutation-project',
      '--work-path',
      multiProject ? `mutation-project-root/${bundleName}` : bundleName,
      '--work-id',
      `mutation-run-${randomUUID()}`,
      '--attempt',
      '1',
      '--scope-digest',
      'a'.repeat(64),
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
    ];
    return { args, initialization, initializationPath, fixtureBundle };
  };

  describe('vida-agent run mutation path', () => {
    test('rejects unsafe roots and identifiers before reading project authority', async () => {
      const args = [...common, '--workflow', 'information_research_light'];
      const withValue = (key, value) => args.map((entry, index) => (args[index - 1] === key ? value : entry));
      for (const [candidate, code] of [
        [withValue('--project-root', 'relative-root'), 'GAP-VIDA-RUN-CLI-002'],
        [withValue('--project-root', path.join(tmpdir(), `vida-run-absent-${randomUUID()}`)), 'GAP-VIDA-RUN-CLI-004'],
        [withValue('--repository', 'Uppercase'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--project', 'invalid_project'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--work-id', 'unsafe/id'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--attempt', '0'), 'GAP-VIDA-RUN-CLI-003'],
        [withValue('--scope-digest', 'z'.repeat(64)), 'GAP-VIDA-RUN-CLI-003'],
      ]) {
        await expect(run(candidate)).rejects.toMatchObject({ code });
      }
    });

    test('rejects invalid initialization status and an escaping work path without creating work', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-context-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        writeFileSync(initializationPath, record({ ...initialization, workspace_binding_status: 'unknown' }));
        await expect(run(args)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message: 'Runtime initialization status is invalid.',
        });
        writeFileSync(initializationPath, record(initialization));
        const escaping = args.map((entry, index) => (args[index - 1] === '--work-path' ? '../escape' : entry));
        await expect(run(escaping)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message: 'The work path is not bound to the selected project context.',
        });
        expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('rejects a changed scope for a persisted attempt before issuing its wave', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-persisted-'));
      try {
        const { args } = createFixture(root);
        const prepared = await run(args);
        const changed = args.map((entry, index) => (args[index - 1] === '--scope-digest' ? 'b'.repeat(64) : entry));
        await expect(
          run([
            ...changed,
            '--expected-revision',
            String(prepared.state_version.revision),
            '--expected-digest',
            prepared.state_version.digest,
            '--issue-wave',
            'true',
          ]),
        ).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CONTEXT-001',
          message: 'The persisted attempt differs from the current launcher context.',
        });
        expect((await run(args)).state_version).toEqual(prepared.state_version);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('rejects incomplete selector authority before project context', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-selector-'));
      try {
        mkdirSync(path.join(root, '.agent', 'cutover'), { recursive: true });
        writeFileSync(path.join(root, '.agent', 'cutover', 'incomplete'), 'x');
        const args = [...common].map((value, index) =>
          common[index - 1] === '--project-root'
            ? root
            : common[index - 1] === '--work-id'
              ? `mutation-run-${randomUUID()}`
              : value,
        );
        await expect(run([...args, '--workflow', 'information_research_light'])).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-SELECTOR-001',
        });
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('rejects independent repository and requested-project drift before creating state', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-identity-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        const withRepository = (repository) =>
          args.map((value, index) => (args[index - 1] === '--repository' ? repository : value));
        const cases = [
          {
            initialization,
            args: withRepository('other-repository'),
            message: 'Runtime initialization repository identity is stale.',
          },
          {
            initialization: { ...initialization, repository_id: 'other-repository' },
            args: withRepository('other-repository'),
            message: 'Runtime initialization repository identity is stale.',
          },
          {
            initialization,
            args: [...args, '--project', 'foreign-project'],
            message: 'The project context is not bound to the requested identity.',
          },
        ];
        for (const entry of cases) {
          writeFileSync(initializationPath, record(entry.initialization));
          await expect(run(entry.args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-CONTEXT-001',
            message: entry.message,
          });
          expect(existsSync(path.join(root, '.agent', 'work'))).toBe(false);
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('accepts the same configured project set in either receipt order', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-project-set-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root, 'agent-runtime-new', true);
        expect(initialization.project_ids).toEqual(['alpha-project', 'mutation-project']);
        expect((await run(args)).status).toBe('prepared');
        writeFileSync(
          initializationPath,
          record({ ...initialization, project_ids: [...initialization.project_ids].reverse() }),
        );
        const secondArgs = args.map((value, index) =>
          args[index - 1] === '--work-id' ? `mutation-run-${randomUUID()}` : value,
        );
        expect((await run(secondArgs)).status).toBe('prepared');
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('keeps CLI validation, workflow selection, CAS and report handling bound to one attempt', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-mutation-'));
      try {
        const { args, initialization, initializationPath } = createFixture(root);
        for (const [changed, message] of [
          [{ repository_id: 'other-repository' }, 'Runtime initialization repository identity is stale.'],
          [{ project_ids: ['other-project'] }, 'Runtime initialization project configuration is stale.'],
          [{ integrations_digest: 'b'.repeat(64) }, 'Runtime initialization integrations are stale.'],
          [{ config_digest: 'b'.repeat(64) }, 'Runtime initialization configuration is stale.'],
          [{ workspace_id: 'other-workspace' }, 'Runtime initialization workspace identity is stale.'],
          [{ schema_sha256: 'b'.repeat(64) }, 'Runtime initialization schema is stale.'],
        ]) {
          writeFileSync(initializationPath, record({ ...initialization, ...changed }));
          await expect(run(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CONTEXT-001', message });
        }
        writeFileSync(initializationPath, record(initialization));
        await expect(run(args.slice(0, -2))).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
        await expect(run([...args, '--thread-id', 'forged'])).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
        await expect(run(args.slice(0, -1).concat('task_execution'))).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-WORKFLOW-001',
        });
        const prepared = await run(args);
        expect(prepared.status).toBe('prepared');
        expect(prepared.next_actions.length).toBeGreaterThan(1);
        const expected = (version) => [
          '--expected-revision',
          String(version.revision),
          '--expected-digest',
          version.digest,
        ];
        const issued = await run([...args, ...expected(prepared.state_version), '--issue-wave', 'true']);
        expect(issued.status).toBe('wave_issued');
        expect(issued.issued_actions.map((item) => item.action.action_id)).toEqual(
          prepared.next_actions.map((item) => item.request.action_id),
        );
        await expect(run([...args, ...expected(prepared.state_version), '--issue-wave', 'true'])).rejects.toThrow();
        const reportFile = path.join(root, 'report.json');
        for (const invalid of ['', '{', 'x'.repeat(32769)]) {
          writeFileSync(reportFile, invalid);
          await expect(run([...args, ...expected(issued.state_version), '--report', reportFile])).rejects.toMatchObject(
            {
              code: 'GAP-VIDA-RUN-REPORT-001',
            },
          );
        }
        writeFileSync(reportFile, '{}');
        const secondLink = path.join(root, 'report-hardlink.json');
        linkSync(reportFile, secondLink);
        await expect(run([...args, ...expected(issued.state_version), '--report', reportFile])).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-REPORT-001',
        });
        unlinkSync(secondLink);
        expect((await run(args)).state_version).toEqual(issued.state_version);
        let version = issued.state_version;
        for (const item of issued.issued_actions) {
          const action = item.action;
          const summary = `Observed ${action.stage_id}`;
          writeFileSync(
            reportFile,
            JSON.stringify({
              schema: 'VidaSessionObservation/v1',
              action_id: action.action_id,
              issue_id: item.issue_id,
              agent_id: `test-${action.action_order}`,
              tool_call_ref: `tool-${action.action_order}`,
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: [],
            }),
          );
          const result = await run([...args, ...expected(version), '--report', reportFile]);
          version = result.state_version;
          if (item === issued.issued_actions.at(-1)) {
            expect(result.resume_status).toBe('ready');
            expect(result.next_actions[0].request.wave_index).toBe(1);
          }
        }
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    });

    test('binds admission to the selected journal and released maintenance proof', async () => {
      const root = mkdtempSync(path.join(tmpdir(), 'vida-run-selected-'));
      const dependenciesLink = path.join(root, 'vida-agent', 'node_modules');
      try {
        const { args, fixtureBundle } = createFixture(root, 'vida-agent');
        const selectedRun = (await import(pathToFileURL(path.join(fixtureBundle, 'bin', 'run.mjs')).href)).run;
        const generation = `selected-${randomUUID()}`;
        const generationRoot = path.join(root, '.agent', 'cutover', generation);
        mkdirSync(generationRoot, { recursive: true });
        const selector = {
          schema: 'ActiveRuntimeSelector/v1',
          generation,
          runtime: 'vida-agent',
          bundle_root: 'vida-agent',
          config_path: 'agent-runtime.config.v1.yaml',
          archive_manifest_sha256: 'a'.repeat(64),
          plan_sha256: 'b'.repeat(64),
          payload_manifest_sha256: 'c'.repeat(64),
          state_policy: 'clean_start_no_ticket_transfer',
        };
        const journal = {
          schema: 'VidaPreparedInstallJournal/v1',
          cutover_id: generation,
          plan_sha256: selector.plan_sha256,
          archive_manifest_sha256: selector.archive_manifest_sha256,
          payload_manifest_sha256: selector.payload_manifest_sha256,
          state_policy: selector.state_policy,
          status: 'installing',
        };
        const ready = {
          schema: 'VidaPreparedInstallReady/v1',
          cutover_id: generation,
          plan_sha256: selector.plan_sha256,
          state_policy: selector.state_policy,
          status: 'ready_for_selector',
        };
        const releasedLock = {
          schema: 'VidaCutoverMaintenanceLock/v1',
          cutover_id: generation,
          operator: 'test',
          plan_sha256: selector.plan_sha256,
          archive_manifest_sha256: selector.archive_manifest_sha256,
          payload_manifest_sha256: selector.payload_manifest_sha256,
          state_policy: selector.state_policy,
        };
        const release = {
          schema: 'VidaCutoverMaintenanceRelease/v1',
          cutover_id: generation,
          operator: 'test',
          lock_sha256: createHash('sha256').update(record(releasedLock)).digest('hex'),
          status: 'released_by_explicit_operator_action',
        };
        const records = [
          [
            'prepared-install.json',
            journal,
            { plan_sha256: 'd'.repeat(64) },
            'Prepared cutover journal is incomplete.',
          ],
          ['install-ready.json', ready, { status: 'not-ready' }, 'Prepared cutover journal is incomplete.'],
          [
            'maintenance-lock.released.v1.json',
            releasedLock,
            { cutover_id: 'other-generation' },
            'Cutover maintenance release proof is invalid.',
          ],
          [
            'maintenance-release.v1.json',
            release,
            { lock_sha256: 'd'.repeat(64) },
            'Cutover maintenance release proof is invalid.',
          ],
        ];
        writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(selector));
        for (const [name, value] of records) writeFileSync(path.join(generationRoot, name), record(value));
        writeFileSync(
          path.join(generationRoot, 'cutoff-witness.json'),
          record({
            schema: 'VidaNewWorkCutoffWitness/v1',
            generation,
            selector_sha256: createHash('sha256').update(record(selector)).digest('hex'),
            first_admitted_work_attempt: null,
          }),
        );
        expect((await selectedRun(args)).runtime_selector_observed).toBe(true);
        for (const [name, value, changed, message] of records) {
          const file = path.join(generationRoot, name);
          writeFileSync(file, record({ ...value, ...changed }));
          await expect(selectedRun(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-SELECTOR-001', message });
          writeFileSync(file, record(value));
        }
        const retainedPath = path.join(generationRoot, 'maintenance-lock.released.v1.json');
        const releasePath = path.join(generationRoot, 'maintenance-release.v1.json');
        for (const [field, value] of [
          ['cutover_id', 'other-generation'],
          ['plan_sha256', 'd'.repeat(64)],
          ['archive_manifest_sha256', 'd'.repeat(64)],
          ['payload_manifest_sha256', 'd'.repeat(64)],
        ]) {
          const changedLock = { ...releasedLock, [field]: value };
          writeFileSync(retainedPath, record(changedLock));
          writeFileSync(
            releasePath,
            record({ ...release, lock_sha256: createHash('sha256').update(record(changedLock)).digest('hex') }),
          );
          await expect(selectedRun(args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Cutover maintenance release proof is invalid.',
          });
          writeFileSync(retainedPath, record(releasedLock));
          writeFileSync(releasePath, record(release));
        }
        for (const changed of [{ cutover_id: 'other-generation' }, { status: 'not-released' }]) {
          writeFileSync(releasePath, record({ ...release, ...changed }));
          await expect(selectedRun(args)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Cutover maintenance release proof is invalid.',
          });
          writeFileSync(releasePath, record(release));
        }
        const cutoffPath = path.join(generationRoot, 'cutoff-witness.json');
        const witness = JSON.parse(readFileSync(cutoffPath, 'utf8'));
        unlinkSync(cutoffPath);
        await expect(selectedRun(args)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CUTOFF-001',
          message: 'Cutoff witness is missing.',
        });
        for (const [changed, message] of [
          [{ generation: 'other-generation' }, 'Cutoff witness is bound to another selector.'],
          [{ selector_sha256: 'd'.repeat(64) }, 'Cutoff witness is bound to another selector.'],
          [{ first_admitted_work_attempt: '' }, 'Cutoff witness identity is invalid.'],
          [{ first_admitted_work_attempt: 0 }, 'Cutoff witness identity is invalid.'],
        ]) {
          writeFileSync(cutoffPath, record({ ...witness, ...changed }));
          await expect(selectedRun(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-CUTOFF-001', message });
        }
        writeFileSync(cutoffPath, record(witness));
        const cutoffLock = path.join(generationRoot, 'cutoff-witness.lock');
        writeFileSync(cutoffLock, 'held');
        await expect(selectedRun(args)).rejects.toMatchObject({
          code: 'GAP-VIDA-RUN-CUTOFF-001',
          message: 'Cutoff witness is held or unsafe.',
        });
        unlinkSync(cutoffLock);
        writeFileSync(
          path.join(root, '.agent', 'active-runtime-selector.v1.json'),
          record({
            ...selector,
            plan_sha256: 'd'.repeat(64),
          }),
        );
        await expect(selectedRun(args)).rejects.toMatchObject({ code: 'GAP-VIDA-RUN-SELECTOR-001' });
        const stagedGeneration = `staged-${randomUUID()}`;
        const stagedRoot = path.join(root, '.agent', 'cutover', stagedGeneration);
        mkdirSync(stagedRoot);
        const stagedSelector = { ...selector, generation: stagedGeneration };
        delete stagedSelector.payload_manifest_sha256;
        delete stagedSelector.state_policy;
        const stagedJournal = {
          schema: 'VidaCutoverStageJournal/v1',
          cutover_id: stagedGeneration,
          plan_sha256: stagedSelector.plan_sha256,
          archive_manifest_sha256: stagedSelector.archive_manifest_sha256,
          selector_sha256: createHash('sha256').update(record(stagedSelector)).digest('hex'),
          status: 'staged',
        };
        const stagedLock = { ...releasedLock, cutover_id: stagedGeneration };
        delete stagedLock.payload_manifest_sha256;
        const stagedReceipt = {
          ...release,
          cutover_id: stagedGeneration,
          lock_sha256: createHash('sha256').update(record(stagedLock)).digest('hex'),
        };
        const stagedJournalPath = path.join(stagedRoot, 'journal.json');
        writeFileSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'), record(stagedSelector));
        writeFileSync(stagedJournalPath, record(stagedJournal));
        writeFileSync(path.join(stagedRoot, 'maintenance-lock.released.v1.json'), record(stagedLock));
        writeFileSync(path.join(stagedRoot, 'maintenance-release.v1.json'), record(stagedReceipt));
        writeFileSync(
          path.join(stagedRoot, 'cutoff-witness.json'),
          record({
            schema: 'VidaNewWorkCutoffWitness/v1',
            generation: stagedGeneration,
            selector_sha256: stagedJournal.selector_sha256,
            first_admitted_work_attempt: null,
          }),
        );
        const stagedArgs = args.map((value, index) =>
          args[index - 1] === '--work-id' ? `mutation-run-${randomUUID()}` : value,
        );
        expect((await selectedRun(stagedArgs)).runtime_selector_observed).toBe(true);
        for (const changed of [
          { cutover_id: 'other-generation' },
          { plan_sha256: 'd'.repeat(64) },
          { archive_manifest_sha256: 'd'.repeat(64) },
          { selector_sha256: 'd'.repeat(64) },
          { status: 'not-staged' },
        ]) {
          writeFileSync(stagedJournalPath, record({ ...stagedJournal, ...changed }));
          await expect(selectedRun(stagedArgs)).rejects.toMatchObject({
            code: 'GAP-VIDA-RUN-SELECTOR-001',
            message: 'Cutover journal is incomplete.',
          });
        }
      } finally {
        if (existsSync(dependenciesLink)) unlinkSync(dependenciesLink);
        rmSync(root, { recursive: true, force: true });
      }
    });
  });
}
