// @ts-check
/**
 * @typedef {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} SafeRepositoryAccess
 * @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} AgentRuntimeConfig
 * @typedef {import('../src/config/runtime-config.ts').WorkItemSelection} WorkItemSelection
 * @typedef {import('../src/host-state.ts').HostStateStore} HostStateStoreType
 * @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity
 * @typedef {import('../src/orchestration/initial-source-continuation.ts').InitialSourceContinuationRequest} InitialSourceContinuationRequest
 * @typedef {import('../src/orchestration/initial-source-continuation.ts').InitialSourceContinuationReceipt} InitialSourceContinuationReceipt
 * @typedef {import('../src/orchestration/initial-source-continuation.ts').InitialSourceContinuationState} InitialSourceContinuationState
 * @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} MastraSessionLedgerState
 * @typedef {import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot} ScopedSourceSnapshot
 * @typedef {import('node:buffer').Buffer} Buffer
 */
import path from 'node:path';
import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { parseSessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
import {
  canonicalJsonDigest,
  freezeJsonValue,
  isPlainRecord,
  MAX_CANONICAL_BYTES,
} from '../src/contracts/public-ingress.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
  selectWorkflow,
} from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { readAdmittedSessionIntakeForWork } from '../src/orchestration/admitted-session-execution.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { readSessionEngineSnapshot } from '../src/orchestration/session-engine-snapshot.ts';
import {
  validateContinuationSourceChangePaths,
  validateCurrentSourceScopeBridge,
} from '../src/orchestration/delivered-work-continuation.ts';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import {
  projectCurrentInitialSourceRequest,
  validateInitialSourceContinuationReceipt,
  validateInitialSourceContinuationRequest,
} from '../src/orchestration/initial-source-continuation.ts';

/** @type {(condition: unknown, message: string) => asserts condition} */
const requireInitial = (condition, message) => {
  if (!condition) throw Error('initial source continuation: ' + message);
};
/** @param {unknown} left @param {unknown} right */
const same = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
/** @param {string} left @param {string} right */
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
/** @param {Record<string, unknown>} value */
const keys = (value) => Object.keys(value).sort(compareText).join(',');
/** @param {Buffer} bytes */
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/**
 * @param {unknown} value
 * @param {readonly string[]} expected
 * @returns {value is Record<string, unknown>}
 */
function exactKeys(value, expected) {
  return isPlainRecord(value) && keys(value) === [...expected].sort(compareText).join(',');
}

/**
 * @param {SafeRepositoryAccess} access
 * @param {string} relativePath
 * @param {string} label
 * @param {number} limit
 * @returns {Buffer}
 */
function readBoundedBytes(access, relativePath, label, limit) {
  const bytes = access.readBytes(relativePath, label);
  requireInitial(bytes.length > 0 && bytes.length <= limit, label + ' exceeds its byte bound');
  return bytes;
}

/**
 * @param {Buffer} bytes
 * @param {string} label
 * @returns {Record<string, unknown>}
 */
function parsePlainJson(bytes, label) {
  /** @type {unknown} */
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw Error(label + ' is not valid JSON');
  }
  requireInitial(isPlainRecord(value), label + ' must be a plain JSON record');
  return value;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function validateRelativeRequestPath(value) {
  requireInitial(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 512 &&
      !path.isAbsolute(value) &&
      !/^[A-Za-z]:/.test(value) &&
      !value.includes('\\') &&
      !value.startsWith('/') &&
      value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..'),
    'request path must be a canonical project-relative path',
  );
  return value;
}

/** @param {string} root */
function validateRoot(root) {
  requireInitial(
    typeof root === 'string' && path.isAbsolute(root) && path.resolve(root) === root,
    'project root must be an absolute canonical path',
  );
  /** @type {import('node:fs').Stats} */
  let stat;
  try {
    stat = lstatSync(root);
  } catch {
    throw Error('project root is unavailable');
  }
  requireInitial(
    stat.isDirectory() && !stat.isSymbolicLink() && realpathSync(root) === root,
    'project root must be a real directory',
  );
}

