import { test, expect, spyOn, afterEach, type Mock } from 'bun:test';
import {
  createAutomaticWorkAdmissionFixture as createFixture,
  withAutomaticWorkAdmissionCase,
  retainPendingAutomaticWorkAdmissionCase,
} from './helpers/automatic-work-admission-fixture.js';
import { rejectionReason } from './helpers/expect-rejection.ts';
import { Database } from 'bun:sqlite';
import { Ajv2020 } from 'ajv/dist/2020.js';
import acceptanceSchema from '../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };
import workStateSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };
import runtimeConfigSchema from '../schemas/agent-runtime-config.v1.schema.json' with { type: 'json' };
import { mkdirSync, readFileSync, writeFileSync, unlinkSync, linkSync, symlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, type AgentRuntimeConfig, type WorkItemSelection } from '../src/config/runtime-config.ts';
import * as runtimeConfig from '../src/config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../src/config/workspace-database-raw.ts';
import { parseScopedSourceSnapshot, snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import {
  HostStateStore,
  type CoordinationLedger,
  type CoordinationTicket,
  type AssignmentAttempt,
  type WorkflowAttemptReceipt,
  type MaintenanceFenceBinding,
  type MaintenanceReleaseVerifier,
  type WorkIdentity,
  type StateVersion,
  type WorkArtifactReference,
  type WorkState,
  type RuntimeCodeRebindRequest,
  type RuntimeCodeRebindVerifier,
  openHostStateDatabase,
  runConsumerMigrationState,
  inspectHostWorkspaceDatabase,
} from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import type { ProjectContext } from '../src/config/project-context.ts';
import {
  admitLocalSessionWork as admitLocalSessionWorkSource,
  acquireLocalSourceWriterLease as acquireLocalSourceWriterLeaseSource,
} from '../src/orchestration/local-work-admission.ts';
import { runWorkStateRepair } from '../bin/repair-work-state.ts';
import { MastraSessionBridge } from '../src/orchestration/mastra-session-bridge.ts';

import type {
  SessionBridgeObservation,
  SessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import { buildSessionBridgeRequest } from '../src/orchestration/mastra-session-bridge-contract.ts';
import {
  advanceSessionWorkflowHandoffFromConfig,
  prepareSessionWorkflowHandoffFromConfig,
  type SessionAgentOutcome,
} from '../src/orchestration/session-handoff.ts';
import { readSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';
import { createStagedRuntimeWitness } from '../src/orchestration/staged-runtime-witness.ts';
import {
  MastraSessionLedger,
  type MastraSessionLedgerSnapshot,
  type MastraSessionLedgerState,
  type MastraLedgerItem,
} from '../src/orchestration/persistent-session-handoff.ts';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { readAdmittedSessionExecutionContext } from '../src/orchestration/admitted-session-execution.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { run } from '../bin/run.ts';
import {
  reportFailedFinalValidatorWave,
  writeFailedFinalPreparationInputs,
} from './helpers/failed-final-correction-fixture.ts';
import { prepareLifecycleForCorrection } from '../src/orchestration/final-assurance.ts';
import { inspectLocalSession } from '../src/orchestration/inspect-local-session.ts';
import { expectCorrectiveAuthorizationMetadata, observeMetadataReads } from './helpers/ledger-cache-observer.ts';
import { fixtureInitializationTemplates } from './helpers/runtime-initialization-fixture.ts';
import { runSourcePrewriterPublicActions } from './helpers/public-prewriter-fixture.ts';
import { requireLiveLocalSessionAdmission } from '../src/runtime-kernel.ts';
import { validateCoordinationLedgerV1 } from '../src/contracts/envelopes.ts';
import { isPlainRecord } from '../src/contracts/public-ingress.ts';
import { validateImplementationScope } from '../src/contracts/implementation-scope.ts';
import type { ScopedSourceSnapshot } from '../src/orchestration/scoped-source-snapshot.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { parseWorkflowSessionReservationData } from '../src/orchestration/workflow-session-reservation-contract.ts';
import { issueObservedResearchActivation } from '../src/orchestration/observed-research-activation.ts';
import type { ObservedResearchRecordPlan } from '../src/research-decision.ts';
import {
  createNativeTsPublicCliFixtureRunner,
  createPublicCliFixturePhaseMarker,
} from './helpers/public-cli-fixture-runner.ts';
import type {
  TrustedWorkflowAssignment,
  WorkflowAssignmentRequest,
  WorkflowApprovalAction,
  WorkflowSessionReservation,
  WorkExecutionContext,
} from '../src/runtime-kernel.ts';
import { workflowWorkItemSchema } from '../src/orchestration/workflow-session-reservation-contract.ts';
afterEach(retainPendingAutomaticWorkAdmissionCase);

test('admission fixture case teardown retains a pending body and prevents overlap', async () => {
  let root = '';
  let settle: (() => void) | undefined;
  const release = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const running = withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
    root = createFixture().root;
    await release;
  });
  try {
    const overlap = await rejectionReason(withAutomaticWorkAdmissionCase(() => undefined));
    expect(overlap).toBeInstanceOf(Error);
    expect(String(overlap)).toContain('overlap');
    retainPendingAutomaticWorkAdmissionCase();
    expect(existsSync(root)).toBe(true);
  } finally {
    settle!();
    await running;
  }
  expect(existsSync(root)).toBe(true);
});

test('admission fixture case removes timely success and runs deferred cleanups in ownership order', async () => {
  let root = '';
  const events: string[] = [];
  const value = await withAutomaticWorkAdmissionCase(({ createFixture, onCleanup }) => {
    root = createFixture().root;
    onCleanup(() => {
      events.push('first');
    });
    onCleanup(() => {
      events.push('second');
    });
    return 42;
  });
  expect(value).toBe(42);
  expect(events).toEqual(['second', 'first']);
  expect(root).not.toBe('');
  expect(existsSync(root)).toBe(false);
});

test('admission fixture case retains failed state and both undefined body and cleanup causes', async () => {
  let fixture: ReturnType<typeof createFixture> | undefined;
  const cleanupError = new Error('injected admission cleanup failure');
  const failure = await rejectionReason(
    withAutomaticWorkAdmissionCase(({ createFixture, onCleanup }) => {
      fixture = createFixture();
      onCleanup(() => {
        throw cleanupError;
      });
      throw undefined;
    }),
  );
  expect(failure).toBeInstanceOf(AggregateError);
  if (!(failure instanceof AggregateError)) throw Error('Expected aggregate cleanup failure');
  expect(failure.errors).toEqual([undefined, cleanupError]);
  expect(fixture).toBeDefined();
  if (!fixture) throw Error('Expected enrolled admission fixture');
  const { root, database } = fixture;
  expect(existsSync(root)).toBe(true);
  expect(() => database.query('SELECT 1').get()).toThrow(/closed/i);
});

test('admission fixture case retains a late settled body and rejects invalid deadlines before allocation', async () => {
  let root = '';
  let settle: (() => void) | undefined;
  const release = new Promise<void>((resolve) => {
    settle = resolve;
  });
  const running = withAutomaticWorkAdmissionCase(async ({ createFixture }) => {
    root = createFixture().root;
    await release;
  }, 1);
  expect(existsSync(root)).toBe(true);
  await Bun.sleep(5);
  settle!();
  await running;
  expect(existsSync(root)).toBe(true);
  let called = false;
  const invalid = await rejectionReason(
    withAutomaticWorkAdmissionCase(() => {
      called = true;
    }, 0),
  );
  expect(invalid).toBeInstanceOf(Error);
  expect(called).toBe(false);
});
const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validateWorkState = new Ajv2020({ strict: true }).compile<WorkState>(workStateSchema);
const validateAcceptanceManifest = new Ajv2020({ strict: true }).compile(acceptanceSchema);
const validateAgentRuntimeConfig = new Ajv2020({ strict: true }).compile<AgentRuntimeConfig>(runtimeConfigSchema);

function parseImplementationScopeJson(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isPlainRecord(value) || !validateImplementationScope(value))
    throw new Error('fixture payload is not a current ImplementationScope/v1 record');
  return value;
}

function parseScopedSourceSnapshotJson(text: string): ScopedSourceSnapshot {
  const value: unknown = JSON.parse(text);
  return parseScopedSourceSnapshot(value);
}

function parseAcceptanceManifestJson(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isPlainRecord(value) || !validateAcceptanceManifest(value))
    throw new Error('fixture payload is not a current AcceptanceManifest/v1 record');
  return value;
}

function parseMastraSessionLedgerJson(text: string): MastraSessionLedgerState {
  const value: unknown = JSON.parse(text);
  return parseMastraSessionLedgerState(value);
}

function parseJsonRecord(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (!isPlainRecord(value)) throw new Error('fixture JSON value is not a record');
  return value;
}

function requireRecordField(record: Record<string, unknown>, field: string): Record<string, unknown> {
  const value = record[field];
  if (!isPlainRecord(value)) throw new Error(`fixture JSON field ${field} is not a record`);
  return value;
}

function requireHostWork(snapshot: ReturnType<HostStateStore['readHostStateSnapshot']>): WorkState {
  if (!snapshot.work) throw new Error('Host snapshot has no persisted Work');
  return snapshot.work;
}

function requireHostLedger(snapshot: ReturnType<HostStateStore['readHostStateSnapshot']>): CoordinationLedger {
  if (!snapshot.ledger) throw new Error('Host snapshot has no persisted coordination Ledger');
  return snapshot.ledger;
}

function requireJournalVersion(journal: ReturnType<HostStateStore['readWorkSessionJournal']>): StateVersion {
  if (!journal) throw new Error('work session Journal is missing');
  return journal.version;
}

function requireSessionJournal(snapshot: MastraSessionLedgerSnapshot | null): MastraSessionLedgerSnapshot {
  if (!snapshot) throw new Error('persisted Mastra session Journal is missing');
  return snapshot;
}

function requireIssueId(item: MastraSessionLedgerState['items'][number] | undefined): string {
  if (!item?.issue_id) throw new Error('issued Mastra session item has no issue id');
  return item.issue_id;
}

function requireWorkLease(work: WorkState): NonNullable<WorkState['lease']> {
  if (!work.lease) throw new Error(`Work ${work.binding.lifecycle_work_id} has no active lease`);
  return work.lease;
}

function requireWorkRunId(work: WorkState): string {
  const runId = work.execution.run_id;
  if (!runId) throw new Error(`Work ${work.binding.lifecycle_work_id} has no execution run id`);
  return runId;
}

function requireRequestTransition(work: WorkState): NonNullable<WorkState['request_transition']> {
  if (!work.request_transition) throw new Error(`Work ${work.binding.lifecycle_work_id} has no request transition`);
  return work.request_transition;
}

function requireTicket(ledger: CoordinationLedger, ticketId: string): CoordinationTicket {
  const ticket = ledger.tickets.find((entry) => entry.ticket_id === ticketId);
  if (!ticket) throw new Error(`coordination Ledger has no ticket ${ticketId}`);
  return ticket;
}

function requireTicketValue(ticket: CoordinationTicket | undefined): CoordinationTicket {
  if (!ticket) throw new Error('expected coordination ticket is missing');
  return ticket;
}

function requireArrayItem<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];
  if (item === undefined) throw new Error(`${label} is missing at index ${index}`);
  return item;
}

type LegacyCorrectionAssignmentAttempt = Omit<AssignmentAttempt, 'correction_generation' | 'correction_authorization'> &
  Partial<Pick<AssignmentAttempt, 'correction_generation' | 'correction_authorization'>>;
type LegacyCorrectionWorkState = Omit<WorkState, 'execution'> & {
  readonly execution: Omit<WorkState['execution'], 'assignment_attempts'> & {
    readonly assignment_attempts: readonly LegacyCorrectionAssignmentAttempt[];
  };
};
type LegacyCorrectionReservation = Omit<WorkflowSessionReservation, 'receipt'> & {
  readonly receipt: Omit<WorkflowAttemptReceipt, 'attempt'> & { readonly attempt: LegacyCorrectionAssignmentAttempt };
};
type LegacyCorrectionJournalItem = Omit<MastraLedgerItem, 'host_reservation'> & {
  readonly host_reservation?: LegacyCorrectionReservation;
};
type LegacyCorrectionJournal = Omit<MastraSessionLedgerState, 'items' | 'completed'> & {
  readonly items: readonly LegacyCorrectionJournalItem[];
  readonly completed: readonly { readonly step_id: string; readonly items: readonly LegacyCorrectionJournalItem[] }[];
};

function persistedReservationFixture(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly identity: WorkIdentity;
  readonly host: CompleteHostSnapshot;
  readonly receipt: ReturnType<HostStateStore['claimWorkflowAttempt']>;
  readonly selection: FixtureAdmissionInput['selection'];
  readonly workItem: FixtureAdmissionInput['workItem'];
  readonly request: SessionBridgeRequest;
  readonly approvalAction: WorkflowApprovalAction | null;
  readonly projectContext?: ProjectContext;
}): WorkflowSessionReservation {
  // This is complete persisted fixture data only; it is never passed to a runtime capability or treated as authority.
  const { config, host, identity, request } = input,
    work = host.work,
    lease = requireWorkLease(work),
    workflow = config.workflows[request.workflow_id];
  if (!workflow) throw new Error(`fixture config has no workflow ${request.workflow_id}`);
  const stage = workflow.stages.find((entry) => entry.id === request.stage_id);
  if (!stage) throw new Error(`fixture config has no stage ${request.stage_id}`);
  const assignment = stage.assignments[request.assignment_index];
  if (!assignment) throw new Error(`fixture config has no assignment ${request.assignment_index}`);
  if (assignment.role !== request.role) throw new Error(`fixture request role differs from stage ${stage.id}`);
  const operation = config.operations.registry.find(
      (entry) => entry.profile === config.orchestration.mastra.default_profile && entry.tool === 'runtime.read',
    ),
    profile = operation && config.agents.profiles[operation.profile],
    roleInstruction = config.agents.role_instructions[request.role];
  if (!operation || !profile || !roleInstruction) throw new Error('fixture invocation config is incomplete');
  const project =
    input.projectContext ??
    loadProjectSetContext(input.repositoryRoot, config, identity.repository_id, identity.project_ids);
  if (
    project.repository_id !== identity.repository_id ||
    project.config_digest !== runtimeConfigDigest(config) ||
    project.project_ids.join('\0') !== [...identity.project_ids].sort().join('\0')
  )
    throw new Error('fixture ProjectContext differs from reservation identity');
  const workItem = workflowWorkItemSchema.parse(input.workItem),
    workContextDigest = canonicalJsonDigest({ binding: work.binding, permit: lease }),
    assignmentRequest: WorkflowAssignmentRequest = {
      repositoryRoot: input.repositoryRoot,
      configDigest: runtimeConfigDigest(config),
      teamId: input.selection.team,
      workflowId: request.workflow_id,
      stageId: request.stage_id,
      assignmentIndex: request.assignment_index,
      workItemId: identity.work_id,
      workItemDigest: work.binding.work_item_digest,
      workContextDigest,
      input: request,
    },
    ticket = requireTicket(host.ledger, lease.ticket_id),
    workContext: WorkExecutionContext = {
      schema: 'WorkExecutionContext/v1',
      binding: { ...work.binding, project_ids: [...work.binding.project_ids] },
      permit: {
        context_digest: workContextDigest,
        checkpoint_revision: work.revision,
        checkpoint_digest: host.workVersion.digest,
        runtime_current_revision: 1,
        stage_id: request.stage_id,
        assignment_index: request.assignment_index,
        dispatch_authorized: false,
        lease: {
          thread_id: lease.thread_id,
          ticket_id: lease.ticket_id,
          generation: lease.generation,
          ledger_revision: host.ledger.revision,
          expires_at: requireTicketExpiry(host.ledger, lease.ticket_id),
          active_resources: [...ticket.active_resources],
          blocked_resources: [...ticket.blocked_resources],
        },
      },
    },
    invocation: TrustedWorkflowAssignment = {
      operation,
      authentication: {
        schema: 'TrustedHostAuthentication/v1',
        repositoryRoot: input.repositoryRoot,
        repositoryId: identity.repository_id,
        projectIds: [...identity.project_ids].sort(),
        integrationsDigest: identity.integrations_digest,
        principal: 'fixture:persisted-session-data-only',
        configRevision: config.config_revision,
        permittedOperations: [],
      },
      configDigest: runtimeConfigDigest(config),
      project,
      teamId: input.selection.team,
      workflowId: request.workflow_id,
      stage,
      assignment,
      assignmentIndex: request.assignment_index,
      attempt: input.receipt.attempt,
      profile,
      roleInstruction,
      roleInstructionDigest: canonicalJsonDigest(roleInstruction),
      riskFlags: input.selection.risk_flags,
      workItem,
      workContext,
      input: request,
    };
  const reservation = {
    schema: 'WorkflowSessionReservation/v1',
    request: assignmentRequest,
    invocation,
    receipt: input.receipt,
    requestDigest: canonicalJsonDigest(assignmentRequest),
    approvalAction: input.approvalAction,
    authorization: null,
  };
  const persistedReservation: unknown = JSON.parse(JSON.stringify(reservation));
  return parseWorkflowSessionReservationData(persistedReservation);
}

function requireTicketExpiry(ledger: CoordinationLedger, ticketId: string): string {
  const expiresAt = requireTicket(ledger, ticketId).expires_at;
  if (expiresAt === null) throw new Error(`coordination ticket ${ticketId} has no expiry`);
  return expiresAt;
}

type WorkspaceSnapshot = ReturnType<HostStateStore['readWorkspaceSnapshot']>;
type WorkspaceWorkRow = WorkspaceSnapshot['work'][number];
type CompleteWorkspaceSnapshot = WorkspaceSnapshot & {
  readonly ledger: CoordinationLedger;
  readonly ledger_version: StateVersion;
};
type CompleteWorkspaceWorkRow = Omit<WorkspaceWorkRow, 'work' | 'workVersion'> & {
  readonly work: WorkState;
  readonly workVersion: StateVersion;
};

function requireWorkspaceRows(snapshot: WorkspaceSnapshot): readonly CompleteWorkspaceWorkRow[] {
  return snapshot.work.map((row) => {
    if (!row.work || !row.workVersion)
      throw new Error(`workspace snapshot row ${row.workVersion?.digest ?? 'unknown'} is incomplete`);
    return { ...row, work: row.work, workVersion: row.workVersion };
  });
}

function assertCompleteWorkspaceSnapshot(snapshot: WorkspaceSnapshot): asserts snapshot is CompleteWorkspaceSnapshot {
  if (!snapshot.ledger || !snapshot.ledger_version) throw new Error('workspace snapshot omitted the shared Ledger');
}

function requireInspectedWork(inspection: ReturnType<typeof inspectHostWorkspaceDatabase>, workId: string): WorkState {
  const row = inspection.work.find((entry) => entry.identity.work_id === workId);
  if (!row) throw new Error(`Host inspection is missing Work ${workId}`);
  return row.state;
}

function parseWorkStateJson(text: string): WorkState {
  const value: unknown = JSON.parse(text);
  return parseWorkStateValue(value);
}

function parseWorkStateValue(value: unknown): WorkState {
  if (!validateWorkState(value)) throw new Error('fixture payload is not a current WorkState/v1 record');
  return value;
}

function parseCoordinationLedgerJson(text: string): CoordinationLedger {
  const value: unknown = JSON.parse(text);
  const result = validateCoordinationLedgerV1(value);
  if (!result.ok)
    throw new Error(result.issues[0]?.message ?? 'fixture payload is not a current CoordinationLedger/v1 record');
  return result.ledger;
}

function requireUnknownRecord(value: unknown, description: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error(`${description} is not a record`);
  return value;
}

function requireUnknownRecordArray(value: unknown, description: string): readonly Record<string, unknown>[] {
  if (!Array.isArray(value) || !value.every(isPlainRecord)) throw new Error(`${description} is not a record array`);
  return value;
}

function requireStateVersionValue(value: unknown): StateVersion {
  const record = requireUnknownRecord(value, 'state version'),
    revision = record.revision,
    digest = record.digest;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || typeof digest !== 'string')
    throw new Error('state version fields are invalid');
  return { revision, digest };
}

function requireCorrectiveExecution(value: unknown): CorrectiveExecution {
  const record = requireUnknownRecord(value, 'corrective execution');
  const schema = record.schema,
    baseRunId = record.base_run_id,
    engineRunId = record.engine_run_id,
    generation = record.correction_generation,
    rawStageIds = record.stage_ids,
    authorization = record.authorization;
  if (
    schema !== 'CorrectiveExecution/v1' ||
    typeof baseRunId !== 'string' ||
    typeof engineRunId !== 'string' ||
    typeof generation !== 'number' ||
    !Number.isSafeInteger(generation) ||
    !Array.isArray(rawStageIds) ||
    !isPlainRecord(authorization) ||
    authorization.schema !== 'CorrectiveAssignmentAuthorization/v1' ||
    typeof authorization.path !== 'string' ||
    typeof authorization.sha256 !== 'string'
  )
    throw new Error('corrective execution fields are invalid');
  const stageIds: string[] = [];
  for (const stageId of rawStageIds) {
    if (typeof stageId !== 'string') throw new Error('corrective execution stage id is invalid');
    stageIds.push(stageId);
  }
  return {
    schema,
    base_run_id: baseRunId,
    engine_run_id: engineRunId,
    correction_generation: generation,
    stage_ids: stageIds,
    authorization: {
      schema: authorization.schema,
      path: authorization.path,
      sha256: authorization.sha256,
    },
  };
}

