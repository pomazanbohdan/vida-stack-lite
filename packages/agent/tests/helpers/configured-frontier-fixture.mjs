import {createHash} from 'node:crypto';
import {canonicalJson, canonicalJsonDigest} from '../../src/contracts/public-ingress.ts';
import {runtimeConfigDigest} from '../../src/config/runtime-config.ts';
import {loadProjectSetContext} from '../../src/config/project-context.ts';
import {compileDevelopmentWorkflow} from '../../src/orchestration/workflow-plan.ts';
import {sessionActionsForWave} from '../../src/orchestration/session-handoff.ts';
import {buildSessionBridgeRequest} from '../../src/orchestration/mastra-session-bridge.ts';
import {compareScopedSourceSnapshots} from '../../src/orchestration/scoped-source-snapshot.ts';
import {projectConfiguredFrontierContinuationAction} from '../../src/orchestration/delivered-work-continuation.ts';
import * as continuationProjection from '../../src/orchestration/delivered-work-continuation.ts';
import {requestFixture, sourceScope, lifecycleFor, runtimeConfig, runtimeRoot, fixtureWorkspace} from './delivered-work-continuation-fixture.mjs';

/** @typedef {import('../../src/host-state.ts').WorkState} WorkState */
/** @typedef {import('../../src/config/runtime-config.ts').AgentRuntimeConfig} RuntimeConfig */
/** @typedef {import('../../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot} SourceScope */
/** @typedef {import('../../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} Journal */
/** @typedef {{workItem: {id: string}, selection: import('../../src/config/runtime-config.ts').WorkItemSelection, host: {work: {binding: Partial<WorkState['binding']> & Pick<WorkState['binding'], 'config_digest' | 'workflow_id'>, contracts: WorkState['contracts'], lease: NonNullable<WorkState['lease']>, execution: Pick<WorkState['execution'], 'run_id'>, lifecycle: Pick<WorkState['lifecycle'], 'risk'>, artifacts: WorkState['artifacts']}}, ledger: {state: {source_scope: SourceScope, completed: Journal['completed']}}}} PacketSeed */
/** @param {RuntimeConfig} [config] @param {string} [repositoryRoot] @param {string} [workspaceId] @param {PacketSeed | null} [packet] */

export function prewriterProjectionFixture(config = runtimeConfig, repositoryRoot = runtimeRoot, workspaceId = fixtureWorkspace, packet = null) {
  const source = packet?.ledger.state.source_scope ?? requestFixture().currentSourceScope;
  const context = { work_id: packet?.workItem.id ?? 'work-1', attempt: 1, scope_digest: source.digest };
  /** @type {import('../../src/config/runtime-config.ts').WorkItemSelection} */
  const selection = packet?.selection ?? { team: 'default-development', kind: 'task', intent: 'task_execution', project: 'agent', risk_flags: ['high'], labels: [] };
  const workflowId = packet?.host.work.binding.workflow_id ?? 'task_execution';
  const plan = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags);
  const waveIndex = plan.waves.findIndex(wave => wave.some(stage => stage.id === 'review_source_prewrite'));
  const developerIndex = plan.waves.findIndex(wave => wave.some(stage => stage.kind === 'develop'));
  /** @param {number} index @param {Parameters<typeof buildSessionBridgeRequest>[0]['action']} action @param {Parameters<typeof buildSessionBridgeRequest>[0]['priorResults']} [priorResults] */
  const makeRequest = (index, action, priorResults = []) => buildSessionBridgeRequest({
    runId: packet?.host.work.execution.run_id ?? 'same-original-run', workflowId,
    configDigest: packet?.host.work.binding.config_digest ?? '5'.repeat(64), context,
    waveIndex: index, action, configuredContext: null, priorResults,
  });
  /** @type {import('../../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState['completed']} */
  const completed = plan.waves.slice(0, waveIndex).map((_, index) => ({
    step_id: 'wave-' + index,
    items: sessionActionsForWave(config, selection, context, workflowId, index, []).map(action => {
      const prior = packet?.ledger.state.completed.flatMap(wave => wave.items).find(item =>
        item.request.stage_id === action.stage_id && (item.request.assignment_index ?? 0) === action.assignment_index);
      const request = {...makeRequest(index, action), ...prior?.request};
      const summary = prior?.observation?.summary ?? 'Original completed synthesis';
      /** @type {import('../../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation} */
      const observation = {
        schema: 'VidaSessionObservation/v1', action_id: request.action_id,
        issue_id: '71e62a38-b44b-470e-b732-81cefbaf983a', agent_id: 'original-synth',
        tool_call_ref: 'original-call', status: 'reported_complete', summary,
        output_digest: canonicalJsonDigest(summary), evidence_refs: [], ...prior?.observation,
      };
      return { ...prior, request, issue_id: observation.issue_id, observation };
    }),
  }));
  const observations = completed.flatMap(wave => wave.items.map(item => {
    if (!item.observation) throw Error('Completed frontier fixture observation missing');
    return item.observation;
  }));
  const oldRequest = makeRequest(waveIndex, sessionActionsForWave(config, selection, context, workflowId, developerIndex, [])[0], observations);
  /** @type {import('../../src/orchestration/mastra-session-bridge.ts').SessionBridgeSnapshot} */
  const engine = { run_id: oldRequest.run_id, status: 'suspended', step_id: 'wave-' + waveIndex, requests: [oldRequest], observations };
  /** @type {import('../../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} */
  const journal = { schema: 'MastraSessionLedger/v1', workspace_id: workspaceId, work_id: context.work_id, attempt: 1, run_id: engine.run_id, source_scope: source, step_id: engine.step_id, completed, items: [{ request: oldRequest, issue_id: null, observation: null }] };
  /** @type {Parameters<typeof continuationProjection.projectConfiguredPrewriterContinuationRequests>[0]} */
  const binding = { repositoryRoot, config, selection, context, workflowId, engine, journal, currentSourceScope: source };
  return { binding, engine, journal, source, context, waveIndex, developerIndex, oldRequest };
}

