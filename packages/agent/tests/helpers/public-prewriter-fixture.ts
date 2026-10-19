import { resolve } from 'node:path';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.js';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.js';
import type { WorkState } from '../../src/host-state.js';
import { lifecyclePreparationObservationSchema } from '../../src/orchestration/final-assurance.js';
import {
  parseSessionBridgeRequest,
  type SessionBridgeObservation,
} from '../../src/orchestration/mastra-session-bridge.js';
import type { ScopedSourceSnapshot } from '../../src/orchestration/scoped-source-snapshot.js';
import type { MastraSessionBridge } from '../../src/orchestration/mastra-session-bridge.js';
import type {
  MastraSessionLedger,
  MastraSessionLedgerSnapshot,
} from '../../src/orchestration/persistent-session-handoff.js';

interface PublicPrewriterAction {
  readonly issue_id: string;
  readonly request: ReturnType<typeof parseSessionBridgeRequest>;
}

interface PublicPrewriterInput {
  readonly args: readonly string[];
  readonly publicRun: (args: string[]) => unknown;
  readonly sync: () => MastraSessionLedgerSnapshot | null;
  readonly repositoryRoot: string;
  readonly workId: string;
  readonly attempt: number;
  readonly work: WorkState;
}

type PreparationRecord = ReturnType<typeof lifecyclePreparationObservationSchema.parse>;
type PreparationKind = PreparationRecord['kind'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(label + ' is malformed');
  return value;
}

function parseIssueEnvelope(value: unknown): readonly unknown[] {
  const envelope = asRecord(value, 'Public run issue envelope');
  if (envelope.schema !== 'VidaAgentRunResult/v1') throw new Error('Public run issue schema changed');
  if (envelope.status !== 'wave_issued') throw new Error('Public run did not issue a wave');
  if (!Array.isArray(envelope.issued_actions)) throw new Error('Public run issue actions are malformed');
  return envelope.issued_actions;
}

function parsePrewriterAction(value: unknown): PublicPrewriterAction {
  const action = asRecord(value, 'Public prewriter action');
  if (typeof action.issue_id !== 'string') throw new Error('Public prewriter issue ID is malformed');
  return { issue_id: action.issue_id, request: parseSessionBridgeRequest(action.request) };
}

function parsePublicActions(value: unknown): readonly PublicPrewriterAction[] {
  return parseIssueEnvelope(value).map(parsePrewriterAction);
}

function currentSnapshot(input: PublicPrewriterInput): MastraSessionLedgerSnapshot {
  const snapshot = input.sync();
  if (!snapshot) throw new Error('Public correction fixture journal is unavailable');
  if (
    snapshot.state.workspace_id !== input.work.workspace_id ||
    snapshot.state.work_id !== input.workId ||
    snapshot.state.attempt !== input.attempt ||
    snapshot.state.run_id !== input.work.execution.run_id
  )
    throw new Error('Public correction fixture journal identity differs');
  return snapshot;
}

function expectedVersionArguments(args: readonly string[], snapshot: MastraSessionLedgerSnapshot): string[] {
  return [
    ...args,
    '--expected-revision',
    String(snapshot.version.revision),
    '--expected-digest',
    snapshot.version.digest,
  ];
}

function assertPrewriterActions(actions: readonly PublicPrewriterAction[]): void {
  if (actions.length === 0) throw new Error('Public Source prewriter wave has no issued actions');
  for (const action of actions) {
    if (action.request.stage_id !== 'review_source_prewrite')
      throw new Error('Public issue omitted the configured prewriter');
    if (action.request.workflow_id !== 'task_execution') throw new Error('Public prewriter workflow differs');
  }
}

function assertJournalMatchesActions(
  actions: readonly PublicPrewriterAction[],
  snapshot: MastraSessionLedgerSnapshot,
): void {
  const items = snapshot.state.items;
  if (items.length !== actions.length) throw new Error('Public prewriter wave differs from the synchronized journal');
  for (const action of actions) {
    const item = items.find((candidate) => candidate.request.action_id === action.request.action_id);
    if (
      !item ||
      item.issue_id !== action.issue_id ||
      canonicalJsonDigest(item.request) !== canonicalJsonDigest(action.request)
    )
      throw new Error('Public prewriter action differs from its current journal item');
  }
}

function preparationKind(role: string): PreparationKind {
  if (role === 'source-planner') return 'source_plan';
  if (role === 'security-prewriter') return 'implementation_policy';
  throw new Error('Configured Source prewriter role has no typed preparation kind');
}

