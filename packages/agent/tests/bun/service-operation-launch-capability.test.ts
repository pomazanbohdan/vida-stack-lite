import { describe, expect, spyOn, test } from 'bun:test';
import { Database, type SQLQueryBindings } from 'bun:sqlite';
import * as custodySubject from '../../src/config/service-operation-custody.js';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  closeServiceOperationCustody,
  closeServiceOperationCustodyHandle,
  closeServiceOperationDatabase,
  initializeServiceOperationCustodySchema,
  openServiceOperationDatabase,
  readServiceOperationCustodyForOperation,
  recordServiceOperationLaunchPid,
  reserveServiceOperationLaunch,
  reconcileServiceOperationCustody,
  claimReservedServiceOperationLaunch,
} from '../../src/config/service-operation-custody.js';
import { expectAsyncReturned, expectRejection, expectReturned } from '../helpers/expect-rejection.js';
import { openCustodyFixture, serviceCustodyFixtureSql } from '../helpers/service-custody-fixture.js';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.js';
import {
  serviceOperationLaunchCapabilityDigest,
  serviceOperationLaunchCapabilityMatches,
  serviceOperationLaunchClaimMatches,
} from '../../src/config/service-operation-launch-capability.js';

const workspaceId = 'a'.repeat(64);
const requestDigest = 'b'.repeat(64);
const operationId = 'release-operation';
const capability = '11111111-1111-4111-8111-111111111111';
const otherCapability = '22222222-2222-4222-8222-222222222222';
const pid = 7312;

interface LegacyReleaseAdapter {
  reserveReleaseWorker(root: string, operation: string, launch: () => number): Promise<unknown>;
  claimReleaseWorker(root: string, operation: string, pid: number): Promise<unknown>;
}

function isLegacyReleaseAdapter(value: unknown): value is LegacyReleaseAdapter {
  return (
    typeof value === 'object' &&
    value !== null &&
    'reserveReleaseWorker' in value &&
    typeof value.reserveReleaseWorker === 'function' &&
    'claimReleaseWorker' in value &&
    typeof value.claimReleaseWorker === 'function'
  );
}

interface LaunchingImage {
  workspace_id: string;
  owner_kind: string;
  operation_id: string;
  request_digest: string;
  owner_token: string | null;
  revision: number;
  phase: string;
  evidence_digest: string | null;
  launch_pid: number | null;
  handoff_digest: string | null;
  handoff_from_kind: string | null;
  handoff_from_phase: string | null;
  handoff_from_request_digest: string | null;
  handoff_from_revision: number | null;
  handoff_from_evidence_digest: string | null;
}

function launchingRow(overrides: Partial<LaunchingImage> = {}): LaunchingImage {
  return {
    workspace_id: workspaceId,
    owner_kind: 'release-pack-worker',
    operation_id: operationId,
    request_digest: requestDigest,
    owner_token: expectReturned(() => serviceOperationLaunchCapabilityDigest(capability)),
    revision: 2,
    phase: 'launching',
    evidence_digest: 'c'.repeat(64),
    launch_pid: pid,
    handoff_digest: null,
    handoff_from_kind: null,
    handoff_from_phase: null,
    handoff_from_request_digest: null,
    handoff_from_revision: null,
    handoff_from_evidence_digest: null,
    ...overrides,
  };
}

