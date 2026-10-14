import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import {
  canonicalJson,
  canonicalJsonDigest,
  isPlainRecord,
  assertCanonicalJsonValue,
} from '../src/contracts/public-ingress.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { qualifiedResearchSourceCatalog, qualifyLegacySynthesisCitations } from '../src/research-source-catalog.ts';
import { validateResearchSynthesis } from '../src/research-decision.ts';
import {
  admittedResearchResultsForSynthesis,
  synthesisSourceCatalog,
} from '../src/orchestration/observed-synthesis-result.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { openConfiguredMastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { parseMastraSessionLedgerState } from '../src/orchestration/mastra-session-ledger-codec.ts';
import type { Database, SQLQueryBindings } from 'bun:sqlite';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import type { StateVersion, WorkIdentity, WorkState } from '../src/host-state.ts';
import type { CoordinationLedger } from '../src/contracts/envelopes.ts';
import type {
  MastraLedgerItem,
  MastraSessionLedgerState,
  SynthesisObservationCorrectionPlan,
} from '../src/orchestration/persistent-session-handoff.ts';
import type { ResearchSynthesis } from '../src/research-decision.ts';

type SqliteQueryBinding = SQLQueryBindings;
type CorrectionRow = { revision: number; payload: string; digest: string };
type CheckedValue = { value: unknown; version: StateVersion };
type CorrectionHostState = {
  owner: WorkState;
  ledger: CoordinationLedger;
  workVersion: StateVersion;
  ledgerVersion: StateVersion;
};
type CorrectionInput = {
  database: Database;
  repositoryRoot: string;
  config: AgentRuntimeConfig;
  workspaceId: string;
  projectIds: readonly string[];
  workId: string;
  attempt: number;
  actionId: string;
  issueId: string;
  nativeHandle: string;
  ownerCorrectionPointer: string;
  correctionId: string;
  actor: string;
  timestamp: string;
};

function requireCorrection(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`synthesis observation correction: ${message}`);
}
const checked = (
  database: Database,
  table: string,
  where: string,
  args: SqliteQueryBinding[],
  digest: (value: unknown) => string = canonicalJsonDigest,
): CheckedValue => {
  const row = checkedCorrectionRow(
    database.query(`SELECT revision,payload,digest FROM ${table} WHERE ${where}`).get(...args),
    table,
  );
  const value: unknown = JSON.parse(row.payload);
  requireCorrection(row.digest === digest(value), `${table} checksum differs`);
  return { value, version: { revision: row.revision, digest: row.digest } };
};

function checkedCorrectionRow(row: unknown, table: string): CorrectionRow {
  requireCorrection(
    isPlainRecord(row) &&
      typeof row.revision === 'number' &&
      Number.isSafeInteger(row.revision) &&
      row.revision > 0 &&
      typeof row.payload === 'string' &&
      typeof row.digest === 'string',
    `${table} row is missing or malformed`,
  );
  return { revision: row.revision, payload: row.payload, digest: row.digest };
}

