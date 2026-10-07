import z from 'zod';
import { type AgentRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { snapshotAdmittedTaskSources, snapshotDeclaredSources } from './scoped-source-snapshot.js';
import { sessionActionsForWave } from './session-handoff.js';
import { validateWorkSessionBinding } from './final-assurance.js';
import type { HostStateSnapshot, HostStateStore } from '../host-state.js';
import {
  validateImplementationResult,
  type DeliveryEvidenceAuthority,
  type DevelopmentTaskPacket,
  type ImplementationResult,
  type ValidationReceipt,
} from './mastra-boundary.js';
import type { SessionBridgeObservation, SessionBridgeRequest } from './mastra-session-bridge.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { observedReceiptEvidenceReference, validateObservedEvidenceReferences } from './observed-receipt-evidence.js';

const verdictSchema = z
  .object({
    schema: z.literal('VidaValidatorVerdict/v1'),
    verdict: z.enum(['pass', 'fail']),
    findings: z.array(z.string().min(1).max(4096)).max(64),
    evidence_refs: z.array(z.string().min(1).max(512)).min(1).max(64),
  })
  .strict();

export type ObservedValidatorVerdict = z.infer<typeof verdictSchema>;

function requireValidation(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('observed validation: ' + message);
}

/** Agent text is evidence data; it cannot select the validator role, packet, or source fingerprint. */
export function parseObservedValidatorVerdict(observation: SessionBridgeObservation): ObservedValidatorVerdict {
  let parsed: unknown;
  try {
    parsed = JSON.parse(observation.summary);
  } catch {
    throw new Error('observed validation: validator summary is not structured JSON');
  }
  const verdict = verdictSchema.parse(parsed);
  requireValidation(
    canonicalJsonDigest(verdict.evidence_refs) === canonicalJsonDigest(observation.evidence_refs),
    'validator evidence references differ from the observed report',
  );
  requireValidation(
    (verdict.verdict === 'pass') === (observation.status === 'reported_complete'),
    'validator status differs from structured verdict',
  );
  validateObservedEvidenceReferences(verdict.evidence_refs);
  return verdict;
}

export function issueObservedValidationReceipt(input: {
  repositoryRoot: string;
  config: AgentRuntimeConfig;
  packet: DevelopmentTaskPacket;
  implementationResult: ImplementationResult;
  journal: MastraSessionLedgerSnapshot;
  actionId: string;
  authority: DeliveryEvidenceAuthority;
  host?: HostStateSnapshot;
  sourceStore?: Pick<HostStateStore, 'snapshotCurrentTaskSourceSources'>;
}): ValidationReceipt {
  const { repositoryRoot, config, packet, implementationResult, journal, actionId, authority } = input;
  if (journal.state.corrective_execution) {
    requireValidation(input.host?.work, 'corrective receipt requires current Host binding');
    validateWorkSessionBinding(input.host.work, journal.state, repositoryRoot);
  }
  const matches = journal.state.completed
    .flatMap((entry) => entry.items)
    .filter((item) => item.request.action_id === actionId && item.issue_id && item.observation);
  requireValidation(matches.length === 1, 'validator has no unique persisted observation');
  const item = matches[0]!;
  const request: SessionBridgeRequest = item.request;
  const issueId = item.issue_id!;
  const observation: SessionBridgeObservation = item.observation!;
  requireValidation(
    journal.state.work_id === packet.work_item_id &&
      journal.state.attempt === packet.attempt &&
      journal.state.run_id === request.run_id &&
      journal.state.source_scope?.digest === implementationResult.implementation_fingerprint,
    'persisted validation source or work binding differs',
  );
  requireValidation(
    packet.workflow_id === request.workflow_id && packet.source_revision === request.scope_digest,
    'packet binding differs',
  );
  validateImplementationResult(packet, implementationResult);
  const source = input.sourceStore && input.host
    ? snapshotAdmittedTaskSources({
        store: input.sourceStore,
        host: input.host,
        canonicalHostRoot: repositoryRoot,
        paths: packet.owned_paths,
        attempt: journal.state.attempt,
      })
    : snapshotDeclaredSources(requireSafeRepositoryAccess(repositoryRoot), packet.owned_paths);
  requireValidation(
    source.digest === implementationResult.implementation_fingerprint,
    'source changed after implementation evidence',
  );
  const selection = { team: packet.team_id, ...packet.work_item };
  const actions = sessionActionsForWave(
    config,
    selection,
    { work_id: packet.work_item_id, attempt: packet.attempt, scope_digest: packet.source_revision },
    packet.workflow_id,
    request.wave_index,
    [],
    journal.state.corrective_execution ?? undefined,
  );
  const action = actions.find((item) => item.action_id === request.action_id);
  requireValidation(
    action?.stage_kind === 'validate' &&
      action.produces.includes('ValidationReceipt/v1') &&
      action.stage_id === request.stage_id &&
      action.assignment_index === request.assignment_index &&
      action.role === request.role &&
      request.scope_digest === packet.source_revision &&
      request.config_digest === runtimeConfigDigest(config),
    'validator request is outside the configured stage or packet',
  );
  requireValidation(
    observation.action_id === request.action_id &&
      observation.issue_id === issueId &&
      observation.output_digest === canonicalJsonDigest(observation.summary),
    'validator observation is not bound to the issued action',
  );
  const verdict = parseObservedValidatorVerdict(observation);
  const receiptId =
    'validation-' +
    canonicalJsonDigest({
      action_id: request.action_id,
      issue_id: issueId,
      packet_digest: packet.digest,
      implementation_fingerprint: implementationResult.implementation_fingerprint,
      observation_digest: observation.output_digest,
    }).slice(0, 40);
  return authority.issueValidationReceipt({
    receipt_id: receiptId,
    packet_id: packet.packet_id,
    packet_digest: packet.digest,
    implementation_fingerprint: implementationResult.implementation_fingerprint,
    validator_role: action.role,
    verdict: verdict.verdict,
    findings: verdict.findings,
    evidence_refs: [observedReceiptEvidenceReference(journal, request.action_id, observation.output_digest)],
  });
}
