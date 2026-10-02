import { afterEach, test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  cpSync,
  rmSync,
  renameSync,
  symlinkSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.mjs';
import { cooperativeReadonlyAssignments } from '../bin/runtime-config-rebind.mjs';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { sessionBridgeRunId } from '../src/orchestration/mastra-session-bridge.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.mjs';
const source = process.env.VIDA_CONFIG_REBIND_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '..');
const fixtureRoots = [];
afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (v) => JSON.stringify(v, null, 2) + '\n';

function fixture({ sourceMode = false } = {}) {
  const fixtureRoot = process.env.VIDA_CONFIG_REBIND_FIXTURE_ROOT ?? tmpdir();
  const root = mkdtempSync(path.join(fixtureRoot, 'fixture-'));
  fixtureRoots.push(root);
  const put = (relative, bytes) => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  };
  mkdirSync(path.join(root, '.git'));
  const bundle = sourceMode ? 'packages/agent' : 'vida-agent';
  const projectId = sourceMode ? 'agent' : 'fixture-project';
  const template = (name) =>
    readFileSync(path.join(source, 'templates', name), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'fixture-repository')
      .replaceAll('{{PROJECTS}}', projectId)
      .replaceAll('{{PROJECT}}', projectId)
      .replaceAll('{{BUNDLE}}', bundle)
      .replaceAll('{{CREATED_AT}}', '2026-09-30T00:00:00.000Z');
  put('AGENTS.md', template('AGENTS.template.md'));
  put('AGENT.sidecar.md', template('AGENT.sidecar.template.md'));
  put('agent-runtime.config.v1.yaml', template('agent-runtime.config.template.v1.yaml'));
  put('docs/agent-instructions/documentation-policy.v1.json', template('documentation-policy.template.v1.json'));
  for (const file of ['package.json', 'TESTING.md']) put(bundle + '/' + file, readFileSync(path.join(source, file)));
  if (sourceMode) {
    put('package.json', json({ private: true, workspaces: [bundle] }));
    put(
      'agent-runtime.config.v1.yaml',
      readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8')
        .replace(
          /(projects:\r?\n  - project_id: "agent"\r?\n    title: "agent"\r?\n    project_root:) \./,
          '$1 packages/agent',
        )
        .replaceAll('src/**', 'packages/agent/**'),
    );
    for (const file of runtimeExecutableInventory(source))
      put(bundle + '/' + file, readFileSync(path.join(source, file)));
  }
  put(
    'agent-runtime.config.v1.yaml',
    readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8').replace(
      /(    executor:\r?\n      model: )[^\r\n]+(\r?\n      reasoning: )[^\r\n]+/,
      '$1gpt-6-sol$2high',
    ),
  );
  cpSync(path.join(source, 'schemas'), path.join(root, bundle, 'schemas'), { recursive: true });
  const config = loadRuntimeConfig(root),
    workspace = deriveWorkspaceId(config.repository.repository_id, root);
  const schemaSha = sha(readFileSync(path.join(root, bundle, 'schemas/runtime-initialization.v1.schema.json')));
  const receipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((p) => p.project_id).sort(),
    integrations_digest: canonicalJsonDigest(config.integrations),
    workspace_id: workspace,
    workspace_binding_status: 'bound',
    bundle,
    config_digest: runtimeConfigDigest(config),
    schema_sha256: schemaSha,
    templates: [
      'AGENTS.template.md',
      'AGENT.sidecar.template.md',
      'agent-runtime.config.template.v1.yaml',
      'documentation-policy.template.v1.json',
    ].map((name, i) => ({
      template: 'templates/' + name,
      template_sha256: sha(Buffer.from(name)),
      output: [
        'AGENTS.md',
        'AGENT.sidecar.md',
        'agent-runtime.config.v1.yaml',
        'docs/agent-instructions/documentation-policy.v1.json',
      ][i],
      output_sha256: sha(Buffer.from(name)),
    })),
    created_at: '2026-09-30T00:00:00.000Z',
  };
  put('.agent/runtime-initialization.v1.json', json(receipt));
  if (!sourceMode)
    put(
      '.agent/active-runtime-selector.v1.json',
      json({
        schema: 'ActiveRuntimeSelector/v1',
        generation: 'fixture-v10',
        runtime: 'vida-agent',
        bundle_root: 'vida-agent',
        config_path: 'agent-runtime.config.v1.yaml',
        payload_manifest_sha256: sha(Buffer.from('fixture-payload')),
      }),
    );
  const oldYaml = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8');
  const target = oldYaml.replace(
    /(    executor:\r?\n      model: )gpt-6-sol(\r?\n      reasoning: )high/,
    sourceMode ? '$1gpt-6-luna$2max' : '$1gpt-6.1-sol$2medium',
  );
  expect(target).not.toBe(oldYaml);
  put('proposed.yaml', target);
  mkdirSync(path.join(root, '.agent/work'), { recursive: true });
  const db = new Database(path.join(root, '.agent/work/session-handoff.v1.sqlite'), { create: true });
  new HostStateStore(db, workspace);
  db.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  db.close();
  const args = (mode) => [
    '--kind',
    'runtime-config',
    '--mode',
    mode,
    '--project-root',
    root,
    '--repair-id',
    'fixture-rebind',
    ...(['inspect', 'plan'].includes(mode)
      ? [
          '--actor',
          'actual-test-operator',
          '--timestamp',
          '2026-09-30T00:00:00.000Z',
          '--instruction-ref',
          'TEST SETUP: requested executor profile',
          '--target-config',
          'proposed.yaml',
        ]
      : []),
  ];
  return { root, put, args, target, oldYaml, receipt, workspace, bundle };
}

