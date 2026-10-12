import { afterEach, test, expect, mock } from 'bun:test';
import { expectRejection } from './helpers/expect-rejection.ts';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { stringify as stringifyYaml } from 'yaml';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  cpSync,
  rmSync,
  renameSync,
  symlinkSync,
  copyFileSync,
  linkSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, type SpawnSyncOptionsWithStringEncoding } from 'node:child_process';
import { runReconcileArtifacts as reconcileEntrypoint } from '../bin/reconcile-artifacts.ts';
import { run as runEntrypoint } from '../bin/run.ts';
import { readPin } from '../bin/bun.ts';
import {
  cooperativeReadonlyAssignments,
  currentState,
  inspectHistoricalOwnerContext,
} from '../bin/runtime-config-rebind.ts';
import { readAppliedRuntimeConfigRebind } from '../bin/runtime-config-rebind.ts';
import { inspectHistoricalOwnerWork, suspendHistoricalOwnerWork } from '../src/orchestration/suspend-local-work.ts';
import { loadRuntimeConfig, parseRuntimeConfigYaml, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import {
  canonicalJson,
  canonicalJsonDigest,
  MAX_CANONICAL_BYTES,
  isPlainRecord,
} from '../src/contracts/public-ingress.ts';
import { MAX_CANONICAL_DEPTH } from '../src/contracts/canonical-json-core.ts';
import { validateCoordinationLedgerV1 } from '../src/contracts/envelopes.ts';
import {
  createHistoricalResearchActivationFixture,
  createHistoricalResearchFixture,
} from './helpers/historical-research-fixture.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import {
  admittedResearchResultsForSynthesis,
  synthesisSourceCatalog,
} from '../src/orchestration/observed-synthesis-result.ts';
import { MastraSessionLedger, mastraLedgerStatus } from '../src/orchestration/persistent-session-handoff.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import {
  sessionBridgeRunId,
  buildSessionBridgeRequest,
  configuredContextForStage,
  parseSessionBridgeRunState,
} from '../src/orchestration/mastra-session-bridge.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';
import type { AgentRuntimeConfig, WorkItemSelection } from '../src/config/runtime-config.ts';
import {
  validateRuntimeInitializationReceipt,
  type RuntimeInitializationReceipt,
} from '../src/config/initialization-record.ts';
import type {
  WorkState,
  CoordinationLedger,
  WorkIdentity,
  RecoveryReviewBinding,
  StateVersion,
  HistoricalTerminalSynthesisProvenance,
  HistoricalTerminalSynthesisCaptureReceipt,
} from '../src/host-state.ts';
import type { MastraLedgerItem, MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import type { ScopedSourceSnapshot } from '../src/orchestration/scoped-source-snapshot.ts';
import type { SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import {
  parseSessionBridgeObservation,
  parseSessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge-contract.ts';
import type { SessionHandoffContext, SessionAgentAction } from '../src/orchestration/session-handoff.ts';
import type { ConfiguredContext } from '../src/orchestration/configured-context.ts';
import { validateHostOperationReservation } from '../src/governance/edictum-boundary.ts';
import type { OperationReservation } from '../src/governance/edictum-boundary.ts';
import {
  parseWorkflowSessionReservationData,
  workflowWorkItemSchema,
} from '../src/orchestration/workflow-session-reservation-contract.ts';
import type {
  WorkflowSessionReservation,
  WorkflowAssignmentRequest,
  TrustedWorkflowAssignment,
  WorkExecutionContext,
} from '../src/runtime-kernel.ts';
const source = process.env.VIDA_CONFIG_REBIND_TEST_BUNDLE ?? path.resolve(import.meta.dirname, '..');
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
function invokeConfiguredContextFixture(subject: ConfiguredContextFixture): Promise<unknown> {
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
type MaintenanceFenceAcquisition = HostStateStore['acquireMaintenanceFenceWithRecordedToken'];
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
type MutableFixture<T> = T extends readonly [unknown, ...unknown[]]
  ? { -readonly [K in keyof T]: MutableFixture<T[K]> }
  : T extends readonly (infer U)[]
    ? MutableFixture<U>[]
    : T extends object
      ? { -readonly [K in keyof T]: MutableFixture<T[K]> }
      : T;
type FixtureJournal = Omit<MastraSessionLedgerState, 'items' | 'completed'> & {
  items: MastraLedgerItem[];
  completed: { step_id: string; items: MastraLedgerItem[] }[];
};
type MutableConfiguredContext = MutableFixture<ConfiguredContext>;
type RuntimeAgentProfile = NonNullable<AgentRuntimeConfig['agents']['profiles'][string]>;
type RuntimeAgentProfileChange = Pick<RuntimeAgentProfile, 'model' | 'reasoning'>;
type RuntimeWorkflowStage = NonNullable<AgentRuntimeConfig['workflows'][string]>['stages'][number];
type RuntimeWorkflowAssignments = NonNullable<RuntimeWorkflowStage['assignments']>;
function requiredRuntimeAgentProfile(config: AgentRuntimeConfig, profileId: string): RuntimeAgentProfile {
  const profile = config.agents.profiles[profileId];
  if (profile === undefined) throw Error(`Runtime fixture is missing agent profile ${profileId}`);
  return profile;
}
function requiredRuntimeWorkflow(
  config: AgentRuntimeConfig,
  workflowId: string,
): NonNullable<AgentRuntimeConfig['workflows'][string]> {
  const workflow = config.workflows[workflowId];
  if (workflow === undefined) throw Error(`Runtime fixture is missing workflow ${workflowId}`);
  return workflow;
}
type FixtureDatabaseState = Record<string, Record<string, unknown>[]> & {
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
type HostStatePayloadRow = { payload: string; rowid?: number; id?: string; digest?: string; revision?: number };
type HostStateRowId = { rowid: number };
type HostStateRowIdPayload = { rowid: number; payload: string };
type HostStateRawPayloadRow = { payload: string; raw_payload_bytes: Uint8Array };
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
type SessionLedgerPayloadRow = { payload: string; rowid?: number; digest?: string; revision?: number };
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
type StandaloneRuntime = NonNullable<ReturnType<typeof import('../bin/bun.ts').standaloneRuntime>>;
const fixtureContextPath = 'docs/project-context.md';
const fixtureRoots: string[] = [];
const pendingFixtureCalls = new Map<string | undefined, number>();
const sourceCorrectionNativeRuntime: {
  value: StandaloneRuntime | null;
  mocked: boolean;
  previousPath: string | undefined;
} = { value: null, mocked: false, previousPath: undefined };
const sourceCorrectionPriorVersion = '0.1.2';
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
type ReconcileOptions = NonNullable<Parameters<typeof reconcileEntrypoint>[1]>;
async function fixtureCall<TResult>(
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
    if (!outcome.ok)
      throw new AggregateError([outcome.error, cleanupError], 'Fixture call and custody cleanup both failed', {
        cause: outcome.error,
      });
    throw cleanupError;
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}
type CliObject = Record<string, unknown> & {
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
function checkedCliObject(value: unknown, label: string): CliObject {
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
function checkedRecord(value: unknown, label: string): CliObject {
  return checkedCliObject(value, label);
}
function checkedSqliteRow(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw Error(`${label} returned no row`);
  return value;
}
function requiredSqliteRow<TRow>(value: TRow | null | undefined, label: string): TRow {
  if (value === null || value === undefined) throw Error(`${label} returned no row`);
  return value;
}
function querySqliteRow<TRow>(db: Database, sql: string, label: string, ...bindings: SQLQueryBindings[]): TRow {
  return requiredSqliteRow(db.query<TRow, SQLQueryBindings[]>(sql).get(...bindings), label);
}

function readHostStateSqlRow(db: Database, sql: string, ...bindings: SQLQueryBindings[]): HostStateSqlRow {
  return querySqliteRow<HostStateSqlRow>(db, sql, 'Host state query', ...bindings);
}

function readSessionLedgerSqlRow(db: Database, sql: string, ...bindings: SQLQueryBindings[]): SessionLedgerSqlRow {
  return querySqliteRow<SessionLedgerSqlRow>(db, sql, 'session ledger query', ...bindings);
}
function checkedFixtureWork(value: unknown, f: RuntimeFixture): WorkState {
  const schema = checkedRecord(
    parseFixtureJson(readFileSync(path.join(f.root, `${f.bundle}/schemas/work-state.v1.schema.json`), 'utf8')),
    'maintained WorkState schema',
  );
  const validate = new Ajv2020().compile<WorkState>(schema);
  if (!validate(value)) throw Error('Fixture WorkState does not match the maintained contract');
  return value;
}

function checkedFixtureLedger(value: unknown): CoordinationLedger {
  const result = validateCoordinationLedgerV1(value);
  if (!result.ok) throw Error(result.issues[0]?.message ?? 'Fixture ledger does not match the maintained contract');
  return result.ledger;
}
function checkedMutableFixtureLedger(value: unknown): MutableFixture<CoordinationLedger> {
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

function parseSessionJournalPayload(payload: string): MastraSessionLedgerState {
  return parseMastraSessionLedgerState(parseFixtureJson(payload));
}

function requiredHostStatePayload(state: FixtureDatabaseState, kind: 'work' | 'ledger'): string {
  const row = state.agent_host_state.find((entry) => entry.kind === kind);
  if (row === undefined) throw Error(`Fixture ${kind} row is missing`);
  return checkedString(row.payload, `${kind} payload`);
}

function requiredSessionLedgerPayload(state: FixtureDatabaseState): string {
  return checkedString(
    requiredElement(state.agent_host_mastra_session_ledger, 0, 'session ledger row').payload,
    'session ledger payload',
  );
}
function requiredResearchNormalizationItem(items: readonly MastraLedgerItem[]): {
  item: MastraLedgerItem;
  plan: NonNullable<MastraLedgerItem['research_normalization']>;
} {
  const item = [...items].reverse().find((entry) => entry.research_normalization);
  if (item === undefined || item.research_normalization === undefined)
    throw Error('Historical normalization fixture has no normalization item');
  return { item, plan: item.research_normalization };
}
function checkedResearchChangelogEvent(text: string): Readonly<Record<string, unknown>> {
  const event = parseFixtureJson(text);
  if (!isPlainRecord(event)) throw Error('Historical normalization changelog event is not an object');
  return event;
}
function requiredResearchOperationReference(scopeBytes: Uint8Array): string {
  const scope = checkedRecord(
      parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(scopeBytes)),
      'historical research scope',
    ),
    attribution = checkedRecord(scope.attribution, 'historical research scope attribution');
  return checkedString(attribution.pointer, 'historical research operation pointer');
}
function checkedSqliteInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) throw Error(`${label} is not a safe integer`);
  return value;
}
function requiredStateVersion(value: StateVersion | null, label: string): StateVersion {
  if (value === null) throw Error(`${label} is missing from the current fixture`);
  return value;
}
function checkedString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw Error(`${label} must be a string`);
  return value;
}
function requiredCliString(value: CliObject, key: string, label: string): string {
  return checkedString(value[key], label);
}
function requiredCliObject(value: CliObject, key: string, label: string): CliObject {
  return checkedCliObject(value[key], label);
}
function checkedBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw Error(`${label} must be a boolean`);
  return value;
}
function checkedStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw Error(`${label} must be an array`);
  return value.map((entry: unknown, index: number) => checkedString(entry, `${label}[${index}]`));
}
function parseFixtureJson(text: string): unknown {
  const value: unknown = JSON.parse(text);
  return value;
}
function checkedFixtureInitializationReceipt(f: RuntimeFixture, text: string): RuntimeInitializationReceipt {
  const schema = readFileSync(path.join(f.root, `${f.bundle}/schemas/runtime-initialization.v1.schema.json`), 'utf8');
  return validateRuntimeInitializationReceipt(parseFixtureJson(text), schema);
}
function checkedSourceCorrectionReportRequest(value: unknown): SourceCorrectionReportRequest {
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
const run = async (args: string[], options?: ReconcileOptions): Promise<CliObject> =>
  checkedCliObject(await fixtureCall(runEntrypoint, args, options), 'run entrypoint');
const runReconcileArtifacts = async (args: string[], options?: ReconcileOptions): Promise<CliObject> =>
  checkedCliObject(await fixtureCall(reconcileEntrypoint, args, options), 'reconcile entrypoint');
afterEach(() => {
  sourceCorrectionNativeRuntime.value = null;
  if (sourceCorrectionNativeRuntime.previousPath !== undefined) {
    process.env.PATH = sourceCorrectionNativeRuntime.previousPath;
    sourceCorrectionNativeRuntime.previousPath = undefined;
  }
  for (const root of fixtureRoots.splice(0)) {
    if (pendingFixtureCalls.has(root)) console.warn(`Retained fixture with an unresolved operation: ${root}`);
    else rmSync(root, { recursive: true, force: true });
  }
});
const sha = (bytes: Parameters<ReturnType<typeof createHash>['update']>[0]): string =>
  createHash('sha256').update(bytes).digest('hex');
const json = (value: unknown): string => JSON.stringify(value, null, 2) + '\n';
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
function expectMissingFixtureContextRead(error: unknown, label: string): void {
  expect(error).toBeInstanceOf(Error);
  if (!(error instanceof Error)) throw Error('Expected a filesystem error');
  if (process.platform === 'win32') {
    expect(error.message).toBe(
      `safe repository access unavailable: ${label} fs-safe boundary rejected the target (path)`,
    );
  } else {
    expect(Reflect.get(error, 'code')).toBe('ENOENT');
    expect(
      String(Reflect.get(error, 'path') ?? '')
        .replaceAll('\\', '/')
        .endsWith('/docs/project-context.md'),
    ).toBe(true);
  }
}

function recoveryFixture({
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

function fixtureOriginalContexts(state: FixtureJournal, configuredContexts: MutableConfiguredContext[]) {
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
type FixtureOriginalContext = ReturnType<typeof fixtureOriginalContexts>[number];

function firstOriginalContext(contexts: readonly FixtureOriginalContext[]): FixtureOriginalContext {
  const first = contexts[0];
  if (first === undefined) throw Error('Original context fixture is empty');
  return first;
}
function firstJournalItem(state: FixtureJournal | MastraSessionLedgerState): MastraLedgerItem {
  const first = state.items[0];
  if (first === undefined) throw Error('Fixture journal has no pending item');
  return first;
}
function requiredJournalObservation(item: MastraLedgerItem): NonNullable<MastraLedgerItem['observation']> {
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
  const item = checkedRecord(rawItem, 'synthetic journal item');
  item[field] = {};
  return value;
}
function requiredWorkflow(
  config: AgentRuntimeConfig,
  workflowId: string,
): NonNullable<AgentRuntimeConfig['workflows'][string]> {
  const workflow = config.workflows[workflowId];
  if (!workflow) throw Error(`Fixture workflow ${workflowId} is missing`);
  return workflow;
}
function requiredProfile(config: AgentRuntimeConfig, profileId: string): RuntimeAgentProfile {
  const profile = config.agents.profiles[profileId];
  if (!profile) throw Error(`Fixture profile ${profileId} is missing`);
  return profile;
}
function withoutProducedSchema(
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
function firstConfiguredContext(contexts: readonly MutableConfiguredContext[]): MutableConfiguredContext {
  const first = contexts[0];
  if (first === undefined) throw Error('Configured context fixture is empty');
  return first;
}
function requiredElement<T>(values: readonly T[], index: number, label: string): T {
  const value = values[index];
  if (value === undefined) throw Error(`${label} is missing at index ${index}`);
  return value;
}
function withoutDigest<T extends { readonly digest: string }>(value: T): Omit<T, 'digest'> {
  const { digest, ...rest } = value;
  void digest;
  return rest;
}
function requiredSourceScope(state: FixtureJournal): ScopedSourceSnapshot {
  const scope = state.source_scope;
  if (!scope) throw Error('Fixture journal has no source scope');
  return scope;
}
function requiredWorkLease(work: WorkState): NonNullable<WorkState['lease']> {
  const lease = work.lease;
  if (!lease) throw Error('Fixture work state has no lease');
  return lease;
}

function advanceFixtureHostSnapshot(snapshot: FixtureHostSnapshot) {
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

function resignFixtureContext(context: MutableConfiguredContext): MutableConfiguredContext {
  const { digest: _digest, ...body } = context;
  return { ...body, digest: canonicalJsonDigest(body) };
}

test.each(['PASS', 'FAIL'])(
  'internal recovery %s settles only its review and preserves original rights',
  async (status: 'PASS' | 'FAIL') => {
    const { f, input, call, observation } = recoveryFixture(),
      before = databaseState(f);
    const prepared = await call('prepare');
    expect(prepared.status).toBe('reserved');
    expect(prepared.request.historicalOwner).not.toBe(input.callerSession);
    const resumed = { ...input, request: prepared.request };
    expect((await call('inspect', resumed)).status).toBe('reserved');
    expect((await call('begin', resumed)).status).toBe('commit_unknown');
    const observed = observation(prepared.operation, status);
    const settled = await call('complete', { ...resumed, observation: observed });
    expect(settled.status).toBe('applied');
    expect(settled.rights_granted).toBe(false);
    expect(settled.runtime_acceptance).toBe(false);
    expect(settled.native_dispatch_performed).toBe(false);
    expect((await call('complete', { ...resumed, observation: observed })).operation).toEqual(settled.operation);
    const changed = structuredClone(observed);
    changed.observation.result = { findings: ['Different retained body'] };
    await Promise.resolve(
      expect(call('complete', { ...resumed, observation: changed })).rejects.toThrow(/result conflict/),
    );
    const after = databaseState(f);
    expect(after.agent_host_state).toEqual(before.agent_host_state);
    expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  },
  30000,
);

test('internal recovery UNKNOWN survives reopen and cannot reissue or reconstruct custody', async () => {
  const { f, input, call, observation } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(
      /reissue forbidden/,
    ),
  );
  await call('begin', resumed);
  const before = databaseState(f);
  expect((await call('inspect', resumed)).status).toBe('commit_unknown');
  await Promise.resolve(expect(call('begin', resumed)).rejects.toThrow(/reissue forbidden/));
  await Promise.resolve(expect(call('prepare')).rejects.toThrow(/reservation exists/));
  await Promise.resolve(expect(call('inspect', input)).rejects.toThrow(/shape/));
  const foreign = { ...resumed, callerSession: 'fixture-foreign' };
  await Promise.resolve(expect(call('inspect', foreign)).rejects.toThrow(/request changed/));
  const mismatchedObservation = observation(prepared.operation);
  mismatchedObservation.caller_session = 'fixture-foreign';
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: mismatchedObservation })).rejects.toThrow(/observation differs/),
  );
  const altered = observation(prepared.operation);
  altered.controller_id = 'foreign';
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: altered })).rejects.toThrow(/observation differs/),
  );
  expect(databaseState(f)).toEqual(before);
}, 60000);

