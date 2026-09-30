import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.mjs';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';

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
    if (parent === current) throw new Error('source fixture missing');
    current = parent;
  }
}

function fixture() {
  const source = sourceRoot();
  const root = mkdtempSync(path.join(tmpdir(), 'vida-readonly-dispatch-'));
  const put = (relative, bytes) => {
    const target = path.join(root, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  };
  mkdirSync(path.join(root, '.git'));
  for (const relative of [
    'AGENTS.md',
    'AGENT.sidecar.md',
    'agent-runtime.config.v1.yaml',
    'docs/creatio/map.md',
    'docs/agent-instructions/index.md',
    'docs/agent-instructions/documentation-policy.v1.json',
    'docs/tenants/crmbx/internal/projects/3mob/documentation-policy.v1.json',
  ])
    put(relative, readFileSync(path.join(source, relative)));
  mkdirSync(path.join(root, 'project/crmbx'), { recursive: true });
  cpSync(path.join(bundle, 'schemas'), path.join(root, 'vida-agent/schemas'), { recursive: true });
  put('vida-agent/package.json', readFileSync(path.join(bundle, 'package.json')));
  put('vida-agent/TESTING.md', readFileSync(path.join(bundle, 'TESTING.md')));
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const projectIds = ['refactoring'];
  const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
  const workId = 'readonly-repair-fixture';
  const attempt = 2;
  const actionId = 'a'.repeat(64);
  const issueId = 'old-issue';
  const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
  const databasePath = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.exec(
    'CREATE TABLE agent_host_state (workspace_id TEXT NOT NULL, kind TEXT NOT NULL, id TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,kind,id))',
  );
  database.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  const putRow = (table, keys, value, revision = 1) =>
    database
      .query(
        `INSERT INTO ${table} VALUES(${Array(keys.length + 3)
          .fill('?')
          .join(',')})`,
      )
      .run(...keys, revision, canonicalJson(value), canonicalJsonDigest(value));
  const workKey = JSON.stringify([project.repository_id, projectIds, project.integrations_digest, workId]);
  const binding = {
    repository_id: project.repository_id,
    project_ids: projectIds,
    integrations_digest: project.integrations_digest,
    team_id: 'team',
    workflow_id: 'information_research_light',
    provider_work_item_id: workId,
    lifecycle_work_id: workId,
    work_item_digest: 'b'.repeat(64),
    work_source_revision: sourceScope.digest,
    scope_id: 'scope-' + workId,
    scope_contract_digest: 'c'.repeat(64),
    acceptance_manifest_digest: 'd'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: ['vida-agent/TESTING.md'],
    allowed_resources: ['file:vida-agent/TESTING.md'],
    config_digest: runtimeConfigDigest(config),
    runtime_source_revision: 'runtime-source',
    schema_digest: 'f'.repeat(64),
    runtime_code_digest: '0'.repeat(64),
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
    execution: {
      run_id: 'run-1',
      input_digest: '1'.repeat(64),
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
      next_action: 'Await repair.',
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
        allowed_paths: ['vida-agent/TESTING.md'],
        fingerprint_paths: ['vida-agent/TESTING.md'],
        implementation_paths: ['vida-agent/TESTING.md'],
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
  putRow('agent_host_state', [workspaceId, 'work', workKey], work);
  putRow('agent_host_state', [workspaceId, 'ledger', 'shared'], {
    schema: 'CoordinationLedger/v1',
    workspace_id: workspaceId,
    revision: 1,
    open_generation: 1,
    next_sequence: 1,
    tickets: [],
    claims: [],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    operations: [],
    retirements: [],
  });
  const request = (action, assignment, role) => ({
    action_id: action,
    workflow_id: 'information_research_light',
    stage_id: 'research_parallel',
    assignment_index: assignment,
    role,
    config_digest: runtimeConfigDigest(config),
    scope_digest: sourceScope.digest,
    run_id: 'run-1',
  });
  const mastra = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspaceId,
    work_id: workId,
    attempt,
    run_id: 'run-1',
    step_id: 'wave-0',
    source_scope: sourceScope,
    items: [
      {
        request: request('b'.repeat(64), 0, 'documentation-researcher'),
        issue_id: 'issue-1',
        observation: { action_id: 'b'.repeat(64), issue_id: 'issue-1', status: 'reported_complete' },
      },
      { request: request(actionId, 1, 'code-researcher'), issue_id: issueId, observation: null },
      {
        request: request('c'.repeat(64), 2, 'platform-researcher'),
        issue_id: 'issue-3',
        observation: { action_id: 'c'.repeat(64), issue_id: 'issue-3', status: 'reported_complete' },
      },
    ],
    completed: [],
  };
  putRow('agent_host_mastra_session_ledger', [workspaceId, workId, attempt], mastra, 9);
  database.close();
  const common = ['--kind', 'readonly-dispatch', '--project-root', root, '--repair-id', 'fixture-dispatch'];
  const args = (mode) => [
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
          'refactoring',
          '--work-id',
          workId,
          '--attempt',
          String(attempt),
          '--action-id',
          actionId,
          '--issue-id',
          issueId,
          '--native-handle',
          '/root/code-research',
        ]
      : []),
  ];
  return { root, args, databasePath, workspaceId, workId, attempt, actionId, issueId };
}