describe('private service launch capability', () => {
  test('identical fixture configuration keeps physical workspace identities and database state separate', () => {
    const fixtures: ReturnType<typeof openCustodyFixture>[] = [];
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      fixtures.push(openCustodyFixture());
      fixtures.push(openCustodyFixture());
      const [first, second] = fixtures;
      if (!first || !second) throw new Error('Expected two custody fixtures');
      expect(readFileSync(path.join(first.root, 'agent-runtime.config.v1.yaml'))).toEqual(
        readFileSync(path.join(second.root, 'agent-runtime.config.v1.yaml')),
      );
      expect(first.root).not.toBe(second.root);
      expect(first.workspaceId).not.toBe(second.workspaceId);
      first.database.exec('CREATE TABLE fixture_isolation (value TEXT)');
      expect(second.database.query("SELECT name FROM sqlite_master WHERE name='fixture_isolation'").get()).toBeNull();
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        fixtures.map((fixture) => (): undefined => {
          try {
            closeServiceOperationDatabase(fixture.database);
          } catch (error) {
            console.error('Retained custody fixture after close failure: ' + fixture.root);
            throw error;
          }
          if (completed) rmSync(fixture.root, { recursive: true, force: true });
          else console.error('Retained failed custody fixture isolation control: ' + fixture.root);
          return undefined;
        }),
        primaryFailure,
      );
    }
  });

  test('only the issued capability matches its stored digest', () => {
    const digest = expectReturned(() => serviceOperationLaunchCapabilityDigest(capability));
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(digest, capability))).toBe(true);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(digest, otherCapability))).toBe(false);
    expect(expectReturned(() => serviceOperationLaunchCapabilityMatches(digest, undefined))).toBe(false);
  });

  test('reused PID and exact journal identity do not authorize a different child', () => {
    const row = launchingRow();
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          row,
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          otherCapability,
        ),
      ),
    ).toBe(false);
  });

  test('exact reservation accepts its child capability before the claim CAS', () => {
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          launchingRow(),
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(true);
  });

  test('claimed or replayed reservations no longer match the launch capability', () => {
    const consumed = launchingRow({
      owner_token: '33333333-3333-4333-8333-333333333333',
      phase: 'in_flight',
      evidence_digest: null,
      launch_pid: null,
      revision: 3,
    });
    expect(
      expectReturned(() =>
        serviceOperationLaunchClaimMatches(
          consumed,
          workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          capability,
        ),
      ),
    ).toBe(false);
  });

  test('SQLite custody rejects missing and wrong capability despite a reused PID, then consumes the exact capability once', () => {
    const fixture = openCustodyFixture();
    let closed = false;
    try {
      const reservation = expectReturned(() =>
        reserveServiceOperationLaunch(
          fixture.database,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          'c'.repeat(64),
        ),
      );
      expect(reservation).toMatchObject({
        workspace_id: fixture.workspaceId,
        owner_kind: 'release-pack-worker',
        operation_id: operationId,
        request_digest: requestDigest,
        revision: 1,
        phase: 'launching',
        launch_pid: null,
        evidence_digest: 'c'.repeat(64),
      });
      expect(typeof reservation.child_capability).toBe('string');
      const recorded = expectReturned(() =>
        recordServiceOperationLaunchPid(
          fixture.database,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          reservation.revision,
          pid,
          reservation.child_capability,
        ),
      );
      expect(recorded).toMatchObject({
        workspace_id: fixture.workspaceId,
        owner_kind: 'release-pack-worker',
        operation_id: operationId,
        request_digest: requestDigest,
        revision: reservation.revision + 1,
        phase: 'launching',
        launch_pid: pid,
        evidence_digest: 'c'.repeat(64),
      });
      const before = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      expect(before).not.toBeNull();
      expect(typeof before).toBe('object');
      expect(before?.workspace_id).toBe(fixture.workspaceId);
      expect(before?.owner_kind).toBe('release-pack-worker');
      expect(before?.operation_id).toBe(operationId);
      expect(before?.request_digest).toBe(requestDigest);
      expect(before?.phase).toBe('launching');
      expect(before?.launch_pid).toBe(pid);
      expect(before?.evidence_digest).toBe('c'.repeat(64));
      expect(before?.owner_token).toBe(
        expectReturned(() => serviceOperationLaunchCapabilityDigest(reservation.child_capability)),
      );
      expect(before?.owner_token).not.toBe(reservation.child_capability);
      for (const [attemptedCapability, expectedFailure] of [
        [undefined, 'Service operation launch capability is invalid.'],
        [otherCapability, 'worker does not match the exact one-shot launch reservation'],
      ] as const) {
        expect(() =>
          claimReservedServiceOperationLaunch(
            fixture.database,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            pid,
            attemptedCapability as string,
          ),
        ).toThrow(expectedFailure);
        const afterDenial = expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        );
        expect(afterDenial).not.toBeNull();
        expect(typeof afterDenial).toBe('object');
        expect(afterDenial).toEqual(before);
      }
      const handle = expectReturned(() =>
        claimReservedServiceOperationLaunch(
          fixture.database,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          reservation.child_capability,
        ),
      );
      const consumed = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      expect(consumed).not.toBeNull();
      expect(typeof consumed).toBe('object');
      expect(consumed?.workspace_id).toBe(fixture.workspaceId);
      expect(consumed?.owner_kind).toBe('release-pack-worker');
      expect(consumed?.operation_id).toBe(operationId);
      expect(consumed?.request_digest).toBe(requestDigest);
      expect(consumed?.phase).toBe('in_flight');
      expect(consumed?.revision).toBe(before!.revision + 1);
      expect(consumed?.launch_pid).toBeNull();
      expect(consumed?.evidence_digest).toBeNull();
      expect(consumed?.owner_token).not.toBe(before?.owner_token);
      expect(() =>
        claimReservedServiceOperationLaunch(
          fixture.database,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          reservation.child_capability,
        ),
      ).toThrow('worker does not match the exact one-shot launch reservation');
      const afterReplay = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      expect(afterReplay).not.toBeNull();
      expect(typeof afterReplay).toBe('object');
      expect(afterReplay).toEqual(consumed);
      const unknownRevision = expectReturned(() => closeServiceOperationCustody(handle, 'unknown', null));
      const unknown = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      expect(unknown?.phase).toBe('unknown');
      expect(unknown?.revision).toBe(unknownRevision);
      expect(unknown?.owner_token).toBeNull();
      expect(unknown?.launch_pid).toBeNull();
      expect(unknown?.evidence_digest).toBeNull();
      expectReturned(() => closeServiceOperationCustodyHandle(handle));
      closed = true;
    } finally {
      try {
        if (!closed) closeServiceOperationDatabase(fixture.database);
      } finally {
        retainExpectedUnknownFixture(fixture.root, 'claimed launch left unresolved custody as UNKNOWN');
      }
    }
  });
});

test('interrupted launching is revoked only by the exact prepared beforeimage', async () => {
  const fixture = openCustodyFixture();
  let completed = false;
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    expectReturned(() =>
      recordServiceOperationLaunchPid(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        reservation.revision,
        pid,
        reservation.child_capability,
      ),
    );
    const row = await expectAsyncReturned(() =>
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => ({ phase: 'prepared', evidence_digest: 'c'.repeat(64) }),
      ),
    );
    expect(row.phase).toBe('prepared');
    expect(row.owner_token).toBeNull();
    expect(row.evidence_digest).toBe('c'.repeat(64));
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    let unexpectedHandle: ReturnType<typeof claimReservedServiceOperationLaunch> | undefined;
    let assertionFailure: { error: unknown } | undefined;
    try {
      expect(
        () =>
          (unexpectedHandle = claimReservedServiceOperationLaunch(
            reopened,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            pid,
            reservation.child_capability,
          )),
      ).toThrow('worker does not match the exact one-shot launch reservation');
    } catch (error) {
      assertionFailure = { error };
    } finally {
      completeOwnedCleanup(
        [
          () => {
            if (unexpectedHandle) closeServiceOperationCustodyHandle(unexpectedHandle);
            else closeServiceOperationDatabase(reopened);
          },
        ],
        assertionFailure,
      );
    }
    if (assertionFailure) throw assertionFailure.error;
    completed = true;
  } finally {
    if (completed) rmSync(fixture.root, { recursive: true, force: true });
    else
      console.error('SERVICE_CUSTODY_FIXTURE_RETAINED', {
        root: fixture.root,
        reason: 'interrupted-launch denial assertion or connection close did not complete',
      });
  }
});

