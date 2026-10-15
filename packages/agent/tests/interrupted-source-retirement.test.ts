import { bindControlledRuntimeInitialization } from './helpers/controlled-runtime-initialization-fixture.ts';
import { runTaskSynthesisPublicActions, runSourcePrewriterPublicActions } from './helpers/public-prewriter-fixture.ts';
import { run } from '../bin/run.ts';
import { expectRejection, rejectionReason } from './helpers/expect-rejection.ts';
import { test, expect, spyOn } from 'bun:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../src/orchestration/local-work-admission.ts';
import { openAdmittedSessionExecution } from '../src/orchestration/admitted-session-execution.ts';
import {
  openConfiguredMastraSessionLedger,
  type MastraLedgerItem,
  type MastraSessionLedgerState,
} from '../src/orchestration/persistent-session-handoff.ts';
import { MastraSessionBridge } from '../src/orchestration/mastra-session-bridge.ts';
import {
  completeWorkflowAssignmentForSession,
  reserveWorkflowAssignmentForSession,
  retireInterruptedSourceOwnerForSession,
  type WorkflowExecutionCapability,
  type WorkflowSessionReservation,
} from '../src/runtime-kernel.ts';
import { parseWorkflowApprovalConsumptionRecord } from '../src/governance/workflow-approval-consumption-contract.ts';
import type {
  AssignmentAttempt,
  InterruptedSourceRetirementRequest,
  StateVersion,
  WorkIdentity,
  WorkflowAttemptApprovalAuthorization,
  HostStateSnapshot,
} from '../src/host-state.ts';
import { runWorkStateRepair } from '../bin/repair-work-state.ts';
import type { Database } from 'bun:sqlite';
import type { AgentRuntimeConfig, WorkItemSelection } from '../src/config/runtime-config.ts';
import type { LocalWorkAdmissionInput } from '../src/orchestration/local-work-admission.ts';
import type { SessionBridgeObservation } from '../src/orchestration/mastra-session-bridge-contract.ts';
type MastraSessionBridgeInstance = Awaited<ReturnType<typeof MastraSessionBridge.open>>;

function hasReservation(
  item: MastraLedgerItem | undefined,
): item is MastraLedgerItem & { readonly host_reservation: WorkflowSessionReservation } {
  return item?.host_reservation !== undefined;
}

function legacyJournalState(state: MastraSessionLedgerState) {
  const legacyItems = (items: readonly MastraLedgerItem[]) =>
    items.map((item) => {
      if (!hasReservation(item)) return item;
      const reservation = item.host_reservation,
        authorization = reservation.authorization;
      return {
        ...item,
        host_reservation: {
          ...reservation,
          receipt: { ...reservation.receipt, attempt: withoutCorrectionFields(reservation.receipt.attempt) },
          authorization:
            authorization === null
              ? null
              : {
                  ...authorization,
                  receipt: {
                    ...authorization.receipt,
                    attempt: withoutCorrectionFields(authorization.receipt.attempt),
                  },
                },
        },
      };
    });
  return {
    ...state,
    items: legacyItems(state.items),
    completed: state.completed.map((step) => ({ ...step, items: legacyItems(step.items) })),
  };
}

function requireValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`Missing ${label} in synthetic fixture`);
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error(`Invalid ${label} in synthetic fixture`);
  return value;
}

function requireFunction(value: unknown, label: string): (...args: string[]) => unknown {
  if (typeof value !== 'function') throw new Error(`Invalid ${label} in synthetic fixture`);
  return (...args: string[]) => {
    const result: unknown = Reflect.apply(value, undefined, args);
    return result;
  };
}

function withoutCorrectionFields(attempt: AssignmentAttempt) {
  const { correction_generation: _generation, correction_authorization: _authorization, ...legacyAttempt } = attempt;
  return legacyAttempt;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label} in synthetic fixture`);
  return value;
}

function requireStrings(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label} in synthetic fixture`);
  return value.map((entry: unknown) => requireString(entry, label));
}

type RetirementInspectionRequest = Pick<
  InterruptedSourceRetirementRequest,
  | 'identity'
  | 'attempt'
  | 'actionId'
  | 'issueId'
  | 'expectedWork'
  | 'expectedLedger'
  | 'expectedJournal'
  | 'expectedMaintenanceGeneration'
>;

function requireStateVersion(value: unknown, label: string): StateVersion {
  const version = requireRecord(value, label);
  if (
    typeof version.revision !== 'number' ||
    !Number.isSafeInteger(version.revision) ||
    typeof version.digest !== 'string'
  )
    throw new Error(`Invalid ${label} in synthetic fixture`);
  return { revision: version.revision, digest: version.digest };
}

function requireRetirementInspection(value: unknown): {
  readonly status: 'interrupted_source_retirement_inspected';
  readonly owner_thread_id: string;
  readonly request: RetirementInspectionRequest;
} {
  const result = requireRecord(value, 'retirement inspection'),
    request = requireRecord(result.request, 'retirement inspection request'),
    identity = requireRecord(request.identity, 'retirement identity'),
    projectIds = requireStrings(identity.project_ids, 'project IDs');
  if (
    result.status !== 'interrupted_source_retirement_inspected' ||
    typeof request.attempt !== 'number' ||
    !Number.isSafeInteger(request.attempt) ||
    typeof request.expectedMaintenanceGeneration !== 'number' ||
    !Number.isSafeInteger(request.expectedMaintenanceGeneration)
  )
    throw new Error('Invalid retirement inspection in synthetic fixture');
  const workIdentity: WorkIdentity = {
    repository_id: requireString(identity.repository_id, 'repository ID'),
    project_ids: projectIds,
    integrations_digest: requireString(identity.integrations_digest, 'integrations digest'),
    work_id: requireString(identity.work_id, 'work ID'),
  };
  return {
    status: 'interrupted_source_retirement_inspected',
    owner_thread_id: requireString(result.owner_thread_id, 'owner thread ID'),
    request: {
      identity: workIdentity,
      attempt: request.attempt,
      actionId: requireString(request.actionId, 'action ID'),
      issueId: requireString(request.issueId, 'issue ID'),
      expectedWork: requireStateVersion(request.expectedWork, 'work version'),
      expectedLedger: requireStateVersion(request.expectedLedger, 'ledger version'),
      expectedJournal: requireStateVersion(request.expectedJournal, 'journal version'),
      expectedMaintenanceGeneration: request.expectedMaintenanceGeneration,
    },
  };
}

type HostWorkRow = { readonly id: string; readonly payload: string };
type SessionJournalRow = { readonly payload: string };
type GovernanceApprovalRow = {
  readonly store_id: string;
  readonly record_key: string;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
};

function readPersistedApproval(
  database: Database,
  workspace: string,
  approval: ReturnType<typeof parseWorkflowApprovalConsumptionRecord>,
) {
  const row = requireValue(
    database
      .query<GovernanceApprovalRow, [string, string, string]>(
        "SELECT store_id,record_key,revision,payload,digest FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind='approval' AND record_key=?",
      )
      .get(workspace, approval.store_id, canonicalJsonDigest(approval.binding)),
    'persisted protected approval',
  );
  const record = parseWorkflowApprovalConsumptionRecord(JSON.parse(row.payload));
  expect(row.digest).toBe(
    canonicalJsonDigest({
      workspace_id: workspace,
      store_id: row.store_id,
      kind: 'approval',
      record_key: row.record_key,
      revision: row.revision,
      payload: record,
    }),
  );
  return { row, record };
}

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writeJson = (root: string, file: string, value: unknown): void => {
  mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('Synthetic JSON fixture is not serializable');
  writeFileSync(path.join(root, file), serialized);
};

