import { Database } from 'bun:sqlite';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, realpathSync, lstatSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HostStateStore } from '../../src/host-state.ts';
import { hasUnresolvedFixtureOperations } from './unresolved-governance-fixture.ts';
import type {
  CoordinationLedger,
  CoordinationClaim,
  CoordinationTicket,
  MaintenanceFenceBinding,
  MaintenanceReleaseVerifier,
  WorkIdentity,
  WorkState,
} from '../../src/host-state.ts';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { loadRuntimeConfig } from '../../src/config/runtime-config.ts';
import type { AgentRuntimeConfig } from '../../src/config/runtime-config.ts';
import { compareScopedSourceSnapshots } from '../../src/orchestration/scoped-source-snapshot.ts';
import type {
  ClosedConfigTransitionProof as ClosedTransition,
  DeliveredWorkContinuationRequest as ContinuationRequest,
} from '../../src/orchestration/delivered-work-continuation.ts';
import type { ScopedSourceSnapshot } from '../../src/orchestration/scoped-source-snapshot.ts';

type DigestOptions = {
  priorConfigDigest?: string;
  targetConfigDigest?: string;
  projectIds?: readonly string[];
  workspaceId?: string;
  integrationsDigest?: string;
};
type ContinuationFixtureOptions = {
  queued?: boolean;
  uncertain?: boolean;
  root?: string;
  config?: AgentRuntimeConfig;
  identity?: WorkIdentity;
  workspaceId?: string;
  databasePath?: string;
  originalSource?: ScopedSourceSnapshot;
  repositoryRoot?: string;
  workflowId?: string;
  workItemDigest?: string;
  priorConfigDigest?: string;
  intakeArtifacts?: WorkState['artifacts'];
  nativeSessionHandle?: string;
  runId?: string;
};
function journalVersion(value: unknown): { revision: number; digest: string } {
  if (
    !isPlainRecord(value) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    typeof value.digest !== 'string'
  )
    throw Error('Fixture journal version is missing or malformed');
  return { revision: value.revision, digest: value.digest };
}
export const sourceScope = (entries: ScopedSourceSnapshot['entries']): ScopedSourceSnapshot => {
  const body: Omit<ScopedSourceSnapshot, 'digest'> = { schema: 'ScopedSourceSnapshot/v1', entries };
  return { ...body, digest: canonicalJsonDigest(body) };
};

function closedTransition({
  priorConfigDigest = '5'.repeat(64),
  targetConfigDigest = '6'.repeat(64),
  projectIds = ['agent'],
  workspaceId = '9'.repeat(64),
}: DigestOptions = {}): ClosedTransition {
  const transition: ClosedTransition['transition'] = {
    schema: 'RuntimeConfigDeliveryTransition/v1',
    operation_path: '.agent/work/config-delivery/runtime-config-delivery-operation.v1.json',
    operation_sha256: '1'.repeat(64),
    operation_plan_digest: '2'.repeat(64),
    request_id: 'request-1',
    request_digest: '3'.repeat(64),
    report_digest: '4'.repeat(64),
    source_snapshot_digest: '5'.repeat(64),
    target_config_digest: targetConfigDigest,
    target_yaml_sha256: '7'.repeat(64),
    receipt_path: '.agent/runtime-initialization.v1.json',
    receipt_sha256: '8'.repeat(64),
    fence: {
      schema: 'MaintenanceFence/v1',
      workspace_id: workspaceId,
      revision: 2,
      generation: 1,
      status: 'released',
      binding: {
        schema: 'MaintenanceFenceBinding/v1',
        project_ids: projectIds,
        operation_id: 'config-delivery-1',
        manifest_digest: 'a'.repeat(64),
        request_digest: 'b'.repeat(64),
        bindings_digest: 'c'.repeat(64),
        closure_digest: 'd'.repeat(64),
        bundle_digest: 'e'.repeat(64),
      },
      token_digest: 'f'.repeat(64),
    },
    native_self_attestation_digest: '0'.repeat(64),
    runtime_accepted: false,
  };
  return {
    status: 'closed_config_transition_proven',
    operation_id: 'config-delivery-1',
    baseline_config_digest: priorConfigDigest,
    transition,
    transition_digest: canonicalJsonDigest(transition),
    caller_owner_cas_required: true,
    runtime_accepted: false,
    writes_host_state: false,
  };
}

