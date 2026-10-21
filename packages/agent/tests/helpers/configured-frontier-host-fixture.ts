import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadRuntimeConfig } from '../../src/config/runtime-config.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';
import type { MastraSessionLedgerState } from '../../src/orchestration/persistent-session-handoff.ts';
import type {
  CoordinationClaim,
  CoordinationLedger,
  CoordinationTicket,
  StateVersion,
  WorkState,
} from '../../src/host-state.ts';
import type { ConfiguredFrontierReceipt } from '../../src/orchestration/delivered-work-continuation-repair.ts';
import type {
  ConfiguredRuntimeEndpointTransition,
  DeliveredWorkContinuationRequest,
  ClosedConfigRebindProof,
} from '../../src/orchestration/delivered-work-continuation.ts';
import type * as continuationProjection from '../../src/orchestration/delivered-work-continuation.ts';
import { configuredFrontierRepairFixture } from './configured-frontier-fixture.ts';
import { hasUnresolvedFixtureOperations } from './unresolved-governance-fixture.ts';
import {
  continuationFixture,
  cleanupContinuationFixtures,
  runtimeRoot,
  trackContinuationFixtureRoot,
  retainContinuationFixtureRoot,
} from './delivered-work-continuation-fixture.ts';

/** One serial case owns setup, database closure and retained-root disposition within the default deadline. */
export async function withConfiguredFrontierHostFixture(
  action: (
    fixture: Awaited<ReturnType<typeof continuationFixture>>,
    setup: ReturnType<typeof configuredFrontierRepairHostRoot>,
    deadline: number,
  ) => void | Promise<void>,
  proofKind: 'delivery' | 'normal' = 'delivery',
): Promise<void> {
  const deadline = performance.now() + 5_000;
  let ownedRoot: string | undefined;
  let fixture: Awaited<ReturnType<typeof continuationFixture>> | undefined;
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  const retain = () => {
    if (ownedRoot) retainContinuationFixtureRoot(ownedRoot);
  };
  try {
    const setup = configuredFrontierRepairHostRoot(proofKind, false, (created) => {
      ownedRoot = created;
    });
    const databasePath = path.join(setup.root, setup.config.control.work_root, 'session-handoff.v1.sqlite');
    mkdirSync(path.dirname(databasePath), { recursive: true });
    fixture = await continuationFixture({
      root: setup.root,
      config: setup.config,
      workspaceId: setup.workspaceId,
      databasePath,
      repositoryRoot: setup.root,
      identity: setup.input.receipt.request.identity,
    });
    if (performance.now() >= deadline) throw new Error('Configured frontier setup exhausted its case deadline.');
    await action(fixture, setup, deadline);
    if (performance.now() >= deadline) throw new Error('Configured frontier body exhausted its case deadline.');
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          if (!completed || performance.now() >= deadline) retain();
        },
        () => {
          if (fixture && hasUnresolvedFixtureOperations(fixture.db)) retain();
        },
        () => {
          try {
            fixture?.closeDatabase();
          } catch (error) {
            retain();
            throw error;
          }
        },
        () => {
          if (!completed || performance.now() >= deadline) retain();
          cleanupContinuationFixtures();
          if (performance.now() >= deadline)
            throw new Error('Configured frontier cleanup exhausted its case deadline.');
        },
      ],
      primaryFailure,
    );
  }
}

type MutableCoordinationTicket = {
  -readonly [
    Key in keyof Omit<
      CoordinationTicket,
      'claim_ids' | 'exclusive_resources' | 'active_resources' | 'blocked_resources'
    >
  ]: CoordinationTicket[Key];
} & {
  claim_ids: string[];
  exclusive_resources: string[];
  active_resources: string[];
  blocked_resources: string[];
};
export type MutableCoordinationClaim = {
  -readonly [Key in keyof Omit<CoordinationClaim, 'resources'>]: CoordinationClaim[Key];
} & { resources: string[] };
export type MutableCoordinationLedger = Omit<
  CoordinationLedger,
  'revision' | 'next_sequence' | 'tickets' | 'claims' | 'operations'
> & {
  revision: number;
  next_sequence: number;
  tickets: MutableCoordinationTicket[];
  claims: MutableCoordinationClaim[];
  operations: Record<string, unknown>[];
};
type PrewriterConfiguredFrontierFixture = Omit<
  ReturnType<typeof configuredFrontierRepairFixture>,
  'prewriterBinding'
> & {
  prewriterBinding: Parameters<typeof continuationProjection.projectConfiguredPrewriterContinuationRequests>[0];
};

