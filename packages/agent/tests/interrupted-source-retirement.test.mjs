import { test, expect } from 'bun:test';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { openHostStateDatabase } from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import { openAdmittedSessionExecution } from '../src/orchestration/admitted-session-execution.ts';
import {
  openConfiguredMastraSessionLedger,
  sessionHandoffDatabasePath,
} from '../src/orchestration/persistent-session-handoff.ts';
import { MastraSessionBridge } from '../src/orchestration/mastra-session-bridge.ts';
import {
  prepareWorkflowExecution,
  reserveWorkflowAssignmentForSession,
  retireInterruptedSourceOwnerForSession,
} from '../src/runtime-kernel.ts';
import { runWorkStateRepair } from '../bin/repair-work-state.mjs';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  let reservation, executionCapability;
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
    const execution = await openAdmittedSessionExecution(root, store, 'sample', 'stopped');
    executionCapability = execution.composition.workflowExecutionCapability;
    const prepared = await prepareWorkflowExecution(executionCapability, {
      repositoryRoot: root,
      configDigest: runtimeConfigDigest(config),
      teamId: 'default-development',
      workItemId: 'stopped',
    });
    const request = journal.state.items[0].request;
    reservation = await reserveWorkflowAssignmentForSession(executionCapability, {
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
  let connectionsClosed = false;
  async function closeConnections() {
    if (connectionsClosed) return;
    for (const extra of extraBridges) await extra.close();
    await bridge.close();
    ledger.close();
    connectionsClosed = true;
  }
  async function close() {
    await closeConnections();
    try {
      await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      if (error.code !== 'EBUSY') throw error;
      console.warn('Fixture cleanup deferred (closed SQLite handles, OS EBUSY): ' + root);
    }
  }
  async function laterWriter(id, file, { readonly = false, ownershipOnly = false } = {}) {
    if (file !== 'AGENT.sidecar.md') writeFileSync(path.join(root, file), 'Synthetic disjoint source');
    const next = admission(id, file, 'synthetic-' + id);
    if (ownershipOnly) {
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
      });
      return next;
    }
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
    if (readonly) return { ...next, journal: nextJournal };
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
  return {
    root,
    config,
    workspace,
    ledger,
    store,
    identity,
    executionCapability,
    input,
    source,
    reservation,
    readonlyObservation,
    close,
    closeConnections,
    admission,
    laterWriter,
  };
}

test('interrupted Source retirement keeps the provider outcome unknown and fences stale completion', async () => {
  const f = await fixture();
  try {
    const before = f.store.readHostStateSnapshot(f.identity),
      journal = f.ledger.resume('stopped', 1),
      item = journal.state.items[0],
      request = {
        identity: f.identity,
        attempt: 1,
        actionId: item.request.action_id,
        issueId: item.issue_id,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        authorization: f.reservation.authorization,
        operatorHandle: f.input.nativeSessionHandle,
        decisionPointer: 'synthetic:approved-interrupted-source-retirement',
        evidence: {
          schema: 'InterruptedSourceRetirementEvidence/v1',
          source_thread_id: 'synthetic-interrupted-child',
          source_thread_status: 'interrupted',
          read_thread_ref: 'synthetic:read-thread:interrupted',
          list_agents_ref: 'synthetic:list-agents:no-source-writers',
          active_source_writer_ids: [],
        },
      };
    const realNow = Date.now;
    Date.now = () => realNow() + 3 * 60 * 60 * 1000;
    let retired;
    try {
      retired = await retireInterruptedSourceOwnerForSession(f.executionCapability, request);
    } finally {
      Date.now = realNow;
    }
    expect(retired.snapshot.work.execution.status).toBe('suspended');
    expect(retired.snapshot.work.lease).toBeNull();
    expect(retired.attempt_receipt.attempt.status).toBe('uncertain');
    expect(retired.attempt_receipt.attempt.result).toBeNull();
    expect(retired.attempt_receipt.attempt.result_digest).toBeNull();
    expect(
      retired.snapshot.ledger.tickets.find((ticket) => ticket.ticket_id === before.work.lease.ticket_id).status,
    ).toBe('released');
    expect(f.store.readWorkSessionJournal(f.identity).version).toEqual(journal.version);
    expect((await retireInterruptedSourceOwnerForSession(f.executionCapability, request)).snapshot).toEqual(
      retired.snapshot,
    );

    await f.laterWriter('later-overlap', 'AGENT.sidecar.md', { ownershipOnly: true });
    await expect(retireInterruptedSourceOwnerForSession(f.executionCapability, request)).rejects.toThrow(
      'another active Source owner overlaps',
    );

    const complete = {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      host_attempt_id: f.reservation.receipt.attempt.attempt_id,
      agent_id: 'synthetic-late-source-owner',
      tool_call_ref: 'synthetic:late-source-result',
      status: 'reported_complete',
      summary: 'Late success must remain fenced',
      output_digest: canonicalJsonDigest('Late success must remain fenced'),
      changed_paths: [],
      evidence_refs: ['synthetic:late-result'],
    };
    expect(() => f.ledger.report('stopped', 1, journal.version, complete, f.source)).toThrow(
      'Mastra source observation has no matching current host outcome',
    );
  } finally {
    await f.close();
  }
});