test('internal recovery stale Source denies settlement while retaining UNKNOWN', async () => {
  const { f, input, call, observation } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  await call('begin', resumed);
  const before = databaseState(f);
  f.put('.githooks/pre-commit', 'Concurrent scoped edit');
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('internal recovery controller drift outside original Work scope denies begin', async () => {
  const { f, input, call } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  const before = databaseState(f);
  f.put(
    'packages/agent/src/runtime-kernel.ts',
    readFileSync(path.join(f.root, 'packages/agent/src/runtime-kernel.ts'), 'utf8') +
      '\n// Injected controller drift\n',
  );
  await Promise.resolve(expect(call('begin', resumed)).rejects.toThrow(/request changed/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('internal recovery reviews current declared Source while preserving historical preimages', async () => {
  const { f, input, call, observation } = recoveryFixture();
  f.put('.githooks/pre-commit', 'Authorized Source correction before recovery prepare');
  const before = databaseState(f);
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  expect(prepared.request.source.digest).not.toBe(prepared.request.context.original_source);
  await call('begin', resumed);
  expect((await call('complete', { ...resumed, observation: observation(prepared.operation) })).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
}, 30000);

test('internal recovery denies mixed execution flags and missing original context without effects', async () => {
  const { f, input, call } = recoveryFixture(),
    before = databaseState(f);
  await Promise.resolve(expect(call('prepare', input, ['--issue-wave', 'true'])).rejects.toThrow(/exact mode/));
  await Promise.resolve(expect(call('prepare', { ...input, baselinePath: 'missing.yaml' })).rejects.toThrow());
  await Promise.resolve(
    expect(call('prepare', { ...input, userInstructionRef: '' })).rejects.toThrow(/binding missing/),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

function fixture({
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
  cpSync(path.join(source, 'schemas'), path.join(root, bundle, 'schemas'), { recursive: true });
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
  const db = new Database(path.join(root, '.agent/work/session-handoff.v1.sqlite'), { create: true });
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

function deliveryFixture() {
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

function withoutPrewriterTemplateDelta(config: AgentRuntimeConfig): AgentRuntimeConfig {
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

function withAgentProfileChange(
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

function withProjectTitle(config: AgentRuntimeConfig, projectIndex: number, title: string): AgentRuntimeConfig {
  if (config.projects[projectIndex] === undefined) throw Error(`Fixture project ${projectIndex} is missing`);
  return {
    ...config,
    projects: config.projects.map((project, index) => (index === projectIndex ? { ...project, title } : project)),
  };
}

function withoutLastProject(config: AgentRuntimeConfig): AgentRuntimeConfig {
  if (config.projects.length === 0) throw Error('Fixture config has no project to remove');
  return { ...config, projects: config.projects.slice(0, -1) };
}

function withWorkflowStageAssignments(
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

function sourceCorrectionFixture(): SourceCorrectionFixtureResult {
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

function applySourceCorrectionBatch(
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

async function sourceCorrectionRebindWithNative(runtime: StandaloneRuntime): Promise<SourceCorrectionRebindRunner> {
  if (sourceCorrectionNativeRuntime.previousPath === undefined) {
    sourceCorrectionNativeRuntime.previousPath = process.env.PATH ?? '';
    process.env.PATH = [path.dirname(runtime.executable), sourceCorrectionNativeRuntime.previousPath]
      .filter(Boolean)
      .join(path.delimiter);
  }
  const bunPath = new URL('../bin/bun.ts', import.meta.url).href;
  if (!sourceCorrectionNativeRuntime.mocked) {
    const original = await import('../bin/bun.ts');
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
  const modulePath = new URL('../bin/runtime-config-rebind.ts', import.meta.url).href;
  const loaded: unknown = await import(`${modulePath}?source-correction-test=${randomUUID()}`);
  if (!isSourceCorrectionRebindRunner(loaded)) throw Error('Source correction rebind entrypoint is unavailable');
  return loaded;
}

test('source correction native mock falls back to the original runtime declaration after override closes', async () => {
  const previousPath = process.env.PATH ?? '';
  await sourceCorrectionRebindWithNative({ root: tmpdir(), executable: process.execPath });
  sourceCorrectionNativeRuntime.value = null;
  process.env.PATH = previousPath;
  sourceCorrectionNativeRuntime.previousPath = undefined;

  const bunModule = await import('../bin/bun.ts');
  expect(bunModule.standaloneRuntime({})).toBeNull();
});

function sourceCorrectionNativeFixture(
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

function sourceCorrectionExternalReport(
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

async function prepareSourceCorrectionRepair(
  rebind: SourceCorrectionRebindRunner,
  fixtureContext: SourceCorrectionFixtureContext = sourceCorrectionFixture(),
) {
  const runRebind = async (args: string[]): Promise<CliObject> =>
    checkedCliObject(await rebind.runRuntimeConfigRebind(args), 'runtime config rebind fixture');
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

test('public source repair freezes original beforeimages, prior update and held-fence scope without Host writes', async () => {
  const { f, deliveryArgs, repairArgs, changedPath, sourceManifestPath, authorizedPaths } = sourceCorrectionFixture();
  const originalPlan = await runReconcileArtifacts(deliveryArgs('plan')),
    packageRoot = path.join(f.root, 'packages/agent'),
    inventory = runtimeExecutableInventory(packageRoot, 'source', requireSafeRepositoryAccess(packageRoot)),
    access = requireSafeRepositoryAccess(f.root),
    source = snapshotDeclaredSources(
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
  expect((await runReconcileArtifacts(deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  const operationPath = requiredCliString(originalPlan, 'operation_path', 'planned operation path'),
    operationBytes = readFileSync(path.join(f.root, operationPath)),
    beforeimage = {
      purpose: 'inactive custody only; not an active repair artifact or admission',
      operation_id: 'fixture-rebind',
      operation_ref: operationPath,
      operation_bytes_base64: operationBytes.toString('base64'),
      source,
      beforeimages: source.entries.map((entry) => ({
        path: entry.path,
        bytes_base64: access.readBytes(entry.path, 'test beforeimage').toString('base64'),
      })),
      recorded_at: '2026-10-07T00:00:00.000Z',
      effects_issued: false,
    };
  f.put('.tmp/original-source-beforeimages.json', json(beforeimage));
  applySourceCorrectionBatch(f, changedPath, sourceManifestPath, priorUpdate.version);

  const sourceManifest = checkedRecord(
    parseFixtureJson(readFileSync(path.join(f.root, sourceManifestPath), 'utf8')),
    'source package manifest',
  );
  f.put(sourceManifestPath, json({ ...sourceManifest, version: '0.0.0' }));
  const beforeStaleVersionInspect = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(repairArgs('repair-inspect'))).rejects.toThrow(
      /at or after the prior installed version/,
    ),
  );
  expect(databaseState(f)).toEqual(beforeStaleVersionInspect);
  f.put(sourceManifestPath, json(sourceManifest));

  const custodyParent = path.join(f.root, '.tmp');
  const outside = mkdtempSync(path.join(tmpdir(), 'vida-source-admission-outside-'));
  const relocated = path.join(outside, 'retained');
  const beforeAdmission = databaseState(f);
  const custodyBytes = readFileSync(path.join(custodyParent, 'original-source-beforeimages.json'));
  renameSync(custodyParent, relocated);
  try {
    symlinkSync(relocated, custodyParent, process.platform === 'win32' ? 'junction' : 'dir');
    await expectRejection(runReconcileArtifacts(repairArgs('repair-inspect')), /ENOTDIR|ELOOP|unsafe|link|reparse/i);
    expect(databaseState(f)).toEqual(beforeAdmission);
    expect(readFileSync(path.join(relocated, 'original-source-beforeimages.json'))).toEqual(custodyBytes);
    expect(
      existsSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-source-correction-repair.v1.json')),
    ).toBe(false);
  } finally {
    if (existsSync(custodyParent)) unlinkSync(custodyParent);
    renameSync(relocated, custodyParent);
    rmSync(outside, { recursive: true });
  }

  const beforeRepair = databaseState(f),
    inspected = await runReconcileArtifacts(repairArgs('repair-inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(inspected.authorized_changed_paths).toEqual(authorizedPaths);
  expect(databaseState(f)).toEqual(beforeRepair);

  const publishedOperation = priorUpdate.operation_id;
  const planned = await runReconcileArtifacts([
      ...repairArgs('repair-plan'),
      '--publish-operation',
      publishedOperation,
    ]),
    sidecar = checkedCliObject(
      parseFixtureJson(
        readFileSync(path.join(f.root, requiredCliString(planned, 'sidecar_path', 'planned sidecar path')), 'utf8'),
      ),
      'source correction sidecar',
    ),
    repairRequest = requiredCliObject(sidecar, 'request', 'source correction request');
  expect(planned.status).toBe('planned');
  expect(sidecar.status).toBe('requested');
  expect(requiredCliObject(repairRequest, 'source_beforeimages', 'source beforeimages').path).toBe(
    '.tmp/original-source-beforeimages.json',
  );
  expect(requiredCliObject(repairRequest, 'source_beforeimages', 'source beforeimages').sha256).toBe(
    sha(Buffer.from(json(beforeimage))),
  );
  expect(requiredCliObject(repairRequest, 'source_beforeimages', 'source beforeimages').snapshot_digest).toBe(
    requiredCliObject(repairRequest, 'old_source', 'old source').digest,
  );
  expect(requiredCliObject(repairRequest, 'prior_system_update', 'prior system update').run_id).toBe(
    priorUpdate.run_id,
  );
  expect(requiredCliObject(repairRequest, 'prior_system_update', 'prior system update').artifact_id).toBe(
    priorUpdate.artifact_id,
  );
  expect(repairRequest.authorized_changed_paths).toEqual(authorizedPaths);
  const sourceChanges = repairRequest.source_changes;
  if (!Array.isArray(sourceChanges)) throw Error('source correction changes are malformed');
  expect(
    sourceChanges.map((change: unknown) =>
      checkedString(checkedRecord(change, 'source change').path, 'source change path'),
    ),
  ).toEqual(authorizedPaths);
  expect(requiredCliObject(repairRequest, 'new_source_manifest', 'new source manifest').version).toBe(
    priorUpdate.version,
  );
  const publicationOperationId = requiredCliString(repairRequest, 'publish_operation_id', 'publication operation id');
  expect(publicationOperationId).not.toBe(repairRequest.operation_id);
  expect(publicationOperationId).toBe(
    requiredCliString(
      requiredCliObject(repairRequest, 'prior_system_update', 'prior system update'),
      'operation_id',
      'prior system update operation id',
    ),
  );
  expect(publicationOperationId).toBe(publishedOperation);
  const plannedRequestId = requiredCliString(planned, 'request_id', 'planned request id'),
    plannedSidecarPath = requiredCliString(planned, 'sidecar_path', 'planned sidecar path'),
    frozenSidecarBytes = readFileSync(path.join(f.root, plannedSidecarPath));
  expect(
    requiredCliString(await runReconcileArtifacts(repairArgs('repair-plan')), 'request_id', 'replayed request id'),
  ).toBe(plannedRequestId);
  expect(
    requiredCliString(
      await runReconcileArtifacts([...repairArgs('repair-plan'), '--publish-operation', publishedOperation]),
      'request_id',
      'published request id',
    ),
  ).toBe(plannedRequestId);
  await Promise.resolve(
    expect(
      runReconcileArtifacts([...repairArgs('repair-plan'), '--publish-operation', 'local-different-publication']),
    ).rejects.toThrow(/repair inputs differ/),
  );
  await Promise.resolve(
    expect(
      runReconcileArtifacts([...repairArgs('repair-inspect'), '--publish-operation', '../invalid-operation']),
    ).rejects.toThrow(/published operation identity is invalid/),
  );
  expect(readFileSync(path.join(f.root, plannedSidecarPath))).toEqual(frozenSidecarBytes);
  const newSource = requiredCliObject(repairRequest, 'new_source', 'new source snapshot');
  const oldSource = requiredCliObject(repairRequest, 'old_source', 'old source snapshot');
  expect(requiredCliString(newSource, 'digest', 'new source digest')).not.toBe(
    requiredCliString(oldSource, 'digest', 'old source digest'),
  );
  expect(databaseState(f)).toEqual(beforeRepair);

  expect((await runReconcileArtifacts(repairArgs('repair-resume'))).status).toBe('repair_apply_required');
  await Promise.resolve(
    expect(runReconcileArtifacts(deliveryArgs('resume'))).rejects.toThrow('source correction is not applied'),
  );
  expect(databaseState(f)).toEqual(beforeRepair);
}, 30000);

test('source correction withdrawal archives the exact request, accepts Source drift and confirms exact retry', async () => {
  const fixtureContext = sourceCorrectionFixture(),
    prepared = await prepareSourceCorrectionRepair({ runRuntimeConfigRebind: runReconcileArtifacts }, fixtureContext),
    { f, repairArgs, changedPath, sidecarPath } = prepared,
    sidecarBytes = readFileSync(sidecarPath),
    request = requiredCliObject(
      checkedRecord(
        parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(sidecarBytes)),
        'source correction sidecar',
      ),
      'request',
      'source correction request',
    ),
    requestId = requiredCliString(request, 'request_id', 'source correction request id'),
    operationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'),
    historyPath = path.join(f.root, `.agent/work/fixture-rebind/source-correction-request-history/${requestId}.json`),
    baseline = {
      host: databaseState(f),
      operation: readFileSync(operationPath),
      receipt: readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')),
      yaml: readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml')),
      beforeimages: readFileSync(fixtureContext.sourceBeforeimagesPath),
      priorUpdate: readFileSync(fixtureContext.priorSystemUpdatePath),
      fence: fence(f),
    },
    withdrawArgs = (expectedRequest: string) => [
      ...repairArgs('repair-withdraw'),
      '--expected-request',
      expectedRequest,
    ];
  await Promise.resolve(
    expect(runReconcileArtifacts(withdrawArgs(randomUUID()))).rejects.toThrow(
      'source correction request does not bind the original fenced delivery operation',
    ),
  );
  expect(readFileSync(sidecarPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(existsSync(historyPath)).toBe(false);

  f.put(
    changedPath,
    readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// Source changed after the request was frozen.\n',
  );
  const driftedSource = readFileSync(path.join(f.root, changedPath)),
    withdrawn = await runReconcileArtifacts(withdrawArgs(requestId));
  expect(withdrawn).toMatchObject({
    status: 'withdrawn',
    operation_id: 'fixture-rebind',
    request_id: requestId,
    history_path: `.agent/work/fixture-rebind/source-correction-request-history/${requestId}.json`,
    writes_host_state: false,
  });
  expect(existsSync(sidecarPath)).toBe(false);
  expect(readFileSync(historyPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(readFileSync(operationPath)).toEqual(baseline.operation);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'))).toEqual(baseline.receipt);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(baseline.yaml);
  expect(readFileSync(fixtureContext.sourceBeforeimagesPath)).toEqual(baseline.beforeimages);
  expect(readFileSync(fixtureContext.priorSystemUpdatePath)).toEqual(baseline.priorUpdate);
  expect(fence(f)).toEqual(baseline.fence);
  expect(readFileSync(path.join(f.root, changedPath))).toEqual(driftedSource);

  expect(await runReconcileArtifacts(withdrawArgs(requestId))).toEqual(withdrawn);
  expect(readFileSync(historyPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(readFileSync(operationPath)).toEqual(baseline.operation);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'))).toEqual(baseline.receipt);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(baseline.yaml);
  expect(readFileSync(path.join(f.root, changedPath))).toEqual(driftedSource);
}, 30000);

test('source correction streams inert native assets above the generic read cap and rejects size, digest and hardlink changes', async () => {
  const fixtureContext = sourceCorrectionFixture(),
    largeAsset = Buffer.alloc(64 * 1024 * 1024 + 1, 0x5a),
    native = sourceCorrectionNativeFixture(fixtureContext.f, fixtureContext.targetVersion, largeAsset),
    rebind = await sourceCorrectionRebindWithNative(native.runtime),
    prepared = await prepareSourceCorrectionRepair(rebind, fixtureContext),
    { f, repairArgs, sidecarPath } = prepared,
    sidecar = checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'Source correction sidecar'),
    report = sourceCorrectionExternalReport(
      f,
      checkedSourceCorrectionReportRequest(requiredCliObject(sidecar, 'request', 'source correction request')),
      native,
    ),
    sourcePath = checkedString(report.installation_receipt.source_path, 'native source path'),
    sourceAbsolute = path.join(f.root, sourcePath),
    sourceDirectory = path.dirname(sourceAbsolute),
    copiedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-copy.exe')).split(path.sep).join('/'),
    mismatchedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-mismatch.exe')).split(path.sep).join('/'),
    linkedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-hardlink.exe')).split(path.sep).join('/'),
    shortPath = path.relative(f.root, path.join(sourceDirectory, 'asset-short.exe')).split(path.sep).join('/'),
    reportPath = path.join(f.root, '.tmp/source-correction-report.json'),
    applyArgs = [...repairArgs('repair-apply'), '--report', reportPath];
  copyFileSync(sourceAbsolute, path.join(f.root, copiedPath));
  copyFileSync(sourceAbsolute, path.join(f.root, mismatchedPath));
  const firstLargeAssetByte = largeAsset.at(0);
  if (firstLargeAssetByte === undefined) throw Error('Large native asset fixture is empty');
  writeFileSync(path.join(f.root, mismatchedPath), Buffer.from([firstLargeAssetByte ^ 0xff]), { flag: 'r+' });
  linkSync(path.join(f.root, copiedPath), path.join(f.root, linkedPath));
  f.put(shortPath, Buffer.from([1, 2, 3]));
  const before = databaseState(f),
    denyAssetPath = async (pathValue: string) => {
      const candidate = structuredClone(report);
      candidate.installation_receipt.source_path = pathValue;
      f.put('.tmp/source-correction-report.json', json(candidate));
      await Promise.resolve(expect(runReconcileArtifacts(applyArgs)).rejects.toThrow());
      expect(databaseState(f)).toEqual(before);
      expect(
        checkedString(
          checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
          'sidecar status',
        ),
      ).toBe('requested');
    };
  await denyAssetPath(linkedPath);
  await denyAssetPath(shortPath);
  await denyAssetPath(mismatchedPath);
  const custodyParent = path.dirname(fixtureContext.sourceBeforeimagesPath);
  const outside = mkdtempSync(path.join(tmpdir(), 'vida-source-custody-outside-'));
  const relocated = path.join(outside, 'retained');
  const custodyBytes = readFileSync(fixtureContext.sourceBeforeimagesPath);
  expect(custodyBytes.length).toBeGreaterThan(8 * 1024 * 1024);
  f.put('.tmp/source-correction-report.json', json(report));
  renameSync(custodyParent, relocated);
  try {
    symlinkSync(relocated, custodyParent, process.platform === 'win32' ? 'junction' : 'dir');
    await expectRejection(runReconcileArtifacts(applyArgs), /ENOTDIR|unsafe|link|symlink/i);
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(relocated, path.basename(fixtureContext.sourceBeforeimagesPath)))).toEqual(
      custodyBytes,
    );
  } finally {
    if (existsSync(custodyParent)) unlinkSync(custodyParent);
    renameSync(relocated, custodyParent);
    rmSync(outside, { recursive: true });
  }
  f.put('.tmp/source-correction-report.json', json(report));
  expect((await runReconcileArtifacts(applyArgs)).status).toBe('applied');
  expect(databaseState(f)).toEqual(before);
}, 60000);

test('source repair captures a closed config transition and reads it after later owner CAS progress', async () => {
  const fixtureContext = Object.assign(sourceCorrectionFixture(), {
      targetVersion: sourceCorrectionPriorVersion,
      publicationOperationId: 'local-46c2f01d-8541-46ce-8e31-30e467799538',
    }),
    native = sourceCorrectionNativeFixture(fixtureContext.f, fixtureContext.targetVersion),
    rebind = await sourceCorrectionRebindWithNative(native.runtime),
    { f, deliveryArgs, repairArgs, changedPath, sidecarPath } = await prepareSourceCorrectionRepair(
      rebind,
      fixtureContext,
    ),
    run = async (args: string[], options?: ReconcileOptions): Promise<CliObject> =>
      checkedCliObject(
        await fixtureCall(
          (entryArgs, entryOptions) => rebind.runRuntimeConfigRebind(entryArgs, entryOptions),
          args,
          options,
        ),
        'runtime config rebind fixture',
      ),
    sidecar = checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'Source correction sidecar'),
    reportPath = path.join(f.root, '.tmp/source-correction-report.json');
  const sidecarRequest = requiredCliObject(sidecar, 'request', 'source correction request');
  const report = sourceCorrectionExternalReport(f, checkedSourceCorrectionReportRequest(sidecarRequest), native),
    staleVersionReport = structuredClone(report);
  staleVersionReport.build_manifest.version = '0.0.0';
  f.put('.tmp/source-correction-report.json', json(staleVersionReport));
  const applyArgs = [...repairArgs('repair-apply'), '--report', reportPath],
    beforeApply = databaseState(f),
    reusedOperationIdReport = structuredClone(report);
  reusedOperationIdReport.publish_operation_id = requiredCliString(
    sidecarRequest,
    'operation_id',
    'source correction operation id',
  );
  f.put('.tmp/source-correction-report.json', json(reusedOperationIdReport));
  await Promise.resolve(
    expect(run(applyArgs)).rejects.toThrow(
      'source correction report does not bind the current package-native build and CI result',
    ),
  );
  expect(databaseState(f)).toEqual(beforeApply);
  expect(
    checkedString(
      checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
      'sidecar status',
    ),
  ).toBe('requested');
  f.put('.tmp/source-correction-report.json', json(staleVersionReport));
  await Promise.resolve(
    expect(run(applyArgs)).rejects.toThrow(
      'source correction report does not bind the current package-native build and CI result',
    ),
  );
  expect(databaseState(f)).toEqual(beforeApply);
  expect(
    checkedString(
      checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
      'sidecar status',
    ),
  ).toBe('requested');
  for (const field of ['run_id', 'artifact_id'] as const) {
    const staleCIReport = structuredClone(report);
    staleCIReport.ci_delivery[field] = requiredCliString(
      requiredCliObject(sidecarRequest, 'prior_system_update', 'prior system update'),
      field,
      `prior system update ${field}`,
    );
    if (field === 'run_id') staleCIReport.ci_delivery.result.run_id = staleCIReport.ci_delivery.run_id;
    f.put('.tmp/source-correction-report.json', json(staleCIReport));
    await Promise.resolve(
      expect(run(applyArgs)).rejects.toThrow(
        'source correction report does not bind the current package-native build and CI result',
      ),
    );
    expect(databaseState(f)).toEqual(beforeApply);
  }
  f.put('.tmp/source-correction-report.json', json(report));
  await Promise.resolve(
    expect(
      run(applyArgs, {
        onPhase: (phase) => {
          if (phase === 'applied') throw new Error('lost repair apply acknowledgement');
        },
      }),
    ).rejects.toThrow('lost repair apply acknowledgement'),
  );
  expect(databaseState(f)).toEqual(beforeApply);
  expect(
    checkedString(
      checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
      'sidecar status',
    ),
  ).toBe('applied');
  expect((await run(applyArgs)).status).toBe('applied');
  expect((await run(repairArgs('repair-resume'))).status).toBe('applied');
  expect(
    checkedRecord(
      parseFixtureJson(
        readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8'),
      ),
      'fenced delivery operation',
    ),
  ).toMatchObject({ revision: 2, phase: 'fenced', maintenance_released: false });
  const heldFence = fence(f),
    fencedOperation = checkedRecord(
      parseFixtureJson(
        readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8'),
      ),
      'fenced delivery operation',
    ),
    plan = requiredCliObject(fencedOperation, 'plan', 'fenced delivery plan');
  expect(heldFence?.status).toBe('held');
  const projectIds = checkedStringArray(plan.project_ids, 'fenced delivery project ids'),
    planOperationId = requiredCliString(plan, 'operation_id', 'fenced operation id'),
    planDigest = requiredCliString(fencedOperation, 'plan_digest', 'fenced operation plan digest'),
    selectorDigest = requiredCliString(plan, 'selector_digest', 'fenced selector digest'),
    stateDigest = requiredCliString(plan, 'state_digest', 'fenced state digest'),
    baselineReceipt = requiredCliString(plan, 'baseline_receipt', 'fenced baseline receipt'),
    targetConfigDigest = requiredCliString(plan, 'target_config_digest', 'fenced target config digest'),
    bundleDigest = requiredCliString(plan, 'bundle_digest', 'fenced bundle digest');
  expect(heldFence?.binding).toEqual({
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: projectIds,
    operation_id: planOperationId,
    manifest_digest: planDigest,
    request_digest: planDigest,
    bindings_digest: canonicalJsonDigest({ selector: selectorDigest, state: stateDigest }),
    closure_digest: canonicalJsonDigest({ old_receipt: baselineReceipt, target: targetConfigDigest }),
    bundle_digest: bundleDigest,
  });

  await Promise.resolve(
    expect(
      run(deliveryArgs('resume'), {
        onPhase: (phase: string) => {
          if (phase === 'transition_captured') throw new Error('lost transition acknowledgement');
        },
      }),
    ).rejects.toThrow('lost transition acknowledgement'),
  );
  const completedOperation = checkedRecord(
      parseFixtureJson(
        readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8'),
      ),
      'completed delivery operation',
    ),
    completedSidecar = checkedRecord(
      parseFixtureJson(readFileSync(sidecarPath, 'utf8')),
      'completed source correction sidecar',
    ),
    completedReceiptBytes = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
  expect(completedOperation).toMatchObject({ revision: 4, phase: 'applied', maintenance_released: true });
  expect(completedSidecar).toMatchObject({ status: 'applied', revision: 3 });
  expect(checkedRecord(completedSidecar.completion, 'completed sidecar transition')).toMatchObject({
    schema: 'RuntimeConfigDeliveryTransition/v1',
    operation_sha256: sha(
      readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json')),
    ),
    receipt_sha256: sha(completedReceiptBytes),
    runtime_accepted: false,
  });
  const appliedSidecarBytes = readFileSync(sidecarPath),
    beforeAppliedWithdrawal = databaseState(f),
    appliedHistoryPath = path.join(
      f.root,
      `.agent/work/fixture-rebind/source-correction-request-history/${requiredCliString(requiredCliObject(completedSidecar, 'request', 'completed source correction request'), 'request_id', 'completed request id')}.json`,
    );
  await Promise.resolve(
    expect(
      run([
        ...repairArgs('repair-withdraw'),
        '--expected-request',
        requiredCliString(
          requiredCliObject(completedSidecar, 'request', 'completed source correction request'),
          'request_id',
          'completed request id',
        ),
      ]),
    ).rejects.toThrow('only an unapplied source correction request can be withdrawn'),
  );
  expect(readFileSync(sidecarPath)).toEqual(appliedSidecarBytes);
  expect(existsSync(appliedHistoryPath)).toBe(false);
  expect(databaseState(f)).toEqual(beforeAppliedWithdrawal);
  const initialProof = await run(repairArgs('repair-transition'));
  expect(requiredCliString(initialProof, 'status', 'transition status')).toBe('closed_config_transition_proven');
  expect(requiredCliString(initialProof, 'baseline_config_digest', 'transition baseline digest')).toBe(
    requiredCliString(plan, 'old_config_digest', 'baseline config digest'),
  );
  expect(checkedBoolean(initialProof.caller_owner_cas_required, 'caller owner CAS required')).toBe(true);
  expect(checkedBoolean(initialProof.runtime_accepted, 'transition runtime acceptance')).toBe(false);
  expect(checkedBoolean(initialProof.writes_host_state, 'transition Host write flag')).toBe(false);

  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace),
      before = store.readHostStateSnapshot(fixtureContext.request.identity);
    store.compareAndSwapHostState(advanceFixtureHostSnapshot(before));
  });
  const afterFreshOwnerCas = await run(repairArgs('repair-transition'));
  expect(requiredCliString(afterFreshOwnerCas, 'transition_digest', 'fresh transition digest')).toBe(
    requiredCliString(initialProof, 'transition_digest', 'initial transition digest'),
  );

  f.put(
    '.agent/runtime-initialization.v1.json',
    json({
      ...checkedFixtureInitializationReceipt(
        f,
        new TextDecoder('utf-8', { fatal: true }).decode(completedReceiptBytes),
      ),
      config_digest: sha(Buffer.from('foreign postimage')),
    }),
  );
  await Promise.resolve(
    expect(run(repairArgs('repair-transition'))).rejects.toThrow('closed source delivery configuration'),
  );
  f.put('.agent/runtime-initialization.v1.json', completedReceiptBytes);
  f.put(changedPath, readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// post-delivery Source drift\n');
  await Promise.resolve(
    expect(run(repairArgs('repair-transition'))).rejects.toThrow('closed source delivery current Source differs'),
  );
}, 60000);

test('delivered configuration adopts only its receipt under the original fence and preserves history', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('unchanged baseline YAML and receipt'),
  );
  expect((await runReconcileArtifacts(f.deliveryArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const planned = await runReconcileArtifacts(f.deliveryArgs('plan'));
  expect(requiredCliString(planned, 'operation_path', 'planned operation path')).toEndWith(
    '/runtime-config-delivery-operation.v1.json',
  );
  expect(
    checkedCliObject(
      parseFixtureJson(
        readFileSync(path.join(f.root, requiredCliString(planned, 'operation_path', 'operation path')), 'utf8'),
      ),
      'planned delivery operation',
    ).schema,
  ).toBe('SourceDeliveryConfigRebindOperation/v1');
  expect((await runReconcileArtifacts(f.deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  const completed = await runReconcileArtifacts(f.deliveryArgs('resume'));
  expect(completed.status).toBe('applied');
  expect(completed.writes_yaml).toBe(false);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
    ...f.receipt,
    config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
  });
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
  await Promise.resolve(
    expect(runReconcileArtifacts(f.deliveryArgs('restore'))).rejects.toThrow('rollback is forbidden'),
  );
}, 30000);

test('delivered configuration denies substituted baseline, target drift and cross-kind operation conversion', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  f.put('accepted-baseline.yaml', f.target);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.deliveryArgs('inspect'))).rejects.toThrow('unchanged baseline YAML and receipt'),
  );
  expect(databaseState(f)).toEqual(before);
  f.put('accepted-baseline.yaml', f.oldYaml);
  const planned = await runReconcileArtifacts(f.deliveryArgs('plan'));
  f.put(
    '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json',
    readFileSync(path.join(f.root, requiredCliString(planned, 'operation_path', 'operation path'))),
  );
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow('frozen operation invalid or foreign'),
  );
  expect(databaseState(f)).toEqual(before);
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.deliveryArgs('apply'))).rejects.toThrow('authored YAML bytes differ'),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('delivered configuration abandons a no-effect fence without reverting the desired YAML', async () => {
  const f = deliveryFixture(),
    before = databaseState(f);
  await runReconcileArtifacts(f.deliveryArgs('plan'));
  await runReconcileArtifacts(f.deliveryArgs('apply'));
  expect((await runReconcileArtifacts(f.deliveryArgs('restore'))).status).toBe('abandoned_no_effect');
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  expect(databaseState(f).agent_host_state).toEqual(before.agent_host_state);
}, 30000);

test.each(['fence_acquired', 'fenced', 'receipt_rebound', 'applied', 'released'])(
  'delivered configuration resumes interrupted %s without duplicating receipt effects',
  async (cutoff) => {
    const f = deliveryFixture();
    await runReconcileArtifacts(f.deliveryArgs('plan'));
    const options = {
      onPhase: (phase: string) => {
        if (phase === cutoff) throw new Error('injected delivery interruption');
      },
    };
    if (['fence_acquired', 'fenced'].includes(cutoff)) {
      await Promise.resolve(
        expect(runReconcileArtifacts(f.deliveryArgs('apply'), options)).rejects.toThrow(
          'injected delivery interruption',
        ),
      );
      await runReconcileArtifacts(f.deliveryArgs('resume'));
    } else {
      await runReconcileArtifacts(f.deliveryArgs('apply'));
      await Promise.resolve(
        expect(runReconcileArtifacts(f.deliveryArgs('resume'), options)).rejects.toThrow(
          'injected delivery interruption',
        ),
      );
    }
    expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
    expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.target);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
      ...f.receipt,
      config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
    });
  },
  30000,
);

test('delivered configuration rejects retagging a fenced standard operation without receipt effects', async () => {
  const f = fixture({ sourceMode: true });
  const planned = await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.target);
  const operation = checkedCliObject(
    parseFixtureJson(
      readFileSync(path.join(f.root, requiredCliString(planned, 'operation_path', 'operation path')), 'utf8'),
    ),
    'planned source operation',
  );
  f.put(
    '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json',
    json({ ...operation, schema: 'SourceDeliveryConfigRebindOperation/v1' }),
  );
  const before = databaseState(f),
    args = f.args('resume');
  args[1] = 'runtime-config-delivery';
  await Promise.resolve(expect(runReconcileArtifacts(args)).rejects.toThrow('frozen operation invalid or foreign'));
  expect(databaseState(f)).toEqual(before);
  const retagged = { ...operation, schema: 'SourceDeliveryConfigRebindOperation/v1' };
  retagged.plan_digest = canonicalJsonDigest({ schema: retagged.schema, plan: retagged.plan });
  f.put('.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json', json(retagged));
  await Promise.resolve(expect(runReconcileArtifacts(args)).rejects.toThrow('foreign or absent maintenance fence'));
  expect(databaseState(f)).toEqual(before);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
}, 30000);

function withDatabase<TResult>(f: RuntimeFixture, callback: (db: Database) => TResult, readonly = false): TResult {
  const db = new Database(
    path.join(f.root, '.agent/work/session-handoff.v1.sqlite'),
    readonly ? { readonly: true, strict: true } : { create: true, strict: true },
  );
  let outcome: { ok: true; value: TResult } | { ok: false; error: unknown };
  try {
    outcome = { ok: true, value: callback(db) };
  } catch (error) {
    outcome = { ok: false, error };
  }
  try {
    db.close();
  } catch (cleanupError) {
    if (!outcome.ok)
      throw new AggregateError([outcome.error, cleanupError], 'Database fixture callback and cleanup both failed');
    throw cleanupError;
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

function databaseState(f: RuntimeFixture): FixtureDatabaseState {
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

function fence(f: RuntimeFixture) {
  return withDatabase(f, (db) => new HostStateStore(db, f.workspace).readMaintenanceFence());
}

function seedState(
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

function seedManyReadonlyWorks(f: RuntimeFixture, count: number) {
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

test('compact config binding handles over ten thousand readonly row nodes and rejects raw-payload-only plan drift', async () => {
  const f = fixture({ sourceMode: true });
  const identities = seedManyReadonlyWorks(f, 128);
  const config = loadRuntimeConfig(f.root);
  const originalDigest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(originalDigest).toMatch(/^[a-f0-9]{64}$/);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  const beforeDrift = databaseState(f);
  const changedRow = withDatabase(f, (db) => {
    const identity = requiredElement(identities, 0, 'readonly work identity'),
      row = readHostStateSqlRow(
        db,
        "SELECT * FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?",
        f.workspace,
        JSON.stringify([identity.repository_id, identity.project_ids, identity.integrations_digest, identity.work_id]),
      );
    const originalPayload = checkedString(row.payload, 'selected work payload'),
      rowId = checkedString(row.id, 'selected work row id'),
      payload = originalPayload + '\n';
    expect(parseFixtureJson(payload)).toEqual(parseFixtureJson(originalPayload));
    expect(
      db
        .query('UPDATE agent_host_state SET payload=? WHERE workspace_id=? AND kind=? AND id=?')
        .run(payload, f.workspace, 'work', rowId).changes,
    ).toBe(1);
    return { ...row, payload };
  });
  const originalChangedRow = beforeDrift.agent_host_state.find((row) => row.id === changedRow.id);
  if (originalChangedRow === undefined) throw Error('Changed readonly work row is absent from the baseline');
  expect(changedRow.digest).toBe(checkedString(originalChangedRow.digest, 'baseline work digest'));
  const driftDigest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(driftDigest).not.toBe(originalDigest);
  const driftedState = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(
      /current selector\/schema\/global state differs from plan/,
    ),
  );
  expect(databaseState(f)).toEqual(driftedState);
  expect(fence(f)).toBeNull();
});

test('compact config binding includes row metadata and retains per-row digest denial', async () => {
  const metadataFixture = fixture({ sourceMode: true });
  seedState(metadataFixture);
  const metadataConfig = loadRuntimeConfig(metadataFixture.root);
  const metadataDigest = withDatabase(metadataFixture, (db) =>
    currentState(db, metadataFixture.workspace, metadataFixture.root, metadataConfig),
  );
  await runReconcileArtifacts(metadataFixture.args('plan'));
  withDatabase(metadataFixture, (db) => {
    db.query("UPDATE agent_host_state SET revision=revision+1 WHERE workspace_id=? AND kind='work'").run(
      metadataFixture.workspace,
    );
  });
  const metadataDriftDigest = withDatabase(metadataFixture, (db) =>
    currentState(db, metadataFixture.workspace, metadataFixture.root, metadataConfig),
  );
  expect(metadataDriftDigest).not.toBe(metadataDigest);
  const metadataDrift = databaseState(metadataFixture);
  await Promise.resolve(
    expect(runReconcileArtifacts(metadataFixture.args('apply'))).rejects.toThrow(
      /current selector\/schema\/global state differs from plan/,
    ),
  );
  expect(databaseState(metadataFixture)).toEqual(metadataDrift);
  expect(fence(metadataFixture)).toBeNull();

  const digestFixture = fixture({ sourceMode: true });
  seedState(digestFixture);
  await runReconcileArtifacts(digestFixture.args('plan'));
  withDatabase(digestFixture, (db) => {
    db.query("UPDATE agent_host_state SET digest=? WHERE workspace_id=? AND kind='work'").run(
      '0'.repeat(64),
      digestFixture.workspace,
    );
  });
  const digestDrift = databaseState(digestFixture);
  await Promise.resolve(
    expect(runReconcileArtifacts(digestFixture.args('apply'))).rejects.toThrow(
      /agent_host_state row integrity differs/,
    ),
  );
  expect(databaseState(digestFixture)).toEqual(digestDrift);
  expect(fence(digestFixture)).toBeNull();
});

test('compact config binding rejects malformed UTF-8 payload bytes with unchanged decoded text', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root);
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
        db
          .query<HostStateRowIdPayload, [string]>(
            "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'",
          )
          .get(f.workspace),
        'work row for UTF-8 case',
      ),
      work = checkedRecord(parseFixtureJson(checkedString(row.payload, 'work payload')), 'work payload'),
      replacement = String.fromCharCode(0xfffd),
      rowId = checkedSqliteInteger(row.rowid, 'work rowid');
    const lifecycle = checkedRecord(work.lifecycle, 'work lifecycle');
    lifecycle.next_action = `Trace ${replacement} the accepted work request.`;
    work.lifecycle = lifecycle;
    const payload = json(work),
      validBytes = Buffer.from(payload, 'utf8'),
      replacementBytes = Buffer.from(replacement, 'utf8'),
      replacementIndex = validBytes.indexOf(replacementBytes);
    expect(replacementIndex).toBeGreaterThanOrEqual(0);
    const malformedBytes = Buffer.concat([
      validBytes.subarray(0, replacementIndex),
      Buffer.from([0xff]),
      validBytes.subarray(replacementIndex + replacementBytes.length),
    ]);
    expect(new TextDecoder('utf-8').decode(malformedBytes)).toBe(payload);
    db.query('UPDATE agent_host_state SET payload=CAST(? AS TEXT),digest=? WHERE rowid=?').run(
      malformedBytes,
      canonicalJsonDigest(work),
      rowId,
    );
    const stored = requiredSqliteRow(
      db
        .query<HostStateRawPayloadRow, [number]>(
          'SELECT payload,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_state WHERE rowid=?',
        )
        .get(rowId),
      'stored UTF-8 work row',
    );
    expect(stored.payload).toBe(payload);
    expect(Buffer.from(stored.raw_payload_bytes)).toEqual(malformedBytes);
    expect(Buffer.from(stored.payload, 'utf8')).not.toEqual(malformedBytes);
  });
  const before = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/payload UTF-8 is invalid/),
  );
  expect(databaseState(f)).toEqual(before);
});

test('compact config binding rejects one persisted row beyond the JSON depth budget before digest validation', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root),
    payload = '['.repeat(MAX_CANONICAL_DEPTH + 1) + '0' + ']'.repeat(MAX_CANONICAL_DEPTH + 1);
  expect(Buffer.byteLength(payload, 'utf8')).toBeLessThanOrEqual(MAX_CANONICAL_BYTES);
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
      db
        .query<HostStateRowIdPayload, [string]>(
          "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'",
        )
        .get(f.workspace),
      'work row for JSON depth case',
    );
    // Keep the row's original digest as authentic stored metadata. The altered payload deliberately does not claim
    // a matching digest: structural preflight must reject it before ordinary JSON parsing and digest validation.
    db.query('UPDATE agent_host_state SET payload=CAST(? AS TEXT) WHERE rowid=?').run(payload, row.rowid);
    const raw = requiredSqliteRow(
      db
        .query<HostStateRawPayloadRow, [number]>(
          'SELECT payload,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_state WHERE rowid=?',
        )
        .get(row.rowid),
      'stored over-depth work row',
    );
    expect(raw.payload).toBe(payload);
    expect(Buffer.from(raw.raw_payload_bytes)).toEqual(Buffer.from(payload, 'utf8'));
  });
  const beforeRead = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(
      'workspace SQL agent_host_state JSON structural budget exceeded',
    ),
  );
  expect(databaseState(f)).toEqual(beforeRead);
});

test('compact config binding accepts a row just below the canonical byte budget', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root);
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
        db
          .query<HostStateRowIdPayload, [string]>(
            "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'",
          )
          .get(f.workspace),
        'work row for canonical byte case',
      ),
      originalWork = checkedFixtureWork(parseFixtureJson(checkedString(row.payload, 'work payload')), f),
      rowId = checkedSqliteInteger(row.rowid, 'work rowid');
    const targetBytes = MAX_CANONICAL_BYTES - 1024,
      baseWork = originalWork,
      baselinePayloadBytes = Buffer.byteLength(JSON.stringify(baseWork), 'utf8'),
      existingResources = [...baseWork.binding.allowed_resources],
      targetAdditionBytes = targetBytes - baselinePayloadBytes,
      fullResourceCount = Math.floor(targetAdditionBytes / 2051),
      fullResourceCost = fullResourceCount * 2051 - (existingResources.length === 0 ? 1 : 0),
      remainingAdditionBytes = targetAdditionBytes - fullResourceCost,
      fullResources = Array.from({ length: fullResourceCount }, (_, index) => {
        const prefix = `fixture-resource-${index}-`;
        return prefix + 'x'.repeat(2048 - prefix.length);
      }),
      partialPrefix = `fixture-resource-tail-${fullResourceCount}-`,
      partialLength = remainingAdditionBytes - 3,
      partialResource =
        partialLength >= partialPrefix.length ? [partialPrefix + 'x'.repeat(partialLength - partialPrefix.length)] : [],
      work = checkedFixtureWork(
        {
          ...baseWork,
          binding: {
            ...baseWork.binding,
            allowed_resources: [...existingResources, ...fullResources, ...partialResource],
          },
        },
        f,
      ),
      payload = JSON.stringify(work),
      payloadBytes = Buffer.byteLength(payload, 'utf8');
    expect(payloadBytes).toBeGreaterThan(MAX_CANONICAL_BYTES - 2048);
    expect(payloadBytes).toBeLessThanOrEqual(MAX_CANONICAL_BYTES);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(work),
      rowId,
    );
  });
  const digest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
});

test('compact config binding rejects an oversized row before fetching its payload', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root),
    observedQueries: string[] = [];
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
      db
        .query<HostStateRowId, [string]>("SELECT rowid FROM agent_host_state WHERE workspace_id=? AND kind='work'")
        .get(f.workspace),
      'oversized work row',
    );
    db.query('UPDATE agent_host_state SET payload=zeroblob(?) WHERE rowid=?').run(MAX_CANONICAL_BYTES + 1, row.rowid);
    const observedDatabase = new Proxy(db, {
      get(target, property) {
        if (property === 'query') {
          const observedQuery: Database['query'] = (sql) => {
            observedQueries.push(sql);
            return target.query(sql);
          };
          return observedQuery;
        }
        const value: unknown = Reflect.get(target, property, target);
        if (typeof value === 'function') return (...args: unknown[]): unknown => Reflect.apply(value, target, args);
        return value;
      },
    });
    expect(() => currentState(observedDatabase, f.workspace, f.root, config)).toThrow(
      /row payload exceeds canonical byte budget/,
    );
    expect(observedQueries.some((sql) => sql.includes('SELECT *, CAST(payload AS BLOB)'))).toBe(false);
  });
});

