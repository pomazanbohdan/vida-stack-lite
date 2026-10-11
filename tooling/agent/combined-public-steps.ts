import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AgentRuntimeConfig } from '../../packages/agent/src/config/runtime-config.js';
import type { ScopedSourceSnapshot } from '../../packages/agent/src/orchestration/scoped-source-snapshot.js';
import type { ProjectContext } from '../../packages/agent/src/config/project-context.js';
import type { MastraSessionLedger } from '../../packages/agent/src/orchestration/persistent-session-handoff.js';
import type { WorkState } from '../../packages/agent/src/host-state.js';
import type { CoordinationLedger } from '../../packages/agent/src/contracts/envelopes.js';

type RunApi = Pick<typeof import('../../packages/agent/bin/run.ts'), 'run'>;
type ReconcileApi = Pick<typeof import('../../packages/agent/bin/reconcile-artifacts.ts'), 'runReconcileArtifacts'>;
type ConfigApi = Pick<
  typeof import('../../packages/agent/src/config/runtime-config.js'),
  'loadRuntimeConfig' | 'runtimeConfigDigest'
>;
type IdentityApi = Pick<typeof import('../../packages/agent/src/workspace-identity.js'), 'deriveWorkspaceId'>;
type PublicIngressApi = Pick<
  typeof import('../../packages/agent/src/contracts/public-ingress.js'),
  'canonicalJsonDigest'
>;
type SnapshotApi = Pick<
  typeof import('../../packages/agent/src/orchestration/scoped-source-snapshot.js'),
  'snapshotDeclaredSources'
>;
type SafeAccessApi = Pick<
  typeof import('../../packages/agent/src/config/safe-repository-access.js'),
  'requireSafeRepositoryAccess'
>;
type LedgerApi = Pick<
  typeof import('../../packages/agent/src/orchestration/persistent-session-handoff.js'),
  'openConfiguredMastraSessionLedger'
>;
type ProjectApi = Pick<typeof import('../../packages/agent/src/config/project-context.js'), 'loadProjectSetContext'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function statusOf(value: unknown): string {
  if (!isRecord(value) || typeof value.status !== 'string')
    throw new Error('selected bundle reconciliation result is invalid');
  return value.status;
}

function isRunApi(value: unknown): value is RunApi {
  return isRecord(value) && typeof value.run === 'function';
}

function isReconcileApi(value: unknown): value is ReconcileApi {
  return isRecord(value) && typeof value.runReconcileArtifacts === 'function';
}

function isConfigApi(value: unknown): value is ConfigApi {
  return (
    isRecord(value) && typeof value.loadRuntimeConfig === 'function' && typeof value.runtimeConfigDigest === 'function'
  );
}

function isIdentityApi(value: unknown): value is IdentityApi {
  return isRecord(value) && typeof value.deriveWorkspaceId === 'function';
}

function isPublicIngressApi(value: unknown): value is PublicIngressApi {
  return isRecord(value) && typeof value.canonicalJsonDigest === 'function';
}

function isSnapshotApi(value: unknown): value is SnapshotApi {
  return isRecord(value) && typeof value.snapshotDeclaredSources === 'function';
}

function isSafeAccessApi(value: unknown): value is SafeAccessApi {
  return isRecord(value) && typeof value.requireSafeRepositoryAccess === 'function';
}

function isLedgerApi(value: unknown): value is LedgerApi {
  return isRecord(value) && typeof value.openConfiguredMastraSessionLedger === 'function';
}

function isProjectApi(value: unknown): value is ProjectApi {
  return isRecord(value) && typeof value.loadProjectSetContext === 'function';
}

const rootArgument = process.argv[2];
if (typeof rootArgument !== 'string' || rootArgument.length === 0)
  throw new Error('repository root argument is required');