function requireCorrectionPlan(value: unknown): {
  readonly work_changes: readonly { readonly after: WorkState }[];
} {
  const record = requireUnknownRecord(value, 'correction-generation repair plan');
  const changes = requireUnknownRecordArray(record.work_changes, 'correction-generation Work changes');
  return {
    work_changes: changes.map((change) => ({ after: parseWorkStateValue(change.after) })),
  };
}

function parseAgentRuntimeConfigYaml(text: string): AgentRuntimeConfig {
  const value: unknown = parseYaml(text);
  if (!validateAgentRuntimeConfig(value)) throw new Error('fixture YAML is not a current AgentRuntimeConfig/v1 record');
  return value;
}

type AdmissionResult = ReturnType<typeof admitLocalSessionWorkSource>;
type PersistedAdmission = AdmissionResult & {
  readonly host: Omit<AdmissionResult['host'], 'work' | 'ledger' | 'workVersion' | 'ledgerVersion'> & {
    readonly work: WorkState;
    readonly ledger: CoordinationLedger;
    readonly workVersion: StateVersion;
    readonly ledgerVersion: StateVersion;
  };
};
type CompleteHostSnapshot = ReturnType<HostStateStore['readHostStateSnapshot']> & {
  readonly work: WorkState;
  readonly ledger: CoordinationLedger;
  readonly workVersion: StateVersion;
  readonly ledgerVersion: StateVersion;
};
type CorrectiveExecution = ReturnType<HostStateStore['authorizeCorrectiveExecution']>;
type FixtureInstance = ReturnType<typeof createFixture>;
type FixtureAdmissionInput = ReturnType<FixtureInstance['prepare']>;
type TypedFixtureInstance = Omit<FixtureInstance, 'admit'> & {
  admit(input: FixtureAdmissionInput): PersistedAdmission;
};

function fixture(...args: Parameters<typeof createFixture>): TypedFixtureInstance {
  const original = createFixture(...args);
  return {
    ...original,
    admit(input) {
      const result = original.admit(input);
      assertPersistedAdmission(result);
      return result;
    },
  };
}

function assertCompleteHostSnapshot(
  result: ReturnType<HostStateStore['readHostStateSnapshot']>,
): asserts result is CompleteHostSnapshot {
  if (!result.work || !result.ledger || !result.workVersion || !result.ledgerVersion)
    throw new Error('expected a complete persisted Host snapshot');
}

function assertPersistedAdmission(result: AdmissionResult): asserts result is PersistedAdmission {
  if (!result.host.work || !result.host.ledger || !result.host.workVersion || !result.host.ledgerVersion)
    throw new Error('successful admission did not return complete persisted Host state');
}

function admitLocalSessionWork(input: Parameters<typeof admitLocalSessionWorkSource>[0]): PersistedAdmission {
  const result = admitLocalSessionWorkSource(input);
  assertPersistedAdmission(result);
  return result;
}

function acquireLocalSourceWriterLease(
  input: Parameters<typeof acquireLocalSourceWriterLeaseSource>[0],
): CompleteHostSnapshot {
  const result = acquireLocalSourceWriterLeaseSource(input);
  assertCompleteHostSnapshot(result);
  return result;
}

function requireWorkArtifact(work: WorkState, artifactId: string): WorkArtifactReference {
  const artifact = work.artifacts.find((entry) => entry.artifact_id === artifactId);
  if (!artifact) throw new Error(`persisted work is missing artifact ${artifactId}`);
  return artifact;
}

test('admission retains complete original entries and exact retry rejects a different base attempt', () => {
  const f = fixture();
  try {
    const input = f.prepare('retained', 'user:retained');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['missing.ts', 'AGENT.sidecar.md']);
    const scope = parseImplementationScopeJson(readFileSync(path.join(f.root, input.scopePath), 'utf8'));
    const acceptance = parseAcceptanceManifestJson(readFileSync(path.join(f.root, input.acceptancePath), 'utf8'));
    writeFileSync(
      path.join(f.root, input.scopePath),
      JSON.stringify({ ...scope, allowed_paths: source.entries.map((e) => e.path), source_revision: source.digest }),
    );
    writeFileSync(
      path.join(f.root, input.acceptancePath),
      JSON.stringify({ ...acceptance, source_revision: source.digest }),
    );
    input.context = { ...input.context, scope_digest: source.digest };
    const admitted = admitLocalSessionWork(input);
    const reference = requireWorkArtifact(admitted.host.work, 'admission-source-snapshot');
    expect(reference.schema).toBe('ScopedSourceSnapshot/v1');
    expect(reference.path).toBe(`${f.config.control.work_root}/retained/scoped-source-attempt-1.v1.json`);
    const bytes = readFileSync(path.join(f.root, reference.path));
    const retainedSource = parseScopedSourceSnapshotJson(bytes.toString('utf8'));
    expect(retainedSource).toEqual(source);
    expect(retainedSource.entries.find((entry) => entry.path === 'missing.ts')?.exists).toBe(false);
    expect(admitLocalSessionWork(input)).toEqual(admitted);
    expect(readFileSync(path.join(f.root, reference.path))).toEqual(bytes);
    const restartedDatabase = openHostStateDatabase(f.root, 'fixture.sqlite', f.store.workspaceId);
    try {
      const restarted = new HostStateStore(restartedDatabase, f.store.workspaceId);
      expect(admitLocalSessionWork({ ...input, store: restarted })).toEqual(admitted);
      expect(readFileSync(path.join(f.root, reference.path))).toEqual(bytes);
    } finally {
      closeWorkspaceDatabaseWithAdmission(restartedDatabase);
    }
    const before = f.store.readWorkspaceSnapshot();
    expect(() => admitLocalSessionWork({ ...input, context: { ...input.context, attempt: 2 } })).toThrow(
      /original attempt/,
    );
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    expect(existsSync(path.join(f.root, reference.path.replace('attempt-1', 'attempt-2')))).toBe(false);
    writeFileSync(path.join(f.root, 'missing.ts'), 'appeared after original admission');
    expect(() => admitLocalSessionWork(input)).toThrow(/revision is stale/);
    expect(readFileSync(path.join(f.root, reference.path))).toEqual(bytes);
  } finally {
    f.close();
  }
});

test('admission retry never reconstructs missing or changed retained original evidence', () => {
  for (const mode of ['missing', 'changed']) {
    const f = fixture();
    try {
      const input = f.prepare('retry', 'user:retry'),
        admitted = admitLocalSessionWork(input);
      const reference = requireWorkArtifact(admitted.host.work, 'admission-source-snapshot');
      const target = path.join(f.root, reference.path);
      if (mode === 'missing') unlinkSync(target);
      else writeFileSync(target, '{}');
      const before = f.store.readWorkspaceSnapshot();
      expect(() => admitLocalSessionWork(input)).toThrow();
      expect(f.store.readWorkspaceSnapshot()).toEqual(before);
      if (mode === 'missing') expect(existsSync(target)).toBe(false);
      else expect(readFileSync(target, 'utf8')).toBe('{}');
    } finally {
      f.close();
    }
  }
});

test('admission uses the validated configured work root for retained evidence', () => {
  const f = fixture();
  try {
    const configPath = path.join(f.root, 'agent-runtime.config.v1.yaml'),
      config = parseAgentRuntimeConfigYaml(readFileSync(configPath, 'utf8'));
    const changedConfig: AgentRuntimeConfig = {
      ...config,
      control: { ...config.control, work_root: '.agent/owned-work' },
    };
    writeFileSync(configPath, stringifyYaml(changedConfig));
    const input = { ...f.prepare('configured-root', 'user:configured-root'), config: loadRuntimeConfig(f.root) };
    const admitted = admitLocalSessionWork(input);
    const reference = requireWorkArtifact(admitted.host.work, 'admission-source-snapshot');
    expect(reference.path).toBe('.agent/owned-work/configured-root/scoped-source-attempt-1.v1.json');
    expect(parseScopedSourceSnapshotJson(readFileSync(path.join(f.root, reference.path), 'utf8'))).toEqual(f.source);
    expect(existsSync(path.join(f.root, '.agent/work/configured-root/scoped-source-attempt-1.v1.json'))).toBe(false);
  } finally {
    f.close();
  }
});

test('partial oversized or linked admission preparation denies without overwriting or granting rights', () => {
  for (const mode of ['partial', 'oversized', 'hardlink', 'reparse']) {
    const f = fixture();
    try {
      const input = f.prepare('blocked', 'user:blocked');
      const target = path.join(f.root, f.config.control.work_root, 'blocked', 'scoped-source-attempt-1.v1.json');
      const origin = path.join(f.root, 'foreign-snapshot.json');
      writeFileSync(origin, canonicalJson(f.source));
      if (mode === 'partial') writeFileSync(target, '{');
      else if (mode === 'oversized') writeFileSync(target, Buffer.alloc(8 * 1024 * 1024 + 1));
      else if (mode === 'hardlink') linkSync(origin, target);
      else if (process.platform === 'win32') symlinkSync(f.root, target, 'junction');
      else symlinkSync(origin, target, 'file');
      const before = f.store.readWorkspaceSnapshot();
      expect(() => admitLocalSessionWork(input)).toThrow();
      expect(f.store.readWorkspaceSnapshot()).toEqual(before);
      if (mode === 'oversized') expect(readFileSync(target).length).toBe(8 * 1024 * 1024 + 1);
      else if (mode !== 'reparse' || process.platform !== 'win32')
        expect(readFileSync(target, 'utf8')).toBe(mode === 'partial' ? '{' : canonicalJson(f.source));
      else expect(() => readFileSync(target)).toThrow();
      expect(readFileSync(origin, 'utf8')).toBe(canonicalJson(f.source));
    } finally {
      f.close();
    }
  }
});

test('historical admitted Work without a retained snapshot is not backfilled from current source', () => {
  const f = fixture();
  try {
    const input = f.prepare('historical', 'user:historical');
    const admit = f.store.admitSuccessorWork.bind(f.store);
    let proposal: Parameters<HostStateStore['admitSuccessorWork']>[0] | undefined;
    f.store.admitSuccessorWork = (request) => {
      proposal = request;
      throw Error('freeze legacy fixture');
    };
    expect(() => admitLocalSessionWork(input)).toThrow(/freeze legacy fixture/);
    if (!proposal) throw new Error('admission did not freeze its successor proposal');
    const reference = requireWorkArtifact(proposal.nextWork, 'admission-source-snapshot');
    const legacy = admit({ ...proposal, nextWork: { ...proposal.nextWork, artifacts: [] } });
    assertCompleteHostSnapshot(legacy);
    unlinkSync(path.join(f.root, reference.path));
    f.store.admitSuccessorWork = admit;
    expect(admitLocalSessionWork(input).host).toEqual(legacy);
    expect(existsSync(path.join(f.root, reference.path))).toBe(false);
    const historicalRows = requireWorkspaceRows(f.store.readWorkspaceSnapshot());
    expect(historicalRows[0]?.work.artifacts).toEqual([]);
  } finally {
    f.close();
  }
});

test('source or retained artifact drift inside Host admission denies the actual transaction', () => {
  for (const mode of ['source', 'artifact']) {
    const f = fixture();
    try {
      const input = f.prepare('drift', 'user:drift');
      const before = f.store.readWorkspaceSnapshot(),
        admit = f.store.admitSuccessorWork.bind(f.store);
      f.store.admitSuccessorWork = (request) => {
        const target =
          mode === 'source'
            ? 'AGENT.sidecar.md'
            : requireWorkArtifact(request.nextWork, 'admission-source-snapshot').path;
        writeFileSync(path.join(f.root, target), 'changed before actual commit');
        return admit(request);
      };
      expect(() => admitLocalSessionWork(input)).toThrow(/snapshot differs|source changed/);
      expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    } finally {
      f.close();
    }
  }
});

