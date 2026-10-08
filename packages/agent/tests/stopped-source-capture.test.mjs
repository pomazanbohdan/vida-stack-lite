import { test as bunTest, expect, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { openHostStateDatabase, inspectHostWorkspaceDatabase } from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import {
  openAdmittedSessionExecution,
  readAdmittedSessionIntake,
} from '../src/orchestration/admitted-session-execution.ts';
import {
  openConfiguredMastraSessionLedger,
  sessionHandoffDatabasePath,
} from '../src/orchestration/persistent-session-handoff.ts';
import { MastraSessionBridge, sessionBridgeDatabasePath } from '../src/orchestration/mastra-session-bridge.ts';
import { prepareWorkflowExecution, reserveWorkflowAssignmentForSession } from '../src/runtime-kernel.ts';
import { suspendLocalWork, suspendCompletedReadOnlyWork } from '../src/orchestration/suspend-local-work.ts';
import { run } from '../bin/run.mjs';
import { containedControllerFixture } from './contained-controller-fixture.mjs';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let containedPackage;
let candidateBinding;
const cleanupHookOptions = { timeout: 15000 };
let caseBudget;
let checkedAfterCase;
function ensureContainedPackage() {
  if (!containedPackage) {
    containedPackage = containedControllerFixture(bundle);
    candidateBinding = containedPackage.binding;
    Object.assign(cleanupHookOptions, containedPackage.cleanupHookOptions);
  }
  return containedPackage;
}
function test(name, body, timeout, { sourceOnly = false } = {}) {
  bunTest(
    name,
    async () => {
      if (!sourceOnly) {
        caseBudget = ensureContainedPackage().caseBudget();
        checkedAfterCase = false;
        containedPackage.assertUnchanged();
        caseBudget.remaining();
      }
      try {
        await body();
      } finally {
        if (!sourceOnly && !checkedAfterCase) containedPackage.assertUnchanged();
      }
    },
    timeout,
  );
}
afterAll(() => containedPackage?.close(), cleanupHookOptions);
function copiedRun(args) {
  const result = containedPackage.run(args, caseBudget);
  if (result.status !== 0) throw new Error(result.payload.message);
  return result.payload;
}
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
    ledger,
    projectIds: [selection.project],
    repositoryRoot: root,
    config,
    selection,
    context: input.context,
    workflowId: 'task_execution',
    workspaceId: workspace,
  });
  await bridge.start(source);
  const sync = () => ledger.resume('stopped', 1);
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
  await bridge.resume(
    journal.state.step_id,
    journal.state.items.map((entry) => entry.observation),
    source,
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
    let packageError;
    for (const extra of extraBridges) await extra.close();
    await bridge.close();
    ledger.close();
    if (containedPackage) {
      try {
        containedPackage.assertUnchanged();
        checkedAfterCase = true;
      } catch (error) {
        packageError = error;
      }
    }
    if (containedPackage?.retained) {
      console.warn('Consumer retained after package drift or unknown child outcome: ' + root);
      if (packageError) throw packageError;
      return;
    }
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
      ledger,
      projectIds: [selection.project],
      repositoryRoot: root,
      config,
      selection,
      context: next.input.context,
      workflowId: 'task_execution',
      workspaceId: workspace,
    });
    extraBridges.push(nextBridge);
    await nextBridge.start(next.source);
    const nextSync = () => ledger.resume(id, 1);
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
    await nextBridge.resume(
      nextJournal.state.step_id,
      nextJournal.state.items.map((item) => item.observation),
      next.source,
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
        copiedRun([
          '--capture-stopped-source',
          'true',
          '--mode',
          mode,
          '--project-root',
          root,
          '--request',
          requestRef,
        ]),
    };
  }
  function retireOwner() {
    const host = store.readHostStateSnapshot(identity), journal = ledger.resume('stopped', 1),
      item = journal.state.items[0];
    return store.retireInterruptedSourceOwner({
      identity,
      attempt: 1,
      actionId: item.request.action_id,
      issueId: item.issue_id,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedJournal: journal.version,
      expectedMaintenanceGeneration: host.maintenanceGeneration,
      authorization: reservation.authorization,
      operatorHandle: input.nativeSessionHandle,
      decisionPointer: 'synthetic:retired-source-capture-owner-release',
      evidence: {
        schema: 'InterruptedSourceRetirementEvidence/v1',
        source_thread_id: 'synthetic-original-turn',
        source_thread_status: 'interrupted',
        read_thread_ref: 'synthetic:original-turn-interrupted',
        list_agents_ref: 'synthetic:no-active-source-writers',
        active_source_writer_ids: [],
      },
    });
  }
  function retiredCaptureInput(retirement) {
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic partial candidate bytes');
    const candidate = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']),
      host = store.readHostStateSnapshot(identity), journal = ledger.resume('stopped', 1),
      item = journal.state.items[0], summary = 'Synthetic original Source turn was interrupted after a partial write',
      observation = {
        schema: 'VidaSessionObservation/v1',
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        host_attempt_id: reservation.receipt.attempt.attempt_id,
        agent_id: 'synthetic-native-writer',
        tool_call_ref: 'local:synthetic-retired-source-write',
        status: 'reported_failed',
        summary,
        output_digest: canonicalJsonDigest(summary),
        changed_paths: ['AGENT.sidecar.md'],
        evidence_refs: ['local:synthetic-retired-source-write'],
      },
      terminalEvidence = {
        schema: 'RetiredSourceTerminalEvidence/v1',
        source_thread_id: 'synthetic-native-source-thread',
        source_thread_status: 'notLoaded',
        source_turn_status: 'interrupted',
        source_turn_id: 'synthetic-original-turn',
        operator_thread_id: input.nativeSessionHandle,
        original_actor_id: observation.agent_id,
        final_message_id: null,
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        host_attempt_id: observation.host_attempt_id,
        active_source_writer_ids: [],
        observed_commands: [],
        original_tool_records: [
          {
            call_ref: 'synthetic-file-change',
            actor_id: observation.agent_id,
            action_id: item.request.action_id,
            issue_id: item.issue_id,
            host_attempt_id: observation.host_attempt_id,
            status: 'completed',
            changed_paths: ['AGENT.sidecar.md'],
          },
        ],
        later_grants: [],
      },
      candidateSnapshot = {
        schema: 'UnverifiedSourceSnapshot/v1',
        entries: candidate.entries.map((entry) => ({ path: entry.path, sha256: entry.sha256, size: entry.bytes })),
      },
      operation = {
        schema: 'RetiredSourceCapture/v1',
        identity,
        attempt: 1,
        actionId: item.request.action_id,
        issueId: item.issue_id,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: host.maintenanceGeneration,
        retirementOperationId: retirement.operation_id,
        retirementClaimId: retirement.snapshot.ledger.claims.find(
          (entry) => entry.ticket_id === reservation.receipt.attempt.lease.ticket_id,
        ).claim_id,
        operatorHandle: input.nativeSessionHandle,
        observation,
        terminalEvidence,
        candidateSnapshot,
        attributions: [],
      };
    const digest = (value) => createHash('sha256').update(value).digest('hex'),
      packet = { schema: 'DevelopmentTaskPacket/v1', work_item_id: 'stopped', attempt: 1,
        packet_id: 'synthetic-packet', digest: canonicalJsonDigest('synthetic-packet') },
      issued = { request: item.request, action: { action_id: item.request.action_id,
        stage_id: item.request.stage_id, scope_digest: item.request.scope_digest },
        issue_id: item.issue_id, host_attempt_id: observation.host_attempt_id, development_packet: packet },
      commands = [
        { type: 'commandExecution', id: 'synthetic-issue', command: 'vida-agent run --issue-wave true',
          status: 'completed', exitCode: 0, output: { truncated: false,
            text: JSON.stringify({ schema: 'VidaAgentRunResult/v1', issued_actions: [issued] }) } },
        { type: 'commandExecution', id: 'synthetic-wave', command: 'vida-agent inspect issued packet',
          status: 'completed', exitCode: 0, output: { truncated: false,
            text: JSON.stringify({ status: 'wave_issued', issue_id: item.issue_id,
              host_attempt_id: observation.host_attempt_id, packet_id: packet.packet_id }) } },
      ],
      diff = '@@ -1 +1 @@\n-Synthetic source preimage\n+Synthetic partial candidate bytes\n',
      artifact = { schema: 'CoreNativeIssuedTurnRead/v1', host: 'local', tool: 'mcp__codex_app__read_thread',
        max_output_chars_per_item: 20000, data: {
          thread: { id: terminalEvidence.source_thread_id, kind: 'codex', status: { type: 'notLoaded' } },
          turns: [{ id: terminalEvidence.source_turn_id, status: 'interrupted', items: [...commands,
            { type: 'fileChange', id: 'synthetic-file-change', status: 'completed', changes: [
              { path: path.join(root, 'AGENT.sidecar.md'), kind: { type: 'update' }, diff: { text: diff, truncated: false } },
            ] },
          ] }],
        } },
      artifactRef = '.tmp/retired-source-native-read.json';
    writeJson(root, artifactRef, artifact);
    terminalEvidence.observed_commands = commands.map((entry) => ({ ref: entry.id, status: entry.status,
      exit_code: entry.exitCode, command_sha256: digest(entry.command), output_sha256: digest(entry.output.text),
      output_present: true, output_truncated: false }));
    operation.attributions = [{ path: 'AGENT.sidecar.md', event_ref: 'synthetic-file-change',
      kind: 'file_change', evidence_sha256: digest(diff) }];
    operation.nativeTurnEvidenceRef = artifactRef;
    operation.nativeReadResult = { schema: 'RetiredSourceNativeTurnEvidence/v1', artifact_ref: artifactRef,
      artifact_sha256: digest(readFileSync(path.join(root, artifactRef))),
      thread_id: terminalEvidence.source_thread_id, thread_status: 'notLoaded',
      turn_id: terminalEvidence.source_turn_id, turn_status: 'interrupted',
      issue: { action_id: item.request.action_id, issue_id: item.issue_id, host_attempt_id: observation.host_attempt_id,
        packet_id: packet.packet_id, packet_digest: packet.digest, work_item_id: packet.work_item_id,
        attempt: 1, stage_id: item.request.stage_id, scope_digest: item.request.scope_digest },
      command_refs: commands.map((entry) => entry.id), file_change_refs: ['synthetic-file-change'],
      source_effects: operation.attributions };
    const verifyCurrent = () => {
      expect(snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md'])).toEqual(candidate);
      expect(loadRuntimeConfig(root)).toEqual(config);
    };
    return { operation, verifyCurrent };
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
    retireOwner,
    retiredCaptureInput,
    admission,
    laterWriter,
  };
}

