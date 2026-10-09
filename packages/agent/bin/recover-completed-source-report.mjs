import { createHash } from 'node:crypto';
import path from 'node:path';
import { Database } from 'bun:sqlite';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig, runtimePackageAccess, runtimePackageCodePaths } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { parseSessionBridgeObservation } from '../src/orchestration/mastra-session-bridge.ts';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimeManifestSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { acceptedSourceAuthorizationRevision } from '../src/orchestration/admitted-development-packet.ts';
import {
  validateCompletedSourceReportRecoveryLineage,
  validateCompletedSourceReportRecoveryRequest,
  validateCompletedSourceReportRecoveryVerifiedCurrent,
} from '../src/orchestration/completed-source-report-recovery.ts';
import { currentNativeSelfAttestation } from './runtime-config-rebind.mjs';
import { releaseState, releaseJournalFile, releasePath } from './local-release-artifacts.mjs';

const requireRecovery = (condition, message) => {
  if (!condition) throw Error(`completed Source report recovery: ${message}`);
};
const same = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashPattern = /^[a-f0-9]{64}$/;

function parseArgs(args) {
  requireRecovery(args.length === 6, 'mode, project root and request are required');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireRecovery(args[index]?.startsWith('--'), 'argument flag invalid');
    requireRecovery(Boolean(args[index + 1]), 'argument value missing');
    requireRecovery(!Object.hasOwn(values, args[index]), 'argument is duplicated');
    values[args[index]] = args[index + 1];
  }
  requireRecovery(
    Object.keys(values).sort().join(',') === '--mode,--project-root,--request',
    'unexpected argument set',
  );
  requireRecovery(['inspect', 'plan', 'apply'].includes(values['--mode']), 'mode invalid');
  requireRecovery(path.isAbsolute(values['--project-root']), 'project root must be absolute');
  requireRecovery(
    path.resolve(values['--project-root']) === values['--project-root'],
    'project root must be canonical',
  );
  return { mode: values['--mode'], root: values['--project-root'], requestPath: values['--request'] };
}

function readStrictJson(access, reference, label, limit = 1024 * 1024, kind = 'object') {
  requireRecovery(typeof reference === 'string', `${label} reference must be text`);
  requireRecovery(reference.length > 0 && reference.length <= 2048, `${label} reference length invalid`);
  const bytes = access.readBytes(reference, label);
  requireRecovery(bytes.length > 0, `${label} is empty`);
  requireRecovery(bytes.length <= limit, `${label} exceeds its byte bound`);
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw Error(`completed Source report recovery: ${label} JSON invalid`);
  }
  if (kind === 'array') requireRecovery(Array.isArray(value), `${label} must be an array`);
  else requireRecovery(isPlainRecord(value), `${label} must be an object`);
  return { bytes, value };
}

function findJournalItem(journal, actionId, issueId) {
  const items = [...(journal.items ?? []), ...(journal.completed ?? []).flatMap((wave) => wave.items ?? [])];
  return items.find((item) => item?.request?.action_id === actionId && item.issue_id === issueId);
}

function readRecoveryState(store, request) {
  const host = store.readHostStateSnapshot(request.identity),
    row = store.readWorkSessionJournal(request.identity),
    initialReceipt = store.readInitialSourceContinuationReceipt(request.identity, request.attempt),
    frontierReceipt = initialReceipt
      ? store.readInitialSourceFrontierCodeRebindReceipt(
          request.identity,
          request.attempt,
          initialReceipt.continuation_id,
        )
      : null,
    recoveryReceipt = store.readCompletedSourceReportRecoveryReceipt(request.identity, request.attempt);
  requireRecovery(
    row && row.attempt === request.attempt && initialReceipt,
    'Host, Journal or original Source continuation is missing',
  );
  const state = {
    host,
    journal: { version: row.version, state: row.state },
    initialReceipt,
    frontierReceipt,
    recoveryReceipt,
  };
  if (recoveryReceipt) validateCompletedSourceReportRecoveryLineage(state);
  return state;
}

function readControllerCommand(root, access, request) {
  const receipt = readStrictJson(
      access,
      request.terminalCommandReceiptRef,
      'successful controller command receipt',
      128 * 1024,
    ).value,
    command = receipt.command_observation;
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
  requireRecovery(isPlainRecord(command), 'controller command observation is missing');
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
  return { receipt, command };
}