test('ambiguous interrupted launching remains same-operation UNKNOWN with its capability revoked', async () => {
  const fixture = openCustodyFixture();
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    await expectRejection(
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => {
          throw new Error('ambiguous effect observation');
        },
      ),
      'ambiguous effect observation',
    );
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    try {
      const row = expectReturned(() =>
        readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId),
      );
      expect(row?.phase).toBe('unknown');
      expect(row?.operation_id).toBe(operationId);
      expect(row?.owner_token).toBeNull();
      expect(row?.launch_pid).toBeNull();
      expect(() =>
        claimReservedServiceOperationLaunch(
          reopened,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          reservation.child_capability,
        ),
      ).toThrow('worker does not match the exact one-shot launch reservation');
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toEqual(row);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
  } finally {
    retainExpectedUnknownFixture(fixture.root, 'ambiguous interrupted launch reconciled to UNKNOWN');
  }
});

test('claim requires a present row and the exact owner, operation, request, PID, and valid child capability', () => {
  const fixture = openCustodyFixture();
  try {
    expect(() =>
      claimReservedServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        capability,
      ),
    ).toThrow('worker does not match the exact one-shot launch reservation');
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toBeNull();
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    expectReturned(() =>
      recordServiceOperationLaunchPid(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        reservation.revision,
        pid,
        reservation.child_capability,
      ),
    );
    const before = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    for (const identity of [
      {
        kind: 'release-worker' as const,
        operation: operationId,
        digest: requestDigest,
        childPid: pid,
        childCap: reservation.child_capability,
      },
      {
        kind: 'release-pack-worker' as const,
        operation: 'different-operation',
        digest: requestDigest,
        childPid: pid,
        childCap: reservation.child_capability,
      },
      {
        kind: 'release-pack-worker' as const,
        operation: operationId,
        digest: 'd'.repeat(64),
        childPid: pid,
        childCap: reservation.child_capability,
      },
      {
        kind: 'release-pack-worker' as const,
        operation: operationId,
        digest: requestDigest,
        childPid: pid + 1,
        childCap: reservation.child_capability,
      },
    ]) {
      expect(() =>
        claimReservedServiceOperationLaunch(
          fixture.database,
          fixture.workspaceId,
          identity.kind,
          identity.operation,
          identity.digest,
          identity.childPid,
          identity.childCap,
        ),
      ).toThrow('worker does not match the exact one-shot launch reservation');
    }
    expect(() =>
      claimReservedServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        'not-a-capability',
      ),
    ).toThrow('Service operation launch capability is invalid.');
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toEqual(before);
  } finally {
    closeServiceOperationDatabase(fixture.database);
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('a mismatched prepared digest preserves the same operation as UNKNOWN and revokes its child capability', async () => {
  const fixture = openCustodyFixture();
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    await expectRejection(
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => ({ phase: 'prepared', evidence_digest: 'd'.repeat(64) }),
      ),
      /exact prepared beforeimage/u,
    );
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    try {
      const row = expectReturned(() =>
        readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId),
      );
      expect(row?.operation_id).toBe(operationId);
      expect(row?.phase).toBe('unknown');
      expect(row?.owner_token).toBeNull();
      expect(row?.launch_pid).toBeNull();
      expect(() =>
        claimReservedServiceOperationLaunch(
          reopened,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          pid,
          reservation.child_capability,
        ),
      ).toThrow('worker does not match the exact one-shot launch reservation');
    } finally {
      closeServiceOperationDatabase(reopened);
    }
  } finally {
    retainExpectedUnknownFixture(fixture.root, 'prepared receipt mismatch preserved as UNKNOWN');
  }
});

