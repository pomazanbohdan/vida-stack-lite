import { expect, test } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planReadOnlyDispatchRepair, applyReadOnlyDispatchRepair } from '../bin/read-only-dispatch-repair.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { buildReadOnlyDispatchRepairPlan } from '../src/orchestration/read-only-dispatch-repair.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import type { SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge-contract.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryTemplateRoot = path.resolve(bundle, '../..');

function completedObservation(actionId: string, issueId: string) {
  return {
    schema: 'VidaSessionObservation/v1' as const,
    action_id: actionId,
    issue_id: issueId,
    agent_id: 'fixture-agent',
    tool_call_ref: 'fixture-call',
    status: 'reported_complete' as const,
    summary: 'Completed read-only fixture observation.',
    output_digest: 'f'.repeat(64),
    evidence_refs: ['fixture:evidence'],
  };
}

function replaceHostRow(
  database: Database,
  workspaceId: string,
  kind: string,
  id: string,
  revision: number,
  payload: unknown,
): void {
  const result = database
    .query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=? AND id=?')
    .run(revision, canonicalJson(payload), canonicalJsonDigest(payload), workspaceId, kind, id);
  if (result.changes !== 1) throw new Error(`fixture ${kind} state row was not updated exactly once`);
}

function replaceJournalRow(
  database: Database,
  workspaceId: string,
  workId: string,
  attempt: number,
  revision: number,
  payload: unknown,
): void {
  const result = database
    .query(
      'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
    )
    .run(revision, canonicalJson(payload), canonicalJsonDigest(payload), workspaceId, workId, attempt);
  if (result.changes !== 1) throw new Error('fixture journal row was not updated exactly once');
}

function readRepairRows(database: Database): readonly unknown[] {
  const table: unknown = database
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_readonly_dispatch_repair'")
    .get();
  if (table === null) return [];
  if (typeof table !== 'object' || !('name' in table) || table.name !== 'agent_host_readonly_dispatch_repair')
    throw new Error('read-only dispatch repair table lookup is malformed');
  return database.query('SELECT payload,digest FROM agent_host_readonly_dispatch_repair').all();
}

function makeFixtureRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'readonly-dispatch-repair-'));
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
    copyFileSync(path.join(repositoryTemplateRoot, file), path.join(root, file));
  for (const directory of [
    '.git',
    'docs/agent-instructions',
    '.agent/work',
    'packages/agent/docs',
    'packages/plugin/docs',
    'packages/agent',
  ])
    mkdirSync(path.join(root, directory), { recursive: true });
  copyFileSync(path.join(root, 'AGENT.sidecar.md'), path.join(root, 'packages/agent/AGENT.sidecar.md'));
  const sourcePolicy = path.join(repositoryTemplateRoot, 'docs/agent-instructions/documentation-policy.v1.json');
  copyFileSync(sourcePolicy, path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'));
  return root;
}

