import { afterEach, beforeEach, expect, mock } from 'bun:test';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { stringify as stringifyYaml } from 'yaml';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { isUnknownSynchronousChild } from './synchronous-child-outcome.ts';
import { runReconcileArtifacts as reconcileEntrypoint } from '../../bin/reconcile-artifacts.ts';
import { run as runEntrypoint } from '../../bin/run.ts';
import { readPin } from '../../bin/bun.ts';
import { inspectHistoricalOwnerContext } from '../../bin/runtime-config-rebind.ts';
import { suspendHistoricalOwnerWork, suspendLocalWork } from '../../src/orchestration/suspend-local-work.ts';
import {
  loadRuntimeConfig,
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
  type WorkItemSelection,
} from '../../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../../src/config/project-context.ts';
import { canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { validateCoordinationLedgerV1, type CoordinationLedger } from '../../src/contracts/envelopes.ts';
import {
  createHistoricalResearchActivationFixture,
  createHistoricalResearchFixture,
} from './historical-research-fixture.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { HostStateStore } from '../../src/host-state.ts';
import { admittedResearchResultsForSynthesis } from '../../src/orchestration/observed-synthesis-result.ts';
import { MastraSessionLedger, mastraLedgerStatus } from '../../src/orchestration/persistent-session-handoff.ts';
import { parseMastraSessionLedgerState } from '../../src/orchestration/mastra-session-ledger-codec.ts';
import { sessionActionsForWave } from '../../src/orchestration/session-handoff.ts';
import { configuredContextForStage, type ConfiguredContext } from '../../src/orchestration/configured-context.ts';
import { snapshotDeclaredSources } from '../../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import { compileDevelopmentWorkflow } from '../../src/orchestration/workflow-plan.ts';
import { runtimeExecutableInventory } from '../../tooling/maintained-source-inventory.ts';
import type { AgentRuntimeConfig } from '../../src/config/runtime-config.ts';
import {
  validateRuntimeInitializationReceipt,
  type RuntimeInitializationReceipt,
} from '../../src/config/initialization-record.ts';
import type {
  WorkState,
  WorkIdentity,
  StateVersion,
  RecoveryReviewBinding,
  HistoricalTerminalSynthesisProvenance,
} from '../../src/host-state.ts';
import type { MastraLedgerItem, MastraSessionLedgerState } from '../../src/orchestration/persistent-session-handoff.ts';
import {
  sessionBridgeRunId,
  buildSessionBridgeRequest,
  parseSessionBridgeRunState,
  parseSessionBridgeObservation,
  parseSessionBridgeRequest,
  type SessionBridgeRequest,
} from '../../src/orchestration/mastra-session-bridge-contract.ts';
import type { SessionHandoffContext } from '../../src/orchestration/session-handoff.ts';
import type {
  WorkflowSessionReservation,
  WorkflowAssignmentRequest,
  TrustedWorkflowAssignment,
} from '../../src/runtime-kernel.ts';
import type { WorkExecutionContext } from '../../src/orchestration/workflow-session-reservation-contract.ts';
import type { ScopedSourceSnapshot } from '../../src/orchestration/scoped-source-snapshot.ts';
import { validateHostOperationReservation, type OperationReservation } from '../../src/governance/edictum-boundary.ts';
import { hasUnresolvedFixtureOperations } from './unresolved-governance-fixture.ts';
import type { SpawnSyncReturns } from 'node:child_process';
import { closeNativeWorkspaceDatabase, withWorkspaceDatabaseClose } from '../../src/config/workspace-database-raw.js';
import {
  parseWorkflowSessionReservationData,
  workflowWorkItemSchema,
} from '../../src/orchestration/workflow-session-reservation-contract.ts';

export function registerRuntimeConfigFixtureCleanup(): void {
  beforeEach(() => {
    if (pendingFixtureCalls.size !== 0)
      throw Error('Cannot begin a runtime config fixture case while a prior fixture call is unresolved');
    resetSourceCorrectionNativeRuntime();
  });
  afterEach(() => cleanupRuntimeConfigFixtureRoots());
}

export function cleanupRuntimeConfigFixtureRoots(removeRoot: typeof rmSync = rmSync): void {
  const hasPendingCalls = pendingFixtureCalls.size !== 0;
  const errors: unknown[] = [];
  const warnRetained = (message: string): void => {
    try {
      console.warn(message);
    } catch (error) {
      errors.push(error);
    }
  };
  for (const root of [...fixtureRoots]) {
    let terminalDisposition = false;
    try {
      if (pendingFixtureCalls.has(root)) {
        failedFixtureRoots.add(root);
        warnRetained(`Retained fixture with an unresolved operation: ${root}`);
        terminalDisposition = true;
      } else if (failedFixtureRoots.has(root)) {
        warnRetained(`Retained fixture after failed operation or cleanup: ${root}`);
        terminalDisposition = true;
      } else if (fixtureHasUnresolvedOperations(root)) {
        failedFixtureRoots.add(root);
        warnRetained(`Retained fixture with unresolved governance: ${root}`);
        terminalDisposition = true;
      } else {
        removeRoot(root, { recursive: true, force: true });
        fixtureDatabasePaths.delete(root);
        failedFixtureRoots.delete(root);
        terminalDisposition = true;
      }
    } catch (error) {
      failedFixtureRoots.add(root);
      errors.push(error);
      warnRetained(`Retained fixture after failed cleanup: ${root}`);
      terminalDisposition = true;
    }
    if (terminalDisposition) {
      // Explicit retention is not permission for a later automatic deletion retry.
      const index = fixtureRoots.indexOf(root);
      if (index >= 0) fixtureRoots.splice(index, 1);
    }
  }
  if (!hasPendingCalls) {
    try {
      resetSourceCorrectionNativeRuntime();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length)
    throw new AggregateError(errors, 'Runtime config fixture cleanup failed; failed roots were retained');
}

function resetSourceCorrectionNativeRuntime(): void {
  sourceCorrectionNativeRuntime.value = null;
  if (sourceCorrectionNativeRuntime.previousPath !== undefined) {
    if (sourceCorrectionNativeRuntime.previousPath === null) delete process.env.PATH;
    else process.env.PATH = sourceCorrectionNativeRuntime.previousPath;
    sourceCorrectionNativeRuntime.previousPath = undefined;
  }
}

export const source = process.env.VIDA_CONFIG_REBIND_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '../..');

type RuntimeFixture = {
  root: string;
  put: (relative: string, bytes: string | Uint8Array) => void;
  args: (mode: string) => string[];
  target: string;
  oldYaml: string;
  receipt: MutableFixture<RuntimeInitializationReceipt>;
  workspace: string;
  bundle: string;
};

type HistoricalFixture = ReturnType<typeof historicalFixture>;

type RecoveryFixtureOptions = {
  configuredContext?: boolean;
  markerlessExcerpt?: boolean;
  aggregateContext?: boolean;
  officialDocs?: boolean;
};

type HistoricalPredicate = Parameters<typeof suspendHistoricalOwnerWork>[0]['predicate'];

type HistoricalReleaseRequest = {
  schema:
    | 'ReadonlyBookkeepingOwnerReleaseRequest/v1'
    | 'SettledResearchOwnerReleaseRequest/v1'
    | 'UnissuedOwnerReleaseRequest/v1'
    | 'HistoricalOwnerReleaseRequest/v1';
  identity: WorkIdentity;
  attempt: number;
  userRequestPointer: string;
  requestIntent: 'next_work' | 'linked_correction';
  predicate: HistoricalPredicate;
  preimage_ref?: string;
};

type HistoricalFixtureResult = {
  f: RuntimeFixture;
  args: (mode: string) => string[];
  request: HistoricalReleaseRequest;
  state: FixtureJournal;
  configuredContexts: MutableConfiguredContext[];
};

type RecoveryFixtureResult = {
  f: RuntimeFixture;
  input: RecoveryReviewInput;
  call: (
    mode: 'prepare' | 'begin' | 'complete' | 'inspect',
    body?: RecoveryReviewInput,
    extra?: string[],
  ) => Promise<RecoveryCliResult>;
  observation: (operation: OperationReservation, status?: 'PASS' | 'FAIL') => RecoveryObservation;
  state: FixtureJournal;
  configuredContexts: MutableConfiguredContext[];
};

type ConfiguredContextFixture = HistoricalFixtureResult | RecoveryFixtureResult;

export function invokeConfiguredContextFixture(subject: ConfiguredContextFixture): Promise<unknown> {
  return 'args' in subject ? run(subject.args('inspect')) : subject.call('prepare');
}

type SourceCorrectionReportRequest = {
  request_id: string;
  operation_id: string;
  publish_operation_id: string;
  repository_id: string;
  source_project_ids: readonly string[];
  original_operation: { sha256: string; plan_digest: string };
  new_source: { digest: string; entries: readonly { path: string; bytes: number; sha256: string }[] };
  new_source_manifest: { version: string };
  prior_system_update: { installed_bytes: number };
};

type SourceCorrectionFixtureResult = {
  f: RuntimeFixture;
  request: HistoricalReleaseRequest;
  state: FixtureJournal;
  configuredContexts: MutableConfiguredContext[];
  deliveryArgs: (mode: string) => string[];
  repairArgs: (mode: string) => string[];
  sourceBeforeimagesPath: string;
  priorSystemUpdatePath: string;
  changedPath: string;
  sourceManifestPath: string;
  authorizedPaths: string[];
  targetVersion: string;
  publicationOperationId?: string;
};

type SourceCorrectionFixtureContext = SourceCorrectionFixtureResult & { publicationOperationId?: string };

type SourceCorrectionRebindRunner = {
  runRuntimeConfigRebind: (args: string[], options?: ReconcileOptions) => Promise<unknown>;
};

function isSourceCorrectionRebindRunner(value: unknown): value is SourceCorrectionRebindRunner {
  return (
    typeof value === 'object' &&
    value !== null &&
    'runRuntimeConfigRebind' in value &&
    typeof value.runRuntimeConfigRebind === 'function'
  );
}

type RecoveryObservation = {
  action_id: string;
  caller_session: string;
  controller_id: string;
  status: 'PASS' | 'FAIL';
  observation: { agent_id: string; tool_call_ref: string; result: unknown };
};

type FixtureHostSnapshot = ReturnType<HostStateStore['readHostStateSnapshot']>;

type RecoveryReviewInput = Pick<
  RecoveryReviewBinding,
  'identity' | 'attempt' | 'callerSession' | 'controllerId' | 'userInstructionRef'
> & {
  baselinePath: string;
  originalContexts?: unknown;
  request?: RecoveryReviewBinding;
  observation?: RecoveryObservation;
};

export type MaintenanceFenceAcquisition = HostStateStore['acquireMaintenanceFenceWithRecordedToken'];

type SeedStateOptions = {
  lease?: boolean;
  effect?: WorkState['execution']['assignment_attempts'][number]['status'] | null;
  ticketStatus?: CoordinationLedger['tickets'][number]['status'] | null;
  activeClaim?: boolean;
  issued?: boolean;
  native?: boolean;
};

type ReceiptMutationInput = {
  db: Database;
  store: HostStateStore;
  capture: Parameters<HostStateStore['captureHistoricalTerminalSynthesisAndRelease']>[0];
  before: ReturnType<HostStateStore['readHostStateSnapshot']>;
  journal: FixtureJournal;
  candidate: FixtureJournal['items'][number];
  result: ReturnType<HostStateStore['captureHistoricalTerminalSynthesisAndRelease']>;
};

export type MutableFixture<T> = T extends readonly [unknown, ...unknown[]]
  ? { -readonly [K in keyof T]: MutableFixture<T[K]> }
  : T extends readonly (infer U)[]
    ? MutableFixture<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: MutableFixture<T[K]> }
      : T;

export type FixtureJournal = Omit<MastraSessionLedgerState, 'items' | 'completed'> & {
  items: MastraLedgerItem[];
  completed: { step_id: string; items: MastraLedgerItem[] }[];
};

type MutableConfiguredContext = MutableFixture<ConfiguredContext>;

type RuntimeAgentProfile = NonNullable<AgentRuntimeConfig['agents']['profiles'][string]>;

type RuntimeAgentProfileChange = Pick<RuntimeAgentProfile, 'model' | 'reasoning'>;

type RuntimeWorkflowStage = NonNullable<AgentRuntimeConfig['workflows'][string]>['stages'][number];

export type RuntimeWorkflowAssignments = NonNullable<RuntimeWorkflowStage['assignments']>;

export function requiredRuntimeAgentProfile(config: AgentRuntimeConfig, profileId: string): RuntimeAgentProfile {
  const profile = config.agents.profiles[profileId];
  if (profile === undefined) throw Error(`Runtime fixture is missing agent profile ${profileId}`);
  return profile;
}

export function requiredRuntimeWorkflow(
  config: AgentRuntimeConfig,
  workflowId: string,
): NonNullable<AgentRuntimeConfig['workflows'][string]> {
  const workflow = config.workflows[workflowId];
  if (workflow === undefined) throw Error(`Runtime fixture is missing workflow ${workflowId}`);
  return workflow;
}

export type FixtureDatabaseState = Record<string, Record<string, unknown>[]> & {
  agent_host_state: Record<string, unknown>[];
  agent_host_mastra_session_ledger: Record<string, unknown>[];
  agent_host_governance: Record<string, unknown>[];
  agent_host_historical_terminal_synthesis_capture?: Record<string, unknown>[];
};

type HostStateSqlRow = {
  workspace_id: string;
  kind: string;
  id: string;
  revision: number;
  payload: string;
  digest: string;
  rowid?: number;
};

export type HostStatePayloadRow = { payload: string; rowid?: number; id?: string; digest?: string; revision?: number };

export type HostStateRowId = { rowid: number };

export type HostStateRowIdPayload = { rowid: number; payload: string };

export type HostStateRawPayloadRow = { payload: string; raw_payload_bytes: Uint8Array };

type FixtureSessionObservation = NonNullable<MastraLedgerItem['observation']>;

type SessionLedgerSqlRow = {
  workspace_id: string;
  work_id: string;
  attempt: number;
  revision: number;
  payload: string;
  digest: string;
  rowid?: number;
};

export type SessionLedgerPayloadRow = { payload: string; rowid?: number; digest?: string; revision?: number };

type SyntheticWorkflowStep = {
  status?: string;
  payload?: Record<string, unknown>;
  suspendPayload?: { requests: SessionBridgeRequest[] };
  resumePayload?: { observations: FixtureSessionObservation[] };
  output?: Record<string, unknown>;
};

type SyntheticWorkflowInput = {
  work_id: string;
  attempt: number;
  scope_digest: string;
  workflow_id: string;
  config_digest: string;
  selection: WorkItemSelection;
  observations: FixtureSessionObservation[];
};

type SyntheticWorkflowSnapshot = {
  runId: string;
  status: 'suspended';
  context: Record<string, SyntheticWorkflowStep | SyntheticWorkflowInput> & { input: SyntheticWorkflowInput };
};

type SyntheticStateMutation = (
  state: FixtureJournal,
  snapshot: SyntheticWorkflowSnapshot,
  reservation?: WorkflowSessionReservation,
) => unknown;

type StandaloneRuntime = NonNullable<ReturnType<typeof import('../../bin/bun.ts').standaloneRuntime>>;

export const fixtureContextPath = 'docs/project-context.md';

const fixtureRoots: string[] = [];
const fixtureDatabasePaths = new Map<string, string>();
// Retained roots leave the active queue only after this custody set updates; exact database paths stay mapped.
const failedFixtureRoots = new Set<string>();

const pendingFixtureCalls = new Map<string | undefined, number>();

function fixtureHasUnresolvedOperations(root: string): boolean {
  const databasePath = fixtureDatabasePaths.get(root);
  if (databasePath === undefined || !existsSync(databasePath)) return true;
  let database: Database;
  try {
    database = new Database(databasePath, { readonly: true, strict: true });
  } catch {
    return true;
  }
  let inspectionFailed = false;
  let inspectionError: unknown;
  try {
    return withWorkspaceDatabaseClose(
      database,
      () => {
        try {
          return hasUnresolvedFixtureOperations(database);
        } catch (error) {
          inspectionFailed = true;
          inspectionError = error;
          throw error;
        }
      },
      closeNativeWorkspaceDatabase,
      'Fixture governance inspection and database close failed',
    );
  } catch (error) {
    // Inspection errors already mean unresolved custody. A paired close error
    // must still escape with the original inspection error preserved.
    if (inspectionFailed && error === inspectionError) return true;
    failedFixtureRoots.add(root);
    throw error;
  }
}

/** Retain only this case's newly-created fixture roots if setup or its body fails. */
export function withHistoricalInspectionFixtureCustody<TResult>(body: () => TResult): TResult {
  const firstOwnedRoot = fixtureRoots.length;
  try {
    return body();
  } catch (error: unknown) {
    for (const root of fixtureRoots.slice(firstOwnedRoot)) failedFixtureRoots.add(root);
    throw error;
  }
}

export const sourceCorrectionNativeRuntime: {
  value: StandaloneRuntime | null;
  mocked: boolean;
  previousPath: string | null | undefined;
} = { value: null, mocked: false, previousPath: undefined };

export const sourceCorrectionPriorVersion = '0.1.2';

const sourceCorrectionNextVersion = (version: string): string => {
  const [major, minor, patch] = version.split('.').map(Number);
  if (
    major === undefined ||
    minor === undefined ||
    patch === undefined ||
    ![major, minor, patch].every(Number.isSafeInteger)
  )
    throw Error('Fixture source version must have three safe integer components');
  return `${major}.${minor}.${patch + 1}`;
};

