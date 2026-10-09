import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
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
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { resumePausedLocalWork } from '../src/orchestration/resume-paused-local-work.ts';
import {
  compareScopedSourceSnapshots,
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
  validateClosedConfigRebindProof,
  validateContinuationSourceChangePaths,
  validateDeliveredWorkContinuationRequest,
} from '../src/orchestration/delivered-work-continuation.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  runRuntimeConfigRebind,
  readAppliedRuntimeConfigRebind,
  currentNativeSelfAttestation,
} from './runtime-config-rebind.mjs';
import {
  readRetainedUnissuedSessionEngineSnapshot,
  readInitialSourceContinuationSessionEngineSnapshot,
} from '../src/orchestration/session-engine-snapshot.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { releaseState, releaseJournalFile, releasePath } from './local-release-artifacts.mjs';
import {
  validateInitialSourceFrontierCodeRebindRequest,
  validateInitialSourceFrontierCodeRebindVerifiedCurrent,
} from '../src/orchestration/initial-source-frontier-code-rebind.ts';
import { parseWorkItemSelection } from './continue-initial-source.mjs';

/** @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} AgentRuntimeConfig */
/** @typedef {import('../src/config/runtime-config.ts').WorkItemSelection} WorkItemSelection */
/** @typedef {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} SafeRepositoryAccess */
/** @typedef {import('../src/host-state.ts').HostStateSnapshot} HostStateSnapshot */
/** @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity */
/** @typedef {import('../src/host-state.ts').StateVersion} StateVersion */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} MastraSessionLedgerState */
/** @typedef {import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot} ScopedSourceSnapshot */
/** @typedef {import('../src/orchestration/initial-source-continuation.ts').InitialSourceContinuationReceipt} InitialSourceContinuationReceipt */
/** @typedef {import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindRequest} InitialSourceFrontierCodeRebindRequest */
/** @typedef {import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindVerifiedCurrent} InitialSourceFrontierCodeRebindVerifiedCurrent */
/** @typedef {import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindReceipt} InitialSourceFrontierCodeRebindReceipt */
/** @typedef {import('bun:sqlite').Database} SqliteDatabase */

/**
 * @typedef {object} InitialSourceFrontierPlan
 * @property {'InitialSourceFrontierCodeRebindPlan/v1'} schema
 * @property {string} repair_id
 * @property {InitialSourceFrontierCodeRebindRequest} request
 * @property {InitialSourceFrontierCodeRebindVerifiedCurrent} endpoint_proof
 * @property {string} digest
 */

/** @param {unknown} ok @param {string} message @returns {asserts ok} */
function requireRebind(ok, message) {
  if (!ok) throw new Error(`vida runtime-code rebind: ${message}`);
}
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const hash = /^[a-f0-9]{64}$/;
const planningKeys = [
  '--kind',
  '--mode',
  '--project-root',
  '--repair-id',
  '--actor',
  '--timestamp',
  '--projects',
  '--work-id',
  '--attempt',
  '--action-id',
  '--issue-id',
  '--native-handle',
  '--forward-operation-id',
  '--owner-no-call-ref',
];
const deliveredContinuationPlanningKeys = planningKeys.concat(['--basis', '--source-transition-id']);
const configuredFrontierPlanningKeys = planningKeys
  .filter((key) => !['--action-id', '--issue-id', '--forward-operation-id'].includes(key))
  .concat([
    '--basis',
    '--source-transition-id',
    '--parent-manifest',
    '--successor-manifest',
    '--system-update',
    '--source-correction',
  ]);
const synthesisPlanningKeys = planningKeys
  .filter((key) => key !== '--owner-no-call-ref')
  .concat(['--basis', '--correction-id', '--owner-correction-ref']);
const focusedPlanningKeys = planningKeys
  .filter((key) => key !== '--owner-no-call-ref')
  .concat(['--basis', '--owner-correction-ref']);
const applyingKeys = ['--kind', '--mode', '--project-root', '--repair-id'];
const initialSourceFrontierPlanningKeys = [
  '--kind',
  '--basis',
  '--mode',
  '--project-root',
  '--repair-id',
  '--projects',
  '--work-id',
  '--attempt',
  '--action-id',
  '--parent-manifest',
  '--successor-manifest',
  '--system-update',
];
const initialSourceFrontierApplyingKeys = ['--kind', '--basis', '--mode', '--project-root', '--repair-id'];
const planPath = (id) => `.agent/work/${id}/runtime-code-rebind-plan.v1.json`;
const initialSourceFrontierPlanPath = (id) => `.agent/work/${id}/initial-source-frontier-code-rebind-plan.v1.json`;
const deliveredContinuationPlanPath = (id) => `.agent/work/${id}/delivered-work-continuation-plan.v1.json`;

