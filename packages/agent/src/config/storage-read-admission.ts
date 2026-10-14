/** Package primitive for cross-process exclusion of file-backed workspace SQLite openers. */
import { Database } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { requireSafeRepositoryAccess } from './safe-repository-access.js';
import {
  assertWorkspaceDatabaseRelativePath,
  closeNativeWorkspaceDatabase,
  forgetWorkspaceDatabaseClose,
  openUnadmittedWorkspaceDatabase,
  retainFailedWorkspaceDatabaseClose,
  retryPendingWorkspaceDatabaseCloses,
  workspaceDatabaseFileIdentity,
} from './workspace-database-raw.js';

export const STORAGE_ADMISSION_GATE_FILE = 'storage-admission.v1.sqlite';
const gateRelative = '.vida/' + STORAGE_ADMISSION_GATE_FILE;
const gateLabel = 'project storage admission';
const gateSchema = 'VidaStorageAdmission/v1';
const busyTimeoutMs = 250;
const gateSql =
  'CREATE TABLE storage_admission_meta (' +
  'id INTEGER PRIMARY KEY CHECK(id=1),schema TEXT NOT NULL,workspace_id TEXT NOT NULL)';

function assertSupportedArguments(root: string, workspaceId: string, readonly?: unknown, safeIntegers?: unknown): void {
  requireAdmission(
    typeof root === 'string' && root.length > 0 && path.resolve(root) === root,
    'repository root must be canonical',
  );
  requireAdmission(/^[a-f0-9]{64}$/u.test(workspaceId), 'workspace digest is invalid');
  if (readonly !== undefined) requireAdmission(typeof readonly === 'boolean', 'readonly option is invalid');
  if (safeIntegers !== undefined) requireAdmission(typeof safeIntegers === 'boolean', 'safe integer option is invalid');
}

function requireAdmission(value: unknown, message: string): asserts value {
  if (!value) throw new Error('Project storage admission: ' + message);
}

function assertNoGateSidecars(access: ReturnType<typeof requireSafeRepositoryAccess>): void {
  for (const suffix of ['-wal', '-shm', '-journal'])
    requireAdmission(!access.fileExists(gateRelative + suffix, gateLabel), 'gate sidecar is present: ' + suffix);
}

function gateIdentity(
  root: string,
  checkSidecars = true,
): {
  readonly parent: string;
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
} {
  const access = requireSafeRepositoryAccess(root);
  const parent = access.directoryIdentity('.vida', gateLabel);
  const stat = lstatSync(path.join(root, gateRelative), { bigint: true });
  requireAdmission(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n, 'gate must be a private regular file');
  if (checkSidecars) assertNoGateSidecars(access);
  return { parent, dev: stat.dev, ino: stat.ino, size: stat.size };
}

function assertGateIdentity(
  root: string,
  expected: ReturnType<typeof gateIdentity>,
  expectedSize?: bigint,
  checkSidecars = true,
): void {
  const actual = gateIdentity(root, checkSidecars);
  requireAdmission(
    actual.parent === expected.parent &&
      actual.dev === expected.dev &&
      actual.ino === expected.ino &&
      (expectedSize === undefined || actual.size === expectedSize),
    'gate file or parent was replaced',
  );
}

function openGate(root: string, readonly: boolean): Database {
  const database = openUnadmittedWorkspaceDatabase(root, gateRelative, readonly, true);
  try {
    requireAdmission(
      database.query<{ journal_mode: string }, []>('PRAGMA journal_mode').get()?.journal_mode === 'delete',
      'gate must use SQLite DELETE journal mode',
    );
    database.exec('PRAGMA busy_timeout=' + busyTimeoutMs);
    return database;
  } catch (error) {
    try {
      closeNativeWorkspaceDatabase(database);
    } catch (closeError) {
      throw new AggregateError([error, closeError], 'gate validation and close failed');
    }
    throw error;
  }
}

function assertGateRow(database: Database, workspaceId: string): void {
  const row = database
    .query<{ schema: string; workspace_id: string }, []>(
      'SELECT schema,workspace_id FROM storage_admission_meta WHERE id=1',
    )
    .get();
  requireAdmission(row?.schema === gateSchema && row.workspace_id === workspaceId, 'gate identity differs');
  const count = database.query<{ n: number | bigint }, []>('SELECT COUNT(*) AS n FROM storage_admission_meta').get()?.n;
  requireAdmission(count !== undefined && BigInt(count) === 1n, 'gate identity table is not closed');
}