function withDatabase(f, callback, readonly = false) {
  const db = new Database(
    path.join(f.root, '.agent/work/session-handoff.v1.sqlite'),
    readonly ? { readonly: true, strict: true } : { create: true, strict: true },
  );
  try {
    return callback(db);
  } finally {
    db.close();
  }
}

function databaseState(f) {
  return withDatabase(
    f,
    (db) =>
      Object.fromEntries(
        db
          .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
          .all()
          .map(({ name }) => [name, db.query(`SELECT * FROM ${name} ORDER BY rowid`).all()]),
      ),
    true,
  );
}

function fence(f) {
  return withDatabase(f, (db) => new HostStateStore(db, f.workspace).readMaintenanceFence());
}

function seedState(
  f,
  { lease = false, effect = null, ticketStatus = null, activeClaim = false, issued = false, native = false } = {},
) {
  if (lease) ticketStatus = 'active';
  activeClaim ||= ticketStatus === 'active';
  const config = loadRuntimeConfig(f.root),
    digest = canonicalJsonDigest('fixture-binding');
  const identity = {
    repository_id: config.repository.repository_id,
    project_ids: f.receipt.project_ids,
    integrations_digest: loadProjectSetContext(f.root, config, config.repository.repository_id, f.receipt.project_ids)
      .integrations_digest,
    work_id: 'old-suspended-work',
  };
  const binding = {
    ...identity,
    team_id: 'default-development',
    workflow_id: 'implementation_change',
    provider_work_item_id: 'fixture-work',
    lifecycle_work_id: identity.work_id,
    work_item_digest: digest,
    work_source_revision: 'fixture-source',
    scope_id: 'fixture-scope',
    scope_contract_digest: digest,
    acceptance_manifest_digest: digest,
    ac_ids: ['AC-1'],
    implementation_paths: ['vida-agent/src/fixture.ts'],
    allowed_resources: ['file:vida-agent/src/fixture.ts'],
    config_digest: f.receipt.config_digest,
    runtime_source_revision: 'fixture-runtime',
    schema_digest: digest,
    runtime_code_digest: digest,
  };
  delete binding.work_id;
  const workLease = { ticket_id: 'fixture-ticket', thread_id: 'fixture-thread', generation: 1 };
  const attempts = effect
    ? [
        {
          assignment_id: digest,
          attempt_id: digest,
          previous_attempt_id: null,
          request_digest: digest,
          stage_id: 'implementation',
          assignment_index: 0,
          correction_generation: 0,
          correction_authorization: null,
          lease: workLease,
          status: effect,
          result: null,
          result_digest: null,
          reconciliation: null,
        },
      ]
    : [];
  const work = {
    schema: 'WorkState/v1',
    workspace_id: f.workspace,
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: digest },
      acceptance: { schema: 'AcceptanceManifest/v1', path: '.agent/acceptance.json', sha256: digest },
      decisions: [],
    },
    lease: lease ? workLease : null,
    execution: {
      run_id: 'fixture-run',
      input_digest: digest,
      phase: 'implementation',
      status: 'suspended',
      assignment_attempts: attempts,
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: binding.work_source_revision,
      next_action: 'Trace the accepted work request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'migration',
      config_binding: { config_digest: binding.config_digest, schema_digest: digest, runtime_code_digest: digest },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: binding.implementation_paths,
        fingerprint_paths: binding.implementation_paths,
        implementation_paths: binding.implementation_paths,
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
  if (effect) {
    attempts[0].assignment_id = canonicalJsonDigest({
      binding,
      run_id: work.execution.run_id,
      input_digest: work.execution.input_digest,
      stage_id: attempts[0].stage_id,
      assignment_index: 0,
    });
    attempts[0].attempt_id = canonicalJsonDigest({
      assignment_id: attempts[0].assignment_id,
      request_digest: digest,
      lease: workLease,
      previous_attempt_id: null,
    });
  }
  const now = '2026-09-30T00:00:00.000Z',
    expires = '2099-09-30T00:00:00.000Z';
  const resources = binding.allowed_resources;
  const claim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'fixture-claim',
    ticket_id: workLease.ticket_id,
    work_id: identity.work_id,
    thread_id: workLease.thread_id,
    generation: 1,
    resources,
    lease_expires_at: expires,
    status: 'active',
    created_at: now,
    renewed_at: now,
  };
  const ticket = {
    schema: 'CoordinationTicket/v1',
    ...identity,
    ticket_id: workLease.ticket_id,
    thread_id: workLease.thread_id,
    source_revision: binding.work_source_revision,
    generation: 1,
    sequence: 1,
    contour_keys: [
      `repository:${identity.repository_id}`,
      ...identity.project_ids.map((id) => `project:${id}`),
      ...resources,
    ],
    exclusive_resources: resources,
    status: ticketStatus ?? (activeClaim ? 'ready_for_handoff' : 'released'),
    claim_ids: activeClaim ? [claim.claim_id] : [],
    expires_at: activeClaim ? expires : null,
    active_resources: activeClaim ? resources : [],
    blocked_resources: ticketStatus === 'queued' && !activeClaim ? resources : [],
    created_at: now,
  };
  const ledger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: f.workspace,
    revision: 1,
    open_generation: 1,
    next_sequence: 2,
    tickets: ticketStatus || activeClaim ? [ticket] : [],
    claims: activeClaim ? [claim] : [],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    operations: [],
    retirements: [],
  };
  const ajv = new Ajv2020({ allErrors: true });
  for (const [name, value] of [
    ['work-state', work],
    ['coordination-ledger', ledger],
  ]) {
    const validate = ajv.compile(
      JSON.parse(readFileSync(path.join(f.root, `vida-agent/schemas/${name}.v1.schema.json`), 'utf8')),
    );
    if (!validate(value)) throw Error(`fixture ${name} invalid: ${JSON.stringify(validate.errors)}`);
  }
  withDatabase(f, (db) => {
    const insert = db.query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)');
    insert.run(
      f.workspace,
      'work',
      JSON.stringify([identity.repository_id, identity.project_ids, identity.integrations_digest, identity.work_id]),
      1,
      json(work),
      canonicalJsonDigest(work),
    );
    insert.run(f.workspace, 'ledger', 'shared', 1, json(ledger), canonicalJsonDigest(ledger));
    if (native) {
      const request = {
        schema: 'VidaSessionRequest/v1',
        run_id: 'fixture-run',
        workflow_id: binding.workflow_id,
        wave_index: 0,
        action_id: digest,
        assignment_index: 0,
        stage_id: 'implementation',
        role: 'executor',
        config_digest: binding.config_digest,
        scope_digest: digest,
        bindings_manifest_ref: digest,
      };
      const state = {
        schema: 'MastraSessionLedger/v1',
        workspace_id: f.workspace,
        work_id: identity.work_id,
        attempt: 1,
        run_id: request.run_id,
        step_id: 'implementation',
        items: [{ request, issue_id: issued ? randomUUID() : null, observation: null }],
        completed: [],
      };
      db.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
        f.workspace,
        identity.work_id,
        1,
        1,
        json(state),
        canonicalJsonDigest(state),
      );
      expect(
        new MastraSessionLedger(db, f.workspace, config, f.root, new HostStateStore(db, f.workspace)).resume(
          identity.work_id,
          1,
        ).state,
      ).toEqual(state);
    }
    const snapshot = new HostStateStore(db, f.workspace).readHostStateSnapshot(identity);
    expect(snapshot.work).toEqual(work);
    expect(snapshot.ledger).toEqual(ledger);
  });
  return { work, identity };
}

