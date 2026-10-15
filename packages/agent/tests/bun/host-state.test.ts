import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { observeWorkStateSchemaCompiles } from '../helpers/ajv-compile-observer.ts';
import { createWorkflowReconciliationAuthorization } from '../helpers/workflow-reconciliation-authorization-fixture.ts';
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
import type { MastraSessionLedgerSnapshot } from '../../src/orchestration/persistent-session-handoff.ts';
import { validateHostOperationReservation } from '../../src/governance/edictum-boundary.ts';
import { validateCoordinationLedgerV1 } from '../../src/contracts/envelopes.ts';
import { validateLifecycleAggregate } from '../../src/lifecycle/lifecycle-state.ts';
import type { WorkflowAttemptApprovalVerifier, WorkflowAttemptReceipt } from '../../src/host-state.ts';
import type { LifecycleState } from '../../src/lifecycle/lifecycle-state.ts';
import { createHash, randomUUID } from 'node:crypto';
import * as nodeFs from 'node:fs';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { executeDocumentationClearOperation } from '../../src/documentation/clear.ts';
import {
  assertCodexDesktopAdapterContract,
  HostStateStore,
  openHostStateDatabase,
  inspectHostWorkspaceDatabase,
  workMigrationId,
} from '../../src/host-state.ts';
import * as trustedHostSurface from '../../src/trusted-host.ts';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
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
import { suspendLocalWork, suspendCompletedReadOnlyWork } from '../../src/orchestration/suspend-local-work.ts';
import { acquireLocalSourceWriterLease } from '../../src/orchestration/local-work-admission.ts';
import { resumePausedLocalWork } from '../../src/orchestration/resume-paused-local-work.ts';
import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.ts';
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
} from '../../src/orchestration/persistent-session-handoff.ts';
import {
  computeEdictumWorkflowApprovalEvidenceDigest,
  createHostOperationReservationStore,
} from '../../src/governance/edictum-boundary.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import * as persistedRows from '../../src/config/host-persisted-row.ts';

const workspace = 'a'.repeat(64);
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
let databasePath!: string;
let database!: Database;
let store!: HostStateStore;
let preserveHostFixtureRoot = false;
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
type ScalarCountRow = { readonly count: number | bigint };
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