/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
  return Array.isArray(value) && value.every((/** @type {unknown} */ item) => typeof item === 'string');
}

/** @param {unknown} value @returns {value is WorkItemSelection['kind']} */
function isWorkItemKind(value) {
  return typeof value === 'string' && ['epic', 'feature', 'pbi', 'story', 'bug', 'task', 'research'].includes(value);
}

/** @param {unknown} value @returns {value is WorkItemSelection['intent']} */
function isFlowIntent(value) {
  return (
    typeof value === 'string' &&
    ['information_research', 'implementation_new', 'implementation_change', 'bug_fix', 'task_execution'].includes(value)
  );
}

/** @param {unknown} value @returns {value is string[]} */
function isTextList(value) {
  return (
    Array.isArray(value) &&
    value.length <= 64 &&
    value.every((/** @type {unknown} */ entry) => typeof entry === 'string' && entry.length > 0)
  );
}

/** @param {unknown} value @param {string} team @returns {WorkItemSelection} */
function parseWorkItemSelection(value, team) {
  if (
    !exactKeys(value, [
      'schema',
      'id',
      'provider',
      'provider_type',
      'canonical_kind',
      'intent',
      'project_id',
      'title',
      'description',
      'labels',
      'risk_flags',
    ])
  )
    throw new Error('initial source continuation: protected work item shape is invalid');
  const canonicalKind = value.canonical_kind;
  const intent = value.intent;
  const project = value.project_id;
  const labels = value.labels;
  const riskFlags = value.risk_flags;
  if (
    value.schema !== 'WorkItem/v1' ||
    typeof value.id !== 'string' ||
    value.id.length === 0 ||
    typeof value.provider !== 'string' ||
    value.provider.length === 0 ||
    typeof value.provider_type !== 'string' ||
    value.provider_type.length === 0 ||
    !isWorkItemKind(canonicalKind) ||
    !isFlowIntent(intent) ||
    typeof project !== 'string' ||
    project.length === 0 ||
    typeof value.title !== 'string' ||
    value.title.length === 0 ||
    typeof value.description !== 'string' ||
    !isTextList(labels) ||
    !isTextList(riskFlags)
  )
    throw new Error('initial source continuation: protected work item fields are invalid');
  return { team, kind: canonicalKind, intent, project, labels, risk_flags: riskFlags };
}
/** @param {unknown} value @returns {value is WorkIdentity} */
function isWorkIdentity(value) {
  if (!exactKeys(value, ['repository_id', 'project_ids', 'integrations_digest', 'work_id'])) return false;
  const projectIds = value.project_ids;
  return (
    typeof value.repository_id === 'string' &&
    /^[a-z0-9][a-z0-9-]{0,127}$/.test(value.repository_id) &&
    isStringArray(projectIds) &&
    projectIds.length > 0 &&
    projectIds.every((item) => /^[a-z0-9][a-z0-9-]{0,127}$/.test(item)) &&
    same(projectIds, [...new Set(projectIds)].sort(compareText)) &&
    typeof value.integrations_digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.integrations_digest) &&
    typeof value.work_id === 'string' &&
    /^[a-z0-9][a-z0-9-]{0,127}$/.test(value.work_id)
  );
}

/**
 * @param {unknown} identity
 * @param {unknown} attempt
 * @param {unknown} nativeSessionHandle
 * @returns {{identity: WorkIdentity, attempt: number, nativeSessionHandle: string}}
 */
function validateIdentity(identity, attempt, nativeSessionHandle) {
  if (!isWorkIdentity(identity)) throw new Error('initial source continuation: identity is invalid');
  if (typeof attempt !== 'number' || !Number.isSafeInteger(attempt) || attempt <= 0)
    throw new Error('initial source continuation: attempt is invalid');
  if (
    typeof nativeSessionHandle !== 'string' ||
    nativeSessionHandle.length === 0 ||
    nativeSessionHandle.length > 256 ||
    nativeSessionHandle.trim() !== nativeSessionHandle ||
    /\p{Cc}/u.test(nativeSessionHandle)
  )
    throw new Error('initial source continuation: native session handle is invalid');
  return { identity, attempt, nativeSessionHandle };
}