test('retired Source capture settles only the issued failure and retries through its separate public route', async () => {
  const f = await fixture();
  try {
    const retirement = f.retireOwner(), c = f.retiredCaptureInput(retirement),
      before = f.inspect(), ddl = f.ddl(), journalBefore = f.ledger.resume('stopped', 1),
      incomplete = { ...c.operation, attributions: [] };
    expect(() => f.store.captureRetiredSourceObservation({ ...incomplete, verifyCurrent: c.verifyCurrent })).toThrow(
      'attribution is incomplete',
    );
    expect(() => f.store.captureRetiredSourceObservation({
      ...c.operation,
      verifyCurrent: c.verifyCurrent,
      fault() { throw Error('synthetic retired-source post-write fault'); },
    })).toThrow('synthetic retired-source post-write fault');
    expect(f.inspect()).toEqual(before);
    expect(f.ddl()).toEqual(ddl);
    expect(f.ledger.resume('stopped', 1)).toEqual(journalBefore);

    const requestRef = '.agent/work/stopped/retired-source-capture.json';
    writeJson(f.root, requestRef, { workspace_id: f.workspace, ...c.operation });
    const args = [
      '--capture-retired-source', 'true', '--project-root', f.root,
      '--native-session-handle', f.input.nativeSessionHandle, '--request', requestRef,
    ];
    const result = await run(args);
    expect(result).toMatchObject({
      schema: 'RetiredSourceCapture/v1',
      status: 'captured_original_partial_source_failure',
      rights_granted: false,
      canonical_acceptance: false,
      runtime_acceptance: false,
    });
    const after = f.store.readHostStateSnapshot(f.identity), journal = f.ledger.resume('stopped', 1);
    expect(after.work.lease).toBeNull();
    expect(after.work.execution.status).toBe('suspended');
    expect(after.work.execution.assignment_attempts[0]).toMatchObject({
      status: 'completed', result: c.operation.observation,
    });
    expect(journal.state.items[0].observation).toEqual(c.operation.observation);
    expect(journal.state.source_scope).toEqual(f.source);
    expect(after.ledger.tickets.find((entry) => entry.ticket_id === f.reservation.receipt.attempt.lease.ticket_id).status)
      .toBe('released');
    const retried = await run(args);
    expect(retried.work_version).toEqual(result.work_version);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
    writeJson(f.root, requestRef, {
      workspace_id: f.workspace,
      ...c.operation,
      terminalEvidence: { ...c.operation.terminalEvidence, source_turn_id: 'synthetic-changed-turn' },
    });
    await Promise.resolve(expect(run(args)).rejects.toThrow('original thread or interrupted turn differs'));
  } finally {
    await f.close();
  }
}, 60000, { sourceOnly: true });

