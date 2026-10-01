import { type AgentRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { HostStateSnapshot } from '../host-state.js';
import { buildImplementationResult, type DevelopmentTaskPacket, type ImplementationResult } from './mastra-boundary.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { snapshotDeclaredSources } from './scoped-source-snapshot.js';
import { sessionActionsForWave } from './session-handoff.js';
import { validateWorkSessionBinding } from './final-assurance.js';

function requireResult(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('admitted implementation result: ' + message);
}

/** The result binds the observed native write to current scoped bytes; tests are proved later. */
export function buildAdmittedImplementationResult(input: {
  repositoryRoot: string;
  config: AgentRuntimeConfig;
  packet: DevelopmentTaskPacket;
  host: HostStateSnapshot;
  ledger: MastraSessionLedgerSnapshot;
}): ImplementationResult {
  const { repositoryRoot, config, packet, host, ledger } = input;
  const work = host.work;
  requireResult(
    work !== null &&
      work.binding.lifecycle_work_id === packet.work_item_id &&
      work.binding.work_source_revision === packet.source_revision &&
      work.binding.config_digest === runtimeConfigDigest(config) &&
      ledger.state.work_id === packet.work_item_id &&
      ledger.state.attempt === packet.attempt &&
      ledger.version.digest === canonicalJsonDigest(ledger.state),
    'admitted work or persisted run differs from packet',
  );
  validateWorkSessionBinding(work,ledger.state,repositoryRoot);
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(repositoryRoot), packet.owned_paths);
  requireResult(
    ledger.state.source_scope?.digest === source.digest,
    'current source differs from the last recorded scope snapshot',
  );
  const developers = ledger.state.completed
    .flatMap((wave) => wave.items)
    .filter((item) =>
      config.workflows[packet.workflow_id]?.stages.some(
        (stage) => stage.id === item.request.stage_id && stage.kind === 'develop',
      ),
    );
  requireResult(developers.length === 1, 'one completed developer assignment is required');
  const item = developers[0]!;
  const observation = item.observation;
  const reservation = item.host_reservation;
  const actions = sessionActionsForWave(
    config,
    { team: packet.team_id, ...packet.work_item },
    { work_id: packet.work_item_id, attempt: packet.attempt, scope_digest: packet.source_revision },
    packet.workflow_id,
    item.request.wave_index,
    [],
    ledger.state.corrective_execution ?? undefined,
  );
  requireResult(
    actions.some(
      (action) =>
        action.action_id === item.request.action_id &&
        action.stage_kind === 'develop' &&
        action.assignment_index === item.request.assignment_index &&
        action.role === item.request.role,
    ) &&
      item.request.config_digest === runtimeConfigDigest(config) &&
      item.request.scope_digest === packet.source_revision &&
      item.issue_id !== null &&
      observation?.issue_id === item.issue_id &&
      observation.action_id === item.request.action_id &&
      observation.status === 'reported_complete' &&
      observation.output_digest === canonicalJsonDigest(observation.summary) &&
      observation.host_attempt_id === reservation?.receipt.attempt.attempt_id &&
      Array.isArray(observation.changed_paths),
    'developer action is not a matching observed source write',
  );
  const attempt = work.execution.assignment_attempts.find((entry) => entry.attempt_id === observation.host_attempt_id);
  requireResult(
    attempt?.status === 'completed' &&
      attempt.result_digest === canonicalJsonDigest(observation) &&
      attempt.stage_id === item.request.stage_id &&
      attempt.assignment_index === item.request.assignment_index,
    'native attempt is not durably completed',
  );
  const changedPaths = [...observation.changed_paths].sort();
  requireResult(
    new Set(changedPaths).size === changedPaths.length &&
      changedPaths.every((entry) => packet.owned_paths.includes(entry)),
    'observed changed paths exceed packet ownership',
  );
  return buildImplementationResult(packet, {
    result_id:
      'implementation-' +
      canonicalJsonDigest({
        packet_digest: packet.digest,
        action_id: item.request.action_id,
        host_attempt_id: attempt.attempt_id,
      }).slice(0, 40),
    packet_id: packet.packet_id,
    source_revision: packet.source_revision,
    implementation_fingerprint: source.digest,
    changed_paths: changedPaths,
    test_refs: [],
  });
}
