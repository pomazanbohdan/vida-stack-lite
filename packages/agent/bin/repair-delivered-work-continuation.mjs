#!/usr/bin/env bun
import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliHostStateDatabase,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts, reconcileExpectedOptions } from './reconcile-cli-contracts.ts';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest, rfc3339TimestampMilliseconds } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

/** @type {(condition: unknown, message: string) => asserts condition} */
const required = (condition, message) => {
  if (!condition) throw new Error(`vida repair delivered-work-continuation: ${message}`);
};
const digestPattern = /^[a-f0-9]{64}$/;
/** @param {unknown} a @param {unknown} b */
const same = (a, b) => canonicalJsonDigest(a) === canonicalJsonDigest(b);
/** @param {Record<string, string>} values @param {string} key @returns {string} */
const value = (values, key) => {
  const found = values[key];
  required(typeof found === 'string', `missing ${key}`);
  return found;
};
/** @param {Record<string, string>} values @returns {string[]} */
function expectedRepairOptions(values) {
  const expected = reconcileExpectedOptions('delivered-work-continuation', value(values, '--mode'), values);
  required(expected, 'repair mode has no declared option set');
  return expected;
}
/** @param {Record<string, string>} values */
function validatePlanningArgs(values) {
  required(
    isValidPlanningAttribution(values) && isValidPlanningIdentity(values),
    'inspect/plan identity or attribution missing',
  );
}
/** @param {Record<string, string>} values @returns {boolean} */
function isValidPlanningAttribution(values) {
  const actor = value(values, '--actor'),
    timestamp = value(values, '--timestamp');
  return (
    actor.trim().length > 0 &&
    timestamp.trim().length > 0 &&
    actor === actor.trim() &&
    actor.length <= 256 &&
    !/\p{Cc}/u.test(actor) &&
    rfc3339TimestampMilliseconds(timestamp) !== null
  );
}
/** @param {Record<string, string>} values @returns {boolean} */
function isValidPlanningIdentity(values) {
  const projectIds = value(values, '--projects').split(',');
  return (
    value(values, '--work-id').length > 0 &&
    /^[1-9][0-9]*$/.test(value(values, '--attempt')) &&
    digestPattern.test(value(values, '--action-id')) &&
    projectIds.length > 0 &&
    projectIds.every((id) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) &&
    new Set(projectIds).size === projectIds.length
  );
}

export {
  validateConfiguredFrontierReceiptStructure,
  validateConfiguredFrontierRepairReceipt,
  assertApplicableRepairBranch,
} from '../src/orchestration/delivered-work-continuation-repair.ts';
import { assertApplicableRepairBranch } from '../src/orchestration/delivered-work-continuation-repair.ts';

/** @param {string[]} args @returns {Record<string, string>} */
function parse(args) {
  const values = /** @type {Record<string, string>} */ ({});
  required(args.length % 2 === 0, 'repair arguments must be paired');
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i],
      value = args[i + 1];
    required(
      typeof key === 'string' &&
        key.startsWith('--') &&
        typeof value === 'string' &&
        value.length > 0 &&
        !Object.hasOwn(values, key),
      'invalid arguments',
    );
    values[key] = value;
  }
  required(
    value(values, '--kind') === 'delivered-work-continuation' &&
      reconcileCliContracts['delivered-work-continuation']?.modes.includes(value(values, '--mode')) === true &&
      path.isAbsolute(value(values, '--project-root') ?? '') &&
      path.resolve(value(values, '--project-root')) === value(values, '--project-root') &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value(values, '--repair-id') ?? ''),
    'mode, project root or repair id invalid',
  );
  const expectedOptions = expectedRepairOptions(values);
  required(same(Object.keys(values).sort(), expectedOptions.sort()), 'missing or unexpected arguments');
  if (['inspect', 'plan'].includes(value(values, '--mode'))) {
    validatePlanningArgs(values);
  }
  return values;
}
const maxPlanBytes = 64 * 1024 * 1024;
/** @param {string} file @param {string} label */
function safeIdentity(file, label) {
  const info = lstatSync(file);
  required(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, `${label} must be a single-link regular file`);
  return { dev: info.dev, ino: info.ino };
}
/** @param {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} access @param {string} root @param {string} repairId */
function readPlan(access, root, repairId) {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`,
    file = path.join(root, relative),
    before = lstatSync(file);
  required(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= maxPlanBytes,
    'repair plan path or size is unsafe',
  );
  const bytes = access.readBytes(relative, 'delivered-work continuation repair plan'),
    after = lstatSync(file);
  required(
    after.isFile() &&
      !after.isSymbolicLink() &&
      after.nlink === 1 &&
      before.dev === after.dev &&
      before.ino === after.ino &&
      before.size === after.size &&
      before.mtimeMs === after.mtimeMs &&
      bytes.length <= maxPlanBytes,
    'repair plan identity changed or bounded read exceeded',
  );
  /** @type {unknown} */
  const plan = JSON.parse(bytes.toString('utf8'));
  required(bytes.equals(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)), 'repair plan bytes are not canonical');
  return plan;
}
/** @param {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} access @param {string} repairId @param {unknown} plan */
function writePlan(access, repairId, plan) {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`,
    bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  required(bytes.length <= maxPlanBytes, 'repair plan exceeds the bounded artifact size');
  access.ensureDirectory(`.agent/work/${repairId}`, 'delivered-work continuation repair work root');
  access.writeExclusive(relative, bytes.toString('utf8'), 'delivered-work continuation repair plan');
}
/** @param {unknown} value @param {string} workspaceId */
function validatePlan(value, workspaceId) {
  required(isRecord(value), 'repair plan must be an object');
  const plan = value;
  required(plan.schema === 'DeliveredWorkContinuationIntegrityRepairPlan/v1', 'repair plan schema differs');
  requirePlanDigest(plan);
  requirePlanWorkspace(plan, workspaceId);
  return { ...plan, branch: requirePlanBranch(plan.branch) };
}
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {Record<string, unknown>} plan */
function requirePlanDigest(plan) {
  const digest = plan.digest;
  const { digest: _digest, ...body } = plan;
  required(
    typeof digest === 'string' && digestPattern.test(digest) && canonicalJsonDigest(body) === digest,
    'frozen repair plan digest differs',
  );
}
/** @param {Record<string, unknown>} plan @param {string} workspaceId */
function requirePlanWorkspace(plan, workspaceId) {
  required(
    isRecord(plan.inspection) && plan.inspection.workspace_id === workspaceId,
    'repair plan belongs to another workspace',
  );
}
/** @param {unknown} branch @returns {'historical_terminal_review' | 'configured_frontier'} */
function requirePlanBranch(branch) {
  required(
    branch === 'historical_terminal_review' || branch === 'configured_frontier',
    'repair plan branch is unsupported',
  );
  return branch;
}