test('retired Source capture rejects foreign retirement, stale CAS and an active overlapping writer', async () => {
  const f = await fixture();
  try {
    const retirement = f.retireOwner(), c = f.retiredCaptureInput(retirement), before = f.inspect();
    for (const change of [
      { retirementOperationId: 'foreign-retirement-operation' },
      { expectedWork: { ...c.operation.expectedWork, revision: c.operation.expectedWork.revision + 1 } },
      { terminalEvidence: { ...c.operation.terminalEvidence, final_message_id: 'invented-final-message' } },
    ])
      expect(() => f.store.captureRetiredSourceObservation({
        ...c.operation, ...change, verifyCurrent: c.verifyCurrent,
      })).toThrow();
    expect(f.inspect()).toEqual(before);
    await f.laterWriter('later-overlap', 'AGENT.sidecar.md');
    const current = f.store.readHostStateSnapshot(f.identity), overlapping = f.retiredCaptureInput(retirement);
    expect(() => f.store.captureRetiredSourceObservation({
      ...overlapping.operation,
      expectedWork: current.workVersion,
      expectedLedger: current.ledgerVersion,
      verifyCurrent: overlapping.verifyCurrent,
    })).toThrow('active Source ownership');
  } finally {
    await f.close();
  }
}, 60000, { sourceOnly: true });

