import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { resumePausedLocalWork } from '../src/orchestration/resume-paused-local-work.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const requireRebind = (ok, message) => {
  if (!ok) throw new Error(`vida runtime-code rebind: ${message}`);
};
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const hash = /^[a-f0-9]{64}$/;
const planningKeys = ['--kind', '--mode', '--project-root', '--repair-id', '--actor', '--timestamp',
  '--projects', '--work-id', '--attempt', '--action-id', '--issue-id', '--native-handle',
  '--forward-operation-id', '--owner-no-call-ref'];
const synthesisPlanningKeys = planningKeys.filter((key) => key !== '--owner-no-call-ref')
  .concat(['--basis', '--correction-id', '--owner-correction-ref']);
const applyingKeys = ['--kind', '--mode', '--project-root', '--repair-id'];
const planPath = (id) => `.agent/work/${id}/runtime-code-rebind-plan.v1.json`;

function parse(args) {
  requireRebind(args.length % 2 === 0, 'arguments must be paired');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireRebind(args[index]?.startsWith('--') && args[index + 1] &&
      !Object.hasOwn(values, args[index]), 'arguments invalid');
    values[args[index]] = args[index + 1];
  }
  requireRebind(values['--kind'] === 'runtime-code' &&
    ['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']) &&
    path.isAbsolute(values['--project-root'] ?? '') &&
    path.resolve(values['--project-root']) === values['--project-root'] &&
    identifier.test(values['--repair-id'] ?? ''), 'kind, mode, root or repair ID invalid');
  const expected = ['inspect', 'plan'].includes(values['--mode'])
    ? values['--basis'] === 'synthesis-correction' ? synthesisPlanningKeys : planningKeys
    : applyingKeys;
  requireRebind(JSON.stringify(Object.keys(values).sort()) === JSON.stringify([...expected].sort()),
    'missing or unexpected arguments');
  return values;
}

function trustedDatabase(root, config, readonly) {
  const access = requireSafeRepositoryAccess(root);
  access.assertDirectory(config.control.work_root, 'runtime-code rebind work root');
  const relative = `${config.control.work_root}/session-handoff.v1.sqlite`;
  requireRebind(access.fileExists(relative, 'runtime-code rebind database'), 'database absent or unsafe');
  const file = sessionHandoffDatabasePath(root, config);
  const stat = lstatSync(file);
  requireRebind(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
    'database must be a single-link regular file');
  return new Database(file, { readonly, strict: true });
}

function validatedJson(access, relative, label) {
  const bytes = access.readBytes(relative, label);
  requireRebind(bytes.length <= 8 * 1024 * 1024, `${label} exceeds bound`);
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}