test('inspect/plan are read-only for YAML/receipt/database; fenced apply precedes authored edit and resume preserves provenance', async () => {
  const f = fixture();
  const before = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
  seedState(f, { native: true });
  const persisted = databaseState(f);
  const cli = spawnSync(process.execPath, [path.join(source, 'bin/reconcile-artifacts.mjs'), ...f.args('inspect')], {
    cwd: f.root,
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
  });
  expect(cli.status).toBe(0);
  expect(JSON.parse(cli.stdout).status).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(persisted);
  expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect(databaseState(f)).toEqual(persisted);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(before)).toBe(true);
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'));
  expect(after).toEqual({ ...f.receipt, config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)) });
  const appliedState = databaseState(f);
  expect(appliedState.agent_host_state).toEqual(persisted.agent_host_state);
  expect(appliedState.agent_host_mastra_session_ledger).toEqual(persisted.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
}, 30_000);

test('Source without selector rebinds Luna under the same fence and preserves work state', async () => {
  const f = fixture({ sourceMode: true });
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  expect(loadRuntimeConfig(f.root).agents.profiles.executor.model).toBe('gpt-6-luna');
  expect(loadRuntimeConfig(f.root).agents.profiles.executor.reasoning).toBe('max');
  expect(databaseState(f).agent_host_state).toEqual(before.agent_host_state);
  expect(existsSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'))).toBe(false);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')))).toEqual({
    ...f.receipt,
    config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
  });
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
}, 30_000);