async function prepareFixture({ issueWriter = true } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-stopped-source-'));
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
  const config: AgentRuntimeConfig = loadRuntimeConfig(root),
    workspace = deriveWorkspaceId(config.repository.repository_id, root),
    ledger = openConfiguredMastraSessionLedger(root),
    store = ledger.hostState;
  const readJournal = (id: string, attempt: number) => requireValue(ledger.resume(id, attempt), 'session journal');
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: 'task',
    intent: 'task_execution',
    project: 'sample',
    risk_flags: [],
    labels: [],
  };
  function admission(id: string = 'stopped', file: string = 'AGENT.sidecar.md', thread: string = 'synthetic-owner') {
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
    const input: LocalWorkAdmissionInput = {
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
    };
    const intakePath = `.agent/work/${id}/raw-intake.json`;
    writeJson(root, intakePath, {
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
    const admittedInput: LocalWorkAdmissionInput = { ...input, intakePath };
    const admitted = admitLocalSessionWork(admittedInput),
      work = requireValue(admitted.host.work, 'admitted work'),
      identity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: id,
      };
    return { input: admittedInput, source, identity, admitted };
  }
  function publicFixture(admissionResult: ReturnType<typeof admission>) {
    const { input: admittedInput, source: admittedSource, admitted } = admissionResult;
    return {
      args: [
        '--project-root',
        root,
        '--repository',
        config.repository.repository_id,
        '--project',
        selection.project,
        '--work-path',
        requireValue(admittedSource.entries[0], 'Admitted Source path').path,
        '--work-id',
        admittedInput.context.work_id,
        '--attempt',
        String(admittedInput.context.attempt),
        '--scope-digest',
        admittedSource.digest,
        '--team',
        selection.team,
        '--kind',
        selection.kind,
        '--intent',
        selection.intent,
        '--workflow',
        'task_execution',
      ],
      publicRun: run,
      sync: () => readJournal(admittedInput.context.work_id, admittedInput.context.attempt),
      repositoryRoot: root,
      workId: admittedInput.context.work_id,
      attempt: admittedInput.context.attempt,
      work: requireValue(admitted.host.work, 'Admitted public fixture work'),
    };
  }
  const extraBridges: MastraSessionBridgeInstance[] = [];
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
  const sync = () => readJournal('stopped', 1);
  await bindControlledRuntimeInitialization(root, config, store);
  const originalPublicFixture = publicFixture(original);
  let journal = await runTaskSynthesisPublicActions(originalPublicFixture);
  const readonlyObservation = requireValue(
    journal.state.completed[0]?.items[0]?.observation,
    'Completed readonly observation',
  );
  let reservation: WorkflowSessionReservation | undefined, executionCapability: WorkflowExecutionCapability | undefined;
  let connectionsClosed = false,
    primaryBridgeClosed = false,
    ledgerClosed = false;
  const closedExtraBridges = new Set<MastraSessionBridgeInstance>();
  async function closeConnections() {
    if (connectionsClosed) return;
    const failures: unknown[] = [];
    for (const extra of extraBridges) {
      if (closedExtraBridges.has(extra)) continue;
      try {
        await extra.close();
        closedExtraBridges.add(extra);
      } catch (error) {
        failures.push(error);
      }
    }
    if (!primaryBridgeClosed) {
      try {
        await bridge.close();
        primaryBridgeClosed = true;
      } catch (error) {
        failures.push(error);
      }
    }
    if (!ledgerClosed) {
      try {
        ledger.close();
        ledgerClosed = true;
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      console.error(`Fixture connections failed to close; root retained: ${root}`);
      throw new AggregateError(failures, 'Interrupted Source fixture connection cleanup failed');
    }
    connectionsClosed = true;
  }
  async function close({ removeRoot = false, deadline = Number.NEGATIVE_INFINITY } = {}): Promise<boolean> {
    await closeConnections();
    if (!removeRoot || !Number.isFinite(deadline) || !(performance.now() < deadline)) {
      console.warn(`Retained incomplete or expired interrupted Source fixture root: ${root}`);
      return false;
    }
    try {
      await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      return true;
    } catch (error) {
      console.error(`Fixture cleanup failed; root retained or uncertain: ${root}`, error);
      throw error;
    }
  }
  type AdmissionResult = ReturnType<typeof admission>;
  async function laterWriter(
    id: string,
    file: string,
    { readonly = false, ownershipOnly = false }: { readonly?: boolean; ownershipOnly?: boolean } = {},
  ): Promise<AdmissionResult & { readonly journal: ReturnType<typeof readJournal> | null }> {
    if (file !== 'AGENT.sidecar.md') writeFileSync(path.join(root, file), 'Synthetic disjoint source');
    const next = admission(id, file, 'synthetic-' + id);
    if (ownershipOnly) {
      const host = store.readHostStateSnapshot(next.identity),
        expectedWork = requireValue(host.workVersion, 'work version'),
        expectedLedger = requireValue(host.ledgerVersion, 'ledger version');
      acquireLocalSourceWriterLease({
        repositoryRoot: root,
        config,
        store,
        identity: next.identity,
        nativeSessionHandle: next.input.nativeSessionHandle,
        stageId: 'develop_task',
        assignmentIndex: 0,
        expectedWork,
        expectedLedger,
      });
      return { ...next, journal: null };
    }
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
    const nextSync = () => readJournal(id, 1);
    let nextJournal = nextSync();
    if (readonly) {
      nextJournal = ledger.issueWave(id, 1, nextJournal.version);
      return { ...next, journal: nextJournal };
    }
    const nextPublicFixture = publicFixture(next);
    await runTaskSynthesisPublicActions(nextPublicFixture);
    nextJournal = await runSourcePrewriterPublicActions(nextPublicFixture);
    const host = store.readHostStateSnapshot(next.identity);
    acquireLocalSourceWriterLease({
      repositoryRoot: root,
      config,
      store,
      identity: next.identity,
      nativeSessionHandle: next.input.nativeSessionHandle,
      stageId: 'develop_task',
      assignmentIndex: 0,
      expectedWork: requireValue(host.workVersion, 'work version'),
      expectedLedger: requireValue(host.ledgerVersion, 'ledger version'),
      expectedSessionJournal: { attempt: 1, version: nextJournal.version },
    });
    return { ...next, journal: nextJournal };
  }
  const issue = () =>
    run([
      ...originalPublicFixture.args,
      '--issue-wave',
      'true',
      '--expected-revision',
      String(journal.version.revision),
      '--expected-digest',
      journal.version.digest,
    ]);
  try {
    journal = await runSourcePrewriterPublicActions(originalPublicFixture);
    if (issueWriter) {
      await issue();
      journal = sync();
      const item = requireValue(journal.state.items[0], 'Public writer action');
      if (item.request.stage_id !== 'develop_task' || item.issue_id === null)
        throw new Error('Public fixture did not issue its configured writer');
      reservation = requireValue(item.host_reservation, 'Kernel-produced writer reservation');
      const execution = await openAdmittedSessionExecution(root, store, 'sample', 'stopped');
      executionCapability = requireValue(
        execution.composition.workflowExecutionCapability,
        'Actual execution capability',
      );
    }
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Source fixture issue and cleanup failed');
    }
    throw error;
  }
  return {
    root,
    config,
    workspace,
    ledger,
    store,
    identity,
    executionCapability,
    readJournal,
    input,
    source,
    reservation,
    issue,
    readonlyObservation,
    close,
    closeConnections,
    admission,
    laterWriter,
  };
}

async function fixture() {
  const prepared = await prepareFixture();
  return { ...prepared, reservation: requireValue(prepared.reservation, 'workflow reservation') };
}

