/**
 * In-memory Host + pinned-Mastra schema merge. Repository access, the genuine Host
 * fence, admission gate, journaling, and no-replace publication stay in the two
 * project-upgrade coordinator modules; this file only accepts bounded closed images.
 */
import { Database } from 'bun:sqlite';
import { LibSQLStore } from '@mastra/libsql';
import { canonicalJson, canonicalJsonDigest } from '../contracts/public-ingress.js';
import { createInMemoryBunSqliteClient } from '../orchestration/bun-sqlite-client.js';
import {
  assertServiceOperationCustodyReady,
  initializeServiceOperationCustodySchema,
} from './service-operation-custody.js';
import { z } from 'zod';

const maxInputBytes = 4 * 1024 * 1024;
const maxRows = 100_000;
const maxTables = 128;
const migrationTable = 'vida_workspace_storage_migration';

export interface ClosedDatabaseImage {
  /** The caller has already proved same device/inode, one link, no symlink, no sidecars, and a successful close. */
  readonly device: string;
  readonly inode: string;
  readonly size: number;
  readonly sha256: string;
  readonly bytes: Uint8Array;
}

export interface ExistingMergeBinding {
  readonly schema: 'VidaExistingStorageMerge/v1';
  readonly operation_id: string;
  readonly workspace_id: string;
  readonly plan_digest: string;
  readonly held_fence_token_digest: string;
  readonly source_host_digest: string;
  readonly source_mastra_digest: string;
}

export interface UnifiedDatabaseImage {
  readonly schema: 'VidaUnifiedWorkspaceImage/v1';
  readonly binding: ExistingMergeBinding;
  readonly size: number;
  readonly sha256: string;
  readonly bytes_base64: string;
  readonly schema_digest: string;
  readonly host_rows_digest: string;
  readonly mastra_rows_digest: string;
}

const hash = z.string().regex(/^[a-f0-9]{64}$/u);
export const existingMergeBindingSchema = z.strictObject({
  schema: z.literal('VidaExistingStorageMerge/v1'),
  operation_id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,79}$/u),
  workspace_id: hash,
  plan_digest: hash,
  held_fence_token_digest: hash,
  source_host_digest: hash,
  source_mastra_digest: hash,
});
export const unifiedDatabaseImageSchema = z.strictObject({
  schema: z.literal('VidaUnifiedWorkspaceImage/v1'),
  binding: existingMergeBindingSchema,
  size: z.number().int().positive().max(maxInputBytes),
  sha256: hash,
  bytes_base64: z
    .string()
    .min(1)
    .max(6 * 1024 * 1024),
  schema_digest: hash,
  host_rows_digest: hash,
  mastra_rows_digest: hash,
});

export function validateUnifiedDatabaseImage(value: unknown): UnifiedDatabaseImage {
  const image = unifiedDatabaseImageSchema.parse(JSON.parse(canonicalJson(value)));
  const bytes = Buffer.from(image.bytes_base64, 'base64');
  requireMerge(bytes.toString('base64') === image.bytes_base64, 'unified image encoding is not canonical');
  requireMerge(
    bytes.byteLength === image.size && digest(bytes) === image.sha256,
    'unified image bytes or digest differ',
  );
  return Object.freeze(image);
}

type SchemaObject = { type: string; name: string; table_name: string; sql: string | null };
type SqlValue = null | string | number | bigint | Uint8Array;

function requireMerge(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error('Existing storage merge: ' + message);
}

function digest(bytes: Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
}

function openImage(image: ClosedDatabaseImage, label: string): Database {
  requireMerge(
    image.bytes.byteLength > 0 && image.bytes.byteLength <= maxInputBytes,
    label + ' image size is unsupported',
  );
  requireMerge(
    image.size === image.bytes.byteLength && digest(image.bytes) === image.sha256,
    label + ' image digest differs',
  );
  return Database.deserialize(Buffer.from(image.bytes), { readonly: true, strict: true, safeIntegers: true });
}