export function mutableCoordinationLedger(ledger: CoordinationLedger): MutableCoordinationLedger {
  return {
    ...ledger,
    tickets: ledger.tickets.map((ticket) => ({
      ...ticket,
      claim_ids: [...ticket.claim_ids],
      exclusive_resources: [...ticket.exclusive_resources],
      active_resources: [...ticket.active_resources],
      blocked_resources: [...ticket.blocked_resources],
    })),
    claims: ledger.claims.map((claim) => ({ ...claim, resources: [...claim.resources] })),
    operations: ledger.operations.map((operation) => ({ ...operation })),
  };
}

/** Copy the synthetic builder's current v1 receipt into the writable shape needed by these test mutations. */
export function mutableFrontierFixture(fixture: PrewriterConfiguredFrontierFixture) {
  const priorLedger = mutableCoordinationLedger(fixture.receipt.prior_ledger),
    successorLedger = mutableCoordinationLedger(fixture.receipt.successor_ledger);
  if (fixture.receipt.prior_ledger.operations === fixture.receipt.successor_ledger.operations)
    successorLedger.operations = priorLedger.operations;
  return {
    ...fixture,
    receipt: {
      ...fixture.receipt,
      prior_ledger: priorLedger,
      successor_ledger: successorLedger,
    },
    current: { ...fixture.current },
    ...(fixture.prewriterBinding ? { prewriterBinding: fixture.prewriterBinding } : {}),
  };
}

export function normalConfigEndpointProof(request: DeliveredWorkContinuationRequest): ClosedConfigRebindProof {
  const originalTransition = request.sourceTransition.transition;
  const workspaceId =
    originalTransition.schema === 'RuntimeConfigDeliveryTransition/v1'
      ? originalTransition.fence.workspace_id
      : originalTransition.workspace_id;
  const transition: ConfiguredRuntimeEndpointTransition = {
    schema: 'ConfiguredRuntimeEndpointTransition/v1',
    workspace_id: workspaceId,
    repository_id: request.identity.repository_id,
    project_ids: request.identity.project_ids,
    operation_path: '.agent/work/config-only/runtime-config-rebind-operation.v1.json',
    target_config_digest: request.targetConfigDigest,
    target_schema_digest: request.targetSchemaDigest,
    receipt_path: '.agent/runtime-initialization.v1.json',
    prior_runtime_code_digest: request.priorRuntimeCodeDigest,
    target_runtime_code_digest: request.targetRuntimeCodeDigest,
    parent_manifest_digest: request.parentManifestDigest,
    successor_manifest_digest: request.successorManifestDigest,
    parent_manifest_ref: '.tmp/endpoint/parent/manifest.json',
    successor_manifest_ref: '.tmp/endpoint/current/manifest.json',
    system_update_operation_id: request.forwardOperationId,
    system_update_ref: '.tmp/endpoint/system-updated-result.json',
    system_update_sha256: 'a'.repeat(64),
    source_correction_ref: '.tmp/endpoint/source-publication.json',
    source_correction_sha256: 'a'.repeat(64),
    original_intake_ref: '.agent/work/original/local-session-intake.v1.json',
    original_intake_sha256: 'a'.repeat(64),
    operation_sha256: 'a'.repeat(64),
    operation_plan_digest: 'a'.repeat(64),
    operation_release_digest: 'a'.repeat(64),
    target_yaml_sha256: 'a'.repeat(64),
    receipt_sha256: 'a'.repeat(64),
    native_self_attestation_digest: 'a'.repeat(64),
    runtime_accepted: false,
  };
  return {
    status: 'closed_config_rebind_proven',
    operation_id: 'config-only',
    baseline_config_digest: request.priorConfigDigest,
    transition,
    transition_digest: canonicalJsonDigest(transition),
    caller_owner_cas_required: true,
    runtime_accepted: false,
    writes_host_state: false,
  };
}

export function useNormalConfigEndpointProof(input: { receipt: ConfiguredFrontierReceipt }) {
  const receipt = input.receipt;
  const request = { ...receipt.request, sourceTransition: normalConfigEndpointProof(receipt.request) };
  input.receipt = {
    ...receipt,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: {
      ...receipt.authorization,
      request_digest: canonicalJsonDigest(request),
      transition_digest: request.sourceTransition.transition_digest,
    },
    continuation_id: canonicalJsonDigest({
      identity: request.identity,
      attempt: request.attempt,
      action_id: request.action.request.action_id,
      transition_digest: request.sourceTransition.transition_digest,
    }),
  };
  return input;
}

