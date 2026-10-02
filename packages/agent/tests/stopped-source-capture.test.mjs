import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { openHostStateDatabase, inspectHostWorkspaceDatabase } from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import { openAdmittedSessionExecution } from '../src/orchestration/admitted-session-execution.ts';
import {
  openConfiguredMastraSessionLedger,
  sessionHandoffDatabasePath,
} from '../src/orchestration/persistent-session-handoff.ts';
import { MastraSessionBridge, sessionBridgeDatabasePath } from '../src/orchestration/mastra-session-bridge.ts';
import { prepareWorkflowExecution, reserveWorkflowAssignmentForSession } from '../src/runtime-kernel.ts';
import { suspendLocalWork, suspendCompletedReadOnlyWork } from '../src/orchestration/suspend-local-work.ts';
import { run } from '../bin/run.mjs';
import { developmentControllerBinding } from '../bin/development-controller.mjs';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The package is frozen and physically contained for this whole focused suite.
const candidateBinding = developmentControllerBinding(bundle);
const fixtureEvidence = 'local://synthetic/stopped-source';
const writeJson = (root, file, value) => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), JSON.stringify(value));
};

async function fixture({ writer = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-stopped-source-'));
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'stopped-source-repository')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Synthetic fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic source preimage');
  writeJson(root, 'docs/agent-instructions/documentation-policy.v1.json', {
    schema: 'DocumentationPolicy/v1',
    policy_id: 'synthetic-stopped-policy',
    project_id: 'sample',
    source_path: 'docs/agent-instructions/documentation-policy.v1.json',
    owner: 'synthetic-fixture',
    required: false,
    canonical_roots: ['docs'],
    map_paths: ['AGENT.sidecar.md'],
    excluded_roots: [],
    changelog_required: false,
    changelog_path: null,
    relations: ['documents'],
    updated_at: new Date().toISOString(),
  });
  const config = loadRuntimeConfig(root),
    workspace = deriveWorkspaceId(config.repository.repository_id, root),
    ledger = openConfiguredMastraSessionLedger(root),
    store = ledger.hostState;
  const selection = {
    team: 'default-development',
    kind: 'task',
    intent: 'task_execution',
    project: 'sample',
    risk_flags: [],
    labels: [],
  };
  function admission(id = 'stopped', file = 'AGENT.sidecar.md', thread = 'synthetic-owner') {
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [file]),
      scopePath = `.agent/work/${id}/scope.json`,
      acceptancePath = `.agent/work/${id}/acceptance.json`,
      ac = 'AC-' + id;
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + id,
      work_id: id,
      source_revision: source.digest,
      ac_ids: [ac],
      allowed_paths: [file],
      implementation_paths: [file],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Runtime acceptance'],
      acceptance_trace: [ac],
      behavior_trace: ['SR-' + id],
      test_trace: ['synthetic fixture'],
      diagnostic_trace: ['synthetic fixture'],
      attribution: { thread_id: thread, pointer: 'synthetic-request:' + id },
      owner: 'synthetic-fixture',
      created_at: new Date().toISOString(),
    };
    writeJson(root, scopePath, scope);
    writeJson(root, acceptancePath, {
      schema: 'AcceptanceManifest/v1',
      id: 'acceptance-' + id,
      version: 1,
      ac_ids: [ac],
      source: file,
      scope: scope.scope_id,
      source_revision: source.digest,
      contracts: [
        {
          id: ac,
          definition: 'Preserve original terminal failure without acceptance',
          sr: 'SR-' + id,
          evidence: ['synthetic fixture'],
        },
      ],
    });
    const authorizationPath = `.agent/work/${id}/authorization.json`;
    writeJson(root, authorizationPath, {
      schema: 'LocalSourceWriteAuthorization/v1',
      action: 'source.write',
      user_instruction_ref: 'synthetic-request:' + id,
      work_id: id,
      attempt: 1,
      scope_digest: source.digest,
      config_digest: runtimeConfigDigest(config),
      workflow_id: 'task_execution',
      stage_ids: ['develop_task'],
      implementation_paths: [file],
      native_session_handle: thread,
    });
    const input = {
      repositoryRoot: root,
      config,
      store,
      selection,
      context: { work_id: id, attempt: 1, scope_digest: source.digest },
      nativeSessionHandle: thread,
      workItem: {
        schema: 'WorkItem/v1',
        id,
        canonical_kind: 'task',
        intent: 'task_execution',
        project_id: 'sample',
        title: 'Synthetic stopped fixture ' + id,
        description: 'Synthetic boundary fixture',
        risk_flags: [],
        labels: [],
        provider: 'local',
        provider_type: 'Task',
      },
      scopePath,
      acceptancePath,
      sourceAuthorizationPath: authorizationPath,
      runtimeCodePaths: ['vida-agent/bin/run.mjs'],
      route: 'R2',
      risk: 'low',
      changeKind: 'feature',
    };
    input.intakePath = `.agent/work/${id}/raw-intake.json`;
    writeJson(root, input.intakePath, {
      schema: 'VidaLocalSessionIntake/v1',
      work_item: input.workItem,
      native_session_handle: thread,
      scope_path: scopePath,
      acceptance_path: acceptancePath,
      source_authorization_path: authorizationPath,
      runtime_code_paths: input.runtimeCodePaths,
      route: input.route,
      risk: input.risk,
      change_kind: input.changeKind,
    });
    const admitted = admitLocalSessionWork(input),
      work = admitted.host.work,
      identity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: id,
      };
    return { input, source, identity, admitted };
  }
  const extraBridges = [];
  const original = admission(),
    { input, identity, source } = original;
  const bridge = await MastraSessionBridge.open({
    repositoryRoot: root,
    config,
    selection,
    context: input.context,
    workflowId: 'task_execution',
    workspaceId: workspace,
  });
  let engine = await bridge.start();
  const sync = () => ledger.sync('stopped', 1, engine.run_id, engine.step_id, engine.requests, source, engine.status);
  let journal = sync();
  journal = ledger.issueWave('stopped', 1, journal.version);
  const item = journal.state.items[0],
    summary = 'Synthetic completed readonly synthesis';
  const readonlyObservation = {
    schema: 'VidaSessionObservation/v1',
    action_id: item.request.action_id,
    issue_id: item.issue_id,
    agent_id: 'synthetic-readonly',
    tool_call_ref: 'local:synthetic-readonly',
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: [fixtureEvidence],
  };
  journal = ledger.report('stopped', 1, journal.version, readonlyObservation, source);
  engine = await bridge.resume(
    journal.state.step_id,
    journal.state.items.map((entry) => entry.observation),
  );
  journal = sync();
  let reservation;
  if (writer) {
    const host = store.readHostStateSnapshot(identity);
    acquireLocalSourceWriterLease({
      repositoryRoot: root,
      config,
      store,
      identity,
      nativeSessionHandle: input.nativeSessionHandle,
      stageId: 'develop_task',
      assignmentIndex: 0,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedSessionJournal: { attempt: 1, version: journal.version },
    });
    const execution = await openAdmittedSessionExecution(root, store, 'sample', 'stopped'),
      capability = execution.composition.workflowExecutionCapability;
    const prepared = await prepareWorkflowExecution(capability, {
      repositoryRoot: root,
      configDigest: runtimeConfigDigest(config),
      teamId: 'default-development',
      workItemId: 'stopped',
    });
    const request = journal.state.items[0].request;
    reservation = await reserveWorkflowAssignmentForSession(capability, {
      repositoryRoot: root,
      configDigest: runtimeConfigDigest(config),
      teamId: 'default-development',
      workflowId: 'task_execution',
      stageId: 'develop_task',
      assignmentIndex: 0,
      workItemId: 'stopped',
      workItemDigest: prepared.workItemDigest,
      workContextDigest: prepared.workContextDigest,
      input: { bindings_manifest_ref: request.bindings_manifest_ref },
    });
    journal = ledger.issueWave('stopped', 1, journal.version, { [request.action_id]: reservation });
  }
  const databasePath = sessionHandoffDatabasePath(root, config);
  const inspect = () => inspectHostWorkspaceDatabase(databasePath, workspace);
  const ddl = () => {
    const db = openHostStateDatabase(databasePath);
    try {
      return db.query('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
    } finally {
      db.close();
    }
  };
  async function close() {
    for (const extra of extraBridges) await extra.close();
    await bridge.close();
    ledger.close();
    try {
      await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      if (error.code !== 'EBUSY') throw error;
      console.warn('Fixture cleanup deferred (closed SQLite handles, OS EBUSY): ' + root);
    }
  }
  async function laterWriter(id, file) {
    if (file !== 'AGENT.sidecar.md') writeFileSync(path.join(root, file), 'Synthetic disjoint source');
    const next = admission(id, file, 'synthetic-' + id);
    const nextBridge = await MastraSessionBridge.open({
      repositoryRoot: root,
      config,
      selection,
      context: next.input.context,
      workflowId: 'task_execution',
      workspaceId: workspace,
    });
    extraBridges.push(nextBridge);
    let state = await nextBridge.start();
    const nextSync = () => ledger.sync(id, 1, state.run_id, state.step_id, state.requests, next.source, state.status);
    let nextJournal = nextSync();
    nextJournal = ledger.issueWave(id, 1, nextJournal.version);
    const action = nextJournal.state.items[0],
      summary = 'Synthetic later readonly synthesis';
    nextJournal = ledger.report(
      id,
      1,
      nextJournal.version,
      {
        schema: 'VidaSessionObservation/v1',
        action_id: action.request.action_id,
        issue_id: action.issue_id,
        agent_id: 'synthetic-' + id,
        tool_call_ref: 'local:synthetic-' + id,
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: [fixtureEvidence],
      },
      next.source,
    );
    state = await nextBridge.resume(
      nextJournal.state.step_id,
      nextJournal.state.items.map((item) => item.observation),
    );
    nextJournal = nextSync();
    const host = store.readHostStateSnapshot(next.identity);
    acquireLocalSourceWriterLease({
      repositoryRoot: root,
      config,
      store,
      identity: next.identity,
      nativeSessionHandle: next.input.nativeSessionHandle,
      stageId: 'develop_task',
      assignmentIndex: 0,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedSessionJournal: { attempt: 1, version: nextJournal.version },
    });
    return { ...next, journal: nextJournal };
  }
  function captureInput() {
    const host = store.readHostStateSnapshot(identity),
      current = ledger.resume('stopped', 1),
      pending = current.state.items[0];
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic partial candidate bytes');
    const candidate = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
    const terminalRef = '.agent/work/stopped/synthetic-terminal.json',
      ownerRef = '.agent/work/stopped/synthetic-owner-manifest.json',
      summary = 'Synthetic partial stopped Source outcome';
    const observation = {
      schema: 'VidaSessionObservation/v1',
      action_id: pending.request.action_id,
      issue_id: pending.issue_id,
      host_attempt_id: reservation.receipt.attempt.attempt_id,
      agent_id: 'synthetic-native-writer',
      tool_call_ref: 'local:synthetic-stopped',
      status: 'reported_failed',
      summary,
      output_digest: canonicalJsonDigest(summary),
      changed_paths: ['AGENT.sidecar.md'],
      evidence_refs: [terminalRef],
    };
    writeJson(root, terminalRef, {
      schema: 'RootObservedStoppedSource/v1',
      status: 'partial_stopped',
      actor: observation.agent_id,
      action_id: observation.action_id,
      issue_id: observation.issue_id,
      host_attempt_id: observation.host_attempt_id,
      observation_ref: terminalRef,
      native_status: 'completed',
      source_turn_id: 'synthetic-original-turn',
      final_message_id: 'synthetic-final-message',
      current_tmp_only_turn_id: 'synthetic-maintenance-turn',
      owner_thread_id: input.nativeSessionHandle,
    });
    const operation = {
      identity,
      attempt: 1,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedJournal: current.version,
      nativeSessionHandle: input.nativeSessionHandle,
      observation,
      terminalEvidence: {
        schema: 'StoppedSourceTerminalEvidence/v1',
        native_actor: observation.agent_id,
        observation_ref: terminalRef,
        owner_decision_ref: ownerRef,
        terminal: 'partial_stopped',
      },
      candidateSnapshot: {
        schema: 'UnverifiedSourceSnapshot/v1',
        entries: candidate.entries.map((entry) => ({ path: entry.path, sha256: entry.sha256, size: entry.bytes })),
      },
    };
    const requestDigest = canonicalJsonDigest(operation);
    const reviews = [0, 1, 2].map((index) => ({
      actor_id: 'synthetic-candidate-reviewer-' + index,
      history_ref: 'synthetic-history-' + index,
      tool_call_ref: 'local:synthetic-candidate-review-' + index,
      verdict: 'pass',
      candidate_binding: candidateBinding,
      receipt_ref: '.agent/work/stopped/synthetic-review-' + index + '.json',
    }));
    for (const review of reviews)
      writeJson(root, review.receipt_ref, {
        schema: 'StoppedSourceCandidateReview/v1',
        ...review,
        request_digest: requestDigest,
      });
    writeJson(root, ownerRef, {
      schema: 'StoppedSourceCaptureAuthorization/v1',
      action: 'source.capture-failed-and-release',
      owner_thread_id: input.nativeSessionHandle,
      request_digest: requestDigest,
      candidate_binding: candidateBinding,
      source_turn_id: 'synthetic-original-turn',
      status: 'approved_exact_manifest',
      reviews,
    });
    const requestRef = '.agent/work/stopped/capture-request.json';
    writeJson(root, requestRef, { workspace_id: workspace, ...operation });
    const verifyCurrent = () => {
      expect(snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md'])).toEqual(candidate);
      expect(loadRuntimeConfig(root)).toEqual(config);
      expect(JSON.parse(readFileSync(path.join(root, terminalRef))).actor).toBe(observation.agent_id);
    };
    return {
      operation,
      requestRef,
      verifyCurrent,
      cli: (mode) =>
        run(['--capture-stopped-source', 'true', '--mode', mode, '--project-root', root, '--request', requestRef]),
    };
  }
  return {
    root,
    config,
    workspace,
    ledger,
    store,
    identity,
    input,
    source,
    reservation,
    readonlyObservation,
    inspect,
    ddl,
    close,
    captureInput,
    admission,
    laterWriter,
  };
}

test('public stopped capture preserves failure, rolls back all fields and DDL, then retries without new rights', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      before = f.inspect(),
      ddl = f.ddl();
    expect(() =>
      f.store.captureStoppedSourceObservation({
        ...c.operation,
        verifyCurrent: c.verifyCurrent,
        fault() {
          throw Error('synthetic post-settlement fault');
        },
      }),
    ).toThrow('synthetic post-settlement fault');
    expect(f.inspect()).toEqual(before);
    expect(f.ddl()).toEqual(ddl);
    expect((await c.cli('inspect')).status).toBe('inspect_current');
    expect((await c.cli('plan')).status).toBe('planned');
    const result = await c.cli('apply');
    expect(result).toMatchObject({
      status: 'captured_partial_source_released',
      rights_granted: false,
      canonical_acceptance: false,
    });
    const settled = f.store.readHostStateSnapshot(f.identity),
      journal = f.ledger.resume('stopped', 1);
    expect(settled.work.lease).toBeNull();
    expect(settled.work.execution.status).toBe('suspended');
    expect(settled.work.lifecycle.phase).toBe(before.work[0].state.lifecycle.phase);
    expect(settled.work.execution.assignment_attempts[0].result).toEqual(c.operation.observation);
    expect(journal.state.items[0].observation).toEqual(c.operation.observation);
    expect(journal.state.source_scope).toEqual(f.source);
    expect((await c.cli('resume')).work_version).toEqual(result.work_version);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(settled);
    const changed = {
      ...c.operation,
      observation: { ...c.operation.observation, tool_call_ref: 'local:synthetic-changed' },
    };
    expect(() => f.store.captureStoppedSourceObservation({ ...changed, verifyCurrent: c.verifyCurrent })).toThrow(
      'retry differs',
    );
    const next = {
      ...settled.work,
      revision: settled.work.revision + 1,
      lifecycle: {
        ...settled.work.lifecycle,
        revision: settled.work.lifecycle.revision + 1,
        next_action: 'Synthetic later dependent write',
      },
    };
    f.store.compareAndSwapHostState({
      expectedWork: settled.workVersion,
      expectedLedger: settled.ledgerVersion,
      nextWork: next,
      nextLedger: { ...settled.ledger, revision: settled.ledger.revision + 1 },
    });
    expect(() => f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent })).toThrow(
      'dependent work write',
    );
  } finally {
    await f.close();
  }
}, 60000);

