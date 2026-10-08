import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { CoordinationLedger } from '../contracts/envelopes.js';
import type { WorkState } from '../host-state.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import { parseSessionBridgeObservation } from './mastra-session-bridge.js';
import type { ConfiguredFrontierReceipt } from './delivered-work-continuation-repair.js';
import { validateConfiguredFrontierReceiptStructure } from './delivered-work-continuation-repair.js';

const same = (left: unknown, right: unknown) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
function requireRecovery(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`failed prewriter recovery: ${message}`);
}

/** Validate the finite known-failed readonly case. This neither writes nor grants rights. */
export function validateFailedPrewriterRecoveryBasis(input: {
  readonly original: ConfiguredFrontierReceipt;
  readonly work: WorkState;
  readonly ledger: CoordinationLedger;
  readonly journal: MastraSessionLedgerState;
  readonly nativeSessionHandle: string;
  readonly now: number;
}): void {
  const { original, work, ledger, journal, nativeSessionHandle, now } = input;
  validateConfiguredFrontierReceiptStructure({ receipt: original });
  requireRecovery(Number.isFinite(now), 'observation time invalid');
  const identity = original.request.identity;
  requireRecovery(original.request.nativeSessionHandle === nativeSessionHandle &&
    work.workspace_id === original.prior_work.workspace_id && ledger.workspace_id === work.workspace_id &&
    same(work.binding, original.successor_binding) && same(work.contracts, original.prior_work.contracts) &&
    work.lease?.thread_id === nativeSessionHandle && work.execution.status === 'active' &&
    work.execution.phase === 'review' && work.execution.assignment_attempts.length === 0 &&
    work.lifecycle.phase === 'INTAKE' && work.lifecycle.seal === null &&
    work.lifecycle.assurance.review_generation === 0 && work.lifecycle.assurance.delivery_cycle_id === null,
  'original owner, current binding or unstarted readonly work differs');
  const ticket = ledger.tickets.find(item => item.ticket_id === work.lease!.ticket_id);
  const claims = ledger.claims.filter(item => item.ticket_id === work.lease!.ticket_id && item.status === 'active');
  const resources = ['execution:' + identity.work_id,
    ...original.prior_work.binding.implementation_paths.map(file => 'file:' + file)].sort();
  requireRecovery(ticket?.status === 'active' && ticket.thread_id === nativeSessionHandle &&
    ticket.work_id === identity.work_id && ticket.repository_id === identity.repository_id &&
    same(ticket.project_ids, identity.project_ids) && ticket.integrations_digest === identity.integrations_digest &&
    ticket.generation === work.lease!.generation && ticket.source_revision === work.binding.work_source_revision &&
    same(ticket.exclusive_resources, resources) && same(ticket.active_resources, resources) &&
    ticket.blocked_resources.length === 0 && ticket.expires_at !== null && Date.parse(ticket.expires_at) <= now &&
    claims.length === 1 && claims[0]!.thread_id === nativeSessionHandle &&
    claims[0]!.work_id === identity.work_id && claims[0]!.generation === ticket.generation &&
    same(claims[0]!.resources, resources) && claims[0]!.lease_expires_at === ticket.expires_at,
  'exact expired full-resource ticket and claim differ');
  requireRecovery(!ledger.claims.some(item => item.ticket_id !== ticket.ticket_id && item.status === 'active' &&
    item.resources.some(resource => resources.includes(resource))) &&
    !ledger.tickets.some(item => item.ticket_id !== ticket.ticket_id &&
      (['active', 'ready_for_handoff', 'blocked'].includes(item.status) ||
        item.status === 'queued' && item.sequence < ledger.next_sequence) &&
      item.exclusive_resources.some(resource => resources.includes(resource))),
  'foreign owner or earlier FIFO contender conflicts');
  requireRecovery(journal.workspace_id === work.workspace_id && journal.work_id === identity.work_id &&
    journal.attempt === original.attempt && journal.run_id === work.execution.run_id &&
    journal.run_id === original.successor_journal.run_id &&
    work.execution.run_id === original.successor_work.execution.run_id &&
    journal.step_id === original.successor_journal.step_id &&
    same(journal.source_scope, original.request.currentSourceScope) &&
    same(journal.completed, original.prior_journal.completed) &&
    journal.corrective_execution == null && journal.research_wave_exposure === undefined &&
    journal.items.length > 0 && journal.items.length === original.successor_journal.items.length,
  'same-attempt readonly frontier or completed prefix differs');
  for (const [index, item] of journal.items.entries()) {
    const observation = item.observation && parseSessionBridgeObservation(item.observation);
    requireRecovery(same(item.request, original.successor_journal.items[index]!.request) &&
      item.request.stage_id === 'review_source_prewrite' && item.issue_id !== null &&
      item.host_reservation === undefined && item.research_activation === undefined &&
      item.research_normalization === undefined && observation?.status === 'reported_failed' &&
      observation.action_id === item.request.action_id && observation.issue_id === item.issue_id &&
      observation.output_digest === canonicalJsonDigest(observation.summary),
    'failed cohort contains an unknown, changed or reserved action');
  }
}
