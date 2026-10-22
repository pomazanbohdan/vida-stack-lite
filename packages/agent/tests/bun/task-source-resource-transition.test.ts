import { expect, test } from 'bun:test';
import { expectAsyncReturned, expectRejection, expectReturned } from '../helpers/expect-rejection.ts';
import {
  createTaskSourceHostFixture,
  requireHostState,
  trustedTaskSourcePolicyDecision,
} from '../helpers/task-source-host-fixture.ts';
import { canonicalJson, canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import { coordinationLedgerDigest } from '../../src/contracts/envelopes.ts';
import {
  createTaskSourceResourceTransitionReceipt,
  parseTaskSourceResourceTransitionReceipt,
  rewindTaskSourceResourceBinding,
  validateJoinedPreparedTaskSourceOperation,
  taskSourceReservationLedger,
  type JoinedPreparedOperationRow,
  type TaskSourceResourceTransitionInput,
  type TaskSourceResourceTransitionReceipt,
} from '../../src/orchestration/task-source-resource-transition.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';

async function withResourceTransitionFixture(
  body: (context: {
    f: ReturnType<typeof createTaskSourceHostFixture>;
    input: TaskSourceResourceTransitionInput;
    receipt: TaskSourceResourceTransitionReceipt;
    row: JoinedPreparedOperationRow;
  }) => void | Promise<void>,
  options: {
    retainedResources?: readonly string[];
    queued?: boolean;
    rotate?: boolean;
    operation?: 'propose-create' | 'propose-adopt';
  } = {},
): Promise<void> {
  const deadline = performance.now() + 5_000;
  const f = createTaskSourceHostFixture({
    retainedResources: options.retainedResources ?? [],
    policyVerifier: async ({ request }) => trustedTaskSourcePolicyDecision(request),
  });
  let completed = false,
    failure: { error: unknown } | undefined;
  try {
    if (options.rotate) f.rotateOwnerReservation();
    if (options.queued) f.seedPeerReservation();
    const request = { ...f.request, operation: options.operation ?? f.request.operation };
    expectReturned(() =>
      f.store.prepareTaskSourceBindingOperation({
        request,
        identity: f.identity,
        verifyCurrent: f.trustedVerifyCurrent,
      }),
    );
    const before = expectReturned(() => f.store.readHostStateSnapshot(f.identity));
    requireHostState(before);
    const issued = await expectAsyncReturned(() =>
      f.store.issueTaskSourceBindingOperation({ request, identity: f.identity }),
    );
    expect(issued.status).toBe(options.queued ? 'queued' : 'issued');
    const after = expectReturned(() => f.store.readHostStateSnapshot(f.identity));
    requireHostState(after);
    const stored = f.database
      .query<{ payload: string; digest: string }, [string, string]>(
        'SELECT payload,digest FROM agent_host_task_source_resource_transition WHERE workspace_id=? AND operation_id=?',
      )
      .get(f.store.workspaceId, f.request.operation_id);
    if (!stored) throw new Error('Native resource receipt is missing');
    const candidate: unknown = JSON.parse(stored.payload);
    const receipt = expectReturned(() => parseTaskSourceResourceTransitionReceipt(candidate));
    expect(canonicalJsonDigest(receipt)).toBe(stored.digest);
    const row = f.database
      .query<JoinedPreparedOperationRow, [string, string]>(
        'SELECT workspace_id,operation_id,request_id,request_digest,revision,payload,digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
      )
      .get(f.store.workspaceId, f.request.operation_id);
    if (!row || typeof row.payload !== 'string') throw new Error('Native prepared row is missing');
    const operation: unknown = JSON.parse(row.payload);
    if (!isPlainRecord(operation)) throw new Error('Native prepared operation is not a record');
    await body({
      f,
      receipt,
      row,
      input: {
        request,
        prepared_state_version: receipt.prepared_state_version,
        authority: operation.authority,
        before,
        nextWork: after.work,
        nextLedger: after.ledger,
        additions: receipt.added_resources,
      },
    });
    expect(performance.now()).toBeLessThan(deadline);
    completed = true;
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          f.close(false, completed ? 'reserved proposal without observation; no replay' : 'failed');
          if (performance.now() >= deadline) throw new Error('Resource fixture cleanup exhausted its deadline');
        },
      ],
      failure,
    );
  }
}