test(
  'producer binds original admitted risk and labels before initializing engine storage',
  async () => {
    const f = fixture(true, true);
    let bridge: Awaited<ReturnType<typeof MastraSessionBridge.open>> | undefined;
    let primaryFailure: unknown;
    let didFail = false;
    try {
      const input = f.prepare('producer-selection', 'user:producer-selection');
      input.selection = { ...input.selection, risk_flags: ['security'], labels: ['original-label'] };
      input.workItem = { ...input.workItem, risk_flags: input.selection.risk_flags, labels: input.selection.labels };
      input.intakePath = '.agent/work/producer-selection/raw-intake.json';
      writeFileSync(
        path.join(f.root, input.intakePath),
        JSON.stringify({
          schema: 'VidaLocalSessionIntake/v1',
          work_item: input.workItem,
          native_session_handle: input.nativeSessionHandle,
          scope_path: input.scopePath,
          acceptance_path: input.acceptancePath,
          runtime_code_paths: input.runtimeCodePaths,
          route: input.route,
          risk: input.risk,
          change_kind: input.changeKind,
        }),
      );
      admitLocalSessionWork(input);
      const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
      const args = {
        repositoryRoot: f.root,
        config: f.config,
        ledger,
        projectIds: ['sample'],
        selection: input.selection,
        context: input.context,
        workflowId: 'implementation_change',
        workspaceId: f.store.workspaceId,
      };
      const enginePath = path.join(f.root, f.config.control.work_root, 'mastra-workflows.v1.sqlite');
      const selections: WorkItemSelection[] = [
        { ...input.selection, risk_flags: [] },
        { ...input.selection, labels: [] },
        { ...input.selection, kind: 'bug' },
        { ...input.selection, intent: 'task_execution' },
        { ...input.selection, project: 'foreign' },
      ];
      for (const selection of selections) {
        await Promise.resolve(expect(MastraSessionBridge.open({ ...args, selection })).rejects.toThrow());
        expect(existsSync(enginePath)).toBe(false);
        const governanceCount = f.database
          .query<{ count: number }, []>(
            "SELECT COUNT(*) AS count FROM agent_host_governance WHERE store_id='vida-session-producers'",
          )
          .get();
        if (!governanceCount) throw new Error('governance count query returned no row');
        expect(governanceCount.count).toBe(0);
      }
      bridge = await MastraSessionBridge.open(args);
      expect(await bridge.snapshot()).toBeNull();
      expect(existsSync(enginePath)).toBe(true);
    } catch (error) {
      primaryFailure = error;
      didFail = true;
    }
    const cleanupFailures: unknown[] = [];
    if (bridge) {
      try {
        await bridge.close();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    try {
      f.close({ retainRoot: didFail });
    } catch (error) {
      cleanupFailures.push(error);
    }
    if (didFail && cleanupFailures.length > 0)
      throw new AggregateError(
        [primaryFailure, ...cleanupFailures],
        'Producer selection failed; fixture cleanup also failed',
      );
    if (didFail) throw primaryFailure;
    if (cleanupFailures.length === 1) throw cleanupFailures[0];
    if (cleanupFailures.length > 1)
      throw new AggregateError(cleanupFailures, 'Producer selection fixture cleanup failed');
  },
  { timeout: 30_000 },
);

test('competing base attempt commits before the local Host call and cannot be reused by its loser', () => {
  const f = fixture();
  try {
    const loser = f.prepare('same-work', 'user:same-work');
    const admit = f.store.admitSuccessorWork.bind(f.store);
    let winner: PersistedAdmission | undefined;
    f.store.admitSuccessorWork = (request) => {
      f.store.admitSuccessorWork = admit;
      winner = admitLocalSessionWork({ ...loser, context: { ...loser.context, attempt: 2 } });
      return admit(request);
    };
    expect(() => admitLocalSessionWork(loser)).toThrow(/retry differs/);
    if (!winner) throw new Error('competing admission did not commit its winner');
    const committedRows = requireWorkspaceRows(f.store.readWorkspaceSnapshot());
    expect(committedRows).toHaveLength(1);
    expect(committedRows[0]?.work.execution.run_id).toBe(winner.host.work.execution.run_id);
    expect(requireWorkArtifact(winner.host.work, 'admission-source-snapshot').path).toContain('attempt-2');
    expect(admitLocalSessionWork({ ...loser, context: { ...loser.context, attempt: 2 } })).toEqual(winner);
  } finally {
    f.close();
  }
});

test('data-only admitted context rejects expired tickets, expired claims and absent active claims', () => {
  const f = fixture(false, true);
  let completed = false;
  try {
    const input = f.prepare('live-context', 'user:live-context');
    if (!input.nativeSessionHandle) throw new Error('live context fixture has no native session handle');
    input.intakePath = '.agent/work/live-context/raw-intake.json';
    writeFileSync(
      path.join(f.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    f.admit(input);
    const row = f.database
      .query<{ payload: string }, []>("SELECT payload FROM agent_host_state WHERE kind='ledger'")
      .get();
    if (!row) throw new Error('persisted coordination ledger is missing');
    const original = parseCoordinationLedgerJson(row.payload);
    const current = readAdmittedSessionExecutionContext(f.root, f.store, 'sample', 'live-context');
    expect(requireWorkLease(current.work).thread_id).toBe('session');
    const before = f.store.readHostStateSnapshot(current.identity);
    assertCompleteHostSnapshot(before);
    for (const nativeSessionHandle of ['x'.repeat(257), 'session\u0001']) {
      expect(() =>
        requireLiveLocalSessionAdmission({
          repositoryRoot: f.root,
          identity: current.identity,
          store: f.store,
          nativeSessionHandle,
        }),
      ).toThrow('native session handle is invalid');
      expect(f.store.readHostStateSnapshot(current.identity)).toEqual(before);
    }
    for (const scenario of ['ticket-expired', 'claim-expired', 'claim-inactive']) {
      const changed = parseCoordinationLedgerJson(row.payload);
      const ticket = changed.tickets.find((item) => item.work_id === 'live-context');
      if (!ticket) throw new Error('live context coordination ticket is missing');
      const claim = changed.claims.find((item) => item.ticket_id === ticket.ticket_id);
      if (!claim) throw new Error('live context coordination claim is missing');
      const expiredAt = '2020-01-01T00:00:00.000Z';
      const nextLedger: CoordinationLedger = {
        ...changed,
        tickets: changed.tickets.map((item) =>
          item.ticket_id !== ticket.ticket_id
            ? item
            : scenario === 'claim-inactive'
              ? { ...item, active_resources: [], expires_at: null }
              : scenario === 'ticket-expired'
                ? { ...item, expires_at: expiredAt }
                : item,
        ),
        claims: changed.claims.map((item) =>
          item.ticket_id !== ticket.ticket_id
            ? item
            : scenario === 'claim-inactive'
              ? { ...item, status: 'released' }
              : scenario === 'ticket-expired' || scenario === 'claim-expired'
                ? { ...item, lease_expires_at: expiredAt }
                : item,
        ),
      };
      f.database
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
        .run(canonicalJson(nextLedger), canonicalJsonDigest(nextLedger));
      expect(() => readAdmittedSessionExecutionContext(f.root, f.store, 'sample', 'live-context')).toThrow(
        scenario === 'claim-expired'
          ? 'ticket effective lease differs from claims'
          : 'local workflow admission or exact-path lease is stale',
      );
      f.database
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
        .run(canonicalJson(original), canonicalJsonDigest(original));
    }
    expect(
      requireLiveLocalSessionAdmission({
        repositoryRoot: f.root,
        identity: current.identity,
        store: f.store,
        nativeSessionHandle: requireWorkLease(current.work).thread_id,
      }),
    ).toEqual(before);
    completed = true;
  } finally {
    f.close({ retainRoot: !completed });
  }
});

test('effective artifact producers reject risk omission and unsupported tester or delivery cardinality', () => {
  const f = fixture(),
    file = path.join(f.root, 'agent-runtime.config.v1.yaml'),
    original = readFileSync(file, 'utf8');
  try {
    for (const scenario of ['filtered-tester', 'multiple-testers', 'multiple-deliveries'] as const) {
      const config = parseAgentRuntimeConfigYaml(original),
        workflow = config.workflows.implementation_change;
      if (!workflow) throw new Error('fixture config has no implementation-change workflow');
      const targetKind = scenario === 'multiple-deliveries' ? 'deliver' : 'test',
        targetStage = workflow.stages.find((stage) => stage.kind === targetKind);
      if (!targetStage) throw new Error(`fixture workflow has no ${targetKind} stage`);
      const assignments = [...targetStage.assignments];
      if (scenario === 'filtered-tester') {
        const firstAssignment = assignments[0];
        if (!firstAssignment) throw new Error('fixture stage has no assignment');
        assignments[0] = { ...firstAssignment, risk_flags: ['security'] };
      } else {
        const firstAssignment = assignments[0];
        if (!firstAssignment) throw new Error('fixture stage has no assignment');
        assignments.push({ ...firstAssignment });
      }
      const changedConfig: AgentRuntimeConfig = {
        ...config,
        workflows: {
          ...config.workflows,
          implementation_change: {
            ...workflow,
            stages: workflow.stages.map((stage) => (stage.id === targetStage.id ? { ...stage, assignments } : stage)),
          },
        },
      };
      writeFileSync(file, stringifyYaml(changedConfig));
      expect(() =>
        compileDevelopmentWorkflow(loadRuntimeConfig(f.root), 'default-development', 'implementation_change', []),
      ).toThrow();
    }
    const config = parseAgentRuntimeConfigYaml(original),
      workflow = config.workflows.implementation_change;
    if (!workflow) throw new Error('fixture config has no implementation-change workflow');
    const research = workflow.stages[0];
    if (!research) throw new Error('fixture workflow has no research stage');
    const firstAssignment = research.assignments[0];
    if (!firstAssignment) throw new Error('fixture research stage has no assignment');
    const changedConfig: AgentRuntimeConfig = {
      ...config,
      workflows: {
        ...config.workflows,
        implementation_change: {
          ...workflow,
          stages: workflow.stages.map((stage, index) =>
            index === 0
              ? { ...stage, assignments: [{ ...firstAssignment, risk_flags: ['security'] }, ...stage.assignments] }
              : stage,
          ),
        },
      },
    };
    writeFileSync(file, stringifyYaml(changedConfig));
    const valid = compileDevelopmentWorkflow(
      loadRuntimeConfig(f.root),
      'default-development',
      'implementation_change',
      [],
    );
    const testStage = valid.waves.flat().find((stage) => stage.kind === 'test'),
      deliverStage = valid.waves.flat().find((stage) => stage.kind === 'deliver');
    if (!testStage || !deliverStage) throw new Error('compiled fixture workflow is missing a required stage');
    expect(testStage.assignments.filter((item) => item.role === 'tester')).toHaveLength(1);
    expect(deliverStage.assignments.filter((item) => item.role === 'delivery-agent')).toHaveLength(1);
  } finally {
    f.close();
  }
});

test('workspace projection bounds individual rows and includes its shared ledger only once', () => {
  const f = fixture();
  try {
    for (let index = 0; index < 12; index++) f.admit(f.prepare('parallel-' + index, 'user:parallel'));
    const current = f.store.readWorkspaceSnapshot();
    const rows = requireWorkspaceRows(current);
    assertCompleteWorkspaceSnapshot(current);
    expect(rows).toHaveLength(12);
    expect(rows.every((row) => !Object.hasOwn(row, 'ledger') && !Object.hasOwn(row, 'ledgerVersion'))).toBe(true);
    for (const row of rows) expect(row.workVersion.digest).toBe(canonicalJsonDigest(row.work));
    expect(current.ledger_version.digest).toBe(canonicalJsonDigest(current.ledger));
    const inspected = inspectHostWorkspaceDatabase(f.root, 'fixture.sqlite', f.store.workspaceId);
    expect(inspected.work).toHaveLength(12);
    expect(inspected.ledger_version).toEqual(current.ledger_version);
  } finally {
    f.close();
  }
}, 10000);

test('public admission preserves same-request parallel contours and atomically absorbs old same-session requests', () => {
  const f = fixture();
  try {
    const first = f.prepare('first', 'user:one'),
      parallel = f.prepare('parallel', 'user:one');
    f.admit(first);
    f.admit(parallel);
    const before = f.store.readWorkspaceSnapshot();
    const beforeRows = requireWorkspaceRows(before);
    expect(beforeRows.every((entry) => entry.work.execution.status === 'active')).toBe(true);
    const successor = f.prepare('next', 'user:two');
    const admitted = admitLocalSessionWork(successor);
    expect(requireRequestTransition(admitted.host.work).predecessor_work_ids).toEqual(['first', 'parallel']);
    const after = f.store.readWorkspaceSnapshot();
    assertCompleteWorkspaceSnapshot(after);
    expect(requireWorkspaceRows(after).filter((entry) => entry.work.execution.status === 'suspended')).toHaveLength(2);
    expect(after.ledger.claims.filter((claim) => claim.status === 'active')).toHaveLength(1);
    expect(admitLocalSessionWork(successor).host).toEqual(admitted.host);
    successor.workItem = { ...successor.workItem, title: 'Changed retry' };
    expect(() => admitLocalSessionWork(successor)).toThrow(/retry differs/);
  } finally {
    f.close();
  }
});

test('expired real execution-only admission rebinds only its owned execution resource', () => {
  const f = fixture();
  try {
    const input = f.prepare('old', 'user:old'),
      initial = f.admit(input),
      planned = prepareSessionWorkflowHandoffFromConfig(f.config, input.selection, input.context),
      runId = requireWorkRunId(initial.host.work);
    assertPersistedAdmission(initial);
    if (
      planned.workflow_id !== initial.host.work.binding.workflow_id ||
      planned.config_digest !== initial.host.work.binding.config_digest
    )
      throw new Error('expired admission session plan differs from its admitted workflow binding');
    const acceptedReadonly = planned.actions.map((action, index) => {
      const issueId = randomUUID(),
        summary =
          index === 0
            ? 'Observed completed readonly fixture request'
            : `Observed completed readonly fixture request for ${action.role}`,
        toolCallRef = index === 0 ? 'fixture-expired-readonly' : `fixture-expired-readonly-${index}`,
        observation: SessionBridgeObservation = {
          schema: 'VidaSessionObservation/v1',
          action_id: action.action_id,
          issue_id: issueId,
          agent_id: index === 0 ? 'fixture-reader' : `fixture-reader-${index}`,
          tool_call_ref: toolCallRef,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture:accepted-readonly'],
        },
        outcome: SessionAgentOutcome = {
          action_id: action.action_id,
          handoff_digest: planned.digest,
          work_id: action.work_id,
          attempt: action.attempt,
          scope_digest: action.scope_digest,
          wave_index: action.wave_index,
          action_order: action.action_order,
          stage_id: action.stage_id,
          role: action.role,
          status: 'reported_complete',
          summary,
          session_result: {
            issue_id: issueId,
            agent_id: observation.agent_id,
            tool_call_ref: toolCallRef,
            output_digest: observation.output_digest,
          },
          evidence_refs: observation.evidence_refs,
        };
      return {
        outcome,
        item: {
          request: buildSessionBridgeRequest({
            runId,
            workflowId: planned.workflow_id,
            configDigest: planned.config_digest,
            context: input.context,
            waveIndex: planned.wave_index,
            action,
            configuredContext: null,
            priorResults: [],
          }),
          issue_id: issueId,
          observation,
        },
      };
    });
    const nextPlan = advanceSessionWorkflowHandoffFromConfig(
        f.config,
        planned,
        acceptedReadonly.map(({ outcome }) => outcome),
      ),
      nextAction = nextPlan.actions[0];
    if (!nextAction) throw new Error('expired admission session planner produced no unissued successor action');
    const request = buildSessionBridgeRequest({
      runId,
      workflowId: nextPlan.workflow_id,
      configDigest: nextPlan.config_digest,
      context: input.context,
      waveIndex: nextPlan.wave_index,
      action: nextAction,
      configuredContext: null,
      priorResults: acceptedReadonly.map(({ item }) => item.observation),
    });
    const plannedJournal = parseMastraSessionLedgerState({
      ...parseMastraSessionLedgerJson(
        f.database
          .query<{ payload: string }, [string]>('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
          .get('old')?.payload ?? '',
      ),
      step_id: 'wave-' + nextPlan.wave_index,
      items: [{ request, issue_id: null, observation: null }],
      completed: [
        {
          step_id: 'wave-' + planned.wave_index,
          items: acceptedReadonly.map(({ item }) => item),
        },
      ],
    });
    f.database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=2,payload=?,digest=? WHERE work_id=?')
      .run(canonicalJson(plannedJournal), canonicalJsonDigest(plannedJournal), 'old');
    const historical = parseMastraSessionLedgerJson(
      f.database
        .query<{ payload: string }, [string]>('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
        .get('old')?.payload ?? '',
    );
    const priorItem = historical.completed[0]?.items[0];
    if (!priorItem?.observation) throw new Error('expired admission fixture has no accepted readonly observation');
    const work = initial.host.work,
      lease = requireWorkLease(work),
      journal = f.store.readWorkSessionJournal({
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: 'old',
      });
    const originalClock = Date.now;
    try {
      Date.now = () => Date.parse(requireTicketExpiry(initial.host.ledger, lease.ticket_id)) + 1;
      const recovered = f.store.recoverExpiredLocalLease({
        identity: {
          repository_id: work.binding.repository_id,
          project_ids: work.binding.project_ids,
          integrations_digest: work.binding.integrations_digest,
          work_id: 'old',
        },
        attempt: 1,
        nativeSessionHandle: 'session',
        generation: lease.generation,
        expectedWork: initial.host.workVersion,
        expectedLedger: initial.host.ledgerVersion,
        expectedJournal: requireJournalVersion(journal),
        expectedMaintenanceGeneration: initial.host.maintenanceGeneration,
        verifyCurrent() {
          return { runtimeCodeDigest: work.binding.runtime_code_digest, authorityPointer: 'fixture:current-package' };
        },
      });
      assertCompleteHostSnapshot(recovered);
      expect(requireHostLedger(recovered).rebinds.at(-1)?.resources).toEqual(['execution:old']);
      expect(
        requireHostLedger(recovered)
          .claims.filter((claim) => claim.status === 'active')
          .map((claim) => claim.resources),
      ).toEqual([['execution:old']]);
      expect(recovered.work.binding.allowed_resources).toEqual(work.binding.allowed_resources);
    } finally {
      Date.now = originalClock;
    }
  } finally {
    f.close();
  }
});

test('public report retrieves an exact durable observation before stale CAS and source-delta checks', async () => {
  const f = fixture(false, true);
  try {
    const input = f.prepare('ack', 'user:ack');
    input.intakePath = '.agent/work/ack/raw-intake.json';
    writeFileSync(
      path.join(f.root, input.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: input.workItem,
        native_session_handle: input.nativeSessionHandle,
        scope_path: input.scopePath,
        acceptance_path: input.acceptancePath,
        runtime_code_paths: input.runtimeCodePaths,
        route: input.route,
        risk: input.risk,
        change_kind: input.changeKind,
      }),
    );
    const initial = f.admit(input),
      work = initial.host.work;
    writeFileSync(
      path.join(f.root, '.agent', 'runtime-initialization.v1.json'),
      JSON.stringify({
        schema: 'RuntimeInitialization/v1',
        version: 1,
        repository_id: f.config.repository.repository_id,
        project_ids: ['sample'],
        integrations_digest: canonicalJsonDigest(f.config.integrations),
        workspace_id: f.store.workspaceId,
        workspace_binding_status: 'pending',
        bundle: f.config.runtime.bundle,
        config_digest: runtimeConfigDigest(f.config),
        schema_sha256: createHash('sha256')
          .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
          .digest('hex'),
        templates: fixtureInitializationTemplates(f.root, bundle),
        created_at: new Date().toISOString(),
      }),
    );
    f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run('ack');
    const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
    const request: SessionBridgeRequest = {
      schema: 'VidaSessionRequest/v1',
      run_id: requireWorkRunId(work),
      workflow_id: work.binding.workflow_id,
      wave_index: 0,
      action_id: '2'.repeat(64),
      assignment_index: 0,
      stage_id: 'research_parallel',
      role: 'facts-researcher',
      config_digest: work.binding.config_digest,
      scope_digest: work.binding.work_source_revision,
      bindings_manifest_ref: '3'.repeat(64),
    };
    const runId = requireWorkRunId(work);
    let journal = requireSessionJournal(ledger.sync('ack', 1, runId, 'research_parallel', [request], f.source));
    journal = requireSessionJournal(ledger.issueWave('ack', 1, journal.version));
    const activation = await issueObservedResearchActivation({
      repositoryRoot: f.root,
      config: f.config,
      ledger,
      identity: {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: 'ack',
      },
      journal,
      actionId: request.action_id,
    });
    journal = requireSessionJournal(ledger.markResearchWaveExposurePossible('ack', 1, activation.journal.version));
    const firstItem = journal.state.items[0];
    if (!firstItem?.issue_id) throw new Error('issued readonly fixture request has no issue id');
    const summary = 'Observed readonly fixture result',
      observation: Parameters<MastraSessionLedger['report']>[3] = {
        schema: 'VidaSessionObservation/v1',
        action_id: request.action_id,
        issue_id: firstItem.issue_id,
        agent_id: 'fixture-reader',
        tool_call_ref: 'fixture-ack',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:observed-result'],
      };
    const recorded = ledger.report('ack', 1, journal.version, observation, f.source),
      report = path.join(f.root, 'report.json');
    writeFileSync(report, JSON.stringify(observation));
    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'changed source after accepted report');
    const args = [
      '--project-root',
      f.root,
      '--repository',
      f.config.repository.repository_id,
      '--project',
      'sample',
      '--work-path',
      'AGENT.sidecar.md',
      '--work-id',
      'ack',
      '--attempt',
      '1',
      '--scope-digest',
      f.source.digest,
      '--team',
      'default-development',
      '--kind',
      'research',
      '--intent',
      'information_research',
      '--workflow',
      'information_research_light',
      '--report',
      report,
      '--expected-revision',
      String(journal.version.revision),
      '--expected-digest',
      journal.version.digest,
    ];
    const before = f.store.readHostStateSnapshot({
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: 'ack',
    });
    assertCompleteHostSnapshot(before);
    const result: unknown = await run(args);
    if (!isPlainRecord(result) || result.status !== 'report_retrieved')
      throw new Error('run did not return the exact durable report receipt');
    expect(result.status).toBe('report_retrieved');
    expect(result.state_version).toEqual(recorded.version);
    expect(result.issued_actions).toEqual([]);
    expect(ledger.resume('ack', 1)).toEqual(recorded);
    expect(
      f.store.readHostStateSnapshot({
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: 'ack',
      }),
    ).toEqual(before);
    expect(
      f.database
        .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE name='mastra_workflow_snapshot'")
        .get(),
    ).toBeNull();
    writeFileSync(
      report,
      JSON.stringify({ ...observation, summary: 'changed retry', output_digest: canonicalJsonDigest('changed retry') }),
    );
    await Promise.resolve(expect(run(args)).rejects.toThrow(/retry differs/));
  } finally {
    f.close();
  }
});

test.each(['new-report', 'durable-expired', 'durable-drift'])(
  'accepted completed source report atomically releases file ownership for readonly assurance and exact retry: %s',
  (scenario) => {
    const f = fixture(true, true);
    try {
      const admissionInput = f.prepare('writer', 'user:writer'),
        initial = f.admit(admissionInput),
        identity = {
          repository_id: initial.host.work.binding.repository_id,
          project_ids: initial.host.work.binding.project_ids,
          integrations_digest: initial.host.work.binding.integrations_digest,
          work_id: 'writer',
        };
      const active = acquireLocalSourceWriterLease({
        repositoryRoot: f.root,
        config: f.config,
        store: f.store,
        identity,
        nativeSessionHandle: 'session',
        expectedWork: initial.host.workVersion,
        expectedLedger: initial.host.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
      });
      const activeWork = requireHostWork(active),
        activeLedger = requireHostLedger(active),
        activeLease = requireWorkLease(activeWork);
      const claimed = f.store.claimWorkflowAttempt({
        identity,
        expectedWork: active.workVersion,
        expectedLedger: active.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
        requestDigest: '1'.repeat(64),
        lease: activeLease,
      });
      f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run('writer');
      const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
      const request: SessionBridgeRequest = {
        schema: 'VidaSessionRequest/v1',
        run_id: requireWorkRunId(initial.host.work),
        action_id: '2'.repeat(64),
        workflow_id: 'implementation_change',
        wave_index: 0,
        assignment_index: 0,
        role: 'developer-orchestrator',
        bindings_manifest_ref: '3'.repeat(64),
        stage_id: 'develop_change',
        scope_digest: f.source.digest,
        config_digest: activeWork.binding.config_digest,
      };
      let journal = requireSessionJournal(
        ledger.sync('writer', 1, request.run_id, 'develop_change', [request], f.source),
      );
      const claimedHost = f.store.readHostStateSnapshot(identity);
      assertCompleteHostSnapshot(claimedHost);
      const reservation = persistedReservationFixture({
        repositoryRoot: f.root,
        config: f.config,
        identity,
        host: claimedHost,
        receipt: claimed,
        selection: admissionInput.selection,
        workItem: admissionInput.workItem,
        request,
        approvalAction: 'source.write',
      });
      journal = requireSessionJournal(
        ledger.issueWave('writer', 1, journal.version, { [request.action_id]: reservation }),
      );
      const summary = 'Observed completed fixture writer';
      const issueId = journal.state.items[0]?.issue_id;
      if (!issueId) throw new Error('issued source writer request has no issue id');
      const observation: Parameters<MastraSessionLedger['report']>[3] = {
        schema: 'VidaSessionObservation/v1',
        action_id: request.action_id,
        issue_id: issueId,
        host_attempt_id: claimed.attempt.attempt_id,
        agent_id: 'fixture-writer',
        tool_call_ref: 'fixture-completed-source-call',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:observed-source-completion'],
        changed_paths: [],
      };
      const inflight = f.store.readHostStateSnapshot(identity);
      assertCompleteHostSnapshot(inflight);
      expect(
        f.store.reconcileCompletedSourceOwnership({ identity, nativeSessionHandle: 'session', verifyCurrent() {} }),
      ).toEqual(inflight);
      expect(() =>
        f.store.reconcileCompletedSourceOwnership({
          identity,
          nativeSessionHandle: 'foreign-session',
          verifyCurrent() {},
        }),
      ).toThrow(/owner differs/);
      f.store.completeWorkflowAttempt(claimed, observation);
      const peerIdentity: WorkIdentity = { ...identity, work_id: 'peer' };
      let peerQueued: CoordinationTicket | undefined;
      if (scenario === 'new-report') {
        const peer = f.admit(f.prepare('peer', 'user:peer', 'peer-session'));
        expect(() =>
          acquireLocalSourceWriterLease({
            repositoryRoot: f.root,
            config: f.config,
            store: f.store,
            identity: peerIdentity,
            nativeSessionHandle: 'peer-session',
            expectedWork: peer.host.workVersion,
            expectedLedger: peer.host.ledgerVersion,
            stageId: 'develop_change',
            assignmentIndex: 0,
          }),
        ).toThrow(/queued/);
        const peerSnapshot = f.store.readHostStateSnapshot(peerIdentity);
        assertCompleteHostSnapshot(peerSnapshot);
        peerQueued = peerSnapshot.ledger.tickets.find(
          (ticket) => ticket.work_id === 'peer' && ticket.status === 'queued',
        );
        if (!peerQueued) throw new Error('queued peer ticket was not persisted');
      }
      const originalClock = Date.now;
      if (scenario !== 'new-report') {
        const durable = { ...journal.state, items: journal.state.items.map((item) => ({ ...item, observation })) };
        f.database
          .query('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE work_id=?')
          .run(journal.version.revision + 1, canonicalJson(durable), canonicalJsonDigest(durable), 'writer');
        journal = requireSessionJournal(ledger.resume('writer', 1));
        if (scenario === 'durable-expired')
          Date.now = () => Date.parse(requireTicketExpiry(activeLedger, activeLease.ticket_id)) + 1;
        if (scenario === 'durable-drift')
          writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'external source edit after durable success');
      }
      const publish = (): MastraSessionLedgerSnapshot =>
        scenario === 'new-report'
          ? requireSessionJournal(ledger.report('writer', 1, journal.version, observation, f.source))
          : (f.store.reconcileCompletedSourceOwnership({
              identity,
              nativeSessionHandle: 'session',
              verifyCurrent() {},
            }),
            requireSessionJournal(ledger.resume('writer', 1)));
      try {
        const before = f.store.readHostStateSnapshot(identity);
        assertCompleteHostSnapshot(before);
        f.database.exec(
          `CREATE TRIGGER source_report_fault BEFORE UPDATE ON ${scenario === 'new-report' ? 'agent_host_mastra_session_ledger' : 'agent_host_state'} BEGIN SELECT RAISE(ABORT,'source journal commit fault'); END`,
        );
        expect(publish).toThrow(/source journal commit fault/);
        expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
        expect(ledger.resume('writer', 1)).toEqual(journal);
        f.database.exec('DROP TRIGGER source_report_fault');
        const recorded = publish(),
          after = f.store.readHostStateSnapshot(identity);
        assertCompleteHostSnapshot(after);
        expect(
          after.ledger.claims
            .filter((claim) => claim.status === 'active' && claim.work_id === 'writer')
            .flatMap((claim) => claim.resources),
        ).toEqual(['execution:writer']);
        expect(after.ledger.tickets.find((ticket) => ticket.ticket_id === activeLease.ticket_id)?.status).toBe(
          'released',
        );
        expect(after.work.lifecycle.phase).toBe(before.work.lifecycle.phase);
        expect(after.work.lifecycle.assurance).toEqual(before.work.lifecycle.assurance);
        expect(after.work.artifacts).toEqual(before.work.artifacts);
        expect(requireSessionJournal(ledger.report('writer', 1, journal.version, observation, f.source))).toEqual(
          recorded,
        );
        expect(f.store.readHostStateSnapshot(identity)).toEqual(after);
        if (scenario !== 'new-report') expect(recorded).toEqual(journal);
        if (scenario === 'durable-drift')
          expect(
            snapshotDeclaredSources(
              requireSafeRepositoryAccess(f.root),
              f.source.entries.map((entry) => entry.path),
            ).digest,
          ).not.toBe(f.source.digest);
        else if (scenario === 'new-report') {
          const queuedPeerTicket = requireTicketValue(peerQueued);
          expect(after.ledger.tickets.find((ticket) => ticket.ticket_id === queuedPeerTicket.ticket_id)).toEqual(
            queuedPeerTicket,
          );
          const peer = f.store.readHostStateSnapshot(peerIdentity);
          assertCompleteHostSnapshot(peer);
          const granted = acquireLocalSourceWriterLease({
            repositoryRoot: f.root,
            config: f.config,
            store: f.store,
            identity: peerIdentity,
            nativeSessionHandle: 'peer-session',
            expectedWork: peer.workVersion,
            expectedLedger: peer.ledgerVersion,
            stageId: 'develop_change',
            assignmentIndex: 0,
          });
          const grantedLease = requireWorkLease(requireHostWork(granted));
          const current = f.store.readHostStateSnapshot(identity);
          assertCompleteHostSnapshot(current);
          expect(() =>
            acquireLocalSourceWriterLease({
              repositoryRoot: f.root,
              config: f.config,
              store: f.store,
              identity,
              nativeSessionHandle: 'session',
              expectedWork: current.workVersion,
              expectedLedger: current.ledgerVersion,
              stageId: 'develop_change',
              assignmentIndex: 0,
            }),
          ).toThrow(/queued/);
          const correction = f.store.readHostStateSnapshot(identity);
          assertCompleteHostSnapshot(correction);
          const queuedCorrection = correction.ledger.tickets.find(
            (ticket) => ticket.work_id === 'writer' && ticket.status === 'queued',
          );
          if (!queuedCorrection) throw new Error('writer correction ticket was not queued');
          expect(queuedCorrection.sequence).toBeGreaterThan(queuedPeerTicket.sequence);
          expect(requireSessionJournal(ledger.report('writer', 1, journal.version, observation, f.source))).toEqual(
            recorded,
          );
          expect(
            f.store.reconcileCompletedSourceOwnership({ identity, nativeSessionHandle: 'session', verifyCurrent() {} }),
          ).toEqual(correction);
          const peerSnapshot = f.store.readHostStateSnapshot(peerIdentity);
          assertCompleteHostSnapshot(peerSnapshot);
          const activePeerClaim = peerSnapshot.ledger.claims.find(
            (claim) => claim.ticket_id === grantedLease.ticket_id && claim.status === 'active',
          );
          if (!activePeerClaim) throw new Error('peer source writer claim disappeared after report');
          expect(activePeerClaim.resources).toContain('file:AGENT.sidecar.md');
        } else
          expect(
            acquireLocalSourceWriterLease({
              repositoryRoot: f.root,
              config: f.config,
              store: f.store,
              identity,
              nativeSessionHandle: 'session',
              expectedWork: after.workVersion,
              expectedLedger: after.ledgerVersion,
              stageId: 'develop_change',
              assignmentIndex: 0,
            })
              .ledger.claims.filter((claim) => claim.status === 'active')
              .flatMap((claim) => claim.resources),
          ).toEqual(['execution:writer', 'file:AGENT.sidecar.md']);
      } finally {
        Date.now = originalClock;
      }
    } finally {
      f.close();
    }
  },
);

test('source writer promotion rejects predecessor expiry at the Host CAS boundary without changes', () => {
  const f = fixture(true);
  const originalCas = f.store.compareAndSwapHostState.bind(f.store);
  const originalNow = Date.now;
  try {
    const initial = f.admit(f.prepare('expiring-writer', 'user:expiring-writer'));
    const work = requireHostWork(initial.host);
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: 'expiring-writer',
    };
    const lease = requireWorkLease(work),
      ticketExpiry = requireTicketExpiry(initial.host.ledger, lease.ticket_id);
    const before = f.store.readHostStateSnapshot(identity);
    assertCompleteHostSnapshot(before);
    f.store.compareAndSwapHostState = (input) => {
      Date.now = () => Date.parse(ticketExpiry) + 1;
      try {
        return originalCas(input);
      } finally {
        Date.now = originalNow;
      }
    };
    expect(() =>
      acquireLocalSourceWriterLease({
        repositoryRoot: f.root,
        config: f.config,
        store: f.store,
        identity,
        nativeSessionHandle: 'session',
        expectedWork: initial.host.workVersion,
        expectedLedger: initial.host.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
      }),
    ).toThrow(/live predecessor ticket and claim/);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
  } finally {
    Date.now = originalNow;
    f.store.compareAndSwapHostState = originalCas;
    f.close();
  }
});

test('ten successive source writers release file rights while their work and Runtime acceptance remain incomplete', () => {
  // Component scope: exercise Host lease/claim/release behavior; kernel issuance remains covered by separate tests.
  const f = fixture(true, true);
  let complete = false;
  try {
    const firstAdmission = f.prepare('writer-0', 'user:request-0');
    const firstInitial = f.admit(firstAdmission);
    const firstWork = requireHostWork(firstInitial.host);
    const firstIdentity = {
      repository_id: firstWork.binding.repository_id,
      project_ids: firstWork.binding.project_ids,
      integrations_digest: firstWork.binding.integrations_digest,
      work_id: 'writer-0',
    };
    const projectContext = loadProjectSetContext(
      f.root,
      f.config,
      firstIdentity.repository_id,
      firstIdentity.project_ids,
    );
    const compiled = compileDevelopmentWorkflow(
      f.config,
      firstAdmission.selection.team,
      'implementation_change',
      firstAdmission.selection.risk_flags,
    );
    const developWaveIndex = compiled.waves.findIndex((wave) => wave.some((stage) => stage.id === 'develop_change'));
    if (developWaveIndex < 0) throw new Error('compiled fixture workflow has no develop_change wave');
    const developStage = compiled.waves[developWaveIndex]?.find((stage) => stage.id === 'develop_change');
    if (!developStage) throw new Error('compiled fixture workflow has no develop_change stage');
    const developAssignment = developStage.assignments[0];
    if (!developAssignment) throw new Error('compiled fixture develop_change stage has no assignment');
    for (let index = 0; index < 10; index++) {
      const id = 'writer-' + index,
        admissionInput = index === 0 ? firstAdmission : f.prepare(id, 'user:request-' + index),
        initial = index === 0 ? firstInitial : f.admit(admissionInput),
        work = requireHostWork(initial.host);
      const identity = {
        repository_id: work.binding.repository_id,
        project_ids: work.binding.project_ids,
        integrations_digest: work.binding.integrations_digest,
        work_id: id,
      };
      const active = acquireLocalSourceWriterLease({
        repositoryRoot: f.root,
        config: f.config,
        store: f.store,
        identity,
        nativeSessionHandle: 'session',
        expectedWork: initial.host.workVersion,
        expectedLedger: initial.host.ledgerVersion,
        stageId: 'develop_change',
        assignmentIndex: 0,
      });
      const activeLease = requireWorkLease(requireHostWork(active));
      const action = createHash('sha256').update(id).digest('hex');
      const request: SessionBridgeRequest = {
        schema: 'VidaSessionRequest/v1',
        run_id: requireWorkRunId(work),
        workflow_id: work.binding.workflow_id,
        wave_index: developWaveIndex,
        action_id: action,
        assignment_index: 0,
        stage_id: developStage.id,
        role: developAssignment.role,
        config_digest: work.binding.config_digest,
        scope_digest: work.binding.work_source_revision,
        bindings_manifest_ref: '3'.repeat(64),
      };
      const claimed = f.store.claimWorkflowAttempt({
        identity,
        expectedWork: active.workVersion,
        expectedLedger: active.ledgerVersion,
        stageId: developStage.id,
        assignmentIndex: 0,
        requestDigest: canonicalJsonDigest(request),
        lease: activeLease,
      });
      f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run(id);
      const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
      let journal = requireSessionJournal(ledger.sync(id, 1, request.run_id, 'develop_change', [request], f.source));
      const claimedHost = f.store.readHostStateSnapshot(identity);
      assertCompleteHostSnapshot(claimedHost);
      const reservation = persistedReservationFixture({
        repositoryRoot: f.root,
        config: f.config,
        identity,
        host: claimedHost,
        receipt: claimed,
        selection: admissionInput.selection,
        workItem: admissionInput.workItem,
        request,
        approvalAction: null,
        projectContext,
      });
      journal = requireSessionJournal(ledger.issueWave(id, 1, journal.version, { [action]: reservation }));
      const summary = 'Observed completed writer ' + index,
        observation: Parameters<MastraSessionLedger['report']>[3] = {
          schema: 'VidaSessionObservation/v1',
          action_id: action,
          issue_id: requireIssueId(journal.state.items[0]),
          host_attempt_id: claimed.attempt.attempt_id,
          agent_id: 'fixture-writer-' + index,
          tool_call_ref: 'fixture-completed-source-' + index,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture:observed-source-completion'],
          changed_paths: [],
        };
      f.store.completeWorkflowAttempt(claimed, observation);
      ledger.report(id, 1, journal.version, observation, f.source);
      const current = f.store.readHostStateSnapshot(identity);
      assertCompleteHostSnapshot(current);
      expect(
        requireHostLedger(current)
          .claims.filter((claim) => claim.status === 'active')
          .flatMap((claim) => claim.resources),
      ).toEqual(['execution:' + id]);
      expect(requireHostWork(current).lifecycle.phase).toBe('INTAKE');
      expect(
        requireHostWork(current).lifecycle.references.filter((reference) =>
          ['runtime_receipt', 'user_testing_receipt'].includes(reference.kind),
        ),
      ).toEqual([]);
    }
    expect(
      requireWorkspaceRows(f.store.readWorkspaceSnapshot()).filter((row) => row.work.execution.status === 'suspended'),
    ).toHaveLength(9);
    complete = true;
  } finally {
    if (!complete) console.error('Retained ten-writer fixture root after unexpected failure: ' + f.root);
    f.close({ retainRoot: !complete });
  }
}, 20000);

test('known failed source report persists while its host effect remains uncertain and fenced', () => {
  // Component scope: exercise Host file-right release and Journal uncertainty; kernel issuance is covered elsewhere.
  const f = fixture(true, true);
  let complete = false;
  try {
    const admissionInput = f.prepare('old', 'user:old'),
      initial = f.admit(admissionInput),
      work = requireHostWork(initial.host);
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: 'old',
    };
    const compiled = compileDevelopmentWorkflow(
      f.config,
      admissionInput.selection.team,
      work.binding.workflow_id,
      admissionInput.selection.risk_flags,
    );
    const developWaveIndex = compiled.waves.findIndex((wave) => wave.some((entry) => entry.id === 'develop_change'));
    if (developWaveIndex < 0) throw new Error('compiled fixture workflow has no develop_change wave');
    const stage = compiled.waves[developWaveIndex]?.find((entry) => entry.id === 'develop_change');
    if (!stage) throw new Error('compiled fixture workflow has no develop_change stage');
    const assignment = stage.assignments[0];
    if (!assignment) throw new Error('compiled fixture develop_change stage has no assignment');
    const active = acquireLocalSourceWriterLease({
      repositoryRoot: f.root,
      config: f.config,
      store: f.store,
      identity,
      nativeSessionHandle: admissionInput.nativeSessionHandle,
      expectedWork: initial.host.workVersion,
      expectedLedger: initial.host.ledgerVersion,
      stageId: stage.id,
      assignmentIndex: 0,
    });
    const activeLease = requireWorkLease(requireHostWork(active));
    const request: SessionBridgeRequest = {
      schema: 'VidaSessionRequest/v1',
      run_id: requireWorkRunId(work),
      workflow_id: work.binding.workflow_id,
      wave_index: developWaveIndex,
      action_id: '2'.repeat(64),
      assignment_index: 0,
      stage_id: stage.id,
      role: assignment.role,
      config_digest: work.binding.config_digest,
      scope_digest: work.binding.work_source_revision,
      bindings_manifest_ref: '3'.repeat(64),
    };
    const claimed = f.store.claimWorkflowAttempt({
      identity,
      expectedWork: active.workVersion,
      expectedLedger: active.ledgerVersion,
      stageId: stage.id,
      assignmentIndex: 0,
      requestDigest: canonicalJsonDigest(request),
      lease: activeLease,
    });
    f.database.query('DELETE FROM agent_host_mastra_session_ledger WHERE work_id=?').run('old');
    const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, f.store);
    const claimedHost = f.store.readHostStateSnapshot(identity);
    assertCompleteHostSnapshot(claimedHost);
    const reservation = persistedReservationFixture({
      repositoryRoot: f.root,
      config: f.config,
      identity,
      host: claimedHost,
      receipt: claimed,
      selection: admissionInput.selection,
      workItem: admissionInput.workItem,
      request,
      approvalAction: null,
    });
    let journal = requireSessionJournal(ledger.sync('old', 1, request.run_id, stage.id, [request], f.source));
    journal = requireSessionJournal(ledger.issueWave('old', 1, journal.version, { [request.action_id]: reservation }));
    f.store.markWorkflowAttemptUncertain(claimed);
    const before = f.store.readHostStateSnapshot(identity);
    assertCompleteHostSnapshot(before);
    const summary = 'Observed writer failure; filesystem outcome remains uncertain';
    const issueId = requireIssueId(journal.state.items[0]);
    const failed: Parameters<MastraSessionLedger['report']>[3] = {
      schema: 'VidaSessionObservation/v1',
      action_id: request.action_id,
      issue_id: issueId,
      host_attempt_id: claimed.attempt.attempt_id,
      agent_id: 'fixture-writer',
      tool_call_ref: 'fixture-failed-source-call',
      status: 'reported_failed',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: ['fixture:observed-failure'],
    };
    const recorded = requireSessionJournal(ledger.report('old', 1, journal.version, failed, null)),
      recordedItem = recorded.state.items[0],
      firstAttempt = before.work.execution.assignment_attempts[0];
    if (!recordedItem || !firstAttempt) throw new Error('failed source report fixture is incomplete');
    expect(recordedItem.observation).toEqual(failed);
    expect(recorded.resume_status).toBe('blocked');
    expect(recorded.state.source_scope).toEqual(f.source);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(firstAttempt.status).toBe('uncertain');
    expect(before.work.lease).toEqual(active.work.lease);
    expect(requireSessionJournal(ledger.report('old', 1, journal.version, failed, null))).toEqual(recorded);
    complete = true;
  } finally {
    if (!complete) console.error('Retained failed-report fixture root after unexpected failure: ' + f.root);
    f.close({ retainRoot: !complete });
  }
});

