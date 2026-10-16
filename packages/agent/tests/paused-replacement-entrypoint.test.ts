import { expect, test } from 'bun:test';
import { expectAsyncReturned, expectReturned, expectRejection } from './helpers/expect-rejection.ts';
import { completeOwnedCleanup } from '../tooling/owned-cleanup-completion.ts';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId, loadRuntimeConfig, runtimeConfigDigest } from '../src/index.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { resumePausedLocalWork } from '../src/orchestration/resume-paused-local-work.ts';
import type { RuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const record = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
type StateVersion = { revision: number; digest: string };
type IssuedAction = {
  issue_id: string;
  request: { action_id: string; stage_id: string };
  instruction_activation?: { use_id: string };
  instruction_bindings?: unknown[];
};
type MainRunResult = {
  status: string;
  state_version: StateVersion;
  issued_actions: IssuedAction[];
  resume_status?: string;
};
type ReconcileResult = { status: string; retained_issue_id?: string };
type SessionLedger = ReturnType<typeof openConfiguredMastraSessionLedger>;
type OwnerSnapshot = ReturnType<SessionLedger['hostState']['readHostStateSnapshot']>;
type JournalSnapshot = NonNullable<ReturnType<SessionLedger['resume']>>;
type Launcher = (args: string[]) => Promise<unknown>;

function isLauncher(value: unknown): value is Launcher {
  return typeof value === 'function';
}

function requireModuleExports(value: unknown, label: string): Record<string, unknown> {
  // Keep the looser object check local to values returned by trusted imports.
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error(`${label} is not a module namespace.`);
  return value as Record<string, unknown>;
}

function requireLaunchers(
  mainModule: unknown,
  reconcileModule: unknown,
): {
  run: Launcher;
  runReconcileArtifacts: Launcher;
} {
  const main = requireModuleExports(mainModule, 'Launcher module');
  const reconcile = requireModuleExports(reconcileModule, 'Reconciliation module');
  const run = main.run;
  const runReconcileArtifacts = reconcile.runReconcileArtifacts;
  if (!isLauncher(run) || !isLauncher(runReconcileArtifacts)) throw new Error('Fixture launchers are unavailable.');
  return { run, runReconcileArtifacts };
}

test('launcher module namespaces require callable named exports', async () => {
  const mainUrl = 'data:text/javascript,export const run = async () => undefined';
  const reconcileUrl = 'data:text/javascript,export const runReconcileArtifacts = async () => undefined';
  const invalidUrl = 'data:text/javascript,export const run = "not a launcher"';
  const main = requireModuleExports(await import(mainUrl), 'Control main module');
  const reconcile = requireModuleExports(await import(reconcileUrl), 'Control reconciliation module');
  const launchers = requireLaunchers(main, reconcile);
  expect(main.run).toBe(launchers.run);
  expect(reconcile.runReconcileArtifacts).toBe(launchers.runReconcileArtifacts);
  const invalid: unknown = await import(invalidUrl);
  expect(() => requireLaunchers(invalid, reconcile)).toThrow('Fixture launchers are unavailable.');
});

test('runtime-code rebind rejects malformed public arguments before reading project state', async () => {
  const { runRuntimeCodeRebind } = await import('../bin/runtime-code-rebind.ts');
  const root = path.join(tmpdir(), 'vida-runtime-code-argument-' + randomUUID());
  await expectRejection(
    runRuntimeCodeRebind(['--kind', 'runtime-code', '--mode', 'inspect', '--project-root', root]),
    'kind, mode, root or repair ID invalid',
  );
  await expectRejection(
    runRuntimeCodeRebind([
      '--kind',
      'runtime-code',
      '--kind',
      'runtime-code',
      '--mode',
      'inspect',
      '--project-root',
      root,
      '--repair-id',
      'argument-check',
    ]),
    'arguments invalid',
  );
  expect(existsSync(path.join(root, 'agent-runtime.config.v1.yaml'))).toBe(false);
});

function assertOwnerSnapshot(snapshot: OwnerSnapshot): asserts snapshot is OwnerSnapshot & {
  work: NonNullable<OwnerSnapshot['work']>;
  ledger: NonNullable<OwnerSnapshot['ledger']>;
  workVersion: NonNullable<OwnerSnapshot['workVersion']>;
  ledgerVersion: NonNullable<OwnerSnapshot['ledgerVersion']>;
} {
  if (
    snapshot.work === null ||
    snapshot.ledger === null ||
    snapshot.workVersion === null ||
    snapshot.ledgerVersion === null
  )
    throw new Error('Fixture owner snapshot is incomplete.');
}

function requireVersion(version: StateVersion | null, label: string): StateVersion {
  if (version === null) throw new Error(`${label} is missing.`);
  return version;
}

function requireJournal(snapshot: ReturnType<SessionLedger['resume']>, label: string): JournalSnapshot {
  if (snapshot === null || snapshot === undefined) throw new Error(`${label} is missing.`);
  return snapshot;
}

function currentJournalVersion(ledger: SessionLedger, workId: string, label: string): StateVersion {
  return requireVersion(requireJournal(ledger.resume(workId, 1), label).version, label);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error(`${label} is not an object.`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} is not a string.`);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array.`);
  return value;
}

function at<T>(items: readonly T[], index: number, label: string): T {
  const value = items[index];
  if (value === undefined) throw new Error(`${label} is missing at index ${index}.`);
  return value;
}

