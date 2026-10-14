import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig, runtimePackageAccess, runtimePackageCodePaths } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

import { sessionHandoffDatabasePath } from '../src/config/project-paths.ts';
import { parseSessionBridgeObservation } from '../src/orchestration/mastra-session-bridge-contract.ts';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimeManifestSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { acceptedSourceAuthorizationRevision } from '../src/orchestration/admitted-development-packet.ts';
import {
  validateCompletedSourceReportRecoveryRequest,
  validateCompletedSourceReportRecoveryVerifiedCurrent,
} from '../src/orchestration/completed-source-report-recovery.ts';
import { currentNativeSelfAttestation } from './runtime-config-rebind.ts';
import { releaseState, releaseJournalFile, releasePath } from './local-release-artifacts.ts';

type RecoveryRequest =
  import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryRequest;
type QualifiedRuntimeCodeRequest =
  import('../src/orchestration/qualified-runtime-code-continuation.ts').QualifiedRuntimeCodeContinuationRequest;
type NativeEndpointRequest = RecoveryRequest | QualifiedRuntimeCodeRequest;
type RecoveryState =
  import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryState;
type VerifiedCurrent =
  import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryVerifiedCurrent;
type SafeRepositoryAccess = import('../src/config/safe-repository-access.ts').SafeRepositoryAccess;
type Store = import('../src/host-state.ts').HostStateStore;
type MastraSessionLedgerState = import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState;
type MastraLedgerItem = import('../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem;
type SessionBridgeObservation =
  import('../src/orchestration/mastra-session-bridge-contract.ts').SessionBridgeObservation;
type AgentRuntimeConfig = import('../src/config/runtime-config.ts').AgentRuntimeConfig;

type RecoveryArgs = {
  readonly mode: 'inspect' | 'plan' | 'apply';
  readonly root: string;
  readonly requestPath: string;
};
type ControllerReceipt = Record<string, unknown> & {
  readonly schema: 'ObservedControllerCommand/v1';
  readonly source: string;
  readonly thread_id: string;
  readonly turn_id: string;
  readonly caller_observation_ref: string;
  readonly report_tool_ref: string;
  readonly attribution: string;
  readonly command_observation: Record<string, unknown> & {
    readonly id: string;
    readonly command: string;
    readonly cwd: string;
    readonly status: 'completed';
    readonly exitCode: 0;
  };
};
type NativeManifest = Record<string, unknown> & {
  readonly schema: 'VidaStandaloneBuild/v1';
  readonly inputs: readonly unknown[];
  readonly asset: Record<string, unknown> & { readonly file: string; readonly sha256: string; readonly bytes: number };
  readonly version: string;
  readonly pin: string;
  readonly payloadId: string;
};
type NativeInstall = Record<string, unknown> & {
  readonly schema: 'VidaNativeInstallationResult/v1';
  readonly action: 'install' | 'update';
  readonly runtime_accepted: false;
  readonly cleanup_complete: true;
  readonly version: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly path: string;
};
type NativeUpdate = Record<string, unknown> & {
  readonly status: string;
  readonly operation_id: string;
  readonly entry: string;
  readonly version: string;
  readonly run_id: string;
  readonly artifact_id: string;
  readonly runtime_accepted: false;
  readonly developer_unblocked: false;
  readonly installation_observation: unknown;
};

const requireRecovery: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw Error(`completed Source report recovery: ${message}`);
};
function requireRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  requireRecovery(isPlainRecord(value) && !Array.isArray(value), `${label} must be an object`);
}
function requiredRecoveryString(value: unknown, label: string): string {
  requireRecovery(typeof value === 'string', label);
  return value;
}

function requireArray(value: unknown, label: string): unknown[] {
  requireRecovery(Array.isArray(value), `${label} must be an array`);
  const entries: unknown[] = value;
  return entries;
}
const same = (left: unknown, right: unknown): boolean => canonicalJsonDigest(left) === canonicalJsonDigest(right);
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;

function addRecoveryArgument(values: Record<string, string>, flag: string | undefined, value: string | undefined) {
  requireRecovery(typeof flag === 'string' && flag.startsWith('--'), 'argument flag invalid');
  requireRecovery(typeof value === 'string' && value.length > 0, 'argument value missing');
  requireRecovery(!Object.hasOwn(values, flag), 'argument is duplicated');
  values[flag] = value;
}

function recoveryArgsFromValues(values: Record<string, string>): RecoveryArgs {
  const mode = values['--mode'];
  const root = values['--project-root'];
  const requestPath = values['--request'];
  requireRecovery(mode === 'inspect' || mode === 'plan' || mode === 'apply', 'mode invalid');
  requireRecovery(typeof root === 'string' && path.isAbsolute(root), 'project root must be absolute');
  requireRecovery(path.resolve(root) === root, 'project root must be canonical');
  requireRecovery(typeof requestPath === 'string', 'request path is missing');
  return { mode, root, requestPath };
}

