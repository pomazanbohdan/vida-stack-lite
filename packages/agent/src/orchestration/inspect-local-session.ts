import { Database } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { deriveWorkspaceId } from '../workspace-identity.js';
import type { AgentRuntimeConfig } from '../config/runtime-config.js';

type Row = { revision: number; payload: string; digest: string };

function readRow(db: Database, table: string, args: readonly (string | number)[]): Row | null {
  const key =
    table === 'agent_host_mastra_session_ledger'
      ? 'workspace_id=? AND work_id=? AND attempt=?'
      : 'workspace_id=? AND kind=? AND id=?';
  const row = db.query(`SELECT revision,payload,digest FROM ${table} WHERE ${key}`).get(...args) as Row | null;
  if (!row) return null;
  if (
    !Number.isSafeInteger(row.revision) ||
    row.revision < 1 ||
    canonicalJsonDigest(JSON.parse(row.payload)) !== row.digest
  )
    throw new Error('local session inspection: persisted row is invalid');
  return row;
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
    const journalState = journal ? JSON.parse(journal.payload) : null;
    const workState = work ? JSON.parse(work.payload) : null;
    const ledgerState = ledger ? JSON.parse(ledger.payload) : null;
    if (
      journalState &&
      (journalState.schema !== 'MastraSessionLedger/v1' ||
        journalState.workspace_id !== workspaceId ||
        journalState.work_id !== input.workId ||
        journalState.attempt !== input.attempt ||
        !Array.isArray(journalState.items))
    )
      throw new Error('local session inspection: journal identity is invalid');
    if (
      workState &&
      (workState.schema !== 'WorkState/v1' ||
        workState.workspace_id !== workspaceId ||
        workState.binding.lifecycle_work_id !== input.workId)
    )
      throw new Error('local session inspection: work identity is invalid');
    if (
      ledgerState &&
      (ledgerState.schema !== 'CoordinationLedger/v1' ||
        ledgerState.workspace_id !== workspaceId ||
        !Array.isArray(ledgerState.tickets))
    )
      throw new Error('local session inspection: coordination ledger is invalid');
    const lease = workState?.lease ?? null;
    const ticket = ledgerState?.tickets.find((entry: { ticket_id: string }) => entry.ticket_id === lease?.ticket_id);
    const pending =
      journalState?.items
        .filter(
          (item: { issue_id: string | null; observation: unknown }) =>
            item.issue_id !== null && item.observation === null,
        )
        .map((item: { issue_id: string; request: { action_id: string; stage_id: string } }) => ({
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
      lifecycle_phase: workState?.lifecycle.phase ?? null,
      execution_status: workState?.execution.status ?? null,
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
    db.close();
  }
}
