import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import type { WorkItemSelection } from '../src/config/runtime-config.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { coordinationLedgerDigest, type CoordinationLedger } from '../src/contracts/envelopes.ts';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
  parseSessionBridgeRunState,
  type SessionBridgeSnapshot,
} from '../src/orchestration/mastra-session-bridge.ts';
import { readConfiguredContinuationSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  projectConfiguredFrontierContinuationAction,
  projectConfiguredPrewriterContinuationRequests,
  validateClosedConfigTransitionProof,
  validateDeliveredWorkContinuationRequest,
  type ClosedConfigTransitionProof,
} from '../src/orchestration/delivered-work-continuation.ts';
import type { SessionBridgeObservation } from '../src/orchestration/mastra-session-bridge-contract.ts';
import { sessionActionsForWave, type SessionHandoffContext } from '../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import type { WorkState } from '../src/host-state.ts';
import type { ConfiguredFrontierReceipt } from '../src/orchestration/delivered-work-continuation-repair.ts';
import type { DeliveredWorkContinuationRequest } from '../src/orchestration/delivered-work-continuation.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import type { ScopedSourceSnapshot } from '../src/orchestration/scoped-source-snapshot.ts';
import type { SessionEngineBinding } from '../src/orchestration/session-engine-snapshot.ts';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = new Set<string>();
afterEach(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.clear();
});

function scope(
  entries: readonly { path: string; exists: boolean; bytes: number; sha256: string }[],
): ScopedSourceSnapshot {
  const body: Pick<ScopedSourceSnapshot, 'schema' | 'entries'> = { schema: 'ScopedSourceSnapshot/v1', entries };
  return { ...body, digest: canonicalJsonDigest(body) };
}

function completedObservations(wave: MastraSessionLedgerState['completed'][number]): SessionBridgeObservation[] {
  const observations: SessionBridgeObservation[] = [];
  for (const item of wave.items) {
    if (item.observation === null) throw new Error('completed fixture wave lacks its report');
    observations.push(item.observation);
  }
  return observations;
}

