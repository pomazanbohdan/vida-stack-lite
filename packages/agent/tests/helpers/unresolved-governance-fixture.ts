import type { Database } from 'bun:sqlite';
import { isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { validateHostOperationReservation } from '../../src/governance/edictum-boundary.ts';

/** Case completion does not authorize disposal of unresolved or unreadable operation evidence. */
export function hasUnresolvedFixtureOperations(database: Database): boolean {
  try {
    const rows: readonly unknown[] = database
      .query("SELECT payload FROM agent_host_governance WHERE kind='operation'")
      .all();
    return rows.some((row) => {
      if (!isPlainRecord(row) || typeof row.payload !== 'string') return true;
      try {
        const operation = validateHostOperationReservation(JSON.parse(row.payload));
        return operation.status === 'reserved' || operation.status === 'commit_unknown';
      } catch {
        return true;
      }
    });
  } catch {
    return true;
  }
}