/**
 * @param {string} root
 * @param {WorkIdentity} identity
 * @returns {{config: AgentRuntimeConfig, project: ReturnType<typeof loadProjectSetContext>}}
 */
function loadBoundProject(root, identity) {
  const config = loadRuntimeConfig(root);
  requireInitial(
    config.repository.repository_id === identity.repository_id,
    'current project configuration selects a different repository',
  );
  const project = loadProjectSetContext(root, config, identity.repository_id, identity.project_ids);
  requireInitial(
    same(
      {
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        integrations_digest: project.integrations_digest,
        work_id: identity.work_id,
      },
      identity,
    ),
    'current project configuration differs from the request identity',
  );
  return { config, project };
}

/** @param {unknown} value @returns {value is ScopedSourceSnapshot['entries']} */
function isScopedSourceEntries(value) {
  if (!Array.isArray(value)) return false;
  let priorPath = null;
  for (let index = 0; index < value.length; index++) {
    /** @type {unknown} */
    const entry = value[index];
    if (
      !exactKeys(entry, ['path', 'exists', 'bytes', 'sha256']) ||
      typeof entry.path !== 'string' ||
      entry.path.includes('\\') ||
      entry.path.startsWith('/') ||
      !entry.path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..') ||
      typeof entry.exists !== 'boolean' ||
      (priorPath !== null && priorPath >= entry.path)
    )
      return false;
    if (entry.exists) {
      if (
        typeof entry.bytes !== 'number' ||
        !Number.isSafeInteger(entry.bytes) ||
        entry.bytes < 0 ||
        typeof entry.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(entry.sha256)
      )
        return false;
    } else if (entry.bytes !== null || entry.sha256 !== null) {
      return false;
    }
    priorPath = entry.path;
  }
  return true;
}

/** @param {unknown} value @returns {value is ScopedSourceSnapshot} */
function isScopedSourceSnapshot(value) {
  if (
    !exactKeys(value, ['schema', 'entries', 'digest']) ||
    value.schema !== 'ScopedSourceSnapshot/v1' ||
    typeof value.digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.digest) ||
    !isScopedSourceEntries(value.entries)
  )
    return false;
  return value.digest === canonicalJsonDigest({ schema: value.schema, entries: value.entries });
}

/** @param {unknown} value @returns {value is MastraSessionLedgerState} */
function isInitialUnissuedJournal(value) {
  if (!isPlainRecord(value)) return false;
  const required = ['schema', 'workspace_id', 'work_id', 'attempt', 'run_id', 'step_id', 'items', 'completed'];
  const allowed = [...required, 'corrective_execution', 'source_scope', 'research_wave_exposure'];
  if (
    !required.every((key) => Object.hasOwn(value, key)) ||
    !Object.keys(value).every((key) => allowed.includes(key)) ||
    value.schema !== 'MastraSessionLedger/v1' ||
    typeof value.workspace_id !== 'string' ||
    typeof value.work_id !== 'string' ||
    typeof value.attempt !== 'number' ||
    !Number.isSafeInteger(value.attempt) ||
    value.attempt <= 0 ||
    typeof value.run_id !== 'string' ||
    value.run_id.length === 0 ||
    value.step_id !== 'wave-0' ||
    !Array.isArray(value.items) ||
    value.items.length !== 1 ||
    !Array.isArray(value.completed) ||
    value.completed.length !== 0 ||
    (value.corrective_execution !== undefined && value.corrective_execution !== null) ||
    value.research_wave_exposure !== undefined ||
    (value.source_scope !== undefined && value.source_scope !== null && !isScopedSourceSnapshot(value.source_scope))
  )
    return false;
  /** @type {unknown} */
  const item = value.items[0];
  if (!exactKeys(item, ['request', 'issue_id', 'observation']) || item.issue_id !== null || item.observation !== null)
    return false;
  try {
    return same(parseSessionBridgeRequest(item.request), item.request);
  } catch {
    return false;
  }
}
/** @param {HostStateStoreType} store @param {WorkIdentity} identity @returns {InitialSourceContinuationState} */
function readCurrentState(store, identity) {
  const host = store.readHostStateSnapshot(identity);
  const journal = store.readWorkSessionJournal(identity);
  if (
    !host.work ||
    !host.ledger ||
    !host.workVersion ||
    !host.ledgerVersion ||
    !Number.isSafeInteger(host.maintenanceGeneration) ||
    !journal ||
    !isInitialUnissuedJournal(journal.state) ||
    journal.attempt !== journal.state.attempt
  )
    throw new Error('initial source continuation: current Work, Ledger or Journal is unavailable');
  return {
    work: host.work,
    ledger: host.ledger,
    journal: journal.state,
    workVersion: host.workVersion,
    ledgerVersion: host.ledgerVersion,
    journalVersion: journal.version,
    maintenanceGeneration: host.maintenanceGeneration,
  };
}
/**
 * @param {{
 *   root: string,
 *   access: SafeRepositoryAccess,
 *   identity: WorkIdentity,
 *   attempt: number,
 *   nativeSessionHandle: string,
 *   state: InitialSourceContinuationState,
 *   requestPath: string,
 *   requestBytes: Buffer,
 *   expectedRequest?: InitialSourceContinuationRequest
 * }} input
 */
