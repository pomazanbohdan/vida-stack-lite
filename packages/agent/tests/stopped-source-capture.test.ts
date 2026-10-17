import { expectRejection } from './helpers/expect-rejection.ts';
import { test as bunTest, expect, afterAll, beforeAll, describe } from 'bun:test';
import { Database } from 'bun:sqlite';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  type WorkItemSelection,
} from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { openHostStateDatabase, inspectHostWorkspaceDatabase } from '../src/host-state.ts';
import type { HostStateSnapshot, RetiredSourceCaptureRequest } from '../src/host-state.ts';
import { sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import { readAdmittedSessionIntake } from '../src/orchestration/admitted-session-execution.ts';
import {
  openConfiguredMastraSessionLedger,
  type MastraSessionLedgerSnapshot,
} from '../src/orchestration/persistent-session-handoff.ts';
import { MastraSessionBridge, sessionBridgeDatabasePath } from '../src/orchestration/mastra-session-bridge.ts';
import type { WorkflowSessionReservation } from '../src/runtime-kernel.ts';
import { suspendLocalWork, suspendCompletedReadOnlyWork } from '../src/orchestration/suspend-local-work.ts';
import { run } from '../bin/run.ts';
import { bindControlledRuntimeInitialization } from './helpers/controlled-runtime-initialization-fixture.ts';
import { runTaskSynthesisPublicActions, runSourcePrewriterPublicActions } from './helpers/public-prewriter-fixture.ts';
import { createPublicCliFixturePhaseMarker } from './helpers/public-cli-fixture-runner.ts';
import { containedControllerFixture, type ContainedControllerFixture } from './contained-controller-fixture.ts';
import { snapshotRuntimePackageSources } from '../src/orchestration/scoped-source-snapshot.ts';

type ExecutionBudget = ReturnType<ContainedControllerFixture['caseBudget']>;
type SessionLedger = ReturnType<typeof openConfiguredMastraSessionLedger>;
type SessionObservation = NonNullable<MastraSessionLedgerSnapshot['state']['items'][number]['observation']>;
type StoppedCaptureRequest = Parameters<SessionLedger['hostState']['captureStoppedSourceObservation']>[0];
type StoppedCaptureOperation = Mutable<Omit<StoppedCaptureRequest, 'verifyCurrent' | 'fault'>>;
type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };
type RetiredCaptureOperation = Mutable<Omit<RetiredSourceCaptureRequest, 'verifyCurrent' | 'fault'>>;
type WorkflowReservation = WorkflowSessionReservation;

interface JsonRecord {
  [key: string]: unknown;
}

interface RetiredTurnArtifact extends JsonRecord {
  data: {
    turns: Array<{ items: JsonRecord[] }>;
    thread: JsonRecord;
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRetiredTurnArtifact(value: unknown): value is RetiredTurnArtifact {
  if (!isRecord(value) || !isRecord(value.data)) return false;
  const data = value.data;
  if (!isUnknownArray(data.turns) || !isRecord(data.thread)) return false;
  return data.turns.every(
    (turn: unknown) =>
      isRecord(turn) && isUnknownArray(turn.items) && turn.items.every((item: unknown) => isRecord(item)),
  );
}

function caseBudgetValue(): ExecutionBudget {
  if (!caseBudget) throw new Error('Contained controller case budget is unavailable.');
  return caseBudget;
}

function workflowReservation(value: WorkflowReservation | undefined): WorkflowReservation {
  if (!value) throw new Error('Writer fixture did not reserve its configured workflow assignment.');
  return value;
}

function at<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`${label} is missing.`);
  return value;
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`${label} is missing.`);
  return value;
}

type CompleteHostSnapshot = HostStateSnapshot & {
  readonly work: NonNullable<HostStateSnapshot['work']>;
  readonly ledger: NonNullable<HostStateSnapshot['ledger']>;
  readonly workVersion: NonNullable<HostStateSnapshot['workVersion']>;
  readonly ledgerVersion: NonNullable<HostStateSnapshot['ledgerVersion']>;
};

function completeHost(snapshot: HostStateSnapshot): CompleteHostSnapshot {
  const { work, ledger, workVersion, ledgerVersion } = snapshot;
  if (!work || !ledger || !workVersion || !ledgerVersion) throw new Error('Fixture Host snapshot is incomplete.');
  return { ...snapshot, work, ledger, workVersion, ledgerVersion };
}

type LedgerSnapshot = NonNullable<ReturnType<SessionLedger['resume']>>;
type ConfigModule = { runtimePackageAccess: typeof runtimePackageAccess };
type SnapshotModule = { snapshotRuntimePackageSources: typeof snapshotRuntimePackageSources };
type RunModule = { run: typeof run };

function isConfigModule(value: unknown): value is ConfigModule {
  return isRecord(value) && typeof value.runtimePackageAccess === 'function';
}

function isSnapshotModule(value: unknown): value is SnapshotModule {
  return isRecord(value) && typeof value.snapshotRuntimePackageSources === 'function';
}

function isRunModule(value: unknown): value is RunModule {
  return isRecord(value) && typeof value.run === 'function';
}

function currentJournal(ledger: SessionLedger, workId: string, attempt: number): LedgerSnapshot {
  const snapshot = ledger.resume(workId, attempt);
  if (!snapshot) throw new Error(`Session journal ${workId}/${attempt} is missing.`);
  return snapshot;
}

async function publicRun(args: string[], runner: typeof run = run): Promise<JsonRecord> {
  const result: unknown = await runner(args);
  if (!isRecord(result)) throw new Error('Public run returned a non-object result.');
  return result;
}

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let containedPackage: ContainedControllerFixture | undefined;
let candidateBinding: string | undefined;
const cleanupHookOptions: { timeout: number } = { timeout: 15000 };
let caseBudget: ExecutionBudget | undefined;
let containedCasesInFlight = 0;
let deferFixtureCleanup = false;
let activeConsumerRoots: string[] = [];
const successfulConsumerRoots: string[] = [];
const retainedConsumerRoots: string[] = [];
const phaseReceipt = process.env.VIDA_STOPPED_SOURCE_PHASE_LOG;
const markPhase = phaseReceipt === undefined ? undefined : createPublicCliFixturePhaseMarker(phaseReceipt);
function candidateBindingValue(): string {
  if (!candidateBinding) throw new Error('Contained controller binding is unavailable.');
  return candidateBinding;
}
function ensureContainedPackage(): ContainedControllerFixture {
  if (!containedPackage) {
    containedPackage = containedControllerFixture(bundle);
    candidateBinding = containedPackage.binding;
  }
  return containedPackage;
}
function test(
  name: string,
  body: () => Promise<void>,
  timeout: number,
  { sourceOnly = false }: { sourceOnly?: boolean } = {},
): void {
  const ownedBody = async () => {
    containedCasesInFlight += 1;
    const priorDeferCleanup = deferFixtureCleanup,
      priorActiveRoots = activeConsumerRoots,
      caseRoots: string[] = [];
    deferFixtureCleanup = true;
    activeConsumerRoots = caseRoots;
    try {
      let primaryFailure: unknown;
      let hasPrimaryFailure = false;
      try {
        await body();
      } catch (error) {
        primaryFailure = error;
        hasPrimaryFailure = true;
      }
      let cleanupFailure: unknown;
      let hasCleanupFailure = false;
      try {
        if (!sourceOnly) ensureContainedPackage().assertUnchanged();
      } catch (error) {
        cleanupFailure = error;
        hasCleanupFailure = true;
      }
      const keep = hasPrimaryFailure || hasCleanupFailure || (!sourceOnly && ensureContainedPackage().retained);
      if (keep) {
        if (!sourceOnly && (hasCleanupFailure || ensureContainedPackage().retained)) ensureContainedPackage().retain();
        retainedConsumerRoots.push(...caseRoots);
        for (const root of caseRoots) console.warn('Failed or uncertain consumer fixture retained: ' + root);
      } else {
        successfulConsumerRoots.push(...caseRoots);
      }
      if (hasPrimaryFailure && hasCleanupFailure)
        throw new AggregateError([primaryFailure, cleanupFailure], 'Test body and package custody check both failed.');
      if (hasPrimaryFailure) throw primaryFailure;
      if (hasCleanupFailure) throw cleanupFailure;
    } finally {
      containedCasesInFlight -= 1;
      deferFixtureCleanup = priorDeferCleanup;
      activeConsumerRoots = priorActiveRoots;
    }
  };
  if (sourceOnly) {
    bunTest(name, ownedBody, timeout);
    return;
  }
  describe(() => {
    beforeAll(() => {
      const fixturePackage = ensureContainedPackage();
      caseBudget = fixturePackage.caseBudget();
      fixturePackage.assertUnchanged();
      caseBudgetValue().remaining();
    }, 60000);
    bunTest(name, ownedBody, timeout);
  });
}
afterAll(() => {
  if (containedCasesInFlight > 0) {
    containedPackage?.retain();
    for (const root of activeConsumerRoots) console.warn('Timed-out consumer fixture retained: ' + root);
    for (const root of successfulConsumerRoots)
      console.warn('Consumer fixture retained while a case is in flight: ' + root);
    return containedPackage?.close();
  }
  if (retainedConsumerRoots.length > 0) {
    containedPackage?.retain();
    for (const root of retainedConsumerRoots) console.warn('Consumer fixture retained for failure review: ' + root);
  }
  return (async () => {
    for (const [index, root] of successfulConsumerRoots.entries()) {
      try {
        await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      } catch (error) {
        containedPackage?.retain();
        console.error('Successful consumer fixture cleanup failed; retained: ' + root, error);
        for (const pendingRoot of successfulConsumerRoots.slice(index + 1))
          console.warn('Consumer fixture cleanup not attempted; retained: ' + pendingRoot);
        throw error;
      }
    }
    await containedPackage?.close();
  })();
}, cleanupHookOptions);
function copiedRun(args: string[]): JsonRecord {
  if (!containedPackage) throw new Error('Contained controller fixture is unavailable.');
  const result = containedPackage.run(args, caseBudgetValue());
  if (!isRecord(result.payload)) throw new Error('Contained run payload is not a JSON object.');
  if (result.status !== 0)
    throw new Error(typeof result.payload.message === 'string' ? result.payload.message : 'Contained run failed.');
  return result.payload;
}
function jsonText(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error('Fixture JSON value is not serializable.');
  return encoded;
}

