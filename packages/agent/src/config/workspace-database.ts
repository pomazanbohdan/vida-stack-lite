import { Database } from 'bun:sqlite';
import { openAdmittedWorkspaceDatabase } from './storage-read-admission.js';
import { requireSafeRepositoryAccess } from './safe-repository-access.js';
import { assertProjectUpgradeInactive } from './runtime-config.js';
import {
  assertWorkspaceDatabaseRelativePath,
  queryWorkspaceRowUnknown,
  queryWorkspaceRowsUnknown,
  workspaceDatabaseFileIdentity,
} from './workspace-database-raw.js';

export {
  assertWorkspaceDatabaseRelativePath,
  queryWorkspaceRowUnknown,
  queryWorkspaceRowsUnknown,
  workspaceDatabaseFileIdentity,
};

/** Every package caller supplies the exact workspace before opening an existing file. */
export function openExistingWorkspaceDatabase(
  repositoryRoot: string,
  relative: string,
  workspaceId: string,
  readonly: boolean,
  safeIntegers = false,
): Database {
  assertProjectUpgradeInactive(requireSafeRepositoryAccess(repositoryRoot));
  assertWorkspaceDatabaseRelativePath(relative);
  if (typeof readonly !== 'boolean' || typeof safeIntegers !== 'boolean')
    throw new Error('Workspace database: explicit boolean open options required');
  return openAdmittedWorkspaceDatabase(repositoryRoot, relative, workspaceId, readonly, safeIntegers);
}