test.each(['source bytes', 'inventory addition', 'selector appearance', 'workspace identity'])(
  'Source rebind rejects %s drift before acquiring maintenance',
  async (change) => {
    const f = fixture({ sourceMode: true });
    await runReconcileArtifacts(f.args('plan'));
    const before = databaseState(f);
    if (change === 'source bytes') f.put(f.bundle + '/bin/run.mjs', '// changed Source');
    if (change === 'inventory addition') f.put(f.bundle + '/src/config/new-feature.ts', '// added Source');
    if (change === 'workspace identity') f.put('package.json', json({ private: false, workspaces: [f.bundle] }));
    if (change === 'selector appearance')
      f.put(
        '.agent/active-runtime-selector.v1.json',
        json({
          schema: 'ActiveRuntimeSelector/v1',
          generation: 'foreign-selector',
          runtime: 'vida-agent',
          bundle_root: 'vida-agent',
          config_path: 'agent-runtime.config.v1.yaml',
          payload_manifest_sha256: sha('foreign'),
        }),
      );
    await expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(/differs|differ|rejects an active selector/);
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  },
  30_000,
);

test('a consumer without selector cannot use Source rebind', async () => {
  const f = fixture();
  rmSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'));
  const before = databaseState(f);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/only for the Source project/);
  expect(databaseState(f)).toEqual(before);
});

