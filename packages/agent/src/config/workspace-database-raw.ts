import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { requireSafeRepositoryAccess } from './safe-repository-access.js';

export interface WorkspaceDatabaseFileIdentity {
  readonly dev: number;
  readonly ino: number;
}
const openedFileIdentities = new WeakMap<Database, WorkspaceDatabaseFileIdentity>();
const pendingDatabaseCloses = new Map<Database, (database: Database) => void>();

/** Keep only exact package-owned handles and their existing native or paired cleanup owner. */
export function retainFailedWorkspaceDatabaseClose(database: Database, retry: (database: Database) => void): void {
  const previous = pendingDatabaseCloses.get(database);
  requireDatabase(previous === undefined || previous === retry, 'pending close belongs to another cleanup owner');
  pendingDatabaseCloses.set(database, retry);
}

export function forgetWorkspaceDatabaseClose(database: Database): void {
  pendingDatabaseCloses.delete(database);
}

/** Cleanup grants no open, migration or execution rights; stop before a new owner if any retry fails. */
export function retryPendingWorkspaceDatabaseCloses(): void {
  const errors: unknown[] = [];
  for (const [database, retry] of [...pendingDatabaseCloses]) {
    if (pendingDatabaseCloses.get(database) !== retry) continue;
    try {
      retry(database);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length || pendingDatabaseCloses.size)
    throw new AggregateError(errors, 'pending workspace database closes remain unresolved');
}

/** Native-only handles have no paired lease. Never use this to bypass an admitted source's close owner. */
export function closeNativeWorkspaceDatabase(database: Database): void {
  try {
    database.close(true);
    forgetWorkspaceDatabaseClose(database);
  } catch (error) {
    retainFailedWorkspaceDatabaseClose(database, closeNativeWorkspaceDatabase);
    throw error;
  }
}

/** Verified physical identity from this existing-only opener; it grants no Host or workflow rights. */
export function workspaceDatabaseFileIdentity(database: Database): WorkspaceDatabaseFileIdentity {
  const identity = openedFileIdentities.get(database);
  requireDatabase(identity !== undefined, 'connection has no verified existing-file identity');
  return identity;
}

function requireDatabase(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('Workspace database: ' + message);
}

/**
 * Keep Bun's row result unknown until the caller validates SQLite values. The
 * Bindings use Bun's concrete rest-parameter array contract.
 */
export function queryWorkspaceRowsUnknown(
  database: Database,
  sql: string,
  params: readonly SQLQueryBindings[],
): unknown[] {
  return database.query<unknown, SQLQueryBindings[]>(sql).all(...params);
}

export function queryWorkspaceRowUnknown(
  database: Database,
  sql: string,
  params: readonly SQLQueryBindings[],
): unknown {
  return database.query<unknown, SQLQueryBindings[]>(sql).get(...params);
}

function regularDatabase(file: string): WorkspaceDatabaseFileIdentity {
  const info = lstatSync(file);
  requireDatabase(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, 'unsafe existing file');
  return { dev: info.dev, ino: info.ino };
}

function checkSidecars(file: string): void {
  for (const suffix of ['-wal', '-shm', '-journal']) {
    const info = lstatSync(file + suffix, { throwIfNoEntry: false });
    requireDatabase(!info || (info.isFile() && !info.isSymbolicLink() && info.nlink === 1), 'unsafe sidecar');
  }
}

export function assertWorkspaceDatabaseRelativePath(relative: unknown): asserts relative is string {
  requireDatabase(
    typeof relative === 'string' &&
      relative.length > 0 &&
      !relative.includes('\\') &&
      !path.posix.isAbsolute(relative) &&
      relative.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..'),
    'canonical relative path required',
  );
}

/**
 * Private raw opener. Only admission or exclusive migration owns this entry.
 * A capture callback must record the handle synchronously before it can throw;
 * invoking it transfers all cleanup custody, including callback failure.
 */
export function openUnadmittedWorkspaceDatabase(
  repositoryRoot: string,
  relative: string,
  readonly: boolean,
  safeIntegers = false,
  capture?: (database: Database) => void,
): Database {
  assertWorkspaceDatabaseRelativePath(relative);
  requireDatabase(typeof readonly === 'boolean', 'explicit access mode required');
  requireDatabase(typeof safeIntegers === 'boolean', 'explicit integer mode required');
  requireDatabase(capture === undefined || typeof capture === 'function', 'database capture callback required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const parent = path.posix.dirname(relative);
  const parentIdentity = access.directoryIdentity(parent, 'existing database parent');
  requireDatabase(access.fileExists(relative, 'existing workspace database'), 'existing file required');
  const file = path.join(access.repository_root, relative);
  const before = regularDatabase(file);
  checkSidecars(file);
  const database = new Database(file, { create: false, readonly, readwrite: !readonly, strict: true, safeIntegers });
  let transferred = false;
  try {
    if (capture) {
      transferred = true;
      capture(database);
    }
    const after = regularDatabase(file);
    requireDatabase(
      before.dev === after.dev &&
        before.ino === after.ino &&
        access.directoryIdentity(parent, 'opened database parent') === parentIdentity,
      'file or parent changed during open',
    );
    checkSidecars(file);
    const main = database
      .query<{ name: string; file: string }, []>('PRAGMA database_list')
      .all()
      .find((entry) => entry.name === 'main');
    requireDatabase(main?.file === file, 'opened database identity differs');
    database.exec('PRAGMA busy_timeout=1000');
    openedFileIdentities.set(database, Object.freeze(before));
    return database;
  } catch (error) {
    // Capture grants cleanup custody only; it does not bypass any identity or admission guard.
    if (transferred) throw error;
    try {
      closeNativeWorkspaceDatabase(database);
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], 'Workspace database open and close failed');
    }
    throw error;
  }
}
