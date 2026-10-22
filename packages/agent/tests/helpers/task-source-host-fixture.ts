import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../../src/config/project-context.ts';
import {
  HostStateStore,
  openHostStateDatabase,
  type CoordinationLedger,
  type CoordinationTicket,
  type HostStateSnapshot,
  type StateVersion,
  type WorkIdentity,
  type WorkState,
} from '../../src/host-state.ts';
import { canonicalJson, canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import type { LifecycleArtifactReference } from '../../src/lifecycle/lifecycle-state.ts';
import type { CoordinationClaim } from '../../src/contracts/envelopes.ts';
import type { TaskSourceBindingRequest } from '../../src/orchestration/task-source-binding.ts';
import type {
  MastraSessionLedgerSnapshot,
  MastraSessionLedgerState,
} from '../../src/orchestration/persistent-session-handoff.ts';
type TaskSourceMutationVerifier = NonNullable<ConstructorParameters<typeof HostStateStore>[8]>;
type TaskSourceMutationCheck = TaskSourceMutationVerifier['verify'];
type TaskSourcePolicyRequest = Parameters<TaskSourceMutationCheck>[0]['request'];
type CurrentVerifier = Parameters<HostStateStore['prepareTaskSourceBindingOperation']>[0]['verifyCurrent'];
const defaultIdentity: WorkIdentity = {
  repository_id: 'vida-agent',
  project_ids: ['agent'],
  integrations_digest: '1'.repeat(64),
  work_id: 'task-source-expiry',
};
const resource = 'file:src/task.ts';
const runId = 'run-task-source-expiry';

type ScopedSourceSnapshot = NonNullable<MastraSessionLedgerState['source_scope']>;
type WorkLedgerSeed = {
  readonly work: WorkState;
  readonly sourceScope: ScopedSourceSnapshot;
  readonly ledger: CoordinationLedger;
};

function workAndLedger(
  expiresAt: string,
  identity: WorkIdentity,
  configDigest: string,
  workspaceId: string,
  retainedResources: readonly string[],
  suppliedSourceScope?: ScopedSourceSnapshot,
): WorkLedgerSeed {
  const resources = [resource, ...retainedResources].sort();
  const scopeBody: Omit<ScopedSourceSnapshot, 'digest'> = {
    schema: 'ScopedSourceSnapshot/v1',
    entries: [{ path: 'src/task.ts', exists: true, bytes: 3, sha256: '2'.repeat(64) }],
  };
  const sourceScope: ScopedSourceSnapshot = suppliedSourceScope ?? {
    ...scopeBody,
    digest: canonicalJsonDigest(scopeBody),
  };
  const activeClaim: CoordinationClaim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-task-source-expiry',
    ticket_id: 'ticket-task-source-expiry',
    work_id: identity.work_id,
    thread_id: 'thread-task-source-expiry',
    generation: 1,
    resources,
    lease_expires_at: expiresAt,
    status: 'active',
    created_at: new Date().toISOString(),
    renewed_at: new Date().toISOString(),
  };
  const activeTicket: CoordinationTicket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: 'ticket-task-source-expiry',
    repository_id: identity.repository_id,
    project_ids: [...identity.project_ids],
    integrations_digest: identity.integrations_digest,
    work_id: identity.work_id,
    thread_id: activeClaim.thread_id,
    source_revision: sourceScope.digest,
    generation: 1,
    sequence: 1,
    contour_keys: ['tenant:tenant', 'project:tenant/agent', ...resources],
    exclusive_resources: resources,
    status: 'active',
    claim_ids: [activeClaim.claim_id],
    expires_at: expiresAt,
    active_resources: resources,
    blocked_resources: [],
    created_at: new Date().toISOString(),
  };
  const binding: WorkState['binding'] = {
    repository_id: identity.repository_id,
    project_ids: [...identity.project_ids],
    integrations_digest: identity.integrations_digest,
    team_id: 'core',
    workflow_id: 'bug_fix',
    provider_work_item_id: 'external-task-source-expiry',
    lifecycle_work_id: identity.work_id,
    work_item_digest: '3'.repeat(64),
    work_source_revision: sourceScope.digest,
    scope_id: 'scope-task-source-expiry',
    scope_contract_digest: '4'.repeat(64),
    acceptance_manifest_digest: '5'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: ['src/task.ts'],
    allowed_resources: resources,
    config_digest: configDigest,
    runtime_source_revision: '7'.repeat(64),
    schema_digest: '8'.repeat(64),
    runtime_code_digest: '9'.repeat(64),
  };
  const work: WorkState = {
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
    lease: {
      ticket_id: activeTicket.ticket_id,
      thread_id: activeTicket.thread_id,
      generation: activeTicket.generation,
    },
    execution: {
      run_id: runId,
      input_digest: 'a'.repeat(64),
      phase: 'implementation',
      status: 'active',
      assignment_attempts: [],
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: sourceScope.digest,
      next_action: 'Trace the accepted work request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'fix',
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
    },
    artifacts: [],
  };
  return {
    work,
    sourceScope,
    ledger: {
      schema: 'CoordinationLedger/v1',
      workspace_id: workspaceId,
      revision: 1,
      open_generation: 1,
      next_sequence: 2,
      tickets: [activeTicket],
      claims: [activeClaim],
      notices: [],
      dispositions: [],
      contours: [],
      batches: [],
      rebinds: [],
      operations: [],
      retirements: [],
    },
  };
}