test('an active child paired lease denies exclusive reconciliation without changing its row', async () => {
  const fixture = openCustodyFixture();
  let handle: ReturnType<typeof claimReservedServiceOperationLaunch> | undefined;
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    expectReturned(() =>
      recordServiceOperationLaunchPid(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        reservation.revision,
        pid,
        reservation.child_capability,
      ),
    );
    handle = expectReturned(() =>
      claimReservedServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        reservation.child_capability,
      ),
    );
    const before = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    const reconciliationDatabase = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    let verifierRan = false;
    await expectRejection(
      reconcileServiceOperationCustody(
        reconciliationDatabase,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => {
          verifierRan = true;
          return { phase: 'prepared', evidence_digest: 'c'.repeat(64) };
        },
      ),
      /locked|busy/iu,
    );
    expect(verifierRan).toBe(false);
    expect(() => reconciliationDatabase.query('SELECT 1').get()).toThrow();
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toEqual(before);
  } finally {
    if (handle) closeServiceOperationCustodyHandle(handle);
    else closeServiceOperationDatabase(fixture.database);
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('closed in-flight child reconciles only through its exact same-operation receipt', async () => {
  const fixture = openCustodyFixture();
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    expectReturned(() =>
      recordServiceOperationLaunchPid(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        reservation.revision,
        pid,
        reservation.child_capability,
      ),
    );
    const handle = expectReturned(() =>
      claimReservedServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        reservation.child_capability,
      ),
    );
    const inFlight = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    expect(inFlight?.phase).toBe('in_flight');
    expectReturned(() => closeServiceOperationCustodyHandle(handle));
    const source = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    const reconciled = await expectAsyncReturned(() =>
      reconcileServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        (row) => {
          expect(row.operation_id).toBe(operationId);
          expect(row.request_digest).toBe(requestDigest);
          expect(row.phase).toBe('in_flight');
          return { phase: 'prepared', evidence_digest: 'e'.repeat(64) };
        },
      ),
    );
    expect(reconciled.operation_id).toBe(operationId);
    expect(reconciled.phase).toBe('prepared');
    expect(reconciled.evidence_digest).toBe('e'.repeat(64));
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('launch reservation cannot replace UNKNOWN, terminal, or already launching custody', async () => {
  const fixture = openCustodyFixture();
  try {
    const launching = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    const launchingBefore = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    expect(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    ).toThrow('operation has no exact prepared image available for one-shot launch');
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toEqual(launchingBefore);
    const unknownOperation = 'unknown-operation';
    const unknownLaunch = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        unknownOperation,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    await expectRejection(
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        unknownOperation,
        requestDigest,
        () => {
          throw new Error('unresolved receipt');
        },
      ),
      'unresolved receipt',
    );
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    let reopenedClosed = false;
    let terminalHandle: ReturnType<typeof claimReservedServiceOperationLaunch> | undefined;
    try {
      const unknownBefore = expectReturned(() =>
        readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, unknownOperation),
      );
      expect(unknownBefore?.phase).toBe('unknown');
      expect(() =>
        reserveServiceOperationLaunch(
          reopened,
          fixture.workspaceId,
          'release-pack-worker',
          unknownOperation,
          requestDigest,
          'c'.repeat(64),
        ),
      ).toThrow('operation has no exact prepared image available for one-shot launch');
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, unknownOperation)),
      ).toEqual(unknownBefore);
      const terminalOperation = 'terminal-operation';
      const terminalLaunch = expectReturned(() =>
        reserveServiceOperationLaunch(
          reopened,
          fixture.workspaceId,
          'release-pack-worker',
          terminalOperation,
          requestDigest,
          'c'.repeat(64),
        ),
      );
      expectReturned(() =>
        recordServiceOperationLaunchPid(
          reopened,
          fixture.workspaceId,
          'release-pack-worker',
          terminalOperation,
          requestDigest,
          terminalLaunch.revision,
          pid,
          terminalLaunch.child_capability,
        ),
      );
      const completedHandle = expectReturned(() =>
        claimReservedServiceOperationLaunch(
          reopened,
          fixture.workspaceId,
          'release-pack-worker',
          terminalOperation,
          requestDigest,
          pid,
          terminalLaunch.child_capability,
        ),
      );
      terminalHandle = completedHandle;
      expectReturned(() => closeServiceOperationCustody(completedHandle, 'terminal', 'f'.repeat(64)));
      const terminalBefore = expectReturned(() =>
        readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, terminalOperation),
      );
      expect(() =>
        reserveServiceOperationLaunch(
          reopened,
          fixture.workspaceId,
          'release-pack-worker',
          terminalOperation,
          requestDigest,
          'f'.repeat(64),
        ),
      ).toThrow('operation has no exact prepared image available for one-shot launch');
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, terminalOperation)),
      ).toEqual(terminalBefore);
      expectReturned(() => closeServiceOperationCustodyHandle(completedHandle));
      reopenedClosed = true;
      expect(launching.child_capability).not.toBe(unknownLaunch.child_capability);
    } finally {
      if (!reopenedClosed) {
        if (terminalHandle) closeServiceOperationCustodyHandle(terminalHandle);
        else closeServiceOperationDatabase(reopened);
      }
    }
  } finally {
    retainExpectedUnknownFixture(fixture.root, 'UNKNOWN launch reservation remains nonreplaceable');
  }
});

