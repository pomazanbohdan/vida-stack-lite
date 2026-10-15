import { canonicalJsonDigest, isPlainRecord as isRecord } from '../contracts/public-ingress.js';
import {
  loadProjectSetContext,
  validateProjectContextBinding,
  type ProjectContext,
} from '../config/project-context.js';
import { runtimeConfigDigest, type AgentRuntimeConfig } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { snapshotDeclaredSources } from './scoped-source-snapshot.js';
import { selectPausedLocalOwner } from './resume-paused-local-work.js';
import {
  validateActivationUse,
  validateObservedActivationUseWritePlan,
  type ActivationUse,
  type ObservedActivationUseWritePlan,
} from '../research-decision.js';
import type { StateVersion, WorkState, HostStateSnapshot, HostWorkSessionSnapshot } from '../host-state.js';
import type { CoordinationLedger } from '../contracts/envelopes.js';
import type { MastraSessionLedgerState, MastraLedgerItem } from './persistent-session-handoff.js';
import type { SessionBridgeRequest } from './mastra-session-bridge.js';
import { createHash } from 'node:crypto';
import path from 'node:path';

export interface ActivationEvidence {
  readonly use: ActivationUse;
  readonly plan: ObservedActivationUseWritePlan;
}
export interface ReadOnlyDispatchRepairInput {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly workspaceId: string;
  readonly projectIds: readonly string[];
  readonly workId: string;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
  readonly nativeHandle: string;
  readonly repairId: string;
  readonly actor: string;
  readonly timestamp: string;
}
export interface ReadOnlyDispatchRepairPlan {
  readonly schema: 'VidaReadOnlyDispatchRepairPlan/v2';
  readonly repair_id: string;
  readonly actor: string;
  readonly timestamp: string;
  readonly workspace_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly integrations_digest: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly logical_action_id: string;
  readonly prior_issue_id: string;
  readonly prior_native_handle: string;
  readonly prior_outcome: 'unknown';
  readonly prior_activation: ActivationEvidence | null;
  readonly replacement_generation: 1;
  readonly dispatch_action_id: string;
  readonly replacement_issue_id: string;
  readonly request_digest: string;
  readonly scope_digest: string;
  readonly config_digest: string;
  readonly source_digest: string;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly mastra_version: StateVersion;
  readonly maintenance_generation: number;
  readonly status: 'prepared';
  readonly digest: string;
}

