import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { createHash } from 'node:crypto';
import { closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { readWorkspaceMastraSqlRow } from '../src/config/host-persisted-row.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
  selectWorkflow,
  validateRuntimeConfigRepairTargetBytes,
} from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { selectCorrectiveEvidence, validateWorkSessionBinding } from '../src/orchestration/final-assurance.ts';

import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import {
  openConfiguredMastraSessionLedger,
  mastraLedgerStatus,
} from '../src/orchestration/persistent-session-handoff.ts';
import { resumePausedLocalWork } from '../src/orchestration/resume-paused-local-work.ts';
import {
  compareRuntimeEndpointSnapshots,
  compareScopedSourceSnapshots,
  parseScopedSourceSnapshot,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
  snapshotRuntimeManifestSources,
  runtimeEndpointSourceTargets,
} from '../src/orchestration/scoped-source-snapshot.ts';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
  parseSessionBridgeRequest,
} from '../src/orchestration/mastra-session-bridge.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import {
  projectHistoricalTerminalReviewAction,
  projectConfiguredFrontierContinuationAction,
  validateClosedConfigTransitionProof,
  validateClosedConfigRebindProof,
  validateContinuationSourceChangePaths,
  validateDeliveredWorkContinuationRequest,
} from '../src/orchestration/delivered-work-continuation.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  runRuntimeConfigRebind,
  readAppliedRuntimeConfigRebind,
  currentNativeSelfAttestation,
} from './runtime-config-rebind.ts';
import {
  readRetainedUnissuedSessionEngineSnapshot,
  readInitialSourceContinuationSessionEngineSnapshot,
} from '../src/orchestration/session-engine-snapshot.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { releaseState, releaseJournalFile, releasePath } from './local-release-artifacts.ts';
import {
  validateInitialSourceFrontierCodeRebindRequest,
  validateInitialSourceFrontierCodeRebindVerifiedCurrent,
} from '../src/orchestration/initial-source-frontier-code-rebind.ts';
import { parseWorkItemSelection } from './continue-initial-source.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import {
  parseRuntimeCodeRebindRequest,
  parseRuntimeRebindStateVersion,
} from '../src/orchestration/runtime-code-rebind-contract.ts';

type AgentRuntimeConfig = import('../src/config/runtime-config.ts').AgentRuntimeConfig;

type SafeRepositoryAccess = import('../src/config/safe-repository-access.ts').SafeRepositoryAccess;

type WorkIdentity = import('../src/host-state.ts').WorkIdentity;

type RuntimeCodeRebindRequest = import('../src/host-state.ts').RuntimeCodeRebindRequest;

type DeliveredWorkContinuationRequest =
  import('../src/orchestration/delivered-work-continuation.ts').DeliveredWorkContinuationRequest;

type RuntimeCodeRebindVerifier = import('../src/host-state.ts').RuntimeCodeRebindVerifier;

type MastraSessionLedgerState = import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState;

type ScopedSourceEntry = import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceEntry;

type ScopedSourceChange = import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceChange;

type CommittedSourceChange = { readonly path: string; readonly after: ScopedSourceEntry };

type InitialSourceFrontierCodeRebindRequest =
  import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindRequest;

type InitialSourceFrontierCodeRebindVerifiedCurrent =
  import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindVerifiedCurrent;

type InitialSourceFrontierCodeRebindReceipt =
  import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindReceipt;

type SqliteDatabase = import('bun:sqlite').Database;

type RuntimeCodeRebindKey = string;

type RuntimeCodeRebindArgs = Record<RuntimeCodeRebindKey, string>;

type ParsedRuntimeCodeRebindArgs = RuntimeCodeRebindArgs & {
  '--mode': string;
  '--project-root': string;
  '--repair-id': string;
};

const runtimeCodeRebindKeys: ReadonlySet<string> = declaredRuntimeCodeOptions();

function declaredRuntimeCodeOptions(): ReadonlySet<string> {
  const byBasis = reconcileCliContracts['runtime-code']?.optionsByBasisMode;
  requireRebind(byBasis, 'runtime-code command contract is missing');
  return new Set(Object.values(byBasis).flatMap((byMode) => Object.values(byMode).flat()));
}

function isRuntimeCodeRebindKey(value: string): value is RuntimeCodeRebindKey {
  return runtimeCodeRebindKeys.has(value);
}

type InitialSourceFrontierPlan = {
  schema: 'InitialSourceFrontierCodeRebindPlan/v1';
  repair_id: string;
  request: InitialSourceFrontierCodeRebindRequest;
  endpoint_proof: InitialSourceFrontierCodeRebindVerifiedCurrent;
  digest: string;
};

type DeliveredContinuationProof =
  import('../src/orchestration/delivered-work-continuation.ts').DeliveredContinuationProof;

type RuntimeCodeRebindPlan = {
  schema: 'VidaRuntimeCodeRebindPlan/v1';
  repair_id: string;
  actor: string;
  timestamp: string;
  runtime_code_paths: readonly string[];
  lease_transition: 'resume_paused' | 'already_active';
  request: RuntimeCodeRebindRequest;
  digest: string;
};

type DeliveredContinuationPlan = {
  schema: 'VidaDeliveredWorkContinuationPlan/v1';
  repair_id: string;
  actor: string;
  timestamp: string;
  source_transition_id: string;
  runtime_code_paths: readonly string[];
  request: DeliveredWorkContinuationRequest;
  digest: string;
};

type ConfiguredFrontierPlanInput = {
  database: SqliteDatabase;
  root: string;
  config: AgentRuntimeConfig;
  workspaceId: string;
  projectIds: readonly string[];
  workId: string;
  attempt: number;
  nativeHandle: string;
  repairId: string;
  actor: string;
  timestamp: string;
  sourceTransitionId: string;
  ownerNoCallPointer: string;
  parentManifestRef: string;
  successorManifestRef: string;
  systemUpdateRef: string;
  sourceCorrectionRef: string;
};

type DeliveredContinuationPlanInput = Omit<
  ConfiguredFrontierPlanInput,
  'parentManifestRef' | 'successorManifestRef' | 'systemUpdateRef' | 'sourceCorrectionRef'
> & { actionId: string; issueId: string; forwardOperationId: string };

type RebindIntake = {
  schema: string;
  native_session_handle: string;
  work_item: {
    canonical_kind: string;
    intent: string;
    project_id: string;
    risk_flags: readonly string[];
    labels: readonly string[];
  };
  runtime_code_paths?: readonly string[];
  source_authorization_path: string;
};

type RuntimeEndpointIntake = {
  work_item: unknown;
  runtime_code_paths?: readonly string[];
  native_session_handle: string;
} & Partial<Pick<RebindIntake, 'schema' | 'source_authorization_path'>>;

function requireRebind(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(`vida runtime-code rebind: ${message}`);
}

function rebindRecord(value: unknown, message: string): Record<string, unknown> {
  requireRebind(isPlainRecord(value), message);
  return value;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function requiredStringArray(value: unknown, message: string): string[] {
  requireRebind(stringArray(value), message);
  return value;
}

function rebindExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return (
    Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key)) &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function sqlitePayloadRow(value: unknown, label: string): { payload: string; digest: string } | null {
  if (value === null || value === undefined) return null;
  const row = rebindRecord(value, `${label} row is invalid`);
  requireRebind(typeof row.payload === 'string' && typeof row.digest === 'string', `${label} row fields are invalid`);
  return { payload: row.payload, digest: row.digest };
}

function parsedRecord(payload: string, label: string): Record<string, unknown> {
  return rebindRecord(JSON.parse(payload), `${label} payload is invalid`);
}

function requiredStringField(value: Record<string, unknown>, key: string, label: string) {
  const field = value[key];
  requireRebind(typeof field === 'string', `${label} is invalid`);
  return field;
}

function sqliteRowExists(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function parseRebindWorkItem(value: unknown): RebindIntake['work_item'] {
  const item = rebindRecord(value, 'protected local intake work item missing');
  return {
    ...item,
    canonical_kind: requiredStringField(item, 'canonical_kind', 'protected local intake kind'),
    intent: requiredStringField(item, 'intent', 'protected local intake intent'),
    project_id: requiredStringField(item, 'project_id', 'protected local intake project'),
    risk_flags: requiredStringArray(item.risk_flags, 'protected local intake risk flags'),
    labels: requiredStringArray(item.labels, 'protected local intake labels'),
  };
}

function parseRebindIntake(value: unknown): RebindIntake {
  const record = rebindRecord(value, 'protected local intake shape invalid');
  const schema = requiredStringField(record, 'schema', 'protected local intake schema'),
    nativeSessionHandle = requiredStringField(record, 'native_session_handle', 'protected local intake owner'),
    sourceAuthorizationPath = requiredStringField(
      record,
      'source_authorization_path',
      'protected local intake authority path',
    ),
    item = parseRebindWorkItem(record.work_item),
    runtimeCodePaths =
      record.runtime_code_paths === undefined
        ? undefined
        : requiredStringArray(record.runtime_code_paths, 'protected local intake runtime paths');
  return {
    ...record,
    schema,
    native_session_handle: nativeSessionHandle,
    source_authorization_path: sourceAuthorizationPath,
    work_item: item,
    ...(runtimeCodePaths === undefined ? {} : { runtime_code_paths: runtimeCodePaths }),
  };
}

function parseRuntimeCodeRebindPlan(value: unknown): RuntimeCodeRebindPlan {
  const record = rebindRecord(value, 'frozen plan shape invalid');
  requireRebind(
    rebindExactKeys(record, [
      'schema',
      'repair_id',
      'actor',
      'timestamp',
      'runtime_code_paths',
      'lease_transition',
      'request',
      'digest',
    ]) &&
      record.schema === 'VidaRuntimeCodeRebindPlan/v1' &&
      typeof record.repair_id === 'string' &&
      typeof record.actor === 'string' &&
      typeof record.timestamp === 'string' &&
      Array.isArray(record.runtime_code_paths) &&
      record.runtime_code_paths.every((entry) => typeof entry === 'string') &&
      (record.lease_transition === 'resume_paused' || record.lease_transition === 'already_active') &&
      typeof record.digest === 'string',
    'frozen plan fields are invalid',
  );
  const request = parseRuntimeCodeRebindRequest(record.request);
  const plan = {
    schema: 'VidaRuntimeCodeRebindPlan/v1',
    repair_id: record.repair_id,
    actor: record.actor,
    timestamp: record.timestamp,
    runtime_code_paths: record.runtime_code_paths,
    lease_transition: record.lease_transition,
    request,
    digest: record.digest,
  } satisfies RuntimeCodeRebindPlan;
  return plan;
}

function parseDeliveredContinuationPlan(value: unknown): DeliveredContinuationPlan {
  const record = rebindRecord(value, 'delivered continuation plan shape invalid');
  requireRebind(
    rebindExactKeys(record, [
      'schema',
      'repair_id',
      'actor',
      'timestamp',
      'source_transition_id',
      'runtime_code_paths',
      'request',
      'digest',
    ]) &&
      record.schema === 'VidaDeliveredWorkContinuationPlan/v1' &&
      typeof record.repair_id === 'string' &&
      typeof record.actor === 'string' &&
      typeof record.timestamp === 'string' &&
      typeof record.source_transition_id === 'string' &&
      Array.isArray(record.runtime_code_paths) &&
      record.runtime_code_paths.every((entry) => typeof entry === 'string') &&
      typeof record.digest === 'string',
    'delivered continuation plan fields are invalid',
  );
  const plan = {
    schema: 'VidaDeliveredWorkContinuationPlan/v1',
    repair_id: record.repair_id,
    actor: record.actor,
    timestamp: record.timestamp,
    source_transition_id: record.source_transition_id,
    runtime_code_paths: record.runtime_code_paths,
    request: validateDeliveredWorkContinuationRequest(record.request),
    digest: record.digest,
  } satisfies DeliveredContinuationPlan;
  return plan;
}

const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const hash = /^[a-f0-9]{64}$/;

const planPath = (id: string) => `.agent/work/${id}/runtime-code-rebind-plan.v1.json`;

const initialSourceFrontierPlanPath = (id: string) =>
  `.agent/work/${id}/initial-source-frontier-code-rebind-plan.v1.json`;

const deliveredContinuationPlanPath = (id: string) => `.agent/work/${id}/delivered-work-continuation-plan.v1.json`;

function runtimeCodeOption(values: RuntimeCodeRebindArgs, key: string): string {
  return values[key] ?? '';
}

function requiredRuntimeCodeOption(values: RuntimeCodeRebindArgs, key: RuntimeCodeRebindKey): string {
  const value = values[key];
  requireRebind(typeof value === 'string' && value.length > 0, `required option ${key} is missing`);
  return value;
}

function parse(args: readonly string[]): ParsedRuntimeCodeRebindArgs {
  requireRebind(args.length % 2 === 0, 'arguments must be paired');
  const values = Object.create(null) as RuntimeCodeRebindArgs;
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    requireRebind(
      key !== undefined &&
        isRuntimeCodeRebindKey(key) &&
        value !== undefined &&
        value.length > 0 &&
        !Object.hasOwn(values, key),
      'arguments invalid',
    );
    values[key] = value;
  }
  const mode = runtimeCodeOption(values, '--mode'),
    root = runtimeCodeOption(values, '--project-root'),
    repairId = runtimeCodeOption(values, '--repair-id');
  requireRebind(
    values['--kind'] === 'runtime-code' &&
      (['inspect', 'plan', 'apply', 'resume'].includes(mode) ||
        (values['--basis'] === 'execution-continuation' && mode === 'refresh')) &&
      path.isAbsolute(root) &&
      path.resolve(root) === root &&
      identifier.test(repairId),
    'kind, mode, root or repair ID invalid',
  );
  const expected = reconcileExpectedOptions('runtime-code', mode, values);
  requireRebind(
    expected !== undefined && JSON.stringify(Object.keys(values).sort()) === JSON.stringify([...expected].sort()),
    'missing or unexpected arguments',
  );
  return { ...values, '--mode': mode, '--project-root': root, '--repair-id': repairId };
}

function trustedDatabase(
  root: string,
  config: AgentRuntimeConfig,
  workspaceId: string,
  readonly: boolean,
): SqliteDatabase {
  const access = requireSafeRepositoryAccess(root);
  access.assertDirectory(config.control.work_root, 'runtime-code rebind work root');
  const relative = sessionHandoffDatabaseRelativePath(config);
  requireRebind(access.fileExists(relative, 'runtime-code rebind database'), 'database absent or unsafe');
  const file = sessionHandoffDatabasePath(root, config);
  const stat = lstatSync(file);
  requireRebind(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
    'database must be a single-link regular file',
  );
  return openCliWorkspaceDatabase(root, file, workspaceId, readonly);
}