export function requestFixture({
  priorConfigDigest = '5'.repeat(64),
  targetConfigDigest = '6'.repeat(64),
  projectIds = ['agent'],
  workspaceId = '9'.repeat(64),
  integrationsDigest = '6'.repeat(64),
}: DigestOptions = {}): ContinuationRequest {
  const scope = sourceScope([{ path: 'packages/agent/src/work.ts', exists: true, bytes: 4, sha256: '1'.repeat(64) }]);
  const originalTransition = closedTransition({ priorConfigDigest, targetConfigDigest, projectIds, workspaceId });
  const body: ClosedTransition['transition'] = {
    ...originalTransition.transition,
    source_snapshot_digest: scope.digest,
  };
  const transition = { ...originalTransition, transition: body, transition_digest: canonicalJsonDigest(body) };
  const actionRequest: import('../../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest = {
    schema: 'VidaSessionRequest/v1',
    run_id: 'run-1',
    workflow_id: 'implementation_change',
    wave_index: 2,
    action_id: '2'.repeat(64),
    assignment_index: 0,
    stage_id: 'validate_parallel',
    role: 'requirements-validator',
    config_digest: priorConfigDigest,
    scope_digest: scope.digest,
    bindings_manifest_ref: '3'.repeat(64),
  };
  const action: import('../../src/orchestration/delivered-work-continuation.ts').ConfiguredFrontierContinuationAction =
    {
      schema: 'DeliveredWorkContinuationAction/v1',
      kind: 'configured_frontier',
      workflow_id: 'implementation_change',
      run_id: 'run-1',
      step_id: 'validate_parallel',
      engine_snapshot_digest: '4'.repeat(64),
      source_scope_digest: scope.digest,
      target_config_digest: transition.transition.target_config_digest,
      request: actionRequest,
    };
  return {
    schema: 'DeliveredWorkContinuationRequest/v1',
    identity: {
      repository_id: 'vida-agent',
      project_ids: ['agent'],
      integrations_digest: integrationsDigest,
      work_id: 'work-1',
    },
    attempt: 1,
    nativeSessionHandle: 'original-thread',
    expectedWork: { revision: 10, digest: '7'.repeat(64) },
    expectedLedger: { revision: 95, digest: '8'.repeat(64) },
    expectedJournal: { revision: 11, digest: '9'.repeat(64) },
    expectedMaintenanceGeneration: 1,
    priorConfigDigest,
    targetConfigDigest: transition.transition.target_config_digest,
    targetSchemaDigest: '0'.repeat(64),
    targetProjectContextDigest: '1'.repeat(64),
    priorRuntimeCodeDigest: 'a'.repeat(64),
    targetRuntimeCodeDigest: 'b'.repeat(64),
    forwardOperationId: 'config-delivery-1',
    parentManifestDigest: 'a'.repeat(64),
    successorManifestDigest: 'e'.repeat(64),
    currentSourceScope: scope,
    authorizedSourceChanges: [],
    sourceTransition: transition,
    action,
    originalRequestPointer: 'WORK.md#accepted-request',
  };
}