test('Source rejects a preexisting consumer-shaped selector without state changes', async () => {
  const f = fixture({ sourceMode: true });
  f.put(
    '.agent/active-runtime-selector.v1.json',
    json({
      schema: 'ActiveRuntimeSelector/v1',
      generation: 'foreign-selector',
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      payload_manifest_sha256: sha('foreign'),
    }),
  );
  const before = databaseState(f);
  for (const mode of ['inspect', 'plan'])
    await expect(runReconcileArtifacts(f.args(mode))).rejects.toThrow(/Source configuration rejects/);
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')))).toEqual(f.receipt);
  expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
}, 30_000);

test('Source inventory rejects linked directories before traversal and bounds enumeration', async () => {
  const f = fixture({ sourceMode: true });
  const directory = path.join(f.root, f.bundle, 'src');
  renameSync(directory, directory + '-original');
  f.put('external/file.ts', '// outside Source');
  symlinkSync(path.join(f.root, 'external'), directory, process.platform === 'win32' ? 'junction' : 'dir');
  const before = databaseState(f);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/symlink|reparse|boundary|link/);
  expect(databaseState(f)).toEqual(before);
  const g = fixture({ sourceMode: true });
  for (let i = 0; i < 513; i++) g.put(g.bundle + '/src/config/entry-' + i + '.ts', '// bounded fixture');
  const otherBefore = databaseState(g);
  await expect(runReconcileArtifacts(g.args('inspect'))).rejects.toThrow(/inventory exceeds the path bound/);
  expect(databaseState(g)).toEqual(otherBefore);
}, 30_000);

test('reasoning-only targets are accepted while invalid reasoning and unrelated profiles are denied', async () => {
  const f = fixture();
  f.put('proposed.yaml', f.oldYaml.replace(/(model: gpt-6-sol\r?\n      reasoning:) high/, '$1 max'));
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const invalidReasoning = f.target.replace(
    /(    executor:\r?\n      model: [^\r\n]+\r?\n      reasoning:) medium/,
    '$1 123',
  );
  expect(invalidReasoning).not.toBe(f.target);
  f.put('proposed.yaml', invalidReasoning);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/validation failed/);
  const invalidModel = f.target.replace(/(    executor:\r?\n      model:) [^\r\n]+/, '$1 123');
  expect(invalidModel).not.toBe(f.target);
  f.put('proposed.yaml', invalidModel);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/validation failed/);
  f.put('proposed.yaml', f.target.replace(/(architect:\r?\n      model:) [^\r\n]+/, '$1 another-model'));
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/only requested executor/);
  expect(databaseState(f)).toEqual(before);
});

test.each(['source bytes', 'selector appearance'])(
  'Source rebind preserves its fence after post-authoring %s drift',
  async (change) => {
    const f = fixture({ sourceMode: true });
    await runReconcileArtifacts(f.args('plan'));
    await runReconcileArtifacts(f.args('apply'));
    const held = fence(f);
    f.put('agent-runtime.config.v1.yaml', f.target);
    if (change === 'source bytes') f.put(f.bundle + '/bin/run.mjs', '// changed Source');
    else f.put('.agent/active-runtime-selector.v1.json', json({ schema: 'ActiveRuntimeSelector/v1' }));
    await expect(runReconcileArtifacts(f.args('resume'))).rejects.toThrow(/differs|differ|rejects an active selector/);
    expect(fence(f)).toEqual(held);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')))).toEqual(f.receipt);
  },
  30_000,
);