test('an exact prepared image can be reserved again with a fresh revision and capability', () => {
  const fixture = openCustodyFixture();
  let originalClosed = false;
  let handle: ReturnType<typeof claimReservedServiceOperationLaunch> | undefined;
  let reopened: ReturnType<typeof openServiceOperationDatabase> | undefined;
  try {
    expectReturned(() => initializeServiceOperationCustodySchema(fixture.database));
    const first = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    expectReturned(() =>
      recordServiceOperationLaunchPid(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        first.revision,
        pid,
        first.child_capability,
      ),
    );
    const firstHandle = expectReturned(() =>
      claimReservedServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        first.child_capability,
      ),
    );
    handle = firstHandle;
    const preparedRevision = expectReturned(() =>
      closeServiceOperationCustody(firstHandle, 'prepared', 'e'.repeat(64)),
    );
    expectReturned(() => closeServiceOperationCustodyHandle(firstHandle));
    handle = undefined;
    originalClosed = true;

    const preparedDatabase = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    reopened = preparedDatabase;
    const second = expectReturned(() =>
      reserveServiceOperationLaunch(
        preparedDatabase,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'e'.repeat(64),
      ),
    );
    expect(second.phase).toBe('launching');
    expect(second.revision).toBe(preparedRevision + 1);
    expect(second.child_capability).not.toBe(first.child_capability);
    expect(second.owner_token).toBe(
      expectReturned(() => serviceOperationLaunchCapabilityDigest(second.child_capability)),
    );
    const persisted = expectReturned(() =>
      readServiceOperationCustodyForOperation(preparedDatabase, fixture.workspaceId, operationId),
    );
    expect(persisted?.phase).toBe('launching');
    expect(persisted?.revision).toBe(second.revision);
    expect(persisted?.owner_token).toBe(second.owner_token);
    expectReturned(() =>
      recordServiceOperationLaunchPid(
        preparedDatabase,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        second.revision,
        pid,
        second.child_capability,
      ),
    );
    const secondHandle = expectReturned(() =>
      claimReservedServiceOperationLaunch(
        preparedDatabase,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        second.child_capability,
      ),
    );
    handle = secondHandle;
    expectReturned(() => closeServiceOperationCustody(secondHandle, 'prepared', 'e'.repeat(64)));
    expectReturned(() => closeServiceOperationCustodyHandle(secondHandle));
    handle = undefined;
    reopened = undefined;
  } finally {
    if (handle) closeServiceOperationCustodyHandle(handle);
    else if (!originalClosed) closeServiceOperationDatabase(fixture.database);
    if (reopened) closeServiceOperationDatabase(reopened);
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('closing a non-live handle is rejected before reading its custody', () => {
  for (const value of [null, undefined, 0, false, '', () => undefined, {}]) {
    expect(() =>
      closeServiceOperationCustody(
        value as unknown as Parameters<typeof closeServiceOperationCustody>[0],
        'prepared',
        null,
      ),
    ).toThrow('Service operation custody: live operation handle is required');
  }
});

test('custody fixture prepares a real SQLite table independently of the mutable initializer', () => {
  const initializer = spyOn(custodySubject, 'initializeServiceOperationCustodySchema');
  let fixture: ReturnType<typeof openCustodyFixture> | undefined;
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    fixture = openCustodyFixture('service-independent-fixture-');
    const found = fixture.database
      .query<{ sql: string }, []>("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'")
      .get();
    expect(found?.sql).toBe(serviceCustodyFixtureSql);
    expect(
      fixture.database
        .query<{ count: bigint }, []>('SELECT COUNT(*) AS count FROM agent_host_service_operation_custody')
        .get()?.count,
    ).toBe(0n);
    expect(initializer).not.toHaveBeenCalled();
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          initializer.mockRestore();
          return undefined;
        },
        () => {
          if (fixture) {
            try {
              closeServiceOperationDatabase(fixture.database);
            } catch (error) {
              retainExpectedUnknownFixture(fixture.root, 'independent fixture close failed');
              throw error;
            }
            if (completed) rmSync(fixture.root, { recursive: true, force: true });
            else retainExpectedUnknownFixture(fixture.root, 'independent fixture control failed');
          }
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

test('initializer creates the exact empty custody schema in a fresh SQLite database', () => {
  const database = new Database(':memory:');
  let primaryFailure: { error: unknown } | undefined;
  try {
    expectReturned(() => initializeServiceOperationCustodySchema(database));
    expect(
      database
        .query<{ sql: string }, []>("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'")
        .get()?.sql,
    ).toBe(serviceCustodyFixtureSql);
    expect(
      database.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM agent_host_service_operation_custody').get()
        ?.count,
    ).toBe(0);
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          database.close();
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

for (const role of ['request', 'prepared evidence'] as const) {
  test(`reservation rejects malformed ${role} digests before any custody write`, () => {
    const fixture = openCustodyFixture('service-invalid-digest-');
    const valid = 'c'.repeat(64);
    const malformed = [
      '',
      valid.slice(1),
      valid + 'c',
      'x' + valid,
      valid + 'x',
      valid.toUpperCase(),
      'g'.repeat(64),
      ...['\n', '\r', '\r\n', '\u2028', '\u2029'].map((ending) => valid + ending),
    ];
    let provenNoEffect = false;
    let closed = false;
    let failed: { error: unknown } | undefined;
    try {
      for (const value of malformed) {
        expect(() =>
          reserveServiceOperationLaunch(
            fixture.database,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            role === 'request' ? value : requestDigest,
            role === 'prepared evidence' ? value : valid,
          ),
        ).toThrow(
          `Service operation custody: ${role === 'request' ? 'request digest' : 'prepared launch evidence digest'} is invalid`,
        );
      }
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toBeNull();
      provenNoEffect = true;
    } catch (error) {
      failed = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            closeServiceOperationDatabase(fixture.database);
            closed = true;
            return undefined;
          },
          () => {
            if (provenNoEffect && closed) rmSync(fixture.root, { recursive: true, force: true });
            else
              retainExpectedUnknownFixture(
                fixture.root,
                'malformed digest control did not prove no effect and closed admission',
              );
            return undefined;
          },
        ],
        failed,
      );
    }
  });
}

test('persisted owner tokens must match their exact phase before a row can be read', () => {
  const fixture = openCustodyFixture('service-invalid-owner-phase-');
  let completed = false;
  let closed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    const before = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    expect(before?.phase).toBe('launching');
    for (const row of [
      { phase: 'launching', token: capability, launchPid: null },
      { phase: 'launching', token: 'd'.repeat(64), launchPid: 1.5 },
      { phase: 'launching', token: 'd'.repeat(64), launchPid: Number.MAX_SAFE_INTEGER + 1 },
      { phase: 'in_flight', token: 'd'.repeat(64), launchPid: null },
      { phase: 'in_flight', token: null, launchPid: null },
      { phase: 'prepared', token: capability, launchPid: null },
      { phase: 'terminal', token: null, launchPid: 1 },
    ]) {
      fixture.database
        .query(
          'UPDATE agent_host_service_operation_custody SET phase=?,owner_token=?,launch_pid=?,evidence_digest=? WHERE workspace_id=? AND operation_id=?',
        )
        .run(
          row.phase,
          row.token,
          row.launchPid,
          row.phase === 'in_flight' ? null : 'c'.repeat(64),
          fixture.workspaceId,
          operationId,
        );
      expect(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)).toThrow(
        'Service operation custody: stored owner phase is invalid',
      );
      fixture.database
        .query(
          "UPDATE agent_host_service_operation_custody SET phase='launching',owner_token=?,launch_pid=NULL,evidence_digest=? WHERE workspace_id=? AND operation_id=?",
        )
        .run(
          expectReturned(() => serviceOperationLaunchCapabilityDigest(reservation.child_capability)),
          'c'.repeat(64),
          fixture.workspaceId,
          operationId,
        );
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toEqual(before);
    }
    fixture.database
      .query('DELETE FROM agent_host_service_operation_custody WHERE workspace_id=? AND operation_id=?')
      .run(fixture.workspaceId, operationId);
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toBeNull();
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeServiceOperationDatabase(fixture.database);
          closed = true;
          return undefined;
        },
        () => {
          if (completed && closed) rmSync(fixture.root, { recursive: true, force: true });
          else retainExpectedUnknownFixture(fixture.root, 'persisted phase control failed');
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

test('record and claim reject invalid PID boundaries without changing the exact reservation', () => {
  const fixture = openCustodyFixture('service-invalid-pid-');
  let handle: ReturnType<typeof claimReservedServiceOperationLaunch> | undefined;
  let completed = false;
  let closed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    const invalidPids = [
      0,
      -0,
      -1,
      1.5,
      Number.MIN_VALUE,
      Number.NaN,
      Infinity,
      -Infinity,
      Number.MAX_SAFE_INTEGER + 1,
    ];
    for (const stage of ['record', 'claim'] as const) {
      const before = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      expect(before?.phase).toBe('launching');
      expect(before?.launch_pid).toBe(stage === 'record' ? null : 1);
      expect(() =>
        stage === 'record'
          ? recordServiceOperationLaunchPid(
              fixture.database,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              'x' + requestDigest,
              reservation.revision,
              1,
              reservation.child_capability,
            )
          : claimReservedServiceOperationLaunch(
              fixture.database,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              'x' + requestDigest,
              1,
              reservation.child_capability,
            ),
      ).toThrow('Service operation custody: request digest is invalid');
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toEqual(before);
      for (const invalidPid of invalidPids) {
        expect(() =>
          stage === 'record'
            ? recordServiceOperationLaunchPid(
                fixture.database,
                fixture.workspaceId,
                'release-pack-worker',
                operationId,
                requestDigest,
                reservation.revision,
                invalidPid,
                reservation.child_capability,
              )
            : claimReservedServiceOperationLaunch(
                fixture.database,
                fixture.workspaceId,
                'release-pack-worker',
                operationId,
                requestDigest,
                invalidPid,
                reservation.child_capability,
              ),
        ).toThrow(`Service operation custody: ${stage === 'record' ? 'spawned worker' : 'worker'} pid is invalid`);
        expect(
          expectReturned(() =>
            readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
          ),
        ).toEqual(before);
      }
      if (stage === 'record') {
        const recorded = expectReturned(() =>
          recordServiceOperationLaunchPid(
            fixture.database,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            reservation.revision,
            1,
            reservation.child_capability,
          ),
        );
        expect(recorded.launch_pid).toBe(1);
        expect(recorded.revision).toBe(reservation.revision + 1);
      }
    }
    const beforeUnboundClaim = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    const unbound = new Database(path.join(fixture.root, fixture.relative));
    let unboundFailure: { error: unknown } | undefined;
    try {
      expect(() =>
        claimReservedServiceOperationLaunch(
          unbound,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          1,
          reservation.child_capability,
        ),
      ).toThrow('Service operation custody: workspace database binding differs');
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toEqual(beforeUnboundClaim);
    } catch (error) {
      unboundFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            unbound.close();
            return undefined;
          },
        ],
        unboundFailure,
      );
    }
    const claimed = expectReturned(() =>
      claimReservedServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        1,
        reservation.child_capability,
      ),
    );
    handle = claimed;
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId))
        ?.phase,
    ).toBe('in_flight');
    const inFlight = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    for (const close of [
      { phase: 'prepared' as const, digest: null, message: 'phase evidence is invalid' },
      { phase: 'terminal' as const, digest: null, message: 'phase evidence is invalid' },
      { phase: 'unknown' as const, digest: 'c'.repeat(64), message: 'phase evidence is invalid' },
      { phase: 'prepared' as const, digest: 'not-a-digest', message: 'evidence digest is invalid' },
    ]) {
      expect(() => closeServiceOperationCustody(claimed, close.phase, close.digest)).toThrow(
        'Service operation custody: ' + close.message,
      );
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toEqual(inFlight);
    }
    expectReturned(() => closeServiceOperationCustody(claimed, 'prepared', 'c'.repeat(64)));
    const after = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    expect(after?.phase).toBe('prepared');
    expect(after?.owner_token).toBeNull();
    expect(after?.launch_pid).toBeNull();
    expect(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'd'.repeat(64),
      ),
    ).toThrow('Service operation custody: operation has no exact prepared image available for one-shot launch');
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toEqual(after);
    fixture.database.exec(
      'CREATE TRIGGER ignore_prepared_reservation BEFORE UPDATE ON agent_host_service_operation_custody BEGIN SELECT RAISE(IGNORE); END',
    );
    expect(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    ).toThrow('Service operation custody: one-shot launch reservation compare-and-swap failed');
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toEqual(after);
    fixture.database.exec('DROP TRIGGER ignore_prepared_reservation');
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          if (handle) closeServiceOperationCustodyHandle(handle);
          else closeServiceOperationDatabase(fixture.database);
          closed = true;
          return undefined;
        },
        () => {
          if (completed && closed) rmSync(fixture.root, { recursive: true, force: true });
          else
            retainExpectedUnknownFixture(
              fixture.root,
              'PID boundary control did not prove prepared custody and closed admission',
            );
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

test('reconciliation requires both the exact owner kind and request before invoking its verifier', async () => {
  const fixture = openCustodyFixture('service-reconcile-exact-identity-');
  let database = fixture.database;
  let completed = false;
  let closed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    expectReturned(() =>
      reserveServiceOperationLaunch(
        database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    const before = expectReturned(() =>
      readServiceOperationCustodyForOperation(database, fixture.workspaceId, operationId),
    );
    expect(before?.phase).toBe('launching');
    let verifierCalls = 0;
    for (const identity of [
      { kind: 'release-worker' as const, digest: requestDigest },
      { kind: 'release-pack-worker' as const, digest: 'd'.repeat(64) },
    ]) {
      await expectRejection(
        reconcileServiceOperationCustody(
          database,
          fixture.root,
          fixture.relative,
          fixture.workspaceId,
          identity.kind,
          operationId,
          identity.digest,
          () => {
            verifierCalls++;
            return { phase: 'prepared', evidence_digest: 'c'.repeat(64) };
          },
        ),
        'Service operation custody: same-operation reconciliation is not applicable',
      );
      database = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(database, fixture.workspaceId, operationId)),
      ).toEqual(before);
      expect(verifierCalls).toBe(0);
    }
    database
      .query('DELETE FROM agent_host_service_operation_custody WHERE workspace_id=? AND operation_id=?')
      .run(fixture.workspaceId, operationId);
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(database, fixture.workspaceId, operationId)),
    ).toBeNull();
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeServiceOperationDatabase(database);
          closed = true;
          return undefined;
        },
        () => {
          if (completed && closed) rmSync(fixture.root, { recursive: true, force: true });
          else retainExpectedUnknownFixture(fixture.root, 'exact reconciliation identity control failed');
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

for (const fault of [
  {
    name: 'missing reservation',
    stage: 'reserve',
    event: 'INSERT',
    action: 'DELETE FROM agent_host_service_operation_custody',
    message: 'one-shot launch reservation disappeared',
  },
  {
    name: 'changed capability',
    stage: 'reserve',
    event: 'INSERT',
    action: "UPDATE agent_host_service_operation_custody SET owner_token='" + 'd'.repeat(64) + "'",
    message: 'child launch capability reservation differs',
  },
  {
    name: 'missing recorded row',
    stage: 'record',
    event: 'UPDATE',
    action: 'DELETE FROM agent_host_service_operation_custody',
    message: 'spawned worker reservation changed',
  },
]) {
  test(`custody rolls back ${fault.name} observed after its real SQLite write`, () => {
    const fixture = openCustodyFixture('service-post-write-fault-');
    let completed = false;
    let closed = false;
    let primaryFailure: { error: unknown } | undefined;
    let restoreQuery: (() => void) | undefined;
    try {
      const reservation =
        fault.stage === 'record'
          ? expectReturned(() =>
              reserveServiceOperationLaunch(
                fixture.database,
                fixture.workspaceId,
                'release-pack-worker',
                operationId,
                requestDigest,
                'c'.repeat(64),
              ),
            )
          : undefined;
      const before = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      let realRecordedPid: number | bigint | undefined;
      if (fault.stage === 'record') {
        let afterWrite = false;
        const nativeQuery = fixture.database.query.bind(fixture.database);
        const query = spyOn(fixture.database, 'query').mockImplementation(
          <Result, Params extends SQLQueryBindings | SQLQueryBindings[]>(sql: string) => {
            if (afterWrite && sql.startsWith('SELECT workspace_id,owner_kind,operation_id,')) {
              afterWrite = false;
              const observed = nativeQuery<{ launch_pid: number | bigint }, [string, string]>(sql).get(
                fixture.workspaceId,
                operationId,
              );
              realRecordedPid = observed?.launch_pid;
              if (realRecordedPid === 1 || realRecordedPid === 1n) sql += ' AND 0';
            }
            const statement = nativeQuery<Result, Params>(sql);
            if (sql.startsWith('UPDATE agent_host_service_operation_custody SET launch_pid=')) {
              return new Proxy(statement, {
                get(target, key) {
                  if (key === 'run')
                    return (...args: unknown[]) => {
                      const result: unknown = Reflect.apply(target.run.bind(target), undefined, args);
                      afterWrite = true;
                      return result;
                    };
                  const member: unknown = Reflect.get(target, key, target);
                  return typeof member === 'function'
                    ? (...args: unknown[]): unknown => {
                        const result: unknown = Reflect.apply(member, target, args);
                        return result;
                      }
                    : member;
                },
              });
            }
            return statement;
          },
        );
        restoreQuery = () => query.mockRestore();
      } else {
        fixture.database.exec(
          `CREATE TRIGGER custody_afterimage_fault AFTER ${fault.event} ON agent_host_service_operation_custody BEGIN ${fault.action}; END`,
        );
      }
      expect(() =>
        reservation
          ? recordServiceOperationLaunchPid(
              fixture.database,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              requestDigest,
              reservation.revision,
              1,
              reservation.child_capability,
            )
          : reserveServiceOperationLaunch(
              fixture.database,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              requestDigest,
              'c'.repeat(64),
            ),
      ).toThrow('Service operation custody: ' + fault.message);
      restoreQuery?.();
      restoreQuery = undefined;
      if (fault.stage === 'record') expect(Number(realRecordedPid)).toBe(1);
      expect(fixture.database.inTransaction).toBe(false);
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toEqual(before);
      if (fault.stage !== 'record') fixture.database.exec('DROP TRIGGER custody_afterimage_fault');
      fixture.database
        .query('DELETE FROM agent_host_service_operation_custody WHERE workspace_id=? AND operation_id=?')
        .run(fixture.workspaceId, operationId);
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toBeNull();
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            restoreQuery?.();
            return undefined;
          },
          () => {
            closeServiceOperationDatabase(fixture.database);
            closed = true;
            return undefined;
          },
          () => {
            if (completed && closed) rmSync(fixture.root, { recursive: true, force: true });
            else retainExpectedUnknownFixture(fixture.root, 'post-write control failed');
            return undefined;
          },
        ],
        primaryFailure,
      );
    }
  });
}

