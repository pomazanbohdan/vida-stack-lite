import { Database } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { coordinationLedgerDigest } from '../src/contracts/envelopes.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { qualifiedResearchSourceCatalog, qualifyLegacySynthesisCitations } from '../src/research-source-catalog.ts';
import {
  admittedResearchResultsForSynthesis,
  synthesisSourceCatalog,
} from '../src/orchestration/observed-synthesis-result.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';

const requireCorrection = (condition, message) => {
  if (!condition) throw new Error(`synthesis observation correction: ${message}`);
};
const checked = (database, table, where, args, digest = canonicalJsonDigest) => {
  const row = database.query(`SELECT revision,payload,digest FROM ${table} WHERE ${where}`).get(...args);
  requireCorrection(row && Number.isSafeInteger(row.revision) && row.revision > 0, `${table} row is missing`);
  const value = JSON.parse(row.payload);
  requireCorrection(row.digest === digest(value), `${table} checksum differs`);
  return { value, version: { revision: row.revision, digest: row.digest } };
};

/** Plan only the observed, unnormalized synthesis collision. The native report stays historical truth. */
export function planSynthesisObservationCorrection({
  database,
  repositoryRoot,
  config,
  workspaceId,
  projectIds,
  workId,
  attempt,
  actionId,
  issueId,
  nativeHandle,
  ownerCorrectionPointer,
  correctionId,
  actor,
  timestamp,
}) {
  requireCorrection(
    Number.isSafeInteger(attempt) &&
      attempt > 0 &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(correctionId) &&
      typeof nativeHandle === 'string' &&
      nativeHandle.length > 0 &&
      nativeHandle.length <= 256 &&
      typeof ownerCorrectionPointer === 'string' &&
      ownerCorrectionPointer.length > 0 &&
      ownerCorrectionPointer.length <= 2048 &&
      typeof actor === 'string' &&
      actor.trim() === actor &&
      actor.length > 0 &&
      typeof timestamp === 'string' &&
      !Number.isNaN(Date.parse(timestamp)) &&
      Array.isArray(projectIds) &&
      projectIds.length > 0 &&
      projectIds.every((id, index) => typeof id === 'string' && (index === 0 || projectIds[index - 1] < id)),
    'correction identity or owner attribution invalid',
  );
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
  const identity = {
    repository_id: project.repository_id,
    project_ids: project.project_ids,
    integrations_digest: project.integrations_digest,
    work_id: workId,
  };
  const key = JSON.stringify([
    identity.repository_id,
    identity.project_ids,
    identity.integrations_digest,
    identity.work_id,
  ]);
  const work = checked(database, 'agent_host_state', "workspace_id=? AND kind='work' AND id=?", [workspaceId, key]);
  const ledger = checked(
    database,
    'agent_host_state',
    "workspace_id=? AND kind='ledger' AND id='shared'",
    [workspaceId],
    coordinationLedgerDigest,
  );
  const journal = checked(database, 'agent_host_mastra_session_ledger', 'workspace_id=? AND work_id=? AND attempt=?', [
    workspaceId,
    workId,
    attempt,
  ]);
  const owner = work.value,
    state = journal.value;
  const item = state.items?.length === 1 ? state.items[0] : null;
  const stage = config.workflows[item?.request.workflow_id]?.stages.find(
    (entry) => entry.id === item?.request.stage_id,
  );
  const assignment = stage?.assignments[item?.request.assignment_index];
  const profile = config.agents.profiles[assignment?.profile];
  const toolPolicy = config.agents.tool_policies[profile?.tools_policy];
  const releasedTicket = [...ledger.value.tickets]
    .reverse()
    .find(
      (ticket) =>
        ticket.work_id === workId &&
        ticket.thread_id === nativeHandle &&
        ticket.repository_id === identity.repository_id &&
        canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(projectIds) &&
        ticket.integrations_digest === identity.integrations_digest &&
        ticket.status === 'released',
    );
  const releasedClaim =
    releasedTicket &&
    ledger.value.claims.some((claim) => claim.ticket_id === releasedTicket.ticket_id && claim.status === 'released');
  const release =
    releasedTicket &&
    ledger.value.operations.some(
      (operation) =>
        operation.kind === 'release' &&
        operation.ticket_id === releasedTicket.ticket_id &&
        operation.thread_id === nativeHandle,
    );
  requireCorrection(
    owner.schema === 'WorkState/v1' &&
      owner.workspace_id === workspaceId &&
      owner.binding.lifecycle_work_id === workId &&
      canonicalJsonDigest(owner.binding.project_ids) === canonicalJsonDigest(projectIds) &&
      owner.binding.integrations_digest === identity.integrations_digest &&
      owner.binding.config_digest === runtimeConfigDigest(config) &&
      owner.execution.run_id === state.run_id &&
      owner.execution.status === 'suspended' &&
      owner.lease === null &&
      !owner.execution.assignment_attempts.some(
        (entry) => entry.status === 'started' || entry.status === 'uncertain',
      ) &&
      releasedTicket &&
      releasedClaim &&
      release &&
      releasedTicket.source_revision === state.source_scope?.digest &&
      state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === workspaceId &&
      state.work_id === workId &&
      state.attempt === attempt &&
      state.step_id !== null &&
      item?.request.action_id === actionId &&
      item.issue_id === issueId &&
      item.observation?.status === 'reported_complete' &&
      item.research_activation &&
      !item.research_normalization &&
      !item.host_reservation &&
      item.request.config_digest === runtimeConfigDigest(config) &&
      item.request.scope_digest === state.source_scope?.digest &&
      owner.binding.work_source_revision === state.source_scope.digest &&
      stage?.kind === 'synthesize' &&
      stage.produces.includes('ResearchSynthesis/v1') &&
      assignment?.role === item.request.role &&
      profile?.mutation_scope === 'none' &&
      profile?.tools_policy === 'read_only' &&
      toolPolicy?.source_write === false &&
      owner.artifacts.every(
        (artifact) => artifact.schema !== 'ResearchSynthesis/v1' || artifact.stage_id !== item.request.stage_id,
      ),
    'owner, wave, result or native effect differs from correction scope',
  );
  const access = requireSafeRepositoryAccess(repositoryRoot);
  requireCorrection(
    snapshotDeclaredSources(
      access,
      state.source_scope.entries.map((entry) => entry.path),
    ).digest === state.source_scope.digest,
    'declared source changed',
  );
  const researchResults = admittedResearchResultsForSynthesis({
    repositoryRoot,
    config,
    journal: { state, version: journal.version, resume_status: 'ready_to_resume' },
    work: owner,
    workflowId: item.request.workflow_id,
  });
  const catalog = synthesisSourceCatalog(researchResults);
  const full = qualifiedResearchSourceCatalog(catalog.result_refs, researchResults);
  let summary;
  try {
    summary = JSON.parse(item.observation.summary);
  } catch {
    throw new Error('synthesis observation correction: old summary is not structured JSON');
  }
  let conflicting = false;
  try {
    qualifyLegacySynthesisCitations(summary, full);
  } catch (error) {
    if (!String(error).includes('legacy citation has conflicting provenance')) throw error;
    conflicting = true;
  }
  requireCorrection(conflicting, 'old citation is not a conflicting local source alias');
  const body = {
    schema: 'VidaSynthesisObservationCorrectionPlan/v1',
    correction_id: correctionId,
    actor,
    timestamp,
    workspace_id: workspaceId,
    repository_id: identity.repository_id,
    project_ids: projectIds,
    integrations_digest: identity.integrations_digest,
    work_id: workId,
    attempt,
    action_id: actionId,
    prior_issue_id: issueId,
    native_session_handle: nativeHandle,
    owner_correction_pointer: ownerCorrectionPointer,
    config_digest: runtimeConfigDigest(config),
    source_digest: state.source_scope.digest,
    predecessor_refs: catalog.result_refs,
    catalog_digest: canonicalJsonDigest(catalog),
    expected_work: work.version,
    expected_ledger: ledger.version,
    expected_journal: journal.version,
    original_item: item,
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}

const planPath = (id) => `.agent/work/${id}/synthesis-observation-correction-plan.v1.json`;

function storedPlan(access, correctionId) {
  const raw = access.readText(planPath(correctionId), 'synthesis observation correction plan');
  const plan = JSON.parse(raw);
  const { digest, ...body } = plan;
  requireCorrection(
    raw === `${JSON.stringify(plan, null, 2)}\n` &&
      plan.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
      plan.correction_id === correctionId &&
      digest === canonicalJsonDigest(body),
    'stored synthesis correction plan differs',
  );
  return plan;
}

function argumentsForCorrection(args) {
  requireCorrection(args.length % 2 === 0, 'arguments must be paired');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireCorrection(
      args[index]?.startsWith('--') && args[index + 1] && !Object.hasOwn(values, args[index]),
      'arguments are missing or duplicate',
    );
    values[args[index]] = args[index + 1];
  }
  const planning = [
    '--kind',
    '--mode',
    '--project-root',
    '--correction-id',
    '--projects',
    '--work-id',
    '--attempt',
    '--action-id',
    '--issue-id',
    '--native-handle',
    '--owner-correction-pointer',
    '--actor',
    '--timestamp',
  ];
  const applying = ['--kind', '--mode', '--project-root', '--correction-id'];
  const expected = ['inspect', 'plan'].includes(values['--mode']) ? planning : applying;
  requireCorrection(
    values['--kind'] === 'synthesis-observation-correction' &&
      ['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(values['--correction-id'] ?? '') &&
      canonicalJson(Object.keys(values).sort()) === canonicalJson(expected.sort()),
    'synthesis correction arguments invalid',
  );
  return values;
}

function databasePath(root, config) {
  const access = requireSafeRepositoryAccess(root);
  access.assertDirectory(config.control.work_root, 'synthesis correction work root');
  const relative = sessionHandoffDatabaseRelativePath(config);
  requireCorrection(access.fileExists(relative, 'synthesis correction database'), 'session database absent');
  const absolute = sessionHandoffDatabasePath(root, config);
  const stat = lstatSync(absolute);
  requireCorrection(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
    'session database is not a single-link regular file',
  );
  return absolute;
}

/** The packaged reconcile-artifacts entrypoint owns the public preparation and correction. */
export async function runSynthesisObservationCorrection(args) {
  const values = argumentsForCorrection(args);
  const root = values['--project-root'];
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const access = requireSafeRepositoryAccess(root);
  const mode = values['--mode'];
  const correctionId = values['--correction-id'];
  const file = databasePath(root, config);
  if (mode === 'inspect' || mode === 'plan') {
    const database = new Database(file, { readonly: true, create: false });
    let plan;
    try {
      plan = planSynthesisObservationCorrection({
        database,
        repositoryRoot: root,
        config,
        workspaceId,
        projectIds: values['--projects'].split(','),
        workId: values['--work-id'],
        attempt: Number(values['--attempt']),
        actionId: values['--action-id'],
        issueId: values['--issue-id'],
        nativeHandle: values['--native-handle'],
        ownerCorrectionPointer: values['--owner-correction-pointer'],
        correctionId,
        actor: values['--actor'],
        timestamp: values['--timestamp'],
      });
    } finally {
      database.close();
    }
    if (mode === 'plan') {
      await access.ensureDirectoryAsync(`.agent/work/${correctionId}`, 'synthesis correction work root');
      await access.writeExclusiveAsync(
        planPath(correctionId),
        `${JSON.stringify(plan, null, 2)}\n`,
        'synthesis observation correction plan',
      );
    }
    return {
      status: mode === 'plan' ? 'planned' : 'correctable_current_v1',
      correction_id: correctionId,
      plan_digest: plan.digest,
      retained_native_outcome: 'reported_complete',
      prior_issue_id: plan.prior_issue_id,
      predecessor_refs: plan.predecessor_refs,
    };
  }
  const plan = storedPlan(access, correctionId);
  const ledger = openConfiguredMastraSessionLedger(root);
  try {
    const prior = ledger.synthesisCorrection(plan.work_id, plan.attempt, plan.action_id);
    if (prior) {
      requireCorrection(prior.digest === plan.digest, 'existing correction receipt conflicts');
      return {
        status: 'already_prepared',
        correction_id: correctionId,
        plan_digest: plan.digest,
        retained_native_outcome: 'reported_complete',
      };
    }
    const freshDatabase = new Database(file, { readonly: true, create: false });
    try {
      const fresh = planSynthesisObservationCorrection({
        database: freshDatabase,
        repositoryRoot: root,
        config,
        workspaceId,
        projectIds: plan.project_ids,
        workId: plan.work_id,
        attempt: plan.attempt,
        actionId: plan.action_id,
        issueId: plan.prior_issue_id,
        nativeHandle: plan.native_session_handle,
        ownerCorrectionPointer: plan.owner_correction_pointer,
        correctionId,
        actor: plan.actor,
        timestamp: plan.timestamp,
      });
      requireCorrection(fresh.digest === plan.digest, 'synthesis correction preimages changed');
    } finally {
      freshDatabase.close();
    }
    const snapshot = ledger.correctObservedSynthesis(plan);
    return {
      status: 'prepared',
      correction_id: correctionId,
      plan_digest: plan.digest,
      retained_native_outcome: 'reported_complete',
      resume_status: snapshot.resume_status,
      state_version: snapshot.version,
    };
  } finally {
    ledger.close();
  }
}