test('no-effect abandonment releases its own fence; receipt-applied rollback is always denied', async () => {
  const f = fixture();
  await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  const held = fence(f);
  expect(held.status).toBe('held');
  expect(held.binding.operation_id).toBe('fixture-rebind');
  const result = await runReconcileArtifacts(f.args('restore'));
  expect(result.status).toBe('abandoned_no_effect');
  expect(result.rollback_performed).toBe(false);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  const released = fence(f);
  expect(released).toEqual({ ...held, revision: held.revision + 1, status: 'released' });
  expect((await runReconcileArtifacts(f.args('restore'))).status).toBe('abandoned_no_effect');
  expect(fence(f)).toEqual(released);
  const g = fixture();
  await runReconcileArtifacts(g.args('plan'));
  await runReconcileArtifacts(g.args('apply'));
  g.put('agent-runtime.config.v1.yaml', g.target);
  await runReconcileArtifacts(g.args('resume'));
  await expect(runReconcileArtifacts(g.args('restore'))).rejects.toThrow(/rollback/);
}, 30_000);

test.each([
  ['active lease with matching ownership', { lease: true }, /queued\/active ownership blocks rebind/],
  ['started assignment', { effect: 'started' }, /active\/uncertain work/],
  ['uncertain assignment', { effect: 'uncertain' }, /active\/uncertain work/],
  ['queued ticket', { ticketStatus: 'queued' }, /queued\/active ownership/],
  ['active ticket', { ticketStatus: 'active' }, /queued\/active ownership/],
  ['active claim', { activeClaim: true }, /queued\/active ownership/],
  ['issued native outcome', { native: true, issued: true }, /issued native outcome/],
])('%s denies inspect and plan without changing persisted state', async (_name, setup, message) => {
  const f = fixture();
  seedState(f, setup);
  const persisted = databaseState(f);
  for (const mode of ['inspect', 'plan']) await expect(runReconcileArtifacts(f.args(mode))).rejects.toThrow(message);
  expect(databaseState(f)).toEqual(persisted);
  expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
});

test('target cannot move operational/path fields or edit YAML before held fence', async () => {
  const f = fixture();
  f.put(
    'proposed.yaml',
    f.target.replace(/^config_revision: (\d+)$/m, (_, n) => `config_revision: ${Number(n) + 1}`),
  );
  await expect(runReconcileArtifacts(f.args('plan'))).rejects.toThrow(/only requested/);
  const g = fixture();
  await runReconcileArtifacts(g.args('plan'));
  g.put('agent-runtime.config.v1.yaml', g.target);
  await expect(runReconcileArtifacts(g.args('apply'))).rejects.toThrow(/wait for held/);
});

test.each(['fence_acquired', 'fenced', 'receipt_rebound', 'applied', 'released'])(
  'interrupted %s resumes one current operation without duplicate receipt effects',
  async (phase) => {
    const f = fixture();
    await runReconcileArtifacts(f.args('plan'));
    const interrupt = (_phase) => {
      if (_phase === phase) throw Error('injected interruption');
    };
    if (['fence_acquired', 'fenced'].includes(phase)) {
      await expect(runReconcileArtifacts(f.args('apply'), { onPhase: interrupt })).rejects.toThrow(/injected/);
      expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('author_config_required');
    } else await runReconcileArtifacts(f.args('apply'));
    f.put('agent-runtime.config.v1.yaml', f.target);
    if (!['fence_acquired', 'fenced'].includes(phase))
      await expect(runReconcileArtifacts(f.args('resume'), { onPhase: interrupt })).rejects.toThrow(/injected/);
    expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  },
);

