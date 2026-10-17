import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import { LibSQLStore } from '@mastra/libsql';
import canonicalize from 'canonicalize';
import { initializeHostDatabaseSchema, initializeTaskSourceBindingWorkProjectionSchema } from '../src/host-state.js';
import type { ClosedDatabaseImage, ExistingMergeBinding } from '../src/config/project-upgrade-existing-storage.js';
import { prepareUnifiedExistingStorageImage } from '../src/config/project-upgrade-existing-storage.js';
import { prepareInitialWorkspaceDatabaseImage } from '../src/config/project-upgrade-storage.js';
import { createInMemoryBunSqliteClient } from '../src/orchestration/bun-sqlite-client.js';
import { serviceOperationCustodySql } from '../src/config/service-operation-custody.js';
import { expectRejection } from './helpers/expect-rejection.js';

const operationTable = 'agent_host_task_source_binding_operation';
const projectionIndex = 'agent_host_task_source_binding_operation_work';
const custodyTable = 'agent_host_service_operation_custody';
const workspaceId = 'a'.repeat(64);
const requestDigest = 'b'.repeat(64);

interface SchemaObject {
  readonly type: string;
  readonly name: string;
  readonly table_name: string;
  readonly sql: string | null;
}

interface TableColumn {
  readonly name: string;
  readonly type: string;
  readonly notnull: number | bigint;
  readonly pk: number | bigint;
}

interface TableIndex {
  readonly name: string;
  readonly unique: number | bigint;
  readonly partial: number | bigint;
}

interface IndexKey {
  readonly name: string | null;
  readonly seqno: number | bigint;
  readonly desc: number | bigint;
  readonly coll: string;
  readonly key: number | bigint;
}

interface RequestIndexKey {
  readonly name: string;
  readonly seqno: number | bigint;
}

interface CountRow {
  readonly count: number | bigint;
}

function schemaSnapshot(database: Database): SchemaObject[] {
  return database
    .query<SchemaObject, []>(
      "SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name",
    )
    .all();
}

function expectFreshOperationShape(database: Database): void {
  const columns = database.query<TableColumn, []>(`PRAGMA table_info(${operationTable})`).all();
  expect(columns.map((column) => column.name)).toEqual([
    'workspace_id',
    'operation_id',
    'request_id',
    'request_digest',
    'work_id',
    'revision',
    'payload',
    'digest',
  ]);
  expect(columns.map((column) => column.type)).toEqual([
    'TEXT',
    'TEXT',
    'TEXT',
    'TEXT',
    'TEXT',
    'INTEGER',
    'TEXT',
    'TEXT',
  ]);
  expect(columns.map((column) => BigInt(column.notnull))).toEqual([1n, 1n, 1n, 1n, 1n, 1n, 1n, 1n]);
  expect(columns.map((column) => BigInt(column.pk))).toEqual([1n, 2n, 0n, 0n, 0n, 0n, 0n, 0n]);

  const indexes = database.query<TableIndex, []>(`PRAGMA index_list(${operationTable})`).all();
  const workIndex = indexes.find((index) => index.name === projectionIndex);
  expect(workIndex).toBeDefined();
  if (!workIndex) throw new Error('fresh projection index is missing');
  expect(BigInt(workIndex.unique)).toBe(0n);
  expect(BigInt(workIndex.partial)).toBe(0n);
  const workKeys = database
    .query<IndexKey, []>(`PRAGMA index_xinfo(${projectionIndex})`)
    .all()
    .filter((column) => BigInt(column.key) === 1n);
  expect(workKeys.map((column) => column.name)).toEqual(['workspace_id', 'work_id', 'operation_id']);
  expect(workKeys.map((column) => BigInt(column.seqno))).toEqual([0n, 1n, 2n]);
  expect(workKeys.every((column) => BigInt(column.desc) === 0n && column.coll === 'BINARY')).toBe(true);

  const requestUnique = indexes.find((index) => {
    if (BigInt(index.unique) !== 1n || BigInt(index.partial) !== 0n) return false;
    const name = index.name.replaceAll('"', '""');
    const keys = database.query<RequestIndexKey, []>(`PRAGMA index_info("${name}")`).all();
    return keys.map((column) => column.name).join(',') === 'workspace_id,request_id';
  });
  expect(requestUnique).toBeDefined();
  expect(
    BigInt(database.query<CountRow, []>(`SELECT COUNT(*) AS count FROM ${operationTable}`).get()?.count ?? -1),
  ).toBe(0n);
}