test('public admission rejects drifted predecessor attribution without any effects and preserves foreign sessions', () => {
  const f = fixture();
  try {
    const foreign = f.prepare('foreign', 'user:foreign', 'another-session');
    f.admit(foreign);
    const old = f.prepare('old', 'user:old');
    f.admit(old);
    const foreignBeforeRows = requireWorkspaceRows(f.store.readWorkspaceSnapshot());
    const foreignBefore = foreignBeforeRows.find((entry) => entry.work.binding.lifecycle_work_id === 'foreign')?.work;
    if (!foreignBefore) throw new Error('foreign Work fixture is missing');
    const previous = f.store.readWorkspaceSnapshot();
    const bytes = readFileSync(path.join(f.root, old.scopePath));
    writeFileSync(path.join(f.root, old.scopePath), Buffer.concat([bytes, Buffer.from('\n')]));
    const next = f.prepare('next', 'user:next');
    expect(() => admitLocalSessionWork(next)).toThrow(/scope artifact changed/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(previous);
    writeFileSync(path.join(f.root, old.scopePath), bytes);
    const admitted = admitLocalSessionWork(next);
    expect(requireRequestTransition(admitted.host.work).predecessor_work_ids).toEqual(['old']);
    const foreignAfter = requireWorkspaceRows(f.store.readWorkspaceSnapshot()).find(
      (entry) => entry.work.binding.lifecycle_work_id === 'foreign',
    )?.work;
    expect(foreignAfter).toEqual(foreignBefore);
  } finally {
    f.close();
  }
});

test('work-state inspection CLI refuses missing canonical SQLite without creating it', () => {
  const f = fixture();
  try {
    expect(() => runWorkStateRepair(['--kind', 'work-state', '--mode', 'inspect', '--project-root', f.root])).toThrow(
      /unavailable/,
    );
  } finally {
    f.close();
  }
});

for (const { bodyFails, closeFails } of [
  { bodyFails: false, closeFails: false },
  { bodyFails: true, closeFails: false },
  { bodyFails: false, closeFails: true },
  { bodyFails: true, closeFails: true },
])
  test(`work-state repair preserves operation and admitted-close outcomes (body=${bodyFails},close=${closeFails})`, () => {
    const f = fixture(false, true);
    const bodyError = new Error('repair operation failed'),
      closeError = new Error('repair database close failed');
    const originalRepair = Reflect.get(
      HostStateStore.prototype,
      'repairCorrectionGeneration',
    ) as HostStateStore['repairCorrectionGeneration'];
    const originalClose = Reflect.get(Database.prototype, 'close') as Database['close'];
    let closeFaultInjected = false;
    let repairStarted = false;
    const repairSpy = spyOn(HostStateStore.prototype, 'repairCorrectionGeneration').mockImplementation(function (
      this: HostStateStore,
      input,
    ) {
      repairStarted = true;
      if (bodyFails) throw bodyError;
      return originalRepair.call(this, input);
    });
    const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force) {
      if (closeFails && repairStarted && !closeFaultInjected && this.filename === f.database.filename) {
        closeFaultInjected = true;
        throw closeError;
      }
      return originalClose.call(this, force);
    });
    let caught: unknown;
    try {
      try {
        const result = runWorkStateRepair([
          '--kind',
          'work-state',
          '--authority',
          'correction-generation',
          '--mode',
          'inspect',
          '--project-root',
          f.root,
          '--repair-id',
          'close-contract',
        ]);
        expect(bodyFails).toBe(false);
        expect(result).toBeDefined();
      } catch (error) {
        caught = error;
      }
      expect(repairSpy).toHaveBeenCalledTimes(1);
      expect(closeFaultInjected).toBe(closeFails);
      if (!bodyFails && !closeFails) expect(caught).toBeUndefined();
      if (bodyFails && !closeFails) expect(caught).toBe(bodyError);
      if (!bodyFails && closeFails) {
        expect(caught).toBeInstanceOf(AggregateError);
        if (!(caught instanceof AggregateError)) throw new Error('Expected admitted close failure');
        expect(caught.errors[0]).toBe(closeError);
      }
      if (bodyFails && closeFails) {
        expect(caught).toBeInstanceOf(AggregateError);
        if (!(caught instanceof AggregateError)) throw new Error('Expected repair and admitted close failures');
        expect(caught.errors[0]).toBe(bodyError);
        expect(caught.errors[1]).toBeInstanceOf(AggregateError);
        const admittedCloseError: unknown = caught.errors[1];
        if (!(admittedCloseError instanceof AggregateError)) throw new Error('Expected retained admitted close owner');
        expect(admittedCloseError.errors[0]).toBe(closeError);
      }
    } finally {
      repairSpy.mockRestore();
      closeSpy.mockRestore();
      retryPendingWorkspaceDatabaseCloses();
      f.close();
    }
  });

test('valid public intake records the admission cutoff before failed scope preparation', async () => {
  const f = fixture();
  try {
    const verifier: MaintenanceReleaseVerifier = {
      principal: 'fixture:consumer-maintenance',
      projectIds: ['sample'],
      verify: (fence) => {
        return {
          schema: 'MaintenanceReleaseAuthorization/v1',
          principal: 'fixture:consumer-maintenance',
          fence_digest: canonicalJsonDigest(fence),
          closure_digest: fence.binding.closure_digest,
          bundle_digest: fence.binding.bundle_digest,
        };
      },
    };
    const migration = new HostStateStore(f.database, f.store.workspaceId, undefined, undefined, undefined, verifier);
    const binding: MaintenanceFenceBinding = {
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: ['sample'],
      operation_id: 'fixture-migration',
      manifest_digest: '1'.repeat(64),
      request_digest: '2'.repeat(64),
      bindings_digest: '3'.repeat(64),
      closure_digest: '4'.repeat(64),
      bundle_digest: '5'.repeat(64),
    };
    const baseline = migration.acquireMaintenanceFence(binding);
    migration.consumerMigrationState(baseline, 'baseline', () => undefined);
    await migration.releaseMaintenanceFence(baseline);
    expect(() => admitLocalSessionWork(f.prepare('failed-preparation', ''))).toThrow(/schema is invalid/);
    expect(f.store.readWorkspaceSnapshot().work).toHaveLength(0);
    expect(f.database.query('SELECT work_id,attempt FROM agent_host_admission_attempt').all()).toEqual([
      { work_id: 'failed-preparation', attempt: 1 },
    ]);
    const restore = migration.acquireMaintenanceFence(binding);
    let called = false;
    expect(() =>
      migration.consumerMigrationState(restore, 'restore', () => {
        called = true;
      }),
    ).toThrow(/new admission/);
    expect(called).toBe(false);
  } finally {
    f.close();
  }
});

test('admission rejects forged foreign implementation paths before source snapshot or writer ownership', () => {
  const f = fixture();
  try {
    const rawConfig = parseAgentRuntimeConfigYaml(
      readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8'),
    );
    const project = rawConfig.projects[0],
      integration = rawConfig.integrations.providers[0];
    if (!project || !integration) throw new Error('fixture config is missing project or integration');
    const foreignProject = {
      ...structuredClone(project),
      project_id: 'foreign',
      title: 'foreign',
      delivery_group: 'foreign',
      project_root: 'products/foreign',
    };
    const foreignIntegration = {
      ...structuredClone(integration),
      id: 'local-foreign',
      project_id: 'foreign',
      namespace: 'foreign',
    };
    const changedConfig: AgentRuntimeConfig = {
      ...rawConfig,
      projects: [{ ...project, project_root: 'products' }, foreignProject],
      integrations: {
        ...rawConfig.integrations,
        providers: [{ ...integration, project_id: 'sample', namespace: 'sample' }, foreignIntegration],
      },
    };
    writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), stringifyYaml(changedConfig));
    const config = loadRuntimeConfig(f.root);
    mkdirSync(path.join(f.root, 'products/foreign/src'), { recursive: true });
    writeFileSync(path.join(f.root, 'products/foreign/src/secret.ts'), 'foreign source');

    const input = f.prepare('forged-foreign-scope', 'user:forged-foreign-scope');
    const scopePath = path.join(f.root, input.scopePath);
    const scope = parseImplementationScopeJson(readFileSync(scopePath, 'utf8'));
    scope.allowed_paths = ['products/foreign/src/secret.ts'];
    scope.implementation_paths = ['products/foreign/src/secret.ts'];
    writeFileSync(scopePath, JSON.stringify(scope));

    expect(() => admitLocalSessionWork({ ...input, config })).toThrow(/outside selected project membership/);
    expect(f.store.readWorkspaceSnapshot().work).toEqual([]);
    expect(f.database.query('SELECT work_id,attempt FROM agent_host_admission_attempt').all()).toEqual([
      { work_id: 'forged-foreign-scope', attempt: 1 },
    ]);
  } finally {
    f.close();
  }
});