const writeJson = (root: string, file: string, value: unknown): void => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  writeFileSync(path.join(root, file), jsonText(value));
};

async function fixture({ writer = true }: { writer?: boolean } = {}) {
  markPhase?.('fixture:start');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-stopped-source-'));
  if (deferFixtureCleanup) activeConsumerRoots.push(root);
  writeFileSync(
    path.join(root, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'stopped-source-repository')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent'),
  );
  writeFileSync(path.join(root, 'AGENTS.md'), 'Synthetic fixture policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic source preimage');
  writeJson(root, 'docs/agent-instructions/documentation-policy.v1.json', {
    schema: 'DocumentationPolicy/v1',
    policy_id: 'synthetic-stopped-policy',
    project_id: 'sample',
    source_path: 'docs/agent-instructions/documentation-policy.v1.json',
    owner: 'synthetic-fixture',
    required: false,
    canonical_roots: ['docs'],
    map_paths: ['AGENT.sidecar.md'],
    excluded_roots: [],
    changelog_required: false,
    changelog_path: null,
    relations: ['documents'],
    updated_at: new Date().toISOString(),
  });
  const config = loadRuntimeConfig(root),
    workspace = deriveWorkspaceId(config.repository.repository_id, root),
    ledger = openConfiguredMastraSessionLedger(root),
    store = ledger.hostState;
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: 'task',
    intent: 'task_execution',
    project: 'sample',
    risk_flags: [],
    labels: [],
  };
  function admission(id: string = 'stopped', file: string = 'AGENT.sidecar.md', thread: string = 'synthetic-owner') {
    markPhase?.('admission:' + id + ':setup');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [file]),
      scopePath = `.agent/work/${id}/scope.json`,
      acceptancePath = `.agent/work/${id}/acceptance.json`,
      ac = 'AC-' + id;
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + id,
      work_id: id,
      source_revision: source.digest,
      ac_ids: [ac],
      allowed_paths: [file],
      implementation_paths: [file],
      documentation_paths: [],
      changed_symbols: [],
      non_goals: ['Runtime acceptance'],
      acceptance_trace: [ac],
      behavior_trace: ['SR-' + id],
      test_trace: ['synthetic fixture'],
      diagnostic_trace: ['synthetic fixture'],
      attribution: { thread_id: thread, pointer: 'synthetic-request:' + id },
      owner: 'synthetic-fixture',
      created_at: new Date().toISOString(),
    };
    writeJson(root, scopePath, scope);
    writeJson(root, acceptancePath, {
      schema: 'AcceptanceManifest/v1',
      id: 'acceptance-' + id,
      version: 1,
      ac_ids: [ac],
      source: file,
      scope: scope.scope_id,
      source_revision: source.digest,
      contracts: [
        {
          id: ac,
          definition: 'Preserve original terminal failure without acceptance',
          sr: 'SR-' + id,
          evidence: ['synthetic fixture'],
        },
      ],
    });
    const authorizationPath = `.agent/work/${id}/authorization.json`;
    writeJson(root, authorizationPath, {
      schema: 'LocalSourceWriteAuthorization/v1',
      action: 'source.write',
      user_instruction_ref: 'synthetic-request:' + id,
      work_id: id,
      attempt: 1,
      scope_digest: source.digest,
      config_digest: runtimeConfigDigest(config),
      workflow_id: 'task_execution',
      stage_ids: ['develop_task'],
      implementation_paths: [file],
      native_session_handle: thread,
    });
    const input = {
      repositoryRoot: root,
      config,
      store,
      selection,
      context: { work_id: id, attempt: 1, scope_digest: source.digest },
      nativeSessionHandle: thread,
      workItem: {
        schema: 'WorkItem/v1',
        id,
        canonical_kind: 'task',
        intent: 'task_execution',
        project_id: 'sample',
        title: 'Synthetic stopped fixture ' + id,
        description: 'Synthetic boundary fixture',
        risk_flags: [],
        labels: [],
        provider: 'local',
        provider_type: 'Task',
      },
      scopePath,
      acceptancePath,
      sourceAuthorizationPath: authorizationPath,
      runtimeCodePaths: ['vida-agent/bin/run.ts'],
      route: 'R2',
      risk: 'low',
      changeKind: 'feature',
      intakePath: `.agent/work/${id}/raw-intake.json`,
    } satisfies Parameters<typeof admitLocalSessionWork>[0];
    writeJson(root, input.intakePath, {
      schema: 'VidaLocalSessionIntake/v1',
      work_item: input.workItem,
      native_session_handle: thread,
      scope_path: scopePath,
      acceptance_path: acceptancePath,
      source_authorization_path: authorizationPath,
      runtime_code_paths: input.runtimeCodePaths,
      route: input.route,
      risk: input.risk,
      change_kind: input.changeKind,
    });
    markPhase?.('admission:' + id + ':admit');
    const admitted = admitLocalSessionWork(input),
      work = required(admitted.host.work, 'Admitted Host work'),
      identity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: id,
      };
    markPhase?.('admission:' + id + ':end');
    return { input, source, identity, admitted };
  }
  const extraBridges: MastraSessionBridge[] = [];
  const original = admission(),
    { input, identity, source } = original;
  const bridge = await MastraSessionBridge.open({
    ledger,
    projectIds: [selection.project],
    repositoryRoot: root,
    config,
    selection,
    context: input.context,
    workflowId: 'task_execution',
    workspaceId: workspace,
  });
  await bridge.start(source);
  const sync = () => currentJournal(ledger, 'stopped', 1);
  const args = [
    '--project-root',
    root,
    '--repository',
    config.repository.repository_id,
    '--project',
    selection.project,
    '--work-path',
    'AGENT.sidecar.md',
    '--work-id',
    input.context.work_id,
    '--attempt',
    String(input.context.attempt),
    '--scope-digest',
    source.digest,
    '--team',
    selection.team,
    '--kind',
    selection.kind,
    '--intent',
    selection.intent,
    '--workflow',
    'task_execution',
  ];
  const publicFixture = {
    args,
    publicRun,
    sync,
    repositoryRoot: root,
    workId: input.context.work_id,
    attempt: input.context.attempt,
    work: required(original.admitted.host.work, 'Admitted public fixture work'),
  };
  markPhase?.('fixture:bind-runtime');
  await bindControlledRuntimeInitialization(root, config, store);
  markPhase?.('fixture:task-synthesis');
  let journal = await runTaskSynthesisPublicActions(publicFixture);
  const readonlyObservation = required(
    at(journal.state.completed, 0, 'Completed readonly wave').items[0]?.observation,
    'Completed readonly observation',
  );
  let reservation: WorkflowReservation | undefined;
  if (writer) {
    markPhase?.('fixture:source-prewriter');
    journal = await runSourcePrewriterPublicActions(publicFixture);
    markPhase?.('fixture:issue-wave');
    await publicRun([
      ...args,
      '--issue-wave',
      'true',
      '--expected-revision',
      String(journal.version.revision),
      '--expected-digest',
      journal.version.digest,
    ]);
    journal = sync();
    const item = at(journal.state.items, 0, 'Issued writer action');
    if (item.request.stage_id !== 'develop_task' || item.issue_id === null)
      throw new Error('Public fixture did not issue its configured writer');
    reservation = required(item.host_reservation, 'Kernel-produced writer reservation');
  }
  markPhase?.('fixture:ready');
  const databasePath = sessionHandoffDatabaseRelativePath(config);
  const inspect = () => inspectHostWorkspaceDatabase(root, databasePath, workspace);
  const ddl = () => {
    const db = openHostStateDatabase(root, databasePath, workspace);
    try {
      return db.query('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name').all();
    } finally {
      closeWorkspaceDatabaseWithAdmission(db);
    }
  };
  async function close(): Promise<void> {
    for (const extra of extraBridges) await extra.close();
    await bridge.close();
    ledger.close();
    if (deferFixtureCleanup) return;
    try {
      await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (error) {
      if (!isRecord(error) || error.code !== 'EBUSY') throw error;
      console.warn('Fixture cleanup deferred (closed SQLite handles, OS EBUSY): ' + root);
    }
  }
  async function laterWriter(id: string, file: string) {
    markPhase?.('later-writer:' + id + ':start');
    if (file !== 'AGENT.sidecar.md') writeFileSync(path.join(root, file), 'Synthetic disjoint source');
    const next = admission(id, file, 'synthetic-' + id);
    markPhase?.('later-writer:' + id + ':bridge-open');
    const nextBridge = await MastraSessionBridge.open({
      ledger,
      projectIds: [selection.project],
      repositoryRoot: root,
      config,
      selection,
      context: next.input.context,
      workflowId: 'task_execution',
      workspaceId: workspace,
    });
    extraBridges.push(nextBridge);
    await nextBridge.start(next.source);
    const nextSync = () => currentJournal(ledger, id, 1),
      nextPublicFixture = {
        args: [
          '--project-root',
          root,
          '--repository',
          config.repository.repository_id,
          '--project',
          selection.project,
          '--work-path',
          file,
          '--work-id',
          id,
          '--attempt',
          '1',
          '--scope-digest',
          next.source.digest,
          '--team',
          selection.team,
          '--kind',
          selection.kind,
          '--intent',
          selection.intent,
          '--workflow',
          'task_execution',
        ],
        publicRun,
        sync: nextSync,
        repositoryRoot: root,
        workId: id,
        attempt: 1,
        work: required(next.admitted.host.work, 'Later public fixture work'),
      };
    markPhase?.('later-writer:' + id + ':task-synthesis');
    let nextJournal = await runTaskSynthesisPublicActions(nextPublicFixture);
    markPhase?.('later-writer:' + id + ':source-prewriter');
    nextJournal = await runSourcePrewriterPublicActions(nextPublicFixture);
    markPhase?.('later-writer:' + id + ':issue-wave');
    await publicRun([
      ...nextPublicFixture.args,
      '--issue-wave',
      'true',
      '--expected-revision',
      String(nextJournal.version.revision),
      '--expected-digest',
      nextJournal.version.digest,
    ]);
    nextJournal = nextSync();
    const host = completeHost(store.readHostStateSnapshot(next.identity));
    markPhase?.('later-writer:' + id + ':acquire-source-lease');
    acquireLocalSourceWriterLease({
      repositoryRoot: root,
      config,
      store,
      identity: next.identity,
      nativeSessionHandle: next.input.nativeSessionHandle,
      stageId: 'develop_task',
      assignmentIndex: 0,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedSessionJournal: { attempt: 1, version: nextJournal.version },
    });
    markPhase?.('later-writer:' + id + ':end');
    return { ...next, journal: nextJournal };
  }
  function captureInput({ containedReviews = true }: { containedReviews?: boolean } = {}) {
    markPhase?.('capture-input:start');
    const host = completeHost(store.readHostStateSnapshot(identity)),
      current = currentJournal(ledger, 'stopped', 1),
      pending = at(current.state.items, 0, 'Pending stopped-source action');
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic partial candidate bytes');
    const candidate = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']);
    const terminalRef = '.agent/work/stopped/synthetic-terminal.json',
      ownerRef = '.agent/work/stopped/synthetic-owner-manifest.json',
      summary = 'Synthetic partial stopped Source outcome';
    const observation: SessionObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: pending.request.action_id,
      issue_id: required(pending.issue_id, 'Stopped-source action issue'),
      host_attempt_id: workflowReservation(reservation).receipt.attempt.attempt_id,
      agent_id: 'synthetic-native-writer',
      tool_call_ref: 'local:synthetic-stopped',
      status: 'reported_failed',
      summary,
      output_digest: canonicalJsonDigest(summary),
      changed_paths: ['AGENT.sidecar.md'],
      evidence_refs: [terminalRef],
    };
    writeJson(root, terminalRef, {
      schema: 'RootObservedStoppedSource/v1',
      status: 'partial_stopped',
      actor: observation.agent_id,
      action_id: observation.action_id,
      issue_id: observation.issue_id,
      host_attempt_id: observation.host_attempt_id,
      observation_ref: terminalRef,
      native_status: 'completed',
      source_turn_id: 'synthetic-original-turn',
      final_message_id: 'synthetic-final-message',
      current_tmp_only_turn_id: 'synthetic-maintenance-turn',
      owner_thread_id: input.nativeSessionHandle,
    });
    const operation: StoppedCaptureOperation = {
      identity,
      attempt: 1,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedJournal: current.version,
      nativeSessionHandle: input.nativeSessionHandle,
      observation,
      terminalEvidence: {
        schema: 'StoppedSourceTerminalEvidence/v1',
        native_actor: observation.agent_id,
        observation_ref: terminalRef,
        owner_decision_ref: ownerRef,
        terminal: 'partial_stopped',
      },
      candidateSnapshot: {
        schema: 'UnverifiedSourceSnapshot/v1',
        entries: candidate.entries.map((entry) => ({
          path: entry.path,
          sha256: required(entry.sha256, 'Candidate source digest'),
          size: required(entry.bytes, 'Candidate source size'),
        })),
      },
    };
    if (containedReviews) {
      const requestDigest = canonicalJsonDigest(operation);
      const reviews = [0, 1, 2].map((index) => ({
        actor_id: 'synthetic-candidate-reviewer-' + index,
        history_ref: 'synthetic-history-' + index,
        tool_call_ref: 'local:synthetic-candidate-review-' + index,
        verdict: 'pass',
        candidate_binding: candidateBindingValue(),
        receipt_ref: '.agent/work/stopped/synthetic-review-' + index + '.json',
      }));
      for (const review of reviews)
        writeJson(root, review.receipt_ref, {
          schema: 'StoppedSourceCandidateReview/v1',
          ...review,
          request_digest: requestDigest,
        });
      writeJson(root, ownerRef, {
        schema: 'StoppedSourceCaptureAuthorization/v1',
        action: 'source.capture-failed-and-release',
        owner_thread_id: input.nativeSessionHandle,
        request_digest: requestDigest,
        candidate_binding: candidateBindingValue(),
        source_turn_id: 'synthetic-original-turn',
        status: 'approved_exact_manifest',
        reviews,
      });
    }
    const requestRef = '.agent/work/stopped/capture-request.json';
    writeJson(root, requestRef, { workspace_id: workspace, ...operation });
    const verifyCurrent = () => {
      expect(
        snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']),
        'Synthetic stopped-source candidate differs',
      ).toEqual(candidate);
      expect(loadRuntimeConfig(root)).toEqual(config);
      const terminal: unknown = JSON.parse(readFileSync(path.join(root, terminalRef), 'utf8'));
      expect(isRecord(terminal) ? terminal.actor : undefined).toBe(observation.agent_id);
    };
    markPhase?.('capture-input:end');
    return {
      operation,
      requestRef,
      verifyCurrent,
      cli: (mode: 'inspect' | 'plan' | 'apply' | 'resume') =>
        copiedRun([
          '--capture-stopped-source',
          'true',
          '--mode',
          mode,
          '--project-root',
          root,
          '--request',
          requestRef,
        ]),
    };
  }
  function retireOwner() {
    const host = completeHost(store.readHostStateSnapshot(identity)),
      journal = currentJournal(ledger, 'stopped', 1),
      item = at(journal.state.items, 0, 'Retired-source action');
    return store.retireInterruptedSourceOwner({
      identity,
      attempt: 1,
      actionId: item.request.action_id,
      issueId: required(item.issue_id, 'Retired-source action issue'),
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedJournal: journal.version,
      expectedMaintenanceGeneration: host.maintenanceGeneration,
      authorization: required(workflowReservation(reservation).authorization, 'Writer approval authorization'),
      operatorHandle: input.nativeSessionHandle,
      decisionPointer: 'synthetic:retired-source-capture-owner-release',
      evidence: {
        schema: 'InterruptedSourceRetirementEvidence/v1',
        source_thread_id: 'synthetic-original-turn',
        source_thread_status: 'interrupted',
        read_thread_ref: 'synthetic:original-turn-interrupted',
        list_agents_ref: 'synthetic:no-active-source-writers',
        active_source_writer_ids: [],
      },
    });
  }
  function retiredCaptureInput(retirement: ReturnType<typeof retireOwner>) {
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Synthetic partial candidate bytes');
    const candidate = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md']),
      host = completeHost(store.readHostStateSnapshot(identity)),
      journal = currentJournal(ledger, 'stopped', 1),
      item = at(journal.state.items, 0, 'Retired-source action'),
      issueId = required(item.issue_id, 'Retired-source action issue'),
      summary = 'Synthetic original Source turn was interrupted after a partial write',
      observation: SessionObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: item.request.action_id,
        issue_id: issueId,
        host_attempt_id: workflowReservation(reservation).receipt.attempt.attempt_id,
        agent_id: 'synthetic-native-writer',
        tool_call_ref: 'local:synthetic-retired-source-write',
        status: 'reported_failed',
        summary,
        output_digest: canonicalJsonDigest(summary),
        changed_paths: ['AGENT.sidecar.md'],
        evidence_refs: ['local:synthetic-retired-source-write'],
      },
      sourceThreadId = 'synthetic-native-source-thread',
      sourceTurnId = 'synthetic-original-turn',
      terminalEvidence: RetiredSourceCaptureRequest['terminalEvidence'] = {
        schema: 'RetiredSourceTerminalEvidence/v1',
        source_thread_id: sourceThreadId,
        source_thread_status: 'notLoaded',
        source_turn_status: 'interrupted',
        source_turn_id: sourceTurnId,
        operator_thread_id: input.nativeSessionHandle,
        original_actor_id: observation.agent_id,
        final_message_id: null,
        action_id: item.request.action_id,
        issue_id: issueId,
        host_attempt_id: required(observation.host_attempt_id, 'Original writer attempt'),
        active_source_writer_ids: [],
        observed_commands: [],
        original_tool_records: [
          {
            call_ref: 'synthetic-file-change',
            actor_id: observation.agent_id,
            action_id: item.request.action_id,
            issue_id: issueId,
            host_attempt_id: required(observation.host_attempt_id, 'Original writer attempt'),
            status: 'completed',
            changed_paths: ['AGENT.sidecar.md'],
          },
        ],
        later_grants: [],
      },
      candidateSnapshot: RetiredSourceCaptureRequest['candidateSnapshot'] = {
        schema: 'UnverifiedSourceSnapshot/v1',
        entries: candidate.entries.map((entry) => ({
          path: entry.path,
          sha256: required(entry.sha256, 'Candidate source digest'),
          size: required(entry.bytes, 'Candidate source size'),
        })),
      };
    const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex'),
      packet = {
        schema: 'DevelopmentTaskPacket/v1',
        work_item_id: 'stopped',
        attempt: 1,
        packet_id: 'synthetic-packet',
        digest: canonicalJsonDigest('synthetic-packet'),
      },
      issued = {
        request: item.request,
        action: {
          action_id: item.request.action_id,
          stage_id: item.request.stage_id,
          scope_digest: item.request.scope_digest,
        },
        issue_id: issueId,
        host_attempt_id: required(observation.host_attempt_id, 'Original writer attempt'),
        development_packet: packet,
      },
      commands = [
        {
          type: 'commandExecution',
          id: 'synthetic-issue',
          command: 'vida-agent run --issue-wave true',
          status: 'completed' as const,
          exitCode: 0,
          output: {
            truncated: false,
            text: jsonText({ schema: 'VidaAgentRunResult/v1', issued_actions: [issued] }),
          },
        },
        {
          type: 'commandExecution',
          id: 'synthetic-wave',
          command: 'vida-agent inspect issued packet',
          status: 'completed' as const,
          exitCode: 0,
          output: {
            truncated: false,
            text: jsonText({
              status: 'wave_issued',
              issue_id: issueId,
              host_attempt_id: required(observation.host_attempt_id, 'Original writer attempt'),
              packet_id: packet.packet_id,
            }),
          },
        },
      ],
      diff = '@@ -1 +1 @@\n-Synthetic source preimage\n+Synthetic partial candidate bytes\n',
      artifact = {
        schema: 'CoreNativeIssuedTurnRead/v1',
        host: 'local',
        tool: 'mcp__codex_app__read_thread',
        max_output_chars_per_item: 20000,
        data: {
          thread: { id: sourceThreadId, kind: 'codex', status: { type: 'notLoaded' } },
          turns: [
            {
              id: sourceTurnId,
              status: 'interrupted',
              items: [
                ...commands,
                {
                  type: 'fileChange',
                  id: 'synthetic-file-change',
                  status: 'completed',
                  changes: [
                    {
                      path: path.join(root, 'AGENT.sidecar.md'),
                      kind: { type: 'update' },
                      diff: { text: diff, truncated: false },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      artifactRef = '.tmp/retired-source-native-read.json';
    writeJson(root, artifactRef, artifact);
    const observedCommands: RetiredSourceCaptureRequest['terminalEvidence']['observed_commands'] = commands.map(
      (entry) => ({
        ref: entry.id,
        status: entry.status,
        exit_code: entry.exitCode,
        command_sha256: digest(entry.command),
        output_sha256: digest(entry.output.text),
        output_present: true,
        output_truncated: false,
      }),
    );
    const attributions: RetiredSourceCaptureRequest['attributions'] = [
      {
        path: 'AGENT.sidecar.md',
        event_ref: 'synthetic-file-change',
        kind: 'file_change',
        evidence_sha256: digest(diff),
      },
    ];
    const nativeReadResult: RetiredSourceCaptureRequest['nativeReadResult'] = {
      schema: 'RetiredSourceNativeTurnEvidence/v1',
      artifact_ref: artifactRef,
      artifact_sha256: digest(readFileSync(path.join(root, artifactRef))),
      thread_id: terminalEvidence.source_thread_id,
      thread_status: 'notLoaded',
      turn_id: terminalEvidence.source_turn_id,
      turn_status: 'interrupted',
      issue: {
        action_id: item.request.action_id,
        issue_id: issueId,
        host_attempt_id: required(observation.host_attempt_id, 'Original writer attempt'),
        packet_id: packet.packet_id,
        packet_digest: packet.digest,
        work_item_id: packet.work_item_id,
        attempt: 1,
        stage_id: item.request.stage_id,
        scope_digest: item.request.scope_digest,
      },
      command_refs: commands.map((entry) => entry.id),
      file_change_refs: ['synthetic-file-change'],
      source_effects: attributions,
    };
    const operation: RetiredCaptureOperation = {
      schema: 'RetiredSourceCapture/v1',
      identity,
      attempt: 1,
      actionId: item.request.action_id,
      issueId,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedJournal: journal.version,
      expectedMaintenanceGeneration: host.maintenanceGeneration,
      retirementOperationId: retirement.operation_id,
      retirementClaimId: required(
        completeHost(retirement.snapshot).ledger.claims.find(
          (entry) => entry.ticket_id === workflowReservation(reservation).receipt.attempt.lease.ticket_id,
        )?.claim_id,
        'Retired source claim',
      ),
      operatorHandle: input.nativeSessionHandle,
      nativeTurnEvidenceRef: artifactRef,
      nativeReadResult,
      observation,
      terminalEvidence: { ...terminalEvidence, observed_commands: observedCommands },
      candidateSnapshot,
      attributions,
    };
    const verifyCurrent = () => {
      expect(snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['AGENT.sidecar.md'])).toEqual(candidate);
      expect(loadRuntimeConfig(root)).toEqual(config);
    };
    return { operation, verifyCurrent };
  }
  return {
    root,
    config,
    workspace,
    ledger,
    store,
    identity,
    input,
    source,
    reservation,
    readonlyObservation,
    inspect,
    ddl,
    close,
    captureInput,
    retireOwner,
    retiredCaptureInput,
    admission,
    laterWriter,
  };
}

test(
  'retired Source capture settles only the issued failure and retries through its separate public route',
  async () => {
    const f = await fixture();
    try {
      const retirement = f.retireOwner(),
        c = f.retiredCaptureInput(retirement),
        before = f.inspect(),
        ddl = f.ddl(),
        journalBefore = currentJournal(f.ledger, 'stopped', 1),
        incomplete = { ...c.operation, attributions: [] };
      expect(() => f.store.captureRetiredSourceObservation({ ...incomplete, verifyCurrent: c.verifyCurrent })).toThrow(
        'attribution is incomplete',
      );
      expect(() =>
        f.store.captureRetiredSourceObservation({
          ...c.operation,
          verifyCurrent: c.verifyCurrent,
          fault() {
            throw Error('synthetic retired-source post-write fault');
          },
        }),
      ).toThrow('synthetic retired-source post-write fault');
      expect(f.inspect()).toEqual(before);
      expect(f.ddl()).toEqual(ddl);
      expect(currentJournal(f.ledger, 'stopped', 1)).toEqual(journalBefore);

      const originalThreadStatus = c.operation.terminalEvidence.source_thread_status;
      f.store.captureRetiredSourceObservation({
        ...c.operation,
        verifyCurrent: () => {
          c.verifyCurrent();
          expect(Reflect.set(c.operation.terminalEvidence, 'source_thread_status', 'mutated-during-verification')).toBe(
            true,
          );
        },
      });
      const db = openHostStateDatabase(f.root, sessionHandoffDatabaseRelativePath(f.config), f.workspace);
      try {
        const row = db
          .query<{ payload: string }, [string, string, number, string]>(
            'SELECT payload FROM agent_host_retired_source_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
          )
          .get(f.workspace, c.operation.identity.work_id, c.operation.attempt, c.operation.actionId);
        expect(row).not.toBeNull();
        const receipt: unknown = JSON.parse(row!.payload);
        expect(receipt).toMatchObject({
          request: { terminalEvidence: { source_thread_status: originalThreadStatus } },
          terminal_evidence: { source_thread_status: originalThreadStatus },
        });
      } finally {
        closeWorkspaceDatabaseWithAdmission(db);
        expect(Reflect.set(c.operation.terminalEvidence, 'source_thread_status', originalThreadStatus)).toBe(true);
      }

      const requestRef = '.agent/work/stopped/retired-source-capture.json';
      writeJson(f.root, requestRef, { workspace_id: f.workspace, ...c.operation });
      const args = [
        '--capture-retired-source',
        'true',
        '--project-root',
        f.root,
        '--native-session-handle',
        f.input.nativeSessionHandle,
        '--request',
        requestRef,
      ];
      const result = await publicRun(args);
      expect(result).toMatchObject({
        schema: 'RetiredSourceCapture/v1',
        status: 'captured_original_partial_source_failure',
        rights_granted: false,
        canonical_acceptance: false,
        runtime_acceptance: false,
      });
      const after = completeHost(f.store.readHostStateSnapshot(f.identity)),
        journal = currentJournal(f.ledger, 'stopped', 1);
      expect(after.work.lease).toBeNull();
      expect(after.work.execution.status).toBe('suspended');
      expect(at(after.work.execution.assignment_attempts, 0, 'Captured attempt')).toMatchObject({
        status: 'completed',
        result: c.operation.observation,
      });
      expect(at(journal.state.items, 0, 'Captured journal item').observation).toEqual(c.operation.observation);
      expect(journal.state.source_scope).toEqual(f.source);
      expect(
        after.ledger.tickets.find(
          (entry) => entry.ticket_id === workflowReservation(f.reservation).receipt.attempt.lease.ticket_id,
        )?.status,
      ).toBe('released');
      const retried = await publicRun(args);
      expect(retried.work_version).toEqual(result.work_version);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
      writeJson(f.root, requestRef, {
        workspace_id: f.workspace,
        ...c.operation,
        terminalEvidence: { ...c.operation.terminalEvidence, source_turn_id: 'synthetic-changed-turn' },
      });
      await expectRejection(publicRun(args), 'original thread or interrupted turn differs');
    } finally {
      await f.close();
    }
  },
  60000,
  { sourceOnly: true },
);

test(
  'retired Source capture rejects foreign retirement, stale CAS and an active overlapping writer',
  async () => {
    const f = await fixture();
    try {
      const retirement = f.retireOwner(),
        c = f.retiredCaptureInput(retirement),
        before = f.inspect(),
        malformedRequestRef = '.agent/work/stopped/malformed-retired-capture.json';
      const malformedArgs = [
        '--capture-retired-source',
        'true',
        '--project-root',
        f.root,
        '--native-session-handle',
        f.input.nativeSessionHandle,
        '--request',
        malformedRequestRef,
      ];
      for (const change of [
        { retirementOperationId: 'foreign-retirement-operation' },
        { expectedWork: { ...c.operation.expectedWork, revision: c.operation.expectedWork.revision + 1 } },
        { terminalEvidence: { ...c.operation.terminalEvidence, final_message_id: 'invented-final-message' } },
      ]) {
        if ('terminalEvidence' in change) {
          const malformedRequest: unknown = {
            ...c.operation,
            ...change,
            verifyCurrent: c.verifyCurrent,
          };
          expect(() => {
            Reflect.apply(f.store.captureRetiredSourceObservation.bind(f.store), undefined, [malformedRequest]);
          }).toThrow('retired-source terminal caller evidence is incomplete or mismatched');
          writeJson(f.root, malformedRequestRef, { workspace_id: f.workspace, ...c.operation, ...change });
          await expectRejection(publicRun(malformedArgs), 'Retired-source request workspace or owner binding differs');
        } else {
          expect(() =>
            f.store.captureRetiredSourceObservation({
              ...c.operation,
              ...change,
              verifyCurrent: c.verifyCurrent,
            }),
          ).toThrow();
        }
      }
      expect(f.inspect()).toEqual(before);
      await f.laterWriter('later-overlap', 'AGENT.sidecar.md');
      const current = completeHost(f.store.readHostStateSnapshot(f.identity)),
        overlapping = f.retiredCaptureInput(retirement);
      expect(() =>
        f.store.captureRetiredSourceObservation({
          ...overlapping.operation,
          expectedWork: current.workVersion,
          expectedLedger: current.ledgerVersion,
          verifyCurrent: overlapping.verifyCurrent,
        }),
      ).toThrow('active Source ownership');
    } finally {
      await f.close();
    }
  },
  60000,
  { sourceOnly: true },
);

test(
  'retired Source capture accounts command patches, exact exclusions and unresolved outcomes',
  async () => {
    const f = await fixture();
    try {
      const retirement = f.retireOwner(),
        c = f.retiredCaptureInput(retirement),
        before = f.inspect(),
        artifactPath = path.join(f.root, c.operation.nativeTurnEvidenceRef),
        retainedArtifactValue: unknown = JSON.parse(readFileSync(artifactPath, 'utf8')),
        requestRef = '.agent/work/stopped/retired-command-capture.json',
        args = [
          '--capture-retired-source',
          'true',
          '--project-root',
          f.root,
          '--native-session-handle',
          f.input.nativeSessionHandle,
          '--request',
          requestRef,
        ];
      const event = {
        type: 'commandExecution',
        id: 'synthetic-command-patch',
        status: 'failed',
        exitCode: 1,
        command: "git apply '.tmp/original.patch'",
        output: { text: '', truncated: false },
      };
      if (!isRetiredTurnArtifact(retainedArtifactValue)) throw new Error('Retained native turn artifact is invalid.');
      const artifact = { schema: 'RetiredSourceTurnRead/v1', data: retainedArtifactValue.data };
      at(artifact.data.turns, 0, 'Retired source turn').items.push(event);
      writeJson(f.root, c.operation.nativeTurnEvidenceRef, artifact);
      writeJson(f.root, requestRef, { workspace_id: f.workspace, ...c.operation });
      await expectRejection(publicRun(args), 'patch outcome is unresolved');
      expect(f.inspect()).toEqual(before);
      mkdirSync(path.join(f.root, '.tmp'), { recursive: true });
      writeFileSync(
        path.join(f.root, '.tmp/original.patch'),
        'diff --git a/AGENT.sidecar.md b/AGENT.sidecar.md\n--- a/AGENT.sidecar.md\n+++ b/AGENT.sidecar.md\n@@ -1 +1 @@\n-old\n+new\n' +
          'diff --git a/outside-source.txt b/outside-source.txt\n--- a/outside-source.txt\n+++ b/outside-source.txt\n@@ -1 +1 @@\n-old\n+new\n',
      );
      event.status = 'completed';
      event.exitCode = 0;
      event.command =
        "git apply --check '.tmp/not-retained.patch'; git apply --exclude='outside-source.txt' '.tmp/original.patch'";
      const standalone = {
        type: 'commandExecution',
        id: 'synthetic-unscoped-write',
        status: 'completed',
        exitCode: 0,
        command: "Path('packages/agent/src/outside.ts').write_text('unexpected')",
        output: { text: '', truncated: false },
      };
      at(artifact.data.turns, 0, 'Retired source turn').items.push(standalone);
      for (const command of [
        standalone.command,
        "with Path('docs/outside.md').open('a') as f: f.write('unexpected')",
      ]) {
        standalone.command = command;
        writeJson(f.root, c.operation.nativeTurnEvidenceRef, artifact);
        await expectRejection(publicRun(args), 'outside the original scope');
        expect(f.inspect()).toEqual(before);
      }
      at(artifact.data.turns, 0, 'Retired source turn').items.pop();
      writeJson(f.root, c.operation.nativeTurnEvidenceRef, artifact);
      expect(await publicRun(args)).toMatchObject({
        status: 'captured_original_partial_source_failure',
        rights_granted: false,
      });
      expect(
        at(currentJournal(f.ledger, 'stopped', 1).state.items, 0, 'Captured retired journal item').observation
          ?.changed_paths,
      ).toEqual(['AGENT.sidecar.md']);
      expect(completeHost(f.store.readHostStateSnapshot(f.identity)).work.execution.status).toBe('suspended');
    } finally {
      await f.close();
    }
  },
  60000,
  { sourceOnly: true },
);

test(
  'direct stopped Source capture succeeds without synthesis proposal fields',
  async () => {
    const f = await fixture();
    try {
      const c = f.captureInput({ containedReviews: false }),
        beforeJournal = currentJournal(f.ledger, 'stopped', 1);
      expect(Object.hasOwn(c.operation, 'nextWork')).toBe(false);
      expect(Object.hasOwn(c.operation, 'nextLedger')).toBe(false);
      const settled = completeHost(
          f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent }),
        ),
        afterJournal = currentJournal(f.ledger, 'stopped', 1),
        expectedJournal = {
          ...beforeJournal.state,
          items: beforeJournal.state.items.map((item, index) =>
            index === 0 ? { ...item, observation: c.operation.observation } : item,
          ),
        };
      expect(settled.work.lease).toBeNull();
      expect(settled.work.execution.status).toBe('suspended');
      expect(at(settled.work.execution.assignment_attempts, 0, 'Settled attempt')).toMatchObject({
        status: 'completed',
        result: { status: 'reported_failed', changed_paths: ['AGENT.sidecar.md'] },
      });
      expect(
        settled.ledger.tickets.find(
          (entry) => entry.ticket_id === workflowReservation(f.reservation).receipt.attempt.lease.ticket_id,
        )?.status,
      ).toBe('released');
      expect(afterJournal.state).toEqual(expectedJournal);
      expect(afterJournal.state.source_scope).toEqual(f.source);
      expect(f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent })).toEqual(
        settled,
      );
      expect(currentJournal(f.ledger, 'stopped', 1).state).toEqual(afterJournal.state);
    } finally {
      await f.close();
    }
  },
  60000,
  { sourceOnly: true },
);

test('public stopped capture preserves failure, rolls back all fields and DDL, then retries without new rights', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      before = f.inspect(),
      ddl = f.ddl();
    expect(() =>
      f.store.captureStoppedSourceObservation({
        ...c.operation,
        verifyCurrent: c.verifyCurrent,
        fault() {
          throw Error('synthetic post-settlement fault');
        },
      }),
    ).toThrow('synthetic post-settlement fault');
    expect(f.inspect()).toEqual(before);
    expect(f.ddl()).toEqual(ddl);
    expect(c.cli('inspect').status).toBe('inspect_current');
    expect(c.cli('plan').status).toBe('planned');
    const result = c.cli('apply');
    expect(result).toMatchObject({
      status: 'captured_partial_source_released',
      rights_granted: false,
      canonical_acceptance: false,
    });
    const settled = completeHost(f.store.readHostStateSnapshot(f.identity)),
      journal = currentJournal(f.ledger, 'stopped', 1);
    expect(settled.work.lease).toBeNull();
    expect(settled.work.execution.status).toBe('suspended');
    expect(settled.work.lifecycle.phase).toBe(at(before.work, 0, 'Before Host work').state.lifecycle.phase);
    expect(at(settled.work.execution.assignment_attempts, 0, 'Settled attempt').result).toEqual(
      c.operation.observation,
    );
    expect(at(journal.state.items, 0, 'Captured journal item').observation).toEqual(c.operation.observation);
    expect(journal.state.source_scope).toEqual(f.source);
    expect(c.cli('resume').work_version).toEqual(result.work_version);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(settled);
    const changed = {
      ...c.operation,
      observation: {
        ...required(c.operation.observation, 'Stopped-source observation'),
        tool_call_ref: 'local:synthetic-changed',
      },
    };
    expect(() => f.store.captureStoppedSourceObservation({ ...changed, verifyCurrent: c.verifyCurrent })).toThrow(
      'retry differs',
    );
    const next = {
      ...settled.work,
      revision: settled.work.revision + 1,
      lifecycle: {
        ...settled.work.lifecycle,
        revision: settled.work.lifecycle.revision + 1,
        next_action: 'Synthetic later dependent write',
      },
    };
    f.store.compareAndSwapHostState({
      expectedWork: settled.workVersion,
      expectedLedger: settled.ledgerVersion,
      nextWork: next,
      nextLedger: { ...settled.ledger, revision: settled.ledger.revision + 1 },
    });
    expect(() => f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent })).toThrow(
      'dependent work write',
    );
  } finally {
    await f.close();
  }
}, 60000);

