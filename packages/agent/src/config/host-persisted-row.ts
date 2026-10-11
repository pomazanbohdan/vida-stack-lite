import type { Database } from 'bun:sqlite';
import { queryWorkspaceRowUnknown } from './workspace-database-raw.js';
import { coordinationLedgerDigest } from '../contracts/envelopes.js';
import { canonicalJsonDigest, isPlainRecord, MAX_CANONICAL_BYTES } from '../contracts/public-ingress.js';
import { MAX_CANONICAL_DEPTH, MAX_CANONICAL_NODES } from '../contracts/canonical-json-core.js';

export type WorkspaceSqlTable = 'agent_host_state' | 'agent_host_mastra_session_ledger' | 'agent_host_governance';

interface WorkspaceSqlRowBase {
  readonly workspace_id: string;
  readonly revision: number;
  readonly payload: string;
  readonly digest: string;
  readonly payloadBytes: Uint8Array;
  readonly value: unknown;
}

export interface WorkspaceStateSqlRow extends WorkspaceSqlRowBase {
  readonly table: 'agent_host_state';
  readonly kind: 'work' | 'ledger';
  readonly id: string;
}

export interface WorkspaceMastraSqlRow extends WorkspaceSqlRowBase {
  readonly table: 'agent_host_mastra_session_ledger';
  readonly work_id: string;
  readonly attempt: number;
}

export interface WorkspaceGovernanceSqlRow extends WorkspaceSqlRowBase {
  readonly table: 'agent_host_governance';
  readonly store_id: string;
  readonly kind: string;
  readonly record_key: string;
}

export type WorkspaceSqlRow = WorkspaceStateSqlRow | WorkspaceMastraSqlRow | WorkspaceGovernanceSqlRow;

type WorkspaceSqlColumns =
  | { readonly table: 'agent_host_state'; readonly kind: 'work' | 'ledger'; readonly id: string }
  | { readonly table: 'agent_host_mastra_session_ledger'; readonly work_id: string; readonly attempt: number }
  | {
      readonly table: 'agent_host_governance';
      readonly store_id: string;
      readonly kind: string;
      readonly record_key: string;
    };

interface DecodedPayload {
  readonly payload: string;
  readonly payloadBytes: Uint8Array;
  readonly value: unknown;
}

function sqlText(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`workspace SQL ${label} must be text`);
  return value;
}

function sqlPositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new Error(`workspace SQL ${label} must be a positive safe integer`);
  return value;
}

function expectedProjection(table: WorkspaceSqlTable): readonly string[] {
  const base = ['workspace_id', 'revision', 'payload', 'digest', 'raw_payload_bytes'];
  if (table === 'agent_host_state') return [...base, 'kind', 'id'];
  if (table === 'agent_host_mastra_session_ledger') return [...base, 'work_id', 'attempt'];
  if (table === 'agent_host_governance') return [...base, 'store_id', 'kind', 'record_key'];
  throw new Error('workspace SQL table is unsupported');
}

export function snapshotWorkspaceSqlProjection(
  input: unknown,
  expected: readonly string[],
  table: string,
): Record<string, unknown> {
  if (!isPlainRecord(input)) throw new Error(`workspace SQL ${table} row is not a plain record`);
  const keys = Reflect.ownKeys(input);
  if (
    keys.some((key) => typeof key !== 'string') ||
    keys.sort((a, b) => String(a).localeCompare(String(b))).join('|') !==
      [...expected].sort((a, b) => a.localeCompare(b)).join('|')
  )
    throw new Error(`workspace SQL ${table} projection differs`);
  const row: Record<string, unknown> = {};
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value'))
      throw new Error(`workspace SQL ${table} projection contains an accessor`);
    row[key] = descriptor.value;
  }
  return row;
}

function sqlCounter(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === 'bigint' && value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
  throw new Error(`workspace SQL ${label} is invalid`);
}

function preflightPersistedJson(database: Database, payload: string, table: string, maxNodes: number): void {
  const summary = snapshotWorkspaceSqlProjection(
    queryWorkspaceRowUnknown(
      database,
      'WITH RECURSIVE raw(id,parent) AS MATERIALIZED (' +
        'SELECT id,parent FROM json_tree(?) LIMIT ?' +
        '), walk(id,parent,depth) AS (' +
        'SELECT id,parent,0 FROM raw WHERE parent IS NULL ' +
        'UNION ALL ' +
        'SELECT child.id,child.parent,walk.depth+1 FROM raw AS child ' +
        'JOIN walk ON child.parent=walk.id WHERE walk.depth<=? LIMIT ?' +
        ') ' +
        'SELECT (SELECT count(*) FROM raw) AS node_count,coalesce(max(depth),0) AS max_depth FROM walk',
      [payload, maxNodes + 1, MAX_CANONICAL_DEPTH, maxNodes + 1],
    ),
    ['node_count', 'max_depth'],
    `${table} JSON structure`,
  );
  const nodeCount = sqlCounter(summary.node_count, `${table}.node_count`);
  const maxDepth = sqlCounter(summary.max_depth, `${table}.max_depth`);
  if (nodeCount > maxNodes || maxDepth > MAX_CANONICAL_DEPTH)
    throw new Error(`workspace SQL ${table} JSON structural budget exceeded`);
}

