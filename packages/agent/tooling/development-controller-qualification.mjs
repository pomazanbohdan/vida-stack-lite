import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { initializeProjectFromBundle } from '../bin/init-core.mjs';
import { initializeProject } from '../bin/init.mjs';
import { inspectScope } from '../bin/scope.mjs';
import { run } from '../bin/run.mjs';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';

const packageRoot = path.resolve(import.meta.dirname, '..');
const parent = path.dirname(packageRoot),
  before = process.env.VIDA_CONTROLLER_QUALIFICATION_BINDING;
if (!/^[a-f0-9]{64}$/.test(before ?? '')) throw new Error('Parent qualification binding is missing.');
const scratch = mkdtempSync(path.join(parent, 'qualification-'));
const save = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value) + '\n');
};
const expected = (version) => ['--expected-revision', String(version.revision), '--expected-digest', version.digest];
let ledger;
try {
  assert.equal(Bun.version, '1.4.2');
  // Actual external-package initializer has its supported portable logical bundle.
  const initRoot = path.join(scratch, 'external-init');
  mkdirSync(initRoot);
  const initialized = await initializeProject({
    projectRoot: initRoot,
    repository: 'controller-init',
    projectMappings: ['agent=.'],
  });
  assert.equal(initialized.status, 'initialized');
  assert.equal(loadRuntimeConfig(initRoot).runtime.bundle, 'vida-agent');
  // A Source-shaped disposable target adopts current owner integrations through
  // supported reconciliation; the initialization receipt is never hand-written.
  const original = process.env.VIDA_CONTROLLER_QUALIFICATION_TARGET;
  if (!original || !path.isAbsolute(original)) throw new Error('Qualification target binding is missing.');
  const root = path.join(scratch, 'source');
  mkdirSync(root);
  for (const name of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml', 'docs'])
    cpSync(path.join(original, name), path.join(root, name), { recursive: true });
  const resources = path.join(root, 'packages/agent');
  mkdirSync(resources, { recursive: true });
  for (const name of ['templates', 'schemas', 'instructions', 'package.json', 'TESTING.md'])
    cpSync(path.join(packageRoot, name), path.join(resources, name), { recursive: true });
  const originalConfig = loadRuntimeConfig(original);
  for (const project of originalConfig.projects) {
    mkdirSync(path.join(root, project.project_root), { recursive: true });
    const docs = path.join(original, project.project_root, 'docs');
    if (existsSync(docs)) cpSync(docs, path.join(root, project.project_root, 'docs'), { recursive: true });
  }
  const sourceInit = await initializeProjectFromBundle(
    {
      projectRoot: root,
      repository: originalConfig.repository.repository_id,
      projectMappings: originalConfig.projects.map((p) => p.project_id + '=' + p.project_root),
      reconcileExisting: true,
    },
    resources,
  );
  assert.equal(sourceInit.status, 'reconciled_existing');
  const config = loadRuntimeConfig(root);
  assert.equal(config.runtime.bundle, 'packages/agent');
  const newPath = 'packages/agent/bin/controller-qualified-addition.mjs';
  mkdirSync(path.join(resources, 'bin'));
  const inspected = await inspectScope([
    '--project-root',
    root,
    '--repository',
    config.repository.repository_id,
    '--project',
    'agent',
    '--path',
    newPath,
  ]);
  const source = inspected.source ?? inspected.snapshot ?? inspected;
  const digest = inspected.scope_digest ?? source.digest;
  assert.match(digest, /^[a-f0-9]{64}$/);
  const work = 'controller-qualified-task',
    session = 'controller-qualification-session',
    pointer = 'fixture:actual-controller-qualification';
  const relative = (name) => `.agent/work/${work}/${name}`;
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: work + '-scope',
    work_id: work,
    source_revision: digest,
    ac_ids: ['AC-CONTROLLER'],
    allowed_paths: [newPath],
    implementation_paths: [newPath],
    documentation_paths: [],
    changed_symbols: [],
    non_goals: ['Physical isolation', 'Runtime acceptance'],
    acceptance_trace: ['AC-CONTROLLER'],
    behavior_trace: ['SR-CONTROLLER'],
    test_trace: ['controller qualification'],
    diagnostic_trace: ['controller qualification'],
    attribution: { thread_id: session, pointer },
    owner: 'qualification-fixture',
    created_at: new Date().toISOString(),
  };
  save(path.join(root, relative('scope.json')), scope);
  save(path.join(root, relative('acceptance.json')), {
    schema: 'AcceptanceManifest/v1',
    id: work + '-acceptance',
    version: 1,
    ac_ids: scope.ac_ids,
    source: 'fixture:controller',
    scope: scope.scope_id,
    source_revision: digest,
    contracts: [
      {
        id: 'AC-CONTROLLER',
        definition: 'Observe the allowed new bin addition through unchanged controller.',
        sr: 'SR-CONTROLLER',
        evidence: ['qualification'],
      },
    ],
  });
  const authorization = {
    schema: 'LocalSourceWriteAuthorization/v1',
    action: 'source.write',
    user_instruction_ref: pointer,
    work_id: work,
    attempt: 1,
    scope_digest: digest,
    config_digest: runtimeConfigDigest(config),
    workflow_id: 'task_execution',
    stage_ids: ['develop_task'],
    implementation_paths: [newPath],
    native_session_handle: session,
  };
  const authorizationFile = path.join(root, relative('authorization.json'));
  save(authorizationFile, authorization);
  save(path.join(root, relative('intake.json')), {
    schema: 'VidaLocalSessionIntake/v1',
    native_session_handle: session,
    work_item: {
      schema: 'WorkItem/v1',
      id: work,
      provider: 'local',
      provider_type: 'Task',
      canonical_kind: 'task',
      intent: 'task_execution',
      project_id: 'agent',
      title: 'Controller own-target bin addition qualification',
      description: 'An actual local fixture task, not a human Runtime approval.',
      labels: [],
      risk_flags: [],
    },
    scope_path: relative('scope.json'),
    acceptance_path: relative('acceptance.json'),
    source_authorization_path: relative('authorization.json'),
    runtime_code_paths: ['packages/agent/bin/run.mjs'],
    route: 'R2',
    risk: 'medium',
    change_kind: 'fix',
  });
  const base = [
    '--project-root',
    root,
    '--repository',
    config.repository.repository_id,
    '--project',
    'agent',
    '--work-path',
    'packages/agent',
    '--work-id',
    work,
    '--attempt',
    '1',
    '--scope-digest',
    digest,
    '--team',
    'default-development',
    '--kind',
    'task',
    '--intent',
    'task_execution',
    '--workflow',
    'task_execution',
  ];
  let packet = await run([...base, '--intake', path.join(root, relative('intake.json'))]);
  assert.equal(packet.resume_status, 'ready');
  packet = await run([...base, ...expected(packet.state_version), '--issue-wave', 'true']);
  assert.equal(packet.issued_actions.length, 1);
  const reportFile = path.join(root, relative('report.json'));
  async function report(item, summary, extra = {}) {
    save(reportFile, {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      agent_id: 'actual-local-fixture-executor',
      tool_call_ref: 'local-qualification:' + item.request.action_id,
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: ['fixture:actual-local-execution'],
      ...extra,
    });
    return run([...base, ...expected(packet.state_version), '--report', reportFile]);
  }
  packet = await report(
    packet.issued_actions[0],
    'Actual scoped task synthesis: add the declared bin file; no external research claim.',
  );
  // Changing the approval's paths cannot grant an undeclared target write.
  const exactAuthorization = readFileSync(authorizationFile);
  save(authorizationFile, { ...authorization, implementation_paths: ['packages/agent/bin/undeclared.mjs'] });
  await assert.rejects(() => run([...base, ...expected(packet.state_version), '--issue-wave', 'true']));
  writeFileSync(authorizationFile, exactAuthorization);
  packet = await run([...base, ...expected(packet.state_version), '--issue-wave', 'true']);
  const writer = packet.issued_actions[0];
  assert.ok(writer.host_attempt_id);
  assert.equal(writer.request.stage_id, 'develop_task');
  writeFileSync(path.join(root, newPath), 'export const qualifiedControllerAddition = true;\n', { flag: 'wx' });
  packet = await report(writer, 'Actual local executor created the declared bin module.', {
    host_attempt_id: writer.host_attempt_id,
    changed_paths: [newPath],
  });
  assert.equal(packet.status, 'resumed'); // The accepted report immediately advances to readonly assurance.
  ledger = openConfiguredMastraSessionLedger(root);
  const durable = ledger.resume(work, 1);
  assert.ok(
    [...durable.state.completed.flatMap((w) => w.items), ...durable.state.items].some(
      (item) =>
        item.observation?.host_attempt_id === writer.host_attempt_id &&
        item.observation?.status === 'reported_complete',
    ),
  );
  const project = loadProjectSetContext(root, config, config.repository.repository_id, ['agent']);
  const host = ledger.hostState.readHostStateSnapshot({
    repository_id: project.repository_id,
    project_ids: project.project_ids,
    integrations_digest: project.integrations_digest,
    work_id: work,
  });
  assert.equal(
    host.work.execution.assignment_attempts.find((a) => a.attempt_id === writer.host_attempt_id).status,
    'completed',
  );
  assert.equal(host.work.execution.status, 'active');
  assert.equal(host.work.lifecycle.phase, 'INTAKE');
  assert.ok(
    host.ledger.claims
      .filter((c) => c.status === 'active' && c.work_id === work)
      .every((c) => c.resources.every((r) => r === 'execution:' + work)),
  );
  assert.equal(loadRuntimeConfig(root).runtime.bundle, 'packages/agent');
  // Parent verifies the complete installed package before and after this child returns.
  assert.ok(existsSync(path.join(root, newPath)));
  console.log(
    JSON.stringify({
      schema: 'DevelopmentControllerQualification/v1',
      status: 'pass',
      package_binding: before,
      checks: [
        'current-package',
        'pinned-bun',
        'external-init',
        'source-layout-init',
        'public-scope',
        'actual-admission',
        'authorization-denial',
        'actual-source-report',
        'unchanged-controller',
      ],
      runtime_acceptance: false,
      fixture_root: scratch,
    }),
  );
} finally {
  ledger?.close();
  // The parent removes this owned fixture after this process releases SQLite/native handles.
}