export const fixtureWorkspace = '9'.repeat(64);
export const runtimeRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
let fixtureRepositoryRoot: string | undefined;
export function continuationFixtureRepositoryRoot(): string {
  if (fixtureRepositoryRoot) return fixtureRepositoryRoot;
  const root = mkdtempSync(path.join(tmpdir(), 'delivered-work-config-'));
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
    copyFileSync(path.join(runtimeRoot, file), path.join(root, file));
  const policyRoot = path.join(root, 'docs', 'agent-instructions');
  mkdirSync(policyRoot, { recursive: true });
  copyFileSync(
    path.join(runtimeRoot, 'docs', 'agent-instructions', 'documentation-policy.v1.json'),
    path.join(policyRoot, 'documentation-policy.v1.json'),
  );
  fixtureRepositoryRoot = root;
  return root;
}
let fixtureSeedConfig: AgentRuntimeConfig | undefined;
export function continuationFixtureConfig(): AgentRuntimeConfig {
  return (fixtureSeedConfig ??= loadRuntimeConfig(continuationFixtureRepositoryRoot()));
}
const fixtureIdentity: WorkIdentity = {
  repository_id: 'vida-agent',
  project_ids: ['agent'],
  integrations_digest: '6'.repeat(64),
  work_id: 'work-1',
};
const fixtureRoots: string[] = [];
const fixtureDatabases: Database[] = [];
const closedFixtureDatabases = new WeakSet<Database>();

export function lifecycleFor(binding: WorkState['binding'], revision = 1): WorkState['lifecycle'] {
  return {
    schema: 'LifecycleState/v1',
    revision,
    phase: 'INTAKE',
    source_revision: binding.work_source_revision,
    next_action: 'Continue the original work after review.',
    route: 'R3',
    risk: 'high',
    change_kind: 'feature',
    config_binding: {
      config_digest: binding.config_digest,
      schema_digest: binding.schema_digest,
      runtime_code_digest: binding.runtime_code_digest,
    },
    scope: {
      scope_id: binding.scope_id,
      allowed_paths: ['src/task.ts'],
      fingerprint_paths: ['src/task.ts'],
      implementation_paths: ['src/task.ts'],
      documentation_paths: [],
    },
    seal: null,
    assurance: {
      epoch: 'epoch-1',
      review_generation: 0,
      correction_count: 0,
      review_failure_count: 0,
      delivery_cycle_id: null,
    },
    references: [],
  };
}

function historicalJournalItem(
  sourceScope: ScopedSourceSnapshot,
  runId = 'run-fixture',
  workflowId = 'task_execution',
): import('../../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem {
  const request: import('../../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest = {
    schema: 'VidaSessionRequest/v1',
    run_id: runId,
    workflow_id: workflowId,
    wave_index: 0,
    action_id: '1'.repeat(64),
    assignment_index: 0,
    stage_id: 'synthesize',
    role: 'research-synthesizer',
    config_digest: '5'.repeat(64),
    scope_digest: sourceScope.digest,
    bindings_manifest_ref: '2'.repeat(64),
  };
  return { request, issue_id: '22222222-2222-4222-8222-222222222222', observation: null };
}