function parseArgs(args: string[]): RecoveryArgs {
  requireRecovery(args.length === 6, 'mode, project root and request are required');
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    addRecoveryArgument(values, args[index], args[index + 1]);
  }
  requireRecovery(
    Object.keys(values).sort().join(',') === '--mode,--project-root,--request',
    'unexpected argument set',
  );
  return recoveryArgsFromValues(values);
}

function parseRecoveryJson(bytes: Buffer, label: string): unknown {
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    throw Error(`completed Source report recovery: ${label} JSON invalid`);
  }
}

function readStrictJson(
  access: SafeRepositoryAccess,
  reference: string,
  label: string,
  limit: number = 1024 * 1024,
  kind: 'object' | 'array' = 'object',
): { readonly bytes: Buffer; readonly value: unknown } {
  requireRecovery(typeof reference === 'string', `${label} reference must be text`);
  requireRecovery(reference.length > 0 && reference.length <= 2048, `${label} reference length invalid`);
  const bytes = access.readBytes(reference, label);
  requireRecovery(bytes.length > 0, `${label} is empty`);
  requireRecovery(bytes.length <= limit, `${label} exceeds its byte bound`);
  const value = parseRecoveryJson(bytes, label);
  if (kind === 'array') requireRecovery(Array.isArray(value), `${label} must be an array`);
  else requireRecovery(isPlainRecord(value) && !Array.isArray(value), `${label} must be an object`);
  return { bytes, value };
}

function findJournalItem(
  journal: MastraSessionLedgerState,
  actionId: string,
  issueId: string,
): MastraLedgerItem | undefined {
  const items = [...(journal.items ?? []), ...(journal.completed ?? []).flatMap((wave) => wave.items ?? [])];
  return items.find((item) => item?.request?.action_id === actionId && item.issue_id === issueId);
}

function readRecoveryState(store: Store, request: RecoveryRequest): RecoveryState {
  return store.readCompletedSourceReportRecoveryState(request.identity, request.attempt);
}

function readControllerCommand(root: string, access: SafeRepositoryAccess, request: RecoveryRequest) {
  const receipt = readStrictJson(
    access,
    request.terminalCommandReceiptRef,
    'successful controller command receipt',
    128 * 1024,
  ).value;
  requireRecord(receipt, 'controller receipt');
  const command = receipt.command_observation;
  requireRecord(command, 'controller command observation');
  requireRecovery(receipt.schema === 'ObservedControllerCommand/v1', 'controller command receipt schema differs');
  requireRecovery(
    typeof receipt.source === 'string' &&
      receipt.source.length > 0 &&
      receipt.source.length <= 256 &&
      receipt.source.trim() === receipt.source &&
      !/\p{Cc}/u.test(receipt.source),
    'controller provenance is invalid',
  );
  requireRecovery(
    typeof receipt.thread_id === 'string' && receipt.thread_id.length > 0,
    'controller thread ID is missing',
  );
  requireRecovery(typeof receipt.turn_id === 'string' && receipt.turn_id.length > 0, 'controller turn ID is missing');
  requireRecovery(
    receipt.caller_observation_ref === request.terminalCallerObservationRef,
    'controller caller reference differs',
  );
  requireRecovery(
    typeof receipt.report_tool_ref === 'string' &&
      receipt.report_tool_ref.length > 0 &&
      receipt.report_tool_ref.length <= 256,
    'controller report-tool mapping is missing',
  );
  requireRecovery(
    typeof receipt.attribution === 'string' && receipt.attribution.length <= 512,
    'controller attribution is invalid',
  );
  requireRecovery(
    typeof command.id === 'string' && command.id.length > 0,
    'controller command execution identity is invalid',
  );
  requireRecovery(
    typeof command.command === 'string' && command.command.length > 0,
    'controller command text is missing',
  );
  requireRecovery(
    typeof command.cwd === 'string' && path.resolve(command.cwd) === path.resolve(root),
    'writer command cwd differs',
  );
  requireRecovery(
    command.status === 'completed' && command.exitCode === 0,
    'writer command did not complete successfully',
  );

  const validatedReceipt: ControllerReceipt = {
    ...receipt,
    schema: 'ObservedControllerCommand/v1',
    source: receipt.source,
    thread_id: receipt.thread_id,
    turn_id: receipt.turn_id,
    caller_observation_ref: receipt.caller_observation_ref,
    report_tool_ref: receipt.report_tool_ref,
    attribution: receipt.attribution,
    command_observation: {
      ...command,
      id: command.id,
      command: command.command,
      cwd: command.cwd,
      status: 'completed',
      exitCode: 0,
    },
  };
  return { receipt: validatedReceipt, command: validatedReceipt.command_observation };
}

