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
import { runReconcileArtifacts as reconcileEntrypoint } from '../bin/reconcile-artifacts.mjs';
import { run as runEntrypoint } from '../bin/run.mjs';
import { cooperativeReadonlyAssignments, inspectHistoricalOwnerContext } from '../bin/runtime-config-rebind.mjs';
import { suspendHistoricalOwnerWork } from '../src/orchestration/suspend-local-work.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import {
  sessionBridgeRunId,
  buildSessionBridgeRequest,
  configuredContextForStage,
} from '../src/orchestration/mastra-session-bridge.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.mjs';
const source = process.env.VIDA_CONFIG_REBIND_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '..');
const fixtureContextPath = 'docs/project-context.md';
const fixtureRoots = [];
const pendingFixtureCalls = new Map();
async function fixtureCall(entrypoint, args, options) {
  const root = args[args.indexOf('--project-root') + 1];
  pendingFixtureCalls.set(root, (pendingFixtureCalls.get(root) ?? 0) + 1);
  try {
    return await entrypoint(args, options);
  } finally {
    const remaining = pendingFixtureCalls.get(root) - 1;
    if (remaining) pendingFixtureCalls.set(root, remaining);
    else pendingFixtureCalls.delete(root);
  }
}
const run = (args, options) => fixtureCall(runEntrypoint, args, options);
const runReconcileArtifacts = (args, options) => fixtureCall(reconcileEntrypoint, args, options);
afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    if (pendingFixtureCalls.has(root)) console.warn(`Retained fixture with an unresolved operation: ${root}`);
    else rmSync(root, { recursive: true, force: true });
  }
});
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (v) => JSON.stringify(v, null, 2) + '\n';
function expectMissingFixtureContextRead(error, label) {
  expect(error).toBeInstanceOf(Error);
  if (process.platform === 'win32') {
    expect(error.message).toBe(
      `safe repository access unavailable: ${label} fs-safe boundary rejected the target (path)`,
    );
  } else {
    expect(error.code).toBe('ENOENT');
    expect(
      String(error.path ?? '')
        .replaceAll('\\', '/')
        .endsWith('/docs/project-context.md'),
    ).toBe(true);
  }
}

function recoveryFixture({ configuredContext = false, markerlessExcerpt = false, aggregateContext = false } = {}) {
  const { f, request, state, configuredContexts } = historicalFixture('unknown_readonly', {
    configuredContext,
    markerlessExcerpt,
    aggregateContext,
  });
  const input = {
    identity: request.identity,
    attempt: 1,
    baselinePath: 'baseline.yaml',
    callerSession: 'fixture-current-caller',
    controllerId: 'fixture-current-controller',
    userInstructionRef: 'fixture:attributable-human-recovery-review',
  };
  const call = (mode, body = input, extra = []) => {
    f.put('.tmp/recovery-input.json', json(body));
    return run([
      '--recovery-review',
      'true',
      '--mode',
      mode,
      '--project-root',
      f.root,
      '--request',
      '.tmp/recovery-input.json',
      ...extra,
    ]);
  };
  const observation = (operation, status = 'PASS') => ({
    action_id: operation.operation_key,
    caller_session: input.callerSession,
    controller_id: input.controllerId,
    status,
    // Injected fixture observation; no actual native execution or Runtime proof.
    observation: { agent_id: 'fixture:reviewer', tool_call_ref: 'fixture:native-call', result: { findings: [] } },
  });
  return { f, input, call, observation, state, configuredContexts };
}

function fixtureOriginalContexts(state, configuredContexts) {
  const items = [...state.completed.flatMap((wave) => wave.items), ...state.items].filter(
      (item) => item.request.configured_context_digest,
    ),
    entries = items.map((item) => {
      const context = configuredContexts.find(
        (candidate) => candidate.digest === item.request.configured_context_digest,
      );
      expect(context).toBeDefined();
      return {
        action_id: item.request.action_id,
        wave_index: item.request.wave_index,
        stage_id: item.request.stage_id,
        work_id: state.work_id,
        attempt: state.attempt,
        context,
      };
    });
  return entries;
}

function resignFixtureContext(context) {
  const { digest: _digest, ...body } = context;
  return { ...body, digest: canonicalJsonDigest(body) };
}

test.each(['PASS', 'FAIL'])(
  'internal recovery %s settles only its review and preserves original rights',
  async (status) => {
    const { f, input, call, observation } = recoveryFixture(),
      before = databaseState(f);
    const prepared = await call('prepare');
    expect(prepared.status).toBe('reserved');
    expect(prepared.request.historicalOwner).not.toBe(input.callerSession);
    const resumed = { ...input, request: prepared.request };
    expect((await call('inspect', resumed)).status).toBe('reserved');
    expect((await call('begin', resumed)).status).toBe('commit_unknown');
    const observed = observation(prepared.operation, status);
    const settled = await call('complete', { ...resumed, observation: observed });
    expect(settled.status).toBe('applied');
    expect(settled.rights_granted).toBe(false);
    expect(settled.runtime_acceptance).toBe(false);
    expect(settled.native_dispatch_performed).toBe(false);
    expect((await call('complete', { ...resumed, observation: observed })).operation).toEqual(settled.operation);
    const changed = structuredClone(observed);
    changed.observation.result = { findings: ['Different retained body'] };
    await expect(call('complete', { ...resumed, observation: changed })).rejects.toThrow(/result conflict/);
    const after = databaseState(f);
    expect(after.agent_host_state).toEqual(before.agent_host_state);
    expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  },
  30000,
);

test('internal recovery UNKNOWN survives reopen and cannot reissue or reconstruct custody', async () => {
  const { f, input, call, observation } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  await expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(
    /reissue forbidden/,
  );
  await call('begin', resumed);
  const before = databaseState(f);
  expect((await call('inspect', resumed)).status).toBe('commit_unknown');
  await expect(call('begin', resumed)).rejects.toThrow(/reissue forbidden/);
  await expect(call('prepare')).rejects.toThrow(/reservation exists/);
  await expect(call('inspect', input)).rejects.toThrow(/shape/);
  const foreign = { ...resumed, callerSession: 'fixture-foreign' };
  await expect(call('inspect', foreign)).rejects.toThrow(/request changed/);
  await expect(call('complete', { ...resumed, observation: { status: 'PASS' } })).rejects.toThrow(
    /observation differs/,
  );
  const altered = observation(prepared.operation);
  altered.controller_id = 'foreign';
  await expect(call('complete', { ...resumed, observation: altered })).rejects.toThrow(/observation differs/);
  expect(databaseState(f)).toEqual(before);
}, 60000);