test('TaskSource receipt construction rejects detached CAS, authority, resource and ticket changes', async () => {
  await withResourceTransitionFixture(({ input, receipt }) => {
    requireHostState(input.before);
    const before = input.before,
      work = before.work,
      ledger = before.ledger;
    if (!isPlainRecord(input.authority)) throw new Error('Native prepared authority is not a record');
    const prior = ledger.tickets.find((ticket) => ticket.ticket_id === work.lease?.ticket_id);
    const issued = input.nextLedger.tickets.find((ticket) => ticket.ticket_id === receipt.ticket.ticket_id);
    if (!prior || !issued) throw new Error('Native reservation tickets missing');
    const cases: readonly [string, TaskSourceResourceTransitionInput, string][] = [
      ['no Work', { ...input, before: { ...before, work: null } }, 'complete Host before snapshot'],
      ['no Ledger', { ...input, before: { ...before, ledger: null } }, 'complete Host before snapshot'],
      ['no Work version', { ...input, before: { ...before, workVersion: null } }, 'complete Host before snapshot'],
      ['no Ledger version', { ...input, before: { ...before, ledgerVersion: null } }, 'complete Host before snapshot'],
      ['bad authority', { ...input, authority: {} }, 'authority shape invalid'],
      [
        'foreign authority scope',
        { ...input, authority: { ...input.authority, source_scope_digest: '0'.repeat(64) } },
        'identity or authority scope differs',
      ],
      [
        'bad prepared version',
        { ...input, prepared_state_version: { revision: 0, digest: receipt.prepared_state_version.digest } },
        'invalid StateVersion',
      ],
      [
        'fractional prepared version',
        { ...input, prepared_state_version: { revision: 1.5, digest: receipt.prepared_state_version.digest } },
        'invalid StateVersion',
      ],
      [
        'bad prepared digest',
        { ...input, prepared_state_version: { ...input.prepared_state_version, digest: 'bad' } },
        'invalid StateVersion',
      ],
      [
        'stale before version',
        {
          ...input,
          before: { ...before, workVersion: { ...before.workVersion, revision: before.workVersion.revision + 1 } },
        },
        'StateVersions do not match',
      ],
      [
        'missing resource',
        {
          ...input,
          nextWork: {
            ...input.nextWork,
            binding: { ...input.nextWork.binding, allowed_resources: work.binding.allowed_resources },
          },
        },
        'resource missing from successor',
      ],
      ['foreign additions', { ...input, additions: ['branch:refs/heads/foreign'] }, 'additions or prepared authority'],
      [
        'unsorted additions',
        { ...input, additions: [...input.additions].reverse() },
        'CAS versions or additions differ',
      ],
      [
        'foreign successor',
        { ...input, nextWork: { ...input.nextWork, workspace_id: 'foreign' } },
        'identity or authority scope differs',
      ],
      [
        'changed Work epoch',
        { ...input, nextWork: { ...input.nextWork, revision: input.nextWork.revision + 1 } },
        'CAS versions or additions differ',
      ],
      [
        'changed Ledger epoch',
        { ...input, nextLedger: { ...input.nextLedger, revision: input.nextLedger.revision + 1 } },
        'CAS versions or additions differ',
      ],
      [
        'changed successor binding',
        {
          ...input,
          nextWork: { ...input.nextWork, binding: { ...input.nextWork.binding, scope_id: 'foreign' } },
        },
        'Work postimage differs',
      ],
      [
        'changed protected Work',
        {
          ...input,
          nextWork: {
            ...input.nextWork,
            execution: { ...input.nextWork.execution, input_digest: 'f'.repeat(64) },
          },
        },
        'Work postimage differs',
      ],
      [
        'no predecessor',
        {
          ...input,
          before: {
            ...before,
            work: { ...work, lease: null },
            workVersion: { revision: work.revision, digest: canonicalJsonDigest({ ...work, lease: null }) },
          },
        },
        'active predecessor ticket',
      ],
      [
        'duplicate predecessor',
        { ...input, before: { ...before, ledger: { ...ledger, tickets: [...ledger.tickets, prior] } } },
        'ticket identifiers contains aliases or duplicate identifiers',
      ],
      [
        'duplicate issued ticket',
        { ...input, nextLedger: { ...input.nextLedger, tickets: [...input.nextLedger.tickets, issued] } },
        'duplicate TaskSource reservation ticket',
      ],
      [
        'missing issued ticket',
        {
          ...input,
          nextLedger: {
            ...input.nextLedger,
            tickets: input.nextLedger.tickets.filter((ticket) => ticket.ticket_id !== issued.ticket_id),
          },
        },
        'issued TaskSource ticket is missing',
      ],
      [
        'terminal issued ticket',
        {
          ...input,
          nextLedger: {
            ...input.nextLedger,
            tickets: input.nextLedger.tickets.map((ticket) =>
              ticket.ticket_id === issued.ticket_id ? { ...ticket, status: 'released' as const } : ticket,
            ),
          },
        },
        'ticket status differs',
      ],
      [
        'foreign issued resources',
        {
          ...input,
          nextLedger: {
            ...input.nextLedger,
            tickets: input.nextLedger.tickets.map((ticket) =>
              ticket.ticket_id === issued.ticket_id ? { ...ticket, exclusive_resources: [] } : ticket,
            ),
          },
        },
        'ticket projection differs',
      ],
      [
        'foreign issued Source revision',
        {
          ...input,
          nextLedger: {
            ...input.nextLedger,
            tickets: input.nextLedger.tickets.map((ticket) =>
              ticket.ticket_id === issued.ticket_id ? { ...ticket, source_revision: 'foreign' } : ticket,
            ),
          },
        },
        'ticket projection differs',
      ],
    ];
    for (const [name, changed, message] of cases)
      expect(() => createTaskSourceResourceTransitionReceipt(changed), name).toThrow(message);
    expect(createTaskSourceResourceTransitionReceipt(input)).toEqual(receipt);
  });
});

