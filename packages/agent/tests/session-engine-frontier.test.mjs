import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { readRetainedUnissuedSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-session-engine-frontier-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'frontier-fixture')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('.agent/work', '.agent/current-work'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    project = config.projects[0].project_id,
    workId = 'frontier-work',
    attempt = 4,
    workflowId = 'old-configured-workflow',
    runId = 'vida-old-frontier-run',
    oldConfigDigest = '1'.repeat(64),
    scope = {
      schema: 'ScopedSourceSnapshot/v1',
      entries: [{ path: 'src/example.ts', exists: true, bytes: 10, sha256: '2'.repeat(64) }],
    };
  scope.digest = canonicalJsonDigest({ schema: scope.schema, entries: scope.entries });
  const workItem = {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'fixture',
      provider_type: 'fixture',
      canonical_kind: 'bug',
      intent: 'bug_fix',
      project_id: project,
      title: 'Retained frontier fixture',
      description: '',
      labels: [],
      risk_flags: [],
    },
    intake = {
      schema: 'VidaLocalSessionIntake/v1',
      native_session_handle: 'fixture-session',
      risk: 'high',
      work_item: workItem,
      runtime_code_paths: [],
    },
    intakeBytes = Buffer.from(JSON.stringify(intake));
  writeFileSync(path.join(root, 'accepted-intake.json'), intakeBytes);
  const selection = {
    team: 'default-development',
    kind: workItem.canonical_kind,
    intent: workItem.intent,
    project,
    risk_flags: workItem.risk_flags,
    labels: workItem.labels,
  };
  const work = {
    schema: 'WorkState/v1',
    workspace_id: 'workspace-fixture',
    revision: 1,
    binding: {
      repository_id: config.repository.repository_id,
      project_ids: [project],
      integrations_digest: '3'.repeat(64),
      team_id: selection.team,
      workflow_id: workflowId,
      provider_work_item_id: workId,
      lifecycle_work_id: workId,
      work_item_digest: canonicalJsonDigest(workItem),
      work_source_revision: scope.digest,
      scope_id: 'fixture-scope',
      scope_contract_digest: '4'.repeat(64),
      acceptance_manifest_digest: '5'.repeat(64),
      ac_ids: [],
      implementation_paths: [],
      allowed_resources: [],
      config_digest: oldConfigDigest,
      runtime_source_revision: 'fixture-runtime-revision',
      schema_digest: '6'.repeat(64),
      runtime_code_digest: '7'.repeat(64),
    },
    execution: { run_id: runId, input_digest: '8'.repeat(64), phase: 'execute', status: 'active', assignment_attempts: [] },
    lease: null,
    lifecycle: { risk: 'high' },
    artifacts: [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: 'accepted-intake.json',
        sha256: createHash('sha256').update(intakeBytes).digest('hex'),
      },
    ],
  };
  const input = {
    work_id: workId,
    attempt,
    workflow_id: workflowId,
    scope_digest: scope.digest,
    config_digest: oldConfigDigest,
    selection,
    observations: [],
  };
  const request = ({ waveIndex, actionId, stageId, role, priorState }) => ({
    schema: 'VidaSessionRequest/v1',
    run_id: runId,
    workflow_id: workflowId,
    wave_index: waveIndex,
    action_id: actionId,
    assignment_index: 0,
    stage_id: stageId,
    role,
    config_digest: oldConfigDigest,
    scope_digest: scope.digest,
    bindings_manifest_ref: canonicalJsonDigest({
      config_digest: oldConfigDigest,
      scope_digest: scope.digest,
      work_id: workId,
      attempt,
      action_id: actionId,
      stage_id: stageId,
      configured_context_digest: null,
      wave_index: waveIndex,
      prior_results: priorState.observations.map((observation) => observation.output_digest),
    }),
  });
  const prefixRequest = request({
      waveIndex: 0,
      actionId: 'a'.repeat(64),
      stageId: 'research_code',
      role: 'code-researcher',
      priorState: input,
    }),
    prefixObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: prefixRequest.action_id,
      issue_id: randomUUID(),
      agent_id: 'code-researcher',
      tool_call_ref: 'fixture-prefix-call',
      status: 'reported_complete',
      summary: 'Retained successful research result',
      output_digest: canonicalJsonDigest('Retained successful research result'),
      evidence_refs: [],
    },
    prefixOutput = { ...input, observations: [prefixObservation] },
    frontierRequest = request({
      waveIndex: 3,
      actionId: 'b'.repeat(64),
      stageId: 'develop_change',
      role: 'developer-orchestrator',
      priorState: prefixOutput,
    });
  const journal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: work.workspace_id,
    work_id: workId,
    attempt,
    run_id: runId,
    source_scope: scope,
    step_id: 'wave-3',
    items: [{ request: frontierRequest, issue_id: null, observation: null }],
    completed: [
      {
        step_id: 'wave-0',
        items: [{ request: prefixRequest, issue_id: prefixObservation.issue_id, observation: prefixObservation }],
      },
    ],
  };
  const snapshot = {
    runId,
    status: 'suspended',
    context: {
      input,
      'wave-0': {
        status: 'success',
        payload: input,
        suspendPayload: { requests: [prefixRequest] },
        resumePayload: { observations: [prefixObservation] },
        output: prefixOutput,
      },
      'wave-3': {
        status: 'suspended',
        payload: prefixOutput,
        suspendPayload: { requests: [frontierRequest] },
      },
    },
    suspendedPaths: { 'wave-3': [1] },
  };
  const storageRoot = path.join(root, config.control.work_root);
  mkdirSync(storageRoot, { recursive: true });
  const databasePath = path.join(storageRoot, 'mastra-workflows.v1.sqlite'),
    database = new Database(databasePath, { create: true, strict: true });
  try {
    database.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot BLOB)');
    database
      .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
      .run(workflowId, runId, JSON.stringify(snapshot));
  } finally {
    database.close();
  }
  const oldStorageRoot = path.join(root, '.agent', 'work');
  mkdirSync(oldStorageRoot, { recursive: true });
  writeFileSync(path.join(oldStorageRoot, 'mastra-workflows.v1.sqlite'), 'decoy old-config database');
  const binding = {
    repositoryRoot: root,
    config,
    selection,
    context: { work_id: workId, attempt, scope_digest: scope.digest },
    workflowId,
    runId,
  };
  return { root, databasePath, binding, work, journal, snapshot, runId, frontierRequest, prefixObservation, prefixOutput };
}