for (const field of ['workspace_id', 'operation_id'] as const) {
  test(`read rejects a native query projection with a substituted ${field}`, () => {
    const fixture = openCustodyFixture('service-read-identity-fault-');
    const nativeQuery = fixture.database.query.bind(fixture.database);
    let restoreQuery: (() => void) | undefined;
    let completed = false;
    let closed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      expectReturned(() =>
        reserveServiceOperationLaunch(
          fixture.database,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          'c'.repeat(64),
        ),
      );
      const before = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      expect(before?.operation_id).toBe(operationId);
      let alteredQueries = 0;
      const value = field === 'workspace_id' ? 'd'.repeat(64) : 'another-operation';
      const query = spyOn(fixture.database, 'query').mockImplementation(
        <Result, Params extends SQLQueryBindings | SQLQueryBindings[]>(sql: string) => {
          if (sql.startsWith('SELECT workspace_id,owner_kind,operation_id,')) {
            alteredQueries++;
            sql = sql.replace(
              'SELECT workspace_id,owner_kind,operation_id,',
              `SELECT ${field === 'workspace_id' ? "'" + value + "' AS workspace_id" : 'workspace_id'},owner_kind,${field === 'operation_id' ? "'" + value + "' AS operation_id" : 'operation_id'},`,
            );
          }
          return nativeQuery<Result, Params>(sql);
        },
      );
      restoreQuery = () => query.mockRestore();
      expect(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)).toThrow(
        'Service operation custody: stored operation identity differs',
      );
      expect(alteredQueries).toBe(1);
      restoreQuery();
      restoreQuery = undefined;
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toEqual(before);
      fixture.database
        .query('DELETE FROM agent_host_service_operation_custody WHERE workspace_id=? AND operation_id=?')
        .run(fixture.workspaceId, operationId);
      expect(
        expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        ),
      ).toBeNull();
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            restoreQuery?.();
            return undefined;
          },
          () => {
            closeServiceOperationDatabase(fixture.database);
            closed = true;
            return undefined;
          },
          () => {
            if (completed && closed) rmSync(fixture.root, { recursive: true, force: true });
            else retainExpectedUnknownFixture(fixture.root, 'query identity control failed');
            return undefined;
          },
        ],
        primaryFailure,
      );
    }
  });
}