test('an interrupted Source owner keeps a later FIFO contender queued', async () => {
  const f = await fixture();
  try {
    await expect(f.laterWriter('fifo-contender', 'AGENT.sidecar.md')).rejects.toThrow(
      'source writer ownership is queued behind an earlier exclusive resource',
    );
    const after = f.store.readHostStateSnapshot(f.identity),
      owner = after.ledger.tickets.find((ticket) => ticket.ticket_id === after.work.lease.ticket_id),
      contender = after.ledger.tickets.find(
        (ticket) => ticket.work_id === 'fifo-contender' && ticket.status === 'queued',
      );
    expect(owner.status).toBe('active');
    expect(contender).toBeTruthy();
    expect(contender.sequence).toBeGreaterThan(owner.sequence);
    expect(contender.active_resources).toEqual([]);
    expect(contender.blocked_resources).toContain('file:AGENT.sidecar.md');
  } finally {
    await f.close();
  }
});

test('public owner retirement restarts after lease expiry and package drift without an execution capability', async () => {
  mkdirSync(path.join(bundle, '.tmp'), { recursive: true });
  const f = await fixture(),
    cloneRoot = mkdtempSync(path.join(bundle, '.tmp', 'interrupted-recovery-')),
    packageRoot = path.join(cloneRoot, 'vida-agent'),
    realNow = Date.now;
  let observer;
  try {
    mkdirSync(packageRoot);
    const excluded = ['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect'];
    for (const entry of readdirSync(bundle)) {
      if (!excluded.includes(entry))
        cpSync(path.join(bundle, entry), path.join(packageRoot, entry), { recursive: true });
    }
    const before = f.store.readHostStateSnapshot(f.identity),
      originalJournal = f.ledger.resume('stopped', 1);
    writeFileSync(
      path.join(packageRoot, 'bin/run.mjs'),
      readFileSync(path.join(packageRoot, 'bin/run.mjs'), 'utf8') + '\n// synthetic post-admission runtime drift\n',
    );
    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Synthetic changed Source after interruption');
    await f.closeConnections();
    f.executionCapability = undefined;
    Date.now = () => realNow() + 3 * 60 * 60 * 1000;
    const { run } = await import(pathToFileURL(path.join(packageRoot, 'bin/run.mjs')).href),
      requestRef = '.agent/work/stopped/retirement.json',
      cli = (mode, handle = f.input.nativeSessionHandle) =>
        run([
          '--retire-interrupted-source-owner',
          'true',
          '--mode',
          mode,
          '--project-root',
          f.root,
          '--native-session-handle',
          handle,
          '--request',
          requestRef,
        ]);
    writeJson(f.root, requestRef, { identity: f.identity, attempt: 1 });
    await expect(cli('inspect', 'foreign-owner')).rejects.toThrow('owner');
    const inspected = await cli('inspect');
    expect(inspected.status).toBe('interrupted_source_retirement_inspected');
    expect(inspected.owner_thread_id).toBe(f.input.nativeSessionHandle);
    expect(inspected.request.actionId).toBe(originalJournal.state.items[0].request.action_id);
    expect(inspected.request.issueId).toBe(originalJournal.state.items[0].issue_id);
    const request = {
      ...inspected.request,
      decisionPointer: 'synthetic-owner:relinquish-for-interrupted-child',
      evidence: {
        schema: 'InterruptedSourceRetirementEvidence/v1',
        source_thread_id: 'synthetic-interrupted-child',
        source_thread_status: 'interrupted',
        read_thread_ref: 'synthetic:actual-child-interrupted',
        list_agents_ref: 'synthetic:no-running-source-writers',
        active_source_writer_ids: [],
      },
    };
    writeJson(f.root, requestRef, {
      ...request,
      expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 },
    });
    await expect(cli('apply')).rejects.toThrow('CAS');
    writeJson(f.root, requestRef, { ...request, evidence: { ...request.evidence, source_thread_status: 'running' } });
    await expect(cli('apply')).rejects.toThrow('evidence');
    writeJson(f.root, requestRef, request);
    const released = await cli('apply');
    expect(released).toMatchObject({
      status: 'interrupted_source_owner_released',
      attempt_status: 'uncertain',
      rights_granted: false,
      attempt_outcome_resolved: false,
    });
    expect((await cli('apply')).operation_id).toBe(released.operation_id);
    observer = openConfiguredMastraSessionLedger(f.root);
    const after = observer.hostState.readHostStateSnapshot(f.identity);
    expect(after.work.execution.status).toBe('suspended');
    expect(after.work.lease).toBeNull();
    expect(after.work.execution.assignment_attempts[0]).toMatchObject({
      status: 'uncertain',
      result: null,
      result_digest: null,
    });
    expect(after.ledger.tickets.length).toBe(before.ledger.tickets.length);
    expect(observer.hostState.readWorkSessionJournal(f.identity)).toEqual({
      attempt: 1,
      version: originalJournal.version,
      state: originalJournal.state,
    });
  } finally {
    Date.now = realNow;
    observer?.close();
    await f.close();
    await rm(cloneRoot, { recursive: true, force: true });
  }
}, 60000);