test('foreign identities and stale capture versions cannot settle protected stopped Source', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      before = f.inspect();
    for (const change of [
      { identity: { ...f.identity, work_id: 'synthetic-foreign' } },
      { attempt: 2 },
      { nativeSessionHandle: 'synthetic-foreign-owner' },
      { expectedWork: { ...c.operation.expectedWork, revision: c.operation.expectedWork.revision + 1 } },
      { expectedJournal: { ...c.operation.expectedJournal, revision: c.operation.expectedJournal.revision + 1 } },
      { terminalEvidence: { ...c.operation.terminalEvidence, native_actor: 'synthetic-foreign-actor' } },
    ])
      expect(() =>
        f.store.captureStoppedSourceObservation({ ...c.operation, ...change, verifyCurrent: c.verifyCurrent }),
      ).toThrow();
    expect(f.inspect()).toEqual(before);
  } finally {
    await f.close();
  }
}, 60000);

test('another started or unknown Host effect blocks capture without fabricating task success', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      host = f.store.readHostStateSnapshot(f.identity),
      receipt = f.store.claimWorkflowAttempt({
        identity: f.identity,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        stageId: 'validate_focused',
        assignmentIndex: 0,
        requestDigest: canonicalJsonDigest({ synthetic: 'other-pending-effect' }),
        lease: host.work.lease,
      });
    for (const unknown of [false, true]) {
      if (unknown) f.store.markWorkflowAttemptUncertain(receipt);
      const current = f.store.readHostStateSnapshot(f.identity),
        before = f.inspect();
      expect(() =>
        f.store.captureStoppedSourceObservation({
          ...c.operation,
          expectedWork: current.workVersion,
          expectedLedger: current.ledgerVersion,
          verifyCurrent: c.verifyCurrent,
        }),
      ).toThrow('another Host effect');
      expect(f.inspect()).toEqual(before);
    }
  } finally {
    await f.close();
  }
}, 60000);