test('sole public reconcile CLI plans and applies one paused read-only dispatch intent', async () => {
  const value = fixture();
  try {
    const inspected = await runReconcileArtifacts(value.args('inspect'));
    expect(inspected.status).toBe('repairable_current_v1');
    expect(existsSync(path.join(value.root, '.agent/work/fixture-dispatch/read-only-dispatch-plan.v1.json'))).toBe(
      false,
    );
    const planned = await runReconcileArtifacts(value.args('plan'));
    expect(planned.status).toBe('planned');
    const applied = await runReconcileArtifacts(value.args('apply'));
    expect(applied.status).toBe('prepared');
    expect(applied.old_issue_outcome).toBe('unknown');
    expect(await runReconcileArtifacts(value.args('resume'))).toEqual(applied);
    const db = new Database(value.databasePath, { readonly: true });
    try {
      expect(db.query('SELECT COUNT(*) AS count FROM agent_host_readonly_dispatch_repair').get().count).toBe(1);
      const old = db.query('SELECT payload FROM agent_host_mastra_session_ledger').get();
      expect(JSON.parse(old.payload).items[1].issue_id).toBe(value.issueId);
      expect(JSON.parse(old.payload).items[1].observation).toBeNull();
    } finally {
      db.close();
    }
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
});

test('successor consumer atomically switches issue generation and rejects a late old report', async () => {
  const value = fixture();
  try {
    await runReconcileArtifacts(value.args('plan'));
    await runReconcileArtifacts(value.args('apply'));
    let ledger = openConfiguredMastraSessionLedger(value.root);
    try {
      const before = ledger.resume(value.workId, value.attempt);
      expect(before.resume_status).toBe('issued_outcome_uncertain');
      const changed = ledger.activateReadOnlyReplacement(value.workId, value.attempt, before.version, value.actionId);
      expect(changed.dispatch.logical_action_id).toBe(value.actionId);
      expect(changed.dispatch.dispatch_action_id).not.toBe(value.actionId);
      expect(changed.dispatch.prior_issue_id).toBe(value.issueId);
      expect(changed.snapshot.state.items[1].issue_id).toBe(changed.dispatch.issue_id);
      ledger.close();
      ledger = openConfiguredMastraSessionLedger(value.root);
      expect(ledger.replacementDispatch(value.workId, value.attempt, value.actionId)).toEqual(changed.dispatch);
      expect(() =>
        ledger.activateReadOnlyReplacement(value.workId, value.attempt, before.version, value.actionId),
      ).toThrow(/CAS version|already activated/);
      expect(() =>
        ledger.report(
          value.workId,
          value.attempt,
          changed.snapshot.version,
          { action_id: value.actionId, issue_id: value.issueId, host_attempt_id: undefined },
          changed.snapshot.state.source_scope,
        ),
      ).toThrow(/matching open issuance/);
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
      };
      const observed = ledger.reportReadOnlyReplacement(
        value.workId,
        value.attempt,
        changed.snapshot.version,
        report,
        changed.snapshot.state.source_scope,
      );
      expect(observed.state.items[1].observation.action_id).toBe(value.actionId);
      expect(observed.state.items[1].observation.issue_id).toBe(changed.dispatch.issue_id);
      expect(observed.resume_status).toBe('ready_to_resume');
      expect(() =>
        ledger.reportReadOnlyReplacement(
          value.workId,
          value.attempt,
          changed.snapshot.version,
          report,
          changed.snapshot.state.source_scope,
        ),
      ).toThrow(/CAS version/);
      const out = new Database(value.databasePath, { readonly: true });
      try {
        const raw = JSON.parse(out.query('SELECT payload FROM agent_host_readonly_dispatch_outcome').get().payload);
        expect(raw.raw_observation.action_id).toBe(changed.dispatch.dispatch_action_id);
        expect(raw.raw_observation.tool_call_ref).toBe(report.tool_call_ref);
      } finally {
        out.close();
      }
    } finally {
      ledger.close();
    }
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
}, 30_000);
