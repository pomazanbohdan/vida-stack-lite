import { expect, test } from 'bun:test';
import type { HostStateStore } from '../../src/host-state.ts';
import type { LifecycleArtifactReference } from '../../src/lifecycle/lifecycle-state.ts';
import { suspendLocalWork } from '../../src/orchestration/suspend-local-work.ts';
import {
  createTaskSourceHostFixture as createFixture,
  taskSourceHostIdentity as identity,
  requireHostState,
} from '../helpers/task-source-host-fixture.ts';

function deferred<T>(): { readonly promise: Promise<T>; readonly resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {
    throw new Error('deferred promise has not been initialized');
  };
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

type TaskSourceMutationVerifier = NonNullable<ConstructorParameters<typeof HostStateStore>[8]>;
type TaskSourceMutationCheck = TaskSourceMutationVerifier['verify'];
type TaskSourcePolicyRequest = Parameters<TaskSourceMutationCheck>[0]['request'];

/** This injected verifier is a trusted test mock, not proof of runtime authorization. */
function allowedPolicyDecision(request: TaskSourcePolicyRequest): Awaited<ReturnType<TaskSourceMutationCheck>> {
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

function requireActionResult(value: Readonly<Record<string, unknown>>): asserts value is Readonly<
  Record<string, unknown>
> & {
  readonly status: 'queued' | 'issued';
  readonly action: { readonly status: 'issued' } | null;
  readonly command_argv: readonly (readonly string[])[] | null;
} {
  if (
    (value.status !== 'queued' && value.status !== 'issued') ||
    !(value.action === null || (isRecord(value.action) && value.action.status === 'issued')) ||
    !(value.command_argv === null || isStringMatrix(value.command_argv))
  ) {
    throw new Error('task source fixture received an invalid action result');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringMatrix(value: unknown): value is readonly (readonly string[])[] {
  return (
    Array.isArray(value) &&
    value.every((row: unknown) => Array.isArray(row) && row.every((item: unknown) => typeof item === 'string'))
  );
}

test('TaskSource uses a canonical FIFO reservation, then promotes the same ticket after a supported peer release', async () => {
  const fixture = createFixture({
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    policyVerifier: async ({ request }) => allowedPolicyDecision(request),
  });
  let completed = false;
  let hasPrimaryError = false;
  let primaryError: unknown;
  let hasCleanupError = false;
  let cleanupError: unknown;
  try {
    const peer = fixture.seedPeerReservation();
    fixture.prepare();
    const queued = await fixture.store.issueTaskSourceBindingOperation({ request: fixture.request, identity });
    requireActionResult(queued);
    expect(queued.status).toBe('queued');
    expect(queued.action).toBeNull();
    expect(queued.command_argv).toBeNull();
    let target = fixture.store.readHostStateSnapshot(identity);
    requireHostState(target);
    const ownTicketId = `task-source-ticket:${fixture.request.work_id}:${fixture.request.attempt}:${fixture.request.operation_id}`;
    let ticket = target.ledger.tickets.find((entry) => entry.ticket_id === ownTicketId);
    expect(ticket?.status).toBe('queued');
    expect(ticket?.claim_ids).toEqual([]);
    expect(ticket?.blocked_resources).toContain(`branch:${fixture.request.branch_ref}`);
    expect(target.work.lease?.ticket_id).toBe('ticket-task-source-expiry');
    expect(
      fixture.database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_claim'")
        .get(),
    ).toBeNull();
    expect(
      fixture.database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'")
        .get(),
    ).toBeNull();

    const peerBeforeRelease = fixture.store.readHostStateSnapshot(peer.identity);
    requireHostState(peerBeforeRelease);
    const released = suspendLocalWork({
      store: fixture.store,
      identity: peer.identity,
      journal: peer.journal,
      expectedWork: peerBeforeRelease.workVersion,
      expectedLedger: peerBeforeRelease.ledgerVersion,
      expectedMaintenanceGeneration: peerBeforeRelease.maintenanceGeneration,
      nativeSessionHandle: peer.thread_id,
      userRequestPointer: 'user:release-task-source-peer',
      requestIntent: 'next_work',
      documentationContext: {
        repository_root: fixture.root,
        repository_id: peer.identity.repository_id,
        project_id: 'agent',
        work_id: peer.identity.work_id,
      },
    });
    requireHostState(released);
    expect(released.work.execution.status).toBe('suspended');
    expect(released.ledger.tickets.find((entry) => entry.ticket_id === 'ticket-task-source-peer')?.status).toBe(
      'released',
    );

    const issued = await fixture.store.issueTaskSourceBindingOperation({ request: fixture.request, identity });
    requireActionResult(issued);
    expect(issued.status).toBe('issued');
    expect(issued.action?.status).toBe('issued');
    expect(Array.isArray(issued.command_argv)).toBe(true);
    target = fixture.store.readHostStateSnapshot(identity);
    requireHostState(target);
    ticket = target.ledger.tickets.find((entry) => entry.ticket_id === ownTicketId);
    expect(ticket?.status).toBe('active');
    expect(ticket?.sequence).toBe(3);
    expect(target.work.lease?.ticket_id).toBe(ownTicketId);
    expect(
      target.ledger.claims.filter((claim) => claim.ticket_id === ownTicketId && claim.status === 'active'),
    ).toHaveLength(1);
    expect(target.ledger.tickets.find((entry) => entry.ticket_id === 'ticket-task-source-expiry')?.status).toBe(
      'released',
    );
    completed = true;
  } catch (error: unknown) {
    hasPrimaryError = true;
    primaryError = error;
  } finally {
    try {
      fixture.close(completed);
    } catch (error: unknown) {
      hasCleanupError = true;
      cleanupError = error;
    }
  }
  if (hasPrimaryError && hasCleanupError) {
    throw new AggregateError([primaryError, cleanupError], 'TaskSource fixture cleanup failed', {
      cause: primaryError,
    });
  }
  if (hasPrimaryError) throw primaryError;
  if (hasCleanupError) throw cleanupError;
});

test('issue rechecks canonical owner expiry after async policy before writing action or exposing argv', async () => {
  const expiresAt = new Date(Date.now() + 500).toISOString();
  const policyEntered = deferred<void>(),
    resumePolicy = deferred<void>();
  const fixture = createFixture({
    expiresAt,
    policyVerifier: async ({ request }) => {
      policyEntered.resolve(undefined);
      await resumePolicy.promise;
      return allowedPolicyDecision(request);
    },
  });
  let completed = false;
  let hasPrimaryError = false;
  let primaryError: unknown;
  let hasCleanupError = false;
  let cleanupError: unknown;
  let issue: ReturnType<HostStateStore['issueTaskSourceBindingOperation']> | undefined;
  try {
    fixture.prepare();
    const before = fixture.store.readHostStateSnapshot(identity);
    issue = fixture.store.issueTaskSourceBindingOperation({ request: fixture.request, identity });
    const policyWait = await Promise.race([
      policyEntered.promise.then(() => 'entered'),
      issue.then<'returned'>(
        () => 'returned',
        (error: unknown) => {
          throw error;
        },
      ),
    ]);
    expect(policyWait).toBe('entered');
    const remaining = Date.parse(expiresAt) - Date.now();
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining + 10));
    resumePolicy.resolve(undefined);

    await Promise.resolve(expect(issue).rejects.toThrow(/expiry|expired|stale/i));

    const after = fixture.store.readHostStateSnapshot(identity);
    expect(after.workVersion).toEqual(before.workVersion);
    expect(after.ledgerVersion).toEqual(before.ledgerVersion);
    expect(fixture.store.readWorkSessionJournal(identity)?.version).toEqual(
      fixture.request.expected_host.journal.version,
    );
    expect(
      fixture.database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_action'")
        .get(),
    ).toBeNull();
    expect(
      fixture.database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_task_source_binding_claim'")
        .get(),
    ).toBeNull();
    completed = true;
  } catch (error: unknown) {
    hasPrimaryError = true;
    primaryError = error;
  } finally {
    resumePolicy.resolve(undefined);
    if (issue) await issue.catch(() => undefined);
    try {
      fixture.close(completed);
    } catch (error: unknown) {
      hasCleanupError = true;
      cleanupError = error;
    }
  }
  if (hasPrimaryError && hasCleanupError) {
    throw new AggregateError([primaryError, cleanupError], 'TaskSource fixture cleanup failed', {
      cause: primaryError,
    });
  }
  if (hasPrimaryError) throw primaryError;
  if (hasCleanupError) throw cleanupError;
});