test('stopped capture keeps the persisted candidate snapshot bound to the owned request after verification', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      ownedCandidate = structuredClone(c.operation.candidateSnapshot),
      changedCandidate = c.operation.candidateSnapshot.entries[0]!;
    const observation = c.operation.observation;
    if (!observation) throw new Error('Stopped capture fixture observation is absent.');
    let verified = false;
    const result = f.store.captureStoppedSourceObservation({
      ...c.operation,
      verifyCurrent: () => {
        c.verifyCurrent();
        verified = true;
        changedCandidate.sha256 = 'a'.repeat(64);
      },
    });
    expect(verified).toBe(true);
    expect(result.work?.execution.status).toBe('suspended');

    const db = openHostStateDatabase(f.root, sessionHandoffDatabaseRelativePath(f.config), f.workspace);
    try {
      const row = db
        .query<{ payload: string }, [string, string, number, string]>(
          'SELECT payload FROM agent_host_stopped_source_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        )
        .get(f.workspace, c.operation.identity.work_id, c.operation.attempt, observation.action_id);
      expect(row).not.toBeNull();
      const receipt: unknown = JSON.parse(row!.payload);
      if (!isRecord(receipt) || !isRecord(receipt.request)) throw new Error('Capture receipt request is not a record.');
      expect(receipt.request.candidateSnapshot).toEqual(ownedCandidate);
      expect(receipt.candidate_snapshot).toEqual(ownedCandidate);
      const repeated = f.store.captureStoppedSourceObservation({
        ...c.operation,
        candidateSnapshot: ownedCandidate,
        verifyCurrent: c.verifyCurrent,
      });
      expect(repeated.workVersion).toEqual(result.workVersion);
      expect(repeated.work).toEqual(result.work);
    } finally {
      closeWorkspaceDatabaseWithAdmission(db);
    }
  } finally {
    await f.close();
  }
}, 60000);