export async function continuationFixture(options: ContinuationFixtureOptions = {}) {
  const {
    queued = false,
    uncertain = false,
    root: suppliedRoot,
    config: suppliedConfig,
    identity: suppliedIdentity,
    workspaceId: suppliedWorkspaceId,
    databasePath,
    originalSource: suppliedOriginalSource,
    repositoryRoot,
    workflowId = 'task_execution',
    workItemDigest = 'c'.repeat(64),
    priorConfigDigest = '5'.repeat(64),
    intakeArtifacts = [],
  } = options;
  const root = suppliedRoot ?? mkdtempSync(path.join(tmpdir(), 'delivered-work-continuation-')),
    config = suppliedConfig ?? continuationFixtureConfig(),
    identity = suppliedIdentity ?? fixtureIdentity,
    workspaceId = suppliedWorkspaceId ?? fixtureWorkspace;
  const threadId = options.nativeSessionHandle ?? 'fixture-thread',
    runId = options.runId ?? 'run-fixture';
  fixtureRoots.push(root);
  const db = new Database(databasePath ?? path.join(root, 'host.db'), { create: true, strict: true });
  fixtureDatabases.push(db);
  let databaseClosed = false;
  const closeDatabase = () => {
    if (databaseClosed || closedFixtureDatabases.has(db)) return;
    db.close();
    databaseClosed = true;
    closedFixtureDatabases.add(db);
    const index = fixtureDatabases.indexOf(db);
    if (index >= 0) fixtureDatabases.splice(index, 1);
  };
  const principal = 'fixture:delivered-work-continuation',
    maintenancePrincipal = 'fixture:maintenance',
    maintenanceVerifier: MaintenanceReleaseVerifier = {
      principal: maintenancePrincipal,
      projectIds: identity.project_ids,
      verify: (fence) => ({
        schema: 'MaintenanceReleaseAuthorization/v1',
        principal: maintenancePrincipal,
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: fence.binding.closure_digest,
        bundle_digest: fence.binding.bundle_digest,
      }),
    },
    continuationVerifier: import('../../src/orchestration/delivered-work-continuation.ts').DeliveredWorkContinuationVerifier =
      {
        principal,
        verify: (request) => ({
          schema: 'VidaDeliveredWorkContinuationAuthorization/v1',
          request_digest: canonicalJsonDigest(request),
          principal,
          transition_digest: request.sourceTransition.transition_digest,
          action_digest: canonicalJsonDigest(request.action),
        }),
      },
    store = new HostStateStore(
      db,
      workspaceId,
      undefined,
      undefined,
      undefined,
      maintenanceVerifier,
      repositoryRoot,
      undefined,
      undefined,
      continuationVerifier,
    );
  const maintenanceBinding: MaintenanceFenceBinding = {
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: identity.project_ids,
    operation_id: 'fixture-initialize-maintenance',
    manifest_digest: 'a'.repeat(64),
    request_digest: 'b'.repeat(64),
    bindings_digest: 'c'.repeat(64),
    closure_digest: 'd'.repeat(64),
    bundle_digest: 'e'.repeat(64),
  };
  const maintenance = store.acquireMaintenanceFence(maintenanceBinding);
  await store.releaseMaintenanceFence(maintenance);
  const originalSource =
      suppliedOriginalSource ?? sourceScope([{ path: 'src/task.ts', exists: true, bytes: 4, sha256: '1'.repeat(64) }]),
    binding: WorkState['binding'] = {
      repository_id: identity.repository_id,
      project_ids: [...identity.project_ids],
      integrations_digest: identity.integrations_digest,
      team_id: 'default-development',
      workflow_id: workflowId,
      provider_work_item_id: 'provider-work-item',
      lifecycle_work_id: identity.work_id,
      work_item_digest: workItemDigest,
      work_source_revision: originalSource.digest,
      scope_id: 'scope-fixture',
      scope_contract_digest: 'e'.repeat(64),
      acceptance_manifest_digest: 'f'.repeat(64),
      ac_ids: ['AC-1'],
      implementation_paths: ['src/task.ts'],
      allowed_resources: ['execution:' + identity.work_id, 'file:src/task.ts'],
      config_digest: priorConfigDigest,
      runtime_source_revision: 'a'.repeat(64),
      schema_digest: '3'.repeat(64),
      runtime_code_digest: 'a'.repeat(64),
    },
    now = new Date().toISOString(),
    expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    claim: CoordinationClaim = {
      schema: 'WorkstreamClaim/v1',
      claim_id: 'claim-original',
      ticket_id: 'ticket-original',
      work_id: identity.work_id,
      thread_id: threadId,
      generation: 1,
      resources: ['execution:' + identity.work_id],
      lease_expires_at: expires,
      status: 'active',
      created_at: now,
      renewed_at: now,
    },
    ticket: CoordinationTicket = {
      schema: 'CoordinationTicket/v1',
      ticket_id: 'ticket-original',
      repository_id: identity.repository_id,
      project_ids: identity.project_ids,
      integrations_digest: identity.integrations_digest,
      work_id: identity.work_id,
      thread_id: threadId,
      source_revision: originalSource.digest,
      generation: 1,
      sequence: 1,
      contour_keys: ['project:' + identity.project_ids[0], 'task:' + identity.work_id],
      exclusive_resources: ['execution:' + identity.work_id],
      status: 'active',
      claim_ids: [claim.claim_id],
      expires_at: expires,
      active_resources: ['execution:' + identity.work_id],
      blocked_resources: [],
      created_at: now,
    };
  store.compareAndSwapHostState({
    expectedWork: null,
    expectedLedger: null,
    expectedMaintenanceGeneration: 1,
    nextWork: {
      schema: 'WorkState/v1',
      workspace_id: workspaceId,
      revision: 1,
      binding,
      contracts: {
        scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
        acceptance: {
          schema: 'AcceptanceManifest/v1',
          path: '.agent/acceptance.json',
          sha256: binding.acceptance_manifest_digest,
        },
        decisions: [],
      },
      lease: { ticket_id: ticket.ticket_id, thread_id: ticket.thread_id, generation: ticket.generation },
      execution: {
        run_id: runId,
        input_digest: '5'.repeat(64),
        phase: 'implementation',
        status: 'active',
        assignment_attempts: [],
      },
      lifecycle: lifecycleFor(binding),
      artifacts: intakeArtifacts,
    },
    nextLedger: {
      schema: 'CoordinationLedger/v1',
      workspace_id: workspaceId,
      revision: 1,
      open_generation: 1,
      next_sequence: 2,
      tickets: [ticket],
      claims: [claim],
      notices: [],
      dispositions: [],
      contours: [],
      batches: [],
      rebinds: [],
      operations: [],
      retirements: [],
    },
  });
  let journalItem = historicalJournalItem(originalSource, runId, workflowId);
  if (uncertain) journalItem = { ...journalItem, observation: null };
  else
    journalItem = {
      ...journalItem,
      observation: {
        schema: 'VidaSessionObservation/v1',
        action_id: journalItem.request.action_id,
        issue_id: '22222222-2222-4222-8222-222222222222',
        agent_id: 'fixture:research-synthesizer',
        tool_call_ref: 'fixture:terminal-body',
        status: 'reported_complete',
        summary: 'Known terminal output retained for review.',
        output_digest: '3'.repeat(64),
        evidence_refs: [],
      },
    };
  const initialJournal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspaceId,
    work_id: identity.work_id,
    attempt: 1,
    run_id: runId,
    step_id: 'synthesize',
    source_scope: originalSource,
    items: [journalItem],
    completed: [],
  };
  db.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  db.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
    workspaceId,
    identity.work_id,
    1,
    1,
    canonicalJson(initialJournal),
    canonicalJsonDigest(initialJournal),
  );
  if (queued) {
    const before = store.readHostStateSnapshot(identity);
    if (!before.work || !before.ledger) throw Error('Seeded Host state missing');
    const nextWork: WorkState = {
        ...before.work,
        revision: before.work.revision + 1,
        lifecycle: { ...before.work.lifecycle, revision: before.work.revision + 1 },
      },
      nextLedger: CoordinationLedger = {
        ...before.ledger,
        revision: before.ledger.revision + 1,
        next_sequence: before.ledger.next_sequence + 1,
        tickets: [
          ...before.ledger.tickets,
          {
            ...ticket,
            ticket_id: 'ticket-queued',
            sequence: before.ledger.next_sequence,
            status: 'queued',
            claim_ids: [],
            expires_at: null,
            active_resources: [],
            blocked_resources: ['execution:' + identity.work_id],
            created_at: new Date().toISOString(),
          },
        ],
      };
    store.compareAndSwapHostState({
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      nextWork,
      nextLedger,
    });
  }
  const beforeRelease = store.readHostStateSnapshot(identity);
  if (!beforeRelease.work || !beforeRelease.ledger || !beforeRelease.workVersion || !beforeRelease.ledgerVersion)
    throw Error('Seeded release Host state missing');
  const row = journalVersion(
      db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(workspaceId, identity.work_id, 1),
    ),
    workAfter: WorkState = {
      ...beforeRelease.work,
      revision: beforeRelease.work.revision + 1,
      lease: null,
      execution: { ...beforeRelease.work.execution, phase: 'awaiting_followup', status: 'suspended' },
      lifecycle: {
        ...beforeRelease.work.lifecycle,
        revision: beforeRelease.work.revision + 1,
        next_action:
          'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.',
      },
    };
  const currentTicket = beforeRelease.ledger.tickets.find((entry) => entry.status === 'active');
  if (!currentTicket) throw Error('Original ticket missing');
  const currentClaim = beforeRelease.ledger.claims.find(
    (entry) => entry.ticket_id === currentTicket.ticket_id && entry.status === 'active',
  );
  if (!currentClaim) throw Error('Original claim missing');
  const releaseTime = new Date().toISOString();
  const ledgerAfter: CoordinationLedger = {
    ...beforeRelease.ledger,
    revision: beforeRelease.ledger.revision + 1,
    tickets: beforeRelease.ledger.tickets.map((entry) =>
      entry.ticket_id === currentTicket.ticket_id
        ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
        : entry,
    ),
    claims: beforeRelease.ledger.claims.map((entry) =>
      entry.claim_id === currentClaim.claim_id ? { ...entry, status: 'released', renewed_at: releaseTime } : entry,
    ),
    operations: [
      ...beforeRelease.ledger.operations,
      {
        schema: 'CoordinationOperation/v1',
        operation_id: 'release-original-owner',
        kind: 'release',
        ticket_id: currentTicket.ticket_id,
        work_id: identity.work_id,
        thread_id: threadId,
        source_revision: currentTicket.source_revision,
        resources: [...currentTicket.exclusive_resources],
        from_ledger_revision: beforeRelease.ledger.revision,
        to_ledger_revision: beforeRelease.ledger.revision + 1,
        decided_by: threadId,
        decision_pointer: 'WORK.md#accepted-request',
        created_at: releaseTime,
      },
    ],
  };
  const projectId = requireContinuationProjectId(identity);
  const bodyBytes = Buffer.from('{"schema":"VidaSessionObservation/v1","status":"reported_complete"}\n'),
    captureInput: Parameters<HostStateStore['captureHistoricalTerminalSynthesisAndRelease']>[0] = {
      schema: 'HistoricalTerminalSynthesisCapture/v1',
      identity: identity,
      attempt: 1,
      actionId: '4'.repeat(64),
      issueId: '11111111-1111-4111-8111-111111111111',
      nativeSessionHandle: threadId,
      userRequestPointer: 'WORK.md#accepted-request',
      requestIntent: 'linked_correction',
      expectedWork: beforeRelease.workVersion,
      expectedLedger: beforeRelease.ledgerVersion,
      expectedJournal: { revision: row.revision, digest: row.digest },
      expectedMaintenanceGeneration: beforeRelease.maintenanceGeneration,
      documentationContext: {
        repository_root: root,
        repository_id: identity.repository_id,
        project_id: projectId,
        work_id: identity.work_id,
      },
      nextWork: workAfter,
      nextLedger: ledgerAfter,
      bodyBytes,
      provenance: {
        schema: 'HistoricalTerminalSynthesisProvenance/v1',
        body_ref: '.tmp/terminal-body.json',
        input_ref: '.tmp/terminal-input.json',
        report_ref: '.tmp/terminal-report.json',
        followup_ref: 'fixture:followup',
        original_actor_id: 'fixture:agent',
        denial_status: 'blocked',
        denial_code: 'GAP-VIDA-RUN-EXECUTION-001',
        denial_message: 'The requested run was blocked by runtime validation.',
        denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
        input_bytes_base64: Buffer.from('{}').toString('base64'),
        report_bytes_base64: Buffer.from('{}').toString('base64'),
        predecessor_refs: [
          { result_id: 'result-1', digest: '6'.repeat(64) },
          { result_id: 'result-2', digest: '7'.repeat(64) },
        ],
      },
    },
    capture = store.captureHistoricalTerminalSynthesisAndRelease(captureInput).receipt;
  return {
    root,
    db,
    store,
    identity,
    originalSource,
    capture,
    principal,
    workspaceId,
    config,
    repositoryRoot,
    priorConfigDigest,
    threadId,
    runId,
    closeDatabase,
  };
}