test('inspect/plan are read-only for YAML/receipt/database; fenced apply precedes authored edit and resume preserves provenance', async () => {
  const f = fixture();
  const before = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
  seedState(f, { native: true });
  const persisted = databaseState(f);
  const cliOptions: SpawnSyncOptionsWithStringEncoding = {
    cwd: f.root,
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
  };
  const cli = spawnSync(
    process.execPath,
    [path.join(source, 'bin/reconcile-artifacts.ts'), ...f.args('inspect')],
    cliOptions,
  );
  expect(cli.status).toBe(0);
  expect(
    requiredCliString(checkedCliObject(parseFixtureJson(cli.stdout), 'reconcile CLI result'), 'status', 'CLI status'),
  ).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(persisted);
  expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect(databaseState(f)).toEqual(persisted);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(before)).toBe(true);
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = parseFixtureJson(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'));
  expect(after).toEqual({ ...f.receipt, config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)) });
  const appliedState = databaseState(f);
  expect(appliedState.agent_host_state).toEqual(persisted.agent_host_state);
  expect(appliedState.agent_host_mastra_session_ledger).toEqual(persisted.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
}, 30_000);

test('Source without selector rebinds Luna under the same fence and preserves work state', async () => {
  const f = fixture({ sourceMode: true });
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const adoptedConfig = loadRuntimeConfig(f.root),
    executor = requiredRuntimeAgentProfile(adoptedConfig, 'executor');
  expect(executor.model).toBe('gpt-6-luna');
  expect(executor.reasoning).toBe('max');
  expect(databaseState(f).agent_host_state).toEqual(before.agent_host_state);
  expect(existsSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'))).toBe(false);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
    ...f.receipt,
    config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
  });
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
}, 30_000);

