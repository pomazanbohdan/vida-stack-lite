import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runReconcileArtifacts } from '../bin/reconcile-artifacts.mjs';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId, loadRuntimeConfig, runtimeConfigDigest } from '../src/index.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { resumePausedLocalWork } from '../src/orchestration/resume-paused-local-work.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const record = (value) => `${JSON.stringify(value, null, 2)}\n`;
const createFixture = (root, bundleName = 'agent-runtime-new', multiProject = false) => {
  const fixtureBundle = path.join(root, bundleName);
  if (bundleName === 'vida-agent') {
    mkdirSync(fixtureBundle);
    for (const entry of [
      'src',
      'dist',
      'bin',
      'schemas',
      'instructions',
      'templates',
      'package.json',
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
  const initialization = {
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
    templates: [],
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
const asTaskExecution = (args) =>
  args.map((value, index) =>
    args[index - 1] === '--workflow' || args[index - 1] === '--intent'
      ? 'task_execution'
      : args[index - 1] === '--kind'
        ? 'task'
        : value,
  );
const createImplementationTask = (root, previousArgs = null) => {
  const fixture = previousArgs ? null : createFixture(root, 'vida-agent');
  const base = previousArgs
    ? previousArgs.map((value, index) =>
        previousArgs[index - 1] === '--work-id' ? `mutation-run-${randomUUID()}` : value,
      )
    : fixture.args;
  const workId = base[base.indexOf('--work-id') + 1];
  mkdirSync(path.join(root, 'src'), { recursive: true });
  if (!existsSync(path.join(root, 'src', 'task.ts')))
    writeFileSync(path.join(root, 'src', 'task.ts'), 'export const task = true;\n');
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md', 'src/task.ts']);
  const scopeId = `${workId}-scope`;
  const workDir = path.join(root, '.agent', 'work', workId);
  mkdirSync(workDir, { recursive: true });
  const relative = (name) => `.agent/work/${workId}/${name}`;
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
    runtime_code_paths: ['vida-agent/bin/run.mjs'],
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

const fixtureObservation = (item, index, root, synthesis = false, sourceIds = []) => {
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
  async (simulateCrashAfterResume) => {
    const workflow = 'implementation_change';
    const root = mkdtempSync(path.join(tmpdir(), 'vida-replacement-positive-'));
    let ledger;
    try {
      const fixture = createImplementationTask(root);
      // Execute the installed package through Bun so Vite cannot rewrite its
      // package identity or dependency namespace during coverage collection.
      const driver = path.join(root, '.agent/fixture-installed-run.mjs');
      writeFileSync(
        driver,
        `import { pathToFileURL } from 'node:url';
const { run } = await import(pathToFileURL(process.argv[2]).href);
try { console.log(JSON.stringify(await run(JSON.parse(process.argv[3])))); }
catch (error) { console.error(JSON.stringify({ message: error.message, code: error.code })); process.exitCode = 1; }
`,
      );
      const runInstalled = async (commandArgs) => {
        const result = spawnSync(
          process.execPath,
          [driver, path.join(root, 'vida-agent/bin/run.mjs'), JSON.stringify(commandArgs)],
          { cwd: root, encoding: 'utf8', timeout: 45_000, maxBuffer: 8 * 1024 * 1024 },
        );
        if (result.error) throw result.error;
        if (result.status !== 0) {
          const failure = JSON.parse(result.stderr);
          throw new Error(failure.message);
        }
        return JSON.parse(result.stdout);
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
        const intake = JSON.parse(readFileSync(intakePath, 'utf8'));
        writeFileSync(
          intakePath,
          record({
            ...intake,
            work_item: {
              ...intake.work_item,
              canonical_kind: 'task',
              provider_type: 'Task',
              intent: 'implementation_change',
            },
          }),
        );
      }
      const continuing = args.slice(0, -2);
      const prepared = await runInstalled(args);
      const expected = (version) => [
        '--expected-revision',
        String(version.revision),
        '--expected-digest',
        version.digest,
      ];
      const reportFile = path.join(root, '.agent', 'work', workId, 'report.json');
      const observationFor = (item, index) => {
        const observed = fixtureObservation(item, index, root);
        if (workflow !== 'implementation_change') return observed;
        const output = JSON.parse(observed.summary);
        const summary = JSON.stringify({
          ...output,
          topic: `${output.topic} ${index}`,
          ac_ids: ['AC-TASK-1'],
          sr_ids: ['SR-TASK-1'],
          source_refs: output.source_refs.map((source) => ({
            ...source,
            claim: 'AC-TASK-1 SR-TASK-1: the implementation fixture source is present.',
          })),
        });
        return { ...observed, summary, output_digest: canonicalJsonDigest(summary) };
      };
      const report = async (version, observation) => {
        writeFileSync(reportFile, record(observation));
        return runInstalled([...continuing, ...expected(version), '--report', reportFile]);
      };
      let current = await runInstalled([...continuing, ...expected(prepared.state_version), '--issue-wave', 'true']);
      const original = current.issued_actions;
      expect(original.length).toBe(3);
      current = await report(current.state_version, observationFor(original[0], 0));
      current = await report(current.state_version, observationFor(original[2], 2));
      ledger = openConfiguredMastraSessionLedger(root);
      const config = loadRuntimeConfig(root);
      const project = loadProjectSetContext(root, config, 'mutation-repository', ['mutation-project']);
      const identity = {
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        integrations_digest: project.integrations_digest,
        work_id: workId,
      };
      const now = new Date().toISOString();
      const pauseFixtureOwner = (pauseId) => {
        const pauseAt = new Date().toISOString();
        const host = ledger.hostState.readHostStateSnapshot(identity);
        const ticket = host.ledger.tickets.find((entry) => entry.ticket_id === host.work.lease.ticket_id);
        const claim = host.ledger.claims.find(
          (entry) => entry.ticket_id === ticket.ticket_id && entry.status === 'active',
        );
        expect(claim).toBeTruthy();
        ledger.hostState.compareAndSwapHostState({
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
        original[1].request.action_id,
        '--issue-id',
        original[1].issue_id,
        '--native-handle',
        'fixture-native-session',
      ];
      expect((await runReconcileArtifacts(['--mode', 'plan', ...repair])).status).toBe('planned');
      expect((await runReconcileArtifacts(['--mode', 'apply', ...repair.slice(0, 6)])).status).toBe('prepared');
      let pausedVersion = ledger.resume(workId, 1).version;
      if (workflow === 'implementation_change') {
        const switched = ledger.activateReadOnlyReplacement(workId, 1, pausedVersion, original[1].request.action_id);
        expect(switched.snapshot.state.items[1].issue_id).toBe(switched.dispatch.issue_id);
        expect(ledger.hostState.readHostStateSnapshot(identity).work.lease).toBeNull();
        pausedVersion = switched.snapshot.version;
        const pausedOwner = ledger.hostState.readHostStateSnapshot(identity);
        const resumed = resumePausedLocalWork({
          store: ledger.hostState,
          ledger,
          identity,
          attempt: 1,
          expectedWork: pausedOwner.workVersion,
          expectedLedger: pausedOwner.ledgerVersion,
          expectedJournal: pausedVersion,
          nativeSessionHandle: 'fixture-native-session',
          configDigest: runtimeConfigDigest(config),
          sourceDigest: switched.snapshot.state.source_scope.digest,
        });
        expect(resumed.status).toBe('resumed');
        const runtimePath = 'vida-agent/bin/run.mjs';
        const runtimeFile = path.join(root, runtimePath);
        const oldBytes = readFileSync(runtimeFile);
        writeFileSync(runtimeFile, Buffer.concat([oldBytes, Buffer.from('\n// fixture forward runtime update\n')]));
        const newBytes = readFileSync(runtimeFile);
        const fileEntry = (bytes) => ({
          path: runtimePath,
          size: bytes.length,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        });
        const parentManifest = { schema: 'VidaAgentPreparedPayload/v1', files: [fileEntry(oldBytes)] };
        const successorManifest = { schema: 'VidaAgentPreparedPayload/v1', files: [fileEntry(newBytes)] };
        const forwardId = 'fixture-runtime-code-forward';
        const forwardDir = path.join(root, '.agent', 'cutover', forwardId);
        const manifestSha = (value) => createHash('sha256').update(record(value)).digest('hex');
        const beforeDenied = ledger.hostState.readHostStateSnapshot(identity);
        await expect(runInstalled([...continuing, ...expected(pausedVersion), '--issue-wave', 'true'])).rejects.toThrow(
          'Admitted runtime code changed',
        );
        expect(ledger.resume(workId, 1).version).toEqual(pausedVersion);
        expect(ledger.hostState.readHostStateSnapshot(identity).workVersion).toEqual(beforeDenied.workVersion);
        expect(ledger.hostState.readHostStateSnapshot(identity).ledgerVersion).toEqual(beforeDenied.ledgerVersion);
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
          original[1].request.action_id,
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
        await expect(runReconcileArtifacts(['--mode', 'inspect', ...rebind])).rejects.toThrow(
          'installed forward lineage or selector differs',
        );
        writeFileSync(selectorFile, record({ payload_manifest_sha256: manifestSha(successorManifest) }));
        pauseFixtureOwner('after-forward');
        const pausedForInstall = ledger.hostState.readHostStateSnapshot(identity);
        expect(pausedForInstall.work.execution.status).toBe('suspended');
        expect(pausedForInstall.work.lease).toBeNull();
        // TEST SETUP: preserve canonical rows and release lineage while substituting
        // a different work's execution resource, even in the allowed-resource catalog.
        const resourceDb = new Database(path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'));
        const resourceRows = resourceDb
          .query("SELECT kind,id,payload,digest FROM agent_host_state WHERE kind IN ('work','ledger') ORDER BY kind,id")
          .all();
        const replaceResource = (resources) =>
          resources.map((resource) => (resource === 'execution:' + workId ? 'execution:foreign-work' : resource));
        const updateResourceRow = resourceDb.query(
          'UPDATE agent_host_state SET payload=?,digest=? WHERE kind=? AND id=?',
        );
        try {
          for (const row of resourceRows) {
            const value = JSON.parse(row.payload);
            if (row.kind === 'work')
              value.binding.allowed_resources = [...value.binding.allowed_resources, 'execution:foreign-work'].sort(
                (left, right) => (left < right ? -1 : left > right ? 1 : 0),
              );
            else {
              const prior = [...value.tickets]
                .reverse()
                .find(
                  (ticket) =>
                    ticket.work_id === workId &&
                    ticket.thread_id === 'fixture-native-session' &&
                    ticket.status === 'released',
                );
              expect(prior.exclusive_resources).toContain('execution:' + workId);
              prior.exclusive_resources = replaceResource(prior.exclusive_resources);
              for (const claim of value.claims.filter((entry) => entry.ticket_id === prior.ticket_id))
                claim.resources = replaceResource(claim.resources);
              for (const operation of value.operations.filter((entry) => entry.ticket_id === prior.ticket_id))
                operation.resources = replaceResource(operation.resources);
            }
            updateResourceRow.run(JSON.stringify(value), canonicalJsonDigest(value), row.kind, row.id);
          }
          const beforeForeignDenial = resourceDb.query('SELECT * FROM agent_host_state ORDER BY kind,id').all();
          const journalBeforeForeignDenial = ledger.resume(workId, 1).version;
          await expect(runReconcileArtifacts(['--mode', 'plan', ...rebind])).rejects.toThrow(
            'current owner, journal or issued replacement differs',
          );
          expect(resourceDb.query('SELECT * FROM agent_host_state ORDER BY kind,id').all()).toEqual(
            beforeForeignDenial,
          );
          expect(ledger.resume(workId, 1).version).toEqual(journalBeforeForeignDenial);
          expect(
            existsSync(path.join(root, '.agent/work/fixture-runtime-code-rebind/runtime-code-rebind-plan.v1.json')),
          ).toBe(false);
        } finally {
          for (const row of resourceRows) updateResourceRow.run(row.payload, row.digest, row.kind, row.id);
          resourceDb.close();
        }
        const restoredResourceOwner = ledger.hostState.readHostStateSnapshot(identity);
        expect(restoredResourceOwner.workVersion).toEqual(pausedForInstall.workVersion);
        expect(restoredResourceOwner.ledgerVersion).toEqual(pausedForInstall.ledgerVersion);
        expect((await runReconcileArtifacts(['--mode', 'plan', ...rebind])).status).toBe('planned');
        const stateBeforeTamper = ledger.hostState.readHostStateSnapshot(identity);
        const journalBeforeTamper = ledger.resume(workId, 1).version;
        const db = new Database(path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'));
        const storedRepair = db
          .query(
            'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE work_id=? AND logical_action_id=?',
          )
          .get(workId, original[1].request.action_id);
        const forged = JSON.parse(storedRepair.payload);
        forged.prior_issue_id = 'forged-prior-issue';
        const { digest: _priorDigest, ...forgedBody } = forged;
        forged.digest = canonicalJsonDigest(forgedBody);
        db.query(
          'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE work_id=? AND logical_action_id=?',
        ).run(JSON.stringify(forged), forged.digest, workId, original[1].request.action_id);
        await expect(runReconcileArtifacts(['--mode', 'apply', ...rebind.slice(0, 6)])).rejects.toThrow(
          'current owner, journal or issued replacement differs',
        );
        expect(ledger.hostState.readHostStateSnapshot(identity).workVersion).toEqual(stateBeforeTamper.workVersion);
        expect(ledger.hostState.readHostStateSnapshot(identity).ledgerVersion).toEqual(stateBeforeTamper.ledgerVersion);
        expect(ledger.resume(workId, 1).version).toEqual(journalBeforeTamper);
        db.query(
          'UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=? WHERE work_id=? AND logical_action_id=?',
        ).run(storedRepair.payload, storedRepair.digest, workId, original[1].request.action_id);
        db.close();
        writeFileSync(runtimeFile, Buffer.concat([newBytes, Buffer.from('// unplanned drift\n')]));
        await expect(runReconcileArtifacts(['--mode', 'apply', ...rebind.slice(0, 6)])).rejects.toThrow();
        writeFileSync(runtimeFile, newBytes);
        if (simulateCrashAfterResume) {
          const resumedBeforeRebind = resumePausedLocalWork({
            store: ledger.hostState,
            ledger,
            identity,
            attempt: 1,
            expectedWork: pausedForInstall.workVersion,
            expectedLedger: pausedForInstall.ledgerVersion,
            expectedJournal: pausedVersion,
            nativeSessionHandle: 'fixture-native-session',
            configDigest: runtimeConfigDigest(config),
            sourceDigest: ledger.resume(workId, 1).state.source_scope.digest,
          });
          expect(resumedBeforeRebind.status).toBe('resumed');
        }
        const rebound = await runReconcileArtifacts(['--mode', 'apply', ...rebind.slice(0, 6)]);
        expect(rebound.status).toBe('rebound');
        const resumedForRebind = ledger.hostState.readHostStateSnapshot(identity);
        expect(resumedForRebind.work.execution.status).toBe('active');
        expect(resumedForRebind.work.lease?.ticket_id).not.toBe(resumed.ticket_id);
        expect(resumedForRebind.ledgerVersion.revision).toBe(pausedForInstall.ledgerVersion.revision + 1);
        expect(rebound.retained_issue_id).toBe(switched.dispatch.issue_id);
        expect((await runReconcileArtifacts(['--mode', 'resume', ...rebind.slice(0, 6)])).status).toBe(
          'already_rebound',
        );
        expect(
          ledger.hostState
            .readHostStateSnapshot(identity)
            .work.lifecycle.references.filter((reference) => reference.kind === 'execution_approval')
            .every((reference) => reference.disposition === 'retired'),
        ).toBe(true);
        rmSync(path.join(root, '.agent', 'active-runtime-selector.v1.json'));
        rmSync(forwardDir, { recursive: true });
      }
      current = await runInstalled([...continuing, ...expected(pausedVersion), '--issue-wave', 'true']);
      expect(current.status).toBe('wave_retrieved');
      if (workflow === 'implementation_change')
        expect(current.issued_actions[0].issue_id).toBe(
          ledger.replacementDispatch(workId, 1, original[1].request.action_id).issue_id,
        );
      expect(current.issued_actions.length).toBe(1);
      expect(current.issued_actions[0].issue_id).not.toBe(original[1].issue_id);
      expect(current.issued_actions[0].request.stage_id).toBe(original[1].request.stage_id);
      expect(current.issued_actions[0].instruction_activation.use_id).toContain(current.issued_actions[0].issue_id);
      expect(current.issued_actions[0].instruction_bindings.length).toBeGreaterThan(0);
      const historyPath = path.join(
        root,
        config.research_decision.paths.activation_history,
        workId,
        'instruction-activation-history.jsonl',
      );
      const historyBeforeReplay = readFileSync(historyPath, 'utf8');
      await expect(report(current.state_version, observationFor(original[1], 1))).rejects.toThrow();
      expect(ledger.resume(workId, 1).version).toEqual(current.state_version);
      const reissued = await runInstalled([...continuing, ...expected(current.state_version), '--issue-wave', 'true']);
      expect(reissued.issued_actions[0].issue_id).toBe(current.issued_actions[0].issue_id);
      expect(readFileSync(historyPath, 'utf8')).toBe(historyBeforeReplay);
      const activationIds = historyBeforeReplay
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line).use_id);
      expect(new Set(activationIds).size).toBe(activationIds.length);
      expect(activationIds.at(-1)).toContain(reissued.issued_actions[0].issue_id);
      current = await report(reissued.state_version, observationFor(reissued.issued_actions[0], 1));
      expect(current.status).toBe('replacement_observed');
      const next = await runInstalled(continuing);
      expect(next.resume_status).not.toBe('issued_outcome_uncertain');
      expect(ledger.hostState.readHostStateSnapshot(identity).work.lifecycle.phase).toBe('INTAKE');
    } finally {
      ledger?.close();
      try {
        rmSync(root, { recursive: true, force: true });
      } catch (error) {
        if (error?.code !== 'EBUSY') throw error;
      }
    }
  },
  180_000,
);