test('TaskSource persisted receipt parser rejects detached schema, ordering and ticket alternatives', async () => {
  await withResourceTransitionFixture(({ receipt }) => {
    const cases: readonly [string, unknown][] = [
      ['missing schema', Object.fromEntries(Object.entries(receipt).filter(([key]) => key !== 'schema'))],
      ['extra field', { ...receipt, unrecognized: true }],
      ['bad digest', { ...receipt, authority_digest: 'bad' }],
      [
        'Work revision jump',
        {
          ...receipt,
          successor_work_version: {
            ...receipt.successor_work_version,
            revision: receipt.successor_work_version.revision + 1,
          },
        },
      ],
      [
        'Ledger revision jump',
        {
          ...receipt,
          successor_ledger_version: {
            ...receipt.successor_ledger_version,
            revision: receipt.successor_ledger_version.revision + 1,
          },
        },
      ],
      [
        'wrong predecessor',
        {
          ...receipt,
          prior_work_version: { ...receipt.prior_work_version, revision: receipt.prior_work_version.revision + 1 },
        },
      ],
      ['unsorted additions', { ...receipt, added_resources: [...receipt.added_resources].reverse() }],
      ['foreign addition', { ...receipt, added_resources: ['branch:refs/heads/foreign'] }],
      ['foreign ticket', { ...receipt, ticket: { ...receipt.ticket, work_id: 'foreign' } }],
      [
        'unsorted ticket resources',
        {
          ...receipt,
          ticket: { ...receipt.ticket, exclusive_resources: [...receipt.ticket.exclusive_resources].reverse() },
        },
      ],
      [
        'duplicate resources',
        {
          ...receipt,
          ticket: {
            ...receipt.ticket,
            exclusive_resources: [...receipt.ticket.exclusive_resources, receipt.ticket.exclusive_resources[0]],
          },
        },
      ],
      ['foreign integrations', { ...receipt, ticket: { ...receipt.ticket, integrations_digest: '0'.repeat(64) } }],
      [
        'omitted request resource',
        {
          ...receipt,
          ticket: {
            ...receipt.ticket,
            exclusive_resources: receipt.ticket.exclusive_resources.filter(
              (resource) => resource !== 'branch:' + receipt.request.branch_ref,
            ),
          },
        },
      ],
    ];
    for (const [name, changed] of cases)
      expect(() => parseTaskSourceResourceTransitionReceipt(changed), name).toThrow();
    expect(parseTaskSourceResourceTransitionReceipt(receipt)).toEqual(receipt);
  });
});

