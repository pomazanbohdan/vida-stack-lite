import assert from 'node:assert/strict';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import type {
  HostStateSnapshot,
  WorkflowAttemptReconciliationAuthorization,
  WorkflowAttemptReconciliationRequest,
} from '../../src/host-state.ts';

/** Unit verifier response from exact persisted operands; not a provider attestation. */
export function createWorkflowReconciliationAuthorization(
  principal: string,
  request: WorkflowAttemptReconciliationRequest,
  state: HostStateSnapshot,
): WorkflowAttemptReconciliationAuthorization {
  const work = state.work;
  assert.ok(
    work && state.ledger && state.workVersion && state.ledgerVersion,
    'Reconciliation fixture has no complete persisted Host snapshot.',
  );
  const attempt = work.execution.assignment_attempts.find((entry) => entry.attempt_id === request.attemptId);
  assert.ok(attempt, 'Reconciliation fixture has no matching Host attempt.');
  return {
    schema: 'WorkflowAttemptReconciliationAuthorization/v1',
    principal,
    work_binding_digest: canonicalJsonDigest(work.binding),
    work_version: request.expectedWork,
    ledger_version: request.expectedLedger,
    attempt_id: request.attemptId,
    request_digest: attempt.request_digest,
    outcome: request.outcome,
    result_digest: request.outcome === 'completed' ? canonicalJsonDigest(request.result) : null,
    provider_evidence: request.providerEvidence,
    decision: request.decision,
    retry_lease: request.retryLease,
  };
}