test('foreign identities and stale capture versions cannot settle protected stopped Source', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      before = f.inspect();
    for (const change of [
      { identity: { ...f.identity, work_id: 'synthetic-foreign' } },
      { attempt: 2 },
      { nativeSessionHandle: 'synthetic-foreign-owner' },
      { expectedWork: { ...c.operation.expectedWork, revision: c.operation.expectedWork.revision + 1 } },
      { expectedJournal: { ...c.operation.expectedJournal, revision: c.operation.expectedJournal.revision + 1 } },
      { terminalEvidence: { ...c.operation.terminalEvidence, native_actor: 'synthetic-foreign-actor' } },
    ])
      expect(() =>
        f.store.captureStoppedSourceObservation({ ...c.operation, ...change, verifyCurrent: c.verifyCurrent }),
      ).toThrow();
    expect(f.inspect()).toEqual(before);
  } finally {
    await f.close();
  }
}, 60000);

test('another started or unknown Host effect blocks capture without fabricating task success', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput(),
      host = completeHost(f.store.readHostStateSnapshot(f.identity)),
      activeLease = required(host.work.lease, 'Active stopped-source writer lease'),
      receipt = f.store.claimWorkflowAttempt({
        identity: f.identity,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        stageId: 'validate_focused',
        assignmentIndex: 0,
        requestDigest: canonicalJsonDigest({ synthetic: 'other-pending-effect' }),
        lease: activeLease,
      });
    for (const unknown of [false, true]) {
      if (unknown) f.store.markWorkflowAttemptUncertain(receipt);
      const current = completeHost(f.store.readHostStateSnapshot(f.identity)),
        before = f.inspect();
      expect(() =>
        f.store.captureStoppedSourceObservation({
          ...c.operation,
          expectedWork: current.workVersion,
          expectedLedger: current.ledgerVersion,
          verifyCurrent: c.verifyCurrent,
        }),
      ).toThrow('another Host effect');
      expect(f.inspect()).toEqual(before);
    }
  } finally {
    await f.close();
  }
}, 60000);