export type ReconcileOptions = NonNullable<Parameters<typeof reconcileEntrypoint>[1]>;

export async function fixtureCall<TResult>(
  entrypoint: (args: string[], options?: ReconcileOptions) => TResult | Promise<TResult>,
  args: string[],
  options?: ReconcileOptions,
): Promise<Awaited<TResult>> {
  const rootFlagIndex = args.indexOf('--project-root');
  if (rootFlagIndex < 0) throw Error('Fixture invocation is missing its project root argument');
  const root = requiredElement(args, rootFlagIndex + 1, 'fixture project root');
  pendingFixtureCalls.set(root, (pendingFixtureCalls.get(root) ?? 0) + 1);
  let outcome: { ok: true; value: Awaited<TResult> } | { ok: false; error: unknown };
  try {
    outcome = { ok: true, value: await entrypoint(args, options) };
  } catch (error: unknown) {
    outcome = { ok: false, error };
  }
  const active = pendingFixtureCalls.get(root);
  let cleanupError: Error | undefined;
  if (active === undefined) cleanupError = Error('Fixture call tracking was lost; custody must be retained');
  else {
    const remaining = active - 1;
    if (remaining) pendingFixtureCalls.set(root, remaining);
    else pendingFixtureCalls.delete(root);
  }
  if (cleanupError !== undefined) {
    failedFixtureRoots.add(root);
    if (!outcome.ok)
      throw new AggregateError([outcome.error, cleanupError], 'Fixture call and custody cleanup both failed', {
        cause: outcome.error,
      });
    throw cleanupError;
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

export type CliObject = Record<string, unknown> & {
  request?: CliObject | null | undefined;
  operation?: CliObject | null | undefined;
  source?: CliObject | null | undefined;
  context?: CliObject | null | undefined;
  plan?: CliObject | null | undefined;
  original_operation?: CliObject | null | undefined;
  new_source?: CliObject | null | undefined;
  new_source_manifest?: CliObject | null | undefined;
  prior_system_update?: CliObject | null | undefined;
  source_beforeimages?: CliObject | null | undefined;
  fence?: CliObject | null | undefined;
  inspection?: CliObject | null | undefined;
  config?: CliObject | null | undefined;
  status?: string;
  operation_path?: string;
  sidecar_path?: string;
  operation_id?: string;
  request_id?: string;
  version?: string;
  plan_digest?: string;
  rights_granted?: boolean;
  runtime_acceptance?: boolean;
  native_dispatch_performed?: boolean;
};

export function checkedCliObject(value: unknown, label: string): CliObject {
  if (!isPlainRecord(value)) throw Error(`${label} returned a non-object result`);
  const nested = (key: string): CliObject | null | undefined => {
    const candidate = value[key];
    if (candidate === undefined) return undefined;
    if (candidate === null) return null;
    return checkedCliObject(candidate, `${label}.${key}`);
  };
  return {
    ...value,
    ...(Object.hasOwn(value, 'request') ? { request: nested('request') } : {}),
    ...(Object.hasOwn(value, 'operation') ? { operation: nested('operation') } : {}),
    ...(Object.hasOwn(value, 'source') ? { source: nested('source') } : {}),
    ...(Object.hasOwn(value, 'context') ? { context: nested('context') } : {}),
    ...(Object.hasOwn(value, 'plan') ? { plan: nested('plan') } : {}),
    ...(Object.hasOwn(value, 'original_operation') ? { original_operation: nested('original_operation') } : {}),
    ...(Object.hasOwn(value, 'new_source') ? { new_source: nested('new_source') } : {}),
    ...(Object.hasOwn(value, 'new_source_manifest') ? { new_source_manifest: nested('new_source_manifest') } : {}),
    ...(Object.hasOwn(value, 'prior_system_update') ? { prior_system_update: nested('prior_system_update') } : {}),
    ...(Object.hasOwn(value, 'source_beforeimages') ? { source_beforeimages: nested('source_beforeimages') } : {}),
    ...(Object.hasOwn(value, 'fence') ? { fence: nested('fence') } : {}),
    ...(Object.hasOwn(value, 'inspection') ? { inspection: nested('inspection') } : {}),
    ...(Object.hasOwn(value, 'config') ? { config: nested('config') } : {}),
    ...(Object.hasOwn(value, 'status') ? { status: checkedString(value.status, `${label}.status`) } : {}),
    ...(Object.hasOwn(value, 'operation_path')
      ? { operation_path: checkedString(value.operation_path, `${label}.operation_path`) }
      : {}),
    ...(Object.hasOwn(value, 'sidecar_path')
      ? { sidecar_path: checkedString(value.sidecar_path, `${label}.sidecar_path`) }
      : {}),
    ...(Object.hasOwn(value, 'operation_id')
      ? { operation_id: checkedString(value.operation_id, `${label}.operation_id`) }
      : {}),
    ...(Object.hasOwn(value, 'request_id')
      ? { request_id: checkedString(value.request_id, `${label}.request_id`) }
      : {}),
    ...(Object.hasOwn(value, 'version') ? { version: checkedString(value.version, `${label}.version`) } : {}),
    ...(Object.hasOwn(value, 'plan_digest')
      ? { plan_digest: checkedString(value.plan_digest, `${label}.plan_digest`) }
      : {}),
    ...(Object.hasOwn(value, 'rights_granted')
      ? { rights_granted: checkedBoolean(value.rights_granted, `${label}.rights_granted`) }
      : {}),
    ...(Object.hasOwn(value, 'runtime_acceptance')
      ? { runtime_acceptance: checkedBoolean(value.runtime_acceptance, `${label}.runtime_acceptance`) }
      : {}),
    ...(Object.hasOwn(value, 'native_dispatch_performed')
      ? {
          native_dispatch_performed: checkedBoolean(
            value.native_dispatch_performed,
            `${label}.native_dispatch_performed`,
          ),
        }
      : {}),
  };
}

export function checkedRecord(value: unknown, label: string): CliObject {
  return checkedCliObject(value, label);
}

function checkedSqliteRow(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw Error(`${label} returned no row`);
  return value;
}

export function requiredSqliteRow<TRow>(value: TRow | null | undefined, label: string): TRow {
  if (value === null || value === undefined) throw Error(`${label} returned no row`);
  return value;
}

export function querySqliteRow<TRow>(db: Database, sql: string, label: string, ...bindings: SQLQueryBindings[]): TRow {
  return requiredSqliteRow(db.query<TRow, SQLQueryBindings[]>(sql).get(...bindings), label);
}

export function readHostStateSqlRow(db: Database, sql: string, ...bindings: SQLQueryBindings[]): HostStateSqlRow {
  return querySqliteRow<HostStateSqlRow>(db, sql, 'Host state query', ...bindings);
}

export function readSessionLedgerSqlRow(
  db: Database,
  sql: string,
  ...bindings: SQLQueryBindings[]
): SessionLedgerSqlRow {
  return querySqliteRow<SessionLedgerSqlRow>(db, sql, 'session ledger query', ...bindings);
}

export function checkedFixtureWork(value: unknown, f: RuntimeFixture): WorkState {
  const schema = checkedRecord(
    parseFixtureJson(readFileSync(path.join(f.root, `${f.bundle}/schemas/work-state.v1.schema.json`), 'utf8')),
    'maintained WorkState schema',
  );
  const validate = new Ajv2020().compile<WorkState>(schema);
  if (!validate(value)) throw Error('Fixture WorkState does not match the maintained contract');
  return value;
}

export function checkedFixtureLedger(value: unknown): CoordinationLedger {
  const result = validateCoordinationLedgerV1(value);
  if (!result.ok) throw Error(result.issues[0]?.message ?? 'Fixture ledger does not match the maintained contract');
  return result.ledger;
}

export function checkedMutableFixtureLedger(value: unknown): MutableFixture<CoordinationLedger> {
  const ledger = checkedFixtureLedger(value);
  return {
    ...ledger,
    tickets: ledger.tickets.map((ticket) => ({
      ...ticket,
      project_ids: [...ticket.project_ids],
      contour_keys: [...ticket.contour_keys],
      exclusive_resources: [...ticket.exclusive_resources],
      claim_ids: [...ticket.claim_ids],
      active_resources: [...ticket.active_resources],
      blocked_resources: [...ticket.blocked_resources],
    })),
    claims: ledger.claims.map((claim) => ({ ...claim, resources: [...claim.resources] })),
    notices: ledger.notices.map((notice) => ({ ...notice })),
    dispositions: ledger.dispositions.map((disposition) => ({ ...disposition })),
    contours: ledger.contours.map((contour) => ({ ...contour })),
    batches: ledger.batches.map((batch) => ({ ...batch })),
    rebinds: ledger.rebinds.map((rebind) => ({ ...rebind })),
    operations: ledger.operations.map((operation) => ({ ...operation })),
    retirements: ledger.retirements.map((retirement) => ({ ...retirement })),
  };
}

export function parseSessionJournalPayload(payload: string): MastraSessionLedgerState {
  return parseMastraSessionLedgerState(parseFixtureJson(payload));
}

export function requiredHostStatePayload(state: FixtureDatabaseState, kind: 'work' | 'ledger'): string {
  const row = state.agent_host_state.find((entry) => entry.kind === kind);
  if (row === undefined) throw Error(`Fixture ${kind} row is missing`);
  return checkedString(row.payload, `${kind} payload`);
}

export function requiredSessionLedgerPayload(state: FixtureDatabaseState): string {
  return checkedString(
    requiredElement(state.agent_host_mastra_session_ledger, 0, 'session ledger row').payload,
    'session ledger payload',
  );
}

export function requiredResearchNormalizationItem(items: readonly MastraLedgerItem[]): {
  item: MastraLedgerItem;
  plan: NonNullable<MastraLedgerItem['research_normalization']>;
} {
  const item = [...items].reverse().find((entry) => entry.research_normalization);
  if (item === undefined || item.research_normalization === undefined)
    throw Error('Historical normalization fixture has no normalization item');
  return { item, plan: item.research_normalization };
}

export function checkedResearchChangelogEvent(text: string): Readonly<Record<string, unknown>> {
  const event = parseFixtureJson(text);
  if (!isPlainRecord(event)) throw Error('Historical normalization changelog event is not an object');
  return event;
}

export function requiredResearchOperationReference(scopeBytes: Uint8Array): string {
  const scope = checkedRecord(
      parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(scopeBytes)),
      'historical research scope',
    ),
    attribution = checkedRecord(scope.attribution, 'historical research scope attribution');
  return checkedString(attribution.pointer, 'historical research operation pointer');
}

export function checkedSqliteInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw Error(`${label} is not a safe integer`);
  return value;
}

export function requiredStateVersion(value: StateVersion | null, label: string): StateVersion {
  if (value === null) throw Error(`${label} is missing from the current fixture`);
  return value;
}

export function checkedString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw Error(`${label} must be a string`);
  return value;
}

export function requiredCliString(value: CliObject, key: string, label: string): string {
  return checkedString(value[key], label);
}

export function cliChildDiagnostic(label: string, result: SpawnSyncReturns<string>): string {
  const outcome = isUnknownSynchronousChild(result)
    ? 'UNKNOWN'
    : result.status === 0
      ? 'success'
      : 'terminal nonzero exit';
  return (
    `${label}: outcome=${outcome}; status=${result.status}; signal=${result.signal ?? 'none'}; ` +
    `error=${result.error?.message ?? 'none'}; stderr_tail=${JSON.stringify(result.stderr.slice(-4000))}; ` +
    `stdout_tail=${JSON.stringify(result.stdout.slice(-4000))}`
  );
}

export function requiredCliObject(value: CliObject, key: string, label: string): CliObject {
  return checkedCliObject(value[key], label);
}

export function checkedBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw Error(`${label} must be a boolean`);
  return value;
}

export function checkedStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw Error(`${label} must be an array`);
  return value.map((entry: unknown, index: number) => checkedString(entry, `${label}[${index}]`));
}

export function parseFixtureJson(text: string): unknown {
  const value: unknown = JSON.parse(text);
  return value;
}

export function checkedFixtureInitializationReceipt(f: RuntimeFixture, text: string): RuntimeInitializationReceipt {
  const schema = readFileSync(path.join(f.root, `${f.bundle}/schemas/runtime-initialization.v1.schema.json`), 'utf8');
  return validateRuntimeInitializationReceipt(parseFixtureJson(text), schema);
}

export function checkedSourceCorrectionReportRequest(value: unknown): SourceCorrectionReportRequest {
  const request = checkedRecord(value, 'Source correction request');
  const originalOperation = checkedRecord(request.original_operation, 'Source correction original operation');
  const newSource = checkedRecord(request.new_source, 'Source correction source snapshot');
  const manifest = checkedRecord(request.new_source_manifest, 'Source correction package manifest');
  const priorUpdate = checkedRecord(request.prior_system_update, 'Source correction prior update');
  if (!Array.isArray(newSource.entries)) throw Error('Source correction snapshot entries are missing');
  const entries = newSource.entries.map((entry: unknown) => {
    const checked = checkedRecord(entry, 'Source correction snapshot entry');
    if (
      typeof checked.path !== 'string' ||
      typeof checked.bytes !== 'number' ||
      !Number.isSafeInteger(checked.bytes) ||
      checked.bytes < 0 ||
      typeof checked.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(checked.sha256)
    )
      throw Error('Source correction snapshot entry is malformed');
    return { path: checked.path, bytes: checked.bytes, sha256: checked.sha256 };
  });
  if (typeof priorUpdate.installed_bytes !== 'number' || !Number.isSafeInteger(priorUpdate.installed_bytes))
    throw Error('Source correction prior update byte count is malformed');
  return {
    request_id: checkedString(request.request_id, 'Source correction request id'),
    operation_id: checkedString(request.operation_id, 'Source correction operation id'),
    publish_operation_id: checkedString(request.publish_operation_id, 'Source correction publication id'),
    repository_id: checkedString(request.repository_id, 'Source correction repository id'),
    source_project_ids: checkedStringArray(request.source_project_ids, 'Source correction project ids'),
    original_operation: {
      sha256: checkedString(originalOperation.sha256, 'Source correction original operation digest'),
      plan_digest: checkedString(originalOperation.plan_digest, 'Source correction original plan digest'),
    },
    new_source: {
      digest: checkedString(newSource.digest, 'Source correction source digest'),
      entries,
    },
    new_source_manifest: { version: checkedString(manifest.version, 'Source correction package version') },
    prior_system_update: { installed_bytes: priorUpdate.installed_bytes },
  };
}

function checkedWorkItemKind(value: unknown): WorkItemSelection['kind'] {
  if (
    value === 'epic' ||
    value === 'feature' ||
    value === 'pbi' ||
    value === 'story' ||
    value === 'bug' ||
    value === 'task' ||
    value === 'research'
  )
    return value;
  throw Error('Fixture workflow selection kind is invalid');
}

function checkedFlowIntent(value: unknown): WorkItemSelection['intent'] {
  if (
    value === 'information_research' ||
    value === 'implementation_new' ||
    value === 'implementation_change' ||
    value === 'bug_fix' ||
    value === 'task_execution'
  )
    return value;
  throw Error('Fixture workflow selection intent is invalid');
}

function checkedSyntheticWorkflowInput(value: unknown): SyntheticWorkflowInput {
  const input = checkedRecord(value, 'workflow snapshot input');
  return {
    work_id: checkedString(input.work_id, 'workflow input work id'),
    attempt: checkedSqliteInteger(input.attempt, 'workflow input attempt'),
    scope_digest: checkedString(input.scope_digest, 'workflow input scope digest'),
    workflow_id: checkedString(input.workflow_id, 'workflow input workflow id'),
    config_digest: checkedString(input.config_digest, 'workflow input config digest'),
    selection: (() => {
      const selection = checkedRecord(input.selection, 'workflow input selection');
      return {
        team: checkedString(selection.team, 'workflow selection team'),
        kind: checkedWorkItemKind(selection.kind),
        intent: checkedFlowIntent(selection.intent),
        project: checkedString(selection.project, 'workflow selection project'),
        risk_flags: checkedStringArray(selection.risk_flags, 'workflow selection risk flags'),
        labels: checkedStringArray(selection.labels, 'workflow selection labels'),
      };
    })(),
    observations: (() => {
      if (!Array.isArray(input.observations)) throw Error('Workflow input observations are malformed');
      return input.observations.map(parseSessionBridgeObservation);
    })(),
  };
}

function checkedSyntheticWorkflowStep(value: unknown): SyntheticWorkflowStep {
  const step = checkedRecord(value, 'workflow snapshot step'),
    knownKeys = new Set(['status', 'payload', 'suspendPayload', 'resumePayload', 'output']);
  if (Object.keys(step).some((key) => !knownKeys.has(key))) throw Error('Workflow snapshot step has unknown fields');
  const result: SyntheticWorkflowStep = {};
  if (Object.hasOwn(step, 'status')) result.status = checkedString(step.status, 'workflow step status');
  if (Object.hasOwn(step, 'payload')) result.payload = checkedRecord(step.payload, 'workflow step payload');
  if (Object.hasOwn(step, 'output')) result.output = checkedRecord(step.output, 'workflow step output');
  if (Object.hasOwn(step, 'suspendPayload')) {
    const suspended = checkedRecord(step.suspendPayload, 'workflow suspend payload');
    if (!Array.isArray(suspended.requests)) throw Error('Workflow suspend requests are malformed');
    result.suspendPayload = { requests: suspended.requests.map(parseSessionBridgeRequest) };
  }
  if (Object.hasOwn(step, 'resumePayload')) {
    const resumed = checkedRecord(step.resumePayload, 'workflow resume payload');
    if (!Array.isArray(resumed.observations)) throw Error('Workflow resume observations are malformed');
    result.resumePayload = { observations: resumed.observations.map(parseSessionBridgeObservation) };
  }
  return result;
}