test.each(['source bytes', 'inventory addition', 'selector appearance', 'workspace identity'])(
  'Source rebind rejects %s drift before acquiring maintenance',
  async (change) => {
    const f = fixture({ sourceMode: true });
    await runReconcileArtifacts(f.args('plan'));
    const before = databaseState(f);
    if (change === 'source bytes') f.put(f.bundle + '/bin/run.ts', '// changed Source');
    if (change === 'inventory addition') f.put(f.bundle + '/src/config/new-feature.ts', '// added Source');
    if (change === 'workspace identity') f.put('package.json', json({ private: false, workspaces: [f.bundle] }));
    if (change === 'selector appearance')
      f.put(
        '.agent/active-runtime-selector.v1.json',
        json({
          schema: 'ActiveRuntimeSelector/v1',
          generation: 'foreign-selector',
          runtime: 'vida-agent',
          bundle_root: 'vida-agent',
          config_path: 'agent-runtime.config.v1.yaml',
          payload_manifest_sha256: sha('foreign'),
        }),
      );
    const expectedDenial = ['source bytes', 'inventory addition'].includes(change)
      ? 'vida runtime-config rebind: Source drift requires the applied same-operation source correction under its original fence'
      : /differs|differ|rejects an active selector/;
    await Promise.resolve(expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(expectedDenial));
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  },
  30_000,
);

test('a consumer without selector cannot use Source rebind', async () => {
  const f = fixture();
  rmSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'));
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/only for the Source project/),
  );
  expect(databaseState(f)).toEqual(before);
});

test('Source rejects a preexisting consumer-shaped selector without state changes', async () => {
  const f = fixture({ sourceMode: true });
  f.put(
    '.agent/active-runtime-selector.v1.json',
    json({
      schema: 'ActiveRuntimeSelector/v1',
      generation: 'foreign-selector',
      runtime: 'vida-agent',
      bundle_root: 'vida-agent',
      config_path: 'agent-runtime.config.v1.yaml',
      payload_manifest_sha256: sha('foreign'),
    }),
  );
  const before = databaseState(f);
  for (const mode of ['inspect', 'plan'])
    await Promise.resolve(expect(runReconcileArtifacts(f.args(mode))).rejects.toThrow(/Source configuration rejects/));
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
}, 30_000);

test('Source inventory rejects linked directories before traversal and bounds enumeration', async () => {
  const f = fixture({ sourceMode: true });
  const directory = path.join(f.root, f.bundle, 'src');
  renameSync(directory, directory + '-original');
  f.put('external/file.ts', '// outside Source');
  symlinkSync(path.join(f.root, 'external'), directory, process.platform === 'win32' ? 'junction' : 'dir');
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/symlink|reparse|boundary|link/),
  );
  expect(databaseState(f)).toEqual(before);
  const g = fixture({ sourceMode: true });
  for (let i = 0; i < 513; i++) g.put(g.bundle + '/src/config/entry-' + i + '.ts', '// bounded fixture');
  const otherBefore = databaseState(g);
  await Promise.resolve(
    expect(runReconcileArtifacts(g.args('inspect'))).rejects.toThrow(/inventory exceeds the path bound/),
  );
  expect(databaseState(g)).toEqual(otherBefore);
}, 30_000);

test('reasoning-only targets are accepted while invalid reasoning and unrelated profiles are denied', async () => {
  const f = fixture();
  f.put('proposed.yaml', f.oldYaml.replace(/(model: gpt-6-sol\r?\n      reasoning:) high/, '$1 max'));
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const invalidReasoning = f.target.replace(
    /(    executor:\r?\n      model: [^\r\n]+\r?\n      reasoning:) medium/,
    '$1 123',
  );
  expect(invalidReasoning).not.toBe(f.target);
  f.put('proposed.yaml', invalidReasoning);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/validation failed/));
  const invalidModel = f.target.replace(/(    executor:\r?\n      model:) [^\r\n]+/, '$1 123');
  expect(invalidModel).not.toBe(f.target);
  f.put('proposed.yaml', invalidModel);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/validation failed/));
  f.put('proposed.yaml', f.target.replace(/(architect:\r?\n      model:) [^\r\n]+/, '$1 another-model'));
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/only requested executor/));
  expect(databaseState(f)).toEqual(before);
});

test('prewriter template adoption preserves a multi-project registry and rejects unrelated changes', async () => {
  const f = fixture({ sourceMode: true, extraProject: true });
  const target = parseRuntimeConfigYaml(f.oldYaml);
  const baseline = withoutPrewriterTemplateDelta(target);
  f.put('agent-runtime.config.v1.yaml', json(baseline));
  f.put('.agent/runtime-initialization.v1.json', json({ ...f.receipt, config_digest: runtimeConfigDigest(baseline) }));
  f.put('proposed.yaml', json(target));
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const mutateCandidates: readonly ((value: AgentRuntimeConfig) => AgentRuntimeConfig)[] = [
    (value) => withProjectTitle(value, 1, 'foreign project change'),
    withoutLastProject,
    (value) => withAgentProfileChange(value, 'architect', { reasoning: 'low' }),
  ];
  for (const mutate of mutateCandidates) {
    const changed = mutate(target);
    f.put('proposed.yaml', json(changed));
    await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow());
    expect(databaseState(f)).toEqual(before);
  }
  f.put('proposed.yaml', json(target));
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(target));
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const adopted = loadRuntimeConfig(f.root);
  expect(adopted.projects).toEqual(baseline.projects);
  expect(adopted.integrations).toEqual(baseline.integrations);
  for (const id of ['implementation_new', 'implementation_change', 'bug_fix', 'task_execution'])
    expect(requiredRuntimeWorkflow(adopted, id).stages.some((stage) => stage.id === 'review_source_prewrite')).toBe(
      true,
    );
}, 120_000);

test('a new normal config operation adopts only the approved prewriter delta after delivery closes', async () => {
  const f = deliveryFixture(),
    baseline = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.oldYaml)),
    deliveryTarget = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.target)),
    prewriterTarget = parseRuntimeConfigYaml(f.target),
    receipt = checkedFixtureInitializationReceipt(
      f,
      readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'),
    ),
    deliveryOperationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json');
  f.put('accepted-baseline.yaml', json(baseline));
  f.put('agent-runtime.config.v1.yaml', json(deliveryTarget));
  f.put('.agent/runtime-initialization.v1.json', json({ ...receipt, config_digest: runtimeConfigDigest(baseline) }));

  expect((await runReconcileArtifacts(f.deliveryArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
  const frozenDeliveryOperation = readFileSync(deliveryOperationPath),
    frozenDeliveryValue = checkedRecord(
      parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(frozenDeliveryOperation)),
      'completed delivery operation',
    ),
    normalOperationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json'),
    normalArgs = (mode: string) => {
      const args = f.args(mode);
      const instructionRefIndex = args.indexOf('--instruction-ref');
      if (instructionRefIndex >= 0)
        args[instructionRefIndex + 1] =
          'TEST SETUP: adopt approved prewriter workflow template after prior delivery closure';
      return args;
    },
    beforeRejectedTarget = databaseState(f),
    authoredBaseline = readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'));
  expect(frozenDeliveryValue.phase).toBe('applied');
  expect(frozenDeliveryValue.maintenance_released).toBe(true);

  const unrelatedTarget = withAgentProfileChange(prewriterTarget, 'architect', { reasoning: 'high' });
  f.put('proposed.yaml', json(unrelatedTarget));
  await Promise.resolve(
    expect(runReconcileArtifacts(normalArgs('inspect'))).rejects.toThrow(/approved prewriter workflow template delta/),
  );
  expect(databaseState(f)).toEqual(beforeRejectedTarget);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(authoredBaseline);
  expect(readFileSync(deliveryOperationPath)).toEqual(frozenDeliveryOperation);
  expect(existsSync(normalOperationPath)).toBe(false);

  f.put('proposed.yaml', json(prewriterTarget));
  expect((await runReconcileArtifacts(normalArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(normalArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(normalArgs('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(prewriterTarget));
  expect((await runReconcileArtifacts(normalArgs('resume'))).status).toBe('applied');

  const adopted = loadRuntimeConfig(f.root),
    completedNormalOperation = checkedRecord(
      parseFixtureJson(readFileSync(normalOperationPath, 'utf8')),
      'completed normal operation',
    );
  for (const role of ['source-planner', 'security-prewriter']) {
    const adoptedInstruction = adopted.agents.role_instructions[role],
      expectedInstruction = prewriterTarget.agents.role_instructions[role],
      adoptedTeam = adopted.teams['default-development'],
      expectedTeam = prewriterTarget.teams['default-development'];
    if (
      adoptedInstruction === undefined ||
      expectedInstruction === undefined ||
      adoptedTeam === undefined ||
      expectedTeam === undefined
    )
      throw Error(`Fixture config is missing role ${role}`);
    const adoptedRole = adoptedTeam.roles[role],
      expectedRole = expectedTeam.roles[role];
    if (adoptedRole === undefined || expectedRole === undefined) throw Error(`Fixture team is missing role ${role}`);
    expect(adoptedInstruction).toEqual(expectedInstruction);
    expect(adoptedRole).toBe(expectedRole);
  }
  const lifecycleContract = adopted.artifact_contracts['LifecyclePreparationObservation/v1'];
  if (lifecycleContract === undefined) throw Error('Fixture lifecycle preparation contract is missing');
  expect(lifecycleContract.required_fields).toEqual([
    'schema',
    'record_id',
    'kind',
    'work_id',
    'attempt',
    'source_revision',
    'scope_id',
    'config_digest',
    'ac_ids',
    'observed_at',
    'observer_id',
    'status',
    'evidence_refs',
    'observations',
    'gaps',
  ]);
  const requiredStageIds: readonly [string, string][] = [
    ['implementation_new', 'develop_change'],
    ['implementation_change', 'develop_change'],
    ['bug_fix', 'develop_fix'],
    ['task_execution', 'develop_task'],
  ];
  for (const [workflowId, developerId] of requiredStageIds) {
    const workflow = requiredWorkflow(adopted, workflowId),
      expectedWorkflow = requiredWorkflow(prewriterTarget, workflowId),
      review = workflow.stages.find((stage) => stage.id === 'review_source_prewrite');
    expect(review).toEqual(expectedWorkflow.stages.find((stage) => stage.id === 'review_source_prewrite'));
    if (!review) throw Error(`Fixture workflow ${workflowId} has no source review stage`);
    expect(review.required_after).toEqual(['synthesize_task']);
    const developerStage = workflow.stages.find((stage) => stage.id === developerId);
    if (!developerStage) throw Error(`Fixture workflow ${workflowId} has no developer stage`);
    expect(developerStage.required_after).toEqual(['review_source_prewrite']);
  }
  expect(completedNormalOperation.schema).toBe('ConfigRebindOperation/v1');
  expect(completedNormalOperation.phase).toBe('applied');
  expect(completedNormalOperation.maintenance_released).toBe(true);
  const normalOperationPlan = requiredCliObject(completedNormalOperation, 'plan', 'completed normal operation plan'),
    normalOperationId = requiredCliString(normalOperationPlan, 'operation_id', 'normal operation id'),
    normalEdge = readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId);
  expect(canonicalJson(normalEdge.value)).toBe(canonicalJson(completedNormalOperation));
  expect(normalEdge.receipt.value.config_digest).toBe(runtimeConfigDigest(adopted));
  const savedNormal = readFileSync(normalOperationPath);
  for (const patch of [{ maintenance_released: false }, { phase: 'fenced' }, { plan_digest: '0'.repeat(64) }]) {
    writeFileSync(normalOperationPath, json({ ...completedNormalOperation, ...patch }));
    expect(() => readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId)).toThrow();
  }
  writeFileSync(normalOperationPath, savedNormal);
  expect(readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId).bytes).toEqual(savedNormal);
  const forgedPlan = { ...normalOperationPlan, actor: 'forged-controller' };
  writeFileSync(
    normalOperationPath,
    json({ ...completedNormalOperation, plan: forgedPlan, plan_digest: canonicalJsonDigest(forgedPlan) }),
  );
  expect(() => readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId)).toThrow(
    /typed Host maintenance release/,
  );
  writeFileSync(normalOperationPath, savedNormal);
  expect(readFileSync(deliveryOperationPath)).toEqual(frozenDeliveryOperation);
  expect(JSON.parse(readFileSync(deliveryOperationPath, 'utf8'))).toEqual(frozenDeliveryValue);
}, 120_000);

test.each(['source bytes', 'selector appearance'])(
  'Source rebind preserves its fence after post-authoring %s drift',
  async (change) => {
    const f = fixture({ sourceMode: true });
    await runReconcileArtifacts(f.args('plan'));
    await runReconcileArtifacts(f.args('apply'));
    const held = fence(f);
    f.put('agent-runtime.config.v1.yaml', f.target);
    if (change === 'source bytes') f.put(f.bundle + '/bin/run.ts', '// changed Source');
    else f.put('.agent/active-runtime-selector.v1.json', json({ schema: 'ActiveRuntimeSelector/v1' }));
    const expectedDenial =
      change === 'source bytes'
        ? 'vida runtime-config rebind: Source drift requires the applied same-operation source correction under its original fence'
        : /differs|differ|rejects an active selector/;
    await Promise.resolve(expect(runReconcileArtifacts(f.args('resume'))).rejects.toThrow(expectedDenial));
    expect(fence(f)).toEqual(held);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
      f.receipt,
    );
  },
  30_000,
);

test('no-effect abandonment releases its own fence; receipt-applied rollback is always denied', async () => {
  const f = fixture();
  await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  const held = fence(f);
  if (held === null) throw Error('Applied fixture operation did not retain its maintenance fence');
  expect(held.status).toBe('held');
  expect(held.binding.operation_id).toBe('fixture-rebind');
  const result = await runReconcileArtifacts(f.args('restore'));
  expect(result.status).toBe('abandoned_no_effect');
  expect(result.rollback_performed).toBe(false);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  const released = fence(f);
  expect(released).toEqual({ ...held, revision: held.revision + 1, status: 'released' });
  expect((await runReconcileArtifacts(f.args('restore'))).status).toBe('abandoned_no_effect');
  expect(fence(f)).toEqual(released);
  const g = fixture();
  await runReconcileArtifacts(g.args('plan'));
  await runReconcileArtifacts(g.args('apply'));
  g.put('agent-runtime.config.v1.yaml', g.target);
  await runReconcileArtifacts(g.args('resume'));
  await Promise.resolve(expect(runReconcileArtifacts(g.args('restore'))).rejects.toThrow(/rollback/));
}, 30_000);

const persistedEffectDenialCases: readonly [string, SeedStateOptions, RegExp][] = [
  ['active lease with matching ownership', { lease: true }, /queued\/active ownership blocks rebind/],
  ['started assignment', { effect: 'started' }, /active\/uncertain work/],
  ['uncertain assignment', { effect: 'uncertain' }, /active\/uncertain work/],
  ['queued ticket', { ticketStatus: 'queued' }, /queued\/active ownership/],
  ['active ticket', { ticketStatus: 'active' }, /queued\/active ownership/],
  ['active claim', { activeClaim: true }, /queued\/active ownership/],
  ['issued native outcome', { native: true, issued: true }, /issued native outcome/],
];
test.each(persistedEffectDenialCases)(
  '%s denies inspect and plan without changing persisted state',
  async (_name, setup, message) => {
    const f = fixture();
    seedState(f, setup);
    const persisted = databaseState(f);
    for (const mode of ['inspect', 'plan'])
      await Promise.resolve(expect(runReconcileArtifacts(f.args(mode))).rejects.toThrow(message));
    expect(databaseState(f)).toEqual(persisted);
    expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
  },
);

test('target cannot move operational/path fields or edit YAML before held fence', async () => {
  const f = fixture();
  f.put(
    'proposed.yaml',
    f.target.replace(/^config_revision: (\d+)$/m, (_, n) => `config_revision: ${Number(n) + 1}`),
  );
  await Promise.resolve(expect(runReconcileArtifacts(f.args('plan'))).rejects.toThrow(/only requested/));
  const g = fixture();
  await runReconcileArtifacts(g.args('plan'));
  g.put('agent-runtime.config.v1.yaml', g.target);
  await Promise.resolve(expect(runReconcileArtifacts(g.args('apply'))).rejects.toThrow(/wait for held/));
});

test.each(['queued ownership', 'work', 'journal', 'governance'])(
  '%s arriving after preflight aborts acquisition without a new maintenance fence',
  async (change) => {
    const f = fixture();
    await runReconcileArtifacts(f.args('plan'));
    const original: MaintenanceFenceAcquisition = HostStateStore.prototype['acquireMaintenanceFenceWithRecordedToken'];
    let injected: FixtureDatabaseState | undefined;
    HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = function (
      this: HostStateStore,
      binding: Parameters<MaintenanceFenceAcquisition>[0],
      token: Parameters<MaintenanceFenceAcquisition>[1],
    ) {
      if (change === 'governance')
        withDatabase(f, (db) =>
          new HostStateStore(db, f.workspace).reserveOperation(
            'race',
            canonicalJsonDigest('operation'),
            canonicalJsonDigest('request'),
          ),
        );
      else seedState(f, change === 'queued ownership' ? { ticketStatus: 'queued' } : { native: change === 'journal' });
      injected = databaseState(f);
      return Reflect.apply(original, this, [binding, token]);
    };
    try {
      await Promise.resolve(
        expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(
          /ownership|global state differs|governance effect pending\/unknown/,
        ),
      );
      expect(fence(f)).toBeNull();
      if (injected === undefined) throw Error('Fixture state injection was not recorded');
      expect(databaseState(f)).toEqual(injected);
      expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
        f.receipt,
      );
    } finally {
      HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = original;
    }
  },
);

test('rebind preserves settled governance envelopes and refuses pending effects by outcome', async () => {
  const f = fixture();
  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace);
    const operation = store.reserveOperation(
      'settled',
      canonicalJsonDigest('operation'),
      canonicalJsonDigest('request'),
    );
    if (operation === null) throw Error('Settled governance fixture reservation was denied');
    store.transitionOperation(operation, 'commit_unknown');
    store.transitionOperation(operation, 'applied', canonicalJsonDigest('result'));
  });
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  expect(databaseState(f).agent_host_governance).toEqual(before.agent_host_governance);
});

test('a foreign maintenance fence acquired after preflight is preserved without conversion or phase effects', async () => {
  const f = fixture();
  await runReconcileArtifacts(f.args('plan'));
  const original: MaintenanceFenceAcquisition = HostStateStore.prototype['acquireMaintenanceFenceWithRecordedToken'];
  let foreign: ReturnType<MaintenanceFenceAcquisition>['fence'] | undefined, before: FixtureDatabaseState | undefined;
  HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = function (
    this: HostStateStore,
    binding: Parameters<MaintenanceFenceAcquisition>[0],
    token: Parameters<MaintenanceFenceAcquisition>[1],
  ) {
    withDatabase(f, (db) => {
      const owner = new HostStateStore(db, f.workspace, undefined, undefined, undefined, {
        principal: 'fixture:foreign-maintenance',
        projectIds: f.receipt.project_ids,
        verify: () => null,
      });
      foreign = owner.acquireMaintenanceFence({ ...binding, operation_id: 'foreign-operation' }).fence;
    });
    before = databaseState(f);
    return Reflect.apply(original, this, [binding, token]);
  };
  try {
    await Promise.resolve(
      expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(/maintenance\/global state differs/),
    );
    if (foreign === undefined || before === undefined) throw Error('Foreign maintenance fixture was not recorded');
    expect(fence(f)).toEqual(foreign);
    expect(databaseState(f)).toEqual(before);
  } finally {
    HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = original;
  }
});

test.each(['fence_acquired', 'fenced', 'receipt_rebound', 'applied', 'released'])(
  'interrupted %s resumes one current operation without duplicate receipt effects',
  async (phase: string) => {
    const f = fixture();
    await runReconcileArtifacts(f.args('plan'));
    const interrupt = (_phase: string) => {
      if (_phase === phase) throw Error('injected interruption');
    };
    if (['fence_acquired', 'fenced'].includes(phase)) {
      await Promise.resolve(
        expect(runReconcileArtifacts(f.args('apply'), { onPhase: interrupt })).rejects.toThrow(/injected/),
      );
      expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('author_config_required');
    } else await runReconcileArtifacts(f.args('apply'));
    f.put('agent-runtime.config.v1.yaml', f.target);
    if (!['fence_acquired', 'fenced'].includes(phase))
      await Promise.resolve(
        expect(runReconcileArtifacts(f.args('resume'), { onPhase: interrupt })).rejects.toThrow(/injected/),
      );
    expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  },
  // The serial lifecycle wrapper must settle before fixture teardown.
  0,
);

// Persisted requests and JSONB snapshots are synthetic TEST SETUP, never native outcomes.
function seedReadonlyUnknown(
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
    const reservation = reservationTarget
      ? persistedFixtureReservationData(f, db, identity, config, selection, reservationTarget.request)
      : undefined;
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

// Synthetic persisted engine observations are fixture setup, never external caller or Runtime evidence.
function historicalFixture(
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

test('historical owner inspection preserves the default when context history is omitted and denies an empty export', () => {
  const { f, request } = historicalFixture('unknown_readonly'),
    before = databaseState(f),
    engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  expect(() =>
    inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt, undefined),
  ).not.toThrow();
  expect(() => inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt, [])).toThrow(
    /original context collection must be a nonempty array/,
  );
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);
});

