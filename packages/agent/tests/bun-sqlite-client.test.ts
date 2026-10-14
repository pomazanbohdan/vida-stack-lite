import { expect, spyOn, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import path from 'node:path';
import type { SqliteClient } from '@mastra/libsql';
import * as fs from 'node:fs';
import { closeWorkspaceDatabaseWithAdmission } from '../src/config/storage-read-admission.ts';
import { createInMemoryBunSqliteClient, openBunSqliteClient } from '../src/orchestration/bun-sqlite-client.ts';
import { openCustodyFixture } from './helpers/service-custody-fixture.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

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

interface SyntheticFileIdentity {
  readonly dev: bigint;
  readonly ino: bigint;
}

function syntheticFileStats(file: string, identity: () => SyntheticFileIdentity) {
  const originalLstat = fs.lstatSync;
  return spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
    const observed = originalLstat(...args);
    if (observed === undefined || args[0] !== file) return observed;
    const exact = Object.create(observed) as typeof observed;
    const current = identity();
    const usesBigint = args[1] !== undefined && typeof args[1] === 'object' && Reflect.get(args[1], 'bigint') === true;
    Reflect.set(exact, 'dev', usesBigint ? current.dev : Number(current.dev));
    Reflect.set(exact, 'ino', usesBigint ? current.ino : Number(current.ino));
    return exact;
  }) as typeof fs.lstatSync);
}

const largeFileIdentityA: SyntheticFileIdentity = {
  dev: 9_007_199_254_740_993n,
  ino: 9_007_199_254_740_992n,
};
const largeFileIdentityB: SyntheticFileIdentity = {
  dev: 9_007_199_254_740_993n,
  ino: 9_007_199_254_740_993n,
};

test('file-backed SQLite client keeps its actual database identity through client and transaction guards', async () => {
  const fixture = openCustodyFixture('bun-sqlite-client-file-identity-');
  closeWorkspaceDatabaseWithAdmission(fixture.database);
  let client: SqliteClient | undefined;
  let passed = false;
  try {
    client = openBunSqliteClient(fixture.root, fixture.relative, fixture.workspaceId);
    await client.execute('CREATE TABLE file_identity_guard (id INTEGER PRIMARY KEY)');
    expect((await client.execute('SELECT COUNT(*) AS count FROM file_identity_guard')).rows[0]?.count).toBe(0);
    const transaction = await client.transaction('write');
    await transaction.execute('INSERT INTO file_identity_guard (id) VALUES (1)');
    await transaction.rollback();
    expect((await client.execute('SELECT COUNT(*) AS count FROM file_identity_guard')).rows[0]?.count).toBe(0);
    passed = true;
  } finally {
    await client?.close();
    if (passed) fs.rmSync(fixture.root, { recursive: true, force: true });
    else console.error(`Retained failed SQLite client identity fixture: ${fixture.root}`);
  }
});

test('client identity rejects an adjacent synthetic large inode before an operation', async () => {
  const fixture = openCustodyFixture('bun-sqlite-client-large-inode-pre-');
  closeWorkspaceDatabaseWithAdmission(fixture.database);
  const databasePath = path.join(fixture.root, fixture.relative);
  let currentIdentity = largeFileIdentityA;
  const stats = syntheticFileStats(databasePath, () => currentIdentity);
  let client: SqliteClient | undefined;
  let passed = false;
  try {
    client = openBunSqliteClient(fixture.root, fixture.relative, fixture.workspaceId);
    currentIdentity = largeFileIdentityB;
    await expectRejection(client.execute('SELECT 1 AS value'), /database was replaced/u);
    passed = true;
  } finally {
    stats.mockRestore();
    await client?.close();
    if (passed) fs.rmSync(fixture.root, { recursive: true, force: true });
    else console.error(`Retained failed SQLite client large-inode fixture: ${fixture.root}`);
  }
});

test('client identity rechecks an adjacent synthetic large inode after an operation', async () => {
  const fixture = openCustodyFixture('bun-sqlite-client-large-inode-post-');
  closeWorkspaceDatabaseWithAdmission(fixture.database);
  const databasePath = path.join(fixture.root, fixture.relative);
  let currentIdentity = largeFileIdentityA;
  let operationIdentities: SyntheticFileIdentity[] = [];
  const stats = syntheticFileStats(databasePath, () => operationIdentities.shift() ?? currentIdentity);
  let client: SqliteClient | undefined;
  let passed = false;
  try {
    client = openBunSqliteClient(fixture.root, fixture.relative, fixture.workspaceId);
    await client.execute('CREATE TABLE large_inode_post_guard (id INTEGER PRIMARY KEY)');
    operationIdentities = [largeFileIdentityA, largeFileIdentityB];
    await expectRejection(
      client.execute('INSERT INTO large_inode_post_guard (id) VALUES (1)'),
      /database was replaced/u,
    );
    currentIdentity = largeFileIdentityA;
    expect((await client.execute('SELECT COUNT(*) AS count FROM large_inode_post_guard')).rows[0]?.count).toBe(1);
    passed = true;
  } finally {
    stats.mockRestore();
    await client?.close();
    if (passed) fs.rmSync(fixture.root, { recursive: true, force: true });
    else console.error(`Retained failed SQLite client post-operation identity fixture: ${fixture.root}`);
  }
});

