import type { AgentRuntimeConfig } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { WorkIdentity } from '../host-state.js';
import {
  applyInstructionActivationUseWriteAsync,
  prepareInstructionActivationUseWrite,
  resolveInstructionActivation,
  validateActivationUse,
  validateObservedActivationUseWritePlan,
  type ActivationUse,
} from '../research-decision.js';
import type { MastraSessionLedger, MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { currentObservedResearchBinding } from './observed-research-binding.js';

function requireActivation(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`observed research activation: ${message}`);
}

/** Reserve and persist the selected instruction set before a canonical research output is exposed. */
export async function issueObservedResearchActivation(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly ledger: MastraSessionLedger;
  readonly identity: WorkIdentity;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly actionId: string;
}): Promise<{
  readonly journal: MastraSessionLedgerSnapshot;
  readonly use: ActivationUse;
  readonly bindings: ReturnType<typeof resolveInstructionActivation>['bindings'];
}> {
  const { repositoryRoot, ledger, identity, actionId } = input;
  const item = input.journal.state.items.find((entry) => entry.request.action_id === actionId);
  const stage =
    item &&
    input.config.workflows[item.request.workflow_id]?.stages.find((entry) => entry.id === item.request.stage_id);
  const synthesis = stage?.kind === 'synthesize' && stage.produces.includes('ResearchSynthesis/v1');
  const research = stage?.kind === 'research' && stage.produces.includes('ResearchResult/v1');
  const host = ledger.hostState.readHostStateSnapshot(identity);
  requireActivation(
    (research || synthesis) && item?.issue_id && !item.observation && host.work,
    'canonical research output action must be issued, unobserved and admitted',
  );
  const current = () =>
    currentObservedResearchBinding({
      repositoryRoot,
      ledger,
      identity,
      workId: input.journal.state.work_id,
      attempt: input.journal.state.attempt,
      actionId,
    });
  const binding = current();
  const risk = host.work.lifecycle.risk;
  const phase = synthesis ? 'plan' : 'trace';
  const artifactKind = synthesis ? 'synthesis' : 'research';
  const resolution = resolveInstructionActivation(
    {
      intent: 'research_intent',
      risk,
      lane: synthesis ? 'synthesizer' : 'researcher',
      phase,
      lifecycle_phase: phase,
      contour: binding.scope_id,
      scope_id: binding.scope_id,
      work_item_id: binding.work_id,
      source_revision: binding.source_revision,
      artifact_kind: artifactKind,
      triggers: ['research_intent'],
      required_instruction_ids: [],
    },
    { root: repositoryRoot, write_cache: false },
  );
  requireActivation(
    resolution.gaps.every((gap) => !gap.blocking),
    'current instruction resolver has a blocking gap',
  );
  requireActivation(
    resolution.bindings.some(
      (entry) => entry.output_schema === (synthesis ? 'ResearchSynthesis/v1' : 'ResearchResult/v1'),
    ),
    'selected instructions do not support the configured output',
  );
  if (item.research_activation) {
    const use = validateActivationUse(item.research_activation.use);
    const plan = validateObservedActivationUseWritePlan(item.research_activation.plan);
    const expectedPath = path.posix.join(
      input.config.research_decision.paths.activation_history,
      binding.work_id,
      'instruction-activation-history.jsonl',
    );
    requireActivation(
      plan.history_path === expectedPath &&
        canonicalJsonDigest(plan.binding) === canonicalJsonDigest(binding) &&
        plan.use_digest === use.digest,
      'existing research activation differs from current binding',
    );
    const history = requireSafeRepositoryAccess(repositoryRoot).readText(
      plan.history_path,
      'research activation replay',
    );
    const lines = history.split('\n');
    requireActivation(lines.at(-1) === '', 'existing research activation history is not framed');
    let offset = 0;
    let committed = false;
    for (const line of lines.slice(0, -1)) {
      const before = history.slice(0, offset);
      offset += line.length + 1;
      const entry = validateActivationUse(JSON.parse(line));
      if (entry.use_id !== use.use_id) continue;
      const sha = (text: string) => createHash('sha256').update(text).digest('hex');
      committed =
        entry.digest === use.digest &&
        (plan.history_pre_sha256 === null ? before === '' : sha(before) === plan.history_pre_sha256) &&
        sha(history.slice(0, offset)) === plan.history_sha256;
      break;
    }
    requireActivation(committed, 'existing research activation write is not committed');
    return { journal: input.journal, use, bindings: resolution.bindings };
  }
  const body = {
    schema: 'InstructionActivationUse/v1' as const,
    use_id:
      ledger.replacementDispatch(binding.work_id, binding.attempt, actionId) ||
      ledger.synthesisCorrection(binding.work_id, binding.attempt, actionId)
        ? `${artifactKind}-${actionId}-${item.issue_id}`
        : `${artifactKind}-${actionId}`,
    work_item_id: binding.work_id,
    source_revision: binding.source_revision,
    scope_id: binding.scope_id,
    risk,
    phase,
    lane: synthesis ? 'synthesizer' : 'researcher',
    trigger: 'research_intent',
    required_instruction_ids: [],
    instruction_ids: resolution.deterministic_order,
    registry_digest: resolution.registry_digest,
    source_digests: resolution.bindings.map((entry) => ({
      instruction_id: entry.instruction_id,
      source_sha256: entry.source_sha256,
    })),
    cache_status: resolution.cache_status,
    actor: 'local-session:' + canonicalJsonDigest(binding.lease_thread_id),
    pointer: `${input.config.control.work_root}/session-handoff.v1.sqlite`,
    timestamp: new Date().toISOString(),
  };
  const use: ActivationUse = { ...body, digest: canonicalJsonDigest(body) };
  const plan = await prepareInstructionActivationUseWrite({
    root: repositoryRoot,
    use,
    binding,
    host_state: ledger.hostState,
    readCurrent: current,
  });
  const journal = ledger.reserveResearchActivation(
    binding.work_id,
    binding.attempt,
    input.journal.version,
    actionId,
    use,
    plan,
  );
  const persisted = journal.state.items.find((entry) => entry.request.action_id === actionId)?.research_activation;
  requireActivation(
    persisted && persisted.plan.digest === plan.digest && persisted.use.digest === use.digest,
    'activation reservation was not persisted',
  );
  await applyInstructionActivationUseWriteAsync({
    root: repositoryRoot,
    use: persisted.use,
    plan: persisted.plan,
    binding,
    host_state: ledger.hostState,
    readCurrent: current,
  });
  return { journal, use: persisted.use, bindings: resolution.bindings };
}