function validateReportedJournalBinding(
  request: RecoveryRequest,
  state: RecoveryState,
  observation: SessionBridgeObservation,
  receipt: ControllerReceipt,
) {
  const item = findJournalItem(state.journal.state, request.actionId, request.issueId),
    nextItem = findJournalItem(request.nextJournal, request.actionId, request.issueId),
    reservation = item?.host_reservation,
    work = state.host.work;
  requireRecovery(observation.status === 'reported_complete', 'original observation is not a completed report');
  requireRecovery(observation.action_id === request.actionId, 'original report action ID differs');
  requireRecovery(observation.issue_id === request.issueId, 'original report issue ID differs');
  requireRecovery(observation.host_attempt_id === request.hostAttemptId, 'original report Host attempt ID differs');
  requireRecovery(
    observation.tool_call_ref === request.reportId,
    'original report ID differs from its writer tool call',
  );
  requireRecovery(
    receipt.report_tool_ref === observation.tool_call_ref && receipt.report_tool_ref === request.reportId,
    'trusted controller report-tool mapping differs from the original report',
  );
  requireRecovery(canonicalJsonDigest(observation) === request.reportDigest, 'original report digest differs');
  requireRecovery(same(observation.changed_paths, request.reportSourcePaths), 'report Source paths differ');
  requireRecovery(
    receipt.thread_id === work?.lease?.thread_id,
    'controller thread differs from the original Work owner',
  );
  requireRecovery(observation.agent_id === receipt.thread_id, 'report owner differs from its controller thread');
  requireRecovery(work?.lease?.generation === request.leaseGeneration, 'original lease generation differs');
  requireRecovery(item, 'original issued Journal request is missing');
  requireRecovery(nextItem, 'completed Journal item is missing');
  requireRecovery(reservation, 'original Host reservation is missing');
  requireRecovery(reservation.receipt?.attempt?.attempt_id === request.hostAttemptId, 'reservation attempt differs');
  requireRecovery(nextItem.observation, 'completed Journal observation is missing');
  requireRecovery(same(nextItem.observation, observation), 'completed Journal report body differs');
  requireRecovery(same(nextItem.request, item.request), 'completed Journal request differs from the issued request');
  requireRecovery(nextItem.issue_id === item.issue_id, 'completed Journal issue ID differs from the issued request');
  return reservation;
}

function validateRetainedSourcePermission(
  root: string,
  request: RecoveryRequest,
  state: RecoveryState,
  reservation: NonNullable<ReturnType<typeof findJournalItem>>['host_reservation'],
) {
  const initialReceipt = state.initialReceipt;
  requireRecovery(initialReceipt, 'original Source continuation receipt is missing');
  const reference = initialReceipt.request.sourceAuthorizationReference;
  const work = state.host.work;
  requireRecovery(work, 'current Work state is missing');
  requireRecovery(
    initialReceipt.continuation_id === request.initialContinuationId &&
      initialReceipt.request_digest === request.initialContinuationRequestDigest,
    'original continuation receipt differs',
  );
  requireRecovery(
    initialReceipt.request.nativeSessionHandle === request.nativeSessionHandle,
    'original native session handle differs',
  );
  requireRecovery(
    (state.frontierReceipt?.original_receipt_id ?? null) === request.frontierReceiptId &&
      (state.frontierReceipt?.record?.request_digest ?? null) === request.frontierRequestDigest,
    'frontier receipt lineage differs',
  );
  requireRecovery(
    reference?.path && reference.sha256 === request.originalSourceAuthorizationDigest,
    'original Source authorization reference differs',
  );
  requireRecovery(
    canonicalJsonDigest(reservation) === request.sourceReservationDigest,
    'original Source reservation digest differs',
  );
  const retained = readLocalSourceWriteAuthorization(root, reference.path),
    authority = retained.authorization;
  requireRecovery(
    retained.sha256 === request.originalSourceAuthorizationDigest,
    'retained Source authorization bytes differ',
  );
  requireRecovery(
    authority.action === 'source.write' &&
      authority.work_id === request.identity.work_id &&
      authority.attempt === request.attempt,
    'retained Source authorization is for another work attempt',
  );
  const authorizationRevision = acceptedSourceAuthorizationRevision(work, state.journal.state, reference, {
    receipt: initialReceipt,
    frontierCodeRebind: state.frontierReceipt,
    completedSourceReportRecovery: state.recoveryReceipt,
  });
  requireRecovery(
    authority.scope_digest === authorizationRevision &&
      work.binding.work_source_revision === request.originalSourceScopeDigest &&
      authority.native_session_handle === request.nativeSessionHandle,
    'retained Source authorization scope or owner differs',
  );
  requireRecovery(
    authority.config_digest === state.initialReceipt.request.configDigest &&
      authority.workflow_id === work.binding.workflow_id,
    'retained Source authorization config or workflow differs',
  );
  requireRecovery(
    same([...authority.implementation_paths].sort(), [...work.binding.implementation_paths].sort()),
    'retained Source authorization paths differ from the original Work',
  );
  return authority;
}

