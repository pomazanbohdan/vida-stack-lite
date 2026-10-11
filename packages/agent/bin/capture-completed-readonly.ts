import {
  closeWorkspaceDatabaseWithAdmission,
  createCliHostStateStore,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.js';
import { loadProjectSetContext } from '../src/config/project-context.js';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.js';
import {
  openConfiguredMastraSessionLedger,
  mastraLedgerStatus,
  sessionHandoffDatabasePath,
  validateResearchJournalItem,
} from '../src/orchestration/persistent-session-handoff.js';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.js';
import { createSessionActionProjector } from '../src/orchestration/session-handoff.js';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
  parseSessionBridgeObservation,
  parseSessionBridgeRequest,
  parseSessionBridgeRunState,
  sessionBridgeDatabasePath,
  sessionBridgeRunId,
} from '../src/orchestration/mastra-session-bridge.js';
import { suspendCompletedReadOnlyWork } from '../src/orchestration/suspend-local-work.js';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.js';
import { parseScopedSourceSnapshot } from '../src/orchestration/scoped-source-snapshot.js';
import {
  assertAdmittedRuntimeCodeCurrent,
  readAdmittedSessionIntakeForWork,
} from '../src/orchestration/admitted-session-execution.js';
import { inspectLocalSession } from '../src/orchestration/inspect-local-session.js';
import { workflowWorkItemSchema } from '../src/orchestration/workflow-session-reservation-contract.js';
import { checkedMaintenanceFence } from '../src/host-state.js';
import { deriveWorkspaceId } from '../src/workspace-identity.js';
import { cooperativeReadonlyAssignments } from './runtime-config-rebind.ts';
import { verifyForwardCandidateAdmission } from './forward-candidate-admission.ts';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Database } from 'bun:sqlite';
import type { HostStateSnapshot, HostStateStore, StateVersion, WorkState } from '../src/host-state.js';
import type { CoordinationLedger } from '../src/contracts/envelopes.js';
import type {
  MastraLedgerItem,
  MastraSessionLedgerSnapshot,
  MastraSessionLedgerState,
} from '../src/orchestration/persistent-session-handoff.js';

