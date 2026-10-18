import { test, expect, spyOn } from 'bun:test';
import { Database } from 'bun:sqlite';
import * as fs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import * as workspaceDatabaseCli from '../bin/workspace-database-cli.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import { configuredTestContext } from './configured-context.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import {
  observationSchema,
  requestSchema,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';

type Fixture = {
  readonly root: string;
  readonly args: (mode: string) => string[];
  readonly databasePath: string;
  readonly workspaceId: string;
  readonly workId: string;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function field(value: unknown, key: string): unknown {
  if (!isRecord(value)) throw new Error(`reconcile result is missing ${key}`);
  return value[key];
}

function dispatchStorageSnapshot(database: Database): readonly unknown[] {
  return [
    'agent_host_state',
    'agent_host_mastra_session_ledger',
    'agent_host_readonly_dispatch_repair',
    'agent_host_readonly_dispatch_outcome',
  ].map((table) => {
    const exists: unknown = database
      .query("SELECT 1 AS present FROM sqlite_master WHERE type='table' AND name=?")
      .get(table);
    const rows: unknown = exists ? database.query(`SELECT * FROM ${table}`).all() : null;
    return { table, rows };
  });
}

function completedObservation(actionId: string, issueId: string): SessionBridgeObservation {
  const candidate = {
    schema: 'VidaSessionObservation/v1',
    action_id: actionId,
    issue_id: issueId,
    agent_id: 'fixture-agent',
    tool_call_ref: 'fixture-call',
    status: 'reported_complete',
    summary: 'Completed read-only fixture observation.',
    output_digest: canonicalJsonDigest('Completed read-only fixture observation.'),
    evidence_refs: ['fixture:evidence'],
  } satisfies SessionBridgeObservation;
  return observationSchema.parse(candidate);
}

function fixture(): Fixture {
  const contextRoot = configuredTestContext().repositoryRoot;
  const root = mkdtempSync(path.join(tmpdir(), 'vida-readonly-dispatch-'));
  let database: Database | undefined;
  try {
    const put = (relative: string, bytes: Buffer) => {
      const target = path.join(root, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes);
    };
    mkdirSync(path.join(root, '.git'));
    for (const relative of [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'agent-runtime.config.v1.yaml',
      'docs/agent-instructions/documentation-policy.v1.json',
    ])
      put(relative, readFileSync(path.join(contextRoot, relative)));
    const config = loadRuntimeConfig(root);
    const fixturePaths = loadProjectSetContext(
      root,
      config,
      config.repository.repository_id,
      config.projects.map((project) => project.project_id),
    );
    for (const profile of fixturePaths.path_bindings) {
      for (const target of profile.paths) {
        if (target.expected_type === 'directory') mkdirSync(target.resolved, { recursive: true });
      }
    }
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
    const projectIds = ['agent'];
    const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
    const workId = 'readonly-repair-fixture';
    const attempt = 2;
    const actionId = 'a'.repeat(64);
    const issueId = '10000000-0000-4000-8000-000000000002';
    const nativeHandle = 'fixture-original-native-session';
    const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
    const databasePath = sessionHandoffDatabasePath(root, config);
    mkdirSync(path.dirname(databasePath), { recursive: true });
    const fixtureDatabase = openHostStateDatabase(root, sessionHandoffDatabaseRelativePath(config), workspaceId);
    database = fixtureDatabase;
    new HostStateStore(fixtureDatabase, workspaceId, undefined, undefined, undefined, undefined, root);
    fixtureDatabase.exec(
      'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT, work_id TEXT, attempt INTEGER, revision INTEGER, payload TEXT, digest TEXT, PRIMARY KEY(workspace_id,work_id,attempt))',
    );
    const putRow = (table: string, keys: readonly (string | number)[], value: unknown, revision = 1): void => {
      fixtureDatabase
        .query(
          `INSERT INTO ${table} VALUES(${Array(keys.length + 3)
            .fill('?')
            .join(',')})`,
        )
        .run(...keys, revision, canonicalJson(value), canonicalJsonDigest(value));
    };
    const workKey = JSON.stringify([project.repository_id, projectIds, project.integrations_digest, workId]);
    const binding = {
      repository_id: project.repository_id,
      project_ids: projectIds,
      integrations_digest: project.integrations_digest,
      team_id: 'fixture-team',
      workflow_id: 'information_research_light',
      provider_work_item_id: workId,
      lifecycle_work_id: workId,
      work_item_digest: '1'.repeat(64),
      work_source_revision: sourceScope.digest,
      scope_id: 'scope-readonly-repair-fixture',
      scope_contract_digest: '2'.repeat(64),
      acceptance_manifest_digest: '3'.repeat(64),
      ac_ids: ['AC-READONLY-REPAIR'],
      implementation_paths: ['AGENT.sidecar.md'],
      allowed_resources: ['file:AGENT.sidecar.md'],
      config_digest: runtimeConfigDigest(config),
      runtime_source_revision: sourceScope.digest,
      schema_digest: '4'.repeat(64),
      runtime_code_digest: '5'.repeat(64),
    };
    const work = {
      schema: 'WorkState/v1',
      workspace_id: workspaceId,
      revision: 1,
      binding,
      contracts: {
        scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: '2'.repeat(64) },
        acceptance: {
          schema: 'AcceptanceManifest/v1',
          path: '.agent/acceptance.json',
          sha256: '3'.repeat(64),
        },
        decisions: [],
      },
      execution: {
        run_id: 'run-fixture',
        input_digest: '6'.repeat(64),
        phase: 'awaiting_followup',
        status: 'suspended',
        assignment_attempts: [],
      },
      lease: null,
      lifecycle: {
        schema: 'LifecycleState/v1',
        revision: 1,
        phase: 'INTAKE',
        source_revision: sourceScope.digest,
        next_action: 'Repair the paused read-only dispatch.',
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
          allowed_paths: ['AGENT.sidecar.md'],
          fingerprint_paths: ['AGENT.sidecar.md'],
          implementation_paths: ['AGENT.sidecar.md'],
          documentation_paths: [],
        },
        seal: null,
        assurance: {
          epoch: 'fixture-epoch',
          review_generation: 0,
          correction_count: 0,
          review_failure_count: 0,
          delivery_cycle_id: null,
        },
        references: [],
      },
      artifacts: [],
    };
    putRow('agent_host_state', [workspaceId, 'work', workKey], work);
    const releasedResources = ['file:AGENT.sidecar.md'];
    const releasedTicket = {
      schema: 'CoordinationTicket/v1',
      ticket_id: 'fixture-released-ticket',
      repository_id: project.repository_id,
      project_ids: projectIds,
      integrations_digest: project.integrations_digest,
      work_id: workId,
      thread_id: nativeHandle,
      source_revision: sourceScope.digest,
      generation: 1,
      sequence: 1,
      contour_keys: [],
      exclusive_resources: releasedResources,
      status: 'released',
      claim_ids: ['fixture-released-claim'],
      expires_at: null,
      active_resources: [],
      blocked_resources: [],
      created_at: '2026-09-28T10:00:00.000Z',
    };
    const releasedClaim = {
      schema: 'WorkstreamClaim/v1',
      claim_id: 'fixture-released-claim',
      ticket_id: releasedTicket.ticket_id,
      work_id: workId,
      thread_id: nativeHandle,
      generation: 1,
      resources: releasedResources,
      lease_expires_at: '2026-09-28T11:00:00.000Z',
      status: 'released',
      created_at: '2026-09-28T10:00:00.000Z',
      renewed_at: '2026-09-28T10:00:00.000Z',
    };
    const releasedOperation = {
      schema: 'CoordinationOperation/v1',
      operation_id: 'fixture-owner-release',
      kind: 'release',
      ticket_id: releasedTicket.ticket_id,
      work_id: workId,
      thread_id: nativeHandle,
      source_revision: sourceScope.digest,
      resources: releasedResources,
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      decided_by: nativeHandle,
      decision_pointer: 'fixture:original-cooperative-pause',
      created_at: '2026-09-28T10:00:00.000Z',
    };
    putRow(
      'agent_host_state',
      [workspaceId, 'ledger', 'shared'],
      {
        schema: 'CoordinationLedger/v1',
        workspace_id: workspaceId,
        revision: 2,
        open_generation: 1,
        next_sequence: 2,
        tickets: [releasedTicket],
        claims: [releasedClaim],
        notices: [],
        dispositions: [],
        contours: [],
        batches: [],
        rebinds: [],
        operations: [releasedOperation],
        retirements: [],
      },
      2,
    );
    const request = (action: string, assignment: number, role: string): SessionBridgeRequest => {
      const configDigest = runtimeConfigDigest(config);
      const stageId = 'research_parallel';
      const waveIndex = 0;
      const candidate = {
        schema: 'VidaSessionRequest/v1',
        run_id: 'run-fixture',
        workflow_id: 'information_research_light',
        wave_index: waveIndex,
        action_id: action,
        assignment_index: assignment,
        stage_id: stageId,
        role,
        config_digest: configDigest,
        scope_digest: sourceScope.digest,
        bindings_manifest_ref: canonicalJsonDigest({
          config_digest: configDigest,
          scope_digest: sourceScope.digest,
          work_id: workId,
          attempt,
          action_id: action,
          stage_id: stageId,
          configured_context_digest: null,
          wave_index: waveIndex,
          prior_results: [],
        }),
      } satisfies SessionBridgeRequest;
      return requestSchema.parse(candidate);
    };
    const mastra = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: workId,
      attempt,
      run_id: 'run-fixture',
      step_id: 'wave-0',
      source_scope: sourceScope,
      items: [
        {
          request: request('b'.repeat(64), 0, 'documentation-researcher'),
          issue_id: '10000000-0000-4000-8000-000000000001',
          observation: completedObservation('b'.repeat(64), '10000000-0000-4000-8000-000000000001'),
        },
        { request: request(actionId, 1, 'code-researcher'), issue_id: issueId, observation: null },
        {
          request: request('c'.repeat(64), 2, 'platform-researcher'),
          issue_id: '10000000-0000-4000-8000-000000000003',
          observation: completedObservation('c'.repeat(64), '10000000-0000-4000-8000-000000000003'),
        },
      ],
      completed: [],
    };
    putRow('agent_host_mastra_session_ledger', [workspaceId, workId, attempt], mastra, 9);
    const seededDatabase = database;
    if (!seededDatabase) throw new Error('fixture Host database was not opened');
    database = undefined;
    closeWorkspaceDatabaseWithAdmission(seededDatabase);
    const common = ['--kind', 'readonly-dispatch', '--project-root', root, '--repair-id', 'fixture-dispatch'];
    const args = (mode: string): string[] => [
      '--mode',
      mode,
      ...common,
      ...(['inspect', 'plan'].includes(mode)
        ? [
            '--actor',
            'fixture-operator',
            '--timestamp',
            '2026-09-28T10:00:00.000Z',
            '--projects',
            'agent',
            '--work-id',
            workId,
            '--attempt',
            String(attempt),
            '--action-id',
            actionId,
            '--issue-id',
            issueId,
            '--native-handle',
            nativeHandle,
          ]
        : []),
    ];
    return { root, args, databasePath, workspaceId, workId, attempt, actionId, issueId };
  } catch (error) {
    try {
      if (database) closeWorkspaceDatabaseWithAdmission(database);
    } catch (closeError) {
      console.error(`Retained read-only dispatch fixture root after setup and close failures: ${root}`);
      throw new AggregateError([error, closeError], 'read-only dispatch fixture setup and database close failed');
    }
    console.error(`Retained read-only dispatch fixture root after setup failure: ${root}`);
    throw error;
  }
}