test('TaskSource prepared join retains exact row bytes through identity, shape and checksum refusals', async () => {
  await withResourceTransitionFixture(({ f, receipt, row }) => {
    if (typeof row.revision !== 'number' || typeof row.payload !== 'string')
      throw new Error('Native prepared row types differ');
    const cases: readonly [string, JoinedPreparedOperationRow][] = [
      ['workspace', { ...row, workspace_id: 'foreign' }],
      ['operation', { ...row, operation_id: 'foreign' }],
      ['work projection', { ...row, work_id: 'foreign' }],
      ['request', { ...row, request_id: 'foreign' }],
      ['request digest', { ...row, request_digest: '0'.repeat(64) }],
      ['revision', { ...row, revision: row.revision + 1 }],
      ['digest', { ...row, digest: '0'.repeat(64) }],
      ['missing payload', { ...row, payload: null }],
      ['invalid JSON', { ...row, payload: '{' }],
      ['invalid envelope', { ...row, payload: '{}' }],
    ];
    for (const [name, changed] of cases)
      expect(() => validateJoinedPreparedTaskSourceOperation(receipt, changed), name).toThrow();
    const operation: unknown = JSON.parse(row.payload);
    if (!isPlainRecord(operation)) throw new Error('Native prepared operation is not a record');
    const noncanonical = { ...row, payload: JSON.stringify(operation, null, 2) };
    expect(() => validateJoinedPreparedTaskSourceOperation(receipt, noncanonical)).toThrow(
      'row identity, checksum, or StateVersion differs',
    );
    const invalidTime = { ...operation, created_at: 'not-a-date' };
    const invalidTimeDigest = canonicalJsonDigest(invalidTime);
    expect(() =>
      validateJoinedPreparedTaskSourceOperation(
        { ...receipt, prepared_state_version: { ...receipt.prepared_state_version, digest: invalidTimeDigest } },
        { ...row, payload: canonicalJson(invalidTime), digest: invalidTimeDigest },
      ),
    ).toThrow('row identity, checksum, or StateVersion differs');
    expect(() =>
      validateJoinedPreparedTaskSourceOperation({ ...receipt, authority_digest: '0'.repeat(64) }, row),
    ).toThrow('prepared request or authority differs');
    expect(validateJoinedPreparedTaskSourceOperation(receipt, row).state_version).toEqual(
      receipt.prepared_state_version,
    );
    expect(
      validateJoinedPreparedTaskSourceOperation(receipt, { ...row, work_id: f.identity.work_id }).state_version,
    ).toEqual(receipt.prepared_state_version);
    expect(
      f.database
        .query<JoinedPreparedOperationRow, [string, string]>(
          'SELECT workspace_id,operation_id,request_id,request_digest,revision,payload,digest FROM agent_host_task_source_binding_operation WHERE workspace_id=? AND operation_id=?',
        )
        .get(f.store.workspaceId, f.request.operation_id),
    ).toEqual(row);
  });
});

test('TaskSource native queued receipt retains the original owner and unrelated peer', async () => {
  await withResourceTransitionFixture(
    ({ input, receipt }) => {
      requireHostState(input.before);
      expect(receipt.ticket.status_at_issue).toBe('queued');
      expect(input.nextWork.lease).toEqual(input.before.work.lease);
      expect(input.nextLedger.claims).toEqual(input.before.ledger.claims);
      expect(input.nextLedger.operations).toEqual(input.before.ledger.operations);
      for (const ticket of input.before.ledger.tickets) expect(input.nextLedger.tickets).toContainEqual(ticket);
      expect(createTaskSourceResourceTransitionReceipt(input)).toEqual(receipt);
      expect(() =>
        createTaskSourceResourceTransitionReceipt({
          ...input,
          before: { ...input.before, ledger: input.nextLedger, ledgerVersion: receipt.successor_ledger_version },
        }),
      ).toThrow('resource addition must be the first ticket reservation');
    },
    { queued: true },
  );
});

