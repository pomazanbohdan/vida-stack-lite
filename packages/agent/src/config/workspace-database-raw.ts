import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { requireSafeRepositoryAccess } from './safe-repository-access.js';

export interface WorkspaceDatabaseFileIdentity {
  readonly dev: number;
  readonly ino: number;
}
const openedFileIdentities = new WeakMap<Database, WorkspaceDatabaseFileIdentity>();

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

/** Private raw opener. Only an admission owner or the exclusive migration coordinator may call it. */
export function openUnadmittedWorkspaceDatabase(
  repositoryRoot: string,
  relative: string,
  readonly: boolean,
  safeIntegers = false,
): Database {
  assertWorkspaceDatabaseRelativePath(relative);
  requireDatabase(typeof readonly === 'boolean', 'explicit access mode required');
  requireDatabase(typeof safeIntegers === 'boolean', 'explicit integer mode required');
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const parent = path.posix.dirname(relative);
  const parentIdentity = access.directoryIdentity(parent, 'existing database parent');
  requireDatabase(access.fileExists(relative, 'existing workspace database'), 'existing file required');
  const file = path.join(access.repository_root, relative);
  const before = regularDatabase(file);
  checkSidecars(file);
  const database = new Database(file, { create: false, readonly, readwrite: !readonly, strict: true, safeIntegers });
  try {
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
    try {
      database.close(true);
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], 'Workspace database open and close failed');
    }
    throw error;
  }
}