test('completed configured readonly egress can release with a fully inert unissued develop wave', async () => {
  const f = await fixture({ writer: false });
  try {
    const host = f.store.readHostStateSnapshot(f.identity),
      journal = f.ledger.resume('stopped', 1),
      stage = f.config.workflows.task_execution.stages.find(
        (stage) => stage.id === journal.state.completed[0].items[0].request.stage_id,
      ),
      profile = f.config.agents.profiles[stage.assignments[0].profile];
    expect(profile.mutation_scope).toBe('none');
    expect(profile.egress_policy).toBe('official_docs');
    expect(
      journal.state.items.every(
        (item) =>
          item.issue_id === null &&
          item.observation === null &&
          !item.host_reservation &&
          !item.research_activation &&
          !item.research_normalization,
      ),
    ).toBe(true);
    const request = {
        schema: 'CompletedReadonlyReleaseRequest/v1',
        workspace_id: f.workspace,
        identity: f.identity,
        attempt: 1,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: journal.version,
        nativeSessionHandle: f.input.nativeSessionHandle,
        userRequestPointer: 'synthetic-owner:release-readonly',
        requestIntent: 'linked_correction',
      },
      requestRef = '.agent/work/stopped/readonly-request.json';
    writeJson(f.root, requestRef, request);
    const cli = (mode) =>
      run(['--release-completed-readonly', 'true', '--mode', mode, '--project-root', f.root, '--request', requestRef]);
    expect((await cli('inspect')).status).toBe('readonly_release_inspected');
    expect((await cli('plan')).status).toBe('readonly_release_planned');
    expect(await cli('apply')).toMatchObject({
      status: 'completed_readonly_owner_released',
      rights_granted: false,
      canonical_acceptance: false,
      runtime_acceptance: false,
    });
    expect(f.store.readHostStateSnapshot(f.identity).work.execution.assignment_attempts).toEqual([]);
    expect(f.ledger.resume('stopped', 1).state).toEqual(journal.state);
  } finally {
    await f.close();
  }
}, 60000);