test('TaskSource native adoption reserves the requested pair without observing a binding', async () => {
  await withResourceTransitionFixture(
    ({ f, input, receipt, row }) => {
      requireHostState(input.before);
      expect(receipt.request.operation).toBe('propose-adopt');
      expect(receipt.ticket.status_at_issue).toBe('active');
      expect(receipt.added_resources).toEqual(
        [`branch:${receipt.request.branch_ref}`, `worktree:${receipt.request.source_root}`].sort(),
      );
      expect(expectReturned(() => createTaskSourceResourceTransitionReceipt(input))).toEqual(receipt);
      expect(expectReturned(() => validateJoinedPreparedTaskSourceOperation(receipt, row)).state_version).toEqual(
        receipt.prepared_state_version,
      );
      expect(rewindTaskSourceResourceBinding(input.nextWork, input.nextWork.binding, receipt)).toEqual(
        input.before.work.binding,
      );
      expect(f.store.readHostStateSnapshot(f.identity).work).toEqual(input.nextWork);
    },
    { operation: 'propose-adopt' },
  );
});

test('TaskSource rewind binds successor bytes and preserves a later candidate without accepting altered history', async () => {
  await withResourceTransitionFixture(({ input, receipt }) => {
    requireHostState(input.before);
    const work = input.nextWork,
      binding = work.binding;
    expect(rewindTaskSourceResourceBinding({ ...work, revision: work.revision + 1 }, binding, receipt)).toEqual(
      input.before.work.binding,
    );
    expect(() => rewindTaskSourceResourceBinding({ ...work, workspace_id: 'foreign' }, binding, receipt)).toThrow(
      'identity differs',
    );
    expect(() =>
      rewindTaskSourceResourceBinding(
        { ...work, execution: { ...work.execution, input_digest: 'f'.repeat(64) } },
        binding,
        receipt,
      ),
    ).toThrow('future or does not match successor');
    const extended = { ...binding, allowed_resources: [...binding.allowed_resources, 'execution:foreign'] };
    expect(() => rewindTaskSourceResourceBinding(work, extended, receipt)).toThrow(
      'future or does not match successor',
    );
    const missing = {
      ...binding,
      allowed_resources: binding.allowed_resources.filter((resource) => resource !== receipt.added_resources[0]),
    };
    const missingWork = { ...work, binding: missing };
    expect(() =>
      rewindTaskSourceResourceBinding(missingWork, missing, {
        ...receipt,
        successor_binding_digest: canonicalJsonDigest(missing),
        successor_work_version: { revision: missingWork.revision, digest: canonicalJsonDigest(missingWork) },
      }),
    ).toThrow('request resource missing from successor');
    expect(() =>
      rewindTaskSourceResourceBinding(work, binding, { ...receipt, added_resources: receipt.added_resources.slice(1) }),
    ).toThrow('rewind differs from prior binding digest');
  });
});

test('TaskSource native single-resource addition preserves retained resources and released history', async () => {
  await withResourceTransitionFixture(
    ({ input, receipt }) => {
      requireHostState(input.before);
      expect(receipt.added_resources).toHaveLength(1);
      expect(receipt.added_resources[0]).toMatch(/^worktree:/);
      for (const resource of input.before.work.binding.allowed_resources)
        expect(input.nextWork.binding.allowed_resources).toContain(resource);
      const historical = input.before.ledger.claims.filter((claim) => claim.status !== 'active');
      expect(historical.length).toBeGreaterThan(0);
      for (const claim of historical) expect(input.nextLedger.claims).toContainEqual(claim);
      expect(createTaskSourceResourceTransitionReceipt(input)).toEqual(receipt);
      const prior = input.before.ledger.tickets.find(
        (ticket) => ticket.ticket_id === input.before.work!.lease?.ticket_id,
      );
      if (!prior) throw new Error('Native rotated predecessor missing');
      const duplicated = { ...input.before.ledger, tickets: [...input.before.ledger.tickets, prior] };
      expect(() =>
        createTaskSourceResourceTransitionReceipt({
          ...input,
          before: {
            ...input.before,
            ledger: duplicated,
            ledgerVersion: { revision: duplicated.revision, digest: coordinationLedgerDigest(duplicated) },
          },
        }),
      ).toThrow('ticket identifiers contains aliases or duplicate identifiers');
    },
    { retainedResources: ['branch:refs/heads/codex/task-source', 'execution:task-source-expiry'], rotate: true },
  );
});