function parse(args) {
  requireRebind(args.length % 2 === 0, 'arguments must be paired');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireRebind(
      args[index]?.startsWith('--') && args[index + 1] && !Object.hasOwn(values, args[index]),
      'arguments invalid',
    );
    values[args[index]] = args[index + 1];
  }
  requireRebind(
    values['--kind'] === 'runtime-code' &&
      (['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']) ||
        (values['--basis'] === 'execution-continuation' && values['--mode'] === 'refresh')) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      identifier.test(values['--repair-id'] ?? ''),
    'kind, mode, root or repair ID invalid',
  );
  if (values['--basis'] === 'initial-source-frontier')
    requireRebind(['inspect', 'plan', 'apply'].includes(values['--mode']), 'initial-source frontier mode invalid');
  if (values['--basis'] === 'execution-continuation') {
    const expected = ['inspect', 'plan', 'refresh'].includes(values['--mode'])
      ? [
          '--kind',
          '--basis',
          '--mode',
          '--project-root',
          '--repair-id',
          '--projects',
          '--work-id',
          '--attempt',
          '--parent-manifest',
          '--parent-install',
          '--successor-manifest',
          '--system-update',
          ...(values['--mode'] === 'refresh' ? ['--expected-request-id'] : []),
        ]
      : ['--kind', '--basis', '--mode', '--project-root', '--repair-id'];
    requireRebind(
      ['inspect', 'plan', 'apply', 'refresh'].includes(values['--mode']) &&
        JSON.stringify(Object.keys(values).sort()) === JSON.stringify(expected.sort()),
      'execution continuation arguments invalid',
    );
    return values;
  }
  const expected = ['inspect', 'plan'].includes(values['--mode'])
    ? values['--basis'] === 'initial-source-frontier'
      ? initialSourceFrontierPlanningKeys
      : values['--basis'] === 'configured-frontier-continuation'
        ? configuredFrontierPlanningKeys
        : values['--basis'] === 'delivered-config-continuation'
          ? deliveredContinuationPlanningKeys
          : values['--basis'] === 'known-terminal-verify'
            ? focusedPlanningKeys
            : values['--basis'] === 'synthesis-correction'
              ? synthesisPlanningKeys
              : planningKeys
    : values['--basis'] === 'initial-source-frontier'
      ? initialSourceFrontierApplyingKeys
      : applyingKeys;
  requireRebind(
    JSON.stringify(Object.keys(values).sort()) === JSON.stringify([...expected].sort()),
    'missing or unexpected arguments',
  );
  return values;
}

/** @param {string} root @param {AgentRuntimeConfig} config @param {boolean} readonly @returns {SqliteDatabase} */
function trustedDatabase(root, config, readonly) {
  const access = requireSafeRepositoryAccess(root);
  access.assertDirectory(config.control.work_root, 'runtime-code rebind work root');
  const relative = `${config.control.work_root}/session-handoff.v1.sqlite`;
  requireRebind(access.fileExists(relative, 'runtime-code rebind database'), 'database absent or unsafe');
  const file = sessionHandoffDatabasePath(root, config);
  const stat = lstatSync(file);
  requireRebind(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
    'database must be a single-link regular file',
  );
  return new Database(file, { readonly, strict: true });
}

/**
 * @param {SafeRepositoryAccess} access
 * @param {string} relative
 * @param {string} label
 * @returns {{bytes: ReturnType<SafeRepositoryAccess['readBytes']>, value: unknown}}
 */