test('completed readonly release tolerates package and declared-source drift while releasing only the old owner', async () => {
  const f = await fixture({ writer: false }),
    packageFixtureRoot = mkdtempSync(path.join(bundle, '.tmp', 'readonly-release-drift-')),
    packageRoot = path.join(packageFixtureRoot, 'vida-agent');
  try {
    cpSync(bundle, packageRoot, {
      recursive: true,
      filter: (source) => {
        const relative = path.relative(bundle, source);
        if (!relative) return true;
        return !['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect', 'dist'].includes(
          relative.split(path.sep)[0],
        );
      },
    });
    const clonedRuntime = await import(pathToFileURL(path.join(packageRoot, 'src/config/runtime-config.ts')).href),
      clonedSnapshots = await import(pathToFileURL(path.join(packageRoot, 'src/orchestration/scoped-source-snapshot.ts')).href),
      clonedRun = await import(pathToFileURL(path.join(packageRoot, 'bin/run.mjs')).href),
      host = f.store.readHostStateSnapshot(f.identity),
      journal = f.ledger.resume('stopped', 1),
      scopedPaths = journal.state.source_scope.entries.map((entry) => entry.path),
      beforePackage = clonedSnapshots.snapshotRuntimePackageSources(
        clonedRuntime.runtimePackageAccess(),
        f.config.runtime.bundle,
        f.input.runtimeCodePaths,
      ),
      beforeProject = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), scopedPaths);
    expect(beforePackage.digest).toBe(host.work.binding.runtime_code_digest);
    expect(beforeProject.digest).toBe(journal.state.source_scope.digest);

    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Synthetic changed scoped source');
    writeFileSync(
      path.join(packageRoot, 'bin/run.mjs'),
      Buffer.concat([readFileSync(path.join(packageRoot, 'bin/run.mjs')), Buffer.from('\n// synthetic package drift\n')]),
    );
    const afterPackage = clonedSnapshots.snapshotRuntimePackageSources(
        clonedRuntime.runtimePackageAccess(),
        f.config.runtime.bundle,
        f.input.runtimeCodePaths,
      ),
      afterProject = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), scopedPaths);
    expect(afterPackage.digest).not.toBe(beforePackage.digest);
    expect(afterProject.digest).not.toBe(beforeProject.digest);

    const request = {
        schema: 'CompletedReadonlyReleaseRequest/v1',
        workspace_id: f.workspace,
        identity: f.identity,
        attempt: 1,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: journal.version,
        nativeSessionHandle: f.input.nativeSessionHandle,
        userRequestPointer: 'synthetic-owner:release-readonly-after-drift',
        requestIntent: 'linked_correction',
      },
      requestRef = '.agent/work/stopped/readonly-request.json';
    writeJson(f.root, requestRef, request);
    const cli = (mode) =>
      clonedRun.run([
        '--release-completed-readonly',
        'true',
        '--mode',
        mode,
        '--project-root',
        f.root,
        '--request',
        requestRef,
      ]);
    expect((await cli('inspect')).status).toBe('readonly_release_inspected');
    expect((await cli('plan')).status).toBe('readonly_release_planned');
    expect(await cli('apply')).toMatchObject({
      status: 'completed_readonly_owner_released',
      rights_granted: false,
      canonical_acceptance: false,
      runtime_acceptance: false,
    });
    expect(f.store.readHostStateSnapshot(f.identity).work.execution.assignment_attempts).toEqual([]);
    expect(f.ledger.resume('stopped', 1).state).toEqual(journal.state);
  } finally {
    await f.close();
    await rm(packageFixtureRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}, 60000);