function forwardLineage(root, operationChain, paths, oldDigest, newDigest) {
  const operationIds = operationChain.split(',');
  requireRebind(operationIds.length > 0 && operationIds.length <= 4 &&
    operationIds.every((id) => identifier.test(id)) &&
    new Set(operationIds).size === operationIds.length, 'forward operation chain invalid');
  const access = requireSafeRepositoryAccess(root);
  const operations = operationIds.map((operationId) => {
    const prefix = `.agent/cutover/${operationId}`;
    const intent = validatedJson(access, `${prefix}/forward-intent.v1.json`, 'forward intent').value;
    const parent = validatedJson(access, `${prefix}/parent-payload.manifest.v1.json`,
      'parent manifest');
    const successor = validatedJson(access, `${prefix}/successor-payload.manifest.v1.json`,
      'successor manifest');
    requireRebind(intent.schema === 'VidaForwardUpdateMaintenance/v1' &&
      intent.operation_id === operationId &&
      intent.old_payload_manifest_sha256 === sha(parent.bytes) &&
      intent.new_payload_manifest_sha256 === sha(successor.bytes),
    'forward operation lineage differs');
    return { parent, successor };
  });
  requireRebind(operations.every((operation, index) => index === 0 ||
    sha(operations[index - 1].successor.bytes) === sha(operation.parent.bytes)),
  'forward operations do not form one exact manifest chain');
  const parent = operations[0].parent;
  const successor = operations.at(-1).successor;
  const selector = validatedJson(access, '.agent/active-runtime-selector.v1.json',
    'active runtime selector').value;
  const oldManifestDigest = sha(parent.bytes);
  const newManifestDigest = sha(successor.bytes);
  requireRebind(selector.payload_manifest_sha256 === newManifestDigest,
  'installed forward lineage or selector differs');
  const entriesFor = (manifest) => paths.map((relative) => {
    const matches = manifest.value.files.filter((entry) => entry.path === relative);
    requireRebind(matches.length === 1 && Number.isSafeInteger(matches[0].size) &&
      hash.test(matches[0].sha256), 'runtime path missing from exact forward manifest');
    return { path: relative, exists: true, bytes: matches[0].size, sha256: matches[0].sha256 };
  });
  const from = canonicalJsonDigest({ schema: 'ScopedSourceSnapshot/v1', entries: entriesFor(parent) });
  const to = canonicalJsonDigest({ schema: 'ScopedSourceSnapshot/v1', entries: entriesFor(successor) });
  requireRebind(from === oldDigest && to === newDigest && from !== to,
    'runtime-code digests differ from forward manifests');
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
export function planRuntimeCodeRebind({ database, root, config, workspaceId, projectIds, workId,
  attempt, actionId, issueId, nativeHandle, repairId, actor, timestamp, forwardOperationId,
  ownerNoCallPointer, correctionId, ownerCorrectionPointer }) {
  requireRebind(identifier.test(repairId) && typeof forwardOperationId === 'string' &&
    Number.isSafeInteger(attempt) && attempt > 0 && hash.test(actionId) &&
    typeof issueId === 'string' && issueId.length > 0 && issueId.length <= 256 &&
    typeof nativeHandle === 'string' && nativeHandle.length > 0 && nativeHandle.length <= 256 &&
    (correctionId
      ? identifier.test(correctionId) && typeof ownerCorrectionPointer === 'string' &&
        ownerCorrectionPointer.length > 0 && ownerCorrectionPointer.length <= 2048 &&
        !/\p{Cc}/u.test(ownerCorrectionPointer) && ownerNoCallPointer === undefined
      : typeof ownerNoCallPointer === 'string' && ownerNoCallPointer.length > 0 &&
        ownerNoCallPointer.length <= 2048 && !/\p{Cc}/u.test(ownerNoCallPointer) &&
        ownerCorrectionPointer === undefined) &&
    typeof actor === 'string' && actor.trim() === actor && actor.length > 0 &&
    typeof timestamp === 'string' && !Number.isNaN(Date.parse(timestamp)),
  'attribution or action identity invalid');
  requireRebind(Array.isArray(projectIds) && projectIds.length > 0 &&
    projectIds.every((id, index) => typeof id === 'string' &&
      (index === 0 || projectIds[index - 1] < id)), 'project set not sorted and unique');
  const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
  const identity = { repository_id: project.repository_id, project_ids: project.project_ids,
    integrations_digest: project.integrations_digest, work_id: workId };
  const key = JSON.stringify([identity.repository_id, identity.project_ids,
    identity.integrations_digest, workId]);
  const work = checkedRow(database, 'agent_host_state', "workspace_id=? AND kind='work' AND id=?",
    [workspaceId, key]);
  const ledger = checkedRow(database, 'agent_host_state',
    "workspace_id=? AND kind='ledger' AND id='shared'", [workspaceId]);
  const journal = checkedRow(database, 'agent_host_mastra_session_ledger',
    'workspace_id=? AND work_id=? AND attempt=?', [workspaceId, workId, attempt]);
  const owner = work.value;
  const state = journal.value;
  const item = state.items?.find((entry) => entry.request?.action_id === actionId);
  const stage = config.workflows[item?.request.workflow_id]?.stages.find((entry) =>
    entry.id === item?.request.stage_id);
  const assignment = stage?.assignments[item?.request.assignment_index];
  const profile = config.agents.profiles[assignment?.profile];
  const toolPolicy = config.agents.tool_policies[profile?.tools_policy];
  const dispatchRow = correctionId ? null : database.query('SELECT payload,digest FROM agent_host_readonly_dispatch_activation WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=?')
    .get(workspaceId, workId, attempt, actionId);
  const dispatch = dispatchRow && JSON.parse(dispatchRow.payload);
  const repairRow = dispatch && Number.isSafeInteger(dispatch.generation) &&
    database.query('SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=?')
      .get(workspaceId, workId, attempt, actionId, dispatch.generation);
  const repair = repairRow && JSON.parse(repairRow.payload);
  const { digest: _repairDigest, ...repairBody } = repair ?? {};
  const correctionRow = correctionId && database.query('SELECT payload,digest FROM agent_host_synthesis_observation_correction WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?')
    .get(workspaceId, workId, attempt, actionId);
  const correction = correctionRow && JSON.parse(correctionRow.payload);
  const { digest: _correctionDigest, ...correctionBody } = correction ?? {};
  const paused = owner.execution.status === 'suspended' && owner.lease === null;
  const prior = paused && [...ledger.value.tickets].reverse().find((ticket) =>
    ticket.work_id === workId && ticket.repository_id === identity.repository_id &&
    canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(projectIds) &&
    ticket.integrations_digest === identity.integrations_digest &&
    ticket.thread_id === nativeHandle && ticket.status === 'released');
  const releasedClaim = prior && ledger.value.claims.find((claim) =>
    claim.ticket_id === prior.ticket_id && claim.status === 'released');
  const release = prior && ledger.value.operations.find((operation) =>
    operation.ticket_id === prior.ticket_id && operation.kind === 'release' &&
    operation.thread_id === nativeHandle);
  const pausedOwner = paused && prior && releasedClaim && release &&
    prior.source_revision === state.source_scope?.digest &&
    prior.exclusive_resources.every((resource) =>
      owner.binding.allowed_resources.includes(resource) &&
      (resource.startsWith('file:') || resource === 'execution:' + workId)) &&
    !owner.execution.assignment_attempts.some((entry) =>
      entry.status === 'started' || entry.status === 'uncertain');
  requireRebind(owner.schema === 'WorkState/v1' && owner.workspace_id === workspaceId &&
    owner.binding.lifecycle_work_id === workId &&
    owner.binding.config_digest === runtimeConfigDigest(config) &&
    owner.binding.integrations_digest === identity.integrations_digest &&
    canonicalJsonDigest(owner.binding.project_ids) === canonicalJsonDigest(projectIds) &&
    ((owner.execution.status === 'active' && owner.lease?.thread_id === nativeHandle) ||
      pausedOwner) &&
    owner.lifecycle.phase === 'INTAKE' && owner.lifecycle.seal === null &&
    state.schema === 'MastraSessionLedger/v1' && state.workspace_id === workspaceId &&
    state.work_id === workId && state.attempt === attempt && state.run_id === owner.execution.run_id &&
    (correctionId ? item?.issue_id === null : item?.issue_id === issueId) &&
    item?.observation === null &&
    !item.research_activation && !item.research_normalization && !item.host_reservation &&
    item.request.config_digest === runtimeConfigDigest(config) &&
    item.request.scope_digest === state.source_scope?.digest &&
    owner.binding.work_source_revision === state.source_scope.digest &&
    assignment?.role === item.request.role && profile?.mutation_scope === 'none' &&
    profile?.tools_policy === 'read_only' && toolPolicy?.source_write === false &&
    (correctionId ? correction && correctionRow &&
      correction.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
      correction.digest === correctionRow.digest &&
      correction.digest === canonicalJsonDigest(correctionBody) &&
      correction.correction_id === correctionId &&
      correction.owner_correction_pointer === ownerCorrectionPointer &&
      correction.workspace_id === workspaceId &&
      correction.repository_id === identity.repository_id &&
      canonicalJsonDigest(correction.project_ids) === canonicalJsonDigest(projectIds) &&
      correction.integrations_digest === identity.integrations_digest &&
      correction.work_id === workId && correction.attempt === attempt &&
      correction.action_id === actionId && correction.prior_issue_id === issueId &&
      correction.original_item.issue_id === issueId &&
      correction.original_item.observation?.status === 'reported_complete' &&
      canonicalJsonDigest(correction.original_item.request) === canonicalJsonDigest(item.request) &&
      correction.config_digest === runtimeConfigDigest(config) &&
      correction.source_digest === state.source_scope.digest
      : dispatch && canonicalJsonDigest(dispatch) === dispatchRow.digest &&
    dispatch.schema === 'VidaReadOnlyDispatchActivation/v1' &&
    dispatch.logical_action_id === actionId && dispatch.issue_id === issueId &&
    repair && repair.schema === 'VidaReadOnlyDispatchRepairPlan/v1' &&
    repairRow.digest === repair.digest && repair.digest === canonicalJsonDigest(repairBody) &&
    dispatch.plan_digest === repair.digest &&
    repair.workspace_id === workspaceId && repair.repository_id === identity.repository_id &&
    canonicalJsonDigest(repair.project_ids) === canonicalJsonDigest(projectIds) &&
    repair.integrations_digest === identity.integrations_digest &&
    repair.work_id === workId && repair.attempt === attempt &&
    repair.logical_action_id === actionId && repair.replacement_generation === dispatch.generation &&
    repair.prior_outcome === 'unknown' && repair.prior_issue_id === dispatch.prior_issue_id &&
    repair.replacement_issue_id === issueId &&
    repair.dispatch_action_id === dispatch.dispatch_action_id &&
    repair.prior_native_handle === nativeHandle &&
    repair.request_digest === canonicalJsonDigest(item.request) &&
    repair.scope_digest === item.request.scope_digest &&
    repair.config_digest === item.request.config_digest &&
    repair.source_digest === state.source_scope.digest),
  'current owner, journal or issued replacement differs');
  const access = requireSafeRepositoryAccess(root);
  requireRebind(snapshotDeclaredSources(access,
    state.source_scope.entries.map((entry) => entry.path)).digest === state.source_scope.digest,
  'declared task source changed');
  const intake = owner.artifacts.find((ref) => ref.artifact_id === 'local-session-intake' &&
    ref.schema === 'VidaLocalSessionIntake/v1');
  requireRebind(intake, 'exact intake reference missing');
  const intakeBytes = access.readBytes(intake.path, 'runtime-code rebind intake');
  requireRebind(sha(intakeBytes) === intake.sha256, 'intake bytes differ');
  const intakeValue = JSON.parse(intakeBytes.toString('utf8'));
  const paths = [...intakeValue.runtime_code_paths].sort();
  requireRebind(paths.length > 0 && new Set(paths).size === paths.length &&
    intakeValue.native_session_handle === nativeHandle,
  'intake runtime paths or owner differ');
  const current = snapshotDeclaredSources(access, paths);
  const oldDigest = owner.binding.runtime_code_digest;
  const newDigest = current.digest;
  const lineage = forwardLineage(root, forwardOperationId, paths, oldDigest, newDigest);
  const request = { identity, attempt, actionId, issueId, nativeSessionHandle: nativeHandle,
    expectedWork: work.version, expectedLedger: ledger.version, expectedJournal: journal.version,
    expectedMaintenanceGeneration: new HostStateStore(database, workspaceId, undefined,
      undefined, undefined, undefined, root).readHostStateSnapshot(identity).maintenanceGeneration,
    oldRuntimeCodeDigest: oldDigest,
    newRuntimeCodeDigest: newDigest, forwardOperationId,
    parentManifestDigest: lineage.parentManifestDigest,
    successorManifestDigest: lineage.successorManifestDigest,
    ...(correctionId
      ? { synthesisCorrection: { correctionId, correctionDigest: correction.digest,
        ownerCorrectionPointer } }
      : { ownerNoCallPointer }) };
  const body = { schema: 'VidaRuntimeCodeRebindPlan/v1', repair_id: repairId, actor, timestamp,
    runtime_code_paths: paths, lease_transition: paused ? 'resume_paused' : 'already_active', request };
  return { ...body, digest: canonicalJsonDigest(body) };
}

function readPlan(root, repairId) {
  const file = path.join(root, planPath(repairId));
  const stat = lstatSync(file);
  requireRebind(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'plan path unsafe');
  const plan = JSON.parse(readFileSync(file, 'utf8'));
  const { digest, ...body } = plan;
  requireRebind(plan.schema === 'VidaRuntimeCodeRebindPlan/v1' && plan.repair_id === repairId &&
    digest === canonicalJsonDigest(body), 'frozen plan digest invalid');
  return plan;
}

function writePlan(root, repairId, plan) {
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory(`.agent/work/${repairId}`, 'runtime-code rebind evidence');
  const file = path.join(root, planPath(repairId));
  const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try { writeFileSync(fd, Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)); fsyncSync(fd); }
  finally { closeSync(fd); }
}

