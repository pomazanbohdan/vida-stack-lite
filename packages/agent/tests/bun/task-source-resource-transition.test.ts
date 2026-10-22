import { expect, test } from 'bun:test';
import { expectRejection } from '../helpers/expect-rejection.ts';
import {
  createTaskSourceHostFixture,
  requireHostState,
  trustedTaskSourcePolicyDecision,
} from '../helpers/task-source-host-fixture.ts';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import {
  createTaskSourceResourceTransitionReceipt,
  parseTaskSourceResourceTransitionReceipt,
  rewindTaskSourceResourceBinding,
} from '../../src/orchestration/task-source-resource-transition.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';

test('TaskSource resource history rolls back with native Ledger and late action faults before exact retry', async () => {
  const deadline = performance.now() + 5_000;
  const f = createTaskSourceHostFixture({
    policyVerifier: async ({ request }) => trustedTaskSourcePolicyDecision(request),
  });
  let completed = false,
    failure: { error: unknown } | undefined;
  try {
    f.prepare();
    const before = f.store.readHostStateSnapshot(f.identity);
    requireHostState(before);
    const journal = f.store.readWorkSessionJournal(f.identity);
    // An empty table carries no operation authority; its exact v1 schema permits a late native fault.
    f.database.exec(
      'CREATE TABLE agent_host_task_source_binding_action (workspace_id TEXT NOT NULL,operation_id TEXT NOT NULL,request_id TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(workspace_id,operation_id),UNIQUE(workspace_id,request_id))',
    );
    const schema = () => f.database.query('SELECT name,sql FROM sqlite_master ORDER BY name').all();
    const originalSchema = schema();
    const preparedRows = () =>
      f.database
        .query('SELECT * FROM agent_host_task_source_binding_operation ORDER BY workspace_id,operation_id')
        .all();
    const prepared = preparedRows();
    for (const fault of [
      {
        name: 'resource_ledger_fault',
        sql: "CREATE TEMP TRIGGER resource_ledger_fault BEFORE UPDATE ON agent_host_state WHEN NEW.kind='ledger' BEGIN SELECT RAISE(ABORT,'controlled resource Ledger fault'); END",
        error: 'controlled resource Ledger fault',
      },
      {
        name: 'resource_action_fault',
        sql: "CREATE TEMP TRIGGER resource_action_fault BEFORE INSERT ON agent_host_task_source_binding_action BEGIN SELECT CASE WHEN (SELECT COUNT(*) FROM agent_host_task_source_resource_transition)<>1 THEN RAISE(ABORT,'resource receipt missing before action') END; SELECT RAISE(ABORT,'controlled late TaskSource action fault'); END",
        error: 'controlled late TaskSource action fault',
      },
    ]) {
      f.database.exec(fault.sql);
      let faultFailure: { error: unknown } | undefined;
      try {
        await expectRejection(
          f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity }),
          fault.error,
        );
      } catch (error) {
        faultFailure = { error };
        throw error;
      } finally {
        completeOwnedCleanup(
          [
            () => {
              f.database.exec('DROP TRIGGER ' + fault.name);
            },
          ],
          faultFailure,
        );
      }
      expect(f.database.inTransaction).toBe(false);
      expect(f.store.readHostStateSnapshot(f.identity)).toEqual(before);
      expect(f.store.readWorkSessionJournal(f.identity)).toEqual(journal);
      expect(preparedRows()).toEqual(prepared);
      expect(f.database.query('SELECT * FROM agent_host_task_source_binding_action').all()).toEqual([]);
      expect(schema()).toEqual(originalSchema);
      expect(
        f.database
          .query("SELECT name FROM sqlite_master WHERE name='agent_host_task_source_resource_transition'")
          .get(),
      ).toBeNull();
    }
    const issued = await f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity });
    expect(issued.status).toBe('issued');
    const after = f.store.readHostStateSnapshot(f.identity);
    requireHostState(after);
    const rows = f.database
      .query<{ payload: string; digest: string }, [string, string]>(
        'SELECT payload,digest FROM agent_host_task_source_resource_transition WHERE workspace_id=? AND operation_id=?',
      )
      .all(f.store.workspaceId, f.request.operation_id);
    expect(rows).toHaveLength(1);
    const receipt = parseTaskSourceResourceTransitionReceipt(JSON.parse(rows[0]!.payload));
    expect(rows[0]!.digest).toBe(canonicalJsonDigest(receipt));
    expect(receipt.ticket.status_at_issue).toBe('active');
    expect(receipt.added_resources).toEqual(
      [`branch:${f.request.branch_ref}`, `worktree:${f.request.source_root}`].sort(),
    );
    expect(rewindTaskSourceResourceBinding(after.work, after.work.binding, receipt)).toEqual(before.work.binding);
    expect(() =>
      rewindTaskSourceResourceBinding(
        { ...after.work, revision: receipt.prior_work_version.revision },
        after.work.binding,
        receipt,
      ),
    ).toThrow('receipt is future');
    expect(() =>
      rewindTaskSourceResourceBinding(after.work, { ...after.work.binding, lifecycle_work_id: 'foreign' }, receipt),
    ).toThrow('identity differs');
    const operation = JSON.parse(String((prepared[0] as { payload: string }).payload)) as { authority: unknown };
    const input = {
      request: f.request,
      prepared_state_version: receipt.prepared_state_version,
      authority: operation.authority,
      before,
      nextWork: after.work,
      nextLedger: after.ledger,
      additions: receipt.added_resources,
    };
    expect(createTaskSourceResourceTransitionReceipt(input)).toEqual(receipt);
    expect(() =>
      createTaskSourceResourceTransitionReceipt({
        ...input,
        nextLedger: { ...after.ledger, next_sequence: after.ledger.next_sequence + 1 },
      }),
    ).toThrow('Ledger postimage differs from exact reservation');
    expect(createTaskSourceResourceTransitionReceipt({ ...input, additions: [] })).toBeUndefined();
    expect(await f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity })).toEqual({
      ...issued,
      status: 'already_issued',
      command_argv: null,
    });
    expect(f.store.readHostStateSnapshot(f.identity)).toEqual(after);
    expect(
      f.database
        .query(
          'SELECT payload,digest FROM agent_host_task_source_resource_transition WHERE workspace_id=? AND operation_id=?',
        )
        .all(f.store.workspaceId, f.request.operation_id),
    ).toEqual(rows);
    expect(performance.now()).toBeLessThan(deadline);
    completed = true;
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(false, completed ? 'issued proposal without observation; no replay' : 'failed');
        },
      ],
      failure,
    );
  }
});