function assertClosedGateSchema(database: Database): void {
  const objects = database
    .query<{ type: string; name: string; table_name: string; sql: string | null }, []>(
      "SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
    .all();
  requireAdmission(
    objects.length === 1 &&
      objects[0]?.type === 'table' &&
      objects[0].name === 'storage_admission_meta' &&
      objects[0].table_name === 'storage_admission_meta' &&
      objects[0].sql === gateSql,
    'storage gate schema is not the package-owned closed schema',
  );
}

function createGateFileIfMissing(access: ReturnType<typeof requireSafeRepositoryAccess>): void {
  if (!access.fileExists(gateRelative, gateLabel)) {
    try {
      access.writeExclusive(gateRelative, '', gateLabel);
    } catch (error) {
      const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
      if (code !== 'EEXIST') throw error;
    }
  }
}

function initializeEmptyGate(
  database: Database,
  workspaceId: string,
  root: string,
  expected: ReturnType<typeof gateIdentity>,
): void {
  const opened = workspaceDatabaseFileIdentity(database);
  requireAdmission(
    expected.size === 0n && opened.dev === expected.dev && opened.ino === expected.ino,
    'only the exact zero-byte gate preimage may be initialized',
  );
  assertGateIdentity(root, expected, 0n, false);
  const pages = database.query<{ page_count: number | bigint }, []>('PRAGMA page_count').get()?.page_count;
  requireAdmission(pages !== undefined && BigInt(pages) === 1n, 'partially initialized gate is not recoverable');
  database.exec(gateSql);
  database.query('INSERT INTO storage_admission_meta VALUES(1,?,?)').run(gateSchema, workspaceId);
}

function initializeGateTransaction(
  database: Database,
  workspaceId: string,
  root: string,
  expected: ReturnType<typeof gateIdentity>,
): void {
  const objects = () =>
    database.query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'").all();
  if (objects().length !== 0) return;
  database.exec('BEGIN EXCLUSIVE');
  try {
    if (objects().length === 0) initializeEmptyGate(database, workspaceId, root, expected);
    assertGateRow(database, workspaceId);
    assertClosedGateSchema(database);
    database.exec('COMMIT');
  } catch (error) {
    const errors = [error];
    if (database.inTransaction) {
      try {
        database.exec('ROLLBACK');
      } catch (rollbackError) {
        errors.push(rollbackError);
      }
    }
    if (errors.length > 1) throw new AggregateError(errors, 'gate initialization rollback failed');
    throw error;
  }
}

/** Initialize only the inert coordination database; SQLite serializes first-create without a PID lock file. */
function ensureGate(root: string, workspaceId: string): void {
  assertSupportedArguments(root, workspaceId);
  const access = requireSafeRepositoryAccess(root);
  access.ensureDirectory('.vida', gateLabel);
  createGateFileIfMissing(access);
  const before = gateIdentity(root);
  const database = openGate(root, false);
  const errors: unknown[] = [];
  try {
    initializeGateTransaction(database, workspaceId, root, before);
    assertGateRow(database, workspaceId);
    assertClosedGateSchema(database);
    assertGateIdentity(root, before);
  } catch (error) {
    errors.push(error);
  }
  try {
    closeNativeWorkspaceDatabase(database);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'gate initialization and cleanup failed');
  assertNoGateSidecars(access);
}

/** Upgrade inspection may accept this verified non-product sidecar and nothing else in `.vida`. */
export function assertOnlyStorageAdmissionGate(root: string, workspaceId: string): void {
  assertSupportedArguments(root, workspaceId);
  const access = requireSafeRepositoryAccess(root);
  if (!access.fileExists('.vida', gateLabel)) return;
  access.assertDirectory('.vida', gateLabel);
  const entries = [...access.listFiles('.vida', gateLabel)].sort();
  if (entries.length === 0) return;
  requireAdmission(
    entries.length === 1 && entries[0] === gateRelative.slice('.vida/'.length),
    'VIDA product data already exists',
  );
  const identity = gateIdentity(root);
  const database = openGate(root, true);
  const errors: unknown[] = [];
  try {
    assertGateRow(database, workspaceId);
    assertClosedGateSchema(database);
    assertGateIdentity(root, identity);
  } catch (error) {
    errors.push(error);
  }
  try {
    closeNativeWorkspaceDatabase(database);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'gate inspection and close failed');
  assertNoGateSidecars(access);
}

export interface StorageReadAdmission {
  readonly schema: 'VidaStorageReadAdmission/v1';
  /** Private lease release used only by the package's exact connection close owner. */
  close(): void;
}
interface AdmissionState {
  readonly root: string;
  readonly workspaceId: string;
  readonly relative: string;
  readonly gateIdentity: ReturnType<typeof gateIdentity>;
  readonly gateDatabase: Database;
  readonly admission: StorageReadAdmission;
  sourceDatabase: Database | null;
  sourceClosed: boolean;
  live: boolean;
  closing: boolean;
  readonly retryGateClose: (database: Database) => void;
}
const admissionStates = new WeakMap<object, AdmissionState>();
const databaseAdmissions = new WeakMap<Database, AdmissionState>();

function releaseAdmission(state: AdmissionState): void {
  if (!state.live) return;
  state.closing = true;
  const errors: unknown[] = [];
  try {
    if (state.gateDatabase.inTransaction) state.gateDatabase.exec('ROLLBACK');
  } catch (error) {
    errors.push(error);
  }
  try {
    state.gateDatabase.close(true);
    forgetWorkspaceDatabaseClose(state.gateDatabase);
    state.live = false;
    admissionStates.delete(state.admission);
  } catch (error) {
    if (state.sourceDatabase === null) retainFailedWorkspaceDatabaseClose(state.gateDatabase, state.retryGateClose);
    else retainFailedWorkspaceDatabaseClose(state.sourceDatabase, closeWorkspaceDatabaseWithAdmission);
    errors.push(error);
  }
  if (state.live) throw new AggregateError(errors, 'storage admission remains in cleanup custody');
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'storage admission release failed');
}

