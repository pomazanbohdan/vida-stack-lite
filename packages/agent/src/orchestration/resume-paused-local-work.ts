import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { HostStateStore, StateVersion, WorkIdentity } from '../host-state.js';
import type { MastraSessionLedger } from './persistent-session-handoff.js';

function requireResume(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`paused local work resume: ${message}`);
}
const same = (left: unknown, right: unknown): boolean => canonicalJsonDigest(left) === canonicalJsonDigest(right);

/** Reacquire exact source rights after a cooperative pause; never infer release from expiry. */
export function resumePausedLocalWork(input: {
  readonly store: HostStateStore;
  readonly ledger: MastraSessionLedger;
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly nativeSessionHandle: string;
  readonly configDigest: string;
  readonly sourceDigest: string;
  readonly now?: string;
}): {
  status: 'resumed' | 'inspect_required';
  ticket_id: string;
  work_version: StateVersion;
  ledger_version: StateVersion;
  journal_version: StateVersion;
} {
  const host = input.store.readHostStateSnapshot(input.identity);
  const journal = input.ledger.resume(input.identity.work_id, input.attempt);
  requireResume(
    host.work &&
      host.ledger &&
      host.workVersion &&
      host.ledgerVersion &&
      journal &&
      same(host.workVersion, input.expectedWork) &&
      same(host.ledgerVersion, input.expectedLedger) &&
      same(journal.version, input.expectedJournal),
    'exact paused owner CAS tuple changed',
  );
  const work = host.work;
  requireResume(
    work.lease === null &&
      work.execution.status === 'suspended' &&
      work.lifecycle.phase !== 'COMPLETE' &&
      work.binding.config_digest === input.configDigest &&
      work.binding.work_source_revision === input.sourceDigest &&
      same(work.binding.project_ids, input.identity.project_ids) &&
      work.binding.integrations_digest === input.identity.integrations_digest &&
      work.execution.run_id === journal.state.run_id &&
      journal.state.source_scope?.digest === input.sourceDigest &&
      !work.execution.assignment_attempts.some(
        (attempt) => attempt.status === 'started' || attempt.status === 'uncertain',
      ),
    'paused work authority or scoped source changed',
  );
  const prior = [...host.ledger.tickets]
    .reverse()
    .find(
      (ticket) =>
        ticket.work_id === input.identity.work_id &&
        ticket.repository_id === input.identity.repository_id &&
        same(ticket.project_ids, input.identity.project_ids) &&
        ticket.integrations_digest === input.identity.integrations_digest &&
        ticket.thread_id === input.nativeSessionHandle &&
        ticket.status === 'released',
    );
  const release = host.ledger.operations.find(
    (operation) =>
      operation.ticket_id === prior?.ticket_id &&
      operation.kind === 'release' &&
      operation.thread_id === input.nativeSessionHandle,
  );
  const oldClaim = host.ledger.claims.find(
    (claim) => claim.ticket_id === prior?.ticket_id && claim.status === 'released',
  );
  requireResume(
    prior &&
      release &&
      oldClaim &&
      prior.source_revision === input.sourceDigest &&
      prior.exclusive_resources.every((resource) => work.binding.allowed_resources.includes(resource)) &&
      prior.exclusive_resources.every((resource) => resource.startsWith('file:')),
    'no exact owner-attributed released ticket is available',
  );
  const contenders = host.ledger.tickets.filter(
    (ticket) =>
      ticket.ticket_id !== prior.ticket_id &&
      ['active', 'queued', 'ready_for_handoff', 'blocked'].includes(ticket.status) &&
      ticket.exclusive_resources.some((resource) => prior.exclusive_resources.includes(resource)),
  );
  requireResume(contenders.length === 0, 'overlapping earlier owner must be queued or reconciled');
  const now = input.now ?? new Date().toISOString();
  requireResume(Number.isFinite(Date.parse(now)), 'resume timestamp invalid');
  const sequence = host.ledger.next_sequence;
  const generation = host.ledger.open_generation;
  const ticketId =
    'ticket-' +
    canonicalJsonDigest({
      identity: input.identity,
      nativeSessionHandle: input.nativeSessionHandle,
      sequence,
      generation,
    }).slice(0, 40);
  const claimId = 'claim-' + canonicalJsonDigest({ ticketId, source: input.sourceDigest }).slice(0, 40);
  const expiry = new Date(Date.parse(now) + 60 * 60 * 1000).toISOString();
  const resources = [...prior.exclusive_resources];
  const ticket = {
    ...prior,
    ticket_id: ticketId,
    generation,
    sequence,
    status: 'active' as const,
    claim_ids: [claimId],
    expires_at: expiry,
    active_resources: resources,
    blocked_resources: [],
    created_at: now,
  };
  const claim = {
    ...oldClaim,
    claim_id: claimId,
    ticket_id: ticketId,
    generation,
    status: 'active' as const,
    lease_expires_at: expiry,
    created_at: now,
    renewed_at: now,
  };
  const nextWork = {
    ...work,
    revision: work.revision + 1,
    lease: { ticket_id: ticketId, thread_id: input.nativeSessionHandle, generation },
    execution: { ...work.execution, status: 'active' as const, phase: 'implementation' },
    lifecycle: {
      ...work.lifecycle,
      revision: work.lifecycle.revision + 1,
      next_action: 'Resume exact scoped work under the new source lease.',
    },
  };
  const nextLedger = {
    ...host.ledger,
    revision: host.ledger.revision + 1,
    next_sequence: sequence + 1,
    tickets: [...host.ledger.tickets, ticket],
    claims: [...host.ledger.claims, claim],
  };
  requireResume(
    same(input.ledger.resume(input.identity.work_id, input.attempt)?.version, input.expectedJournal),
    'native journal changed before exact lease resume',
  );
  const saved = input.store.compareAndSwapHostState({
    expectedWork: input.expectedWork,
    expectedLedger: input.expectedLedger,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    nextWork,
    nextLedger,
  });
  const after = input.ledger.resume(input.identity.work_id, input.attempt)?.version;
  return {
    status: same(after, input.expectedJournal) ? 'resumed' : 'inspect_required',
    ticket_id: ticketId,
    work_version: saved.workVersion!,
    ledger_version: saved.ledgerVersion!,
    journal_version: after ?? input.expectedJournal,
  };
}