function fixture() {
  const repositoryRoot = makeFixtureRoot();
  let database: Database | undefined;
  try {
    const config = loadRuntimeConfig(repositoryRoot);
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
    const databaseRelativePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
    mkdirSync(path.dirname(path.join(repositoryRoot, databaseRelativePath)), { recursive: true });
    const openedDatabase = openHostStateDatabase(repositoryRoot, databaseRelativePath, workspaceId);
    database = openedDatabase;
    new HostStateStore(openedDatabase, workspaceId, undefined, undefined, undefined, undefined, repositoryRoot);
    openedDatabase.exec(
      'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT, work_id TEXT, attempt INTEGER, revision INTEGER, payload TEXT, digest TEXT, PRIMARY KEY(workspace_id,work_id,attempt))',
    );
    const projectIds = ['agent'];
    const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
    const workId = 'repair-fixture';
    const attempt = 2;
    const actionId = 'b'.repeat(64);
    const issueId = '10000000-0000-4000-8000-000000000002';
    const nativeHandle = 'fixture-original-native-session';
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(repositoryRoot), ['AGENT.sidecar.md']);
    const put = (table: string, keys: readonly (string | number)[], value: unknown, revision = 1) =>
      openedDatabase
        .query(
          `INSERT INTO ${table} VALUES(${Array(keys.length + 3)
            .fill('?')
            .join(',')})`,
        )
        .run(...keys, revision, canonicalJson(value), canonicalJsonDigest(value));
    const work = {
      schema: 'WorkState/v1',
      workspace_id: workspaceId,
      revision: 1,
      binding: {
        repository_id: config.repository.repository_id,
        lifecycle_work_id: workId,
        project_ids: projectIds,
        integrations_digest: project.integrations_digest,
        team_id: 'fixture-team',
        workflow_id: 'information_research_light',
        provider_work_item_id: workId,
        work_item_digest: '1'.repeat(64),
        config_digest: runtimeConfigDigest(config),
        work_source_revision: source.digest,
        scope_id: 'scope-repair-fixture',
        scope_contract_digest: '2'.repeat(64),
        acceptance_manifest_digest: '3'.repeat(64),
        ac_ids: ['AC-READONLY-REPAIR'],
        implementation_paths: ['AGENT.sidecar.md'],
        allowed_resources: ['file:AGENT.sidecar.md'],
        runtime_source_revision: source.digest,
        schema_digest: '4'.repeat(64),
        runtime_code_digest: '5'.repeat(64),
      },
      contracts: {
        scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: '2'.repeat(64) },
        acceptance: { schema: 'AcceptanceManifest/v1', path: '.agent/acceptance.json', sha256: '3'.repeat(64) },
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
        source_revision: source.digest,
        next_action: 'Repair the paused read-only dispatch.',
        route: 'R3',
        risk: 'high',
        change_kind: 'fix',
        config_binding: {
          config_digest: runtimeConfigDigest(config),
          schema_digest: '4'.repeat(64),
          runtime_code_digest: '5'.repeat(64),
        },
        scope: {
          scope_id: 'scope-repair-fixture',
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
    const workKey = JSON.stringify([project.repository_id, projectIds, project.integrations_digest, workId]);
    put('agent_host_state', [workspaceId, 'work', workKey], work);
    const releasedResources = ['file:AGENT.sidecar.md'];
    const releasedTicket = {
      schema: 'CoordinationTicket/v1',
      ticket_id: 'fixture-released-ticket',
      repository_id: project.repository_id,
      project_ids: projectIds,
      integrations_digest: project.integrations_digest,
      work_id: workId,
      thread_id: nativeHandle,
      source_revision: source.digest,
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
      source_revision: source.digest,
      resources: releasedResources,
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      decided_by: nativeHandle,
      decision_pointer: 'fixture:original-cooperative-pause',
      created_at: '2026-09-28T10:00:00.000Z',
    };
    const ledger = {
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
    };
    put('agent_host_state', [workspaceId, 'ledger', 'shared'], ledger, ledger.revision);
    const request = (action: string, assignmentIndex: number, role: string): SessionBridgeRequest => ({
      schema: 'VidaSessionRequest/v1',
      action_id: action,
      workflow_id: 'information_research_light',
      wave_index: 0,
      stage_id: 'research_parallel',
      assignment_index: assignmentIndex,
      role,
      config_digest: runtimeConfigDigest(config),
      scope_digest: source.digest,
      bindings_manifest_ref: 'e'.repeat(64),
      run_id: 'run-fixture',
    });
    const state: MastraSessionLedgerState = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: workId,
      attempt,
      run_id: 'run-fixture',
      step_id: 'wave-0',
      source_scope: source,
      items: [
        {
          request: request('c'.repeat(64), 0, 'documentation-researcher'),
          issue_id: '10000000-0000-4000-8000-000000000001',
          observation: completedObservation('c'.repeat(64), '10000000-0000-4000-8000-000000000001'),
        },
        { request: request(actionId, 1, 'code-researcher'), issue_id: issueId, observation: null },
        {
          request: request('d'.repeat(64), 2, 'platform-researcher'),
          issue_id: '10000000-0000-4000-8000-000000000003',
          observation: completedObservation('d'.repeat(64), '10000000-0000-4000-8000-000000000003'),
        },
      ],
      completed: [],
    };
    put('agent_host_mastra_session_ledger', [workspaceId, workId, attempt], state, 9);
    const input = {
      database: openedDatabase,
      repositoryRoot,
      config,
      workspaceId,
      projectIds,
      workId,
      attempt,
      actionId,
      issueId,
      nativeHandle,
      repairId: 'fixture-dispatch-repair',
      actor: 'fixture-operator',
      timestamp: '2026-09-28T10:00:00.000Z',
    };
    return { database: openedDatabase, input, state, work, ledger, workKey, repositoryRoot };
  } catch (error) {
    if (database !== undefined) {
      closeWorkspaceDatabaseWithAdmission(database);
    } else {
      rmSync(repositoryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
    throw error;
  }
}

function closeFixture(value: ReturnType<typeof fixture>, retainRoot: boolean): void {
  closeWorkspaceDatabaseWithAdmission(value.database);
  if (!retainRoot) rmSync(value.repositoryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

function repairSnapshot(value: ReturnType<typeof fixture>) {
  const projectContext = loadProjectSetContext(
    value.repositoryRoot,
    value.input.config,
    value.input.config.repository.repository_id,
    value.input.projectIds,
  );
  const store = new HostStateStore(
    value.database,
    value.input.workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    value.repositoryRoot,
  );
  const snapshot = store.readWorkSessionSnapshot(
    {
      repository_id: projectContext.repository_id,
      project_ids: projectContext.project_ids,
      integrations_digest: projectContext.integrations_digest,
      work_id: value.input.workId,
    },
    value.input.attempt,
  );
  return { projectContext, snapshot };
}

test('read-only repair context handoff preserves plan bytes and refuses forged or mismatched contexts', () => {
  const value = fixture();
  let foreignRoot: string | undefined;
  let passed = false;
  try {
    const { projectContext, snapshot } = repairSnapshot(value);
    const input = { ...value.input, snapshot };
    const expected = planReadOnlyDispatchRepair(value.input);
    expect(buildReadOnlyDispatchRepairPlan(input)).toEqual(expected);
    expect(buildReadOnlyDispatchRepairPlan({ ...input, projectContext })).toEqual(expected);
    expect(() => buildReadOnlyDispatchRepairPlan({ ...input, projectContext: { ...projectContext } })).toThrow(
      /project context must be issued/,
    );
    expect(() =>
      buildReadOnlyDispatchRepairPlan({
        ...input,
        projectContext,
        config: { ...input.config, repository: { ...input.config.repository, title: 'changed title' } },
      }),
    ).toThrow(/repair project context differs/);
    copyFileSync(
      path.join(value.repositoryRoot, 'AGENT.sidecar.md'),
      path.join(value.repositoryRoot, 'packages/plugin/AGENT.sidecar.md'),
    );
    const otherProjects = loadProjectSetContext(
      value.repositoryRoot,
      input.config,
      input.config.repository.repository_id,
      ['agent', 'plugin'],
    );
    expect(() => buildReadOnlyDispatchRepairPlan({ ...input, projectContext: otherProjects })).toThrow(
      /repair project context differs/,
    );
    foreignRoot = makeFixtureRoot();
    const foreignContext = loadProjectSetContext(
      foreignRoot,
      input.config,
      input.config.repository.repository_id,
      input.projectIds,
    );
    expect(() => buildReadOnlyDispatchRepairPlan({ ...input, projectContext: foreignContext })).toThrow(
      /resolved path profile identity is invalid/,
    );
    for (const projectIds of [[], ['agent', 'agent'], ['plugin', 'agent']])
      expect(() => buildReadOnlyDispatchRepairPlan({ ...input, projectContext, projectIds })).toThrow(
        /project set must be exact sorted unique IDs/,
      );
    expect(readRepairRows(value.database)).toEqual([]);
    passed = true;
  } finally {
    closeFixture(value, !passed);
    if (passed && foreignRoot !== undefined) rmSync(foreignRoot, { recursive: true, force: true });
  }
});

test('read-only repair context handoff reuses its planning epoch while fenced commit rejects disk drift', () => {
  const value = fixture();
  let passed = false;
  try {
    const { projectContext, snapshot } = repairSnapshot(value);
    const input = { ...value.input, snapshot };
    const expected = buildReadOnlyDispatchRepairPlan(input);
    writeFileSync(
      path.join(value.repositoryRoot, 'agent-runtime.config.v1.yaml'),
      canonicalJson({
        ...input.config,
        repository: { ...input.config.repository, title: 'changed planning epoch' },
      }),
    );
    const plan = buildReadOnlyDispatchRepairPlan({ ...input, projectContext });
    expect(plan).toEqual(expected);
    expect(() => buildReadOnlyDispatchRepairPlan(input)).toThrow(/runtime config snapshot is stale or forged/);
    expect(() => applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toThrow(
      /work authority differs/,
    );
    expect(readRepairRows(value.database)).toEqual([]);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

test('read-only dispatch repair binds old unknown issue and idempotently prepares one generation', () => {
  const value = fixture();
  let passed = false;
  try {
    const plan = planReadOnlyDispatchRepair(value.input);
    expect(plan.prior_outcome).toBe('unknown');
    expect(plan.logical_action_id).toBe(value.input.actionId);
    expect(plan.dispatch_action_id).not.toBe(value.input.actionId);
    expect(plan.replacement_generation).toBe(1);
    const before = {
      host: value.database
        .query(
          'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
        )
        .all(),
      journal: value.database
        .query('SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
        .all(),
    };
    expect(applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toEqual(plan);
    expect({
      host: value.database
        .query(
          'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
        )
        .all(),
      journal: value.database
        .query('SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
        .all(),
    }).toEqual(before);
    const firstRepairRows = readRepairRows(value.database);
    expect(applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toEqual(plan);
    expect({
      host: value.database
        .query(
          'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
        )
        .all(),
      journal: value.database
        .query('SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
        .all(),
    }).toEqual(before);
    expect(readRepairRows(value.database)).toEqual(firstRepairRows);
    const repairCount = value.database.query('SELECT COUNT(*) AS count FROM agent_host_readonly_dispatch_repair').get();
    expect(
      typeof repairCount === 'object' && repairCount !== null && 'count' in repairCount ? repairCount.count : undefined,
    ).toBe(1);
    const storedRow: unknown = value.database
      .query('SELECT payload,digest FROM agent_host_readonly_dispatch_repair')
      .get();
    if (
      typeof storedRow !== 'object' ||
      storedRow === null ||
      !('payload' in storedRow) ||
      typeof storedRow.payload !== 'string' ||
      !('digest' in storedRow) ||
      typeof storedRow.digest !== 'string'
    )
      throw new Error('persisted read-only dispatch repair row is malformed');
    const originalPayload = storedRow.payload;
    const originalDigest = storedRow.digest;
    for (const corrupted of [
      { column: 'payload', value: 'conflicting payload' },
      { column: 'digest', value: 'conflicting digest' },
      { column: 'payload', value: new Uint8Array([0]) },
      { column: 'digest', value: new Uint8Array([0]) },
    ] as const) {
      const changed = value.database
        .query(
          `UPDATE agent_host_readonly_dispatch_repair SET ${corrupted.column}=? WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1`,
        )
        .run(corrupted.value, value.input.workspaceId, value.input.workId, value.input.attempt, value.input.actionId);
      expect(changed.changes).toBe(1);
      const conflictingRows = readRepairRows(value.database);
      expect(() => applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toThrow(
        'existing read-only dispatch repair generation differs',
      );
      expect({
        host: value.database
          .query(
            'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
          )
          .all(),
        journal: value.database
          .query('SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
          .all(),
      }).toEqual(before);
      expect(readRepairRows(value.database)).toEqual(conflictingRows);
      expect(
        value.database
          .query(
            'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
          )
          .run(
            originalPayload,
            originalDigest,
            value.input.workspaceId,
            value.input.workId,
            value.input.attempt,
            value.input.actionId,
          ).changes,
      ).toBe(1);
      expect(readRepairRows(value.database)).toEqual(firstRepairRows);
    }
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

test('read-only dispatch repair rejects a correctly digested plan from another maintenance generation before publication', () => {
  const value = fixture();
  let passed = false;
  try {
    const currentPlan = planReadOnlyDispatchRepair(value.input);
    expect(currentPlan.maintenance_generation).toBe(0);
    const { digest: _digest, ...currentBody } = currentPlan;
    const staleGenerationBody = { ...currentBody, maintenance_generation: 1 };
    const staleGenerationPlan = {
      ...staleGenerationBody,
      digest: canonicalJsonDigest(staleGenerationBody),
    };
    const before = {
      host: value.database
        .query(
          'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
        )
        .all(),
      journal: value.database
        .query('SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
        .all(),
      repairs: readRepairRows(value.database),
    };

    expect(() =>
      applyReadOnlyDispatchRepair({ database: value.database, plan: staleGenerationPlan, current: value.input }),
    ).toThrow(/maintenance generation is stale or missing/);
    expect({
      host: value.database
        .query(
          'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
        )
        .all(),
      journal: value.database
        .query('SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger')
        .all(),
      repairs: readRepairRows(value.database),
    }).toEqual(before);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

test('read-only dispatch repair validates caller config before plan digest without recording', () => {
  const value = fixture();
  let passed = false;
  try {
    const plan = planReadOnlyDispatchRepair(value.input);
    let digestReads = 0;
    const staleConfigPlan = {
      ...plan,
      config_digest: '0'.repeat(64),
      get digest(): string {
        digestReads++;
        throw new Error('A mismatched config must not evaluate the plan digest');
      },
    };
    const message = 'vida read-only dispatch repair: repair plan digest or current configuration invalid';
    expect(() =>
      applyReadOnlyDispatchRepair({ database: value.database, plan: staleConfigPlan, current: value.input }),
    ).toThrow(message);
    expect(digestReads).toBe(0);
    expect(() =>
      applyReadOnlyDispatchRepair({
        database: value.database,
        plan: { ...plan, digest: '0'.repeat(64) },
        current: value.input,
      }),
    ).toThrow(message);
    expect(readRepairRows(value.database)).toEqual([]);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

test('read-only dispatch repair denies stale report and source/config drift', () => {
  const value = fixture();
  let passed = false;
  try {
    const plan = planReadOnlyDispatchRepair(value.input);
    const changed = {
      ...value.state,
      items: value.state.items.map((item, index) =>
        index === 1
          ? { ...item, observation: completedObservation(value.input.actionId, '10000000-0000-4000-8000-000000000002') }
          : item,
      ),
    };
    value.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
      .run(10, canonicalJson(changed), canonicalJsonDigest(changed));
    expect(() => applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toThrow(
      /state compare-and-swap conflict/,
    );
    value.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
      .run(9, canonicalJson(value.state), canonicalJsonDigest(value.state));
    const drift = {
      ...value.state,
      items: value.state.items.map((item, index) =>
        index === 1 ? { ...item, request: { ...item.request, config_digest: 'f'.repeat(64) } } : item,
      ),
    };
    value.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
      .run(10, canonicalJson(drift), canonicalJsonDigest(drift));
    expect(() => planReadOnlyDispatchRepair(value.input)).toThrow(/source or configuration binding differs/);
    replaceJournalRow(value.database, value.input.workspaceId, value.input.workId, value.input.attempt, 9, value.state);
    writeFileSync(path.join(value.repositoryRoot, 'AGENT.sidecar.md'), 'Changed declared fixture source.\n');
    expect(() => applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toThrow(
      /declared source drift/,
    );
    expect(() => planReadOnlyDispatchRepair(value.input)).toThrow(/declared source drift/);
    expect(readRepairRows(value.database)).toEqual([]);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

test('read-only dispatch repair commit rejects work, shared-ledger and journal CAS drift without recording', () => {
  for (const changed of ['work', 'ledger', 'journal'] as const) {
    const value = fixture();
    let passed = false;
    try {
      const plan = planReadOnlyDispatchRepair(value.input);
      if (changed === 'work') {
        const changedWork = {
          ...value.work,
          revision: 2,
          lifecycle: { ...value.work.lifecycle, revision: 2 },
          execution: { ...value.work.execution, input_digest: '7'.repeat(64) },
        };
        replaceHostRow(value.database, value.input.workspaceId, 'work', value.workKey, 2, changedWork);
      } else if (changed === 'ledger') {
        const changedLedger = { ...value.ledger, revision: 3, open_generation: 2 };
        replaceHostRow(value.database, value.input.workspaceId, 'ledger', 'shared', 3, changedLedger);
      } else {
        const changedJournal = { ...value.state, step_id: 'changed-wave' };
        replaceJournalRow(
          value.database,
          value.input.workspaceId,
          value.input.workId,
          value.input.attempt,
          10,
          changedJournal,
        );
      }
      expect(() => applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toThrow(
        /state compare-and-swap conflict/,
      );
      expect(readRepairRows(value.database)).toEqual([]);
      passed = true;
    } finally {
      closeFixture(value, !passed);
    }
  }
});

test('read-only dispatch repair requires the original owner to be cooperatively paused', () => {
  const value = fixture();
  let passed = false;
  try {
    const activeWork = {
      ...value.work,
      revision: 2,
      lifecycle: { ...value.work.lifecycle, revision: 2 },
      execution: { ...value.work.execution, status: 'active' as const },
    };
    replaceHostRow(value.database, value.input.workspaceId, 'work', value.workKey, 2, activeWork);
    expect(() => planReadOnlyDispatchRepair(value.input)).toThrow(/cooperatively paused/);
    expect(readRepairRows(value.database)).toEqual([]);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

test('read-only dispatch repair rejects a well-formed but foreign native session handle', () => {
  const value = fixture();
  let passed = false;
  try {
    const wrongHandleInput = { ...value.input, nativeHandle: 'fixture-foreign-native-session' };
    expect(() => planReadOnlyDispatchRepair(wrongHandleInput)).toThrow(/exact owner-attributed released ticket/);
    expect(readRepairRows(value.database)).toEqual([]);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

test('read-only dispatch repair denies started and uncertain Host assignments', () => {
  for (const status of ['started', 'uncertain'] as const) {
    const value = fixture();
    let passed = false;
    try {
      const unresolvedAttempt = {
        assignment_id: canonicalJsonDigest({
          binding: value.work.binding,
          run_id: value.work.execution.run_id,
          input_digest: value.work.execution.input_digest,
          stage_id: 'research_parallel',
          assignment_index: 1,
        }),
        attempt_id: '',
        request_digest: 'c'.repeat(64),
        stage_id: 'research_parallel',
        assignment_index: 1,
        lease: {
          ticket_id: 'fixture-released-ticket',
          thread_id: value.input.nativeHandle,
          generation: 1,
        },
        status,
        result: null,
        result_digest: null,
        previous_attempt_id: null,
        reconciliation: null,
        correction_generation: 0,
        correction_authorization: null,
      };
      unresolvedAttempt.attempt_id = canonicalJsonDigest({
        assignment_id: unresolvedAttempt.assignment_id,
        request_digest: unresolvedAttempt.request_digest,
        lease: unresolvedAttempt.lease,
        previous_attempt_id: null,
      });
      const unresolvedWork = {
        ...value.work,
        revision: 2,
        lifecycle: { ...value.work.lifecycle, revision: 2 },
        execution: { ...value.work.execution, assignment_attempts: [unresolvedAttempt] },
      };
      replaceHostRow(value.database, value.input.workspaceId, 'work', value.workKey, 2, unresolvedWork);
      expect(() => planReadOnlyDispatchRepair(value.input)).toThrow(/paused work authority or scoped source changed/);
      expect(readRepairRows(value.database)).toEqual([]);
      passed = true;
    } finally {
      closeFixture(value, !passed);
    }
  }
});

test('read-only dispatch repair rejects a different actor for an already recorded generation', () => {
  const value = fixture();
  let passed = false;
  try {
    const firstPlan = planReadOnlyDispatchRepair(value.input);
    expect(applyReadOnlyDispatchRepair({ database: value.database, plan: firstPlan, current: value.input })).toEqual(
      firstPlan,
    );
    const before = readRepairRows(value.database);
    const secondInput = { ...value.input, actor: 'fixture-other-operator' };
    const secondPlan = planReadOnlyDispatchRepair(secondInput);
    expect(secondPlan.repair_id).toBe(firstPlan.repair_id);
    expect(() =>
      applyReadOnlyDispatchRepair({ database: value.database, plan: secondPlan, current: secondInput }),
    ).toThrow(/existing read-only dispatch repair generation differs/);
    expect(readRepairRows(value.database)).toEqual(before);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});

// Existing schema-valid history may still carry a release from a different source binding.
test('read-only dispatch repair rejects a released owner with foreign release provenance', () => {
  const value = fixture();
  let passed = false;
  try {
    const ledger = {
      ...value.ledger,
      revision: 3,
      operations: value.ledger.operations.map((operation) => ({ ...operation, source_revision: 'e'.repeat(64) })),
    };
    replaceHostRow(value.database, value.input.workspaceId, 'ledger', 'shared', 3, ledger);
    expect(() => planReadOnlyDispatchRepair(value.input)).toThrow(/released owner provenance differs/);
    expect(readRepairRows(value.database)).toEqual([]);
    passed = true;
  } finally {
    closeFixture(value, !passed);
  }
});
