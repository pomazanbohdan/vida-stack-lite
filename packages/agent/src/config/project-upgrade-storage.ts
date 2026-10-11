import { Database, constants } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { LibSQLStore } from '@mastra/libsql';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import { initializeHostDatabaseSchema, initializeTaskSourceBindingWorkProjectionSchema } from '../host-state.js';
import { createInMemoryBunSqliteClient } from '../orchestration/bun-sqlite-client.js';
import { requireSafeRepositoryAccess, type SafeRepositoryAccess } from './safe-repository-access.js';
import { assertWorkspaceDatabaseRelativePath } from './workspace-database.js';
import { openAdmittedWorkspaceDatabase, closeWorkspaceDatabaseWithAdmission } from './storage-read-admission.js';
import { initializeServiceOperationCustodySchema } from './service-operation-custody.js';

const label = 'VIDA upgrade storage';
const byteLimit = 8 * 1024 * 1024;
const hash = z.string().regex(/^[a-f0-9]{64}$/u);
const bindingSchema = z.strictObject({
  schema: z.literal('VidaWorkspaceBootstrap/v1'),
  operation_id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/u),
  workspace_id: hash,
  plan_digest: hash,
  bundle_digest: hash,
  input_digest: hash,
  authority_digest: hash,
  token_digest: hash,
});
export type WorkspaceBootstrapBinding = z.infer<typeof bindingSchema>;
export const initialWorkspaceImageSchema = z.strictObject({
  schema: z.literal('VidaInitialWorkspaceImage/v1'),
  binding: bindingSchema,
  size: z
    .number()
    .int()
    .positive()
    .max(4 * 1024 * 1024),
  sha256: hash,
  bytes_base64: z
    .string()
    .min(1)
    .max(6 * 1024 * 1024),
  database_schema: z
    .array(
      z.strictObject({
        type: z.enum(['table', 'index', 'view', 'trigger']),
        name: z.string().min(1),
        table_name: z.string().min(1),
        sql: z.string().nullable(),
      }),
    )
    .min(1)
    .max(1024),
});
export type InitialWorkspaceDatabaseImage = z.infer<typeof initialWorkspaceImageSchema>;
export interface ClosedWorkspaceDatabaseImage {
  readonly device: string;
  readonly inode: string;
  readonly size: number;
  readonly sha256: string;
}
const bootstrapTable = 'vida_workspace_bootstrap';
const bootstrapSql =
  'CREATE TABLE vida_workspace_bootstrap (' +
  'id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,digest TEXT NOT NULL)';
const validatedImages = new WeakSet<object>();

function requireStorage(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(label + ': ' + message);
}

/** Data validation only; an attributable binding is not an initialization capability. */
function validateWorkspaceBootstrapBinding(value: unknown): WorkspaceBootstrapBinding {
  const snapshot: unknown = JSON.parse(canonicalJson(value));
  return freezeJsonValue(bindingSchema.parse(snapshot));
}

function initializeBootstrapSentinel(database: Database, binding: WorkspaceBootstrapBinding): void {
  database.transaction(() => {
    database.exec(bootstrapSql);
    database
      .query('INSERT INTO vida_workspace_bootstrap VALUES(1,?,?)')
      .run(canonicalJson(binding), canonicalJsonDigest(binding));
  })();
}

/** Exact data retained by the journal; its binding does not grant maintenance authority. */
export function validateInitialWorkspaceDatabaseImage(value: unknown): InitialWorkspaceDatabaseImage {
  if (value !== null && typeof value === 'object' && validatedImages.has(value))
    return value as InitialWorkspaceDatabaseImage;
  const snapshot: unknown = JSON.parse(canonicalJson(value));
  const image = initialWorkspaceImageSchema.parse(snapshot);
  const bytes = Buffer.from(image.bytes_base64, 'base64');
  requireStorage(bytes.toString('base64') === image.bytes_base64, 'initial image encoding is not canonical');
  requireStorage(bytes.byteLength === image.size, 'initial image size differs');
  requireStorage(
    new Bun.CryptoHasher('sha256').update(bytes).digest('hex') === image.sha256,
    'initial image digest differs',
  );
  const frozen = freezeJsonValue(image);
  validatedImages.add(frozen);
  return frozen;
}

function databaseSchema(database: Database): InitialWorkspaceDatabaseImage['database_schema'] {
  return database
    .query<InitialWorkspaceDatabaseImage['database_schema'][number], []>(
      'SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master ORDER BY type,name',
    )
    .all();
}