type FixtureOptions = {
  readonly sourceScope?: ScopedSourceSnapshot;
  readonly expiresAt?: string;
  readonly retainedResources?: readonly string[];
  readonly policyVerifier?: TaskSourceMutationCheck;
  readonly configuredHost?: { readonly repositoryRoot: string; readonly identity: WorkIdentity };
};

type PeerReservation = {
  readonly identity: WorkIdentity;
  readonly thread_id: string;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly host: HostStateSnapshot;
};

function allocateTaskSourceFixture({ configuredHost }: FixtureOptions) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-task-source-coordination-'));
  mkdirSync(path.join(root, '.git'));
  const repositoryRoot = configuredHost?.repositoryRoot ?? root;
  const identity = configuredHost?.identity ?? defaultIdentity;
  const workspaceId = deriveWorkspaceId(identity.repository_id, repositoryRoot);
  const database = openHostStateDatabase(root, 'host.sqlite', workspaceId);
  return { root, repositoryRoot, identity, workspaceId, database, maintenanceGeneration: 0 };
}

export function createTaskSourceHostFixture(options: FixtureOptions = {}) {
  return initializeTaskSourceFixture(allocateTaskSourceFixture(options), options);
}

export async function createProjectedTaskSourceHostFixture(options: FixtureOptions = {}) {
  const storage = allocateTaskSourceFixture(options);
  let closed = false;
  try {
    const maintainer = new HostStateStore(
      storage.database,
      storage.workspaceId,
      undefined,
      undefined,
      undefined,
      {
        principal: 'fixture:task-source-projection',
        projectIds: storage.identity.project_ids,
        verify: (fence) => ({
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: 'fixture:task-source-projection',
          fence_digest: canonicalJsonDigest(fence),
          closure_digest: fence.binding.closure_digest,
          bundle_digest: fence.binding.bundle_digest,
        }),
      },
      storage.repositoryRoot,
    );
    const fence = maintainer.acquireMaintenanceFence({
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: storage.identity.project_ids,
      operation_id: 'fixture-task-source-projection',
      manifest_digest: '2'.repeat(64),
      request_digest: '3'.repeat(64),
      bindings_digest: '4'.repeat(64),
      closure_digest: '5'.repeat(64),
      bundle_digest: '6'.repeat(64),
    });
    maintainer.repairTaskSourceBindingWorkProjection(fence);
    const released = await maintainer.releaseMaintenanceFence(fence);
    closeWorkspaceDatabaseWithAdmission(storage.database);
    closed = true;
    return initializeTaskSourceFixture(
      {
        ...storage,
        database: openHostStateDatabase(storage.root, 'host.sqlite', storage.workspaceId),
        maintenanceGeneration: released.generation,
      },
      options,
    );
  } catch (error) {
    console.error('Retained projected TaskSource fixture setup: ' + storage.root);
    if (!closed)
      completeOwnedCleanup(
        [
          () => {
            closeWorkspaceDatabaseWithAdmission(storage.database);
          },
        ],
        { error },
      );
    throw error;
  }
}