test('retired Source capture accounts command patches, exact exclusions and unresolved outcomes', async () => {
  const f = await fixture();
  try {
    const retirement = f.retireOwner(), c = f.retiredCaptureInput(retirement), before = f.inspect(),
      artifactPath = path.join(f.root, c.operation.nativeTurnEvidenceRef),
      retainedArtifact = JSON.parse(readFileSync(artifactPath)),
      artifact = { schema: 'RetiredSourceTurnRead/v1', data: retainedArtifact.data },
      requestRef = '.agent/work/stopped/retired-command-capture.json',
      args = ['--capture-retired-source', 'true', '--project-root', f.root,
        '--native-session-handle', f.input.nativeSessionHandle, '--request', requestRef];
    const event = { type: 'commandExecution', id: 'synthetic-command-patch', status: 'failed', exitCode: 1,
      command: "git apply '.tmp/original.patch'", output: { text: '', truncated: false } };
    artifact.data.turns[0].items.push(event);
    writeJson(f.root, c.operation.nativeTurnEvidenceRef, artifact);
    writeJson(f.root, requestRef, { workspace_id: f.workspace, ...c.operation });
    await Promise.resolve(expect(run(args)).rejects.toThrow('patch outcome is unresolved'));
    expect(f.inspect()).toEqual(before);
    mkdirSync(path.join(f.root, '.tmp'), { recursive: true });
    writeFileSync(path.join(f.root, '.tmp/original.patch'),
      'diff --git a/AGENT.sidecar.md b/AGENT.sidecar.md\n--- a/AGENT.sidecar.md\n+++ b/AGENT.sidecar.md\n@@ -1 +1 @@\n-old\n+new\n' +
      'diff --git a/outside-source.txt b/outside-source.txt\n--- a/outside-source.txt\n+++ b/outside-source.txt\n@@ -1 +1 @@\n-old\n+new\n');
    event.status = 'completed'; event.exitCode = 0;
    event.command = "git apply --check '.tmp/not-retained.patch'; git apply --exclude='outside-source.txt' '.tmp/original.patch'";
    const standalone = { type: 'commandExecution', id: 'synthetic-unscoped-write', status: 'completed', exitCode: 0,
      command: "Path('packages/agent/src/outside.ts').write_text('unexpected')", output: { text: '', truncated: false } };
    artifact.data.turns[0].items.push(standalone);
    for (const command of [standalone.command, "with Path('docs/outside.md').open('a') as f: f.write('unexpected')"] ) {
      standalone.command = command;
      writeJson(f.root, c.operation.nativeTurnEvidenceRef, artifact);
      await Promise.resolve(expect(run(args)).rejects.toThrow('outside the original scope'));
      expect(f.inspect()).toEqual(before);
    }
    artifact.data.turns[0].items.pop();
    writeJson(f.root, c.operation.nativeTurnEvidenceRef, artifact);
    expect(await run(args)).toMatchObject({ status: 'captured_original_partial_source_failure', rights_granted: false });
    expect(f.ledger.resume('stopped', 1).state.items[0].observation.changed_paths).toEqual(['AGENT.sidecar.md']);
    expect(f.store.readHostStateSnapshot(f.identity).work.execution.status).toBe('suspended');
  } finally {
    await f.close();
  }
}, 60000, { sourceOnly: true });