type RetirementFixtureCaseOutcome = {
  readonly deadline: number;
  readonly completed: boolean;
  readonly bodyFailed: boolean;
  readonly bodyError?: unknown;
};

async function closeTestFixture(
  f: Pick<Awaited<ReturnType<typeof prepareFixture>>, 'close'>,
  outcome: RetirementFixtureCaseOutcome,
  closeOther?: () => void,
): Promise<boolean> {
  const failures: unknown[] = [];
  try {
    closeOther?.();
  } catch (error) {
    failures.push(error);
  }
  let removed = false;
  try {
    removed = await f.close({
      removeRoot: outcome.completed && failures.length === 0,
      deadline: outcome.deadline,
    });
  } catch (error) {
    failures.push(error);
  }
  if (failures.length > 0)
    throw new AggregateError(
      [...(outcome.bodyFailed ? [outcome.bodyError] : []), ...failures],
      'Interrupted Source case fixture cleanup failed',
    );
  return removed;
}

async function closeRecoveryFixture(
  f: Awaited<ReturnType<typeof fixture>>,
  outcome: RetirementFixtureCaseOutcome,
  cloneRoot: string,
  closeOther: () => void,
): Promise<void> {
  try {
    const removed = await closeTestFixture(f, outcome, closeOther);
    if (removed && outcome.completed && performance.now() < outcome.deadline)
      await rm(cloneRoot, { recursive: true, force: true });
    else console.warn(`Retained incomplete or expired interrupted recovery package root: ${cloneRoot}`);
  } catch (error) {
    console.warn(`Interrupted recovery package cleanup incomplete; root retained or uncertain: ${cloneRoot}`);
    throw error;
  }
}

test('protected public issue aborts an unentered attempt and fences approval replay', async () => {
  const deadline = performance.now() + 30000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const failure = new Error('controlled protected entry failure before effect');
  const f = await prepareFixture({ issueWriter: false });
  let database: Database | undefined;
  try {
    const { issue, root, config, store, identity } = f;
    const readJournal = () => f.readJournal('stopped', 1);
    const journal = readJournal();
    const begin = Reflect.get(
      HostStateStore.prototype,
      'beginWorkflowAttemptEffect',
    ) as HostStateStore['beginWorkflowAttemptEffect'];
    const abort = Reflect.get(
      HostStateStore.prototype,
      'abortUnstartedWorkflowAttempt',
    ) as HostStateStore['abortUnstartedWorkflowAttempt'];
    let entered: WorkflowAttemptApprovalAuthorization | undefined;
    let before: HostStateSnapshot | undefined;
    let aborts = 0;
    const entrySpy = spyOn(HostStateStore.prototype, 'beginWorkflowAttemptEffect').mockImplementation(function (
      this: HostStateStore,
      authorization,
    ) {
      if (this.workspaceId !== store.workspaceId || authorization.receipt.identity.work_id !== identity.work_id)
        return begin.call(this, authorization);
      entered = authorization;
      before = store.readHostStateSnapshot(identity);
      throw failure;
    });
    const abortSpy = spyOn(HostStateStore.prototype, 'abortUnstartedWorkflowAttempt').mockImplementation(function (
      this: HostStateStore,
      authorization,
    ) {
      if (
        this.workspaceId === store.workspaceId &&
        'receipt' in authorization &&
        authorization.receipt.identity.work_id === identity.work_id
      ) {
        expect(authorization).toEqual(requireValue(entered, 'matching observed protected entry'));
        aborts += 1;
      }
      return abort.call(this, authorization);
    });
    try {
      expect(await rejectionReason(issue())).toBe(failure);
    } finally {
      entrySpy.mockRestore();
      abortSpy.mockRestore();
    }
    const authorization = requireValue(entered, 'observed protected effect entry');
    const initial = requireValue(before, 'entry Host snapshot');
    const work = requireValue(initial.work, 'entry Work');
    const approval = requireValue(authorization.approval, 'reserved entry approval');
    expect(aborts).toBe(1);
    expect(approval.status).toBe('reserved');
    expect(work.execution.assignment_attempts).toEqual([authorization.receipt.attempt]);
    const after = store.readHostStateSnapshot(identity);
    expect(after.work).toEqual({
      ...work,
      revision: work.revision + 1,
      lifecycle: { ...work.lifecycle, revision: work.revision + 1 },
      execution: { ...work.execution, assignment_attempts: [] },
    });
    expect(after.ledger).toEqual(initial.ledger);
    expect(after.ledgerVersion).toEqual(initial.ledgerVersion);
    expect(readJournal()).toEqual(journal);
    database = openHostStateDatabase(root, sessionHandoffDatabaseRelativePath(config), store.workspaceId);
    const persisted = readPersistedApproval(database, store.workspaceId, approval);
    expect(persisted.row.revision).toBe(2);
    const terminalAt = requireValue(persisted.record.terminal_at, 'aborted approval timestamp');
    expect(persisted.record).toEqual({ ...approval, status: 'aborted', terminal_at: terminalAt });
    expect(typeof persisted.record.terminal_at).toBe('string');
    await expectRejection(issue(), /workflow approval receipt replay/);
    expect(readPersistedApproval(database, store.workspaceId, approval)).toEqual(persisted);
    expect(store.readHostStateSnapshot(identity)).toEqual(after);
    expect(readJournal()).toEqual(journal);
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError }, () => {
      if (database !== undefined) closeWorkspaceDatabaseWithAdmission(database);
    });
  }
}, 30000);

test('admitted protected session commits an observed result and its approval exactly once', async () => {
  const deadline = performance.now() + 30000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const f = await fixture();
  let database: Database | undefined;
  try {
    database = openHostStateDatabase(f.root, sessionHandoffDatabaseRelativePath(f.config), f.workspace);
    const db = database;
    const journal = f.readJournal('stopped', 1);
    const item = requireValue(journal.state.items[0], 'issued protected action');
    const authorization = requireValue(f.reservation.authorization, 'issued authorization');
    const approval = requireValue(authorization.approval, 'issued approval');
    const capability = requireValue(f.executionCapability, 'issued execution capability');
    expect(item.request.stage_id).toBe('develop_task');
    expect(item.host_reservation).toEqual(f.reservation);
    expect(f.reservation.approvalAction).toBe('source.write');
    expect(approval.status).toBe('commit_unknown');
    const readApproval = () => readPersistedApproval(db, f.workspace, approval);
    const before = f.store.readHostStateSnapshot(f.identity);
    const approvalBefore = readApproval();
    expect(approvalBefore.record).toEqual(approval);
    expect(approvalBefore.row.revision).toBe(2);
    const summary = 'Controlled native Source observation completed without file changes';
    const observed: SessionBridgeObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: requireValue(item.issue_id, 'protected issue ID'),
      host_attempt_id: authorization.receipt.attempt.attempt_id,
      agent_id: 'synthetic-protected-owner',
      tool_call_ref: 'synthetic:protected-completion',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      changed_paths: [],
      evidence_refs: [],
    };
    const foreignApproval = {
      ...f.reservation,
      authorization: {
        ...authorization,
        approval: { ...approval, binding: { ...approval.binding, operation_hash: '0'.repeat(64) } },
      },
    };
    await expectRejection(
      completeWorkflowAssignmentForSession(capability, foreignApproval, observed),
      /workflow approval fencing conflict/,
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(readApproval()).toEqual(approvalBefore);
    await expectRejection(
      completeWorkflowAssignmentForSession(
        capability,
        { ...f.reservation, request: { ...f.reservation.request, workContextDigest: '0'.repeat(64) } },
        observed,
      ),
      /workflow native result context changed/,
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(readApproval()).toEqual(approvalBefore);
    await assert.doesNotReject(() => completeWorkflowAssignmentForSession(capability, f.reservation, observed));
    const after = f.store.readHostStateSnapshot(f.identity);
    const attempts = requireValue(after.work, 'completed protected Work').execution.assignment_attempts;
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      attempt_id: authorization.receipt.attempt.attempt_id,
      status: 'completed',
      result: observed,
      result_digest: canonicalJsonDigest(observed),
    });
    const applied = readApproval();
    expect(applied.row.revision).toBe(3);
    expect(applied.record).toMatchObject({
      status: 'applied',
      attempt_id: authorization.receipt.attempt.attempt_id,
      store_id: approval.store_id,
      store_generation: approval.store_generation,
      fencing_token: approval.fencing_token,
      binding: approval.binding,
    });
    await expectRejection(
      reserveWorkflowAssignmentForSession(capability, f.reservation.request),
      /workflow session action was already completed or requires reconciliation/,
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
    expect(readApproval()).toEqual(applied);
    await expectRejection(
      completeWorkflowAssignmentForSession(capability, f.reservation, observed),
      /workflow approval attempt binding invalid/,
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
    expect(readApproval()).toEqual(applied);
    expect(f.readJournal('stopped', 1)).toEqual(journal);
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError }, () => {
      if (database !== undefined) closeWorkspaceDatabaseWithAdmission(database);
    });
  }
}, 30000);

