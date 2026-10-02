import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { planReadOnlyDispatchRepair, applyReadOnlyDispatchRepair } from '../bin/read-only-dispatch-repair.mjs';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function sourceRoot() {
  let current = path.dirname(bundle);
  for (;;) {
    if (
      existsSync(path.join(current, 'agent-runtime.config.v1.yaml')) &&
      existsSync(path.join(current, 'AGENT.sidecar.md'))
    )
      return current;
    const parent = path.dirname(current);
    if (parent === current) throw new Error('runtime configuration fixture unavailable');
    current = parent;
  }
}

function fixture() {
  const repositoryRoot = sourceRoot();
  const config = loadRuntimeConfig(repositoryRoot);
  const database = new Database(':memory:');
  database.exec(
    'CREATE TABLE agent_host_state (workspace_id TEXT, kind TEXT, id TEXT, revision INTEGER, payload TEXT, digest TEXT)',
  );
  database.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT, work_id TEXT, attempt INTEGER, revision INTEGER, payload TEXT, digest TEXT)',
  );
  const workspaceId = 'a'.repeat(64);
  const projectIds = ['agent'];
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
  const workId = 'repair-fixture';
  const attempt = 2;
  const actionId = 'b'.repeat(64);
  const issueId = 'old-issued-issue';
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(repositoryRoot), ['AGENT.sidecar.md']);
  const put = (table, keys, value, revision = 1) =>
    database
      .query(
        `INSERT INTO ${table} VALUES(${Array(keys.length + 3)
          .fill('?')
          .join(',')})`,
      )
      .run(...keys, revision, canonicalJson(value), canonicalJsonDigest(value));
  const work = {
    schema: 'WorkState/v1',
    binding: {
      lifecycle_work_id: workId,
      project_ids: projectIds,
      integrations_digest: project.integrations_digest,
      config_digest: runtimeConfigDigest(config),
      work_source_revision: source.digest,
    },
    execution: { run_id: 'run-fixture' },
  };
  const workKey = JSON.stringify([project.repository_id, projectIds, project.integrations_digest, workId]);
  put('agent_host_state', [workspaceId, 'work', workKey], work);
  put('agent_host_state', [workspaceId, 'ledger', 'shared'], {
    schema: 'CoordinationLedger/v1',
    workspace_id: workspaceId,
  });
  const request = (action, assignmentIndex, role) => ({
    action_id: action,
    workflow_id: 'information_research_light',
    stage_id: 'research_parallel',
    assignment_index: assignmentIndex,
    role,
    config_digest: runtimeConfigDigest(config),
    scope_digest: source.digest,
    run_id: 'run-fixture',
  });
  const state = {
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
        issue_id: 'issue-1',
        observation: { status: 'reported_complete' },
      },
      { request: request(actionId, 1, 'code-researcher'), issue_id: issueId, observation: null },
      {
        request: request('d'.repeat(64), 2, 'platform-researcher'),
        issue_id: 'issue-3',
        observation: { status: 'reported_complete' },
      },
    ],
    completed: [],
  };
  put('agent_host_mastra_session_ledger', [workspaceId, workId, attempt], state, 9);
  const input = {
    database,
    repositoryRoot,
    config,
    workspaceId,
    projectIds,
    workId,
    attempt,
    actionId,
    issueId,
    nativeHandle: '/root/old-code-research',
    repairId: 'fixture-dispatch-repair',
    actor: 'fixture-operator',
    timestamp: '2026-09-28T10:00:00.000Z',
  };
  return { database, input, state };
}

test('read-only dispatch repair binds old unknown issue and idempotently prepares one generation', () => {
  const value = fixture();
  try {
    const plan = planReadOnlyDispatchRepair(value.input);
    expect(plan.prior_outcome).toBe('unknown');
    expect(plan.logical_action_id).toBe(value.input.actionId);
    expect(plan.dispatch_action_id).not.toBe(value.input.actionId);
    expect(plan.replacement_generation).toBe(1);
    const before = value.database.query('SELECT payload,digest FROM agent_host_mastra_session_ledger').get();
    expect(applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toEqual(plan);
    expect(applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toEqual(plan);
    expect(value.database.query('SELECT COUNT(*) AS count FROM agent_host_readonly_dispatch_repair').get().count).toBe(
      1,
    );
    expect(value.database.query('SELECT payload,digest FROM agent_host_mastra_session_ledger').get()).toEqual(before);
  } finally {
    value.database.close();
  }
});

test('read-only dispatch repair denies stale report and source/config drift', () => {
  const value = fixture();
  try {
    const plan = planReadOnlyDispatchRepair(value.input);
    const changed = structuredClone(value.state);
    changed.items[1].observation = { status: 'reported_complete' };
    value.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
      .run(10, canonicalJson(changed), canonicalJsonDigest(changed));
    expect(() => applyReadOnlyDispatchRepair({ database: value.database, plan, current: value.input })).toThrow(
      /one exact unobserved/,
    );
    value.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
      .run(9, canonicalJson(value.state), canonicalJsonDigest(value.state));
    const drift = structuredClone(value.state);
    drift.items[1].request.config_digest = 'f'.repeat(64);
    value.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
      .run(10, canonicalJson(drift), canonicalJsonDigest(drift));
    expect(() => planReadOnlyDispatchRepair(value.input)).toThrow(/source or configuration binding differs/);
  } finally {
    value.database.close();
  }
});