function sameRepairIntent(left, right) {
  const stable = (plan) => {
    const { expectedWork, expectedLedger, expectedMaintenanceGeneration, ...request } = plan.request;
    return { repair_id: plan.repair_id, actor: plan.actor, timestamp: plan.timestamp,
      runtime_code_paths: plan.runtime_code_paths, request };
  };
  return canonicalJsonDigest(stable(left)) === canonicalJsonDigest(stable(right));
}

function currentPlan(database, root, config, workspaceId, plan) {
  const request = plan.request;
  return planRuntimeCodeRebind({ database, root, config, workspaceId,
    projectIds: request.identity.project_ids, workId: request.identity.work_id,
    attempt: request.attempt, actionId: request.actionId, issueId: request.issueId,
    nativeHandle: request.nativeSessionHandle, repairId: plan.repair_id,
    actor: plan.actor, timestamp: plan.timestamp,
    forwardOperationId: request.forwardOperationId,
    ownerNoCallPointer: request.ownerNoCallPointer,
    correctionId: request.synthesisCorrection?.correctionId,
    ownerCorrectionPointer: request.synthesisCorrection?.ownerCorrectionPointer });
}

/** Existing reconcile-artifacts CLI branch; no native call or approval is synthesized. */
export async function runRuntimeCodeRebind(args) {
  const values = parse(args);
  const root = values['--project-root'];
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const database = trustedDatabase(root, config, ['inspect', 'plan'].includes(values['--mode']));
  try {
    if (['inspect', 'plan'].includes(values['--mode'])) {
      const plan = planRuntimeCodeRebind({ database, root, config, workspaceId,
        projectIds: values['--projects'].split(','), workId: values['--work-id'],
        attempt: Number(values['--attempt']), actionId: values['--action-id'],
        issueId: values['--issue-id'], nativeHandle: values['--native-handle'],
        repairId: values['--repair-id'], actor: values['--actor'], timestamp: values['--timestamp'],
        forwardOperationId: values['--forward-operation-id'],
        ownerNoCallPointer: values['--owner-no-call-ref'],
        correctionId: values['--correction-id'],
        ownerCorrectionPointer: values['--owner-correction-ref'] });
      if (values['--mode'] === 'plan') writePlan(root, plan.repair_id, plan);
      return { status: values['--mode'] === 'plan' ? 'planned' : 'rebindable_current_v1',
        repair_id: plan.repair_id, plan_digest: plan.digest,
        old_runtime_code_digest: plan.request.oldRuntimeCodeDigest,
        new_runtime_code_digest: plan.request.newRuntimeCodeDigest,
        retained_issue_id: plan.request.issueId };
    }
    const plan = readPlan(root, values['--repair-id']);
    const receiptTable = database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_runtime_code_rebind'").get();
    const existing = receiptTable && database.query('SELECT payload,digest FROM agent_host_runtime_code_rebind WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?')
      .get(workspaceId, plan.request.identity.work_id, plan.request.attempt, plan.request.actionId);
    if (existing) {
      const receipt = JSON.parse(existing.payload);
      const project = loadProjectSetContext(root, config, config.repository.repository_id,
        plan.request.identity.project_ids);
      const identity = { repository_id: project.repository_id, project_ids: project.project_ids,
        integrations_digest: project.integrations_digest, work_id: plan.request.identity.work_id };
      const snapshot = new HostStateStore(database, workspaceId, undefined, undefined, undefined,
        undefined, root).readHostStateSnapshot(identity);
      const journal = checkedRow(database, 'agent_host_mastra_session_ledger',
        'workspace_id=? AND work_id=? AND attempt=?',
        [workspaceId, identity.work_id, plan.request.attempt]);
      const item = journal.value.items.find((entry) =>
        entry.request.action_id === plan.request.actionId);
      const current = snapshotDeclaredSources(requireSafeRepositoryAccess(root),
        plan.runtime_code_paths);
      forwardLineage(root, plan.request.forwardOperationId, plan.runtime_code_paths,
        plan.request.oldRuntimeCodeDigest, plan.request.newRuntimeCodeDigest);
      const effectiveRequest = { ...plan.request, expectedWork: receipt.prior_work_version,
        expectedLedger: snapshot.ledgerVersion };
      requireRebind(canonicalJsonDigest(receipt) === existing.digest &&
        receipt.request_digest === canonicalJsonDigest(effectiveRequest) &&
        receipt.issue_id === plan.request.issueId &&
        snapshot.workVersion?.revision === receipt.prior_work_version.revision + 1 &&
        (plan.lease_transition === 'already_active' ||
          (receipt.prior_work_version.revision === plan.request.expectedWork.revision + 1 &&
            snapshot.ledgerVersion?.revision === plan.request.expectedLedger.revision + 1)) &&
        snapshot.work?.binding.runtime_code_digest === plan.request.newRuntimeCodeDigest &&
        snapshot.work?.lease?.thread_id === plan.request.nativeSessionHandle &&
        canonicalJsonDigest(journal.version) ===
          canonicalJsonDigest(plan.request.expectedJournal) &&
        (plan.request.synthesisCorrection ? item?.issue_id === null :
          item?.issue_id === plan.request.issueId) && item?.observation === null &&
        current.digest === plan.request.newRuntimeCodeDigest,
      'runtime-code rebind replay needs current-state inspection');
      return { status: 'already_rebound', repair_id: plan.repair_id,
        plan_digest: plan.digest, retained_issue_id: plan.request.issueId,
        work_version: snapshot.workVersion, journal_version: journal.version };
    }
    let effective = currentPlan(database, root, config, workspaceId, plan);
    requireRebind(sameRepairIntent(effective, plan), 'frozen rebind intent differs');
    if (plan.lease_transition === 'resume_paused') {
      if (effective.lease_transition === 'resume_paused') {
        requireRebind(effective.digest === plan.digest,
          'paused owner CAS or installed runtime changed before lease resume');
        const ledger = openConfiguredMastraSessionLedger(root);
        try {
          const resumed = resumePausedLocalWork({ store: ledger.hostState, ledger,
            identity: plan.request.identity, attempt: plan.request.attempt,
            expectedWork: plan.request.expectedWork,
            expectedLedger: plan.request.expectedLedger,
            expectedJournal: plan.request.expectedJournal,
            nativeSessionHandle: plan.request.nativeSessionHandle,
            configDigest: runtimeConfigDigest(config),
            sourceDigest: ledger.resume(plan.request.identity.work_id,
              plan.request.attempt)?.state.source_scope.digest });
          requireRebind(resumed.status === 'resumed',
            'resumed owner needs journal inspection before rebind');
        } finally { ledger.close(); }
        effective = currentPlan(database, root, config, workspaceId, plan);
      }
      requireRebind(effective.lease_transition === 'already_active' &&
        effective.request.expectedWork.revision === plan.request.expectedWork.revision + 1 &&
        effective.request.expectedLedger.revision === plan.request.expectedLedger.revision + 1 &&
        canonicalJsonDigest(effective.request.expectedJournal) ===
          canonicalJsonDigest(plan.request.expectedJournal) &&
        sameRepairIntent(effective, plan),
      'paused owner successor lease differs from frozen rebind intent');
    } else {
      requireRebind(effective.digest === plan.digest, 'frozen rebind plan differs from current state');
    }
    const verifier = { principal: 'vida-agent-forward-runtime-code-rebind',
      verify: (request) => {
        const current = planRuntimeCodeRebind({ database, root, config, workspaceId,
          projectIds: request.identity.project_ids, workId: request.identity.work_id,
          attempt: request.attempt, actionId: request.actionId, issueId: request.issueId,
          nativeHandle: request.nativeSessionHandle, repairId: plan.repair_id,
          actor: plan.actor, timestamp: plan.timestamp,
          forwardOperationId: request.forwardOperationId,
          ownerNoCallPointer: request.ownerNoCallPointer,
          correctionId: request.synthesisCorrection?.correctionId,
          ownerCorrectionPointer: request.synthesisCorrection?.ownerCorrectionPointer });
        requireRebind(current.digest === effective.digest &&
          canonicalJsonDigest(current.request) === canonicalJsonDigest(request),
        'frozen rebind plan differs from current state');
        return { schema: 'VidaRuntimeCodeRebindAuthorization/v1',
          request_digest: canonicalJsonDigest(request), principal: verifier.principal,
          forward_operation_id: request.forwardOperationId,
          parent_manifest_digest: request.parentManifestDigest,
          successor_manifest_digest: request.successorManifestDigest,
          ...(request.synthesisCorrection
            ? { owner_correction_pointer: request.synthesisCorrection.ownerCorrectionPointer,
              synthesis_correction_digest: request.synthesisCorrection.correctionDigest }
            : { owner_no_call_pointer: request.ownerNoCallPointer }) };
      } };
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined,
      undefined, root, verifier);
    const saved = await store.rebindRuntimeCode(effective.request);
    requireRebind(saved.work?.binding.runtime_code_digest === plan.request.newRuntimeCodeDigest,
      'runtime-code rebind did not persist');
    return { status: 'rebound', repair_id: plan.repair_id,
      plan_digest: plan.digest, retained_issue_id: plan.request.issueId,
      work_version: saved.workVersion, journal_version: plan.request.expectedJournal };
  } finally { database.close(); }
}