test('interrupted Source retirement keeps the provider outcome unknown and fences stale completion', async () => {
  const deadline = performance.now() + 60000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const f = await fixture();
  try {
    const before = f.store.readHostStateSnapshot(f.identity),
      beforeWork = requireValue(before.work, 'retirement work'),
      beforeLease = requireValue(beforeWork.lease, 'retirement lease'),
      journal = f.readJournal('stopped', 1),
      item = requireValue(journal.state.items[0], 'retirement action'),
      request: InterruptedSourceRetirementRequest = {
        identity: f.identity,
        attempt: 1,
        actionId: item.request.action_id,
        issueId: requireValue(item.issue_id, 'retirement issue ID'),
        expectedWork: requireValue(before.workVersion, 'work version'),
        expectedLedger: requireValue(before.ledgerVersion, 'ledger version'),
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        authorization: requireValue(f.reservation.authorization, 'attempt authorization'),
        operatorHandle: f.input.nativeSessionHandle,
        decisionPointer: 'synthetic:approved-interrupted-source-retirement',
        evidence: {
          schema: 'InterruptedSourceRetirementEvidence/v1',
          source_thread_id: 'synthetic-interrupted-child',
          source_thread_status: 'interrupted',
          read_thread_ref: 'synthetic:read-thread:interrupted',
          list_agents_ref: 'synthetic:list-agents:no-source-writers',
          active_source_writer_ids: [],
        },
      };
    const realNow = Date.now;
    Date.now = () => realNow() + 3 * 60 * 60 * 1000;
    let retired: Awaited<ReturnType<typeof retireInterruptedSourceOwnerForSession>>;
    try {
      retired = await retireInterruptedSourceOwnerForSession(
        requireValue(f.executionCapability, 'execution capability'),
        request,
      );
    } finally {
      Date.now = realNow;
    }
    const retiredWork = requireValue(retired.snapshot.work, 'retired work'),
      retiredLedger = requireValue(retired.snapshot.ledger, 'retired ledger');
    expect(retiredWork.execution.status).toBe('suspended');
    expect(retiredWork.lease).toBeNull();
    expect(retired.attempt_receipt.attempt.status).toBe('uncertain');
    expect(retired.attempt_receipt.attempt.result).toBeNull();
    expect(retired.attempt_receipt.attempt.result_digest).toBeNull();
    expect(
      requireValue(
        retiredLedger.tickets.find((ticket) => ticket.ticket_id === beforeLease.ticket_id),
        'retired ticket',
      ).status,
    ).toBe('released');
    expect(requireValue(f.store.readWorkSessionJournal(f.identity), 'retired journal').version).toEqual(
      journal.version,
    );
    expect(
      (
        await retireInterruptedSourceOwnerForSession(
          requireValue(f.executionCapability, 'execution capability'),
          request,
        )
      ).snapshot,
    ).toEqual(retired.snapshot);

    await f.laterWriter('later-overlap', 'AGENT.sidecar.md', { ownershipOnly: true });
    await expectRejection(
      retireInterruptedSourceOwnerForSession(requireValue(f.executionCapability, 'execution capability'), request),
      'another active Source owner overlaps',
    );

    const complete: SessionBridgeObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: requireValue(item.issue_id, 'retirement issue ID'),
      host_attempt_id: requireValue(f.reservation.receipt.attempt.attempt_id, 'host attempt ID'),
      agent_id: 'synthetic-late-source-owner',
      tool_call_ref: 'synthetic:late-source-result',
      status: 'reported_complete',
      summary: 'Late success must remain fenced',
      output_digest: canonicalJsonDigest('Late success must remain fenced'),
      changed_paths: [],
      evidence_refs: ['synthetic:late-result'],
    };
    expect(() => f.ledger.report('stopped', 1, journal.version, complete, f.source)).toThrow(
      'Mastra source observation has no matching current host outcome',
    );
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError });
  }
}, 60000);

test('an interrupted Source owner keeps a later FIFO contender queued', async () => {
  const deadline = performance.now() + 60000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const f = await fixture();
  try {
    await expectRejection(
      f.laterWriter('fifo-contender', 'AGENT.sidecar.md'),
      'source writer ownership is queued behind an earlier exclusive resource',
    );
    const after = f.store.readHostStateSnapshot(f.identity),
      afterLedger = requireValue(after.ledger, 'Host ledger'),
      afterWork = requireValue(after.work, 'Host work'),
      afterLease = requireValue(afterWork.lease, 'owner lease'),
      owner = requireValue(
        afterLedger.tickets.find((ticket) => ticket.ticket_id === afterLease.ticket_id),
        'owner ticket',
      ),
      contender = requireValue(
        afterLedger.tickets.find((ticket) => ticket.work_id === 'fifo-contender' && ticket.status === 'queued'),
        'queued contender',
      );
    expect(owner.status).toBe('active');
    expect(contender.sequence).toBeGreaterThan(owner.sequence);
    expect(contender.active_resources).toEqual([]);
    expect(contender.blocked_resources).toContain('file:AGENT.sidecar.md');
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError });
  }
}, 60000);