function decodePayload(
  payloadValue: unknown,
  bytesValue: unknown,
  table: string,
  database?: Database,
  maxNodes = MAX_CANONICAL_NODES,
): DecodedPayload {
  const payload = sqlText(payloadValue, `${table}.payload`);
  if (payload.length > MAX_CANONICAL_BYTES) throw new Error(`workspace SQL ${table} payload text is oversized`);
  if (!(bytesValue instanceof Uint8Array) || bytesValue.byteLength > MAX_CANONICAL_BYTES)
    throw new Error(`workspace SQL ${table} payload bytes are invalid or oversized`);
  const payloadBytes = new Uint8Array(bytesValue);
  let decodedText: string;
  try {
    decodedText = new TextDecoder('utf-8', { fatal: true }).decode(payloadBytes);
  } catch {
    throw new Error(`workspace SQL ${table} payload UTF-8 is invalid`);
  }
  const encodedText = new TextEncoder().encode(payload);
  if (
    decodedText !== payload ||
    encodedText.byteLength !== payloadBytes.byteLength ||
    !encodedText.every((byte, index) => byte === payloadBytes[index])
  )
    throw new Error(`workspace SQL ${table} payload bytes differ from text`);
  if (database) preflightPersistedJson(database, decodedText, table, maxNodes);
  const value: unknown = JSON.parse(decodedText);
  return { payload, payloadBytes, value };
}

export function decodeWorkspaceSqlPayload(
  payloadValue: unknown,
  bytesValue: unknown,
  table: string,
  database?: Database,
): DecodedPayload {
  return decodePayload(payloadValue, bytesValue, table, database);
}

function sqlColumns(
  table: 'agent_host_state',
  row: Record<string, unknown>,
): Extract<WorkspaceSqlColumns, { table: 'agent_host_state' }>;
function sqlColumns(
  table: 'agent_host_mastra_session_ledger',
  row: Record<string, unknown>,
): Extract<WorkspaceSqlColumns, { table: 'agent_host_mastra_session_ledger' }>;
function sqlColumns(
  table: 'agent_host_governance',
  row: Record<string, unknown>,
): Extract<WorkspaceSqlColumns, { table: 'agent_host_governance' }>;
function sqlColumns(table: WorkspaceSqlTable, row: Record<string, unknown>): WorkspaceSqlColumns;
function sqlColumns(table: WorkspaceSqlTable, row: Record<string, unknown>): WorkspaceSqlColumns {
  if (table === 'agent_host_state') {
    if (row.kind !== 'work' && row.kind !== 'ledger') throw new Error('workspace SQL Host state kind is invalid');
    return { table, kind: row.kind, id: sqlText(row.id, `${table}.id`) };
  }
  if (table === 'agent_host_mastra_session_ledger') {
    return {
      table,
      work_id: sqlText(row.work_id, `${table}.work_id`),
      attempt: sqlPositiveInteger(row.attempt, `${table}.attempt`),
    };
  }
  return {
    table,
    store_id: sqlText(row.store_id, `${table}.store_id`),
    kind: sqlText(row.kind, `${table}.kind`),
    record_key: sqlText(row.record_key, `${table}.record_key`),
  };
}

function integrityDigest(columns: WorkspaceSqlColumns, revision: number, workspaceId: string, value: unknown): string {
  if (columns.table === 'agent_host_state' && columns.kind === 'ledger') return coordinationLedgerDigest(value);
  if (columns.table === 'agent_host_governance')
    return canonicalJsonDigest({
      workspace_id: workspaceId,
      store_id: columns.store_id,
      kind: columns.kind,
      record_key: columns.record_key,
      revision,
      payload: value,
    });
  return canonicalJsonDigest(value);
}

function persistedNodeLimit(columns: WorkspaceSqlColumns): number {
  return columns.table === 'agent_host_state' && columns.kind === 'ledger' ? MAX_CANONICAL_BYTES : MAX_CANONICAL_NODES;
}