function parseMainRunResult(value: unknown): MainRunResult {
  if (typeof value !== 'object' || value === null) throw new Error('Launcher returned no result object.');
  if (!('status' in value) || typeof value.status !== 'string') throw new Error('Launcher result has no status.');
  if (!('state_version' in value) || typeof value.state_version !== 'object' || value.state_version === null)
    throw new Error('Launcher result has no state version.');
  if (!('revision' in value.state_version) || typeof value.state_version.revision !== 'number')
    throw new Error('Launcher result has an invalid state revision.');
  if (!('digest' in value.state_version) || typeof value.state_version.digest !== 'string')
    throw new Error('Launcher result has an invalid state digest.');
  const rawIssuedActions = 'issued_actions' in value ? value.issued_actions : [];
  if (!Array.isArray(rawIssuedActions)) throw new Error('Launcher result has an invalid issued action list.');
  const issuedActions = rawIssuedActions.map((candidate: unknown): IssuedAction => {
    const item = requireRecord(candidate, 'Launcher issued action');
    const issueId = requireString(item.issue_id, 'Issued action ID');
    const request = requireRecord(item.request, 'Issued action request');
    const actionId = requireString(request.action_id, 'Issued action request action ID');
    const stageId = requireString(request.stage_id, 'Issued action request stage ID');
    let instructionActivation: { use_id: string } | undefined;
    if (item.instruction_activation !== undefined) {
      const activation = requireRecord(item.instruction_activation, 'Issued action instruction activation');
      instructionActivation = { use_id: requireString(activation.use_id, 'Instruction activation use ID') };
    }
    let instructionBindings: unknown[] | undefined;
    if (item.instruction_bindings !== undefined)
      instructionBindings = requireArray(item.instruction_bindings, 'Issued action instruction bindings');
    return {
      issue_id: issueId,
      request: { action_id: actionId, stage_id: stageId },
      ...(instructionActivation === undefined ? {} : { instruction_activation: instructionActivation }),
      ...(instructionBindings === undefined ? {} : { instruction_bindings: instructionBindings }),
    };
  });
  const resumeStatus = 'resume_status' in value ? value.resume_status : undefined;
  if (resumeStatus !== undefined && typeof resumeStatus !== 'string')
    throw new Error('Launcher result has an invalid resume status.');
  return {
    status: value.status,
    state_version: { revision: value.state_version.revision, digest: value.state_version.digest },
    issued_actions: issuedActions,
    ...(typeof resumeStatus === 'string' ? { resume_status: resumeStatus } : {}),
  };
}

function parseReconcileResult(value: unknown): ReconcileResult {
  if (typeof value !== 'object' || value === null || !('status' in value) || typeof value.status !== 'string')
    throw new Error('Reconciliation returned no status.');
  const retainedIssueId = 'retained_issue_id' in value ? value.retained_issue_id : undefined;
  if (retainedIssueId !== undefined && typeof retainedIssueId !== 'string')
    throw new Error('Reconciliation returned an invalid retained issue ID.');
  return {
    status: value.status,
    ...(typeof retainedIssueId === 'string' ? { retained_issue_id: retainedIssueId } : {}),
  };
}
const createFixture = (root: string, bundleName = 'agent-runtime-new', multiProject = false) => {
  const fixtureBundle = path.join(root, bundleName);
  if (bundleName === 'vida-agent') {
    mkdirSync(fixtureBundle);
    for (const entry of [
      'src',
      'dist',
      'bin',
      'tooling',
      'schemas',
      'instructions',
      'templates',
      'package.json',
      'bunfig.toml',
      'TESTING.md',
      'bun.lock',
      '.bun-version',
    ])
      cpSync(path.join(packageRoot, entry), path.join(fixtureBundle, entry), { recursive: true, dereference: false });
    symlinkSync(
      path.join(packageRoot, 'node_modules'),
      path.join(fixtureBundle, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
  } else {
    mkdirSync(path.join(fixtureBundle, 'schemas'), { recursive: true });
    cpSync(path.join(packageRoot, 'templates'), path.join(fixtureBundle, 'templates'), { recursive: true });
    cpSync(
      path.join(packageRoot, 'schemas', 'runtime-initialization.v1.schema.json'),
      path.join(fixtureBundle, 'schemas', 'runtime-initialization.v1.schema.json'),
    );
    cpSync(path.join(packageRoot, 'TESTING.md'), path.join(fixtureBundle, 'TESTING.md'));
  }
  writeFileSync(path.join(root, 'AGENTS.md'), '# Mutation fixture\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Mutation fixture\n');
  let configText = readFileSync(path.join(packageRoot, 'templates', 'agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{REPOSITORY}}', 'mutation-repository')
    .replaceAll('{{PROJECT}}', 'mutation-project')
    .replaceAll('{{BUNDLE}}', bundleName);
  if (multiProject) {
    configText = configText.replaceAll('\r\n', '\n');
    const projectBlock = configText.match(/(?<=\nprojects:\n)[\s\S]*?(?=\nagents:)/)?.[0];
    if (!projectBlock) throw new Error('Mutation fixture project template is missing.');
    mkdirSync(path.join(root, 'mutation-project-root', bundleName), { recursive: true });
    mkdirSync(path.join(root, 'alpha-project-root'));
    configText = configText.replace(
      projectBlock,
      projectBlock.replace('    project_root: .', '    project_root: mutation-project-root') +
        '\n' +
        projectBlock
          .replaceAll('mutation-project', 'alpha-project')
          .replace('    project_root: .', '    project_root: alpha-project-root'),
    );
    configText = configText.replace(
      '\nruntime:',
      '\n    - id: local-alpha-project\n      provider: local\n      project_id: "alpha-project"\n      tenant_id: local\n      namespace: "alpha-project"\nruntime:',
    );
  }
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), configText);
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}\n');
  const config = loadRuntimeConfig(root);
  const schema = readFileSync(path.join(fixtureBundle, 'schemas', 'runtime-initialization.v1.schema.json'));
  const initializationPath = path.join(root, '.agent', 'runtime-initialization.v1.json');
  const initialization: RuntimeInitializationReceipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((project) => project.project_id).sort(),
    integrations_digest: canonicalJsonDigest(config.integrations),
    workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
    workspace_binding_status: 'pending',
    bundle: config.runtime.bundle,
    config_digest: runtimeConfigDigest(config),
    schema_sha256: createHash('sha256').update(schema).digest('hex'),
    templates: fixtureInitializationTemplates(root, fixtureBundle),
    created_at: new Date().toISOString(),
  };
  mkdirSync(path.dirname(initializationPath), { recursive: true });
  writeFileSync(initializationPath, record(initialization));
  const args = [
    '--project-root',
    root,
    '--repository',
    'mutation-repository',
    '--project',
    'mutation-project',
    '--work-path',
    multiProject ? `mutation-project-root/${bundleName}` : bundleName,
    '--work-id',
    `mutation-run-${randomUUID()}`,
    '--attempt',
    '1',
    '--scope-digest',
    'a'.repeat(64),
    '--team',
    'default-development',
    '--kind',
    'research',
    '--intent',
    'information_research',
    '--workflow',
    'information_research_light',
  ];
  return { args, initialization, initializationPath, fixtureBundle };
};
const asTaskExecution = (args: string[]): string[] =>
  args.map((value, index) =>
    args[index - 1] === '--workflow' || args[index - 1] === '--intent'
      ? 'task_execution'
      : args[index - 1] === '--kind'
        ? 'task'
        : value,
  );