function finishFixture(value: Fixture, succeeded: boolean): void {
  if (!succeeded) {
    console.error(`Retained read-only dispatch fixture root after case failure: ${value.root}`);
    return;
  }
  console.log(`Cleaning owned read-only dispatch fixture root: ${value.root}`);
  rmSync(value.root, { recursive: true, force: false });
  if (existsSync(value.root)) throw new Error(`read-only dispatch fixture cleanup incomplete: ${value.root}`);
  console.log(`Removed owned read-only dispatch fixture root: ${value.root}`);
}

test('sole public reconcile CLI plans and applies one paused read-only dispatch intent', async () => {
  const value = fixture();
  let succeeded = false;
  try {
    const inspected: unknown = await runReconcileArtifacts(value.args('inspect'));
    expect(field(inspected, 'status')).toBe('repairable_current_v1');
    expect(existsSync(path.join(value.root, '.agent/work/fixture-dispatch/read-only-dispatch-plan.v1.json'))).toBe(
      false,
    );
    const planned: unknown = await runReconcileArtifacts(value.args('plan'));
    expect(field(planned, 'status')).toBe('planned');
    const planPath = path.join(value.root, '.agent/work/fixture-dispatch/read-only-dispatch-plan.v1.json');
    const planValue: unknown = JSON.parse(readFileSync(planPath, 'utf8'));
    expect(isRecord(planValue)).toBe(true);
    if (!isRecord(planValue)) throw new Error('prepared read-only dispatch plan is malformed');
    expect(planValue.schema).toBe('VidaReadOnlyDispatchRepairPlan/v2');
    expect(typeof planValue.maintenance_generation).toBe('number');
    expect(planValue.maintenance_generation).toBe(0);
    expect(Number.isSafeInteger(planValue.maintenance_generation)).toBe(true);
    const planDigest = planValue.digest;
    if (typeof planDigest !== 'string') throw new Error('prepared read-only dispatch plan digest is malformed');
    const planBody: Record<string, unknown> = { ...planValue };
    delete planBody.digest;
    expect(planDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(canonicalJsonDigest(planBody)).toBe(planDigest);

    const applied: unknown = await runReconcileArtifacts(value.args('apply'));
    expect(field(applied, 'status')).toBe('prepared');
    expect(field(applied, 'old_issue_outcome')).toBe('unknown');
    expect(await runReconcileArtifacts(value.args('resume'))).toEqual(applied);
    const db = new Database(value.databasePath, { readonly: true });
    try {
      const countRow: unknown = db.query('SELECT COUNT(*) AS count FROM agent_host_readonly_dispatch_repair').get();
      expect(isRecord(countRow) && countRow.count).toBe(1);
      const oldRow: unknown = db.query('SELECT payload FROM agent_host_mastra_session_ledger').get();
      if (!isRecord(oldRow) || typeof oldRow.payload !== 'string')
        throw new Error('persisted session ledger row is malformed');
      const oldLedger: unknown = JSON.parse(oldRow.payload);
      if (!isRecord(oldLedger) || !Array.isArray(oldLedger.items))
        throw new Error('persisted session ledger is malformed');
      const oldItem: unknown = oldLedger.items[1];
      if (!isRecord(oldItem)) throw new Error('persisted session item is malformed');
      expect(oldItem.issue_id).toBe(value.issueId);
      expect(oldItem.observation).toBeNull();
    } finally {
      db.close();
    }
    succeeded = true;
  } finally {
    finishFixture(value, succeeded);
  }
});

test('public read-only dispatch CLI rejects a missing required option without changing persisted state', async () => {
  const value = fixture();
  let succeeded = false;
  try {
    const args = value.args('inspect');
    const projectsIndex = args.indexOf('--projects');
    if (projectsIndex < 0) throw new Error('read-only dispatch fixture projects option is missing');
    args.splice(projectsIndex, 2);
    const database = new Database(value.databasePath, { readonly: true });
    try {
      const before = dispatchStorageSnapshot(database);
      await expectRejection(
        runReconcileArtifacts(args),
        'vida repair artifacts: read-only dispatch has missing or unexpected arguments',
      );
      expect(dispatchStorageSnapshot(database)).toEqual(before);
    } finally {
      database.close();
    }
    expect(existsSync(path.join(value.root, '.agent/work/fixture-dispatch/read-only-dispatch-plan.v1.json'))).toBe(
      false,
    );
    succeeded = true;
  } finally {
    finishFixture(value, succeeded);
  }
});

test('public read-only dispatch CLI rejects malformed generations without changing persisted state', async () => {
  const value = fixture();
  let succeeded = false;
  try {
    await runReconcileArtifacts(value.args('plan'));
    const planPath = path.join(value.root, '.agent/work/fixture-dispatch/read-only-dispatch-plan.v1.json');
    const originalPlanBytes = readFileSync(planPath);
    const planValue: unknown = JSON.parse(originalPlanBytes.toString('utf8'));
    if (!isRecord(planValue)) throw new Error('prepared read-only dispatch plan is malformed');
    const dispatchState = (): readonly unknown[] => {
      const database = new Database(value.databasePath, { readonly: true });
      try {
        return dispatchStorageSnapshot(database);
      } finally {
        database.close();
      }
    };
    const beforeRejectedApplies = dispatchState();
    writeFileSync(planPath, 'null\n');
    let malformedPlanRejection: unknown;
    try {
      await runReconcileArtifacts(value.args('apply'));
    } catch (error) {
      malformedPlanRejection = error;
    }
    expect(malformedPlanRejection).toBeInstanceOf(Error);
    expect(malformedPlanRejection).toHaveProperty(
      'message',
      'vida repair artifacts: read-only dispatch plan is not exact canonical JSON',
    );
    expect(dispatchState()).toEqual(beforeRejectedApplies);
    writeFileSync(planPath, originalPlanBytes);

    const malformedActivationPlan = { ...planValue, prior_activation: { use: {}, plan: {} } };
    writeFileSync(planPath, `${JSON.stringify(malformedActivationPlan, null, 2)}\n`);
    let malformedActivationRejection: unknown;
    try {
      await runReconcileArtifacts(value.args('apply'));
    } catch (error) {
      malformedActivationRejection = error;
    }
    expect(malformedActivationRejection).toBeInstanceOf(Error);
    expect(malformedActivationRejection).toHaveProperty(
      'message',
      'vida repair artifacts: read-only dispatch plan is not exact canonical JSON',
    );
    expect(dispatchState()).toEqual(beforeRejectedApplies);

    writeFileSync(planPath, originalPlanBytes);
    for (const invalidGeneration of [-1, 0.5, '0', null, Number.MAX_SAFE_INTEGER + 1]) {
      const invalidPlan = { ...planValue, maintenance_generation: invalidGeneration };
      writeFileSync(planPath, `${JSON.stringify(invalidPlan, null, 2)}\n`);
      let rejection: unknown;
      try {
        await runReconcileArtifacts(value.args('apply'));
      } catch (error) {
        rejection = error;
      }
      expect(rejection).toBeInstanceOf(Error);
      expect(rejection).toHaveProperty(
        'message',
        'vida repair artifacts: read-only dispatch plan is not exact canonical JSON',
      );
      expect(dispatchState()).toEqual(beforeRejectedApplies);
    }
    writeFileSync(planPath, originalPlanBytes);
    const applied: unknown = await runReconcileArtifacts(value.args('apply'));
    expect(field(applied, 'status')).toBe('prepared');
    succeeded = true;
  } finally {
    finishFixture(value, succeeded);
  }
});

test('successor consumer atomically switches issue generation and rejects a late old report', async () => {
  const value = fixture();
  let succeeded = false;
  try {
    await runReconcileArtifacts(value.args('plan'));
    await runReconcileArtifacts(value.args('apply'));
    let ledger = openConfiguredMastraSessionLedger(value.root);
    try {
      const before = ledger.resume(value.workId, value.attempt);
      if (!before) throw new Error('pre-replacement session snapshot is missing');
      expect(before.resume_status).toBe('issued_outcome_uncertain');
      const changed = ledger.activateReadOnlyReplacement(value.workId, value.attempt, before.version, value.actionId);
      expect(changed.dispatch.logical_action_id).toBe(value.actionId);
      expect(changed.dispatch.dispatch_action_id).not.toBe(value.actionId);
      expect(changed.dispatch.prior_issue_id).toBe(value.issueId);
      const replacementItem = changed.snapshot.state.items.find((item) => item.request.action_id === value.actionId);
      if (!replacementItem) throw new Error('replacement session item is missing');
      expect(replacementItem.issue_id).toBe(changed.dispatch.issue_id);
      const replacementScope = changed.snapshot.state.source_scope;
      if (!replacementScope) throw new Error('replacement source scope is missing');
      ledger.close();
      ledger = openConfiguredMastraSessionLedger(value.root);
      expect(ledger.replacementDispatch(value.workId, value.attempt, value.actionId)).toEqual(changed.dispatch);
      expect(() =>
        ledger.activateReadOnlyReplacement(value.workId, value.attempt, before.version, value.actionId),
      ).toThrow(/CAS version|already activated/);
      expect(() => {
        const malformedObservation: unknown = {
          action_id: value.actionId,
          issue_id: value.issueId,
          host_attempt_id: undefined,
        };
        void Reflect.apply(ledger.report.bind(ledger), ledger, [
          value.workId,
          value.attempt,
          changed.snapshot.version,
          malformedObservation,
        ]);
      }).toThrow(/matching open issuance/);
      const summary = 'Replacement code research completed for the same scoped request.';
      const report = {
        schema: 'VidaSessionObservation/v1',
        action_id: changed.dispatch.dispatch_action_id,
        issue_id: changed.dispatch.issue_id,
        agent_id: 'code-researcher',
        tool_call_ref: 'collaboration.spawn_agent:/root/replacement#action=new',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['.agent/work/replacement-research.md'],
      } satisfies Parameters<typeof ledger.reportReadOnlyReplacement>[3];
      ledger.close();
      const original = new Database(value.databasePath);
      let planPayload: string;
      let planDigest: string;
      let planValue: Record<string, unknown>;
      try {
        const row: unknown = original
          .query(
            'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
          )
          .get(value.workspaceId, value.workId, value.attempt, value.actionId);
        if (!isRecord(row) || typeof row.payload !== 'string' || typeof row.digest !== 'string')
          throw new Error('persisted replacement plan row is malformed');
        planPayload = row.payload;
        planDigest = row.digest;
        const parsed: unknown = JSON.parse(planPayload);
        if (!isRecord(parsed)) throw new Error('persisted replacement plan is malformed');
        planValue = parsed;
      } finally {
        original.close();
      }
      for (const corruption of [
        { payload: canonicalJson({ ...planValue, status: 'corrupt' }), digest: planDigest },
        { payload: canonicalJson({ ...planValue, repair_id: 'tampered-plan' }), digest: planDigest },
        { payload: planPayload, digest: 'f'.repeat(64) },
      ]) {
        const tamper = new Database(value.databasePath);
        let beforeStorage: readonly unknown[];
        try {
          const changedRow = tamper
            .query(
              'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
            )
            .run(corruption.payload, corruption.digest, value.workspaceId, value.workId, value.attempt, value.actionId);
          expect(changedRow.changes).toBe(1);
          beforeStorage = dispatchStorageSnapshot(tamper);
        } finally {
          tamper.close();
        }
        ledger = openConfiguredMastraSessionLedger(value.root);
        expect(() =>
          ledger.reportReadOnlyReplacement(
            value.workId,
            value.attempt,
            changed.snapshot.version,
            report,
            replacementScope,
          ),
        ).toThrow('read-only dispatch repair plan is invalid');
        expect(ledger.resume(value.workId, value.attempt)?.version).toEqual(changed.snapshot.version);
        ledger.close();
        const after = new Database(value.databasePath, { readonly: true });
        try {
          expect(dispatchStorageSnapshot(after)).toEqual(beforeStorage);
        } finally {
          after.close();
        }
      }
      const restore = new Database(value.databasePath);
      try {
        restore
          .query(
            'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
          )
          .run(planPayload, planDigest, value.workspaceId, value.workId, value.attempt, value.actionId);
      } finally {
        restore.close();
      }
      ledger = openConfiguredMastraSessionLedger(value.root);
      const observed = ledger.reportReadOnlyReplacement(
        value.workId,
        value.attempt,
        changed.snapshot.version,
        report,
        replacementScope,
      );
      const observedItem = observed.state.items.find((item) => item.request.action_id === value.actionId);
      if (!observedItem?.observation) throw new Error('replacement observation is missing');
      expect(observedItem.observation.action_id).toBe(value.actionId);
      expect(observedItem.observation.issue_id).toBe(changed.dispatch.issue_id);
      expect(observed.resume_status).toBe('ready_to_resume');
      expect(() =>
        ledger.reportReadOnlyReplacement(
          value.workId,
          value.attempt,
          changed.snapshot.version,
          report,
          replacementScope,
        ),
      ).toThrow(/CAS version/);
      const out = new Database(value.databasePath, { readonly: true });
      try {
        const outcomeRow: unknown = out.query('SELECT payload FROM agent_host_readonly_dispatch_outcome').get();
        if (!isRecord(outcomeRow) || typeof outcomeRow.payload !== 'string')
          throw new Error('persisted dispatch outcome row is malformed');
        const outcome: unknown = JSON.parse(outcomeRow.payload);
        if (!isRecord(outcome) || !isRecord(outcome.raw_observation))
          throw new Error('persisted dispatch outcome is malformed');
        expect(outcome.raw_observation.action_id).toBe(changed.dispatch.dispatch_action_id);
        expect(outcome.raw_observation.tool_call_ref).toBe(report.tool_call_ref);
      } finally {
        out.close();
      }
    } finally {
      ledger.close();
    }
    succeeded = true;
  } finally {
    finishFixture(value, succeeded);
  }
}, 8_000);

test('persisted v1 read-only dispatch plans remain readable', async () => {
  const value = fixture();
  let succeeded = false;
  try {
    await runReconcileArtifacts(value.args('plan'));
    await runReconcileArtifacts(value.args('apply'));
    const database = new Database(value.databasePath);
    try {
      const rowValue: unknown = database
        .query(
          'SELECT payload FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
        )
        .get(value.workspaceId, value.workId, value.attempt, value.actionId);
      if (!isRecord(rowValue) || typeof rowValue.payload !== 'string')
        throw new Error('persisted read-only dispatch plan row is malformed');
      const parsedPlan: unknown = JSON.parse(rowValue.payload);
      if (!isRecord(parsedPlan) || typeof parsedPlan.digest !== 'string')
        throw new Error('persisted read-only dispatch plan is malformed');
      const legacyPlan: Record<string, unknown> = { ...parsedPlan, schema: 'VidaReadOnlyDispatchRepairPlan/v1' };
      delete legacyPlan.maintenance_generation;
      delete legacyPlan.digest;
      const digest = canonicalJsonDigest(legacyPlan);
      legacyPlan.digest = digest;
      const updated = database
        .query(
          'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
        )
        .run(canonicalJson(legacyPlan), digest, value.workspaceId, value.workId, value.attempt, value.actionId);
      expect(updated.changes).toBe(1);
    } finally {
      database.close();
    }

    const ledger = openConfiguredMastraSessionLedger(value.root);
    try {
      const prepared = ledger.preparedReadOnlyReplacement(value.workId, value.attempt, value.actionId);
      if (!prepared) throw new Error('persisted v1 plan was not admitted as a prepared replacement');
      expect(prepared.native_session_handle).toBe('fixture-original-native-session');
      expect(typeof prepared.plan_digest).toBe('string');
      expect(prepared.plan_digest).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      ledger.close();
    }
    succeeded = true;
  } finally {
    finishFixture(value, succeeded);
  }
});
test('public read-only dispatch CLI preserves a body failure when admitted database close also fails', async () => {
  const value = fixture();
  let succeeded = false;
  let sourceDatabase: Database | undefined;
  let closeAttempts = 0;
  let injectCloseFailure = false;
  let sourceClosePending = false;
  let bodyFailure: { error: unknown } | undefined;
  const closeError = new Error('injected read-only dispatch source close interruption');
  const originalOpen = workspaceDatabaseCli.openCliWorkspaceDatabase.bind(workspaceDatabaseCli);
  const openSpy = spyOn(workspaceDatabaseCli, 'openCliWorkspaceDatabase').mockImplementation((...args) => {
    const database = originalOpen(...args);
    if (injectCloseFailure) sourceDatabase = database;
    return database;
  });
  const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
    this: Database,
    force?: boolean,
  ): void {
    if (injectCloseFailure && this === sourceDatabase) {
      closeAttempts += 1;
      sourceClosePending = true;
      throw closeError;
    }
    originalClose.call(this, force);
  });

  try {
    await runReconcileArtifacts(value.args('plan'));
    writeFileSync(path.join(value.root, '.agent/work/fixture-dispatch/read-only-dispatch-plan.v1.json'), '{}\n');
    injectCloseFailure = true;

    let failure: unknown;
    try {
      await runReconcileArtifacts(value.args('apply'));
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    if (!(failure instanceof AggregateError)) throw new Error('body and close failures were not aggregated');
    expect(failure.errors).toHaveLength(2);
    expect(failure.errors[0]).toBeInstanceOf(Error);
    expect(failure.errors[0]).toMatchObject({
      message: 'vida repair artifacts: read-only dispatch plan is not exact canonical JSON',
    });
    expect(failure.errors[1]).toBeInstanceOf(AggregateError);
    if (!(failure.errors[1] instanceof AggregateError)) throw new Error('admitted close failure was not retained');
    expect(failure.errors[1].errors).toEqual([closeError]);
    expect(closeAttempts).toBe(1);
    if (!sourceDatabase) throw new Error('public CLI did not expose its admitted source handle to close');
    expect(sourceDatabase.query<{ value: number }, []>('SELECT 1 AS value').get()).toEqual({ value: 1 });

    closeSpy.mockRestore();
    openSpy.mockRestore();
    closeWorkspaceDatabaseWithAdmission(sourceDatabase);
    sourceClosePending = false;
    succeeded = true;
  } catch (error) {
    bodyFailure = { error };
  }
  try {
    completeOwnedCleanup(
      [
        () => {
          closeSpy.mockRestore();
        },
        () => {
          openSpy.mockRestore();
        },
        () => {
          if (sourceDatabase && sourceClosePending) closeWorkspaceDatabaseWithAdmission(sourceDatabase);
        },
      ],
      bodyFailure,
    );
  } catch (error) {
    finishFixture(value, false);
    throw error;
  }
  finishFixture(value, succeeded);
  if (bodyFailure) throw bodyFailure.error;
});