/** Decode persisted row bytes only. Domain eligibility and Host rights stay with their owners. */
export function decodeWorkspaceSqlRow(
  table: 'agent_host_state',
  input: unknown,
  expectedWorkspace: string,
  database?: Database,
): WorkspaceStateSqlRow;
export function decodeWorkspaceSqlRow(
  table: 'agent_host_mastra_session_ledger',
  input: unknown,
  expectedWorkspace: string,
  database?: Database,
): WorkspaceMastraSqlRow;
export function decodeWorkspaceSqlRow(
  table: 'agent_host_governance',
  input: unknown,
  expectedWorkspace: string,
  database?: Database,
): WorkspaceGovernanceSqlRow;
export function decodeWorkspaceSqlRow(
  table: WorkspaceSqlTable,
  input: unknown,
  expectedWorkspace: string,
  database?: Database,
): WorkspaceSqlRow;
export function decodeWorkspaceSqlRow(
  table: WorkspaceSqlTable,
  input: unknown,
  expectedWorkspace: string,
  database?: Database,
): WorkspaceSqlRow {
  const row = snapshotWorkspaceSqlProjection(input, expectedProjection(table), table);
  const workspaceId = sqlText(row.workspace_id, `${table}.workspace_id`);
  if (workspaceId !== expectedWorkspace) throw new Error(`workspace SQL ${table} row belongs to another workspace`);
  const revision = sqlPositiveInteger(row.revision, `${table}.revision`);
  const columns = sqlColumns(table, row);
  const payload = decodePayload(row.payload, row.raw_payload_bytes, table, database, persistedNodeLimit(columns));
  const digest = sqlText(row.digest, `${table}.digest`);
  if (digest !== integrityDigest(columns, revision, workspaceId, payload.value))
    throw new Error(`workspace SQL ${table} row integrity differs`);
  return { workspace_id: workspaceId, revision, digest, ...payload, ...columns };
}

/** SQL rejects oversized bodies before Bun materializes TEXT and raw bytes. */
export const boundedWorkspacePayloadProjection =
  `CASE WHEN length(CAST(payload AS BLOB))<=${MAX_CANONICAL_BYTES} THEN payload ELSE NULL END AS payload,` +
  `CASE WHEN length(CAST(payload AS BLOB))<=${MAX_CANONICAL_BYTES} THEN CAST(payload AS BLOB) ELSE NULL END AS raw_payload_bytes`;

/** One primary-key read and exact byte decoder; callers retain domain and authority checks. */
export function readWorkspaceMastraSqlRow(
  database: Database,
  workspaceId: string,
  workId: string,
  attempt: number,
): WorkspaceMastraSqlRow | null {
  const row = queryWorkspaceRowUnknown(
    database,
    'SELECT workspace_id,work_id,attempt,revision,digest,' +
      boundedWorkspacePayloadProjection +
      ' FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
    [workspaceId, workId, attempt],
  );
  return row === null ? null : decodeWorkspaceSqlRow('agent_host_mastra_session_ledger', row, workspaceId, database);
}

/** Latest-row selection stays an indexed query inside the caller's existing snapshot. */
export function readLatestWorkspaceMastraSqlRow(
  database: Database,
  workspaceId: string,
  workId: string,
): WorkspaceMastraSqlRow | null {
  const row = queryWorkspaceRowUnknown(
    database,
    'SELECT workspace_id,work_id,attempt,revision,digest,' +
      boundedWorkspacePayloadProjection +
      ' FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
    [workspaceId, workId],
  );
  return row === null ? null : decodeWorkspaceSqlRow('agent_host_mastra_session_ledger', row, workspaceId, database);
}

/** An explicit attempt stays exact; omitted attempts retain indexed latest selection. */
export function readSelectedWorkspaceMastraSqlRow(
  database: Database,
  workspaceId: string,
  workId: string,
  attempt?: number,
): WorkspaceMastraSqlRow | null {
  if (attempt === undefined) return readLatestWorkspaceMastraSqlRow(database, workspaceId, workId);
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new Error('workspace SQL session attempt is invalid');
  return readWorkspaceMastraSqlRow(database, workspaceId, workId, attempt);
}

/** Exact current state row; its decoder owns canonical integrity once. */
export function readWorkspaceStateSqlRow(
  database: Database,
  workspaceId: string,
  kind: 'work' | 'ledger',
  id: string,
): WorkspaceStateSqlRow | null {
  const row = queryWorkspaceRowUnknown(
    database,
    'SELECT workspace_id,kind,id,revision,digest,' +
      boundedWorkspacePayloadProjection +
      ' FROM agent_host_state WHERE workspace_id=? AND kind=? AND id=?',
    [workspaceId, kind, id],
  );
  return row === null ? null : decodeWorkspaceSqlRow('agent_host_state', row, workspaceId, database);
}
