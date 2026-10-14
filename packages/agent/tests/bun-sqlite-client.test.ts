import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createInMemoryBunSqliteClient } from '../src/orchestration/bun-sqlite-client.ts';
import type { SqliteClient } from '@mastra/libsql';

type MemoryClient = SqliteClient & { settle(): Promise<void> };

async function withMemoryClient<T>(
  body: (database: Database, client: MemoryClient) => Promise<T>,
  safeIntegers = true,
): Promise<T> {
  const database = new Database(':memory:', { strict: true, safeIntegers });
  let client: MemoryClient;
  try {
    client = createInMemoryBunSqliteClient(database);
  } catch (error) {
    try {
      database.close(true);
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], 'SQLite client setup and database close failed');
    }
    throw error;
  }

  let result!: T;
  let failed = false;
  let failure: unknown;
  try {
    result = await body(database, client);
  } catch (error) {
    failed = true;
    failure = error;
  }

  try {
    await client.close();
  } catch (cleanup) {
    if (failed) throw new AggregateError([failure, cleanup], 'SQLite client test and close failed');
    throw cleanup;
  }
  if (failed) throw failure;
  return result;
}

test('SQLite batch rolls back all earlier statements when a later statement fails', async () => {
  await withMemoryClient(async (_database, client) => {
    let failure: unknown;
    try {
      await client.batch(
        [
          'CREATE TABLE batch_atomic (id INTEGER PRIMARY KEY, value TEXT NOT NULL)',
          "INSERT INTO batch_atomic (id, value) VALUES (1, 'first')",
          "INSERT INTO batch_atomic (id, value) VALUES (1, 'duplicate')",
        ],
        'write',
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    if (!(failure instanceof Error)) throw new Error('Batch did not return a SQLite constraint error');
    expect(failure.message).toContain('UNIQUE constraint failed: batch_atomic.id');
    const table = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='batch_atomic'");
    expect(table.rows).toEqual([]);

    await client.execute('CREATE TABLE batch_atomic (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    const usable = await client.execute('SELECT COUNT(*) AS count FROM batch_atomic');
    expect(usable.rows[0]?.count).toBe(0);
  });
});

test('ordinary calls wait for an async transaction to settle before using its connection', async () => {
  await withMemoryClient(async (_database, client) => {
    await client.execute('CREATE TABLE queued_call (id INTEGER PRIMARY KEY)');
    const transaction = await client.transaction('write');
    await transaction.execute('INSERT INTO queued_call (id) VALUES (1)');

    let ordinaryCallFinished = false;
    const ordinaryCall = client.execute('SELECT id FROM queued_call').then(
      (result) => {
        ordinaryCallFinished = true;
        return { result, error: null };
      },
      (error: unknown) => ({ result: null, error }),
    );
    expect(ordinaryCallFinished).toBe(false);
    await Promise.resolve();
    expect(ordinaryCallFinished).toBe(false);
    await Promise.resolve(expect(client.settle()).rejects.toThrow(/active transaction/));

    // A queued read must observe the rollback, not the uncommitted row.
    await transaction.rollback();
    const ordinaryResult = await ordinaryCall;
    expect(ordinaryResult.error).toBeNull();
    expect(ordinaryResult.result?.rows).toEqual([]);
    expect(ordinaryCallFinished).toBe(true);
    await client.settle();
  });
});

test('in-memory read transaction keeps its opening snapshot and rejects writes', async () => {
  await withMemoryClient(async (database, client) => {
    await client.execute('CREATE TABLE read_snapshot (id INTEGER PRIMARY KEY)');
    await client.execute('INSERT INTO read_snapshot (id) VALUES (1)');

    const transaction = await client.transaction('read');
    expect((await transaction.execute('SELECT COUNT(*) AS count FROM read_snapshot')).rows[0]?.count).toBe(1);

    // Change the original connection while the transaction owns its independent snapshot.
    database.exec('INSERT INTO read_snapshot (id) VALUES (2)');
    expect((await transaction.execute('SELECT COUNT(*) AS count FROM read_snapshot')).rows[0]?.count).toBe(1);
    await Promise.resolve(expect(transaction.execute('INSERT INTO read_snapshot (id) VALUES (3)')).rejects.toThrow());

    await transaction.rollback();
    expect((await client.execute('SELECT COUNT(*) AS count FROM read_snapshot')).rows[0]?.count).toBe(2);
  });
});

test('transaction close and rollback are terminal and discard uncommitted rows', async () => {
  await withMemoryClient(async (_database, client) => {
    await client.execute('CREATE TABLE transaction_terminal (id INTEGER PRIMARY KEY)');

    const closed = await client.transaction('write');
    await closed.execute('INSERT INTO transaction_terminal (id) VALUES (1)');
    closed.close();
    expect(closed.closed).toBe(true);
    await Promise.resolve(
      expect(closed.execute('SELECT id FROM transaction_terminal')).rejects.toThrow(/transaction is closed/),
    );
    expect((await client.execute('SELECT COUNT(*) AS count FROM transaction_terminal')).rows[0]?.count).toBe(0);

    const rolledBack = await client.transaction('write');
    await rolledBack.execute('INSERT INTO transaction_terminal (id) VALUES (2)');
    await rolledBack.rollback();
    expect(rolledBack.closed).toBe(true);
    await Promise.resolve(expect(rolledBack.commit()).rejects.toThrow(/transaction is closed/));
    expect((await client.execute('SELECT COUNT(*) AS count FROM transaction_terminal')).rows[0]?.count).toBe(0);
  });
});

test('supported named bindings preserve blobs and integers outside the safe number range', async () => {
  await withMemoryClient(async (_database, client) => {
    const blob = Uint8Array.from([0, 127, 128, 255]);
    const large = 9_007_199_254_740_993n;
    const result = await client.execute({
      sql: 'SELECT $payload AS payload, $large AS large, $enabled AS enabled, $when AS when_ms',
      args: { $payload: blob, $large: large, $enabled: true, $when: new Date('2026-01-02T03:04:05.000Z') },
    });

    const row = result.rows[0];
    expect(row?.large).toBe(large);
    expect(row?.enabled).toBe(1);
    expect(row?.when_ms).toBe(Date.parse('2026-01-02T03:04:05.000Z'));
    const returnedBlob = row?.payload;
    expect(returnedBlob).toBeInstanceOf(ArrayBuffer);
    if (!(returnedBlob instanceof ArrayBuffer)) throw new Error('SQLite blob result is not an ArrayBuffer');
    expect([...new Uint8Array(returnedBlob)]).toEqual([...blob]);
  });
});

test('DML RETURNING preserves rows and metadata from one execution', async () => {
  await withMemoryClient(async (_database, client) => {
    await client.execute('CREATE TABLE returning_metadata (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');

    const inserted = await client.execute(
      "INSERT INTO returning_metadata (value) VALUES ('first') RETURNING id, value",
    );
    expect(inserted.rows.map((row) => row.value)).toEqual(['first']);
    expect(inserted.rowsAffected).toBe(1);
    expect(inserted.lastInsertRowid).toBe(1n);
    expect((await client.execute('SELECT COUNT(*) AS count FROM returning_metadata')).rows[0]?.count).toBe(1);

    const updated = await client.execute(
      "UPDATE returning_metadata SET value='updated' WHERE id=1 RETURNING id, value",
    );
    expect(updated.rows.map((row) => row.value)).toEqual(['updated']);
    expect(updated.rowsAffected).toBe(1);
    expect(updated.lastInsertRowid).toBeUndefined();

    const deleted = await client.execute('DELETE FROM returning_metadata WHERE id=1 RETURNING id');
    expect(deleted.rows).toHaveLength(1);
    expect(deleted.rowsAffected).toBe(1);
    expect(deleted.lastInsertRowid).toBeUndefined();
  });
});

test('INSERT RETURNING preserves an exact large rowid when database safeIntegers is off', async () => {
  await withMemoryClient(async (_database, client) => {
    const rowid = 9_007_199_254_740_993n;
    await client.execute('CREATE TABLE returning_large_rowid (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');

    const inserted = await client.execute({
      sql: 'INSERT INTO returning_large_rowid (id, value) VALUES (?, ?) RETURNING value',
      args: [rowid, 'exact'],
    });
    expect(inserted.rows[0]?.value).toBe('exact');
    expect(inserted.rowsAffected).toBe(1);
    expect(inserted.lastInsertRowid).toBe(rowid);
  }, false);
});

test('RETURNING metadata handles zero-row DML, triggers, and later SELECTs', async () => {
  await withMemoryClient(async (_database, client) => {
    await client.execute('CREATE TABLE returning_effects (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    await client.execute('CREATE TABLE returning_effects_audit (id INTEGER NOT NULL)');
    await client.execute(
      'CREATE TRIGGER returning_effects_after_update AFTER UPDATE ON returning_effects BEGIN INSERT INTO returning_effects_audit VALUES (NEW.id); END',
    );
    await client.execute("INSERT INTO returning_effects VALUES (1, 'before')");

    const updated = await client.execute("UPDATE returning_effects SET value='after' WHERE id=1 RETURNING id");
    expect(updated.rowsAffected).toBe(1);
    expect(updated.lastInsertRowid).toBeUndefined();
    expect((await client.execute('SELECT COUNT(*) AS count FROM returning_effects_audit')).rows[0]?.count).toBe(1);

    const noMatch = await client.execute(
      "INSERT INTO returning_effects (id, value) SELECT 2, 'missing' WHERE 0 RETURNING id",
    );
    expect(noMatch.rows).toEqual([]);
    expect(noMatch.rowsAffected).toBe(0);
    expect(noMatch.lastInsertRowid).toBeUndefined();

    // This SELECT follows writes whose SQLite changes() value was nonzero.
    const selected = await client.execute('SELECT id FROM returning_effects ORDER BY id');
    expect(selected.rows.map((row) => row.id)).toEqual([1]);
    expect(selected.rowsAffected).toBe(0);
    expect(selected.lastInsertRowid).toBeUndefined();
  });
});

test('INSERT RETURNING metadata recognizes leading comments and a WITH clause', async () => {
  await withMemoryClient(async (_database, client) => {
    await client.execute('CREATE TABLE returning_cte (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');

    const inserted = await client.execute(
      `/* leading comment */ WITH seed(value) AS (VALUES ('from cte'))
       INSERT INTO returning_cte (value) SELECT value FROM seed RETURNING id, value`,
    );
    expect(inserted.rows.map((row) => row.value)).toEqual(['from cte']);
    expect(inserted.rowsAffected).toBe(1);
    expect(inserted.lastInsertRowid).toBe(1n);
    expect((await client.execute('SELECT COUNT(*) AS count FROM returning_cte')).rows[0]?.count).toBe(1);
  });
});