type ContinuationRequestOptions = {
  currentSourceScope?: ScopedSourceSnapshot;
  targetConfigDigest?: string;
  actionRequest?: ContinuationRequest['action']['request'];
  action?: ContinuationRequest['action'];
};

export function continuationRequestFor(
  f: Awaited<ReturnType<typeof continuationFixture>>,
  options: ContinuationRequestOptions = {},
): ContinuationRequest {
  const state = f.store.readHostStateSnapshot(f.identity);
  if (!state.work || !state.workVersion || !state.ledgerVersion || !state.work.execution.run_id)
    throw Error('Current continuation Host state missing');
  const pointer = f.capture.request.user_request_pointer;
  if (typeof pointer !== 'string') throw Error('Original request pointer missing');
  const journalRow = journalVersion(
      f.db
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(f.workspaceId ?? fixtureWorkspace, f.identity.work_id, 1),
    ),
    currentSourceScope =
      options.currentSourceScope ??
      sourceScope([{ path: 'src/task.ts', exists: true, bytes: 5, sha256: '8'.repeat(64) }]),
    targetConfigDigest = options.targetConfigDigest ?? '6'.repeat(64),
    base = requestFixture({
      targetConfigDigest,
      priorConfigDigest: f.priorConfigDigest ?? '5'.repeat(64),
      projectIds: f.identity.project_ids,
      workspaceId: f.workspaceId ?? fixtureWorkspace,
    }),
    actionRequest = options.actionRequest ?? {
      ...base.action.request,
      run_id: state.work.execution.run_id,
      workflow_id: state.work.binding.workflow_id,
      action_id: 'f'.repeat(64),
      stage_id: 'validate_parallel',
      role: 'correctness-validator',
      config_digest: targetConfigDigest,
      scope_digest: currentSourceScope.digest,
    },
    action = options.action ?? {
      schema: 'DeliveredWorkContinuationAction/v1',
      kind: 'historical_terminal_review',
      workflow_id: state.work.binding.workflow_id,
      source_scope_digest: currentSourceScope.digest,
      target_config_digest: targetConfigDigest,
      capture: {
        action_id: f.capture.action_id,
        issue_id: f.capture.issue_id,
        receipt_digest: canonicalJsonDigest(f.capture),
        body_sha256: f.capture.body_sha256,
        body_ref: f.capture.provenance.body_ref,
      },
      original_request_pointer: pointer,
      request: actionRequest,
    },
    changes = compareScopedSourceSnapshots(f.originalSource, currentSourceScope);
  return {
    ...base,
    identity: f.identity,
    attempt: 1,
    nativeSessionHandle: f.threadId ?? 'fixture-thread',
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: { revision: journalRow.revision, digest: journalRow.digest },
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    priorRuntimeCodeDigest: state.work.binding.runtime_code_digest,
    currentSourceScope,
    authorizedSourceChanges: changes,
    originalRequestPointer: pointer,
    action,
  };
}