function initializeTaskSourceFixture(
  {
    root,
    repositoryRoot,
    identity,
    workspaceId,
    database,
    maintenanceGeneration,
  }: ReturnType<typeof allocateTaskSourceFixture>,
  {
    sourceScope,
    expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    retainedResources = [],
    policyVerifier,
    configuredHost,
  }: FixtureOptions,
) {
  try {
    const config = configuredHost ? loadRuntimeConfig(repositoryRoot) : undefined;
    const configDigest = config ? runtimeConfigDigest(config) : '6'.repeat(64);
    const projectContext = config
      ? loadProjectSetContext(repositoryRoot, config, identity.repository_id, identity.project_ids)
      : undefined;
    const store = new HostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      repositoryRoot,
      undefined,
      policyVerifier ? { verify: policyVerifier } : undefined,
    );
    const seed = workAndLedger(expiresAt, identity, configDigest, workspaceId, retainedResources, sourceScope);
    const initial = store.compareAndSwapHostState({
      expectedWork: null,
      expectedLedger: null,
      expectedMaintenanceGeneration: maintenanceGeneration,
      nextWork: seed.work,
      nextLedger: seed.ledger,
    });
    requireHostState(initial);
    const journal: MastraSessionLedgerState = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspaceId,
      work_id: identity.work_id,
      attempt: 1,
      run_id: runId,
      step_id: null,
      source_scope: seed.sourceScope,
      items: [],
      completed: [],
    };
    database.exec(
      'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
    );
    database
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(workspaceId, identity.work_id, 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
    let request: TaskSourceBindingRequest = {
      schema: 'TaskSourceBindingRequest/v1',
      operation: 'propose-create',
      operation_id: 'task-source-op-expiry',
      request_id: 'task-source-request-expiry',
      branch_ref: 'refs/heads/codex/task-source',
      expected_host: {
        work: initial.workVersion,
        ledger: initial.ledgerVersion,
        journal: { attempt: 1, version: { revision: 1, digest: canonicalJsonDigest(journal) } },
        maintenance_generation: initial.maintenanceGeneration,
      },
      work_id: identity.work_id,
      attempt: 1,
      thread_id: 'thread-task-source-expiry',
      repository_id: identity.repository_id,
      project_ids: identity.project_ids,
      canonical_host_root: repositoryRoot,
      source_root: path.join(root, 'task-source'),
      config_digest: configDigest,
      project_context_digest: projectContext?.project_context_digest ?? 'b'.repeat(64),
    };
    // Trusted unit seam only: this callback is not evidence of external authorization.
    const trustedVerifyCurrent: CurrentVerifier = ({ journal: current }) => {
      const currentSourceScope = current.source_scope;
      if (!currentSourceScope) throw new Error('task source fixture requires its current Source scope');
      return {
        source_authorization_sha256: 'c'.repeat(64),
        source_scope_digest: currentSourceScope.digest,
      };
    };
    return {
      identity,
      trustedVerifyCurrent,
      root,
      database,
      store,
      initial,
      journal,
      get request() {
        return request;
      },
      prepare(verifyCurrent: CurrentVerifier = trustedVerifyCurrent) {
        return store.prepareTaskSourceBindingOperation({ request, identity, verifyCurrent });
      },
      rotateOwnerReservation() {
        const before = store.readHostStateSnapshot(identity);
        requireHostState(before);
        const prior = before.ledger.tickets.find((ticket) => ticket.ticket_id === before.work.lease?.ticket_id);
        if (!prior || prior.status !== 'active') throw new Error('Owner rotation needs a current active ticket');
        const claim = before.ledger.claims.find(
          (entry) => entry.ticket_id === prior.ticket_id && entry.status === 'active',
        );
        if (!claim) throw new Error('Owner rotation needs its current active claim');
        const now = new Date().toISOString(),
          ticketId = `fixture-owner-ticket-${before.ledger.next_sequence}`,
          claimId = `fixture-owner-claim-${before.ledger.next_sequence}`,
          nextWork: WorkState = {
            ...before.work,
            revision: before.work.revision + 1,
            lifecycle: { ...before.work.lifecycle, revision: before.work.revision + 1 },
            lease: { ticket_id: ticketId, thread_id: prior.thread_id, generation: prior.generation },
          },
          nextLedger: CoordinationLedger = {
            ...before.ledger,
            revision: before.ledger.revision + 1,
            next_sequence: before.ledger.next_sequence + 1,
            tickets: [
              ...before.ledger.tickets.map((ticket) =>
                ticket.ticket_id === prior.ticket_id
                  ? {
                      ...ticket,
                      status: 'released' as const,
                      active_resources: [],
                      blocked_resources: [],
                      expires_at: null,
                    }
                  : ticket,
              ),
              {
                ...prior,
                ticket_id: ticketId,
                claim_ids: [claimId],
                sequence: before.ledger.next_sequence,
                created_at: now,
              },
            ],
            claims: [
              ...before.ledger.claims.map((entry) =>
                entry.claim_id === claim.claim_id ? { ...entry, status: 'released' as const, renewed_at: now } : entry,
              ),
              { ...claim, claim_id: claimId, ticket_id: ticketId, created_at: now, renewed_at: now },
            ],
            operations: [
              ...before.ledger.operations,
              {
                schema: 'CoordinationOperation/v1',
                operation_id: `fixture-owner-release-${prior.ticket_id}`,
                kind: 'release',
                ticket_id: prior.ticket_id,
                work_id: prior.work_id,
                thread_id: prior.thread_id,
                source_revision: prior.source_revision,
                resources: prior.active_resources,
                from_ledger_revision: before.ledger.revision,
                to_ledger_revision: before.ledger.revision + 1,
                decided_by: prior.thread_id,
                decision_pointer: 'fixture:rotate-admitted-owner',
                created_at: now,
              },
            ],
          };
        const rotated = store.compareAndSwapHostState({
          expectedWork: before.workVersion,
          expectedLedger: before.ledgerVersion,
          expectedMaintenanceGeneration: before.maintenanceGeneration,
          expectedSessionJournal: request.expected_host.journal,
          nextWork,
          nextLedger,
        });
        requireHostState(rotated);
        request = {
          ...request,
          expected_host: {
            ...request.expected_host,
            work: rotated.workVersion,
            ledger: rotated.ledgerVersion,
            maintenance_generation: rotated.maintenanceGeneration,
          },
        };
        return rotated;
      },
      seedPeerReservation({
        workId = 'task-source-peer',
        executionOnly = false,
      }: { readonly workId?: string; readonly executionOnly?: boolean } = {}): PeerReservation {
        const peerIdentity = { ...identity, work_id: workId },
          peerThread = 'thread-' + workId,
          sourceRoot = path.resolve(root, 'task-source'),
          rootKey = process.platform === 'win32' ? sourceRoot.toLocaleLowerCase('en-US') : sourceRoot,
          implementationPaths = executionOnly ? seed.work.binding.implementation_paths : ['peer.ts'],
          peerResources = [
            'branch:' + request.branch_ref,
            'execution:' + peerIdentity.work_id,
            ...implementationPaths.map((file) => 'file:' + file),
            'worktree:' + rootKey,
          ].sort(),
          claimedResources = executionOnly ? ['execution:' + workId] : peerResources,
          peerTicketId = 'ticket-' + workId,
          peerClaimId = 'claim-' + workId,
          now = new Date().toISOString(),
          expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          current = store.readHostStateSnapshot(identity);
        requireHostState(current);
        const peerWork: WorkState = {
          ...seed.work,
          binding: {
            ...seed.work.binding,
            lifecycle_work_id: peerIdentity.work_id,
            provider_work_item_id: 'external-' + workId,
            implementation_paths: implementationPaths,
            allowed_resources: peerResources,
          },
          lifecycle: {
            ...seed.work.lifecycle,
            scope: {
              ...seed.work.lifecycle.scope,
              allowed_paths: implementationPaths,
              fingerprint_paths: implementationPaths,
              implementation_paths: implementationPaths,
            },
          },
          execution: { ...seed.work.execution, run_id: 'run-' + workId },
          lease: { ticket_id: peerTicketId, thread_id: peerThread, generation: 1 },
        };
        const peerTicket: CoordinationTicket = {
          schema: 'CoordinationTicket/v1',
          ticket_id: peerTicketId,
          repository_id: peerIdentity.repository_id,
          project_ids: peerIdentity.project_ids,
          integrations_digest: peerIdentity.integrations_digest,
          work_id: peerIdentity.work_id,
          thread_id: peerThread,
          source_revision: seed.sourceScope.digest,
          generation: 1,
          sequence: current.ledger.next_sequence,
          contour_keys: ['tenant:tenant', 'project:tenant/agent', ...claimedResources],
          exclusive_resources: claimedResources,
          status: 'active',
          claim_ids: [peerClaimId],
          expires_at: expires,
          active_resources: claimedResources,
          blocked_resources: [],
          created_at: now,
        };
        const peerClaim: CoordinationClaim = {
          schema: 'WorkstreamClaim/v1',
          claim_id: peerClaimId,
          ticket_id: peerTicketId,
          work_id: peerIdentity.work_id,
          thread_id: peerThread,
          generation: 1,
          resources: claimedResources,
          lease_expires_at: expires,
          status: 'active',
          created_at: now,
          renewed_at: now,
        };
        const peerHost = store.compareAndSwapHostState({
          expectedWork: null,
          expectedLedger: current.ledgerVersion,
          expectedMaintenanceGeneration: current.maintenanceGeneration,
          nextWork: peerWork,
          nextLedger: {
            ...current.ledger,
            revision: current.ledger.revision + 1,
            next_sequence: current.ledger.next_sequence + 1,
            tickets: [...current.ledger.tickets, peerTicket],
            claims: [...current.ledger.claims, peerClaim],
          },
        });
        const peerJournalState: MastraSessionLedgerState = {
          schema: 'MastraSessionLedger/v1',
          workspace_id: workspaceId,
          work_id: peerIdentity.work_id,
          attempt: 1,
          run_id: 'run-' + workId,
          step_id: null,
          source_scope: seed.sourceScope,
          items: [],
          completed: [],
        };
        database
          .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
          .run(
            workspaceId,
            peerIdentity.work_id,
            1,
            1,
            canonicalJson(peerJournalState),
            canonicalJsonDigest(peerJournalState),
          );
        const targetAfterPeerAdmission = store.readHostStateSnapshot(identity);
        requireHostState(targetAfterPeerAdmission);
        request = {
          ...request,
          expected_host: {
            ...request.expected_host,
            work: targetAfterPeerAdmission.workVersion,
            ledger: targetAfterPeerAdmission.ledgerVersion,
            maintenance_generation: targetAfterPeerAdmission.maintenanceGeneration,
          },
        };
        return {
          identity: peerIdentity,
          thread_id: peerThread,
          journal: {
            state: peerJournalState,
            version: { revision: 1, digest: canonicalJsonDigest(peerJournalState) },
            resume_status: 'ready',
          },
          host: peerHost,
        };
      },
      close(removeRoot: boolean | (() => boolean), retentionReason = 'failed') {
        try {
          closeWorkspaceDatabaseWithAdmission(database);
        } catch (error) {
          console.error(`Retained failed TaskSource fixture close: ${root}`);
          throw error;
        }
        if (typeof removeRoot === 'function' ? removeRoot() : removeRoot)
          rmSync(root, { recursive: true, force: true });
        else console.error(`Retained ${retentionReason} TaskSource fixture: ${root}`);
      },
    };
  } catch (error) {
    console.error(`Retained failed TaskSource fixture setup: ${root}`);
    completeOwnedCleanup(
      [
        () => {
          closeWorkspaceDatabaseWithAdmission(database);
        },
      ],
      { error },
    );
    throw error;
  }
}

