import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { HostStateStore } from '../src/host-state.ts';
import { parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import { suspendLocalWork } from '../src/orchestration/suspend-local-work.ts';
import {
  suspendCompletedSourceWorkflowWork,
  type CompletedSourceWorkflowSuspensionInput,
} from '../src/trusted-host.ts';
import type { MastraLedgerItem, MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import {
  historicalFixture,
  withDatabase,
  registerRuntimeConfigFixtureCleanup,
} from './helpers/runtime-config-rebind-fixture.ts';

registerRuntimeConfigFixtureCleanup();

/** Cooperative persisted fixture; readonly role bodies are not native executions. */
function completedFixture() {
  const historical = historicalFixture('settled_writer_failed_validators');
  const { f, request, state } = historical;
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  const validators = state.items.map((item) => {
    if (!item.observation) throw new Error('Fixture validator observation missing');
    const summary = JSON.stringify({
      schema: 'VidaValidatorVerdict/v1',
      verdict: 'pass',
      findings: [],
      evidence_refs: item.observation.evidence_refs,
    });
    return {
      ...item,
      observation: {
        ...item.observation,
        status: 'reported_complete' as const,
        summary,
        output_digest: canonicalJsonDigest(summary),
      },
    };
  });
  const base = validators[0];
  if (!base) throw new Error('Fixture validator request missing');
  const terminal = (stage: string, role: string, wave: number, body: object): MastraLedgerItem => {
    const action_id = canonicalJsonDigest({ fixture_only: true, run: state.run_id, stage, wave });
    const sessionRequest = { ...base.request, action_id, stage_id: stage, role, wave_index: wave, assignment_index: 0 };
    const issue_id = randomUUID(),
      summary = JSON.stringify(body);
    return {
      request: sessionRequest,
      issue_id,
      observation: {
        schema: 'VidaSessionObservation/v1',
        action_id,
        issue_id,
        agent_id: 'cooperative-fixture',
        tool_call_ref: 'fixture:' + action_id,
        status: 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['local://fixture/terminal'],
      },
    };
  };
  const tester = terminal('test_task', 'tester', 3, {
    schema: 'VidaTesterVerdict/v1',
    status: 'pass',
    evidence_refs: ['local://fixture/terminal'],
  });
  const delivery = terminal('prepare_delivery', 'delivery-agent', 4, {
    schema: 'VidaDeliveryProposal/v1',
    created: [],
    modified: [],
    deploy: [],
    do_not_deploy: [],
    destination: 'fixture-only',
    order: [],
    post_deployment_checks: ['Fixture proposal only; no delivery'],
    evidence_refs: ['local://fixture/terminal'],
  });
  const complete: MastraSessionLedgerState = {
    ...state,
    step_id: null,
    items: [],
    completed: [
      ...state.completed,
      { step_id: state.step_id!, items: validators },
      { step_id: 'wave-3', items: [tester] },
      { step_id: 'wave-4', items: [delivery] },
    ],
  };
  withDatabase(f, (database) => {
    database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(JSON.stringify(complete) + '\n', canonicalJsonDigest(complete), f.workspace, request.identity.work_id);
  });
  return { f, identity: request.identity, config: parseRuntimeConfigYaml(f.oldYaml) };
}

function currentInput(
  subject: ReturnType<typeof completedFixture>,
  store: HostStateStore,
): CompletedSourceWorkflowSuspensionInput {
  const current = store.readWorkSessionSnapshot(subject.identity, 1);
  if (!current.host.work || !current.host.workVersion || !current.host.ledgerVersion || !current.journal)
    throw new Error('Fixture Host or journal missing');
  return {
    store,
    identity: subject.identity,
    config: subject.config,
    journal: { state: current.journal.state, version: current.journal.version, resume_status: 'complete' },
    expectedWork: current.host.workVersion,
    expectedLedger: current.host.ledgerVersion,
    expectedMaintenanceGeneration: current.host.maintenanceGeneration,
    nativeSessionHandle: current.host.work.lease?.thread_id ?? 'fixture-thread',
    userRequestPointer: 'fixture:completed-source-release',
    requestIntent: 'next_work',
    documentationContext: {
      repository_root: subject.f.root,
      repository_id: subject.identity.repository_id,
      project_id: subject.identity.project_ids[0]!,
      work_id: subject.identity.work_id,
    },
  };
}

test('expired successful Source ownership releases exactly once without accepting the task', () => {
  const subject = completedFixture();
  withDatabase(subject.f, (database) => {
    const store = new HostStateStore(database, subject.f.workspace),
      input = currentInput(subject, store);
    const before = store.readWorkSessionSnapshot(subject.identity, 1);
    const expiry = before.host.ledger?.tickets.find(
      (ticket) => ticket.ticket_id === before.host.work?.lease?.ticket_id,
    )?.expires_at;
    if (!expiry) throw new Error('Fixture lease expiry missing');
    const now = Date.now;
    Date.now = () => Date.parse(expiry) + 1;
    try {
      expect(() => suspendLocalWork(input)).toThrow(/expired/);
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(before);
      const result = suspendCompletedSourceWorkflowWork(input);
      expect(result.work?.lease).toBeNull();
      expect(result.work?.execution.status).toBe('suspended');
      expect(result.work?.lifecycle.phase).toBe(before.host.work?.lifecycle.phase);
      expect(store.readWorkSessionSnapshot(subject.identity, 1).journal).toEqual(before.journal);
      const released = store.readWorkSessionSnapshot(subject.identity, 1);
      expect(suspendCompletedSourceWorkflowWork(input)).toEqual(result);
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(released);
      expect(() =>
        suspendCompletedSourceWorkflowWork({ ...input, userRequestPointer: 'fixture:foreign-replay' }),
      ).toThrow();
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(released);
    } finally {
      Date.now = now;
    }
  });
});

test('Source release refuses substituted journal, stale CAS and generation unchanged', () => {
  const subject = completedFixture();
  withDatabase(subject.f, (database) => {
    const store = new HostStateStore(database, subject.f.workspace),
      input = currentInput(subject, store);
    const before = store.readWorkSessionSnapshot(subject.identity, 1);
    expect(() =>
      suspendCompletedSourceWorkflowWork({
        ...input,
        journal: {
          ...input.journal,
          version: { ...input.journal.version, revision: input.journal.version.revision + 1 },
        },
      }),
    ).toThrow();
    expect(() =>
      suspendCompletedSourceWorkflowWork({
        ...input,
        expectedWork: { ...input.expectedWork, revision: input.expectedWork.revision + 1 },
      }),
    ).toThrow();
    expect(() =>
      suspendCompletedSourceWorkflowWork({
        ...input,
        expectedMaintenanceGeneration: input.expectedMaintenanceGeneration + 1,
      }),
    ).toThrow();
    expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(before);
  });
});

test.each(['failed', 'unknown', 'duplicate', 'missing-delivery'] as const)(
  'Source release refuses persisted %s workflow without effects',
  (kind) => {
    const subject = completedFixture();
    withDatabase(subject.f, (database) => {
      const store = new HostStateStore(database, subject.f.workspace),
        input = currentInput(subject, store);
      const completed = input.journal.state.completed.map((wave) => ({
        ...wave,
        items: wave.items.map((item) => {
          if (item.request.role !== 'tester' || !item.observation) return item;
          if (kind === 'unknown') return { ...item, observation: null };
          if (kind !== 'failed') return item;
          const summary = JSON.stringify({
            schema: 'VidaTesterVerdict/v1',
            status: 'fail',
            evidence_refs: item.observation.evidence_refs,
          });
          return {
            ...item,
            observation: {
              ...item.observation,
              status: 'reported_failed' as const,
              summary,
              output_digest: canonicalJsonDigest(summary),
            },
          };
        }),
      }));
      const state: MastraSessionLedgerState = {
        ...input.journal.state,
        completed:
          kind === 'missing-delivery'
            ? completed.slice(0, -1)
            : kind === 'duplicate'
              ? [...completed, completed[completed.length - 1]!]
              : completed,
      };
      const version = { revision: input.journal.version.revision + 1, digest: canonicalJsonDigest(state) };
      database
        .query(
          'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
        )
        .run(
          version.revision,
          JSON.stringify(state) + '\n',
          version.digest,
          subject.f.workspace,
          subject.identity.work_id,
        );
      const before = Buffer.from(database.serialize());
      expect(() =>
        suspendCompletedSourceWorkflowWork({ ...input, journal: { state, version, resume_status: 'complete' } }),
      ).toThrow();
      expect(Buffer.from(database.serialize())).toEqual(before);
    });
  },
);

/** Live-shaped blocked journal: the configured delivery declined on the current wave-5 frontier. */
function declinedDeliveryFixture() {
  const historical = historicalFixture('settled_writer_failed_validators');
  const { f, request, state } = historical;
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  const validators = state.items.map((item) => {
    if (!item.observation) throw new Error('Fixture validator observation missing');
    const summary = JSON.stringify({
      schema: 'VidaValidatorVerdict/v1',
      verdict: 'pass',
      findings: [],
      evidence_refs: item.observation.evidence_refs,
    });
    return {
      ...item,
      observation: {
        ...item.observation,
        status: 'reported_complete' as const,
        summary,
        output_digest: canonicalJsonDigest(summary),
      },
    };
  });
  const base = validators[0];
  if (!base) throw new Error('Fixture validator request missing');
  const terminal = (
    stage: string,
    role: string,
    wave: number,
    body: object,
    status: 'reported_complete' | 'reported_failed' = 'reported_complete',
  ): MastraLedgerItem => {
    const action_id = canonicalJsonDigest({ fixture_only: true, run: state.run_id, stage, wave });
    const sessionRequest = {
      ...base.request,
      action_id,
      stage_id: stage,
      role,
      wave_index: wave,
      assignment_index: 0,
    };
    const issue_id = randomUUID(),
      summary = JSON.stringify(body);
    return {
      request: sessionRequest,
      issue_id,
      observation: {
        schema: 'VidaSessionObservation/v1',
        action_id,
        issue_id,
        agent_id: 'cooperative-fixture',
        tool_call_ref: 'fixture:' + action_id,
        status,
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['local://fixture/terminal'],
      },
    };
  };
  const tester = terminal('test_task', 'tester', 3, {
    schema: 'VidaTesterVerdict/v1',
    status: 'pass',
    evidence_refs: ['local://fixture/terminal'],
  });
  const delivery = terminal(
    'prepare_delivery',
    'delivery-agent',
    5,
    {
      schema: 'VidaDeliveryDecline/v1',
      reason: 'fixture declined delivery preparation',
      evidence_refs: ['local://fixture/terminal'],
    },
    'reported_failed',
  );
  const declined: MastraSessionLedgerState = {
    ...state,
    step_id: 'wave-5',
    items: [delivery],
    completed: [
      ...state.completed,
      { step_id: state.step_id!, items: validators },
      { step_id: 'wave-3', items: [tester] },
      { step_id: 'wave-4', items: [] },
    ],
  };
  withDatabase(f, (database) => {
    database
      .query(
        'UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
      )
      .run(JSON.stringify(declined) + '\n', canonicalJsonDigest(declined), f.workspace, request.identity.work_id);
  });
  return { f, identity: request.identity, config: parseRuntimeConfigYaml(f.oldYaml) };
}

function deliveryInput(
  subject: ReturnType<typeof declinedDeliveryFixture>,
  store: HostStateStore,
): Parameters<typeof suspendLocalWork>[0] {
  const current = store.readWorkSessionSnapshot(subject.identity, 1);
  if (!current.host.work || !current.host.workVersion || !current.host.ledgerVersion || !current.journal)
    throw new Error('Fixture Host or journal missing');
  return {
    store,
    identity: subject.identity,
    config: subject.config,
    journal: { state: current.journal.state, version: current.journal.version, resume_status: 'blocked' },
    expectedWork: current.host.workVersion,
    expectedLedger: current.host.ledgerVersion,
    nativeSessionHandle: current.host.work.lease?.thread_id ?? 'fixture-thread',
    userRequestPointer: 'fixture:settled-delivery-release',
    requestIntent: 'next_work',
    documentationContext: {
      repository_root: subject.f.root,
      repository_id: subject.identity.repository_id,
      project_id: subject.identity.project_ids[0]!,
      work_id: subject.identity.work_id,
    },
  };
}

test('expired declined-delivery owner releases through continuation without accepting the task', () => {
  const subject = declinedDeliveryFixture();
  withDatabase(subject.f, (database) => {
    const store = new HostStateStore(database, subject.f.workspace),
      input = deliveryInput(subject, store);
    const before = store.readWorkSessionSnapshot(subject.identity, 1);
    const expiry = before.host.ledger?.tickets.find(
      (ticket) => ticket.ticket_id === before.host.work?.lease?.ticket_id,
    )?.expires_at;
    if (!expiry) throw new Error('Fixture lease expiry missing');
    expect(before.journal?.state.source_scope?.digest).not.toBe(before.host.work?.binding.work_source_revision);
    const now = Date.now;
    Date.now = () => Date.parse(expiry) + 1;
    try {
      const result = suspendLocalWork(input);
      expect(result.work?.lease).toBeNull();
      expect(result.work?.execution.status).toBe('suspended');
      expect(result.work?.lifecycle.phase).toBe(before.host.work?.lifecycle.phase);
      expect(store.readWorkSessionSnapshot(subject.identity, 1).journal).toEqual(before.journal);
      const released = store.readWorkSessionSnapshot(subject.identity, 1);
      expect(suspendLocalWork(input)).toEqual(result);
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(released);
      expect(() => suspendLocalWork({ ...input, userRequestPointer: 'fixture:foreign-replay' })).toThrow();
      expect(store.readWorkSessionSnapshot(subject.identity, 1)).toEqual(released);
    } finally {
      Date.now = now;
    }
  });
});

test('live declined-delivery lease still suspends through ordinary continuation', () => {
  const subject = declinedDeliveryFixture();
  withDatabase(subject.f, (database) => {
    const store = new HostStateStore(database, subject.f.workspace),
      input = deliveryInput(subject, store),
      before = store.readWorkSessionSnapshot(subject.identity, 1);
    const expiry = before.host.ledger?.tickets.find(
      (ticket) => ticket.ticket_id === before.host.work?.lease?.ticket_id,
    )?.expires_at;
    if (!expiry) throw new Error('Fixture lease expiry missing');
    const now = Date.now;
    Date.now = () => Date.parse(expiry) - 1;
    try {
      const result = suspendLocalWork(input);
      expect(result.work?.lease).toBeNull();
      expect(result.work?.execution.phase).toBe('awaiting_followup');
      expect(store.readWorkSessionSnapshot(subject.identity, 1).journal).toEqual(before.journal);
      expect(suspendLocalWork(input)).toEqual(result);
    } finally {
      Date.now = now;
    }
  });
});

test.each(['unissued-sibling', 'foreign-scope', 'stale-cas'] as const)(
  'declined-delivery release refuses %s without effects',
  (kind) => {
    const subject = declinedDeliveryFixture();
    withDatabase(subject.f, (database) => {
      const store = new HostStateStore(database, subject.f.workspace),
        input = deliveryInput(subject, store);
      const before = store.readWorkSessionSnapshot(subject.identity, 1);
      const expiry = before.host.ledger?.tickets.find(
        (ticket) => ticket.ticket_id === before.host.work?.lease?.ticket_id,
      )?.expires_at;
      if (!expiry) throw new Error('Fixture lease expiry missing');
      const now = Date.now;
      Date.now = () => Date.parse(expiry) + 1;
      try {
        let changed = input;
        if (kind === 'stale-cas')
          changed = {
            ...input,
            expectedWork: { ...input.expectedWork, revision: input.expectedWork.revision + 1 },
          };
        if (kind === 'unissued-sibling' || kind === 'foreign-scope') {
          const initialState = input.journal.state;
          const delivery = initialState.items[0]!;
          const items =
            kind === 'unissued-sibling'
              ? [
                  delivery,
                  {
                    ...delivery,
                    request: {
                      ...delivery.request,
                      action_id: canonicalJsonDigest({
                        fixture_only: true,
                        run: initialState.run_id,
                        stage: 'sibling',
                      }),
                    },
                    issue_id: null,
                    observation: null,
                  },
                ]
              : [{ ...delivery, request: { ...delivery.request, scope_digest: 'f'.repeat(64) } }];
          const state: MastraSessionLedgerState = { ...initialState, items };
          const version = {
            revision: input.journal.version.revision + 1,
            digest: canonicalJsonDigest(state),
          };
          database
            .query(
              'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=1',
            )
            .run(
              version.revision,
              JSON.stringify(state) + '\n',
              version.digest,
              subject.f.workspace,
              subject.identity.work_id,
            );
          changed = { ...input, journal: { state, version, resume_status: 'blocked' } };
        }
        expect(() => suspendLocalWork(changed)).toThrow();
        const after = store.readWorkSessionSnapshot(subject.identity, 1);
        expect(after.host.work?.lease?.ticket_id).toBe(before.host.work?.lease?.ticket_id);
        expect(after.host.ledgerVersion).toEqual(before.host.ledgerVersion);
      } finally {
        Date.now = now;
      }
    });
  },
);