test('interrupted Source retirement rejects missing, running, foreign, and stale evidence without mutation', async () => {
  const f = await fixture();
  try {
    const before = f.store.readHostStateSnapshot(f.identity),
      journal = f.ledger.resume('stopped', 1),
      item = journal.state.items[0],
      request = {
        identity: f.identity,
        attempt: 1,
        actionId: item.request.action_id,
        issueId: item.issue_id,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        authorization: f.reservation.authorization,
        operatorHandle: f.input.nativeSessionHandle,
        decisionPointer: 'synthetic:approved-interrupted-source-retirement',
        evidence: {
          schema: 'InterruptedSourceRetirementEvidence/v1',
          source_thread_id: 'synthetic-interrupted-child',
          source_thread_status: 'interrupted',
          read_thread_ref: 'synthetic:read-thread:interrupted',
          list_agents_ref: 'synthetic:list-agents:no-source-writers',
          active_source_writer_ids: [],
        },
      };
    expect(() =>
      f.store.retireInterruptedSourceOwner({ ...request, evidence: { ...request.evidence, read_thread_ref: '' } }),
    ).toThrow('evidence');
    expect(() =>
      f.store.retireInterruptedSourceOwner({
        ...request,
        evidence: { ...request.evidence, source_thread_status: 'running' },
      }),
    ).toThrow('evidence');
    expect(() =>
      f.store.retireInterruptedSourceOwner({
        ...request,
        operatorHandle: 'foreign-owner-thread',
      }),
    ).toThrow('owner attribution');
    expect(() =>
      f.store.retireInterruptedSourceOwner({
        ...request,
        evidence: { ...request.evidence, active_source_writer_ids: ['competing-writer'] },
      }),
    ).toThrow('evidence');
    expect(() => f.store.retireInterruptedSourceOwner({ ...request, issueId: 'stale-issue' })).toThrow('issue');
    const staleAuthorization = {
      ...request.authorization,
      receipt: {
        ...request.authorization.receipt,
        attempt: {
          ...request.authorization.receipt.attempt,
          lease: {
            ...request.authorization.receipt.attempt.lease,
            generation: request.authorization.receipt.attempt.lease.generation + 1,
          },
        },
      },
    };
    expect(() => f.store.retireInterruptedSourceOwner({ ...request, authorization: staleAuthorization })).toThrow(
      'lease',
    );
    expect(() =>
      f.store.retireInterruptedSourceOwner({
        ...request,
        expectedLedger: { ...before.ledgerVersion, digest: 'f'.repeat(64) },
      }),
    ).toThrow('compare-and-swap');
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity).version).toEqual(journal.version);
  } finally {
    await f.close();
  }
});