function validateReportedJournalBinding(request, state, observation, receipt) {
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

function validateRetainedSourcePermission(root, request, state, reservation) {
  const reference = state.initialReceipt.request.sourceAuthorizationReference,
    work = state.host.work;
  requireRecovery(
    state.initialReceipt.continuation_id === request.initialContinuationId &&
      state.initialReceipt.request_digest === request.initialContinuationRequestDigest,
    'original continuation receipt differs',
  );
  requireRecovery(
    state.initialReceipt.request.nativeSessionHandle === request.nativeSessionHandle,
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
    receipt: state.initialReceipt,
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

function readTerminalProof(root, access, request, state) {
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

function verifySourceDiff(root, access, request, state) {
  const work = state.host.work,
    oldScope = state.journal.state.source_scope,
    snapshot = snapshotDeclaredSources(access, work.lifecycle.scope.allowed_paths),
    changes = compareScopedSourceSnapshots(oldScope, snapshot),
    paths = changes.map((change) => change.path),
    retainedSnapshot = readStrictJson(access, request.sourceSnapshotRef, 'actual Source snapshot').value,
    retainedDiff = readStrictJson(access, request.sourceDiffRef, 'actual Source diff', 1024 * 1024, 'array').value,
    authorization = readLocalSourceWriteAuthorization(
      root,
      state.initialReceipt.request.sourceAuthorizationReference.path,
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

function readNativeManifest(access, ref, expectedDigest, label) {
  const { bytes, value } = readStrictJson(access, ref, label, 32 * 1024 * 1024);
  requireRecovery(sha256(bytes) === expectedDigest, `${label} digest differs`);
  requireRecovery(
    value.schema === 'VidaStandaloneBuild/v1' && Array.isArray(value.inputs) && isPlainRecord(value.asset),
    `${label} schema differs`,
  );
  return { bytes, value };
}

function readNativeInstall(access, ref, manifest, label) {
  const { value } = readStrictJson(access, ref, label, 1024 * 1024),
    install = value.installation_observation ?? value,
    asset = manifest.asset;
  requireRecovery(
    isPlainRecord(install) && install.schema === 'VidaNativeInstallationResult/v1',
    `${label} schema differs`,
  );
  requireRecovery(
    ['install', 'update'].includes(install.action) &&
      install.runtime_accepted === false &&
      install.cleanup_complete === true,
    `${label} action or acceptance flags differ`,
  );
  requireRecovery(install.version === manifest.version, `${label} version differs from its manifest`);
  requireRecovery(
    typeof install.sha256 === 'string' &&
      hashPattern.test(install.sha256.toLowerCase()) &&
      install.sha256.toLowerCase() === asset.sha256.toLowerCase(),
    `${label} executable digest differs from its manifest`,
  );
  requireRecovery(install.bytes === asset.bytes, `${label} byte count differs from its manifest`);
  requireRecovery(
    typeof install.path === 'string' && path.isAbsolute(install.path),
    `${label} executable path is invalid`,
  );
  return install;
}

function verifyCurrentUpdateOwner(root, request, update, self) {
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

function verifyNativeEndpoints(root, config, access, request) {
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
    update = readStrictJson(access, request.systemUpdateRef, 'native system update').value,
    currentPaths = [...runtimePackageCodePaths(config.runtime.bundle)].sort(),
    self = currentNativeSelfAttestation();
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

function verifyCurrentCas(request, state) {
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

function buildVerifiedCurrent(root, config, access, request, state) {
  verifyCurrentCas(request, state);
  const terminal = readTerminalProof(root, access, request, state),
    source = verifySourceDiff(root, access, request, state),
    native = verifyNativeEndpoints(root, config, access, request),
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

function result(status, request, proof, receipt, store, requestPath) {
  const host = store.readHostStateSnapshot(request.identity),
    journal = store.readWorkSessionJournal(request.identity);
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

export function recoverCompletedSourceReport(args) {
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
  access.readBytes(path.relative(root, file).split(path.sep).join('/'), 'configured Host database');
  const database = new Database(file, { readonly: mode !== 'apply', strict: true });
  try {
    const store = new HostStateStore(
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
    const verifyCurrent = (currentRequest, currentState) => {
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
    database.close(true);
  }
}