test('completed configured readonly egress can release with a fully inert unissued develop wave', async () => {
  const f = await fixture({ writer: false });
  try {
    const host = completeHost(f.store.readHostStateSnapshot(f.identity));
    const journal = currentJournal(f.ledger, 'stopped', 1);
    const taskWorkflow = required(f.config.workflows.task_execution, 'Configured task execution workflow');
    const stage = taskWorkflow.stages.find(
      (entry) =>
        entry.id ===
        at(at(journal.state.completed, 0, 'Completed readonly wave').items, 0, 'Completed readonly item').request
          .stage_id,
    );
    if (!stage) throw new Error('Completed readonly stage is missing from the configured workflow.');
    const assignment = at(stage.assignments, 0, 'Readonly assignment');
    const profile = f.config.agents.profiles[assignment.profile];
    if (!profile) throw new Error('Configured readonly agent profile is missing.');
    expect(profile.mutation_scope).toBe('none');
    expect(profile.egress_policy).toBe('official_docs');
    expect(
      journal.state.items.every(
        (item) =>
          item.issue_id === null &&
          item.observation === null &&
          !item.host_reservation &&
          !item.research_activation &&
          !item.research_normalization,
      ),
    ).toBe(true);
    const request = {
        schema: 'CompletedReadonlyReleaseRequest/v1',
        workspace_id: f.workspace,
        identity: f.identity,
        attempt: 1,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: journal.version,
        nativeSessionHandle: f.input.nativeSessionHandle,
        userRequestPointer: 'synthetic-owner:release-readonly',
        requestIntent: 'linked_correction',
      },
      requestRef = '.agent/work/stopped/readonly-request.json';
    writeJson(f.root, requestRef, request);
    const cli = (mode: 'inspect' | 'plan' | 'apply') =>
      copiedRun([
        '--release-completed-readonly',
        'true',
        '--mode',
        mode,
        '--project-root',
        f.root,
        '--request',
        requestRef,
      ]);
    expect(cli('inspect').status).toBe('readonly_release_inspected');
    expect(cli('plan').status).toBe('readonly_release_planned');
    expect(cli('apply')).toMatchObject({
      status: 'completed_readonly_owner_released',
      rights_granted: false,
      canonical_acceptance: false,
      runtime_acceptance: false,
    });
    expect(completeHost(f.store.readHostStateSnapshot(f.identity)).work.execution.assignment_attempts).toEqual([]);
    expect(currentJournal(f.ledger, 'stopped', 1).state).toEqual(journal.state);
  } finally {
    await f.close();
  }
}, 60000);