test('internal recovery stale Source denies settlement while retaining UNKNOWN', async () => {
  const { f, input, call, observation } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  await call('begin', resumed);
  const before = databaseState(f);
  f.put('.githooks/pre-commit', 'Concurrent scoped edit');
  await expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow();
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('internal recovery controller drift outside original Work scope denies begin', async () => {
  const { f, input, call } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  const before = databaseState(f);
  f.put(
    'packages/agent/src/runtime-kernel.ts',
    readFileSync(path.join(f.root, 'packages/agent/src/runtime-kernel.ts'), 'utf8') +
      '\n// Injected controller drift\n',
  );
  await expect(call('begin', resumed)).rejects.toThrow(/request changed/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('internal recovery reviews current declared Source while preserving historical preimages', async () => {
  const { f, input, call, observation } = recoveryFixture();
  f.put('.githooks/pre-commit', 'Authorized Source correction before recovery prepare');
  const before = databaseState(f);
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  expect(prepared.request.source.digest).not.toBe(prepared.request.context.original_source);
  await call('begin', resumed);
  expect((await call('complete', { ...resumed, observation: observation(prepared.operation) })).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
}, 30000);

test('internal recovery denies mixed execution flags and missing original context without effects', async () => {
  const { f, input, call } = recoveryFixture(),
    before = databaseState(f);
  await expect(call('prepare', input, ['--issue-wave', 'true'])).rejects.toThrow(/exact mode/);
  await expect(call('prepare', { ...input, baselinePath: 'missing.yaml' })).rejects.toThrow();
  await expect(call('prepare', { ...input, userInstructionRef: '' })).rejects.toThrow(/binding missing/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

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

function deliveryFixture() {
  const f = fixture({ sourceMode: true });
  f.put('accepted-baseline.yaml', f.oldYaml);
  f.put('agent-runtime.config.v1.yaml', f.target);
  const args = (mode) => {
    const values = f.args(mode);
    values[1] = 'runtime-config-delivery';
    if (['inspect', 'plan'].includes(mode)) {
      values[values.indexOf('--target-config') + 1] = 'agent-runtime.config.v1.yaml';
      values.push('--baseline-config', 'accepted-baseline.yaml');
    }
    return values;
  };
  return { ...f, deliveryArgs: args };
}

test('delivered configuration adopts only its receipt under the original fence and preserves history', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('unchanged baseline YAML and receipt');
  expect((await runReconcileArtifacts(f.deliveryArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const planned = await runReconcileArtifacts(f.deliveryArgs('plan'));
  expect(planned.operation_path).toEndWith('/runtime-config-delivery-operation.v1.json');
  expect(JSON.parse(readFileSync(path.join(f.root, planned.operation_path), 'utf8')).schema).toBe(
    'SourceDeliveryConfigRebindOperation/v1',
  );
  expect((await runReconcileArtifacts(f.deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  const completed = await runReconcileArtifacts(f.deliveryArgs('resume'));
  expect(completed.status).toBe('applied');
  expect(completed.writes_yaml).toBe(false);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
    ...f.receipt,
    config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
  });
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
  await expect(runReconcileArtifacts(f.deliveryArgs('restore'))).rejects.toThrow('rollback is forbidden');
}, 30000);

test('delivered configuration denies substituted baseline, target drift and cross-kind operation conversion', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  f.put('accepted-baseline.yaml', f.target);
  await expect(runReconcileArtifacts(f.deliveryArgs('inspect'))).rejects.toThrow('unchanged baseline YAML and receipt');
  expect(databaseState(f)).toEqual(before);
  f.put('accepted-baseline.yaml', f.oldYaml);
  const planned = await runReconcileArtifacts(f.deliveryArgs('plan'));
  f.put(
    '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json',
    readFileSync(path.join(f.root, planned.operation_path)),
  );
  await expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow('frozen operation invalid or foreign');
  expect(databaseState(f)).toEqual(before);
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  await expect(runReconcileArtifacts(f.deliveryArgs('apply'))).rejects.toThrow('authored YAML bytes differ');
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('delivered configuration abandons a no-effect fence without reverting the desired YAML', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  await runReconcileArtifacts(f.deliveryArgs('plan'));
  await runReconcileArtifacts(f.deliveryArgs('apply'));
  expect((await runReconcileArtifacts(f.deliveryArgs('restore'))).status).toBe('abandoned_no_effect');
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  expect(databaseState(f).agent_host_state).toEqual(before.agent_host_state);
}, 30000);

test.each(['fence_acquired', 'fenced', 'receipt_rebound', 'applied', 'released'])(
  'delivered configuration resumes interrupted %s without duplicating receipt effects',
  async (cutoff) => {
    const f = deliveryFixture();
    await runReconcileArtifacts(f.deliveryArgs('plan'));
    const options = {
      onPhase: (phase) => {
        if (phase === cutoff) throw new Error('injected delivery interruption');
      },
    };
    if (['fence_acquired', 'fenced'].includes(cutoff)) {
      await expect(runReconcileArtifacts(f.deliveryArgs('apply'), options)).rejects.toThrow(
        'injected delivery interruption',
      );
      await runReconcileArtifacts(f.deliveryArgs('resume'));
    } else {
      await runReconcileArtifacts(f.deliveryArgs('apply'));
      await expect(runReconcileArtifacts(f.deliveryArgs('resume'), options)).rejects.toThrow(
        'injected delivery interruption',
      );
    }
    expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
    expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
      ...f.receipt,
      config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
    });
  },
  30000,
);

test('delivered configuration rejects retagging a fenced standard operation without receipt effects', async () => {
  const f = fixture({ sourceMode: true });
  const planned = await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.target);
  const operation = JSON.parse(readFileSync(path.join(f.root, planned.operation_path), 'utf8'));
  f.put(
    '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json',
    json({ ...operation, schema: 'SourceDeliveryConfigRebindOperation/v1' }),
  );
  const before = databaseState(f),
    args = f.args('resume');
  args[1] = 'runtime-config-delivery';
  await expect(runReconcileArtifacts(args)).rejects.toThrow('frozen operation invalid or foreign');
  expect(databaseState(f)).toEqual(before);
  const retagged = { ...operation, schema: 'SourceDeliveryConfigRebindOperation/v1' };
  retagged.plan_digest = canonicalJsonDigest({ schema: retagged.schema, plan: retagged.plan });
  f.put('.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json', json(retagged));
  await expect(runReconcileArtifacts(args)).rejects.toThrow('foreign or absent maintenance fence');
  expect(databaseState(f)).toEqual(before);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
}, 30000);

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
      JSON.parse(readFileSync(path.join(f.root, `${f.bundle}/schemas/${name}.v1.schema.json`), 'utf8')),
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

test.each(['queued ownership', 'work', 'journal', 'governance'])(
  '%s arriving after preflight aborts acquisition without a new maintenance fence',
  async (change) => {
    const f = fixture();
    await runReconcileArtifacts(f.args('plan'));
    const original = HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken;
    let injected;
    HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = function (...args) {
      if (change === 'governance')
        withDatabase(f, (db) =>
          new HostStateStore(db, f.workspace).reserveOperation(
            'race',
            canonicalJsonDigest('operation'),
            canonicalJsonDigest('request'),
          ),
        );
      else seedState(f, change === 'queued ownership' ? { ticketStatus: 'queued' } : { native: change === 'journal' });
      injected = databaseState(f);
      return original.apply(this, args);
    };
    try {
      await expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(
        /ownership|global state differs|governance effect pending\/unknown/,
      );
      expect(fence(f)).toBeNull();
      expect(databaseState(f)).toEqual(injected);
      expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')))).toEqual(f.receipt);
    } finally {
      HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = original;
    }
  },
);

test('rebind preserves settled governance envelopes and refuses pending effects by outcome', async () => {
  const f = fixture();
  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace);
    const operation = store.reserveOperation(
      'settled',
      canonicalJsonDigest('operation'),
      canonicalJsonDigest('request'),
    );
    store.transitionOperation(operation, 'commit_unknown');
    store.transitionOperation(operation, 'applied', canonicalJsonDigest('result'));
  });
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  expect(databaseState(f).agent_host_governance).toEqual(before.agent_host_governance);
});

test('a foreign maintenance fence acquired after preflight is preserved without conversion or phase effects', async () => {
  const f = fixture();
  await runReconcileArtifacts(f.args('plan'));
  const original = HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken;
  let foreign, before;
  HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = function (...args) {
    withDatabase(f, (db) => {
      const owner = new HostStateStore(db, f.workspace, undefined, undefined, undefined, {
        principal: 'fixture:foreign-maintenance',
        projectIds: f.receipt.project_ids,
        verify: () => null,
      });
      foreign = owner.acquireMaintenanceFence({ ...args[0], operation_id: 'foreign-operation' }).fence;
    });
    before = databaseState(f);
    return original.apply(this, args);
  };
  try {
    await expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(/maintenance\/global state differs/);
    expect(fence(f)).toEqual(foreign);
    expect(databaseState(f)).toEqual(before);
  } finally {
    HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = original;
  }
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
  // The serial lifecycle wrapper must settle before fixture teardown.
  0,
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

// Synthetic persisted engine observations are fixture setup, never external caller or Runtime evidence.
function historicalFixture(
  predicate,
  { configuredContext = false, markerlessExcerpt = false, aggregateContext = false } = {},
) {
  const f = fixture({ sourceMode: true });
  const extraContextIds = aggregateContext ? ['aggregate-context-one', 'aggregate-context-two'] : [];
  if (predicate === 'unknown_readonly') {
    f.oldYaml = f.oldYaml.replace(/(    researcher:[\s\S]*?      egress_policy:) official_docs/, '$1 none');
    f.target = f.oldYaml.replace(
      /(    executor:\r?\n      model: )gpt-6-sol(\r?\n      reasoning: )high/,
      '$1gpt-6-luna$2max',
    );
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.receipt.config_digest = runtimeConfigDigest(loadRuntimeConfig(f.root));
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
  }
  if (configuredContext) {
    const newline = f.oldYaml.includes('\r\n') ? '\r\n' : '\n';
    const withOwnedSource = f.oldYaml.replace(
      /(    - id: project-context\r?\n      kind: local\r?\n      location: AGENT\.sidecar\.md\r?\n      title: Project-owned requirements and source map\r?\n)/,
      (_, source) =>
        source +
        `    - id: fixture-context${newline}      kind: local${newline}      location: ${fixtureContextPath}${newline}      title: Fixture-owned project context${newline}` +
        extraContextIds
          .map(
            (id) =>
              `    - id: ${id}${newline}      kind: local${newline}      location: docs/${id}.md${newline}      title: ${id}${newline}`,
          )
          .join(''),
    );
    expect(withOwnedSource).not.toBe(f.oldYaml);
    f.oldYaml = withOwnedSource;
    const pattern =
      /(^  task_execution:\r?\n[\s\S]*?^      - id: synthesize_task\r?\n        kind: synthesize\r?\n        mode: single\r?\n)/m;
    const withContext = f.oldYaml.replace(
      pattern,
      (_, stage) =>
        stage +
        `        context_source_ids:${newline}          - project-context${newline}          - fixture-context${newline}` +
        extraContextIds.map((id) => `          - ${id}${newline}`).join('') +
        `        context_skill_refs:${newline}          - .codex/skills/historical-review/SKILL.md${newline}`,
    );
    expect(withContext).not.toBe(f.oldYaml);
    f.oldYaml = withContext;
    f.target = withContext.replace(
      /(    executor:\r?\n      model: )[^\r\n]+(\r?\n      reasoning: )[^\r\n]+/,
      '$1gpt-6-luna$2max',
    );
    expect(f.target).not.toBe(withContext);
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.put(
      fixtureContextPath,
      markerlessExcerpt
        ? 'Original project context retained before suspension.\n'.repeat(400)
        : '# Fixture project context\n\nThis repository-owned local source provides additional project behavior context for the original task.\n',
    );
    for (const id of extraContextIds) f.put(`docs/${id}.md`, `# ${id}\n\nAdditional declared context.\n`);
    f.receipt.config_digest = runtimeConfigDigest(loadRuntimeConfig(f.root));
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
    f.put(
      '.codex/skills/historical-review/SKILL.md',
      '# Historical review skill\n\nUse the declared project context to verify the original task before making a recovery recommendation.\n',
    );
  }
  f.put('baseline.yaml', f.oldYaml);
  const config = loadRuntimeConfig(f.root),
    { identity } = seedState(f, { lease: true });
  const paths = [
    '.githooks/pre-commit',
    '.githooks/pre-push',
    'tests/agent/git-quality-hooks.test.mjs',
    'tooling/agent/git-quality-hooks.mjs',
    ...(configuredContext ? [fixtureContextPath, '.codex/skills/historical-review/SKILL.md'] : []),
    ...extraContextIds.map((id) => `docs/${id}.md`),
  ].sort();
  const preimage = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), paths);
  f.put('original-scope.json', json(preimage));
  const context = { work_id: identity.work_id, attempt: 1, scope_digest: preimage.digest },
    workflow = 'task_execution';
  const runId = sessionBridgeRunId(f.workspace, context, workflow),
    selection = {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project: 'agent',
      risk_flags: [],
      labels: [],
    };
  const workItem = { id: identity.work_id };
  const intakePath = '.agent/work/' + identity.work_id + '/intake.json';
  const intake = json({
    work_item: workItem,
    runtime_code_paths: ['packages/agent/bin/run.mjs'],
    native_session_handle: 'fixture-thread',
  });
  f.put(intakePath, intake);
  withDatabase(f, (db) => {
    const workRow = db.query("SELECT * FROM agent_host_state WHERE kind='work'").get(),
      work = JSON.parse(workRow.payload);
    work.execution.run_id = runId;
    work.execution.status = 'active';
    Object.assign(work.binding, {
      workflow_id: workflow,
      work_source_revision: preimage.digest,
      work_item_digest: canonicalJsonDigest(workItem),
      implementation_paths: paths,
      allowed_resources: paths.map((p) => 'file:' + p),
    });
    work.lifecycle.source_revision = preimage.digest;
    Object.assign(work.lifecycle.scope, {
      allowed_paths: paths,
      fingerprint_paths: paths,
      implementation_paths: paths,
    });
    work.artifacts = [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: intakePath,
        sha256: sha(Buffer.from(intake)),
        stage_id: 'local-intake',
        source_revision: preimage.digest,
        scope_id: work.binding.scope_id,
        ac_ids: work.binding.ac_ids,
      },
    ];
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'").run(
      json(work),
      canonicalJsonDigest(work),
    );
    const ledgerRow = db.query("SELECT * FROM agent_host_state WHERE kind='ledger'").get(),
      ledger = JSON.parse(ledgerRow.payload);
    for (const ticket of ledger.tickets)
      Object.assign(ticket, {
        source_revision: preimage.digest,
        exclusive_resources: work.binding.allowed_resources,
        active_resources: work.binding.allowed_resources,
        contour_keys: work.binding.allowed_resources,
      });
    ledger.claims[0].resources = work.binding.allowed_resources;
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
  });
  let prior = {
    ...context,
    workflow_id: workflow,
    config_digest: runtimeConfigDigest(config),
    selection,
    observations: [],
  };
  const engineContext = { input: structuredClone(prior) },
    completed = [],
    configuredContexts = [];
  let frontierItems,
    postimage = preimage;
  for (let waveIndex = 0; waveIndex < (predicate === 'settled_writer_failed_validators' ? 3 : 1); waveIndex++) {
    const actions = sessionActionsForWave(config, selection, context, workflow, waveIndex, []);
    const items = actions.map((action) => {
      let configuredContext = configuredContextForStage(f.root, config, workflow, action.stage_id, context);
      if (configuredContext && markerlessExcerpt) {
        const entry = configuredContext.entries.find((candidate) => candidate.id === 'fixture-context');
        expect(entry.truncated).toBe(true);
        entry.content = readFileSync(path.join(f.root, fixtureContextPath), 'utf8').slice(0, 8192);
        configuredContext = resignFixtureContext(configuredContext);
      }
      if (configuredContext) configuredContexts.push(configuredContext);
      const request = buildSessionBridgeRequest({
        runId,
        workflowId: workflow,
        configDigest: runtimeConfigDigest(config),
        context,
        waveIndex,
        action,
        configuredContext,
        priorResults: prior.observations,
      });
      const summary =
        waveIndex === 2
          ? JSON.stringify({
              schema: 'VidaValidatorVerdict/v1',
              verdict: 'fail',
              findings: ['Fixture negative finding'],
              evidence_refs: ['local://fixture/terminal'],
            })
          : 'Synthetic terminal fixture evidence';
      const item = {
        request,
        issue_id: predicate === 'unissued_prepared' ? null : randomUUID(),
        observation:
          ['unknown_readonly', 'unissued_prepared'].includes(predicate)
            ? null
            : {
                schema: 'VidaSessionObservation/v1',
                action_id: request.action_id,
                issue_id: null,
                agent_id: 'fixture-' + action.role,
                tool_call_ref: 'fixture:' + action.action_id,
                status: waveIndex === 2 ? 'reported_failed' : 'reported_complete',
                summary,
                output_digest: canonicalJsonDigest(summary),
                evidence_refs: ['local://fixture/terminal'],
              },
      };
      if (item.observation) item.observation.issue_id = item.issue_id;
      if (waveIndex === 1)
        withDatabase(f, (db) => {
          const store = new HostStateStore(db, f.workspace),
            before = store.readHostStateSnapshot(identity);
          const receipt = store.claimWorkflowAttempt({
            identity,
            expectedWork: before.workVersion,
            expectedLedger: before.ledgerVersion,
            stageId: request.stage_id,
            assignmentIndex: request.assignment_index,
            requestDigest: canonicalJsonDigest(request),
            lease: before.work.lease,
          });
          for (const relative of paths) f.put(relative, 'Synthetic authored ' + relative);
          postimage = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), paths);
          Object.assign(item.observation, { host_attempt_id: receipt.attempt.attempt_id, changed_paths: paths });
          store.completeWorkflowAttempt(receipt, item.observation);
          item.host_reservation = {
            schema: 'WorkflowSessionReservation/v1',
            receipt,
            request: {
              workItemId: identity.work_id,
              stageId: request.stage_id,
              assignmentIndex: request.assignment_index,
            },
          };
        });
      return item;
    });
    const frontier = waveIndex === (predicate === 'settled_writer_failed_validators' ? 2 : 0);
    if (frontier) {
      frontierItems = items;
      engineContext['wave-' + waveIndex] = {
        status: 'suspended',
        payload: structuredClone(prior),
        suspendPayload: { requests: items.map((item) => item.request) },
      };
    } else {
      const output = { ...prior, observations: [...prior.observations, ...items.map((item) => item.observation)] };
      engineContext['wave-' + waveIndex] = {
        status: 'success',
        payload: structuredClone(prior),
        resumePayload: { observations: items.map((item) => item.observation) },
        output,
      };
      prior = output;
      completed.push({ step_id: 'wave-' + waveIndex, items });
    }
  }
  const state = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: f.workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: runId,
    source_scope: postimage,
    step_id: 'wave-' + completed.length,
    items: frontierItems,
    completed,
  };
  withDatabase(f, (db) =>
    db
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(f.workspace, identity.work_id, 1, 1, json(state), canonicalJsonDigest(state)),
  );
  const native = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), {
    create: true,
    strict: true,
  });
  try {
    native.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot BLOB)');
    native
      .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
      .run(workflow, runId, json({ runId, status: 'suspended', context: engineContext }));
  } finally {
    native.close();
  }
  f.put('agent-runtime.config.v1.yaml', f.target);
  const request = {
    schema: predicate === 'unissued_prepared' ? 'UnissuedOwnerReleaseRequest/v1' : 'HistoricalOwnerReleaseRequest/v1',
    identity,
    attempt: 1,
    userRequestPointer: 'fixture:human-owner-release',
    requestIntent: 'linked_correction',
    predicate,
    ...(predicate === 'settled_writer_failed_validators' ? { preimage_ref: 'original-scope.json' } : {}),
  };
  f.put('release.json', json(request));
  const args = (mode) => [
    predicate === 'unissued_prepared' ? '--release-unissued-owner' : '--release-historical-owner',
    'true',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    'release.json',
  ];
  return { f, args, request, state, configuredContexts };
}

