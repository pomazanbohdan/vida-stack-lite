import { Database } from 'bun:sqlite';
import { closeSync, constants, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { planReadOnlyDispatchRepair, applyReadOnlyDispatchRepair } from './read-only-dispatch-repair.mjs';

const requireCommand = (condition, message) => {
  if (!condition) throw new Error(`vida repair artifacts: ${message}`);
};
const planningKeys = ['--kind', '--mode', '--project-root', '--repair-id', '--actor', '--timestamp',
  '--projects', '--work-id', '--attempt', '--action-id', '--issue-id', '--native-handle'];
const applyingKeys = ['--kind', '--mode', '--project-root', '--repair-id'];
const planFile = (root, repairId) => `.agent/work/${repairId}/read-only-dispatch-plan.v1.json`;

function argsObject(args) {
  requireCommand(args.length % 2 === 0, 'read-only dispatch arguments must be paired');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireCommand(typeof args[index] === 'string' && args[index].startsWith('--') &&
      typeof args[index + 1] === 'string' && args[index + 1].length > 0 &&
      !Object.hasOwn(values, args[index]), 'read-only dispatch arguments invalid');
    values[args[index]] = args[index + 1];
  }
  requireCommand(values['--kind'] === 'readonly-dispatch' &&
    ['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']) &&
    path.isAbsolute(values['--project-root'] ?? '') &&
    path.resolve(values['--project-root']) === values['--project-root'] &&
    /^[a-z0-9][a-z0-9._-]{0,79}$/.test(values['--repair-id'] ?? ''),
  'read-only dispatch kind, mode, root or repair identity invalid');
  const keys = Object.keys(values).sort();
  const expected = (['inspect', 'plan'].includes(values['--mode']) ? planningKeys : applyingKeys).sort();
  requireCommand(JSON.stringify(keys) === JSON.stringify(expected),
    'read-only dispatch has missing or unexpected arguments');
  return values;
}

function readPlan(root, repairId) {
  const file = path.join(root, planFile(root, repairId));
  const stat = lstatSync(file);
  requireCommand(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1,
    'read-only dispatch plan path is unsafe');
  const raw = readFileSync(file);
  const plan = JSON.parse(raw.toString('utf8'));
  requireCommand(plan.schema === 'VidaReadOnlyDispatchRepairPlan/v1' &&
    raw.equals(Buffer.from(`${JSON.stringify(plan, null, 2)}\n`)),
  'read-only dispatch plan is not exact canonical JSON');
  return plan;
}

function writePlan(root, repairId, plan) {
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory(`.agent/work/${repairId}`, 'read-only dispatch repair evidence');
  const file = path.join(root, planFile(root, repairId));
  const bytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
}

/** Sole public reconcile-artifacts CLI branch; this prepares provenance, not native dispatch. */
export function runReadOnlyDispatchRepair(args) {
  const values = argsObject(args);
  const root = values['--project-root'];
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const access = requireSafeRepositoryAccess(root);
  access.assertDirectory(config.control.work_root, 'read-only dispatch state root');
  const relativeDatabasePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
  requireCommand(access.fileExists(relativeDatabasePath, 'read-only dispatch database'),
    'read-only dispatch database is absent or unsafe');
  const databasePath = sessionHandoffDatabasePath(root, config);
  const databaseStats = lstatSync(databasePath);
  requireCommand(databaseStats.isFile() && !databaseStats.isSymbolicLink() &&
    databaseStats.nlink === 1, 'read-only dispatch database must be a single-link regular file');
  const database = new Database(databasePath, { readonly: values['--mode'] === 'inspect' ||
    values['--mode'] === 'plan', strict: true });
  try {
    if (['inspect', 'plan'].includes(values['--mode'])) {
      const projectIds = values['--projects'].split(',');
      const plan = planReadOnlyDispatchRepair({ database, repositoryRoot: root, config,
        workspaceId, projectIds, workId: values['--work-id'], attempt: Number(values['--attempt']),
        actionId: values['--action-id'], issueId: values['--issue-id'],
        nativeHandle: values['--native-handle'], repairId: values['--repair-id'],
        actor: values['--actor'], timestamp: values['--timestamp'] });
      if (values['--mode'] === 'plan') writePlan(root, values['--repair-id'], plan);
      return { status: values['--mode'] === 'plan' ? 'planned' : 'repairable_current_v1',
        repair_id: plan.repair_id, plan_digest: plan.digest,
        old_issue_outcome: plan.prior_outcome, new_dispatch_generation: plan.replacement_generation };
    }
    const plan = readPlan(root, values['--repair-id']);
    const project = loadProjectSetContext(root, config, config.repository.repository_id,
      plan.project_ids);
    const identity = { repository_id: project.repository_id, project_ids: project.project_ids,
      integrations_digest: project.integrations_digest, work_id: plan.work_id };
    const host = new HostStateStore(database, workspaceId, undefined, undefined, undefined,
      undefined, root).readHostStateSnapshot(identity);
    requireCommand(host.work?.lease === null && host.work.execution.status === 'suspended',
      'rightful owner must be cooperatively paused before dispatch repair');
    const saved = applyReadOnlyDispatchRepair({ database, plan,
      current: { repositoryRoot: root, config } });
    return { status: 'prepared', repair_id: saved.repair_id, plan_digest: saved.digest,
      old_issue_outcome: saved.prior_outcome, new_dispatch_generation: saved.replacement_generation };
  } finally { database.close(); }
}