const createImplementationTask = (root: string, previousArgs: string[] | null = null) => {
  let fixture: ReturnType<typeof createFixture> | undefined;
  let base: string[];
  if (previousArgs !== null) {
    base = previousArgs.map((value, index) =>
      previousArgs[index - 1] === '--work-id' ? `mutation-run-${randomUUID()}` : value,
    );
  } else {
    fixture = createFixture(root, 'vida-agent');
    base = fixture.args;
  }
  const workId = base[base.indexOf('--work-id') + 1];
  if (workId === undefined) throw new Error('Fixture work ID argument is missing.');
  mkdirSync(path.join(root, 'src', 'dist'), { recursive: true });
  if (!existsSync(path.join(root, 'src', 'dist', 'task.ts')))
    writeFileSync(path.join(root, 'src', 'dist', 'task.ts'), 'export const task = true;\n');
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md', 'src/task.ts']);
  const scopeId = `${workId}-scope`;
  const workDir = path.join(root, '.agent', 'work', workId);
  mkdirSync(workDir, { recursive: true });
  const relative = (name: string) => `.agent/work/${workId}/${name}`;
  const scope = {
    schema: 'ImplementationScope/v1',
    scope_id: scopeId,
    work_id: workId,
    source_revision: source.digest,
    ac_ids: ['AC-TASK-1'],
    allowed_paths: ['AGENT.sidecar.md', 'src/task.ts'],
    implementation_paths: ['src/task.ts'],
    documentation_paths: [],
    changed_symbols: [],
    non_goals: [],
    acceptance_trace: ['AC-TASK-1'],
    behavior_trace: ['SR-TASK-1'],
    test_trace: ['fixture'],
    diagnostic_trace: ['fixture'],
    attribution: { thread_id: 'fixture-native-session', pointer: relative('intake.json') },
    owner: 'fixture',
    created_at: new Date().toISOString(),
  };
  const acceptance = {
    schema: 'AcceptanceManifest/v1',
    id: `${workId}-acceptance`,
    version: 1,
    ac_ids: ['AC-TASK-1'],
    source: 'AGENT.sidecar.md',
    scope: scopeId,
    source_revision: source.digest,
    contracts: [{ id: 'AC-TASK-1', definition: 'Scoped task is accepted.', sr: 'SR-TASK-1', evidence: ['fixture'] }],
  };
  const workItem = {
    schema: 'WorkItem/v1',
    id: workId,
    provider: 'local',
    provider_type: 'Task',
    canonical_kind: 'task',
    intent: 'task_execution',
    project_id: 'mutation-project',
    title: 'Fixture scoped task',
    description: '',
    labels: [],
    risk_flags: [],
  };
  const intake = {
    schema: 'VidaLocalSessionIntake/v1',
    native_session_handle: 'fixture-native-session',
    work_item: workItem,
    scope_path: relative('scope.json'),
    acceptance_path: relative('acceptance.json'),
    runtime_code_paths: ['vida-agent/bin/run.ts'],
    route: 'R2',
    risk: 'medium',
    change_kind: 'fix',
  };
  writeFileSync(path.join(workDir, 'scope.json'), record(scope));
  writeFileSync(path.join(workDir, 'acceptance.json'), record(acceptance));
  writeFileSync(path.join(workDir, 'intake.json'), record(intake));
  const args = asTaskExecution(base)
    .map((value, index) => (base[index - 1] === '--scope-digest' ? source.digest : value))
    .concat('--intake', path.join(workDir, 'intake.json'));
  return { args, workId, initialization: fixture?.initialization, initializationPath: fixture?.initializationPath };
};

const fixtureObservation = (
  item: { issue_id: string; request: { action_id: string } },
  index: number,
  root: string,
  synthesis = false,
  sourceIds: string[] = [],
) => {
  const sourceBytes = readFileSync(path.join(root, 'AGENT.sidecar.md'));
  const sourceDigest = createHash('sha256').update(sourceBytes).digest('hex');
  const sourceId = `fixture-source-${index}`;
  const sources = synthesis ? sourceIds : [sourceId];
  const shared = {
    uncertainties: [],
    conflicts: [],
    br_ids: [],
    sr_ids: ['SR-RESEARCH-1'],
    ac_ids: ['AC-RESEARCH-1'],
    gap_ids: [],
    options: [
      {
        option_id: 'retain',
        label: 'Retain evidence',
        description: 'Preserve the read-only finding.',
        evidence_refs: sources,
      },
    ],
    recommendation: {
      option_id: 'retain',
      rationale: 'Fixture source supports the finding.',
      evidence_refs: sources,
    },
    completeness: {
      status: 'pass',
      required_questions: ['What does the fixture show?'],
      answered_questions: ['What does the fixture show?'],
      missing_questions: [],
      material_gaps: [],
      external_validation: {
        required: false,
        source_count: 0,
        minimum_sources: 0,
        status: 'not_required',
        live_check: null,
      },
    },
    readiness: 'informational',
  };
  const output = synthesis
    ? {
        schema: 'VidaSynthesisObservationOutput/v1',
        topic: 'Read-only fixture research',
        findings: [
          {
            finding_id: 'fixture-synthesis',
            statement: 'Three fixture research results remain informational.',
            source_refs: sources,
            evidence_class: 'Static',
            status: 'confirmed',
          },
        ],
        ...shared,
      }
    : {
        schema: 'VidaResearchObservationOutput/v1',
        topic: 'Read-only fixture research',
        objective: 'Inspect fixture source without changing code.',
        question: 'What does the fixture show?',
        source_refs: [
          {
            source_id: sourceId,
            source_kind: 'internal',
            locator: `AGENT.sidecar.md#fixture-${index}`,
            title: 'Fixture sidecar',
            claim: 'AC-RESEARCH-1 SR-RESEARCH-1: this fixture is read-only research.',
            retrieved_at: '2026-09-28T00:00:00Z',
            version_or_date: '2026-09-28',
            independence_group: 'fixture',
            digest: sourceDigest,
          },
        ],
        findings: [
          {
            finding_id: `fixture-${index}`,
            statement: 'The fixture source is present.',
            source_ids: [sourceId],
            evidence_class: 'Code',
            status: 'confirmed',
          },
        ],
        evidence_classes: ['Code'],
        ...shared,
      };
  const summary = JSON.stringify(output);
  return {
    schema: 'VidaSessionObservation/v1',
    action_id: item.request.action_id,
    issue_id: item.issue_id,
    agent_id: 'fixture-native-agent',
    tool_call_ref: `fixture-native-call:${item.request.action_id}`,
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: sources,
  };
};