test('trusted host source entrypoint exposes host state without a test issuer', () => {
  expect(trustedHostSurface.HostStateStore).toBe(HostStateStore);
  expect(trustedHostSurface.openHostStateDatabase).toBe(openHostStateDatabase);
  expect(typeof trustedHostSurface.createTrustedHostComposition).toBe('function');
  expect('createTestTrustedHostLauncherCapability' in trustedHostSurface).toBe(false);
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
test('Codex Desktop adapter contract binds identity, digests, opaque host capability and service closure', () => {
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
  expect(() => {
    Reflect.apply(assertCodexDesktopAdapterContract, undefined, [{ ...contract, host_capability: {} }]);
  }).toThrow(/opaque SQLite capability/);
  expect(() => {
    Reflect.apply(assertCodexDesktopAdapterContract, undefined, [{ ...contract, thread_id: '' }]);
  }).toThrow(/identity or digest binding/);
  expect(() => {
    Reflect.apply(assertCodexDesktopAdapterContract, undefined, [
      { ...contract, issuer_attestation_digest: 'not-a-digest' },
    ]);
  }).toThrow(/identity or digest binding/);
  expect(() => {
    Reflect.apply(assertCodexDesktopAdapterContract, undefined, [
      { ...contract, services: { ...contract.services, cas_writer: null } },
    ]);
  }).toThrow(/service closure/);
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
    await import(`../../src/orchestration/inspect-local-session.ts?lazy=${randomUUID()}`);
    expect(compiledWorkSchemas).toEqual([]);
    const freshSchema = (await import(
      `../../src/contracts/work-state-schema.ts?lazy=${randomUUID()}`
    )) as typeof import('../../src/contracts/work-state-schema.ts');
    expect(compiledWorkSchemas).toEqual([]);
    const request = fixture();
    expect(freshSchema.validateWorkState(request.nextWork)).toBe(true);
    expect(compiledWorkSchemas).toHaveLength(1);
    expect(freshSchema.validateWorkState(request.nextWork)).toBe(true);
    expect(compiledWorkSchemas).toHaveLength(1);
    // A qualified query creates a new module instance while Ajv's constructor remains shared.
    const fresh = (await import(
      `../../src/host-state.ts?lazy=${randomUUID()}`
    )) as typeof import('../../src/host-state.ts');
    expect(compiledWorkSchemas).toHaveLength(1);

    const freshStore = new fresh.HostStateStore(database, workspace);
    const committed = freshStore.compareAndSwapHostState(request);
    // Earlier cases may already have compiled the shared ordinary module.
    // The fresh owner above always compiles once; public callers add at most one.
    const publicCompileCount = compiledWorkSchemas.length;
    expect(publicCompileCount).toBeGreaterThanOrEqual(1);
    expect(publicCompileCount).toBeLessThanOrEqual(2);

    const saved = presentSnapshot(freshStore.readHostStateSnapshot(identity));
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
    expect(freshSchema.validateWorkState(invalid.nextWork)).toBe(false);
    expect(validateWorkState(invalid.nextWork)).toBe(false);
    expect(() => freshStore.compareAndSwapHostState(invalid)).toThrow('work record must match current WorkState/v1');

    expect(freshStore.readHostStateSnapshot(identity)).toEqual(saved);
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
  const first = commitHostState(fixture('work', 'file:src/one.ts'));
  const journal: TestJournalState = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: workspace,
    work_id: 'work',
    attempt: 1,
    run_id: 'run-work',
    step_id: 'wave0',
    items: [],
    completed: [],
  };
  database.exec(
    'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT,work_id TEXT,attempt INTEGER,revision INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  database
    .query<never, SQLQueryBindings[]>('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
    .run(workspace, 'work', 1, 1, canonicalJson(journal), canonicalJsonDigest(journal));
  const incoming = includeExistingLedger(fixture('successor', 'file:src/two.ts'), first.ledger);
  const { expectedWork: _omittedExpectedWork, ...incomingState } = incoming;
  const request: Parameters<HostStateStore['admitSuccessorWork']>[0] = {
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
  const firstPredecessor = request.predecessors[0];
  if (!firstPredecessor) throw new Error('successor fixture predecessor missing');
  const bad = {
    ...request,
    predecessors: [{ ...firstPredecessor, expectedJournal: { revision: 2, digest: canonicalJsonDigest(journal) } }],
  };
  expect(() => Reflect.apply(store.admitSuccessorWork.bind(store), undefined, [bad])).toThrow(/journal CAS/);
  expect(store.readHostStateSnapshot(identity)).toEqual(first);
  expect(store.readHostStateSnapshot({ ...identity, work_id: 'successor' }).work).toBeNull();
  const admitted = presentSnapshot(store.admitSuccessorWork(request));
  const prior = presentSnapshot(store.readHostStateSnapshot(identity));
  const priorTransition = prior.work.request_transition;
  const admittedTransition = admitted.work.request_transition;
  if (!priorTransition || !admittedTransition) throw new Error('successor transition fixture is missing');
  expect(prior.work.lease).toBeNull();
  expect(prior.work.execution.status).toBe('suspended');
  expect(prior.work.lifecycle.phase).toBe(first.work.lifecycle.phase);
  expect(prior.work.artifacts).toEqual(first.work.artifacts);
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
});

test('bundled work-state repair plans atomically, resumes exact postimages and restores without evidence loss', () => {
  const original = commitHostState(fixture());
  const inspection = store.repairRequestTransitionFields({ mode: 'inspect', operationId: 'fixture-repair' });
  expect(inspection.changed_work).toHaveLength(1);
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  const plan = store.repairRequestTransitionFields({
    mode: 'plan',
    operationId: 'fixture-repair',
    actor: 'fixture-owner',
  });
  expect(plan.status).toBe('planned');
  expect(store.readHostStateSnapshot(identity)).toEqual(original);
  const applied = store.repairRequestTransitionFields({ mode: 'apply', operationId: 'fixture-repair' });
  expect(applied.status).toBe('applied');
  const saved = readPresentSnapshot(store, identity);
  expect(saved.work.request_transition).toBeNull();
  expect(saved.work.artifacts).toEqual(original.work.artifacts);
  expect(saved.work.execution).toEqual(original.work.execution);
  expect(saved.ledgerVersion).toEqual(original.ledgerVersion);
  expect(store.repairRequestTransitionFields({ mode: 'resume', operationId: 'fixture-repair' })).toEqual(applied);
  const restored = store.repairRequestTransitionFields({ mode: 'restore', operationId: 'fixture-repair' });
  expect(restored.status).toBe('restored');
  const after = readPresentSnapshot(store, identity);
  expect(Object.hasOwn(after.work, 'request_transition')).toBe(false);
  expect(after.work.revision).toBe(saved.work.revision + 1);
  expect(after.work.lifecycle.phase).toBe(original.work.lifecycle.phase);
  expect(after.work.lifecycle.assurance).toEqual(original.work.lifecycle.assurance);
  expect(store.repairRequestTransitionFields({ mode: 'restore', operationId: 'fixture-repair' })).toEqual(restored);
});

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
  const variants = [
    null,
    { ...body, changes: {} },
    { ...body, changes: [] },
    { ...body, extra: true },
    { ...body, changes: [{ ...first, before: null }] },
    { ...body, changes: [{ ...first, identity: { ...identity, work_id: 'foreign' } }] },
  ];
  for (const candidate of variants) {
    const payload = JSON.stringify(candidate);
    const digest = createHash('sha256').update(payload).digest('hex');
    database
      .query<never, SQLQueryBindings[]>(
        'UPDATE agent_host_work_state_repair SET payload=?,digest=? WHERE workspace_id=? AND operation_id=?',
      )
      .run(payload, digest, workspace, 'decoder-regression');
    expect(() => store.repairRequestTransitionFields({ mode: 'apply', operationId: 'decoder-regression' })).toThrow();
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
  expect(() => inspectHostWorkspaceDatabase(root, 'missing.sqlite', workspace)).toThrow();
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
  const journal = issuedCurrentWorkflowJournal().journal;
  const request: Parameters<HostStateStore['renewActiveLocalLease']>[0] = {
    identity,
    attempt: 1,
    nativeSessionHandle: 'thread',
    generation: 1,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    verifyCurrent() {},
  };
  expect(() =>
    store.renewActiveLocalLease({
      ...request,
      verifyCurrent() {
        throw Error('source authority revoked');
      },
    }),
  ).toThrow(/revoked/);
  expect(store.readHostStateSnapshot(identity)).toEqual(state);
  const renewed = presentSnapshot(store.renewActiveLocalLease(request));
  expect(renewed.work.lease).toEqual(state.work.lease);
  expect(renewed.work.execution.assignment_attempts).toEqual(state.work.execution.assignment_attempts);
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
  expect(() => store.renewActiveLocalLease({ ...request, nativeSessionHandle: 'foreign' })).toThrow();
  const readClock = Date.now;
  const renewedLease = renewed.work.lease;
  if (!renewedLease) throw new Error('renewed Host fixture lease is missing');
  const renewedTicket = renewed.ledger.tickets.find((ticket) => ticket.ticket_id === renewedLease.ticket_id);
  if (!renewedTicket?.expires_at) throw new Error('renewed coordination ticket expiry is missing');
  const expiredClock = Date.parse(renewedTicket.expires_at) + 1;
  try {
    Date.now = () => expiredClock;
    expect(() =>
      store.renewActiveLocalLease({
        ...request,
        expectedWork: renewed.workVersion,
        expectedLedger: renewed.ledgerVersion,
        expectedJournal: { revision: row.revision, digest: journal.version.digest },
      }),
    ).toThrow(/live expiry differs/);
    expect(store.readHostStateSnapshot(identity)).toEqual(renewed);
  } finally {
    Date.now = readClock;
  }
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
beforeEach(async () => {
  preserveHostFixtureRoot = false;
  root = await mkdtemp(path.join(tmpdir(), 'host-state-'));
  try {
    const repositoryRoot = path.resolve(bundleRoot, '../..');
    writeFileSync(path.join(root, 'AGENTS.md'), readFileSync(path.join(repositoryRoot, 'AGENTS.md'), 'utf8'));
    writeFileSync(
      path.join(root, 'AGENT.sidecar.md'),
      readFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), 'utf8'),
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
    preserveHostFixtureRoot = false;
    console.error('Host fixture setup failed; scratch root retained: ' + root);
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
  async () => {
    const f = producerFixture();
    const bridge = await MastraSessionBridge.open(f.args);
    try {
      const first = await bridge.start();
      let journal = requiredSessionJournal(f.ledger);
      expect(journal.state.run_id).toBe(first.run_id);
      expect(journal.state.items.map((item) => clone(item.request))).toEqual(
        first.requests.map((request) => clone(request)),
      );
      const firstStepId = requiredValue(first.step_id, 'first producer step id');
      expect(f.rows().every((row) => row.revision === 3 && parseJsonRecord(row.payload).status === 'applied')).toBe(
        true,
      );
      const before = f.rows();
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
      expect(f.rows().every((row) => row.revision === 3 && parseJsonRecord(row.payload).status === 'applied')).toBe(
        true,
      );
    } finally {
      await bridge.close();
    }
  },
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

test(
  'session producer rejects missing and substituted completed wave chains before acquisition',
  async () => {
    const f = producerFixture('chain'),
      bridge = await MastraSessionBridge.open(f.args);
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
    const rejects = async (engine: Awaited<ReturnType<typeof bridge.start>>, changes: readonly SnapshotMutation[]) => {
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
    } finally {
      closeWorkspaceDatabaseWithAdmission(database);
      await bridge.close();
    }
  },
  { timeout: 30_000 },
);

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
])('Host database opener identity: $label', ({ afterInode, rejects }) => {
  const relative = 'opener-identity.db';
  const target = path.join(root, relative);
  const originalLstat = nodeFs.lstatSync;
  let directIdentityReads = 0;
  const observed = spyOn(nodeFs, 'lstatSync').mockImplementation(((...args: Parameters<typeof nodeFs.lstatSync>) => {
    const actual = Reflect.apply(originalLstat, nodeFs, args);
    if (actual === undefined || args[0] !== target) return actual;
    const firstSourceFrame = new Error().stack?.split('\n').find((frame) => frame.includes('/src/host-state.ts:'));
    const sourceLine = Number(firstSourceFrame?.match(/host-state\.ts:(\d+):/u)?.[1]);
    // These are the two direct opener identity reads. Match their immediate Source frame, not
    // an outer openHostStateDatabase/storage-admission frame around safety or lease checks.
    if (sourceLine !== 4932 && sourceLine !== 4945) return actual;
    directIdentityReads += 1;
    const inode = directIdentityReads === 1 ? 9_007_199_254_740_992n : afterInode;
    const exact = Object.create(actual) as typeof actual;
    const bigint = args[1] !== undefined && typeof args[1] === 'object' && Reflect.get(args[1], 'bigint') === true;
    Reflect.set(exact, 'dev', bigint ? 17n : 17);
    Reflect.set(exact, 'ino', bigint ? inode : Number(inode));
    return exact;
  }) as typeof nodeFs.lstatSync);
  let opened: Database | undefined;
  let failure: unknown;
  try {
    try {
      opened = openHostStateDatabase(root, relative, workspace);
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
    observed.mockRestore();
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

test('consumer migration keeps canonical SQLite in place, clears active rows and restores exact state under its held fence', async () => {
  const initial = fixture();
  quiesceImportedState([initial.nextWork], initial.nextLedger);
  const first = commitHostState(initial);
  const second = fixture('second', 'file:src/other.ts');
  quiesceImportedState([second.nextWork], second.nextLedger);
  includeExistingLedger(second, first.ledger);
  second.expectedLedger = first.ledgerVersion;
  commitHostState(second);
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
});

test('consumer migration archives individually bounded governance rows beyond the aggregate ingress node budget', async () => {
  const operation = reserveRequiredOperation(store, 'archive', '1'.repeat(64), '2'.repeat(64));
  store.transitionOperation(operation, 'commit_unknown');
  store.transitionOperation(operation, 'applied', '3'.repeat(64));
  const template = database
    .query<GovernanceSqlRow, []>("SELECT * FROM agent_host_governance WHERE kind='operation'")
    .get();
  if (!template) throw new Error('operation fixture row is missing');
  const basePayload = validateHostOperationReservation(parseJsonRecord(template.payload));
  const insert = database.query<never, SQLQueryBindings[]>('INSERT INTO agent_host_governance VALUES(?,?,?,?,?,?,?)');
  database
    .transaction(() => {
      for (let index = 0; index < 1400; index++) {
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
});

test('consumer migration restore refuses a prepared admission even when no WorkState was created', async () => {
  const migration = maintenanceStore(),
    binding = maintenanceBinding();
  const first = migration.acquireMaintenanceFence(binding);
  migration.consumerMigrationState(first, 'baseline', () => undefined);
  await migration.releaseMaintenanceFence(first);
  migration.recordAdmissionAttempt('failed-before-work', 1, { minimum_valid_identity: 'fixture' });
  const second = migration.acquireMaintenanceFence(binding);
  let called = false;
  expect(() =>
    migration.consumerMigrationState(second, 'restore', () => {
      called = true;
    }),
  ).toThrow(/new admission/);
  expect(called).toBe(false);
  expect(migration.readWorkspaceSnapshot().work).toHaveLength(0);
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
    const asynchronousVerifier = { ...maintenanceVerifier };
    setFixtureField(asynchronousVerifier, 'verifyAcquisition', async () => undefined);
    expect(
      () => new HostStateStore(database, workspace, undefined, undefined, undefined, asynchronousVerifier),
    ).toThrow('verifier invalid');
    for (const invalidVerifier of [() => true, () => Promise.resolve()]) {
      const verifier = { ...maintenanceVerifier };
      setFixtureField(verifier, 'verifyAcquisition', invalidVerifier);
      const checked = new HostStateStore(database, workspace, undefined, undefined, undefined, verifier);
      expect(() => checked.acquireMaintenanceFenceWithRecordedToken(maintenanceBinding(), randomUUID())).toThrow(
        'must be synchronous',
      );
      expect(checked.readMaintenanceFence()).toBeNull();
    }
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
    expect(database.query<ScalarCountRow, []>('SELECT count(*) AS count FROM agent_host_governance').get()?.count).toBe(
      0,
    );
    await checked.releaseMaintenanceFence(receipt);
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
      expect(store.consumeApproval('approvals', malformedApproval, async () => {})).rejects.toThrow(/unrecognized/i),
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
      await mkdir(path.join(root, 'runtime'), { recursive: true });
      await mkdir(path.join(root, 'docs'), { recursive: true });
      await cp(new URL('../../schemas', import.meta.url), path.join(root, 'runtime/schemas'), { recursive: true });
      await mkdir(path.join(root, 'runtime/instructions'), { recursive: true });
      await Promise.all([
        cp(new URL('../../TESTING.md', import.meta.url), path.join(root, 'runtime/TESTING.md')),
        ...[
          'development-lifecycle',
          'agent-allocation',
          'request-clarification',
          'adaptive-reporting',
          'requirement-routing',
          'knowledge-graph',
        ].map((name) =>
          cp(
            new URL(`../../instructions/${name}.md`, import.meta.url),
            path.join(root, `runtime/instructions/${name}.md`),
            {},
          ),
        ),
      ]);
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
    const retry = store.claimWorkflowAttempt(attemptRequest(beforeRetry));
    expect(retry.attempt.previous_attempt_id).toBe(started.attempt.attempt_id);
    expect(retry.attempt.attempt_id).not.toBe(started.attempt.attempt_id);
    expect(() => store.claimWorkflowAttempt(attemptRequest(beforeRetry))).toThrow(/compare-and-swap/);
    expect(() => store.claimWorkflowAttempt(attemptRequest())).toThrow(/reconciliation/);
    store.completeWorkflowAttempt(retry, 'finished');
    expect(
      readPresentSnapshot(store, identity).work.execution.assignment_attempts.map((entry) => entry.status),
    ).toEqual(['no_effect', 'completed']);
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
    const input = fixture();
    Reflect.deleteProperty(input.nextWork.execution, 'assignment_attempts');
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
    expect(atIndex(commitHostState(acknowledge).ledger.notices, 0, 'committed acknowledged notice').status).toBe(
      'acknowledged',
    );

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

  test('accepts an owned scope rebind and claim disposition in one history transition', () => {
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
      claimed_resources: ['file:src/task.ts'],
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
  });

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

  test('requires contour assurance before batching and accepts one attributable batch decision', () => {
    const initial = commitHostState(fixture());
    const ready = next(initial);
    ready.nextWork.lease = null;
    firstTicket(ready.nextLedger).status = 'ready_for_handoff';
    const readySaved = commitHostState(ready);

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

    const inconsistent = next(built);
    const inconsistentBatch = atIndex(inconsistent.nextLedger.batches, 0, 'inconsistent batch fixture');
    inconsistentBatch.status = 'accepted';
    inconsistentBatch.decision_pointer = '.agent/decisions/batch-work.json';
    expect(() => commitHostState(inconsistent)).toThrow(/atomically release contour tickets/);

    const accept = next(built);
    const acceptedBatch = atIndex(accept.nextLedger.batches, 0, 'accepted batch fixture');
    acceptedBatch.status = 'accepted';
    acceptedBatch.decision_pointer = '.agent/decisions/batch-work.json';
    firstTicket(accept.nextLedger).status = 'released';
    firstTicket(accept.nextLedger).active_resources = [];
    firstTicket(accept.nextLedger).expires_at = null;
    firstClaim(accept.nextLedger).status = 'released';
    firstClaim(accept.nextLedger).resources = [];
    expect(atIndex(commitHostState(accept).ledger.batches, 0, 'committed batch').status).toBe('accepted');
  });

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
  const prepared = await writerFixture();
  const seed = prepared.seed;
  const digestA = 'a'.repeat(64),
    digestB = 'b'.repeat(64);
  seed.nextWork.binding.runtime_source_revision = digestA;
  seed.nextWork.binding.runtime_code_digest = digestA;
  seed.nextWork.lifecycle.config_binding.runtime_code_digest = digestA;
  const initial = commitHostState(seed);
  const journal = completedRecoveryJournal(
    identity.work_id,
    requiredValue(initial.work.execution.run_id, 'recovery run id'),
    prepared.source,
  );
  const journalBytes = canonicalJson(journal.state);
  const journalDigest = journal.version.digest;
  const now = Date.now;
  let recovered!: PresentHostSnapshot;
  try {
    Date.now = () => Date.parse(requiredValue(firstTicket(initial.ledger).expires_at, 'recovery ticket expiry')) + 1;
    recovered = presentSnapshot(
      store.recoverExpiredLocalLease({
        identity,
        attempt: 1,
        nativeSessionHandle: 'thread',
        generation: 1,
        expectedWork: initial.workVersion,
        expectedLedger: initial.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: initial.maintenanceGeneration,
        verifyCurrent: () => ({ runtimeCodeDigest: digestB, authorityPointer: 'user:verified-current-bundle' }),
      }),
    );
  } finally {
    Date.now = now;
  }
  expect(recovered.work.binding.runtime_source_revision).toBe(digestB);
  expect(recovered.work.binding.runtime_code_digest).toBe(digestB);
  expect(recovered.work.lifecycle.config_binding.runtime_code_digest).toBe(digestB);
  expect(recovered.work.execution.assignment_attempts).toEqual([]);
  expect(requiredLease(recovered.work).ticket_id).not.toBe(requiredLease(initial.work).ticket_id);
  expect(firstTicket(recovered.ledger).status).toBe('read_only');
  const stored = requiredValue(
    database
      .query<RevisionPayloadDigestSqlRow, []>('SELECT revision,payload,digest FROM agent_host_mastra_session_ledger')
      .get(),
    'recovered session ledger row',
  );
  expect(stored.payload).toBe(journalBytes);
  expect(stored.digest).toBe(journalDigest);
  expect(stored.revision).toBe(journal.version.revision + 1);
});