// Persisted requests and JSONB snapshots are synthetic TEST SETUP, never native outcomes.
function seedReadonlyUnknown(f, mutate = null, { writer = false, validateFixture = true } = {}) {
  const { identity } = seedState(f);
  const config = loadRuntimeConfig(f.root);
  const scope = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['vida-agent/TESTING.md']);
  const context = { work_id: identity.work_id, attempt: 1, scope_digest: scope.digest };
  const selection = {
    team: 'default-development',
    kind: 'task',
    intent: 'change',
    workflow: 'implementation_change',
    risk_flags: [],
  };
  const workflow = 'implementation_change',
    run = sessionBridgeRunId(f.workspace, context, workflow);
  const waves = compileDevelopmentWorkflow(config, selection.team, workflow, selection.risk_flags).waves;
  const waveIndex = writer
    ? waves.findIndex((wave) =>
        wave.some((stage) =>
          stage.assignments.some(
            (assignment) => config.agents.profiles[assignment.profile].mutation_scope === 'repository_source',
          ),
        ),
      )
    : 0;
  const actions = sessionActionsForWave(config, selection, context, workflow, waveIndex, []);
  const requests = actions.map((action) => ({
    schema: 'VidaSessionRequest/v1',
    run_id: run,
    workflow_id: workflow,
    wave_index: waveIndex,
    action_id: action.action_id,
    assignment_index: action.assignment_index,
    stage_id: action.stage_id,
    role: action.role,
    config_digest: runtimeConfigDigest(config),
    scope_digest: scope.digest,
    bindings_manifest_ref: canonicalJsonDigest({ fixture: 'original bindings' }),
  }));
  const selected = new Set(['documentation-researcher', 'code-researcher', 'platform-researcher']);
  const items = requests.map((request) => ({
    request,
    issue_id: writer || selected.has(request.role) ? randomUUID() : null,
    observation: null,
  }));
  if (!writer) expect(items.filter((item) => item.issue_id !== null)).toHaveLength(3);
  const state = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: f.workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: run,
    source_scope: scope,
    step_id: `wave-${waveIndex}`,
    items,
    completed: [],
  };
  const input = {
    ...context,
    workflow_id: workflow,
    config_digest: runtimeConfigDigest(config),
    selection,
    observations: [],
  };
  const snapshot = {
    runId: run,
    status: 'suspended',
    context: {
      input,
      [`wave-${waveIndex}`]: {
        payload: structuredClone(input),
        suspendPayload: { requests: structuredClone(requests) },
      },
    },
  };
  if (mutate) mutate(state, snapshot);
  withDatabase(f, (db) => {
    db.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
      f.workspace,
      identity.work_id,
      1,
      1,
      json(state),
      canonicalJsonDigest(state),
    );
    if (validateFixture)
      expect(
        new MastraSessionLedger(db, f.workspace, config, f.root, new HostStateStore(db, f.workspace)).resume(
          identity.work_id,
          1,
        ).state,
      ).toEqual(state);
  });
  const native = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), {
    create: true,
    strict: true,
  });
  try {
    native.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot BLOB)');
    native.query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))').run(workflow, run, json(snapshot));
    expect(native.query('SELECT typeof(snapshot) AS type FROM mastra_workflow_snapshot').get().type).toBe('blob');
  } finally {
    native.close();
  }
  return { state, snapshot };
}

test('three original readonly unknowns remain unchanged across config rebind with a different quiescent current run', async () => {
  const f = fixture();
  seedReadonlyUnknown(f);
  const before = databaseState(f),
    nativeBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(nativeBefore)).toBe(true);
}, 30000);

