import { afterEach, test, expect, mock } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import { stringify as stringifyYaml } from 'yaml';
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
  copyFileSync,
  linkSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { runReconcileArtifacts as reconcileEntrypoint } from '../bin/reconcile-artifacts.mjs';
import { run as runEntrypoint } from '../bin/run.mjs';
import { cooperativeReadonlyAssignments, currentState, inspectHistoricalOwnerContext } from '../bin/runtime-config-rebind.mjs';
import { inspectHistoricalOwnerWork, suspendHistoricalOwnerWork } from '../src/orchestration/suspend-local-work.ts';
import { loadRuntimeConfig, parseRuntimeConfigYaml, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { canonicalJson, canonicalJsonDigest, MAX_CANONICAL_BYTES } from '../src/contracts/public-ingress.ts';
import { createHistoricalResearchFixture } from './helpers/historical-research-fixture.mjs';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import {
  admittedResearchResultsForSynthesis,
  synthesisSourceCatalog,
} from '../src/orchestration/observed-synthesis-result.ts';
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
const sourceCorrectionNativeRuntime = { value: null, mocked: false, previousPath: undefined };
const sourceCorrectionPriorVersion = '0.1.2';
const sourceCorrectionNextVersion = (version) => {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
};
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
  sourceCorrectionNativeRuntime.value = null;
  if (sourceCorrectionNativeRuntime.previousPath !== undefined) {
    process.env.PATH = sourceCorrectionNativeRuntime.previousPath;
    sourceCorrectionNativeRuntime.previousPath = undefined;
  }
  for (const root of fixtureRoots.splice(0)) {
    if (pendingFixtureCalls.has(root)) console.warn(`Retained fixture with an unresolved operation: ${root}`);
    else rmSync(root, { recursive: true, force: true });
  }
});
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (v) => JSON.stringify(v, null, 2) + '\n';
function jsonNodeCount(value) {
  if (Array.isArray(value)) return 1 + value.reduce((total, item) => total + jsonNodeCount(item), 0);
  if (value && typeof value === 'object')
    return 1 + Object.values(value).reduce((total, item) => total + jsonNodeCount(item), 0);
  return 1;
}
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