test.each(['completed_readonly', 'unknown_readonly', 'settled_writer_failed_validators'])(
  'historical %s releases only its original owner after config delivery and preserves all original evidence',
  async (predicate) => {
    const { f, args, state } = historicalFixture(predicate),
      before = databaseState(f),
      engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
    const inspected = await run(args('inspect'));
    expect(inspected.caller_identity_authenticated).toBe(false);
    expect(databaseState(f)).toEqual(before);
    f.put('release.json', json(inspected.request));
    const result = await run(args('apply'));
    expect(result.status).toBe('historical_owner_released');
    const after = databaseState(f);
    expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
    const workBefore = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(before, 'work')), f),
      workAfter = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
    expect(workAfter.lease).toBeNull();
    expect(workAfter.binding).toEqual(workBefore.binding);
    expect(workAfter.execution.assignment_attempts).toEqual(workBefore.execution.assignment_attempts);
    expect(workAfter.lifecycle.phase).toBe(workBefore.lifecycle.phase);
    expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(engineBefore)).toBe(true);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
      f.receipt,
    );
    expect((await run(args('apply'))).work_version).toEqual(result.work_version);
    expect(requiredSourceScope(state).digest).toBeTruthy();
  },
  30000,
);

test('public historical inspect runs from unrelated cwd while the ordinary receipt is stale', () => {
  const { f, args } = historicalFixture('completed_readonly'),
    before = databaseState(f);
  const actual = spawnSync(process.execPath, [path.join(source, 'bin/run.ts'), ...args('inspect')], {
    cwd: tmpdir(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  expect(actual.status).toBe(0);
  expect(actual.error).toBeUndefined();
  expect(checkedCliObject(parseFixtureJson(actual.stdout), 'historical CLI result').status).toBe(
    'historical_owner_release_inspected',
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public unissued owner release preserves its inert frontier and denies completed-readonly fiction', async () => {
  const { f, args, state, request } = historicalFixture('unissued_prepared'),
    before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const legacy = { ...request, schema: 'HistoricalOwnerReleaseRequest/v1', predicate: 'completed_readonly' };
  f.put('release.json', json(legacy));
  const oldArgs = args('inspect');
  oldArgs[0] = '--release-historical-owner';
  await Promise.resolve(expect(run(oldArgs)).rejects.toThrow('completed readonly'));
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(request));
  const wrongOwner = args('inspect');
  wrongOwner[7] = 'foreign-owner';
  await Promise.resolve(expect(run(wrongOwner)).rejects.toThrow('original owner differs'));
  const inspected = await run(args('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  const after = databaseState(f),
    work = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(work.lease).toBeNull();
  expect(work.execution.status).toBe('suspended');
  expect(work.lifecycle.next_action).toContain('unissued frontier remains inert');
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(engine)).toBe(true);
  expect(state.items.every((item) => item.issue_id === null && item.observation === null)).toBe(true);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public historical context history uses retained context after mutable documentation changes', async () => {
  const { f, args, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  f.put(
    'retained-run.json',
    json({
      schema: 'VidaAgentRunResult/v1',
      next_actions: configuredContexts.map((context) => ({ configured_context: context })),
    }),
  );
  f.put(fixtureContextPath, 'Current changed documentation');
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow('original configured requests differ'));
  const withHistory = (mode: string) => [...args(mode), '--context-history', 'retained-run.json'];
  const foreign = structuredClone(firstConfiguredContext(configuredContexts));
  foreign.work_id = 'foreign-work';
  f.put(
    'retained-run.json',
    json({ schema: 'VidaAgentRunResult/v1', next_actions: [{ configured_context: foreign }] }),
  );
  await Promise.resolve(expect(run(withHistory('inspect'))).rejects.toThrow('identity invalid'));
  expect(databaseState(f)).toEqual(before);
  f.put(
    'retained-run.json',
    json({
      schema: 'VidaAgentRunResult/v1',
      next_actions: configuredContexts.map((context) => ({ configured_context: context })),
    }),
  );
  const inspected = await run(withHistory('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  expect((await run(withHistory('apply'))).status).toBe('historical_owner_released');
  expect((await run(withHistory('apply'))).rights_granted).toBe(false);
}, 30000);

test('public unissued owner release rejects an issued frontier without disposing its lease', async () => {
  const { f, args, request } = historicalFixture('unknown_readonly'),
    before = databaseState(f);
  f.put('release.json', json({ ...request, schema: 'UnissuedOwnerReleaseRequest/v1', predicate: 'unissued_prepared' }));
  const signal = args('inspect');
  signal[0] = '--release-unissued-owner';
  await Promise.resolve(expect(run(signal)).rejects.toThrow('issued or reserved activity'));
  expect(databaseState(f)).toEqual(before);
});

test('historical owner release rejects maintenance drift between predicate and write preparation', () => {
  const { f, request } = historicalFixture('unissued_prepared'),
    before = databaseState(f),
    original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, 1),
    expectedWork = original.owner.version,
    expectedLedger = original.workspace.ledger_version,
    projectId = requiredElement(request.identity.project_ids, 0, 'historical owner project id');
  if (expectedWork === null || expectedLedger === null)
    throw Error('Historical owner fixture lacks current Work or Coordination versions');
  withDatabase(f, (db) => {
    const actual = new HostStateStore(db, f.workspace);
    let reads = 0;
    const readSnapshot = actual.readHostStateSnapshot.bind(actual);
    actual.readHostStateSnapshot = (identity: WorkIdentity) => {
      const snapshot = readSnapshot(identity);
      return ++reads === 2 ? { ...snapshot, maintenanceGeneration: snapshot.maintenanceGeneration + 1 } : snapshot;
    };
    try {
      expect(() =>
        suspendHistoricalOwnerWork({
          store: actual,
          identity: request.identity,
          journal: { state: original.journal.state, version: original.journal.version, resume_status: 'ready' },
          expectedWork,
          expectedLedger,
          expectedMaintenanceGeneration: original.maintenanceGeneration,
          nativeSessionHandle: 'fixture-thread',
          userRequestPointer: request.userRequestPointer,
          requestIntent: request.requestIntent,
          config: original.config,
          predicate: 'unissued_prepared',
          documentationContext: {
            repository_root: f.root,
            repository_id: request.identity.repository_id,
            project_id: projectId,
            work_id: request.identity.work_id,
          },
        }),
      ).toThrow('maintenance generation changed after inspection');
    } finally {
      actual.readHostStateSnapshot = readSnapshot;
    }
  });
  expect(databaseState(f)).toEqual(before);
});

function seedKnownTerminalSynthesisCustody(
  f: RuntimeFixture,
  request: HistoricalFixture['request'],
  state: FixtureJournal,
): ReturnType<HostStateStore['captureHistoricalTerminalSynthesisAndRelease']>;
function seedKnownTerminalSynthesisCustody<TResult>(
  f: RuntimeFixture,
  request: HistoricalFixture['request'],
  state: FixtureJournal,
  receiptMutation: (input: ReceiptMutationInput) => TResult,
): TResult;
function seedKnownTerminalSynthesisCustody(
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

test('known terminal synthesis custody is accepted by read-only config rebind with the original Journal still pending', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  expect(completedResearch).toHaveLength(2);
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const before = databaseState(f),
    capture = seedKnownTerminalSynthesisCustody(f, request, state);
  expect(capture.receipt.terminal_status).toBe('known_terminal_unaccepted');
  expect(capture.receipt.accepted_result).toBe(false);
  expect(requiredSessionLedgerPayload(databaseState(f))).toBe(requiredSessionLedgerPayload(before));
  const captured = databaseState(f);
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const inspected = await runReconcileArtifacts(f.args('inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(captured);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  const journal = parseSessionJournalPayload(
    checkedString(
      requiredElement(captured.agent_host_mastra_session_ledger, 0, 'captured session ledger').payload,
      'ledger payload',
    ),
  );
  expect(requiredElement(journal.items, 0, 'captured journal item').observation).toBeNull();
  const work = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(captured, 'work')), f);
  expect(work.lifecycle.next_action).toContain('known terminal but unaccepted');
  expect(work.artifacts.some((artifact) => artifact.schema === 'ResearchSynthesis/v1')).toBe(false);
}, 30000);

test('terminal synthesis custody survives unrelated ledger progress and subsequent config repairs', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted');
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: state.completed.flatMap((wave) => wave.items).length,
    activationOnlyIndex: state.completed.flatMap((wave) => wave.items).length,
  });
  seedKnownTerminalSynthesisCustody(f, request, state);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='ledger'",
        'terminal custody ledger',
        f.workspace,
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload));
    ledger.revision += 1;
    db.query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE rowid=?').run(
      ledger.revision,
      json(ledger),
      canonicalJsonDigest(ledger),
      row.rowid,
    );
  });
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const before = databaseState(f);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const next = withAgentProfileChange(parseRuntimeConfigYaml(f.target), 'executor', { reasoning: 'high' });
  f.put('proposed.yaml', json(next));
  const nextArgs = (mode: string) => {
    const values = f.args(mode);
    values[values.indexOf('--repair-id') + 1] = 'fixture-terminal-next';
    return values;
  };
  expect((await runReconcileArtifacts(nextArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(nextArgs('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(next));
  expect((await runReconcileArtifacts(nextArgs('resume'))).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_historical_terminal_synthesis_capture).toEqual(
    before.agent_host_historical_terminal_synthesis_capture,
  );
}, 90_000);

test('public capture CLI exact resume reuses the Host poststate fence without writes', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    pendingSynthesisIndex = state.completed.flatMap((wave) => wave.items).length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt),
    item = firstJournalItem(original.journal.state),
    predecessors = admittedResearchResultsForSynthesis({
      repositoryRoot: f.root,
      config: original.config,
      journal: { ...original.journal, resume_status: mastraLedgerStatus(original.journal.state) },
      work: original.owner.state,
      workflowId: item.request.workflow_id,
    }),
    source = requiredElement(synthesisSourceCatalog(predecessors).sources, 0, 'synthesis source'),
    sourceRef = source.key,
    summary = json({
      schema: 'VidaSynthesisObservationOutput/v1',
      topic: 'Bounded terminal synthesis evidence',
      findings: [
        {
          finding_id: 'synthesis-finding',
          statement: 'The admitted sources support the scoped conclusion.',
          source_refs: [sourceRef],
          evidence_class: 'Static',
          status: 'confirmed',
        },
      ],
      uncertainties: [],
      conflicts: [],
      br_ids: ['BR-1'],
      sr_ids: ['SR-1'],
      ac_ids: ['AC-1'],
      gap_ids: [],
      options: [
        {
          option_id: 'option-evidence',
          label: 'Use admitted evidence',
          description: 'Keep the conclusion within the accepted sources.',
          evidence_refs: [sourceRef],
        },
      ],
      recommendation: {
        option_id: 'option-evidence',
        rationale: 'The admitted evidence supports the scoped conclusion.',
        evidence_refs: [sourceRef],
      },
      completeness: {
        status: 'blocked',
        required_questions: [],
        answered_questions: [],
        missing_questions: [],
        material_gaps: ['GAP-VIDA-RUN-EXECUTION-001'],
        external_validation: {
          required: true,
          source_count: 2,
          minimum_sources: 2,
          status: 'blocked',
          live_check: false,
        },
      },
      readiness: 'blocked',
    }),
    body = {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      agent_id: 'fixture:research-synthesizer',
      tool_call_ref: 'fixture:terminal-followup',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: [sourceRef],
    },
    bodyRef = '.tmp/synthesis-body.json',
    inputRef = '.tmp/synthesis-input.json',
    reportRef = '.tmp/synthesis-report.json',
    reportBodyRef = '.tmp/synthesis-report-body.json',
    requestRef = '.tmp/terminal-synthesis-capture.json',
    denial = {
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-EXECUTION-001',
      message: 'The requested run was blocked by runtime validation.',
    },
    input = { status: body.status, agent_id: body.agent_id, tool_call_ref: body.tool_call_ref },
    report = {
      exit_code: 1,
      input_path: path.resolve(f.root, inputRef),
      command: ['vida-agent', '--report', path.resolve(f.root, reportBodyRef)],
      stderr: json(denial).trim(),
    },
    base = {
      schema: 'HistoricalTerminalSynthesisCaptureRequest/v1',
      identity: request.identity,
      attempt: request.attempt,
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      body_ref: bodyRef,
      input_ref: inputRef,
      report_ref: reportRef,
      followup_ref: body.tool_call_ref,
      userRequestPointer: request.userRequestPointer,
      requestIntent: request.requestIntent,
    };
  f.put(bodyRef, json(body));
  f.put(inputRef, json(input));
  f.put(reportRef, json(report));
  f.put(reportBodyRef, json(body));
  f.put(requestRef, json(base));
  const args = (mode: string): string[] => [
    '--capture-historical-terminal-synthesis',
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
    requestRef,
  ];
  const inspected = await run(args('inspect'));
  expect(inspected.status).toBe('historical_terminal_synthesis_capture_inspected');
  f.put(requestRef, json(inspected.request));
  const applied = await run(args('apply'));
  expect(applied.status).toBe('historical_terminal_synthesis_captured');
  expect(applied.rights_granted).toBe(false);
  expect(applied.accepted_result).toBe(false);
  const beforeResume = databaseState(f),
    engineBeforeResume = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const reinspected = await run(args('inspect'));
  expect(reinspected.status).toBe('historical_terminal_synthesis_capture_inspected');
  expect(reinspected.custody_receipt_present).toBe(true);
  expect(reinspected.request_digest).toBe(applied.request_digest);
  expect(databaseState(f)).toEqual(beforeResume);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBeforeResume);
  const resumed = await run(args('resume'));
  expect(resumed.status).toBe('historical_terminal_synthesis_captured');
  expect(resumed.receipt).toEqual(applied.receipt);
  expect(resumed.rights_granted).toBe(false);
  expect(resumed.caller_authorization_required).toBe(true);
  expect(databaseState(f)).toEqual(beforeResume);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBeforeResume);
}, 30000);