const root: string = rootArgument;
const source = (relative: string): string => pathToFileURL(path.join(root, 'vida-agent', relative)).href;
const runModule: unknown = await import(source('bin/run.ts'));
if (!isRunApi(runModule)) throw new Error('selected bundle run entrypoint is invalid');
const { run } = runModule;
const reconcileModule: unknown = await import(source('bin/reconcile-artifacts.ts'));
if (!isReconcileApi(reconcileModule)) throw new Error('selected bundle artifact reconciler is invalid');
const { runReconcileArtifacts } = reconcileModule;
const configModule: unknown = await import(source('src/config/runtime-config.ts'));
if (!isConfigApi(configModule)) throw new Error('selected bundle runtime configuration API is invalid');
const { loadRuntimeConfig, runtimeConfigDigest } = configModule;
const identityModule: unknown = await import(source('src/workspace-identity.ts'));
if (!isIdentityApi(identityModule)) throw new Error('selected bundle workspace identity API is invalid');
const { deriveWorkspaceId } = identityModule;
const ingressModule: unknown = await import(source('src/contracts/public-ingress.ts'));
if (!isPublicIngressApi(ingressModule)) throw new Error('selected bundle public ingress API is invalid');
const canonicalJsonDigest = ingressModule.canonicalJsonDigest;
void canonicalJsonDigest;
const snapshotModule: unknown = await import(source('src/orchestration/scoped-source-snapshot.ts'));
if (!isSnapshotApi(snapshotModule)) throw new Error('selected bundle source snapshot API is invalid');
const { snapshotDeclaredSources } = snapshotModule;
const safeAccessModule: unknown = await import(source('src/config/safe-repository-access.ts'));
if (!isSafeAccessApi(safeAccessModule)) throw new Error('selected bundle repository access API is invalid');
const { requireSafeRepositoryAccess } = safeAccessModule;
const ledgerModule: unknown = await import(source('src/orchestration/persistent-session-handoff.ts'));
if (!isLedgerApi(ledgerModule)) throw new Error('selected bundle session ledger API is invalid');
const { openConfiguredMastraSessionLedger } = ledgerModule;
const projectModule: unknown = await import(source('src/config/project-context.ts'));
if (!isProjectApi(projectModule)) throw new Error('selected bundle project context API is invalid');
const { loadProjectSetContext } = projectModule;
const record = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';
const parsedInitial: unknown = JSON.parse(
  readFileSync(path.join(root, '.agent/runtime-initialization.v1.json'), 'utf8'),
);
if (!isRecord(parsedInitial)) throw new Error('runtime initialization receipt is invalid');
const oldConfig: AgentRuntimeConfig = loadRuntimeConfig(root);
const initial = {
  ...parsedInitial,
  workspace_id: deriveWorkspaceId(oldConfig.repository.repository_id, root),
  workspace_binding_status: 'bound',
};
writeFileSync(path.join(root, '.agent/runtime-initialization.v1.json'), record(initial));
mkdirSync(path.join(root, 'project/crmbx'), { recursive: true });
function task(workId: string): string[] {
  const dir = `.agent/work/${workId}`;
  mkdirSync(path.join(root, dir), { recursive: true });
  const target = 'vida-agent/TESTING.md';
  const sourceSnapshot: ScopedSourceSnapshot = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [target]);
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: workId + '-scope',
    work_id: workId,
    source_revision: sourceSnapshot.digest,
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
    source_revision: sourceSnapshot.digest,
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
  const records: ReadonlyArray<readonly [string, unknown]> = [
    ['scope', scope],
    ['acceptance', acceptance],
    ['intake', intake],
  ];
  for (const [name, value] of records) writeFileSync(path.join(root, dir, name + '.json'), record(value));
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
    sourceSnapshot.digest,
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
await run(oldArgs);
const project = loadProjectSetContext(root, oldConfig, oldConfig.repository.repository_id, ['refactoring']);
const identity: Pick<ProjectContext, 'repository_id' | 'project_ids' | 'integrations_digest'> & { work_id: string } = {
  repository_id: project.repository_id,
  project_ids: project.project_ids,
  integrations_digest: project.integrations_digest,
  work_id: 'fixture-old-settings',
};
const ledger: MastraSessionLedger = openConfiguredMastraSessionLedger(root);
try {
  const host = ledger.hostState.readHostStateSnapshot(identity);
  const work = host.work;
  if (work === null) throw new Error('public run did not persist its work state');
  const lease = work.lease;
  assert.ok(lease);
  const coordinationLedger = host.ledger;
  if (coordinationLedger === null) throw new Error('public run did not persist its coordination ledger');
  const ticket = coordinationLedger.tickets.find((t) => t.ticket_id === lease.ticket_id);
  assert.ok(ticket);
  const time = new Date().toISOString();
  // TEST SETUP: pause an unissued admitted work; no native action/effect is fabricated.
  const nextWork: WorkState = {
    ...work,
    revision: work.revision + 1,
    lifecycle: { ...work.lifecycle, revision: work.revision + 1 },
    lease: null,
    execution: { ...work.execution, status: 'suspended', phase: 'awaiting_followup' },
  };
  const nextLedger: CoordinationLedger = {
    ...coordinationLedger,
    revision: coordinationLedger.revision + 1,
    tickets: coordinationLedger.tickets.map((entry) =>
      entry.ticket_id === ticket.ticket_id
        ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
        : entry,
    ),
    claims: coordinationLedger.claims.map((entry) =>
      entry.ticket_id === ticket.ticket_id ? { ...entry, status: 'released', renewed_at: time } : entry,
    ),
    operations: [
      ...coordinationLedger.operations,
      {
        schema: 'CoordinationOperation/v1',
        operation_id: 'fixture-pause',
        kind: 'release',
        ticket_id: ticket.ticket_id,
        work_id: identity.work_id,
        thread_id: ticket.thread_id,
        source_revision: ticket.source_revision,
        resources: ticket.exclusive_resources,
        from_ledger_revision: coordinationLedger.revision,
        to_ledger_revision: coordinationLedger.revision + 1,
        decided_by: ticket.thread_id,
        decision_pointer: 'TEST SETUP pause',
        created_at: time,
      },
    ],
  };
  ledger.hostState.compareAndSwapHostState({
    expectedWork: host.workVersion,
    expectedLedger: host.ledgerVersion,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    nextWork,
    nextLedger,
  });
} finally {
  ledger.close();
}
const pausedLedger: MastraSessionLedger = openConfiguredMastraSessionLedger(root);
let pausedWork: ReturnType<MastraSessionLedger['hostState']['readHostStateSnapshot']>['work'];
let pausedJournal: ReturnType<MastraSessionLedger['resume']>;
try {
  pausedWork = pausedLedger.hostState.readHostStateSnapshot(identity).work;
  pausedJournal = pausedLedger.resume(identity.work_id, 1);
  assert.ok(pausedWork);
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
const args = (mode: 'plan' | 'apply' | 'resume'): string[] => [
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
assert.equal(statusOf(await runReconcileArtifacts(args('apply'))), 'author_config_required');
writeFileSync(yamlPath, target);
assert.equal(statusOf(await runReconcileArtifacts(args('resume'))), 'applied');
const config: AgentRuntimeConfig = loadRuntimeConfig(root);
assert.notEqual(runtimeConfigDigest(config), runtimeConfigDigest(oldConfig));
const executorProfile = config.agents.profiles.executor;
assert.ok(executorProfile);
assert.equal(executorProfile.model, 'gpt-6.1-sol');
assert.equal(executorProfile.reasoning, 'medium');
await assert.rejects(
  () => run(oldArgs.filter((value, index) => oldArgs[index - 1] !== '--intake' && value !== '--intake')),
  /Mastra run binding differs from current context/,
);
const fresh = await run(task('fixture-fresh-settings'));
assert.ok(fresh);
const newLedger: MastraSessionLedger = openConfiguredMastraSessionLedger(root);
try {
  const old = newLedger.hostState.readHostStateSnapshot(identity);
  assert.deepEqual(old.work, pausedWork);
  assert.deepEqual(newLedger.resume(identity.work_id, 1), pausedJournal);
  assert.ok(old.work);
  assert.equal(old.work.binding.config_digest, runtimeConfigDigest(oldConfig));
  const current = newLedger.hostState.readHostStateSnapshot({ ...identity, work_id: 'fixture-fresh-settings' });
  assert.ok(current.work);
  assert.equal(current.work.binding.config_digest, runtimeConfigDigest(config));
} finally {
  newLedger.close();
}
console.log(
  JSON.stringify({
    status: 'pass',
    fresh_public_intake: true,
    old_config_stale_denied: true,
    executor_model: executorProfile.model,
    executor_reasoning: executorProfile.reasoning,
    native_calls: 0,
    runtime_acceptance: false,
  }),
);
