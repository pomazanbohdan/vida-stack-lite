// @ts-check
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import { validateActivationUse, validateObservedActivationUseWritePlan } from '../src/research-decision.ts';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createCliHostStateStore } from './workspace-database-cli.ts';

/** @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} AgentRuntimeConfig */
/** @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity */
/** @typedef {import('../src/host-state.ts').StateVersion} StateVersion */
/** @typedef {import('../src/host-state.ts').WorkState} WorkState */
/** @typedef {import('../src/host-state.ts').HostStateSnapshot} HostStateSnapshot */
/** @typedef {import('../src/contracts/envelopes.ts').CoordinationLedger} CoordinationLedger */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} MastraSessionLedgerState */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraLedgerItem} MastraLedgerItem */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest} SessionBridgeRequest */
/** @typedef {import('../src/research-decision.ts').ActivationUse} ActivationUse */
/** @typedef {import('../src/research-decision.ts').ObservedActivationUseWritePlan} ActivationWritePlan */
/** @typedef {import('bun:sqlite').Database} SqliteDatabase */

/** @typedef {{use: ActivationUse, plan: ActivationWritePlan}} ActivationEvidence */
/** @typedef {{schema: 'VidaReadOnlyDispatchRepairPlan/v1', repair_id: string, actor: string, timestamp: string, workspace_id: string, repository_id: string, project_ids: readonly string[], integrations_digest: string, work_id: string, attempt: number, logical_action_id: string, prior_issue_id: string, prior_native_handle: string, prior_outcome: 'unknown', prior_activation: ActivationEvidence | null, replacement_generation: 1, dispatch_action_id: string, replacement_issue_id: string, request_digest: string, scope_digest: string, config_digest: string, source_digest: string, work_version: StateVersion, ledger_version: StateVersion, mastra_version: StateVersion, status: 'prepared', digest: string}} ReadOnlyDispatchPlan */