function fixture({ afterBoundary = false }: { afterBoundary?: boolean } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-mastra-continuation-'));
  roots.add(root);
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'continuation-fixture')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('.agent/work', '.agent/current-work'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture source map');
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    configuredProject = config.projects[0];
  if (!configuredProject) throw new Error('fixture project is missing');
  const project = configuredProject.project_id,
    workId = 'continuation-work',
    attempt = 4,
    workflowId = 'task_execution',
    runId = 'vida-original-configured-run',
    priorConfigDigest = '1'.repeat(64),
    targetConfigDigest = runtimeConfigDigest(config),
    originalScope = scope([{ path: 'src/example.ts', exists: true, bytes: 10, sha256: '2'.repeat(64) }]),
    currentScope = scope([{ path: 'src/example.ts', exists: true, bytes: 11, sha256: '3'.repeat(64) }]),
    selection: WorkItemSelection = {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project,
      risk_flags: ['high'],
      labels: [],
    },
    oldContext: SessionHandoffContext = { work_id: workId, attempt, scope_digest: originalScope.digest },
    currentContext = { ...oldContext, scope_digest: currentScope.digest },
    plan = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags, 'high'),
    boundaryWave = plan.waves.findIndex((wave) => wave.some((stage) => stage.id === 'review_source_prewrite')),
    developerWave = plan.waves.findIndex((wave) => wave.some((stage) => stage.kind === 'develop'));
  expect(boundaryWave).toBeGreaterThanOrEqual(0);
  expect(developerWave).toBe(boundaryWave + 1);
  if (boundaryWave < 0 || developerWave < 0) throw new Error('configured workflow boundary is missing');

  const workItem = {
      schema: 'WorkItem/v1',
      id: workId,
      provider: 'fixture',
      provider_type: 'fixture',
      canonical_kind: selection.kind,
      intent: selection.intent,
      project_id: project,
      title: 'Continuation reader fixture',
      description: '',
      labels: [],
      risk_flags: ['high'],
    },
    intake = {
      schema: 'VidaLocalSessionIntake/v1',
      native_session_handle: 'fixture-session',
      risk: 'high',
      work_item: workItem,
      runtime_code_paths: [],
    },
    intakeBytes = Buffer.from(JSON.stringify(intake));
  writeFileSync(path.join(root, 'accepted-intake.json'), intakeBytes);
  const work: WorkState = {
    schema: 'WorkState/v1',
    workspace_id: deriveWorkspaceId(config.repository.repository_id, root),
    revision: 1,
    binding: {
      repository_id: config.repository.repository_id,
      project_ids: [project],
      integrations_digest: '3'.repeat(64),
      team_id: selection.team,
      workflow_id: workflowId,
      provider_work_item_id: workId,
      lifecycle_work_id: workId,
      work_item_digest: canonicalJsonDigest(workItem),
      work_source_revision: originalScope.digest,
      scope_id: 'continuation-scope',
      scope_contract_digest: '8'.repeat(64),
      acceptance_manifest_digest: '9'.repeat(64),
      ac_ids: [],
      implementation_paths: ['src/example.ts'],
      allowed_resources: ['file:src/example.ts'],
      config_digest: priorConfigDigest,
      runtime_source_revision: 'd'.repeat(64),
      schema_digest: 'a'.repeat(64),
      runtime_code_digest: 'b'.repeat(64),
    },
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: 'scope.json', sha256: '8'.repeat(64) },
      acceptance: { schema: 'AcceptanceManifest/v1', path: 'acceptance.json', sha256: '9'.repeat(64) },
      decisions: [],
    },
    lease: null,
    execution: {
      run_id: runId,
      input_digest: '4'.repeat(64),
      phase: 'execute',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: originalScope.digest,
      next_action: 'Continue the accepted workflow.',
      route: 'R1',
      risk: 'high',
      change_kind: 'fix',
      config_binding: {
        config_digest: priorConfigDigest,
        schema_digest: 'a'.repeat(64),
        runtime_code_digest: 'b'.repeat(64),
      },
      scope: {
        scope_id: 'continuation-scope',
        allowed_paths: ['src/example.ts'],
        fingerprint_paths: ['src/example.ts'],
        implementation_paths: ['src/example.ts'],
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'continuation-epoch',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    artifacts: [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: 'accepted-intake.json',
        sha256: createHash('sha256').update(intakeBytes).digest('hex'),
        stage_id: 'intake',
        source_revision: originalScope.digest,
        scope_id: 'continuation-scope',
        ac_ids: [],
      },
    ],
  };
  const input = parseSessionBridgeRunState({
    work_id: workId,
    attempt,
    workflow_id: workflowId,
    scope_digest: originalScope.digest,
    config_digest: priorConfigDigest,
    selection,
    observations: [],
  });
  const beforeEntry = originalScope.entries[0],
    afterEntry = currentScope.entries[0];
  if (!beforeEntry || !afterEntry) throw new Error('fixture source scope entry is missing');
  const ledger: CoordinationLedger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: work.workspace_id,
    revision: 1,
    open_generation: 1,
    next_sequence: 1,
    tickets: [],
    claims: [],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    operations: [],
    retirements: [],
  };
  const successorLedger: CoordinationLedger = { ...ledger, revision: ledger.revision + 1 };
  const requestFor = (
    waveIndex: number,
    action: Parameters<typeof buildSessionBridgeRequest>[0]['action'],
    context: Parameters<typeof buildSessionBridgeRequest>[0]['context'],
    configDigest: string,
    priorResults: typeof input.observations,
  ) =>
    buildSessionBridgeRequest({
      runId,
      workflowId,
      configDigest,
      context,
      waveIndex,
      action,
      configuredContext: configuredContextForStage(root, config, workflowId, action.stage_id, context),
      priorResults,
    });
  const completed: MastraSessionLedgerState['completed'][number][] = [];
  let oldState = input;
  for (let waveIndex = 0; waveIndex < boundaryWave; waveIndex++) {
    const actions = sessionActionsForWave(config, selection, oldContext, workflowId, waveIndex, [], undefined, 'high');
    expect(actions.length).toBeGreaterThan(0);
    const items = actions.map((action) => {
      const request = requestFor(waveIndex, action, oldContext, priorConfigDigest, oldState.observations),
        summary = `Original completed wave ${waveIndex}`,
        observation: SessionBridgeObservation = {
          schema: 'VidaSessionObservation/v1',
          action_id: request.action_id,
          issue_id: randomUUID(),
          agent_id: action.role,
          tool_call_ref: `fixture-wave-${waveIndex}`,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: [],
        };
      return { request, issue_id: observation.issue_id, observation };
    });
    completed.push({ step_id: `wave-${waveIndex}`, items });
    oldState = { ...oldState, observations: [...oldState.observations, ...items.map((item) => item.observation)] };
  }
  const developerAction = sessionActionsForWave(
    config,
    selection,
    oldContext,
    workflowId,
    developerWave,
    [],
    undefined,
    'high',
  )[0];
  if (!developerAction) throw new Error('configured developer action is missing');
  const oldDeveloperRequest = requestFor(
      boundaryWave,
      developerAction,
      oldContext,
      priorConfigDigest,
      oldState.observations,
    ),
    journal: MastraSessionLedgerState = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: work.workspace_id,
      work_id: workId,
      attempt,
      run_id: runId,
      source_scope: originalScope,
      step_id: `wave-${boundaryWave}`,
      items: [{ request: oldDeveloperRequest, issue_id: null, observation: null }],
      completed,
    },
    beforeEngine: SessionBridgeSnapshot = {
      run_id: runId,
      status: 'suspended',
      step_id: journal.step_id,
      requests: [oldDeveloperRequest],
      observations: oldState.observations,
    },
    identity = {
      repository_id: config.repository.repository_id,
      project_ids: [project],
      integrations_digest: '3'.repeat(64),
      work_id: workId,
    },
    binding: SessionEngineBinding = {
      repositoryRoot: root,
      config,
      selection,
      context: currentContext,
      workflowId,
      runId,
      lifecycleRisk: 'high',
    },
    action = projectConfiguredFrontierContinuationAction({
      engine: beforeEngine,
      journal,
      targetConfigDigest,
      currentSourceScope: currentScope,
    }),
    transition: ClosedConfigTransitionProof['transition'] = {
      schema: 'RuntimeConfigDeliveryTransition/v1',
      operation_path: '.agent/work/config-transition/operation.json',
      operation_sha256: 'a'.repeat(64),
      operation_plan_digest: 'b'.repeat(64),
      request_id: 'continuation-request',
      request_digest: 'c'.repeat(64),
      report_digest: 'd'.repeat(64),
      source_snapshot_digest: 'e'.repeat(64),
      target_config_digest: targetConfigDigest,
      target_yaml_sha256: 'f'.repeat(64),
      receipt_path: '.agent/work/config-transition/receipt.json',
      receipt_sha256: '0'.repeat(64),
      fence: {
        schema: 'MaintenanceFence/v1',
        workspace_id: work.workspace_id,
        revision: 1,
        generation: 1,
        status: 'released',
        binding: {
          schema: 'MaintenanceFenceBinding/v1',
          project_ids: [project],
          operation_id: 'continuation-operation',
          manifest_digest: '1'.repeat(64),
          request_digest: '2'.repeat(64),
          bindings_digest: '3'.repeat(64),
          closure_digest: '4'.repeat(64),
          bundle_digest: '5'.repeat(64),
        },
        token_digest: '6'.repeat(64),
      },
      native_self_attestation_digest: '7'.repeat(64),
      runtime_accepted: false,
    },
    sourceTransition = validateClosedConfigTransitionProof({
      status: 'closed_config_transition_proven',
      operation_id: 'continuation-operation',
      baseline_config_digest: priorConfigDigest,
      transition,
      transition_digest: canonicalJsonDigest(transition),
      caller_owner_cas_required: true,
      runtime_accepted: false,
      writes_host_state: false,
    }),
    request: DeliveredWorkContinuationRequest = validateDeliveredWorkContinuationRequest({
      schema: 'DeliveredWorkContinuationRequest/v1',
      identity,
      attempt,
      nativeSessionHandle: 'fixture-session',
      expectedWork: { revision: work.revision, digest: canonicalJsonDigest(work) },
      expectedLedger: { revision: ledger.revision, digest: coordinationLedgerDigest(ledger) },
      expectedJournal: { revision: 1, digest: canonicalJsonDigest(journal) },
      expectedMaintenanceGeneration: 1,
      priorConfigDigest,
      targetConfigDigest,
      targetSchemaDigest: '9'.repeat(64),
      targetProjectContextDigest: 'a'.repeat(64),
      priorRuntimeCodeDigest: 'b'.repeat(64),
      targetRuntimeCodeDigest: 'c'.repeat(64),
      forwardOperationId: sourceTransition.operation_id,
      parentManifestDigest: transition.fence.binding.manifest_digest,
      successorManifestDigest: transition.fence.binding.bundle_digest,
      currentSourceScope: currentScope,
      authorizedSourceChanges: [
        {
          path: 'src/example.ts',
          kind: 'changed',
          before: beforeEntry,
          after: afterEntry,
        },
      ],
      sourceTransition,
      action,
      originalRequestPointer: 'fixture:continuation-request',
    }),
    beforeBytes = Buffer.from(canonicalJson(beforeEngine)),
    currentRequests = projectConfiguredPrewriterContinuationRequests({
      repositoryRoot: root,
      config,
      selection,
      context: currentContext,
      workflowId,
      engine: beforeEngine,
      journal,
      currentSourceScope: currentScope,
      lifecycleRisk: 'high',
    }),
    successorJournal: MastraSessionLedgerState = {
      ...journal,
      source_scope: currentScope,
      items: currentRequests.map((item) => ({ request: item, issue_id: null, observation: null })),
    },
    successorWork: WorkState = {
      ...work,
      revision: work.revision + 1,
      binding: {
        ...work.binding,
        work_source_revision: currentScope.digest,
        config_digest: targetConfigDigest,
        runtime_source_revision: 'c'.repeat(64),
        runtime_code_digest: 'c'.repeat(64),
      },
      lifecycle: {
        ...work.lifecycle,
        revision: work.lifecycle.revision + 1,
        source_revision: currentScope.digest,
        config_binding: {
          ...work.lifecycle.config_binding,
          config_digest: targetConfigDigest,
          runtime_code_digest: 'c'.repeat(64),
        },
      },
    },
    workVersion = { revision: successorWork.revision, digest: canonicalJsonDigest(successorWork) },
    ledgerVersion = { revision: successorLedger.revision, digest: coordinationLedgerDigest(successorLedger) },
    journalVersion = { revision: 2, digest: canonicalJsonDigest(successorJournal) },
    receipt: ConfiguredFrontierReceipt = {
      schema: 'DeliveredWorkContinuationReceipt/v1',
      continuation_id: canonicalJsonDigest({
        identity: request.identity,
        attempt,
        action_id: action.request.action_id,
        transition_digest: request.sourceTransition.transition_digest,
      }),
      attempt,
      request_digest: canonicalJsonDigest(request),
      authorization: {
        schema: 'VidaDeliveredWorkContinuationAuthorization/v1',
        request_digest: canonicalJsonDigest(request),
        principal: 'fixture-read-only-projector',
        action_digest: canonicalJsonDigest(action),
        transition_digest: request.sourceTransition.transition_digest,
      },
      request,
      prior_work: work,
      prior_ledger: ledger,
      prior_journal: parseMastraSessionLedgerState(journal),
      prior_work_version: { revision: work.revision, digest: canonicalJsonDigest(work) },
      prior_ledger_version: { revision: ledger.revision, digest: coordinationLedgerDigest(ledger) },
      prior_journal_version: { revision: 1, digest: canonicalJsonDigest(journal) },
      historical_capture: null,
      frontier_snapshot: {
        snapshot_bytes_base64: beforeBytes.toString('base64'),
        snapshot_sha256: createHash('sha256').update(beforeBytes).digest('hex'),
      },
      successor_work: successorWork,
      successor_ledger: successorLedger,
      successor_binding: successorWork.binding,
      successor_journal: successorJournal,
      work_version: workVersion,
      ledger_version: ledgerVersion,
      journal_version: journalVersion,
      rights_granted: false,
      accepted_result: false,
      runtime_acceptance: false,
      status: 'action_ready',
    };

  const boundaryStepId = journal.step_id;
  if (boundaryStepId === null) throw new Error('configured frontier step is missing');
  const waveContexts: Record<string, unknown> = { input };
  let currentObservations: SessionBridgeObservation[] = [];
  let persistedStatus = 'suspended',
    suspendedPaths = { [boundaryStepId]: [boundaryWave] };
  if (afterBoundary) {
    let prefixState = input;
    for (const wave of completed) {
      const observations = completedObservations(wave),
        output = { ...prefixState, observations: [...prefixState.observations, ...observations] };
      waveContexts[wave.step_id] = {
        status: 'success',
        payload: prefixState,
        suspendPayload: { requests: wave.items.map((item) => item.request) },
        resumePayload: { observations },
        output,
      };
      prefixState = output;
    }
    const boundaryObservations: SessionBridgeObservation[] = currentRequests.map((currentRequest, index) => {
        const summary = `Current prewriter report ${index}`;
        return {
          schema: 'VidaSessionObservation/v1',
          action_id: currentRequest.action_id,
          issue_id: randomUUID(),
          agent_id: currentRequest.role,
          tool_call_ref: `fixture-prewriter-${index}`,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: [],
        };
      }),
      boundaryOutput = {
        ...prefixState,
        config_digest: targetConfigDigest,
        scope_digest: currentScope.digest,
        observations: [...prefixState.observations, ...boundaryObservations],
      };
    currentObservations = boundaryObservations;
    waveContexts[boundaryStepId] = {
      status: 'success',
      payload: prefixState,
      suspendPayload: { requests: currentRequests },
      resumePayload: { observations: boundaryObservations },
      output: boundaryOutput,
    };
    const laterActions = sessionActionsForWave(
        config,
        selection,
        currentContext,
        workflowId,
        developerWave,
        [],
        undefined,
        'high',
      ),
      laterRequests = laterActions.map((action) =>
        requestFor(developerWave, action, currentContext, targetConfigDigest, boundaryOutput.observations),
      ),
      executedWaves = [...plan.waves.entries()].filter(
        ([, wave]) => !wave.every((stage) => stage.assignments.length === 0),
      ),
      executionIndex = executedWaves.findIndex(([index]) => index === developerWave);
    waveContexts[`wave-${developerWave}`] = {
      status: 'suspended',
      payload: boundaryOutput,
      suspendPayload: { requests: laterRequests },
    };
    persistedStatus = 'suspended';
    suspendedPaths = { [`wave-${developerWave}`]: [executionIndex] };
  }
  if (!afterBoundary) {
    let state = input;
    for (const wave of completed) {
      const observations = completedObservations(wave),
        output = { ...state, observations: [...state.observations, ...observations] };
      waveContexts[wave.step_id] = {
        status: 'success',
        payload: state,
        suspendPayload: { requests: wave.items.map((item) => item.request) },
        resumePayload: { observations },
        output,
      };
      state = output;
    }
    waveContexts[boundaryStepId] = {
      status: 'suspended',
      payload: state,
      suspendPayload: { requests: [oldDeveloperRequest] },
    };
  }
  const persisted = { runId, status: persistedStatus, context: waveContexts, suspendedPaths },
    databasePath = path.join(root, config.control.work_root, 'mastra-workflows.v1.sqlite');
  mkdirSync(path.dirname(databasePath), { recursive: true });
  mkdirSync(path.join(root, '.agent', 'work'), { recursive: true });
  writeFileSync(path.join(root, '.agent', 'work', 'mastra-workflows.v1.sqlite'), 'old-config decoy');
  const database = new Database(databasePath, { create: true, strict: true });
  try {
    database.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot TEXT)');
    database
      .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,?)')
      .run(workflowId, runId, JSON.stringify(persisted));
  } finally {
    database.close();
  }
  return {
    root,
    databasePath,
    runId,
    binding,
    receipt,
    persisted,
    currentRequests,
    boundaryWave,
    developerWave,
    originalObservations: oldState.observations,
    currentObservations,
  };
}