function preparationObservations(kind: PreparationKind, evidenceRef: string): PreparationRecord['observations'] {
  if (kind === 'source_plan')
    return [
      {
        mechanic: 'scope_acceptance_trace',
        actual: 'The admitted implementation path and acceptance criteria match the current scope.',
        evidence_ref: evidenceRef,
      },
      {
        mechanic: 'verification_rollback',
        actual: 'Focused verification and source restoration are identified for this scoped change.',
        evidence_ref: evidenceRef,
      },
    ];
  return [
    {
      mechanic: 'root_cause_owner',
      actual: 'The current correction request identifies the root cause and owning component.',
      evidence_ref: evidenceRef,
    },
    {
      mechanic: 'affected_callers',
      actual: 'Affected callers within the accepted change are identified.',
      evidence_ref: evidenceRef,
    },
    {
      mechanic: 'existing_primitives',
      actual: 'Existing Host and filesystem coordination primitives are retained.',
      evidence_ref: evidenceRef,
    },
    {
      mechanic: 'prewriter_security_gate',
      actual: 'The exact scoped write and its pre-effect gates are preserved.',
      evidence_ref: evidenceRef,
    },
  ];
}

/** These controlled test observations advance the required stage; they are not runtime authorization evidence. */
function controlledPreparation(
  action: PublicPrewriterAction,
  input: PublicPrewriterInput,
  attempt: number,
): PreparationRecord {
  const kind = preparationKind(action.request.role),
    evidenceRef = 'local://correction-prewriter/' + action.issue_id;
  return lifecyclePreparationObservationSchema.parse({
    schema: 'LifecyclePreparationObservation/v1',
    record_id: kind + '-' + action.request.action_id,
    kind,
    work_id: input.workId,
    attempt,
    source_revision: input.work.binding.work_source_revision,
    scope_id: input.work.binding.scope_id,
    config_digest: input.work.binding.config_digest,
    ac_ids: input.work.binding.ac_ids,
    observed_at: new Date().toISOString(),
    observer_id: 'fixture:correction-prewriter-' + action.request.assignment_index,
    status: 'pass',
    evidence_refs: [evidenceRef],
    observations: preparationObservations(kind, evidenceRef),
    gaps: [],
  });
}

function reportedObservation(action: PublicPrewriterAction, preparation: PreparationRecord): SessionBridgeObservation {
  const summary = JSON.stringify(preparation);
  return {
    schema: 'VidaSessionObservation/v1',
    action_id: action.request.action_id,
    issue_id: action.issue_id,
    agent_id: preparation.observer_id,
    tool_call_ref: 'fixture:correction-prewriter-call-' + action.issue_id,
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: preparation.evidence_refs,
  };
}

function assertReported(snapshot: MastraSessionLedgerSnapshot, observation: SessionBridgeObservation): void {
  const items = [...snapshot.state.items, ...snapshot.state.completed.flatMap((wave) => wave.items)],
    item = items.find((candidate) => candidate.request.action_id === observation.action_id);
  if (
    !item ||
    item.issue_id !== observation.issue_id ||
    canonicalJsonDigest(item.observation) !== canonicalJsonDigest(observation)
  )
    throw new Error('Public prewriter report was not synchronized exactly');
}

async function reportPrewriterAction(
  action: PublicPrewriterAction,
  input: PublicPrewriterInput,
): Promise<MastraSessionLedgerSnapshot> {
  const current = currentSnapshot(input),
    preparation = controlledPreparation(action, input, current.state.attempt),
    observation = reportedObservation(action, preparation),
    reportPath = '.agent/work/' + input.workId + '/prewriter-report-' + action.request.assignment_index + '.json';
  return reportControlledObservation(input, current, observation, reportPath);
}

async function reportControlledObservation(
  input: PublicPrewriterInput,
  current: MastraSessionLedgerSnapshot,
  observation: SessionBridgeObservation,
  reportPath: string,
): Promise<MastraSessionLedgerSnapshot> {
  requireSafeRepositoryAccess(input.repositoryRoot).writeExclusive(
    reportPath,
    JSON.stringify(observation),
    'controlled public stage fixture report',
  );
  await input.publicRun(
    expectedVersionArguments([...input.args, '--report', resolve(input.repositoryRoot, reportPath)], current),
  );
  const reported = currentSnapshot(input);
  if (reported.version.revision <= current.version.revision)
    throw new Error('Public stage report did not advance the journal');
  assertReported(reported, observation);
  return reported;
}

export async function runTaskSynthesisPublicActions(input: PublicPrewriterInput): Promise<MastraSessionLedgerSnapshot> {
  const current = currentSnapshot(input),
    envelope = await input.publicRun(expectedVersionArguments([...input.args, '--issue-wave', 'true'], current)),
    actions = parsePublicActions(envelope),
    action = actions[0];
  if (
    actions.length !== 1 ||
    !action ||
    action.request.stage_id !== 'synthesize_task' ||
    action.request.workflow_id !== 'task_execution'
  )
    throw new Error('Public task synthesis omitted the configured action');
  const issued = currentSnapshot(input);
  assertJournalMatchesActions(actions, issued);
  // Controlled stage observation for fixture advancement, not independent review or Runtime acceptance.
  const summary = 'The accepted task and scope are ready for current Source planning.',
    observation: SessionBridgeObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: action.request.action_id,
      issue_id: action.issue_id,
      agent_id: 'fixture:' + action.request.role,
      tool_call_ref: 'fixture:task-synthesis',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: [],
    };
  return reportControlledObservation(
    input,
    issued,
    observation,
    '.agent/work/' + input.workId + '/synthesis-report.json',
  );
}

