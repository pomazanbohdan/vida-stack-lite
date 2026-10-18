import { expectAsyncReturned, expectRejection, expectReturned, rejectionReason } from './helpers/expect-rejection.ts';
import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { describe, expect, spyOn, test } from 'bun:test';
import { LibSQLStore } from '@mastra/libsql';
import canonicalize from 'canonicalize';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { initializeHostDatabaseSchema } from '../src/host-state.js';
import { type ClosedDatabaseImage, type ExistingMergeBinding } from '../src/config/project-upgrade-existing-storage.js';
import { createInMemoryBunSqliteClient } from '../src/orchestration/bun-sqlite-client.js';
import { callWithUntrustedArguments } from './helpers/untrusted-call.ts';

const workspaceId = 'a'.repeat(64);
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const requireStorageImage = createRequire(import.meta.url);

function loadFreshStorageImage(): typeof import('../src/config/project-upgrade-existing-storage.ts') {
  const file = requireStorageImage.resolve('../src/config/project-upgrade-existing-storage.ts');
  delete requireStorageImage.cache[file];
  return requireStorageImage(file) as typeof import('../src/config/project-upgrade-existing-storage.ts');
}

type PrepareUnifiedExistingStorageImage =
  typeof import('../src/config/project-upgrade-existing-storage.ts').prepareUnifiedExistingStorageImage;

function prepareUnifiedExistingStorageImage(
  ...args: Parameters<PrepareUnifiedExistingStorageImage>
): ReturnType<PrepareUnifiedExistingStorageImage> {
  return loadFreshStorageImage().prepareUnifiedExistingStorageImage(...args);
}

async function expectPreparedImage(
  operation: () => ReturnType<PrepareUnifiedExistingStorageImage>,
): ReturnType<PrepareUnifiedExistingStorageImage> {
  const image = await expectAsyncReturned(operation);
  expect(image !== null && typeof image === 'object').toBe(true);
  expect(image.schema).toBe('VidaUnifiedWorkspaceImage/v1');
  expect(image.binding !== null && typeof image.binding === 'object').toBe(true);
  expect(Number.isSafeInteger(image.size)).toBe(true);
  for (const key of ['sha256', 'bytes_base64', 'schema_digest', 'host_rows_digest', 'mastra_rows_digest'] as const)
    expect(typeof image[key]).toBe('string');
  return image;
}

function closedImage(database: Database): ClosedDatabaseImage {
  const bytes = Buffer.from(database.serialize());
  return { device: 'fixture-device', inode: 'fixture-inode', size: bytes.byteLength, sha256: sha256(bytes), bytes };
}

function countUserTableRows(database: Database): bigint {
  const tables = database
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' ORDER BY name",
    )
    .all();
  return tables.reduce((total, { name }) => {
    const quoted = '"' + name.replaceAll('"', '""') + '"';
    const count = database
      .query<{ count: number | bigint }, []>('SELECT COUNT(*) AS count FROM ' + quoted)
      .get()?.count;
    if (count === undefined) throw new Error('SQLite row count is unavailable for table ' + name);
    return total + BigInt(count);
  }, 0n);
}

