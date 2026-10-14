import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import path from 'node:path';
import type { Buffer } from 'node:buffer';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import type { AgentRuntimeConfig, WorkItemSelection } from '../src/config/runtime-config.ts';
import type { HostStateStore, WorkIdentity } from '../src/host-state.ts';
import type {
  InitialSourceContinuationRequest,
  InitialSourceContinuationReceipt,
  InitialSourceContinuationState,
} from '../src/orchestration/initial-source-continuation.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import type { ScopedSourceSnapshot } from '../src/orchestration/scoped-source-snapshot.ts';

// Four parent segments from this private artifact reach the repository root.
// Keep that root anchor when rebasing this research artifact.
import { createHash } from 'node:crypto';
import { lstatSync, realpathSync } from 'node:fs';
import { parseSessionBridgeRequest } from '../src/orchestration/mastra-session-bridge-contract.ts';
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

import { sessionHandoffDatabasePath } from '../src/config/project-paths.ts';
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

const requireInitial: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw Error('initial source continuation: ' + message);
};
const same = (left: unknown, right: unknown): boolean => canonicalJsonDigest(left) === canonicalJsonDigest(right);
const compareText = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const keys = (value: Record<string, unknown>): string => Object.keys(value).sort(compareText).join(',');
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

function exactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  return isPlainRecord(value) && keys(value) === [...expected].sort(compareText).join(',');
}

function readBoundedBytes(access: SafeRepositoryAccess, relativePath: string, label: string, limit: number): Buffer {
  const bytes = access.readBytes(relativePath, label);
  requireInitial(bytes.length > 0 && bytes.length <= limit, label + ' exceeds its byte bound');
  return bytes;
}

function parsePlainJson(bytes: Buffer, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw Error(label + ' is not valid JSON');
  }
  requireInitial(isPlainRecord(value), label + ' must be a plain JSON record');
  return value;
}

function validateRelativeRequestPath(value: unknown): string {
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

function validateRoot(root: string): void {
  requireInitial(
    typeof root === 'string' && path.isAbsolute(root) && path.resolve(root) === root,
    'project root must be an absolute canonical path',
  );
  let stat: ReturnType<typeof lstatSync>;
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

function isWorkItemKind(value: unknown): value is WorkItemSelection['kind'] {
  return typeof value === 'string' && ['epic', 'feature', 'pbi', 'story', 'bug', 'task', 'research'].includes(value);
}

function isFlowIntent(value: unknown): value is WorkItemSelection['intent'] {
  return (
    typeof value === 'string' &&
    ['information_research', 'implementation_new', 'implementation_change', 'bug_fix', 'task_execution'].includes(value)
  );
}

function isTextList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 64 &&
    value.every((entry: unknown) => typeof entry === 'string' && entry.length > 0)
  );
}

export function parseWorkItemSelection(value: unknown, team: string): WorkItemSelection {
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
function isWorkIdentity(value: unknown): value is WorkIdentity {
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

function validateIdentity(
  identity: unknown,
  attempt: unknown,
  nativeSessionHandle: unknown,
): { identity: WorkIdentity; attempt: number; nativeSessionHandle: string } {
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

function loadBoundProject(
  root: string,
  identity: WorkIdentity,
): { config: AgentRuntimeConfig; project: ReturnType<typeof loadProjectSetContext> } {
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

function isScopedSourceEntries(value: unknown): value is ScopedSourceSnapshot['entries'] {
  if (!Array.isArray(value)) return false;
  let priorPath: string | null = null;
  for (let index = 0; index < value.length; index++) {
    const entry: unknown = value[index];
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

function isScopedSourceSnapshot(value: unknown): value is ScopedSourceSnapshot {
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

function isInitialUnissuedJournal(value: unknown): value is MastraSessionLedgerState {
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
  const item: unknown = value.items[0];
  if (!exactKeys(item, ['request', 'issue_id', 'observation']) || item.issue_id !== null || item.observation !== null)
    return false;
  try {
    return same(parseSessionBridgeRequest(item.request), item.request);
  } catch {
    return false;
  }
}
function readCurrentState(store: HostStateStore, identity: WorkIdentity): InitialSourceContinuationState {
  const captured = store.readWorkSessionSnapshot(identity);
  const host = captured.host;
  const journal = captured.journal;
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
}: {
  root: string;
  access: SafeRepositoryAccess;
  identity: WorkIdentity;
  attempt: number;
  nativeSessionHandle: string;
  state: InitialSourceContinuationState;
  requestPath: string;
  requestBytes: Buffer;
  expectedRequest?: InitialSourceContinuationRequest;
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

function receiptResult(
  status: 'initial_source_continuation_already_ready' | 'initial_source_continuation_applied',
  receipt: InitialSourceContinuationReceipt,
) {
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

export function continueInitialSource(args: readonly string[]) {
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
  const database = openCliWorkspaceDatabase(root, hostFile, workspaceId, inspecting);
  try {
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
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
      const request: InitialSourceContinuationRequest = {
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
    const verifyApply = (state: InitialSourceContinuationState) => {
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
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
