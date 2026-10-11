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
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

function required(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`vida repair delivered-work-continuation: ${message}`);
}
const digestPattern = /^[a-f0-9]{64}$/;
const same = (a: unknown, b: unknown): boolean => canonicalJsonDigest(a) === canonicalJsonDigest(b);
type CliValues = Readonly<Record<string, string>>;
function value(values: CliValues, key: string): string {
  const found = values[key];
  required(typeof found === 'string', `missing ${key}`);
  return found;
}
function expectedRepairOptions(values: CliValues): string[] {
  const expected = reconcileExpectedOptions('delivered-work-continuation', value(values, '--mode'), values);
  required(expected, 'repair mode has no declared option set');
  return expected;
}
function isValidPlanningAttribution(values: CliValues): boolean {
  const actor = value(values, '--actor');
  const timestamp = value(values, '--timestamp');
  return (
    actor.trim().length > 0 &&
    timestamp.trim().length > 0 &&
    actor === actor.trim() &&
    actor.length <= 256 &&
    !/\p{Cc}/u.test(actor) &&
    rfc3339TimestampMilliseconds(timestamp) !== null
  );
}
function isValidPlanningIdentity(values: CliValues): boolean {
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
function validatePlanningArgs(values: CliValues): void {
  required(
    isValidPlanningAttribution(values) && isValidPlanningIdentity(values),
    'inspect/plan identity or attribution missing',
  );
}
function parse(args: readonly string[]): CliValues {
  const values: Record<string, string> = {};
  required(args.length % 2 === 0, 'repair arguments must be paired');
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const argument = args[i + 1];
    required(
      typeof key === 'string' &&
        key.startsWith('--') &&
        typeof argument === 'string' &&
        argument.length > 0 &&
        !Object.hasOwn(values, key),
      'invalid arguments',
    );
    values[key] = argument;
  }
  const mode = value(values, '--mode');
  required(
    value(values, '--kind') === 'delivered-work-continuation' &&
      reconcileCliContracts['delivered-work-continuation']?.modes.includes(mode) === true &&
      path.isAbsolute(value(values, '--project-root')) &&
      path.resolve(value(values, '--project-root')) === value(values, '--project-root') &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(value(values, '--repair-id')),
    'mode, project root or repair id invalid',
  );
  required(same(Object.keys(values).sort(), expectedRepairOptions(values).sort()), 'missing or unexpected arguments');
  if (mode === 'inspect' || mode === 'plan') validatePlanningArgs(values);
  return values;
}
const maxPlanBytes = 64 * 1024 * 1024;
function safeIdentity(file: string, label: string): { dev: number; ino: number } {
  const info = lstatSync(file);
  required(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, `${label} must be a single-link regular file`);
  return { dev: info.dev, ino: info.ino };
}
function readPlan(access: SafeRepositoryAccess, root: string, repairId: string): unknown {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`;
  const file = path.join(root, relative);
  const before = lstatSync(file);
  required(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= maxPlanBytes,
    'repair plan path or size is unsafe',
  );
  const bytes = access.readBytes(relative, 'delivered-work continuation repair plan');
  const after = lstatSync(file);
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
  const plan: unknown = JSON.parse(bytes.toString('utf8'));
  required(bytes.equals(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)), 'repair plan bytes are not canonical');
  return plan;
}
function writePlan(access: SafeRepositoryAccess, repairId: string, plan: unknown): void {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`;
  const bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  required(bytes.length <= maxPlanBytes, 'repair plan exceeds the bounded artifact size');
  access.ensureDirectory(`.agent/work/${repairId}`, 'delivered-work continuation repair work root');
  access.writeExclusive(relative, bytes.toString('utf8'), 'delivered-work continuation repair plan');
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
type RepairBranch = 'historical_terminal_review' | 'configured_frontier';
function requirePlanBranch(branch: unknown): RepairBranch {
  required(
    branch === 'historical_terminal_review' || branch === 'configured_frontier',
    'repair plan branch is unsupported',
  );
  return branch;
}
function validatePlan(planValue: unknown, workspaceId: string): Record<string, unknown> & { branch: RepairBranch } {
  required(isRecord(planValue), 'repair plan must be an object');
  const plan = planValue;
  required(plan.schema === 'DeliveredWorkContinuationIntegrityRepairPlan/v1', 'repair plan schema differs');
  const digest = plan.digest;
  const { digest: _digest, ...body } = plan;
  required(
    typeof digest === 'string' && digestPattern.test(digest) && canonicalJsonDigest(body) === digest,
    'frozen repair plan digest differs',
  );
  required(
    isRecord(plan.inspection) && plan.inspection.workspace_id === workspaceId,
    'repair plan belongs to another workspace',
  );
  const branch = requirePlanBranch(plan.branch);
  return { ...plan, branch };
}
type DeliveredWorkContinuationRepairResult =
  | { status: 'repairable_current_v1'; repair_id: string; plan_digest: string; branch: RepairBranch }
  | { status: 'planned'; repair_id: string; plan_digest: string; branch: RepairBranch }
  | ReturnType<ReturnType<typeof createCliHostStateStore>['applyDeliveredWorkContinuationRepair']>;

export {
  validateConfiguredFrontierReceiptStructure,
  validateConfiguredFrontierRepairReceipt,
  assertApplicableRepairBranch,
} from '../src/orchestration/delivered-work-continuation-repair.ts';
import { assertApplicableRepairBranch } from '../src/orchestration/delivered-work-continuation-repair.ts';

export async function runDeliveredWorkContinuationRepair(
  args: Parameters<typeof parse>[0],
): Promise<DeliveredWorkContinuationRepairResult> {
  const values = parse(args);
  const root = value(values, '--project-root');
  const access = requireSafeRepositoryAccess(root);
  const config = loadRuntimeConfig(root);
  const repairId = value(values, '--repair-id');
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const relativeDatabasePath = sessionHandoffDatabaseRelativePath(config);
  access.assertDirectory(config.control.work_root, 'configured Host work root');
  required(
    access.fileExists(relativeDatabasePath, 'configured Host database'),
    'configured Host database is absent or unsafe',
  );
  const databasePath = sessionHandoffDatabasePath(root, config);
  const databaseIdentity = safeIdentity(databasePath, 'configured Host database');
  const mode = value(values, '--mode');
  const readonly = mode === 'inspect' || mode === 'plan';
  const database = readonly
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
      const projectIds = value(values, '--projects').split(',').sort();
      const project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
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
function repairBranchFromInspectionPayload(payload: string): RepairBranch {
  const receipt: unknown = JSON.parse(payload);
  required(
    isRecord(receipt) && isRecord(receipt.request) && isRecord(receipt.request.action),
    'repair receipt action is malformed',
  );
  return requirePlanBranch(receipt.request.action.kind);
}