test.each([false, true])(
  'public launcher replaces paused implementation research after install (crash after lease resume: %s)',
  async (simulateCrashAfterResume: boolean) => {
    const workflow = 'implementation_change';
    const root = mkdtempSync(path.join(tmpdir(), 'vida-replacement-positive-'));
    let ledger: SessionLedger | undefined;
    let testFailure: { value: unknown } | undefined;
    let retainFixtureRoot = false;
    try {
      const fixture = createImplementationTask(root);
      const privatePackage = path.join(root, 'vida-agent');
      const runtimeConfigSource = await import('../src/config/runtime-config.ts');
      const canonicalRuntimeAccess = runtimeConfigSource.runtimePackageAccess();
      const canonicalRuntimePaths = [
        ...runtimeConfigSource.runtimePackageCodePaths('vida-agent', canonicalRuntimeAccess),
      ];
      const runtimePath = at(canonicalRuntimePaths, 0, 'Canonical runtime code path');
      const runtimeFile = path.join(root, runtimePath);
      const canonicalRuntimeFile = path.join(
        canonicalRuntimeAccess.repository_root,
        runtimePath.slice('vida-agent/'.length),
      );
      const canonicalRuntimeBytes = readFileSync(canonicalRuntimeFile);
      writeFileSync(
        runtimeFile,
        Buffer.concat([canonicalRuntimeBytes, Buffer.from('\n// fixture predecessor before canonical rebind\n')]),
      );
      const launchers = requireLaunchers(
        await import(pathToFileURL(path.join(privatePackage, 'bin/run.ts')).href),
        await import(pathToFileURL(path.join(privatePackage, 'bin/reconcile-artifacts.ts')).href),
      );
      const runtimeCodeRebind = await import('../bin/runtime-code-rebind.ts');
      const forwardReviewProof = await import('../bin/forward-review-proof.ts');
      const run = async (runArgs: string[]): Promise<MainRunResult> => parseMainRunResult(await launchers.run(runArgs));
      const runReconcileArtifacts = async (runArgs: string[]): Promise<ReconcileResult> => {
        const kindIndex = runArgs.indexOf('--kind');
        const rawResult =
          kindIndex >= 0 && runArgs[kindIndex + 1] === 'runtime-code'
            ? await runtimeCodeRebind.runRuntimeCodeRebind(runArgs)
            : await launchers.runReconcileArtifacts(runArgs);
        return parseReconcileResult(rawResult);
      };
      const { createNativeTsPublicCliFixtureRunner } = await import('./helpers/public-cli-fixture-runner.ts');
      const publicCli = createNativeTsPublicCliFixtureRunner({
        bundleRoot: privatePackage,
        diagnosticReceiptPath: path.join(root, '.agent', 'work', 'public-cli-entrypoint.jsonl'),
        fixtureRoot: root,
        onUnknown: () => {
          retainFixtureRoot = true;
        },
      });
      const runPublicCli = (runArgs: string[]): MainRunResult => {
        const result = publicCli.spawn(runArgs);
        if (result.status !== 0 || result.signal !== null || result.error !== undefined) {
          retainFixtureRoot = true;
          throw new Error(
            `Public run CLI did not exit successfully: ${JSON.stringify({
              status: result.status,
              signal: result.signal,
              error: result.error?.message,
              stderr: result.stderr?.slice(-4096),
            })}`,
          );
        }
        let value: unknown;
        try {
          value = JSON.parse(result.stdout);
        } catch {
          throw new Error('Public run CLI returned malformed JSON.');
        }
        return parseMainRunResult(value);
      };
      const args = fixture.args.map((value, index) =>
        fixture.args[index - 1] === '--workflow'
          ? workflow
          : workflow === 'implementation_change' && fixture.args[index - 1] === '--kind'
            ? 'task'
            : workflow === 'implementation_change' && fixture.args[index - 1] === '--intent'
              ? 'implementation_change'
              : value,
      );
      const workId = fixture.workId;
      if (workflow === 'implementation_change') {
        const intakePath = path.join(root, '.agent', 'work', workId, 'intake.json');
        const intakeValue: unknown = JSON.parse(readFileSync(intakePath, 'utf8'));
        const intake = requireRecord(intakeValue, 'Fixture intake');
        writeFileSync(
          intakePath,
          record({
            ...intake,
            work_item: {
              ...requireRecord(intake.work_item, 'Fixture intake work item'),
              canonical_kind: 'task',
              provider_type: 'Task',
              intent: 'implementation_change',
            },
          }),
        );
      }
      const continuing = args.slice(0, -2);
      const prepared = await run(args);
      const expected = (version: { revision: number; digest: string }) => [
        '--expected-revision',
        String(version.revision),
        '--expected-digest',
        version.digest,
      ];
      const reportFile = path.join(root, '.agent', 'work', workId, 'report.json');
      const observationFor = (item: Parameters<typeof fixtureObservation>[0], index: number) => {
        const observed = fixtureObservation(item, index, root);
        if (workflow !== 'implementation_change') return observed;
        const outputValue: unknown = JSON.parse(observed.summary);
        const output = requireRecord(outputValue, 'Fixture observation output');
        const summary = JSON.stringify({
          ...output,
          topic: `${requireString(output.topic, 'Fixture observation topic')} ${index}`,
          ac_ids: ['AC-TASK-1'],
          sr_ids: ['SR-TASK-1'],
          source_refs: requireArray(output.source_refs, 'Fixture source references').map((source) => ({
            ...requireRecord(source, 'Fixture source reference'),
            claim: 'AC-TASK-1 SR-TASK-1: the implementation fixture source is present.',
          })),
        });
        return { ...observed, summary, output_digest: canonicalJsonDigest(summary) };
      };
      const report = async (
        version: { revision: number; digest: string },
        observation: ReturnType<typeof observationFor>,
      ) => {
        writeFileSync(reportFile, record(observation));
        return run([...continuing, ...expected(version), '--report', reportFile]);
      };
      let current = await run([...continuing, ...expected(prepared.state_version), '--issue-wave', 'true']);
      const original = current.issued_actions;
      expect(original.length).toBe(3);
      current = await report(current.state_version, observationFor(at(original, 0, 'original action'), 0));
      current = await report(current.state_version, observationFor(at(original, 2, 'original action'), 2));
      ledger = openConfiguredMastraSessionLedger(root);
      const activeLedger = ledger;
      const config = loadRuntimeConfig(root);
      const project = loadProjectSetContext(root, config, 'mutation-repository', ['mutation-project']);
      const identity = {
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        integrations_digest: project.integrations_digest,
        work_id: workId,
      };
      const readOwnerSnapshot = () => {
        const snapshot = activeLedger.hostState.readHostStateSnapshot(identity);
        assertOwnerSnapshot(snapshot);
        return snapshot;
      };
      const now = new Date().toISOString();
      const pauseFixtureOwner = (pauseId: string) => {
        const pauseAt = new Date().toISOString();
        const host = readOwnerSnapshot();
        if (host.work.lease === null) throw new Error('Fixture owner has no active lease.');
        const ticket = host.ledger.tickets.find((entry) => entry.ticket_id === host.work.lease?.ticket_id);
        if (ticket === undefined) throw new Error('Fixture owner ticket is missing.');
        const claim = host.ledger.claims.find(
          (entry) => entry.ticket_id === ticket.ticket_id && entry.status === 'active',
        );
        if (claim === undefined) throw new Error('Fixture owner claim is missing.');
        activeLedger.hostState.compareAndSwapHostState({
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          expectedMaintenanceGeneration: host.maintenanceGeneration,
          nextWork: {
            ...host.work,
            revision: host.work.revision + 1,
            lease: null,
            execution: { ...host.work.execution, status: 'suspended', phase: 'awaiting_followup' },
            lifecycle: {
              ...host.work.lifecycle,
              revision: host.work.lifecycle.revision + 1,
              next_action: 'Owner paused the unknown read-only research issue.',
            },
          },
          nextLedger: {
            ...host.ledger,
            revision: host.ledger.revision + 1,
            tickets: host.ledger.tickets.map((entry) =>
              entry.ticket_id === ticket.ticket_id
                ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
                : entry,
            ),
            claims: host.ledger.claims.map((entry) =>
              entry.claim_id === claim.claim_id ? { ...entry, status: 'released', renewed_at: pauseAt } : entry,
            ),
            operations: [
              ...host.ledger.operations,
              {
                schema: 'CoordinationOperation/v1',
                operation_id: `pause-${pauseId}-${workId}`,
                kind: 'release',
                ticket_id: ticket.ticket_id,
                work_id: workId,
                thread_id: ticket.thread_id,
                source_revision: ticket.source_revision,
                resources: ticket.exclusive_resources,
                from_ledger_revision: host.ledger.revision,
                to_ledger_revision: host.ledger.revision + 1,
                decided_by: ticket.thread_id,
                decision_pointer: 'fixture-owner-pause',
                created_at: pauseAt,
              },
            ],
          },
        });
      };
      pauseFixtureOwner('original');
      const repair = [
        '--kind',
        'readonly-dispatch',
        '--project-root',
        root,
        '--repair-id',
        'fixture-replacement',
        '--actor',
        'fixture-owner',
        '--timestamp',
        now,
        '--projects',
        'mutation-project',
        '--work-id',
        workId,
        '--attempt',
        '1',
        '--action-id',
        at(original, 1, 'original action').request.action_id,
        '--issue-id',
        at(original, 1, 'original action').issue_id,
        '--native-handle',
        'fixture-native-session',
      ];
      expect((await runReconcileArtifacts(['--mode', 'plan', ...repair])).status).toBe('planned');
      expect((await runReconcileArtifacts(['--mode', 'apply', ...repair.slice(0, 6)])).status).toBe('prepared');
      let pausedVersion = currentJournalVersion(activeLedger, workId, 'Paused journal version');
      if (workflow === 'implementation_change') {
        const switched = activeLedger.activateReadOnlyReplacement(
          workId,
          1,
          pausedVersion,
          at(original, 1, 'original action').request.action_id,
        );
        expect(at(switched.snapshot.state.items, 1, 'replacement state item').issue_id).toBe(
          switched.dispatch.issue_id,
        );
        const switchedOwner = readOwnerSnapshot();
        expect(switchedOwner.work.lease).toBeNull();
        pausedVersion = requireVersion(switched.snapshot.version, 'Replacement journal version');
        const pausedOwner = readOwnerSnapshot();
        const resumed = resumePausedLocalWork({
          store: activeLedger.hostState,
          ledger: activeLedger,
          identity,
          attempt: 1,
          expectedWork: pausedOwner.workVersion,
          expectedLedger: pausedOwner.ledgerVersion,
          expectedJournal: pausedVersion,
          nativeSessionHandle: 'fixture-native-session',
          configDigest: runtimeConfigDigest(config),
          sourceDigest: (() => {
            const scope = switched.snapshot.state.source_scope;
            if (scope === null || scope === undefined) throw new Error('Replacement source scope is missing.');
            return scope.digest;
          })(),
        });
        expect(resumed.status).toBe('resumed');
        // The raw intake listed only bin/run; omitted engine files still bind freshness.
        const canonicalIntake = readOwnerSnapshot().work.artifacts.find(
          (ref) => ref.artifact_id === 'local-session-intake',
        );
        if (canonicalIntake === undefined) throw new Error('Canonical fixture intake is missing.');
        const intakeValue: unknown = JSON.parse(readFileSync(path.join(root, canonicalIntake.path), 'utf8'));
        const intakeRecord = requireRecord(intakeValue, 'Canonical fixture intake');
        const runtimePaths = requireArray(intakeRecord.runtime_code_paths, 'Runtime code paths').map((entry) =>
          requireString(entry, 'Runtime code path'),
        );
        expect(runtimePaths).toEqual(canonicalRuntimePaths);
        const manifestFiles = () =>
          runtimePaths.map((relative: string) => {
            const bytes = readFileSync(path.join(root, relative));
            return { path: relative, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
          });
        const parentManifest = { schema: 'VidaAgentPreparedPayload/v1', files: manifestFiles() };
        writeFileSync(runtimeFile, canonicalRuntimeBytes);
        const newBytes = readFileSync(runtimeFile);
        expect(newBytes).toEqual(canonicalRuntimeBytes);
        const successorManifest = { schema: 'VidaAgentPreparedPayload/v1', files: manifestFiles() };
        const canonicalManifestFiles = runtimePaths.map((relative) => {
          const bytes = readFileSync(
            path.join(canonicalRuntimeAccess.repository_root, relative.slice('vida-agent/'.length)),
          );
          return { path: relative, size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
        });
        expect(parentManifest.files.map((entry) => entry.path)).toEqual(canonicalRuntimePaths);
        expect(successorManifest.files).toEqual(canonicalManifestFiles);
        const oldRuntimeManifestEntry = parentManifest.files.find((entry) => entry.path === runtimePath);
        const newRuntimeManifestEntry = successorManifest.files.find((entry) => entry.path === runtimePath);
        expect(oldRuntimeManifestEntry).toBeDefined();
        expect(newRuntimeManifestEntry).toBeDefined();
        expect(oldRuntimeManifestEntry?.sha256).not.toBe(newRuntimeManifestEntry?.sha256);
        const forwardId = 'fixture-runtime-code-forward';
        const forwardDir = path.join(root, '.agent', 'cutover', forwardId);
        const manifestSha = (value: unknown) => createHash('sha256').update(record(value)).digest('hex');
        const beforeDenied = readOwnerSnapshot();
        await Promise.resolve(
          expect(run([...continuing, ...expected(pausedVersion), '--issue-wave', 'true'])).rejects.toThrow(
            'Admitted runtime code changed',
          ),
        );
        expect(currentJournalVersion(activeLedger, workId, 'Paused journal version')).toEqual(pausedVersion);
        expect(readOwnerSnapshot().workVersion).toEqual(beforeDenied.workVersion);
        expect(readOwnerSnapshot().ledgerVersion).toEqual(beforeDenied.ledgerVersion);
        mkdirSync(forwardDir, { recursive: true });
        writeFileSync(path.join(forwardDir, 'parent-payload.manifest.v1.json'), record(parentManifest));
        writeFileSync(path.join(forwardDir, 'successor-payload.manifest.v1.json'), record(successorManifest));
        writeFileSync(
          path.join(forwardDir, 'forward-intent.v1.json'),
          record({
            schema: 'VidaForwardUpdateMaintenance/v1',
            operation_id: forwardId,
            old_payload_manifest_sha256: manifestSha(parentManifest),
            new_payload_manifest_sha256: manifestSha(successorManifest),
          }),
        );
        expect(() =>
          forwardReviewProof.verifyForwardReviewSet(root, forwardId, manifestSha(successorManifest), []),
        ).toThrow('forward review set invalid');
        writeFileSync(
          path.join(root, '.agent', 'active-runtime-selector.v1.json'),
          record({
            payload_manifest_sha256: manifestSha(successorManifest),
          }),
        );
        const rebind = [
          '--kind',
          'runtime-code',
          '--project-root',
          root,
          '--repair-id',
          'fixture-runtime-code-rebind',
          '--actor',
          'fixture-owner',
          '--timestamp',
          new Date().toISOString(),
          '--projects',
          'mutation-project',
          '--work-id',
          workId,
          '--attempt',
          '1',
          '--action-id',
          at(original, 1, 'original action').request.action_id,
          '--issue-id',
          switched.dispatch.issue_id,
          '--native-handle',
          'fixture-native-session',
          '--forward-operation-id',
          forwardId,
          '--owner-no-call-ref',
          'fixture-owner-attests-no-native-call',
        ];
        const selectorFile = path.join(root, '.agent', 'active-runtime-selector.v1.json');
        writeFileSync(selectorFile, record({ payload_manifest_sha256: '0'.repeat(64) }));
        await Promise.resolve(
          expect(runReconcileArtifacts(['--mode', 'inspect', ...rebind])).rejects.toThrow(
            'installed forward lineage or selector differs',
          ),
        );
        writeFileSync(selectorFile, record({ payload_manifest_sha256: manifestSha(successorManifest) }));
        pauseFixtureOwner('after-forward');
        const pausedForInstall = readOwnerSnapshot();
        expect(pausedForInstall.work.execution.status).toBe('suspended');
        expect(pausedForInstall.work.lease).toBeNull();
        const stateBeforeCodePlan = readOwnerSnapshot();
        const journalBeforeCodePlan = currentJournalVersion(activeLedger, workId, 'Journal before code rebind plan');
        const plannedCodeRebind = await expectAsyncReturned(() => runReconcileArtifacts(['--mode', 'plan', ...rebind]));
        expect(plannedCodeRebind.status).toBe('planned');
        const stateAfterCodePlan = readOwnerSnapshot();
        expect(stateAfterCodePlan.work).toEqual(stateBeforeCodePlan.work);
        expect(stateAfterCodePlan.ledger).toEqual(stateBeforeCodePlan.ledger);
        expect(stateAfterCodePlan.workVersion).toEqual(stateBeforeCodePlan.workVersion);
        expect(stateAfterCodePlan.ledgerVersion).toEqual(stateBeforeCodePlan.ledgerVersion);
        expect(currentJournalVersion(activeLedger, workId, 'Journal after code rebind plan')).toEqual(
          journalBeforeCodePlan,
        );
        const stateBeforeTamper = readOwnerSnapshot();
        const journalBeforeTamper = currentJournalVersion(activeLedger, workId, 'Journal version before tamper');
        const db = new Database(path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'));
        const storedRepairValue: unknown = db
          .query(
            'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE work_id=? AND logical_action_id=?',
          )
          .get(workId, at(original, 1, 'original action').request.action_id);
        const storedRepair = requireRecord(storedRepairValue, 'Stored readonly-dispatch repair');
        const payload = requireString(storedRepair.payload, 'Stored repair payload');
        const repairDigest = requireString(storedRepair.digest, 'Stored repair digest');
        const forgedValue: unknown = JSON.parse(payload);
        const forged = requireRecord(forgedValue, 'Readonly-dispatch repair payload');
        const originalPriorIssueId = requireString(forged.prior_issue_id, 'Stored repair prior issue ID');
        expect(originalPriorIssueId).not.toBe('forged-prior-issue');
        forged.prior_issue_id = 'forged-prior-issue';
        const { digest: _priorDigest, ...forgedBody } = forged;
        const forgedDigest = canonicalJsonDigest(forgedBody);
        forged.digest = forgedDigest;
        const forgedWrite = db
          .query(
            'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE work_id=? AND logical_action_id=?',
          )
          .run(record(forged), forgedDigest, workId, at(original, 1, 'original action').request.action_id);
        expect(forgedWrite.changes).toBe(1);
        const persistedTamperValue: unknown = db
          .query(
            'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE work_id=? AND logical_action_id=?',
          )
          .get(workId, at(original, 1, 'original action').request.action_id);
        const persistedTamper = requireRecord(persistedTamperValue, 'Persisted forged readonly-dispatch repair');
        expect(requireString(persistedTamper.payload, 'Persisted forged repair payload')).toBe(record(forged));
        expect(requireString(persistedTamper.digest, 'Persisted forged repair digest')).toBe(forgedDigest);
        const persistedTamperBody = requireRecord(
          JSON.parse(requireString(persistedTamper.payload, 'Persisted forged repair payload')),
          'Persisted forged repair body',
        );
        expect(requireString(persistedTamperBody.prior_issue_id, 'Persisted forged prior issue ID')).toBe(
          'forged-prior-issue',
        );
        await Promise.resolve(
          expect(runReconcileArtifacts(['--mode', 'apply', ...rebind.slice(0, 6)])).rejects.toThrow(
            'current owner, journal or issued replacement differs',
          ),
        );
        expect(readOwnerSnapshot().workVersion).toEqual(stateBeforeTamper.workVersion);
        expect(readOwnerSnapshot().ledgerVersion).toEqual(stateBeforeTamper.ledgerVersion);
        expect(currentJournalVersion(activeLedger, workId, 'Paused journal version')).toEqual(journalBeforeTamper);
        const restoreWrite = db
          .query(
            'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE work_id=? AND logical_action_id=?',
          )
          .run(payload, repairDigest, workId, at(original, 1, 'original action').request.action_id);
        expect(restoreWrite.changes).toBe(1);
        const restoredRepairValue: unknown = db
          .query(
            'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE work_id=? AND logical_action_id=?',
          )
          .get(workId, at(original, 1, 'original action').request.action_id);
        const restoredRepair = requireRecord(restoredRepairValue, 'Restored readonly-dispatch repair');
        expect(requireString(restoredRepair.payload, 'Restored repair payload')).toBe(payload);
        expect(requireString(restoredRepair.digest, 'Restored repair digest')).toBe(repairDigest);
        db.close();
        const stateBeforeUnplannedDrift = readOwnerSnapshot();
        const journalBeforeUnplannedDrift = currentJournalVersion(
          activeLedger,
          workId,
          'Journal version before unplanned runtime drift',
        );
        writeFileSync(runtimeFile, Buffer.concat([newBytes, Buffer.from('// unplanned drift\n')]));
        await expectRejection(
          launchers.runReconcileArtifacts(['--mode', 'apply', ...rebind.slice(0, 6)]),
          'runtime-code digests differ from forward manifests',
        );
        expect(readOwnerSnapshot().workVersion).toEqual(stateBeforeUnplannedDrift.workVersion);
        expect(readOwnerSnapshot().ledgerVersion).toEqual(stateBeforeUnplannedDrift.ledgerVersion);
        expect(currentJournalVersion(activeLedger, workId, 'Journal after denied unplanned runtime drift')).toEqual(
          journalBeforeUnplannedDrift,
        );
        writeFileSync(runtimeFile, newBytes);
        if (simulateCrashAfterResume) {
          const resumedBeforeRebind = resumePausedLocalWork({
            store: activeLedger.hostState,
            ledger: activeLedger,
            identity,
            attempt: 1,
            expectedWork: pausedForInstall.workVersion,
            expectedLedger: pausedForInstall.ledgerVersion,
            expectedJournal: pausedVersion,
            nativeSessionHandle: 'fixture-native-session',
            configDigest: runtimeConfigDigest(config),
            sourceDigest: (() => {
              const scope = requireJournal(activeLedger.resume(workId, 1), 'Resumed journal').state.source_scope;
              if (scope === null || scope === undefined) throw new Error('Resumed source scope is missing.');
              return scope.digest;
            })(),
          });
          expect(resumedBeforeRebind.status).toBe('resumed');
        }
        const rebound = await expectAsyncReturned(() =>
          runReconcileArtifacts(['--mode', 'apply', ...rebind.slice(0, 6)]),
        );
        expect(rebound.status).toBe('rebound');
        const resumedForRebind = readOwnerSnapshot();
        expect(resumedForRebind.work.execution.status).toBe('active');
        expect(resumedForRebind.work.lease?.ticket_id).not.toBe(resumed.ticket_id);
        expect(resumedForRebind.ledgerVersion.revision).toBe(pausedForInstall.ledgerVersion.revision + 1);
        expect(rebound.retained_issue_id).toBe(switched.dispatch.issue_id);
        const beforeRebindReplay = readOwnerSnapshot();
        const journalBeforeRebindReplay = currentJournalVersion(activeLedger, workId, 'Journal before rebind replay');
        const rebindReplay = await expectAsyncReturned(() =>
          runReconcileArtifacts(['--mode', 'resume', ...rebind.slice(0, 6)]),
        );
        expect(rebindReplay.status).toBe('already_rebound');
        expect(rebindReplay.retained_issue_id).toBe(switched.dispatch.issue_id);
        const afterRebindReplay = readOwnerSnapshot();
        expect(afterRebindReplay.work).toEqual(beforeRebindReplay.work);
        expect(afterRebindReplay.ledger).toEqual(beforeRebindReplay.ledger);
        expect(afterRebindReplay.workVersion).toEqual(beforeRebindReplay.workVersion);
        expect(afterRebindReplay.ledgerVersion).toEqual(beforeRebindReplay.ledgerVersion);
        expect(currentJournalVersion(activeLedger, workId, 'Journal after rebind replay')).toEqual(
          journalBeforeRebindReplay,
        );
        expect(
          readOwnerSnapshot()
            .work.lifecycle.references.filter((reference) => reference.kind === 'execution_approval')
            .every((reference) => reference.disposition === 'retired'),
        ).toBe(true);
        rmSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'));
        rmSync(forwardDir, { recursive: true });
      }
      current = await run([...continuing, ...expected(pausedVersion), '--issue-wave', 'true']);
      expect(current.status).toBe('wave_retrieved');
      if (workflow === 'implementation_change') {
        const replacementDispatch = activeLedger.replacementDispatch(
          workId,
          1,
          at(original, 1, 'original action').request.action_id,
        );
        if (replacementDispatch === null || replacementDispatch === undefined)
          throw new Error('Replacement dispatch is missing.');
        expect(at(current.issued_actions, 0, 'replacement action').issue_id).toBe(replacementDispatch.issue_id);
      }
      expect(current.issued_actions.length).toBe(1);
      const replacementAction = at(current.issued_actions, 0, 'replacement action');
      expect(replacementAction.issue_id).not.toBe(at(original, 1, 'original action').issue_id);
      expect(replacementAction.request.stage_id).toBe(at(original, 1, 'original action').request.stage_id);
      const activation = replacementAction.instruction_activation;
      if (activation === undefined) throw new Error('Replacement action has no instruction activation.');
      const bindings = replacementAction.instruction_bindings;
      if (bindings === undefined) throw new Error('Replacement action has no instruction bindings.');
      expect(activation.use_id).toContain(replacementAction.issue_id);
      expect(bindings.length).toBeGreaterThan(0);
      const historyPath = path.join(
        root,
        config.research_decision.paths.activation_history,
        workId,
        'instruction-activation-history.jsonl',
      );
      const historyBeforeReplay = readFileSync(historyPath, 'utf8');
      await Promise.resolve(
        expect(report(current.state_version, observationFor(at(original, 1, 'original action'), 1))).rejects.toThrow(),
      );
      expect(currentJournalVersion(activeLedger, workId, 'Current journal version')).toEqual(current.state_version);
      const reissued = await run([...continuing, ...expected(current.state_version), '--issue-wave', 'true']);
      const retriedAction = at(reissued.issued_actions, 0, 'retried action');
      expect(retriedAction.issue_id).toBe(at(current.issued_actions, 0, 'replacement action').issue_id);
      expect(readFileSync(historyPath, 'utf8')).toBe(historyBeforeReplay);
      const activationIds = historyBeforeReplay
        .trim()
        .split('\n')
        .map((line) => {
          const historyValue: unknown = JSON.parse(line);
          return requireString(requireRecord(historyValue, 'Activation history entry').use_id, 'Activation use ID');
        });
      expect(new Set(activationIds).size).toBe(activationIds.length);
      expect(activationIds.at(-1)).toContain(retriedAction.issue_id);
      current = await report(
        reissued.state_version,
        observationFor(at(reissued.issued_actions, 0, 'reissued action'), 1),
      );
      expect(current.status).toBe('replacement_observed');
      const next = simulateCrashAfterResume
        ? await expectAsyncReturned(() => run(continuing))
        : expectReturned(() => runPublicCli(continuing));
      expect(next.resume_status).not.toBe('issued_outcome_uncertain');
      expect(readOwnerSnapshot().work.lifecycle.phase).toBe('INTAKE');
    } catch (error) {
      testFailure = { value: error };
    } finally {
      let closed = false;
      completeOwnedCleanup(
        [
          () => {
            ledger?.close();
            closed = true;
          },
          () => {
            if (closed && testFailure === undefined && !retainFixtureRoot)
              rmSync(root, { recursive: true, force: true });
            else console.error(`Preserved paused replacement fixture root: ${root}`);
          },
        ],
        testFailure === undefined ? undefined : { error: testFailure.value },
      );
    }
    if (testFailure !== undefined) throw testFailure.value;
  },
  180_000,
);