test('interrupted Source retirement transaction rolls back the attempt downgrade when release fails', async () => {
  const f = await fixture();
  try {
    const before = f.store.readHostStateSnapshot(f.identity),
      journal = f.ledger.resume('stopped', 1),
      item = journal.state.items[0],
      request = {
        identity: f.identity,
        attempt: 1,
        actionId: item.request.action_id,
        issueId: item.issue_id,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        authorization: f.reservation.authorization,
        operatorHandle: f.input.nativeSessionHandle,
        decisionPointer: 'synthetic:approved-interrupted-source-retirement',
        evidence: {
          schema: 'InterruptedSourceRetirementEvidence/v1',
          source_thread_id: 'synthetic-interrupted-child',
          source_thread_status: 'interrupted',
          read_thread_ref: 'synthetic:read-thread:interrupted',
          list_agents_ref: 'synthetic:list-agents:no-source-writers',
          active_source_writer_ids: [],
        },
      },
      db = openHostStateDatabase(sessionHandoffDatabasePath(f.root, f.config));
    db.exec(
      "CREATE TRIGGER fail_retirement_ledger BEFORE UPDATE ON agent_host_state WHEN OLD.kind='ledger' BEGIN SELECT RAISE(ABORT, 'synthetic retirement fault'); END;",
    );
    try {
      expect(() => f.store.retireInterruptedSourceOwner(request)).toThrow('synthetic retirement fault');
    } finally {
      db.exec('DROP TRIGGER fail_retirement_ledger');
      db.close();
    }
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity).version).toEqual(journal.version);
  } finally {
    await f.close();
  }
});

