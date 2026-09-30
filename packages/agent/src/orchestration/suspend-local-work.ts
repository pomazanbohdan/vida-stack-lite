import type { HostStateSnapshot, HostStateStore, StateVersion, WorkIdentity } from '../host-state.js';
import type { DocumentationVerificationContext } from '../lifecycle/lifecycle-state.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';

function requireSuspension(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`local work suspension: ${message}`);
}

/** Release only this admitted work's exact lease after all observed native activity is quiescent. */
type SuspensionInput = {
  readonly store: HostStateStore;
  readonly identity: WorkIdentity;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly nativeSessionHandle: string;
  readonly userRequestPointer: string;
  readonly requestIntent: 'linked_correction' | 'next_work';
  readonly documentationContext: DocumentationVerificationContext;
};

export function suspendLocalWork(input: SuspensionInput): HostStateSnapshot {
  return suspendLocalWorkCore(input, false);
}

/** Close a completed readonly owner's exact lease, including an expired one.
 * This grants no lease, fencing generation, source rights or task acceptance.
 * The admitted capture entrypoint validates original configured readonly rights.
 */
export function suspendCompletedReadOnlyWork(input: SuspensionInput): HostStateSnapshot {
  const issues = [...input.journal.state.completed.flatMap((step) => step.items), ...input.journal.state.items];
  requireSuspension(
    issues.length > 0 &&
      issues.every(
        (item) => item.issue_id !== null && item.observation?.status === 'reported_complete' && !item.host_reservation,
      ),
    'completed readonly owner still has unobserved, failed or reserved activity',
  );
  return suspendLocalWorkCore(input, true);
}