/** @type {(condition: unknown, message: string) => asserts condition} */
const requireRepair = (condition, message) => {
  if (!condition) throw new Error(`vida read-only dispatch repair: ${message}`);
};
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const workIdentifier = /^[a-z0-9][a-z0-9-]{0,127}$/;
const hash = /^[a-f0-9]{64}$/;
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {unknown} value @returns {value is {revision: number, payload: string, digest: string}} */
function isCheckedRow(value) {
  return (
    isRecord(value) &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision > 0 &&
    typeof value.payload === 'string' &&
    typeof value.digest === 'string'
  );
}
/** @param {unknown} value @returns {value is {digest: string, payload: string}} */
function isPriorRepairRecord(value) {
  return isRecord(value) && typeof value.digest === 'string' && typeof value.payload === 'string';
}
/** @template T @param {Record<string, T>} values @param {string | undefined} key @returns {T | undefined} */
function configuredValue(values, key) {
  return key === undefined ? undefined : values[key];
}
/** @param {HostStateSnapshot} host @returns {asserts host is HostStateSnapshot & {work: WorkState, ledger: CoordinationLedger, workVersion: StateVersion, ledgerVersion: StateVersion}} */
function requireCompleteHostSnapshot(host) {
  requireRepair(host.work && host.ledger && host.workVersion && host.ledgerVersion, 'Host snapshot is incomplete');
}
/** @param {unknown} value @returns {value is string[]} */
function isSortedUniqueProjectIds(value) {
  if (!Array.isArray(value) || value.length === 0) return false;
  let previous;
  for (const id of value) {
    if (typeof id !== 'string' || (previous !== undefined && previous >= id)) return false;
    previous = id;
  }
  return true;
}
/** @param {unknown} value @returns {value is ActivationEvidence} */
export function isActivationEvidence(value) {
  if (!isRecord(value) || Object.keys(value).sort().join('|') !== 'plan|use') return false;
  try {
    validateActivationUse(value.use);
    validateObservedActivationUseWritePlan(value.plan);
    return true;
  } catch {
    return false;
  }
}
/** @param {string | Uint8Array} value */
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
/** @param {string} root @param {AgentRuntimeConfig} config @param {MastraLedgerItem} item @param {MastraSessionLedgerState} state @param {WorkState} work @param {CoordinationLedger} ledger @param {number} attempt */
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
      ticket?.status !== 'released' ||
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
/** @param {unknown} binding */
function deterministicIssueId(binding) {
  const hex = canonicalJsonDigest(binding).slice(0, 32);
  const variant = ((parseInt(hex.charAt(16), 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** @param {SqliteDatabase} database @param {string} table @param {string} where @param {import('bun:sqlite').SQLQueryBindings[]} args @param {(value: unknown) => string} [digest] */
function checkedRow(database, table, where, args, digest = canonicalJsonDigest) {
  /** @type {unknown} */
  const rowValue = database.query(`SELECT revision,payload,digest FROM ${table} WHERE ${where}`).get(...args);
  requireRepair(isCheckedRow(rowValue), `${table} row missing or malformed`);
  const row = rowValue;
  /** @type {unknown} */
  const value = JSON.parse(row.payload);
  requireRepair(digest(value) === row.digest, `${table} digest differs`);
  return { version: { revision: row.revision, digest: row.digest }, value };
}
/** @param {MastraLedgerItem} entry @param {MastraLedgerItem} dispatched @param {SessionBridgeRequest} request @returns {boolean} */
function isReusableReadOnlyReport(entry, dispatched, request) {
  return (
    entry === dispatched ||
    (entry.observation?.status === 'reported_complete' &&
      entry.request.scope_digest === request.scope_digest &&
      entry.request.config_digest === request.config_digest)
  );
}

/** Pure plan over existing current-v1 rows. No timeout, interrupt or caller report becomes no-effect proof.
 * @param {{database: SqliteDatabase, repositoryRoot: string, config: AgentRuntimeConfig, workspaceId: string, projectIds: readonly string[], workId: string, attempt: number, actionId: string, issueId: string, nativeHandle: string, repairId: string, actor: string, timestamp: string}} input
 * @returns {ReadOnlyDispatchPlan}
 */
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
  requireRepair(isSortedUniqueProjectIds(projectIds), 'project set must be exact sorted unique IDs');
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
  /** @type {WorkIdentity} */
  const identity = {
    repository_id: project.repository_id,
    project_ids: project.project_ids,
    integrations_digest: project.integrations_digest,
    work_id: workId,
  };
  const host = createCliHostStateStore(
    database,
    workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    repositoryRoot,
  ).readHostStateSnapshot(identity);
  requireCompleteHostSnapshot(host);
  const workValue = host.work;
  const ledgerValue = host.ledger;
  const workVersion = host.workVersion;
  const ledgerVersion = host.ledgerVersion;
  const work = { value: workValue, version: workVersion };
  const ledger = { value: ledgerValue, version: ledgerVersion };
  const mastra = checkedRow(
    database,
    'agent_host_mastra_session_ledger',
    'workspace_id=? AND work_id=? AND attempt=?',
    [workspaceId, workId, attempt],
  );
  const state = parseMastraSessionLedgerState(mastra.value);
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
  requireRepair(
    state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === workspaceId &&
      state.work_id === workId &&
      state.attempt === attempt &&
      state.step_id &&
      state.run_id === work.value.execution.run_id,
    'Mastra attempt differs',
  );
  requireRepair(state.source_scope, 'Mastra source scope is unavailable');
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
  const profile = configuredValue(config.agents.profiles, assignment?.profile);
  const toolPolicy = configuredValue(config.agents.tool_policies, profile?.tools_policy);
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
    state.items.every((entry) => isReusableReadOnlyReport(entry, item, request)),
    'completed research reports cannot be reused under current binding',
  );
  /** @satisfies {Omit<ReadOnlyDispatchPlan, 'digest'>} */
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

/** One SQLite transaction records a recovery intent without changing old strict-v1 rows.
 * @param {{database: SqliteDatabase, plan: ReadOnlyDispatchPlan, current: {repositoryRoot: string, config: AgentRuntimeConfig}}} input
 */
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
      /** @type {unknown} */
      const priorValue = database
        .query(
          'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=?',
        )
        .get(plan.workspace_id, plan.work_id, plan.attempt, plan.logical_action_id, plan.replacement_generation);
      if (priorValue) {
        requireRepair(isPriorRepairRecord(priorValue), 'existing repair generation differs');
        const prior = priorValue;
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