function schema(database: Database): SchemaObject[] {
  return database
    .query<SchemaObject, []>(
      'SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master ' +
        "WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
    )
    .all();
}

function tableNames(objects: readonly SchemaObject[]): string[] {
  return objects.filter((object) => object.type === 'table').map((object) => object.name);
}

function canonicalSqlValues(values: readonly SqlValue[]): unknown[] {
  return values.map((value) => {
    if (value instanceof Uint8Array) return { blob_base64: Buffer.from(value).toString('base64') };
    if (typeof value === 'bigint') return { integer_decimal: value.toString() };
    return value;
  });
}

/** Stable logical closure, including exact BLOB bytes, integer values, and row multiplicity. */
function rowsDigest(database: Database, names: readonly string[]): string {
  const parts: unknown[] = [];
  for (const name of names) {
    const quoted = '"' + name.replaceAll('"', '""') + '"';
    const columns = database
      .query<{ name: string; hidden: number | bigint }, []>('PRAGMA table_xinfo(' + quoted + ')')
      .all()
      .filter((column) => BigInt(column.hidden) !== 1n)
      .map((c) => c.name);
    requireMerge(columns.length > 0, 'table has no columns: ' + name);
    const selected = database
      .query(
        'SELECT ' + columns.map((column) => '"' + column.replaceAll('"', '""') + '"').join(',') + ' FROM ' + quoted,
      )
      .values() as SqlValue[][];
    const ordered = selected.map((row) => canonicalJson(canonicalSqlValues(row))).sort();
    parts.push({ name, columns, rows: ordered });
  }
  return canonicalJsonDigest(parts);
}

function insertSql(table: string, columns: readonly string[]): string {
  const q = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  return (
    'INSERT INTO ' + q(table) + ' (' + columns.map(q).join(',') + ') VALUES (' + columns.map(() => '?').join(',') + ')'
  );
}

function tableColumns(database: Database, table: string): string[] {
  const quoted = '"' + table.replaceAll('"', '""') + '"';
  const columns = database
    .query<{ name: string; hidden: number | bigint }, []>('PRAGMA table_xinfo(' + quoted + ')')
    .all()
    .filter((column) => BigInt(column.hidden) === 0n)
    .map((column) => column.name);
  requireMerge(columns.length > 0, 'table has no insertable columns: ' + table);
  return columns;
}

function sequenceRows(
  database: Database,
  tables: readonly string[],
): { readonly name: string; readonly seq: number | bigint }[] {
  const exists = database.query("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'").get();
  if (!exists) return [];
  const all = database.query<{ name: string; seq: number | bigint }, []>('SELECT name,seq FROM sqlite_sequence').all();
  const selected = new Set(tables);
  requireMerge(
    all.every((row) => selected.has(row.name)),
    'sqlite_sequence has an unowned table row',
  );
  return all.filter((row) => selected.has(row.name)).sort((a, b) => a.name.localeCompare(b.name));
}
type SequenceRow = ReturnType<typeof sequenceRows>[number];

function assertNoSchemaCollision(host: readonly SchemaObject[], mastra: readonly SchemaObject[]): void {
  const names = new Set(host.map((object) => object.name.toLocaleLowerCase('en-US')));
  for (const object of mastra)
    requireMerge(
      !names.has(object.name.toLocaleLowerCase('en-US')),
      'Host/Mastra schema name collision: ' + object.name,
    );
  requireMerge(!names.has(migrationTable), 'Host already uses the migration sentinel name');
}

interface ExistingMergeInventory {
  readonly hostSchema: SchemaObject[];
  readonly mastraSchema: SchemaObject[];
  readonly pinned: SchemaObject[];
  readonly hostTables: string[];
  readonly mastraTables: string[];
  readonly hostRowsDigest: string;
  readonly mastraRowsDigest: string;
  readonly hostSequences: SequenceRow[];
  readonly mastraSequences: SequenceRow[];
}

