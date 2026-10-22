import { expect } from 'bun:test';
import { buildReadOnlyDispatchRepairPlan } from '../../src/orchestration/read-only-dispatch-repair.ts';
import { suspendHistoricalOwnerWork } from '../../src/orchestration/suspend-local-work.ts';
import { requireHostState } from './task-source-host-fixture.ts';
import {
  admittedInput as initialSourceAdmissionInput,
  createInitialSourceWorkFixture,
  currentJournal as initialSourceJournal,
  hostDatabase as initialSourceHostDatabase,
  hostLedger as initialSourceHostLedger,
  hostStore as initialSourceHostStore,
  withInitialSourceCleanup,
} from './initial-source-work-fixture.ts';

export async function withReadonlyDispatchHostFixture(
  body: (current: Awaited<ReturnType<typeof createInitialSourceWorkFixture>>, deadline: number) => Promise<void>,
): Promise<void> {
  const deadline = performance.now() + 5_000;
  let fixture: Awaited<ReturnType<typeof createInitialSourceWorkFixture>> | undefined;
  let ownedRoot: string | undefined;
  await withInitialSourceCleanup(
    async () => {
      const current = await createInitialSourceWorkFixture({
        cooperativeSynthesis: true,
        onRoot: (root) => {
          ownedRoot = root;
          console.info('Readonly dispatch Host fixture root: ' + root);
        },
      });
      fixture = current;
      if (performance.now() >= deadline) throw new Error('Readonly dispatch fixture setup exhausted its deadline');
      await body(current, deadline);
      expect(performance.now()).toBeLessThan(deadline);
    },
    async () => {
      try {
        if (fixture) await fixture.close();
      } finally {
        if (ownedRoot) console.info('Retained issued UNKNOWN readonly dispatch fixture: ' + ownedRoot);
      }
      expect(performance.now()).toBeLessThan(deadline);
    },
    'Readonly dispatch Host fixture',
  );
}

export function pauseReadonlyDispatchHostFixture(current: Awaited<ReturnType<typeof createInitialSourceWorkFixture>>) {
  const store = initialSourceHostStore(current);
  const ledger = initialSourceHostLedger(current);
  const unissued = initialSourceJournal(current);
  expect(current.config.agents.profiles.researcher?.egress_policy).toBe('none');
  const issued = unissued.state.items.every((entry) => entry.issue_id === null)
    ? ledger.issueWave(current.identity.work_id, 1, unissued.version)
    : unissued;
  const pending = issued.state.items.filter((entry) => entry.issue_id !== null && entry.observation === null);
  expect(pending).toHaveLength(1);
  const item = pending[0];
  if (!item) throw new Error('Issued readonly dispatch item fixture is missing');
  const issueId = item.issue_id;
  if (!issueId) throw new Error('Issued readonly dispatch identity fixture is missing');
  expect(issued.resume_status).toBe('issued_outcome_uncertain');
  expect(item.observation).toBeNull();
  expect(item.host_reservation).toBeUndefined();
  const before = store.readHostStateSnapshot(current.identity);
  requireHostState(before);
  suspendHistoricalOwnerWork({
    store,
    identity: current.identity,
    journal: issued,
    expectedWork: before.workVersion,
    expectedLedger: before.ledgerVersion,
    expectedMaintenanceGeneration: before.maintenanceGeneration,
    nativeSessionHandle: initialSourceAdmissionInput(current).nativeSessionHandle,
    userRequestPointer: 'fixture:pause-unknown-readonly',
    requestIntent: 'linked_correction',
    predicate: 'unknown_readonly',
    config: current.config,
    documentationContext: {
      repository_root: current.root,
      repository_id: current.identity.repository_id,
      project_id: 'sample',
      work_id: current.identity.work_id,
    },
  });
  const paused = store.readHostStateSnapshot(current.identity);
  requireHostState(paused);
  const journal = initialSourceJournal(current);
  expect(paused.work.lease).toBeNull();
  expect(paused.work.execution.status).toBe('suspended');
  expect(journal).toEqual(issued);
  const plan = buildReadOnlyDispatchRepairPlan({
    repositoryRoot: current.root,
    config: current.config,
    workspaceId: store.workspaceId,
    projectIds: current.identity.project_ids,
    workId: current.identity.work_id,
    attempt: 1,
    actionId: item.request.action_id,
    issueId,
    nativeHandle: initialSourceAdmissionInput(current).nativeSessionHandle,
    repairId: 'fixture-native-readonly-repair',
    actor: 'fixture-readonly-operator',
    timestamp: new Date().toISOString(),
    snapshot: store.readWorkSessionSnapshot(current.identity),
  });
  const db = initialSourceHostDatabase(current);
  return { store, ledger, item, issueId, paused, journal, plan, db };
}