function withFixture(callback) {
  const value = fixture();
  try {
    callback(value);
  } finally {
    rmSync(value.root, { recursive: true, force: true });
  }
}

test('reads a retained unissued developer frontier and verifies the successful old prefix', () => {
  withFixture(({ binding, work, journal, snapshot, runId, frontierRequest, prefixObservation, prefixOutput, databasePath }) => {
    // The current config's storage path is valid even though the protected old config digest differs.
    expect(binding.config.repository.repository_id).toBe(work.binding.repository_id);
    expect(binding.config.control.work_root).toBe('.agent/current-work');
    expect(runtimeConfigDigest(binding.config)).not.toBe(work.binding.config_digest);
    const before = new Database(databasePath, { readonly: true, strict: true });
    const beforeBytes = before.query('SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot').get().snapshot;
    before.close(true);

    expect(readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toEqual({
      run_id: work.execution.run_id,
      status: 'suspended',
      step_id: journal.step_id,
      requests: [frontierRequest],
      observations: [prefixObservation],
    });

    const after = new Database(databasePath, { readonly: true, strict: true });
    expect(after.query('SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot').get().snapshot).toBe(beforeBytes);
    after.close(true);
    expect(snapshot.context['wave-0'].output).toEqual(prefixOutput);
  });
});

test('rejects retained config, scope, run, selection, and successful-prefix drift', () => {
  const mutations = [
    ({ journal }) => { journal.items[0].request.config_digest = '9'.repeat(64); },
    ({ journal }) => { journal.source_scope.digest = '9'.repeat(64); },
    ({ binding, work, journal }) => {
      journal.source_scope.entries[0].extra = 'reject';
      journal.source_scope.digest = canonicalJsonDigest({
        schema: journal.source_scope.schema,
        entries: journal.source_scope.entries,
      });
      work.binding.work_source_revision = journal.source_scope.digest;
      binding.context.scope_digest = journal.source_scope.digest;
    },
    ({ snapshot }) => { snapshot.runId = 'vida-substituted-run'; },
    ({ snapshot }) => { snapshot.context.input.selection.project = 'foreign-project'; },
    ({ snapshot }) => { snapshot.context['wave-0'].output.observations[0].summary = 'changed prefix'; },
  ];
  for (const mutate of mutations) {
    withFixture(({ binding, work, journal, snapshot, runId, databasePath }) => {
      mutate({ binding, work, journal, snapshot });
      const database = new Database(databasePath, { strict: true });
      try {
        database
          .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
          .run(JSON.stringify(snapshot), runId);
      } finally {
        database.close();
      }
      expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow();
    });
  }
});

test('rejects issued and unknown frontier outcomes, and corrective work', () => {
  const mutations = [
    ({ journal }) => { journal.items[0].issue_id = randomUUID(); },
    ({ journal, frontierRequest }) => {
      const issueId = randomUUID();
      journal.items[0].issue_id = issueId;
      journal.items[0].observation = {
        ...journal.completed[0].items[0].observation,
        action_id: frontierRequest.action_id,
        issue_id: issueId,
      };
    },
    ({ snapshot }) => { snapshot.status = 'unknown'; },
    ({ journal }) => { journal.items[0].request.corrective_execution = { schema: 'CorrectiveExecution/v1' }; },
  ];
  for (const mutate of mutations) {
    withFixture(({ binding, work, journal, snapshot, runId, databasePath, frontierRequest }) => {
      mutate({ work, journal, snapshot, frontierRequest });
      if (snapshot.status !== 'suspended') {
        const database = new Database(databasePath, { strict: true });
        try {
          database
            .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
            .run(JSON.stringify(snapshot), runId);
        } finally {
          database.close();
        }
      }
      expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow();
    });
  }
});

test('rejects a substituted database inode and duplicate retained run rows', () => {
  withFixture(({ binding, work, journal, databasePath }) => {
    const alias = databasePath + '.alias';
    linkSync(databasePath, alias);
    try {
      expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow(/unsafe/);
    } finally {
      rmSync(alias, { force: true });
    }
    const database = new Database(databasePath, { strict: true });
    try {
      const original = database.query('SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot').get();
      database.query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))').run(
        original.workflow_name,
        original.run_id,
        original.snapshot,
      );
    } finally {
      database.close();
    }
    expect(() => readRetainedUnissuedSessionEngineSnapshot(binding, { work, journal })).toThrow(/ambiguous/);
  });
});