test('terminal synthesis predicate accepts only its exact known target with official-docs egress', () => {
  const terminal = historicalFixture('terminal_synthesis_unaccepted');
  const completedResearch = terminal.state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  expect(completedResearch).toHaveLength(2);
  seedHistoricalResearchLineage(terminal.f, terminal.request, terminal.state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const original = inspectHistoricalOwnerContext(
    terminal.f.root,
    'baseline.yaml',
    terminal.request.identity,
    terminal.request.attempt,
  );
  const target = original.journal.state.items.find((item) => item.issue_id !== null && item.observation === null);
  if (!target || target.issue_id === null) throw Error('Terminal synthesis fixture action is missing');
  const workflow = requiredWorkflow(original.config, target.request.workflow_id),
    stage = workflow.stages.find((entry) => entry.id === target.request.stage_id);
  if (!stage) throw Error('Terminal synthesis fixture stage is missing');
  const assignment = requiredElement(stage.assignments, target.request.assignment_index, 'terminal fixture assignment'),
    profile = requiredProfile(original.config, assignment.profile);
  expect(stage.id).toBe('synthesize_task');
  const egressPolicy = original.config.agents.egress_policies[profile.egress_policy];
  if (!egressPolicy) throw Error('Terminal synthesis fixture egress policy is missing');
  expect(egressPolicy.allowed_hosts.length).toBeGreaterThan(0);
  const capture = {
    actionId: target.request.action_id,
    issueId: target.issue_id,
    bodyBytes: Buffer.from(
      json({
        schema: 'VidaSessionObservation/v1',
        action_id: target.request.action_id,
        issue_id: target.issue_id,
        status: 'reported_complete',
        agent_id: 'fixture:research-synthesizer',
        tool_call_ref: 'fixture:terminal-body',
        summary: 'Known terminal synthesis fixture',
        output_digest: '0'.repeat(64),
        evidence_refs: [],
      }),
    ),
    provenance: {
      schema: 'HistoricalTerminalSynthesisProvenance/v1',
      body_ref: '.tmp/synthesis-body.json',
      input_ref: '.tmp/synthesis-input.json',
      report_ref: '.tmp/synthesis-report.json',
      followup_ref: 'fixture:terminal-body',
      original_actor_id: 'fixture:research-synthesizer',
      denial_status: 'blocked',
      denial_code: 'GAP-VIDA-RUN-EXECUTION-001',
      denial_message: 'The requested run was blocked by runtime validation.',
      denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
      input_bytes_base64: '',
      report_bytes_base64: '',
      predecessor_refs: [
        { result_id: 'result-one', digest: 'a'.repeat(64) },
        { result_id: 'result-two', digest: 'b'.repeat(64) },
      ],
    },
  } satisfies NonNullable<Parameters<typeof inspectHistoricalOwnerWork>[0]['capture']>;
  const terminalInput: Omit<Parameters<typeof inspectHistoricalOwnerWork>[0], 'store'> = {
    identity: terminal.request.identity,
    journal: {
      state: original.journal.state,
      version: original.journal.version,
      resume_status: 'issued_outcome_uncertain',
    },
    expectedWork: requiredStateVersion(original.owner.version, 'terminal Work version'),
    expectedLedger: requiredStateVersion(original.workspace.ledger_version, 'terminal Coordination version'),
    expectedMaintenanceGeneration: original.maintenanceGeneration,
    nativeSessionHandle: 'fixture-thread',
    userRequestPointer: terminal.request.userRequestPointer,
    requestIntent: terminal.request.requestIntent,
    config: original.config,
    predicate: 'terminal_synthesis_unaccepted',
    capture,
    documentationContext: {
      repository_root: terminal.f.root,
      repository_id: terminal.request.identity.repository_id,
      project_id: requiredElement(terminal.request.identity.project_ids, 0, 'terminal project id'),
      work_id: terminal.request.identity.work_id,
    },
  };
  const terminalBefore = databaseState(terminal.f),
    terminalEngine = readFileSync(path.join(terminal.f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  withDatabase(terminal.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({ store: new HostStateStore(db, terminal.f.workspace), ...terminalInput }),
    ).not.toThrow(),
  );
  expect(databaseState(terminal.f)).toEqual(terminalBefore);
  expect(readFileSync(path.join(terminal.f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(terminalEngine);

  const wrongStage: MastraSessionLedgerState = {
    ...terminalInput.journal.state,
    items: terminalInput.journal.state.items.map((item, index) =>
      index === 0 ? { ...item, request: { ...item.request, stage_id: 'develop_change' } } : item,
    ),
  };
  const wrongStageInput = {
    ...terminalInput,
    journal: {
      ...terminalInput.journal,
      state: wrongStage,
      version: { ...terminalInput.journal.version, digest: canonicalJsonDigest(wrongStage) },
    },
  };
  withDatabase(terminal.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({ store: new HostStateStore(db, terminal.f.workspace), ...wrongStageInput }),
    ).toThrow(/historical synthesis candidate is not one known-terminal/),
  );
  expect(databaseState(terminal.f)).toEqual(terminalBefore);

  const unknown = historicalFixture('unknown_readonly', { officialDocs: true }),
    unknownOriginal = inspectHistoricalOwnerContext(
      unknown.f.root,
      'baseline.yaml',
      unknown.request.identity,
      unknown.request.attempt,
    ),
    unknownTarget = firstJournalItem(unknownOriginal.journal.state),
    unknownWorkflow = requiredWorkflow(unknownOriginal.config, unknownTarget.request.workflow_id),
    unknownStage = unknownWorkflow.stages.find((entry) => entry.id === unknownTarget.request.stage_id);
  if (!unknownStage) throw Error('Unknown readonly fixture stage is missing');
  const unknownAssignment = requiredElement(
    unknownStage.assignments,
    unknownTarget.request.assignment_index,
    'unknown readonly fixture assignment',
  );
  const unknownProfile = requiredProfile(unknownOriginal.config, unknownAssignment.profile);
  const unknownEgressPolicy = unknownOriginal.config.agents.egress_policies[unknownProfile.egress_policy];
  if (!unknownEgressPolicy) throw Error('Unknown readonly fixture egress policy is missing');
  expect(unknownEgressPolicy.allowed_hosts.length).toBeGreaterThan(0);
  const unknownBefore = databaseState(unknown.f),
    unknownEngine = readFileSync(path.join(unknown.f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  withDatabase(unknown.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({
        store: new HostStateStore(db, unknown.f.workspace),
        identity: unknown.request.identity,
        journal: {
          state: unknownOriginal.journal.state,
          version: unknownOriginal.journal.version,
          resume_status: 'issued_outcome_uncertain',
        },
        expectedWork: requiredStateVersion(unknownOriginal.owner.version, 'unknown Work version'),
        expectedLedger: requiredStateVersion(unknownOriginal.workspace.ledger_version, 'unknown Coordination version'),
        expectedMaintenanceGeneration: unknownOriginal.maintenanceGeneration,
        nativeSessionHandle: 'fixture-thread',
        userRequestPointer: unknown.request.userRequestPointer,
        requestIntent: unknown.request.requestIntent,
        config: unknownOriginal.config,
        predicate: 'unknown_readonly',
        documentationContext: {
          repository_root: unknown.f.root,
          repository_id: unknown.request.identity.repository_id,
          project_id: requiredElement(unknown.request.identity.project_ids, 0, 'unknown readonly project id'),
          work_id: unknown.request.identity.work_id,
        },
      }),
    ).toThrow(/native action or host assignment is still active or uncertain/),
  );
  expect(databaseState(unknown.f)).toEqual(unknownBefore);
  expect(readFileSync(path.join(unknown.f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(unknownEngine);
}, 60_000);

test.each(['missing receipt', 'tampered receipt', 'denial provenance', 'invalid UTF-8 body', 'predecessor references'])(
  'known terminal synthesis config rebind denies %s without effects',
  async (change) => {
    const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
      completedResearch = state.completed.flatMap((wave) => wave.items),
      pendingSynthesisIndex = completedResearch.length;
    expect(completedResearch).toHaveLength(2);
    seedHistoricalResearchLineage(f, request, state, {
      includeCompleted: true,
      pendingIndex: pendingSynthesisIndex,
      activationOnlyIndex: pendingSynthesisIndex,
    });
    seedKnownTerminalSynthesisCustody(f, request, state, ({ db, capture: _capture, before, journal, candidate }) => {
      const receipt = new HostStateStore(db, f.workspace).readHistoricalTerminalSynthesisCapture(
        request.identity,
        request.attempt,
        candidate.request.action_id,
      );
      if (!receipt) throw Error('Fixture terminal synthesis receipt is missing');
      if (change === 'missing receipt') {
        db.query(
          'DELETE FROM agent_host_historical_terminal_synthesis_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        ).run(f.workspace, request.identity.work_id, request.attempt, candidate.request.action_id);
      } else {
        let altered: HistoricalTerminalSynthesisCaptureReceipt = receipt;
        if (change === 'tampered receipt')
          altered = { ...receipt, body_base64: Buffer.from('tampered').toString('base64') };
        else if (change === 'denial provenance') {
          const provenance = { ...receipt.provenance, denial_message: 'foreign denial' },
            changedRequest = { ...receipt.request, provenance };
          altered = {
            ...receipt,
            provenance,
            request: changedRequest,
            request_digest: canonicalJsonDigest(changedRequest),
          };
        } else if (change === 'predecessor references') {
          const provenance = {
              ...receipt.provenance,
              predecessor_refs: receipt.provenance.predecessor_refs.map((entry, index) =>
                index === 0 ? { ...entry, digest: 'f'.repeat(64) } : entry,
              ),
            },
            changedRequest = { ...receipt.request, provenance };
          altered = {
            ...receipt,
            provenance,
            request: changedRequest,
            request_digest: canonicalJsonDigest(changedRequest),
          };
        } else {
          const body = Buffer.from([0xff]),
            bodyBase64 = body.toString('base64'),
            changedRequest = { ...receipt.request, body_base64: bodyBase64 };
          altered = {
            ...receipt,
            body_base64: bodyBase64,
            body_byte_length: body.byteLength,
            body_sha256: sha(body),
            request: changedRequest,
            request_digest: canonicalJsonDigest(changedRequest),
          };
        }
        db.query(
          'UPDATE agent_host_historical_terminal_synthesis_capture SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        ).run(
          json(altered),
          canonicalJsonDigest(altered),
          f.workspace,
          request.identity.work_id,
          request.attempt,
          candidate.request.action_id,
        );
      }
      return { before, journal };
    });
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.put('proposed.yaml', f.target);
    const beforeInspect = databaseState(f);
    await Promise.resolve(
      expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown|custody|denial|UTF-8|digest/i),
    );
    expect(databaseState(f)).toEqual(beforeInspect);
  },
  30000,
);

test('known terminal reader denies unjournaled configuration drift before resolving capture-time authority', () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  seedKnownTerminalSynthesisCustody(f, request, state);
  const before = databaseState(f),
    config = withoutProducedSchema(
      loadRuntimeConfig(f.root),
      'implementation_new',
      'synthesize_task',
      'ResearchSynthesis/v1',
    );
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(
      'vida runtime-config rebind: issued native outcome is pending/unknown: vida runtime-config rebind: bound original configuration is unavailable',
    ),
  );
  expect(databaseState(f)).toEqual(before);
});

function seedHistoricalResearchLineage(
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

test('public settled research releases admitted lineage and preserves observations on exact retry', async () => {
  const { f, request, args, state } = historicalFixture('settled_research'),
    { work } = seedHistoricalResearchLineage(f, request, state);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public historical normalization resumes the original record-first request and exact replay under Host CAS', async () => {
  const { f, request, state } = historicalFixture('settled_research'),
    { materials } = seedHistoricalResearchLineage(f, request, state),
    { item, plan } = requiredResearchNormalizationItem(state.items);
  const recordBefore = readFileSync(path.join(f.root, plan.record_path), 'utf8'),
    changelogBefore = readFileSync(path.join(f.root, plan.changelog_path), 'utf8'),
    priorEvents = changelogBefore
      .split('\n')
      .filter(Boolean)
      .filter(
        (line) =>
          checkedString(checkedResearchChangelogEvent(line).path_after, 'changelog event path') !== plan.record_path,
      ),
    partialChangelog = priorEvents.length ? priorEvents.join('\n') + '\n' : '';
  expect(changelogBefore.split('\n').filter(Boolean).length).toBeGreaterThan(priorEvents.length);
  f.put(plan.changelog_path, partialChangelog);
  f.put('.githooks/pre-commit', 'Current source changed after the original reservation.\n');
  const resumeRequest = {
      schema: 'HistoricalNormalizationResumeRequest/v1',
      identity: request.identity,
      attempt: 1,
      action_id: item.request.action_id,
    },
    requestPath = '.tmp/historical-normalization-resume.json';
  f.put(requestPath, json(resumeRequest));
  const resumeArgs = (mode: string) => [
    '--resume-historical-normalization',
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
    requestPath,
  ];
  const beforeInspect = databaseState(f),
    inspected = await run(resumeArgs('inspect'));
  const originalOperationReference = requiredResearchOperationReference(
    requiredElement(materials, 0, 'research fixture material').scopeBytes,
  );
  expect(inspected.status).toBe('historical_normalization_resume_inspected');
  expect(inspected.record_missing).toBe(false);
  expect(inspected.caller_identity_authenticated).toBe(false);
  expect(inspected.caller_authorization_required).toBe(true);
  expect(
    checkedString(
      requiredCliObject(
        requiredCliObject(inspected, 'request', 'resume inspection request'),
        'inspection',
        'resume inspection',
      ).original_operation_reference,
      'inspected original operation reference',
    ),
  ).toBe(originalOperationReference);
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(beforeInspect);
  f.put(requestPath, json(inspected.request));
  const frozenRequest = readFileSync(path.join(f.root, requestPath), 'utf8'),
    applied = await run(resumeArgs('apply'));
  expect(applied.status).toBe('historical_normalization_resumed');
  expect(applied.replay).toBe(false);
  expect(applied.caller_identity_authenticated).toBe(false);
  expect(applied.caller_authorization_required).toBe(true);
  expect(checkedString(applied.original_operation_reference, 'applied original operation reference')).toBe(
    originalOperationReference,
  );
  expect(applied.rights_granted).toBe(false);
  expect(applied.runtime_acceptance).toBe(false);
  expect(readFileSync(path.join(f.root, plan.record_path), 'utf8')).toBe(recordBefore);
  expect(readFileSync(path.join(f.root, plan.changelog_path), 'utf8')).toBe(changelogBefore);
  expect(databaseState(f)).toEqual(beforeInspect);
  f.put(requestPath, frozenRequest);
  const replayed = await run(resumeArgs('resume'));
  expect(replayed.status).toBe('historical_normalization_resumed');
  expect(replayed.replay).toBe(true);
  expect(databaseState(f)).toEqual(beforeInspect);

  const maintenanceBinding = {
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: request.identity.project_ids,
      operation_id: 'historical-resume-fixture',
      manifest_digest: 'a'.repeat(64),
      request_digest: 'b'.repeat(64),
      bindings_digest: 'c'.repeat(64),
      closure_digest: 'd'.repeat(64),
      bundle_digest: 'e'.repeat(64),
    },
    maintenanceFence = {
      schema: 'MaintenanceFence/v1',
      workspace_id: f.workspace,
      revision: 1,
      generation: 1,
      status: 'released',
      binding: maintenanceBinding,
      token_digest: 'f'.repeat(64),
    };
  withDatabase(f, (db) =>
    db
      .query('INSERT INTO agent_host_maintenance VALUES(?,?,?,?)')
      .run(f.workspace, 1, json(maintenanceFence), canonicalJsonDigest(maintenanceFence)),
  );
  const afterMaintenance = databaseState(f);
  await Promise.resolve(expect(run(resumeArgs('resume'))).rejects.toThrow(/maintenance|original|reserved/));
  expect(databaseState(f)).toEqual(afterMaintenance);
}, 30000);

test('public historical normalization rejects foreign requests and stale Host CAS before file effects', async () => {
  const { f, request, state } = historicalFixture('settled_research');
  seedHistoricalResearchLineage(f, request, state);
  const { item, plan } = requiredResearchNormalizationItem(state.items),
    recordPath = path.join(f.root, plan.record_path),
    changelogPath = path.join(f.root, plan.changelog_path),
    changelog = readFileSync(changelogPath, 'utf8'),
    priorEvents = changelog
      .split('\n')
      .filter(Boolean)
      .filter(
        (line) =>
          checkedString(checkedResearchChangelogEvent(line).path_after, 'changelog event path') !== plan.record_path,
      );
  f.put(plan.changelog_path, priorEvents.length ? priorEvents.join('\n') + '\n' : '');
  const requestPath = '.tmp/historical-normalization-stale.json',
    requestBody = {
      schema: 'HistoricalNormalizationResumeRequest/v1',
      identity: request.identity,
      attempt: 1,
      action_id: item.request.action_id,
    };
  f.put(requestPath, json(requestBody));
  const resumeArgs = (mode: string) => [
    '--resume-historical-normalization',
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
    requestPath,
  ];
  const inspected = await run(resumeArgs('inspect'));
  f.put(requestPath, json(inspected.request));
  const beforeForeign = {
    database: databaseState(f),
    record: readFileSync(recordPath, 'utf8'),
    changelog: readFileSync(changelogPath, 'utf8'),
  };
  f.put(requestPath, json({ ...inspected.request, action_id: 'foreign-action' }));
  await Promise.resolve(expect(run(resumeArgs('apply'))).rejects.toThrow(/original|inspection|action/i));
  expect(readFileSync(recordPath, 'utf8')).toBe(beforeForeign.record);
  expect(readFileSync(changelogPath, 'utf8')).toBe(beforeForeign.changelog);
  expect(databaseState(f)).toEqual(beforeForeign.database);

  f.put(requestPath, json(inspected.request));
  const staleDatabase = databaseState(f);
  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace),
      before = store.readHostStateSnapshot(request.identity);
    store.compareAndSwapHostState(advanceFixtureHostSnapshot(before));
  });
  const changedHost = databaseState(f),
    beforeStale = { record: readFileSync(recordPath, 'utf8'), changelog: readFileSync(changelogPath, 'utf8') };
  await Promise.resolve(expect(run(resumeArgs('apply'))).rejects.toThrow(/changed|CAS|state|maintenance/i));
  expect(readFileSync(recordPath, 'utf8')).toBe(beforeStale.record);
  expect(readFileSync(changelogPath, 'utf8')).toBe(beforeStale.changelog);
  expect(databaseState(f)).toEqual(changedHost);
  expect(changedHost).not.toEqual(staleDatabase);
}, 30000);

test('public readonly bookkeeping releases a completed observation without normalization', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    unnormalizedIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { unnormalizedIndex }),
    unnormalized = requiredElement(state.items, unnormalizedIndex, 'unnormalized journal item');
  expect(requiredJournalObservation(unnormalized).status).toBe('reported_complete');
  expect(unnormalized.research_activation).toBeTruthy();
  expect(unnormalized.research_normalization).toBeUndefined();
  expect(work.artifacts.some((artifact) => artifact.artifact_id === 'research-' + unnormalizedIndex)).toBe(false);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public readonly bookkeeping keeps committed normalized lineage without adding missing Work admission', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    normalized = firstJournalItem(state),
    plan = normalized.research_normalization;
  if (!plan) throw Error('Readonly normalization fixture has no retained plan');
  expect(existsSync(path.join(f.root, plan.record_path))).toBe(true);
  const workWithoutNormalizedArtifact: WorkState = {
    ...work,
    artifacts: work.artifacts.filter((artifact) => artifact.path !== plan.record_path),
  };
  expect(workWithoutNormalizedArtifact.artifacts.some((artifact) => artifact.path === plan.record_path)).toBe(false);
  withDatabase(f, (db) =>
    db
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
      .run(json(workWithoutNormalizedArtifact), canonicalJsonDigest(workWithoutNormalizedArtifact)),
  );
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(workWithoutNormalizedArtifact.artifacts);
  expect(released.artifacts.some((artifact) => artifact.path === plan.record_path)).toBe(false);
  expect(released.lifecycle.next_action).toMatch(/canonical artifact GAPs/);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public readonly bookkeeping preserves a pending no-egress code-researcher issue as UNKNOWN', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { pendingIndex }),
    pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    config = loadRuntimeConfig(f.root),
    workflow = requiredWorkflow(config, pending.request.workflow_id),
    stage = workflow.stages.find((entry) => entry.id === pending.request.stage_id);
  if (!stage) throw Error('Pending fixture stage is missing from current config');
  const assignment = requiredElement(stage.assignments, pending.request.assignment_index, 'pending fixture assignment'),
    profile = requiredRuntimeAgentProfile(config, assignment.profile),
    egressPolicy = config.agents.egress_policies[profile.egress_policy];
  if (!egressPolicy) throw Error('Pending fixture egress policy is missing from current config');
  expect(pending.request.role).toBe('code-researcher');
  expect(egressPolicy.allowed_hosts).toHaveLength(0);
  expect(pending.issue_id).toBeTruthy();
  expect(pending.observation).toBeNull();
  expect(pending.research_activation).toBeTruthy();
  expect(pending.research_normalization).toBeUndefined();
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.execution.assignment_attempts).toEqual(work.execution.assignment_attempts);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('released readonly bookkeeping UNKNOWN remains frozen through config rebind', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { pendingIndex }),
    pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const releaseInspection = await run(args('inspect'));
  f.put('release.json', json(releaseInspection.request));
  const release = await run(args('apply'));
  expect(release.rights_granted).toBe(false);
  expect(release.runtime_acceptance).toBe(false);
  const releasedState = databaseState(f),
    releasedWork = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(releasedState, 'work')), f),
    retainedJournal = parseSessionJournalPayload(
      checkedString(
        requiredElement(releasedState.agent_host_mastra_session_ledger, 0, 'released session ledger').payload,
        'ledger payload',
      ),
    );
  expect(releasedWork.lease).toBeNull();
  expect(releasedWork.artifacts).toEqual(work.artifacts);
  expect(releasedWork.artifacts.some((artifact) => artifact.artifact_id === 'research-' + pendingIndex)).toBe(false);
  const retainedPending = requiredElement(retainedJournal.items, pendingIndex, 'retained pending journal item');
  expect(retainedPending.issue_id).toBe(pending.issue_id);
  expect(retainedPending.observation).toBeNull();
  expect(retainedPending.research_activation).toEqual(pending.research_activation);
  expect(retainedPending.research_normalization).toBeUndefined();
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);

  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const inspected = await runReconcileArtifacts(f.args('inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f).agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  expect(databaseState(f).agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = databaseState(f),
    afterJournal = parseSessionJournalPayload(
      checkedString(
        requiredElement(after.agent_host_mastra_session_ledger, 0, 'after session ledger').payload,
        'ledger payload',
      ),
    );
  expect(after.agent_host_state).toEqual(releasedState.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  const afterPending = requiredElement(afterJournal.items, pendingIndex, 'after pending journal item');
  expect(afterPending.observation).toBeNull();
  expect(afterPending.research_activation).toEqual(pending.research_activation);
  expect(afterPending.research_normalization).toBeUndefined();
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);
}, 30000);

test('released UNKNOWN uses its bound historical config through a second repair without replay', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspected = await run(args('inspect'));
  f.put('release.json', json(inspected.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.target);
  await runReconcileArtifacts(f.args('resume'));
  const before = databaseState(f);
  const target = withAgentProfileChange(parseRuntimeConfigYaml(f.target), 'executor', { reasoning: 'high' });
  f.put('proposed.yaml', json(target));
  const nextArgs = (mode: string) => {
    const values = f.args(mode);
    values[values.indexOf('--repair-id') + 1] = 'fixture-rebind-next';
    return values;
  };
  const priorPath = '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json';
  const priorBytes = readFileSync(path.join(f.root, priorPath));
  const unclosed = checkedRecord(
    parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(priorBytes)),
    'prior rebind operation',
  );
  unclosed.phase = 'planned';
  unclosed.maintenance_released = false;
  f.put(priorPath, json(unclosed));
  await Promise.resolve(
    expect(runReconcileArtifacts(nextArgs('inspect'))).rejects.toThrow(/original configuration is unavailable/),
  );
  expect(databaseState(f)).toEqual(before);
  f.put(priorPath, priorBytes);
  const tampered = checkedRecord(
      parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(priorBytes)),
      'prior rebind operation',
    ),
    tamperedPlan = requiredCliObject(tampered, 'plan', 'prior rebind plan');
  const wrongConfig = withAgentProfileChange(
    parseRuntimeConfigYaml(requiredCliString(tamperedPlan, 'baseline_yaml', 'prior baseline YAML')),
    'executor',
    { reasoning: 'max' },
  );
  tamperedPlan.baseline_yaml = json(wrongConfig);
  tampered.plan_digest = canonicalJsonDigest(tamperedPlan);
  f.put(priorPath, json(tampered));
  await Promise.resolve(
    expect(runReconcileArtifacts(nextArgs('inspect'))).rejects.toThrow(/historical config bytes differ/),
  );
  expect(databaseState(f)).toEqual(before);
  f.put(priorPath, priorBytes);
  expect((await runReconcileArtifacts(nextArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(nextArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(nextArgs('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(target));
  expect((await runReconcileArtifacts(nextArgs('resume'))).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(
    requiredElement(
      parseSessionJournalPayload(
        checkedString(
          requiredElement(after.agent_host_mastra_session_ledger, 0, 'after session ledger').payload,
          'ledger payload',
        ),
      ).items,
      1,
      'second session item',
    ).observation,
  ).toBeNull();
}, 60_000);

test('readonly bookkeeping config rebind rejects a changed retained release operation', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      release = ledger.operations.find((operation) => operation.work_id === request.identity.work_id);
    if (!release) throw Error('Fixture release operation is missing');
    release.decision_pointer = 'fixture:foreign-release';
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(ledger),
      canonicalJsonDigest(ledger),
      row.rowid,
    );
  });
  const before = databaseState(f);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects retained release source revision drift', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      release = ledger.operations.find((operation) => operation.work_id === request.identity.work_id);
    if (!release) throw Error('Fixture release operation is missing');
    release.source_revision = 'fixture:foreign-source-revision';
    const payload = json(ledger);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(ledger),
      row.rowid,
    );
    expect(canonicalJsonDigest(parseFixtureJson(payload))).toBe(canonicalJsonDigest(ledger));
  });
  const before = databaseState(f);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects a coherent distinct released ticket', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      activation = requiredElement(state.items, 1, 'second research item').research_activation;
    if (!activation) throw Error('Fixture activation is missing');
    const activationBinding = activation.plan.binding,
      ticket = ledger.tickets.find((entry) => entry.ticket_id === activationBinding.lease_ticket_id),
      release = ledger.operations.find(
        (entry) => entry.kind === 'release' && entry.work_id === request.identity.work_id,
      ),
      distinctTicketId = randomUUID(),
      distinctClaimId = randomUUID();
    if (!ticket) throw Error('Fixture released ticket is missing');
    const claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id);
    if (!claim || !release) throw Error('Fixture release custody is incomplete');
    const distinctTicket = { ...structuredClone(ticket), ticket_id: distinctTicketId, claim_ids: [distinctClaimId] },
      distinctClaim = { ...structuredClone(claim), claim_id: distinctClaimId, ticket_id: distinctTicketId };
    expect(ticket.status).toBe('released');
    expect(claim.status).toBe('released');
    expect(distinctTicketId).not.toBe(activationBinding.lease_ticket_id);
    ledger.tickets.push(distinctTicket);
    ledger.claims.push(distinctClaim);
    release.ticket_id = distinctTicketId;
    const payload = json(ledger),
      digest = canonicalJsonDigest(ledger);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(payload, digest, row.rowid);
    expect(
      querySqliteRow<{ digest: string }>(
        db,
        'SELECT digest FROM agent_host_state WHERE rowid=?',
        'fixture ledger digest',
        row.rowid,
      ).digest,
    ).toBe(digest);
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) => expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind selects the current release with coherent older release history', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    priorJournal = structuredClone(state);
  const priorJournalDigest = withDatabase(
    f,
    (db) =>
      querySqliteRow<{ digest: string }>(
        db,
        'SELECT digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        'fixture session ledger digest',
        f.workspace,
        request.identity.work_id,
        request.attempt,
      ).digest,
  );
  expect(priorJournalDigest).toBe(canonicalJsonDigest(priorJournal));
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  withDatabase(f, (db) => {
    const ledgerRow = querySqliteRow<HostStateRowIdPayload & { revision: number }>(
        db,
        "SELECT rowid,revision,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(ledgerRow.payload)),
      activation = requiredElement(state.items, 1, 'second research item').research_activation;
    if (!activation) throw Error('Fixture activation is missing');
    const activationBinding = activation.plan.binding,
      ticket = ledger.tickets.find((entry) => entry.ticket_id === activationBinding.lease_ticket_id);
    if (!ticket) throw Error('Fixture active ticket is missing');
    const claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id);
    if (!claim) throw Error('Fixture active claim is missing');
    const oldTicketId = randomUUID(),
      oldClaimId = randomUUID(),
      oldPointer = 'fixture:older-release',
      oldCreatedAt = new Date(Date.parse(ticket.created_at) - 1000).toISOString(),
      oldTicket: MutableFixture<CoordinationLedger>['tickets'][number] = {
        ...structuredClone(ticket),
        ticket_id: oldTicketId,
        sequence: ticket.sequence,
        claim_ids: [oldClaimId],
        status: 'released',
        expires_at: null,
        active_resources: [],
        blocked_resources: [],
        created_at: oldCreatedAt,
      },
      oldClaim: MutableFixture<CoordinationLedger>['claims'][number] = {
        ...structuredClone(claim),
        claim_id: oldClaimId,
        ticket_id: oldTicketId,
        status: 'released',
        created_at: oldCreatedAt,
        renewed_at: oldCreatedAt,
      },
      oldRelease: MutableFixture<CoordinationLedger>['operations'][number] = {
        schema: 'CoordinationOperation/v1',
        kind: 'release',
        ticket_id: oldTicketId,
        work_id: request.identity.work_id,
        thread_id: ticket.thread_id,
        source_revision: ticket.source_revision,
        resources: [...ticket.exclusive_resources],
        operation_id:
          'readonly-bookkeeping-release-' +
          canonicalJsonDigest({
            work_id: request.identity.work_id,
            nativeSessionHandle: ticket.thread_id,
            userRequestPointer: oldPointer,
            requestIntent: 'next_work',
            journal: priorJournalDigest,
          }).slice(0, 40),
        from_ledger_revision: 1,
        to_ledger_revision: 2,
        decided_by: ticket.thread_id,
        decision_pointer: oldPointer,
        created_at: oldCreatedAt,
      };
    expect(ledgerRow.revision).toBe(1);
    expect(ledger.revision).toBe(1);
    expect(ticket.sequence).toBe(1);
    expect(ticket.status).toBe('active');
    expect(claim.status).toBe('active');
    ticket.sequence = 2;
    ledger.tickets.unshift(oldTicket);
    ledger.claims.unshift(oldClaim);
    ledger.next_sequence = 3;
    ledger.revision = 2;
    ledger.operations.push(oldRelease);
    const payload = json(ledger),
      digest = canonicalJsonDigest(ledger);
    db.query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE rowid=?').run(
      ledger.revision,
      payload,
      digest,
      ledgerRow.rowid,
    );
    const snapshot = new HostStateStore(db, f.workspace).readHostStateSnapshot(request.identity);
    if (!snapshot.ledgerVersion || !snapshot.ledger) throw Error('Reordered fixture ledger snapshot is incomplete');
    expect(snapshot.ledgerVersion.revision).toBe(2);
    expect(snapshot.ledger).toEqual(ledger);
    expect(snapshot.ledger.tickets.map((entry) => [entry.ticket_id, entry.sequence, entry.status])).toEqual([
      [oldTicketId, 1, 'released'],
      [activationBinding.lease_ticket_id, 2, 'active'],
    ]);
    expect(snapshot.ledger.operations).toEqual([oldRelease]);
  });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const ledgerRow = querySqliteRow<HostStatePayloadRow>(
        db,
        "SELECT revision,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      journalRow = querySqliteRow<SessionLedgerPayloadRow>(
        db,

        'SELECT payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        'fixture session ledger',
        f.workspace,
        request.identity.work_id,
        request.attempt,
      ),
      ledger = checkedFixtureLedger(parseFixtureJson(ledgerRow.payload)),
      current = ledger.operations.find(
        (entry) =>
          entry.kind === 'release' && entry.work_id === request.identity.work_id && entry.to_ledger_revision === 3,
      );
    expect(ledgerRow.revision).toBe(3);
    expect(ledger.revision).toBe(3);
    if (!current) throw Error('Fixture current release operation is missing');
    expect(current.from_ledger_revision).toBe(2);
    expect(current.to_ledger_revision).toBe(3);
    expect(
      requiredElement(parseSessionJournalPayload(journalRow.payload).items, 1, 'second session item')
        .research_activation,
    ).toBeTruthy();
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  const digest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects two current release candidates', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const ledgerRow = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      journalRow = db
        .query<{ digest: string }, [string, string, number]>(
          'SELECT digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(f.workspace, request.identity.work_id, request.attempt),
      journalDigest = requiredSqliteRow(journalRow, 'fixture session journal').digest,
      ledger = checkedMutableFixtureLedger(parseFixtureJson(ledgerRow.payload)),
      current = ledger.operations.find(
        (entry) => entry.kind === 'release' && entry.work_id === request.identity.work_id,
      ),
      secondPointer = 'fixture:second-current-release',
      release = current;
    if (!release) throw Error('Fixture release operation is missing');
    const second = {
      ...structuredClone(release),
      operation_id:
        'readonly-bookkeeping-release-' +
        canonicalJsonDigest({
          work_id: request.identity.work_id,
          nativeSessionHandle: release.thread_id,
          userRequestPointer: secondPointer,
          requestIntent: 'linked_correction',
          journal: journalDigest,
        }).slice(0, 40),
      decision_pointer: secondPointer,
    };
    ledger.operations.push(second);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(ledger),
      canonicalJsonDigest(ledger),
      ledgerRow.rowid,
    );
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) => expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('generic readonly UNKNOWN rejects an unactivated pending item when Journal history has activation', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const releaseInspection = await run(args('inspect'));
  f.put('release.json', json(releaseInspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const row = querySqliteRow<SessionLedgerPayloadRow & HostStateRowId>(
        db,
        'SELECT rowid,payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        'fixture session ledger',
        f.workspace,
        request.identity.work_id,
        request.attempt,
      ),
      journal = structuredClone(parseSessionJournalPayload(row.payload));
    expect(requiredElement(journal.items, 0, 'first journal item').research_activation).toBeTruthy();
    expect(requiredElement(journal.items, pendingIndex, 'pending journal item').research_activation).toBeTruthy();
    Reflect.deleteProperty(requiredElement(journal.items, pendingIndex, 'pending journal item'), 'research_activation');
    Reflect.deleteProperty(
      requiredElement(journal.items, pendingIndex, 'pending journal item'),
      'research_normalization',
    );
    const payload = json(journal);
    db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(journal),
      row.rowid,
    );
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) => expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping proof drift after config plan denies apply without changing Host state', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  const activation = pending.research_activation;
  if (!activation) throw Error('Fixture pending item has no activation');
  const activationPath = activation.plan.history_path,
    activationBytes = readFileSync(path.join(f.root, activationPath), 'utf8');
  f.put(activationPath, activationBytes + '{}\n');
  const beforeDeniedApply = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(/pending\/unknown|activation|history/i),
  );
  expect(databaseState(f)).toEqual(beforeDeniedApply);
  expect(readFileSync(path.join(f.root, activationPath), 'utf8')).toBe(activationBytes + '{}\n');
}, 30000);