test('completed readonly release rejects absent and null engine completion evidence', async () => {
  for (const tamper of ['missing', 'null']) {
    const f = await fixture({ writer: false });
    try {
      const host = f.store.readHostStateSnapshot(f.identity),
        journal = f.ledger.resume('stopped', 1),
        request = {
          schema: 'CompletedReadonlyReleaseRequest/v1',
          workspace_id: f.workspace,
          identity: f.identity,
          attempt: 1,
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          expectedJournal: journal.version,
          nativeSessionHandle: f.input.nativeSessionHandle,
          userRequestPointer: 'synthetic-owner:release-readonly-corrupt-engine',
          requestIntent: 'linked_correction',
        },
        requestRef = '.agent/work/stopped/readonly-request.json';
      writeJson(f.root, requestRef, request);
      const engine = new Database(sessionBridgeDatabasePath(f.root, f.config), { strict: true });
      try {
        const row = engine
            .query('SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
            .get(host.work.execution.run_id),
          snapshot = JSON.parse(row.snapshot),
          waveIndex = journal.state.completed[0].items[0].request.wave_index,
          completedWave = snapshot.context['wave-' + waveIndex];
        expect(completedWave.status).toBe('success');
        if (tamper === 'missing') delete completedWave.resumePayload;
        else completedWave.resumePayload = null;
        engine
          .query('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
          .run(JSON.stringify(snapshot), host.work.execution.run_id);
      } finally {
        engine.close();
      }
      const before = f.inspect(),
        cli = () =>
          run([
            '--release-completed-readonly',
            'true',
            '--mode',
            'inspect',
            '--project-root',
            f.root,
            '--request',
            requestRef,
          ]);
      await expect(cli()).rejects.toThrow('Readonly release actual engine completion differs');
      expect(f.inspect()).toEqual(before);
    } finally {
      await f.close();
    }
  }
}, 60000);

test('exact stopped capture retry permits disjoint progress but rejects later overlapping active and released rights', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput();
    await c.cli('plan');
    await c.cli('apply');
    const settled = f.store.readHostStateSnapshot(f.identity);
    await f.laterWriter('disjoint', 'disjoint.txt');
    expect((await c.cli('resume')).work_version).toEqual(settled.workVersion);
    const overlap = await f.laterWriter('overlap', 'AGENT.sidecar.md');
    const active = f.inspect();
    expect(() => f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent })).toThrow(
      'newer scope grant',
    );
    expect(f.inspect()).toEqual(active);
    const host = f.store.readHostStateSnapshot(overlap.identity);
    suspendLocalWork({
      store: f.store,
      identity: overlap.identity,
      journal: overlap.journal,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      nativeSessionHandle: overlap.input.nativeSessionHandle,
      userRequestPointer: 'synthetic-release-overlap',
      requestIntent: 'linked_correction',
      documentationContext: {
        repository_root: f.root,
        repository_id: overlap.identity.repository_id,
        project_id: 'sample',
        work_id: 'overlap',
      },
      config: f.config,
    });
    const released = f.inspect();
    expect(() => f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent })).toThrow(
      'newer scope grant',
    );
    expect(f.inspect()).toEqual(released);
  } finally {
    await f.close();
  }
}, 60000);

test('completed readonly release denies started and uncertain writer activity', async () => {
  const f = await fixture();
  try {
    for (const uncertain of [false, true]) {
      if (uncertain) f.store.markWorkflowAttemptUncertain(f.reservation.receipt);
      const host = f.store.readHostStateSnapshot(f.identity),
        journal = f.ledger.resume('stopped', 1),
        before = f.inspect();
      expect(() =>
        suspendCompletedReadOnlyWork({
          store: f.store,
          identity: f.identity,
          journal,
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          nativeSessionHandle: f.input.nativeSessionHandle,
          userRequestPointer: 'synthetic-readonly-denial',
          requestIntent: 'linked_correction',
          documentationContext: {
            repository_root: f.root,
            repository_id: f.identity.repository_id,
            project_id: 'sample',
            work_id: 'stopped',
          },
          config: f.config,
        }),
      ).toThrow('session journal has unfinished issued effects');
      expect(f.inspect()).toEqual(before);
    }
  } finally {
    await f.close();
  }
}, 60000);