test('public owner retirement restarts after lease expiry and package drift without an execution capability', async () => {
  const deadline = performance.now() + 60000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  mkdirSync(path.join(bundle, '.tmp'), { recursive: true });
  const f = await fixture(),
    cloneRoot = mkdtempSync(path.join(bundle, '.tmp', 'interrupted-recovery-')),
    packageRoot = path.join(cloneRoot, 'vida-agent'),
    realNow = Date.now;
  let observer: ReturnType<typeof openConfiguredMastraSessionLedger> | undefined;
  try {
    mkdirSync(packageRoot);
    const excluded = ['node_modules', '.tmp', '.agent', 'coverage', '.pack-inspect'];
    for (const entry of readdirSync(bundle)) {
      if (!excluded.includes(entry))
        cpSync(path.join(bundle, entry), path.join(packageRoot, entry), { recursive: true });
    }
    const before = f.store.readHostStateSnapshot(f.identity),
      originalJournal = f.readJournal('stopped', 1);
    writeFileSync(
      path.join(packageRoot, 'bin/run.ts'),
      readFileSync(path.join(packageRoot, 'bin/run.ts'), 'utf8') + '\n// synthetic post-admission runtime drift\n',
    );
    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Synthetic changed Source after interruption');
    await f.closeConnections();
    f.executionCapability = undefined;
    Date.now = () => realNow() + 3 * 60 * 60 * 1000;
    const cliModule: unknown = await import(pathToFileURL(path.join(packageRoot, 'bin/run.ts')).href);
    if (typeof cliModule !== 'object' || cliModule === null) throw new Error('Invalid public CLI module');
    const run = requireFunction(Reflect.get(cliModule, 'run'), 'public CLI entry point'),
      requestRef = '.agent/work/stopped/retirement.json',
      cli = async (mode: 'inspect' | 'apply', handle: string = f.input.nativeSessionHandle) =>
        requireRecord(
          await Reflect.apply(run, undefined, [
            [
              '--retire-interrupted-source-owner',
              'true',
              '--mode',
              mode,
              '--project-root',
              f.root,
              '--native-session-handle',
              handle,
              '--request',
              requestRef,
            ],
          ]),
          'public retirement CLI result',
        );
    writeJson(f.root, requestRef, { identity: f.identity, attempt: 1 });
    await expectRejection(cli('inspect', 'foreign-owner'), 'owner');
    const inspected = requireRetirementInspection(await cli('inspect'));
    expect(inspected.status).toBe('interrupted_source_retirement_inspected');
    expect(inspected.owner_thread_id).toBe(f.input.nativeSessionHandle);
    const originalItem = requireValue(originalJournal.state.items[0], 'original journal action');
    expect(inspected.request.actionId).toBe(originalItem.request.action_id);
    expect(inspected.request.issueId).toBe(requireValue(originalItem.issue_id, 'original issue ID'));
    const request: Omit<InterruptedSourceRetirementRequest, 'authorization' | 'operatorHandle'> = {
      ...inspected.request,
      decisionPointer: 'synthetic-owner:relinquish-for-interrupted-child',
      evidence: {
        schema: 'InterruptedSourceRetirementEvidence/v1',
        source_thread_id: 'synthetic-interrupted-child',
        source_thread_status: 'interrupted',
        read_thread_ref: 'synthetic:actual-child-interrupted',
        list_agents_ref: 'synthetic:no-running-source-writers',
        active_source_writer_ids: [],
      },
    };
    writeJson(f.root, requestRef, {
      ...request,
      expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 },
    });
    await expectRejection(cli('apply'), 'CAS');
    writeJson(f.root, requestRef, { ...request, evidence: { ...request.evidence, source_thread_status: 'running' } });
    await expectRejection(cli('apply'), 'Interrupted Source retirement request shape differs');
    writeJson(f.root, requestRef, request);
    const released = requireRecord(await cli('apply'), 'retirement result');
    expect(released).toMatchObject({
      status: 'interrupted_source_owner_released',
      attempt_status: 'uncertain',
      rights_granted: false,
      attempt_outcome_resolved: false,
    });
    expect(requireRecord(await cli('apply'), 'retirement retry result').operation_id).toBe(released.operation_id);
    observer = openConfiguredMastraSessionLedger(f.root);
    const after = observer.hostState.readHostStateSnapshot(f.identity),
      afterWork = requireValue(after.work, 'retired Work state'),
      afterLedger = requireValue(after.ledger, 'retired ledger');
    expect(afterWork.execution.status).toBe('suspended');
    expect(afterWork.lease).toBeNull();
    expect(requireValue(afterWork.execution.assignment_attempts[0], 'retired attempt')).toMatchObject({
      status: 'uncertain',
      result: null,
      result_digest: null,
    });
    expect(afterLedger.tickets.length).toBe(requireValue(before.ledger, 'before ledger').tickets.length);
    expect(observer.hostState.readWorkSessionJournal(f.identity)).toEqual({
      attempt: 1,
      version: originalJournal.version,
      state: originalJournal.state,
    });
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeRecoveryFixture(f, { deadline, completed, bodyFailed, bodyError }, cloneRoot, () => {
      Date.now = realNow;
      observer?.close();
    });
  }
}, 60000);

test('interrupted Source retirement rejects missing, running, foreign, and stale evidence without mutation', async () => {
  const deadline = performance.now() + 60000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const f = await fixture();
  try {
    const before = f.store.readHostStateSnapshot(f.identity),
      beforeWorkVersion = requireValue(before.workVersion, 'work version'),
      beforeLedgerVersion = requireValue(before.ledgerVersion, 'ledger version'),
      journal = f.readJournal('stopped', 1),
      item = requireValue(journal.state.items[0], 'retirement action'),
      request: InterruptedSourceRetirementRequest = {
        identity: f.identity,
        attempt: 1,
        actionId: item.request.action_id,
        issueId: requireValue(item.issue_id, 'retirement issue ID'),
        expectedWork: beforeWorkVersion,
        expectedLedger: beforeLedgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        authorization: requireValue(f.reservation.authorization, 'attempt authorization'),
        operatorHandle: f.input.nativeSessionHandle,
        decisionPointer: 'synthetic:approved-interrupted-source-retirement',
        evidence: {
          schema: 'InterruptedSourceRetirementEvidence/v1',
          source_thread_id: 'synthetic-interrupted-child',
          source_thread_status: 'interrupted',
          read_thread_ref: 'synthetic:read-thread:interrupted',
          list_agents_ref: 'synthetic:list-agents:no-source-writers',
          active_source_writer_ids: [],
        },
      };
    expect(() =>
      f.store.retireInterruptedSourceOwner({ ...request, evidence: { ...request.evidence, read_thread_ref: '' } }),
    ).toThrow('evidence');
    const runningEvidence: unknown = {
      ...request,
      evidence: { ...request.evidence, source_thread_status: 'running' },
    };
    expect(() => {
      void Reflect.apply(f.store.retireInterruptedSourceOwner.bind(f.store), f.store, [runningEvidence]);
    }).toThrow('evidence');
    const { authorization: _authorization, operatorHandle: _operatorHandle, ...missingRetirementAuthority } = request;
    const missingAuthorityInput: unknown = missingRetirementAuthority;
    expect(() => {
      void Reflect.apply(f.store.retireInterruptedSourceOwner.bind(f.store), f.store, [missingAuthorityInput]);
    }).toThrow('request invalid');
    expect(() =>
      f.store.retireInterruptedSourceOwner({
        ...request,
        operatorHandle: 'foreign-owner-thread',
      }),
    ).toThrow('owner attribution');
    expect(() =>
      f.store.retireInterruptedSourceOwner({
        ...request,
        evidence: { ...request.evidence, active_source_writer_ids: ['competing-writer'] },
      }),
    ).toThrow('evidence');
    expect(() => f.store.retireInterruptedSourceOwner({ ...request, issueId: 'stale-issue' })).toThrow('issue');
    const staleAuthorization = {
      ...request.authorization,
      receipt: {
        ...request.authorization.receipt,
        attempt: {
          ...request.authorization.receipt.attempt,
          lease: {
            ...request.authorization.receipt.attempt.lease,
            generation: request.authorization.receipt.attempt.lease.generation + 1,
          },
        },
      },
    };
    expect(() => f.store.retireInterruptedSourceOwner({ ...request, authorization: staleAuthorization })).toThrow(
      'lease',
    );
    expect(() =>
      f.store.retireInterruptedSourceOwner({
        ...request,
        expectedLedger: { ...beforeLedgerVersion, digest: 'f'.repeat(64) },
      }),
    ).toThrow('compare-and-swap');
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(requireValue(f.store.readWorkSessionJournal(f.identity), 'retirement journal').version).toEqual(
      journal.version,
    );
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError });
  }
}, 60000);

