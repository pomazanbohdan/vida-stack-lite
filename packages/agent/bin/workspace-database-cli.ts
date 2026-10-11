import path from 'node:path';
import type { Database } from 'bun:sqlite';
import { openExistingWorkspaceDatabase } from '../src/config/workspace-database.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import {
  inspectHostWorkspaceDatabase,
  openHostStateDatabase,
  withHostStateExclusiveTransaction,
  HostStateStore,
} from '../src/host-state.ts';
import { assertWorkspaceDatabaseRelativePath } from '../src/config/workspace-database-raw.ts';

type HostStateContext =
  ConstructorParameters<typeof HostStateStore> extends [Database, string, ...infer Context] ? Context : never;
const connectionReadOnlyModes = new WeakMap<Database, boolean>();

function assertCanonicalAbsolutePath(value: string, label: string): void {
  if (typeof value !== 'string') throw new Error(`CLI ${label} must be a string`);
  if (!path.isAbsolute(value)) throw new Error(`CLI ${label} must be absolute`);
  if (path.resolve(value) !== value) throw new Error(`CLI ${label} must be canonical`);
}

function databaseRelativePath(repositoryRoot: string, absoluteFile: string): string {
  assertCanonicalAbsolutePath(repositoryRoot, 'repository root');
  assertCanonicalAbsolutePath(absoluteFile, 'workspace database file');
  const relative = path.relative(repositoryRoot, absoluteFile);
  if (path.isAbsolute(relative))
    throw new Error('CLI workspace database file must share the repository root filesystem');
  const posixRelative = relative.split(path.sep).join('/');
  assertWorkspaceDatabaseRelativePath(posixRelative);
  return posixRelative;
}

export function openCliWorkspaceDatabase(
  repositoryRoot: string,
  absoluteFile: string,
  workspaceId: string,
  readonly: boolean,
  safeIntegers = false,
): Database {
  const relative = databaseRelativePath(repositoryRoot, absoluteFile);
  const database = openExistingWorkspaceDatabase(repositoryRoot, relative, workspaceId, readonly, safeIntegers);
  connectionReadOnlyModes.set(database, readonly);
  return database;
}

export function openCliHostStateDatabase(repositoryRoot: string, absoluteFile: string, workspaceId: string): Database {
  const relative = databaseRelativePath(repositoryRoot, absoluteFile);
  const database = openHostStateDatabase(repositoryRoot, relative, workspaceId);
  connectionReadOnlyModes.set(database, false);
  return database;
}

/** Keep schema initialization paired with the actual CLI connection mode.
 * Unknown SDK connections retain the caller's explicit constructor context.
 */
export function createCliHostStateStore(
  database: Database,
  workspaceId: string,
  ...context: HostStateContext
): HostStateStore {
  context[8] = connectionReadOnlyModes.get(database) === true || context[8] === true;
  return new HostStateStore(database, workspaceId, ...context);
}

export function inspectCliHostWorkspaceDatabase(repositoryRoot: string, absoluteFile: string, workspaceId: string) {
  const relative = databaseRelativePath(repositoryRoot, absoluteFile);
  return inspectHostWorkspaceDatabase(repositoryRoot, relative, workspaceId);
}

export function withCliHostStateExclusiveTransaction<T>(
  repositoryRoot: string,
  absoluteFile: string,
  workspaceId: string,
  callback: () => T,
): T {
  const relative = databaseRelativePath(repositoryRoot, absoluteFile);
  return withHostStateExclusiveTransaction({ repositoryRoot, databaseRelativePath: relative, workspaceId }, callback);
}

export { closeWorkspaceDatabaseWithAdmission };