test.each(['completed_readonly', 'unknown_readonly', 'settled_writer_failed_validators'])(
  'historical %s releases only its original owner after config delivery and preserves all original evidence',
  async (predicate) => {
    const { f, args, state } = historicalFixture(predicate),
      before = databaseState(f),
      engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
    const inspected = await run(args('inspect'));
    expect(inspected.caller_identity_authenticated).toBe(false);
    expect(databaseState(f)).toEqual(before);
    f.put('release.json', json(inspected.request));
    const result = await run(args('apply'));
    expect(result.status).toBe('historical_owner_released');
    const after = databaseState(f);
    expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
    const workBefore = JSON.parse(before.agent_host_state.find((row) => row.kind === 'work').payload),
      workAfter = JSON.parse(after.agent_host_state.find((row) => row.kind === 'work').payload);
    expect(workAfter.lease).toBeNull();
    expect(workAfter.binding).toEqual(workBefore.binding);
    expect(workAfter.execution.assignment_attempts).toEqual(workBefore.execution.assignment_attempts);
    expect(workAfter.lifecycle.phase).toBe(workBefore.lifecycle.phase);
    expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(engineBefore)).toBe(true);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')))).toEqual(f.receipt);
    expect((await run(args('apply'))).work_version).toEqual(result.work_version);
    expect(state.source_scope.digest).toBeTruthy();
  },
  30000,
);

