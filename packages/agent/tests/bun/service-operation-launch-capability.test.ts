import { describe, expect, test } from 'bun:test';
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
import { openCustodyFixture } from '../helpers/service-custody-fixture.js';
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
    owner_token: serviceOperationLaunchCapabilityDigest(capability),
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
    const digest = serviceOperationLaunchCapabilityDigest(capability);
    expect(serviceOperationLaunchCapabilityMatches(digest, capability)).toBe(true);
    expect(serviceOperationLaunchCapabilityMatches(digest, otherCapability)).toBe(false);
    expect(serviceOperationLaunchCapabilityMatches(digest, undefined)).toBe(false);
  });

  test('reused PID and exact journal identity do not authorize a different child', () => {
    const row = launchingRow();
    expect(
      serviceOperationLaunchClaimMatches(
        row,
        workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        otherCapability,
      ),
    ).toBe(false);
  });

  test('exact reservation accepts its child capability before the claim CAS', () => {
    expect(
      serviceOperationLaunchClaimMatches(
        launchingRow(),
        workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        capability,
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
      serviceOperationLaunchClaimMatches(
        consumed,
        workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        pid,
        capability,
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
      expect(before?.owner_token).toBe(serviceOperationLaunchCapabilityDigest(reservation.child_capability));
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
      const unknownRevision = closeServiceOperationCustody(handle, 'unknown', null);
      const unknown = expectReturned(() =>
        readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
      );
      expect(unknown?.phase).toBe('unknown');
      expect(unknown?.revision).toBe(unknownRevision);
      expect(unknown?.owner_token).toBeNull();
      expect(unknown?.launch_pid).toBeNull();
      expect(unknown?.evidence_digest).toBeNull();
      closeServiceOperationCustodyHandle(handle);
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
    const reservation = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
    );
    recordServiceOperationLaunchPid(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      reservation.revision,
      pid,
      reservation.child_capability,
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
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
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
    const reservation = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
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
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
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
    const reservation = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
    );
    recordServiceOperationLaunchPid(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      reservation.revision,
      pid,
      reservation.child_capability,
    );
    const before = readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId);
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
    expect(readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)).toEqual(before);
  } finally {
    closeServiceOperationDatabase(fixture.database);
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('a mismatched prepared digest preserves the same operation as UNKNOWN and revokes its child capability', async () => {
  const fixture = openCustodyFixture();
  try {
    const reservation = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
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
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    try {
      const row = readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId);
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
    const reservation = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
    );
    recordServiceOperationLaunchPid(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      reservation.revision,
      pid,
      reservation.child_capability,
    );
    handle = claimReservedServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      pid,
      reservation.child_capability,
    );
    const before = readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId);
    const reconciliationDatabase = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
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
    expect(readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId)).toEqual(before);
  } finally {
    if (handle) closeServiceOperationCustodyHandle(handle);
    else closeServiceOperationDatabase(fixture.database);
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('closed in-flight child reconciles only through its exact same-operation receipt', async () => {
  const fixture = openCustodyFixture();
  try {
    const reservation = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
    );
    recordServiceOperationLaunchPid(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      reservation.revision,
      pid,
      reservation.child_capability,
    );
    const handle = claimReservedServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      pid,
      reservation.child_capability,
    );
    const inFlight = readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId);
    expect(inFlight?.phase).toBe('in_flight');
    closeServiceOperationCustodyHandle(handle);
    const source = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
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
    const launching = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
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
    const unknownLaunch = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      unknownOperation,
      requestDigest,
      'c'.repeat(64),
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
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
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
      const terminalLaunch = reserveServiceOperationLaunch(
        reopened,
        fixture.workspaceId,
        'release-pack-worker',
        terminalOperation,
        requestDigest,
        'c'.repeat(64),
      );
      recordServiceOperationLaunchPid(
        reopened,
        fixture.workspaceId,
        'release-pack-worker',
        terminalOperation,
        requestDigest,
        terminalLaunch.revision,
        pid,
        terminalLaunch.child_capability,
      );
      terminalHandle = claimReservedServiceOperationLaunch(
        reopened,
        fixture.workspaceId,
        'release-pack-worker',
        terminalOperation,
        requestDigest,
        pid,
        terminalLaunch.child_capability,
      );
      closeServiceOperationCustody(terminalHandle, 'terminal', 'f'.repeat(64));
      const terminalBefore = readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, terminalOperation);
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
      expect(readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, terminalOperation)).toEqual(
        terminalBefore,
      );
      closeServiceOperationCustodyHandle(terminalHandle);
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
    initializeServiceOperationCustodySchema(fixture.database);
    const first = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
    );
    recordServiceOperationLaunchPid(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      first.revision,
      pid,
      first.child_capability,
    );
    handle = claimReservedServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      pid,
      first.child_capability,
    );
    const preparedRevision = closeServiceOperationCustody(handle, 'prepared', 'e'.repeat(64));
    closeServiceOperationCustodyHandle(handle);
    handle = undefined;
    originalClosed = true;

    reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    const second = reserveServiceOperationLaunch(
      reopened,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'e'.repeat(64),
    );
    expect(second.phase).toBe('launching');
    expect(second.revision).toBe(preparedRevision + 1);
    expect(second.child_capability).not.toBe(first.child_capability);
    expect(second.owner_token).toBe(serviceOperationLaunchCapabilityDigest(second.child_capability));
    const persisted = readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId);
    expect(persisted?.phase).toBe('launching');
    expect(persisted?.revision).toBe(second.revision);
    expect(persisted?.owner_token).toBe(second.owner_token);
    recordServiceOperationLaunchPid(
      reopened,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      second.revision,
      pid,
      second.child_capability,
    );
    handle = claimReservedServiceOperationLaunch(
      reopened,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      pid,
      second.child_capability,
    );
    closeServiceOperationCustody(handle, 'prepared', 'e'.repeat(64));
    closeServiceOperationCustodyHandle(handle);
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
  expect(() =>
    closeServiceOperationCustody(
      null as unknown as Parameters<typeof closeServiceOperationCustody>[0],
      'prepared',
      null,
    ),
  ).toThrow('Service operation custody: live operation handle is required');
});

test('reconciliation rolls back when an AFTER UPDATE trigger deletes its CAS row', async () => {
  const fixture = openCustodyFixture();
  try {
    const prior = reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      'release-pack-worker',
      operationId,
      requestDigest,
      'c'.repeat(64),
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
    const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
    try {
      const { child_capability: _childCapability, ...before } = prior;
      expect(readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)).toEqual(before);
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
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        'c'.repeat(64),
      );
      const before = readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId);
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
      const reopened = openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId);
      try {
        expect(readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)).toEqual(before);
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
