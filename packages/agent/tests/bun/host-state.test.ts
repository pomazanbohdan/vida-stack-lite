import {
  readConfiguredContinuationSessionEngineSnapshot,
  readRetainedUnissuedSessionEngineSnapshot,
} from '../../src/orchestration/session-engine-snapshot.ts';
import {
  projectConfiguredFrontierContinuationAction,
  projectConfiguredPrewriterContinuationRequests,
  type DeliveredWorkContinuationRequest,
} from '../../src/orchestration/delivered-work-continuation.ts';
import { seedOriginalFrontierEngine } from '../helpers/original-frontier-engine-fixture.ts';
import { executionBudget } from '../../bin/bun.ts';
import type { FailedPrewriterTransitionRequest } from '../../src/orchestration/failed-prewriter-transition.ts';
import { expectHistorySnapshotAfterOwner } from '../helpers/ledger-cache-observer.ts';
import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test, setSystemTime } from 'bun:test';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { observeWorkStateSchemaCompiles } from '../helpers/ajv-compile-observer.ts';
import { expectReturned, expectRejection, rejectionReason } from '../helpers/expect-rejection.ts';
import { createWorkflowReconciliationAuthorization } from '../helpers/workflow-reconciliation-authorization-fixture.ts';
import { createInitializationBundle } from '../helpers/init-bundle.ts';
import { makeFreshRepository } from '../helpers/project-upgrade-fixture.ts';
import { createFailedFinalCorrectionFixture } from '../helpers/failed-final-correction-fixture.ts';
import { prepareNativeUnnormalizedSynthesis } from '../helpers/native-synthesis-correction-fixture.ts';
import {
  createPrewriterPreparationObservation,
  runSynthesisFixtureInProcess,
} from '../helpers/public-prewriter-fixture.ts';
import { bindControlledRuntimeInitialization } from '../helpers/controlled-runtime-initialization-fixture.ts';
import { buildReadOnlyDispatchRepairPlan } from '../../src/orchestration/read-only-dispatch-repair.ts';
import { createAutomaticWorkAdmissionFixture } from '../helpers/automatic-work-admission-fixture.ts';
import { createTaskSourceHostFixture, trustedTaskSourcePolicyDecision } from '../helpers/task-source-host-fixture.ts';
import { qualifiedRuntimeCodeEndpointFixture } from '../helpers/qualified-runtime-code-fixture.ts';
import {
  bindFrontierContractReferences,
  failedFrontierJournalFixture,
  seedFrontierHostFixture,
  withConfiguredFrontierHostFixture,
  mutableCoordinationLedger,
  normalConfigEndpointProof,
  withFrontierJournalFixture,
} from '../helpers/configured-frontier-host-fixture.ts';
import {
  createTaskSourceBinding,
  type TaskSourceBindingReport,
  type TaskSourceBindingRequest,
} from '../../src/orchestration/task-source-binding.ts';
import {
  continuationFixture,
  continuationFixtureRepositoryRoot,
  continuationRequestFor,
  requestFixture as continuationRequestSeed,
  sourceScope as continuationSourceScope,
  cleanupContinuationFixtures,
  retainContinuationFixtureRoot,
} from '../helpers/delivered-work-continuation-fixture.ts';
import { hasUnresolvedFixtureOperations } from '../helpers/unresolved-governance-fixture.ts';
import {
  createInitialSourceWorkFixture,
  withInitialSourceCleanup,
  hostStore as initialSourceHostStore,
  hostLedger as initialSourceHostLedger,
  hostBridge as initialSourceHostBridge,
  hostDatabase as initialSourceHostDatabase,
  currentJournal as initialSourceJournal,
  changeOneAcceptedDocument,
  currentProof as initialSourceProof,
  initialRequest as initialSourceRequest,
  withExpiredOwner as withExpiredInitialSourceOwner,
  continuationState as initialSourceState,
  prepareInitialSourceFrontier,
  frontierCodeRequest,
  fixtureFrontierProof,
  trustedHostFixtureVerifier,
  issueInitialSourceFixtureWriter,
  expiredOwnerTime as initialSourceExpiredOwnerTime,
} from '../helpers/initial-source-work-fixture.ts';
import { createCompletedSourceReportRecoveryFixture } from '../helpers/completed-source-report-recovery-fixture.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';
import {
  prepareLifecycleForCorrection,
  correctiveAssignmentAuthorizationSchema,
  prepareFinalAssurance,
  createFinalAssuranceState,
  issueFinalAssuranceWave,
  reportFinalAssurance,
  finalAssuranceStatus,
  finalAssuranceReceiptReferences,
  type FinalAssuranceReport,
} from '../../src/orchestration/final-assurance.ts';
import { validateWorkState } from '../../src/contracts/work-state-schema.ts';
import type {
  CoordinationClaim,
  CoordinationLedger,
  CoordinationTicket,
  CoordinationTicketMigrationLineage,
  MaintenanceFenceBinding,
  MaintenanceReleaseVerifier,
  MigrationRebindAuthorization,
  ReconciliationGateBinding,
  WorkCheckpointMigrationLineage,
  WorkIdentity,
  WorkMigrationLineage,
  WorkflowAttemptReconciliationVerifier,
  WorkflowAttemptReconciliationAuthorization,
  WorkflowAttemptReconciliationRequest,
  WorkState,
  HostStateSnapshot,
  StateVersion,
} from '../../src/host-state.ts';
import type {
  MastraSessionLedgerSnapshot,
  SynthesisObservationCorrectionPlan,
} from '../../src/orchestration/persistent-session-handoff.ts';
import { validateHostOperationReservation } from '../../src/governance/edictum-boundary.ts';
import {
  coordinationLedgerJson,
  coordinationLedgerDigest,
  validateCoordinationLedgerV1,
} from '../../src/contracts/envelopes.ts';
import { validateLifecycleAggregate } from '../../src/lifecycle/lifecycle-state.ts';
import type {
  RuntimeCodeRebindRequest,
  RuntimeCodeRebindVerifier,
  WorkflowAttemptApprovalVerifier,
  WorkflowAttemptReceipt,
} from '../../src/host-state.ts';
import type { LifecycleState } from '../../src/lifecycle/lifecycle-state.ts';
import { createHash, randomUUID } from 'node:crypto';
import * as nodeFs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { executeDocumentationClearOperation } from '../../src/documentation/clear.ts';
import {
  assertCodexDesktopAdapterContract,
  HostStateStore,
  checkedMaintenanceFence,
  openHostStateDatabase,
  inspectHostWorkspaceDatabase,
  runConsumerMigrationState,
  workMigrationId,
  withHostStateExclusiveTransaction,
  initializeTaskSourceBindingWorkProjectionSchema,
  createTaskSourceMutationPolicyRequest,
} from '../../src/host-state.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../../src/config/workspace-database-raw.ts';
import * as trustedHostSurface from '../../src/trusted-host.ts';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { MAX_CANONICAL_NODES } from '../../src/contracts/canonical-json-core.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import {
  activeRuntimeConfigurationSource,
  assertProjectUpgradeInactive,
  loadRuntimeConfig,
  runtimeConfigDigest,
} from '../../src/config/runtime-config.ts';
import { PROJECT_UPGRADE_OPERATION_PATH, sessionBridgeDatabaseRelativePath } from '../../src/config/project-paths.ts';
import type { FlowIntent, WorkItemKind } from '../../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../../src/config/project-context.ts';
import { createTestTrustedHostLauncherCapability, createTrustedHostComposition } from '../../src/runtime-kernel.ts';
import { createConfiguredMastra } from '../../src/orchestration/mastra-boundary.ts';
import {
  buildSessionBridgeRequest,
  parseSessionBridgeObservation,
} from '../../src/orchestration/mastra-session-bridge-contract.ts';
import {
  prepareSessionWorkflowHandoffFromConfig,
  type SessionAgentAction,
} from '../../src/orchestration/session-handoff.ts';
import {
  suspendLocalWork,
  suspendCompletedReadOnlyWork,
  suspendHistoricalOwnerWork,
} from '../../src/orchestration/suspend-local-work.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../../src/orchestration/local-work-admission.ts';
import { resumePausedLocalWork } from '../../src/orchestration/resume-paused-local-work.ts';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
} from '../../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import {
  createLocalSessionReconciliationVerifier,
  reconcileUnissuedLocalSessionAction,
} from '../../src/orchestration/local-session-reconciliation.ts';
import {
  MastraSessionBridge,
  sessionBridgeDatabasePath,
  sessionBridgeRunId,
} from '../../src/orchestration/mastra-session-bridge.ts';
import {
  MastraSessionLedger,
  openConfiguredMastraSessionLedger,
  mastraLedgerStatus,
} from '../../src/orchestration/persistent-session-handoff.ts';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  createHostOperationReservationStore,
} from '../../src/governance/edictum-boundary.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import * as persistedRows from '../../src/config/host-persisted-row.ts';
import { configuredTestContext } from '../configured-context.ts';

const workspace = 'a'.repeat(64);
const failedFinalHostCaseTimeoutMs = 20_000;
// Keep a stable export snapshot because Bun updates live builtin namespaces when
// a scoped module mock is registered.
const originalFsExports = { ...nodeFs };
const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const identity = {
  repository_id: 'project-repository',
  project_ids: ['project'],
  integrations_digest: 'e'.repeat(64),
  work_id: 'work',
} satisfies WorkIdentity;
type HostStateWrite = Parameters<HostStateStore['compareAndSwapHostState']>[0];
type DeepMutable<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer Item)[]
    ? DeepMutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
      : T;
type MutableHostStateWrite = DeepMutable<HostStateWrite>;
type HostSnapshot = HostStateSnapshot;
type PresentHostSnapshot = HostSnapshot & {
  readonly work: WorkState;
  readonly ledger: CoordinationLedger;
  readonly workVersion: StateVersion;
  readonly ledgerVersion: StateVersion;
};
type TestJournal = DeepMutable<MastraSessionLedgerSnapshot>;
type TestJournalState = TestJournal['state'];
type WorkBinding = WorkState['binding'];
type LifecycleArtifact = WorkState['lifecycle']['references'][number];
let root!: string;
let configuredInstructionRoot!: string;
let databasePath!: string;
let database!: Database;
let store!: HostStateStore;
let preserveHostFixtureRoot: boolean | 'expected UNKNOWN' | 'case failed or timed out' = false;
const handles: Database[] = [];
const admittedHostDatabases = new WeakSet<Database>();
const children: import('node:child_process').ChildProcess[] = [];
const producerRoots: string[] = [];
const failedProducerRoots = new Set<string>();
const clone = <T>(value: T): DeepMutable<T> => structuredClone(value) as DeepMutable<T>;

type GovernanceSqlRow = {
  readonly workspace_id: string;
  readonly store_id: string;
  readonly kind: string;
  readonly record_key: string;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
};
type HostStateSqlRow = {
  readonly workspace_id: string;
  readonly kind: string;
  readonly id: string;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
};
type SessionLedgerSqlRow = {
  readonly workspace_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
};
function readFixtureHostRows(db: Database) {
  return {
    host: db
      .query<HostStateSqlRow, []>(
        'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
      )
      .all(),
    journal: db
      .query<SessionLedgerSqlRow, []>(
        'SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger ORDER BY workspace_id,work_id,attempt',
      )
      .all(),
  };
}
type ScalarCountRow = { readonly count: number | bigint };
function expectTerminalHostResultMutationDenied(
  db: Database,
  host: HostStateStore,
  identity: WorkIdentity,
  work: WorkState,
  message: string,
): void {
  const originalRow = requiredValue(
    db
      .query<HostStateSqlRow, [string, string]>(
        "SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND json_extract(payload,'$.binding.lifecycle_work_id')=?",
      )
      .get(host.workspaceId, identity.work_id),
    'Persisted terminal-history Work',
  );
  expect(originalRow.payload).toBe(canonicalJson(work));
  expect(work.execution.assignment_attempts[0]?.status).toBe('completed');
  const changedResult = { fixture_only: true, operation: 'tampered-readonly-preparation' };
  const changed = {
    ...work,
    execution: {
      ...work.execution,
      assignment_attempts: work.execution.assignment_attempts.map((attempt, index) =>
        index === 0
          ? {
              ...attempt,
              result: changedResult,
              result_digest: canonicalJsonDigest(changedResult),
            }
          : attempt,
      ),
    },
  };
  const changedDigest = canonicalJsonDigest(changed);
  const writeTarget = db.query(
    "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
  );
  expect(
    writeTarget.run(
      canonicalJson(changed),
      changedDigest,
      host.workspaceId,
      originalRow.id,
      originalRow.revision,
      originalRow.digest,
    ).changes,
  ).toBe(1);
  const corruptRows = readFixtureHostRows(db);
  let primaryFailure: { error: unknown } | undefined;
  try {
    expect(() => host.readHostStateSnapshot(identity)).toThrow(message);
    expect(readFixtureHostRows(db)).toEqual(corruptRows);
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          expect(
            writeTarget.run(
              originalRow.payload,
              originalRow.digest,
              host.workspaceId,
              originalRow.id,
              originalRow.revision,
              changedDigest,
            ).changes,
          ).toBe(1);
        },
      ],
      primaryFailure,
    );
  }
  expect(host.readHostStateSnapshot(identity).work).toEqual(work);
}

type GovernanceStoreSqlRow = {
  readonly store_id: string;
  readonly generation: string;
  readonly revision: number;
  readonly digest: string;
};
type SqliteMasterRow = { readonly name: string; readonly sql: string | null };
type SqliteNameRow = { readonly name: string };
type SqliteJournalModeRow = { readonly journal_mode: string };
type SqliteSynchronousRow = { readonly synchronous: number };
type SqliteBusyTimeoutRow = { readonly timeout: number };
type PayloadSqlRow = { readonly payload: string };
type RevisionPayloadDigestSqlRow = {
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
};
type ProducerOperationSqlRow = { readonly revision: number; readonly payload: string };
type MastraWorkflowSnapshotSqlRow = { readonly snapshot: string; readonly parsed: string };
type MaintenanceSqlRow = { readonly revision: number; readonly payload: string; readonly digest: string };
type BridgeOpenArgs = Parameters<typeof MastraSessionBridge.open>[0];
type ProducerInput = Parameters<HostStateStore['beginSessionProducer']>[1];
type HostWorkflowAssignment = Parameters<HostStateStore['claimWorkflowAssignment']>[0];
type ProducerInputBase = Omit<
  ProducerInput,
  'phase' | 'runId' | 'expectedWork' | 'expectedLedger' | 'expectedJournal' | 'maintenanceGeneration'
>;

function commitHostState(request: HostStateWrite): PresentHostSnapshot {
  return commitHostStateOn(store, request);
}

function commitHostStateOn(target: HostStateStore, request: HostStateWrite): PresentHostSnapshot {
  return presentSnapshot(target.compareAndSwapHostState(request));
}

function readPresentSnapshot(target: HostStateStore, workIdentity: WorkIdentity): PresentHostSnapshot {
  return presentSnapshot(target.readHostStateSnapshot(workIdentity));
}

function presentSnapshot(snapshot: HostSnapshot): PresentHostSnapshot {
  const { work, ledger, workVersion, ledgerVersion } = snapshot;
  if (!work || !ledger || !workVersion || !ledgerVersion) throw new Error('expected populated Host snapshot');
  return {
    ...snapshot,
    work,
    ledger,
    workVersion,
    ledgerVersion,
  };
}

function parseJsonRecord(source: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(source);
  if (!isPlainRecord(parsed)) throw new Error('expected JSON object fixture');
  return parsed;
}

function parseMaintenanceRow(source: string): MaintenanceSqlRow {
  const parsed = parseJsonRecord(source);
  if (typeof parsed.revision !== 'number' || typeof parsed.payload !== 'string' || typeof parsed.digest !== 'string')
    throw new Error('expected maintenance row from Bun fixture');
  return { revision: parsed.revision, payload: parsed.payload, digest: parsed.digest };
}

function recordAt(record: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = record[key];
  if (!isPlainRecord(value)) throw new Error(`expected record at ${key}`);
  return value;
}

function arrayAt(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new Error(`expected array at ${key}`);
  return value;
}

function firstOf<T>(values: readonly T[], label: string): T {
  const first = values[0];
  if (first === undefined) throw new Error(`${label} fixture is missing`);
  return first;
}

function atIndex<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw new Error(`${label} fixture entry ${index} is missing`);
  return value;
}

function requiredValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(`${label} fixture is missing`);
  return value;
}

function requiredMigration(work: WorkState): WorkMigrationLineage;
function requiredMigration(work: DeepMutable<WorkState>): DeepMutable<WorkMigrationLineage>;
function requiredMigration(
  work: WorkState | DeepMutable<WorkState>,
): WorkMigrationLineage | DeepMutable<WorkMigrationLineage> {
  const migration = work.migration;
  if (!migration) throw new Error('migration lineage fixture is missing');
  return migration;
}

function firstJournalItem(journal: TestJournal): TestJournal['state']['items'][number];
function firstJournalItem(journal: MastraSessionLedgerSnapshot): MastraSessionLedgerSnapshot['state']['items'][number];
function firstJournalItem(journal: TestJournal | MastraSessionLedgerSnapshot) {
  return firstOf(journal.state.items, 'session journal item');
}

function requiredSessionJournal(
  ledger: MastraSessionLedger,
  workId = 'producer',
  attempt = 1,
): MastraSessionLedgerSnapshot {
  const journal = ledger.resume(workId, attempt);
  if (!journal) throw new Error(`session journal fixture ${workId}/${attempt} is missing`);
  return journal;
}

function firstTicket(ledger: DeepMutable<CoordinationLedger>): DeepMutable<CoordinationTicket>;
function firstTicket(ledger: CoordinationLedger): CoordinationTicket;
function firstTicket(
  ledger: CoordinationLedger | DeepMutable<CoordinationLedger>,
): CoordinationTicket | DeepMutable<CoordinationTicket> {
  return firstOf(ledger.tickets, 'coordination ticket');
}

function firstClaim(ledger: DeepMutable<CoordinationLedger>): DeepMutable<CoordinationClaim>;
function firstClaim(ledger: CoordinationLedger): CoordinationClaim;
function firstClaim(
  ledger: CoordinationLedger | DeepMutable<CoordinationLedger>,
): CoordinationClaim | DeepMutable<CoordinationClaim> {
  return firstOf(ledger.claims, 'coordination claim');
}

function requiredLease(work: WorkState): NonNullable<WorkState['lease']>;
function requiredLease(work: DeepMutable<WorkState>): NonNullable<DeepMutable<WorkState>['lease']>;
function requiredLease(
  work: WorkState | DeepMutable<WorkState>,
): NonNullable<WorkState['lease']> | NonNullable<DeepMutable<WorkState>['lease']> {
  const lease = work.lease;
  if (!lease) throw new Error('fixture lease is missing');
  return lease;
}

function cloneRuntimeConfig(config: ReturnType<typeof loadRuntimeConfig>): ReturnType<typeof loadRuntimeConfig> {
  return structuredClone(config);
}

function requiredRuntimeWorkflow(
  config: ReturnType<typeof loadRuntimeConfig>,
  workflowId: string,
): NonNullable<ReturnType<typeof loadRuntimeConfig>['workflows'][string]> {
  const workflow = config.workflows[workflowId];
  if (!workflow) throw new Error(`runtime fixture workflow ${workflowId} is missing`);
  return workflow;
}

function setFixtureField(target: object, key: PropertyKey, value: unknown): void {
  if (!Reflect.set(target, key, value)) throw new Error(`could not set malformed fixture field ${String(key)}`);
}

function invokeMalformedTrustedHostInput(input: unknown): unknown {
  return Reflect.apply(createTestTrustedHostLauncherCapability, undefined, [input]);
}

type SnapshotMutation = (snapshot: Record<string, unknown>) => void;

function suspendPresent(request: Parameters<typeof suspendLocalWork>[0]): PresentHostSnapshot {
  return presentSnapshot(suspendLocalWork(request));
}

function reserveRequiredOperation(
  target: HostStateStore,
  storeId: string,
  operationKey: string,
  requestDigest: string,
): NonNullable<ReturnType<HostStateStore['reserveOperation']>> {
  const reservation = target.reserveOperation(storeId, operationKey, requestDigest);
  if (!reservation) throw new Error('expected operation reservation fixture');
  return reservation;
}

test('Host state fixture preserves captured root instruction bytes', () => {
  for (const name of ['AGENTS.md', 'AGENT.sidecar.md']) {
    expect(readFileSync(path.join(root, name))).toEqual(readFileSync(path.join(configuredInstructionRoot, name)));
  }
});

test.skipIf(process.platform !== 'linux')(
  'Host upgrade guard observes fresh absence without writes and preserves native CAS denial',
  () => {
    try {
      const access = requireSafeRepositoryAccess(root);
      const target = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
      mkdirSync(path.dirname(target), { recursive: true });
      const entries = nodeFs.readdirSync(path.dirname(target));
      const writes = spyOn(nodeFs, 'writeSync');
      const syncs = spyOn(nodeFs, 'fsyncSync');
      try {
        expect(() => assertProjectUpgradeInactive(access)).not.toThrow();
        expect(activeRuntimeConfigurationSource(access)).toBe('agent-runtime.config.v1.yaml');
        expect(writes).not.toHaveBeenCalled();
        expect(syncs).not.toHaveBeenCalled();
        expect(nodeFs.readdirSync(path.dirname(target))).toEqual(entries);
      } finally {
        writes.mockRestore();
        syncs.mockRestore();
      }
      const bytes = Buffer.from('inert upgrade marker\n');
      writeFileSync(target, bytes);
      expect(() => assertProjectUpgradeInactive(access)).toThrow('Project upgrade is in progress');
      access.withExclusiveLock('.vida/.project-upgrade.v1.json.cas', 'guard native CAS owner', () => {
        const ownerPath = path.join(root, '.vida/.project-upgrade.v1.json.cas.lock');
        const owner = readFileSync(ownerPath);
        expect(() => assertProjectUpgradeInactive(access)).toThrow(/active CAS writer/);
        expect(readFileSync(ownerPath)).toEqual(owner);
        expect(readFileSync(target)).toEqual(bytes);
      });
      nodeFs.unlinkSync(target);
      expect(() => assertProjectUpgradeInactive(access)).not.toThrow();
      access.withExclusiveLock('.vida/.activation.v1.json.cas', 'activation presence CAS owner', () => {
        const ownerPath = path.join(root, '.vida/.activation.v1.json.cas.lock');
        const owner = readFileSync(ownerPath);
        expect(() => activeRuntimeConfigurationSource(access)).toThrow(/active CAS writer/);
        expect(readFileSync(ownerPath)).toEqual(owner);
      });
      let legacyReads = 0;
      const legacy = {
        ...access,
        observeFileExists: undefined,
        fileExists: (file: string, label: string) => {
          legacyReads++;
          return access.fileExists(file, label);
        },
      };
      expect(() => assertProjectUpgradeInactive(legacy)).not.toThrow();
      expect(legacyReads).toBe(1);
    } catch (error) {
      preserveHostFixtureRoot = true;
      throw error;
    }
  },
);

test.each(['error', 'undefined', 'return'] as const)(
  'exclusive Host transaction retains operation and native close failures (%s)',
  async (outcome) => {
    const primary = outcome === 'error' ? new Error('controlled exclusive operation failure') : undefined;
    const input = {
      repositoryRoot: root,
      databaseRelativePath: 'exclusive-transaction.sqlite',
      workspaceId: workspace,
    };
    const target = path.join(root, input.databaseRelativePath);
    const nativeClose: unknown = Reflect.get(Database.prototype, 'close');
    if (typeof nativeClose !== 'function') throw new Error('Native SQLite close method is missing.');
    const closeFailure = new Error('controlled exclusive native close failure');
    let closeCalls = 0;
    let restore = () => {};
    let failure: unknown;
    try {
      failure = await rejectionReason(
        Promise.resolve().then(() =>
          withHostStateExclusiveTransaction(input, () => {
            const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
              this: Database,
              ...args: Parameters<Database['close']>
            ) {
              if (this.filename === target) {
                closeCalls++;
                throw closeFailure;
              }
              Reflect.apply(nativeClose, this, args);
            });
            restore = () => closeSpy.mockRestore();
            if (outcome !== 'return') throw primary;
            return 'observed but unclosed result';
          }),
        ),
      );
    } finally {
      restore();
      retryPendingWorkspaceDatabaseCloses();
    }
    expect(closeCalls).toBe(1);
    expect(failure).toBeInstanceOf(AggregateError);
    if (!(failure instanceof AggregateError)) throw new Error('Exclusive transaction did not aggregate failures.');
    if (outcome === 'return') {
      expect(failure.errors).toEqual([closeFailure]);
    } else {
      expect(failure.errors).toHaveLength(2);
      expect(failure.errors[0]).toBe(primary);
      const cleanup: unknown = failure.errors[1];
      expect(cleanup).toBeInstanceOf(AggregateError);
      if (!(cleanup instanceof AggregateError)) throw new Error('Paired close failure was not retained.');
      expect(cleanup.errors).toEqual([closeFailure]);
    }
    expect(withHostStateExclusiveTransaction(input, () => 'observed result')).toBe('observed result');
  },
);

test('trusted host source entrypoint exposes host state without a test issuer', () => {
  expect(trustedHostSurface.HostStateStore).toBe(HostStateStore);
  expect(trustedHostSurface.openHostStateDatabase).toBe(openHostStateDatabase);
  expect(typeof trustedHostSurface.createTrustedHostComposition).toBe('function');
  expect('createTestTrustedHostLauncherCapability' in trustedHostSurface).toBe(false);
});

test('absent Work exposes no continuation or corrective authority and leaves storage unchanged', () => {
  const before = store.readWorkspaceSnapshot();
  expect(before.work).toEqual([]);
  expect(before.ledger).toBeNull();
  const catalog = database.query('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name');
  const schemaBefore = catalog.all();
  expect(store.readDeliveredWorkContinuation(identity, 1)).toBeNull();
  expect(store.readDeliveredWorkContinuationReceipt(identity, 1)).toBeNull();
  expect(store.readConfiguredFrontierRecoveryView(identity, 1)).toBeNull();
  expect(store.readInitialSourceContinuationReceipt(identity, 1)).toBeNull();
  expect(store.readInitialSourceFrontierCodeRebindReceipt(identity, 1, 'a'.repeat(64))).toBeNull();
  expect(store.readFailedPrewriterRecoveryReceipt(identity, 1)).toBeNull();
  expect(store.readCompletedSourceReportRecoveryReceipt(identity, 1)).toBeNull();
  expect(store.readHistoricalTerminalSynthesisCapture(identity, 1, 'absent-action')).toBeNull();
  expect(
    store.retrieveCorrectiveAuthorization({
      identity,
      attempt: 1,
      journal: { revision: 1, digest: '0'.repeat(64) },
      stageIds: ['develop_task'],
      userInstructionRef: 'fixture:absent-work-read',
    }),
  ).toBeNull();
  expect(store.readWorkspaceSnapshot()).toEqual(before);
  expect(catalog.all()).toEqual(schemaBefore);
});

// Real admission, writer completion and focused verdicts prepare the authorization boundary.
test(
  'Host corrective authorization preserves all three CAS boundaries and only authorizes the failed closure',
  async () => {
    const deadline = performance.now() + failedFinalHostCaseTimeoutMs;
    const f = await createFailedFinalCorrectionFixture();
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      if (performance.now() >= deadline)
        throw new Error('Host failed-final fixture preparation exceeded the case deadline.');
      const prepared = prepareLifecycleForCorrection({
        root: f.root,
        config: f.config,
        store: f.store,
        identity: f.identity,
        journal: f.journal,
        preparationPath: f.preparationPath,
      });
      const before = f.store.readHostStateSnapshot(f.identity);
      const journal = f.store.readWorkSessionJournal(f.identity);
      if (
        !prepared.workVersion ||
        !prepared.ledgerVersion ||
        !before.work?.execution.run_id ||
        !before.work.lease ||
        !journal
      )
        throw new Error('Prepared corrective Host fixture is incomplete.');
      const request = {
        identity: f.identity,
        attempt: 1,
        expectedWork: prepared.workVersion,
        expectedLedger: prepared.ledgerVersion,
        expectedJournal: journal.version,
        stageIds: ['develop_task', 'validate_focused', 'test_task'],
        userInstructionRef: 'fixture:host-corrective-owner',
        config: f.config,
      };
      const lookup = {
        identity: f.identity,
        attempt: request.attempt,
        journal: request.expectedJournal,
        stageIds: request.stageIds,
        userInstructionRef: request.userInstructionRef,
      };
      expect(f.store.retrieveCorrectiveAuthorization(lookup)).toBeNull();
      const denied: readonly [Partial<typeof request>, string][] = [
        [{ userInstructionRef: ' ' }, 'attributable corrective authorization missing'],
        [
          { expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 } },
          'state compare-and-swap conflict',
        ],
        [
          { expectedLedger: { ...request.expectedLedger, revision: request.expectedLedger.revision + 1 } },
          'state compare-and-swap conflict',
        ],
        [
          { expectedJournal: { ...request.expectedJournal, revision: request.expectedJournal.revision + 1 } },
          'corrective journal CAS conflict',
        ],
        [{ stageIds: [] }, 'corrective stage selection differs'],
        [{ stageIds: ['develop_task', 'validate_focused', 'validate_focused'] }, 'corrective stage selection differs'],
        [{ stageIds: ['develop_task', 'validate_focused', 'foreign-stage'] }, 'corrective stage selection differs'],
        [
          {
            config: {
              ...f.config,
              repository: { ...f.config.repository, repository_id: f.config.repository.repository_id + '-foreign' },
            },
          },
          'corrective workflow configuration differs',
        ],
      ];
      const authorityPath = path.join(f.root, '.agent/work', f.identity.work_id, 'correction-1-authorization.json');
      const persistedBefore = readFixtureHostRows(f.database);
      for (const [change, message] of denied) {
        expect(() => f.store.authorizeCorrectiveExecution({ ...request, ...change })).toThrow(message);
        const persisted = readFixtureHostRows(f.database);
        expect(persisted.host).toEqual(persistedBefore.host);
        expect(persisted.journal).toEqual(persistedBefore.journal);
        expect(existsSync(authorityPath)).toBe(false);
      }
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
      const recoveryTable = f.database.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_corrective_recovery'",
      );
      const recoveryRows = () =>
        recoveryTable.get()
          ? f.database.query('SELECT * FROM agent_host_corrective_recovery ORDER BY work_id,attempt,generation').all()
          : null;
      const recoveryBefore = recoveryRows();
      f.database.exec(
        "CREATE TEMP TRIGGER deny_corrective_journal BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT, 'controlled corrective Journal failure'); END",
      );
      let triggerFailure: { error: unknown } | undefined;
      try {
        expect(() => f.store.authorizeCorrectiveExecution(request)).toThrow('controlled corrective Journal failure');
      } catch (error) {
        triggerFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              f.database.exec('DROP TRIGGER deny_corrective_journal');
            },
          ],
          triggerFailure,
        );
      }
      expect(f.database.inTransaction).toBe(false);
      expect(readFixtureHostRows(f.database)).toEqual(persistedBefore);
      expect(recoveryRows()).toEqual(recoveryBefore);
      expect(f.store.retrieveCorrectiveAuthorization(lookup)).toBeNull();
      const artifactBase = authorityPath.slice(0, -'-authorization.json'.length);
      const retainedArtifacts = ['authorization', 'recovery', 'feedback'].map((kind) => {
        const file = artifactBase + '-' + kind + '.json';
        return { file, bytes: readFileSync(file) };
      });
      const proposed = correctiveAssignmentAuthorizationSchema.parse(
        JSON.parse(firstOf(retainedArtifacts, 'retained corrective authorization').bytes.toString('utf8')) as unknown,
      );
      const retainedRecovery = requiredValue(
        retainedArtifacts.find((artifact) => artifact.file.endsWith('-recovery.json')),
        'retained corrective recovery artifact',
      );
      writeFileSync(retainedRecovery.file, Buffer.concat([retainedRecovery.bytes, Buffer.from(' ')]));
      let artifactFailure: { error: unknown } | undefined;
      try {
        expect(() => f.store.authorizeCorrectiveExecution(request)).toThrow('corrective artifact retry differs');
        expect(readFixtureHostRows(f.database)).toEqual(persistedBefore);
        expect(recoveryRows()).toEqual(recoveryBefore);
        expect(f.store.retrieveCorrectiveAuthorization(lookup)).toBeNull();
      } catch (error) {
        artifactFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              writeFileSync(retainedRecovery.file, retainedRecovery.bytes);
              expect(readFileSync(retainedRecovery.file)).toEqual(retainedRecovery.bytes);
            },
          ],
          artifactFailure,
        );
      }
      const issued = f.store.authorizeCorrectiveExecution(request);
      const after = f.store.readHostStateSnapshot(f.identity);
      const corrected = f.store.readWorkSessionJournal(f.identity);
      if (!after.work?.lease || !after.workVersion || !after.ledgerVersion || !corrected)
        throw new Error('Corrective authorization lost its persisted state.');
      expect(after.work.lifecycle.phase).toBe('EXECUTE');
      expect(after.work.lifecycle.assurance.correction_count).toBe(1);
      expect(after.work.lease).toEqual(before.work.lease);
      expect(after.work.execution.assignment_attempts).toEqual(before.work.execution.assignment_attempts);
      expect(corrected.state.corrective_execution).toEqual(issued);
      expect(corrected.state.items).toEqual([]);
      expect(corrected.state.completed).toEqual([]);
      expect(corrected.state.run_id).toBe(issued.engine_run_id);
      expect(issued.engine_run_id).toBe(proposed.engine_run_id);
      for (const artifact of retainedArtifacts) expect(readFileSync(artifact.file)).toEqual(artifact.bytes);
      expect(issued.base_run_id).toBe(before.work.execution.run_id);
      expect(issued.stage_ids).toEqual(request.stageIds);
      const authorityBytes = readFileSync(authorityPath);
      const authority = correctiveAssignmentAuthorizationSchema.parse(
        JSON.parse(authorityBytes.toString('utf8')) as unknown,
      );
      expect(authority.user_instruction_ref).toBe(request.userInstructionRef);
      expect(authority.issued_at).toBe(proposed.issued_at);
      expect(authority.stage_ids).toEqual(request.stageIds);
      expect(authority.allowed_paths).toEqual([...before.work.lifecycle.scope.allowed_paths]);
      expect(authority.failed_action_ids).toEqual(
        [...journal.state.completed.flatMap((wave) => wave.items), ...journal.state.items]
          .filter((item) => item.observation?.status === 'reported_failed')
          .map((item) => item.request.action_id),
      );
      expect(createHash('sha256').update(authorityBytes).digest('hex')).toBe(issued.authorization.sha256);
      expect(f.store.retrieveCorrectiveAuthorization(lookup)).toEqual(issued);
      const authorizedRows = readFixtureHostRows(f.database);
      const authorizedJournal = requiredValue(
        authorizedRows.journal.find((row) => row.work_id === f.identity.work_id && row.attempt === 1),
        'authorized corrective Journal preimage',
      );
      const withoutExecution = parseJsonRecord(authorizedJournal.payload);
      expect(Reflect.deleteProperty(withoutExecution, 'corrective_execution')).toBe(true);
      const probePayload = canonicalJson(withoutExecution),
        probeDigest = canonicalJsonDigest(withoutExecution);
      const replaceJournal = f.database.query(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1 AND revision=? AND digest=?',
      );
      expect(
        replaceJournal.run(
          probePayload,
          probeDigest,
          f.store.workspaceId,
          f.identity.work_id,
          authorizedJournal.revision,
          authorizedJournal.digest,
        ).changes,
      ).toBe(1);
      let probeFailure: { error: unknown } | undefined;
      try {
        expect(
          f.store.retrieveCorrectiveAuthorization({
            ...lookup,
            journal: { revision: authorizedJournal.revision, digest: probeDigest },
          }),
        ).toBeNull();
        expect(readFixtureHostRows(f.database)).toEqual({
          ...authorizedRows,
          journal: authorizedRows.journal.map((row) =>
            row === authorizedJournal ? { ...row, payload: probePayload, digest: probeDigest } : row,
          ),
        });
      } catch (error) {
        probeFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              expect(
                replaceJournal.run(
                  authorizedJournal.payload,
                  authorizedJournal.digest,
                  f.store.workspaceId,
                  f.identity.work_id,
                  authorizedJournal.revision,
                  probeDigest,
                ).changes,
              ).toBe(1);
              expect(readFixtureHostRows(f.database)).toEqual(authorizedRows);
            },
          ],
          probeFailure,
        );
      }
      expect(f.store.retrieveCorrectiveAuthorization(lookup)).toEqual(issued);
      expect(f.database.transaction(() => f.store.retrieveCorrectiveAuthorization(lookup)).deferred()).toEqual(issued);
      expect(corrected.version).not.toEqual(lookup.journal);
      expect(f.store.retrieveCorrectiveAuthorization({ ...lookup, journal: corrected.version })).toBeNull();
      expect(f.store.retrieveCorrectiveAuthorization({ ...lookup, attempt: 2 })).toBeNull();
      expect(
        f.store.retrieveCorrectiveAuthorization({
          ...lookup,
          identity: { ...f.identity, work_id: 'missing-corrective-work' },
        }),
      ).toBeNull();
      expect(() => f.store.retrieveCorrectiveAuthorization({ ...lookup, stageIds: ['foreign-stage'] })).toThrow(
        'corrective authorization stages differ',
      );
      expect(() =>
        f.store.retrieveCorrectiveAuthorization({ ...lookup, userInstructionRef: 'fixture:foreign-owner' }),
      ).toThrow('corrective authorization instruction differs');
      expect(f.store.assertCorrectiveExecution(f.identity, 1, issued)).toBeUndefined();
      expect(f.store.assertCorrectiveExecutionForWork(f.identity.work_id, 1, issued)).toBeUndefined();
      const correctiveProducer = f.ledger.beginSessionProducer({
        ...f.producerInput,
        phase: 'initialize',
        runId: issued.engine_run_id,
      });
      f.store.assertSessionProducerCurrent(correctiveProducer);
      f.store.settleSessionProducer(correctiveProducer, corrected.version);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(corrected);
      const producerOperation = requiredValue(
        f.database
          .query<{ payload: string }, [string, string]>(
            "SELECT payload FROM agent_host_governance WHERE workspace_id=? AND store_id='vida-session-producers' AND kind='operation' AND record_key=?",
          )
          .get(f.store.workspaceId, correctiveProducer.operation.operation_key),
        'settled corrective producer operation',
      );
      expect(parseJsonRecord(producerOperation.payload)).toMatchObject({
        status: 'applied',
        terminal_revision: 3,
        result_digest: canonicalJsonDigest({ engine: null, journal: corrected.version }),
      });
      expect(() =>
        f.store.assertCorrectiveExecution({ ...f.identity, work_id: 'missing-corrective-work' }, 1, issued),
      ).toThrow('corrective execution work unavailable');
      expect(() => f.store.assertCorrectiveExecutionForWork('missing-corrective-work', 1, issued)).toThrow(
        'corrective journal Host owner missing',
      );
      expect(() => f.store.assertCorrectiveExecution(f.identity, 2, issued)).toThrow(
        'corrective authority contract differs',
      );
      expect(() =>
        f.store.assertCorrectiveExecution(f.identity, 1, {
          ...issued,
          engine_run_id: randomUUID(),
        }),
      ).toThrow('corrective authority contract differs');
      expect(() =>
        f.store.claimWorkflowAttempt({
          identity: f.identity,
          expectedWork: after.workVersion!,
          expectedLedger: after.ledgerVersion!,
          expectedMaintenanceGeneration: after.maintenanceGeneration,
          stageId: 'foreign-stage',
          assignmentIndex: 0,
          requestDigest: 'f'.repeat(64),
          lease: after.work!.lease!,
        }),
      ).toThrow('corrective assignment authority binding differs');
      expect(() => f.store.authorizeCorrectiveExecution(request)).toThrow('state compare-and-swap conflict');
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(corrected);
      expect(readFileSync(authorityPath)).toEqual(authorityBytes);
      const archived = requiredValue(
        journal.state.completed.flatMap((wave) => wave.items).find((item) => item.observation !== null),
        'Original completed corrective archive item',
      );
      const archivedIdentity = requiredValue(archived.observation, 'Original complete archive observation');
      expect(f.store.findArchivedReportedObservation(f.identity.work_id, 1, archivedIdentity)).toEqual(archived);
      expect(() =>
        f.store.findArchivedReportedObservation(f.identity.work_id, 1, { ...archivedIdentity, issue_id: randomUUID() }),
      ).toThrow('archived terminal report retry differs');
      expect(
        f.store.findArchivedReportedObservation(f.identity.work_id, 1, {
          ...archivedIdentity,
          action_id: '0'.repeat(64),
        }),
      ).toBeNull();
      expect(f.store.findArchivedReportedObservation(f.identity.work_id, 2, archivedIdentity)).toBeNull();
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(corrected);
      const correctiveRequest = {
        identity: f.identity,
        expectedWork: after.workVersion,
        expectedLedger: after.ledgerVersion,
        expectedMaintenanceGeneration: after.maintenanceGeneration,
        stageId: 'develop_task',
        assignmentIndex: 0,
        requestDigest: canonicalJsonDigest({ fixture: 'corrective-claim', authorization: issued.authorization }),
        lease: after.work.lease,
      };
      const authorizedWorkVersion = after.workVersion;
      const authorizedWork = requiredValue(
        authorizedRows.host.find((row) => row.kind === 'work' && row.digest === authorizedWorkVersion.digest),
        'authorized corrective Work preimage',
      );
      const authorityIndex = after.work.lifecycle.references.findIndex(
        (ref) => ref.path === issued.authorization.path && ref.sha256 === issued.authorization.sha256,
      );
      expect(authorityIndex).toBeGreaterThanOrEqual(0);
      const replaceWork = f.database.query(
        "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND id=? AND revision=? AND digest=?",
      );
      const authorizedRecovery = recoveryRows();
      for (const mode of ['missing-reference', 'different-generation'] as const) {
        const probeAuthorityBytes = Buffer.from(
          canonicalJson({ ...authority, correction_generation: authority.correction_generation + 1 }),
        );
        const probeWork = {
          ...after.work,
          lifecycle: {
            ...after.work.lifecycle,
            references:
              mode === 'missing-reference'
                ? after.work.lifecycle.references.filter((_, index) => index !== authorityIndex)
                : after.work.lifecycle.references.map((ref, index) =>
                    index === authorityIndex
                      ? { ...ref, sha256: createHash('sha256').update(probeAuthorityBytes).digest('hex') }
                      : ref,
                  ),
          },
        };
        const changedPayload = canonicalJson(probeWork),
          changedDigest = canonicalJsonDigest(probeWork);
        expect(
          replaceWork.run(
            changedPayload,
            changedDigest,
            f.store.workspaceId,
            authorizedWork.id,
            authorizedWork.revision,
            authorizedWork.digest,
          ).changes,
        ).toBe(1);
        let authorityFailure: { error: unknown } | undefined;
        try {
          if (mode === 'different-generation') writeFileSync(authorityPath, probeAuthorityBytes);
          expect(() =>
            f.store.claimWorkflowAttempt({
              ...correctiveRequest,
              expectedWork: { revision: authorizedWork.revision, digest: changedDigest },
            }),
          ).toThrow('current corrective assignment authority unavailable');
          expect(readFixtureHostRows(f.database)).toEqual({
            ...authorizedRows,
            host: authorizedRows.host.map((row) =>
              row === authorizedWork ? { ...row, payload: changedPayload, digest: changedDigest } : row,
            ),
          });
          expect(recoveryRows()).toEqual(authorizedRecovery);
          for (const artifact of retainedArtifacts)
            expect(readFileSync(artifact.file)).toEqual(
              mode === 'different-generation' && artifact.file === authorityPath ? probeAuthorityBytes : artifact.bytes,
            );
        } catch (error) {
          authorityFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                if (mode === 'different-generation') writeFileSync(authorityPath, authorityBytes);
              },
              () => {
                expect(
                  replaceWork.run(
                    authorizedWork.payload,
                    authorizedWork.digest,
                    f.store.workspaceId,
                    authorizedWork.id,
                    authorizedWork.revision,
                    changedDigest,
                  ).changes,
                ).toBe(1);
              },
            ],
            authorityFailure,
          );
        }
        expect(readFixtureHostRows(f.database)).toEqual(authorizedRows);
        for (const artifact of retainedArtifacts) expect(readFileSync(artifact.file)).toEqual(artifact.bytes);
      }
      const claimed = f.store.claimWorkflowAttempt(correctiveRequest);
      expect(claimed.attempt.correction_generation).toBe(1);
      expect(claimed.attempt.correction_authorization).toEqual(issued.authorization);
      expect(claimed.attempt.previous_attempt_id).toBe(
        after.work.execution.assignment_attempts.findLast(
          (entry) => entry.stage_id === 'develop_task' && entry.assignment_index === 0,
        )?.attempt_id ?? null,
      );
      const result = { summary: 'Host unit corrective result in the approved generation.' };
      f.store.completeWorkflowAttempt(claimed, result);
      const terminal = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
      expect(terminal.work.execution.assignment_attempts).toEqual([
        ...after.work.execution.assignment_attempts,
        { ...claimed.attempt, status: 'completed', result, result_digest: canonicalJsonDigest(result) },
      ]);
      expect(
        f.store.claimWorkflowAttempt({
          ...correctiveRequest,
          expectedWork: terminal.workVersion,
          expectedLedger: terminal.ledgerVersion,
        }).attempt,
      ).toEqual(terminal.work.execution.assignment_attempts.at(-1)!);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(terminal);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(corrected);
      expect(readFileSync(authorityPath)).toEqual(authorityBytes);
      const producerRows = f.database.query<{ record_key: string; payload: string }, [string]>(
        "SELECT record_key,payload FROM agent_host_governance WHERE workspace_id=? AND store_id='vida-session-producers' AND kind='operation' ORDER BY record_key",
      );
      const producerKeysBefore = new Set(producerRows.all(f.store.workspaceId).map((row) => row.record_key));
      let correctiveBridge: MastraSessionBridge | undefined;
      await withInitialSourceCleanup(
        async () => {
          correctiveBridge = await MastraSessionBridge.open({
            ...f.producerInput,
            repositoryRoot: f.root,
            config: f.config,
            workspaceId: f.store.workspaceId,
            ledger: f.ledger,
            correctiveExecution: issued,
          });
          const started = await correctiveBridge.start(corrected.state.source_scope);
          const startedJournal = requiredValue(
            f.store.readWorkSessionJournal(f.identity),
            'prepared corrective producer Journal',
          );
          expect(started.run_id).toBe(issued.engine_run_id);
          expect(started.status).toBe('suspended');
          expect(startedJournal.state.corrective_execution).toEqual(issued);
          expect(startedJournal.state.run_id).toBe(issued.engine_run_id);
          expect(startedJournal.state.step_id).toBe(started.step_id);
          expect(startedJournal.state.completed).toEqual([]);
          expect(startedJournal.state.items.map((item) => item.request)).toEqual([...started.requests]);
          expect(startedJournal.state.items.length).toBeGreaterThan(0);
          for (const item of startedJournal.state.items) {
            expect(item.issue_id).toBeNull();
            expect(item.observation).toBeNull();
            expect(item.request.run_id).toBe(issued.engine_run_id);
            expect(issued.stage_ids).toContain(item.request.stage_id);
          }
          expect(f.store.readHostStateSnapshot(f.identity).work?.execution.assignment_attempts).toEqual(
            terminal.work.execution.assignment_attempts,
          );
          expect(readFileSync(authorityPath)).toEqual(authorityBytes);
          const operations = producerRows
            .all(f.store.workspaceId)
            .filter((row) => !producerKeysBefore.has(row.record_key))
            .map((row) => parseJsonRecord(row.payload));
          expect(operations).toHaveLength(2);
          for (const operation of operations)
            expect(operation).toMatchObject({ status: 'applied', terminal_revision: 3 });
          const expectedStartDigest = canonicalJsonDigest({ engine: started, journal: startedJournal.version });
          expect(operations.filter((operation) => operation.result_digest === expectedStartDigest)).toHaveLength(1);
        },
        async () => {
          if (correctiveBridge) await correctiveBridge.close();
        },
        'Corrective producer engine preparation',
      );
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            f.close(() => completed && performance.now() < deadline);
          },
        ],
        primaryFailure,
      );
    }
  },
  failedFinalHostCaseTimeoutMs,
);

// Reuse the admitted writer and focused reports; reviewer observations remain synthetic unit inputs.
test(
  'Host final assurance binds issued pairs and exact delivery evidence without changing the Journal',
  async () => {
    const deadline = performance.now() + failedFinalHostCaseTimeoutMs;
    const f = await createFailedFinalCorrectionFixture('passing');
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      if (performance.now() >= deadline) throw new Error('Host assurance fixture exceeded the case deadline.');
      const journal = requiredValue(f.store.readWorkSessionJournal(f.identity), 'Completed assurance Journal');
      expect(f.store.readFinalAssurance(f.identity, 1)).toBeNull();
      let assurance = prepareFinalAssurance({
        root: f.root,
        config: f.config,
        store: f.store,
        identity: f.identity,
        journal: { ...journal, resume_status: mastraLedgerStatus(journal.state) },
        preparationPath: f.preparationPath,
      });
      const before = readPresentSnapshot(f.store, f.identity),
        packet = assurance.state.packet,
        save = (next: typeof assurance.state, expected = assurance.version) =>
          f.store.compareAndSwapFinalAssurance({
            identity: f.identity,
            attempt: 1,
            expected,
            expectedWork: before.workVersion,
            expectedLedger: before.ledgerVersion,
            next,
          });
      expect(before.work.lifecycle.phase).toBe('VERIFY');
      expect(assurance.state.actions).toHaveLength(6);
      expect(finalAssuranceStatus(assurance.state)).toBe('ready');
      expect(f.store.readFinalAssurance(f.identity, 1)).toEqual(assurance);
      expect(f.store.readFinalAssurance(f.identity, 2)).toBeNull();
      const issued = issueFinalAssuranceWave(assurance.state);
      expect(() => save(issued, { ...assurance.version, revision: assurance.version.revision + 1 })).toThrow(
        'state compare-and-swap conflict',
      );
      expect(() =>
        save(
          issueFinalAssuranceWave(
            createFinalAssuranceState({
              ...packet,
              scope_id: 'fixture:foreign-assurance-scope',
            }),
          ),
        ),
      ).toThrow('final assurance has stale or foreign lifecycle binding');
      expect(f.store.readFinalAssurance(f.identity, 1)).toEqual(assurance);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
      const changedBytesRefusal = (relative: string, operation: () => unknown, message: string) => {
        const file = path.join(f.root, relative),
          bytes = readFileSync(file);
        let bodyFailure: { error: unknown } | undefined;
        try {
          writeFileSync(file, Buffer.concat([bytes, Buffer.from('\n')]));
          expect(operation).toThrow(message);
          expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
          expect(f.store.readFinalAssurance(f.identity, 1)).toEqual(assurance);
          expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
        } catch (error) {
          bodyFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                writeFileSync(file, bytes);
                return undefined;
              },
            ],
            bodyFailure,
          );
        }
        expect(readFileSync(file)).toEqual(bytes);
      };
      changedBytesRefusal(
        requiredValue(before.work.lifecycle.scope.allowed_paths[0], 'Admitted Source path'),
        () => save(issued),
        'source changed; normal correction and new assurance required',
      );
      changedBytesRefusal(
        requiredValue(
          before.work.lifecycle.references.find(
            (ref) =>
              ref.kind === 'review_packet' && ref.disposition === 'current' && ref.record_id === packet.packet_id,
          ),
          'Current packet reference',
        ).path,
        () => save(issued),
        'current review packet bytes changed',
      );
      assurance = save(issued);
      expect(finalAssuranceStatus(assurance.state)).toBe('issued_outcome_uncertain');
      const checks = {
        scope_and_trace: 'pass',
        tests_security_rollback: 'pass',
        evidence_invalidation_binding: 'pass',
      } as const;
      for (const kind of ['review', 'reverse'] as const) {
        if (kind === 'reverse') assurance = save(issueFinalAssuranceWave(assurance.state));
        for (const action of assurance.state.actions.filter((entry) => entry.kind === kind)) {
          const review = assurance.state.actions.find(
            (entry) => entry.kind === 'review' && entry.perspective === action.perspective,
          );
          const binding = {
            work_id: packet.work_id,
            attempt: packet.attempt,
            packet_id: packet.packet_id,
            action_id: action.action_id,
            issue_id: requiredValue(action.issue_id, 'Issued assurance action'),
            generation: packet.generation,
            implementation_fingerprint: packet.implementation_fingerprint,
            scope_id: packet.scope_id,
            agent_id: `fixture:synthetic-host-reviewer-${action.perspective}`,
            history_id: `fixture:synthetic-host-review-history-${action.perspective}`,
            tool_call_ref: `fixture:synthetic-host-${kind}-${action.perspective}`,
            verdict: 'pass' as const,
            evidence_refs: [`local://fixture/synthetic-host-${kind}-${action.perspective}`],
            checks,
          };
          const report: FinalAssuranceReport =
            kind === 'review'
              ? { ...binding, schema: 'FinalAssuranceReview/v1', perspective: action.perspective, findings: [] }
              : {
                  ...binding,
                  schema: 'FinalAssuranceReverse/v1',
                  review_action_id: requiredValue(review, 'Matching review').action_id,
                  review_issue_id: requiredValue(review?.issue_id, 'Matching issued review'),
                };
          const next = reportFinalAssurance(assurance.state, report),
            priorVersion = assurance.version;
          assurance = save(next);
          expect(f.store.readFinalAssurance(f.identity, 1)).toEqual(assurance);
          expect(reportFinalAssurance(assurance.state, report)).toBe(assurance.state);
          expect(() => save(next, priorVersion)).toThrow('state compare-and-swap conflict');
          expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
          expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
        }
      }
      expect(finalAssuranceStatus(assurance.state)).toBe('reviewed');
      const manifestPath = `.agent/work/${f.identity.work_id}/delivery.json`;
      writeFileSync(
        path.join(f.root, manifestPath),
        JSON.stringify({
          schema: 'FinalAssuranceDelivery/v1',
          work_id: f.identity.work_id,
          implementation_fingerprint: packet.implementation_fingerprint,
          destination: 'fixture:synthetic-host-delivery-only',
          order: ['AGENT.sidecar.md'],
          post_deployment_checks: ['Fixture inspection only; no Runtime acceptance'],
        }),
      );
      const references = finalAssuranceReceiptReferences(f.root, before.work, assurance.state);
      expect(references).toHaveLength(8);
      const request = {
        identity: f.identity,
        attempt: 1,
        expected: assurance.version,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        references,
        documentationContext: {
          repository_root: f.root,
          repository_id: before.work.binding.repository_id,
          project_id: requiredValue(before.work.binding.project_ids[0], 'Assurance project'),
          work_id: f.identity.work_id,
        },
      };
      const denied: readonly [Partial<typeof request>, string][] = [
        [
          { expectedWork: { ...before.workVersion, revision: before.workVersion.revision + 1 } },
          'state compare-and-swap conflict',
        ],
        [
          { expectedLedger: { ...before.ledgerVersion, revision: before.ledgerVersion.revision + 1 } },
          'state compare-and-swap conflict',
        ],
        [
          { expected: { ...assurance.version, revision: assurance.version.revision + 1 } },
          'state compare-and-swap conflict',
        ],
        [{ references: references.slice(1) }, 'six reports, CLEAR and delivery manifest required'],
        [
          {
            references: references.map((ref, index) =>
              index === 0 ? { ...ref, principal: 'fixture:foreign-reviewer' } : ref,
            ),
          },
          'review reference differs from issued report',
        ],
        [
          { references: references.map((ref, index) => (index === 0 ? { ...ref, sha256: '0'.repeat(64) } : ref)) },
          'report bytes differ from accepted observation',
        ],
        [
          { references: references.map((ref, index) => (index === 7 ? { ...ref, sha256: '0'.repeat(64) } : ref)) },
          'assurance reference bytes changed',
        ],
      ];
      for (const [change, message] of denied) {
        expect(() => f.store.commitFinalAssuranceDelivery({ ...request, ...change })).toThrow(message);
        expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
        expect(f.store.readFinalAssurance(f.identity, 1)).toEqual(assurance);
        expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
      }
      changedBytesRefusal(
        requiredValue(references[0], 'Bound review reference').path,
        () => f.store.commitFinalAssuranceDelivery(request),
        'report bytes differ from accepted observation',
      );
      changedBytesRefusal(
        manifestPath,
        () => f.store.commitFinalAssuranceDelivery(request),
        'assurance reference bytes changed',
      );
      const delivered = presentSnapshot(f.store.commitFinalAssuranceDelivery(request));
      expect(delivered.work.lifecycle.phase).toBe('DELIVERY');
      expect(delivered.work.lifecycle.references.slice(-8)).toEqual(references);
      expect(delivered.work.execution).toEqual(before.work.execution);
      expect(delivered.work.lease).toEqual(before.work.lease);
      expect(delivered.workVersion).not.toEqual(before.workVersion);
      expect(f.store.readFinalAssurance(f.identity, 1)).toEqual(assurance);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
      expect(() => f.store.commitFinalAssuranceDelivery(request)).toThrow('state compare-and-swap conflict');
      expect(() =>
        f.store.compareAndSwapFinalAssurance({
          ...request,
          expectedWork: delivered.workVersion,
          expectedLedger: delivered.ledgerVersion,
          next: assurance.state,
        }),
      ).toThrow('final assurance cannot progress after delivery');
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(delivered);
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            f.close(() => completed && performance.now() < deadline);
            return undefined;
          },
        ],
        primaryFailure,
      );
    }
  },
  failedFinalHostCaseTimeoutMs,
);

test(
  'native focused runtime rebind preserves correction history through CAS denial, rollback and restart',
  async () => {
    const deadline = performance.now() + failedFinalHostCaseTimeoutMs;
    const f = await createFailedFinalCorrectionFixture();
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      if (performance.now() >= deadline) throw new Error('Native rebind fixture setup exhausted its deadline');
      prepareLifecycleForCorrection({
        root: f.root,
        config: f.config,
        store: f.store,
        identity: f.identity,
        journal: f.journal,
        preparationPath: f.preparationPath,
      });
      const before = f.store.readHostStateSnapshot(f.identity);
      const journal = f.store.readWorkSessionJournal(f.identity);
      if (
        !before.work?.lease ||
        !before.work.execution.run_id ||
        !before.workVersion ||
        !before.ledgerVersion ||
        !journal
      )
        throw new Error('Native rebind fixture is incomplete');
      expect(before.work.lifecycle.phase).toBe('VERIFY');
      expect(before.work.execution.assignment_attempts.length).toBeGreaterThan(0);
      expect(
        before.work.execution.assignment_attempts.every((entry) => ['completed', 'no_effect'].includes(entry.status)),
      ).toBe(true);
      expect(
        before.work.lifecycle.references.find(
          (ref) =>
            ref.kind === 'execution_approval' &&
            ref.disposition === 'current' &&
            ref.decision === 'approved' &&
            ref.generation === null &&
            ref.implementation_fingerprint === null,
        ),
      ).toBeDefined();
      const failed = [...journal.state.items, ...journal.state.completed.flatMap((wave) => wave.items)].find(
        (item) => item.observation?.status === 'reported_failed',
      );
      if (!failed?.issue_id) throw new Error('Native rebind needs its actual failed Journal issue');
      const principal = 'fixture:host-runtime-rebind';
      let rejectAuthorization = false;
      // Controlled qualification seam only; this does not attest installed runtime code.
      const verifier: RuntimeCodeRebindVerifier = {
        principal,
        verify: (request) => ({
          schema: 'VidaRuntimeCodeRebindAuthorization/v1',
          request_digest: canonicalJsonDigest(request),
          principal: rejectAuthorization ? 'fixture:foreign-rebind' : principal,
          forward_operation_id: request.forwardOperationId,
          parent_manifest_digest: request.parentManifestDigest,
          successor_manifest_digest: request.successorManifestDigest,
          owner_correction_pointer: request.focusedFailureCorrection!.ownerCorrectionPointer,
        }),
      };
      const checked = new HostStateStore(
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
        identity: f.identity,
        attempt: 1,
        actionId: failed.request.action_id,
        issueId: failed.issue_id,
        nativeSessionHandle: before.work.lease.thread_id,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        oldRuntimeCodeDigest: before.work.binding.runtime_code_digest,
        newRuntimeCodeDigest: canonicalJsonDigest('fixture:host-runtime-successor'),
        forwardOperationId: 'fixture-host-runtime-forward',
        parentManifestDigest: canonicalJsonDigest('fixture:host-runtime-parent-manifest'),
        successorManifestDigest: canonicalJsonDigest('fixture:host-runtime-successor-manifest'),
        focusedFailureCorrection: { ownerCorrectionPointer: 'fixture:host-correct-known-failure' },
      };
      const rowsBefore = readFixtureHostRows(f.database);
      const receiptTable = f.database.query<SqliteNameRow, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_runtime_code_rebind'",
      );
      expect(receiptTable.get()).toBeNull();
      const denied: readonly [Partial<RuntimeCodeRebindRequest>, string][] = [
        [
          { expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 } },
          'state compare-and-swap conflict',
        ],
        [
          { expectedLedger: { ...request.expectedLedger, revision: request.expectedLedger.revision + 1 } },
          'state compare-and-swap conflict',
        ],
        [
          { expectedJournal: { ...request.expectedJournal, revision: request.expectedJournal.revision + 1 } },
          'runtime-code rebind journal CAS changed',
        ],
        [
          { expectedMaintenanceGeneration: before.maintenanceGeneration + 1 },
          'maintenance generation is stale or missing',
        ],
        [
          { nativeSessionHandle: request.nativeSessionHandle + '-foreign' },
          'runtime-code rebind owner or assurance state changed',
        ],
        [{ issueId: randomUUID() }, 'VERIFY rebind requires exact accepted negative report'],
      ];
      for (const [change, message] of denied) {
        const failure = await rejectionReason(checked.rebindRuntimeCode({ ...request, ...change }));
        expect(() => {
          throw failure;
        }).toThrow(message);
        expect(readFixtureHostRows(f.database)).toEqual(rowsBefore);
        expect(receiptTable.get()).toBeNull();
      }
      rejectAuthorization = true;
      const deniedAuthorization = await rejectionReason(checked.rebindRuntimeCode(request));
      expect(() => {
        throw deniedAuthorization;
      }).toThrow('runtime-code rebind authorization differs from transition');
      expect(readFixtureHostRows(f.database)).toEqual(rowsBefore);
      rejectAuthorization = false;
      f.database.exec(
        "CREATE TRIGGER reject_host_runtime_rebind AFTER UPDATE ON agent_host_state WHEN NEW.kind='work' BEGIN SELECT RAISE(ABORT,'fixture runtime rebind rollback'); END",
      );
      const rolledBack = await rejectionReason(checked.rebindRuntimeCode(request));
      expect(() => {
        throw rolledBack;
      }).toThrow('fixture runtime rebind rollback');
      expect(readFixtureHostRows(f.database)).toEqual(rowsBefore);
      expect(checked.readHostStateSnapshot(f.identity)).toEqual(before);
      expect(receiptTable.get()).toBeNull();
      f.database.exec('DROP TRIGGER reject_host_runtime_rebind');
      if (performance.now() >= deadline) throw new Error('Native rebind denials exhausted the case deadline');
      const after = await checked.rebindRuntimeCode(request);
      if (!after.work) throw new Error('Native rebind lost its Work');
      expect(after.work.binding).toEqual({
        ...before.work.binding,
        runtime_code_digest: request.newRuntimeCodeDigest,
        runtime_source_revision: request.newRuntimeCodeDigest,
      });
      expect(after.work.execution.assignment_attempts).toEqual(before.work.execution.assignment_attempts);
      expect(after.work.lease).toEqual(before.work.lease);
      expect(after.ledger).toEqual(before.ledger);
      expect(after.ledgerVersion).toEqual(before.ledgerVersion);
      expect(after.work.lifecycle.phase).toBe('VERIFY');
      expect(after.work.lifecycle.seal).toEqual(before.work.lifecycle.seal);
      expect(after.work.lifecycle.assurance).toEqual(before.work.lifecycle.assurance);
      const implementation = before.work.lifecycle.references.find(
        (ref) => ref.kind === 'implementation_result' && ref.disposition === 'current',
      );
      if (!implementation) throw new Error('Native rebind lost its source implementation evidence');
      expect(after.work.lifecycle.references).toContainEqual(implementation);
      expect(checked.readFinalAssurance(f.identity, 1)).toBeNull();
      expect(() => checked.projectLifecycleTransition(after.work!, 'DELIVERY', 'fixture:premature-delivery')).toThrow(
        'delivery requires three reviews',
      );
      expect(checked.readWorkSessionJournal(f.identity)).toEqual(journal);
      const receiptQuery = f.database.query<{ payload: string; digest: string }, [string, string, number, string]>(
        'SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      );
      const row = receiptQuery.get(f.store.workspaceId, f.identity.work_id, 1, request.actionId);
      if (!row) throw new Error('Native rebind receipt is missing');
      const receipt = parseJsonRecord(row.payload);
      expect(canonicalJsonDigest(receipt)).toBe(row.digest);
      expect(receipt).toMatchObject({
        request,
        retired_execution_approval_ids: [],
        prior_work_version: before.workVersion,
        journal_version: journal.version,
        binding_history: {
          original_work: before.work,
          original_journal: journal.state,
          successor_binding: after.work.binding,
          terminal_attempt_ids: before.work.execution.assignment_attempts.map((entry) => entry.attempt_id),
        },
      });
      const reopened = new HostStateStore(
        f.database,
        f.store.workspaceId,
        undefined,
        undefined,
        undefined,
        undefined,
        f.root,
        verifier,
      );
      expect(reopened.readHostStateSnapshot(f.identity)).toEqual(after);
      expect(reopened.readWorkSessionJournal(f.identity)).toEqual(journal);
      const rowsBeforeOmission = readFixtureHostRows(f.database);
      const withoutBindingHistory = { ...receipt };
      expect(Reflect.deleteProperty(withoutBindingHistory, 'binding_history')).toBe(true);
      expect(Object.hasOwn(withoutBindingHistory, 'binding_history')).toBe(false);
      const omittedPayload = canonicalJson(withoutBindingHistory);
      const omittedDigest = canonicalJsonDigest(withoutBindingHistory);
      const replaceReceipt = f.database.query(
        'UPDATE agent_host_runtime_code_rebind SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=? AND payload=? AND digest=?',
      );
      expect(
        replaceReceipt.run(
          omittedPayload,
          omittedDigest,
          f.store.workspaceId,
          f.identity.work_id,
          1,
          request.actionId,
          row.payload,
          row.digest,
        ).changes,
      ).toBe(1);
      let omissionFailure: { error: unknown } | undefined;
      try {
        expect(() => reopened.readHostStateSnapshot(f.identity)).toThrow('attempt assignment binding invalid');
        expect(readFixtureHostRows(f.database)).toEqual(rowsBeforeOmission);
        expect(f.database.inTransaction).toBe(false);
      } catch (error) {
        omissionFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              expect(
                replaceReceipt.run(
                  row.payload,
                  row.digest,
                  f.store.workspaceId,
                  f.identity.work_id,
                  1,
                  request.actionId,
                  omittedPayload,
                  omittedDigest,
                ).changes,
              ).toBe(1);
              expect(receiptQuery.get(f.store.workspaceId, f.identity.work_id, 1, request.actionId)).toEqual(row);
            },
          ],
          omissionFailure,
        );
      }
      expect(readFixtureHostRows(f.database)).toEqual(rowsBeforeOmission);
      const staleRetry = await rejectionReason(checked.rebindRuntimeCode(request));
      expect(() => {
        throw staleRetry;
      }).toThrow('state compare-and-swap conflict');
      expect(reopened.readHostStateSnapshot(f.identity)).toEqual(after);
      if (!after.workVersion || !after.ledgerVersion) throw new Error('Rebound Host versions are missing');
      const correctionRequest = {
        identity: f.identity,
        attempt: 1,
        expectedWork: after.workVersion,
        expectedLedger: after.ledgerVersion,
        expectedJournal: journal.version,
        stageIds: ['develop_task', 'validate_focused', 'test_task'],
        userInstructionRef: 'fixture:explicit-post-rebind-correction',
        config: f.config,
      };
      const reboundRows = readFixtureHostRows(f.database);
      expect(() => reopened.authorizeCorrectiveExecution({ ...correctionRequest, userInstructionRef: ' ' })).toThrow(
        'attributable corrective authorization missing',
      );
      expect(() => reopened.authorizeCorrectiveExecution({ ...correctionRequest, stageIds: ['develop_task'] })).toThrow(
        'corrective stage selection differs',
      );
      expect(readFixtureHostRows(f.database)).toEqual(reboundRows);
      const issued = reopened.authorizeCorrectiveExecution(correctionRequest);
      const corrected = reopened.readHostStateSnapshot(f.identity);
      const correctedJournal = reopened.readWorkSessionJournal(f.identity);
      if (!corrected.work || !correctedJournal) throw new Error('Explicit rebind correction lost its state');
      expect(corrected.work.lifecycle.phase).toBe('EXECUTE');
      expect(corrected.work.lifecycle.seal).toBeNull();
      expect(corrected.work.lifecycle.assurance.correction_count).toBe(
        before.work.lifecycle.assurance.correction_count + 1,
      );
      expect(corrected.work.lifecycle.assurance.review_generation).toBe(
        before.work.lifecycle.assurance.review_generation + 1,
      );
      expect(corrected.work.binding).toEqual(after.work.binding);
      expect(corrected.work.lease).toEqual(before.work.lease);
      expect(corrected.work.execution.assignment_attempts).toEqual(before.work.execution.assignment_attempts);
      expect(corrected.work.lifecycle.references).toContainEqual({ ...implementation, disposition: 'retired' });
      expect(correctedJournal.state.corrective_execution).toEqual(issued);
      expect(correctedJournal.state.run_id).toBe(issued.engine_run_id);
      expect(issued.correction_generation).toBe(before.work.lifecycle.assurance.correction_count + 1);
      expect(issued.base_run_id).toBe(before.work.execution.run_id);
      expect(issued.stage_ids).toEqual(correctionRequest.stageIds);
      expect(reopened.assertCorrectiveExecution(f.identity, 1, issued)).toBeUndefined();
      const recovery = parseJsonRecord(
        readFileSync(
          path.join(
            f.root,
            '.agent/work',
            f.identity.work_id,
            `correction-${issued.correction_generation}-recovery.json`,
          ),
          'utf8',
        ),
      );
      expect(recovery.original_journal).toEqual({ version: journal.version, state: journal.state });
      expect(recovery.original_work).toEqual(after.work);
      expect(() => reopened.authorizeCorrectiveExecution(correctionRequest)).toThrow('state compare-and-swap conflict');
      expect(reopened.readHostStateSnapshot(f.identity)).toEqual(corrected);
      expect(reopened.readWorkSessionJournal(f.identity)).toEqual(correctedJournal);
      if (performance.now() >= deadline) throw new Error('Native rebind body exhausted its deadline');
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            f.close(() => completed && performance.now() < deadline);
          },
        ],
        primaryFailure,
      );
    }
  },
  failedFinalHostCaseTimeoutMs,
);

test('Host artifact mutation preserves primary and rollback failures with native transaction custody', async () => {
  const f = createAutomaticWorkAdmissionFixture(false, true);
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const admission = f.prepare('host-guarded-mutation', 'fixture:guarded-owner');
    const admitted = f.admit(admission);
    if (!admitted.host.work) throw new Error('Guarded mutation fixture has no admitted Work');
    const binding = admitted.host.work.binding;
    const identity: WorkIdentity = {
      repository_id: binding.repository_id,
      project_ids: binding.project_ids,
      integrations_digest: binding.integrations_digest,
      work_id: admission.context.work_id,
    };
    const before = presentSnapshot(f.store.readHostStateSnapshot(identity));
    const journal = f.store.readWorkSessionJournal(identity);
    if (!journal) throw new Error('Guarded mutation fixture has no current Journal');
    const guard = {
      repositoryRoot: f.root,
      identity,
      attempt: 1,
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedJournal: journal.version,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
    };
    const artifact = path.join(f.root, '.agent/work', identity.work_id, 'guarded-artifact.json');
    writeFileSync(artifact, 'before');
    f.database.exec('CREATE TABLE fixture_guarded_mutation (value TEXT NOT NULL)');
    const values = () => f.database.query<{ value: string }, []>('SELECT value FROM fixture_guarded_mutation').all();
    const rows = readFixtureHostRows(f.database);
    let entered = 0;
    let restored = 0;
    for (const key of ['expectedWork', 'expectedLedger', 'expectedJournal'] as const) {
      const denied = await rejectionReason(
        f.store.withHistoricalNormalizationMutation({
          ...guard,
          [key]: { ...guard[key], revision: guard[key].revision + 1 },
          action: () => {
            entered += 1;
          },
          rollback: () => {
            restored += 1;
          },
        }),
      );
      expect(() => {
        throw denied;
      }).toThrow(
        key === 'expectedJournal' ? 'historical normalization Journal CAS conflict' : 'state compare-and-swap conflict',
      );
      expect(readFixtureHostRows(f.database)).toEqual(rows);
    }
    expect(entered).toBe(0);
    expect(restored).toBe(0);
    const published = await f.store.withHistoricalNormalizationMutation({
      ...guard,
      action: async () => {
        expect(() => f.store.recordAdmissionAttempt('guarded-reentrant-writer', 1, {})).toThrow();
        f.database.query('INSERT INTO fixture_guarded_mutation VALUES (?)').run('committed');
        writeFileSync(artifact, 'published');
        return { value: readFileSync(artifact, 'utf8') };
      },
      rollback: () => {
        restored += 1;
      },
    });
    expect(published).toEqual({ value: 'published' });
    expect(values()).toEqual([{ value: 'committed' }]);
    expect(
      f.database
        .query<{ count: number }, [string]>(
          'SELECT COUNT(*) AS count FROM agent_host_admission_attempt WHERE work_id=?',
        )
        .get('guarded-reentrant-writer')?.count,
    ).toBe(0);
    expect(restored).toBe(0);
    const primary = new Error('fixture guarded body failure');
    const rollback = new Error('fixture guarded restoration failure');
    const failures = [
      { primary, rollback: undefined },
      { primary, rollback: { error: rollback } },
      { primary: undefined, rollback: { error: undefined } },
    ];
    for (const mode of ['historical', 'working'] as const)
      for (const failure of failures) {
        const action = () => {
          writeFileSync(artifact, 'unverified');
          f.database.query('INSERT INTO fixture_guarded_mutation VALUES (?)').run('rolled-back');
          throw failure.primary;
        };
        const restore = () => {
          restored += 1;
          writeFileSync(artifact, 'published');
          if (failure.rollback) throw failure.rollback.error;
        };
        const reason = await rejectionReason(
          Promise.resolve().then(() =>
            mode === 'historical'
              ? f.store.withHistoricalNormalizationMutation({ ...guard, action, rollback: restore })
              : f.store.withWorkingMutation(f.root, guard.expectedMaintenanceGeneration, action, restore),
          ),
        );
        if (failure.rollback) {
          expect(reason).toBeInstanceOf(AggregateError);
          if (!(reason instanceof AggregateError))
            throw new Error('Both guarded mutation failures must remain inspectable');
          expect(reason.errors).toEqual([failure.primary, failure.rollback.error]);
          expect(Object.hasOwn(reason, 'cause')).toBe(true);
          expect(reason.cause).toBe(failure.primary);
        } else expect(reason).toBe(failure.primary);
        expect(values()).toEqual([{ value: 'committed' }]);
        expect(readFileSync(artifact, 'utf8')).toBe('published');
        expect(f.database.inTransaction).toBe(false);
        expect(readFixtureHostRows(f.database)).toEqual(rows);
        expect(
          await (mode === 'historical'
            ? f.store.withHistoricalNormalizationMutation({
                ...guard,
                action: () => 'ready',
                rollback: () => undefined,
              })
            : f.store.withWorkingMutation(
                f.root,
                guard.expectedMaintenanceGeneration,
                () => 'ready',
                () => undefined,
              )),
        ).toBe('ready');
      }
    expect(restored).toBe(6);
    const sqlRollback = new Error('fixture SQL rollback failure');
    const nativeExec = f.database.exec.bind(f.database);
    const exec = spyOn(f.database, 'exec').mockImplementation((sql) => {
      if (sql === 'ROLLBACK') throw sqlRollback;
      return nativeExec(sql);
    });
    try {
      const reason = await rejectionReason(
        f.store.withHistoricalNormalizationMutation({
          ...guard,
          action: () => {
            throw primary;
          },
          rollback: () => {
            throw rollback;
          },
        }),
      );
      expect(reason).toBeInstanceOf(AggregateError);
      if (!(reason instanceof AggregateError)) throw new Error('All guarded mutation failures must remain inspectable');
      expect(reason.errors).toEqual([primary, rollback, sqlRollback]);
      expect(reason.cause).toBe(primary);
      expect(f.database.inTransaction).toBe(true);
    } finally {
      exec.mockRestore();
      if (f.database.inTransaction) f.database.exec('ROLLBACK');
    }
    expect(f.database.inTransaction).toBe(false);
    expect(readFixtureHostRows(f.database)).toEqual(rows);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(identity)).toEqual(journal);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close({ retainRoot: !completed });
        },
      ],
      primaryFailure,
    );
  }
});

test('Host unprepared release rolls back both rows and retries the retained request without new rights', () => {
  const f = createAutomaticWorkAdmissionFixture(false, true);
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const peerInput = f.prepare('unprepared-disjoint-peer', 'fixture:unprepared-peer', 'fixture:peer-session');
    const peer = presentSnapshot(f.admit(peerInput).host);
    const peerIdentity: WorkIdentity = {
      repository_id: peer.work.binding.repository_id,
      project_ids: peer.work.binding.project_ids,
      integrations_digest: peer.work.binding.integrations_digest,
      work_id: peerInput.context.work_id,
    };
    const peerTicket = requiredValue(
      peer.ledger.tickets.find((item) => item.ticket_id === peer.work.lease?.ticket_id),
      'Earlier unprepared disjoint peer ticket',
    );
    const peerClaims = peer.ledger.claims.filter((item) => item.ticket_id === peerTicket.ticket_id);
    expect(peerTicket.status).toBe('active');
    expect(peerTicket.exclusive_resources).toEqual(['execution:' + peerIdentity.work_id]);
    expect(peerClaims).toHaveLength(1);
    expect(peerClaims[0]?.status).toBe('active');
    expect(peerClaims[0]?.resources).toEqual(peerTicket.exclusive_resources);
    const admission = f.prepare('host-unprepared-release', 'fixture:unprepared-owner');
    admission.intakePath = '.agent/work/host-unprepared-release/raw-intake.json';
    writeFileSync(
      path.join(f.root, admission.intakePath),
      JSON.stringify({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: admission.workItem,
        native_session_handle: admission.nativeSessionHandle,
      }),
    );
    const admitted = admitLocalSessionWork(admission);
    if (!admitted.host.work) throw new Error('Unprepared admission did not persist its Host work.');
    const identity: WorkIdentity = {
      repository_id: admitted.host.work.binding.repository_id,
      project_ids: admitted.host.work.binding.project_ids,
      integrations_digest: admitted.host.work.binding.integrations_digest,
      work_id: admission.context.work_id,
    };
    const context = {
      identity,
      attempt: 1,
      operatorHandle: admission.nativeSessionHandle,
      decisionPointer: 'fixture:release-unprepared',
      config: f.config,
    };
    const before = f.store.readHostStateSnapshot(identity);
    if (!before.work) throw new Error('Unprepared Host work is missing before inspection.');
    expect(() => f.store.inspectUnpreparedWorkRecovery(context)).toThrow('preparation engine unavailable');
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(existsSync(path.join(f.root, sessionBridgeDatabaseRelativePath(f.config)))).toBe(false);
    const engine = new Database(path.join(f.root, sessionBridgeDatabaseRelativePath(f.config)));
    try {
      engine.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot TEXT)');
    } finally {
      engine.close();
    }
    const request = f.store.inspectUnpreparedWorkRecovery(context);
    expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(identity)).toBeNull();
    expect(request.originalWork).toEqual(before.work);
    expect(request.originalTicket.active_resources).toEqual(['execution:' + identity.work_id]);
    expect(peerTicket.sequence).toBeLessThan(request.originalTicket.sequence);
    f.database.exec(
      "CREATE TEMP TRIGGER deny_host_release BEFORE UPDATE ON agent_host_state WHEN OLD.kind='ledger' BEGIN SELECT RAISE(ABORT, 'controlled ledger publication failure'); END",
    );
    try {
      expect(() => f.store.releaseUnpreparedWork(context, request)).toThrow('controlled ledger publication failure');
      expect(f.store.readHostStateSnapshot(identity)).toEqual(before);
      expect(f.store.readWorkSessionJournal(identity)).toBeNull();
    } finally {
      f.database.exec('DROP TRIGGER deny_host_release');
    }
    const released = f.store.releaseUnpreparedWork(context, request);
    if (!released.work || !released.ledger) throw new Error('Release did not preserve its Host rows.');
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(released.work.execution.run_id).toBe(request.originalWork.execution.run_id);
    expect(released.work.execution.assignment_attempts).toEqual([]);
    expect(released.work.lifecycle.phase).toBe('INTAKE');
    expect(released.work.lifecycle.seal).toBeNull();
    const ticket = released.ledger.tickets.find((item) => item.ticket_id === request.originalTicket.ticket_id);
    expect(ticket?.status).toBe('released');
    expect(ticket?.active_resources).toEqual([]);
    expect(ticket?.expires_at).toBeNull();
    expect(
      released.ledger.claims
        .filter((item) => item.ticket_id === request.originalTicket.ticket_id)
        .map((item) => item.status),
    ).toEqual(['released']);
    expect(
      released.ledger.operations.filter(
        (item) => item.ticket_id === request.originalTicket.ticket_id && item.kind === 'release',
      ),
    ).toHaveLength(1);
    expect(f.store.releaseUnpreparedWork(context, request)).toEqual(released);
    expect(() => f.store.releaseUnpreparedWork({ ...context, operatorHandle: 'foreign-owner' }, request)).toThrow(
      'unprepared recovery retained request differs',
    );
    expect(f.store.readHostStateSnapshot(identity)).toEqual(released);
    expect(f.store.readWorkSessionJournal(identity)).toBeNull();
    expect(() => f.store.inspectUnpreparedWorkRecovery(context)).toThrow('unprepared recovery owner missing');
    const retainedPeer = presentSnapshot(f.store.readHostStateSnapshot(peerIdentity));
    expect(retainedPeer.work).toEqual(peer.work);
    expect(retainedPeer.workVersion).toEqual(peer.workVersion);
    expect(retainedPeer.ledger.tickets.find((item) => item.ticket_id === peerTicket.ticket_id)).toEqual(peerTicket);
    expect(retainedPeer.ledger.claims.filter((item) => item.ticket_id === peerTicket.ticket_id)).toEqual(peerClaims);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close({ retainRoot: !completed });
        },
      ],
      primaryFailure,
    );
  }
});

test('fresh task-source projection preserves the admitted owner and rejects noncanonical indexes', () => {
  const f = createAutomaticWorkAdmissionFixture(false, true);
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const input = f.prepare('host-empty-task-source', 'fixture:task-source-owner');
    const admitted = f.admit(input);
    if (!admitted.host.work?.lease) throw new Error('Task-source fixture has no active owner.');
    const binding = admitted.host.work.binding;
    const workIdentity: WorkIdentity = {
      repository_id: binding.repository_id,
      project_ids: binding.project_ids,
      integrations_digest: binding.integrations_digest,
      work_id: input.context.work_id,
    };
    const read = () => f.store.readCurrentTaskSourceBinding(workIdentity, input.nativeSessionHandle, 1);
    const before = f.store.readHostStateSnapshot(workIdentity);
    expect(read()).toBeNull();
    initializeTaskSourceBindingWorkProjectionSchema(f.database);
    initializeTaskSourceBindingWorkProjectionSchema(f.database);
    expect(read()).toBeNull();
    expect(f.store.readHostStateSnapshot(workIdentity)).toEqual(before);
    expect(
      f.database
        .query<SqliteNameRow, []>("SELECT name FROM sqlite_master WHERE name='agent_host_task_source_binding_action'")
        .get(),
    ).toBeNull();
    expect(
      f.database
        .query<{ name: string; notnull: number }, []>('PRAGMA table_info(agent_host_task_source_binding_operation)')
        .all()
        .find((column) => column.name === 'work_id')?.notnull,
    ).toBe(1);
    expect(() => f.store.readCurrentTaskSourceBinding(workIdentity, 'foreign-owner', 1)).toThrow(
      'no matching current Host owner',
    );
    expect(() => f.store.readCurrentTaskSourceBinding(workIdentity, input.nativeSessionHandle, 0)).toThrow(
      'read context is invalid',
    );
    expect(() => f.database.transaction(() => read()).deferred()).toThrow('nested task source binding read forbidden');
    expect(() =>
      f.database.transaction(() => initializeTaskSourceBindingWorkProjectionSchema(f.database)).immediate(),
    ).toThrow('task source schema requires an unshared database');
    const index = 'agent_host_task_source_binding_operation_work';
    for (const definition of [
      `CREATE INDEX ${index} ON agent_host_task_source_binding_operation(workspace_id,operation_id,work_id)`,
      `CREATE INDEX ${index} ON agent_host_task_source_binding_operation(workspace_id,work_id,operation_id DESC)`,
      `CREATE UNIQUE INDEX ${index} ON agent_host_task_source_binding_operation(workspace_id,work_id,operation_id)`,
      `CREATE INDEX ${index} ON agent_host_task_source_binding_operation(workspace_id,work_id COLLATE NOCASE,operation_id)`,
      `CREATE INDEX ${index} ON agent_host_task_source_binding_operation(workspace_id,work_id,operation_id) WHERE revision > 0`,
    ]) {
      f.database.exec(`DROP INDEX ${index}`);
      f.database.exec(definition);
      expect(() => initializeTaskSourceBindingWorkProjectionSchema(f.database)).toThrow(
        'task source work projection index differs',
      );
      expect(
        f.database.query<SqliteMasterRow, [string]>('SELECT name,sql FROM sqlite_master WHERE name=?').get(index)?.sql,
      ).toBe(definition);
      expect(f.store.readHostStateSnapshot(workIdentity)).toEqual(before);
    }
    f.database.exec(`DROP INDEX ${index}`);
    initializeTaskSourceBindingWorkProjectionSchema(f.database);
    expect(read()).toBeNull();
    expect(f.store.readHostStateSnapshot(workIdentity)).toEqual(before);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close({ retainRoot: !completed });
        },
      ],
      primaryFailure,
    );
  }
});

test('task-source preparation and inspection persist one retry-stable operation without action effects', () => {
  const deadline = performance.now() + 5_000;
  const f = createTaskSourceHostFixture();
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const input = { request: f.request, identity: f.identity, verifyCurrent: f.trustedVerifyCurrent };
    const absentIdentity = { ...f.identity, work_id: 'task-source-absent-work' };
    const verifyAbsent = mock(f.trustedVerifyCurrent);
    const absentInput = {
      request: { ...f.request, work_id: absentIdentity.work_id },
      identity: absentIdentity,
      verifyCurrent: verifyAbsent,
    };
    const catalog = f.database.query('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name');
    const catalogBefore = catalog.all();
    const nativeBefore = readFixtureHostRows(f.database);
    expect(() => f.store.prepareTaskSourceBindingOperation(absentInput)).toThrow(
      'task source preparation Host work is missing',
    );
    expect(() => f.store.inspectTaskSourceBindingOperation(absentInput)).toThrow(
      'task source inspection Host work is missing',
    );
    expect(() => f.store.inspectTaskSourceBindingAction(absentInput)).toThrow(
      'task source inspection Host work is missing',
    );
    expect(verifyAbsent).not.toHaveBeenCalled();
    expect(readFixtureHostRows(f.database)).toEqual(nativeBefore);
    expect(catalog.all()).toEqual(catalogBefore);
    expect(existsSync(requiredValue(f.request.source_root, 'TaskSource proposed root'))).toBe(false);
    const before = f.store.readHostStateSnapshot(f.identity);
    const journalBefore = f.store.readWorkSessionJournal(f.identity);
    expect(f.store.inspectTaskSourceBindingOperation(input)).toEqual({
      schema: 'TaskSourceBindingOperationResult/v1',
      status: 'not_found',
      operation_id: f.request.operation_id,
      request_id: f.request.request_id,
      operation: null,
      state_version: null,
    });
    expect(
      f.database.query("SELECT name FROM sqlite_master WHERE name='agent_host_task_source_binding_operation'").get(),
    ).toBeNull();
    initializeTaskSourceBindingWorkProjectionSchema(f.database);
    expect(f.store.inspectTaskSourceBindingOperation(input).status).toBe('not_found');
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    const prepared = f.prepare();
    expect(prepared.status).toBe('prepared');
    expect(prepared.operation_id).toBe(f.request.operation_id);
    expect(prepared.request_id).toBe(f.request.request_id);
    expect(prepared.operation).toMatchObject({
      schema: 'TaskSourceBindingOperation/v1',
      status: 'prepared',
      revision: 1,
      request: f.request,
      request_digest: canonicalJsonDigest(f.request),
      authority: { source_authorization_sha256: 'c'.repeat(64), source_scope_digest: f.journal.source_scope?.digest },
    });
    expect(prepared.state_version).toEqual({ revision: 1, digest: canonicalJsonDigest(prepared.operation) });
    expect(
      f.database.query<{ work_id: string }, []>('SELECT work_id FROM agent_host_task_source_binding_operation').get()
        ?.work_id,
    ).toBe(f.identity.work_id);
    expect(f.prepare()).toEqual(prepared);
    expect(f.store.inspectTaskSourceBindingOperation(input)).toEqual({ ...prepared, status: 'inspected' });
    const missing = {
      ...f.request,
      operation_id: 'task-source-not-prepared',
      request_id: 'task-source-not-prepared-request',
    };
    expect(f.store.inspectTaskSourceBindingOperation({ ...input, request: missing }).status).toBe('not_found');
    expect(() =>
      f.store.prepareTaskSourceBindingOperation({ ...input, request: { ...f.request, request_id: 'changed-request' } }),
    ).toThrow('task source operation retry changed');
    const changedAuthority = () => ({
      source_authorization_sha256: 'd'.repeat(64),
      source_scope_digest: f.journal.source_scope!.digest,
    });
    expect(() => f.prepare(changedAuthority)).toThrow('task source operation retry changed');
    expect(() => f.store.inspectTaskSourceBindingOperation({ ...input, verifyCurrent: changedAuthority })).toThrow(
      'task source inspection request or current authority differs',
    );
    expect(() => f.database.transaction(() => f.store.inspectTaskSourceBindingOperation(input)).deferred()).toThrow(
      'nested task source operation inspection forbidden',
    );
    expect(
      f.database
        .query<{ count: number }, []>('SELECT count(*) AS count FROM agent_host_task_source_binding_operation')
        .get()?.count,
    ).toBe(1);
    expect(
      f.database
        .query(
          "SELECT name FROM sqlite_master WHERE name IN ('agent_host_task_source_binding_action','agent_host_task_source_binding_claim')",
        )
        .all(),
    ).toEqual([]);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    expect(f.store.inspectTaskSourceBindingOperation(input)).toEqual({ ...prepared, status: 'inspected' });
    if (performance.now() >= deadline) throw new Error('TaskSource projected preparation exceeded its case deadline');
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(() => completed && performance.now() < deadline);
          if (performance.now() >= deadline) throw new Error('TaskSource projected cleanup exceeded its case deadline');
        },
      ],
      primaryFailure,
    );
  }
});

test('task-source expired owner denies preparation and inspection before the trusted verifier or lazy schema', () => {
  const expires = Date.now() + 30 * 60_000;
  const f = createTaskSourceHostFixture({ expiresAt: new Date(expires).toISOString() });
  const clock = spyOn(Date, 'now').mockReturnValue(expires + 1);
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const before = f.store.readHostStateSnapshot(f.identity);
    const journalBefore = f.store.readWorkSessionJournal(f.identity);
    const verifyCurrent = mock(f.trustedVerifyCurrent);
    expect(() => f.prepare(verifyCurrent)).toThrow(/owner|expiry|expired|stale/i);
    expect(() =>
      f.store.inspectTaskSourceBindingOperation({ request: f.request, identity: f.identity, verifyCurrent }),
    ).toThrow('task source inspection owner, lease or current scope differs');
    expect(verifyCurrent).not.toHaveBeenCalled();
    expect(
      f.database.query("SELECT name FROM sqlite_master WHERE name LIKE 'agent_host_task_source_binding_%'").all(),
    ).toEqual([]);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    clock.mockRestore();
    completeOwnedCleanup(
      [
        () => {
          f.close(completed);
        },
      ],
      primaryFailure,
    );
  }
});

test('task-source trusted-verifier and CAS denials roll back native preparation without granting effects', () => {
  const f = createTaskSourceHostFixture();
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const before = f.store.readHostStateSnapshot(f.identity);
    const journalBefore = f.store.readWorkSessionJournal(f.identity);
    const denial = new Error('fixture trusted verifier denied');
    expect(() =>
      f.prepare(() => {
        throw denial;
      }),
    ).toThrow(denial);
    const invalid = () => ({
      source_authorization_sha256: 'invalid',
      source_scope_digest: f.journal.source_scope!.digest,
    });
    expect(() => f.prepare(invalid)).toThrow('task source preparation authorization is invalid');
    expect(() =>
      f.store.inspectTaskSourceBindingOperation({ request: f.request, identity: f.identity, verifyCurrent: invalid }),
    ).toThrow('task source inspection authorization is invalid');
    for (const expected_host of [
      {
        ...f.request.expected_host,
        work: { ...f.request.expected_host.work, revision: f.request.expected_host.work.revision + 1 },
      },
      {
        ...f.request.expected_host,
        ledger: { ...f.request.expected_host.ledger, revision: f.request.expected_host.ledger.revision + 1 },
      },
      {
        ...f.request.expected_host,
        journal: {
          ...f.request.expected_host.journal,
          version: { ...f.request.expected_host.journal.version, revision: 2 },
        },
      },
      { ...f.request.expected_host, maintenance_generation: f.request.expected_host.maintenance_generation + 1 },
    ]) {
      const verifyCurrent = mock(f.trustedVerifyCurrent);
      expect(() =>
        f.store.prepareTaskSourceBindingOperation({
          request: { ...f.request, expected_host },
          identity: f.identity,
          verifyCurrent,
        }),
      ).toThrow(/CAS|compare-and-swap|revision|version/i);
      expect(verifyCurrent).toHaveBeenCalledTimes(1);
      expect(
        f.database.query("SELECT name FROM sqlite_master WHERE name LIKE 'agent_host_task_source_binding_%'").all(),
      ).toEqual([]);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    }
    const prepared = f.prepare();
    expect(prepared.status).toBe('prepared');
    expect(() =>
      f.store.prepareTaskSourceBindingOperation({
        request: { ...f.request, operation_id: 'duplicate-request-operation' },
        identity: f.identity,
        verifyCurrent: f.trustedVerifyCurrent,
      }),
    ).toThrow('task source request ID is already bound');
    expect(f.prepare()).toEqual(prepared);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(completed);
        },
      ],
      primaryFailure,
    );
  }
});

test('task-source inspection preserves ownership and permits a distinct proposal after its observed report', async () => {
  const deadline = performance.now() + 5_000;
  const policy = mock(async ({ request }: { request: Parameters<typeof trustedTaskSourcePolicyDecision>[0] }) => {
    expect(request.operation_id).toBe('task-source-op-expiry-after-inspect');
    return trustedTaskSourcePolicyDecision(request);
  });
  const f = createTaskSourceHostFixture({ policyVerifier: policy });
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const { branch_ref: _branch, ...base } = f.request;
    const request = { ...base, operation: 'inspect' as const, source_root: f.root };
    const input = { request, identity: f.identity };
    const before = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    const journal = f.store.readWorkSessionJournal(f.identity);
    const nativeBefore = readFixtureHostRows(f.database);
    const prepared = f.store.prepareTaskSourceBindingOperation({ ...input, verifyCurrent: f.trustedVerifyCurrent });
    const issued = await f.store.issueTaskSourceBindingOperation(input);
    expect(issued.status).toBe('issued');
    expect(issued.command_argv).toEqual([
      ['-C', f.root, 'rev-parse', '--show-toplevel'],
      ['-C', f.root, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      ['-C', f.root, 'branch', '--show-current'],
      ['-C', f.root, 'rev-parse', 'HEAD'],
    ]);
    expect(policy).not.toHaveBeenCalled();
    expect(readFixtureHostRows(f.database)).toEqual(nativeBefore);
    expect(await f.store.issueTaskSourceBindingOperation(input)).toEqual({
      ...issued,
      status: 'already_issued',
      command_argv: null,
    });
    const actionVersion = requiredValue(
      f.database
        .query<StateVersion, [string]>(
          'SELECT revision,digest FROM agent_host_task_source_binding_action WHERE operation_id=?',
        )
        .get(request.operation_id),
      'Issued inspection state version',
    );
    const report: TaskSourceBindingReport = {
      schema: 'TaskSourceBindingReport/v1',
      operation: request.operation,
      operation_id: request.operation_id,
      request_id: request.request_id,
      report_id: 'fixture:observed-inspection',
      expected_host: request.expected_host,
      status: 'observed',
      // Controlled Git observation, not an executed Git command or Source effect.
      binding: createTaskSourceBinding({
        request,
        source_scope: requiredValue(f.journal.source_scope, 'Inspection Source scope'),
        canonical_host_common_dir: path.join(f.root, '.git'),
        git: {
          source_root: f.root,
          common_dir: path.join(f.root, '.git'),
          branch: 'main',
          head: '1'.repeat(40),
          cwd: f.root,
        },
      }),
    };
    const reportInput = { ...input, report, expectedActionStateVersion: actionVersion };
    const observed = f.store.reportTaskSourceBindingOperation(reportInput);
    expect(observed).toMatchObject({
      status: 'reported',
      command_argv: null,
      action: { report, policy_decision: null },
    });
    expect(f.store.reportTaskSourceBindingOperation(reportInput)).toEqual(observed);
    expect(f.store.prepareTaskSourceBindingOperation({ ...input, verifyCurrent: f.trustedVerifyCurrent })).toEqual(
      prepared,
    );
    expect(f.store.inspectTaskSourceBindingAction({ ...input, verifyCurrent: f.trustedVerifyCurrent })).toEqual(
      observed,
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
    expect(readFixtureHostRows(f.database)).toEqual(nativeBefore);
    expect(policy).not.toHaveBeenCalled();
    expect(existsSync(path.join(f.root, 'task-source'))).toBe(false);
    const inspectRow = f.database.query<{ payload: string; digest: string }, [string]>(
      'SELECT payload,digest FROM agent_host_task_source_binding_action WHERE operation_id=?',
    );
    const inspectBefore = requiredValue(inspectRow.get(request.operation_id), 'reported inspection row');
    const proposal = {
      ...f.request,
      operation_id: f.request.operation_id + '-after-inspect',
      request_id: f.request.request_id + '-after-inspect',
    };
    const proposalInput = { request: proposal, identity: f.identity };
    f.store.prepareTaskSourceBindingOperation({ ...proposalInput, verifyCurrent: f.trustedVerifyCurrent });
    expect(f.store.inspectTaskSourceBindingAction({ ...proposalInput, verifyCurrent: f.trustedVerifyCurrent })).toEqual(
      {
        schema: 'TaskSourceBindingActionResult/v1',
        status: 'prepared',
        operation_id: proposal.operation_id,
        request_id: proposal.request_id,
        action: null,
        state_version: null,
        command_argv: null,
      },
    );
    expect(inspectRow.get(request.operation_id)).toEqual(inspectBefore);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    const proposalIssue = await f.store.issueTaskSourceBindingOperation(proposalInput);
    expect(proposalIssue.status).toBe('issued');
    expect(proposalIssue.command_argv).not.toBeNull();
    expect(policy).toHaveBeenCalledTimes(1);
    const reserved = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    expect(reserved.work.lease?.ticket_id).not.toBe(before.work.lease?.ticket_id);
    expect(reserved.ledger.tickets.find((ticket) => ticket.ticket_id === before.work.lease?.ticket_id)?.status).toBe(
      'released',
    );
    expect(reserved.ledger.tickets.find((ticket) => ticket.ticket_id === reserved.work.lease?.ticket_id)?.status).toBe(
      'active',
    );
    expect(inspectRow.get(request.operation_id)).toEqual(inspectBefore);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
    expect(await f.store.issueTaskSourceBindingOperation(proposalInput)).toEqual({
      ...proposalIssue,
      status: 'already_issued',
      command_argv: null,
    });
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
    expect(existsSync(path.join(f.root, 'task-source'))).toBe(false);
    expect(performance.now()).toBeLessThan(deadline);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(false, completed ? 'issued proposal without observation; no replay' : 'failed or timed out');
          if (performance.now() >= deadline) throw new Error('TaskSource inspection cleanup exhausted its deadline');
        },
      ],
      primaryFailure,
    );
  }
});

test('task-source issued and UNKNOWN actions retain reservations without exposing replay argv', async () => {
  const retainedResources = ['branch:refs/heads/accepted-source', 'execution:task-source-expiry'];
  const policy = mock(
    async ({ request }: Parameters<NonNullable<ConstructorParameters<typeof HostStateStore>[8]>['verify']>[0]) =>
      trustedTaskSourcePolicyDecision(request),
  );
  const f = createTaskSourceHostFixture({
    policyVerifier: policy,
    retainedResources,
    configuredHost: { repositoryRoot: root, identity: { ...identity } },
  });
  // Keep both the native action DB and its configured Host root for the expected UNKNOWN.
  preserveHostFixtureRoot = 'expected UNKNOWN';
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const predecessor = f.rotateOwnerReservation();
    expect(predecessor.work?.lease?.ticket_id).not.toBe(f.initial.work?.lease?.ticket_id);
    const input = { request: f.request, identity: f.identity };
    const observation = { ...input, verifyCurrent: f.trustedVerifyCurrent };
    const sourceRoot = path.resolve(requiredValue(f.request.source_root, 'TaskSource proposed root'));
    expect(existsSync(sourceRoot)).toBe(false);
    expect(f.store.inspectTaskSourceBindingAction(observation).status).toBe('not_found');
    f.prepare();
    expect(f.store.inspectTaskSourceBindingAction(observation)).toMatchObject({
      status: 'prepared',
      action: null,
      state_version: null,
      command_argv: null,
    });
    const issued = await f.store.issueTaskSourceBindingOperation(input);
    const version = f.database
      .query<StateVersion, [string]>(
        'SELECT revision,digest FROM agent_host_task_source_binding_action WHERE operation_id=?',
      )
      .get(f.request.operation_id);
    if (!version) throw new Error('Expected one native issued Task-source action.');
    expect(issued).toMatchObject({
      schema: 'TaskSourceBindingActionResult/v1',
      status: 'issued',
      operation_id: f.request.operation_id,
      request_id: f.request.request_id,
      state_version: version,
      action: { status: 'issued', report: null, revision: 1 },
    });
    expect(issued.command_argv).toEqual([
      ['-C', root, 'worktree', 'add', '--branch', 'codex/task-source', f.request.source_root],
    ]);
    expect(policy).toHaveBeenCalledTimes(1);
    expect(() => f.store.readCurrentTaskSourceBinding(f.identity, f.request.thread_id, 1)).toThrow(
      'task source action outcome remains unknown; Source root resolution is blocked',
    );
    const reserved = f.store.readHostStateSnapshot(f.identity);
    const verifiedInput = requiredValue(policy.mock.calls[0]?.[0], 'Original TaskSource policy input');
    const retainedPolicy = createTaskSourceMutationPolicyRequest({
      repositoryRoot: root,
      operation: verifiedInput.operation,
      preparedStateVersion: verifiedInput.stateVersion,
      hostSnapshot: reserved,
    });
    const expectedPolicy = {
      schema: 'TaskSourceMutationPolicyRequest/v1' as const,
      action: 'source.write' as const,
      operation_id: f.request.operation_id,
      request_id: f.request.request_id,
      work_id: f.request.work_id,
      thread_id: f.request.thread_id,
      scope_digest: requiredValue(f.initial.work, 'Original TaskSource Work').binding.work_source_revision,
      config_digest: f.request.config_digest,
      lease: requiredValue(reserved.work?.lease, 'Current TaskSource lease'),
      branch_ref: 'refs/heads/codex/task-source',
      source_root: sourceRoot,
      proposed_argv: ['git', '-C', root, 'worktree', 'add', '--branch', 'codex/task-source', sourceRoot],
      prepared_record_cas: { operation_id: f.request.operation_id, state_version: verifiedInput.stateVersion },
    };
    expect(retainedPolicy).toEqual({ ...expectedPolicy, operation_hash: canonicalJsonDigest(expectedPolicy) });
    expect(retainedPolicy.operation_hash).not.toBe(verifiedInput.request.operation_hash);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
    expect(policy).toHaveBeenCalledTimes(1);
    expect(existsSync(sourceRoot)).toBe(false);
    const ticketId = `task-source-ticket:${f.request.work_id}:${f.request.attempt}:${f.request.operation_id}`;
    expect(reserved.work?.lease?.ticket_id).toBe(ticketId);
    expect(reserved.ledger?.tickets.find((ticket) => ticket.ticket_id === ticketId)).toMatchObject({
      status: 'active',
      work_id: f.request.work_id,
      thread_id: f.request.thread_id,
    });
    const expectedResources = [
      ...retainedResources,
      'file:src/task.ts',
      `branch:${f.request.branch_ref}`,
      `worktree:${process.platform === 'win32' ? sourceRoot.toLocaleLowerCase('en-US') : sourceRoot}`,
    ].sort();
    const nativeTicket = requiredValue(
      reserved.ledger?.tickets.find((ticket) => ticket.ticket_id === ticketId),
      'issued TaskSource ticket',
    );
    expect(nativeTicket.exclusive_resources).toEqual(expectedResources);
    expect(nativeTicket.active_resources).toEqual(expectedResources);
    expect(reserved.ledger?.claims.filter((claim) => claim.ticket_id === ticketId)).toMatchObject([
      { status: 'active', resources: expectedResources },
    ]);
    expect(
      reserved.ledger?.tickets.find((ticket) => ticket.ticket_id === f.initial.work?.lease?.ticket_id),
    ).toMatchObject({
      status: 'released',
      active_resources: [],
      blocked_resources: [],
      expires_at: null,
    });
    expect(
      reserved.ledger?.claims.filter((claim) => claim.ticket_id === f.initial.work?.lease?.ticket_id),
    ).toMatchObject([{ status: 'released', resources: ['file:src/task.ts', ...retainedResources].sort() }]);
    const predecessors = requiredValue(reserved.ledger, 'Issued ledger').tickets.filter((ticket) =>
      [f.initial.work?.lease?.ticket_id, predecessor.work?.lease?.ticket_id].includes(ticket.ticket_id),
    );
    expect(predecessors).toHaveLength(2);
    for (const prior of predecessors) {
      expect(prior).toMatchObject({
        status: 'released',
        active_resources: [],
        blocked_resources: [],
        expires_at: null,
      });
      expect(reserved.ledger?.claims.filter((claim) => claim.ticket_id === prior.ticket_id)).toMatchObject([
        { status: 'released', resources: prior.exclusive_resources },
      ]);
    }
    expect(await f.store.issueTaskSourceBindingOperation(input)).toEqual({
      ...issued,
      status: 'already_issued',
      command_argv: null,
    });
    expect(f.store.inspectTaskSourceBindingAction(observation)).toEqual({ ...issued, command_argv: null });
    expect(policy).toHaveBeenCalledTimes(1);
    const unknown: TaskSourceBindingReport = {
      schema: 'TaskSourceBindingReport/v1',
      operation: f.request.operation,
      operation_id: f.request.operation_id,
      request_id: f.request.request_id,
      report_id: 'native-unit-unknown',
      expected_host: f.request.expected_host,
      status: 'unknown',
      binding: null,
      reason: 'controlled cooperative report, no command executed',
    };
    expect(() =>
      f.store.reportTaskSourceBindingOperation({
        ...input,
        expectedActionStateVersion: { ...version, revision: version.revision + 1 },
        report: unknown,
      }),
    ).toThrow('task source report action CAS is stale');
    expect(f.store.inspectTaskSourceBindingAction(observation)).toEqual({ ...issued, command_argv: null });
    const uncertain = f.store.reportTaskSourceBindingOperation({
      ...input,
      expectedActionStateVersion: version,
      report: unknown,
    });
    const uncertainVersion = { revision: version.revision + 1, digest: canonicalJsonDigest(uncertain.action) };
    expect(uncertain).toMatchObject({
      status: 'unknown',
      command_argv: null,
      state_version: uncertainVersion,
      action: { status: 'unknown', report: unknown, recovery_report: null, revision: 2 },
    });
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
    expect(f.store.inspectTaskSourceBindingAction(observation)).toEqual(uncertain);
    expect(() => f.store.readCurrentTaskSourceBinding(f.identity, f.request.thread_id, 1)).toThrow(
      'task source action outcome remains unknown; Source root resolution is blocked',
    );
    expect(await f.store.issueTaskSourceBindingOperation(input)).toEqual({ ...uncertain, status: 'already_issued' });
    expect(policy).toHaveBeenCalledTimes(1);
    expect(() =>
      f.store.reportTaskSourceBindingOperation({
        ...input,
        expectedActionStateVersion: uncertainVersion,
        report: unknown,
      }),
    ).toThrow('uncertain task source action accepts only one later observed recovery report');
    if (!reserved.workVersion || !reserved.ledgerVersion) throw new Error('Expected native reservation CAS.');
    const second = {
      ...f.request,
      operation_id: 'blocked-second-operation',
      request_id: 'blocked-second-request',
      expected_host: { ...f.request.expected_host, work: reserved.workVersion, ledger: reserved.ledgerVersion },
    };
    f.store.prepareTaskSourceBindingOperation({
      request: second,
      identity: f.identity,
      verifyCurrent: f.trustedVerifyCurrent,
    });
    await Promise.resolve(
      expect(f.store.issueTaskSourceBindingOperation({ request: second, identity: f.identity })).rejects.toThrow(
        'TaskSource resources are already claimed',
      ),
    );
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
    expect(
      f.database
        .query<{ count: number }, []>('SELECT count(*) AS count FROM agent_host_task_source_binding_action')
        .get()?.count,
    ).toBe(1);
    expect(f.store.inspectTaskSourceBindingAction(observation)).toEqual(uncertain);
    expect(f.store.readWorkSessionJournal(f.identity)?.version).toEqual(f.request.expected_host.journal.version);
    expect(existsSync(sourceRoot)).toBe(false);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(false, completed ? 'expected UNKNOWN' : 'failed');
        },
      ],
      primaryFailure,
    );
  }
});

test.each(['direct', 'recovered-unknown'] as const)(
  'historical task-source snapshots select observed roots and fence corrupted retained evidence (%s)',
  async (reportMode) => {
    const deadline = performance.now() + 5_000;
    preserveHostFixtureRoot = 'case failed or timed out';
    mkdirSync(path.join(root, 'src'), { recursive: true });
    writeFileSync(path.join(root, 'src/task.ts'), 'host');
    const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['src/task.ts']);
    const f = createTaskSourceHostFixture({
      sourceScope,
      configuredHost: { repositoryRoot: root, identity: { ...identity } },
      policyVerifier: async ({ request }) => trustedTaskSourcePolicyDecision(request),
    });
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      const taskRoot = requiredValue(f.request.source_root, 'task source root');
      mkdirSync(path.join(taskRoot, 'src'), { recursive: true });
      writeFileSync(path.join(taskRoot, 'src/task.ts'), 'task');
      const input = {
        identity: f.identity,
        threadId: f.request.thread_id,
        attempt: 1,
        canonicalHostRoot: root,
        paths: ['src/task.ts'],
      };
      const hostEntry = {
        path: 'src/task.ts',
        exists: true,
        bytes: 4,
        sha256: createHash('sha256').update('host').digest('hex'),
      };
      const taskEntry = { ...hostEntry, sha256: createHash('sha256').update('task').digest('hex') };
      expect(f.store.snapshotHistoricalTaskSourceSources(input).entries).toEqual([hostEntry]);
      const catalog = f.database.query('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name');
      const beforeReadSchema = catalog.all();
      expect(f.store.readCurrentTaskSourceBinding(f.identity, f.request.thread_id, 1)).toBeNull();
      expect(catalog.all()).toEqual(beforeReadSchema);
      const { branch_ref: _branch, ...inspectBase } = f.request;
      const inspectRequest = {
        ...inspectBase,
        operation: 'inspect' as const,
        operation_id: 'historical-source-inspect',
        request_id: 'historical-source-inspect-request',
        source_root: root,
      };
      const inspectInput = { request: inspectRequest, identity: f.identity };
      f.store.prepareTaskSourceBindingOperation({ ...inspectInput, verifyCurrent: f.trustedVerifyCurrent });
      expect((await f.store.issueTaskSourceBindingOperation(inspectInput)).status).toBe('issued');
      const inspectVersion = requiredValue(
        f.database
          .query<StateVersion, [string]>(
            'SELECT revision,digest FROM agent_host_task_source_binding_action WHERE operation_id=?',
          )
          .get(inspectRequest.operation_id),
        'historical fixture inspection version',
      );
      const inspected = f.store.reportTaskSourceBindingOperation({
        ...inspectInput,
        expectedActionStateVersion: inspectVersion,
        report: {
          schema: 'TaskSourceBindingReport/v1',
          operation: inspectRequest.operation,
          operation_id: inspectRequest.operation_id,
          request_id: inspectRequest.request_id,
          report_id: 'cooperative-unit-host-inspected',
          expected_host: inspectRequest.expected_host,
          status: 'observed',
          binding: createTaskSourceBinding({
            request: inspectRequest,
            source_scope: sourceScope,
            canonical_host_common_dir: path.join(root, '.git'),
            git: {
              source_root: root,
              common_dir: path.join(root, '.git'),
              branch: 'main',
              head: '1'.repeat(40),
              cwd: root,
            },
          }),
        },
      });
      expect(inspected.status).toBe('reported');
      expect(f.store.readCurrentTaskSourceBinding(f.identity, f.request.thread_id, 1)).toBeNull();
      expect(f.store.snapshotHistoricalTaskSourceSources(input)).toEqual(sourceScope);
      f.prepare();
      expect(f.store.snapshotHistoricalTaskSourceSources(input).entries).toEqual([hostEntry]);
      if (performance.now() >= deadline) throw new Error('TaskSource setup exhausted its case deadline.');
      const issued = await f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity });
      const issuedVersion = issued.state_version;
      if (
        !isPlainRecord(issuedVersion) ||
        typeof issuedVersion.revision !== 'number' ||
        typeof issuedVersion.digest !== 'string'
      )
        throw new Error('Expected issued TaskSource CAS.');
      let version = { revision: issuedVersion.revision, digest: issuedVersion.digest };
      expect(issued.status).toBe('issued');
      const reserved = f.store.readHostStateSnapshot(f.identity);
      const journalBefore = f.store.readWorkSessionJournal(f.identity);
      expect(() => f.store.snapshotHistoricalTaskSourceSources(input)).toThrow(
        'historical task source effect remains issued or unknown',
      );
      const unknownReport: TaskSourceBindingReport | null =
        reportMode === 'recovered-unknown'
          ? {
              schema: 'TaskSourceBindingReport/v1',
              operation: f.request.operation,
              operation_id: f.request.operation_id,
              request_id: f.request.request_id,
              report_id: 'cooperative-unit-pending-observation',
              expected_host: f.request.expected_host,
              status: 'unknown',
              binding: null,
              reason: 'fresh fixture observation pending; no command executed',
            }
          : null;
      if (unknownReport) {
        const uncertain = f.store.reportTaskSourceBindingOperation({
          request: f.request,
          identity: f.identity,
          expectedActionStateVersion: version,
          report: unknownReport,
        });
        const uncertainVersion = requiredValue(
          f.database
            .query<StateVersion, [string]>(
              'SELECT revision,digest FROM agent_host_task_source_binding_action WHERE operation_id=?',
            )
            .get(f.request.operation_id),
          'fresh unknown action version',
        );
        expect(uncertain).toMatchObject({
          status: 'unknown',
          command_argv: null,
          state_version: uncertainVersion,
          action: { report: unknownReport, recovery_report: null },
        });
        expect(uncertainVersion).toEqual({
          revision: version.revision + 1,
          digest: canonicalJsonDigest(uncertain.action),
        });
        expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
        expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
        expect(() => f.store.snapshotHistoricalTaskSourceSources(input)).toThrow(
          'historical task source effect remains issued or unknown',
        );
        version = uncertainVersion;
      }
      const report: TaskSourceBindingReport = {
        schema: 'TaskSourceBindingReport/v1',
        operation: f.request.operation,
        operation_id: f.request.operation_id,
        request_id: f.request.request_id,
        report_id: 'cooperative-unit-observed',
        expected_host: f.request.expected_host,
        status: 'observed',
        binding: createTaskSourceBinding({
          request: f.request,
          source_scope: requiredValue(f.journal.source_scope, 'journal scope'),
          canonical_host_common_dir: path.join(root, '.git'),
          git: {
            source_root: taskRoot,
            common_dir: path.join(root, '.git'),
            branch: 'codex/task-source',
            head: '1'.repeat(40),
            cwd: taskRoot,
          },
        }),
      };
      const reportInput = { request: f.request, identity: f.identity, expectedActionStateVersion: version, report };
      expect(() =>
        f.store.reportTaskSourceBindingOperation({
          ...reportInput,
          expectedActionStateVersion: { ...version, revision: version.revision + 1 },
        }),
      ).toThrow('task source report action CAS is stale');
      const observed = f.store.reportTaskSourceBindingOperation(reportInput);
      expect(observed).toMatchObject({
        status: 'reported',
        command_argv: null,
        action: {
          status: 'reported',
          report: unknownReport ?? report,
          recovery_report: unknownReport ? report : null,
          revision: version.revision + 1,
        },
      });
      expect(f.store.reportTaskSourceBindingOperation(reportInput)).toEqual(observed);
      expect(f.store.snapshotHistoricalTaskSourceSources(input).entries).toEqual([taskEntry]);
      expect(() => f.store.readCurrentTaskSourceBinding(f.identity, f.request.thread_id, 1)).toThrow(
        'current task Source bytes differ from the durable Host journal scope',
      );
      const beforeHealthyRead = readFixtureHostRows(f.database);
      writeFileSync(path.join(taskRoot, 'src/task.ts'), 'host');
      let healthyReadFailure: { error: unknown } | undefined;
      try {
        const current = presentSnapshot(reserved);
        const pendingInput = {
          identity: f.identity,
          request: {
            ...f.request,
            operation_id: 'historical-source-unissued',
            request_id: 'historical-source-unissued-request',
            source_root: path.join(f.root, 'unissued-task-source'),
            branch_ref: 'refs/heads/codex/unissued-task-source',
            expected_host: {
              ...f.request.expected_host,
              work: current.workVersion,
              ledger: current.ledgerVersion,
              maintenance_generation: current.maintenanceGeneration,
            },
          },
          verifyCurrent: f.trustedVerifyCurrent,
        };
        const pending = f.store.prepareTaskSourceBindingOperation(pendingInput);
        expect(pending.status).toBe('prepared');
        expect(f.store.readCurrentTaskSourceBinding(f.identity, f.request.thread_id, 1)).toEqual(report.binding);
        expect(f.store.snapshotHistoricalTaskSourceSources(input)).toEqual(sourceScope);
        expect(f.store.inspectTaskSourceBindingOperation(pendingInput)).toEqual({ ...pending, status: 'inspected' });
        expect(f.store.inspectTaskSourceBindingAction(pendingInput)).toMatchObject({
          status: 'prepared',
          action: null,
          state_version: null,
          command_argv: null,
        });
        expect(existsSync(pendingInput.request.source_root)).toBe(false);
        expect(readFixtureHostRows(f.database)).toEqual(beforeHealthyRead);
        expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
      } catch (error) {
        healthyReadFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              writeFileSync(path.join(taskRoot, 'src/task.ts'), 'task');
            },
          ],
          healthyReadFailure,
        );
      }
      expect(f.store.snapshotHistoricalTaskSourceSources(input).entries).toEqual([taskEntry]);
      expect(readFileSync(path.join(root, 'src/task.ts'), 'utf8')).toBe('host');
      for (const [changed, reason] of [
        [{ attempt: 0 }, 'historical task source read context is invalid'],
        [{ canonicalHostRoot: taskRoot }, 'historical task source canonical Host root differs'],
        [{ threadId: 'foreign-owner' }, 'historical task source original owner differs'],
        [{ paths: [] }, 'historical task source paths differ from original fingerprint scope'],
        [{ attempt: 2 }, 'historical task source original journal is missing or changed'],
      ] as const) {
        expect(() => f.store.snapshotHistoricalTaskSourceSources({ ...input, ...changed })).toThrow(reason);
        expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
      }
      expect(() => f.database.transaction(() => f.store.snapshotHistoricalTaskSourceSources(input)).deferred()).toThrow(
        'historical task source read context is invalid',
      );
      const actionRow = requiredValue(
        f.database
          .query<{ payload: string; digest: string }, [string]>(
            'SELECT payload,digest FROM agent_host_task_source_binding_action WHERE operation_id=?',
          )
          .get(f.request.operation_id),
        'retained action',
      );
      const updateAction = f.database.query(
        'UPDATE agent_host_task_source_binding_action SET payload=?,digest=? WHERE workspace_id=? AND operation_id=? AND digest=?',
      );
      for (const [patch, reason] of [
        [{ revision: 90 }, 'historical task source action/preparation integrity differs'],
        [{ created_at: 'not-a-date' }, 'historical task source action/preparation integrity differs'],
        [{ status: 'unknown' }, 'historical task source effect remains issued or unknown'],
        [{ report_digest: '0'.repeat(64) }, 'historical task source has no valid retained observed result'],
        ...(unknownReport
          ? ([
              [
                { recovery_report_digest: '0'.repeat(64) },
                'historical task source has no valid retained observed result',
              ],
              [
                { report, report_digest: canonicalJsonDigest(report) },
                'historical task source effect remains issued or unknown',
              ],
            ] as const)
          : []),
      ] as const) {
        const changed = { ...parseJsonRecord(actionRow.payload), ...patch };
        const changedDigest = canonicalJsonDigest(changed);
        expect(
          updateAction.run(
            canonicalJson(changed),
            changedDigest,
            f.store.workspaceId,
            f.request.operation_id,
            actionRow.digest,
          ).changes,
        ).toBe(1);
        let mutationFailure: { error: unknown } | undefined;
        try {
          expect(() => f.store.snapshotHistoricalTaskSourceSources(input)).toThrow(reason);
          expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
        } catch (error) {
          mutationFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                expect(
                  updateAction.run(
                    actionRow.payload,
                    actionRow.digest,
                    f.store.workspaceId,
                    f.request.operation_id,
                    changedDigest,
                  ).changes,
                ).toBe(1);
              },
            ],
            mutationFailure,
          );
        }
        expect(f.store.snapshotHistoricalTaskSourceSources(input).entries).toEqual([taskEntry]);
      }
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
      expect(f.store.reportTaskSourceBindingOperation(reportInput)).toEqual(observed);
      const peer = f.seedPeerReservation({ workId: 'historical-source-peer', executionOnly: true });
      const peerHost = presentSnapshot(peer.host);
      const peerRoot = path.join(f.root, 'foreign-unissued-task-source');
      const peerRequest: TaskSourceBindingRequest = {
        ...f.request,
        operation_id: 'foreign-source-prepared',
        request_id: 'foreign-source-prepared-request',
        work_id: peer.identity.work_id,
        thread_id: peer.thread_id,
        source_root: peerRoot,
        branch_ref: 'refs/heads/codex/foreign-unissued-source',
        expected_host: {
          work: peerHost.workVersion,
          ledger: peerHost.ledgerVersion,
          journal: { attempt: 1, version: peer.journal.version },
          maintenance_generation: peerHost.maintenanceGeneration,
        },
      };
      const peerPrepared = f.store.prepareTaskSourceBindingOperation({
        request: peerRequest,
        identity: peer.identity,
        verifyCurrent: f.trustedVerifyCurrent,
      });
      expect(peerPrepared.status).toBe('prepared');
      const withPeerRows = readFixtureHostRows(f.database);
      const preparedPeerRows = f.database.query(
        'SELECT * FROM agent_host_task_source_binding_operation ORDER BY operation_id',
      );
      const withPeerPreparations = preparedPeerRows.all();
      expect(f.store.readCurrentTaskSourceBinding(peer.identity, peer.thread_id, 1)).toBeNull();
      expect(() => f.store.readCurrentTaskSourceBinding(f.identity, f.request.thread_id, 1)).toThrow(
        'current task Source bytes differ from the durable Host journal scope',
      );
      expect(f.store.snapshotHistoricalTaskSourceSources(input).entries).toEqual([taskEntry]);
      expect(readFixtureHostRows(f.database)).toEqual(withPeerRows);
      expect(preparedPeerRows.all()).toEqual(withPeerPreparations);
      expect(existsSync(peerRoot)).toBe(false);
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            f.close(() => completed && performance.now() < deadline);
            if (performance.now() >= deadline) throw new Error('TaskSource fixture exhausted its case deadline.');
          },
        ],
        primaryFailure,
      );
      if (completed) preserveHostFixtureRoot = false;
    }
  },
);

test('task-source policy denials preserve preparation and queued retries preserve native FIFO', async () => {
  const deadline = performance.now() + 5_000;
  const denial = new Error('fixture trusted policy denied');
  type PolicyDecision = Awaited<ReturnType<typeof trustedTaskSourcePolicyDecision>>;
  const invalidModes = [
    'null',
    'scalar',
    'extra',
    'operation',
    'request',
    'hash',
    'authorization',
    'deny',
    'edictum-operation',
    'edictum-hash',
    'edictum-evaluation',
    'edictum-action',
    'cas',
    'preflight',
    'source-format',
    'source-mismatch',
  ] as const;
  const invalidDecisions: Record<(typeof invalidModes)[number], (allowed: PolicyDecision) => unknown> = {
    null: () => null,
    scalar: () => 'not a policy decision',
    extra: (allowed) => ({ ...allowed, unexpected: true }),
    operation: (allowed) => ({ ...allowed, operation_id: allowed.operation_id + '-foreign' }),
    request: (allowed) => ({ ...allowed, request_id: allowed.request_id + '-foreign' }),
    hash: (allowed) => ({ ...allowed, operation_hash: '0'.repeat(64) }),
    authorization: (allowed) => ({ ...allowed, authorization: undefined }),
    deny: (allowed) => ({ ...allowed, authorization: { decision: 'deny', diagnostics: [] } }),
    'edictum-operation': (allowed) => ({ ...allowed, edictum_operation: undefined }),
    'edictum-hash': (allowed) => ({
      ...allowed,
      edictum_operation: { ...allowed.edictum_operation, operation_hash: '0'.repeat(64) },
    }),
    'edictum-evaluation': (allowed) => ({ ...allowed, edictum_evaluation: undefined }),
    'edictum-action': (allowed) => ({
      ...allowed,
      edictum_evaluation: { ...allowed.edictum_evaluation, action: 'deny' },
    }),
    cas: (allowed) => ({
      ...allowed,
      prepared_record_cas: { ...allowed.prepared_record_cas, operation_id: 'foreign-operation' },
    }),
    preflight: (allowed) => ({ ...allowed, preflight_evidence_digest: 'invalid' }),
    'source-format': (allowed) => ({ ...allowed, source_authorization_sha256: 'invalid' }),
    'source-mismatch': (allowed) => ({ ...allowed, source_authorization_sha256: 'd'.repeat(64) }),
  };
  let mode: 'throw' | 'allow' | (typeof invalidModes)[number] = 'throw';
  const policy = mock(
    async ({ request }: Parameters<NonNullable<ConstructorParameters<typeof HostStateStore>[8]>['verify']>[0]) => {
      if (mode === 'throw') throw denial;
      const allowed = trustedTaskSourcePolicyDecision(request);
      if (mode === 'allow') return allowed;
      // Deliberately violate the provider's static return contract at its runtime
      // trust boundary; Host must reject the actual malformed bytes/shape.
      return invalidDecisions[mode](allowed) as PolicyDecision;
    },
  );
  const retainedResources = ['execution:task-source-expiry', 'branch:refs/heads/accepted-source'];
  const f = createTaskSourceHostFixture({ policyVerifier: policy, retainedResources });
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const peer = f.seedPeerReservation();
    const prepared = f.prepare();
    const before = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    const peerBefore = presentSnapshot(f.store.readHostStateSnapshot(peer.identity));
    const journalBefore = f.store.readWorkSessionJournal(f.identity);
    const nativeBefore = readFixtureHostRows(f.database);
    const preparedRows = f.database.query(
      'SELECT * FROM agent_host_task_source_binding_operation ORDER BY operation_id',
    );
    const originalPreparedRows = preparedRows.all();
    const sourceRoot = path.resolve(requiredValue(f.request.source_root, 'Proposed TaskSource root'));
    expect(existsSync(sourceRoot)).toBe(false);
    for (const value of ['throw', ...invalidModes] as const) {
      mode = value;
      await Promise.resolve(
        expect(f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity })).rejects.toThrow(
          value === 'throw' ? denial : 'task source mutation policy evidence is invalid or denied',
        ),
      );
      // Exact validated native beforeimages cover Work, ledger and Journal
      // without re-decoding their full histories for every policy alternative.
      expect(readFixtureHostRows(f.database)).toEqual(nativeBefore);
      expect(preparedRows.all()).toEqual(originalPreparedRows);
      expect(existsSync(sourceRoot)).toBe(false);
      expect(
        f.database
          .query(
            "SELECT name FROM sqlite_master WHERE name IN ('agent_host_task_source_binding_action','agent_host_task_source_binding_claim')",
          )
          .all(),
      ).toEqual([]);
    }
    expect(policy).toHaveBeenCalledTimes(invalidModes.length + 1);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    expect(f.prepare()).toEqual(prepared);
    mode = 'allow';
    const queued = await f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity });
    expect(queued).toEqual({
      schema: 'TaskSourceBindingActionResult/v1',
      status: 'queued',
      operation_id: f.request.operation_id,
      request_id: f.request.request_id,
      action: null,
      state_version: null,
      command_argv: null,
    });
    const reserved = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    const ticketId = `task-source-ticket:${f.request.work_id}:${f.request.attempt}:${f.request.operation_id}`;
    const ticket = requiredValue(
      reserved.ledger.tickets.find((item) => item.ticket_id === ticketId),
      'queued ticket',
    );
    expect(ticket).toMatchObject({
      status: 'queued',
      sequence: 3,
      claim_ids: [],
      active_resources: [],
      expires_at: null,
    });
    expect(ticket.blocked_resources).toEqual(ticket.exclusive_resources);
    expect(ticket.blocked_resources).toContain(`branch:${f.request.branch_ref}`);
    for (const resource of retainedResources) expect(ticket.blocked_resources).toContain(resource);
    const queuedNativeBefore = readFixtureHostRows(f.database);
    const queuedPolicy = requiredValue(policy.mock.calls.at(-1)?.[0], 'native queued policy input');
    // Adverse pure inputs never become persisted Host authority.
    for (const revision of [reserved.workVersion.revision, f.request.expected_host.work.revision]) {
      const staleRequest = {
        ...f.request,
        expected_host: {
          ...f.request.expected_host,
          work: { revision, digest: '0'.repeat(64) },
        },
      };
      expect(() =>
        createTaskSourceMutationPolicyRequest({
          repositoryRoot: queuedPolicy.repositoryRoot,
          operation: { ...queuedPolicy.operation, request: staleRequest },
          preparedStateVersion: queuedPolicy.stateVersion,
          hostSnapshot: reserved,
        }),
      ).toThrow('task source mutation request is stale, same-root, or not a create proposal');
    }
    const addedResources = [
      `branch:${f.request.branch_ref}`,
      `worktree:${process.platform === 'win32' ? sourceRoot.toLocaleLowerCase('en-US') : sourceRoot}`,
    ];
    for (const omitted of addedResources) {
      expect(reserved.work.binding.allowed_resources).toContain(omitted);
      const work = {
        ...reserved.work,
        binding: {
          ...reserved.work.binding,
          allowed_resources: reserved.work.binding.allowed_resources.filter((resource) => resource !== omitted),
        },
      };
      expect(work.binding.allowed_resources).not.toContain(omitted);
      expect(() =>
        createTaskSourceMutationPolicyRequest({
          repositoryRoot: queuedPolicy.repositoryRoot,
          operation: {
            ...queuedPolicy.operation,
            request: {
              ...f.request,
              expected_host: {
                ...f.request.expected_host,
                work: { ...f.request.expected_host.work, digest: '0'.repeat(64) },
              },
            },
          },
          preparedStateVersion: queuedPolicy.stateVersion,
          hostSnapshot: { ...reserved, work },
        }),
      ).toThrow('task source mutation request is stale, same-root, or not a create proposal');
    }
    const predecessorId = requiredLease(reserved.work).ticket_id;
    const malformedLedger = clone(reserved.ledger);
    const malformedPredecessor = requiredValue(
      malformedLedger.tickets.find((entry) => entry.ticket_id === predecessorId),
      'malformed DTO predecessor',
    );
    expect(Reflect.deleteProperty(malformedPredecessor, 'ticket_id')).toBe(true);
    expect(Object.hasOwn(malformedPredecessor, 'ticket_id')).toBe(false);
    const stalePolicyMessage = 'task source mutation request is stale, same-root, or not a create proposal';
    const adverseHosts: {
      hostSnapshot: Parameters<typeof createTaskSourceMutationPolicyRequest>[0]['hostSnapshot'];
      message: string;
    }[] = [
      { hostSnapshot: { ...reserved, work: null }, message: stalePolicyMessage },
      { hostSnapshot: { ...reserved, ledger: null }, message: stalePolicyMessage },
      {
        hostSnapshot: { ...reserved, work: { ...reserved.work, lease: null }, ledger: malformedLedger },
        message: stalePolicyMessage,
      },
    ];
    const activePeerClaim = requiredValue(
      reserved.ledger.claims.find((claim) => claim.status === 'active'),
      'existing active queued-policy peer claim',
    );
    expect(activePeerClaim.ticket_id).not.toBe(ticketId);
    adverseHosts.push({
      hostSnapshot: {
        ...reserved,
        ledger: {
          ...reserved.ledger,
          claims: reserved.ledger.claims.map((claim) =>
            claim.claim_id === activePeerClaim.claim_id ? { ...claim, ticket_id: ticketId } : claim,
          ),
        },
      },
      message: 'queued TaskSource ticket has active or incomplete ownership',
    });
    for (const key of ['repository_id', 'project_ids', 'integrations_digest'] as const) {
      const binding = clone(reserved.work.binding);
      expect(Reflect.deleteProperty(binding, key)).toBe(true);
      expect(Object.hasOwn(binding, key)).toBe(false);
      adverseHosts.push({
        hostSnapshot: { ...reserved, work: { ...reserved.work, binding } },
        message: key === 'project_ids' ? 'work identity project ids invalid' : 'work identity invalid',
      });
    }
    const projectIds = requiredValue(reserved.work.binding.project_ids, 'queued Work project IDs');
    const foreignProject = 'zz-foreign-project';
    expect(projectIds).not.toContain(foreignProject);
    adverseHosts.push({
      hostSnapshot: {
        ...reserved,
        work: {
          ...reserved.work,
          binding: { ...reserved.work.binding, project_ids: [...projectIds, foreignProject].sort() },
        },
      },
      message: 'TaskSource coordination ticket differs from its exact request',
    });
    for (const { hostSnapshot, message } of adverseHosts) {
      expect(() =>
        createTaskSourceMutationPolicyRequest({
          repositoryRoot: queuedPolicy.repositoryRoot,
          operation: queuedPolicy.operation,
          preparedStateVersion: queuedPolicy.stateVersion,
          hostSnapshot,
        }),
      ).toThrow(message);
    }
    expect(() =>
      createTaskSourceMutationPolicyRequest({
        repositoryRoot: queuedPolicy.repositoryRoot,
        operation: {
          ...queuedPolicy.operation,
          request: {
            ...f.request,
            expected_host: { ...f.request.expected_host, work: reserved.workVersion },
          },
        },
        preparedStateVersion: { ...queuedPolicy.stateVersion, revision: queuedPolicy.stateVersion.revision + 1 },
        hostSnapshot: reserved,
      }),
    ).toThrow('task source mutation request is stale, same-root, or not a create proposal');
    // These snapshots are adverse pure inputs, never persisted or supplied as current Host authority.
    const adverseLedgers: readonly { ledger: CoordinationLedger; message: string }[] = [
      {
        ledger: {
          ...reserved.ledger,
          tickets: reserved.ledger.tickets.map((entry) =>
            entry.ticket_id === ticketId
              ? {
                  ...entry,
                  status: 'released',
                  claim_ids: [],
                  active_resources: [],
                  blocked_resources: [],
                  expires_at: null,
                }
              : entry,
          ),
        },
        message: 'TaskSource ticket is terminal or not ready for issue',
      },
      {
        ledger: {
          ...reserved.ledger,
          tickets: reserved.ledger.tickets.filter((entry) => entry.ticket_id !== predecessorId),
        },
        message: 'task source mutation request is stale, same-root, or not a create proposal',
      },
      {
        ledger: {
          ...reserved.ledger,
          tickets: reserved.ledger.tickets.filter((entry) => entry.ticket_id !== ticketId),
        },
        message: 'task source mutation request is stale, same-root, or not a create proposal',
      },
    ];
    for (const adverse of adverseLedgers)
      expect(() =>
        createTaskSourceMutationPolicyRequest({
          repositoryRoot: queuedPolicy.repositoryRoot,
          operation: queuedPolicy.operation,
          preparedStateVersion: queuedPolicy.stateVersion,
          hostSnapshot: { ...reserved, ledger: adverse.ledger },
        }),
      ).toThrow(adverse.message);
    expect(readFixtureHostRows(f.database)).toEqual(queuedNativeBefore);
    expect(preparedRows.all()).toEqual(originalPreparedRows);
    expect(existsSync(sourceRoot)).toBe(false);
    expect(reserved.ledger.tickets.find((item) => item.ticket_id === before.work.lease?.ticket_id)).toEqual(
      before.ledger.tickets.find((item) => item.ticket_id === before.work.lease?.ticket_id),
    );
    expect(reserved.ledger.claims.filter((claim) => claim.ticket_id === before.work.lease?.ticket_id)).toEqual(
      before.ledger.claims.filter((claim) => claim.ticket_id === before.work.lease?.ticket_id),
    );
    expect(reserved.work.lease).toEqual(before.work.lease);
    expect(reserved.ledger.claims.filter((claim) => claim.ticket_id === ticketId)).toEqual([]);
    expect(f.store.readHostStateSnapshot(peer.identity).work).toEqual(peerBefore.work);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    expect(await f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity })).toEqual(queued);
    expect(policy).toHaveBeenCalledTimes(invalidModes.length + 3);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(reserved);
    expect(f.store.readHostStateSnapshot(peer.identity).work).toEqual(peerBefore.work);
    expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journalBefore);
    expect(f.prepare()).toEqual(prepared);
    expect(
      f.database
        .query(
          "SELECT name FROM sqlite_master WHERE name IN ('agent_host_task_source_binding_action','agent_host_task_source_binding_claim')",
        )
        .all(),
    ).toEqual([]);
    if (performance.now() >= deadline) throw new Error('TaskSource queued retry exhausted its case deadline');
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(() => completed && performance.now() < deadline);
          if (performance.now() >= deadline) throw new Error('TaskSource queued retry cleanup exhausted its deadline');
        },
      ],
      primaryFailure,
    );
  }
});

function assertHistoricalCaptureRefusals(
  input: Parameters<HostStateStore['captureHistoricalTerminalSynthesisAndRelease']>[0],
  store: HostStateStore,
  database: Database,
): void {
  const active = presentSnapshot(store.readHostStateSnapshot(input.identity));
  const nextWork = requiredValue(input.nextWork, 'Historical owner release Work');
  const nextLedger = requiredValue(input.nextLedger, 'Historical owner release ledger');
  const terminal = requiredValue(nextLedger.operations.at(-1), 'Historical release operation');
  const firstPredecessor = requiredValue(input.provenance.predecessor_refs[0], 'Historical predecessor');
  const before = readFixtureHostRows(database);
  const schema = database.query('SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name');
  const schemaBefore = schema.all();
  const requestError = 'historical synthesis custody request invalid';
  const provenanceError = 'historical synthesis provenance invalid';
  const ownerError = 'historical synthesis custody requires one exact active original owner release';
  const releaseError = 'historical synthesis custody release operation is incomplete';
  const variants: readonly [Partial<typeof input>, string][] = [
    [{ attempt: 0 }, requestError],
    [{ actionId: '' }, requestError],
    [{ issueId: '' }, requestError],
    [{ nativeSessionHandle: '' }, requestError],
    [{ userRequestPointer: '' }, requestError],
    [{ userRequestPointer: 'fixture:\ncontrol' }, requestError],
    [{ provenance: { ...input.provenance, followup_ref: '' } }, provenanceError],
    [{ provenance: { ...input.provenance, original_actor_id: '' } }, provenanceError],
    [{ provenance: { ...input.provenance, denial_message: '' } }, provenanceError],
    [{ provenance: { ...input.provenance, predecessor_refs: [] } }, provenanceError],
    [{ provenance: { ...input.provenance, predecessor_refs: [firstPredecessor, firstPredecessor] } }, provenanceError],
    [
      {
        provenance: {
          ...input.provenance,
          predecessor_refs: [firstPredecessor, { result_id: 'distinct-invalid-digest', digest: 'invalid' }],
        },
      },
      provenanceError,
    ],
    [
      { expectedWork: { ...input.expectedWork, revision: input.expectedWork.revision + 1 } },
      'state compare-and-swap conflict',
    ],
    [
      { expectedLedger: { ...input.expectedLedger, revision: input.expectedLedger.revision + 1 } },
      'state compare-and-swap conflict',
    ],
    [
      { expectedMaintenanceGeneration: input.expectedMaintenanceGeneration + 1 },
      'maintenance generation is stale or missing',
    ],
    [{ nativeSessionHandle: input.nativeSessionHandle + '-foreign' }, ownerError],
    [{ nextWork: { ...nextWork, lease: active.work.lease } }, ownerError],
    [{ nextWork: { ...nextWork, execution: { ...nextWork.execution, status: 'active' } } }, ownerError],
    [{ nextWork: { ...nextWork, revision: nextWork.revision + 1 } }, ownerError],
    [{ nextWork: { ...nextWork, binding: { ...nextWork.binding, config_digest: '0'.repeat(64) } } }, ownerError],
    [{ nextWork: { ...nextWork, execution: { ...nextWork.execution, assignment_attempts: [] } } }, ownerError],
    [{ nextLedger: { ...nextLedger, revision: nextLedger.revision + 1 } }, ownerError],
    [
      {
        nextLedger: {
          ...nextLedger,
          tickets: nextLedger.tickets.filter((entry) => entry.ticket_id !== terminal.ticket_id),
        },
      },
      releaseError,
    ],
    [
      {
        nextLedger: {
          ...nextLedger,
          claims: nextLedger.claims.filter((entry) => entry.ticket_id !== terminal.ticket_id),
        },
      },
      releaseError,
    ],
    [{ nextLedger: { ...nextLedger, operations: nextLedger.operations.slice(0, -1) } }, releaseError],
    [
      {
        nextLedger: {
          ...nextLedger,
          operations: [
            ...nextLedger.operations.slice(0, -1),
            { ...terminal, decision_pointer: 'fixture:foreign-release' },
          ],
        },
      },
      releaseError,
    ],
    [
      { nextWork: { ...nextWork, lifecycle: { ...nextWork.lifecycle, next_action: 'foreign lifecycle afterimage' } } },
      releaseError,
    ],
    [
      { expectedJournal: { ...input.expectedJournal, revision: input.expectedJournal.revision + 1 } },
      'historical synthesis custody Journal CAS differs',
    ],
  ];
  const { nextWork: _nextWork, ...withoutWork } = input;
  const { nextLedger: _nextLedger, ...withoutLedger } = input;
  const requests: readonly [typeof input, string][] = [
    [withoutWork, ownerError],
    [withoutLedger, ownerError],
    ...variants.map(([change, message]): [typeof input, string] => [{ ...input, ...change }, message]),
  ];
  for (const [request, message] of requests) {
    expect(() => store.captureHistoricalTerminalSynthesisAndRelease(request)).toThrow(message);
    expect(readFixtureHostRows(database)).toEqual(before);
    expect(schema.all()).toEqual(schemaBefore);
  }
  expect(store.readHostStateSnapshot(input.identity)).toEqual(active);
}

test('TaskSource promotes its earliest queued reservation after idle peer release while retaining the later waiter', async () => {
  const deadline = performance.now() + 5_000;
  const policy = mock(async ({ request }: { request: Parameters<typeof trustedTaskSourcePolicyDecision>[0] }) =>
    trustedTaskSourcePolicyDecision(request),
  );
  const f = createTaskSourceHostFixture({ policyVerifier: policy });
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const peer = f.seedPeerReservation();
    f.prepare();
    const input = { request: f.request, identity: f.identity };
    expect((await f.store.issueTaskSourceBindingOperation(input)).status).toBe('queued');
    const queued = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    const firstTicketId = `task-source-ticket:${f.request.work_id}:${f.request.attempt}:${f.request.operation_id}`;
    const firstTicketBefore = requiredValue(
      queued.ledger.tickets.find((ticket) => ticket.ticket_id === firstTicketId),
      'first queued ticket',
    );
    const peerBefore = presentSnapshot(f.store.readHostStateSnapshot(peer.identity));
    expect(peer.journal.state.items).toEqual([]);
    expect(peer.journal.state.completed).toEqual([]);
    const released = presentSnapshot(
      suspendLocalWork({
        store: f.store,
        identity: peer.identity,
        journal: peer.journal,
        expectedWork: peerBefore.workVersion,
        expectedLedger: queued.ledgerVersion,
        expectedMaintenanceGeneration: queued.maintenanceGeneration,
        nativeSessionHandle: peer.thread_id,
        userRequestPointer: 'fixture:release-idle-task-source-peer',
        requestIntent: 'next_work',
        documentationContext: {
          repository_root: f.root,
          repository_id: peer.identity.repository_id,
          project_id: requiredValue(peer.identity.project_ids[0], 'peer project'),
          work_id: peer.identity.work_id,
        },
      }),
    );
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(
      released.ledger.tickets.find((ticket) => ticket.ticket_id === peerBefore.work.lease?.ticket_id),
    ).toMatchObject({
      status: 'released',
      active_resources: [],
      blocked_resources: [],
      expires_at: null,
    });
    expect(
      released.ledger.claims
        .filter((claim) => claim.ticket_id === peerBefore.work.lease?.ticket_id)
        .map((claim) => claim.status),
    ).toEqual(['released']);
    const waiter = f.seedPeerReservation({ workId: 'task-source-waiter', executionOnly: true });
    const current = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    const waiterBefore = presentSnapshot(f.store.readHostStateSnapshot(waiter.identity));
    expect(current.work).toEqual(queued.work);
    const laterRequest = {
      ...f.request,
      operation_id: f.request.operation_id + '-later',
      request_id: f.request.request_id + '-later',
      work_id: waiter.identity.work_id,
      thread_id: waiter.thread_id,
      expected_host: {
        ...f.request.expected_host,
        work: waiterBefore.workVersion,
        ledger: current.ledgerVersion,
        journal: { attempt: 1, version: waiter.journal.version },
        maintenance_generation: current.maintenanceGeneration,
      },
    };
    const laterInput = { request: laterRequest, identity: waiter.identity };
    f.store.prepareTaskSourceBindingOperation({ ...laterInput, verifyCurrent: f.trustedVerifyCurrent });
    expect((await f.store.issueTaskSourceBindingOperation(laterInput)).status).toBe('queued');
    const withWaiter = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    const waitingOwner = presentSnapshot(f.store.readHostStateSnapshot(waiter.identity));
    const laterTicketId = `task-source-ticket:${laterRequest.work_id}:${laterRequest.attempt}:${laterRequest.operation_id}`;
    const laterTicketBefore = requiredValue(
      withWaiter.ledger.tickets.find((ticket) => ticket.ticket_id === laterTicketId),
      'later queued ticket',
    );
    expect(laterTicketBefore.sequence).toBeGreaterThan(firstTicketBefore.sequence);
    expect(laterTicketBefore.status).toBe('queued');
    expect(laterTicketBefore.claim_ids).toEqual([]);
    expect(withWaiter.work.lease).toEqual(queued.work.lease);
    expect(withWaiter.ledger.tickets.find((ticket) => ticket.ticket_id === firstTicketId)).toEqual(firstTicketBefore);
    const issued = await f.store.issueTaskSourceBindingOperation(input);
    expect(issued.status).toBe('issued');
    expect(issued.command_argv).not.toBeNull();
    const after = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    expect(after.work.lease?.ticket_id).toBe(firstTicketId);
    const promoted = requiredValue(
      after.ledger.tickets.find((ticket) => ticket.ticket_id === firstTicketId),
      'promoted first ticket',
    );
    expect(promoted).toMatchObject({
      status: 'active',
      sequence: firstTicketBefore.sequence,
      exclusive_resources: firstTicketBefore.exclusive_resources,
      active_resources: firstTicketBefore.exclusive_resources,
      blocked_resources: [],
    });
    const claims = after.ledger.claims.filter((claim) => claim.ticket_id === firstTicketId);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ status: 'active', resources: promoted.exclusive_resources });
    expect(promoted.claim_ids).toEqual([requiredValue(claims[0], 'promoted claim').claim_id]);
    expect(after.ledger.tickets.find((ticket) => ticket.ticket_id === laterTicketId)).toEqual(laterTicketBefore);
    expect(after.ledger.claims.filter((claim) => claim.ticket_id === laterTicketId)).toEqual([]);
    expect(f.store.readHostStateSnapshot(peer.identity).work).toEqual(released.work);
    expect(f.store.readHostStateSnapshot(waiter.identity).work).toEqual(waitingOwner.work);
    expect(f.store.readWorkSessionJournal(waiter.identity)?.state).toEqual(waiter.journal.state);
    expect(f.store.readWorkSessionJournal(peer.identity)?.state).toEqual(peer.journal.state);
    expect(f.store.readWorkSessionJournal(f.identity)?.state).toEqual(f.journal);
    expect(await f.store.issueTaskSourceBindingOperation(input)).toEqual({
      ...issued,
      status: 'already_issued',
      command_argv: null,
    });
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
    const nativeAfter = readFixtureHostRows(f.database);
    expect(await f.store.issueTaskSourceBindingOperation(laterInput)).toMatchObject({
      status: 'queued',
      action: null,
      state_version: null,
      command_argv: null,
    });
    expect(readFixtureHostRows(f.database)).toEqual(nativeAfter);
    expect(existsSync(requiredValue(f.request.source_root, 'proposed Source root'))).toBe(false);
    expect(performance.now()).toBeLessThan(deadline);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(false, completed ? 'issued promoted proposal without observation; no replay' : 'failed or timed out');
          if (performance.now() >= deadline) throw new Error('TaskSource promotion cleanup exhausted its deadline');
        },
      ],
      primaryFailure,
    );
  }
});

test('trusted Host continuation atomically retains historical evidence and never reissues its review on retry', async () => {
  const deadline = performance.now() + 5_000;
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'delivered-work-continuation-'));
  let configRoot: string | undefined;
  let f: Awaited<ReturnType<typeof continuationFixture>> | undefined;
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  const retain = () => {
    retainContinuationFixtureRoot(fixtureRoot);
    if (configRoot) retainContinuationFixtureRoot(configRoot);
  };
  try {
    // Maintained trusted-caller fixture; this does not establish external approval or Runtime acceptance.
    configRoot = continuationFixtureRepositoryRoot();
    const current = await continuationFixture({
      root: fixtureRoot,
      completedAttempt: true,
      disjointPeer: true,
      lifecycleScopeReference: true,
      beforeCapture: assertHistoricalCaptureRefusals,
    });
    f = current;
    if (performance.now() >= deadline) throw new Error('Host continuation fixture exhausted its case deadline.');
    const request = continuationRequestFor(f);
    const before = presentSnapshot(current.store.readHostStateSnapshot(current.identity));
    const scopeBytes = requiredValue(current.scopeBytes, 'Backed historical implementation scope');
    const scopeFile = path.join(current.root, '.agent/scope.json');
    expect(readFileSync(scopeFile, 'utf8')).toBe(scopeBytes);
    expect(before.work.binding.scope_contract_digest).toBe(createHash('sha256').update(scopeBytes).digest('hex'));
    expect(before.work.contracts.scope.sha256).toBe(before.work.binding.scope_contract_digest);
    expect(before.work.lifecycle.references).toEqual([
      {
        schema: 'LifecycleArtifactReference/v1',
        kind: 'implementation_scope',
        artifact_schema: 'ImplementationScope/v1',
        record_id: before.work.binding.scope_id,
        path: '.agent/scope.json',
        sha256: before.work.binding.scope_contract_digest,
        source_revision: before.work.binding.work_source_revision,
        scope_id: before.work.binding.scope_id,
        ac_ids: before.work.binding.ac_ids,
        generation: null,
        implementation_fingerprint: null,
        delivery_cycle_id: null,
        principal: null,
        decision: null,
        disposition: 'current',
      },
    ]);
    expect(before.work.execution.assignment_attempts).toHaveLength(1);
    expect(before.work.execution.assignment_attempts[0]).toMatchObject({
      status: 'completed',
      stage_id: 'implementation',
      result: { summary: 'Retained original implementation result.' },
    });
    const journalBefore = current.store.readWorkSessionJournal(current.identity);
    if (!journalBefore || journalBefore.state.step_id === null)
      throw new Error('Expected the fixture historical Journal step.');
    const releasedFence = current.store.readMaintenanceFence();
    if (!releasedFence || releasedFence.status !== 'released')
      throw new Error('Expected a real released fixture fence.');
    const captureRead = current.store.readHistoricalTerminalSynthesisCaptureForRequest(current.captureInput);
    expect(captureRead).toEqual({
      snapshot: before,
      request_digest: current.capture.request_digest,
      receipt: current.capture,
    });
    expect(current.store.captureHistoricalTerminalSynthesisAndRelease(current.captureInput)).toEqual(
      requiredValue(captureRead, 'Request-bound historical capture'),
    );
    expect(
      current.store.readHistoricalTerminalSynthesisCaptureForRequest({
        ...current.captureInput,
        actionId: '0'.repeat(64),
      }),
    ).toBeNull();
    expect(() =>
      current.db
        .transaction(() => current.store.readHistoricalTerminalSynthesisCaptureForRequest(current.captureInput))
        .deferred(),
    ).toThrow('nested historical synthesis custody read forbidden');
    expect(() =>
      current.store.readHistoricalTerminalSynthesisCaptureForRequest({
        ...current.captureInput,
        bodyBytes: Buffer.from('changed historical body'),
      }),
    ).toThrow('historical synthesis custody exact retry differs');
    expect(current.store.readHostStateSnapshot(current.identity)).toEqual(before);
    expect(current.store.readWorkSessionJournal(current.identity)).toEqual(journalBefore);
    expect(current.store.readTerminalHostStateSnapshot(current.identity, releasedFence)).toEqual(before);
    expect(() => current.store.readTerminalHostStateSnapshot(current.identity, null)).toThrow(
      'terminal maintenance snapshot drift',
    );
    expect(() =>
      current.db
        .transaction(() => current.store.readTerminalHostStateSnapshot(current.identity, releasedFence))
        .deferred(),
    ).toThrow('nested terminal host inspection forbidden');
    expect(current.store.readFailedPrewriterRecoveryReceipt(current.identity, 1)).toBeNull();
    expect(() => current.store.readFailedPrewriterRecoveryReceipt(current.identity, 0)).toThrow(
      'failed prewriter recovery inspection requires a valid nonnested attempt',
    );
    expect(current.store.readCompletedSourceReportRecoveryReceipt(current.identity, 1)).toBeNull();
    expect(() => current.store.readCompletedSourceReportRecoveryReceipt(current.identity, 0)).toThrow(
      'completed Source report recovery receipt inspection identity invalid',
    );
    expect(() => current.store.readCompletedSourceReportRecoveryState(current.identity, 1)).toThrow(
      'Host, Journal or original Source continuation is missing',
    );
    expect(() => current.store.readCompletedSourceReportRecoveryState(current.identity, 0)).toThrow(
      'completed Source report recovery state inspection identity invalid',
    );
    expect(current.store.readInitialSourceContinuationReceipt(current.identity, 1)).toBeNull();
    expect(current.store.readInitialSourceFrontierCodeRebindReceipt(current.identity, 1, 'a'.repeat(64))).toBeNull();
    expect(current.store.readDeliveredWorkContinuationReceipt(current.identity, 1)).toBeNull();
    expect(current.store.readQualifiedRuntimeCodeContinuations(current.identity, 1)).toEqual([]);
    const terminal = journalBefore.state.items[0];
    if (!terminal?.issue_id) throw new Error('Expected the genuine fixture terminal action identity.');
    expect(
      current.store.findArchivedReportedObservation(current.identity.work_id, 1, {
        action_id: terminal.request.action_id,
        issue_id: terminal.issue_id,
      }),
    ).toBeNull();
    expect(() => current.store.assertMaintenancePlanningAuthority(releasedFence.binding)).toThrow(
      'trusted maintenance planning and release verifiers required',
    );
    expect(current.store.readHostStateSnapshot(current.identity)).toEqual(before);
    expect(current.store.readWorkSessionJournal(current.identity)).toEqual(journalBefore);
    expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toBeNull();
    await Promise.resolve(
      expect(
        current.store.continueDeliveredWork({
          ...request,
          expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 },
        }),
      ).rejects.toThrow('original known-terminal work, captured body, owner or current review action changed'),
    );
    expect(current.store.readHostStateSnapshot(current.identity)).toEqual(before);
    expect(current.store.readWorkSessionJournal(current.identity)).toEqual(journalBefore);
    expect(
      current.db.query("SELECT name FROM sqlite_master WHERE name='agent_host_delivered_work_continuation'").get(),
    ).toBeNull();
    const result = await current.store.continueDeliveredWork(request);
    const after = presentSnapshot(result.snapshot);
    const journalAfter = current.store.readWorkSessionJournal(current.identity);
    if (!journalAfter) throw new Error('Expected the continued Journal.');
    expect(result.status).toBe('continued');
    expect(result.action).toEqual(request.action);
    expect(after.workVersion.revision).toBe(before.workVersion.revision + 1);
    expect(after.ledgerVersion.revision).toBe(before.ledgerVersion.revision + 1);
    expect(journalAfter.version.revision).toBe(journalBefore.version.revision + 1);
    expect(after.work.binding).toMatchObject({
      lifecycle_work_id: current.identity.work_id,
      config_digest: request.targetConfigDigest,
      work_source_revision: request.currentSourceScope.digest,
      runtime_code_digest: request.targetRuntimeCodeDigest,
      runtime_source_revision: request.targetRuntimeCodeDigest,
      schema_digest: request.targetSchemaDigest,
    });
    expect(after.work.execution.status).toBe('active');
    expect(after.work.lifecycle.source_revision).toBe(request.currentSourceScope.digest);
    expect(after.work.lifecycle.references).toEqual(
      before.work.lifecycle.references.map((reference) => ({
        ...reference,
        source_revision: request.currentSourceScope.digest,
        disposition: 'retired',
      })),
    );
    expect(readFileSync(scopeFile, 'utf8')).toBe(scopeBytes);
    expect(after.work.execution.assignment_attempts).toEqual(before.work.execution.assignment_attempts);
    expect(after.work.lease?.thread_id).toBe(current.threadId);
    expect(result.receipt).toMatchObject({
      prior_work: before.work,
      prior_ledger: before.ledger,
      prior_journal: journalBefore.state,
      historical_capture: current.capture,
      rights_granted: false,
      accepted_result: false,
      runtime_acceptance: false,
    });
    expect(journalAfter.state.source_scope).toEqual(request.currentSourceScope);
    expect(journalBefore.state.items).toHaveLength(1);
    expect(journalAfter.state.completed).toEqual([
      ...journalBefore.state.completed,
      { step_id: journalBefore.state.step_id, items: journalBefore.state.items },
    ]);
    expect(journalAfter.state.items).toHaveLength(1);
    expect(journalAfter.state.items[0]).toMatchObject({
      request: request.action.request,
      issue_id: null,
      observation: null,
    });
    const lookup = current.store.readDeliveredWorkContinuation(current.identity, 1);
    if (!lookup) throw new Error('Expected the persisted Host continuation lookup.');
    expect(lookup.receipt).toEqual(result.receipt);
    expect(lookup.snapshot).toEqual(after);
    expect(lookup.journal).toEqual({ state: journalAfter.state, version: journalAfter.version });
    expect(lookup.action_status).toBe('unissued');
    expect(lookup.item_statuses).toEqual(['unissued']);
    expect(lookup.items).toEqual(journalAfter.state.items);
    expect(Object.isFrozen(lookup)).toBe(true);
    const receiptRows = current.db.query<{ payload: string; digest: string }, []>(
      'SELECT payload,digest FROM agent_host_delivered_work_continuation',
    );
    const receiptRow = requiredValue(receiptRows.get(), 'Historical continuation original receipt row');
    const persistedRows = readFixtureHostRows(current.db);
    const absentAttempt = await rejectionReason(
      current.store.continueDeliveredWork({
        ...request,
        attempt: 2,
        expectedWork: after.workVersion,
        expectedLedger: after.ledgerVersion,
        expectedJournal: journalAfter.version,
      }),
    );
    expect(() => {
      throw absentAttempt;
    }).toThrow('original known-terminal work, captured body, owner or current review action changed');
    expect(readFixtureHostRows(current.db)).toEqual(persistedRows);
    expect(receiptRows.get()).toEqual(receiptRow);
    expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toEqual(lookup);
    const retry = await current.store.continueDeliveredWork(request);
    expect(retry).toEqual({ ...result, status: 'already_continued', action: null });
    expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toEqual(lookup);
    expect(current.store.readHostStateSnapshot(current.identity)).toEqual(after);
    expect(current.store.readWorkSessionJournal(current.identity)).toEqual(journalAfter);
    expect(() => current.store.readHistoricalTerminalSynthesisCaptureForRequest(current.captureInput)).toThrow(
      'historical synthesis custody retry follows dependent Host or Journal write',
    );
    expect(() => current.store.readTerminalHostStateSnapshot(current.identity, releasedFence)).toThrow(
      'terminal host inspection requires suspended closed ownership',
    );
    expect(current.store.readFailedPrewriterRecoveryReceipt(current.identity, 1)).toBeNull();
    expect(current.store.readCompletedSourceReportRecoveryReceipt(current.identity, 1)).toBeNull();
    expect(
      current.db
        .query<{ count: number }, []>('SELECT count(*) AS count FROM agent_host_delivered_work_continuation')
        .get()?.count,
    ).toBe(1);
    const peer = requiredValue(current.peer, 'Historical continuation disjoint peer');
    const peerAfter = presentSnapshot(current.store.readHostStateSnapshot(peer.identity));
    expect(peer.ticket.status).toBe('active');
    expect(peer.ticket.exclusive_resources).toEqual(['execution:' + peer.identity.work_id]);
    expect(peer.claim.status).toBe('active');
    expect(peer.claim.resources).toEqual(peer.ticket.exclusive_resources);
    expect(peerAfter.work).toEqual(requiredValue(peer.snapshot.work, 'Original disjoint peer Work'));
    expect(peerAfter.workVersion).toEqual(requiredValue(peer.snapshot.workVersion, 'Original disjoint peer version'));
    expect(peerAfter.ledger.tickets.find((item) => item.ticket_id === peer.ticket.ticket_id)).toEqual(peer.ticket);
    expect(peerAfter.ledger.claims.filter((item) => item.ticket_id === peer.ticket.ticket_id)).toEqual([peer.claim]);
    const journalRow = requiredValue(
      current.db
        .query<RevisionPayloadDigestSqlRow, [string, string]>(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=1',
        )
        .get(current.workspaceId, current.identity.work_id),
      'historical continuation Journal beforeimage',
    );
    const reviewItem = firstOf(journalAfter.state.items, 'historical continuation review item');
    const issuedItem = { ...reviewItem, issue_id: '71e62a38-b44b-470e-b732-81cefbaf983a' };
    const summary = 'Controlled historical review fixture; no executor effect.';
    const reportedItem = {
      ...issuedItem,
      observation: parseSessionBridgeObservation({
        schema: 'VidaSessionObservation/v1',
        action_id: issuedItem.request.action_id,
        issue_id: issuedItem.issue_id,
        agent_id: 'fixture:historical-reviewer',
        tool_call_ref: 'fixture:cooperative-historical-result',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:historical-review-evidence'],
      }),
    };
    const originalReportDigest = reportedItem.observation.output_digest;
    const changedReportDigest = (originalReportDigest.startsWith('0') ? '1' : '0') + originalReportDigest.slice(1);
    for (const variant of [
      { item: issuedItem, status: 'issued' },
      { item: reportedItem, status: 'reported' },
    ] as const) {
      const journal = { ...journalAfter.state, items: [variant.item] };
      withFrontierJournalFixture(current, journalRow, journal, (version) => {
        const controlledRows = readFixtureHostRows(current.db);
        const observed = requiredValue(
          current.store.readDeliveredWorkContinuation(current.identity, 1),
          'controlled historical lookup',
        );
        expect(observed).toEqual({
          ...lookup,
          journal: { state: journal, version },
          item: variant.item,
          items: [variant.item],
          item_statuses: [variant.status],
          action_status: variant.status,
        });
        expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toEqual(observed);
        expect(readFixtureHostRows(current.db)).toEqual(controlledRows);
        expect(receiptRows.get()).toEqual(receiptRow);
      });
      expect(readFixtureHostRows(current.db)).toEqual(persistedRows);
      expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toEqual(lookup);
    }
    for (const item of [
      { ...issuedItem, issue_id: '' },
      { ...reportedItem, observation: { ...reportedItem.observation, action_id: '0'.repeat(64) } },
      {
        ...reportedItem,
        observation: { ...reportedItem.observation, issue_id: '1727e065-c8d6-4db1-b942-7d22388e7954' },
      },
      { ...reportedItem, observation: { ...reportedItem.observation, output_digest: changedReportDigest } },
    ]) {
      withFrontierJournalFixture(current, journalRow, { ...journalAfter.state, items: [item] }, () => {
        const controlledRows = readFixtureHostRows(current.db);
        expect(() => current.store.readDeliveredWorkContinuation(current.identity, 1)).toThrow(
          'delivered-work continuation review issuance is malformed',
        );
        expect(current.db.inTransaction).toBe(false);
        expect(readFixtureHostRows(current.db)).toEqual(controlledRows);
        expect(receiptRows.get()).toEqual(receiptRow);
      });
      expect(readFixtureHostRows(current.db)).toEqual(persistedRows);
      expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toEqual(lookup);
    }
    expect(await current.store.continueDeliveredWork(request)).toEqual(retry);
    expect(
      current.db.query('UPDATE agent_host_delivered_work_continuation SET digest=?').run('0'.repeat(64)).changes,
    ).toBe(1);
    let repairFailure: { error: unknown } | undefined;
    try {
      const inspection = current.store.inspectDeliveredWorkContinuationRepair(
        current.identity,
        1,
        current.capture.action_id,
      );
      expect(inspection.row).toEqual({
        payload: receiptRow.payload,
        before_digest: '0'.repeat(64),
        after_digest: receiptRow.digest,
      });
      expect(inspection.work).toEqual(after.work);
      expect(inspection.ledger).toEqual(after.ledger);
      expect(inspection.journal.state).toEqual(journalAfter.state);
      expect(inspection.journal.revision).toBe(journalAfter.version.revision);
      expect(inspection.journal.digest).toBe(journalAfter.version.digest);
      expect(readFixtureHostRows(current.db)).toEqual(persistedRows);
      expect(
        current.store.inspectDeliveredWorkContinuationRepair(current.identity, 1, current.capture.action_id),
      ).toEqual(inspection);
      expect(current.db.query('SELECT payload,digest FROM agent_host_delivered_work_continuation').get()).toEqual({
        payload: receiptRow.payload,
        digest: '0'.repeat(64),
      });
    } catch (error) {
      repairFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            expect(
              current.db.query('UPDATE agent_host_delivered_work_continuation SET digest=?').run(receiptRow.digest)
                .changes,
            ).toBe(1);
          },
        ],
        repairFailure,
      );
    }
    expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toEqual(lookup);
    expect(readFixtureHostRows(current.db)).toEqual(persistedRows);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          // closeDatabase removes the handle from the shared cleanup registry; keep its admission check here.
          try {
            if (f && hasUnresolvedFixtureOperations(f.db)) retain();
          } catch (error) {
            retain();
            throw error;
          }
        },
        () => {
          try {
            f?.closeDatabase();
          } catch (error) {
            retain();
            throw error;
          }
        },
        () => {
          if (!completed || performance.now() >= deadline) retain();
          cleanupContinuationFixtures();
        },
      ],
      primaryFailure,
    );
  }
});

test('historical capture releases its original owner while preserving the same-owner queue and denying continuation', async () => {
  const deadline = performance.now() + 5_000;
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'delivered-work-continuation-'));
  let configRoot: string | undefined;
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    configRoot = continuationFixtureRepositoryRoot();
    const current = await continuationFixture({ root: fixtureRoot, queued: true });
    const before = presentSnapshot(current.store.readHostStateSnapshot(current.identity));
    const queued = before.ledger.tickets.filter((ticket) => ticket.status === 'queued');
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({
      work_id: current.identity.work_id,
      thread_id: current.threadId,
      generation: before.ledger.open_generation,
      source_revision: before.work.binding.work_source_revision,
      claim_ids: [],
      active_resources: [],
      exclusive_resources: ['execution:' + current.identity.work_id],
    });
    expect(before.ledger.claims.filter((claim) => claim.ticket_id === queued[0]?.ticket_id)).toEqual([]);
    expect(before.work.lease).toBeNull();
    expect(before.work.execution.status).toBe('suspended');
    expect(current.store.captureHistoricalTerminalSynthesisAndRelease(current.captureInput)).toEqual({
      snapshot: before,
      request_digest: current.capture.request_digest,
      receipt: current.capture,
    });
    const journal = current.store.readWorkSessionJournal(current.identity);
    const rowsBefore = readFixtureHostRows(current.db);
    const captured = current.db.query('SELECT payload,digest FROM agent_host_historical_terminal_synthesis_capture');
    const captureBefore = captured.all();
    await expectRejection(current.store.continueDeliveredWork(continuationRequestFor(current)), /FIFO/);
    expect(readFixtureHostRows(current.db)).toEqual(rowsBefore);
    expect(captured.all()).toEqual(captureBefore);
    expect(current.store.readHostStateSnapshot(current.identity)).toEqual(before);
    expect(current.store.readWorkSessionJournal(current.identity)).toEqual(journal);
    expect(current.store.readDeliveredWorkContinuation(current.identity, 1)).toBeNull();
    expect(performance.now()).toBeLessThan(deadline);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          if (!completed || performance.now() >= deadline) {
            retainContinuationFixtureRoot(fixtureRoot);
            if (configRoot) retainContinuationFixtureRoot(configRoot);
          }
          cleanupContinuationFixtures();
        },
      ],
      primaryFailure,
    );
  }
});

test('configured continuation lookup exposes the complete prewriter wave and each retained issue status', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  await withConfiguredFrontierHostFixture((f, { workspaceId, input }) => {
    bindFrontierContractReferences(input);
    seedFrontierHostFixture(f, input);
    const before = requiredValue(
      f.store.readDeliveredWorkContinuation(f.identity, 1),
      'configured continuation before lookup',
    );
    const beforeViewRows = readFixtureHostRows(f.db);
    expect(f.store.readDeliveredWorkContinuationReceipt(f.identity, 2)).toBeNull();
    const beforeView = requiredValue(
      f.store.readConfiguredFrontierRecoveryView(f.identity, 1),
      'configured original recovery view',
    );
    expect(beforeView).toEqual({ original: input.receipt, recovery: null });
    expect(Object.isFrozen(beforeView)).toBe(true);
    expect(f.store.readConfiguredFrontierRecoveryView(f.identity, 1)).toEqual(beforeView);
    expect(readFixtureHostRows(f.db)).toEqual(beforeViewRows);
    const beforeJournal = requiredValue(before.journal, 'configured continuation journal');
    const beforeItem = requiredValue(before.item, 'configured continuation item');
    const beforeLedger = requiredValue(before.snapshot.ledger, 'configured continuation ledger');
    const beforeTicket = requiredValue(beforeLedger.tickets[0], 'configured continuation ticket');
    for (const value of [
      before,
      before.receipt,
      before.snapshot,
      beforeJournal,
      beforeJournal.state,
      beforeItem,
      before.items,
      before.item_statuses,
      beforeItem.request,
      beforeTicket.exclusive_resources,
    ])
      expect(Object.isFrozen(value)).toBe(true);
    expect(before.items.map((item) => item.request.role)).toEqual(['source-planner', 'security-prewriter']);
    expect(before.item_statuses).toEqual(['unissued', 'unissued']);
    expect(before.items.some((item) => item.request.action_id === input.receipt.request.action.request.action_id)).toBe(
      false,
    );
    const row = requiredValue(
      f.db
        .query<RevisionPayloadDigestSqlRow, [string, string]>(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=1',
        )
        .get(workspaceId, f.identity.work_id),
      'configured continuation native Journal',
    );
    const issueIds = ['71e62a38-b44b-470e-b732-81cefbaf983a', '1727e065-c8d6-4db1-b942-7d22388e7954'];
    const issuedItems = beforeJournal.state.items.map((item, index) => ({
      ...item,
      issue_id: requiredValue(issueIds[index], 'controlled issue id'),
    }));
    const summary = 'Controlled persisted reviewer result; no executor effect.';
    const reportedItems = issuedItems.map((item) => ({
      ...item,
      observation: parseSessionBridgeObservation({
        schema: 'VidaSessionObservation/v1',
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        agent_id: 'fixture:reviewer',
        tool_call_ref: 'fixture:cooperative-result',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:review-evidence'],
      }),
    }));
    const firstIssued = requiredValue(issuedItems[0], 'first controlled issued item');
    const firstReported = requiredValue(reportedItems[0], 'first controlled reported item');
    const secondUnissued = requiredValue(beforeJournal.state.items[1], 'second unissued item');
    const states = [
      { items: [firstIssued, secondUnissued], statuses: ['issued', 'unissued'], action: 'issued' },
      { items: [firstReported, secondUnissued], statuses: ['reported', 'unissued'], action: 'issued' },
      { items: reportedItems, statuses: ['reported', 'reported'], action: 'reported' },
    ] as const;
    for (const variant of states) {
      const journal = { ...beforeJournal.state, items: [...variant.items] };
      withFrontierJournalFixture(f, row, journal, (version) => {
        const observed = requiredValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'controlled lookup');
        expect(observed.item_statuses).toEqual(variant.statuses);
        expect(observed.action_status).toBe(variant.action);
        expect(observed.journal).toEqual({ state: journal, version });
        expect(observed.journal.state.completed).toEqual(input.receipt.prior_journal.completed);
        expect(observed.receipt).toEqual(before.receipt);
        expect(observed.snapshot).toEqual(before.snapshot);
        expect(f.store.readDeliveredWorkContinuation(f.identity, 1)).toEqual(observed);
      });
      expect(f.store.readDeliveredWorkContinuation(f.identity, 1)).toEqual(before);
    }
    const corrupt = { ...beforeJournal.state, items: [firstIssued] };
    withFrontierJournalFixture(f, row, corrupt, () => {
      expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow(
        'configured-frontier lookup current reviewer wave or issue custody differs',
      );
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before.snapshot);
    });
    expect(f.store.readDeliveredWorkContinuation(f.identity, 1)).toEqual(before);
    expect(
      f.db
        .query<RevisionPayloadDigestSqlRow, [string, string]>(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=1',
        )
        .get(workspaceId, f.identity.work_id),
    ).toEqual(row);
    expect(() => f.store.readDeliveredWorkContinuation(f.identity, 0)).toThrow(
      'delivered-work continuation attempt is invalid',
    );
    expect(() => f.db.transaction(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).deferred()).toThrow(
      'nested delivered-work continuation inspection forbidden',
    );
    expect(f.store.readDeliveredWorkContinuation(f.identity, 2)).toBeNull();
    const controlled = { ...beforeJournal.state, items: [firstIssued, secondUnissued] };
    const failure = new Error('controlled frontier Journal assertion failure');
    let observedFailure: unknown;
    try {
      withFrontierJournalFixture(f, row, controlled, () => {
        throw failure;
      });
    } catch (error) {
      observedFailure = error;
    }
    expect(observedFailure).toBe(failure);
    expect(f.store.readDeliveredWorkContinuation(f.identity, 1)).toEqual(before);
    expect(() =>
      withFrontierJournalFixture(f, { ...row, revision: row.revision + 1 }, controlled, () => undefined),
    ).toThrow('Configured frontier Journal fixture beforeimage changed.');
    expect(f.store.readDeliveredWorkContinuation(f.identity, 1)).toEqual(before);
    const ledger = new MastraSessionLedger(f.db, workspaceId, f.config, f.root, f.store);
    let current = requiredValue(ledger.resume(f.identity.work_id, 1), 'Native prewriter Journal before issue');
    expect(current.state).toEqual(beforeJournal.state);
    current = ledger.issueWave(f.identity.work_id, 1, current.version);
    const issuedLookup = requiredValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'Native issued lookup');
    expect(issuedLookup.item_statuses).toEqual(['issued', 'issued']);
    expect(issuedLookup.action_status).toBe('issued');
    expect(issuedLookup.journal.version).toEqual(current.version);
    expect(issuedLookup.receipt).toEqual(before.receipt);
    const planner = requiredValue(current.state.items[0], 'Native Source planner');
    expect(planner.request.role).toBe('source-planner');
    // Controlled readonly caller reports exercise persistence, not independent native review.
    const originalWork = requiredValue(before.snapshot.work, 'Native prewriter Work');
    const preparation = createPrewriterPreparationObservation(
      { request: planner.request, issue_id: requiredValue(planner.issue_id, 'Native planner issue identity') },
      { work: originalWork, workId: f.identity.work_id },
      1,
    );
    const plannerSummary = JSON.stringify(preparation),
      observation = parseSessionBridgeObservation({
        schema: 'VidaSessionObservation/v1',
        action_id: planner.request.action_id,
        issue_id: requiredValue(planner.issue_id, 'Native planner issue identity'),
        agent_id: preparation.observer_id,
        tool_call_ref: 'fixture:synthetic-planner-call',
        status: 'reported_complete',
        summary: plannerSummary,
        output_digest: canonicalJsonDigest(plannerSummary),
        evidence_refs: preparation.evidence_refs,
      }),
      source = requiredValue(current.state.source_scope, 'Native prewriter Source scope');
    current = ledger.report(f.identity.work_id, 1, current.version, observation, source);
    const planned = readPresentSnapshot(f.store, f.identity);
    expect(planned.work.lifecycle.phase).toBe('PLAN');
    expect(planned.work.binding).toEqual(originalWork.binding);
    expect(planned.work.lease).toEqual(originalWork.lease);
    const observed = requiredValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'Native reported lookup');
    expect(observed.item_statuses).toEqual(['reported', 'issued']);
    expect(observed.action_status).toBe('issued');
    expect(observed.journal).toEqual({ state: current.state, version: current.version });
    expect(observed.journal.state.completed).toEqual(beforeJournal.state.completed);
    expect(observed.journal.state.step_id).toBe(beforeJournal.state.step_id);
    expect(observed.receipt).toEqual(before.receipt);
    expect(observed.snapshot).toEqual(planned);
    expect(f.store.readDeliveredWorkContinuation(f.identity, 1)).toEqual(observed);
    expect(ledger.resume(f.identity.work_id, 1)).toEqual(current);
    expect(ledger.report(f.identity.work_id, 1, current.version, observation, source)).toEqual(current);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(planned);
    expect(current.resume_status).toBe('issued_outcome_uncertain');
  });
  preserveHostFixtureRoot = false;
});

test('configured continuation digest repair preserves linked state, fences native producers and resumes exact UNKNOWN', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  await withConfiguredFrontierHostFixture((f, { workspaceId, input }) => {
    seedFrontierHostFixture(f, input);
    const before = readPresentSnapshot(f.store, f.identity);
    const beforeRows = readFixtureHostRows(f.db);
    const row = () =>
      requiredValue(
        f.db
          .query<{ payload: string; digest: string }, [string, string]>(
            'SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=1',
          )
          .get(workspaceId, f.identity.work_id),
        'continuation digest row',
      );
    const governance = () =>
      f.db
        .query<GovernanceSqlRow, []>(
          'SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key',
        )
        .all();
    const originalRow = row();
    const ledger = new MastraSessionLedger(f.db, workspaceId, f.config, f.root, f.store);
    const context = { work_id: 'repair-producer-control', attempt: 1, scope_digest: 'c'.repeat(64) };
    const producerInput = {
      repositoryRoot: f.root,
      config: f.config,
      projectIds: f.identity.project_ids,
      selection: {
        team: 'default-development',
        kind: 'task',
        intent: 'task_execution',
        project: firstOf(f.identity.project_ids, 'repair project'),
        risk_flags: [],
        labels: [],
      },
      context,
      workflowId: 'task_execution',
      phase: 'initialize',
      runId: sessionBridgeRunId(workspaceId, context, 'task_execution'),
      expectedWork: null,
      expectedLedger: before.ledgerVersion,
      expectedJournal: null,
      maintenanceGeneration: before.maintenanceGeneration,
    } satisfies ProducerInput;
    const producer = f.store.beginSessionProducer(ledger, producerInput);
    expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
    expect(
      f.db
        .query(
          'UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
        )
        .run('0'.repeat(64), workspaceId, f.identity.work_id).changes,
    ).toBe(1);
    const staleRow = row();
    const actionId = input.receipt.request.action.request.action_id;
    const inspection = f.store.inspectDeliveredWorkContinuationRepair(f.identity, 1, actionId);
    expect(inspection.row).toEqual({
      payload: originalRow.payload,
      before_digest: staleRow.digest,
      after_digest: originalRow.digest,
    });
    const body = {
      schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1',
      branch: 'configured_frontier',
      repair_id: 'host-frontier-digest-repair',
      actor: 'fixture:repair-owner',
      timestamp: new Date().toISOString(),
      inspection,
    };
    const plan = { ...body, digest: canonicalJsonDigest(body) };
    const pending = governance();
    const invalidBodies = [
      { ...body, extra: true },
      { ...body, schema: 'ForeignRepair/v1' },
      { ...body, branch: 'unsupported' },
      { ...body, branch: 'historical_terminal_review' },
      { ...body, repair_id: 1 },
      { ...body, repair_id: 'UPPERCASE' },
      { ...body, repair_id: 'r'.repeat(81) },
      { ...body, actor: null },
      { ...body, actor: '' },
      { ...body, actor: ' fixture-owner' },
      { ...body, actor: 'fixture-owner ' },
      { ...body, actor: 'a'.repeat(257) },
      { ...body, actor: 'fixture\u0000owner' },
      { ...body, timestamp: '2026-02-30T00:00:00Z' },
      { ...body, inspection: { ...inspection, extra: true } },
      { ...body, inspection: { ...inspection, schema: 'ForeignInspection/v1' } },
      { ...body, inspection: { ...inspection, workspace_id: 'foreign-workspace' } },
      { ...body, inspection: { ...inspection, identity: { ...inspection.identity, extra: true } } },
      { ...body, inspection: { ...inspection, row: { ...inspection.row, extra: true } } },
      { ...body, inspection: { ...inspection, work_version: { ...inspection.work_version, extra: true } } },
      { ...body, inspection: { ...inspection, ledger_version: { ...inspection.ledger_version, extra: true } } },
      { ...body, inspection: { ...inspection, journal: { ...inspection.journal, extra: true } } },
      { ...body, inspection: { ...inspection, row: { ...inspection.row, payload: '{"request":null}' } } },
    ];
    const invalidPlans = [
      ...invalidBodies.map((changed) => ({ ...changed, digest: canonicalJsonDigest(changed) })),
      { ...plan, digest: null },
      { ...plan, digest: 'not-a-digest' },
      { ...plan, digest: '0'.repeat(64) },
    ];
    for (const invalid of invalidPlans) {
      for (const operation of [
        () => f.store.reserveDeliveredWorkContinuationRepair(invalid),
        () => f.store.applyDeliveredWorkContinuationRepair(invalid),
      ]) {
        expect(operation).toThrow('delivered-work continuation repair plan is malformed or changed');
        expect(governance()).toEqual(pending);
        expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
        expect(row()).toEqual(staleRow);
      }
    }
    expect(() => f.store.reserveDeliveredWorkContinuationRepair(plan)).toThrow(
      'session producer is pending or unknown',
    );
    expect(governance()).toEqual(pending);
    expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
    expect(row()).toEqual(staleRow);
    expect(() => f.store.settleSessionProducer(producer, null)).toThrow(
      'delivered-work continuation history receipt checksum or identity differs',
    );
    expect(governance()).toEqual(pending);
    expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
    expect(row()).toEqual(staleRow);
    expect(
      f.db
        .query(
          'UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=1 AND digest=?',
        )
        .run(originalRow.digest, workspaceId, f.identity.work_id, staleRow.digest).changes,
    ).toBe(1);
    f.store.settleSessionProducer(producer, null);
    expect(
      f.db
        .query(
          'UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=1 AND digest=?',
        )
        .run(staleRow.digest, workspaceId, f.identity.work_id, originalRow.digest).changes,
    ).toBe(1);
    const settled = governance();
    expect(() => f.store.applyDeliveredWorkContinuationRepair(plan)).toThrow(
      'delivered-work continuation repair reservation is missing',
    );
    expect(governance()).toEqual(settled);
    const reserved = f.store.reserveDeliveredWorkContinuationRepair(plan);
    expect(reserved.status).toBe('reserved');
    expect(f.store.reserveDeliveredWorkContinuationRepair(plan)).toEqual(reserved);
    expect(() => f.store.readDeliveredWorkContinuation(f.identity, 1)).toThrow(
      'delivered-work continuation repair is pending or unknown',
    );
    expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(
      'delivered-work continuation repair is pending or unknown',
    );
    f.db.exec(
      "CREATE TEMP TRIGGER interrupt_host_continuation_repair BEFORE UPDATE OF digest ON agent_host_delivered_work_continuation BEGIN SELECT RAISE(ABORT, 'controlled continuation digest failure'); END",
    );
    try {
      expect(() => f.store.applyDeliveredWorkContinuationRepair(plan)).toThrow(
        'controlled continuation digest failure',
      );
      expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
      expect(row()).toEqual(staleRow);
      const unknown = f.store.reserveDeliveredWorkContinuationRepair(plan);
      expect(unknown).toEqual({ ...reserved, status: 'commit_unknown', terminal_revision: 2 });
      expect(() => f.store.assertSessionProducerWriteAllowed()).toThrow(
        'delivered-work continuation repair is pending or unknown',
      );
      expect(() => f.store.beginSessionProducer(ledger, producerInput)).toThrow(
        'delivered-work continuation repair is pending or unknown',
      );
      expect(f.store.reserveDeliveredWorkContinuationRepair(plan)).toEqual(unknown);
    } finally {
      f.db.exec('DROP TRIGGER interrupt_host_continuation_repair');
    }
    expect(f.store.applyDeliveredWorkContinuationRepair(plan)).toEqual({
      status: 'applied',
      digest: originalRow.digest,
    });
    expect(row()).toEqual(originalRow);
    expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(f.store.readDeliveredWorkContinuation(f.identity, 1)?.receipt).toEqual(input.receipt);
    expect(f.store.reserveDeliveredWorkContinuationRepair(plan)).toMatchObject({
      status: 'applied',
      operation_key: reserved.operation_key,
      fencing_token: reserved.fencing_token,
    });
    expect(f.store.applyDeliveredWorkContinuationRepair(plan)).toEqual({
      status: 'already_applied',
      digest: originalRow.digest,
    });
    const laterProducer = f.store.beginSessionProducer(ledger, producerInput);
    const later = governance();
    for (const operation of [
      () => f.store.reserveDeliveredWorkContinuationRepair(plan),
      () => f.store.applyDeliveredWorkContinuationRepair(plan),
    ]) {
      expect(operation).toThrow('session producer is pending or unknown');
      expect(governance()).toEqual(later);
      expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
      expect(row()).toEqual(originalRow);
    }
    f.store.settleSessionProducer(laterProducer, null);
    expect(
      f.db
        .query(
          'UPDATE agent_host_mastra_session_ledger SET revision=revision+1 WHERE workspace_id=? AND work_id=? AND attempt=1',
        )
        .run(workspaceId, f.identity.work_id).changes,
    ).toBe(1);
    const concurrent = readFixtureHostRows(f.db);
    const settledAfter = governance();
    expect(() => f.store.applyDeliveredWorkContinuationRepair(plan)).toThrow(
      'applied delivered-work continuation repair afterimage differs',
    );
    expect(readFixtureHostRows(f.db)).toEqual(concurrent);
    expect(governance()).toEqual(settledAfter);
    expect(row()).toEqual(originalRow);
  });
  preserveHostFixtureRoot = false;
});

test.each(['applied', 'reserved', 'unknown', 'different-plan'] as const)(
  'configured continuation repair serializes peer %s between reservation transactions',
  async (peerState) => {
    preserveHostFixtureRoot = 'case failed or timed out';
    await withConfiguredFrontierHostFixture((f, { workspaceId, input }) => {
      seedFrontierHostFixture(f, input);
      const beforeRows = readFixtureHostRows(f.db);
      expect(
        f.db
          .query(
            'UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
          )
          .run('0'.repeat(64), workspaceId, f.identity.work_id).changes,
      ).toBe(1);
      const inspection = f.store.inspectDeliveredWorkContinuationRepair(
        f.identity,
        1,
        input.receipt.request.action.request.action_id,
      );
      const body = {
        schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1',
        branch: 'configured_frontier',
        repair_id: 'host-frontier-peer-apply',
        actor: 'fixture:repair-owner',
        timestamp: new Date().toISOString(),
        inspection,
      };
      const plan = { ...body, digest: canonicalJsonDigest(body) };
      const peerDb = new Database(f.db.filename, { strict: true });
      const transactionDescriptor = Object.getOwnPropertyDescriptor(peerDb, 'transaction');
      const originalTransaction = peerDb.transaction.bind(peerDb);
      let interleaved = false;
      let applied: ReturnType<HostStateStore['reserveDeliveredWorkContinuationRepair']> | undefined;
      const governance = () =>
        f.db
          .query<GovernanceSqlRow, []>(
            'SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key',
          )
          .all();
      let afterPeer: GovernanceSqlRow[] | undefined;
      let primaryFailure: { error: unknown } | undefined;
      try {
        const peer = new HostStateStore(peerDb, workspaceId, undefined, undefined, undefined, undefined, f.root);
        // Interpose only after A's real deferred read commits, before its immediate writer begins.
        // B uses the other real connection and the public reserve/apply operations.
        peerDb.transaction = <Args extends unknown[], Result>(callback: (...args: Args) => Result) => {
          const pending = originalTransaction(callback);
          const deferred = (...args: Args) => {
            const result = pending.deferred(...args);
            if (!interleaved) {
              interleaved = true;
              expect(result).toBeNull();
              expect(peerDb.inTransaction).toBe(false);
              const changedBody = { ...body, actor: 'fixture:other-repair-owner' };
              const peerPlan =
                peerState === 'different-plan' ? { ...changedBody, digest: canonicalJsonDigest(changedBody) } : plan;
              const reserved = f.store.reserveDeliveredWorkContinuationRepair(peerPlan);
              expect(reserved.status).toBe('reserved');
              if (peerState === 'unknown') {
                f.db.exec(
                  "CREATE TEMP TRIGGER interrupt_peer_repair BEFORE UPDATE OF digest ON agent_host_delivered_work_continuation BEGIN SELECT RAISE(ABORT, 'controlled peer repair interruption'); END",
                );
                let applyFailure: { error: unknown } | undefined;
                try {
                  expect(() => f.store.applyDeliveredWorkContinuationRepair(peerPlan)).toThrow(
                    'controlled peer repair interruption',
                  );
                } catch (error) {
                  applyFailure = { error };
                  throw error;
                } finally {
                  completeOwnedCleanup(
                    [
                      () => {
                        f.db.exec('DROP TRIGGER interrupt_peer_repair');
                      },
                    ],
                    applyFailure,
                  );
                }
              } else if (peerState !== 'reserved') {
                expect(f.store.applyDeliveredWorkContinuationRepair(peerPlan)).toEqual({
                  status: 'applied',
                  digest: inspection.row.after_digest,
                });
              }
              applied = f.store.reserveDeliveredWorkContinuationRepair(peerPlan);
              expect(applied.status).toBe(
                peerState === 'unknown' ? 'commit_unknown' : peerState === 'reserved' ? 'reserved' : 'applied',
              );
              expect(applied.fencing_token).toBe(reserved.fencing_token);
              afterPeer = governance();
            }
            return result;
          };
          return Object.assign((...args: Args) => pending(...args), {
            deferred,
            immediate: pending.immediate,
            exclusive: pending.exclusive,
          });
        };
        if (peerState === 'applied') {
          const reservation = peer.reserveDeliveredWorkContinuationRepair(plan);
          expect(reservation).toEqual(requiredValue(applied, 'peer applied reservation'));
          expect(peer.applyDeliveredWorkContinuationRepair(plan)).toEqual({
            status: 'already_applied',
            digest: inspection.row.after_digest,
          });
          expect(f.store.readDeliveredWorkContinuation(f.identity, 1)?.receipt).toEqual(input.receipt);
        } else {
          expect(() => peer.reserveDeliveredWorkContinuationRepair(plan)).toThrow(
            peerState === 'different-plan'
              ? 'delivered-work continuation repair retry differs'
              : 'delivered-work continuation repair is pending or unknown',
          );
        }
        expect(interleaved).toBe(true);
        expect(governance()).toEqual(requiredValue(afterPeer, 'peer governance afterimage'));
        expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
        expect(
          f.db
            .query<{ payload: string; digest: string }, [string, string]>(
              'SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=1',
            )
            .get(workspaceId, f.identity.work_id),
        ).toEqual({
          payload: inspection.row.payload,
          digest:
            peerState === 'applied' || peerState === 'different-plan'
              ? inspection.row.after_digest
              : inspection.row.before_digest,
        });
      } catch (error) {
        primaryFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              if (transactionDescriptor) Object.defineProperty(peerDb, 'transaction', transactionDescriptor);
              else if (!Reflect.deleteProperty(peerDb, 'transaction'))
                throw new Error('Could not restore peer transaction boundary');
            },
            () => {
              peerDb.close();
            },
          ],
          primaryFailure,
        );
      }
    });
    preserveHostFixtureRoot = false;
  },
);

test('failed prewriter owner recovery atomically reacquires full resources without changing reports, bindings or the original receipt', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  await withConfiguredFrontierHostFixture((f, { workspaceId, input }) => {
    seedFrontierHostFixture(f, input);
    const ledger = mutableCoordinationLedger(input.receipt.successor_ledger),
      originalJournal = input.receipt.successor_journal;
    const expired = new Date(Date.now() - 1000).toISOString();
    const activeTicket = requiredValue(
        ledger.tickets.find((item) => item.status === 'active'),
        'active ticket',
      ),
      activeClaim = requiredValue(
        ledger.claims.find((item) => item.status === 'active'),
        'active claim',
      );
    activeTicket.expires_at = expired;
    activeClaim.lease_expires_at = expired;
    const journal = failedFrontierJournalFixture(originalJournal);
    f.db
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='ledger'")
      .run(canonicalJson(ledger), canonicalJsonDigest(ledger), workspaceId);
    f.db
      .query(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(canonicalJson(journal), canonicalJsonDigest(journal), workspaceId, f.identity.work_id);
    const before = presentSnapshot(f.store.readHostStateSnapshot(f.identity)),
      beforeJournal = requiredValue(f.store.readWorkSessionJournal(f.identity), 'pre-recovery journal');
    requiredValue(before.work, 'pre-recovery work');
    requiredValue(before.work.lease, 'pre-recovery lease');
    requiredValue(before.workVersion, 'pre-recovery work version');
    requiredValue(before.ledgerVersion, 'pre-recovery ledger version');
    const receiptBytes = requiredValue(
      f.db
        .query<{ payload: string }, [string]>(
          'SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?',
        )
        .get(workspaceId),
      'original continuation receipt',
    ).payload;
    const request = {
      identity: f.identity,
      attempt: 1,
      nativeSessionHandle: input.receipt.request.nativeSessionHandle,
      expectedWork: requiredValue(before.workVersion, 'pre-recovery work version'),
      expectedLedger: requiredValue(before.ledgerVersion, 'pre-recovery ledger version'),
      expectedJournal: beforeJournal.version,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      verifyCurrent: () => {},
    } satisfies Parameters<typeof f.store.recoverFailedPrewriterOwner>[0];
    const versionKeys: readonly ('expectedWork' | 'expectedLedger' | 'expectedJournal')[] = [
      'expectedWork',
      'expectedLedger',
      'expectedJournal',
    ];
    const beforeRows = readFixtureHostRows(f.db);
    for (const key of versionKeys) {
      expect(() =>
        f.store.recoverFailedPrewriterOwner({
          ...request,
          [key]: { ...request[key], revision: request[key].revision + 1 },
        }),
      ).toThrow(
        key === 'expectedJournal' ? 'failed prewriter recovery Journal CAS changed' : 'state compare-and-swap conflict',
      );
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
      expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
    }
    expect(() =>
      f.store.recoverFailedPrewriterOwner({
        ...request,
        verifyCurrent: () => {
          throw Error('fixture current proof changed');
        },
      }),
    ).toThrow('fixture current proof changed');
    const invalidVerifiers: readonly { verifyCurrent: unknown; message: string }[] = [
      { verifyCurrent: () => Promise.resolve(), message: 'must finish synchronously' },
      { verifyCurrent: async () => {}, message: 'failed prewriter owner recovery requires a valid nonnested request' },
    ];
    for (const invalid of invalidVerifiers) {
      expect(() => {
        Reflect.apply(f.store.recoverFailedPrewriterOwner.bind(f.store), undefined, [
          { ...request, verifyCurrent: invalid.verifyCurrent },
        ]);
      }).toThrow(invalid.message);
      expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
    }
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
    f.db.exec(
      "CREATE TRIGGER reject_failed_owner_journal BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT,'controlled failed owner Journal write'); END",
    );
    let primaryFailure: { error: unknown } | undefined;
    try {
      expect(() => f.store.recoverFailedPrewriterOwner(request)).toThrow('controlled failed owner Journal write');
      expect(readFixtureHostRows(f.db)).toEqual(beforeRows);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            f.db.exec('DROP TRIGGER reject_failed_owner_journal');
          },
        ],
        primaryFailure,
      );
    }
    const recovery = f.store.recoverFailedPrewriterOwner(request);
    const result = presentSnapshot(recovery);
    expect(recovery.journalVersion).toEqual({
      revision: beforeJournal.version.revision + 1,
      digest: beforeJournal.version.digest,
    });
    expect(result.workVersion).toEqual({
      revision: before.workVersion.revision + 1,
      digest: canonicalJsonDigest(result.work),
    });
    expect(result.ledgerVersion).toEqual({
      revision: before.ledgerVersion.revision + 1,
      digest: canonicalJsonDigest(result.ledger),
    });
    expect(result.maintenanceGeneration).toBe(before.maintenanceGeneration);
    requiredValue(result.work, 'recovered owner work');
    requiredValue(result.ledger, 'recovered owner ledger');
    requiredValue(result.work.lease, 'recovered owner lease');
    const recoveredOwnerWork = requiredValue(result.work, 'recovered owner work');
    requiredValue(recoveredOwnerWork.lease, 'recovered owner lease');
    const recoveredOwnerLease = requiredValue(recoveredOwnerWork.lease, 'recovered owner lease');
    expect(recoveredOwnerWork.binding).toEqual(requiredValue(before.work, 'before owner work').binding);
    expect(recoveredOwnerWork.execution).toEqual(requiredValue(before.work, 'before owner work').execution);
    expect(recoveredOwnerLease.ticket_id).not.toBe(requiredValue(before.work, 'before owner work').lease?.ticket_id);
    const ticket = requiredValue(
      result.ledger.tickets.find((item) => item.ticket_id === recoveredOwnerLease.ticket_id),
      'recovered owner ticket',
    );
    const originalActiveTicket = requiredValue(
      ledger.tickets.find((item) => item.status === 'active'),
      'original active ticket',
    );
    expect(ticket.exclusive_resources).toEqual(originalActiveTicket.exclusive_resources);
    expect(ticket.active_resources).toEqual(originalActiveTicket.active_resources);
    expect(ticket.blocked_resources).toEqual([]);
    const recoveredClaim = requiredValue(
      result.ledger.claims.find((claim) => claim.ticket_id === ticket.ticket_id && claim.status === 'active'),
      'recovered owner claim',
    );
    expect(recoveredClaim.resources).toEqual(activeClaim.resources);
    expect(ticket.claim_ids).toEqual([recoveredClaim.claim_id]);
    expect(recoveredClaim.lease_expires_at).toBe(requiredValue(ticket.expires_at, 'recovered ticket expiry'));
    expect(result.ledger.tickets.find((value) => value.ticket_id === activeTicket.ticket_id)?.status).toBe('read_only');
    expect(result.ledger.claims.find((value) => value.claim_id === activeClaim.claim_id)?.status).toBe('recovered');
    expect(Date.parse(requiredValue(ticket.expires_at, 'recovered ticket expiry'))).toBeGreaterThan(Date.now());
    expect(requiredValue(f.store.readWorkSessionJournal(f.identity), 'recovered journal').state).toEqual(journal);
    expect(
      requiredValue(
        f.db
          .query<{ payload: string }, [string]>(
            'SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?',
          )
          .get(workspaceId),
        'original continuation receipt',
      ).payload,
    ).toBe(receiptBytes);
    expect(
      requiredValue(f.store.readDeliveredWorkContinuation(f.identity, 1), 'delivered continuation').item_statuses,
    ).toEqual(['reported', 'reported']);
    expectHistorySnapshotAfterOwner(f.store, result.work);
    const current = f.store.readHostStateSnapshot(f.identity),
      currentJournal = requiredValue(f.store.readWorkSessionJournal(f.identity), 'current journal');
    expect(() =>
      f.store.recoverFailedPrewriterOwner({
        ...request,
        expectedWork: requiredValue(current.workVersion, 'current work version'),
        expectedLedger: requiredValue(current.ledgerVersion, 'current ledger version'),
        expectedJournal: currentJournal.version,
      }),
    ).toThrow('exact expired full-resource ticket and claim differ');
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(current);
  });
  preserveHostFixtureRoot = false;
});

test('Host failed prewriter transition atomically retains failed reports and original receipt while binding fresh requests', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  await withConfiguredFrontierHostFixture(async (f, { root, config, workspaceId, input }, deadline) => {
    bindFrontierContractReferences(input);
    seedFrontierHostFixture(f, input);
    await seedOriginalFrontierEngine(root, config, input, executionBudget(5_000, 500, deadline));
    const failed = failedFrontierJournalFixture(input.receipt.successor_journal);
    f.db
      .query(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(canonicalJson(failed), canonicalJsonDigest(failed), workspaceId, f.identity.work_id);
    const before = presentSnapshot(f.store.readHostStateSnapshot(f.identity));
    const journal = requiredValue(f.store.readWorkSessionJournal(f.identity), 'failed prewriter journal');
    const source = requiredValue(failed.source_scope, 'failed prewriter source scope');
    const changed = continuationSourceScope(
      source.entries.map((entry) => ({
        ...entry,
        bytes: requiredValue(entry.bytes, 'failed source entry bytes') + 1,
        sha256: '9'.repeat(64),
      })),
    );
    const originalProof = input.receipt.request.sourceTransition;
    if (originalProof.status !== 'closed_config_rebind_proven')
      throw new Error('Expected fixture configured endpoint proof');
    const request: FailedPrewriterTransitionRequest = {
      schema: 'FailedPrewriterTransitionRequest/v1',
      recovery_id: 'host-fixture-failed-wave',
      identity: f.identity,
      attempt: 1,
      nativeSessionHandle: input.receipt.request.nativeSessionHandle,
      original_receipt_digest: canonicalJsonDigest(input.receipt),
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedJournal: journal.version,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      currentSourceScope: changed,
      authorizedSourceChanges: compareScopedSourceSnapshots(source, changed),
      sourceTransition: originalProof,
      targetProjectContextDigest: input.receipt.request.targetProjectContextDigest,
    };
    const rows = readFixtureHostRows(f.db);
    const originalBytes = requiredValue(
      f.db
        .query<{ payload: string }, [string]>(
          'SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?',
        )
        .get(workspaceId),
      'original continuation row',
    ).payload;
    const receiptTable = () =>
      f.db
        .query<SqliteNameRow, [string]>('SELECT name FROM sqlite_master WHERE name=?')
        .all('agent_host_failed_prewriter_recovery');
    const beforeTables = receiptTable();
    expect(beforeTables).toEqual([]);
    for (const key of ['expectedWork', 'expectedLedger', 'expectedJournal'] as const) {
      expect(() =>
        f.store.transitionFailedPrewriter({
          request: { ...request, [key]: { ...request[key], revision: request[key].revision + 1 } },
          verifyCurrent: () => {},
        }),
      ).toThrow(
        key === 'expectedJournal'
          ? 'failed prewriter transition Journal CAS changed'
          : 'state compare-and-swap conflict',
      );
      expect(readFixtureHostRows(f.db)).toEqual(rows);
    }
    const proofError = new Error('controlled failed-wave proof');
    let proofFailure: unknown;
    try {
      f.store.transitionFailedPrewriter({
        request,
        verifyCurrent: () => {
          throw proofError;
        },
      });
    } catch (error) {
      proofFailure = error;
    }
    expect(proofFailure).toBe(proofError);
    expect(readFixtureHostRows(f.db)).toEqual(rows);
    expect(f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1)).toBeNull();
    const invalidVerifiers: readonly { verifyCurrent: unknown; message: string }[] = [
      {
        verifyCurrent: () => Promise.resolve(),
        message: 'failed prewriter current endpoint proof must finish synchronously',
      },
      { verifyCurrent: async () => {}, message: 'failed prewriter transition requires synchronous current proof' },
    ];
    for (const { verifyCurrent, message } of invalidVerifiers) {
      expect(() => {
        Reflect.apply(f.store.transitionFailedPrewriter.bind(f.store), undefined, [{ request, verifyCurrent }]);
      }).toThrow(message);
      expect(readFixtureHostRows(f.db)).toEqual(rows);
    }
    f.db.exec(
      "CREATE TRIGGER reject_host_failed_wave BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT,'controlled failed-wave Journal write'); END",
    );
    let primaryFailure: { error: unknown } | undefined;
    try {
      expect(() => f.store.transitionFailedPrewriter({ request, verifyCurrent: () => {} })).toThrow(
        'controlled failed-wave Journal write',
      );
      expect(readFixtureHostRows(f.db)).toEqual(rows);
      expect(receiptTable()).toEqual(beforeTables);
      expect(f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1)).toBeNull();
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            f.db.exec('DROP TRIGGER reject_host_failed_wave');
          },
        ],
        primaryFailure,
      );
    }
    const result = presentSnapshot(
      f.store.transitionFailedPrewriter({
        request,
        verifyCurrent: (inspected) => {
          expect(Object.isFrozen(inspected)).toBe(true);
          expect(Reflect.set(inspected.sourceTransition.transition, 'target_runtime_code_digest', 'c'.repeat(64))).toBe(
            false,
          );
        },
      }),
    );
    const recovery = requiredValue(
      f.store.readFailedPrewriterRecoveryReceipt(f.identity, 1),
      'failed-wave recovery receipt',
    );
    const recoveryViewRows = readFixtureHostRows(f.db);
    expect(f.store.readFailedPrewriterRecoveryReceipt(f.identity, 2)).toBeNull();
    const recoveryView = requiredValue(
      f.store.readConfiguredFrontierRecoveryView(f.identity, 1),
      'configured recovered frontier view',
    );
    expect(recoveryView).toEqual({ original: input.receipt, recovery });
    expect(Object.isFrozen(recoveryView)).toBe(true);
    expect(f.store.readConfiguredFrontierRecoveryView(f.identity, 1)).toEqual(recoveryView);
    expect(readFixtureHostRows(f.db)).toEqual(recoveryViewRows);
    const archiveRows = f.db.query(
      'SELECT * FROM agent_host_failed_prewriter_recovery ORDER BY workspace_id,work_id,attempt,recovery_id',
    );
    const retainedArchive = archiveRows.all();
    expect(retainedArchive).toHaveLength(1);
    const archivedItem = requiredValue(
      recovery.prior_journal.items.find((item) => item.observation !== null),
      'failed-wave archived report item',
    );
    const archivedObservation = requiredValue(archivedItem.observation, 'failed-wave archived observation');
    expect(f.store.findArchivedReportedObservation(f.identity.work_id, 1, archivedObservation)).toEqual(archivedItem);
    expect(() =>
      f.store.findArchivedReportedObservation(f.identity.work_id, 1, {
        ...archivedObservation,
        issue_id: archivedObservation.issue_id + ':foreign',
      }),
    ).toThrow('archived failed prewriter report retry differs');
    expect(readFixtureHostRows(f.db)).toEqual(recoveryViewRows);
    expect(archiveRows.all()).toEqual(retainedArchive);
    const missingAction = '0'.repeat(64);
    expect(recovery.prior_journal.items.every((item) => item.request.action_id !== missingAction)).toBe(true);
    expect(
      f.store.findArchivedReportedObservation(f.identity.work_id, 1, {
        ...archivedObservation,
        action_id: missingAction,
      }),
    ).toBeNull();
    expect(f.store.findArchivedReportedObservation(f.identity.work_id, 2, archivedObservation)).toBeNull();
    expect(readFixtureHostRows(f.db)).toEqual(recoveryViewRows);
    expect(archiveRows.all()).toEqual(retainedArchive);
    expect(recovery.request).toEqual(request);
    expect(recovery.prior_work).toEqual(before.work);
    expect(recovery.prior_ledger).toEqual(before.ledger);
    expect(recovery.prior_journal).toEqual(failed);
    expect(recovery.successor_work).toEqual(result.work);
    expect(recovery.successor_ledger).toEqual(result.ledger);
    expect(recovery.successor_journal.completed).toEqual(failed.completed);
    expect(recovery.rights_granted).toBe(false);
    expect(recovery.accepted_result).toBe(false);
    expect(recovery.runtime_acceptance).toBe(false);
    expect(result.workVersion).toEqual({
      revision: before.workVersion.revision + 1,
      digest: canonicalJsonDigest(result.work),
    });
    expect(result.ledgerVersion).toEqual({
      revision: before.ledgerVersion.revision + 1,
      digest: canonicalJsonDigest(result.ledger),
    });
    expect(result.maintenanceGeneration).toBe(before.maintenanceGeneration);
    expect(result.ledger.open_generation).toBe(before.ledger.open_generation);
    const endpoint = originalProof.transition;
    expect(result.work.binding).toEqual({
      ...before.work.binding,
      work_source_revision: changed.digest,
      config_digest: endpoint.target_config_digest,
      schema_digest: endpoint.target_schema_digest,
      runtime_code_digest: endpoint.target_runtime_code_digest,
      runtime_source_revision: endpoint.target_runtime_code_digest,
    });
    expect(result.work.lifecycle).toEqual({
      ...before.work.lifecycle,
      revision: before.work.lifecycle.revision + 1,
      source_revision: changed.digest,
      config_binding: {
        config_digest: endpoint.target_config_digest,
        schema_digest: endpoint.target_schema_digest,
        runtime_code_digest: endpoint.target_runtime_code_digest,
      },
    });
    expect(result.work.execution).toEqual(before.work.execution);
    const priorTicket = requiredValue(
      before.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(before.work).ticket_id),
      'prior failed-wave ticket',
    );
    const priorClaim = requiredValue(
      before.ledger.claims.find((claim) => claim.ticket_id === priorTicket.ticket_id && claim.status === 'active'),
      'prior failed-wave claim',
    );
    const nextTicket = requiredValue(
      result.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(result.work).ticket_id),
      'successor failed-wave ticket',
    );
    const nextClaim = requiredValue(
      result.ledger.claims.find((claim) => claim.ticket_id === nextTicket.ticket_id && claim.status === 'active'),
      'successor failed-wave claim',
    );
    expect(nextTicket.ticket_id).not.toBe(priorTicket.ticket_id);
    expect(nextTicket.exclusive_resources).toEqual(priorTicket.exclusive_resources);
    expect(nextTicket.active_resources).toEqual(priorTicket.active_resources);
    expect(nextTicket.blocked_resources).toEqual([]);
    expect(nextTicket.claim_ids).toEqual([nextClaim.claim_id]);
    expect(nextClaim.resources).toEqual(priorClaim.resources);
    expect(nextClaim.lease_expires_at).toBe(requiredValue(nextTicket.expires_at, 'successor failed-wave expiry'));
    expect(result.ledger.tickets.find((ticket) => ticket.ticket_id === priorTicket.ticket_id)).toEqual({
      ...priorTicket,
      status: 'read_only',
      active_resources: [],
      blocked_resources: [],
      expires_at: null,
    });
    expect(result.ledger.claims.find((claim) => claim.claim_id === priorClaim.claim_id)).toEqual({
      ...priorClaim,
      status: 'recovered',
    });
    expect(recovery.journal_version).toEqual({
      revision: journal.version.revision + 1,
      digest: canonicalJsonDigest(recovery.successor_journal),
    });
    expect(requiredValue(f.store.readWorkSessionJournal(f.identity), 'recovered wave').state).toEqual(
      recovery.successor_journal,
    );
    expect(recovery.successor_journal.items.length).toBeGreaterThan(0);
    for (const item of recovery.successor_journal.items) {
      expect(item.issue_id).toBeNull();
      expect(item.observation).toBeNull();
      expect(failed.items.some((prior) => prior.request.action_id === item.request.action_id)).toBe(false);
    }
    const currentEngine = readConfiguredContinuationSessionEngineSnapshot(
      {
        ...input.prewriterBinding,
        context: { ...input.prewriterBinding.context, scope_digest: changed.digest },
        runId: requiredValue(input.receipt.prior_work.execution.run_id, 'original engine run'),
      },
      input.receipt,
      recovery,
    );
    expect(currentEngine.status).toBe('suspended');
    expect(currentEngine.run_id).toBe(requiredValue(input.receipt.prior_work.execution.run_id, 'original engine run'));
    expect(currentEngine.requests).toEqual(recovery.successor_journal.items.map((item) => item.request));
    for (const failedItem of failed.items) {
      expect(
        f.store.findArchivedReportedObservation(
          f.identity.work_id,
          1,
          requiredValue(failedItem.observation, 'failed observation'),
        ),
      ).toEqual(failedItem);
    }
    expect(
      requiredValue(
        f.db
          .query<{ payload: string }, [string]>(
            'SELECT payload FROM agent_host_delivered_work_continuation WHERE workspace_id=?',
          )
          .get(workspaceId),
        'original continuation row',
      ).payload,
    ).toBe(originalBytes);
    const afterRows = readFixtureHostRows(f.db);
    expect(() => f.store.transitionFailedPrewriter({ request, verifyCurrent: () => {} })).toThrow(
      'state compare-and-swap conflict',
    );
    expect(readFixtureHostRows(f.db)).toEqual(afterRows);
  }, 'normal');
  preserveHostFixtureRoot = false;
});

function completeReadonlyFixtureHostPreparation(
  current: Awaited<ReturnType<typeof createInitialSourceWorkFixture>>,
  stageId = 'fixture_readonly_preparation',
) {
  const host = initialSourceHostStore(current);
  const before = presentSnapshot(host.readHostStateSnapshot(current.identity));
  const preparation = host.claimWorkflowAttempt({
    identity: current.identity,
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    stageId,
    assignmentIndex: 0,
    requestDigest: canonicalJsonDigest({
      fixture_only: true,
      operation: 'read-current-config',
      identity: current.identity,
    }),
    lease: requiredValue(before.work.lease, 'Readonly fixture preparation lease'),
  });
  const result = {
    fixture_only: true,
    operation: 'read-current-config',
    config_digest: runtimeConfigDigest(loadRuntimeConfig(current.root)),
  };
  expect(result.config_digest).toBe(before.work.binding.config_digest);
  const completed = host.completeWorkflowAttempt(preparation, result);
  expect(completed.attempt).toMatchObject({ status: 'completed', result, result_digest: canonicalJsonDigest(result) });
  return completed;
}

function admitDisjointInitialSourcePeers(
  current: Awaited<ReturnType<typeof createInitialSourceWorkFixture>>,
  includeQueuedPeer = true,
) {
  const store = initialSourceHostStore(current);
  const peerPath = 'docs/PEER.md';
  writeFileSync(path.join(current.root, peerPath), 'Disjoint peer source\n');
  const peers = (includeQueuedPeer ? ['initial-peer-owner', 'initial-peer-waiter'] : ['initial-peer-owner']).map(
    (id) => {
      const peerInput = current.preparePeerAdmission(id, [peerPath]);
      const peerAdmission = presentSnapshot(admitLocalSessionWork(peerInput).host);
      const peerIdentity = { ...current.identity, work_id: id };
      const acquire = () =>
        acquireLocalSourceWriterLease({
          repositoryRoot: current.root,
          config: current.config,
          store,
          identity: peerIdentity,
          nativeSessionHandle: peerInput.nativeSessionHandle,
          stageId: 'develop_task',
          assignmentIndex: 0,
          expectedWork: peerAdmission.workVersion,
          expectedLedger: peerAdmission.ledgerVersion,
        });
      if (id === 'initial-peer-owner') acquire();
      else expect(acquire).toThrow('queued behind an earlier exclusive resource');
      const peer = presentSnapshot(store.readHostStateSnapshot(peerIdentity));
      return { identity: peerIdentity, work: peer.work, version: peer.workVersion };
    },
  );
  const peerLedger = presentSnapshot(store.readHostStateSnapshot(current.identity)).ledger;
  const activePeer = requiredValue(
    peerLedger.tickets.find((ticket) => ticket.work_id === 'initial-peer-owner' && ticket.status === 'active'),
    'Disjoint active initial-source peer',
  );
  const queuedPeer = includeQueuedPeer
    ? requiredValue(
        peerLedger.tickets.find((ticket) => ticket.work_id === 'initial-peer-waiter' && ticket.status === 'queued'),
        'Disjoint queued initial-source peer',
      )
    : null;
  expect(activePeer.active_resources).toContain('file:' + peerPath);
  if (queuedPeer) expect(queuedPeer.exclusive_resources).toContain('file:' + peerPath);
  expect(activePeer.exclusive_resources.length).toBeGreaterThan(0);
  expect(
    peerLedger.claims.find((claim) => claim.ticket_id === activePeer.ticket_id && claim.status === 'active')?.resources,
  ).toEqual(activePeer.active_resources);
  const peerRows = () =>
    initialSourceHostDatabase(current)
      .query<HostStateSqlRow, []>(
        "SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state WHERE kind='work' ORDER BY workspace_id,id",
      )
      .all();
  const originalPeerRows = peerRows().filter((row) =>
    peers.some((peer) => row.digest === peer.version.digest && row.revision === peer.version.revision),
  );
  expect(originalPeerRows).toHaveLength(peers.length);
  const peerIds = new Set(originalPeerRows.map((row) => row.id));
  const peerWorkIds = new Set(peers.map((peer) => peer.identity.work_id));
  const peerTickets = peerLedger.tickets.filter((ticket) => peerWorkIds.has(ticket.work_id));
  const peerClaims = peerLedger.claims.filter((claim) => peerWorkIds.has(claim.work_id));
  return {
    queuedTicket: queuedPeer,
    verifyUnchanged() {
      // These exact bytes/versions were validated by the public admission above.
      expect(peerRows().filter((row) => peerIds.has(row.id))).toEqual(originalPeerRows);
      const retainedLedger = presentSnapshot(
        initialSourceHostStore(current).readHostStateSnapshot(current.identity),
      ).ledger;
      expect(retainedLedger.tickets.filter((ticket) => peerWorkIds.has(ticket.work_id))).toEqual(peerTickets);
      expect(retainedLedger.claims.filter((claim) => peerWorkIds.has(claim.work_id))).toEqual(peerClaims);
      expect(readFileSync(path.join(current.root, peerPath), 'utf8')).toBe('Disjoint peer source\n');
    },
  };
}

async function withReadonlyDispatchHostFixture(
  body: (current: Awaited<ReturnType<typeof createInitialSourceWorkFixture>>, deadline: number) => Promise<void>,
): Promise<void> {
  const deadline = performance.now() + 5_000;
  let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
  let ownedRoot: string | undefined;
  await withInitialSourceCleanup(
    async () => {
      const current = await createInitialSourceWorkFixture({
        cooperativeSynthesis: true,
        onRoot: (root) => {
          ownedRoot = root;
          console.info('Readonly dispatch Host fixture root: ' + root);
        },
      });
      fixture = current;
      if (performance.now() >= deadline) throw new Error('Readonly dispatch fixture setup exhausted its deadline');
      await body(current, deadline);
      expect(performance.now()).toBeLessThan(deadline);
    },
    async () => {
      if (fixture) await fixture.close();
      if (ownedRoot) console.info('Retained issued UNKNOWN readonly dispatch fixture: ' + ownedRoot);
    },
    'Readonly dispatch Host fixture',
  );
}

function pauseReadonlyDispatchHostFixture(current: Awaited<ReturnType<typeof createInitialSourceWorkFixture>>) {
  const store = initialSourceHostStore(current);
  const ledger = initialSourceHostLedger(current);
  const unissued = initialSourceJournal(current);
  expect(current.config.agents.profiles.researcher?.egress_policy).toBe('none');
  expect(unissued.state.items).toHaveLength(1);
  const issued = ledger.issueWave(current.identity.work_id, 1, unissued.version);
  const item = requiredValue(issued.state.items[0], 'Issued readonly dispatch item');
  const issueId = requiredValue(item.issue_id, 'Issued readonly dispatch identity');
  expect(issued.resume_status).toBe('issued_outcome_uncertain');
  expect(item.observation).toBeNull();
  expect(item.host_reservation).toBeUndefined();
  const before = presentSnapshot(store.readHostStateSnapshot(current.identity));
  suspendHistoricalOwnerWork({
    store,
    identity: current.identity,
    journal: issued,
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    nativeSessionHandle: requiredValue(current.input, 'Readonly dispatch admission').nativeSessionHandle,
    userRequestPointer: 'fixture:pause-unknown-readonly',
    requestIntent: 'linked_correction',
    predicate: 'unknown_readonly',
    config: current.config,
    documentationContext: {
      repository_root: current.root,
      repository_id: current.identity.repository_id,
      project_id: 'sample',
      work_id: current.identity.work_id,
    },
  });
  const paused = presentSnapshot(store.readHostStateSnapshot(current.identity));
  const journal = initialSourceJournal(current);
  expect(paused.work.lease).toBeNull();
  expect(paused.work.execution.status).toBe('suspended');
  expect(journal).toEqual(issued);
  const plan = buildReadOnlyDispatchRepairPlan({
    repositoryRoot: current.root,
    config: current.config,
    workspaceId: store.workspaceId,
    projectIds: current.identity.project_ids,
    workId: current.identity.work_id,
    attempt: 1,
    actionId: item.request.action_id,
    issueId,
    nativeHandle: requiredValue(current.input, 'Readonly dispatch admission').nativeSessionHandle,
    repairId: 'fixture-native-readonly-repair',
    actor: 'fixture-readonly-operator',
    timestamp: new Date().toISOString(),
    snapshot: store.readWorkSessionSnapshot(current.identity),
  });
  const db = initialSourceHostDatabase(current);
  return { store, ledger, item, issueId, paused, journal, plan, db };
}

test('native readonly dispatch repair retains its issued UNKNOWN through deterministic intent and exact retry', async () => {
  await withReadonlyDispatchHostFixture(async (current, deadline) => {
    const { store, item, issueId, paused, journal, plan, db } = pauseReadonlyDispatchHostFixture(current);
    const persistedBefore = readFixtureHostRows(db);
    const repairRows = () =>
      db
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_readonly_dispatch_repair'")
        .get() === null
        ? []
        : db.query('SELECT generation,payload,digest FROM agent_host_readonly_dispatch_repair').all();
    expect(repairRows()).toEqual([]);
    for (const [denied, error] of [
      [
        { ...plan, work_version: { ...plan.work_version, revision: plan.work_version.revision + 1 } },
        'state compare-and-swap conflict',
      ],
      [
        { ...plan, ledger_version: { ...plan.ledger_version, revision: plan.ledger_version.revision + 1 } },
        'state compare-and-swap conflict',
      ],
      [
        { ...plan, mastra_version: { ...plan.mastra_version, revision: plan.mastra_version.revision + 1 } },
        'state compare-and-swap conflict',
      ],
      [
        { ...plan, maintenance_generation: plan.maintenance_generation + 1 },
        'maintenance generation is stale or missing',
      ],
      [
        { ...plan, config_digest: '0'.repeat(64) },
        'read-only dispatch repair plan is stale or differs from deterministic current state',
      ],
    ] as const) {
      expect(() => store.commitReadOnlyDispatchRepair(denied)).toThrow(error);
      expect(readFixtureHostRows(db)).toEqual(persistedBefore);
      expect(repairRows()).toEqual([]);
    }
    expect(() => db.transaction(() => store.commitReadOnlyDispatchRepair(plan)).deferred()).toThrow(
      'nested read-only dispatch repair transaction forbidden',
    );
    expect(readFixtureHostRows(db)).toEqual(persistedBefore);
    expect(repairRows()).toEqual([]);
    expect(store.commitReadOnlyDispatchRepair(plan)).toEqual(plan);
    expect(store.commitReadOnlyDispatchRepair(plan)).toEqual(plan);
    const rows = db.query('SELECT generation,payload,digest FROM agent_host_readonly_dispatch_repair');
    const originalRows = [{ generation: 1, payload: canonicalJson(plan), digest: plan.digest }];
    expect(rows.all()).toEqual(originalRows);
    for (const corrupted of [
      { column: 'payload', value: 'conflicting payload' },
      { column: 'digest', value: 'conflicting digest' },
      { column: 'payload', value: new Uint8Array([0]) },
      { column: 'digest', value: new Uint8Array([0]) },
    ] as const) {
      let primaryFailure: { error: unknown } | undefined;
      try {
        expect(
          db.query(`UPDATE agent_host_readonly_dispatch_repair SET ${corrupted.column}=?`).run(corrupted.value).changes,
        ).toBe(1);
        const conflictingRows = rows.all();
        expect(() => store.commitReadOnlyDispatchRepair(plan)).toThrow(
          'existing read-only dispatch repair generation differs',
        );
        expect(rows.all()).toEqual(conflictingRows);
        expect(readFixtureHostRows(db)).toEqual(persistedBefore);
      } catch (error) {
        primaryFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              expect(
                db
                  .query('UPDATE agent_host_readonly_dispatch_repair SET payload=?,digest=?')
                  .run(canonicalJson(plan), plan.digest).changes,
              ).toBe(1);
            },
          ],
          primaryFailure,
        );
      }
    }
    expect(rows.all()).toEqual(originalRows);
    expect(plan).toMatchObject({ prior_outcome: 'unknown', replacement_generation: 1, status: 'prepared' });
    expect(plan.prior_issue_id).toBe(issueId);
    expect(plan.replacement_issue_id).not.toBe(issueId);
    expect(store.readHostStateSnapshot(current.identity)).toEqual(paused);
    expect(initialSourceJournal(current)).toEqual(journal);
    expect(initialSourceJournal(current).state.items[0]).toEqual(item);
    expect(performance.now()).toBeLessThan(deadline);
  });
});

test('native readonly replacement runtime rebind retires only its admitted source approval and retains UNKNOWN history', async () => {
  await withReadonlyDispatchHostFixture(async (current, deadline) => {
    const { store, ledger, item, issueId, paused, journal, plan, db } = pauseReadonlyDispatchHostFixture(current);
    expect(store.commitReadOnlyDispatchRepair(plan)).toEqual(plan);
    // Activate only the prepared replacement; the original issued UNKNOWN stays
    // in its immutable repair/activation history and is never reissued.
    const activation = ledger.activateReadOnlyReplacement(
      current.identity.work_id,
      1,
      journal.version,
      item.request.action_id,
    );
    expect(activation.dispatch.prior_issue_id).toBe(issueId);
    expect(activation.dispatch.issue_id).toBe(plan.replacement_issue_id);
    expect(activation.snapshot.state.items[0]).toEqual({ ...item, issue_id: plan.replacement_issue_id });
    expect(store.readHostStateSnapshot(current.identity)).toEqual(paused);
    const resumed = resumePausedLocalWork({
      store,
      ledger,
      identity: current.identity,
      attempt: 1,
      expectedWork: paused.workVersion,
      expectedLedger: paused.ledgerVersion,
      expectedJournal: activation.snapshot.version,
      nativeSessionHandle: requiredValue(current.input, 'Readonly dispatch admission').nativeSessionHandle,
      configDigest: paused.work.binding.config_digest,
      sourceDigest: paused.work.binding.work_source_revision,
    });
    expect(resumed.status).toBe('resumed');
    const active = presentSnapshot(store.readHostStateSnapshot(current.identity));
    const approvals = active.work.lifecycle.references.filter(
      (reference) => reference.kind === 'execution_approval' && reference.disposition === 'current',
    );
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({
      artifact_schema: 'LocalSourceWriteAuthorization/v1',
      generation: null,
      implementation_fingerprint: null,
      decision: 'approved',
    });
    const principal = 'fixture:readonly-runtime-rebind';
    // Host consistency proof only, not attestation of installed runtime bytes.
    const verifier: RuntimeCodeRebindVerifier = {
      principal,
      verify: (request) => ({
        schema: 'VidaRuntimeCodeRebindAuthorization/v1',
        request_digest: canonicalJsonDigest(request),
        principal,
        forward_operation_id: request.forwardOperationId,
        parent_manifest_digest: request.parentManifestDigest,
        successor_manifest_digest: request.successorManifestDigest,
        owner_no_call_pointer: request.ownerNoCallPointer!,
      }),
    };
    const checked = new HostStateStore(
      db,
      store.workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      current.root,
      verifier,
    );
    const rebind: RuntimeCodeRebindRequest = {
      identity: current.identity,
      attempt: 1,
      actionId: item.request.action_id,
      issueId: activation.dispatch.issue_id,
      nativeSessionHandle: requiredValue(active.work.lease, 'Resumed readonly owner').thread_id,
      expectedWork: active.workVersion,
      expectedLedger: active.ledgerVersion,
      expectedJournal: activation.snapshot.version,
      expectedMaintenanceGeneration: active.maintenanceGeneration,
      oldRuntimeCodeDigest: active.work.binding.runtime_code_digest,
      newRuntimeCodeDigest: canonicalJsonDigest('fixture:readonly-runtime-successor'),
      forwardOperationId: 'fixture:readonly-runtime-forward',
      parentManifestDigest: canonicalJsonDigest('fixture:readonly-runtime-parent-manifest'),
      successorManifestDigest: canonicalJsonDigest('fixture:readonly-runtime-successor-manifest'),
      ownerNoCallPointer: 'fixture:replacement-not-dispatched',
    };
    const activeRows = readFixtureHostRows(db);
    await expectRejection(
      checked.rebindRuntimeCode({ ...rebind, issueId: randomUUID() }),
      'runtime-code rebind issued read-only action changed',
    );
    expect(readFixtureHostRows(db)).toEqual(activeRows);
    expect(initialSourceJournal(current)).toEqual(activation.snapshot);
    const rebound = presentSnapshot(await checked.rebindRuntimeCode(rebind));
    expect(rebound.work.binding).toEqual({
      ...active.work.binding,
      runtime_code_digest: rebind.newRuntimeCodeDigest,
      runtime_source_revision: rebind.newRuntimeCodeDigest,
    });
    expect(rebound.work.lifecycle.references).toEqual(
      active.work.lifecycle.references.map((reference) =>
        approvals.some((approval) => approval.record_id === reference.record_id)
          ? { ...reference, disposition: 'retired' }
          : reference,
      ),
    );
    expect(rebound.work.execution).toEqual(active.work.execution);
    expect(rebound.work.lease).toEqual(active.work.lease);
    expect(rebound.ledger).toEqual(active.ledger);
    const rebindRow = requiredValue(
      db
        .query<{ payload: string; digest: string }, []>('SELECT payload,digest FROM agent_host_runtime_code_rebind')
        .get(),
      'Readonly runtime rebind receipt',
    );
    const rebindReceipt = parseJsonRecord(rebindRow.payload);
    expect(canonicalJsonDigest(rebindReceipt)).toBe(rebindRow.digest);
    expect(rebindReceipt).toMatchObject({
      request: rebind,
      retired_execution_approval_ids: approvals.map((reference) => reference.record_id),
      binding_history: { original_work: active.work, original_journal: activation.snapshot.state },
    });
    expect(db.query('SELECT generation,payload,digest FROM agent_host_readonly_dispatch_repair').all()).toEqual([
      { generation: 1, payload: canonicalJson(plan), digest: plan.digest },
    ]);
    expect(ledger.replacementDispatch(current.identity.work_id, 1, item.request.action_id)).toEqual(
      activation.dispatch,
    );
    expect(initialSourceJournal(current)).toEqual(activation.snapshot);
    expect(checked.readHostStateSnapshot(current.identity)).toEqual(rebound);
    await expectRejection(checked.rebindRuntimeCode(rebind), 'state compare-and-swap conflict');
    expect(checked.readHostStateSnapshot(current.identity)).toEqual(rebound);
    expect(performance.now()).toBeLessThan(deadline);
  });
});

test('native synthesis correction runtime rebind preserves admitted research and exact corrected history', async () => {
  const deadline = performance.now() + 5_000;
  let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
  let ownedRoot: string | undefined;
  let completed = false;
  await withInitialSourceCleanup(
    async () => {
      const current = await createInitialSourceWorkFixture({
        cooperativeSynthesis: true,
        researchSynthesis: true,
        onRoot: (root) => {
          ownedRoot = root;
          console.info('Native synthesis correction Host fixture root: ' + root);
        },
      });
      fixture = current;
      const prepared = await prepareNativeUnnormalizedSynthesis(current);
      const host = initialSourceHostStore(current);
      const ledger = initialSourceHostLedger(current);
      const admitted = requiredValue(current.input, 'Native synthesis admission');
      const before = presentSnapshot(host.readHostStateSnapshot(current.identity));
      expect(prepared.journal.state.completed).toHaveLength(1);
      expect(prepared.originalItem.research_activation).toBeDefined();
      expect(prepared.originalItem.research_normalization).toBeUndefined();
      expect(before.work.artifacts.filter((artifact) => artifact.schema === 'ResearchResult/v1')).toHaveLength(1);
      expect(before.work.artifacts.filter((artifact) => artifact.schema === 'ResearchSynthesis/v1')).toEqual([]);
      const correctionPointer = 'fixture:correct-native-synthesis-observation';
      suspendLocalWork({
        store: host,
        identity: current.identity,
        journal: prepared.journal,
        expectedWork: before.workVersion,
        expectedLedger: before.ledgerVersion,
        expectedMaintenanceGeneration: before.maintenanceGeneration,
        nativeSessionHandle: admitted.nativeSessionHandle,
        userRequestPointer: correctionPointer,
        requestIntent: 'linked_correction',
        config: current.config,
        documentationContext: {
          repository_root: current.root,
          repository_id: current.identity.repository_id,
          project_id: requiredValue(current.identity.project_ids[0], 'Synthesis project'),
          work_id: current.identity.work_id,
        },
      });
      const paused = presentSnapshot(host.readHostStateSnapshot(current.identity));
      expect(paused.work.execution.status).toBe('suspended');
      expect(paused.work.lease).toBeNull();
      const body: Omit<SynthesisObservationCorrectionPlan, 'digest'> = {
        schema: 'VidaSynthesisObservationCorrectionPlan/v1',
        correction_id: 'fixture-native-synthesis-correction',
        actor: admitted.nativeSessionHandle,
        timestamp: new Date().toISOString(),
        workspace_id: host.workspaceId,
        repository_id: current.identity.repository_id,
        project_ids: current.identity.project_ids,
        integrations_digest: current.identity.integrations_digest,
        work_id: current.identity.work_id,
        attempt: 1,
        action_id: prepared.originalItem.request.action_id,
        prior_issue_id: requiredValue(prepared.originalItem.issue_id, 'Completed native synthesis issue'),
        native_session_handle: admitted.nativeSessionHandle,
        owner_correction_pointer: correctionPointer,
        config_digest: paused.work.binding.config_digest,
        source_digest: paused.work.binding.work_source_revision,
        predecessor_refs: prepared.catalog.result_refs,
        catalog_digest: canonicalJsonDigest(prepared.catalog),
        expected_work: paused.workVersion,
        expected_ledger: paused.ledgerVersion,
        expected_journal: prepared.journal.version,
        original_item: prepared.originalItem,
      };
      // Controlled correction plan input over actual admitted predecessor bytes;
      // this Host unit case does not qualify the CLI's provenance-collision planner.
      const correction = { ...body, digest: canonicalJsonDigest(body) };
      const corrected = ledger.correctObservedSynthesis(correction);
      expect(corrected.state.items).toEqual([
        { request: prepared.originalItem.request, issue_id: null, observation: null },
      ]);
      expect(corrected.state.completed).toEqual(prepared.journal.state.completed);
      expect(ledger.synthesisCorrection(current.identity.work_id, 1, body.action_id)).toEqual(correction);
      expect(ledger.correctObservedSynthesis(correction)).toEqual(corrected);
      expect(host.readHostStateSnapshot(current.identity)).toEqual(paused);
      resumePausedLocalWork({
        store: host,
        ledger,
        identity: current.identity,
        attempt: 1,
        expectedWork: paused.workVersion,
        expectedLedger: paused.ledgerVersion,
        expectedJournal: corrected.version,
        nativeSessionHandle: admitted.nativeSessionHandle,
        configDigest: body.config_digest,
        sourceDigest: body.source_digest,
      });
      const active = presentSnapshot(host.readHostStateSnapshot(current.identity));
      const approvals = active.work.lifecycle.references.filter(
        (reference) => reference.kind === 'execution_approval' && reference.disposition === 'current',
      );
      expect(approvals).toHaveLength(1);
      const principal = 'fixture:native-synthesis-runtime-rebind';
      const verifier: RuntimeCodeRebindVerifier = {
        principal,
        verify: (request) => ({
          schema: 'VidaRuntimeCodeRebindAuthorization/v1',
          request_digest: canonicalJsonDigest(request),
          principal,
          forward_operation_id: request.forwardOperationId,
          parent_manifest_digest: request.parentManifestDigest,
          successor_manifest_digest: request.successorManifestDigest,
          owner_correction_pointer: request.synthesisCorrection!.ownerCorrectionPointer,
          synthesis_correction_digest: request.synthesisCorrection!.correctionDigest,
        }),
      };
      const db = initialSourceHostDatabase(current);
      const checked = new HostStateStore(
        db,
        host.workspaceId,
        undefined,
        undefined,
        undefined,
        undefined,
        current.root,
        verifier,
      );
      const request: RuntimeCodeRebindRequest = {
        identity: current.identity,
        attempt: 1,
        actionId: body.action_id,
        issueId: body.prior_issue_id,
        nativeSessionHandle: admitted.nativeSessionHandle,
        expectedWork: active.workVersion,
        expectedLedger: active.ledgerVersion,
        expectedJournal: corrected.version,
        expectedMaintenanceGeneration: active.maintenanceGeneration,
        oldRuntimeCodeDigest: active.work.binding.runtime_code_digest,
        newRuntimeCodeDigest: canonicalJsonDigest('fixture:corrected-synthesis-runtime'),
        forwardOperationId: 'fixture:corrected-synthesis-forward',
        parentManifestDigest: canonicalJsonDigest('fixture:corrected-synthesis-parent'),
        successorManifestDigest: canonicalJsonDigest('fixture:corrected-synthesis-successor'),
        synthesisCorrection: {
          correctionId: correction.correction_id,
          correctionDigest: correction.digest,
          ownerCorrectionPointer: correctionPointer,
        },
      };
      const rowsBefore = readFixtureHostRows(db);
      await expectRejection(
        checked.rebindRuntimeCode({
          ...request,
          synthesisCorrection: {
            ...requiredValue(request.synthesisCorrection, 'Synthesis correction request'),
            correctionDigest: '0'.repeat(64),
          },
        }),
        'runtime-code rebind issued read-only action changed',
      );
      expect(readFixtureHostRows(db)).toEqual(rowsBefore);
      expect(ledger.synthesisCorrection(current.identity.work_id, 1, body.action_id)).toEqual(correction);
      const rebound = presentSnapshot(await checked.rebindRuntimeCode(request));
      expect(rebound.work.binding).toEqual({
        ...active.work.binding,
        runtime_code_digest: request.newRuntimeCodeDigest,
        runtime_source_revision: request.newRuntimeCodeDigest,
      });
      expect(rebound.work.execution).toEqual(active.work.execution);
      expect(rebound.work.artifacts).toEqual(active.work.artifacts);
      expect(rebound.work.lease).toEqual(active.work.lease);
      expect(rebound.ledger).toEqual(active.ledger);
      expect(rebound.work.lifecycle.phase).toBe(active.work.lifecycle.phase);
      expect(
        rebound.work.lifecycle.references.filter(
          (reference) => reference.kind === 'execution_approval' && reference.disposition === 'current',
        ),
      ).toEqual([]);
      expect(checked.readWorkSessionJournal(current.identity)).toEqual({
        attempt: 1,
        state: corrected.state,
        version: corrected.version,
      });
      expect(ledger.synthesisCorrection(current.identity.work_id, 1, body.action_id)).toEqual(correction);
      const row = requiredValue(
        db
          .query<{ payload: string; digest: string }, []>('SELECT payload,digest FROM agent_host_runtime_code_rebind')
          .get(),
        'Synthesis runtime rebind receipt',
      );
      const receipt = parseJsonRecord(row.payload);
      expect(canonicalJsonDigest(receipt)).toBe(row.digest);
      expect(receipt).toMatchObject({
        request,
        synthesis_correction_digest: correction.digest,
        retired_execution_approval_ids: approvals.map((reference) => reference.record_id),
        binding_history: { original_work: active.work, original_journal: corrected.state },
      });
      await expectRejection(checked.rebindRuntimeCode(request), 'state compare-and-swap conflict');
      expect(checked.readHostStateSnapshot(current.identity)).toEqual(rebound);
      expect(performance.now()).toBeLessThan(deadline);
      completed = true;
    },
    async () => {
      if (fixture) await fixture.close();
      if (ownedRoot) {
        if (completed && performance.now() < deadline) await rm(ownedRoot, { recursive: true, force: true });
        else console.error('Retained native synthesis correction Host fixture: ' + ownedRoot);
      }
    },
    'Native synthesis correction Host fixture',
  );
});

test(
  'native legacy developer frontier continues through current reviewers without fabricated Host history',
  async () => {
    const deadline = performance.now() + failedFinalHostCaseTimeoutMs;
    let f: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
    let ownedRoot: string | undefined;
    let completed = false;
    let continuationBridge: MastraSessionBridge | undefined;
    await withInitialSourceCleanup(
      async () => {
        const current = await createInitialSourceWorkFixture({
          legacyTaskFrontier: true,
          onRoot: (root) => {
            ownedRoot = root;
            console.info('Genuine legacy frontier Host fixture root: ' + root);
          },
        });
        f = current;
        const host = initialSourceHostStore(current);
        const admission = requiredValue(current.input, 'Genuine frontier admission');
        await bindControlledRuntimeInitialization(current.root, current.config, host);
        const prepared = await runSynthesisFixtureInProcess(
          {
            args: [],
            publicRun: () => {
              throw new Error('Native frontier fixture must not enter public CLI');
            },
            sync: () => initialSourceJournal(current),
            repositoryRoot: current.root,
            workId: current.identity.work_id,
            attempt: 1,
            work: requiredValue(host.readHostStateSnapshot(current.identity).work, 'Genuine admitted Work'),
          },
          {
            ledger: initialSourceHostLedger(current),
            bridge: initialSourceHostBridge(current),
            source: current.originalSource,
          },
        );
        const readonlyPreparation = completeReadonlyFixtureHostPreparation(current);
        const peers = admitDisjointInitialSourcePeers(current);
        {
          const nativeBefore = initialSourceState(current);
          const db = initialSourceHostDatabase(current);
          const nativeRows = readFixtureHostRows(db);
          const project = loadProjectSetContext(
            current.root,
            current.config,
            current.identity.repository_id,
            current.identity.project_ids,
          );
          const request: TaskSourceBindingRequest = {
            schema: 'TaskSourceBindingRequest/v1',
            operation: 'inspect',
            operation_id: 'host-earlier-fifo-inspect',
            request_id: 'host-earlier-fifo-request',
            expected_host: {
              work: nativeBefore.workVersion,
              ledger: nativeBefore.ledgerVersion,
              journal: { attempt: 1, version: nativeBefore.journalVersion },
              maintenance_generation: nativeBefore.maintenanceGeneration,
            },
            work_id: current.identity.work_id,
            attempt: 1,
            thread_id: admission.nativeSessionHandle,
            repository_id: current.identity.repository_id,
            project_ids: current.identity.project_ids,
            canonical_host_root: current.root,
            config_digest: runtimeConfigDigest(current.config),
            project_context_digest: project.project_context_digest,
          };
          const sourceAuthorizationDigest = createHash('sha256')
            .update(readFileSync(path.join(current.root, current.sourceAuthorizationPath)))
            .digest('hex');
          const verifyCurrent: Parameters<HostStateStore['prepareTaskSourceBindingOperation']>[0]['verifyCurrent'] = ({
            work,
            ledger,
            journal,
          }) => {
            expect(work).toEqual(nativeBefore.work);
            expect(ledger).toEqual(nativeBefore.ledger);
            expect(journal).toEqual(nativeBefore.journal);
            return {
              source_authorization_sha256: sourceAuthorizationDigest,
              source_scope_digest: work.binding.work_source_revision,
            };
          };
          const input = { request, identity: current.identity, verifyCurrent };
          const preparation = host.prepareTaskSourceBindingOperation(input);
          expect(preparation.status).toBe('prepared');
          expect(host.prepareTaskSourceBindingOperation(input)).toEqual(preparation);
          expect(readFixtureHostRows(db)).toEqual(nativeRows);
          expect(host.inspectTaskSourceBindingOperation(input)).toEqual({ ...preparation, status: 'inspected' });
          expect(readFixtureHostRows(db)).toEqual(nativeRows);
        }
        const executionOnly = presentSnapshot(host.readHostStateSnapshot(current.identity));
        acquireLocalSourceWriterLease({
          repositoryRoot: current.root,
          config: current.config,
          store: host,
          identity: current.identity,
          nativeSessionHandle: admission.nativeSessionHandle,
          stageId: 'develop_task',
          assignmentIndex: 0,
          expectedWork: executionOnly.workVersion,
          expectedLedger: executionOnly.ledgerVersion,
          expectedSessionJournal: { attempt: 1, version: prepared.version },
        });
        const before = presentSnapshot(host.readHostStateSnapshot(current.identity));
        const originalTicket = requiredValue(
          before.ledger.tickets.find((ticket) => ticket.ticket_id === before.work.lease?.ticket_id),
          'Genuine frontier Source ticket',
        );
        const queuedTicket = requiredValue(peers.queuedTicket, 'Genuine frontier queued peer ticket');
        expect(queuedTicket.sequence).toBeLessThan(originalTicket.sequence);
        expect(
          queuedTicket.exclusive_resources.some((resource) => originalTicket.exclusive_resources.includes(resource)),
        ).toBe(false);
        const journal = initialSourceJournal(current);
        expect(before.work.lifecycle.phase).toBe('INTAKE');
        expect(before.work.lifecycle.risk).toBe('low');
        expect(journal).toEqual(prepared);
        expect(journal.state.items).toHaveLength(1);
        expect(journal.state.items[0]).toMatchObject({
          request: { stage_id: 'develop_task', role: 'developer-orchestrator' },
          issue_id: null,
          observation: null,
        });
        const source = requiredValue(journal.state.source_scope, 'Genuine frontier Source');
        const engineBinding = {
          repositoryRoot: current.root,
          config: current.config,
          selection: admission.selection,
          context: { ...admission.context, scope_digest: source.digest },
          workflowId: before.work.binding.workflow_id,
          runId: requiredValue(before.work.execution.run_id, 'Genuine frontier run'),
        };
        const engine = readRetainedUnissuedSessionEngineSnapshot(engineBinding, {
          work: before.work,
          journal: journal.state,
        });
        suspendLocalWork({
          store: host,
          identity: current.identity,
          journal,
          expectedWork: before.workVersion,
          expectedLedger: before.ledgerVersion,
          expectedMaintenanceGeneration: before.maintenanceGeneration,
          nativeSessionHandle: admission.nativeSessionHandle,
          userRequestPointer: 'fixture:planned-frontier-continuation',
          requestIntent: 'linked_correction',
          config: current.config,
          documentationContext: {
            repository_root: current.root,
            repository_id: current.identity.repository_id,
            project_id: 'sample',
            work_id: current.identity.work_id,
          },
        });
        const paused = presentSnapshot(host.readHostStateSnapshot(current.identity));
        expect(paused.work).toMatchObject({
          lifecycle: { phase: 'INTAKE' },
          execution: { status: 'suspended', phase: 'awaiting_followup' },
          lease: null,
        });
        expect(initialSourceJournal(current)).toEqual(journal);
        const configPath = path.join(current.root, 'agent-runtime.config.v1.yaml');
        const configBytes = readFileSync(configPath, 'utf8');
        const targetBytes = current.currentConfigBytes;
        expect(targetBytes).not.toBe(configBytes);
        writeFileSync(configPath, targetBytes);
        const targetConfig = loadRuntimeConfig(current.root);
        const targetConfigDigest = runtimeConfigDigest(targetConfig);
        expect(targetConfigDigest).not.toBe(before.work.binding.config_digest);
        const project = loadProjectSetContext(
          current.root,
          targetConfig,
          current.identity.repository_id,
          current.identity.project_ids,
        );
        const action = projectConfiguredFrontierContinuationAction({
          engine,
          journal: journal.state,
          targetConfigDigest,
          currentSourceScope: source,
        });
        const requests = projectConfiguredPrewriterContinuationRequests({
          ...engineBinding,
          config: targetConfig,
          engine,
          journal: journal.state,
          currentSourceScope: source,
          lifecycleRisk: paused.work.lifecycle.risk,
        });
        expect(requests.map((item) => item.role)).toEqual(['source-planner']);
        const seed = continuationRequestSeed({
          priorConfigDigest: paused.work.binding.config_digest,
          targetConfigDigest,
          projectIds: current.identity.project_ids,
          workspaceId: host.workspaceId,
        });
        const unsigned: DeliveredWorkContinuationRequest = {
          ...seed,
          identity: current.identity,
          nativeSessionHandle: admission.nativeSessionHandle,
          expectedWork: paused.workVersion,
          expectedLedger: paused.ledgerVersion,
          expectedJournal: journal.version,
          expectedMaintenanceGeneration: paused.maintenanceGeneration,
          priorRuntimeCodeDigest: paused.work.binding.runtime_code_digest,
          targetRuntimeCodeDigest: canonicalJsonDigest('fixture-only-current-runtime-endpoint'),
          targetSchemaDigest: paused.work.binding.schema_digest,
          targetProjectContextDigest: project.project_context_digest,
          currentSourceScope: source,
          authorizedSourceChanges: [],
          action,
          originalRequestPointer: 'fixture:planned-frontier-continuation',
        };
        // Only the external transition-verifier input is synthetic. Host/Journal/engine history is native.
        const request = { ...unsigned, sourceTransition: normalConfigEndpointProof(unsigned) };
        const principal = 'fixture:host-continuation-verifier';
        let permitContinuation = false;
        const verify = mock((candidate: DeliveredWorkContinuationRequest, _state: HostStateSnapshot) =>
          permitContinuation
            ? {
                schema: 'VidaDeliveredWorkContinuationAuthorization/v1' as const,
                request_digest: canonicalJsonDigest(candidate),
                principal,
                transition_digest: candidate.sourceTransition.transition_digest,
                action_digest: canonicalJsonDigest(candidate.action),
              }
            : null,
        );
        const db = initialSourceHostDatabase(current);
        const store = new HostStateStore(
          db,
          host.workspaceId,
          undefined,
          undefined,
          undefined,
          undefined,
          current.root,
          undefined,
          undefined,
          { principal, verify },
        );
        const persistedBefore = readFixtureHostRows(db);
        await expectRejection(
          store.continueDeliveredWork({
            ...request,
            expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 },
          }),
          'original unissued frontier Work, Journal or owner differs',
        );
        expect(verify).not.toHaveBeenCalled();
        expect(readFixtureHostRows(db)).toEqual(persistedBefore);
        const receiptTable = db.query(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_delivered_work_continuation'",
        );
        const receiptTableBefore = receiptTable.all();
        await expectRejection(store.continueDeliveredWork(request), 'continuation authorization fields are invalid');
        expect(verify).toHaveBeenCalledTimes(1);
        expect(readFixtureHostRows(db)).toEqual(persistedBefore);
        expect(receiptTable.all()).toEqual(receiptTableBefore);
        permitContinuation = true;
        const result = await store.continueDeliveredWork(request);
        expect(result.status).toBe('continued');
        expect(result.receipt.prior_work).toEqual(paused.work);
        expect(result.receipt.prior_ledger).toEqual(paused.ledger);
        expect(result.receipt.prior_journal).toEqual(journal.state);
        expect(result.snapshot.work?.execution.assignment_attempts).toEqual([readonlyPreparation.attempt]);
        expectTerminalHostResultMutationDenied(
          db,
          store,
          current.identity,
          requiredValue(result.snapshot.work, 'Configured-frontier successor Work'),
          'configured-frontier terminal assignment history differs',
        );
        expect(result.receipt).toMatchObject({
          rights_granted: false,
          accepted_result: false,
          runtime_acceptance: false,
        });
        expect(result.snapshot.work?.lifecycle.phase).toBe('INTAKE');
        expect(result.snapshot.work?.binding.config_digest).toBe(targetConfigDigest);
        expect(result.receipt.successor_journal.items).toEqual(
          requests.map((request) => ({ request, issue_id: null, observation: null })),
        );
        expect(result.receipt.successor_journal.completed).toEqual(journal.state.completed);
        expect(verify).toHaveBeenCalledTimes(2);
        expect(verify).toHaveBeenCalledWith(request, paused);
        const after = readFixtureHostRows(db);
        const retry = await store.continueDeliveredWork(request);
        expect(retry.status).toBe('already_continued');
        expect(retry.receipt).toEqual(result.receipt);
        expect(retry.action).toBeNull();
        expect(readFixtureHostRows(db)).toEqual(after);
        const lookup = requiredValue(
          store.readDeliveredWorkContinuation(current.identity, 1),
          'Native planned continuation lookup',
        );
        expect(lookup.items.map((item) => item.request)).toEqual([...requests]);
        expect(lookup.receipt).toEqual(result.receipt);
        expect(readFixtureHostRows(db)).toEqual(after);
        expect(verify).toHaveBeenCalledTimes(2);
        const currentLedger = new MastraSessionLedger(db, host.workspaceId, targetConfig, current.root, store);
        continuationBridge = await MastraSessionBridge.open({
          repositoryRoot: current.root,
          config: targetConfig,
          ledger: currentLedger,
          projectIds: current.identity.project_ids,
          selection: admission.selection,
          context: { ...admission.context, scope_digest: source.digest },
          workflowId: paused.work.binding.workflow_id,
          workspaceId: host.workspaceId,
          configuredFrontier: { identity: current.identity, attempt: 1 },
        });
        expect(currentLedger.resume(current.identity.work_id, 1)?.state).toEqual(result.receipt.successor_journal);
        expect(store.readHostStateSnapshot(current.identity)).toEqual(result.snapshot);
        const reviewerStep = requiredValue(lookup.journal.state.step_id, 'Native continuation reviewer step');
        let reported = currentLedger.issueWave(current.identity.work_id, 1, lookup.journal.version);
        const issuedLookup = requiredValue(
          store.readDeliveredWorkContinuation(current.identity, 1),
          'Native continuation issued reviewers',
        );
        expect(issuedLookup.item_statuses).toEqual(requests.map(() => 'issued'));
        for (const item of reported.state.items) {
          const preparation = createPrewriterPreparationObservation(
            { request: item.request, issue_id: requiredValue(item.issue_id, 'Native continuation reviewer issue') },
            {
              work: requiredValue(store.readHostStateSnapshot(current.identity).work, 'Native reviewer Work'),
              workId: current.identity.work_id,
            },
            1,
          );
          const summary = JSON.stringify(preparation);
          reported = currentLedger.report(
            current.identity.work_id,
            1,
            reported.version,
            {
              schema: 'VidaSessionObservation/v1',
              action_id: item.request.action_id,
              issue_id: requiredValue(item.issue_id, 'Native reported reviewer issue'),
              agent_id: preparation.observer_id,
              tool_call_ref: 'fixture:native-continuation-reviewer-' + item.issue_id,
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: preparation.evidence_refs,
            },
            source,
          );
        }
        const reportedLookup = requiredValue(
          store.readDeliveredWorkContinuation(current.identity, 1),
          'Native continuation completed reviewers',
        );
        expect(reportedLookup.action_status).toBe('reported');
        expect(reportedLookup.item_statuses).toEqual(requests.map(() => 'reported'));
        expect(reportedLookup.journal).toEqual({ state: reported.state, version: reported.version });
        const observations = reported.state.items.map((item) =>
          requiredValue(item.observation, 'Native reviewer result'),
        );
        const advanced = await continuationBridge.resume(reviewerStep, observations, source);
        const advancedJournal = requiredValue(
          currentLedger.resume(current.identity.work_id, 1),
          'Native developer suffix',
        );
        expect(advanced.step_id).not.toBe(reviewerStep);
        expect(advanced.requests.map((item) => item.stage_id)).toEqual(['develop_task']);
        expect(advancedJournal.state.items.map((item) => item.request)).toEqual([...advanced.requests]);
        expect(advancedJournal.state.items.every((item) => item.issue_id === null && item.observation === null)).toBe(
          true,
        );
        expect(advancedJournal.state.completed).toEqual([
          ...journal.state.completed,
          { step_id: reviewerStep, items: reported.state.items },
        ]);
        const advancedBefore = readFixtureHostRows(db);
        expect(store.readDeliveredWorkContinuation(current.identity, 1)).toBeNull();
        expect(store.readDeliveredWorkContinuationReceipt(current.identity, 1)).toEqual(result.receipt);
        expect(readFixtureHostRows(db)).toEqual(advancedBefore);
        peers.verifyUnchanged();
        expect(performance.now()).toBeLessThan(deadline);
        completed = true;
      },
      async () => {
        await withInitialSourceCleanup(
          async () => {
            if (continuationBridge) await continuationBridge.close();
          },
          async () => {
            if (f) await f.close();
          },
          'Native continuation bridge cleanup',
        );
        if (ownedRoot) {
          if (completed && performance.now() < deadline) await rm(ownedRoot, { recursive: true, force: true });
          else console.error('Retained genuine legacy frontier Host fixture: ' + ownedRoot);
        }
      },
      'Genuine planned frontier Host fixture',
    );
  },
  failedFinalHostCaseTimeoutMs,
);

test('initial Source Host continuation uses genuine unissued engine state and persists one exact receipt', async () => {
  const started = performance.now();
  const deadline = started + 5_000;
  let ownedRoot: string | undefined;
  let f: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
  let completed = false;
  await withInitialSourceCleanup(
    async () => {
      const current = await createInitialSourceWorkFixture({
        onRoot: (created) => {
          ownedRoot = created;
          console.info('Initial Source Host fixture root: ' + created);
        },
      });
      f = current;
      const preparedAt = performance.now();
      if (preparedAt >= deadline) throw new Error('Initial Source fixture exhausted its case deadline.');
      const store = initialSourceHostStore(current);
      expect(current.originalEngine?.step_id).toBe('wave-0');
      expect(current.originalEngine?.requests).toHaveLength(1);
      expect(current.originalEngine?.observations).toEqual([]);
      const peers = admitDisjointInitialSourcePeers(current);
      const source = changeOneAcceptedDocument(current);
      const request = initialSourceRequest(current);
      const before = presentSnapshot(store.readHostStateSnapshot(current.identity));
      const journalBefore = initialSourceJournal(current);
      const fixtureDatabase = initialSourceHostDatabase(current);
      const persistedBefore = readFixtureHostRows(fixtureDatabase);
      expect(request.authorizedSourceChanges.map((change) => change.path)).toEqual([current.documents[1]]);
      expect(request.currentSourceScope).toEqual(source);
      expect(request.currentInitialRequest.stage_id).toBe('synthesize_task');
      expect(store.readInitialSourceContinuationReceipt(current.identity, 1)).toBeNull();
      withExpiredInitialSourceOwner(current, () => {
        let verifications = 0;
        const verifyCurrent: Parameters<HostStateStore['continueInitialSource']>[1] = (state) => {
          verifications += 1;
          return initialSourceProof(current, state);
        };
        const staleRequests = [
          {
            request: {
              ...request,
              expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 },
            },
            error: 'state compare-and-swap conflict',
          },
          {
            request: {
              ...request,
              expectedLedger: { ...request.expectedLedger, revision: request.expectedLedger.revision + 1 },
            },
            error: 'state compare-and-swap conflict',
          },
          {
            request: {
              ...request,
              expectedJournal: { ...request.expectedJournal, revision: request.expectedJournal.revision + 1 },
            },
            error: 'initial Source continuation Journal CAS or checksum changed',
          },
          {
            request: { ...request, expectedMaintenanceGeneration: request.expectedMaintenanceGeneration + 1 },
            error: 'maintenance generation is stale or missing',
          },
        ];
        for (const denied of staleRequests) {
          expect(() => store.continueInitialSource(denied.request, verifyCurrent)).toThrow(denied.error);
          const persisted = readFixtureHostRows(fixtureDatabase);
          expect(persisted.host).toEqual(persistedBefore.host);
          expect(persisted.journal).toEqual(persistedBefore.journal);
          expect(store.readInitialSourceContinuationReceipt(current.identity, 1)).toBeNull();
        }
        expect(verifications).toBe(0);
        expect(() =>
          store.continueInitialSource(request, () => {
            throw new Error('fixture current-proof failure');
          }),
        ).toThrow('fixture current-proof failure');
        const afterVerifierFailure = readFixtureHostRows(fixtureDatabase);
        expect(afterVerifierFailure.host).toEqual(persistedBefore.host);
        expect(afterVerifierFailure.journal).toEqual(persistedBefore.journal);
        expect(store.readInitialSourceContinuationReceipt(current.identity, 1)).toBeNull();
        const changedDocument = path.join(current.root, current.documents[1]);
        const beforeDocument = readFileSync(changedDocument);
        let freshnessChecks = 0;
        let freshnessFailure: { error: unknown } | undefined;
        try {
          expect(() =>
            store.continueInitialSource(request, (state) => {
              freshnessChecks += 1;
              if (freshnessChecks === 2)
                writeFileSync(changedDocument, Buffer.concat([beforeDocument, Buffer.from('late fixture change\n')]));
              return initialSourceProof(current, state);
            }),
          ).toThrow('Source, runtime package, permission or initial engine proof changed during Host CAS');
          expect(freshnessChecks).toBe(2);
        } catch (error) {
          freshnessFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                writeFileSync(changedDocument, beforeDocument);
                return undefined;
              },
            ],
            freshnessFailure,
          );
        }
        expect(readFileSync(changedDocument)).toEqual(beforeDocument);
        expect(store.readHostStateSnapshot(current.identity)).toEqual(before);
        expect(initialSourceJournal(current)).toEqual(journalBefore);
        expect(store.readInitialSourceContinuationReceipt(current.identity, 1)).toBeNull();
        const receipt = store.continueInitialSource(request, verifyCurrent);
        const after = presentSnapshot(store.readHostStateSnapshot(current.identity));
        const journalAfter = initialSourceJournal(current);
        expect(receipt).toMatchObject({
          status: 'initial_request_ready',
          rights_granted: false,
          accepted_result: false,
          runtime_acceptance: false,
        });
        expect(after.work.binding.lifecycle_work_id).toBe(before.work.binding.lifecycle_work_id);
        expect(after.work.binding.work_source_revision).toBe(request.currentSourceScope.digest);
        expect(after.work.binding.runtime_code_digest).toBe(request.currentRuntimeCodeDigest);
        expect(after.work.contracts).toEqual(before.work.contracts);
        expect(after.work.lease?.thread_id).toBe(request.nativeSessionHandle);
        expect(after.workVersion.revision).toBe(before.workVersion.revision + 1);
        expect(after.ledgerVersion.revision).toBe(before.ledgerVersion.revision + 1);
        expect(journalAfter.version.revision).toBe(journalBefore.version.revision + 1);
        expect(journalAfter.state.items).toEqual([
          { request: request.currentInitialRequest, issue_id: null, observation: null },
        ]);
        expect(journalAfter.state.completed).toEqual(journalBefore.state.completed);
        expect(store.readInitialSourceContinuationReceipt(current.identity, 1)).toEqual(receipt);
        expect(verifications).toBe(2);
        const continuedRows = readFixtureHostRows(fixtureDatabase);
        const continuationRows = fixtureDatabase.query(
          'SELECT * FROM agent_host_initial_source_continuation WHERE workspace_id=? AND work_id=? ORDER BY attempt',
        );
        const continuationBefore = continuationRows.all(store.workspaceId, current.identity.work_id);
        expect(continuationBefore).toHaveLength(1);
        expect(() =>
          store.continueInitialSource(
            {
              ...request,
              attempt: 2,
              expectedWork: after.workVersion,
              expectedLedger: after.ledgerVersion,
              expectedJournal: journalAfter.version,
            },
            verifyCurrent,
          ),
        ).toThrow('initial Source continuation Journal CAS or checksum changed');
        expect(readFixtureHostRows(fixtureDatabase)).toEqual(continuedRows);
        expect(continuationRows.all(store.workspaceId, current.identity.work_id)).toEqual(continuationBefore);
        expect(store.readInitialSourceContinuationReceipt(current.identity, 1)).toEqual(receipt);
        expect(store.readInitialSourceContinuationReceipt(current.identity, 2)).toBeNull();
        expect(verifications).toBe(2);
        expect(store.continueInitialSource(request, verifyCurrent)).toEqual(receipt);
        expect(verifications).toBe(2);
        expect(() =>
          store.continueInitialSource(
            { ...request, nativeSessionHandle: request.nativeSessionHandle + '-foreign' },
            verifyCurrent,
          ),
        ).toThrow('initial Source continuation retry differs from its immutable receipt');
        expect(store.readHostStateSnapshot(current.identity)).toEqual(after);
        expect(initialSourceJournal(current)).toEqual(journalAfter);
        expect(source).toEqual(snapshotDeclaredSources(requireSafeRepositoryAccess(current.root), current.documents));
        peers.verifyUnchanged();
      });
      console.info(
        JSON.stringify({
          fixture: 'initial-source-native-host',
          setup_ms: preparedAt - started,
          body_ms: performance.now() - preparedAt,
        }),
      );
      completed = true;
    },
    async () => {
      if (f) await f.close();
      if (ownedRoot) {
        if (completed && performance.now() < deadline) await rm(ownedRoot, { recursive: true, force: true });
        else console.error('Retained Initial Source fixture: ' + ownedRoot);
      }
    },
    'Initial Source Host fixture',
  );
});

test(
  'synthetic legacy Source report reconciliation preserves the completed Host result and releases only file ownership',
  async () => {
    const deadline = performance.now() + failedFinalHostCaseTimeoutMs;
    let rootOwned: string | undefined;
    let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
    let completed = false;
    let clockHeld = false;
    await withInitialSourceCleanup(
      async () => {
        const f = await createInitialSourceWorkFixture({
          onRoot: (created) => {
            rootOwned = created;
            console.info('Synthetic legacy Source report fixture root: ' + created);
          },
        });
        fixture = f;
        if (performance.now() >= deadline) throw new Error('Legacy component setup exhausted its deadline');
        setSystemTime(new Date(initialSourceExpiredOwnerTime(f)));
        clockHeld = true;
        await prepareInitialSourceFrontier(f, 'writer');
        if (performance.now() >= deadline) throw new Error('Legacy component preparation exhausted its deadline');
        const issued = await issueInitialSourceFixtureWriter(f);
        if (performance.now() >= deadline) throw new Error('Legacy component issuance exhausted its deadline');
        const host = initialSourceHostStore(f),
          db = initialSourceHostDatabase(f),
          ledger = initialSourceHostLedger(f);
        const reservation = requiredValue(
          issued.journal.state.items[0]?.host_reservation,
          'actual fixture writer reservation',
        );
        const changedPath = f.documents[0];
        const changedFile = path.join(f.root, changedPath);
        writeFileSync(changedFile, readFileSync(changedFile, 'utf8') + 'fixture legacy Source outcome\n');
        const source = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
        const summary = 'Synthetic component Source outcome; no writer argv';
        const observation = parseSessionBridgeObservation({
          schema: 'VidaSessionObservation/v1',
          action_id: issued.writer.request.action_id,
          issue_id: issued.writer.issue_id,
          host_attempt_id: issued.hostAttemptId,
          changed_paths: [changedPath],
          agent_id: 'fixture:legacy-source-component',
          tool_call_ref: 'fixture:legacy-source-report',
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture://legacy-source-component'],
        });
        const result = host.completeWorkflowAttempt(reservation.receipt, observation);
        expect(result.attempt).toMatchObject({
          status: 'completed',
          result: observation,
          result_digest: canonicalJsonDigest(observation),
        });
        const before = initialSourceState(f);
        const nativeRows = readFixtureHostRows(db);
        const priorRow = requiredValue(
          nativeRows.journal.find((row) => row.work_id === f.identity.work_id && row.attempt === 1),
          'legacy component Journal preimage',
        );
        const candidates: Parameters<HostStateStore['commitCompletedSourceReport']>[0][] = [];
        const stop = new Error('observed component atomic-report rollback');
        const nativeCommit = host.commitCompletedSourceReport.bind(host);
        const commitSpy = spyOn(host, 'commitCompletedSourceReport').mockImplementation((input) => {
          candidates.push(input);
          return nativeCommit({
            ...input,
            verifyCurrent: () => {
              input.verifyCurrent();
              throw stop;
            },
          });
        });
        let reportFailure: { error: unknown } | undefined;
        try {
          let observed: unknown;
          try {
            ledger.report(f.identity.work_id, 1, issued.journal.version, observation, source);
          } catch (error) {
            observed = error;
          }
          expect(observed).toBe(stop);
          expect(db.inTransaction).toBe(false);
          expect(readFixtureHostRows(db)).toEqual(nativeRows);
          expect(initialSourceState(f)).toEqual(before);
        } catch (error) {
          reportFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                commitSpy.mockRestore();
              },
            ],
            reportFailure,
          );
        }
        expect(candidates).toHaveLength(1);
        const candidate = firstOf(candidates, 'actual report-generated Journal candidate');
        const payload = canonicalJson(candidate.nextJournal),
          digest = canonicalJsonDigest(candidate.nextJournal);
        // Fixture-only LEGACY split input; the current atomic report above rolled back.
        expect(
          db
            .query(
              'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1 AND revision=? AND payload=? AND digest=?',
            )
            .run(
              priorRow.revision + 1,
              payload,
              digest,
              host.workspaceId,
              f.identity.work_id,
              priorRow.revision,
              priorRow.payload,
              priorRow.digest,
            ).changes,
        ).toBe(1);
        expect(readFixtureHostRows(db).host).toEqual(nativeRows.host);
        const legacyJournal = initialSourceJournal(f);
        expect(legacyJournal.state).toEqual(candidate.nextJournal);
        expect(legacyJournal.version).toEqual({ revision: priorRow.revision + 1, digest });
        const reconcile = {
          identity: f.identity,
          nativeSessionHandle: requiredLease(before.work).thread_id,
          verifyCurrent: candidate.verifyCurrent,
        };
        const splitRows = readFixtureHostRows(db);
        expect(() =>
          host.reconcileCompletedSourceOwnership({
            ...reconcile,
            nativeSessionHandle: reconcile.nativeSessionHandle + '-foreign',
          }),
        ).toThrow('terminal ownership reconciliation owner differs');
        expect(readFixtureHostRows(db)).toEqual(splitRows);
        const acceptedSourceBytes = readFileSync(changedFile);
        let freshnessFailure: { error: unknown } | undefined;
        try {
          writeFileSync(changedFile, Buffer.concat([acceptedSourceBytes, Buffer.from('unreported fixture drift\n')]));
          expect(() => host.reconcileCompletedSourceOwnership(reconcile)).toThrow(
            'new source report snapshot changed before atomic acceptance',
          );
          expect(db.inTransaction).toBe(false);
          expect(readFixtureHostRows(db)).toEqual(splitRows);
        } catch (error) {
          freshnessFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                writeFileSync(changedFile, acceptedSourceBytes);
                expect(readFileSync(changedFile)).toEqual(acceptedSourceBytes);
              },
            ],
            freshnessFailure,
          );
        }
        const after = presentSnapshot(host.reconcileCompletedSourceOwnership(reconcile));
        expect(after.workVersion.revision).toBe(before.workVersion.revision + 1);
        expect(after.work).toEqual({
          ...before.work,
          revision: after.work.revision,
          lifecycle: { ...before.work.lifecycle, revision: after.work.lifecycle.revision },
          lease: after.work.lease,
        });
        expect(after.work.lease?.ticket_id).not.toBe(before.work.lease?.ticket_id);
        expect(after.ledger.tickets.find((ticket) => ticket.ticket_id === before.work.lease?.ticket_id)).toMatchObject({
          status: 'released',
          active_resources: [],
          blocked_resources: [],
          expires_at: null,
        });
        for (const claim of before.ledger.claims.filter(
          (claim) => claim.ticket_id === before.work.lease?.ticket_id && claim.status === 'active',
        )) {
          const releasedClaim = requiredValue(
            after.ledger.claims.find((item) => item.claim_id === claim.claim_id),
            'released original Source claim',
          );
          expect(releasedClaim).toEqual({
            ...claim,
            status: 'released',
            renewed_at: releasedClaim.renewed_at,
          });
          expect(Date.parse(releasedClaim.renewed_at)).toBeGreaterThanOrEqual(Date.parse(claim.renewed_at));
        }
        const handoff = requiredValue(
          after.ledger.tickets.find((ticket) => ticket.ticket_id === after.work.lease?.ticket_id),
          'execution-only handoff ticket',
        );
        expect(handoff.status).toBe('active');
        expect(handoff.exclusive_resources).toEqual(['execution:' + f.identity.work_id]);
        expect(
          after.ledger.claims.filter(
            (claim) => claim.status === 'active' && claim.resources.some((resource) => resource.startsWith('file:')),
          ),
        ).toEqual([]);
        expect(initialSourceJournal(f).state).toEqual(candidate.nextJournal);
        const settledRows = readFixtureHostRows(db);
        expect(host.reconcileCompletedSourceOwnership(reconcile)).toEqual(after);
        expect(readFixtureHostRows(db)).toEqual(settledRows);
        expect(snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents)).toEqual(source);
        if (performance.now() >= deadline) throw new Error('Legacy component body exhausted its deadline');
        completed = true;
      },
      async () => {
        await withInitialSourceCleanup(
          async () => {
            if (fixture) await fixture.close();
          },
          () => {
            if (clockHeld) setSystemTime();
          },
          'Legacy component clock restoration',
        );
        if (rootOwned) {
          if (completed && performance.now() < deadline) await rm(rootOwned, { recursive: true, force: true });
          else {
            console.error('Retained synthetic legacy Source report fixture: ' + rootOwned);
            if (completed) throw new Error('Legacy component cleanup exhausted its deadline');
          }
        }
      },
      'Synthetic legacy Source report fixture',
    );
  },
  failedFinalHostCaseTimeoutMs,
);

test.each(['rollback', 'terminal-history', 'commit'] as const)(
  'completed Source report Host recovery %s preserves genuine writer lineage',
  async (mode) => {
    const started = performance.now();
    const deadline = started + failedFinalHostCaseTimeoutMs;
    let rootOwned: string | undefined;
    let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
    let completed = false;
    let clockHeld = false;
    await withInitialSourceCleanup(
      async () => {
        const f = await createInitialSourceWorkFixture({
          onRoot: (created) => {
            rootOwned = created;
            console.info('Completed Source report Host fixture root: ' + created);
          },
        });
        fixture = f;
        const admittedAt = performance.now();
        if (performance.now() >= deadline)
          throw new Error('Completed Source report fixture setup exhausted its deadline');
        setSystemTime(new Date(initialSourceExpiredOwnerTime(f)));
        clockHeld = true;
        const prepared = await prepareInitialSourceFrontier(f, 'writer');
        if (performance.now() >= deadline)
          throw new Error('Completed Source report fixture preparation exhausted its deadline');
        expect(prepared.receipt.status).toBe('initial_request_ready');
        expect(prepared.journal.state.items.every((item) => item.issue_id === null)).toBe(true);
        const preparedAt = performance.now();
        const peers = admitDisjointInitialSourcePeers(f, mode === 'commit');
        const peersReadyAt = performance.now();
        const readonlyPreparation = mode !== 'commit' ? completeReadonlyFixtureHostPreparation(f) : undefined;
        if (readonlyPreparation)
          expect(initialSourceState(f).work.execution.assignment_attempts).toEqual([readonlyPreparation.attempt]);
        const issued = await issueInitialSourceFixtureWriter(f);
        const readyAt = performance.now();
        if (readyAt >= deadline) throw new Error('Completed Source report fixture reservation exhausted its deadline');
        const sourceBefore = issued.journal.state.source_scope;
        if (!sourceBefore) throw new Error('Native writer fixture has no Source snapshot');
        const host = initialSourceHostStore(f);
        const db = initialSourceHostDatabase(f);
        const before = initialSourceState(f);
        expect(
          before.work.execution.assignment_attempts.find((attempt) => attempt.attempt_id === issued.hostAttemptId),
        ).toMatchObject({ status: 'started', result: null, result_digest: null });
        expect(issued.journal.state.items[0]?.host_reservation?.approvalAction).toBe('source.write');
        // A controlled private-fixture effect and report; no writer argv or consumer effect is observed.
        const changedPath = f.documents[0];
        const changedFile = path.join(f.root, changedPath);
        writeFileSync(changedFile, readFileSync(changedFile, 'utf8') + 'fixture writer output\n');
        const sourceAfter = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
        const summary = 'Controlled Host fixture Source report';
        const observation = parseSessionBridgeObservation({
          schema: 'VidaSessionObservation/v1',
          action_id: issued.writer.request.action_id,
          host_attempt_id: issued.hostAttemptId,
          changed_paths: [changedPath],
          issue_id: issued.writer.issue_id,
          agent_id: 'fixture:host-source-writer',
          tool_call_ref: 'fixture:host-source-report',
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: ['fixture://host-source-report'],
        });
        const reportPath = path.join(f.root, '.agent/work', f.identity.work_id, 'host-source-report.json');
        writeFileSync(reportPath, JSON.stringify(observation) + '\n');
        const nativeRecovery = createCompletedSourceReportRecoveryFixture(
          {
            root: f.root,
            identity: f.identity,
            documents: f.documents,
            config: f.config,
            hostStore: host,
            continuationState: () => initialSourceState(f),
          },
          issued.writer,
          issued.hostAttemptId,
          observation,
          sourceBefore,
          sourceAfter,
          null,
          reportPath,
        );
        const controlledEndpoint = {
          currentRuntimeCodeDigest: canonicalJsonDigest({ fixture_only: true, endpoint: 'post-report-runtime' }),
          currentManifestDigest: canonicalJsonDigest({ fixture_only: true, manifest: 'post-report-runtime' }),
          nativeSelfAttestationDigest: canonicalJsonDigest({ fixture_only: true, attestation: 'post-report-runtime' }),
        };
        // Only the external new-runtime proof is controlled; Host creates its own transition history.
        const recovery: typeof nativeRecovery =
          mode === 'commit'
            ? {
                ...nativeRecovery,
                request: { ...nativeRecovery.request, ...controlledEndpoint },
                verifyCurrent(candidate, state) {
                  expect({
                    currentRuntimeCodeDigest: candidate.currentRuntimeCodeDigest,
                    currentManifestDigest: candidate.currentManifestDigest,
                    nativeSelfAttestationDigest: candidate.nativeSelfAttestationDigest,
                  }).toEqual(controlledEndpoint);
                  const verified = nativeRecovery.verifyCurrent(
                    {
                      ...candidate,
                      currentRuntimeCodeDigest: nativeRecovery.request.currentRuntimeCodeDigest,
                      currentManifestDigest: nativeRecovery.request.currentManifestDigest,
                      nativeSelfAttestationDigest: nativeRecovery.request.nativeSelfAttestationDigest,
                    },
                    state,
                  );
                  return {
                    ...verified,
                    currentRuntime: {
                      ...verified.currentRuntime,
                      codeDigest: controlledEndpoint.currentRuntimeCodeDigest,
                      manifestDigest: controlledEndpoint.currentManifestDigest,
                    },
                    nativeSelfAttestationDigest: controlledEndpoint.nativeSelfAttestationDigest,
                  };
                },
              }
            : nativeRecovery;
        if (mode !== 'commit') {
          setSystemTime(new Date(initialSourceExpiredOwnerTime(f)));
          if (mode === 'rollback') {
            const persistedBefore = readFixtureHostRows(db);
            db.exec(
              "CREATE TRIGGER fixture_recovery_journal_fault BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT,'fixture recovery Journal fault'); END",
            );
            let faultFailure: { error: unknown } | undefined;
            try {
              expect(() => host.commitCompletedSourceReportRecovery(recovery.request, recovery.verifyCurrent)).toThrow(
                'fixture recovery Journal fault',
              );
              expect(readFixtureHostRows(db)).toEqual(persistedBefore);
              expect(host.readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toBeNull();
            } catch (error) {
              faultFailure = { error };
              throw error;
            } finally {
              completeOwnedCleanup(
                [
                  () => {
                    db.exec('DROP TRIGGER fixture_recovery_journal_fault');
                    return undefined;
                  },
                ],
                faultFailure,
              );
            }
          }
          const retried = host.commitCompletedSourceReportRecovery(recovery.request, recovery.verifyCurrent);
          expect(retried.status).toBe('completed_report_recovered');
          expect(host.readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(retried);
          const restored = initialSourceState(f);
          expect(restored.workVersion).toEqual(retried.work_version);
          const readonlyAttempt = requiredValue(readonlyPreparation, 'completed readonly preparation').attempt;
          expect(readonlyAttempt.attempt_id).not.toBe(issued.hostAttemptId);
          expect(restored.work.execution.assignment_attempts[0]).toEqual(readonlyAttempt);
          expect(restored.work.execution.assignment_attempts).toHaveLength(2);
          const recoveryReceiptRows = db.query(
            'SELECT * FROM agent_host_completed_source_report_recovery WHERE workspace_id=? AND work_id=? AND attempt=1',
          );
          const recoveryReceiptBefore = recoveryReceiptRows.all(host.workspaceId, f.identity.work_id);
          expect(recoveryReceiptBefore).toHaveLength(1);
          expect(
            restored.work.execution.assignment_attempts.find((attempt) => attempt.attempt_id === issued.hostAttemptId),
          ).toMatchObject({
            status: 'completed',
            result: observation,
            result_digest: canonicalJsonDigest(observation),
          });
          if (mode === 'terminal-history') {
            expectTerminalHostResultMutationDenied(
              db,
              host,
              f.identity,
              restored.work,
              'completed Source report recovery binding history is not continuous',
            );
            expect(initialSourceState(f)).toEqual(restored);
            expect(recoveryReceiptRows.all(host.workspaceId, f.identity.work_id)).toEqual(recoveryReceiptBefore);
            expect(host.readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(retried);
          }
        } else {
          const persistedBefore = readFixtureHostRows(db);
          expect(() =>
            host.commitCompletedSourceReportRecovery(
              {
                ...recovery.request,
                expectedWork: {
                  ...recovery.request.expectedWork,
                  revision: recovery.request.expectedWork.revision + 1,
                },
              },
              recovery.verifyCurrent,
            ),
          ).toThrow('state compare-and-swap conflict');
          expect(readFixtureHostRows(db)).toEqual(persistedBefore);
          expect(() => host.commitCompletedSourceReportRecovery(recovery.request, recovery.verifyCurrent)).toThrow(
            'completed Source report recovery original Source ticket or claim differs',
          );
          expect(readFixtureHostRows(db)).toEqual(persistedBefore);
          setSystemTime(new Date(initialSourceExpiredOwnerTime(f)));
          const receipt = host.commitCompletedSourceReportRecovery(recovery.request, recovery.verifyCurrent);
          const after = initialSourceState(f);
          const persistedRows = () => {
            const currentDb = initialSourceHostDatabase(f);
            return {
              ...readFixtureHostRows(currentDb),
              receipts: currentDb
                .query(
                  'SELECT * FROM agent_host_completed_source_report_recovery ORDER BY workspace_id,work_id,attempt',
                )
                .all(),
              governance: currentDb
                .query<GovernanceSqlRow, []>(
                  'SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key',
                )
                .all(),
            };
          };
          const retainedRows = persistedRows();
          expect(receipt).toMatchObject({
            status: 'completed_report_recovered',
            source_write_rights: false,
            runtime_acceptance: false,
          });
          expect(receipt.record.prior_work).toEqual(before.work);
          expect(after.work).toEqual(receipt.record.successor_work);
          expect(after.workVersion).toEqual(receipt.work_version);
          expect(after.ledgerVersion).toEqual(receipt.ledger_version);
          expect(after.journalVersion).toEqual(receipt.journal_version);
          expect(after.work.binding.runtime_code_digest).toBe(controlledEndpoint.currentRuntimeCodeDigest);
          expect(after.work.binding.runtime_code_digest).not.toBe(before.work.binding.runtime_code_digest);
          expect(after.work.binding.work_source_revision).toBe(sourceBefore.digest);
          expect(after.journal.source_scope?.digest).toBe(sourceAfter.digest);
          expect(
            after.work.execution.assignment_attempts.find((attempt) => attempt.attempt_id === issued.hostAttemptId),
          ).toMatchObject({
            status: 'completed',
            result: observation,
            result_digest: canonicalJsonDigest(observation),
          });
          expect(
            after.ledger.claims.some(
              (claim) =>
                claim.work_id === f.identity.work_id &&
                claim.status === 'active' &&
                claim.resources.some((resource) => resource.startsWith('file:')),
            ),
          ).toBe(false);
          expect(host.readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(receipt);
          expect(host.readCompletedSourceReportRecoveryReceipt(f.identity, 2)).toBeNull();
          expect(host.commitCompletedSourceReportRecovery(recovery.request, recovery.verifyCurrent)).toEqual(receipt);
          expect(persistedRows()).toEqual(retainedRows);
          expect(() =>
            host.commitCompletedSourceReportRecovery(
              { ...recovery.request, nativeSessionHandle: recovery.request.nativeSessionHandle + '-foreign' },
              recovery.verifyCurrent,
            ),
          ).toThrow('completed Source report recovery exact retry differs');
          expect(persistedRows()).toEqual(retainedRows);
          await f.close();
          f.ledger = openConfiguredMastraSessionLedger(f.root);
          f.database = f.ledger.sessionProducerBinding().database;
          f.store = f.ledger.hostState;
          const reopened = initialSourceHostStore(f);
          const reopenedState = initialSourceState(f);
          expect(reopenedState).toEqual(after);
          expect(reopened.readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(receipt);
          expect(reopened.commitCompletedSourceReportRecovery(recovery.request, recovery.verifyCurrent)).toEqual(
            receipt,
          );
          expect(persistedRows()).toEqual(retainedRows);
          const acceptedJournal = { state: reopenedState.journal, version: reopenedState.journalVersion };
          const expiredLease = requiredLease(after.work);
          setSystemTime(new Date(initialSourceExpiredOwnerTime(f)));
          const expiredRequest = {
            identity: f.identity,
            attempt: 1,
            nativeSessionHandle: expiredLease.thread_id,
            generation: expiredLease.generation,
            expectedWork: after.workVersion,
            expectedLedger: after.ledgerVersion,
            expectedJournal: acceptedJournal.version,
            expectedMaintenanceGeneration: after.maintenanceGeneration,
            verifyCurrent: (
              work: WorkState,
              journal: MastraSessionLedgerSnapshot['state'],
              sourceRoot: string | undefined,
            ) => {
              expect(work).toEqual(after.work);
              expect(journal).toEqual(acceptedJournal.state);
              expect(sourceRoot).toBe(f.root);
              return {
                runtimeCodeDigest: work.binding.runtime_code_digest,
                authorityPointer: 'fixture:accepted-report-expiry',
              };
            },
          } satisfies Parameters<HostStateStore['recoverExpiredLocalLease']>[0];
          const recovered = presentSnapshot(reopened.recoverExpiredLocalLease(expiredRequest));
          const renewedLease = requiredLease(recovered.work);
          expect(renewedLease.ticket_id).not.toBe(expiredLease.ticket_id);
          expect(renewedLease.thread_id).toBe(expiredLease.thread_id);
          expect(renewedLease.generation).toBe(after.ledger.open_generation);
          expect(recovered.work.execution).toEqual(after.work.execution);
          expect(recovered.work.artifacts).toEqual(after.work.artifacts);
          expect(recovered.work.binding).toEqual(after.work.binding);
          expect(recovered.ledger.tickets.find((ticket) => ticket.ticket_id === expiredLease.ticket_id)?.status).toBe(
            'read_only',
          );
          expect(recovered.ledger.tickets.find((ticket) => ticket.ticket_id === renewedLease.ticket_id)?.status).toBe(
            'active',
          );
          const priorClaim = requiredValue(
            after.ledger.claims.find(
              (claim) => claim.ticket_id === expiredLease.ticket_id && claim.status === 'active',
            ),
            'Accepted-report expired claim',
          );
          expect(recovered.ledger.claims.find((claim) => claim.claim_id === priorClaim.claim_id)).toEqual({
            ...priorClaim,
            status: 'recovered',
          });
          const replacementClaims = recovered.ledger.claims.filter(
            (claim) => claim.ticket_id === renewedLease.ticket_id,
          );
          expect(replacementClaims).toHaveLength(1);
          expect(replacementClaims[0]).toMatchObject({
            status: 'active',
            resources: priorClaim.resources,
            thread_id: renewedLease.thread_id,
            generation: renewedLease.generation,
          });
          expect(recovered.ledger.tickets.find((ticket) => ticket.ticket_id === renewedLease.ticket_id)).toMatchObject({
            claim_ids: [requiredValue(replacementClaims[0], 'Accepted-report replacement claim').claim_id],
            exclusive_resources: priorClaim.resources,
            active_resources: priorClaim.resources,
          });
          expect(initialSourceJournal(f)).toMatchObject({
            state: acceptedJournal.state,
            version: { revision: acceptedJournal.version.revision + 1, digest: acceptedJournal.version.digest },
          });
          expect(reopened.readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(receipt);
          const recoveredRows = readFixtureHostRows(initialSourceHostDatabase(f));
          expect(() => reopened.recoverExpiredLocalLease(expiredRequest)).toThrow('state compare-and-swap conflict');
          expect(readFixtureHostRows(initialSourceHostDatabase(f))).toEqual(recoveredRows);
        }
        peers.verifyUnchanged();
        console.info(
          JSON.stringify({
            fixture: 'completed-source-report-host',
            mode,
            setup_ms: readyAt - started,
            admission_ms: admittedAt - started,
            frontier_ms: preparedAt - admittedAt,
            peers_ms: peersReadyAt - preparedAt,
            writer_ms: readyAt - peersReadyAt,
            body_ms: performance.now() - readyAt,
          }),
        );
        if (performance.now() >= deadline)
          throw new Error('Completed Source report fixture body exhausted its deadline');
        completed = true;
      },
      async () => {
        await withInitialSourceCleanup(
          async () => {
            if (fixture) await fixture.close();
          },
          () => {
            if (clockHeld) setSystemTime();
          },
          'Completed Source report fixture clock restoration',
        );
        if (rootOwned) {
          if (completed && performance.now() < deadline) await rm(rootOwned, { recursive: true, force: true });
          else {
            console.error('Retained completed Source report Host fixture: ' + rootOwned);
            if (completed) throw new Error('Completed Source report fixture cleanup exhausted its deadline');
          }
        }
      },
      'Completed Source report Host fixture',
    );
  },
  failedFinalHostCaseTimeoutMs,
);

test(
  'readonly Initial Source Host frontier rebind retains unissued action and validates persisted history',
  async () => {
    const started = performance.now();
    const deadline = started + failedFinalHostCaseTimeoutMs;
    let rootOwned: string | undefined;
    let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
    let completed = false;
    let clockHeld = false;
    await withInitialSourceCleanup(
      async () => {
        const f = await createInitialSourceWorkFixture({
          onRoot: (root) => {
            rootOwned = root;
            console.info('Readonly frontier Host fixture root: ' + root);
          },
        });
        fixture = f;
        if (performance.now() >= deadline) throw new Error('Readonly frontier fixture setup exhausted its deadline');
        setSystemTime(new Date(initialSourceExpiredOwnerTime(f)));
        clockHeld = true;
        const prepared = await prepareInitialSourceFrontier(f, 'readonly');
        if (performance.now() >= deadline) throw new Error('Readonly frontier preparation exhausted its deadline');
        expect(prepared.journal.state.items).toHaveLength(1);
        expect(prepared.journal.state.items[0]).toMatchObject({
          request: { stage_id: 'review_source_prewrite' },
          issue_id: null,
          observation: null,
        });
        const readonlyPreparation = completeReadonlyFixtureHostPreparation(f);
        const peers = admitDisjointInitialSourcePeers(f);
        const host = initialSourceHostStore(f);
        const db = initialSourceHostDatabase(f);
        const before = initialSourceState(f);
        const request = frontierCodeRequest(f);
        const verify = trustedHostFixtureVerifier(f, fixtureFrontierProof(request));
        const persistedBefore = readFixtureHostRows(db);
        let verifierCalls = 0;
        const checkedVerify: typeof verify = (candidate, state) => {
          verifierCalls++;
          return verify(candidate, state);
        };
        expect(() =>
          host.commitReadOnlyFrontierRuntimeCode(
            { ...request, expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 } },
            checkedVerify,
          ),
        ).toThrow('state compare-and-swap conflict');
        expect(verifierCalls).toBe(0);
        expect(readFixtureHostRows(db)).toEqual(persistedBefore);
        expect(
          host.readInitialSourceFrontierCodeRebindReceipt(f.identity, 1, request.initialContinuationId),
        ).toBeNull();
        const receipt = host.commitReadOnlyFrontierRuntimeCode(request, checkedVerify);
        const after = initialSourceState(f);
        expect(verifierCalls).toBe(2);
        expect(receipt).toMatchObject({
          status: 'rebound',
          rights_granted: false,
          accepted_result: false,
          runtime_acceptance: false,
          current_runtime_code_digest: request.newRuntimeCodeDigest,
        });
        expect(after.work).toEqual({
          ...before.work,
          revision: before.work.revision + 1,
          binding: {
            ...before.work.binding,
            runtime_code_digest: request.newRuntimeCodeDigest,
            runtime_source_revision: request.newRuntimeCodeDigest,
          },
          lifecycle: {
            ...before.work.lifecycle,
            revision: before.work.lifecycle.revision + 1,
            config_binding: {
              ...before.work.lifecycle.config_binding,
              runtime_code_digest: request.newRuntimeCodeDigest,
            },
          },
        });
        expect(after.work).toEqual(receipt.record.successor_work);
        expect(after.work.execution.assignment_attempts).toEqual([readonlyPreparation.attempt]);
        expect(after.workVersion).toEqual(receipt.record.work_version);
        expect(after.ledger).toEqual(before.ledger);
        expect(after.ledgerVersion).toEqual(before.ledgerVersion);
        expect(after.journal).toEqual(before.journal);
        expect(after.journalVersion).toEqual(before.journalVersion);
        expect(host.readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(prepared.receipt);
        expect(host.readInitialSourceContinuationReceipt(f.identity, 2)).toBeNull();
        expect(
          host.readInitialSourceFrontierCodeRebindReceipt(f.identity, 2, request.initialContinuationId),
        ).toBeNull();
        expect(host.readInitialSourceFrontierCodeRebindReceipt(f.identity, 1, request.initialContinuationId)).toEqual(
          receipt,
        );
        expect(host.commitReadOnlyFrontierRuntimeCode(request, checkedVerify)).toEqual(receipt);
        expect(() =>
          host.commitReadOnlyFrontierRuntimeCode(
            { ...request, nativeSessionHandle: request.nativeSessionHandle + '-foreign' },
            checkedVerify,
          ),
        ).toThrow('frontier rebind retry differs from the committed request');
        expect(verifierCalls).toBe(2);
        expect(initialSourceState(f)).toEqual(after);
        expectTerminalHostResultMutationDenied(
          db,
          host,
          f.identity,
          after.work,
          'initial-source frontier code rebind assignment history differs',
        );
        expect(initialSourceState(f)).toEqual(after);
        const laterPreparation = completeReadonlyFixtureHostPreparation(f, 'fixture_readonly_after_rebind');
        const later = initialSourceState(f);
        expect(later.work.execution.assignment_attempts).toEqual([
          readonlyPreparation.attempt,
          laterPreparation.attempt,
        ]);
        expect(laterPreparation.attempt.assignment_id).not.toBe(readonlyPreparation.attempt.assignment_id);
        expect(later.work.binding).toEqual(after.work.binding);
        expect(later.journal).toEqual(after.journal);
        expect(later.ledger).toEqual(after.ledger);
        expect(host.commitReadOnlyFrontierRuntimeCode(request, checkedVerify)).toEqual(receipt);
        expect(initialSourceState(f)).toEqual(later);
        peers.verifyUnchanged();
        console.info(
          JSON.stringify({ fixture: 'readonly-frontier-native-host', elapsed_ms: performance.now() - started }),
        );
        if (performance.now() >= deadline) throw new Error('Readonly frontier body exhausted its deadline');
        completed = true;
      },
      async () => {
        await withInitialSourceCleanup(
          async () => {
            if (fixture) await fixture.close();
          },
          () => {
            if (clockHeld) setSystemTime();
          },
          'Readonly frontier clock restoration',
        );
        if (rootOwned) {
          if (completed && performance.now() < deadline) await rm(rootOwned, { recursive: true, force: true });
          else {
            console.error('Retained readonly frontier Host fixture: ' + rootOwned);
            if (completed) throw new Error('Readonly frontier cleanup exhausted its deadline');
          }
        }
      },
      'Readonly frontier Host fixture',
    );
  },
  failedFinalHostCaseTimeoutMs,
);

test('native code-only continuation fences stale proofs and rolls back before exact history-bound retries', async () => {
  const deadline = performance.now() + 5_000;
  preserveHostFixtureRoot = 'case failed or timed out';
  const { seed, source } = await writerFixture();
  seed.nextWork.binding.runtime_source_revision = seed.nextWork.binding.runtime_code_digest;
  const initial = commitHostState(seed);
  const journal = quiescentJournal();
  journal.state.source_scope = clone(source);
  persistJournalFixture(journal);
  const guarded = new HostStateStore(database, workspace, undefined, undefined, undefined, undefined, root);
  const request: Parameters<HostStateStore['commitQualifiedRuntimeCodeContinuation']>[0] = {
    schema: 'QualifiedRuntimeCodeContinuationRequest/v1',
    identity: { ...identity, project_ids: [...identity.project_ids] },
    attempt: 1,
    nativeSessionHandle: requiredLease(initial.work).thread_id,
    leaseGeneration: requiredLease(initial.work).generation,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: initial.maintenanceGeneration,
    originalSourceScopeDigest: source.digest,
    journalSourceScopeDigest: source.digest,
    oldRuntimeCodeDigest: initial.work.binding.runtime_code_digest,
    currentRuntimeCodeDigest: canonicalJsonDigest('fixture-next-code'),
    oldRuntimeCodePaths: ['packages/agent/src/runtime-kernel.ts'],
    currentRuntimeCodePaths: ['packages/agent/src/runtime-kernel.ts'],
    oldManifestRef: '.agent/work/fixture-code/old-manifest.json',
    oldManifestDigest: canonicalJsonDigest('fixture-old-manifest'),
    oldInstallRef: '.agent/work/fixture-code/old-install.json',
    currentManifestRef: '.agent/work/fixture-code/new-manifest.json',
    currentManifestDigest: canonicalJsonDigest('fixture-new-manifest'),
    currentInstallRef: '.agent/work/fixture-code/new-install.json',
    systemUpdateRef: '.agent/work/fixture-code/new-install.json',
    systemUpdateOperationId: 'fixture-code-update',
    nativeSelfAttestationDigest: canonicalJsonDigest('fixture-self-attestation'),
  };
  const rows = readFixtureHostRows(database);
  const before = guarded.readHostStateSnapshot(identity);
  const planPath = path.join(root, '.agent/work/fixture-code/prepared-plan.json');
  mkdirSync(path.dirname(planPath), { recursive: true });
  writeFileSync(planPath, 'original prepared plan\n');
  const restorePlan = mock(() => {
    writeFileSync(planPath, 'original prepared plan\n');
  });
  const refreshValue = await guarded.withQualifiedRuntimeCodePlanRefresh(
    request,
    () => {
      expect(database.inTransaction).toBe(true);
      writeFileSync(planPath, 'refreshed prepared plan\n');
      return 'owned plan refreshed';
    },
    restorePlan,
  );
  expect(refreshValue).toBe('owned plan refreshed');
  expect(readFileSync(planPath, 'utf8')).toBe('refreshed prepared plan\n');
  expect(restorePlan).not.toHaveBeenCalled();
  expect(readFixtureHostRows(database)).toEqual(rows);
  const refreshFailure = new Error('controlled qualified plan refresh failure');
  await Promise.resolve(
    expect(
      guarded.withQualifiedRuntimeCodePlanRefresh(
        request,
        () => {
          writeFileSync(planPath, 'uncommitted prepared plan\n');
          throw refreshFailure;
        },
        () => {
          writeFileSync(planPath, 'refreshed prepared plan\n');
        },
      ),
    ).rejects.toBe(refreshFailure),
  );
  expect(readFileSync(planPath, 'utf8')).toBe('refreshed prepared plan\n');
  expect(readFixtureHostRows(database)).toEqual(rows);
  expect(database.inTransaction).toBe(false);
  const unchanged = (action: () => unknown, message: string) => {
    expect(action).toThrow(message);
    expect(readFixtureHostRows(database)).toEqual(rows);
    expect(guarded.readQualifiedRuntimeCodeContinuations(identity, 1)).toEqual([]);
  };
  let proofCalls = 0;
  const verify: Parameters<HostStateStore['commitQualifiedRuntimeCodeContinuation']>[1] = (candidate) => {
    proofCalls++;
    return qualifiedRuntimeCodeEndpointFixture(candidate);
  };
  for (const key of ['expectedWork', 'expectedLedger', 'expectedJournal'] as const)
    unchanged(
      () =>
        guarded.commitQualifiedRuntimeCodeContinuation(
          { ...request, [key]: { ...request[key], revision: request[key].revision + 1 } },
          verify,
        ),
      'current CAS or maintenance differs',
    );
  unchanged(
    () =>
      guarded.commitQualifiedRuntimeCodeContinuation(
        { ...request, expectedMaintenanceGeneration: request.expectedMaintenanceGeneration + 1 },
        verify,
      ),
    'current CAS or maintenance differs',
  );
  unchanged(
    () => guarded.commitQualifiedRuntimeCodeContinuation({ ...request, nativeSessionHandle: 'foreign' }, verify),
    'owner, Source, run or quiescence differs',
  );
  unchanged(
    () => store.commitQualifiedRuntimeCodeContinuation(request, verify),
    'qualified code adoption root unavailable',
  );
  unchanged(
    () => database.transaction(() => guarded.commitQualifiedRuntimeCodeContinuation(request, verify)).deferred(),
    'qualified code adoption verifier invalid',
  );
  expect(proofCalls).toBe(0);
  const failure = new Error('controlled code endpoint observation failed');
  let observed: unknown;
  try {
    guarded.commitQualifiedRuntimeCodeContinuation(request, () => {
      throw failure;
    });
  } catch (error) {
    observed = error;
  }
  expect(observed).toBe(failure);
  expect(readFixtureHostRows(database)).toEqual(rows);
  unchanged(
    () =>
      guarded.commitQualifiedRuntimeCodeContinuation(request, (candidate) => ({
        ...qualifiedRuntimeCodeEndpointFixture(candidate),
        nativeSelfAttestationDigest: 'f'.repeat(64),
      })),
    'native endpoint proof differs',
  );
  const sourcePath = path.join(root, 'src/task.ts');
  const originalBytes = readFileSync(sourcePath);
  let primaryFailure: { error: unknown } | undefined;
  let freshnessCalls = 0;
  try {
    unchanged(
      () =>
        guarded.commitQualifiedRuntimeCodeContinuation(request, (candidate) => {
          freshnessCalls++;
          writeFileSync(sourcePath, 'changed between endpoint proof and final CAS\n');
          return qualifiedRuntimeCodeEndpointFixture(candidate);
        }),
      'qualified code adoption cannot absorb Source changes',
    );
    expect(freshnessCalls).toBe(1);
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          writeFileSync(sourcePath, originalBytes);
        },
      ],
      primaryFailure,
    );
  }
  database.exec(
    "CREATE TRIGGER reject_code_adoption BEFORE UPDATE ON agent_host_state BEGIN SELECT RAISE(ABORT,'controlled code adoption write failure'); END",
  );
  primaryFailure = undefined;
  try {
    unchanged(
      () => guarded.commitQualifiedRuntimeCodeContinuation(request, verify),
      'controlled code adoption write failure',
    );
    expect(
      database
        .query("SELECT name FROM sqlite_master WHERE name='agent_host_qualified_runtime_code_continuation'")
        .get(),
    ).toBeNull();
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          database.exec('DROP TRIGGER reject_code_adoption');
        },
      ],
      primaryFailure,
    );
  }
  expect(guarded.readHostStateSnapshot(identity)).toEqual(before);
  proofCalls = 0;
  const receipt = guarded.commitQualifiedRuntimeCodeContinuation(request, verify);
  const after = guarded.readHostStateSnapshot(identity);
  expect(proofCalls).toBe(2);
  expect(receipt).toMatchObject({
    status: 'adopted',
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
  });
  expect(Object.isFrozen(receipt)).toBe(true);
  expect(after.work).toEqual({
    ...initial.work,
    revision: initial.work.revision + 1,
    binding: {
      ...initial.work.binding,
      runtime_code_digest: request.currentRuntimeCodeDigest,
      runtime_source_revision: request.currentRuntimeCodeDigest,
    },
    lifecycle: {
      ...initial.work.lifecycle,
      revision: initial.work.lifecycle.revision + 1,
      config_binding: {
        ...initial.work.lifecycle.config_binding,
        runtime_code_digest: request.currentRuntimeCodeDigest,
      },
    },
  });
  expect(after.workVersion).toEqual(receipt.work_version);
  expect(after.ledger).toEqual(initial.ledger);
  expect(after.ledgerVersion).toEqual(initial.ledgerVersion);
  expect(readFixtureHostRows(database).journal).toEqual(rows.journal);
  expect(guarded.readQualifiedRuntimeCodeContinuations(identity, 1)).toEqual([receipt]);
  expect(
    guarded.commitQualifiedRuntimeCodeContinuation(request, () => {
      throw new Error('exact committed retry must not reobserve endpoints');
    }),
  ).toEqual(receipt);
  expect(guarded.readHostStateSnapshot(identity)).toEqual(after);
  expect(proofCalls).toBe(2);
  expect(() =>
    guarded.commitQualifiedRuntimeCodeContinuation(
      { ...request, currentRuntimeCodeDigest: canonicalJsonDigest('foreign-retry-code') },
      verify,
    ),
  ).toThrow('current CAS or maintenance differs');
  expect(guarded.readHostStateSnapshot(identity)).toEqual(after);
  expect(hasUnresolvedFixtureOperations(database)).toBe(false);
  const afterRows = readFixtureHostRows(database);
  const deniedAction = mock(() => 'unreachable stale refresh');
  const deniedRollback = mock(() => {});
  await Promise.resolve(
    expect(guarded.withQualifiedRuntimeCodePlanRefresh(request, deniedAction, deniedRollback)).rejects.toThrow(
      'state compare-and-swap conflict',
    ),
  );
  expect(deniedAction).not.toHaveBeenCalled();
  expect(deniedRollback).not.toHaveBeenCalled();
  expect(readFixtureHostRows(database)).toEqual(afterRows);
  const nextPlanRequest = {
    ...request,
    expectedWork: requiredValue(after.workVersion, 'adopted Work version'),
    oldRuntimeCodeDigest: request.currentRuntimeCodeDigest,
    currentRuntimeCodeDigest: canonicalJsonDigest('fixture-third-code'),
    oldManifestRef: request.currentManifestRef,
    oldManifestDigest: request.currentManifestDigest,
    oldInstallRef: request.currentInstallRef,
  };
  expect(
    await guarded.withQualifiedRuntimeCodePlanRefresh(
      nextPlanRequest,
      () => {
        writeFileSync(planPath, 'successor prepared plan\n');
        return 'successor plan refreshed';
      },
      deniedRollback,
    ),
  ).toBe('successor plan refreshed');
  expect(deniedRollback).not.toHaveBeenCalled();
  expect(readFileSync(planPath, 'utf8')).toBe('successor prepared plan\n');
  expect(readFixtureHostRows(database)).toEqual(afterRows);
  expect(guarded.readQualifiedRuntimeCodeContinuations(identity, 1)).toEqual([receipt]);
  if (performance.now() >= deadline) throw new Error('Native code-only continuation exhausted its case deadline');
  preserveHostFixtureRoot = false;
});

test('recovery namespace denies generic issuance, settlement and copied handles', () => {
  const operation = validateHostOperationReservation({
    schema: 'OperationReservation/v1',
    store_id: 'vida-recovery-reviews',
    operation_key: 'a'.repeat(64),
    request_digest: 'b'.repeat(64),
    revision: 1,
    fencing_token: randomUUID(),
    status: 'reserved',
    created_at: new Date().toISOString(),
  });
  expect(() => store.reserveOperation(operation.store_id, operation.operation_key, operation.request_digest)).toThrow(
    /protected/,
  );
  expect(() => store.transitionOperation(operation, 'commit_unknown')).toThrow(/protected/);
  expect(() => store.inspectRecoveryReview({ operation })).toThrow(/foreign/);
  expect(() => store.beginRecoveryReview({ operation })).toThrow(/foreign/);
  expect(() => store.completeRecoveryReview({ operation }, { status: 'PASS' })).toThrow(/foreign/);
  expect(database.query<GovernanceSqlRow, []>('SELECT * FROM agent_host_governance').all()).toEqual([]);
});
test('native recovery review rechecks context and preserves its exact reservation through observed completion', () => {
  const deadline = performance.now() + 5_000;
  preserveHostFixtureRoot = 'case failed or timed out';
  const source = fixtureSourceScope();
  const seed = fixture();
  seed.nextWork.binding.work_source_revision = source.digest;
  seed.nextWork.lifecycle.source_revision = source.digest;
  firstTicket(seed.nextLedger).source_revision = source.digest;
  const initial = commitHostState(seed);
  const journal = quiescentJournal();
  journal.state.source_scope = clone(source);
  persistJournalFixture(journal);
  const guarded = new HostStateStore(database, workspace, undefined, undefined, undefined, undefined, root);
  const binding: Parameters<HostStateStore['openRecoveryReview']>[0] = {
    identity,
    attempt: 1,
    callerSession: 'fixture:review-caller',
    controllerId: 'fixture:review-controller',
    userInstructionRef: 'fixture:human-review-intent',
    historicalOwner: 'thread',
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    expectedJournal: journal.version,
    maintenanceGeneration: initial.maintenanceGeneration,
    source,
    context: { kind: 'local-consistency-unit-fixture' },
  };
  const rows = readFixtureHostRows(database);
  const governance = () =>
    database
      .query<GovernanceSqlRow, []>('SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key')
      .all();
  let verifierCalls = 0;
  let rejectContext = false;
  const verifyContext = () => {
    verifierCalls++;
    if (rejectContext) throw new Error('controlled current review context changed');
  };
  const unchanged = (action: () => unknown, message: string, expectedGovernance = governance()) => {
    expect(action).toThrow(message);
    expect(readFixtureHostRows(database)).toEqual(rows);
    expect(governance()).toEqual(expectedGovernance);
  };
  for (const key of ['expectedWork', 'expectedLedger', 'expectedJournal'] as const)
    unchanged(
      () =>
        guarded.openRecoveryReview(
          { ...binding, [key]: { ...binding[key], revision: binding[key].revision + 1 } },
          verifyContext,
        ),
      'state compare-and-swap conflict',
    );
  unchanged(
    () =>
      guarded.openRecoveryReview(
        { ...binding, maintenanceGeneration: binding.maintenanceGeneration + 1 },
        verifyContext,
      ),
    'maintenance generation is stale or missing',
  );
  for (const patch of [
    { attempt: 0 },
    { callerSession: '' },
    { controllerId: 'x'.repeat(513) },
    { userInstructionRef: ' ' },
    { historicalOwner: '' },
  ])
    unchanged(
      () => guarded.openRecoveryReview({ ...binding, ...patch }, verifyContext),
      'recovery caller/intent/owner binding missing',
    );
  unchanged(
    () => guarded.openRecoveryReview({ ...binding, historicalOwner: 'foreign' }, verifyContext),
    'recovery historical owner differs',
  );
  unchanged(
    () => guarded.openRecoveryReview({ ...binding, attempt: 2 }, verifyContext),
    'recovery original journal missing',
  );
  unchanged(
    () => guarded.openRecoveryReview({ ...binding, source: { ...source, entries: [] } }, verifyContext),
    'recovery source scope changed',
  );
  expect(verifierCalls).toBe(0);
  unchanged(() => store.openRecoveryReview(binding, verifyContext), 'recovery original context unavailable');
  unchanged(
    () => database.transaction(() => guarded.openRecoveryReview(binding, verifyContext)).deferred(),
    'nested recovery transaction forbidden',
  );
  unchanged(() => guarded.openRecoveryReview(binding, () => true), 'recovery context check invalid');
  unchanged(
    () => guarded.openRecoveryReview(binding, verifyContext, 'resume'),
    'recovery reservation exists or resume body is missing',
  );
  rejectContext = true;
  unchanged(() => guarded.openRecoveryReview(binding, verifyContext), 'controlled current review context changed');
  rejectContext = false;
  const handle = guarded.openRecoveryReview(binding, verifyContext);
  expect(Object.isFrozen(handle)).toBe(true);
  expect(Object.isFrozen(handle.operation)).toBe(true);
  expect(handle.operation.status).toBe('reserved');
  expect(guarded.inspectRecoveryReview(handle)).toEqual(handle.operation);
  expect(readFixtureHostRows(database)).toEqual(rows);
  unchanged(
    () => guarded.openRecoveryReview(binding, verifyContext),
    'recovery reservation exists or resume body is missing',
  );
  unchanged(
    () => guarded.openRecoveryReview({ ...binding, context: { kind: 'foreign' } }, verifyContext, 'resume'),
    'recovery retained request differs',
  );
  const resumed = guarded.openRecoveryReview(binding, verifyContext, 'resume');
  expect(resumed.operation).toEqual(handle.operation);
  unchanged(() => guarded.beginRecoveryReview({ ...handle }), 'recovery handle is foreign');
  const observation = {
    action_id: handle.operation.operation_key,
    caller_session: binding.callerSession,
    controller_id: binding.controllerId,
    status: 'PASS',
    observation: {
      agent_id: 'fixture:reviewer',
      tool_call_ref: 'fixture:cooperative-review',
      result: { reviewed: true },
    },
  };
  unchanged(
    () => guarded.completeRecoveryReview(handle, observation),
    'recovery action already possible or terminal; reissue forbidden',
  );
  const sourcePath = path.join(root, 'src/task.ts');
  const originalBytes = readFileSync(sourcePath);
  let primaryFailure: { error: unknown } | undefined;
  try {
    writeFileSync(sourcePath, 'changed current review Source\n');
    unchanged(() => guarded.beginRecoveryReview(handle), 'recovery source scope changed');
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          writeFileSync(sourcePath, originalBytes);
        },
      ],
      primaryFailure,
    );
  }
  rejectContext = true;
  unchanged(() => guarded.beginRecoveryReview(handle), 'controlled current review context changed');
  rejectContext = false;
  const begun = guarded.beginRecoveryReview(resumed);
  expect(begun).toEqual({ ...handle.operation, status: 'commit_unknown', terminal_revision: 2 });
  expect(guarded.inspectRecoveryReview(handle)).toEqual(begun);
  unchanged(
    () => guarded.beginRecoveryReview(handle),
    'recovery action already possible or terminal; reissue forbidden',
  );
  unchanged(
    () => database.transaction(() => guarded.completeRecoveryReview(handle, observation)).deferred(),
    'nested recovery transaction forbidden',
  );
  for (const patch of [
    { action_id: 'foreign' },
    { status: 'UNKNOWN' },
    { controller_id: 'foreign' },
    { caller_session: 'foreign' },
    { extra: true },
    { observation: null },
    { observation: [] },
  ])
    unchanged(
      () => guarded.completeRecoveryReview(handle, { ...observation, ...patch }),
      'recovery terminal observation differs',
    );
  for (const patch of [{ agent_id: '' }, { agent_id: 'x'.repeat(513) }, { tool_call_ref: ' ' }, { result: null }])
    unchanged(
      () =>
        guarded.completeRecoveryReview(handle, {
          ...observation,
          observation: { ...observation.observation, ...patch },
        }),
      'recovery actual native observation missing',
    );
  unchanged(() => guarded.completeRecoveryReview(handle, undefined), 'recovery actual observation required');
  const completed = guarded.completeRecoveryReview(handle, observation);
  expect(completed).toEqual({
    ...handle.operation,
    status: 'applied',
    terminal_revision: 3,
    result_digest: canonicalJsonDigest(observation),
  });
  expect(guarded.completeRecoveryReview(resumed, observation)).toEqual(completed);
  const terminalResume = guarded.openRecoveryReview(binding, verifyContext, 'resume');
  expect(terminalResume.operation).toEqual(handle.operation);
  expect(guarded.inspectRecoveryReview(terminalResume)).toEqual(completed);
  unchanged(
    () => guarded.beginRecoveryReview(terminalResume),
    'recovery action already possible or terminal; reissue forbidden',
  );
  unchanged(
    () => guarded.completeRecoveryReview(handle, { ...observation, status: 'FAIL' }),
    'recovery terminal result conflict',
  );
  expect(guarded.inspectRecoveryReview(handle)).toEqual(completed);
  expect(guarded.readHostStateSnapshot(identity)).toEqual(initial);
  expect(readFixtureHostRows(database)).toEqual(rows);
  expect(
    governance().filter((row) => row.store_id === handle.operation.store_id && row.kind === 'operation'),
  ).toHaveLength(1);
  expect(hasUnresolvedFixtureOperations(database)).toBe(false);
  if (performance.now() >= deadline) throw new Error('Native recovery review exhausted its case deadline');
  preserveHostFixtureRoot = false;
});
test('Codex Desktop adapter contract binds identity, digests, opaque host capability and service closure', () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const deadline = performance.now() + 5_000;
  const contract = {
    schema: 'CodexDesktopAdapterContract/v1',
    issuer: 'codex-desktop',
    session_id: 'session-1',
    thread_id: 'thread-1',
    repository_id: 'repository',
    project_ids: ['project'],
    integrations_digest: 'a'.repeat(64),
    principal: 'codex:desktop',
    repository_root: root,
    config_digest: 'b'.repeat(64),
    schema_digest: 'c'.repeat(64),
    source_digest: 'd'.repeat(64),
    bundle_digest: 'e'.repeat(64),
    issuer_attestation_digest: 'f'.repeat(64),
    host_capability: store.governanceCapability,
    services: {
      runtime_revision: () => undefined,
      resolve_identity: () => undefined,
      verify_approval: () => undefined,
      cas_writer: () => undefined,
      workflow_attempts: {
        claimWorkflowAssignment: () => undefined,
        completeWorkflowAttempt: () => undefined,
        markWorkflowAttemptUncertain: () => undefined,
      },
    },
  } satisfies ReturnType<typeof assertCodexDesktopAdapterContract>;
  expect(assertCodexDesktopAdapterContract(contract)).toBe(contract);
  const multipleProjects = { ...contract, project_ids: ['project-a', 'project-b'] };
  expect(assertCodexDesktopAdapterContract(multipleProjects)).toBe(multipleProjects);
  for (const projectIds of [null, 'project', [], ['project', 'project'], ['project-b', 'project-a']])
    expect(() => assertCodexDesktopAdapterContract({ ...contract, project_ids: projectIds })).toThrow(
      'Desktop adapter identity or digest binding invalid',
    );
  expect(() => assertCodexDesktopAdapterContract({ ...contract, host_capability: {} })).toThrow(
    /opaque SQLite capability/,
  );
  expect(() => assertCodexDesktopAdapterContract({ ...contract, thread_id: '' })).toThrow(/identity or digest binding/);
  expect(() => assertCodexDesktopAdapterContract({ ...contract, issuer_attestation_digest: 'not-a-digest' })).toThrow(
    /identity or digest binding/,
  );
  expect(() =>
    assertCodexDesktopAdapterContract({ ...contract, services: { ...contract.services, cas_writer: null } }),
  ).toThrow(/service closure/);
  expect(contract.project_ids).toEqual(['project']);
  if (performance.now() >= deadline) throw new Error('Desktop adapter contract fixture exceeded its case deadline');
  preserveHostFixtureRoot = false;
});
test('trusted host composition rejects missing governance before loading project configuration', async () => {
  const launcher = createTestTrustedHostLauncherCapability({
    authentication: {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: 'project-repository',
      projectIds: ['project'],
      integrationsDigest: 'e'.repeat(64),
      principal: 'fixture:executor',
      configRevision: 1,
      permittedOperations: ['runtime.read'],
    },
    services: {
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'fixture', currentRevision: 1 }),
      casWriter: () => undefined,
    },
  });
  await Promise.resolve(
    expect(createTrustedHostComposition(launcher)).rejects.toThrow(/host governance capability is required/),
  );
});
function lifecycle(binding: WorkBinding, revision = 1): DeepMutable<LifecycleState> {
  return {
    schema: 'LifecycleState/v1',
    revision,
    phase: 'INTAKE',
    source_revision: binding.work_source_revision,
    next_action: 'Trace the accepted work request.',
    route: 'R3',
    risk: 'high',
    change_kind: 'migration',
    config_binding: {
      config_digest: binding.config_digest,
      schema_digest: binding.schema_digest,
      runtime_code_digest: binding.runtime_code_digest,
    },
    scope: {
      scope_id: binding.scope_id,
      allowed_paths: binding.allowed_resources
        .filter((value) => value.startsWith('file:'))
        .map((value) => value.slice(5)),
      fingerprint_paths: binding.implementation_paths,
      implementation_paths: binding.implementation_paths,
      documentation_paths: [],
    },
    seal: null,
    assurance: {
      epoch: 'epoch-1',
      review_generation: 0,
      correction_count: 0,
      review_failure_count: 0,
      delivery_cycle_id: null,
    },
    references: [],
  } satisfies DeepMutable<LifecycleState>;
}
function fixture(id = 'work', resource = 'file:src/task.ts'): MutableHostStateWrite {
  const binding = {
    repository_id: 'project-repository',
    project_ids: ['project'],
    integrations_digest: 'e'.repeat(64),
    team_id: 'team',
    workflow_id: 'bug_fix',
    provider_work_item_id: 'external-' + id,
    lifecycle_work_id: id,
    work_item_digest: 'b'.repeat(64),
    work_source_revision: 'source',
    scope_id: 'scope-' + id,
    scope_contract_digest: 'c'.repeat(64),
    acceptance_manifest_digest: 'd'.repeat(64),
    ac_ids: ['AC-1'],
    implementation_paths: [resource.slice(5)],
    allowed_resources: [resource],
    config_digest: 'e'.repeat(64),
    runtime_source_revision: 'runtime-source',
    schema_digest: 'f'.repeat(64),
    runtime_code_digest: '0'.repeat(64),
  } satisfies DeepMutable<WorkState>['binding'];
  const leaseExpiresAt = new Date(Date.now() + 3600_000).toISOString();
  const claim = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'claim-' + id,
    ticket_id: 'ticket-' + id,
    work_id: id,
    thread_id: 'thread',
    generation: 1,
    resources: [resource],
    lease_expires_at: leaseExpiresAt,
    status: 'active',
    created_at: new Date().toISOString(),
    renewed_at: new Date().toISOString(),
  } satisfies DeepMutable<CoordinationClaim>;
  const ticket = {
    schema: 'CoordinationTicket/v1',
    ticket_id: 'ticket-' + id,
    repository_id: 'project-repository',
    project_ids: ['project'],
    integrations_digest: 'e'.repeat(64),
    work_id: id,
    thread_id: 'thread',
    source_revision: 'source',
    generation: 1,
    sequence: 1,
    contour_keys: ['tenant:tenant', 'project:tenant/project', resource],
    exclusive_resources: [resource],
    status: 'active',
    claim_ids: [claim.claim_id],
    expires_at: leaseExpiresAt,
    active_resources: [resource],
    blocked_resources: [],
    created_at: new Date().toISOString(),
  } satisfies DeepMutable<CoordinationTicket>;
  const value: MutableHostStateWrite = {
    expectedWork: null,
    expectedLedger: null,
    nextWork: {
      schema: 'WorkState/v1',
      workspace_id: workspace,
      revision: 1,
      binding,
      contracts: {
        scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: binding.scope_contract_digest },
        acceptance: {
          schema: 'AcceptanceManifest/v1',
          path: '.agent/acceptance.json',
          sha256: binding.acceptance_manifest_digest,
        },
        decisions: [],
      },
      lease: { ticket_id: ticket.ticket_id, thread_id: ticket.thread_id, generation: ticket.generation },
      execution: {
        run_id: 'run-' + id,
        input_digest: '1'.repeat(64),
        phase: 'implementation',
        status: 'active',
        assignment_attempts: [],
      },
      lifecycle: lifecycle(binding),
      artifacts: [],
    },
    nextLedger: {
      schema: 'CoordinationLedger/v1',
      workspace_id: workspace,
      revision: 1,
      open_generation: 1,
      next_sequence: 2,
      tickets: [ticket],
      claims: [claim],
      notices: [],
      dispositions: [],
      contours: [],
      batches: [],
      rebinds: [],
      operations: [],
      retirements: [],
    },
  };
  const checkedLedger = validateCoordinationLedgerV1(value.nextLedger);
  if (!checkedLedger.ok) throw new Error('Host fixture CoordinationLedger is invalid');
  validateLifecycleAggregate(value.nextWork);
  return value;
}

test('Host and readonly inspection share a lazy WorkState schema without caching valid records', async () => {
  const compilation = observeWorkStateSchemaCompiles();
  const compiledWorkSchemas = compilation.schemas;

  try {
    await import('../../src/orchestration/inspect-local-session.ts');
    await import(`../../src/orchestration/inspect-local-session.ts?lazy=${randomUUID()}`);
    expect(compiledWorkSchemas).toEqual([]);
    const freshSchema = (await import(
      `../../src/contracts/work-state-schema.ts?lazy=${randomUUID()}`
    )) as typeof import('../../src/contracts/work-state-schema.ts');
    expect(compiledWorkSchemas).toEqual([]);
    const request = fixture();
    expect(expectReturned(() => freshSchema.validateWorkState(request.nextWork))).toBe(true);
    expect(compiledWorkSchemas).toHaveLength(1);
    expect(expectReturned(() => freshSchema.validateWorkState(request.nextWork))).toBe(true);
    expect(compiledWorkSchemas).toHaveLength(1);
    // A qualified query creates a new module instance while Ajv's constructor remains shared.
    const fresh = (await import(
      `../../src/host-state.ts?lazy=${randomUUID()}`
    )) as typeof import('../../src/host-state.ts');
    expect(compiledWorkSchemas).toHaveLength(1);

    const freshStore = new fresh.HostStateStore(database, workspace);
    const committed = expectReturned(() => freshStore.compareAndSwapHostState(request));
    // Earlier cases may already have compiled the shared ordinary module.
    // The fresh owner above always compiles once; public callers add at most one.
    const publicCompileCount = compiledWorkSchemas.length;
    expect(publicCompileCount).toBeGreaterThanOrEqual(1);
    expect(publicCompileCount).toBeLessThanOrEqual(2);

    const saved = presentSnapshot(expectReturned(() => freshStore.readHostStateSnapshot(identity)));
    expect(saved.work.workspace_id).toBe(workspace);
    expect(saved.work.binding.lifecycle_work_id).toBe('work');
    expect(saved.workVersion.revision).toBe(saved.work.revision);
    expect(saved.ledgerVersion.revision).toBe(saved.ledger.revision);
    expect(committed).toEqual(saved);
    expect(compiledWorkSchemas).toHaveLength(publicCompileCount);

    const invalid = fixture();
    invalid.expectedWork = saved.workVersion;
    invalid.expectedLedger = saved.ledgerVersion;
    invalid.nextWork.revision = saved.work.revision + 1;
    invalid.nextLedger.revision = saved.ledger.revision + 1;
    expect(Reflect.deleteProperty(invalid.nextWork.execution, 'assignment_attempts')).toBe(true);
    expect(expectReturned(() => freshSchema.validateWorkState(invalid.nextWork))).toBe(false);
    expect(expectReturned(() => validateWorkState(invalid.nextWork))).toBe(false);
    expect(() => freshStore.compareAndSwapHostState(invalid)).toThrow('work record must match current WorkState/v1');

    expect(expectReturned(() => freshStore.readHostStateSnapshot(identity))).toEqual(saved);
    expect(compiledWorkSchemas).toHaveLength(publicCompileCount);
  } catch (error) {
    preserveHostFixtureRoot = true;
    throw error;
  } finally {
    compilation.restore();
  }
});

function next(
  snapshot: PresentHostSnapshot = presentSnapshot(store.readHostStateSnapshot(identity)),
): MutableHostStateWrite {
  const work = clone(snapshot.work),
    ledger = clone(snapshot.ledger);
  work.revision++;
  work.lifecycle.revision++;
  ledger.revision++;
  return {
    expectedWork: clone(snapshot.workVersion),
    expectedLedger: clone(snapshot.ledgerVersion),
    expectedMaintenanceGeneration: snapshot.maintenanceGeneration,
    nextWork: work,
    nextLedger: ledger,
  };
}
function currentConfigHostFixture(id = 'work', resource = 'file:src/task.ts'): MutableHostStateWrite {
  const seed = fixture(id, resource);
  const configDigest = runtimeConfigDigest(loadRuntimeConfig(root));
  const sourceRevision = '6'.repeat(64);
  seed.nextWork.binding.team_id = 'default-development';
  seed.nextWork.binding.config_digest = configDigest;
  seed.nextWork.lifecycle.config_binding.config_digest = configDigest;
  seed.nextWork.binding.work_source_revision = sourceRevision;
  seed.nextWork.lifecycle.source_revision = sourceRevision;
  firstTicket(seed.nextLedger).source_revision = sourceRevision;
  return seed;
}

test('successor admission atomically releases predecessor rights and rejects changed retry or stale CAS', () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const active = commitHostState(currentConfigHostFixture('work', 'file:src/one.ts'));
  const attempt = store.claimWorkflowAttempt(attemptRequest(active));
  let first = readPresentSnapshot(store, identity);
  const retainedRequest: TestJournalState['items'][number]['request'] = {
    schema: 'VidaSessionRequest/v1',
    run_id: 'run-work',
    workflow_id: first.work.binding.workflow_id,
    wave_index: 0,
    action_id: '2'.repeat(64),
    assignment_index: 0,
    stage_id: 'readonly',
    role: 'research-synthesizer',
    config_digest: first.work.binding.config_digest,
    scope_digest: first.work.binding.work_source_revision,
    bindings_manifest_ref: '3'.repeat(64),
  };
  const issueId = randomUUID();
  const summary = 'Retained cooperative readonly Journal report.';
  const retainedObservation = parseSessionBridgeObservation({
    schema: 'VidaSessionObservation/v1',
    action_id: retainedRequest.action_id,
    issue_id: issueId,
    agent_id: 'fixture:readonly',
    tool_call_ref: 'fixture:absorption-readonly',
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: [],
  });
  const journal: TestJournalState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: 'work',
    attempt: 1,
    run_id: 'run-work',
    step_id: 'wave1',
    items: [
      { request: { ...retainedRequest, action_id: '4'.repeat(64), wave_index: 1 }, issue_id: null, observation: null },
    ],
    completed: [
      {
        step_id: 'wave0',
        items: [{ request: retainedRequest, issue_id: issueId, observation: retainedObservation }],
      },
    ],
  };
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database
    .query<never, SQLQueryBindings[]>('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspace, 'work', 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
  const incoming = includeExistingLedger(fixture('successor', 'file:src/two.ts'), first.ledger);
  const { expectedWork: _omittedExpectedWork, ...incomingState } = incoming;
  let request: Parameters<HostStateStore['admitSuccessorWork']>[0] = {
    ...incomingState,
    expectedLedger: first.ledgerVersion,
    expectedMaintenanceGeneration: first.maintenanceGeneration,
    nativeSessionHandle: 'thread',
    requestPointer: 'user:second',
    predecessors: [
      {
        identity,
        expectedWork: first.workVersion,
        attempt: 1,
        expectedJournal: { revision: 1, digest: canonicalJsonDigest(journal) },
        requestPointer: 'user:first',
      },
    ],
    verifySuccessor() {},
    verifyCurrent(_work, current, pointer) {
      expect(pointer).toBe('user:first');
      expect(current).toEqual(journal);
    },
  };
  expect(() => store.admitSuccessorWork(request)).toThrow(
    'predecessor authority or active source effect prevents absorption',
  );
  expect(store.readHostStateSnapshot(identity)).toEqual(first);
  expect(store.readHostStateSnapshot({ ...identity, work_id: 'successor' }).work).toBeNull();
  store.completeWorkflowAttempt(attempt, { summary: 'Original retained implementation result.' });
  first = readPresentSnapshot(store, identity);
  request = {
    ...request,
    expectedLedger: first.ledgerVersion,
    predecessors: request.predecessors.map((entry) => ({ ...entry, expectedWork: first.workVersion })),
  };
  const firstPredecessor = request.predecessors[0];
  if (!firstPredecessor) throw new Error('successor fixture predecessor missing');
  const bad = {
    ...request,
    predecessors: [{ ...firstPredecessor, expectedJournal: { revision: 2, digest: canonicalJsonDigest(journal) } }],
  };
  expect(() => Reflect.apply(store.admitSuccessorWork.bind(store), undefined, [bad])).toThrow(/journal CAS/);
  expect(store.readHostStateSnapshot(identity)).toEqual(first);
  expect(store.readHostStateSnapshot({ ...identity, work_id: 'successor' }).work).toBeNull();
  database.exec(
    "CREATE TEMP TRIGGER fixture_successor_ledger_failure BEFORE UPDATE ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT, 'fixture successor ledger failure'); END",
  );
  let primaryFailure: { error: unknown } | undefined;
  try {
    expect(() => store.admitSuccessorWork(request)).toThrow('fixture successor ledger failure');
    expect(database.inTransaction).toBe(false);
    expect(store.readHostStateSnapshot(identity)).toEqual(first);
    expect(store.readHostStateSnapshot({ ...identity, work_id: 'successor' }).work).toBeNull();
    expect(store.readWorkSessionJournal(identity)?.state).toEqual(journal);
  } catch (error) {
    primaryFailure = { error };
    preserveHostFixtureRoot = true;
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          database.exec('DROP TRIGGER fixture_successor_ledger_failure');
        },
      ],
      primaryFailure,
    );
  }
  const admitted = presentSnapshot(store.admitSuccessorWork(request));
  const prior = presentSnapshot(store.readHostStateSnapshot(identity));
  const priorTransition = prior.work.request_transition;
  const admittedTransition = admitted.work.request_transition;
  if (!priorTransition || !admittedTransition) throw new Error('successor transition fixture is missing');
  expect(prior.work.lease).toBeNull();
  expect(prior.work.execution.status).toBe('suspended');
  expect(prior.work.lifecycle.phase).toBe(first.work.lifecycle.phase);
  expect(prior.work.artifacts).toEqual(first.work.artifacts);
  expect(first.work.execution.assignment_attempts).toHaveLength(1);
  expect(first.work.execution.assignment_attempts[0]?.status).toBe('completed');
  expect(prior.work.execution.assignment_attempts).toEqual(first.work.execution.assignment_attempts);
  expect(priorTransition.successor_work_id).toBe('successor');
  expect(admittedTransition.predecessor_work_ids).toEqual(['work']);
  const releasedClaim = admitted.ledger.claims.find((claim) => claim.work_id === 'work');
  if (!releasedClaim) throw new Error('released predecessor claim fixture is missing');
  expect(releasedClaim.status).toBe('released');
  expect(store.admitSuccessorWork(request)).toEqual(admitted);
  expect(() =>
    store.admitSuccessorWork({
      ...request,
      nextWork: { ...request.nextWork, execution: { ...request.nextWork.execution, run_id: 'another-base-attempt' } },
    }),
  ).toThrow(/retry differs/);
  expect(store.readHostStateSnapshot({ ...identity, work_id: 'successor' })).toEqual(admitted);
  expect(() => store.admitSuccessorWork({ ...request, requestPointer: 'user:changed' })).toThrow(/retry differs/);
  expect(
    parseJsonRecord(
      database
        .query<PayloadSqlRow, [string]>('SELECT payload FROM agent_host_mastra_session_ledger WHERE work_id=?')
        .get('work')?.payload ?? '',
    ),
  ).toEqual(journal);
  preserveHostFixtureRoot = false;
});

test('bundled work-state repair plans atomically, resumes exact postimages and restores without evidence loss', async () => {
  const { seed, source } = await writerFixture();
  const original = commitHostState(seed);
  const journal = completedRecoveryJournal('work', requiredValue(original.work.execution.run_id, 'repair run'), source);
  const retained = readFixtureHostRows(database);
  const inspection = store.repairRequestTransitionFields({ mode: 'inspect', operationId: 'fixture-repair' });
  expect(inspection.changed_work).toHaveLength(1);
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  const plan = store.repairRequestTransitionFields({
    mode: 'plan',
    operationId: 'fixture-repair',
    actor: 'fixture-owner',
  });
  expect(plan.status).toBe('planned');
  expect(plan.bindings).toEqual({
    ledger_version: original.ledgerVersion,
    journals: [{ work_id: 'work', attempt: journal.state.attempt, version: journal.version }],
  });
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  const cancelledRequest = { operationId: 'fixture-repair-cancel' };
  const cancelledPlan = store.repairRequestTransitionFields({
    ...cancelledRequest,
    mode: 'plan',
    actor: 'fixture-owner',
  });
  expect(cancelledPlan.status).toBe('planned');
  expect(readFixtureHostRows(database)).toEqual(retained);
  const cancelled = store.repairRequestTransitionFields({ ...cancelledRequest, mode: 'restore' });
  expect(cancelled.status).toBe('restored');
  expect(readFixtureHostRows(database)).toEqual(retained);
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  expect(store.repairRequestTransitionFields({ ...cancelledRequest, mode: 'restore' })).toEqual(cancelled);
  expect(readFixtureHostRows(database)).toEqual(retained);
  const cancelledRow = requiredValue(
    database
      .query<{ payload: string; digest: string }, [string, string]>(
        'SELECT payload,digest FROM agent_host_work_state_repair WHERE workspace_id=? AND operation_id=?',
      )
      .get(store.workspaceId, cancelledRequest.operationId),
    'cancelled repair persisted postimage',
  );
  const changedRestore = parseJsonRecord(cancelledRow.payload);
  const changedWork = firstOf(arrayAt(changedRestore, 'restored'), 'restored Work beforeimage');
  if (!isPlainRecord(changedWork)) throw new Error('Restored Work is not a record.');
  changedWork.revision = original.work.revision + 1;
  const changedRestorePayload = canonicalJson(changedRestore),
    changedRestoreDigest = canonicalJsonDigest(changedRestore);
  const updateCancelled = database.query(
    'UPDATE agent_host_work_state_repair SET payload=?,digest=? WHERE workspace_id=? AND operation_id=? AND payload=? AND digest=?',
  );
  let restoreProbeFailure: { error: unknown } | undefined;
  let restoreProbeInstalled = false;
  try {
    restoreProbeInstalled =
      updateCancelled.run(
        changedRestorePayload,
        changedRestoreDigest,
        store.workspaceId,
        cancelledRequest.operationId,
        cancelledRow.payload,
        cancelledRow.digest,
      ).changes === 1;
    expect(restoreProbeInstalled).toBe(true);
    expect(() => store.repairRequestTransitionFields({ ...cancelledRequest, mode: 'restore' })).toThrow(
      'repair restored list differs from its frozen changes',
    );
    expect(database.inTransaction).toBe(false);
    expect(readFixtureHostRows(database)).toEqual(retained);
  } catch (error) {
    restoreProbeFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          if (restoreProbeInstalled)
            expect(
              updateCancelled.run(
                cancelledRow.payload,
                cancelledRow.digest,
                store.workspaceId,
                cancelledRequest.operationId,
                changedRestorePayload,
                changedRestoreDigest,
              ).changes,
            ).toBe(1);
        },
      ],
      restoreProbeFailure,
    );
  }
  expect(store.repairRequestTransitionFields({ ...cancelledRequest, mode: 'restore' })).toEqual(cancelled);
  const plannedRows = database.query<PayloadSqlRow, []>('SELECT * FROM agent_host_work_state_repair').all();
  expect(
    database
      .query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1 WHERE work_id=? AND attempt=?')
      .run('work', journal.state.attempt).changes,
  ).toBe(1);
  const concurrentJournal = retained.journal.map((row) => ({ ...row, revision: row.revision + 1 }));
  expect(() => store.repairRequestTransitionFields({ mode: 'apply', operationId: 'fixture-repair' })).toThrow(
    'repair dependency CAS conflict',
  );
  expect(readFixtureHostRows(database)).toEqual({ host: retained.host, journal: concurrentJournal });
  expect(database.query<PayloadSqlRow, []>('SELECT * FROM agent_host_work_state_repair').all()).toEqual(plannedRows);
  const request = { operationId: 'fixture-repair-current' };
  const currentPlan = store.repairRequestTransitionFields({ ...request, mode: 'plan', actor: 'fixture-owner' });
  expect(currentPlan.bindings).toEqual({
    ledger_version: original.ledgerVersion,
    journals: [
      {
        work_id: 'work',
        attempt: journal.state.attempt,
        version: { ...journal.version, revision: journal.version.revision + 1 },
      },
    ],
  });
  const applied = store.repairRequestTransitionFields({ ...request, mode: 'apply' });
  expect(applied.status).toBe('applied');
  const saved = readPresentSnapshot(store, identity);
  expect(saved.work.request_transition).toBeNull();
  expect(saved.work.artifacts).toEqual(original.work.artifacts);
  expect(saved.work.execution).toEqual(original.work.execution);
  expect(saved.ledgerVersion).toEqual(original.ledgerVersion);
  expect(store.readWorkSessionJournal(identity)?.state).toEqual(journal.state);
  expect(readFixtureHostRows(database).journal).toEqual(concurrentJournal);
  expect(store.repairRequestTransitionFields({ ...request, mode: 'resume' })).toEqual(applied);
  const restored = store.repairRequestTransitionFields({ ...request, mode: 'restore' });
  expect(restored.status).toBe('restored');
  const after = readPresentSnapshot(store, identity);
  expect(Object.hasOwn(after.work, 'request_transition')).toBe(false);
  expect(after.work.revision).toBe(saved.work.revision + 1);
  expect(after.work.lifecycle.revision).toBe(saved.work.lifecycle.revision + 1);
  expect(after.work).toEqual({
    ...original.work,
    revision: after.work.revision,
    lifecycle: { ...original.work.lifecycle, revision: after.work.lifecycle.revision },
  });
  expect(after.work.lifecycle.phase).toBe(original.work.lifecycle.phase);
  expect(after.work.lifecycle.assurance).toEqual(original.work.lifecycle.assurance);
  expect(after.ledger).toEqual(original.ledger);
  expect(store.readWorkSessionJournal(identity)?.state).toEqual(journal.state);
  expect(readFixtureHostRows(database).journal).toEqual(concurrentJournal);
  expect(store.repairRequestTransitionFields({ ...request, mode: 'restore' })).toEqual(restored);
});

test.each(['applied', 'planned'] as const)(
  'correction-generation repair preserves terminal results and completed journal history through restore (%s)',
  async (mode) => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const { seed, source } = await writerFixture();
    commitHostState(seed);
    const started = store.claimWorkflowAttempt(attemptRequest());
    const completed = store.completeWorkflowAttempt(started, { terminal: 'observed Host fixture result' });
    const terminal = readPresentSnapshot(store, identity);
    const journal = completedRecoveryJournal(
      'work',
      requiredValue(terminal.work.execution.run_id, 'terminal repair run'),
      source,
    );
    const raw = parseJsonRecord(canonicalJson(terminal.work));
    const execution = recordAt(raw, 'execution');
    const attempts = arrayAt(execution, 'assignment_attempts');
    const attempt = firstOf(attempts, 'terminal repair attempt');
    if (!isPlainRecord(attempt)) throw new Error('Terminal repair attempt is not a record.');
    expect(Reflect.deleteProperty(attempt, 'correction_generation')).toBe(true);
    expect(Reflect.deleteProperty(attempt, 'correction_authorization')).toBe(true);
    raw.lease = null;
    execution.status = 'suspended';
    const releasedLedger: CoordinationLedger = {
      ...terminal.ledger,
      claims: terminal.ledger.claims.map((claim) => ({ ...claim, status: 'released' })),
      tickets: terminal.ledger.tickets.map((ticket) => ({
        ...ticket,
        status: 'released',
        active_resources: [],
        blocked_resources: [],
        expires_at: null,
      })),
    };
    database
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
      .run(canonicalJson(raw), canonicalJsonDigest(raw));
    database
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
      .run(canonicalJson(releasedLedger), canonicalJsonDigest(releasedLedger));
    const retained = database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all();
    const retainedJournal = database
      .query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger')
      .all();
    expect(() => store.readHostStateSnapshot(identity)).toThrow('work record must match current WorkState/v1');
    const request = { operationId: 'terminal-generation-repair' };
    const inspected = store.repairCorrectionGeneration({ ...request, mode: 'inspect' });
    expect(inspected.changed_work).toHaveLength(1);
    expect(inspected.changed_journals).toBe(0);
    expect(database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all()).toEqual(
      retained,
    );
    expect(database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').all()).toEqual(
      retainedJournal,
    );
    const planned = store.repairCorrectionGeneration({
      ...request,
      mode: 'plan',
      actor: 'fixture:terminal-repair-owner',
    });
    expect(planned.status).toBe('planned');
    const plannedGovernance = database
      .query<GovernanceSqlRow, []>('SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key')
      .all();
    expect(
      store.repairCorrectionGeneration({ ...request, mode: 'plan', actor: 'fixture:terminal-repair-owner' }),
    ).toEqual(planned);
    expect(() =>
      store.repairCorrectionGeneration({ ...request, mode: 'plan', actor: 'fixture:foreign-repair-owner' }),
    ).toThrow('repair attribution differs');
    expect(
      database
        .query<GovernanceSqlRow, []>(
          'SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key',
        )
        .all(),
    ).toEqual(plannedGovernance);
    expect(database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all()).toEqual(
      retained,
    );
    expect(database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').all()).toEqual(
      retainedJournal,
    );
    if (mode === 'applied') {
      const applied = store.repairCorrectionGeneration({ ...request, mode: 'apply' });
      expect(applied.status).toBe('applied');
      const repaired = readPresentSnapshot(store, identity);
      expect(repaired.work.execution.assignment_attempts).toEqual([completed.attempt]);
      expect(repaired.work.execution.status).toBe('suspended');
      expect(repaired.work.lease).toBeNull();
      expect(repaired.ledger).toEqual(releasedLedger);
      expect(store.readWorkSessionJournal(identity)?.state).toEqual(journal.state);
      expect(store.repairCorrectionGeneration({ ...request, mode: 'resume' })).toEqual(applied);
    }
    const restored = store.repairCorrectionGeneration({ ...request, mode: 'restore' });
    expect(restored.status).toBe('restored');
    const after = readPresentSnapshot(store, identity);
    expect(after.work.execution).toEqual({ ...terminal.work.execution, status: 'suspended' });
    expect(after.work.lease).toBeNull();
    const revisionAdvance = mode === 'applied' ? 2 : 1;
    expect(after.work.revision).toBe(terminal.work.revision + revisionAdvance);
    expect(after.work.lifecycle.revision).toBe(terminal.work.lifecycle.revision + revisionAdvance);
    expect(after.ledger).toEqual(releasedLedger);
    expect(store.readWorkSessionJournal(identity)?.state).toEqual(journal.state);
    expect(database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').all()).toEqual(
      retainedJournal,
    );
    expect(store.repairCorrectionGeneration({ ...request, mode: 'restore' })).toEqual(restored);
    preserveHostFixtureRoot = false;
  },
);

function stripFixtureAssignmentAuthority(value: unknown): void {
  if (!isPlainRecord(value)) throw new Error('Assignment authority preimage is not a record.');
  expect(Object.hasOwn(value, 'correction_generation')).toBe(true);
  expect(Object.hasOwn(value, 'correction_authorization')).toBe(true);
  Reflect.deleteProperty(value, 'correction_generation');
  Reflect.deleteProperty(value, 'correction_authorization');
}

test(
  'correction-generation repair preserves a genuinely issued unknown writer and its approval custody',
  async () => {
    const deadline = performance.now() + failedFinalHostCaseTimeoutMs;
    let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
    let peerBridge: MastraSessionBridge | undefined;
    let clockHeld = false;
    await withInitialSourceCleanup(
      async () => {
        const f = await createInitialSourceWorkFixture({
          onRoot: (created) => console.info('Unknown authority repair fixture root: ' + created),
        });
        fixture = f;
        setSystemTime(new Date(initialSourceExpiredOwnerTime(f)));
        clockHeld = true;
        await prepareInitialSourceFrontier(f, 'writer');
        if (performance.now() >= deadline) throw new Error('Unknown repair preparation exceeded its case deadline');
        const issued = await issueInitialSourceFixtureWriter(f);
        if (performance.now() >= deadline) throw new Error('Unknown repair reservation exceeded its case deadline');
        const host = initialSourceHostStore(f);
        let db = initialSourceHostDatabase(f);
        const peerPath = 'docs/PEER.md';
        writeFileSync(path.join(f.root, peerPath), 'Disjoint peer source\n');
        const peerInput = f.preparePeerAdmission('initial-peer-journal', [peerPath]);
        const peerIntakePath = '.agent/work/initial-peer-journal/local-session-intake.json';
        writeFileSync(
          path.join(f.root, peerIntakePath),
          canonicalJson({
            schema: 'VidaLocalSessionIntake/v1',
            work_item: peerInput.workItem,
            native_session_handle: peerInput.nativeSessionHandle,
            scope_path: peerInput.scopePath,
            acceptance_path: peerInput.acceptancePath,
            source_authorization_path: peerInput.sourceAuthorizationPath,
            runtime_code_paths: peerInput.runtimeCodePaths,
            route: peerInput.route,
            risk: peerInput.risk,
            change_kind: peerInput.changeKind,
          }),
        );
        const peerAdmission = admitLocalSessionWork({ ...peerInput, intakePath: peerIntakePath });
        const peerIdentity = { ...f.identity, work_id: peerInput.context.work_id };
        peerBridge = await MastraSessionBridge.open({
          repositoryRoot: f.root,
          config: f.config,
          ledger: initialSourceHostLedger(f),
          projectIds: f.identity.project_ids,
          selection: peerInput.selection,
          context: peerInput.context,
          workflowId: 'task_execution',
          workspaceId: host.workspaceId,
        });
        const peerEngine = await peerBridge.start(peerAdmission.source);
        const peerJournal = requiredValue(host.readWorkSessionJournal(peerIdentity), 'Disjoint peer native Journal');
        const peerHost = readPresentSnapshot(host, peerIdentity);
        expect(peerEngine.status).toBe('suspended');
        expect(peerEngine.requests.length).toBeGreaterThan(0);
        expect(peerJournal.state.work_id).toBe(peerIdentity.work_id);
        expect(peerJournal.state.run_id).toBe(peerEngine.run_id);
        expect(peerJournal.state.completed).toEqual([]);
        expect(peerJournal.state.items.map((item) => item.request)).toEqual([...peerEngine.requests]);
        for (const peerItem of peerJournal.state.items) {
          expect(peerItem.issue_id).toBeNull();
          expect(peerItem.observation).toBeNull();
          expect(peerItem.host_reservation).toBeUndefined();
        }
        await peerBridge.close();
        peerBridge = undefined;
        if (performance.now() >= deadline)
          throw new Error('Unknown repair peer preparation exceeded its case deadline');
        const before = readPresentSnapshot(host, f.identity);
        const journal = host.readWorkSessionJournal(f.identity);
        if (!journal) throw new Error('Unknown repair native Journal is missing');
        const item = journal.state.items[0];
        const reservation = item?.host_reservation;
        if (!item || !reservation?.authorization)
          throw new Error('Unknown repair protected native reservation is missing');
        expect(journal.state.items).toHaveLength(1);
        expect(item.issue_id).toBe(issued.writer.issue_id);
        expect(item.observation).toBeNull();
        expect(reservation.approvalAction).toBe('source.write');
        expect(reservation.authorization.approval?.status).toBe('commit_unknown');
        const approval = reservation.authorization.approval;
        if (!approval) throw new Error('Unknown repair native approval is missing');
        const approvalRow = db
          .query<PayloadSqlRow, [string, string, string]>(
            "SELECT payload FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind='approval' AND record_key=?",
          )
          .get(host.workspaceId, approval.store_id, canonicalJsonDigest(approval.binding));
        if (!approvalRow) throw new Error('Unknown repair persisted approval is missing');
        expect(canonicalJson(parseJsonRecord(approvalRow.payload))).toBe(canonicalJson(approval));
        expect(reservation.receipt.attempt.attempt_id).toBe(issued.hostAttemptId);
        expect(reservation.receipt.attempt).toMatchObject({
          status: 'started',
          result: null,
          result_digest: null,
          reconciliation: null,
        });
        expect(reservation.authorization.receipt.attempt).toEqual(reservation.receipt.attempt);
        expect(
          before.work.execution.assignment_attempts.find((attempt) => attempt.attempt_id === issued.hostAttemptId),
        ).toEqual(reservation.receipt.attempt);
        const legacyWork = parseJsonRecord(canonicalJson(before.work));
        const legacyJournal = parseJsonRecord(canonicalJson(journal.state));
        const legacyAttempts = arrayAt(recordAt(legacyWork, 'execution'), 'assignment_attempts').filter(
          (attempt) => isPlainRecord(attempt) && attempt.attempt_id === issued.hostAttemptId,
        );
        expect(legacyAttempts).toHaveLength(1);
        stripFixtureAssignmentAuthority(firstOf(legacyAttempts, 'unknown repair assignment'));
        const rawItem = firstOf(arrayAt(legacyJournal, 'items'), 'unknown repair Journal item');
        if (!isPlainRecord(rawItem)) throw new Error('Unknown repair Journal item is not a record');
        const rawReservation = recordAt(rawItem, 'host_reservation');
        stripFixtureAssignmentAuthority(recordAt(rawReservation, 'receipt').attempt);
        stripFixtureAssignmentAuthority(recordAt(recordAt(rawReservation, 'authorization'), 'receipt').attempt);
        expect(
          db
            .query(
              "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='work' AND revision=? AND digest=?",
            )
            .run(
              canonicalJson(legacyWork),
              canonicalJsonDigest(legacyWork),
              host.workspaceId,
              before.workVersion.revision,
              before.workVersion.digest,
            ).changes,
        ).toBe(1);
        expect(
          db
            .query(
              'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1 AND revision=? AND digest=?',
            )
            .run(
              canonicalJson(legacyJournal),
              canonicalJsonDigest(legacyJournal),
              host.workspaceId,
              f.identity.work_id,
              journal.version.revision,
              journal.version.digest,
            ).changes,
        ).toBe(1);
        const retained = readFixtureHostRows(db);
        const peerWorkPayload = canonicalJson(peerHost.work);
        const peerWorkRow = requiredValue(
          retained.host.find((row) => row.kind === 'work' && row.payload === peerWorkPayload),
          'disjoint peer native Work row',
        );
        const peerJournalRow = requiredValue(
          retained.journal.find((row) => row.work_id === peerIdentity.work_id && row.attempt === 1),
          'disjoint peer native Journal row',
        );
        const peerRows = () => ({
          work: db
            .query("SELECT * FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
            .get(host.workspaceId, peerWorkRow.id),
          journal: db
            .query('SELECT * FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=1')
            .get(host.workspaceId, peerIdentity.work_id),
        });
        const retainedPeerRows = { work: peerWorkRow, journal: peerJournalRow };
        expect(peerRows()).toEqual(retainedPeerRows);
        const governance = () =>
          db.query('SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key').all();
        const retainedGovernance = governance();
        expect(retainedGovernance.length).toBeGreaterThan(0);
        expect(() => host.readHostStateSnapshot(f.identity)).toThrow('work record must match current WorkState/v1');
        const request = { operationId: 'native-unknown-authority-repair' };
        expect(() => host.repairRequestTransitionFields({ ...request, mode: 'inspect' })).toThrow(
          'request transition cannot repair assignment authority',
        );
        const history = () =>
          db
            .query<{ payload: string; digest: string }, [string, string]>(
              'SELECT payload,digest FROM agent_host_initial_source_continuation WHERE workspace_id=? AND work_id=? AND attempt=1',
            )
            .get(host.workspaceId, f.identity.work_id);
        const retainedHistory = history();
        if (!retainedHistory) throw new Error('Unknown repair native initial Source history is missing');
        const ledgerRow = requiredValue(
          retained.host.find((row) => row.kind === 'ledger'),
          'unknown repair ledger row',
        );
        const owner = requiredValue(
          before.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(before.work).ticket_id),
          'unknown repair owner ticket',
        );
        const peerOwner = requiredValue(
          before.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(peerHost.work).ticket_id),
          'disjoint peer owner ticket',
        );
        expect(peerOwner.status).toBe('active');
        expect(peerOwner.exclusive_resources.length).toBeGreaterThan(0);
        expect(peerOwner.exclusive_resources.some((resource) => owner.exclusive_resources.includes(resource))).toBe(
          false,
        );
        const ownedFile = requiredValue(
          owner.exclusive_resources.find((resource) => resource.startsWith('file:')),
          'unknown repair owned Source',
        );
        const disjoint = 'file:fixture-disjoint-repair.ts';
        expect(owner.exclusive_resources).not.toContain(disjoint);
        const retainedJournal = requiredValue(
          retained.journal.find((row) => row.work_id === f.identity.work_id && row.attempt === 1),
          'unknown repair Journal preimage',
        );
        const replaceJournal = db.query(
          'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1 AND revision=? AND digest=?',
        );
        for (const variant of [
          { kind: 'receipt', message: 'receipt' },
          { kind: 'receipt-attempt', message: 'attempt' },
          { kind: 'authorization', message: 'interrupted repair issue, authorization, or owner binding differs' },
          { kind: 'item', message: 'Mastra session ledger item shape is invalid' },
          { kind: 'items', message: 'Mastra session ledger items are invalid' },
          { kind: 'completed', message: 'Mastra completed waves are invalid' },
          { kind: 'completed-wave', message: 'Mastra completed wave shape is invalid' },
        ]) {
          const changed = parseJsonRecord(retainedJournal.payload);
          if (variant.kind === 'items' || variant.kind === 'completed') changed[variant.kind] = null;
          else if (variant.kind === 'completed-wave') arrayAt(changed, 'completed').push(null);
          else {
            const changedItems = arrayAt(changed, 'items');
            if (variant.kind === 'item') changedItems[0] = null;
            else {
              const changedItem = firstOf(changedItems, 'unknown repair corrupted Journal item');
              if (!isPlainRecord(changedItem)) throw new Error('Unknown repair Journal item is not a record');
              const changedReservation = recordAt(changedItem, 'host_reservation');
              if (variant.kind === 'receipt-attempt') recordAt(changedReservation, 'receipt').attempt = null;
              else changedReservation[variant.kind] = null;
            }
          }
          const payload = canonicalJson(changed),
            digest = canonicalJsonDigest(changed);
          expect(
            replaceJournal.run(
              payload,
              digest,
              host.workspaceId,
              f.identity.work_id,
              retainedJournal.revision,
              retainedJournal.digest,
            ).changes,
          ).toBe(1);
          let failure: { error: unknown } | undefined;
          try {
            expect(() => host.repairCorrectionGeneration({ ...request, mode: 'inspect' })).toThrow(variant.message);
            expect(readFixtureHostRows(db)).toEqual({
              ...retained,
              journal: retained.journal.map((row) => (row === retainedJournal ? { ...row, payload, digest } : row)),
            });
            expect(governance()).toEqual(retainedGovernance);
            expect(history()).toEqual(retainedHistory);
            expect(
              db.query("SELECT name FROM sqlite_master WHERE name='agent_host_work_state_repair'").get(),
            ).toBeNull();
          } catch (error) {
            failure = { error };
            throw error;
          } finally {
            completeOwnedCleanup(
              [
                () => {
                  expect(
                    replaceJournal.run(
                      retainedJournal.payload,
                      retainedJournal.digest,
                      host.workspaceId,
                      f.identity.work_id,
                      retainedJournal.revision,
                      digest,
                    ).changes,
                  ).toBe(1);
                  expect(readFixtureHostRows(db)).toEqual(retained);
                },
              ],
              failure,
            );
          }
        }
        for (const variant of [
          { kind: 'earlier-disjoint', earlier: true, resource: disjoint, denied: false },
          { kind: 'earlier-overlap', earlier: true, resource: ownedFile, denied: true },
          { kind: 'later-overlap', earlier: false, resource: ownedFile, denied: false },
        ]) {
          // Unactivated exclusive intent is valid; repair applies its stricter queued-intent FIFO guard.
          const waiter: CoordinationTicket = {
            ...owner,
            ticket_id: 'fixture:' + variant.kind,
            work_id: 'fixture-fifo-waiter',
            thread_id: 'fixture:fifo-waiter',
            generation: 1,
            sequence: variant.earlier ? 1 : before.ledger.next_sequence + 1,
            contour_keys: [variant.resource],
            exclusive_resources: [variant.resource],
            status: 'queued',
            claim_ids: [],
            expires_at: null,
            active_resources: [],
            blocked_resources: [],
            created_at: new Date().toISOString(),
          };
          const controlled: CoordinationLedger = {
            ...before.ledger,
            next_sequence: before.ledger.next_sequence + 2,
            tickets: [...before.ledger.tickets.map((ticket) => ({ ...ticket, sequence: ticket.sequence + 1 })), waiter],
          };
          const validated = validateCoordinationLedgerV1(controlled, { currentTimeMs: Date.now() });
          expect(validated.ok).toBe(true);
          const payload = canonicalJson(controlled),
            digest = canonicalJsonDigest(controlled);
          expect(
            db
              .query(
                "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND revision=? AND digest=?",
              )
              .run(payload, digest, host.workspaceId, ledgerRow.revision, ledgerRow.digest).changes,
          ).toBe(1);
          let failure: { error: unknown } | undefined;
          try {
            if (variant.denied)
              expect(() => host.repairCorrectionGeneration({ ...request, mode: 'inspect' })).toThrow(
                'earlier FIFO Source owner is waiting for the resource',
              );
            else {
              const inspected = host.repairCorrectionGeneration({ ...request, mode: 'inspect' });
              expect(inspected.changed_work).toHaveLength(1);
              expect(inspected.changed_journals).toBe(1);
            }
            expect(readFixtureHostRows(db)).toEqual({
              ...retained,
              host: retained.host.map((row) => (row.kind === 'ledger' ? { ...row, payload, digest } : row)),
            });
            expect(governance()).toEqual(retainedGovernance);
            expect(history()).toEqual(retainedHistory);
            expect(
              db.query("SELECT name FROM sqlite_master WHERE name='agent_host_work_state_repair'").get(),
            ).toBeNull();
          } catch (error) {
            failure = { error };
            throw error;
          } finally {
            completeOwnedCleanup(
              [
                () => {
                  expect(
                    db
                      .query(
                        "UPDATE agent_host_state SET payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND revision=? AND digest=?",
                      )
                      .run(ledgerRow.payload, ledgerRow.digest, host.workspaceId, ledgerRow.revision, digest).changes,
                  ).toBe(1);
                  expect(readFixtureHostRows(db)).toEqual(retained);
                },
              ],
              failure,
            );
          }
        }
        for (const kind of ['missing', 'changed'] as const) {
          if (kind === 'missing')
            db.query(
              'DELETE FROM agent_host_initial_source_continuation WHERE workspace_id=? AND work_id=? AND attempt=1',
            ).run(host.workspaceId, f.identity.work_id);
          else {
            const changed = parseJsonRecord(retainedHistory.payload);
            recordAt(recordAt(changed, 'successor_work'), 'binding').work_source_revision = 'f'.repeat(64);
            db.query(
              'UPDATE agent_host_initial_source_continuation SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
            ).run(canonicalJson(changed), canonicalJsonDigest(changed), host.workspaceId, f.identity.work_id);
          }
          try {
            expect(() => host.repairCorrectionGeneration({ ...request, mode: 'inspect' })).toThrow();
            expect(readFixtureHostRows(db)).toEqual(retained);
            expect(governance()).toEqual(retainedGovernance);
            expect(
              db.query("SELECT name FROM sqlite_master WHERE name='agent_host_work_state_repair'").get(),
            ).toBeNull();
          } finally {
            db.query(
              'INSERT OR REPLACE INTO agent_host_initial_source_continuation (workspace_id,work_id,attempt,payload,digest) VALUES(?,?,1,?,?)',
            ).run(host.workspaceId, f.identity.work_id, retainedHistory.payload, retainedHistory.digest);
          }
          expect(history()).toEqual(retainedHistory);
        }
        const inspected = host.repairCorrectionGeneration({ ...request, mode: 'inspect' });
        expect(inspected.changed_work).toHaveLength(1);
        expect(inspected.changed_journals).toBe(1);
        expect(readFixtureHostRows(db)).toEqual(retained);
        expect(governance()).toEqual(retainedGovernance);
        const planned = host.repairCorrectionGeneration({ ...request, mode: 'plan', actor: 'fixture:unknown-repair' });
        expect(planned.status).toBe('planned');
        expect(readFixtureHostRows(db)).toEqual(retained);
        const repairRows = () =>
          db
            .query('SELECT * FROM agent_host_work_state_repair WHERE workspace_id=? AND operation_id=?')
            .all(host.workspaceId, request.operationId);
        const retainedRepair = repairRows();
        db.exec(
          "CREATE TEMP TRIGGER deny_unknown_repair_journal BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT, 'controlled unknown repair journal failure'); END",
        );
        try {
          expect(() => host.repairCorrectionGeneration({ ...request, mode: 'apply' })).toThrow(
            'controlled unknown repair journal failure',
          );
          expect(readFixtureHostRows(db)).toEqual(retained);
          expect(governance()).toEqual(retainedGovernance);
          expect(history()).toEqual(retainedHistory);
          expect(repairRows()).toEqual(retainedRepair);
        } finally {
          db.exec('DROP TRIGGER deny_unknown_repair_journal');
        }
        const applied = host.repairCorrectionGeneration({ ...request, mode: 'apply' });
        expect(applied.status).toBe('applied');
        expect(peerRows()).toEqual(retainedPeerRows);
        const after = readPresentSnapshot(host, f.identity);
        expect(after.work.execution).toEqual(before.work.execution);
        expect(after.work.lease).toEqual(before.work.lease);
        expect(after.ledger).toEqual(before.ledger);
        expect(after.workVersion.revision).toBe(before.workVersion.revision + 1);
        expect(host.readWorkSessionJournal(f.identity)?.state).toEqual(journal.state);
        expect(governance()).toEqual(retainedGovernance);
        await f.close();
        f.ledger = openConfiguredMastraSessionLedger(f.root);
        f.database = f.ledger.sessionProducerBinding().database;
        f.store = f.ledger.hostState;
        db = initialSourceHostDatabase(f);
        const reopened = initialSourceHostStore(f);
        expect(reopened.readHostStateSnapshot(f.identity)).toEqual(after);
        expect(reopened.repairCorrectionGeneration({ ...request, mode: 'resume' })).toEqual(applied);
        const restored = reopened.repairCorrectionGeneration({ ...request, mode: 'restore' });
        expect(restored.status).toBe('restored');
        const final = readPresentSnapshot(reopened, f.identity);
        expect(final.work.execution).toEqual(before.work.execution);
        expect(final.work.lease).toEqual(before.work.lease);
        expect(final.ledger).toEqual(before.ledger);
        expect(reopened.readWorkSessionJournal(f.identity)?.state).toEqual(journal.state);
        expect(governance()).toEqual(retainedGovernance);
        expect(history()).toEqual(retainedHistory);
        expect(reopened.repairCorrectionGeneration({ ...request, mode: 'restore' })).toEqual(restored);
        expect(peerRows()).toEqual(retainedPeerRows);
        expect(reopened.readHostStateSnapshot(peerIdentity)).toEqual(peerHost);
        expect(reopened.readWorkSessionJournal(peerIdentity)).toEqual(peerJournal);
        if (performance.now() >= deadline) throw new Error('Unknown repair body exceeded its case deadline');
      },
      async () => {
        await withInitialSourceCleanup(
          async () => {
            await withInitialSourceCleanup(
              async () => {
                if (peerBridge) await peerBridge.close();
              },
              async () => {
                if (fixture) await fixture.close();
              },
              'Unknown authority repair bridge cleanup',
            );
          },
          () => {
            if (clockHeld) setSystemTime();
          },
          'Unknown authority repair clock restoration',
        );
        if (fixture) console.error('Expected UNKNOWN authority repair fixture retained: ' + fixture.root);
        if (performance.now() >= deadline) throw new Error('Unknown repair cleanup exceeded its case deadline');
      },
      'Unknown authority repair fixture',
    );
  },
  // Real admission, native prewriter prefix and protected reservation precede the bounded repair.
  failedFinalHostCaseTimeoutMs,
);

// Real writer/report preparation supplies terminal reservation receipts for both persisted rows.
test(
  'correction-generation repair atomically normalizes genuine terminal Host and Journal receipts',
  async () => {
    const deadline = performance.now() + failedFinalHostCaseTimeoutMs;
    const f = await createFailedFinalCorrectionFixture('failed', { preparationInputs: false });
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      if (performance.now() >= deadline)
        throw new Error('Host failed-final fixture preparation exceeded the case deadline.');
      const before = readPresentSnapshot(f.store, f.identity);
      const journal = f.store.readWorkSessionJournal(f.identity);
      if (!journal) throw new Error('Terminal repair journal is missing.');
      expect(before.work.execution.assignment_attempts.length).toBeGreaterThan(0);
      expect(
        before.work.execution.assignment_attempts.every((attempt) =>
          ['completed', 'no_effect'].includes(attempt.status),
        ),
      ).toBe(true);
      const legacyWork = parseJsonRecord(canonicalJson(before.work));
      const legacyJournal = parseJsonRecord(canonicalJson(journal.state));
      const execution = recordAt(legacyWork, 'execution');
      for (const attempt of arrayAt(execution, 'assignment_attempts')) stripFixtureAssignmentAuthority(attempt);
      legacyWork.lease = null;
      execution.status = 'suspended';
      const releasedLedger: CoordinationLedger = {
        ...before.ledger,
        claims: before.ledger.claims.map((claim) => ({ ...claim, status: 'released' })),
        tickets: before.ledger.tickets.map((ticket) => ({
          ...ticket,
          status: 'released',
          active_resources: [],
          blocked_resources: [],
          expires_at: null,
        })),
      };
      const items = [...arrayAt(legacyJournal, 'items')];
      for (const wave of arrayAt(legacyJournal, 'completed')) {
        if (!isPlainRecord(wave)) throw new Error('Terminal repair wave is not a record.');
        items.push(...arrayAt(wave, 'items'));
      }
      let reservations = 0;
      for (const item of items) {
        if (!isPlainRecord(item)) throw new Error('Terminal repair item is not a record.');
        if (!item.host_reservation) continue;
        const reservation = recordAt(item, 'host_reservation');
        stripFixtureAssignmentAuthority(recordAt(reservation, 'receipt').attempt);
        if (reservation.authorization)
          stripFixtureAssignmentAuthority(recordAt(recordAt(reservation, 'authorization'), 'receipt').attempt);
        reservations++;
      }
      expect(reservations).toBeGreaterThan(0);
      f.database
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
        .run(canonicalJson(legacyWork), canonicalJsonDigest(legacyWork));
      f.database
        .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'")
        .run(canonicalJson(releasedLedger), canonicalJsonDigest(releasedLedger));
      f.database
        .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE work_id=?')
        .run(canonicalJson(legacyJournal), canonicalJsonDigest(legacyJournal), f.identity.work_id);
      const rows = () => f.database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all();
      const journals = () =>
        f.database
          .query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger ORDER BY work_id,attempt')
          .all();
      const retainedRows = rows(),
        retainedJournals = journals();
      const request = { operationId: 'terminal-journal-generation-repair' };
      const inspection = f.store.repairCorrectionGeneration({ ...request, mode: 'inspect' });
      expect(inspection.changed_work).toHaveLength(1);
      expect(inspection.changed_journals).toBe(1);
      expect(rows()).toEqual(retainedRows);
      expect(journals()).toEqual(retainedJournals);
      const unboundJournal = parseJsonRecord(canonicalJson(legacyJournal));
      const unboundItems = [...arrayAt(unboundJournal, 'items')];
      for (const wave of arrayAt(unboundJournal, 'completed')) {
        if (!isPlainRecord(wave)) throw new Error('Terminal repair wave is not a record.');
        unboundItems.push(...arrayAt(wave, 'items'));
      }
      const reservedItem = unboundItems.find((item) => isPlainRecord(item) && item.host_reservation);
      if (!isPlainRecord(reservedItem)) throw new Error('Terminal repair reservation is missing.');
      recordAt(reservedItem, 'host_reservation').authorization = null;
      const retainedJournal = requiredValue(
        retainedJournals.find((row) => row.work_id === f.identity.work_id && row.attempt === journal.state.attempt),
        'terminal repair Journal row',
      );
      const replaceJournal = f.database.query<never, SQLQueryBindings[]>(
        'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND payload=? AND digest=?',
      );
      const governanceRows = () =>
        f.database
          .query<GovernanceSqlRow, []>(
            'SELECT * FROM agent_host_governance ORDER BY workspace_id,store_id,kind,record_key',
          )
          .all();
      const retainedGovernance = governanceRows();
      const schema = f.database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all();
      for (const candidate of [
        unboundJournal,
        { ...unboundJournal, corrective_execution: { schema: 'InvalidFixtureExecution/v1' } },
      ]) {
        const unboundPayload = canonicalJson(candidate),
          unboundDigest = canonicalJsonDigest(candidate);
        let unboundInstalled = false;
        let inspectionFailure: { error: unknown } | undefined;
        try {
          const installed = replaceJournal.run(
            unboundPayload,
            unboundDigest,
            retainedJournal.workspace_id,
            retainedJournal.work_id,
            retainedJournal.attempt,
            retainedJournal.revision,
            retainedJournal.payload,
            retainedJournal.digest,
          );
          unboundInstalled = installed.changes === 1;
          expect(installed.changes).toBe(1);
          if (candidate === unboundJournal) {
            const unboundInspection = f.store.repairCorrectionGeneration({ ...request, mode: 'inspect' });
            expect(unboundInspection.status).toBe('repairable_current_v1');
            expect(unboundInspection.changed_work).toEqual(inspection.changed_work);
            expect(unboundInspection.changed_journals).toBe(1);
          } else {
            expect(() => f.store.repairCorrectionGeneration({ ...request, mode: 'inspect' })).toThrow(
              'CorrectiveExecution/v1',
            );
          }
          expect(rows()).toEqual(retainedRows);
          expect(journals()).toEqual(
            retainedJournals.map((row) =>
              row === retainedJournal ? { ...row, payload: unboundPayload, digest: unboundDigest } : row,
            ),
          );
          expect(governanceRows()).toEqual(retainedGovernance);
          expect(
            f.database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all(),
          ).toEqual(schema);
          expect(f.database.inTransaction).toBe(false);
        } catch (error) {
          inspectionFailure = { error };
          throw error;
        } finally {
          completeOwnedCleanup(
            [
              () => {
                if (unboundInstalled)
                  expect(
                    replaceJournal.run(
                      retainedJournal.payload,
                      retainedJournal.digest,
                      retainedJournal.workspace_id,
                      retainedJournal.work_id,
                      retainedJournal.attempt,
                      retainedJournal.revision,
                      unboundPayload,
                      unboundDigest,
                    ).changes,
                  ).toBe(1);
                expect(journals()).toEqual(retainedJournals);
              },
            ],
            inspectionFailure,
          );
        }
      }
      const planned = f.store.repairCorrectionGeneration({
        ...request,
        mode: 'plan',
        actor: 'fixture:terminal-journal-repair-owner',
      });
      expect(planned.status).toBe('planned');
      f.database.exec(
        "CREATE TEMP TRIGGER deny_generation_journal BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT, 'controlled generation journal failure'); END",
      );
      try {
        expect(() => f.store.repairCorrectionGeneration({ ...request, mode: 'apply' })).toThrow(
          'controlled generation journal failure',
        );
        expect(rows()).toEqual(retainedRows);
        expect(journals()).toEqual(retainedJournals);
      } finally {
        f.database.exec('DROP TRIGGER deny_generation_journal');
      }
      const applied = f.store.repairCorrectionGeneration({ ...request, mode: 'apply' });
      expect(applied.status).toBe('applied');
      const after = readPresentSnapshot(f.store, f.identity);
      expect(after.work.execution.assignment_attempts).toEqual(before.work.execution.assignment_attempts);
      expect(after.work.execution.status).toBe('suspended');
      expect(after.work.lease).toBeNull();
      expect(after.ledger).toEqual(releasedLedger);
      expect(f.store.readWorkSessionJournal(f.identity)?.state).toEqual(journal.state);
      expect(f.store.readWorkSessionJournal(f.identity)?.version.revision).toBe(journal.version.revision + 1);
      expect(f.store.repairCorrectionGeneration({ ...request, mode: 'resume' })).toEqual(applied);
      const restored = f.store.repairCorrectionGeneration({ ...request, mode: 'restore' });
      expect(restored.status).toBe('restored');
      expect(readPresentSnapshot(f.store, f.identity).work.execution).toEqual(after.work.execution);
      expect(f.store.readWorkSessionJournal(f.identity)?.state).toEqual(journal.state);
      expect(f.store.readWorkSessionJournal(f.identity)?.version.revision).toBe(journal.version.revision + 2);
      expect(f.store.repairCorrectionGeneration({ ...request, mode: 'restore' })).toEqual(restored);
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            f.close(() => completed && performance.now() < deadline);
          },
        ],
        primaryFailure,
      );
    }
  },
  failedFinalHostCaseTimeoutMs,
);

test('stored repair decoder rejects malformed changes, foreign identity and extra fields without Host mutation', () => {
  const original = commitHostState(fixture());
  store.repairRequestTransitionFields({ mode: 'plan', operationId: 'decoder-regression', actor: 'fixture-owner' });
  const query = database.query<{ payload: string; digest: string }, [string, string]>(
    'SELECT payload,digest FROM agent_host_work_state_repair WHERE workspace_id=? AND operation_id=?',
  );
  const row = query.get(workspace, 'decoder-regression');
  if (!row) throw Error('Frozen repair operation missing');
  const body: unknown = parseJsonRecord(row.payload);
  if (!isPlainRecord(body) || !Array.isArray(body.changes)) throw Error('Frozen repair changes missing');
  const changes: readonly unknown[] = body.changes;
  const first = changes[0];
  if (!isPlainRecord(first)) throw Error('Frozen repair change missing');
  const malformedBinding = {
    ...body,
    changes: [{ ...first, before: { ...recordAt(first, 'before'), binding: null } }],
  };
  const variants = [
    null,
    { ...body, changes: {} },
    { ...body, changes: [] },
    { ...body, extra: true },
    { ...body, changes: [{ ...first, before: null }] },
    { ...body, changes: [{ ...first, identity: { ...identity, work_id: 'foreign' } }] },
    malformedBinding,
  ];
  for (const candidate of variants) {
    const payload = JSON.stringify(candidate);
    const digest = createHash('sha256').update(payload).digest('hex');
    database
      .query<never, SQLQueryBindings[]>(
        'UPDATE agent_host_work_state_repair SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
      )
      .run(payload, digest, workspace, 'decoder-regression');
    expect(() => store.repairRequestTransitionFields({ mode: 'apply', operationId: 'decoder-regression' })).toThrow(
      candidate === malformedBinding ? 'work record must match current WorkState/v1' : undefined,
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(original);
    expect(query.get(workspace, 'decoder-regression')).toEqual({ payload, digest });
  }
});

test('stored repair plan retry validates its transformation before returning a frozen plan', () => {
  const original = commitHostState(fixture());
  store.repairRequestTransitionFields({ mode: 'plan', operationId: 'decoder-retry', actor: 'fixture-owner' });
  const query = database.query<{ payload: string; digest: string }, [string, string]>(
    'SELECT payload,digest FROM agent_host_work_state_repair WHERE workspace_id=? AND operation_id=?',
  );
  const row = query.get(workspace, 'decoder-retry');
  if (!row) throw Error('Frozen repair operation missing');
  const candidate: unknown = parseJsonRecord(row.payload);
  if (!isPlainRecord(candidate) || !Array.isArray(candidate.changes)) throw Error('Frozen repair changes missing');
  const changes: readonly unknown[] = candidate.changes;
  const first = changes[0];
  if (!isPlainRecord(first) || !isPlainRecord(first.after) || !isPlainRecord(first.after.lifecycle))
    throw Error('Frozen repair afterimage missing');
  const changed = {
    ...candidate,
    changes: [
      {
        ...first,
        after: {
          ...first.after,
          lifecycle: { ...first.after.lifecycle, next_action: 'Unrelated frozen instruction.' },
        },
      },
    ],
  };
  const payload = JSON.stringify(changed),
    digest = createHash('sha256').update(payload).digest('hex');
  database
    .query<never, SQLQueryBindings[]>(
      'UPDATE agent_host_work_state_repair SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
    )
    .run(payload, digest, workspace, 'decoder-retry');
  expect(() =>
    store.repairRequestTransitionFields({ mode: 'plan', operationId: 'decoder-retry', actor: 'fixture-owner' }),
  ).toThrow(/frozen transformation differs/);
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  expect(query.get(workspace, 'decoder-retry')).toEqual({ payload, digest });
});

test('restored repair plan retry rejects a changed restored list without canonicalizing its custody', () => {
  commitHostState(fixture());
  store.repairRequestTransitionFields({ mode: 'plan', operationId: 'decoder-restored', actor: 'fixture-owner' });
  store.repairRequestTransitionFields({ mode: 'apply', operationId: 'decoder-restored' });
  store.repairRequestTransitionFields({ mode: 'restore', operationId: 'decoder-restored' });
  const before = readPresentSnapshot(store, identity);
  const query = database.query<{ payload: string; digest: string }, [string, string]>(
    'SELECT payload,digest FROM agent_host_work_state_repair WHERE workspace_id=? AND operation_id=?',
  );
  const row = query.get(workspace, 'decoder-restored');
  if (!row) throw Error('Restored operation missing');
  const body: unknown = parseJsonRecord(row.payload);
  if (!isPlainRecord(body)) throw Error('Restored operation malformed');
  const payload = JSON.stringify({ ...body, restored: [] }),
    digest = createHash('sha256').update(payload).digest('hex');
  database
    .query<never, SQLQueryBindings[]>(
      'UPDATE agent_host_work_state_repair SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
    )
    .run(payload, digest, workspace, 'decoder-restored');
  expect(() =>
    store.repairRequestTransitionFields({ mode: 'plan', operationId: 'decoder-restored', actor: 'fixture-owner' }),
  ).toThrow(/restored list differs/);
  expect(store.readHostStateSnapshot(identity)).toEqual(before);
  expect(query.get(workspace, 'decoder-restored')).toEqual({ payload, digest });
});

test('readonly canonical workspace inspection preserves populated governance and database bytes', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const deadline = performance.now() + 5_000;
  const emptyBytes = await readFile(databasePath);
  const emptyCatalog = database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all();
  expect(inspectHostWorkspaceDatabase(root, 'authority.db', workspace)).toEqual({
    schema: 'HostWorkspaceInspection/v1',
    workspace_id: workspace,
    work: [],
    ledger: null,
    ledger_version: null,
    journals: [],
    governance: [],
    admission_attempts: [],
  });
  expect(await readFile(databasePath)).toEqual(emptyBytes);
  expect(database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all()).toEqual(
    emptyCatalog,
  );
  const original = commitHostState(fixture());
  const operation = reserveRequiredOperation(store, 'inspection', '1'.repeat(64), '2'.repeat(64));
  store.transitionOperation(operation, 'commit_unknown');
  store.transitionOperation(operation, 'applied', '3'.repeat(64));
  const bytes = await readFile(databasePath);
  const schema = database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all();
  const journalMode = database.query<SqliteJournalModeRow, []>('PRAGMA journal_mode').get();
  const observed = inspectHostWorkspaceDatabase(root, 'authority.db', workspace);
  expect(observed.schema).toBe('HostWorkspaceInspection/v1');
  expect(firstOf(observed.work, 'inspected Host work').state).toEqual(original.work);
  expect(observed.ledger_version).toEqual(original.ledgerVersion);
  expect(observed.governance).toHaveLength(1);
  expect(firstOf(observed.governance, 'inspected governance operation').state.status).toBe('applied');
  expect(await readFile(databasePath)).toEqual(bytes);
  expect(database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all()).toEqual(schema);
  expect(database.query<SqliteJournalModeRow, []>('PRAGMA journal_mode').get()).toEqual(journalMode);
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  const admissionSql = requiredValue(
    requiredValue(
      schema.find((row) => row.name === 'agent_host_admission_attempt'),
      'admission table definition',
    ).sql,
    'admission table SQL',
  );
  expect(
    database.query<ScalarCountRow, []>('SELECT COUNT(*) AS count FROM agent_host_admission_attempt').get()?.count,
  ).toBe(0);
  if (schema.some((row) => row.name === 'agent_host_consumer_migration'))
    expect(database.query('SELECT * FROM agent_host_consumer_migration WHERE workspace_id=?').all(workspace)).toEqual(
      [],
    );
  const rows = () => ({
    host: database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY workspace_id,kind,id').all(),
    governance: governanceRows(),
  });
  const originalRows = rows();
  database.exec('DROP TABLE agent_host_admission_attempt');
  let primaryFailure: { error: unknown } | undefined;
  try {
    const variantBytes = await readFile(databasePath);
    const variantSchema = database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all();
    const withoutAdmissions = inspectHostWorkspaceDatabase(root, 'authority.db', workspace);
    expect(withoutAdmissions.admission_attempts).toEqual([]);
    expect(withoutAdmissions).toEqual(observed);
    expect(await readFile(databasePath)).toEqual(variantBytes);
    expect(database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all()).toEqual(
      variantSchema,
    );
    expect(database.query<SqliteJournalModeRow, []>('PRAGMA journal_mode').get()).toEqual(journalMode);
    expect(rows()).toEqual(originalRows);
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          expect(
            database
              .query<SqliteNameRow, []>("SELECT name FROM sqlite_master WHERE name='agent_host_admission_attempt'")
              .get(),
          ).toBeNull();
          database.exec(admissionSql);
          expect(database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all()).toEqual(
            schema,
          );
          expect(rows()).toEqual(originalRows);
        },
      ],
      primaryFailure,
    );
  }
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  expect(() => inspectHostWorkspaceDatabase(root, 'missing.sqlite', workspace)).toThrow();
  if (performance.now() >= deadline)
    throw new Error('Readonly workspace inspection fixture exceeded its case deadline');
  preserveHostFixtureRoot = false;
});

test('fresh terminal ownership inspection does not create a journal or infer missing issued evidence is settled', () => {
  const initial = commitHostState(fixture());
  const initialLease = initial.work.lease;
  if (!initialLease) throw new Error('initial Host fixture lease is missing');
  const reconcile = () =>
    store.reconcileCompletedSourceOwnership({
      identity,
      nativeSessionHandle: initialLease.thread_id,
      verifyCurrent() {},
    });
  expect(store.readWorkSessionJournal(identity)).toBeNull();
  expect(reconcile()).toEqual(initial);
  expect(
    database
      .query<SqliteNameRow, []>("SELECT name FROM sqlite_master WHERE name='agent_host_mastra_session_ledger'")
      .get(),
  ).toBeNull();
  const claimed = store.claimWorkflowAttempt(attemptRequest(initial));
  const inflight = readPresentSnapshot(store, identity);
  expect(reconcile).toThrow(/journal missing for retained host effects/);
  expect(store.readHostStateSnapshot(identity)).toEqual(inflight);
  database.exec(
    'CREATE TABLE agent_host_mastra_session_ledger(workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT)',
  );
  expect(reconcile).toThrow(/journal missing for retained host effects/);
  store.markWorkflowAttemptUncertain(claimed);
  const unknown = readPresentSnapshot(store, identity);
  expect(reconcile).toThrow(/journal missing for retained host effects/);
  expect(store.readHostStateSnapshot(identity)).toEqual(unknown);
});

test('same live writer heartbeat preserves its fence and unknown outcome while revocation and expiry deny renewal', () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const deadline = performance.now() + 5_000;
  let state = commitHostState(currentConfigHostFixture());
  const stateLease = state.work.lease;
  if (!stateLease) throw new Error('live Host fixture lease is missing');
  const started = store.claimWorkflowAttempt({
    identity,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    stageId: 'implementation',
    assignmentIndex: 0,
    requestDigest: '5'.repeat(64),
    lease: clone(stateLease),
  });
  state = readPresentSnapshot(store, identity);
  const peerIdentity = { ...identity, work_id: 'heartbeat-peer' };
  const peerSeed = includeExistingLedger(currentConfigHostFixture('heartbeat-peer', 'file:src/peer.ts'), state.ledger);
  peerSeed.expectedLedger = state.ledgerVersion;
  const peer = commitHostState(peerSeed);
  state = readPresentSnapshot(store, identity);
  const journal = issuedCurrentWorkflowJournal().journal;
  const journalBefore = store.readWorkSessionJournal(identity);
  const verifyCurrent = mock(() => {});
  const request: Parameters<HostStateStore['renewActiveLocalLease']>[0] = {
    identity,
    attempt: 1,
    nativeSessionHandle: 'thread',
    generation: 1,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    verifyCurrent,
  };
  const ledgerRow = requiredValue(
    database
      .query<RevisionPayloadDigestSqlRow, [string]>(
        "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
      )
      .get(workspace),
    'heartbeat ledger beforeimage',
  );
  const replaceLedger = database.query(
    "UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE workspace_id=? AND kind='ledger' AND id='shared' AND revision=? AND payload=? AND digest=?",
  );
  for (const [name, earlier, resource, reachesAuthority] of [
    ['earlier disjoint', true, 'file:src/other.ts', true],
    ['later overlap', false, 'file:src/task.ts', true],
    ['earlier overlap', true, 'file:src/task.ts', false],
  ] as const) {
    const controlled = mutableCoordinationLedger(state.ledger);
    controlled.revision = ledgerRow.revision + 1;
    controlled.next_sequence += 2;
    for (const ticket of controlled.tickets) ticket.sequence++;
    const sourceTicket = firstTicket(controlled);
    controlled.tickets.push({
      ...sourceTicket,
      ticket_id: 'heartbeat-queued',
      work_id: 'queued-heartbeat',
      thread_id: 'queued-thread',
      sequence: earlier ? 1 : state.ledger.next_sequence + 1,
      status: 'queued',
      exclusive_resources: [resource],
      active_resources: [],
      blocked_resources: [],
      claim_ids: [],
      expires_at: null,
    });
    expect(validateCoordinationLedgerV1(controlled).ok).toBe(true);
    const payload = coordinationLedgerJson(controlled),
      digest = coordinationLedgerDigest(controlled);
    expect(
      replaceLedger.run(
        controlled.revision,
        payload,
        digest,
        workspace,
        ledgerRow.revision,
        ledgerRow.payload,
        ledgerRow.digest,
      ).changes,
    ).toBe(1);
    let primaryFailure: { error: unknown } | undefined;
    try {
      const before = readFixtureHostRows(database);
      const authorityDenial = new Error('fixture heartbeat current authority reached: ' + name);
      const verify = mock(() => {
        throw authorityDenial;
      });
      expect(() =>
        store.renewActiveLocalLease({
          ...request,
          expectedLedger: { revision: controlled.revision, digest },
          verifyCurrent: verify,
        }),
      ).toThrow(reachesAuthority ? authorityDenial : 'lease renewal conflicts with earlier FIFO ticket');
      expect(verify).toHaveBeenCalledTimes(reachesAuthority ? 1 : 0);
      expect(readFixtureHostRows(database)).toEqual(before);
      expect(store.readWorkSessionJournal(identity)).toEqual(journalBefore);
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            if (
              replaceLedger.run(
                ledgerRow.revision,
                ledgerRow.payload,
                ledgerRow.digest,
                workspace,
                controlled.revision,
                payload,
                digest,
              ).changes !== 1
            )
              throw new Error('Heartbeat ledger fixture exact restoration changed.');
          },
        ],
        primaryFailure,
      );
    }
  }
  expect(store.readHostStateSnapshot(identity)).toEqual(state);
  expect(() =>
    store.renewActiveLocalLease({
      ...request,
      verifyCurrent() {
        throw Error('source authority revoked');
      },
    }),
  ).toThrow(/revoked/);
  expect(store.readHostStateSnapshot(identity)).toEqual(state);
  expect(store.readWorkSessionJournal(identity)).toEqual(journalBefore);
  expect(verifyCurrent).not.toHaveBeenCalled();
  const renewed = presentSnapshot(store.renewActiveLocalLease(request));
  expect(verifyCurrent).toHaveBeenCalledTimes(1);
  expect(renewed.work.lease).toEqual(state.work.lease);
  expect(renewed.work.execution.assignment_attempts).toEqual(state.work.execution.assignment_attempts);
  const peerAfter = store.readHostStateSnapshot(peerIdentity);
  expect(peerAfter.work).toEqual(peer.work);
  expect(peerAfter.workVersion).toEqual(peer.workVersion);
  expect(renewed.ledger.tickets.find((ticket) => ticket.work_id === peerIdentity.work_id)).toEqual(
    peer.ledger?.tickets.find((ticket) => ticket.work_id === peerIdentity.work_id),
  );
  expect(renewed.ledger.claims.find((claim) => claim.work_id === peerIdentity.work_id)).toEqual(
    peer.ledger?.claims.find((claim) => claim.work_id === peerIdentity.work_id),
  );
  expect(firstOf(renewed.work.execution.assignment_attempts, 'renewed assignment attempt').status).toBe('started');
  expect(firstOf(renewed.work.execution.assignment_attempts, 'renewed assignment attempt').attempt_id).toBe(
    started.attempt.attempt_id,
  );
  const row = database
    .query<RevisionPayloadDigestSqlRow, [string]>(
      'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE work_id=?',
    )
    .get('work');
  if (!row) throw new Error('renewed session ledger row is missing');
  expect(row.revision).toBe(journal.version.revision + 1);
  expect(row.payload).toBe(canonicalJson(journal.state));
  expect(row.digest).toBe(journal.version.digest);
  const renewedJournal = store.readWorkSessionJournal(identity);
  const currentRequest = {
    ...request,
    expectedWork: renewed.workVersion,
    expectedLedger: renewed.ledgerVersion,
    expectedJournal: { revision: row.revision, digest: journal.version.digest },
  };
  expect(() => store.renewActiveLocalLease(request)).toThrow('state compare-and-swap conflict');
  for (const change of [{ nativeSessionHandle: 'foreign' }, { generation: request.generation + 1 }]) {
    expect(() => store.renewActiveLocalLease({ ...currentRequest, ...change })).toThrow(
      'lease renewal owner, fencing identity or live expiry differs',
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(renewed);
    expect(store.readWorkSessionJournal(identity)).toEqual(renewedJournal);
    expect(verifyCurrent).toHaveBeenCalledTimes(1);
  }
  const readClock = Date.now;
  const renewedLease = renewed.work.lease;
  if (!renewedLease) throw new Error('renewed Host fixture lease is missing');
  const renewedTicket = renewed.ledger.tickets.find((ticket) => ticket.ticket_id === renewedLease.ticket_id);
  if (!renewedTicket?.expires_at) throw new Error('renewed coordination ticket expiry is missing');
  const expiredClock = Date.parse(renewedTicket.expires_at) + 1;
  try {
    Date.now = () => expiredClock;
    expect(() => store.renewActiveLocalLease(currentRequest)).toThrow(/live expiry differs/);
    expect(store.readHostStateSnapshot(identity)).toEqual(renewed);
    expect(store.readWorkSessionJournal(identity)).toEqual(renewedJournal);
    expect(verifyCurrent).toHaveBeenCalledTimes(1);
  } finally {
    Date.now = readClock;
  }
  if (performance.now() >= deadline) throw new Error('Host heartbeat fixture exceeded its case deadline');
  preserveHostFixtureRoot = false;
});
function quiesceImportedState(
  states: DeepMutable<WorkState>[],
  ledger: DeepMutable<NonNullable<HostSnapshot['ledger']>>,
): void {
  for (const state of states) {
    state.lease = null;
    state.execution.status = 'suspended';
  }
  for (const claim of ledger.claims) claim.status = 'released';
  for (const ticket of ledger.tickets) {
    ticket.status = 'released';
    ticket.active_resources = [];
    ticket.blocked_resources = [];
    ticket.expires_at = null;
  }
}
function includeExistingLedger(
  input: MutableHostStateWrite,
  existing: NonNullable<HostSnapshot['ledger']>,
): MutableHostStateWrite {
  const ownTickets = input.nextLedger.tickets;
  input.nextLedger.revision = existing.revision + 1;
  ownTickets.forEach((ticket, index) => {
    ticket.sequence = existing.next_sequence + index;
  });
  input.nextLedger.open_generation = existing.open_generation;
  input.nextLedger.next_sequence = existing.next_sequence + ownTickets.length;
  input.nextLedger.tickets = [...clone(existing.tickets), ...ownTickets];
  input.nextLedger.claims = [...clone(existing.claims), ...input.nextLedger.claims];
  for (const field of [
    'notices',
    'dispositions',
    'contours',
    'batches',
    'rebinds',
    'operations',
    'retirements',
  ] as const)
    input.nextLedger[field] = [...clone(existing[field]), ...input.nextLedger[field]];
  return input;
}
function quiescentJournal(workId = 'work', runId = 'run-work'): TestJournal {
  const journal: TestJournal = {
    version: { revision: 1, digest: '9'.repeat(64) },
    resume_status: 'complete',
    state: {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspace,
      work_id: workId,
      attempt: 1,
      run_id: runId,
      source_scope: null,
      step_id: null,
      items: [],
      completed: [],
    },
  };
  persistJournalFixture(journal);
  return journal;
}
function persistJournalFixture(journal: TestJournal): void {
  journal.version.digest = canonicalJsonDigest(journal.state);
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database
    .query<never, SQLQueryBindings[]>(
      'INSERT INTO agent_host_mastra_session_ledger VALUES (?,?,?,?,?,?) ON CONFLICT(workspace_id,work_id,attempt) DO UPDATE SET revision=excluded.revision,payload=excluded.payload,digest=excluded.digest',
    )
    .run(
      workspace,
      journal.state.work_id,
      journal.state.attempt,
      journal.version.revision,
      canonicalJson(journal.state),
      journal.version.digest,
    );
}
function issuedCurrentWorkflowJournal(workId = 'work', runId = 'run-work') {
  const config = loadRuntimeConfig(root);
  const host = presentSnapshot(store.readHostStateSnapshot({ ...identity, work_id: workId }));
  const context = { work_id: workId, attempt: 1, scope_digest: host.work.binding.work_source_revision };
  const selection = {
    team: 'default-development',
    kind: 'bug',
    intent: 'bug_fix',
    project: firstOf(identity.project_ids, 'journal fixture project'),
    risk_flags: [],
    labels: [],
  } as const;
  const handoff = prepareSessionWorkflowHandoffFromConfig(config, selection, context);
  if (host.work.binding.workflow_id !== handoff.workflow_id)
    throw new Error('typed session fixture workflow differs from Host binding');
  const requests = handoff.actions.map((action) =>
    buildSessionBridgeRequest({
      runId,
      workflowId: handoff.workflow_id,
      configDigest: host.work.binding.config_digest,
      context,
      waveIndex: 0,
      action,
      configuredContext: null,
      priorResults: [],
    }),
  );
  const ledger = new MastraSessionLedger(database, workspace, config, root, store);
  const prepared = ledger.sync(workId, context.attempt, runId, handoff.actions[0]!.stage_id, requests);
  return { ledger, journal: ledger.issueWave(workId, context.attempt, prepared.version) };
}

function fixtureSourceScope(): NonNullable<MastraSessionLedgerSnapshot['state']['source_scope']> {
  mkdirSync(path.join(root, 'src'), { recursive: true });
  writeFileSync(path.join(root, 'src/task.ts'), 'typed host fixture source\n');
  return snapshotDeclaredSources(requireSafeRepositoryAccess(root), ['src/task.ts']);
}

/** A trusted legacy caller supplies a complete typed observation without claiming current research activation. */
function completedCurrentWorkflowJournal(
  sourceScope = fixtureSourceScope(),
  workId = 'work',
  runId = 'run-work',
): TestJournal {
  const config = loadRuntimeConfig(root);
  const host = presentSnapshot(store.readHostStateSnapshot({ ...identity, work_id: workId }));
  const context = { work_id: workId, attempt: 1, scope_digest: sourceScope.digest };
  const handoff = prepareSessionWorkflowHandoffFromConfig(
    config,
    {
      team: 'default-development',
      kind: 'bug',
      intent: 'bug_fix',
      project: firstOf(identity.project_ids, 'completed journal fixture project'),
      risk_flags: [],
      labels: [],
    },
    context,
  );
  const action = requiredValue(handoff.actions[0], 'completed journal workflow action');
  if (host.work.binding.workflow_id !== handoff.workflow_id)
    throw new Error('completed session fixture workflow differs from Host binding');
  const request = buildSessionBridgeRequest({
    runId,
    workflowId: handoff.workflow_id,
    configDigest: host.work.binding.config_digest,
    context,
    waveIndex: action.wave_index,
    action,
    configuredContext: null,
    priorResults: [],
  });
  const issueId = randomUUID();
  const summary = 'Observed completed legacy readonly fixture result.';
  const observation = parseSessionBridgeObservation({
    schema: 'VidaSessionObservation/v1',
    action_id: request.action_id,
    issue_id: issueId,
    agent_id: 'fixture-agent',
    tool_call_ref: 'local:fixture/readonly-completion',
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: ['local://fixture/readonly-completion'],
  });
  const journal: TestJournal = {
    version: { revision: 1, digest: '0'.repeat(64) },
    resume_status: 'complete',
    state: {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspace,
      work_id: workId,
      attempt: 1,
      run_id: runId,
      source_scope: { ...sourceScope, entries: sourceScope.entries.map((entry) => ({ ...entry })) },
      step_id: action.stage_id,
      items: [{ request, issue_id: issueId, observation }],
      completed: [],
    },
  };
  persistJournalFixture(journal);
  return journal;
}

/** A completed predecessor and an unissued current action preserve recovery's retained-work contract. */
function completedRecoveryJournal(
  workId: string,
  runId: string,
  sourceScope: NonNullable<MastraSessionLedgerSnapshot['state']['source_scope']>,
): TestJournal {
  const journal = completedCurrentWorkflowJournal(sourceScope, workId, runId);
  const completed = clone(firstJournalItem(journal));
  const config = loadRuntimeConfig(root);
  const context = { work_id: workId, attempt: 1, scope_digest: sourceScope.digest };
  const handoff = prepareSessionWorkflowHandoffFromConfig(
    config,
    {
      team: 'default-development',
      kind: 'bug',
      intent: 'bug_fix',
      project: firstOf(identity.project_ids, 'recovery journal fixture project'),
      risk_flags: [],
      labels: [],
    },
    context,
  );
  const predecessorAction = requiredValue(handoff.actions[0], 'recovery journal predecessor action');
  const nextAction: SessionAgentAction = {
    ...predecessorAction,
    action_id: canonicalJsonDigest({ workId, runId, stage: 'synthesize_task' }),
    wave_index: predecessorAction.wave_index + 1,
    action_order: 0,
    assignment_index: 0,
    stage_id: 'synthesize_task',
    stage_kind: 'synthesize',
    stage_mode: 'single',
    required_after: [predecessorAction.stage_id],
    role: 'research-synthesizer',
    resolved_profile: { ...predecessorAction.resolved_profile, profile_id: 'researcher' },
    role_description: 'Synthesize the completed research result.',
    consumes: ['ResearchResult/v1'],
    produces: ['ResearchSynthesis/v1', 'DevelopmentTaskPacket/v1'],
    prior_outcomes: [],
  };
  const host = presentSnapshot(store.readHostStateSnapshot({ ...identity, work_id: workId }));
  const request = buildSessionBridgeRequest({
    runId,
    workflowId: handoff.workflow_id,
    configDigest: host.work.binding.config_digest,
    context,
    waveIndex: nextAction.wave_index,
    action: nextAction,
    configuredContext: null,
    priorResults: [requiredValue(completed.observation, 'completed recovery observation')],
  });
  journal.state.completed = [{ step_id: completed.request.stage_id, items: [completed] }];
  journal.state.items = [{ request, issue_id: null, observation: null }];
  journal.state.step_id = nextAction.stage_id;
  journal.resume_status = 'ready';
  journal.version.revision++;
  journal.version.digest = canonicalJsonDigest(journal.state);
  persistJournalFixture(journal);
  return journal;
}

function ownerRecoveryPreviewJournal(): TestJournal {
  const journal = clone(quiescentJournal());
  journal.resume_status = 'ready';
  journal.state.step_id = 'wave-0';
  journal.state.source_scope = { schema: 'ScopedSourceSnapshot/v1', entries: [], digest: 'source' };
  journal.state.items = [
    {
      issue_id: null,
      observation: null,
      request: {
        schema: 'VidaSessionRequest/v1',
        action_id: 'preview-action',
        assignment_index: 0,
        bindings_manifest_ref: '8'.repeat(64),
        config_digest: 'e'.repeat(64),
        role: 'diagnostics-researcher',
        run_id: 'run-work',
        scope_digest: 'source',
        stage_id: 'research_bug',
        wave_index: 0,
        workflow_id: 'bug_fix',
      },
    },
  ];
  return journal;
}
class PreviewHostStateStore extends HostStateStore {
  readonly #snapshot: HostSnapshot;

  constructor(snapshot: HostSnapshot) {
    super(database, workspace);
    this.#snapshot = snapshot;
  }

  override readHostStateSnapshot(_workIdentity: WorkIdentity): HostSnapshot {
    return this.#snapshot;
  }

  override compareAndSwapHostState(_request: HostStateWrite): HostSnapshot {
    throw new Error('unexpected write');
  }
}

function ownerRecoveryPreviewRequest(
  initial: PresentHostSnapshot,
  journal?: TestJournal,
): Parameters<typeof suspendLocalWork>[0] {
  if (journal === undefined) {
    journal = ownerRecoveryPreviewJournal();
    persistJournalFixture(journal);
  }
  const request: Parameters<typeof suspendLocalWork>[0] = {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:nonapplied-owner-recovery-preview',
    requestIntent: 'next_work',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: 'project',
      work_id: 'work',
    },
  };
  return request;
}
function ownerRecoveryPreviewExpired(callback: () => void): void {
  const originalNow = Date.now;
  Date.now = () => originalNow() + 7200_000;
  try {
    callback();
  } finally {
    Date.now = originalNow;
  }
}

test('owner recovery preview: expired unissued owner releases once and admits a distinct fresh successor', () => {
  const initial = commitHostState(fixture());
  const request = ownerRecoveryPreviewRequest(initial);
  ownerRecoveryPreviewExpired(() => {
    const released = suspendPresent(request);
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(released.work.lifecycle).toEqual({
      ...initial.work.lifecycle,
      revision: 2,
      next_action: released.work.lifecycle.next_action,
    });
    expect(released.work.binding).toEqual(initial.work.binding);
    expect(firstTicket(released.ledger).status).toBe('released');
    expect(firstClaim(released.ledger).status).toBe('released');
    expect(firstClaim(released.ledger).generation).toBe(1);
    expect(released.ledger.operations).toHaveLength(1);
    expect(suspendLocalWork(request)).toEqual(released);
    const successor = includeExistingLedger(fixture('fresh-successor'), released.ledger);
    successor.expectedLedger = released.ledgerVersion;
    const admitted = commitHostState(successor);
    expect(admitted.work.binding.lifecycle_work_id).toBe('fresh-successor');
    expect(admitted.work.execution.run_id).toBe('run-fresh-successor');
    expect(readPresentSnapshot(store, identity).work.execution.status).toBe('suspended');
    expect(admitted.ledger.claims.filter((claim) => claim.status === 'active')).toHaveLength(1);
  });
});

test('owner recovery preview: expired issued, observed, reserved, activation and unknown journals stay unchanged', () => {
  const initial = commitHostState(fixture());
  const mutations: readonly ((journal: TestJournal) => void)[] = [
    (journal) => {
      firstJournalItem(journal).issue_id = 'original-unknown-issue';
      journal.resume_status = 'issued_outcome_uncertain';
    },
    (journal) => {
      const item = firstJournalItem(journal);
      item.issue_id = 'completed-issue';
      setFixtureField(item, 'observation', { status: 'reported_complete' });
    },
    (journal) => {
      setFixtureField(firstJournalItem(journal), 'observation', { status: 'reported_complete' });
    },
    (journal) => {
      setFixtureField(firstJournalItem(journal), 'host_reservation', {});
    },
    (journal) => {
      setFixtureField(firstJournalItem(journal), 'research_activation', {});
    },
    (journal) => {
      setFixtureField(firstJournalItem(journal), 'research_normalization', {});
    },
    (journal) => {
      journal.resume_status = 'blocked';
    },
    (journal) => {
      journal.state.completed = [{ step_id: 'prior-wave', items: [] }];
    },
    (journal) => {
      const scope = journal.state.source_scope;
      if (!scope) throw new Error('preview source scope fixture is missing');
      scope.digest = 'drift';
    },
    (journal) => {
      firstJournalItem(journal).request.config_digest = 'drift';
    },
    (journal) => {
      firstJournalItem(journal).request.run_id = 'foreign-run';
    },
  ];
  for (const mutate of mutations) {
    const journal = ownerRecoveryPreviewJournal();
    mutate(journal);
    ownerRecoveryPreviewExpired(() =>
      expect(() => suspendLocalWork(ownerRecoveryPreviewRequest(initial, journal))).toThrow(),
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});

test('owner recovery preview: current terminal actor does not turn original readonly UNKNOWN into completion', () => {
  const initial = commitHostState(fixture());
  const journal = ownerRecoveryPreviewJournal();
  journal.resume_status = 'issued_outcome_uncertain';
  firstJournalItem(journal).issue_id = 'original-unknown-readonly';
  journal.version.digest = canonicalJsonDigest(journal.state);
  // SuspensionInput has no configured-rights/terminal-actor verifier. A role name cannot authorize release.
  const original = clone(journal);
  ownerRecoveryPreviewExpired(() =>
    expect(() => suspendLocalWork(ownerRecoveryPreviewRequest(initial, journal))).toThrow('uncertain'),
  );
  expect(journal).toEqual(original);
  expect(firstJournalItem(journal).observation).toBeNull();
  expect(store.readHostStateSnapshot(identity)).toEqual(initial);
});

test('owner recovery preview: expired owner rejects foreign identity and stale versions', () => {
  const initial = commitHostState(fixture());
  const request = ownerRecoveryPreviewRequest(initial);
  for (const changes of [
    { nativeSessionHandle: 'foreign' },
    { expectedWork: { ...initial.workVersion, revision: 0 } },
    { expectedLedger: { ...initial.ledgerVersion, revision: 0 } },
    { identity: { ...identity, project_ids: ['other'] } },
  ]) {
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork({ ...request, ...changes })).toThrow());
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});

test('owner recovery preview: release preserves a newer queued waiter and is idempotent', () => {
  const initial = commitHostState(fixture());
  const queued = fixture('other');
  queued.nextWork.lease = null;
  Object.assign(firstTicket(queued.nextLedger), {
    status: 'queued',
    active_resources: [],
    blocked_resources: ['file:src/task.ts'],
    expires_at: null,
  });
  firstClaim(queued.nextLedger).status = 'recovered';
  queued.expectedLedger = initial.ledgerVersion;
  includeExistingLedger(queued, initial.ledger);
  commitHostState(queued);
  const before = readPresentSnapshot(store, identity);
  const request = ownerRecoveryPreviewRequest(before);
  ownerRecoveryPreviewExpired(() => {
    const released = suspendPresent(request);
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(firstTicket(released.ledger).status).toBe('released');
    expect(firstClaim(released.ledger).status).toBe('released');
    expect(atIndex(released.ledger.tickets, 1, 'released ticket')).toEqual(
      atIndex(before.ledger.tickets, 1, 'prior ticket'),
    );
    expect(atIndex(released.ledger.tickets, 1, 'released ticket').status).toBe('queued');
    expect(atIndex(released.ledger.claims, 1, 'released claim')).toEqual(
      atIndex(before.ledger.claims, 1, 'prior claim'),
    );
    expect(released.ledger.operations).toHaveLength(1);
    expect(suspendLocalWork(request)).toEqual(released);
  });
});

test('owner recovery preview: earlier FIFO blocker and foreign active claim still deny release', () => {
  const initial = commitHostState(fixture());
  const older = fixture('older');
  Object.assign(firstTicket(older.nextLedger), {
    sequence: 1,
    status: 'queued',
    active_resources: [],
    blocked_resources: ['file:src/task.ts'],
    expires_at: null,
  });
  firstClaim(older.nextLedger).status = 'recovered';
  const foreign = fixture('foreign');
  firstTicket(foreign.nextLedger).sequence = 3;
  for (const contender of [older, foreign]) {
    // Exercise read-side guards without manufacturing a competing claim in a live store.
    const host = clone(initial);
    firstTicket(host.ledger).sequence = 2;
    host.ledger.tickets.push(firstTicket(contender.nextLedger));
    host.ledger.claims.push(firstClaim(contender.nextLedger));
    const request: Parameters<typeof suspendLocalWork>[0] = {
      ...ownerRecoveryPreviewRequest(initial),
      store: new PreviewHostStateStore(host),
    };
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork(request)).toThrow('same-thread lease'));
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});

test('owner recovery preview: non-INTAKE and completed host assignment are not unissued preparation', () => {
  const initial = commitHostState(fixture());
  // Read-only test double varies persisted evidence without mutating the scratch database.
  const alterations: readonly ((work: DeepMutable<WorkState>) => void)[] = [
    (work) => {
      work.lifecycle.phase = 'TRACE';
    },
    (work) => {
      setFixtureField(work.lifecycle, 'seal', {});
    },
    (work) => {
      setFixtureField(work.execution, 'assignment_attempts', [{ status: 'completed' }]);
    },
    (work) => {
      work.lifecycle.assurance.review_generation = 1;
    },
    (work) => {
      work.lifecycle.assurance.delivery_cycle_id = 'prior-delivery';
    },
  ];
  for (const alter of alterations) {
    const host = clone(initial);
    alter(host.work);
    const request: Parameters<typeof suspendLocalWork>[0] = {
      ...ownerRecoveryPreviewRequest(initial),
      store: new PreviewHostStateStore(host),
    };
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork(request)).toThrow('expired'));
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  }
});
function activeClaimFor(
  ledger: DeepMutable<CoordinationLedger>,
  ticket: DeepMutable<CoordinationLedger>['tickets'][number] = firstTicket(ledger),
) {
  return ledger.claims.find((claim) => claim.ticket_id === ticket.ticket_id && claim.status === 'active');
}
function setActiveLease(
  ledger: DeepMutable<CoordinationLedger>,
  expiresAt: string,
  ticket: DeepMutable<CoordinationLedger>['tickets'][number] = firstTicket(ledger),
) {
  const claim = activeClaimFor(ledger, ticket);
  if (!claim) throw new Error('active fixture claim missing');
  claim.lease_expires_at = expiresAt;
  claim.renewed_at = new Date().toISOString();
  ticket.expires_at = expiresAt;
  return claim;
}
function revokeTicket(
  ledger: DeepMutable<CoordinationLedger>,
  ticket: DeepMutable<CoordinationLedger>['tickets'][number] = firstTicket(ledger),
): void {
  const claim = activeClaimFor(ledger, ticket);
  if (claim) claim.status = 'recovered';
  ticket.status = 'read_only';
  ticket.active_resources = [];
  ticket.blocked_resources = [];
  ticket.expires_at = null;
}
function frozenContour(ledger: DeepMutable<CoordinationLedger>, id = 'contour-work') {
  const ticket = firstTicket(ledger);
  const contour = {
    schema: 'ReleaseContour/v1',
    contour_id: id,
    generation: ticket.generation,
    work_ids: [ticket.work_id],
    ticket_ids: [ticket.ticket_id],
    frozen: true,
    created_at: '2026-09-18T00:00:00.000Z',
  };
  return { ...contour, contour_digest: canonicalJsonDigest(contour) };
}
function artifact() {
  return {
    artifact_id: 'result',
    schema: 'ResearchResult/v1',
    path: '.agent/result.json',
    sha256: '2'.repeat(64),
    stage_id: 'research',
    source_revision: 'source',
    scope_id: 'scope-work',
    ac_ids: ['AC-1'],
  };
}
function attemptRequest(
  state: PresentHostSnapshot = presentSnapshot(store.readHostStateSnapshot(identity)),
  assignmentIndex = 0,
): Parameters<HostStateStore['claimWorkflowAttempt']>[0] {
  const lease = state.work.lease;
  if (!lease) throw new Error('Host attempt fixture lease is missing');
  return {
    identity,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    stageId: 'implementation',
    assignmentIndex,
    requestDigest: '5'.repeat(64),
    lease: clone(lease),
  };
}
const decision = { schema: 'DecisionRecord/v1', path: '.agent/retry-decision.json', sha256: '3'.repeat(64) };
function reconciliationRequest(
  receipt: WorkflowAttemptReceipt,
  outcome: 'completed' | 'no_effect' = 'completed',
  state: PresentHostSnapshot = presentSnapshot(store.readHostStateSnapshot(identity)),
): Parameters<HostStateStore['reconcileWorkflowAttempt']>[0] {
  return {
    identity,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    attemptId: receipt.attempt.attempt_id,
    outcome,
    result: outcome === 'completed' ? { recovered: true } : null,
    providerEvidence: {
      schema: 'ProviderObservation/v1',
      path: '.agent/provider-evidence.json',
      sha256: '4'.repeat(64),
    },
    decision: outcome === 'no_effect' ? decision : null,
    retryLease:
      outcome === 'no_effect'
        ? { ...receipt.attempt.lease, thread_id: 'recovery', generation: receipt.attempt.lease.generation + 1 }
        : null,
  };
}
async function prepareLocalNoEffectRetryFixture({
  loseFinalAcknowledgement = false,
}: { loseFinalAcknowledgement?: boolean } = {}) {
  const evidenceRoot = path.join(root, 'local-no-effect-retry');
  mkdirSync(path.join(evidenceRoot, 'src'), { recursive: true });
  mkdirSync(path.join(evidenceRoot, '.agent'), { recursive: true });
  writeFileSync(path.join(evidenceRoot, 'src', 'task.ts'), 'export const task = true;\n');
  const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(evidenceRoot), ['src/task.ts']);
  const initial = fixture();
  const sourceRevision = '6'.repeat(64);
  initial.nextWork.binding.work_source_revision = sourceRevision;
  initial.nextWork.lifecycle.source_revision = sourceRevision;
  firstTicket(initial.nextLedger).source_revision = sourceRevision;
  commitHostState(initial);

  const verifier = createLocalSessionReconciliationVerifier(evidenceRoot);
  const calls = { compareAndSwapHostState: 0, reconcileWorkflowAttempt: 0, verify: 0 };
  const countedVerifier: WorkflowAttemptReconciliationVerifier = {
    principal: verifier.principal,
    verify: (request, state) => {
      calls.verify++;
      return verifier.verify(request, state);
    },
  };
  const hostStore = new HostStateStore(database, workspace, countedVerifier);
  const started = hostStore.claimWorkflowAttempt(attemptRequest(readPresentSnapshot(hostStore, identity)));
  const proofPath = '.agent/local-no-effect.json';
  const decisionPath = '.agent/local-no-effect-decision.json';
  const actionId = '7'.repeat(64);
  const proof = {
    schema: 'LocalSessionNoEffectEvidence/v1',
    work_id: identity.work_id,
    attempt: 1,
    action_id: actionId,
    host_attempt_id: started.attempt.attempt_id,
    request_digest: started.attempt.request_digest,
    workflow_id: initial.nextWork.binding.workflow_id,
    config_digest: initial.nextWork.binding.config_digest,
    scope_digest: sourceRevision,
    source_snapshot_digest: sourceScope.digest,
    native_session_handle: started.attempt.lease.thread_id,
    successor_session_handle: 'recovery',
    ticket_id: started.attempt.lease.ticket_id,
    lease_generation: started.attempt.lease.generation,
    native_inspection_ref: 'local-inspection#1',
    decision_path: decisionPath,
    inspected_by: started.attempt.lease.thread_id,
    inspected_at: new Date().toISOString(),
    finding: 'confirmed_not_invoked_and_quiescent',
  };
  const proofBytes = Buffer.from(JSON.stringify(proof));
  const providerEvidence = {
    schema: proof.schema,
    path: proofPath,
    sha256: createHash('sha256').update(proofBytes).digest('hex'),
  };
  const decision = {
    schema: 'WorkflowAttemptRecoveryDecision/v1',
    work_id: identity.work_id,
    work_item_id: initial.nextWork.binding.provider_work_item_id,
    source_revision: sourceRevision,
    scope_id: initial.nextWork.binding.scope_id,
    ac_ids: [...initial.nextWork.binding.ac_ids],
    action_id: actionId,
    host_attempt_id: started.attempt.attempt_id,
    provider_evidence: providerEvidence,
    outcome: 'no_effect',
    retry_lease: {
      ticket_id: started.attempt.lease.ticket_id,
      thread_id: proof.successor_session_handle,
      generation: started.attempt.lease.generation + 1,
    },
    decided_by: proof.inspected_by,
    decided_at: proof.inspected_at,
    reason: 'The native session confirms the action was never issued and is quiescent.',
  };
  const writeJson = (relativePath: string, value: unknown) =>
    writeFileSync(path.join(evidenceRoot, relativePath), JSON.stringify(value));
  writeFileSync(path.join(evidenceRoot, proofPath), proofBytes);
  writeJson(decisionPath, decision);
  const journal: TestJournal = {
    version: { revision: 1, digest: '8'.repeat(64) },
    state: {
      schema: 'MastraSessionLedger/v1',
      workspace_id: workspace,
      work_id: identity.work_id,
      attempt: 1,
      run_id: 'run-work',
      source_scope: {
        schema: sourceScope.schema,
        entries: sourceScope.entries.map((entry) => ({ ...entry })),
        digest: sourceScope.digest,
      },
      step_id: 'wave0',
      items: [
        {
          request: {
            schema: 'VidaSessionRequest/v1',
            run_id: 'run-work',
            workflow_id: initial.nextWork.binding.workflow_id,
            wave_index: 0,
            action_id: actionId,
            assignment_index: started.attempt.assignment_index,
            stage_id: started.attempt.stage_id,
            role: 'implementation-writer',
            config_digest: initial.nextWork.binding.config_digest,
            scope_digest: sourceRevision,
            bindings_manifest_ref: '8'.repeat(64),
          },
          issue_id: null,
          observation: null,
        },
      ],
      completed: [],
    },
    resume_status: 'ready',
  };
  const input: Parameters<typeof reconcileUnissuedLocalSessionAction>[0] = {
    root: evidenceRoot,
    proofPath,
    store: hostStore,
    identity,
    journal,
    configDigest: initial.nextWork.binding.config_digest,
  };
  let loseAcknowledgement = loseFinalAcknowledgement;
  const operationStore = hostStore;
  const compareAndSwapHostState = hostStore.compareAndSwapHostState.bind(hostStore);
  operationStore.compareAndSwapHostState = (request) => {
    calls.compareAndSwapHostState++;
    const saved = compareAndSwapHostState(request);
    const nextLease = request.nextWork.lease;
    if (
      loseAcknowledgement &&
      nextLease?.thread_id === proof.successor_session_handle &&
      nextLease.generation === started.attempt.lease.generation + 1
    ) {
      loseAcknowledgement = false;
      throw new Error('simulated lost retry-fence acknowledgement');
    }
    return saved;
  };
  const reconcileWorkflowAttempt = hostStore.reconcileWorkflowAttempt.bind(hostStore);
  operationStore.reconcileWorkflowAttempt = (request) => {
    calls.reconcileWorkflowAttempt++;
    return reconcileWorkflowAttempt(request);
  };
  return {
    calls,
    decision,
    decisionPath,
    evidenceRoot,
    hostStore,
    input,
    journal,
    operationStore,
    proof,
    proofPath,
    started,
    writeJson,
  };
}
// Unit host verifier fixture, not a production provider attestation adapter.
function verifyingStore(handle: Database, verify: WorkflowAttemptReconciliationVerifier['verify']): HostStateStore {
  return new HostStateStore(handle, workspace, { principal: 'runtime:test-verifier', verify });
}
function invokeMalformedReconciliationResponse(
  handle: Database,
  request: Parameters<HostStateStore['reconcileWorkflowAttempt']>[0],
  response: unknown,
): Promise<unknown> {
  const target: unknown = Reflect.apply(verifyingStore, undefined, [handle, () => response]);
  if (!(target instanceof HostStateStore)) throw new Error('malformed verifier fixture did not create a Host store');
  return Promise.resolve(Reflect.apply(target.reconcileWorkflowAttempt.bind(target), undefined, [request]));
}
function invokeMalformedReconciliationRequest(target: HostStateStore, request: unknown): Promise<unknown> {
  return Promise.resolve(Reflect.apply(target.reconcileWorkflowAttempt.bind(target), undefined, [request]));
}
function reconciliationAuthorization(
  request: Parameters<HostStateStore['reconcileWorkflowAttempt']>[0],
  state: HostSnapshot,
): WorkflowAttemptReconciliationAuthorization {
  return createWorkflowReconciliationAuthorization('runtime:test-verifier', request, state);
}
beforeAll(() => {
  configuredInstructionRoot = configuredTestContext().repositoryRoot;
});

beforeEach(async () => {
  preserveHostFixtureRoot = false;
  root = await mkdtemp(path.join(tmpdir(), 'host-state-'));
  try {
    writeFileSync(
      path.join(root, 'AGENTS.md'),
      readFileSync(path.join(configuredInstructionRoot, 'AGENTS.md'), 'utf8'),
    );
    writeFileSync(
      path.join(root, 'AGENT.sidecar.md'),
      readFileSync(path.join(configuredInstructionRoot, 'AGENT.sidecar.md'), 'utf8'),
    );
    const policyRoot = path.join(root, 'docs/agent-instructions');
    mkdirSync(policyRoot, { recursive: true });
    writeFileSync(
      path.join(policyRoot, 'documentation-policy.v1.json'),
      JSON.stringify(
        {
          schema: 'DocumentationPolicy/v1',
          policy_id: 'host-state-test-documentation',
          project_id: firstOf(identity.project_ids, 'fixture project identity'),
          source_path: 'docs/agent-instructions/documentation-policy.v1.json',
          owner: 'project:host-state-test',
          required: true,
          canonical_roots: ['docs/agent-instructions'],
          map_paths: ['docs/agent-instructions/index.md'],
          excluded_roots: ['.agent', '.planning'],
          changelog_required: false,
          changelog_path: null,
          relations: ['documents'],
          updated_at: '2026-10-13T00:00:00.000Z',
        },
        null,
        2,
      ) + '\n',
    );
    writeFileSync(path.join(policyRoot, 'index.md'), '# Fixture documentation map\n');
    const runtimeTemplate = readFileSync(
      path.join(bundleRoot, 'templates/agent-runtime.config.template.v1.yaml'),
      'utf8',
    )
      .replaceAll('{{REPOSITORY}}', identity.repository_id)
      .replaceAll('{{PROJECT}}', firstOf(identity.project_ids, 'project identity'))
      .replaceAll('{{BUNDLE}}', 'vida-agent');
    writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), runtimeTemplate);
    // The configured development-lifecycle source is package-owned and is resolved through runtimePackageAccess.
    sourceLeaseConfig = loadRuntimeConfig(root);
    databasePath = path.join(root, 'authority.db');
    database = openHostStateDatabase(root, 'authority.db', workspace);
    admittedHostDatabases.add(database);
    handles.push(database);
    store = new HostStateStore(database, workspace);
  } catch (error) {
    preserveHostFixtureRoot = true;
    throw error;
  }
});
afterEach(async () => {
  identity.integrations_digest = 'e'.repeat(64);
  for (const child of children.splice(0)) if (child.exitCode === null) child.kill();
  for (const handle of handles.splice(0)) {
    if (admittedHostDatabases.has(handle)) closeWorkspaceDatabaseWithAdmission(handle);
    else handle.close();
  }
  for (const fixtureRoot of producerRoots.splice(0)) {
    if (
      path.dirname(fixtureRoot) !== path.resolve(tmpdir()) ||
      !path.basename(fixtureRoot).startsWith('vida-producer-')
    )
      throw new Error('unsafe producer fixture cleanup');
    if (failedProducerRoots.delete(fixtureRoot)) {
      console.error('Failed producer fixture retained: ' + fixtureRoot);
      continue;
    }
    try {
      await rm(fixtureRoot, { recursive: true, force: true });
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EBUSY') throw error;
      console.error('Closed producer fixture retained (OS EBUSY): ' + fixtureRoot);
    }
  }
  const relative = path.relative(path.resolve(tmpdir()), path.resolve(root));
  if (!relative.startsWith('host-state-') || relative.includes(path.sep)) throw new Error('unsafe scratch cleanup');
  if (preserveHostFixtureRoot) {
    const reason = typeof preserveHostFixtureRoot === 'string' ? preserveHostFixtureRoot : 'setup failed';
    preserveHostFixtureRoot = false;
    console.error(`Host fixture ${reason}; scratch root retained: ${root}`);
    return;
  }
  await rm(root, { recursive: true, force: true });
});

function producerFixture(name = 'producer'): {
  readonly args: BridgeOpenArgs;
  readonly input: ProducerInputBase;
  readonly ledger: MastraSessionLedger;
  readonly rows: () => ProducerOperationSqlRow[];
  readonly enginePath: string;
} {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-producer-' + name + '-'));
  producerRoots.push(repositoryRoot);
  writeFileSync(
    path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'),
    readFileSync(path.join(bundleRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'producer-repository')
      .replaceAll('{{PROJECT}}', 'project')
      .replaceAll('{{BUNDLE}}', 'vida-agent'),
  );
  writeFileSync(path.join(repositoryRoot, 'AGENTS.md'), 'Fixture policy');
  writeFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), 'Fixture source map');
  mkdirSync(path.join(repositoryRoot, 'docs/agent-instructions'), { recursive: true });
  writeFileSync(path.join(repositoryRoot, 'docs/agent-instructions/documentation-policy.v1.json'), '{}');
  const config = loadRuntimeConfig(repositoryRoot),
    ledger = openConfiguredMastraSessionLedger(repositoryRoot);
  handles.push(ledger.sessionProducerBinding().database);
  const args: BridgeOpenArgs = {
    repositoryRoot,
    config,
    ledger,
    projectIds: ['project'],
    selection: {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project: 'project',
      risk_flags: [],
      labels: [],
    },
    context: { work_id: 'producer', attempt: 1, scope_digest: 'c'.repeat(64) },
    workflowId: 'task_execution',
    workspaceId: deriveWorkspaceId(config.repository.repository_id, repositoryRoot),
  };
  const rows = (): ProducerOperationSqlRow[] =>
    ledger
      .sessionProducerBinding()
      .database.query<ProducerOperationSqlRow, []>(
        "SELECT revision,payload FROM agent_host_governance WHERE store_id='vida-session-producers' AND kind='operation'",
      )
      .all();
  const { ledger: _ledger, workspaceId: _workspaceId, ...input } = args;
  return {
    args,
    input,
    ledger,
    rows,
    enginePath: path.join(repositoryRoot, config.control.work_root, 'mastra-workflows.v1.sqlite'),
  };
}

function noWorkProducerInput(
  f: ReturnType<typeof producerFixture>,
  change: Partial<ProducerInput> = {},
): ProducerInput {
  return {
    ...f.input,
    phase: 'initialize',
    runId: sessionBridgeRunId(f.args.workspaceId, f.args.context, f.args.workflowId),
    expectedWork: null,
    expectedLedger: null,
    expectedJournal: null,
    maintenanceGeneration: 0,
    ...change,
  };
}

async function withProducerFixtureCustody<T>(
  body: (f: ReturnType<typeof producerFixture>) => T | Promise<T>,
  name?: string,
): Promise<T> {
  const rootsBefore = producerRoots.length;
  let f: ReturnType<typeof producerFixture>;
  try {
    f = producerFixture(name);
  } catch (error) {
    for (const fixtureRoot of producerRoots.slice(rootsBefore)) failedProducerRoots.add(fixtureRoot);
    throw error;
  }
  try {
    return await body(f);
  } catch (error) {
    failedProducerRoots.add(f.args.repositoryRoot);
    throw error;
  }
}

function expectMechanicalProducerDenial(
  f: ReturnType<typeof producerFixture>,
  input: ProducerInput,
  message: RegExp,
): void {
  const database = f.ledger.sessionProducerBinding().database,
    hostBefore = database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all(),
    journalBefore = database
      .query<SessionLedgerSqlRow, []>(
        'SELECT * FROM agent_host_mastra_session_ledger ORDER BY workspace_id,work_id,attempt',
      )
      .all();

  expect(() => f.ledger.hostState.beginSessionProducer(f.ledger, input)).toThrow(message);
  expect(f.rows()).toHaveLength(0);
  expect(database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all()).toEqual(
    hostBefore,
  );
  expect(
    database
      .query<SessionLedgerSqlRow, []>(
        'SELECT * FROM agent_host_mastra_session_ledger ORDER BY workspace_id,work_id,attempt',
      )
      .all(),
  ).toEqual(journalBefore);
  expect(existsSync(f.enginePath)).toBe(false);
}

test('session producer requires the actual configured ledger before any engine effect', async () => {
  await withProducerFixtureCustody(async (f) => {
    const malformedPrototypeLedger = new Proxy({}, { getPrototypeOf: () => MastraSessionLedger.prototype });
    for (const ledger of [undefined, {}, malformedPrototypeLedger]) {
      await Promise.resolve(
        expect(
          Reflect.apply(MastraSessionBridge.open.bind(MastraSessionBridge), undefined, [{ ...f.args, ledger }]),
        ).rejects.toThrow(),
      );
      expect(existsSync(f.enginePath)).toBe(false);
      expect(f.rows()).toHaveLength(0);
    }
    for (const projectIds of [[], ['foreign'], ['project', 'project']]) {
      await Promise.resolve(expect(MastraSessionBridge.open({ ...f.args, projectIds })).rejects.toThrow());
      expect(existsSync(f.enginePath)).toBe(false);
      expect(f.rows()).toHaveLength(0);
    }
    expect(() => f.ledger.hostState.reserveOperation('vida-session-producers', 'forged', 'a'.repeat(64))).toThrow(
      /protected/,
    );
    expectMechanicalProducerDenial(
      f,
      {
        ...f.input,
        phase: 'start',
        runId: 'foreign',
        expectedWork: null,
        expectedLedger: null,
        expectedJournal: null,
        maintenanceGeneration: 0,
      },
      /run differs/,
    );
  });
});

for (const rootName of ['literal%20', 'standalone%', 'fragment#', 'space path', 'unicode-é東京']) {
  test(
    `session producer opens physical engine database at configured path for ${JSON.stringify(rootName)}`,
    async () => {
      const f = producerFixture(rootName);
      let bridge: MastraSessionBridge | undefined;
      try {
        const enginePath = sessionBridgeDatabasePath(f.args.repositoryRoot, f.args.config);
        expect(f.enginePath).toBe(enginePath);
        bridge = await MastraSessionBridge.open(f.args);
        const engine = await bridge.start();
        expect(existsSync(enginePath)).toBe(true);
        const physical = new Database(enginePath, { strict: true });
        try {
          expect(
            physical
              .query<{ readonly run_id: string }, [string]>(
                'SELECT run_id FROM mastra_workflow_snapshot WHERE run_id=?',
              )
              .get(engine.run_id),
          ).toEqual({ run_id: engine.run_id });
        } finally {
          physical.close(true);
        }
      } finally {
        if (bridge) await bridge.close();
      }
    },
    { timeout: 30_000 },
  );
}

test('session producer reuses the validated Journal only inside each acquisition or settlement transaction', () => {
  const f = producerFixture('journal-read');
  // oxlint-disable-next-line typescript/unbound-method -- Delegate with the actual receiver and restore the exact prototype method.
  const originalResume = MastraSessionLedger.prototype.resume;
  let reads = 0;
  MastraSessionLedger.prototype.resume = function (...args) {
    if (this === f.ledger) reads += 1;
    return originalResume.apply(this, args);
  };
  try {
    const handle = f.ledger.hostState.beginSessionProducer(f.ledger, {
      ...f.input,
      phase: 'initialize',
      runId: sessionBridgeRunId(f.args.workspaceId, f.args.context, f.args.workflowId),
      expectedWork: null,
      expectedLedger: null,
      expectedJournal: null,
      maintenanceGeneration: 0,
    });
    const acquisitionReads = reads;
    reads = 0;
    f.ledger.hostState.settleSessionProducer(handle, null);
    const settlementReads = reads;
    expect([acquisitionReads, settlementReads]).toEqual([1, 1]);
    expect(f.rows()).toHaveLength(1);
    expect(parseJsonRecord(firstOf(f.rows(), 'settled producer operation').payload).status).toBe('applied');
    expect(existsSync(f.enginePath)).toBe(false);
  } finally {
    MastraSessionLedger.prototype.resume = originalResume;
  }
});

test('session producer mechanical no-work rejects an admitted lifecycle Work without reservation or state changes', async () => {
  await withProducerFixtureCustody((f) => {
    const binding = f.ledger.sessionProducerBinding(),
      write = fixture('producer');
    write.nextWork.workspace_id = f.args.workspaceId;
    write.nextLedger.workspace_id = f.args.workspaceId;
    write.nextWork.binding.repository_id = 'other-repository';
    write.nextWork.binding.integrations_digest = 'f'.repeat(64);
    for (const ticket of write.nextLedger.tickets) {
      ticket.repository_id = write.nextWork.binding.repository_id;
      ticket.integrations_digest = write.nextWork.binding.integrations_digest;
    }
    binding.host.compareAndSwapHostState(write);
    const snapshot = binding.host.readHostStateSnapshot({
      repository_id: f.args.config.repository.repository_id,
      project_ids: f.args.projectIds,
      integrations_digest: loadProjectSetContext(
        f.args.repositoryRoot,
        f.args.config,
        f.args.config.repository.repository_id,
        f.args.projectIds,
      ).integrations_digest,
      work_id: f.args.context.work_id,
    });
    const input = noWorkProducerInput(f, {
      expectedWork: snapshot.workVersion,
      expectedLedger: snapshot.ledgerVersion,
      maintenanceGeneration: snapshot.maintenanceGeneration,
    });
    expectMechanicalProducerDenial(f, input, /mechanical producer conflicts with admitted Work/);
  }, 'mechanical-work');
});

test('session producer acquisition rejects stale CAS, maintenance and selection without reservation', async () => {
  const f = producerFixture();
  const input: ProducerInput = {
    ...f.input,
    phase: 'start',
    runId: sessionBridgeRunId(f.args.workspaceId, f.args.context, f.args.workflowId),
    expectedWork: null,
    expectedLedger: null,
    expectedJournal: null,
    maintenanceGeneration: 0,
  };
  const changes: readonly Partial<ProducerInput>[] = [
    { expectedWork: { revision: 1, digest: 'a'.repeat(64) } },
    { expectedLedger: { revision: 1, digest: 'a'.repeat(64) } },
    { expectedJournal: { revision: 1, digest: 'a'.repeat(64) } },
    { maintenanceGeneration: 1 },
    { selection: { ...input.selection, project: 'foreign' } },
    { workflowId: 'implementation_change' },
  ];
  for (const change of changes) {
    expect(() => f.ledger.hostState.beginSessionProducer(f.ledger, { ...input, ...change })).toThrow();
    expect(f.rows()).toHaveLength(0);
    expect(existsSync(f.enginePath)).toBe(false);
  }
  const yamlPath = path.join(f.args.repositoryRoot, 'agent-runtime.config.v1.yaml');
  const yaml = readFileSync(yamlPath, 'utf8');
  writeFileSync(yamlPath, yaml.replace('config_revision: 1', 'config_revision: 2'));
  expect(() => f.ledger.hostState.beginSessionProducer(f.ledger, input)).toThrow(/configuration changed/);
  expect(f.rows()).toHaveLength(0);
  expect(existsSync(f.enginePath)).toBe(false);
});

test(
  'session producer settles real engine and journal and rejects invalid resume before reservation',
  async () =>
    withProducerFixtureCustody(async (f) => {
      let current: MastraSessionBridge | undefined;
      await withInitialSourceCleanup(
        async () => {
          let bridge = await MastraSessionBridge.open(f.args);
          current = bridge;
          const first = await bridge.start();
          let journal = requiredSessionJournal(f.ledger);
          expect(journal.state.run_id).toBe(first.run_id);
          expect(journal.state.items.map((item) => clone(item.request))).toEqual(
            first.requests.map((request) => clone(request)),
          );
          await bridge.close();
          current = undefined;
          bridge = await MastraSessionBridge.open(f.args);
          current = bridge;
          expect(await bridge.snapshot()).toEqual(first);
          expect(requiredSessionJournal(f.ledger)).toEqual(journal);
          const firstStepId = requiredValue(first.step_id, 'first producer step id');
          expect(f.rows().every((row) => row.revision === 3 && parseJsonRecord(row.payload).status === 'applied')).toBe(
            true,
          );
          const before = f.rows();
          expect(before.length).toBeGreaterThan(0);
          await Promise.resolve(expect(bridge.start()).rejects.toThrow(/already exists/));
          await Promise.resolve(expect(bridge.resume('wave-foreign', [])).rejects.toThrow(/resume intent/));
          await Promise.resolve(expect(bridge.resume(firstStepId, [])).rejects.toThrow(/resume intent/));
          expect(f.rows()).toEqual(before);
          journal = f.ledger.issueWave('producer', 1, journal.version);
          for (const item of journal.state.items) {
            const issueId = item.issue_id;
            if (issueId === null) throw new Error('issued session journal item has no issue id');
            const summary = 'Actual local fixture observation';
            journal = f.ledger.report('producer', 1, journal.version, {
              schema: 'VidaSessionObservation/v1',
              action_id: item.request.action_id,
              issue_id: issueId,
              agent_id: 'fixture',
              tool_call_ref: 'local:producer/observation',
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['local://fixture/observation'],
            });
          }
          const observations = journal.state.items.map((item) =>
            requiredValue(item.observation, 'reported session observation'),
          );
          await Promise.resolve(
            expect(
              bridge.resume(
                firstStepId,
                observations.map((item) => ({ ...item, agent_id: 'foreign' })),
              ),
            ).rejects.toThrow(/resume intent/),
          );
          expect(f.rows()).toEqual(before);
          const next = await bridge.resume(firstStepId, observations);
          expect(next.step_id).not.toBe(firstStepId);
          expect(
            firstOf(requiredSessionJournal(f.ledger).state.completed, 'completed session step').items.map(
              (item) => item.observation,
            ),
          ).toEqual(observations);
          expect(f.rows().length).toBeGreaterThanOrEqual(before.length);
          expect(f.rows().every((row) => row.revision === 3 && parseJsonRecord(row.payload).status === 'applied')).toBe(
            true,
          );
        },
        async () => {
          if (current) await current.close();
        },
        'Reopened session producer fixture',
      );
    }),
  { timeout: 30_000 },
);

test(
  'session producer handle and UNKNOWN fence survive close and exclude journal and maintenance writers',
  async () => {
    const f = producerFixture(),
      bridge = await MastraSessionBridge.open(f.args);
    await bridge.start();
    const journal = requiredSessionJournal(f.ledger);
    const handle = f.ledger.beginSessionProducer({
      ...f.input,
      phase: 'initialize',
      runId: sessionBridgeRunId(f.args.workspaceId, f.args.context, f.args.workflowId),
    });
    expect(() => f.ledger.hostState.assertSessionProducerCurrent({ ...handle })).toThrow(/foreign/);
    expect(() => f.ledger.issueWave('producer', 1, journal.version)).toThrow(/producer is pending or unknown/);
    const bound = f.ledger.sessionProducerBinding();
    const maintenance = new HostStateStore(
      bound.database,
      f.args.workspaceId,
      undefined,
      undefined,
      undefined,
      maintenanceVerifier,
      f.args.repositoryRoot,
    );
    expect(() => maintenance.acquireMaintenanceFence(maintenanceBinding())).toThrow(/producer is pending or unknown/);
    expect(() => maintenance.reserveOperation('another-store', 'new-operation', 'a'.repeat(64))).toThrow(
      /producer is pending or unknown/,
    );
    expect(() => f.ledger.hostState.transitionOperation(handle.operation, 'applied')).toThrow(/protected/);
    const before = f.rows();
    expect(() =>
      f.ledger.hostState.settleSessionProducer(handle, { ...journal.version, revision: journal.version.revision + 1 }),
    ).toThrow(/compare-and-swap/);
    expect(f.rows()).toEqual(before);
    await bridge.close();
    await Promise.resolve(expect(MastraSessionBridge.open(f.args)).rejects.toThrow(/producer is pending or unknown/));
    expect(f.rows()).toEqual(before);
    expect(parseJsonRecord(before.at(-1)?.payload ?? '').status).toBe('commit_unknown');
    f.ledger.hostState.settleSessionProducer(handle, journal.version);
    expect(() => f.ledger.hostState.settleSessionProducer(handle, journal.version)).toThrow(/foreign/);
    expect(f.rows().every((row) => row.revision === 3 && parseJsonRecord(row.payload).status === 'applied')).toBe(true);
  },
  { timeout: 30_000 },
);

test(
  'session producer readonly frontier rejects substituted execution paths before acquisition',
  async () => {
    const f = producerFixture(),
      bridge = await MastraSessionBridge.open(f.args);
    try {
      const engine = await bridge.start(),
        before = f.rows();
      const persisted = new Database(f.enginePath, { strict: true });
      try {
        const original = persisted
          .query<MastraWorkflowSnapshotSqlRow, [string]>(
            'SELECT snapshot,json(snapshot) AS parsed FROM mastra_workflow_snapshot WHERE run_id=?',
          )
          .get(engine.run_id);
        if (!original) throw new Error('persisted Mastra workflow fixture is missing');
        const stepId = requiredValue(engine.step_id, 'persisted fixture step id');
        for (const executionPath of [[-1], [999], [0, 0]]) {
          const substituted = parseJsonRecord(original.parsed);
          setFixtureField(recordAt(substituted, 'suspendedPaths'), stepId, executionPath);
          persisted
            .query<never, SQLQueryBindings[]>('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
            .run(JSON.stringify(substituted), engine.run_id);
          await Promise.resolve(expect(bridge.snapshot()).rejects.toThrow(/execution path|suspended path/));
          await Promise.resolve(
            expect(MastraSessionBridge.open(f.args)).rejects.toThrow(/execution path|suspended path/),
          );
          expect(f.rows()).toEqual(before);
        }
        persisted
          .query<never, SQLQueryBindings[]>('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
          .run(original.snapshot, engine.run_id);
        expect(await bridge.snapshot()).toEqual(engine);
      } finally {
        persisted.close();
      }
    } finally {
      await bridge.close();
    }
  },
  { timeout: 30_000 },
);

for (const completed of [false, true]) {
  test(
    'session producer rejects missing and substituted wave chains before acquisition when ' +
      (completed ? 'complete' : 'suspended'),
    async () =>
      withProducerFixtureCustody(async (f) => {
        const bridge = await MastraSessionBridge.open(f.args);
        const database = new Database(f.enginePath, { strict: true });
        const persisted = (runId: string) =>
          database
            .query<MastraWorkflowSnapshotSqlRow, [string]>(
              'SELECT snapshot,json(snapshot) AS parsed FROM mastra_workflow_snapshot WHERE run_id=?',
            )
            .get(runId);
        const replace = (runId: string, value: unknown) =>
          database
            .query<never, SQLQueryBindings[]>('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
            .run(JSON.stringify(value), runId);
        const resume = async (engine: Awaited<ReturnType<typeof bridge.start>>) => {
          let journal = requiredSessionJournal(f.ledger);
          journal = f.ledger.issueWave('producer', 1, journal.version);
          for (const item of journal.state.items) {
            const stage = requiredValue(
              requiredRuntimeWorkflow(f.args.config, 'task_execution').stages.find(
                (entry) => entry.id === item.request.stage_id,
              ),
              'task execution stage fixture',
            );
            const kind = stage.kind;
            const issueId = requiredValue(item.issue_id, 'issued chain item id');
            const summary =
              kind === 'validate'
                ? JSON.stringify({
                    schema: 'VidaValidatorVerdict/v1',
                    verdict: 'pass',
                    findings: [],
                    evidence_refs: ['local://chain'],
                  })
                : kind === 'test'
                  ? JSON.stringify({
                      schema: 'VidaTesterVerdict/v1',
                      status: 'pass',
                      evidence_refs: ['local://chain'],
                    })
                  : 'Actual chain fixture observation';
            journal = f.ledger.report('producer', 1, journal.version, {
              schema: 'VidaSessionObservation/v1',
              action_id: item.request.action_id,
              issue_id: issueId,
              agent_id: 'fixture',
              tool_call_ref: 'local:chain/' + issueId,
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['local://chain'],
            });
          }
          return await bridge.resume(
            requiredValue(engine.step_id, 'chain engine step id'),
            journal.state.items.map((item) => requiredValue(item.observation, 'chain observation')),
          );
        };
        const rejects = async (
          engine: Awaited<ReturnType<typeof bridge.start>>,
          changes: readonly SnapshotMutation[],
        ) => {
          const original = persisted(engine.run_id);
          if (!original) throw new Error('persisted Mastra workflow fixture is missing');
          const rows = f.rows();
          try {
            for (const change of changes) {
              const value = parseJsonRecord(original.parsed);
              change(value);
              replace(engine.run_id, value);
              await Promise.resolve(expect(bridge.snapshot()).rejects.toThrow(/Session engine/));
              await Promise.resolve(expect(MastraSessionBridge.open(f.args)).rejects.toThrow(/Session engine/));
              expect(f.rows()).toEqual(rows);
            }
          } finally {
            database
              .query<never, SQLQueryBindings[]>('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
              .run(original.snapshot, engine.run_id);
          }
          expect(await bridge.snapshot()).toEqual(engine);
        };
        try {
          let engine = await resume(await bridge.start());
          if (!completed) {
            await rejects(engine, [
              (s) => {
                delete recordAt(s, 'context')['wave-0'];
              },
              (s) => {
                recordAt(recordAt(s, 'context'), 'wave-0').status = 'failed';
              },
              (s) => {
                const step = recordAt(recordAt(s, 'context'), 'wave-0');
                recordAt(step, 'payload').observations = recordAt(step, 'output').observations;
              },
              (s) => {
                recordAt(recordAt(recordAt(s, 'context'), 'wave-1'), 'payload').observations = [];
              },
              (s) => {
                const output = recordAt(recordAt(recordAt(s, 'context'), 'wave-0'), 'output');
                const first = arrayAt(output, 'observations')[0];
                if (!isPlainRecord(first)) throw new Error('expected first persisted observation');
                first.summary = 'Substituted output';
              },
              (s) => {
                const context = recordAt(s, 'context');
                const output = recordAt(recordAt(context, 'wave-0'), 'output');
                const first = arrayAt(output, 'observations')[0];
                if (!isPlainRecord(first)) throw new Error('expected first persisted observation');
                first.action_id = 'd'.repeat(64);
                recordAt(context, 'wave-1').payload = structuredClone(output);
              },
              (s) => {
                const context = recordAt(s, 'context');
                context['wave-999'] = structuredClone(recordAt(context, 'wave-0'));
              },
              (s) => {
                s.status = 'success';
                s.suspendedPaths = {};
                const context = recordAt(s, 'context');
                s.result = recordAt(context, 'wave-1').payload;
                s.context = { input: context.input };
              },
            ]);
          } else {
            while (engine.status === 'suspended') engine = await resume(engine);
            expect(engine.status).toBe('success');
            await rejects(engine, [
              (s) => {
                delete recordAt(s, 'context')['wave-0'];
              },
              (s) => {
                delete recordAt(s, 'context')['wave-4'];
              },
              (s) => {
                recordAt(recordAt(recordAt(s, 'context'), 'wave-1'), 'payload').observations = [];
              },
              (s) => {
                recordAt(s, 'result').observations = [];
              },
              (s) => {
                const resumePayload = recordAt(recordAt(recordAt(s, 'context'), 'wave-0'), 'resumePayload');
                const first = arrayAt(resumePayload, 'observations')[0];
                if (!isPlainRecord(first)) throw new Error('expected first resumed observation');
                first.agent_id = 'foreign';
              },
              (s) => {
                recordAt(recordAt(s, 'context'), 'wave-0').status = 'failed';
              },
            ]);
          }
        } finally {
          closeWorkspaceDatabaseWithAdmission(database);
          await bridge.close();
        }
      }, 'chain'),
    { timeout: 30_000 },
  );
}

for (const phase of ['before-init', 'before-start', 'before-resume', 'before-journal', 'before-settle']) {
  test(
    'session producer process termination retains UNKNOWN at ' + phase,
    async () => {
      const f = producerFixture(phase),
        marker = path.join(f.args.repositoryRoot, 'producer-barrier');
      const script = path.join(f.args.repositoryRoot, 'producer-child.mjs');
      const source = (relative: string) => JSON.stringify(new URL(relative, import.meta.url).href);
      writeFileSync(
        script,
        `
      import {writeFileSync} from 'node:fs';
      import {LibSQLStore} from ${JSON.stringify(new URL('../../node_modules/@mastra/libsql/dist/index.js', import.meta.url).href)};
      import {HostStateStore} from ${source('../../src/host-state.ts')};
      import {loadRuntimeConfig} from ${source('../../src/config/runtime-config.ts')};
      import {canonicalJsonDigest} from ${source('../../src/contracts/public-ingress.ts')};
      import {openConfiguredMastraSessionLedger, MastraSessionLedger} from ${source('../../src/orchestration/persistent-session-handoff.ts')};
      import {MastraSessionBridge} from ${source('../../src/orchestration/mastra-session-bridge.ts')};
      const args = ${JSON.stringify({ ...f.input, workspaceId: f.args.workspaceId })};
      args.config = loadRuntimeConfig(args.repositoryRoot);
      args.ledger = openConfiguredMastraSessionLedger(args.repositoryRoot);
      const pause = () => {writeFileSync(${JSON.stringify(marker)}, 'actual protected producer reached'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);};
      const phase = ${JSON.stringify(phase)};
      if (phase === 'before-init') LibSQLStore.prototype.init = async function() {pause();};
      const bridge = await MastraSessionBridge.open(args);
      if (phase === 'before-start' || phase === 'before-resume') {
        const actual = HostStateStore.prototype.assertSessionProducerCurrent;
        HostStateStore.prototype.assertSessionProducerCurrent = function(handle) {
          actual.call(this, handle);
          const count = args.ledger.sessionProducerBinding().database.query("SELECT COUNT(*) AS count FROM agent_host_governance WHERE store_id='vida-session-producers' AND kind='operation'").get().count;
          if (count === (phase === 'before-start' ? 2 : 3)) pause();
        };
      }
      if (phase === 'before-journal') MastraSessionLedger.prototype.syncFromSessionProducer = function() {pause();};
      if (phase === 'before-settle') HostStateStore.prototype.settleSessionProducer = function() {pause();};
      const engine = await bridge.start();
      if (phase === 'before-resume') {
        let journal = args.ledger.resume('producer', 1);
        if (!journal) throw new Error('Child producer journal is missing before resume');
        journal = args.ledger.issueWave('producer', 1, journal.version);
        for (const item of journal.state.items) {
          const summary = 'Actual child fixture observation';
          journal = args.ledger.report('producer', 1, journal.version, {schema: 'VidaSessionObservation/v1', action_id: item.request.action_id,
            issue_id: item.issue_id, agent_id: 'child', tool_call_ref: 'local:producer/child', status: 'reported_complete', summary,
            output_digest: canonicalJsonDigest(summary), evidence_refs: ['local://fixture/child']});
        }
        await bridge.resume(engine.step_id, journal.state.items.map(item => item.observation));
      }
      throw new Error('Producer did not reach its actual barrier');
    `,
      );
      const child = spawn(process.execPath, ['--no-env-file', '--no-install', script], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '',
        stderr = '',
        terminal = false,
        exitStatus: { code: number | null; signal: NodeJS.Signals | null } | null = null;
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
        child.once('error', reject);
        child.once('exit', (code, signal) => {
          terminal = true;
          const status = { code, signal };
          exitStatus = status;
          resolve(status);
        });
      });
      let caughtOutcome: unknown;
      let caughtFailure = false;
      try {
        const startedAt = Date.now(),
          deadline = startedAt + 12_000;
        while (!existsSync(marker) && !terminal && Date.now() < deadline)
          await new Promise<void>((resolve) => setTimeout(resolve, 25));
        if (!existsSync(marker))
          throw new Error(
            'Session producer child missed its barrier before the 12s deadline: ' +
              JSON.stringify({
                elapsed_ms: Date.now() - startedAt,
                child_exit: exitStatus,
                still_running: !terminal,
                stdout_tail: stdout.slice(-4000),
                stderr_tail: stderr.slice(-4000),
              }),
          );
        const retained = f.rows();
        expect(parseJsonRecord(retained.at(-1)?.payload ?? '').status).toBe('commit_unknown');
        await Promise.resolve(
          expect(MastraSessionBridge.open(f.args)).rejects.toThrow(/producer is pending or unknown/),
        );
        const journal = f.ledger.resume('producer', 1);
        if (phase === 'before-init' || phase === 'before-start' || phase === 'before-journal')
          expect(journal).toBeNull();
        else expect(journal).not.toBeNull();
        if (journal?.state.step_id)
          expect(() => f.ledger.issueWave('producer', 1, journal.version)).toThrow(/producer is pending or unknown/);
        const bound = f.ledger.sessionProducerBinding();
        const maintenance = new HostStateStore(
          bound.database,
          f.args.workspaceId,
          undefined,
          undefined,
          undefined,
          maintenanceVerifier,
          f.args.repositoryRoot,
        );
        expect(() => maintenance.acquireMaintenanceFence(maintenanceBinding())).toThrow(
          /producer is pending or unknown/,
        );
        expect(f.rows()).toEqual(retained);
        child.kill();
        await exited;
        expect(terminal).toBe(true);
        const restarted = openConfiguredMastraSessionLedger(f.args.repositoryRoot);
        handles.push(restarted.sessionProducerBinding().database);
        await Promise.resolve(
          expect(MastraSessionBridge.open({ ...f.args, ledger: restarted })).rejects.toThrow(
            /producer is pending or unknown/,
          ),
        );
        expect(f.rows()).toEqual(retained);
        if (phase === 'before-journal') {
          expect(existsSync(f.enginePath)).toBe(true);
          expect(restarted.resume('producer', 1)).toBeNull();
        }
        if (phase === 'before-settle') expect(requiredSessionJournal(restarted).state.step_id).toBe('wave-0');
        expect(() =>
          restarted.hostState.assertSessionProducerCurrent({
            operation: validateHostOperationReservation(parseJsonRecord(retained.at(-1)?.payload ?? '')),
          }),
        ).toThrow(/foreign/);
      } catch (error) {
        caughtFailure = true;
        caughtOutcome = error;
      } finally {
        if (!terminal) {
          child.kill();
          await exited;
        }
        if (!terminal) {
          producerRoots.splice(producerRoots.indexOf(f.args.repositoryRoot), 1);
        }
      }
      if (!terminal) throw new Error('Producer child outcome unknown; fixture retained: ' + f.args.repositoryRoot);
      if (caughtFailure) throw caughtOutcome;
    },
    { timeout: 30_000 },
  );
}

test('ten quiescent pre-delivery same-thread follow-ups release only their own claims', () => {
  commitHostState(fixture());
  let currentId = 'work';
  for (let index = 1; index <= 10; index++) {
    const currentIdentity = { ...identity, work_id: currentId };
    const prior = readPresentSnapshot(store, currentIdentity);
    const request: Parameters<typeof suspendLocalWork>[0] = {
      store,
      identity: currentIdentity,
      journal: quiescentJournal(currentId, `run-${currentId}`),
      expectedWork: prior.workVersion,
      expectedLedger: prior.ledgerVersion,
      nativeSessionHandle: 'thread',
      userRequestPointer: `user-request:thread/${index}`,
      requestIntent: 'next_work',
      documentationContext: {
        repository_root: root,
        repository_id: identity.repository_id,
        project_id: firstOf(identity.project_ids, 'project identity'),
        work_id: currentId,
      },
    };
    const suspended = suspendPresent(request);
    expect(suspended.work.lifecycle.phase).toBe('INTAKE');
    expect(suspended.work.execution.status).toBe('suspended');
    expect(suspended.work.lease).toBeNull();
    expect(suspendLocalWork(request).workVersion).toEqual(suspended.workVersion);
    const nextId = `work-${index}`;
    const admission = includeExistingLedger(fixture(nextId), suspended.ledger);
    admission.expectedLedger = suspended.ledgerVersion;
    commitHostState(admission);
    currentId = nextId;
  }
  const latest = readPresentSnapshot(store, { ...identity, work_id: currentId });
  expect(latest.ledger.operations.filter((entry) => entry.kind === 'release')).toHaveLength(10);
  expect(latest.ledger.claims.filter((entry) => entry.status === 'active')).toHaveLength(1);
}, 60_000);

test('same-thread suspension denies foreign owner and uncertain native issue', () => {
  const initial = commitHostState(fixture());
  const request: Parameters<typeof suspendLocalWork>[0] = {
    store,
    identity: { ...identity },
    journal: quiescentJournal(),
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'other-thread',
    userRequestPointer: 'user-request:foreign',
    requestIntent: 'next_work',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: firstOf(identity.project_ids, 'project identity'),
      work_id: identity.work_id,
    },
  };
  expect(() => suspendLocalWork(request)).toThrow(/same-thread lease/);
  const uncertain = quiescentJournal();
  uncertain.resume_status = 'issued_outcome_uncertain';
  setFixtureField(uncertain.state, 'items', [{ issue_id: 'issued', observation: null }]);
  uncertain.version.digest = canonicalJsonDigest(uncertain.state);
  expect(() => suspendLocalWork({ ...request, nativeSessionHandle: 'thread', journal: uncertain })).toThrow(
    /issued|uncertain|quiescent/,
  );
  expect(readPresentSnapshot(store, identity).workVersion).toEqual(initial.workVersion);
});

test('host database opener pins recoverable SQLite settings and preserves state across reopen', () => {
  expect(path.isAbsolute(databasePath)).toBe(true);
  expect(database.query<SqliteJournalModeRow, []>('PRAGMA journal_mode').get()?.journal_mode).toBe('wal');
  expect(database.query<SqliteSynchronousRow, []>('PRAGMA synchronous').get()?.synchronous).toBe(2);
  expect(database.query<SqliteBusyTimeoutRow, []>('PRAGMA busy_timeout').get()?.timeout).toBe(1000);
  const saved = commitHostState(fixture());
  reopenStore();
  expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  const namedMemory = openHostStateDatabase(root, ':memory:', workspace);
  admittedHostDatabases.add(namedMemory);
  handles.push(namedMemory);
  expect(namedMemory.filename).toBe(path.join(root, ':memory:'));
  expect(existsSync(path.join(root, ':memory:'))).toBe(true);
  expect(() => openHostStateDatabase(root, '../relative.sqlite', workspace)).toThrow(/relative|path/i);
});

test.each([
  { label: 'adjacent large inode is rejected', afterInode: 9_007_199_254_740_993n, rejects: true },
  { label: 'unchanged large inode is accepted', afterInode: 9_007_199_254_740_992n, rejects: false },
])('Host database opener identity: $label', async ({ afterInode, rejects }) => {
  const relative = 'opener-identity.db';
  const target = path.join(root, relative);
  let directIdentityReads = 0;
  await mock.module('node:fs', () => ({
    ...originalFsExports,
    lstatSync: ((...args: Parameters<typeof nodeFs.lstatSync>) => {
      const actual = Reflect.apply(originalFsExports.lstatSync, originalFsExports, args);
      const bigint = args[1] !== undefined && typeof args[1] === 'object' && Reflect.get(args[1], 'bigint') === true;
      if (actual === undefined || args[0] !== target || !bigint) return actual;
      // The opener's two bigint identity observations are the only such reads for
      // this unique target. Match the observable call contract, not Source lines.
      directIdentityReads += 1;
      const inode = directIdentityReads === 1 ? 9_007_199_254_740_992n : afterInode;
      const exact = Object.create(actual) as typeof actual;
      Reflect.set(exact, 'dev', 17n);
      Reflect.set(exact, 'ino', inode);
      return exact;
    }) as typeof nodeFs.lstatSync,
  }));
  let opened: Database | undefined;
  let failure: unknown;
  try {
    try {
      const freshHostState = (await import(
        `../../src/host-state.ts?identity=${randomUUID()}`
      )) as typeof import('../../src/host-state.ts');
      opened = freshHostState.openHostStateDatabase(root, relative, workspace);
    } catch (error) {
      failure = error;
    }
    if (opened) {
      admittedHostDatabases.add(opened);
      handles.push(opened);
    }
    expect(directIdentityReads).toBe(2);
    if (rejects) {
      expect(opened).toBeUndefined();
      expect(String(failure)).toContain('Host database identity changed during initialization');
    } else {
      expect(failure).toBeUndefined();
      if (!opened) throw new Error('Expected unchanged Host database identity to open');
      expect(opened.filename).toBe(target);
      expect(opened.query<{ value: number }, []>('SELECT 1 AS value').get()).toEqual({ value: 1 });
    }
  } finally {
    try {
      await mock.module('node:fs', () => originalFsExports);
    } finally {
      mock.restore();
    }
  }
});

test('HostState database guard distinguishes adjacent synthetic large inode identities', () => {
  const originalLstat = nodeFs.lstatSync;
  let inode = 9_007_199_254_740_992n;
  const observed = spyOn(nodeFs, 'lstatSync').mockImplementation(((...args: Parameters<typeof nodeFs.lstatSync>) => {
    const actual = Reflect.apply(originalLstat, nodeFs, args);
    if (actual === undefined || args[0] !== databasePath) return actual;
    // Keep this real fixture's file shape and synthesize adjacent inode values only at lstat.
    const exact = Object.create(actual) as typeof actual;
    const bigint = args[1] !== undefined && typeof args[1] === 'object' && Reflect.get(args[1], 'bigint') === true;
    Reflect.set(exact, 'dev', bigint ? 17n : 17);
    Reflect.set(exact, 'ino', bigint ? inode : Number(inode));
    Reflect.set(exact, 'nlink', bigint ? BigInt(actual.nlink) : Number(actual.nlink));
    return exact;
  }) as typeof nodeFs.lstatSync);
  try {
    const guarded = new HostStateStore(database, workspace, undefined, undefined, undefined, undefined, root);
    expect(() => guarded.assertWorkspaceDatabasePath(root, 'authority.db')).not.toThrow();

    inode += 1n;
    expect(() => guarded.assertWorkspaceDatabasePath(root, 'authority.db')).toThrow(
      /configured Host database was substituted/u,
    );
  } finally {
    observed.mockRestore();
  }
});

test.each([
  { label: 'adjacent large inode is rejected', observedInode: 9_007_199_254_740_993n, rejects: true },
  { label: 'unchanged large inode is accepted', observedInode: 9_007_199_254_740_992n, rejects: false },
])('Mastra engine guard: $label', async ({ observedInode, rejects }) => {
  await withProducerFixtureCustody(async (f) => {
    let bridgeIdentityReads = 0;
    const originalLstat = nodeFs.lstatSync;
    const observed = spyOn(nodeFs, 'lstatSync').mockImplementation(((...args: Parameters<typeof nodeFs.lstatSync>) => {
      const actual = Reflect.apply(originalLstat, nodeFs, args);
      if (actual === undefined || args[0] !== f.enginePath) return actual;
      // Keep the native file shape and link count; synthesize only the inode at this lstat boundary.
      // Stack discrimination changes only workflowDatabaseIdentity's two reads. Bun client identity
      // reads see stable A, so the control reaches the intended late initialization guard.
      const bridgeIdentityCall = new Error().stack?.includes('workflowDatabaseIdentity') ?? false;
      const inode = bridgeIdentityCall && ++bridgeIdentityReads === 2 ? observedInode : 9_007_199_254_740_992n;
      const exact = Object.create(actual) as typeof actual;
      const bigint = args[1] !== undefined && typeof args[1] === 'object' && Reflect.get(args[1], 'bigint') === true;
      Reflect.set(exact, 'dev', bigint ? 17n : 17);
      Reflect.set(exact, 'ino', bigint ? inode : Number(inode));
      Reflect.set(exact, 'nlink', bigint ? BigInt(actual.nlink) : Number(actual.nlink));
      return exact;
    }) as typeof nodeFs.lstatSync);
    let bridge: MastraSessionBridge | undefined;
    let openError: unknown;
    try {
      bridge = await MastraSessionBridge.open(f.args).then(
        (opened) => opened,
        (error: unknown) => {
          openError = error;
          return undefined;
        },
      );
      expect(bridgeIdentityReads).toBeGreaterThanOrEqual(2);
      if (rejects) {
        expect(bridge).toBeUndefined();
        expect(openError).toBeInstanceOf(Error);
        expect(String(openError)).toContain('Mastra database was substituted during initialization');
        const rows = f.rows();
        expect(rows).toHaveLength(1);
        expect(rows[0]?.revision).toBe(2);
        expect(parseJsonRecord(rows[0]?.payload ?? '').status).toBe('commit_unknown');
        failedProducerRoots.add(f.args.repositoryRoot);
      } else {
        expect(openError).toBeUndefined();
        if (!bridge) throw new Error('Expected unchanged workflow storage identity to open');
        await bridge.close();
        bridge = undefined;
      }
    } finally {
      if (bridge) await bridge.close();
      observed.mockRestore();
    }
  });
});

const operationKey = '6'.repeat(64);
const requestDigest = '7'.repeat(64);
const resultDigest = '8'.repeat(64);
const approvalBinding = () => ({
  stage_id: 'review',
  approval_id: 'approval-1',
  operation_hash: operationKey,
  tenant: 'tenant',
  project: 'project',
});
const governanceRows = (): GovernanceSqlRow[] =>
  database.query<GovernanceSqlRow, []>('SELECT * FROM agent_host_governance ORDER BY store_id,kind,record_key').all();
function protectedInvocation(initial: PresentHostSnapshot) {
  return workflowAssignmentFixture(initial);
}
function workflowAssignmentFixture(initial: PresentHostSnapshot): HostWorkflowAssignment {
  const config = sourceLeaseConfig;
  const workflow = requiredRuntimeWorkflow(config, initial.work.binding.workflow_id);
  const stage = firstOf(workflow.stages, 'workflow assignment stage');
  const assignment = firstOf(stage.assignments, 'workflow assignment');
  const operation = requiredValue(
    config.operations.registry.find((entry) => entry.id === 'executeConfiguredWorkflow'),
    'configured workflow execution operation',
  );
  const profile = requiredValue(config.agents.profiles[assignment.profile], 'workflow assignment profile');
  const roleInstruction = requiredValue(config.agents.role_instructions[assignment.role], 'workflow role instruction');
  const projectContext = loadProjectSetContext(root, config, identity.repository_id, identity.project_ids);
  const ticket = firstTicket(initial.ledger);
  const authentication: HostWorkflowAssignment['authentication'] = {
    schema: 'TrustedHostAuthentication/v1',
    repositoryRoot: root,
    repositoryId: identity.repository_id,
    projectIds: identity.project_ids,
    integrationsDigest: identity.integrations_digest,
    principal: 'fixture:host',
    configRevision: config.config_revision,
    permittedOperations: ['workflow'],
  };
  const workItem: HostWorkflowAssignment['workItem'] = {
    schema: 'WorkItem/v1',
    id: initial.work.binding.provider_work_item_id,
    provider: 'azure',
    provider_type: 'Bug',
    canonical_kind: 'bug',
    intent: 'bug_fix',
    project_id: firstOf(initial.work.binding.project_ids, 'workflow assignment project'),
    title: 'Host assignment fixture',
    description: '',
    labels: [],
    risk_flags: [],
  };
  // This is host component setup: the persisted binding supplies identity, workflow and project fields,
  // while title and description remain synthetic. It does not prove kernel work-item issuance or match
  // the fixture's deliberately fixed work_item_digest.
  return {
    operation,
    authentication,
    configDigest: initial.work.binding.config_digest,
    project: projectContext,
    teamId: initial.work.binding.team_id,
    workflowId: initial.work.binding.workflow_id,
    stage,
    assignment,
    assignmentIndex: 0,
    profile,
    roleInstruction,
    roleInstructionDigest: canonicalJsonDigest(roleInstruction),
    riskFlags: assignment.risk_flags ?? [],
    workItem,
    workContext: {
      schema: 'WorkExecutionContext/v1',
      binding: initial.work.binding,
      permit: {
        context_digest: canonicalJsonDigest(initial.work.binding),
        checkpoint_revision: initial.workVersion.revision,
        checkpoint_digest: initial.workVersion.digest,
        runtime_current_revision: 1,
        stage_id: stage.id,
        assignment_index: 0,
        dispatch_authorized: true,
        lease: {
          ...requiredLease(initial.work),
          ledger_revision: initial.ledgerVersion.revision,
          expires_at: requiredValue(ticket.expires_at, 'workflow ticket expiry'),
          active_resources: [...ticket.active_resources],
          blocked_resources: [...ticket.blocked_resources],
        },
      },
    },
    input: {},
  };
}
function verifiedWorkflowApproval(
  request: Parameters<WorkflowAttemptApprovalVerifier['verify']>[0],
  approvalId = 'approval-protected-1',
) {
  const unsigned: Parameters<typeof computeEdictumWorkflowApprovalEvidenceDigest>[0] = {
    schema: 'EdictumWorkflowApproval/v1',
    stage_id: request.stage_id,
    approval_id: approvalId,
    approver: 'fixture:approver',
    operation_hash: request.operation_hash,
    tenant: request.identity.repository_id,
    project: firstOf(request.identity.project_ids, 'approval project identity'),
    approved_at: new Date(Date.now() - 1000).toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
}
function reopenStore() {
  closeWorkspaceDatabaseWithAdmission(database);
  handles.pop();
  database = openHostStateDatabase(root, 'authority.db', workspace);
  admittedHostDatabases.add(database);
  handles.push(database);
  store = new HostStateStore(database, workspace);
}

const reconciliationBinding = (saved: { workVersion: StateVersion }): ReconciliationGateBinding => ({
  schema: 'ReconciliationGateBinding/v1',
  operation_id: 'reconcile-work',
  manifest_digest: '2'.repeat(64),
  request_digest: '3'.repeat(64),
  bindings_digest: '4'.repeat(64),
  closure_digest: '5'.repeat(64),
  work: [{ identity, version: saved.workVersion }],
});

const maintenanceBinding = (): MaintenanceFenceBinding => ({
  schema: 'MaintenanceFenceBinding/v1',
  project_ids: ['project'],
  operation_id: 'reconcile-work',
  manifest_digest: '2'.repeat(64),
  request_digest: '3'.repeat(64),
  bindings_digest: '4'.repeat(64),
  closure_digest: '5'.repeat(64),
  bundle_digest: '4'.repeat(64),
});
const maintenanceVerifier: MaintenanceReleaseVerifier = {
  principal: 'fixture:maintenance-host',
  projectIds: ['project'],
  verify: (fence) => ({
    schema: 'MaintenanceReleaseAuthorization/v1',
    principal: 'fixture:maintenance-host',
    fence_digest: canonicalJsonDigest(fence),
    closure_digest: fence.binding.closure_digest,
    bundle_digest: fence.binding.bundle_digest,
  }),
};
const maintenanceStore = (handle = database) =>
  new HostStateStore(handle, workspace, undefined, undefined, undefined, maintenanceVerifier);
const workingStore = (handle = database) =>
  new HostStateStore(handle, workspace, undefined, undefined, undefined, maintenanceVerifier, root);

test('TaskSource projection repair initializes absent storage under its exact held fence', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const checked = maintenanceStore();
  expect(
    database.query("SELECT name FROM sqlite_master WHERE name='agent_host_task_source_binding_operation'").get(),
  ).toBeNull();
  const receipt = checked.acquireMaintenanceFence(maintenanceBinding());
  const before = database.query('SELECT * FROM agent_host_state ORDER BY workspace_id,kind,id').all();
  const repaired = checked.repairTaskSourceBindingWorkProjection(receipt);
  expect(repaired).toMatchObject({
    schema: 'TaskSourceBindingWorkProjectionRepair/v1',
    workspace_id: workspace,
    operation_id: receipt.fence.binding.operation_id,
    maintenance_generation: receipt.fence.generation,
    maintenance_revision: receipt.fence.revision,
  });
  expect(database.query('SELECT * FROM agent_host_task_source_binding_operation').all()).toEqual([]);
  expect(database.query('SELECT * FROM agent_host_state ORDER BY workspace_id,kind,id').all()).toEqual(before);
  expect(checked.repairTaskSourceBindingWorkProjection(receipt)).toEqual(repaired);
  expect(database.query('SELECT payload,digest FROM agent_host_task_source_projection_repair').all()).toEqual([
    { payload: canonicalJson(repaired), digest: canonicalJsonDigest(repaired) },
  ]);
  await checked.releaseMaintenanceFence(receipt);
  expect(checked.readHostStateSnapshot(identity).work).toBeNull();
  preserveHostFixtureRoot = false;
});

test('TaskSource projection repair rolls back native faults and retries only its exact held fence and rows', async () => {
  const deadline = performance.now() + 5_000;
  preserveHostFixtureRoot = 'case failed or timed out';
  const checked = maintenanceStore();
  // Storage-only legacy fixture: this row grants no admission and executes no Git action.
  const request: TaskSourceBindingRequest = {
    schema: 'TaskSourceBindingRequest/v1',
    operation: 'propose-create',
    operation_id: 'legacy-projection-operation',
    request_id: 'legacy-projection-request',
    branch_ref: 'refs/heads/codex/projection',
    expected_host: {
      work: { revision: 1, digest: '1'.repeat(64) },
      ledger: { revision: 1, digest: '2'.repeat(64) },
      journal: { attempt: 1, version: { revision: 1, digest: '3'.repeat(64) } },
      maintenance_generation: 0,
    },
    work_id: 'legacy-projected-work',
    attempt: 1,
    thread_id: 'legacy-projection-owner',
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    canonical_host_root: root,
    source_root: path.join(root, 'task-source'),
    config_digest: '4'.repeat(64),
    project_context_digest: '5'.repeat(64),
  };
  const operation = {
    schema: 'TaskSourceBindingOperation/v1',
    status: 'prepared',
    operation_id: request.operation_id,
    request_id: request.request_id,
    revision: 1,
    request_digest: canonicalJsonDigest(request),
    request,
    authority: { source_authorization_sha256: '6'.repeat(64), source_scope_digest: '7'.repeat(64) },
    created_at: new Date().toISOString(),
  };
  database.exec(
    'CREATE TABLE agent_host_task_source_binding_operation (workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,request_id TEXT NOT NULL,request_digest TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id),UNIQUE(workspace_id,request_id))',
  );
  database
    .query('INSERT INTO agent_host_task_source_binding_operation VALUES(?,?,?,?,?,?,?)')
    .run(
      workspace,
      request.operation_id,
      request.request_id,
      operation.request_digest,
      operation.revision,
      canonicalJson(operation),
      canonicalJsonDigest(operation),
    );
  const before = database
    .query<Record<string, SQLQueryBindings>, []>('SELECT * FROM agent_host_task_source_binding_operation')
    .all();
  expect(before).toHaveLength(1);
  const receipt = checked.acquireMaintenanceFence(maintenanceBinding());
  const hostRows = () => database.query('SELECT * FROM agent_host_state ORDER BY workspace_id,kind,id').all();
  const journalStorage = () =>
    database.query("SELECT name,sql FROM sqlite_master WHERE name='agent_host_mastra_session_ledger'").all();
  const hostBefore = hostRows();
  const journalBefore = journalStorage();
  expect(journalBefore).toEqual([]);
  expect(() => checked.readHostStateSnapshot(identity)).toThrow('working access blocked by maintenance fence');
  expect(() => checked.readWorkSessionJournal(identity)).toThrow('working access blocked by maintenance fence');
  const columns = () =>
    database
      .query<{ name: string }, []>('PRAGMA table_info(agent_host_task_source_binding_operation)')
      .all()
      .map((column) => column.name);
  const assertRolledBack = () => {
    expect(database.inTransaction).toBe(false);
    expect(columns()).not.toContain('work_id');
    expect(database.query('SELECT * FROM agent_host_task_source_binding_operation').all()).toEqual(before);
    expect(
      database.query("SELECT name FROM sqlite_master WHERE name='agent_host_task_source_projection_repair'").get(),
    ).toBeNull();
    expect(hostRows()).toEqual(hostBefore);
    expect(journalStorage()).toEqual(journalBefore);
    expect(checked.readMaintenanceFence()).toEqual(receipt.fence);
  };
  expect(() => checked.repairTaskSourceBindingWorkProjection({ ...receipt, token: randomUUID() })).toThrow(
    'maintenance fence receipt stale or forged',
  );
  expect(() => database.transaction(() => checked.repairTaskSourceBindingWorkProjection(receipt)).deferred()).toThrow(
    'nested task source projection repair forbidden',
  );
  assertRolledBack();
  database.exec('CREATE TABLE agent_host_task_source_binding_action (workspace_id TEXT,operation_id TEXT)');
  database.query('INSERT INTO agent_host_task_source_binding_action VALUES(?,?)').run(workspace, 'orphan');
  expect(() => checked.repairTaskSourceBindingWorkProjection(receipt)).toThrow(
    'orphan task source action prevents projection repair',
  );
  assertRolledBack();
  database.exec('DROP TABLE agent_host_task_source_binding_action');
  database.exec('CREATE TABLE agent_host_task_source_projection_repair (workspace_id TEXT)');
  const malformedSchema = database.query('PRAGMA table_info(agent_host_task_source_projection_repair)').all();
  expect(() => checked.repairTaskSourceBindingWorkProjection(receipt)).toThrow(
    'task source projection repair table schema differs',
  );
  expect(columns()).not.toContain('work_id');
  expect(database.query('SELECT * FROM agent_host_task_source_binding_operation').all()).toEqual(before);
  expect(database.query('PRAGMA table_info(agent_host_task_source_projection_repair)').all()).toEqual(malformedSchema);
  expect(hostRows()).toEqual(hostBefore);
  expect(journalStorage()).toEqual(journalBefore);
  expect(checked.readMaintenanceFence()).toEqual(receipt.fence);
  database.exec('DROP TABLE agent_host_task_source_projection_repair');
  database.exec(
    "CREATE TEMP TRIGGER projection_fault BEFORE UPDATE ON agent_host_task_source_binding_operation BEGIN SELECT RAISE(ABORT,'controlled projection backfill fault'); END",
  );
  expect(() => checked.repairTaskSourceBindingWorkProjection(receipt)).toThrow('controlled projection backfill fault');
  assertRolledBack();
  database.exec('DROP TRIGGER projection_fault');
  if (performance.now() >= deadline) throw new Error('TaskSource projection denials exhausted the case deadline.');
  const repaired = checked.repairTaskSourceBindingWorkProjection(receipt);
  if (typeof repaired.identity_digest !== 'string' || typeof repaired.rows_digest !== 'string')
    throw new Error('Expected projection repair identity and rows digests.');
  expect(repaired).toMatchObject({
    schema: 'TaskSourceBindingWorkProjectionRepair/v1',
    workspace_id: workspace,
    operation_id: receipt.fence.binding.operation_id,
    maintenance_generation: receipt.fence.generation,
    maintenance_revision: receipt.fence.revision,
  });
  expect(columns()).toContain('work_id');
  expect(database.query('SELECT * FROM agent_host_task_source_binding_operation').all()).toEqual(
    before.map((row) => ({ ...row, work_id: request.work_id })),
  );
  const repairRow = requiredValue(
    database
      .query<
        {
          maintenance_generation: number;
          maintenance_revision: number;
          identity_digest: string;
          rows_digest: string;
          payload: string;
          digest: string;
        },
        [string, string]
      >(
        'SELECT maintenance_generation,maintenance_revision,identity_digest,rows_digest,payload,digest FROM agent_host_task_source_projection_repair WHERE workspace_id=? AND operation_id=?',
      )
      .get(workspace, receipt.fence.binding.operation_id),
    'projection repair receipt',
  );
  expect(repairRow).toEqual({
    maintenance_generation: receipt.fence.generation,
    maintenance_revision: receipt.fence.revision,
    identity_digest: repaired.identity_digest,
    rows_digest: repaired.rows_digest,
    payload: canonicalJson(repaired),
    digest: canonicalJsonDigest(repaired),
  });
  expect(checked.repairTaskSourceBindingWorkProjection(receipt)).toEqual(repaired);
  const corruptDigest = '0'.repeat(64);
  const updateDigest = database.query(
    'UPDATE agent_host_task_source_projection_repair SET digest=? WHERE workspace_id=? AND operation_id=? AND digest=?',
  );
  expect(updateDigest.run(corruptDigest, workspace, receipt.fence.binding.operation_id, repairRow.digest).changes).toBe(
    1,
  );
  try {
    expect(() => checked.repairTaskSourceBindingWorkProjection(receipt)).toThrow(
      'task source projection repair retry differs or its afterimage changed',
    );
    expect(hostRows()).toEqual(hostBefore);
    expect(journalStorage()).toEqual(journalBefore);
    expect(checked.readMaintenanceFence()).toEqual(receipt.fence);
  } finally {
    expect(
      updateDigest.run(repairRow.digest, workspace, receipt.fence.binding.operation_id, corruptDigest).changes,
    ).toBe(1);
  }
  expect(checked.repairTaskSourceBindingWorkProjection(receipt)).toEqual(repaired);
  expect(hostRows()).toEqual(hostBefore);
  expect(journalStorage()).toEqual(journalBefore);
  const released = await checked.releaseMaintenanceFence(receipt);
  expect(released.status).toBe('released');
  expect(checked.readHostStateSnapshot(identity).work).toBeNull();
  expect(() => checked.readWorkSessionJournal(identity)).toThrow('journal work is unavailable');
  expect(() => checked.repairTaskSourceBindingWorkProjection(receipt)).toThrow(
    'maintenance fence receipt stale or forged',
  );
  expect(checked.readMaintenanceFence()).toEqual(released);
  if (performance.now() >= deadline) throw new Error('TaskSource projection fixture exhausted its case deadline.');
  preserveHostFixtureRoot = false;
});

test.each([
  'baseline-restore',
  'callback-retry',
  'inflight-denial',
  'absent-workflow',
  'close-error',
  'close-undefined',
  'close-return',
  'release-missing',
  'release-digest',
  'release-binding',
  'release-status',
] as const)(
  'consumer migration wrapper %s preserves private workflow bytes and exact operation identity',
  async (mode) => {
    const deadline = performance.now() + 5_000;
    let rootOwned: string | undefined;
    let completed = false;
    let expectedInflight = false;
    await withInitialSourceCleanup(
      async () => {
        const root = await makeFreshRepository('vida-migration-wrapper-', {
          includeLocalInstructions: false,
          onRoot: (created) => {
            rootOwned = created;
            console.info('Consumer migration wrapper fixture root: ' + created);
          },
        });
        const config = loadRuntimeConfig(root);
        const workflowPath = sessionBridgeDatabasePath(root, config);
        if (mode !== 'absent-workflow') {
          mkdirSync(path.dirname(workflowPath), { recursive: true });
          // Controlled terminal JSON rows exercise the wrapper's classifier, not a real engine run.
          const workflow = new Database(workflowPath, { strict: true });
          try {
            workflow.exec('CREATE TABLE mastra_workflow_snapshot (snapshot TEXT NOT NULL)');
            const insert = workflow.query('INSERT INTO mastra_workflow_snapshot VALUES (?)');
            for (const status of mode === 'inflight-denial'
              ? ['running']
              : ['success', 'failed', 'suspended', 'canceled'])
              insert.run(JSON.stringify({ status, fixture_only: 'terminal-workflow-classification' }));
          } finally {
            workflow.close(true);
          }
        }
        const workflowBefore = mode === 'absent-workflow' ? null : readFileSync(workflowPath);
        const input = {
          repositoryRoot: root,
          operationId: 'fixture-native-migration',
          actor: 'fixture:host-migration',
        };
        let calls = 0;
        for (const denied of [{ operationId: 'invalid operation' }, { actor: '  ' }, { actor: 'fixture\nactor' }]) {
          const rejected = await rejectionReason(
            runConsumerMigrationState({ ...input, ...denied, mode: 'baseline' }, () => {
              calls++;
              throw new Error('Invalid attribution reached the filesystem callback');
            }),
          );
          expect(() => {
            throw rejected;
          }).toThrow('consumer migration attribution invalid');
          expect(calls).toBe(0);
          expect(existsSync(path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'))).toBe(false);
        }
        if (mode === 'absent-workflow') {
          const failure = new Error('fixture absent-workflow callback failure');
          const rejected = await rejectionReason(
            runConsumerMigrationState({ ...input, mode: 'baseline' }, () => {
              calls++;
              throw failure;
            }),
          );
          expect(rejected).toBe(failure);
          expect(calls).toBe(1);
          for (const suffix of ['', '-wal', '-shm']) expect(existsSync(workflowPath + suffix)).toBe(false);
        }
        if (mode === 'inflight-denial') {
          expectedInflight = true;
          const rejected = await rejectionReason(
            runConsumerMigrationState({ ...input, mode: 'baseline' }, () => {
              calls++;
              throw new Error('Inflight workflow reached the filesystem callback');
            }),
          );
          expect(() => {
            throw rejected;
          }).toThrow('consumer workflow run remains unknown or inflight');
          expect(calls).toBe(0);
          expect(readFileSync(workflowPath)).toEqual(requiredValue(workflowBefore, 'workflow byte preimage'));
          if (performance.now() >= deadline) throw new Error('Migration inflight denial exhausted its deadline');
          completed = true;
          return;
        }
        if (mode === 'callback-retry') {
          const failure = new Error('fixture native migration callback failure');
          const rejected = await rejectionReason(
            runConsumerMigrationState({ ...input, mode: 'baseline' }, () => {
              calls++;
              throw failure;
            }),
          );
          expect(rejected).toBe(failure);
          expect(calls).toBe(1);
          expect(readFileSync(workflowPath)).toEqual(requiredValue(workflowBefore, 'workflow byte preimage'));
        }
        if (mode === 'close-error' || mode === 'close-undefined' || mode === 'close-return') {
          const primary = mode === 'close-error' ? new Error('fixture migration body failure') : undefined;
          const closeFailure = new Error('fixture migration native close failure');
          const nativeClose: unknown = Reflect.get(Database.prototype, 'close');
          if (typeof nativeClose !== 'function') throw new Error('Native SQLite close method is missing.');
          const target = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
          const tripletBefore = ['', '-wal', '-shm'].map((suffix) =>
            existsSync(workflowPath + suffix) ? readFileSync(workflowPath + suffix) : null,
          );
          let closeCalls = 0;
          const retainedHandles = new Set<Database>();
          let restore = () => {};
          let rejected: unknown;
          let probeFailure: { error: unknown } | undefined;
          try {
            rejected = await rejectionReason(
              runConsumerMigrationState({ ...input, mode: 'baseline' }, () => {
                calls++;
                const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (
                  this: Database,
                  ...args: Parameters<Database['close']>
                ) {
                  if (this.filename === target) {
                    retainedHandles.add(this);
                    closeCalls++;
                    throw closeFailure;
                  }
                  Reflect.apply(nativeClose, this, args);
                });
                restore = () => closeSpy.mockRestore();
                if (mode !== 'close-return') throw primary;
                return 'observed metadata callback';
              }),
            );
            expect(retainedHandles.size).toBe(1);
            const retained = firstOf([...retainedHandles], 'migration database retained for close retry');
            expect(retained.inTransaction).toBe(false);
            expect(
              retained
                .query('SELECT operation_id FROM agent_host_consumer_migration WHERE operation_id=?')
                .all(input.operationId),
            ).toEqual(mode === 'close-return' ? [{ operation_id: input.operationId }] : []);
          } catch (error) {
            probeFailure = { error };
            throw error;
          } finally {
            completeOwnedCleanup(
              [
                () => {
                  restore();
                },
                () => {
                  retryPendingWorkspaceDatabaseCloses();
                },
              ],
              probeFailure,
            );
          }
          expect(closeCalls).toBe(1);
          expect(calls).toBe(1);
          expect(rejected).toBeInstanceOf(AggregateError);
          if (!(rejected instanceof AggregateError)) throw new Error('Migration did not retain its close failure');
          if (mode === 'close-return') {
            expect(rejected.errors).toHaveLength(1);
            expect(rejected.errors[0]).toBe(closeFailure);
          } else {
            expect(rejected.errors).toHaveLength(2);
            expect(rejected.errors[0]).toBe(primary);
            const cleanup: unknown = rejected.errors[1];
            expect(cleanup).toBeInstanceOf(AggregateError);
            if (!(cleanup instanceof AggregateError)) throw new Error('Migration close failure is missing');
            expect(cleanup.errors).toHaveLength(1);
            expect(cleanup.errors[0]).toBe(closeFailure);
          }
          expect(
            ['', '-wal', '-shm'].map((suffix) =>
              existsSync(workflowPath + suffix) ? readFileSync(workflowPath + suffix) : null,
            ),
          ).toEqual(tripletBefore);
        }
        if (
          mode === 'release-missing' ||
          mode === 'release-digest' ||
          mode === 'release-binding' ||
          mode === 'release-status'
        ) {
          const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
          const target = path.join(root, config.control.work_root, 'session-handoff.v1.sqlite');
          const tripletBefore = ['', '-wal', '-shm'].map((suffix) =>
            existsSync(workflowPath + suffix) ? readFileSync(workflowPath + suffix) : null,
          );
          const nativeRelease: unknown = Reflect.get(HostStateStore.prototype, 'releaseMaintenanceFence');
          if (typeof nativeRelease !== 'function') throw new Error('Native maintenance release method is missing');
          let releaseCalls = 0;
          let releaseFailure: unknown;
          const releaseSpy = spyOn(HostStateStore.prototype, 'releaseMaintenanceFence').mockImplementation(
            async function (this: HostStateStore, receipt) {
              if (this.workspaceId !== workspaceId || receipt.fence.binding.operation_id !== input.operationId)
                return checkedMaintenanceFence(await Reflect.apply(nativeRelease, this, [receipt]));
              releaseCalls++;
              expect(releaseCalls).toBe(1);
              const held = this.readMaintenanceFence();
              expect(held?.status).toBe('held');
              // This peer is an isolated fault injector, not public SQL admission or accepted authority.
              const peer = new Database(target, { strict: true });
              let restoreRow = () => {};
              let faultFailure: { error: unknown } | undefined;
              try {
                const rows = peer.query<
                  { row_id: number; workspace_id: string; operation_id: string; payload: string; digest: string },
                  [string, string]
                >(
                  'SELECT rowid AS row_id,workspace_id,operation_id,payload,digest FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?',
                );
                const original = requiredValue(rows.get(workspaceId, input.operationId), 'committed migration row');
                const state = parseJsonRecord(original.payload);
                const changedPayload =
                  mode === 'release-digest'
                    ? original.payload + ' '
                    : mode === 'release-binding'
                      ? canonicalJson({
                          ...state,
                          binding: {
                            ...parseJsonRecord(canonicalJson(state.binding)),
                            request_digest: '0'.repeat(64),
                          },
                        })
                      : mode === 'release-status'
                        ? canonicalJson({ ...state, status: 'fixture-unaccepted' })
                        : original.payload;
                const changedDigest =
                  mode === 'release-binding' || mode === 'release-status'
                    ? createHash('sha256').update(changedPayload).digest('hex')
                    : original.digest;
                const changedKey = mode === 'release-missing' ? input.operationId + '-hidden' : input.operationId;
                const replace = peer.query(
                  'UPDATE agent_host_consumer_migration SET operation_id=?,payload=?,digest=? WHERE rowid=? AND workspace_id=? AND operation_id=? AND payload=? AND digest=?',
                );
                const changed = replace.run(
                  changedKey,
                  changedPayload,
                  changedDigest,
                  original.row_id,
                  workspaceId,
                  input.operationId,
                  original.payload,
                  original.digest,
                );
                if (changed.changes === 1)
                  restoreRow = () => {
                    expect(
                      replace.run(
                        original.operation_id,
                        original.payload,
                        original.digest,
                        original.row_id,
                        workspaceId,
                        changedKey,
                        changedPayload,
                        changedDigest,
                      ).changes,
                    ).toBe(1);
                    expect(rows.get(workspaceId, input.operationId)).toEqual(original);
                  };
                expect(changed.changes).toBe(1);
                expect(rows.get(workspaceId, input.operationId)).toEqual(
                  mode === 'release-missing' ? null : { ...original, payload: changedPayload, digest: changedDigest },
                );
                releaseFailure = await rejectionReason(Reflect.apply(nativeRelease, this, [receipt]));
                expect(() => {
                  throw releaseFailure;
                }).toThrow('trusted maintenance closure verification failed');
                expect(this.readMaintenanceFence()).toEqual(held);
                throw releaseFailure;
              } catch (error) {
                faultFailure = { error };
                throw error;
              } finally {
                completeOwnedCleanup(
                  [
                    () => {
                      restoreRow();
                    },
                    () => {
                      peer.close(true);
                    },
                  ],
                  faultFailure,
                );
              }
            },
          );
          let wrapperFailure: { error: unknown } | undefined;
          try {
            const rejected = await rejectionReason(
              runConsumerMigrationState({ ...input, mode: 'baseline' }, () => {
                calls++;
                return 'observed metadata callback';
              }),
            );
            expect(releaseCalls).toBe(1);
            expect(calls).toBe(1);
            expect(rejected).toBe(releaseFailure);
          } catch (error) {
            wrapperFailure = { error };
            throw error;
          } finally {
            completeOwnedCleanup(
              [
                () => {
                  releaseSpy.mockRestore();
                },
              ],
              wrapperFailure,
            );
          }
          const reopened = openHostStateDatabase(root, path.relative(root, target), workspaceId);
          let probeFailure: { error: unknown } | undefined;
          try {
            expect(new HostStateStore(reopened, workspaceId).readMaintenanceFence()).toMatchObject({
              status: 'held',
              binding: { operation_id: input.operationId },
            });
          } catch (error) {
            probeFailure = { error };
            throw error;
          } finally {
            completeOwnedCleanup(
              [
                () => {
                  closeWorkspaceDatabaseWithAdmission(reopened);
                },
              ],
              probeFailure,
            );
          }
          expect(
            ['', '-wal', '-shm'].map((suffix) =>
              existsSync(workflowPath + suffix) ? readFileSync(workflowPath + suffix) : null,
            ),
          ).toEqual(tripletBefore);
        }
        const run = async (phase: 'baseline' | 'restore', hasBackup: boolean) => {
          if (performance.now() >= deadline) throw new Error('Migration wrapper fixture exhausted its case deadline');
          const result = await runConsumerMigrationState({ ...input, mode: phase }, (files) => {
            calls++;
            expect(files.database_path).toBe(path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'));
            expect(files.workflow_database_path).toBe(workflowPath);
            if (hasBackup) {
              expect(files.backup).toBeInstanceOf(Uint8Array);
              expect(Buffer.from(files.backup!).subarray(0, 16).toString()).toBe('SQLite format 3\0');
            } else expect(files.backup).toBeNull();
            return calls;
          });
          expect(result).toEqual({
            schema: 'ConsumerMigrationState/v1',
            operation_id: input.operationId,
            status: phase === 'baseline' ? 'baseline' : 'restored',
            result: calls,
          });
          if (mode === 'absent-workflow') {
            for (const suffix of ['', '-wal', '-shm']) expect(existsSync(workflowPath + suffix)).toBe(false);
          } else expect(readFileSync(workflowPath)).toEqual(requiredValue(workflowBefore, 'workflow byte preimage'));
        };
        await run('baseline', mode !== 'close-return' && !mode.startsWith('release-'));
        await run('baseline', false);
        await run('restore', false);
        if (mode === 'baseline-restore') await run('restore', false);
        if (performance.now() >= deadline)
          throw new Error('Migration wrapper fixture completion exhausted its deadline');
        completed = true;
      },
      async () => {
        if (rootOwned) {
          if (completed && !expectedInflight && performance.now() < deadline)
            await rm(rootOwned, { recursive: true, force: true });
          else {
            console.error(
              'Retained consumer migration wrapper fixture (' +
                (completed && expectedInflight ? 'expected inflight denial; no replay' : 'failure or deadline') +
                '): ' +
                rootOwned,
            );
            if (performance.now() >= deadline)
              throw new Error('Migration wrapper fixture cleanup exhausted its deadline');
          }
        }
      },
      'Consumer migration wrapper fixture',
    );
  },
);

test('consumer migration rejects incomplete beforeimages before invoking the file callback', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const migration = maintenanceStore();
  const fence = migration.acquireMaintenanceFence(maintenanceBinding());
  migration.consumerMigrationState(fence, 'baseline', () => undefined);
  const original = requiredValue(
    database
      .query<{ payload: string; digest: string }, [string, string]>(
        'SELECT payload,digest FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?',
      )
      .get(workspace, fence.fence.binding.operation_id),
    'migration beforeimage row',
  );
  const plan = parseJsonRecord(original.payload);
  const before = parseJsonRecord(JSON.stringify(plan.before));
  const malformed = [
    null,
    [],
    ...Object.keys(before).map((missing) =>
      Object.fromEntries(Object.entries(before).filter(([key]) => key !== missing)),
    ),
    { ...before, agent_host_state: {} },
    { ...before, unexpected_table: [] },
  ];
  const replace = database.query<never, [string, string, string, string, string]>(
    'UPDATE agent_host_consumer_migration SET payload=?,digest=? WHERE workspace_id=? AND operation_id=? AND digest=?',
  );
  let calls = 0;
  for (const invalid of malformed) {
    const payload = JSON.stringify({ ...plan, before: invalid });
    const digest = createHash('sha256').update(payload).digest('hex');
    expect(replace.run(payload, digest, workspace, fence.fence.binding.operation_id, original.digest).changes).toBe(1);
    let primaryFailure: { error: unknown } | undefined;
    try {
      expect(() =>
        migration.consumerMigrationState(fence, 'restore', () => {
          calls++;
        }),
      ).toThrow('consumer migration beforeimage tables differ');
      expect(calls).toBe(0);
      expect(
        database
          .query<{ payload: string; digest: string }, [string, string]>(
            'SELECT payload,digest FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?',
          )
          .get(workspace, fence.fence.binding.operation_id),
      ).toEqual({ payload, digest });
      expect(database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_state').get()?.count).toBe(0);
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            expect(
              replace.run(original.payload, original.digest, workspace, fence.fence.binding.operation_id, digest)
                .changes,
            ).toBe(1);
          },
        ],
        primaryFailure,
      );
    }
  }
  expect(migration.consumerMigrationState(fence, 'restore', () => ++calls).status).toBe('restored');
  expect(calls).toBe(1);
  await migration.releaseMaintenanceFence(fence);
  preserveHostFixtureRoot = false;
});

test('consumer migration keeps canonical SQLite in place, clears active rows and restores exact state under its held fence', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const deadline = performance.now() + 5_000;
  const prepared = await writerFixture();
  const initial = prepared.seed;
  quiesceImportedState([initial.nextWork], initial.nextLedger);
  const first = commitHostState(initial);
  const second = fixture('second', 'file:src/other.ts');
  quiesceImportedState([second.nextWork], second.nextLedger);
  includeExistingLedger(second, first.ledger);
  second.expectedLedger = first.ledgerVersion;
  commitHostState(second);
  const journal = completedRecoveryJournal(
    identity.work_id,
    requiredValue(initial.nextWork.execution.run_id, 'migration retained run id'),
    prepared.source,
  );
  expect(journal.state.completed).toHaveLength(1);
  expect(firstOf(firstOf(journal.state.completed, 'retained wave').items, 'retained item').observation?.status).toBe(
    'reported_complete',
  );
  const journalRows = database.query<SessionLedgerSqlRow, []>(
    'SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger ORDER BY workspace_id,work_id,attempt',
  );
  const retainedJournal = journalRows.all();
  const before = store.readWorkspaceSnapshot();
  expect(before.work).toHaveLength(2);
  const consumerFile = path.join(root, 'consumer-source.txt');
  const originalBytes = Buffer.from('original consumer source\n');
  writeFileSync(consumerFile, originalBytes);
  const competingHandle = new Database(databasePath, { strict: true });
  handles.push(competingHandle);
  const competing = new HostStateStore(competingHandle, workspace);
  const migration = maintenanceStore(),
    fence = migration.acquireMaintenanceFence(maintenanceBinding());
  expect(() => competing.recordAdmissionAttempt('held-fence', 1, { valid: 'fixture' })).toThrow(/maintenance fence/);
  expect(
    database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_admission_attempt').get()?.count,
  ).toBe(0);
  let callbacks = 0;
  let ledgerReads = 0;
  const originalReadStateRow = persistedRows.readWorkspaceStateSqlRow;
  const rowObserver = spyOn(persistedRows, 'readWorkspaceStateSqlRow').mockImplementation((...args) => {
    if (args[0] === database && args[1] === workspace && args[2] === 'ledger' && args[3] === 'shared') ledgerReads++;
    return originalReadStateRow(...args);
  });
  const baseline = (() => {
    try {
      return migration.consumerMigrationState(fence, 'baseline', () => {
        callbacks++;
        expect(() => store.recordAdmissionAttempt('blocked', 1, { valid: 'fixture' })).toThrow(/maintenance|nested/);
        return 'files archived';
      });
    } finally {
      rowObserver.mockRestore();
    }
  })();
  expect(ledgerReads).toBe(1);
  expect(baseline.status).toBe('baseline');
  expect(migration.readWorkspaceSnapshot().work).toHaveLength(0);
  expect(migration.readWorkspaceSnapshot().ledger).toBeNull();
  expect(journalRows.all()).toEqual([]);
  const planRow = requiredValue(
    database
      .query<{ payload: string; digest: string }, [string, string]>(
        'SELECT payload,digest FROM agent_host_consumer_migration WHERE workspace_id=? AND operation_id=?',
      )
      .get(workspace, fence.fence.binding.operation_id),
    'populated migration beforeimage',
  );
  const plan = parseJsonRecord(planRow.payload);
  const beforeRows = parseJsonRecord(JSON.stringify(plan.before));
  if (!Array.isArray(beforeRows.agent_host_state)) throw new Error('migration fixture state rows missing');
  const stateRows: readonly unknown[] = beforeRows.agent_host_state;
  const originalStateRow = parseJsonRecord(JSON.stringify(firstOf(beforeRows.agent_host_state, 'migration state row')));
  const corruptBeforeimages = [
    {
      ...beforeRows,
      agent_host_state: [{ ...originalStateRow, workspace_id: 'foreign-workspace' }, ...stateRows.slice(1)],
    },
    { ...beforeRows, agent_host_state: [...stateRows, originalStateRow] },
  ];
  for (const corruptBeforeimage of corruptBeforeimages) {
    const corruptPayload = JSON.stringify({ ...plan, before: corruptBeforeimage });
    const corruptDigest = createHash('sha256').update(corruptPayload).digest('hex');
    const restoringDigest = createHash('sha256')
      .update(JSON.stringify({ ...plan, before: corruptBeforeimage, status: 'restoring' }))
      .digest('hex');
    const replacePlan = database.query<never, [string, string, string, string, string, string]>(
      'UPDATE agent_host_consumer_migration SET payload=?,digest=? WHERE workspace_id=? AND operation_id=? AND digest IN (?,?)',
    );
    expect(
      replacePlan.run(
        corruptPayload,
        corruptDigest,
        workspace,
        fence.fence.binding.operation_id,
        planRow.digest,
        planRow.digest,
      ).changes,
    ).toBe(1);
    let corruptCallbacks = 0;
    let preflightFailure: { error: unknown } | undefined;
    try {
      expect(() =>
        migration.consumerMigrationState(fence, 'restore', () => {
          corruptCallbacks++;
        }),
      ).toThrow(/another workspace|UNIQUE constraint/);
      expect(corruptCallbacks).toBe(0);
      expect(journalRows.all()).toEqual([]);
      expect(migration.readWorkspaceSnapshot().work).toEqual([]);
    } catch (error) {
      preflightFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            expect(
              replacePlan.run(
                planRow.payload,
                planRow.digest,
                workspace,
                fence.fence.binding.operation_id,
                corruptDigest,
                restoringDigest,
              ).changes,
            ).toBe(1);
          },
        ],
        preflightFailure,
      );
    }
  }
  writeFileSync(consumerFile, 'deterministic initialization failure output');
  expect(() =>
    migration.consumerMigrationState(fence, 'restore', () => {
      writeFileSync(consumerFile, originalBytes);
      throw Error('interrupted restore after exact file publication');
    }),
  ).toThrow(/interrupted restore/);
  expect(readFileSync(consumerFile)).toEqual(originalBytes);
  expect(migration.readWorkspaceSnapshot().work).toHaveLength(0);
  expect(() => competing.recordAdmissionAttempt('interrupted-fence', 1, { valid: 'fixture' })).toThrow(
    /maintenance fence/,
  );
  const restored = migration.consumerMigrationState(fence, 'restore', () => {
    callbacks++;
    expect(() => store.recordAdmissionAttempt('blocked', 1, { valid: 'fixture' })).toThrow(/maintenance|nested/);
    expect(readFileSync(consumerFile)).toEqual(originalBytes);
    return 'files restored';
  });
  expect(restored.status).toBe('restored');
  expect(journalRows.all()).toEqual(retainedJournal);
  await migration.releaseMaintenanceFence(fence);
  const after = migration.readWorkspaceSnapshot();
  expect(after).toEqual({
    ...before,
    work: before.work.map((row) => ({ ...row, maintenanceGeneration: fence.fence.generation })),
  });
  expect(firstOf(after.work, 'restored consumer work').maintenanceGeneration).toBeGreaterThan(
    firstOf(before.work, 'baseline consumer work').maintenanceGeneration,
  );
  expect(callbacks).toBe(2);
  expect(readFileSync(consumerFile)).toEqual(originalBytes);
  if (performance.now() >= deadline) throw new Error('Host migration history fixture exceeded its case deadline');
  preserveHostFixtureRoot = false;
});

test('consumer migration archives individually bounded governance rows beyond the aggregate ingress node budget', async () => {
  const deadline = performance.now() + 5_000;
  preserveHostFixtureRoot = 'case failed or timed out';
  const operation = reserveRequiredOperation(store, 'archive', '1'.repeat(64), '2'.repeat(64));
  store.transitionOperation(operation, 'commit_unknown');
  store.transitionOperation(operation, 'applied', '3'.repeat(64));
  const template = database
    .query<GovernanceSqlRow, []>("SELECT * FROM agent_host_governance WHERE kind='operation'")
    .get();
  if (!template) throw new Error('operation fixture row is missing');
  const basePayload = validateHostOperationReservation(parseJsonRecord(template.payload));
  const rowNodes = Object.keys(template).length + 1;
  const rowCount = Math.floor((MAX_CANONICAL_NODES - 1) / rowNodes) + 1;
  const insert = database.query<never, SQLQueryBindings[]>('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)');
  database
    .transaction(() => {
      for (let index = 1; index < rowCount; index++) {
        const key = createHash('sha256')
          .update('archive-operation-' + index)
          .digest('hex');
        const payload = { ...basePayload, operation_key: key };
        const digest = canonicalJsonDigest({
          workspace_id: workspace,
          store_id: template.store_id,
          kind: template.kind,
          record_key: key,
          revision: template.revision,
          payload,
        });
        insert.run(workspace, template.store_id, template.kind, key, template.revision, canonicalJson(payload), digest);
      }
    })
    .immediate();
  const rows = database
    .query<GovernanceSqlRow, [string]>('SELECT * FROM agent_host_governance WHERE workspace_id=? ORDER BY rowid')
    .all(workspace);
  expect(rows).toHaveLength(rowCount);
  expect(() => canonicalJsonDigest(rows.slice(0, -1))).not.toThrow();
  expect(() => canonicalJsonDigest(rows)).toThrow(/node budget/);
  const migration = maintenanceStore(),
    fence = migration.acquireMaintenanceFence(maintenanceBinding());
  let governanceDecodes = 0;
  const originalDecodeRow = persistedRows.decodeWorkspaceSqlRow;
  const decoderObserver = spyOn(persistedRows, 'decodeWorkspaceSqlRow').mockImplementation(
    new Proxy(originalDecodeRow, {
      apply(target, receiver: unknown, args: unknown[]) {
        if (args[0] === 'agent_host_governance' && args[2] === workspace && args[3] === database) governanceDecodes++;
        const result: unknown = Reflect.apply(target, receiver, args);
        return result;
      },
    }),
  );
  try {
    expect(migration.consumerMigrationState(fence, 'baseline', () => undefined).status).toBe('baseline');
  } finally {
    decoderObserver.mockRestore();
  }
  expect(governanceDecodes).toBeGreaterThanOrEqual(rows.length);
  expect(governanceDecodes).toBeLessThanOrEqual(rows.length * 2);
  expect(database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_governance').get()?.count).toBe(
    0,
  );
  expect(migration.consumerMigrationState(fence, 'restore', () => undefined).status).toBe('restored');
  expect(
    database
      .query<GovernanceSqlRow, [string]>('SELECT * FROM agent_host_governance WHERE workspace_id=? ORDER BY rowid')
      .all(workspace),
  ).toEqual(rows);
  await migration.releaseMaintenanceFence(fence);
  if (performance.now() < deadline) preserveHostFixtureRoot = false;
});

test('consumer migration restore refuses a prepared admission even when no WorkState was created', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const deadline = performance.now() + 5_000;
  const migration = maintenanceStore(),
    binding = maintenanceBinding();
  const first = migration.acquireMaintenanceFence(binding);
  migration.consumerMigrationState(first, 'baseline', () => undefined);
  await migration.releaseMaintenanceFence(first);
  const request = { minimum_valid_identity: 'fixture' };
  migration.recordAdmissionAttempt('failed-before-work', 1, request);
  const rows = () => ({
    admissions: database
      .query('SELECT * FROM agent_host_admission_attempt ORDER BY workspace_id,generation,work_id,attempt')
      .all(),
    host: database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY workspace_id,kind,id').all(),
    governance: governanceRows(),
    schema: database.query('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all(),
  });
  const beforeRetry = rows();
  expect(beforeRetry.admissions).toEqual([
    {
      workspace_id: workspace,
      generation: first.fence.generation,
      work_id: 'failed-before-work',
      attempt: 1,
      request_digest: canonicalJsonDigest(request),
    },
  ]);
  migration.recordAdmissionAttempt('failed-before-work', 1, request);
  expect(rows()).toEqual(beforeRetry);
  expect(() =>
    migration.recordAdmissionAttempt('failed-before-work', 1, { minimum_valid_identity: 'changed' }),
  ).toThrow('admission attempt retry differs');
  expect(rows()).toEqual(beforeRetry);
  const second = migration.acquireMaintenanceFence(binding);
  let called = false;
  expect(() =>
    migration.consumerMigrationState(second, 'restore', () => {
      called = true;
    }),
  ).toThrow(/new admission/);
  expect(called).toBe(false);
  expect(migration.readWorkspaceSnapshot().work).toHaveLength(0);
  if (performance.now() >= deadline) throw new Error('Admission retry fixture exceeded its case deadline');
  preserveHostFixtureRoot = false;
});

test('consumer migration rejects issued unknown journals before baseline filesystem effects', () => {
  const initial = currentConfigHostFixture();
  quiesceImportedState([initial.nextWork], initial.nextLedger);
  commitHostState(initial);
  const journal = issuedCurrentWorkflowJournal(
    identity.work_id,
    requiredValue(initial.nextWork.execution.run_id, 'migration run id'),
  ).journal;
  expect(journal.state.items.length).toBeGreaterThan(0);
  expect(journal.state.items.every((item) => item.issue_id !== null && item.observation === null)).toBe(true);
  const before = database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all();
  const migration = maintenanceStore(),
    fence = migration.acquireMaintenanceFence(maintenanceBinding());
  let called = false;
  expect(() =>
    migration.consumerMigrationState(fence, 'baseline', () => {
      called = true;
    }),
  ).toThrow(/outcome remains unknown/);
  expect(called).toBe(false);
  expect(database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id').all()).toEqual(before);
  expect(database.query<PayloadSqlRow, []>('SELECT payload FROM agent_host_mastra_session_ledger').get()?.payload).toBe(
    canonicalJson(journal.state),
  );
});

test('consumer migration rejects foreign canonical rows appearing after its baseline', () => {
  const migration = maintenanceStore(),
    fence = migration.acquireMaintenanceFence(maintenanceBinding());
  migration.consumerMigrationState(fence, 'baseline', () => undefined);
  const foreign = fixture('foreign').nextWork;
  const key = JSON.stringify([
    foreign.binding.repository_id,
    foreign.binding.project_ids,
    foreign.binding.integrations_digest,
    foreign.binding.lifecycle_work_id,
  ]);
  database
    .query<never, SQLQueryBindings[]>('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)')
    .run(workspace, 'work', key, foreign.revision, canonicalJson(foreign), canonicalJsonDigest(foreign));
  let called = false;
  expect(() =>
    migration.consumerMigrationState(fence, 'restore', () => {
      called = true;
    }),
  ).toThrow(/new admission|changed canonical state/);
  expect(called).toBe(false);
  const storedRow = database.query<PayloadSqlRow, [string]>('SELECT payload FROM agent_host_state WHERE id=?').get(key);
  if (!storedRow) throw new Error('foreign host state row fixture is missing');
  expect(storedRow.payload).toBe(canonicalJson(foreign));
});

describe('host-owned durable maintenance fence', () => {
  test('planning authority validates project scope and releases its failed read scope without acquiring a fence', () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const binding = maintenanceBinding();
    const failure = new Error('fixture planning authority changed');
    let fail = false;
    let calls = 0;
    const checked = new HostStateStore(database, workspace, undefined, undefined, undefined, {
      ...maintenanceVerifier,
      verifyAcquisition: (observed, prior) => {
        calls++;
        expect(database.inTransaction).toBe(true);
        expect(observed).toEqual(binding);
        expect(prior).toBeNull();
        if (fail) throw failure;
      },
    });
    expect(checked.assertMaintenancePlanningAuthority(binding)).toBeUndefined();
    expect(calls).toBe(1);
    expect(checked.readMaintenanceFence()).toBeNull();
    expect(() => checked.assertMaintenancePlanningAuthority({ ...binding, project_ids: ['foreign'] })).toThrow(
      'maintenance project authority mismatch',
    );
    expect(() => database.transaction(() => checked.assertMaintenancePlanningAuthority(binding)).deferred()).toThrow(
      'nested host state transaction forbidden',
    );
    expect(calls).toBe(1);
    fail = true;
    expect(() => checked.assertMaintenancePlanningAuthority(binding)).toThrow(failure);
    expect(calls).toBe(2);
    expect(database.inTransaction).toBe(false);
    expect(checked.readMaintenanceFence()).toBeNull();
    fail = false;
    expect(checked.assertMaintenancePlanningAuthority(binding)).toBeUndefined();
    expect(calls).toBe(3);
    expect(checked.readMaintenanceFence()).toBeNull();
    expect(database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_governance').get()?.count).toBe(
      0,
    );
    preserveHostFixtureRoot = false;
  });

  test('released-fence proof accepts only its exact native receipt without reacquiring or releasing state', async () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const checked = maintenanceStore();
    const receipt = checked.acquireMaintenanceFence(maintenanceBinding());
    expect(() => checked.assertReleasedMaintenanceFence(receipt)).toThrow('released fence receipt stale or forged');
    expect(checked.readMaintenanceFence()).toEqual(receipt.fence);
    const released = await checked.releaseMaintenanceFence(receipt);
    const proof = { ...receipt, fence: released };
    const observed = checked.assertReleasedMaintenanceFence(proof);
    expect(observed).toEqual(released);
    expect(observed).not.toBe(released);
    expect(() => checked.assertReleasedMaintenanceFence(receipt)).toThrow('released fence receipt stale or forged');
    expect(() => checked.assertReleasedMaintenanceFence({ ...proof, token: randomUUID() })).toThrow(
      'released fence receipt stale or forged',
    );
    expect(() => checked.assertReleasedMaintenanceFence({ ...proof, token: 'invalid' })).toThrow(
      'release receipt invalid',
    );
    expect(() => database.transaction(() => checked.assertReleasedMaintenanceFence(proof)).deferred()).toThrow(
      'nested host state transaction forbidden',
    );
    const foreign = new HostStateStore(database, 'f'.repeat(64), undefined, undefined, undefined, maintenanceVerifier);
    expect(() => foreign.assertReleasedMaintenanceFence(proof)).toThrow('released fence receipt stale or forged');
    expect(checked.readMaintenanceFence()).toEqual(released);
    const next = checked.acquireMaintenanceFence(maintenanceBinding());
    expect(next.fence.generation).toBe(released.generation + 1);
    expect(() => checked.assertReleasedMaintenanceFence(proof)).toThrow('released fence receipt stale or forged');
    expect(checked.readMaintenanceFence()).toEqual(next.fence);
    preserveHostFixtureRoot = false;
  });

  test('configured database identity binds the actual root, workspace and canonical native file without granting a fence', async () => {
    const deadline = performance.now() + 5_000;
    let ownedRoot: string | undefined;
    let handle: Database | undefined;
    let completed = false;
    await withInitialSourceCleanup(
      async () => {
        const configuredRoot = await makeFreshRepository('vida-configured-host-', {
          includeLocalInstructions: false,
          onRoot: (created) => {
            ownedRoot = created;
            console.info('Configured Host database fixture root: ' + created);
          },
        });
        const config = loadRuntimeConfig(configuredRoot);
        const relative = config.control.work_root + '/session-handoff.v1.sqlite';
        mkdirSync(path.join(configuredRoot, config.control.work_root), { recursive: true });
        const configuredWorkspace = deriveWorkspaceId(config.repository.repository_id, configuredRoot);
        const opened = openHostStateDatabase(configuredRoot, relative, configuredWorkspace);
        handle = opened;
        const checked = new HostStateStore(
          opened,
          configuredWorkspace,
          undefined,
          undefined,
          undefined,
          maintenanceVerifier,
          configuredRoot,
        );
        const rows = opened.query<HostStateSqlRow, []>(
          'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
        );
        const before = rows.all();
        expect(checked.assertConfiguredDatabase(config)).toBeUndefined();
        const physical = nodeFs.lstatSync(opened.filename, { bigint: true });
        const physicalIdentity = { device: String(physical.dev), inode: String(physical.ino) };
        const sentinelBinding = { fixture: 'opaque storage identity binding', workspace_id: configuredWorkspace };
        opened.exec(
          'CREATE TABLE vida_workspace_bootstrap(id INTEGER PRIMARY KEY,payload TEXT NOT NULL,digest TEXT NOT NULL)',
        );
        expect(() =>
          checked.assertWorkspaceDatabaseBootstrap(configuredRoot, relative, physicalIdentity, sentinelBinding),
        ).toThrow('Host bootstrap sentinel differs from the retained operation');
        opened
          .query<never, [string, string]>('INSERT INTO vida_workspace_bootstrap VALUES(1,?,?)')
          .run(canonicalJson(sentinelBinding), canonicalJsonDigest(sentinelBinding));
        const sentinel = opened.query<{ payload: string; digest: string }, []>(
          'SELECT payload,digest FROM vida_workspace_bootstrap WHERE id=1',
        );
        const sentinelBefore = sentinel.get();
        expect(
          checked.assertWorkspaceDatabaseBootstrap(configuredRoot, relative, physicalIdentity, sentinelBinding),
        ).toBeUndefined();
        expect(() =>
          checked.assertWorkspaceDatabaseBootstrap(
            configuredRoot,
            relative,
            { ...physicalIdentity, inode: physicalIdentity.inode + '0' },
            sentinelBinding,
          ),
        ).toThrow('Host database differs from the published bootstrap identity');
        expect(() =>
          checked.assertWorkspaceDatabaseBootstrap(configuredRoot, relative, physicalIdentity, {
            ...sentinelBinding,
            fixture: 'different binding',
          }),
        ).toThrow('Host bootstrap sentinel differs from the retained operation');
        expect(sentinel.get()).toEqual(sentinelBefore);
        const foreignConfig = {
          ...config,
          repository: { ...config.repository, repository_id: 'foreign-configured-repository' },
        };
        expect(() => checked.assertConfiguredDatabase(foreignConfig)).toThrow('configured Host workspace differs');
        const rootless = new HostStateStore(opened, configuredWorkspace);
        expect(() => rootless.assertConfiguredDatabase(config)).toThrow('configured Host repository required');
        const foreignFile = path.join(configuredRoot, 'session-handoff.v1.sqlite');
        const foreignBytes = Buffer.from('fixture physical-path substitution');
        writeFileSync(foreignFile, foreignBytes, { flag: 'wx' });
        expect(() =>
          checked.assertConfiguredDatabase({ ...config, control: { ...config.control, work_root: '.' } }),
        ).toThrow('configured Host database or parent differs');
        expect(readFileSync(foreignFile)).toEqual(foreignBytes);
        expect(rows.all()).toEqual(before);
        expect(checked.readMaintenanceFence()).toBeNull();
        if (performance.now() >= deadline) throw new Error('Configured Host identity fixture exhausted its deadline');
        completed = true;
      },
      async () => {
        if (handle) closeWorkspaceDatabaseWithAdmission(handle);
        if (ownedRoot) {
          if (completed && performance.now() < deadline) await rm(ownedRoot, { recursive: true, force: true });
          else {
            console.error('Retained configured Host database fixture: ' + ownedRoot);
            if (performance.now() >= deadline)
              throw new Error('Configured Host identity cleanup exhausted its deadline');
          }
        }
      },
      'Configured Host identity fixture',
    );
  });

  test('trusted acquisition verifier runs under the same immediate lock and rejection writes no fence', () => {
    const competing = new Database(databasePath, { strict: true });
    handles.push(competing);
    const other = maintenanceStore(competing);
    let observations = 0;
    const verifier = {
      ...maintenanceVerifier,
      verifyAcquisition: () => {
        observations++;
        expect(database.inTransaction).toBe(true);
        expect(() => other.reserveOperation('race', operationKey, requestDigest)).toThrow(/locked|busy/i);
        throw Error('frozen global state changed');
      },
    };
    const checked = new HostStateStore(database, workspace, undefined, undefined, undefined, verifier);
    expect(() => checked.acquireMaintenanceFenceWithRecordedToken(maintenanceBinding(), randomUUID())).toThrow(
      'frozen global state changed',
    );
    expect(observations).toBe(1);
    expect(checked.readMaintenanceFence()).toBeNull();
    expect(database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_governance').get()?.count).toBe(
      0,
    );
  });
  test('maintenance acquisition rejects asynchronous or boolean owner checks before fence effects', () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const deadline = performance.now() + 5_000;
    const asynchronousVerifier = { ...maintenanceVerifier };
    setFixtureField(asynchronousVerifier, 'verifyAcquisition', async () => undefined);
    expect(
      () => new HostStateStore(database, workspace, undefined, undefined, undefined, asynchronousVerifier),
    ).toThrow('verifier invalid');
    for (const invalidVerifier of [() => true, () => Promise.resolve(), () => Promise.reject(undefined)]) {
      const verifier = { ...maintenanceVerifier };
      setFixtureField(verifier, 'verifyAcquisition', invalidVerifier);
      const checked = new HostStateStore(database, workspace, undefined, undefined, undefined, verifier);
      expect(() => checked.acquireMaintenanceFenceWithRecordedToken(maintenanceBinding(), randomUUID())).toThrow(
        'must be synchronous',
      );
      expect(checked.readMaintenanceFence()).toBeNull();
    }
    if (performance.now() >= deadline) throw new Error('Host maintenance verifier fixture exceeded its case deadline');
    preserveHostFixtureRoot = false;
  });
  test('acquisition verifier reads the same Host transaction on first acquire and held-fence retry', () => {
    let checked!: HostStateStore;
    const maintenanceGenerations: number[] = [];
    checked = new HostStateStore(database, workspace, undefined, undefined, undefined, {
      ...maintenanceVerifier,
      verifyAcquisition: () => {
        expect(database.inTransaction).toBe(true);
        const observed = checked.readHostStateSnapshot(identity);
        expect(observed.work).toEqual(seed.nextWork);
        maintenanceGenerations.push(observed.maintenanceGeneration);
        expect(() => checked.reserveOperation('operations', operationKey, requestDigest)).toThrow(
          /nested host state transaction forbidden/,
        );
      },
    });
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    commitHostStateOn(checked, seed);

    const first = checked.acquireMaintenanceFence(maintenanceBinding());
    const retry = checked.acquireMaintenanceFenceWithRecordedToken(maintenanceBinding(), first.token);

    expect(retry).toEqual(first);
    expect(maintenanceGenerations).toEqual([0, 1]);
    expect(database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_governance').get()?.count).toBe(
      0,
    );
  });
  test('ordinary nested Host reads remain denied and a throwing verifier clears its scoped read context', () => {
    let checked!: HostStateStore;
    let fail = true;
    checked = new HostStateStore(database, workspace, undefined, undefined, undefined, {
      ...maintenanceVerifier,
      verifyAcquisition: () => {
        if (fail) throw Error('frozen global state changed');
        expect(readPresentSnapshot(checked, identity).work).toEqual(seed.nextWork);
      },
    });
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    commitHostStateOn(checked, seed);
    expect(() => checked.acquireMaintenanceFence(maintenanceBinding())).toThrow('frozen global state changed');
    expect(checked.readMaintenanceFence()).toBeNull();
    database.transaction(() => {
      expect(() => checked.readHostStateSnapshot(identity)).toThrow(/nested host state transaction forbidden/);
    })();

    fail = false;
    const receipt = checked.acquireMaintenanceFence(maintenanceBinding());
    expect(receipt.fence.status).toBe('held');
  });
  test('held-fence inspection reads with the exact receipt and keeps nested Host mutations denied', async () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const deadline = performance.now() + 5_000;
    const checked = maintenanceStore();
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const saved = commitHostStateOn(checked, seed);
    const receipt = checked.acquireMaintenanceFence(maintenanceBinding());

    const observed = checked.withMaintenanceInspection(receipt, () => {
      expect(database.inTransaction).toBe(true);
      const current = checked.readHostStateSnapshot(identity);
      expect(current.work).toEqual(seed.nextWork);
      expect(current.maintenanceGeneration).toBe(receipt.fence.generation);
      expect(() => checked.reserveOperation('operations', operationKey, requestDigest)).toThrow(
        /nested host state transaction forbidden/,
      );
      return current.workVersion;
    });

    expect(observed).toEqual(saved.workVersion);
    const terminal = { ...saved, maintenanceGeneration: receipt.fence.generation };
    const hostRows = database.query<HostStateSqlRow, []>(
      'SELECT workspace_id,kind,id,revision,payload,digest FROM agent_host_state ORDER BY workspace_id,kind,id',
    );
    const retainedRows = hostRows.all();
    expect(checked.readTerminalHostStateSnapshot(identity, receipt.fence)).toEqual(terminal);
    expect(() => checked.readHostStateSnapshot(identity)).toThrow('working access blocked by maintenance fence');
    expect(() =>
      checked.readTerminalHostStateSnapshot(identity, { ...receipt.fence, generation: receipt.fence.generation + 1 }),
    ).toThrow('terminal maintenance snapshot drift');
    const denial = new Error('fixture held inspection failed');
    expect(() =>
      checked.withMaintenanceInspection(receipt, () => {
        throw denial;
      }),
    ).toThrow(denial);
    database
      .transaction(() => {
        expect(() => checked.readHostStateSnapshot(identity)).toThrow('nested host state transaction forbidden');
      })
      .deferred();
    expect(checked.readTerminalHostStateSnapshot(identity, receipt.fence)).toEqual(terminal);
    expect(hostRows.all()).toEqual(retainedRows);
    expect(database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_governance').get()?.count).toBe(
      0,
    );
    await checked.releaseMaintenanceFence(receipt);
    expect(() => checked.readTerminalHostStateSnapshot(identity, receipt.fence)).toThrow(
      'terminal maintenance snapshot drift',
    );
    expect(checked.readTerminalHostStateSnapshot(identity, checked.readMaintenanceFence())).toEqual(terminal);
    if (performance.now() >= deadline) throw new Error('Host terminal snapshot fixture exceeded its case deadline');
    preserveHostFixtureRoot = false;
  });
  test('held-fence inspection rejects foreign or stale receipts and always clears a failed scope', async () => {
    const checked = maintenanceStore();
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    commitHostStateOn(checked, seed);
    const receipt = checked.acquireMaintenanceFence(maintenanceBinding());
    const foreign = new HostStateStore(
      database,
      deriveWorkspaceId('foreign-maintenance-repository', root),
      undefined,
      undefined,
      undefined,
      maintenanceVerifier,
      root,
    );

    expect(() => foreign.withMaintenanceInspection(receipt, () => undefined)).toThrow(/stale or forged/);
    expect(() => checked.withMaintenanceInspection({ ...receipt, token: randomUUID() }, () => undefined)).toThrow(
      /stale or forged/,
    );
    expect(() =>
      checked.withMaintenanceInspection(receipt, () => {
        throw Error('inspection failed');
      }),
    ).toThrow('inspection failed');
    database.transaction(() => {
      expect(() => checked.readHostStateSnapshot(identity)).toThrow(/nested host state transaction forbidden/);
      expect(() => checked.reserveOperation('operations', operationKey, requestDigest)).toThrow(
        /nested host state transaction forbidden/,
      );
    })();
    let asyncCallbackEntered = false;
    const asyncInspection = async () => {
      asyncCallbackEntered = true;
    };
    expect(() => checked.withMaintenanceInspection(receipt, asyncInspection)).toThrow(/must be synchronous/);
    expect(asyncCallbackEntered).toBe(false);
    expect(() =>
      checked.withMaintenanceInspection(receipt, () => readPresentSnapshot(checked, identity).workVersion),
    ).not.toThrow();

    await checked.releaseMaintenanceFence(receipt);
    expect(() => checked.withMaintenanceInspection(receipt, () => undefined)).toThrow(/stale or forged/);
  });
  const seedQuiescentWork = (
    id: string,
    projectIds: string[],
    workspaceId: string = workspace,
    repositoryId: string = 'project-repository',
  ) => {
    const work = fixture(id).nextWork;
    work.workspace_id = workspaceId;
    work.binding.repository_id = repositoryId;
    work.binding.project_ids = projectIds;
    work.lease = null;
    work.execution.status = 'suspended';
    const key = JSON.stringify([repositoryId, projectIds, work.binding.integrations_digest, id]);
    database
      .query<never, SQLQueryBindings[]>('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)')
      .run(workspaceId, 'work', key, work.revision, canonicalJson(work), canonicalJsonDigest(work));
  };

  test('one workspace maintenance fence contains disjoint persisted project work', async () => {
    const verifier = { ...maintenanceVerifier, projectIds: ['other', 'project'] };
    store = new HostStateStore(database, workspace, undefined, undefined, undefined, verifier);
    seedQuiescentWork('first', ['project']);
    seedQuiescentWork('second', ['other']);
    const receipt = store.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['other', 'project'] });
    expect(receipt.fence.status).toBe('held');
    expect((await store.releaseMaintenanceFence(receipt)).status).toBe('released');
  });

  test('maintenance acquisition rejects a persisted project outside the exact fence before effects', () => {
    const verifier = { ...maintenanceVerifier, projectIds: ['other', 'project'] };
    store = new HostStateStore(database, workspace, undefined, undefined, undefined, verifier);
    seedQuiescentWork('foreign', ['third']);
    expect(() => store.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['other', 'project'] })).toThrow(
      /maintenance scope excludes persisted project/,
    );
    expect(store.readMaintenanceFence()).toBeNull();
  });

  test('maintenance acquisition rejects a foreign repository in the same workspace before effects', () => {
    const actualWorkspace = deriveWorkspaceId('project-repository', root);
    const verifier = { ...maintenanceVerifier };
    store = new HostStateStore(database, actualWorkspace, undefined, undefined, undefined, verifier, root);
    seedQuiescentWork('foreign', ['project'], actualWorkspace, 'foreign-repository');
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(
      /maintenance scope excludes persisted project/,
    );
    expect(store.readMaintenanceFence()).toBeNull();
  });

  test('working mutation excludes a competing maintenance acquisition', () => {
    store = workingStore();
    const competing = new Database(databasePath, { strict: true });
    handles.push(competing);
    const other = workingStore(competing);
    let rollbackCount = 0;
    const result = store.withWorkingMutation(
      root,
      0,
      () => {
        expect(() => other.acquireMaintenanceFence(maintenanceBinding())).toThrow(/locked|busy/i);
        return 'committed';
      },
      () => rollbackCount++,
    );
    expect(result).toBe('committed');
    expect(rollbackCount).toBe(0);
    expect(other.readMaintenanceFence()).toBeNull();
  });

  test('working mutation rejects a store bound to another repository root', async () => {
    store = workingStore();
    const foreignRoot = path.join(root, 'foreign-repository');
    await mkdir(foreignRoot);
    let effects = 0;
    expect(() =>
      store.withWorkingMutation(
        foreignRoot,
        0,
        () => ++effects,
        () => undefined,
      ),
    ).toThrow(/foreign repository working mutation/);
    expect(effects).toBe(0);
  });

  test('working mutation store rejects a file as repository root', async () => {
    const fileRoot = path.join(root, 'not-a-directory');
    await writeFile(fileRoot, 'x');
    expect(
      () => new HostStateStore(database, workspace, undefined, undefined, undefined, maintenanceVerifier, fileRoot),
    ).toThrow(/repository root must be a directory/);
  });

  test('working mutation rejects held and stale generations before a file effect', async () => {
    store = workingStore();
    let effects = 0;
    let rollbacks = 0;
    const write = (generation: number) =>
      store.withWorkingMutation(
        root,
        generation,
        () => ++effects,
        () => ++rollbacks,
      );
    expect(write(0)).toBe(1);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => write(0)).toThrow(/working access blocked by maintenance fence/);
    expect(effects).toBe(1);
    expect(rollbacks).toBe(0);
    await store.releaseMaintenanceFence(receipt);
    expect(() => write(0)).toThrow(/maintenance generation is stale/);
    expect(effects).toBe(1);
    expect(write(1)).toBe(2);
  });

  test('working mutation invokes rollback when its transaction fails after the action', () => {
    store = workingStore();
    let fileBytes = 'before';
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          fileBytes = 'after';
          return Promise.resolve('invalid asynchronous effect');
        },
        () => {
          fileBytes = 'before';
        },
      ),
    ).toThrow(/working mutation callback must be synchronous/);
    expect(fileBytes).toBe('before');
  });

  test('working mutation restores an effect when its action throws synchronously', () => {
    store = workingStore();
    let fileBytes = 'before';
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          fileBytes = 'after';
          throw new Error('write failed after effect');
        },
        () => {
          fileBytes = 'before';
        },
      ),
    ).toThrow(/write failed after effect/);
    expect(fileBytes).toBe('before');
  });

  test('working mutation restores a failed effect before releasing its maintenance exclusion', () => {
    store = workingStore();
    const competing = new Database(databasePath, { strict: true });
    handles.push(competing);
    const other = workingStore(competing);
    let restored = false;
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          throw new Error('write failed');
        },
        () => {
          expect(() => other.acquireMaintenanceFence(maintenanceBinding())).toThrow(/locked|busy/i);
          restored = true;
        },
      ),
    ).toThrow(/write failed/);
    expect(restored).toBe(true);
    expect(other.readMaintenanceFence()).toBeNull();
  });

  test('working mutation rejects a thenable and rolls back its effect', () => {
    store = workingStore();
    let fileBytes = 'before';
    expect(() =>
      store.withWorkingMutation(
        root,
        0,
        () => {
          fileBytes = 'after';
          return { then() {} };
        },
        () => {
          fileBytes = 'before';
        },
      ),
    ).toThrow(/working mutation callback must be synchronous/);
    expect(fileBytes).toBe('before');
  });

  test('Bun can read the exact maintenance row across the process boundary', async () => {
    store = maintenanceStore();
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const readWithBun = () =>
      new Promise<MaintenanceSqlRow>((resolve, reject) => {
        const code = `const { Database } = require('bun:sqlite');
          const db = new Database(process.env.VIDA_TEST_DB_PATH, { readonly: true, strict: true });
          const row = db.query('SELECT revision,payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
            .get(process.env.VIDA_TEST_WORKSPACE_ID);
          console.log(JSON.stringify(row));
          db.close();`;
        const child = spawn(process.execPath, ['-e', code], {
          env: { ...process.env, VIDA_TEST_DB_PATH: databasePath, VIDA_TEST_WORKSPACE_ID: workspace },
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        children.push(child);
        let output = '';
        let errors = '';
        child.stdout.on('data', (data) => (output += data));
        child.stderr.on('data', (data) => (errors += data));
        child.on('error', reject);
        child.on('close', (exitCode) =>
          exitCode === 0 ? resolve(parseMaintenanceRow(output)) : reject(new Error(errors || 'Bun fence read failed')),
        );
      });
    const held = await readWithBun();
    expect(held.revision).toBe(receipt.fence.revision);
    expect(held.digest).toBe(canonicalJsonDigest(parseJsonRecord(held.payload)));
    expect(parseJsonRecord(held.payload)).toEqual(parseJsonRecord(JSON.stringify(receipt.fence)));
    const released = await store.releaseMaintenanceFence(receipt);
    const observed = await readWithBun();
    expect(observed.revision).toBe(released.revision);
    expect(parseJsonRecord(observed.payload)).toEqual(parseJsonRecord(JSON.stringify(released)));
  });

  test('a Bun write transaction excludes concurrent fence acquisition', async () => {
    store = maintenanceStore();
    const code = `const { Database } = require('bun:sqlite');
      const db = new Database(process.env.VIDA_TEST_DB_PATH, { strict: true });
      db.exec('PRAGMA busy_timeout=1000; BEGIN IMMEDIATE');
      console.log('LOCKED');
      process.stdin.once('data', () => { db.exec('COMMIT'); db.close(); });`;
    const child = spawn(process.execPath, ['-e', code], {
      env: { ...process.env, VIDA_TEST_DB_PATH: databasePath },
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    children.push(child);
    let output = '';
    let errors = '';
    const locked = new Promise<void>((resolve, reject) => {
      child.stdout.on('data', (data) => {
        output += data;
        if (output.includes('LOCKED')) resolve();
      });
      child.stderr.on('data', (data) => (errors += data));
      child.on('error', reject);
      child.on('close', (exitCode) => {
        if (exitCode !== 0) reject(new Error(errors || 'Bun transaction failed'));
      });
    });
    await locked;
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow();
    expect(store.readMaintenanceFence()).toBeNull();
    const finished = new Promise<void>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', (exitCode) =>
        exitCode === 0 ? resolve() : reject(new Error(errors || 'Bun transaction failed')),
      );
    });
    child.stdin.end('release\n');
    await finished;
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(receipt.fence.status).toBe('held');
    await store.releaseMaintenanceFence(receipt);
  });

  test('never imports authoritative state without a held maintenance receipt', () => {
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const binding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding)).toThrow(
      /held maintenance receipt required/,
    );
    expect(() => {
      Reflect.apply(store.importReconciledHostState.bind(store), undefined, [
        [seed.nextWork],
        seed.nextLedger,
        binding,
        null,
      ]);
    }).toThrow(/held maintenance receipt required/);
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
  });

  test('rejects a foreign project even with a valid workspace maintenance receipt', async () => {
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    seed.nextWork.binding.project_ids = ['foreign'];
    firstTicket(seed.nextLedger).project_ids = ['foreign'];
    firstTicket(seed.nextLedger).contour_keys[1] = 'project:tenant/foreign';
    const binding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    setFixtureField(firstOf(binding.work, 'reconciliation work binding'), 'identity', {
      ...identity,
      project_ids: ['foreign'],
    });
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toThrow(
      /outside maintenance authority/,
    );
    await store.releaseMaintenanceFence(fence);
    expect(store.readHostStateSnapshot({ ...identity, project_ids: ['foreign'] }).work).toBeNull();
  });

  test('binds the full project scope to host authority and persisted workspace state', async () => {
    store = maintenanceStore();
    expect(() => store.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['foreign'] })).toThrow(
      /project authority mismatch/,
    );
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    firstClaim(seed.nextLedger).status = 'released';
    firstTicket(seed.nextLedger).status = 'released';
    firstTicket(seed.nextLedger).active_resources = [];
    firstTicket(seed.nextLedger).expires_at = null;
    commitHostState(seed);
    const foreignAuthority = new HostStateStore(database, workspace, undefined, undefined, undefined, {
      ...maintenanceVerifier,
      projectIds: ['foreign'],
    });
    expect(() =>
      foreignAuthority.acquireMaintenanceFence({ ...maintenanceBinding(), project_ids: ['foreign'] }),
    ).toThrow(/excludes persisted project/);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(receipt.fence.binding.project_ids).toEqual(['project']);
    await store.releaseMaintenanceFence(receipt);
  });

  test('rejects a pre-fence state snapshot after release even when state versions did not change', async () => {
    store = maintenanceStore();
    const before = store.readHostStateSnapshot(identity);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    await store.releaseMaintenanceFence(receipt);
    const stale = { ...fixture(), expectedMaintenanceGeneration: before.maintenanceGeneration };
    expect(() => commitHostState(stale)).toThrow(/maintenance generation/);
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
    const current = store.readHostStateSnapshot(identity);
    expect(current.maintenanceGeneration).toBe(1);
    const saved = commitHostState({
      ...fixture(),
      expectedMaintenanceGeneration: current.maintenanceGeneration,
    });
    expect(saved.maintenanceGeneration).toBe(1);
  });

  test('rejects pre-fence attempt requests and receipts after lease revocation and release', async () => {
    store = maintenanceStore();
    const saved = commitHostState(fixture());
    const staleRequest = attemptRequest(saved);
    const started = store.claimWorkflowAttempt(staleRequest);
    store.completeWorkflowAttempt(started, { ok: true });
    const revoke = next();
    revoke.nextWork.lease = null;
    firstTicket(revoke.nextLedger).generation = 2;
    revokeTicket(revoke.nextLedger);
    commitHostState(revoke);
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    await store.releaseMaintenanceFence(fence);
    expect(() => store.claimWorkflowAttempt(staleRequest)).toThrow(/maintenance generation/);
    expect(() => store.completeWorkflowAttempt(started, { ok: true })).toThrow(/maintenance generation/);
    expect(() => store.markWorkflowAttemptUncertain(started)).toThrow(/maintenance generation/);
  });

  test('survives restart, blocks working access and rejects forged or stale tokens', async () => {
    store = maintenanceStore();
    const first = store.acquireMaintenanceFence(maintenanceBinding());
    expect(first.fence).toMatchObject({ status: 'held', generation: 1, revision: 1 });
    expect(first.fence.token_digest).not.toBe(first.token);
    expect(store.readMaintenanceFence()).toEqual(first.fence);
    expect(() => store.readHostStateSnapshot(identity)).toThrow(/maintenance fence/);
    expect(() => commitHostState(fixture())).toThrow(/maintenance fence/);
    expect(() => store.reserveOperation('operations', operationKey, requestDigest)).toThrow(/maintenance fence/);
    const competing = new Database(databasePath, { strict: true });
    handles.push(competing);
    const other = maintenanceStore(competing);
    expect(() => other.acquireMaintenanceFence(maintenanceBinding())).toThrow(/already held/);
    expect(() => other.assertMaintenanceFence({ ...first, token: randomUUID() })).toThrow(/stale or forged/);
    expect(() => other.assertMaintenanceFence({ ...first, fence: { ...first.fence, generation: 2 } })).toThrow(
      /stale or forged/,
    );
    expect(() =>
      other.assertMaintenanceFence({
        ...first,
        fence: { ...first.fence, binding: { ...first.fence.binding, project_ids: ['foreign'] } },
      }),
    ).toThrow(/stale or forged/);
    competing.close();
    handles.pop();
    reopenStore();
    store = maintenanceStore();
    expect(store.assertMaintenanceFence(first)).toEqual(first.fence);
    expect((await store.releaseMaintenanceFence(first)).status).toBe('released');
    await Promise.resolve(expect(store.releaseMaintenanceFence(first)).rejects.toThrow(/stale or forged/));
    expect(() => store.assertMaintenanceFence(first)).toThrow(/stale or forged/);
    const second = store.acquireMaintenanceFence(maintenanceBinding());
    expect(second.fence.generation).toBe(2);
    expect(second.token).not.toBe(first.token);
    expect(() => store.assertMaintenanceFence(first)).toThrow(/stale or forged/);
    await store.releaseMaintenanceFence(second);
  });

  test('rejects acquisition while a work lease is active', () => {
    store = maintenanceStore();
    const saved = commitHostState(fixture());
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(/active work lease/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    expect(store.readMaintenanceFence()).toBeNull();
  });

  test('rejects acquisition while a governance operation is unresolved', async () => {
    store = maintenanceStore();
    const reservation = reserveRequiredOperation(store, 'operations', operationKey, requestDigest);
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(/governance is not quiescent/);
    store.transitionOperation(reservation, 'commit_unknown');
    expect(() => store.acquireMaintenanceFence(maintenanceBinding())).toThrow(/governance is not quiescent/);
    store.transitionOperation(reservation, 'applied', resultDigest);
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    expect(receipt.fence.status).toBe('held');
    await store.releaseMaintenanceFence(receipt);
  });

  test('requires an authoritative closure verifier and fences reconciliation control mutations', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, undefined, {
      principal: 'fixture:maintenance-host',
      projectIds: ['project'],
      verify: () => null,
    });
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const seed = fixture();
    const binding = reconciliationBinding({ workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) } });
    expect(() => store.openReconciliationGate(binding)).toThrow(/maintenance receipt required/);
    expect(() => {
      Reflect.apply(store.openReconciliationGate.bind(store), undefined, [binding, null]);
    }).toThrow(/maintenance receipt required/);
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding)).toThrow(
      /maintenance receipt required/,
    );
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, receipt)).toThrow(
      /imported work lease blocks maintenance/,
    );
    await Promise.resolve(
      expect(store.releaseMaintenanceFence(receipt)).rejects.toThrow(/closure verification failed/),
    );
    expect(requiredValue(store.readMaintenanceFence(), 'held maintenance fence').status).toBe('held');
  });

  test('imports quiesced state only with the held maintenance receipt', async () => {
    store = maintenanceStore();
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    firstClaim(seed.nextLedger).status = 'released';
    firstTicket(seed.nextLedger).status = 'released';
    firstTicket(seed.nextLedger).active_resources = [];
    firstTicket(seed.nextLedger).expires_at = null;
    const binding = reconciliationBinding({ workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) } });
    for (const field of ['operation_id', 'manifest_digest', 'request_digest', 'bindings_digest', 'closure_digest']) {
      const changed = { ...binding, [field]: field === 'operation_id' ? 'different-operation' : '0'.repeat(64) };
      expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, changed, receipt)).toThrow(
        /maintenance fence does not bind reconciliation gate/,
      );
    }
    expect(database.query<ScalarCountRow, []>('SELECT COUNT(*) AS count FROM agent_host_state').get()?.count).toBe(0);
    const gate = store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, receipt);
    expect(gate.status).toBe('open');
    expect(() => store.readHostStateSnapshot(identity)).toThrow(/maintenance fence/);
    expect((await store.releaseMaintenanceFence(receipt)).status).toBe('released');
    expect(readPresentSnapshot(store, identity).work).toEqual(seed.nextWork);
  });

  test('rejects an imported active task without a lease before creating host state', async () => {
    store = maintenanceStore();
    const receipt = store.acquireMaintenanceFence(maintenanceBinding());
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    seed.nextWork.execution.status = 'active';
    const activeBinding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, activeBinding, receipt)).toThrow(
      /imported active work requires a lease/,
    );
    expect(database.query<ScalarCountRow, []>('SELECT COUNT(*) AS count FROM agent_host_state').get()?.count).toBe(0);
    seed.nextWork.execution.status = 'suspended';
    const suspendedBinding = reconciliationBinding({
      workVersion: { revision: 1, digest: canonicalJsonDigest(seed.nextWork) },
    });
    expect(store.importReconciledHostState([seed.nextWork], seed.nextLedger, suspendedBinding, receipt).status).toBe(
      'open',
    );
    await store.releaseMaintenanceFence(receipt);
  });

  test('binds a held maintenance fence to gate opening and restore transitions', async () => {
    store = maintenanceStore();
    const seed = fixture();
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const saved = commitHostState(seed);
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    const binding = reconciliationBinding(saved);
    const wrong = { ...binding, closure_digest: '0'.repeat(64) };
    for (const field of ['manifest_digest', 'bindings_digest', 'closure_digest']) {
      expect(() => store.openReconciliationGate({ ...binding, [field]: '0'.repeat(64) }, fence)).toThrow(
        /maintenance fence does not bind/,
      );
    }
    expect(store.readReconciliationGate()).toBeNull();
    expect(store.openReconciliationGate(binding, fence).status).toBe('open');
    expect(() => store.reserveReconciliationRestore(wrong, fence)).toThrow(/maintenance fence does not bind/);
    expect(requiredValue(store.readReconciliationGate(), 'open reconciliation gate').status).toBe('open');
    const reservation = store.reserveReconciliationRestore(binding, fence);
    expect(() => store.completeReconciliationRestore({ ...reservation, binding: wrong }, fence)).toThrow(
      /maintenance fence does not bind/,
    );
    expect(requiredValue(store.readReconciliationGate(), 'restoring reconciliation gate').status).toBe('restoring');
    expect(store.completeReconciliationRestore(reservation, fence).status).toBe('restored');
    await store.releaseMaintenanceFence(fence);
  });
});

describe('host-owned reconciliation rollback gate', () => {
  test('imports a reconciled current-v1 revision and its gate in one transaction', async () => {
    const seed = fixture();
    seed.nextWork.revision = 7;
    seed.nextWork.lifecycle.revision = 7;
    seed.nextLedger.revision = 9;
    expect(() => commitHostState(seed)).toThrow(/advance exactly once/);
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const binding = reconciliationBinding({
      workVersion: { revision: 7, digest: canonicalJsonDigest(seed.nextWork) },
    });
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    const gate = store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence);
    expect(gate.status).toBe('open');
    expect(store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toEqual(gate);
    reopenStore();
    store = maintenanceStore();
    expect(store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toEqual(gate);
    expect(() =>
      store.importReconciledHostState(
        [seed.nextWork],
        seed.nextLedger,
        {
          ...binding,
          manifest_digest: '6'.repeat(64),
        },
        fence,
      ),
    ).toThrow(/maintenance fence does not bind reconciliation gate/);
    database
      .query<never, [string, string]>("UPDATE agent_host_state SET digest=? WHERE workspace_id=? AND kind='work'")
      .run('0'.repeat(64), workspace);
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toThrow();
    database
      .query<never, [string, string]>("UPDATE agent_host_state SET digest=? WHERE workspace_id=? AND kind='work'")
      .run(canonicalJsonDigest(seed.nextWork), workspace);
    await store.releaseMaintenanceFence(fence);
    expect(readPresentSnapshot(store, identity).work).toEqual(seed.nextWork);
    expect(readPresentSnapshot(store, identity).ledger).toEqual(seed.nextLedger);
    const updated = commitHostState(next());
    const secondFence = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, secondFence)).toThrow(
      /already exists/,
    );
    await store.releaseMaintenanceFence(secondFence);
    expect(requiredValue(store.readReconciliationGate(), 'updated reconciliation gate').closed_work_version).toEqual(
      updated.workVersion,
    );
    expect(() => store.reserveReconciliationRestore(binding, undefined, 2)).toThrow(/closed/);
  });

  test('sorts multiple imported work versions by canonical identity before binding the gate', async () => {
    const first = fixture();
    first.nextWork.revision = 7;
    first.nextWork.lifecycle.revision = 7;
    first.nextLedger.revision = 9;
    const second = fixture('other', 'file:src/other.ts');
    second.nextWork.revision = 3;
    second.nextWork.lifecycle.revision = 3;
    const ledger = clone(first.nextLedger);
    ledger.next_sequence = 3;
    ledger.tickets.push({ ...clone(firstTicket(second.nextLedger)), sequence: 2 });
    ledger.claims.push(...clone(second.nextLedger.claims));
    quiesceImportedState([first.nextWork, second.nextWork], ledger);
    const firstIdentity = identity;
    const secondIdentity = { ...identity, work_id: 'other' };
    const binding = {
      ...reconciliationBinding({ workVersion: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } }),
      work: [
        { identity: secondIdentity, version: { revision: 3, digest: canonicalJsonDigest(second.nextWork) } },
        { identity: firstIdentity, version: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } },
      ],
    };
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    const gate = store.importReconciledHostState([first.nextWork, second.nextWork], ledger, binding, fence);
    expect(gate.binding.work.map((item) => item.identity.work_id)).toEqual(['other', 'work']);
    await store.releaseMaintenanceFence(fence);
  });

  test('failed gate insert rolls back every imported row', async () => {
    const seed = fixture();
    seed.nextWork.revision = 7;
    seed.nextWork.lifecycle.revision = 7;
    quiesceImportedState([seed.nextWork], seed.nextLedger);
    const binding = reconciliationBinding({
      workVersion: { revision: 7, digest: canonicalJsonDigest(seed.nextWork) },
    });
    database.exec(
      "CREATE TRIGGER deny_gate_import BEFORE INSERT ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected import failure'); END",
    );
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    expect(() => store.importReconciledHostState([seed.nextWork], seed.nextLedger, binding, fence)).toThrow(
      /injected import failure/,
    );
    await store.releaseMaintenanceFence(fence);
    expect(store.readHostStateSnapshot(identity)).toEqual({
      work: null,
      ledger: null,
      workVersion: null,
      ledgerVersion: null,
      maintenanceGeneration: 1,
    });
    expect(store.readReconciliationGate()).toBeNull();
  });

  test('first paired work CAS closes the gate in the same durable transaction', () => {
    const saved = commitHostState(fixture());
    const binding = reconciliationBinding(saved);
    const gate = store.openReconciliationGate(binding);
    expect(store.openReconciliationGate(binding)).toEqual(gate);
    expect(() => store.openReconciliationGate({ ...binding, manifest_digest: '6'.repeat(64) })).toThrow();
    const updated = commitHostState(next(saved));
    expect(store.readReconciliationGate()).toMatchObject({
      status: 'closed',
      closed_work_version: updated.workVersion,
      closed_ledger_version: updated.ledgerVersion,
    });
    reopenStore();
    expect(requiredValue(store.readReconciliationGate(), 'closed reconciliation gate').status).toBe('closed');
    expect(() => store.reserveReconciliationRestore(binding)).toThrow(/closed/);
  });

  test('opening the reconciliation gate requires quiescent governance', () => {
    const saved = commitHostState(fixture());
    const binding = reconciliationBinding(saved);
    const operation = reserveRequiredOperation(store, 'operations', operationKey, requestDigest);
    expect(operation).not.toBeNull();
    expect(() => store.openReconciliationGate(binding)).toThrow(/governance is not quiescent/);
    expect(store.readReconciliationGate()).toBeNull();
    store.transitionOperation(operation, 'commit_unknown');
    expect(() => store.openReconciliationGate(binding)).toThrow(/governance is not quiescent/);
    expect(store.readReconciliationGate()).toBeNull();
    store.transitionOperation(operation, 'applied', resultDigest);
    expect(store.openReconciliationGate(binding).status).toBe('open');
  });

  test('replaying an open gate cannot bypass a newly reserved operation', () => {
    const saved = commitHostState(fixture());
    const binding = reconciliationBinding(saved);
    const gate = store.openReconciliationGate(binding);
    const operation = reserveRequiredOperation(store, 'operations', operationKey, requestDigest);
    expect(() => store.openReconciliationGate(binding)).toThrow(/governance is not quiescent/);
    expect(store.readReconciliationGate()).toEqual(gate);
    store.transitionOperation(operation, 'commit_unknown');
    store.transitionOperation(operation, 'applied', resultDigest);
    expect(store.openReconciliationGate(binding)).toEqual(gate);
  });

  test('opening the reconciliation gate rejects started and uncertain workflow attempts', () => {
    const saved = commitHostState(fixture());
    const attempt = store.claimWorkflowAttempt(attemptRequest(saved));
    expect(() => store.openReconciliationGate(reconciliationBinding(attempt))).toThrow(
      /workflow attempt is not quiescent/,
    );
    store.markWorkflowAttemptUncertain(attempt);
    const current = readPresentSnapshot(store, identity);
    expect(() => store.openReconciliationGate(reconciliationBinding(current))).toThrow(
      /workflow attempt is not quiescent/,
    );
    expect(store.readReconciliationGate()).toBeNull();
  });

  test('attempt writes close the gate and a failed gate CAS rolls back the work write', () => {
    const saved = commitHostState(fixture());
    const binding = reconciliationBinding(saved);
    store.openReconciliationGate(binding);
    database.exec(
      "CREATE TRIGGER deny_gate_close BEFORE UPDATE ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected gate failure'); END",
    );
    expect(() => store.claimWorkflowAttempt(attemptRequest(saved))).toThrow(/injected gate failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    expect(requiredValue(store.readReconciliationGate(), 'open reconciliation gate').status).toBe('open');
    database.exec('DROP TRIGGER deny_gate_close');
    const attempt = store.claimWorkflowAttempt(attemptRequest(saved));
    expect(attempt.attempt.status).toBe('started');
    expect(requiredValue(store.readReconciliationGate(), 'attempt reconciliation gate').closed_work_version).toEqual(
      attempt.workVersion,
    );
  });

  test('failed gate close rolls back both paired host-state rows', () => {
    const saved = commitHostState(fixture());
    store.openReconciliationGate(reconciliationBinding(saved));
    database.exec(
      "CREATE TRIGGER deny_gate_close BEFORE UPDATE ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected gate failure'); END",
    );
    expect(() => commitHostState(next(saved))).toThrow(/injected gate failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    expect(requiredValue(store.readReconciliationGate(), 'open reconciliation gate').status).toBe('open');
  });

  test('reopened gate rejects a malformed stored binding even with a recomputed checksum', () => {
    const saved = commitHostState(fixture());
    const gate = store.openReconciliationGate(reconciliationBinding(saved));
    const malformed = { ...gate, binding: { ...gate.binding, manifest_digest: 'invalid' } };
    database
      .query<never, SQLQueryBindings[]>('UPDATE agent_host_reconciliation SET payload=?,digest=? WHERE workspace_id=?')
      .run(canonicalJson(malformed), canonicalJsonDigest(malformed), workspace);
    reopenStore();
    expect(() => store.readReconciliationGate()).toThrow(/binding invalid/);
    expect(() => commitHostState(next(saved))).toThrow(/binding invalid/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('restore reservation fences work writes before filesystem recovery and survives restart', () => {
    const saved = commitHostState(fixture());
    const binding = reconciliationBinding(saved);
    store.openReconciliationGate(binding);
    const reservation = store.reserveReconciliationRestore(binding);
    expect(reservation.status).toBe('restoring');
    expect(store.reserveReconciliationRestore(binding)).toEqual(reservation);
    expect(() => commitHostState(next(saved))).toThrow(/blocked during reconciliation restore/);
    expect(() => store.claimWorkflowAttempt(attemptRequest(saved))).toThrow(/blocked during reconciliation restore/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    reopenStore();
    expect(store.readReconciliationGate()).toEqual(reservation);
    expect(() => store.completeReconciliationRestore({ ...reservation, fencing_token: 'forged' })).toThrow(/fencing/);
    expect(store.completeReconciliationRestore(reservation).status).toBe('restored');
    expect(() => commitHostState(next(saved))).toThrow(/blocked during reconciliation restore/);
  });

  test('restore waits for governance quiescence and fences every governance write across restart', async () => {
    const saved = commitHostState(fixture());
    const binding = reconciliationBinding(saved);
    store.openReconciliationGate(binding);
    const operation = reserveRequiredOperation(store, 'operations', operationKey, requestDigest);
    expect(operation).not.toBeNull();
    expect(() => store.reserveReconciliationRestore(binding)).toThrow(/governance is not quiescent/);
    store.transitionOperation(operation, 'commit_unknown');
    expect(() => store.reserveReconciliationRestore(binding)).toThrow(/governance is not quiescent/);
    store.transitionOperation(operation, 'applied', resultDigest);
    const reservation = store.reserveReconciliationRestore(binding);
    expect(() => store.reserveOperation('operations', '9'.repeat(64), requestDigest)).toThrow(
      /governance write blocked during reconciliation restore/,
    );
    expect(() => store.transitionOperation(operation, 'applied', resultDigest)).toThrow(
      /governance write blocked during reconciliation restore/,
    );
    let callbackCalled = false;
    await Promise.resolve(
      expect(
        store.consumeApproval('approvals', approvalBinding(), async () => {
          callbackCalled = true;
        }),
      ).rejects.toThrow(/governance write blocked during reconciliation restore/),
    );
    expect(callbackCalled).toBe(false);
    expect(store.inspectOperation('operations', operationKey)?.status).toBe('applied');
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    reopenStore();
    expect(store.readReconciliationGate()).toEqual(reservation);
    expect(store.inspectOperation('operations', operationKey)?.status).toBe('applied');
    expect(store.completeReconciliationRestore(reservation).status).toBe('restored');
    expect(() => store.reserveOperation('operations', '9'.repeat(64), requestDigest)).toThrow(
      /governance write blocked during reconciliation restore/,
    );
  });
});

describe('host SQLite governance persistence', () => {
  test('rejects malformed namespaces and approval records before any persistent state exists', async () => {
    for (const storeId of ['', '../other', 'a'.repeat(129), 123])
      expect(() => {
        Reflect.apply(store.reserveOperation.bind(store), undefined, [storeId, operationKey, requestDigest]);
      }).toThrow(/namespace/);
    expect(() => store.reserveOperation('operations', 'invalid', requestDigest)).toThrow(/namespace/);
    expect(() => store.reserveOperation('operations', operationKey, 'invalid')).toThrow(/digest/);
    const malformedApproval = { ...approvalBinding() };
    setFixtureField(malformedApproval, 'extra', true);
    await Promise.resolve(
      expect(store.consumeApproval('approvals', malformedApproval, async () => {})).rejects.toThrow(
        /^host workflow approval record is invalid$/,
      ),
    );
    expect(governanceRows()).toEqual([]);
    expect(database.query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores').all()).toEqual([]);
  });
  test('reservation and strict terminal transitions survive reopening without changing work or coordination', () => {
    const before = commitHostState(fixture());
    const reservation = reserveRequiredOperation(store, 'operations', operationKey, requestDigest);
    expect(store.reserveOperation('operations', operationKey, requestDigest)).toBeNull();
    expect(() => store.transitionOperation(reservation, 'applied', resultDigest)).toThrow(/state conflict/);
    reopenStore();
    expect(store.inspectOperation('operations', operationKey)).toEqual(reservation);
    store.transitionOperation(reservation, 'commit_unknown');
    expect(() => store.transitionOperation(reservation, 'aborted')).toThrow(/state conflict/);
    reopenStore();
    expect(requiredValue(store.inspectOperation('operations', operationKey), 'commit unknown operation').status).toBe(
      'commit_unknown',
    );
    store.transitionOperation(reservation, 'applied', resultDigest);
    const rows = governanceRows();
    store.transitionOperation(reservation, 'applied', resultDigest);
    expect(governanceRows()).toEqual(rows);
    expect(() => store.transitionOperation(reservation, 'applied', requestDigest)).toThrow(/result conflict/);
    reopenStore();
    expect(store.inspectOperation('operations', operationKey)).toMatchObject({
      status: 'applied',
      result_digest: resultDigest,
      terminal_revision: 3,
    });
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
  });
  test('pre-commit abort is terminal and namespace ownership cannot be substituted', async () => {
    const first = reserveRequiredOperation(store, 'first', operationKey, requestDigest);
    const other = reserveRequiredOperation(store, 'second', operationKey, requestDigest);
    const adapter = createHostOperationReservationStore(store.governanceCapability, 'first');
    expect(adapter.scope).toBe('host-sqlite');
    expect(adapter.host_capability).toBeUndefined();
    expect(() => adapter.abort(other)).toThrow(/different store/);
    await adapter.abort(first);
    expect(() => adapter.markCommitStarted(first)).toThrow(/state conflict/);
    expect(() => adapter.complete(first, resultDigest)).toThrow(/state conflict/);
    expect(store.inspectOperation('second', operationKey)).toEqual(other);
    const foreign = new HostStateStore(database, 'b'.repeat(64));
    expect(foreign.inspectOperation('first', operationKey)).toBeNull();
    expect(() => foreign.transitionOperation(first, 'aborted')).toThrow(/missing/);
  });
  test.each(['fencing_token', 'request_digest', 'created_at', 'revision'])(
    'rejects a forged reservation %s without changing persisted bytes',
    (field) => {
      const reserved = reserveRequiredOperation(store, 'operations', operationKey, requestDigest);
      const forged = {
        ...reserved,
        [field]: {
          fencing_token: '00000000-0000-0000-0000-000000000000',
          request_digest: resultDigest,
          created_at: '2020-01-01T00:00:00.000Z',
          revision: 2,
        }[field],
      };
      const rows = governanceRows();
      expect(() => store.transitionOperation(forged, 'commit_unknown')).toThrow(/fencing/);
      expect(governanceRows()).toEqual(rows);
    },
  );
  test('corrupt payload, row identity, revision or store identity fails closed', () => {
    store.reserveOperation('operations', operationKey, requestDigest);
    const original = requiredValue(governanceRows()[0], 'original governance row');
    const corruptions: readonly { column: string; value: SQLQueryBindings }[] = [
      { column: 'payload', value: '{}' },
      { column: 'revision', value: 8 },
      { column: 'digest', value: '0'.repeat(64) },
    ];
    for (const { column, value } of corruptions) {
      database.query<never, [SQLQueryBindings]>(`UPDATE agent_host_governance SET ${column}=?`).run(value);
      const corruptRows = governanceRows();
      const corruptStores = database
        .query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores')
        .all();
      expect(() => store.inspectOperation('operations', operationKey)).toThrow();
      expect(governanceRows()).toEqual(corruptRows);
      expect(database.query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores').all()).toEqual(
        corruptStores,
      );
      const originalValues: Readonly<Record<string, SQLQueryBindings>> = {
        payload: original.payload,
        revision: original.revision,
        digest: original.digest,
      };
      const originalValue = requiredValue(originalValues[column], `original governance ${column}`);
      database.query<never, [SQLQueryBindings]>(`UPDATE agent_host_governance SET ${column}=?`).run(originalValue);
    }
    database.query<never, [string]>('UPDATE agent_host_governance SET store_id=?').run('foreign');
    const foreignRows = governanceRows();
    expect(() => store.inspectOperation('foreign', operationKey)).toThrow(/row integrity/);
    expect(governanceRows()).toEqual(foreignRows);
    database.query<never, [string]>('UPDATE agent_host_governance SET store_id=?').run('operations');
    database.query<never, [string]>('UPDATE agent_host_governance_stores SET digest=?').run('0'.repeat(64));
    const corruptStoreRows = database
      .query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores')
      .all();
    const corruptGovernanceRows = governanceRows();
    expect(() => store.inspectOperation('operations', operationKey)).toThrow(/identity/);
    expect(governanceRows()).toEqual(corruptGovernanceRows);
    expect(database.query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores').all()).toEqual(
      corruptStoreRows,
    );
  });
  test('SQLite insert/transition failures roll back and preserve the external-effect boundary', async () => {
    database.exec(
      "CREATE TRIGGER reject_governance_insert BEFORE INSERT ON agent_host_governance BEGIN SELECT RAISE(ABORT,'injected insert failure'); END",
    );
    expect(() => store.reserveOperation('operations', operationKey, requestDigest)).toThrow(/injected/);
    expect(governanceRows()).toEqual([]);
    expect(database.query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores').all()).toEqual([]);
    database.exec('DROP TRIGGER reject_governance_insert');
    database.exec(
      "CREATE TRIGGER reject_governance_update BEFORE UPDATE ON agent_host_governance BEGIN SELECT RAISE(ABORT,'injected transition failure'); END",
    );
    let calls = 0;
    await Promise.resolve(
      expect(
        store.consumeApproval('approvals', approvalBinding(), async () => {
          calls++;
        }),
      ).rejects.toThrow(/injected/),
    );
    expect(calls).toBe(0);
    expect(parseJsonRecord(governanceRows()[0]?.payload ?? '').status).toBe('reserved');
    database.exec('DROP TRIGGER reject_governance_update');
    await Promise.resolve(
      expect(
        store.consumeApproval('approvals', approvalBinding(), async () => {
          calls++;
        }),
      ).rejects.toThrow(/replay/),
    );
    expect(calls).toBe(0);
  });
  test('approval commits its unknown marker before callback and never replays a successful or throwing callback', async () => {
    let calls = 0;
    const apply = async () => {
      calls++;
      expect(database.inTransaction).toBe(false);
      expect(parseJsonRecord(governanceRows().find((row) => row.kind === 'approval')?.payload ?? '').status).toBe(
        'commit_unknown',
      );
    };
    await store.consumeApproval('approvals', approvalBinding(), apply);
    expect(parseJsonRecord(governanceRows()[0]?.payload ?? '').status).toBe('applied');
    const generation = parseJsonRecord(governanceRows()[0]?.payload ?? '').store_generation;
    reopenStore();
    await Promise.resolve(
      expect(store.consumeApproval('approvals', approvalBinding(), apply)).rejects.toThrow(/replay/),
    );
    const second = { ...approvalBinding(), approval_id: 'approval-2' };
    await Promise.resolve(
      expect(
        store.consumeApproval('approvals', second, async () => {
          calls++;
          throw new Error('external outcome unknown');
        }),
      ).rejects.toThrow(/external outcome/),
    );
    expect(governanceRows().map((row) => parseJsonRecord(row.payload).store_generation)).toEqual([
      generation,
      generation,
    ]);
    reopenStore();
    await Promise.resolve(expect(store.consumeApproval('approvals', second, apply)).rejects.toThrow(/replay/));
    expect(calls).toBe(2);
  });
  test('undefined approval callback rejection leaves durable UNKNOWN and cannot be retried', async () => {
    const binding = { ...approvalBinding(), approval_id: 'approval-undefined' };
    let calls = 0;
    const rejection = await rejectionReason(
      store.consumeApproval('approvals', binding, async () => {
        calls++;
        throw undefined;
      }),
    );
    expect(rejection).toBeUndefined();
    expect(calls).toBe(1);

    const approvalRecord = () =>
      requiredValue(
        governanceRows()
          .map((row) => parseJsonRecord(row.payload))
          .find((row) => recordAt(row, 'binding').approval_id === binding.approval_id),
        'undefined outcome approval receipt',
      );
    expect(approvalRecord().status).toBe('commit_unknown');
    reopenStore();
    expect(approvalRecord().status).toBe('commit_unknown');
    const retainedRows = governanceRows();
    const retainedStores = database
      .query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores')
      .all();
    const retryFailure = await rejectionReason(
      store.consumeApproval('approvals', binding, async () => {
        calls++;
      }),
    );
    expect(retryFailure).toBeInstanceOf(Error);
    if (!(retryFailure instanceof Error)) throw new Error('UNKNOWN approval replay must return a typed denial.');
    expect(retryFailure.message).toBe('workflow approval receipt replay or commit unknown');
    expect(calls).toBe(1);
    expect(governanceRows()).toEqual(retainedRows);
    expect(database.query<GovernanceStoreSqlRow, []>('SELECT * FROM agent_host_governance_stores').all()).toEqual(
      retainedStores,
    );
    expect(approvalRecord().status).toBe('commit_unknown');
  });
  test('failed final approval commit leaves an inspectable unknown outcome after reopen', async () => {
    database.exec(
      "CREATE TRIGGER reject_approval_final BEFORE UPDATE ON agent_host_governance WHEN NEW.revision=3 BEGIN SELECT RAISE(ABORT,'final commit failure'); END",
    );
    let calls = 0;
    await Promise.resolve(
      expect(
        store.consumeApproval('approvals', approvalBinding(), async () => {
          calls++;
        }),
      ).rejects.toThrow(/final commit/),
    );
    reopenStore();
    expect(parseJsonRecord(governanceRows()[0]?.payload ?? '').status).toBe('commit_unknown');
    await Promise.resolve(
      expect(
        store.consumeApproval('approvals', approvalBinding(), async () => {
          calls++;
        }),
      ).rejects.toThrow(/replay/),
    );
    expect(calls).toBe(1);
  });
  test('another connection cannot consume an approval while its callback is in flight', async () => {
    const otherDb = new Database(databasePath, { strict: true });
    handles.push(otherDb);
    const other = new HostStateStore(otherDb, workspace);
    let release!: () => void;
    let calls = 0;
    const pending = store.consumeApproval('approvals', approvalBinding(), async () => {
      calls++;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    await Promise.resolve(
      expect(
        other.consumeApproval('approvals', approvalBinding(), async () => {
          calls++;
        }),
      ).rejects.toThrow(/replay/),
    );
    release();
    await pending;
    expect(calls).toBe(1);
  });
  test('opaque governance capability is pinned and cannot be fabricated or paired with a different attempt store', async () => {
    expect(() => {
      Reflect.apply(createHostOperationReservationStore, undefined, [{}]);
    }).toThrow(/opaque/);
    const capability = store.governanceCapability;
    expect(() => {
      setFixtureField(store, 'governanceCapability', {});
    }).toThrow();
    const adapter = createHostOperationReservationStore(capability, 'operations');
    const reservation = reserveRequiredOperation(store, 'operations', operationKey, requestDigest);
    store.transitionOperation = () => {
      throw new Error('replaced method');
    };
    await adapter.markCommitStarted(reservation);
    const other = new HostStateStore(database, workspace);
    expect(() =>
      invokeMalformedTrustedHostInput({
        authentication: {
          schema: 'TrustedHostAuthentication/v1',
          repositoryRoot: root,
          repositoryId: 'project-repository',
          projectIds: ['project'],
          integrationsDigest: 'e'.repeat(64),
          principal: 'fixture:host',
          configRevision: 1,
          permittedOperations: ['workflow'],
        },
        services: {
          governanceCapability: capability,
          workflowAttempts: other,
          resolveIdentity: () => null,
          verifyApproval: () => null,
          runtimeRevision: () => ({}),
          casWriter: () => {},
        },
      }),
    ).toThrow(/same|share one/);
  });
  test('workflow attempts require the same explicit governance owner for operation reservations', () => {
    const authentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: 'project-repository',
      projectIds: ['project'],
      integrationsDigest: 'e'.repeat(64),
      principal: 'fixture:host',
      configRevision: 1,
      permittedOperations: ['workflow'],
    };
    const services = {
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({}),
      casWriter: () => {},
    };
    expect(() =>
      invokeMalformedTrustedHostInput({
        authentication,
        services: { ...services, workflowAttempts: store },
      }),
    ).toThrow(/share one host state owner/);
    expect(() => invokeMalformedTrustedHostInput({ authentication, services })).not.toThrow();
    const attemptsWithoutOwner = {
      claimWorkflowAssignment: store.claimWorkflowAssignment.bind(store),
      completeWorkflowAttempt: store.completeWorkflowAttempt.bind(store),
      markWorkflowAttemptUncertain: store.markWorkflowAttemptUncertain.bind(store),
      abortUnstartedWorkflowAttempt: store.abortUnstartedWorkflowAttempt.bind(store),
    };
    expect(() =>
      invokeMalformedTrustedHostInput({
        authentication,
        services: { ...services, workflowAttempts: attemptsWithoutOwner },
      }),
    ).toThrow(/share one host state owner/);
  });
  test('trusted host rejects malformed attempt persistence before issuing a launcher capability', () => {
    const authentication = {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: root,
      repositoryId: 'project-repository',
      projectIds: ['project'],
      integrationsDigest: 'e'.repeat(64),
      principal: 'fixture:host',
      configRevision: 1,
      permittedOperations: ['workflow'],
    };
    const services = {
      governanceCapability: store.governanceCapability,
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({}),
      casWriter: () => {},
    };
    for (const workflowAttempts of [null, 1, 'attempts']) {
      expect(() =>
        invokeMalformedTrustedHostInput({
          authentication,
          services: { ...services, workflowAttempts },
        }),
      ).toThrow(/trusted attempt persistence service is invalid/);
    }
    const methods = {
      governanceCapability: store.governanceCapability,
      claimWorkflowAssignment: () => {},
      completeWorkflowAttempt: () => {},
      markWorkflowAttemptUncertain: () => {},
      abortUnstartedWorkflowAttempt: () => {},
    };
    for (const method of [
      'claimWorkflowAssignment',
      'completeWorkflowAttempt',
      'markWorkflowAttemptUncertain',
      'abortUnstartedWorkflowAttempt',
    ]) {
      const workflowAttempts = { ...methods };
      Reflect.deleteProperty(workflowAttempts, method);
      expect(() =>
        invokeMalformedTrustedHostInput({
          authentication,
          services: { ...services, workflowAttempts },
        }),
      ).toThrow(/trusted attempt persistence service is invalid/);
    }
    expect(() =>
      invokeMalformedTrustedHostInput({
        authentication,
        services: { ...services, workflowAttempts: { ...methods, reconciliationPrincipal: '' } },
      }),
    ).toThrow(/trusted reconciliation principal is required/);
    for (const service of [
      'resolveWorkExecutionContext',
      'dispatchWorkflowAssignment',
      'validateWorkflowAssignmentResult',
      'resolveWorkflowWorkItem',
    ]) {
      expect(() =>
        invokeMalformedTrustedHostInput({
          authentication,
          services: { ...services, [service]: true },
        }),
      ).toThrow(/invalid/);
    }
    for (const method of [
      'claimWorkflowAssignmentWithApproval',
      'beginWorkflowAttemptEffect',
      'completeWorkflowAttemptWithApproval',
    ]) {
      expect(() =>
        invokeMalformedTrustedHostInput({
          authentication,
          services: { ...services, workflowAttempts: { ...methods, [method]: true } },
        }),
      ).toThrow(/trusted protected attempt persistence service is invalid/);
    }
  });
});

describe('current-v1 paired host state on real Bun SQLite', () => {
  test('recognizes only genuine host state store instances', () => {
    expect(HostStateStore.isHostStateStore(store)).toBe(true);
    expect(HostStateStore.isHostStateStore({})).toBe(false);
    expect(HostStateStore.isHostStateStore(null)).toBe(false);
  });

  const workflowCases: readonly (readonly [string, FlowIntent, WorkItemKind, string, string])[] = [
    ['information_research_light', 'information_research', 'research', 'internal', 'Research'],
    ['implementation_new', 'implementation_new', 'feature', 'azure', 'Feature'],
    ['implementation_change', 'implementation_change', 'feature', 'azure', 'Feature'],
    ['bug_fix', 'bug_fix', 'bug', 'azure', 'Bug'],
    ['task_execution', 'task_execution', 'task', 'azure', 'Task'],
  ];
  test.each(workflowCases)(
    'real Mastra + SQLite executes and resumes %s without repeated dispatch (fixture host identity)',
    async (workflowId, intent, kind, provider, providerType) => {
      await mkdir(path.join(root, 'docs'), { recursive: true });
      createInitializationBundle(
        path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
        root,
        ['schemas', 'instructions', 'TESTING.md'],
        'runtime',
      );
      const yaml = (
        await readFile(new URL('../../templates/agent-runtime.config.template.v1.yaml', import.meta.url), 'utf8')
      )
        .replaceAll('{{BUNDLE}}', 'runtime')
        .replaceAll('{{REPOSITORY}}', identity.repository_id)
        .replaceAll('{{PROJECT}}', firstOf(identity.project_ids, 'workflow project identity'));
      await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), yaml);
      const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
      await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
      await writeFile(
        path.join(root, policyPath),
        `${JSON.stringify(
          {
            schema: 'DocumentationPolicy/v1',
            policy_id: 'workflow-host-fixture',
            project_id: firstOf(identity.project_ids, 'workflow project identity'),
            source_path: policyPath,
            owner: 'workflow-test',
            required: false,
            canonical_roots: ['docs'],
            map_paths: ['AGENT.sidecar.md'],
            excluded_roots: [],
            changelog_required: false,
            changelog_path: null,
            relations: ['documents'],
            updated_at: '2026-09-28T00:00:00.000Z',
          },
          null,
          2,
        )}\n`,
      );
      await writeFile(path.join(root, 'AGENTS.md'), '# Generic integration fixture\n');
      await writeFile(path.join(root, 'AGENT.sidecar.md'), '# Fixture project\n');
      const config = loadRuntimeConfig(root);
      identity.integrations_digest = loadProjectSetContext(
        root,
        config,
        identity.repository_id,
        identity.project_ids,
      ).integrations_digest;
      const workItem = {
        schema: 'WorkItem/v1',
        id: 'external-work',
        provider,
        provider_type: providerType,
        canonical_kind: kind,
        intent,
        project_id: firstOf(identity.project_ids, 'workflow fixture project'),
        title: 'Durable integration',
        description: '',
        labels: [],
        risk_flags: [],
      };
      const initial = fixture();
      Object.assign(initial.nextWork.binding, {
        integrations_digest: identity.integrations_digest,
        team_id: 'default-development',
        workflow_id: workflowId,
        work_item_digest: canonicalJsonDigest(workItem),
        config_digest: runtimeConfigDigest(config),
      });
      firstTicket(initial.nextLedger).integrations_digest = identity.integrations_digest;
      initial.nextWork.lifecycle.config_binding.config_digest = initial.nextWork.binding.config_digest;
      initial.nextWork.execution.phase = requiredRuntimeWorkflow(config, workflowId).entry_stage;
      const original = commitHostState(initial);
      let dispatches = 0,
        validations = 0;
      const run = async (stateStore: HostStateStore) => {
        let workflowApprovalStoreId: string | undefined;
        stateStore = new HostStateStore(database, workspace, undefined, undefined, {
          principal: 'fixture:executor',
          verify: async (request) => {
            const unsigned: Parameters<typeof computeEdictumWorkflowApprovalEvidenceDigest>[0] = {
              schema: 'EdictumWorkflowApproval/v1',
              stage_id: request.stage_id,
              approval_id: request.attempt_id,
              approver: 'fixture:executor',
              operation_hash: request.operation_hash,
              tenant: request.identity.repository_id,
              project: firstOf(request.identity.project_ids, 'approval project identity'),
              approved_at: new Date(Date.now() - 1000).toISOString(),
              expires_at: new Date(Date.now() + 60_000).toISOString(),
            };
            return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
          },
        });
        const workflowAttempts = {
          governanceCapability: stateStore.governanceCapability,
          claimWorkflowAssignment: stateStore.claimWorkflowAssignment.bind(stateStore),
          completeWorkflowAttempt: stateStore.completeWorkflowAttempt.bind(stateStore),
          markWorkflowAttemptUncertain: stateStore.markWorkflowAttemptUncertain.bind(stateStore),
          claimWorkflowAssignmentWithApproval: (
            invocation: Parameters<HostStateStore['claimWorkflowAssignmentWithApproval']>[0],
            digest: Parameters<HostStateStore['claimWorkflowAssignmentWithApproval']>[1],
            action: Parameters<HostStateStore['claimWorkflowAssignmentWithApproval']>[2],
          ) =>
            stateStore.claimWorkflowAssignmentWithApproval(
              invocation,
              digest,
              action,
              requiredValue(workflowApprovalStoreId, 'workflow approval store id'),
            ),
          beginWorkflowAttemptEffect: stateStore.beginWorkflowAttemptEffect.bind(stateStore),
          completeWorkflowAttemptWithApproval: stateStore.completeWorkflowAttemptWithApproval.bind(stateStore),
          abortUnstartedWorkflowAttempt: stateStore.abortUnstartedWorkflowAttempt.bind(stateStore),
        };
        // Identity, lifecycle permission and artifact validation are fixture services;
        // Mastra execution and every attempt admission/outcome use the actual store.
        const host = await createTrustedHostComposition(
          createTestTrustedHostLauncherCapability({
            authentication: {
              schema: 'TrustedHostAuthentication/v1',
              repositoryRoot: root,
              repositoryId: identity.repository_id,
              projectIds: identity.project_ids,
              integrationsDigest: identity.integrations_digest,
              principal: 'fixture:executor',
              configRevision: config.config_revision,
              permittedOperations: ['workflow', 'runtime.write'],
            },
            services: {
              governanceCapability: stateStore.governanceCapability,
              workflowAttempts,
              resolveWorkflowWorkItem: () => workItem,
              resolveWorkExecutionContext: (request) => {
                const state = readPresentSnapshot(stateStore, identity),
                  ticket = firstTicket(state.ledger);
                return {
                  schema: 'WorkExecutionContext/v1',
                  binding: state.work.binding,
                  permit: {
                    context_digest: canonicalJsonDigest(state.work.binding),
                    checkpoint_revision: state.workVersion.revision,
                    checkpoint_digest: state.workVersion.digest,
                    runtime_current_revision: 1,
                    stage_id: request.stageId,
                    assignment_index: request.assignmentIndex,
                    dispatch_authorized: true,
                    lease: {
                      ...state.work.lease,
                      ledger_revision: state.ledgerVersion.revision,
                      expires_at: ticket.expires_at,
                      active_resources: ticket.active_resources,
                      blocked_resources: ticket.blocked_resources,
                    },
                  },
                };
              },
              dispatchWorkflowAssignment: (invocation) => {
                dispatches++;
                const attempt = requiredValue(invocation.attempt, 'dispatched workflow attempt');
                expect(attempt.status).toBe('started');
                const persisted = readPresentSnapshot(stateStore, identity).work.execution.assignment_attempts;
                expect(persisted.find((entry) => entry.attempt_id === attempt.attempt_id)).toEqual(attempt);
                return { role: invocation.assignment.role, stage: invocation.stage.id };
              },
              validateWorkflowAssignmentResult: (invocation, result) => {
                validations++;
                expect(result).toEqual({ role: invocation.assignment.role, stage: invocation.stage.id });
                const persisted = readPresentSnapshot(stateStore, identity).work.execution.assignment_attempts;
                const attempt = requiredValue(invocation.attempt, 'validated workflow attempt');
                expect(
                  requiredValue(
                    persisted.find((entry) => entry.attempt_id === attempt.attempt_id),
                    'persisted workflow attempt',
                  ).status,
                ).toBe(attempt.status);
              },
              resolveIdentity: () => null,
              verifyApproval: () => null,
              runtimeRevision: () => ({ sourceRevision: 'runtime-source', currentRevision: 1 }),
              casWriter: () => {
                throw new Error('Integration fixture must not write source');
              },
              timingSink: { record: () => {} },
            },
          }),
        );
        const workflowHost = requiredValue(host.workflowHostCapability, 'workflow host capability');
        workflowApprovalStoreId = workflowHost.storeId;
        const approval = { ...approvalBinding(), approval_id: workflowId };
        if (dispatches === 0) {
          await workflowHost.consumeApproval(approval, async () => {
            const row = requiredValue(
              governanceRows().find((entry) => entry.kind === 'approval'),
              'approval row',
            );
            expect(parseJsonRecord(row.payload).status).toBe('commit_unknown');
          });
        } else {
          await Promise.resolve(
            expect(
              workflowHost.consumeApproval(approval, async () => {
                throw new Error('persisted approval must not invoke another callback');
              }),
            ).rejects.toThrow(/replay/),
          );
        }
        const graph = createConfiguredMastra(
          root,
          {
            team_id: 'default-development',
            work_item: {
              kind,
              intent,
              project: firstOf(identity.project_ids, 'workflow project identity'),
              labels: [],
              risk_flags: [],
            },
          },
          {
            workflowExecutionCapability: requiredValue(
              host.workflowExecutionCapability,
              'workflow execution capability',
            ),
          },
        );
        return graph.dispatch(workItem.id);
      };
      const first = await run(store);
      expect(first.workflowId).toBe(workflowId);
      expect(first.failedAssignments).toEqual([]);
      const expected = requiredRuntimeWorkflow(config, workflowId).stages.flatMap((stage) =>
        stage.assignments.filter((assignment) => !assignment.risk_flags?.length),
      );
      expect(dispatches).toBe(expected.length);
      expect(validations).toBe(expected.length);
      const saved = readPresentSnapshot(store, identity);
      expect(saved.ledgerVersion).toEqual(original.ledgerVersion);
      expect(saved.work.execution.assignment_attempts).toHaveLength(expected.length);
      closeWorkspaceDatabaseWithAdmission(database);
      handles.pop();
      database = new Database(databasePath, { strict: true });
      handles.push(database);
      store = new HostStateStore(database, workspace);
      const resumed = await run(store);
      expect(resumed.failedAssignments).toEqual([]);
      expect(resumed.stageOutputs).toEqual(first.stageOutputs);
      expect(dispatches).toBe(expected.length);
      expect(validations).toBe(expected.length * 2);
      expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    },
  );

  test('verifier principal and function are pinned at store construction', async () => {
    commitHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    const verifier = { principal: 'runtime:test-verifier', verify: reconciliationAuthorization };
    const verified = new HostStateStore(database, workspace, verifier);
    verifier.principal = 'other-machine';
    setFixtureField(verifier, 'verify', () => null);
    expect(() => setFixtureField(verified, 'reconciliationPrincipal', 'other-machine')).toThrow();
    expect(() => Object.defineProperty(verified, 'reconciliationPrincipal', { value: 'other-machine' })).toThrow();
    expect(
      requiredValue(
        (await verified.reconcileWorkflowAttempt(reconciliationRequest(started))).attempt.reconciliation,
        'pinned reconciliation receipt',
      ).principal,
    ).toBe('runtime:test-verifier');
  });

  test('observed completion requires a typed trusted authorization and persists for replay after reopen', async () => {
    commitHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    store.markWorkflowAttemptUncertain(started);
    const request = reconciliationRequest(started);
    const before = readPresentSnapshot(store, identity);
    await Promise.resolve(expect(store.reconcileWorkflowAttempt(request)).rejects.toThrow(/verifier required/));
    for (const response of [null, true, { accepted: true }]) {
      await Promise.resolve(
        expect(invokeMalformedReconciliationResponse(database, request, response)).rejects.toThrow(),
      );
      expect(store.readHostStateSnapshot(identity)).toEqual(before);
    }
    const verified = verifyingStore(database, reconciliationAuthorization);
    const completed = await verified.reconcileWorkflowAttempt(request);
    expect(requiredValue(completed.attempt.reconciliation, 'completed reconciliation receipt').attempt_id).toBe(
      started.attempt.attempt_id,
    );
    expect(completed.attempt.result).toEqual(request.result);
    expect(readPresentSnapshot(verified, identity).ledgerVersion).toEqual(before.ledgerVersion);
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    const other = new HostStateStore(reopened, workspace);
    expect(other.claimWorkflowAttempt(attemptRequest(readPresentSnapshot(other, identity)))).toEqual(completed);
    expect(() => other.completeWorkflowAttempt(started, request.result)).toThrow(/completion binding/);
  });

  test('reconciliation replay after reopen returns the persisted receipt and rejects changed proof inputs', async () => {
    commitHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started);
    const verifierCalls = { count: 0 };
    const verified = verifyingStore(database, (input, state) => {
      verifierCalls.count++;
      return reconciliationAuthorization(input, state);
    });
    const completed = await verified.reconcileWorkflowAttempt(request);
    const beforeReplay = readPresentSnapshot(store, identity);
    reopenStore();
    const reopened = verifyingStore(database, () => {
      verifierCalls.count++;
      throw new Error('replay must not reverify');
    });
    expect(await reopened.reconcileWorkflowAttempt(request)).toEqual(completed);
    expect(reopened.readHostStateSnapshot(identity)).toEqual(beforeReplay);
    expect(verifierCalls.count).toBe(1);
    const changedInputs: readonly WorkflowAttemptReconciliationRequest[] = [
      { ...request, result: { recovered: 'changed' } },
      { ...request, providerEvidence: { ...request.providerEvidence, sha256: '9'.repeat(64) } },
      { ...request, retryLease: { ticket_id: 'ticket-work', thread_id: 'changed', generation: 2 } },
    ];
    for (const changed of changedInputs) {
      await Promise.resolve(expect(reopened.reconcileWorkflowAttempt(changed)).rejects.toThrow(/replay binding/));
      expect(reopened.readHostStateSnapshot(identity)).toEqual(beforeReplay);
    }
    expect(verifierCalls.count).toBe(1);
  });

  test('proven no effect retains predecessor and permits exactly the authorized new fence', async () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const deadline = performance.now() + 5_000;
    const initial = fixture();
    initial.nextWork.contracts.decisions.push(decision);
    commitHostState(initial);
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started, 'no_effect');
    const verified = verifyingStore(database, reconciliationAuthorization);
    await verified.reconcileWorkflowAttempt(request);
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/retry fence/);
    expect(() => store.completeWorkflowAttempt(started, { late: true })).toThrow(/completion binding/);
    const renew = next();
    Object.assign(firstTicket(renew.nextLedger), { thread_id: 'recovery', generation: 2 });
    Object.assign(requiredValue(activeClaimFor(renew.nextLedger), 'active recovery claim'), {
      thread_id: 'recovery',
      generation: 2,
    });
    renew.nextWork.lease = requiredValue(request.retryLease, 'authorized retry lease');
    commitHostState(renew);
    const beforeRetry = readPresentSnapshot(store, identity);
    const retryTemplate = protectedInvocation(beforeRetry);
    // Bind this component invocation to the actual retained attempt, rather than the config's first stage.
    // Both calls below must deny at the Host approval boundary without persisting a new attempt.
    const retryInvocation: HostWorkflowAssignment = {
      ...retryTemplate,
      stage: { ...retryTemplate.stage, id: started.attempt.stage_id },
      workContext: {
        ...retryTemplate.workContext,
        permit: { ...retryTemplate.workContext.permit, stage_id: started.attempt.stage_id },
      },
    };
    const approvalsBeforeRetry = governanceRows();
    await Promise.resolve(
      expect(
        store.claimWorkflowAssignmentWithApproval(retryInvocation, '6'.repeat(64), 'source.write', 'approvals'),
      ).rejects.toThrow('attempt request changed'),
    );
    await Promise.resolve(
      expect(
        store.claimWorkflowAssignmentWithApproval(retryInvocation, '5'.repeat(64), 'source.write', 'approvals'),
      ).rejects.toThrow('trusted workflow approval verifier required'),
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(beforeRetry);
    expect(governanceRows()).toEqual(approvalsBeforeRetry);
    const retry = store.claimWorkflowAttempt(attemptRequest(beforeRetry));
    expect(retry.attempt.previous_attempt_id).toBe(started.attempt.attempt_id);
    expect(retry.attempt.attempt_id).not.toBe(started.attempt.attempt_id);
    expect(() => store.claimWorkflowAttempt(attemptRequest(beforeRetry))).toThrow(/compare-and-swap/);
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/reconciliation/);
    store.completeWorkflowAttempt(retry, 'finished');
    expect(
      readPresentSnapshot(store, identity).work.execution.assignment_attempts.map((entry) => entry.status),
    ).toEqual(['no_effect', 'completed']);
    const prior = readPresentSnapshot(store, identity);
    const sameThreadStarted = store.claimWorkflowAttempt(attemptRequest(prior, 1));
    const sameThreadRequest = reconciliationRequest(sameThreadStarted, 'no_effect');
    const sameThreadLease = requiredValue(sameThreadRequest.retryLease, 'same-thread authorized retry lease');
    expect(sameThreadLease.thread_id).toBe(sameThreadStarted.attempt.lease.thread_id);
    expect(sameThreadLease.generation).toBe(sameThreadStarted.attempt.lease.generation + 1);
    const reconciled = await verified.reconcileWorkflowAttempt(sameThreadRequest);
    expect(reconciled.attempt.reconciliation?.retry_lease).toEqual(sameThreadLease);
    const settled = readPresentSnapshot(store, identity);
    expect(() => store.claimWorkflowAttempt(attemptRequest(settled, 1))).toThrow('retry fence');
    expect(store.readHostStateSnapshot(identity)).toEqual(settled);
    const sameThreadRenewal = next(settled);
    firstTicket(sameThreadRenewal.nextLedger).generation = sameThreadLease.generation;
    requiredValue(activeClaimFor(sameThreadRenewal.nextLedger), 'same-thread active claim').generation =
      sameThreadLease.generation;
    sameThreadRenewal.nextWork.lease = clone(sameThreadLease);
    const renewed = commitHostState(sameThreadRenewal);
    expect(renewed.work.execution.assignment_attempts).toEqual(settled.work.execution.assignment_attempts);
    expect(firstTicket(renewed.ledger).thread_id).toBe(sameThreadStarted.attempt.lease.thread_id);
    expect(firstTicket(renewed.ledger).generation).toBe(sameThreadLease.generation);
    const sameThreadRetry = store.claimWorkflowAttempt(attemptRequest(renewed, 1));
    expect(sameThreadRetry.attempt.previous_attempt_id).toBe(sameThreadStarted.attempt.attempt_id);
    expect(sameThreadRetry.attempt.lease).toEqual(sameThreadLease);
    expect(() => store.completeWorkflowAttempt(sameThreadStarted, { late: true })).toThrow('completion binding');
    store.completeWorkflowAttempt(sameThreadRetry, 'same-thread retry finished');
    const complete = readPresentSnapshot(store, identity);
    expect(complete.work.execution.assignment_attempts.slice(0, 2)).toEqual([
      ...prior.work.execution.assignment_attempts,
    ]);
    expect(complete.work.execution.assignment_attempts.map((entry) => entry.status)).toEqual([
      'no_effect',
      'completed',
      'no_effect',
      'completed',
    ]);
    if (performance.now() >= deadline) throw new Error('Host no-effect retry fixture exceeded its case deadline');
    preserveHostFixtureRoot = false;
  });

  test('no-effect reconciliation replay after reopen binds the decision, evidence, lease and versions', async () => {
    const initial = fixture();
    initial.nextWork.contracts.decisions.push(decision);
    commitHostState(initial);
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started, 'no_effect');
    const verified = verifyingStore(database, reconciliationAuthorization);
    const reconciled = await verified.reconcileWorkflowAttempt(request);
    const persisted = readPresentSnapshot(store, identity);
    reopenStore();

    await Promise.resolve(
      expect(new HostStateStore(database, workspace).reconcileWorkflowAttempt(request)).rejects.toThrow(
        /verifier required/,
      ),
    );
    const reopened = verifyingStore(database, () => {
      throw new Error('exact replay must not reverify');
    });
    expect(await reopened.reconcileWorkflowAttempt(request)).toEqual(reconciled);
    expect(reopened.readHostStateSnapshot(identity)).toEqual(persisted);

    const retryLease = requiredValue(request.retryLease, 'no-effect retry lease');
    const changedInputs: readonly WorkflowAttemptReconciliationRequest[] = [
      { ...request, decision: { ...decision, sha256: '9'.repeat(64) } },
      { ...request, providerEvidence: { ...request.providerEvidence, sha256: '9'.repeat(64) } },
      { ...request, retryLease: { ...retryLease, generation: retryLease.generation + 1 } },
      { ...request, expectedWork: { ...request.expectedWork, digest: '9'.repeat(64) } },
      { ...request, expectedLedger: { ...request.expectedLedger, digest: '9'.repeat(64) } },
    ];
    for (const changed of changedInputs) {
      await Promise.resolve(expect(reopened.reconcileWorkflowAttempt(changed)).rejects.toThrow(/replay binding/));
      expect(reopened.readHostStateSnapshot(identity)).toEqual(persisted);
    }
  });

  test('local no-effect helper replays the exact completed retry fence after a lost acknowledgement', async () => {
    const prepared = await prepareLocalNoEffectRetryFixture({ loseFinalAcknowledgement: true });
    await Promise.resolve(
      expect(reconcileUnissuedLocalSessionAction(prepared.input)).rejects.toThrow(
        'simulated lost retry-fence acknowledgement',
      ),
    );
    const persisted = prepared.hostStore.readHostStateSnapshot(identity);
    const journalBeforeReplay = clone(prepared.journal);
    const callsBeforeReplay = { ...prepared.calls };
    expect(prepared.calls).toEqual({
      compareAndSwapHostState: 2,
      reconcileWorkflowAttempt: 1,
      verify: 1,
    });

    const retry = await reconcileUnissuedLocalSessionAction(prepared.input);

    expect(retry).toEqual(persisted);
    expect(retry.work).toEqual(persisted.work);
    expect(retry.ledger).toEqual(persisted.ledger);
    expect(retry.workVersion).toEqual(persisted.workVersion);
    expect(retry.ledgerVersion).toEqual(persisted.ledgerVersion);
    expect(prepared.journal).toEqual(journalBeforeReplay);
    expect(prepared.calls).toEqual(callsBeforeReplay);
  });

  test.each(['proof', 'decision', 'successor', 'current lease'])(
    'local no-effect helper rejects changed %s metadata without mutation',
    async (changed) => {
      const prepared = await prepareLocalNoEffectRetryFixture();
      await reconcileUnissuedLocalSessionAction(prepared.input);
      const readPersisted = prepared.hostStore.readHostStateSnapshot.bind(prepared.hostStore);
      const before = readPersisted(identity);
      const callsBefore = { ...prepared.calls };
      if (changed === 'proof') {
        prepared.writeJson(prepared.proofPath, {
          ...prepared.proof,
          native_inspection_ref: 'local-inspection#changed',
        });
      } else if (changed === 'decision') {
        prepared.writeJson(prepared.decisionPath, {
          ...prepared.decision,
          reason: 'A different recovery decision.',
        });
      } else if (changed === 'successor') {
        const changedProof = { ...prepared.proof, successor_session_handle: 'other-successor' };
        const changedProofBytes = Buffer.from(JSON.stringify(changedProof));
        writeFileSync(path.join(prepared.evidenceRoot, prepared.proofPath), changedProofBytes);
        prepared.writeJson(prepared.decisionPath, {
          ...prepared.decision,
          provider_evidence: {
            ...prepared.decision.provider_evidence,
            sha256: createHash('sha256').update(changedProofBytes).digest('hex'),
          },
          retry_lease: { ...prepared.decision.retry_lease, thread_id: 'other-successor' },
        });
      } else {
        const readCurrent = prepared.operationStore.readHostStateSnapshot.bind(prepared.operationStore);
        prepared.operationStore.readHostStateSnapshot = (requestIdentity) => {
          const current = presentSnapshot(readCurrent(requestIdentity));
          const work = clone(current.work);
          return {
            ...current,
            work: {
              ...work,
              lease: { ...requiredLease(current.work), thread_id: 'foreign-successor', generation: 3 },
            },
          };
        };
      }

      await Promise.resolve(expect(reconcileUnissuedLocalSessionAction(prepared.input)).rejects.toThrow());

      expect(readPersisted(identity)).toEqual(before);
      expect(prepared.calls).toEqual(callsBefore);
    },
  );

  test.each(['principal', 'attempt_id', 'request_digest', 'work_binding_digest', 'result_digest'])(
    'rejects foreign authorization %s without mutation',
    async (field) => {
      commitHostState(fixture());
      const started = store.claimWorkflowAttempt(attemptRequest());
      const request = reconciliationRequest(started),
        before = store.readHostStateSnapshot(identity);
      const verified = verifyingStore(database, (input, state) => {
        const authorization = reconciliationAuthorization(input, state);
        Reflect.set(authorization, field, '9'.repeat(64));
        return authorization;
      });
      await Promise.resolve(
        expect(verified.reconcileWorkflowAttempt(request)).rejects.toThrow(/differs from transition/),
      );
      expect(store.readHostStateSnapshot(identity)).toEqual(before);
    },
  );

  test.each(['work', 'ledger'])(
    'asynchronous reconciliation rechecks %s CAS after proof verification',
    async (kind) => {
      commitHostState(fixture());
      const started = store.claimWorkflowAttempt(attemptRequest());
      const request = reconciliationRequest(started);
      let changed: HostSnapshot | undefined;
      const verified = verifyingStore(database, async (input, state) => {
        expect(Object.isFrozen(input)).toBe(true);
        expect(Object.isFrozen(state.work)).toBe(true);
        expect(database.inTransaction).toBe(false);
        if (kind === 'work') store.claimWorkflowAttempt(attemptRequest(undefined, 1));
        else {
          const foreign = fixture('other', 'file:src/other.ts');
          foreign.expectedLedger = state.ledgerVersion;
          const ledger = requiredValue(state.ledger, 'verified coordination ledger');
          foreign.nextLedger.revision = ledger.revision + 1;
          includeExistingLedger(foreign, ledger);
          commitHostState(foreign);
        }
        changed = store.readHostStateSnapshot(identity) ?? undefined;
        return reconciliationAuthorization(input, state);
      });
      await Promise.resolve(expect(verified.reconcileWorkflowAttempt(request)).rejects.toThrow(/compare-and-swap/));
      expect(requiredValue(changed, 'changed host snapshot')).toEqual(store.readHostStateSnapshot(identity));
    },
  );

  test('invalid no-effect proof requests fail before calling the host verifier', async () => {
    const initial = fixture();
    initial.nextWork.contracts.decisions.push(decision);
    commitHostState(initial);
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started, 'no_effect'),
      before = readPresentSnapshot(store, identity);
    let calls = 0;
    const verified = verifyingStore(database, (input, state) => {
      calls++;
      return reconciliationAuthorization(input, state);
    });
    const invalid: readonly unknown[] = [
      { ...request, decision: null },
      { ...request, retryLease: started.attempt.lease },
      { ...request, providerEvidence: { ...request.providerEvidence, path: '../foreign.json' } },
      { ...request, outcome: 'unknown' },
      { ...request, result: 'not-no-effect' },
    ];
    for (const input of invalid)
      await Promise.resolve(expect(invokeMalformedReconciliationRequest(verified, input)).rejects.toThrow());
    await Promise.resolve(
      expect(
        verified.reconcileWorkflowAttempt({ ...request, decision: { ...decision, sha256: '9'.repeat(64) } }),
      ).rejects.toThrow(/reconciliation decision is not bound to work/),
    );
    expect(calls).toBe(0);
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
  });

  test('competing reconciliation proofs commit once and a failed write leaves no authorization behind', async () => {
    commitHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest());
    const request = reconciliationRequest(started),
      before = readPresentSnapshot(store, identity);
    const verified = verifyingStore(database, reconciliationAuthorization);
    database.exec(
      "CREATE TRIGGER fail_resolution BEFORE UPDATE ON agent_host_state WHEN OLD.kind='work' BEGIN SELECT RAISE(ABORT, 'injected reconciliation failure'); END",
    );
    await Promise.resolve(
      expect(verified.reconcileWorkflowAttempt(request)).rejects.toThrow(/injected reconciliation failure/),
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
    database.exec('DROP TRIGGER fail_resolution');
    const otherDb = new Database(databasePath, { strict: true });
    handles.push(otherDb);
    const other = verifyingStore(otherDb, reconciliationAuthorization);
    const outcomes = await Promise.allSettled([
      verified.reconcileWorkflowAttempt(request),
      other.reconcileWorkflowAttempt(request),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    const rejectionReason: unknown = requiredValue(rejected, 'rejected reconciliation outcome').reason;
    if (!(rejectionReason instanceof Error)) throw new Error('competing reconciliation did not reject with an Error');
    expect(rejectionReason.message).toMatch(/compare-and-swap/);
    expect(readPresentSnapshot(store, identity).workVersion.revision).toBe(before.workVersion.revision + 1);
    expect(readPresentSnapshot(store, identity).ledgerVersion).toEqual(before.ledgerVersion);
  });

  test.each(['completed', 'uncertain'])(
    'lost %s acknowledgment replays after reopen without another write',
    (status) => {
      commitHostState(fixture());
      const receipt = store.claimWorkflowAttempt(attemptRequest());
      const finish = (target: HostStateStore) =>
        status === 'completed'
          ? target.completeWorkflowAttempt(receipt, { answer: 'persisted' })
          : target.markWorkflowAttemptUncertain(receipt);
      const terminal = finish(store);
      const before = readPresentSnapshot(store, identity);
      const reopened = new Database(databasePath, { strict: true });
      handles.push(reopened);
      const other = new HostStateStore(reopened, workspace);
      expect(finish(other)).toEqual(terminal);
      expect(other.readHostStateSnapshot(identity)).toEqual(before);
      expect(() => other.completeWorkflowAttempt(receipt, { answer: 'different' })).toThrow(/completion binding/);
      if (status === 'completed')
        expect(() => other.markWorkflowAttemptUncertain(receipt)).toThrow(/completion binding/);
      expect(() => other.completeWorkflowAttempt(terminal, { answer: 'persisted' })).toThrow(/original start receipt/);
      expect(other.readHostStateSnapshot(identity)).toEqual(before);
    },
  );

  test('host assignment adapter binds the persisted checkpoint, ledger, scope and permit before starting', () => {
    const initial = commitHostState(fixture());
    const invocation = workflowAssignmentFixture(initial);
    const changed = clone(invocation);
    changed.workContext.binding.scope_id = 'foreign-scope';
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/persisted state/);
    changed.workContext.binding = initial.work.binding;
    changed.workContext.permit.lease.ledger_revision++;
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/ledger revision/);
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    expect(store.claimWorkflowAssignment(invocation, '5'.repeat(64)).attempt.status).toBe('started');
    expect(() => store.claimWorkflowAssignment(invocation, '5'.repeat(64))).toThrow(/compare-and-swap/);
  });

  test('protected assignment denial writes neither an attempt nor an approval; successful claim reserves both atomically', async () => {
    let allowed = false;
    let verifierCalls = 0;
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => {
        verifierCalls++;
        if (!allowed) return null;
        return verifiedWorkflowApproval(request);
      },
    });
    const initial = commitHostState(fixture());
    const invocation = protectedInvocation(initial);
    await Promise.resolve(
      expect(
        store.claimWorkflowAssignmentWithApproval(invocation, '5'.repeat(64), 'source.write', 'approvals'),
      ).rejects.toThrow(/approval denied/),
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    expect(governanceRows()).toHaveLength(0);
    allowed = true;
    const authorized = await store.claimWorkflowAssignmentWithApproval(
      invocation,
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    expect(authorized.receipt.attempt.status).toBe('started');
    expect(requiredValue(authorized.approval, 'reserved workflow approval').status).toBe('reserved');
    expect(readPresentSnapshot(store, identity).work.execution.assignment_attempts).toHaveLength(1);
    expect(governanceRows()).toHaveLength(1);
    const entered = store.beginWorkflowAttemptEffect(authorized);
    expect(requiredValue(entered.approval, 'entered workflow approval').status).toBe('commit_unknown');
    const completed = store.completeWorkflowAttemptWithApproval(entered, { accepted: true });
    expect(completed.receipt.attempt.status).toBe('completed');
    expect(requiredValue(completed.approval, 'completed workflow approval').status).toBe('applied');
    allowed = false;
    const replay = await store.claimWorkflowAssignmentWithApproval(
      invocation,
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    expect(replay.receipt.attempt).toEqual(completed.receipt.attempt);
    expect(replay.approval).toBeNull();
    expect(verifierCalls).toBe(2);
  });

  test('reserved protected attempt can be aborted after restart, but provider-entry uncertainty cannot', async () => {
    let approvalId = 'approval-recovery-1';
    const verifier = {
      principal: 'fixture:approver',
      verify: async (request: Parameters<WorkflowAttemptApprovalVerifier['verify']>[0]) =>
        verifiedWorkflowApproval(request, approvalId),
    };
    store = new HostStateStore(database, workspace, undefined, undefined, verifier);
    const initial = commitHostState(fixture());
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(initial),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    const other = store.claimWorkflowAttempt(attemptRequest(readPresentSnapshot(store, identity), 1));
    reopenStore();
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/work version changed/);
    expect(() => store.abortUnstartedWorkflowAttempt(reserved.receipt)).toThrow(/protected attempt/);
    const recovered = store.abortUnstartedWorkflowAttempt(reserved);
    expect(requiredValue(recovered.work, 'recovered protected work').execution.assignment_attempts).toEqual([
      other.attempt,
    ]);
    expect(parseJsonRecord(governanceRows()[0]?.payload ?? '').status).toBe('aborted');
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/binding invalid/);
    approvalId = 'approval-recovery-2';
    store = new HostStateStore(database, workspace, undefined, undefined, verifier);
    const retry = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(presentSnapshot(recovered)),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    const entered = store.beginWorkflowAttemptEffect(retry);
    expect(requiredValue(entered.approval, 'commit-unknown workflow approval').status).toBe('commit_unknown');
    expect(() => store.abortUnstartedWorkflowAttempt(entered)).toThrow(/reservation receipt invalid/);
    expect(
      requiredValue(
        readPresentSnapshot(store, identity).work.execution.assignment_attempts.at(-1),
        'started retry attempt',
      ).status,
    ).toBe('started');
  });

  test('unprotected pre-provider attempt can be aborted without deleting another assignment', () => {
    const initial = commitHostState(fixture());
    const first = store.claimWorkflowAttempt(attemptRequest(initial, 0));
    const second = store.claimWorkflowAttempt(attemptRequest(readPresentSnapshot(store, identity), 1));
    const restored = store.abortUnstartedWorkflowAttempt(first);
    expect(requiredValue(restored.work, 'unprotected abort result').execution.assignment_attempts).toEqual([
      second.attempt,
    ]);
    expect(() => store.abortUnstartedWorkflowAttempt(first)).toThrow(/binding invalid/);
  });

  test('an approval that expires after reservation cannot enter the provider', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => {
        const receipt = verifiedWorkflowApproval(request);
        const { evidence_digest: _evidenceDigest, ...unsigned } = {
          ...receipt,
          expires_at: new Date(Date.now() + 800).toISOString(),
        };
        return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
      },
    });
    const initial = commitHostState(fixture());
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(initial),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    await new Promise<void>((resolve) => setTimeout(resolve, 900));
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/expired before provider entry/);
    const restored = store.abortUnstartedWorkflowAttempt(reserved);
    expect(requiredValue(restored.work, 'expired approval abort result').execution.assignment_attempts).toEqual([]);
  });

  test('failed provider-entry marker leaves the protected attempt abortable', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request: Parameters<WorkflowAttemptApprovalVerifier['verify']>[0]) =>
        verifiedWorkflowApproval(request),
    });
    const initial = commitHostState(fixture());
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      protectedInvocation(initial),
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    database.exec(
      "CREATE TRIGGER fail_provider_entry BEFORE UPDATE ON agent_host_governance WHEN OLD.kind='approval' BEGIN SELECT RAISE(ABORT, 'injected provider-entry failure'); END",
    );
    expect(() => store.beginWorkflowAttemptEffect(reserved)).toThrow(/injected provider-entry failure/);
    expect(readPresentSnapshot(store, identity).work.execution.assignment_attempts).toEqual([reserved.receipt.attempt]);
    expect(parseJsonRecord(governanceRows()[0]?.payload ?? '').status).toBe('reserved');
    database.exec('DROP TRIGGER fail_provider_entry');
    const restored = store.abortUnstartedWorkflowAttempt(reserved);
    expect(requiredValue(restored.work, 'provider marker abort result').execution.assignment_attempts).toEqual([]);
    expect(parseJsonRecord(governanceRows()[0]?.payload ?? '').status).toBe('aborted');
  });

  test('protected approval claim and completion roll back together when either SQLite write fails', async () => {
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request: Parameters<WorkflowAttemptApprovalVerifier['verify']>[0]) =>
        verifiedWorkflowApproval(request),
    });
    const initial = commitHostState(fixture());
    const invocation = protectedInvocation(initial);
    database.exec(
      "CREATE TRIGGER fail_protected_claim BEFORE UPDATE ON agent_host_state WHEN OLD.kind='work' BEGIN SELECT RAISE(ABORT, 'injected protected claim failure'); END",
    );
    await Promise.resolve(
      expect(
        store.claimWorkflowAssignmentWithApproval(invocation, '5'.repeat(64), 'source.write', 'approvals'),
      ).rejects.toThrow(/injected protected claim failure/),
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    expect(governanceRows()).toHaveLength(0);
    database.exec('DROP TRIGGER fail_protected_claim');
    const reserved = await store.claimWorkflowAssignmentWithApproval(
      invocation,
      '5'.repeat(64),
      'source.write',
      'approvals',
    );
    const entered = store.beginWorkflowAttemptEffect(reserved);
    database.exec(
      "CREATE TRIGGER fail_protected_completion BEFORE UPDATE ON agent_host_governance WHEN OLD.kind='approval' BEGIN SELECT RAISE(ABORT, 'injected protected completion failure'); END",
    );
    expect(() => store.completeWorkflowAttemptWithApproval(entered, { accepted: true })).toThrow(
      /injected protected completion failure/,
    );
    expect(
      requiredValue(
        readPresentSnapshot(store, identity).work.execution.assignment_attempts.at(-1),
        'started protected attempt',
      ).status,
    ).toBe('started');
    expect(parseJsonRecord(governanceRows()[0]?.payload ?? '').status).toBe('commit_unknown');
    database.exec('DROP TRIGGER fail_protected_completion');
    expect(store.completeWorkflowAttemptWithApproval(entered, { accepted: true }).receipt.attempt.status).toBe(
      'completed',
    );
  });

  test('foreign, stale and forged approval evidence cannot create a protected attempt', async () => {
    let alter: (receipt: ReturnType<typeof verifiedWorkflowApproval>) => ReturnType<typeof verifiedWorkflowApproval> = (
      receipt,
    ) => receipt;
    store = new HostStateStore(database, workspace, undefined, undefined, {
      principal: 'fixture:approver',
      verify: async (request) => alter(verifiedWorkflowApproval(request)),
    });
    const initial = commitHostState(fixture());
    const invocation = protectedInvocation(initial);
    const resign = (receipt: ReturnType<typeof verifiedWorkflowApproval>) => {
      const { evidence_digest: _digest, ...unsigned } = receipt;
      return { ...unsigned, evidence_digest: computeEdictumWorkflowApprovalEvidenceDigest(unsigned) };
    };
    const changes: readonly ((
      receipt: ReturnType<typeof verifiedWorkflowApproval>,
    ) => ReturnType<typeof verifiedWorkflowApproval>)[] = [
      (receipt) => resign({ ...receipt, project: 'foreign-project' }),
      (receipt) => resign({ ...receipt, operation_hash: '0'.repeat(64) }),
      (receipt) => resign({ ...receipt, expires_at: new Date(Date.now() - 1000).toISOString() }),
      (receipt) => ({ ...receipt, evidence_digest: '0'.repeat(64) }),
    ];
    for (const change of changes) {
      alter = change;
      await Promise.resolve(
        expect(
          store.claimWorkflowAssignmentWithApproval(invocation, '5'.repeat(64), 'source.write', 'approvals'),
        ).rejects.toThrow(/approval receipt binding invalid/),
      );
      expect(store.readHostStateSnapshot(identity)).toEqual(initial);
      expect(governanceRows()).toHaveLength(0);
    }
  });

  test('host assignment adapter replays a completed result after a lease revocation without another write', () => {
    const initial = commitHostState(fixture());
    const invocation = workflowAssignmentFixture(initial);
    const started = store.claimWorkflowAssignment(invocation, '5'.repeat(64));
    const completed = store.completeWorkflowAttempt(started, { answer: 'persisted' });
    const revoke = next();
    revoke.nextWork.lease = null;
    const ticket = firstTicket(revoke.nextLedger);
    ticket.generation++;
    revokeTicket(revoke.nextLedger, ticket);
    commitHostState(revoke);
    const beforeReplay = readPresentSnapshot(store, identity);
    const replay = store.claimWorkflowAssignment(invocation, '5'.repeat(64));
    expect(replay.attempt).toEqual(completed.attempt);
    expect(replay.workVersion).toEqual(beforeReplay.workVersion);
    expect(store.readHostStateSnapshot(identity)).toEqual(beforeReplay);
    const changed = clone(invocation);
    changed.workContext.permit.lease.generation++;
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/completed replay lease binding/);
    changed.workContext.permit = { ...invocation.workContext.permit, dispatch_authorized: false };
    expect(() => store.claimWorkflowAssignment(changed, '5'.repeat(64))).toThrow(/assignment permit binding/);
    expect(() => store.claimWorkflowAssignment(invocation, '6'.repeat(64))).toThrow(/request changed/);
    expect(store.readHostStateSnapshot(identity)).toEqual(beforeReplay);
  });

  test('attempt write failure preserves the pair and can be retried before any external effect', () => {
    const initial = commitHostState(fixture());
    database.exec(
      "CREATE TRIGGER fail_attempt BEFORE UPDATE ON agent_host_state WHEN OLD.kind='work' BEGIN SELECT RAISE(ABORT, 'injected attempt failure'); END",
    );
    expect(() => store.claimWorkflowAttempt(attemptRequest(initial))).toThrow(/injected attempt failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    database.exec('DROP TRIGGER fail_attempt');
    expect(store.claimWorkflowAttempt(attemptRequest(initial)).attempt.status).toBe('started');
  });
  test('attempt start and completion write only work; completed replay survives reopening without another write', () => {
    const initial = commitHostState(fixture());
    const started = store.claimWorkflowAttempt(attemptRequest(initial));
    expect(started.attempt.status).toBe('started');
    expect(readPresentSnapshot(store, identity).ledgerVersion).toEqual(initial.ledgerVersion);
    const completed = store.completeWorkflowAttempt(started, { answer: 'persisted' });
    expect(completed.attempt.status).toBe('completed');
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    const other = new HostStateStore(reopened, workspace);
    const replay = other.claimWorkflowAttempt(attemptRequest(readPresentSnapshot(other, identity)));
    expect(replay).toEqual(completed);
    expect(readPresentSnapshot(other, identity).ledgerVersion).toEqual(initial.ledgerVersion);
  });

  test('started and uncertain outcomes cannot redispatch; independent assignments keep their own receipts', () => {
    commitHostState(fixture());
    const first = store.claimWorkflowAttempt(attemptRequest());
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/reconciliation/);
    const second = store.claimWorkflowAttempt(attemptRequest(undefined, 1));
    Reflect.apply(store.completeWorkflowAttempt.bind(store), undefined, [second, null]);
    store.markWorkflowAttemptUncertain(first);
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/reconciliation/);
    expect(() => store.completeWorkflowAttempt(first, {})).toThrow(/completion binding/);
    expect(readPresentSnapshot(store, identity).work.execution.assignment_attempts.map((x) => x.status)).toEqual([
      'uncertain',
      'completed',
    ]);
  });

  test('attempt admission rejects stale CAS, wrong lease, changed replay input and unversioned v1 state', () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const input = fixture();
    const hostRows = database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY kind,id');
    const catalog = database.query<{ type: string; name: string; tbl_name: string; sql: string | null }, []>(
      'SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name',
    );
    const before = hostRows.all();
    const catalogBefore = catalog.all();
    const invalidIdentities: readonly [WorkState, string][] = [
      [
        { ...input.nextWork, binding: { ...input.nextWork.binding, project_ids: ['zz-foreign', 'aa-foreign'] } },
        'work project identity must be an exact sorted set',
      ],
      [
        {
          ...input.nextWork,
          request_transition: {
            schema: 'WorkRequestTransition/v1',
            request_pointer: 'fixture:unsorted-predecessors',
            native_session_handle: 'fixture:transition-owner',
            predecessor_work_ids: ['zz-predecessor', 'aa-predecessor'],
            successor_work_id: null,
          },
        },
        'request transition identity invalid',
      ],
    ];
    for (const [nextWork, reason] of invalidIdentities) {
      expect(() => commitHostState({ ...input, nextWork })).toThrow(reason);
      expect(hostRows.all()).toEqual(before);
      expect(catalog.all()).toEqual(catalogBefore);
      expect(database.inTransaction).toBe(false);
    }
    expect(Reflect.deleteProperty(input.nextWork.execution, 'assignment_attempts')).toBe(true);
    expect(() => commitHostState(input)).toThrow(/current WorkState/);
    const initial = commitHostState(fixture());
    const stale = attemptRequest(initial);
    expect(() => store.claimWorkflowAttempt({ ...stale, lease: { ...stale.lease, generation: 2 } })).toThrow(
      /lease binding/,
    );
    const receipt = store.claimWorkflowAttempt(stale);
    expect(() => store.claimWorkflowAttempt(stale)).toThrow(/compare-and-swap/);
    store.completeWorkflowAttempt(receipt, {});
    expect(() => store.claimWorkflowAttempt({ ...attemptRequest(), requestDigest: '6'.repeat(64) })).toThrow(
      /request changed/,
    );
    preserveHostFixtureRoot = false;
  });

  test('Host progress preserves an unresolved readonly attempt and its execution-only ownership', async () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const { seed } = await writerFixture();
    const initial = commitHostState(seed);
    expect(firstTicket(initial.ledger).exclusive_resources).toEqual(['execution:work']);
    expect(firstClaim(initial.ledger).resources).toEqual(['execution:work']);
    const started = store.claimWorkflowAssignment(protectedInvocation(initial), '5'.repeat(64));
    expect(started.attempt.status).toBe('started');
    const before = readPresentSnapshot(store, identity);
    const journalRows = () =>
      database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_mastra_session_ledger'")
        .get()
        ? database
            .query<SessionLedgerSqlRow, []>(
              'SELECT * FROM agent_host_mastra_session_ledger ORDER BY workspace_id,work_id,attempt',
            )
            .all()
        : null;
    const journal = journalRows();
    expect(() => store.readWorkSessionJournal(identity)).toThrow('journal missing for retained host effects');
    const approvals = governanceRows();
    const advanced = commitHostState(next(before));
    expect(advanced.work.execution.assignment_attempts).toEqual([started.attempt]);
    expect(advanced.work.lease).toEqual(before.work.lease);
    expect(advanced.work.revision).toBe(before.work.revision + 1);
    expect(advanced.work.lifecycle.revision).toBe(before.work.lifecycle.revision + 1);
    expect(advanced.ledger).toEqual({ ...before.ledger, revision: before.ledger.revision + 1 });
    expect(readPresentSnapshot(store, identity)).toEqual(advanced);
    expect(journalRows()).toEqual(journal);
    expect(() => store.readWorkSessionJournal(identity)).toThrow('journal missing for retained host effects');
    expect(governanceRows()).toEqual(approvals);
    preserveHostFixtureRoot = false;
  });

  test('completion after expiry preserves unresolved file ownership until every result is terminal', () => {
    commitHostState(fixture());
    const first = store.claimWorkflowAttempt(attemptRequest());
    const second = store.claimWorkflowAttempt(attemptRequest(undefined, 1));
    const now = Date.now;
    try {
      Date.now = () => now() + 7200000;
      expect(() => store.claimWorkflowAttempt(attemptRequest(undefined, 2))).toThrow(/expired/);
      const completed = store.completeWorkflowAttempt(first, 'observed');
      expect(completed.attempt.status).toBe('completed');
      const expiredSnapshot = readPresentSnapshot(store, identity);
      expect(store.claimWorkflowAttempt(attemptRequest(expiredSnapshot))).toEqual(completed);
      expect(store.readHostStateSnapshot(identity)).toEqual(expiredSnapshot);
    } finally {
      Date.now = now;
    }
    const revoke = next();
    revoke.nextWork.lease = null;
    const ticket = firstTicket(revoke.nextLedger);
    ticket.generation++;
    revokeTicket(revoke.nextLedger, ticket);
    const beforeRevocation = readPresentSnapshot(store, identity);
    expect(() => commitHostState(revoke)).toThrow(/unresolved Source attempt/);
    expect(store.readHostStateSnapshot(identity)).toEqual(beforeRevocation);
    const revokedCompletion = store.completeWorkflowAttempt(second, 'finished');
    expect(revokedCompletion.attempt.status).toBe('completed');
    const terminalRevoke = next();
    terminalRevoke.nextWork.lease = null;
    firstTicket(terminalRevoke.nextLedger).generation++;
    revokeTicket(terminalRevoke.nextLedger, firstTicket(terminalRevoke.nextLedger));
    commitHostState(terminalRevoke);
    const revokedSnapshot = readPresentSnapshot(store, identity);
    const replay = {
      ...attemptRequest(beforeRevocation, 1),
      expectedWork: revokedSnapshot.workVersion,
      expectedLedger: revokedSnapshot.ledgerVersion,
      lease: second.attempt.lease,
    };
    expect(store.claimWorkflowAttempt(replay).attempt).toEqual(revokedCompletion.attempt);
    expect(() => store.claimWorkflowAttempt({ ...replay, lease: { ...replay.lease, generation: 99 } })).toThrow(
      /completed replay lease binding/,
    );
    expect(() => store.claimWorkflowAttempt({ ...replay, requestDigest: '6'.repeat(64) })).toThrow(/request changed/);
    expect(store.readHostStateSnapshot(identity)).toEqual(revokedSnapshot);
    expect(() =>
      store.claimWorkflowAttempt({
        ...attemptRequest(beforeRevocation, 2),
        expectedWork: revokedSnapshot.workVersion,
        expectedLedger: revokedSnapshot.ledgerVersion,
        lease: first.attempt.lease,
      }),
    ).toThrow(/active leased/);
  });

  test('imported migration run requires a trusted typed rebind before ordinary activation', async () => {
    const seed = fixture();
    const sourceSha256 = 'a'.repeat(64);
    const migration: WorkCheckpointMigrationLineage = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: sourceSha256,
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
      migration_id: workMigrationId({
        source_schema: 'WorkCheckpoint/v2',
        source_sha256: sourceSha256,
        source_work_id: 'work',
        source_revision: 'source',
        original_run_id: null,
      }),
      rebind_status: 'pending',
      rebind_receipt: null,
    };
    seed.nextWork.migration = clone(migration);
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    seed.nextWork.lease = null;
    const imported = commitHostState(seed);
    const request: Parameters<HostStateStore['rebindMigratedWork']>[0] = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256,
      migrationId: migration.migration_id,
      decisionPointer: 'WORK.md#typed-migration-decision',
    };
    const promote = next(imported);
    promote.nextWork.execution.status = 'active';
    promote.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
    expect(() => commitHostState(promote)).toThrow(/current WorkState\/v1/);
    expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    await Promise.resolve(
      expect(store.rebindMigratedWork(request)).rejects.toThrow(/trusted migration rebind verifier required/),
    );
    const principal = 'trusted:migration-host';
    const receipt: MigrationRebindAuthorization = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: migration.migration_id,
        source_sha256: sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: sourceSha256,
      migration_id: migration.migration_id,
    };
    const verified = new HostStateStore(database, workspace, undefined, { principal, verify: () => receipt });
    for (const changed of [
      { ...request, sourceSha256: 'b'.repeat(64) },
      { ...request, migrationId: 'b'.repeat(64) },
    ]) {
      await Promise.resolve(expect(verified.rebindMigratedWork(changed)).rejects.toThrow(/source binding/));
      expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    }
    const accepted = presentSnapshot(await verified.rebindMigratedWork(request));
    const acceptedMigration = accepted.work.migration;
    if (!acceptedMigration) throw new Error('accepted migration lineage is missing');
    const acceptedRunId = requiredValue(accepted.work.execution.run_id, 'rebound continuation run id');
    expect(acceptedRunId).toMatch(/^[0-9a-f-]{36}$/);
    expect(acceptedMigration).toEqual({
      ...migration,
      continuation_run_id: acceptedRunId,
      rebind_status: 'accepted',
      rebind_receipt: {
        ...receipt,
        issued_run_id: acceptedRunId,
        source_work_digest: imported.workVersion.digest,
      },
    });
    expect(accepted.work.execution.status).toBe('suspended');
    expect(accepted.work.execution.assignment_attempts).toEqual([]);
    const changedRun = next(accepted);
    changedRun.nextWork.execution.run_id = 'caller-chosen-run';
    expect(() => commitHostState(changedRun)).toThrow();
    expect(store.readHostStateSnapshot(identity)).toEqual(accepted);
    const forged = next(accepted);
    const forgedMigration = forged.nextWork.migration;
    if (!forgedMigration?.rebind_receipt) throw new Error('accepted migration receipt fixture is missing');
    forgedMigration.rebind_receipt.decision_pointer = 'WORK.md#forged';
    forgedMigration.rebind_receipt.rebind_id = canonicalJsonDigest({
      identity,
      migration_id: migration.migration_id,
      source_sha256: sourceSha256,
      principal,
      decision_pointer: 'WORK.md#forged',
    });
    expect(() => commitHostState(forged)).toThrow(/migration lineage requires a dedicated rebind/);
    expect(store.readHostStateSnapshot(identity)).toEqual(accepted);
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    const replayStore = new HostStateStore(reopened, workspace, undefined, {
      principal,
      verify: () => {
        throw new Error('exact replay must not reverify');
      },
    });
    expect(await replayStore.rebindMigratedWork(request)).toEqual(accepted);
    await Promise.resolve(
      expect(
        replayStore.rebindMigratedWork({
          ...request,
          expectedWork: { ...request.expectedWork, digest: '0'.repeat(64) },
        }),
      ).rejects.toThrow(/replay binding/),
    );
    await Promise.resolve(
      expect(
        replayStore.rebindMigratedWork({
          ...request,
          expectedWork: { ...request.expectedWork, revision: request.expectedWork.revision + 1 },
        }),
      ).rejects.toThrow(/replay binding/),
    );
    await Promise.resolve(
      expect(
        replayStore.rebindMigratedWork({
          ...request,
          expectedLedger: { ...request.expectedLedger, digest: '0'.repeat(64) },
        }),
      ).rejects.toThrow(/replay binding/),
    );
    await Promise.resolve(
      expect(replayStore.rebindMigratedWork({ ...request, decisionPointer: 'WORK.md#changed' })).rejects.toThrow(
        /replay binding/,
      ),
    );
    const active = next(accepted);
    active.nextWork.execution.status = 'active';
    active.nextWork.lease = promote.nextWork.lease;
    commitHostState(active);
    expect(store.claimWorkflowAttempt(attemptRequest()).attempt.status).toBe('started');
  });

  test('host keeps every reset source kind suspended until its typed migration rebind', () => {
    for (const [changeKind, digestCharacter] of [
      ['feature', 'a'],
      ['fix', 'b'],
      ['refactor', 'c'],
      ['documentation', 'd'],
    ] as const) {
      const handle = openHostStateDatabase(root, `reset-${changeKind}.db`, workspace);
      admittedHostDatabases.add(handle);
      handles.push(handle);
      const localStore = new HostStateStore(handle, workspace);
      const seed = fixture();
      const sourceSha256 = digestCharacter.repeat(64);
      seed.nextWork.lifecycle.phase = 'PLAN';
      seed.nextWork.lifecycle.change_kind = changeKind;
      const lifecycleReferences: MutableHostStateWrite['nextWork']['lifecycle']['references'] = [
        {
          schema: 'LifecycleArtifactReference/v1',
          kind: 'source_plan',
          artifact_schema: 'SourcePlan/v1',
          record_id: `source_plan-${changeKind}`,
          path: `.agent/source_plan-${changeKind}.json`,
          sha256: '1'.repeat(64),
          source_revision: seed.nextWork.binding.work_source_revision,
          scope_id: seed.nextWork.binding.scope_id,
          ac_ids: [...seed.nextWork.binding.ac_ids],
          generation: null,
          implementation_fingerprint: null,
          delivery_cycle_id: null,
          principal: null,
          decision: null,
          disposition: 'current',
        },
        {
          schema: 'LifecycleArtifactReference/v1',
          kind: 'acceptance_manifest',
          artifact_schema: 'AcceptanceManifest/v1',
          record_id: `acceptance_manifest-${changeKind}`,
          path: `.agent/acceptance_manifest-${changeKind}.json`,
          sha256: '1'.repeat(64),
          source_revision: seed.nextWork.binding.work_source_revision,
          scope_id: seed.nextWork.binding.scope_id,
          ac_ids: [...seed.nextWork.binding.ac_ids],
          generation: null,
          implementation_fingerprint: null,
          delivery_cycle_id: null,
          principal: null,
          decision: null,
          disposition: 'current',
        },
        {
          schema: 'LifecycleArtifactReference/v1',
          kind: 'implementation_scope',
          artifact_schema: 'ImplementationScope/v1',
          record_id: `implementation_scope-${changeKind}`,
          path: `.agent/implementation_scope-${changeKind}.json`,
          sha256: '1'.repeat(64),
          source_revision: seed.nextWork.binding.work_source_revision,
          scope_id: seed.nextWork.binding.scope_id,
          ac_ids: [...seed.nextWork.binding.ac_ids],
          generation: null,
          implementation_fingerprint: null,
          delivery_cycle_id: null,
          principal: null,
          decision: null,
          disposition: 'current',
        },
      ];
      seed.nextWork.lifecycle.references = lifecycleReferences;
      seed.nextWork.migration = clone({
        schema: 'WorkMigrationLineage/v1',
        source_schema: 'WorkCheckpoint/v2',
        source_sha256: sourceSha256,
        source_work_id: seed.nextWork.binding.lifecycle_work_id,
        source_revision: seed.nextWork.binding.work_source_revision,
        original_run_id: null,
        continuation_run_id: null,
        migration_id: workMigrationId({
          source_schema: 'WorkCheckpoint/v2',
          source_sha256: sourceSha256,
          source_work_id: seed.nextWork.binding.lifecycle_work_id,
          source_revision: seed.nextWork.binding.work_source_revision,
          original_run_id: null,
        }),
        rebind_status: 'pending',
        rebind_receipt: null,
      });
      quiesceImportedState([seed.nextWork], seed.nextLedger);
      seed.nextWork.execution.run_id = null;
      seed.nextWork.execution.assignment_attempts = [];
      const imported = commitHostStateOn(localStore, seed);
      expect(imported.work.lifecycle.phase).toBe('PLAN');
      expect(imported.work.lifecycle.change_kind).toBe(changeKind);
      expect(imported.work.execution.status).toBe('suspended');
      expect(imported.work.execution.run_id).toBeNull();
      expect(imported.work.execution.assignment_attempts).toEqual([]);
      const forbidden = clone(imported);
      forbidden.work.revision++;
      forbidden.work.lifecycle.revision++;
      forbidden.ledger.revision++;
      forbidden.work.execution.status = 'active';
      forbidden.work.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
      expect(() =>
        commitHostStateOn(localStore, {
          expectedWork: imported.workVersion,
          expectedLedger: imported.ledgerVersion,
          nextWork: forbidden.work,
          nextLedger: forbidden.ledger,
        }),
      ).toThrow(/current WorkState\/v1/);
    }
  });

  test('migration identity binds a known original run and rejects an omitted-run digest', () => {
    const lineage: Pick<
      Extract<WorkCheckpointMigrationLineage, { source_schema: 'WorkCheckpoint/v2' }>,
      | 'schema'
      | 'source_schema'
      | 'source_sha256'
      | 'source_work_id'
      | 'source_revision'
      | 'original_run_id'
      | 'continuation_run_id'
    > = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    expect(workMigrationId({ ...lineage, original_run_id: 'original-run' })).not.toBe(workMigrationId(lineage));
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    seed.nextWork.migration = clone({
      ...lineage,
      original_run_id: 'original-run',
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    });
    expect(() => commitHostState(seed)).toThrow(/migration lineage identity invalid/);
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
  });

  test('accepts only a suspended ticket-sourced migration with no fabricated run, lease, or attempt', () => {
    const seed = fixture();
    const sourceSha256 = 'b'.repeat(64);
    const lineage: CoordinationTicketMigrationLineage = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'CoordinationTicket/v1',
      source_sha256: sourceSha256,
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
      migration_id: workMigrationId({
        source_schema: 'CoordinationTicket/v1',
        source_sha256: sourceSha256,
        source_work_id: 'work',
        source_revision: 'source',
        original_run_id: null,
      }),
      rebind_status: 'pending',
      rebind_receipt: null,
      source_ticket: {
        pointer: '/tickets/114',
        ticket_id: 'ticket-work',
        thread_id: 'thread',
        generation: 1,
        contour_keys: ['br:BR-GENERIC', 'sr:SR-GENERIC', 'ac:AC-GENERIC'],
        exclusive_resources: ['file:agent-runtime-new/src/host-state.ts'],
      },
    };
    seed.nextWork.migration = clone(lineage);
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    seed.nextWork.execution.assignment_attempts = [];
    seed.nextWork.lease = null;
    expect(commitHostState(seed).work?.migration).toEqual(lineage);
    const invalid = fixture();
    invalid.nextWork.migration = clone(lineage);
    invalid.nextWork.execution.status = 'active';
    invalid.nextWork.execution.run_id = 'invented-run';
    invalid.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
    expect(() => commitHostState(invalid)).toThrow(/current WorkState\/v1/);
  });

  test('migration rebind rejects a work and ledger change during trusted authorization', async () => {
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    const lineage: Pick<
      Extract<WorkCheckpointMigrationLineage, { source_schema: 'WorkCheckpoint/v2' }>,
      | 'schema'
      | 'source_schema'
      | 'source_sha256'
      | 'source_work_id'
      | 'source_revision'
      | 'original_run_id'
      | 'continuation_run_id'
    > = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    seed.nextWork.migration = clone({
      ...lineage,
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    });
    const imported = commitHostState(seed);
    const request: Parameters<HostStateStore['rebindMigratedWork']>[0] = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256: lineage.source_sha256,
      migrationId: requiredMigration(seed.nextWork).migration_id,
      decisionPointer: 'WORK.md#typed-migration-decision',
    };
    const principal = 'trusted:migration-host';
    const authorization: MigrationRebindAuthorization = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: request.migrationId,
        source_sha256: request.sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: request.sourceSha256,
      migration_id: request.migrationId,
    };
    let competing: PresentHostSnapshot | undefined;
    const verified = new HostStateStore(database, workspace, undefined, {
      principal,
      verify: () => {
        competing = commitHostState(next(imported));
        return authorization;
      },
    });
    await Promise.resolve(expect(verified.rebindMigratedWork(request)).rejects.toThrow(/compare-and-swap|stale/));
    if (!competing) throw new Error('competing migration commit fixture is missing');
    expect(store.readHostStateSnapshot(identity)).toEqual(competing);
    const competingMigration = competing.work.migration;
    if (!competingMigration) throw new Error('competing migration lineage fixture is missing');
    expect(competingMigration.rebind_status).toBe('pending');
  });

  test('migration rebind and rollback-gate close are one SQLite transaction', async () => {
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    const lineage: Pick<
      Extract<WorkCheckpointMigrationLineage, { source_schema: 'WorkCheckpoint/v2' }>,
      | 'schema'
      | 'source_schema'
      | 'source_sha256'
      | 'source_work_id'
      | 'source_revision'
      | 'original_run_id'
      | 'continuation_run_id'
    > = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    seed.nextWork.migration = clone({
      ...lineage,
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    });
    const imported = commitHostState(seed);
    const gate = store.openReconciliationGate(reconciliationBinding(imported));
    const request: Parameters<HostStateStore['rebindMigratedWork']>[0] = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256: lineage.source_sha256,
      migrationId: requiredMigration(seed.nextWork).migration_id,
      decisionPointer: 'WORK.md#typed-migration-decision',
    };
    const principal = 'trusted:migration-host';
    const expectedReceipt: MigrationRebindAuthorization = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: request.migrationId,
        source_sha256: request.sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: request.sourceSha256,
      migration_id: request.migrationId,
    };
    const withMalformedAuthorizationField = (field: string, value: unknown): MigrationRebindAuthorization => {
      const malformed = { ...expectedReceipt };
      setFixtureField(malformed, field, value);
      return malformed;
    };
    const forgedReceipts: readonly (MigrationRebindAuthorization | null)[] = [
      null,
      { ...expectedReceipt, principal: 'forged' },
      { ...expectedReceipt, decision_pointer: 'WORK.md#forged' },
      { ...expectedReceipt, source_sha256: 'b'.repeat(64) },
      { ...expectedReceipt, migration_id: 'b'.repeat(64) },
      { ...expectedReceipt, identity: { ...identity, project_ids: ['another-project'] } },
      { ...expectedReceipt, rebind_id: 'b'.repeat(64) },
      withMalformedAuthorizationField('issued_run_id', 'caller-chosen-run'),
      withMalformedAuthorizationField('source_work_digest', '0'.repeat(64)),
    ];
    for (const forged of forgedReceipts) {
      const denied = new HostStateStore(database, workspace, undefined, { principal, verify: () => forged });
      await Promise.resolve(expect(denied.rebindMigratedWork(request)).rejects.toThrow(/authorization differs/));
      expect(store.readHostStateSnapshot(identity)).toEqual(imported);
      expect(store.readReconciliationGate()).toEqual(gate);
    }
    let verifyCalls = 0;
    const verified = new HostStateStore(database, workspace, undefined, {
      principal,
      verify: () => {
        verifyCalls++;
        return expectedReceipt;
      },
    });
    for (const stale of [
      { ...request, expectedWork: { ...request.expectedWork, digest: '0'.repeat(64) } },
      { ...request, expectedLedger: { ...request.expectedLedger, digest: '0'.repeat(64) } },
    ]) {
      await Promise.resolve(expect(verified.rebindMigratedWork(stale)).rejects.toThrow());
      expect(verifyCalls).toBe(0);
      expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    }
    database.exec(
      "CREATE TRIGGER deny_migration_gate_close BEFORE UPDATE ON agent_host_reconciliation BEGIN SELECT RAISE(ABORT, 'injected migration gate failure'); END",
    );
    await Promise.resolve(
      expect(verified.rebindMigratedWork(request)).rejects.toThrow(/injected migration gate failure/),
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(imported);
    expect(store.readReconciliationGate()).toEqual(gate);
    database.exec('DROP TRIGGER deny_migration_gate_close');
    const accepted = presentSnapshot(await verified.rebindMigratedWork(request));
    const acceptedMigration = accepted.work.migration;
    if (!acceptedMigration) throw new Error('accepted migration lineage is missing');
    expect(acceptedMigration.rebind_status).toBe('accepted');
    expect(requiredValue(store.readReconciliationGate(), 'accepted reconciliation gate').closed_work_version).toEqual(
      accepted.workVersion,
    );
  });

  test('concurrent migration rebind authorizations commit exactly once', async () => {
    const seed = fixture();
    seed.nextWork.lease = null;
    seed.nextWork.execution.status = 'suspended';
    seed.nextWork.execution.run_id = null;
    const lineage: Pick<
      Extract<WorkCheckpointMigrationLineage, { source_schema: 'WorkCheckpoint/v2' }>,
      | 'schema'
      | 'source_schema'
      | 'source_sha256'
      | 'source_work_id'
      | 'source_revision'
      | 'original_run_id'
      | 'continuation_run_id'
    > = {
      schema: 'WorkMigrationLineage/v1',
      source_schema: 'WorkCheckpoint/v2',
      source_sha256: 'a'.repeat(64),
      source_work_id: 'work',
      source_revision: 'source',
      original_run_id: null,
      continuation_run_id: null,
    };
    seed.nextWork.migration = clone({
      ...lineage,
      migration_id: workMigrationId(lineage),
      rebind_status: 'pending',
      rebind_receipt: null,
    });
    const imported = commitHostState(seed);
    store.openReconciliationGate(reconciliationBinding(imported));
    const request: Parameters<HostStateStore['rebindMigratedWork']>[0] = {
      identity,
      expectedWork: imported.workVersion,
      expectedLedger: imported.ledgerVersion,
      sourceSha256: lineage.source_sha256,
      migrationId: requiredMigration(seed.nextWork).migration_id,
      decisionPointer: 'WORK.md#concurrent-rebind',
    };
    const principal = 'trusted:migration-host';
    const receipt: MigrationRebindAuthorization = {
      schema: 'MigrationRebind/v1',
      rebind_id: canonicalJsonDigest({
        identity,
        migration_id: request.migrationId,
        source_sha256: request.sourceSha256,
        principal,
        decision_pointer: request.decisionPointer,
      }),
      identity,
      principal,
      decision_pointer: request.decisionPointer,
      source_sha256: request.sourceSha256,
      migration_id: request.migrationId,
    };
    const secondDatabase = new Database(databasePath, { strict: true });
    handles.push(secondDatabase);
    let entered = 0;
    let release!: () => void;
    const bothAuthorized = new Promise<void>((resolve) => {
      release = resolve;
    });
    const verify = async () => {
      entered++;
      if (entered === 2) release();
      await bothAuthorized;
      return receipt;
    };
    const left = new HostStateStore(database, workspace, undefined, { principal, verify });
    const right = new HostStateStore(secondDatabase, workspace, undefined, { principal, verify });
    const results = await Promise.allSettled([left.rebindMigratedWork(request), right.rebindMigratedWork(request)]);
    expect(entered).toBe(2);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const accepted = readPresentSnapshot(store, identity);
    const acceptedMigration = accepted.work.migration;
    if (!acceptedMigration) throw new Error('accepted migration lineage is missing');
    expect(accepted.workVersion.revision).toBe(imported.workVersion.revision + 1);
    expect(acceptedMigration.rebind_receipt).toEqual({
      ...receipt,
      issued_run_id: requiredValue(accepted.work.execution.run_id, 'accepted concurrent continuation run id'),
      source_work_digest: imported.workVersion.digest,
    });
    expect(requiredValue(store.readReconciliationGate(), 'accepted reconciliation gate').closed_work_version).toEqual(
      accepted.workVersion,
    );
    const replay = new HostStateStore(database, workspace, undefined, {
      principal,
      verify: () => {
        throw new Error('replay must not authorize again');
      },
    });
    expect(await replay.rebindMigratedWork(request)).toEqual(accepted);
  });

  test('generic paired CAS cannot rewrite attempts; malformed results or forged receipts cannot complete them', () => {
    commitHostState(fixture());
    const receipt = store.claimWorkflowAttempt(attemptRequest());
    const before = readPresentSnapshot(store, identity);
    const edit = next(before);
    edit.nextWork.execution.assignment_attempts = [];
    expect(() => commitHostState(edit)).toThrow(/dedicated transaction/);
    expect(() => store.completeWorkflowAttempt(receipt, undefined)).toThrow();
    expect(() =>
      store.completeWorkflowAttempt(
        { ...receipt, attempt: { ...receipt.attempt, request_digest: '9'.repeat(64) } },
        {},
      ),
    ).toThrow(/completion binding/);
    expect(store.readHostStateSnapshot(identity)).toEqual(before);
  });
  test('exclusive creation, immutable snapshot and close/reopen preserve authority and artifact references', () => {
    expect(store.readHostStateSnapshot(identity)).toEqual({
      work: null,
      ledger: null,
      workVersion: null,
      ledgerVersion: null,
      maintenanceGeneration: 0,
    });
    const input = fixture();
    input.nextWork.artifacts.push(artifact());
    const saved = commitHostState(input);
    expect(Object.isFrozen(saved.work.binding)).toBe(true);
    expect(saved.work.binding.provider_work_item_id).not.toBe(saved.work.binding.lifecycle_work_id);
    expect(() => commitHostState(input)).toThrow(/compare-and-swap/);
    closeWorkspaceDatabaseWithAdmission(database);
    handles.pop();
    const reopened = new Database(databasePath, { strict: true });
    handles.push(reopened);
    expect(new HostStateStore(reopened, workspace).readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('commits work and ledger together and rejects competing stale CAS through another handle', () => {
    const saved = commitHostState(fixture());
    const otherDb = new Database(databasePath, { strict: true });
    handles.push(otherDb);
    const other = new HostStateStore(otherDb, workspace);
    const competing = next(presentSnapshot(other.readHostStateSnapshot(identity)));
    const updated = commitHostState(next(saved));
    expect(updated.workVersion.revision).toBe(2);
    expect(updated.ledgerVersion.revision).toBe(2);
    expect(() => commitHostStateOn(other, competing)).toThrow(/compare-and-swap/);
    expect(other.readHostStateSnapshot(identity)).toEqual(updated);
  });

  test('decision references survive progress and reject removal or replacement atomically', () => {
    const created = commitHostState(fixture());
    const append = next(created);
    const decision = { schema: 'DecisionRecord/v1', path: '.agent/decision.json', sha256: '3'.repeat(64) };
    append.nextWork.contracts.decisions.push(decision);
    const saved = commitHostState(append);
    const progressed = commitHostState(next(saved));
    expect(progressed.work.contracts.decisions).toEqual([decision]);
    for (const decisions of [[], [{ ...decision, sha256: '4'.repeat(64) }]]) {
      const invalid = next(progressed);
      invalid.nextWork.contracts.decisions = decisions;
      expect(() => commitHostState(invalid)).toThrow(/decision references/);
      expect(store.readHostStateSnapshot(identity)).toEqual(progressed);
    }
  });

  test('a new work cannot bypass a stale shared-ledger digest', () => {
    const saved = commitHostState(fixture());
    const input = fixture('other', 'file:src/other.ts');
    input.expectedLedger = { ...saved.ledgerVersion, digest: '9'.repeat(64) };
    input.nextLedger.revision = 2;
    includeExistingLedger(input, saved.ledger);
    expect(() => commitHostState(input)).toThrow(/compare-and-swap/);
    expect(store.readHostStateSnapshot({ ...identity, work_id: 'other' }).work).toBeNull();
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('the work row identity includes repository and project set, while resource ownership remains workspace-wide', () => {
    const first = commitHostState(fixture());
    const other = fixture('work', 'file:src/other-project.ts');
    other.nextWork.binding.project_ids = ['another-project'];
    setFixtureField(requiredLease(other.nextWork), 'ticket_id', 'other-project-ticket');
    Object.assign(firstTicket(other.nextLedger), {
      project_ids: ['another-project'],
      ticket_id: 'other-project-ticket',
    });
    Object.assign(firstClaim(other.nextLedger), {
      claim_id: 'other-project-claim',
      ticket_id: 'other-project-ticket',
    });
    firstTicket(other.nextLedger).claim_ids = ['other-project-claim'];
    other.expectedLedger = first.ledgerVersion;
    other.nextLedger.revision = 2;
    includeExistingLedger(other, first.ledger);
    const saved = commitHostState(other);
    expect(saved.work.binding.lifecycle_work_id).toBe(first.work.binding.lifecycle_work_id);
    expect(readPresentSnapshot(store, identity).work).toEqual(first.work);
    expect(readPresentSnapshot(store, { ...identity, project_ids: ['another-project'] }).work).toEqual(saved.work);
  });

  test('SQLite failure on second row rolls back first row and allows a later lawful commit', () => {
    const saved = commitHostState(fixture());
    database.exec(
      "CREATE TRIGGER fail_ledger BEFORE UPDATE ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT, 'injected second row failure'); END",
    );
    expect(() => commitHostState(next(saved))).toThrow(/injected second row failure/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    database.exec('DROP TRIGGER fail_ledger');
    expect(commitHostState(next(saved)).work.revision).toBe(2);
  });

  test('first-create failure on ledger insert leaves no work row', () => {
    database.exec(
      "CREATE TRIGGER fail_create BEFORE INSERT ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT, 'injected create failure'); END",
    );
    expect(() => commitHostState(fixture())).toThrow(/injected create failure/);
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
  });

  test.each([
    [
      'old checkpoint',
      (input: MutableHostStateWrite) => {
        setFixtureField(input.nextWork, 'schema', 'WorkCheckpoint/v2');
      },
    ],
    [
      'old ledger',
      (input: MutableHostStateWrite) => {
        setFixtureField(input.nextLedger, 'schema', 'CoordinationLedger/v2');
      },
    ],
    [
      'unknown field',
      (input: MutableHostStateWrite) => {
        setFixtureField(input.nextWork, 'legacy', true);
      },
    ],
    [
      'foreign workspace',
      (input: MutableHostStateWrite) => {
        input.nextWork.workspace_id = '3'.repeat(64);
      },
    ],
    [
      'unsafe implementation path',
      (input: MutableHostStateWrite) => {
        input.nextWork.binding.implementation_paths = ['.git/config'];
      },
    ],
    [
      'unsafe artifact path',
      (input: MutableHostStateWrite) => {
        input.nextWork.contracts.scope.path = '../scope.json';
      },
    ],
    [
      'wrong contract digest',
      (input: MutableHostStateWrite) => {
        input.nextWork.contracts.scope.sha256 = '4'.repeat(64);
      },
    ],
    [
      'legacy artifact reference',
      (input: MutableHostStateWrite) => {
        const ref = artifact();
        setFixtureField(ref, 'schema', 'ResearchResult/v2');
        input.nextWork.artifacts = [ref];
      },
    ],
    [
      'foreign artifact scope',
      (input: MutableHostStateWrite) => {
        const ref = artifact();
        ref.scope_id = 'other';
        input.nextWork.artifacts = [ref];
      },
    ],
    [
      'duplicate artifact identity',
      (input: MutableHostStateWrite) => {
        input.nextWork.artifacts = [artifact(), { ...artifact(), path: '.agent/other.json' }];
      },
    ],
    [
      'inactive resource ownership',
      (input: MutableHostStateWrite) => {
        firstTicket(input.nextLedger).status = 'queued';
      },
    ],
    [
      'expired lease',
      (input: MutableHostStateWrite) => {
        setFixtureField(firstTicket(input.nextLedger), 'expires_at', '2020-01-01T00:00:00Z');
      },
    ],
    [
      'invalid lease date',
      (input: MutableHostStateWrite) => {
        setFixtureField(firstTicket(input.nextLedger), 'expires_at', 'not-a-date');
      },
    ],
    [
      'foreign lease reference',
      (input: MutableHostStateWrite) => {
        setFixtureField(requiredLease(input.nextWork), 'ticket_id', 'other');
      },
    ],
    [
      'unscoped lease resource',
      (input: MutableHostStateWrite) => {
        firstTicket(input.nextLedger).active_resources = ['file:other.ts'];
      },
    ],
    [
      'incomplete leased scope',
      (input: MutableHostStateWrite) => {
        firstTicket(input.nextLedger).active_resources = [];
      },
    ],
    [
      'blocked leased scope',
      (input: MutableHostStateWrite) => {
        input.nextWork.binding.allowed_resources.push('component:pending');
        firstTicket(input.nextLedger).blocked_resources = ['component:pending'];
      },
    ],
    [
      'aliased resource paths',
      (input: MutableHostStateWrite) => {
        input.nextWork.binding.allowed_resources.push('file:SRC/task.ts');
      },
    ],
    [
      'resource duplicate',
      (input: MutableHostStateWrite) => {
        firstTicket(input.nextLedger).blocked_resources = ['file:src/task.ts'];
      },
    ],
    [
      'generation other than one on create',
      (input: MutableHostStateWrite) => {
        setFixtureField(firstTicket(input.nextLedger), 'generation', 2);
        setFixtureField(requiredLease(input.nextWork), 'generation', 2);
      },
    ],
    [
      'revision jump',
      (input: MutableHostStateWrite) => {
        input.nextWork.revision = 3;
      },
    ],
  ])('rejects %s without creating either row', (_name, mutate) => {
    const input = fixture();
    mutate(input);
    expect(() => commitHostState(input)).toThrow();
    expect(store.readHostStateSnapshot(identity).work).toBeNull();
    expect(store.readHostStateSnapshot(identity).ledger).toBeNull();
  });

  test('rejects unsafe contour keys and schema-valid payloads above the host aggregate limit', () => {
    const unsafe = fixture();
    firstTicket(unsafe.nextLedger).contour_keys.push('file:../escape.ts');
    expect(() => commitHostState(unsafe)).toThrow(/resource file path is unsafe/);
    const oversized = fixture();
    oversized.nextLedger.claims = Array.from({ length: 4096 }, (_, index) => ({
      ...clone(firstClaim(oversized.nextLedger)),
      claim_id: 'claim-oversized-' + index,
    }));
    expect(() => commitHostState(oversized)).toThrow(/node budget|aggregate record limit/);
  });

  test.each([
    [
      'source',
      (data: MutableHostStateWrite) => {
        data.nextWork.binding.work_source_revision = 'changed';
      },
    ],
    [
      'configuration',
      (data: MutableHostStateWrite) => {
        data.nextWork.binding.config_digest = '5'.repeat(64);
      },
    ],
    [
      'run identity',
      (data: MutableHostStateWrite) => {
        data.nextWork.execution.run_id = 'different';
      },
    ],
    [
      'input identity',
      (data: MutableHostStateWrite) => {
        data.nextWork.execution.input_digest = '5'.repeat(64);
      },
    ],
    [
      'reference address',
      (data: MutableHostStateWrite) => {
        data.nextWork.contracts.scope.path = '.agent/moved.json';
      },
    ],
    [
      'artifact removal',
      (data: MutableHostStateWrite) => {
        data.nextWork.artifacts = [];
      },
    ],
    [
      'artifact replacement',
      (data: MutableHostStateWrite) => {
        atIndex(data.nextWork.artifacts, 0, 'artifact').sha256 = '5'.repeat(64);
      },
    ],
    [
      'unfenced owner change',
      (data: MutableHostStateWrite) => {
        firstTicket(data.nextLedger).thread_id = 'other';
        const lease = data.nextWork.lease;
        if (!lease) throw new Error('fixture lease is missing');
        lease.thread_id = 'other';
      },
    ],
    [
      'ticket deletion',
      (data: MutableHostStateWrite) => {
        data.nextWork.lease = null;
        data.nextLedger.tickets = [];
      },
    ],
    [
      'expiry regression',
      (data: MutableHostStateWrite) => {
        firstTicket(data.nextLedger).expires_at = new Date(Date.now() + 1000).toISOString();
      },
    ],
    [
      'wrong expected digest',
      (data: MutableHostStateWrite) => {
        requiredValue(data.expectedWork, 'fixture expected work version').digest = '5'.repeat(64);
      },
    ],
  ])('rejects %s on update and preserves both rows', (_name, mutate) => {
    const input = fixture();
    input.nextWork.artifacts.push(artifact());
    const saved = commitHostState(input);
    const data = next(saved);
    mutate(data);
    expect(() => commitHostState(data)).toThrow();
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('allows append-only artifacts, phase progress, lease renewal and explicit fenced revocation', () => {
    const saved = commitHostState(fixture());
    const input = next(saved);
    input.nextWork.artifacts.push(artifact());
    input.nextWork.execution.phase = 'validation';
    setActiveLease(input.nextLedger, new Date(Date.now() + 7200_000).toISOString());
    const progressed = commitHostState(input);
    const revoke = next(progressed);
    revoke.nextWork.lease = null;
    firstTicket(revoke.nextLedger).generation = 2;
    revokeTicket(revoke.nextLedger);
    const revoked = commitHostState(revoke);
    expect(firstTicket(revoked.ledger).generation).toBe(2);
    expect(revoked.work.artifacts).toEqual([artifact()]);
  });

  test('rejects a later active claim behind an earlier blocked FIFO request', () => {
    const earlier = fixture();
    earlier.nextWork.lease = null;
    Object.assign(firstTicket(earlier.nextLedger), {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    setFixtureField(firstClaim(earlier.nextLedger), 'status', 'recovered');
    const saved = commitHostState(earlier);
    const later = fixture('other');
    later.expectedLedger = saved.ledgerVersion;
    later.nextLedger.revision = saved.ledger.revision + 1;
    includeExistingLedger(later, saved.ledger);
    expect(() => commitHostState(later)).toThrow(/FIFO/);
  });

  test('rejects shortening a current active claim lease', () => {
    const saved = commitHostState(fixture());
    const input = next(saved);
    setActiveLease(
      input.nextLedger,
      new Date(
        Date.parse(requiredValue(firstTicket(saved.ledger).expires_at, 'current ticket expiry')) - 1000,
      ).toISOString(),
    );
    expect(() => commitHostState(input)).toThrow(/expiry cannot regress/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('rejects incomplete operation history and unsupported generation jumps', () => {
    const invalidOperation = fixture();
    invalidOperation.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-incomplete',
      kind: 'release',
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      created_at: new Date().toISOString(),
    });
    expect(() => commitHostState(invalidOperation)).toThrow(/current CoordinationLedger/);
    const missingNotice = fixture();
    missingNotice.nextLedger.dispositions.push({
      schema: 'ConflictDisposition/v1',
      disposition_id: 'disposition-orphan',
      subject_kind: 'notice',
      subject_id: 'notice-missing',
      kind: 'serialize',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/coordination.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(missingNotice)).toThrow(/disposition subject is missing/);
    const invalidContour = fixture();
    invalidContour.nextLedger.contours.push({
      schema: 'ReleaseContour/v1',
      contour_id: 'contour-invalid',
      generation: 1,
      work_ids: [identity.work_id],
      ticket_ids: [firstTicket(invalidContour.nextLedger).ticket_id],
      frozen: true,
      created_at: '2026-09-18T00:00:00.000Z',
      contour_digest: 'f'.repeat(64),
    });
    expect(() => commitHostState(invalidContour)).toThrow(/contour digest binding/);
    const initialHistory = fixture();
    initialHistory.nextLedger.contours.push(frozenContour(initialHistory.nextLedger));
    expect(() => commitHostState(initialHistory)).toThrow(/initial ledger/);
    const saved = commitHostState(fixture());
    const generationJump = next(saved);
    generationJump.nextLedger.open_generation += 2;
    expect(() => commitHostState(generationJump)).toThrow(/generation transition/);

    const progressed = commitHostState(next(saved));
    const backdated = next(progressed);
    backdated.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-backdated',
      kind: 'release',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/release.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(backdated)).toThrow(/new coordination operation revision/);

    const wildcardRelease = next(progressed);
    wildcardRelease.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'operation-wildcard',
      kind: 'release',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/**'],
      from_ledger_revision: progressed.ledger.revision,
      to_ledger_revision: progressed.ledger.revision + 1,
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/release.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(wildcardRelease)).toThrow(/new release operation ticket binding/);
  });

  test('rejects invalid FIFO insertion, unready freeze, orphan retirement and historical claim rewrites', () => {
    const saved = commitHostState(fixture());
    const invalidSequence = fixture('other', 'file:src/other.ts');
    invalidSequence.expectedLedger = saved.ledgerVersion;
    invalidSequence.nextLedger.revision = 2;
    includeExistingLedger(invalidSequence, saved.ledger);
    const insertedTicket = atIndex(invalidSequence.nextLedger.tickets, 1, 'inserted FIFO ticket');
    insertedTicket.sequence++;
    invalidSequence.nextLedger.next_sequence++;
    expect(() => commitHostState(invalidSequence)).toThrow(/FIFO sequence/);

    const unreadyFreeze = next(saved);
    unreadyFreeze.nextLedger.open_generation = 2;
    unreadyFreeze.nextLedger.contours.push(frozenContour(unreadyFreeze.nextLedger));
    expect(() => commitHostState(unreadyFreeze)).toThrow(/frozen prior-generation contour/);

    const orphanRetirement = next(saved);
    orphanRetirement.nextLedger.retirements.push({
      schema: 'CoordinationTicketRetirement/v1',
      retirement_id: 'retirement-orphan',
      work_id: identity.work_id,
      thread_id: 'thread',
      ticket_id: 'ticket-missing',
      generation: 1,
      source_revision: 'source-2',
      ticket_source_revision: 'source',
      superseding_ticket_id: 'ticket-superseding-missing',
      superseding_source_revision: 'source-2',
      from_status: 'active',
      to_status: 'read_only',
      resources: [],
      reason: 'superseded',
      pointer: '.agent/decisions/retirement.json',
      actor: 'principal-1',
      from_revision: 1,
      to_revision: 2,
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      timestamp: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(orphanRetirement)).toThrow(/retirement ticket is missing/);

    const revoke = next(saved);
    firstTicket(revoke.nextLedger).generation = 2;
    revokeTicket(revoke.nextLedger);
    revoke.nextWork.lease = null;
    const revoked = commitHostState(revoke);
    const rewrite = next(revoked);
    setFixtureField(firstClaim(rewrite.nextLedger), 'generation', 2);
    expect(() => commitHostState(rewrite)).toThrow(/claim generation transition/);
  });

  test('binds ticket retirement history to the exact work CAS transition', () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const deadline = performance.now() + 5_000;
    const initial = fixture();
    const retiredTicket = firstTicket(initial.nextLedger);
    const retiredClaim = firstClaim(initial.nextLedger);
    retiredTicket.ticket_id = 'ticket-retired';
    retiredTicket.source_revision = 'source-old';
    retiredTicket.claim_ids = ['claim-retired'];
    retiredClaim.claim_id = 'claim-retired';
    retiredClaim.ticket_id = 'ticket-retired';
    setFixtureField(requiredLease(initial.nextWork), 'ticket_id', 'ticket-retired');
    initial.nextLedger.tickets.push({
      ...clone(retiredTicket),
      ticket_id: 'ticket-superseding',
      source_revision: 'source',
      sequence: 2,
      status: 'queued',
      claim_ids: [],
      expires_at: null,
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
    });
    initial.nextLedger.next_sequence = 3;
    const saved = commitHostState(initial);

    const staleRevision = next(saved);
    staleRevision.nextWork.lease = null;
    revokeTicket(staleRevision.nextLedger, firstTicket(staleRevision.nextLedger));
    staleRevision.nextLedger.retirements.push({
      schema: 'CoordinationTicketRetirement/v1',
      retirement_id: 'retirement-stale-work-revision',
      work_id: identity.work_id,
      thread_id: 'thread',
      ticket_id: 'ticket-retired',
      generation: 1,
      source_revision: 'source',
      ticket_source_revision: 'source-old',
      superseding_ticket_id: 'ticket-superseding',
      superseding_source_revision: 'source',
      from_status: 'active',
      to_status: 'read_only',
      resources: ['file:src/task.ts'],
      reason: 'superseded',
      pointer: '.agent/decisions/retirement.json',
      actor: 'principal-1',
      from_revision: 100,
      to_revision: 101,
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      timestamp: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(staleRevision)).toThrow(
      /history transition invalid|coordination rebind binding invalid/,
    );
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    const valid = clone(staleRevision);
    const retirement = atIndex(valid.nextLedger.retirements, 0, 'owned retirement');
    retirement.retirement_id = 'retirement-owned-current-work';
    retirement.from_revision = saved.work.revision;
    retirement.to_revision = valid.nextWork.revision;
    const retired = commitHostState(valid);
    expect(retired.ledger.retirements).toEqual([retirement]);
    expect(retired.work.lease).toBeNull();
    expect(firstTicket(retired.ledger).status).toBe('read_only');
    expect(() => commitHostState(valid)).toThrow('state compare-and-swap conflict');
    expect(store.readHostStateSnapshot(identity)).toEqual(retired);
    if (performance.now() >= deadline) throw new Error('Host ticket retirement fixture exceeded its case deadline');
    preserveHostFixtureRoot = false;
  });

  test('rejects incomplete handoff, cross-generation FIFO bypass and terminal ticket reactivation', () => {
    const incomplete = fixture();
    incomplete.nextWork.lease = null;
    Object.assign(firstTicket(incomplete.nextLedger), {
      status: 'ready_for_handoff',
      active_resources: [],
      expires_at: null,
    });
    firstClaim(incomplete.nextLedger).status = 'recovered';
    expect(() => commitHostState(incomplete)).toThrow(/complete current ownership/);

    const bypass = fixture();
    const laterTicket = {
      ...clone(firstTicket(bypass.nextLedger)),
      ticket_id: 'ticket-later-generation',
      generation: 2,
      sequence: 2,
      claim_ids: ['claim-later-generation'],
    };
    const laterClaim = {
      ...clone(firstClaim(bypass.nextLedger)),
      claim_id: 'claim-later-generation',
      ticket_id: laterTicket.ticket_id,
      generation: 2,
    };
    Object.assign(firstTicket(bypass.nextLedger), {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    firstClaim(bypass.nextLedger).status = 'recovered';
    bypass.nextLedger.tickets.push(laterTicket);
    bypass.nextLedger.claims.push(laterClaim);
    bypass.nextLedger.open_generation = 2;
    bypass.nextLedger.next_sequence = 3;
    bypass.nextWork.lease = {
      ticket_id: laterTicket.ticket_id,
      thread_id: laterTicket.thread_id,
      generation: laterTicket.generation,
    };
    expect(() => commitHostState(bypass)).toThrow(/coordination FIFO/);

    const saved = commitHostState(fixture());
    const revoke = next(saved);
    revoke.nextWork.lease = null;
    firstTicket(revoke.nextLedger).generation = 2;
    revokeTicket(revoke.nextLedger);
    const terminal = commitHostState(revoke);
    const reactivate = next(terminal);
    firstTicket(reactivate.nextLedger).status = 'active';
    firstTicket(reactivate.nextLedger).generation = 3;
    firstTicket(reactivate.nextLedger).claim_ids.push('claim-reactivated');
    firstTicket(reactivate.nextLedger).active_resources = ['file:src/task.ts'];
    firstTicket(reactivate.nextLedger).expires_at = '2099-01-01T00:00:00.000Z';
    reactivate.nextLedger.claims.push({
      schema: 'WorkstreamClaim/v1',
      claim_id: 'claim-reactivated',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      generation: 3,
      resources: ['file:src/task.ts'],
      lease_expires_at: '2099-01-01T00:00:00.000Z',
      status: 'active',
      created_at: '2026-09-18T00:00:00.000Z',
      renewed_at: '2026-09-18T00:00:00.000Z',
    });
    reactivate.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 3 };
    expect(() => commitHostState(reactivate)).toThrow(/terminal ticket mutation/);
  });

  test('accepts an authorized notice acknowledgement and partial claim release', () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const deadline = performance.now() + 5_000;
    const first = commitHostState(fixture());
    const queued = fixture('other');
    queued.nextWork.lease = null;
    Object.assign(firstTicket(queued.nextLedger), {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    setFixtureField(firstClaim(queued.nextLedger), 'status', 'recovered');
    queued.expectedLedger = first.ledgerVersion;
    queued.nextLedger.revision = 2;
    includeExistingLedger(queued, first.ledger);
    queued.nextLedger.notices.push({
      schema: 'ConflictNotice/v1',
      notice_id: 'notice-shared',
      generation: 1,
      contender_ticket_id: 'ticket-other',
      contender_work_id: 'other',
      owner_ticket_id: 'ticket-work',
      owner_work_id: 'work',
      owner_thread_id: 'thread',
      resources: ['file:src/task.ts'],
      status: 'open',
      acknowledgements: [],
      created_at: '2026-09-18T00:00:00.000Z',
    });
    const terminalNotice = clone(queued);
    atIndex(terminalNotice.nextLedger.notices, 0, 'terminal notice fixture').status = 'acknowledged';
    expect(() => commitHostState(terminalNotice)).toThrow(
      /acknowledged notice requires an acknowledgement|history transition invalid/,
    );
    const queuedSaved = commitHostState(queued);
    const emptyAcknowledgement = next(queuedSaved);
    atIndex(emptyAcknowledgement.nextLedger.notices, 0, 'empty acknowledgement notice').status = 'acknowledged';
    expect(() => commitHostState(emptyAcknowledgement)).toThrow(/acknowledged notice requires an acknowledgement/);
    const acknowledge = next(queuedSaved);
    const acknowledgementNotice = atIndex(acknowledge.nextLedger.notices, 0, 'acknowledged notice');
    acknowledgementNotice.status = 'acknowledged';
    const acknowledgements = acknowledgementNotice.acknowledgements;
    if (!Array.isArray(acknowledgements)) throw new Error('acknowledgement list fixture is missing');
    acknowledgements.push({
      actor: 'principal-other',
      at: '2026-09-18T00:01:00.000Z',
    });
    const acknowledged = commitHostState(acknowledge);
    expect(atIndex(acknowledged.ledger.notices, 0, 'committed acknowledged notice').status).toBe('acknowledged');
    const resolved = next(acknowledged);
    atIndex(resolved.nextLedger.notices, 0, 'resolved notice').status = 'resolved';
    resolved.nextLedger.dispositions.push({
      schema: 'ConflictDisposition/v1',
      disposition_id: 'disposition-unrelated-claim',
      subject_kind: 'claim',
      subject_id: 'claim-other',
      kind: 'recover_expired',
      decided_by: 'principal-other',
      decision_pointer: '.agent/decisions/coordination.json',
      created_at: '2026-09-18T00:02:00.000Z',
    });
    const queuedIdentity = { ...identity, work_id: 'other' };
    expect(() => commitHostState(resolved)).toThrow('resolved notice requires a disposition');
    expect(store.readHostStateSnapshot(queuedIdentity)).toEqual(acknowledged);
    resolved.nextLedger.dispositions.push({
      ...atIndex(resolved.nextLedger.dispositions, 0, 'prior claim disposition'),
      disposition_id: 'disposition-resolve-notice',
      subject_kind: 'notice',
      subject_id: acknowledgementNotice.notice_id,
      kind: 'serialize',
    });
    const settled = commitHostState(resolved);
    expect(atIndex(settled.ledger.notices, 0, 'persisted resolved notice').status).toBe('resolved');
    expect(settled.ledger.dispositions).toEqual(resolved.nextLedger.dispositions);
    expect(() => commitHostState(resolved)).toThrow('state compare-and-swap conflict');
    expect(store.readHostStateSnapshot(queuedIdentity)).toEqual(settled);

    const partialDatabase = new Database(path.join(root, 'partial.sqlite'), { create: true, strict: true });
    handles.push(partialDatabase);
    const partialStore = new HostStateStore(partialDatabase, workspace);
    const initial = fixture();
    initial.nextWork.binding.allowed_resources.push('file:src/second.ts');
    initial.nextWork.lifecycle.scope.allowed_paths.push('src/second.ts');
    firstTicket(initial.nextLedger).contour_keys.push('file:src/second.ts');
    firstTicket(initial.nextLedger).exclusive_resources.push('file:src/second.ts');
    firstTicket(initial.nextLedger).active_resources.push('file:src/second.ts');
    firstClaim(initial.nextLedger).resources.push('file:src/second.ts');
    const partialSaved = commitHostStateOn(partialStore, initial);
    const release = next(partialSaved);
    setFixtureField(firstTicket(release.nextLedger), 'generation', 2);
    firstTicket(release.nextLedger).active_resources = ['file:src/task.ts'];
    setFixtureField(firstClaim(release.nextLedger), 'generation', 2);
    firstClaim(release.nextLedger).resources = ['file:src/task.ts'];
    setFixtureField(requiredLease(release.nextWork), 'generation', 2);
    expect(firstTicket(commitHostStateOn(partialStore, release).ledger).active_resources).toEqual(['file:src/task.ts']);
    if (performance.now() >= deadline) throw new Error('Host notice resolution fixture exceeded its case deadline');
    preserveHostFixtureRoot = false;
  });

  test('rejects duplicate active ownership, active-claim expansion and orphan rebind history', () => {
    const duplicate = fixture();
    duplicate.nextLedger.claims.push({ ...clone(firstClaim(duplicate.nextLedger)), claim_id: 'claim-duplicate' });
    firstTicket(duplicate.nextLedger).claim_ids.push('claim-duplicate');
    expect(() => commitHostState(duplicate)).toThrow(/active claim ownership/);

    const expansionDatabase = new Database(path.join(root, 'expansion.sqlite'), { create: true, strict: true });
    handles.push(expansionDatabase);
    const expansionStore = new HostStateStore(expansionDatabase, workspace);
    const expansionInitial = fixture();
    expansionInitial.nextWork.binding.allowed_resources.push('file:src/second.ts');
    expansionInitial.nextWork.lifecycle.scope.allowed_paths.push('src/second.ts');
    firstTicket(expansionInitial.nextLedger).contour_keys.push('file:src/second.ts');
    firstTicket(expansionInitial.nextLedger).exclusive_resources.push('file:src/second.ts');
    const expansionSaved = commitHostStateOn(expansionStore, expansionInitial);
    const expansion = next(expansionSaved);
    setFixtureField(firstTicket(expansion.nextLedger), 'generation', 2);
    firstTicket(expansion.nextLedger).active_resources.push('file:src/second.ts');
    setFixtureField(firstClaim(expansion.nextLedger), 'generation', 2);
    firstClaim(expansion.nextLedger).resources.push('file:src/second.ts');
    setFixtureField(requiredLease(expansion.nextWork), 'generation', 2);
    expect(() => commitHostStateOn(expansionStore, expansion)).toThrow(/active claim resources cannot expand/);

    const saved = commitHostState(fixture());
    const orphan = next(saved);
    orphan.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-orphan',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-missing',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: [],
      retired_claim_ids: ['claim-missing'],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: 1,
      to_ledger_revision: 2,
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(orphan)).toThrow(/rebind ticket is missing/);
    const staleRevision = next(saved);
    staleRevision.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-stale-revision',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-work',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: ['file:src/task.ts'],
      retired_claim_ids: [],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: 100,
      to_ledger_revision: 101,
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(staleRevision)).toThrow(
      /history transition invalid|coordination rebind binding invalid/,
    );
  });

  test.each(['explicit', 'omitted'] as const)(
    'accepts an owned scope rebind and claim disposition in one history transition (claimed resources %s)',
    (claimedResourcesMode) => {
      const withClaimedResources = claimedResourcesMode === 'explicit';
      const saved = commitHostState(fixture());
      const input = next(saved);
      input.nextLedger.dispositions.push({
        schema: 'ConflictDisposition/v1',
        disposition_id: 'disposition-recover',
        subject_kind: 'claim',
        subject_id: 'claim-work',
        kind: 'recover_expired',
        decided_by: 'principal-1',
        decision_pointer: '.agent/decisions/coordination.json',
        created_at: '2026-09-18T00:01:00.000Z',
      });
      input.nextLedger.rebinds.push({
        schema: 'CoordinationScopeRebind/v1',
        rebind_id: 'rebind-work',
        work_id: identity.work_id,
        previous_ticket_id: null,
        previous_source_revision: null,
        ticket_id: 'ticket-work',
        thread_id: 'thread',
        source_revision: 'source',
        resources: ['file:src/task.ts'],
        ...(withClaimedResources ? { claimed_resources: ['file:src/task.ts'] } : {}),
        retired_claim_ids: [],
        reason: 'scope correction',
        decided_by: 'principal-1',
        decision_pointer: '.agent/decisions/rebind.json',
        from_ledger_revision: saved.ledger.revision,
        to_ledger_revision: input.nextLedger.revision,
        created_at: '2026-09-18T00:01:00.000Z',
      });
      const rebound = commitHostState(input);
      expect(atIndex(rebound.ledger.dispositions, 0, 'committed disposition').subject_id).toBe('claim-work');
      expect(atIndex(rebound.ledger.rebinds, 0, 'committed scope rebind').ticket_id).toBe('ticket-work');
      expect(atIndex(rebound.ledger.rebinds, 0, 'committed scope rebind').claimed_resources).toEqual(
        withClaimedResources ? ['file:src/task.ts'] : undefined,
      );
      expect(store.readHostStateSnapshot(identity)).toEqual(rebound);
    },
  );

  test('accepts a same-ticket retired claim in an owned scope rebind', () => {
    const saved = commitHostState(fixture());
    const input = next(saved);
    input.nextLedger.claims.push({
      ...clone(firstClaim(input.nextLedger)),
      claim_id: 'claim-retired-same-ticket',
      status: 'recovered',
    });
    firstTicket(input.nextLedger).claim_ids.push('claim-retired-same-ticket');
    input.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-retired-same-ticket',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-work',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: ['file:src/task.ts'],
      retired_claim_ids: ['claim-retired-same-ticket'],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: saved.ledger.revision,
      to_ledger_revision: input.nextLedger.revision,
      created_at: '2026-09-18T00:01:00.000Z',
    });
    const rebound = commitHostState(input);
    expect(atIndex(rebound.ledger.rebinds, 0, 'committed same-ticket rebind').retired_claim_ids).toEqual([
      'claim-retired-same-ticket',
    ]);
  });

  test('rejects a rebind that retires a claim from an unrelated ticket', async () => {
    const first = fixture();
    first.nextWork.revision = 7;
    first.nextWork.lifecycle.revision = 7;
    first.nextLedger.revision = 9;
    const second = fixture('other', 'file:src/other.ts');
    second.nextWork.revision = 3;
    second.nextWork.lifecycle.revision = 3;
    const ledger = clone(first.nextLedger);
    ledger.next_sequence = 3;
    ledger.tickets.push({ ...clone(firstTicket(second.nextLedger)), sequence: 2 });
    ledger.claims.push(...clone(second.nextLedger.claims));
    quiesceImportedState([first.nextWork, second.nextWork], ledger);
    const binding = {
      ...reconciliationBinding({ workVersion: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } }),
      work: [
        {
          identity: { ...identity, work_id: 'other' },
          version: { revision: 3, digest: canonicalJsonDigest(second.nextWork) },
        },
        { identity, version: { revision: 7, digest: canonicalJsonDigest(first.nextWork) } },
      ],
    };
    store = maintenanceStore();
    const fence = store.acquireMaintenanceFence(maintenanceBinding());
    store.importReconciledHostState([first.nextWork, second.nextWork], ledger, binding, fence);
    await store.releaseMaintenanceFence(fence);
    const saved = readPresentSnapshot(store, identity);
    const input = next(saved);
    input.nextLedger.rebinds.push({
      schema: 'CoordinationScopeRebind/v1',
      rebind_id: 'rebind-unrelated-retired-claim',
      work_id: identity.work_id,
      previous_ticket_id: null,
      previous_source_revision: null,
      ticket_id: 'ticket-work',
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      claimed_resources: ['file:src/task.ts'],
      retired_claim_ids: ['claim-other'],
      reason: 'scope correction',
      decided_by: 'principal-1',
      decision_pointer: '.agent/decisions/rebind.json',
      from_ledger_revision: saved.ledger.revision,
      to_ledger_revision: input.nextLedger.revision,
      created_at: '2026-09-18T00:01:00.000Z',
    });
    expect(() => commitHostState(input)).toThrow(/rebind binding invalid/);
  });

  test.each(['accepted', 'feedback', 'rejected'] as const)(
    'requires contour assurance before batching and commits an attributable %s batch decision',
    (decision) => {
      preserveHostFixtureRoot = 'case failed or timed out';
      const deadline = performance.now() + 5_000;
      const rows = () => ({
        host: database.query<HostStateSqlRow, []>('SELECT * FROM agent_host_state ORDER BY workspace_id,kind,id').all(),
        journalSchema: database
          .query<SqliteNameRow, []>("SELECT name FROM sqlite_master WHERE name='agent_host_mastra_session_ledger'")
          .all(),
      });
      const initial = commitHostState(fixture());
      const ready = next(initial);
      ready.nextWork.lease = null;
      firstTicket(ready.nextLedger).status = 'ready_for_handoff';
      const readySaved = commitHostState(ready);

      const emptyFreeze = next(readySaved);
      const { contour_digest: _emptyDigest, ...emptyContour } = frozenContour(emptyFreeze.nextLedger);
      emptyContour.ticket_ids = [];
      emptyContour.work_ids = [];
      emptyFreeze.nextLedger.contours.push({ ...emptyContour, contour_digest: canonicalJsonDigest(emptyContour) });
      emptyFreeze.nextLedger.open_generation++;
      const readyRows = rows();
      expect(readyRows.journalSchema).toEqual([]);
      const readyGovernance = governanceRows();
      expect(() => commitHostState(emptyFreeze)).toThrow(
        'open generation requires one frozen prior-generation contour',
      );
      expect(rows()).toEqual(readyRows);
      expect(governanceRows()).toEqual(readyGovernance);
      expect(database.inTransaction).toBe(false);
      expect(store.readHostStateSnapshot(identity)).toEqual(readySaved);

      const freeze = next(readySaved);
      const contour = frozenContour(freeze.nextLedger);
      freeze.nextLedger.contours.push(contour);
      freeze.nextLedger.open_generation++;
      const frozen = commitHostState(freeze);
      const batch = {
        schema: 'ReleaseBatch/v1',
        batch_id: 'batch-work',
        contour_id: contour.contour_id,
        generation: contour.generation,
        work_ids: [...contour.work_ids],
        operations: [{ order: 1, source: 'src/task.ts', destination: 'target/task.ts', operation: 'copy' }],
        do_not_deploy: [],
        post_deployment_checks: [
          { id: 'check-1', step: 'Run the task.', expected: 'The task succeeds.', ac_refs: ['AC-1'] },
        ],
        status: 'ready_for_user_testing',
        created_at: '2026-09-18T00:02:00.000Z',
      };
      const withoutAssurance = next(frozen);
      withoutAssurance.nextLedger.batches.push(batch);
      expect(() => commitHostState(withoutAssurance)).toThrow(/requires contour assurance/);

      const assurance = next(frozen);
      assurance.nextLedger.operations.push({
        schema: 'CoordinationOperation/v1',
        operation_id: 'assurance-work',
        kind: 'contour_assurance',
        contour_id: contour.contour_id,
        contour_digest: contour.contour_digest,
        integration_work_id: identity.work_id,
        test_receipts: ['test-receipt'],
        review_receipt_ids: ['review-1', 'review-2', 'review-3'],
        reverse_receipt_ids: ['reverse-1', 'reverse-2', 'reverse-3'],
        from_ledger_revision: frozen.ledger.revision,
        to_ledger_revision: frozen.ledger.revision + 1,
        created_at: '2026-09-18T00:03:00.000Z',
      });
      const assured = commitHostState(assurance);
      const directAccepted = next(assured);
      directAccepted.nextLedger.batches.push({
        ...batch,
        status: 'accepted',
        decision_pointer: '.agent/decisions/direct-batch.json',
      });
      firstTicket(directAccepted.nextLedger).status = 'released';
      firstTicket(directAccepted.nextLedger).active_resources = [];
      firstTicket(directAccepted.nextLedger).expires_at = null;
      firstClaim(directAccepted.nextLedger).status = 'released';
      firstClaim(directAccepted.nextLedger).resources = [];
      expect(() => commitHostState(directAccepted)).toThrow(/history transition invalid/);
      const build = next(assured);
      build.nextLedger.batches.push(batch);
      const built = commitHostState(build);
      const journalBefore = rows().journalSchema;
      expect(journalBefore).toEqual([]);
      const governanceBefore = governanceRows();
      const preserved = commitHostState(next(built));
      expect(preserved.ledger.batches).toEqual(built.ledger.batches);
      expect(preserved.ledger.tickets).toEqual(built.ledger.tickets);
      expect(preserved.ledger.claims).toEqual(built.ledger.claims);
      expect(preserved.work.lease).toBeNull();
      expect(rows().journalSchema).toEqual(journalBefore);
      expect(governanceRows()).toEqual(governanceBefore);

      const inconsistent = next(preserved);
      const inconsistentBatch = atIndex(inconsistent.nextLedger.batches, 0, 'inconsistent batch fixture');
      inconsistentBatch.status = decision;
      inconsistentBatch.decision_pointer = '.agent/decisions/batch-work.json';
      const rowsBefore = rows();
      expect(() => commitHostState(inconsistent)).toThrow(
        decision === 'accepted' ? 'atomically release contour tickets' : 'atomically queue contour tickets',
      );
      expect(rows()).toEqual(rowsBefore);
      expect(governanceRows()).toEqual(governanceBefore);

      const decide = next(preserved);
      const decisionBatch = atIndex(decide.nextLedger.batches, 0, 'batch decision fixture');
      decisionBatch.status = decision;
      decisionBatch.decision_pointer = '.agent/decisions/batch-work.json';
      firstTicket(decide.nextLedger).status = decision === 'accepted' ? 'released' : 'queued';
      firstTicket(decide.nextLedger).active_resources = [];
      firstTicket(decide.nextLedger).blocked_resources =
        decision === 'accepted' ? [] : [...firstTicket(decide.nextLedger).exclusive_resources];
      firstTicket(decide.nextLedger).expires_at = null;
      firstClaim(decide.nextLedger).status = 'released';
      firstClaim(decide.nextLedger).resources = [];
      const decided = commitHostState(decide);
      expect(decided.work).toEqual(decide.nextWork);
      expect(decided.ledger).toEqual(decide.nextLedger);
      expect(atIndex(decided.ledger.batches, 0, 'committed batch').status).toBe(decision);
      expect(rows().journalSchema).toEqual(journalBefore);
      expect(governanceRows()).toEqual(governanceBefore);
      const decidedRows = rows();
      expect(() => commitHostState(decide)).toThrow('state compare-and-swap conflict');
      expect(rows()).toEqual(decidedRows);
      expect(governanceRows()).toEqual(governanceBefore);
      expect(store.readHostStateSnapshot(identity)).toEqual(decided);
      if (performance.now() >= deadline) throw new Error('Host batch decision fixture exceeded its case deadline');
      preserveHostFixtureRoot = false;
    },
  );

  test('persists canonical bytes for the same canonical state digest', () => {
    const saved = commitHostState(fixture());
    const rows = database
      .query<Pick<HostStateSqlRow, 'kind' | 'payload'>, []>('SELECT kind, payload FROM agent_host_state ORDER BY kind')
      .all();
    expect(rows).toEqual([
      { kind: 'ledger', payload: canonicalJson(saved.ledger) },
      { kind: 'work', payload: canonicalJson(saved.work) },
    ]);
  });

  test('shared ledger rejects conflicting case-alias claims and permits disjoint work without touching foreign tickets', () => {
    const first = commitHostState(fixture());
    const collision = fixture('other', 'file:SRC/task.ts');
    collision.expectedLedger = first.ledgerVersion;
    collision.nextLedger.revision = 2;
    includeExistingLedger(collision, first.ledger);
    expect(() => commitHostState(collision)).toThrow(/coordination FIFO|conflicting owners/);
    const second = fixture('other', 'file:src/other.ts');
    second.expectedLedger = first.ledgerVersion;
    second.nextLedger.revision = 2;
    includeExistingLedger(second, first.ledger);
    const saved = commitHostState(second);
    const changeForeign = next(saved);
    setActiveLease(changeForeign.nextLedger, new Date(Date.now() + 7200_000).toISOString());
    expect(() => commitHostState(changeForeign)).toThrow(/foreign (ticket|claim)/);
    expect(readPresentSnapshot(store, identity).work).toEqual(first.work);
  });

  test('rejects coordination history appended through a different work identity', () => {
    const first = commitHostState(fixture());
    const other = fixture('other', 'file:src/other.ts');
    other.expectedLedger = first.ledgerVersion;
    other.nextLedger.revision = 2;
    includeExistingLedger(other, first.ledger);
    const saved = commitHostState(other);
    const forged = next(saved);
    forged.nextLedger.operations.push({
      schema: 'CoordinationOperation/v1',
      operation_id: 'release-foreign-work',
      kind: 'release',
      ticket_id: 'ticket-work',
      work_id: identity.work_id,
      thread_id: 'thread',
      source_revision: 'source',
      resources: ['file:src/task.ts'],
      from_ledger_revision: saved.ledger.revision,
      to_ledger_revision: saved.ledger.revision + 1,
      decided_by: 'principal-other',
      decision_pointer: '.agent/decisions/foreign-release.json',
      created_at: '2026-09-18T00:00:00.000Z',
    });
    expect(() => commitHostState(forged)).toThrow(/history ownership invalid/);
  });

  test('blocked requests grant no ownership', () => {
    const first = commitHostState(fixture());
    const queued = fixture('other');
    queued.nextWork.lease = null;
    Object.assign(firstTicket(queued.nextLedger), {
      status: 'queued',
      active_resources: [],
      blocked_resources: ['file:src/task.ts'],
      expires_at: null,
    });
    firstClaim(queued.nextLedger).status = 'recovered';
    queued.expectedLedger = first.ledgerVersion;
    queued.nextLedger.revision = 2;
    includeExistingLedger(queued, first.ledger);
    expect(commitHostState(queued).work.lease).toBeNull();
  });

  test('expired active resources stay occupied until explicit fenced revocation', () => {
    const initial = fixture();
    initial.nextWork.lease = null;
    setActiveLease(initial.nextLedger, '2020-01-01T00:00:00Z');
    const saved = commitHostState(initial);
    const competing = fixture('other');
    competing.expectedLedger = saved.ledgerVersion;
    competing.nextLedger.revision = 2;
    includeExistingLedger(competing, saved.ledger);
    expect(() => commitHostState(competing)).toThrow(/coordination FIFO|conflicting owners/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
  });

  test('an expired lease cannot be revived without a new fencing generation', () => {
    const initial = fixture();
    initial.nextWork.lease = null;
    setActiveLease(initial.nextLedger, '2020-01-01T00:00:00Z');
    const saved = commitHostState(initial);
    const renewal = next(saved);
    setActiveLease(renewal.nextLedger, new Date(Date.now() + 3600_000).toISOString());
    renewal.nextWork.lease = { ticket_id: 'ticket-work', thread_id: 'thread', generation: 1 };
    expect(() => commitHostState(renewal)).toThrow(/fencing generation/);
    expect(store.readHostStateSnapshot(identity)).toEqual(saved);
    firstTicket(renewal.nextLedger).generation = 2;
    setFixtureField(requiredValue(activeClaimFor(renewal.nextLedger), 'renewed active claim'), 'generation', 2);
    setFixtureField(requiredLease(renewal.nextWork), 'generation', 2);
    expect(requiredLease(commitHostState(renewal).work).generation).toBe(2);
  });

  test('existing ticket order cannot be changed by a writer for another work', () => {
    const first = commitHostState(fixture());
    const input = fixture('other', 'file:src/other.ts');
    input.expectedLedger = first.ledgerVersion;
    input.nextLedger.revision = 2;
    includeExistingLedger(input, first.ledger);
    const saved = commitHostState(input);
    const reorder = next(saved);
    reorder.nextLedger.tickets.reverse();
    expect(() => commitHostState(reorder)).toThrow(/ticket order/);
    expect(store.readHostStateSnapshot({ ...identity, work_id: 'other' })).toEqual(saved);
  });

  test.each(['payload', 'digest', 'revision'] as const)(
    'detects stored %s corruption before any mutation',
    (field: 'payload' | 'digest' | 'revision') => {
      commitHostState(fixture());
      const value = field === 'revision' ? 99 : 'tampered';
      const sql = {
        payload: "UPDATE agent_host_state SET payload=? WHERE kind='work'",
        digest: "UPDATE agent_host_state SET digest=? WHERE kind='work'",
        revision: "UPDATE agent_host_state SET revision=? WHERE kind='work'",
      }[field];
      database.query<never, [SQLQueryBindings]>(sql).run(value);
      expect(() => store.readHostStateSnapshot(identity)).toThrow();
    },
  );

  test.each(['work', 'ledger'] as const)(
    'rejects a missing %s row rather than recreate partial authority',
    (kind: 'work' | 'ledger') => {
      commitHostState(fixture());
      database.query<never, [string]>('DELETE FROM agent_host_state WHERE kind=?').run(kind);
      expect(() => store.readHostStateSnapshot(identity)).toThrow();
      expect(() => commitHostState(fixture())).toThrow();
    },
  );

  test('requires file-backed recoverable database and rejects nested transaction ownership', () => {
    preserveHostFixtureRoot = 'case failed or timed out';
    const deadline = performance.now() + 5_000;
    const memory = new Database(':memory:');
    handles.push(memory);
    let rejected: unknown;
    try {
      new HostStateStore(memory, workspace);
    } catch (error) {
      rejected = error;
    }
    if (!(rejected instanceof Error)) throw new Error('memory-backed host database was not rejected with an Error');
    expect(Reflect.get(rejected, 'code')).toBe('GAP-HOST-STATE-001');
    expect(rejected.message).toMatch(/file-backed/);
    const beforeWorkspace = store.readWorkspaceSnapshot();
    expect(beforeWorkspace.work).toEqual([]);
    expect(beforeWorkspace.ledger).toBeNull();
    for (const integerMode of ['number', 'bigint'] as const) {
      const bytesBefore = readFileSync(databasePath);
      const readonlyHandle = new Database(databasePath, {
        readonly: true,
        strict: true,
        safeIntegers: integerMode === 'bigint',
      });
      handles.push(readonlyHandle);
      let primaryFailure: { error: unknown } | undefined;
      try {
        const inspected = new HostStateStore(
          readonlyHandle,
          workspace,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true,
        );
        const schema = database.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name');
        const schemaBefore = schema.all();
        const before = store.readHostStateSnapshot(identity);
        expect(
          requiredValue(
            readonlyHandle.query<ScalarCountRow, []>('SELECT COUNT(*) AS count FROM agent_host_state').get(),
            'native integer mode count',
          ).count,
        ).toBe(integerMode === 'bigint' ? 0n : 0);
        expect(inspected.readWorkspaceSnapshot()).toEqual(beforeWorkspace);
        expect(inspected.readHostStateSnapshot(identity)).toEqual(before);
        expect(inspected.readQualifiedRuntimeCodeContinuations(identity, 1)).toEqual([]);
        expect(() => inspected.recordAdmissionAttempt('readonly-denied', 1, { fixture: true })).toThrow(/readonly/i);
        expect(store.readHostStateSnapshot(identity)).toEqual(before);
        expect(schema.all()).toEqual(schemaBefore);
      } catch (error) {
        primaryFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              readonlyHandle.close();
              expect(readFileSync(databasePath)).toEqual(bytesBefore);
            },
          ],
          primaryFailure,
        );
      }
    }
    const empty = new Database(path.join(root, 'read-only-empty.sqlite'), { create: true, strict: true });
    handles.push(empty);
    expect(
      () =>
        new HostStateStore(
          empty,
          workspace,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          true,
        ),
    ).toThrow('read-only Host inspection requires the existing current schema');
    expect(empty.query<SqliteMasterRow, []>('SELECT name,sql FROM sqlite_master ORDER BY name').all()).toEqual([]);
    database.exec('PRAGMA journal_mode=MEMORY');
    expect(() => new HostStateStore(database, workspace)).toThrow(/journal/);
    expect(() => commitHostState(fixture())).toThrow(/journal/);
    database.exec('PRAGMA journal_mode=WAL');
    database.exec('PRAGMA synchronous=OFF');
    expect(() => commitHostState(fixture())).toThrow(/synchronization/);
    database.exec('PRAGMA synchronous=FULL');
    database.transaction(() => {
      expect(() => store.readHostStateSnapshot(identity)).toThrow(/nested/);
      expect(() => commitHostState(fixture())).toThrow(/nested/);
    })();
    if (performance.now() >= deadline) throw new Error('Host readonly database fixture exceeded its case deadline');
    preserveHostFixtureRoot = false;
  });

  test.each(['work-and-ledger', 'governance-reserve', 'governance-transition'])(
    'two independent Bun processes race on %s: exactly one commits',
    async (raceKind) => {
      const saved = commitHostState(fixture());
      const reservation =
        raceKind === 'governance-transition' ? store.reserveOperation('race', operationKey, requestDigest) : null;
      const moduleUrl = new URL('../../src/host-state.ts', import.meta.url).href;
      const racers: {
        child: import('node:child_process').ChildProcessWithoutNullStreams;
        ready: Promise<void>;
        done: Promise<string>;
      }[] = [];
      for (const number of [1, 2]) {
        const input = next(saved);
        input.nextWork.execution.phase = 'racer-' + number;
        const action =
          raceKind === 'work-and-ledger'
            ? `store.compareAndSwapHostState(${JSON.stringify(input)})`
            : raceKind === 'governance-reserve'
              ? `if (!store.reserveOperation('race',${JSON.stringify(operationKey)},${JSON.stringify(requestDigest)})) throw new Error('compare-and-swap conflict')`
              : `store.transitionOperation(${JSON.stringify(reservation)},${JSON.stringify(number === 1 ? 'commit_unknown' : 'aborted')})`;
        const code = `import { HostStateStore, openHostStateDatabase } from ${JSON.stringify(moduleUrl)};
        const db=openHostStateDatabase(${JSON.stringify(root)},${JSON.stringify(path.relative(root, databasePath))},${JSON.stringify(workspace)});
        const store=new HostStateStore(db,${JSON.stringify(workspace)}); console.log('READY');
        process.stdin.once('data',()=>{try {${action};console.log('COMMITTED');}
        catch(error){console.log(/compare-and-swap|state conflict/.test(error.message)?'CONFLICT':'ERROR:'+error.message);}finally{db.close();process.exit(0);}});`;
        const child = spawn(process.execPath, ['--eval', code], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
        children.push(child);
        let output = '',
          errors = '';
        let readyResolve!: () => void;
        const ready = new Promise<void>((resolve) => {
          readyResolve = resolve;
        });
        child.stdout.on('data', (data) => {
          output += data;
          if (output.includes('READY')) readyResolve();
        });
        child.stderr.on('data', (data) => {
          errors += data;
        });
        const done = new Promise<string>((resolve, reject) => {
          child.on('error', reject);
          child.on('close', (code) =>
            code === 0 ? resolve(output) : reject(new Error(errors || 'race process failed')),
          );
        });
        const racer = { child, ready, done };
        racers.push(racer);
        await racer.ready;
      }
      for (const racer of racers) racer.child.stdin.end('go\n');
      const results = await Promise.all(racers.map((racer) => racer.done));
      expect(results.filter((result) => result.includes('COMMITTED'))).toHaveLength(1);
      expect(results.filter((result) => result.includes('CONFLICT'))).toHaveLength(1);
      expect(readPresentSnapshot(store, identity).work.revision).toBe(raceKind === 'work-and-ledger' ? 2 : 1);
      if (raceKind !== 'work-and-ledger') expect(governanceRows()).toHaveLength(1);
    },
    15000,
  );
});

function markFixtureDelivered(
  input: MutableHostStateWrite,
  closeout: { clear_id: string; path: string; sha256: string },
): MutableHostStateWrite {
  const work = input.nextWork;
  const lifecycle = work.lifecycle;
  const fingerprint = 'a'.repeat(64);
  lifecycle.phase = 'DELIVERY';
  lifecycle.seal = {
    sealed_revision: work.revision,
    sealed_at: new Date().toISOString(),
    implementation_fingerprint: fingerprint,
  };
  lifecycle.assurance.review_generation = 1;
  lifecycle.assurance.delivery_cycle_id = `delivery-${work.binding.lifecycle_work_id}`;
  const reference = (
    kind: LifecycleArtifact['kind'],
    id: string,
    extra: Partial<LifecycleArtifact> = {},
  ): DeepMutable<LifecycleArtifact> =>
    clone({
      schema: 'LifecycleArtifactReference/v1',
      kind,
      artifact_schema: 'Evidence/v1',
      record_id: `${id}-${work.binding.lifecycle_work_id}`,
      path: `.agent/${id}-${work.binding.lifecycle_work_id}.json`,
      sha256: 'd'.repeat(64),
      source_revision: lifecycle.source_revision,
      scope_id: lifecycle.scope.scope_id,
      ac_ids: ['AC-1'],
      generation: null,
      implementation_fingerprint: null,
      delivery_cycle_id: null,
      principal: null,
      decision: null,
      disposition: 'current',
      ...extra,
    });
  const requiredKinds: readonly LifecycleArtifact['kind'][] = [
    'source_plan',
    'acceptance_manifest',
    'implementation_scope',
    'platform_knowledge',
    'implementation_policy',
    'change_impact_pre',
  ];
  lifecycle.references = [
    ...requiredKinds.map((kind) => reference(kind, kind)),
    reference('execution_approval', 'approval', { decision: 'approved' }),
    reference('documentation_validation', 'docs-pre', { decision: 'pass' }),
    reference('implementation_result', 'implementation', { implementation_fingerprint: fingerprint }),
    reference('documentation_clear', 'docs-closeout', {
      decision: 'pass',
      generation: 1,
      record_id: closeout.clear_id,
      path: closeout.path,
      sha256: closeout.sha256,
      implementation_fingerprint: fingerprint,
    }),
    reference('delivery_manifest', 'manifest', {
      implementation_fingerprint: fingerprint,
      delivery_cycle_id: lifecycle.assurance.delivery_cycle_id,
    }),
  ];
  for (let index = 1; index <= 3; index++) {
    lifecycle.references.push(
      reference('review_receipt', `review-${index}`, {
        generation: 1,
        implementation_fingerprint: fingerprint,
        principal: `reviewer-${index}`,
        decision: 'pass',
      }),
      reference('reverse_validation', `reverse-${index}`, {
        generation: 1,
        implementation_fingerprint: fingerprint,
        principal: `reverse-reviewer-${index}`,
        decision: 'pass',
      }),
    );
  }
  return input;
}
async function clearContextFor(workId: string) {
  const write = async (relative: string, content: string | Uint8Array) => {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  if (!(await Bun.file(path.join(root, 'agent-runtime.config.v1.yaml')).exists())) {
    await mkdir(path.join(root, '.git'));
    await write('AGENTS.md', '# Fixture\n');
    await write('AGENT.sidecar.md', '# Fixture\n');
    const config = (await readFile(path.join(bundleRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8'))
      .replaceAll('{{REPOSITORY}}', 'project-repository')
      .replaceAll('{{PROJECT}}', 'project')
      .replaceAll('{{BUNDLE}}', 'vida-agent');
    await write('agent-runtime.config.v1.yaml', config);
    await write(
      'vida-agent/schemas/documentation-policy.v1.schema.json',
      await readFile(path.join(bundleRoot, 'schemas/documentation-policy.v1.schema.json')),
    );
    await write('vida-agent/TESTING.md', 'fixture testing\n');
    await write('docs/creatio/map.md', 'map\n');
    await write('docs/agent-instructions/index.md', 'index\n');
    await write('docs/agent-instructions/current.md', 'current\n');
    await write(
      'docs/agent-instructions/documentation-policy.v1.json',
      JSON.stringify({
        schema: 'DocumentationPolicy/v1',
        policy_id: 'host-clear',
        project_id: 'project',
        source_path: 'docs/agent-instructions/documentation-policy.v1.json',
        owner: 'project:project',
        required: true,
        canonical_roots: ['docs/agent-instructions'],
        map_paths: ['docs/agent-instructions/index.md'],
        excluded_roots: ['.agent', '.planning'],
        changelog_required: false,
        changelog_path: null,
        relations: ['owns'],
        updated_at: new Date().toISOString(),
      }) + '\n',
    );
  }
  const context = {
    repository_root: root,
    repository_id: 'project-repository',
    project_id: 'project',
    work_id: workId,
  };
  await write(
    `.agent/work/${workId}/scope.json`,
    JSON.stringify({
      schema: 'ImplementationScope/v1',
      work_id: workId,
      source_revision: 'source',
      allowed_paths: ['src/task.ts'],
    }) + '\n',
  );
  const input = { ...context, source_revision: 'source', scope_paths: ['src/task.ts'] };
  await executeDocumentationClearOperation(input, 'baseline');
  const closeout = await executeDocumentationClearOperation(input, 'closeout');
  const record = parseJsonRecord(await readFile(path.join(root, closeout.path), 'utf8'));
  if (typeof record.clear_id !== 'string') throw new Error('documentation CLEAR record has no clear_id');
  return { context, closeout: { ...closeout, clear_id: record.clear_id } };
}
test('ten quiescent same-thread follow-ups release only their prior exact claim without Runtime acceptance', async () => {
  let clear = await clearContextFor('work');
  commitHostState(markFixtureDelivered(fixture(), clear.closeout));
  let currentId = 'work';
  for (let index = 1; index <= 10; index++) {
    const currentIdentity = { ...identity, work_id: currentId };
    const prior = readPresentSnapshot(store, currentIdentity);
    const journal = quiescentJournal(currentId, `run-${currentId}`);
    const request: Parameters<typeof suspendLocalWork>[0] = {
      store,
      identity: currentIdentity,
      journal,
      expectedWork: prior.workVersion,
      expectedLedger: prior.ledgerVersion,
      nativeSessionHandle: 'thread',
      userRequestPointer: `user-request:thread/${index}`,
      requestIntent: 'next_work',
      documentationContext: clear.context,
    };
    const suspended = suspendPresent(request);
    expect(suspended.work.execution.status).toBe('suspended');
    expect(suspended.work.lifecycle.phase).toBe('DELIVERY');
    expect(suspended.work.lease).toBeNull();
    expect(
      requiredValue(
        suspended.ledger.tickets.find((entry) => entry.work_id === currentId),
        'released ticket',
      ).status,
    ).toBe('released');
    expect(suspendLocalWork(request).workVersion).toEqual(suspended.workVersion);
    const nextId = `work-${index}`;
    clear = await clearContextFor(nextId);
    const admission = includeExistingLedger(markFixtureDelivered(fixture(nextId), clear.closeout), suspended.ledger);
    admission.expectedLedger = suspended.ledgerVersion;
    commitHostState(admission);
    currentId = nextId;
  }
  const latest = readPresentSnapshot(store, { ...identity, work_id: currentId });
  expect(latest.ledger.operations.filter((entry) => entry.kind === 'release')).toHaveLength(10);
  expect(latest.ledger.claims.filter((entry) => entry.status === 'active')).toHaveLength(1);
  expect(latest.ledger.tickets.filter((entry) => entry.status === 'active')).toHaveLength(1);
  // Ten real CLEAR baseline/closeout cycles share a finite integration budget under the full suite.
}, 120_000);

test('completed readonly owner release closes an expired exact lease without phase or rights change', async () => {
  const prepared = await writerFixture();
  const seed = prepared.seed;
  const expiry = new Date(Date.now() + 150).toISOString();
  firstTicket(seed.nextLedger).expires_at = expiry;
  firstClaim(seed.nextLedger).lease_expires_at = expiry;
  const initial = commitHostState(seed);
  await Bun.sleep(180);
  const journal = completedCurrentWorkflowJournal(prepared.source);
  const request: Parameters<typeof suspendLocalWork>[0] = {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:completed-readonly',
    requestIntent: 'linked_correction',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: firstOf(identity.project_ids, 'completed readonly project'),
      work_id: identity.work_id,
    },
  };
  expect(() => suspendLocalWork(request)).toThrow('expired');
  const released = presentSnapshot(suspendCompletedReadOnlyWork(request));
  expect(released.work.lease).toBeNull();
  expect(released.work.execution.status).toBe('suspended');
  expect(released.work.execution.phase).toBe(initial.work.execution.phase);
  expect(released.work.lifecycle.phase).toBe(initial.work.lifecycle.phase);
  expect(released.work.binding).toEqual(initial.work.binding);
  expect(released.work.artifacts).toEqual(initial.work.artifacts);
  expect(firstTicket(released.ledger).generation).toBe(firstTicket(initial.ledger).generation);
  expect(firstClaim(released.ledger).generation).toBe(firstClaim(initial.ledger).generation);
  expect(released.ledger.operations).toHaveLength(1);
  expect(firstOf(released.ledger.operations, 'completed readonly release operation').operation_id).toMatch(
    /^completed-readonly-release-/,
  );
  expect(suspendCompletedReadOnlyWork(request).workVersion).toEqual(released.workVersion);
});

test('completed readonly owner release denies missing, reserved, failed and foreign completion', async () => {
  const prepared = await writerFixture();
  const initial = commitHostState(prepared.seed);
  const journal = completedCurrentWorkflowJournal(prepared.source);
  const request: Parameters<typeof suspendLocalWork>[0] = {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:completed-readonly-negative',
    requestIntent: 'linked_correction',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: firstOf(identity.project_ids, 'completed readonly project'),
      work_id: identity.work_id,
    },
  };
  for (const change of [
    { observation: null },
    { observation: { status: 'reported_failed' } },
    { host_reservation: {} },
  ]) {
    const altered = clone(journal);
    Object.assign(firstJournalItem(altered), change);
    expect(() => suspendCompletedReadOnlyWork({ ...request, journal: altered })).toThrow(
      'unobserved, failed or reserved',
    );
    expect(readPresentSnapshot(store, identity).workVersion).toEqual(initial.workVersion);
  }
  expect(() => suspendCompletedReadOnlyWork({ ...request, nativeSessionHandle: 'foreign-thread' })).toThrow(
    'same-thread lease',
  );
  expect(readPresentSnapshot(store, identity).ledgerVersion).toEqual(initial.ledgerVersion);
});

test('completed readonly owner release denies stale CAS and a newer queued conflicting contour', async () => {
  const prepared = await writerFixture();
  firstTicket(prepared.seed.nextLedger).exclusive_resources = ['file:src/task.ts'];
  firstTicket(prepared.seed.nextLedger).active_resources = ['file:src/task.ts'];
  firstClaim(prepared.seed.nextLedger).resources = ['file:src/task.ts'];
  const initial = commitHostState(prepared.seed);
  const journal = clone(completedCurrentWorkflowJournal(prepared.source));
  const request: Parameters<typeof suspendCompletedReadOnlyWork>[0] = {
    store,
    identity: { ...identity },
    journal,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    nativeSessionHandle: 'thread',
    userRequestPointer: 'user:completed-readonly-fifo',
    requestIntent: 'linked_correction',
    documentationContext: {
      repository_root: root,
      repository_id: identity.repository_id,
      project_id: firstOf(identity.project_ids, 'completed readonly project'),
      work_id: identity.work_id,
    },
  };
  expect(() =>
    suspendCompletedReadOnlyWork({ ...request, expectedWork: { ...initial.workVersion, revision: 0 } }),
  ).toThrow('compare-and-swap');
  expect(store.readHostStateSnapshot(identity)).toEqual(initial);
  const queued = fixture('other');
  queued.nextWork.lease = null;
  Object.assign(firstTicket(queued.nextLedger), {
    status: 'queued',
    active_resources: [],
    blocked_resources: ['file:src/task.ts'],
    expires_at: null,
  });
  firstClaim(queued.nextLedger).status = 'recovered';
  queued.expectedLedger = initial.ledgerVersion;
  includeExistingLedger(queued, initial.ledger);
  commitHostState(queued);
  const before = readPresentSnapshot(store, identity);
  expect(() =>
    suspendCompletedReadOnlyWork({
      ...request,
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
    }),
  ).toThrow('same-thread lease');
  expect(store.readHostStateSnapshot(identity)).toEqual(before);
  expect(atIndex(before.ledger.tickets, 1, 'queued successor ticket').sequence).toBeGreaterThan(
    firstTicket(before.ledger).sequence,
  );
});

function resourceFreeFixture(id = 'work', resource = 'file:src/task.ts') {
  const seed = fixture(id, resource);
  const ticket = firstTicket(seed.nextLedger);
  const resources = ['execution:' + id];
  ticket.exclusive_resources = resources;
  ticket.active_resources = resources;
  firstClaim(seed.nextLedger).resources = resources;
  seed.nextWork.binding.allowed_resources.push(...resources);
  return seed;
}
let sourceLeaseConfig: ReturnType<typeof loadRuntimeConfig>;
async function writerFixture(
  id = 'work',
  resource = 'file:src/task.ts',
  config: typeof sourceLeaseConfig = sourceLeaseConfig,
) {
  await mkdir(path.join(root, 'src'), { recursive: true });
  await writeFile(path.join(root, resource.slice(5)), 'original source');
  const seed = resourceFreeFixture(id, resource);
  const source = snapshotDeclaredSources(requireSafeRepositoryAccess(root), [resource.slice(5)]);
  seed.nextWork.binding.work_source_revision = source.digest;
  seed.nextWork.binding.workflow_id = 'bug_fix';
  seed.nextWork.binding.config_digest = runtimeConfigDigest(config);
  seed.nextWork.lifecycle.source_revision = source.digest;
  seed.nextWork.lifecycle.config_binding.config_digest = seed.nextWork.binding.config_digest;
  firstTicket(seed.nextLedger).source_revision = source.digest;
  return { seed, source };
}
function writerAcquire(host: PresentHostSnapshot) {
  return presentSnapshot(
    acquireLocalSourceWriterLease({
      repositoryRoot: root,
      config: sourceLeaseConfig,
      store,
      identity: {
        ...identity,
        work_id: requiredValue(host.work.binding.lifecycle_work_id, 'writer lifecycle work id'),
      },
      nativeSessionHandle: 'thread',
      stageId: 'develop_fix',
      assignmentIndex: 0,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
    }),
  );
}
test('lazy ownership: execution-only intake admits and configured writer acquires exact claims', async () => {
  const { seed } = await writerFixture();
  const initial = commitHostState(seed);
  expect(firstClaim(initial.ledger).resources).toEqual(['execution:work']);
  expect(Date.parse(requiredValue(firstTicket(initial.ledger).expires_at, 'initial ticket expiry'))).toBeGreaterThan(
    Date.now(),
  );
  const active = writerAcquire(initial);
  expect(requiredLease(active.work).ticket_id).not.toBe(requiredLease(initial.work).ticket_id);
  expect(firstTicket(active.ledger).status).toBe('released');
  expect(firstTicket(active.ledger).exclusive_resources).toEqual(['execution:work']);
  expect(
    requiredValue(
      active.ledger.claims.find((claim) => claim.status === 'active'),
      'active contour claim',
    ).resources,
  ).toEqual(['execution:work', 'file:src/task.ts']);
  expect(writerAcquire(active).workVersion).toEqual(active.workVersion);
});
test('lazy ownership: source drift and readonly assignment cannot acquire a writer claim', async () => {
  const { seed } = await writerFixture();
  const initial = commitHostState(seed);
  expect(() =>
    acquireLocalSourceWriterLease({
      repositoryRoot: root,
      config: sourceLeaseConfig,
      store,
      identity,
      nativeSessionHandle: 'thread',
      stageId: 'research_bug',
      assignmentIndex: 0,
      expectedWork: initial.workVersion,
      expectedLedger: initial.ledgerVersion,
    }),
  ).toThrow('not a source writer');
  await writeFile(path.join(root, 'src/task.ts'), 'changed');
  expect(() => writerAcquire(initial)).toThrow('declared source changed');
  expect(readPresentSnapshot(store, identity).workVersion).toEqual(initial.workVersion);
});
test('lazy ownership: same-file writers queue FIFO while disjoint project writer proceeds', async () => {
  const first = writerAcquire(commitHostState((await writerFixture()).seed));
  const secondSeed = (await writerFixture('second')).seed;
  includeExistingLedger(secondSeed, first.ledger);
  secondSeed.expectedLedger = first.ledgerVersion;
  const second = commitHostState(secondSeed);
  expect(() => writerAcquire(second)).toThrow('queued');
  const queued = readPresentSnapshot(store, { ...identity, work_id: 'second' });
  expect(
    requiredValue(
      queued.ledger.tickets.find((ticket) => ticket.work_id === 'second' && ticket.status === 'queued'),
      'queued second ticket',
    ).blocked_resources,
  ).toEqual(['execution:second', 'file:src/task.ts']);
  expect(requiredLease(queued.work).ticket_id).toBe(requiredLease(second.work).ticket_id);
  const disjointSeed = (await writerFixture('disjoint', 'file:src/disjoint.ts')).seed;
  includeExistingLedger(disjointSeed, queued.ledger);
  disjointSeed.expectedLedger = queued.ledgerVersion;
  const disjoint = writerAcquire(commitHostState(disjointSeed));
  expect(
    requiredValue(
      disjoint.ledger.claims.find((claim) => claim.work_id === 'disjoint' && claim.status === 'active'),
      'disjoint active claim',
    ).resources,
  ).toEqual(['execution:disjoint', 'file:src/disjoint.ts']);
});
test('contour resources: disjoint same-project handoff freezes independently', () => {
  const first = commitHostState(fixture());
  const secondSeed = includeExistingLedger(fixture('other', 'file:src/other.ts'), first.ledger);
  secondSeed.expectedLedger = first.ledgerVersion;
  commitHostState(secondSeed);
  const ready = next(readPresentSnapshot(store, identity));
  ready.nextWork.lease = null;
  firstTicket(ready.nextLedger).status = 'ready_for_handoff';
  const saved = commitHostState(ready);
  const freeze = next(saved);
  freeze.nextLedger.contours.push(frozenContour(freeze.nextLedger));
  freeze.nextLedger.open_generation++;
  const frozen = commitHostState(freeze);
  expect(atIndex(frozen.ledger.contours, 0, 'frozen contour').work_ids).toEqual(['work']);
  expect(atIndex(frozen.ledger.tickets, 1, 'active frozen contour ticket').status).toBe('active');
});
test('contour resources: explicit shared resource and three queued file aliases preserve FIFO component', () => {
  const first = commitHostState(fixture());
  let current = first;
  for (const id of ['second', 'third']) {
    const seed = fixture(id, 'file:src/task.ts');
    seed.nextWork.lease = null;
    const ticket = firstTicket(seed.nextLedger);
    ticket.status = 'queued';
    ticket.active_resources = [];
    ticket.blocked_resources = ['file:src/task.ts'];
    ticket.claim_ids = [];
    ticket.expires_at = null;
    seed.nextLedger.claims = [];
    includeExistingLedger(seed, current.ledger);
    seed.expectedLedger = current.ledgerVersion;
    current = commitHostState(seed);
  }
  const ready = next(readPresentSnapshot(store, identity));
  ready.nextWork.lease = null;
  firstTicket(ready.nextLedger).status = 'ready_for_handoff';
  const saved = commitHostState(ready);
  const freeze = next(saved);
  freeze.nextLedger.contours.push(frozenContour(freeze.nextLedger));
  freeze.nextLedger.open_generation++;
  expect(() => commitHostState(freeze)).toThrow('frozen prior-generation contour');
});

async function unknownReadonlyFixture(
  resourceFree = false,
  config: typeof sourceLeaseConfig = sourceLeaseConfig,
): Promise<{
  readonly initial: PresentHostSnapshot;
  readonly journal: TestJournal;
  readonly request: Parameters<typeof suspendLocalWork>[0];
}> {
  const prepared = await writerFixture('work', 'file:src/task.ts', config);
  const seed = resourceFree ? prepared.seed : fixture();
  if (!resourceFree) {
    seed.nextWork.binding = prepared.seed.nextWork.binding;
    seed.nextWork.lifecycle = prepared.seed.nextWork.lifecycle;
    firstTicket(seed.nextLedger).source_revision = prepared.source.digest;
  }
  const initial = commitHostState(seed);
  const journal = ownerRecoveryPreviewJournal();
  journal.resume_status = 'issued_outcome_uncertain';
  journal.state.source_scope = {
    schema: prepared.source.schema,
    entries: prepared.source.entries.map((entry) => ({ ...entry })),
    digest: prepared.source.digest,
  };
  firstJournalItem(journal).issue_id = 'old-issued-unknown';
  firstJournalItem(journal).request.config_digest = initial.work.binding.config_digest;
  firstJournalItem(journal).request.scope_digest = prepared.source.digest;
  journal.version = { revision: 1, digest: canonicalJsonDigest(journal.state) };
  persistJournalFixture(journal);
  return { initial, journal, request: { ...ownerRecoveryPreviewRequest(initial, journal), config } };
}

test.each(['reported_complete', 'reported_failed'])(
  'journal-backed suspension refuses concurrently changed %s evidence before releasing ownership',
  async (status) => {
    const { initial, journal, request } = await unknownReadonlyFixture();
    journal.resume_status = 'complete';
    setFixtureField(firstJournalItem(journal), 'observation', { status });
    journal.version = { revision: 2, digest: canonicalJsonDigest(journal.state) };
    database
      .query<never, [number, string, string]>(
        'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?',
      )
      .run(2, canonicalJson(journal.state), journal.version.digest);
    const stale = clone(journal);
    const observed = firstJournalItem(journal).observation;
    if (!observed) throw new Error('terminal observation fixture is missing');
    observed.summary = 'Concurrent terminal evidence';
    database
      .query<never, [number, string, string]>(
        'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?',
      )
      .run(3, canonicalJson(journal.state), canonicalJsonDigest(journal.state));
    const beforeRow = database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').get();
    const suspendRequest = { ...request, journal: stale };
    Reflect.deleteProperty(suspendRequest, 'config');
    if (status === 'reported_complete')
      expect(() => suspendCompletedReadOnlyWork(suspendRequest)).toThrow('session journal CAS changed');
    else expect(() => suspendLocalWork(suspendRequest)).toThrow('session journal CAS changed');
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    expect(database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').get()).toEqual(
      beforeRow,
    );
  },
);
test('issued readonly release: expired exact owner retires claims and preserves unknown journal bytes', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture();
  const row = database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').get();
  ownerRecoveryPreviewExpired(() => {
    const released = suspendPresent(request);
    expect(released.work.lease).toBeNull();
    expect(released.work.execution.status).toBe('suspended');
    expect(released.work.lifecycle.phase).toBe(initial.work.lifecycle.phase);
    expect(released.work.binding).toEqual(initial.work.binding);
    expect(firstTicket(released.ledger).status).toBe('released');
    expect(firstClaim(released.ledger).status).toBe('released');
    expect(firstJournalItem(journal).issue_id).toBe('old-issued-unknown');
    expect(firstJournalItem(journal).observation).toBeNull();
    expect(database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').get()).toEqual(
      row,
    );
    expect(suspendLocalWork(request).workVersion).toEqual(released.workVersion);
  });
});
test('issued readonly release: execution-only owner releases without file ownership', async () => {
  const { request } = await unknownReadonlyFixture(true);
  const released = suspendPresent(request);
  expect(released.ledger.claims.every((claim) => claim.status === 'released')).toBe(true);
  expect(released.work.lease).toBeNull();
  expect(firstOf(released.ledger.operations, 'release operation').resources).toEqual(['execution:work']);
});
test('issued readonly release: stale journal CAS, reservation, second unknown and foreign thread deny without writes', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture();
  type OwnerRecoveryRequest = Parameters<typeof suspendLocalWork>[0] & { journal: TestJournal };
  const modifications: readonly ((value: OwnerRecoveryRequest) => void)[] = [
    (value: OwnerRecoveryRequest) => {
      setFixtureField(value.journal.version, 'digest', 'f'.repeat(64));
    },
    (value: OwnerRecoveryRequest) => {
      setFixtureField(firstJournalItem(value.journal), 'host_reservation', {});
    },
    (value: OwnerRecoveryRequest) => {
      value.journal.state.items.push(clone(firstJournalItem(value.journal)));
    },
    (value: OwnerRecoveryRequest) => {
      setFixtureField(value, 'nativeSessionHandle', 'foreign');
    },
    (value: OwnerRecoveryRequest) => {
      setFixtureField(firstJournalItem(value.journal), 'research_normalization', {});
    },
  ];
  for (const modify of modifications) {
    const candidate = { ...request, journal: clone(journal) };
    modify(candidate);
    ownerRecoveryPreviewExpired(() => expect(() => suspendLocalWork(candidate)).toThrow());
    expect(readPresentSnapshot(store, identity).workVersion).toEqual(initial.workVersion);
  }
});
test('issued readonly release: configured source-writing or egress rights remain blocked', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture();
  const writingJournal = clone(journal);
  firstJournalItem(writingJournal).request.stage_id = 'develop_fix';
  firstJournalItem(writingJournal).request.role = 'developer';
  writingJournal.version.digest = canonicalJsonDigest(writingJournal.state);
  ownerRecoveryPreviewExpired(() =>
    expect(() => suspendLocalWork({ ...request, journal: writingJournal })).toThrow('uncertain'),
  );
  const wrongConfig = cloneRuntimeConfig(sourceLeaseConfig);
  const mapperProfile = wrongConfig.agents.profiles['codebase-mapper'];
  if (!mapperProfile) throw new Error('canonical codebase-mapper profile is missing');
  Reflect.set(mapperProfile, 'egress_policy', 'official_docs');
  ownerRecoveryPreviewExpired(() =>
    expect(() => suspendLocalWork({ ...request, config: wrongConfig })).toThrow('uncertain'),
  );
  expect(readPresentSnapshot(store, identity).workVersion).toEqual(initial.workVersion);
});
test('issued readonly release: source drift does not block relinquishment or accept stale evidence', async () => {
  const { initial, request } = await unknownReadonlyFixture();
  await writeFile(path.join(root, 'src/task.ts'), 'changed accepted source');
  const released = suspendPresent(request);
  expect(released.work.lease).toBeNull();
  expect(released.work.binding).toEqual(initial.work.binding);
  expect(firstJournalItem(request.journal).observation).toBeNull();
  const sourceScope = request.journal.state.source_scope;
  if (!sourceScope) throw new Error('owner recovery source scope fixture is missing');
  expect(sourceScope.digest).toBe(initial.work.binding.work_source_revision);
});

test('issued readonly release: later queued waiter survives owner relinquishment', async () => {
  const { initial, request } = await unknownReadonlyFixture();
  const seed = fixture('later');
  seed.nextWork.lease = null;
  const ticket = firstTicket(seed.nextLedger);
  ticket.status = 'queued';
  ticket.active_resources = [];
  ticket.blocked_resources = ['file:src/task.ts'];
  ticket.claim_ids = [];
  ticket.expires_at = null;
  seed.nextLedger.claims = [];
  includeExistingLedger(seed, initial.ledger);
  seed.expectedLedger = initial.ledgerVersion;
  const queued = commitHostState(seed);
  const before = readPresentSnapshot(store, identity);
  const released = suspendPresent({
    ...request,
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
  });
  expect(released.ledger.tickets.find((item) => item.work_id === 'later')).toEqual(
    queued.ledger.tickets.find((item) => item.work_id === 'later'),
  );
  expect(released.work.lease).toBeNull();
});
test('contour resources: explicitly claimed shared nonfile resource keeps joined handoff', () => {
  const firstSeed = fixture();
  firstSeed.nextWork.binding.allowed_resources.push('service:exclusive-report');
  firstTicket(firstSeed.nextLedger).exclusive_resources.push('service:exclusive-report');
  firstTicket(firstSeed.nextLedger).active_resources.push('service:exclusive-report');
  firstTicket(firstSeed.nextLedger).contour_keys.push('service:exclusive-report');
  firstClaim(firstSeed.nextLedger).resources.push('service:exclusive-report');
  const first = commitHostState(firstSeed);
  const seed = fixture('later', 'file:src/later.ts');
  seed.nextWork.lease = null;
  seed.nextWork.binding.allowed_resources.push('service:exclusive-report');
  const ticket = firstTicket(seed.nextLedger);
  ticket.status = 'queued';
  ticket.exclusive_resources.push('service:exclusive-report');
  ticket.active_resources = [];
  ticket.blocked_resources = [...ticket.exclusive_resources];
  ticket.contour_keys.push('service:exclusive-report');
  ticket.claim_ids = [];
  ticket.expires_at = null;
  seed.nextLedger.claims = [];
  includeExistingLedger(seed, first.ledger);
  seed.expectedLedger = first.ledgerVersion;
  commitHostState(seed);
  const ready = next(readPresentSnapshot(store, identity));
  ready.nextWork.lease = null;
  firstTicket(ready.nextLedger).status = 'ready_for_handoff';
  const saved = commitHostState(ready);
  const freeze = next(saved);
  freeze.nextLedger.contours.push(frozenContour(freeze.nextLedger));
  freeze.nextLedger.open_generation++;
  expect(() => commitHostState(freeze)).toThrow('frozen prior-generation contour');
});

test('lazy ownership: queued writer activates after owner release without changing FIFO history', async () => {
  const first = writerAcquire(commitHostState((await writerFixture()).seed));
  const seed = (await writerFixture('second')).seed;
  includeExistingLedger(seed, first.ledger);
  seed.expectedLedger = first.ledgerVersion;
  const second = commitHostState(seed);
  expect(() => writerAcquire(second)).toThrow('queued');
  const queued = readPresentSnapshot(store, { ...identity, work_id: 'second' });
  const queuedTicket = requiredValue(
    queued.ledger.tickets.find((ticket) => ticket.work_id === 'second' && ticket.status === 'queued'),
    'queued second writer ticket',
  );
  const firstCurrent = readPresentSnapshot(store, identity);
  suspendLocalWork(ownerRecoveryPreviewRequest(firstCurrent, quiescentJournal()));
  const current = readPresentSnapshot(store, { ...identity, work_id: 'second' });
  const active = writerAcquire(current);
  const activated = requiredValue(
    active.ledger.tickets.find((ticket) => ticket.ticket_id === queuedTicket.ticket_id),
    'activated writer ticket',
  );
  expect(activated.sequence).toBe(queuedTicket.sequence);
  expect(activated.status).toBe('active');
  expect(activated.exclusive_resources).toEqual(queuedTicket.exclusive_resources);
});
test('lazy ownership: suspending queued B releases its writer intent so C acquires after A releases', async () => {
  const first = writerAcquire(commitHostState((await writerFixture()).seed));
  const seed = (await writerFixture('second')).seed;
  includeExistingLedger(seed, first.ledger);
  seed.expectedLedger = first.ledgerVersion;
  const second = commitHostState(seed);
  expect(() => writerAcquire(second)).toThrow(/queued/);
  const queued = readPresentSnapshot(store, { ...identity, work_id: 'second' });
  const intent = requiredValue(
    queued.ledger.tickets.find((ticket) => ticket.work_id === 'second' && ticket.status === 'queued'),
    'queued writer intent',
  );
  const request = ownerRecoveryPreviewRequest(queued, quiescentJournal('second', 'run-second'));
  setFixtureField(request.identity, 'work_id', 'second');
  setFixtureField(request.documentationContext, 'work_id', 'second');
  const released = suspendPresent(request);
  expect(
    requiredValue(
      released.ledger.tickets.find((ticket) => ticket.ticket_id === intent.ticket_id),
      'released writer intent',
    ).status,
  ).toBe('released');
  expect(
    released.ledger.operations.some(
      (operation) => operation.ticket_id === intent.ticket_id && operation.kind === 'release',
    ),
  ).toBe(true);
  expect(released.ledger.tickets.find((ticket) => ticket.work_id === 'work' && ticket.status === 'active')).toEqual(
    queued.ledger.tickets.find((ticket) => ticket.work_id === 'work' && ticket.status === 'active'),
  );
  const thirdSeed = (await writerFixture('third')).seed;
  includeExistingLedger(thirdSeed, released.ledger);
  thirdSeed.expectedLedger = released.ledgerVersion;
  const third = commitHostState(thirdSeed);
  expect(() => writerAcquire(third)).toThrow(/queued/);
  suspendLocalWork(ownerRecoveryPreviewRequest(readPresentSnapshot(store, identity), quiescentJournal()));
  const current = readPresentSnapshot(store, { ...identity, work_id: 'third' });
  const active = writerAcquire(current);
  expect(
    active.ledger.tickets.filter((ticket) => ticket.work_id === 'third' && ticket.status === 'active'),
  ).toHaveLength(1);
  expect(active.ledger.tickets.find((ticket) => ticket.ticket_id === intent.ticket_id)).toEqual(
    released.ledger.tickets.find((ticket) => ticket.ticket_id === intent.ticket_id),
  );
});

test('lazy ownership: paused execution-only work resumes with execution rights and no file rights', async () => {
  const { initial, journal, request } = await unknownReadonlyFixture(true);
  const suspended = suspendPresent(request);
  const fakeLedger = { resume: () => journal };
  const resumed: unknown = await Reflect.apply(resumePausedLocalWork, undefined, [
    {
      store,
      ledger: fakeLedger,
      identity,
      attempt: 1,
      expectedWork: suspended.workVersion,
      expectedLedger: suspended.ledgerVersion,
      expectedJournal: journal.version,
      nativeSessionHandle: 'thread',
      configDigest: initial.work.binding.config_digest,
      sourceDigest: initial.work.binding.work_source_revision,
    },
  ]);
  const host = readPresentSnapshot(store, identity);
  if (!isPlainRecord(resumed)) throw new Error('paused resume result fixture is malformed');
  expect(resumed.status).toBe('resumed');
  expect(
    firstOf(
      host.ledger.claims.filter((claim) => claim.status === 'active'),
      'active claim',
    ).resources,
  ).toEqual(['execution:work']);
  expect(
    Date.parse(
      requiredValue(
        host.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(host.work).ticket_id),
        'resumed ticket',
      ).expires_at ?? '',
    ),
  ).toBeGreaterThan(Date.now());
  expect(firstJournalItem(journal).observation).toBeNull();
});

test('issued readonly release: completed official-docs predecessor does not block pending no-egress owner', async () => {
  const config = cloneRuntimeConfig(sourceLeaseConfig);
  const webProfile = config.agents.profiles['web-researcher'];
  if (!webProfile) throw new Error('canonical web-researcher profile is missing');
  Reflect.set(config.agents.profiles, 'web', structuredClone(webProfile));
  const docsStage = structuredClone(
    firstOf(requiredRuntimeWorkflow(config, 'information_research_light').stages, 'research stage'),
  );
  Reflect.set(docsStage, 'id', 'research_docs');
  Reflect.apply(Array.prototype.push, requiredRuntimeWorkflow(config, 'bug_fix').stages, [docsStage]);
  const { initial, journal, request } = await unknownReadonlyFixture(false, config);
  const prior = clone(firstJournalItem(journal));
  prior.issue_id = 'actual-completed-docs-issue';
  prior.request.action_id = 'completed-docs-action';
  prior.request.stage_id = 'research_docs';
  prior.request.role = 'documentation-researcher';
  prior.observation = {
    schema: 'VidaSessionObservation/v1',
    action_id: prior.request.action_id,
    issue_id: prior.issue_id,
    agent_id: 'fixture-docs-researcher',
    tool_call_ref: 'fixture-docs-completion',
    status: 'reported_complete',
    summary: 'Observed docs research completion.',
    output_digest: 'a'.repeat(64),
    evidence_refs: ['fixture:completed-docs'],
  };
  journal.state.completed.push({ step_id: 'completed-docs', items: [prior] });
  journal.version = { revision: 2, digest: canonicalJsonDigest(journal.state) };
  database
    .query<never, [number, string, string]>('UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=?')
    .run(2, canonicalJson(journal.state), journal.version.digest);
  const beforeRow = database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').get();
  const failed = clone(journal);
  const completedStep = atIndex(failed.state.completed, 0, 'completed docs step');
  const completedItem = atIndex(completedStep.items, 0, 'completed docs item');
  if (!isPlainRecord(completedItem.observation)) throw new Error('completed docs observation fixture is missing');
  setFixtureField(completedItem.observation, 'status', 'reported_failed');
  setFixtureField(failed.version, 'digest', canonicalJsonDigest(failed.state));
  expect(() => suspendLocalWork({ ...request, journal: failed })).toThrow('uncertain');
  expect(readPresentSnapshot(store, identity).workVersion).toEqual(initial.workVersion);
  ownerRecoveryPreviewExpired(() => {
    const released = suspendPresent({ ...request, journal });
    expect(released.work.lease).toBeNull();
    expect(firstJournalItem(journal).observation).toBeNull();
    expect(atIndex(atIndex(journal.state.completed, 0, 'completed docs step').items, 0, 'completed docs item')).toEqual(
      prior,
    );
    expect(database.query<SessionLedgerSqlRow, []>('SELECT * FROM agent_host_mastra_session_ledger').get()).toEqual(
      beforeRow,
    );
  });
});

test('expired recovery keeps runtime identity coupled across verified bundle changes without replaying research', async () => {
  preserveHostFixtureRoot = 'case failed or timed out';
  const deadline = performance.now() + 5_000;
  const prepared = await writerFixture();
  const seed = prepared.seed;
  const digestA = 'a'.repeat(64),
    digestB = 'b'.repeat(64);
  seed.nextWork.binding.runtime_source_revision = digestA;
  seed.nextWork.binding.runtime_code_digest = digestA;
  seed.nextWork.lifecycle.config_binding.runtime_code_digest = digestA;
  const peer = writerAcquire(commitHostState((await writerFixture('recovery-peer')).seed));
  const waiterSeed = (await writerFixture('recovery-waiter')).seed;
  includeExistingLedger(waiterSeed, peer.ledger);
  waiterSeed.expectedLedger = peer.ledgerVersion;
  const admittedWaiter = commitHostState(waiterSeed);
  expect(() => writerAcquire(admittedWaiter)).toThrow('queued');
  const waiter = readPresentSnapshot(store, { ...identity, work_id: 'recovery-waiter' });
  includeExistingLedger(seed, waiter.ledger);
  seed.expectedLedger = waiter.ledgerVersion;
  const initial = commitHostState(seed);
  const journal = completedRecoveryJournal(
    identity.work_id,
    requiredValue(initial.work.execution.run_id, 'recovery run id'),
    prepared.source,
  );
  const ownerTicket = requiredValue(
    initial.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(initial.work).ticket_id),
    'recovery owner ticket',
  );
  const peerTicket = requiredValue(
    initial.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(peer.work).ticket_id),
    'peer writer ticket',
  );
  const peerClaim = requiredValue(
    initial.ledger.claims.find((claim) => claim.ticket_id === peerTicket.ticket_id && claim.status === 'active'),
    'peer writer claim',
  );
  const waiterTicket = requiredValue(
    initial.ledger.tickets.find((ticket) => ticket.work_id === 'recovery-waiter' && ticket.status === 'queued'),
    'persisted FIFO waiter',
  );
  expect(peerTicket).toMatchObject({
    status: 'active',
    active_resources: ['execution:recovery-peer', 'file:src/task.ts'],
  });
  expect(peerClaim.resources).toEqual(['execution:recovery-peer', 'file:src/task.ts']);
  expect(waiterTicket).toMatchObject({
    status: 'queued',
    exclusive_resources: ['execution:recovery-waiter', 'file:src/task.ts'],
    active_resources: [],
    blocked_resources: ['execution:recovery-waiter', 'file:src/task.ts'],
  });
  expect(ownerTicket.exclusive_resources).toEqual(['execution:work']);
  expect(ownerTicket.active_resources).toEqual(['execution:work']);
  expect(peerClaim.resources).not.toContain('execution:work');
  expect(waiterTicket.exclusive_resources).not.toContain('execution:work');
  const journalBytes = canonicalJson(journal.state);
  const journalDigest = journal.version.digest;
  const rows = readFixtureHostRows(database);
  const request = {
    identity,
    attempt: 1,
    nativeSessionHandle: 'thread',
    generation: 1,
    expectedWork: initial.workVersion,
    expectedLedger: initial.ledgerVersion,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: initial.maintenanceGeneration,
    verifyCurrent: () => ({ runtimeCodeDigest: digestB, authorityPointer: 'user:verified-current-bundle' }),
  } satisfies Parameters<typeof store.recoverExpiredLocalLease>[0];
  const unchanged = () => {
    expect(readFixtureHostRows(database)).toEqual(rows);
  };
  expect(() => store.recoverExpiredLocalLease(request)).toThrow(
    'expired lease recovery owner, fencing identity or live expiry differs',
  );
  unchanged();
  const now = Date.now;
  let recovered!: PresentHostSnapshot;
  try {
    Date.now = () => Date.parse(requiredValue(ownerTicket.expires_at, 'recovery ticket expiry')) + 1;
    for (const key of ['expectedWork', 'expectedLedger', 'expectedJournal'] as const) {
      expect(() =>
        store.recoverExpiredLocalLease({
          ...request,
          [key]: { ...request[key], revision: request[key].revision + 1 },
        }),
      ).toThrow(
        key === 'expectedJournal' ? 'expired lease recovery journal CAS changed' : 'state compare-and-swap conflict',
      );
      unchanged();
    }
    expect(() => store.recoverExpiredLocalLease({ ...request, nativeSessionHandle: 'foreign-thread' })).toThrow(
      'expired lease recovery owner, fencing identity or live expiry differs',
    );
    unchanged();
    expect(() => store.recoverExpiredLocalLease({ ...request, generation: 2 })).toThrow(
      'expired lease recovery owner, fencing identity or live expiry differs',
    );
    unchanged();
    expect(() =>
      store.recoverExpiredLocalLease({ ...request, expectedMaintenanceGeneration: initial.maintenanceGeneration + 1 }),
    ).toThrow('maintenance generation is stale or missing');
    unchanged();
    const proofError = new Error('controlled expired recovery proof');
    let observed: unknown;
    try {
      store.recoverExpiredLocalLease({
        ...request,
        verifyCurrent: () => {
          throw proofError;
        },
      });
    } catch (error) {
      observed = error;
    }
    expect(observed).toBe(proofError);
    unchanged();
    for (const authorityPointer of ['', 'bad\u0000authority', 'x'.repeat(513)]) {
      expect(() =>
        store.recoverExpiredLocalLease({
          ...request,
          verifyCurrent: () => ({ runtimeCodeDigest: digestB, authorityPointer }),
        }),
      ).toThrow('expired recovery authority reference invalid');
      unchanged();
    }
    expect(() =>
      store.recoverExpiredLocalLease({
        ...request,
        verifyCurrent: () => ({ runtimeCodeDigest: 'invalid', authorityPointer: 'user:verified-current-bundle' }),
      }),
    ).toThrow('expired recovery current bundle binding invalid');
    unchanged();
    expect(() => {
      Reflect.apply(store.recoverExpiredLocalLease.bind(store), undefined, [
        {
          ...request,
          verifyCurrent: () =>
            Promise.resolve({ runtimeCodeDigest: digestB, authorityPointer: 'user:verified-current-bundle' }),
        },
      ]);
    }).toThrow('expired recovery current proof must finish synchronously');
    unchanged();
    expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    database.exec(
      "CREATE TRIGGER reject_expired_recovery_journal BEFORE UPDATE ON agent_host_mastra_session_ledger BEGIN SELECT RAISE(ABORT,'controlled expired recovery Journal write'); END",
    );
    let primaryFailure: { error: unknown } | undefined;
    try {
      expect(() => store.recoverExpiredLocalLease(request)).toThrow('controlled expired recovery Journal write');
      unchanged();
      expect(store.readHostStateSnapshot(identity)).toEqual(initial);
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            database.exec('DROP TRIGGER reject_expired_recovery_journal');
          },
        ],
        primaryFailure,
      );
    }
    recovered = presentSnapshot(store.recoverExpiredLocalLease(request));
    expect(recovered.workVersion).toEqual({
      revision: initial.workVersion.revision + 1,
      digest: canonicalJsonDigest(recovered.work),
    });
    expect(recovered.ledgerVersion).toEqual({
      revision: initial.ledgerVersion.revision + 1,
      digest: canonicalJsonDigest(recovered.ledger),
    });
    expect(recovered.maintenanceGeneration).toBe(initial.maintenanceGeneration);
    expect(recovered.ledger.open_generation).toBe(initial.ledger.open_generation);
    expect(recovered.work.execution).toEqual(initial.work.execution);
    expect(recovered.work.contracts).toEqual(initial.work.contracts);
    expect(recovered.work.binding).toEqual({
      ...initial.work.binding,
      runtime_source_revision: digestB,
      runtime_code_digest: digestB,
    });
    expect(recovered.work.lifecycle).toEqual({
      ...initial.work.lifecycle,
      revision: initial.work.lifecycle.revision + 1,
      config_binding: { ...initial.work.lifecycle.config_binding, runtime_code_digest: digestB },
    });
    expect(requiredLease(recovered.work).ticket_id).not.toBe(requiredLease(initial.work).ticket_id);
    const retired = requiredValue(
      recovered.ledger.tickets.find((ticket) => ticket.ticket_id === ownerTicket.ticket_id),
      'retired owner ticket',
    );
    expect(retired).toEqual({
      ...ownerTicket,
      status: 'read_only',
      active_resources: [],
      blocked_resources: [],
      expires_at: null,
    });
    const oldClaim = requiredValue(
      initial.ledger.claims.find((claim) => claim.ticket_id === ownerTicket.ticket_id),
      'previous owner claim',
    );
    expect(recovered.ledger.claims.find((claim) => claim.claim_id === oldClaim.claim_id)).toEqual({
      ...oldClaim,
      status: 'recovered',
    });
    const successor = requiredValue(
      recovered.ledger.tickets.find((ticket) => ticket.ticket_id === requiredLease(recovered.work).ticket_id),
      'recovered owner ticket',
    );
    const claim = requiredValue(
      recovered.ledger.claims.find((value) => value.ticket_id === successor.ticket_id && value.status === 'active'),
      'recovered owner claim',
    );
    expect(successor.active_resources).toEqual(ownerTicket.active_resources);
    expect(successor.exclusive_resources).toEqual(ownerTicket.exclusive_resources);
    expect(claim.resources).toEqual(oldClaim.resources);
    expect(successor.claim_ids).toEqual([claim.claim_id]);
    expect(claim.lease_expires_at).toBe(requiredValue(successor.expires_at, 'successor expiry'));
    expect(Date.parse(requiredValue(successor.expires_at, 'successor expiry'))).toBeGreaterThan(Date.now());
    for (const workId of ['recovery-peer', 'recovery-waiter']) {
      expect(recovered.ledger.tickets.filter((ticket) => ticket.work_id === workId)).toEqual(
        initial.ledger.tickets.filter((ticket) => ticket.work_id === workId),
      );
      expect(recovered.ledger.claims.filter((claim) => claim.work_id === workId)).toEqual(
        initial.ledger.claims.filter((claim) => claim.work_id === workId),
      );
    }
    expect(recovered.ledger.rebinds.at(-1)).toMatchObject({
      previous_ticket_id: ownerTicket.ticket_id,
      ticket_id: successor.ticket_id,
      retired_claim_ids: [oldClaim.claim_id],
      decision_pointer: 'user:verified-current-bundle',
      resources: oldClaim.resources,
      claimed_resources: oldClaim.resources,
      from_ledger_revision: initial.ledger.revision,
      to_ledger_revision: recovered.ledger.revision,
    });
    const stored = requiredValue(
      database
        .query<RevisionPayloadDigestSqlRow, []>('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger')
        .get(),
      'recovered session ledger row',
    );
    expect(stored.payload).toBe(journalBytes);
    expect(stored.digest).toBe(journalDigest);
    expect(stored.revision).toBe(journal.version.revision + 1);
    const recoveredRows = readFixtureHostRows(database);
    expect(() => store.recoverExpiredLocalLease(request)).toThrow('state compare-and-swap conflict');
    expect(() =>
      store.recoverExpiredLocalLease({
        ...request,
        expectedWork: recovered.workVersion,
        expectedLedger: recovered.ledgerVersion,
        expectedJournal: { revision: stored.revision, digest: stored.digest },
      }),
    ).toThrow('expired lease recovery owner, fencing identity or live expiry differs');
    expect(readFixtureHostRows(database)).toEqual(recoveredRows);
    const started = store.claimWorkflowAttempt(attemptRequest(recovered));
    const inflight = readPresentSnapshot(store, identity);
    const inflightRows = readFixtureHostRows(database);
    const recoveryClock = Date.now();
    const successorExpiry = Date.parse(requiredValue(successor.expires_at, 'successor expiry')) + 1;
    const currentProof = mock(request.verifyCurrent);
    Date.now = () => successorExpiry;
    expect(() =>
      store.recoverExpiredLocalLease({
        ...request,
        generation: requiredLease(inflight.work).generation,
        expectedWork: inflight.workVersion,
        expectedLedger: inflight.ledgerVersion,
        expectedJournal: { revision: stored.revision, digest: stored.digest },
        verifyCurrent: currentProof,
      }),
    ).toThrow('issued writer outcome must settle before expired lease recovery');
    expect(currentProof).not.toHaveBeenCalled();
    expect(readFixtureHostRows(database)).toEqual(inflightRows);
    Date.now = () => recoveryClock;
    store.completeWorkflowAttempt(started, { summary: 'Completed Host result without accepted Journal observation.' });
    const completed = readPresentSnapshot(store, identity);
    expect(completed.work.execution.assignment_attempts.at(-1)).toMatchObject({
      attempt_id: started.attempt.attempt_id,
      status: 'completed',
      result: { summary: 'Completed Host result without accepted Journal observation.' },
    });
    const completedRows = readFixtureHostRows(database);
    expect(store.readWorkSessionJournal(identity)?.state).toEqual(journal.state);
    Date.now = () => successorExpiry;
    expect(() =>
      store.recoverExpiredLocalLease({
        ...request,
        generation: requiredLease(completed.work).generation,
        expectedWork: completed.workVersion,
        expectedLedger: completed.ledgerVersion,
        expectedJournal: { revision: stored.revision, digest: stored.digest },
        verifyCurrent: currentProof,
      }),
    ).toThrow('expired execution recovery requires every writer result durably accepted');
    expect(currentProof).not.toHaveBeenCalled();
    expect(readFixtureHostRows(database)).toEqual(completedRows);
  } finally {
    Date.now = now;
  }
  if (performance.now() >= deadline) throw new Error('Host expired recovery fixture exceeded its case deadline');
  preserveHostFixtureRoot = false;
});
