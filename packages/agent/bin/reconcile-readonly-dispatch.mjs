// @ts-check
// @ts-check
import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';

import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import {
  planReadOnlyDispatchRepair,
  applyReadOnlyDispatchRepair,
  isActivationEvidence,
} from './read-only-dispatch-repair.mjs';

/** @typedef {ReturnType<typeof planReadOnlyDispatchRepair>} ReadOnlyDispatchPlan */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}
/** @param {unknown} value @returns {value is {revision: number, digest: string}} */
function isStateVersion(value) {
  return (
    isRecord(value) &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    typeof value.digest === 'string'
  );
}
/** @param {Record<string, unknown>} value */
function hasPlanIdentity(value) {
  return (
    typeof value.repair_id === 'string' &&
    typeof value.actor === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.workspace_id === 'string' &&
    typeof value.repository_id === 'string' &&
    isStringArray(value.project_ids) &&
    typeof value.integrations_digest === 'string' &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    Number.isSafeInteger(value.attempt)
  );
}
/** @param {Record<string, unknown>} value */
function hasPlanRequest(value) {
  return (
    typeof value.logical_action_id === 'string' &&
    typeof value.prior_issue_id === 'string' &&
    typeof value.prior_native_handle === 'string' &&
    value.prior_outcome === 'unknown' &&
    (value.prior_activation === null || isActivationEvidence(value.prior_activation)) &&
    typeof value.request_digest === 'string' &&
    typeof value.scope_digest === 'string' &&
    typeof value.config_digest === 'string' &&
    typeof value.source_digest === 'string'
  );
}
/** @param {Record<string, unknown>} value */
function hasPlanResult(value) {
  return (
    value.replacement_generation === 1 &&
    typeof value.dispatch_action_id === 'string' &&
    typeof value.replacement_issue_id === 'string' &&
    isStateVersion(value.work_version) &&
    isStateVersion(value.ledger_version) &&
    isStateVersion(value.mastra_version) &&
    value.status === 'prepared' &&
    typeof value.digest === 'string'
  );
}
/** @param {unknown} value @returns {value is ReadOnlyDispatchPlan} */
function isReadOnlyDispatchPlan(value) {
  if (!isRecord(value)) return false;
  const expected = [
    'schema',
    'repair_id',
    'actor',
    'timestamp',
    'workspace_id',
    'repository_id',
    'project_ids',
    'integrations_digest',
    'work_id',
    'attempt',
    'logical_action_id',
    'prior_issue_id',
    'prior_native_handle',
    'prior_outcome',
    'prior_activation',
    'replacement_generation',
    'dispatch_action_id',
    'replacement_issue_id',
    'request_digest',
    'scope_digest',
    'config_digest',
    'source_digest',
    'work_version',
    'ledger_version',
    'mastra_version',
    'status',
    'digest',
  ];
  return (
    value.schema === 'VidaReadOnlyDispatchRepairPlan/v1' &&
    Object.keys(value).sort().join('|') === expected.sort().join('|') &&
    hasPlanIdentity(value) &&
    hasPlanRequest(value) &&
    hasPlanResult(value)
  );
}

/** @type {(condition: unknown, message: string) => asserts condition} */
const requireCommand = (condition, message) => {
  if (!condition) throw new Error(`vida repair artifacts: ${message}`);
};
/** @param {Record<string, string>} values @param {string} key @returns {string} */
function requiredOption(values, key) {
  const value = values[key];
  requireCommand(typeof value === 'string', `required option ${key} is missing`);
  return value;
}
/** @param {string} root @param {string} repairId */
const planFile = (root, repairId) => `.agent/work/${repairId}/read-only-dispatch-plan.v1.json`;

/** @param {string[]} args @returns {Record<string, string>} */
function argsObject(args) {
  requireCommand(args.length % 2 === 0, 'read-only dispatch arguments must be paired');
  /** @type {Record<string, string>} */
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    requireCommand(
      typeof key === 'string' &&
        key.startsWith('--') &&
        typeof value === 'string' &&
        value.length > 0 &&
        !Object.hasOwn(values, key),
      'read-only dispatch arguments invalid',
    );
    values[key] = value;
  }
  const mode = requiredOption(values, '--mode');
  const projectRoot = requiredOption(values, '--project-root');
  const repairId = requiredOption(values, '--repair-id');
  const contract = reconcileCliContracts['readonly-dispatch'];
  requireCommand(contract, 'read-only dispatch contract is unavailable');
  requireCommand(
    requiredOption(values, '--kind') === 'readonly-dispatch' &&
      contract.modes.includes(mode) &&
      path.isAbsolute(projectRoot) &&
      path.resolve(projectRoot) === projectRoot &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(repairId),
    'read-only dispatch kind, mode, root or repair identity invalid',
  );
  const keys = Object.keys(values).sort();
  const expected = (reconcileExpectedOptions('readonly-dispatch', mode, values) ?? []).sort();
  requireCommand(
    JSON.stringify(keys) === JSON.stringify(expected),
    'read-only dispatch has missing or unexpected arguments',
  );
  return values;
}

