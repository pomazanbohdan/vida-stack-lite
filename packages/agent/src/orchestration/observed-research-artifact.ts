import { createHash } from 'node:crypto';
import type { WorkIdentity } from '../host-state.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { readObservedResearchResult, type ResearchResult, type ResearchSynthesis } from '../research-decision.js';
import type { MastraSessionLedger } from './persistent-session-handoff.js';
import { currentObservedResearchBinding } from './observed-research-binding.js';

function requireArtifact(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`observed research artifact: ${message}`);
}

/** Admit the exact target and reserved lineage event through the guarded reader, with a current live work lease. */
export async function commitObservedResearchArtifact(input: {
  readonly repositoryRoot: string;
  readonly ledger: MastraSessionLedger;
  readonly identity: WorkIdentity;
  readonly workId: string;
  readonly attempt: number;
  readonly actionId: string;
  readonly result: ResearchResult | ResearchSynthesis;
}): Promise<void> {
  const binding = currentObservedResearchBinding(input);
  const journal = input.ledger.resume(input.workId, input.attempt);
  const item = journal?.state.items.find((entry) => entry.request.action_id === input.actionId);
  const plan = item?.research_normalization;
  requireArtifact(
    item?.observation &&
      plan &&
      item.research_activation &&
      plan.binding.action_id === binding.action_id &&
      plan.binding.issue_id === binding.issue_id &&
      plan.binding.lease_ticket_id === binding.lease_ticket_id &&
      plan.binding.lease_generation === binding.lease_generation &&
      plan.observation_digest === canonicalJsonDigest(item.observation) &&
      plan.result_digest === input.result.digest,
    'canonical plan is missing or no longer bound to the observed action',
  );
  const access = requireSafeRepositoryAccess(input.repositoryRoot);
  const recordBytes = access.readBytes(plan.record_path, 'observed canonical research record');
  const sha = (value: Buffer) => createHash('sha256').update(value).digest('hex');
  requireArtifact(sha(recordBytes) === plan.record_sha256, 'canonical record pair differs from committed plan');
  const readCurrent = () => currentObservedResearchBinding(input);
  const recorded = await readObservedResearchResult({
    root: input.repositoryRoot,
    result: input.result,
    observation: item.observation,
    binding,
    host_state: input.ledger.hostState,
    readCurrent,
    plan,
    activation_use: item.research_activation.use,
    activation_plan: item.research_activation.plan,
  });
  requireArtifact(
    canonicalJsonDigest(recorded) === canonicalJsonDigest(input.result),
    'current typed research record differs from observed result',
  );
  const host = input.ledger.hostState.readHostStateSnapshot(input.identity);
  requireArtifact(host.work && host.ledger && host.workVersion && host.ledgerVersion, 'admitted work state is missing');
  const lease = host.work.lease;
  const claim = host.ledger.claims.find(
    (entry) =>
      entry.ticket_id === lease?.ticket_id &&
      entry.work_id === binding.work_id &&
      entry.thread_id === lease?.thread_id &&
      entry.generation === lease?.generation,
  );
  const ticket = host.ledger.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
  requireArtifact(
    lease?.ticket_id === binding.lease_ticket_id &&
      lease.thread_id === binding.lease_thread_id &&
      lease.generation === binding.lease_generation &&
      claim?.status === 'active' &&
      ticket?.status === 'active' &&
      host.work.binding.work_source_revision === binding.source_revision &&
      host.work.binding.config_digest === binding.config_digest,
    'research lease changed before artifact admission',
  );
  requireArtifact(
    canonicalJsonDigest(currentObservedResearchBinding(input)) === canonicalJsonDigest(binding) &&
      canonicalJsonDigest(plan.binding) === canonicalJsonDigest(binding),
    'research lease or issued binding changed before artifact admission',
  );
  const artifact = {
    artifact_id: input.result.schema === 'ResearchResult/v1' ? input.result.result_id : input.result.bundle_id,
    schema: input.result.schema,
    path: plan.record_path,
    sha256: plan.record_sha256,
    stage_id: item.request.stage_id,
    source_revision: binding.source_revision,
    scope_id: binding.scope_id,
    ac_ids: input.result.ac_ids,
  };
  const prior = host.work.artifacts.find((entry) => entry.artifact_id === artifact.artifact_id);
  if (prior) {
    requireArtifact(
      canonicalJsonDigest(prior) === canonicalJsonDigest(artifact),
      'admitted research artifact replay differs',
    );
    return;
  }
  input.ledger.hostState.compareAndSwapHostState({
    expectedWork: host.workVersion,
    expectedLedger: host.ledgerVersion,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    nextWork: {
      ...host.work,
      revision: host.work.revision + 1,
      lifecycle: { ...host.work.lifecycle, revision: host.work.revision + 1 },
      artifacts: [...host.work.artifacts, artifact],
    },
    nextLedger: { ...host.ledger, revision: host.ledger.revision + 1 },
  });
  currentObservedResearchBinding(input);
}
