import { expectRejection } from './helpers/expect-rejection.ts';
import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import { LibSQLStore } from '@mastra/libsql';
import { initializeHostDatabaseSchema } from '../src/host-state.js';
import {
  prepareUnifiedExistingStorageImage,
  validateUnifiedDatabaseImage,
  type ClosedDatabaseImage,
  type ExistingMergeBinding,
} from '../src/config/project-upgrade-existing-storage.js';
import { createInMemoryBunSqliteClient } from '../src/orchestration/bun-sqlite-client.js';

const workspaceId = 'a'.repeat(64);
const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

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
  const bytes = Buffer.alloc(4 * 1024 * 1024 + 1);
  return { device: 'fixture-device', inode: 'fixture-inode', size: bytes.byteLength, sha256: sha256(bytes), bytes };
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
  return Database.deserialize(Buffer.from(bytesBase64, 'base64'), { strict: true, safeIntegers: true });
}

describe('existing storage image preparation', () => {
  test('preserves source rows including duplicate values, exact BLOBs, large integers, and AUTOINCREMENT sequence', async () => {
    const host = makeHost();
    const mastra = await makeMastra();
    const image = await prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra));

    const merged = openUnified(image.bytes_base64);
    try {
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
    } finally {
      merged.close(true);
    }
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
    await expectRejection(
      prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra)),
      /Host image size is unsupported/u,
    );
  });

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
    const host = makeHost();
    const mastra = await makeMastra();
    const image = await prepareUnifiedExistingStorageImage(host, mastra, binding(host, mastra));
    expect(validateUnifiedDatabaseImage(image)).toEqual(image);
    expect(() => validateUnifiedDatabaseImage({ ...image, bytes_base64: image.bytes_base64 + '!' })).toThrow();
    expect(() => validateUnifiedDatabaseImage({ ...image, size: image.size + 1 })).toThrow(/bytes or digest differ/u);
    expect(() => validateUnifiedDatabaseImage({ ...image, sha256: '0'.repeat(64) })).toThrow(/bytes or digest differ/u);
    expect(() => validateUnifiedDatabaseImage({ ...image, extra: true })).toThrow();
  });
});
