import {
  releaseState,
  saveReleaseState as save,
  releaseDirectory as directory,
  releaseJournalFile as journalFile,
  operationMutex,
  withReleaseAdmission,
  selectedTarball,
  packedDistribution,
  assertReleaseRetargetSettled,
  parseReleaseVersion,
  parseReleasePackMetadata,
  releasePath,
  releaseRelative,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
export {
  withReleaseAdmission,
  selectedTarball,
  packedDistribution,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  constants,
  copyFileSync,
  fsyncSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { homedir } from 'node:os';
import { sdkCompatibilityManifest } from '../../packages/agent/tooling/pack-sdk.mjs';
import { findNpmCli } from '../../packages/agent/bin/bun.mjs';

import {
  readNativeRetargetCandidate,
  verifyCompletedReleaseRetargetHandoff,
} from '../../packages/agent/bin/repair-release-retarget.mjs';
import { assertNativeDeliveryEvidenceRepairSettled } from '../../packages/agent/bin/repair-native-delivery-evidence.mjs';
import { readConfirmedCIDeliveryFormation, validateCIDeliveryRequest } from './release-ci-evidence.mjs';
import {
  publishReleasePreparation,
  readReleasePreparation,
  resumeReleasePreparation,
} from '../../packages/agent/bin/release-preparation.mjs';

/** @typedef {{schema:'VidaLocalReleaseFormation/v1',authority:'local_consistency_only',operation_id:string,request_id:string,version:string,source_binding:string,run_id:string,run_attempt:number,artifact_id:string,result_sha256:string,digest:string}|null} ReleaseFormation */
/** @type {(root:string)=>ReleaseFormation} */
const readReleaseFormation = /** @type {(root:string)=>ReleaseFormation} */ (readConfirmedCIDeliveryFormation);

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const childCapabilityEnvironmentKey = 'VIDA_RELEASE_CHILD_CAPABILITY';
const idPattern = /^[a-z0-9][a-z0-9-]{0,95}$/;
/** @param {unknown} value @returns {string} */
const json = (value) => JSON.stringify(value, null, 2) + '\n';
/** @param {string} text @returns {unknown} */
function parseJson(text) {
  /** @type {unknown} */
  const value = JSON.parse(text);
  return value;
}
/** @param {string} file @returns {unknown} */
const read = (file) => parseJson(readFileSync(file, 'utf8'));
/** @param {Buffer | string} bytes @returns {string} */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** @param {unknown} value @returns {value is JsonRecord} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @param {string} message @returns {JsonRecord} */
function requireJsonRecord(value, message) {
  if (!isRecord(value)) throw new Error(message);
  return value;
}

/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** @param {unknown} value @param {string} message @returns {string[]} */
function requireStringArray(value, message) {
  if (!isStringArray(value)) throw new Error(message);
  return value;
}

/** @param {Set<string>} values @returns {string|null} */
function onlySetValue(values) {
  if (values.size !== 1) return null;
  const [value] = values;
  return value ?? null;
}

/** @param {unknown} value @returns {value is number} */
function isPositiveSafeInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

/** @param {unknown} value @returns {value is number} */
function isSafeIntegerNumber(value) {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** @param {unknown} value @returns {value is number} */
function isIntegerNumber(value) {
  return typeof value === 'number' && Number.isInteger(value);
}

/** @param {unknown} value @param {string} message @returns {number} */
function requirePositiveSafeInteger(value, message) {
  if (!isPositiveSafeInteger(value)) throw new Error(message);
  return value;
}

/** @param {unknown} value @param {string} message @returns {string} */
function requireCommit(value, message) {
  if (typeof value !== 'string' || !commitPattern.test(value)) throw new Error(message);
  return value;
}

/** @param {unknown} value @param {string} message @returns {string} */
function requireString(value, message) {
  if (typeof value !== 'string') throw new Error(message);
  return value;
}

/** @param {unknown} error @returns {string} */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/** @template T @param {{value:T}|undefined} result @returns {T} */
function requireCleanupResult(result) {
  if (result === undefined) throw new Error('Cleanup operation completed without a result.');
  return result.value;
}

/** @param {unknown} value @returns {asserts value is {source_binding:string}} */
function assertQualifiedSourceBinding(value) {
  if (!isRecord(value) || typeof value.source_binding !== 'string')
    throw new Error('Current qualified source binding missing.');
}

/** @param {number|undefined} pid @returns {number} */
function requireSpawnedChildPid(pid) {
  if (pid === undefined) throw new Error('Release worker launch is ambiguous; preserve its one-shot reservation.');
  return pid;
}

/** @param {unknown} value @param {string[]} expectedArgs @param {string} message @returns {value is JsonRecord & {stdout:string}} */
function isSuccessfulPackReceipt(value, expectedArgs, message) {
  if (!isRecord(value) || value.code !== 0) return false;
  if (
    value.command !== process.execPath ||
    value.signal ||
    typeof value.stdout !== 'string' ||
    JSON.stringify(value.args) !== JSON.stringify(expectedArgs)
  )
    throw new Error(message);
  return true;
}

/** @param {DispositionCensusRequestRow|undefined} censusRow @param {DispositionObservationRequestRow|undefined} observationRow @returns {[DispositionCensusRequestRow,DispositionObservationRequestRow]} */
function requireDispositionRequestRows(censusRow, observationRow) {
  if (!censusRow || !observationRow) throw new Error('actual census request row disappeared');
  return [censusRow, observationRow];
}

/** @param {unknown} info @returns {'Directory'|'File'|'Other'} */
function tarEntryKind(info) {
  if (!isRecord(info) || typeof info.type !== 'string') return 'Other';
  if (info.type === 'Directory') return 'Directory';
  return info.type === 'File' ? 'File' : 'Other';
}

/** @template T @param {T|null|undefined} value @param {string} message @returns {T} */
function requirePresentValue(value, message) {
  if (value == null) throw new Error(message);
  return value;
}

/** @param {ReleaseWorkerOptions} options @returns {{reservedPid:number,launchCapability:string}} */
function requireReleaseLaunchReservation(options) {
  const reservedPid = options.reservedPid;
  const launchCapability = options.launchCapability;
  if (reservedPid === undefined || launchCapability === undefined)
    throw new Error('Initialized release worker lacks its exact one-shot launch reservation.');
  return { reservedPid, launchCapability };
}

/** @param {ServiceOperationCustody|null} prior @param {ReleaseWorkerKind} kind @param {string} requestDigest @param {number} reservedPid @param {string} launchCapability @param {ServiceOperationCustodyApi} api @returns {prior is ServiceOperationCustodyRow} */
function matchesReleaseLaunchReservation(prior, kind, requestDigest, reservedPid, launchCapability, api) {
  return Boolean(
    prior &&
    prior.owner_kind === kind &&
    prior.request_digest === requestDigest &&
    prior.phase === 'launching' &&
    prior.launch_pid === reservedPid &&
    reservedPid === process.pid &&
    api.serviceOperationLaunchCapabilityMatches(prior.owner_token, launchCapability),
  );
}

/** @param {unknown} value @param {string} message @returns {string[]} */
function normalizePriorRunIds(value, message) {
  if (
    !Array.isArray(value) ||
    value.some((id) => !(typeof id === 'string' && /^\d+$/.test(id)) && !isPositiveSafeInteger(id)) ||
    new Set(value.map(String)).size !== value.length
  )
    throw new Error(message);
  return value.map(String);
}

/** @param {unknown} value @param {string} message @returns {number} */
function parseDispatchTimestamp(value, message) {
  const timestamp = Date.parse(String(value));
  if (!Number.isFinite(timestamp)) throw new Error(message);
  return timestamp;
}

/** @param {unknown} value @param {string} message @returns {string|null} */
function normalizeProviderRunId(value, message) {
  if (value === undefined) return null;
  if (typeof value === 'string' && /^\d+$/.test(value)) return value;
  if (typeof value === 'number' && /^\d+$/.test(value.toString())) return value.toString();
  throw new Error(message);
}

/** @param {unknown} value @returns {asserts value is ReleaseDispositionProposal} */
function assertReleaseDispositionProposal(value) {
  if (
    !isRecord(value) ||
    value.schema !== 'VidaLocalReleaseDispositionProposal/v1' ||
    value.status !== 'eligible' ||
    !isRecord(value.receipt) ||
    typeof value.receipt.digest !== 'string' ||
    !isRecord(value.census) ||
    !isRecord(value.census.requestCensus) ||
    !isRecord(value.census.runObservations)
  )
    throw new Error('A current eligible pending disposition proposal is required.');
}

/** @param {unknown} value @returns {asserts value is CIDeliveryRequest} */
function assertCIDeliveryRequest(value) {
  validateCIDeliveryRequest(value);
}

/** @typedef {ReturnType<typeof releaseState>} ReleaseJournalState */
/** @typedef {Record<string, unknown> & {operation_id: string, version: string}} ReleaseEvidenceState */
/** @typedef {ServiceOperationHandoffProof & {previous_evidence_digest: string}} RetargetHandoffProof */
/** @typedef {ReturnType<typeof import('../../packages/agent/bin/local-release-artifacts.mjs').parseReleasePackMetadata>} ReleasePackMetadata */
/** @typedef {'release-worker' | 'release-pack-worker'} ReleaseWorkerKind */
/** @typedef {typeof import('../../packages/agent/src/config/service-operation-custody.ts')} ServiceOperationCustodyApi */
/** @typedef {ReturnType<ServiceOperationCustodyApi['openServiceOperationDatabase']>} ServiceOperationDatabase */
/** @typedef {NonNullable<ReturnType<ServiceOperationCustodyApi['readServiceOperationCustodyForOperation']>>} ServiceOperationCustodyRow */
/** @typedef {ReturnType<ServiceOperationCustodyApi['readServiceOperationCustodyForOperation']>} ServiceOperationCustody */
/** @typedef {ReturnType<ServiceOperationCustodyApi['reserveServiceOperationLaunch']>} ServiceOperationLaunchReservation */
/** @typedef {ReturnType<ServiceOperationCustodyApi['claimReservedServiceOperationLaunch']>} ServiceOperationHandle */
/** @typedef {Awaited<ReturnType<Parameters<ServiceOperationCustodyApi['reconcileServiceOperationCustody']>[7]>>} ServiceOperationProof */
/** @typedef {Awaited<ReturnType<Parameters<ServiceOperationCustodyApi['handoffServiceOperationCustody']>[7]>>} ServiceOperationHandoffProof */
/** @typedef {NonNullable<Awaited<ReturnType<typeof verifyCompletedReleaseRetargetHandoff>>>} ReleaseRetargetHandoff */
/** @typedef {Parameters<typeof import('./release-ci-evidence.mjs').verifyCIDeliveryEvidence>[0]['ci']} ReleaseCIEvidence */
/** @typedef {{root: string, operation: string, version: string, ci: ReleaseCIEvidence}} ReleaseQualificationInput */
/** @typedef {(input: ReleaseQualificationInput) => Promise<unknown>} ReleaseQualifier */
/** @typedef {{root?: string | undefined, qualify: ReleaseQualifier, ci?: ReleaseCIEvidence, packOnly?: boolean | undefined, distribution?: string | undefined, command?: typeof runCommand, npmCli?: string | undefined, env?: NodeJS.ProcessEnv | undefined, reservedPid?: number | undefined, launchCapability?: string | undefined}} ReleaseWorkerOptions */
/** @typedef {ReleaseWorkerOptions & {operation: string}} ReleaseExecutionInput */
/** @typedef {Record<string, unknown>} JsonRecord */
/** @typedef {Parameters<typeof publishReleasePreparation>[1]} PreparedRelease */
/** @typedef {{cwd?:string,env?:NodeJS.ProcessEnv,log?:string,windowsVerbatimArguments?:boolean}} RunCommandOptions */
/** @typedef {{distribution?:'native'|'npm',expectedManifestBytes?:Buffer|undefined}} InstalledTreeOptions */
/** @typedef {{installed_root:string,prefix:string,path_command:string}} NativeInstallationPaths */
/** @typedef {{path:string,bytes:number,sha256:string}} PriorPublishedAsset */
/** @typedef {{command: string, args: string[], code: number | null, signal: NodeJS.Signals | null, stdout: string, stderr: string}} PackCommandReceipt */
/** @typedef {{name: string, version: string, bin: JsonRecord, engines: JsonRecord, packageManager: string} & JsonRecord} PackageManifestRecord */
/** @typedef {{state: ReleaseJournalState, requestDigest: string, proof: ServiceOperationProof, result?: never} | {result: ReleaseJournalState, state?: never, requestDigest?: never, proof?: never}} PreparedReleaseLaunch */

/** @typedef {{workspace_id: string, relative: string, api: ServiceOperationCustodyApi}} InitializedReleaseCustody */
/** @typedef {{value: ServiceOperationDatabase | undefined}} ReleaseDatabaseHolder */
/** @param {ReleaseDatabaseHolder} holder @param {string} [message] @returns {ServiceOperationDatabase} */
function requireReleaseDatabase(holder, message = 'Initialized release custody database is unavailable.') {
  if (!holder.value) throw new Error(message);
  return holder.value;
}
/** @typedef {{prior: ServiceOperationCustody | null, database: ServiceOperationDatabase | undefined, terminal: ReleaseJournalState | null}} ValidatedReleaseCustody */
/** @typedef {{mode: 'patch' | 'minor' | 'major', explicit?: boolean} | {mode: 'exact', version: string, explicit?: boolean}} ReleaseVersionSelection */
/** @typedef {{operation_id: string, version: string, observed_at: string, requests: DispositionRequestObservation[]}} DispositionActualCensus */
/** @typedef {{request_id: string, no_issue?: boolean, source_commit?: string|null, runs: DispositionRunObservation[], references: unknown[], no_issue_reference_paths?: unknown[]}} DispositionRequestObservation */
/** @typedef {{kind: string, status: string, conclusion: string, run_id: string, run_attempt: number, repository_id: number, workflow_id: number, head_sha: string, source_commit?: string|null, dispatch_reference_path?: string|null, created_at?: string}} DispositionRunObservation */
/** @typedef {{operation_id: string, version: string, request_ids: string[], actual_census: DispositionActualCensus}} ReleaseDispositionCensusInput */
/** @typedef {{path: string} | string} DispositionReference */
/** @typedef {{request: string, reference_path: string, value: unknown, related_profiles?: unknown[]}} ReleaseDispositionEvidenceReference */
/** @typedef {{schema: 'VidaCIDeliveryRequest/v1', operation_id: string, version: string, repository_id: string, project_ids: string[], target: string, source_binding: string, request_id: string}} CIDeliveryRequest */
/** @typedef {JsonRecord & {path:string,status:string,run_ids?:string[]}} DispositionCensusReference */
/** @typedef {{request_id:string,target:string,references:DispositionCensusReference[]}} DispositionCensusRequestRow */
/** @typedef {{operation_id:string,version:string,requests:DispositionCensusRequestRow[]}} DispositionRequestCensus */
/** @typedef {JsonRecord & {request_id:string,references:DispositionReference[],runs:Array<DispositionRunObservation & {created_at:string}>}} DispositionObservationRequestRow */
/** @typedef {JsonRecord & {request_id:string,reference_path:string,kind:string,status:string,observed_at:string}} DispositionNoIssueObservation */
/** @typedef {JsonRecord & {request_id:string,reference_path:string,kind:string}} DispositionSupplementalIntent */
/** @typedef {{operation_id:string,observed_at:string,requests:DispositionObservationRequestRow[],no_issue_references?:DispositionNoIssueObservation[],dispatch_intents?:DispositionSupplementalIntent[]}} DispositionRunObservations */
/** @typedef {{requestCensus:DispositionRequestCensus,runObservations:DispositionRunObservations}} ReleaseDispositionEvidence */
/** @typedef {{run_id:string,run_attempt:number,status:string,conclusion:string,repository_id:number,workflow_id:number,head_sha:string,source_commit:string,dispatch_reference_path:string|null}} ClassifiedDispositionRun */
/** @typedef {{request_id:string,no_issue:boolean,source_commit:string|null,references:unknown[],no_issue_reference_paths:string[],runs:ClassifiedDispositionRun[]}} ClassifiedDispositionRequest */
/** @typedef {{status:'eligible',operation_id:string,version:string,request_count:number,terminal_success_count:number,terminal_failure_count:number,no_issue_count:number,requests:ClassifiedDispositionRequest[]}|{status:'blocked',blockers:string[]}} ReleaseDispositionClassification */
/** @typedef {{status:'eligible',assignments:Array<{reference_path:string,run_id:string,source_commit:string,repository_id:number,workflow_id:number}>,unmatched_intent_paths:string[]}|{status:'blocked',blockers:string[]}} ReleaseDispatchJoin */
/** @typedef {{schema:'VidaLocalReleaseDispositionProposal/v1',status:'eligible',receipt:JsonRecord & {operation_id:string,digest:string},census:ReleaseDispositionEvidence}} ReleaseDispositionProposal */
/** @typedef {ReleaseDispositionProposal | {schema:'VidaLocalReleaseDispositionProposal/v1',status:'blocked',blockers:string[]}} ReleaseDispositionResult */

/** @param {string} root */
function initializedReleaseCustody(root) {
  if (!process.versions.bun) {
    const initializedRoot = path.join(root, '.vida');
    const rootInfo = lstatSync(initializedRoot, { throwIfNoEntry: false });
    if (rootInfo && (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()))
      throw new Error('VIDA configuration root is unsafe.');
    const projectConfig = lstatSync(path.join(initializedRoot, 'project.yaml'), {
      throwIfNoEntry: false,
    });
    if (projectConfig)
      throw new Error('Initialized release operations require the pinned Bun workspace admission route.');
    return null;
  }
  const require = createRequire(import.meta.url);
  const runtime = /** @type {typeof import('../../packages/agent/src/config/runtime-config.ts')} */ (
    require('../../packages/agent/src/config/runtime-config.ts')
  );
  const paths = /** @type {typeof import('../../packages/agent/src/config/project-paths.ts')} */ (
    require('../../packages/agent/src/config/project-paths.ts')
  );
  const config = runtime.loadRuntimeConfig(root);
  if (paths.runtimeConfigurationSourceFor(config) !== paths.PROJECT_CONFIGURATION_PATHS.project) return null;
  const identity = /** @type {typeof import('../../packages/agent/src/workspace-identity.ts')} */ (
    require('../../packages/agent/src/workspace-identity.ts')
  );
  const workspaceId = identity.deriveWorkspaceId(config.repository.repository_id, root);
  return {
    workspace_id: workspaceId,
    relative: paths.sessionHandoffDatabaseRelativePath(config),
    api: /** @type {ServiceOperationCustodyApi} */ (
      require('../../packages/agent/src/config/service-operation-custody.ts')
    ),
  };
}

/** @param {string} root */
function releaseCustodyStatus(root) {
  const prerequisite =
    'existing initialized workspace DB with the package-owned service custody schema and admission gate';
  try {
    const configured = initializedReleaseCustody(root);
    return configured
      ? { state: 'configured_unverified', prerequisite }
      : { state: 'missing', prerequisite, detail: 'initialized .vida workspace custody is not configured' };
  } catch (error) {
    return {
      state: 'unavailable',
      prerequisite,
      detail: errorMessage(error),
    };
  }
}

/** @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {ReleaseWorkerOptions} options */
function releaseOperationRequestDigest(kind, state, options) {
  return sha(
    Buffer.from(
      json({
        schema: 'VidaReleaseWorkerRequest/v1',
        owner_kind: kind,
        operation_id: state.operation_id,
        version: state.version,
        pack_only: options.packOnly,
        distribution: options.distribution ?? null,
        qualification: options.packOnly ? 'release-tests' : 'release-assurance',
      }),
    ),
  );
}

/** @param {ReleaseJournalState} state @param {string | null} archiveDigest @param {string | null} installedCommandDigest */
/** @param {ReleaseEvidenceState} state @param {string | null} archiveDigest @param {string | null} [installedCommandDigest] @returns {string} */
function releaseEvidenceDigest(state, archiveDigest, installedCommandDigest = null) {
  return sha(
    Buffer.from(
      json({
        schema: 'VidaReleaseWorkerEvidence/v1',
        journal_digest: sha(Buffer.from(json(state))),
        archive_digest: archiveDigest,
        installed_command_digest: installedCommandDigest,
      }),
    ),
  );
}

/** @param {unknown} value @returns {value is 'awaiting_assurance' | 'qualified' | 'packing' | 'installing'} */
function isPreparedReleaseSourceStatus(value) {
  return value === 'awaiting_assurance' || value === 'qualified' || value === 'packing' || value === 'installing';
}

/** @param {ReleaseJournalState} state @returns {ReleaseJournalState} */
function preparedRunningReleaseImage(state) {
  if (state.status !== 'running') return state;
  if (!isPositiveSafeInteger(state.pid)) throw new Error('Running release journal has no exact spawned worker pid.');
  const sourceStatus = state.launch_source_status ?? 'awaiting_assurance';
  if (!isPreparedReleaseSourceStatus(sourceStatus))
    throw new Error('Running release journal has no supported exact source phase.');
  /** @type {ReleaseJournalState & {pid?: unknown, launch_source_status?: unknown}} */
  /** @type {ReleaseJournalState & {pid?: unknown, launch_source_status?: unknown}} */
  const prepared = { ...state, status: sourceStatus };
  delete prepared.pid;
  delete prepared.launch_source_status;
  return prepared;
}

/** @param {ReleaseJournalState} state @returns {asserts state is ReleaseJournalState & {install_started: true, installed_root: string, prefix: string, path_command: string, pack_metadata: unknown, tarball_sha256: string}} */
function assertInstalledReleaseState(state) {
  if (
    state.install_started !== true ||
    typeof state.installed_root !== 'string' ||
    typeof state.prefix !== 'string' ||
    typeof state.path_command !== 'string' ||
    !state.pack_metadata
  )
    throw new Error('Same-operation install receipt is incomplete; preserve UNKNOWN.');
}

/** @param {string} root @param {ReleaseJournalState} state */
function verifyInstalledReleaseReceipt(root, state) {
  assertInstalledReleaseState(state);
  const metadata = parseReleasePackMetadata(state.pack_metadata);
  const archive = selectedTarball(metadata, path.join(root, '.tmp/releases', state.operation_id), state.version);
  const archiveDigest = sha(readFileSync(archive));
  if (archiveDigest !== state.tarball_sha256)
    throw new Error('Same-operation archive receipt differs; preserve UNKNOWN.');
  verifyInstalledTree(root, metadata, state.installed_root);
  const asset = nativeAsset(root, metadata, state.operation_id);
  nativePath(state.prefix);
  const commandInfo = lstatSync(state.path_command);
  if (
    !commandInfo.isFile() ||
    commandInfo.isSymbolicLink() ||
    commandInfo.nlink !== 1 ||
    sha(readFileSync(state.path_command)) !== asset.sha256
  )
    throw new Error('Same-operation installed command receipt differs; preserve UNKNOWN.');
  return { archive_digest: archiveDigest, command_digest: asset.sha256 };
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof>} */
async function verifyPackAfterimage(root, operation, state) {
  const metadata = parseReleasePackMetadata(state.pack_metadata);
  const archiveSha256 = requireString(state.tarball_sha256, 'Same-operation package afterimage has no archive digest.');
  const archive = selectedTarball(metadata, path.join(root, '.tmp/releases', operation), state.version);
  const archiveDigest = sha(readFileSync(archive));
  if (archiveDigest !== archiveSha256) throw new Error('Same-operation package afterimage differs.');
  await verifyPackedSources(root, metadata, archive, findNpmCli(), sdkManifest(root));
  return {
    phase: state.status === 'awaiting_assurance' ? 'terminal' : 'prepared',
    evidence_digest: releaseEvidenceDigest(state, archiveDigest),
  };
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof | null>} */
async function verifyInterruptedPack(root, operation, state) {
  const folder = path.join(root, '.tmp/releases', operation);
  const log = path.join(folder, 'pack.json');
  if (state.status !== 'packing' || !existsSync(log)) return null;
  const prior = requireJsonRecord(read(log), 'Interrupted package command receipt must be an object.');
  const expectedArgs = [
    path.join(root, 'packages/agent/tooling/pack-sdk.mjs'),
    '--pack',
    '--root',
    path.join(root, 'packages/agent'),
    '--destination',
    folder,
  ];
  if (!isSuccessfulPackReceipt(prior, expectedArgs, 'Interrupted package command has no exact successful receipt.'))
    throw new Error('Interrupted package command has no exact successful receipt.');
  const metadata = parsePackOutput(prior.stdout);
  const archive = selectedTarball(metadata, folder, state.version);
  const archiveDigest = sha(readFileSync(archive));
  await verifyPackedSources(root, metadata, archive, findNpmCli(), sdkManifest(root));
  const logDigest = sha(readFileSync(log));
  return {
    phase: 'prepared',
    evidence_digest: releaseEvidenceDigest(state, sha(Buffer.from(json({ archiveDigest, logDigest })))),
  };
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @returns {ServiceOperationProof | null} */
function verifyQualifiedPackBeforeimage(root, operation, state) {
  const folder = path.join(root, '.tmp/releases', operation);
  const log = path.join(folder, 'pack.json');
  const archive = path.join(folder, `${manifest(root).value.name}-${state.version}.tgz`);
  if (state.status !== 'qualified' || existsSync(log) || existsSync(archive)) return null;
  return { phase: 'prepared', evidence_digest: releaseEvidenceDigest(state, null) };
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof>} */
async function verifyPackWorkerProof(root, operation, state) {
  if (state.pack_metadata && state.tarball_sha256) return verifyPackAfterimage(root, operation, state);
  return verifyPackWorkerBeforeimages(root, operation, state);
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof>} */
async function verifyPackWorkerBeforeimages(root, operation, state) {
  return (
    (await verifyInterruptedPack(root, operation, state)) ??
    (await verifyInitialPackWorkerBeforeimage(root, operation, state)) ??
    verifyQualifiedPackBeforeimage(root, operation, state) ??
    (() => {
      throw new Error('No exact same-operation package receipt resolves the interrupted worker.');
    })()
  );
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof | null>} */
async function verifyInitialPackWorkerBeforeimage(root, operation, state) {
  if (state.status !== 'awaiting_assurance' && state.status !== 'running') return null;
  return assertInitialPackImage(root, operation, state);
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} current @param {Buffer} journalBytes @returns {Promise<ServiceOperationProof>} */
async function verifyReleaseWorkerProof(root, operation, current, journalBytes) {
  const successfulPath = path.join(root, '.agent/work/agent-local-release/successful.json');
  if (current.status === 'successful') {
    if (!readFileSync(successfulPath).equals(journalBytes))
      throw new Error('Successful release pointer differs from its exact operation journal.');
    const installed = verifyInstalledReleaseReceipt(root, current);
    return {
      phase: 'terminal',
      evidence_digest: releaseEvidenceDigest(current, installed.archive_digest, installed.command_digest),
    };
  }
  if (!current.pack_metadata || !current.tarball_sha256)
    throw new Error('No exact same-operation package receipt resolves the worker.');
  const archive = selectedTarball(current.pack_metadata, path.join(root, '.tmp/releases', operation), current.version);
  const archiveDigest = sha(readFileSync(archive));
  if (archiveDigest !== current.tarball_sha256) throw new Error('Same-operation package receipt differs.');
  const packMetadata = parseReleasePackMetadata(current.pack_metadata);
  const expectedManifest = packMetadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')
    ? sdkManifest(root)
    : undefined;
  await verifyPackedSources(root, packMetadata, archive, findNpmCli(), expectedManifest);
  if (current.install_started === true) {
    const installed = verifyInstalledReleaseReceipt(root, current);
    return {
      phase: 'prepared',
      evidence_digest: releaseEvidenceDigest(current, installed.archive_digest, installed.command_digest),
    };
  }
  if (current.install_started !== true)
    return { phase: 'prepared', evidence_digest: releaseEvidenceDigest(current, archiveDigest) };
  throw new Error('No exact same-operation beforeimage, afterimage, or terminal receipt resolves the worker.');
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseEvidenceState} state @returns {Promise<ServiceOperationProof>} */
async function verifyReleaseOperationProof(root, operation, kind, state) {
  const journalPath = journalFile(root, operation);
  const journalBytes = readFileSync(journalPath);
  const current = releaseState(journalPath);
  if (current.operation_id !== operation || current.version !== state.version)
    throw new Error('Same-operation release journal identity differs; preserve UNKNOWN.');
  const workerImage = preparedRunningReleaseImage(current);
  if (workerImage.status === 'awaiting_assurance' && !Array.isArray(workerImage.pack_metadata))
    return assertInitialPackImage(root, operation, workerImage);
  return kind === 'release-pack-worker'
    ? verifyPackWorkerProof(root, operation, workerImage)
    : verifyReleaseWorkerProof(root, operation, workerImage, journalBytes);
}

/** @param {string} root @param {string} operation @param {ServiceOperationCustody} prior @returns {Promise<RetargetHandoffProof | null>} */
async function verifyRetargetHandoffProof(root, operation, prior) {
  const handoff = await verifyCompletedReleaseRetargetHandoff({ root, operation });
  if (!handoff) return null;
  const custodyPrior = requirePresentValue(prior, 'Retarget custody lineage is unavailable; preserve UNKNOWN.');
  assertRetargetHandoffIdentity(handoff, operation);
  assertRetargetHandoffLineage(handoff, custodyPrior);
  const previousDigest = releaseEvidenceDigest(handoff.previous, handoff.previous_archive_sha256);
  assertRetargetPackOwnerEvidence(custodyPrior, previousDigest);
  const current = await verifyReleaseOperationProof(root, operation, 'release-worker', handoff.current);
  if (current.phase !== 'prepared') throw new Error('Retargeted native release is not a prepared install image.');
  return {
    phase: 'prepared',
    evidence_digest: current.evidence_digest,
    handoff_digest: handoff.plan_digest,
    previous_evidence_digest: previousDigest,
  };
}

/** @param {ReleaseRetargetHandoff} handoff @param {string} operation */
function assertRetargetHandoffIdentity(handoff, operation) {
  if (
    handoff.operation_id !== operation ||
    handoff.current.operation_id !== operation ||
    handoff.previous.operation_id !== operation ||
    handoff.current.version !== handoff.previous.version
  )
    throw new Error('Same-operation native retarget identity differs; preserve UNKNOWN.');
}

/** @param {ReleaseRetargetHandoff} handoff @param {ServiceOperationCustody} prior */
function assertRetargetHandoffLineage(handoff, prior) {
  const previousDigest = releaseEvidenceDigest(handoff.previous, handoff.previous_archive_sha256);
  if (
    (prior?.handoff_digest != null && prior.handoff_digest !== handoff.plan_digest) ||
    (prior?.handoff_from_evidence_digest != null && prior.handoff_from_evidence_digest !== previousDigest)
  )
    throw new Error('Same-operation native retarget custody differs; preserve UNKNOWN.');
}

/** @param {ServiceOperationCustody} prior @param {string} previousDigest */
function assertRetargetPackOwnerEvidence(prior, previousDigest) {
  if (
    prior?.owner_kind === 'release-pack-worker' &&
    prior.phase === 'terminal' &&
    prior.evidence_digest !== previousDigest
  )
    throw new Error('Terminal npm pack custody differs from the retargeted beforeimage.');
}

/** @param {string} root @param {string} operation @param {ServiceOperationCustodyRow} prior @returns {Promise<ServiceOperationProof|null>} */
async function verifyRetargetedPackTerminalProof(root, operation, prior) {
  const handoff = await verifyCompletedReleaseRetargetHandoff({ root, operation });
  if (!handoff) return null;
  if (
    prior.owner_kind !== 'release-pack-worker' ||
    handoff.operation_id !== operation ||
    handoff.previous.operation_id !== operation ||
    handoff.current.operation_id !== operation ||
    handoff.previous.version !== handoff.current.version
  )
    throw new Error('Same-operation retarget does not prove terminal pack custody.');
  const evidenceDigest = releaseEvidenceDigest(handoff.previous, handoff.previous_archive_sha256);
  if (prior.phase === 'terminal' && prior.evidence_digest !== evidenceDigest)
    throw new Error('Terminal npm pack custody differs from the retargeted beforeimage.');
  /** @type {ServiceOperationProof} */
  return { phase: 'terminal', evidence_digest: evidenceDigest };
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {ServiceOperationCustodyRow} prior */
async function verifyTerminalReleaseCustody(root, operation, kind, state, prior) {
  if (prior.phase !== 'terminal') return null;
  const receipt = await verifyReleaseOperationProof(root, operation, kind, state);
  if (receipt.phase !== 'terminal' || receipt.evidence_digest !== prior.evidence_digest)
    throw new Error('Terminal release custody no longer matches its exact receipt.');
  return releaseState(journalFile(root, operation));
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {ServiceOperationCustodyRow} prior */
async function verifyPreparedReleaseCustody(root, operation, kind, state, prior) {
  if (prior.phase !== 'prepared') return;
  const receipt = await verifyPreparedReleaseCustodyProof(root, operation, kind, state, prior);
  if (receipt.phase !== 'prepared' || receipt.evidence_digest !== prior.evidence_digest)
    throw new Error('Prepared release custody no longer matches its exact receipt.');
  return receipt;
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {ServiceOperationCustodyRow} prior */
async function verifyPreparedReleaseCustodyProof(root, operation, kind, state, prior) {
  if (kind === 'release-pack-worker' && state.status === 'awaiting_assurance')
    return assertInitialPackImage(root, operation, state);
  if (kind === 'release-worker' && state.status === 'awaiting_assurance' && !Array.isArray(state.pack_metadata))
    return assertInitialPackImage(root, operation, state);
  if (
    kind === 'release-worker' &&
    prior.handoff_digest !== null &&
    (await verifyPreparedReleaseRetargetHandoff(root, operation, state, prior))
  ) {
    const evidenceDigest = requireString(prior.evidence_digest, 'Prepared release custody has no evidence digest.');
    /** @type {ServiceOperationProof} */
    return { phase: 'prepared', evidence_digest: evidenceDigest };
  }
  return verifyReleaseOperationProof(root, operation, kind, state);
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @param {ServiceOperationCustodyRow} prior */
async function verifyPreparedReleaseRetargetHandoff(root, operation, state, prior) {
  if (state.status !== 'awaiting_assurance' || state.install_started === true) return false;
  const receipt = await verifyRetargetHandoffProof(root, operation, prior);
  if (!receipt || receipt.evidence_digest !== prior.evidence_digest || receipt.handoff_digest !== prior.handoff_digest)
    throw new Error('Prepared native retarget custody no longer matches its exact receipt.');
  return true;
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {ServiceOperationCustodyRow} row @returns {Promise<ServiceOperationProof>} */
async function verifyReleaseCustodyReconcileProof(root, operation, kind, state, row) {
  if (kind === 'release-pack-worker' && row.phase !== 'terminal') {
    const retargeted = await verifyRetargetedPackTerminalProof(root, operation, row);
    if (retargeted) return retargeted;
  }
  if (
    kind === 'release-worker' &&
    row.handoff_digest !== null &&
    state.status === 'awaiting_assurance' &&
    state.install_started !== true
  ) {
    const retargeted = await verifyRetargetHandoffProof(root, operation, row);
    if (retargeted?.handoff_digest === row.handoff_digest) return retargeted;
    throw new Error('Same-operation native retarget receipt no longer matches UNKNOWN custody.');
  }
  return verifyReleaseOperationProof(root, operation, kind, state);
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {string} requestDigest @param {ServiceOperationCustodyApi} api @param {string} relative @param {string} workspaceId @param {ReleaseDatabaseHolder} databaseHolder */
async function reconcileReleaseCustody(
  root,
  operation,
  kind,
  state,
  requestDigest,
  api,
  relative,
  workspaceId,
  databaseHolder,
) {
  const sourceDatabase = requireReleaseDatabase(databaseHolder);
  databaseHolder.value = undefined;
  const prior = await api.reconcileServiceOperationCustody(
    sourceDatabase,
    root,
    relative,
    workspaceId,
    kind,
    operation,
    requestDigest,
    (row) => verifyReleaseCustodyReconcileProof(root, operation, kind, state, row),
  );
  if (prior.phase === 'terminal')
    return { prior, database: undefined, terminal: releaseState(journalFile(root, operation)) };
  if (prior.phase !== 'prepared') throw new Error('Same-operation release remains UNKNOWN.');
  return {
    prior,
    database: api.openServiceOperationDatabase(root, relative, workspaceId),
    terminal: null,
  };
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {string} requestDigest @param {ServiceOperationCustodyApi} api @param {string} relative @param {string} workspaceId @param {ReleaseDatabaseHolder} databaseHolder @returns {Promise<ValidatedReleaseCustody>} */
async function validateExistingReleaseCustody(
  root,
  operation,
  kind,
  state,
  requestDigest,
  api,
  relative,
  workspaceId,
  databaseHolder,
) {
  let prior = api.readServiceOperationCustodyForOperation(
    requireReleaseDatabase(databaseHolder),
    workspaceId,
    operation,
  );
  if (!prior) return { prior: null, database: databaseHolder.value, terminal: null };
  if (prior.owner_kind !== kind)
    return advancePackCustodyToRelease(
      root,
      operation,
      kind,
      state,
      requestDigest,
      prior,
      api,
      relative,
      workspaceId,
      databaseHolder,
    );
  if (prior.request_digest !== requestDigest) throw new Error('Release operation request differs from custody.');
  if (prior.phase === 'launching')
    return reconcileReleaseCustody(
      root,
      operation,
      kind,
      state,
      requestDigest,
      api,
      relative,
      workspaceId,
      databaseHolder,
    );
  const terminal = await verifyTerminalReleaseCustody(root, operation, kind, state, prior);
  if (terminal) return { prior, database: databaseHolder.value, terminal };
  if (prior.phase === 'in_flight' || prior.phase === 'unknown')
    return reconcileReleaseCustody(
      root,
      operation,
      kind,
      state,
      requestDigest,
      api,
      relative,
      workspaceId,
      databaseHolder,
    );
  await verifyPreparedReleaseCustody(root, operation, kind, state, prior);
  return { prior, database: databaseHolder.value, terminal: null };
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {string} requestDigest @param {ServiceOperationCustodyRow} prior @param {ServiceOperationCustodyApi} api @param {string} relative @param {string} workspaceId @param {ReleaseDatabaseHolder} databaseHolder @returns {Promise<ValidatedReleaseCustody>} */
async function advancePackCustodyToRelease(
  root,
  operation,
  kind,
  state,
  requestDigest,
  prior,
  api,
  relative,
  workspaceId,
  databaseHolder,
) {
  if (prior.owner_kind !== 'release-pack-worker' || kind !== 'release-worker')
    throw new Error('Release operation is owned by another worker phase; preserve its exact operation.');
  if (!['in_flight', 'unknown', 'terminal'].includes(prior.phase))
    throw new Error('Release pack phase is not eligible for native handoff; preserve UNKNOWN.');
  const sourceDatabase = requireReleaseDatabase(databaseHolder);
  databaseHolder.value = undefined;
  if (prior.phase === 'in_flight' || prior.phase === 'unknown') {
    await api.reconcileServiceOperationCustody(
      sourceDatabase,
      root,
      relative,
      workspaceId,
      'release-pack-worker',
      operation,
      prior.request_digest,
      async (row) => {
        const retargeted = await verifyRetargetedPackTerminalProof(root, operation, row);
        if (retargeted) return retargeted;
        return verifyReleaseOperationProof(root, operation, 'release-pack-worker', state);
      },
    );
  } else if (prior.phase === 'terminal') {
    await api.handoffServiceOperationCustody(
      sourceDatabase,
      root,
      relative,
      workspaceId,
      operation,
      prior.request_digest,
      requestDigest,
      async (row) => {
        const handoff = await verifyRetargetHandoffProof(root, operation, row);
        if (!handoff) throw new Error('Same-operation native retarget receipt is missing.');
        return handoff;
      },
    );
  }
  databaseHolder.value = api.openServiceOperationDatabase(root, relative, workspaceId);
  return validateExistingReleaseCustody(
    root,
    operation,
    kind,
    state,
    requestDigest,
    api,
    relative,
    workspaceId,
    databaseHolder,
  );
}

/** @param {string} root @param {string} operation @param {ReleaseJournalState} state @returns {ServiceOperationProof} */
function assertInitialPackImage(root, operation, state) {
  const preparedState = preparedRunningReleaseImage(state);
  const folder = path.join(root, '.tmp/releases', operation);
  const expectedArchive = path.join(folder, `${manifest(root).value.name}-${preparedState.version}.tgz`);
  const pending = releaseState(path.join(root, '.agent/work/agent-local-release/pending.json'));
  const preparation = readReleasePreparation(root, preparedState);
  const preparedKeys = ['operation_id', 'schema', 'status', 'version'];
  if (
    preparedState.status !== 'awaiting_assurance' ||
    Object.keys(preparedState).sort().join(',') !== preparedKeys.join(',') ||
    json(pending) !== json(preparedState) ||
    manifest(root).value.version !== preparedState.version ||
    preparation === null ||
    existsSync(path.join(folder, 'pack.json')) ||
    existsSync(expectedArchive)
  )
    throw new Error('Release pack operation lacks its exact prepared no-effect journal; preserve UNKNOWN.');
  return { phase: 'prepared', evidence_digest: releaseEvidenceDigest(preparedState, null) };
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof>} */
async function assertInitialInstallImage(root, operation, kind, state) {
  const preparedState = preparedRunningReleaseImage(state);
  if (
    preparedState.status !== 'awaiting_assurance' ||
    !Array.isArray(preparedState.pack_metadata) ||
    typeof preparedState.tarball_sha256 !== 'string' ||
    packedDistribution(preparedState.pack_metadata) !== 'native' ||
    preparedState.install_started === true
  )
    throw new Error('Release install operation has no custody row for its exact pre-effect image; preserve UNKNOWN.');
  const receipt = await verifyReleaseOperationProof(root, operation, kind, state);
  if (receipt.phase !== 'prepared')
    throw new Error('Release install pre-effect package receipt is not exact; preserve UNKNOWN.');
  return receipt;
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof>} */
async function assertFirstReleaseCustodyImage(root, operation, kind, state) {
  const preparedState = preparedRunningReleaseImage(state);
  if (kind === 'release-pack-worker') return verifyPackWorkerProof(root, operation, preparedState);
  if (preparedState.status === 'awaiting_assurance' && !Array.isArray(preparedState.pack_metadata))
    return assertInitialPackImage(root, operation, state);
  return assertInitialInstallImageAndRetarget(root, operation, kind, state);
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @returns {Promise<ServiceOperationProof>} */
async function assertInitialInstallImageAndRetarget(root, operation, kind, state) {
  const receipt = await assertInitialInstallImage(root, operation, kind, state);
  const archiveSha256 = requireString(state.tarball_sha256, 'Release install image has no archive digest.');
  const retarget = await verifyRetargetHandoffProof(root, operation, null);
  if (retarget && retarget.evidence_digest !== releaseEvidenceDigest(state, archiveSha256))
    throw new Error('Native retarget receipt differs from the prepared install image; preserve UNKNOWN.');
  return receipt;
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseWorkerOptions} options @param {ServiceOperationCustodyApi} api @param {ServiceOperationHandle} handle */
async function executeClaimedRelease(root, operation, kind, options, api, handle) {
  let failed = false;
  let failure;
  let result;
  try {
    result = await executeRelease({ operation, ...options });
    const receipt = await verifyReleaseOperationProof(
      root,
      operation,
      kind,
      releaseState(journalFile(root, operation)),
    );
    if (receipt.phase !== 'terminal') throw new Error('Release worker lacks an exact terminal receipt.');
    api.closeServiceOperationCustody(handle, 'terminal', receipt.evidence_digest);
  } catch (error) {
    failed = true;
    failure = error;
    try {
      api.closeServiceOperationCustody(handle, 'unknown', null);
    } catch (closeError) {
      failure = new AggregateError([failure, closeError], 'Release operation and UNKNOWN custody close failed.');
    }
  } finally {
    try {
      api.closeServiceOperationCustodyHandle(handle);
    } catch (closeError) {
      failure = failed
        ? new AggregateError([failure, closeError], 'Release operation custody cleanup failed.')
        : closeError;
      failed = true;
    }
  }
  if (failed) throw failure;
  return result;
}

/** @param {() => unknown | Promise<unknown>} operation @param {() => void} cleanup @param {string} message */
/** @template T @param {() => T | Promise<T>} operation @param {() => void} cleanup @param {string} message @returns {Promise<Awaited<T>>} */
async function withPreservedCleanup(operation, cleanup, message) {
  let failed = false;
  let failure;
  let result;
  try {
    result = { value: await operation() };
  } catch (error) {
    failed = true;
    failure = error;
  }
  try {
    cleanup();
  } catch (cleanupError) {
    failure = failed ? new AggregateError([failure, cleanupError], message) : cleanupError;
    failed = true;
  }
  if (failed) throw failure;
  return requireCleanupResult(result);
}

/** @template T @param {() => T} operation @param {() => void} cleanup @param {string} message @returns {T} */
function withPreservedSyncCleanup(operation, cleanup, message) {
  let failed = false;
  let failure;
  let result;
  try {
    result = { value: operation() };
  } catch (error) {
    failed = true;
    failure = error;
  }
  try {
    cleanup();
  } catch (cleanupError) {
    failure = failed ? new AggregateError([failure, cleanupError], message) : cleanupError;
    failed = true;
  }
  if (failed) throw failure;
  return requireCleanupResult(result);
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseWorkerOptions} options */
async function runInitializedReleaseWorker(root, operation, kind, options) {
  const initialized = initializedReleaseCustody(root);
  if (!initialized) return null;
  if (options.packOnly && options.distribution !== 'npm')
    throw new Error('SDK package workers require the explicit --pack-npm operation.');
  const { api, relative, workspace_id: workspaceId } = initialized;
  const state = releaseState(journalFile(root, operation));
  if (state.operation_id !== operation) throw new Error('Release operation identity differs.');
  const requestDigest = releaseOperationRequestDigest(kind, state, options);
  const databaseHolder = { value: api.openServiceOperationDatabase(root, relative, workspaceId) };
  return withPreservedCleanup(
    async () => {
      api.assertServiceOperationCustodyReady(requireReleaseDatabase(databaseHolder));
      if (options.reservedPid === undefined)
        throw new Error('Initialized release workers require a persisted one-shot launch reservation.');
      return claimReservedInitializedRelease(
        root,
        operation,
        kind,
        options,
        state,
        requestDigest,
        initialized,
        databaseHolder,
      );
    },
    () => {
      if (databaseHolder.value) api.closeServiceOperationDatabase(databaseHolder.value);
    },
    'Initialized release custody operation and database close failed.',
  );
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseWorkerOptions} options @param {ReleaseJournalState} state @param {string} requestDigest @param {InitializedReleaseCustody} initialized @param {ReleaseDatabaseHolder} databaseHolder */
async function claimReservedInitializedRelease(
  root,
  operation,
  kind,
  options,
  state,
  requestDigest,
  initialized,
  databaseHolder,
) {
  const { api, workspace_id: workspaceId } = initialized;
  const { reservedPid, launchCapability } = requireReleaseLaunchReservation(options);
  if (kind === 'release-worker' && !Array.isArray(preparedRunningReleaseImage(state).pack_metadata))
    throw new Error('Reserved release worker lacks the exact native prepared retarget image.');
  const prior = api.readServiceOperationCustodyForOperation(
    requireReleaseDatabase(databaseHolder),
    workspaceId,
    operation,
  );
  if (!matchesReleaseLaunchReservation(prior, kind, requestDigest, reservedPid, launchCapability, api))
    throw new Error('Initialized worker does not match its persisted one-shot launch reservation.');
  /** @type {ServiceOperationCustodyRow} */
  const preparedPrior = { ...prior, phase: 'prepared' };
  const receipt = await verifyPreparedReleaseCustodyProof(root, operation, kind, state, preparedPrior);
  if (receipt.evidence_digest !== prior.evidence_digest)
    throw new Error('Initialized worker prepared image differs from its launch reservation.');
  const handle = api.claimReservedServiceOperationLaunch(
    requireReleaseDatabase(databaseHolder),
    workspaceId,
    kind,
    operation,
    requestDigest,
    reservedPid,
    launchCapability,
  );
  databaseHolder.value = undefined;
  return executeClaimedRelease(root, operation, kind, options, api, handle);
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseWorkerOptions} options @param {readonly string[]} args @param {string} folder */
async function reserveInitializedReleaseWorker(root, operation, kind, options, args, folder) {
  const initialized = initializedReleaseCustody(root);
  if (!initialized) return null;
  if (options.packOnly && options.distribution !== 'npm')
    throw new Error('SDK package workers require the explicit --pack-npm operation.');
  const prepared = await readPreparedInitializedReleaseImage(root, operation, kind, options, initialized);
  if (prepared.result) return prepared.result;
  return withReleaseAdmission(root, () =>
    launchReservedInitializedReleaseWorker(root, operation, kind, options, args, folder, initialized, prepared),
  );
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseWorkerOptions} options @param {InitializedReleaseCustody} initialized @returns {Promise<PreparedReleaseLaunch>} */
async function readPreparedInitializedReleaseImage(root, operation, kind, options, initialized) {
  const { api, relative, workspace_id: workspaceId } = initialized;
  const state = releaseState(journalFile(root, operation));
  if (state.operation_id !== operation) throw new Error('Release operation identity differs.');
  const requestDigest = releaseOperationRequestDigest(kind, state, options);
  const databaseHolder = { value: api.openServiceOperationDatabase(root, relative, workspaceId) };
  return withPreservedCleanup(
    async () => {
      api.assertServiceOperationCustodyReady(requireReleaseDatabase(databaseHolder));
      const issued = api.readServiceOperationCustodyForOperation(
        requireReleaseDatabase(databaseHolder),
        workspaceId,
        operation,
      );
      const existingLaunch = inspectIssuedReleaseLaunch(issued, kind, requestDigest);
      if (existingLaunch) return existingLaunch;
      const custody = await validateExistingReleaseCustody(
        root,
        operation,
        kind,
        state,
        requestDigest,
        api,
        relative,
        workspaceId,
        databaseHolder,
      );
      if (custody.terminal) return { result: custody.terminal };
      databaseHolder.value = requireReleaseDatabase(
        { value: custody.database },
        'Prepared release custody database is unavailable.',
      );
      const proof = await preparedReleaseLaunchProof(root, operation, kind, state, custody.prior);
      if (kind === 'release-worker' && !Array.isArray(state.pack_metadata))
        throw new Error('Release install worker requires the exact native prepared retarget image.');
      return { state, requestDigest, proof };
    },
    () => {
      if (databaseHolder.value) api.closeServiceOperationDatabase(databaseHolder.value);
    },
    'Prepared release custody read and database close failed.',
  );
}

/** @param {ServiceOperationCustody | null} issued @param {ReleaseWorkerKind} kind @param {string} requestDigest */
function inspectIssuedReleaseLaunch(issued, kind, requestDigest) {
  // A launch row never authorizes a second spawn. Reconcile it under storage
  // exclusion; process liveness is not evidence of effect or no effect.
  if (issued?.phase !== 'launching') return null;
  if (issued.owner_kind !== kind || issued.request_digest !== requestDigest)
    throw new Error('Release launch reservation differs; preserve its exact operation.');
  return null;
}

/** @param {unknown} error */
function isSqliteBusy(error) {
  return (
    error !== null &&
    typeof error === 'object' &&
    (('errcode' in error && error.errcode === 5) || ('code' in error && error.code === 'SQLITE_BUSY'))
  );
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseJournalState} state @param {ServiceOperationCustody | null} prior */
async function preparedReleaseLaunchProof(root, operation, kind, state, prior) {
  const proof = prior
    ? await verifyPreparedReleaseCustodyProof(root, operation, kind, state, prior)
    : await assertFirstReleaseCustodyImage(root, operation, kind, state);
  if (prior && proof.evidence_digest !== prior.evidence_digest)
    throw new Error('Prepared release custody differs from its exact beforeimage.');
  return proof;
}

/** @param {string} root @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseWorkerOptions} options @param {readonly string[]} args @param {string} folder @param {InitializedReleaseCustody} initialized @param {Awaited<ReturnType<typeof readPreparedInitializedReleaseImage>>} prepared */
function launchReservedInitializedReleaseWorker(root, operation, kind, options, args, folder, initialized, prepared) {
  const { api, relative, workspace_id: workspaceId } = initialized;
  const { state, requestDigest, proof } = prepared;
  const current = releaseState(journalFile(root, operation));
  if (
    current.operation_id !== operation ||
    releaseOperationRequestDigest(kind, current, options) !== requestDigest ||
    current.status !== state.status
  )
    throw new Error('Release operation changed before its one-shot worker reservation.');
  const reservationDatabase = api.openServiceOperationDatabase(root, relative, workspaceId);
  return withPreservedSyncCleanup(
    () => {
      const reservation = api.reserveServiceOperationLaunch(
        reservationDatabase,
        workspaceId,
        kind,
        operation,
        requestDigest,
        proof.evidence_digest,
      );
      const worker = spawnInitializedReleaseChild(root, operation, args, folder, reservation.child_capability);
      const pid = requireSpawnedChildPid(worker.pid);
      api.recordServiceOperationLaunchPid(
        reservationDatabase,
        workspaceId,
        kind,
        operation,
        requestDigest,
        reservation.revision,
        pid,
        reservation.child_capability,
      );
      const running = {
        ...current,
        pid,
        launch_source_status: current.status,
        status: 'running',
      };
      save(journalFile(root, operation), running);
      worker.unref();
      return running;
    },
    () => api.closeServiceOperationDatabase(reservationDatabase),
    'Release launch, running journal, and database close failed.',
  );
}

/** @param {string} root @param {string} operation @param {readonly string[]} args @param {string} folder @param {string} childCapability */
function spawnInitializedReleaseChild(root, operation, args, folder, childCapability) {
  const output = openSync(path.join(folder, 'worker.log'), 'a');
  const worker = withPreservedSyncCleanup(
    () => {
      const workerKind =
        args[0] === '--pack-npm'
          ? '--initialized-pack-npm-worker'
          : args[0] === '--pack'
            ? '--initialized-pack-worker'
            : '--initialized-worker';
      return spawn(process.execPath, [fileURLToPath(import.meta.url), workerKind, operation], {
        cwd: root,
        env: { ...process.env, [childCapabilityEnvironmentKey]: childCapability },
        detached: true,
        windowsHide: true,
        stdio: ['ignore', output, output],
      });
    },
    () => closeSync(output),
    'Release worker spawn and log close failed.',
  );
  if (!worker.pid) {
    worker.on('error', () => {});
    throw new Error('Release worker launch is ambiguous; preserve its one-shot reservation.');
  }
  return worker;
}

/** @param {string} operation @param {string} workerKind */
async function runReleaseWorkerEntry(operation, workerKind) {
  const initializedWorker = workerKind.startsWith('--initialized-');
  const logicalKind = initializedWorker ? '-' + workerKind.slice('--initialized'.length) : workerKind;
  const kind = logicalKind === '--pack-npm-worker' ? 'release-pack-worker' : 'release-worker';
  const options = await releaseWorkerOptions(logicalKind);
  if (initializedWorker) {
    options.launchCapability = process.env[childCapabilityEnvironmentKey];
    delete process.env[childCapabilityEnvironmentKey];
    return runReservedReleaseWorkerEntry(operation, kind, options);
  }
  if (initializedReleaseCustody(repositoryRoot) !== null)
    throw new Error('Initialized release workers require a persisted one-shot launch reservation.');
  return runLegacyReleaseWorker(operation, options);
}

/** @param {string} workerKind */
/** @param {string} workerKind @returns {Promise<ReleaseWorkerOptions>} */
async function releaseWorkerOptions(workerKind) {
  const { verifyLocalReleaseAssurance, verifyLocalReleaseTests } = await import('./release-assurance.mjs');
  return {
    packOnly: workerKind !== '--worker',
    distribution: workerKind === '--pack-npm-worker' ? 'npm' : workerKind === '--pack-worker' ? 'native' : undefined,
    qualify: workerKind === '--worker' ? verifyLocalReleaseAssurance : verifyLocalReleaseTests,
  };
}

/** @param {string} operation @param {ReleaseWorkerOptions} options */
async function runLegacyReleaseWorker(operation, options) {
  void options;
  return claimReleaseWorker(repositoryRoot, operation, process.pid);
}

/** @param {string} operation @param {ReleaseWorkerKind} kind @param {ReleaseWorkerOptions} options */
async function runReservedReleaseWorkerEntry(operation, kind, options) {
  if (typeof options.launchCapability !== 'string')
    throw new Error('Initialized release worker has no private launch capability; preserve its reservation.');
  let admitted = false;
  let lastBusy;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await withReleaseAdmission(repositoryRoot, () => {
        const current = releaseState(journalFile(repositoryRoot, operation));
        if (current.operation_id !== operation || current.pid !== process.pid || current.status !== 'running')
          throw new Error('Initialized worker process differs from its persisted release launch.');
      });
      admitted = true;
      break;
    } catch (error) {
      if (!isSqliteBusy(error)) throw error;
      lastBusy = error;
      if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  if (!admitted)
    throw new Error('Initialized release worker admission remains ambiguous; preserve its one-shot reservation.', {
      cause: lastBusy,
    });
  options.reservedPid = process.pid;
  const result = await runInitializedReleaseWorker(repositoryRoot, operation, kind, options);
  if (result === null)
    throw new Error('Initialized workspace admission disappeared before the reserved worker claimed it.');
  return result;
}

/** @param {readonly string[]} args @param {string} operation @param {string} folder */
async function reserveOrRunReleaseEntry(args, operation, folder) {
  const { verifyLocalReleaseAssurance, verifyLocalReleaseTests } = await import('./release-assurance.mjs');
  const kind = args[0] === '--pack-npm' || args[0] === '--pack' ? 'release-pack-worker' : 'release-worker';
  const options = {
    packOnly: args[0] !== '--operation',
    distribution: args[0] === '--pack-npm' ? 'npm' : args[0] === '--pack' ? 'native' : undefined,
    qualify: args[0] === '--operation' ? verifyLocalReleaseAssurance : verifyLocalReleaseTests,
  };
  const initialized = await reserveInitializedReleaseWorker(repositoryRoot, operation, kind, options, args, folder);
  if (initialized !== null) return initialized;
  return reserveReleaseWorker(repositoryRoot, operation, () => {
    const output = openSync(path.join(folder, 'worker.log'), 'a');
    const worker = spawn(
      process.execPath,
      [
        fileURLToPath(import.meta.url),
        args[0] === '--pack-npm' ? '--pack-npm-worker' : args[0] === '--pack' ? '--pack-worker' : '--worker',
        operation,
      ],
      {
        cwd: repositoryRoot,
        env: process.env,
        detached: true,
        windowsHide: true,
        stdio: ['ignore', output, output],
      },
    );
    closeSync(output);
    if (!worker.pid) {
      worker.on('error', () => {});
      throw new Error('Release worker did not start.');
    }
    worker.unref();
    return worker.pid;
  });
}
/** @param {unknown} value @returns {value is PackageManifestRecord} */
function isPackageManifestRecord(value) {
  if (
    !isRecord(value) ||
    value.name !== 'vida-agent' ||
    !isRecord(value.bin) ||
    value.bin['vida-agent'] !== './bin/vida-agent.mjs' ||
    !isRecord(value.engines) ||
    value.engines.bun !== '1.4.2' ||
    value.packageManager !== 'bun@1.4.2' ||
    typeof value.version !== 'string' ||
    parseReleaseVersion(value.version) === null
  )
    return false;
  return true;
}

/** @param {string} root @returns {{file: string, value: PackageManifestRecord}} */
function manifest(root) {
  const file = path.join(root, 'packages/agent/package.json');
  const value = read(file);
  if (!isPackageManifestRecord(value))
    throw new Error('Local release requires vida-agent with a valid MAJOR.MINOR.PATCH version and Bun 1.4.2.');
  return { file, value };
}
/** @param {string} left @param {string} right @returns {-1|0|1} */
function compareVersions(left, right) {
  const a = parseReleaseVersion(left),
    b = parseReleaseVersion(right);
  if (!a || !b) throw new Error('Version must use valid MAJOR.MINOR.PATCH form.');
  /** @type {Array<keyof typeof a>} */
  const components = ['major', 'minor', 'patch'];
  for (const component of components) {
    if (a[component] !== b[component]) return a[component] < b[component] ? -1 : 1;
  }
  return 0;
}
/** @param {number} component @param {string} name @returns {number} */
function increment(component, name) {
  if (component === Number.MAX_SAFE_INTEGER) throw new Error(`${name} version component exceeds integer bound.`);
  return component + 1;
}
/** @param {string} current @param {string|null|undefined} successful @param {ReleaseVersionSelection} [selection] @returns {string} */
export function candidateVersion(current, successful, selection = { mode: 'patch' }) {
  if (!parseReleaseVersion(current)) throw new Error('Candidate version must use valid MAJOR.MINOR.PATCH form.');
  const baseline = successful ?? current;
  const base = parseReleaseVersion(baseline);
  if (!base) throw new Error('Successful version must use valid MAJOR.MINOR.PATCH form.');
  if (selection?.mode === 'exact') {
    if (!parseReleaseVersion(selection.version) || compareVersions(selection.version, baseline) <= 0)
      throw new Error('Requested version must be valid MAJOR.MINOR.PATCH and higher than the confirmed baseline.');
    return selection.version;
  }
  const mode = selection?.mode ?? 'patch';
  if (mode === 'patch' && !successful) return current;
  if (mode === 'patch') return `${base.major}.${base.minor}.${increment(base.patch, 'Patch')}`;
  if (mode === 'minor') return `${base.major}.${increment(base.minor, 'Minor')}.0`;
  if (mode === 'major') return `${increment(base.major, 'Major')}.0.0`;
  throw new Error('Version selection must be patch, minor, major or exact.');
}
/** @param {{version: string}|null|undefined} successful @param {{version: string}|null|undefined} formation @returns {{version: string}|null} */
export function confirmedVersionBaseline(successful, formation) {
  if (!successful) return formation ?? null;
  if (!formation) return successful;
  return compareVersions(formation.version, successful.version) > 0 ? formation : successful;
}
/** @param {{operation_id:string,version:string}|null|undefined} pending @param {{operation_id:string}|null|undefined} successful @param {ReleaseVersionSelection} [selection] @param {{operation_id:string}|null} [dispositionReceipt] @param {unknown} [preparedFrom] */
function pendingBuildRetry(pending, successful, selection = { mode: 'patch' }, dispositionReceipt, preparedFrom) {
  if (
    !pending ||
    pending.operation_id === successful?.operation_id ||
    dispositionReceipt?.operation_id === pending.operation_id
  )
    return null;
  const sameOverride =
    preparedFrom != null &&
    ['minor', 'major'].includes(selection.mode) &&
    candidateVersion(
      requireString(preparedFrom, 'Candidate version must use valid MAJOR.MINOR.PATCH form.'),
      undefined,
      selection,
    ) === pending.version;
  if (
    (selection.mode === 'exact' && selection.version !== pending.version) ||
    (selection.mode !== 'exact' && (selection.mode !== 'patch' || selection.explicit) && !sameOverride)
  )
    throw new Error(
      'Pending build retains its version; use an exact matching retry or supported disposition before selecting another version.',
    );
  return pending;
}
/** @param {readonly string[]} args @returns {ReleaseVersionSelection} */
export function parseVersionSelection(args) {
  if (args.length === 0) return { mode: 'patch', explicit: false };
  if (args.length === 1 && args[0] === '--minor') return { mode: 'minor', explicit: true };
  if (args.length === 1 && args[0] === '--major') return { mode: 'major', explicit: true };
  if (args.length === 2 && args[0] === '--version') {
    const version = requireString(args[1], 'Requested version must use valid MAJOR.MINOR.PATCH form.');
    if (!parseReleaseVersion(version)) throw new Error('Requested version must use valid MAJOR.MINOR.PATCH form.');
    return { mode: 'exact', version, explicit: true };
  }
  throw new Error('Choose at most one version override: --minor, --major or --version X.Y.Z.');
}
/** @param {readonly string[]} args @returns {{proposalPath: string, selection: ReleaseVersionSelection}} */
export function parseDispositionPreparationArgs(args) {
  if (!Array.isArray(args) || args.length < 2 || args[0] !== '--proposal')
    throw new Error(
      'Usage: release:local -- --prepare-after-disposition --proposal REL ' + '[--minor | --major | --version X.Y.Z]',
    );
  if (typeof args[1] !== 'string' || args[1].startsWith('--'))
    throw new Error('Disposition proposal must use a safe relative file path.');
  return {
    proposalPath: releaseRelative(args[1]),
    selection: parseVersionSelection(args.slice(2)),
  };
}
/** @param {string} root @param {string} relative @returns {unknown} */
export function readDispositionProposal(root, relative) {
  const file = releasePath(root, releaseRelative(relative));
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > 8 * 1024 * 1024)
    throw new Error('Disposition proposal file is unsafe.');
  const bytes = readFileSync(file);
  const current = lstatSync(file);
  if (
    bytes.length > 8 * 1024 * 1024 ||
    !current.isFile() ||
    current.isSymbolicLink() ||
    current.nlink !== 1 ||
    current.dev !== stat.dev ||
    current.ino !== stat.ino ||
    current.size !== stat.size ||
    current.mtimeMs !== stat.mtimeMs ||
    current.ctimeMs !== stat.ctimeMs
  )
    throw new Error('Disposition proposal changed or is unsafe.');
  const proposal = parseJson(bytes.toString('utf8'));
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal))
    throw new Error('Disposition proposal must be a JSON object.');
  return proposal;
}
const terminalConclusions = new Set([
  'success',
  'failure',
  'cancelled',
  'timed_out',
  'action_required',
  'neutral',
  'stale',
  'skipped',
  'startup_failure',
]);
const commitPattern = /^[a-f0-9]{40,64}$/;
/** @template T @param {readonly T[]} values @returns {T[]} */
function sorted(values) {
  return values.slice().sort((left, right) => String(left).localeCompare(String(right)));
}
/** @param {unknown} left @param {unknown} right @returns {boolean} */
function sameIds(left, right) {
  return Array.isArray(left) && Array.isArray(right) && JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));
}
/** @param {ReleaseDispositionCensusInput} input @returns {ReleaseDispositionClassification} */
export function classifyReleaseDispositionCensus({ operation_id, version, request_ids, actual_census }) {
  try {
    if (
      !idPattern.test(operation_id ?? '') ||
      !parseReleaseVersion(version) ||
      !Array.isArray(request_ids) ||
      request_ids.length === 0 ||
      new Set(request_ids).size !== request_ids.length ||
      !actual_census ||
      actual_census.operation_id !== operation_id ||
      actual_census.version !== version ||
      !Number.isFinite(Date.parse(actual_census.observed_at)) ||
      !Array.isArray(actual_census.requests)
    )
      throw new Error('disposition census identity or observation is incomplete');
    const rows = actual_census.requests;
    if (
      rows.some((row) => !row || typeof row.request_id !== 'string') ||
      new Set(rows.map((row) => row.request_id)).size !== rows.length ||
      !sameIds(
        rows.map((row) => row.request_id),
        request_ids,
      )
    )
      throw new Error('disposition census request set differs');
    const allRunIds = new Set();
    let successCount = 0,
      failureCount = 0,
      noIssueCount = 0;
    const requests = rows.map((row) => {
      if (!Array.isArray(row.runs) || !Array.isArray(row.references))
        throw new Error('disposition request observation is incomplete');
      const noIssueReferencePaths = requireStringArray(
        row.no_issue_reference_paths ?? [],
        'disposition no-issue reference set is invalid',
      );
      if (row.no_issue === true) {
        if (row.runs.length !== 0 || row.source_commit !== null)
          throw new Error('no-issue request has provider effects or a source commit');
        noIssueCount++;
        return {
          request_id: row.request_id,
          no_issue: true,
          source_commit: null,
          references: sorted(row.references),
          no_issue_reference_paths: sorted(noIssueReferencePaths),
          runs: [],
        };
      }
      if (row.runs.length === 0) throw new Error('disposition request lacks its terminal run');
      /** @type {Set<string>} */
      const sourceCommits = new Set();
      const runs = row.runs.map((run) => {
        const sourceCommit = run?.source_commit ?? row.source_commit;
        if (
          !run ||
          run.kind !== 'ACTUAL_PROVIDER_OBSERVATION' ||
          run.status !== 'completed' ||
          !terminalConclusions.has(run.conclusion) ||
          typeof run.run_id !== 'string' ||
          !/^\d+$/.test(run.run_id) ||
          !Number.isSafeInteger(run.run_attempt) ||
          run.run_attempt < 1 ||
          !commitPattern.test(sourceCommit ?? '') ||
          !commitPattern.test(run.head_sha ?? '') ||
          run.head_sha !== sourceCommit ||
          !Number.isSafeInteger(run.repository_id) ||
          run.repository_id < 1 ||
          !Number.isSafeInteger(run.workflow_id) ||
          run.workflow_id < 1 ||
          allRunIds.has(run.run_id)
        )
          throw new Error('disposition contains an unknown, foreign, duplicate or nonterminal provider run');
        allRunIds.add(run.run_id);
        sourceCommits.add(sourceCommit);
        if (run.conclusion === 'success') successCount++;
        else failureCount++;
        return {
          run_id: run.run_id,
          run_attempt: run.run_attempt,
          status: run.status,
          conclusion: run.conclusion,
          repository_id: run.repository_id,
          workflow_id: run.workflow_id,
          head_sha: run.head_sha,
          source_commit: sourceCommit,
          dispatch_reference_path: run.dispatch_reference_path ?? null,
        };
      });
      return {
        request_id: row.request_id,
        no_issue: false,
        source_commit: onlySetValue(sourceCommits),
        references: sorted(row.references),
        no_issue_reference_paths: sorted(noIssueReferencePaths),
        runs,
      };
    });
    return {
      status: 'eligible',
      operation_id,
      version,
      request_count: rows.length,
      terminal_success_count: successCount,
      terminal_failure_count: failureCount,
      no_issue_count: noIssueCount,
      requests,
    };
  } catch (error) {
    return { status: 'blocked', blockers: [errorMessage(error)] };
  }
}

/** @param {{references?: Array<{path:string}>}} requestRow @param {{references?: Array<{path?:string}|string>}} observationRow @returns {string[]} */
function referencePaths(requestRow, observationRow) {
  const census = requestRow.references?.map((reference) => reference?.path);
  const observed = observationRow.references?.map((reference) =>
    typeof reference === 'string' ? reference : reference?.path,
  );
  if (
    !Array.isArray(census) ||
    !Array.isArray(observed) ||
    census.some((value) => typeof value !== 'string') ||
    observed.some((value) => typeof value !== 'string') ||
    new Set(census).size !== census.length ||
    new Set(observed).size !== observed.length ||
    !sameIds(census, observed)
  )
    throw new Error('disposition request references differ from observed references');
  return census;
}

/** @param {string} root @param {string} request @param {string} relative @returns {unknown} */
/** @param {string} root @param {CIDeliveryRequest} request @param {string} relative @returns {{reference_path:string,request_id:string,source_commit:string,repository_id:number,workflow_id:number,issued_at:string,prior_run_ids:string[],known_run_id:string|null}} */
function readIssuedDispatchIntent(root, request, relative) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('disposition reference is unsafe');
  const value = requireJsonRecord(parseJson(readFileSync(file, 'utf8')), 'issued dispatch reference is not an object');
  if (value?.status !== 'ISSUED_ONCE') throw new Error('issued dispatch reference is not retained as issued');
  assertCIDeliveryRequest(value.request);
  if (json(value.request) !== json(request)) throw new Error('disposition retained request differs');
  if (value.formation_only !== true || value.installed_update !== false)
    throw new Error('dispatch intent is not a formation-only request');
  if (!isRecord(value.profile) || !isRecord(value.profile.github))
    throw new Error('retained dispatch profile is incomplete');
  const profile = value.profile;
  const github = value.profile.github;
  const sourceCommit = requireCommit(
    value.source_commit ?? github?.source_commit,
    'retained dispatch intent lacks a valid source, issue time or prior run set',
  );
  const repositoryId = requirePositiveSafeInteger(
    github?.repository_id,
    'retained dispatch intent lacks a valid source, issue time or prior run set',
  );
  const workflowId = requirePositiveSafeInteger(
    github?.workflow_id,
    'retained dispatch intent lacks a valid source, issue time or prior run set',
  );
  const priorRunIds = normalizePriorRunIds(
    value.prior_run_ids,
    'retained dispatch intent lacks a valid source, issue time or prior run set',
  );
  const issuedAt = parseDispatchTimestamp(
    value.issued_at,
    'retained dispatch intent lacks a valid source, issue time or prior run set',
  );
  const knownRunId = normalizeProviderRunId(
    value.actual_terminal_run_id ?? value.terminal_run_id ?? value.provider_run_id,
    'retained dispatch intent lacks a valid source, issue time or prior run set',
  );
  if (
    profile?.issuer !== 'github-actions' ||
    profile.repository_id !== request.repository_id ||
    JSON.stringify(profile.project_ids) !== JSON.stringify(request.project_ids) ||
    profile.target !== request.target ||
    typeof github.repository !== 'string' ||
    github.repository.length === 0
  )
    throw new Error('retained dispatch profile differs from the exact request identity');
  if (value.source_commit && github?.source_commit && value.source_commit !== github.source_commit)
    throw new Error('dispatch intent source commit differs from its published profile');
  return {
    reference_path: relative,
    request_id: request.request_id,
    source_commit: sourceCommit,
    repository_id: repositoryId,
    workflow_id: workflowId,
    issued_at: new Date(issuedAt).toISOString(),
    prior_run_ids: priorRunIds,
    known_run_id: knownRunId,
  };
}

/** @param {{request:CIDeliveryRequest,reference_path:string,value:unknown,related_profiles:unknown[]}} input */
export function normalizeLegacyReleaseDispatchIntent({ request, reference_path, value, related_profiles }) {
  if (!isRecord(value)) throw new Error('legacy dispatch intent is not an object');
  if (value.status !== 'issued-once-no-automatic-retry' || !isSafeIntegerNumber(value.workflow_id))
    throw new Error('legacy dispatch intent is not a retained single issue');
  if (!isRecord(value.dispatch) || !isRecord(value.dispatch.inputs))
    throw new Error('legacy dispatch intent has no retained request');
  const encodedRequest = value.dispatch.inputs.request;
  let retainedRequest;
  try {
    retainedRequest = typeof encodedRequest === 'string' ? parseJson(encodedRequest) : null;
  } catch {
    throw new Error('legacy dispatch intent request is malformed');
  }
  assertCIDeliveryRequest(retainedRequest);
  if (json(retainedRequest) !== json(request)) throw new Error('legacy dispatch request differs from its owner');
  const sourceCommit = requireCommit(
    value.dispatch.inputs.source_commit,
    'legacy dispatch intent lacks a valid source, issue time or earlier run set',
  );
  const exclusionFields = ['previous_failed_run', 'prior_failed_run'].filter((field) => value[field] !== undefined);
  if (exclusionFields.length > 1 || (value.earlier_run_ids !== undefined && exclusionFields.length))
    throw new Error('legacy dispatch intent has conflicting prior run fields');
  const exclusionField = exclusionFields[0];
  const priorRunIds = normalizePriorRunIds(
    value.earlier_run_ids ?? (exclusionField !== undefined ? [value[exclusionField]] : null),
    'legacy dispatch intent lacks a valid source, issue time or earlier run set',
  );
  const issuedAt = parseDispatchTimestamp(
    value.observed_at,
    'legacy dispatch intent lacks a valid source, issue time or earlier run set',
  );
  /** @type {Array<{repository_id:number,workflow_id:number}>} */
  const matchingProfiles = [];
  if (!Array.isArray(related_profiles)) throw new Error('legacy dispatch profile references are incomplete');
  for (const related of related_profiles) {
    if (!isRecord(related)) continue;
    if (json(related?.request) !== json(request)) continue;
    const profile = related.profile ?? related.policy;
    if (!isRecord(profile) || !isRecord(profile.github)) continue;
    const github = profile?.github;
    if (
      profile?.issuer !== 'github-actions' ||
      (!related.profile && profile.purpose !== 'formation-only') ||
      profile.repository_id !== request.repository_id ||
      JSON.stringify(profile.project_ids) !== JSON.stringify(request.project_ids) ||
      profile.target !== request.target ||
      github?.source_commit !== sourceCommit ||
      github?.workflow_id !== value.workflow_id ||
      !isSafeIntegerNumber(github?.repository_id) ||
      !isSafeIntegerNumber(github.workflow_id) ||
      typeof github.repository !== 'string' ||
      github.repository.length === 0
    )
      continue;
    matchingProfiles.push({ repository_id: github.repository_id, workflow_id: github.workflow_id });
  }
  const uniqueProfiles = new Map(matchingProfiles.map((profile) => [JSON.stringify(profile), profile]));
  if (uniqueProfiles.size !== 1) throw new Error('legacy dispatch intent lacks one retained matching source profile');
  const [profile] = uniqueProfiles.values();
  if (!profile) throw new Error('legacy dispatch intent lacks one retained matching source profile');
  const knownRunId = normalizeProviderRunId(
    value.actual_terminal_run_id ?? value.terminal_run_id ?? value.provider_run_id,
    'legacy dispatch terminal run ID is invalid',
  );
  return {
    reference_path,
    request_id: request.request_id,
    source_commit: sourceCommit,
    repository_id: profile.repository_id,
    workflow_id: profile.workflow_id,
    issued_at: new Date(issuedAt).toISOString(),
    prior_run_ids: priorRunIds,
    known_run_id: knownRunId,
  };
}

/** @param {string} root @param {CIDeliveryRequest} request @param {string} relative @param {string[]} relatedReferences */
function readLegacyDispatchIntent(root, request, relative, relatedReferences) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('legacy dispatch reference is unsafe');
  const value = parseJson(readFileSync(file, 'utf8'));
  const relatedProfiles = [];
  for (const relatedPath of relatedReferences) {
    if (relatedPath === relative) continue;
    const relatedFile = releasePath(root, relatedPath),
      relatedStat = lstatSync(relatedFile);
    if (!relatedStat.isFile() || relatedStat.size > 8 * 1024 * 1024)
      throw new Error('legacy dispatch profile reference is unsafe');
    relatedProfiles.push(parseJson(readFileSync(relatedFile, 'utf8')));
  }
  return normalizeLegacyReleaseDispatchIntent({
    request,
    reference_path: relative,
    value,
    related_profiles: relatedProfiles,
  });
}

/** @param {string} root @param {CIDeliveryRequest} request @param {string} relative @param {string[]} relatedReferences */
function readDispositionDispatchIntent(root, request, relative, relatedReferences) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  if (!stat.isFile() || stat.size > 8 * 1024 * 1024) throw new Error('dispatch reference is unsafe');
  const value = requireJsonRecord(parseJson(readFileSync(file, 'utf8')), 'dispatch reference is not an object');
  if (value.status === 'ISSUED_ONCE') return readIssuedDispatchIntent(root, request, relative);
  if (value.status === 'issued-once-no-automatic-retry')
    return readLegacyDispatchIntent(root, request, relative, relatedReferences);
  throw new Error('dispatch reference is not a supported retained issued intent');
}

/** @param {{source_commit:string,repository_id:number,workflow_id:number,prior_run_ids:string[],known_run_id:string|null}} intent @param {DispositionRunObservation & {created_at:string}} run @param {number} lowerWindow @param {number} upperWindow @returns {boolean} */
function matchesDispatchIntentRun(intent, run, lowerWindow, upperWindow) {
  const createdAt = Date.parse(run?.created_at);
  return (
    run?.kind === 'ACTUAL_PROVIDER_OBSERVATION' &&
    run?.head_sha === intent.source_commit &&
    run?.repository_id === intent.repository_id &&
    run?.workflow_id === intent.workflow_id &&
    !intent.prior_run_ids.includes(String(run.run_id)) &&
    (!intent.known_run_id || intent.known_run_id === String(run.run_id)) &&
    Number.isFinite(createdAt) &&
    createdAt >= lowerWindow &&
    createdAt <= upperWindow
  );
}

/** @param {{request_id:string,issued_intents:Array<{request_id:string,issued_at:string,reference_path:string,source_commit:string,repository_id:number,workflow_id:number,prior_run_ids:string[],known_run_id:string|null}>,runs:Array<DispositionRunObservation & {created_at:string}>,observed_at:string}} input @returns {ReleaseDispatchJoin} */
export function joinReleaseDispatchIntents({ request_id, issued_intents, runs, observed_at }) {
  try {
    if (
      typeof request_id !== 'string' ||
      !Array.isArray(issued_intents) ||
      !Array.isArray(runs) ||
      !Number.isFinite(Date.parse(observed_at))
    )
      throw new Error('dispatch join identity or observations are incomplete');
    if (issued_intents.some((intent) => intent?.request_id !== request_id))
      throw new Error('dispatch intent belongs to another request');
    const sortedIntents = issued_intents
      .map((intent) => ({ ...intent, issued_ms: Date.parse(intent.issued_at) }))
      .sort(
        (left, right) => left.issued_ms - right.issued_ms || left.reference_path.localeCompare(right.reference_path),
      );
    if (
      sortedIntents.some(
        (intent) =>
          typeof intent.reference_path !== 'string' ||
          !commitPattern.test(intent.source_commit ?? '') ||
          !Number.isSafeInteger(intent.repository_id) ||
          !Number.isSafeInteger(intent.workflow_id) ||
          !Array.isArray(intent.prior_run_ids) ||
          intent.prior_run_ids.some((id) => typeof id !== 'string' || !/^\d+$/.test(id)) ||
          new Set(intent.prior_run_ids).size !== intent.prior_run_ids.length ||
          !Number.isFinite(intent.issued_ms),
      ) ||
      new Set(sortedIntents.map((intent) => intent.reference_path)).size !== sortedIntents.length
    )
      throw new Error('dispatch intent set is invalid or duplicated');
    for (let index = 0; index < sortedIntents.length - 1; index++) {
      const current = requirePresentValue(sortedIntents[index], 'dispatch intent ordering is incomplete');
      const next = requirePresentValue(sortedIntents[index + 1], 'dispatch intent ordering is incomplete');
      if (
        current.issued_ms === next.issued_ms &&
        current.source_commit === next.source_commit &&
        current.repository_id === next.repository_id &&
        current.workflow_id === next.workflow_id &&
        (!current.known_run_id || current.known_run_id === next.known_run_id)
      )
        throw new Error('same-source dispatch intents have no unique issue-time or terminal-run binding');
    }
    const actualRunIds = runs.map((run) => String(run?.run_id));
    if (new Set(actualRunIds).size !== actualRunIds.length) throw new Error('actual provider run set is duplicated');
    /** @type {Set<string>} */
    const assignedRunIds = new Set();
    /** @type {string[]} */
    const unmatchedIntentPaths = [];
    /** @type {Array<{reference_path:string,run_id:string,source_commit:string,repository_id:number,workflow_id:number}>} */
    const assignments = [];
    const observationMs = Date.parse(observed_at);
    for (const run of runs) {
      const plausibleIntents = sortedIntents.filter((intent) =>
        matchesDispatchIntentRun(intent, run, intent.issued_ms - 5000, observationMs + 1000),
      );
      if (plausibleIntents.length > 1)
        throw new Error('actual provider run is ambiguous across issued dispatch time windows');
    }
    for (let index = 0; index < sortedIntents.length; index++) {
      const intent = requirePresentValue(sortedIntents[index], 'dispatch intent ordering is incomplete');
      // The issue record follows the dispatch call; GitHub timestamps the run at whole-second precision.
      const lowerWindow = intent.issued_ms - 5000;
      const next = sortedIntents[index + 1];
      const upperWindow = next ? next.issued_ms - 5000 : observationMs + 1000;
      const candidates = runs.filter((run) => matchesDispatchIntentRun(intent, run, lowerWindow, upperWindow));
      if (candidates.length > 1) throw new Error('dispatch intent matches more than one actual provider run');
      if (candidates.length === 0) {
        unmatchedIntentPaths.push(intent.reference_path);
        continue;
      }
      const run = requirePresentValue(candidates[0], 'dispatch intent candidate set disappeared');
      if (assignedRunIds.has(String(run.run_id)))
        throw new Error('one actual provider run matches multiple dispatch intents');
      assignedRunIds.add(String(run.run_id));
      assignments.push({
        reference_path: intent.reference_path,
        run_id: String(run.run_id),
        source_commit: intent.source_commit,
        repository_id: intent.repository_id,
        workflow_id: intent.workflow_id,
      });
    }
    const orphanRunIds = actualRunIds.filter((runId) => !assignedRunIds.has(runId));
    if (orphanRunIds.length)
      throw new Error(`actual provider run ${orphanRunIds.join(', ')} has no unique issued dispatch intent`);
    return { status: 'eligible', assignments, unmatched_intent_paths: unmatchedIntentPaths };
  } catch (error) {
    return { status: 'blocked', blockers: [errorMessage(error)] };
  }
}

/** @param {string} root @param {ReleaseDispositionEvidence} actualCensus @returns {ReleaseDispositionResult} */
function pendingDispositionUnlocked(root, actualCensus) {
  let mutex;
  try {
    releasePath(root, '.agent/work/agent-local-release');
    const pendingFile = releasePath(root, '.agent/work/agent-local-release/pending.json');
    const successFile = releasePath(root, '.agent/work/agent-local-release/successful.json');
    const pending = releaseState(pendingFile);
    const successful = releaseState(successFile);
    const journalFilePath = journalFile(root, pending.operation_id);
    const journal = releaseState(journalFilePath);
    const { value: manifestValue } = manifest(root);
    if (
      pending.operation_id === successful.operation_id ||
      pending.status !== 'awaiting_assurance' ||
      journal.status !== 'awaiting_assurance' ||
      pending.version !== successful.version ||
      pending.version !== manifestValue.version ||
      journal.operation_id !== pending.operation_id ||
      journal.version !== pending.version ||
      pending.install_started ||
      journal.install_started
    )
      throw new Error('only the exact same-baseline, uninstalled pending SDK operation can be disposed');
    successfulBaseline(root, successful);
    assertReleaseRetargetSettled(root, pending.operation_id);
    assertNativeDeliveryEvidenceRepairSettled(root, pending.operation_id);
    const workerFile = releasePath(root, `.agent/work/agent-local-release/${pending.operation_id}/worker.sqlite`, true);
    if (!existsSync(workerFile)) throw new Error('pending operation lock state is missing; preserve UNKNOWN');
    mutex = operationMutex(root, pending.operation_id);
    if (!mutex) throw new Error('pending operation is active; preserve its exact retry');
    const formation = readReleaseFormation(root);
    if (formation?.operation_id === pending.operation_id)
      throw new Error('pending operation already has confirmed formation evidence');
    if (packedDistribution(journal.pack_metadata) !== 'npm')
      throw new Error('only the pending SDK archive can use this one-time disposition');
    const archive = selectedTarball(
      journal.pack_metadata,
      path.join(root, '.tmp/releases', pending.operation_id),
      pending.version,
    );
    const archiveBytes = readFileSync(archive);
    if (!journal.tarball_sha256 || sha(archiveBytes) !== journal.tarball_sha256)
      throw new Error('pending SDK archive differs from its exact recorded bytes');

    const ciRelative = `.agent/work/agent-local-release/${pending.operation_id}/ci`;
    const ciRoot = releasePath(root, ciRelative);
    const entries = readdirSync(ciRoot, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    if (entries.some((entry) => !entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)))
      throw new Error('pending CI request namespace contains foreign entries');
    const localRequests = entries.map((entry) => {
      const requestRelative = ciRelative + '/' + entry.name + '/request.json';
      const requestFile = releasePath(root, requestRelative);
      const requestStat = lstatSync(requestFile);
      const childNames = readdirSync(path.dirname(requestFile)).sort();
      if (
        !requestStat.isFile() ||
        requestStat.size > 8 * 1024 * 1024 ||
        JSON.stringify(childNames) !== '["request.json"]'
      )
        throw new Error('pending request custody contains a result or incomplete data');
      const request = parseJson(readFileSync(requestFile, 'utf8'));
      assertCIDeliveryRequest(request);
      if (
        request.request_id !== entry.name ||
        request.operation_id !== pending.operation_id ||
        request.version !== pending.version
      )
        throw new Error('pending request identity differs from its owner');
      return request;
    });
    const requestCensus = actualCensus?.requestCensus;
    const runObservations = actualCensus?.runObservations;
    if (
      requestCensus?.operation_id !== pending.operation_id ||
      requestCensus?.version !== pending.version ||
      runObservations?.operation_id !== pending.operation_id ||
      !Array.isArray(requestCensus.requests) ||
      !Array.isArray(runObservations.requests) ||
      !Number.isFinite(Date.parse(runObservations.observed_at))
    )
      throw new Error('actual pending request and provider observation census required');
    const noIssueRows = runObservations.no_issue_references ?? [];
    if (!Array.isArray(noIssueRows)) throw new Error('actual no-issue reference census is invalid');
    const supplementalDispatchRows = runObservations.dispatch_intents ?? [];
    if (!Array.isArray(supplementalDispatchRows)) throw new Error('supplemental dispatch reference census is invalid');
    /** @type {Map<string,string[]>} */
    const supplementalDispatchById = new Map();
    /** @type {Set<string>} */
    const supplementalDispatchKeys = new Set();
    for (const reference of supplementalDispatchRows) {
      if (
        !reference ||
        typeof reference.request_id !== 'string' ||
        typeof reference.reference_path !== 'string' ||
        reference.kind !== 'RETAINED_DISPATCH_INTENT'
      )
        throw new Error('supplemental dispatch reference lacks retained intent identity');
      const key = reference.request_id + '\0' + reference.reference_path;
      if (supplementalDispatchKeys.has(key)) throw new Error('duplicate supplemental dispatch reference');
      supplementalDispatchKeys.add(key);
      const paths = supplementalDispatchById.get(reference.request_id) ?? [];
      paths.push(reference.reference_path);
      supplementalDispatchById.set(reference.request_id, paths);
    }
    /** @type {Map<string,DispositionNoIssueObservation>} */
    const noIssueByKey = new Map();
    for (const observation of noIssueRows) {
      if (
        !observation ||
        typeof observation.request_id !== 'string' ||
        typeof observation.reference_path !== 'string' ||
        observation.kind !== 'ACTUAL_PROVIDER_OBSERVATION' ||
        observation.status !== 'no_issue' ||
        !Number.isFinite(Date.parse(observation.observed_at))
      )
        throw new Error('no-issue reference lacks an actual terminal provider observation');
      const key = observation.request_id + '\0' + observation.reference_path;
      if (noIssueByKey.has(key)) throw new Error('duplicate no-issue reference observation');
      noIssueByKey.set(key, observation);
    }
    /** @type {Set<string>} */
    const usedNoIssueKeys = new Set();
    /** @type {Map<string,DispositionCensusRequestRow>} */
    const censusById = new Map(requestCensus.requests.map((row) => [row.request_id, row]));
    /** @type {Map<string,DispositionObservationRequestRow>} */
    const observationsById = new Map(runObservations.requests.map((row) => [row.request_id, row]));
    if (
      censusById.size !== requestCensus.requests.length ||
      observationsById.size !== runObservations.requests.length ||
      !sameIds(
        [...censusById.keys()],
        localRequests.map((request) => request.request_id),
      ) ||
      !sameIds(
        [...observationsById.keys()],
        localRequests.map((request) => request.request_id),
      ) ||
      [...supplementalDispatchById.keys()].some(
        (requestId) => !localRequests.some((request) => request.request_id === requestId),
      )
    )
      throw new Error('actual census does not cover the exact pending request set');

    const normalized = localRequests.map((request) => {
      const [censusRow, observationRow] = requireDispositionRequestRows(
        censusById.get(request.request_id),
        observationsById.get(request.request_id),
      );
      if (censusRow.target !== request.target) throw new Error('request census target differs from retained request');
      const references = referencePaths(censusRow, observationRow);
      if (
        !Array.isArray(censusRow.references) ||
        censusRow.references.some((reference) => !Array.isArray(reference.run_ids ?? []))
      )
        throw new Error('request reference run set is invalid');
      const supplementalPaths = supplementalDispatchById.get(request.request_id) ?? [];
      if (supplementalPaths.some((referencePath) => references.includes(referencePath)))
        throw new Error('supplemental dispatch reference duplicates a retained request reference');
      const issuedIntentPaths = censusRow.references
        .filter((reference) => reference.status === 'ISSUED_ONCE')
        .map((reference) => reference.path)
        .concat(supplementalPaths);
      if (new Set(issuedIntentPaths).size !== issuedIntentPaths.length)
        throw new Error('issued dispatch reference set is duplicated');
      const dispatchReferences = [...references, ...supplementalPaths];
      const issuedIntents = issuedIntentPaths.map((referencePath) =>
        readDispositionDispatchIntent(root, request, referencePath, dispatchReferences),
      );
      const referenceRunIds = [...new Set(censusRow.references.flatMap((reference) => reference.run_ids ?? []))];
      const runs = observationRow.runs;
      if (
        !Array.isArray(runs) ||
        !sameIds(
          referenceRunIds,
          runs.map((run) => String(run?.run_id)),
        )
      )
        throw new Error('provider runs do not match the exact retained request references');
      const joined = joinReleaseDispatchIntents({
        request_id: request.request_id,
        issued_intents: issuedIntents,
        runs,
        observed_at: runObservations.observed_at,
      });
      if (joined.status !== 'eligible') throw new Error(`request ${request.request_id}: ${joined.blockers[0]}`);
      const noIssueReferencePaths = [];
      for (const referencePath of joined.unmatched_intent_paths) {
        const key = request.request_id + '\0' + referencePath;
        const noIssue = noIssueByKey.get(key);
        const intent = issuedIntents.find((item) => item.reference_path === referencePath);
        if (
          !noIssue ||
          !intent ||
          Date.parse(noIssue.observed_at) < Date.parse(intent.issued_at) ||
          Date.parse(noIssue.observed_at) > Date.parse(runObservations.observed_at)
        )
          throw new Error(
            `request ${request.request_id} dispatch ${referencePath} has no matching actual run or no-issue observation; preserve UNKNOWN`,
          );
        noIssueReferencePaths.push(referencePath);
        usedNoIssueKeys.add(key);
      }
      for (const key of noIssueByKey.keys()) {
        if (
          key.startsWith(request.request_id + '\0') &&
          !issuedIntentPaths.includes(key.slice(request.request_id.length + 1))
        )
          throw new Error('no-issue observation is not bound to a retained issued dispatch intent');
      }
      if (runs.length === 0) {
        if (
          joined.unmatched_intent_paths.length !== issuedIntents.length ||
          (!noIssueReferencePaths.length &&
            !censusRow.references.some((reference) => ['NO_ISSUE', 'NOT_ISSUED'].includes(reference.status)))
        )
          throw new Error('request has no provider result and no explicit no-issue evidence');
        return {
          request_id: request.request_id,
          no_issue: true,
          source_commit: null,
          references: dispatchReferences,
          no_issue_reference_paths: noIssueReferencePaths,
          runs: [],
        };
      }
      const assignmentByRunId = new Map(joined.assignments.map((assignment) => [assignment.run_id, assignment]));
      return {
        request_id: request.request_id,
        no_issue: false,
        source_commit: null,
        references: dispatchReferences,
        no_issue_reference_paths: noIssueReferencePaths,
        runs: runs.map((run) => {
          const assignment = assignmentByRunId.get(String(run.run_id));
          if (!assignment) throw new Error('actual provider run has no exact dispatch-intent join');
          return {
            ...run,
            run_id: String(run.run_id),
            source_commit: assignment.source_commit,
            dispatch_reference_path: assignment.reference_path,
          };
        }),
      };
    });
    if (usedNoIssueKeys.size !== noIssueByKey.size)
      throw new Error('no-issue observations are not in one-to-one custody with unmatched issued intents');
    const census = {
      operation_id: pending.operation_id,
      version: pending.version,
      observed_at: runObservations.observed_at,
      requests: normalized,
    };
    const classified = classifyReleaseDispositionCensus({
      operation_id: pending.operation_id,
      version: pending.version,
      request_ids: localRequests.map((request) => request.request_id),
      actual_census: census,
    });
    if (classified.status !== 'eligible') throw new Error(classified.blockers[0]);
    const body = {
      schema: 'VidaLocalReleaseDispositionReceipt/v1',
      authority: 'local_consistency_only',
      operation_id: pending.operation_id,
      version: pending.version,
      baseline_operation_id: successful.operation_id,
      baseline_version: successful.version,
      pending_pointer_sha256: sha(readFileSync(pendingFile)),
      successful_pointer_sha256: sha(readFileSync(successFile)),
      archive_sha256: sha(archiveBytes),
      census_sha256: sha(json(census)),
      observed_at: census.observed_at,
      request_count: classified.request_count,
      terminal_success_count: classified.terminal_success_count,
      terminal_failure_count: classified.terminal_failure_count,
      no_issue_count: classified.no_issue_count,
      requests: classified.requests,
      no_issue_references: classified.requests.flatMap((request) =>
        request.no_issue_reference_paths.map((reference_path) => ({
          request_id: request.request_id,
          reference_path,
        })),
      ),
    };
    return {
      schema: 'VidaLocalReleaseDispositionProposal/v1',
      status: 'eligible',
      receipt: { ...body, digest: sha(json(body)) },
      census: actualCensus,
    };
  } catch (error) {
    return {
      schema: 'VidaLocalReleaseDispositionProposal/v1',
      status: 'blocked',
      blockers: [errorMessage(error)],
    };
  } finally {
    mutex?.close();
  }
}

/** @param {string} root @param {ReleaseDispositionEvidence} actualCensus */
export async function pendingReleaseDispositionReceipt(root = repositoryRoot, actualCensus) {
  try {
    const admissionFile = releasePath(root, '.agent/work/agent-local-release/admission.sqlite', true);
    if (!existsSync(admissionFile)) throw new Error('release admission lock state is missing; preserve UNKNOWN');
    return await withReleaseAdmission(root, () => pendingDispositionUnlocked(root, actualCensus));
  } catch (error) {
    return {
      schema: 'VidaLocalReleaseDispositionProposal/v1',
      status: 'blocked',
      blockers: [errorMessage(error)],
    };
  }
}
/**
 * Transitional repository MJS cannot issue durable package service custody.
 * Keep the old export shape for existing imports, but fail closed before spawn.
 * The initialized Source path above owns one-shot detached worker admission.
 */
/** @param {string} _root @param {string} _operation @param {() => number} _launch @returns {Promise<never>} */
export async function reserveReleaseWorker(_root, _operation, _launch) {
  throw new Error('Legacy release worker launch lacks durable service custody; preserve the operation.');
}
/** @param {string} _root @param {string} _operation @param {number} _pid @returns {Promise<never>} */
export async function claimReleaseWorker(_root, _operation, _pid) {
  throw new Error('Legacy release worker claim lacks durable service custody; preserve the operation.');
}

/** @param {string} [root] @param {ReleaseVersionSelection} [selection] */
export function prepareRelease(root = repositoryRoot, selection = { mode: 'patch' }) {
  return withReleaseAdmission(root, () => prepareCandidate(root, false, selection), true);
}
/** @param {string} [root] @param {ReleaseVersionSelection} [selection] @param {unknown} [proposal] */
export async function prepareReleaseAfterDisposition(root = repositoryRoot, selection = { mode: 'patch' }, proposal) {
  return withReleaseAdmission(root, () => prepareCandidate(root, false, selection, proposal), true);
}
export function prepareSystemUpdate(root = repositoryRoot) {
  return withReleaseAdmission(root, () => prepareCandidate(root, true), true);
}
/** @param {string} root @param {ReleaseJournalState} successful */
function successfulBaseline(root, successful) {
  if (!successful || successful.status !== 'successful')
    throw new Error('Release version selection requires a successful baseline.');
  const completed = releaseState(journalFile(root, successful.operation_id));
  if (
    completed.operation_id !== successful.operation_id ||
    completed.version !== successful.version ||
    completed.status !== 'successful'
  )
    throw new Error('Successful baseline differs from its operation journal.');
}
/** @param {string} root @param {string} currentVersion @param {ReleaseJournalState|null} pending @param {ReleaseJournalState|null} successful */
function preflightSystemUpdate(root, currentVersion, pending, successful) {
  if (successful) successfulBaseline(root, successful);
  if (pending) {
    const completed = releaseState(journalFile(root, pending.operation_id));
    if (completed.operation_id !== pending.operation_id || completed.version !== pending.version)
      throw new Error('Pending system update differs from its operation journal.');
    if (pending.version !== currentVersion) throw new Error('Pending system update differs from manifest.');
    // Only existing exact successful-receipt reconciliation may repair an unpublished baseline.
    if (pending.operation_id !== successful?.operation_id && completed.status === 'successful') return;
  }
  if (!successful || successful.version !== currentVersion)
    throw new Error('System update must preserve the successful manifest version.');
}
/** @param {string} root @param {boolean} [systemUpdate] @param {ReleaseVersionSelection} [selection] @param {unknown} [dispositionProposal] */
function prepareCandidate(root, systemUpdate = false, selection = { mode: 'patch' }, dispositionProposal) {
  const releases = directory(root, '.agent/work/agent-local-release');
  resumeReleasePreparation(root);
  const pendingFile = path.join(releases, 'pending.json');
  const successFile = path.join(releases, 'successful.json');
  const { value } = manifest(root);
  let successful = existsSync(successFile) ? releaseState(successFile) : null;
  const pending = existsSync(pendingFile) ? releaseState(pendingFile) : null;
  if (successful) successfulBaseline(root, successful);
  if (systemUpdate) preflightSystemUpdate(root, value.version, pending, successful);
  if (pending) assertReleaseRetargetSettled(root, pending.operation_id);
  if (pending && pending.operation_id !== successful?.operation_id) {
    const completedFile = journalFile(root, pending.operation_id);
    if (existsSync(completedFile)) {
      const completed = releaseState(completedFile);
      if (completed.status === 'successful') {
        assertInstalledReleaseState(completed);
        const completedMetadata = parseReleasePackMetadata(completed.pack_metadata);
        const archive = selectedTarball(
          completedMetadata,
          path.join(root, '.tmp/releases', pending.operation_id),
          pending.version,
        );
        const distribution = packedDistribution(completedMetadata);
        const installedManifestBytes =
          distribution === 'npm' && completedMetadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')
            ? sdkCompatibilityManifest({ root: path.join(root, 'packages/agent') }).bytes
            : undefined;
        const archiveMatches = sha(readFileSync(archive)) === completed.tarball_sha256;
        let installedMatches = false;
        if (archiveMatches) {
          try {
            verifyInstalledTree(root, completedMetadata, completed.installed_root, {
              distribution,
              expectedManifestBytes: installedManifestBytes,
            });
            installedMatches = true;
          } catch {
            installedMatches = false;
          }
        }
        const exact = archiveMatches && installedMatches;
        if (!exact) throw new Error('Completed publication must be reconciled against installed bytes.');
        save(successFile, completed);
        successful = completed;
      }
    }
  }
  const preparation = pending ? readReleasePreparation(root, pending) : null;
  let dispositionReceipt;
  if (dispositionProposal) {
    assertReleaseDispositionProposal(dispositionProposal);
    const alreadyPrepared =
      preparation?.disposition && json(preparation.disposition) === json(dispositionProposal.receipt);
    if (!alreadyPrepared) {
      const verified = pendingDispositionUnlocked(root, {
        requestCensus: dispositionProposal.census.requestCensus,
        runObservations: dispositionProposal.census.runObservations,
      });
      if (verified.status !== 'eligible' || verified.receipt.digest !== dispositionProposal.receipt?.digest)
        throw new Error('Pending disposition evidence changed; preserve the existing operation.');
      dispositionReceipt = verified.receipt;
    }
  }
  if (pending && pending.operation_id !== successful?.operation_id) {
    if (pending.version !== value.version) throw new Error('Pending candidate differs from manifest.');
    const pendingJournal = journalFile(root, pending.operation_id);
    if (!existsSync(pendingJournal))
      throw new Error('Pending release journal missing; reconcile without repeating effects.');
    const currentPending = releaseState(pendingJournal);
    if (currentPending.operation_id !== pending.operation_id || currentPending.version !== pending.version)
      throw new Error('Pending release differs from its operation journal; preserve its exact operation.');
    const retry = pendingBuildRetry(pending, successful, selection, dispositionReceipt, preparation?.priorVersion);
    if (retry) return currentPending;
  }
  const formation = readReleaseFormation(root);
  const confirmed = confirmedVersionBaseline(successful, formation);
  const selectedVersion = systemUpdate ? value.version : candidateVersion(value.version, confirmed?.version, selection);
  if (systemUpdate) {
    successful = releaseState(successFile);
    successfulBaseline(root, successful);
    if (successful.version !== value.version) throw new Error('System update baseline version differs from manifest.');
  }
  if (!systemUpdate && confirmed && value.version !== confirmed.version)
    throw new Error(
      'Manifest version differs from the last confirmed formation; reconcile the pending operation first.',
    );
  const version = selectedVersion;
  const operation_id = `local-${randomUUID()}`;
  /** @type {PreparedRelease} */
  const prepared = {
    schema: 'VidaLocalReleaseState/v1',
    operation_id,
    version,
    status: 'awaiting_assurance',
  };
  return publishReleasePreparation(root, prepared, { ...value, version }, dispositionReceipt);
}
/** @param {string} command @param {string[]} args @param {RunCommandOptions} [options] @returns {Promise<string>} */
export function runCommand(command, args, { cwd, env = process.env, log, windowsVerbatimArguments = false } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd,
      env,
      windowsHide: true,
      shell: false,
      windowsVerbatimArguments,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '',
      stderr = '';
    child.stdout.on('data', (bytes) => {
      stdout += bytes;
    });
    child.stderr.on('data', (bytes) => {
      stderr += bytes;
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      const result = {
        command,
        args,
        code,
        signal,
        elapsed_ms: Date.now() - started,
        stdout,
        stderr,
      };
      if (log) writeFileSync(log, json(result));
      if (code !== 0 || signal)
        reject(
          new Error(
            `Command failed: ${args.join(' ')} (${code ?? signal})\nstderr:\n${stderr.slice(-2048)}\nstdout:\n${stdout.slice(-2048)}`,
          ),
        );
      else resolve(stdout.trim());
    });
  });
}
/** @param {string} output @returns {ReleasePackMetadata} */
export function parsePackOutput(output) {
  const text = output.trim();
  if (text.startsWith('[')) return parseReleasePackMetadata(parseJson(text));
  const boundary = text.indexOf('\n[');
  if (boundary < 0) throw new Error('npm pack metadata array missing.');
  const event = requireJsonRecord(parseJson(text.slice(0, boundary)), 'Unknown npm prepack event.');
  if (
    event.schema !== 'CandidatePackageBuild/v1' ||
    event.test_issuers_shipped !== false ||
    !Array.isArray(event.production_entrypoints) ||
    !isIntegerNumber(event.schemas) ||
    event.schemas < 1 ||
    Object.keys(event).sort().join() !==
      ['schema', 'production_entrypoints', 'test_issuers_shipped', 'schemas'].sort().join()
  )
    throw new Error('Unknown npm prepack event.');
  return parseReleasePackMetadata(parseJson(text.slice(boundary + 1)));
}
/** @param {string} root @returns {Buffer} */
function sdkManifest(root) {
  return sdkCompatibilityManifest({ root: path.join(root, 'packages/agent') }).bytes;
}
/** @typedef {NonNullable<ReturnType<typeof readNativeRetargetCandidate>>} NativeRetargetCandidate */
/** @param {string} root @param {ReleasePackMetadata} metadata @param {string} tarball @param {string|undefined} npmCli @param {Buffer|undefined} expectedManifest @returns {Promise<void>} */
export async function verifyPackedSources(root, metadata, tarball, npmCli, expectedManifest) {
  /** @type {import('../../packages/agent/tooling/release-dependency-types.js').AgentTarModule} */
  const tar = /** @type {import('../../packages/agent/tooling/release-dependency-types.js').AgentTarModule} */ (
    createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar')
  );
  const expected = new Set(metadata[0].files.map((entry) => 'package/' + entry.path));
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const errors = [];
  await tar.t({
    file: tarball,
    strict: true,
    onReadEntry(entry) {
      if (entry.type === 'Directory') return;
      if (entry.type !== 'File' || !expected.has(entry.path) || seen.has(entry.path)) {
        errors.push('Archive entry differs from exact npm file set.');
        return;
      }
      seen.add(entry.path);
      /** @type {Buffer[]} */
      const chunks = [];
      entry.on('data', (chunk) => chunks.push(chunk));
      entry.on('end', () => {
        const source = path.join(root, 'packages/agent', entry.path.slice('package/'.length));
        if (
          !existsSync(source) ||
          lstatSync(source).isSymbolicLink() ||
          !Buffer.concat(chunks).equals(
            entry.path === 'package/package.json' && expectedManifest ? expectedManifest : readFileSync(source),
          )
        )
          errors.push('Current packaged bytes differ: ' + entry.path);
      });
    },
  });
  if (errors.length || seen.size !== expected.size) throw new Error(errors[0] ?? 'Archive file set incomplete.');
}
/** @param {string} file @param {boolean} [create] */
function nativePath(file, create = false) {
  if (!path.isAbsolute(file)) throw new Error('Native installation path must be absolute.');
  let current = path.parse(file).root;
  for (const part of file.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (create && !existsSync(current)) mkdirSync(current);
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw new Error('Native installation directory must not be linked.');
  }
}

/** @param {{version:string,operation:string,target:string,env?:NodeJS.ProcessEnv}} input */
/** @param {{version:string,operation:string,target:string,env?:NodeJS.ProcessEnv}} input @returns {NativeInstallationPaths} */
export function nativeInstallationPaths({ version, operation, target, env = process.env }) {
  if (
    !parseReleaseVersion(version) ||
    !idPattern.test(operation) ||
    typeof target !== 'string' ||
    !target.startsWith('bun-' + process.platform.replace('win32', 'windows') + '-' + process.arch)
  )
    throw new Error('Native installation identity or target differs.');
  const base =
    process.platform === 'win32'
      ? env.LOCALAPPDATA
      : (env.XDG_DATA_HOME ?? path.join(env.HOME ?? homedir(), '.local', 'share'));
  if (typeof base !== 'string' || !path.isAbsolute(base) || /[\r\n\0]/.test(base))
    throw new Error('Native user installation root unavailable.');
  const product =
    process.platform === 'win32' ? path.join(base, 'Programs', 'vida-agent') : path.join(base, 'vida-agent');
  const prefix = path.join(product, 'bin');
  return {
    installed_root: path.join(product, 'releases', version + '-' + operation, 'package'),
    prefix,
    path_command: path.join(prefix, process.platform === 'win32' ? 'vida-agent.exe' : 'vida-agent'),
  };
}

/** First publication is exclusive; replacement is allowed only against an exact prior successful asset. */
/** @param {NativeRetargetCandidate['asset']} asset @param {string} destination @param {PriorPublishedAsset|null} [prior] */
export function publishNativeExecutable(asset, destination, prior = null) {
  nativePath(path.dirname(asset.path));
  const source = lstatSync(asset.path),
    bytes = readFileSync(asset.path);
  if (
    !source.isFile() ||
    source.isSymbolicLink() ||
    source.nlink !== 1 ||
    bytes.length !== asset.bytes ||
    sha(bytes) !== asset.sha256
  )
    throw new Error('Native source asset differs.');
  nativePath(path.dirname(destination), true);
  const before = existsSync(destination) ? lstatSync(destination) : null;
  let priorBytes;
  if (before) {
    if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1 || !prior || prior.path !== destination)
      throw new Error('Native destination has an unowned or linked prior artifact.');
    priorBytes = readFileSync(destination);
    if (priorBytes.length !== prior.bytes || sha(priorBytes) !== prior.sha256)
      throw new Error('Prior native artifact differs.');
  } else if (prior) throw new Error('Prior native artifact disappeared.');
  const pending = destination + '.' + randomUUID() + '.pending';
  let descriptor;
  try {
    descriptor = openSync(pending, 'wx', 0o755);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    if (priorBytes) {
      const beforeImage = requirePresentValue(before, 'Prior native artifact disappeared before publication.');
      const current = lstatSync(destination);
      if (
        !current.isFile() ||
        current.isSymbolicLink() ||
        current.nlink !== 1 ||
        current.ino !== beforeImage.ino ||
        !readFileSync(destination).equals(priorBytes)
      )
        throw new Error('Prior native artifact changed before publication.');
      renameSync(pending, destination);
    } else {
      copyFileSync(pending, destination, constants.COPYFILE_EXCL);
      unlinkSync(pending);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
    if (existsSync(pending)) unlinkSync(pending);
  }
}

/** @param {string} root @param {ReleasePackMetadata} metadata @param {string} operation @returns {NativeRetargetCandidate['asset']} */
function nativeAsset(root, metadata, operation) {
  const candidate = readNativeRetargetCandidate({ root, operation, published: true });
  if (json(metadata) !== json(candidate.pack_metadata)) throw Error('Native candidate metadata differs.');
  return candidate.asset;
}
/** @param {string} root @param {ReleasePackMetadata} metadata @param {string} tarball @param {string|undefined} npmCli @param {string} destination @returns {Promise<void>} */
async function extractNativeTree(root, metadata, tarball, npmCli, destination) {
  nativePath(path.dirname(destination), true);
  if (existsSync(destination)) throw new Error('Native release tree already exists; inspect uncertain installation.');
  mkdirSync(destination);
  /** @type {import('../../packages/agent/tooling/release-dependency-types.js').AgentTarModule} */
  const tar = /** @type {import('../../packages/agent/tooling/release-dependency-types.js').AgentTarModule} */ (
    createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar')
  );
  const expected = new Set(nativeArchiveFiles(metadata).map((file) => 'package/' + file.path));
  await tar.x({
    file: tarball,
    cwd: destination,
    strip: 1,
    strict: true,
    filter(entry, info) {
      if (tarEntryKind(info) === 'Directory') {
        if (
          !entry.startsWith('package/') ||
          entry.split('/').some((part) => part === '..' || part === '.' || part.includes(':') || part.includes('\\'))
        )
          throw new Error('Native extraction directory differs.');
        return true;
      }
      if (tarEntryKind(info) !== 'File' || !expected.has(entry)) throw new Error('Native extraction entry differs.');
      return true;
    },
  });
  verifyInstalledTree(root, metadata, destination);
}

/** @param {string} root @param {ReleasePackMetadata} metadata @param {string} destination @param {InstalledTreeOptions} [options] */
function verifyInstalledTree(root, metadata, destination, { distribution = 'native', expectedManifestBytes } = {}) {
  if (!['native', 'npm'].includes(distribution)) throw new Error('Installed package distribution is invalid.');
  nativePath(destination);
  const files = distribution === 'npm' ? npmArchiveFiles(metadata) : nativeArchiveFiles(metadata),
    expected = new Set(files.map((file) => file.path));
  const expectedDirectories = new Set();
  for (const file of files) {
    const parts = file.path.split('/');
    parts.pop();
    for (let index = 1; index <= parts.length; index++) expectedDirectories.add(parts.slice(0, index).join('/'));
  }
  /** @param {string} directory @param {string} [relative] */
  const visit = (directory, relative = '') => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = relative + entry.name,
        absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Installed ${distribution} tree contains a linked entry.`);
      if (distribution === 'npm' && relative === '' && entry.name === 'node_modules' && entry.isDirectory()) continue;
      if (entry.isDirectory()) {
        if (distribution === 'npm' && !expectedDirectories.has(name))
          throw new Error('Installed npm tree contains an unknown directory.');
        visit(absolute, name + '/');
      } else if (!entry.isFile() || !expected.has(name))
        throw new Error(`Installed ${distribution} tree contains an unknown entry.`);
    }
  };
  visit(destination);
  for (const file of files) {
    const target = path.join(destination, file.path);
    nativePath(path.dirname(target));
    const info = lstatSync(target);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      !readFileSync(target).equals(
        file.path === 'package.json' && expectedManifestBytes !== undefined
          ? expectedManifestBytes
          : readFileSync(path.join(root, 'packages/agent', file.path)),
      )
    )
      throw new Error(`Installed ${distribution} release tree differs.`);
  }
}

/** @param {ReleasePackMetadata} metadata @returns {ReleasePackMetadata[0]['files']} */
function nativeArchiveFiles(metadata) {
  const files = metadata[0]?.files;
  if (
    !Array.isArray(files) ||
    new Set(files.map((file) => file.path)).size !== files.length ||
    files.some(
      (file) =>
        typeof file.path !== 'string' ||
        file.path.includes('\\') ||
        file.path.startsWith('/') ||
        file.path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':')),
    )
  )
    throw new Error('Native archive paths differ.');
  return files;
}

/** @param {ReleasePackMetadata} metadata @returns {ReleasePackMetadata[0]['files']} */
function npmArchiveFiles(metadata) {
  const files = nativeArchiveFiles(metadata),
    paths = new Set(files.map((file) => (process.platform === 'win32' ? file.path.toLowerCase() : file.path)));
  if (!paths.has('package.json')) throw new Error('Installed npm archive manifest is missing.');
  if ([...paths].some((relative) => relative === 'node_modules' || relative.startsWith('node_modules/')))
    throw new Error('npm-managed dependencies cannot be archive-owned package entries.');
  return files;
}

/** @param {string} pathValue @returns {string} */
function nativePathCommand(pathValue) {
  for (const folder of pathValue.split(path.delimiter).filter(Boolean)) {
    for (const filename of process.platform === 'win32'
      ? ['vida-agent.com', 'vida-agent.exe', 'vida-agent.bat', 'vida-agent.cmd']
      : ['vida-agent']) {
      const file = path.join(folder, filename);
      if (existsSync(file)) return file;
    }
  }
  throw new Error('Native command is absent from PATH.');
}

/** @param {string} root @param {ReleaseJournalState|null} prior @param {string} relative @param {string} destination @param {string|undefined} npmCli @returns {Promise<PriorPublishedAsset|null>} */
async function priorNativeAsset(root, prior, relative, destination, npmCli) {
  const image = priorNativePackImage(prior, destination, relative);
  if (!image) return null;
  const { prior: priorState, metadata } = image;
  const archiveDigest = requireString(priorState.tarball_sha256, 'Prior native archive digest is missing.');
  const archive = selectedTarball(
    metadata,
    path.join(root, '.tmp/releases', priorState.operation_id),
    priorState.version,
  );
  if (sha(readFileSync(archive)) !== archiveDigest) throw new Error('Prior native archive differs.');
  /** @type {Buffer|undefined} */
  let bytes;
  /** @type {import('../../packages/agent/tooling/release-dependency-types.js').AgentTarModule} */
  const tar = /** @type {import('../../packages/agent/tooling/release-dependency-types.js').AgentTarModule} */ (
    createRequire(npmCli ?? path.join(root, 'packages/agent/package.json'))('tar')
  );
  await tar.t({
    file: archive,
    strict: true,
    onReadEntry(entry) {
      if (entry.path !== 'package/' + relative) return;
      if (entry.type !== 'File' || bytes) throw new Error('Prior native archive asset differs.');
      /** @type {Buffer[]} */
      const chunks = [];
      entry.on('data', (chunk) => chunks.push(chunk));
      entry.on('end', () => {
        bytes = Buffer.concat(chunks);
      });
    },
  });
  if (!bytes) throw new Error('Prior native asset is absent from its archive.');
  return { path: destination, bytes: bytes.length, sha256: sha(bytes) };
}

/** @param {ReleaseJournalState|null} prior @param {string} destination @param {string} relative @returns {{prior:ReleaseJournalState,metadata:ReleasePackMetadata}|null} */
function priorNativePackImage(prior, destination, relative) {
  if (
    !prior ||
    prior.path_command !== destination ||
    !prior.installed_root ||
    !Array.isArray(prior.pack_metadata) ||
    prior.pack_metadata.length !== 1
  )
    return null;
  const metadata = parseReleasePackMetadata(prior.pack_metadata);
  if (!metadata[0].files.some((file) => file.path === relative)) return null;
  return { prior, metadata };
}

/** @param {{root:string,state:ReleaseJournalState,value:PackageManifestRecord,metadata:ReleasePackMetadata,tarball:string,npmCli:string|undefined,env:NodeJS.ProcessEnv,command:typeof runCommand,folder:string,update:(status:ReleaseJournalState['status'],extra?:Record<string,unknown>)=>void}} input @returns {Promise<NativeInstallationPaths>} */
async function installNativeRelease({ root, state, value, metadata, tarball, npmCli, env, command, folder, update }) {
  const asset = nativeAsset(root, metadata, state.operation_id);
  const locations = nativeInstallationPaths({
    version: value.version,
    operation: state.operation_id,
    target: asset.target,
    env,
  });
  if (
    state.install_started &&
    /** @type {Array<keyof NativeInstallationPaths>} */
    (['installed_root', 'prefix', 'path_command']).some((key) => state[key] !== locations[key])
  )
    throw new Error('Recorded native installation targets differ; inspect before retry.');
  if (state.install_started) {
    verifyInstalledTree(root, metadata, locations.installed_root);
    nativePath(locations.prefix);
    const info = lstatSync(locations.path_command);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.nlink !== 1 ||
      sha(readFileSync(locations.path_command)) !== asset.sha256
    )
      throw new Error(
        'Prior native install outcome differs or remains uncertain; inspect before retrying installation.',
      );
  } else {
    const successfulFile = path.join(root, '.agent/work/agent-local-release/successful.json');
    const prior = existsSync(successfulFile) ? releaseState(successfulFile) : null;
    const priorAsset = await priorNativeAsset(root, prior, asset.relative, locations.path_command, npmCli);
    update('installing', { ...locations, install_started: true });
    await extractNativeTree(root, metadata, tarball, npmCli, locations.installed_root);
    publishNativeExecutable(
      { ...asset, path: path.join(locations.installed_root, asset.relative) },
      locations.path_command,
      priorAsset,
    );
  }
  const unrelated = directory(root, `.tmp/releases/${state.operation_id}/unrelated-cwd`);
  const nativeEnv = { ...env };
  for (const key of Object.keys(nativeEnv))
    if (
      ['NODE_OPTIONS', 'BUN_OPTIONS', 'VIDA_STANDALONE_ROOT', 'VIDA_STANDALONE_EXECUTABLE', 'BUN_BE_BUN'].includes(
        key.toUpperCase(),
      )
    )
      delete nativeEnv[key];
  /** @param {string[]} args @param {string} label @returns {Promise<string>} */
  const invoke = (args, label) =>
    command(locations.path_command, args, {
      cwd: unrelated,
      env: nativeEnv,
      log: path.join(folder, label + '.json'),
    });
  const version = parseJson(await invoke(['version'], 'native-version'));
  const versionRecord = requireJsonRecord(version, 'Installed native version response is malformed.');
  const installedName = requireString(versionRecord.name, 'Installed native version differs.');
  const installedVersion = requireString(versionRecord.version, 'Installed native version differs.');
  if (installedName !== 'vida-agent' || installedVersion !== value.version)
    throw new Error('Installed native version differs.');
  const instruction = requireJsonRecord(
    parseJson(await invoke(['instructions', '--path', 'development-lifecycle'], 'native-instructions')),
    'Installed native instruction response is malformed.',
  );
  const instructionVersion = requireString(instruction.version, 'Installed native instruction identity differs.');
  const instructionPath = requireString(instruction.path, 'Installed native instruction identity differs.');
  if (instructionVersion !== value.version || !path.isAbsolute(instructionPath))
    throw new Error('Installed native instruction identity differs.');
  nativePath(path.dirname(instructionPath));
  const instructionInfo = lstatSync(instructionPath);
  if (
    !instructionInfo.isFile() ||
    instructionInfo.isSymbolicLink() ||
    instructionInfo.nlink !== 1 ||
    !readFileSync(instructionPath).equals(
      readFileSync(path.join(locations.installed_root, 'instructions/development-lifecycle.md')),
    )
  )
    throw new Error('Installed native instruction discovery differs.');
  const check = requireJsonRecord(
    parseJson(await invoke(['install', '--check'], 'native-check')),
    'Installed native prerequisite response is malformed.',
  );
  if (check.status !== 'prerequisites_valid' || check.bun_pin !== '1.4.2' || check.runtime !== 'embedded')
    throw new Error('Installed native prerequisite check differs.');
  if (process.platform === 'win32') {
    const powershell = path.join(
      process.env.SystemRoot ?? 'C:\\Windows',
      'System32',
      'WindowsPowerShell',
      'v1.0',
      'powershell.exe',
    );
    /** @param {string} script @param {string} label @returns {Promise<string>} */
    const runPathScript = (script, label) =>
      command(
        powershell,
        ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
        { cwd: unrelated, env, log: path.join(folder, label + '.json') },
      );
    const current = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','User'))",
        'native-path-observe',
      ),
    );
    const entries = current.split(';').filter(Boolean);
    if (!entries.some((entry) => entry.toLowerCase() === locations.prefix.toLowerCase())) {
      /** @param {string} text @returns {string} */
      const literal = (text) => "'" + text.replaceAll("'", "''") + "'";
      const next = [locations.prefix, ...entries].join(';');
      await runPathScript(
        "if([string][Environment]::GetEnvironmentVariable('Path','User') -cne " +
          literal(current) +
          ") { throw 'User PATH changed; inspect before retry' }; [Environment]::SetEnvironmentVariable('Path'," +
          literal(next) +
          ",'User')",
        'native-path-publish',
      );
    }
    const observed = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','User'))",
        'native-path-verify',
      ),
    );
    if (!observed.split(';').some((entry) => entry.toLowerCase() === locations.prefix.toLowerCase()))
      throw new Error('Native user PATH publication remains uncertain.');
    const machine = String(
      await runPathScript(
        "[Console]::Write([Environment]::GetEnvironmentVariable('Path','Machine'))",
        'native-machine-path-observe',
      ),
    );
    if (
      path.resolve(nativePathCommand(machine + ';' + observed)).toLowerCase() !== locations.path_command.toLowerCase()
    )
      throw new Error(
        'An earlier system PATH command shadows the native user command; preserve it and reconcile PATH.',
      );
  } else {
    const pathValue = Object.entries(env).find(([key]) => key === 'PATH')?.[1] ?? '';
    if (!pathValue.split(path.delimiter).includes(locations.prefix))
      throw new Error('Native prefix must be present in the user PATH before Unix installation can complete.');
    if (path.resolve(nativePathCommand(pathValue)) !== locations.path_command)
      throw new Error('An earlier PATH command shadows the native user command.');
  }
  return locations;
}
/** @param {ReleaseExecutionInput} input */
export async function executeRelease({
  root = repositoryRoot,
  operation,
  qualify,
  ci,
  packOnly = false,
  distribution,
  command = runCommand,
  npmCli,
  env = process.env,
}) {
  if (!idPattern.test(operation)) throw new Error('Release operation ID invalid.');
  assertReleaseRetargetSettled(root, operation);
  if (distribution !== undefined && !['npm', 'native'].includes(distribution))
    throw new Error('Release distribution invalid.');
  if (packOnly && distribution !== 'npm')
    throw Error('Native formation belongs to the CI producer; import its exact candidate through supported staging.');
  if (distribution === 'npm') npmCli ??= findNpmCli();
  const folder = directory(root, `.tmp/releases/${operation}`);
  const stateFile = journalFile(root, operation);
  let state = releaseState(stateFile);
  const pending = releaseState(path.join(root, '.agent/work/agent-local-release/pending.json'));
  const { value } = manifest(root);
  if (pending.operation_id !== operation || state.operation_id !== operation || state.version !== value.version)
    throw new Error('Release candidate is not current.');
  let packedMetadata = state.pack_metadata ? parseReleasePackMetadata(state.pack_metadata) : null;
  if (!packOnly) {
    if (distribution === 'npm' || (packedMetadata && packedDistribution(packedMetadata) !== 'native'))
      throw new Error('SDK archives are library-only; public agent installation requires a qualified native asset.');
    if (!packedMetadata) throw new Error('Candidate must be packed after tests and before independent assurance.');
  }
  const started = Date.now();
  /** @param {ReleaseJournalState['status']} status @param {Record<string,unknown>} [extra] */
  const update = (status, extra = {}) => {
    const currentState = { ...state };
    delete currentState.launch_source_status;
    state = { ...currentState, ...extra, status, elapsed_ms: Date.now() - started };
    save(stateFile, state);
  };
  try {
    const qualification = await qualify({ root, operation, version: value.version, ci });
    // Qualification is issued by the fixed repository-owned assurance adapter, never a caller boolean.
    assertQualifiedSourceBinding(qualification);
    const changed = typeof state.source_binding === 'string' && state.source_binding !== qualification.source_binding;
    if (changed && (!packOnly || state.install_started))
      throw new Error('Release source changed; explicit pre-install requalification required.');
    const expectedManifest = distribution === 'npm' ? await Promise.resolve(sdkManifest(root)) : undefined;
    const sdkArgs = [
      path.join(root, 'packages/agent/tooling/pack-sdk.mjs'),
      '--pack',
      '--root',
      path.join(root, 'packages/agent'),
      '--destination',
      folder,
    ];
    /** @type {string|undefined} */
    let tarball;
    if (packedMetadata) {
      tarball = selectedTarball(packedMetadata, folder, value.version);
      const archiveDigest = requireString(state.tarball_sha256, 'Pending tarball digest is missing.');
      if (sha(readFileSync(tarball)) !== archiveDigest) throw new Error('Pending tarball changed.');
      if (changed) await verifyPackedSources(root, packedMetadata, tarball, npmCli, expectedManifest);
    } else {
      if (!packOnly) throw new Error('Candidate must be packed after tests and before independent assurance.');
      /** @type {string[]} */
      let packArgs;
      if (distribution === 'npm') packArgs = sdkArgs;
      else {
        packArgs = [
          requireString(npmCli, 'Native npm pack command is unavailable.'),
          'pack',
          '--json',
          '--pack-destination',
          folder,
        ];
      }
      const priorLog = path.join(folder, 'pack.json');
      /** @type {string} */
      let output;
      const savedPack = existsSync(priorLog) ? read(priorLog) : null;
      if (isSuccessfulPackReceipt(savedPack, packArgs, 'Saved pack observation differs from this operation.')) {
        output = savedPack.stdout;
      } else {
        if (changed) throw new Error('Changed source lacks an exact prior package to requalify.');
        update('packing', { source_binding: qualification.source_binding });
        output = await command(process.execPath, packArgs, {
          cwd: path.join(root, 'packages/agent'),
          env,
          log: priorLog,
        });
      }
      const metadata = parsePackOutput(output);
      packedMetadata = metadata;
      tarball = selectedTarball(metadata, folder, value.version);
      if (existsSync(priorLog)) await verifyPackedSources(root, metadata, tarball, npmCli, expectedManifest);
      const current = await qualify({ root, operation, version: value.version, ci });
      assertQualifiedSourceBinding(current);
      if (current.source_binding !== qualification.source_binding)
        throw new Error('Source changed during npm prepack.');
      update('packed', { pack_metadata: metadata, tarball_sha256: sha(readFileSync(tarball)) });
    }
    update('qualified', { source_binding: qualification.source_binding, error: undefined });
    const releaseMetadata = requirePresentValue(packedMetadata, 'Qualified release package image is unavailable.');
    const releaseTarball = requirePresentValue(tarball, 'Qualified release package image is unavailable.');
    const actualDistribution = await Promise.resolve(packedDistribution(releaseMetadata));
    if (distribution !== undefined && actualDistribution !== distribution)
      throw new Error('Packed distribution differs from the explicit request.');
    const nativeChannel = actualDistribution === 'native';
    if (!nativeChannel) npmArchiveFiles(releaseMetadata);
    const installedManifestBytes =
      expectedManifest ??
      (actualDistribution === 'npm' && releaseMetadata[0].files.some((file) => file.path === 'tooling/pack-sdk.mjs')
        ? await Promise.resolve(sdkManifest(root))
        : undefined);
    if (installedManifestBytes)
      await verifyPackedSources(root, releaseMetadata, releaseTarball, npmCli, installedManifestBytes);
    if (packOnly) {
      update('awaiting_assurance');
      return state;
    }
    if (nativeChannel) {
      const locations = await installNativeRelease({
        root,
        state,
        value,
        metadata: releaseMetadata,
        tarball: releaseTarball,
        npmCli,
        env,
        command,
        folder,
        update,
      });
      update('successful', { ...locations, completed_at: new Date().toISOString() });
      save(path.join(root, '.agent/work/agent-local-release/successful.json'), state);
      return state;
    }
    throw new Error('SDK archives are library-only; public agent installation requires a qualified native asset.');
  } catch (error) {
    const message = errorMessage(error);
    update(message.startsWith('awaiting_assurance:') ? 'awaiting_assurance' : 'failed', {
      error: message,
    });
    throw error;
  }
}
/** @param {string[]} args */
async function main(args) {
  const usageMessage =
    'Usage: release:local -- --prepare [--minor | --major | --version X.Y.Z] | ' +
    '--prepare-after-disposition --proposal REL [--minor | --major | --version X.Y.Z] | ' +
    '--prepare-system-update | --pack ID | --pack-npm ID | --operation ID | --status ID';
  if (args.length === 4 && args[0] === '--stage-native-retarget' && args[2] === '--candidate') {
    const stageOperation = requireString(args[1], usageMessage);
    const candidateFile = requireString(args[3], usageMessage);
    const { stageNativeRetargetCandidate } = await import('../../packages/agent/bin/repair-release-retarget.mjs');
    return stageNativeRetargetCandidate({
      root: repositoryRoot,
      operation: stageOperation,
      candidateFile,
    });
  }
  if (args[0] === '--prepare-after-disposition') {
    const parsed = parseDispositionPreparationArgs(args.slice(1));
    const proposal = readDispositionProposal(repositoryRoot, parsed.proposalPath);
    return prepareReleaseAfterDisposition(repositoryRoot, parsed.selection, proposal);
  }
  if (args[0] === '--prepare') return prepareRelease(repositoryRoot, parseVersionSelection(args.slice(1)));
  if (args.length === 1 && args[0] === '--prepare-system-update') return prepareSystemUpdate();
  const commandName = requireString(args[0], usageMessage);
  const operationArgument = requireString(args[1], usageMessage);
  if (
    args.length !== 2 ||
    ![
      '--operation',
      '--pack',
      '--pack-npm',
      '--status',
      '--worker',
      '--pack-worker',
      '--pack-npm-worker',
      '--initialized-worker',
      '--initialized-pack-worker',
      '--initialized-pack-npm-worker',
    ].includes(commandName) ||
    !idPattern.test(operationArgument)
  )
    throw new Error(usageMessage);
  const operation = operationArgument;
  const folder = directory(repositoryRoot, `.tmp/releases/${operation}`);
  if (commandName === '--status') {
    const status = requireJsonRecord(
      read(journalFile(repositoryRoot, operation)),
      'Release journal status must be an object.',
    );
    return {
      ...status,
      custody_prerequisite: releaseCustodyStatus(repositoryRoot),
    };
  }
  if (
    [
      '--worker',
      '--pack-worker',
      '--pack-npm-worker',
      '--initialized-worker',
      '--initialized-pack-worker',
      '--initialized-pack-npm-worker',
    ].includes(commandName)
  )
    return runReleaseWorkerEntry(operation, commandName);
  return reserveOrRunReleaseEntry(args, operation, folder);
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2))
    .then((value) => process.stdout.write(json(value)))
    .catch((error) => {
      process.stderr.write(errorMessage(error) + '\n');
      process.exitCode = 1;
    });
}