test('correction defaults repair preserves an issued unknown Source attempt and supports public retirement', async () => {
  const f = await fixture();
  let database;
  const repair = (mode, actor) =>
    runWorkStateRepair([
      '--kind',
      'work-state',
      '--authority',
      'correction-generation',
      '--mode',
      mode,
      '--project-root',
      f.root,
      '--repair-id',
      'interrupted-source-defaults',
      ...(actor ? ['--actor', actor] : []),
    ]);
  try {
    database = openHostStateDatabase(sessionHandoffDatabasePath(f.root, f.config));
    f.admission('readonly-independent', 'AGENTS.md', 'synthetic-readonly-owner');
    for (const id of ['unknown-readonly-a', 'unknown-readonly-b']) {
      const pending = await f.laterWriter(id, id + '.txt', { readonly: true });
      expect(pending.journal.state.items[0].issue_id).toBeTruthy();
      expect(pending.journal.state.items[0].observation).toBeNull();
      expect(pending.journal.state.items[0].host_reservation).toBeUndefined();
    }
    const unrelatedRows = () =>
      database
        .query(
          'SELECT * FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id LIKE ? ORDER BY work_id',
        )
        .all(f.workspace, 'unknown-readonly-%');
    const unrelatedBefore = unrelatedRows();
    const hostRow = database
      .query("SELECT id,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'")
      .all(f.workspace)
      .find((row) => JSON.parse(row.payload).binding.lifecycle_work_id === 'stopped');
    const originalWork = JSON.parse(hostRow.payload);
    expect(originalWork.execution.assignment_attempts).toHaveLength(1);
    expect(originalWork.execution.assignment_attempts[0].status).toBe('started');
    for (const attempt of originalWork.execution.assignment_attempts) {
      delete attempt.correction_generation;
      delete attempt.correction_authorization;
    }
    database
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=?")
      .run(canonicalJson(originalWork), canonicalJsonDigest(originalWork), f.workspace, hostRow.id);
    const journalRow = database
      .query('SELECT payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
      .get(f.workspace, 'stopped', 1);
    const originalJournal = JSON.parse(journalRow.payload);
    const issued = originalJournal.items.find((item) => item.host_reservation);
    expect(issued.issue_id).toBeTruthy();
    expect(issued.observation).toBeNull();
    expect(issued.host_reservation.authorization.approval.status).toBe('commit_unknown');
    for (const receipt of [issued.host_reservation.receipt, issued.host_reservation.authorization.receipt]) {
      delete receipt.attempt.correction_generation;
      delete receipt.attempt.correction_authorization;
    }
    database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .run(canonicalJson(originalJournal), canonicalJsonDigest(originalJournal), f.workspace, 'stopped', 1);
    expect(() => f.store.readHostStateSnapshot(f.identity)).toThrow();

    const inspection = repair('inspect');
    expect(inspection.status).toBe('repairable_current_v1');
    expect(inspection.changed_work).toHaveLength(1);
    expect(inspection.changed_journals).toBe(1);
    const contaminatedJournal = structuredClone(originalJournal);
    const unrelatedItem = JSON.parse(unrelatedBefore[0].payload).items[0];
    contaminatedJournal.items.push(unrelatedItem);
    database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .run(canonicalJson(contaminatedJournal), canonicalJsonDigest(contaminatedJournal), f.workspace, 'stopped', 1);
    expect(() => repair('inspect')).toThrow(/interrupted repair has another issued unknown journal item/);
    database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .run(canonicalJson(originalJournal), canonicalJsonDigest(originalJournal), f.workspace, 'stopped', 1);
    const plan = repair('plan', 'synthetic-repair-owner');
    expect(plan.status).toBe('planned');
    expect(plan.work_changes[0].after.execution.assignment_attempts[0]).toEqual({
      ...originalWork.execution.assignment_attempts[0],
      correction_generation: 0,
      correction_authorization: null,
    });
    const preApplyWork = JSON.parse(
      database
        .query("SELECT payload FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
        .get(f.workspace, hostRow.id).payload,
    );
    const preApplyJournal = JSON.parse(
      database
        .query('SELECT payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
        .get(f.workspace, 'stopped', 1).payload,
    );
    database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=revision+1 WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .run(f.workspace, 'unknown-readonly-a', 1);
    expect(() => repair('apply')).toThrow(/repair dependency CAS conflict/);
    database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=revision-1 WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .run(f.workspace, 'unknown-readonly-a', 1);
    database.exec(
      "CREATE TRIGGER correction_repair_fault BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT,'synthetic correction repair fault'); END",
    );
    expect(() => repair('apply')).toThrow(/synthetic correction repair fault/);
    database.exec('DROP TRIGGER correction_repair_fault');
    expect(
      JSON.parse(
        database
          .query("SELECT payload FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
          .get(f.workspace, hostRow.id).payload,
      ),
    ).toEqual(preApplyWork);
    expect(
      JSON.parse(
        database
          .query(
            'SELECT payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(f.workspace, 'stopped', 1).payload,
      ),
    ).toEqual(preApplyJournal);
    const applied = repair('apply');
    expect(applied.status).toBe('applied');
    expect(repair('resume')).toEqual(applied);
    expect(unrelatedRows()).toEqual(unrelatedBefore);

    const repairedJournal = f.ledger.resume('stopped', 1),
      repairedItem = repairedJournal.state.items.find((item) => item.host_reservation),
      repairedAttempt = repairedItem.host_reservation.receipt.attempt;
    expect(repairedJournal.state.items.map((item) => item.observation)).toEqual(
      originalJournal.items.map((item) => item.observation),
    );
    expect(repairedItem.issue_id).toBe(issued.issue_id);
    expect(repairedItem.observation).toBeNull();
    expect(repairedAttempt.status).toBe('started');
    expect(repairedAttempt.attempt_id).toBe(issued.host_reservation.receipt.attempt.attempt_id);
    expect(repairedItem.host_reservation.authorization.receipt.attempt).toEqual(repairedAttempt);
    expect(repairedItem.host_reservation.authorization.approval).toEqual(
      issued.host_reservation.authorization.approval,
    );
    expect(repairedItem.host_reservation.authorization.approval.status).toBe('commit_unknown');
    const repairedHost = f.store.readHostStateSnapshot(f.identity);
    expect(repairedHost.work.lease).toEqual(originalWork.lease);
    expect(repairedHost.work.execution.assignment_attempts[0].status).toBe('started');
    expect(repairedHost.ledger.claims.find((claim) => claim.work_id === 'readonly-independent').status).toBe('active');
    expect(repairedHost.work.execution.assignment_attempts[0].attempt_id).toBe(
      originalWork.execution.assignment_attempts[0].attempt_id,
    );
    expect(repairedHost.work.lifecycle.assurance.correction_count).toBe(0);
    expect(repair('restore').status).toBe('restored');
    expect(repair('restore').status).toBe('restored');
    const afterRestore = f.store.readHostStateSnapshot(f.identity);
    expect(afterRestore.work.execution.assignment_attempts[0]).toEqual({
      ...originalWork.execution.assignment_attempts[0],
      correction_generation: 0,
      correction_authorization: null,
    });
    expect(afterRestore.ledger.claims.find((claim) => claim.work_id === 'readonly-independent').status).toBe('active');
    const afterRestoreJournal = f.ledger.resume('stopped', 1),
      afterRestoreItem = afterRestoreJournal.state.items.find((item) => item.host_reservation);

    const retirement = await retireInterruptedSourceOwnerForSession(f.executionCapability, {
      identity: f.identity,
      attempt: 1,
      actionId: afterRestoreItem.request.action_id,
      issueId: afterRestoreItem.issue_id,
      expectedWork: afterRestore.workVersion,
      expectedLedger: afterRestore.ledgerVersion,
      expectedJournal: afterRestoreJournal.version,
      expectedMaintenanceGeneration: afterRestore.maintenanceGeneration,
      authorization: afterRestoreItem.host_reservation.authorization,
      operatorHandle: f.input.nativeSessionHandle,
      decisionPointer: 'synthetic:approved-interrupted-source-retirement-after-repair',
      evidence: {
        schema: 'InterruptedSourceRetirementEvidence/v1',
        source_thread_id: 'synthetic-interrupted-child',
        source_thread_status: 'interrupted',
        read_thread_ref: 'synthetic:read-thread:interrupted',
        list_agents_ref: 'synthetic:list-agents:no-source-writers',
        active_source_writer_ids: [],
      },
    });
    expect(retirement.attempt_receipt.attempt.status).toBe('uncertain');
    expect(retirement.attempt_receipt.attempt.result).toBeNull();
    expect(retirement.snapshot.work.lease).toBeNull();
    expect(retirement.snapshot.work.lifecycle.assurance.correction_count).toBe(0);
    const retiredJournal = f.ledger.resume('stopped', 1),
      retiredItem = retiredJournal.state.items.find((item) => item.host_reservation);
    expect(retiredItem.issue_id).toBe(issued.issue_id);
    expect(retiredItem.observation).toBeNull();
    expect(retiredItem.host_reservation.authorization.approval.status).toBe('commit_unknown');
    expect(retirement.snapshot.ledger.claims.find((claim) => claim.work_id === 'readonly-independent').status).toBe(
      'active',
    );
    expect(() => repair('restore')).toThrow();
  } finally {
    database?.close();
    await f.close();
  }
});

test('interrupted correction defaults repair rejects partial authority and mismatched approval receipt copies', async () => {
  const f = await fixture();
  let database;
  const repair = () =>
    runWorkStateRepair([
      '--kind',
      'work-state',
      '--authority',
      'correction-generation',
      '--mode',
      'inspect',
      '--project-root',
      f.root,
    ]);
  try {
    database = openHostStateDatabase(sessionHandoffDatabasePath(f.root, f.config));
    const hostRow = database
      .query("SELECT id,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'")
      .all(f.workspace)
      .find((row) => JSON.parse(row.payload).binding.lifecycle_work_id === 'stopped');
    const legacyWork = JSON.parse(hostRow.payload);
    for (const attempt of legacyWork.execution.assignment_attempts) {
      delete attempt.correction_generation;
      delete attempt.correction_authorization;
    }
    const journalRow = database
      .query('SELECT payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?')
      .get(f.workspace, 'stopped', 1);
    const legacyJournal = JSON.parse(journalRow.payload),
      issued = legacyJournal.items.find((item) => item.host_reservation);
    for (const receipt of [issued.host_reservation.receipt, issued.host_reservation.authorization.receipt]) {
      delete receipt.attempt.correction_generation;
      delete receipt.attempt.correction_authorization;
    }
    const saveWork = (value) =>
      database
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=?")
        .run(canonicalJson(value), canonicalJsonDigest(value), f.workspace, hostRow.id);
    const saveJournal = (value) =>
      database
        .query(
          'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .run(canonicalJson(value), canonicalJsonDigest(value), f.workspace, 'stopped', 1);
    const rejectJournalChange = (change) => {
      saveWork(legacyWork);
      const changed = structuredClone(legacyJournal),
        item = changed.items.find((entry) => entry.host_reservation);
      change(item, changed);
      saveJournal(changed);
      expect(() => repair()).toThrow(/repair|binding|governance|authorization|issue|attempt/i);
      saveJournal(legacyJournal);
    };
    rejectJournalChange((item) => {
      item.host_reservation.authorization.receipt.attempt.request_digest = 'f'.repeat(64);
    });
    rejectJournalChange((item) => {
      item.request.action_id = 'a'.repeat(64);
    });
    rejectJournalChange((item) => {
      item.host_reservation.invocation.assignmentIndex++;
    });
    rejectJournalChange((item) => {
      item.host_reservation.invocation.teamId = 'foreign-team';
    });
    rejectJournalChange((item) => {
      item.host_reservation.invocation.profile.mutation_scope = 'none';
    });
    rejectJournalChange((item) => {
      item.host_reservation.invocation.profile.egress_policy = 'network';
    });
    rejectJournalChange((item) => {
      item.host_reservation.invocation.workContext.binding.repository_id = 'foreign-repository';
    });
    rejectJournalChange((item) => {
      item.host_reservation.request.teamId = 'foreign-team';
    });
    rejectJournalChange((item, journal) => {
      journal.source_scope.digest = 'f'.repeat(64);
    });
    rejectJournalChange((item) => {
      item.host_reservation.authorization.approval.binding.operation_hash = 'e'.repeat(64);
    });

    const approvalRow = database
      .query(
        "SELECT store_id,record_key,revision,payload,digest FROM agent_host_governance WHERE workspace_id=? AND kind='approval'",
      )
      .all(f.workspace)
      .find((row) => {
        const value = JSON.parse(row.payload);
        return (
          row.store_id === issued.host_reservation.authorization.approval.store_id &&
          row.record_key === canonicalJsonDigest(issued.host_reservation.authorization.approval.binding) &&
          value.status === 'commit_unknown'
        );
      });
    database
      .query(
        "DELETE FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind='approval' AND record_key=?",
      )
      .run(f.workspace, approvalRow.store_id, approvalRow.record_key);
    expect(() => repair()).toThrow(/governance|approval|repair/i);
    database
      .query('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)')
      .run(
        f.workspace,
        approvalRow.store_id,
        'approval',
        approvalRow.record_key,
        approvalRow.revision,
        approvalRow.payload,
        approvalRow.digest,
      );

    const partialWork = structuredClone(legacyWork);
    partialWork.execution.assignment_attempts[0].correction_generation = 0;
    saveWork(partialWork);
    expect(() => repair()).toThrow(/partial assignment authority|ambiguous/i);

    const correctiveHistory = structuredClone(legacyWork);
    correctiveHistory.lifecycle.assurance.correction_count = 1;
    saveWork(correctiveHistory);
    expect(() => repair()).toThrow(/corrective history|correction_count|base generation/i);
  } finally {
    database?.close();
    await f.close();
  }
});