test('admission accepts an exact out-of-root shared path under the selected project context', () => {
  const f = fixture();
  try {
    const rawConfig = parseAgentRuntimeConfigYaml(
      readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8'),
    );
    const project = rawConfig.projects[0];
    if (!project) throw new Error('fixture config has no project');
    const changedConfig: AgentRuntimeConfig = {
      ...rawConfig,
      projects: [{ ...project, project_root: 'products/sample' }, ...rawConfig.projects.slice(1)],
    };
    writeFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), stringifyYaml(changedConfig));
    mkdirSync(path.join(f.root, 'products/sample'), { recursive: true });
    const config = loadRuntimeConfig(f.root);
    const input = f.prepare('shared-path', 'user:shared-path');
    const admitted = admitLocalSessionWork({ ...input, config });
    expect(admitted.source.entries.map((entry) => entry.path)).toEqual(['AGENT.sidecar.md']);
    expect(admitted.host.work.binding.project_ids).toEqual(['sample']);
  } finally {
    f.close();
  }
});

test('public consumer wrapper checks the separate Mastra store and recovers the same fenced operation', async () => {
  const f = fixture(false, true);
  let completed = false;
  let runtimePackageAccessSpy: Mock<typeof runtimeConfig.runtimePackageAccess> | undefined;
  let databaseCloseSpy: Mock<typeof Database.prototype.close> | undefined;
  try {
    const workflowPath = path.join(f.root, f.config.control.work_root, 'mastra-workflows.v1.sqlite');
    mkdirSync(path.dirname(workflowPath), { recursive: true });
    const workflow = new Database(workflowPath, { create: true, strict: true });
    workflow.exec('CREATE TABLE mastra_workflow_snapshot(snapshot TEXT)');
    workflow.query('INSERT INTO mastra_workflow_snapshot VALUES(?)').run(JSON.stringify({ status: 'running' }));
    workflow.close();
    const input: Parameters<typeof runConsumerMigrationState>[0] = {
      repositoryRoot: f.root,
      operationId: 'public-consumer-fixture',
      actor: 'fixture:consumer',
      mode: 'baseline',
    };
    const failedCaptureInput = { ...input, operationId: 'public-consumer-capture-failure' };
    const originalRuntimePackageAccess = runtimeConfig.runtimePackageAccess;
    const failedNativeAccesses: object[] = [];
    let selectedVerifiedFailures = 0;
    let failureRawReads = 0;
    const selectedVerifiedLabels: string[] = [];
    const canonicalDatabasePath = path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite');
    const gateDatabasePath = path.join(f.root, '.vida/storage-admission.v1.sqlite');
    const closeEvents: string[] = [];
    const databaseCloseValue: unknown = Object.getOwnPropertyDescriptor(Database.prototype, 'close')?.value;
    if (typeof databaseCloseValue !== 'function') throw new Error('SQLite close method is unavailable');
    const originalDatabaseClose = databaseCloseValue as (this: Database, force?: boolean) => void;
    databaseCloseSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      force?: boolean,
    ) {
      const filename = path.resolve(this.filename);
      const result = originalDatabaseClose.call(this, force);
      if (filename === canonicalDatabasePath || filename === gateDatabasePath) closeEvents.push(filename);
      return result;
    });
    const captureSentinel = new Error('selected runtime package capture sentinel');
    runtimePackageAccessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => {
      const nativeAccess = originalRuntimePackageAccess();
      failedNativeAccesses.push(nativeAccess);
      const originalVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
      if (!originalVerifiedRead) throw new Error('Consumer migration requires the verified package-byte reader');
      return {
        ...nativeAccess,
        readBytes(target: string, label: string): Buffer {
          if (target === 'src/host-state.ts') failureRawReads += 1;
          return nativeAccess.readBytes.call(nativeAccess, target, label);
        },
        readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
          if (target === 'src/host-state.ts') {
            closeEvents.length = 0;
            selectedVerifiedFailures += 1;
            selectedVerifiedLabels.push(label);
            throw captureSentinel;
          }
          return originalVerifiedRead.call(nativeAccess, target, label, maxBytes);
        },
      };
    });
    let failedCaptureCallback = false;
    try {
      await Promise.resolve(
        expect(
          runConsumerMigrationState(failedCaptureInput, () => {
            failedCaptureCallback = true;
          }),
        ).rejects.toBe(captureSentinel),
      );
    } finally {
      runtimePackageAccessSpy.mockRestore();
      runtimePackageAccessSpy = undefined;
    }
    expect(failedNativeAccesses).toHaveLength(1);
    expect(new Set(failedNativeAccesses).size).toBe(failedNativeAccesses.length);
    expect(selectedVerifiedFailures).toBe(1);
    expect(selectedVerifiedLabels).toEqual(['scoped source stable read']);
    expect(failureRawReads).toBe(0);
    expect(failedCaptureCallback).toBe(false);
    expect(closeEvents).toContain(canonicalDatabasePath);
    expect(closeEvents).toContain(gateDatabasePath);
    expect(closeEvents.indexOf(canonicalDatabasePath)).toBeLessThan(closeEvents.indexOf(gateDatabasePath));
    databaseCloseSpy.mockRestore();
    databaseCloseSpy = undefined;
    const failedCaptureDatabase = new Database(canonicalDatabasePath, { create: false, strict: true });
    try {
      const hasMigrationTable = failedCaptureDatabase
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_consumer_migration'")
        .get();
      expect(
        hasMigrationTable
          ? failedCaptureDatabase
              .query('SELECT operation_id FROM agent_host_consumer_migration WHERE operation_id=?')
              .all(failedCaptureInput.operationId)
          : [],
      ).toEqual([]);
      expect(
        failedCaptureDatabase
          .query('SELECT payload FROM agent_host_maintenance WHERE workspace_id=?')
          .all(deriveWorkspaceId(f.config.repository.repository_id, f.root)),
      ).toEqual([]);
    } finally {
      failedCaptureDatabase.close();
    }
    const closeSentinel = new Error('canonical database close sentinel');
    let closeFaultArmed = false;
    const failedCloseHandles: Database[] = [];
    let dualFailureCallback = false;
    let dualFailureRawReads = 0;
    const originalRuntimePackageAccessForCloseFailure = runtimeConfig.runtimePackageAccess;
    databaseCloseSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      force?: boolean,
    ) {
      const filename = path.resolve(this.filename);
      if (filename === canonicalDatabasePath && closeFaultArmed) {
        closeFaultArmed = false;
        failedCloseHandles.push(this);
        throw closeSentinel;
      }
      const result = originalDatabaseClose.call(this, force);
      if (filename === canonicalDatabasePath || filename === gateDatabasePath) closeEvents.push(filename);
      return result;
    });
    runtimePackageAccessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => {
      const nativeAccess = originalRuntimePackageAccessForCloseFailure();
      const originalVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
      if (!originalVerifiedRead) throw new Error('Consumer migration requires the verified package-byte reader');
      return {
        ...nativeAccess,
        readBytes(target: string, label: string): Buffer {
          if (target === 'src/host-state.ts') dualFailureRawReads += 1;
          return nativeAccess.readBytes.call(nativeAccess, target, label);
        },
        readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
          if (target === 'src/host-state.ts') {
            closeEvents.length = 0;
            closeFaultArmed = true;
            throw captureSentinel;
          }
          return originalVerifiedRead.call(nativeAccess, target, label, maxBytes);
        },
      };
    });
    let dualFailureError: unknown;
    try {
      await runConsumerMigrationState(failedCaptureInput, () => {
        dualFailureCallback = true;
      });
    } catch (error) {
      dualFailureError = error;
    } finally {
      runtimePackageAccessSpy.mockRestore();
      runtimePackageAccessSpy = undefined;
      databaseCloseSpy.mockRestore();
      databaseCloseSpy = undefined;
    }
    expect(dualFailureCallback).toBe(false);
    expect(dualFailureRawReads).toBe(0);
    expect(dualFailureError).toBeInstanceOf(AggregateError);
    if (!(dualFailureError instanceof AggregateError)) throw new Error('capture and close errors were not combined');
    expect(dualFailureError.errors[0]).toBe(captureSentinel);
    const closeErrors: unknown[] = [];
    const collectErrors = (error: unknown): void => {
      if (error instanceof AggregateError) {
        for (const nested of error.errors) collectErrors(nested);
      } else closeErrors.push(error);
    };
    if (dualFailureError.errors[1] !== undefined) collectErrors(dualFailureError.errors[1]);
    expect(closeErrors).toContain(closeSentinel);
    expect(failedCloseHandles).toHaveLength(1);

    const retriedCloseEvents: string[] = [];
    const retriedSourceHandles: Database[] = [];
    databaseCloseSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      force?: boolean,
    ) {
      const filename = path.resolve(this.filename);
      const result = originalDatabaseClose.call(this, force);
      if (filename === canonicalDatabasePath) retriedSourceHandles.push(this);
      if (filename === canonicalDatabasePath || filename === gateDatabasePath) retriedCloseEvents.push(filename);
      return result;
    });
    let called = false;
    try {
      await Promise.resolve(
        expect(
          runConsumerMigrationState(input, () => {
            called = true;
          }),
        ).rejects.toThrow(/unknown or inflight/),
      );
    } finally {
      databaseCloseSpy.mockRestore();
      databaseCloseSpy = undefined;
    }
    expect(retriedSourceHandles[0]).toBe(failedCloseHandles[0]);
    expect(retriedCloseEvents.indexOf(canonicalDatabasePath)).toBeGreaterThanOrEqual(0);
    expect(retriedCloseEvents.indexOf(gateDatabasePath)).toBeGreaterThanOrEqual(0);
    expect(retriedCloseEvents.indexOf(canonicalDatabasePath)).toBeLessThan(
      retriedCloseEvents.indexOf(gateDatabasePath),
    );
    expect(called).toBe(false);
    const settled = new Database(workflowPath, { create: true, strict: true });
    settled.query('UPDATE mastra_workflow_snapshot SET snapshot=?').run(JSON.stringify({ status: 'suspended' }));
    settled.close();
    type ConsumerBindings = Parameters<Parameters<typeof runConsumerMigrationState>[1]>[0];
    let databasePath: string | undefined, backup: ConsumerBindings['backup'] | undefined;
    const capturedSnapshots: {
      access: object;
      entries: { path: string; exists: true; bytes: number; sha256: string }[];
      labels: string[];
    }[] = [];
    let successfulRawReads = 0;
    const originalPackageAccess = runtimeConfig.runtimePackageAccess;
    runtimePackageAccessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => {
      const nativeAccess = originalPackageAccess();
      const entries: { path: string; exists: true; bytes: number; sha256: string }[] = [];
      const labels: string[] = [];
      capturedSnapshots.push({ access: nativeAccess, entries, labels });
      const originalVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
      if (!originalVerifiedRead) throw new Error('Consumer migration requires the verified package-byte reader');
      return {
        ...nativeAccess,
        readBytes(target: string, label: string): Buffer {
          if (['src/host-state.ts', 'src/orchestration/local-work-admission.ts', 'bin/run.ts'].includes(target))
            successfulRawReads += 1;
          return nativeAccess.readBytes.call(nativeAccess, target, label);
        },
        readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
          const bytes = originalVerifiedRead.call(nativeAccess, target, label, maxBytes);
          if (['src/host-state.ts', 'src/orchestration/local-work-admission.ts', 'bin/run.ts'].includes(target)) {
            labels.push(label);
            entries.push({
              path: f.config.runtime.bundle + '/' + target,
              exists: true,
              bytes: bytes.length,
              sha256: createHash('sha256').update(bytes).digest('hex'),
            });
          }
          return bytes;
        },
      };
    });
    let result: Awaited<ReturnType<typeof runConsumerMigrationState<string>>>;
    try {
      result = await runConsumerMigrationState(input, (bindings) => {
        databasePath = bindings.database_path;
        backup = bindings.backup;
        expect(bindings.workflow_database_path).toBe(workflowPath);
        return 'baseline-files';
      });
      await runConsumerMigrationState(input, (bindings) => {
        expect(bindings.backup).toBeNull();
        return 'retry-files';
      });
    } finally {
      runtimePackageAccessSpy.mockRestore();
      runtimePackageAccessSpy = undefined;
    }
    expect(capturedSnapshots).toHaveLength(2);
    expect(new Set(capturedSnapshots.map((snapshot) => snapshot.access)).size).toBe(capturedSnapshots.length);
    expect(successfulRawReads).toBe(0);
    const expectedPaths = ['bin/run.ts', 'src/host-state.ts', 'src/orchestration/local-work-admission.ts'].map(
      (target) => f.config.runtime.bundle + '/' + target,
    );
    const snapshotDigests = capturedSnapshots.map(({ entries, labels }) => {
      entries.sort((left, right) => left.path.localeCompare(right.path));
      expect(entries.map((entry) => entry.path)).toEqual(expectedPaths);
      expect(labels).toEqual(['scoped source stable read', 'scoped source stable read', 'scoped source stable read']);
      return canonicalJsonDigest({ schema: 'ScopedSourceSnapshot/v1', entries });
    });
    expect(snapshotDigests[1]).toBe(snapshotDigests[0]);
    const expectedBundleDigest = snapshotDigests[0];
    if (!expectedBundleDigest) throw new Error('Consumer migration did not capture a package snapshot');
    expect(result.status).toBe('baseline');
    if (!databasePath || backup === undefined || backup === null)
      throw new Error('baseline consumer migration did not expose its SQLite backup');
    const persistedDatabasePath = databasePath;
    const persistedBaseline = new Database(persistedDatabasePath, { create: false, strict: true });
    try {
      const row = persistedBaseline
        .query('SELECT payload FROM agent_host_consumer_migration WHERE operation_id=?')
        .get(input.operationId) as { payload: string } | null;
      expect(row).not.toBeNull();
      if (!row) throw new Error('consumer migration baseline row was not persisted');
      expect((JSON.parse(row.payload) as { binding: { bundle_digest: string } }).binding.bundle_digest).toBe(
        expectedBundleDigest,
      );
    } finally {
      persistedBaseline.close();
    }
    expect(Buffer.from(backup).subarray(0, 16).toString()).toBe('SQLite format 3\u0000');
    expect(persistedDatabasePath).toBe(path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite'));
    const consumerFile = path.join(f.root, 'consumer-init-output.txt');
    writeFileSync(consumerFile, 'known init failure');
    await Promise.resolve(
      expect(
        runConsumerMigrationState({ ...input, mode: 'restore' }, () => {
          writeFileSync(consumerFile, 'original consumer bytes');
          throw Error('fixture interruption after file restore');
        }),
      ).rejects.toThrow(/fixture interruption/),
    );
    const restored = await runConsumerMigrationState({ ...input, mode: 'restore' }, () => {
      expect(readFileSync(consumerFile, 'utf8')).toBe('original consumer bytes');
      return 'recovered-files';
    });
    expect(restored.status).toBe('restored');
    const corrupt = new Database(persistedDatabasePath, { create: false, strict: true });
    corrupt.exec('DROP TABLE agent_host_admission_attempt');
    const schemaBefore = corrupt.query('SELECT name,sql FROM sqlite_master ORDER BY name').all();
    corrupt.close();
    const bytesBefore = readFileSync(persistedDatabasePath);
    let unexpectedCallback = false;
    await Promise.resolve(
      expect(
        runConsumerMigrationState({ ...input, mode: 'restore' }, () => {
          unexpectedCallback = true;
        }),
      ).rejects.toThrow(/admission metadata missing/),
    );
    expect(unexpectedCallback).toBe(false);
    expect(() =>
      inspectHostWorkspaceDatabase(
        f.root,
        path.relative(f.root, persistedDatabasePath),
        deriveWorkspaceId(f.config.repository.repository_id, f.root),
      ),
    ).toThrow(/admission metadata missing/);
    expect(readFileSync(persistedDatabasePath)).toEqual(bytesBefore);
    const unchanged = new Database(persistedDatabasePath, { create: false, strict: true });
    try {
      expect(unchanged.query('SELECT name,sql FROM sqlite_master ORDER BY name').all()).toEqual(schemaBefore);
    } finally {
      unchanged.close();
    }
    completed = true;
  } finally {
    runtimePackageAccessSpy?.mockRestore();
    databaseCloseSpy?.mockRestore();
    f.close({ retainRoot: !completed });
  }
});

test('second predecessor verification failure leaves every canonical row and raw journal unchanged', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('one', 'user:old'));
    f.admit(f.prepare('two', 'user:old'));
    const before = f.store.readWorkspaceSnapshot();
    const journals = f.database.query('SELECT * FROM agent_host_mastra_session_ledger ORDER BY work_id').all();
    const admit = f.store.admitSuccessorWork.bind(f.store);
    type SuccessorAdmissionInput = Parameters<HostStateStore['admitSuccessorWork']>[0];
    let verified = 0,
      proposal: SuccessorAdmissionInput | undefined;
    f.store.admitSuccessorWork = (input: SuccessorAdmissionInput) => {
      proposal = input;
      return admit({
        ...input,
        verifyCurrent(work, journal, pointer) {
          input.verifyCurrent(work, journal, pointer);
          if (++verified === 2) throw new Error('injected second predecessor verification fault');
        },
      });
    };
    try {
      expect(() => admitLocalSessionWork(f.prepare('next', 'user:next'))).toThrow(/second predecessor/);
    } finally {
      f.store.admitSuccessorWork = admit;
    }
    expect(verified).toBe(2);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    expect(f.database.query('SELECT * FROM agent_host_mastra_session_ledger ORDER BY work_id').all()).toEqual(journals);
    if (!proposal) throw new Error('successor admission proposal was not captured');
    const acceptedProposal = proposal;
    const callbacks: readonly SuccessorAdmissionInput['verifyCurrent'][] = [
      () => Promise.resolve(),
      () => Promise.reject(new Error('rejected current proof')),
      () => true,
    ];
    for (const callback of callbacks) {
      expect(() => admit({ ...acceptedProposal, verifyCurrent: callback })).toThrow(/synchronously/);
      expect(f.store.readWorkspaceSnapshot()).toEqual(before);
      expect(f.database.query('SELECT * FROM agent_host_mastra_session_ledger ORDER BY work_id').all()).toEqual(
        journals,
      );
    }
  } finally {
    f.close();
  }
});

test('competing successor requests prepared against identical versions permit only one commit', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('one', 'user:old'));
    f.admit(f.prepare('two', 'user:old'));
    const admit = f.store.admitSuccessorWork.bind(f.store);
    type SuccessorAdmissionInput = Parameters<HostStateStore['admitSuccessorWork']>[0];
    const proposals: SuccessorAdmissionInput[] = [];
    f.store.admitSuccessorWork = (input: SuccessorAdmissionInput) => {
      proposals.push(input);
      throw new Error('freeze proposal before transaction');
    };
    expect(() => admitLocalSessionWork(f.prepare('winner', 'user:new-one'))).toThrow(/freeze proposal/);
    expect(() => admitLocalSessionWork(f.prepare('loser', 'user:new-two'))).toThrow(/freeze proposal/);
    const firstProposal = proposals[0],
      secondProposal = proposals[1];
    if (!firstProposal || !secondProposal) throw new Error('both successor proposals were not captured');
    expect(firstProposal.expectedLedger).toEqual(secondProposal.expectedLedger);
    expect(firstProposal.predecessors).toEqual(secondProposal.predecessors);
    const result = admit(firstProposal);
    const committed = f.store.readWorkspaceSnapshot();
    expect(() => admit(secondProposal)).toThrow(/compare-and-swap conflict/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(committed);
    expect(admit(firstProposal)).toEqual(result);
    expect(requireWorkspaceRows(committed).filter((row) => row.work.execution.status === 'active')).toHaveLength(1);
  } finally {
    f.close();
  }
});

test('two-predecessor SQL commit fault rolls back all work and coordination rows and preserves raw journals', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('one', 'user:first'));
    f.admit(f.prepare('two', 'user:first'));
    const before = f.store.readWorkspaceSnapshot();
    const journalBytes = f.database
      .query('SELECT payload FROM agent_host_mastra_session_ledger ORDER BY work_id')
      .all();
    const next = f.prepare('next', 'user:second');
    f.database.exec(
      "CREATE TRIGGER fixture_commit_fault BEFORE UPDATE ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT,'fixture SQL commit fault'); END",
    );
    expect(() => admitLocalSessionWork(next)).toThrow(/fixture SQL commit fault/);
    const retainedPath = path.join(f.root, f.config.control.work_root, 'next', 'scoped-source-attempt-1.v1.json');
    const preparedBytes = readFileSync(retainedPath);
    expect(parseScopedSourceSnapshotJson(preparedBytes.toString('utf8'))).toEqual(f.source);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    expect(f.database.query('SELECT payload FROM agent_host_mastra_session_ledger ORDER BY work_id').all()).toEqual(
      journalBytes,
    );
    f.database.exec('DROP TRIGGER fixture_commit_fault');
    const admitted = admitLocalSessionWork(next);
    expect(readFileSync(retainedPath)).toEqual(preparedBytes);
    expect(requireRequestTransition(admitted.host.work).predecessor_work_ids).toEqual(['one', 'two']);
  } finally {
    f.close();
  }
});