function suspendLocalWorkCore(input: SuspensionInput, completedReadonly: boolean): HostStateSnapshot {
  const {
    store,
    identity,
    journal,
    expectedWork,
    expectedLedger,
    nativeSessionHandle,
    userRequestPointer,
    requestIntent,
    documentationContext,
  } = input;
  requireSuspension(
    nativeSessionHandle.length > 0 &&
      nativeSessionHandle.length <= 256 &&
      userRequestPointer.length > 0 &&
      userRequestPointer.length <= 2048 &&
      !/\p{Cc}/u.test(nativeSessionHandle + userRequestPointer),
    'native session or attributed request pointer is invalid',
  );
  const host = store.readHostStateSnapshot(identity);
  requireSuspension(
    identity.project_ids.length === 1 &&
      documentationContext.repository_id === identity.repository_id &&
      documentationContext.project_id === identity.project_ids[0] &&
      documentationContext.work_id === identity.work_id,
    'documentation verification context differs from the admitted work',
  );
  requireSuspension(
    host.work && host.ledger && host.workVersion && host.ledgerVersion,
    'admitted work or ledger is missing',
  );
  const work = host.work;
  requireSuspension(
    work.binding.repository_id === identity.repository_id &&
      canonicalJsonDigest(work.binding.project_ids) === canonicalJsonDigest(identity.project_ids) &&
      work.binding.integrations_digest === identity.integrations_digest &&
      work.binding.lifecycle_work_id === identity.work_id &&
      journal.state.workspace_id === store.workspaceId &&
      journal.state.work_id === identity.work_id &&
      journal.state.run_id === work.execution.run_id,
    'work identity or journal differs',
  );
  const issues = [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items];
  requireSuspension(
    !issues.some((item) => item.issue_id !== null && item.observation === null) &&
      !work.execution.assignment_attempts.some(
        (attempt) => attempt.status === 'started' || attempt.status === 'uncertain',
      ),
    'native action or host assignment is still active or uncertain',
  );
  const operationId = `${completedReadonly ? 'completed-readonly-release' : 'session-release'}-${canonicalJsonDigest({
    work_id: identity.work_id,
    nativeSessionHandle,
    userRequestPointer,
    requestIntent,
    journal: journal.version.digest,
  }).slice(0, 40)}`;
  if (work.lease === null) {
    requireSuspension(
      work.execution.status === 'suspended' &&
        host.ledger.operations.some(
          (operation) =>
            operation.kind === 'release' &&
            operation.operation_id === operationId &&
            operation.decision_pointer === userRequestPointer,
        ),
      'prior suspension is not the same attributed request',
    );
    return host;
  }
  requireSuspension(
    canonicalJsonDigest(host.workVersion) === canonicalJsonDigest(expectedWork) &&
      canonicalJsonDigest(host.ledgerVersion) === canonicalJsonDigest(expectedLedger),
    'work or ledger compare-and-swap version changed',
  );
  const lease = work.lease;
  const ticket = host.ledger.tickets.find((item) => item.ticket_id === lease.ticket_id);
  const claims = host.ledger.claims.filter((item) => item.ticket_id === lease.ticket_id && item.status === 'active');
  const expectedResources = work.binding.implementation_paths.map((item) => `file:${item}`).sort();
  requireSuspension(
    work.execution.status === 'active' &&
      work.lifecycle.phase !== 'COMPLETE' &&
      expectedResources.length > 0 &&
      lease.thread_id === nativeSessionHandle &&
      ticket?.status === 'active' &&
      ticket.thread_id === nativeSessionHandle &&
      ticket.work_id === identity.work_id &&
      ticket.generation === lease.generation &&
      ticket.expires_at !== null &&
      (completedReadonly || Date.parse(ticket.expires_at) > Date.now()) &&
      claims.length === 1 &&
      claims[0]!.generation === lease.generation &&
      (completedReadonly || Date.parse(claims[0]!.lease_expires_at) > Date.now()) &&
      canonicalJsonDigest([...ticket.exclusive_resources].sort()) === canonicalJsonDigest(expectedResources) &&
      canonicalJsonDigest([...ticket.active_resources].sort()) === canonicalJsonDigest(expectedResources) &&
      canonicalJsonDigest([...claims[0]!.resources].sort()) === canonicalJsonDigest(expectedResources) &&
      !host.ledger.tickets.some(
        (other) =>
          other.ticket_id !== ticket.ticket_id &&
          (completedReadonly || other.sequence < ticket.sequence) &&
          ['queued', 'active', 'ready_for_handoff', 'blocked'].includes(other.status) &&
          other.exclusive_resources.some((resource) => expectedResources.includes(resource)),
      ),
    'exact active same-thread lease is missing, expired or incomplete',
  );
  const now = new Date().toISOString();
  const nextWork = {
    ...work,
    revision: work.revision + 1,
    lease: null,
    execution: {
      ...work.execution,
      ...(completedReadonly ? {} : { phase: 'awaiting_followup' }),
      status: 'suspended' as const,
    },
    lifecycle: {
      ...work.lifecycle,
      revision: work.revision + 1,
      next_action:
        requestIntent === 'linked_correction'
          ? 'Attributable correction may acquire a fresh fence; Runtime acceptance remains pending.'
          : 'Prior work awaits user testing; new work must be admitted separately.',
    },
  };
  const nextLedger = {
    ...host.ledger,
    revision: host.ledger.revision + 1,
    tickets: host.ledger.tickets.map((item) =>
      item.ticket_id === ticket.ticket_id
        ? { ...item, status: 'released' as const, active_resources: [], blocked_resources: [], expires_at: null }
        : item,
    ),
    claims: host.ledger.claims.map((item) =>
      item.claim_id === claims[0]!.claim_id ? { ...item, status: 'released' as const, renewed_at: now } : item,
    ),
    operations: [
      ...host.ledger.operations,
      {
        schema: 'CoordinationOperation/v1' as const,
        operation_id: operationId,
        kind: 'release' as const,
        ticket_id: ticket.ticket_id,
        work_id: ticket.work_id,
        thread_id: ticket.thread_id,
        source_revision: ticket.source_revision,
        resources: expectedResources,
        from_ledger_revision: host.ledger.revision,
        to_ledger_revision: host.ledger.revision + 1,
        decided_by: nativeSessionHandle,
        decision_pointer: userRequestPointer,
        created_at: now,
      },
    ],
  };
  return store.compareAndSwapHostState({
    expectedWork,
    expectedLedger,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    documentationContext,
    nextWork,
    nextLedger,
  });
}