type ContinuationFixture = ReturnType<typeof fixture>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) throw new Error('fixture snapshot member must be an object');
  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('fixture snapshot member must be an array');
  return value;
}

function rewritePersisted(
  fixtureValue: ContinuationFixture,
  mutate: (snapshot: Record<string, unknown>) => void,
): void {
  const changed = record(structuredClone(fixtureValue.persisted));
  mutate(changed);
  const database = new Database(fixtureValue.databasePath, { strict: true });
  try {
    database
      .query('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
      .run(JSON.stringify(changed), fixtureValue.runId);
  } finally {
    database.close();
  }
}

test('configured continuation retains the original run and presents the current prewriter wave', () => {
  const value = fixture();
  const snapshot = readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt);
  expect(snapshot).toMatchObject({
    run_id: value.runId,
    status: 'suspended',
    step_id: `wave-${value.boundaryWave}`,
    observations: value.originalObservations,
  });
  expect(snapshot.requests).toEqual(value.currentRequests);
  expect(snapshot.requests.every((request) => request.config_digest === value.receipt.request.targetConfigDigest)).toBe(
    true,
  );
  expect(
    snapshot.requests.every((request) => request.scope_digest === value.receipt.request.currentSourceScope.digest),
  ).toBe(true);
});

test('configured continuation accepts only the completed current wave and resumes the current developer suffix after restart', () => {
  const value = fixture({ afterBoundary: true }),
    first = readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt),
    restarted = readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt);
  expect(first).toEqual(restarted);
  expect(first.run_id).toBe(value.runId);
  expect(first.step_id).toBe(`wave-${value.developerWave}`);
  expect(first.requests.length).toBeGreaterThan(0);
  expect(first.requests.every((request) => request.config_digest === runtimeConfigDigest(value.binding.config))).toBe(
    true,
  );
  expect(first.requests.every((request) => request.scope_digest === value.binding.context.scope_digest)).toBe(true);
  expect(first.observations).toEqual([...value.originalObservations, ...value.currentObservations]);
});