function checkedSyntheticWorkflowSnapshot(value: unknown): SyntheticWorkflowSnapshot {
  const snapshot = checkedRecord(value, 'workflow snapshot');
  if (snapshot.status !== 'suspended') throw Error('Fixture workflow snapshot is not suspended');
  const contextRecord = checkedRecord(snapshot.context, 'workflow snapshot context'),
    input = checkedSyntheticWorkflowInput(contextRecord.input),
    context: SyntheticWorkflowSnapshot['context'] = { input };
  for (const [key, entry] of Object.entries(contextRecord)) {
    if (key !== 'input') context[key] = checkedSyntheticWorkflowStep(entry);
  }
  return {
    runId: checkedString(snapshot.runId, 'workflow snapshot run id'),
    status: 'suspended',
    context,
  };
}

function checkedWorkIdentity(value: unknown): WorkIdentity {
  if (
    !isPlainRecord(value) ||
    typeof value.repository_id !== 'string' ||
    !Array.isArray(value.project_ids) ||
    !value.project_ids.every((projectId: unknown) => typeof projectId === 'string') ||
    typeof value.integrations_digest !== 'string' ||
    typeof value.work_id !== 'string'
  )
    throw Error('Recovery review returned an invalid work identity');
  const projectIds = value.project_ids.map((projectId: unknown) => {
    if (typeof projectId !== 'string') throw Error('Recovery review returned an invalid project identity');
    return projectId;
  });
  return {
    repository_id: value.repository_id,
    project_ids: projectIds,
    integrations_digest: value.integrations_digest,
    work_id: value.work_id,
  };
}

function checkedStateVersion(value: unknown): StateVersion {
  if (
    !isPlainRecord(value) ||
    typeof value.revision !== 'number' ||
    !Number.isSafeInteger(value.revision) ||
    typeof value.digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.digest)
  )
    throw Error('Recovery review returned an invalid state version');
  return { revision: value.revision, digest: value.digest };
}

function checkedSourceSnapshot(value: unknown): ScopedSourceSnapshot {
  if (
    !isPlainRecord(value) ||
    value.schema !== 'ScopedSourceSnapshot/v1' ||
    typeof value.digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.digest) ||
    !Array.isArray(value.entries)
  )
    throw Error('Recovery review returned an invalid source snapshot');
  const entries = value.entries.map((entry: unknown) => {
    if (
      !isPlainRecord(entry) ||
      typeof entry.path !== 'string' ||
      typeof entry.exists !== 'boolean' ||
      (entry.bytes !== null && (typeof entry.bytes !== 'number' || !Number.isSafeInteger(entry.bytes))) ||
      (entry.sha256 !== null && (typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)))
    )
      throw Error('Recovery review returned an invalid source entry');
    return { path: entry.path, exists: entry.exists, bytes: entry.bytes, sha256: entry.sha256 };
  });
  return { schema: 'ScopedSourceSnapshot/v1', digest: value.digest, entries };
}

function checkedRecoveryBinding(value: unknown): RecoveryReviewBinding {
  if (!isPlainRecord(value)) throw Error('Recovery review returned a malformed binding');
  const identity = checkedWorkIdentity(value.identity);
  const source = checkedSourceSnapshot(value.source);
  const expectedWork = checkedStateVersion(value.expectedWork);
  const expectedLedger = checkedStateVersion(value.expectedLedger);
  const expectedJournal = checkedStateVersion(value.expectedJournal);
  const context = checkedRecord(value.context, 'recovery context');
  if (
    typeof value.attempt !== 'number' ||
    !Number.isSafeInteger(value.attempt) ||
    typeof value.callerSession !== 'string' ||
    typeof value.controllerId !== 'string' ||
    typeof value.userInstructionRef !== 'string' ||
    typeof value.historicalOwner !== 'string' ||
    typeof value.maintenanceGeneration !== 'number' ||
    !Number.isSafeInteger(value.maintenanceGeneration)
  )
    throw Error('Recovery review returned a malformed binding');
  return {
    identity,
    attempt: value.attempt,
    callerSession: value.callerSession,
    controllerId: value.controllerId,
    userInstructionRef: value.userInstructionRef,
    historicalOwner: value.historicalOwner,
    expectedWork,
    expectedLedger,
    expectedJournal,
    maintenanceGeneration: value.maintenanceGeneration,
    source,
    context,
  };
}

type RecoveryCliResult = {
  status: OperationReservation['status'];
  request: RecoveryReviewBinding;
  operation: OperationReservation;
  native_dispatch_performed: false;
  rights_granted: false;
  runtime_acceptance: false;
};

function checkedRecoveryResult(value: unknown): RecoveryCliResult {
  const result = checkedRecord(value, 'recovery review entrypoint');
  const request = checkedRecoveryBinding(result.request);
  const operation = validateHostOperationReservation(result.operation);
  if (
    result.status !== operation.status ||
    result.native_dispatch_performed !== false ||
    result.rights_granted !== false ||
    result.runtime_acceptance !== false
  )
    throw Error('Recovery review entrypoint returned inconsistent custody');
  return {
    status: operation.status,
    request,
    operation,
    native_dispatch_performed: false,
    rights_granted: false,
    runtime_acceptance: false,
  };
}

export const run = async (args: string[], options?: ReconcileOptions): Promise<CliObject> =>
  checkedCliObject(await fixtureCall(runEntrypoint, args, options), 'run entrypoint');

export const runReconcileArtifacts = async (args: string[], options?: ReconcileOptions): Promise<CliObject> =>
  checkedCliObject(await fixtureCall(reconcileEntrypoint, args, options), 'reconcile entrypoint');

export const sha = (bytes: Parameters<ReturnType<typeof createHash>['update']>[0]): string =>
  createHash('sha256').update(bytes).digest('hex');

export const json = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';

function jsonNodeCount(value: unknown): number {
  if (Array.isArray(value)) {
    const items: readonly unknown[] = value;
    return 1 + items.reduce<number>((total, item) => total + jsonNodeCount(item), 0);
  }
  if (isPlainRecord(value)) {
    const values: readonly unknown[] = Object.values(value);
    return 1 + values.reduce<number>((total, item) => total + jsonNodeCount(item), 0);
  }
  return 1;
}

export function expectMissingFixtureContextRead(error: unknown, label: string): void {
  expect(error).toBeInstanceOf(Error);
  if (!(error instanceof Error)) throw Error('Expected a filesystem error');
  if (process.platform === 'win32') {
    expect(error.message).toBe(
      `safe repository access unavailable: ${label} fs-safe boundary rejected the target (path)`,
    );
  } else {
    expect(Reflect.get(error, 'code')).toBe('ENOENT');
    const missingPath = String(Reflect.get(error, 'path') ?? '').replaceAll('\\', '/');
    if (process.platform === 'linux')
      expect(missingPath).toMatch(/^\/proc\/self\/fd\/[1-9][0-9]*\/project-context\.md$/);
    else expect(missingPath.endsWith('/docs/project-context.md')).toBe(true);
  }
}

export function recoveryFixture({
  configuredContext = false,
  markerlessExcerpt = false,
  aggregateContext = false,
}: {
  configuredContext?: boolean;
  markerlessExcerpt?: boolean;
  aggregateContext?: boolean;
} = {}): RecoveryFixtureResult {
  const { f, request, state, configuredContexts } = historicalFixture('unknown_readonly', {
    configuredContext,
    markerlessExcerpt,
    aggregateContext,
  });
  const input: RecoveryReviewInput = {
    identity: request.identity,
    attempt: 1,
    baselinePath: 'baseline.yaml',
    callerSession: 'fixture-current-caller',
    controllerId: 'fixture-current-controller',
    userInstructionRef: 'fixture:attributable-human-recovery-review',
  };
  const call = (
    mode: 'prepare' | 'begin' | 'complete' | 'inspect',
    body: RecoveryReviewInput = input,
    extra: string[] = [],
  ): Promise<RecoveryCliResult> => {
    f.put('.tmp/recovery-input.json', json(body));
    return run([
      '--recovery-review',
      'true',
      '--mode',
      mode,
      '--project-root',
      f.root,
      '--request',
      '.tmp/recovery-input.json',
      ...extra,
    ]).then(checkedRecoveryResult);
  };
  const observation = (operation: OperationReservation, status: 'PASS' | 'FAIL' = 'PASS'): RecoveryObservation => ({
    action_id: operation.operation_key,
    caller_session: input.callerSession,
    controller_id: input.controllerId,
    status,
    // Injected fixture observation; no actual native execution or Runtime proof.
    observation: { agent_id: 'fixture:reviewer', tool_call_ref: 'fixture:native-call', result: { findings: [] } },
  });
  return { f, input, call, observation, state, configuredContexts };
}

export function fixtureOriginalContexts(state: FixtureJournal, configuredContexts: MutableConfiguredContext[]) {
  const items = [...state.completed.flatMap((wave) => wave.items), ...state.items].filter(
      (item) => item.request.configured_context_digest,
    ),
    entries = items.map((item) => {
      const context = configuredContexts.find(
        (candidate) => candidate.digest === item.request.configured_context_digest,
      );
      expect(context).toBeDefined();
      if (context === undefined) throw Error('Historical request context fixture is missing');
      return {
        action_id: item.request.action_id,
        wave_index: item.request.wave_index,
        stage_id: item.request.stage_id,
        work_id: state.work_id,
        attempt: state.attempt,
        context,
      };
    });
  return entries;
}

export type FixtureOriginalContext = ReturnType<typeof fixtureOriginalContexts>[number];

export function firstOriginalContext(contexts: readonly FixtureOriginalContext[]): FixtureOriginalContext {
  const first = contexts[0];
  if (first === undefined) throw Error('Original context fixture is empty');
  return first;
}

export function firstJournalItem(state: FixtureJournal | MastraSessionLedgerState): MastraLedgerItem {
  const first = state.items[0];
  if (first === undefined) throw Error('Fixture journal has no pending item');
  return first;
}

export function requiredJournalObservation(item: MastraLedgerItem): NonNullable<MastraLedgerItem['observation']> {
  const observation = item.observation;
  if (!observation) throw Error(`Fixture journal item ${item.request.action_id} has no observation`);
  return observation;
}

function requiredIssuedIssueId(value: string | null, label: string): string {
  if (value === null) throw Error(`${label} has no issued action reference`);
  return value;
}

function replaceFixtureJournalItem(state: FixtureJournal, actionId: string, replacement: MastraLedgerItem): void {
  let replaced = 0;
  state.items = state.items.map((item) => {
    if (item.request.action_id !== actionId) return item;
    replaced++;
    return replacement;
  });
  state.completed = state.completed.map((wave) => ({
    ...wave,
    items: wave.items.map((item) => {
      if (item.request.action_id !== actionId) return item;
      replaced++;
      return replacement;
    }),
  }));
  if (replaced !== 1) throw Error(`Fixture action ${actionId} was found ${replaced} times while updating lineage`);
}

function fixtureJournalWithInvalidItemField(
  state: FixtureJournal,
  actionId: string,
  field: 'research_activation' | 'research_normalization',
): unknown {
  const value = checkedRecord(parseFixtureJson(json(state)), 'serialized synthetic journal'),
    items = value.items;
  if (!Array.isArray(items)) throw Error('Serialized synthetic journal items are malformed');
  const itemEntries = Array.from(items, (entry: unknown) => entry);
  const rawItem = itemEntries.find((entry: unknown) => {
    if (!isPlainRecord(entry)) return false;
    const request = entry.request;
    return isPlainRecord(request) && request.action_id === actionId;
  });
  if (!isPlainRecord(rawItem)) throw Error('Synthetic journal item is missing');
  rawItem[field] = {};
  return value;
}

export function requiredWorkflow(
  config: AgentRuntimeConfig,
  workflowId: string,
): NonNullable<AgentRuntimeConfig['workflows'][string]> {
  const workflow = config.workflows[workflowId];
  if (!workflow) throw Error(`Fixture workflow ${workflowId} is missing`);
  return workflow;
}

export function requiredProfile(config: AgentRuntimeConfig, profileId: string): RuntimeAgentProfile {
  const profile = config.agents.profiles[profileId];
  if (!profile) throw Error(`Fixture profile ${profileId} is missing`);
  return profile;
}

export function withoutProducedSchema(
  config: AgentRuntimeConfig,
  workflowId: string,
  stageId: string,
  schema: string,
): AgentRuntimeConfig {
  const workflow = requiredWorkflow(config, workflowId),
    stage = workflow.stages.find((entry) => entry.id === stageId);
  if (!stage) throw Error(`Fixture stage ${stageId} is missing`);
  return {
    ...config,
    workflows: {
      ...config.workflows,
      [workflowId]: {
        ...workflow,
        stages: workflow.stages.map((entry) =>
          entry.id === stageId
            ? { ...entry, produces: entry.produces.filter((entrySchema) => entrySchema !== schema) }
            : entry,
        ),
      },
    },
  };
}

function firstConfiguredEntry(context: MutableConfiguredContext): MutableConfiguredContext['entries'][number] {
  const first = context.entries[0];
  if (first === undefined) throw Error('Configured context fixture has no entries');
  return first;
}

function mutableConfiguredContext(context: ConfiguredContext): MutableConfiguredContext {
  return {
    schema: context.schema,
    work_id: context.work_id,
    attempt: context.attempt,
    entries: context.entries.map((entry) => ({
      id: entry.id,
      kind: entry.kind,
      location: entry.location,
      title: entry.title,
      status: entry.status,
      sha256: entry.sha256,
      bytes: entry.bytes,
      content: entry.content,
      truncated: entry.truncated,
    })),
    digest: context.digest,
  };
}

function requiredConfiguredEntry(
  context: MutableConfiguredContext,
  entryId: string,
): MutableConfiguredContext['entries'][number] {
  const entry = context.entries.find((candidate) => candidate.id === entryId);
  if (!entry) throw Error(`Configured context fixture is missing entry ${entryId}`);
  return entry;
}

export function firstConfiguredContext(contexts: readonly MutableConfiguredContext[]): MutableConfiguredContext {
  const first = contexts[0];
  if (first === undefined) throw Error('Configured context fixture is empty');
  return first;
}

export function requiredElement<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw Error(`${label} is missing at index ${index}`);
  return value;
}

function withoutDigest<T extends { readonly digest: string }>(value: T): Omit<T, 'digest'> {
  const { digest, ...rest } = value;
  void digest;
  return rest;
}

export function requiredSourceScope(state: FixtureJournal): ScopedSourceSnapshot {
  const scope = state.source_scope;
  if (!scope) throw Error('Fixture journal has no source scope');
  return scope;
}

export function requiredWorkLease(work: WorkState): NonNullable<WorkState['lease']> {
  const lease = work.lease;
  if (!lease) throw Error('Fixture work state has no lease');
  return lease;
}

export function advanceFixtureHostSnapshot(snapshot: FixtureHostSnapshot) {
  const { work, ledger, workVersion, ledgerVersion } = snapshot;
  if (work === null || ledger === null || workVersion === null || ledgerVersion === null)
    throw Error('Fixture host state is incomplete for a CAS advance');
  return {
    expectedWork: workVersion,
    expectedLedger: ledgerVersion,
    expectedMaintenanceGeneration: snapshot.maintenanceGeneration,
    nextWork: {
      ...work,
      revision: work.revision + 1,
      lifecycle: { ...work.lifecycle, revision: work.lifecycle.revision + 1 },
    },
    nextLedger: { ...ledger, revision: ledger.revision + 1 },
  };
}

export function resignFixtureContext(context: MutableConfiguredContext): MutableConfiguredContext {
  const { digest: _digest, ...body } = context;
  return { ...body, digest: canonicalJsonDigest(body) };
}