function observeVerifiedCurrent({
  root,
  access,
  identity,
  attempt,
  nativeSessionHandle,
  state,
  requestPath,
  requestBytes,
  expectedRequest,
}) {
  const { work, ledger, journal } = state;
  requireInitial(work && ledger && journal, 'current Host state is incomplete');
  const { config } = loadBoundProject(root, identity);
  const configDigest = runtimeConfigDigest(config);
  requireInitial(
    configDigest === work.binding.config_digest,
    'current project configuration differs from the original Work',
  );

  const intakeReferences = work.artifacts.filter((reference) => reference.artifact_id === 'local-session-intake');
  const intakeReference = intakeReferences[0];
  requireInitial(
    intakeReferences.length === 1 && intakeReference?.schema === 'VidaLocalSessionIntake/v1',
    'the exact retained local session intake is unavailable',
  );
  if (!intakeReference) throw new Error('initial source continuation: retained intake reference is unavailable');
  const intakeBytes = readBoundedBytes(access, intakeReference.path, 'protected local session intake', 32768);
  const intakeSha256 = sha256(intakeBytes);
  requireInitial(intakeSha256 === intakeReference.sha256, 'protected local session intake changed');
  const intakeRecord = parsePlainJson(intakeBytes, 'protected local session intake');
  requireInitial(
    intakeRecord.schema === 'VidaLocalSessionIntake/v1' &&
      intakeRecord.native_session_handle === nativeSessionHandle &&
      intakeRecord.scope_path === work.contracts.scope.path &&
      intakeRecord.acceptance_path === work.contracts.acceptance.path &&
      intakeRecord.source_authorization_path,
    'protected intake does not bind the original owner and accepted contracts',
  );
  const admittedIntake = readAdmittedSessionIntakeForWork(root, work);
  requireInitial(
    admittedIntake.native_session_handle === nativeSessionHandle &&
      same(admittedIntake.work_item, intakeRecord.work_item) &&
      same(admittedIntake.runtime_code_paths, intakeRecord.runtime_code_paths),
    'retained intake identity or accepted work item differs',
  );

  requireInitial(
    work.contracts.scope.schema === 'ImplementationScope/v1' &&
      work.contracts.acceptance.schema === 'AcceptanceManifest/v1',
    'accepted Scope or Acceptance contract is unavailable',
  );
  const scopeBytes = readBoundedBytes(
    access,
    work.contracts.scope.path,
    'protected accepted Scope',
    MAX_CANONICAL_BYTES,
  );
  const acceptanceBytes = readBoundedBytes(
    access,
    work.contracts.acceptance.path,
    'protected accepted Acceptance',
    MAX_CANONICAL_BYTES,
  );
  requireInitial(
    sha256(scopeBytes) === work.contracts.scope.sha256 && sha256(acceptanceBytes) === work.contracts.acceptance.sha256,
    'accepted Scope or Acceptance bytes changed',
  );

  const approvals = work.lifecycle.references.filter(
    (reference) =>
      reference.kind === 'execution_approval' &&
      reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      reference.decision === 'approved' &&
      reference.disposition === 'current',
  );
  const sourceAuthorizationReference = approvals[0];
  requireInitial(
    approvals.length === 1 && sourceAuthorizationReference !== undefined,
    'the original Source permission is missing or ambiguous',
  );
  if (!sourceAuthorizationReference)
    throw new Error('initial source continuation: retained Source permission is unavailable');
  requireInitial(
    sourceAuthorizationReference.path === intakeRecord.source_authorization_path &&
      sourceAuthorizationReference.scope_id === work.binding.scope_id &&
      sourceAuthorizationReference.source_revision === work.binding.work_source_revision,
    'the retained Source permission does not bind the original intake and scope',
  );
  const sourceAuthorization = readLocalSourceWriteAuthorization(root, sourceAuthorizationReference.path);
  const authority = sourceAuthorization.authorization;
  requireInitial(
    sourceAuthorization.sha256 === sourceAuthorizationReference.sha256 &&
      authority.action === 'source.write' &&
      authority.work_id === identity.work_id &&
      authority.attempt === attempt &&
      authority.native_session_handle === nativeSessionHandle &&
      authority.scope_digest === work.binding.work_source_revision &&
      authority.config_digest === work.binding.config_digest &&
      authority.workflow_id === work.binding.workflow_id &&
      authority.user_instruction_ref === sourceAuthorizationReference.record_id &&
      sourceAuthorizationReference.principal === 'local-session:' + canonicalJsonDigest(nativeSessionHandle) &&
      same(
        [...authority.implementation_paths].sort(compareText),
        [...work.binding.implementation_paths].sort(compareText),
      ),
    'the original attributable Source permission or its binding changed',
  );

  const runtimePaths = runtimePackageCodePaths(config.runtime.bundle);
  const runtimeSnapshot = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, runtimePaths);
  const sourcePaths = [...work.lifecycle.scope.allowed_paths].sort(compareText);
  const currentSourceScope = snapshotDeclaredSources(access, sourcePaths);
  requireInitial(
    journal.source_scope && journal.source_scope.digest === work.binding.work_source_revision,
    'original Journal Source scope is unavailable',
  );
  const sourceChanges = compareScopedSourceSnapshots(journal.source_scope, currentSourceScope);
  const documentationPaths = new Set(work.lifecycle.scope.documentation_paths ?? []);
  requireInitial(
    sourceChanges.length > 0 && sourceChanges.every((change) => documentationPaths.has(change.path)),
    'current Source changes are not limited to accepted documentation paths',
  );
  validateContinuationSourceChangePaths(work, sourceChanges);
  const authorizedSourceChanges = expectedRequest?.authorizedSourceChanges ?? sourceChanges;
  requireInitial(
    same(sourceChanges, authorizedSourceChanges),
    'current Source changes differ from the frozen accepted documentation bridge',
  );
  validateCurrentSourceScopeBridge({
    original: journal.source_scope,
    current: currentSourceScope,
    authorizedChanges: authorizedSourceChanges,
  });

  const selection = parseWorkItemSelection(admittedIntake.work_item, work.binding.team_id);
  const lifecycleRisk = work.lifecycle.risk;
  const runId = work.execution.run_id;
  if (typeof runId !== 'string' || runId.length === 0)
    throw new Error('initial source continuation: original run ID is unavailable');
  if (lifecycleRisk !== 'low' && lifecycleRisk !== 'medium' && lifecycleRisk !== 'high')
    throw new Error('initial source continuation: original lifecycle risk is unavailable');
  requireInitial(
    selectWorkflow(config, selection).workflow_id === work.binding.workflow_id,
    'current project configuration no longer selects the original workflow',
  );
  const priorEngineSnapshot = readSessionEngineSnapshot({
    repositoryRoot: root,
    config,
    selection,
    context: {
      work_id: identity.work_id,
      attempt,
      scope_digest: journal.source_scope.digest,
    },
    workflowId: work.binding.workflow_id,
    runId,
    lifecycleRisk,
  });
  requireInitial(
    priorEngineSnapshot &&
      priorEngineSnapshot.run_id === runId &&
      priorEngineSnapshot.status === 'suspended' &&
      priorEngineSnapshot.step_id === 'wave-0' &&
      same(
        priorEngineSnapshot.requests,
        journal.items.map((item) => item.request),
      ),
    'retained initial engine snapshot differs from the original unissued Journal',
  );
  const currentInitialRequest = projectCurrentInitialSourceRequest({
    repositoryRoot: root,
    config,
    selection,
    workId: identity.work_id,
    attempt,
    workflowId: work.binding.workflow_id,
    runId,
    currentSourceScope,
  });

  if (expectedRequest) {
    validateInitialSourceContinuationRequest(expectedRequest, state, config);
    requireInitial(
      expectedRequest.configDigest === configDigest &&
        expectedRequest.currentRuntimeCodeDigest === runtimeSnapshot.digest &&
        same(expectedRequest.currentSourceScope, currentSourceScope) &&
        same(expectedRequest.authorizedSourceChanges, sourceChanges) &&
        same(expectedRequest.sourceAuthorizationReference, sourceAuthorizationReference) &&
        expectedRequest.sourceAuthorizationSha256 === sourceAuthorization.sha256 &&
        same(expectedRequest.priorEngineSnapshot, priorEngineSnapshot) &&
        same(expectedRequest.currentInitialRequest, currentInitialRequest),
      'current config, runtime, Source, permission, intake, engine or request differs from inspection',
    );
  }
  requireInitial(
    access.readBytes(requestPath, 'initial source continuation request stability').equals(requestBytes),
    'request bytes changed during continuation inspection',
  );
  return {
    config,
    sourceChanges,
    verifiedCurrent: {
      configDigest,
      currentRuntimeCodeDigest: runtimeSnapshot.digest,
      currentSourceScope,
      sourceAuthorizationReference,
      sourceAuthorizationSha256: sourceAuthorization.sha256,
      intakeReference,
      intakeSha256,
      priorEngineSnapshot,
      currentInitialRequest,
    },
  };
}