const requireCapture: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw Error('completed readonly capture: ' + message);
};
type CaptureRequest = {
  work_id: string;
  project_ids: [string];
  attempt: number;
  native_session_handle: string;
  user_request_pointer: string;
  expected_work: StateVersion;
  expected_ledger: StateVersion;
  expected_journal: StateVersion;
  reports: string[];
};
type CapturedJournal = MastraSessionLedgerSnapshot;
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {unknown} value @returns {value is StateVersion} */
function isStateVersion(value: unknown): value is StateVersion {
  return (
    isRecord(value) &&
    Object.keys(value).sort().join(',') === 'digest,revision' &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) >= 0 &&
    typeof value.digest === 'string'
  );
}
/** @param {unknown} value @returns {value is CaptureRequest} */
function isCaptureRequest(value: unknown): value is CaptureRequest {
  return (
    hasCaptureRequestKeys(value) && hasCaptureIdentity(value) && hasCaptureVersions(value) && hasCaptureReports(value)
  );
}
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function hasCaptureRequestKeys(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    Object.keys(value).sort().join(',') ===
      'attempt,expected_journal,expected_ledger,expected_work,native_session_handle,project_ids,reports,user_request_pointer,work_id'
  );
}
/** @param {Record<string, unknown>} value */
function hasCaptureIdentity(value: Record<string, unknown>): boolean {
  return hasCaptureWorkIdentity(value) && hasCaptureAttribution(value);
}
/** @param {Record<string, unknown>} value */
function hasCaptureWorkIdentity(value: Record<string, unknown>): boolean {
  return (
    typeof value.work_id === 'string' &&
    /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value.work_id) &&
    isUnknownArray(value.project_ids) &&
    value.project_ids.length === 1 &&
    typeof value.project_ids[0] === 'string' &&
    Number.isSafeInteger(value.attempt) &&
    Number(value.attempt) > 0
  );
}
/** @param {Record<string, unknown>} value */
function hasCaptureAttribution(value: Record<string, unknown>): boolean {
  return (
    typeof value.native_session_handle === 'string' &&
    value.native_session_handle.trim().length > 0 &&
    typeof value.user_request_pointer === 'string' &&
    value.user_request_pointer.trim().length > 0
  );
}
/** @param {Record<string, unknown>} value */
function hasCaptureVersions(value: Record<string, unknown>): boolean {
  return (
    isStateVersion(value.expected_work) &&
    isStateVersion(value.expected_ledger) &&
    isStateVersion(value.expected_journal)
  );
}
/** @param {Record<string, unknown>} value */
function hasCaptureReports(value: Record<string, unknown>): boolean {
  return (
    isUnknownArray(value.reports) &&
    value.reports.length > 0 &&
    value.reports.length <= 32 &&
    value.reports.every((entry) => typeof entry === 'string')
  );
}
/** @param {HostStateSnapshot} snapshot @returns {asserts snapshot is HostStateSnapshot & {work: WorkState, ledger: CoordinationLedger, workVersion: StateVersion, ledgerVersion: StateVersion}} */
function requireCompleteHostSnapshot(snapshot: HostStateSnapshot): asserts snapshot is HostStateSnapshot & {
  work: WorkState;
  ledger: CoordinationLedger;
  workVersion: StateVersion;
  ledgerVersion: StateVersion;
} {
  if (!snapshot.work || !snapshot.ledger || !snapshot.workVersion || !snapshot.ledgerVersion)
    throw new Error('completed readonly capture: current Host snapshot is incomplete');
}
/** @param {unknown} value @param {number} maximum @returns {unknown[]} */
function snapshotRequests(value: unknown, maximum: number): unknown[] {
  if (!isRecord(value) || !isRecord(value.suspendPayload) || !isUnknownArray(value.suspendPayload.requests)) return [];
  requireCapture(value.suspendPayload.requests.length <= maximum, 'original suspended request collection differs');
  return value.suspendPayload.requests;
}
/** @param {Record<string, unknown>} context @param {readonly MastraLedgerItem[]} items */
function requireCurrentSnapshotFrontier(
  context: Record<string, unknown>,
  items: readonly MastraLedgerItem[],
): {
  frontier: { waveIndex: number; key: string; value: unknown };
  waves: { waveIndex: number; key: string; value: unknown }[];
  requests: ReturnType<typeof parseSessionBridgeRequest>[];
} {
  const current = new Map(items.map((item) => [item.request.action_id, item.request]));
  requireCapture(
    current.size > 0 && current.size === items.length,
    'current journal request identities are duplicated',
  );
  const waves = Object.entries(context)
    .filter(([key]) => /^wave-[0-9]+$/u.test(key))
    .map(([key, value]) => ({ waveIndex: Number(key.slice(5)), key, value }))
    .sort((left, right) => left.waveIndex - right.waveIndex);
  const frontiers = waves.filter(({ value }) => isRecord(value) && value.status === 'suspended');
  requireCapture(frontiers.length === 1, 'original suspended frontier is missing or ambiguous');
  const frontier = frontiers[0];
  requireCapture(frontier, 'original suspended frontier is missing');
  const requests = snapshotRequests(frontier.value, current.size).map((entry) => parseSessionBridgeRequest(entry));
  requireCapture(
    requests.length === current.size &&
      new Set(requests.map((entry) => entry.action_id)).size === requests.length &&
      requests.every(
        (entry) =>
          entry.wave_index === frontier.waveIndex &&
          current.has(entry.action_id) &&
          canonicalJsonDigest(current.get(entry.action_id)) === canonicalJsonDigest(entry),
      ),
    'current suspended requests and journal entries differ',
  );
  return { frontier, waves, requests };
}
/** @param {readonly {step_id: string, items: readonly MastraLedgerItem[]}[]} completed @param {number} frontierWave */
function groupCompletedSnapshotItems(
  completed: readonly { step_id: string; items: readonly MastraLedgerItem[] }[],
  frontierWave: number,
): Map<number, { item: MastraLedgerItem; issued: ReturnType<typeof parseSessionBridgeRequest> }[]> {
  const groups = new Map<number, { item: MastraLedgerItem; issued: ReturnType<typeof parseSessionBridgeRequest> }[]>();
  for (const step of completed) {
    for (const item of step.items) {
      const issued = parseSessionBridgeRequest(item.request),
        group = groups.get(issued.wave_index) ?? [];
      requireCapture(
        step.step_id === `wave-${issued.wave_index}` &&
          issued.wave_index < frontierWave &&
          canonicalJsonDigest(issued) === canonicalJsonDigest(item.request) &&
          item.issue_id !== null &&
          item.observation !== null,
        'completed journal wave lacks an accepted issue and observation',
      );
      group.push({ item, issued });
      groups.set(issued.wave_index, group);
    }
  }
  requireCapture(
    completed.length === groups.size && new Set(completed.map((step) => step.step_id)).size === completed.length,
    'completed journal step identities differ',
  );
  return groups;
}
/** @param {unknown} value @param {number} waveIndex @param {string} key @param {readonly {step_id: string, items: readonly MastraLedgerItem[]}[]} completed */
function requireSuccessfulSnapshotStep(
  value: unknown,
  waveIndex: number,
  key: string,
  completed: readonly { step_id: string; items: readonly MastraLedgerItem[] }[],
): Record<string, unknown> {
  requireCapture(
    key === `wave-${waveIndex}` &&
      completed.some((step) => step.step_id === key) &&
      isRecord(value) &&
      Object.hasOwn(value, 'payload') &&
      Object.hasOwn(value, 'resumePayload') &&
      Object.hasOwn(value, 'output') &&
      !Object.hasOwn(value, 'suspendPayload'),
    'completed workflow wave shape or step identity differs',
  );
  return value;
}
/** @param {unknown} value @param {unknown} prior @param {{workId: string, attempt: number, workflowId: string, configDigest: string, scopeDigest: string, selection: unknown}} binding */
function requireSnapshotWaveInput(
  value: unknown,
  prior: unknown,
  binding: {
    workId: string;
    attempt: number;
    workflowId: string;
    configDigest: string;
    scopeDigest: string;
    selection: unknown;
  },
): ReturnType<typeof parseSessionBridgeRunState> {
  const input = parseSessionBridgeRunState(value);
  requireCapture(
    canonicalJsonDigest(input) === canonicalJsonDigest(value) &&
      canonicalJsonDigest(input) === canonicalJsonDigest(prior) &&
      input.work_id === binding.workId &&
      input.attempt === binding.attempt &&
      input.workflow_id === binding.workflowId &&
      input.config_digest === binding.configDigest &&
      input.scope_digest === binding.scopeDigest &&
      canonicalJsonDigest(input.selection) === canonicalJsonDigest(binding.selection),
    'workflow wave input identity differs',
  );
  return input;
}
/** @param {Record<string, unknown>} step */
function requireSnapshotResumePayload(step: Record<string, unknown>): { observations: unknown[] } {
  const resume = step.resumePayload;
  requireCapture(
    isRecord(resume) && Object.keys(resume).sort().join(',') === 'observations' && isUnknownArray(resume.observations),
    'completed workflow resume identity differs',
  );
  return { observations: resume.observations };
}
/** @param {unknown} value @param {unknown} prior @param {number} waveIndex @param {string} key @param {readonly {step_id: string, items: readonly MastraLedgerItem[]}[]} completed @param {{workId: string, attempt: number, workflowId: string, configDigest: string, scopeDigest: string, selection: unknown}} binding */
function requireCompletedSnapshotWave(
  value: unknown,
  prior: unknown,
  waveIndex: number,
  key: string,
  completed: readonly { step_id: string; items: readonly MastraLedgerItem[] }[],
  binding: {
    workId: string;
    attempt: number;
    workflowId: string;
    configDigest: string;
    scopeDigest: string;
    selection: unknown;
  },
): {
  step: Record<string, unknown>;
  input: ReturnType<typeof parseSessionBridgeRunState>;
  resume: { observations: unknown[] };
} {
  const step = requireSuccessfulSnapshotStep(value, waveIndex, key, completed),
    input = requireSnapshotWaveInput(step.payload, prior, binding),
    resume = requireSnapshotResumePayload(step);
  return { step, input, resume };
}
/** @param {unknown} value @param {{workId: string, attempt: number, workflowId: string, configDigest: string, scopeDigest: string}} binding */
function requireInitialSnapshotInput(
  value: unknown,
  binding: { workId: string; attempt: number; workflowId: string; configDigest: string; scopeDigest: string },
): ReturnType<typeof parseSessionBridgeRunState> {
  const input = parseSessionBridgeRunState(value);
  requireCapture(
    canonicalJsonDigest(input) === canonicalJsonDigest(value) &&
      input.work_id === binding.workId &&
      input.attempt === binding.attempt &&
      input.workflow_id === binding.workflowId &&
      input.config_digest === binding.configDigest &&
      input.scope_digest === binding.scopeDigest &&
      input.observations.length === 0,
    'original workflow input identity differs',
  );
  return input;
}
/** @param {{observations: unknown[]}} resume @param {readonly {item: MastraLedgerItem, issued: ReturnType<typeof parseSessionBridgeRequest>}[]} group */
function requireCompletedSnapshotObservations(
  resume: { observations: unknown[] },
  group: readonly { item: MastraLedgerItem; issued: ReturnType<typeof parseSessionBridgeRequest> }[],
): ReturnType<typeof parseSessionBridgeObservation>[] {
  const observations = resume.observations.map((raw) => parseSessionBridgeObservation(raw));
  requireCapture(
    observations.every(
      (entry, index) => canonicalJsonDigest(entry) === canonicalJsonDigest(resume.observations[index]),
    ) &&
      observations.length === group.length &&
      new Set(observations.map((entry) => entry.action_id)).size === observations.length &&
      observations.every((observation) => {
        const matches = group.filter(({ item }) => item.request.action_id === observation.action_id),
          match = matches[0];
        return (
          observation.status === 'reported_complete' &&
          observation.output_digest === canonicalJsonDigest(observation.summary) &&
          observation.host_attempt_id === undefined &&
          matches.length === 1 &&
          match?.item.issue_id === observation.issue_id &&
          canonicalJsonDigest(match.item.observation) === canonicalJsonDigest(observation)
        );
      }),
    'completed workflow observations and journal issues differ',
  );
  return observations;
}
/** @param {number} waveIndex @param {ReturnType<typeof parseSessionBridgeRunState>} input @param {{runId: string, workflowId: string, configDigest: string, scopeDigest: string, workId: string, attempt: number, correctiveExecution: import('../src/orchestration/mastra-session-bridge.js').SessionBridgeRequest['corrective_execution'], config: ReturnType<typeof loadRuntimeConfig>, root: string, lifecycleRisk: WorkState['lifecycle']['risk'], actionProjector: ReturnType<typeof createSessionActionProjector>}} binding */
function expectedCompletedSnapshotRequests(
  waveIndex: number,
  input: ReturnType<typeof parseSessionBridgeRunState>,
  binding: {
    runId: string;
    workflowId: string;
    configDigest: string;
    scopeDigest: string;
    workId: string;
    attempt: number;
    correctiveExecution: import('../src/orchestration/mastra-session-bridge.js').SessionBridgeRequest['corrective_execution'];
    config: ReturnType<typeof loadRuntimeConfig>;
    root: string;
    lifecycleRisk: WorkState['lifecycle']['risk'];
    actionProjector: ReturnType<typeof createSessionActionProjector>;
  },
): ReturnType<typeof buildSessionBridgeRequest>[] {
  const context = { work_id: binding.workId, attempt: binding.attempt, scope_digest: binding.scopeDigest };
  return binding.actionProjector.actionsForWave(context, waveIndex, [], binding.correctiveExecution).map((action) =>
    buildSessionBridgeRequest({
      runId: binding.runId,
      workflowId: binding.workflowId,
      configDigest: binding.configDigest,
      context,
      waveIndex,
      action,
      configuredContext: configuredContextForStage(
        binding.root,
        binding.config,
        binding.workflowId,
        action.stage_id,
        context,
      ),
      priorResults: input.observations,
      ...(binding.correctiveExecution ? { correctiveExecution: binding.correctiveExecution } : {}),
    }),
  );
}
/** @param {ReturnType<typeof buildSessionBridgeRequest>[]} expected @param {readonly {item: MastraLedgerItem, issued: ReturnType<typeof parseSessionBridgeRequest>}[]} group */
function assertCompletedSnapshotRequests(
  expected: ReturnType<typeof buildSessionBridgeRequest>[],
  group: readonly { item: MastraLedgerItem; issued: ReturnType<typeof parseSessionBridgeRequest> }[],
): void {
  requireCapture(
    expected.length === group.length &&
      expected.every((request) => {
        const matches = group.filter(({ issued }) => issued.action_id === request.action_id),
          match = matches[0];
        return (
          matches.length === 1 &&
          match !== undefined &&
          canonicalJsonDigest(match.issued) === canonicalJsonDigest(request)
        );
      }),
    'completed workflow requests and journal actions differ',
  );
}
/** @param {ReturnType<typeof buildSessionBridgeRequest>[]} expected @param {readonly ReturnType<typeof parseSessionBridgeRequest>[]} actual */
function assertSnapshotRequestSequence(
  expected: ReturnType<typeof buildSessionBridgeRequest>[],
  actual: readonly ReturnType<typeof parseSessionBridgeRequest>[],
): void {
  requireCapture(
    expected.length > 0 &&
      expected.length === actual.length &&
      expected.every((request, index) => canonicalJsonDigest(request) === canonicalJsonDigest(actual[index])),
    'snapshot workflow requests differ from configured actions',
  );
}
/** @param {readonly number[]} actual @param {readonly number[]} executable @param {number} frontierWave */
function assertExecutableSnapshotPrefix(
  actual: readonly number[],
  executable: readonly number[],
  frontierWave: number,
): void {
  const prefix = executable.filter((waveIndex) => waveIndex <= frontierWave);
  requireCapture(
    prefix.length > 0 &&
      prefix[prefix.length - 1] === frontierWave &&
      canonicalJsonDigest(prefix) === canonicalJsonDigest(actual),
    'snapshot omits an executable configured workflow step',
  );
}
/** @param {Record<string, unknown>} context @param {{waveIndex: number}} frontier @param {readonly {waveIndex: number}[]} successful @param {unknown} prior @param {readonly ReturnType<typeof parseSessionBridgeRequest>[]} requests @param {readonly MastraLedgerItem[]} currentItems @param {{runId: string, workflowId: string, configDigest: string, scopeDigest: string, workId: string, attempt: number, selection: unknown, correctiveExecution: import('../src/orchestration/mastra-session-bridge.js').SessionBridgeRequest['corrective_execution'], config: ReturnType<typeof loadRuntimeConfig>, root: string, lifecycleRisk: WorkState['lifecycle']['risk'], actionProjector: ReturnType<typeof createSessionActionProjector>}} binding */
function assertSnapshotFrontierFollowsCompleted(
  context: Record<string, unknown>,
  frontier: { waveIndex: number },
  successful: readonly { waveIndex: number }[],
  prior: unknown,
  requests: readonly ReturnType<typeof parseSessionBridgeRequest>[],
  currentItems: readonly MastraLedgerItem[],
  binding: {
    runId: string;
    workflowId: string;
    configDigest: string;
    scopeDigest: string;
    workId: string;
    attempt: number;
    selection: unknown;
    correctiveExecution: import('../src/orchestration/mastra-session-bridge.js').SessionBridgeRequest['corrective_execution'];
    config: ReturnType<typeof loadRuntimeConfig>;
    root: string;
    lifecycleRisk: WorkState['lifecycle']['risk'];
    actionProjector: ReturnType<typeof createSessionActionProjector>;
  },
): void {
  const waveIndices = Object.keys(context)
      .filter((key) => /^wave-[0-9]+$/u.test(key))
      .map((key) => Number(key.slice(5)))
      .sort((left, right) => left - right),
    successIndices = successful.map((entry) => entry.waveIndex),
    frontierStep = context[`wave-${frontier.waveIndex}`];
  requireCapture(
    waveIndices.length === successful.length + 1 &&
      waveIndices[waveIndices.length - 1] === frontier.waveIndex &&
      successIndices.every((waveIndex, index) => waveIndex === waveIndices[index]),
    'snapshot workflow wave order differs',
  );
  requireCapture(
    isRecord(frontierStep) && Object.hasOwn(frontierStep, 'payload'),
    'current suspended workflow step does not follow completed waves',
  );
  const input = requireSnapshotWaveInput(frontierStep.payload, prior, binding),
    expected = expectedCompletedSnapshotRequests(frontier.waveIndex, input, binding);
  assertSnapshotRequestSequence(expected, requests);
  assertSnapshotRequestSequence(
    expected,
    currentItems.map((item) => parseSessionBridgeRequest(item.request)),
  );
}
/** @param {Record<string, unknown>} context @param {readonly MastraLedgerItem[]} currentItems @param {readonly {step_id: string, items: readonly MastraLedgerItem[]}[]} completed @param {{runId: string, workflowId: string, configDigest: string, scopeDigest: string, workId: string, attempt: number, selection: ReturnType<typeof parseSessionBridgeRunState>['selection'], correctiveExecution: import('../src/orchestration/mastra-session-bridge.js').SessionBridgeRequest['corrective_execution'], config: ReturnType<typeof loadRuntimeConfig>, root: string, lifecycleRisk: WorkState['lifecycle']['risk']}} binding */
function assertSnapshotJournalRequestClosure(
  context: Record<string, unknown>,
  currentItems: readonly MastraLedgerItem[],
  completed: readonly { step_id: string; items: readonly MastraLedgerItem[] }[],
  binding: {
    runId: string;
    workflowId: string;
    configDigest: string;
    scopeDigest: string;
    workId: string;
    attempt: number;
    selection: ReturnType<typeof parseSessionBridgeRunState>['selection'];
    correctiveExecution: import('../src/orchestration/mastra-session-bridge.js').SessionBridgeRequest['corrective_execution'];
    config: ReturnType<typeof loadRuntimeConfig>;
    root: string;
    lifecycleRisk: WorkState['lifecycle']['risk'];
  },
): void {
  const { frontier, waves, requests } = requireCurrentSnapshotFrontier(context, currentItems),
    groups = groupCompletedSnapshotItems(completed, frontier.waveIndex),
    successful = waves.filter(({ value }) => isRecord(value) && value.status === 'success'),
    actionProjector = createSessionActionProjector(
      binding.config,
      binding.selection,
      binding.workflowId,
      binding.lifecycleRisk,
    ),
    projectedBinding = { ...binding, actionProjector };
  requireCapture(
    waves.length === successful.length + 1 && successful.length === groups.size,
    'completed journal and workflow waves differ',
  );
  let prior = requireInitialSnapshotInput(context.input, binding);
  for (const { waveIndex, key, value } of successful) {
    const checked = requireCompletedSnapshotWave(value, prior, waveIndex, key, completed, binding),
      group = groups.get(waveIndex) ?? [],
      observations = requireCompletedSnapshotObservations(checked.resume, group);
    assertCompletedSnapshotRequests(
      expectedCompletedSnapshotRequests(waveIndex, checked.input, projectedBinding),
      group,
    );
    prior = parseSessionBridgeRunState(checked.step.output);
    requireCapture(
      canonicalJsonDigest(prior) === canonicalJsonDigest(checked.step.output) &&
        canonicalJsonDigest(prior) ===
          canonicalJsonDigest({ ...checked.input, observations: [...checked.input.observations, ...observations] }),
      'completed workflow output chain differs',
    );
  }
  const executable = actionProjector.executableWaveIndices(binding.correctiveExecution?.stage_ids);
  assertExecutableSnapshotPrefix(
    waves.map((entry) => entry.waveIndex),
    executable,
    frontier.waveIndex,
  );
  assertSnapshotFrontierFollowsCompleted(
    context,
    frontier,
    successful,
    prior,
    requests,
    currentItems,
    projectedBinding,
  );
}
/** @param {unknown} value @returns {value is {path: string, old_sha256: string, new_sha256: string}} */
function isForwardFileChange(value: unknown): value is { path: string; old_sha256: string; new_sha256: string } {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.old_sha256 === 'string' &&
    typeof value.new_sha256 === 'string'
  );
}
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isForwardUpdateEvent(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    typeof value.schema === 'string' &&
    typeof value.operation_id === 'string' &&
    typeof value.lock_sha256 === 'string' &&
    typeof value.phase === 'string' &&
    typeof value.path === 'string'
  );
}
/** @param {unknown} value @returns {value is {work_id: string, attempt: number, config_digest: string, scope_digest: string, workflow_id: string, selection: ReturnType<typeof parseSessionBridgeRunState>['selection']}} */
function isWorkflowInput(value: unknown): value is {
  work_id: string;
  attempt: number;
  config_digest: string;
  scope_digest: string;
  workflow_id: string;
  selection: ReturnType<typeof parseSessionBridgeRunState>['selection'];
} {
  return (
    isRecord(value) &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    Number.isSafeInteger(value.attempt) &&
    typeof value.config_digest === 'string' &&
    typeof value.scope_digest === 'string' &&
    typeof value.workflow_id === 'string'
  );
}
/** @template T @param {T | null | undefined} value @param {string} message @returns {T} */
function requireCaptureValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(`completed readonly capture: ${message}`);
  return value;
}
/** @param {unknown} value @returns {string[]} */
function requireStringArray(value: unknown): string[] {
  if (!isUnknownArray(value) || !value.every((entry) => typeof entry === 'string'))
    throw new Error('completed readonly capture: owner release resources are invalid');
  return value;
}
/** @param {unknown} value @returns {Record<string, unknown> & {changed: Array<{path: string, old_sha256: string, new_sha256: string}>}} */
function requireForwardIntent(
  value: unknown,
): Record<string, unknown> & { changed: Array<{ path: string; old_sha256: string; new_sha256: string }> } {
  if (!isRecord(value) || !Array.isArray(value.changed) || !value.changed.every(isForwardFileChange))
    throw new Error('completed readonly capture: terminal forward intent is invalid');
  return { ...value, changed: value.changed.filter(isForwardFileChange) };
}
/** @param {unknown} snapshot @returns {{snapshot: Record<string, unknown>, context: Record<string, unknown>, input: {work_id: string, attempt: number, config_digest: string, scope_digest: string, workflow_id: string, selection: ReturnType<typeof parseSessionBridgeRunState>['selection']}}} */
function requireWorkflowSnapshot(snapshot: unknown): {
  snapshot: Record<string, unknown>;
  context: Record<string, unknown>;
  input: {
    work_id: string;
    attempt: number;
    config_digest: string;
    scope_digest: string;
    workflow_id: string;
    selection: ReturnType<typeof parseSessionBridgeRunState>['selection'];
  };
} {
  if (!isRecord(snapshot) || !isRecord(snapshot.context) || !isWorkflowInput(snapshot.context.input))
    throw new Error('completed readonly capture: original workflow input is invalid');
  return { snapshot, context: snapshot.context, input: snapshot.context.input };
}
/** @param {WorkState | null | undefined} value @returns {WorkState} */
function requireSuspendedReleasedWork(value: WorkState | null | undefined): WorkState {
  if (!value || value.lease !== null || value.execution.status !== 'suspended')
    throw new Error('completed readonly capture: owner closure missing');
  return value;
}
/** @param {Array<Record<string, unknown>>} releases @returns {Record<string, unknown>} */
function requireSingleRelease(releases: Array<Record<string, unknown>>): Record<string, unknown> {
  if (releases.length !== 1 || !releases[0])
    throw new Error('completed readonly capture: exact owner release proof is missing');
  return releases[0];
}
/** @param {unknown} event @param {string} operationId @param {string} lockDigest @param {string} filePath @returns {boolean} */
function isPublishedForwardUpdate(event: unknown, operationId: string, lockDigest: string, filePath: string): boolean {
  return (
    isForwardUpdateEvent(event) &&
    event.schema === 'VidaForwardUpdateEvent/v1' &&
    event.operation_id === operationId &&
    event.lock_sha256 === lockDigest &&
    event.phase === 'file_replaced' &&
    event.path === filePath
  );
}
/** @param {CoordinationLedger['tickets'][number]} ticket @param {Record<string, unknown>} release @param {{work_id: string}} identity @param {string} nativeSessionHandle @returns {boolean} */
function isReleasedCaptureTicket(
  ticket: CoordinationLedger['tickets'][number],
  release: Record<string, unknown>,
  identity: { work_id: string },
  nativeSessionHandle: string,
): boolean {
  return (
    ticket.ticket_id === release.ticket_id &&
    ticket.status === 'released' &&
    ticket.work_id === identity.work_id &&
    ticket.thread_id === nativeSessionHandle
  );
}
/** @param {CoordinationLedger['claims'][number]} claim @param {{work_id: string}} identity @param {string} nativeSessionHandle @returns {boolean} */
function isReleasedCaptureClaim(
  claim: CoordinationLedger['claims'][number],
  identity: { work_id: string },
  nativeSessionHandle: string,
): boolean {
  return claim.status === 'released' && claim.work_id === identity.work_id && claim.thread_id === nativeSessionHandle;
}
/** @param {MastraLedgerItem} item @returns {boolean} */
function isCompletedUnreservedCaptureItem(item: MastraLedgerItem): boolean {
  return (
    item.issue_id !== null &&
    item.observation?.status === 'reported_complete' &&
    !item.host_reservation &&
    !item.research_normalization
  );
}
/** @param {MastraLedgerItem} item @returns {boolean} */
function isReportedCompleteCaptureItem(item: MastraLedgerItem): boolean {
  return item.issue_id !== null && item.observation?.status === 'reported_complete';
}
/** @param {unknown} left @param {unknown} right */
const equal = (left: unknown, right: unknown): boolean => canonicalJsonDigest(left) === canonicalJsonDigest(right);

