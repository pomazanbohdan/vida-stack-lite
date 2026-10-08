import { Database } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import workSchema from '../../schemas/work-state.v1.schema.json' with { type: 'json' };
import { canonicalJsonDigest, isPlainRecord } from '../contracts/public-ingress.js';
import { validateCoordinationLedgerV1 } from '../contracts/envelopes.js';
import type { WorkState } from '../host-state.js';
import { deriveWorkspaceId } from '../workspace-identity.js';
import type { AgentRuntimeConfig } from '../config/runtime-config.js';

type Row = { revision: number; payload: string; digest: string; value: unknown };
const AjvConstructor = Ajv2020 as unknown as new (options: object) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const validWork = new AjvConstructor({ allErrors: true }).compile<WorkState>(workSchema);

function journalItems(value: unknown) {
  if (!Array.isArray(value)) throw new Error('local session inspection: journal items are invalid');
  const items: readonly unknown[] = value;
  return items.map(item => {
    if (!isPlainRecord(item) || (item.issue_id !== null && typeof item.issue_id !== 'string') ||
        !isPlainRecord(item.request) || typeof item.request.action_id !== 'string' ||
        typeof item.request.stage_id !== 'string' || !Object.hasOwn(item, 'observation'))
      throw new Error('local session inspection: journal item is invalid');
    return {issue_id: item.issue_id, observation: item.observation,
      request: {action_id: item.request.action_id, stage_id: item.request.stage_id}};
  });
}

function readRow(db: Database, table: string, args: readonly (string | number)[]): Row | null {
  const key =
    table === 'agent_host_mastra_session_ledger'
      ? 'workspace_id=? AND work_id=? AND attempt=?'
      : 'workspace_id=? AND kind=? AND id=?';
  const row = db.query(`SELECT revision,payload,digest FROM ${table} WHERE ${key}`).get(...args) as Omit<Row, 'value'> | null;
  if (!row) return null;
  const value: unknown = JSON.parse(row.payload);
  if (
    !Number.isSafeInteger(row.revision) ||
    row.revision < 1 ||
    canonicalJsonDigest(value) !== row.digest
  )
    throw new Error('local session inspection: persisted row is invalid');
  return {...row, value};
}

/** Pure persisted-state inspection; it never constructs an execution capability. */
export function inspectLocalSession(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly projectIds: readonly string[];
  readonly integrationsDigest: string;
  readonly workId: string;
  readonly attempt: number;
}) {
  const databasePath = path.join(input.repositoryRoot, input.config.control.work_root, 'session-handoff.v1.sqlite');
  const stat = lstatSync(databasePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)
    throw new Error('local session inspection: database path is unsafe');
  const db = new Database(databasePath, { readonly: true });
  try {
    const workspaceId = deriveWorkspaceId(input.config.repository.repository_id, input.repositoryRoot);
    const workKey = JSON.stringify([
      input.config.repository.repository_id,
      input.projectIds,
      input.integrationsDigest,
      input.workId,
    ]);
    const journal = readRow(db, 'agent_host_mastra_session_ledger', [workspaceId, input.workId, input.attempt]);
    const work = readRow(db, 'agent_host_state', [workspaceId, 'work', workKey]);
    const ledger = readRow(db, 'agent_host_state', [workspaceId, 'ledger', 'shared']);
    const journalState = journal ? journal.value : null;
    const workState = work ? work.value : null;
    const ledgerResult = ledger ? validateCoordinationLedgerV1(ledger.value) : null;
    if (
      journal &&
      (!isPlainRecord(journalState) || journalState.schema !== 'MastraSessionLedger/v1' ||
        journalState.workspace_id !== workspaceId ||
        journalState.work_id !== input.workId ||
        journalState.attempt !== input.attempt ||
        !Array.isArray(journalState.items))
    )
      throw new Error('local session inspection: journal identity is invalid');
    if (
      work &&
      (!validWork(workState) ||
        workState.workspace_id !== workspaceId ||
        workState.binding.lifecycle_work_id !== input.workId)
    )
      throw new Error('local session inspection: work identity is invalid');
    if (
      ledger &&
      (!ledgerResult?.ok || ledgerResult.ledger.workspace_id !== workspaceId)
    )
      throw new Error('local session inspection: coordination ledger is invalid');
    const inspectedWork = work && validWork(workState) ? workState : null;
    const ledgerState = ledgerResult?.ok ? ledgerResult.ledger : null;
    const items = journal && isPlainRecord(journalState) ? journalItems(journalState.items) : [];
    const lease = inspectedWork?.lease ?? null;
    const ticket = ledgerState?.tickets.find((entry: { ticket_id: string }) => entry.ticket_id === lease?.ticket_id);
    const pending =
      items
        .filter(
          (item) =>
            item.issue_id !== null && item.observation === null,
        )
        .map((item) => ({
          action_id: item.request.action_id,
          issue_id: item.issue_id,
          stage_id: item.request.stage_id,
        })) ?? [];
    return {
      schema: 'VidaLocalSessionInspection/v1',
      status: 'inspected',
      work_id: input.workId,
      attempt: input.attempt,
      journal_version: journal && { revision: journal.revision, digest: journal.digest },
      work_version: work && { revision: work.revision, digest: work.digest },
      ledger_version: ledger && { revision: ledger.revision, digest: ledger.digest },
      lifecycle_phase: inspectedWork?.lifecycle.phase ?? null,
      execution_status: inspectedWork?.execution.status ?? null,
      lease: lease && {
        ticket_id: lease.ticket_id,
        thread_id: lease.thread_id,
        generation: lease.generation,
        expires_at: ticket?.expires_at ?? null,
        expired: !ticket?.expires_at || Date.parse(ticket.expires_at) <= Date.now(),
      },
      pending_actions: pending,
      recovery_required:
        pending.length > 0 || Boolean(lease && (!ticket?.expires_at || Date.parse(ticket.expires_at) <= Date.now())),
    };
  } finally {
    db.close(true);
  }
}