function leaseState(admission: StorageReadAdmission): AdmissionState {
  const state = admissionStates.get(admission);
  requireAdmission(state !== undefined && state.live && !state.closing, 'storage admission is invalid or expired');
  return state;
}

function assertLeaseOwner(admission: StorageReadAdmission, root: string, relative: string, workspaceId: string): void {
  const state = leaseState(admission);
  requireAdmission(
    state.root === root && state.relative === relative && state.workspaceId === workspaceId,
    'storage admission belongs to another root, workspace, or file owner',
  );
  assertGateIdentity(root, state.gateIdentity);
}

/** Hold a real SQLite SHARED lock for the full lifetime of one associated source connection. */
export function acquireStorageReadAdmission(root: string, workspaceId: string, relative: string): StorageReadAdmission {
  assertSupportedArguments(root, workspaceId);
  assertWorkspaceDatabaseRelativePath(relative);
  retryPendingWorkspaceDatabaseCloses();
  ensureGate(root, workspaceId);
  const identity = gateIdentity(root);
  const database = openGate(root, true);
  try {
    database.exec('BEGIN DEFERRED');
    assertGateRow(database, workspaceId); // SELECT takes the SHARED OS lock in DELETE mode
    assertClosedGateSchema(database);
    assertGateIdentity(root, identity);
    let state!: AdmissionState;
    const lease: StorageReadAdmission = Object.freeze({
      schema: 'VidaStorageReadAdmission/v1' as const,
      close(): void {
        const current = admissionStates.get(lease);
        if (!current) return;
        requireAdmission(current.sourceDatabase === null || current.sourceClosed, 'source database is still open');
        releaseAdmission(current);
      },
    });
    state = {
      root,
      workspaceId,
      relative,
      gateIdentity: identity,
      gateDatabase: database,
      admission: lease,
      sourceDatabase: null,
      sourceClosed: false,
      live: true,
      closing: false,
      retryGateClose: () => releaseAdmission(state),
    };
    admissionStates.set(lease, state);
    return lease;
  } catch (error) {
    try {
      closeNativeWorkspaceDatabase(database);
    } catch (closeError) {
      throw new AggregateError([error, closeError], 'admission open and close failed');
    }
    throw error;
  }
}