test('interrupted Source retirement transaction rolls back the attempt downgrade when release fails', async () => {
  const deadline = performance.now() + 60000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const f = await fixture();
  try {
    const before = f.store.readHostStateSnapshot(f.identity),
      beforeWorkVersion = requireValue(before.workVersion, 'work version'),
      beforeLedgerVersion = requireValue(before.ledgerVersion, 'ledger version'),
      journal = f.readJournal('stopped', 1),
      item = requireValue(journal.state.items[0], 'retirement action'),
      request: InterruptedSourceRetirementRequest = {
        identity: f.identity,
        attempt: 1,
        actionId: item.request.action_id,
        issueId: requireValue(item.issue_id, 'retirement issue ID'),
        expectedWork: beforeWorkVersion,
        expectedLedger: beforeLedgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        authorization: requireValue(f.reservation.authorization, 'attempt authorization'),
        operatorHandle: f.input.nativeSessionHandle,
        decisionPointer: 'synthetic:approved-interrupted-source-retirement',
        evidence: {
          schema: 'InterruptedSourceRetirementEvidence/v1',
          source_thread_id: 'synthetic-interrupted-child',
          source_thread_status: 'interrupted',
          read_thread_ref: 'synthetic:read-thread:interrupted',
          list_agents_ref: 'synthetic:list-agents:no-source-writers',
          active_source_writer_ids: [],
        },
      },
      db = openHostStateDatabase(f.root, sessionHandoffDatabaseRelativePath(f.config), f.workspace);
    db.exec(
      "CREATE TRIGGER fail_retirement_ledger BEFORE UPDATE ON agent_host_state WHEN OLD.kind='ledger' BEGIN SELECT RAISE(ABORT, 'synthetic retirement fault'); END;",
    );
    try {
      expect(() => f.store.retireInterruptedSourceOwner(request)).toThrow('synthetic retirement fault');
    } finally {
      db.exec('DROP TRIGGER fail_retirement_ledger');
      closeWorkspaceDatabaseWithAdmission(db);
    }
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(requireValue(f.store.readWorkSessionJournal(f.identity), 'retirement journal').version).toEqual(
      journal.version,
    );
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError });
  }
}, 60000);