function expectFreshServiceCustodyShape(database: Database): void {
  const actual = database
    .query<SchemaObject, []>(
      "SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master WHERE type='table' AND name='agent_host_service_operation_custody'",
    )
    .all();
  expect(actual).toEqual([
    {
      type: 'table',
      name: 'agent_host_service_operation_custody',
      table_name: 'agent_host_service_operation_custody',
      sql: serviceOperationCustodySql,
    },
  ]);
  const columns = database.query<TableColumn, []>('PRAGMA table_info(agent_host_service_operation_custody)').all();
  expect(columns.map((column) => column.name)).toEqual([
    'workspace_id',
    'owner_kind',
    'operation_id',
    'request_digest',
    'owner_token',
    'revision',
    'phase',
    'evidence_digest',
    'launch_pid',
    'handoff_digest',
    'handoff_from_kind',
    'handoff_from_phase',
    'handoff_from_request_digest',
    'handoff_from_revision',
    'handoff_from_evidence_digest',
  ]);
  expect(columns.map((column) => column.type)).toEqual([
    'TEXT',
    'TEXT',
    'TEXT',
    'TEXT',
    'TEXT',
    'INTEGER',
    'TEXT',
    'TEXT',
    'INTEGER',
    'TEXT',
    'TEXT',
    'TEXT',
    'TEXT',
    'INTEGER',
    'TEXT',
  ]);
  expect(columns.map((column) => BigInt(column.notnull))).toEqual([
    1n,
    1n,
    1n,
    1n,
    0n,
    1n,
    1n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
  ]);
  expect(columns.map((column) => BigInt(column.pk))).toEqual([
    1n,
    0n,
    2n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
    0n,
  ]);
  expect(actual[0]?.sql).toContain("owner_kind IN ('release-pack-worker','release-worker')");
  expect(actual[0]?.sql).toContain("phase IN ('launching','in_flight','unknown','prepared','terminal')");
  expect(
    BigInt(
      database.query<CountRow, []>('SELECT COUNT(*) AS count FROM agent_host_service_operation_custody').get()?.count ??
        -1,
    ),
  ).toBe(0n);
}

function makeLegacyOperationTable(database: Database): void {
  database.exec(
    'CREATE TABLE agent_host_task_source_binding_operation (' +
      'workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,request_id TEXT NOT NULL,' +
      'request_digest TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,' +
      'digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id),UNIQUE(workspace_id,request_id))',
  );
}

function makeMalformedProjectionTable(database: Database): void {
  database.exec(
    'CREATE TABLE agent_host_task_source_binding_operation (' +
      'workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,request_id TEXT NOT NULL,' +
      'request_digest TEXT NOT NULL,work_id TEXT,revision INTEGER NOT NULL,payload TEXT NOT NULL,' +
      'digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id),UNIQUE(workspace_id,request_id))',
  );
}

describe('fresh task-source work projection schema contract', () => {
  test('prepares an empty fresh image with the exact projection table and required indexes', async () => {
    const image = await prepareInitialWorkspaceDatabaseImage({
      schema: 'VidaWorkspaceBootstrap/v1',
      operation_id: 'fresh-projection-001',
      workspace_id: '0'.repeat(64),
      plan_digest: '1'.repeat(64),
      bundle_digest: '2'.repeat(64),
      input_digest: '3'.repeat(64),
      authority_digest: '4'.repeat(64),
      token_digest: '5'.repeat(64),
    });
    const database = Database.deserialize(Buffer.from(image.bytes_base64, 'base64'), {
      strict: true,
      safeIntegers: true,
    });
    try {
      expectFreshOperationShape(database);
      expectFreshServiceCustodyShape(database);
      for (const entry of image.database_schema.filter((item) => item.type === 'table')) {
        const table = entry.name.replaceAll('"', '""');
        const count = database.query<CountRow, []>(`SELECT COUNT(*) AS count FROM "${table}"`).get()?.count;
        expect(BigInt(count ?? -1)).toBe(entry.name === 'vida_workspace_bootstrap' ? 1n : 0n);
      }
    } finally {
      database.close(true);
    }
  });

  test('denies an existing legacy operation table without silently rewriting it', () => {
    const database = new Database(':memory:', { strict: true, safeIntegers: true });
    try {
      makeLegacyOperationTable(database);
      const before = schemaSnapshot(database);
      expect(() => initializeTaskSourceBindingWorkProjectionSchema(database)).toThrow();
      expect(schemaSnapshot(database)).toEqual(before);
    } finally {
      database.close(true);
    }
  });

  test('rejects a malformed projection and rolls back any attempted index creation', () => {
    const database = new Database(':memory:', { strict: true, safeIntegers: true });
    try {
      makeMalformedProjectionTable(database);
      const before = schemaSnapshot(database);
      expect(() => initializeTaskSourceBindingWorkProjectionSchema(database)).toThrow(/projection column/u);
      expect(schemaSnapshot(database)).toEqual(before);
    } finally {
      database.close(true);
    }
  });
});

