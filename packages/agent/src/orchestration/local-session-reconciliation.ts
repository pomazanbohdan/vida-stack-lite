import { createHash } from 'node:crypto';
import z from 'zod';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type {
  ContractReference,
  HostStateStore,
  WorkflowAttemptReconciliationVerifier,
  WorkflowAttemptReconciliationRequest,
} from '../host-state.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { snapshotDeclaredSources } from './scoped-source-snapshot.js';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const proofSchema = z
  .object({
    schema: z.literal('LocalSessionNoEffectEvidence/v1'),
    work_id: z.string().min(1).max(256),
    attempt: z.number().int().positive(),
    action_id: hash,
    host_attempt_id: z.string().min(1).max(256),
    request_digest: hash,
    workflow_id: z.string().min(1).max(256),
    config_digest: hash,
    scope_digest: hash,
    source_snapshot_digest: hash,
    native_session_handle: z.string().min(1).max(256),
    successor_session_handle: z.string().min(1).max(256),
    ticket_id: z.string().min(1).max(256),
    lease_generation: z.number().int().positive(),
    // A positive, attributable inspection statement is required. The absence of
    // an issue ID or a file change is not proof that the native action was idle.
    native_inspection_ref: z.string().min(1).max(1024),
    decision_path: z.string().min(1).max(2048),
    inspected_by: z.string().min(1).max(256),
    inspected_at: z.string().datetime(),
    finding: z.literal('confirmed_not_invoked_and_quiescent'),
  })
  .strict();
export type LocalSessionNoEffectEvidence = z.infer<typeof proofSchema>;
const decisionSchema = z
  .object({
    schema: z.literal('WorkflowAttemptRecoveryDecision/v1'),
    work_id: z.string().min(1),
    work_item_id: z.string().min(1),
    source_revision: z.string().min(1),
    scope_id: z.string().min(1),
    ac_ids: z.array(z.string().min(1)),
    action_id: hash,
    host_attempt_id: z.string().min(1),
    provider_evidence: z
      .object({ schema: z.literal('LocalSessionNoEffectEvidence/v1'), path: z.string().min(1), sha256: hash })
      .strict(),
    outcome: z.literal('no_effect'),
    retry_lease: z
      .object({ ticket_id: z.string().min(1), thread_id: z.string().min(1), generation: z.number().int().min(2) })
      .strict(),
    decided_by: z.string().min(1),
    decided_at: z.string().datetime(),
    reason: z.string().min(1),
  })
  .strict();