function bindWorkspaceStorageAdmission(
  database: Database,
  admission: StorageReadAdmission,
  root: string,
  relative: string,
  workspaceId: string,
): void {
  assertLeaseOwner(admission, root, relative, workspaceId);
  const state = leaseState(admission);
  requireAdmission(database instanceof Database, 'workspace database is invalid');
  requireAdmission(
    state.sourceDatabase === null && !databaseAdmissions.has(database),
    'admission already owns a database',
  );
  state.sourceDatabase = database;
  databaseAdmissions.set(database, state);
}

/** Every separately opened file DB closes its exact connection before its hidden gate lease. */
export function closeWorkspaceDatabaseWithAdmission(database: Database): void {
  const state = databaseAdmissions.get(database);
  if (!state) {
    closeNativeWorkspaceDatabase(database);
    return;
  }
  state.closing = true;
  try {
    if (!state.sourceClosed) {
      database.close(true);
      state.sourceClosed = true;
    }
  } catch (error) {
    retainFailedWorkspaceDatabaseClose(database, closeWorkspaceDatabaseWithAdmission);
    throw new AggregateError([error], 'source database close failed; admission remains held for retry');
  }
  try {
    releaseAdmission(state);
    databaseAdmissions.delete(database);
    forgetWorkspaceDatabaseClose(database);
  } catch (error) {
    if (state.live) retainFailedWorkspaceDatabaseClose(database, closeWorkspaceDatabaseWithAdmission);
    else {
      databaseAdmissions.delete(database);
      forgetWorkspaceDatabaseClose(database);
    }
    throw error;
  }
}

/** Acquire before the existing-only source open, with paired cleanup on any open/validation error. */
export function openAdmittedWorkspaceDatabase(
  root: string,
  relative: string,
  workspaceId: string,
  readonly: boolean,
  safeIntegers = false,
): Database {
  assertSupportedArguments(root, workspaceId, readonly, safeIntegers);
  assertWorkspaceDatabaseRelativePath(relative);
  return openDatabaseWithStorageAdmission(root, workspaceId, relative, (capture) =>
    openUnadmittedWorkspaceDatabase(root, relative, readonly, safeIntegers, capture),
  );
}

/** Existing-only open using a lease acquired before a producer created the empty main file. */
export function openExistingWorkspaceDatabaseWithAdmission(
  root: string,
  relative: string,
  admission: StorageReadAdmission,
  readonly: boolean,
  safeIntegers = false,
): Database {
  requireAdmission(typeof readonly === 'boolean' && typeof safeIntegers === 'boolean', 'open options are invalid');
  assertWorkspaceDatabaseRelativePath(relative);
  const state = leaseState(admission);
  assertSupportedArguments(root, state.workspaceId, readonly, safeIntegers);
  return openAndBindWorkspaceDatabase(root, relative, state.workspaceId, admission, (capture) =>
    openUnadmittedWorkspaceDatabase(root, relative, readonly, safeIntegers, capture),
  );
}

/** Host's create-capable opener uses this same ordering before its first database syscall. */
export function openDatabaseWithStorageAdmission<T extends Database>(
  root: string,
  workspaceId: string,
  relative: string,
  open: (capture: (database: T) => void) => T,
): T {
  assertSupportedArguments(root, workspaceId);
  assertWorkspaceDatabaseRelativePath(relative);
  requireAdmission(typeof open === 'function', 'database opener callback is required');
  const admission = acquireStorageReadAdmission(root, workspaceId, relative);
  try {
    return openAndBindWorkspaceDatabase(root, relative, workspaceId, admission, open);
  } catch (error) {
    const state = admissionStates.get(admission);
    if (state?.sourceDatabase === null && !state.closing) {
      try {
        admission.close();
      } catch (closeError) {
        throw new AggregateError([error, closeError], 'workspace admission validation and close failed');
      }
    }
    throw error;
  }
}