type SqlValue = null | string | number | bigint | Uint8Array;

interface TableRowsSnapshot {
  readonly table: string;
  readonly columns: string[];
  readonly rows: unknown[][];
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function closedImage(database: Database): ClosedDatabaseImage {
  const bytes = Buffer.from(database.serialize());
  return { device: 'fixture-device', inode: 'fixture-inode', size: bytes.byteLength, sha256: sha256(bytes), bytes };
}

function rowsSnapshot(database: Database, tables: readonly string[]): TableRowsSnapshot[] {
  return tables.map((table) => {
    const quoted = '"' + table.replaceAll('"', '""') + '"';
    const columns = database
      .query<{ name: string; hidden: number | bigint }, []>('PRAGMA table_xinfo(' + quoted + ')')
      .all()
      .filter((column) => BigInt(column.hidden) === 0n)
      .map((column) => column.name);
    const rows = database
      .query(
        'SELECT ' + columns.map((column) => '"' + column.replaceAll('"', '""') + '"').join(',') + ' FROM ' + quoted,
      )
      .values() as SqlValue[][];
    return {
      table,
      columns,
      rows: rows.map((row) =>
        row.map((value) =>
          value instanceof Uint8Array
            ? { blob_base64: Buffer.from(value).toString('base64') }
            : typeof value === 'bigint'
              ? { integer_decimal: value.toString() }
              : value,
        ),
      ),
    };
  });
}

function logicalRowsDigest(snapshots: readonly TableRowsSnapshot[]): string {
  const parts = snapshots.map((snapshot) => ({
    name: snapshot.table,
    columns: snapshot.columns,
    rows: snapshot.rows
      .map((row) => {
        const serialized = canonicalize(row);
        if (serialized === undefined) throw new Error('captured row could not be canonicalized');
        return serialized;
      })
      .sort(),
  }));
  const serialized = canonicalize(parts);
  if (serialized === undefined) throw new Error('captured table rows could not be canonicalized');
  return sha256(Buffer.from(serialized, 'utf8'));
}

async function makeMastraImage(): Promise<{
  image: ClosedDatabaseImage;
  schema: SchemaObject[];
  rows: TableRowsSnapshot[];
  rowsDigest: string;
}> {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  const client = createInMemoryBunSqliteClient(database);
  const storage = new LibSQLStore({ id: 'service-custody-producer-fixture', client });
  try {
    await storage.init();
    await client.settle();
    const memory = await storage.getStore('memory');
    if (!memory) throw new Error('Mastra memory store is unavailable');
    await memory.saveThread({
      thread: {
        id: 'producer-mastra-thread',
        resourceId: 'producer-mastra-resource',
        title: 'producer preservation fixture',
        createdAt: new Date('2026-01-02T03:04:05.000Z'),
        updatedAt: new Date('2026-01-02T03:04:06.000Z'),
        metadata: { fixture: 'service-custody-producer' },
      },
    });
    await client.settle();
    const schema = schemaSnapshot(database);
    const tables = schema.filter((entry) => entry.type === 'table').map((entry) => entry.name);
    const rows = rowsSnapshot(database, tables);
    expect(rows.some((table) => table.rows.some((row) => row.includes('producer-mastra-thread')))).toBe(true);
    expect(rows.some((table) => table.rows.length > 0)).toBe(true);
    return { image: closedImage(database), schema, rows, rowsDigest: logicalRowsDigest(rows) };
  } finally {
    await storage.close();
    database.close(true);
  }
}

function makeHostImage(serviceTable: 'absent' | 'malformed' | 'populated' | 'corrupt' = 'absent'): {
  image: ClosedDatabaseImage;
  schema: SchemaObject[];
  rows: TableRowsSnapshot[];
  rowsDigest: string;
} {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    initializeHostDatabaseSchema(database);
    database
      .query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)')
      .run(workspaceId, 'producer-fixture', 'host-row', 7, '{"record":"host"}', requestDigest);
    database.exec(
      'CREATE TABLE producer_blob_integer_fixture (id TEXT PRIMARY KEY, ordinal INTEGER NOT NULL CHECK(ordinal>0), body BLOB NOT NULL)',
    );
    database
      .query('INSERT INTO producer_blob_integer_fixture VALUES(?,?,?)')
      .run('blob-row', 9007199254740993n, Buffer.from([0, 1, 127, 128, 255]));
    if (serviceTable === 'corrupt') {
      database.exec('PRAGMA ignore_check_constraints=ON');
      database.exec('UPDATE producer_blob_integer_fixture SET ordinal=-1');
    }
    if (serviceTable === 'malformed') {
      database.exec('CREATE TABLE ' + custodyTable + '(workspace_id TEXT NOT NULL,phase TEXT NOT NULL)');
    } else if (serviceTable === 'populated') {
      database.exec(serviceOperationCustodySql);
      database
        .query('INSERT INTO ' + custodyTable + ' VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(
          workspaceId,
          'release-worker',
          'already-owned',
          requestDigest,
          null,
          1,
          'prepared',
          'c'.repeat(64),
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        );
    }
    const schema = schemaSnapshot(database);
    const tables = schema.filter((entry) => entry.type === 'table').map((entry) => entry.name);
    const rows = rowsSnapshot(database, tables);
    return { image: closedImage(database), schema, rows, rowsDigest: logicalRowsDigest(rows) };
  } finally {
    database.close(true);
  }
}