test('configured continuation rejects missing, changed and mismatched beforeimage receipts', () => {
  const value = fixture();
  expect(() => {
    void Reflect.apply(readConfiguredContinuationSessionEngineSnapshot, undefined, [value.binding, null]);
  }).toThrow();
  expect(() =>
    readConfiguredContinuationSessionEngineSnapshot(value.binding, {
      ...value.receipt,
      frontier_snapshot: { ...value.receipt.frontier_snapshot, snapshot_sha256: '0'.repeat(64) },
    }),
  ).toThrow(/beforeimage encoding or digest/);
  expect(() =>
    readConfiguredContinuationSessionEngineSnapshot(value.binding, {
      ...value.receipt,
      request: { ...value.receipt.request, targetConfigDigest: '9'.repeat(64) },
    }),
  ).toThrow(/receipt identity or integrity/);
});

test('configured continuation rejects original input or successful prefix drift after the boundary', () => {
  const mutations: readonly ((snapshot: Record<string, unknown>, value: ContinuationFixture) => void)[] = [
    (snapshot, value) => {
      record(record(snapshot['context'])['input'])['config_digest'] = value.receipt.request.targetConfigDigest;
    },
    (snapshot) => {
      const context = record(snapshot['context']),
        wave = record(context['wave-0']),
        output = record(wave['output']),
        observations = array(output['observations']);
      record(observations[0])['summary'] = 'changed old prefix';
    },
    (snapshot) => {
      const context = record(snapshot['context']),
        input = record(context['input']);
      context[`wave-${String(input['attempt'])}`] = { status: 'success' };
    },
  ];
  for (const mutate of mutations) {
    const value = fixture({ afterBoundary: true });
    rewritePersisted(value, (snapshot) => mutate(snapshot, value));
    expect(() => readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt)).toThrow();
  }
});