test('public historical inspect runs from unrelated cwd while the ordinary receipt is stale', () => {
  const { f, args } = historicalFixture('completed_readonly'),
    before = databaseState(f);
  const actual = spawnSync(process.execPath, [path.join(source, 'bin/run.mjs'), ...args('inspect')], {
    cwd: tmpdir(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  expect(actual.status).toBe(0);
  expect(actual.error).toBeUndefined();
  expect(JSON.parse(actual.stdout).status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public unissued owner release preserves its inert frontier and denies completed-readonly fiction', async () => {
  const { f, args, state, request } = historicalFixture('unissued_prepared'),
    before = databaseState(f), engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const legacy = { ...request, schema: 'HistoricalOwnerReleaseRequest/v1', predicate: 'completed_readonly' };
  f.put('release.json', json(legacy));
  const oldArgs = args('inspect'); oldArgs[0] = '--release-historical-owner';
  await expect(run(oldArgs)).rejects.toThrow('completed readonly');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(request));
  const wrongOwner = args('inspect'); wrongOwner[7] = 'foreign-owner';
  await expect(run(wrongOwner)).rejects.toThrow('original owner differs');
  const inspected = await run(args('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  const after = databaseState(f), work = JSON.parse(after.agent_host_state.find(row => row.kind === 'work').payload);
  expect(work.lease).toBeNull();expect(work.execution.status).toBe('suspended');
  expect(work.lifecycle.next_action).toContain('unissued frontier remains inert');
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(engine)).toBe(true);
  expect(state.items.every(item => item.issue_id === null && item.observation === null)).toBe(true);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public historical context history uses retained context after mutable documentation changes', async () => {
  const { f, args, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  f.put('retained-run.json', json({ schema: 'VidaAgentRunResult/v1', next_actions: configuredContexts.map(context => ({ configured_context: context })) }));
  f.put(fixtureContextPath, 'Current changed documentation');
  const before = databaseState(f);
  await expect(run(args('inspect'))).rejects.toThrow('original configured requests differ');
  const withHistory = mode => [...args(mode), '--context-history', 'retained-run.json'];
  const foreign = structuredClone(configuredContexts[0]);
  foreign.work_id = 'foreign-work';
  f.put('retained-run.json', json({ schema: 'VidaAgentRunResult/v1', next_actions: [{ configured_context: foreign }] }));
  await expect(run(withHistory('inspect'))).rejects.toThrow('identity invalid');
  expect(databaseState(f)).toEqual(before);
  f.put('retained-run.json', json({ schema: 'VidaAgentRunResult/v1', next_actions: configuredContexts.map(context => ({ configured_context: context })) }));
  const inspected = await run(withHistory('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  expect((await run(withHistory('apply'))).status).toBe('historical_owner_released');
  expect((await run(withHistory('apply'))).rights_granted).toBe(false);
}, 30000);

test('public unissued owner release rejects an issued frontier without disposing its lease', async () => {
  const { f, args, request } = historicalFixture('unknown_readonly'), before = databaseState(f);
  f.put('release.json', json({ ...request, schema: 'UnissuedOwnerReleaseRequest/v1', predicate: 'unissued_prepared' }));
  const signal = args('inspect'); signal[0] = '--release-unissued-owner';
  await expect(run(signal)).rejects.toThrow('issued or reserved activity');
  expect(databaseState(f)).toEqual(before);
});

test('historical owner release rejects maintenance drift between predicate and write preparation', () => {
  const { f, request } = historicalFixture('unissued_prepared'), before = databaseState(f),
    original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, 1);
  withDatabase(f, db => {
    const actual = new HostStateStore(db, f.workspace);
    let reads = 0;
    const store = new Proxy(actual, { get(target, key) {
      if (key === 'readHostStateSnapshot') return identity => {
        const snapshot = target.readHostStateSnapshot(identity);
        return ++reads === 2 ? { ...snapshot, maintenanceGeneration: snapshot.maintenanceGeneration + 1 } : snapshot;
      };
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    expect(() => suspendHistoricalOwnerWork({ store, identity: request.identity,
      journal: { state: original.journal.state, version: original.journal.version, resume_status: 'ready' },
      expectedWork: original.owner.version, expectedLedger: original.workspace.ledger_version,
      expectedMaintenanceGeneration: original.maintenanceGeneration, nativeSessionHandle: 'fixture-thread',
      userRequestPointer: request.userRequestPointer, requestIntent: request.requestIntent,
      config: original.config, predicate: 'unissued_prepared',
      documentationContext: { repository_root: f.root, repository_id: request.identity.repository_id,
        project_id: request.identity.project_ids[0], work_id: request.identity.work_id },
    })).toThrow('maintenance generation changed after inspection');
  });
  expect(databaseState(f)).toEqual(before);
});

test('public historical inspect rebuilds populated local source and repository skill context read-only', async () => {
  const { f, args, state, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  expect(configuredContexts).toHaveLength(1);
  expect(configuredContexts[0].entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
  expect(configuredContexts[0].entries.find((entry) => entry.id === 'fixture-context')?.location).toBe(
    fixtureContextPath,
  );
  expect(configuredContexts[0].entries.every((entry) => entry.content?.trim().length > 0)).toBe(true);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      '.agent/runtime-initialization.v1.json',
      'AGENT.sidecar.md',
      fixtureContextPath,
      '.codex/skills/historical-review/SKILL.md',
      ...state.source_scope.entries.map((entry) => entry.path),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const result = await run(args('inspect'));
  expect(result.status).toBe('historical_owner_release_inspected');
  expect(result.caller_identity_authenticated).toBe(false);
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test('public recovery-review prepare reserves only review for populated historical context', async () => {
  const { f, call, state, configuredContexts } = recoveryFixture({ configuredContext: true });
  expect(configuredContexts).toHaveLength(1);
  expect(configuredContexts[0].entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
  expect(configuredContexts[0].entries.find((entry) => entry.id === 'fixture-context')?.location).toBe(
    fixtureContextPath,
  );
  expect(configuredContexts[0].entries.every((entry) => entry.content?.trim().length > 0)).toBe(true);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      '.agent/runtime-initialization.v1.json',
      'AGENT.sidecar.md',
      fixtureContextPath,
      '.codex/skills/historical-review/SKILL.md',
      ...state.source_scope.entries.map((entry) => entry.path),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const prepared = await call('prepare');
  expect(prepared.status).toBe('reserved');
  expect(prepared.operation.status).toBe('reserved');
  expect(prepared.native_dispatch_performed).toBe(false);
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    reviewRows = after.agent_host_governance.filter(
      (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
    );
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews')).toEqual(
    before.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews'),
  );
  expect(reviewRows).toHaveLength(1);
  expect(JSON.parse(reviewRows[0].payload)).toMatchObject({
    schema: 'OperationReservation/v1',
    store_id: 'vida-recovery-reviews',
    status: 'reserved',
    operation_key: prepared.operation.operation_key,
  });
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test('public recovery review keeps original configured context in caller history and rechecks current Source', async () => {
  const { f, input, call, observation, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts);
  expect(originalContexts).toHaveLength(1);
  const originalBody = structuredClone(originalContexts[0].context),
    originalText = originalBody.entries.find((entry) => entry.kind === 'local').content,
    localPath = path.join(f.root, fixtureContextPath),
    skillPath = path.join(f.root, '.codex/skills/historical-review/SKILL.md');
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before review preparation.\n');
  f.put(
    '.codex/skills/historical-review/SKILL.md',
    readFileSync(skillPath, 'utf8') + '\nCurrent skill edit before review preparation.\n',
  );
  const currentSource = snapshotDeclaredSources(
      requireSafeRepositoryAccess(f.root),
      state.source_scope.entries.map((entry) => entry.path),
    ),
    before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    prepared = await call('prepare', { ...input, originalContexts });
  expect(prepared.status).toBe('reserved');
  expect(prepared.native_dispatch_performed).toBe(false);
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.runtime_acceptance).toBe(false);
  expect(prepared.request.source).toEqual(currentSource);
  expect(prepared.request).not.toHaveProperty('originalContexts');
  expect(JSON.stringify(prepared.request)).not.toContain(originalText);
  const resumed = { ...input, originalContexts, request: prepared.request };
  expect((await call('begin', resumed)).status).toBe('commit_unknown');
  const observed = observation(prepared.operation),
    completed = await call('complete', { ...resumed, observation: observed });
  expect(completed.status).toBe('applied');
  expect(completed.native_dispatch_performed).toBe(false);
  expect(completed.rights_granted).toBe(false);
  expect(completed.runtime_acceptance).toBe(false);
  expect((await call('complete', { ...resumed, observation: observed })).operation).toEqual(completed.operation);
  const after = databaseState(f),
    operations = after.agent_host_governance.filter(
      (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
    );
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews')).toEqual(
    before.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews'),
  );
  expect(operations).toHaveLength(1);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  expect(JSON.stringify(after)).not.toContain(originalText);
}, 30000);

test('public recovery review accepts a canonical markerless original excerpt and denies a substituted body', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({
      configuredContext: true,
      markerlessExcerpt: true,
    }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    entry = originalContexts[0].context.entries.find((candidate) => candidate.id === 'fixture-context');
  expect(entry.truncated).toBe(true);
  expect(entry.content).toHaveLength(8192);
  expect(entry.content).not.toContain('[middle omitted; read source for complete content]');
  f.put(fixtureContextPath, 'Current project context after the original request.\n');
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    substituted = structuredClone(originalContexts);
  substituted[0].context.entries.find((candidate) => candidate.id === 'fixture-context').content =
    'Substituted excerpt';
  substituted[0].context = resignFixtureContext(substituted[0].context);
  await expect(call('prepare', { ...input, originalContexts: substituted })).rejects.toThrow(
    'historical original configured requests differ',
  );
  expect(databaseState(f)).toEqual(before);
  const prepared = await call('prepare', { ...input, originalContexts });
  expect(prepared.status).toBe('reserved');
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.request).not.toHaveProperty('originalContexts');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  const changedRequest = structuredClone(prepared.request);
  changedRequest.expectedWork += 1;
  await expect(call('inspect', { ...input, originalContexts, request: changedRequest })).rejects.toThrow(
    /retained recovery request changed/,
  );
  expect(databaseState(f)).toEqual(after);
  expect((await call('inspect', { ...input, originalContexts, request: prepared.request })).status).toBe('reserved');
}, 30000);

test('public recovery review retains UNKNOWN when original-context custody is lost or current Source goes stale', async () => {
  const { f, input, call, observation, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    localPath = path.join(f.root, fixtureContextPath);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before prepare.\n');
  const prepared = await call('prepare', { ...input, originalContexts }),
    resumed = { ...input, originalContexts, request: prepared.request };
  expect((await call('begin', resumed)).status).toBe('commit_unknown');
  const afterBegin = databaseState(f);
  await expect(call('inspect', { ...input, request: prepared.request })).rejects.toThrow();
  expect(databaseState(f)).toEqual(afterBegin);
  await expect(call('begin', resumed)).rejects.toThrow(/reissue forbidden/);
  expect(databaseState(f)).toEqual(afterBegin);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nConcurrent Source edit after prepare.\n');
  const inspected = await call('inspect', resumed);
  expect(inspected.status).toBe('commit_unknown');
  expect(inspected.request).toEqual(prepared.request);
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(afterBegin);
  await expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(
    /retained recovery request changed|source scope changed/,
  );
  expect(databaseState(f)).toEqual(afterBegin);
}, 30000);

test('public recovery review rejects current Source drift before begin after body-backed preparation', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    localPath = path.join(f.root, fixtureContextPath);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before prepare.\n');
  const prepared = await call('prepare', { ...input, originalContexts }),
    resumed = { ...input, originalContexts, request: prepared.request },
    afterPrepare = databaseState(f);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nConcurrent Source edit after prepare.\n');
  await expect(call('begin', resumed)).rejects.toThrow(/retained recovery request changed|source scope changed/);
  expect(databaseState(f)).toEqual(afterPrepare);
}, 30000);

test.each(
  [
    [
      'complete-source content binding tamper',
      (contexts) => (contexts[0].context.entries[0].content += '\nForged body.\n'),
    ],
    [
      'stale context self digest',
      (contexts) => {
        const context = contexts[0].context,
          before = structuredClone(context);
        context.digest = canonicalJsonDigest({ fixture: 'different original-context self binding' });
        expect(context.digest).not.toBe(before.digest);
        expect({ ...context, digest: before.digest }).toEqual(before);
      },
      'original configured context self binding differs',
    ],
    [
      'malformed UTF-8 text',
      (contexts) => {
        const context = contexts[0].context;
        context.entries[0].content = '\uD800';
        context.entries[0].truncated = true;
      },
      'original configured context text is invalid UTF-8',
    ],
    ['action substitution', (contexts) => (contexts[0].action_id = 'f'.repeat(64))],
    ['wave substitution', (contexts) => (contexts[0].wave_index += 1)],
    ['stage substitution', (contexts) => (contexts[0].stage_id = 'foreign-stage')],
    ['work substitution', (contexts) => (contexts[0].work_id = 'foreign-work')],
    ['attempt substitution', (contexts) => (contexts[0].attempt += 1)],
    ['duplicate action entry', (contexts) => contexts.push(structuredClone(contexts[0]))],
    [
      'extra context entry',
      (contexts) => {
        const context = contexts[0].context;
        context.entries.push(structuredClone(context.entries[0]));
        contexts[0].context = resignFixtureContext(context);
      },
    ],
    [
      'per-file byte limit',
      (contexts) => {
        const context = contexts[0].context;
        context.entries[0].bytes = 65537;
        context.entries[0].truncated = true;
        contexts[0].context = resignFixtureContext(context);
      },
    ],
    [
      'excerpt character limit',
      (contexts) => {
        const context = contexts[0].context;
        context.entries[0].content = 'x'.repeat(8193);
        contexts[0].context = resignFixtureContext(context);
      },
    ],
    [
      'oversized selection cardinality',
      (contexts) => {
        const context = contexts[0].context;
        context.entries = Array.from({ length: 17 }, () => structuredClone(context.entries[0]));
        contexts[0].context = resignFixtureContext(context);
      },
    ],
  ].map(([name, mutate, reason]) => [name, mutate, reason ?? null]),
)(
  'public recovery review rejects original-context %s before reserving an operation',
  async (_name, mutate, expectedReason) => {
    const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
      originalContexts = fixtureOriginalContexts(state, configuredContexts);
    mutate(originalContexts);
    const before = databaseState(f),
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath);
    const denied = expect(call('prepare', { ...input, originalContexts })).rejects;
    if (expectedReason) await denied.toThrow(expectedReason);
    else await denied.toThrow();
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  },
  30000,
);

test('public recovery review rejects aggregate original-context bytes before reserving an operation', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({
      configuredContext: true,
      aggregateContext: true,
    }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    context = originalContexts[0].context;
  expect(context.entries).toHaveLength(5);
  for (const entry of context.entries) {
    expect(['local', 'skill']).toContain(entry.kind);
    entry.bytes = 65536;
    entry.truncated = true;
  }
  originalContexts[0].context = resignFixtureContext(context);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath);
  await expect(call('prepare', { ...input, originalContexts })).rejects.toThrow(
    'original configured context exceeds aggregate limit',
  );
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
});

test('public recovery review rejects original-context export over the caller-history byte limit', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    oversized = { ...input, originalContexts, padding: 'x'.repeat(262145) },
    before = databaseState(f);
  await expect(call('prepare', oversized)).rejects.toThrow(/caller-history export exceeds bound/);
  expect(databaseState(f)).toEqual(before);
});

test('original context body cannot authorize current topology drift or rewrite the retained request', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts);
  f.put(
    'agent-runtime.config.v1.yaml',
    f.target.replace(
      /(^        context_source_ids:\r?\n          - project-context\r?\n)          - fixture-context\r?\n/m,
      '$1',
    ),
  );
  const before = databaseState(f);
  await expect(call('prepare', { ...input, originalContexts })).rejects.toThrow(
    'vida runtime-config rebind: only requested executor model/reasoning may change',
  );
  expect(databaseState(f)).toEqual(before);
});

test('configured context reader rejects a missing declared local source after historical request construction', () => {
  const { f, state, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  const request = state.items[0].request,
    context = { work_id: state.work_id, attempt: state.attempt, scope_digest: request.scope_digest },
    current = loadRuntimeConfig(f.root),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    contextPath = path.join(f.root, fixtureContextPath),
    originalContextBytes = readFileSync(contextPath),
    before = databaseState(f),
    receiptBefore = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      'AGENT.sidecar.md',
      '.codex/skills/historical-review/SKILL.md',
      'release.json',
      ...state.source_scope.entries.map((entry) => entry.path).filter((relative) => relative !== fixtureContextPath),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  expect(configuredContexts[0].entries.find((entry) => entry.id === 'fixture-context')?.sha256).toBe(
    sha(originalContextBytes),
  );
  expect(runtimeConfigDigest(current)).not.toBe(request.config_digest);
  rmSync(contextPath);
  let contextReadFailure;
  try {
    configuredContextForStage(f.root, current, request.workflow_id, request.stage_id, context);
  } catch (error) {
    contextReadFailure = error;
  }
  expectMissingFixtureContextRead(contextReadFailure, `configured context ${fixtureContextPath}`);
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(receiptBefore)).toBe(true);
  expect(existsSync(contextPath)).toBe(false);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test.each([
  ['owner inspect', 'local source', 'changed'],
  ['owner inspect', 'local source', 'missing'],
  ['owner inspect', 'repository skill', 'changed'],
  ['owner inspect', 'repository skill', 'missing'],
  ['review prepare', 'local source', 'changed'],
  ['review prepare', 'local source', 'missing'],
  ['review prepare', 'repository skill', 'changed'],
  ['review prepare', 'repository skill', 'missing'],
])(
  'historical configured context denies %s after %s is %s without changing authoritative state',
  async (route, kind, drift) => {
    const historical =
      route === 'owner inspect'
        ? historicalFixture('completed_readonly', { configuredContext: true })
        : recoveryFixture({ configuredContext: true });
    const { f, state, configuredContexts } = historical;
    expect(configuredContexts).toHaveLength(1);
    expect(configuredContexts[0].entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
    expect(configuredContexts[0].entries.every((entry) => entry.content?.trim().length > 0)).toBe(true);
    const relative = kind === 'local source' ? fixtureContextPath : '.codex/skills/historical-review/SKILL.md';
    const absolute = path.join(f.root, relative);
    if (drift === 'changed')
      f.put(relative, readFileSync(absolute, 'utf8') + '\nChanged after original request construction.\n');
    else rmSync(absolute);
    const before = databaseState(f),
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath),
      protectedPaths = [
        'agent-runtime.config.v1.yaml',
        'baseline.yaml',
        '.agent/runtime-initialization.v1.json',
        'AGENT.sidecar.md',
        fixtureContextPath,
        '.codex/skills/historical-review/SKILL.md',
        ...state.source_scope.entries.map((entry) => entry.path),
      ],
      fileSnapshots = new Map(
        [...new Set(protectedPaths)].map((sourcePath) => [
          sourcePath,
          existsSync(path.join(f.root, sourcePath)) ? readFileSync(path.join(f.root, sourcePath)) : null,
        ]),
      );
    const invoke = route === 'owner inspect' ? () => run(historical.args('inspect')) : () => historical.call('prepare');
    if (drift === 'missing' && kind === 'local source') {
      let missingReferenceFailure;
      try {
        await invoke();
      } catch (error) {
        missingReferenceFailure = error;
      }
      expectMissingFixtureContextRead(missingReferenceFailure, `required reference ${fixtureContextPath}`);
    } else {
      const expected =
        drift === 'changed'
          ? /historical original configured requests differ/
          : /configured context \.codex\/skills\/historical-review\/SKILL\.md/;
      await expect(invoke()).rejects.toThrow(expected);
    }
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
    for (const [sourcePath, bytes] of fileSnapshots) {
      const currentPath = path.join(f.root, sourcePath);
      expect(existsSync(currentPath)).toBe(bytes !== null);
      if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
    }
  },
  30000,
);

test.each([
  ['owner inspect', 'context-source selection'],
  ['review prepare', 'context-source selection'],
  ['owner inspect', 'executor execution_mode'],
  ['review prepare', 'executor execution_mode'],
])(
  'public historical %s rejects %s drift beyond executor-only delta without effects',
  async (route, drift) => {
    const subject =
      route === 'owner inspect'
        ? historicalFixture('completed_readonly', { configuredContext: true })
        : recoveryFixture({ configuredContext: true });
    const { f, state } = subject;
    if (route === 'review prepare') f.put('.tmp/recovery-input.json', json(subject.input));
    const changedConfig =
      drift === 'context-source selection'
        ? f.target.replace(
            /(^        context_source_ids:\r?\n          - project-context\r?\n)          - fixture-context\r?\n/m,
            '$1',
          )
        : f.target.replace(
            /(^    executor:\r?\n      model: gpt-6-luna\r?\n      reasoning: max\r?\n      execution_mode: )standard/m,
            '$1fast',
          );
    expect(changedConfig).not.toBe(f.target);
    f.put('agent-runtime.config.v1.yaml', changedConfig);
    const current = loadRuntimeConfig(f.root);
    if (drift === 'context-source selection')
      expect(
        current.workflows.task_execution.stages.find((stage) => stage.id === 'synthesize_task')?.context_source_ids,
      ).toEqual(['project-context']);
    else expect(current.agents.profiles.executor.execution_mode).toBe('fast');
    const intakePath = `.agent/work/${state.work_id}/intake.json`,
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath),
      before = databaseState(f),
      reviewReservations = (snapshot) =>
        snapshot.agent_host_governance.filter(
          (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
        ),
      protectedPaths = [
        'agent-runtime.config.v1.yaml',
        'baseline.yaml',
        '.agent/runtime-initialization.v1.json',
        'AGENT.sidecar.md',
        fixtureContextPath,
        '.codex/skills/historical-review/SKILL.md',
        'release.json',
        intakePath,
        ...(route === 'review prepare' ? ['.tmp/recovery-input.json'] : []),
        ...state.source_scope.entries.map((entry) => entry.path),
      ],
      fileSnapshots = new Map(
        [...new Set(protectedPaths)].map((relative) => [
          relative,
          existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
        ]),
      );
    expect(reviewReservations(before)).toHaveLength(0);
    const invoke = route === 'owner inspect' ? () => run(subject.args('inspect')) : () => subject.call('prepare');
    await expect(invoke()).rejects.toThrow(
      'vida runtime-config rebind: only requested executor model/reasoning may change',
    );
    const after = databaseState(f);
    expect(after).toEqual(before);
    expect(reviewReservations(after)).toHaveLength(0);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
    for (const [relative, bytes] of fileSnapshots) {
      const currentPath = path.join(f.root, relative);
      expect(existsSync(currentPath)).toBe(bytes !== null);
      if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
    }
  },
  30000,
);

test.each([
  'wrong owner',
  'wrong baseline',
  'changed rights',
  'missing engine',
  'extra action',
  'missing preimage',
  'envelope preimage',
  'foreign preimage',
  'source drift',
])(
  'historical settled writer denies %s without state or receipt effects',
  async (change) => {
    const { f, args } = historicalFixture('settled_writer_failed_validators');
    const values = args('inspect');
    if (change === 'wrong owner') values[values.indexOf('--native-session-handle') + 1] = 'foreign';
    if (change === 'wrong baseline') f.put('baseline.yaml', f.target);
    if (change === 'changed rights')
      f.put('agent-runtime.config.v1.yaml', f.target.replace('tools_policy: validator', 'tools_policy: developer'));
    if (change === 'missing engine')
      withDatabase(f, () => {
        const engine = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), { strict: true });
        try {
          engine.exec('DELETE FROM mastra_workflow_snapshot');
        } finally {
          engine.close();
        }
      });
    if (change === 'extra action')
      withDatabase(f, (db) => {
        const row = db.query('SELECT * FROM agent_host_mastra_session_ledger').get(),
          state = JSON.parse(row.payload);
        state.items.push(structuredClone(state.items[0]));
        db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?').run(
          json(state),
          canonicalJsonDigest(state),
        );
      });
    if (change === 'missing preimage')
      renameSync(path.join(f.root, 'original-scope.json'), path.join(f.root, 'retained.json'));
    if (change === 'envelope preimage')
      f.put(
        'original-scope.json',
        json({ stdout: readFileSync(path.join(f.root, 'original-scope.json'), 'utf8'), exit_code: 0 }),
      );
    if (change === 'foreign preimage')
      f.put(
        'original-scope.json',
        json(snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['AGENT.sidecar.md'])),
      );
    if (change === 'source drift') f.put('.githooks/pre-commit', 'Concurrent source drift');
    const before = databaseState(f),
      receipt = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
    await expect(run(values)).rejects.toThrow();
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(receipt)).toBe(true);
  },
  30000,
);

test.each(['journal', 'preimage', 'maintenance'])(
  'historical apply denies changed %s after inspect without releasing ownership',
  async (change) => {
    const { f, args } = historicalFixture('settled_writer_failed_validators');
    const inspected = await run(args('inspect'));
    f.put('release.json', json(inspected.request));
    if (change === 'preimage')
      f.put('original-scope.json', readFileSync(path.join(f.root, 'original-scope.json'), 'utf8') + '\n');
    else if (change === 'journal')
      withDatabase(f, (db) => {
        const row = db.query('SELECT * FROM agent_host_mastra_session_ledger').get(),
          state = JSON.parse(row.payload);
        state.items[0].observation.evidence_refs.push('fixture:later-evidence');
        db.query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=?').run(
          json(state),
          canonicalJsonDigest(state),
        );
      });
    else {
      // Host fixture state cannot acquire maintenance while the historical owner is active.
      const changed = structuredClone(inspected.request);
      changed.inspection.expectedMaintenanceGeneration++;
      f.put('release.json', json(changed));
    }
    const before = databaseState(f);
    await expect(run(args('apply'))).rejects.toThrow(/changed/);
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('historical inert preparation remains blocked and mixed execution flags cannot dispatch', async () => {
  const f = fixture({ sourceMode: true });
  f.put('baseline.yaml', f.oldYaml);
  const { identity } = seedState(f, { lease: true });
  f.put('agent-runtime.config.v1.yaml', f.target);
  f.put(
    'release.json',
    json({
      schema: 'HistoricalOwnerReleaseRequest/v1',
      identity,
      attempt: 1,
      userRequestPointer: 'fixture:inert',
      requestIntent: 'next_work',
      predicate: 'completed_readonly',
    }),
  );
  const args = [
    '--release-historical-owner',
    'true',
    '--mode',
    'inspect',
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    'release.json',
  ];
  const before = databaseState(f);
  await expect(run(args)).rejects.toThrow(/inert release is unsupported/);
  for (const flag of [
    '--issue-wave',
    '--report',
    '--capture-stopped-source',
    '--retire-interrupted-source-owner',
    '--release-completed-readonly',
  ])
    await expect(run([...args, flag, 'true'])).rejects.toThrow();
  expect(databaseState(f)).toEqual(before);
}, 30000);

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