/** @param {string} root @param {WorkState} work @param {ReturnType<typeof parseSessionBridgeRunState>['selection']} selection @param {string} workflowId @param {string} configDigest @param {string} scopeDigest @param {string} workId */
function requireAdmittedSnapshotSelection(
  root: string,
  work: WorkState,
  selection: ReturnType<typeof parseSessionBridgeRunState>['selection'],
  workflowId: string,
  configDigest: string,
  scopeDigest: string,
  workId: string,
): void {
  const admitted = workflowWorkItemSchema.parse(readAdmittedSessionIntakeForWork(root, work).work_item),
    selectionMatches =
      canonicalJsonDigest({
        kind: admitted.canonical_kind,
        intent: admitted.intent,
        project: admitted.project_id,
        risk_flags: admitted.risk_flags,
        labels: admitted.labels,
      }) ===
      canonicalJsonDigest({
        kind: selection.kind,
        intent: selection.intent,
        project: selection.project,
        risk_flags: selection.risk_flags,
        labels: selection.labels,
      });
  requireCapture(
    admitted.id === work.binding.provider_work_item_id &&
      admitted.id === workId &&
      canonicalJsonDigest(admitted) === work.binding.work_item_digest &&
      work.binding.team_id === selection.team &&
      work.binding.workflow_id === workflowId &&
      work.binding.config_digest === configDigest &&
      work.binding.work_source_revision === scopeDigest &&
      selectionMatches,
    'original admitted work selection differs',
  );
}