function readProof(root: string, relativePath: string) {
  const bytes = requireSafeRepositoryAccess(root).readBytes(relativePath, 'local session reconciliation evidence');
  if (bytes.length > 32768) throw new Error('local reconciliation evidence exceeds limit');
  const proof = proofSchema.parse(JSON.parse(bytes.toString('utf8')));
  const ref: ContractReference = {
    schema: proof.schema,
    path: relativePath,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  if (proof.decision_path === relativePath) throw new Error('local reconciliation decision must have its own path');
  const decisionBytes = requireSafeRepositoryAccess(root).readBytes(
    proof.decision_path,
    'local session reconciliation decision',
  );
  if (decisionBytes.length > 32768) throw new Error('local reconciliation decision exceeds limit');
  const decision = decisionSchema.parse(JSON.parse(decisionBytes.toString('utf8')));
  const decisionRef: ContractReference = {
    schema: decision.schema,
    path: proof.decision_path,
    sha256: createHash('sha256').update(decisionBytes).digest('hex'),
  };
  if (
    canonicalJsonDigest(decision.provider_evidence) !== canonicalJsonDigest(ref) ||
    decision.action_id !== proof.action_id ||
    decision.host_attempt_id !== proof.host_attempt_id ||
    decision.work_id !== proof.work_id ||
    decision.decided_by !== proof.inspected_by ||
    decision.retry_lease.ticket_id !== proof.ticket_id ||
    decision.retry_lease.thread_id !== proof.successor_session_handle ||
    decision.retry_lease.generation !== proof.lease_generation + 1
  )
    throw new Error('operational recovery decision differs from the inspected no-effect evidence');
  return { proof, ref, decision, decisionRef };
}

/** Only a current, attributable no-dispatch inspection can authorize a retry fence. */
export function createLocalSessionReconciliationVerifier(root: string): WorkflowAttemptReconciliationVerifier {
  const principal = 'trusted-local-session-no-effect';
  return {
    principal,
    verify: (request, state) => {
      if (
        request.outcome !== 'no_effect' ||
        request.result !== null ||
        !request.decision ||
        request.decision.schema !== 'WorkflowAttemptRecoveryDecision/v1' ||
        request.decision.path === request.providerEvidence.path ||
        request.decision.sha256 === request.providerEvidence.sha256
      )
        return null;
      const work = state.work;
      if (
        !work ||
        !work.lease ||
        !state.ledger ||
        !work.contracts.decisions.some((ref) => canonicalJsonDigest(ref) === canonicalJsonDigest(request.decision))
      )
        return null;
      let bound;
      try {
        bound = readProof(root, request.providerEvidence.path);
      } catch {
        return null;
      }
      const { proof, ref, decision, decisionRef } = bound;
      const attempt = work.execution.assignment_attempts.find((item) => item.attempt_id === request.attemptId);
      const ticket = state.ledger.tickets.find((item) => item.ticket_id === work.lease?.ticket_id);
      const claim = state.ledger.claims.find(
        (item) => item.ticket_id === work.lease?.ticket_id && item.status === 'active',
      );
      if (
        !attempt ||
        !ticket ||
        !claim ||
        ticket.status !== 'active' ||
        ticket.expires_at === null ||
        Date.parse(ticket.expires_at) <= Date.now() ||
        Date.parse(claim.lease_expires_at) <= Date.now() ||
        canonicalJsonDigest(ref) !== canonicalJsonDigest(request.providerEvidence) ||
        canonicalJsonDigest(decisionRef) !== canonicalJsonDigest(request.decision) ||
        decision.work_item_id !== work.binding.provider_work_item_id ||
        decision.source_revision !== work.binding.work_source_revision ||
        decision.scope_id !== work.binding.scope_id ||
        canonicalJsonDigest([...decision.ac_ids].sort()) !== canonicalJsonDigest([...work.binding.ac_ids].sort()) ||
        proof.work_id !== request.identity.work_id ||
        proof.host_attempt_id !== attempt.attempt_id ||
        proof.request_digest !== attempt.request_digest ||
        proof.workflow_id !== work.binding.workflow_id ||
        proof.config_digest !== work.binding.config_digest ||
        proof.scope_digest !== work.binding.work_source_revision ||
        proof.native_session_handle !== attempt.lease.thread_id ||
        proof.ticket_id !== attempt.lease.ticket_id ||
        proof.lease_generation !== attempt.lease.generation ||
        proof.inspected_by !== proof.native_session_handle ||
        canonicalJsonDigest(work.lease) !== canonicalJsonDigest(attempt.lease) ||
        canonicalJsonDigest(request.retryLease) !==
          canonicalJsonDigest({
            ...attempt.lease,
            thread_id: proof.successor_session_handle,
            generation: attempt.lease.generation + 1,
          })
      )
        return null;
      return {
        schema: 'WorkflowAttemptReconciliationAuthorization/v1',
        principal,
        work_binding_digest: canonicalJsonDigest(work.binding),
        work_version: request.expectedWork,
        ledger_version: request.expectedLedger,
        attempt_id: attempt.attempt_id,
        request_digest: attempt.request_digest,
        outcome: 'no_effect',
        result_digest: null,
        provider_evidence: request.providerEvidence,
        decision: request.decision,
        retry_lease: request.retryLease,
      };
    },
  };
}

export async function reconcileUnissuedLocalSessionAction(input: {
  root: string;
  proofPath: string;
  store: HostStateStore;
  identity: WorkflowAttemptReconciliationRequest['identity'];
  journal: MastraSessionLedgerSnapshot;
  configDigest: string;
}) {
  const { proof, ref, decision, decisionRef } = readProof(input.root, input.proofPath);
  const item = input.journal.state.items.find((entry) => entry.request.action_id === proof.action_id);
  let host = input.store.readHostStateSnapshot(input.identity);
  const work = host.work;
  const attempt = work?.execution.assignment_attempts.find((entry) => entry.attempt_id === proof.host_attempt_id);
  if (
    !item ||
    item.issue_id !== null ||
    item.observation !== null ||
    !work ||
    !attempt ||
    !host.ledger ||
    !host.workVersion ||
    !host.ledgerVersion ||
    !work.lease ||
    item.request.stage_id !== attempt.stage_id ||
    item.request.assignment_index !== attempt.assignment_index ||
    proof.work_id !== work.binding.lifecycle_work_id ||
    proof.attempt !== input.journal.state.attempt ||
    proof.workflow_id !== work.binding.workflow_id ||
    proof.config_digest !== input.configDigest ||
    proof.scope_digest !== work.binding.work_source_revision ||
    proof.source_snapshot_digest !== input.journal.state.source_scope?.digest ||
    proof.native_session_handle !== attempt.lease.thread_id ||
    proof.ticket_id !== attempt.lease.ticket_id ||
    proof.lease_generation !== attempt.lease.generation ||
    proof.request_digest !== attempt.request_digest ||
    decision.work_item_id !== work.binding.provider_work_item_id ||
    decision.source_revision !== work.binding.work_source_revision ||
    decision.scope_id !== work.binding.scope_id ||
    canonicalJsonDigest([...decision.ac_ids].sort()) !== canonicalJsonDigest([...work.binding.ac_ids].sort()) ||
    proof.inspected_by !== proof.native_session_handle ||
    canonicalJsonDigest(work.lease) !== canonicalJsonDigest(attempt.lease)
  )
    throw new Error('local no-effect evidence does not bind the unissued host attempt');
  const scoped = input.journal.state.source_scope;
  if (
    !scoped ||
    snapshotDeclaredSources(
      requireSafeRepositoryAccess(input.root),
      scoped.entries.map((entry) => entry.path),
    ).digest !== scoped.digest
  )
    throw new Error('source scope changed before local no-effect reconciliation');
  if (attempt.status !== 'started' && attempt.status !== 'uncertain' && attempt.status !== 'no_effect')
    throw new Error('host attempt is not eligible for no-effect reconciliation');
  if (!work.contracts.decisions.some((entry) => entry.path === decisionRef.path)) {
    const nextWork = {
      ...work,
      revision: work.revision + 1,
      contracts: { ...work.contracts, decisions: [...work.contracts.decisions, decisionRef] },
      lifecycle: { ...work.lifecycle, revision: work.revision + 1 },
    };
    host = input.store.compareAndSwapHostState({
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedMaintenanceGeneration: host.maintenanceGeneration,
      nextWork,
      nextLedger: { ...host.ledger, revision: host.ledger.revision + 1 },
    });
  } else if (!work.contracts.decisions.some((entry) => canonicalJsonDigest(entry) === canonicalJsonDigest(decisionRef)))
    throw new Error('local reconciliation decision path already binds different evidence');
  const retryLease = {
    ...attempt.lease,
    thread_id: proof.successor_session_handle,
    generation: attempt.lease.generation + 1,
  };
  if (attempt.status !== 'no_effect') {
    await input.store.reconcileWorkflowAttempt({
      identity: input.identity,
      expectedWork: host.workVersion!,
      expectedLedger: host.ledgerVersion!,
      expectedMaintenanceGeneration: host.maintenanceGeneration,
      attemptId: attempt.attempt_id,
      outcome: 'no_effect',
      result: null,
      providerEvidence: ref,
      decision: decisionRef,
      retryLease,
    });
    host = input.store.readHostStateSnapshot(input.identity);
  } else if (canonicalJsonDigest(attempt.reconciliation?.provider_evidence) !== canonicalJsonDigest(ref))
    throw new Error('no-effect attempt was reconciled using different evidence');
  if (canonicalJsonDigest(host.work!.lease) === canonicalJsonDigest(retryLease)) return host;
  const ticket = host.ledger!.tickets.find((entry) => entry.ticket_id === retryLease.ticket_id);
  const claim = host.ledger!.claims.find(
    (entry) => entry.ticket_id === retryLease.ticket_id && entry.status === 'active',
  );
  if (
    !ticket ||
    !claim ||
    ticket.thread_id !== attempt.lease.thread_id ||
    claim.thread_id !== attempt.lease.thread_id ||
    ticket.generation !== attempt.lease.generation ||
    claim.generation !== attempt.lease.generation
  )
    throw new Error('cooperative lease changed before retry fence renewal');
  return input.store.compareAndSwapHostState({
    expectedWork: host.workVersion,
    expectedLedger: host.ledgerVersion,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    nextWork: {
      ...host.work!,
      revision: host.work!.revision + 1,
      lifecycle: { ...host.work!.lifecycle, revision: host.work!.revision + 1 },
      lease: retryLease,
    },
    nextLedger: {
      ...host.ledger!,
      revision: host.ledger!.revision + 1,
      tickets: host.ledger!.tickets.map((entry) =>
        entry.ticket_id === retryLease.ticket_id
          ? { ...entry, thread_id: retryLease.thread_id, generation: retryLease.generation }
          : entry,
      ),
      claims: host.ledger!.claims.map((entry) =>
        entry.claim_id === claim.claim_id
          ? {
              ...entry,
              thread_id: retryLease.thread_id,
              generation: retryLease.generation,
              renewed_at: new Date().toISOString(),
            }
          : entry,
      ),
    },
  });
}