function assertEmptyInitialTables(
  database: Database,
  schema: InitialWorkspaceDatabaseImage['database_schema'],
  maintenance = false,
): void {
  for (const entry of schema) {
    if (entry.type !== 'table') continue;
    const quoted = '"' + entry.name.replaceAll('"', '""') + '"';
    const row = database.query<{ count: number | bigint }, []>('SELECT COUNT(*) AS count FROM ' + quoted).get();
    const expected =
      entry.name === bootstrapTable || (maintenance && entry.name === 'agent_host_maintenance') ? 1n : 0n;
    requireStorage(row !== null && BigInt(row.count) === expected, 'initial table contains operational rows');
  }
}

/** Read-only schema/row closure. A real same-operation Host fence must authorize the allowed maintenance row separately. */
export function assertFreshWorkspaceDatabaseSchema(
  database: Database,
  value: InitialWorkspaceDatabaseImage,
  maintenance: boolean,
): void {
  const image = validateInitialWorkspaceDatabaseImage(value);
  requireStorage(typeof maintenance === 'boolean', 'explicit maintenance row disposition required');
  requireStorage(
    canonicalJson(databaseSchema(database)) === canonicalJson(image.database_schema),
    'fresh workspace schema closure differs',
  );
  assertEmptyInitialTables(database, image.database_schema, maintenance);
}

function retainInitialImage(database: Database, binding: WorkspaceBootstrapBinding): InitialWorkspaceDatabaseImage {
  const schema = databaseSchema(database);
  assertEmptyInitialTables(database, schema);
  const bytes = database.serialize();
  return validateInitialWorkspaceDatabaseImage({
    schema: 'VidaInitialWorkspaceImage/v1',
    binding,
    size: bytes.byteLength,
    sha256: new Bun.CryptoHasher('sha256').update(bytes).digest('hex'),
    bytes_base64: bytes.toString('base64'),
    database_schema: schema,
  });
}

async function closePreparedDatabase(
  database: Database,
  storage: LibSQLStore | undefined,
  errors: unknown[],
): Promise<void> {
  try {
    await storage?.close();
  } catch (error) {
    errors.push(error);
  }
  try {
    database.close(true);
  } catch (error) {
    errors.push(error);
  }
}

/** Prepare current empty Host and Mastra schemas without a file, Host capability or operational record. */
export async function prepareInitialWorkspaceDatabaseImage(value: unknown): Promise<InitialWorkspaceDatabaseImage> {
  const binding = validateWorkspaceBootstrapBinding(value);
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  const errors: unknown[] = [];
  let storage: LibSQLStore | undefined;
  let image: InitialWorkspaceDatabaseImage | undefined;
  try {
    const client = createInMemoryBunSqliteClient(database);
    storage = new LibSQLStore({ id: 'vida-workspace-schema-preparation', client });
    initializeHostDatabaseSchema(database);
    initializeTaskSourceBindingWorkProjectionSchema(database);
    initializeServiceOperationCustodySchema(database);
    initializeBootstrapSentinel(database, binding);
    await storage.init();
    await client.settle();
    image = retainInitialImage(database, binding);
  } catch (error) {
    errors.push(error);
  }
  await closePreparedDatabase(database, storage, errors);
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Workspace schema preparation and close failed');
  requireStorage(image !== undefined, 'initial image was not prepared');
  return image;
}