function validatedJson(
  access: SafeRepositoryAccess,
  relative: string,
  label: string,
): { bytes: ReturnType<SafeRepositoryAccess['readBytes']>; value: unknown } {
  const bytes = access.readBytes(relative, label);
  requireRebind(bytes.length <= 8 * 1024 * 1024, `${label} exceeds bound`);
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

function validCommittedChangeList(changes: unknown): boolean {
  return Array.isArray(changes) && changes.length <= 1024;
}

function validCommittedEndpoint(entry: ScopedSourceEntry) {
  return entry.exists
    ? typeof entry.bytes === 'number' &&
        Number.isSafeInteger(entry.bytes) &&
        entry.bytes >= 0 &&
        entry.bytes <= 8 * 1024 * 1024 &&
        typeof entry.sha256 === 'string' &&
        hash.test(entry.sha256)
    : entry.bytes === null && entry.sha256 === null;
}

function committedEndpoint(entries: ReadonlyMap<string, ScopedSourceEntry>, relative: string): ScopedSourceEntry {
  const entry = entries.get(relative);
  requireRebind(entry, 'committed Source path is absent from the selected scope');
  return entry;
}

/**
 * Source-repository adapter: actual local commit bytes, never remote-publication authority.
 */
export function assertCommittedSourceChanges(root: string, commit: string, changes: readonly CommittedSourceChange[]) {
  requireRebind(
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit) && validCommittedChangeList(changes),
    'committed Source proof input is invalid',
  );
  const selected = new Map<string, ScopedSourceEntry>();
  for (const change of changes) {
    const entry = change?.after;
    requireRebind(
      entry &&
        typeof change.path === 'string' &&
        change.path === entry.path &&
        change.path.length > 0 &&
        change.path.length <= 512 &&
        !change.path.startsWith('/') &&
        !/^[A-Za-z]:/.test(change.path) &&
        !/[\\\p{Cc}]/u.test(change.path) &&
        change.path.split('/').every((part) => part && part !== '.' && part !== '..') &&
        typeof entry.exists === 'boolean' &&
        validCommittedEndpoint(entry),
      'committed Source entry is invalid',
    );
    requireRebind(
      !selected.has(change.path) || canonicalJsonDigest(selected.get(change.path)) === canonicalJsonDigest(entry),
      'committed Source path has conflicting endpoint bytes',
    );
    selected.set(change.path, entry);
  }
  requireRebind(selected.size <= 512, 'committed Source scope exceeds its bound');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')));
  Object.assign(env, { GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_OPTIONAL_LOCKS: '0' });

  const git = (args: readonly string[], input?: string | Uint8Array): Buffer => {
    const result = spawnSync('git', ['--no-replace-objects', '--literal-pathspecs', '-C', root, ...args], {
      windowsHide: true,
      encoding: null,
      input,
      env,
      timeout: 30000,
      maxBuffer: 65 * 1024 * 1024,
    });
    requireRebind(
      !result.error && result.signal === null && result.status === 0,
      'local committed Source reader failed',
    );
    return result.stdout;
  };
  const observedRoot = path.resolve(git(['rev-parse', '--show-toplevel']).toString('utf8').trim());
  requireRebind(
    process.platform === 'win32'
      ? observedRoot.toLowerCase() === path.resolve(root).toLowerCase()
      : observedRoot === path.resolve(root),
    'committed Source repository root differs',
  );
  requireRebind(git(['cat-file', '-t', commit]).toString('ascii').trim() === 'commit', 'Source object is not a commit');
  if (selected.size === 0) return { commit, checked_paths: 0, remote_publication_verified: false };
  const paths = [...selected.keys()].sort(),
    modes = new Map();
  for (const record of git(['ls-tree', '-rz', '--full-tree', commit, '--', ...paths])
    .toString('utf8')
    .split('\0')
    .filter(Boolean)) {
    const separator = record.indexOf('\t'),
      relative = record.slice(separator + 1),
      metadata = record.slice(0, separator).split(' ');
    requireRebind(
      separator > 0 &&
        selected.has(relative) &&
        !modes.has(relative) &&
        metadata[1] === 'blob' &&
        ['100644', '100755'].includes(metadata[0] ?? ''),
      'committed Source path is not an exact regular blob',
    );
    modes.set(relative, metadata[0]);
  }
  requireRebind(
    paths.every((relative) => modes.has(relative) === committedEndpoint(selected, relative).exists),
    'committed Source existence differs',
  );
  const present = paths.filter((relative) => committedEndpoint(selected, relative).exists);
  if (present.length > 0) {
    const stream = git(['cat-file', '--batch'], present.map((relative) => commit + ':' + relative + '\n').join(''));
    let offset = 0,
      totalBytes = 0;
    for (const relative of present) {
      const end = stream.indexOf(10, offset),
        entry = committedEndpoint(selected, relative);
      requireRebind(end >= offset, 'committed Source blob header is absent');
      const header = stream.subarray(offset, end).toString('ascii').split(' '),
        size = Number(header[2]);
      requireRebind(
        header.length === 3 && header[1] === 'blob' && size === entry.bytes && Number.isSafeInteger(size) && size >= 0,
        'committed Source blob size or type differs',
      );
      offset = end + 1;
      totalBytes += size;
      requireRebind(
        totalBytes <= 64 * 1024 * 1024 &&
          offset + size < stream.length &&
          sha(stream.subarray(offset, offset + size)) === entry.sha256 &&
          stream[offset + size] === 10,
        'committed Source bytes differ from the endpoint',
      );
      offset += size + 1;
    }
    requireRebind(offset === stream.length, 'committed Source stream has extra data');
  }
  return { commit, checked_paths: paths.length, remote_publication_verified: false };
}

function forwardManifestEntries(manifest: { value: unknown }, paths: readonly string[]): ScopedSourceEntry[] {
  requireRebind(
    isPlainRecord(manifest.value) && Array.isArray(manifest.value.files),
    'forward manifest file inventory invalid',
  );
  const files: unknown[] = manifest.value.files;
  return paths.map((relative) => {
    const matches = files.filter((entry) => isPlainRecord(entry) && entry.path === relative);
    const entry = matches[0];
    requireRebind(
      matches.length === 1 &&
        isPlainRecord(entry) &&
        typeof entry.size === 'number' &&
        Number.isSafeInteger(entry.size) &&
        typeof entry.sha256 === 'string' &&
        hash.test(entry.sha256),
      'runtime path missing from exact forward manifest',
    );
    return { path: relative, exists: true, bytes: entry.size, sha256: entry.sha256 };
  });
}

function forwardLineage(
  root: string,
  operationChain: string,
  paths: readonly string[],
  oldDigest: string,
  newDigest: string,
) {
  const operationIds = operationChain.split(',');
  requireRebind(
    operationIds.length > 0 &&
      operationIds.length <= 4 &&
      operationIds.every((id) => identifier.test(id)) &&
      new Set(operationIds).size === operationIds.length,
    'forward operation chain invalid',
  );
  const access = requireSafeRepositoryAccess(root);
  const operations = operationIds.map((operationId) => {
    const prefix = `.agent/cutover/${operationId}`;
    const intent = validatedJson(access, `${prefix}/forward-intent.v1.json`, 'forward intent').value;
    const parent = validatedJson(access, `${prefix}/parent-payload.manifest.v1.json`, 'parent manifest');
    const successor = validatedJson(access, `${prefix}/successor-payload.manifest.v1.json`, 'successor manifest');
    requireRebind(isPlainRecord(intent), 'forward operation intent invalid');
    requireRebind(
      intent.schema === 'VidaForwardUpdateMaintenance/v1' &&
        intent.operation_id === operationId &&
        intent.old_payload_manifest_sha256 === sha(parent.bytes) &&
        intent.new_payload_manifest_sha256 === sha(successor.bytes),
      'forward operation lineage differs',
    );
    return { parent, successor };
  });
  requireRebind(
    operations.every((operation, index) => {
      if (index === 0) return true;
      const previous = operations[index - 1];
      requireRebind(previous, 'forward operation predecessor is missing');
      return sha(previous.successor.bytes) === sha(operation.parent.bytes);
    }),
    'forward operations do not form one exact manifest chain',
  );
  const first = operations[0],
    last = operations.at(-1);
  requireRebind(first, 'forward operation manifest chain is empty');
  requireRebind(last, 'forward operation manifest chain is empty');
  const parent = first.parent;
  const successor = last.successor;
  const selector = validatedJson(access, '.agent/active-runtime-selector.v1.json', 'active runtime selector').value;
  const oldManifestDigest = sha(parent.bytes);
  const newManifestDigest = sha(successor.bytes);
  requireRebind(isPlainRecord(selector), 'active runtime selector invalid');
  requireRebind(
    selector.payload_manifest_sha256 === newManifestDigest,
    'installed forward lineage or selector differs',
  );
  const from = canonicalJsonDigest({
    schema: 'ScopedSourceSnapshot/v1',
    entries: forwardManifestEntries(parent, paths),
  });
  const to = canonicalJsonDigest({
    schema: 'ScopedSourceSnapshot/v1',
    entries: forwardManifestEntries(successor, paths),
  });
  requireRebind(
    from === oldDigest && to === newDigest && from !== to,
    'runtime-code digests differ from forward manifests',
  );
  return { parentManifestDigest: oldManifestDigest, successorManifestDigest: newManifestDigest };
}

function checkedJournalRow(database: SqliteDatabase, workspaceId: string, workId: string, attempt: number) {
  const row = readWorkspaceMastraSqlRow(database, workspaceId, workId, attempt);
  requireRebind(row, 'agent_host_mastra_session_ledger row missing');
  return { value: parseMastraSessionLedgerState(row.value), version: { revision: row.revision, digest: row.digest } };
}

function requireCapturedWorkSession(captured: import('../src/host-state.ts').HostWorkSessionSnapshot) {
  requireRebind(captured.host.work, 'agent_host_state Work missing');
  requireRebind(captured.host.ledger, 'agent_host_state Ledger missing');
  requireRebind(captured.host.workVersion, 'agent_host_state Work version missing');
  requireRebind(captured.host.ledgerVersion, 'agent_host_state Ledger version missing');
  requireRebind(captured.journal, 'agent_host_mastra_session_ledger row missing');
  return {
    work: { value: captured.host.work, version: captured.host.workVersion },
    ledger: { value: captured.host.ledger, version: captured.host.ledgerVersion },
    journal: { value: captured.journal.state, version: captured.journal.version },
    maintenanceGeneration: captured.host.maintenanceGeneration,
  };
}