test('TaskSource resource reservation keeps queued ownership and promotes an existing ticket without another sequence', async () => {
  await withResourceTransitionFixture(({ input, receipt }) => {
    requireHostState(input.before);
    const before = input.before,
      prior = before.ledger.tickets.find((ticket) => ticket.ticket_id === before.work.lease?.ticket_id);
    const target = input.nextLedger.tickets.find((ticket) => ticket.ticket_id === receipt.ticket.ticket_id);
    if (!prior || !target) throw new Error('Native reservation tickets missing');
    const claimId =
      'task-source-claim:' +
      receipt.request.work_id +
      ':' +
      receipt.request.attempt +
      ':' +
      receipt.request.operation_id;
    expect(
      taskSourceReservationLedger(
        before.ledger,
        prior,
        target,
        claimId,
        receipt.request.source_root!,
        target.created_at,
      ),
    ).toEqual(input.nextLedger);
    const queued = {
      ...target,
      status: 'queued' as const,
      active_resources: [],
      blocked_resources: target.exclusive_resources,
      expires_at: null,
      claim_ids: [],
    };
    const waiting = taskSourceReservationLedger(
      before.ledger,
      prior,
      queued,
      claimId,
      receipt.request.source_root!,
      target.created_at,
    );
    expect(waiting.claims).toEqual(before.ledger.claims);
    expect(waiting.operations).toEqual(before.ledger.operations);
    expect(waiting.tickets).toEqual([...before.ledger.tickets, queued]);
    expect(waiting.next_sequence).toBe(before.ledger.next_sequence + 1);
    const promoted = taskSourceReservationLedger(
      waiting,
      prior,
      target,
      claimId,
      receipt.request.source_root!,
      target.created_at,
    );
    expect(promoted.next_sequence).toBe(waiting.next_sequence);
    expect(promoted.tickets.filter((ticket) => ticket.ticket_id === target.ticket_id)).toEqual([target]);
    expect(promoted.claims.filter((claim) => claim.status === 'active')).toHaveLength(1);
    expect(promoted.tickets.find((ticket) => ticket.ticket_id === prior.ticket_id)?.status).toBe('released');
    expect(before.ledger.tickets).toContainEqual(prior);
    expect(before.ledger.claims.every((claim) => claim.status === 'active')).toBe(true);
  });
});

test('TaskSource resource history rolls back with native Ledger and late action faults before exact retry', async () => {
  const deadline = performance.now() + 5_000;
  const f = createTaskSourceHostFixture({
    policyVerifier: async ({ request }) => trustedTaskSourcePolicyDecision(request),
  });
  let completed = false,
    failure: { error: unknown } | undefined;
  try {
    expectReturned(() => f.prepare());
    const before = expectReturned(() => f.store.readHostStateSnapshot(f.identity));
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
    const issued = await expectAsyncReturned(() =>
      f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity }),
    );
    expect(issued.status).toBe('issued');
    const after = f.store.readHostStateSnapshot(f.identity);
    requireHostState(after);
    const rows = f.database
      .query<{ payload: string; digest: string }, [string, string]>(
        'SELECT payload,digest FROM agent_host_task_source_resource_transition WHERE workspace_id=? AND operation_id=?',
      )
      .all(f.store.workspaceId, f.request.operation_id);
    expect(rows).toHaveLength(1);
    const candidate: unknown = JSON.parse(rows[0]!.payload);
    const receipt = expectReturned(() => parseTaskSourceResourceTransitionReceipt(candidate));
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
    const preparedRow: unknown = prepared[0];
    if (!isPlainRecord(preparedRow) || typeof preparedRow.payload !== 'string')
      throw new Error('Native prepared row is missing');
    const operation: unknown = JSON.parse(preparedRow.payload);
    if (!isPlainRecord(operation)) throw new Error('Native prepared operation is not a record');
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
    expect(
      await expectAsyncReturned(() =>
        f.store.issueTaskSourceBindingOperation({ request: f.request, identity: f.identity }),
      ),
    ).toEqual({
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
          if (performance.now() >= deadline) throw new Error('Resource fixture cleanup exhausted its deadline');
        },
      ],
      failure,
    );
  }
});