export function withFrontierJournalFixture(
  f: Pick<Awaited<ReturnType<typeof continuationFixture>>, 'db' | 'workspaceId' | 'identity' | 'root'>,
  before: { readonly revision: number; readonly payload: string; readonly digest: string },
  journal: MastraSessionLedgerState,
  action: (version: StateVersion) => undefined,
): void {
  const payload = canonicalJson(journal),
    digest = canonicalJsonDigest(journal),
    revision = before.revision + 1;
  const update = f.db.query(
    'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1 AND revision=? AND digest=? AND payload=?',
  );
  let replaced = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    replaced =
      update.run(
        revision,
        payload,
        digest,
        f.workspaceId,
        f.identity.work_id,
        before.revision,
        before.digest,
        before.payload,
      ).changes === 1;
    if (!replaced) throw new Error('Configured frontier Journal fixture beforeimage changed.');
    action({ revision, digest });
  } catch (error) {
    primaryFailure = { error };
    retainContinuationFixtureRoot(f.root);
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          if (!replaced) return;
          try {
            const restored = update.run(
              before.revision,
              before.payload,
              before.digest,
              f.workspaceId,
              f.identity.work_id,
              revision,
              digest,
              payload,
            );
            if (restored.changes !== 1) throw new Error('Configured frontier Journal fixture restoration changed.');
          } catch (error) {
            retainContinuationFixtureRoot(f.root);
            throw error;
          }
        },
      ],
      primaryFailure,
    );
  }
}

export function seedFrontierHostFixture(
  f: Awaited<ReturnType<typeof continuationFixture>>,
  input: { receipt: ConfiguredFrontierReceipt },
  staleDigest = false,
) {
  const { receipt } = input;
  const stateRows: readonly (
    | readonly ['work', WorkState, StateVersion]
    | readonly ['ledger', CoordinationLedger, StateVersion]
  )[] = [
    ['work', receipt.successor_work, receipt.work_version],
    ['ledger', receipt.successor_ledger, receipt.ledger_version],
  ];
  for (const [kind, state, version] of stateRows)
    f.db
      .query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind=?')
      .run(version.revision, canonicalJson(state), version.digest, f.workspaceId, kind);
  f.db
    .query(
      'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
    )
    .run(
      receipt.journal_version.revision,
      canonicalJson(receipt.successor_journal),
      receipt.journal_version.digest,
      f.workspaceId,
      f.identity.work_id,
      1,
    );
  f.db.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_delivered_work_continuation (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,action_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
  );
  f.db
    .query('INSERT INTO agent_host_delivered_work_continuation VALUES(?,?,?,?,?,?)')
    .run(
      f.workspaceId,
      f.identity.work_id,
      1,
      receipt.request.action.request.action_id,
      canonicalJson(receipt),
      staleDigest ? '0'.repeat(64) : canonicalJsonDigest(receipt),
    );
}