test('correction defaults repair preserves an issued unknown Source attempt and supports public retirement', async () => {
  const deadline = performance.now() + 60000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const f = await fixture();
  let database: Database | undefined;
  const repair = (mode: 'inspect' | 'plan' | 'apply' | 'resume' | 'restore', actor?: string) =>
    runWorkStateRepair([
      '--kind',
      'work-state',
      '--authority',
      'correction-generation',
      '--mode',
      mode,
      '--project-root',
      f.root,
      '--repair-id',
      'interrupted-source-defaults',
      ...(actor ? ['--actor', actor] : []),
    ]);
  try {
    database = openHostStateDatabase(f.root, sessionHandoffDatabaseRelativePath(f.config), f.workspace);
    f.admission('readonly-independent', 'AGENTS.md', 'synthetic-readonly-owner');
    for (const id of ['unknown-readonly-a', 'unknown-readonly-b']) {
      const pending = await f.laterWriter(id, id + '.txt', { readonly: true });
      const pendingJournal = requireValue(pending.journal, 'readonly pending journal'),
        pendingItem = requireValue(pendingJournal.state.items[0], 'readonly pending action');
      expect(pendingItem.issue_id).toBeTruthy();
      expect(pendingItem.observation).toBeNull();
      expect(pendingItem.host_reservation).toBeUndefined();
    }
    const db = requireValue(database, 'Host database');
    const hostBefore = f.store.readHostStateSnapshot(f.identity),
      currentWork = requireValue(hostBefore.work, 'owner Work state'),
      originalWork = {
        ...currentWork,
        execution: {
          ...currentWork.execution,
          assignment_attempts: currentWork.execution.assignment_attempts.map(withoutCorrectionFields),
        },
      },
      originalJournal = legacyJournalState(f.readJournal('stopped', 1).state),
      currentJournal = f.readJournal('stopped', 1).state;
    const unrelatedRows = () =>
      db
        .query<{ work_id: string; attempt: number; payload: string }, [string, string]>(
          'SELECT * FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id LIKE ? ORDER BY work_id',
        )
        .all(f.workspace, 'unknown-readonly-%');
    const unrelatedBefore = unrelatedRows();
    const hostRow = requireValue(
      db
        .query<HostWorkRow, [string, string]>(
          "SELECT id,payload FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
        )
        .get(f.workspace, 'stopped'),
      'Host work row',
    );
    expect(originalWork.execution.assignment_attempts).toHaveLength(1);
    const originalAttempt = requireValue(originalWork.execution.assignment_attempts[0], 'original assignment attempt');
    expect(originalAttempt.status).toBe('started');
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=?").run(
      canonicalJson(originalWork),
      canonicalJsonDigest(originalWork),
      f.workspace,
      hostRow.id,
    );
    const issued = requireValue(currentJournal.items.find(hasReservation), 'issued journal item'),
      issuedAuthorization = requireValue(issued.host_reservation.authorization, 'issued authorization'),
      issuedApproval = requireValue(issuedAuthorization.approval, 'issued approval');
    expect(issued.issue_id).toBeTruthy();
    expect(issued.observation).toBeNull();
    expect(issuedApproval.status).toBe('commit_unknown');
    db.query(
      'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
    ).run(canonicalJson(originalJournal), canonicalJsonDigest(originalJournal), f.workspace, 'stopped', 1);
    expect(() => f.store.readHostStateSnapshot(f.identity)).toThrow();

    const inspection = repair('inspect');
    expect(inspection).toMatchObject({
      status: 'repairable_current_v1',
      changed_work: [expect.anything()],
      changed_journals: 1,
    });
    const contaminatedJournal = { ...currentJournal, items: [...currentJournal.items] };
    const unrelatedItem = requireValue(f.readJournal('unknown-readonly-a', 1).state.items[0], 'unrelated journal item');
    contaminatedJournal.items.push(unrelatedItem);
    db.query(
      'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
    ).run(canonicalJson(contaminatedJournal), canonicalJsonDigest(contaminatedJournal), f.workspace, 'stopped', 1);
    expect(() => repair('inspect')).toThrow(/interrupted repair has another issued unknown journal item/);
    db.query(
      'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
    ).run(canonicalJson(originalJournal), canonicalJsonDigest(originalJournal), f.workspace, 'stopped', 1);
    const plan = repair('plan', 'synthetic-repair-owner');
    expect(plan).toMatchObject({
      status: 'planned',
      work_changes: [
        {
          after: {
            execution: {
              assignment_attempts: [{ correction_generation: 0, correction_authorization: null }],
            },
          },
        },
      ],
    });
    const preApplyWork = requireValue(
      db
        .query<{ payload: string }, [string, string]>(
          "SELECT payload FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?",
        )
        .get(f.workspace, hostRow.id),
      'Host work preimage',
    ).payload;
    const preApplyJournal = requireValue(
      db
        .query<SessionJournalRow, [string, string, number]>(
          'SELECT payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(f.workspace, 'stopped', 1),
      'session journal preimage',
    ).payload;
    db.query(
      'UPDATE agent_host_mastra_session_ledger SET revision=revision+1 WHERE workspace_id=? AND work_id=? AND attempt=?',
    ).run(f.workspace, 'unknown-readonly-a', 1);
    expect(() => repair('apply')).toThrow(/repair dependency CAS conflict/);
    db.query(
      'UPDATE agent_host_mastra_session_ledger SET revision=revision-1 WHERE workspace_id=? AND work_id=? AND attempt=?',
    ).run(f.workspace, 'unknown-readonly-a', 1);
    db.exec(
      "CREATE TRIGGER correction_repair_fault BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT,'synthetic correction repair fault'); END",
    );
    expect(() => repair('apply')).toThrow(/synthetic correction repair fault/);
    db.exec('DROP TRIGGER correction_repair_fault');
    expect(
      requireValue(
        db
          .query<{ payload: string }, [string, string]>(
            "SELECT payload FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?",
          )
          .get(f.workspace, hostRow.id),
        'Host work afterimage',
      ).payload,
    ).toBe(preApplyWork);
    expect(
      requireValue(
        db
          .query<SessionJournalRow, [string, string, number]>(
            'SELECT payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(f.workspace, 'stopped', 1),
        'session journal afterimage',
      ).payload,
    ).toBe(preApplyJournal);
    const applied = repair('apply');
    expect(applied).toMatchObject({ status: 'applied' });
    expect(repair('resume')).toEqual(applied);
    expect(unrelatedRows()).toEqual(unrelatedBefore);

    const repairedJournal = f.readJournal('stopped', 1),
      repairedItem = requireValue(repairedJournal.state.items.find(hasReservation), 'repaired item'),
      repairedReservation = requireValue(repairedItem.host_reservation, 'repaired reservation'),
      repairedAuthorization = requireValue(repairedReservation.authorization, 'repaired authorization'),
      repairedApproval = requireValue(repairedAuthorization.approval, 'repaired approval'),
      repairedAttempt = repairedReservation.receipt.attempt;
    expect(repairedJournal.state.items.map((item) => item.observation)).toEqual(
      originalJournal.items.map((item) => item.observation),
    );
    expect(repairedItem.issue_id).toBe(issued.issue_id);
    expect(repairedItem.observation).toBeNull();
    expect(repairedAttempt.status).toBe('started');
    expect(repairedAttempt.attempt_id).toBe(issued.host_reservation.receipt.attempt.attempt_id);
    expect(repairedAuthorization.receipt.attempt).toEqual(repairedAttempt);
    expect(repairedApproval).toEqual(issuedApproval);
    expect(repairedApproval.status).toBe('commit_unknown');
    const repairedHost = f.store.readHostStateSnapshot(f.identity);
    const repairedHostWork = requireValue(repairedHost.work, 'repaired Host work'),
      repairedHostLedger = requireValue(repairedHost.ledger, 'repaired Host ledger'),
      repairedAttemptState = requireValue(repairedHostWork.execution.assignment_attempts[0], 'repaired attempt'),
      repairedClaim = requireValue(
        repairedHostLedger.claims.find((claim) => claim.work_id === 'readonly-independent'),
        'readonly claim',
      );
    expect(repairedHostWork.lease).toEqual(originalWork.lease);
    expect(repairedAttemptState.status).toBe('started');
    expect(repairedClaim.status).toBe('active');
    expect(repairedAttemptState.attempt_id).toBe(originalAttempt.attempt_id);
    expect(repairedHostWork.lifecycle.assurance.correction_count).toBe(0);
    expect(repair('restore')).toMatchObject({ status: 'restored' });
    expect(repair('restore')).toMatchObject({ status: 'restored' });
    const afterRestore = f.store.readHostStateSnapshot(f.identity);
    const restoredWork = requireValue(afterRestore.work, 'restored work'),
      restoredLedger = requireValue(afterRestore.ledger, 'restored ledger'),
      restoredAttempt = requireValue(restoredWork.execution.assignment_attempts[0], 'restored attempt');
    expect(restoredAttempt).toEqual({
      ...requireValue(originalWork.execution.assignment_attempts[0], 'original issued predecessor attempt'),
      correction_generation: 0,
      correction_authorization: null,
    });
    expect(
      requireValue(
        restoredLedger.claims.find((claim) => claim.work_id === 'readonly-independent'),
        'readonly claim',
      ).status,
    ).toBe('active');
    const afterRestoreJournal = f.readJournal('stopped', 1),
      afterRestoreItem = requireValue(afterRestoreJournal.state.items.find(hasReservation), 'restored item'),
      afterRestoreReservation = requireValue(afterRestoreItem.host_reservation, 'restored reservation'),
      afterRestoreAuthorization = requireValue(afterRestoreReservation.authorization, 'restored authorization');

    const retirement = await retireInterruptedSourceOwnerForSession(
      requireValue(f.executionCapability, 'execution capability'),
      {
        identity: f.identity,
        attempt: 1,
        actionId: afterRestoreItem.request.action_id,
        issueId: requireValue(afterRestoreItem.issue_id, 'restored issue ID'),
        expectedWork: requireValue(afterRestore.workVersion, 'restored work version'),
        expectedLedger: requireValue(afterRestore.ledgerVersion, 'restored ledger version'),
        expectedJournal: afterRestoreJournal.version,
        expectedMaintenanceGeneration: afterRestore.maintenanceGeneration,
        authorization: afterRestoreAuthorization,
        operatorHandle: f.input.nativeSessionHandle,
        decisionPointer: 'synthetic:approved-interrupted-source-retirement-after-repair',
        evidence: {
          schema: 'InterruptedSourceRetirementEvidence/v1',
          source_thread_id: 'synthetic-interrupted-child',
          source_thread_status: 'interrupted',
          read_thread_ref: 'synthetic:read-thread:interrupted',
          list_agents_ref: 'synthetic:list-agents:no-source-writers',
          active_source_writer_ids: [],
        },
      },
    );
    expect(retirement.attempt_receipt.attempt.status).toBe('uncertain');
    expect(retirement.attempt_receipt.attempt.result).toBeNull();
    const retiredWork = requireValue(retirement.snapshot.work, 'retired work'),
      retiredLedger = requireValue(retirement.snapshot.ledger, 'retired ledger');
    expect(retiredWork.lease).toBeNull();
    expect(retiredWork.lifecycle.assurance.correction_count).toBe(0);
    const retiredJournal = f.readJournal('stopped', 1),
      retiredItem = requireValue(retiredJournal.state.items.find(hasReservation), 'retired item'),
      retiredReservation = requireValue(retiredItem.host_reservation, 'retired reservation'),
      retiredAuthorization = requireValue(retiredReservation.authorization, 'retired authorization'),
      retiredApproval = requireValue(retiredAuthorization.approval, 'retired approval');
    expect(retiredItem.issue_id).toBe(issued.issue_id);
    expect(retiredItem.observation).toBeNull();
    expect(retiredApproval.status).toBe('commit_unknown');
    expect(
      requireValue(
        retiredLedger.claims.find((claim) => claim.work_id === 'readonly-independent'),
        'readonly claim',
      ).status,
    ).toBe('active');
    expect(() => repair('restore')).toThrow();
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError }, () => {
      if (database) closeWorkspaceDatabaseWithAdmission(database);
    });
  }
}, 60000);

