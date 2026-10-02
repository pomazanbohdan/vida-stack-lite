#!/usr/bin/env bun
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore, openHostStateDatabase, inspectHostWorkspaceDatabase } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';

function requireRepair(value, message) {
  if (!value) throw new Error(`vida work-state repair: ${message}`);
}

/** Current-v1 work normalization and canonical readonly workspace projection. */
export function runWorkStateRepair(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireRepair(
      ['--kind', '--mode', '--project-root', '--repair-id', '--actor', '--authority'].includes(args[index]) &&
        args[index + 1] &&
        !values[args[index]],
      'invalid or duplicate arguments',
    );
    values[args[index]] = args[index + 1];
  }
  const mode = values['--mode'];
  requireRepair(
    values['--kind'] === 'work-state' &&
      ['inspect', 'plan', 'apply', 'resume', 'restore'].includes(mode) &&
      path.isAbsolute(values['--project-root'] ?? ''),
    'kind, mode or absolute project root missing',
  );
  requireRepair(
    mode === 'inspect' || /^[a-z0-9][a-z0-9._-]{0,79}$/.test(values['--repair-id'] ?? ''),
    'repair operation identity missing',
  );
  requireRepair(
    mode === 'plan' ? values['--actor']?.trim() : !values['--actor'],
    'only plan accepts and requires attribution',
  );
  const root = values['--project-root'];
  const config = loadRuntimeConfig(root);
  const access = requireSafeRepositoryAccess(root);
  const databasePath = sessionHandoffDatabasePath(root, config);
  const relative = path.relative(root, databasePath).replaceAll(path.sep, '/');
  requireRepair(
    access.fileExists(relative, 'existing canonical HostState database'),
    'canonical HostState database is unavailable; inspection never creates one',
  );
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  requireRepair(!values['--authority'] || values['--authority'] === 'correction-generation', 'unsupported repair authority');
  if (mode === 'inspect' && !values['--authority']) return inspectHostWorkspaceDatabase(databasePath, workspaceId);
  const database = openHostStateDatabase(databasePath);
  try {
    const store = new HostStateStore(database, workspaceId);
    requireRepair(!values['--authority'] || values['--authority'] === 'correction-generation', 'unsupported repair authority');
    const operation = values['--authority'] === 'correction-generation'
      ? store.repairCorrectionGeneration.bind(store)
      : store.repairRequestTransitionFields.bind(store);
    return operation({
      mode,
      operationId: values['--repair-id'] ?? 'inspect',
      ...(mode === 'plan' ? { actor: values['--actor'] } : {}),
    });
  } finally {
    database.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    console.log(JSON.stringify(runWorkStateRepair(process.argv.slice(2))));
  } catch (error) {
    console.error(JSON.stringify({ status: 'blocked', message: error.message }));
    process.exitCode = 1;
  }
}
