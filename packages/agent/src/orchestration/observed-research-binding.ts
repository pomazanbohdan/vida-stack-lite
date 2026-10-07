import type { WorkIdentity } from '../host-state.js';
import type { ObservedResearchBinding } from '../research-decision.js';
import { snapshotAdmittedTaskSources } from './scoped-source-snapshot.js';
import type { MastraSessionLedger } from './persistent-session-handoff.js';

function requireBinding(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`observed research binding: ${message}`);
}

/** Re-read the issued action, admitted work, live cooperative lease and exact source scope. */
export function currentObservedResearchBinding(input: {
  readonly repositoryRoot: string;
  readonly ledger: MastraSessionLedger;
  readonly identity: WorkIdentity;
  readonly workId: string;
  readonly attempt: number;
  readonly actionId: string;
}): ObservedResearchBinding {
  const journal = input.ledger.resume(input.workId, input.attempt);
  const item = journal?.state.items.find((entry) => entry.request.action_id === input.actionId);
  const host = input.ledger.hostState.readHostStateSnapshot(input.identity);
  const work = host.work;
  const lease = work?.lease;
  const ticket = host.ledger?.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
  const claim = host.ledger?.claims.find(
    (entry) =>
      entry.ticket_id === lease?.ticket_id &&
      entry.work_id === input.workId &&
      entry.thread_id === lease?.thread_id &&
      entry.generation === lease.generation &&
      entry.status === 'active',
  );
  requireBinding(
    journal &&
      item?.issue_id &&
      work &&
      lease &&
      ticket &&
      claim &&
      work.binding.lifecycle_work_id === input.workId &&
      work.binding.provider_work_item_id === input.workId &&
      work.binding.config_digest === item.request.config_digest &&
      ticket.status === 'active' &&
      ticket.thread_id === lease.thread_id &&
      ticket.generation === lease.generation &&
      ticket.source_revision === work.binding.work_source_revision &&
      Date.parse(claim.lease_expires_at) > Date.now() &&
      journal.state.source_scope &&
      journal.state.run_id === item.request.run_id &&
      item.request.scope_digest === journal.state.source_scope.digest,
    'issued action, admitted state or lease is stale',
  );
  const source = snapshotAdmittedTaskSources({
    store: input.ledger.hostState,
    host,
    canonicalHostRoot: input.repositoryRoot,
    paths: journal.state.source_scope.entries.map((entry) => entry.path),
    attempt: input.attempt,
  });
  requireBinding(
    source.digest === journal.state.source_scope.digest,
    'declared source changed before research evidence use',
  );
  return {
    work_id: input.workId,
    attempt: input.attempt,
    run_id: journal.state.run_id,
    action_id: input.actionId,
    issue_id: item.issue_id,
    scope_id: work.binding.scope_id,
    scope_digest: item.request.scope_digest,
    source_revision: work.binding.work_source_revision,
    source_scope_digest: source.digest,
    config_digest: item.request.config_digest,
    maintenance_generation: host.maintenanceGeneration,
    lease_ticket_id: lease.ticket_id,
    lease_thread_id: lease.thread_id,
    lease_generation: lease.generation,
  };
}