function runtimeCodeAssignment(
  config: AgentRuntimeConfig,
  item: import('../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem | undefined,
) {
  const stage = config.workflows[item?.request.workflow_id ?? '']?.stages.find(
    (entry) => entry.id === item?.request.stage_id,
  );
  const assignment = stage?.assignments[item?.request.assignment_index ?? -1];
  const profile = config.agents.profiles[assignment?.profile ?? ''];
  const toolPolicy = config.agents.tool_policies[profile?.tools_policy ?? ''];
  return { assignment, profile, toolPolicy };
}

function runtimeCodeCorrectiveEvidence(
  state: MastraSessionLedgerState,
  config: AgentRuntimeConfig,
  work: import('../src/host-state.ts').WorkState,
) {
  const workflow = config.workflows[work.binding.workflow_id];
  requireRebind(workflow, 'current corrective workflow is unavailable');
  return selectCorrectiveEvidence(state, workflow);
}

type RuntimeCodeRebindPlanInput = {
  database: SqliteDatabase;
  root: string;
  config: AgentRuntimeConfig;
  workspaceId: string;
  projectIds: readonly string[];
  workId: string;
  attempt: number;
  actionId: string;
  issueId: string;
  nativeHandle: string;
  repairId: string;
  actor: string;
  timestamp: string;
  forwardOperationId: string;
  ownerNoCallPointer?: string;
  correctionId?: string;
  ownerCorrectionPointer?: string;
  focusedFailureCorrection?: boolean;
};

function validFocusedRuntimeCodePointer(
  ownerCorrectionPointer: string | undefined,
  ownerNoCallPointer: string | undefined,
  correctionId: string | undefined,
) {
  return (
    typeof ownerCorrectionPointer === 'string' &&
    ownerCorrectionPointer.trim().length > 0 &&
    ownerCorrectionPointer.length <= 2048 &&
    ownerNoCallPointer === undefined &&
    correctionId === undefined
  );
}

function validSynthesisRuntimeCodePointer(
  ownerCorrectionPointer: string | undefined,
  ownerNoCallPointer: string | undefined,
  correctionId: string | undefined,
) {
  return (
    identifier.test(correctionId ?? '') &&
    typeof ownerCorrectionPointer === 'string' &&
    ownerCorrectionPointer.length > 0 &&
    ownerCorrectionPointer.length <= 2048 &&
    !/\p{Cc}/u.test(ownerCorrectionPointer) &&
    ownerNoCallPointer === undefined
  );
}

function validNoCallRuntimeCodePointer(
  ownerCorrectionPointer: string | undefined,
  ownerNoCallPointer: string | undefined,
) {
  return (
    typeof ownerNoCallPointer === 'string' &&
    ownerNoCallPointer.length > 0 &&
    ownerNoCallPointer.length <= 2048 &&
    !/\p{Cc}/u.test(ownerNoCallPointer) &&
    ownerCorrectionPointer === undefined
  );
}

function validRuntimeCodePointer(
  focusedFailureCorrection: boolean | undefined,
  ownerCorrectionPointer: string | undefined,
  correctionId: string | undefined,
  ownerNoCallPointer: string | undefined,
) {
  return focusedFailureCorrection
    ? validFocusedRuntimeCodePointer(ownerCorrectionPointer, ownerNoCallPointer, correctionId)
    : correctionId
      ? validSynthesisRuntimeCodePointer(ownerCorrectionPointer, ownerNoCallPointer, correctionId)
      : validNoCallRuntimeCodePointer(ownerCorrectionPointer, ownerNoCallPointer);
}

/**
 * Read-only plan; only exact installed forward bytes may change the intake-pinned runtime digest.
 */
function planRuntimeCodeRebind({
  database,
  root,
  config,
  workspaceId,
  projectIds,
  workId,
  attempt,
  actionId,
  issueId,
  nativeHandle,
  repairId,
  actor,
  timestamp,
  forwardOperationId,
  ownerNoCallPointer,
  correctionId,
  ownerCorrectionPointer,
  focusedFailureCorrection,
}: RuntimeCodeRebindPlanInput) {
  requireRebind(
    identifier.test(repairId) &&
      typeof forwardOperationId === 'string' &&
      Number.isSafeInteger(attempt) &&
      attempt > 0 &&
      hash.test(actionId) &&
      typeof issueId === 'string' &&
      issueId.length > 0 &&
      issueId.length <= 256 &&
      typeof nativeHandle === 'string' &&
      nativeHandle.length > 0 &&
      nativeHandle.length <= 256 &&
      validRuntimeCodePointer(focusedFailureCorrection, ownerCorrectionPointer, correctionId, ownerNoCallPointer) &&
      typeof actor === 'string' &&
      actor.trim() === actor &&
      actor.length > 0 &&
      typeof timestamp === 'string' &&
      !Number.isNaN(Date.parse(timestamp)),
    'attribution or action identity invalid',
  );
  requireRebind(
    Array.isArray(projectIds) &&
      projectIds.length > 0 &&
      projectIds.every((id, index) => typeof id === 'string' && (index === 0 || projectIds[index - 1] < id)),
    'project set not sorted and unique',
  );
  const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
  const identity = {
    repository_id: project.repository_id,
    project_ids: project.project_ids,
    integrations_digest: project.integrations_digest,
    work_id: workId,
  };
  const captured = createCliHostStateStore(
    database,
    workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    root,
  ).readWorkSessionSnapshot(identity, attempt);
  const { work, ledger, journal, maintenanceGeneration } = requireCapturedWorkSession(captured);
  const owner = work.value;
  const state = journal.value;
  const item = [...state.items, ...state.completed.flatMap((wave) => wave.items)].find(
    (entry) => entry.request?.action_id === actionId,
  );
  const { assignment, profile, toolPolicy } = runtimeCodeAssignment(config, item);
  const dispatchRow =
    focusedFailureCorrection || correctionId
      ? null
      : sqlitePayloadRow(
          database
            .query(
              'SELECT payload,digest FROM agent_host_readonly_dispatch_activation WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=?',
            )
            .get(workspaceId, workId, attempt, actionId),
          'read-only dispatch activation',
        );
  const dispatch = dispatchRow === null ? null : parsedRecord(dispatchRow.payload, 'read-only dispatch activation');
  const dispatchGeneration =
    dispatch && typeof dispatch.generation === 'number' && Number.isSafeInteger(dispatch.generation)
      ? dispatch.generation
      : undefined;
  const repairRow =
    dispatch !== null && dispatchGeneration !== undefined
      ? sqlitePayloadRow(
          database
            .query(
              'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=?',
            )
            .get(workspaceId, workId, attempt, actionId, dispatchGeneration),
          'read-only dispatch repair',
        )
      : null;
  const repair = repairRow ? parsedRecord(repairRow.payload, 'read-only dispatch repair') : null;
  const repairBody = repair ? Object.fromEntries(Object.entries(repair).filter(([key]) => key !== 'digest')) : {};
  const correctionRow =
    correctionId !== undefined
      ? sqlitePayloadRow(
          database
            .query(
              'SELECT payload,digest FROM agent_host_synthesis_observation_correction WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
            )
            .get(workspaceId, workId, attempt, actionId),
          'synthesis correction',
        )
      : null;
  const correction = correctionRow === null ? null : parsedRecord(correctionRow.payload, 'synthesis correction');
  const correctionBody = correction
    ? Object.fromEntries(Object.entries(correction).filter(([key]) => key !== 'digest'))
    : {};
  const correctionOriginalItem = correction
    ? rebindRecord(correction.original_item, 'synthesis correction original item missing')
    : null;
  const paused = owner.execution.status === 'suspended' && owner.lease === null;
  const prior =
    paused &&
    [...ledger.value.tickets]
      .reverse()
      .find(
        (ticket) =>
          ticket.work_id === workId &&
          ticket.repository_id === identity.repository_id &&
          canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(projectIds) &&
          ticket.integrations_digest === identity.integrations_digest &&
          ticket.thread_id === nativeHandle &&
          ticket.status === 'released',
      );
  const releasedClaim =
    prior && ledger.value.claims.find((claim) => claim.ticket_id === prior.ticket_id && claim.status === 'released');
  const release =
    prior &&
    ledger.value.operations.find(
      (operation) =>
        operation.ticket_id === prior.ticket_id && operation.kind === 'release' && operation.thread_id === nativeHandle,
    );
  const pausedOwner =
    paused &&
    prior &&
    releasedClaim &&
    release &&
    prior.source_revision === state.source_scope?.digest &&
    prior.exclusive_resources.every(
      (resource) =>
        owner.binding.allowed_resources.includes(resource) &&
        (resource.startsWith('file:') || resource === 'execution:' + workId),
    ) &&
    !owner.execution.assignment_attempts.some((entry) => entry.status === 'started' || entry.status === 'uncertain');
  requireRebind(
    focusedFailureCorrection
      ? owner.schema === 'WorkState/v1' &&
          owner.workspace_id === workspaceId &&
          owner.binding.lifecycle_work_id === workId &&
          owner.binding.config_digest === runtimeConfigDigest(config) &&
          owner.binding.integrations_digest === identity.integrations_digest &&
          canonicalJsonDigest(owner.binding.project_ids) === canonicalJsonDigest(projectIds) &&
          owner.lifecycle.phase === 'VERIFY' &&
          owner.execution.status === 'active' &&
          owner.lease?.thread_id === nativeHandle &&
          owner.execution.assignment_attempts.every((entry) => ['completed', 'no_effect'].includes(entry.status)) &&
          state.work_id === workId &&
          state.attempt === attempt &&
          state.workspace_id === workspaceId &&
          state.source_scope?.digest === owner.binding.work_source_revision &&
          runtimeCodeCorrectiveEvidence(state, config, owner).failed.some(
            (entry) => entry.request.action_id === actionId && entry.issue_id === issueId,
          )
      : owner.schema === 'WorkState/v1' &&
          owner.workspace_id === workspaceId &&
          owner.binding.lifecycle_work_id === workId &&
          owner.binding.config_digest === runtimeConfigDigest(config) &&
          owner.binding.integrations_digest === identity.integrations_digest &&
          canonicalJsonDigest(owner.binding.project_ids) === canonicalJsonDigest(projectIds) &&
          ((owner.execution.status === 'active' && owner.lease?.thread_id === nativeHandle) || pausedOwner) &&
          owner.lifecycle.phase === 'INTAKE' &&
          owner.lifecycle.seal === null &&
          state.schema === 'MastraSessionLedger/v1' &&
          state.workspace_id === workspaceId &&
          state.work_id === workId &&
          state.attempt === attempt &&
          state.run_id === owner.execution.run_id &&
          (correctionId ? item?.issue_id === null : item?.issue_id === issueId) &&
          item?.observation === null &&
          !item.research_activation &&
          !item.research_normalization &&
          !item.host_reservation &&
          item.request.config_digest === runtimeConfigDigest(config) &&
          item.request.scope_digest === state.source_scope?.digest &&
          owner.binding.work_source_revision === state.source_scope.digest &&
          assignment?.role === item.request.role &&
          profile?.mutation_scope === 'none' &&
          profile?.tools_policy === 'read_only' &&
          toolPolicy?.source_write === false &&
          (correctionId
            ? correction &&
              correctionRow &&
              correction !== null &&
              correction.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
              correction.digest === correctionRow.digest &&
              correction.digest === canonicalJsonDigest(correctionBody) &&
              correction.correction_id === correctionId &&
              correction.owner_correction_pointer === ownerCorrectionPointer &&
              correction.workspace_id === workspaceId &&
              correction.repository_id === identity.repository_id &&
              canonicalJsonDigest(correction.project_ids) === canonicalJsonDigest(projectIds) &&
              correction.integrations_digest === identity.integrations_digest &&
              correction.work_id === workId &&
              correction.attempt === attempt &&
              correction.action_id === actionId &&
              correction.prior_issue_id === issueId &&
              correctionOriginalItem &&
              correctionOriginalItem.issue_id === issueId &&
              isPlainRecord(correctionOriginalItem.observation) &&
              rebindRecord(correctionOriginalItem.observation, 'corrected observation missing').status ===
                'reported_complete' &&
              canonicalJsonDigest(correctionOriginalItem.request) === canonicalJsonDigest(item.request) &&
              correction.config_digest === runtimeConfigDigest(config) &&
              correction.source_digest === state.source_scope.digest
            : dispatch &&
              dispatchRow &&
              canonicalJsonDigest(dispatch) === dispatchRow.digest &&
              dispatch.schema === 'VidaReadOnlyDispatchActivation/v1' &&
              dispatch.logical_action_id === actionId &&
              dispatch.issue_id === issueId &&
              repair &&
              (repair.schema === 'VidaReadOnlyDispatchRepairPlan/v1' ||
                (repair.schema === 'VidaReadOnlyDispatchRepairPlan/v2' &&
                  typeof repair.maintenance_generation === 'number' &&
                  Number.isSafeInteger(repair.maintenance_generation) &&
                  repair.maintenance_generation >= 0)) &&
              repairRow &&
              repairRow.digest === repair.digest &&
              repair.digest === canonicalJsonDigest(repairBody) &&
              dispatch.plan_digest === repair.digest &&
              repair.workspace_id === workspaceId &&
              repair.repository_id === identity.repository_id &&
              canonicalJsonDigest(repair.project_ids) === canonicalJsonDigest(projectIds) &&
              repair.integrations_digest === identity.integrations_digest &&
              repair.work_id === workId &&
              repair.attempt === attempt &&
              repair.logical_action_id === actionId &&
              repair.replacement_generation === dispatch.generation &&
              repair.prior_outcome === 'unknown' &&
              repair.prior_issue_id === dispatch.prior_issue_id &&
              repair.replacement_issue_id === issueId &&
              repair.dispatch_action_id === dispatch.dispatch_action_id &&
              repair.prior_native_handle === nativeHandle &&
              repair.request_digest === canonicalJsonDigest(item.request) &&
              repair.scope_digest === item.request.scope_digest &&
              repair.config_digest === item.request.config_digest &&
              repair.source_digest === state.source_scope.digest),
    'current owner, journal or issued replacement differs',
  );
  requireRebind(state.source_scope, 'declared task source is missing');
  validateWorkSessionBinding(owner, state, root);
  const access = requireSafeRepositoryAccess(root);
  requireRebind(
    snapshotDeclaredSources(
      access,
      state.source_scope.entries.map((entry) => entry.path),
    ).digest === state.source_scope.digest,
    'declared task source changed',
  );
  const intake = owner.artifacts.find(
    (ref) => ref.artifact_id === 'local-session-intake' && ref.schema === 'VidaLocalSessionIntake/v1',
  );
  requireRebind(intake, 'exact intake reference missing');
  const intakeBytes = access.readBytes(intake.path, 'runtime-code rebind intake');
  requireRebind(sha(intakeBytes) === intake.sha256, 'intake bytes differ');
  const intakeValue = parsedRecord(intakeBytes.toString('utf8'), 'runtime-code rebind intake');
  const paths = runtimePackageCodePaths(config.runtime.bundle);
  requireRebind(
    canonicalJsonDigest(intakeValue.runtime_code_paths) === canonicalJsonDigest(paths),
    'old subset-engine intake is historical; use lawful supersession and a fresh canonical admission',
  );
  requireRebind(
    paths.length > 0 && new Set(paths).size === paths.length && intakeValue.native_session_handle === nativeHandle,
    'intake runtime paths or owner differ',
  );
  const current = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, paths);
  const oldDigest = owner.binding.runtime_code_digest;
  const newDigest = current.digest;
  const lineage = forwardLineage(root, forwardOperationId, paths, oldDigest, newDigest);
  const correctionDigest =
    correctionId === undefined
      ? undefined
      : requiredStringField(
          rebindRecord(correction, 'synthesis correction is missing'),
          'digest',
          'synthesis correction digest',
        );
  const request = parseRuntimeCodeRebindRequest({
    identity,
    attempt,
    actionId,
    issueId,
    nativeSessionHandle: nativeHandle,
    expectedWork: work.version,
    expectedLedger: ledger.version,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: maintenanceGeneration,
    oldRuntimeCodeDigest: oldDigest,
    newRuntimeCodeDigest: newDigest,
    forwardOperationId,
    parentManifestDigest: lineage.parentManifestDigest,
    successorManifestDigest: lineage.successorManifestDigest,
    ...(focusedFailureCorrection
      ? { focusedFailureCorrection: { ownerCorrectionPointer } }
      : correctionId
        ? { synthesisCorrection: { correctionId, correctionDigest, ownerCorrectionPointer } }
        : { ownerNoCallPointer }),
  });
  const body = {
    schema: 'VidaRuntimeCodeRebindPlan/v1',
    repair_id: repairId,
    actor,
    timestamp,
    runtime_code_paths: paths,
    lease_transition: paused ? 'resume_paused' : 'already_active',
    request,
  } satisfies Omit<RuntimeCodeRebindPlan, 'digest'>;
  return { ...body, digest: canonicalJsonDigest(body) };
}

function readPlan(root: string, repairId: string): RuntimeCodeRebindPlan {
  const file = path.join(root, planPath(repairId));
  const stat = lstatSync(file);
  requireRebind(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'plan path unsafe');
  const plan = parseRuntimeCodeRebindPlan(JSON.parse(readFileSync(file, 'utf8')));
  const { digest, ...body } = plan;
  requireRebind(
    plan.schema === 'VidaRuntimeCodeRebindPlan/v1' &&
      plan.repair_id === repairId &&
      digest === canonicalJsonDigest(body),
    'frozen plan digest invalid',
  );
  return plan;
}

function writePlan(root: string, repairId: string, plan: RuntimeCodeRebindPlan) {
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory(`.agent/work/${repairId}`, 'runtime-code rebind evidence');
  const file = path.join(root, planPath(repairId));
  const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, Buffer.from(`${JSON.stringify(plan, null, 2)}\n`));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function readDeliveredContinuationPlan(root: string, repairId: string): DeliveredContinuationPlan {
  const file = path.join(root, deliveredContinuationPlanPath(repairId));
  const stat = lstatSync(file);
  requireRebind(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'delivered continuation plan path unsafe');
  const plan = parseDeliveredContinuationPlan(JSON.parse(readFileSync(file, 'utf8'))),
    { digest, ...body } = plan;
  requireRebind(
    plan.schema === 'VidaDeliveredWorkContinuationPlan/v1' &&
      plan.repair_id === repairId &&
      digest === canonicalJsonDigest(body),
    'delivered continuation plan digest invalid',
  );
  validateDeliveredWorkContinuationRequest(plan.request);
  return plan;
}

function writeDeliveredContinuationPlan(root: string, repairId: string, plan: DeliveredContinuationPlan) {
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory(`.agent/work/${repairId}`, 'delivered continuation evidence');
  const file = path.join(root, deliveredContinuationPlanPath(repairId));
  const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, Buffer.from(`${JSON.stringify(plan, null, 2)}\n`));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function exactSourceCorrectionChanges(request: Record<string, unknown>): readonly ScopedSourceChange[] {
  const before = parseScopedSourceSnapshot(request.old_source),
    after = parseScopedSourceSnapshot(request.new_source),
    changes = compareRuntimeEndpointSnapshots(before, after),
    accepted = request.source_changes,
    allowedPaths = request.authorized_changed_paths;
  requireRebind(
    changes.length > 0 &&
      Array.isArray(accepted) &&
      canonicalJsonDigest(accepted) === canonicalJsonDigest(changes) &&
      Array.isArray(allowedPaths) &&
      allowedPaths.every((entry) => typeof entry === 'string') &&
      changes.every((change) => allowedPaths.includes(change.path)),
    'closed Source correction changes differ from their exact endpoint images',
  );
  return changes;
}

function sourceTransitionAuthorizedChanges(
  root: string,
  config: AgentRuntimeConfig,
  transitionId: string,
  proof: import('../src/orchestration/delivered-work-continuation.ts').ClosedConfigTransitionProof,
): readonly ScopedSourceChange[] {
  const access = requireSafeRepositoryAccess(root),
    sidecarPath = `${config.control.work_root}/${transitionId}/runtime-config-source-correction-repair.v1.json`,
    artifactValue = validatedJson(access, sidecarPath, 'closed Source correction artifact').value;
  const artifact = rebindRecord(artifactValue, 'closed Source correction artifact shape invalid');
  const digest = artifact.digest,
    body = Object.fromEntries(Object.entries(artifact).filter(([key]) => key !== 'digest'));
  const request = rebindRecord(artifact.request, 'closed Source correction request missing'),
    completion = rebindRecord(artifact.completion, 'closed Source correction completion missing');
  const changes = exactSourceCorrectionChanges(request);
  requireRebind(
    artifact.schema === 'RuntimeConfigSourceCorrectionRepair/v1' &&
      artifact.operation_id === transitionId &&
      artifact.status === 'applied' &&
      digest === canonicalJsonDigest(body) &&
      request.operation_id === transitionId &&
      proof.transition.operation_path ===
        `${config.control.work_root}/${transitionId}/runtime-config-delivery-operation.v1.json` &&
      canonicalJsonDigest(completion) === proof.transition_digest &&
      completion.request_digest === canonicalJsonDigest(request) &&
      changes.length > 0,
    'retained Source correction artifact differs from its closed transition proof',
  );
  return changes;
}

function isSafePublishedSourcePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 512 &&
    !value.startsWith('/') &&
    !/^[A-Za-z]:/.test(value) &&
    !/[\\\p{Cc}]/u.test(value) &&
    value.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

function addPublishedSourceEntry(candidate: unknown, published: Map<string, string>) {
  const entry = rebindRecord(candidate, 'published Source correction entry is invalid');
  requireRebind(
    entry &&
      Object.keys(entry).sort().join(',') === 'path,sha256' &&
      isSafePublishedSourcePath(entry.path) &&
      typeof entry.sha256 === 'string' &&
      hash.test(entry.sha256) &&
      !published.has(entry.path),
    'published Source correction entry is invalid',
  );
  published.set(entry.path, entry.sha256);
}

function requirePublishedSourceInventory(
  publicationValue: Record<string, unknown>,
  identity: WorkIdentity,
  config: AgentRuntimeConfig,
): Record<string, unknown> & { entries: unknown[] } {
  const source = rebindRecord(publicationValue.source_inventory, 'published Source inventory missing');
  const entries = source.entries;
  const commit = publicationValue.commit;
  requireRebind(
    typeof commit === 'string' &&
      /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit) &&
      isPlainRecord(publicationValue.project) &&
      publicationValue.project.repository_id === identity.repository_id &&
      publicationValue.project.config_digest === runtimeConfigDigest(config) &&
      Array.isArray(entries) &&
      entries.length > 0 &&
      entries.length <= 4096 &&
      source.source_binding === sha(Buffer.from(JSON.stringify(entries))),
    'published Source correction is invalid',
  );
  requireRebind(typeof commit === 'string', 'published Source commit is invalid');
  requireRebind(Array.isArray(entries), 'published Source entries are invalid');
  return { ...source, entries };
}