function fixture({ sourceMode = false, extraProject = false } = {}) {
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
  if (extraProject) {
    const values = structuredClone(
      parseRuntimeConfigYaml(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8')),
    );
    values.projects.push({
      ...structuredClone(values.projects[0]),
      project_id: 'plugin',
      title: 'plugin',
      project_root: 'packages/plugin',
      code_selectors: ['packages/plugin/**'],
      delivery_group: 'plugin',
    });
    values.integrations.providers.push({
      id: 'fixture-plugin',
      provider: 'local',
      project_id: 'plugin',
      tenant_id: 'local',
      namespace: 'plugin',
    });
    values.teams['default-development'].allowed_projects.push('plugin');
    values.repository.code_selectors.push('packages/plugin/**');
    put('packages/plugin/.keep', 'fixture project');
    put('agent-runtime.config.v1.yaml', stringifyYaml(values));
  }
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

function withoutPrewriterTemplateDelta(config) {
  const baseline = structuredClone(config),
    roles = ['source-planner', 'security-prewriter'],
    workflows = [
      ['implementation_new', 'develop_change'],
      ['implementation_change', 'develop_change'],
      ['bug_fix', 'develop_fix'],
      ['task_execution', 'develop_task'],
    ];
  if (!Object.hasOwn(baseline.agents.role_instructions, 'security-prewriter')) return baseline;
  for (const role of roles) {
    delete baseline.agents.role_instructions[role];
    delete baseline.teams['default-development'].roles[role];
  }
  delete baseline.artifact_contracts['LifecyclePreparationObservation/v1'];
  for (const [workflowId, developerId] of workflows) {
    const workflow = baseline.workflows[workflowId];
    workflow.stages = workflow.stages.filter((stage) => stage.id !== 'review_source_prewrite');
    workflow.stages.find((stage) => stage.id === developerId).required_after = ['synthesize_task'];
    workflow.edges = workflow.edges.filter((edge) => !edge.includes('review_source_prewrite'));
    workflow.edges.push(['synthesize_task', developerId]);
  }
  return baseline;
}

function sourceCorrectionFixture() {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  seedKnownTerminalSynthesisCustody(f, request, state);
  f.put('accepted-baseline.yaml', f.oldYaml);
  f.put('agent-runtime.config.v1.yaml', f.target);
  const deliveryArgs = (mode) => {
      const args = f.args(mode);
      args[args.indexOf('--kind') + 1] = 'runtime-config-delivery';
      if (['inspect', 'plan'].includes(mode)) {
        args[args.indexOf('--target-config') + 1] = 'agent-runtime.config.v1.yaml';
        args.push('--baseline-config', 'accepted-baseline.yaml');
      }
      return args;
    },
    sourceBeforeimagesPath = path.join(f.root, '.tmp/original-source-beforeimages.json'),
    priorSystemUpdatePath = path.join(f.root, '.tmp/prior-system-update.json'),
    changedPath = 'packages/agent/bin/runtime-config-rebind.mjs';
  const sourceManifestPath = 'packages/agent/package.json',
    authorizedPaths = [changedPath, sourceManifestPath].sort();
  const repairArgs = (mode) => [
    '--kind',
    'runtime-config-delivery',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--repair-id',
    'fixture-rebind',
    ...(mode === 'repair-inspect' || mode === 'repair-plan'
      ? [
          '--source-beforeimages',
          sourceBeforeimagesPath,
          '--authorized-paths',
          JSON.stringify(authorizedPaths),
          '--prior-system-update',
          priorSystemUpdatePath,
        ]
      : []),
  ];
  return {
    f,
    request,
    state,
    deliveryArgs,
    repairArgs,
    sourceBeforeimagesPath,
    priorSystemUpdatePath,
    changedPath,
    sourceManifestPath,
    authorizedPaths,
    targetVersion: sourceCorrectionNextVersion(sourceCorrectionPriorVersion),
  };
}

function applySourceCorrectionBatch(f, changedPath, sourceManifestPath, targetVersion) {
  const manifestPath = path.join(f.root, sourceManifestPath),
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.version = targetVersion;
  f.put(sourceManifestPath, json(manifest));
  f.put(changedPath, readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// scoped source repair fixture\n');
}

async function sourceCorrectionRebindWithNative(runtime) {
  if (sourceCorrectionNativeRuntime.previousPath === undefined) {
    sourceCorrectionNativeRuntime.previousPath = process.env.PATH ?? '';
    process.env.PATH = [path.dirname(runtime.executable), sourceCorrectionNativeRuntime.previousPath]
      .filter(Boolean)
      .join(path.delimiter);
  }
  const bunPath = new URL('../bin/bun.mjs', import.meta.url).href;
  if (!sourceCorrectionNativeRuntime.mocked) {
    const original = await import(bunPath);
    mock.module(bunPath, () => ({
      ...original,
      standaloneRuntime: (env) => sourceCorrectionNativeRuntime.value ?? original.standaloneRuntime(env),
    }));
    sourceCorrectionNativeRuntime.mocked = true;
  }
  sourceCorrectionNativeRuntime.value = runtime;
  const modulePath = new URL('../bin/runtime-config-rebind.mjs', import.meta.url).href;
  return await import(`${modulePath}?source-correction-test=${randomUUID()}`);
}

function sourceCorrectionNativeFixture(
  f,
  version,
  executableBytes = Buffer.from('synthetic native executable for consistency test'),
) {
  const payloadId = sha(Buffer.from(randomUUID())),
    packageRelative = `.tmp/native-test/${version}-${payloadId}`,
    executableRelative = `${packageRelative}/vida-agent.exe`,
    executable = path.join(f.root, executableRelative),
    runtimeRoot = path.join(f.root, packageRelative);
  f.put(`${packageRelative}/package.json`, json({
    name: 'vida-agent',
    version,
    packageManager: 'bun@1.4.2',
    engines: { bun: '1.4.2' },
  }));
  f.put(`${packageRelative}/.bun-version`, '1.4.2\n');
  f.put(executableRelative, executableBytes);
  return {
    runtime: { root: runtimeRoot, executable },
    executableRelative,
    executableBytes,
    payloadId,
  };
}

function sourceCorrectionExternalReport(f, request, native) {
  const target = `bun-${process.platform.replace('win32', 'windows')}-${process.arch}`,
    asset = {
      file: `vida-agent-${target}${process.platform === 'win32' ? '.exe' : ''}`,
      bytes: native.executableBytes.length,
      sha256: sha(native.executableBytes),
    },
    manifest = {
      schema: 'VidaStandaloneBuild/v1',
      version: request.new_source_manifest.version,
      pin: '1.4.2',
      target,
      inputs: request.new_source.entries.map((entry) => ({
        path: entry.path.slice('packages/agent/'.length),
        bytes: entry.bytes,
        sha256: entry.sha256,
      })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0),
      payloadId: native.payloadId,
      asset,
    },
    manifestSha = sha(Buffer.from(json(manifest))),
    result = {
      schema: 'VidaCIDeliveryResult/v1',
      request_id: request.request_id,
      operation_id: request.publish_operation_id,
      version: manifest.version,
      repository_id: request.repository_id,
      project_ids: request.source_project_ids,
      target,
      source_binding: request.new_source.digest,
      archive_sha256: sha(Buffer.from('synthetic-source-archive')),
      manifest_sha256: manifestSha,
      payload_id: manifest.payloadId,
      asset,
      issuer: 'synthetic-test-only',
      run_id: '50000123456',
      run_attempt: 1,
      checks: [{ id: 'native-build', status: 'passed' }],
    },
    checks = [{ id: 'native-build', status: 'passed' }],
    executablePath = native.runtime.executable,
    sourcePath = native.executableRelative;
  const report = {
    schema: 'RuntimeConfigSourceCorrectionReport/v1',
    request_id: request.request_id,
    operation_id: request.operation_id,
    publish_operation_id: request.publish_operation_id,
    original_operation_sha256: request.original_operation.sha256,
    original_plan_digest: request.original_operation.plan_digest,
    source_snapshot_digest: request.new_source.digest,
    build_manifest_sha256: manifestSha,
    build_manifest: manifest,
    ci_delivery: {
      schema: 'RuntimeConfigSourceCorrectionCIDelivery/v1',
      profile: 'native-build',
      request_id: request.request_id,
      operation_id: request.publish_operation_id,
      source_binding: request.new_source.digest,
      run_id: result.run_id,
      run_attempt: result.run_attempt,
      artifact_id: '12001',
      result_sha256: sha(Buffer.from(json(result))),
      checks,
      conclusion: 'success',
      result,
    },
    installation_receipt: {
      installer: 'synthetic-test-only',
      action: 'update',
      exit_code: 0,
      signal: null,
      source_path: sourcePath,
      source_sha256: asset.sha256,
      prior_bytes: request.prior_system_update.installed_bytes,
      selected_bytes: native.executableBytes.length,
      path: executablePath,
      sha256: sha(native.executableBytes),
      path_added: false,
      tests_invoked: false,
      reinstallation: false,
    },
    effective_path: {
      command_path: executablePath,
      bytes: native.executableBytes.length,
      sha256: sha(native.executableBytes),
      package_name: 'vida-agent',
      version: manifest.version,
      target,
    },
  };
  return report;
}

async function prepareSourceCorrectionRepair(rebind, fixtureContext = sourceCorrectionFixture()) {
  const { f, deliveryArgs, repairArgs, changedPath } = fixtureContext,
    originalPlan = await rebind.runRuntimeConfigRebind(deliveryArgs('plan')),
    packageRoot = path.join(f.root, 'packages/agent'),
    inventory = runtimeExecutableInventory(packageRoot, 'source', requireSafeRepositoryAccess(packageRoot)),
    access = requireSafeRepositoryAccess(f.root),
    sourceSnapshot = snapshotDeclaredSources(access, inventory.map((file) => `packages/agent/${file}`)),
    priorUpdate = {
      status: 'CURRENT_SYSTEM_BOOKKEEPING_UNKNOWN_UPDATED',
      operation_id: 'local-46c2f01d-8541-46ce-8e31-30e467799538',
      version: sourceCorrectionPriorVersion,
      entry: path.join(tmpdir(), 'vida-agent.exe'),
      run_id: '37579199535',
      artifact_id: '11463399267',
      installed_bytes: 133342720,
      prior_bytes: 133338624,
      delta_bytes: 4096,
      configuration_inspection: 'inspect_ready_unauthorized',
      tests_invoked: false,
      reinstallation: false,
      runtime_accepted: false,
      developer_unblocked: false,
    };
  f.put('.tmp/prior-system-update.json', json(priorUpdate));
  expect((await rebind.runRuntimeConfigRebind(deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  const operationBytes = readFileSync(path.join(f.root, originalPlan.operation_path)),
    beforeimage = {
      purpose: 'inactive custody only; not an active repair artifact or admission',
      operation_id: 'fixture-rebind',
      operation_ref: originalPlan.operation_path,
      operation_bytes_base64: operationBytes.toString('base64'),
      source: sourceSnapshot,
      beforeimages: sourceSnapshot.entries.map((entry) => ({
        path: entry.path,
        bytes_base64: access.readBytes(entry.path, 'test beforeimage').toString('base64'),
      })),
      recorded_at: '2026-10-07T00:00:00.000Z',
      effects_issued: false,
    };
  f.put('.tmp/original-source-beforeimages.json', json(beforeimage));
  applySourceCorrectionBatch(f, changedPath, fixtureContext.sourceManifestPath, fixtureContext.targetVersion);
  expect((await rebind.runRuntimeConfigRebind([
    ...repairArgs('repair-plan'),
    ...(fixtureContext.publicationOperationId
      ? ['--publish-operation', fixtureContext.publicationOperationId]
      : []),
  ])).status).toBe('planned');
  return {
    f,
    deliveryArgs,
    repairArgs,
    changedPath,
    sourceManifestPath: fixtureContext.sourceManifestPath,
    authorizedPaths: fixtureContext.authorizedPaths,
    targetVersion: fixtureContext.targetVersion,
    sidecarPath: path.join(f.root, '.agent/work/fixture-rebind/runtime-config-source-correction-repair.v1.json'),
  };
}

test('public source repair freezes original beforeimages, prior update and held-fence scope without Host writes', async () => {
  const { f, deliveryArgs, repairArgs, changedPath, sourceManifestPath, authorizedPaths, targetVersion } =
    sourceCorrectionFixture();
  const originalPlan = await runReconcileArtifacts(deliveryArgs('plan')),
    packageRoot = path.join(f.root, 'packages/agent'),
    inventory = runtimeExecutableInventory(packageRoot, 'source', requireSafeRepositoryAccess(packageRoot)),
    access = requireSafeRepositoryAccess(f.root),
    source = snapshotDeclaredSources(access, inventory.map((file) => `packages/agent/${file}`)),
    priorUpdate = {
      status: 'CURRENT_SYSTEM_BOOKKEEPING_UNKNOWN_UPDATED',
      operation_id: 'local-46c2f01d-8541-46ce-8e31-30e467799538',
      version: sourceCorrectionPriorVersion,
      entry: path.join(tmpdir(), 'vida-agent.exe'),
      run_id: '37579199535',
      artifact_id: '11463399267',
      installed_bytes: 133342720,
      prior_bytes: 133338624,
      delta_bytes: 4096,
      configuration_inspection: 'inspect_ready_unauthorized',
      tests_invoked: false,
      reinstallation: false,
      runtime_accepted: false,
      developer_unblocked: false,
    };
  f.put('.tmp/prior-system-update.json', json(priorUpdate));
  expect((await runReconcileArtifacts(deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  const operationBytes = readFileSync(path.join(f.root, originalPlan.operation_path)),
    beforeimage = {
      purpose: 'inactive custody only; not an active repair artifact or admission',
      operation_id: 'fixture-rebind',
      operation_ref: originalPlan.operation_path,
      operation_bytes_base64: operationBytes.toString('base64'),
      source,
      beforeimages: source.entries.map((entry) => ({
        path: entry.path,
        bytes_base64: access.readBytes(entry.path, 'test beforeimage').toString('base64'),
      })),
      recorded_at: '2026-10-07T00:00:00.000Z',
      effects_issued: false,
    };
  f.put('.tmp/original-source-beforeimages.json', json(beforeimage));
  applySourceCorrectionBatch(f, changedPath, sourceManifestPath, priorUpdate.version);

  const sourceManifest = JSON.parse(readFileSync(path.join(f.root, sourceManifestPath), 'utf8'));
  f.put(sourceManifestPath, json({ ...sourceManifest, version: '0.0.0' }));
  const beforeStaleVersionInspect = databaseState(f);
  await expect(runReconcileArtifacts(repairArgs('repair-inspect'))).rejects.toThrow(/at or after the prior installed version/);
  expect(databaseState(f)).toEqual(beforeStaleVersionInspect);
  f.put(sourceManifestPath, json(sourceManifest));

  const beforeRepair = databaseState(f),
    inspected = await runReconcileArtifacts(repairArgs('repair-inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(inspected.authorized_changed_paths).toEqual(authorizedPaths);
  expect(databaseState(f)).toEqual(beforeRepair);

  const publishedOperation = priorUpdate.operation_id;
  const planned = await runReconcileArtifacts([
      ...repairArgs('repair-plan'), '--publish-operation', publishedOperation,
    ]),
    sidecar = JSON.parse(readFileSync(path.join(f.root, planned.sidecar_path), 'utf8'));
  expect(planned.status).toBe('planned');
  expect(sidecar.status).toBe('requested');
  expect(sidecar.request.source_beforeimages.path).toBe('.tmp/original-source-beforeimages.json');
  expect(sidecar.request.source_beforeimages.sha256).toBe(sha(Buffer.from(json(beforeimage))));
  expect(sidecar.request.source_beforeimages.snapshot_digest).toBe(sidecar.request.old_source.digest);
  expect(sidecar.request.prior_system_update.run_id).toBe(priorUpdate.run_id);
  expect(sidecar.request.prior_system_update.artifact_id).toBe(priorUpdate.artifact_id);
  expect(sidecar.request.authorized_changed_paths).toEqual(authorizedPaths);
  expect(sidecar.request.source_changes.map((change) => change.path)).toEqual(authorizedPaths);
  expect(sidecar.request.new_source_manifest.version).toBe(priorUpdate.version);
  expect(sidecar.request.publish_operation_id).not.toBe(sidecar.request.operation_id);
  expect(sidecar.request.publish_operation_id).toBe(sidecar.request.prior_system_update.operation_id);
  expect(sidecar.request.publish_operation_id).toBe(publishedOperation);
  const frozenSidecarBytes = readFileSync(path.join(f.root, planned.sidecar_path));
  expect((await runReconcileArtifacts(repairArgs('repair-plan'))).request_id).toBe(planned.request_id);
  expect((await runReconcileArtifacts([
    ...repairArgs('repair-plan'), '--publish-operation', publishedOperation,
  ])).request_id).toBe(planned.request_id);
  await expect(runReconcileArtifacts([
    ...repairArgs('repair-plan'), '--publish-operation', 'local-different-publication',
  ])).rejects.toThrow(/repair inputs differ/);
  await expect(runReconcileArtifacts([
    ...repairArgs('repair-inspect'), '--publish-operation', '../invalid-operation',
  ])).rejects.toThrow(/published operation identity is invalid/);
  expect(readFileSync(path.join(f.root, planned.sidecar_path))).toEqual(frozenSidecarBytes);
  expect(sidecar.request.new_source.digest).not.toBe(sidecar.request.old_source.digest);
  expect(databaseState(f)).toEqual(beforeRepair);

  expect((await runReconcileArtifacts(repairArgs('repair-resume'))).status).toBe('repair_apply_required');
  await expect(runReconcileArtifacts(deliveryArgs('resume'))).rejects.toThrow('source correction is not applied');
  expect(databaseState(f)).toEqual(beforeRepair);
}, 30000);

test('source correction withdrawal archives the exact request, accepts Source drift and confirms exact retry', async () => {
  const fixtureContext = sourceCorrectionFixture(),
    prepared = await prepareSourceCorrectionRepair(
      { runRuntimeConfigRebind: runReconcileArtifacts },
      fixtureContext,
    ),
    { f, repairArgs, changedPath, sidecarPath } = prepared,
    sidecarBytes = readFileSync(sidecarPath),
    request = JSON.parse(sidecarBytes.toString('utf8')).request,
    operationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'),
    historyPath = path.join(
      f.root,
      `.agent/work/fixture-rebind/source-correction-request-history/${request.request_id}.json`,
    ),
    baseline = {
      host: databaseState(f),
      operation: readFileSync(operationPath),
      receipt: readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')),
      yaml: readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml')),
      beforeimages: readFileSync(fixtureContext.sourceBeforeimagesPath),
      priorUpdate: readFileSync(fixtureContext.priorSystemUpdatePath),
      fence: fence(f),
    },
    withdrawArgs = (expectedRequest) => [
      ...repairArgs('repair-withdraw'),
      '--expected-request',
      expectedRequest,
    ];
  await expect(runReconcileArtifacts(withdrawArgs(randomUUID()))).rejects.toThrow(
    'source correction request does not bind the original fenced delivery operation',
  );
  expect(readFileSync(sidecarPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(existsSync(historyPath)).toBe(false);

  f.put(changedPath, readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// Source changed after the request was frozen.\n');
  const driftedSource = readFileSync(path.join(f.root, changedPath)),
    withdrawn = await runReconcileArtifacts(withdrawArgs(request.request_id));
  expect(withdrawn).toMatchObject({
    status: 'withdrawn',
    operation_id: 'fixture-rebind',
    request_id: request.request_id,
    history_path: `.agent/work/fixture-rebind/source-correction-request-history/${request.request_id}.json`,
    writes_host_state: false,
  });
  expect(existsSync(sidecarPath)).toBe(false);
  expect(readFileSync(historyPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(readFileSync(operationPath)).toEqual(baseline.operation);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'))).toEqual(baseline.receipt);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(baseline.yaml);
  expect(readFileSync(fixtureContext.sourceBeforeimagesPath)).toEqual(baseline.beforeimages);
  expect(readFileSync(fixtureContext.priorSystemUpdatePath)).toEqual(baseline.priorUpdate);
  expect(fence(f)).toEqual(baseline.fence);
  expect(readFileSync(path.join(f.root, changedPath))).toEqual(driftedSource);

  expect(await runReconcileArtifacts(withdrawArgs(request.request_id))).toEqual(withdrawn);
  expect(readFileSync(historyPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(readFileSync(operationPath)).toEqual(baseline.operation);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'))).toEqual(baseline.receipt);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(baseline.yaml);
  expect(readFileSync(path.join(f.root, changedPath))).toEqual(driftedSource);
}, 30000);

test('source correction streams inert native assets above the generic read cap and rejects size, digest and hardlink changes', async () => {
  const fixtureContext = sourceCorrectionFixture(),
    largeAsset = Buffer.alloc(64 * 1024 * 1024 + 1, 0x5a),
    native = sourceCorrectionNativeFixture(fixtureContext.f, fixtureContext.targetVersion, largeAsset),
    rebind = await sourceCorrectionRebindWithNative(native.runtime),
    prepared = await prepareSourceCorrectionRepair(rebind, fixtureContext),
    { f, repairArgs, sidecarPath } = prepared,
    sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8')),
    report = sourceCorrectionExternalReport(f, sidecar.request, native),
    sourcePath = report.installation_receipt.source_path,
    sourceAbsolute = path.join(f.root, sourcePath),
    sourceDirectory = path.dirname(sourceAbsolute),
    copiedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-copy.exe')).split(path.sep).join('/'),
    mismatchedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-mismatch.exe')).split(path.sep).join('/'),
    linkedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-hardlink.exe')).split(path.sep).join('/'),
    shortPath = path.relative(f.root, path.join(sourceDirectory, 'asset-short.exe')).split(path.sep).join('/'),
    reportPath = path.join(f.root, '.tmp/source-correction-report.json'),
    applyArgs = [...repairArgs('repair-apply'), '--report', reportPath];
  copyFileSync(sourceAbsolute, path.join(f.root, copiedPath));
  copyFileSync(sourceAbsolute, path.join(f.root, mismatchedPath));
  writeFileSync(path.join(f.root, mismatchedPath), Buffer.from([largeAsset[0] ^ 0xff]), { flag: 'r+' });
  linkSync(path.join(f.root, copiedPath), path.join(f.root, linkedPath));
  f.put(shortPath, Buffer.from([1, 2, 3]));
  const before = databaseState(f),
    denyAssetPath = async (pathValue) => {
      const candidate = structuredClone(report);
      candidate.installation_receipt.source_path = pathValue;
      f.put('.tmp/source-correction-report.json', json(candidate));
      await expect(runReconcileArtifacts(applyArgs)).rejects.toThrow();
      expect(databaseState(f)).toEqual(before);
      expect(JSON.parse(readFileSync(sidecarPath, 'utf8')).status).toBe('requested');
    };
  await denyAssetPath(linkedPath);
  await denyAssetPath(shortPath);
  await denyAssetPath(mismatchedPath);
  f.put('.tmp/source-correction-report.json', json(report));
  expect((await runReconcileArtifacts(applyArgs)).status).toBe('applied');
  expect(databaseState(f)).toEqual(before);
}, 60000);

test('source repair captures a closed config transition and reads it after later owner CAS progress', async () => {
  const fixtureContext = Object.assign(sourceCorrectionFixture(), {
      targetVersion: sourceCorrectionPriorVersion,
      publicationOperationId: 'local-46c2f01d-8541-46ce-8e31-30e467799538',
    }),
    native = sourceCorrectionNativeFixture(fixtureContext.f, fixtureContext.targetVersion),
    rebind = await sourceCorrectionRebindWithNative(native.runtime),
    { f, deliveryArgs, repairArgs, changedPath, sidecarPath } = await prepareSourceCorrectionRepair(rebind, fixtureContext),
    run = (args, options) => fixtureCall(rebind.runRuntimeConfigRebind, args, options),
    sidecar = JSON.parse(readFileSync(sidecarPath, 'utf8')),
    reportPath = path.join(f.root, '.tmp/source-correction-report.json');
  const report = sourceCorrectionExternalReport(f, sidecar.request, native),
    staleVersionReport = structuredClone(report);
  staleVersionReport.build_manifest.version = '0.0.0';
  f.put('.tmp/source-correction-report.json', json(staleVersionReport));
  const applyArgs = [...repairArgs('repair-apply'), '--report', reportPath],
    beforeApply = databaseState(f),
    reusedOperationIdReport = structuredClone(report);
  reusedOperationIdReport.publish_operation_id = sidecar.request.operation_id;
  f.put('.tmp/source-correction-report.json', json(reusedOperationIdReport));
  await expect(run(applyArgs)).rejects.toThrow('source correction report does not bind the current package-native build and CI result');
  expect(databaseState(f)).toEqual(beforeApply);
  expect(JSON.parse(readFileSync(sidecarPath, 'utf8')).status).toBe('requested');
  f.put('.tmp/source-correction-report.json', json(staleVersionReport));
  await expect(run(applyArgs)).rejects.toThrow('source correction report does not bind the current package-native build and CI result');
  expect(databaseState(f)).toEqual(beforeApply);
  expect(JSON.parse(readFileSync(sidecarPath, 'utf8')).status).toBe('requested');
  for (const field of ['run_id', 'artifact_id']) {
    const staleCIReport = structuredClone(report);
    staleCIReport.ci_delivery[field] = sidecar.request.prior_system_update[field];
    if (field === 'run_id') staleCIReport.ci_delivery.result.run_id = staleCIReport.ci_delivery.run_id;
    f.put('.tmp/source-correction-report.json', json(staleCIReport));
    await expect(run(applyArgs)).rejects.toThrow('source correction report does not bind the current package-native build and CI result');
    expect(databaseState(f)).toEqual(beforeApply);
  }
  f.put('.tmp/source-correction-report.json', json(report));
  await expect(
    run(applyArgs, { onPhase: (phase) => { if (phase === 'applied') throw new Error('lost repair apply acknowledgement'); } }),
  ).rejects.toThrow('lost repair apply acknowledgement');
  expect(databaseState(f)).toEqual(beforeApply);
  expect(JSON.parse(readFileSync(sidecarPath, 'utf8')).status).toBe('applied');
  expect((await run(applyArgs)).status).toBe('applied');
  expect((await run(repairArgs('repair-resume'))).status).toBe('applied');
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8')))
    .toMatchObject({ revision: 2, phase: 'fenced', maintenance_released: false });
  const heldFence = fence(f),
    fencedOperation = JSON.parse(readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8')),
    plan = fencedOperation.plan;
  expect(heldFence?.status).toBe('held');
  expect(heldFence?.binding).toEqual({
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: plan.project_ids,
    operation_id: plan.operation_id,
    manifest_digest: fencedOperation.plan_digest,
    request_digest: fencedOperation.plan_digest,
    bindings_digest: canonicalJsonDigest({ selector: plan.selector_digest, state: plan.state_digest }),
    closure_digest: canonicalJsonDigest({ old_receipt: plan.baseline_receipt, target: plan.target_config_digest }),
    bundle_digest: plan.bundle_digest,
  });

  await expect(
    run(deliveryArgs('resume'), {
      onPhase: (phase) => { if (phase === 'transition_captured') throw new Error('lost transition acknowledgement'); },
    }),
  ).rejects.toThrow('lost transition acknowledgement');
  const completedOperation = JSON.parse(
      readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8'),
    ),
    completedSidecar = JSON.parse(readFileSync(sidecarPath, 'utf8')),
    completedReceiptBytes = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
  expect(completedOperation).toMatchObject({ revision: 4, phase: 'applied', maintenance_released: true });
  expect(completedSidecar).toMatchObject({ status: 'applied', revision: 3 });
  expect(completedSidecar.completion).toMatchObject({
    schema: 'RuntimeConfigDeliveryTransition/v1',
    operation_sha256: sha(readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'))),
    receipt_sha256: sha(completedReceiptBytes),
    runtime_accepted: false,
  });
  const appliedSidecarBytes = readFileSync(sidecarPath),
    beforeAppliedWithdrawal = databaseState(f),
    appliedHistoryPath = path.join(
      f.root,
      `.agent/work/fixture-rebind/source-correction-request-history/${completedSidecar.request.request_id}.json`,
    );
  await expect(
    run([
      ...repairArgs('repair-withdraw'),
      '--expected-request',
      completedSidecar.request.request_id,
    ]),
  ).rejects.toThrow('only an unapplied source correction request can be withdrawn');
  expect(readFileSync(sidecarPath)).toEqual(appliedSidecarBytes);
  expect(existsSync(appliedHistoryPath)).toBe(false);
  expect(databaseState(f)).toEqual(beforeAppliedWithdrawal);
  const initialProof = await run(repairArgs('repair-transition'));
  expect(initialProof.status).toBe('closed_config_transition_proven');
  expect(initialProof.baseline_config_digest).toBe(plan.old_config_digest);
  expect(initialProof.caller_owner_cas_required).toBe(true);
  expect(initialProof.runtime_accepted).toBe(false);
  expect(initialProof.writes_host_state).toBe(false);

  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace),
      before = store.readHostStateSnapshot(fixtureContext.request.identity),
      nextWork = structuredClone(before.work),
      nextLedger = structuredClone(before.ledger);
    nextWork.revision += 1;
    nextWork.lifecycle.revision += 1;
    nextLedger.revision += 1;
    store.compareAndSwapHostState({
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      nextWork,
      nextLedger,
    });
  });
  const afterFreshOwnerCas = await run(repairArgs('repair-transition'));
  expect(afterFreshOwnerCas.transition_digest).toBe(initialProof.transition_digest);

  f.put('.agent/runtime-initialization.v1.json', json({
    ...JSON.parse(completedReceiptBytes.toString('utf8')),
    config_digest: sha(Buffer.from('foreign postimage')),
  }));
  await expect(run(repairArgs('repair-transition'))).rejects.toThrow('closed source delivery configuration');
  f.put('.agent/runtime-initialization.v1.json', completedReceiptBytes);
  f.put(changedPath, readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// post-delivery Source drift\n');
  await expect(run(repairArgs('repair-transition'))).rejects.toThrow('closed source delivery current Source differs');
}, 60000);

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

function seedManyReadonlyWorks(f, count) {
  const { work: base } = seedState(f);
  return withDatabase(f, (db) => {
    const insert = db.query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)');
    const identities = [];
    db.transaction(() => {
      for (let index = 0; index < count; index++) {
        const work = structuredClone(base);
        const workId = `readonly-work-${index}`;
        const scopeId = `readonly-scope-${index}`;
        work.binding.lifecycle_work_id = workId;
        work.binding.provider_work_item_id = `readonly-provider-item-${index}`;
        work.binding.scope_id = scopeId;
        work.lifecycle.scope.scope_id = scopeId;
        work.execution.run_id = `readonly-run-${index}`;
        const identity = {
          repository_id: work.binding.repository_id,
          project_ids: work.binding.project_ids,
          integrations_digest: work.binding.integrations_digest,
          work_id: workId,
        };
        const key = JSON.stringify([
          identity.repository_id,
          identity.project_ids,
          identity.integrations_digest,
          identity.work_id,
        ]);
        const payload = json(work);
        insert.run(f.workspace, 'work', key, work.revision, payload, canonicalJsonDigest(work));
        identities.push(identity);
      }
    })();
    const workspace = new HostStateStore(db, f.workspace).readWorkspaceSnapshot();
    expect(workspace.work).toHaveLength(count + 1);
    expect(
      workspace.work.every(
        ({ work }) => work.lease === null && work.execution.assignment_attempts.length === 0,
      ),
    ).toBe(true);
    const rows = db
      .query("SELECT * FROM agent_host_state WHERE workspace_id=? ORDER BY payload")
      .all(f.workspace);
    const priorAggregate = {
      host: rows.map((row) => ({ ...row, value: JSON.parse(row.payload) })),
      mastra: [],
      governance: [],
      frozen: [],
    };
    expect(jsonNodeCount(priorAggregate)).toBeGreaterThan(10_000);
    return identities;
  });
}

test('compact config binding handles over ten thousand readonly row nodes and rejects raw-payload-only plan drift', async () => {
  const f = fixture({ sourceMode: true });
  const identities = seedManyReadonlyWorks(f, 128);
  const config = loadRuntimeConfig(f.root);
  const originalDigest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(originalDigest).toMatch(/^[a-f0-9]{64}$/);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  const beforeDrift = databaseState(f);
  const changedRow = withDatabase(f, (db) => {
    const row = db
      .query("SELECT * FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
      .get(f.workspace, JSON.stringify([
        identities[0].repository_id,
        identities[0].project_ids,
        identities[0].integrations_digest,
        identities[0].work_id,
      ]));
    const payload = row.payload + '\n';
    expect(JSON.parse(payload)).toEqual(JSON.parse(row.payload));
    expect(
      db
        .query('UPDATE agent_host_state SET payload=? WHERE workspace_id=? AND kind=? AND id=?')
        .run(payload, f.workspace, 'work', row.id).changes,
    ).toBe(1);
    return { ...row, payload };
  });
  expect(changedRow.digest).toBe(beforeDrift.agent_host_state.find((row) => row.id === changedRow.id).digest);
  const driftDigest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(driftDigest).not.toBe(originalDigest);
  const driftedState = databaseState(f);
  await expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(
    /current selector\/schema\/global state differs from plan/,
  );
  expect(databaseState(f)).toEqual(driftedState);
  expect(fence(f)).toBeNull();
});

test('compact config binding includes row metadata and retains per-row digest denial', async () => {
  const metadataFixture = fixture({ sourceMode: true });
  seedState(metadataFixture);
  const metadataConfig = loadRuntimeConfig(metadataFixture.root);
  const metadataDigest = withDatabase(metadataFixture, (db) =>
    currentState(db, metadataFixture.workspace, metadataFixture.root, metadataConfig),
  );
  await runReconcileArtifacts(metadataFixture.args('plan'));
  withDatabase(metadataFixture, (db) => {
    db.query("UPDATE agent_host_state SET revision=revision+1 WHERE workspace_id=? AND kind='work'").run(
      metadataFixture.workspace,
    );
  });
  const metadataDriftDigest = withDatabase(metadataFixture, (db) =>
    currentState(db, metadataFixture.workspace, metadataFixture.root, metadataConfig),
  );
  expect(metadataDriftDigest).not.toBe(metadataDigest);
  const metadataDrift = databaseState(metadataFixture);
  await expect(runReconcileArtifacts(metadataFixture.args('apply'))).rejects.toThrow(
    /current selector\/schema\/global state differs from plan/,
  );
  expect(databaseState(metadataFixture)).toEqual(metadataDrift);
  expect(fence(metadataFixture)).toBeNull();

  const digestFixture = fixture({ sourceMode: true });
  seedState(digestFixture);
  await runReconcileArtifacts(digestFixture.args('plan'));
  withDatabase(digestFixture, (db) => {
    db.query("UPDATE agent_host_state SET digest=? WHERE workspace_id=? AND kind='work'").run(
      '0'.repeat(64),
      digestFixture.workspace,
    );
  });
  const digestDrift = databaseState(digestFixture);
  await expect(runReconcileArtifacts(digestFixture.args('apply'))).rejects.toThrow(
    /agent_host_state row integrity differs/,
  );
  expect(databaseState(digestFixture)).toEqual(digestDrift);
  expect(fence(digestFixture)).toBeNull();
});

test('compact config binding rejects malformed UTF-8 payload bytes with unchanged decoded text', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root);
  withDatabase(f, (db) => {
    const row = db.query("SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'").get(
        f.workspace,
      ),
      work = JSON.parse(row.payload),
      replacement = String.fromCharCode(0xfffd);
    work.lifecycle.next_action = `Trace ${replacement} the accepted work request.`;
    const payload = json(work),
      validBytes = Buffer.from(payload, 'utf8'),
      replacementBytes = Buffer.from(replacement, 'utf8'),
      replacementIndex = validBytes.indexOf(replacementBytes);
    expect(replacementIndex).toBeGreaterThanOrEqual(0);
    const malformedBytes = Buffer.concat([
      validBytes.subarray(0, replacementIndex),
      Buffer.from([0xff]),
      validBytes.subarray(replacementIndex + replacementBytes.length),
    ]);
    expect(malformedBytes.toString('utf8')).toBe(payload);
    db.query('UPDATE agent_host_state SET payload=CAST(? AS TEXT),digest=? WHERE rowid=?').run(
      malformedBytes,
      canonicalJsonDigest(work),
      row.rowid,
    );
    const stored = db
      .query('SELECT payload,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_state WHERE rowid=?')
      .get(row.rowid);
    expect(stored.payload).toBe(payload);
    expect(Buffer.from(stored.raw_payload_bytes)).toEqual(malformedBytes);
    expect(Buffer.from(stored.payload, 'utf8')).not.toEqual(malformedBytes);
  });
  const before = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/payload UTF-8 is invalid/),
  );
  expect(databaseState(f)).toEqual(before);
});

test('compact config binding accepts a row just below the canonical byte budget', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root);
  withDatabase(f, (db) => {
    const row = db.query("SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'").get(
        f.workspace,
      ),
      work = JSON.parse(row.payload);
    work.lifecycle.next_action = '';
    const targetBytes = MAX_CANONICAL_BYTES - 1024,
      baseBytes = Buffer.byteLength(json(work), 'utf8');
    work.lifecycle.next_action = 'x'.repeat(targetBytes - baseBytes);
    const payload = json(work),
      payloadBytes = Buffer.byteLength(payload, 'utf8');
    expect(payloadBytes).toBeGreaterThan(MAX_CANONICAL_BYTES - 2048);
    expect(payloadBytes).toBeLessThanOrEqual(MAX_CANONICAL_BYTES);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(work),
      row.rowid,
    );
  });
  const digest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
});

test('compact config binding rejects an oversized row before fetching its payload', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root),
    observedQueries = [];
  withDatabase(f, (db) => {
    const row = db.query("SELECT rowid FROM agent_host_state WHERE workspace_id=? AND kind='work'").get(f.workspace);
    db.query('UPDATE agent_host_state SET payload=zeroblob(?) WHERE rowid=?').run(
      MAX_CANONICAL_BYTES + 1,
      row.rowid,
    );
    const observedDatabase = {
      get inTransaction() {
        return db.inTransaction;
      },
      query(sql) {
        observedQueries.push(sql);
        return db.query(sql);
      },
      transaction(callback) {
        return db.transaction(callback);
      },
    };
    expect(() => currentState(observedDatabase, f.workspace, f.root, config)).toThrow(
      /row payload exceeds canonical byte budget/,
    );
    expect(observedQueries.some((sql) => sql.includes('SELECT *, CAST(payload AS BLOB)'))).toBe(false);
  });
});

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
    const expectedDenial = ['source bytes', 'inventory addition'].includes(change)
      ? 'vida runtime-config rebind: Source drift requires the applied same-operation source correction under its original fence'
      : /differs|differ|rejects an active selector/;
    await expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(expectedDenial);
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

test('prewriter template adoption preserves a multi-project registry and rejects unrelated changes', async () => {
  const f = fixture({ sourceMode: true, extraProject: true });
  const target = parseRuntimeConfigYaml(f.oldYaml);
  const baseline = withoutPrewriterTemplateDelta(target);
  f.put('agent-runtime.config.v1.yaml', json(baseline));
  f.put('.agent/runtime-initialization.v1.json', json({ ...f.receipt, config_digest: runtimeConfigDigest(baseline) }));
  f.put('proposed.yaml', json(target));
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  for (const mutate of [
    (value) => {
      value.projects[1].title = 'foreign project change';
    },
    (value) => {
      value.projects.pop();
    },
    (value) => {
      value.agents.profiles.architect.reasoning = 'low';
    },
  ]) {
    const changed = structuredClone(target);
    mutate(changed);
    f.put('proposed.yaml', json(changed));
    await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow();
    expect(databaseState(f)).toEqual(before);
  }
  f.put('proposed.yaml', json(target));
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(target));
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const adopted = loadRuntimeConfig(f.root);
  expect(adopted.projects).toEqual(baseline.projects);
  expect(adopted.integrations).toEqual(baseline.integrations);
  for (const id of ['implementation_new', 'implementation_change', 'bug_fix', 'task_execution'])
    expect(adopted.workflows[id].stages.some((stage) => stage.id === 'review_source_prewrite')).toBe(true);
}, 120_000);

test('a new normal config operation adopts only the approved prewriter delta after delivery closes', async () => {
  const f = deliveryFixture(),
    baseline = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.oldYaml)),
    deliveryTarget = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.target)),
    prewriterTarget = parseRuntimeConfigYaml(f.target),
    receipt = JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8')),
    deliveryOperationPath = path.join(
      f.root,
      '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json',
    );
  f.put('accepted-baseline.yaml', json(baseline));
  f.put('agent-runtime.config.v1.yaml', json(deliveryTarget));
  f.put('.agent/runtime-initialization.v1.json', json({ ...receipt, config_digest: runtimeConfigDigest(baseline) }));

  expect((await runReconcileArtifacts(f.deliveryArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
  const frozenDeliveryOperation = readFileSync(deliveryOperationPath),
    frozenDeliveryValue = JSON.parse(frozenDeliveryOperation.toString('utf8')),
    normalOperationPath = path.join(
      f.root,
      '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json',
    ),
    normalArgs = (mode) => {
      const args = f.args(mode);
      const instructionRefIndex = args.indexOf('--instruction-ref');
      if (instructionRefIndex >= 0)
        args[instructionRefIndex + 1] =
          'TEST SETUP: adopt approved prewriter workflow template after prior delivery closure';
      return args;
    },
    beforeRejectedTarget = databaseState(f),
    authoredBaseline = readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'));
  expect(frozenDeliveryValue.phase).toBe('applied');
  expect(frozenDeliveryValue.maintenance_released).toBe(true);

  const unrelatedTarget = structuredClone(prewriterTarget);
  unrelatedTarget.agents.profiles.architect.reasoning = 'high';
  f.put('proposed.yaml', json(unrelatedTarget));
  await expect(runReconcileArtifacts(normalArgs('inspect'))).rejects.toThrow(
    /approved prewriter workflow template delta/,
  );
  expect(databaseState(f)).toEqual(beforeRejectedTarget);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(authoredBaseline);
  expect(readFileSync(deliveryOperationPath)).toEqual(frozenDeliveryOperation);
  expect(existsSync(normalOperationPath)).toBe(false);

  f.put('proposed.yaml', json(prewriterTarget));
  expect((await runReconcileArtifacts(normalArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(normalArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(normalArgs('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(prewriterTarget));
  expect((await runReconcileArtifacts(normalArgs('resume'))).status).toBe('applied');

  const adopted = loadRuntimeConfig(f.root),
    completedNormalOperation = JSON.parse(readFileSync(normalOperationPath, 'utf8'));
  for (const role of ['source-planner', 'security-prewriter']) {
    expect(adopted.agents.role_instructions[role]).toEqual(prewriterTarget.agents.role_instructions[role]);
    expect(adopted.teams['default-development'].roles[role]).toBe(
      prewriterTarget.teams['default-development'].roles[role],
    );
  }
  expect(adopted.artifact_contracts['LifecyclePreparationObservation/v1'].required_fields).toEqual([
    'schema',
    'record_id',
    'kind',
    'work_id',
    'attempt',
    'source_revision',
    'scope_id',
    'config_digest',
    'ac_ids',
    'observed_at',
    'observer_id',
    'status',
    'evidence_refs',
    'observations',
    'gaps',
  ]);
  for (const [workflowId, developerId] of [
    ['implementation_new', 'develop_change'],
    ['implementation_change', 'develop_change'],
    ['bug_fix', 'develop_fix'],
    ['task_execution', 'develop_task'],
  ]) {
    const workflow = adopted.workflows[workflowId],
      review = workflow.stages.find((stage) => stage.id === 'review_source_prewrite');
    expect(review).toEqual(
      prewriterTarget.workflows[workflowId].stages.find((stage) => stage.id === 'review_source_prewrite'),
    );
    expect(review.required_after).toEqual(['synthesize_task']);
    expect(workflow.stages.find((stage) => stage.id === developerId).required_after).toEqual([
      'review_source_prewrite',
    ]);
  }
  expect(completedNormalOperation.schema).toBe('ConfigRebindOperation/v1');
  expect(completedNormalOperation.phase).toBe('applied');
  expect(completedNormalOperation.maintenance_released).toBe(true);
  expect(readFileSync(deliveryOperationPath)).toEqual(frozenDeliveryOperation);
  expect(JSON.parse(readFileSync(deliveryOperationPath, 'utf8'))).toEqual(frozenDeliveryValue);
}, 120_000);

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
    const expectedDenial =
      change === 'source bytes'
        ? 'vida runtime-config rebind: Source drift requires the applied same-operation source correction under its original fence'
        : /differs|differ|rejects an active selector/;
    await expect(runReconcileArtifacts(f.args('resume'))).rejects.toThrow(expectedDenial);
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
  { configuredContext = false, markerlessExcerpt = false, aggregateContext = false, officialDocs = false } = {},
) {
  const f = fixture({ sourceMode: true });
  const extraContextIds = aggregateContext ? ['aggregate-context-one', 'aggregate-context-two'] : [];
  if (predicate === 'unknown_readonly' && !officialDocs) {
    f.oldYaml = f.oldYaml.replace(/(    researcher:[\s\S]*?      egress_policy:) official_docs/, '$1 none');
    f.target = f.oldYaml.replace(
      /(    executor:\r?\n      model: )gpt-6-sol(\r?\n      reasoning: )high/,
      '$1gpt-6-luna$2max',
    );
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.receipt.config_digest = runtimeConfigDigest(loadRuntimeConfig(f.root));
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
  }
  if (predicate === 'settled_writer_failed_validators') {
    const legacyConfig = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.oldYaml)),
      legacyTarget = structuredClone(legacyConfig);
    legacyTarget.agents.profiles.executor.model = 'gpt-6-luna';
    legacyTarget.agents.profiles.executor.reasoning = 'max';
    f.oldYaml = stringifyYaml(legacyConfig);
    f.target = stringifyYaml(legacyTarget);
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.receipt.config_digest = runtimeConfigDigest(legacyConfig);
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
  if (predicate === 'terminal_synthesis_unaccepted') {
    const twoResearchAssignments = `          - role: requirements-researcher\n            profile: researcher\n            contour: requirements\n          - role: documentation-researcher\n            profile: web-researcher\n            contour: documentation\n`,
      twoPredecessorWorkflow = f.oldYaml.replace(
        /(^  implementation_new:\r?\n[\s\S]*?^        assignments:\r?\n)[\s\S]*?(?=^        consumes:)/m,
        `$1${twoResearchAssignments}`,
      );
    expect(twoPredecessorWorkflow).not.toBe(f.oldYaml);
    f.oldYaml = twoPredecessorWorkflow;
    f.target = twoPredecessorWorkflow.replace(
      /(    executor:\r?\n      model: )[^\r\n]+(\r?\n      reasoning: )[^\r\n]+/,
      '$1gpt-6-luna$2max',
    );
    expect(f.target).not.toBe(twoPredecessorWorkflow);
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.receipt.config_digest = runtimeConfigDigest(loadRuntimeConfig(f.root));
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
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
    workflow = ['settled_research', 'readonly_bookkeeping'].includes(predicate)
      ? 'information_research_light'
      : predicate === 'terminal_synthesis_unaccepted'
        ? 'implementation_new'
        : 'task_execution';
  const runId = sessionBridgeRunId(f.workspace, context, workflow),
    selection = {
      team: 'default-development',
      kind: ['settled_research', 'readonly_bookkeeping'].includes(predicate) ? 'research' : 'task',
      intent: ['settled_research', 'readonly_bookkeeping'].includes(predicate)
        ? 'information_research'
        : 'task_execution',
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
  for (
    let waveIndex = 0;
    waveIndex <
    (predicate === 'settled_writer_failed_validators' ? 3 : predicate === 'terminal_synthesis_unaccepted' ? 2 : 1);
    waveIndex++
  ) {
    const frontier =
      waveIndex ===
      (predicate === 'settled_writer_failed_validators' ? 2 : predicate === 'terminal_synthesis_unaccepted' ? 1 : 0);
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
          (['unknown_readonly', 'unissued_prepared'].includes(predicate) ||
            predicate === 'terminal_synthesis_unaccepted') &&
          frontier
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
      if (predicate === 'settled_writer_failed_validators' && waveIndex === 1)
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
    schema:
      predicate === 'readonly_bookkeeping'
        ? 'ReadonlyBookkeepingOwnerReleaseRequest/v1'
        : predicate === 'settled_research'
          ? 'SettledResearchOwnerReleaseRequest/v1'
          : predicate === 'unissued_prepared'
            ? 'UnissuedOwnerReleaseRequest/v1'
            : 'HistoricalOwnerReleaseRequest/v1',
    identity,
    attempt: 1,
    userRequestPointer: 'fixture:human-owner-release',
    requestIntent: 'linked_correction',
    predicate,
    ...(predicate === 'settled_writer_failed_validators' ? { preimage_ref: 'original-scope.json' } : {}),
  };
  f.put('release.json', json(request));
  const args = (mode) => [
    predicate === 'readonly_bookkeeping'
      ? '--release-readonly-bookkeeping-owner'
      : predicate === 'settled_research'
        ? '--release-settled-research-owner'
        : predicate === 'unissued_prepared'
          ? '--release-unissued-owner'
          : '--release-historical-owner',
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

test('historical owner inspection preserves the default when context history is omitted and denies an empty export', () => {
  const { f, request } = historicalFixture('unknown_readonly'),
    before = databaseState(f),
    engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  expect(() =>
    inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt, undefined),
  ).not.toThrow();
  expect(() => inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt, [])).toThrow(
    /original context collection must be a nonempty array/,
  );
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);
});

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
    before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const legacy = { ...request, schema: 'HistoricalOwnerReleaseRequest/v1', predicate: 'completed_readonly' };
  f.put('release.json', json(legacy));
  const oldArgs = args('inspect');
  oldArgs[0] = '--release-historical-owner';
  await expect(run(oldArgs)).rejects.toThrow('completed readonly');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(request));
  const wrongOwner = args('inspect');
  wrongOwner[7] = 'foreign-owner';
  await expect(run(wrongOwner)).rejects.toThrow('original owner differs');
  const inspected = await run(args('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  const after = databaseState(f),
    work = JSON.parse(after.agent_host_state.find((row) => row.kind === 'work').payload);
  expect(work.lease).toBeNull();
  expect(work.execution.status).toBe('suspended');
  expect(work.lifecycle.next_action).toContain('unissued frontier remains inert');
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(engine)).toBe(true);
  expect(state.items.every((item) => item.issue_id === null && item.observation === null)).toBe(true);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public historical context history uses retained context after mutable documentation changes', async () => {
  const { f, args, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  f.put(
    'retained-run.json',
    json({
      schema: 'VidaAgentRunResult/v1',
      next_actions: configuredContexts.map((context) => ({ configured_context: context })),
    }),
  );
  f.put(fixtureContextPath, 'Current changed documentation');
  const before = databaseState(f);
  await expect(run(args('inspect'))).rejects.toThrow('original configured requests differ');
  const withHistory = (mode) => [...args(mode), '--context-history', 'retained-run.json'];
  const foreign = structuredClone(configuredContexts[0]);
  foreign.work_id = 'foreign-work';
  f.put(
    'retained-run.json',
    json({ schema: 'VidaAgentRunResult/v1', next_actions: [{ configured_context: foreign }] }),
  );
  await expect(run(withHistory('inspect'))).rejects.toThrow('identity invalid');
  expect(databaseState(f)).toEqual(before);
  f.put(
    'retained-run.json',
    json({
      schema: 'VidaAgentRunResult/v1',
      next_actions: configuredContexts.map((context) => ({ configured_context: context })),
    }),
  );
  const inspected = await run(withHistory('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  expect((await run(withHistory('apply'))).status).toBe('historical_owner_released');
  expect((await run(withHistory('apply'))).rights_granted).toBe(false);
}, 30000);

test('public unissued owner release rejects an issued frontier without disposing its lease', async () => {
  const { f, args, request } = historicalFixture('unknown_readonly'),
    before = databaseState(f);
  f.put('release.json', json({ ...request, schema: 'UnissuedOwnerReleaseRequest/v1', predicate: 'unissued_prepared' }));
  const signal = args('inspect');
  signal[0] = '--release-unissued-owner';
  await expect(run(signal)).rejects.toThrow('issued or reserved activity');
  expect(databaseState(f)).toEqual(before);
});

test('historical owner release rejects maintenance drift between predicate and write preparation', () => {
  const { f, request } = historicalFixture('unissued_prepared'),
    before = databaseState(f),
    original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, 1);
  withDatabase(f, (db) => {
    const actual = new HostStateStore(db, f.workspace);
    let reads = 0;
    const store = new Proxy(actual, {
      get(target, key) {
        if (key === 'readHostStateSnapshot')
          return (identity) => {
            const snapshot = target.readHostStateSnapshot(identity);
            return ++reads === 2
              ? { ...snapshot, maintenanceGeneration: snapshot.maintenanceGeneration + 1 }
              : snapshot;
          };
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    expect(() =>
      suspendHistoricalOwnerWork({
        store,
        identity: request.identity,
        journal: { state: original.journal.state, version: original.journal.version, resume_status: 'ready' },
        expectedWork: original.owner.version,
        expectedLedger: original.workspace.ledger_version,
        expectedMaintenanceGeneration: original.maintenanceGeneration,
        nativeSessionHandle: 'fixture-thread',
        userRequestPointer: request.userRequestPointer,
        requestIntent: request.requestIntent,
        config: original.config,
        predicate: 'unissued_prepared',
        documentationContext: {
          repository_root: f.root,
          repository_id: request.identity.repository_id,
          project_id: request.identity.project_ids[0],
          work_id: request.identity.work_id,
        },
      }),
    ).toThrow('maintenance generation changed after inspection');
  });
  expect(databaseState(f)).toEqual(before);
});

function seedKnownTerminalSynthesisCustody(f, request, state, receiptMutation = undefined) {
  return withDatabase(f, (db) => {
    const journalRow = db
        .query('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(f.workspace, request.identity.work_id, request.attempt),
      journal = JSON.parse(journalRow.payload),
      candidate = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)].find(
        (item) => item.request.action_id === state.items[0].request.action_id,
      );
    expect(candidate.request.stage_id).toBe('synthesize_task');
    expect(candidate.research_activation).toBeTruthy();
    db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?').run(
      json(journal),
      canonicalJsonDigest(journal),
      f.workspace,
      request.identity.work_id,
      request.attempt,
    );
    const store = new HostStateStore(db, f.workspace),
      before = store.readHostStateSnapshot(request.identity),
      work = before.work,
      ledger = before.ledger,
      ticket = ledger.tickets.find((entry) => entry.work_id === request.identity.work_id && entry.status === 'active'),
      claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id && entry.status === 'active'),
      now = '2026-10-07T00:00:00.000Z',
      nextWork = structuredClone(work),
      nextLedger = structuredClone(ledger),
      summary = JSON.stringify({
        schema: 'VidaSynthesisObservationOutput/v1',
        readiness: 'blocked',
        completeness: { status: 'blocked', material_gaps: ['GAP-VIDA-RUN-EXECUTION-001'] },
      }),
      body = {
        schema: 'VidaSessionObservation/v1',
        action_id: candidate.request.action_id,
        issue_id: candidate.issue_id,
        agent_id: 'fixture:research-synthesizer',
        tool_call_ref: 'fixture:followup',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: [],
      },
      inputBytes = Buffer.from(json({ status: body.status, agent_id: body.agent_id, tool_call_ref: body.tool_call_ref })),
      reportBytes = Buffer.from(
        json({
          exit_code: 1,
          input_path: path.resolve(f.root, '.tmp/synthesis-input.json'),
          command: ['vida-agent', '--report', path.resolve(f.root, '.tmp/synthesis-report-body.json')],
          stderr: json({
            schema: 'VidaAgentRunResult/v1',
            status: 'blocked',
            code: 'GAP-VIDA-RUN-EXECUTION-001',
            message: 'The requested run was blocked by runtime validation.',
          }).trim(),
        }),
      ),
      bodyBytes = Buffer.from(json(body)),
      original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt),
      admittedPredecessors = admittedResearchResultsForSynthesis({
        repositoryRoot: f.root,
        config: original.config,
        journal: original.journal,
        work: original.owner.state,
        workflowId: candidate.request.workflow_id,
      }),
      provenance = {
        schema: 'HistoricalTerminalSynthesisProvenance/v1',
        body_ref: '.tmp/synthesis-body.json',
        input_ref: '.tmp/synthesis-input.json',
        report_ref: '.tmp/synthesis-report.json',
        followup_ref: body.tool_call_ref,
        original_actor_id: body.agent_id,
        denial_status: 'blocked',
        denial_code: 'GAP-VIDA-RUN-EXECUTION-001',
        denial_message: 'The requested run was blocked by runtime validation.',
        denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
        input_bytes_base64: inputBytes.toString('base64'),
        report_bytes_base64: reportBytes.toString('base64'),
        predecessor_refs: admittedPredecessors.map((result) => ({ result_id: result.result_id, digest: result.digest })),
      };
    expect(admittedPredecessors).toHaveLength(2);
    nextWork.revision++;
    nextWork.lease = null;
    nextWork.execution.status = 'suspended';
    nextWork.execution.phase = 'awaiting_followup';
    nextWork.lifecycle.revision = nextWork.revision;
    nextWork.lifecycle.next_action =
      'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.';
    nextLedger.revision++;
    nextLedger.tickets = nextLedger.tickets.map((entry) =>
      entry.ticket_id === ticket.ticket_id
        ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
        : entry,
    );
    nextLedger.claims = nextLedger.claims.map((entry) =>
      entry.claim_id === claim.claim_id ? { ...entry, status: 'released', renewed_at: now } : entry,
    );
    nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'fixture-terminal-synthesis-release',
      kind: 'release',
      ticket_id: ticket.ticket_id,
      work_id: request.identity.work_id,
      thread_id: 'fixture-thread',
      source_revision: ticket.source_revision,
      resources: [...ticket.exclusive_resources],
      from_ledger_revision: ledger.revision,
      to_ledger_revision: nextLedger.revision,
      decided_by: 'fixture-thread',
      decision_pointer: request.userRequestPointer,
      created_at: now,
    });
    const capture = {
      schema: 'HistoricalTerminalSynthesisCapture/v1',
      identity: request.identity,
      attempt: request.attempt,
      actionId: candidate.request.action_id,
      issueId: candidate.issue_id,
      nativeSessionHandle: 'fixture-thread',
      userRequestPointer: request.userRequestPointer,
      requestIntent: request.requestIntent,
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedJournal: { revision: journalRow.revision, digest: canonicalJsonDigest(journal) },
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      documentationContext: {
        repository_root: f.root,
        repository_id: request.identity.repository_id,
        project_id: request.identity.project_ids[0],
        work_id: request.identity.work_id,
      },
      nextWork,
      nextLedger,
      bodyBytes,
      provenance,
    };
    const result = store.captureHistoricalTerminalSynthesisAndRelease(capture);
    if (receiptMutation) return receiptMutation({ db, store, capture, before, journal, candidate, result });
    return result;
  });
}

test('known terminal synthesis custody is accepted by read-only config rebind with the original Journal still pending', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  expect(completedResearch).toHaveLength(2);
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const before = databaseState(f),
    capture = seedKnownTerminalSynthesisCustody(f, request, state);
  expect(capture.receipt.terminal_status).toBe('known_terminal_unaccepted');
  expect(capture.receipt.accepted_result).toBe(false);
  expect(databaseState(f).agent_host_mastra_session_ledger[0].payload).toBe(before.agent_host_mastra_session_ledger[0].payload);
  const captured = databaseState(f);
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const inspected = await runReconcileArtifacts(f.args('inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(captured);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  const journal = JSON.parse(captured.agent_host_mastra_session_ledger[0].payload);
  expect(journal.items[0].observation).toBeNull();
  const work = JSON.parse(captured.agent_host_state.find((row) => row.kind === 'work').payload);
  expect(work.lifecycle.next_action).toContain('known terminal but unaccepted');
  expect(work.artifacts.some((artifact) => artifact.schema === 'ResearchSynthesis/v1')).toBe(false);
}, 30000);

test('public capture CLI exact resume reuses the Host poststate fence without writes', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    pendingSynthesisIndex = state.completed.flatMap((wave) => wave.items).length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt),
    item = original.journal.state.items[0],
    predecessors = admittedResearchResultsForSynthesis({
      repositoryRoot: f.root,
      config: original.config,
      journal: original.journal,
      work: original.owner.state,
      workflowId: item.request.workflow_id,
    }),
    sourceRef = synthesisSourceCatalog(predecessors).sources[0].key,
    summary = json({
      schema: 'VidaSynthesisObservationOutput/v1',
      topic: 'Bounded terminal synthesis evidence',
      findings: [
        {
          finding_id: 'synthesis-finding',
          statement: 'The admitted sources support the scoped conclusion.',
          source_refs: [sourceRef],
          evidence_class: 'Static',
          status: 'confirmed',
        },
      ],
      uncertainties: [],
      conflicts: [],
      br_ids: ['BR-1'],
      sr_ids: ['SR-1'],
      ac_ids: ['AC-1'],
      gap_ids: [],
      options: [
        {
          option_id: 'option-evidence',
          label: 'Use admitted evidence',
          description: 'Keep the conclusion within the accepted sources.',
          evidence_refs: [sourceRef],
        },
      ],
      recommendation: {
        option_id: 'option-evidence',
        rationale: 'The admitted evidence supports the scoped conclusion.',
        evidence_refs: [sourceRef],
      },
      completeness: {
        status: 'blocked',
        required_questions: [],
        answered_questions: [],
        missing_questions: [],
        material_gaps: ['GAP-VIDA-RUN-EXECUTION-001'],
        external_validation: {
          required: true,
          source_count: 2,
          minimum_sources: 2,
          status: 'blocked',
          live_check: false,
        },
      },
      readiness: 'blocked',
    }),
    body = {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      agent_id: 'fixture:research-synthesizer',
      tool_call_ref: 'fixture:terminal-followup',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: [sourceRef],
    },
    bodyRef = '.tmp/synthesis-body.json',
    inputRef = '.tmp/synthesis-input.json',
    reportRef = '.tmp/synthesis-report.json',
    reportBodyRef = '.tmp/synthesis-report-body.json',
    requestRef = '.tmp/terminal-synthesis-capture.json',
    denial = {
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-EXECUTION-001',
      message: 'The requested run was blocked by runtime validation.',
    },
    input = { status: body.status, agent_id: body.agent_id, tool_call_ref: body.tool_call_ref },
    report = {
      exit_code: 1,
      input_path: path.resolve(f.root, inputRef),
      command: ['vida-agent', '--report', path.resolve(f.root, reportBodyRef)],
      stderr: json(denial).trim(),
    },
    base = {
      schema: 'HistoricalTerminalSynthesisCaptureRequest/v1',
      identity: request.identity,
      attempt: request.attempt,
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      body_ref: bodyRef,
      input_ref: inputRef,
      report_ref: reportRef,
      followup_ref: body.tool_call_ref,
      userRequestPointer: request.userRequestPointer,
      requestIntent: request.requestIntent,
    };
  f.put(bodyRef, json(body));
  f.put(inputRef, json(input));
  f.put(reportRef, json(report));
  f.put(reportBodyRef, json(body));
  f.put(requestRef, json(base));
  const args = (mode) => [
    '--capture-historical-terminal-synthesis',
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
    requestRef,
  ];
  const inspected = await run(args('inspect'));
  expect(inspected.status).toBe('historical_terminal_synthesis_capture_inspected');
  f.put(requestRef, json(inspected.request));
  const applied = await run(args('apply'));
  expect(applied.status).toBe('historical_terminal_synthesis_captured');
  expect(applied.rights_granted).toBe(false);
  expect(applied.accepted_result).toBe(false);
  const beforeResume = databaseState(f),
    engineBeforeResume = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const resumed = await run(args('resume'));
  expect(resumed.status).toBe('historical_terminal_synthesis_captured');
  expect(resumed.receipt).toEqual(applied.receipt);
  expect(resumed.rights_granted).toBe(false);
  expect(resumed.caller_authorization_required).toBe(true);
  expect(databaseState(f)).toEqual(beforeResume);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBeforeResume);
}, 30000);

test('terminal synthesis predicate accepts only its exact known target with official-docs egress', () => {
  const terminal = historicalFixture('terminal_synthesis_unaccepted');
  const completedResearch = terminal.state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  expect(completedResearch).toHaveLength(2);
  seedHistoricalResearchLineage(terminal.f, terminal.request, terminal.state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const original = inspectHistoricalOwnerContext(
    terminal.f.root,
    'baseline.yaml',
    terminal.request.identity,
    terminal.request.attempt,
  );
  const target = original.journal.state.items.find((item) => item.issue_id !== null && item.observation === null);
  expect(target).toBeTruthy();
  const stage = original.config.workflows[target.request.workflow_id].stages.find(
      (entry) => entry.id === target.request.stage_id,
    ),
    profile = original.config.agents.profiles[stage.assignments[target.request.assignment_index].profile];
  expect(stage.id).toBe('synthesize_task');
  expect(original.config.agents.egress_policies[profile.egress_policy].allowed_hosts.length).toBeGreaterThan(0);
  const capture = {
    actionId: target.request.action_id,
    issueId: target.issue_id,
    bodyBytes: Buffer.from(
      json({
        schema: 'VidaSessionObservation/v1',
        action_id: target.request.action_id,
        issue_id: target.issue_id,
        status: 'reported_complete',
        agent_id: 'fixture:research-synthesizer',
        tool_call_ref: 'fixture:terminal-body',
        summary: 'Known terminal synthesis fixture',
        output_digest: '0'.repeat(64),
        evidence_refs: [],
      }),
    ),
    provenance: {
      schema: 'HistoricalTerminalSynthesisProvenance/v1',
      body_ref: '.tmp/synthesis-body.json',
      input_ref: '.tmp/synthesis-input.json',
      report_ref: '.tmp/synthesis-report.json',
      followup_ref: 'fixture:terminal-body',
      original_actor_id: 'fixture:research-synthesizer',
      denial_status: 'blocked',
      denial_code: 'GAP-VIDA-RUN-EXECUTION-001',
      denial_message: 'The requested run was blocked by runtime validation.',
      denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
      input_bytes_base64: '',
      report_bytes_base64: '',
      predecessor_refs: [
        { result_id: 'result-one', digest: 'a'.repeat(64) },
        { result_id: 'result-two', digest: 'b'.repeat(64) },
      ],
    },
  };
  const terminalInput = {
    identity: terminal.request.identity,
    journal: { state: original.journal.state, version: original.journal.version, resume_status: 'issued_outcome_uncertain' },
    expectedWork: original.owner.version,
    expectedLedger: original.workspace.ledger_version,
    expectedMaintenanceGeneration: original.maintenanceGeneration,
    nativeSessionHandle: 'fixture-thread',
    userRequestPointer: terminal.request.userRequestPointer,
    requestIntent: terminal.request.requestIntent,
    config: original.config,
    predicate: 'terminal_synthesis_unaccepted',
    capture,
    documentationContext: {
      repository_root: terminal.f.root,
      repository_id: terminal.request.identity.repository_id,
      project_id: terminal.request.identity.project_ids[0],
      work_id: terminal.request.identity.work_id,
    },
  };
  const terminalBefore = databaseState(terminal.f),
    terminalEngine = readFileSync(path.join(terminal.f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  withDatabase(terminal.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({ store: new HostStateStore(db, terminal.f.workspace), ...terminalInput }),
    ).not.toThrow(),
  );
  expect(databaseState(terminal.f)).toEqual(terminalBefore);
  expect(readFileSync(path.join(terminal.f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(terminalEngine);

  const wrongStage = structuredClone(terminalInput.journal.state);
  wrongStage.items[0].request.stage_id = 'develop_change';
  const wrongStageInput = {
    ...terminalInput,
    journal: {
      ...terminalInput.journal,
      state: wrongStage,
      version: { ...terminalInput.journal.version, digest: canonicalJsonDigest(wrongStage) },
    },
  };
  withDatabase(terminal.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({ store: new HostStateStore(db, terminal.f.workspace), ...wrongStageInput }),
    ).toThrow(/historical synthesis candidate is not one known-terminal/),
  );
  expect(databaseState(terminal.f)).toEqual(terminalBefore);

  const unknown = historicalFixture('unknown_readonly', { officialDocs: true }),
    unknownOriginal = inspectHistoricalOwnerContext(
      unknown.f.root,
      'baseline.yaml',
      unknown.request.identity,
      unknown.request.attempt,
    ),
    unknownTarget = unknownOriginal.journal.state.items[0],
    unknownStage = unknownOriginal.config.workflows[unknownTarget.request.workflow_id].stages.find(
      (entry) => entry.id === unknownTarget.request.stage_id,
    ),
    unknownProfile = unknownOriginal.config.agents.profiles[unknownStage.assignments[unknownTarget.request.assignment_index].profile];
  expect(unknownOriginal.config.agents.egress_policies[unknownProfile.egress_policy].allowed_hosts.length).toBeGreaterThan(0);
  const unknownBefore = databaseState(unknown.f),
    unknownEngine = readFileSync(path.join(unknown.f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  withDatabase(unknown.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({
        store: new HostStateStore(db, unknown.f.workspace),
        identity: unknown.request.identity,
        journal: {
          state: unknownOriginal.journal.state,
          version: unknownOriginal.journal.version,
          resume_status: 'issued_outcome_uncertain',
        },
        expectedWork: unknownOriginal.owner.version,
        expectedLedger: unknownOriginal.workspace.ledger_version,
        expectedMaintenanceGeneration: unknownOriginal.maintenanceGeneration,
        nativeSessionHandle: 'fixture-thread',
        userRequestPointer: unknown.request.userRequestPointer,
        requestIntent: unknown.request.requestIntent,
        config: unknownOriginal.config,
        predicate: 'unknown_readonly',
        documentationContext: {
          repository_root: unknown.f.root,
          repository_id: unknown.request.identity.repository_id,
          project_id: unknown.request.identity.project_ids[0],
          work_id: unknown.request.identity.work_id,
        },
      }),
    ).toThrow(/native action or host assignment is still active or uncertain/),
  );
  expect(databaseState(unknown.f)).toEqual(unknownBefore);
  expect(readFileSync(path.join(unknown.f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(unknownEngine);
});

test.each([
  'missing receipt',
  'tampered receipt',
  'denial provenance',
  'invalid UTF-8 body',
  'predecessor references',
])(
  'known terminal synthesis config rebind denies %s without effects',
  async (change) => {
    const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
      completedResearch = state.completed.flatMap((wave) => wave.items),
      pendingSynthesisIndex = completedResearch.length;
    expect(completedResearch).toHaveLength(2);
    seedHistoricalResearchLineage(f, request, state, {
      includeCompleted: true,
      pendingIndex: pendingSynthesisIndex,
      activationOnlyIndex: pendingSynthesisIndex,
    });
    seedKnownTerminalSynthesisCustody(f, request, state, ({ db, capture, before, journal, candidate }) => {
      const receipt = new HostStateStore(db, f.workspace).readHistoricalTerminalSynthesisCapture(
        request.identity,
        request.attempt,
        candidate.request.action_id,
      );
      expect(receipt).toBeTruthy();
      if (change === 'missing receipt') {
        db.query(
          'DELETE FROM agent_host_historical_terminal_synthesis_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        ).run(f.workspace, request.identity.work_id, request.attempt, candidate.request.action_id);
      } else {
        const altered = structuredClone(receipt);
        if (change === 'tampered receipt') altered.body_base64 = Buffer.from('tampered').toString('base64');
        else if (change === 'denial provenance') {
          altered.provenance.denial_message = 'foreign denial';
          altered.request.provenance.denial_message = 'foreign denial';
          altered.request_digest = canonicalJsonDigest(altered.request);
        } else if (change === 'predecessor references') {
          altered.provenance.predecessor_refs[0].digest = 'f'.repeat(64);
          altered.request.provenance = structuredClone(altered.provenance);
          altered.request_digest = canonicalJsonDigest(altered.request);
        } else {
          altered.body_base64 = Buffer.from([0xff]).toString('base64');
          altered.body_byte_length = 1;
          altered.body_sha256 = sha(Buffer.from([0xff]));
          altered.request.body_base64 = altered.body_base64;
          altered.request_digest = canonicalJsonDigest(altered.request);
        }
        db.query(
          'UPDATE agent_host_historical_terminal_synthesis_capture SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        ).run(
          json(altered),
          canonicalJsonDigest(altered),
          f.workspace,
          request.identity.work_id,
          request.attempt,
          candidate.request.action_id,
        );
      }
      return { before, journal };
    });
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.put('proposed.yaml', f.target);
    const beforeInspect = databaseState(f);
    await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown|custody|denial|UTF-8|digest/i);
    expect(databaseState(f)).toEqual(beforeInspect);
  },
  30000,
);

test('known terminal reader denies a synthesis stage whose configured output schema changed', () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  seedKnownTerminalSynthesisCustody(f, request, state);
  const before = databaseState(f),
    config = structuredClone(loadRuntimeConfig(f.root)),
    stage = config.workflows.implementation_new.stages.find((entry) => entry.id === 'synthesize_task');
  stage.produces = stage.produces.filter((schema) => schema !== 'ResearchSynthesis/v1');
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(
      /original stage or configured readonly role differs/,
    ),
  );
  expect(databaseState(f)).toEqual(before);
});

function seedHistoricalResearchLineage(
  f,
  request,
  state,
  { unnormalizedIndex = -1, pendingIndex = -1, activationOnlyIndex = -1, includeCompleted = false } = {},
) {
  const original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, 1);
  const work = structuredClone(original.owner.state);
  const lineageItems = includeCompleted ? [...state.completed.flatMap((wave) => wave.items), ...state.items] : state.items;
  const materials = [];
  let history = '',
    changelog = '';
  for (const [index, item] of lineageItems.entries()) {
    const pending = index === pendingIndex,
      normalized = index !== unnormalizedIndex && !pending;
    const record = createHistoricalResearchFixture({
      config: original.config,
      feature: original.config.research_decision,
      request: item.request,
      topic: 'research-' + index,
      binding: {
        work_id: request.identity.work_id,
        attempt: state.attempt,
        run_id: state.run_id,
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        scope_id: work.binding.scope_id,
        scope_digest: state.source_scope.digest,
        source_revision: work.binding.work_source_revision,
        source_scope_digest: state.source_scope.digest,
        config_digest: work.binding.config_digest,
        maintenance_generation: original.maintenanceGeneration,
        lease_ticket_id: work.lease.ticket_id,
        lease_thread_id: work.lease.thread_id,
        lease_generation: work.lease.generation,
      },
      ...(index === activationOnlyIndex
        ? {
            result: {
              topic: 'terminal-synthesis-fixture',
              work_item_id: request.identity.work_id,
              scope_id: work.binding.scope_id,
              source_revision: work.binding.work_source_revision,
              result_id: 'terminal-synthesis-fixture-result',
              digest: 'c'.repeat(64),
              actor: 'fixture-owner',
              pointer: 'WORK.md',
              updated_at: new Date().toISOString(),
            },
          }
        : {}),
    });
    if (index === activationOnlyIndex) {
      const synthesisUse = { ...record.activationUse, phase: 'plan', lane: 'synthesizer' };
      delete synthesisUse.digest;
      synthesisUse.digest = canonicalJsonDigest(synthesisUse);
      record.activationUse = synthesisUse;
      record.historyBytes = canonicalJson(synthesisUse) + '\n';
      const activationBody = { ...record.activationPlan, use_digest: synthesisUse.digest };
      delete activationBody.digest;
      record.activationPlan = { ...activationBody, digest: canonicalJsonDigest(activationBody) };
    }
    try {
      materials.push({
        scopeBytes: record.scopeBytes,
        acceptanceBytes: record.acceptanceBytes,
        workItem: record.workItem,
      });
      const activation = {
        ...record.activationPlan,
        history_pre_sha256: history === '' ? null : sha(history),
        history_sha256: sha(history + record.historyBytes),
      };
      delete activation.digest;
      activation.digest = canonicalJsonDigest(activation);
      history += record.historyBytes;
      f.put(record.historyPath, history);
      item.research_activation = { plan: activation, use: record.activationUse };
      if (pending) item.observation = null;
      if (normalized) {
        const plan = {
          ...record.plan,
          changelog_pre_sha256: changelog === '' ? null : sha(changelog),
          changelog_sha256: sha(changelog + record.changelogBytes),
        };
        delete plan.digest;
        plan.digest = canonicalJsonDigest(plan);
        changelog += record.changelogBytes;
        f.put(record.recordPath, record.recordBytes);
        f.put(record.changelogPath, changelog);
        item.observation = record.observation;
        item.research_normalization = plan;
        work.artifacts.push({
          artifact_id: includeCompleted ? record.result.result_id : 'research-' + index,
          schema: 'ResearchResult/v1',
          path: plan.record_path,
          sha256: plan.record_sha256,
          stage_id: item.request.stage_id,
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          ac_ids: work.binding.ac_ids,
        });
      } else delete item.research_normalization;
    } finally {
      record.dispose();
    }
  }
  if (materials.length) {
    const material = materials[0];
    f.put(work.contracts.scope.path, material.scopeBytes);
    f.put(work.contracts.acceptance.path, material.acceptanceBytes);
    work.contracts.scope.sha256 = sha(material.scopeBytes);
    work.contracts.acceptance.sha256 = sha(material.acceptanceBytes);
    work.binding.scope_contract_digest = sha(material.scopeBytes);
    work.binding.acceptance_manifest_digest = sha(material.acceptanceBytes);
    work.binding.provider_work_item_id = material.workItem.id;
    work.binding.work_item_digest = canonicalJsonDigest(material.workItem);
    const intakePath = '.agent/work/' + request.identity.work_id + '/intake.json';
    const intake = JSON.parse(readFileSync(path.join(f.root, intakePath), 'utf8'));
    intake.work_item = material.workItem;
    const intakeBytes = json(intake);
    f.put(intakePath, intakeBytes);
    const intakeArtifact = work.artifacts.find((artifact) => artifact.path === intakePath);
    if (intakeArtifact) intakeArtifact.sha256 = sha(Buffer.from(intakeBytes));
  }
  withDatabase(f, (db) => {
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'").run(
      json(work),
      canonicalJsonDigest(work),
    );
    db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?').run(
      json(state),
      canonicalJsonDigest(state),
    );
  });
  if (includeCompleted) {
    const engine = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), { strict: true });
    try {
      const row = engine
        .query('SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
        .get(state.run_id);
      const snapshot = JSON.parse(row.snapshot),
        currentConfig = loadRuntimeConfig(f.root),
        context = { work_id: state.work_id, attempt: state.attempt, scope_digest: state.source_scope.digest };
      let prior = structuredClone(snapshot.context.input);
      for (const wave of state.completed) {
        const retained = snapshot.context[wave.step_id],
          observations = wave.items.map((item) => item.observation);
        retained.payload = structuredClone(prior);
        retained.resumePayload = { observations };
        retained.output = { ...prior, observations: [...prior.observations, ...observations] };
        prior = retained.output;
      }
      const pendingWaveIndex = state.items[0].request.wave_index,
        actions = sessionActionsForWave(
          currentConfig,
          snapshot.context.input.selection,
          context,
          state.items[0].request.workflow_id,
          pendingWaveIndex,
          [],
        ),
        requests = actions.map((action) =>
          buildSessionBridgeRequest({
            runId: state.run_id,
            workflowId: state.items[0].request.workflow_id,
            configDigest: runtimeConfigDigest(original.config),
            context,
            waveIndex: pendingWaveIndex,
            action,
            configuredContext: configuredContextForStage(
              f.root,
              currentConfig,
              state.items[0].request.workflow_id,
              action.stage_id,
              context,
            ),
            priorResults: prior.observations,
          }),
        );
      expect(requests).toHaveLength(state.items.length);
      state.items = state.items.map((item, index) => ({ ...item, request: requests[index] }));
      const pendingWave = snapshot.context['wave-' + pendingWaveIndex];
      pendingWave.payload = structuredClone(prior);
      pendingWave.suspendPayload = { requests };
      engine.query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?').run(json(snapshot), state.run_id);
    } finally {
      engine.close();
    }
    withDatabase(f, (db) =>
      db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?').run(
        json(state),
        canonicalJsonDigest(state),
      ),
    );
  }
  return { work, materials };
}

test('public settled research releases admitted lineage and preserves observations on exact retry', async () => {
  const { f, request, args, state } = historicalFixture('settled_research'),
    { work } = seedHistoricalResearchLineage(f, request, state);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = JSON.parse(after.agent_host_state.find((row) => row.kind === 'work').payload);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public historical normalization resumes the original record-first request and exact replay under Host CAS', async () => {
  const { f, request, state } = historicalFixture('settled_research'),
    { work, materials } = seedHistoricalResearchLineage(f, request, state),
    item = [...state.items].reverse().find((entry) => entry.research_normalization);
  expect(item).toBeTruthy();
  const plan = item.research_normalization,
    recordBefore = readFileSync(path.join(f.root, plan.record_path), 'utf8'),
    changelogBefore = readFileSync(path.join(f.root, plan.changelog_path), 'utf8'),
    priorEvents = changelogBefore
      .split('\n')
      .filter(Boolean)
      .filter((line) => JSON.parse(line).path_after !== plan.record_path),
    partialChangelog = priorEvents.length ? priorEvents.join('\n') + '\n' : '';
  expect(changelogBefore.split('\n').filter(Boolean).length).toBeGreaterThan(priorEvents.length);
  f.put(plan.changelog_path, partialChangelog);
  f.put('.githooks/pre-commit', 'Current source changed after the original reservation.\n');
  const resumeRequest = {
      schema: 'HistoricalNormalizationResumeRequest/v1',
      identity: request.identity,
      attempt: 1,
      action_id: item.request.action_id,
    },
    requestPath = '.tmp/historical-normalization-resume.json';
  f.put(requestPath, json(resumeRequest));
  const resumeArgs = (mode) => [
    '--resume-historical-normalization',
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
    requestPath,
  ];
  const beforeInspect = databaseState(f),
    inspected = await run(resumeArgs('inspect'));
  const originalOperationReference = JSON.parse(materials[0].scopeBytes.toString('utf8')).attribution.pointer;
  expect(inspected.status).toBe('historical_normalization_resume_inspected');
  expect(inspected.record_missing).toBe(false);
  expect(inspected.caller_identity_authenticated).toBe(false);
  expect(inspected.caller_authorization_required).toBe(true);
  expect(inspected.request.inspection.original_operation_reference).toBe(originalOperationReference);
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(beforeInspect);
  f.put(requestPath, json(inspected.request));
  const frozenRequest = readFileSync(path.join(f.root, requestPath), 'utf8'),
    applied = await run(resumeArgs('apply'));
  expect(applied.status).toBe('historical_normalization_resumed');
  expect(applied.replay).toBe(false);
  expect(applied.caller_identity_authenticated).toBe(false);
  expect(applied.caller_authorization_required).toBe(true);
  expect(applied.original_operation_reference).toBe(originalOperationReference);
  expect(applied.rights_granted).toBe(false);
  expect(applied.runtime_acceptance).toBe(false);
  expect(readFileSync(path.join(f.root, plan.record_path), 'utf8')).toBe(recordBefore);
  expect(readFileSync(path.join(f.root, plan.changelog_path), 'utf8')).toBe(changelogBefore);
  expect(databaseState(f)).toEqual(beforeInspect);
  f.put(requestPath, frozenRequest);
  const replayed = await run(resumeArgs('resume'));
  expect(replayed.status).toBe('historical_normalization_resumed');
  expect(replayed.replay).toBe(true);
  expect(databaseState(f)).toEqual(beforeInspect);

  const afterReplay = databaseState(f),
    maintenanceBinding = {
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: request.identity.project_ids,
      operation_id: 'historical-resume-fixture',
      manifest_digest: 'a'.repeat(64),
      request_digest: 'b'.repeat(64),
      bindings_digest: 'c'.repeat(64),
      closure_digest: 'd'.repeat(64),
      bundle_digest: 'e'.repeat(64),
    },
    maintenanceFence = {
      schema: 'MaintenanceFence/v1',
      workspace_id: f.workspace,
      revision: 1,
      generation: 1,
      status: 'released',
      binding: maintenanceBinding,
      token_digest: 'f'.repeat(64),
    };
  withDatabase(f, (db) =>
    db
      .query('INSERT INTO agent_host_maintenance VALUES(?,?,?,?)')
      .run(f.workspace, 1, json(maintenanceFence), canonicalJsonDigest(maintenanceFence)),
  );
  const afterMaintenance = databaseState(f);
  await expect(run(resumeArgs('resume'))).rejects.toThrow(/maintenance|original|reserved/);
  expect(databaseState(f)).toEqual(afterMaintenance);
}, 30000);

test('public historical normalization rejects foreign requests and stale Host CAS before file effects', async () => {
  const { f, request, state } = historicalFixture('settled_research'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    item = [...state.items].reverse().find((entry) => entry.research_normalization);
  expect(item).toBeTruthy();
  const plan = item.research_normalization,
    recordPath = path.join(f.root, plan.record_path),
    changelogPath = path.join(f.root, plan.changelog_path),
    changelog = readFileSync(changelogPath, 'utf8'),
    priorEvents = changelog
      .split('\n')
      .filter(Boolean)
      .filter((line) => JSON.parse(line).path_after !== plan.record_path);
  f.put(plan.changelog_path, priorEvents.length ? priorEvents.join('\n') + '\n' : '');
  const requestPath = '.tmp/historical-normalization-stale.json',
    requestBody = {
      schema: 'HistoricalNormalizationResumeRequest/v1',
      identity: request.identity,
      attempt: 1,
      action_id: item.request.action_id,
    };
  f.put(requestPath, json(requestBody));
  const resumeArgs = (mode) => [
    '--resume-historical-normalization',
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
    requestPath,
  ];
  const inspected = await run(resumeArgs('inspect'));
  f.put(requestPath, json(inspected.request));
  const beforeForeign = {
    database: databaseState(f),
    record: readFileSync(recordPath, 'utf8'),
    changelog: readFileSync(changelogPath, 'utf8'),
  };
  f.put(requestPath, json({ ...inspected.request, action_id: 'foreign-action' }));
  await expect(run(resumeArgs('apply'))).rejects.toThrow(/original|inspection|action/i);
  expect(readFileSync(recordPath, 'utf8')).toBe(beforeForeign.record);
  expect(readFileSync(changelogPath, 'utf8')).toBe(beforeForeign.changelog);
  expect(databaseState(f)).toEqual(beforeForeign.database);

  f.put(requestPath, json(inspected.request));
  const staleDatabase = databaseState(f);
  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace),
      before = store.readHostStateSnapshot(request.identity),
      nextWork = structuredClone(before.work),
      nextLedger = structuredClone(before.ledger);
    nextWork.revision += 1;
    nextWork.lifecycle.revision += 1;
    nextLedger.revision += 1;
    store.compareAndSwapHostState({
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      nextWork,
      nextLedger,
    });
  });
  const changedHost = databaseState(f),
    beforeStale = { record: readFileSync(recordPath, 'utf8'), changelog: readFileSync(changelogPath, 'utf8') };
  await expect(run(resumeArgs('apply'))).rejects.toThrow(/changed|CAS|state|maintenance/i);
  expect(readFileSync(recordPath, 'utf8')).toBe(beforeStale.record);
  expect(readFileSync(changelogPath, 'utf8')).toBe(beforeStale.changelog);
  expect(databaseState(f)).toEqual(changedHost);
  expect(changedHost).not.toEqual(staleDatabase);
}, 30000);

test('public readonly bookkeeping releases a completed observation without normalization', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    unnormalizedIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { unnormalizedIndex }),
    unnormalized = state.items[unnormalizedIndex];
  expect(unnormalized.observation.status).toBe('reported_complete');
  expect(unnormalized.research_activation).toBeTruthy();
  expect(unnormalized.research_normalization).toBeUndefined();
  expect(work.artifacts.some((artifact) => artifact.artifact_id === 'research-' + unnormalizedIndex)).toBe(false);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = JSON.parse(after.agent_host_state.find((row) => row.kind === 'work').payload);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public readonly bookkeeping keeps committed normalized lineage without adding missing Work admission', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    normalized = state.items[0],
    plan = normalized.research_normalization;
  expect(existsSync(path.join(f.root, plan.record_path))).toBe(true);
  work.artifacts = work.artifacts.filter((artifact) => artifact.path !== plan.record_path);
  expect(work.artifacts.some((artifact) => artifact.path === plan.record_path)).toBe(false);
  withDatabase(f, (db) =>
    db
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
      .run(json(work), canonicalJsonDigest(work)),
  );
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = JSON.parse(after.agent_host_state.find((row) => row.kind === 'work').payload);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.artifacts.some((artifact) => artifact.path === plan.record_path)).toBe(false);
  expect(released.lifecycle.next_action).toMatch(/canonical artifact GAPs/);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public readonly bookkeeping preserves a pending no-egress code-researcher issue as UNKNOWN', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { pendingIndex }),
    pending = state.items[pendingIndex],
    config = loadRuntimeConfig(f.root),
    stage = config.workflows[pending.request.workflow_id].stages.find((entry) => entry.id === pending.request.stage_id),
    profile = config.agents.profiles[stage.assignments[pending.request.assignment_index].profile];
  expect(pending.request.role).toBe('code-researcher');
  expect(config.agents.egress_policies[profile.egress_policy].allowed_hosts).toHaveLength(0);
  expect(pending.issue_id).toBeTruthy();
  expect(pending.observation).toBeNull();
  expect(pending.research_activation).toBeTruthy();
  expect(pending.research_normalization).toBeUndefined();
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = JSON.parse(after.agent_host_state.find((row) => row.kind === 'work').payload);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.execution.assignment_attempts).toEqual(work.execution.assignment_attempts);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('released readonly bookkeeping UNKNOWN remains frozen through config rebind', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { pendingIndex }),
    pending = state.items[pendingIndex],
    engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const releaseInspection = await run(args('inspect'));
  f.put('release.json', json(releaseInspection.request));
  const release = await run(args('apply'));
  expect(release.rights_granted).toBe(false);
  expect(release.runtime_acceptance).toBe(false);
  const releasedState = databaseState(f),
    releasedWork = JSON.parse(releasedState.agent_host_state.find((row) => row.kind === 'work').payload),
    retainedJournal = JSON.parse(releasedState.agent_host_mastra_session_ledger[0].payload);
  expect(releasedWork.lease).toBeNull();
  expect(releasedWork.artifacts).toEqual(work.artifacts);
  expect(releasedWork.artifacts.some((artifact) => artifact.artifact_id === 'research-' + pendingIndex)).toBe(false);
  expect(retainedJournal.items[pendingIndex].issue_id).toBe(pending.issue_id);
  expect(retainedJournal.items[pendingIndex].observation).toBeNull();
  expect(retainedJournal.items[pendingIndex].research_activation).toEqual(pending.research_activation);
  expect(retainedJournal.items[pendingIndex].research_normalization).toBeUndefined();
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);

  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const inspected = await runReconcileArtifacts(f.args('inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f).agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  expect(databaseState(f).agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = databaseState(f),
    afterJournal = JSON.parse(after.agent_host_mastra_session_ledger[0].payload);
  expect(after.agent_host_state).toEqual(releasedState.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  expect(afterJournal.items[pendingIndex].observation).toBeNull();
  expect(afterJournal.items[pendingIndex].research_activation).toEqual(pending.research_activation);
  expect(afterJournal.items[pendingIndex].research_normalization).toBeUndefined();
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);
}, 30000);

test('readonly bookkeeping config rebind rejects a changed retained release operation', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  withDatabase(f, (db) => {
    const row = db.query("SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'").get(),
      ledger = JSON.parse(row.payload),
      release = ledger.operations.find((operation) => operation.work_id === request.identity.work_id);
    release.decision_pointer = 'fixture:foreign-release';
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(ledger),
      canonicalJsonDigest(ledger),
      row.rowid,
    );
  });
  const before = databaseState(f);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects retained release source revision drift', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  withDatabase(f, (db) => {
    const row = db.query("SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'").get(),
      ledger = JSON.parse(row.payload),
      release = ledger.operations.find((operation) => operation.work_id === request.identity.work_id);
    release.source_revision = 'fixture:foreign-source-revision';
    const payload = json(ledger);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(ledger),
      row.rowid,
    );
    expect(canonicalJsonDigest(JSON.parse(payload))).toBe(canonicalJsonDigest(ledger));
  });
  const before = databaseState(f);
  await expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects a coherent distinct released ticket', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const row = db.query("SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'").get(),
      ledger = JSON.parse(row.payload),
      activationBinding = state.items[1].research_activation.plan.binding,
      ticket = ledger.tickets.find((entry) => entry.ticket_id === activationBinding.lease_ticket_id),
      claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id),
      release = ledger.operations.find(
        (entry) => entry.kind === 'release' && entry.work_id === request.identity.work_id,
      ),
      distinctTicketId = randomUUID(),
      distinctClaimId = randomUUID(),
      distinctTicket = { ...structuredClone(ticket), ticket_id: distinctTicketId, claim_ids: [distinctClaimId] },
      distinctClaim = { ...structuredClone(claim), claim_id: distinctClaimId, ticket_id: distinctTicketId };
    expect(ticket.status).toBe('released');
    expect(claim.status).toBe('released');
    expect(distinctTicketId).not.toBe(activationBinding.lease_ticket_id);
    ledger.tickets.push(distinctTicket);
    ledger.claims.push(distinctClaim);
    release.ticket_id = distinctTicketId;
    const payload = json(ledger),
      digest = canonicalJsonDigest(ledger);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(payload, digest, row.rowid);
    expect(db.query('SELECT digest FROM agent_host_state WHERE rowid=?').get(row.rowid).digest).toBe(digest);
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind selects the current release with coherent older release history', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    priorJournal = structuredClone(state);
  const priorJournalDigest = withDatabase(f, (db) =>
    db
      .query('SELECT digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
      .get(f.workspace, request.identity.work_id, request.attempt).digest,
  );
  expect(priorJournalDigest).toBe(canonicalJsonDigest(priorJournal));
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  withDatabase(f, (db) => {
    const ledgerRow = db.query("SELECT rowid,revision,payload FROM agent_host_state WHERE kind='ledger'").get(),
      ledger = JSON.parse(ledgerRow.payload),
      activationBinding = state.items[1].research_activation.plan.binding,
      ticket = ledger.tickets.find((entry) => entry.ticket_id === activationBinding.lease_ticket_id),
      claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id),
      oldTicketId = randomUUID(),
      oldClaimId = randomUUID(),
      oldPointer = 'fixture:older-release',
      oldCreatedAt = new Date(Date.parse(ticket.created_at) - 1000).toISOString(),
      oldTicket = {
        ...structuredClone(ticket),
        ticket_id: oldTicketId,
        sequence: ticket.sequence,
        claim_ids: [oldClaimId],
        status: 'released',
        expires_at: null,
        active_resources: [],
        blocked_resources: [],
        created_at: oldCreatedAt,
      },
      oldClaim = {
        ...structuredClone(claim),
        claim_id: oldClaimId,
        ticket_id: oldTicketId,
        status: 'released',
        created_at: oldCreatedAt,
        renewed_at: oldCreatedAt,
      },
      oldRelease = {
        schema: 'CoordinationOperation/v1',
        kind: 'release',
        ticket_id: oldTicketId,
        work_id: request.identity.work_id,
        thread_id: ticket.thread_id,
        source_revision: ticket.source_revision,
        resources: [...ticket.exclusive_resources],
        operation_id:
          'readonly-bookkeeping-release-' +
          canonicalJsonDigest({
            work_id: request.identity.work_id,
            nativeSessionHandle: ticket.thread_id,
            userRequestPointer: oldPointer,
            requestIntent: 'next_work',
            journal: priorJournalDigest,
          }).slice(0, 40),
        from_ledger_revision: 1,
        to_ledger_revision: 2,
        decided_by: ticket.thread_id,
        decision_pointer: oldPointer,
        created_at: oldCreatedAt,
      };
    expect(ledgerRow.revision).toBe(1);
    expect(ledger.revision).toBe(1);
    expect(ticket.sequence).toBe(1);
    expect(ticket.status).toBe('active');
    expect(claim.status).toBe('active');
    ticket.sequence = 2;
    ledger.tickets.unshift(oldTicket);
    ledger.claims.unshift(oldClaim);
    ledger.next_sequence = 3;
    ledger.revision = 2;
    ledger.operations.push(oldRelease);
    const payload = json(ledger), digest = canonicalJsonDigest(ledger);
    db.query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE rowid=?').run(
      ledger.revision,
      payload,
      digest,
      ledgerRow.rowid,
    );
    const snapshot = new HostStateStore(db, f.workspace).readHostStateSnapshot(request.identity);
    expect(snapshot.ledgerVersion.revision).toBe(2);
    expect(snapshot.ledger).toEqual(ledger);
    expect(snapshot.ledger.tickets.map((entry) => [entry.ticket_id, entry.sequence, entry.status])).toEqual([
      [oldTicketId, 1, 'released'],
      [activationBinding.lease_ticket_id, 2, 'active'],
    ]);
    expect(snapshot.ledger.operations).toEqual([oldRelease]);
  });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const ledgerRow = db.query("SELECT revision,payload FROM agent_host_state WHERE kind='ledger'").get(),
      journalRow = db
        .query('SELECT payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(f.workspace, request.identity.work_id, request.attempt),
      ledger = JSON.parse(ledgerRow.payload),
      current = ledger.operations.find(
        (entry) => entry.kind === 'release' && entry.work_id === request.identity.work_id && entry.to_ledger_revision === 3,
      );
    expect(ledgerRow.revision).toBe(3);
    expect(ledger.revision).toBe(3);
    expect(current.from_ledger_revision).toBe(2);
    expect(current.to_ledger_revision).toBe(3);
    expect(JSON.parse(journalRow.payload).items[1].research_activation).toBeTruthy();
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  const digest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects two current release candidates', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const ledgerRow = db.query("SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'").get(),
      journalRow = db
        .query('SELECT digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(f.workspace, request.identity.work_id, request.attempt),
      ledger = JSON.parse(ledgerRow.payload),
      current = ledger.operations.find(
        (entry) => entry.kind === 'release' && entry.work_id === request.identity.work_id,
      ),
      secondPointer = 'fixture:second-current-release',
      second = {
        ...structuredClone(current),
        operation_id:
          'readonly-bookkeeping-release-' +
          canonicalJsonDigest({
            work_id: request.identity.work_id,
            nativeSessionHandle: current.thread_id,
            userRequestPointer: secondPointer,
            requestIntent: 'linked_correction',
            journal: journalRow.digest,
          }).slice(0, 40),
        decision_pointer: secondPointer,
      };
    ledger.operations.push(second);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(ledger),
      canonicalJsonDigest(ledger),
      ledgerRow.rowid,
    );
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('generic readonly UNKNOWN rejects an unactivated pending item when Journal history has activation', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const releaseInspection = await run(args('inspect'));
  f.put('release.json', json(releaseInspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const row = db
        .query('SELECT rowid,payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(f.workspace, request.identity.work_id, request.attempt),
      journal = JSON.parse(row.payload);
    expect(journal.items[0].research_activation).toBeTruthy();
    expect(journal.items[pendingIndex].research_activation).toBeTruthy();
    delete journal.items[pendingIndex].research_activation;
    delete journal.items[pendingIndex].research_normalization;
    const payload = json(journal);
    db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(journal),
      row.rowid,
    );
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping proof drift after config plan denies apply without changing Host state', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const pending = state.items[pendingIndex],
    inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  const activationPath = pending.research_activation.plan.history_path,
    activationBytes = readFileSync(path.join(f.root, activationPath), 'utf8');
  f.put(activationPath, activationBytes + '{}\n');
  const beforeDeniedApply = databaseState(f);
  await expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(/pending\/unknown|activation|history/i);
  expect(databaseState(f)).toEqual(beforeDeniedApply);
  expect(readFileSync(path.join(f.root, activationPath), 'utf8')).toBe(activationBytes + '{}\n');
}, 30000);

test('public readonly bookkeeping denies pending official-docs egress without changing state', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 0;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const pending = state.items[pendingIndex],
    config = loadRuntimeConfig(f.root),
    stage = config.workflows[pending.request.workflow_id].stages.find((entry) => entry.id === pending.request.stage_id),
    profile = config.agents.profiles[stage.assignments[pending.request.assignment_index].profile];
  expect(pending.request.role).toBe('documentation-researcher');
  expect(config.agents.egress_policies[profile.egress_policy].allowed_hosts.length).toBeGreaterThan(0);
  const before = databaseState(f);
  await expect(run(args('inspect'))).rejects.toThrow(/egress/);
  expect(databaseState(f)).toEqual(before);
});

test.each(['altered', 'missing'])(
  'public readonly bookkeeping denies %s committed activation history without changing state',
  async (change) => {
    const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
    seedHistoricalResearchLineage(f, request, state);
    const historyPath = state.items[0].research_activation.plan.history_path,
      fullPath = path.join(f.root, historyPath);
    if (change === 'altered') f.put(historyPath, readFileSync(fullPath, 'utf8') + '{}\n');
    else rmSync(fullPath, { force: true });
    const before = databaseState(f);
    await expect(run(args('inspect'))).rejects.toThrow(/activation|history/i);
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test.each(['tampered', 'missing'])(
  'public readonly bookkeeping denies a %s physical record with normalization without changing state',
  async (change) => {
    const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
    seedHistoricalResearchLineage(f, request, state);
    const recordPath = state.items[0].research_normalization.record_path,
      fullPath = path.join(f.root, recordPath);
    if (change === 'tampered') f.put(recordPath, '{}\n');
    else rmSync(fullPath, { force: true });
    const before = databaseState(f);
    await expect(run(args('inspect'))).rejects.toThrow(/record|research|digest/i);
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('public readonly bookkeeping denies an existing mismatched artifact at a normalized record path', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    plan = state.items[0].research_normalization,
    artifact = work.artifacts.find((entry) => entry.path === plan.record_path);
  expect(artifact).toBeTruthy();
  artifact.sha256 = '0'.repeat(64);
  withDatabase(f, (db) =>
    db
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
      .run(json(work), canonicalJsonDigest(work)),
  );
  const before = databaseState(f);
  await expect(run(args('inspect'))).rejects.toThrow(/artifact|lineage/i);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public readonly bookkeeping releases an exact expired owner once without renewing or granting rights', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    expiry = '2026-10-01T00:00:00.000Z';
  const original = withDatabase(f, (db) => {
    const row = db.query("SELECT * FROM agent_host_state WHERE kind='ledger'").get(),
      ledger = JSON.parse(row.payload),
      ticket = ledger.tickets.find((entry) => entry.ticket_id === work.lease.ticket_id),
      claim = ledger.claims.find((entry) => entry.ticket_id === work.lease.ticket_id);
    expect(ticket.status).toBe('active');
    expect(claim.status).toBe('active');
    ticket.expires_at = expiry;
    claim.lease_expires_at = expiry;
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
    return { ticket: structuredClone(ticket), claim: structuredClone(claim) };
  });
  expect(original.ticket.expires_at).toBe(original.claim.lease_expires_at);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.status).toBe('historical_owner_released');
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    releasedWork = JSON.parse(after.agent_host_state.find((row) => row.kind === 'work').payload),
    releasedLedger = JSON.parse(after.agent_host_state.find((row) => row.kind === 'ledger').payload),
    releasedTicket = releasedLedger.tickets.find((entry) => entry.ticket_id === original.ticket.ticket_id),
    releasedClaim = releasedLedger.claims.find((entry) => entry.ticket_id === original.claim.ticket_id);
  expect(releasedWork.lease).toBeNull();
  expect(releasedWork.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(releasedWork.execution.assignment_attempts).toEqual(work.execution.assignment_attempts);
  expect(releasedWork.artifacts).toEqual(work.artifacts);
  expect(releasedTicket.status).toBe('released');
  expect(releasedTicket.sequence).toBe(original.ticket.sequence);
  expect(releasedTicket.generation).toBe(original.ticket.generation);
  expect(releasedTicket.exclusive_resources).toEqual(original.ticket.exclusive_resources);
  expect(releasedTicket.active_resources).toEqual([]);
  expect(releasedTicket.blocked_resources).toEqual([]);
  expect(releasedTicket.expires_at).toBeNull();
  expect(releasedClaim.status).toBe('released');
  expect(releasedClaim.generation).toBe(original.claim.generation);
  expect(releasedClaim.resources).toEqual(original.claim.resources);
  expect(releasedClaim.lease_expires_at).toBe(expiry);
  expect(
    releasedLedger.operations.filter((operation) => operation.ticket_id === original.ticket.ticket_id),
  ).toHaveLength(1);
  expect(
    releasedLedger.operations.find((operation) => operation.ticket_id === original.ticket.ticket_id).resources,
  ).toEqual(original.ticket.exclusive_resources);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
  const retried = JSON.parse(databaseState(f).agent_host_state.find((row) => row.kind === 'ledger').payload);
  expect(retried.operations.filter((operation) => operation.ticket_id === original.ticket.ticket_id)).toHaveLength(1);
}, 30000);

test('public readonly bookkeeping denies an earlier overlapping queued ticket without changing state', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state);
  const queued = withDatabase(f, (db) => {
    const row = db.query("SELECT * FROM agent_host_state WHERE kind='ledger'").get(),
      ledger = JSON.parse(row.payload),
      owner = ledger.tickets.find((entry) => entry.ticket_id === work.lease.ticket_id),
      earlier = {
        ...structuredClone(owner),
        ticket_id: 'earlier-fifo-ticket',
        work_id: 'earlier-fifo-work',
        thread_id: 'earlier-fifo-thread',
        sequence: owner.sequence,
        status: 'queued',
        claim_ids: [],
        active_resources: [],
        blocked_resources: [...owner.exclusive_resources],
        expires_at: null,
      };
    owner.sequence++;
    ledger.tickets.unshift(earlier);
    ledger.next_sequence = Math.max(ledger.next_sequence, owner.sequence + 1);
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
    return { owner: structuredClone(owner), ticket: structuredClone(earlier) };
  });
  expect(queued.ticket.status).toBe('queued');
  expect(queued.ticket.sequence).toBeLessThan(queued.owner.sequence);
  expect(queued.ticket.blocked_resources.some((resource) => queued.owner.exclusive_resources.includes(resource))).toBe(
    true,
  );
  const before = databaseState(f);
  await expect(run(args('inspect'))).rejects.toThrow(/FIFO|resource activation/i);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public readonly bookkeeping rejects a foreign owner and stale inspection CAS', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state);
  const before = databaseState(f),
    foreignOwner = args('inspect');
  foreignOwner[7] = 'foreign-owner';
  await expect(run(foreignOwner)).rejects.toThrow(/original owner differs/);
  expect(databaseState(f)).toEqual(before);
  const inspected = await run(args('inspect'));
  f.put(
    'release.json',
    json({
      ...inspected.request,
      inspection: {
        ...inspected.request.inspection,
        expectedMaintenanceGeneration: inspected.request.inspection.expectedMaintenanceGeneration + 1,
      },
    }),
  );
  await expect(run(args('apply'))).rejects.toThrow(/CAS changed/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test.each(['completed_readonly', 'unknown_readonly', 'unissued_prepared'])(
  'settled research owner denies %s without admitted normalized research',
  async (predicate) => {
    const { f, request, args } = historicalFixture(predicate),
      before = databaseState(f);
    f.put(
      'release.json',
      json({ ...request, schema: 'SettledResearchOwnerReleaseRequest/v1', predicate: 'settled_research' }),
    );
    const control = args('inspect');
    control[0] = '--release-settled-research-owner';
    await expect(run(control)).rejects.toThrow(
      predicate === 'unknown_readonly' ? /unfinished issued effects/ : /settled research/,
    );
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

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
    'vida runtime-config rebind: only requested executor model/reasoning or the approved prewriter workflow template delta may change',
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
      'vida runtime-config rebind: only requested executor model/reasoning or the approved prewriter workflow template delta may change',
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