function requireHostState(snapshot: HostStateSnapshot): asserts snapshot is HostStateSnapshot & {
  readonly work: WorkState;
  readonly ledger: CoordinationLedger;
  readonly workVersion: StateVersion;
  readonly ledgerVersion: StateVersion;
} {
  if (!snapshot.work || !snapshot.ledger || !snapshot.workVersion || !snapshot.ledgerVersion) {
    throw new Error('task source fixture expected complete Host state');
  }
}

export { defaultIdentity as taskSourceHostIdentity, requireHostState };

/** This injected verifier is a trusted test mock, not proof of runtime authorization. */
export function trustedTaskSourcePolicyDecision(
  request: TaskSourcePolicyRequest,
): Awaited<ReturnType<TaskSourceMutationCheck>> {
  const sourceAuthorizationReference: LifecycleArtifactReference = {
    schema: 'LifecycleArtifactReference/v1',
    kind: 'execution_approval',
    artifact_schema: 'LocalSourceWriteAuthorization/v1',
    record_id: 'source-auth',
    path: '.agent/source-authorization.json',
    sha256: 'c'.repeat(64),
    source_revision: '7'.repeat(64),
    scope_id: 'scope-task-source-expiry',
    ac_ids: ['AC-1'],
    generation: null,
    implementation_fingerprint: null,
    delivery_cycle_id: null,
    principal: 'task-source-fixture',
    decision: 'approved',
    disposition: 'current',
  };
  return {
    operation_id: request.operation_id,
    request_id: request.request_id,
    operation_hash: request.operation_hash,
    prepared_record_cas: request.prepared_record_cas,
    authorization: { decision: 'allow', diagnostics: [] },
    edictum_operation: { operation_hash: request.operation_hash, tenant: 'tenant', project: 'agent' },
    edictum_evaluation: {
      action: 'pending_approval',
      reason: 'TaskSource fixture policy evaluation',
      stageId: 'source_write',
      events: [],
      records: [],
      audit: null,
    },
    source_authorization_reference: sourceAuthorizationReference,
    source_authorization_sha256: 'c'.repeat(64),
    preflight_evidence_digest: 'd'.repeat(64),
  };
}