function publishedSourceMap(source: Record<string, unknown> & { entries: unknown[] }): Map<string, string> {
  const published = new Map<string, string>();
  for (const candidate of source.entries) addPublishedSourceEntry(candidate, published);
  return published;
}

function requirePublishedRuntimeTargets(
  targets: readonly { path: string; sha256: string | null; exists: boolean }[],
  published: ReadonlyMap<string, string>,
) {
  requireRebind(
    targets.every((entry) => (entry.exists ? published.get(entry.path) === entry.sha256 : !published.has(entry.path))),
    'runtime endpoint diff is outside the published correction',
  );
}

function verifyPublishedTaskSource(
  access: SafeRepositoryAccess,
  root: string,
  work: import('../src/host-state.ts').WorkState,
  journal: MastraSessionLedgerState,
  published: ReadonlyMap<string, string>,
  runtimeSourceTargets: readonly import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceEntry[],
  commit: string,
) {
  const currentSourceScope = snapshotDeclaredSources(access, [...work.lifecycle.scope.allowed_paths].sort());
  requireRebind(
    currentSourceScope && journal.source_scope,
    'current Source scope or original Journal snapshot is missing',
  );
  const authorizedSourceChanges = compareScopedSourceSnapshots(journal.source_scope, currentSourceScope);
  validateContinuationSourceChangePaths(work, authorizedSourceChanges);
  requireRebind(
    authorizedSourceChanges.every((change) =>
      change.after.exists ? published.get(change.path) === change.after.sha256 : !published.has(change.path),
    ),
    'current task Source changes differ from the correction byte record',
  );
  assertCommittedSourceChanges(root, commit, [
    ...runtimeSourceTargets.map((entry) => ({ path: entry.path, after: entry })),
    ...authorizedSourceChanges,
  ]);
  return { currentSourceScope, authorizedSourceChanges };
}

/** Shared exact native/Source endpoint verification; this grants no Host rights. */

export function verifyConfiguredNativeEndpoint({
  root,
  config,
  workspaceId,
  identity,
  work,
  journal,
  intake,
  intakeRef,
  access,
  sourceTransitionId,
  parentManifestRef,
  successorManifestRef,
  systemUpdateRef,
  sourceCorrectionRef,
}: {
  root: string;
  config: AgentRuntimeConfig;
  workspaceId: string;
  identity: WorkIdentity;
  work: import('../src/host-state.ts').WorkState;
  journal: MastraSessionLedgerState;
  intake: RuntimeEndpointIntake;
  intakeRef: { path: string; sha256: string };
  access: SafeRepositoryAccess;
  sourceTransitionId: string;
  parentManifestRef: string;
  successorManifestRef: string;
  systemUpdateRef: string;
  sourceCorrectionRef: string;
}) {
  const edge = readAppliedRuntimeConfigRebind(root, config, sourceTransitionId),
    plan = edge.value.plan;
  requireRebind(
    plan.old_config_digest === work.binding.config_digest &&
      identity.project_ids.every((id) => plan.project_ids.includes(id)),
    'normal config edge does not begin at the original Work',
  );
  const self = currentNativeSelfAttestation();
  requireRebind(self, 'configured frontier planning requires the installed native runtime');
  const parent = validatedJson(access, parentManifestRef, 'original native manifest'),
    successor = validatedJson(access, successorManifestRef, 'current native manifest'),
    update = validatedJson(access, systemUpdateRef, 'native system update'),
    publication = validatedJson(access, sourceCorrectionRef, 'published causal Source correction'),
    runtimePaths = requiredStringArray(
      runtimePackageCodePaths(config.runtime.bundle),
      'runtime code paths are missing',
    ),
    beforeCode = snapshotRuntimeManifestSources(
      parent.value,
      config.runtime.bundle,
      requiredStringArray(intake.runtime_code_paths, 'original intake runtime code paths are missing'),
    ),
    targetCode = snapshotRuntimeManifestSources(successor.value, config.runtime.bundle, runtimePaths),
    currentCode = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, runtimePaths),
    native = rebindRecord(successor.value, 'current native manifest shape invalid'),
    nativeAsset = rebindRecord(native.asset, 'current native manifest executable asset missing'),
    updateValue = rebindRecord(update.value, 'native update shape invalid'),
    publicationValue = rebindRecord(publication.value, 'published Source correction shape invalid'),
    installation = rebindRecord(updateValue.installation_observation, 'native installation observation missing');
  requireRebind(
    beforeCode.digest === work.binding.runtime_code_digest &&
      targetCode.digest === currentCode.digest &&
      beforeCode.digest !== targetCode.digest &&
      native.schema === 'VidaStandaloneBuild/v1' &&
      native.pin === self.bun_version &&
      native.version === self.package_version &&
      native.payloadId === self.resource_payload_id &&
      nativeAsset.sha256 === self.executable_sha256 &&
      nativeAsset.bytes === self.executable_bytes &&
      updateValue.status === 'CURRENT_SYSTEM_REPAIR_CHECKPOINT_UPDATED' &&
      typeof updateValue.operation_id === 'string' &&
      identifier.test(updateValue.operation_id) &&
      installation.schema === 'VidaNativeInstallationResult/v1' &&
      typeof installation.action === 'string' &&
      ['install', 'update'].includes(installation.action) &&
      installation.runtime_accepted === false &&
      installation.cleanup_complete === true &&
      typeof installation.sha256 === 'string' &&
      installation.sha256.toLowerCase() === self.executable_sha256 &&
      installation.bytes === self.executable_bytes &&
      installation.version === self.package_version &&
      typeof installation.path === 'string' &&
      path.resolve(installation.path) === path.resolve(self.executable_path) &&
      typeof updateValue.entry === 'string' &&
      path.resolve(updateValue.entry) === path.resolve(self.executable_path) &&
      updateValue.version === self.package_version &&
      updateValue.runtime_accepted === false &&
      updateValue.developer_unblocked === false,
    'native endpoints, current package or actual installation differ',
  );
  const registeredUpdate = releaseState(releaseJournalFile(root, updateValue.operation_id)),
    pendingUpdate = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  requireRebind(
    registeredUpdate.operation_id === updateValue.operation_id &&
      pendingUpdate.operation_id === registeredUpdate.operation_id &&
      registeredUpdate.version === self.package_version &&
      pendingUpdate.version === registeredUpdate.version &&
      ['awaiting_assurance', 'qualified', 'packed', 'installing', 'successful'].includes(registeredUpdate.status),
    'native endpoint observation has no matching current release-owner operation',
  );
  const source = requirePublishedSourceInventory(publicationValue, identity, config);
  const published = publishedSourceMap(source);
  const runtimeSourceTargets = runtimeEndpointSourceTargets(config.runtime.bundle, beforeCode, targetCode, currentCode);
  requirePublishedRuntimeTargets(runtimeSourceTargets, published);
  const { currentSourceScope, authorizedSourceChanges } = verifyPublishedTaskSource(
    access,
    root,
    work,
    journal,
    published,
    runtimeSourceTargets,
    requiredStringField(publicationValue, 'commit', 'published Source commit is invalid'),
  );
  const targetConfigDigest = runtimeConfigDigest(config);
  const transition = {
    schema: 'ConfiguredRuntimeEndpointTransition/v1',
    workspace_id: workspaceId,
    repository_id: identity.repository_id,
    project_ids: identity.project_ids,
    operation_path: edge.operationPath,
    operation_sha256: sha(edge.bytes),
    operation_plan_digest: edge.value.plan_digest,
    operation_release_digest: canonicalJsonDigest(edge.release),
    target_config_digest: targetConfigDigest,
    target_schema_digest: edge.targetSchemaDigest,
    target_yaml_sha256: sha(Buffer.from(plan.target_yaml)),
    receipt_path: edge.receiptPath,
    receipt_sha256: sha(edge.receipt.bytes),
    prior_runtime_code_digest: beforeCode.digest,
    target_runtime_code_digest: targetCode.digest,
    parent_manifest_digest: sha(parent.bytes),
    successor_manifest_digest: sha(successor.bytes),
    parent_manifest_ref: parentManifestRef,
    successor_manifest_ref: successorManifestRef,
    system_update_operation_id: updateValue.operation_id,
    system_update_ref: systemUpdateRef,
    system_update_sha256: sha(update.bytes),
    source_correction_ref: sourceCorrectionRef,
    source_correction_sha256: sha(publication.bytes),
    native_self_attestation_digest: canonicalJsonDigest(self),
    original_intake_ref: intakeRef.path,
    original_intake_sha256: intakeRef.sha256,
    runtime_accepted: false,
  };
  const sourceTransition = validateClosedConfigRebindProof({
    status: 'closed_config_rebind_proven',
    operation_id: sourceTransitionId,
    baseline_config_digest: work.binding.config_digest,
    transition,
    transition_digest: canonicalJsonDigest(transition),
    caller_owner_cas_required: true,
    runtime_accepted: false,
    writes_host_state: false,
  });
  return {
    edge,
    plan,
    runtimePaths,
    beforeCode,
    targetCode,
    currentCode,
    parent,
    successor,
    update,
    publication,
    currentSourceScope,
    authorizedSourceChanges,
    systemUpdateOperationId: updateValue.operation_id,
    self,
    sourceTransition,
  };
}

/** Plan a same-attempt unissued continuation from actual config and native endpoint evidence. */

function planConfiguredFrontierContinuation({
  database,
  root,
  config,
  workspaceId,
  projectIds,
  workId,
  attempt,
  nativeHandle,
  repairId,
  actor,
  timestamp,
  sourceTransitionId,
  ownerNoCallPointer,
  parentManifestRef,
  successorManifestRef,
  systemUpdateRef,
  sourceCorrectionRef,
}: ConfiguredFrontierPlanInput): DeliveredContinuationPlan {
  requireRebind(
    identifier.test(repairId) &&
      identifier.test(sourceTransitionId) &&
      Number.isSafeInteger(attempt) &&
      attempt > 0 &&
      typeof nativeHandle === 'string' &&
      nativeHandle.trim() === nativeHandle &&
      nativeHandle.length > 0 &&
      nativeHandle.length <= 256 &&
      typeof actor === 'string' &&
      actor.trim() === actor &&
      actor.length > 0 &&
      actor.length <= 256 &&
      typeof timestamp === 'string' &&
      !Number.isNaN(Date.parse(timestamp)) &&
      typeof ownerNoCallPointer === 'string' &&
      ownerNoCallPointer.trim() === ownerNoCallPointer &&
      ownerNoCallPointer.length > 0 &&
      ownerNoCallPointer.length <= 2048 &&
      !/\p{Cc}/u.test(ownerNoCallPointer),
    'configured frontier attribution is invalid',
  );
  const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds),
    identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: workId,
    },
    store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
    captured = store.readWorkSessionSnapshot(identity, attempt),
    state = captured.host,
    { work: capturedWork, journal: journalRow } = requireCapturedWorkSession(captured),
    work = capturedWork.value,
    journal = journalRow.value;
  requireRebind(
    work &&
      state.workVersion &&
      state.ledgerVersion &&
      work.workspace_id === workspaceId &&
      work.execution.status === 'suspended' &&
      ['implementation', 'awaiting_followup'].includes(work.execution.phase) &&
      work.lease === null &&
      work.lifecycle.phase === 'INTAKE' &&
      work.lifecycle.seal === null &&
      work.binding.repository_id === identity.repository_id &&
      work.binding.integrations_digest === identity.integrations_digest &&
      canonicalJsonDigest(work.binding.project_ids) === canonicalJsonDigest(identity.project_ids) &&
      work.binding.lifecycle_work_id === workId &&
      work.execution.run_id === journal.run_id &&
      journal.workspace_id === workspaceId &&
      journal.work_id === workId &&
      journal.attempt === attempt &&
      journal.source_scope?.digest === work.binding.work_source_revision &&
      work.execution.assignment_attempts.every((entry) => ['completed', 'no_effect'].includes(entry.status)),
    'original unissued Work or Journal no longer matches',
  );
  const access = requireSafeRepositoryAccess(root),
    intakeRef = work.artifacts.find(
      (ref) => ref.artifact_id === 'local-session-intake' && ref.schema === 'VidaLocalSessionIntake/v1',
    );
  requireRebind(intakeRef, 'original protected intake is missing');
  const intakeFile = validatedJson(access, intakeRef.path, 'original protected intake'),
    intake = parseRebindIntake(intakeFile.value);
  requireRebind(
    sha(intakeFile.bytes) === intakeRef.sha256 &&
      intake.schema === 'VidaLocalSessionIntake/v1' &&
      intake.native_session_handle === nativeHandle &&
      canonicalJsonDigest(intake.work_item) === work.binding.work_item_digest,
    'original intake bytes, task or native owner differ',
  );
  const sourceApproval = work.lifecycle.references.find(
    (ref) =>
      ref.kind === 'execution_approval' &&
      ref.disposition === 'current' &&
      ref.decision === 'approved' &&
      ref.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      ref.path === intake.source_authorization_path,
  );
  requireRebind(sourceApproval, 'original accepted human Source instruction is unavailable');
  const sourceAuthority = readLocalSourceWriteAuthorization(root, sourceApproval.path),
    authority = sourceAuthority.authorization;
  requireRebind(
    sourceAuthority.sha256 === sourceApproval.sha256 &&
      authority.work_id === workId &&
      authority.attempt === attempt &&
      authority.native_session_handle === nativeHandle &&
      authority.scope_digest === work.binding.work_source_revision &&
      authority.config_digest === work.binding.config_digest &&
      authority.workflow_id === work.binding.workflow_id &&
      authority.user_instruction_ref === sourceApproval.record_id &&
      authority.user_instruction_ref === ownerNoCallPointer &&
      sourceApproval.principal === 'local-session:' + canonicalJsonDigest(nativeHandle) &&
      canonicalJsonDigest([...authority.implementation_paths].sort()) ===
        canonicalJsonDigest([...work.binding.implementation_paths].sort()),
    'original accepted human instruction, scope or owner binding differs',
  );
  const {
    edge,
    plan,
    runtimePaths,
    beforeCode,
    targetCode,
    parent,
    successor,
    systemUpdateOperationId,
    currentSourceScope,
    authorizedSourceChanges,
    sourceTransition,
  } = verifyConfiguredNativeEndpoint({
    root,
    config,
    workspaceId,
    identity,
    work,
    journal,
    intake,
    intakeRef,
    access,
    sourceTransitionId,
    parentManifestRef,
    successorManifestRef,
    systemUpdateRef,
    sourceCorrectionRef,
  });
  const selection = parseWorkItemSelection(intake.work_item, work.binding.team_id);
  requireRebind(
    project.project_ids.includes(selection.project) &&
      selectWorkflow(config, selection).workflow_id === work.binding.workflow_id,
    'current config no longer selects the original workflow',
  );
  const oldConfig = validateRuntimeConfigRepairTargetBytes(Buffer.from(plan.baseline_yaml), root),
    engine = readRetainedUnissuedSessionEngineSnapshot(
      {
        repositoryRoot: root,
        config: oldConfig,
        selection,
        context: { work_id: workId, attempt, scope_digest: journal.source_scope.digest },
        workflowId: work.binding.workflow_id,
        runId: journal.run_id,
        lifecycleRisk: work.lifecycle.risk,
      },
      { work, journal },
    ),
    targetConfigDigest = runtimeConfigDigest(config),
    action = projectConfiguredFrontierContinuationAction({ engine, journal, targetConfigDigest, currentSourceScope });
  const request = validateDeliveredWorkContinuationRequest({
    schema: 'DeliveredWorkContinuationRequest/v1',
    identity,
    attempt,
    nativeSessionHandle: nativeHandle,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: journalRow.version,
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    priorConfigDigest: work.binding.config_digest,
    targetConfigDigest,
    targetSchemaDigest: edge.targetSchemaDigest,
    targetProjectContextDigest: project.project_context_digest,
    priorRuntimeCodeDigest: beforeCode.digest,
    targetRuntimeCodeDigest: targetCode.digest,
    forwardOperationId: systemUpdateOperationId,
    parentManifestDigest: sha(parent.bytes),
    successorManifestDigest: sha(successor.bytes),
    currentSourceScope,
    authorizedSourceChanges,
    sourceTransition,
    action,
    originalRequestPointer: ownerNoCallPointer,
  });
  const body = {
    schema: 'VidaDeliveredWorkContinuationPlan/v1',
    repair_id: repairId,
    actor,
    timestamp,
    source_transition_id: sourceTransitionId,
    runtime_code_paths: runtimePaths,
    request,
  } satisfies Omit<DeliveredContinuationPlan, 'digest'>;
  return { ...body, digest: canonicalJsonDigest(body) };
}