test('direct stopped Source capture succeeds without synthesis proposal fields', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      beforeJournal = f.ledger.resume('stopped', 1);
    expect(Object.hasOwn(c.operation, 'nextWork')).toBe(false);
    expect(Object.hasOwn(c.operation, 'nextLedger')).toBe(false);
    const settled = f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent }),
      afterJournal = f.ledger.resume('stopped', 1),
      expectedJournal = structuredClone(beforeJournal.state);
    expectedJournal.items[0].observation = c.operation.observation;
    expect(settled.work.lease).toBeNull();
    expect(settled.work.execution.status).toBe('suspended');
    expect(settled.work.execution.assignment_attempts[0]).toMatchObject({
      status: 'completed',
      result: { status: 'reported_failed', changed_paths: ['AGENT.sidecar.md'] },
    });
    expect(
      settled.ledger.tickets.find((entry) => entry.ticket_id === f.reservation.receipt.attempt.lease.ticket_id)?.status,
    ).toBe('released');
    expect(afterJournal.state).toEqual(expectedJournal);
    expect(afterJournal.state.source_scope).toEqual(f.source);
    expect(f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent })).toEqual(settled);
    expect(f.ledger.resume('stopped', 1).state).toEqual(afterJournal.state);
  } finally {
    await f.close();
  }
}, 60000, { sourceOnly: true });

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
      copiedRun([
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
  }
}, 60000);

test('completed readonly release tolerates package and declared-source drift while releasing only the old owner', async () => {
  mkdirSync(path.join(bundle, '.tmp'), { recursive: true });
  const f = await fixture({ writer: false }),
    packageFixtureRoot = mkdtempSync(path.join(bundle, '.tmp', 'readonly-release-drift-')),
    packageRoot = path.join(packageFixtureRoot, 'vida-agent');
  try {
    mkdirSync(packageRoot);
    const excluded = ['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect'];
    for (const entry of readdirSync(bundle)) {
      if (!excluded.includes(entry))
        cpSync(path.join(bundle, entry), path.join(packageRoot, entry), { recursive: true });
    }
    const clonedRuntime = await import(pathToFileURL(path.join(packageRoot, 'src/config/runtime-config.ts')).href),
      clonedSnapshots = await import(
        pathToFileURL(path.join(packageRoot, 'src/orchestration/scoped-source-snapshot.ts')).href
      ),
      clonedRun = await import(pathToFileURL(path.join(packageRoot, 'bin/run.mjs')).href),
      host = f.store.readHostStateSnapshot(f.identity),
      journal = f.ledger.resume('stopped', 1),
      runtimeCodePaths = readAdmittedSessionIntake(f.root, f.store, f.identity).runtime_code_paths,
      scopedPaths = journal.state.source_scope.entries.map((entry) => entry.path),
      beforePackage = clonedSnapshots.snapshotRuntimePackageSources(
        clonedRuntime.runtimePackageAccess(),
        f.config.runtime.bundle,
        runtimeCodePaths,
      ),
      beforeProject = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), scopedPaths);
    expect(beforePackage.digest).toBe(host.work.binding.runtime_code_digest);
    expect(beforeProject.digest).toBe(journal.state.source_scope.digest);

    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Synthetic changed scoped source');
    writeFileSync(
      path.join(packageRoot, 'bin/run.mjs'),
      Buffer.concat([
        readFileSync(path.join(packageRoot, 'bin/run.mjs')),
        Buffer.from('\n// synthetic package drift\n'),
      ]),
    );
    const afterPackage = clonedSnapshots.snapshotRuntimePackageSources(
        clonedRuntime.runtimePackageAccess(),
        f.config.runtime.bundle,
        runtimeCodePaths,
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
      await Promise.resolve(expect(cli()).rejects.toThrow('Readonly release actual engine completion differs'));
      const denied = containedPackage.run(
        [
          '--release-completed-readonly',
          'true',
          '--mode',
          'inspect',
          '--project-root',
          f.root,
          '--request',
          requestRef,
        ],
        caseBudget,
      );
      expect(denied.status).toBe(1);
      expect(denied.payload).toMatchObject({
        schema: 'VidaAgentRunResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-RUN-EXECUTION-001',
      });
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
