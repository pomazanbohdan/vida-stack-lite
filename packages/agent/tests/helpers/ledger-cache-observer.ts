import { expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import type { HostStateStore, WorkState } from '../../src/host-state.js';

export const historyTables = [
  'agent_host_qualified_runtime_code_continuation',
  'agent_host_runtime_code_rebind',
  'agent_host_delivered_work_continuation',
  'agent_host_initial_source_continuation',
  'agent_host_initial_source_frontier_code_rebind',
  'agent_host_completed_source_report_recovery',
  'agent_host_failed_prewriter_recovery',
] as const;
export type HistoryTable = (typeof historyTables)[number];

export interface MetadataRead {
  readonly sql: string;
  readonly bindings: readonly unknown[];
}

export function observeMetadataReads<T>(
  database: Database | null,
  operation: () => T,
): { result?: T; error?: unknown; reads: MetadataRead[] } {
  const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query,
    reads: MetadataRead[] = [];
  const observedConnection = { database };
  const observedQuery = function (this: Database, sql: string) {
    const statement = Reflect.apply(originalQuery, this, [sql]);
    if (!sql.toLowerCase().includes('sqlite_master') || (database !== null && this !== database)) return statement;
    return new Proxy(statement, {
      get: (target, property) => {
        const member: unknown = Reflect.get(target, property, target);
        if ((property !== 'get' && property !== 'all') || typeof member !== 'function') return member;
        return (...bindings: unknown[]): unknown => {
          if (observedConnection.database === null) observedConnection.database = this;
          if (this !== observedConnection.database)
            throw new Error('metadata observation crossed database connections');
          reads.push({ sql, bindings });
          return Reflect.apply(member, target, bindings);
        };
      },
    }) as typeof statement;
  } as unknown as typeof Database.prototype.query;
  Database.prototype.query = observedQuery;
  try {
    return { result: operation(), reads };
  } catch (error) {
    return { error, reads };
  } finally {
    Database.prototype.query = originalQuery;
  }
}

function isHistoryMetadataRead(read: MetadataRead): boolean {
  return historyTables.some((table) => read.sql.includes(table) || read.bindings.includes(table));
}

export function expectSnapshotMetadata(reads: readonly MetadataRead[]): void {
  const historyReads = reads.filter(isHistoryMetadataRead),
    publicSnapshotReads = reads.filter((read) => !historyReads.includes(read));
  expect(historyReads).toHaveLength(1);
  for (const table of historyTables) expect(historyReads[0]!.sql).toContain(table);
  // readWorkspaceSnapshot separately checks its required agent_host_state table budget.
  expect(publicSnapshotReads).toEqual([
    { sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?", bindings: ['agent_host_state'] },
  ]);
}

export function expectHistorySnapshotAfterOwner(store: HostStateStore, work: WorkState): void {
  const snapshot = observeMetadataReads(null, () => store.readWorkspaceSnapshot());
  expect(snapshot.error).toBeUndefined();
  expect(snapshot.result?.workspace_id).toBe(work.workspace_id);
  expect(snapshot.result?.work).toHaveLength(1);
  expect(snapshot.result?.work[0]?.work).toEqual(work);
  expectSnapshotMetadata(snapshot.reads);
}

export function expectCorrectiveAuthorizationMetadata(reads: readonly MetadataRead[]): void {
  const metadataReads = reads.filter((read) => read.sql.toLowerCase().includes('sqlite_master')),
    historyReads = metadataReads.filter(isHistoryMetadataRead),
    otherMetadataReads = metadataReads.filter((read) => !isHistoryMetadataRead(read));
  // Source call path has no metadata lookup besides checkedStoredWork's optional-history load.
  // In particular findArchivedReportedObservation's corrective-recovery lookup is not called here.
  expect(otherMetadataReads).toEqual([]);
  expect(historyReads).toHaveLength(1);
  expect(historyReads[0]!.sql).toContain('name IN (');
  for (const table of historyTables) expect(historyReads[0]!.sql).toContain(table);
}