/** Plan only the observed, unnormalized synthesis collision. The native report stays historical truth. */
function planSynthesisObservationCorrection({
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
}: CorrectionInput): SynthesisObservationCorrectionPlan {
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
      isSortedProjectIds(projectIds),
    'correction identity or owner attribution invalid',
  );
  const project = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
  const hostIdentity = {
    repository_id: config.repository.repository_id,
    project_ids: projectIds,
    integrations_digest: project.integrations_digest,
    work_id: workId,
  };
  const { owner, ledger, workVersion, ledgerVersion } = currentHostCorrectionState(
    database,
    repositoryRoot,
    workspaceId,
    hostIdentity,
  );
  const journal = checked(database, 'agent_host_mastra_session_ledger', 'workspace_id=? AND work_id=? AND attempt=?', [
    workspaceId,
    workId,
    attempt,
  ]);
  const state = parseMastraSessionLedgerState(journal.value);
  const sourceScope = state.source_scope;
  const item = soleCorrectionItem(state);
  const observation = item.observation;
  const { stage, assignment, profile, toolPolicy } = correctionAssignment(config, item);
  const releasedTicket = [...ledger.tickets]
    .reverse()
    .find(
      (ticket) =>
        ticket.work_id === workId &&
        ticket.thread_id === nativeHandle &&
        ticket.repository_id === hostIdentity.repository_id &&
        canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(projectIds) &&
        ticket.integrations_digest === hostIdentity.integrations_digest &&
        ticket.status === 'released',
    );
  const releasedClaim =
    releasedTicket &&
    ledger.claims.some((claim) => claim.ticket_id === releasedTicket.ticket_id && claim.status === 'released');
  const release =
    releasedTicket &&
    ledger.operations.some(
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
      owner.binding.integrations_digest === hostIdentity.integrations_digest &&
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
      sourceScope !== null &&
      sourceScope !== undefined &&
      releasedTicket.source_revision === sourceScope.digest &&
      state.schema === 'MastraSessionLedger/v1' &&
      state.workspace_id === workspaceId &&
      state.work_id === workId &&
      state.attempt === attempt &&
      state.step_id !== null &&
      item?.request.action_id === actionId &&
      item.issue_id === issueId &&
      observation?.status === 'reported_complete' &&
      item.research_activation &&
      !item.research_normalization &&
      !item.host_reservation &&
      item.request.config_digest === runtimeConfigDigest(config) &&
      item.request.scope_digest === sourceScope.digest &&
      owner.binding.work_source_revision === sourceScope.digest &&
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
      sourceScope.entries.map((entry) => entry.path),
    ).digest === sourceScope.digest,
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
  let summary: ResearchSynthesis;
  try {
    summary = validateResearchSynthesis(JSON.parse(observation.summary));
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
  const body: Omit<SynthesisObservationCorrectionPlan, 'digest'> = {
    schema: 'VidaSynthesisObservationCorrectionPlan/v1',
    correction_id: correctionId,
    actor,
    timestamp,
    workspace_id: workspaceId,
    repository_id: hostIdentity.repository_id,
    project_ids: projectIds,
    integrations_digest: hostIdentity.integrations_digest,
    work_id: workId,
    attempt,
    action_id: actionId,
    prior_issue_id: issueId,
    native_session_handle: nativeHandle,
    owner_correction_pointer: ownerCorrectionPointer,
    config_digest: runtimeConfigDigest(config),
    source_digest: sourceScope.digest,
    predecessor_refs: catalog.result_refs,
    catalog_digest: canonicalJsonDigest(catalog),
    expected_work: workVersion,
    expected_ledger: ledgerVersion,
    expected_journal: journal.version,
    original_item: item,
  };
  return { ...body, digest: canonicalJsonDigest(body) };
}

function currentHostCorrectionState(
  database: Database,
  repositoryRoot: string,
  workspaceId: string,
  identity: WorkIdentity,
): CorrectionHostState {
  const hostState = createCliHostStateStore(
    database,
    workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    repositoryRoot,
    undefined,
    undefined,
    undefined,
    true,
  );
  const snapshot = hostState.readHostStateSnapshot(identity);
  const { work, ledger, workVersion, ledgerVersion } = snapshot;
  requireCorrection(
    work !== null && ledger !== null && workVersion !== null && ledgerVersion !== null,
    'current Host state is missing',
  );
  return { owner: work, ledger, workVersion, ledgerVersion };
}

function soleCorrectionItem(state: MastraSessionLedgerState): MastraLedgerItem {
  const item = state.items.length === 1 ? state.items[0] : null;
  requireCorrection(item, 'synthesis correction journal item is missing');
  return item;
}

function correctionAssignment(config: AgentRuntimeConfig, item: MastraLedgerItem) {
  const stage = config.workflows[item.request.workflow_id]?.stages.find((entry) => entry.id === item.request.stage_id);
  const assignment = stage?.assignments[item.request.assignment_index];
  const profile = assignment && config.agents.profiles[assignment.profile];
  const toolPolicy = profile && config.agents.tool_policies[profile.tools_policy];
  return { stage, assignment, profile, toolPolicy };
}

const planPath = (id: string): string => `.agent/work/${id}/synthesis-observation-correction-plan.v1.json`;

function storedPlan(access: SafeRepositoryAccess, correctionId: string): SynthesisObservationCorrectionPlan {
  const raw = access.readText(planPath(correctionId), 'synthesis observation correction plan');
  const plan: unknown = JSON.parse(raw);
  requireCorrection(isCorrectionPlan(plan), 'stored synthesis correction plan shape invalid');
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return isPlainRecord(value);
}

function isSortedProjectIds(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((id: unknown, index: number) => typeof id === 'string' && (index === 0 || value[index - 1] < id))
  );
}

function isStateVersion(value: unknown): value is StateVersion {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) > 0 &&
    typeof value.digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.digest)
  );
}

function hasCorrectionPlanIdentity(value: Record<string, unknown>): boolean {
  const strings = [
    'correction_id',
    'actor',
    'timestamp',
    'workspace_id',
    'repository_id',
    'integrations_digest',
    'work_id',
    'action_id',
    'prior_issue_id',
    'native_session_handle',
    'owner_correction_pointer',
    'config_digest',
    'source_digest',
    'catalog_digest',
    'digest',
  ];
  return strings.every((key) => typeof value[key] === 'string');
}

