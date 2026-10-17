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
import {
  prepareUnifiedExistingStorageImage,
  type ClosedDatabaseImage,
  type ExistingMergeBinding,
} from '../src/config/project-upgrade-existing-storage.js';
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

function closedImage(database: Database): ClosedDatabaseImage {
  const bytes = Buffer.from(database.serialize());
  return { device: 'fixture-device', inode: 'fixture-inode', size: bytes.byteLength, sha256: sha256(bytes), bytes };
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

function makeHostOverSingleTableRowBound(): ClosedDatabaseImage {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  try {
    initializeHostDatabaseSchema(database);
    database.exec('CREATE TABLE merge_row_bound_fixture(id INTEGER PRIMARY KEY)');
    database.exec(
      'WITH RECURSIVE rows(id) AS (SELECT 1 UNION ALL SELECT id+1 FROM rows WHERE id<100001) ' +
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

async function makeMastra(): Promise<ClosedDatabaseImage> {
  const database = new Database(':memory:', { strict: true, safeIntegers: true });
  const client = createInMemoryBunSqliteClient(database);
  const storage = new LibSQLStore({ id: 'existing-storage-merge-test', client });
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
    return closedImage(database);
  } finally {
    await storage.close();
    database.close(true);
  }
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

async function expectPinnedPhaseFailure(
  phase: 'inventory' | 'Host clone',
  faults: { serialize: boolean; storeClose: boolean; databaseClose: boolean },
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
  try {
    const failure = await rejectionReason(prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)));
    expect(initCount).toBe(targetInit);
    expect(targetStores.size).toBe(1);
    expect(targetDatabases.size).toBe(1);
    expect(bodyReached).toBe(true);
    expect(storeCloseReached).toBe(true);
    expect(databaseCloseReached).toBe(true);
    const expected: unknown[] = [];
    if (faults.serialize) expected.push(bodyError);
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
  } finally {
    closingDatabase.mockRestore();
    closingStore.mockRestore();
    serializing.mockRestore();
    observingQueries.mockRestore();
    initializing.mockRestore();
  }
  for (const database of targetDatabases) expect(() => database.query('SELECT 1').get()).toThrow();
}

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
  const image = await expectAsyncReturned(() =>
    prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
  );
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
    const image = await expectAsyncReturned(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));

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
    const image = await expectAsyncReturned(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));

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
      const schema = merged
        .query<{ type: string; name: string; table_name: string; sql: string | null }, []>(
          'SELECT type,name,tbl_name AS table_name,sql FROM sqlite_master ' +
            "WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
        )
        .all();
      const serializedSchema = canonicalize(schema);
      if (serializedSchema === undefined) throw new Error('reopened unified schema could not be canonicalized');
      expect(image.schema_digest).toBe(sha256(Buffer.from(serializedSchema, 'utf8')));
    } finally {
      merged.close(true);
    }
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
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name LIMIT 1",
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

  test.each([
    ['Host', 'digest', 0],
    ['Mastra', 'digest', 1],
    ['Host', 'size', 0],
    ['Mastra', 'size', 1],
  ] as const)(
    'rejects a %s image with stale %s metadata before deserializing it',
    async (label, mismatch, expectedOpens) => {
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

  test('rejects 100001 rows in one table at the per-table count guard', async () => {
    const host = makeHostOverSingleTableRowBound();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /table count is unsupported: merge_row_bound_fixture/u,
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

  test('rejects an input with a foreign-key violation even when SQLite integrity_check accepts its pages', async () => {
    const host = makeHostWithForeignKeyViolation();
    const mastra = await makeMastra();
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /merged rows violate a foreign key/u,
    );
  });

  test('validates serialized unified image shape, canonical base64, size, and byte digest', async () => {
    const { validateUnifiedDatabaseImage } = loadFreshStorageImage();
    const host = makeHost();
    const mastra = await makeMastra();
    const expectedBinding = binding(host, mastra);
    const image = await expectAsyncReturned(() => prepareUnifiedExistingStorageImage(host, mastra, expectedBinding));
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