function readTerminalProof(root: string, access: SafeRepositoryAccess, request: RecoveryRequest, state: RecoveryState) {
  const caller = readStrictJson(
      access,
      request.terminalCallerObservationRef,
      'original caller observation',
      128 * 1024,
    ).value,
    observation = parseSessionBridgeObservation(caller),
    { receipt } = readControllerCommand(root, access, request),
    reservation = validateReportedJournalBinding(request, state, observation, receipt);
  validateRetainedSourcePermission(root, request, state, reservation);
  return {
    attempt: request.attempt,
    actionId: request.actionId,
    issueId: request.issueId,
    hostAttemptId: request.hostAttemptId,
    leaseGeneration: request.leaseGeneration,
    ownerId: observation.agent_id,
    ownerThreadId: receipt.thread_id,
    nativeSessionHandle: request.nativeSessionHandle,
    quiescent: true,
    outcome: 'reported_complete',
    callerObservationRef: request.terminalCallerObservationRef,
    commandReceiptRef: request.terminalCommandReceiptRef,
    reportId: request.reportId,
    reportDigest: request.reportDigest,
    sourceDiffDigest: request.sourceDiffDigest,
    reportSourcePaths: request.reportSourcePaths,
  };
}

function verifySourceDiff(root: string, access: SafeRepositoryAccess, request: RecoveryRequest, state: RecoveryState) {
  const work = state.host.work;
  requireRecovery(work, 'current Work state is missing');
  const initialReceipt = state.initialReceipt;
  requireRecovery(initialReceipt, 'original Source continuation receipt is missing');
  const oldScope = state.journal.state.source_scope;
  requireRecovery(oldScope, 'original Source scope snapshot is missing');
  const snapshot = snapshotDeclaredSources(access, work.lifecycle.scope.allowed_paths),
    changes = compareScopedSourceSnapshots(oldScope, snapshot),
    paths = changes.map((change) => change.path),
    retainedSnapshot = readStrictJson(access, request.sourceSnapshotRef, 'actual Source snapshot').value,
    retainedDiff = readStrictJson(access, request.sourceDiffRef, 'actual Source diff', 1024 * 1024, 'array').value,
    authorization = readLocalSourceWriteAuthorization(
      root,
      initialReceipt.request.sourceAuthorizationReference.path,
    ).authorization;
  requireRecovery(
    work.binding.work_source_revision === request.originalSourceScopeDigest &&
      oldScope?.digest === request.originalSourceScopeDigest,
    'original Source preimage differs',
  );
  requireRecovery(
    snapshot.digest === request.evolvedJournalSourceScopeDigest && same(request.nextJournal.source_scope, snapshot),
    'evolved Journal Source scope differs from actual current files',
  );
  requireRecovery(same(retainedSnapshot, snapshot), 'retained Source snapshot differs from current files');
  requireRecovery(same(retainedDiff, changes), 'retained Source diff differs from the actual preimage comparison');
  requireRecovery(paths.length > 0, 'actual Source diff is empty');
  requireRecovery(same(paths, request.changedPaths), 'actual changed paths differ from the request');
  requireRecovery(same(paths, request.reportSourcePaths), 'actual changed paths differ from the report');
  requireRecovery(canonicalJsonDigest(changes) === request.sourceDiffDigest, 'actual Source diff digest differs');
  const implementationPaths = new Set(work.binding.implementation_paths),
    authorizedPaths = new Set(authorization.implementation_paths);
  requireRecovery(
    paths.every((relative) => implementationPaths.has(relative) && authorizedPaths.has(relative)),
    'changed paths exceed original Source permission',
  );
  return {
    reservationDigest: request.sourceReservationDigest,
    authorizationDigest: request.originalSourceAuthorizationDigest,
    originalScopeDigest: request.originalSourceScopeDigest,
    evolvedScopeDigest: request.evolvedJournalSourceScopeDigest,
    snapshotRef: request.sourceSnapshotRef,
    diffRef: request.sourceDiffRef,
    changedPaths: request.changedPaths,
  };
}