async function planDeliveredWorkContinuation({
  database,
  root,
  config,
  workspaceId,
  projectIds,
  workId,
  attempt,
  actionId,
  issueId,
  nativeHandle,
  repairId,
  actor,
  timestamp,
  forwardOperationId,
  sourceTransitionId,
  ownerNoCallPointer,
}: DeliveredContinuationPlanInput): Promise<DeliveredContinuationPlan> {
  requireRebind(
    identifier.test(repairId) &&
      identifier.test(sourceTransitionId) &&
      Number.isSafeInteger(attempt) &&
      attempt > 0 &&
      hash.test(actionId) &&
      typeof issueId === 'string' &&
      issueId.length > 0 &&
      issueId.length <= 256 &&
      typeof nativeHandle === 'string' &&
      nativeHandle.length > 0 &&
      nativeHandle.length <= 256 &&
      typeof actor === 'string' &&
      actor.trim() === actor &&
      actor.length > 0 &&
      typeof timestamp === 'string' &&
      !Number.isNaN(Date.parse(timestamp)) &&
      typeof ownerNoCallPointer === 'string' &&
      ownerNoCallPointer.trim() === ownerNoCallPointer &&
      ownerNoCallPointer.length > 0 &&
      ownerNoCallPointer.length <= 2048 &&
      !/\p{Cc}/u.test(ownerNoCallPointer),
    'delivered continuation attribution or identity is invalid',
  );
  const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds),
    identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: workId,
    },
    store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
    captured = store.readWorkSessionSnapshot(identity, attempt),
    state = captured.host,
    { work: capturedWork, journal: journalRow } = requireCapturedWorkSession(captured),
    work = capturedWork.value,
    journal = journalRow.value;
  requireRebind(
    work &&
      state.workVersion &&
      state.ledgerVersion &&
      work.execution.status === 'suspended' &&
      work.execution.phase === 'awaiting_followup' &&
      work.lease === null &&
      work.lifecycle.phase === 'INTAKE' &&
      work.lifecycle.seal === null &&
      work.binding.config_digest !== runtimeConfigDigest(config) &&
      work.binding.lifecycle_work_id === workId &&
      work.binding.repository_id === identity.repository_id &&
      canonicalJsonDigest(work.binding.project_ids) === canonicalJsonDigest(identity.project_ids) &&
      work.binding.integrations_digest === identity.integrations_digest &&
      work.execution.run_id === journal.run_id &&
      journal.workspace_id === workspaceId &&
      journal.work_id === workId &&
      journal.attempt === attempt &&
      journal.source_scope?.digest === work.binding.work_source_revision &&
      !work.execution.assignment_attempts.some((entry) => entry.status === 'started' || entry.status === 'uncertain'),
    'original unfinished owner or journal no longer matches the continuation basis',
  );

  const capture = store.readHistoricalTerminalSynthesisCapture(identity, attempt, actionId);
  requireRebind(
    capture?.schema === 'HistoricalTerminalSynthesisCustodyReceipt/v1' &&
      capture.issue_id === issueId &&
      capture.request.native_session_handle === nativeHandle &&
      capture.request.user_request_pointer === ownerNoCallPointer &&
      capture.terminal_status === 'known_terminal_unaccepted' &&
      capture.task_status === 'unfinished' &&
      capture.accepted_result === false &&
      capture.rights_granted === false &&
      capture.runtime_acceptance === false,
    'exact retained terminal body, owner or original request pointer is unavailable',
  );
  const sourceTransition = validateClosedConfigTransitionProof(
    await runRuntimeConfigRebind([
      '--kind',
      'runtime-config-delivery',
      '--mode',
      'repair-transition',
      '--project-root',
      root,
      '--repair-id',
      sourceTransitionId,
    ]),
  );
  const sourceChanges = sourceTransitionAuthorizedChanges(root, config, sourceTransitionId, sourceTransition),
    sourceAccess = requireSafeRepositoryAccess(root),
    intakeRef = work.artifacts.find(
      (ref) => ref.artifact_id === 'local-session-intake' && ref.schema === 'VidaLocalSessionIntake/v1',
    );
  requireRebind(intakeRef, 'original local session intake is missing');
  const intakeBytes = sourceAccess.readBytes(intakeRef.path, 'original local session intake'),
    intake = parseRebindIntake(JSON.parse(intakeBytes.toString('utf8')));
  requireRebind(
    sha(intakeBytes) === intakeRef.sha256 &&
      intake.schema === 'VidaLocalSessionIntake/v1' &&
      intake.native_session_handle === nativeHandle &&
      Array.isArray(intake.runtime_code_paths) &&
      canonicalJsonDigest(intake.work_item) === work.binding.work_item_digest,
    'original intake bytes or owner binding changed',
  );
  const runtimePaths = runtimePackageCodePaths(config.runtime.bundle);
  requireRebind(
    runtimePaths.length > 0 && canonicalJsonDigest(intake.runtime_code_paths) === canonicalJsonDigest(runtimePaths),
    'original intake runtime inventory differs from the current canonical bundle',
  );
  const targetRuntimeCode = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, runtimePaths),
    targetConfigDigest = runtimeConfigDigest(config);
  requireRebind(
    targetConfigDigest === sourceTransition.transition.target_config_digest &&
      targetRuntimeCode.digest === sourceTransition.transition.source_snapshot_digest &&
      targetRuntimeCode.digest !== work.binding.runtime_code_digest,
    'current installed configuration or runtime bytes differ from the accepted Source transition',
  );
  const lineage = forwardLineage(
      root,
      forwardOperationId,
      runtimePaths,
      work.binding.runtime_code_digest,
      targetRuntimeCode.digest,
    ),
    allowedScopePaths = [...work.lifecycle.scope.allowed_paths].sort(),
    currentSourceScope = snapshotDeclaredSources(sourceAccess, allowedScopePaths);
  requireRebind(
    allowedScopePaths.length > 0 &&
      canonicalJsonDigest(currentSourceScope.entries.map((entry) => entry.path)) ===
        canonicalJsonDigest(journal.source_scope.entries.map((entry) => entry.path)),
    'current Source snapshot no longer covers the exact original Work scope',
  );
  const authorizedSourceChanges = compareScopedSourceSnapshots(journal.source_scope, currentSourceScope);
  requireRebind(
    canonicalJsonDigest(authorizedSourceChanges) ===
      canonicalJsonDigest(sourceChanges.filter((change) => allowedScopePaths.includes(change.path))),
    'current Work source changes differ from the exact accepted Source beforeimage transition',
  );
  const selection = parseWorkItemSelection(intake.work_item, work.binding.team_id);
  requireRebind(
    project.project_ids.includes(intake.work_item.project_id) &&
      selectWorkflow(config, selection).workflow_id === work.binding.workflow_id,
    'current config no longer selects the original Work workflow and project',
  );
  const workflow = config.workflows[work.binding.workflow_id],
    reviewStage = workflow?.stages.find((stage) => stage.id === 'validate_parallel'),
    reviewAssignment = reviewStage?.assignments[0],
    reviewProfile = reviewAssignment && config.agents.profiles[reviewAssignment.profile],
    reviewTools = reviewProfile && config.agents.tool_policies[reviewProfile.tools_policy];
  requireRebind(
    reviewStage?.kind === 'validate' &&
      reviewStage.mode === 'parallel' &&
      reviewAssignment?.role === 'correctness-validator' &&
      reviewProfile?.mutation_scope === 'none' &&
      reviewProfile.tools_policy === 'read_only' &&
      reviewTools?.source_write === false,
    'current configured first review is not the read-only Core correctness validator',
  );
  const compiled = compileDevelopmentWorkflow(config, selection.team, work.binding.workflow_id, selection.risk_flags),
    reviewWaveIndex = compiled.waves.findIndex((wave) => wave.some((stage) => stage.id === reviewStage.id));
  requireRebind(reviewWaveIndex >= 0, 'current review stage is not in the configured workflow');
  const context = { work_id: workId, attempt, scope_digest: currentSourceScope.digest },
    reviewActions = sessionActionsForWave(config, selection, context, work.binding.workflow_id, reviewWaveIndex, []),
    reviewAction = reviewActions.find((action) => action.stage_id === reviewStage.id && action.assignment_index === 0);
  requireRebind(reviewAction, 'current review assignment did not produce a workflow action');
  const configuredContext = configuredContextForStage(root, config, work.binding.workflow_id, reviewStage.id, context),
    sessionRequest = buildSessionBridgeRequest({
      runId: journal.run_id,
      workflowId: work.binding.workflow_id,
      configDigest: targetConfigDigest,
      context,
      waveIndex: reviewWaveIndex,
      action: reviewAction,
      configuredContext,
      priorResults: [],
    }),
    action = projectHistoricalTerminalReviewAction({
      workflowId: work.binding.workflow_id,
      sourceScopeDigest: currentSourceScope.digest,
      targetConfigDigest,
      capture: {
        action_id: capture.action_id,
        issue_id: capture.issue_id,
        receipt_digest: canonicalJsonDigest(capture),
        body_sha256: capture.body_sha256,
        body_ref: capture.provenance.body_ref,
      },
      originalRequestPointer: ownerNoCallPointer,
      request: sessionRequest,
    });
  const request = validateDeliveredWorkContinuationRequest({
    schema: 'DeliveredWorkContinuationRequest/v1',
    identity,
    attempt,
    nativeSessionHandle: nativeHandle,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: journalRow.version,
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    priorConfigDigest: work.binding.config_digest,
    targetConfigDigest,
    targetSchemaDigest: sha(
      runtimePackageAccess().readBytes('schemas/agent-runtime-config.v1.schema.json', 'current config schema'),
    ),
    targetProjectContextDigest: project.project_context_digest,
    priorRuntimeCodeDigest: work.binding.runtime_code_digest,
    targetRuntimeCodeDigest: targetRuntimeCode.digest,
    forwardOperationId,
    parentManifestDigest: lineage.parentManifestDigest,
    successorManifestDigest: lineage.successorManifestDigest,
    currentSourceScope,
    authorizedSourceChanges,
    sourceTransition,
    action,
    originalRequestPointer: ownerNoCallPointer,
  });
  const body = {
    schema: 'VidaDeliveredWorkContinuationPlan/v1',
    repair_id: repairId,
    actor,
    timestamp,
    source_transition_id: sourceTransitionId,
    runtime_code_paths: runtimePaths,
    request,
  } satisfies Omit<DeliveredContinuationPlan, 'digest'>;
  return { ...body, digest: canonicalJsonDigest(body) };
}

/** Apply one frozen delivered-work plan through the Host owner/CAS boundary. */

export async function applyDeliveredWorkContinuationPlan({
  database,
  root,
  workspaceId,
  plan,
  rebuildPlan,
}: {
  database: SqliteDatabase;
  root: string;
  workspaceId: string;
  plan: DeliveredContinuationPlan;
  rebuildPlan: () => Promise<DeliveredContinuationPlan> | DeliveredContinuationPlan;
}) {
  requireRebind(
    plan?.schema === 'VidaDeliveredWorkContinuationPlan/v1' &&
      typeof rebuildPlan === 'function' &&
      canonicalJsonDigest({
        schema: plan.schema,
        repair_id: plan.repair_id,
        actor: plan.actor,
        timestamp: plan.timestamp,
        source_transition_id: plan.source_transition_id,
        runtime_code_paths: plan.runtime_code_paths,
        request: plan.request,
      }) === plan.digest,
    'frozen delivered continuation plan is invalid',
  );
  const verifier: import('../src/orchestration/delivered-work-continuation.ts').DeliveredWorkContinuationVerifier = {
    principal: 'vida-agent-delivered-work-continuation',
    verify: async (request, snapshot) => {
      const current = await rebuildPlan();
      requireRebind(
        current.digest === plan.digest &&
          canonicalJsonDigest(current.request) === canonicalJsonDigest(request) &&
          snapshot.workVersion?.revision === request.expectedWork.revision &&
          snapshot.workVersion?.digest === request.expectedWork.digest &&
          snapshot.ledgerVersion?.revision === request.expectedLedger.revision &&
          snapshot.ledgerVersion?.digest === request.expectedLedger.digest &&
          snapshot.maintenanceGeneration === request.expectedMaintenanceGeneration,
        'delivered continuation plan, owner CAS or current Source proof changed',
      );
      return {
        schema: 'VidaDeliveredWorkContinuationAuthorization/v1',
        request_digest: canonicalJsonDigest(request),
        principal: 'vida-agent-delivered-work-continuation',
        transition_digest: request.sourceTransition.transition_digest,
        action_digest: canonicalJsonDigest(request.action),
      };
    },
  };
  const store = createCliHostStateStore(
    database,
    workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    root,
    undefined,
    undefined,
    verifier,
  );
  return store.continueDeliveredWork(plan.request);
}

function sameRepairIntent(
  left: RuntimeCodeRebindPlan | DeliveredContinuationPlan,
  right: RuntimeCodeRebindPlan | DeliveredContinuationPlan,
): boolean {
  const stable = (plan: RuntimeCodeRebindPlan | DeliveredContinuationPlan) => {
    const {
      expectedWork: _expectedWork,
      expectedLedger: _expectedLedger,
      expectedMaintenanceGeneration: _expectedMaintenanceGeneration,
      ...request
    } = plan.request;
    return {
      repair_id: plan.repair_id,
      actor: plan.actor,
      timestamp: plan.timestamp,
      runtime_code_paths: plan.runtime_code_paths,
      request,
    };
  };
  return canonicalJsonDigest(stable(left)) === canonicalJsonDigest(stable(right));
}

function runtimeCodePlanCorrectionOptions(request: RuntimeCodeRebindPlan['request']) {
  return {
    ...(request.ownerNoCallPointer === undefined ? {} : { ownerNoCallPointer: request.ownerNoCallPointer }),
    ...(request.synthesisCorrection === undefined ? {} : { correctionId: request.synthesisCorrection.correctionId }),
    ...(request.focusedFailureCorrection
      ? { ownerCorrectionPointer: request.focusedFailureCorrection.ownerCorrectionPointer }
      : request.synthesisCorrection
        ? { ownerCorrectionPointer: request.synthesisCorrection.ownerCorrectionPointer }
        : {}),
    ...(request.focusedFailureCorrection ? { focusedFailureCorrection: true } : {}),
  };
}

function currentPlan(
  database: SqliteDatabase,
  root: string,
  config: AgentRuntimeConfig,
  workspaceId: string,
  plan: RuntimeCodeRebindPlan,
): RuntimeCodeRebindPlan {
  const request = plan.request;
  return planRuntimeCodeRebind({
    database,
    root,
    config,
    workspaceId,
    projectIds: request.identity.project_ids,
    workId: request.identity.work_id,
    attempt: request.attempt,
    actionId: request.actionId,
    issueId: request.issueId,
    nativeHandle: request.nativeSessionHandle,
    repairId: plan.repair_id,
    actor: plan.actor,
    timestamp: plan.timestamp,
    forwardOperationId: request.forwardOperationId,
    ...runtimeCodePlanCorrectionOptions(request),
  });
}

