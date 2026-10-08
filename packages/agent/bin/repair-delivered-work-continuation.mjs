#!/usr/bin/env bun
import { lstatSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import path from 'node:path';
import { canonicalJsonDigest, rfc3339TimestampMilliseconds } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const required = (condition, message) => {
  if (!condition) throw new Error(`vida repair delivered-work-continuation: ${message}`);
};
const digestPattern = /^[a-f0-9]{64}$/;
const same = (a, b) => canonicalJsonDigest(a) === canonicalJsonDigest(b);

export {
  validateConfiguredFrontierReceiptStructure,
  validateConfiguredFrontierRepairReceipt,
  assertApplicableRepairBranch,
} from '../src/orchestration/delivered-work-continuation-repair.ts';
import { assertApplicableRepairBranch } from '../src/orchestration/delivered-work-continuation-repair.ts';

function parse(args) {
  const values = {};
  required(args.length % 2 === 0, 'repair arguments must be paired');
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    required(typeof key === 'string' && key.startsWith('--') && typeof value === 'string' && value.length > 0 && !Object.hasOwn(values, key), 'invalid arguments');
    values[key] = value;
  }
  required(
    values['--kind'] === 'delivered-work-continuation' &&
      ['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']) &&
      path.isAbsolute(values['--project-root'] ?? '') &&
      path.resolve(values['--project-root']) === values['--project-root'] &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(values['--repair-id'] ?? ''),
    'mode, project root or repair id invalid',
  );
  const expected = (['inspect', 'plan'].includes(values['--mode'])
    ? ['--kind', '--mode', '--project-root', '--repair-id', '--actor', '--timestamp', '--projects', '--work-id', '--attempt', '--action-id']
    : ['--kind', '--mode', '--project-root', '--repair-id']);
  required(same(Object.keys(values).sort(), expected.sort()), 'missing or unexpected arguments');
  if (['inspect', 'plan'].includes(values['--mode'])) {
    const projectIds = values['--projects'].split(',');
    required(
      values['--actor'].trim() && values['--timestamp'].trim() && values['--work-id'] &&
        values['--actor'] === values['--actor'].trim() && values['--actor'].length <= 256 && !/\p{Cc}/u.test(values['--actor']) &&
        rfc3339TimestampMilliseconds(values['--timestamp']) !== null &&
        /^[1-9][0-9]*$/.test(values['--attempt']) && digestPattern.test(values['--action-id']) &&
        projectIds.length > 0 && projectIds.every((id) => /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) &&
        new Set(projectIds).size === projectIds.length,
      'inspect/plan identity or attribution missing',
    );
  }
  return values;
}
const maxPlanBytes = 64 * 1024 * 1024;
function safeIdentity(file, label) {
  const info = lstatSync(file);
  required(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, `${label} must be a single-link regular file`);
  return { dev: info.dev, ino: info.ino };
}
function readPlan(access, root, repairId) {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`, file = path.join(root, relative),
    before = lstatSync(file);
  required(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size <= maxPlanBytes, 'repair plan path or size is unsafe');
  const bytes = access.readBytes(relative, 'delivered-work continuation repair plan'), after = lstatSync(file);
  required(
    after.isFile() && !after.isSymbolicLink() && after.nlink === 1 &&
      before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs &&
      bytes.length <= maxPlanBytes,
    'repair plan identity changed or bounded read exceeded',
  );
  const plan = JSON.parse(bytes.toString('utf8'));
  required(bytes.equals(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)), 'repair plan bytes are not canonical');
  return plan;
}
function writePlan(access, repairId, plan) {
  const relative = `.agent/work/${repairId}/repair-plan.v1.json`, bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  required(bytes.length <= maxPlanBytes, 'repair plan exceeds the bounded artifact size');
  access.ensureDirectory(`.agent/work/${repairId}`, 'delivered-work continuation repair work root');
  access.writeExclusive(relative, bytes.toString('utf8'), 'delivered-work continuation repair plan');
}
function validatePlan(value, workspaceId) {
  required(value?.schema === 'DeliveredWorkContinuationIntegrityRepairPlan/v1', 'repair plan schema differs');
  const { digest, ...body } = value;
  required(digestPattern.test(digest) && canonicalJsonDigest(body) === digest, 'frozen repair plan digest differs');
  required(value.inspection.workspace_id === workspaceId, 'repair plan belongs to another workspace');
  return value;
}

export async function runDeliveredWorkContinuationRepair(args) {
  const values = parse(args), root = values['--project-root'], access = requireSafeRepositoryAccess(root),
    config = loadRuntimeConfig(root), repairId = values['--repair-id'],
    workspaceId = deriveWorkspaceId(config.repository.repository_id, root),
    relativeDatabasePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
  access.assertDirectory(config.control.work_root, 'configured Host work root');
  required(access.fileExists(relativeDatabasePath, 'configured Host database'), 'configured Host database is absent or unsafe');
  const databasePath = sessionHandoffDatabasePath(root, config), databaseIdentity = safeIdentity(databasePath, 'configured Host database'),
    readonly = ['inspect', 'plan'].includes(values['--mode']),
    database = readonly
      ? new Database(databasePath, { readonly: true, create: false, strict: true })
      : openHostStateDatabase(databasePath);
  try {
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root, undefined, undefined, undefined, readonly);
    if (readonly) {
      const projectIds = values['--projects'].split(',').sort(),
        project = loadProjectSetContext(root, config, config.repository.repository_id, projectIds);
      const inspection = store.inspectDeliveredWorkContinuationRepair(
        { repository_id: config.repository.repository_id, project_ids: projectIds, integrations_digest: project.integrations_digest, work_id: values['--work-id'] },
        Number(values['--attempt']),
        values['--action-id'],
      );
      const planBody = {
        schema: 'DeliveredWorkContinuationIntegrityRepairPlan/v1',
        branch: JSON.parse(inspection.row.payload).request.action.kind,
        repair_id: repairId,
        actor: values['--actor'],
        timestamp: values['--timestamp'],
        inspection,
      };
      if (values['--mode'] === 'inspect')
        return { status: 'repairable_current_v1', repair_id: repairId, plan_digest: canonicalJsonDigest(planBody), branch: planBody.branch };
      const plan = { ...planBody, digest: canonicalJsonDigest(planBody) };
      writePlan(access, repairId, plan);
      return { status: 'planned', repair_id: repairId, plan_digest: plan.digest, branch: plan.branch };
    }
    const plan = validatePlan(readPlan(access, root, repairId), workspaceId);
    assertApplicableRepairBranch(plan.branch);
    if (values['--mode'] === 'apply') store.reserveDeliveredWorkContinuationRepair(plan);
    return store.applyDeliveredWorkContinuationRepair(plan);
  } finally {
    database.close(true);
    const afterIdentity = safeIdentity(databasePath, 'configured Host database');
    required(databaseIdentity.dev === afterIdentity.dev && databaseIdentity.ino === afterIdentity.ino, 'configured Host database identity changed');
  }
}