export function fixture({
  sourceMode = false,
  extraProject = false,
}: { sourceMode?: boolean; extraProject?: boolean } = {}): RuntimeFixture {
  const fixtureRoot = process.env.VIDA_CONFIG_REBIND_FIXTURE_ROOT ?? tmpdir();
  const root = mkdtempSync(path.join(fixtureRoot, 'fixture-'));
  fixtureRoots.push(root);
  const put = (relative: string, bytes: string | Uint8Array): void => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  };
  mkdirSync(path.join(root, '.git'));
  const bundle = sourceMode ? 'packages/agent' : 'vida-agent';
  const projectId = sourceMode ? 'agent' : 'fixture-project';
  const template = (name: string): string =>
    readFileSync(path.join(source, 'templates', name), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'fixture-repository')
      .replaceAll('{{PROJECTS}}', projectId)
      .replaceAll('{{PROJECT}}', projectId)
      .replaceAll('{{BUNDLE}}', bundle)
      .replaceAll('{{CREATED_AT}}', '2026-09-30T00:00:00.000Z');
  put('AGENTS.md', template('AGENTS.template.md'));
  put('AGENT.sidecar.md', template('AGENT.sidecar.template.md'));
  put('agent-runtime.config.v1.yaml', template('agent-runtime.config.template.v1.yaml'));
  put('docs/agent-instructions/documentation-policy.v1.json', template('documentation-policy.template.v1.json'));
  for (const file of ['package.json', 'TESTING.md']) put(bundle + '/' + file, readFileSync(path.join(source, file)));
  if (sourceMode) {
    put('package.json', json({ private: true, workspaces: [bundle] }));
    const values = parseRuntimeConfigYaml(
      readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8').replaceAll('src/**', 'packages/agent/**'),
    );
    if (!values.projects.some((project) => project.project_id === projectId))
      throw Error('Fixture Source project is missing');
    const sourceConfig: AgentRuntimeConfig = {
      ...values,
      projects: values.projects.map((project) =>
        project.project_id === projectId ? { ...project, project_root: bundle } : project,
      ),
    };
    put('agent-runtime.config.v1.yaml', stringifyYaml(sourceConfig));
    for (const file of runtimeExecutableInventory(source))
      put(bundle + '/' + file, readFileSync(path.join(source, file)));
  }
  put(
    'agent-runtime.config.v1.yaml',
    readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8').replace(
      /(    executor:\r?\n      model: )[^\r\n]+(\r?\n      reasoning: )[^\r\n]+/,
      '$1gpt-6-sol$2high',
    ),
  );
  if (!sourceMode) cpSync(path.join(source, 'schemas'), path.join(root, bundle, 'schemas'), { recursive: true });
  if (extraProject) {
    const values = parseRuntimeConfigYaml(readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8')),
      originalProject = values.projects[0],
      defaultTeam = values.teams['default-development'];
    if (originalProject === undefined) throw Error('Fixture config has no project to clone');
    if (defaultTeam === undefined) throw Error('Fixture default development team is missing');
    const expanded: AgentRuntimeConfig = {
      ...values,
      repository: {
        ...values.repository,
        code_selectors: [...values.repository.code_selectors, 'packages/plugin/**'],
      },
      projects: [
        ...values.projects,
        {
          ...originalProject,
          project_id: 'plugin',
          title: 'plugin',
          project_root: 'packages/plugin',
          code_selectors: ['packages/plugin/**'],
          delivery_group: 'plugin',
        },
      ],
      integrations: {
        ...values.integrations,
        providers: [
          ...values.integrations.providers,
          {
            id: 'fixture-plugin',
            provider: 'local',
            project_id: 'plugin',
            tenant_id: 'local',
            namespace: 'plugin',
          },
        ],
      },
      teams: {
        ...values.teams,
        'default-development': {
          ...defaultTeam,
          allowed_projects: [...defaultTeam.allowed_projects, 'plugin'],
        },
      },
    };
    put('packages/plugin/.keep', 'fixture project');
    put('agent-runtime.config.v1.yaml', stringifyYaml(expanded));
  }
  const config = loadRuntimeConfig(root),
    workspace = deriveWorkspaceId(config.repository.repository_id, root);
  const schemaSha = sha(readFileSync(path.join(root, bundle, 'schemas/runtime-initialization.v1.schema.json')));
  const receipt: MutableFixture<RuntimeInitializationReceipt> = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((p) => p.project_id).sort(),
    integrations_digest: canonicalJsonDigest(config.integrations),
    workspace_id: workspace,
    workspace_binding_status: 'bound',
    bundle,
    config_digest: runtimeConfigDigest(config),
    schema_sha256: schemaSha,
    templates: (
      [
        ['AGENTS.template.md', 'AGENTS.md'],
        ['AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
        ['agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
        ['documentation-policy.template.v1.json', 'docs/agent-instructions/documentation-policy.v1.json'],
      ] satisfies readonly (readonly [string, string])[]
    ).map(([name, output]) => ({
      template: 'templates/' + name,
      template_sha256: sha(Buffer.from(name)),
      output,
      output_sha256: sha(Buffer.from(name)),
    })),
    created_at: '2026-09-30T00:00:00.000Z',
  };
  put('.agent/runtime-initialization.v1.json', json(receipt));
  if (!sourceMode)
    put(
      '.agent/active-runtime-selector.v1.json',
      json({
        schema: 'ActiveRuntimeSelector/v1',
        generation: 'fixture-v10',
        runtime: 'vida-agent',
        bundle_root: 'vida-agent',
        config_path: 'agent-runtime.config.v1.yaml',
        payload_manifest_sha256: sha(Buffer.from('fixture-payload')),
      }),
    );
  const oldYaml = readFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'utf8');
  const target = oldYaml.replace(
    /(    executor:\r?\n      model: )gpt-6-sol(\r?\n      reasoning: )high/,
    sourceMode ? '$1gpt-6-luna$2max' : '$1gpt-6.1-sol$2medium',
  );
  expect(target).not.toBe(oldYaml);
  put('proposed.yaml', target);
  mkdirSync(path.join(root, '.agent/work'), { recursive: true });
  const databasePath = path.join(root, '.agent/work/session-handoff.v1.sqlite');
  fixtureDatabasePaths.set(root, databasePath);
  const db = new Database(databasePath, { create: true });
  new HostStateStore(db, workspace);
  db.exec(
    'CREATE TABLE agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt))',
  );
  db.close();
  const args = (mode: string): string[] => [
    '--kind',
    'runtime-config',
    '--mode',
    mode,
    '--project-root',
    root,
    '--repair-id',
    'fixture-rebind',
    ...(['inspect', 'plan'].includes(mode)
      ? [
          '--actor',
          'actual-test-operator',
          '--timestamp',
          '2026-09-30T00:00:00.000Z',
          '--instruction-ref',
          'TEST SETUP: requested executor profile',
          '--target-config',
          'proposed.yaml',
        ]
      : []),
  ];
  return { root, put, args, target, oldYaml, receipt, workspace, bundle };
}

export function deliveryFixture() {
  const f = fixture({ sourceMode: true });
  f.put('accepted-baseline.yaml', f.oldYaml);
  f.put('agent-runtime.config.v1.yaml', f.target);
  const args = (mode: string): string[] => {
    const values = f.args(mode);
    values[1] = 'runtime-config-delivery';
    if (['inspect', 'plan'].includes(mode)) {
      values[values.indexOf('--target-config') + 1] = 'agent-runtime.config.v1.yaml';
      values.push('--baseline-config', 'accepted-baseline.yaml');
    }
    return values;
  };
  return { ...f, deliveryArgs: args };
}

export function withoutPrewriterTemplateDelta(config: AgentRuntimeConfig): AgentRuntimeConfig {
  if (config.agents.role_instructions['security-prewriter'] === undefined) return config;
  const team = config.teams['default-development'];
  if (team === undefined) throw Error('Fixture default development team is missing');
  const {
    ['source-planner']: sourcePlannerInstruction,
    ['security-prewriter']: securityPrewriterInstruction,
    ...roleInstructions
  } = config.agents.role_instructions;
  const {
    ['source-planner']: sourcePlannerRole,
    ['security-prewriter']: securityPrewriterRole,
    ...teamRoles
  } = team.roles;
  const { ['LifecyclePreparationObservation/v1']: preparationContract, ...artifactContracts } =
    config.artifact_contracts;
  void sourcePlannerInstruction;
  void securityPrewriterInstruction;
  void sourcePlannerRole;
  void securityPrewriterRole;
  void preparationContract;
  const withoutPrewriteStage = (
    workflow: NonNullable<AgentRuntimeConfig['workflows'][string]>,
    developerId: string,
  ): NonNullable<AgentRuntimeConfig['workflows'][string]> => {
    const stages = workflow.stages.filter((stage) => stage.id !== 'review_source_prewrite'),
      developer = stages.find((stage) => stage.id === developerId);
    if (developer === undefined) throw Error(`Fixture stage ${developerId} is missing`);
    const edge: (typeof workflow.edges)[number] = ['synthesize_task', developerId];
    return {
      ...workflow,
      stages: stages.map((stage) =>
        stage.id === developerId ? { ...stage, required_after: ['synthesize_task'] } : stage,
      ),
      edges: [...workflow.edges.filter((candidate) => !candidate.includes('review_source_prewrite')), edge],
    };
  };
  const implementationNew = config.workflows.implementation_new,
    implementationChange = config.workflows.implementation_change,
    bugFix = config.workflows.bug_fix,
    taskExecution = config.workflows.task_execution;
  if (
    implementationNew === undefined ||
    implementationChange === undefined ||
    bugFix === undefined ||
    taskExecution === undefined
  )
    throw Error('Fixture workflow set is incomplete');
  return {
    ...config,
    agents: { ...config.agents, role_instructions: roleInstructions },
    teams: { ...config.teams, 'default-development': { ...team, roles: teamRoles } },
    artifact_contracts: artifactContracts,
    workflows: {
      ...config.workflows,
      implementation_new: withoutPrewriteStage(implementationNew, 'develop_change'),
      implementation_change: withoutPrewriteStage(implementationChange, 'develop_change'),
      bug_fix: withoutPrewriteStage(bugFix, 'develop_fix'),
      task_execution: withoutPrewriteStage(taskExecution, 'develop_task'),
    },
  };
}

export function withAgentProfileChange(
  config: AgentRuntimeConfig,
  profileId: string,
  change: Partial<RuntimeAgentProfileChange>,
): AgentRuntimeConfig {
  const profile = config.agents.profiles[profileId];
  if (profile === undefined) throw Error(`Fixture agent profile ${profileId} is missing`);
  return {
    ...config,
    agents: {
      ...config.agents,
      profiles: {
        ...config.agents.profiles,
        [profileId]: { ...profile, ...change },
      },
    },
  };
}

export function withProjectTitle(config: AgentRuntimeConfig, projectIndex: number, title: string): AgentRuntimeConfig {
  if (config.projects[projectIndex] === undefined) throw Error(`Fixture project ${projectIndex} is missing`);
  return {
    ...config,
    projects: config.projects.map((project, index) => (index === projectIndex ? { ...project, title } : project)),
  };
}

export function withoutLastProject(config: AgentRuntimeConfig): AgentRuntimeConfig {
  if (config.projects.length === 0) throw Error('Fixture config has no project to remove');
  return { ...config, projects: config.projects.slice(0, -1) };
}

export function withWorkflowStageAssignments(
  config: AgentRuntimeConfig,
  workflowId: string,
  stageId: string,
  assignments: RuntimeWorkflowAssignments,
): AgentRuntimeConfig {
  const workflow = config.workflows[workflowId];
  if (workflow === undefined) throw Error(`Fixture workflow ${workflowId} is missing`);
  if (!workflow.stages.some((stage) => stage.id === stageId)) throw Error(`Fixture stage ${stageId} is missing`);
  return {
    ...config,
    workflows: {
      ...config.workflows,
      [workflowId]: {
        ...workflow,
        stages: workflow.stages.map((stage) => (stage.id === stageId ? { ...stage, assignments } : stage)),
      },
    },
  };
}

export function sourceCorrectionFixture(): SourceCorrectionFixtureResult {
  const { f, request, state, configuredContexts } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  seedKnownTerminalSynthesisCustody(f, request, state);
  f.put('accepted-baseline.yaml', f.oldYaml);
  f.put('agent-runtime.config.v1.yaml', f.target);
  const deliveryArgs = (mode: string): string[] => {
      const args = f.args(mode);
      args[args.indexOf('--kind') + 1] = 'runtime-config-delivery';
      if (['inspect', 'plan'].includes(mode)) {
        args[args.indexOf('--target-config') + 1] = 'agent-runtime.config.v1.yaml';
        args.push('--baseline-config', 'accepted-baseline.yaml');
      }
      return args;
    },
    sourceBeforeimagesPath = path.join(f.root, '.tmp/original-source-beforeimages.json'),
    priorSystemUpdatePath = path.join(f.root, '.tmp/prior-system-update.json'),
    changedPath = 'packages/agent/bin/runtime-config-rebind.ts';
  const sourceManifestPath = 'packages/agent/package.json',
    authorizedPaths = [changedPath, sourceManifestPath].sort();
  const repairArgs = (mode: string): string[] => [
    '--kind',
    'runtime-config-delivery',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--repair-id',
    'fixture-rebind',
    ...(mode === 'repair-inspect' || mode === 'repair-plan'
      ? [
          '--source-beforeimages',
          sourceBeforeimagesPath,
          '--authorized-paths',
          JSON.stringify(authorizedPaths),
          '--prior-system-update',
          priorSystemUpdatePath,
        ]
      : []),
  ];
  return {
    f,
    request,
    state,
    configuredContexts,
    deliveryArgs,
    repairArgs,
    sourceBeforeimagesPath,
    priorSystemUpdatePath,
    changedPath,
    sourceManifestPath,
    authorizedPaths,
    targetVersion: sourceCorrectionNextVersion(sourceCorrectionPriorVersion),
  };
}

export function applySourceCorrectionBatch(
  f: RuntimeFixture,
  changedPath: string,
  sourceManifestPath: string,
  targetVersion: string,
): void {
  const manifestPath = path.join(f.root, sourceManifestPath),
    manifest = checkedRecord(parseFixtureJson(readFileSync(manifestPath, 'utf8')), 'source package manifest');
  manifest.version = targetVersion;
  f.put(sourceManifestPath, json(manifest));
  f.put(changedPath, readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// scoped source repair fixture\n');
}

export async function sourceCorrectionRebindWithNative(
  runtime: StandaloneRuntime,
): Promise<SourceCorrectionRebindRunner> {
  if (sourceCorrectionNativeRuntime.previousPath === undefined) {
    const originalPath = process.env.PATH;
    sourceCorrectionNativeRuntime.previousPath = originalPath === undefined ? null : originalPath;
    process.env.PATH = [path.dirname(runtime.executable), originalPath ?? ''].filter(Boolean).join(path.delimiter);
  }
  const bunPath = new URL('../../bin/bun.ts', import.meta.url).href;
  if (!sourceCorrectionNativeRuntime.mocked) {
    const original = await import('../../bin/bun.ts');
    const originalStandaloneRuntime = original.standaloneRuntime;
    let resolvingOriginal = false;
    await mock.module(bunPath, () => ({
      ...original,
      standaloneRuntime: (env: Parameters<typeof original.standaloneRuntime>[0]) => {
        const runtime = sourceCorrectionNativeRuntime.value;
        if (runtime !== null) return runtime;
        if (resolvingOriginal) throw Error('Source correction native mock fallback is recursive');
        resolvingOriginal = true;
        try {
          return originalStandaloneRuntime(env);
        } finally {
          resolvingOriginal = false;
        }
      },
    }));
    sourceCorrectionNativeRuntime.mocked = true;
  }
  sourceCorrectionNativeRuntime.value = runtime;
  const modulePath = new URL('../../bin/runtime-config-rebind.ts', import.meta.url).href;
  const loaded: unknown = await import(`${modulePath}?source-correction-test=${randomUUID()}`);
  if (!isSourceCorrectionRebindRunner(loaded)) throw Error('Source correction rebind entrypoint is unavailable');
  return loaded;
}

export function sourceCorrectionNativeFixture(
  f: RuntimeFixture,
  version: string,
  executableBytes = Buffer.from('synthetic native executable for consistency test'),
) {
  const pin = readPin(),
    payloadId = sha(Buffer.from(randomUUID())),
    packageRelative = `.tmp/native-test/${version}-${payloadId}`,
    executableRelative = `${packageRelative}/vida-agent.exe`,
    executable = path.join(f.root, executableRelative),
    runtimeRoot = path.join(f.root, packageRelative);
  f.put(
    `${packageRelative}/package.json`,
    json({
      name: 'vida-agent',
      version,
      packageManager: `bun@${pin}`,
      engines: { bun: pin },
    }),
  );
  f.put(`${packageRelative}/.bun-version`, `${pin}\n`);
  f.put(executableRelative, executableBytes);
  return {
    runtime: { root: runtimeRoot, executable },
    executableRelative,
    executableBytes,
    payloadId,
    pin,
  };
}

export function sourceCorrectionExternalReport(
  f: RuntimeFixture,
  request: SourceCorrectionReportRequest,
  native: ReturnType<typeof sourceCorrectionNativeFixture>,
) {
  const target = `bun-${process.platform.replace('win32', 'windows')}-${process.arch}`,
    asset = {
      file: `vida-agent-${target}${process.platform === 'win32' ? '.exe' : ''}`,
      bytes: native.executableBytes.length,
      sha256: sha(native.executableBytes),
    },
    manifest = {
      schema: 'VidaStandaloneBuild/v1',
      version: request.new_source_manifest.version,
      pin: native.pin,
      target,
      inputs: request.new_source.entries
        .map((entry) => ({
          path: entry.path.slice('packages/agent/'.length),
          bytes: entry.bytes,
          sha256: entry.sha256,
        }))
        .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)),
      payloadId: native.payloadId,
      asset,
    },
    manifestSha = sha(Buffer.from(json(manifest))),
    result = {
      schema: 'VidaCIDeliveryResult/v1',
      request_id: request.request_id,
      operation_id: request.publish_operation_id,
      version: manifest.version,
      repository_id: request.repository_id,
      project_ids: request.source_project_ids,
      target,
      source_binding: request.new_source.digest,
      archive_sha256: sha(Buffer.from('synthetic-source-archive')),
      manifest_sha256: manifestSha,
      payload_id: manifest.payloadId,
      asset,
      issuer: 'synthetic-test-only',
      run_id: '50000123456',
      run_attempt: 1,
      checks: [{ id: 'native-build', status: 'passed' }],
    },
    checks = [{ id: 'native-build', status: 'passed' }],
    executablePath = native.runtime.executable,
    sourcePath = native.executableRelative;
  const report = {
    schema: 'RuntimeConfigSourceCorrectionReport/v1',
    request_id: request.request_id,
    operation_id: request.operation_id,
    publish_operation_id: request.publish_operation_id,
    original_operation_sha256: request.original_operation.sha256,
    original_plan_digest: request.original_operation.plan_digest,
    source_snapshot_digest: request.new_source.digest,
    build_manifest_sha256: manifestSha,
    build_manifest: manifest,
    ci_delivery: {
      schema: 'RuntimeConfigSourceCorrectionCIDelivery/v1',
      profile: 'native-build',
      request_id: request.request_id,
      operation_id: request.publish_operation_id,
      source_binding: request.new_source.digest,
      run_id: result.run_id,
      run_attempt: result.run_attempt,
      artifact_id: '12001',
      result_sha256: sha(Buffer.from(json(result))),
      checks,
      conclusion: 'success',
      result,
    },
    installation_receipt: {
      installer: 'synthetic-test-only',
      action: 'update',
      exit_code: 0,
      signal: null,
      source_path: sourcePath,
      source_sha256: asset.sha256,
      prior_bytes: request.prior_system_update.installed_bytes,
      selected_bytes: native.executableBytes.length,
      path: executablePath,
      sha256: sha(native.executableBytes),
      path_added: false,
      tests_invoked: false,
      reinstallation: false,
    },
    effective_path: {
      command_path: executablePath,
      bytes: native.executableBytes.length,
      sha256: sha(native.executableBytes),
      package_name: 'vida-agent',
      version: manifest.version,
      target,
    },
  };
  return report;
}

export async function prepareSourceCorrectionRepair(
  rebind: SourceCorrectionRebindRunner,
  fixtureContext: SourceCorrectionFixtureContext = sourceCorrectionFixture(),
) {
  const runRebind = async (args: string[]): Promise<CliObject> =>
    checkedCliObject(
      await fixtureCall((fixtureArgs) => rebind.runRuntimeConfigRebind(fixtureArgs), args),
      'runtime config rebind fixture',
    );
  const { f, deliveryArgs, repairArgs, changedPath } = fixtureContext,
    originalPlan = await runRebind(deliveryArgs('plan')),
    packageRoot = path.join(f.root, 'packages/agent'),
    inventory = runtimeExecutableInventory(packageRoot, 'source', requireSafeRepositoryAccess(packageRoot)),
    access = requireSafeRepositoryAccess(f.root),
    sourceSnapshot = snapshotDeclaredSources(
      access,
      inventory.map((file) => `packages/agent/${file}`),
    ),
    priorUpdate = {
      status: 'CURRENT_SYSTEM_BOOKKEEPING_UNKNOWN_UPDATED',
      operation_id: 'local-46c2f01d-8541-46ce-8e31-30e467799538',
      version: sourceCorrectionPriorVersion,
      entry: path.join(tmpdir(), 'vida-agent.exe'),
      run_id: '37579199535',
      artifact_id: '11463399267',
      installed_bytes: 133342720,
      prior_bytes: 133338624,
      delta_bytes: 4096,
      configuration_inspection: 'inspect_ready_unauthorized',
      tests_invoked: false,
      reinstallation: false,
      runtime_accepted: false,
      developer_unblocked: false,
    };
  f.put('.tmp/prior-system-update.json', json(priorUpdate));
  expect((await runRebind(deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  const operationPath = requiredCliString(originalPlan, 'operation_path', 'planned operation path');
  const operationBytes = readFileSync(path.join(f.root, operationPath)),
    beforeimage = {
      purpose: 'inactive custody only; not an active repair artifact or admission',
      operation_id: 'fixture-rebind',
      operation_ref: operationPath,
      operation_bytes_base64: operationBytes.toString('base64'),
      source: sourceSnapshot,
      beforeimages: sourceSnapshot.entries.map((entry) => ({
        path: entry.path,
        bytes_base64: access.readBytes(entry.path, 'test beforeimage').toString('base64'),
      })),
      recorded_at: '2026-10-07T00:00:00.000Z',
      effects_issued: false,
    };
  f.put('.tmp/original-source-beforeimages.json', json(beforeimage));
  applySourceCorrectionBatch(f, changedPath, fixtureContext.sourceManifestPath, fixtureContext.targetVersion);
  expect(
    (
      await runRebind([
        ...repairArgs('repair-plan'),
        ...(fixtureContext.publicationOperationId
          ? ['--publish-operation', fixtureContext.publicationOperationId]
          : []),
      ])
    ).status,
  ).toBe('planned');
  return {
    f,
    deliveryArgs,
    repairArgs,
    changedPath,
    sourceManifestPath: fixtureContext.sourceManifestPath,
    authorizedPaths: fixtureContext.authorizedPaths,
    targetVersion: fixtureContext.targetVersion,
    sidecarPath: path.join(f.root, '.agent/work/fixture-rebind/runtime-config-source-correction-repair.v1.json'),
  };
}

export function withDatabase<TResult>(
  f: RuntimeFixture,
  callback: (db: Database) => TResult,
  readonly = false,
): TResult {
  const db = new Database(
    path.join(f.root, '.agent/work/session-handoff.v1.sqlite'),
    readonly ? { readonly: true, strict: true } : { create: true, strict: true },
  );
  try {
    return withWorkspaceDatabaseClose(
      db,
      () => callback(db),
      closeNativeWorkspaceDatabase,
      'Database fixture callback and cleanup failed',
    );
  } catch (error) {
    failedFixtureRoots.add(f.root);
    throw error;
  }
}

export function databaseState(f: RuntimeFixture): FixtureDatabaseState {
  return withDatabase(
    f,
    (db) => {
      const state = Object.fromEntries(
        db
          .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
          .all()
          .map((value) => {
            const { name } = checkedSqliteRow(value, 'sqlite_master table listing');
            if (typeof name !== 'string') throw Error('sqlite_master table name is malformed');
            const rows = db
              .query<Record<string, unknown>, []>(`SELECT * FROM ${name} ORDER BY rowid`)
              .all()
              .map((row) => checkedSqliteRow(row, `${name} row`));
            return [name, rows];
          }),
      );
      const hostState = state.agent_host_state;
      const sessionLedger = state.agent_host_mastra_session_ledger;
      const governance = state.agent_host_governance;
      if (!Array.isArray(hostState) || !Array.isArray(sessionLedger) || !Array.isArray(governance))
        throw Error('Fixture database is missing a required Host state table');
      return {
        ...state,
        agent_host_state: hostState,
        agent_host_mastra_session_ledger: sessionLedger,
        agent_host_governance: governance,
      };
    },
    true,
  );
}

export function fence(f: RuntimeFixture) {
  return withDatabase(f, (db) => new HostStateStore(db, f.workspace).readMaintenanceFence());
}

export function seedState(
  f: RuntimeFixture,
  {
    lease = false,
    effect = null,
    ticketStatus = null,
    activeClaim = false,
    issued = false,
    native = false,
  }: SeedStateOptions = {},
) {
  if (lease) ticketStatus = 'active';
  activeClaim ||= ticketStatus === 'active';
  const config = loadRuntimeConfig(f.root),
    digest = canonicalJsonDigest('fixture-binding');
  const identity = {
    repository_id: config.repository.repository_id,
    project_ids: f.receipt.project_ids,
    integrations_digest: loadProjectSetContext(f.root, config, config.repository.repository_id, f.receipt.project_ids)
      .integrations_digest,
    work_id: 'old-suspended-work',
  };
  const { work_id: lifecycleWorkId, ...bindingIdentity } = identity;
  const binding = {
    ...bindingIdentity,
    team_id: 'default-development',
    workflow_id: 'implementation_change',
    provider_work_item_id: 'fixture-work',
    lifecycle_work_id: lifecycleWorkId,
    work_item_digest: digest,
    work_source_revision: 'fixture-source',
    scope_id: 'fixture-scope',
    scope_contract_digest: digest,
    acceptance_manifest_digest: digest,
    ac_ids: ['AC-1'],
    implementation_paths: ['vida-agent/src/fixture.ts'],
    allowed_resources: ['file:vida-agent/src/fixture.ts'],
    config_digest: f.receipt.config_digest,
    runtime_source_revision: 'fixture-runtime',
    schema_digest: digest,
    runtime_code_digest: digest,
  };
  const workLease = { ticket_id: 'fixture-ticket', thread_id: 'fixture-thread', generation: 1 };
  const attempts: MutableFixture<WorkState['execution']['assignment_attempts']> = effect
    ? [
        {
          assignment_id: digest,
          attempt_id: digest,
          previous_attempt_id: null,
          request_digest: digest,
          stage_id: 'implementation',
          assignment_index: 0,
          correction_generation: 0,
          correction_authorization: null,
          lease: workLease,
          status: effect,
          result: null,
          result_digest: null,
          reconciliation: null,
        },
      ]
    : [];
  const work: WorkState = {
    schema: 'WorkState/v1',
    workspace_id: f.workspace,
    revision: 1,
    binding,
    contracts: {
      scope: { schema: 'ImplementationScope/v1', path: '.agent/scope.json', sha256: digest },
      acceptance: { schema: 'AcceptanceManifest/v1', path: '.agent/acceptance.json', sha256: digest },
      decisions: [],
    },
    lease: lease ? workLease : null,
    execution: {
      run_id: 'fixture-run',
      input_digest: digest,
      phase: 'implementation',
      status: 'suspended',
      assignment_attempts: attempts,
    },
    lifecycle: {
      schema: 'LifecycleState/v1',
      revision: 1,
      phase: 'INTAKE',
      source_revision: binding.work_source_revision,
      next_action: 'Trace the accepted work request.',
      route: 'R3',
      risk: 'high',
      change_kind: 'migration',
      config_binding: { config_digest: binding.config_digest, schema_digest: digest, runtime_code_digest: digest },
      scope: {
        scope_id: binding.scope_id,
        allowed_paths: binding.implementation_paths,
        fingerprint_paths: binding.implementation_paths,
        implementation_paths: binding.implementation_paths,
        documentation_paths: [],
      },
      seal: null,
      assurance: {
        epoch: 'fixture-epoch',
        review_generation: 0,
        correction_count: 0,
        review_failure_count: 0,
        delivery_cycle_id: null,
      },
      references: [],
    },
    artifacts: [],
  };
  if (effect) {
    const attempt = requiredElement(attempts, 0, 'effect fixture assignment attempt');
    attempt.assignment_id = canonicalJsonDigest({
      binding,
      run_id: work.execution.run_id,
      input_digest: work.execution.input_digest,
      stage_id: attempt.stage_id,
      assignment_index: 0,
    });
    attempt.attempt_id = canonicalJsonDigest({
      assignment_id: attempt.assignment_id,
      request_digest: digest,
      lease: workLease,
      previous_attempt_id: null,
    });
  }
  const now = '2026-09-30T00:00:00.000Z',
    expires = '2099-09-30T00:00:00.000Z';
  const resources = binding.allowed_resources;
  const claim: CoordinationLedger['claims'][number] = {
    schema: 'WorkstreamClaim/v1',
    claim_id: 'fixture-claim',
    ticket_id: workLease.ticket_id,
    work_id: identity.work_id,
    thread_id: workLease.thread_id,
    generation: 1,
    resources,
    lease_expires_at: expires,
    status: 'active',
    created_at: now,
    renewed_at: now,
  };
  const ticket: CoordinationLedger['tickets'][number] = {
    schema: 'CoordinationTicket/v1',
    ...identity,
    ticket_id: workLease.ticket_id,
    thread_id: workLease.thread_id,
    source_revision: binding.work_source_revision,
    generation: 1,
    sequence: 1,
    contour_keys: [
      `repository:${identity.repository_id}`,
      ...identity.project_ids.map((id) => `project:${id}`),
      ...resources,
    ],
    exclusive_resources: resources,
    status: ticketStatus ?? (activeClaim ? 'ready_for_handoff' : 'released'),
    claim_ids: activeClaim ? [claim.claim_id] : [],
    expires_at: activeClaim ? expires : null,
    active_resources: activeClaim ? resources : [],
    blocked_resources: ticketStatus === 'queued' && !activeClaim ? resources : [],
    created_at: now,
  };
  const ledger: CoordinationLedger = {
    schema: 'CoordinationLedger/v1',
    workspace_id: f.workspace,
    revision: 1,
    open_generation: 1,
    next_sequence: 2,
    tickets: ticketStatus || activeClaim ? [ticket] : [],
    claims: activeClaim ? [claim] : [],
    notices: [],
    dispositions: [],
    contours: [],
    batches: [],
    rebinds: [],
    operations: [],
    retirements: [],
  };
  const ajv = new Ajv2020({ allErrors: true });
  const schemaCases: readonly [string, unknown][] = [
    ['work-state', work],
    ['coordination-ledger', ledger],
  ];
  for (const [name, value] of schemaCases) {
    const schema = checkedRecord(
      parseFixtureJson(readFileSync(path.join(f.root, `${f.bundle}/schemas/${name}.v1.schema.json`), 'utf8')),
      `fixture ${name} schema`,
    );
    const validate = ajv.compile(schema);
    if (!validate(value)) throw Error(`fixture ${name} invalid: ${JSON.stringify(validate.errors)}`);
  }
  withDatabase(f, (db) => {
    const insert = db.query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)');
    insert.run(
      f.workspace,
      'work',
      JSON.stringify([identity.repository_id, identity.project_ids, identity.integrations_digest, identity.work_id]),
      1,
      json(work),
      canonicalJsonDigest(work),
    );
    insert.run(f.workspace, 'ledger', 'shared', 1, json(ledger), canonicalJsonDigest(ledger));
    if (native) {
      const request = parseSessionBridgeRequest({
        schema: 'VidaSessionRequest/v1',
        run_id: 'fixture-run',
        workflow_id: binding.workflow_id,
        wave_index: 0,
        action_id: digest,
        assignment_index: 0,
        stage_id: 'implementation',
        role: 'executor',
        config_digest: binding.config_digest,
        scope_digest: digest,
        bindings_manifest_ref: digest,
      });
      const state: FixtureJournal = {
        schema: 'MastraSessionLedger/v1',
        workspace_id: f.workspace,
        work_id: identity.work_id,
        attempt: 1,
        run_id: request.run_id,
        step_id: 'implementation',
        items: [{ request, issue_id: issued ? randomUUID() : null, observation: null }],
        completed: [],
      };
      db.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
        f.workspace,
        identity.work_id,
        1,
        1,
        json(state),
        canonicalJsonDigest(state),
      );
      const resumed = new MastraSessionLedger(
        db,
        f.workspace,
        config,
        f.root,
        new HostStateStore(db, f.workspace),
      ).resume(identity.work_id, 1);
      if (resumed === null) throw Error('Persisted fixture ledger could not be resumed');
      expect(resumed.state).toEqual(state);
    }
    const snapshot = new HostStateStore(db, f.workspace).readHostStateSnapshot(identity);
    expect(snapshot.work).toEqual(work);
    expect(snapshot.ledger).toEqual(ledger);
  });
  return { work, identity };
}

function fixtureAssignmentRequest(
  f: RuntimeFixture,
  identity: WorkIdentity,
  config: AgentRuntimeConfig,
  selection: WorkItemSelection,
  request: SessionBridgeRequest,
  work: WorkState,
  lease: NonNullable<WorkState['lease']>,
): WorkflowAssignmentRequest {
  return {
    repositoryRoot: f.root,
    configDigest: runtimeConfigDigest(config),
    teamId: selection.team,
    workflowId: request.workflow_id,
    stageId: request.stage_id,
    assignmentIndex: request.assignment_index,
    workItemId: identity.work_id,
    workItemDigest: work.binding.work_item_digest,
    workContextDigest: canonicalJsonDigest({ binding: work.binding, permit: lease }),
    input: request,
  };
}

function persistedFixtureReservationData(
  f: RuntimeFixture,
  db: Database,
  identity: WorkIdentity,
  config: AgentRuntimeConfig,
  selection: WorkItemSelection,
  request: SessionBridgeRequest,
  existingReceipt?: ReturnType<HostStateStore['claimWorkflowAttempt']>,
): WorkflowSessionReservation {
  const store = new HostStateStore(db, f.workspace),
    initial = store.readHostStateSnapshot(identity);
  if (!initial.work || !initial.workVersion || !initial.ledger || !initial.ledgerVersion)
    throw Error('Reservation fixture requires a complete current Host snapshot');
  const initialWork = initial.work,
    lease = initialWork.lease;
  if (!lease) throw Error('Reservation fixture requires the active fixture lease');
  const workflow = requiredWorkflow(config, request.workflow_id),
    stage = workflow.stages.find((entry) => entry.id === request.stage_id);
  if (!stage) throw Error('Reservation fixture stage is absent from the current config');
  const assignment = requiredElement(stage.assignments, request.assignment_index, 'reservation fixture assignment');
  if (assignment.role !== request.role) throw Error('Reservation fixture request role differs from current config');
  const operation = config.operations.registry.find(
      (entry) => entry.profile === config.orchestration.mastra.default_profile && entry.tool === 'runtime.read',
    ),
    profile = operation && config.agents.profiles[operation.profile],
    roleInstruction = config.agents.role_instructions[request.role];
  if (!operation || !profile || !roleInstruction) throw Error('Reservation fixture invocation config is incomplete');
  const project = loadProjectSetContext(f.root, config, identity.repository_id, identity.project_ids),
    workItem = workflowWorkItemSchema.parse({
      schema: 'WorkItem/v1',
      id: identity.work_id,
      provider: 'local',
      provider_type: 'Research',
      canonical_kind: selection.kind,
      intent: selection.intent,
      project_id: selection.project,
      title: 'Fixture ' + identity.work_id,
      description: 'Read-only synthetic persisted reservation fixture',
      labels: [...selection.labels],
      risk_flags: [...selection.risk_flags],
    }),
    assignmentRequest = fixtureAssignmentRequest(f, identity, config, selection, request, initialWork, lease),
    workContextDigest = assignmentRequest.workContextDigest,
    receipt =
      existingReceipt ??
      store.claimWorkflowAttempt({
        identity,
        expectedWork: initial.workVersion,
        expectedLedger: initial.ledgerVersion,
        stageId: request.stage_id,
        assignmentIndex: request.assignment_index,
        requestDigest: canonicalJsonDigest(assignmentRequest),
        lease,
      }),
    current = store.readHostStateSnapshot(identity);
  if (!current.work || !current.workVersion || !current.ledger || !current.ledgerVersion)
    throw Error('Reservation fixture claim did not retain a complete Host snapshot');
  const currentWork = current.work,
    currentLease = currentWork.lease;
  if (!currentLease) throw Error('Reservation fixture claim lost its Host lease');
  const ticket = current.ledger.tickets.find((entry) => entry.ticket_id === currentLease.ticket_id);
  if (!ticket || ticket.expires_at === null) throw Error('Reservation fixture coordination ticket is incomplete');
  const workContext: WorkExecutionContext = {
    schema: 'WorkExecutionContext/v1',
    binding: { ...currentWork.binding, project_ids: [...currentWork.binding.project_ids] },
    permit: {
      context_digest: workContextDigest,
      checkpoint_revision: currentWork.revision,
      checkpoint_digest: current.workVersion.digest,
      runtime_current_revision: 1,
      stage_id: request.stage_id,
      assignment_index: request.assignment_index,
      dispatch_authorized: false,
      lease: {
        thread_id: currentLease.thread_id,
        ticket_id: currentLease.ticket_id,
        generation: currentLease.generation,
        ledger_revision: current.ledger.revision,
        expires_at: ticket.expires_at,
        active_resources: [...ticket.active_resources],
        blocked_resources: [...ticket.blocked_resources],
      },
    },
  };
  const invocation: TrustedWorkflowAssignment = {
    operation,
    authentication: {
      schema: 'TrustedHostAuthentication/v1',
      repositoryRoot: f.root,
      repositoryId: identity.repository_id,
      projectIds: [...identity.project_ids].sort(),
      integrationsDigest: identity.integrations_digest,
      principal: 'fixture:persisted-session-data-only',
      configRevision: config.config_revision,
      permittedOperations: [],
    },
    configDigest: runtimeConfigDigest(config),
    project,
    teamId: selection.team,
    workflowId: request.workflow_id,
    stage,
    assignment,
    assignmentIndex: request.assignment_index,
    attempt: receipt.attempt,
    profile,
    roleInstruction,
    roleInstructionDigest: canonicalJsonDigest(roleInstruction),
    riskFlags: selection.risk_flags,
    workItem,
    workContext,
    input: request,
  };
  return parseWorkflowSessionReservationData({
    schema: 'WorkflowSessionReservation/v1',
    request: assignmentRequest,
    invocation,
    receipt,
    requestDigest: canonicalJsonDigest(assignmentRequest),
    approvalAction: null,
    authorization: null,
  });
}

export function seedManyReadonlyWorks(f: RuntimeFixture, count: number) {
  const { work: base } = seedState(f);
  return withDatabase(f, (db) => {
    const insert = db.query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)');
    const identities: WorkIdentity[] = [];
    db.transaction(() => {
      for (let index = 0; index < count; index++) {
        const workId = `readonly-work-${index}`;
        const scopeId = `readonly-scope-${index}`;
        const work: WorkState = {
          ...structuredClone(base),
          binding: {
            ...base.binding,
            lifecycle_work_id: workId,
            provider_work_item_id: `readonly-provider-item-${index}`,
            scope_id: scopeId,
          },
          lifecycle: { ...base.lifecycle, scope: { ...base.lifecycle.scope, scope_id: scopeId } },
          execution: { ...base.execution, run_id: `readonly-run-${index}` },
        };
        const identity = {
          repository_id: work.binding.repository_id,
          project_ids: work.binding.project_ids,
          integrations_digest: work.binding.integrations_digest,
          work_id: workId,
        };
        const key = JSON.stringify([
          identity.repository_id,
          identity.project_ids,
          identity.integrations_digest,
          identity.work_id,
        ]);
        const payload = json(work);
        insert.run(f.workspace, 'work', key, work.revision, payload, canonicalJsonDigest(work));
        identities.push(identity);
      }
    })();
    const workspace = new HostStateStore(db, f.workspace).readWorkspaceSnapshot();
    expect(workspace.work).toHaveLength(count + 1);
    expect(
      workspace.work.every(
        ({ work }) => work !== null && work.lease === null && work.execution.assignment_attempts.length === 0,
      ),
    ).toBe(true);
    const rows = db
      .query<HostStateSqlRow, [string]>('SELECT * FROM agent_host_state WHERE workspace_id=? ORDER BY payload')
      .all(f.workspace);
    const priorAggregate = {
      host: rows.map((row) => ({
        ...row,
        value: parseFixtureJson(checkedString(row.payload, 'readonly work payload')),
      })),
      mastra: [],
      governance: [],
      frozen: [],
    };
    expect(jsonNodeCount(priorAggregate)).toBeGreaterThan(10_000);
    return identities;
  });
}

export const persistedEffectDenialCases: readonly [string, SeedStateOptions, RegExp][] = [
  ['active lease with matching ownership', { lease: true }, /queued\/active ownership blocks rebind/],
  ['started assignment', { effect: 'started' }, /active\/uncertain work/],
  ['uncertain assignment', { effect: 'uncertain' }, /active\/uncertain work/],
  ['queued ticket', { ticketStatus: 'queued' }, /queued\/active ownership/],
  ['active ticket', { ticketStatus: 'active' }, /queued\/active ownership/],
  ['active claim', { activeClaim: true }, /queued\/active ownership/],
  ['issued native outcome', { native: true, issued: true }, /issued native outcome/],
];

export function seedReadonlyUnknown(
  f: RuntimeFixture,
  mutate: SyntheticStateMutation | null = null,
  {
    writer = false,
    validateFixture = true,
    hostReservation = false,
  }: {
    writer?: boolean;
    validateFixture?: boolean;
    hostReservation?: boolean;
  } = {},
) {
  const { identity } = seedState(f, { lease: hostReservation });
  const config = loadRuntimeConfig(f.root);
  const scope = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['vida-agent/TESTING.md']);
  const context: SessionHandoffContext = { work_id: identity.work_id, attempt: 1, scope_digest: scope.digest };
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: 'task',
    intent: 'implementation_change',
    project: 'agent',
    risk_flags: [],
    labels: [],
  };
  const workflow = 'implementation_change',
    run = sessionBridgeRunId(f.workspace, context, workflow);
  const waves = compileDevelopmentWorkflow(config, selection.team, workflow, selection.risk_flags).waves;
  const waveIndex = writer
    ? waves.findIndex((wave) =>
        wave.some((stage) =>
          stage.assignments.some(
            (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
          ),
        ),
      )
    : 0;
  if (waveIndex < 0) throw Error('Readonly fixture requires an actual writer wave');
  const actions = sessionActionsForWave(config, selection, context, workflow, waveIndex, []);
  const requests: SessionBridgeRequest[] = actions.map((action) =>
    buildSessionBridgeRequest({
      runId: run,
      workflowId: workflow,
      configDigest: runtimeConfigDigest(config),
      context,
      waveIndex,
      action,
      configuredContext: configuredContextForStage(f.root, config, workflow, action.stage_id, context),
      priorResults: [],
    }),
  );
  const selected = new Set(['documentation-researcher', 'code-researcher', 'platform-researcher']);
  const items: FixtureJournal['items'] = requests.map((request) => ({
    request,
    issue_id: writer || selected.has(request.role) ? randomUUID() : null,
    observation: null,
  }));
  if (!writer) expect(items.filter((item) => item.issue_id !== null)).toHaveLength(3);
  const state: FixtureJournal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: f.workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: run,
    source_scope: scope,
    step_id: `wave-${waveIndex}`,
    items,
    completed: [],
  };
  const input: SyntheticWorkflowInput = {
    ...context,
    workflow_id: workflow,
    config_digest: runtimeConfigDigest(config),
    selection,
    observations: [],
  };
  const snapshot: SyntheticWorkflowSnapshot = {
    runId: run,
    status: 'suspended',
    context: {
      input,
      [`wave-${waveIndex}`]: {
        payload: structuredClone(input),
        suspendPayload: { requests: structuredClone(requests) },
      },
    },
  };
  withDatabase(f, (db) => {
    const reservationTarget = hostReservation ? state.items.find((item) => item.issue_id !== null) : undefined;
    if (hostReservation && !reservationTarget) throw Error('Reservation fixture has no issued action');
    if (hostReservation) {
      const storedWork = readHostStateSqlRow(db, "SELECT * FROM agent_host_state WHERE kind='work'"),
        currentWork = checkedFixtureWork(parseFixtureJson(storedWork.payload), f),
        activeWork: WorkState = {
          ...currentWork,
          binding: { ...currentWork.binding, work_source_revision: scope.digest },
          execution: { ...currentWork.execution, run_id: run, status: 'active' },
          lifecycle: { ...currentWork.lifecycle, source_revision: scope.digest },
        },
        storedLedger = readHostStateSqlRow(db, "SELECT * FROM agent_host_state WHERE kind='ledger'"),
        currentLedger = checkedFixtureLedger(parseFixtureJson(storedLedger.payload)),
        activeLedger: CoordinationLedger = {
          ...currentLedger,
          tickets: currentLedger.tickets.map((ticket) => ({ ...ticket, source_revision: scope.digest })),
        };
      db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'").run(
        json(activeWork),
        canonicalJsonDigest(activeWork),
      );
      db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
        json(activeLedger),
        canonicalJsonDigest(activeLedger),
      );
    }
    const reservation = reservationTarget
      ? persistedFixtureReservationData(f, db, identity, config, selection, reservationTarget.request)
      : undefined;
    if (hostReservation) {
      if (!reservation || !reservationTarget?.issue_id)
        throw Error('Reservation fixture did not retain its issued action');
      const summary = 'Synthetic completed host result for reservation fixture';
      state.items = state.items.map((item) => {
        if (item === reservationTarget) {
          const observation = parseSessionBridgeObservation({
            schema: 'VidaSessionObservation/v1',
            action_id: item.request.action_id,
            host_attempt_id: reservation.receipt.attempt.attempt_id,
            issue_id: reservationTarget.issue_id,
            agent_id: 'fixture-' + item.request.role,
            tool_call_ref: 'fixture:' + item.request.action_id,
            status: 'reported_complete',
            summary,
            output_digest: canonicalJsonDigest(summary),
            evidence_refs: [],
          });
          new HostStateStore(db, f.workspace).completeWorkflowAttempt(reservation.receipt, observation);
          return { ...item, host_reservation: reservation, observation };
        }
        if (item.issue_id === null) return item;
        const observation = parseSessionBridgeObservation({
          schema: 'VidaSessionObservation/v1',
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          agent_id: 'fixture-' + item.request.role,
          tool_call_ref: 'fixture:' + item.request.action_id,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: [],
        });
        return { ...item, observation };
      });
    }
    let persistedState: unknown = state;
    if (mutate) {
      const replacement = mutate(state, snapshot, reservation);
      if (replacement !== undefined) persistedState = replacement;
    }
    db.query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)').run(
      f.workspace,
      identity.work_id,
      1,
      1,
      json(persistedState),
      canonicalJsonDigest(persistedState),
    );
    if (validateFixture) {
      const expectedState = parseMastraSessionLedgerState(persistedState);
      const resumed = new MastraSessionLedger(
        db,
        f.workspace,
        config,
        f.root,
        new HostStateStore(db, f.workspace),
      ).resume(identity.work_id, 1);
      if (resumed === null) throw Error('Validated fixture ledger could not be resumed');
      expect(resumed.state).toEqual(expectedState);
    }
    if (hostReservation) {
      const store = new HostStateStore(db, f.workspace),
        host = store.readHostStateSnapshot(identity),
        journal = new MastraSessionLedger(db, f.workspace, config, f.root, store).resume(identity.work_id, 1);
      if (!host.workVersion || !host.ledgerVersion || !journal)
        throw Error('Released reservation fixture requires current Host and Journal snapshots');
      suspendLocalWork({
        store,
        identity,
        journal,
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedMaintenanceGeneration: host.maintenanceGeneration,
        nativeSessionHandle: 'fixture-thread',
        userRequestPointer: 'TEST SETUP: release completed reservation before pending-Journal corruption',
        requestIntent: 'next_work',
        documentationContext: {
          repository_root: f.root,
          repository_id: identity.repository_id,
          project_id: requiredElement(identity.project_ids, 0, 'reservation fixture project id'),
          work_id: identity.work_id,
        },
      });
      const row = readSessionLedgerSqlRow(
          db,
          'SELECT workspace_id,work_id,attempt,revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          f.workspace,
          identity.work_id,
          1,
        ),
        releasedJournal = parseMastraSessionLedgerState(parseFixtureJson(row.payload)),
        pendingItems = releasedJournal.items.map((item) =>
          item.request.action_id === reservationTarget!.request.action_id ? { ...item, observation: null } : item,
        ),
        pendingState = { ...releasedJournal, items: pendingItems };
      db.query(
        'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
      ).run(
        row.revision + 1,
        json(pendingState),
        canonicalJsonDigest(pendingState),
        row.workspace_id,
        row.work_id,
        row.attempt,
        row.revision,
        row.digest,
      );
      const released = store.readHostStateSnapshot(identity);
      expect(released.work?.lease).toBeNull();
      expect(released.work?.execution.status).toBe('suspended');
      expect(released.work?.execution.assignment_attempts.every((attempt) => attempt.status === 'completed')).toBe(
        true,
      );
    }
  });
  const native = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), {
    create: true,
    strict: true,
  });
  try {
    native.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot BLOB)');
    native.query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))').run(workflow, run, json(snapshot));
    expect(
      querySqliteRow<{ type: string }>(
        native,
        'SELECT typeof(snapshot) AS type FROM mastra_workflow_snapshot',
        'snapshot type',
      ).type,
    ).toBe('blob');
  } finally {
    native.close();
  }
  return { state, snapshot };
}

export function historicalFixture(
  predicate: HistoricalPredicate,
  {
    configuredContext = false,
    markerlessExcerpt = false,
    aggregateContext = false,
    officialDocs = false,
  }: RecoveryFixtureOptions = {},
): HistoricalFixtureResult {
  const f = fixture({ sourceMode: true });
  const extraContextIds = aggregateContext ? ['aggregate-context-one', 'aggregate-context-two'] : [];
  if (predicate === 'unknown_readonly' && !officialDocs) {
    f.oldYaml = f.oldYaml.replace(/(    researcher:[\s\S]*?      egress_policy:) official_docs/, '$1 none');
    f.target = f.oldYaml.replace(
      /(    executor:\r?\n      model: )gpt-6-sol(\r?\n      reasoning: )high/,
      '$1gpt-6-luna$2max',
    );
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.receipt.config_digest = runtimeConfigDigest(loadRuntimeConfig(f.root));
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
  }
  if (predicate === 'settled_writer_failed_validators') {
    const legacyConfig = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.oldYaml)),
      legacyTarget = withAgentProfileChange(legacyConfig, 'executor', {
        model: 'gpt-6-luna',
        reasoning: 'max',
      });
    f.oldYaml = stringifyYaml(legacyConfig);
    f.target = stringifyYaml(legacyTarget);
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.receipt.config_digest = runtimeConfigDigest(legacyConfig);
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
  }
  if (configuredContext) {
    const newline = f.oldYaml.includes('\r\n') ? '\r\n' : '\n';
    const withOwnedSource = f.oldYaml.replace(
      /(    - id: project-context\r?\n      kind: local\r?\n      location: AGENT\.sidecar\.md\r?\n      title: Project-owned requirements and source map\r?\n)/,
      (_, source) =>
        source +
        `    - id: fixture-context${newline}      kind: local${newline}      location: ${fixtureContextPath}${newline}      title: Fixture-owned project context${newline}` +
        extraContextIds
          .map(
            (id) =>
              `    - id: ${id}${newline}      kind: local${newline}      location: docs/${id}.md${newline}      title: ${id}${newline}`,
          )
          .join(''),
    );
    expect(withOwnedSource).not.toBe(f.oldYaml);
    f.oldYaml = withOwnedSource;
    const pattern =
      /(^  task_execution:\r?\n[\s\S]*?^      - id: synthesize_task\r?\n        kind: synthesize\r?\n        mode: single\r?\n)/m;
    const withContext = f.oldYaml.replace(
      pattern,
      (_, stage) =>
        stage +
        `        context_source_ids:${newline}          - project-context${newline}          - fixture-context${newline}` +
        extraContextIds.map((id) => `          - ${id}${newline}`).join('') +
        `        context_skill_refs:${newline}          - .codex/skills/historical-review/SKILL.md${newline}`,
    );
    expect(withContext).not.toBe(f.oldYaml);
    f.oldYaml = withContext;
    f.target = withContext.replace(
      /(    executor:\r?\n      model: )[^\r\n]+(\r?\n      reasoning: )[^\r\n]+/,
      '$1gpt-6-luna$2max',
    );
    expect(f.target).not.toBe(withContext);
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.put(
      fixtureContextPath,
      markerlessExcerpt
        ? 'Original project context retained before suspension.\n'.repeat(400)
        : '# Fixture project context\n\nThis repository-owned local source provides additional project behavior context for the original task.\n',
    );
    for (const id of extraContextIds) f.put(`docs/${id}.md`, `# ${id}\n\nAdditional declared context.\n`);
    f.receipt.config_digest = runtimeConfigDigest(loadRuntimeConfig(f.root));
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
    f.put(
      '.codex/skills/historical-review/SKILL.md',
      '# Historical review skill\n\nUse the declared project context to verify the original task before making a recovery recommendation.\n',
    );
  }
  if (predicate === 'terminal_synthesis_unaccepted') {
    const twoResearchAssignments = `          - role: requirements-researcher\n            profile: researcher\n            contour: requirements\n          - role: documentation-researcher\n            profile: web-researcher\n            contour: documentation\n`,
      twoPredecessorWorkflow = f.oldYaml.replace(
        /(^  implementation_new:\r?\n[\s\S]*?^        assignments:\r?\n)[\s\S]*?(?=^        consumes:)/m,
        `$1${twoResearchAssignments}`,
      );
    expect(twoPredecessorWorkflow).not.toBe(f.oldYaml);
    f.oldYaml = twoPredecessorWorkflow;
    f.target = twoPredecessorWorkflow.replace(
      /(    executor:\r?\n      model: )[^\r\n]+(\r?\n      reasoning: )[^\r\n]+/,
      '$1gpt-6-luna$2max',
    );
    expect(f.target).not.toBe(twoPredecessorWorkflow);
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.receipt.config_digest = runtimeConfigDigest(loadRuntimeConfig(f.root));
    f.put('.agent/runtime-initialization.v1.json', json(f.receipt));
  }
  f.put('baseline.yaml', f.oldYaml);
  const config = loadRuntimeConfig(f.root),
    { identity } = seedState(f, { lease: true });
  const paths = [
    '.githooks/pre-commit',
    '.githooks/pre-push',
    'tests/agent/git-quality-hooks.test.ts',
    'packages/agent/tooling/git-quality-hooks.ts',
    ...(configuredContext ? [fixtureContextPath, '.codex/skills/historical-review/SKILL.md'] : []),
    ...extraContextIds.map((id) => `docs/${id}.md`),
  ].sort();
  const preimage = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), paths);
  f.put('original-scope.json', json(preimage));
  const context: SessionHandoffContext = { work_id: identity.work_id, attempt: 1, scope_digest: preimage.digest };
  const workflow = ['settled_research', 'readonly_bookkeeping'].includes(predicate)
    ? 'information_research_light'
    : predicate === 'terminal_synthesis_unaccepted'
      ? 'implementation_new'
      : 'task_execution';
  const runId = sessionBridgeRunId(f.workspace, context, workflow);
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: ['settled_research', 'readonly_bookkeeping'].includes(predicate) ? 'research' : 'task',
    intent: ['settled_research', 'readonly_bookkeeping'].includes(predicate)
      ? 'information_research'
      : 'task_execution',
    project: 'agent',
    risk_flags: [],
    labels: [],
  };
  const workItem = { id: identity.work_id };
  const intakePath = '.agent/work/' + identity.work_id + '/intake.json';
  const intake = json({
    work_item: workItem,
    runtime_code_paths: ['packages/agent/bin/run.mjs'],
    native_session_handle: 'fixture-thread',
  });
  f.put(intakePath, intake);
  withDatabase(f, (db) => {
    const workRow = readHostStateSqlRow(db, "SELECT * FROM agent_host_state WHERE kind='work'"),
      storedWork = checkedFixtureWork(parseFixtureJson(workRow.payload), f),
      work: WorkState = {
        ...storedWork,
        execution: { ...storedWork.execution, run_id: runId, status: 'active' },
        binding: {
          ...storedWork.binding,
          workflow_id: workflow,
          work_source_revision: preimage.digest,
          work_item_digest: canonicalJsonDigest(workItem),
          implementation_paths: paths,
          allowed_resources: paths.map((p) => 'file:' + p),
        },
        lifecycle: {
          ...storedWork.lifecycle,
          source_revision: preimage.digest,
          scope: {
            ...storedWork.lifecycle.scope,
            allowed_paths: paths,
            fingerprint_paths: paths,
            implementation_paths: paths,
          },
        },
        artifacts: [
          {
            artifact_id: 'local-session-intake',
            schema: 'VidaLocalSessionIntake/v1',
            path: intakePath,
            sha256: sha(Buffer.from(intake)),
            stage_id: 'local-intake',
            source_revision: preimage.digest,
            scope_id: storedWork.binding.scope_id,
            ac_ids: storedWork.binding.ac_ids,
          },
        ],
      };
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'").run(
      json(work),
      canonicalJsonDigest(work),
    );
    const ledgerRow = readHostStateSqlRow(db, "SELECT * FROM agent_host_state WHERE kind='ledger'"),
      storedLedger = checkedFixtureLedger(parseFixtureJson(ledgerRow.payload)),
      firstClaim = storedLedger.claims[0];
    if (firstClaim === undefined) throw Error('Fixture ledger has no active claim');
    const ledger: CoordinationLedger = {
      ...storedLedger,
      tickets: storedLedger.tickets.map((ticket) => ({
        ...ticket,
        source_revision: preimage.digest,
        exclusive_resources: work.binding.allowed_resources,
        active_resources: work.binding.allowed_resources,
        contour_keys: work.binding.allowed_resources,
      })),
      claims: storedLedger.claims.map((entry, index) =>
        index === 0 ? { ...entry, resources: work.binding.allowed_resources } : entry,
      ),
    };
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
  });
  let prior = parseSessionBridgeRunState({
    ...context,
    workflow_id: workflow,
    config_digest: runtimeConfigDigest(config),
    selection,
    observations: [],
  });
  const engineContext: SyntheticWorkflowSnapshot['context'] = {
      input: {
        ...context,
        workflow_id: workflow,
        config_digest: runtimeConfigDigest(config),
        selection,
        observations: [],
      },
    },
    completed: FixtureJournal['completed'] = [],
    configuredContexts: MutableConfiguredContext[] = [];
  let frontierItems: FixtureJournal['items'] = [],
    postimage = preimage;
  for (
    let waveIndex = 0;
    waveIndex <
    (predicate === 'settled_writer_failed_validators' ? 3 : predicate === 'terminal_synthesis_unaccepted' ? 2 : 1);
    waveIndex++
  ) {
    const frontier =
      waveIndex ===
      (predicate === 'settled_writer_failed_validators' ? 2 : predicate === 'terminal_synthesis_unaccepted' ? 1 : 0);
    const actions = sessionActionsForWave(config, selection, context, workflow, waveIndex, []);
    const items: FixtureJournal['items'] = actions.map((action) => {
      const loadedContext = configuredContextForStage(f.root, config, workflow, action.stage_id, context);
      let configuredContext: MutableConfiguredContext | null =
        loadedContext === null ? null : mutableConfiguredContext(loadedContext);
      if (configuredContext && markerlessExcerpt) {
        const entry = requiredConfiguredEntry(configuredContext, 'fixture-context');
        expect(entry.truncated).toBe(true);
        entry.content = readFileSync(path.join(f.root, fixtureContextPath), 'utf8').slice(0, 8192);
        configuredContext = resignFixtureContext(configuredContext);
      }
      if (configuredContext) configuredContexts.push(configuredContext);
      const request = buildSessionBridgeRequest({
        runId,
        workflowId: workflow,
        configDigest: runtimeConfigDigest(config),
        context,
        waveIndex,
        action,
        configuredContext,
        priorResults: prior.observations,
      });
      const summary =
        waveIndex === 2
          ? JSON.stringify({
              schema: 'VidaValidatorVerdict/v1',
              verdict: 'fail',
              findings: ['Fixture negative finding'],
              evidence_refs: ['local://fixture/terminal'],
            })
          : 'Synthetic terminal fixture evidence';
      const issueId = predicate === 'unissued_prepared' ? null : randomUUID(),
        hasObservation = !(
          (['unknown_readonly', 'unissued_prepared'].includes(predicate) ||
            predicate === 'terminal_synthesis_unaccepted') &&
          frontier
        );
      if (hasObservation && issueId === null)
        throw Error('Observed fixture item must carry its real issued action reference');
      let item: FixtureJournal['items'][number] = {
        request,
        issue_id: issueId,
        observation: hasObservation
          ? {
              schema: 'VidaSessionObservation/v1',
              action_id: request.action_id,
              issue_id: requiredIssuedIssueId(issueId, 'Observed fixture item'),
              agent_id: 'fixture-' + action.role,
              tool_call_ref: 'fixture:' + action.action_id,
              status: waveIndex === 2 ? 'reported_failed' : 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['local://fixture/terminal'],
            }
          : null,
      };
      if (predicate === 'settled_writer_failed_validators' && waveIndex === 1)
        withDatabase(f, (db) => {
          const store = new HostStateStore(db, f.workspace),
            before = store.readHostStateSnapshot(identity);
          if (!before.work || !before.workVersion || !before.ledgerVersion)
            throw Error('Positive historical reservation requires a complete Host state snapshot');
          const lease = before.work.lease;
          if (!lease) throw Error('Positive historical reservation requires its active Host lease');
          const assignmentRequest = fixtureAssignmentRequest(
            f,
            identity,
            config,
            selection,
            request,
            before.work,
            lease,
          );
          const receipt = store.claimWorkflowAttempt({
            identity,
            expectedWork: before.workVersion,
            expectedLedger: before.ledgerVersion,
            stageId: request.stage_id,
            assignmentIndex: request.assignment_index,
            requestDigest: canonicalJsonDigest(assignmentRequest),
            lease,
          });
          for (const relative of paths) f.put(relative, 'Synthetic authored ' + relative);
          postimage = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), paths);
          const observation = item.observation;
          if (!observation) throw Error('Positive historical reservation requires its completed observation');
          const completedObservation = {
            ...observation,
            host_attempt_id: receipt.attempt.attempt_id,
            changed_paths: paths,
          };
          const completedReceipt = store.completeWorkflowAttempt(receipt, completedObservation);
          item = {
            ...item,
            observation: completedObservation,
            host_reservation: persistedFixtureReservationData(
              f,
              db,
              identity,
              config,
              selection,
              request,
              completedReceipt,
            ),
          };
        });
      return item;
    });
    if (frontier) {
      frontierItems = items;
      engineContext['wave-' + waveIndex] = {
        status: 'suspended',
        payload: structuredClone(prior),
        suspendPayload: { requests: items.map((item) => item.request) },
      };
    } else {
      const output = {
        ...prior,
        observations: [...prior.observations, ...items.map(requiredJournalObservation)],
      };
      engineContext['wave-' + waveIndex] = {
        status: 'success',
        payload: structuredClone(prior),
        resumePayload: { observations: items.map(requiredJournalObservation) },
        output,
      };
      prior = output;
      completed.push({ step_id: 'wave-' + waveIndex, items });
    }
  }
  const state: FixtureJournal = {
    schema: 'MastraSessionLedger/v1',
    workspace_id: f.workspace,
    work_id: identity.work_id,
    attempt: 1,
    run_id: runId,
    source_scope: postimage,
    step_id: 'wave-' + completed.length,
    items: frontierItems,
    completed,
  };
  withDatabase(f, (db) =>
    db
      .query('INSERT INTO agent_host_mastra_session_ledger VALUES(?,?,?,?,?,?)')
      .run(f.workspace, identity.work_id, 1, 1, json(state), canonicalJsonDigest(state)),
  );
  const native = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), {
    create: true,
    strict: true,
  });
  try {
    native.exec('CREATE TABLE mastra_workflow_snapshot (workflow_name TEXT,run_id TEXT,snapshot BLOB)');
    native
      .query('INSERT INTO mastra_workflow_snapshot VALUES(?,?,jsonb(?))')
      .run(workflow, runId, json({ runId, status: 'suspended', context: engineContext }));
  } finally {
    native.close();
  }
  f.put('agent-runtime.config.v1.yaml', f.target);
  const request: HistoricalReleaseRequest = {
    schema:
      predicate === 'readonly_bookkeeping'
        ? 'ReadonlyBookkeepingOwnerReleaseRequest/v1'
        : predicate === 'settled_research'
          ? 'SettledResearchOwnerReleaseRequest/v1'
          : predicate === 'unissued_prepared'
            ? 'UnissuedOwnerReleaseRequest/v1'
            : 'HistoricalOwnerReleaseRequest/v1',
    identity,
    attempt: 1,
    userRequestPointer: 'fixture:human-owner-release',
    requestIntent: 'linked_correction',
    predicate,
    ...(predicate === 'settled_writer_failed_validators' ? { preimage_ref: 'original-scope.json' } : {}),
  };
  f.put('release.json', json(request));
  const args = (mode: string): string[] => [
    predicate === 'readonly_bookkeeping'
      ? '--release-readonly-bookkeeping-owner'
      : predicate === 'settled_research'
        ? '--release-settled-research-owner'
        : predicate === 'unissued_prepared'
          ? '--release-unissued-owner'
          : '--release-historical-owner',
    'true',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    'release.json',
  ];
  return { f, args, request, state, configuredContexts };
}

export function seedKnownTerminalSynthesisCustody(
  f: RuntimeFixture,
  request: HistoricalFixture['request'],
  state: FixtureJournal,
): ReturnType<HostStateStore['captureHistoricalTerminalSynthesisAndRelease']>;

export function seedKnownTerminalSynthesisCustody<TResult>(
  f: RuntimeFixture,
  request: HistoricalFixture['request'],
  state: FixtureJournal,
  receiptMutation: (input: ReceiptMutationInput) => TResult,
): TResult;

export function seedKnownTerminalSynthesisCustody(
  f: RuntimeFixture,
  request: HistoricalFixture['request'],
  state: FixtureJournal,
  receiptMutation?: (input: ReceiptMutationInput) => unknown,
): unknown {
  return withDatabase(f, (db) => {
    const selected: unknown = db
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(f.workspace, request.identity.work_id, request.attempt);
    if (
      !isPlainRecord(selected) ||
      typeof selected.payload !== 'string' ||
      typeof selected.revision !== 'number' ||
      !Number.isSafeInteger(selected.revision) ||
      selected.revision < 1 ||
      typeof selected.digest !== 'string'
    )
      throw Error('Seeded terminal journal row missing or malformed');
    const journalRow = { revision: selected.revision, digest: selected.digest };
    const recorded: unknown = JSON.parse(selected.payload);
    if (
      canonicalJsonDigest(recorded) !== canonicalJsonDigest(state) ||
      canonicalJsonDigest(recorded) !== selected.digest
    )
      throw Error('Seeded terminal journal differs from its current fixture state');
    const journal = structuredClone(state);
    const firstItem = journal.items[0];
    if (firstItem === undefined) throw Error('Seeded terminal journal has no pending action');
    const candidate = [...journal.items, ...journal.completed.flatMap((wave) => wave.items)].find(
      (item) => item.request.action_id === firstItem.request.action_id,
    );
    if (!candidate) throw Error('Seeded terminal synthesis target missing');
    expect(candidate.request.stage_id).toBe('synthesize_task');
    expect(candidate.research_activation).toBeTruthy();
    db.query(
      'UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=?',
    ).run(json(journal), canonicalJsonDigest(journal), f.workspace, request.identity.work_id, request.attempt);
    const store = new HostStateStore(db, f.workspace);
    const before = store.readHostStateSnapshot(request.identity);
    if (!before.work || !before.ledger || !before.workVersion || !before.ledgerVersion)
      throw Error('Seeded terminal Host state missing');
    const work = before.work,
      ledger = before.ledger,
      ticket = ledger.tickets.find((entry) => entry.work_id === request.identity.work_id && entry.status === 'active'),
      now = '2026-10-07T00:00:00.000Z';
    if (ticket === undefined) throw Error('Seeded terminal work has no active coordination ticket');
    const claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id && entry.status === 'active');
    if (claim === undefined) throw Error('Seeded terminal work has no active coordination claim');
    if (candidate.issue_id === null) throw Error('Seeded terminal synthesis action was not issued');
    const projectId = request.identity.project_ids[0];
    if (projectId === undefined) throw Error('Seeded terminal identity has no project');
    const summary = JSON.stringify({
        schema: 'VidaSynthesisObservationOutput/v1',
        readiness: 'blocked',
        completeness: { status: 'blocked', material_gaps: ['GAP-VIDA-RUN-EXECUTION-001'] },
      }),
      body = {
        schema: 'VidaSessionObservation/v1',
        action_id: candidate.request.action_id,
        issue_id: candidate.issue_id,
        agent_id: 'fixture:research-synthesizer',
        tool_call_ref: 'fixture:followup',
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: [],
      },
      inputBytes = Buffer.from(
        json({ status: body.status, agent_id: body.agent_id, tool_call_ref: body.tool_call_ref }),
      ),
      reportBytes = Buffer.from(
        json({
          exit_code: 1,
          input_path: path.resolve(f.root, '.tmp/synthesis-input.json'),
          command: ['vida-agent', '--report', path.resolve(f.root, '.tmp/synthesis-report-body.json')],
          stderr: json({
            schema: 'VidaAgentRunResult/v1',
            status: 'blocked',
            code: 'GAP-VIDA-RUN-EXECUTION-001',
            message: 'The requested run was blocked by runtime validation.',
          }).trim(),
        }),
      ),
      bodyBytes = Buffer.from(json(body)),
      original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt),
      admittedPredecessors = admittedResearchResultsForSynthesis({
        repositoryRoot: f.root,
        config: original.config,
        journal: { ...original.journal, resume_status: mastraLedgerStatus(original.journal.state) },
        work: original.owner.state,
        workflowId: candidate.request.workflow_id,
      }),
      provenance = {
        schema: 'HistoricalTerminalSynthesisProvenance/v1',
        body_ref: '.tmp/synthesis-body.json',
        input_ref: '.tmp/synthesis-input.json',
        report_ref: '.tmp/synthesis-report.json',
        followup_ref: body.tool_call_ref,
        original_actor_id: body.agent_id,
        denial_status: 'blocked',
        denial_code: 'GAP-VIDA-RUN-EXECUTION-001',
        denial_message: 'The requested run was blocked by runtime validation.',
        denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
        input_bytes_base64: inputBytes.toString('base64'),
        report_bytes_base64: reportBytes.toString('base64'),
        predecessor_refs: admittedPredecessors.map((result) => ({
          result_id: result.result_id,
          digest: result.digest,
        })),
      } satisfies HistoricalTerminalSynthesisProvenance;
    expect(admittedPredecessors).toHaveLength(2);
    const nextRevision = work.revision + 1,
      nextWork: WorkState = {
        ...work,
        revision: nextRevision,
        lease: null,
        execution: { ...work.execution, status: 'suspended', phase: 'awaiting_followup' },
        lifecycle: {
          ...work.lifecycle,
          revision: nextRevision,
          next_action:
            'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.',
        },
      },
      nextLedgerRevision = ledger.revision + 1,
      nextLedger: CoordinationLedger = {
        ...ledger,
        revision: nextLedgerRevision,
        tickets: ledger.tickets.map((entry) =>
          entry.ticket_id === ticket.ticket_id
            ? { ...entry, status: 'released', active_resources: [], blocked_resources: [], expires_at: null }
            : entry,
        ),
        claims: ledger.claims.map((entry) =>
          entry.claim_id === claim.claim_id ? { ...entry, status: 'released', renewed_at: now } : entry,
        ),
        operations: [
          ...ledger.operations,
          {
            schema: 'CoordinationOperation/v1',
            operation_id: 'fixture-terminal-synthesis-release',
            kind: 'release',
            ticket_id: ticket.ticket_id,
            work_id: request.identity.work_id,
            thread_id: 'fixture-thread',
            source_revision: ticket.source_revision,
            resources: [...ticket.exclusive_resources],
            from_ledger_revision: ledger.revision,
            to_ledger_revision: nextLedgerRevision,
            decided_by: 'fixture-thread',
            decision_pointer: request.userRequestPointer,
            created_at: now,
          },
        ],
      };
    const capture: Parameters<HostStateStore['captureHistoricalTerminalSynthesisAndRelease']>[0] = {
      schema: 'HistoricalTerminalSynthesisCapture/v1',
      identity: request.identity,
      attempt: request.attempt,
      actionId: candidate.request.action_id,
      issueId: candidate.issue_id,
      nativeSessionHandle: 'fixture-thread',
      userRequestPointer: request.userRequestPointer,
      requestIntent: request.requestIntent,
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedJournal: { revision: journalRow.revision, digest: canonicalJsonDigest(journal) },
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      documentationContext: {
        repository_root: f.root,
        repository_id: request.identity.repository_id,
        project_id: projectId,
        work_id: request.identity.work_id,
      },
      nextWork,
      nextLedger,
      bodyBytes,
      provenance,
    };
    const result = store.captureHistoricalTerminalSynthesisAndRelease(capture);
    if (receiptMutation) return receiptMutation({ db, store, capture, before, journal, candidate, result });
    return result;
  });
}

export function seedHistoricalResearchLineage(
  f: RuntimeFixture,
  request: HistoricalFixture['request'],
  state: FixtureJournal,
  {
    unnormalizedIndex = -1,
    pendingIndex = -1,
    activationOnlyIndex = -1,
    includeCompleted = false,
  }: {
    unnormalizedIndex?: number;
    pendingIndex?: number;
    activationOnlyIndex?: number;
    includeCompleted?: boolean;
  } = {},
) {
  const original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, 1);
  let work: WorkState = { ...original.owner.state, artifacts: [...original.owner.state.artifacts] };
  const lineageItems = includeCompleted
    ? [...state.completed.flatMap((wave) => wave.items), ...state.items]
    : state.items;
  type ResearchFixture = ReturnType<typeof createHistoricalResearchFixture>;
  const materials: { scopeBytes: Uint8Array; acceptanceBytes: Uint8Array; workItem: ResearchFixture['workItem'] }[] =
    [];
  let history = '',
    changelog = '';
  for (const [index, item] of lineageItems.entries()) {
    if (item.issue_id === null) throw Error('Research lineage fixture action was not issued');
    const pending = index === pendingIndex,
      normalized = index !== unnormalizedIndex && !pending;
    let updatedItem: MastraLedgerItem = item;
    if (index === activationOnlyIndex) {
      if (!pending || item.request.stage_id !== 'synthesize_task')
        throw Error('Activation-only lineage fixture requires the pending synthesis action');
      const activation = createHistoricalResearchActivationFixture({
        config: original.config,
        feature: original.config.research_decision,
        request: item.request,
        binding: {
          work_id: request.identity.work_id,
          attempt: state.attempt,
          run_id: state.run_id,
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          scope_id: work.binding.scope_id,
          scope_digest: requiredSourceScope(state).digest,
          source_revision: work.binding.work_source_revision,
          source_scope_digest: requiredSourceScope(state).digest,
          config_digest: work.binding.config_digest,
          maintenance_generation: original.maintenanceGeneration,
          lease_ticket_id: requiredWorkLease(work).ticket_id,
          lease_thread_id: requiredWorkLease(work).thread_id,
          lease_generation: requiredWorkLease(work).generation,
        },
      });
      try {
        materials.push({
          scopeBytes: activation.scopeBytes,
          acceptanceBytes: activation.acceptanceBytes,
          workItem: activation.workItem,
        });
        const activationPayload = withoutDigest(activation.activationPlan);
        const activationBody = {
          ...activationPayload,
          history_pre_sha256: history === '' ? null : sha(history),
          history_sha256: sha(history + activation.historyBytes),
        };
        const activationPlan = { ...activationBody, digest: canonicalJsonDigest(activationBody) };
        history += activation.historyBytes;
        f.put(activation.historyPath, history);
        updatedItem = {
          ...item,
          research_activation: { plan: activationPlan, use: activation.activationUse },
        };
        replaceFixtureJournalItem(state, item.request.action_id, updatedItem);
      } finally {
        activation.dispose();
      }
      continue;
    }
    const record = createHistoricalResearchFixture({
      config: original.config,
      feature: original.config.research_decision,
      request: item.request,
      topic: 'research-' + index,
      binding: {
        work_id: request.identity.work_id,
        attempt: state.attempt,
        run_id: state.run_id,
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        scope_id: work.binding.scope_id,
        scope_digest: requiredSourceScope(state).digest,
        source_revision: work.binding.work_source_revision,
        source_scope_digest: requiredSourceScope(state).digest,
        config_digest: work.binding.config_digest,
        maintenance_generation: original.maintenanceGeneration,
        lease_ticket_id: requiredWorkLease(work).ticket_id,
        lease_thread_id: requiredWorkLease(work).thread_id,
        lease_generation: requiredWorkLease(work).generation,
      },
    });
    try {
      materials.push({
        scopeBytes: record.scopeBytes,
        acceptanceBytes: record.acceptanceBytes,
        workItem: record.workItem,
      });
      const activationPayload = withoutDigest(record.activationPlan);
      const activationBody = {
        ...activationPayload,
        history_pre_sha256: history === '' ? null : sha(history),
        history_sha256: sha(history + record.historyBytes),
      };
      const activation = { ...activationBody, digest: canonicalJsonDigest(activationBody) };
      history += record.historyBytes;
      f.put(record.historyPath, history);
      updatedItem = { ...updatedItem, research_activation: { plan: activation, use: record.activationUse } };
      if (pending) updatedItem = { ...updatedItem, observation: null };
      if (normalized) {
        const planPayload = withoutDigest(record.plan);
        const planBody = {
          ...planPayload,
          changelog_pre_sha256: changelog === '' ? null : sha(changelog),
          changelog_sha256: sha(changelog + record.changelogBytes),
        };
        const plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
        changelog += record.changelogBytes;
        f.put(record.recordPath, record.recordBytes);
        f.put(record.changelogPath, changelog);
        updatedItem = {
          ...updatedItem,
          observation: record.observation,
          research_normalization: plan,
        };
        work = {
          ...work,
          artifacts: [
            ...work.artifacts,
            {
              artifact_id: includeCompleted ? record.result.result_id : 'research-' + index,
              schema: 'ResearchResult/v1',
              path: plan.record_path,
              sha256: plan.record_sha256,
              stage_id: item.request.stage_id,
              source_revision: work.binding.work_source_revision,
              scope_id: work.binding.scope_id,
              ac_ids: work.binding.ac_ids,
            },
          ],
        };
      } else {
        const { research_normalization: _normalization, ...withoutNormalization } = updatedItem;
        void _normalization;
        updatedItem = withoutNormalization;
      }
      replaceFixtureJournalItem(state, item.request.action_id, updatedItem);
    } finally {
      record.dispose();
    }
  }
  if (materials.length) {
    const material = requiredElement(materials, 0, 'research material');
    f.put(work.contracts.scope.path, material.scopeBytes);
    f.put(work.contracts.acceptance.path, material.acceptanceBytes);
    const scopeDigest = sha(material.scopeBytes),
      acceptanceDigest = sha(material.acceptanceBytes);
    work = {
      ...work,
      contracts: {
        ...work.contracts,
        scope: { ...work.contracts.scope, sha256: scopeDigest },
        acceptance: { ...work.contracts.acceptance, sha256: acceptanceDigest },
      },
      binding: {
        ...work.binding,
        scope_contract_digest: scopeDigest,
        acceptance_manifest_digest: acceptanceDigest,
        provider_work_item_id: material.workItem.id,
        work_item_digest: canonicalJsonDigest(material.workItem),
      },
    };
    const intakePath = '.agent/work/' + request.identity.work_id + '/intake.json';
    const intake = checkedRecord(
      parseFixtureJson(readFileSync(path.join(f.root, intakePath), 'utf8')),
      'fixture intake',
    );
    intake.work_item = material.workItem;
    const intakeBytes = json(intake);
    f.put(intakePath, intakeBytes);
    const intakeDigest = sha(Buffer.from(intakeBytes));
    work = {
      ...work,
      artifacts: work.artifacts.map((artifact) =>
        artifact.path === intakePath ? { ...artifact, sha256: intakeDigest } : artifact,
      ),
    };
  }
  withDatabase(f, (db) => {
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'").run(
      json(work),
      canonicalJsonDigest(work),
    );
    db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?').run(
      json(state),
      canonicalJsonDigest(state),
    );
  });
  if (includeCompleted) {
    const engine = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), { strict: true });
    try {
      const row = querySqliteRow<{ snapshot: string }>(
          engine,
          'SELECT json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?',
          'fixture workflow snapshot',
          state.run_id,
        ),
        snapshot = checkedSyntheticWorkflowSnapshot(parseFixtureJson(row.snapshot)),
        currentConfig = loadRuntimeConfig(f.root),
        context = {
          work_id: state.work_id,
          attempt: state.attempt,
          scope_digest: requiredSourceScope(state).digest,
        };
      let prior = structuredClone(snapshot.context.input);
      for (const wave of state.completed) {
        const retained = snapshot.context[wave.step_id];
        if (!retained || 'work_id' in retained)
          throw Error(`Fixture completed workflow step ${wave.step_id} is missing`);
        const observations = wave.items.map(requiredJournalObservation);
        retained.payload = structuredClone(prior);
        retained.resumePayload = { observations };
        retained.output = { ...prior, observations: [...prior.observations, ...observations] };
        prior = checkedSyntheticWorkflowInput(retained.output);
      }
      const currentItem = firstJournalItem(state),
        pendingWaveIndex = currentItem.request.wave_index,
        actions = sessionActionsForWave(
          currentConfig,
          snapshot.context.input.selection,
          context,
          currentItem.request.workflow_id,
          pendingWaveIndex,
          [],
        ),
        requests = actions.map((action) =>
          buildSessionBridgeRequest({
            runId: state.run_id,
            workflowId: currentItem.request.workflow_id,
            configDigest: runtimeConfigDigest(original.config),
            context,
            waveIndex: pendingWaveIndex,
            action,
            configuredContext: configuredContextForStage(
              f.root,
              currentConfig,
              currentItem.request.workflow_id,
              action.stage_id,
              context,
            ),
            priorResults: prior.observations,
          }),
        );
      expect(requests).toHaveLength(state.items.length);
      state.items = state.items.map((item, index) => ({
        ...item,
        request: requiredElement(requests, index, 'rebuilt fixture request'),
      }));
      const pendingWave = snapshot.context['wave-' + pendingWaveIndex];
      if (!pendingWave || 'work_id' in pendingWave) throw Error('Fixture pending workflow step is missing');
      pendingWave.payload = structuredClone(prior);
      pendingWave.suspendPayload = { requests };
      engine
        .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
        .run(json(snapshot), state.run_id);
    } finally {
      engine.close();
    }
    withDatabase(f, (db) =>
      db
        .query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?')
        .run(json(state), canonicalJsonDigest(state)),
    );
  }
  return { work, materials };
}

export const originalContextTamperCases: readonly [
  string,
  (contexts: FixtureOriginalContext[]) => void,
  string | null,
][] = [
  [
    'complete-source content binding tamper',
    (contexts) => {
      const first = firstOriginalContext(contexts),
        entry = firstConfiguredEntry(first.context);
      entry.content = `${entry.content ?? ''}\nForged body.\n`;
    },
    null,
  ],
  [
    'stale context self digest',
    (contexts) => {
      const context = firstOriginalContext(contexts).context,
        before = structuredClone(context);
      context.digest = canonicalJsonDigest({ fixture: 'different original-context self binding' });
      expect(context.digest).not.toBe(before.digest);
      expect({ ...context, digest: before.digest }).toEqual(before);
    },
    'original configured context self binding differs',
  ],
  [
    'malformed UTF-8 text',
    (contexts) => {
      const context = firstOriginalContext(contexts).context,
        entry = firstConfiguredEntry(context);
      entry.content = '\uD800';
      entry.truncated = true;
    },
    'original configured context text is invalid UTF-8',
  ],
  ['action substitution', (contexts) => (firstOriginalContext(contexts).action_id = 'f'.repeat(64)), null],
  ['wave substitution', (contexts) => (firstOriginalContext(contexts).wave_index += 1), null],
  ['stage substitution', (contexts) => (firstOriginalContext(contexts).stage_id = 'foreign-stage'), null],
  ['work substitution', (contexts) => (firstOriginalContext(contexts).work_id = 'foreign-work'), null],
  ['attempt substitution', (contexts) => (firstOriginalContext(contexts).attempt += 1), null],
  ['duplicate action entry', (contexts) => contexts.push(structuredClone(firstOriginalContext(contexts))), null],
  [
    'extra context entry',
    (contexts) => {
      const first = firstOriginalContext(contexts),
        context = first.context;
      context.entries.push(structuredClone(firstConfiguredEntry(context)));
      first.context = resignFixtureContext(context);
    },
    null,
  ],
  [
    'per-file byte limit',
    (contexts) => {
      const first = firstOriginalContext(contexts),
        context = first.context,
        entry = firstConfiguredEntry(context);
      entry.bytes = 65537;
      entry.truncated = true;
      first.context = resignFixtureContext(context);
    },
    null,
  ],
  [
    'excerpt character limit',
    (contexts) => {
      const first = firstOriginalContext(contexts),
        context = first.context;
      firstConfiguredEntry(context).content = 'x'.repeat(8193);
      first.context = resignFixtureContext(context);
    },
    null,
  ],
  [
    'oversized selection cardinality',
    (contexts) => {
      const first = firstOriginalContext(contexts),
        context = first.context,
        entry = firstConfiguredEntry(context);
      context.entries = Array.from({ length: 17 }, () => structuredClone(entry));
      first.context = resignFixtureContext(context);
    },
    null,
  ],
];

export const readonlySnapshotMutations: readonly [string, SyntheticStateMutation][] = [
  [
    'frozen config mismatch',
    (_state, snapshot) => {
      snapshot.context.input.config_digest = '0'.repeat(64);
    },
  ],
  [
    'suspended request mismatch',
    (_state, snapshot) => {
      const wave = snapshot.context['wave-0'];
      if (!wave) throw Error('Synthetic fixture has no first wave');
      if (!('suspendPayload' in wave) || wave.suspendPayload === undefined)
        throw Error('Synthetic fixture wave is missing its suspend request');
      requiredElement(wave.suspendPayload.requests, 1, 'Synthetic fixture request').role = 'executor';
    },
  ],
  [
    'original run mismatch',
    (_state, snapshot) => {
      snapshot.runId = 'foreign-run';
    },
  ],
];

export const readonlyJournalMutations: readonly [string, SyntheticStateMutation, boolean, boolean, string][] = [
  [
    'host reservation',
    (state, _snapshot, reservation) => {
      if (!reservation) throw Error('Synthetic fixture reservation is missing');
      const index = state.items.findIndex((entry) => entry.issue_id !== null);
      if (index < 0) throw Error('Synthetic fixture requires an issued item');
      const item = requiredElement(state.items, index, 'issued synthetic item');
      state.items[index] = { ...item, host_reservation: reservation };
    },
    true,
    true,
    'issued native outcome is pending/unknown',
  ],
  [
    'activation without complete authority',
    (state) => {
      const item = state.items.find((entry) => entry.issue_id !== null);
      if (!item) throw Error('Synthetic fixture requires an issued item');
      return fixtureJournalWithInvalidItemField(state, item.request.action_id, 'research_activation');
    },
    false,
    false,
    'Mastra research activation shape is invalid',
  ],
  [
    'normalization without complete authority',
    (state) => {
      const item = state.items.find((entry) => entry.issue_id !== null);
      if (!item) throw Error('Synthetic fixture requires an issued item');
      return fixtureJournalWithInvalidItemField(state, item.request.action_id, 'research_normalization');
    },
    false,
    false,
    'observed binding must be a plain object',
  ],
];