function openAndBindWorkspaceDatabase<T extends Database>(
  root: string,
  relative: string,
  workspaceId: string,
  admission: StorageReadAdmission,
  open: (capture: (database: T) => void) => T,
): T {
  assertLeaseOwner(admission, root, relative, workspaceId);
  requireAdmission(leaseState(admission).sourceDatabase === null, 'admission already owns a database');
  let database: T | undefined;
  try {
    const capture = (opened: T) => {
      database = opened;
      bindWorkspaceStorageAdmission(opened, admission, root, relative, workspaceId);
    };
    const returned = open(capture);
    if (!database) capture(returned);
    requireAdmission(database === returned, 'database opener returned a different connection');
    return returned;
  } catch (error) {
    const cleanupErrors: unknown[] = [];
    if (database && !databaseAdmissions.has(database)) {
      const state = leaseState(admission);
      state.sourceDatabase = database;
      databaseAdmissions.set(database, state);
    }
    if (database) {
      try {
        closeWorkspaceDatabaseWithAdmission(database);
      } catch (closeError) {
        cleanupErrors.push(closeError);
      }
    } else {
      try {
        admission.close();
      } catch (closeError) {
        cleanupErrors.push(closeError);
      }
    }
    if (cleanupErrors.length > 0) throw new AggregateError([error, ...cleanupErrors], 'workspace open cleanup failed');
    throw error;
  }
}

export interface ExclusiveStorageSourceOwner {
  captureSource(this: void, database: Database): void;
  closeSource(this: void, database: Database): void;
}

function includesExclusiveCloseError(value: unknown, target: unknown, seen = new Set<unknown>()): boolean {
  if (value === target) return true;
  try {
    if (!(value instanceof AggregateError) || seen.has(value)) return false;
    seen.add(value);
    const errors: unknown = Object.getOwnPropertyDescriptor(value, 'errors')?.value;
    return Array.isArray(errors) && errors.some((error: unknown) => includesExclusiveCloseError(error, target, seen));
  } catch {
    // Opaque thrown values must never replace the original body/cleanup evidence.
    return false;
  }
}

function closeExclusiveStorageGate(database: Database): void {
  const errors: unknown[] = [];
  if (database.inTransaction) {
    try {
      database.exec('ROLLBACK');
    } catch (error) {
      errors.push(error);
    }
  }
  try {
    closeNativeWorkspaceDatabase(database);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'exclusive gate rollback and close failed');
}

/** Retain the exact gate while any captured source close is uncertain. */
function exclusiveStorageSourceOwner(gate: Database, assertActive: () => void) {
  const sources = new Map<Database, { closed: boolean; attempted: boolean; error?: unknown }>();
  let finishing = false;
  let gateReleaseAttempted = false;
  const allClosed = () => [...sources.values()].every((source) => source.closed);
  function releaseGate(): void {
    if (gateReleaseAttempted) return;
    gateReleaseAttempted = true;
    closeExclusiveStorageGate(gate);
  }
  function closeSource(database: Database): void {
    const source = sources.get(database);
    requireAdmission(source !== undefined, 'source close belongs to another exclusive owner');
    if (source.closed) return;
    if (source.attempted) throw source.error;
    source.attempted = true;
    try {
      closeNativeWorkspaceDatabase(database, retrySourceThenGate);
      source.closed = true;
    } catch (error) {
      source.error = error;
      throw error;
    }
  }
  function retrySourceThenGate(database: Database): void {
    const source = sources.get(database);
    requireAdmission(source !== undefined, 'pending source belongs to another exclusive owner');
    source.attempted = false;
    closeSource(database);
    if (finishing && allClosed()) releaseGate();
  }
  return {
    captureSource(this: void, database: Database): void {
      requireAdmission(database instanceof Database, 'exclusive source database is invalid');
      requireAdmission(database !== gate && !sources.has(database), 'exclusive source was already captured');
      sources.set(database, { closed: false, attempted: false });
      try {
        assertActive();
      } catch (error) {
        if (finishing) {
          try {
            closeSource(database);
          } catch (closeError) {
            throw new AggregateError([error, closeError], 'expired source capture and close failed');
          }
        }
        throw error;
      }
    },
    closeSource,
    finish(primaryErrors: readonly unknown[]): unknown[] {
      finishing = true;
      const errors: unknown[] = [];
      for (const [database, source] of sources) {
        if (source.closed) continue;
        if (source.attempted) {
          if (!primaryErrors.some((error) => includesExclusiveCloseError(error, source.error)))
            errors.push(source.error);
          continue;
        }
        try {
          closeSource(database);
        } catch (error) {
          errors.push(error);
        }
      }
      if (allClosed()) {
        try {
          releaseGate();
        } catch (error) {
          errors.push(error);
        }
      }
      return errors;
    },
  };
}