test('reservation retains the original failure and rollback failure without committing its row', () => {
  const fixture = openCustodyFixture('service-reservation-rollback-fault-');
  const nativeExec = fixture.database.exec.bind(fixture.database);
  const commitError = new Error('injected reservation commit failure');
  const rollbackError = new Error('injected reservation rollback acknowledgement failure');
  const exec = spyOn(fixture.database, 'exec').mockImplementation((sql: string) => {
    if (sql === 'COMMIT') throw commitError;
    const result = nativeExec(sql);
    if (sql === 'ROLLBACK') throw rollbackError;
    return result;
  });
  try {
    let observed: unknown;
    try {
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      );
    } catch (error) {
      observed = error;
    }
    expect(observed).toBeInstanceOf(AggregateError);
    if (!(observed instanceof AggregateError)) throw new Error('Both transaction failures must be retained.');
    expect(observed.message).toBe('Service custody transaction and rollback failed.');
    expect(observed.errors).toEqual([commitError, rollbackError]);
    expect(fixture.database.inTransaction).toBe(false);
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)),
    ).toBeNull();
  } finally {
    exec.mockRestore();
    closeServiceOperationDatabase(fixture.database);
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('reconciliation rolls back when an AFTER UPDATE trigger deletes its CAS row', async () => {
  const fixture = openCustodyFixture();
  try {
    const prior = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      ),
    );
    fixture.database.exec(
      'CREATE TRIGGER remove_reconciled_custody AFTER UPDATE OF phase ON agent_host_service_operation_custody ' +
        "WHEN NEW.phase='prepared' BEGIN DELETE FROM agent_host_service_operation_custody " +
        'WHERE workspace_id=NEW.workspace_id AND operation_id=NEW.operation_id; END',
    );
    await expectRejection(
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => ({ phase: 'prepared', evidence_digest: 'c'.repeat(64) }),
      ),
      'same-operation reconciliation compare-and-swap failed',
    );
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    try {
      const { child_capability: _childCapability, ...before } = prior;
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toEqual(before);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
  } finally {
    retainExpectedUnknownFixture(fixture.root, 'failed launch reconciliation retains its original reservation');
  }
});