const initialSourceFrontierRequestKeys = [
  'schema',
  'identity',
  'attempt',
  'actionId',
  'nativeSessionHandle',
  'leaseGeneration',
  'expectedWork',
  'expectedLedger',
  'expectedJournal',
  'expectedMaintenanceGeneration',
  'initialContinuationId',
  'initialContinuationRequestDigest',
  'configDigest',
  'sourceScopeDigest',
  'oldRuntimeCodeDigest',
  'newRuntimeCodeDigest',
  'runtimeCodePaths',
  'parentManifestRef',
  'parentManifestDigest',
  'successorManifestRef',
  'successorManifestDigest',
  'systemUpdateRef',
  'systemUpdateOperationId',
  'nativeSelfAttestationDigest',
];

function initialSourceFrontierExactKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    isPlainRecord(value) &&
    Reflect.ownKeys(value).length === keys.length &&
    Reflect.ownKeys(value).every((key) => typeof key === 'string' && keys.includes(key))
  );
}

/**
 * HostStateStore.readWorkSessionJournal checks the row digest and calls
 * validateWorkSessionBinding. The existing engine/lineage reader validates the
 * retained completed prefix and Source-scope relationship; this guard only
 * narrows fields read directly by the CLI and preserves the full journal.
 */
function isInitialSourceFrontierJournal(
  value: unknown,
  workspaceId: string,
  workId: string,
  attempt: number,
): value is MastraSessionLedgerState {
  const allowedKeys = [
    'schema',
    'workspace_id',
    'work_id',
    'attempt',
    'run_id',
    'corrective_execution',
    'source_scope',
    'research_wave_exposure',
    'step_id',
    'items',
    'completed',
  ];
  if (
    !isPlainRecord(value) ||
    !Reflect.ownKeys(value).every((key) => typeof key === 'string' && allowedKeys.includes(key)) ||
    value.schema !== 'MastraSessionLedger/v1' ||
    value.workspace_id !== workspaceId ||
    value.work_id !== workId ||
    value.attempt !== attempt ||
    typeof value.run_id !== 'string' ||
    value.run_id.length === 0 ||
    value.corrective_execution != null ||
    value.research_wave_exposure !== undefined ||
    (value.step_id !== null && typeof value.step_id !== 'string') ||
    !isPlainRecord(value.source_scope) ||
    value.source_scope.schema !== 'ScopedSourceSnapshot/v1' ||
    typeof value.source_scope.digest !== 'string' ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.completed)
  )
    return false;

  if (value.step_id === null) return value.items.length === 0;
  const currentStep = /^wave-(0|[1-9][0-9]*)$/.exec(value.step_id);
  if (!currentStep) return false;
  const currentItems: unknown[] = value.items;
  for (const rawItem of currentItems) {
    if (!isPlainRecord(rawItem)) return false;
    try {
      const request = parseSessionBridgeRequest(rawItem.request);
      if (request.run_id !== value.run_id || request.wave_index !== Number(currentStep[1])) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function readInitialSourceFrontierPlan(root: string, repairId: string): InitialSourceFrontierPlan {
  const access = requireSafeRepositoryAccess(root),
    relative = initialSourceFrontierPlanPath(repairId),
    bytes = access.readBytes(relative, 'initial-source frontier code-rebind plan');
  requireRebind(bytes.length <= 1024 * 1024, 'initial-source frontier plan exceeds its byte bound');
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  requireRebind(
    initialSourceFrontierExactKeys(parsed, ['schema', 'repair_id', 'request', 'endpoint_proof', 'digest']) &&
      parsed.schema === 'InitialSourceFrontierCodeRebindPlan/v1' &&
      parsed.repair_id === repairId &&
      typeof parsed.digest === 'string' &&
      hash.test(parsed.digest),
    'initial-source frontier plan identity or digest differs',
  );
  const request = validateInitialSourceFrontierCodeRebindRequest(parsed.request),
    endpointProof = validateInitialSourceFrontierCodeRebindVerifiedCurrent(parsed.endpoint_proof, request),
    body = {
      schema: 'InitialSourceFrontierCodeRebindPlan/v1',
      repair_id: repairId,
      request,
      endpoint_proof: endpointProof,
    } satisfies Omit<InitialSourceFrontierPlan, 'digest'>;
  requireRebind(
    request.schema === 'InitialSourceFrontierCodeRebindRequest/v1' && parsed.digest === canonicalJsonDigest(body),
    'initial-source frontier plan digest differs',
  );
  return { ...body, digest: parsed.digest };
}

function writeInitialSourceFrontierPlan(root: string, repairId: string, plan: InitialSourceFrontierPlan) {
  const access = requireSafeRepositoryAccess(root),
    relative = initialSourceFrontierPlanPath(repairId);
  access.ensureDirectory(`.agent/work/${repairId}`, 'initial-source frontier plan root');
  if (access.fileExists(relative, 'initial-source frontier plan presence')) {
    const prior = readInitialSourceFrontierPlan(root, repairId);
    requireRebind(
      canonicalJsonDigest(prior) === canonicalJsonDigest(plan),
      'existing initial-source frontier plan differs from the current proof',
    );
    return;
  }
  access.writeExclusive(relative, `${JSON.stringify(plan, null, 2)}\n`, 'initial-source frontier plan');
}

function frontierManifestPaths(manifest: unknown, bundle: string): string[] {
  requireRebind(
    isPlainRecord(manifest) &&
      manifest.schema === 'VidaStandaloneBuild/v1' &&
      Array.isArray(manifest.inputs) &&
      manifest.inputs.length > 0 &&
      manifest.inputs.length <= 2048,
    'native runtime manifest inventory is invalid',
  );
  const inputs: unknown[] = manifest.inputs;
  const paths = inputs
    .map((entry) => {
      requireRebind(
        isPlainRecord(entry) && typeof entry.path === 'string' && entry.path.length > 0 && entry.path.length <= 512,
        'native runtime manifest path is invalid',
      );
      return `${bundle}/${entry.path}`;
    })
    .sort();
  requireRebind(new Set(paths).size === paths.length, 'native runtime manifest inventory contains duplicate paths');
  return paths;
}

function readInitialSourceFrontierNativeEndpoint({
  root,
  config,
  access,
  request,
  state,
}: {
  root: string;
  config: AgentRuntimeConfig;
  access: SafeRepositoryAccess;
  request: InitialSourceFrontierCodeRebindRequest;
  state: import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindState;
}): InitialSourceFrontierCodeRebindVerifiedCurrent {
  const host = state.host,
    journal = state.journal.state,
    receipt = state.initialReceipt,
    work = host.work,
    configDigest = runtimeConfigDigest(config);
  requireRebind(
    host.workVersion &&
      host.ledgerVersion &&
      work &&
      work.lease &&
      host.ledger &&
      host.workVersion.revision === request.expectedWork.revision &&
      host.workVersion.digest === request.expectedWork.digest &&
      host.ledgerVersion.revision === request.expectedLedger.revision &&
      host.ledgerVersion.digest === request.expectedLedger.digest &&
      state.journal.version.revision === request.expectedJournal.revision &&
      state.journal.version.digest === request.expectedJournal.digest &&
      host.maintenanceGeneration === request.expectedMaintenanceGeneration &&
      canonicalJsonDigest(request.identity) === canonicalJsonDigest(receipt.request.identity) &&
      receipt.continuation_id === request.initialContinuationId &&
      receipt.request_digest === request.initialContinuationRequestDigest &&
      receipt.status === 'initial_request_ready' &&
      request.nativeSessionHandle === receipt.request.nativeSessionHandle &&
      request.attempt === receipt.request.attempt &&
      request.configDigest === configDigest &&
      work.binding.config_digest === configDigest &&
      work.lifecycle.phase === 'INTAKE' &&
      work.lifecycle.seal === null &&
      work.execution.status === 'active' &&
      work.execution.run_id === journal.run_id &&
      work.binding.runtime_code_digest === request.oldRuntimeCodeDigest &&
      work.binding.runtime_source_revision === request.oldRuntimeCodeDigest &&
      work.lease?.thread_id === request.nativeSessionHandle &&
      work.lease.generation === request.leaseGeneration &&
      work.binding.repository_id === request.identity.repository_id &&
      work.binding.lifecycle_work_id === request.identity.work_id &&
      canonicalJsonDigest(work.binding.project_ids) === canonicalJsonDigest(request.identity.project_ids) &&
      work.binding.integrations_digest === request.identity.integrations_digest &&
      journal.schema === 'MastraSessionLedger/v1' &&
      journal.work_id === request.identity.work_id &&
      journal.attempt === request.attempt &&
      journal.source_scope?.digest === request.sourceScopeDigest &&
      work.binding.work_source_revision === request.sourceScopeDigest &&
      !work.execution.assignment_attempts.some((entry) => entry.status === 'started' || entry.status === 'uncertain') &&
      journal.corrective_execution == null &&
      journal.research_wave_exposure === undefined,
    'initial-source frontier owner, attempt, source, config or CAS binding differs',
  );

  const lease = work.lease;
  requireRebind(lease, 'initial-source frontier owner lease is missing');
  const ticket = host.ledger.tickets.find((entry) => entry.ticket_id === lease.ticket_id),
    claim = host.ledger.claims.find(
      (entry) =>
        entry.ticket_id === lease.ticket_id &&
        entry.work_id === request.identity.work_id &&
        entry.thread_id === request.nativeSessionHandle &&
        entry.status === 'active',
    );
  requireRebind(
    ticket?.status === 'active' &&
      ticket.generation === request.leaseGeneration &&
      ticket.thread_id === request.nativeSessionHandle &&
      ticket.work_id === request.identity.work_id &&
      claim &&
      typeof ticket.expires_at === 'string' &&
      Number.isFinite(Date.parse(ticket.expires_at)) &&
      ticket.expires_at === claim.lease_expires_at &&
      canonicalJsonDigest(ticket.active_resources) === canonicalJsonDigest(['execution:' + request.identity.work_id]) &&
      canonicalJsonDigest(ticket.exclusive_resources) === canonicalJsonDigest(ticket.active_resources) &&
      canonicalJsonDigest(claim.resources) === canonicalJsonDigest(ticket.active_resources),
    'initial-source frontier recovery-control claim is not the exact owner claim',
  );

  const sourcePaths = [...work.lifecycle.scope.allowed_paths].sort(),
    currentSourceScope = snapshotDeclaredSources(access, sourcePaths);
  requireRebind(
    canonicalJsonDigest(sourcePaths) ===
      canonicalJsonDigest(receipt.request.currentSourceScope.entries.map((entry) => entry.path)) &&
      currentSourceScope.digest === request.sourceScopeDigest &&
      currentSourceScope.digest === receipt.request.currentSourceScope.digest,
    'initial-source frontier task Source changed',
  );

  const intakeRefs = work.artifacts.filter(
    (entry) => entry.artifact_id === 'local-session-intake' && entry.schema === 'VidaLocalSessionIntake/v1',
  );
  const intakeRef = intakeRefs[0];
  requireRebind(intakeRefs.length === 1 && intakeRef, 'initial-source frontier intake is missing or ambiguous');
  const intakeFile = validatedJson(access, intakeRef.path, 'initial-source frontier intake'),
    intake: unknown = intakeFile.value;
  requireRebind(isPlainRecord(intake), 'initial-source frontier intake is not a record');
  const workItem = intake.work_item;
  requireRebind(
    sha(intakeFile.bytes) === intakeRef.sha256 &&
      intake.schema === 'VidaLocalSessionIntake/v1' &&
      intake.native_session_handle === request.nativeSessionHandle &&
      isPlainRecord(workItem) &&
      canonicalJsonDigest(workItem) === work.binding.work_item_digest &&
      workItem.schema === 'WorkItem/v1',
    'initial-source frontier intake or selection binding differs',
  );
  const selection = parseWorkItemSelection(workItem, work.binding.team_id);
  requireRebind(
    request.identity.project_ids.includes(selection.project) &&
      selectWorkflow(config, selection).workflow_id === work.binding.workflow_id,
    'initial-source frontier current workflow selection differs',
  );
  const engine = readInitialSourceContinuationSessionEngineSnapshot(
    {
      repositoryRoot: root,
      config,
      selection,
      context: { work_id: request.identity.work_id, attempt: request.attempt, scope_digest: request.sourceScopeDigest },
      workflowId: work.binding.workflow_id,
      runId: journal.run_id,
      lifecycleRisk: work.lifecycle.risk,
    },
    receipt,
    { ...state.journal, resume_status: mastraLedgerStatus(journal) },
    state.host,
  );
  const currentStep = /^wave-(0|[1-9][0-9]*)$/.exec(journal.step_id ?? ''),
    waveIndex = currentStep ? Number(currentStep[1]) : -1,
    context = { work_id: request.identity.work_id, attempt: request.attempt, scope_digest: request.sourceScopeDigest },
    currentActions = sessionActionsForWave(
      config,
      selection,
      context,
      work.binding.workflow_id,
      waveIndex,
      [],
      undefined,
      work.lifecycle.risk,
    );
  requireRebind(
    waveIndex >= 0 &&
      engine.status === 'suspended' &&
      engine.step_id === journal.step_id &&
      currentActions.every(
        (action) => action.mutation_scope === 'none' && !action.resolved_profile.tools_policy.source_write,
      ),
    'initial-source frontier is not the current configured readonly wave',
  );
  const currentRequests = currentActions.map((action) =>
    buildSessionBridgeRequest({
      runId: journal.run_id,
      workflowId: work.binding.workflow_id,
      configDigest,
      context,
      waveIndex,
      action,
      configuredContext: configuredContextForStage(root, config, work.binding.workflow_id, action.stage_id, context),
      priorResults: engine.observations,
    }),
  );
  const currentRequest = currentRequests[0];
  requireRebind(
    currentRequests.length === 1 && currentRequest,
    'initial-source frontier is not the unique current unissued readonly action',
  );
  requireRebind(
    canonicalJsonDigest(currentRequests) === canonicalJsonDigest(journal.items.map((item) => item.request)) &&
      currentRequest.action_id === request.actionId &&
      currentRequest.run_id === journal.run_id &&
      currentRequest.config_digest === request.configDigest &&
      currentRequest.scope_digest === request.sourceScopeDigest,
    'initial-source frontier current action differs from the unique unissued readonly action',
  );

  const runtimePaths = [...runtimePackageCodePaths(config.runtime.bundle)].sort();
  requireRebind(
    runtimePaths.length > 0 &&
      runtimePaths.length <= 2048 &&
      new Set(runtimePaths).size === runtimePaths.length &&
      canonicalJsonDigest(runtimePaths) === canonicalJsonDigest(request.runtimeCodePaths),
    'current package runtime inventory differs from the request',
  );
  const parent = validatedJson(access, request.parentManifestRef, 'parent native manifest'),
    successor = validatedJson(access, request.successorManifestRef, 'successor native manifest'),
    update = validatedJson(access, request.systemUpdateRef, 'native system update'),
    parentManifest: unknown = parent.value,
    successorManifest: unknown = successor.value,
    updateValue: unknown = update.value;
  requireRebind(
    isPlainRecord(parentManifest) && isPlainRecord(successorManifest) && isPlainRecord(updateValue),
    'native endpoint evidence is not a record',
  );
  const parentInputs = new Set(frontierManifestPaths(parentManifest, config.runtime.bundle)),
    successorInputs = new Set(frontierManifestPaths(successorManifest, config.runtime.bundle)),
    parentRuntimePaths = runtimePaths.filter((relative) => parentInputs.has(relative));
  requireRebind(
    parentRuntimePaths.length > 0 && runtimePaths.every((relative) => successorInputs.has(relative)),
    'native endpoint is missing its declared runtime inventory',
  );
  const self = currentNativeSelfAttestation();
  requireRebind(self, 'initial-source frontier requires current native self-attestation');
  const beforeCode = snapshotRuntimeManifestSources(parentManifest, config.runtime.bundle, parentRuntimePaths),
    targetCode = snapshotRuntimeManifestSources(successorManifest, config.runtime.bundle, runtimePaths),
    currentCode = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, runtimePaths),
    installation = updateValue.installation_observation,
    asset = successorManifest.asset;
  requireRebind(
    isPlainRecord(installation) &&
      isPlainRecord(asset) &&
      beforeCode.digest === request.oldRuntimeCodeDigest &&
      targetCode.digest === currentCode.digest &&
      beforeCode.digest !== targetCode.digest &&
      successorManifest.schema === 'VidaStandaloneBuild/v1' &&
      successorManifest.pin === self.bun_version &&
      successorManifest.version === self.package_version &&
      successorManifest.payloadId === self.resource_payload_id &&
      asset.sha256 === self.executable_sha256 &&
      asset.bytes === self.executable_bytes &&
      updateValue.status === 'CURRENT_SYSTEM_REPAIR_CHECKPOINT_UPDATED' &&
      typeof updateValue.operation_id === 'string' &&
      identifier.test(updateValue.operation_id) &&
      installation?.schema === 'VidaNativeInstallationResult/v1' &&
      typeof installation.action === 'string' &&
      ['install', 'update'].includes(installation.action) &&
      installation.runtime_accepted === false &&
      installation.cleanup_complete === true &&
      typeof installation.sha256 === 'string' &&
      installation.sha256.toLowerCase() === self.executable_sha256 &&
      typeof installation.path === 'string' &&
      installation.bytes === self.executable_bytes &&
      installation.version === self.package_version &&
      path.resolve(installation.path) === path.resolve(self.executable_path) &&
      typeof updateValue.entry === 'string' &&
      path.resolve(updateValue.entry) === path.resolve(self.executable_path) &&
      updateValue.version === self.package_version &&
      updateValue.runtime_accepted === false &&
      updateValue.developer_unblocked === false,
    'parent/target code, current native installation or system update differ',
  );
  const registeredUpdate: unknown = releaseState(releaseJournalFile(root, updateValue.operation_id)),
    pendingUpdate: unknown = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  requireRebind(
    isPlainRecord(registeredUpdate) &&
      isPlainRecord(pendingUpdate) &&
      registeredUpdate.operation_id === updateValue.operation_id &&
      pendingUpdate.operation_id === registeredUpdate.operation_id &&
      typeof registeredUpdate.version === 'string' &&
      typeof pendingUpdate.version === 'string' &&
      registeredUpdate.version === self.package_version &&
      pendingUpdate.version === registeredUpdate.version &&
      typeof registeredUpdate.status === 'string' &&
      ['awaiting_assurance', 'qualified', 'packed', 'installing', 'successful'].includes(registeredUpdate.status),
    'native system update is not the current release-owner operation',
  );
  const proof = {
    runtimeCodePaths: runtimePaths,
    oldRuntimeCodeDigest: beforeCode.digest,
    newRuntimeCodeDigest: targetCode.digest,
    parentManifestRef: request.parentManifestRef,
    parentManifestDigest: sha(parent.bytes),
    successorManifestRef: request.successorManifestRef,
    successorManifestDigest: sha(successor.bytes),
    systemUpdateRef: request.systemUpdateRef,
    systemUpdateOperationId: updateValue.operation_id,
    nativeSelfAttestationDigest: canonicalJsonDigest(self),
  };
  return proof;
}

function verifyInitialSourceFrontierNativeEndpoint({
  root,
  config,
  access,
  request,
  state,
}: {
  root: string;
  config: AgentRuntimeConfig;
  access: SafeRepositoryAccess;
  request: InitialSourceFrontierCodeRebindRequest;
  state: import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindState;
}): InitialSourceFrontierCodeRebindVerifiedCurrent {
  const proof = readInitialSourceFrontierNativeEndpoint({ root, config, access, request, state });
  requireRebind(
    canonicalJsonDigest(proof) ===
      canonicalJsonDigest({
        runtimeCodePaths: request.runtimeCodePaths,
        oldRuntimeCodeDigest: request.oldRuntimeCodeDigest,
        newRuntimeCodeDigest: request.newRuntimeCodeDigest,
        parentManifestRef: request.parentManifestRef,
        parentManifestDigest: request.parentManifestDigest,
        successorManifestRef: request.successorManifestRef,
        successorManifestDigest: request.successorManifestDigest,
        systemUpdateRef: request.systemUpdateRef,
        systemUpdateOperationId: request.systemUpdateOperationId,
        nativeSelfAttestationDigest: request.nativeSelfAttestationDigest,
      }),
    'initial-source frontier native endpoint proof differs from the request',
  );
  return proof;
}

function planInitialSourceFrontierCodeRebind({
  database,
  root,
  config,
  workspaceId,
  projectIds,
  workId,
  attempt,
  actionId,
  repairId,
  parentManifestRef,
  successorManifestRef,
  systemUpdateRef,
}: {
  database: SqliteDatabase;
  root: string;
  config: AgentRuntimeConfig;
  workspaceId: string;
  projectIds: readonly string[];
  workId: string;
  attempt: number;
  actionId: string;
  repairId: string;
  parentManifestRef: string;
  successorManifestRef: string;
  systemUpdateRef: string;
}): InitialSourceFrontierPlan {
  requireRebind(
    identifier.test(repairId) &&
      identifier.test(workId) &&
      Number.isSafeInteger(attempt) &&
      attempt > 0 &&
      hash.test(actionId) &&
      stringArray(projectIds) &&
      projectIds.length > 0 &&
      projectIds.length <= 64 &&
      projectIds.every((id, index) => {
        const previous = projectIds[index - 1];
        return identifier.test(id) && (index === 0 || (previous !== undefined && previous < id));
      }) &&
      [parentManifestRef, successorManifestRef, systemUpdateRef].every(
        (reference) =>
          typeof reference === 'string' &&
          reference.length > 0 &&
          reference.length <= 512 &&
          !reference.startsWith('/') &&
          !/^[A-Za-z]:/.test(reference) &&
          !/[\\\p{Cc}]/u.test(reference) &&
          reference.split('/').every((part) => part && part !== '.' && part !== '..'),
      ),
    'initial-source frontier plan inputs are invalid',
  );
  const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds),
    identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: workId,
    },
    store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
    captured = store.readWorkSessionSnapshot(identity, attempt),
    host = captured.host,
    journalRow = captured.journal,
    initialReceipt = store.readInitialSourceContinuationReceipt(identity, attempt);
  requireRebind(journalRow && journalRow.attempt === attempt, 'initial-source frontier Host journal is missing');
  const journalValue = journalRow.state;
  requireRebind(
    isInitialSourceFrontierJournal(journalValue, workspaceId, workId, attempt),
    'initial-source frontier Host journal shape or run binding differs',
  );
  const journalState = journalValue;
  requireRebind(initialReceipt, 'initial-source continuation receipt is missing');
  const state = {
      host,
      journal: { version: journalRow.version, state: journalState, resume_status: mastraLedgerStatus(journalState) },
      initialReceipt,
    },
    runtimePaths = [...runtimePackageCodePaths(config.runtime.bundle)].sort();
  const lease = host.work?.lease,
    expectedWork = host.workVersion,
    expectedLedger = host.ledgerVersion,
    sourceScopeDigest = journalState.source_scope?.digest,
    oldRuntimeCodeDigest = host.work?.binding.runtime_code_digest;
  requireRebind(
    lease &&
      expectedWork &&
      expectedLedger &&
      typeof sourceScopeDigest === 'string' &&
      typeof oldRuntimeCodeDigest === 'string',
    'initial-source frontier request owner, scope or CAS state is incomplete',
  );
  const endpointInput = {
    schema: 'InitialSourceFrontierCodeRebindRequest/v1',
    identity,
    attempt,
    actionId,
    nativeSessionHandle: initialReceipt.request.nativeSessionHandle,
    leaseGeneration: lease.generation,
    expectedWork,
    expectedLedger,
    expectedJournal: journalRow.version,
    expectedMaintenanceGeneration: host.maintenanceGeneration,
    initialContinuationId: initialReceipt.continuation_id,
    initialContinuationRequestDigest: initialReceipt.request_digest,
    configDigest: runtimeConfigDigest(config),
    sourceScopeDigest,
    oldRuntimeCodeDigest,
    newRuntimeCodeDigest: '',
    runtimeCodePaths: runtimePaths,
    parentManifestRef,
    parentManifestDigest: '0'.repeat(64),
    successorManifestRef,
    successorManifestDigest: '0'.repeat(64),
    systemUpdateRef,
    systemUpdateOperationId: 'pending',
    nativeSelfAttestationDigest: '0'.repeat(64),
  } satisfies InitialSourceFrontierCodeRebindRequest;
  const preliminaryProof = readInitialSourceFrontierNativeEndpoint({
    root,
    config,
    access: requireSafeRepositoryAccess(root),
    request: endpointInput,
    state,
  });
  const request = {
    ...endpointInput,
    newRuntimeCodeDigest: preliminaryProof.newRuntimeCodeDigest,
    parentManifestDigest: preliminaryProof.parentManifestDigest,
    successorManifestDigest: preliminaryProof.successorManifestDigest,
    systemUpdateOperationId: preliminaryProof.systemUpdateOperationId,
    nativeSelfAttestationDigest: preliminaryProof.nativeSelfAttestationDigest,
  } satisfies InitialSourceFrontierCodeRebindRequest;
  const endpointProof = verifyInitialSourceFrontierNativeEndpoint({
    root,
    config,
    access: requireSafeRepositoryAccess(root),
    request,
    state,
  });
  requireRebind(
    initialSourceFrontierExactKeys(request, initialSourceFrontierRequestKeys),
    'initial-source frontier request keys differ',
  );
  const body = {
    schema: 'InitialSourceFrontierCodeRebindPlan/v1',
    repair_id: repairId,
    request,
    endpoint_proof: endpointProof,
  } satisfies Omit<InitialSourceFrontierPlan, 'digest'>;
  return { ...body, digest: canonicalJsonDigest(body) };
}