function makeHost(sequenceValue: bigint | number | string = 9007199254740993n): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    initializeHostDatabaseSchema(database);
    database
      .query('INSERT INTO agent_host_state VALUES(?,?,?,?,?,?)')
      .run(workspaceId, 'merge-fixture', 'row-1', 1, '{"state":"kept"}', 'b'.repeat(64));
    database.exec(
      'CREATE TABLE merge_sequence_fixture(id INTEGER PRIMARY KEY AUTOINCREMENT, group_id TEXT NOT NULL, ordinal INTEGER NOT NULL, body BLOB NOT NULL)',
    );
    const insert = database.query('INSERT INTO merge_sequence_fixture(group_id,ordinal,body) VALUES(?,?,?)');
    insert.run('same-group', 9007199254740993n, Buffer.from([0, 1, 127, 128, 255]));
    insert.run('same-group', 9007199254740993n, Buffer.from([0, 1, 127, 128, 255]));
    insert.run('same-group', 9007199254740995n, Buffer.from([255, 128, 127, 1, 0]));
    database.query('DELETE FROM merge_sequence_fixture WHERE id=3').run();
    database.query("UPDATE sqlite_sequence SET seq=? WHERE name='merge_sequence_fixture'").run(sequenceValue);
    database.exec(
      'CREATE TABLE merge_sequence_secondary_fixture(id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT NOT NULL)',
    );
    database.query('INSERT INTO merge_sequence_secondary_fixture(label) VALUES(?)').run('secondary-sequence');
    database.query("UPDATE sqlite_sequence SET seq=? WHERE name='merge_sequence_secondary_fixture'").run(41);
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostWithLogicalInsertionOrder(reverse: boolean): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    database.exec('CREATE TABLE logical_order_fixture(key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const rows = [
      { key: 'alpha', value: 'first' },
      { key: 'bravo', value: 'second' },
      { key: 'charlie', value: 'third' },
    ];
    const insert = database.query('INSERT INTO logical_order_fixture(key,value) VALUES(?,?)');
    for (const row of reverse ? [...rows].reverse() : rows) insert.run(row.key, row.value);
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostWithForeignKeyViolation(): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    initializeHostDatabaseSchema(database);
    database.exec('PRAGMA foreign_keys=OFF');
    database.exec('CREATE TABLE merge_fk_parent(id TEXT PRIMARY KEY)');
    database.exec(
      'CREATE TABLE merge_fk_child(id TEXT PRIMARY KEY, parent_id TEXT NOT NULL REFERENCES merge_fk_parent(id))',
    );
    database.query('INSERT INTO merge_fk_child VALUES(?,?)').run('orphan', 'missing-parent');
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostWithCheckConstraintViolation(): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    initializeHostDatabaseSchema(database);
    database.exec('CREATE TABLE merge_integrity_fixture(id INTEGER CHECK(id > 0))');
    database.exec('PRAGMA ignore_check_constraints=ON');
    database.query('INSERT INTO merge_integrity_fixture VALUES(?)').run(-1);
    database.exec('PRAGMA ignore_check_constraints=OFF');
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostWithUnownedSequenceRow(): ClosedDatabaseImage {
  const database = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
  try {
    database.query('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)').run('unowned_sequence_fixture', 9);
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostWithCheckFixture(): ClosedDatabaseImage {
  const database = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
  try {
    database.exec('CREATE TABLE final_integrity_fixture(value INTEGER NOT NULL CHECK(value > 0))');
    database.query('INSERT INTO final_integrity_fixture VALUES(1)').run();
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostOverTableBound(): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    database.exec('PRAGMA page_size=512');
    initializeHostDatabaseSchema(database);
    database.exec('CREATE TABLE merge_schema_bound_fixture(id INTEGER PRIMARY KEY, indexed_value INTEGER NOT NULL)');
    database.exec(
      Array.from(
        { length: 1025 },
        (_, index) =>
          'CREATE INDEX merge_schema_bound_fixture_index_' + index + ' ON merge_schema_bound_fixture(indexed_value)',
      ).join(';'),
    );
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostOverSingleTableRowBound(rowCount = 100001): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    initializeHostDatabaseSchema(database);
    database.exec('CREATE TABLE merge_row_bound_fixture(id INTEGER PRIMARY KEY)');
    database.exec(
      'WITH RECURSIVE rows(id) AS (SELECT 1 UNION ALL SELECT id+1 FROM rows WHERE id<' +
        rowCount +
        ') ' +
        'INSERT INTO merge_row_bound_fixture SELECT id FROM rows',
    );
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function makeHostOverCombinedRowBound(): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    initializeHostDatabaseSchema(database);
    database.exec('CREATE TABLE merge_combined_row_fixture_a(id INTEGER PRIMARY KEY)');
    database.exec('CREATE TABLE merge_combined_row_fixture_b(id INTEGER PRIMARY KEY)');
    database.exec(
      'WITH RECURSIVE rows(id) AS (SELECT 1 UNION ALL SELECT id+1 FROM rows WHERE id<50001) ' +
        'INSERT INTO merge_combined_row_fixture_a SELECT id FROM rows',
    );
    database.exec(
      'WITH RECURSIVE rows(id) AS (SELECT 1 UNION ALL SELECT id+1 FROM rows WHERE id<50001) ' +
        'INSERT INTO merge_combined_row_fixture_b SELECT id FROM rows',
    );
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

function oversizedHostImage(): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    database.exec('CREATE TABLE oversized_fixture(payload BLOB NOT NULL)');
    database.query('INSERT INTO oversized_fixture(payload) VALUES(zeroblob(?))').run(4 * 1024 * 1024);
    return closedImage(database);
  } finally {
    database.close(true);
  }
}

let mastraFixtureTemplate: { readonly bytes: Buffer; readonly size: number; readonly sha256: string } | undefined;

async function makeMastra(): Promise<ClosedDatabaseImage> {
  if (mastraFixtureTemplate === undefined) {
    const database = new Database(':memory:', { strict: true, safeIntegers: true });
    const client = createInMemoryBunSqliteClient(database);
    const storage = new LibSQLStore({ id: 'existing-storage-merge-test', client });
    let initialized: ClosedDatabaseImage | undefined;
    try {
      await storage.init();
      await client.settle();
      const memory = await storage.getStore('memory');
      if (!memory) throw new Error('Mastra memory store is unavailable');
      await memory.saveThread({
        thread: {
          id: 'merge-thread-1',
          resourceId: 'merge-resource-1',
          title: 'merge preservation fixture',
          createdAt: new Date('2026-02-03T04:05:06.000Z'),
          updatedAt: new Date('2026-02-03T04:05:07.000Z'),
          metadata: { fixture: 'existing-storage-merge' },
        },
      });
      await client.settle();
      initialized = closedImage(database);
    } finally {
      await storage.close();
      database.close(true);
    }
    if (initialized === undefined) throw new Error('Mastra fixture initialization produced no closed image');
    const bytes = Buffer.from(initialized.bytes);
    mastraFixtureTemplate = Object.freeze({ bytes, size: bytes.byteLength, sha256: initialized.sha256 });
  }
  const bytes = Buffer.from(mastraFixtureTemplate.bytes);
  return {
    device: 'fixture-device',
    inode: 'fixture-inode',
    size: mastraFixtureTemplate.size,
    sha256: mastraFixtureTemplate.sha256,
    bytes,
  };
}

function binding(host: ClosedDatabaseImage, mastra: ClosedDatabaseImage): ExistingMergeBinding {
  return {
    schema: 'VidaExistingStorageMerge/v1',
    operation_id: 'merge-fixture-001',
    workspace_id: workspaceId,
    plan_digest: 'c'.repeat(64),
    held_fence_token_digest: 'd'.repeat(64),
    source_host_digest: host.sha256,
    source_mastra_digest: mastra.sha256,
  };
}

function openUnified(bytesBase64: string): Database {
  return expectReturned(() =>
    Database.deserialize(Buffer.from(bytesBase64, 'base64'), { strict: true, safeIntegers: true }),
  );
}

function serializedBytesEqual(bytes: Parameters<typeof Database.deserialize>[0], expected: Uint8Array): boolean {
  const view = ArrayBuffer.isView(bytes)
    ? new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    : new Uint8Array(bytes);
  return Buffer.from(view).equals(expected);
}

function nativeStatementMember(statement: object, property: PropertyKey): unknown {
  const value: unknown = Reflect.get(statement, property, statement);
  return typeof value === 'function' ? (...args: unknown[]): unknown => Reflect.apply(value, statement, args) : value;
}

async function expectPinnedPhaseFailure(
  phase: 'inventory' | 'Host clone',
  faults: {
    serialize: boolean;
    storeClose: boolean;
    databaseClose: boolean;
    storeCloseBeforeNative?: boolean;
    transaction?: boolean;
  },
): Promise<void> {
  const host = makeHost();
  const mastra = await makeMastra();
  const targetInit = phase === 'inventory' ? 1 : 2;
  const bodyError: unknown = undefined;
  const storeCloseError = new Error(phase + ' LibSQLStore close acknowledgement failed');
  const init = Reflect.get(LibSQLStore.prototype, 'init') as typeof LibSQLStore.prototype.init;
  const storeClose = Reflect.get(LibSQLStore.prototype, 'close') as typeof LibSQLStore.prototype.close;
  const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
  const serialize = Reflect.get(Database.prototype, 'serialize') as typeof Database.prototype.serialize;
  const databaseClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  let initCount = 0;
  let observingTargetInit = false;
  let targetReady = false;
  const targetStores = new Set<LibSQLStore>();
  const targetDatabases = new Set<Database>();
  let bodyReached = false;
  let storeCloseReached = false;
  let databaseCloseReached = false;
  let closingStoreInProgress = false;
  const closeProbes: { first: unknown; next: () => unknown; all: () => unknown; finalize: () => void }[] = [];
  const initializing = spyOn(LibSQLStore.prototype, 'init').mockImplementation(async function (
    this: LibSQLStore,
    ...args
  ) {
    const current = ++initCount;
    if (current === targetInit) {
      targetStores.add(this);
      observingTargetInit = true;
    }
    try {
      const result = await init.apply(this, args);
      if (current === targetInit) targetReady = true;
      return result;
    } finally {
      observingTargetInit = false;
    }
  });
  const observingQueries = spyOn(Database.prototype, 'query').mockImplementation(function (
    this: Database,
    sql: string,
  ) {
    if (observingTargetInit) targetDatabases.add(this);
    return Reflect.apply(query, this, [sql]);
  } as typeof Database.prototype.query);
  let settling: { mockRestore(): void } | undefined;
  if (faults.transaction) {
    const probe = new Database(':memory:', { strict: true, safeIntegers: true });
    let settleOwner: Pick<ReturnType<typeof createInMemoryBunSqliteClient>, 'settle'>;
    try {
      const client = createInMemoryBunSqliteClient(probe);
      settleOwner = Object.getPrototypeOf(client) as typeof settleOwner;
      await client.close();
    } finally {
      probe.close(true);
    }
    const settle = settleOwner.settle;
    settling = spyOn(settleOwner, 'settle').mockImplementation(async function (this: typeof settleOwner, ...args) {
      const result = await settle.apply(this, args);
      // The client already guards transactions during settle. Change real
      // state only after that owner succeeds to exercise the caller's fence.
      if (targetReady && !bodyReached) {
        for (const database of targetDatabases) {
          database.exec('BEGIN');
          expect(database.inTransaction).toBe(true);
        }
        bodyReached = true;
      }
      return result;
    });
  }
  const serializing = spyOn(Database.prototype, 'serialize').mockImplementation(function (this: Database, ...args) {
    const bytes = serialize.apply(this, args);
    if (targetReady && targetDatabases.has(this)) {
      targetReady = false;
      bodyReached = true;
      if (faults.serialize) throw bodyError;
    }
    return bytes;
  });
  const closingStore = spyOn(LibSQLStore.prototype, 'close').mockImplementation(async function (
    this: LibSQLStore,
    ...args
  ) {
    closingStoreInProgress = true;
    try {
      if (targetStores.has(this) && faults.storeCloseBeforeNative) {
        storeCloseReached = true;
        for (const database of targetDatabases) {
          const statement = database.prepare<{ value: number | bigint }, []>(
            'SELECT 1 AS value UNION ALL SELECT 2 AS value',
          );
          const cursor = statement.iterate();
          closeProbes.push({
            first: cursor.next(),
            next: () => cursor.next(),
            all: () => statement.all(),
            finalize: () => statement.finalize(),
          });
        }
        throw storeCloseError;
      }
      const result = await storeClose.apply(this, args);
      if (targetStores.has(this)) {
        storeCloseReached = true;
        if (faults.storeClose) throw storeCloseError;
      }
      return result;
    } finally {
      closingStoreInProgress = false;
    }
  });
  const closingDatabase = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, ...args) {
    databaseClose.apply(this, args);
    if (targetDatabases.has(this)) {
      databaseCloseReached = true;
      if (faults.databaseClose && !closingStoreInProgress) throw undefined;
    }
  });
  let fixtureFailure: { error: unknown } | undefined;
  const cleanupFailures: unknown[] = [];
  try {
    const failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
    expect(initCount).toBe(targetInit);
    expect(targetStores.size).toBe(1);
    expect(targetDatabases.size).toBe(1);
    expect(bodyReached).toBe(true);
    expect(storeCloseReached).toBe(true);
    expect(databaseCloseReached).toBe(true);
    const expected: unknown[] = [];
    if (faults.transaction) {
      const cause: unknown = failure instanceof AggregateError ? failure.errors[0] : failure;
      expect(cause).toBeInstanceOf(Error);
      if (!(cause instanceof Error)) throw new Error('Expected an open pinned transaction denial.');
      expect(cause.message).toBe('Existing storage merge: pinned initializer left a transaction open');
      expected.push(cause);
    } else if (faults.serialize) expected.push(bodyError);
    if (faults.storeClose) expected.push(storeCloseError);
    if (faults.databaseClose) expected.push(undefined);
    if (expected.length > 1) {
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error('Expected retained body and cleanup causes.');
      expect(failure.errors).toHaveLength(expected.length);
      expected.forEach((cause, index) => expect(failure.errors[index]).toBe(cause));
      expect(failure.message).toBe(
        phase === 'inventory'
          ? 'pinned inventory preparation and close failed'
          : 'pinned schema initialization and close failed',
      );
    } else expect(failure).toBe(expected[0]);
    if (faults.storeCloseBeforeNative) expect(closeProbes).toHaveLength(1);
    for (const probe of closeProbes) {
      expect(probe.first).toEqual({ value: { value: 1n }, done: false });
      expect(probe.next).toThrow('Database has closed');
      expect(probe.all).toThrow('Database has closed');
    }
    for (const database of targetDatabases) expect(() => database.query('SELECT 1').get()).toThrow();
  } catch (error) {
    fixtureFailure = { error };
  } finally {
    closingDatabase.mockRestore();
    closingStore.mockRestore();
    serializing.mockRestore();
    observingQueries.mockRestore();
    initializing.mockRestore();
    settling?.mockRestore();
    for (const probe of closeProbes) {
      try {
        probe.finalize();
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (faults.storeCloseBeforeNative) {
      for (const store of targetStores) {
        try {
          await storeClose.call(store);
        } catch (error) {
          cleanupFailures.push(error);
        }
      }
      for (const database of targetDatabases) {
        try {
          databaseClose.call(database, true);
        } catch (error) {
          cleanupFailures.push(error);
        }
      }
    }
  }
  if (cleanupFailures.length)
    throw new AggregateError(
      [...(fixtureFailure ? [fixtureFailure.error] : []), ...cleanupFailures],
      'Pinned phase fixture cleanup failed',
      fixtureFailure ? { cause: fixtureFailure.error } : undefined,
    );
  if (fixtureFailure) throw fixtureFailure.error;
}

test.each(['inventory', 'Host clone'] as const)(
  'rejects and closes a real transaction opened after the owned %s client settles',
  async (phase) => {
    await expectPinnedPhaseFailure(phase, {
      serialize: false,
      storeClose: false,
      databaseClose: false,
      transaction: true,
    });
  },
);

test.each(['inventory', 'Host clone'] as const)(
  'force-closes the owned %s cursor when SDK close fails before native close',
  async (phase) => {
    await expectPinnedPhaseFailure(phase, {
      serialize: false,
      storeClose: true,
      databaseClose: false,
      storeCloseBeforeNative: true,
    });
  },
);

test.each([
  ['inventory / clean teardown', 'inventory', true, false, false],
  ['inventory / cleanup failures', 'inventory', true, true, true],
  ['Host clone / clean teardown', 'Host clone', true, false, false],
  ['Host clone / cleanup failures', 'Host clone', true, true, true],
  ['inventory / store close only', 'inventory', false, true, false],
  ['inventory / database close only', 'inventory', false, false, true],
  ['inventory / both closes only', 'inventory', false, true, true],
  ['Host clone / store close only', 'Host clone', false, true, false],
  ['Host clone / database close only', 'Host clone', false, false, true],
  ['Host clone / both closes only', 'Host clone', false, true, true],
] as const)('%s retains body and close errors', async (_label, phase, serialize, storeClose, databaseClose) => {
  await expectPinnedPhaseFailure(phase, { serialize, storeClose, databaseClose });
});

test.each([
  ['inventory', 1],
  ['Host clone', 2],
] as const)('closes the owned %s database when memory-client setup fails', async (_phase, targetSetup) => {
  const host = makeHost();
  const mastra = await makeMastra();
  const setupError = new Error('memory-client setup failed');
  const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
  const close = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  const setupDatabases = new Set<Database>();
  const observed: { database?: Database } = {};
  let ownedCloses = 0;
  const querying = spyOn(Database.prototype, 'query').mockImplementation(function (this: Database, sql: string) {
    if (sql === 'PRAGMA database_list' && !setupDatabases.has(this)) {
      setupDatabases.add(this);
      if (setupDatabases.size === targetSetup) {
        observed.database = this;
        throw setupError;
      }
    }
    return Reflect.apply(query, this, [sql]);
  } as typeof Database.prototype.query);
  const closing = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, ...args) {
    const result = close.apply(this, args);
    if (this === observed.database) ownedCloses++;
    return result;
  });
  try {
    const failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
    expect(failure).toBe(setupError);
    expect(observed.database).toBeDefined();
    expect(ownedCloses).toBe(1);
    expect(() => observed.database?.query('SELECT 1').get()).toThrow();
  } finally {
    closing.mockRestore();
    querying.mockRestore();
    if (observed.database && ownedCloses === 0) observed.database.close(true);
  }
});