function validatedJson(access, relative, label) {
  const bytes = access.readBytes(relative, label);
  requireRebind(bytes.length <= 8 * 1024 * 1024, `${label} exceeds bound`);
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

/** Source-repository adapter: actual local commit bytes, never remote-publication authority. */
export function assertCommittedSourceChanges(root, commit, changes) {
  requireRebind(
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(commit) && Array.isArray(changes) && changes.length <= 1024,
    'committed Source proof input is invalid',
  );
  const selected = new Map();
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
        (entry.exists
          ? Number.isSafeInteger(entry.bytes) &&
            entry.bytes >= 0 &&
            entry.bytes <= 8 * 1024 * 1024 &&
            hash.test(entry.sha256)
          : entry.bytes === null && entry.sha256 === null),
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
  const git = (args, input) => {
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
        ['100644', '100755'].includes(metadata[0]),
      'committed Source path is not an exact regular blob',
    );
    modes.set(relative, metadata[0]);
  }
  requireRebind(
    paths.every((relative) => modes.has(relative) === selected.get(relative).exists),
    'committed Source existence differs',
  );
  const present = paths.filter((relative) => selected.get(relative).exists);
  if (present.length > 0) {
    const stream = git(['cat-file', '--batch'], present.map((relative) => commit + ':' + relative + '\n').join(''));
    let offset = 0,
      totalBytes = 0;
    for (const relative of present) {
      const end = stream.indexOf(10, offset),
        entry = selected.get(relative);
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

function forwardLineage(root, operationChain, paths, oldDigest, newDigest) {
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
    operations.every(
      (operation, index) => index === 0 || sha(operations[index - 1].successor.bytes) === sha(operation.parent.bytes),
    ),
    'forward operations do not form one exact manifest chain',
  );
  const parent = operations[0].parent;
  const successor = operations.at(-1).successor;
  const selector = validatedJson(access, '.agent/active-runtime-selector.v1.json', 'active runtime selector').value;
  const oldManifestDigest = sha(parent.bytes);
  const newManifestDigest = sha(successor.bytes);
  requireRebind(
    selector.payload_manifest_sha256 === newManifestDigest,
    'installed forward lineage or selector differs',
  );
  const entriesFor = (manifest) =>
    paths.map((relative) => {
      const matches = manifest.value.files.filter((entry) => entry.path === relative);
      requireRebind(
        matches.length === 1 && Number.isSafeInteger(matches[0].size) && hash.test(matches[0].sha256),
        'runtime path missing from exact forward manifest',
      );
      return { path: relative, exists: true, bytes: matches[0].size, sha256: matches[0].sha256 };
    });
  const from = canonicalJsonDigest({ schema: 'ScopedSourceSnapshot/v1', entries: entriesFor(parent) });
  const to = canonicalJsonDigest({ schema: 'ScopedSourceSnapshot/v1', entries: entriesFor(successor) });
  requireRebind(
    from === oldDigest && to === newDigest && from !== to,
    'runtime-code digests differ from forward manifests',
  );
  return { parentManifestDigest: oldManifestDigest, successorManifestDigest: newManifestDigest };
}

function checkedRow(database, table, where, args) {
  const row = database.query(`SELECT revision,payload,digest FROM ${table} WHERE ${where}`).get(...args);
  requireRebind(row && Number.isSafeInteger(row.revision) && row.revision > 0, `${table} row missing`);
  const value = JSON.parse(row.payload);
  requireRebind(canonicalJsonDigest(value) === row.digest, `${table} row digest differs`);
  return { value, version: { revision: row.revision, digest: row.digest } };
}

/** Read-only plan; only exact installed forward bytes may change the intake-pinned runtime digest. */
export function planRuntimeCodeRebind({
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
}) {
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
      (focusedFailureCorrection
        ? typeof ownerCorrectionPointer === 'string' &&
          ownerCorrectionPointer.trim().length > 0 &&
          ownerCorrectionPointer.length <= 2048 &&
          ownerNoCallPointer === undefined &&
          correctionId === undefined
        : correctionId
          ? identifier.test(correctionId) &&
            typeof ownerCorrectionPointer === 'string' &&
            ownerCorrectionPointer.length > 0 &&
            ownerCorrectionPointer.length <= 2048 &&
            !/\p{Cc}/u.test(ownerCorrectionPointer) &&
            ownerNoCallPointer === undefined
          : typeof ownerNoCallPointer === 'string' &&
            ownerNoCallPointer.length > 0 &&
            ownerNoCallPointer.length <= 2048 &&
            !/\p{Cc}/u.test(ownerNoCallPointer) &&
            ownerCorrectionPointer === undefined) &&
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
  const key = JSON.stringify([identity.repository_id, identity.project_ids, identity.integrations_digest, workId]);
  const work = checkedRow(database, 'agent_host_state', "workspace_id=? AND kind='work' AND id=?", [workspaceId, key]);
  const ledger = checkedRow(database, 'agent_host_state', "workspace_id=? AND kind='ledger' AND id='shared'", [
    workspaceId,
  ]);
  const journal = checkedRow(
    database,
    'agent_host_mastra_session_ledger',
    'workspace_id=? AND work_id=? AND attempt=?',
    [workspaceId, workId, attempt],
  );
  const owner = work.value;
  const state = journal.value;
  const item = [...state.items, ...state.completed.flatMap((wave) => wave.items)].find(
    (entry) => entry.request?.action_id === actionId,
  );
  const stage = config.workflows[item?.request.workflow_id]?.stages.find(
    (entry) => entry.id === item?.request.stage_id,
  );
  const assignment = stage?.assignments[item?.request.assignment_index];
  const profile = config.agents.profiles[assignment?.profile];
  const toolPolicy = config.agents.tool_policies[profile?.tools_policy];
  const dispatchRow =
    focusedFailureCorrection || correctionId
      ? null
      : database
          .query(
            'SELECT payload,digest FROM agent_host_readonly_dispatch_activation WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=?',
          )
          .get(workspaceId, workId, attempt, actionId);
  const dispatch = dispatchRow && JSON.parse(dispatchRow.payload);
  const repairRow =
    dispatch &&
    Number.isSafeInteger(dispatch.generation) &&
    database
      .query(
        'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=?',
      )
      .get(workspaceId, workId, attempt, actionId, dispatch.generation);
  const repair = repairRow && JSON.parse(repairRow.payload);
  const { digest: _repairDigest, ...repairBody } = repair ?? {};
  const correctionRow =
    correctionId &&
    database
      .query(
        'SELECT payload,digest FROM agent_host_synthesis_observation_correction WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      )
      .get(workspaceId, workId, attempt, actionId);
  const correction = correctionRow && JSON.parse(correctionRow.payload);
  const { digest: _correctionDigest, ...correctionBody } = correction ?? {};
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
          selectCorrectiveEvidence(state, config.workflows[owner.binding.workflow_id]).failed.some(
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
              correction.original_item.issue_id === issueId &&
              correction.original_item.observation?.status === 'reported_complete' &&
              canonicalJsonDigest(correction.original_item.request) === canonicalJsonDigest(item.request) &&
              correction.config_digest === runtimeConfigDigest(config) &&
              correction.source_digest === state.source_scope.digest
            : dispatch &&
              canonicalJsonDigest(dispatch) === dispatchRow.digest &&
              dispatch.schema === 'VidaReadOnlyDispatchActivation/v1' &&
              dispatch.logical_action_id === actionId &&
              dispatch.issue_id === issueId &&
              repair &&
              repair.schema === 'VidaReadOnlyDispatchRepairPlan/v1' &&
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
  const intakeValue = JSON.parse(intakeBytes.toString('utf8'));
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
  const request = {
    identity,
    attempt,
    actionId,
    issueId,
    nativeSessionHandle: nativeHandle,
    expectedWork: work.version,
    expectedLedger: ledger.version,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: new HostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    ).readHostStateSnapshot(identity).maintenanceGeneration,
    oldRuntimeCodeDigest: oldDigest,
    newRuntimeCodeDigest: newDigest,
    forwardOperationId,
    parentManifestDigest: lineage.parentManifestDigest,
    successorManifestDigest: lineage.successorManifestDigest,
    ...(focusedFailureCorrection
      ? { focusedFailureCorrection: { ownerCorrectionPointer } }
      : correctionId
        ? { synthesisCorrection: { correctionId, correctionDigest: correction.digest, ownerCorrectionPointer } }
        : { ownerNoCallPointer }),
  };
  const body = {
    schema: 'VidaRuntimeCodeRebindPlan/v1',
    repair_id: repairId,
    actor,
    timestamp,
    runtime_code_paths: paths,
    lease_transition: paused ? 'resume_paused' : 'already_active',
    request,
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}

function readPlan(root, repairId) {
  const file = path.join(root, planPath(repairId));
  const stat = lstatSync(file);
  requireRebind(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'plan path unsafe');
  const plan = JSON.parse(readFileSync(file, 'utf8'));
  const { digest, ...body } = plan;
  requireRebind(
    plan.schema === 'VidaRuntimeCodeRebindPlan/v1' &&
      plan.repair_id === repairId &&
      digest === canonicalJsonDigest(body),
    'frozen plan digest invalid',
  );
  return plan;
}

function writePlan(root, repairId, plan) {
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

function readDeliveredContinuationPlan(root, repairId) {
  const file = path.join(root, deliveredContinuationPlanPath(repairId));
  const stat = lstatSync(file);
  requireRebind(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'delivered continuation plan path unsafe');
  const plan = JSON.parse(readFileSync(file, 'utf8')),
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

function writeDeliveredContinuationPlan(root, repairId, plan) {
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

function sourceTransitionAuthorizedPaths(root, config, transitionId, proof) {
  const access = requireSafeRepositoryAccess(root),
    sidecarPath = `${config.control.work_root}/${transitionId}/runtime-config-source-correction-repair.v1.json`,
    artifact = validatedJson(access, sidecarPath, 'closed Source correction artifact').value,
    { digest, ...body } = artifact;
  requireRebind(
    artifact.schema === 'RuntimeConfigSourceCorrectionRepair/v1' &&
      artifact.operation_id === transitionId &&
      artifact.status === 'applied' &&
      digest === canonicalJsonDigest(body) &&
      artifact.request?.operation_id === transitionId &&
      artifact.completion &&
      proof.transition.operation_path ===
        `${config.control.work_root}/${transitionId}/runtime-config-delivery-operation.v1.json` &&
      canonicalJsonDigest(artifact.completion) === proof.transition_digest &&
      Array.isArray(artifact.request.authorized_changed_paths),
    'retained Source correction artifact differs from its closed transition proof',
  );
  return [...artifact.request.authorized_changed_paths].sort();
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
    runtimePaths = runtimePackageCodePaths(config.runtime.bundle),
    beforeCode = snapshotRuntimeManifestSources(parent.value, config.runtime.bundle, intake.runtime_code_paths),
    targetCode = snapshotRuntimeManifestSources(successor.value, config.runtime.bundle, runtimePaths),
    currentCode = snapshotRuntimePackageSources(runtimePackageAccess(), config.runtime.bundle, runtimePaths),
    native = successor.value,
    installation = update.value.installation_observation;
  requireRebind(
    beforeCode.digest === work.binding.runtime_code_digest &&
      targetCode.digest === currentCode.digest &&
      beforeCode.digest !== targetCode.digest &&
      native.schema === 'VidaStandaloneBuild/v1' &&
      native.pin === self.bun_version &&
      native.version === self.package_version &&
      native.payloadId === self.resource_payload_id &&
      native.asset?.sha256 === self.executable_sha256 &&
      native.asset?.bytes === self.executable_bytes &&
      update.value.status === 'CURRENT_SYSTEM_REPAIR_CHECKPOINT_UPDATED' &&
      identifier.test(update.value.operation_id) &&
      installation?.schema === 'VidaNativeInstallationResult/v1' &&
      ['install', 'update'].includes(installation.action) &&
      installation.runtime_accepted === false &&
      installation.cleanup_complete === true &&
      installation.sha256.toLowerCase() === self.executable_sha256 &&
      installation.bytes === self.executable_bytes &&
      installation.version === self.package_version &&
      path.resolve(installation.path) === path.resolve(self.executable_path) &&
      path.resolve(update.value.entry) === path.resolve(self.executable_path) &&
      update.value.version === self.package_version &&
      update.value.runtime_accepted === false &&
      update.value.developer_unblocked === false,
    'native endpoints, current package or actual installation differ',
  );
  const registeredUpdate = releaseState(releaseJournalFile(root, update.value.operation_id)),
    pendingUpdate = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  requireRebind(
    registeredUpdate.operation_id === update.value.operation_id &&
      pendingUpdate.operation_id === registeredUpdate.operation_id &&
      registeredUpdate.version === self.package_version &&
      pendingUpdate.version === registeredUpdate.version &&
      ['awaiting_assurance', 'qualified', 'packed', 'installing', 'successful'].includes(registeredUpdate.status),
    'native endpoint observation has no matching current release-owner operation',
  );
  const source = publication.value.source_inventory;
  requireRebind(
    /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(publication.value.commit) &&
      publication.value.project?.repository_id === identity.repository_id &&
      publication.value.project?.config_digest === runtimeConfigDigest(config) &&
      source &&
      Array.isArray(source.entries) &&
      source.entries.length > 0 &&
      source.entries.length <= 4096 &&
      source.source_binding === sha(Buffer.from(JSON.stringify(source.entries))),
    'published Source correction is invalid',
  );
  const published = new Map();
  for (const entry of source.entries) {
    requireRebind(
      entry &&
        Object.keys(entry).sort().join(',') === 'path,sha256' &&
        typeof entry.path === 'string' &&
        entry.path.length > 0 &&
        entry.path.length <= 512 &&
        !entry.path.startsWith('/') &&
        !/^[A-Za-z]:/.test(entry.path) &&
        !/[\\\p{Cc}]/u.test(entry.path) &&
        entry.path.split('/').every((part) => part && part !== '.' && part !== '..') &&
        hash.test(entry.sha256) &&
        !published.has(entry.path),
      'published Source correction entry is invalid',
    );
    published.set(entry.path, entry.sha256);
  }
  const runtimeSourceTargets = runtimeEndpointSourceTargets(config.runtime.bundle, beforeCode, targetCode, currentCode);
  requireRebind(
    runtimeSourceTargets.every((entry) =>
      entry.exists ? published.get(entry.path) === entry.sha256 : !published.has(entry.path),
    ),
    'runtime endpoint diff is outside the published correction',
  );
  const currentSourceScope = snapshotDeclaredSources(access, [...work.lifecycle.scope.allowed_paths].sort()),
    authorizedSourceChanges = compareScopedSourceSnapshots(journal.source_scope, currentSourceScope);
  validateContinuationSourceChangePaths(work, authorizedSourceChanges);
  requireRebind(
    authorizedSourceChanges.every((change) =>
      change.after.exists ? published.get(change.path) === change.after.sha256 : !published.has(change.path),
    ),
    'current task Source changes differ from the correction byte record',
  );
  // The byte report is a hint. Actual regular Git objects prove the commit bytes;
  // remote publication and installation-call provenance are not inferred from it.
  assertCommittedSourceChanges(root, publication.value.commit, [
    ...runtimeSourceTargets.map((entry) => ({ path: entry.path, after: entry })),
    ...authorizedSourceChanges,
  ]);
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
    system_update_operation_id: update.value.operation_id,
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
    self,
    sourceTransition,
  };
}

/** Plan a same-attempt unissued continuation from actual config and native endpoint evidence. */
export function planConfiguredFrontierContinuation({
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
}) {
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
    store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
    state = store.readHostStateSnapshot(identity),
    work = state.work,
    journalRow = checkedRow(
      database,
      'agent_host_mastra_session_ledger',
      'workspace_id=? AND work_id=? AND attempt=?',
      [workspaceId, workId, attempt],
    ),
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
    intake = intakeFile.value;
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
    update,
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
  const selection = {
    team: work.binding.team_id,
    kind: intake.work_item.canonical_kind,
    intent: intake.work_item.intent,
    project: intake.work_item.project_id,
    risk_flags: intake.work_item.risk_flags,
    labels: intake.work_item.labels,
  };
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
    forwardOperationId: update.value.operation_id,
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
  };
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
}) {
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
    store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
    state = store.readHostStateSnapshot(identity),
    work = state.work,
    journalRow = checkedRow(
      database,
      'agent_host_mastra_session_ledger',
      'workspace_id=? AND work_id=? AND attempt=?',
      [workspaceId, workId, attempt],
    ),
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
  const sourceTransition = await runRuntimeConfigRebind([
    '--kind',
    'runtime-config-delivery',
    '--mode',
    'repair-transition',
    '--project-root',
    root,
    '--repair-id',
    sourceTransitionId,
  ]);
  requireRebind(sourceTransition.status === 'closed_config_transition_proven', 'Source transition did not close');
  const sourceChangedPaths = sourceTransitionAuthorizedPaths(root, config, sourceTransitionId, sourceTransition),
    sourceAccess = requireSafeRepositoryAccess(root),
    intakeRef = work.artifacts.find(
      (ref) => ref.artifact_id === 'local-session-intake' && ref.schema === 'VidaLocalSessionIntake/v1',
    );
  requireRebind(intakeRef, 'original local session intake is missing');
  const intakeBytes = sourceAccess.readBytes(intakeRef.path, 'original local session intake'),
    intake = JSON.parse(intakeBytes.toString('utf8'));
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
    authorizedSourceChanges.every((change) => sourceChangedPaths.includes(change.path)),
    'current Work source drift is outside the accepted Source beforeimage paths',
  );
  const selection = {
    team: work.binding.team_id,
    kind: intake.work_item?.canonical_kind,
    intent: intake.work_item?.intent,
    project: intake.work_item?.project_id,
    risk_flags: intake.work_item?.risk_flags,
    labels: intake.work_item?.labels,
  };
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
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}

/** Apply one frozen delivered-work plan through the Host owner/CAS boundary. */
export async function applyDeliveredWorkContinuationPlan({ database, root, workspaceId, plan, rebuildPlan }) {
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
  const verifier = {
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
        principal: verifier.principal,
        transition_digest: request.sourceTransition.transition_digest,
        action_digest: canonicalJsonDigest(request.action),
      };
    },
  };
  const store = new HostStateStore(
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

function sameRepairIntent(left, right) {
  const stable = (plan) => {
    const { expectedWork, expectedLedger, expectedMaintenanceGeneration, ...request } = plan.request;
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

function currentPlan(database, root, config, workspaceId, plan) {
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
    ownerNoCallPointer: request.ownerNoCallPointer,
    correctionId: request.synthesisCorrection?.correctionId,
    ownerCorrectionPointer:
      request.focusedFailureCorrection?.ownerCorrectionPointer ?? request.synthesisCorrection?.ownerCorrectionPointer,
    focusedFailureCorrection: Boolean(request.focusedFailureCorrection),
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

/** @param {unknown} value @param {readonly string[]} keys @returns {value is Record<string, unknown>} */
function initialSourceFrontierExactKeys(value, keys) {
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
 * @param {unknown} value
 * @param {string} workspaceId
 * @param {string} workId
 * @param {number} attempt
 * @returns {value is MastraSessionLedgerState}
 */
function isInitialSourceFrontierJournal(value, workspaceId, workId, attempt) {
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
  const currentItems = /** @type {unknown[]} */ (value.items);
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

/** @param {string} root @param {string} repairId @returns {InitialSourceFrontierPlan} */
function readInitialSourceFrontierPlan(root, repairId) {
  const access = requireSafeRepositoryAccess(root),
    relative = initialSourceFrontierPlanPath(repairId),
    bytes = access.readBytes(relative, 'initial-source frontier code-rebind plan');
  requireRebind(bytes.length <= 1024 * 1024, 'initial-source frontier plan exceeds its byte bound');
  const parsed = /** @type {unknown} */ (JSON.parse(bytes.toString('utf8')));
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
      schema: /** @type {const} */ ('InitialSourceFrontierCodeRebindPlan/v1'),
      repair_id: repairId,
      request,
      endpoint_proof: endpointProof,
    };
  requireRebind(
    request.schema === 'InitialSourceFrontierCodeRebindRequest/v1' && parsed.digest === canonicalJsonDigest(body),
    'initial-source frontier plan digest differs',
  );
  return { ...body, digest: parsed.digest };
}

/** @param {string} root @param {string} repairId @param {InitialSourceFrontierPlan} plan */
function writeInitialSourceFrontierPlan(root, repairId, plan) {
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

/** @param {unknown} manifest @param {string} bundle @returns {string[]} */
function frontierManifestPaths(manifest, bundle) {
  requireRebind(
    isPlainRecord(manifest) &&
      manifest.schema === 'VidaStandaloneBuild/v1' &&
      Array.isArray(manifest.inputs) &&
      manifest.inputs.length > 0 &&
      manifest.inputs.length <= 2048,
    'native runtime manifest inventory is invalid',
  );
  const inputs = /** @type {unknown[]} */ (manifest.inputs);
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

/**
 * @param {{root: string, config: AgentRuntimeConfig, access: SafeRepositoryAccess, request: InitialSourceFrontierCodeRebindRequest, state: {host: HostStateSnapshot, journal: {version: StateVersion, state: MastraSessionLedgerState}, initialReceipt: InitialSourceContinuationReceipt}}} args
 * @returns {InitialSourceFrontierCodeRebindVerifiedCurrent}
 */
function readInitialSourceFrontierNativeEndpoint({ root, config, access, request, state }) {
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
    intake = /** @type {unknown} */ (intakeFile.value);
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
    state.journal,
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
    parentManifest = /** @type {unknown} */ (parent.value),
    successorManifest = /** @type {unknown} */ (successor.value),
    updateValue = /** @type {unknown} */ (update.value);
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
  const registeredUpdate = /** @type {unknown} */ (releaseState(releaseJournalFile(root, updateValue.operation_id))),
    pendingUpdate = /** @type {unknown} */ (
      releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'))
    );
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

/**
 * @param {{root: string, config: AgentRuntimeConfig, access: SafeRepositoryAccess, request: InitialSourceFrontierCodeRebindRequest, state: {host: HostStateSnapshot, journal: {version: StateVersion, state: MastraSessionLedgerState}, initialReceipt: InitialSourceContinuationReceipt}}} args
 * @returns {InitialSourceFrontierCodeRebindVerifiedCurrent}
 */
function verifyInitialSourceFrontierNativeEndpoint({ root, config, access, request, state }) {
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

/**
 * @param {{database: SqliteDatabase, root: string, config: AgentRuntimeConfig, workspaceId: string, projectIds: readonly string[], workId: string, attempt: number, actionId: string, repairId: string, parentManifestRef: string, successorManifestRef: string, systemUpdateRef: string}} args
 * @returns {InitialSourceFrontierPlan}
 */
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
}) {
  requireRebind(
    identifier.test(repairId) &&
      identifier.test(workId) &&
      Number.isSafeInteger(attempt) &&
      attempt > 0 &&
      hash.test(actionId) &&
      Array.isArray(projectIds) &&
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
    store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
    host = store.readHostStateSnapshot(identity),
    journalRow = store.readWorkSessionJournal(identity),
    initialReceipt = store.readInitialSourceContinuationReceipt(identity, attempt);
  requireRebind(journalRow && journalRow.attempt === attempt, 'initial-source frontier Host journal is missing');
  const journalValue = journalRow.state;
  requireRebind(
    isInitialSourceFrontierJournal(journalValue, workspaceId, workId, attempt),
    'initial-source frontier Host journal shape or run binding differs',
  );
  const journalState = journalValue;
  requireRebind(initialReceipt, 'initial-source continuation receipt is missing');
  const state = { host, journal: { version: journalRow.version, state: journalState }, initialReceipt },
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
    schema: /** @type {const} */ ('InitialSourceFrontierCodeRebindRequest/v1'),
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
  };
  const preliminaryProof = readInitialSourceFrontierNativeEndpoint({
    root,
    config,
    access: requireSafeRepositoryAccess(root),
    request: {
      ...endpointInput,
    },
    state,
  });
  /** @type {InitialSourceFrontierCodeRebindRequest} */
  const request = {
    ...endpointInput,
    newRuntimeCodeDigest: preliminaryProof.newRuntimeCodeDigest,
    parentManifestDigest: preliminaryProof.parentManifestDigest,
    successorManifestDigest: preliminaryProof.successorManifestDigest,
    systemUpdateOperationId: preliminaryProof.systemUpdateOperationId,
    nativeSelfAttestationDigest: preliminaryProof.nativeSelfAttestationDigest,
  };
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
    schema: /** @type {const} */ ('InitialSourceFrontierCodeRebindPlan/v1'),
    repair_id: repairId,
    request,
    endpoint_proof: endpointProof,
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}

/** @param {string} status @param {InitialSourceFrontierPlan} plan @param {InitialSourceFrontierCodeRebindReceipt|null} [receipt] @returns {Record<string, unknown>} */
function initialSourceFrontierResult(status, plan, receipt) {
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

/** @param {{values: Record<string, string>, root: string, config: AgentRuntimeConfig, workspaceId: string}} args */
async function runInitialSourceFrontierCodeRebind({ values, root, config, workspaceId }) {
  const mode = values['--mode'],
    repairId = values['--repair-id'];
  requireRebind(
    typeof mode === 'string' && typeof repairId === 'string',
    'initial-source frontier CLI arguments are incomplete',
  );
  const database = trustedDatabase(root, config, ['inspect', 'plan'].includes(mode));
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
      store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root),
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
    const receipt = store.commitReadOnlyFrontierRuntimeCode(plan.request, (request, state) =>
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
    database.close();
  }
}

/** Existing reconcile-artifacts CLI branch; no native call or approval is synthesized. */
export async function runRuntimeCodeRebind(args) {
  const values = parse(args);
  if (values['--basis'] === 'execution-continuation') {
    const { runQualifiedRuntimeCodeContinuation } = await import('./qualified-runtime-code-continuation.mjs');
    return runQualifiedRuntimeCodeContinuation(values);
  }
  const root = values['--project-root'];
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  if (values['--basis'] === 'initial-source-frontier')
    return runInitialSourceFrontierCodeRebind({ values, root, config, workspaceId });
  const database = trustedDatabase(root, config, ['inspect', 'plan'].includes(values['--mode']));
  try {
    if (['inspect', 'plan'].includes(values['--mode'])) {
      if (['delivered-config-continuation', 'configured-frontier-continuation'].includes(values['--basis'])) {
        const planner =
          values['--basis'] === 'configured-frontier-continuation'
            ? planConfiguredFrontierContinuation
            : planDeliveredWorkContinuation;
        const plan = await planner({
          database,
          root,
          config,
          workspaceId,
          projectIds: values['--projects'].split(','),
          workId: values['--work-id'],
          attempt: Number(values['--attempt']),
          actionId: values['--action-id'],
          issueId: values['--issue-id'],
          nativeHandle: values['--native-handle'],
          repairId: values['--repair-id'],
          actor: values['--actor'],
          timestamp: values['--timestamp'],
          forwardOperationId: values['--forward-operation-id'],
          sourceTransitionId: values['--source-transition-id'],
          ownerNoCallPointer: values['--owner-no-call-ref'],
          parentManifestRef: values['--parent-manifest'],
          successorManifestRef: values['--successor-manifest'],
          systemUpdateRef: values['--system-update'],
          sourceCorrectionRef: values['--source-correction'],
        });
        if (values['--mode'] === 'plan') writeDeliveredContinuationPlan(root, plan.repair_id, plan);
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
        projectIds: values['--projects'].split(','),
        workId: values['--work-id'],
        attempt: Number(values['--attempt']),
        actionId: values['--action-id'],
        issueId: values['--issue-id'],
        nativeHandle: values['--native-handle'],
        repairId: values['--repair-id'],
        actor: values['--actor'],
        timestamp: values['--timestamp'],
        forwardOperationId: values['--forward-operation-id'],
        ownerNoCallPointer: values['--owner-no-call-ref'],
        correctionId: values['--correction-id'],
        ownerCorrectionPointer: values['--owner-correction-ref'],
        focusedFailureCorrection: values['--basis'] === 'known-terminal-verify',
      });
      if (values['--mode'] === 'plan') writePlan(root, plan.repair_id, plan);
      return {
        status: values['--mode'] === 'plan' ? 'planned' : 'rebindable_current_v1',
        repair_id: plan.repair_id,
        plan_digest: plan.digest,
        old_runtime_code_digest: plan.request.oldRuntimeCodeDigest,
        new_runtime_code_digest: plan.request.newRuntimeCodeDigest,
        retained_issue_id: plan.request.issueId,
      };
    }
    if (['apply', 'resume'].includes(values['--mode'])) {
      const access = requireSafeRepositoryAccess(root),
        deliveredPlanRelative = deliveredContinuationPlanPath(values['--repair-id']);
      if (access.fileExists(deliveredPlanRelative, 'delivered continuation plan presence')) {
        const plan = readDeliveredContinuationPlan(root, values['--repair-id']),
          normal = plan.request.sourceTransition.status === 'closed_config_rebind_proven',
          transition = normal ? plan.request.sourceTransition.transition : null,
          sourceArgs = {
            database,
            root,
            config,
            workspaceId,
            projectIds: plan.request.identity.project_ids,
            workId: plan.request.identity.work_id,
            attempt: plan.request.attempt,
            actionId:
              plan.request.action.kind === 'historical_terminal_review'
                ? plan.request.action.capture.action_id
                : undefined,
            issueId:
              plan.request.action.kind === 'historical_terminal_review'
                ? plan.request.action.capture.issue_id
                : undefined,
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
            rebuildPlan: () =>
              normal ? planConfiguredFrontierContinuation(sourceArgs) : planDeliveredWorkContinuation(sourceArgs),
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
    const plan = readPlan(root, values['--repair-id']);
    const receiptTable = database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_runtime_code_rebind'")
      .get();
    const existing =
      receiptTable &&
      database
        .query(
          'SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        )
        .get(workspaceId, plan.request.identity.work_id, plan.request.attempt, plan.request.actionId);
    if (existing) {
      const receipt = JSON.parse(existing.payload);
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
      const snapshot = new HostStateStore(
        database,
        workspaceId,
        undefined,
        undefined,
        undefined,
        undefined,
        root,
      ).readHostStateSnapshot(identity);
      const journal = checkedRow(
        database,
        'agent_host_mastra_session_ledger',
        'workspace_id=? AND work_id=? AND attempt=?',
        [workspaceId, identity.work_id, plan.request.attempt],
      );
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
        expectedWork: receipt.prior_work_version,
        expectedLedger: snapshot.ledgerVersion,
      };
      requireRebind(
        canonicalJsonDigest(receipt) === existing.digest &&
          receipt.request_digest === canonicalJsonDigest(effectiveRequest) &&
          receipt.issue_id === plan.request.issueId &&
          snapshot.workVersion?.revision === receipt.prior_work_version.revision + 1 &&
          (plan.lease_transition === 'already_active' ||
            (receipt.prior_work_version.revision === plan.request.expectedWork.revision + 1 &&
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
            sourceDigest: ledger.resume(plan.request.identity.work_id, plan.request.attempt)?.state.source_scope.digest,
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
    const verifier = {
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
          ownerNoCallPointer: request.ownerNoCallPointer,
          correctionId: request.synthesisCorrection?.correctionId,
          ownerCorrectionPointer:
            request.focusedFailureCorrection?.ownerCorrectionPointer ??
            request.synthesisCorrection?.ownerCorrectionPointer,
          focusedFailureCorrection: Boolean(request.focusedFailureCorrection),
        });
        requireRebind(
          current.digest === effective.digest && canonicalJsonDigest(current.request) === canonicalJsonDigest(request),
          'frozen rebind plan differs from current state',
        );
        return {
          schema: 'VidaRuntimeCodeRebindAuthorization/v1',
          request_digest: canonicalJsonDigest(request),
          principal: verifier.principal,
          forward_operation_id: request.forwardOperationId,
          parent_manifest_digest: request.parentManifestDigest,
          successor_manifest_digest: request.successorManifestDigest,
          ...(request.focusedFailureCorrection
            ? { owner_correction_pointer: request.focusedFailureCorrection.ownerCorrectionPointer }
            : request.synthesisCorrection
              ? {
                  owner_correction_pointer: request.synthesisCorrection.ownerCorrectionPointer,
                  synthesis_correction_digest: request.synthesisCorrection.correctionDigest,
                }
              : { owner_no_call_pointer: request.ownerNoCallPointer }),
        };
      },
    };
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root, verifier);
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
    database.close();
  }
}