export function configuredFrontierRepairHostRoot(
  proofKind: 'delivery' | 'normal' | 'normal-large' = 'delivery',
  changedSource = false,
  onRoot?: (root: string) => void,
) {
  const root = mkdtempSync(path.join(tmpdir(), 'frontier-repair-host-'));
  trackContinuationFixtureRoot(root);
  onRoot?.(root);
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  const template = readFileSync(
    path.join(runtimeRoot, 'packages', 'agent', 'templates', 'agent-runtime.config.template.v1.yaml'),
    'utf8',
  )
    .replaceAll('{{REPOSITORY}}', 'vida-agent')
    .replaceAll('{{PROJECT}}', 'agent')
    .replaceAll('{{BUNDLE}}', 'vida-agent');
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), template);
  writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture map\n');
  writeFileSync(path.join(root, 'docs', 'agent-instructions', 'documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(root),
    workspaceId = deriveWorkspaceId('vida-agent', root);
  const input = mutableFrontierFixture(
    configuredFrontierRepairFixture(true, changedSource, { root, config, workspaceId }, 'implementation'),
  );
  const item = {
    schema: 'WorkItem/v1',
    id: input.receipt.request.identity.work_id,
    provider: 'local',
    provider_type: 'Task',
    canonical_kind: 'task',
    intent: 'task_execution',
    project_id: 'agent',
    title: 'Repair the original frontier',
    description: 'Fixture task',
    risk_flags: ['high'],
    labels: [],
  };
  const intake = {
    schema: 'VidaLocalSessionIntake/v1',
    native_session_handle: input.receipt.request.nativeSessionHandle,
    runtime_code_paths: [config.runtime.bundle + '/bin/run.mjs'],
    risk: 'high',
    route: 'R4',
    change_kind: 'fix',
    work_item: item,
  };
  const intakePath = '.agent/work/work-1/local-session-intake.v1.json',
    bytes = Buffer.from(canonicalJson(intake));
  mkdirSync(path.dirname(path.join(root, intakePath)), { recursive: true });
  writeFileSync(path.join(root, intakePath), bytes);
  const prior = {
    ...input.receipt.prior_work,
    binding: { ...input.receipt.prior_work.binding, work_item_digest: canonicalJsonDigest(item) },
    artifacts: [
      {
        artifact_id: 'local-session-intake',
        schema: 'VidaLocalSessionIntake/v1',
        path: intakePath,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        stage_id: 'intake',
        scope_id: 'scope-fixture',
        source_revision: input.receipt.prior_work.binding.work_source_revision,
        ac_ids: ['AC-1'],
      },
    ],
  };
  const successor = {
    ...input.receipt.successor_work,
    binding: { ...input.receipt.successor_work.binding, work_item_digest: canonicalJsonDigest(item) },
    artifacts: prior.artifacts,
  };
  const priorVersion = { revision: prior.revision, digest: canonicalJsonDigest(prior) };
  const successorVersion = { revision: successor.revision, digest: canonicalJsonDigest(successor) };
  const request = { ...input.receipt.request, expectedWork: priorVersion };
  input.receipt = {
    ...input.receipt,
    prior_work: prior,
    prior_work_version: priorVersion,
    successor_work: successor,
    successor_binding: successor.binding,
    work_version: successorVersion,
    request,
    request_digest: canonicalJsonDigest(request),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(request) },
  };
  input.current = { ...input.current, work: successor, work_version: successorVersion };
  if (proofKind === 'normal') useNormalConfigEndpointProof(input);
  return { root, config, workspaceId, input, intakePath };
}

export function bindFrontierContractReferences(input: { receipt: ConfiguredFrontierReceipt }): void {
  const referencePairs: readonly (readonly [
    'implementation_scope' | 'acceptance_manifest',
    WorkState['contracts']['scope'],
  ])[] = [
    ['implementation_scope', input.receipt.prior_work.contracts.scope],
    ['acceptance_manifest', input.receipt.prior_work.contracts.acceptance],
  ];
  const references: WorkState['lifecycle']['references'] = referencePairs.map(([kind, ref]) => ({
    schema: 'LifecycleArtifactReference/v1',
    kind,
    artifact_schema: ref.schema,
    record_id: kind,
    path: ref.path,
    sha256: ref.sha256,
    source_revision: input.receipt.prior_work.binding.work_source_revision,
    scope_id: input.receipt.prior_work.binding.scope_id,
    ac_ids: input.receipt.prior_work.binding.ac_ids,
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: 'fixture-original-owner',
    decision: 'approved',
    disposition: 'current',
  }));
  const priorWork = { ...input.receipt.prior_work, lifecycle: { ...input.receipt.prior_work.lifecycle, references } };
  const successorWork = {
    ...input.receipt.successor_work,
    lifecycle: { ...input.receipt.successor_work.lifecycle, references },
  };
  const priorVersion = { revision: priorWork.revision, digest: canonicalJsonDigest(priorWork) };
  const originalRequest = { ...input.receipt.request, expectedWork: priorVersion };
  input.receipt = {
    ...input.receipt,
    prior_work: priorWork,
    prior_work_version: priorVersion,
    successor_work: successorWork,
    work_version: { revision: successorWork.revision, digest: canonicalJsonDigest(successorWork) },
    request: originalRequest,
    request_digest: canonicalJsonDigest(originalRequest),
    authorization: { ...input.receipt.authorization, request_digest: canonicalJsonDigest(originalRequest) },
  };
}

export function failedFrontierJournalFixture(
  journal: MastraSessionLedgerState,
  summary = 'Fixture known packet gap',
  agentId = 'fixture:readonly',
  toolCallRef = 'fixture:result',
): MastraSessionLedgerState {
  return {
    ...journal,
    items: journal.items.map((item) => {
      const issue_id = randomUUID();
      return {
        ...item,
        issue_id,
        observation: {
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id,
          agent_id: agentId,
          tool_call_ref: toolCallRef,
          status: 'reported_failed',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture:gap'],
        },
      };
    }),
  };
}
