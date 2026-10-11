import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import path from 'node:path';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

import { sessionHandoffDatabasePath } from '../src/config/project-paths.ts';
import { readAdmittedSessionIntakeForWork } from '../src/orchestration/admitted-session-execution.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { validateFailedPrewriterRecoveryBasis } from '../src/orchestration/failed-prewriter-recovery.ts';
/** @typedef {import('../src/host-state.ts').StateVersion} StateVersion */
/** @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity */
/** @typedef {import('../src/host-state.ts').WorkState} WorkState */
/** @typedef {import('../src/contracts/envelopes.ts').CoordinationLedger} CoordinationLedger */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} MastraSessionLedgerState */
/** @typedef {import('../src/orchestration/delivered-work-continuation-repair.ts').ConfiguredFrontierReceipt} ConfiguredFrontierReceipt */

/** @typedef {{readonly schema: 'FailedPrewriterOwnerRecoveryRequest/v1'; readonly identity: WorkIdentity; readonly attempt: number; readonly nativeSessionHandle: string}} RecoveryRequest */
/** @typedef {RecoveryRequest & {readonly mode: 'inspect'}} InspectRecoveryRequest */
/** @typedef {RecoveryRequest & {readonly mode: 'apply'; readonly expectedWork: StateVersion; readonly expectedLedger: StateVersion; readonly expectedJournal: StateVersion; readonly expectedMaintenanceGeneration: number}} ApplyRecoveryRequest */

/** @type {(condition: unknown, message: string) => asserts condition} */
const requireRecovery = (condition, message) => {
  if (!condition) throw Error(`failed prewriter owner recovery: ${message}`);
};
/** @param {unknown} left @param {unknown} right */
const same = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
/** @param {Record<string, unknown>} value */
const keys = (value) => Object.keys(value).sort().join(',');
/** @param {string} left @param {string} right */
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/** @param {unknown} value @returns {value is WorkIdentity} */
function isWorkIdentity(value) {
  return (
    isPlainRecord(value) &&
    keys(value) === 'integrations_digest,project_ids,repository_id,work_id' &&
    typeof value.repository_id === 'string' &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((item) => typeof item === 'string') &&
    typeof value.integrations_digest === 'string' &&
    typeof value.work_id === 'string'
  );
}

/** @param {unknown} value @returns {value is StateVersion} */
function isStateVersion(value) {
  return (
    isPlainRecord(value) &&
    keys(value) === 'digest,revision' &&
    Number.isSafeInteger(value.revision) &&
    typeof value.digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.digest)
  );
}

/** @param {unknown} value @param {string} expectedKeys @returns {value is Record<string, unknown>} */
function hasRecoveryEnvelopeShape(value, expectedKeys) {
  return isPlainRecord(value) && keys(value) === expectedKeys;
}

/** @param {Record<string, unknown>} value @returns {value is Record<string, unknown> & RecoveryRequest} */
function hasRecoveryBaseFields(value) {
  return (
    value.schema === 'FailedPrewriterOwnerRecoveryRequest/v1' &&
    Number.isSafeInteger(value.attempt) &&
    Number(value.attempt) > 0 &&
    isWorkIdentity(value.identity) &&
    typeof value.nativeSessionHandle === 'string' &&
    value.nativeSessionHandle.length > 0 &&
    value.nativeSessionHandle.length <= 256
  );
}

/** @param {Record<string, unknown>} value @returns {value is Record<string, unknown> & {readonly expectedWork: StateVersion; readonly expectedLedger: StateVersion; readonly expectedJournal: StateVersion; readonly expectedMaintenanceGeneration: number}} */
function hasRecoveryApplyVersions(value) {
  return (
    isStateVersion(value.expectedWork) &&
    isStateVersion(value.expectedLedger) &&
    isStateVersion(value.expectedJournal) &&
    Number.isSafeInteger(value.expectedMaintenanceGeneration) &&
    Number(value.expectedMaintenanceGeneration) >= 0
  );
}

/** @param {unknown} value @param {'inspect'|'apply'} mode @returns {InspectRecoveryRequest|ApplyRecoveryRequest} */
function parseRecoveryRequest(value, mode) {
  const expectedKeys =
    mode === 'inspect'
      ? 'attempt,identity,nativeSessionHandle,schema'
      : 'attempt,expectedJournal,expectedLedger,expectedMaintenanceGeneration,expectedWork,identity,nativeSessionHandle,schema';
  requireRecovery(
    hasRecoveryEnvelopeShape(value, expectedKeys) && hasRecoveryBaseFields(value),
    'request shape or owner invalid',
  );
  requireRecovery(isPlainRecord(value), 'request shape invalid');
  const base = {
    schema: value.schema,
    identity: value.identity,
    attempt: Number(value.attempt),
    nativeSessionHandle: value.nativeSessionHandle,
  };
  if (mode === 'inspect') return { ...base, mode: 'inspect' };
  requireRecovery(hasRecoveryApplyVersions(value), 'expected Host and Journal versions invalid');
  return {
    ...base,
    mode: 'apply',
    expectedWork: value.expectedWork,
    expectedLedger: value.expectedLedger,
    expectedJournal: value.expectedJournal,
    expectedMaintenanceGeneration: Number(value.expectedMaintenanceGeneration),
  };
}