function validateNativeManifestFields(
  value: Record<string, unknown>,
  label: string,
): { inputs: unknown[]; asset: Record<string, unknown> & { file: string; sha256: string; bytes: number } } {
  requireRecovery(value.schema === 'VidaStandaloneBuild/v1', `${label} schema differs`);
  const inputs = requireArray(value.inputs, `${label} inputs`);
  const assetValue = value.asset;
  requireRecord(assetValue, `${label} asset`);
  requireRecovery(typeof assetValue.file === 'string' && assetValue.file.length > 0, `${label} asset file is invalid`);
  requireRecovery(typeof assetValue.sha256 === 'string', `${label} asset digest is invalid`);
  requireRecovery(
    typeof assetValue.bytes === 'number' && Number.isSafeInteger(assetValue.bytes) && assetValue.bytes > 0,
    `${label} asset byte count is invalid`,
  );
  requireRecovery(typeof value.version === 'string', `${label} version is invalid`);
  requireRecovery(typeof value.pin === 'string', `${label} pin is invalid`);
  requireRecovery(typeof value.payloadId === 'string', `${label} payload identity is invalid`);
  return {
    inputs,
    asset: { ...assetValue, file: assetValue.file, sha256: assetValue.sha256, bytes: assetValue.bytes },
  };
}

function readNativeManifest(
  access: SafeRepositoryAccess,
  ref: string,
  expectedDigest: string,
  label: string,
): { readonly bytes: Buffer; readonly value: NativeManifest } {
  const { bytes, value } = readStrictJson(access, ref, label, 32 * 1024 * 1024);
  requireRecovery(sha256(bytes) === expectedDigest, `${label} digest differs`);
  requireRecord(value, label);
  const { inputs, asset } = validateNativeManifestFields(value, label);

  const manifest: NativeManifest = {
    ...value,
    schema: 'VidaStandaloneBuild/v1',
    inputs,
    asset: { ...asset, file: asset.file, sha256: asset.sha256, bytes: asset.bytes },
    version: requiredRecoveryString(value.version, `${label} version is invalid`),
    pin: requiredRecoveryString(value.pin, `${label} pin is invalid`),
    payloadId: requiredRecoveryString(value.payloadId, `${label} payload identity is invalid`),
  };
  return { bytes, value: manifest };
}

function readNativeInstall(
  access: SafeRepositoryAccess,
  ref: string,
  manifest: NativeManifest,
  label: string,
): NativeInstall {
  const { value } = readStrictJson(access, ref, label, 1024 * 1024);
  requireRecord(value, label);
  const installValue = value.installation_observation ?? value;
  requireRecord(installValue, `${label} installation observation`);
  const asset = manifest.asset;
  requireRecovery(installValue.schema === 'VidaNativeInstallationResult/v1', `${label} schema differs`);
  requireRecovery(installValue.action === 'install' || installValue.action === 'update', `${label} action differs`);
  requireRecovery(
    installValue.runtime_accepted === false && installValue.cleanup_complete === true,
    `${label} acceptance flags differ`,
  );
  requireRecovery(typeof installValue.version === 'string', `${label} version is invalid`);
  requireRecovery(typeof installValue.sha256 === 'string', `${label} digest is invalid`);
  requireRecovery(typeof installValue.bytes === 'number', `${label} byte count is invalid`);
  requireRecovery(typeof installValue.path === 'string', `${label} executable path is invalid`);
  requireRecovery(installValue.version === manifest.version, `${label} version differs from its manifest`);
  requireRecovery(
    hashPattern.test(installValue.sha256.toLowerCase()) &&
      installValue.sha256.toLowerCase() === asset.sha256.toLowerCase(),
    `${label} executable digest differs from its manifest`,
  );
  requireRecovery(installValue.bytes === asset.bytes, `${label} byte count differs from its manifest`);
  requireRecovery(path.isAbsolute(installValue.path), `${label} executable path is invalid`);
  return {
    ...installValue,
    schema: 'VidaNativeInstallationResult/v1',
    action: installValue.action,
    runtime_accepted: false,
    cleanup_complete: true,
    version: installValue.version,
    sha256: installValue.sha256,
    bytes: installValue.bytes,
    path: installValue.path,
  };
}