test.each(['error', 'undefined'] as const)(
  'public read-only dispatch planning preserves body and descriptor-close failures (%s)',
  async (failureKind) => {
    const value = fixture();
    const planPath = path.join(value.root, '.agent/work/fixture-dispatch/read-only-dispatch-plan.v1.json');
    const writeError: unknown =
      failureKind === 'error' ? new Error('injected read-only dispatch plan write interruption') : undefined;
    const closeError = new Error('injected read-only dispatch plan descriptor close interruption');
    const events: string[] = [];
    const originalOpenSync = fs.openSync;
    const originalWriteFileSync = fs.writeFileSync;
    const originalCloseSync = fs.closeSync;
    let planDescriptor: number | undefined;
    let planOpenFlags: number | string | undefined;
    let writeAttempts = 0;
    let closeAttempts = 0;
    let primaryFailure: { readonly error: unknown } | undefined;

    const openSpy = spyOn(fs, 'openSync').mockImplementation((...args: Parameters<typeof fs.openSync>) => {
      const descriptor = originalOpenSync(...args);
      if (typeof args[0] === 'string' && path.resolve(args[0]) === planPath) {
        planDescriptor = descriptor;
        planOpenFlags = args[1];
        events.push('open');
      }
      return descriptor;
    });
    const writeSpy = spyOn(fs, 'writeFileSync').mockImplementation((...args: Parameters<typeof fs.writeFileSync>) => {
      if (typeof args[0] === 'number' && args[0] === planDescriptor) {
        writeAttempts += 1;
        events.push('write');
        throw writeError;
      }
      return originalWriteFileSync(...args);
    });
    const closeSpy = spyOn(fs, 'closeSync').mockImplementation((...args: Parameters<typeof fs.closeSync>) => {
      if (typeof args[0] === 'number' && args[0] === planDescriptor) {
        closeAttempts += 1;
        originalCloseSync(...args);
        events.push('close');
        throw closeError;
      }
      return originalCloseSync(...args);
    });

    try {
      let cliFailure: unknown;
      try {
        await runReconcileArtifacts(value.args('plan'));
      } catch (error) {
        cliFailure = error;
      }

      expect(cliFailure).toBeInstanceOf(AggregateError);
      if (!(cliFailure instanceof AggregateError))
        throw new Error('plan body and descriptor close were not aggregated');
      expect(cliFailure.errors).toEqual([writeError, closeError]);
      expect(planDescriptor).toBeDefined();
      if (planDescriptor === undefined) throw new Error('public plan writer did not expose its exclusive descriptor');
      const closedDescriptor = planDescriptor;
      if (typeof planOpenFlags !== 'number' || (planOpenFlags & fs.constants.O_EXCL) === 0)
        throw new Error('public plan writer did not use exclusive creation for the observed descriptor');
      expect(writeAttempts).toBe(1);
      expect(closeAttempts).toBe(1);
      expect(events).toEqual(['open', 'write', 'close']);
      expect(fs.readFileSync(planPath)).toEqual(Buffer.alloc(0));
      expect(fs.existsSync(value.root)).toBe(true);
      expect(() => fs.fstatSync(closedDescriptor)).toThrow();
    } catch (error) {
      primaryFailure = { error };
    }

    completeOwnedCleanup(
      [
        () => {
          closeSpy.mockRestore();
          return undefined;
        },
        () => {
          writeSpy.mockRestore();
          return undefined;
        },
        () => {
          openSpy.mockRestore();
          return undefined;
        },
        () => {
          console.error(`Retained read-only dispatch plan failure fixture root: ${value.root}`);
          return undefined;
        },
      ],
      primaryFailure,
    );
    if (primaryFailure) throw primaryFailure.error;
  },
);