/** Fixed admitted administrative route. Captured completion is not canonical acceptance. */
type CompletedReadOnlyCaptureInput = { root: string; payloadRoot: string; operationId: string; requestPath: string };
type CompletedReadOnlyCaptureOptions = { onPhase?: (phase: string) => void };
export async function runCompletedReadOnlyCapture(
  { root, payloadRoot, operationId, requestPath }: CompletedReadOnlyCaptureInput,
  { onPhase }: CompletedReadOnlyCaptureOptions = {},
): Promise<{
  status: 'captured_normalization_pending';
  work_id: string;
  attempt: number;
  journal_version: StateVersion;
  work_version: StateVersion;
  ledger_version: StateVersion;
  owner_released: true;
  canonical_acceptance: false;
  native_calls: 0;
  runtime_acceptance: false;
}> {
  root = path.resolve(root);
  payloadRoot = path.resolve(payloadRoot);
  const admission = () =>
    verifyForwardCandidateAdmission({
      root,
      payloadRoot,
      operationId,
      moduleUrl: import.meta.url,
      purpose: 'completed-readonly-capture',
    });
  const admitted = admission(),
    config = loadRuntimeConfig(root),
    access = requireSafeRepositoryAccess(root);
  const requestBytes = access.readBytes(requestPath, 'attributed completed readonly capture');
  requireCapture(requestBytes.length <= 65536, 'request exceeds bound');
  const parsedRequest: unknown = JSON.parse(requestBytes.toString('utf8'));
  requireCapture(isCaptureRequest(parsedRequest), 'request identity or fields invalid');
  const request = parsedRequest;
  let ledger: ReturnType<typeof openConfiguredMastraSessionLedger> | null = null;
  let store: HostStateStore | null = null;
  let host: HostStateSnapshot;
  let journal: CapturedJournal | null = null;
  try {
    const context = loadProjectSetContext(root, config, config.repository.repository_id, request.project_ids);
    const identity = {
      repository_id: context.repository_id,
      project_ids: context.project_ids,
      integrations_digest: context.integrations_digest,
      work_id: request.work_id,
    };
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
    const inspected = inspectLocalSession({
      repositoryRoot: root,
      config,
      projectIds: identity.project_ids,
      integrationsDigest: identity.integrations_digest,
      workId: identity.work_id,
      attempt: request.attempt,
    });
    let maintenance: ReturnType<typeof checkedMaintenanceFence> | null = null;
    const fenceDatabase = openCliWorkspaceDatabase(root, sessionHandoffDatabasePath(root, config), workspaceId, true);
    try {
      const rowValue = queryDatabaseRow(
        fenceDatabase,
        'SELECT revision,payload,digest FROM agent_host_maintenance WHERE workspace_id=?',
        [workspaceId],
      );
      if (rowValue) {
        requireCapture(isMaintenanceFenceRow(rowValue), 'maintenance inspection row is malformed');
        const row = rowValue;
        maintenance = checkedMaintenanceFence(JSON.parse(row.payload));
        requireCapture(
          maintenance.workspace_id === workspaceId &&
            maintenance.revision === row.revision &&
            canonicalJsonDigest(maintenance) === row.digest,
          'maintenance inspection checksum differs',
        );
      }
    } finally {
      closeWorkspaceDatabaseWithAdmission(fenceDatabase);
    }
    if (inspected.lease === null) {
      if (maintenance?.status === 'held') {
        const intent: unknown = JSON.parse(
          access
            .readBytes(`.agent/cutover/${operationId}/forward-intent.v1.json`, 'terminal held-fence intent')
            .toString('utf8'),
        );
        requireCapture(isRecord(intent), 'terminal held-fence intent is malformed');
        requireCapture(
          maintenance.binding.operation_id === operationId &&
            maintenance.binding.bundle_digest === intent.old_payload_manifest_sha256 &&
            context.project_ids.every((id) => maintenance.binding.project_ids.includes(id)),
          'foreign terminal maintenance binding',
        );
      }
      requireCapture(
        inspected.work_version &&
          inspected.ledger_version &&
          inspected.lease === null &&
          inspected.execution_status === 'suspended',
        'incomplete capture conflicts with held global fence',
      );
      const database = openCliWorkspaceDatabase(root, sessionHandoffDatabasePath(root, config), workspaceId, true);
      try {
        const terminalStore = createCliHostStateStore(database, workspaceId);
        const snapshot = terminalStore.readTerminalHostStateSnapshot(identity, maintenance ?? null);
        requireCapture(
          snapshot.work &&
            snapshot.ledger &&
            snapshot.workVersion &&
            snapshot.ledgerVersion &&
            canonicalJsonDigest(snapshot.work) === inspected.work_version.digest &&
            snapshot.workVersion.digest === inspected.work_version.digest &&
            snapshot.ledgerVersion.digest === inspected.ledger_version.digest,
          'terminal host schema or snapshot drift',
        );
        host = snapshot;
      } finally {
        closeWorkspaceDatabaseWithAdmission(database);
      }
    } else {
      requireCapture(maintenance?.status !== 'held', 'incomplete capture conflicts with held global fence');
      ledger = openConfiguredMastraSessionLedger(root);
      store = ledger.hostState;
      host = store.readHostStateSnapshot(identity);
    }
    const terminal = host.work?.lease === null;
    if (terminal) {
      // After owner closure, publication may hold the global fence and change
      // scoped source bytes. Observe the exact persisted completion read-only;
      // never reopen the working journal or grant maintenance working access.
      const database = openCliWorkspaceDatabase(root, sessionHandoffDatabasePath(root, config), workspaceId, true);
      try {
        const rowValue = queryDatabaseRow(
          database,
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          [workspaceId, request.work_id, request.attempt],
        );
        requireCapture(isPositiveRevisionPayloadRow(rowValue), 'terminal original journal missing');
        const row = rowValue;
        const state = parseMastraSessionLedgerState(JSON.parse(row.payload));
        requireCapture(
          state.schema === 'MastraSessionLedger/v1' &&
            state.workspace_id === workspaceId &&
            state.work_id === request.work_id &&
            state.attempt === request.attempt &&
            row.digest === canonicalJsonDigest(state) &&
            hasMastraLedgerCollections(state) &&
            [...state.items, ...state.completed.flatMap((step) => step.items)].every((item) =>
              validateResearchJournalItem(item, state),
            ),
          'terminal journal identity or closure invalid',
        );
        journal = {
          state,
          version: { revision: row.revision, digest: row.digest },
          resume_status: mastraLedgerStatus(state),
        };
      } finally {
        closeWorkspaceDatabaseWithAdmission(database);
      }
    } else {
      if (!ledger || !store) throw new Error('completed readonly capture: active ledger is unavailable');
      requireCapture(
        store.readMaintenanceFence()?.status !== 'held',
        'incomplete capture conflicts with held global fence',
      );
      journal = ledger.resume(request.work_id, request.attempt);
    }
    requireCapture(journal, 'original attempt missing');
    requireCompleteHostSnapshot(host);
    requireCapture(
      host.work &&
        host.ledger &&
        host.workVersion &&
        host.ledgerVersion &&
        host.work.execution.run_id === journal.state.run_id &&
        host.work.binding.config_digest === runtimeConfigDigest(config) &&
        host.work.binding.lifecycle_work_id === request.work_id &&
        host.work.binding.repository_id === identity.repository_id &&
        equal(host.work.binding.project_ids, identity.project_ids) &&
        host.work.binding.integrations_digest === identity.integrations_digest &&
        host.work.execution.assignment_attempts.every((entry) => !['started', 'uncertain'].includes(entry.status)),
      'current original work/config or activity differs',
    );
    const sourceScope = parseScopedSourceSnapshot(journal.state.source_scope);
    requireCapture(
      sourceScope.digest === canonicalJsonDigest({ schema: sourceScope.schema, entries: sourceScope.entries }),
      'original source binding invalid',
    );
    if (!terminal)
      requireCapture(
        equal(
          snapshotDeclaredSources(
            access,
            sourceScope.entries.map((entry) => entry.path),
          ),
          sourceScope,
        ),
        'original source bytes differ',
      );
    const original = openCliWorkspaceDatabase(root, sessionBridgeDatabasePath(root, config), workspaceId, true);
    try {
      const rows = queryDatabaseRows(
        original,
        'SELECT workflow_name,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?',
        [journal.state.run_id],
      );
      requireCapture(isUnknownArray(rows), 'original suspended snapshot rows are malformed');
      requireCapture(rows.length === 1, 'original suspended snapshot missing/ambiguous');
      const row = rows[0];
      requireCapture(isWorkflowSnapshotRow(row), 'original suspended snapshot row is malformed');
      const exactRow = requireCaptureValue(row, 'original suspended snapshot missing');
      const snapshotValue: unknown = JSON.parse(exactRow.snapshot);
      const checkedSnapshot = requireWorkflowSnapshot(snapshotValue);
      const snapshot = checkedSnapshot.snapshot;
      const snapshotContext = checkedSnapshot.context;
      const input = checkedSnapshot.input;
      requireCapture(
        snapshot.status === 'suspended' &&
          snapshot.runId === journal.state.run_id &&
          input?.work_id === request.work_id &&
          input.attempt === request.attempt &&
          input.config_digest === runtimeConfigDigest(config) &&
          input.scope_digest === sourceScope.digest &&
          exactRow.workflow_name === input.workflow_id &&
          sessionBridgeRunId(
            workspaceId,
            { work_id: request.work_id, attempt: request.attempt, scope_digest: input.scope_digest },
            input.workflow_id,
          ) === journal.state.run_id,
        'original run/config/source differs',
      );
      requireAdmittedSnapshotSelection(
        root,
        host.work,
        input.selection,
        input.workflow_id,
        input.config_digest,
        input.scope_digest,
        request.work_id,
      );
      const retainedItems = [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items];
      assertSnapshotJournalRequestClosure(snapshotContext, journal.state.items, journal.state.completed, {
        runId: journal.state.run_id,
        workflowId: input.workflow_id,
        configDigest: input.config_digest,
        scopeDigest: input.scope_digest,
        workId: request.work_id,
        attempt: request.attempt,
        selection: input.selection,
        correctiveExecution: journal.state.corrective_execution ?? undefined,
        config,
        root,
        lifecycleRisk: host.work.lifecycle.risk,
      });
      for (const item of retainedItems) {
        const issued = parseSessionBridgeRequest(item.request);
        requireCapture(
          !item.host_reservation &&
            issued.run_id === journal.state.run_id &&
            issued.workflow_id === input.workflow_id &&
            issued.config_digest === input.config_digest &&
            issued.scope_digest === input.scope_digest &&
            cooperativeReadonlyAssignments(config, issued),
          'original issued action is not proven readonly',
        );
      }
    } finally {
      closeWorkspaceDatabaseWithAdmission(original);
    }
    const checkedJournal = journal;
    requireCapture(checkedJournal, 'original attempt missing');
    const observations = request.reports.map((file) => {
      const bytes = access.readBytes(file, 'actual completed native observation');
      requireCapture(bytes.length <= 65536, 'report exceeds bound');
      const observation = parseSessionBridgeObservation(JSON.parse(bytes.toString('utf8')));
      requireCapture(
        observation.status === 'reported_complete' && observation.host_attempt_id === undefined,
        'completed readonly observation required',
      );
      return observation;
    });
    requireCapture(
      new Set(observations.map((entry) => entry.action_id)).size === observations.length,
      'capture action duplicated',
    );
    const pending = observations.filter((observation) => {
      const item = checkedJournal.state.items.find((entry) => entry.request.action_id === observation.action_id);
      requireCapture(
        item && item.issue_id === observation.issue_id && !item.research_normalization,
        'exact open original issue required',
      );
      if (item.observation) {
        requireCapture(equal(item.observation, observation), 'different completion replay');
        return false;
      }
      return true;
    });
    const replayed = observations.length - pending.length;
    const originalState = {
      ...journal.state,
      items: journal.state.items.map((item) =>
        observations.some((entry) => entry.action_id === item.request.action_id)
          ? { ...item, observation: null }
          : item,
      ),
    };
    requireCapture(
      journal.version.revision === request.expected_journal.revision + replayed &&
        canonicalJsonDigest(originalState) === request.expected_journal.digest,
      'capture original journal compare-and-swap differs',
    );
    if (terminal) {
      const intentBytes = access.readBytes(
        `.agent/cutover/${operationId}/forward-intent.v1.json`,
        'terminal forward intent',
      );
      const intentValue: unknown = JSON.parse(intentBytes.toString('utf8'));
      const changes = requireForwardIntent(intentValue).changed;
      const prefix = access
        .readBytes(`.agent/cutover/${operationId}/forward-journal.v1.jsonl`, 'terminal prefix journal')
        .toString('utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const event: unknown = JSON.parse(line);
          return event;
        });
      const current = snapshotDeclaredSources(
        access,
        sourceScope.entries.map((entry) => entry.path),
      );
      for (const entry of current.entries) {
        const prior = requireCaptureValue(
          sourceScope.entries.find((value) => value.path === entry.path),
          'terminal source baseline is missing',
        );
        if (equal(entry, prior)) continue;
        const change = requireCaptureValue(
          changes.find((value) => value.path === entry.path),
          'terminal source change is undeclared',
        );
        requireCapture(
          change &&
            prior.exists &&
            entry.exists &&
            change.old_sha256 === prior.sha256 &&
            change.new_sha256 === entry.sha256 &&
            prefix.some((event) => isPublishedForwardUpdate(event, operationId, admitted.intent_sha256, entry.path)),
          'terminal source drift is not declared published prefix',
        );
      }
      const releaseId =
        'completed-readonly-release-' +
        canonicalJsonDigest({
          work_id: identity.work_id,
          nativeSessionHandle: request.native_session_handle,
          userRequestPointer: request.user_request_pointer,
          requestIntent: 'linked_correction',
          journal: journal.version.digest,
        }).slice(0, 40);
      const release = host.ledger.operations.filter((entry) => entry.operation_id === releaseId);
      const releaseRecord = requireSingleRelease(release);
      const releaseResources = requireStringArray(releaseRecord.resources);
      requireCapture(
        pending.length === 0 &&
          host.work.execution.status === 'suspended' &&
          host.workVersion.revision === request.expected_work.revision + 1 &&
          host.ledgerVersion.revision === request.expected_ledger.revision + 1 &&
          release.length === 1 &&
          releaseRecord.kind === 'release' &&
          releaseRecord.work_id === identity.work_id &&
          releaseRecord.thread_id === request.native_session_handle &&
          releaseRecord.decided_by === request.native_session_handle &&
          releaseRecord.decision_pointer === request.user_request_pointer &&
          releaseRecord.source_revision === host.work.binding.work_source_revision &&
          releaseRecord.from_ledger_revision === request.expected_ledger.revision &&
          releaseRecord.to_ledger_revision === request.expected_ledger.revision + 1 &&
          equal(
            [...releaseResources].sort(),
            host.work.binding.implementation_paths.map((value) => 'file:' + value).sort(),
          ) &&
          host.ledger.tickets.some((ticket) =>
            isReleasedCaptureTicket(ticket, releaseRecord, identity, request.native_session_handle),
          ) &&
          host.ledger.claims.filter((claim) => claim.ticket_id === releaseRecord.ticket_id).length === 1 &&
          host.ledger.claims
            .filter((claim) => claim.ticket_id === releaseRecord.ticket_id)
            .every((claim) => isReleasedCaptureClaim(claim, identity, request.native_session_handle)) &&
          [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items].every((item) =>
            isCompletedUnreservedCaptureItem(item),
          ),
        'terminal capture or exact owner release proof differs',
      );
      requireCapture(
        equal(admission(), admitted) && access.readBytes(requestPath, 'terminal capture request').equals(requestBytes),
        'terminal admission/request drift',
      );
      return {
        status: 'captured_normalization_pending',
        work_id: request.work_id,
        attempt: request.attempt,
        journal_version: journal.version,
        work_version: host.workVersion,
        ledger_version: host.ledgerVersion,
        owner_released: true,
        canonical_acceptance: false,
        native_calls: 0,
        runtime_acceptance: false,
      };
    }
    if (pending.length) {
      store = requireCaptureValue(store, 'active Host store is unavailable');
      requireCapture(
        equal(host.workVersion, request.expected_work) && equal(host.ledgerVersion, request.expected_ledger),
        'capture owner compare-and-swap version differs',
      );
      const intake = assertAdmittedRuntimeCodeCurrent(root, store, identity);
      requireCapture(intake.native_session_handle === request.native_session_handle, 'original native session changed');
    }
    requireCapture(
      host.work.lease === null || host.work.lease.thread_id === request.native_session_handle,
      'foreign native owner',
    );
    for (const observation of pending) {
      requireCapture(
        equal(admission(), admitted) &&
          access.readBytes(requestPath, 'capture request replay').equals(requestBytes) &&
          runtimeConfigDigest(loadRuntimeConfig(root)) === runtimeConfigDigest(config),
        'admission/request/config drift',
      );
      requireCapture(
        equal(
          snapshotDeclaredSources(
            access,
            sourceScope.entries.map((entry) => entry.path),
          ),
          sourceScope,
        ),
        'original source changed before observation',
      );
      const activeLedger = requireCaptureValue(ledger, 'active session ledger is unavailable');
      journal = activeLedger.report(request.work_id, request.attempt, journal.version, observation, sourceScope);
      onPhase?.('observation_captured');
    }
    requireCapture(
      [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items].every((item) =>
        isReportedCompleteCaptureItem(item),
      ),
      'other issued activity remains unknown/failed',
    );
    requireCapture(equal(admission(), admitted), 'admission changed before owner release');
    requireCapture(
      access.readBytes(requestPath, 'capture release replay').equals(requestBytes) &&
        runtimeConfigDigest(loadRuntimeConfig(root)) === runtimeConfigDigest(config) &&
        equal(
          snapshotDeclaredSources(
            access,
            sourceScope.entries.map((entry) => entry.path),
          ),
          sourceScope,
        ),
      'original request/config/source changed before owner release',
    );
    store = requireCaptureValue(store, 'active Host store is unavailable');
    ledger = requireCaptureValue(ledger, 'active session ledger is unavailable');
    host = store.readHostStateSnapshot(identity);
    requireCompleteHostSnapshot(host);
    requireCapture(
      host.work.lease === null ||
        (equal(host.workVersion, request.expected_work) && equal(host.ledgerVersion, request.expected_ledger)),
      'owner release compare-and-swap changed',
    );
    const released = suspendCompletedReadOnlyWork({
      store,
      identity,
      journal,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      nativeSessionHandle: request.native_session_handle,
      userRequestPointer: request.user_request_pointer,
      requestIntent: 'linked_correction',
      documentationContext: {
        repository_root: root,
        repository_id: identity.repository_id,
        project_id: identity.project_ids[0] ?? '',
        work_id: request.work_id,
      },
    });
    onPhase?.('owner_released');
    requireCompleteHostSnapshot(released);
    requireSuspendedReleasedWork(released.work);
    return {
      status: 'captured_normalization_pending',
      work_id: request.work_id,
      attempt: request.attempt,
      journal_version: journal.version,
      work_version: released.workVersion,
      ledger_version: released.ledgerVersion,
      owner_released: true,
      canonical_acceptance: false,
      native_calls: 0,
      runtime_acceptance: false,
    };
  } finally {
    ledger?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const values: unknown = Object.fromEntries(
    Array.from({ length: (process.argv.length - 2) / 2 }, (_, index) => [
      process.argv[2 + index * 2],
      process.argv[3 + index * 2],
    ]),
  );
  try {
    requireCapture(isStringRecord(values), 'capture arguments are malformed');
    const root = values['--project-root'];
    const payloadRoot = values['--payload-root'];
    const operationId = values['--forward-operation'];
    const requestPath = values['--capture-request'];
    requireCapture(
      typeof root === 'string' &&
        typeof payloadRoot === 'string' &&
        typeof operationId === 'string' &&
        typeof requestPath === 'string',
      'capture arguments are incomplete',
    );
    const result = await runCompletedReadOnlyCapture({
      root,
      payloadRoot,
      operationId,
      requestPath,
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(
      JSON.stringify({ status: 'blocked', message: error instanceof Error ? error.message : String(error) }),
    );
    process.exitCode = 1;
  }
}

/** @param {unknown} value @returns {value is {revision: number, payload: string, digest: string}} */
function isMaintenanceFenceRow(value: unknown): value is { revision: number; payload: string; digest: string } {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.revision) &&
    typeof value.payload === 'string' &&
    typeof value.digest === 'string'
  );
}
/** @param {unknown} value @returns {value is {revision: number, payload: string, digest: string}} */
function isPositiveRevisionPayloadRow(value: unknown): value is { revision: number; payload: string; digest: string } {
  return isMaintenanceFenceRow(value) && value.revision > 0;
}
/** @param {unknown} value @returns {value is {workflow_name: string, snapshot: string}} */
function isWorkflowSnapshotRow(value: unknown): value is { workflow_name: string; snapshot: string } {
  return isRecord(value) && typeof value.workflow_name === 'string' && typeof value.snapshot === 'string';
}
/** @param {unknown} value @returns {value is Record<string, string>} */
function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === 'string');
}
/** @param {MastraSessionLedgerState} value @returns {boolean} */
function hasMastraLedgerCollections(value: MastraSessionLedgerState): boolean {
  return Array.isArray(value.items) && Array.isArray(value.completed);
}
/** @param {unknown} value @returns {value is unknown[]} */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
/** @param {Database} database @param {string} sql @param {(string | number)[]} bindings @returns {unknown} */
function queryDatabaseRow(database: Database, sql: string, bindings: (string | number)[]): unknown {
  const row: unknown = database.query(sql).get(...bindings);
  return row;
}
/** @param {Database} database @param {string} sql @param {(string | number)[]} bindings @returns {unknown} */
function queryDatabaseRows(database: Database, sql: string, bindings: (string | number)[]): unknown {
  const rows: unknown = database.query(sql).all(...bindings);
  return rows;
}