test('readonly unknown denies a genuine owner project integration binding mismatch without changing rows', async () => {
  const f = fixture();
  seedReadonlyUnknown(f);
  withDatabase(f, (db) => {
    const row = db.query("SELECT rowid,payload FROM agent_host_state WHERE kind='work'").get();
    const work = JSON.parse(row.payload);
    work.binding.integrations_digest = canonicalJsonDigest({ fixture: 'foreign project integrations' });
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(work),
      canonicalJsonDigest(work),
      row.rowid,
    );
  });
  const before = databaseState(f);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(
    'readonly owner project integration binding differs',
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

for (const [name, mutation] of [
  [
    'frozen config mismatch',
    (_state, snapshot) => {
      snapshot.context.input.config_digest = '0'.repeat(64);
    },
  ],
  [
    'suspended request mismatch',
    (_state, snapshot) => {
      snapshot.context['wave-0'].suspendPayload.requests[1].role = 'executor';
    },
  ],
  [
    'original run mismatch',
    (_state, snapshot) => {
      snapshot.runId = 'foreign-run';
    },
  ],
]) {
  test(`readonly unknown denies ${name} and preserves all rows`, async () => {
    const f = fixture();
    seedReadonlyUnknown(f, mutation);
    const before = databaseState(f);
    await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('issued native outcome is pending/unknown');
    expect(databaseState(f)).toEqual(before);
  }, 30000);
}

for (const [name, mutation, validateFixture] of [
  [
    'host reservation',
    (state) => {
      const item = state.items.find((entry) => entry.issue_id);
      item.host_reservation = {
        schema: 'WorkflowSessionReservation/v1',
        receipt: {
          attempt: {
            attempt_id: canonicalJsonDigest({ fixture: 'reservation' }),
            correction_generation: 0,
            correction_authorization: null,
          },
        },
        request: {
          workItemId: state.work_id,
          stageId: item.request.stage_id,
          assignmentIndex: item.request.assignment_index,
        },
      };
    },
    true,
  ],
  [
    'activation without complete authority',
    (state) => {
      state.items.find((entry) => entry.issue_id).research_activation = {};
    },
    false,
  ],
  [
    'normalization without complete authority',
    (state) => {
      state.items.find((entry) => entry.issue_id).research_normalization = {};
    },
    false,
  ],
]) {
  test(`readonly unknown denies ${name} without changing records`, async () => {
    const f = fixture();
    seedReadonlyUnknown(f, mutation, { validateFixture });
    const before = databaseState(f);
    await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('issued native outcome is pending/unknown');
    expect(databaseState(f)).toEqual(before);
  }, 30000);
}

test('readonly unknown denies original configured source writer despite lease-null owner', async () => {
  const f = fixture();
  seedReadonlyUnknown(f, null, { writer: true });
  const before = databaseState(f);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('capability is not cooperative readonly');
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly risk-filter ambiguity denies any possible writer profile and accepts only unanimous readonly candidates', () => {
  const f = fixture(),
    config = structuredClone(loadRuntimeConfig(f.root));
  const readonly = Object.entries(config.agents.profiles).find(
    ([, profile]) => profile.mutation_scope === 'none' && profile.tools_policy === 'read_only',
  )[0];
  const writer = Object.entries(config.agents.profiles).find(
    ([, profile]) => profile.mutation_scope === 'repository_source',
  )[0];
  const stage = config.workflows.implementation_change.stages[0];
  const request = {
    workflow_id: 'implementation_change',
    stage_id: stage.id,
    role: 'ambiguous-role',
    assignment_index: 0,
  };
  stage.assignments = [
    { role: 'ambiguous-role', profile: readonly, risk_flags: ['read-risk'] },
    { role: 'ambiguous-role', profile: writer, risk_flags: ['write-risk'] },
  ];
  expect(cooperativeReadonlyAssignments(config, request)).toBe(false);
  stage.assignments[1].profile = readonly;
  expect(cooperativeReadonlyAssignments(config, request)).toBe(true);
  stage.assignments = [
    { role: 'preceding', profile: readonly },
    { role: 'ambiguous-role', profile: writer },
  ];
  expect(cooperativeReadonlyAssignments(config, request)).toBe(false);
  request.assignment_index = 1;
  expect(cooperativeReadonlyAssignments(config, request)).toBe(false);
  stage.assignments[1].profile = readonly;
  expect(cooperativeReadonlyAssignments(config, request)).toBe(true);
});