test('completed readonly release tolerates package and declared-source drift while releasing only the old owner', async () => {
  mkdirSync(path.join(bundle, '.tmp'), { recursive: true });
  const f = await fixture({ writer: false }),
    packageFixtureRoot = mkdtempSync(path.join(bundle, '.tmp', 'readonly-release-drift-')),
    packageRoot = path.join(packageFixtureRoot, 'vida-agent');
  try {
    mkdirSync(packageRoot);
    const excluded = ['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect'];
    for (const entry of readdirSync(bundle)) {
      if (!excluded.includes(entry))
        cpSync(path.join(bundle, entry), path.join(packageRoot, entry), { recursive: true });
    }
    const clonedRuntimeValue: unknown = await import(
      pathToFileURL(path.join(packageRoot, 'src/config/runtime-config.ts')).href
    );
    const clonedSnapshotsValue: unknown = await import(
      pathToFileURL(path.join(packageRoot, 'src/orchestration/scoped-source-snapshot.ts')).href
    );
    const clonedRunValue: unknown = await import(pathToFileURL(path.join(packageRoot, 'bin/run.ts')).href);
    if (!isConfigModule(clonedRuntimeValue)) throw new Error('Copied runtime module has no typed package accessor.');
    if (!isSnapshotModule(clonedSnapshotsValue)) throw new Error('Copied snapshot module has no source snapshotter.');
    if (!isRunModule(clonedRunValue)) throw new Error('Copied public run module has no run entrypoint.');
    const host = completeHost(f.store.readHostStateSnapshot(f.identity));
    const journal = currentJournal(f.ledger, 'stopped', 1);
    const runtimeCodePaths = readAdmittedSessionIntake(f.root, f.store, f.identity).runtime_code_paths;
    const sourceScope = required(journal.state.source_scope, 'Captured readonly source scope');
    const scopedPaths = sourceScope.entries.map((entry) => entry.path);
    const beforePackage = clonedSnapshotsValue.snapshotRuntimePackageSources(
      clonedRuntimeValue.runtimePackageAccess(),
      f.config.runtime.bundle,
      runtimeCodePaths,
    );
    const beforeProject = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), scopedPaths);
    expect(beforePackage.digest).toBe(host.work.binding.runtime_code_digest);
    expect(beforeProject.digest).toBe(sourceScope.digest);

    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Synthetic changed scoped source');
    writeFileSync(
      path.join(packageRoot, 'bin/run.ts'),
      Buffer.concat([
        readFileSync(path.join(packageRoot, 'bin/run.ts')),
        Buffer.from('\n// synthetic package drift\n'),
      ]),
    );
    const afterPackage = clonedSnapshotsValue.snapshotRuntimePackageSources(
        clonedRuntimeValue.runtimePackageAccess(),
        f.config.runtime.bundle,
        runtimeCodePaths,
      ),
      afterProject = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), scopedPaths);
    expect(afterPackage.digest).not.toBe(beforePackage.digest);
    expect(afterProject.digest).not.toBe(beforeProject.digest);

    const request = {
        schema: 'CompletedReadonlyReleaseRequest/v1',
        workspace_id: f.workspace,
        identity: f.identity,
        attempt: 1,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: journal.version,
        nativeSessionHandle: f.input.nativeSessionHandle,
        userRequestPointer: 'synthetic-owner:release-readonly-after-drift',
        requestIntent: 'linked_correction',
      },
      requestRef = '.agent/work/stopped/readonly-request.json';
    writeJson(f.root, requestRef, request);
    const cli = (mode: 'inspect' | 'plan' | 'apply') =>
      publicRun(
        ['--release-completed-readonly', 'true', '--mode', mode, '--project-root', f.root, '--request', requestRef],
        clonedRunValue.run,
      );
    expect((await cli('inspect')).status).toBe('readonly_release_inspected');
    expect((await cli('plan')).status).toBe('readonly_release_planned');
    expect(await cli('apply')).toMatchObject({
      status: 'completed_readonly_owner_released',
      rights_granted: false,
      canonical_acceptance: false,
      runtime_acceptance: false,
    });
    expect(completeHost(f.store.readHostStateSnapshot(f.identity)).work.execution.assignment_attempts).toEqual([]);
    expect(currentJournal(f.ledger, 'stopped', 1).state).toEqual(journal.state);
  } finally {
    await f.close();
    await rm(packageFixtureRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}, 60000);