async function inspectExistingMergeInputs(host: Database, mastra: Database): Promise<ExistingMergeInventory> {
  const hostSchema = schema(host);
  const mastraSchema = schema(mastra);
  requireMerge(
    hostSchema.length <= maxTables * 8 && mastraSchema.length <= maxTables * 8,
    'schema inventory exceeds bound',
  );
  requireMerge(tableNames(mastraSchema).length > 0, 'Mastra schema is empty');
  assertNoSchemaCollision(hostSchema, mastraSchema);
  const pinned = await capturePinnedMastraInventoryAsync();
  requireMerge(
    canonicalJson(pinned) === canonicalJson(mastraSchema),
    'Mastra schema differs from pinned empty-init inventory',
  );
  const mastraTables = tableNames(pinned);
  const hostTables = tableNames(hostSchema);
  const hostCounts = hostTables.map((table) => ({ table, count: tableCount(host, table) }));
  const sourceCounts = mastraTables.map((table) => ({ table, count: tableCount(mastra, table) }));
  requireMerge(
    [...hostCounts, ...sourceCounts].reduce((sum, entry) => sum + entry.count, 0) <= maxRows,
    'supported Host and Mastra tables exceed total row bound',
  );
  requireMerge(integrityOk(host) && integrityOk(mastra), 'an input image fails integrity_check');
  return {
    hostSchema,
    mastraSchema,
    pinned,
    hostTables,
    mastraTables,
    hostRowsDigest: rowsDigest(host, hostTables),
    mastraRowsDigest: rowsDigest(mastra, mastraTables),
    hostSequences: sequenceRows(host, hostTables),
    mastraSequences: sequenceRows(mastra, mastraTables),
  };
}