test.each([
  ['body and close failures', true, true, 'native', 'undefined'],
  ['close failure only', false, true, 'native', 'undefined'],
  ['body failure only', true, false, 'native', 'undefined'],
  ['body Error and close failures', true, true, 'native', 'error'],
  ['body Error only', true, false, 'native', 'error'],
  ['empty inventory bound denial', false, false, 'empty', 'undefined'],
  ['inventory at its exact bound', false, false, 'exact-bound', 'undefined'],
  ['inventory above its exact bound', false, false, 'over-bound', 'undefined'],
] as const)(
  'retains pinned catalog causes for %s',
  async (_label, failSchemaQuery, failClose, inventoryMode, bodyFailure) => {
    const host = makeHost();
    const mastra = await makeMastra();
    const hostBefore = Buffer.from(host.bytes);
    const mastraBefore = Buffer.from(mastra.bytes);
    const bodyError: unknown = bodyFailure === 'error' ? new Error('pinned catalog body failure') : undefined;
    const closeError = new Error('pinned catalog close acknowledgement failed');
    const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const serialize = Reflect.get(Database.prototype, 'serialize') as typeof Database.prototype.serialize;
    const close = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const deserialize = Database.deserialize.bind(Database);
    const schemaQuery =
      'SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master ' +
      "WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name";
    const observed: { inventoryBuilder?: Database } = {};
    let inventoryBytes: Buffer | undefined;
    let catalog: Database | undefined;
    let schemaQueryReached = false;
    let catalogCloseReached = false;
    let originalCatalogRows: unknown;
    const locatingBuilder = spyOn(Database.prototype, 'query').mockImplementation(function (
      this: Database,
      sql: string,
    ) {
      if (observed.inventoryBuilder === undefined && sql === 'PRAGMA database_list') observed.inventoryBuilder = this;
      if (this === catalog && sql === schemaQuery) {
        const statement = Reflect.apply(query, this, [sql]);
        return new Proxy(statement, {
          get(target, property) {
            if (property === 'all')
              return (...args: unknown[]) => {
                const rows: unknown = Reflect.apply(Reflect.get(target, property, target), target, args);
                schemaQueryReached = true;
                originalCatalogRows = rows;
                if (failSchemaQuery) throw bodyError;
                if (inventoryMode === 'empty') return [];
                if (inventoryMode === 'exact-bound' || inventoryMode === 'over-bound') {
                  if (!Array.isArray(rows) || rows.length === 0)
                    throw new Error('Expected native pinned catalog rows for the controlled-bound fixture.');
                  const nativeRows: readonly unknown[] = rows;
                  const rowCount = inventoryMode === 'exact-bound' ? 1024 : 1025;
                  return Array.from({ length: rowCount }, (_, index) => nativeRows[index % nativeRows.length]);
                }
                return rows;
              };
            return nativeStatementMember(target, property);
          },
        }) as ReturnType<typeof query>;
      }
      return Reflect.apply(query, this, [sql]);
    } as typeof Database.prototype.query);
    const capturingInventoryBytes = spyOn(Database.prototype, 'serialize').mockImplementation(function (
      this: Database,
      ...args
    ) {
      const bytes = serialize.apply(this, args);
      if (this === observed.inventoryBuilder) inventoryBytes = Buffer.from(bytes);
      return bytes;
    });
    const locatingCatalog = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
      const database = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
      if (
        inventoryBytes !== undefined &&
        typeof options !== 'boolean' &&
        options?.readonly === true &&
        serializedBytesEqual(bytes, inventoryBytes)
      )
        catalog = database;
      return database;
    });
    const failingCatalogClose = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      ...args
    ) {
      const result = close.apply(this, args);
      if (this === catalog) {
        catalogCloseReached = true;
        if (failClose) throw closeError;
      }
      return result;
    });
    let failure: unknown;
    try {
      failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
    } finally {
      failingCatalogClose.mockRestore();
      locatingCatalog.mockRestore();
      capturingInventoryBytes.mockRestore();
      locatingBuilder.mockRestore();
    }
    expect(observed.inventoryBuilder).toBeDefined();
    expect(inventoryBytes).toBeDefined();
    expect(catalog).toBeDefined();
    expect(schemaQueryReached).toBe(true);
    expect(catalogCloseReached).toBe(true);
    if (inventoryMode === 'empty' || inventoryMode === 'over-bound') {
      expect(Array.isArray(originalCatalogRows)).toBe(true);
      if (!Array.isArray(originalCatalogRows)) throw new Error('Expected native pinned catalog rows.');
      expect(originalCatalogRows.length).toBeGreaterThan(0);
      expect(failure).toBeInstanceOf(Error);
      if (!(failure instanceof Error)) throw new Error('Expected pinned inventory bound denial.');
      expect(failure.message).toBe('Existing storage merge: pinned inventory exceeds bounds');
    } else if (inventoryMode === 'exact-bound') {
      expect(Array.isArray(originalCatalogRows)).toBe(true);
      if (!Array.isArray(originalCatalogRows)) throw new Error('Expected native pinned catalog rows.');
      expect(originalCatalogRows.length).toBeGreaterThan(0);
      expect(failure).toBeInstanceOf(Error);
      if (!(failure instanceof Error)) throw new Error('Expected the public prepare to reject the controlled catalog.');
      expect(failure.message).toBe('Existing storage merge: Mastra schema differs from pinned empty-init inventory');
    } else if (failSchemaQuery && failClose) {
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error('Expected the catalog query and close causes.');
      expect(failure.errors).toHaveLength(2);
      expect(failure.message).toBe('pinned inventory catalog and close failed');
      expect(failure.errors[0]).toBe(bodyError);
      expect(failure.errors[1]).toBe(closeError);
    } else expect(failure).toBe(failSchemaQuery ? bodyError : closeError);
    expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
    expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
    expect(() => catalog?.query('SELECT 1').get()).toThrow();
  },
);

test('rejects an extra table on the observed Host clone before importing rows', async () => {
  const host = makeHost();
  const mastra = await makeMastra();
  const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
  const exec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
  const setupDatabases = new Set<Database>();
  const observed: { clone?: Database } = {};
  let insertedExtraTable = false;
  const observing = spyOn(Database.prototype, 'query').mockImplementation(function (this: Database, sql: string) {
    if (sql === 'PRAGMA database_list' && !setupDatabases.has(this)) {
      setupDatabases.add(this);
      if (setupDatabases.size === 2) {
        observed.clone = this;
        exec.apply(this, ['CREATE TABLE unexpected_host_clone_fixture(id INTEGER PRIMARY KEY)']);
        insertedExtraTable = true;
      }
    }
    return Reflect.apply(query, this, [sql]);
  } as typeof Database.prototype.query);
  try {
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /cloned Host plus pinned schema closure differs/u,
    );
  } finally {
    observing.mockRestore();
  }
  expect(observed.clone).toBeDefined();
  expect(insertedExtraTable).toBe(true);
  expect(() => observed.clone?.query('SELECT 1').get()).toThrow();
});

test('reports an outer close acknowledgement error after a successful merge and attempts every close', async () => {
  const host = makeHost();
  const mastra = await makeMastra();
  const closeError = new Error('unified target close acknowledgement failed');
  const deserialize = Database.deserialize.bind(Database);
  const exec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
  const close = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  const opened: Database[] = [];
  const targets = new Set<Database>();
  let targetCloseReached = false;
  const opening = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
    const database = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
    opened.push(database);
    return database;
  });
  const executing = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, ...args) {
    const result = exec.apply(this, args);
    if (String(args[0]).includes('CREATE TABLE vida_workspace_storage_migration')) targets.add(this);
    return result;
  });
  const closing = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, ...args) {
    close.apply(this, args);
    if (targets.has(this)) {
      targetCloseReached = true;
      throw closeError;
    }
  });
  let failure: unknown;
  try {
    failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
  } finally {
    closing.mockRestore();
    executing.mockRestore();
    opening.mockRestore();
  }
  expect(targets.size).toBe(1);
  expect(targetCloseReached).toBe(true);
  expect(opened.length).toBeGreaterThan(0);
  expect(failure).toBeInstanceOf(AggregateError);
  if (!(failure instanceof AggregateError)) throw new Error('Expected the close acknowledgement error.');
  expect(failure.message).toBe('existing merge database close failed');
  expect(failure.errors).toEqual([closeError]);
  for (const database of opened) expect(() => database.query('SELECT 1').get()).toThrow();
});

test('rejects an unsupported image binding before opening either SQLite image', async () => {
  const host = makeHost();
  const mastra = await makeMastra();
  const hostBefore = Buffer.from(host.bytes);
  const mastraBefore = Buffer.from(mastra.bytes);
  const opening = spyOn(Database, 'deserialize');
  try {
    await expectRejection(
      Promise.resolve().then(() =>
        callWithUntrustedArguments(prepareUnifiedExistingStorageImage, [
          host,
          mastra,
          {
            ...binding(host, mastra),
            schema: 'VidaExistingStorageMerge/v0',
          },
        ]),
      ),
      /Existing storage merge: unsupported binding/u,
    );
    expect(opening).not.toHaveBeenCalled();
    expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
    expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
  } finally {
    opening.mockRestore();
  }
});

test('preserves strict named bindings and exact integer reads on every prepared SQLite handle', async () => {
  const host = makeHost();
  const mastra = await makeMastra();
  const hostBefore = Buffer.from(host.bytes);
  const mastraBefore = Buffer.from(mastra.bytes);
  const deserialize = Database.deserialize.bind(Database);
  const close = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
  const opened: Database[] = [];
  const probes: { missingBindingError: string | undefined; missingBindingIsNull: boolean; exactInteger: unknown }[] =
    [];
  const closeProbes: { next: () => unknown; all: () => unknown; first: unknown; finalize: () => void }[] = [];
  const closingHandles = new Set<Database>();
  const opening = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
    const database = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
    opened.push(database);
    let missingBindingError: string | undefined;
    let missingBindingIsNull = false;
    try {
      const row = database
        .query<{ message: string | null }, [{ messag: string }]>('SELECT $message AS message')
        .get({ messag: 'x' });
      missingBindingIsNull = row?.message === null;
    } catch (error) {
      missingBindingError = error instanceof Error ? error.message : String(error);
    }
    const exactInteger = database
      .query<{ value: number | bigint }, []>('SELECT 9007199254740993 AS value')
      .get()?.value;
    probes.push({ missingBindingError, missingBindingIsNull, exactInteger });
    return database;
  });
  const closing = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, ...args) {
    if (opened.includes(this) && !closingHandles.has(this)) {
      closingHandles.add(this);
      const statement = this.prepare<{ value: number | bigint }, []>('SELECT 1 AS value UNION ALL SELECT 2 AS value');
      const cursor = statement.iterate();
      const first = cursor.next();
      closeProbes.push({
        next: () => cursor.next(),
        all: () => statement.all(),
        first,
        finalize: () => statement.finalize(),
      });
    }
    return close.apply(this, args);
  });
  try {
    const image = await expectPreparedImage(() =>
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
    );
    expect(image.schema).toBe('VidaUnifiedWorkspaceImage/v1');
    expect(closeProbes).toHaveLength(5);
    for (const probe of closeProbes) {
      expect(probe.first).toEqual({ value: { value: 1n }, done: false });
      expect(probe.next).toThrow('Database has closed');
      expect(probe.all).toThrow('Database has closed');
    }
    for (const database of opened) expect(() => database.query('SELECT 1').get()).toThrow();
  } finally {
    closing.mockRestore();
    opening.mockRestore();
    for (const probe of closeProbes) {
      try {
        probe.finalize();
      } catch {}
    }
    for (const database of opened) {
      try {
        close.call(database, true);
      } catch {}
    }
  }
  expect(probes).toHaveLength(5);
  expect(probes.every((probe) => probe.missingBindingError === 'Missing parameter "message"')).toBe(true);
  expect(probes.every((probe) => !probe.missingBindingIsNull)).toBe(true);
  expect(probes.every((probe) => probe.exactInteger === 9007199254740993n)).toBe(true);
  expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
  expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
});

test('imports an owned Mastra sqlite_sequence row from the serialized Mastra image', async () => {
  const host = makeHost();
  const generatedMastra = await makeMastra();
  const originalBytes = Uint8Array.from(generatedMastra.bytes);
  const mastraDatabase = Database.deserialize(Buffer.from(generatedMastra.bytes), {
    strict: true,
    safeIntegers: true,
  });
  let mastra: ClosedDatabaseImage;
  try {
    mastraDatabase.exec('CREATE TABLE vida_storage_sequence_seed(id INTEGER PRIMARY KEY AUTOINCREMENT)');
    mastraDatabase.query('INSERT INTO vida_storage_sequence_seed DEFAULT VALUES').run();
    mastraDatabase.query('DELETE FROM sqlite_sequence WHERE name=?').run('mastra_threads');
    mastraDatabase
      .query('UPDATE sqlite_sequence SET name=?,seq=? WHERE name=?')
      .run('mastra_threads', 73, 'vida_storage_sequence_seed');
    mastraDatabase.exec('DROP TABLE vida_storage_sequence_seed');
    mastra = closedImage(mastraDatabase);
  } finally {
    mastraDatabase.close(true);
  }
  expect(Buffer.from(generatedMastra.bytes)).toEqual(Buffer.from(originalBytes));
  const serializedMastra = Uint8Array.from(mastra.bytes);
  const image = await expectPreparedImage(() =>
    prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
  );
  expect(image).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: binding(host, mastra) });
  expect(Buffer.from(mastra.bytes)).toEqual(Buffer.from(serializedMastra));
  const merged = openUnified(image.bytes_base64);
  try {
    expect(
      merged.query<{ seq: number | bigint }, []>("SELECT seq FROM sqlite_sequence WHERE name='mastra_threads'").get()
        ?.seq,
    ).toBe(73n);
    expect(
      merged.query<{ id: string }, [string]>('SELECT id FROM mastra_threads WHERE id=?').get('merge-thread-1')?.id,
    ).toBe('merge-thread-1');
  } finally {
    merged.close(true);
  }
});

test.each([false, true])(
  'existing merge closes the first image on second-open failure, cleanup failure=%s',
  async (cleanupFails) => {
    const image = makeHost();
    const primary = new Error('second image open failed');
    const cleanup = new Error('first image close acknowledgement failed');
    const deserialize = Database.deserialize.bind(Database);
    const close = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let opened: Database | undefined;
    let closed = false;
    let opens = 0;
    const opening = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
      if (++opens === 2) throw primary;
      opened = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
      return opened;
    });
    const closing = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, ...args) {
      close.apply(this, args);
      if (this === opened) {
        closed = true;
        if (cleanupFails) throw cleanup;
      }
    });
    try {
      const failure = await rejectionReason(prepareUnifiedExistingStorageImage(image, image, binding(image, image)));
      expect(opens).toBe(2);
      expect(closed).toBe(true);
      if (cleanupFails) {
        expect(failure).toBeInstanceOf(AggregateError);
        if (!(failure instanceof AggregateError)) throw new Error('Expected both retained causes.');
        expect(failure.errors).toEqual([primary, cleanup]);
      } else expect(failure).toBe(primary);
    } finally {
      opening.mockRestore();
      closing.mockRestore();
      if (opened && !closed) opened.close(true);
    }
  },
);