function verifyCurrentUpdateOwner(
  root: string,
  request: NativeEndpointRequest,
  update: NativeUpdate,
  self: NonNullable<ReturnType<typeof currentNativeSelfAttestation>>,
) {
  const registered = releaseState(releaseJournalFile(root, request.systemUpdateOperationId)),
    pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  requireRecovery(update.status === 'CURRENT_SYSTEM_REPAIR_CHECKPOINT_UPDATED', 'native update status differs');
  requireRecovery(update.operation_id === request.systemUpdateOperationId, 'native update operation ID differs');
  requireRecovery(
    typeof update.entry === 'string' && path.resolve(update.entry) === path.resolve(self.executable_path),
    'native update executable path differs from current self',
  );
  requireRecovery(
    isPlainRecord(registered) && registered.operation_id === request.systemUpdateOperationId,
    'registered release-owner operation differs',
  );
  requireRecovery(
    isPlainRecord(pending) && pending.operation_id === request.systemUpdateOperationId,
    'pending release-owner operation differs',
  );
  requireRecovery(
    registered.version === self.package_version && pending.version === registered.version,
    'release-owner versions differ from current self',
  );
  requireRecovery(
    ['awaiting_assurance', 'qualified', 'packed', 'installing', 'successful'].includes(registered.status),
    'release-owner status is not current',
  );
  return { ref: request.systemUpdateRef, operationId: request.systemUpdateOperationId };
}

function isPassedNativeBuildCheck(check: unknown) {
  return isPlainRecord(check) && check.id === 'native-build' && check.status === 'passed';
}

export function verifyQualifiedRuntimeCodeEndpoints(
  root: string,
  config: AgentRuntimeConfig,
  access: SafeRepositoryAccess,
  request: NativeEndpointRequest,
) {
  const oldManifest = readNativeManifest(
      access,
      request.oldManifestRef,
      request.oldManifestDigest,
      'old native manifest',
    ),
    currentManifest = readNativeManifest(
      access,
      request.currentManifestRef,
      request.currentManifestDigest,
      'current native manifest',
    ),
    oldInstall = readNativeInstall(access, request.oldInstallRef, oldManifest.value, 'old installation proof'),
    currentInstall = readNativeInstall(
      access,
      request.currentInstallRef,
      currentManifest.value,
      'current installation proof',
    ),
    updateValue = readStrictJson(access, request.systemUpdateRef, 'native system update').value,
    currentPaths = [...runtimePackageCodePaths(config.runtime.bundle)].sort(),
    self = currentNativeSelfAttestation();
  requireRecord(updateValue, 'native system update');
  requireRecovery(typeof updateValue.status === 'string', 'native update status is invalid');
  requireRecovery(typeof updateValue.operation_id === 'string', 'native update operation ID is invalid');
  requireRecovery(typeof updateValue.entry === 'string', 'native update entry path is invalid');
  requireRecovery(typeof updateValue.version === 'string', 'native update version is invalid');
  requireRecovery(typeof updateValue.run_id === 'string', 'native update run ID is invalid');
  requireRecovery(typeof updateValue.artifact_id === 'string', 'native update artifact ID is invalid');
  requireRecovery(updateValue.runtime_accepted === false, 'native update runtime acceptance is invalid');
  requireRecovery(updateValue.developer_unblocked === false, 'native update developer acceptance is invalid');

  const update: NativeUpdate = {
    ...updateValue,
    status: updateValue.status,
    operation_id: updateValue.operation_id,
    entry: updateValue.entry,
    version: updateValue.version,
    run_id: updateValue.run_id,
    artifact_id: updateValue.artifact_id,
    runtime_accepted: false,
    developer_unblocked: false,
    installation_observation: updateValue.installation_observation,
  };
  requireRecovery(
    currentPaths.length > 0 && currentPaths.length <= 4096,
    'current runtime inventory is empty or oversized',
  );
  requireRecovery(
    same(currentPaths, request.currentRuntimeCodePaths),
    'current runtime inventory differs from the request',
  );
  requireRecovery(self, 'current native self-attestation is missing');
  requireRecovery(
    path.resolve(currentInstall.path) === path.resolve(self.executable_path),
    'current install path differs from self',
  );
  requireRecovery(
    currentManifest.value.pin === self.bun_version && currentManifest.value.version === self.package_version,
    'current native manifest pin or version differs from self',
  );
  requireRecovery(
    currentManifest.value.payloadId === self.resource_payload_id,
    'current native manifest payload differs from self',
  );
  requireRecovery(
    currentManifest.value.asset.sha256 === self.executable_sha256 &&
      currentManifest.value.asset.bytes === self.executable_bytes,
    'current native manifest asset differs from self',
  );
  requireRecovery(
    currentInstall.sha256.toLowerCase() === self.executable_sha256 &&
      currentInstall.bytes === self.executable_bytes &&
      currentInstall.version === self.package_version,
    'current install proof differs from self',
  );
  requireRecovery(
    update.installation_observation && same(update.installation_observation, currentInstall),
    'system update does not retain the exact current install observation',
  );
  requireRecovery(
    update.version === self.package_version &&
      update.runtime_accepted === false &&
      update.developer_unblocked === false,
    'system update version or acceptance state differs',
  );
  const formed = readStrictJson(
    access,
    '.agent/work/agent-local-release/formed.json',
    'current formation pointer',
  ).value;
  requireRecord(formed, 'current formation pointer');
  const { digest: formationDigest, ...formationBody } = formed;
  requireRecovery(
    formed.schema === 'VidaLocalReleaseFormation/v1' &&
      formed.authority === 'local_consistency_only' &&
      formationDigest ===
        createHash('sha256')
          .update(JSON.stringify(formationBody, null, 2) + '\n')
          .digest('hex') &&
      formed.operation_id === request.systemUpdateOperationId &&
      formed.version === self.package_version &&
      formed.run_id === update.run_id &&
      formed.artifact_id === update.artifact_id &&
      typeof formed.request_id === 'string' &&
      hashPattern.test(formed.request_id),
    'current formation owner differs',
  );
  const formedResult = readStrictJson(
    access,
    '.agent/work/agent-local-release/' + formed.operation_id + '/ci/' + formed.request_id + '/result.json',
    'current formed result',
  );
  requireRecord(formedResult.value, 'current formed result');
  requireRecovery(
    createHash('sha256').update(formedResult.bytes).digest('hex') === formed.result_sha256 &&
      formedResult.value.schema === 'VidaCIDeliveryResult/v1' &&
      formedResult.value.operation_id === formed.operation_id &&
      formedResult.value.request_id === formed.request_id &&
      formedResult.value.manifest_sha256 === request.currentManifestDigest &&
      formedResult.value.payload_id === self.resource_payload_id &&
      same(formedResult.value.asset, currentManifest.value.asset) &&
      Array.isArray(formedResult.value.checks) &&
      formedResult.value.checks.some(isPassedNativeBuildCheck),
    'current formed result does not qualify the selected native',
  );
  const before = snapshotRuntimeManifestSources(oldManifest.value, config.runtime.bundle, request.oldRuntimeCodePaths),
    target = snapshotRuntimeManifestSources(currentManifest.value, config.runtime.bundle, currentPaths),
    installed = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, currentPaths);
  requireRecovery(
    before.digest === request.oldRuntimeCodeDigest,
    'old native inventory differs from the original Work code',
  );
  requireRecovery(
    target.digest === request.currentRuntimeCodeDigest && installed.digest === target.digest,
    'current native target differs from installed package bytes',
  );
  requireRecovery(before.digest !== target.digest, 'old/current native code endpoints are identical');
  requireRecovery(
    oldInstall.sha256.toLowerCase() === oldManifest.value.asset.sha256.toLowerCase() &&
      oldInstall.bytes === oldManifest.value.asset.bytes,
    'old install proof differs from its old manifest',
  );
  return {
    oldRuntime: {
      codeDigest: before.digest,
      codePaths: request.oldRuntimeCodePaths,
      manifestRef: request.oldManifestRef,
      manifestDigest: request.oldManifestDigest,
      installRef: request.oldInstallRef,
    },
    currentRuntime: {
      codeDigest: target.digest,
      codePaths: currentPaths,
      manifestRef: request.currentManifestRef,
      manifestDigest: request.currentManifestDigest,
      installRef: request.currentInstallRef,
    },
    systemUpdate: verifyCurrentUpdateOwner(root, request, update, self),
    nativeSelfAttestationDigest: canonicalJsonDigest(self),
  };
}

