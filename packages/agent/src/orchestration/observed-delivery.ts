import z from 'zod';
import { type AgentRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import {
  prepareDeliveryInstruction,
  validateImplementationResult,
  type DeliveryEvidenceAuthority,
  type DeliveryInstruction,
  type DevelopmentTaskPacket,
  type ImplementationResult,
  type TestReceipt,
  type TesterInstruction,
  type ValidationReceipt,
} from './mastra-boundary.js';
import type { SessionBridgeObservation } from './mastra-session-bridge.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { snapshotDeclaredSources } from './scoped-source-snapshot.js';
import { sessionActionsForWave } from './session-handoff.js';

const proposalSchema = z
  .object({
    schema: z.literal('VidaDeliveryProposal/v1'),
    created: z.array(z.string().min(1).max(512)).max(512),
    modified: z.array(z.string().min(1).max(512)).max(512),
    deploy: z.array(z.string().min(1).max(512)).max(512),
    do_not_deploy: z.array(z.string().min(1).max(512)).max(512),
    destination: z.string().min(1).max(256),
    order: z.array(z.string().min(1).max(512)).max(512),
    post_deployment_checks: z.array(z.string().min(1).max(4096)).min(1).max(64),
    evidence_refs: z.array(z.string().min(1).max(512)).max(64),
  })
  .strict();

function requireDelivery(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('observed delivery: ' + message);
}

/** The agent proposes presentation facts only; the runtime derives every authority binding. */
export function parseObservedDeliveryProposal(observation: SessionBridgeObservation) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(observation.summary);
  } catch {
    throw new Error('observed delivery: proposal summary is not structured JSON');
  }
  const proposal = proposalSchema.parse(parsed);
  requireDelivery(observation.status === 'reported_complete', 'delivery preparation did not complete');
  requireDelivery(
    canonicalJsonDigest(proposal.evidence_refs) === canonicalJsonDigest(observation.evidence_refs),
    'proposal evidence references differ from report',
  );
  return proposal;
}

export function prepareObservedDeliveryInstruction(input: {
  repositoryRoot: string;
  config: AgentRuntimeConfig;
  packet: DevelopmentTaskPacket;
  implementationResult: ImplementationResult;
  journal: MastraSessionLedgerSnapshot;
  validationReceipts: readonly ValidationReceipt[];
  testerInstruction: TesterInstruction;
  testReceipt: TestReceipt;
  authority: DeliveryEvidenceAuthority;
}): DeliveryInstruction {
  const {
    repositoryRoot,
    config,
    packet,
    implementationResult,
    journal,
    validationReceipts,
    testerInstruction,
    testReceipt,
    authority,
  } = input;
  validateImplementationResult(packet, implementationResult);
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(repositoryRoot), packet.owned_paths);
  requireDelivery(
    source.digest === implementationResult.implementation_fingerprint &&
      journal.state.source_scope?.digest === source.digest &&
      journal.state.work_id === packet.work_item_id &&
      journal.state.attempt === packet.attempt,
    'source or work changed after validated implementation',
  );
  const candidates = [...journal.state.completed.flatMap((entry) => entry.items), ...journal.state.items].filter(
    (item) =>
      item.issue_id &&
      item.observation &&
      config.workflows[packet.workflow_id]?.stages.some(
        (stage) => stage.id === item.request.stage_id && stage.kind === 'deliver',
      ),
  );
  requireDelivery(candidates.length === 1, 'one persisted configured delivery proposal is required');
  const item = candidates[0]!;
  const actions = sessionActionsForWave(
    config,
    { team: packet.team_id, ...packet.work_item },
    { work_id: packet.work_item_id, attempt: packet.attempt, scope_digest: packet.source_revision },
    packet.workflow_id,
    item.request.wave_index,
    [],
  );
  const action = actions.find((candidate) => candidate.action_id === item.request.action_id);
  requireDelivery(
    action?.stage_kind === 'deliver' &&
      action.stage_id === item.request.stage_id &&
      action.role === item.request.role &&
      action.assignment_index === item.request.assignment_index &&
      item.request.run_id === journal.state.run_id &&
      item.request.workflow_id === packet.workflow_id &&
      item.request.scope_digest === packet.source_revision &&
      item.request.config_digest === runtimeConfigDigest(config) &&
      item.observation!.action_id === item.request.action_id &&
      item.observation!.issue_id === item.issue_id &&
      item.observation!.output_digest === canonicalJsonDigest(item.observation!.summary),
    'delivery proposal is not bound to the configured issued action',
  );
  const proposal = parseObservedDeliveryProposal(item.observation!);
  return prepareDeliveryInstruction(
    config,
    packet,
    {
      instruction_id:
        'delivery-' +
        canonicalJsonDigest({
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          observation_digest: item.observation!.output_digest,
          packet_digest: packet.digest,
          fingerprint: implementationResult.implementation_fingerprint,
        }).slice(0, 40),
      packet_id: packet.packet_id,
      packet_digest: packet.digest,
      implementation_fingerprint: implementationResult.implementation_fingerprint,
      implementation_result: implementationResult,
      created: proposal.created,
      modified: proposal.modified,
      deploy: proposal.deploy,
      do_not_deploy: proposal.do_not_deploy,
      destination: proposal.destination,
      order: proposal.order,
      post_deployment_checks: proposal.post_deployment_checks,
    },
    validationReceipts,
    testerInstruction,
    testReceipt,
    authority,
  );
}