function initialSourceFrontierResult(
  status: string,
  plan: InitialSourceFrontierPlan,
  receipt?: InitialSourceFrontierCodeRebindReceipt | null,
): Record<string, unknown> {
  const request = plan.request,
    version = receipt?.record?.work_version ?? request.expectedWork;
  return {
    status,
    repair_id: plan.repair_id,
    plan_digest: plan.digest,
    original_receipt_id: request.initialContinuationId,
    action_id: request.actionId,
    work_version: version,
    ledger_version: request.expectedLedger,
    journal_version: request.expectedJournal,
    maintenance_generation: request.expectedMaintenanceGeneration,
    old_runtime_code_digest: request.oldRuntimeCodeDigest,
    new_runtime_code_digest: request.newRuntimeCodeDigest,
    runtime_code_path_count: request.runtimeCodePaths.length,
    parent_manifest_ref: request.parentManifestRef,
    successor_manifest_ref: request.successorManifestRef,
    system_update_operation_id: request.systemUpdateOperationId,
    native_self_attestation_digest: request.nativeSelfAttestationDigest,
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
  };
}

async function runInitialSourceFrontierCodeRebind({
  values,
  root,
  config,
  workspaceId,
}: {
  values: Record<string, string>;
  root: string;
  config: AgentRuntimeConfig;
  workspaceId: string;
}) {
  const mode = values['--mode'],
    repairId = values['--repair-id'];
  requireRebind(
    typeof mode === 'string' && typeof repairId === 'string',
    'initial-source frontier CLI arguments are incomplete',
  );
  const database = trustedDatabase(root, config, workspaceId, ['inspect', 'plan'].includes(mode));
  try {
    if (mode === 'inspect' || mode === 'plan') {
      const projectIds = values['--projects'],
        workId = values['--work-id'],
        attempt = values['--attempt'],
        actionId = values['--action-id'],
        parentManifestRef = values['--parent-manifest'],
        successorManifestRef = values['--successor-manifest'],
        systemUpdateRef = values['--system-update'];
      requireRebind(
        typeof projectIds === 'string' &&
          typeof workId === 'string' &&
          typeof attempt === 'string' &&
          typeof actionId === 'string' &&
          typeof parentManifestRef === 'string' &&
          typeof successorManifestRef === 'string' &&
          typeof systemUpdateRef === 'string',
        'initial-source frontier planning arguments are incomplete',
      );
      const plan = planInitialSourceFrontierCodeRebind({
        database,
        root,
        config,
        workspaceId,
        projectIds: projectIds.split(','),
        workId,
        attempt: Number(attempt),
        actionId,
        repairId,
        parentManifestRef,
        successorManifestRef,
        systemUpdateRef,
      });
      if (mode === 'plan') writeInitialSourceFrontierPlan(root, repairId, plan);
      return initialSourceFrontierResult(mode === 'plan' ? 'planned' : 'rebindable_initial_source_frontier', plan);
    }

    const plan = readInitialSourceFrontierPlan(root, repairId),
      project = loadProjectSetContext(root, config, config.repository.repository_id, plan.request.identity.project_ids),
      identity = {
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        integrations_digest: project.integrations_digest,
        work_id: plan.request.identity.work_id,
      },
      store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
      existing = store.readInitialSourceFrontierCodeRebindReceipt(
        identity,
        plan.request.attempt,
        plan.request.initialContinuationId,
      );
    if (existing) {
      requireRebind(
        existing.status === 'rebound' &&
          existing.record.request_digest === canonicalJsonDigest(plan.request) &&
          canonicalJsonDigest(existing.record.request) === canonicalJsonDigest(plan.request) &&
          existing.current_runtime_code_digest === plan.request.newRuntimeCodeDigest,
        'existing initial-source frontier receipt differs from the frozen plan',
      );
      return initialSourceFrontierResult('already_rebound', plan, existing);
    }

    const currentPlan = planInitialSourceFrontierCodeRebind({
      database,
      root,
      config,
      workspaceId,
      projectIds: plan.request.identity.project_ids,
      workId: plan.request.identity.work_id,
      attempt: plan.request.attempt,
      actionId: plan.request.actionId,
      repairId,
      parentManifestRef: plan.request.parentManifestRef,
      successorManifestRef: plan.request.successorManifestRef,
      systemUpdateRef: plan.request.systemUpdateRef,
    });
    requireRebind(
      currentPlan.digest === plan.digest &&
        canonicalJsonDigest(currentPlan.request) === canonicalJsonDigest(plan.request) &&
        canonicalJsonDigest(currentPlan.endpoint_proof) === canonicalJsonDigest(plan.endpoint_proof),
      'initial-source frontier plan differs from fresh Host or native evidence',
    );
    const receipt = store.commitReadOnlyFrontierRuntimeCode(
      plan.request,
      (
        request: InitialSourceFrontierCodeRebindRequest,
        state: import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindState,
      ) =>
        verifyInitialSourceFrontierNativeEndpoint({
          root,
          config,
          access: requireSafeRepositoryAccess(root),
          request,
          state,
        }),
    );
    const persisted = store.readInitialSourceFrontierCodeRebindReceipt(
      identity,
      plan.request.attempt,
      plan.request.initialContinuationId,
    );
    requireRebind(
      persisted &&
        persisted.record_digest === receipt.record_digest &&
        canonicalJsonDigest(persisted) === canonicalJsonDigest(receipt),
      'initial-source frontier Host receipt did not persist exactly',
    );
    return initialSourceFrontierResult('rebound', plan, persisted);
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}

function runtimeCodePlanOptions(values: RuntimeCodeRebindArgs, basis: string) {
  return {
    projectIds: requiredRuntimeCodeOption(values, '--projects').split(','),
    workId: requiredRuntimeCodeOption(values, '--work-id'),
    attempt: Number(requiredRuntimeCodeOption(values, '--attempt')),
    actionId: requiredRuntimeCodeOption(values, '--action-id'),
    issueId: requiredRuntimeCodeOption(values, '--issue-id'),
    nativeHandle: requiredRuntimeCodeOption(values, '--native-handle'),
    repairId: requiredRuntimeCodeOption(values, '--repair-id'),
    actor: requiredRuntimeCodeOption(values, '--actor'),
    timestamp: requiredRuntimeCodeOption(values, '--timestamp'),
    forwardOperationId: requiredRuntimeCodeOption(values, '--forward-operation-id'),
    ...(values['--owner-no-call-ref'] ? { ownerNoCallPointer: values['--owner-no-call-ref'] } : {}),
    ...(values['--correction-id'] ? { correctionId: values['--correction-id'] } : {}),
    ...(values['--owner-correction-ref'] ? { ownerCorrectionPointer: values['--owner-correction-ref'] } : {}),
    ...(basis === 'known-terminal-verify' ? { focusedFailureCorrection: true } : {}),
  };
}

function rebuildRuntimeContinuationPlan(
  sourceProof: DeliveredContinuationProof,
  sourceArgs: DeliveredContinuationPlanInput,
) {
  if (sourceProof.status === 'closed_config_rebind_proven') {
    return planConfiguredFrontierContinuation({
      ...sourceArgs,
      parentManifestRef: sourceProof.transition.parent_manifest_ref,
      successorManifestRef: sourceProof.transition.successor_manifest_ref,
      systemUpdateRef: sourceProof.transition.system_update_ref,
      sourceCorrectionRef: sourceProof.transition.source_correction_ref,
    });
  }
  return planDeliveredWorkContinuation(sourceArgs);
}

function writeRuntimeCodePlanWhenRequested(mode: string, root: string, plan: RuntimeCodeRebindPlan) {
  if (mode === 'plan') writePlan(root, plan.repair_id, plan);
}

/** Existing reconcile-artifacts CLI branch; no native call or approval is synthesized. */

export async function runRuntimeCodeRebind(args: readonly string[]) {
  const values = parse(args);
  if (values['--basis'] === 'execution-continuation') {
    const { runQualifiedRuntimeCodeContinuation } = await import('./qualified-runtime-code-continuation.ts');
    return runQualifiedRuntimeCodeContinuation(values);
  }
  const root = requiredRuntimeCodeOption(values, '--project-root');
  const mode = requiredRuntimeCodeOption(values, '--mode'),
    basis = values['--basis'] ?? '';
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  if (values['--basis'] === 'initial-source-frontier')
    return runInitialSourceFrontierCodeRebind({ values, root, config, workspaceId });
  const database = trustedDatabase(root, config, workspaceId, ['inspect', 'plan'].includes(mode));
  try {
    if (['inspect', 'plan'].includes(mode)) {
      if (['delivered-config-continuation', 'configured-frontier-continuation'].includes(basis)) {
        const plannerInput = {
          database,
          root,
          config,
          workspaceId,
          projectIds: requiredRuntimeCodeOption(values, '--projects').split(','),
          workId: requiredRuntimeCodeOption(values, '--work-id'),
          attempt: Number(requiredRuntimeCodeOption(values, '--attempt')),
          actionId: requiredRuntimeCodeOption(values, '--action-id'),
          issueId: requiredRuntimeCodeOption(values, '--issue-id'),
          nativeHandle: requiredRuntimeCodeOption(values, '--native-handle'),
          repairId: requiredRuntimeCodeOption(values, '--repair-id'),
          actor: requiredRuntimeCodeOption(values, '--actor'),
          timestamp: requiredRuntimeCodeOption(values, '--timestamp'),
          forwardOperationId: requiredRuntimeCodeOption(values, '--forward-operation-id'),
          sourceTransitionId: requiredRuntimeCodeOption(values, '--source-transition-id'),
          ownerNoCallPointer: requiredRuntimeCodeOption(values, '--owner-no-call-ref'),
          parentManifestRef: requiredRuntimeCodeOption(values, '--parent-manifest'),
          successorManifestRef: requiredRuntimeCodeOption(values, '--successor-manifest'),
          systemUpdateRef: requiredRuntimeCodeOption(values, '--system-update'),
          sourceCorrectionRef: requiredRuntimeCodeOption(values, '--source-correction'),
        };
        const plan =
          basis === 'configured-frontier-continuation'
            ? planConfiguredFrontierContinuation(plannerInput)
            : await planDeliveredWorkContinuation(plannerInput);
        if (mode === 'plan') writeDeliveredContinuationPlan(root, plan.repair_id, plan);
        return {
          status: values['--mode'] === 'plan' ? 'planned' : 'continuation_ready',
          repair_id: plan.repair_id,
          plan_digest: plan.digest,
          ...(plan.request.action.kind === 'historical_terminal_review'
            ? { retained_issue_id: plan.request.action.capture.issue_id }
            : { retained_unissued_action_id: plan.request.action.request.action_id }),
          action: plan.request.action,
          runtime_accepted: false,
          accepted_result: false,
        };
      }
      const plan = planRuntimeCodeRebind({
        database,
        root,
        config,
        workspaceId,
        ...runtimeCodePlanOptions(values, basis),
      });
      writeRuntimeCodePlanWhenRequested(mode, root, plan);
      return {
        status: values['--mode'] === 'plan' ? 'planned' : 'rebindable_current_v1',
        repair_id: plan.repair_id,
        plan_digest: plan.digest,
        old_runtime_code_digest: plan.request.oldRuntimeCodeDigest,
        new_runtime_code_digest: plan.request.newRuntimeCodeDigest,
        retained_issue_id: plan.request.issueId,
      };
    }
    if (['apply', 'resume'].includes(mode)) {
      const access = requireSafeRepositoryAccess(root),
        deliveredPlanRelative = deliveredContinuationPlanPath(values['--repair-id']);
      if (access.fileExists(deliveredPlanRelative, 'delivered continuation plan presence')) {
        const plan = readDeliveredContinuationPlan(root, requiredRuntimeCodeOption(values, '--repair-id')),
          sourceProof = plan.request.sourceTransition,
          transition = sourceProof.status === 'closed_config_rebind_proven' ? sourceProof.transition : null,
          sourceArgs = {
            database,
            root,
            config,
            workspaceId,
            projectIds: plan.request.identity.project_ids,
            workId: plan.request.identity.work_id,
            attempt: plan.request.attempt,
            actionId:
              plan.request.action.kind === 'historical_terminal_review' ? plan.request.action.capture.action_id : '',
            issueId:
              plan.request.action.kind === 'historical_terminal_review' ? plan.request.action.capture.issue_id : '',
            nativeHandle: plan.request.nativeSessionHandle,
            repairId: plan.repair_id,
            actor: plan.actor,
            timestamp: plan.timestamp,
            forwardOperationId: plan.request.forwardOperationId,
            sourceTransitionId: plan.source_transition_id,
            ownerNoCallPointer: plan.request.originalRequestPointer,
            parentManifestRef: transition?.parent_manifest_ref,
            successorManifestRef: transition?.successor_manifest_ref,
            systemUpdateRef: transition?.system_update_ref,
            sourceCorrectionRef: transition?.source_correction_ref,
          },
          result = await applyDeliveredWorkContinuationPlan({
            database,
            root,
            workspaceId,
            plan,
            rebuildPlan: () => rebuildRuntimeContinuationPlan(sourceProof, sourceArgs),
          });
        return {
          status: result.status,
          repair_id: plan.repair_id,
          plan_digest: plan.digest,
          ...(plan.request.action.kind === 'historical_terminal_review'
            ? { retained_issue_id: plan.request.action.capture.issue_id }
            : { retained_unissued_action_id: plan.request.action.request.action_id }),
          continuation_id: result.receipt.continuation_id,
          action: result.action,
          work_version: result.snapshot.workVersion,
          ledger_version: result.snapshot.ledgerVersion,
          runtime_accepted: result.receipt.runtime_acceptance,
          accepted_result: result.receipt.accepted_result,
        };
      }
    }
    const plan = readPlan(root, requiredRuntimeCodeOption(values, '--repair-id'));
    const receiptTable = sqliteRowExists(
      database
        .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_runtime_code_rebind'")
        .get(),
    );
    const existing = receiptTable
      ? sqlitePayloadRow(
          database
            .query(
              'SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
            )
            .get(workspaceId, plan.request.identity.work_id, plan.request.attempt, plan.request.actionId),
          'runtime-code rebind receipt',
        )
      : null;
    if (existing) {
      const receipt = parsedRecord(existing.payload, 'runtime-code rebind receipt');
      const priorWorkVersion = parseRuntimeRebindStateVersion(receipt.prior_work_version);
      const project = loadProjectSetContext(
        root,
        config,
        config.repository.repository_id,
        plan.request.identity.project_ids,
      );
      const identity = {
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        integrations_digest: project.integrations_digest,
        work_id: plan.request.identity.work_id,
      };
      const snapshot = createCliHostStateStore(
        database,
        workspaceId,
        undefined,
        undefined,
        undefined,
        undefined,
        root,
      ).readHostStateSnapshot(identity);
      const journal = checkedJournalRow(database, workspaceId, identity.work_id, plan.request.attempt);
      const item = journal.value.items.find((entry) => entry.request.action_id === plan.request.actionId);
      requireRebind(
        canonicalJsonDigest(plan.runtime_code_paths) ===
          canonicalJsonDigest(runtimePackageCodePaths(config.runtime.bundle)),
        'frozen rebind inventory differs from the executing package',
      );
      const current = snapshotRuntimePackageSources(
        runtimePackageAccess(),
        config.runtime.bundle,
        plan.runtime_code_paths,
      );
      forwardLineage(
        root,
        plan.request.forwardOperationId,
        plan.runtime_code_paths,
        plan.request.oldRuntimeCodeDigest,
        plan.request.newRuntimeCodeDigest,
      );
      const effectiveRequest = {
        ...plan.request,
        expectedWork: priorWorkVersion,
        expectedLedger: snapshot.ledgerVersion,
      };
      requireRebind(
        canonicalJsonDigest(receipt) === existing.digest &&
          receipt.request_digest === canonicalJsonDigest(effectiveRequest) &&
          receipt.issue_id === plan.request.issueId &&
          snapshot.workVersion?.revision === priorWorkVersion.revision + 1 &&
          (plan.lease_transition === 'already_active' ||
            (priorWorkVersion.revision === plan.request.expectedWork.revision + 1 &&
              snapshot.ledgerVersion?.revision === plan.request.expectedLedger.revision + 1)) &&
          snapshot.work?.binding.runtime_code_digest === plan.request.newRuntimeCodeDigest &&
          snapshot.work?.lease?.thread_id === plan.request.nativeSessionHandle &&
          canonicalJsonDigest(journal.version) === canonicalJsonDigest(plan.request.expectedJournal) &&
          (plan.request.synthesisCorrection ? item?.issue_id === null : item?.issue_id === plan.request.issueId) &&
          (plan.request.focusedFailureCorrection
            ? item?.observation?.status === 'reported_failed'
            : item?.observation === null) &&
          current.digest === plan.request.newRuntimeCodeDigest,
        'runtime-code rebind replay needs current-state inspection',
      );
      return {
        status: 'already_rebound',
        repair_id: plan.repair_id,
        plan_digest: plan.digest,
        retained_issue_id: plan.request.issueId,
        work_version: snapshot.workVersion,
        journal_version: journal.version,
      };
    }
    let effective = currentPlan(database, root, config, workspaceId, plan);
    requireRebind(sameRepairIntent(effective, plan), 'frozen rebind intent differs');
    if (plan.lease_transition === 'resume_paused') {
      if (effective.lease_transition === 'resume_paused') {
        requireRebind(
          effective.digest === plan.digest,
          'paused owner CAS or installed runtime changed before lease resume',
        );
        const ledger = openConfiguredMastraSessionLedger(root);
        try {
          const resumedJournal = ledger.resume(plan.request.identity.work_id, plan.request.attempt);
          requireRebind(resumedJournal?.state.source_scope, 'resumed owner Source snapshot is missing');
          const resumed = resumePausedLocalWork({
            store: ledger.hostState,
            ledger,
            identity: plan.request.identity,
            attempt: plan.request.attempt,
            expectedWork: plan.request.expectedWork,
            expectedLedger: plan.request.expectedLedger,
            expectedJournal: plan.request.expectedJournal,
            nativeSessionHandle: plan.request.nativeSessionHandle,
            configDigest: runtimeConfigDigest(config),
            sourceDigest: resumedJournal.state.source_scope.digest,
          });
          requireRebind(resumed.status === 'resumed', 'resumed owner needs journal inspection before rebind');
        } finally {
          ledger.close();
        }
        effective = currentPlan(database, root, config, workspaceId, plan);
      }
      requireRebind(
        effective.lease_transition === 'already_active' &&
          effective.request.expectedWork.revision === plan.request.expectedWork.revision + 1 &&
          effective.request.expectedLedger.revision === plan.request.expectedLedger.revision + 1 &&
          canonicalJsonDigest(effective.request.expectedJournal) ===
            canonicalJsonDigest(plan.request.expectedJournal) &&
          sameRepairIntent(effective, plan),
        'paused owner successor lease differs from frozen rebind intent',
      );
    } else {
      requireRebind(effective.digest === plan.digest, 'frozen rebind plan differs from current state');
    }
    const verifier: RuntimeCodeRebindVerifier = {
      principal: 'vida-agent-forward-runtime-code-rebind',
      verify: (request) => {
        const current = planRuntimeCodeRebind({
          database,
          root,
          config,
          workspaceId,
          projectIds: request.identity.project_ids,
          workId: request.identity.work_id,
          attempt: request.attempt,
          actionId: request.actionId,
          issueId: request.issueId,
          nativeHandle: request.nativeSessionHandle,
          repairId: plan.repair_id,
          actor: plan.actor,
          timestamp: plan.timestamp,
          forwardOperationId: request.forwardOperationId,
          ...runtimeCodePlanCorrectionOptions(request),
        });
        requireRebind(
          current.digest === effective.digest && canonicalJsonDigest(current.request) === canonicalJsonDigest(request),
          'frozen rebind plan differs from current state',
        );
        if (request.focusedFailureCorrection) {
          return {
            schema: 'VidaRuntimeCodeRebindAuthorization/v1',
            request_digest: canonicalJsonDigest(request),
            principal: verifier.principal,
            forward_operation_id: request.forwardOperationId,
            parent_manifest_digest: request.parentManifestDigest,
            successor_manifest_digest: request.successorManifestDigest,
            owner_correction_pointer: request.focusedFailureCorrection.ownerCorrectionPointer,
          };
        }
        if (request.synthesisCorrection) {
          return {
            schema: 'VidaRuntimeCodeRebindAuthorization/v1',
            request_digest: canonicalJsonDigest(request),
            principal: verifier.principal,
            forward_operation_id: request.forwardOperationId,
            parent_manifest_digest: request.parentManifestDigest,
            successor_manifest_digest: request.successorManifestDigest,
            owner_correction_pointer: request.synthesisCorrection.ownerCorrectionPointer,
            synthesis_correction_digest: request.synthesisCorrection.correctionDigest,
          };
        }
        requireRebind(typeof request.ownerNoCallPointer === 'string', 'runtime rebind owner no-call proof is missing');
        return {
          schema: 'VidaRuntimeCodeRebindAuthorization/v1',
          request_digest: canonicalJsonDigest(request),
          principal: verifier.principal,
          forward_operation_id: request.forwardOperationId,
          parent_manifest_digest: request.parentManifestDigest,
          successor_manifest_digest: request.successorManifestDigest,
          owner_no_call_pointer: request.ownerNoCallPointer,
        };
      },
    };
    const store = createCliHostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
      verifier,
    );
    const saved = await store.rebindRuntimeCode(effective.request);
    requireRebind(
      saved.work?.binding.runtime_code_digest === plan.request.newRuntimeCodeDigest,
      'runtime-code rebind did not persist',
    );
    return {
      status: 'rebound',
      repair_id: plan.repair_id,
      plan_digest: plan.digest,
      retained_issue_id: plan.request.issueId,
      work_version: saved.workVersion,
      journal_version: plan.request.expectedJournal,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