export async function runPreparationFixtureInProcess(
  input: PublicPrewriterInput,
  producer: {
    readonly ledger: MastraSessionLedger;
    readonly bridge: MastraSessionBridge;
    readonly source: ScopedSourceSnapshot;
  },
  tracePhase?: <T>(label: string, operation: () => T | Promise<T>) => Promise<Awaited<T>>,
): Promise<MastraSessionLedgerSnapshot> {
  const current = currentSnapshot(input),
    synthIssue = tracePhase
      ? await tracePhase('synthesis-issue-wave', () =>
          producer.ledger.issueWave(input.workId, input.attempt, current.version),
        )
      : producer.ledger.issueWave(input.workId, input.attempt, current.version),
    synthItem = synthIssue.state.items[0];
  if (!synthItem?.issue_id || synthItem.request.stage_id !== 'synthesize_task')
    throw new Error('In-process preparation fixture omitted task synthesis');
  const synthesisSummary = 'The accepted task and scope are ready for current Source planning.';
  const synthesisObservation: SessionBridgeObservation = {
    schema: 'VidaSessionObservation/v1',
    action_id: synthItem.request.action_id,
    issue_id: synthItem.issue_id,
    agent_id: 'fixture:' + synthItem.request.role,
    tool_call_ref: 'fixture:task-synthesis',
    status: 'reported_complete',
    summary: synthesisSummary,
    output_digest: canonicalJsonDigest(synthesisSummary),
    evidence_refs: [],
  };
  if (tracePhase)
    await tracePhase('synthesis-report', () =>
      producer.ledger.report(input.workId, input.attempt, synthIssue.version, synthesisObservation, producer.source),
    );
  else producer.ledger.report(input.workId, input.attempt, synthIssue.version, synthesisObservation, producer.source);
  const synthStep = current.state.step_id;
  if (!synthStep) throw new Error('In-process preparation fixture has no task-synthesis step');
  if (tracePhase)
    await tracePhase('synthesis-bridge-resume', () =>
      producer.bridge.resume(synthStep, [synthesisObservation], producer.source),
    );
  else await producer.bridge.resume(synthStep, [synthesisObservation], producer.source);

  const prewriter = currentSnapshot(input),
    prewriterIssue = tracePhase
      ? await tracePhase('prewriter-issue-wave', () =>
          producer.ledger.issueWave(input.workId, input.attempt, prewriter.version),
        )
      : producer.ledger.issueWave(input.workId, input.attempt, prewriter.version),
    actions = prewriterIssue.state.items.map((item) => {
      if (!item.issue_id) throw new Error('In-process preparation fixture omitted prewriter issuance');
      return { issue_id: item.issue_id, request: parseSessionBridgeRequest(item.request) };
    });
  assertPrewriterActions(actions);
  let report = prewriterIssue;
  const observations = tracePhase
    ? await tracePhase('prewriter-observation-build', () =>
        actions.map((action) => reportedObservation(action, controlledPreparation(action, input, input.attempt))),
      )
    : actions.map((action) => reportedObservation(action, controlledPreparation(action, input, input.attempt)));
  const reportObservations = () => {
    for (const observation of observations)
      report = producer.ledger.report(input.workId, input.attempt, report.version, observation, producer.source);
  };
  if (tracePhase) await tracePhase('prewriter-reports', reportObservations);
  else reportObservations();
  const prewriterStep = prewriter.state.step_id;
  if (!prewriterStep) throw new Error('In-process preparation fixture has no Source-prewriter step');
  if (tracePhase)
    await tracePhase('prewriter-bridge-resume', () =>
      producer.bridge.resume(prewriterStep, observations, producer.source),
    );
  else await producer.bridge.resume(prewriterStep, observations, producer.source);
  const prepared = tracePhase
    ? await tracePhase('prepared-writer-snapshot', () => currentSnapshot(input))
    : currentSnapshot(input);
  if (!prepared.state.items.some((item) => item.request.stage_id === 'develop_task'))
    throw new Error('In-process preparation fixture did not reach the configured writer stage');
  return prepared;
}

export async function runSourcePrewriterPublicActions(
  input: PublicPrewriterInput,
): Promise<MastraSessionLedgerSnapshot> {
  const current = currentSnapshot(input),
    envelope = await input.publicRun(expectedVersionArguments([...input.args, '--issue-wave', 'true'], current)),
    actions = parsePublicActions(envelope);
  assertPrewriterActions(actions);
  const issued = currentSnapshot(input);
  assertJournalMatchesActions(actions, issued);
  let reported = issued;
  for (const action of actions) reported = await reportPrewriterAction(action, input);
  return reported;
}
