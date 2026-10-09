import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { coordinationLedgerDigest } from '../src/contracts/envelopes.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { validateActivationUse, validateObservedActivationUseWritePlan } from '../src/research-decision.ts';
import { createHash } from 'node:crypto';
import path from 'node:path';

const requireRepair = (condition, message) => {
  if (!condition) throw new Error(`vida read-only dispatch repair: ${message}`);
};
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const workIdentifier = /^[a-z0-9][a-z0-9-]{0,127}$/;
const hash = /^[a-f0-9]{64}$/;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function committedActivation(root, config, item, state, work, ledger, attempt) {
  if (!item.research_activation) return true;
  try {
    const use = validateActivationUse(item.research_activation.use);
    const plan = validateObservedActivationUseWritePlan(item.research_activation.plan);
    const bind = plan.binding;
    const ticket = ledger.tickets.find((entry) => entry.ticket_id === bind.lease_ticket_id);
    const expectedPath = path.posix.join(
      config.research_decision.paths.activation_history,
      state.work_id,
      'instruction-activation-history.jsonl',
    );
    if (
      plan.history_path !== expectedPath ||
      plan.use_digest !== use.digest ||
      bind.work_id !== state.work_id ||
      bind.attempt !== attempt ||
      bind.run_id !== state.run_id ||
      bind.action_id !== item.request.action_id ||
      bind.issue_id !== item.issue_id ||
      bind.scope_id !== work.binding.scope_id ||
      bind.scope_digest !== item.request.scope_digest ||
      bind.source_revision !== work.binding.work_source_revision ||
      bind.source_scope_digest !== state.source_scope?.digest ||
      bind.config_digest !== item.request.config_digest ||
      bind.lease_thread_id !== ticket?.thread_id ||
      bind.lease_generation !== ticket?.generation ||
      ticket.status !== 'released' ||
      use.work_item_id !== state.work_id ||
      use.source_revision !== bind.source_revision ||
      use.scope_id !== bind.scope_id
    )
      return false;
    const history = requireSafeRepositoryAccess(root).readText(
      plan.history_path,
      'read-only repair activation history',
    );
    const lines = history.split('\n');
    if (lines.at(-1) !== '') return false;
    let offset = 0;
    for (const line of lines.slice(0, -1)) {
      const before = history.slice(0, offset);
      offset += line.length + 1;
      const observed = validateActivationUse(JSON.parse(line));
      if (observed.use_id === use.use_id)
        return (
          observed.digest === use.digest &&
          (plan.history_pre_sha256 === null ? before === '' : sha256(before) === plan.history_pre_sha256) &&
          sha256(history.slice(0, offset)) === plan.history_sha256
        );
    }
  } catch {
    return false;
  }
  return false;
}
function deterministicIssueId(binding) {
  const hex = canonicalJsonDigest(binding).slice(0, 32);
  const variant = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function checkedRow(database, table, where, args, digest = canonicalJsonDigest) {
  const row = database.query(`SELECT revision,payload,digest FROM ${table} WHERE ${where}`).get(...args);
  requireRepair(row && Number.isSafeInteger(row.revision) && row.revision > 0, `${table} row missing`);
  const value = JSON.parse(row.payload);
  requireRepair(digest(value) === row.digest, `${table} digest differs`);
  return { version: { revision: row.revision, digest: row.digest }, value };
}

/** Pure plan over existing current-v1 rows. No timeout, interrupt or caller report becomes no-effect proof. */
export function planReadOnlyDispatchRepair({
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
  repairId,
  actor,
  timestamp,
}) {
  requireRepair(
    identifier.test(repairId) &&
      workIdentifier.test(workId) &&
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
      !Number.isNaN(Date.parse(timestamp)),
    'repair request invalid',
  );
  requireRepair(
    Array.isArray(projectIds) &&
      projectIds.length > 0 &&
      projectIds.every((id, index) => typeof id === 'string' && (index === 0 || projectIds[index - 1] < id)),
    'project set must be exact sorted unique IDs',
  );
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
  const workKey = JSON.stringify([project.repository_id, project.project_ids, project.integrations_digest, workId]);
  const work = checkedRow(database, 'agent_host_state', "workspace_id=? AND kind='work' AND id=?", [
    workspaceId,
    workKey,
  ]);
  const ledger = checkedRow(
    database,
    'agent_host_state',
    "workspace_id=? AND kind='ledger' AND id='shared'",
    [workspaceId],
    coordinationLedgerDigest,
  );
  const mastra = checkedRow(
    database,
    'agent_host_mastra_session_ledger',
    'workspace_id=? AND work_id=? AND attempt=?',
    [workspaceId, workId, attempt],
  );
  requireRepair(
    work.value.schema === 'WorkState/v1' &&
      work.value.binding.lifecycle_work_id === workId &&
      canonicalJsonDigest(work.value.binding.project_ids) === canonicalJsonDigest(projectIds) &&
      work.value.binding.integrations_digest === project.integrations_digest &&
      work.value.binding.config_digest === runtimeConfigDigest(config),
    'work authority differs',
  );
  requireRepair(
    ledger.value.schema === 'CoordinationLedger/v1' && ledger.value.workspace_id === workspaceId,
    'shared ledger authority differs',
  );
  const state = mastra.value;
  requireRepair(
    state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === workspaceId &&
      state.work_id === workId &&
      state.attempt === attempt &&
      state.step_id &&
      Array.isArray(state.items) &&
      Array.isArray(state.completed) &&
      state.run_id === work.value.execution.run_id,
    'Mastra attempt differs',
  );
  const pending = state.items.filter((item) => item.issue_id !== null && item.observation === null);
  const item = pending.find((entry) => entry.request?.action_id === actionId);
  requireRepair(
    pending.length === 1 &&
      item?.issue_id === issueId &&
      !item.host_reservation &&
      !item.research_normalization &&
      committedActivation(repositoryRoot, config, item, state, work.value, ledger.value, attempt),
    'one exact unobserved read-only issue is required',
  );
  const request = item.request;
  const stage = config.workflows[request.workflow_id]?.stages.find((entry) => entry.id === request.stage_id);
  const assignment = stage?.assignments[request.assignment_index];
  const profile = config.agents.profiles[assignment?.profile];
  const toolPolicy = config.agents.tool_policies[profile?.tools_policy];
  requireRepair(
    assignment?.role === request.role &&
      profile?.mutation_scope === 'none' &&
      toolPolicy?.source_write === false &&
      profile?.egress_policy === 'none',
    'issued assignment is not configured cooperative read-only work',
  );
  requireRepair(
    request.config_digest === runtimeConfigDigest(config) &&
      request.scope_digest === state.source_scope?.digest &&
      work.value.binding.work_source_revision === state.source_scope.digest,
    'issued source or configuration binding differs',
  );
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const freshSource = snapshotDeclaredSources(
    access,
    state.source_scope.entries.map((entry) => entry.path),
  );
  requireRepair(
    freshSource.digest === state.source_scope.digest,
    'declared source drift requires a full new research wave',
  );
  requireRepair(
    state.items.every(
      (entry) =>
        entry === item ||
        (entry.observation?.status === 'reported_complete' &&
          entry.request.scope_digest === request.scope_digest &&
          entry.request.config_digest === request.config_digest),
    ),
    'completed research reports cannot be reused under current binding',
  );
  const body = {
    schema: 'VidaReadOnlyDispatchRepairPlan/v1',
    repair_id: repairId,
    actor,
    timestamp,
    workspace_id: workspaceId,
    repository_id: project.repository_id,
    project_ids: project.project_ids,
    integrations_digest: project.integrations_digest,
    work_id: workId,
    attempt,
    logical_action_id: actionId,
    prior_issue_id: issueId,
    prior_native_handle: nativeHandle,
    prior_outcome: 'unknown',
    prior_activation: item.research_activation ?? null,
    replacement_generation: 1,
    dispatch_action_id: canonicalJsonDigest({ repair_id: repairId, action_id: actionId, generation: 1 }),
    replacement_issue_id: deterministicIssueId({ repair_id: repairId, issue_id: issueId, generation: 1 }),
    request_digest: canonicalJsonDigest(request),
    scope_digest: request.scope_digest,
    config_digest: request.config_digest,
    source_digest: freshSource.digest,
    work_version: work.version,
    ledger_version: ledger.version,
    mastra_version: mastra.version,
    status: 'prepared',
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}

/** One SQLite transaction records a recovery intent without changing old strict-v1 rows. */
export function applyReadOnlyDispatchRepair({ database, plan, current }) {
  requireRepair(
    plan?.schema === 'VidaReadOnlyDispatchRepairPlan/v1' &&
      plan.digest === canonicalJsonDigest((({ digest: _digest, ...body }) => body)(plan)),
    'repair plan digest invalid',
  );
  return database
    .transaction(() => {
      const rebuilt = planReadOnlyDispatchRepair({
        ...current,
        database,
        workspaceId: plan.workspace_id,
        projectIds: plan.project_ids,
        workId: plan.work_id,
        attempt: plan.attempt,
        actionId: plan.logical_action_id,
        issueId: plan.prior_issue_id,
        nativeHandle: plan.prior_native_handle,
        repairId: plan.repair_id,
        actor: plan.actor,
        timestamp: plan.timestamp,
      });
      requireRepair(
        canonicalJsonDigest(rebuilt) === canonicalJsonDigest(plan),
        'repair plan is stale or differs from deterministic current state',
      );
      database.exec(
        'CREATE TABLE IF NOT EXISTS agent_host_readonly_dispatch_repair (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, logical_action_id TEXT NOT NULL, generation INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,logical_action_id,generation))',
      );
      const prior = database
        .query(
          'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=?',
        )
        .get(plan.workspace_id, plan.work_id, plan.attempt, plan.logical_action_id, plan.replacement_generation);
      if (prior) {
        requireRepair(
          prior.digest === plan.digest && prior.payload === canonicalJson(plan),
          'existing repair generation differs',
        );
        return plan;
      }
      database
        .query('INSERT INTO agent_host_readonly_dispatch_repair VALUES(?,?,?,?,?,?,?)')
        .run(
          plan.workspace_id,
          plan.work_id,
          plan.attempt,
          plan.logical_action_id,
          plan.replacement_generation,
          canonicalJson(plan),
          plan.digest,
        );
      return plan;
    })
    .immediate();
}