test('legacy reserve and direct claim reject before launch and preserve the operation journal', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'service-custody-legacy-held-'));
  const operation = 'legacy-held-operation';
  const journal = path.join(root, '.agent/work/agent-local-release/operations', operation, 'release.json');
  const before = Buffer.from('{"operation_id":"legacy-held-operation","status":"prepared"}\n');
  try {
    mkdirSync(path.dirname(journal), { recursive: true });
    writeFileSync(journal, before, { flag: 'wx' });
    const repositoryRoot =
      process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
    const adapterFile = path.join(repositoryRoot, 'tooling/agent/release-local.ts');
    const loaded: unknown = createRequire(import.meta.url)(adapterFile);
    if (!isLegacyReleaseAdapter(loaded)) throw new Error('Release adapter does not expose the legacy worker APIs.');
    let launchCalls = 0;
    await expectRejection(
      loaded.reserveReleaseWorker(root, operation, () => {
        launchCalls++;
        return pid;
      }),
      'Legacy release worker launch lacks durable service custody; preserve the operation.',
    );
    await expectRejection(
      loaded.claimReleaseWorker(root, operation, pid),
      'Legacy release worker claim lacks durable service custody; preserve the operation.',
    );
    expect(launchCalls).toBe(0);
    expect(readFileSync(journal)).toEqual(before);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('receipt failure presence is preserved when gate replacement blocks UNKNOWN custody cleanup', async () => {
  for (const receiptFailure of [new Error('receipt observation failed after gate replacement'), undefined]) {
    const fixture = openCustodyFixture();
    try {
      expectReturned(() =>
        reserveServiceOperationLaunch(
          fixture.database,
          fixture.workspaceId,
          'release-pack-worker',
          operationId,
          requestDigest,
          'c'.repeat(64),
        ),
      );
      const before = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      const gate = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
      const failure: unknown = await reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        async () => {
          await Promise.resolve();
          renameSync(gate, gate + '.retained');
          copyFileSync(gate + '.retained', gate);
          throw receiptFailure;
        },
      ).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error('Both receipt and custody errors must be retained.');
      expect(failure.message).toBe('reconciliation receipt failed and UNKNOWN custody cleanup is unresolved');
      expect(failure.errors).toHaveLength(2);
      const causes: readonly unknown[] = failure.errors;
      expect(causes[0]).toBe(receiptFailure);
      const cleanupFailure = causes[1];
      expect(cleanupFailure).toBeInstanceOf(Error);
      if (!(cleanupFailure instanceof Error)) throw new Error('Cleanup error must be retained.');
      if (receiptFailure instanceof Error)
        expect(receiptFailure.message).toBe('receipt observation failed after gate replacement');
      expect(cleanupFailure.message).toBe('Project storage admission: gate file or parent was replaced');
      const reopened = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      try {
        expect(
          expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
        ).toEqual(before);
      } finally {
        closeServiceOperationDatabase(reopened);
      }
    } finally {
      retainExpectedUnknownFixture(fixture.root, 'UNKNOWN cleanup remained unresolved after gate replacement');
    }
  }
});

function retainExpectedUnknownFixture(root: string, reason: string): void {
  console.error('SERVICE_CUSTODY_EXPECTED_UNKNOWN_FIXTURE_RETAINED', {
    root,
    reason,
    externalProcessStarted: false,
  });
}