/** Check a frozen complete initial afterimage; never rebuild the image during recovery. */
export function inspectInitialWorkspaceDatabaseImage(
  repositoryRoot: string,
  relative: string,
  value: InitialWorkspaceDatabaseImage,
): ClosedWorkspaceDatabaseImage {
  const expected = validateInitialWorkspaceDatabaseImage(value);
  const image = inspectWorkspaceBootstrapSentinel(repositoryRoot, relative, expected.binding);
  requireStorage(
    image.size === expected.size && image.sha256 === expected.sha256,
    'initial database afterimage differs',
  );
  const database = openAdmittedWorkspaceDatabase(repositoryRoot, relative, expected.binding.workspace_id, true, true);
  try {
    requireStorage(
      canonicalJson(databaseSchema(database)) === canonicalJson(expected.database_schema),
      'initial schema closure differs',
    );
    assertEmptyInitialTables(database, expected.database_schema);
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
  requireStorage(
    canonicalJson(inspectClosedWorkspaceDatabaseImage(repositoryRoot, relative)) === canonicalJson(image),
    'initial image changed during schema inspection',
  );
  return image;
}

function assertNoSidecars(access: SafeRepositoryAccess, relative: string): void {
  for (const suffix of ['-wal', '-shm', '-journal'])
    requireStorage(!access.fileExists(relative + suffix, label), 'database sidecar remains: ' + suffix);
}

function physicalImage(repositoryRoot: string, relative: string) {
  const file = lstatSync(path.join(repositoryRoot, relative), { bigint: true });
  requireStorage(
    file.isFile() && !file.isSymbolicLink() && file.nlink === 1n,
    'database is not a private regular file',
  );
  requireStorage(file.size > 0n && file.size <= BigInt(byteLimit), 'database exceeds the supported publication size');
  return { device: String(file.dev), inode: String(file.ino), size: Number(file.size) };
}

/** Exact closed-main-file observation. It does not authorize a move or prove all external processes are stopped. */
export function inspectClosedWorkspaceDatabaseImage(
  repositoryRoot: string,
  relative: string,
): ClosedWorkspaceDatabaseImage {
  const access = requireSafeRepositoryAccess(repositoryRoot);
  assertWorkspaceDatabaseRelativePath(relative);
  const parent = path.posix.dirname(relative);
  const parentIdentity = access.directoryIdentity(parent, label);
  assertNoSidecars(access, relative);
  const before = physicalImage(repositoryRoot, relative);
  const bytes = access.readBytes(relative, label);
  const after = physicalImage(repositoryRoot, relative);
  requireStorage(canonicalJson(before) === canonicalJson(after) && bytes.byteLength === after.size, 'database changed');
  requireStorage(access.directoryIdentity(parent, label) === parentIdentity, 'database parent was replaced');
  assertNoSidecars(access, relative);
  return Object.freeze({ ...after, sha256: new Bun.CryptoHasher('sha256').update(bytes).digest('hex') });
}

/** Read the same-operation sentinel without creating tables, storage or operational records. */
function inspectWorkspaceBootstrapSentinel(
  repositoryRoot: string,
  relative: string,
  expected: WorkspaceBootstrapBinding,
): ClosedWorkspaceDatabaseImage {
  const binding = validateWorkspaceBootstrapBinding(expected);
  const before = inspectClosedWorkspaceDatabaseImage(repositoryRoot, relative);
  const database = openAdmittedWorkspaceDatabase(repositoryRoot, relative, binding.workspace_id, true);
  try {
    const schema = database
      .query<{ sql: string }, []>(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='vida_workspace_bootstrap'",
      )
      .get();
    requireStorage(schema?.sql === bootstrapSql, 'unsupported bootstrap schema');
    const rows = database
      .query<{ id: number; payload: string; digest: string }, []>(`SELECT id,payload,digest FROM ${bootstrapTable}`)
      .all();
    requireStorage(rows.length === 1, 'bootstrap sentinel count differs');
    const row = rows[0]!;
    requireStorage(
      row.id === 1 && row.payload === canonicalJson(binding) && row.digest === canonicalJsonDigest(binding),
      'bootstrap sentinel belongs to another operation',
    );
    const checked = database.query<{ quick_check: string }, []>('PRAGMA quick_check').all();
    requireStorage(checked.length > 0 && checked.every((row) => row.quick_check === 'ok'), 'database is corrupt');
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
  const after = inspectClosedWorkspaceDatabaseImage(repositoryRoot, relative);
  requireStorage(canonicalJson(before) === canonicalJson(after), 'bootstrap database changed during inspection');
  return after;
}

function truncateCheckpoint(database: Database): void {
  const mode = database.query<{ journal_mode: string }, []>('PRAGMA journal_mode').get();
  requireStorage(mode !== null, 'journal mode is unavailable');
  if (mode.journal_mode !== 'wal') return;
  requireStorage(
    database.fileControl(constants.SQLITE_FCNTL_PERSIST_WAL, 0) === 0,
    'WAL persistence cannot be disabled',
  );
  const checkpoint = database
    .query<{ busy: number; log: number; checkpointed: number }, []>('PRAGMA wal_checkpoint(TRUNCATE)')
    .get();
  requireStorage(
    checkpoint?.busy === 0 &&
      Number.isSafeInteger(checkpoint.log) &&
      checkpoint.log >= -1 &&
      checkpoint.checkpointed === checkpoint.log,
    'WAL checkpoint is busy or incomplete',
  );
}

/** Caller-owned connection settlement. Authority and other connection owners must be checked separately. */
export function checkpointAndCloseWorkspaceDatabase(
  database: Database,
  repositoryRoot: string,
  relative: string,
  expected: Pick<ClosedWorkspaceDatabaseImage, 'device' | 'inode'>,
): ClosedWorkspaceDatabaseImage {
  const errors: unknown[] = [];
  try {
    const before = physicalImage(repositoryRoot, relative);
    requireStorage(
      path.resolve(database.filename) === path.join(repositoryRoot, relative) &&
        before.device === expected.device &&
        before.inode === expected.inode,
      'checkpoint connection or file identity differs',
    );
    requireStorage(!database.inTransaction, 'checkpoint requires settled transactions');
    truncateCheckpoint(database);
  } catch (error) {
    errors.push(error);
  }
  try {
    closeWorkspaceDatabaseWithAdmission(database);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Workspace checkpoint and close failed');
  const image = inspectClosedWorkspaceDatabaseImage(repositoryRoot, relative);
  requireStorage(image.device === expected.device && image.inode === expected.inode, 'closed database was replaced');
  return image;
}