/** @param {string[]} args */
export async function runDeliveredWorkContinuationRepair(args) {
  const values = parse(args),
    root = value(values, '--project-root'),
    access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root),
    repairId = value(values, '--repair-id'),
    workspaceId = deriveWorkspaceId(config.repository.repository_id, root),
    relativeDatabasePath = sessionHandoffDatabaseRelativePath(config);
  access.assertDirectory(config.control.work_root, 'configured Host work root');
  required(
    access.fileExists(relativeDatabasePath, 'configured Host database'),
    'configured Host database is absent or unsafe',
  );
  const databasePath = sessionHandoffDatabasePath(root, config),
    databaseIdentity = safeIdentity(databasePath, 'configured Host database'),
    mode = value(values, '--mode'),
    readonly = ['inspect', 'plan'].includes(mode),
    database = readonly
      ? openCliWorkspaceDatabase(root, databasePath, workspaceId, true)
      : openCliHostStateDatabase(root, databasePath, workspaceId);
  try {
    const store = createCliHostStateStore(
      database,
      workspaceId,
      undefined,
      undefined,
      undefined,
      undefined,
      root,
      undefined,
      undefined,
      undefined,
      readonly,
    );
    if (readonly) {
      const projectIds = value(values, '--projects').split(',').sort(),
        project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
      const inspection = store.inspectDeliveredWorkContinuationRepair(
        {
          repository_id: config.repository.repository_id,
          project_ids: projectIds,
          integrations_digest: project.integrations_digest,
          work_id: value(values, '--work-id'),
        },
        Number(value(values, '--attempt')),
        value(values, '--action-id'),
      );
      const branch = repairBranchFromInspectionPayload(inspection.row.payload);
      const planBody = {
        schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1',
        branch,
        repair_id: repairId,
        actor: value(values, '--actor'),
        timestamp: value(values, '--timestamp'),
        inspection,
      };
      if (mode === 'inspect')
        return {
          status: 'repairable_current_v1',
          repair_id: repairId,
          plan_digest: canonicalJsonDigest(planBody),
          branch: planBody.branch,
        };
      const plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
      writePlan(access, repairId, plan);
      return { status: 'planned', repair_id: repairId, plan_digest: plan.digest, branch: plan.branch };
    }
    const plan = validatePlan(readPlan(access, root, repairId), workspaceId);
    assertApplicableRepairBranch(plan.branch);
    if (mode === 'apply') store.reserveDeliveredWorkContinuationRepair(plan);
    return store.applyDeliveredWorkContinuationRepair(plan);
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
    const afterIdentity = safeIdentity(databasePath, 'configured Host database');
    required(
      databaseIdentity.dev === afterIdentity.dev && databaseIdentity.ino === afterIdentity.ino,
      'configured Host database identity changed',
    );
  }
}

/** @param {string} payload @returns {'historical_terminal_review' | 'configured_frontier'} */
function repairBranchFromInspectionPayload(payload) {
  /** @type {unknown} */
  const receipt = JSON.parse(payload);
  required(
    isRecord(receipt) && isRecord(receipt.request) && isRecord(receipt.request.action),
    'repair receipt action is malformed',
  );
  return requirePlanBranch(receipt.request.action.kind);
}