function hasCorrectionPlanVersions(value: Record<string, unknown>): boolean {
  return (
    typeof value.attempt === 'number' &&
    Number.isSafeInteger(value.attempt) &&
    Number(value.attempt) > 0 &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((id: unknown) => typeof id === 'string') &&
    isStateVersion(value.expected_work) &&
    isStateVersion(value.expected_ledger) &&
    isStateVersion(value.expected_journal)
  );
}

function hasCorrectionPlanLineage(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.predecessor_refs) &&
    value.predecessor_refs.every(
      (ref: unknown) => isRecord(ref) && typeof ref.result_id === 'string' && typeof ref.digest === 'string',
    )
  );
}

function hasCorrectionPlanItem(value: Record<string, unknown>): boolean {
  try {
    const parsed = parseMastraSessionLedgerState({
      schema: 'MastraSessionLedger/v1',
      workspace_id: value.workspace_id,
      work_id: value.work_id,
      attempt: value.attempt,
      run_id: 'correction-plan-validation',
      step_id: null,
      items: [value.original_item],
      completed: [],
    });
    return parsed.items.length === 1 && typeof value.original_item === 'object' && value.original_item !== null;
  } catch {
    return false;
  }
}

function isCorrectionPlan(value: unknown): value is SynthesisObservationCorrectionPlan {
  if (
    !isRecord(value) ||
    Reflect.ownKeys(value).length !== 23 ||
    value.schema !== 'VidaSynthesisObservationCorrectionPlan/v1'
  )
    return false;
  try {
    assertCanonicalJsonValue(value, '$.synthesis_observation_correction_plan');
  } catch {
    return false;
  }
  return (
    hasCorrectionPlanIdentity(value) &&
    hasCorrectionPlanVersions(value) &&
    hasCorrectionPlanLineage(value) &&
    hasCorrectionPlanItem(value)
  );
}

function argumentsForCorrection(args: readonly string[]): Record<string, string> {
  requireCorrection(args.length % 2 === 0, 'arguments must be paired');
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index],
      value = args[index + 1];
    requireCorrection(
      typeof key === 'string' &&
        key.startsWith('--') &&
        typeof value === 'string' &&
        value.length > 0 &&
        !Object.hasOwn(values, key),
      'arguments are missing or duplicate',
    );
    values[key] = value;
  }
  const mode = requiredArgument(values, '--mode'),
    projectRoot = requiredArgument(values, '--project-root'),
    correctionId = requiredArgument(values, '--correction-id');
  const expected = reconcileExpectedOptions('synthesis-observation-correction', mode, values) ?? [];
  const contract = reconcileCliContracts['synthesis-observation-correction'];
  requireCorrection(contract !== undefined, 'synthesis correction CLI contract is absent');
  requireCorrection(
    values['--kind'] === 'synthesis-observation-correction' &&
      contract.modes.includes(mode) &&
      path.isAbsolute(projectRoot) &&
      path.resolve(projectRoot) === projectRoot &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(correctionId) &&
      canonicalJson(Object.keys(values).sort()) === canonicalJson(expected.sort()),
    'synthesis correction arguments invalid',
  );
  return values;
}

function requiredArgument(values: Record<string, string>, key: string): string {
  const value = values[key];
  requireCorrection(typeof value === 'string' && value.length > 0, `required argument ${key} is missing`);
  return value;
}

function databasePath(root: string, config: AgentRuntimeConfig): string {
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
export async function runSynthesisObservationCorrection(args: readonly string[]) {
  const values = argumentsForCorrection(args);
  const root = requiredArgument(values, '--project-root');
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const access = requireSafeRepositoryAccess(root);
  const mode = requiredArgument(values, '--mode');
  const correctionId = requiredArgument(values, '--correction-id');
  const file = databasePath(root, config);
  if (mode === 'inspect' || mode === 'plan') {
    const database = openCliWorkspaceDatabase(root, file, workspaceId, true);
    let plan: SynthesisObservationCorrectionPlan;
    try {
      plan = planSynthesisObservationCorrection({
        database,
        repositoryRoot: root,
        config,
        workspaceId,
        projectIds: requiredArgument(values, '--projects').split(','),
        workId: requiredArgument(values, '--work-id'),
        attempt: Number(requiredArgument(values, '--attempt')),
        actionId: requiredArgument(values, '--action-id'),
        issueId: requiredArgument(values, '--issue-id'),
        nativeHandle: requiredArgument(values, '--native-handle'),
        ownerCorrectionPointer: requiredArgument(values, '--owner-correction-pointer'),
        correctionId,
        actor: requiredArgument(values, '--actor'),
        timestamp: requiredArgument(values, '--timestamp'),
      });
    } finally {
      closeWorkspaceDatabaseWithAdmission(database);
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
    const freshDatabase = openCliWorkspaceDatabase(root, file, workspaceId, true);
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
      closeWorkspaceDatabaseWithAdmission(freshDatabase);
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