/** Bounded writer gate. The caller must first close every registered local reader/client. */
const withExclusiveStorageAdmissionOwner = async <T, A>(
  root: string,
  workspaceId: string,
  verifyHeldOwner: (sourceOwner: ExclusiveStorageSourceOwner) => A,
  operation: (proof: ExclusiveStorageSourceOwner & { readonly owner: A; assertActive(this: void): void }) => Promise<T>,
): Promise<T> => {
  assertSupportedArguments(root, workspaceId);
  requireAdmission(
    typeof verifyHeldOwner === 'function' && typeof operation === 'function',
    'gate callbacks are required',
  );
  retryPendingWorkspaceDatabaseCloses();
  ensureGate(root, workspaceId);
  const identity = gateIdentity(root);
  const database = openGate(root, false);
  const errors: unknown[] = [];
  let result: T | undefined;
  let live = false;
  const assertActive = () => {
    requireAdmission(live && database.inTransaction, 'exclusive admission capability expired');
    assertGateIdentity(root, identity);
  };
  const sourceOwner = exclusiveStorageSourceOwner(database, assertActive);
  try {
    // BUSY / LOCKED here is a safe drain failure. No source inspection or image creation starts.
    database.exec('BEGIN EXCLUSIVE');
    live = true;
    assertGateRow(database, workspaceId);
    assertClosedGateSchema(database);
    assertGateIdentity(root, identity);
    const owner = verifyHeldOwner(
      Object.freeze({ captureSource: sourceOwner.captureSource, closeSource: sourceOwner.closeSource }),
    );
    const proof = Object.freeze({
      owner,
      assertActive,
      captureSource: sourceOwner.captureSource,
      closeSource: sourceOwner.closeSource,
    });
    proof.assertActive();
    result = await operation(proof);
  } catch (error) {
    errors.push(error);
  }
  live = false;
  errors.push(...sourceOwner.finish(errors));
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'exclusive storage operation and cleanup failed');
  return result as T;
};

/** Existing Host maintenance retains its Host-fence contract and capability shape. */
export function withExclusiveStorageAdmission<T>(
  root: string,
  workspaceId: string,
  verifyHeldHostFence: (this: void, sourceOwner: ExclusiveStorageSourceOwner) => unknown,
  operation: (
    proof: ExclusiveStorageSourceOwner & { readonly fence: unknown; assertActive(this: void): void },
  ) => Promise<T>,
): Promise<T> {
  return withExclusiveStorageAdmissionOwner(root, workspaceId, verifyHeldHostFence, ({ owner, ...proof }) =>
    operation(Object.freeze({ fence: owner, ...proof })),
  );
}

/**
 * Service recovery has its own owner verifier and proof field. Its result grants only
 * service-operation reconciliation and never satisfies Host maintenance admission.
 */
export function withExclusiveServiceOperationAdmission<T, A>(
  root: string,
  workspaceId: string,
  verifyHeldServiceOperationOwner: (this: void, sourceOwner: ExclusiveStorageSourceOwner) => A,
  operation: (proof: ExclusiveStorageSourceOwner & { readonly owner: A; assertActive(this: void): void }) => Promise<T>,
): Promise<T> {
  return withExclusiveStorageAdmissionOwner(root, workspaceId, verifyHeldServiceOperationOwner, operation);
}

/** Validate that a caller still owns the exact source-DB connection's paired gate lease. */
export function assertWorkspaceDatabaseAdmission(
  database: Database,
  root: string,
  relative: string,
  workspaceId: string,
): void {
  const state = databaseAdmissions.get(database);
  requireAdmission(
    state !== undefined && state.live && !state.closing && state.sourceDatabase === database && !state.sourceClosed,
    'workspace database lacks a live paired admission lease',
  );
  assertLeaseOwner(state.admission, root, relative, workspaceId);
}