async function addPinnedSchemaToHostClone(host: Database): Promise<Uint8Array> {
  const prepared = Database.deserialize(Buffer.from(host.serialize()), { strict: true, safeIntegers: true });
  const client = createInMemoryBunSqliteClient(prepared);
  const storage = new LibSQLStore({ id: 'vida-existing-storage-schema-merge', client });
  let withPinnedSchema: Uint8Array | undefined;
  const errors: unknown[] = [];
  try {
    await storage.init();
    await client.settle();
    requireMerge(!prepared.inTransaction, 'pinned initializer left a transaction open');
    withPinnedSchema = Buffer.from(prepared.serialize());
  } catch (error) {
    errors.push(error);
  } finally {
    try {
      await storage.close();
    } catch (error) {
      errors.push(error);
    }
    try {
      prepared.close(true);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'pinned schema initialization and close failed');
  requireMerge(withPinnedSchema !== undefined, 'pinned schema snapshot missing');
  return withPinnedSchema;
}

function importMastraRows(
  target: Database,
  mastra: Database,
  tables: readonly string[],
  sequences: readonly SequenceRow[],
  binding: ExistingMergeBinding,
  hostRowsDigest: string,
  mastraRowsDigest: string,
): void {
  target.exec('PRAGMA defer_foreign_keys=ON');
  target.transaction(() => {
    let copiedRows = 0;
    for (const table of tables) {
      const columns = tableColumns(mastra, table);
      const quoted = '"' + table.replaceAll('"', '""') + '"';
      const statement = target.query(insertSql(table, columns));
      try {
        const selected = columns.map((column) => '"' + column.replaceAll('"', '""') + '"').join(',');
        for (const row of mastra.query('SELECT ' + selected + ' FROM ' + quoted).values() as SqlValue[][]) {
          copiedRows++;
          requireMerge(copiedRows <= maxRows, 'total imported row bound exceeded');
          statement.run(...row);
        }
      } finally {
        statement.finalize();
      }
    }
    if (target.query("SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'").get()) {
      const sequenceByName = new Map(sequences.map((entry) => [entry.name, entry.seq]));
      for (const table of tables) {
        target.query('DELETE FROM sqlite_sequence WHERE name=?').run(table);
        const seq = sequenceByName.get(table);
        if (seq !== undefined) target.query('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)').run(table, seq);
      }
    }
    target.exec(
      'CREATE TABLE ' +
        migrationTable +
        '(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL,digest TEXT NOT NULL)',
    );
    const payload = canonicalJson({
      ...binding,
      host_rows_digest: hostRowsDigest,
      mastra_rows_digest: mastraRowsDigest,
    });
    target
      .query('INSERT INTO ' + migrationTable + ' VALUES(1,?,?)')
      .run(payload, canonicalJsonDigest(JSON.parse(payload)));
    requireMerge(target.query('PRAGMA foreign_key_check').all().length === 0, 'merged rows violate a foreign key');
  })();
}

function assertEmptyServiceOperationCustody(database: Database): void {
  const count = database
    .query<{ count: number | bigint }, []>('SELECT COUNT(*) AS count FROM agent_host_service_operation_custody')
    .get()?.count;
  requireMerge(count !== undefined && BigInt(count) === 0n, 'new service custody table contains operational rows');
}

function assertMergedRowsAndSchema(target: Database, inventory: ExistingMergeInventory): void {
  requireMerge(
    rowsDigest(target, inventory.hostTables) === inventory.hostRowsDigest,
    'Host logical rows changed during merge',
  );
  requireMerge(
    rowsDigest(target, inventory.mastraTables) === inventory.mastraRowsDigest,
    'Mastra logical rows differ after import',
  );
  requireMerge(
    canonicalJson(sequenceRows(target, inventory.hostTables)) === canonicalJson(inventory.hostSequences),
    'Host ID sequences changed during merge',
  );
  requireMerge(
    canonicalJson(sequenceRows(target, inventory.mastraTables)) === canonicalJson(inventory.mastraSequences),
    'Mastra ID sequences differ after import',
  );
  requireMerge(integrityOk(target), 'integrity check failed');
  const finalSchema = schema(target);
  const hostOnlyNames = new Set([
    ...inventory.pinned.map((entry) => entry.name),
    'agent_host_service_operation_custody',
  ]);
  const hostOnly = finalSchema.filter((object) => object.name !== migrationTable && !hostOnlyNames.has(object.name));
  requireMerge(canonicalJson(hostOnly) === canonicalJson(inventory.hostSchema), 'Host schema changed during merge');
  assertServiceOperationCustodyReady(target);
  assertEmptyServiceOperationCustody(target);
}

/**
 * Build a unified image in memory only. The root upgrade coordinator must re-verify the
 * closed inputs after this returns and before staging, then journal the returned exact image.
 */
export async function prepareUnifiedExistingStorageImage(
  hostImage: ClosedDatabaseImage,
  mastraImage: ClosedDatabaseImage,
  binding: ExistingMergeBinding,
): Promise<UnifiedDatabaseImage> {
  requireMerge(binding.schema === 'VidaExistingStorageMerge/v1', 'unsupported binding');
  requireMerge(binding.source_host_digest === hostImage.sha256, 'Host source binding differs');
  requireMerge(binding.source_mastra_digest === mastraImage.sha256, 'Mastra source binding differs');
  const host = openImage(hostImage, 'Host');
  const mastra = openImage(mastraImage, 'Mastra');
  let target: Database | undefined;
  let primaryFailure: unknown;
  let output: UnifiedDatabaseImage | undefined;
  const closeErrors: unknown[] = [];
  try {
    const inventory = await inspectExistingMergeInputs(host, mastra);
    const withPinnedSchema = await addPinnedSchemaToHostClone(host);
    target = Database.deserialize(Buffer.from(withPinnedSchema), { strict: true, safeIntegers: true });
    const expectedCloneSchema = [...inventory.hostSchema, ...inventory.pinned].sort(
      (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name),
    );
    requireMerge(
      canonicalJson(schema(target)) === canonicalJson(expectedCloneSchema),
      'cloned Host plus pinned schema closure differs',
    );
    const targetMastra = schema(target).filter((object) =>
      inventory.pinned.some((entry) => entry.name === object.name),
    );
    requireMerge(
      canonicalJson(targetMastra) === canonicalJson(inventory.pinned),
      'target schema differs after close/reopen',
    );
    initializeServiceOperationCustodySchema(target);
    importMastraRows(
      target,
      mastra,
      inventory.mastraTables,
      inventory.mastraSequences,
      binding,
      inventory.hostRowsDigest,
      inventory.mastraRowsDigest,
    );
    assertMergedRowsAndSchema(target, inventory);
    const finalSchema = schema(target);
    const finalBytes = Buffer.from(target.serialize());
    requireMerge(finalBytes.byteLength <= maxInputBytes, 'unified image exceeds bounded journal capacity');
    output = Object.freeze({
      schema: 'VidaUnifiedWorkspaceImage/v1',
      binding: Object.freeze({ ...binding }),
      size: finalBytes.byteLength,
      sha256: digest(finalBytes),
      bytes_base64: finalBytes.toString('base64'),
      schema_digest: canonicalJsonDigest(finalSchema),
      host_rows_digest: inventory.hostRowsDigest,
      mastra_rows_digest: inventory.mastraRowsDigest,
    });
  } catch (error) {
    primaryFailure = error;
  } finally {
    closeDatabase(target, closeErrors);
    closeDatabase(host, closeErrors);
    closeDatabase(mastra, closeErrors);
  }
  if (primaryFailure !== undefined) {
    if (closeErrors.length > 0)
      throw new AggregateError([primaryFailure, ...closeErrors], 'existing merge and database close failed');
    throw primaryFailure;
  }
  if (closeErrors.length > 0) throw new AggregateError(closeErrors, 'existing merge database close failed');
  requireMerge(output !== undefined, 'unified image was not produced');
  return output;
}

function closeDatabase(database: Database | undefined, errors: unknown[]): void {
  try {
    database?.close(true);
  } catch (error) {
    errors.push(error);
  }
}

async function capturePinnedMastraInventoryAsync(): Promise<SchemaObject[]> {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  const client = createInMemoryBunSqliteClient(database);
  const storage = new LibSQLStore({ id: 'vida-pinned-mastra-inventory', client });
  let captured: Uint8Array | undefined;
  const errors: unknown[] = [];
  try {
    await storage.init();
    await client.settle();
    requireMerge(!database.inTransaction, 'pinned initializer left a transaction open');
    captured = Buffer.from(database.serialize());
  } catch (error) {
    errors.push(error);
  } finally {
    try {
      await storage.close();
    } catch (error) {
      errors.push(error);
    }
    try {
      database.close(true);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'pinned inventory preparation and close failed');
  requireMerge(captured !== undefined, 'pinned inventory was not captured');
  const closed = Database.deserialize(Buffer.from(captured), { readonly: true, strict: true, safeIntegers: true });
  try {
    const objects = schema(closed);
    requireMerge(objects.length <= maxTables * 8 && tableNames(objects).length > 0, 'pinned inventory exceeds bounds');
    return objects;
  } finally {
    closed.close(true);
  }
}

function tableCount(database: Database, table: string): number {
  const quoted = '"' + table.replaceAll('"', '""') + '"';
  const row = database.query<{ count: number | bigint }, []>('SELECT COUNT(*) AS count FROM ' + quoted).get();
  requireMerge(row !== null, 'table count unavailable: ' + table);
  const count = BigInt(row.count);
  requireMerge(count >= 0n && count <= BigInt(maxRows), 'table count is unsupported: ' + table);
  return Number(count);
}

function integrityOk(database: Database): boolean {
  return database.query<{ integrity_check: string }, []>('PRAGMA integrity_check').get()?.integrity_check === 'ok';
}
