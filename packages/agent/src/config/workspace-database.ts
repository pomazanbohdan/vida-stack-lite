import { Database } from 'bun:sqlite';
import { openAdmittedWorkspaceDatabase } from './storage-read-admission.js';

import {
  assertWorkspaceDatabaseRelativePath,
  queryWorkspaceRowUnknown,
  queryWorkspaceRowsUnknown,
} from './workspace-database-raw.js';

export { assertWorkspaceDatabaseRelativePath, queryWorkspaceRowUnknown, queryWorkspaceRowsUnknown };

/** Every package caller supplies the exact workspace before opening an existing file. */
export function openExistingWorkspaceDatabase(
  repositoryRoot: string,
  relative: string,
  workspaceId: string,
  readonly: boolean,
  safeIntegers = false,
): Database {
  assertWorkspaceDatabaseRelativePath(relative);
  if (typeof readonly !== 'boolean' || typeof safeIntegers !== 'boolean')
    throw new Error('Workspace database: explicit boolean open options required');
  return openAdmittedWorkspaceDatabase(repositoryRoot, relative, workspaceId, readonly, safeIntegers);
}