test('public readonly bookkeeping denies pending official-docs egress without changing state', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 0;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    config = loadRuntimeConfig(f.root),
    workflow = requiredRuntimeWorkflow(config, pending.request.workflow_id);
  const stage = workflow.stages.find((entry) => entry.id === pending.request.stage_id);
  if (!stage) throw Error('Fixture stage is missing');
  const assignment = requiredElement(stage.assignments, pending.request.assignment_index, 'fixture assignment');
  const profile = requiredRuntimeAgentProfile(config, assignment.profile),
    egress = config.agents.egress_policies[profile.egress_policy];
  if (!egress) throw Error('Fixture egress policy is missing');
  expect(pending.request.role).toBe('documentation-researcher');
  expect(egress.allowed_hosts.length).toBeGreaterThan(0);
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/egress/));
  expect(databaseState(f)).toEqual(before);
});

test.each(['altered', 'missing'])(
  'public readonly bookkeeping denies %s committed activation history without changing state',
  async (change) => {
    const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
    seedHistoricalResearchLineage(f, request, state);
    const activation = firstJournalItem(state).research_activation;
    if (!activation) throw Error('Fixture journal item has no committed activation');
    const historyPath = activation.plan.history_path,
      fullPath = path.join(f.root, historyPath);
    if (change === 'altered') f.put(historyPath, readFileSync(fullPath, 'utf8') + '{}\n');
    else rmSync(fullPath, { force: true });
    const before = databaseState(f);
    await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/activation|history/i));
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test.each(['tampered', 'missing'])(
  'public readonly bookkeeping denies a %s physical record with normalization without changing state',
  async (change) => {
    const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
    seedHistoricalResearchLineage(f, request, state);
    const normalization = firstJournalItem(state).research_normalization;
    if (!normalization) throw Error('Fixture journal item has no normalization record');
    const recordPath = normalization.record_path,
      fullPath = path.join(f.root, recordPath);
    if (change === 'tampered') f.put(recordPath, '{}\n');
    else rmSync(fullPath, { force: true });
    const before = databaseState(f);
    await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/record|research|digest/i));
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('public readonly bookkeeping denies an existing mismatched artifact at a normalized record path', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    plan = firstJournalItem(state).research_normalization;
  if (!plan) throw Error('Fixture journal item has no normalization record');
  let foundNormalizedArtifact = false;
  const mismatchedWork: WorkState = {
    ...work,
    artifacts: work.artifacts.map((entry) => {
      if (entry.path !== plan.record_path) return entry;
      foundNormalizedArtifact = true;
      return { ...entry, sha256: '0'.repeat(64) };
    }),
  };
  if (!foundNormalizedArtifact) throw Error('Fixture normalized artifact is missing');
  withDatabase(f, (db) =>
    db
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
      .run(json(mismatchedWork), canonicalJsonDigest(mismatchedWork)),
  );
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/artifact|lineage/i));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public readonly bookkeeping releases an exact expired owner once without renewing or granting rights', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    expiry = '2026-10-01T00:00:00.000Z';
  const original = withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      ticket = ledger.tickets.find((entry) => entry.ticket_id === requiredWorkLease(work).ticket_id),
      claim = ledger.claims.find((entry) => entry.ticket_id === requiredWorkLease(work).ticket_id);
    if (!ticket || !claim) throw Error('Fixture coordination ticket or claim is missing');
    expect(ticket.status).toBe('active');
    expect(claim.status).toBe('active');
    ticket.expires_at = expiry;
    claim.lease_expires_at = expiry;
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
    return { ticket: structuredClone(ticket), claim: structuredClone(claim) };
  });
  expect(original.ticket.expires_at).toBe(original.claim.lease_expires_at);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.status).toBe('historical_owner_released');
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    releasedWork = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f),
    releasedLedger = checkedFixtureLedger(parseFixtureJson(requiredHostStatePayload(after, 'ledger'))),
    releasedTicket = releasedLedger.tickets.find((entry) => entry.ticket_id === original.ticket.ticket_id),
    releasedClaim = releasedLedger.claims.find((entry) => entry.ticket_id === original.claim.ticket_id);
  if (!releasedTicket || !releasedClaim) throw Error('Released fixture coordination ticket or claim is missing');
  expect(releasedWork.lease).toBeNull();
  expect(releasedWork.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(releasedWork.execution.assignment_attempts).toEqual(work.execution.assignment_attempts);
  expect(releasedWork.artifacts).toEqual(work.artifacts);
  expect(releasedTicket.status).toBe('released');
  expect(releasedTicket.sequence).toBe(original.ticket.sequence);
  expect(releasedTicket.generation).toBe(original.ticket.generation);
  expect(releasedTicket.exclusive_resources).toEqual(original.ticket.exclusive_resources);
  expect(releasedTicket.active_resources).toEqual([]);
  expect(releasedTicket.blocked_resources).toEqual([]);
  expect(releasedTicket.expires_at).toBeNull();
  expect(releasedClaim.status).toBe('released');
  expect(releasedClaim.generation).toBe(original.claim.generation);
  expect(releasedClaim.resources).toEqual(original.claim.resources);
  expect(releasedClaim.lease_expires_at).toBe(expiry);
  expect(
    releasedLedger.operations.filter((operation) => operation.ticket_id === original.ticket.ticket_id),
  ).toHaveLength(1);
  const releasedOperation = releasedLedger.operations.find(
    (operation) => operation.ticket_id === original.ticket.ticket_id,
  );
  if (!releasedOperation) throw Error('Released fixture coordination operation is missing');
  expect(releasedOperation.resources).toEqual(original.ticket.exclusive_resources);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
  const retried = checkedFixtureLedger(parseFixtureJson(requiredHostStatePayload(databaseState(f), 'ledger')));
  expect(retried.operations.filter((operation) => operation.ticket_id === original.ticket.ticket_id)).toHaveLength(1);
}, 30000);