/** @param {WorkState} work @param {unknown} intake */
function retainedSourceApproval(work, intake) {
  const approval = work.lifecycle.references.find(
    (item) =>
      item.kind === 'execution_approval' &&
      item.disposition === 'current' &&
      item.decision === 'approved' &&
      item.artifact_schema === 'LocalSourceWriteAuthorization/v1',
  );
  requireRecovery(
    approval && isPlainRecord(intake) && approval.path === intake.source_authorization_path,
    'retained human Source authority differs from the protected intake',
  );
  return approval;
}
/** @template {InspectRecoveryRequest|ApplyRecoveryRequest} T @param {T} request @returns {Omit<T, 'mode'>} */
function recoveryRequestEnvelope(request) {
  const { mode: _mode, ...envelope } = request;
  return envelope;
}

/** @param {readonly string[]} args */
export function recoverFailedPrewriterOwner(args) {
  requireRecovery(args.length === 6, 'mode, root and request are required');
  /** @type {Map<string, string>} */
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index],
      value = args[index + 1];
    requireRecovery(
      typeof key === 'string' && typeof value === 'string' && value.length > 0 && !values.has(key),
      'arguments invalid',
    );
    values.set(key, value);
  }
  requireRecovery(
    [...values.keys()].sort(compareText).join(',') === '--mode,--project-root,--request',
    'argument set invalid',
  );
  const mode = values.get('--mode'),
    root = values.get('--project-root'),
    requestPath = values.get('--request');
  requireRecovery(mode === 'inspect' || mode === 'apply', 'mode invalid');
  requireRecovery(typeof root === 'string' && path.isAbsolute(root), 'project root invalid');
  requireRecovery(typeof requestPath === 'string', 'request path invalid');
  const access = requireSafeRepositoryAccess(root);
  const bytes = access.readBytes(requestPath, 'failed prewriter owner recovery request');
  requireRecovery(bytes.length > 0 && bytes.length <= 32768, 'request exceeds bound');
  const request = parseRecoveryRequest(JSON.parse(bytes.toString('utf8')), mode);
  const config = loadRuntimeConfig(root),
    project = loadProjectSetContext(root, config, request.identity.repository_id, request.identity.project_ids);
  requireRecovery(
    same(request.identity, {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: request.identity.work_id,
    }),
    'project identity differs',
  );
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const file = sessionHandoffDatabasePath(root, config);
  access.readBytes(path.relative(root, file).split(path.sep).join('/'), 'configured Host database');
  const database = openCliWorkspaceDatabase(root, file, workspaceId, request.mode === 'inspect');
  try {
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    /** @param {WorkState} work @param {MastraSessionLedgerState} journal @param {ConfiguredFrontierReceipt} original */
    const verifyCurrent = (work, journal, original) => {
      const currentConfig = loadRuntimeConfig(root),
        intake = readAdmittedSessionIntakeForWork(root, work);
      requireRecovery(
        runtimeConfigDigest(currentConfig) === work.binding.config_digest &&
          intake.native_session_handle === request.nativeSessionHandle &&
          original.request.nativeSessionHandle === request.nativeSessionHandle &&
          original.attempt === request.attempt &&
          original.request.action.kind === 'configured_frontier' &&
          journal.run_id === original.prior_work.execution.run_id,
        'original context or current configuration differs',
      );
      const anchor = original.prior_work;
      const approval = retainedSourceApproval(anchor, intake);
      const retained = readLocalSourceWriteAuthorization(root, approval.path),
        authority = retained.authorization;
      requireRecovery(
        retained.sha256 === approval.sha256 &&
          authority.action === 'source.write' &&
          authority.work_id === request.identity.work_id &&
          authority.attempt === request.attempt &&
          authority.native_session_handle === request.nativeSessionHandle &&
          authority.scope_digest === anchor.binding.work_source_revision &&
          authority.config_digest === anchor.binding.config_digest &&
          authority.workflow_id === anchor.binding.workflow_id &&
          authority.user_instruction_ref === approval.record_id &&
          approval.principal === 'local-session:' + canonicalJsonDigest(request.nativeSessionHandle) &&
          same([...authority.implementation_paths].sort(), [...work.binding.implementation_paths].sort()),
        'retained human permission, owner or exact Source scope differs',
      );
      requireRecovery(access.readBytes(requestPath, 'recovery request stability').equals(bytes), 'request changed');
    };
    if (request.mode === 'inspect') {
      const captured = store.readWorkSessionSnapshot(request.identity, request.attempt),
        host = captured.host,
        journal = captured.journal,
        configured = store.readConfiguredFrontierRecoveryView(request.identity, request.attempt);
      requireRecovery(host.work && host.ledger && journal && configured, 'original work unavailable');
      validateFailedPrewriterRecoveryBasis({
        original: configured.original,
        work: host.work,
        ledger: host.ledger,
        journal: journal.state,
        nativeSessionHandle: request.nativeSessionHandle,
        now: Date.now(),
      });
      verifyCurrent(host.work, journal.state, configured.original);
      return {
        status: 'failed_prewriter_owner_recovery_ready',
        request: {
          ...recoveryRequestEnvelope(request),
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          expectedJournal: journal.version,
          expectedMaintenanceGeneration: host.maintenanceGeneration,
        },
        rights_granted: false,
        runtime_accepted: false,
      };
    }
    const result = store.recoverFailedPrewriterOwner({ ...recoveryRequestEnvelope(request), verifyCurrent });
    return {
      status: 'failed_prewriter_owner_recovered',
      work_version: result.workVersion,
      ledger_version: result.ledgerVersion,
      journal_version: result.journalVersion,
      failed_reports_preserved: true,
      source_bindings_changed: false,
      rights_granted: false,
      runtime_accepted: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
