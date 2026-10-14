#!/usr/bin/env bun
import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  inspectCliHostWorkspaceDatabase,
  openCliHostStateDatabase,
} from './workspace-database-cli.ts';
import { reconcileCliContracts } from './reconcile-cli-contracts.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import type { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath, sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import { withWorkspaceDatabaseClose } from '../src/config/workspace-database-raw.js';

type WorkStateRepairInput = Parameters<HostStateStore['repairCorrectionGeneration']>[0];
function requireRepair(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`vida work-state repair: ${message}`);
}

function collectRepairArguments(args: readonly string[]): Record<string, string> {
  const contract = reconcileCliContracts['work-state'];
  requireRepair(contract?.optionsByMode, 'work-state command declaration missing');
  const options = new Set(Object.values(contract.optionsByMode).flat());
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    requireRepair(flag && options.has(flag) && value && !values[flag], 'invalid or duplicate arguments');
    values[flag] = value;
  }
  return values;
}

function requireRepairMode(mode: string | undefined): asserts mode is WorkStateRepairInput['mode'] {
  requireRepair(
    mode === 'inspect' || mode === 'plan' || mode === 'apply' || mode === 'resume' || mode === 'restore',
    'kind, mode or absolute project root missing',
  );
}

function repairOperationInput(
  values: Record<string, string>,
  mode: WorkStateRepairInput['mode'],
): WorkStateRepairInput {
  const suppliedOperationId = values['--repair-id'];
  requireRepair(
    mode === 'inspect' || /^[a-z0-9][a-z0-9._-]{0,79}$/.test(suppliedOperationId ?? ''),
    'repair operation identity missing',
  );
  const operationId = suppliedOperationId ?? 'inspect';
  const actor = values['--actor'];
  if (mode === 'plan') {
    requireRepair(actor && actor.trim(), 'only plan accepts and requires attribution');
    return { mode, operationId, actor };
  }
  requireRepair(!actor, 'only plan accepts and requires attribution');
  return { mode, operationId };
}

/** Current-v1 work normalization and canonical readonly workspace projection. */
export function runWorkStateRepair(args: readonly string[]) {
  const values = collectRepairArguments(args);
  const mode = values['--mode'];
  requireRepairMode(mode);
  const root = values['--project-root'];
  requireRepair(
    values['--kind'] === 'work-state' && root && path.isAbsolute(root),
    'kind, mode or absolute project root missing',
  );
  const input = repairOperationInput(values, mode);
  const config = loadRuntimeConfig(root);
  const access = requireSafeRepositoryAccess(root);
  const databasePath = sessionHandoffDatabasePath(root, config);
  const relative = sessionHandoffDatabaseRelativePath(config);
  requireRepair(
    access.fileExists(relative, 'existing canonical HostState database'),
    'canonical HostState database is unavailable; inspection never creates one',
  );
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  requireRepair(
    !values['--authority'] || values['--authority'] === 'correction-generation',
    'unsupported repair authority',
  );
  if (mode === 'inspect' && !values['--authority'])
    return inspectCliHostWorkspaceDatabase(root, databasePath, workspaceId);
  const database = openCliHostStateDatabase(root, databasePath, workspaceId);
  return withWorkspaceDatabaseClose(
    database,
    () => {
      const store = createCliHostStateStore(database, workspaceId);
      const operation =
        values['--authority'] === 'correction-generation'
          ? store.repairCorrectionGeneration.bind(store)
          : store.repairRequestTransitionFields.bind(store);
      return operation(input);
    },
    closeWorkspaceDatabaseWithAdmission,
    'Work-state repair operation and admitted database close failed',
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    console.log(JSON.stringify(runWorkStateRepair(process.argv.slice(2))));
  } catch (error) {
    console.error(
      JSON.stringify({ status: 'blocked', message: error instanceof Error ? error.message : String(error) }),
    );
    process.exitCode = 1;
  }
}