/** @param {string} root @param {string} repairId @returns {ReadOnlyDispatchPlan} */
function readPlan(root, repairId) {
  const file = path.join(root, planFile(root, repairId));
  const stat = lstatSync(file);
  requireCommand(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'read-only dispatch plan path is unsafe');
  const raw = readFileSync(file);
  /** @type {unknown} */
  const plan = JSON.parse(raw.toString('utf8'));
  requireCommand(
    isReadOnlyDispatchPlan(plan) && raw.equals(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)),
    'read-only dispatch plan is not exact canonical JSON',
  );
  return plan;
}

/** @param {string} root @param {string} repairId @param {ReadOnlyDispatchPlan} plan */
function writePlan(root, repairId, plan) {
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory(`.agent/work/${repairId}`, 'read-only dispatch repair evidence');
  const file = path.join(root, planFile(root, repairId));
  const bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, bytes);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

/** Sole public reconcile-artifacts CLI branch; this prepares provenance, not native dispatch. */
/** @param {string[]} args */
export function runReadOnlyDispatchRepair(args) {
  const values = argsObject(args);
  const root = requiredOption(values, '--project-root');
  const mode = requiredOption(values, '--mode');
  const repairId = requiredOption(values, '--repair-id');
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const access = requireSafeRepositoryAccess(root);
  access.assertDirectory(config.control.work_root, 'read-only dispatch state root');
  const relativeDatabasePath = sessionHandoffDatabaseRelativePath(config);
  requireCommand(
    access.fileExists(relativeDatabasePath, 'read-only dispatch database'),
    'read-only dispatch database is absent or unsafe',
  );
  const databasePath = sessionHandoffDatabasePath(root, config);
  const databaseStats = lstatSync(databasePath);
  requireCommand(
    databaseStats.isFile() && !databaseStats.isSymbolicLink() && databaseStats.nlink === 1,
    'read-only dispatch database must be a single-link regular file',
  );
  const database = openCliWorkspaceDatabase(root, databasePath, workspaceId, mode === 'inspect' || mode === 'plan');
  try {
    if (['inspect', 'plan'].includes(mode)) {
      const projectIds = requiredOption(values, '--projects').split(',');
      const plan = planReadOnlyDispatchRepair({
        database,
        repositoryRoot: root,
        config,
        workspaceId,
        projectIds,
        workId: requiredOption(values, '--work-id'),
        attempt: Number(requiredOption(values, '--attempt')),
        actionId: requiredOption(values, '--action-id'),
        issueId: requiredOption(values, '--issue-id'),
        nativeHandle: requiredOption(values, '--native-handle'),
        repairId,
        actor: requiredOption(values, '--actor'),
        timestamp: requiredOption(values, '--timestamp'),
      });
      if (mode === 'plan') writePlan(root, repairId, plan);
      return {
        status: mode === 'plan' ? 'planned' : 'repairable_current_v1',
        repair_id: plan.repair_id,
        plan_digest: plan.digest,
        old_issue_outcome: plan.prior_outcome,
        new_dispatch_generation: plan.replacement_generation,
      };
    }
    const plan = readPlan(root, repairId);
    const project = loadProjectSetContext(root, config, config.repository.repository_id, plan.project_ids);
    const identity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: plan.work_id,
    };
    const host = createCliHostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    ).readHostStateSnapshot(identity);
    requireCommand(
      host.work?.lease === null && host.work.execution.status === 'suspended',
      'rightful owner must be cooperatively paused before dispatch repair',
    );
    const saved = applyReadOnlyDispatchRepair({ database, plan, current: { repositoryRoot: root, config } });
    return {
      status: 'prepared',
      repair_id: saved.repair_id,
      plan_digest: saved.digest,
      old_issue_outcome: saved.prior_outcome,
      new_dispatch_generation: saved.replacement_generation,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