test('completed readonly release rejects absent and null engine completion evidence', async () => {
  for (const tamper of ['missing', 'null']) {
    const f = await fixture({ writer: false });
    try {
      const host = completeHost(f.store.readHostStateSnapshot(f.identity)),
        journal = currentJournal(f.ledger, 'stopped', 1),
        request = {
          schema: 'CompletedReadonlyReleaseRequest/v1',
          workspace_id: f.workspace,
          identity: f.identity,
          attempt: 1,
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          expectedJournal: journal.version,
          nativeSessionHandle: f.input.nativeSessionHandle,
          userRequestPointer: 'synthetic-owner:release-readonly-corrupt-engine',
          requestIntent: 'linked_correction',
        },
        requestRef = '.agent/work/stopped/readonly-request.json';
      writeJson(f.root, requestRef, request);
      expect(
        (
          await publicRun([
            '--release-completed-readonly',
            'true',
            '--mode',
            'inspect',
            '--project-root',
            f.root,
            '--request',
            requestRef,
          ])
        ).status,
      ).toBe('readonly_release_inspected');
      const engine = new Database(sessionBridgeDatabasePath(f.root, f.config), { strict: true });
      try {
        const row = engine
          .query<{ snapshot: string }, [string]>(
            'SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?',
          )
          .get(required(host.work.execution.run_id, 'Stored workflow run'));
        if (!row) throw new Error('Stored workflow snapshot row is missing.');
        const snapshotValue: unknown = JSON.parse(row.snapshot);
        const waveIndex = at(
          at(journal.state.completed, 0, 'Completed readonly wave').items,
          0,
          'Completed readonly item',
        ).request.wave_index;
        const snapshot = snapshotValue;
        if (!isRecord(snapshot) || !isRecord(snapshot.context)) throw new Error('Stored workflow snapshot is invalid.');
        const workflowContext = snapshot.context;
        const completedWaveValue = workflowContext['wave-' + waveIndex];
        if (!isRecord(completedWaveValue)) throw new Error('Stored completed wave is invalid.');
        const completedWave = completedWaveValue;
        expect(completedWave.status).toBe('success');
        if (tamper === 'missing') delete completedWave.resumePayload;
        else completedWave.resumePayload = null;
        engine
          .query('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
          .run(jsonText(snapshot), host.work.execution.run_id);
      } finally {
        engine.close();
      }
      const before = f.inspect(),
        cli = () =>
          publicRun([
            '--release-completed-readonly',
            'true',
            '--mode',
            'inspect',
            '--project-root',
            f.root,
            '--request',
            requestRef,
          ]);
      await expectRejection(cli(), 'Readonly release actual engine completion differs');
      const denied = ensureContainedPackage().run(
        [
          '--release-completed-readonly',
          'true',
          '--mode',
          'inspect',
          '--project-root',
          f.root,
          '--request',
          requestRef,
        ],
        caseBudgetValue(),
      );
      expect(denied.status).toBe(1);
      expect(denied.payload).toMatchObject({
        schema: 'VidaAgentRunResult/v1',
        status: 'blocked',
        code: 'GAP-VIDA-RUN-EXECUTION-001',
      });
      expect(f.inspect()).toEqual(before);
    } finally {
      await f.close();
    }
  }
}, 60000);

test('exact stopped capture retry permits disjoint progress but rejects later overlapping active and released rights', async () => {
  const f = await fixture();
  try {
    const c = f.captureInput();
    markPhase?.('stopped-capture:plan');
    c.cli('plan');
    markPhase?.('stopped-capture:apply');
    c.cli('apply');
    const settled = completeHost(f.store.readHostStateSnapshot(f.identity));
    await f.laterWriter('disjoint', 'disjoint.txt');
    markPhase?.('stopped-capture:disjoint-resume');
    expect(c.cli('resume').work_version).toEqual(settled.workVersion);
    const overlap = await f.laterWriter('overlap', 'AGENT.sidecar.md');
    const active = f.inspect();
    expect(() => f.store.captureStoppedSourceObservation({ ...c.operation, verifyCurrent: c.verifyCurrent })).toThrow(
      'newer scope grant',
    );
    expect(f.inspect()).toEqual(active);
    const pendingJournal = currentJournal(f.ledger, 'overlap', 1),
      activeHost = completeHost(f.store.readHostStateSnapshot(overlap.identity));
    expect(() =>
      suspendLocalWork({
        store: f.store,
        identity: overlap.identity,
        journal: pendingJournal,
        expectedWork: activeHost.workVersion,
        expectedLedger: activeHost.ledgerVersion,
        nativeSessionHandle: overlap.input.nativeSessionHandle,
        userRequestPointer: 'synthetic-deny-unreported-overlap',
        requestIntent: 'linked_correction',
        documentationContext: {
          repository_root: f.root,
          repository_id: overlap.identity.repository_id,
          project_id: 'sample',
          work_id: 'overlap',
        },
        config: f.config,
      }),
    ).toThrow('source observation is not an authoritative completed host result');
    expect(f.inspect()).toEqual(active);
    const pendingItem = at(pendingJournal.state.items, 0, 'Later overlapping writer action'),
      reservation = required(pendingItem.host_reservation, 'Later overlapping writer Host reservation'),
      summary = 'Completed the issued overlapping source write';
    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Synthetic completed overlapping source write');
    const updatedScope = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['AGENT.sidecar.md']),
      observation: SessionObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: pendingItem.request.action_id,
        issue_id: required(pendingItem.issue_id, 'Later overlapping writer issue'),
        host_attempt_id: reservation.receipt.attempt.attempt_id,
        agent_id: 'synthetic-later-overlap-writer',
        tool_call_ref: 'local:synthetic-later-overlap-writer',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        changed_paths: ['AGENT.sidecar.md'],
        evidence_refs: ['local:synthetic-later-overlap-writer'],
      };
    f.store.completeWorkflowAttempt(reservation.receipt, observation);
    const completedJournal = f.ledger.report('overlap', 1, pendingJournal.version, observation, updatedScope),
      host = completeHost(f.store.readHostStateSnapshot(overlap.identity));
    expect(completedJournal.state.items[0]?.observation).toEqual(observation);
    expect(
      host.work.execution.assignment_attempts.find(
        (attempt) => attempt.attempt_id === reservation.receipt.attempt.attempt_id,
      ),
    ).toMatchObject({
      attempt_id: reservation.receipt.attempt.attempt_id,
      status: 'completed',
      result: observation,
      result_digest: canonicalJsonDigest(observation),
    });
    suspendLocalWork({
      store: f.store,
      identity: overlap.identity,
      journal: completedJournal,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      nativeSessionHandle: overlap.input.nativeSessionHandle,
      userRequestPointer: 'synthetic-release-overlap',
      requestIntent: 'linked_correction',
      documentationContext: {
        repository_root: f.root,
        repository_id: overlap.identity.repository_id,
        project_id: 'sample',
        work_id: 'overlap',
      },
      config: f.config,
    });
    const released = f.inspect();
    const originalCandidate = c.operation.candidateSnapshot.entries,
      liveCandidate = updatedScope.entries.map((entry) => ({
        path: entry.path,
        sha256: required(entry.sha256, 'Updated source digest'),
        size: required(entry.bytes, 'Updated source size'),
      }));
    expect(liveCandidate).not.toEqual(originalCandidate);
    let originalVerifierInvoked = false,
      originalVerifierCompleted = false;
    expect(() =>
      f.store.captureStoppedSourceObservation({
        ...c.operation,
        verifyCurrent: () => {
          originalVerifierInvoked = true;
          c.verifyCurrent();
          originalVerifierCompleted = true;
        },
      }),
    ).toThrow('Synthetic stopped-source candidate differs');
    expect(originalVerifierInvoked).toBe(true);
    expect(originalVerifierCompleted).toBe(false);
    expect(f.inspect()).toEqual(released);

    // This low-level verifier isolates the released-rights guard. It does not
    // establish original-candidate authorization or public-route acceptance.
    expect(() =>
      f.store.captureStoppedSourceObservation({
        ...c.operation,
        verifyCurrent: () => {
          expect(snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['AGENT.sidecar.md'])).toEqual(
            updatedScope,
          );
          expect(loadRuntimeConfig(f.root)).toEqual(f.config);
        },
      }),
    ).toThrow('newer scope grant');
    expect(f.inspect()).toEqual(released);
  } finally {
    await f.close();
  }
}, 60000);

test('completed readonly release denies started and uncertain writer activity', async () => {
  const f = await fixture();
  try {
    for (const uncertain of [false, true]) {
      if (uncertain) f.store.markWorkflowAttemptUncertain(workflowReservation(f.reservation).receipt);
      const host = completeHost(f.store.readHostStateSnapshot(f.identity)),
        journal = currentJournal(f.ledger, 'stopped', 1),
        before = f.inspect();
      expect(() =>
        suspendCompletedReadOnlyWork({
          store: f.store,
          identity: f.identity,
          journal,
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          nativeSessionHandle: f.input.nativeSessionHandle,
          userRequestPointer: 'synthetic-readonly-denial',
          requestIntent: 'linked_correction',
          documentationContext: {
            repository_root: f.root,
            repository_id: f.identity.repository_id,
            project_id: 'sample',
            work_id: 'stopped',
          },
          config: f.config,
        }),
      ).toThrow('session journal has unfinished issued effects');
      expect(f.inspect()).toEqual(before);
    }
  } finally {
    await f.close();
  }
}, 60000);