function requireContinuationProjectId(identity: WorkIdentity): string {
  const projectId = identity.project_ids[0];
  if (!projectId) throw new Error('Continuation fixture requires a project identity.');
  return projectId;
}

export function trackContinuationFixtureRoot(root: string) {
  fixtureRoots.push(root);
  return root;
}

// Exact absolute roots in this set have an explicit retained disposition, not a future deletion retry.
const uncertainFixtureRoots = new Set<string>();
process.once('exit', () => {
  const root = fixtureRepositoryRoot;
  if (!root || uncertainFixtureRoots.has(path.resolve(root))) return;
  try {
    const stat = lstatSync(root, { throwIfNoEntry: false });
    if (!stat) return;
    if (!stat.isDirectory() || stat.isSymbolicLink()) return;
    const resolved = realpathSync(root);
    const parent = realpathSync(tmpdir());
    const relative = path.relative(parent, resolved);
    if (relative === '' || path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep))
      return;
    rmSync(resolved, { recursive: true, force: true });
  } catch (error) {
    try {
      process.stderr.write('Preserved continuation config fixture after cleanup failure: ' + String(error) + '\n');
    } catch {
      // Process shutdown cannot recover from an unavailable diagnostic stream.
    }
  }
});
export function retainContinuationFixtureRoot(root: string) {
  uncertainFixtureRoots.add(path.resolve(root));
}