function binding(host: ClosedDatabaseImage, mastra: ClosedDatabaseImage): ExistingMergeBinding {
  return {
    schema: 'VidaExistingStorageMerge/v1',
    operation_id: 'service-custody-producer-merge',
    workspace_id: workspaceId,
    plan_digest: 'd'.repeat(64),
    held_fence_token_digest: 'e'.repeat(64),
    source_host_digest: host.sha256,
    source_mastra_digest: mastra.sha256,
  };
}

function deserialize(bytesBase64: string): Database {
  return Database.deserialize(Buffer.from(bytesBase64, 'base64'), { strict: true, safeIntegers: true });
}

function expectCustodyChecksAndRestoreEmpty(database: Database): void {
  const table = 'agent_host_service_operation_custody';
  const insert = database.query('INSERT INTO ' + table + ' VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const control = [
    'a'.repeat(64),
    'release-worker',
    'check-valid-control',
    'b'.repeat(64),
    null,
    1,
    'launching',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ] as const;
  insert.run(...control);
  expect(BigInt(database.query<CountRow, []>('SELECT COUNT(*) AS count FROM ' + table).get()?.count ?? -1)).toBe(1n);

  const violations = [
    ['workspace length', 0, 'short-workspace', 'CHECK constraint failed: length(workspace_id)=64'],
    ['request digest length', 3, 'c'.repeat(63), 'CHECK constraint failed: length(request_digest)=64'],
    [
      'owner kind domain',
      1,
      'unsupported-worker',
      "CHECK constraint failed: owner_kind IN ('release-pack-worker','release-worker')",
    ],
    [
      'phase domain',
      6,
      'queued',
      "CHECK constraint failed: phase IN ('launching','in_flight','unknown','prepared','terminal')",
    ],
    ['positive revision', 5, 0, 'CHECK constraint failed: revision>0'],
    ['positive launch PID', 8, 0, 'CHECK constraint failed: launch_pid IS NULL OR launch_pid>0'],
  ] as const;
  for (const [label, index, value, expectedError] of violations) {
    const invalid: (string | number | null)[] = [...control];
    invalid[2] = 'check-invalid-' + label.replaceAll(' ', '-');
    invalid[index] = value;
    database.exec('SAVEPOINT custody_check_case');
    try {
      let caught: unknown;
      try {
        insert.run(...invalid);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toBe(expectedError);
    } finally {
      database.exec('ROLLBACK TO custody_check_case');
      database.exec('RELEASE custody_check_case');
    }
    expect(BigInt(database.query<CountRow, []>('SELECT COUNT(*) AS count FROM ' + table).get()?.count ?? -1)).toBe(1n);
  }

  database.query('DELETE FROM ' + table + ' WHERE operation_id=?').run('check-valid-control');
  expect(BigInt(database.query<CountRow, []>('SELECT COUNT(*) AS count FROM ' + table).get()?.count ?? -1)).toBe(0n);
}

describe('existing storage service custody producer', () => {
  test('rejects a correctly hashed image with violated SQLite constraints and preserves both inputs', async () => {
    const host = makeHostImage('corrupt');
    const mastra = await makeMastraImage();
    const hostBefore = Buffer.from(host.image.bytes);
    const mastraBefore = Buffer.from(mastra.image.bytes);
    await expectRejection(
      prepareUnifiedExistingStorageImage(host.image, mastra.image, binding(host.image, mastra.image)),
      'Existing storage merge: an input image fails integrity_check',
    );
    expect(Buffer.from(host.image.bytes)).toEqual(hostBefore);
    expect(Buffer.from(mastra.image.bytes)).toEqual(mastraBefore);
  });

  test('preserves populated Host and Mastra images and adds the exact empty service table', async () => {
    const host = makeHostImage();
    const mastra = await makeMastraImage();
    const hostBefore = Buffer.from(host.image.bytes);
    const mastraBefore = Buffer.from(mastra.image.bytes);
    const unified = await prepareUnifiedExistingStorageImage(
      host.image,
      mastra.image,
      binding(host.image, mastra.image),
    );
    expect(Buffer.from(host.image.bytes)).toEqual(hostBefore);
    expect(Buffer.from(mastra.image.bytes)).toEqual(mastraBefore);

    const merged = deserialize(unified.bytes_base64);
    try {
      const mergedSchema = schemaSnapshot(merged);
      expect(
        mergedSchema.filter((entry) =>
          host.schema.some((source) => source.name === entry.name && source.type === entry.type),
        ),
      ).toEqual(host.schema);
      expect(
        rowsSnapshot(
          merged,
          host.schema.filter((entry) => entry.type === 'table').map((entry) => entry.name),
        ),
      ).toEqual(host.rows);
      expect(
        rowsSnapshot(
          merged,
          mastra.schema.filter((entry) => entry.type === 'table').map((entry) => entry.name),
        ),
      ).toEqual(mastra.rows);
      expect(unified.host_rows_digest).toBe(host.rowsDigest);
      expect(unified.mastra_rows_digest).toBe(mastra.rowsDigest);
      expectFreshServiceCustodyShape(merged);
      expectCustodyChecksAndRestoreEmpty(merged);
      const sentinel = merged
        .query<{ payload: string; digest: string }, []>(
          'SELECT payload,digest FROM vida_workspace_storage_migration WHERE id=1',
        )
        .get();
      const sentinelPayload = canonicalize({
        ...binding(host.image, mastra.image),
        host_rows_digest: host.rowsDigest,
        mastra_rows_digest: mastra.rowsDigest,
      });
      if (sentinelPayload === undefined)
        throw new Error('independent migration sentinel payload is not canonicalizable');
      expect(sentinel).toEqual({ payload: sentinelPayload, digest: sha256(Buffer.from(sentinelPayload, 'utf8')) });
    } finally {
      merged.close(true);
    }
  });

  test.each([
    ['malformed service table', 'malformed', 'Service operation custody: owned service table is absent or differs'],
    ['pre-populated service table', 'populated', 'Service operation custody: prepared service table must be empty'],
  ] as const)('rejects a %s and leaves the exact source images untouched', async (_label, mode, expectedError) => {
    const host = makeHostImage(mode);
    const mastra = await makeMastraImage();
    const hostBefore = Buffer.from(host.image.bytes);
    const mastraBefore = Buffer.from(mastra.image.bytes);
    await expectRejection(
      prepareUnifiedExistingStorageImage(host.image, mastra.image, binding(host.image, mastra.image)),
      expectedError,
    );
    expect(Buffer.from(host.image.bytes)).toEqual(hostBefore);
    expect(Buffer.from(mastra.image.bytes)).toEqual(mastraBefore);
  });
});