test('existing merge preserves a thrown undefined inspection cause while closing both images', async () => {
  const image = makeHost();
  const deserialize = Database.deserialize.bind(Database);
  const opened: Database[] = [];
  const opening = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
    const database = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
    opened.push(database);
    return database;
  });
  let inspected = false;
  const querying = spyOn(Database.prototype, 'query').mockImplementation(() => {
    inspected = true;
    throw undefined;
  });
  try {
    const failure = await rejectionReason(prepareUnifiedExistingStorageImage(image, image, binding(image, image)));
    expect(inspected).toBe(true);
    expect(opened).toHaveLength(2);
    expect(failure).toBeUndefined();
    querying.mockRestore();
    for (const database of opened) expect(() => database.query('SELECT 1').get()).toThrow();
  } finally {
    querying.mockRestore();
    opening.mockRestore();
    for (const database of opened) database.close(true);
  }
});

function preserveMergeFixture(merged: Database): void {
  const rows = merged
    .query<{ group_id: string; ordinal: number | bigint; body: Uint8Array }, []>(
      'SELECT group_id,ordinal,body FROM merge_sequence_fixture ORDER BY id',
    )
    .all();
  expect(
    rows.map((row) => ({
      group_id: row.group_id,
      ordinal: row.ordinal,
      body_base64: Buffer.from(row.body).toString('base64'),
    })),
  ).toEqual([
    { group_id: 'same-group', ordinal: 9007199254740993n, body_base64: 'AAF/gP8=' },
    { group_id: 'same-group', ordinal: 9007199254740993n, body_base64: 'AAF/gP8=' },
  ]);
  expect(
    merged
      .query<{ seq: number | bigint }, []>("SELECT seq FROM sqlite_sequence WHERE name='merge_sequence_fixture'")
      .get()?.seq,
  ).toBe(9007199254740993n);
  expect(
    merged
      .query<{ seq: number | bigint }, []>(
        "SELECT seq FROM sqlite_sequence WHERE name='merge_sequence_secondary_fixture'",
      )
      .get()?.seq,
  ).toBe(41n);
  expect(merged.query<{ label: string }, []>('SELECT label FROM merge_sequence_secondary_fixture').get()?.label).toBe(
    'secondary-sequence',
  );
  const thread = merged
    .query<{ id: string; title: string; resourceId: string }, [string]>(
      'SELECT id,title,"resourceId" FROM mastra_threads WHERE id=?',
    )
    .get('merge-thread-1');
  expect(thread).toEqual({
    id: 'merge-thread-1',
    title: 'merge preservation fixture',
    resourceId: 'merge-resource-1',
  });
}

function materializeClosedWalImage(root: string, name: string, source: ClosedDatabaseImage): ClosedDatabaseImage {
  const file = path.join(root, name);
  writeFileSync(file, source.bytes, { flag: 'wx' });
  const database = new Database(file, { create: false, strict: true, safeIntegers: true });
  try {
    const journal = database.query<{ journal_mode: string }, []>('PRAGMA journal_mode=WAL').get();
    expect(journal?.journal_mode.toLowerCase()).toBe('wal');
    const checkpoint = database
      .query<{ busy: number | bigint; log: number | bigint; checkpointed: number | bigint }, []>(
        'PRAGMA wal_checkpoint(TRUNCATE)',
      )
      .get();
    expect(checkpoint).not.toBeNull();
    if (checkpoint === null) throw new Error('WAL checkpoint returned no row');
    expect(BigInt(checkpoint.busy)).toBe(0n);
    expect(BigInt(checkpoint.checkpointed)).toBe(BigInt(checkpoint.log));
  } finally {
    database.close();
  }
  const bytes = readFileSync(file);
  expect(bytes[18]).toBe(2);
  expect(bytes[19]).toBe(2);
  for (const suffix of ['-wal', '-shm', '-journal']) expect(existsSync(file + suffix)).toBe(false);
  const info = statSync(file, { bigint: true });
  return {
    device: String(info.dev),
    inode: String(info.ino),
    size: bytes.byteLength,
    sha256: sha256(bytes),
    bytes: Uint8Array.from(bytes),
  };
}

