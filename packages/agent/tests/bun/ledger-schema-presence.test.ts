import { afterEach, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { deliveredWorkContinuationRecord } from '../../src/orchestration/delivered-work-continuation-repair.js';
import {
  cleanupContinuationFixtures,
  continuationFixture,
  continuationRequestFor,
} from '../helpers/delivered-work-continuation-fixture.mjs';
import {
  expectSnapshotMetadata,
  historyTables,
  observeMetadataReads,
  type HistoryTable,
} from '../helpers/ledger-cache-observer.ts';

const tableSchemas: Record<HistoryTable, string> = {
  agent_host_qualified_runtime_code_continuation:
    'workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,request_id TEXT NOT NULL,work_revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,request_id),UNIQUE(workspace_id,work_id,work_revision)',
  agent_host_runtime_code_rebind:
    'workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,action_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,action_id)',
  agent_host_delivered_work_continuation:
    'workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,action_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,action_id)',
  agent_host_initial_source_continuation:
    'workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt)',
  agent_host_initial_source_frontier_code_rebind:
    'workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,original_receipt_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,original_receipt_id)',
  agent_host_completed_source_report_recovery:
    'workspace_id TEXT,work_id TEXT,attempt INTEGER,payload TEXT,digest TEXT,PRIMARY KEY(workspace_id,work_id,attempt)',
  agent_host_failed_prewriter_recovery:
    'workspace_id TEXT NOT NULL,work_id TEXT NOT NULL,attempt INTEGER NOT NULL,recovery_id TEXT NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,work_id,attempt,recovery_id)',
};

afterEach(() => cleanupContinuationFixtures());

function createHistoryTables(database: Database, omitted?: HistoryTable): void {
  for (const table of historyTables) {
    if (table !== omitted) database.exec(`CREATE TABLE ${table} (${tableSchemas[table]})`);
  }
}

test('one batched presence read accepts all absent optional history tables', async () => {
  const fixture = await continuationFixture();
  const observed = observeMetadataReads(fixture.db, () => fixture.store.readWorkspaceSnapshot());
  expect(observed.error).toBeUndefined();
  expect(observed.result?.work).toHaveLength(1);
  expectSnapshotMetadata(observed.reads);
});

test('opaque Host owner metadata is observed on its actual database without a fixture handle', async () => {
  const fixture = await continuationFixture();
  const originalQuery = Object.getOwnPropertyDescriptor(Database.prototype, 'query');
  const observed = observeMetadataReads(null, () => fixture.store.readWorkspaceSnapshot());
  expect(observed.error).toBeUndefined();
  expect(observed.result?.work).toHaveLength(1);
  expectSnapshotMetadata(observed.reads);
  expect(Object.getOwnPropertyDescriptor(Database.prototype, 'query')).toEqual(originalQuery);
});

test('opaque metadata observation rejects mixed database connections and restores the query method', () => {
  const first = new Database(':memory:');
  const second = new Database(':memory:');
  const originalQuery = Object.getOwnPropertyDescriptor(Database.prototype, 'query');
  try {
    const observed = observeMetadataReads(null, () => {
      first.query("SELECT name FROM sqlite_master WHERE type='table'").all();
      second.query("SELECT name FROM sqlite_master WHERE type='table'").all();
    });
    expect(observed.error).toBeInstanceOf(Error);
    expect(String(observed.error)).toContain('metadata observation crossed database connections');
    expect(observed.reads).toHaveLength(1);
    expect(Object.getOwnPropertyDescriptor(Database.prototype, 'query')).toEqual(originalQuery);
  } finally {
    first.close(true);
    second.close(true);
  }
});

test.each([...historyTables] as HistoryTable[])('one batched presence read tolerates missing %s', async (omitted) => {
  const fixture = await continuationFixture();
  createHistoryTables(fixture.db, omitted);
  const observed = observeMetadataReads(fixture.db, () => fixture.store.readWorkspaceSnapshot());
  expect(observed.error).toBeUndefined();
  expect(observed.result?.work).toHaveLength(1);
  expectSnapshotMetadata(observed.reads);
});

test('one batched presence read handles a mixed optional schema', async () => {
  const fixture = await continuationFixture();
  for (const table of [
    'agent_host_runtime_code_rebind',
    'agent_host_delivered_work_continuation',
    'agent_host_failed_prewriter_recovery',
  ] as const)
    fixture.db.exec(`CREATE TABLE ${table} (${tableSchemas[table]})`);
  const observed = observeMetadataReads(fixture.db, () => fixture.store.readWorkspaceSnapshot());
  expect(observed.error).toBeUndefined();
  expectSnapshotMetadata(observed.reads);
});

test('all present tables load a genuine continuation receipt and reject a corrupt row', async () => {
  const fixture = await continuationFixture();
  createHistoryTables(fixture.db);
  const request = continuationRequestFor(fixture);
  await fixture.store.continueDeliveredWork(request);
  const valid = observeMetadataReads(fixture.db, () => fixture.store.readWorkspaceSnapshot());
  expect(valid.error).toBeUndefined();
  expect(valid.result?.work).toHaveLength(1);
  expectSnapshotMetadata(valid.reads);

  fixture.db
    .query('INSERT INTO agent_host_runtime_code_rebind VALUES(?,?,?,?,?,?)')
    .run(fixture.workspaceId, fixture.identity.work_id, 1, 'action', '{', '0'.repeat(64));
  const corrupt = observeMetadataReads(fixture.db, () => fixture.store.readWorkspaceSnapshot());
  expect(corrupt.error).toBeInstanceOf(Error);
  expectSnapshotMetadata(corrupt.reads);
});

test('repair inspection validates an exact overlay from a real stored continuation', async () => {
  const fixture = await continuationFixture();
  const result = await fixture.store.continueDeliveredWork(continuationRequestFor(fixture));
  const action = result.receipt.request.action;
  const actionId = action.kind === 'historical_terminal_review' ? action.capture.action_id : action.request.action_id;
  const stored = fixture.db
    .query(
      'SELECT payload,digest FROM agent_host_delivered_work_continuation WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
    )
    .get(fixture.workspaceId, fixture.identity.work_id, 1, actionId) as { payload: string; digest: string };
  const expected = deliveredWorkContinuationRecord(result.receipt);
  expect(stored.digest).toBe(expected.digest);
  fixture.db
    .query(
      'UPDATE agent_host_delivered_work_continuation SET digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
    )
    .run('0'.repeat(64), fixture.workspaceId, fixture.identity.work_id, 1, actionId);
  const observed = observeMetadataReads(fixture.db, () =>
    fixture.store.inspectDeliveredWorkContinuationRepair(fixture.identity, 1, actionId),
  );
  expect(observed.error).toBeUndefined();
  expect(observed.result).toMatchObject({
    schema: 'DeliveredWorkContinuationRepairInspection/v1',
    workspace_id: fixture.workspaceId,
    identity: fixture.identity,
    attempt: 1,
    action_id: actionId,
  });
  expect(observed.result?.row).toEqual({
    payload: stored.payload,
    before_digest: '0'.repeat(64),
    after_digest: expected.digest,
  });
  const historyReads = observed.reads.filter((read) =>
    historyTables.some((table) => read.sql.includes(table) || read.bindings.includes(table)),
  );
  expect(historyReads).toHaveLength(3);
  expect(historyReads.filter((read) => read.sql.includes('name IN ('))).toHaveLength(1);
  expect(historyReads.filter((read) => read.sql.includes("name='agent_host_delivered_work_continuation'")).length).toBe(
    1,
  );
  expect(
    historyReads.filter((read) => read.bindings.includes('agent_host_qualified_runtime_code_continuation')).length,
  ).toBe(1);
});

test('public repair inspection reports a missing stored row before creating any overlay', async () => {
  const fixture = await continuationFixture();
  const observed = observeMetadataReads(fixture.db, () =>
    fixture.store.inspectDeliveredWorkContinuationRepair(fixture.identity, 1, 'f'.repeat(64)),
  );
  expect(observed.error).toBeInstanceOf(Error);
  expect(String(observed.error)).toContain('repair row is missing');
  // The public API requires a row before it can construct the private overlay.
  expect(observed.reads.some((read) => read.sql.includes("name='agent_host_delivered_work_continuation'"))).toBe(true);
});