/** @param {boolean} [prewriter] @param {boolean} [changedSource] @param {{config: RuntimeConfig, root: string, workspaceId: string}} [runtime] @param {'implementation' | 'awaiting_followup'} [priorPhase] @param {PacketSeed | null} [packet] @param {SourceScope | null} [currentSourceScope] */
export function configuredFrontierRepairFixture(prewriter = false, changedSource = false, runtime = { config: runtimeConfig, root: runtimeRoot, workspaceId: fixtureWorkspace }, priorPhase = 'awaiting_followup', packet = null, currentSourceScope = null) {
  const projection = prewriter ? prewriterProjectionFixture(runtime.config, runtime.root, runtime.workspaceId, packet) : null;
  const base = requestFixture(prewriter ? { targetConfigDigest: runtimeConfigDigest(runtime.config), workspaceId: runtime.workspaceId,
    ...(packet ? {priorConfigDigest: packet.host.work.binding.config_digest} : {}),
    integrationsDigest: loadProjectSetContext(runtime.root, runtime.config, 'vida-agent', ['agent']).integrations_digest } : {});
  const requestBase = packet ? {...base, identity: {...base.identity, work_id: packet.workItem.id},
    nativeSessionHandle: packet.host.work.lease.thread_id} : base;
  if (requestBase.action.kind !== 'configured_frontier') throw Error('Configured frontier fixture requires its current action');
  const
    source = projection?.source ?? requestBase.currentSourceScope,
    targetScope = currentSourceScope ?? (changedSource ? sourceScope(source.entries.map(entry => ({ ...entry, exists: true, bytes: (entry.bytes ?? 0) + 1, sha256: '7'.repeat(64) }))) : source);
  if (projection) projection.binding = { ...projection.binding, currentSourceScope: targetScope, context: { ...projection.binding.context, scope_digest: targetScope.digest } };
  const
    priorJournal = projection?.journal ?? {
      schema: 'MastraSessionLedger/v1',
      workspace_id: runtime.workspaceId,
      work_id: requestBase.identity.work_id,
      attempt: requestBase.attempt,
      run_id: requestBase.action.run_id,
      source_scope: source,
      step_id: requestBase.action.step_id,
      items: [{ request: requestBase.action.request, issue_id: null, observation: null }],
      completed: [],
    },
    engine = projection?.engine ?? {
      run_id: requestBase.action.run_id,
      status: 'suspended',
      step_id: requestBase.action.step_id,
      requests: [requestBase.action.request],
      observations: [],
    },
    action = projectConfiguredFrontierContinuationAction({
      engine,
      journal: priorJournal,
      targetConfigDigest: requestBase.targetConfigDigest,
      currentSourceScope: targetScope,
    }),
    priorBinding = {
      repository_id: requestBase.identity.repository_id,
      integrations_digest: requestBase.identity.integrations_digest, team_id: 'default-development',
      workflow_id: action.workflow_id, provider_work_item_id: requestBase.identity.work_id,
      lifecycle_work_id: requestBase.identity.work_id, work_item_digest: 'c'.repeat(64),
      scope_id: 'scope-fixture', scope_contract_digest: 'e'.repeat(64), acceptance_manifest_digest: 'f'.repeat(64),
      ac_ids: ['AC-1'], implementation_paths: source.entries.map(entry => entry.path), allowed_resources: ['execution:' + requestBase.identity.work_id, ...source.entries.map(entry => 'file:' + entry.path)],
      config_digest: requestBase.priorConfigDigest, runtime_code_digest: requestBase.priorRuntimeCodeDigest,
      runtime_source_revision: requestBase.priorRuntimeCodeDigest, schema_digest: '3'.repeat(64),
      work_source_revision: source.digest, ...packet?.host.work.binding,
      project_ids: [...(packet?.host.work.binding.project_ids ?? requestBase.identity.project_ids)],
    },
    priorWork = {
      schema: 'WorkState/v1', workspace_id: runtime.workspaceId, revision: 10,
      binding: priorBinding,
      contracts: packet?.host.work.contracts ?? { scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: priorBinding.scope_contract_digest }, acceptance: { schema: 'AcceptanceManifest/v1', path: '.agent/acceptance.json', sha256: priorBinding.acceptance_manifest_digest }, decisions: [] },
      lease: null,
      execution: { run_id: action.run_id, input_digest: '5'.repeat(64), status: 'suspended', phase: priorPhase, assignment_attempts: [] },
      lifecycle: { ...lifecycleFor(priorBinding, 10), ...(packet ? {risk: packet.host.work.lifecycle.risk} : {}), scope: { scope_id: priorBinding.scope_id,
        allowed_paths: source.entries.map(entry => entry.path), fingerprint_paths: source.entries.map(entry => entry.path),
        implementation_paths: priorBinding.implementation_paths, documentation_paths: [] } },
      artifacts: packet?.host.work.artifacts ?? [],
    },
    resources = ['execution:' + requestBase.identity.work_id, ...priorWork.binding.implementation_paths.map(path => 'file:' + path)].sort(),
    priorTicket = {
      schema: 'CoordinationTicket/v1', ticket_id: 'prior-ticket', repository_id: requestBase.identity.repository_id,
      project_ids: requestBase.identity.project_ids, integrations_digest: requestBase.identity.integrations_digest,
      work_id: requestBase.identity.work_id, thread_id: requestBase.nativeSessionHandle, source_revision: source.digest,
      generation: 1, sequence: 1, contour_keys: [], exclusive_resources: resources, status: 'released',
      claim_ids: ['prior-claim'], expires_at: null, active_resources: [], blocked_resources: [],
      created_at: '2026-10-07T00:00:00.000Z',
    },
    priorClaim = {
      schema: 'WorkstreamClaim/v1', claim_id: 'prior-claim', ticket_id: 'prior-ticket',
      work_id: requestBase.identity.work_id, thread_id: requestBase.nativeSessionHandle, generation: 1,
      resources: resources, lease_expires_at: '2026-10-07T00:00:00.000Z', status: 'released',
      created_at: '2026-10-07T00:00:00.000Z', renewed_at: '2026-10-07T00:00:00.000Z',
    },
    priorRelease = {
      schema: 'CoordinationOperation/v1', operation_id: 'prior-release', kind: 'release',
      ticket_id: 'prior-ticket', work_id: requestBase.identity.work_id,
      thread_id: requestBase.nativeSessionHandle, source_revision: source.digest, resources: resources,
      from_ledger_revision: 94, to_ledger_revision: 95, decided_by: 'fixture-owner',
      decision_pointer: 'owner:original-release-disposition', created_at: '2026-10-07T00:00:00.000Z',
    },
    priorLedger = {
      schema: 'CoordinationLedger/v1', workspace_id: runtime.workspaceId, revision: 95,
      open_generation: 1, next_sequence: 2, tickets: [priorTicket], claims: [priorClaim],
      notices: [], dispositions: [], contours: [], batches: [], rebinds: [],
      operations: [priorRelease], retirements: [],
    },
    priorWorkVersion = { revision: priorWork.revision, digest: canonicalJsonDigest(priorWork) },
    priorLedgerVersion = { revision: priorLedger.revision, digest: canonicalJsonDigest(priorLedger) },
    priorJournalVersion = { revision: 11, digest: canonicalJsonDigest(priorJournal) },
    request = {
      ...requestBase,
      expectedWork: priorWorkVersion,
      expectedLedger: priorLedgerVersion,
      expectedJournal: priorJournalVersion,
      currentSourceScope: targetScope,
      authorizedSourceChanges: compareScopedSourceSnapshots(source, targetScope),
      action,
    },
    successorWork = {
      ...priorWork,
      revision: 11,
      binding: { ...priorWork.binding, config_digest: request.targetConfigDigest, runtime_code_digest: request.targetRuntimeCodeDigest, runtime_source_revision: request.targetRuntimeCodeDigest, schema_digest: request.targetSchemaDigest, work_source_revision: targetScope.digest },
      lease: { ticket_id: 'repair-ticket', thread_id: request.nativeSessionHandle, generation: 1 },
      execution: { ...priorWork.execution, status: 'active', phase: 'review', assignment_attempts: [] },
    },
    successorJournal = projection ? {
      ...priorJournal,
      source_scope: targetScope,
      items: continuationProjection.projectConfiguredPrewriterContinuationRequests(projection.binding)
        .map(request => ({ request, issue_id: null, observation: null })),
    } : priorJournal,
    expiresAt = new Date(Date.now() + 60_000).toISOString(),
    successorLedger = {
      ...priorLedger,
      revision: 96,
      next_sequence: 3,
      tickets: [priorTicket, {
        ...priorTicket, ticket_id: 'repair-ticket', sequence: 2, status: 'active',
        source_revision: targetScope.digest,
        claim_ids: ['repair-claim'], expires_at: expiresAt, active_resources: resources,
        created_at: '2026-10-07T00:00:01.000Z',
      }],
      claims: [priorClaim, {
        ...priorClaim, claim_id: 'repair-claim', ticket_id: 'repair-ticket', status: 'active',
        lease_expires_at: expiresAt, created_at: '2026-10-07T00:00:01.000Z', renewed_at: '2026-10-07T00:00:01.000Z',
      }],
    },
    snapshotBytes = Buffer.from(canonicalJson(engine));
  successorWork.lifecycle = { ...priorWork.lifecycle, revision: 11, source_revision: targetScope.digest,
    config_binding: { config_digest: successorWork.binding.config_digest, schema_digest: successorWork.binding.schema_digest, runtime_code_digest: successorWork.binding.runtime_code_digest } };
  const
    workVersion = { revision: successorWork.revision, digest: canonicalJsonDigest(successorWork) },
    ledgerVersion = { revision: successorLedger.revision, digest: canonicalJsonDigest(successorLedger) },
    journalVersion = { revision: priorJournalVersion.revision + 1, digest: canonicalJsonDigest(successorJournal) },
    requestDigest = canonicalJsonDigest(request),
    receipt = {
      schema: 'DeliveredWorkContinuationReceipt/v1',
      continuation_id: canonicalJsonDigest({
        identity: request.identity, attempt: request.attempt, action_id: action.request.action_id,
        transition_digest: request.sourceTransition.transition_digest,
      }),
      attempt: request.attempt, request_digest: requestDigest,
      authorization: {
        schema: 'VidaDeliveredWorkContinuationAuthorization/v1', request_digest: requestDigest,
        principal: 'fixture-owner', transition_digest: request.sourceTransition.transition_digest,
        action_digest: canonicalJsonDigest(action),
      },
      request, prior_work: priorWork, prior_ledger: priorLedger, prior_journal: priorJournal,
      prior_work_version: priorWorkVersion, prior_ledger_version: priorLedgerVersion, prior_journal_version: priorJournalVersion,
      historical_capture: null,
      frontier_snapshot: {
        snapshot_bytes_base64: snapshotBytes.toString('base64'),
        snapshot_sha256: createHash('sha256').update(snapshotBytes).digest('hex'),
      },
      successor_work: successorWork, successor_ledger: successorLedger, successor_binding: successorWork.binding,
      successor_journal: successorJournal, work_version: workVersion, ledger_version: ledgerVersion, journal_version: journalVersion,
      rights_granted: false, accepted_result: false, runtime_acceptance: false, status: 'action_ready',
    },
    current = {
      work: successorWork, work_version: workVersion, ledger: successorLedger, ledger_version: ledgerVersion,
      journal: successorJournal, journal_version: journalVersion,
    };
  return { receipt, current, ...(projection ? { prewriterBinding: projection.binding } : {}) };
}