/**
 * @param {'initial_source_continuation_already_ready' | 'initial_source_continuation_applied'} status
 * @param {InitialSourceContinuationReceipt} receipt
 */
function receiptResult(status, receipt) {
  return {
    status,
    continuation_id: receipt.continuation_id,
    request_digest: receipt.request_digest,
    work_version: receipt.work_version,
    ledger_version: receipt.ledger_version,
    journal_version: receipt.journal_version,
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
  };
}

/** Inspect derives the exact request; apply commits only that request through HostState CAS. */
/** @param {readonly string[]} args */
export function continueInitialSource(args) {
  const mode = args[1];
  const root = args[3];
  const requestArgument = args[5];
  if (
    args.length !== 6 ||
    args[0] !== '--mode' ||
    args[2] !== '--project-root' ||
    args[4] !== '--request' ||
    typeof mode !== 'string' ||
    typeof root !== 'string' ||
    typeof requestArgument !== 'string'
  )
    throw new Error('initial source continuation: usage: --mode inspect|apply --project-root ABS --request REL');
  const inspecting = mode === 'inspect';
  if (!inspecting && mode !== 'apply') throw new Error('initial source continuation: mode must be inspect or apply');
  validateRoot(root);
  const requestPath = validateRelativeRequestPath(requestArgument);
  const access = requireSafeRepositoryAccess(root);
  const requestBytes = readBoundedBytes(
    access,
    requestPath,
    'initial source continuation request',
    inspecting ? 32768 : MAX_CANONICAL_BYTES,
  );
  const input = freezeJsonValue(parsePlainJson(requestBytes, 'initial source continuation request'));
  const { identity, attempt, nativeSessionHandle } = validateIdentity(
    input.identity,
    input.attempt,
    input.nativeSessionHandle,
  );
  if (inspecting) {
    requireInitial(
      exactKeys(input, ['identity', 'attempt', 'nativeSessionHandle']),
      'inspection accepts only identity, attempt and nativeSessionHandle',
    );
  } else {
    requireInitial(
      input.schema === 'InitialSourceContinuationRequest/v1',
      'apply requires the typed request returned by inspect',
    );
  }
  const { config } = loadBoundProject(root, identity);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const hostFile = sessionHandoffDatabasePath(root, config);
  const hostRelative = path.relative(root, hostFile).split(path.sep).join('/');
  requireInitial(
    hostRelative && hostRelative !== '..' && !hostRelative.startsWith('../') && !path.isAbsolute(hostRelative),
    'configured Host database is outside the project root',
  );
  access.readBytes(hostRelative, 'configured Host database');
  const database = new Database(hostFile, { readonly: inspecting, strict: true });
  try {
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const retained = store.readInitialSourceContinuationReceipt(identity, attempt);
    if (retained) {
      const receipt = validateInitialSourceContinuationReceipt(retained);
      requireInitial(
        same(receipt.request.identity, identity) &&
          receipt.request.attempt === attempt &&
          receipt.request.nativeSessionHandle === nativeSessionHandle,
        'retained continuation belongs to another request',
      );
      if (!inspecting)
        requireInitial(same(receipt.request, input), 'a different request already owns this continuation');
      requireInitial(
        access.readBytes(requestPath, 'initial source continuation request stability').equals(requestBytes),
        'request bytes changed during receipt inspection',
      );
      return receiptResult('initial_source_continuation_already_ready', receipt);
    }

    if (inspecting) {
      const state = readCurrentState(store, identity);
      const observed = observeVerifiedCurrent({
        root,
        access,
        identity,
        attempt,
        nativeSessionHandle,
        state,
        requestPath,
        requestBytes,
      });
      /** @type {InitialSourceContinuationRequest} */
      const request = {
        schema: 'InitialSourceContinuationRequest/v1',
        identity,
        attempt,
        nativeSessionHandle,
        expectedWork: state.workVersion,
        expectedLedger: state.ledgerVersion,
        expectedJournal: state.journalVersion,
        expectedMaintenanceGeneration: state.maintenanceGeneration,
        configDigest: observed.verifiedCurrent.configDigest,
        priorRuntimeCodeDigest: state.work.binding.runtime_code_digest,
        currentRuntimeCodeDigest: observed.verifiedCurrent.currentRuntimeCodeDigest,
        currentSourceScope: observed.verifiedCurrent.currentSourceScope,
        authorizedSourceChanges: observed.sourceChanges,
        sourceAuthorizationReference: observed.verifiedCurrent.sourceAuthorizationReference,
        sourceAuthorizationSha256: observed.verifiedCurrent.sourceAuthorizationSha256,
        priorEngineSnapshot: observed.verifiedCurrent.priorEngineSnapshot,
        currentInitialRequest: observed.verifiedCurrent.currentInitialRequest,
      };
      freezeJsonValue(request);
      validateInitialSourceContinuationRequest(request, state, observed.config);
      requireInitial(
        access.readBytes(requestPath, 'initial source continuation request stability').equals(requestBytes),
        'inspection request bytes changed while deriving the typed request',
      );
      return {
        status: 'initial_source_continuation_ready',
        request,
        next_operation: 'apply',
        rights_granted: false,
        accepted_result: false,
        runtime_acceptance: false,
      };
    }

    const before = readCurrentState(store, identity);
    const request = validateInitialSourceContinuationRequest(input, before, config);
    /** @param {InitialSourceContinuationState} state */
    const verifyApply = (state) => {
      const observed = observeVerifiedCurrent({
        root,
        access,
        identity,
        attempt,
        nativeSessionHandle,
        state,
        requestPath,
        requestBytes,
        expectedRequest: request,
      });
      return observed.verifiedCurrent;
    };
    verifyApply(before);
    const receipt = validateInitialSourceContinuationReceipt(store.continueInitialSource(request, verifyApply));
    return receiptResult('initial_source_continuation_applied', receipt);
  } finally {
    database.close(true);
  }
}