test('public readonly bookkeeping denies an earlier overlapping queued ticket without changing state', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state);
  const queued = withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      ownerTicket = ledger.tickets.find((entry) => entry.ticket_id === requiredWorkLease(work).ticket_id);
    if (!ownerTicket) throw Error('Fixture owner ticket is missing');
    const earlier: MutableFixture<CoordinationLedger>['tickets'][number] = {
      ...structuredClone(ownerTicket),
      ticket_id: 'earlier-fifo-ticket',
      work_id: 'earlier-fifo-work',
      thread_id: 'earlier-fifo-thread',
      sequence: ownerTicket.sequence,
      status: 'queued',
      claim_ids: [],
      active_resources: [],
      blocked_resources: [...ownerTicket.exclusive_resources],
      expires_at: null,
    };
    ownerTicket.sequence++;
    ledger.tickets.unshift(earlier);
    ledger.next_sequence = Math.max(ledger.next_sequence, ownerTicket.sequence + 1);
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
    return { owner: structuredClone(ownerTicket), ticket: structuredClone(earlier) };
  });
  expect(queued.ticket.status).toBe('queued');
  expect(queued.ticket.sequence).toBeLessThan(queued.owner.sequence);
  expect(queued.ticket.blocked_resources.some((resource) => queued.owner.exclusive_resources.includes(resource))).toBe(
    true,
  );
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/FIFO|resource activation/i));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public readonly bookkeeping rejects a foreign owner and stale inspection CAS', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state);
  const before = databaseState(f),
    foreignOwner = args('inspect');
  foreignOwner[7] = 'foreign-owner';
  await Promise.resolve(expect(run(foreignOwner)).rejects.toThrow(/original owner differs/));
  expect(databaseState(f)).toEqual(before);
  const inspected = await run(args('inspect')),
    inspectedRequest = requiredCliObject(inspected, 'request', 'inspection request'),
    inspection = requiredCliObject(inspectedRequest, 'inspection', 'release inspection'),
    expectedMaintenanceGeneration = checkedSqliteInteger(
      inspection.expectedMaintenanceGeneration,
      'expected maintenance generation',
    );
  f.put(
    'release.json',
    json({
      ...inspectedRequest,
      inspection: {
        ...inspection,
        expectedMaintenanceGeneration: expectedMaintenanceGeneration + 1,
      },
    }),
  );
  await Promise.resolve(expect(run(args('apply'))).rejects.toThrow(/CAS changed/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test.each(['completed_readonly', 'unknown_readonly', 'unissued_prepared'])(
  'settled research owner denies %s without admitted normalized research',
  async (predicate) => {
    const { f, request, args } = historicalFixture(predicate),
      before = databaseState(f);
    f.put(
      'release.json',
      json({ ...request, schema: 'SettledResearchOwnerReleaseRequest/v1', predicate: 'settled_research' }),
    );
    const control = args('inspect');
    control[0] = '--release-settled-research-owner';
    await Promise.resolve(
      expect(run(control)).rejects.toThrow(
        predicate === 'unknown_readonly' ? /unfinished issued effects/ : /settled research/,
      ),
    );
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('public historical inspect rebuilds populated local source and repository skill context read-only', async () => {
  const { f, args, state, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  expect(configuredContexts).toHaveLength(1);
  const configuredContext = firstConfiguredContext(configuredContexts);
  expect(configuredContext.entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
  expect(configuredContext.entries.find((entry) => entry.id === 'fixture-context')?.location).toBe(fixtureContextPath);
  expect(
    configuredContext.entries.every((entry) => typeof entry.content === 'string' && entry.content.trim().length > 0),
  ).toBe(true);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      '.agent/runtime-initialization.v1.json',
      'AGENT.sidecar.md',
      fixtureContextPath,
      '.codex/skills/historical-review/SKILL.md',
      ...requiredSourceScope(state).entries.map((entry) => entry.path),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const result = await run(args('inspect'));
  expect(result.status).toBe('historical_owner_release_inspected');
  expect(result.caller_identity_authenticated).toBe(false);
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test('public recovery-review prepare reserves only review for populated historical context', async () => {
  const { f, call, state, configuredContexts } = recoveryFixture({ configuredContext: true });
  expect(configuredContexts).toHaveLength(1);
  const configuredContext = firstConfiguredContext(configuredContexts);
  expect(configuredContext.entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
  expect(configuredContext.entries.find((entry) => entry.id === 'fixture-context')?.location).toBe(fixtureContextPath);
  expect(
    configuredContext.entries.every((entry) => typeof entry.content === 'string' && entry.content.trim().length > 0),
  ).toBe(true);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      '.agent/runtime-initialization.v1.json',
      'AGENT.sidecar.md',
      fixtureContextPath,
      '.codex/skills/historical-review/SKILL.md',
      ...requiredSourceScope(state).entries.map((entry) => entry.path),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const prepared = await call('prepare');
  expect(prepared.status).toBe('reserved');
  expect(prepared.operation.status).toBe('reserved');
  expect(prepared.native_dispatch_performed).toBe(false);
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    reviewRows = after.agent_host_governance.filter(
      (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
    );
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews')).toEqual(
    before.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews'),
  );
  expect(reviewRows).toHaveLength(1);
  const reviewRow = requiredElement(reviewRows, 0, 'reserved recovery review operation');
  expect(parseFixtureJson(checkedString(reviewRow.payload, 'reserved review operation payload'))).toMatchObject({
    schema: 'OperationReservation/v1',
    store_id: 'vida-recovery-reviews',
    status: 'reserved',
    operation_key: prepared.operation.operation_key,
  });
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test('public recovery review keeps original configured context in caller history and rechecks current Source', async () => {
  const { f, input, call, observation, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts);
  expect(originalContexts).toHaveLength(1);
  const originalBody = structuredClone(firstOriginalContext(originalContexts).context),
    originalLocalEntry = originalBody.entries.find((entry) => entry.kind === 'local');
  if (!originalLocalEntry || typeof originalLocalEntry.content !== 'string')
    throw Error('Original local context fixture has no retained text');
  const originalText = originalLocalEntry.content,
    localPath = path.join(f.root, fixtureContextPath),
    skillPath = path.join(f.root, '.codex/skills/historical-review/SKILL.md');
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before review preparation.\n');
  f.put(
    '.codex/skills/historical-review/SKILL.md',
    readFileSync(skillPath, 'utf8') + '\nCurrent skill edit before review preparation.\n',
  );
  const currentSource = snapshotDeclaredSources(
      requireSafeRepositoryAccess(f.root),
      requiredSourceScope(state).entries.map((entry) => entry.path),
    ),
    before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    prepared = await call('prepare', { ...input, originalContexts });
  expect(prepared.status).toBe('reserved');
  expect(prepared.native_dispatch_performed).toBe(false);
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.runtime_acceptance).toBe(false);
  expect(prepared.request.source).toEqual(currentSource);
  expect(prepared.request).not.toHaveProperty('originalContexts');
  expect(JSON.stringify(prepared.request)).not.toContain(originalText);
  const resumed = { ...input, originalContexts, request: prepared.request };
  expect((await call('begin', resumed)).status).toBe('commit_unknown');
  const observed = observation(prepared.operation),
    completed = await call('complete', { ...resumed, observation: observed });
  expect(completed.status).toBe('applied');
  expect(completed.native_dispatch_performed).toBe(false);
  expect(completed.rights_granted).toBe(false);
  expect(completed.runtime_acceptance).toBe(false);
  expect((await call('complete', { ...resumed, observation: observed })).operation).toEqual(completed.operation);
  const after = databaseState(f),
    operations = after.agent_host_governance.filter(
      (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
    );
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews')).toEqual(
    before.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews'),
  );
  expect(operations).toHaveLength(1);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  expect(JSON.stringify(after)).not.toContain(originalText);
}, 30000);

test('public recovery review accepts a canonical markerless original excerpt and denies a substituted body', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({
      configuredContext: true,
      markerlessExcerpt: true,
    }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    entry = firstOriginalContext(originalContexts).context.entries.find(
      (candidate) => candidate.id === 'fixture-context',
    );
  if (entry === undefined) throw Error('Fixture context entry is missing');
  expect(entry.truncated).toBe(true);
  expect(entry.content).toHaveLength(8192);
  expect(entry.content).not.toContain('[middle omitted; read source for complete content]');
  f.put(fixtureContextPath, 'Current project context after the original request.\n');
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    substituted = structuredClone(originalContexts);
  const substitutedFirst = firstOriginalContext(substituted),
    substitutedEntry = substitutedFirst.context.entries.find((candidate) => candidate.id === 'fixture-context');
  if (substitutedEntry === undefined) throw Error('Substitution context entry is missing');
  substitutedEntry.content = 'Substituted excerpt';
  substitutedFirst.context = resignFixtureContext(substitutedFirst.context);
  await Promise.resolve(
    expect(call('prepare', { ...input, originalContexts: substituted })).rejects.toThrow(
      'historical original configured requests differ',
    ),
  );
  expect(databaseState(f)).toEqual(before);
  const prepared = await call('prepare', { ...input, originalContexts });
  expect(prepared.status).toBe('reserved');
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.request).not.toHaveProperty('originalContexts');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  const changedRequest = {
    ...structuredClone(prepared.request),
    expectedWork: {
      ...prepared.request.expectedWork,
      revision: prepared.request.expectedWork.revision + 1,
    },
  };
  await Promise.resolve(
    expect(call('inspect', { ...input, originalContexts, request: changedRequest })).rejects.toThrow(
      /retained recovery request changed/,
    ),
  );
  expect(databaseState(f)).toEqual(after);
  expect((await call('inspect', { ...input, originalContexts, request: prepared.request })).status).toBe('reserved');
}, 30000);

test('public recovery review retains UNKNOWN when original-context custody is lost or current Source goes stale', async () => {
  const { f, input, call, observation, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    localPath = path.join(f.root, fixtureContextPath);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before prepare.\n');
  const prepared = await call('prepare', { ...input, originalContexts }),
    resumed = { ...input, originalContexts, request: prepared.request };
  expect((await call('begin', resumed)).status).toBe('commit_unknown');
  const afterBegin = databaseState(f);
  await Promise.resolve(expect(call('inspect', { ...input, request: prepared.request })).rejects.toThrow());
  expect(databaseState(f)).toEqual(afterBegin);
  await Promise.resolve(expect(call('begin', resumed)).rejects.toThrow(/reissue forbidden/));
  expect(databaseState(f)).toEqual(afterBegin);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nConcurrent Source edit after prepare.\n');
  const inspected = await call('inspect', resumed);
  expect(inspected.status).toBe('commit_unknown');
  expect(inspected.request).toEqual(prepared.request);
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(afterBegin);
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(
      /retained recovery request changed|source scope changed/,
    ),
  );
  expect(databaseState(f)).toEqual(afterBegin);
}, 30000);

test('public recovery review rejects current Source drift before begin after body-backed preparation', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    localPath = path.join(f.root, fixtureContextPath);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before prepare.\n');
  const prepared = await call('prepare', { ...input, originalContexts }),
    resumed = { ...input, originalContexts, request: prepared.request },
    afterPrepare = databaseState(f);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nConcurrent Source edit after prepare.\n');
  await Promise.resolve(
    expect(call('begin', resumed)).rejects.toThrow(/retained recovery request changed|source scope changed/),
  );
  expect(databaseState(f)).toEqual(afterPrepare);
}, 30000);

const originalContextTamperCases: readonly [string, (contexts: FixtureOriginalContext[]) => void, string | null][] = [
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

test.each(originalContextTamperCases)(
  'public recovery review rejects original-context %s before reserving an operation',
  async (_name: string, mutate: (contexts: FixtureOriginalContext[]) => void, expectedReason: string | null) => {
    const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
      originalContexts = fixtureOriginalContexts(state, configuredContexts);
    mutate(originalContexts);
    const before = databaseState(f),
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath);
    const denied = expect(call('prepare', { ...input, originalContexts })).rejects;
    if (expectedReason) await Promise.resolve(denied.toThrow(expectedReason));
    else await Promise.resolve(denied.toThrow());
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  },
  30000,
);

test('public recovery review rejects aggregate original-context bytes before reserving an operation', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({
      configuredContext: true,
      aggregateContext: true,
    }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    first = firstOriginalContext(originalContexts),
    context = first.context;
  expect(context.entries).toHaveLength(5);
  for (const entry of context.entries) {
    expect(['local', 'skill']).toContain(entry.kind);
    entry.bytes = 65536;
    entry.truncated = true;
  }
  first.context = resignFixtureContext(context);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath);
  await Promise.resolve(
    expect(call('prepare', { ...input, originalContexts })).rejects.toThrow(
      'original configured context exceeds aggregate limit',
    ),
  );
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
});

test('public recovery review rejects original-context export over the caller-history byte limit', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    oversized = { ...input, originalContexts, padding: 'x'.repeat(262145) },
    before = databaseState(f);
  await Promise.resolve(expect(call('prepare', oversized)).rejects.toThrow(/caller-history export exceeds bound/));
  expect(databaseState(f)).toEqual(before);
});

test('original context body cannot authorize current topology drift or rewrite the retained request', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts);
  f.put(
    'agent-runtime.config.v1.yaml',
    f.target.replace(
      /(^        context_source_ids:\r?\n          - project-context\r?\n)          - fixture-context\r?\n/m,
      '$1',
    ),
  );
  const before = databaseState(f);
  await Promise.resolve(
    expect(call('prepare', { ...input, originalContexts })).rejects.toThrow(
      'vida runtime-config rebind: only requested executor model/reasoning or the approved prewriter workflow template delta may change',
    ),
  );
  expect(databaseState(f)).toEqual(before);
});

test('configured context reader rejects a missing declared local source after historical request construction', () => {
  const { f, state, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  const request = firstJournalItem(state).request,
    context = { work_id: state.work_id, attempt: state.attempt, scope_digest: request.scope_digest },
    current = loadRuntimeConfig(f.root),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    contextPath = path.join(f.root, fixtureContextPath),
    originalContextBytes = readFileSync(contextPath),
    before = databaseState(f),
    receiptBefore = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      'AGENT.sidecar.md',
      '.codex/skills/historical-review/SKILL.md',
      'release.json',
      ...requiredSourceScope(state)
        .entries.map((entry) => entry.path)
        .filter((relative) => relative !== fixtureContextPath),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const configuredContext = configuredContexts[0];
  if (configuredContext === undefined) throw Error('Configured context fixture is missing');
  expect(configuredContext.entries.find((entry) => entry.id === 'fixture-context')?.sha256).toBe(
    sha(originalContextBytes),
  );
  expect(runtimeConfigDigest(current)).not.toBe(request.config_digest);
  rmSync(contextPath);
  let contextReadFailure;
  try {
    configuredContextForStage(f.root, current, request.workflow_id, request.stage_id, context);
  } catch (error) {
    contextReadFailure = error;
  }
  expectMissingFixtureContextRead(contextReadFailure, `configured context ${fixtureContextPath}`);
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(receiptBefore)).toBe(true);
  expect(existsSync(contextPath)).toBe(false);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test.each([
  ['owner inspect', 'local source', 'changed'],
  ['owner inspect', 'local source', 'missing'],
  ['owner inspect', 'repository skill', 'changed'],
  ['owner inspect', 'repository skill', 'missing'],
  ['review prepare', 'local source', 'changed'],
  ['review prepare', 'local source', 'missing'],
  ['review prepare', 'repository skill', 'changed'],
  ['review prepare', 'repository skill', 'missing'],
])(
  'historical configured context denies %s after %s is %s without changing authoritative state',
  async (route: string, kind: string, drift: string) => {
    const historical =
      route === 'owner inspect'
        ? historicalFixture('completed_readonly', { configuredContext: true })
        : recoveryFixture({ configuredContext: true });
    const { f, state } = historical,
      configuredContexts = historical.configuredContexts;
    if (!configuredContexts) throw Error('Configured context fixture data is missing');
    expect(configuredContexts).toHaveLength(1);
    const configuredContext = firstConfiguredContext(configuredContexts);
    expect(configuredContext.entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
    expect(
      configuredContext.entries.every((entry) => typeof entry.content === 'string' && entry.content.trim().length > 0),
    ).toBe(true);
    const relative = kind === 'local source' ? fixtureContextPath : '.codex/skills/historical-review/SKILL.md';
    const absolute = path.join(f.root, relative);
    if (drift === 'changed')
      f.put(relative, readFileSync(absolute, 'utf8') + '\nChanged after original request construction.\n');
    else rmSync(absolute);
    const before = databaseState(f),
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath),
      protectedPaths = [
        'agent-runtime.config.v1.yaml',
        'baseline.yaml',
        '.agent/runtime-initialization.v1.json',
        'AGENT.sidecar.md',
        fixtureContextPath,
        '.codex/skills/historical-review/SKILL.md',
        ...requiredSourceScope(state).entries.map((entry) => entry.path),
      ],
      fileSnapshots = new Map(
        [...new Set(protectedPaths)].map((sourcePath) => [
          sourcePath,
          existsSync(path.join(f.root, sourcePath)) ? readFileSync(path.join(f.root, sourcePath)) : null,
        ]),
      );
    const invoke = () => invokeConfiguredContextFixture(historical);
    if (drift === 'missing' && kind === 'local source') {
      let missingReferenceFailure;
      try {
        await invoke();
      } catch (error) {
        missingReferenceFailure = error;
      }
      expectMissingFixtureContextRead(missingReferenceFailure, `required reference ${fixtureContextPath}`);
    } else {
      const expected =
        drift === 'changed'
          ? /historical original configured requests differ/
          : /configured context \.codex\/skills\/historical-review\/SKILL\.md/;
      await Promise.resolve(expect(invoke()).rejects.toThrow(expected));
    }
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
    for (const [sourcePath, bytes] of fileSnapshots) {
      const currentPath = path.join(f.root, sourcePath);
      expect(existsSync(currentPath)).toBe(bytes !== null);
      if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
    }
  },
  30000,
);

test.each([
  ['owner inspect', 'context-source selection'],
  ['review prepare', 'context-source selection'],
  ['owner inspect', 'executor execution_mode'],
  ['review prepare', 'executor execution_mode'],
])(
  'public historical %s rejects %s drift beyond executor-only delta without effects',
  async (route, drift) => {
    const subject =
      route === 'owner inspect'
        ? historicalFixture('completed_readonly', { configuredContext: true })
        : recoveryFixture({ configuredContext: true });
    const { f, state } = subject;
    if ('input' in subject) f.put('.tmp/recovery-input.json', json(subject.input));
    const changedConfig =
      drift === 'context-source selection'
        ? f.target.replace(
            /(^        context_source_ids:\r?\n          - project-context\r?\n)          - fixture-context\r?\n/m,
            '$1',
          )
        : f.target.replace(
            /(^    executor:\r?\n      model: gpt-6-luna\r?\n      reasoning: max\r?\n      execution_mode: )standard/m,
            '$1fast',
          );
    expect(changedConfig).not.toBe(f.target);
    f.put('agent-runtime.config.v1.yaml', changedConfig);
    const current = loadRuntimeConfig(f.root);
    if (drift === 'context-source selection')
      expect(
        requiredRuntimeWorkflow(current, 'task_execution').stages.find((stage) => stage.id === 'synthesize_task')
          ?.context_source_ids,
      ).toEqual(['project-context']);
    else expect(requiredRuntimeAgentProfile(current, 'executor').execution_mode).toBe('fast');
    const intakePath = `.agent/work/${state.work_id}/intake.json`,
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath),
      before = databaseState(f),
      reviewReservations = (snapshot: FixtureDatabaseState) =>
        snapshot.agent_host_governance.filter(
          (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
        ),
      protectedPaths = [
        'agent-runtime.config.v1.yaml',
        'baseline.yaml',
        '.agent/runtime-initialization.v1.json',
        'AGENT.sidecar.md',
        fixtureContextPath,
        '.codex/skills/historical-review/SKILL.md',
        'release.json',
        intakePath,
        ...(route === 'review prepare' ? ['.tmp/recovery-input.json'] : []),
        ...requiredSourceScope(state).entries.map((entry) => entry.path),
      ],
      fileSnapshots = new Map(
        [...new Set(protectedPaths)].map((relative) => [
          relative,
          existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
        ]),
      );
    expect(reviewReservations(before)).toHaveLength(0);
    const invoke = () => invokeConfiguredContextFixture(subject);
    await Promise.resolve(
      expect(invoke()).rejects.toThrow(
        'vida runtime-config rebind: only requested executor model/reasoning or the approved prewriter workflow template delta may change',
      ),
    );
    const after = databaseState(f);
    expect(after).toEqual(before);
    expect(reviewReservations(after)).toHaveLength(0);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
    for (const [relative, bytes] of fileSnapshots) {
      const currentPath = path.join(f.root, relative);
      expect(existsSync(currentPath)).toBe(bytes !== null);
      if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
    }
  },
  30000,
);

test.each([
  'wrong owner',
  'wrong baseline',
  'changed rights',
  'missing engine',
  'extra action',
  'missing preimage',
  'envelope preimage',
  'foreign preimage',
  'source drift',
])(
  'historical settled writer denies %s without state or receipt effects',
  async (change) => {
    const { f, args, state } = historicalFixture('settled_writer_failed_validators');
    const values = args('inspect');
    if (change === 'wrong owner') values[values.indexOf('--native-session-handle') + 1] = 'foreign';
    if (change === 'wrong baseline') f.put('baseline.yaml', f.target);
    if (change === 'changed rights')
      f.put('agent-runtime.config.v1.yaml', f.target.replace('tools_policy: validator', 'tools_policy: developer'));
    if (change === 'missing engine')
      withDatabase(f, () => {
        const engine = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), { strict: true });
        try {
          engine.exec('DELETE FROM mastra_workflow_snapshot');
        } finally {
          engine.close();
        }
      });
    if (change === 'extra action')
      withDatabase(f, (db) => {
        const row = readSessionLedgerSqlRow(db, 'SELECT * FROM agent_host_mastra_session_ledger'),
          persisted = parseFixtureJson(checkedString(row.payload, 'persisted session ledger payload')),
          changed: FixtureJournal = {
            ...state,
            items: [...state.items, structuredClone(firstJournalItem(state))],
          };
        expect(persisted).toEqual(state);
        db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?').run(
          json(changed),
          canonicalJsonDigest(changed),
        );
      });
    if (change === 'missing preimage')
      renameSync(path.join(f.root, 'original-scope.json'), path.join(f.root, 'retained.json'));
    if (change === 'envelope preimage')
      f.put(
        'original-scope.json',
        json({ stdout: readFileSync(path.join(f.root, 'original-scope.json'), 'utf8'), exit_code: 0 }),
      );
    if (change === 'foreign preimage')
      f.put(
        'original-scope.json',
        json(snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['AGENT.sidecar.md'])),
      );
    if (change === 'source drift') f.put('.githooks/pre-commit', 'Concurrent source drift');
    const before = databaseState(f),
      receipt = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
    await Promise.resolve(expect(run(values)).rejects.toThrow());
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(receipt)).toBe(true);
  },
  30000,
);

test.each(['journal', 'preimage', 'maintenance'])(
  'historical apply denies changed %s after inspect without releasing ownership',
  async (change) => {
    const { f, args, state } = historicalFixture('settled_writer_failed_validators');
    const inspected = await run(args('inspect'));
    f.put('release.json', json(inspected.request));
    if (change === 'preimage')
      f.put('original-scope.json', readFileSync(path.join(f.root, 'original-scope.json'), 'utf8') + '\n');
    else if (change === 'journal')
      withDatabase(f, (db) => {
        const row = readSessionLedgerSqlRow(db, 'SELECT * FROM agent_host_mastra_session_ledger'),
          persisted = parseFixtureJson(checkedString(row.payload, 'persisted session ledger payload')),
          first = firstJournalItem(state),
          observation = first.observation;
        expect(persisted).toEqual(state);
        if (!observation) throw Error('Fixture journal action has no observation to mutate');
        const changed: FixtureJournal = {
          ...state,
          items: state.items.map((item) =>
            item.request.action_id === first.request.action_id
              ? {
                  ...item,
                  observation: {
                    ...observation,
                    evidence_refs: [...observation.evidence_refs, 'fixture:later-evidence'],
                  },
                }
              : item,
          ),
        };
        db.query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=?').run(
          json(changed),
          canonicalJsonDigest(changed),
        );
      });
    else {
      // Host fixture state cannot acquire maintenance while the historical owner is active.
      const changed = structuredClone(requiredCliObject(inspected, 'request', 'historical owner request'));
      const inspection = requiredCliObject(changed, 'inspection', 'historical owner inspection'),
        generation = checkedSqliteInteger(
          inspection.expectedMaintenanceGeneration,
          'historical expected maintenance generation',
        );
      inspection.expectedMaintenanceGeneration = generation + 1;
      f.put('release.json', json(changed));
    }
    const before = databaseState(f);
    await Promise.resolve(expect(run(args('apply'))).rejects.toThrow(/changed/));
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('historical inert preparation remains blocked and mixed execution flags cannot dispatch', async () => {
  const f = fixture({ sourceMode: true });
  f.put('baseline.yaml', f.oldYaml);
  const { identity } = seedState(f, { lease: true });
  f.put('agent-runtime.config.v1.yaml', f.target);
  f.put(
    'release.json',
    json({
      schema: 'HistoricalOwnerReleaseRequest/v1',
      identity,
      attempt: 1,
      userRequestPointer: 'fixture:inert',
      requestIntent: 'next_work',
      predicate: 'completed_readonly',
    }),
  );
  const args = [
    '--release-historical-owner',
    'true',
    '--mode',
    'inspect',
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    'release.json',
  ];
  const before = databaseState(f);
  await Promise.resolve(expect(run(args)).rejects.toThrow(/inert release is unsupported/));
  for (const flag of [
    '--issue-wave',
    '--report',
    '--capture-stopped-source',
    '--retire-interrupted-source-owner',
    '--release-completed-readonly',
  ])
    await Promise.resolve(expect(run([...args, flag, 'true'])).rejects.toThrow());
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('three original readonly unknowns remain unchanged across config rebind with a different quiescent current run', async () => {
  const f = fixture();
  seedReadonlyUnknown(f);
  const before = databaseState(f),
    nativeBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(nativeBefore)).toBe(true);
}, 30000);

test('readonly unknown denies a genuine owner project integration binding mismatch without changing rows', async () => {
  const f = fixture();
  seedReadonlyUnknown(f);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='work'",
        'fixture work',
      ),
      work = checkedFixtureWork(parseFixtureJson(row.payload), f),
      changedWork: WorkState = {
        ...work,
        binding: {
          ...work.binding,
          integrations_digest: canonicalJsonDigest({ fixture: 'foreign project integrations' }),
        },
      };
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(changedWork),
      canonicalJsonDigest(changedWork),
      row.rowid,
    );
  });
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(
      'readonly owner project integration binding differs',
    ),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

const readonlySnapshotMutations: readonly [string, SyntheticStateMutation][] = [
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
for (const [name, mutation] of readonlySnapshotMutations) {
  test(`readonly unknown denies ${name} and preserves all rows`, async () => {
    const f = fixture();
    seedReadonlyUnknown(f, mutation);
    const before = databaseState(f);
    await Promise.resolve(
      expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('issued native outcome is pending/unknown'),
    );
    expect(databaseState(f)).toEqual(before);
  }, 30000);
}

const readonlyJournalMutations: readonly [string, SyntheticStateMutation, boolean, boolean][] = [
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
  ],
];
for (const [name, mutation, validateFixture, hostReservation] of readonlyJournalMutations) {
  test(`readonly unknown denies ${name} without changing records`, async () => {
    const f = fixture();
    seedReadonlyUnknown(f, mutation, { validateFixture, hostReservation });
    const before = databaseState(f);
    await Promise.resolve(
      expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('issued native outcome is pending/unknown'),
    );
    expect(databaseState(f)).toEqual(before);
  }, 30000);
}

test('readonly unknown denies original configured source writer despite lease-null owner', async () => {
  const f = fixture();
  seedReadonlyUnknown(f, null, { writer: true });
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('capability is not cooperative readonly'),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly risk-filter ambiguity denies any possible writer profile and accepts only unanimous readonly candidates', () => {
  const f = fixture();
  const loaded = loadRuntimeConfig(f.root);
  const readonly = Object.entries(loaded.agents.profiles).find(
    ([, profile]) => profile.mutation_scope === 'none' && profile.tools_policy === 'read_only',
  )?.[0];
  const writer = Object.entries(loaded.agents.profiles).find(
    ([, profile]) => profile.mutation_scope === 'repository_source',
  )?.[0];
  if (readonly === undefined || writer === undefined) throw Error('Fixture needs both readonly and writer profiles');
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: 'task',
    intent: 'implementation_change',
    project: 'agent',
    risk_flags: [],
    labels: [],
  };
  const workflowId = 'implementation_change';
  const plan = compileDevelopmentWorkflow(loaded, selection.team, workflowId, selection.risk_flags);
  const targetStage = loaded.workflows[workflowId]?.stages.find((stage) => stage.assignments.length >= 2);
  if (targetStage === undefined) throw Error('Fixture workflow needs a stage with two assignments');
  const waveIndex = plan.waves.findIndex((wave) => wave.some((stage) => stage.id === targetStage.id));
  if (waveIndex < 0) throw Error('Fixture stage is absent from its compiled workflow');
  const context: SessionHandoffContext = {
    work_id: 'readonly-risk-fixture',
    attempt: 1,
    scope_digest: 'a'.repeat(64),
  };
  const actions = sessionActionsForWave(loaded, selection, context, workflowId, waveIndex, []).filter(
    (action) => action.stage_id === targetStage.id,
  );
  const firstAction = actions.find((action) => action.assignment_index === 0);
  const secondAction = actions.find((action) => action.assignment_index === 1);
  if (firstAction === undefined || secondAction === undefined)
    throw Error('Fixture stage assignments are absent from its action projection');
  const requestFor = (action: SessionAgentAction): SessionBridgeRequest =>
    buildSessionBridgeRequest({
      runId: sessionBridgeRunId(f.workspace, context, workflowId),
      workflowId,
      configDigest: runtimeConfigDigest(loaded),
      context,
      waveIndex,
      action,
      configuredContext: null,
      priorResults: [],
    });
  const firstRequest = requestFor(firstAction);
  const firstAssignments: RuntimeWorkflowAssignments = [
    { role: firstRequest.role, profile: readonly, risk_flags: ['read-risk'] },
    { role: firstRequest.role, profile: writer, risk_flags: ['write-risk'] },
  ];
  const firstConfig = withWorkflowStageAssignments(loaded, workflowId, targetStage.id, firstAssignments);
  expect(cooperativeReadonlyAssignments(firstConfig, firstRequest)).toBe(false);
  const firstSecondAssignment = firstAssignments[1];
  if (firstSecondAssignment === undefined) throw Error('Fixture lost its second assignment');
  const firstReadOnlyAssignments: RuntimeWorkflowAssignments = [
    requiredElement(firstAssignments, 0, 'first assignment'),
    { ...firstSecondAssignment, profile: readonly },
  ];
  expect(
    cooperativeReadonlyAssignments(
      withWorkflowStageAssignments(loaded, workflowId, targetStage.id, firstReadOnlyAssignments),
      firstRequest,
    ),
  ).toBe(true);

  const secondRequest = requestFor(secondAction);
  const secondAssignments: RuntimeWorkflowAssignments = [
    { role: 'preceding', profile: readonly },
    { role: secondRequest.role, profile: writer },
  ];
  const secondConfig = withWorkflowStageAssignments(loaded, workflowId, targetStage.id, secondAssignments);
  expect(cooperativeReadonlyAssignments(secondConfig, secondRequest)).toBe(false);
  const secondAssignment = secondAssignments[1];
  if (secondAssignment === undefined) throw Error('Fixture lost its second assignment');
  const secondReadOnlyAssignments: RuntimeWorkflowAssignments = [
    requiredElement(secondAssignments, 0, 'preceding assignment'),
    { ...secondAssignment, profile: readonly },
  ];
  expect(
    cooperativeReadonlyAssignments(
      withWorkflowStageAssignments(loaded, workflowId, targetStage.id, secondReadOnlyAssignments),
      secondRequest,
    ),
  ).toBe(true);
});