async function assertWalImageMerge(walHost: boolean, walMastra: boolean): Promise<void> {
  const root = mkdtempSync(path.join(tmpdir(), 'existing-storage-wal-'));
  let passed = false;
  try {
    const originalHost = makeHost();
    const originalMastra = await makeMastra();
    const host = walHost ? materializeClosedWalImage(root, 'host.sqlite', originalHost) : originalHost;
    const mastra = walMastra ? materializeClosedWalImage(root, 'mastra.sqlite', originalMastra) : originalMastra;
    const hostBytes = Uint8Array.from(host.bytes);
    const mastraBytes = Uint8Array.from(mastra.bytes);
    const hostDigest = sha256(hostBytes);
    const mastraDigest = sha256(mastraBytes);
    const expectedBinding = binding(host, mastra);
    const image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));

    expect(image.schema).toBe('VidaUnifiedWorkspaceImage/v1');
    expect(image.binding).toEqual(expectedBinding);
    expect(image.binding.source_host_digest).toBe(hostDigest);
    expect(image.binding.source_mastra_digest).toBe(mastraDigest);
    expect(host.sha256).toBe(hostDigest);
    expect(mastra.sha256).toBe(mastraDigest);
    expect(Buffer.from(host.bytes).equals(Buffer.from(hostBytes))).toBe(true);
    expect(Buffer.from(mastra.bytes).equals(Buffer.from(mastraBytes))).toBe(true);
    if (walHost)
      expect(Buffer.from(readFileSync(path.join(root, 'host.sqlite'))).equals(Buffer.from(hostBytes))).toBe(true);
    if (walMastra)
      expect(Buffer.from(readFileSync(path.join(root, 'mastra.sqlite'))).equals(Buffer.from(mastraBytes))).toBe(true);

    const merged = openUnified(image.bytes_base64);
    try {
      preserveMergeFixture(merged);
    } finally {
      merged.close(true);
    }
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained failed WAL merge fixture: ${root}`);
  }
}

describe('existing storage image preparation', () => {
  test.each(
    (
      [
        ['Host', 3, 3],
        ['Mastra', 3, 3],
        ['Host', 2, 3],
        ['Mastra', 2, 3],
      ] as const
    ).map(
      ([label, writeVersion, readVersion]) =>
        [`${label} ${writeVersion}/${readVersion}`, label, writeVersion, readVersion] as const,
    ),
  )(
    'rejects malformed SQLite journal versions %s without rewriting either source image',
    async (_scenario, label, writeVersion, readVersion) => {
      const originalHost = makeHost();
      const originalMastra = await makeMastra();
      const original = label === 'Host' ? originalHost : originalMastra;
      const bytes = Buffer.from(original.bytes);
      bytes[18] = writeVersion;
      bytes[19] = readVersion;
      const malformed = { ...original, bytes, sha256: sha256(bytes) };
      const host = label === 'Host' ? malformed : originalHost;
      const mastra = label === 'Mastra' ? malformed : originalMastra;
      const hostBefore = Buffer.from(host.bytes);
      const mastraBefore = Buffer.from(mastra.bytes);
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
        /file is not a database/u,
      );
      expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
      expect(host.sha256).toBe(sha256(hostBefore));
      expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
      expect(mastra.sha256).toBe(sha256(mastraBefore));
    },
  );

  test.each([
    ['Host', 'source_host_digest'],
    ['Mastra', 'source_mastra_digest'],
  ] as const)('rejects a %s source binding mismatch before opening either SQLite image', async (label, field) => {
    const host = makeHost();
    const mastra = await makeMastra();
    const opening = spyOn(Database, 'deserialize');
    try {
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, { ...binding(host, mastra), [field]: '0'.repeat(64) }),
        new RegExp(label + ' source binding differs', 'u'),
      );
      expect(opening).not.toHaveBeenCalled();
    } finally {
      opening.mockRestore();
    }
  });

  test('preserves source rows including duplicate values, exact BLOBs, large integers, and AUTOINCREMENT sequence', async () => {
    const host = makeHost();
    const mastra = await makeMastra();
    const expectedBinding = binding(host, mastra);
    const image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));

    expect(image).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: expectedBinding });
    expect(image.schema).toBe('VidaUnifiedWorkspaceImage/v1');
    expect(image.binding).toEqual(expectedBinding);
    expect(image.size).toBeGreaterThan(0);
    expect(image.sha256).toBe(sha256(Buffer.from(image.bytes_base64, 'base64')));
    expect(image.host_rows_digest).toMatch(/^[0-9a-f]{64}$/u);
    expect(image.mastra_rows_digest).toMatch(/^[0-9a-f]{64}$/u);
    expect(image.schema_digest).toMatch(/^[0-9a-f]{64}$/u);

    const merged = openUnified(image.bytes_base64);
    try {
      preserveMergeFixture(merged);
      const migrationRows = merged
        .query<{ id: number | bigint; payload: string; digest: string }, []>(
          'SELECT id,payload,digest FROM vida_workspace_storage_migration',
        )
        .all();
      expect(migrationRows).toHaveLength(1);
      const migrationRow = migrationRows[0];
      expect(migrationRow).toBeDefined();
      if (migrationRow === undefined) throw new Error('expected one migration ledger row');
      expect(migrationRow.id).toBe(1n);
      const expectedMigrationPayload = canonicalize({
        ...expectedBinding,
        host_rows_digest: image.host_rows_digest,
        mastra_rows_digest: image.mastra_rows_digest,
      });
      if (expectedMigrationPayload === undefined)
        throw new Error('expected migration ledger payload could not be canonicalized');
      expect(migrationRow.payload).toBe(expectedMigrationPayload);
      expect(migrationRow.digest).toBe(sha256(Buffer.from(expectedMigrationPayload, 'utf8')));
      const schema = merged
        .query<{ type: string; name: string; table_name: string; sql: string | null }, []>(
          'SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master ' +
            "WHERE name NOT GLOB 'sqlite_*' ORDER BY type,name",
        )
        .all();
      const serializedSchema = canonicalize(schema);
      if (serializedSchema === undefined) throw new Error('reopened unified schema could not be canonicalized');
      expect(image.schema_digest).toBe(sha256(Buffer.from(serializedSchema, 'utf8')));
    } finally {
      merged.close(true);
    }
  });

  test('distinguishes Host row digests when only a large integer value changes', async () => {
    const firstHost = makeHost();
    const changedDatabase = Database.deserialize(Buffer.from(firstHost.bytes), { strict: true, safeIntegers: true });
    let secondHost: ClosedDatabaseImage;
    try {
      changedDatabase.query('UPDATE merge_sequence_fixture SET ordinal=? WHERE id=1').run(9007199254740997n);
      secondHost = closedImage(changedDatabase);
    } finally {
      changedDatabase.close(true);
    }
    const mastra = await makeMastra();
    const first = await expectPreparedImage(() =>
      prepareUnifiedExistingStorageImage(firstHost, mastra, binding(firstHost, mastra)),
    );
    const second = await expectPreparedImage(() =>
      prepareUnifiedExistingStorageImage(secondHost, mastra, binding(secondHost, mastra)),
    );

    expect(firstHost.sha256).not.toBe(secondHost.sha256);
    expect(first.host_rows_digest).not.toBe(second.host_rows_digest);
    for (const [image, expectedOrdinal] of [
      [first, 9007199254740993n],
      [second, 9007199254740997n],
    ] as const) {
      const merged = openUnified(image.bytes_base64);
      try {
        const row = merged
          .query<{ ordinal: number | bigint }, []>('SELECT ordinal FROM merge_sequence_fixture WHERE id=1')
          .get();
        expect(row?.ordinal).toBe(expectedOrdinal);
      } finally {
        merged.close(true);
      }
    }
  });

  test('preserves the same Host logical rows across different physical insertion orders', async () => {
    const forwardHost = makeHostWithLogicalInsertionOrder(false);
    const reverseHost = makeHostWithLogicalInsertionOrder(true);
    const mastra = await makeMastra();
    const canonicalHostRows = canonicalize([
      {
        name: 'logical_order_fixture',
        columns: ['key', 'value'],
        rows: ['["alpha","first"]', '["bravo","second"]', '["charlie","third"]'].sort(),
      },
    ]);
    if (canonicalHostRows === undefined) throw new Error('logical Host fixture could not be canonicalized');
    const expectedHostRowsDigest = sha256(Buffer.from(canonicalHostRows, 'utf8'));
    expect(forwardHost.sha256).not.toBe(reverseHost.sha256);
    const forwardBinding = binding(forwardHost, mastra);
    const reverseBinding = binding(reverseHost, mastra);
    const forward = await expectPreparedImage(() =>
      prepareUnifiedExistingStorageImage(forwardHost, mastra, forwardBinding),
    );
    const reverse = await expectPreparedImage(() =>
      prepareUnifiedExistingStorageImage(reverseHost, mastra, reverseBinding),
    );

    expect(forward).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: forwardBinding });
    expect(reverse).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: reverseBinding });
    expect(forward.host_rows_digest).toBe(expectedHostRowsDigest);
    expect(reverse.host_rows_digest).toBe(expectedHostRowsDigest);
    expect(forward.schema_digest).toBe(reverse.schema_digest);
    expect(forward.binding.source_host_digest).toBe(forwardHost.sha256);
    expect(reverse.binding.source_host_digest).toBe(reverseHost.sha256);
    for (const image of [forward, reverse]) {
      const merged = openUnified(image.bytes_base64);
      try {
        expect(
          merged
            .query<{ key: string; value: string }, []>('SELECT key,value FROM logical_order_fixture ORDER BY key')
            .all(),
        ).toEqual([
          { key: 'alpha', value: 'first' },
          { key: 'bravo', value: 'second' },
          { key: 'charlie', value: 'third' },
        ]);
      } finally {
        merged.close(true);
      }
    }
  });

  test('preserves Host tables whose names start with sqlite plus a non-underscore character', async () => {
    const names = ['sqliteXledger', 'SQLiteXarchive', 'merge_quote"fixture'] as const;
    const selectNamesSql =
      "SELECT type,name FROM sqlite_master WHERE type='table' AND name IN (" +
      names.map(() => '?').join(',') +
      ') ORDER BY name';
    const expectedTables = names
      .map((name) => ({ type: 'table', name }))
      .sort((left, right) => Buffer.compare(Buffer.from(left.name), Buffer.from(right.name)));
    const database = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    try {
      for (const [index, name] of names.entries()) {
        const quoted = '"' + name.replaceAll('"', '""') + '"';
        database.exec('CREATE TABLE ' + quoted + '(id TEXT PRIMARY KEY, payload TEXT NOT NULL)');
        database.query('INSERT INTO ' + quoted + '(id,payload) VALUES(?,?)').run('row-' + index, 'kept-' + name);
      }
      expect(database.query<{ type: string; name: string }, string[]>(selectNamesSql).all(...names)).toEqual(
        expectedTables,
      );
      expect(database.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
      host = closedImage(database);
    } finally {
      database.close(true);
    }

    const mastra = await makeMastra();
    const expectedBinding = binding(host, mastra);
    const image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));
    expect(image).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: expectedBinding });
    const merged = openUnified(image.bytes_base64);
    try {
      expect(merged.query<{ type: string; name: string }, string[]>(selectNamesSql).all(...names)).toEqual(
        expectedTables,
      );
      for (const [index, name] of names.entries()) {
        const quoted = '"' + name.replaceAll('"', '""') + '"';
        expect(merged.query('SELECT id,payload FROM ' + quoted).values()).toEqual([['row-' + index, 'kept-' + name]]);
      }
      expect(merged.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
    } finally {
      merged.close(true);
    }
  });

  test.each(['UTF-8', 'UTF-16le', 'UTF-16be'] as const)(
    'preserves native %s Host schema ordering and Unicode table rows',
    async (encoding) => {
      const database = new Database(':memory:', { strict: true, safeIntegers: true });
      let host: ClosedDatabaseImage;
      try {
        database.exec("PRAGMA encoding='" + encoding + "'");
        initializeHostDatabaseSchema(database);
        database.exec('CREATE TABLE "xÿ"(payload TEXT NOT NULL); CREATE TABLE "xĀ"(payload TEXT NOT NULL)');
        database.query('INSERT INTO "xÿ" VALUES(?)').run('first Unicode row');
        database.query('INSERT INTO "xĀ" VALUES(?)').run('second Unicode row');
        expect(database.query('PRAGMA encoding').values()).toEqual([[encoding]]);
        host = closedImage(database);
      } finally {
        database.close(true);
      }
      const mastra = await makeMastra();
      const image = await expectPreparedImage(() =>
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      );
      const merged = openUnified(image.bytes_base64);
      try {
        expect(merged.query('PRAGMA encoding').values()).toEqual([[encoding]]);
        expect(merged.query('SELECT payload FROM "xÿ"').values()).toEqual([['first Unicode row']]);
        expect(merged.query('SELECT payload FROM "xĀ"').values()).toEqual([['second Unicode row']]);
        expect(merged.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
      } finally {
        merged.close(true);
      }
    },
  );

  test('rejects unsupported native schema encoding without changing either input image', async () => {
    const host = makeHost();
    const mastra = await makeMastra();
    const hostBefore = Buffer.from(host.bytes);
    const mastraBefore = Buffer.from(mastra.bytes);
    const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const faultyEncodingQuery = function (this: Database, sql: string) {
      const statement = Reflect.apply(query, this, [sql]);
      if (sql !== 'PRAGMA encoding') return statement;
      return new Proxy(statement, {
        get(target, property) {
          if (property === 'get') return () => ({ encoding: 'UTF-32' });
          const original: unknown = Reflect.get(target, property, target);
          return original;
        },
      });
    };
    const encodingFault = spyOn(Database.prototype, 'query').mockImplementation(
      faultyEncodingQuery as typeof Database.prototype.query,
    );
    try {
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
        /SQLite schema encoding is unsupported/u,
      );
    } finally {
      encodingFault.mockRestore();
    }
    expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
    expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
    const healthy = await expectPreparedImage(() =>
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
    );
    expect(healthy.schema).toBe('VidaUnifiedWorkspaceImage/v1');
  });

  test.each([
    [
      'a missing input integrity row',
      'PRAGMA integrity_check',
      'get',
      null,
      1,
      'Existing storage merge: an input image fails integrity_check',
      false,
    ],
    [
      'a missing service custody count row',
      'SELECT COUNT(*) AS count FROM agent_host_service_operation_custody',
      'get',
      null,
      2,
      'Existing storage merge: new service custody table contains operational rows',
      true,
    ],
    [
      'a missing Host table count row',
      'SELECT COUNT(*) AS count FROM "agent_host_state"',
      'get',
      null,
      1,
      'Existing storage merge: table count unavailable: agent_host_state',
      false,
    ],
    [
      'an empty Host table_xinfo result',
      'PRAGMA table_xinfo("agent_host_state")',
      'all',
      [],
      1,
      'Existing storage merge: table has no columns: agent_host_state',
      false,
    ],
    [
      'an empty Mastra insertable table_xinfo result',
      'PRAGMA table_xinfo("mastra_threads")',
      'all',
      [],
      2,
      'Existing storage merge: table has no insertable columns: mastra_threads',
      false,
    ],
    [
      'a missing target encoding row',
      'PRAGMA encoding',
      'get',
      null,
      1,
      'Existing storage merge: SQLite schema encoding is unsupported',
      false,
    ],
  ] as const)(
    'fails closed and closes owned databases for %s without changing either input image',
    async (_label, faultSql, faultMethod, faultValue, faultOccurrence, expectedMessage, targetOnly) => {
      const host = makeHost();
      const mastra = await makeMastra();
      const hostBefore = Buffer.from(host.bytes);
      const mastraBefore = Buffer.from(mastra.bytes);
      const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
      const deserialize = Database.deserialize.bind(Database);
      const opened = new Set<Database>();
      let finalTarget: Database | undefined;
      const occurrences = new Map<Database, number>();
      const faultDatabases = new Set<Database>();
      let faultReached = false;
      const locatingDatabases = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
        const database = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
        opened.add(database);
        if (opened.size === 5) finalTarget = database;
        return database;
      });
      const injectingMissingRow = spyOn(Database.prototype, 'query').mockImplementation(function (
        this: Database,
        sql: string,
      ) {
        const statement = Reflect.apply(query, this, [sql]);
        if (sql !== faultSql || (targetOnly && this !== finalTarget)) return statement;
        const occurrence = (occurrences.get(this) ?? 0) + 1;
        occurrences.set(this, occurrence);
        if (occurrence !== faultOccurrence) return statement;
        faultDatabases.add(this);
        faultReached = true;
        return new Proxy(statement, {
          get(target, property) {
            if (property === faultMethod) return () => faultValue;
            return nativeStatementMember(target, property);
          },
        });
      } as typeof Database.prototype.query);
      try {
        const failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
        expect(faultReached).toBe(true);
        expect(faultDatabases.size).toBe(1);
        expect([...faultDatabases].every((database) => opened.has(database))).toBe(true);
        expect(failure).toBeInstanceOf(Error);
        expect((failure as Error).message).toBe(expectedMessage);
        expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
        expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
        expect(opened.size).toBeGreaterThan(0);
        for (const database of opened) expect(() => database.query('SELECT 1').get()).toThrow();
      } finally {
        injectingMissingRow.mockRestore();
        locatingDatabases.mockRestore();
        for (const database of opened) {
          try {
            database.close(true);
          } catch {}
        }
      }
    },
  );

  test('ignores dependency-injected hidden table_xinfo columns in Host digest and Mastra import', async () => {
    const host = makeHost();
    const mastra = await makeMastra();
    const hostBefore = Buffer.from(host.bytes);
    const mastraBefore = Buffer.from(mastra.bytes);
    const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const deserialize = Database.deserialize.bind(Database);
    const occurrences = new Map<Database, number>();
    const observed = { hostHiddenRow: 0, mastraImportHiddenRows: 0 };
    let sourceHost: Database | undefined;
    let sourceMastra: Database | undefined;
    let readonlyInputs = 0;
    const locatingInputs = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
      const database = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
      if (typeof options !== 'boolean' && options?.readonly === true) {
        readonlyInputs++;
        if (readonlyInputs === 1) sourceHost = database;
        if (readonlyInputs === 2) sourceMastra = database;
      }
      return database;
    });
    const injectingHiddenColumns = spyOn(Database.prototype, 'query').mockImplementation(function (
      this: Database,
      sql: string,
    ) {
      const statement = Reflect.apply(query, this, [sql]);
      let injected: { readonly name: string; readonly hidden: number }[] | undefined;
      if (this === sourceHost && sql === 'PRAGMA table_xinfo("agent_host_state")') {
        observed.hostHiddenRow++;
        injected = [{ name: '__injected_hidden_host_column__', hidden: 1 }];
      } else if (this === sourceMastra && sql === 'PRAGMA table_xinfo("mastra_threads")') {
        const occurrence = (occurrences.get(this) ?? 0) + 1;
        occurrences.set(this, occurrence);
        if (occurrence === 2) {
          observed.mastraImportHiddenRows++;
          injected = [1, 2, 3].map((hidden) => ({
            name: '__injected_hidden_mastra_column_' + hidden + '__',
            hidden,
          }));
        }
      }
      if (injected === undefined) return statement;
      const extraRows = injected;
      return new Proxy(statement, {
        get(target, property) {
          if (property === 'all')
            return (...args: unknown[]) => {
              const nativeAll = nativeStatementMember(target, property) as (...values: unknown[]) => unknown;
              const rows = nativeAll(...args);
              if (!Array.isArray(rows)) throw new Error('Native table_xinfo result is not an array');
              const nativeRows: readonly unknown[] = rows;
              return [...nativeRows, ...extraRows];
            };
          return nativeStatementMember(target, property);
        },
      });
    } as typeof Database.prototype.query);
    let image: Awaited<ReturnType<PrepareUnifiedExistingStorageImage>>;
    try {
      image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
    } finally {
      injectingHiddenColumns.mockRestore();
      locatingInputs.mockRestore();
    }
    expect(observed.hostHiddenRow).toBe(1);
    expect(observed.mastraImportHiddenRows).toBe(1);
    expect(occurrences.get(sourceMastra as Database)).toBe(2);
    expect(image).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: binding(host, mastra) });
    expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
    expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
    const merged = openUnified(image.bytes_base64);
    try {
      expect(
        merged.query<{ id: string }, [string]>('SELECT id FROM mastra_threads WHERE id=?').get('merge-thread-1'),
      ).toEqual({ id: 'merge-thread-1' });
      expect(merged.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
    } finally {
      merged.close(true);
    }
  });

  test('accepts a healthy Host schema above sixteen objects within the supported bounds', async () => {
    const database = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    try {
      database.exec(
        Array.from(
          { length: 20 },
          (_, index) =>
            'CREATE INDEX merge_capacity_fixture_index_' +
            String(index).padStart(2, '0') +
            ' ON merge_sequence_fixture(group_id)',
        ).join(';'),
      );
      host = closedImage(database);
    } finally {
      database.close(true);
    }
    const mastra = await makeMastra();
    const expectedBinding = binding(host, mastra);
    const image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));
    expect(image).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: expectedBinding });
    const merged = openUnified(image.bytes_base64);
    try {
      const schemaObjectCount = merged
        .query<{ count: number | bigint }, []>(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'",
        )
        .get()?.count;
      expect(schemaObjectCount).toBeDefined();
      expect(Number(schemaObjectCount)).toBeGreaterThan(16);
      expect(Number(schemaObjectCount)).toBeLessThanOrEqual(1024);
      expect(
        merged
          .query<{ count: number | bigint }, []>(
            "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='index' AND name GLOB 'merge_capacity_fixture_index_*'",
          )
          .get()?.count,
      ).toBe(20n);
      preserveMergeFixture(merged);
    } finally {
      merged.close(true);
    }
  });

  test('accepts exactly 1024 input schema objects and preserves the added views', async () => {
    const database = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    let expectedViewCount = 0n;
    try {
      const initialCount = database
        .query<{ count: number | bigint }, []>(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'",
        )
        .get()?.count;
      if (initialCount === undefined) throw new Error('Host schema object count is unavailable');
      const missingObjects = 1024 - Number(initialCount);
      if (!Number.isInteger(missingObjects) || missingObjects <= 0)
        throw new Error('Host fixture does not leave room for the 1024-object boundary');
      database.transaction(() => {
        for (let index = 0; index < missingObjects; index++) {
          database.exec(
            'CREATE VIEW merge_capacity_boundary_' +
              String(index).padStart(4, '0') +
              ' AS SELECT group_id FROM merge_sequence_fixture',
          );
        }
      })();
      const schemaCount = database
        .query<{ count: number | bigint }, []>(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'",
        )
        .get()?.count;
      expect(schemaCount).toBe(1024n);
      expectedViewCount = BigInt(missingObjects);
      host = closedImage(database);
    } finally {
      database.close(true);
    }
    const mastra = await makeMastra();
    expect(host.size).toBeLessThan(4 * 1024 * 1024);
    expect(mastra.size).toBeLessThan(4 * 1024 * 1024);
    const expectedBinding = binding(host, mastra);
    const image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));
    expect(image.schema).toBe('VidaUnifiedWorkspaceImage/v1');
    expect(image.binding).toEqual(expectedBinding);
    expect(image.size).toBeLessThan(4 * 1024 * 1024);
    const merged = openUnified(image.bytes_base64);
    try {
      const boundaryViews = merged
        .query<{ count: number | bigint }, []>(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='view' AND name GLOB 'merge_capacity_boundary_*'",
        )
        .get()?.count;
      expect(boundaryViews).toBe(expectedViewCount);
      expect(
        merged
          .query<{ group_id: string }, []>('SELECT group_id FROM merge_capacity_boundary_0000 ORDER BY group_id')
          .all(),
      ).toEqual([{ group_id: 'same-group' }, { group_id: 'same-group' }]);
      expect(merged.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
    } finally {
      merged.close(true);
    }
  });

  test.each(['unplanned_mastra_fixture', 'sqliteXledger', 'SQLiteXarchive'] as const)(
    'rejects a valid Mastra image containing unplanned table %s without changing its source bytes',
    async (tableName) => {
      const initializedMastra = await makeMastra();
      const database = Database.deserialize(Buffer.from(initializedMastra.bytes), { strict: true, safeIntegers: true });
      let mastra: ClosedDatabaseImage;
      try {
        const quoted = '"' + tableName.replaceAll('"', '""') + '"';
        database.exec('CREATE TABLE ' + quoted + '(id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
        database.query('INSERT INTO ' + quoted + '(id,value) VALUES(?,?)').run(1, 'unplanned sentinel');
        expect(
          database
            .query<{ type: string; name: string }, [string]>(
              "SELECT type,name FROM sqlite_master WHERE type='table' AND name=?",
            )
            .all(tableName),
        ).toEqual([{ type: 'table', name: tableName }]);
        expect(database.query('SELECT id,value FROM ' + quoted).values()).toEqual([[1n, 'unplanned sentinel']]);
        expect(database.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
        mastra = closedImage(database);
      } finally {
        database.close(true);
      }
      const host = makeHost();
      const originalBytes = Buffer.from(mastra.bytes);
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
        /Mastra schema differs from pinned empty-init inventory/u,
      );
      expect(Buffer.from(mastra.bytes).equals(originalBytes)).toBe(true);
    },
  );

  test('rejects a valid but empty Mastra database image before comparing it with the pinned inventory', async () => {
    const database = new Database(':memory:', { strict: true, safeIntegers: true });
    let mastra: ClosedDatabaseImage;
    try {
      database.exec('VACUUM');
      const tableCount = database
        .query<{ count: number | bigint }, []>(
          "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*'",
        )
        .get()?.count;
      expect(tableCount).toBe(0n);
      mastra = closedImage(database);
    } finally {
      database.close(true);
    }
    const host = makeHost();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /Mastra schema is empty/u,
    );
  });

  test.each([
    [
      'extra target table',
      'CREATE TABLE unexpected_private_target_fixture(id INTEGER PRIMARY KEY)',
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='unexpected_private_target_fixture'",
      1n,
      /Host schema changed during merge/u,
    ],
    [
      'missing custody table',
      'DROP TABLE agent_host_service_operation_custody',
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='agent_host_service_operation_custody'",
      0n,
      /Service operation custody: owned service table is absent or differs/u,
    ],
    [
      'changed ID sequence',
      "UPDATE sqlite_sequence SET seq=seq+1 WHERE name='merge_sequence_fixture'",
      "SELECT seq AS count FROM sqlite_sequence WHERE name='merge_sequence_fixture'",
      9007199254740994n,
      /Host and Mastra ID sequences changed during merge/u,
    ],
  ] as const)(
    'rejects %s on the owned private target after the cloned-schema check',
    async (_label, mutationSql, observationSql, expectedCount, diagnostic) => {
      const host = makeHost();
      const mastra = await makeMastra();
      const exec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
      const observed: { target?: Database } = {};
      let changedState: number | bigint | undefined;
      const mutating = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, ...args) {
        const result = exec.apply(this, args);
        if (String(args[0]).includes('CREATE TABLE vida_workspace_storage_migration')) {
          observed.target = this;
          exec.apply(this, [mutationSql]);
          changedState = this.query<{ count: number | bigint }, []>(observationSql).get()?.count;
        }
        return result;
      });
      try {
        await expectRejection(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)), diagnostic);
      } finally {
        mutating.mockRestore();
      }
      expect(observed.target).toBeDefined();
      expect(changedState).toBe(expectedCount);
      expect(() => observed.target?.query('SELECT 1').get()).toThrow();
    },
  );

  test.each([
    ['Host', /Host logical rows changed during merge/u],
    ['Mastra', /Mastra logical rows differ after import/u],
    ['new service custody', /new service custody table contains operational rows/u],
  ] as const)(
    'rejects %s state changed or seeded in the private target before returning the unified image',
    async (label, diagnostic) => {
      const host = makeHost();
      const mastra = await makeMastra();
      const exec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
      const observed: { target?: Database } = {};
      let changedRows = 0;
      const mutating = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, ...args) {
        const result = exec.apply(this, args);
        if (String(args[0]).includes('CREATE TABLE vida_workspace_storage_migration')) {
          observed.target = this;
          changedRows =
            label === 'Host'
              ? this.query('UPDATE merge_sequence_fixture SET body=? WHERE id=1').run(Buffer.from([9, 8, 7])).changes
              : label === 'Mastra'
                ? this.query('UPDATE mastra_threads SET title=? WHERE id=?').run(
                    'changed inside private merge target',
                    'merge-thread-1',
                  ).changes
                : this.query(
                    "INSERT INTO agent_host_service_operation_custody(workspace_id,owner_kind,operation_id,request_digest,revision,phase,evidence_digest) VALUES(?,'release-pack-worker',?,?,1,'prepared',?)",
                  ).run('e'.repeat(64), 'merge-fixture-operation', 'f'.repeat(64), 'a'.repeat(64)).changes;
        }
        return result;
      });
      try {
        await expectRejection(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)), diagnostic);
      } finally {
        mutating.mockRestore();
      }
      expect(observed.target).toBeDefined();
      expect(changedRows).toBe(1);
      expect(() => observed.target?.query('SELECT 1').get()).toThrow();
    },
  );

  test.each([
    ['body and finalize failures', true, true, 'undefined'],
    ['finalize failure only', false, true, 'undefined'],
    ['body failure only', true, false, 'undefined'],
    ['body Error and finalize failures', true, true, 'error'],
    ['body Error only', true, false, 'error'],
  ] as const)('retains Mastra import causes for %s', async (_label, failRowRead, failFinalize, bodyFailure) => {
    const host = makeHost();
    const mastra = await makeMastra();
    const mastraBytes = Buffer.from(mastra.bytes);
    const bodyError: unknown = bodyFailure === 'error' ? new Error('Mastra row import body failure') : undefined;
    const finalizeError = new Error('Mastra import statement finalization failed');
    const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const deserialize = Database.deserialize.bind(Database);
    let sourceMastra: Database | undefined;
    let awaitingThreadInsert = false;
    let threadInsertPrepared = false;
    let targetStatementFinalized = false;
    let rowReadReached = false;
    let rowsRead = 0;
    const observed: { target?: Database } = {};
    const locatingMastra = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
      const database = typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
      if (typeof options !== 'boolean' && options?.readonly === true && serializedBytesEqual(bytes, mastraBytes))
        sourceMastra = database;
      return database;
    });
    const interceptingStatements = spyOn(Database.prototype, 'query').mockImplementation(function (
      this: Database,
      sql: string,
    ) {
      if (this === sourceMastra && sql === 'PRAGMA table_xinfo("mastra_threads")') awaitingThreadInsert = true;
      if (this === sourceMastra && awaitingThreadInsert && sql.startsWith('SELECT ')) awaitingThreadInsert = false;
      const statement = Reflect.apply(query, this, [sql]);
      if (this !== sourceMastra && awaitingThreadInsert && sql.startsWith('INSERT INTO "mastra_threads"')) {
        awaitingThreadInsert = false;
        threadInsertPrepared = true;
        observed.target = this;
        return new Proxy(statement, {
          get(target, property) {
            if (property === 'finalize')
              return (...args: unknown[]) => {
                Reflect.apply(Reflect.get(target, property, target), target, args);
                targetStatementFinalized = true;
                if (failFinalize) throw finalizeError;
              };
            return nativeStatementMember(target, property);
          },
        }) as ReturnType<typeof query>;
      }
      if (
        this === sourceMastra &&
        threadInsertPrepared &&
        sql.startsWith('SELECT ') &&
        sql.includes(' FROM "mastra_threads"')
      )
        return new Proxy(statement, {
          get(target, property) {
            if (property === 'values')
              return (...args: unknown[]) => {
                const rows: unknown = Reflect.apply(Reflect.get(target, property, target), target, args);
                rowsRead = Array.isArray(rows) ? rows.length : 0;
                rowReadReached = true;
                if (failRowRead) throw bodyError;
                return rows;
              };
            return nativeStatementMember(target, property);
          },
        }) as ReturnType<typeof query>;
      return statement;
    } as typeof Database.prototype.query);
    let failure: unknown;
    try {
      failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
    } finally {
      interceptingStatements.mockRestore();
      locatingMastra.mockRestore();
    }
    expect(sourceMastra).toBeDefined();
    expect(threadInsertPrepared).toBe(true);
    expect(rowReadReached).toBe(true);
    expect(rowsRead).toBeGreaterThan(0);
    expect(targetStatementFinalized).toBe(true);
    expect(observed.target).toBeDefined();
    if (failRowRead && failFinalize) {
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error('Expected the row-read and finalization causes.');
      expect(failure.errors).toHaveLength(2);
      expect(failure.message).toBe('Mastra row import and statement finalize failed');
      expect(failure.errors[0]).toBe(bodyError);
      expect(failure.errors[1]).toBe(finalizeError);
    } else expect(failure).toBe(failRowRead ? bodyError : finalizeError);
    expect(() => observed.target?.query('SELECT 1').get()).toThrow();
  });

  test('normalizes a WAL Host image copy while binding unchanged raw bytes', async () => {
    await assertWalImageMerge(true, false);
  });

  test('normalizes a WAL Mastra image copy while binding unchanged raw bytes', async () => {
    await assertWalImageMerge(false, true);
  });

  test('normalizes both WAL image copies while binding unchanged raw bytes', async () => {
    await assertWalImageMerge(true, true);
  });

  test.each(['Host', 'Mastra'] as const)(
    'accepts a readable %s 2/1 header without changing either input image',
    async (label) => {
      const host = makeHost();
      const mastra = await makeMastra();
      const original = label === 'Host' ? host : mastra;
      const bytes = Buffer.from(original.bytes);
      bytes[18] = 2;
      bytes[19] = 1;
      const readable = { ...original, bytes, sha256: sha256(bytes) };
      const selectedHost = label === 'Host' ? readable : host;
      const selectedMastra = label === 'Mastra' ? readable : mastra;
      const hostBefore = Buffer.from(selectedHost.bytes);
      const mastraBefore = Buffer.from(selectedMastra.bytes);
      const image = await expectPreparedImage(() =>
        prepareUnifiedExistingStorageImage(selectedHost, selectedMastra, binding(selectedHost, selectedMastra)),
      );
      expect(image.binding).toEqual(binding(selectedHost, selectedMastra));
      expect(Buffer.from(selectedHost.bytes).equals(hostBefore)).toBe(true);
      expect(Buffer.from(selectedMastra.bytes).equals(mastraBefore)).toBe(true);
      const merged = openUnified(image.bytes_base64);
      try {
        expect(merged.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
      } finally {
        merged.close(true);
      }
    },
  );

  test.each([
    ['fractional REAL', 1.5],
    ['unsafe Number integer', 9007199254740992],
    ['text value', '9007199254740993'],
  ] as const)(
    'rejects a %s sqlite_sequence value through the public image preparation API',
    async (_label, sequenceValue) => {
      const host = makeHost(sequenceValue);
      const mastra = await makeMastra();
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
        /SQLite integer is not safely representable/u,
      );
    },
  );

  test('rejects a Host table name colliding with the initialized pinned Mastra schema', async () => {
    const mastra = await makeMastra();
    const mastraDb = Database.deserialize(Buffer.from(mastra.bytes), {
      readonly: true,
      strict: true,
      safeIntegers: true,
    });
    let collisionName: string;
    try {
      collisionName =
        mastraDb
          .query<{ name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' ORDER BY name LIMIT 1",
          )
          .get()?.name ?? '';
    } finally {
      mastraDb.close(true);
    }
    if (!collisionName) throw new Error('initialized Mastra schema has no table to use for collision fixture');
    const database = new Database(':memory:', { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    try {
      initializeHostDatabaseSchema(database);
      database.exec('CREATE TABLE "' + collisionName.replaceAll('"', '""') + '"(fixture_id TEXT)');
      host = closedImage(database);
    } finally {
      database.close(true);
    }
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /Host\/Mastra schema name collision/u,
    );
  });

  test('rejects a Host schema using the reserved migration sentinel name', async () => {
    const database = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    try {
      database.exec('CREATE TABLE vida_workspace_storage_migration(id INTEGER PRIMARY KEY)');
      host = closedImage(database);
    } finally {
      database.close(true);
    }
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /Host already uses the migration sentinel name/u,
    );
  });

  test('accepts a real 4 MiB Host image and reuses its free pages for the merge', async () => {
    const maximumBytes = 4 * 1024 * 1024;
    const database = new Database(':memory:', { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    try {
      database.exec('PRAGMA page_size=4096');
      database.exec('CREATE TABLE boundary_row(id INTEGER PRIMARY KEY, label TEXT NOT NULL)');
      database.query('INSERT INTO boundary_row VALUES(1,?)').run('kept');
      database.exec('CREATE TABLE capacity_padding(payload BLOB NOT NULL)');
      database.query('INSERT INTO capacity_padding VALUES(zeroblob(?))').run(maximumBytes - 4 * 4096 + 4);
      expect(database.query<{ page_size: bigint }, []>('PRAGMA page_size').get()?.page_size).toBe(4096n);
      expect(database.query<{ page_count: bigint }, []>('PRAGMA page_count').get()?.page_count).toBe(1024n);
      database.exec('DELETE FROM capacity_padding');
      expect(
        database.query<{ freelist_count: bigint }, []>('PRAGMA freelist_count').get()?.freelist_count,
      ).toBeGreaterThan(1000n);
      host = closedImage(database);
    } finally {
      database.close(true);
    }
    expect(host.bytes.byteLength).toBe(maximumBytes);
    const before = Buffer.from(host.bytes);
    const mastra = await makeMastra();
    const initializing = spyOn(LibSQLStore.prototype, 'init');
    const closing = spyOn(LibSQLStore.prototype, 'close');
    let image: Awaited<ReturnType<PrepareUnifiedExistingStorageImage>>;
    try {
      image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
      const initializedStores: readonly unknown[] = initializing.mock.contexts;
      const closedStores: readonly unknown[] = closing.mock.contexts;
      const ownedStores = new Set(initializedStores);
      expect(ownedStores.size).toBeGreaterThan(0);
      expect(closedStores.every((store) => ownedStores.has(store))).toBe(true);
      expect(new Set(closedStores).size).toBe(ownedStores.size);
      expect(closedStores).toHaveLength(ownedStores.size);
    } finally {
      closing.mockRestore();
      initializing.mockRestore();
    }
    expect(image.size).toBeLessThanOrEqual(maximumBytes);
    expect(expectReturned(() => loadFreshStorageImage().validateUnifiedDatabaseImage(image))).toEqual(image);
    expect(Buffer.from(host.bytes).equals(before)).toBe(true);
    const merged = openUnified(image.bytes_base64);
    try {
      expect(merged.query('SELECT * FROM boundary_row').all()).toEqual([{ id: 1n, label: 'kept' }]);
      expect(merged.query('SELECT * FROM capacity_padding').all()).toEqual([]);
      expect(merged.query('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' });
      expect(
        merged.query<{ count: bigint }, []>('SELECT COUNT(*) AS count FROM mastra_threads').get()?.count,
      ).toBeGreaterThan(0n);
    } finally {
      merged.close(true);
    }
  });

  test('rejects a correctly hashed source image larger than the 4 MiB input bound before SQLite deserialization', async () => {
    const host = oversizedHostImage();
    const mastra = await makeMastra();
    const opening = spyOn(Database, 'deserialize');
    try {
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
        /Host image size is unsupported/u,
      );
      expect(opening).not.toHaveBeenCalled();
    } finally {
      opening.mockRestore();
    }
  });

  test.each(['Host', 'Mastra'] as const)(
    'rejects a correctly described empty %s image before deserializing that image',
    async (label) => {
      const validHost = makeHost();
      const validMastra = await makeMastra();
      const emptyBytes = Buffer.alloc(0);
      const emptyImage: ClosedDatabaseImage = {
        ...(label === 'Host' ? validHost : validMastra),
        size: emptyBytes.byteLength,
        sha256: sha256(emptyBytes),
        bytes: emptyBytes,
      };
      const host = label === 'Host' ? emptyImage : validHost;
      const mastra = label === 'Mastra' ? emptyImage : validMastra;
      const opening = spyOn(Database, 'deserialize');
      try {
        await expectRejection(
          prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
          new RegExp('^Existing storage merge: ' + label + ' image size is unsupported$', 'u'),
        );
        expect(opening).toHaveBeenCalledTimes(label === 'Host' ? 0 : 1);
      } finally {
        opening.mockRestore();
      }
    },
  );

  test.each(
    (
      [
        ['Host', 'digest', 0],
        ['Mastra', 'digest', 1],
        ['Host', 'size', 0],
        ['Mastra', 'size', 1],
      ] as const
    ).map(([label, mismatch, expectedOpens]) => [`${label} ${mismatch}`, label, mismatch, expectedOpens] as const),
  )(
    'rejects an image with stale %s metadata before deserializing it',
    async (_scenario, label, mismatch, expectedOpens) => {
      const host = makeHost();
      const mastra = await makeMastra();
      const image = label === 'Host' ? host : mastra;
      const invalid = mismatch === 'size' ? { ...image, size: image.size + 1 } : { ...image, sha256: '0'.repeat(64) };
      const invalidHost = label === 'Host' ? invalid : host;
      const invalidMastra = label === 'Mastra' ? invalid : mastra;
      const deserialize = Database.deserialize.bind(Database);
      let opens = 0;
      const opening = spyOn(Database, 'deserialize').mockImplementation((bytes, options) => {
        opens++;
        return typeof options === 'boolean' ? deserialize(bytes, options) : deserialize(bytes, options);
      });
      try {
        await expectRejection(
          prepareUnifiedExistingStorageImage(invalidHost, invalidMastra, binding(invalidHost, invalidMastra)),
          new RegExp(label + ' image digest differs', 'u'),
        );
        expect(opens).toBe(expectedOpens);
      } finally {
        opening.mockRestore();
      }
    },
  );

  test.each(['Host', 'Mastra'] as const)(
    'rejects a mixed rollback/WAL %s header without repairing raw bytes',
    async (label) => {
      const host = makeHost();
      const mastra = await makeMastra();
      const original = label === 'Host' ? host : mastra;
      const bytes = Buffer.from(original.bytes);
      bytes[18] = 1;
      bytes[19] = 2;
      const before = Buffer.from(bytes);
      const mixed = { ...original, bytes, sha256: sha256(bytes) };
      const invalidHost = label === 'Host' ? mixed : host;
      const invalidMastra = label === 'Mastra' ? mixed : mastra;
      await expectRejection(
        prepareUnifiedExistingStorageImage(invalidHost, invalidMastra, binding(invalidHost, invalidMastra)),
      );
      expect(bytes.equals(before)).toBe(true);
    },
  );

  test('rejects a Host schema exceeding the 1024-object inventory bound within the image byte limit', async () => {
    const host = makeHostOverTableBound();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /schema inventory exceeds bound/u,
    );
  });

  test.each([
    ['1024', 1024],
    ['1025', 1025],
  ] as const)(
    'checks the exact Mastra schema bound at %s objects and preserves its source bytes',
    async (_label, targetCount) => {
      const initializedMastra = await makeMastra();
      const database = Database.deserialize(Buffer.from(initializedMastra.bytes), { strict: true, safeIntegers: true });
      let mastra: ClosedDatabaseImage;
      try {
        const table = database
          .query<{ name: string }, []>(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT GLOB 'sqlite_*' ORDER BY name LIMIT 1",
          )
          .get()?.name;
        if (table === undefined) throw new Error('Mastra fixture has no supported table for schema-bound indexes');
        const column = database
          .query<{ name: string }, []>('PRAGMA table_info("' + table.replaceAll('"', '""') + '")')
          .get()?.name;
        if (column === undefined) throw new Error('Mastra fixture table has no column for schema-bound indexes');
        const quotedTable = '"' + table.replaceAll('"', '""') + '"';
        const quotedColumn = '"' + column.replaceAll('"', '""') + '"';
        const initialCount = database
          .query<{ count: bigint }, []>("SELECT COUNT(*) AS count FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'")
          .get()?.count;
        expect(typeof initialCount).toBe('bigint');
        if (initialCount === undefined || initialCount >= BigInt(targetCount))
          throw new Error('Mastra fixture has no room for the exact schema boundary');
        database.exec(
          Array.from(
            { length: targetCount - Number(initialCount) },
            (_, index) =>
              'CREATE VIEW merge_mastra_schema_bound_fixture_' +
              index +
              ' AS SELECT ' +
              quotedColumn +
              ' FROM ' +
              quotedTable,
          ).join(';'),
        );
        const objectCount = database
          .query<{ count: bigint }, []>("SELECT COUNT(*) AS count FROM sqlite_master WHERE name NOT GLOB 'sqlite_*'")
          .get()?.count;
        expect(objectCount).toBe(BigInt(targetCount));
        mastra = closedImage(database);
      } finally {
        database.close(true);
      }
      const host = makeHost();
      expect(mastra.size).toBeLessThan(4 * 1024 * 1024);
      const before = Buffer.from(mastra.bytes);
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
        targetCount === 1024
          ? /Mastra schema differs from pinned empty-init inventory/u
          : /schema inventory exceeds bound/u,
      );
      expect(Buffer.from(mastra.bytes).equals(before)).toBe(true);
    },
  );

  test('rejects a merged serialized image above 4 MiB when both source images are below the input bound', async () => {
    const hostDatabase = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    try {
      hostDatabase.exec('CREATE TABLE merge_output_size_host_fixture(payload BLOB NOT NULL)');
      hostDatabase.query('INSERT INTO merge_output_size_host_fixture(payload) VALUES(zeroblob(?))').run(2_300_000);
      host = closedImage(hostDatabase);
    } finally {
      hostDatabase.close(true);
    }

    const mastraDatabase = Database.deserialize(Buffer.from((await makeMastra()).bytes), {
      strict: true,
      safeIntegers: true,
    });
    let mastra: ClosedDatabaseImage;
    try {
      const updated = mastraDatabase
        .query('UPDATE mastra_threads SET metadata=? WHERE id=?')
        .run(JSON.stringify({ payload: 'm'.repeat(2_300_000) }), 'merge-thread-1');
      expect(updated.changes).toBe(1);
      mastra = closedImage(mastraDatabase);
    } finally {
      mastraDatabase.close(true);
    }

    expect(host.size).toBeLessThan(4 * 1024 * 1024);
    expect(mastra.size).toBeLessThan(4 * 1024 * 1024);
    expect(host.size + mastra.size).toBeGreaterThan(4 * 1024 * 1024);
    const hostBefore = Buffer.from(host.bytes);
    const mastraBefore = Buffer.from(mastra.bytes);
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /unified image exceeds bounded journal capacity/u,
    );
    expect(Buffer.from(host.bytes).equals(hostBefore)).toBe(true);
    expect(Buffer.from(mastra.bytes).equals(mastraBefore)).toBe(true);
  });

  test('rejects 100001 rows in one table at the per-table count guard', async () => {
    const host = makeHostOverSingleTableRowBound();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /table count is unsupported: merge_row_bound_fixture/u,
    );
  });

  test('accepts exactly 100000 rows at the per-table guard before enforcing the combined row bound', async () => {
    const host = makeHostOverSingleTableRowBound(100000);
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /supported Host and Mastra tables exceed total row bound/u,
    );
  });

  test('rejects a combined Host and Mastra row count above 100000 with each Host table within its individual bound', async () => {
    const host = makeHostOverCombinedRowBound();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /supported Host and Mastra tables exceed total row bound/u,
    );
  });

  test('accepts exactly 100000 Host and Mastra rows and preserves the boundary rows', async () => {
    const mastraDatabase = Database.deserialize(Buffer.from((await makeMastra()).bytes), {
      strict: true,
      safeIntegers: true,
    });
    let mastra: ClosedDatabaseImage;
    let mastraRowCount: bigint;
    try {
      mastraRowCount = countUserTableRows(mastraDatabase);
      mastra = closedImage(mastraDatabase);
    } finally {
      mastraDatabase.close(true);
    }

    const database = Database.deserialize(Buffer.from(makeHost().bytes), { strict: true, safeIntegers: true });
    let host: ClosedDatabaseImage;
    let expectedBoundaryTableRows: bigint;
    try {
      // This case owns the real total-row bound; exact integer/BLOB values have
      // dedicated cases. Keep its repeated rows cheap under isolated mutation.
      database.exec('CREATE TABLE merge_exact_total_boundary(marker TEXT NOT NULL)');
      const existingHostRows = countUserTableRows(database);
      expectedBoundaryTableRows = 100_000n - existingHostRows - mastraRowCount;
      if (expectedBoundaryTableRows <= 0n || expectedBoundaryTableRows > 100_000n)
        throw new Error('Real Host and Mastra fixtures leave no valid exact-total row count');
      database
        .query(
          'WITH RECURSIVE rows(id) AS (SELECT 1 UNION ALL SELECT id+1 FROM rows WHERE id<?) ' +
            'INSERT INTO merge_exact_total_boundary(marker) ' +
            "SELECT CASE WHEN id=1 THEN 'first' WHEN id=? THEN 'last' ELSE 'interior' END FROM rows",
        )
        .run(expectedBoundaryTableRows, expectedBoundaryTableRows);
      expect(countUserTableRows(database) + mastraRowCount).toBe(100_000n);
      host = closedImage(database);
    } finally {
      database.close(true);
    }

    expect(host.size).toBeLessThan(4 * 1024 * 1024);
    expect(mastra.size).toBeLessThan(4 * 1024 * 1024);
    const expectedBinding = binding(host, mastra);
    const image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));
    expect(image).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: expectedBinding });
    expect(image.binding).toEqual(expectedBinding);
    expect(image.size).toBeLessThan(4 * 1024 * 1024);
    const merged = openUnified(image.bytes_base64);
    try {
      expect(
        merged.query<{ count: number | bigint }, []>('SELECT COUNT(*) AS count FROM merge_exact_total_boundary').get()
          ?.count,
      ).toBe(expectedBoundaryTableRows);
      expect(
        merged
          .query<{ marker: string }, []>(
            "SELECT marker FROM merge_exact_total_boundary WHERE marker IN ('first','last') ORDER BY marker",
          )
          .all(),
      ).toEqual([{ marker: 'first' }, { marker: 'last' }]);
      expect(
        merged.query("SELECT COUNT(*) AS count FROM merge_exact_total_boundary WHERE marker='interior'").get(),
      ).toEqual({ count: expectedBoundaryTableRows - 2n });
      expect(merged.query('PRAGMA integrity_check').values()).toEqual([['ok']]);
    } finally {
      merged.close(true);
    }
  });

  test('rejects an input with a foreign-key violation even when SQLite integrity_check accepts its pages', async () => {
    const host = makeHostWithForeignKeyViolation();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /merged rows violate a foreign key/u,
    );
  });

  test('rejects a Host CHECK constraint violation reported by SQLite integrity_check', async () => {
    const host = makeHostWithCheckConstraintViolation();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /an input image fails integrity_check/u,
    );
  });

  test('rejects an unowned sqlite_sequence row alongside the owned Host rows', async () => {
    const host = makeHostWithUnownedSequenceRow();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /sqlite_sequence has an unowned table row/u,
    );
  });

  test('checks the final target integrity after earlier merge checks', async () => {
    const host = makeHostWithCheckFixture();
    const mastra = await makeMastra();
    const query = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const exec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    const observed: { target?: Database } = {};
    const observingExec = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, ...args) {
      const result = exec.apply(this, args);
      if (String(args[0]).includes('CREATE TABLE vida_workspace_storage_migration')) observed.target = this;
      return result;
    });
    const corruptingFinalCheck = spyOn(Database.prototype, 'query').mockImplementation(function (
      this: Database,
      sql: string,
    ) {
      if (this === observed.target && sql === 'PRAGMA integrity_check') {
        exec.apply(this, ['PRAGMA ignore_check_constraints=ON']);
        Reflect.apply(query, this, ['UPDATE final_integrity_fixture SET value=-1']).run();
        exec.apply(this, ['PRAGMA ignore_check_constraints=OFF']);
      }
      return Reflect.apply(query, this, [sql]);
    } as typeof Database.prototype.query);
    try {
      await expectRejection(
        prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
        /integrity check failed/u,
      );
    } finally {
      corruptingFinalCheck.mockRestore();
      observingExec.mockRestore();
    }
    expect(observed.target).toBeDefined();
    expect(() => observed.target?.query('SELECT 1').get()).toThrow();
  });

  test('retains the outer merge-and-close diagnostic when a body failure and target close failure coincide', async () => {
    const host = makeHost();
    const mastra = await makeMastra();
    const bodyError = new Error('private target body fault');
    const closeError = new Error('private target close fault');
    const exec = Reflect.get(Database.prototype, 'exec') as typeof Database.prototype.exec;
    const close = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const observed: { target?: Database } = {};
    const failingBody = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, ...args) {
      const result = exec.apply(this, args);
      if (String(args[0]).includes('CREATE TABLE vida_workspace_storage_migration')) {
        observed.target = this;
        throw bodyError;
      }
      return result;
    });
    const failingClose = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, ...args) {
      const result = close.apply(this, args);
      if (this === observed.target) throw closeError;
      return result;
    });
    let failure: unknown;
    try {
      failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
    } finally {
      failingClose.mockRestore();
      failingBody.mockRestore();
    }
    expect(failure).toBeInstanceOf(AggregateError);
    if (!(failure instanceof AggregateError)) throw new Error('Expected the body and target-close failures.');
    expect(failure.message).toBe('existing merge and database close failed');
    expect(failure.errors).toHaveLength(2);
    expect(failure.errors[0]).toBe(bodyError);
    expect(failure.errors[1]).toBe(closeError);
    expect(observed.target).toBeDefined();
    expect(() => observed.target?.query('SELECT 1').get()).toThrow();
  });

  test('validates serialized unified image shape, canonical base64, size, and byte digest', async () => {
    const { validateUnifiedDatabaseImage } = loadFreshStorageImage();
    const host = makeHost();
    const mastra = await makeMastra();
    const expectedBinding = binding(host, mastra);
    const image = await expectPreparedImage(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));
    expect(image).toMatchObject({ schema: 'VidaUnifiedWorkspaceImage/v1', binding: expectedBinding });
    expect(expectReturned(() => validateUnifiedDatabaseImage(image))).toEqual({
      schema: 'VidaUnifiedWorkspaceImage/v1',
      binding: expectedBinding,
      size: image.size,
      sha256: sha256(Buffer.from(image.bytes_base64, 'base64')),
      bytes_base64: image.bytes_base64,
      schema_digest: image.schema_digest,
      host_rows_digest: image.host_rows_digest,
      mastra_rows_digest: image.mastra_rows_digest,
    });
    expect(() => validateUnifiedDatabaseImage({ ...image, schema_digest: 'x' + image.schema_digest })).toThrow();
    expect(() => validateUnifiedDatabaseImage({ ...image, schema_digest: image.schema_digest + 'x' })).toThrow();
    expect(() =>
      validateUnifiedDatabaseImage({
        ...image,
        binding: { ...image.binding, operation_id: '!' + image.binding.operation_id },
      }),
    ).toThrow();
    expect(() =>
      validateUnifiedDatabaseImage({
        ...image,
        binding: { ...image.binding, operation_id: image.binding.operation_id + '\n' },
      }),
    ).toThrow();
    expect(() =>
      validateUnifiedDatabaseImage({
        ...image,
        binding: { ...image.binding, operation_id: image.binding.operation_id + '!' },
      }),
    ).toThrow();
    const oneByte = Buffer.from([1]);
    expect(() =>
      validateUnifiedDatabaseImage({
        ...image,
        size: oneByte.byteLength,
        sha256: sha256(oneByte),
        bytes_base64: 'AR==',
      }),
    ).toThrow('Existing storage merge: unified image encoding is not canonical');
    expect(() => validateUnifiedDatabaseImage({ ...image, bytes_base64: image.bytes_base64 + '!' })).toThrow();
    expect(() => validateUnifiedDatabaseImage({ ...image, size: image.size + 1 })).toThrow(/bytes or digest differ/u);
    expect(() => validateUnifiedDatabaseImage({ ...image, sha256: '0'.repeat(64) })).toThrow(/bytes or digest differ/u);
    expect(() => validateUnifiedDatabaseImage({ ...image, extra: true })).toThrow();
  });
});
