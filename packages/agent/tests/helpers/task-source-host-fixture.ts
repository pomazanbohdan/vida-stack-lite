import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
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
const workspaceId: string = 'a'.repeat(64);
const identity: WorkIdentity = {
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

function workAndLedger(expiresAt: string): WorkLedgerSeed {
  const scopeBody: Omit<ScopedSourceSnapshot, 'digest'> = {
    schema: 'ScopedSourceSnapshot/v1',
    entries: [{ path: 'src/task.ts', exists: true, bytes: 3, sha256: '2'.repeat(64) }],
  };
  const sourceScope: ScopedSourceSnapshot = { ...scopeBody, digest: canonicalJsonDigest(scopeBody) };
  const activeClaim: CoordinationClaim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-task-source-expiry',
    ticket_id: 'ticket-task-source-expiry',
    work_id: identity.work_id,
    thread_id: 'thread-task-source-expiry',
    generation: 1,
    resources: [resource],
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
    contour_keys: ['tenant:tenant', 'project:tenant/agent', resource],
    exclusive_resources: [resource],
    status: 'active',
    claim_ids: [activeClaim.claim_id],
    expires_at: expiresAt,
    active_resources: [resource],
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
    allowed_resources: [resource],
    config_digest: '6'.repeat(64),
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
  readonly expiresAt?: string;
  readonly policyVerifier?: TaskSourceMutationCheck;
};

type PeerReservation = {
  readonly identity: WorkIdentity;
  readonly thread_id: string;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly host: HostStateSnapshot;
};

export function createTaskSourceHostFixture({
  expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  policyVerifier,
}: FixtureOptions = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-task-source-coordination-'));
  mkdirSync(path.join(root, '.git'));
  const database = openHostStateDatabase(root, 'host.sqlite', workspaceId);
  try {
    const store = new HostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
      undefined,
      policyVerifier ? { verify: policyVerifier } : undefined,
    );
    const seed = workAndLedger(expiresAt);
    const initial = store.compareAndSwapHostState({
      expectedWork: null,
      expectedLedger: null,
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
      canonical_host_root: root,
      source_root: path.join(root, 'task-source'),
      config_digest: '6'.repeat(64),
      project_context_digest: 'b'.repeat(64),
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
      seedPeerReservation(): PeerReservation {
        const peerIdentity = { ...identity, work_id: 'task-source-peer' },
          peerThread = 'thread-task-source-peer',
          sourceRoot = path.resolve(root, 'task-source'),
          rootKey = process.platform === 'win32' ? sourceRoot.toLocaleLowerCase('en-US') : sourceRoot,
          peerResources = [
            'branch:' + request.branch_ref,
            'execution:' + peerIdentity.work_id,
            'file:peer.ts',
            'worktree:' + rootKey,
          ].sort(),
          peerTicketId = 'ticket-task-source-peer',
          peerClaimId = 'claim-task-source-peer',
          now = new Date().toISOString(),
          expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          current = store.readHostStateSnapshot(identity);
        requireHostState(current);
        const peerWork: WorkState = {
          ...seed.work,
          binding: {
            ...seed.work.binding,
            lifecycle_work_id: peerIdentity.work_id,
            provider_work_item_id: 'external-task-source-peer',
            implementation_paths: ['peer.ts'],
            allowed_resources: peerResources,
          },
          lifecycle: {
            ...seed.work.lifecycle,
            scope: {
              ...seed.work.lifecycle.scope,
              allowed_paths: ['peer.ts'],
              fingerprint_paths: ['peer.ts'],
              implementation_paths: ['peer.ts'],
            },
          },
          execution: { ...seed.work.execution, run_id: 'run-task-source-peer' },
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
          contour_keys: ['tenant:tenant', 'project:tenant/agent', ...peerResources],
          exclusive_resources: peerResources,
          status: 'active',
          claim_ids: [peerClaimId],
          expires_at: expires,
          active_resources: peerResources,
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
          resources: peerResources,
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
          run_id: 'run-task-source-peer',
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
      close(removeRoot: boolean, retentionReason = 'failed') {
        if (!removeRoot) console.error(`Retained ${retentionReason} TaskSource fixture: ${root}`);
        closeWorkspaceDatabaseWithAdmission(database);
        if (removeRoot) rmSync(root, { recursive: true, force: true });
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

export { identity as taskSourceHostIdentity, requireHostState };

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