test('interrupted correction defaults repair rejects partial authority and mismatched approval receipt copies', async () => {
  const deadline = performance.now() + 60000;
  let completed = false,
    bodyFailed = false,
    bodyError: unknown;
  const f = await fixture();
  let database: Database | undefined;
  const repair = () =>
    runWorkStateRepair([
      '--kind',
      'work-state',
      '--authority',
      'correction-generation',
      '--mode',
      'inspect',
      '--project-root',
      f.root,
    ]);
  try {
    database = openHostStateDatabase(f.root, sessionHandoffDatabaseRelativePath(f.config), f.workspace);
    const db = requireValue(database, 'Host database'),
      currentWork = requireValue(f.store.readHostStateSnapshot(f.identity).work, 'legacy Work state'),
      legacyWork = {
        ...currentWork,
        execution: {
          ...currentWork.execution,
          assignment_attempts: currentWork.execution.assignment_attempts.map(withoutCorrectionFields),
        },
      },
      currentJournal = f.readJournal('stopped', 1).state,
      legacyJournal = legacyJournalState(currentJournal);
    const hostRow = requireValue(
      db
        .query<HostWorkRow, [string, string]>(
          "SELECT id,payload FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
        )
        .get(f.workspace, 'stopped'),
      'Host work row',
    );
    const issued = requireValue(currentJournal.items.find(hasReservation), 'issued journal item');
    const issuedAuthorization = requireValue(issued.host_reservation.authorization, 'issued authorization'),
      issuedApproval = requireValue(issuedAuthorization.approval, 'issued approval');
    const saveWork = (value: typeof legacyWork) =>
      db
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=?")
        .run(canonicalJson(value), canonicalJsonDigest(value), f.workspace, hostRow.id);
    const saveJournal = (value: unknown) =>
      db
        .query(
          'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .run(canonicalJson(value), canonicalJsonDigest(value), f.workspace, 'stopped', 1);
    const withUpdatedReservation = (
      item: MastraLedgerItem,
      update: (reservation: WorkflowSessionReservation) => WorkflowSessionReservation,
    ): MastraLedgerItem => {
      if (!hasReservation(item)) return item;
      return { ...item, host_reservation: update(item.host_reservation) };
    };
    const rejectJournalChange = (
      changed: unknown,
      expected: RegExp | string = /repair|binding|governance|authorization|issue|attempt/i,
    ) => {
      saveWork(legacyWork);
      saveJournal(changed);
      expect(() => repair()).toThrow(expected);
      saveJournal(legacyJournal);
    };
    const partialAuthorityAttempts = (attempt: AssignmentAttempt) => {
      const { correction_generation: _generation, ...missingGeneration } = attempt;
      const { correction_authorization: _authorization, ...missingAuthorization } = attempt;
      return [missingGeneration, missingAuthorization];
    };
    for (const attempt of partialAuthorityAttempts(issued.host_reservation.receipt.attempt)) {
      rejectJournalChange(
        {
          ...currentJournal,
          items: currentJournal.items.map((item) =>
            hasReservation(item)
              ? {
                  ...item,
                  host_reservation: {
                    ...item.host_reservation,
                    receipt: { ...item.host_reservation.receipt, attempt },
                  },
                }
              : item,
          ),
        },
        'partial assignment authority is ambiguous',
      );
    }
    for (const attempt of partialAuthorityAttempts(issuedAuthorization.receipt.attempt)) {
      rejectJournalChange(
        {
          ...currentJournal,
          items: currentJournal.items.map((item) =>
            hasReservation(item)
              ? {
                  ...item,
                  host_reservation: {
                    ...item.host_reservation,
                    authorization: {
                      ...issuedAuthorization,
                      receipt: { ...issuedAuthorization.receipt, attempt },
                    },
                  },
                }
              : item,
          ),
        },
        'partial assignment authority is ambiguous',
      );
    }
    const changeIssued = (update: (reservation: WorkflowSessionReservation) => WorkflowSessionReservation) =>
      rejectJournalChange({
        ...currentJournal,
        items: currentJournal.items.map((item) => withUpdatedReservation(item, update)),
      });
    changeIssued((reservation) => {
      const authorization = requireValue(reservation.authorization, 'mutated authorization');
      return {
        ...reservation,
        authorization: {
          ...authorization,
          receipt: {
            ...authorization.receipt,
            attempt: { ...authorization.receipt.attempt, request_digest: 'f'.repeat(64) },
          },
        },
      };
    });
    rejectJournalChange({
      ...currentJournal,
      items: currentJournal.items.map((item) =>
        hasReservation(item) ? { ...item, request: { ...item.request, action_id: 'a'.repeat(64) } } : item,
      ),
    });
    changeIssued((reservation) => ({
      ...reservation,
      invocation: { ...reservation.invocation, assignmentIndex: reservation.invocation.assignmentIndex + 1 },
    }));
    changeIssued((reservation) => ({
      ...reservation,
      invocation: { ...reservation.invocation, teamId: 'foreign-team' },
    }));
    changeIssued((reservation) => ({
      ...reservation,
      invocation: {
        ...reservation.invocation,
        profile: { ...reservation.invocation.profile, mutation_scope: 'none' },
      },
    }));
    changeIssued((reservation) => ({
      ...reservation,
      invocation: {
        ...reservation.invocation,
        profile: { ...reservation.invocation.profile, egress_policy: 'network' },
      },
    }));
    changeIssued((reservation) => ({
      ...reservation,
      invocation: {
        ...reservation.invocation,
        workContext: {
          ...reservation.invocation.workContext,
          binding: { ...reservation.invocation.workContext.binding, repository_id: 'foreign-repository' },
        },
      },
    }));
    changeIssued((reservation) => ({
      ...reservation,
      request: { ...reservation.request, teamId: 'foreign-team' },
    }));
    rejectJournalChange(
      {
        ...currentJournal,
        source_scope: {
          ...requireValue(currentJournal.source_scope, 'source scope'),
          digest: 'f'.repeat(64),
        },
      },
      'task source journal scope entries are invalid',
    );
    changeIssued((reservation) => {
      const authorization = requireValue(reservation.authorization, 'mutated authorization'),
        approval = requireValue(authorization.approval, 'mutated approval');
      return {
        ...reservation,
        authorization: {
          ...authorization,
          approval: { ...approval, binding: { ...approval.binding, operation_hash: 'e'.repeat(64) } },
        },
      };
    });

    const approvalRow = requireValue(
      db
        .query<GovernanceApprovalRow, [string]>(
          "SELECT store_id,record_key,revision,payload,digest FROM agent_host_governance WHERE workspace_id=? AND kind='approval'",
        )
        .all(f.workspace)
        .find((row) => {
          return (
            row.store_id === issuedApproval.store_id && row.record_key === canonicalJsonDigest(issuedApproval.binding)
          );
        }),
      'approval row',
    );
    db.query(
      "DELETE FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind='approval' AND record_key=?",
    ).run(f.workspace, approvalRow.store_id, approvalRow.record_key);
    expect(() => repair()).toThrow(/governance|approval|repair/i);
    db.query('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)').run(
      f.workspace,
      approvalRow.store_id,
      'approval',
      approvalRow.record_key,
      approvalRow.revision,
      approvalRow.payload,
      approvalRow.digest,
    );

    const [firstLegacyAttempt, ...remainingLegacyAttempts] = legacyWork.execution.assignment_attempts;
    const partialWork = {
      ...legacyWork,
      execution: {
        ...legacyWork.execution,
        assignment_attempts: [
          { ...requireValue(firstLegacyAttempt, 'partial assignment attempt'), correction_generation: 0 },
          ...remainingLegacyAttempts,
        ],
      },
    };
    saveWork(partialWork);
    expect(() => repair()).toThrow(/partial assignment authority|ambiguous/i);

    const correctiveHistory = {
      ...legacyWork,
      lifecycle: {
        ...legacyWork.lifecycle,
        assurance: { ...legacyWork.lifecycle.assurance, correction_count: 1 },
      },
    };
    saveWork(correctiveHistory);
    expect(() => repair()).toThrow(/corrective history|correction_count|base generation/i);
    completed = true;
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
    throw error;
  } finally {
    await closeTestFixture(f, { deadline, completed, bodyFailed, bodyError }, () => {
      if (database) closeWorkspaceDatabaseWithAdmission(database);
    });
  }
}, 60000);
