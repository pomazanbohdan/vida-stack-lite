import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.argv[2];
const source = (relative) => pathToFileURL(path.join(root, 'vida-agent', relative)).href;
const { run } = await import(source('bin/run.mjs'));
const { runReconcileArtifacts } = await import(source('bin/reconcile-artifacts.mjs'));
const { loadRuntimeConfig, runtimeConfigDigest } = await import(source('src/config/runtime-config.ts'));
const { deriveWorkspaceId } = await import(source('src/workspace-identity.ts'));
const { canonicalJsonDigest } = await import(source('src/contracts/public-ingress.ts'));
const { snapshotDeclaredSources } = await import(source('src/orchestration/scoped-source-snapshot.ts'));
const { requireSafeRepositoryAccess } = await import(source('src/config/safe-repository-access.ts'));
const { openConfiguredMastraSessionLedger } = await import(source('src/orchestration/persistent-session-handoff.ts'));
const { loadProjectSetContext } = await import(source('src/config/project-context.ts'));
const record = (value) => JSON.stringify(value, null, 2) + '\n';
const initial = JSON.parse(readFileSync(path.join(root, '.agent/runtime-initialization.v1.json')));
const oldConfig = loadRuntimeConfig(root);
initial.workspace_id = deriveWorkspaceId(oldConfig.repository.repository_id, root);
initial.workspace_binding_status = 'bound';
writeFileSync(path.join(root, '.agent/runtime-initialization.v1.json'), record(initial));
mkdirSync(path.join(root, 'project/crmbx'), { recursive: true });
function task(workId) {
  const dir = `.agent/work/${workId}`;
  mkdirSync(path.join(root, dir), { recursive: true });
  const target = 'vida-agent/TESTING.md';
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [target]);
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: workId + '-scope',
    work_id: workId,
    source_revision: source.digest,
    ac_ids: ['AC-FIXTURE'],
    allowed_paths: [target],
    implementation_paths: [target],
    documentation_paths: [],
    changed_symbols: [],
    non_goals: [],
    acceptance_trace: ['AC-FIXTURE'],
    behavior_trace: ['SR-FIXTURE'],
    test_trace: ['fixture'],
    diagnostic_trace: ['fixture'],
    attribution: { thread_id: 'fixture-native-session', pointer: dir + '/intake.json' },
    owner: 'fixture',
    created_at: new Date().toISOString(),
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: workId + '-acceptance',
    version: 1,
    ac_ids: scope.ac_ids,
    source: target,
    scope: scope.scope_id,
    source_revision: source.digest,
    contracts: [{ id: 'AC-FIXTURE', definition: 'Fixture only admission.', sr: 'SR-FIXTURE', evidence: ['fixture'] }],
  };
  const intake = {
    schema: 'VidaLocalSessionIntake/v1',
    native_session_handle: 'fixture-native-session',
    work_item: {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'local',
      provider_type: 'Task',
      canonical_kind: 'task',
      intent: 'task_execution',
      project_id: 'refactoring',
      title: 'Fixture only intake',
      description: '',
      labels: [],
      risk_flags: [],
    },
    scope_path: dir + '/scope.json',
    acceptance_path: dir + '/acceptance.json',
    runtime_code_paths: ['vida-agent/bin/run.mjs'],
    route: 'R2',
    risk: 'medium',
    change_kind: 'fix',
  };
  for (const [name, value] of [
    ['scope', scope],
    ['acceptance', acceptance],
    ['intake', intake],
  ])
    writeFileSync(path.join(root, dir, name + '.json'), record(value));
  return [
    '--project-root',
    root,
    '--repository',
    oldConfig.repository.repository_id,
    '--project',
    'refactoring',
    '--work-path',
    'vida-agent',
    '--work-id',
    workId,
    '--attempt',
    '1',
    '--scope-digest',
    source.digest,
    '--team',
    'default-development',
    '--kind',
    'task',
    '--intent',
    'task_execution',
    '--workflow',
    'task_execution',
    '--intake',
    path.join(root, dir, 'intake.json'),
  ];
}
const oldArgs = task('fixture-old-settings');
await run(oldArgs, false);
const project = loadProjectSetContext(root, oldConfig, oldConfig.repository.repository_id, ['refactoring']);
const identity = {
  repository_id: project.repository_id,
  project_ids: project.project_ids,
  integrations_digest: project.integrations_digest,
  work_id: 'fixture-old-settings',
};
const ledger = openConfiguredMastraSessionLedger(root, oldConfig);
try {
  const host = ledger.hostState.readHostStateSnapshot(identity);
  assert.ok(host.work.lease);
  const ticket = host.ledger.tickets.find((t) => t.ticket_id === host.work.lease.ticket_id);
  const time = new Date().toISOString();
  // TEST SETUP: pause an unissued admitted work; no native action/effect is fabricated.
  ledger.hostState.compareAndSwapHostState({
    expectedWork: host.workVersion,
    expectedLedger: host.ledgerVersion,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    nextWork: {
      ...host.work,
      revision: host.work.revision + 1,
      lifecycle: { ...host.work.lifecycle, revision: host.work.revision + 1 },
      lease: null,
      execution: { ...host.work.execution, status: 'suspended', phase: 'awaiting_followup' },
    },
    nextLedger: {
      ...host.ledger,
      revision: host.ledger.revision + 1,
      tickets: host.ledger.tickets.map((t) =>
        t.ticket_id === ticket.ticket_id
          ? { ...t, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
          : t,
      ),
      claims: host.ledger.claims.map((c) =>
        c.ticket_id === ticket.ticket_id ? { ...c, status: 'released', renewed_at: time } : c,
      ),
      operations: [
        ...host.ledger.operations,
        {
          schema: 'CoordinationOperation/v1',
          operation_id: 'fixture-pause',
          kind: 'release',
          ticket_id: ticket.ticket_id,
          work_id: identity.work_id,
          thread_id: ticket.thread_id,
          source_revision: ticket.source_revision,
          resources: ticket.exclusive_resources,
          from_ledger_revision: host.ledger.revision,
          to_ledger_revision: host.ledger.revision + 1,
          decided_by: ticket.thread_id,
          decision_pointer: 'TEST SETUP pause',
          created_at: time,
        },
      ],
    },
  });
} finally {
  ledger.close();
}
const pausedLedger = openConfiguredMastraSessionLedger(root);
let pausedWork, pausedJournal;
try {
  pausedWork = pausedLedger.hostState.readHostStateSnapshot(identity).work;
  pausedJournal = pausedLedger.resume(identity.work_id, 1);
  assert.equal(pausedWork.binding.config_digest, runtimeConfigDigest(oldConfig));
} finally {
  pausedLedger.close();
}
const yamlPath = path.join(root, 'agent-runtime.config.v1.yaml');
const oldYaml = readFileSync(yamlPath, 'utf8');
const target = oldYaml.replace(
  /(    executor:\r?\n      model: )[^\r\n]+(\r?\n      reasoning: )[^\r\n]+/,
  '$1gpt-6.1-sol$2medium',
);
writeFileSync(path.join(root, 'proposed.yaml'), target);
const args = (mode) => [
  '--kind',
  'runtime-config',
  '--mode',
  mode,
  '--project-root',
  root,
  '--repair-id',
  'fixture-profile-rebind',
  ...(mode === 'plan'
    ? [
        '--actor',
        'fixture-owner',
        '--timestamp',
        new Date().toISOString(),
        '--instruction-ref',
        'TEST SETUP only',
        '--target-config',
        'proposed.yaml',
      ]
    : []),
];
await runReconcileArtifacts(args('plan'));
assert.equal((await runReconcileArtifacts(args('apply'))).status, 'author_config_required');
writeFileSync(yamlPath, target);
assert.equal((await runReconcileArtifacts(args('resume'))).status, 'applied');
const config = loadRuntimeConfig(root);
assert.notEqual(runtimeConfigDigest(config), runtimeConfigDigest(oldConfig));
assert.equal(config.agents.profiles.executor.model, 'gpt-6.1-sol');
assert.equal(config.agents.profiles.executor.reasoning, 'medium');
await assert.rejects(
  () =>
    run(
      oldArgs.filter((value, index) => oldArgs[index - 1] !== '--intake' && value !== '--intake'),
      false,
    ),
  /Mastra run binding differs from current context/,
);
const fresh = await run(task('fixture-fresh-settings'), false);
assert.ok(fresh);
const newLedger = openConfiguredMastraSessionLedger(root, config);
try {
  const old = newLedger.hostState.readHostStateSnapshot(identity);
  assert.deepEqual(old.work, pausedWork);
  assert.deepEqual(newLedger.resume(identity.work_id, 1), pausedJournal);
  assert.equal(old.work.binding.config_digest, runtimeConfigDigest(oldConfig));
  const current = newLedger.hostState.readHostStateSnapshot({ ...identity, work_id: 'fixture-fresh-settings' });
  assert.equal(current.work.binding.config_digest, runtimeConfigDigest(config));
} finally {
  newLedger.close();
}
console.log(
  JSON.stringify({
    status: 'pass',
    fresh_public_intake: true,
    old_config_stale_denied: true,
    executor_model: config.agents.profiles.executor.model,
    executor_reasoning: config.agents.profiles.executor.reasoning,
    native_calls: 0,
    runtime_acceptance: false,
  }),
);