export function cleanupContinuationFixtures() {
  const errors: unknown[] = [];
  const retainRootsForDatabase = (database: Database): void => {
    let filename: string;
    try {
      filename = path.resolve(database.filename);
    } catch (error) {
      for (const root of fixtureRoots) uncertainFixtureRoots.add(path.resolve(root));
      errors.push(error);
      return;
    }
    let matched = false;
    for (const root of fixtureRoots) {
      const resolvedRoot = path.resolve(root);
      const relative = path.relative(resolvedRoot, filename);
      if (relative !== '' && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)) {
        uncertainFixtureRoots.add(resolvedRoot);
        matched = true;
      }
    }
    if (!matched) for (const root of fixtureRoots) uncertainFixtureRoots.add(path.resolve(root));
  };
  const removeTrackedRoot = (root: string): void => {
    for (let index = fixtureRoots.length - 1; index >= 0; index -= 1)
      if (path.resolve(fixtureRoots[index] ?? '') === root) fixtureRoots.splice(index, 1);
  };

  for (const database of [...fixtureDatabases]) {
    try {
      if (hasUnresolvedFixtureOperations(database)) retainRootsForDatabase(database);
    } catch (error) {
      retainRootsForDatabase(database);
      errors.push(error);
    }
    try {
      database.close();
      closedFixtureDatabases.add(database);
      const index = fixtureDatabases.indexOf(database);
      if (index >= 0) fixtureDatabases.splice(index, 1);
    } catch (error) {
      retainRootsForDatabase(database);
      errors.push(error);
    }
  }

  let parents: string[] | undefined;
  try {
    const scratchPath = path.join(runtimeRoot, '.tmp'),
      scratchStat = lstatSync(scratchPath, { throwIfNoEntry: false });
    parents = [
      realpathSync(tmpdir()),
      ...(scratchStat?.isDirectory() && !scratchStat.isSymbolicLink() ? [realpathSync(scratchPath)] : []),
    ];
  } catch (error) {
    for (const root of fixtureRoots) uncertainFixtureRoots.add(path.resolve(root));
    errors.push(error);
  }
  for (const root of new Set(fixtureRoots.map((value) => path.resolve(value)))) {
    if (uncertainFixtureRoots.has(root)) {
      try {
        process.stderr.write('Preserved continuation fixture with unresolved operation: ' + root + '\n');
      } catch (error) {
        errors.push(error);
      }
      removeTrackedRoot(root);
      continue;
    }
    try {
      if (!parents) {
        uncertainFixtureRoots.add(root);
        removeTrackedRoot(root);
        continue;
      }
      const stat = lstatSync(root, { throwIfNoEntry: false });
      if (!stat) {
        removeTrackedRoot(root);
        continue;
      }
      const resolved = realpathSync(root);
      const owned = parents.some((parent) => {
        const relative = path.relative(parent, resolved);
        return (
          relative !== '' && !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep)
        );
      });
      if (!stat.isDirectory() || stat.isSymbolicLink() || !owned)
        throw new Error('Continuation fixture cleanup target is outside the owned temporary roots');
      rmSync(resolved, { recursive: true, force: true });
      removeTrackedRoot(root);
    } catch (error) {
      uncertainFixtureRoots.add(root);
      removeTrackedRoot(root);
      errors.push(error);
    }
  }
  if (errors.length)
    throw new AggregateError(errors, 'Continuation fixture cleanup failed; uncertain roots were retained');
}