test('invalid new request attribution and successor source drift fail before predecessor effects', () => {
  const f = fixture();
  try {
    f.admit(f.prepare('old', 'user:old'));
    const next = f.prepare('next', '');
    const before = f.store.readWorkspaceSnapshot();
    expect(() => admitLocalSessionWork(next)).toThrow(/schema is invalid/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    const wrong = f.prepare('wrong', 'user:next', 'another-session');
    wrong.nativeSessionHandle = 'session';
    expect(() => admitLocalSessionWork(wrong)).toThrow(/session binding differs/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
    const drift = f.prepare('drift', 'user:next');
    writeFileSync(path.join(f.root, 'AGENT.sidecar.md'), 'Changed declared source');
    expect(() => admitLocalSessionWork(drift)).toThrow(/revision is stale/);
    expect(f.store.readWorkspaceSnapshot()).toEqual(before);
  } finally {
    f.close();
  }
});

test('successful normalized readonly research is retained as historical provenance on absorption', () => {
  const f = fixture();
  try {
    const old = f.prepare('old', 'user:old'),
      admitted = f.admit(old),
      work = admitted.host.work,
      lease = requireWorkLease(work);
    const workflow = f.config.workflows[work.binding.workflow_id];
    if (!workflow) throw new Error('fixture workflow is absent from runtime config');
    const stage = workflow.stages.find((stage) => stage.kind === 'research');
    if (!stage) throw new Error('fixture workflow has no research stage');
    const firstResearchAssignment = stage.assignments[0];
    if (!firstResearchAssignment) throw new Error('fixture research stage has no assignment');
    const timestamp = new Date().toISOString(),
      question = 'What evidence remains unfinished?';
    const body = {
      schema: 'ResearchResult/v1',
      result_id: 'old-research',
      work_item_id: 'old',
      source_revision: work.binding.work_source_revision,
      scope_id: work.binding.scope_id,
      contour: work.binding.scope_id,
      topic: 'Fixture provenance',
      objective: 'Preserve source evidence',
      question,
      source_refs: [
        {
          source_id: 'source',
          source_kind: 'internal',
          locator: 'AGENT.sidecar.md',
          title: 'Fixture source',
          version_or_date: '2026-10-01',
          claim: 'AC-SHARED SR-SHARED evidence',
          retrieved_at: timestamp,
          independence_group: 'fixture-source',
          digest: 'd'.repeat(64),
        },
      ],
      findings: [
        {
          finding_id: 'finding',
          statement: 'Unfinished fixture evidence',
          source_ids: ['source'],
          evidence_class: 'Static',
          status: 'confirmed',
        },
      ],
      uncertainties: [],
      conflicts: [],
      evidence_classes: ['Static'],
      br_ids: ['BR-SHARED'],
      sr_ids: ['SR-SHARED'],
      ac_ids: ['AC-SHARED'],
      gap_ids: [],
      options: [
        {
          option_id: 'continue',
          label: 'Continue',
          description: 'Carry unfinished evidence',
          evidence_refs: ['source'],
        },
      ],
      recommendation: { option_id: 'continue', rationale: 'Current evidence', evidence_refs: ['source'] },
      completeness: {
        status: 'pass',
        required_questions: [question],
        answered_questions: [question],
        missing_questions: [],
        material_gaps: [],
        external_validation: {
          required: false,
          source_count: 0,
          minimum_sources: 0,
          status: 'not_required',
          live_check: null,
        },
      },
      readiness: 'ready',
      instruction_activation: {
        use_id: 'use-fixture',
        risk: 'medium',
        phase: 'trace',
        lane: 'researcher',
        trigger: 'research_intent',
        required_instruction_ids: [],
        instruction_ids: ['research-protocol'],
        registry_digest: 'b'.repeat(64),
        source_digests: [{ instruction_id: 'research-protocol', source_sha256: 'c'.repeat(64) }],
      },
      actor: 'fixture-setup',
      pointer: 'TEST-SETUP',
      created_at: timestamp,
      updated_at: timestamp,
    };
    const result = { ...body, digest: canonicalJsonDigest(body) },
      bytes = Buffer.from(JSON.stringify(result));
    const recordPath = '.agent/work/old/old-research.research.json';
    writeFileSync(path.join(f.root, recordPath), bytes);
    const actionId = '7'.repeat(64),
      issueId = randomUUID();
    const observation: SessionBridgeObservation = {
      schema: 'VidaSessionObservation/v1',
      action_id: actionId,
      issue_id: issueId,
      agent_id: 'fixture',
      tool_call_ref: 'fixture-readonly',
      status: 'reported_complete',
      summary: 'Completed fixture research',
      output_digest: canonicalJsonDigest('Completed fixture research'),
      evidence_refs: ['fixture:source'],
    };
    const binding = {
      work_id: 'old',
      attempt: 1,
      run_id: requireWorkRunId(work),
      action_id: actionId,
      issue_id: issueId,
      scope_id: work.binding.scope_id,
      scope_digest: work.binding.work_source_revision,
      source_revision: work.binding.work_source_revision,
      source_scope_digest: work.binding.work_source_revision,
      config_digest: work.binding.config_digest,
      maintenance_generation: admitted.host.maintenanceGeneration,
      lease_ticket_id: lease.ticket_id,
      lease_thread_id: lease.thread_id,
      lease_generation: lease.generation,
    };
    const planBody: Omit<ObservedResearchRecordPlan, 'digest'> = {
      schema: 'ObservedResearchRecordPlan/v1',
      binding,
      observation_digest: canonicalJsonDigest(observation),
      result_digest: result.digest,
      record_path: recordPath,
      record_pre_sha256: null,
      record_sha256: createHash('sha256').update(bytes).digest('hex'),
      changelog_path: '.agent/work/old/research.changelog.jsonl',
      changelog_pre_sha256: null,
      changelog_sha256: 'a'.repeat(64),
      before_digest: null,
    };
    const plan: ObservedResearchRecordPlan = { ...planBody, digest: canonicalJsonDigest(planBody) };
    const nextWork = {
      ...work,
      revision: work.revision + 1,
      lifecycle: { ...work.lifecycle, revision: work.lifecycle.revision + 1 },
      artifacts: [
        ...work.artifacts,
        {
          artifact_id: 'fixture-research',
          schema: 'ResearchResult/v1',
          path: recordPath,
          sha256: plan.record_sha256,
          stage_id: stage.id,
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          ac_ids: work.binding.ac_ids,
        },
      ],
    };
    f.store.compareAndSwapHostState({
      expectedWork: admitted.host.workVersion,
      expectedLedger: admitted.host.ledgerVersion,
      nextWork,
      nextLedger: { ...admitted.host.ledger, revision: admitted.host.ledger.revision + 1 },
    });
    const journal: MastraSessionLedgerState = {
      schema: 'MastraSessionLedger/v1',
      workspace_id: f.store.workspaceId,
      work_id: 'old',
      attempt: 1,
      run_id: requireWorkRunId(work),
      step_id: 'unissued-next-wave',
      items: [],
      completed: [
        {
          step_id: 'observed-research',
          items: [
            {
              request: {
                schema: 'VidaSessionRequest/v1',
                run_id: requireWorkRunId(work),
                workflow_id: work.binding.workflow_id,
                wave_index: 0,
                action_id: actionId,
                stage_id: stage.id,
                assignment_index: 0,
                role: firstResearchAssignment.role,
                config_digest: work.binding.config_digest,
                scope_digest: work.binding.work_source_revision,
                bindings_manifest_ref: '3'.repeat(64),
              },
              issue_id: issueId,
              observation,
              research_normalization: plan,
            },
          ],
        },
      ],
    };
    f.database
      .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=?')
      .run(canonicalJson(journal), canonicalJsonDigest(journal), 'old');
    const beforeRows = requireWorkspaceRows(f.store.readWorkspaceSnapshot());
    const before = beforeRows[0]?.work;
    if (!before) throw new Error('predecessor Work is missing');
    const successor = admitLocalSessionWork(f.prepare('next', 'user:next'));
    expect(requireRequestTransition(successor.host.work).predecessor_work_ids).toEqual(['old']);
    const prior = requireWorkspaceRows(f.store.readWorkspaceSnapshot()).find(
      (entry) => entry.work.binding.lifecycle_work_id === 'old',
    )?.work;
    if (!prior) throw new Error('predecessor Work is missing after admission');
    expect(prior.artifacts).toEqual(before.artifacts);
    expect(prior.lifecycle.assurance).toEqual(before.lifecycle.assurance);
    expect(readFileSync(path.join(f.root, recordPath))).toEqual(bytes);
    expect(
      parseMastraSessionLedgerJson(
        f.database
          .query<{ payload: string }, [string]>('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
          .get('old')?.payload ?? '',
      ),
    ).toEqual(journal);
  } finally {
    f.close();
  }
});

test.each(['started', 'completed'] as const)('explicit correction-generation repair (%s receipt)', (receiptStatus) => {
  const f = fixture(false, true);
  let complete = false;
  const repair = (mode: 'inspect' | 'plan' | 'apply' | 'resume' | 'restore', actor?: string): unknown =>
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
      'base-authority',
      ...(actor ? ['--actor', actor] : []),
    ]);
  try {
    const admissionInput = f.prepare('repair-base', 'user:repair'),
      admitted = f.admit(admissionInput);
    assertPersistedAdmission(admitted);
    const work = admitted.host.work,
      lease = requireWorkLease(work);
    const identity = {
      repository_id: work.binding.repository_id,
      project_ids: work.binding.project_ids,
      integrations_digest: work.binding.integrations_digest,
      work_id: 'repair-base',
    };
    const workflow = f.config.workflows[work.binding.workflow_id];
    if (!workflow) throw new Error('repair fixture workflow is not configured');
    const stage = workflow.stages[0];
    if (!stage) throw new Error('repair fixture workflow has no stage');
    const assignment = stage.assignments[0];
    if (!assignment) throw new Error('repair fixture workflow stage has no assignment');
    const repairRequest: SessionBridgeRequest = {
      schema: 'VidaSessionRequest/v1',
      run_id: requireWorkRunId(work),
      workflow_id: work.binding.workflow_id,
      wave_index: 0,
      action_id: '2'.repeat(64),
      assignment_index: 0,
      stage_id: stage.id,
      role: assignment.role,
      config_digest: work.binding.config_digest,
      scope_digest: work.binding.work_source_revision,
      bindings_manifest_ref: '3'.repeat(64),
    };
    expect(() => repair('plan', 'fixture')).toThrow('released ownership');
    expect(() => repair('plan', 'x'.repeat(8_388_609))).toThrow('canonical JSON byte budget exceeded');
    const started = f.store.claimWorkflowAttempt({
      identity,
      expectedWork: admitted.host.workVersion,
      expectedLedger: admitted.host.ledgerVersion,
      stageId: stage.id,
      assignmentIndex: 0,
      requestDigest: canonicalJsonDigest(repairRequest),
      lease,
    });
    const terminalSummary = 'Observed terminal writer result for repair closure',
      repairIssue = randomUUID(),
      repairAction = repairRequest.action_id;
    const terminalObservation: Parameters<MastraSessionLedger['report']>[3] = {
      schema: 'VidaSessionObservation/v1',
      action_id: repairAction,
      issue_id: repairIssue,
      agent_id: 'repair-writer',
      tool_call_ref: 'local:repair-terminal',
      status: 'reported_complete',
      summary: terminalSummary,
      output_digest: canonicalJsonDigest(terminalSummary),
      evidence_refs: ['local://repair/terminal'],
      host_attempt_id: started.attempt.attempt_id,
    };
    const completedReceipt = f.store.completeWorkflowAttempt(started, terminalObservation);
    const row = f.database
      .query<{ id: string; payload: string }, []>("SELECT id,payload FROM agent_host_state WHERE kind='work'")
      .get();
    if (!row) throw new Error('persisted work record is missing');
    const parsedOld = parseWorkStateJson(row.payload);
    const old: LegacyCorrectionWorkState = {
      ...parsedOld,
      lease: null,
      execution: {
        ...parsedOld.execution,
        status: 'suspended',
        assignment_attempts: parsedOld.execution.assignment_attempts.map((attempt) => {
          const { correction_generation: _generation, correction_authorization: _authorization, ...retained } = attempt;
          return retained;
        }),
      },
    };
    const journalRow = f.database
        .query<{ payload: string }, [string]>('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
        .get('repair-base'),
      oldJournalRow = journalRow;
    if (!oldJournalRow) throw new Error('persisted session Journal is missing');
    const parsedJournal = parseMastraSessionLedgerJson(oldJournalRow.payload),
      completedHost = f.store.readHostStateSnapshot(identity);
    assertCompleteHostSnapshot(completedHost);
    const reservationReceipt: WorkflowAttemptReceipt =
      receiptStatus === 'started'
        ? {
            ...completedReceipt,
            attempt: {
              ...completedReceipt.attempt,
              status: 'started',
              result: null,
              result_digest: null,
            },
          }
        : completedReceipt;
    const completeReservation = persistedReservationFixture({
      repositoryRoot: f.root,
      config: f.config,
      identity,
      host: completedHost,
      receipt: reservationReceipt,
      selection: admissionInput.selection,
      workItem: admissionInput.workItem,
      request: repairRequest,
      approvalAction: null,
    });
    const {
        correction_generation: _receiptGeneration,
        correction_authorization: _receiptAuthorization,
        ...legacyReceiptAttempt
      } = completeReservation.receipt.attempt,
      legacyReservation: LegacyCorrectionReservation = {
        ...completeReservation,
        receipt: { ...completeReservation.receipt, attempt: legacyReceiptAttempt },
      };
    const firstJournalItem: LegacyCorrectionJournalItem = {
      request: repairRequest,
      issue_id: repairIssue,
      observation: terminalObservation,
      host_reservation: legacyReservation,
    };
    let oldJournal: LegacyCorrectionJournal = { ...parsedJournal, items: [firstJournalItem] };
    if (receiptStatus === 'started') {
      const { host_reservation: _reservation, ...readonlyItem } = firstJournalItem;
      const observation = readonlyItem.observation;
      if (!observation) throw new Error('fixture Journal item has no observation');
      const { host_attempt_id: _attemptId, ...readonlyObservation } = observation;
      const readonlyItems: LegacyCorrectionJournalItem[] = Array.from({ length: 200 }, (_, index) => ({
        ...readonlyItem,
        request: { ...readonlyItem.request, action_id: canonicalJsonDigest('readonly-' + index) },
        issue_id: randomUUID(),
        observation: {
          ...readonlyObservation,
          action_id: canonicalJsonDigest('readonly-' + index),
          issue_id: randomUUID(),
          tool_call_ref: 'local:readonly-' + index,
        },
      }));
      oldJournal = { ...oldJournal, items: [...oldJournal.items, ...readonlyItems] };
    }
    const saveJournal = (state: unknown) => {
      const persistedState = parseJsonRecord(JSON.stringify(state));
      f.database
        .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=?')
        .run(canonicalJson(persistedState), canonicalJsonDigest(persistedState), 'repair-base');
    };
    saveJournal(oldJournal);
    const persistedLegacyWork = parseJsonRecord(JSON.stringify(old));
    f.database
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work' AND id=?")
      .run(canonicalJson(persistedLegacyWork), canonicalJsonDigest(persistedLegacyWork), row.id);
    const ledgerRow = f.database
      .query<{ payload: string }, []>("SELECT payload FROM agent_host_state WHERE kind='ledger'")
      .get();
    if (!ledgerRow) throw new Error('persisted coordination ledger is missing');
    const parsedLedger = parseCoordinationLedgerJson(ledgerRow.payload);
    const settledLedger: CoordinationLedger = {
      ...parsedLedger,
      claims: parsedLedger.claims.map((claim) => ({ ...claim, status: 'released' })),
      tickets: parsedLedger.tickets.map((ticket) => ({
        ...ticket,
        status: 'released',
        active_resources: [],
        blocked_resources: [],
        expires_at: null,
      })),
    };
    f.database
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
      .run(canonicalJson(settledLedger), canonicalJsonDigest(settledLedger));
    expect(() => f.store.readHostStateSnapshot(identity)).toThrow();
    const firstSavedItem = oldJournal.items[0];
    if (!firstSavedItem) throw new Error('fixture Journal item is missing');
    saveJournal({ ...oldJournal, items: [{ ...firstSavedItem, observation: null }] });
    expect(() => repair('plan', 'fixture')).toThrow('terminal issued observations');
    saveJournal(oldJournal);
    const receiptItem = oldJournal.items[0];
    if (!receiptItem?.host_reservation) throw new Error('fixture Journal reservation is missing');
    const mismatchedReceipt = parseJsonRecord(
      JSON.stringify({
        ...oldJournal,
        items: [
          {
            ...receiptItem,
            host_reservation: {
              ...receiptItem.host_reservation,
              receipt: {
                ...receiptItem.host_reservation.receipt,
                attempt: { ...receiptItem.host_reservation.receipt.attempt, request_digest: 'f'.repeat(64) },
              },
            },
          },
          ...oldJournal.items.slice(1),
        ],
      }),
    );
    saveJournal(mismatchedReceipt);
    expect(() => repair('inspect')).toThrow(
      'repair reservation is not an exact terminal or retained unknown Host attempt',
    );
    if (!receiptItem.observation) throw new Error('fixture Journal observation is missing');
    const mismatchedObservation: LegacyCorrectionJournal = {
      ...oldJournal,
      items: [
        { ...receiptItem, observation: { ...receiptItem.observation, summary: 'A different reported outcome' } },
        ...oldJournal.items.slice(1),
      ],
    };
    saveJournal(mismatchedObservation);
    expect(() => repair('inspect')).toThrow(
      'repair reservation is not an exact terminal or retained unknown Host attempt',
    );
    saveJournal(oldJournal);
    expect(requireUnknownRecord(repair('inspect'), 'repair inspection').status).toBe('repairable_current_v1');
    const plannedUnknown = repair('plan', 'fixture'),
      planned = requireCorrectionPlan(plannedUnknown);
    if (receiptStatus === 'started')
      expect(() => canonicalJson(plannedUnknown)).toThrow('canonical JSON node budget exceeded');
    const planRow = f.database
      .query<{ payload: string; digest: string }, []>('SELECT payload,digest FROM agent_host_work_state_repair')
      .get();
    if (!planRow) throw new Error('correction-generation repair plan row is missing');
    f.database.query('UPDATE agent_host_work_state_repair SET payload=?').run(planRow.payload + ' ');
    expect(() => repair('resume')).toThrow('repair operation checksum differs');
    f.database.query('UPDATE agent_host_work_state_repair SET payload=?').run(planRow.payload);
    if (receiptStatus === 'started') {
      const changedPlan = parseJsonRecord(planRow.payload);
      const journalChanges = requireUnknownRecordArray(changedPlan.journal_changes, 'frozen repair Journal changes');
      const firstJournalChange = requireArrayItem(journalChanges, 0, 'frozen repair Journal change');
      const journalRow = requireUnknownRecord(firstJournalChange.row, 'frozen repair Journal row');
      const revision = journalRow.revision;
      if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision <= 0)
        throw new Error('frozen repair Journal revision is invalid');
      journalRow.revision = revision < Number.MAX_SAFE_INTEGER ? revision + 1 : revision - 1;
      const changedPayload = JSON.stringify(changedPlan);
      const changedDigest = createHash('sha256').update(changedPayload).digest('hex');
      f.database.query('UPDATE agent_host_work_state_repair SET payload=?,digest=?').run(changedPayload, changedDigest);
      const readHostRows = () =>
        f.database
          .query<
            { workspace_id: string; kind: string; id: string; revision: number; payload: string; digest: string },
            []
          >('SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY kind,id')
          .all();
      const frozenHostRows = readHostRows();
      const frozenJournals = f.database
        .query<
          { workspace_id: string; work_id: string; attempt: number; revision: number; payload: string; digest: string },
          []
        >(
          'SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger ORDER BY work_id,attempt',
        )
        .all();
      const assertFrozenStateUnchanged = () => {
        expect(readHostRows()).toEqual(frozenHostRows);
        expect(
          f.database
            .query<
              {
                workspace_id: string;
                work_id: string;
                attempt: number;
                revision: number;
                payload: string;
                digest: string;
              },
              []
            >(
              'SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger ORDER BY work_id,attempt',
            )
            .all(),
        ).toEqual(frozenJournals);
      };
      expect(() => repair('plan', 'fixture')).toThrow('repair frozen change set is incomplete');
      assertFrozenStateUnchanged();
      expect(() => repair('resume')).toThrow('repair frozen change set is incomplete');
      assertFrozenStateUnchanged();
      f.database
        .query('UPDATE agent_host_work_state_repair SET payload=?,digest=?')
        .run(planRow.payload, planRow.digest);
    }
    if (receiptStatus === 'completed') {
      f.database
        .query('UPDATE agent_host_work_state_repair SET payload=?,digest=?')
        .run(canonicalJson(plannedUnknown), canonicalJsonDigest(plannedUnknown));
      expect(repair('plan', 'fixture')).toEqual(plannedUnknown);
    }
    expect(planned.work_changes).toHaveLength(1);
    const plannedAttempt = requireArrayItem(
      requireArrayItem(planned.work_changes, 0, 'correction repair work change').after.execution.assignment_attempts,
      0,
      'planned correction attempt',
    );
    expect(plannedAttempt.attempt_id).toBe(started.attempt.attempt_id);
    f.database.exec(
      "CREATE TRIGGER repair_fault BEFORE UPDATE ON agent_host_state BEGIN SELECT RAISE(ABORT,'repair apply fault'); END",
    );
    expect(() => repair('apply')).toThrow('repair apply fault');
    const failedApplyRow = f.database
      .query<{ payload: string }, []>("SELECT payload FROM agent_host_state WHERE kind='work'")
      .get();
    if (!failedApplyRow) throw new Error('work row disappeared after failed correction repair');
    expect(parseJsonRecord(failedApplyRow.payload)).toEqual(persistedLegacyWork);
    f.database.exec('DROP TRIGGER repair_fault');
    const applied = requireUnknownRecord(repair('resume'), 'repair resume result');
    expect(applied.status).toBe('applied');
    expect(repair('resume')).toEqual(applied);
    const current = parseWorkStateJson(
      f.database.query<{ payload: string }, []>("SELECT payload FROM agent_host_state WHERE kind='work'").get()
        ?.payload ?? '',
    );
    const oldAttempt = requireArrayItem(old.execution.assignment_attempts, 0, 'legacy correction attempt');
    expect(requireArrayItem(current.execution.assignment_attempts, 0, 'repaired correction attempt')).toEqual({
      ...oldAttempt,
      correction_generation: 0,
      correction_authorization: null,
    });
    const repairedJournal = parseMastraSessionLedgerJson(
      f.database
        .query<{ payload: string }, [string]>('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
        .get('repair-base')?.payload ?? '',
    );
    const repairedItem = requireArrayItem(repairedJournal.items, 0, 'repaired Journal item');
    if (!repairedItem.host_reservation) throw new Error('repaired Journal item has no Host reservation');
    expect(repairedItem.host_reservation.receipt.attempt.correction_generation).toBe(0);
    expect(repairedItem.issue_id).toBe(repairIssue);
    expect(requireUnknownRecord(repair('restore'), 'repair restore result').status).toBe('restored');
    const restored = f.store.readHostStateSnapshot(identity);
    assertCompleteHostSnapshot(restored);
    const restoredAttempt = requireArrayItem(
      restored.work.execution.assignment_attempts,
      0,
      'restored correction attempt',
    );
    expect(restoredAttempt.attempt_id).toBe(started.attempt.attempt_id);
    expect(restoredAttempt.result).toEqual(oldAttempt.result);
    expect(restoredAttempt.correction_generation).toBe(0);
    expect(restoredAttempt.correction_authorization).toBeNull();
    expect(requireUnknownRecord(repair('restore'), 'repeated repair restore result').status).toBe('restored');
    const stable = f.store.readHostStateSnapshot(identity);
    assertCompleteHostSnapshot(stable);
    f.store.compareAndSwapHostState({
      expectedWork: stable.workVersion,
      expectedLedger: stable.ledgerVersion,
      nextWork: {
        ...stable.work,
        revision: stable.work.revision + 1,
        lifecycle: { ...stable.work.lifecycle, revision: stable.work.lifecycle.revision + 1 },
        execution: { ...stable.work.execution, status: 'failed' },
      },
      nextLedger: { ...stable.ledger, revision: stable.ledger.revision + 1 },
    });
    expect(() => repair('restore')).toThrow('restored repair changed');
    expect(() => repair('resume')).toThrow('restored repair changed');
    expect(requireHostWork(f.store.readHostStateSnapshot(identity)).execution.status).toBe('failed');
    complete = true;
  } finally {
    if (!complete) console.error('Retained correction-repair fixture root after unexpected failure: ' + f.root);
    f.close({ retainRoot: !complete });
  }
});

for (const scenario of ['validate', 'test', 'runtime-rebind', 'success'])
  test(
    'public same-work correction after real report resume sync ' + scenario,
    async () => {
      const failureStage = ['runtime-rebind', 'success'].includes(scenario) ? 'validate' : scenario;
      const fixtureSetupStartedNs = process.hrtime.bigint();
      const f = fixture(true, true);
      const diagnosticReceiptPath = path.join(f.root, '.tmp', 'public-cli-' + scenario + '.ndjson');
      const markPhase = createPublicCliFixturePhaseMarker(diagnosticReceiptPath, fixtureSetupStartedNs);
      markPhase('fixture_setup', fixtureSetupStartedNs);
      let failure: unknown,
        didFail = false,
        retainFixtureRootOnUnknown = false;
      const publicCli = createNativeTsPublicCliFixtureRunner({
        bundleRoot: bundle,
        diagnosticReceiptPath,
        fixtureRoot: f.root,
        onUnknown: () => {
          retainFixtureRootOnUnknown = true;
        },
      });
      const publicRun = (args: Parameters<typeof publicCli.spawn>[0]) => {
        const result = publicCli.spawn(args);
        if (result.status !== 0)
          throw new Error(
            JSON.stringify({
              status: result.status,
              signal: result.signal,
              error: result.error?.message,
              stderr: result.stderr?.slice(-4096),
              stdout: result.stdout?.slice(-4096),
            }),
          );
        return parseJsonRecord(result.stdout);
      };
      // Setup uses the same run implementation in-process; public process-boundary assertions stay below.
      const runFixture = async (args: readonly string[]) => {
        markPhase('in_process_run_start');
        const result = await run([...args]);
        markPhase('in_process_run_returned');
        if (!isPlainRecord(result)) throw new Error('in-process fixture run result is malformed');
        return result;
      };
      try {
        try {
          const id = 'corrective-public',
            input = f.prepare(id, 'user:current-correction');
          const context = input.context;
          if (!context) throw new Error('corrective public fixture has no session execution context');
          input.selection = { ...input.selection, kind: 'task', intent: 'task_execution' };
          input.workItem = {
            ...input.workItem,
            canonical_kind: 'task',
            intent: 'task_execution',
            provider_type: 'Task',
          };
          input.sourceAuthorizationPath = `.agent/work/${id}/authorization.json`;
          writeFileSync(
            path.join(f.root, input.sourceAuthorizationPath),
            JSON.stringify({
              schema: 'LocalSourceWriteAuthorization/v1',
              action: 'source.write',
              user_instruction_ref: 'fixture:actual-owner-directive',
              work_id: id,
              attempt: 1,
              scope_digest: input.context.scope_digest,
              config_digest: runtimeConfigDigest(f.config),
              workflow_id: 'task_execution',
              stage_ids: ['develop_task'],
              implementation_paths: ['AGENT.sidecar.md'],
              native_session_handle: 'session',
            }),
          );
          input.intakePath = `.agent/work/${id}/raw-intake.json`;
          writeFileSync(
            path.join(f.root, input.intakePath),
            JSON.stringify({
              schema: 'VidaLocalSessionIntake/v1',
              work_item: input.workItem,
              native_session_handle: input.nativeSessionHandle,
              scope_path: input.scopePath,
              acceptance_path: input.acceptancePath,
              source_authorization_path: input.sourceAuthorizationPath,
              runtime_code_paths: input.runtimeCodePaths,
              route: input.route,
              risk: input.risk,
              change_kind: input.changeKind,
            }),
          );
          const initial = admitLocalSessionWork(input),
            work = initial.host.work,
            identity = {
              repository_id: work.binding.repository_id,
              project_ids: work.binding.project_ids,
              integrations_digest: work.binding.integrations_digest,
              work_id: id,
            };
          writeFileSync(
            path.join(f.root, '.agent/runtime-initialization.v1.json'),
            JSON.stringify({
              schema: 'RuntimeInitialization/v1',
              version: 1,
              repository_id: f.config.repository.repository_id,
              project_ids: ['sample'],
              integrations_digest: canonicalJsonDigest(f.config.integrations),
              workspace_id: f.store.workspaceId,
              workspace_binding_status: 'pending',
              bundle: f.config.runtime.bundle,
              config_digest: runtimeConfigDigest(f.config),
              schema_sha256: createHash('sha256')
                .update(readFileSync(path.join(bundle, 'schemas/runtime-initialization.v1.schema.json')))
                .digest('hex'),
              templates: fixtureInitializationTemplates(f.root, bundle),
              created_at: new Date().toISOString(),
            }),
          );
          acquireLocalSourceWriterLease({
            repositoryRoot: f.root,
            config: f.config,
            store: f.store,
            identity,
            nativeSessionHandle: 'session',
            stageId: 'develop_task',
            assignmentIndex: 0,
            expectedWork: initial.host.workVersion,
            expectedLedger: initial.host.ledgerVersion,
          });
          const args = [
            '--project-root',
            f.root,
            '--repository',
            f.config.repository.repository_id,
            '--project',
            'sample',
            '--work-path',
            'AGENT.sidecar.md',
            '--work-id',
            id,
            '--attempt',
            '1',
            '--scope-digest',
            work.binding.work_source_revision,
            '--team',
            'default-development',
            '--kind',
            'task',
            '--intent',
            'task_execution',
            '--workflow',
            'task_execution',
          ];
          const fixtureSource = snapshotDeclaredSources(
            requireSafeRepositoryAccess(f.root),
            work.lifecycle.scope.allowed_paths,
          );

          markPhase('initial_workflow_setup');
          const fixtureHost = new HostStateStore(
            f.database,
            f.store.workspaceId,
            undefined,
            undefined,
            undefined,
            undefined,
            f.root,
          );
          const ledger = new MastraSessionLedger(f.database, f.store.workspaceId, f.config, f.root, fixtureHost);
          const bridge = await MastraSessionBridge.open({
            ledger,
            projectIds: [input.selection.project],
            repositoryRoot: f.root,
            config: f.config,
            selection: input.selection,
            context: input.context,
            workflowId: 'task_execution',
            workspaceId: f.store.workspaceId,
          });
          await bridge.start(fixtureSource);
          const sync = () => requireSessionJournal(ledger.resume(id, 1));
          let journal = sync();
          const observed = (
            item: MastraSessionLedgerState['items'][number],
            summary: string,
            status: Parameters<MastraSessionLedger['report']>[3]['status'] = 'reported_complete',
          ): Parameters<MastraSessionLedger['report']>[3] => {
            if (!item.issue_id) throw new Error('issued fixture request has no issue id');
            return {
              schema: 'VidaSessionObservation/v1',
              action_id: item.request.action_id,
              issue_id: item.issue_id,
              agent_id: item.request.stage_id + '-' + item.request.assignment_index,
              tool_call_ref: 'local:original-' + item.request.action_id,
              status,
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['local://fixture/terminal'],
            };
          };
          journal = requireSessionJournal(ledger.issueWave(id, 1, journal.version));
          for (const item of journal.state.items)
            journal = requireSessionJournal(
              ledger.report(id, 1, journal.version, observed(item, 'Observed fixture synthesis'), fixtureSource),
            );
          const suspendedStepId = journal.state.step_id;
          if (suspendedStepId === null) throw new Error('fixture Mastra Journal has no suspended step');
          const suspendedObservations = journal.state.items.map((item) => {
            if (!item.observation) throw new Error(`suspended item ${item.request.action_id} has no observation`);
            return item.observation;
          });
          await bridge.resume(suspendedStepId, suspendedObservations, fixtureSource);
          journal = sync();
          journal = await runSourcePrewriterPublicActions({
            args,
            publicRun: runFixture,
            sync,
            repositoryRoot: f.root,
            workId: id,
            attempt: input.context.attempt,
            work,
          });
          const issuedWriter = requireUnknownRecord(
            await runFixture([
              ...args,
              '--issue-wave',
              'true',
              '--expected-revision',
              String(journal.version.revision),
              '--expected-digest',
              journal.version.digest,
            ]),
            'issued writer result',
          );
          const issuedActions = requireUnknownRecordArray(issuedWriter.issued_actions, 'issued writer actions'),
            issuedAction = issuedActions[0];
          if (!issuedAction || typeof issuedAction.host_attempt_id !== 'string')
            throw new Error('issued writer action has no Host attempt id');
          expect(issuedActions).toHaveLength(1);
          journal = sync();
          const writerItem = journal.state.items[0];
          if (!writerItem?.host_reservation) throw new Error('issued writer Journal item has no reservation');
          const reservation = writerItem.host_reservation;
          expect(reservation.approvalAction).toBe('source.write');
          const claimed = reservation.receipt;
          expect(issuedAction.host_attempt_id).toBe(claimed.attempt.attempt_id);
          const writer = {
            ...observed(writerItem, 'Actual isolated fixture writer terminal'),
            host_attempt_id: claimed.attempt.attempt_id,
            changed_paths: [],
          };
          const writerReport = path.join(f.root, '.agent/work/' + id + '/report-develop_task-0.json');
          writeFileSync(writerReport, JSON.stringify(writer));
          await runFixture([
            ...args,
            '--report',
            writerReport,
            '--expected-revision',
            String(journal.version.revision),
            '--expected-digest',
            journal.version.digest,
          ]);
          journal = sync();
          journal = requireSessionJournal(ledger.issueWave(id, 1, journal.version));
          markPhase('initial_reports_and_block');
          const report = async (
            item: MastraSessionLedgerState['items'][number],
            summary: string,
            status: Parameters<MastraSessionLedger['report']>[3]['status'],
            execute: (args: string[]) => unknown = publicRun,
          ) => {
            const observation = observed(item, summary, status),
              file = path.join(
                f.root,
                '.agent/work/' +
                  id +
                  '/report-' +
                  item.request.stage_id +
                  '-' +
                  item.request.assignment_index +
                  '.json',
              );
            writeFileSync(file, JSON.stringify(observation));
            await execute([
              ...args,
              '--report',
              file,
              '--expected-revision',
              String(journal.version.revision),
              '--expected-digest',
              journal.version.digest,
            ]);
          };
          const validatorItems = [...journal.state.items];
          if (failureStage === 'validate')
            journal = await reportFailedFinalValidatorWave({
              journal,
              evidenceRef: 'local://fixture/terminal',
              report: async (item, summary, status) => {
                await report(item, summary, status, runFixture);
                journal = sync();
                return journal;
              },
            });
          else
            for (const item of validatorItems) {
              await report(
                item,
                JSON.stringify({
                  schema: 'VidaValidatorVerdict/v1',
                  verdict: 'pass',
                  findings: [],
                  evidence_refs: ['local://fixture/terminal'],
                }),
                'reported_complete',
                runFixture,
              );
              journal = sync();
            }
          if (failureStage === 'test') {
            journal = requireSessionJournal(ledger.issueWave(id, 1, journal.version));
            await report(
              requireArrayItem(journal.state.items, 0, 'failed tester request'),
              JSON.stringify({
                schema: 'VidaTesterVerdict/v1',
                status: 'fail',
                evidence_refs: ['local://fixture/terminal'],
              }),
              'reported_failed',
              runFixture,
            );
            journal = sync();
          }
          const original = journal.state;
          expect(original.items.filter((item) => item.observation?.status === 'reported_failed')).toHaveLength(
            failureStage === 'validate' ? 2 : 1,
          );
          expect(sync().resume_status).toBe('blocked');
          const blockedBridgeSnapshot = await bridge.snapshot();
          if (!blockedBridgeSnapshot) throw new Error('blocked execution bridge snapshot is missing');
          expect(blockedBridgeSnapshot.status).toBe('suspended');
          expect(original.run_id).toBe(requireWorkRunId(work));
          if (failureStage === 'validate') {
            const beforeHost = f.store.readHostStateSnapshot(identity),
              beforeJournal = sync();
            assertCompleteHostSnapshot(beforeHost);
            const denied = publicCli.spawn([
              ...args,
              '--issue-wave',
              'true',
              '--expected-revision',
              String(beforeJournal.version.revision),
              '--expected-digest',
              beforeJournal.version.digest,
            ]);
            expect(denied.status).toBe(1);
            expect(denied.signal).toBeNull();
            expect(denied.error).toBeUndefined();
            const denialLines = denied.stderr
              .trim()
              .split(/\r?\n/u)
              .filter((line) => line.startsWith('{"schema":"VidaAgentRunResult/v1"'));
            expect(denialLines).toHaveLength(1);
            const denial = parseJsonRecord(requireArrayItem(denialLines, 0, 'public denial result'));
            expect(denial).toMatchObject({
              schema: 'VidaAgentRunResult/v1',
              status: 'blocked',
              code: 'GAP-VIDA-RUN-EXECUTION-001',
            });
            expect(denied.stdout.trim()).toBe('');
            expect(denial.issued_actions ?? []).toEqual([]);
            expect(denial.next_actions ?? []).toEqual([]);
            expect(requireSessionJournal(ledger.resume(id, 1))).toEqual(beforeJournal);
            expect(requireHostWork(f.store.readHostStateSnapshot(identity)).execution.assignment_attempts).toEqual(
              beforeHost.work.execution.assignment_attempts,
            );
            expect(
              snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), work.lifecycle.scope.allowed_paths),
            ).toEqual(fixtureSource);
            const deniedBridgeSnapshot = await bridge.snapshot();
            if (!deniedBridgeSnapshot) throw new Error('denied execution bridge snapshot is missing');
            expect(deniedBridgeSnapshot.status).toBe('suspended');
          }
          markPhase('correction_clear_preparation');
          await bridge.close();
          const originalVersion = requireJournalVersion(f.store.readWorkSessionJournal(identity));
          const { preparationPath } = await writeFailedFinalPreparationInputs({
            root: f.root,
            work,
            attempt: 1,
            policyId: 'corrective-public-fixture',
          });
          const planPath = path.join(f.root, `.agent/work/${id}/correction-plan.json`);
          writeFileSync(
            planPath,
            JSON.stringify({
              schema: 'CorrectiveExecutionPlan/v1',
              work_id: id,
              attempt: 1,
              stage_ids: ['develop_task', 'validate_focused', 'test_task'],
              user_instruction_ref: 'fixture:actual-correction-owner',
              preparation_path: preparationPath,
            }),
          );

          if (scenario === 'runtime-rebind') {
            prepareLifecycleForCorrection({
              root: f.root,
              config: f.config,
              store: fixtureHost,
              identity,
              journal: requireSessionJournal(ledger.resume(id, 1)),
              preparationPath,
            });
            let current = fixtureHost.readHostStateSnapshot(identity);
            assertCompleteHostSnapshot(current);
            const negative = original.items.find((item) => item.observation?.status === 'reported_failed');
            if (!negative) throw new Error('original corrective Journal has no failed terminal observation');
            const principal = 'synthetic-forward-rebind-verifier';
            const verifier: RuntimeCodeRebindVerifier = {
              principal,
              verify: (request: RuntimeCodeRebindRequest) => ({
                schema: 'VidaRuntimeCodeRebindAuthorization/v1',
                request_digest: canonicalJsonDigest(request),
                principal,
                forward_operation_id: request.forwardOperationId,
                parent_manifest_digest: request.parentManifestDigest,
                successor_manifest_digest: request.successorManifestDigest,
                ...(request.focusedFailureCorrection
                  ? { owner_correction_pointer: request.focusedFailureCorrection.ownerCorrectionPointer }
                  : {}),
              }),
            };
            const reboundStore = new HostStateStore(
              f.database,
              f.store.workspaceId,
              undefined,
              undefined,
              undefined,
              undefined,
              f.root,
              verifier,
            );
            const request: RuntimeCodeRebindRequest = {
              identity,
              attempt: 1,
              actionId: negative.request.action_id,
              issueId: requireIssueId(negative),
              nativeSessionHandle: 'session',
              expectedWork: current.workVersion,
              expectedLedger: current.ledgerVersion,
              expectedJournal: requireSessionJournal(ledger.resume(id, 1)).version,
              expectedMaintenanceGeneration: current.maintenanceGeneration,
              oldRuntimeCodeDigest: current.work.binding.runtime_code_digest,
              newRuntimeCodeDigest: canonicalJsonDigest('synthetic-fixture-successor-package'),
              forwardOperationId: 'synthetic-forward-operation',
              parentManifestDigest: canonicalJsonDigest('synthetic-parent-manifest'),
              successorManifestDigest: canonicalJsonDigest('synthetic-successor-manifest'),
              focusedFailureCorrection: {
                ownerCorrectionPointer: 'synthetic-owner:correct-known-terminal-failures',
              },
            };
            const oldAttempts = structuredClone(current.work.execution.assignment_attempts),
              oldJournal = structuredClone(requireSessionJournal(ledger.resume(id, 1))),
              priorImplementation = current.work.lifecycle.references.find(
                (reference) => reference.kind === 'implementation_result' && reference.disposition === 'current',
              );
            expect(priorImplementation).toBeDefined();
            f.database.exec(
              'CREATE TABLE agent_host_runtime_code_rebind (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
            );
            f.database.exec(
              "CREATE TRIGGER reject_synthetic_rebind BEFORE INSERT ON agent_host_runtime_code_rebind BEGIN SELECT RAISE(ABORT,'synthetic receipt rollback'); END",
            );
            await Promise.resolve(
              expect(reboundStore.rebindRuntimeCode(request)).rejects.toThrow('synthetic receipt rollback'),
            );
            expect(reboundStore.readHostStateSnapshot(identity)).toEqual(current);
            expect(
              f.database
                .query<{ payload: string; digest: string }, [string]>(
                  'SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE work_id=?',
                )
                .get(id),
            ).toBeNull();
            f.database.exec('DROP TRIGGER reject_synthetic_rebind');
            const rebound = await reboundStore.rebindRuntimeCode(request);
            const reboundWork = requireHostWork(rebound);
            expect(reboundWork.binding.runtime_code_digest).toBe(request.newRuntimeCodeDigest);
            expect(reboundWork.execution.assignment_attempts).toEqual(oldAttempts);
            expect(reboundWork.lifecycle.phase).toBe('VERIFY');
            expect(reboundWork.lifecycle.seal).toEqual(current.work.lifecycle.seal);
            expect(reboundWork.lifecycle.assurance).toEqual(current.work.lifecycle.assurance);
            expect(
              reboundWork.lifecycle.references.find((reference) => reference.kind === 'execution_approval')
                ?.disposition,
            ).toBe('current');
            if (!priorImplementation) throw new Error('current Work has no implementation evidence reference');
            expect(
              reboundWork.lifecycle.references.find(
                (reference) =>
                  reference.kind === 'implementation_result' && reference.record_id === priorImplementation.record_id,
              )?.disposition,
            ).toBe('current');
            expect(requireSessionJournal(ledger.resume(id, 1))).toEqual(oldJournal);
            expect(reboundStore.readWorkSessionJournal(identity)).toEqual({
              attempt: 1,
              version: oldJournal.version,
              state: oldJournal.state,
            });
            const restarted = new HostStateStore(
              f.database,
              f.store.workspaceId,
              undefined,
              undefined,
              undefined,
              undefined,
              f.root,
              verifier,
            );
            const databasePath = path.join(f.root, f.config.control.work_root, 'session-handoff.v1.sqlite');
            expect(requireHostWork(restarted.readHostStateSnapshot(identity)).execution.assignment_attempts).toEqual(
              oldAttempts,
            );
            expect(
              requireInspectedWork(
                inspectHostWorkspaceDatabase(f.root, path.relative(f.root, databasePath), f.store.workspaceId),
                id,
              ).execution.assignment_attempts,
            ).toEqual(oldAttempts);
            const row = f.database
              .query<{ payload: string; digest: string }, [string]>(
                'SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE work_id=?',
              )
              .get(id);
            if (!row) throw new Error('runtime-code rebind receipt is missing');
            const receipt = parseJsonRecord(row.payload);
            const bindingHistory = requireRecordField(receipt, 'binding_history');
            const originalWork = parseWorkStateJson(
              JSON.stringify(requireRecordField(bindingHistory, 'original_work')),
            );
            expect(originalWork.binding).toEqual(requireHostWork(current).binding);
            expect(bindingHistory.terminal_attempt_ids).toEqual(oldAttempts.map((attempt) => attempt.attempt_id));
            const successorRow = f.database
              .query<{ revision: number; payload: string; digest: string }, [string, string]>(
                "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
              )
              .get(f.store.workspaceId, id);
            if (!successorRow) throw new Error('runtime-code successor Work is missing');
            f.database
              .query(
                "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
              )
              .run(
                current.work.revision,
                canonicalJson(current.work),
                canonicalJsonDigest(current.work),
                f.store.workspaceId,
                id,
              );
            expect(() => restarted.readHostStateSnapshot(identity)).toThrow(
              'runtime binding history authority differs',
            );
            expect(() =>
              inspectHostWorkspaceDatabase(f.root, path.relative(f.root, databasePath), f.store.workspaceId),
            ).toThrow('runtime binding history authority differs');
            f.database
              .query(
                "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
              )
              .run(successorRow.revision, successorRow.payload, successorRow.digest, f.store.workspaceId, id);
            expect(requireHostWork(restarted.readHostStateSnapshot(identity)).binding.runtime_code_digest).toBe(
              request.newRuntimeCodeDigest,
            );
            expect(
              requireInspectedWork(
                inspectHostWorkspaceDatabase(f.root, path.relative(f.root, databasePath), f.store.workspaceId),
                id,
              ).binding.runtime_code_digest,
            ).toBe(request.newRuntimeCodeDigest);
            const bad = structuredClone(receipt);
            requireRecordField(bad, 'binding_history').terminal_attempt_ids = ['foreign-terminal-attempt'];
            f.database
              .query('UPDATE agent_host_runtime_code_rebind SET payload=?,digest=? WHERE work_id=?')
              .run(canonicalJson(bad), canonicalJsonDigest(bad), id);
            expect(() => restarted.readHostStateSnapshot(identity)).toThrow('unknown or unlisted');
            f.database
              .query('UPDATE agent_host_runtime_code_rebind SET payload=?,digest=? WHERE work_id=?')
              .run(row.payload, row.digest, id);
            expect(requireHostWork(restarted.readHostStateSnapshot(identity)).binding.runtime_code_digest).toBe(
              request.newRuntimeCodeDigest,
            );
            return;
          }

          markPhase('correction_prepare_and_inspect');
          // TEST-only accepted reports reached Host through the real configured session APIs above.
          // Prepare once, then observe the public Host authorization API in this same SQLite isolate.
          const beforeAuthorization = prepareLifecycleForCorrection({
              root: f.root,
              config: f.config,
              store: fixtureHost,
              identity,
              journal: requireSessionJournal(ledger.resume(id, 1)),
              preparationPath,
            }),
            currentJournal = requireSessionJournal(ledger.resume(id, 1));
          assertCompleteHostSnapshot(beforeAuthorization);
          expect(beforeAuthorization.work.lifecycle.phase).toBe('VERIFY');
          expect(beforeAuthorization.work.lease).not.toBeNull();
          const cacheObservation = observeMetadataReads(f.database, () =>
            fixtureHost.authorizeCorrectiveExecution({
              identity,
              attempt: 1,
              expectedWork: beforeAuthorization.workVersion,
              expectedLedger: beforeAuthorization.ledgerVersion,
              expectedJournal: currentJournal.version,
              stageIds: ['develop_task', 'validate_focused', 'test_task'],
              userInstructionRef: 'fixture:actual-correction-owner',
              config: f.config,
            }),
          );
          expect(cacheObservation.error).toBeUndefined();
          expect(cacheObservation.result).toBeDefined();
          expectCorrectiveAuthorizationMetadata(cacheObservation.reads);

          if (scenario === 'validate') {
            const inspectionExecution = requireCorrectiveExecution(cacheObservation.result),
              inspectionInput = {
                repositoryRoot: f.root,
                config: f.config,
                projectIds: identity.project_ids,
                integrationsDigest: identity.integrations_digest,
                workId: id,
                attempt: 1,
              },
              authorizedJournal = requireSessionJournal(ledger.resume(id, 1)),
              inspectionRows = () => ({
                host: f.database
                  .query(
                    "SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind IN ('work','ledger') ORDER BY kind,id",
                  )
                  .all(f.store.workspaceId),
                journal: f.database
                  .query<
                    {
                      workspace_id: string;
                      work_id: string;
                      attempt: number;
                      revision: number;
                      payload: string;
                      digest: string;
                    },
                    [string, string, number]
                  >(
                    'SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
                  )
                  .all(f.store.workspaceId, id, 1),
              }),
              originalInspectionRows = inspectionRows(),
              originalInspectionState = authorizedJournal.state,
              originalJournalRow = originalInspectionRows.journal[0];
            if (!originalJournalRow) throw new Error('original corrective inspection journal row is missing');
            const saveInspectionState = (state: typeof originalInspectionState) =>
                f.database
                  .query(
                    'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
                  )
                  .run(JSON.stringify(state), canonicalJsonDigest(state), f.store.workspaceId, id, 1),
              restoreInspectionState = () =>
                f.database
                  .query(
                    'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
                  )
                  .run(originalJournalRow.payload, originalJournalRow.digest, f.store.workspaceId, id, 1),
              denyInspectionVariant = (state: typeof originalInspectionState, message: string) => {
                try {
                  saveInspectionState(state);
                  const retainedRows = inspectionRows();
                  expect(() => inspectLocalSession(inspectionInput)).toThrow(message);
                  expect(inspectionRows()).toEqual(retainedRows);
                } finally {
                  restoreInspectionState();
                }
                expect(inspectionRows()).toEqual(originalInspectionRows);
              };
            expect(inspectLocalSession(inspectionInput)).toMatchObject({
              status: 'inspected',
              work_id: id,
              attempt: 1,
            });
            expect(inspectionRows()).toEqual(originalInspectionRows);
            denyInspectionVariant(
              { ...originalInspectionState, corrective_execution: null },
              'work and journal run differ',
            );
            denyInspectionVariant(
              {
                ...originalInspectionState,
                corrective_execution: { ...inspectionExecution, engine_run_id: randomUUID() },
              },
              'corrective session binding differs',
            );
            denyInspectionVariant(
              {
                ...originalInspectionState,
                corrective_execution: { ...inspectionExecution, base_run_id: 'foreign-base-run' },
              },
              'corrective session binding differs',
            );
            denyInspectionVariant(
              {
                ...originalInspectionState,
                corrective_execution: {
                  ...inspectionExecution,
                  correction_generation: inspectionExecution.correction_generation + 1,
                },
              },
              'corrective session binding differs',
            );
            denyInspectionVariant({ ...originalInspectionState, attempt: 2 }, 'journal identity is invalid');
            denyInspectionVariant(
              {
                ...originalInspectionState,
                corrective_execution: {
                  ...inspectionExecution,
                  authorization: {
                    ...inspectionExecution.authorization,
                    path: inspectionExecution.authorization.path + '.foreign',
                  },
                },
              },
              'consumed Host correction authority missing',
            );
            const inspectionAuthorityPath = path.join(f.root, inspectionExecution.authorization.path),
              inspectionAuthorityBytes = readFileSync(inspectionAuthorityPath);
            try {
              writeFileSync(inspectionAuthorityPath, Buffer.concat([inspectionAuthorityBytes, Buffer.from(' ')]));
              const retainedRows = inspectionRows();
              expect(() => inspectLocalSession(inspectionInput)).toThrow('corrective authority bytes differ');
              expect(inspectionRows()).toEqual(retainedRows);
            } finally {
              writeFileSync(inspectionAuthorityPath, inspectionAuthorityBytes);
            }
            expect(inspectionRows()).toEqual(originalInspectionRows);
          }

          // The CLI retry is a read-only retrieval: run.mjs calls retrieveCorrectiveAuthorization
          // first and returns that existing authorization before any preparation or write.
          markPhase('public_authorize_deny_resume');
          const authorized = publicRun([
            ...args,
            '--correct',
            planPath,
            '--expected-revision',
            String(originalVersion.revision),
            '--expected-digest',
            originalVersion.digest,
          ]);
          const authorizedExecution = requireCorrectiveExecution(authorized.corrective_execution),
            cachedExecution = requireCorrectiveExecution(cacheObservation.result);
          expect(authorizedExecution).toEqual(cachedExecution);
          expect(requireHostWork(f.store.readHostStateSnapshot(identity)).lifecycle.assurance.correction_count).toBe(1);
          const originalPlan = readFileSync(planPath);
          const changedPlan = parseJsonRecord(originalPlan.toString('utf8'));
          changedPlan.user_instruction_ref = 'fixture:changed-owner';
          writeFileSync(planPath, JSON.stringify(changedPlan));
          expect(() =>
            publicRun([
              ...args,
              '--correct',
              planPath,
              '--expected-revision',
              String(originalVersion.revision),
              '--expected-digest',
              originalVersion.digest,
            ]),
          ).toThrow('blocked');
          writeFileSync(planPath, originalPlan);
          expect(authorized.status).toBe('correction_authorized');
          const baseRunId = authorizedExecution.base_run_id;
          if (baseRunId === null) throw new Error('corrective execution omitted its base run id');
          const originalRunId = requireWorkRunId(work);
          expect(baseRunId).toBe(originalRunId);
          expect(authorizedExecution.engine_run_id).not.toBe(originalRunId);
          expect(
            f.store
              .readHostStateSnapshot(identity)
              .work?.lifecycle.references.find((ref) => ref.kind === 'correction_authorization')?.disposition,
          ).toBe('retired');
          const resumed = publicRun(args);
          const resumedRunId = resumed.mastra_run_id;
          if (typeof resumedRunId !== 'string') throw new Error('corrective resume omitted Mastra run id');
          expect(resumedRunId).toBe(authorizedExecution.engine_run_id);
          const resumedActions = requireUnknownRecordArray(resumed.next_actions, 'corrective resume next actions');
          expect(resumedActions.map((action) => requireRecordField(action, 'request').stage_id)).toEqual([
            'develop_task',
          ]);
          if (scenario === 'success') {
            const current = requireSessionJournal(ledger.resume(id, 1));
            const currentRunId = current.state.run_id;
            if (!currentRunId) throw new Error('suspended correction Journal has no workflow run id');
            const engine = new Database(path.join(f.root, f.config.control.work_root, 'mastra-workflows.v1.sqlite'));
            const originalSnapshot = engine
              .query<{ snapshot: string; parsed: string }, [string]>(
                'SELECT snapshot,json(snapshot) AS parsed FROM mastra_workflow_snapshot WHERE run_id=?',
              )
              .get(currentRunId);
            if (!originalSnapshot) throw new Error('suspended engine snapshot is missing');
            try {
              const substituted = parseJsonRecord(originalSnapshot.parsed);
              const snapshotContext = requireRecordField(substituted, 'context');
              const stepId = current.state.step_id;
              if (stepId === null) throw new Error('suspended engine snapshot has no current step');
              const step = requireRecordField(snapshotContext, stepId);
              const suspendPayload = requireRecordField(step, 'suspendPayload');
              const requests = suspendPayload.requests;
              if (!Array.isArray(requests) || !isPlainRecord(requests[0]))
                throw new Error('suspended engine snapshot has no corrective request');
              const correctiveExecution = requests[0].corrective_execution;
              if (!isPlainRecord(correctiveExecution))
                throw new Error('suspended engine snapshot has no corrective execution');
              correctiveExecution.stage_ids = ['test_task'];
              engine
                .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
                .run(JSON.stringify(substituted), currentRunId);
              expect(() =>
                readSessionEngineSnapshot({
                  repositoryRoot: f.root,
                  config: f.config,
                  selection: input.selection,
                  context,
                  workflowId: 'task_execution',
                  runId: currentRunId,
                  correctiveExecution: requireCorrectiveExecution(current.state.corrective_execution),
                }),
              ).toThrow(/frontier requests/);
              expect(requireSessionJournal(ledger.resume(id, 1))).toEqual(current);
            } finally {
              engine
                .query('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
                .run(originalSnapshot.snapshot, currentRunId);
              engine.close();
            }
          }
          markPhase('public_issue_wave');
          const issued = publicRun([
            ...args,
            '--issue-wave',
            'true',
            '--expected-revision',
            String(requireStateVersionValue(resumed.state_version).revision),
            '--expected-digest',
            requireStateVersionValue(resumed.state_version).digest,
          ]);
          markPhase('post_issue_recovery');
          const correctiveActions = requireUnknownRecordArray(issued.issued_actions, 'corrective issue-wave actions'),
            correctiveAction = correctiveActions[0];
          if (!correctiveAction || typeof correctiveAction.host_attempt_id !== 'string')
            throw new Error('corrective issue-wave action is missing its Host attempt id');
          const issuedRequest = requireRecordField(correctiveAction, 'request');
          expect(correctiveActions).toHaveLength(1);
          expect(requireCorrectiveExecution(issuedRequest.corrective_execution)).toEqual(authorizedExecution);
          const currentAttempts = requireHostWork(f.store.readHostStateSnapshot(identity)).execution
            .assignment_attempts;
          const boundHost = new HostStateStore(
            f.database,
            f.store.workspaceId,
            undefined,
            undefined,
            undefined,
            undefined,
            f.root,
          );
          expect(() => boundHost.assertCorrectiveExecutionForWork(id, 2, authorizedExecution)).toThrow(
            'corrective authority contract differs',
          );
          expect(currentAttempts).toHaveLength(2);
          const correctiveAttempt = requireArrayItem(currentAttempts, 1, 'corrective Host assignment attempt');
          expect(correctiveAttempt.correction_generation).toBe(1);
          expect(correctiveAttempt.previous_attempt_id).toBe(claimed.attempt.attempt_id);
          expect(
            requireArrayItem(
              requireHostWork(f.store.readHostStateSnapshot(identity)).execution.assignment_attempts,
              0,
              'original Host assignment attempt',
            ).attempt_id,
          ).toBe(claimed.attempt.attempt_id);
          const recoveryRecord = parseJsonRecord(
              f.database
                .query<{ payload: string }, [string]>(
                  'SELECT payload FROM agent_host_corrective_recovery WHERE work_id=?',
                )
                .get(id)?.payload ?? '',
            ),
            originalJournalRecord = requireRecordField(recoveryRecord, 'original_journal');
          expect(parseMastraSessionLedgerState(originalJournalRecord.state)).toEqual(original);
          if (failureStage === 'validate') {
            journal = requireSessionJournal(ledger.resume(id, 1));
            const correctionWriter = journal.state.items[0];
            if (!correctionWriter) throw new Error('corrective writer Journal item is missing');
            const corrected = {
              ...observed(correctionWriter, 'Observed corrective writer terminal'),
              host_attempt_id: correctiveAction.host_attempt_id,
              changed_paths: [],
            };
            const correctionReport = path.join(f.root, '.agent/work/' + id + '/correction-writer-report.json');
            writeFileSync(correctionReport, JSON.stringify(corrected));
            publicRun([
              ...args,
              '--report',
              correctionReport,
              '--expected-revision',
              String(journal.version.revision),
              '--expected-digest',
              journal.version.digest,
            ]);
            journal = requireSessionJournal(ledger.resume(id, 1));
            expect(journal.state.items.map((item) => item.request.stage_id)).toEqual([
              'validate_focused',
              'validate_focused',
            ]);
            publicRun([
              ...args,
              '--issue-wave',
              'true',
              '--expected-revision',
              String(journal.version.revision),
              '--expected-digest',
              journal.version.digest,
            ]);
            journal = requireSessionJournal(ledger.resume(id, 1));
            for (const item of [...journal.state.items]) {
              await report(
                item,
                JSON.stringify({
                  schema: 'VidaValidatorVerdict/v1',
                  verdict: 'pass',
                  findings: [],
                  evidence_refs: ['local://fixture/terminal'],
                }),
                'reported_complete',
                runFixture,
              );
              journal = requireSessionJournal(ledger.resume(id, 1));
            }
            expect(journal.state.items.map((item) => item.request.stage_id)).toEqual(['test_task']);
            publicRun([
              ...args,
              '--issue-wave',
              'true',
              '--expected-revision',
              String(journal.version.revision),
              '--expected-digest',
              journal.version.digest,
            ]);
            journal = requireSessionJournal(ledger.resume(id, 1));
            const testerItem = requireArrayItem(journal.state.items, 0, 'corrective tester Journal item');
            await report(
              testerItem,
              JSON.stringify({
                schema: 'VidaTesterVerdict/v1',
                status: scenario === 'success' ? 'pass' : 'fail',
                evidence_refs: ['local://fixture/terminal'],
              }),
              scenario === 'success' ? 'reported_complete' : 'reported_failed',
              runFixture,
            );
            journal = requireSessionJournal(ledger.resume(id, 1));
            expect(journal.resume_status).toBe('blocked');
            if (scenario === 'success') expect(journal.state.step_id).toBeNull();
            expect(journal.state.attempt).toBe(1);
            expect(journal.state.work_id).toBe(id);
            const completedWriter = journal.state.completed
              .flatMap((wave) => wave.items)
              .find((item) => item.request.stage_id === 'develop_task');
            if (!completedWriter?.observation) throw new Error('corrective writer completion is missing');
            expect(completedWriter.observation.host_attempt_id).toBe(correctiveAction.host_attempt_id);
            if (scenario === 'success') {
              const binding = {
                repositoryRoot: f.root,
                config: f.config,
                selection: input.selection,
                context,
                workflowId: 'task_execution',
                runId: authorizedExecution.engine_run_id,
              };
              expect(() => readSessionEngineSnapshot(binding)).toThrow(/execution prefix/);
              const before = requireSessionJournal(ledger.resume(id, 1));
              const completedEngineSnapshot = readSessionEngineSnapshot({
                ...binding,
                correctiveExecution: authorizedExecution,
              });
              if (!completedEngineSnapshot) throw new Error('completed corrective engine snapshot is missing');
              expect(completedEngineSnapshot.status).toBe('success');
              const witness = await createStagedRuntimeWitness({
                repositoryRoot: f.root,
                payloadManifestSha256: canonicalJsonDigest({ fixture: 'corrective completion' }),
                workId: id,
                attempt: 1,
                lifecycleRisk: input.risk,
                selection: input.selection,
              });
              expect(witness.mastra_status).toBe('success');
              expect(witness.run_id).toBe(authorizedExecution.engine_run_id);
              expect(witness.ledger_state).toEqual(before.state);
              expect(requireSessionJournal(ledger.resume(id, 1))).toEqual(before);
            }
          }
          markPhase('terminal_assertions_cleanup');
        } catch (error) {
          failure = error;
          didFail = true;
        } finally {
          f.close({ retainRoot: retainFixtureRootOnUnknown });
          expect(existsSync(f.root)).toBe(retainFixtureRootOnUnknown);
        }
      } catch (cleanupFailure) {
        if (didFail)
          throw new AggregateError(
            [failure, cleanupFailure],
            'Public correction failed; owned fixture cleanup also failed',
          );
        throw cleanupFailure;
      }
      if (didFail) throw failure;
    },
    60000,
  );
