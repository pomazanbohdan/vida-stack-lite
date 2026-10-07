import z from 'zod';
import { type AgentRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import {
  buildTesterInstruction,
  validateImplementationResult,
  type DeliveryEvidenceAuthority,
  type DevelopmentTaskPacket,
  type ImplementationResult,
  type TestReceipt,
  type TesterInstruction,
} from './mastra-boundary.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { snapshotAdmittedTaskSources, snapshotDeclaredSources } from './scoped-source-snapshot.js';
import { sessionActionsForWave } from './session-handoff.js';
import { validateWorkSessionBinding } from './final-assurance.js';
import type { HostStateSnapshot, HostStateStore } from '../host-state.js';
import type { SessionBridgeObservation } from './mastra-session-bridge.js';
import { observedReceiptEvidenceReference, validateObservedEvidenceReferences } from './observed-receipt-evidence.js';

const testVerdictSchema = z
  .object({
    schema: z.literal('VidaTesterVerdict/v1'),
    status: z.enum(['pass', 'fail']),
    evidence_refs: z.array(z.string().min(1).max(512)).min(1).max(64),
  })
  .strict();

function requireTest(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('observed testing: ' + message);
}

export function parseObservedTesterVerdict(observation: SessionBridgeObservation) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(observation.summary);
  } catch {
    throw new Error('observed testing: tester summary is not structured JSON');
  }
  const verdict = testVerdictSchema.parse(parsed);
  requireTest(
    canonicalJsonDigest(verdict.evidence_refs) === canonicalJsonDigest(observation.evidence_refs),
    'tester evidence references differ from observed report',
  );
  requireTest(
    (verdict.status === 'pass') === (observation.status === 'reported_complete'),
    'tester status differs from structured verdict',
  );
  validateObservedEvidenceReferences(verdict.evidence_refs);
  return verdict;
}

export function buildObservedTesterInstruction(
  packet: DevelopmentTaskPacket,
  implementationResult: ImplementationResult,
): TesterInstruction {
  validateImplementationResult(packet, implementationResult);
  return buildTesterInstruction(
    packet,
    'test-instruction-' +
      canonicalJsonDigest({
        packet_digest: packet.digest,
        fingerprint: implementationResult.implementation_fingerprint,
      }).slice(0, 40),
    implementationResult.implementation_fingerprint,
  );
}

export interface ObservedTestEvidenceClassification {
  readonly classification: 'caller_report_consistency';
  readonly test_execution_verified: false;
}

const observedTestEvidenceClassification: ObservedTestEvidenceClassification = Object.freeze({
  classification: 'caller_report_consistency',
  test_execution_verified: false,
});

/** Reissues in-memory authority only from the exact persisted native tester observation. */
export function issueObservedTestReceipt(input: {
  repositoryRoot: string;
  config: AgentRuntimeConfig;
  packet: DevelopmentTaskPacket;
  implementationResult: ImplementationResult;
  journal: MastraSessionLedgerSnapshot;
  authority: DeliveryEvidenceAuthority;
  host?: HostStateSnapshot;
  sourceStore?: Pick<HostStateStore, 'snapshotCurrentTaskSourceSources'>;
}): {
  instruction: TesterInstruction;
  receipt: TestReceipt;
  evidence: ObservedTestEvidenceClassification;
} {
  const { repositoryRoot, config, packet, implementationResult, journal, authority } = input;
  requireTest(
    Object.keys(input).every((key) =>
      ['repositoryRoot', 'config', 'packet', 'implementationResult', 'journal', 'authority', 'host'].includes(key),
    ),
    'test evidence classification is runtime-derived and caller fields are closed',
  );
  if (journal.state.corrective_execution) {
    requireTest(input.host?.work, 'corrective test receipt requires current Host binding');
    validateWorkSessionBinding(input.host.work, journal.state, repositoryRoot);
  }
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
  requireTest(
    source.digest === implementationResult.implementation_fingerprint &&
      journal.state.source_scope?.digest === source.digest &&
      journal.state.work_id === packet.work_item_id &&
      journal.state.attempt === packet.attempt,
    'source or work changed after implementation evidence',
  );
  const completed = journal.state.completed.flatMap((entry) => entry.items);
  const testItems = completed.filter((item) =>
    config.workflows[packet.workflow_id]?.stages.some(
      (stage) => stage.id === item.request.stage_id && stage.kind === 'test',
    ),
  );
  requireTest(testItems.length === 1, 'one completed configured tester is required');
  const item = testItems[0]!;
  const actions = sessionActionsForWave(
    config,
    { team: packet.team_id, ...packet.work_item },
    { work_id: packet.work_item_id, attempt: packet.attempt, scope_digest: packet.source_revision },
    packet.workflow_id,
    item.request.wave_index,
    [],
    journal.state.corrective_execution ?? undefined,
  );
  const action = actions.find((candidate) => candidate.action_id === item.request.action_id);
  requireTest(
    action?.stage_kind === 'test' &&
      action.role === item.request.role &&
      action.stage_id === item.request.stage_id &&
      action.assignment_index === item.request.assignment_index &&
      item.request.config_digest === runtimeConfigDigest(config) &&
      item.request.scope_digest === packet.source_revision &&
      item.request.run_id === journal.state.run_id &&
      item.issue_id !== null &&
      item.observation?.issue_id === item.issue_id &&
      item.observation.action_id === item.request.action_id &&
      item.observation.output_digest === canonicalJsonDigest(item.observation.summary),
    'tester action is not a matching persisted observation',
  );
  const verdict = parseObservedTesterVerdict(item.observation);
  const instruction = buildObservedTesterInstruction(packet, implementationResult);
  const receipt = authority.issueTestReceipt({
    receipt_id:
      'test-' +
      canonicalJsonDigest({
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        observation_digest: item.observation.output_digest,
        instruction_digest: instruction.digest,
      }).slice(0, 40),
    instruction_id: instruction.instruction_id,
    packet_id: packet.packet_id,
    packet_digest: packet.digest,
    implementation_fingerprint: implementationResult.implementation_fingerprint,
    status: verdict.status,
    evidence_refs: [observedReceiptEvidenceReference(journal, item.request.action_id, item.observation.output_digest)],
  });
  return { instruction, receipt, evidence: observedTestEvidenceClassification };
}