export const requireRepair: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(`vida read-only dispatch repair: ${message}`);
};
const identifier = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const workIdentifier = /^[a-z0-9][a-z0-9-]{0,127}$/;
const hash = /^[a-f0-9]{64}$/;
function isBoundedDispatchIdentity(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}
function configuredValue<T>(values: Record<string, T>, key: string | undefined): T | undefined {
  return key === undefined ? undefined : values[key];
}
function requireCompleteHostSnapshot(host: HostStateSnapshot): asserts host is HostStateSnapshot & {
  work: WorkState;
  ledger: CoordinationLedger;
  workVersion: StateVersion;
  ledgerVersion: StateVersion;
} {
  requireRepair(host.work && host.ledger && host.workVersion && host.ledgerVersion, 'Host snapshot is incomplete');
}
function isSortedUniqueProjectIds(value: unknown): value is string[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  let previous;
  for (const id of value) {
    if (typeof id !== 'string' || (previous !== undefined && previous >= id)) return false;
    previous = id;
  }
  return true;
}
export function isActivationEvidence(value: unknown): value is ActivationEvidence {
  if (!isRecord(value) || Object.keys(value).sort().join('|') !== 'plan|use') return false;
  try {
    validateActivationUse(value.use);
    validateObservedActivationUseWritePlan(value.plan);
    return true;
  } catch {
    return false;
  }
}
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function committedActivation(
  root: string,
  config: AgentRuntimeConfig,
  item: MastraLedgerItem,
  state: MastraSessionLedgerState,
  work: WorkState,
  ledger: CoordinationLedger,
  attempt: number,
) {
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
function deterministicIssueId(binding: unknown) {
  const hex = canonicalJsonDigest(binding).slice(0, 32);
  const variant = ((parseInt(hex.charAt(16), 16) & 3) | 8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function isReusableReadOnlyReport(
  entry: MastraLedgerItem,
  dispatched: MastraLedgerItem,
  request: SessionBridgeRequest,
): boolean {
  return (
    entry === dispatched ||
    (entry.observation?.status === 'reported_complete' &&
      entry.request.scope_digest === request.scope_digest &&
      entry.request.config_digest === request.config_digest)
  );
}

export function buildReadOnlyDispatchRepairPlan({
  snapshot,
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
  projectContext,
}: ReadOnlyDispatchRepairInput & {
  snapshot: HostWorkSessionSnapshot;
  projectContext?: ProjectContext;
}): ReadOnlyDispatchRepairPlan {
  requireRepair(
    identifier.test(repairId) &&
      workIdentifier.test(workId) &&
      Number.isSafeInteger(attempt) &&
      attempt > 0 &&
      hash.test(actionId) &&
      isBoundedDispatchIdentity(issueId) &&
      isBoundedDispatchIdentity(nativeHandle) &&
      typeof actor === 'string' &&
      actor.trim() === actor &&
      actor.length > 0 &&
      typeof timestamp === 'string' &&
      !Number.isNaN(Date.parse(timestamp)),
    'repair request invalid',
  );
  requireRepair(isSortedUniqueProjectIds(projectIds), 'project set must be exact sorted unique IDs');
  const configDigest = runtimeConfigDigest(config);
  const project =
    projectContext === undefined
      ? loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds)
      : validateProjectContextBinding(projectContext, repositoryRoot);
  requireRepair(
    project.repository_id === config.repository.repository_id &&
      canonicalJsonDigest(project.project_ids) === canonicalJsonDigest(projectIds) &&
      project.config_digest === configDigest,
    'repair project context differs',
  );
  const host = snapshot.host;
  requireCompleteHostSnapshot(host);
  const workValue = host.work;
  const ledgerValue = host.ledger;
  const workVersion = host.workVersion;
  const ledgerVersion = host.ledgerVersion;
  const work = { value: workValue, version: workVersion };
  const ledger = { value: ledgerValue, version: ledgerVersion };
  const journal = snapshot.journal;
  requireRepair(journal !== null && journal.attempt === attempt, 'Mastra attempt is unavailable');
  const state = journal.state;
  requireRepair(
    workValue.lease === null && workValue.execution.status === 'suspended',
    'rightful owner must be cooperatively paused before dispatch repair',
  );
  requireRepair(
    work.value.schema === 'WorkState/v1' &&
      work.value.binding.lifecycle_work_id === workId &&
      canonicalJsonDigest(work.value.binding.project_ids) === canonicalJsonDigest(projectIds) &&
      work.value.binding.integrations_digest === project.integrations_digest &&
      work.value.binding.config_digest === configDigest,
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
  requireRepair(
    workValue.request_transition?.successor_work_id == null &&
      workValue.lifecycle.phase !== 'COMPLETE' &&
      !workValue.execution.assignment_attempts.some(
        (entry) => entry.status === 'started' || entry.status === 'uncertain',
      ),
    'paused work authority or scoped source changed',
  );
  selectPausedLocalOwner(
    workValue,
    ledgerValue,
    {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: workId,
    },
    nativeHandle,
    state.source_scope.digest,
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
    request.config_digest === configDigest &&
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
  const body: Omit<ReadOnlyDispatchRepairPlan, 'digest'> = {
    schema: 'VidaReadOnlyDispatchRepairPlan/v2',
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
    mastra_version: journal.version,
    maintenance_generation: host.maintenanceGeneration,
    status: 'prepared',
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}