test('transaction identity guards detect adjacent synthetic large inodes before and after execution', async () => {
  const fixture = openCustodyFixture('bun-sqlite-client-large-inode-transaction-');
  closeWorkspaceDatabaseWithAdmission(fixture.database);
  const databasePath = path.join(fixture.root, fixture.relative);
  let currentIdentity = largeFileIdentityA;
  let operationIdentities: SyntheticFileIdentity[] = [];
  const stats = syntheticFileStats(databasePath, () => operationIdentities.shift() ?? currentIdentity);
  let client: SqliteClient | undefined;
  let passed = false;
  try {
    client = openBunSqliteClient(fixture.root, fixture.relative, fixture.workspaceId);
    await client.execute('CREATE TABLE large_inode_transaction_guard (id INTEGER PRIMARY KEY)');
    const transaction = await client.transaction('write');
    currentIdentity = largeFileIdentityB;
    await expectRejection(transaction.execute('SELECT 1 AS value'), /database was replaced/u);

    currentIdentity = largeFileIdentityA;
    operationIdentities = [largeFileIdentityA, largeFileIdentityB];
    await expectRejection(
      transaction.execute('INSERT INTO large_inode_transaction_guard (id) VALUES (1)'),
      /database was replaced/u,
    );
    currentIdentity = largeFileIdentityA;
    await transaction.rollback();
    passed = true;
  } finally {
    stats.mockRestore();
    await client?.close();
    if (passed) fs.rmSync(fixture.root, { recursive: true, force: true });
    else console.error(`Retained failed SQLite transaction identity fixture: ${fixture.root}`);
  }
});

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

test.each([
  { returning: false, safeIntegers: true, rowid: 7n },
  { returning: false, safeIntegers: true, rowid: 9_007_199_254_740_993n },
  { returning: false, safeIntegers: false, rowid: 7n },
  { returning: false, safeIntegers: false, rowid: 9_007_199_254_740_993n },
  { returning: true, safeIntegers: true, rowid: 7n },
  { returning: true, safeIntegers: true, rowid: 9_007_199_254_740_993n },
  { returning: true, safeIntegers: false, rowid: 7n },
  { returning: true, safeIntegers: false, rowid: 9_007_199_254_740_993n },
])('INSERT metadata is exact for returning=$returning safeIntegers=$safeIntegers rowid=$rowid', async (scenario) => {
  await withMemoryClient(async (_database, client) => {
    await client.execute('CREATE TABLE insert_metadata_matrix (id INTEGER PRIMARY KEY, value TEXT NOT NULL)');
    const sql = `INSERT INTO insert_metadata_matrix (id, value) VALUES (?, ?)${scenario.returning ? ' RETURNING CAST(id AS TEXT) AS id_text' : ''}`;
    const inserted = await client.execute({ sql, args: [scenario.rowid, 'once'] });

    expect(inserted.rowsAffected).toBe(1);
    expect(inserted.lastInsertRowid).toBe(scenario.rowid);
    expect(inserted.rows.map((row) => row.id_text)).toEqual(scenario.returning ? [scenario.rowid.toString()] : []);
    expect((await client.execute('SELECT COUNT(*) AS count FROM insert_metadata_matrix')).rows[0]?.count).toBe(1);
  }, scenario.safeIntegers);
});

test('RETURNING statement classification recognizes semicolon and single-quoted CTE prefixes', async () => {
  await withMemoryClient(async (_database, client) => {
    await client.execute(
      "CREATE TABLE returning_prefix_controls (id INTEGER PRIMARY KEY, v TEXT NOT NULL, value TEXT NOT NULL DEFAULT '')",
    );

    const semicolon = await client.execute('; INSERT INTO returning_prefix_controls(v) VALUES("x") RETURNING id');
    expect(semicolon.rows).toHaveLength(1);
    expect(semicolon.rows[0]?.id).toBe(1);
    expect(semicolon.rowsAffected).toBe(1);
    expect(semicolon.lastInsertRowid).toBe(1n);

    const singleQuotedCte = await client.execute(
      `WITH 'seed' AS (SELECT 'x' AS v) INSERT INTO returning_prefix_controls(v) SELECT v FROM 'seed' RETURNING id`,
    );
    expect(singleQuotedCte.rows).toHaveLength(1);
    expect(singleQuotedCte.rows[0]?.id).toBe(2);
    expect(singleQuotedCte.rowsAffected).toBe(1);
    expect(singleQuotedCte.lastInsertRowid).toBe(2n);
    expect((await client.execute('SELECT COUNT(*) AS count FROM returning_prefix_controls')).rows[0]?.count).toBe(2);
  });
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