function verifyCurrentCas(request: RecoveryRequest, state: RecoveryState) {
  const { host, journal } = state,
    work = host.work;
  requireRecovery(
    host.workVersion?.revision === request.expectedWork.revision &&
      host.workVersion.digest === request.expectedWork.digest,
    'current Work CAS differs',
  );
  requireRecovery(
    host.ledgerVersion?.revision === request.expectedLedger.revision &&
      host.ledgerVersion.digest === request.expectedLedger.digest,
    'current coordination Ledger CAS differs',
  );
  requireRecovery(
    journal.version.revision === request.expectedJournal.revision &&
      journal.version.digest === request.expectedJournal.digest,
    'current Journal CAS differs',
  );
  requireRecovery(
    host.maintenanceGeneration === request.expectedMaintenanceGeneration,
    'maintenance generation differs',
  );
  requireRecovery(
    work?.binding.repository_id === request.identity.repository_id &&
      same(work.binding.project_ids, request.identity.project_ids) &&
      work.binding.integrations_digest === request.identity.integrations_digest,
    'current Work identity differs',
  );
  requireRecovery(
    work?.binding.runtime_code_digest === request.oldRuntimeCodeDigest &&
      work.binding.work_source_revision === request.originalSourceScopeDigest,
    'original Work code or Source scope differs',
  );
  requireRecovery(work.lease?.generation === request.leaseGeneration, 'original Work lease generation differs');
}