test('configured continuation rejects partial, failed, mismatched and stale-digest current reports', () => {
  const mutations: readonly ((snapshot: Record<string, unknown>, value: ContinuationFixture) => void)[] = [
    (snapshot, value) => {
      const wave = record(record(snapshot['context'])[`wave-${value.boundaryWave}`]),
        resumePayload = record(wave['resumePayload']);
      array(resumePayload['observations']).pop();
    },
    (snapshot, value) => {
      const wave = record(record(snapshot['context'])[`wave-${value.boundaryWave}`]),
        observations = array(record(wave['resumePayload'])['observations']);
      record(observations[0])['status'] = 'reported_failed';
    },
    (snapshot, value) => {
      const wave = record(record(snapshot['context'])[`wave-${value.boundaryWave}`]),
        observations = array(record(wave['resumePayload'])['observations']);
      record(observations[0])['action_id'] = 'f'.repeat(64);
    },
    (snapshot, value) => {
      const wave = record(record(snapshot['context'])[`wave-${value.boundaryWave}`]),
        observations = array(record(wave['resumePayload'])['observations']);
      record(observations[0])['output_digest'] = 'e'.repeat(64);
    },
    (snapshot, value) => {
      const wave = record(record(snapshot['context'])[`wave-${value.boundaryWave}`]);
      record(wave['output'])['config_digest'] = value.receipt.request.priorConfigDigest;
    },
    (snapshot, value) => {
      const wave = record(record(snapshot['context'])[`wave-${value.boundaryWave}`]),
        scope = record(record(value.receipt.prior_journal)['source_scope']);
      record(wave['output'])['scope_digest'] = scope['digest'];
    },
  ];
  for (const mutate of mutations) {
    const value = fixture({ afterBoundary: true });
    rewritePersisted(value, (snapshot) => mutate(snapshot, value));
    expect(() => readConfiguredContinuationSessionEngineSnapshot(value.binding, value.receipt)).toThrow();
  }
});