function buildVerifiedCurrent(
  root: string,
  config: AgentRuntimeConfig,
  access: SafeRepositoryAccess,
  request: RecoveryRequest,
  state: RecoveryState,
): VerifiedCurrent {
  verifyCurrentCas(request, state);
  const terminal = readTerminalProof(root, access, request, state),
    source = verifySourceDiff(root, access, request, state),
    native = verifyQualifiedRuntimeCodeEndpoints(root, config, access, request),
    value = {
      schema: 'CompletedSourceReportRecoveryVerifiedCurrent/v1',
      terminal,
      source,
      oldRuntime: native.oldRuntime,
      currentRuntime: native.currentRuntime,
      systemUpdate: native.systemUpdate,
      nativeSelfAttestationDigest: native.nativeSelfAttestationDigest,
    };
  return validateCompletedSourceReportRecoveryVerifiedCurrent(value, request);
}

function result(
  status: string,
  request: RecoveryRequest,
  proof: VerifiedCurrent | null,
  receipt: RecoveryState['recoveryReceipt'],
  store: Store,
  requestPath: string,
) {
  const { host, journal } = store.readWorkSessionSnapshot(request.identity);
  return {
    schema: 'CompletedSourceReportRecoveryResult/v1',
    status,
    attempt: request.attempt,
    receipt_digest: receipt ? canonicalJsonDigest(receipt) : null,
    work_version: host.workVersion,
    ledger_version: host.ledgerVersion,
    journal_version: journal?.version ?? null,
    current_journal_cas: journal?.version ?? null,
    maintenance_generation: host.maintenanceGeneration,
    next_action: receipt
      ? {
          kind: 'inspect',
          work_id: request.identity.work_id,
          attempt: request.attempt,
          expected_revision: journal?.version.revision,
          expected_digest: journal?.version.digest,
        }
      : { kind: status === 'completed_source_report_recovery_planned' ? 'apply' : 'plan', request_ref: requestPath },
    execution_continuation: receipt !== null,
    next_wave: null,
    source_rights_granted: false,
    accepted_result: false,
    runtime_accepted: false,
    verified_current_digest: proof ? canonicalJsonDigest(proof) : null,
  };
}

export function recoverCompletedSourceReport(args: string[]) {
  const { mode, root, requestPath } = parseArgs(args),
    access = requireSafeRepositoryAccess(root),
    requestRead = readStrictJson(access, requestPath, 'completed Source report recovery request', 2 * 1024 * 1024),
    request = validateCompletedSourceReportRecoveryRequest(requestRead.value),
    config = loadRuntimeConfig(root),
    project = loadProjectSetContext(root, config, request.identity.repository_id, request.identity.project_ids);
  requireRecovery(
    same(request.identity, {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: request.identity.work_id,
    }),
    'request identity differs from configured ProjectContext',
  );
  const file = sessionHandoffDatabasePath(root, config);
  const database = openCliWorkspaceDatabase(
    root,
    file,
    deriveWorkspaceId(config.repository.repository_id, root),
    mode !== 'apply',
  );
  try {
    const store = createCliHostStateStore(
        database,
        deriveWorkspaceId(project.repository_id, root),
        undefined,
        undefined,
        undefined,
        undefined,
        root,
      ),
      state = readRecoveryState(store, request),
      requestDigest = canonicalJsonDigest(request);
    if (state.recoveryReceipt) {
      requireRecovery(
        state.recoveryReceipt.record.request_digest === requestDigest,
        'completed retry changes its exact request',
      );
      const proof = null;
      return result(
        'completed_source_report_recovery_retained',
        request,
        proof,
        state.recoveryReceipt,
        store,
        requestPath,
      );
    }
    const verifyCurrent = (currentRequest: RecoveryRequest, currentState: RecoveryState): VerifiedCurrent => {
      requireRecovery(
        same(currentRequest, request) && access.readBytes(requestPath, 'request stability').equals(requestRead.bytes),
        'request changed during recovery',
      );
      return buildVerifiedCurrent(root, config, access, request, currentState);
    };
    const proof = buildVerifiedCurrent(root, config, access, request, state);
    if (mode === 'inspect')
      return result('completed_source_report_recovery_ready', request, proof, null, store, requestPath);
    if (mode === 'plan')
      return result('completed_source_report_recovery_planned', request, proof, null, store, requestPath);
    const receipt = store.commitCompletedSourceReportRecovery(request, verifyCurrent),
      retained = store.readCompletedSourceReportRecoveryReceipt(request.identity, request.attempt);
    requireRecovery(
      retained && retained.record.request_digest === requestDigest && same(receipt, retained),
      'Host commit readback differs from the exact completed report request',
    );
    return result('completed_source_report_recovered', request, proof, retained, store, requestPath);
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
