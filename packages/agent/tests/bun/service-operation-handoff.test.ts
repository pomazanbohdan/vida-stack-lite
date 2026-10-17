import { expect, spyOn, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import * as storageAdmission from '../../src/config/storage-read-admission.js';
import * as workspaceRaw from '../../src/config/workspace-database-raw.js';
import { copyFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  closeServiceOperationCustody,
  closeServiceOperationCustodyHandle,
  closeServiceOperationDatabase,
  handoffServiceOperationCustody,
  openServiceOperationDatabase,
  readServiceOperationCustodyForOperation,
  recordServiceOperationLaunchPid,
  reserveServiceOperationLaunch,
  reconcileServiceOperationCustody,
  claimReservedServiceOperationLaunch,
} from '../../src/config/service-operation-custody.js';
import { expectAsyncReturned, expectRejection, expectReturned, rejectionReason } from '../helpers/expect-rejection.js';
import { retryPendingWorkspaceDatabaseCloses } from '../../src/config/workspace-database-raw.js';
import { openCustodyFixture, type ServiceCustodyFixture } from '../helpers/service-custody-fixture.js';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.js';

const requestDigest = 'b'.repeat(64);
const retargetDigest = 'd'.repeat(64);
const evidenceDigest = 'e'.repeat(64);
const terminalDigest = 'f'.repeat(64);
const handoffDigest = '9'.repeat(64);
const operationId = 'handoff-operation';
const launchPid = 7312;
type HandoffVerifier = Parameters<typeof handoffServiceOperationCustody>[7];

// Fault-only dependency response: no proof is issued and no operation callback runs.
// This validates the caller's missing-result denial, not native gate acceptance.
for (const route of ['handoff', 'reconciliation'] as const) {
  test(`${route} rejects an inert admission response without a custody result`, async () => {
    const fixture = openCustodyFixture('service-inert-admission-result-');
    let restoreAdmission: (() => void) | undefined;
    let failure: { error: unknown } | undefined;
    try {
      let source = fixture.database;
      if (route === 'handoff') {
        finishOperation(fixture, 'release-pack-worker');
        source = expectReturned(() =>
          openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
        );
      } else
        expectReturned(() =>
          reserveServiceOperationLaunch(
            fixture.database,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            evidenceDigest,
          ),
        );
      const before = expectReturned(() =>
        readServiceOperationCustodyForOperation(source, fixture.workspaceId, operationId),
      );
      const inert = spyOn(storageAdmission, 'withExclusiveServiceOperationAdmission').mockImplementation(
        async () => undefined as never,
      );
      restoreAdmission = () => inert.mockRestore();
      let verifierCalls = 0;
      const operation =
        route === 'handoff'
          ? handoffServiceOperationCustody(
              source,
              fixture.root,
              fixture.relative,
              fixture.workspaceId,
              operationId,
              requestDigest,
              retargetDigest,
              async () => {
                verifierCalls++;
                return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
              },
            )
          : reconcileServiceOperationCustody(
              source,
              fixture.root,
              fixture.relative,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              requestDigest,
              () => {
                verifierCalls++;
                return { phase: 'prepared', evidence_digest: evidenceDigest };
              },
            );
      await expectRejection(
        operation,
        `Service operation custody: same-operation ${route === 'handoff' ? 'handoff' : 'reconciliation'} did not close`,
      );
      restoreAdmission();
      restoreAdmission = undefined;
      expect(verifierCalls).toBe(0);
      const reader = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      try {
        expect(
          expectReturned(() => readServiceOperationCustodyForOperation(reader, fixture.workspaceId, operationId)),
        ).toEqual(before);
      } finally {
        closeServiceOperationDatabase(reader);
      }
    } catch (error) {
      failure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            restoreAdmission?.();
            return undefined;
          },
          () => {
            closeServiceOperationDatabase(fixture.database);
            return undefined;
          },
        ],
        failure,
      );
      console.error('SERVICE_CUSTODY_INERT_ADMISSION_FIXTURE_RETAINED', {
        root: fixture.root,
        route,
        externalProcessStarted: false,
      });
    }
  });
}

for (const route of ['handoff', 'reconciliation', 'reconciliation_unknown'] as const) {
  test(`exclusive ${route} connections preserve SQLite int64 precision before row normalization`, async () => {
    const fixture = openCustodyFixture('service-reconciliation-integer-transport-');
    let restoreRawOpen: (() => void) | undefined;
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      fixture.database.exec('PRAGMA journal_mode=WAL');
      let source = fixture.database;
      if (route === 'handoff') {
        finishOperation(fixture, 'release-pack-worker');
        source = expectReturned(() =>
          openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
        );
      } else
        expectReturned(() =>
          reserveServiceOperationLaunch(
            fixture.database,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            evidenceDigest,
          ),
        );
      const integers: (number | bigint | undefined)[] = [];
      const verificationWriteDenied: boolean[] = [];
      let verifierEntered = false;
      const nativeOpen = workspaceRaw.openUnadmittedWorkspaceDatabase;
      const watched = spyOn(workspaceRaw, 'openUnadmittedWorkspaceDatabase').mockImplementation((...args) => {
        const database = nativeOpen(...args);
        if (args[0] !== fixture.root || args[1] !== fixture.relative) return database;
        // Observe real SQLite transport under the real captured source owner.
        // This vector cannot round-trip through a JavaScript Number.
        integers.push(database.query<{ value: number | bigint }, []>('SELECT 9007199254740993 AS value').get()?.value);
        if (!verifierEntered) {
          let denied = false;
          try {
            database.exec('UPDATE agent_host_service_operation_custody SET revision=revision WHERE 0');
          } catch (error) {
            if (!(error instanceof Error) || !('code' in error) || error.code !== 'SQLITE_READONLY') throw error;
            denied = true;
          }
          verificationWriteDenied.push(denied);
        }
        return database;
      });
      restoreRawOpen = () => watched.mockRestore();
      let prepared: Awaited<ReturnType<typeof reconcileServiceOperationCustody>>;
      if (route === 'handoff')
        prepared = await expectAsyncReturned(() =>
          handoffServiceOperationCustody(
            source,
            fixture.root,
            fixture.relative,
            fixture.workspaceId,
            operationId,
            requestDigest,
            retargetDigest,
            async (prior) => {
              verifierEntered = true;
              return preparedReceipt(prior);
            },
          ),
        );
      else if (route === 'reconciliation_unknown') {
        const receiptFailure = new Error('integer transport receipt unavailable');
        expect(
          await rejectionReason(
            reconcileServiceOperationCustody(
              source,
              fixture.root,
              fixture.relative,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              requestDigest,
              () => {
                verifierEntered = true;
                return Promise.reject(receiptFailure);
              },
            ),
          ),
        ).toBe(receiptFailure);
        restoreRawOpen();
        restoreRawOpen = undefined;
        const reader = expectReturned(() =>
          openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
        );
        try {
          const row = expectReturned(() =>
            readServiceOperationCustodyForOperation(reader, fixture.workspaceId, operationId),
          );
          expect(row).not.toBeNull();
          if (!row) throw new Error('Expected persisted UNKNOWN reconciliation row.');
          prepared = row;
        } finally {
          closeServiceOperationDatabase(reader);
        }
      } else
        prepared = await expectAsyncReturned(() =>
          reconcileServiceOperationCustody(
            source,
            fixture.root,
            fixture.relative,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            () => {
              verifierEntered = true;
              return { phase: 'prepared', evidence_digest: evidenceDigest };
            },
          ),
        );
      restoreRawOpen?.();
      restoreRawOpen = undefined;
      expect(integers.length).toBeGreaterThan(0);
      expect(verificationWriteDenied.length).toBeGreaterThan(0);
      for (const denied of verificationWriteDenied) expect(denied).toBe(true);
      for (const value of integers) expect(value).toBe(9007199254740993n);
      expect(prepared).toBeObject();
      expect(prepared.phase).toBe(route === 'reconciliation_unknown' ? 'unknown' : 'prepared');
      expect(prepared.owner_token).toBeNull();
      expect(prepared.launch_pid).toBeNull();
      expect(prepared.evidence_digest).toBe(route === 'reconciliation_unknown' ? null : evidenceDigest);
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            restoreRawOpen?.();
            return undefined;
          },
          () => {
            closeServiceOperationDatabase(fixture.database);
            return undefined;
          },
        ],
        primaryFailure,
      );
      if (completed && route !== 'reconciliation_unknown') rmSync(fixture.root, { recursive: true, force: true });
      else
        console.error('SERVICE_CUSTODY_INTEGER_TRANSPORT_FIXTURE_RETAINED', {
          root: fixture.root,
          route,
          completed,
          externalProcessStarted: false,
        });
    }
  });
}

test('reconciliation rejects malformed keys and request digests before verifying or mutating a journal', async () => {
  const fixture = openCustodyFixture('reconcile-invalid-operation-key-');
  let reader: Database | undefined;
  let completed = false;
  let failure: { error: unknown } | undefined;
  try {
    closeServiceOperationDatabase(fixture.database);
    let verifierCalls = 0;
    for (const key of [
      {
        kind: 'release-pack-worker' as const,
        operation: '!' + operationId,
        digest: requestDigest,
        message: 'operation identity is invalid',
      },
      {
        kind: 'invalid-worker' as 'release-pack-worker',
        operation: operationId,
        digest: requestDigest,
        message: 'owner kind is invalid',
      },
      {
        kind: 'release-pack-worker' as const,
        operation: operationId,
        digest: 'g'.repeat(64),
        message: 'request digest is invalid',
      },
    ]) {
      const source = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      reader = source;
      await expectRejection(
        reconcileServiceOperationCustody(
          source,
          fixture.root,
          fixture.relative,
          fixture.workspaceId,
          key.kind,
          key.operation,
          key.digest,
          () => {
            verifierCalls++;
            return { phase: 'prepared', evidence_digest: evidenceDigest };
          },
        ),
        'Service operation custody: ' + key.message,
      );
      closeServiceOperationDatabase(source);
      reader = undefined;
    }
    expect(verifierCalls).toBe(0);
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    reader = reopened;
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
    ).toBeNull();
    completed = true;
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          if (reader) closeServiceOperationDatabase(reader);
          return undefined;
        },
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
      ],
      failure,
    );
    if (completed) rmSync(fixture.root, { recursive: true, force: true });
    else console.error('Retained failed reconciliation operation-key fixture: ' + fixture.root);
  }
});

test('handoff rejects malformed prior and new request digests before verifying and preserves its terminal row', async () => {
  const fixture = openCustodyFixture('handoff-invalid-request-digest-');
  let completed = false;
  let failure: { error: unknown } | undefined;
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    let verifierCalls = 0;
    expect(
      await expectHandoffFailure(
        fixture,
        prior,
        async () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
        'Service operation custody: prior request digest is invalid',
        'g'.repeat(64),
      ),
    ).toEqual(prior);
    expect(
      await expectHandoffFailure(
        fixture,
        prior,
        async () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
        'Service operation custody: request digest is invalid',
        requestDigest,
        'g'.repeat(64),
      ),
    ).toEqual(prior);
    expect(verifierCalls).toBe(0);
    completed = true;
  } catch (error) {
    failure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
      ],
      failure,
    );
    if (completed) rmSync(fixture.root, { recursive: true, force: true });
    else console.error('Retained failed handoff prior-digest fixture: ' + fixture.root);
  }
});

test('handoff and reconciliation reject an unbound connection before closing it or verifying receipts', async () => {
  const fixture = openCustodyFixture('service-path-binding-');
  const unbound = new Database(path.join(fixture.root, fixture.relative));
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    let verifierCalls = 0;
    await expectRejection(
      handoffServiceOperationCustody(
        unbound,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ),
      'Service operation custody: workspace database path binding differs',
    );
    await expectRejection(
      reconcileServiceOperationCustody(
        unbound,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest };
        },
      ),
      'Service operation custody: workspace database path binding differs',
    );
    expect(verifierCalls).toBe(0);
    const differentRoot = path.join(fixture.root, 'different-root');
    await expectRejection(
      handoffServiceOperationCustody(
        fixture.database,
        differentRoot,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ),
      'Service operation custody: workspace database path binding differs',
    );
    await expectRejection(
      reconcileServiceOperationCustody(
        fixture.database,
        differentRoot,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest };
        },
      ),
      'Service operation custody: workspace database path binding differs',
    );
    expect(verifierCalls).toBe(0);
    expect(unbound.query<{ alive: number }, []>('SELECT 1 AS alive').get()?.alive).toBe(1);
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
          unbound.close();
          return undefined;
        },
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
      ],
      primaryFailure,
    );
    if (completed) rmSync(fixture.root, { recursive: true, force: true });
    else console.error('Retained failed database binding fixture: ' + fixture.root);
  }
});

for (const route of ['handoff', 'reconciliation'] as const) {
  test(`${route} rejects an absent operation before invoking its receipt verifier`, async () => {
    const fixture = openCustodyFixture('service-missing-operation-');
    let reader: Database | undefined;
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      const before = fixture.database
        .query("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'")
        .get();
      let verifierCalls = 0;
      const operation =
        route === 'handoff'
          ? handoffServiceOperationCustody(
              fixture.database,
              fixture.root,
              fixture.relative,
              fixture.workspaceId,
              operationId,
              requestDigest,
              retargetDigest,
              async () => {
                verifierCalls++;
                return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
              },
            )
          : reconcileServiceOperationCustody(
              fixture.database,
              fixture.root,
              fixture.relative,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              requestDigest,
              () => {
                verifierCalls++;
                return { phase: 'prepared', evidence_digest: evidenceDigest };
              },
            );
      await expectRejection(
        operation,
        route === 'handoff'
          ? 'Service operation custody: only the exact terminal pack owner can hand off'
          : 'Service operation custody: same-operation reconciliation is not applicable',
      );
      expect(verifierCalls).toBe(0);
      const reopened = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      reader = reopened;
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toBeNull();
      expect(reopened.query('SELECT * FROM agent_host_service_operation_custody').all()).toEqual([]);
      expect(
        reopened.query("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'").get(),
      ).toEqual(before);
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            if (reader !== undefined) closeServiceOperationDatabase(reader);
            return undefined;
          },
          () => {
            closeServiceOperationDatabase(fixture.database);
            return undefined;
          },
        ],
        primaryFailure,
      );
      if (completed) rmSync(fixture.root, { recursive: true, force: true });
      else console.error('Retained failed missing-operation fixture: ' + fixture.root);
    }
  });
}

test('reconciliation rejects schema drift before receipt verification and succeeds after exact restoration', async () => {
  const fixture = openCustodyFixture('reconcile-schema-drift-');
  let inspection: Database | undefined;
  let retry: Database | undefined;
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const reservation = expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        evidenceDigest,
      ),
    );
    fixture.database.exec('ALTER TABLE agent_host_service_operation_custody ADD COLUMN unexpected TEXT');
    const before = fixture.database.query('SELECT * FROM agent_host_service_operation_custody').all();
    const schema = fixture.database
      .query("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'")
      .get();
    let verifierCalls = 0;
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
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest };
        },
      ),
      'Service operation custody: owned service table is absent or differs',
    );
    expect(verifierCalls).toBe(0);
    // The exclusive operation has settled and closed its source. Observe the
    // real image independently; no second admission handle can block its gate.
    inspection = new Database(path.join(fixture.root, fixture.relative), { safeIntegers: true });
    expect(inspection.query('SELECT * FROM agent_host_service_operation_custody').all()).toEqual(before);
    expect(
      inspection.query("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'").get(),
    ).toEqual(schema);
    inspection.exec('ALTER TABLE agent_host_service_operation_custody DROP COLUMN unexpected');
    inspection.close();
    inspection = undefined;
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    retry = reopened;
    const reconciled = await expectAsyncReturned(() =>
      reconcileServiceOperationCustody(
        reopened,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest };
        },
      ),
    );
    expect(verifierCalls).toBe(1);
    expect(reconciled).toBeObject();
    expect(reconciled.phase).toBe('prepared');
    expect(reconciled.evidence_digest).toBe(evidenceDigest);
    expect(reconciled.revision).toBe(reservation.revision + 1);
    expect(reconciled.operation_id).toBe(operationId);
    expect(reconciled.request_digest).toBe(requestDigest);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          inspection?.close();
          return undefined;
        },
        () => {
          if (retry !== undefined) closeServiceOperationDatabase(retry);
          return undefined;
        },
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
      ],
      primaryFailure,
    );
    if (completed) rmSync(fixture.root, { recursive: true, force: true });
    else console.error('Retained failed reconciliation schema-drift fixture: ' + fixture.root);
  }
});

test('reconciliation rechecks a gate replaced immediately before its operation callback', async () => {
  const fixture = openCustodyFixture('reconcile-entry-gate-replacement-');
  let restoreAdmission: (() => void) | undefined;
  let reader: Database | undefined;
  let primaryFailure: { error: unknown } | undefined;
  try {
    expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        evidenceDigest,
      ),
    );
    const before = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    const nativeAdmission = storageAdmission.withExclusiveServiceOperationAdmission;
    let interleavings = 0;
    let verifierCalls = 0;
    const interleave: typeof nativeAdmission = (root, workspaceId, verify, operation) =>
      nativeAdmission(root, workspaceId, verify, async (proof) => {
        // Keep the real gate, held-owner verification and source close, then
        // interleave a real namespace replacement at the callback boundary.
        replaceAdmissionGate(fixture);
        interleavings++;
        return operation(proof);
      });
    const admission = spyOn(storageAdmission, 'withExclusiveServiceOperationAdmission').mockImplementation(interleave);
    restoreAdmission = () => admission.mockRestore();
    const failure = await rejectionReason(
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest };
        },
      ),
    );
    restoreAdmission();
    restoreAdmission = undefined;
    expect(interleavings).toBe(1);
    expect(verifierCalls).toBe(0);
    const cause: unknown = failure instanceof AggregateError ? failure.errors[0] : failure;
    expect(cause).toBeInstanceOf(Error);
    if (!(cause instanceof Error)) throw new Error('Expected the real gate identity denial.');
    expect(cause.message).toBe('Project storage admission: gate file or parent was replaced');
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    reader = reopened;
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
    ).toEqual(before);
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          restoreAdmission?.();
          return undefined;
        },
        () => {
          if (reader) closeServiceOperationDatabase(reader);
          return undefined;
        },
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
        () => {
          console.error('SERVICE_CUSTODY_ENTRY_GATE_REPLACEMENT_FIXTURE_RETAINED', fixture.root);
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

test('handoff rechecks a gate replaced immediately before its operation callback', async () => {
  const fixture = openCustodyFixture('handoff-entry-gate-replacement-');
  let restoreAdmission: (() => void) | undefined;
  let restoreRawOpen: (() => void) | undefined;
  let reader: Database | undefined;
  let primaryFailure: { error: unknown } | undefined;
  try {
    finishOperation(fixture, 'release-pack-worker');
    const source = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    const before = expectReturned(() =>
      readServiceOperationCustodyForOperation(source, fixture.workspaceId, operationId),
    );
    const nativeAdmission = storageAdmission.withExclusiveServiceOperationAdmission;
    let interleavings = 0;
    let verifierCalls = 0;
    let openedAfterGateLoss = 0;
    const nativeOpen = workspaceRaw.openUnadmittedWorkspaceDatabase;
    const watchedOpen = spyOn(workspaceRaw, 'openUnadmittedWorkspaceDatabase').mockImplementation((...args) => {
      if (interleavings > 0 && args[0] === fixture.root && args[1] === fixture.relative) openedAfterGateLoss++;
      return nativeOpen(...args);
    });
    restoreRawOpen = () => watchedOpen.mockRestore();
    const interleave: typeof nativeAdmission = (root, workspaceId, verify, operation) =>
      nativeAdmission(root, workspaceId, verify, async (proof) => {
        replaceAdmissionGate(fixture);
        interleavings++;
        return operation(proof);
      });
    const admission = spyOn(storageAdmission, 'withExclusiveServiceOperationAdmission').mockImplementation(interleave);
    restoreAdmission = () => admission.mockRestore();
    const failure = await rejectionReason(
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ),
    );
    restoreAdmission();
    restoreAdmission = undefined;
    restoreRawOpen();
    restoreRawOpen = undefined;
    expect(interleavings).toBe(1);
    expect(verifierCalls).toBe(0);
    expect(openedAfterGateLoss).toBe(0);
    const cause: unknown = failure instanceof AggregateError ? failure.errors[0] : failure;
    expect(cause).toBeInstanceOf(Error);
    if (!(cause instanceof Error)) throw new Error('Expected the real gate identity denial.');
    expect(cause.message).toBe('Project storage admission: gate file or parent was replaced');
    reader = expectReturned(() => openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId));
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(reader!, fixture.workspaceId, operationId)),
    ).toEqual(before);
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          restoreAdmission?.();
          return undefined;
        },
        () => {
          restoreRawOpen?.();
          return undefined;
        },
        () => {
          if (reader) closeServiceOperationDatabase(reader);
          return undefined;
        },
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
        () => {
          console.error('SERVICE_CUSTODY_HANDOFF_ENTRY_GATE_REPLACEMENT_FIXTURE_RETAINED', fixture.root);
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

test('terminal pack custody transfers to one prepared release image with exact lineage and no owner token', async () => {
  const fixture = openCustodyFixture('handoff-positive-');
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    const source = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    let verifierCalls = 0;
    const result = await expectAsyncReturned(() =>
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async (observed) => {
          verifierCalls++;
          expect(observed).toEqual(prior);
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ),
    );
    expect(verifierCalls).toBe(1);
    expect(() => source.query('SELECT 1').get()).toThrow();
    expectHandoffLineage(result, prior);
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    try {
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toEqual(result);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('handoff rejects custody schema drift before verification and succeeds after exact restoration', async () => {
  const fixture = openCustodyFixture('handoff-schema-drift-');
  let source: Database | undefined;
  let inspection: Database | undefined;
  let retry: Database | undefined;
  let completed = false;
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    source = expectReturned(() => openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId));
    source.exec('ALTER TABLE agent_host_service_operation_custody ADD COLUMN unexpected TEXT');
    const before = source.query('SELECT * FROM agent_host_service_operation_custody').all();
    const schema = source
      .query("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'")
      .get();
    let verifierCalls = 0;
    await expectRejection(
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ),
      'Service operation custody: owned service table is absent or differs',
    ).finally(() => {
      source = undefined;
    });
    expect(verifierCalls).toBe(0);

    inspection = new Database(path.join(fixture.root, fixture.relative), { safeIntegers: true });
    expect(inspection.query('SELECT * FROM agent_host_service_operation_custody').all()).toEqual(before);
    expect(
      inspection.query("SELECT sql FROM sqlite_master WHERE name='agent_host_service_operation_custody'").get(),
    ).toEqual(schema);
    inspection.exec('ALTER TABLE agent_host_service_operation_custody DROP COLUMN unexpected');
    inspection.close();
    inspection = undefined;

    retry = expectReturned(() => openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId));
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(retry!, fixture.workspaceId, operationId)),
    ).toEqual(prior);
    const result = await expectAsyncReturned(() =>
      handoffServiceOperationCustody(
        retry!,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async (observed) => {
          verifierCalls++;
          expect(observed).toEqual(prior);
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ),
    ).finally(() => {
      retry = undefined;
    });
    expect(verifierCalls).toBe(1);
    expectHandoffLineage(result, prior);
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    try {
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toEqual(result);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
    completed = true;
  } finally {
    inspection?.close();
    if (source !== undefined) closeServiceOperationDatabase(source);
    if (retry !== undefined) closeServiceOperationDatabase(retry);
    if (completed) rmSync(fixture.root, { recursive: true, force: true });
    else console.error('Retained failed handoff schema-drift fixture: ' + fixture.root);
  }
});

test('handoff keeps its source-read diagnostic when owned source cleanup also fails', async () => {
  const fixture = openCustodyFixture('handoff-read-close-fault-');
  let source: Database | undefined;
  let inspection: Database | undefined;
  let reader: Database | undefined;
  let restoreRawOpen: (() => void) | undefined;
  let restoreClose: (() => void) | undefined;
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    source = expectReturned(() => openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId));
    source.exec('ALTER TABLE agent_host_service_operation_custody ADD COLUMN unexpected TEXT');

    let ownedSource: Database | undefined;
    const nativeOpen = workspaceRaw.openUnadmittedWorkspaceDatabase;
    const watchedOpen = spyOn(workspaceRaw, 'openUnadmittedWorkspaceDatabase').mockImplementation((...args) => {
      const database = nativeOpen(...args);
      if (ownedSource === undefined && args[0] === fixture.root && args[1] === fixture.relative) ownedSource = database;
      return database;
    });
    restoreRawOpen = () => watchedOpen.mockRestore();

    const closeError = new Error('injected handoff source cleanup failure');
    let closeFaultReached = false;
    let verifierCalls = 0;
    const nativeClose = Reflect.get(Database.prototype, 'close') as Database['close'];
    const watchedClose = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      force?: boolean,
    ): void {
      if (this === ownedSource && !closeFaultReached) {
        closeFaultReached = true;
        throw closeError;
      }
      nativeClose.call(this, force);
    });
    restoreClose = () => watchedClose.mockRestore();

    const failure = await rejectionReason(
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async () => {
          verifierCalls++;
          throw new Error('handoff verifier must not run after a source-read failure');
        },
      ).finally(() => {
        source = undefined;
      }),
    );
    expect(closeFaultReached).toBe(true);
    expect(verifierCalls).toBe(0);
    expect(failure).toBeInstanceOf(AggregateError);
    if (!(failure instanceof AggregateError)) throw new Error('Handoff source read and close causes must survive.');
    expect(failure.message).toBe('handoff source read and close failed');
    expect(failure.errors).toHaveLength(2);
    expect(failure.errors[0]).toBeInstanceOf(Error);
    if (!(failure.errors[0] instanceof Error)) throw new Error('The custody schema read error must survive.');
    expect(failure.errors[0].message).toBe('Service operation custody: owned service table is absent or differs');
    expect(failure.errors[1]).toBe(closeError);

    restoreClose();
    restoreClose = undefined;
    restoreRawOpen();
    restoreRawOpen = undefined;
    retryPendingWorkspaceDatabaseCloses();

    inspection = new Database(path.join(fixture.root, fixture.relative));
    expect(
      inspection
        .query(
          'SELECT workspace_id,owner_kind,operation_id,request_digest,owner_token,revision,phase,evidence_digest,' +
            'launch_pid,handoff_digest,handoff_from_kind,handoff_from_phase,handoff_from_request_digest,' +
            'handoff_from_revision,handoff_from_evidence_digest FROM agent_host_service_operation_custody ' +
            'WHERE workspace_id=? AND operation_id=?',
        )
        .get(fixture.workspaceId, operationId),
    ).toEqual(prior);
    inspection.exec('ALTER TABLE agent_host_service_operation_custody DROP COLUMN unexpected');
    inspection.close();
    inspection = undefined;

    reader = expectReturned(() => openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId));
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(reader!, fixture.workspaceId, operationId)),
    ).toEqual(prior);
    closeServiceOperationDatabase(reader);
    reader = undefined;
    completed = true;
  } catch (error) {
    primaryFailure = { error };
  }
  try {
    completeOwnedCleanup(
      [
        () => {
          restoreClose?.();
          return undefined;
        },
        () => {
          restoreRawOpen?.();
          return undefined;
        },
        () => {
          retryPendingWorkspaceDatabaseCloses();
          return undefined;
        },
        () => {
          if (source !== undefined) closeServiceOperationDatabase(source);
          return undefined;
        },
        () => {
          inspection?.close();
          return undefined;
        },
        () => {
          if (reader !== undefined) closeServiceOperationDatabase(reader);
          return undefined;
        },
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
      ],
      primaryFailure,
    );
    if (primaryFailure !== undefined) throw primaryFailure.error;
  } catch (error) {
    console.error('Retained failed handoff source-read close fixture: ' + fixture.root);
    throw error;
  }
  if (completed) rmSync(fixture.root, { recursive: true, force: true });
});

test('handoff stops before receipt verification when a valid source read cannot close', async () => {
  const fixture = openCustodyFixture('handoff-valid-read-close-fault-');
  let source: Database | undefined;
  let reader: Database | undefined;
  let ownedSource: Database | undefined;
  let restoreRawOpen: (() => void) | undefined;
  let restoreClose: (() => void) | undefined;
  let completed = false;
  let primaryFailure: { error: unknown } | undefined;
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    source = expectReturned(() => openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId));

    const nativeOpen = workspaceRaw.openUnadmittedWorkspaceDatabase;
    const watchedOpen = spyOn(workspaceRaw, 'openUnadmittedWorkspaceDatabase').mockImplementation((...args) => {
      const database = nativeOpen(...args);
      if (ownedSource === undefined && args[0] === fixture.root && args[1] === fixture.relative) ownedSource = database;
      return database;
    });
    restoreRawOpen = () => watchedOpen.mockRestore();

    const closeError = new Error('injected handoff source close failure after successful read');
    let closeFaultReached = false;
    const nativeClose = Reflect.get(Database.prototype, 'close') as Database['close'];
    const watchedClose = spyOn(Database.prototype, 'close').mockImplementation(function (
      this: Database,
      force?: boolean,
    ): void {
      if (this === ownedSource && !closeFaultReached) {
        closeFaultReached = true;
        throw closeError;
      }
      nativeClose.call(this, force);
    });
    restoreClose = () => watchedClose.mockRestore();

    let verifierCalls = 0;
    const failure = await rejectionReason(
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        async () => {
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        },
      ).finally(() => {
        source = undefined;
      }),
    );
    expect(closeFaultReached).toBe(true);
    expect(verifierCalls).toBe(0);
    expect(failure).toBe(closeError);

    restoreClose();
    restoreClose = undefined;
    restoreRawOpen();
    restoreRawOpen = undefined;
    retryPendingWorkspaceDatabaseCloses();
    reader = expectReturned(() => openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId));
    expect(
      expectReturned(() => readServiceOperationCustodyForOperation(reader!, fixture.workspaceId, operationId)),
    ).toEqual(prior);
    completed = true;
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          restoreClose?.();
          return undefined;
        },
        () => {
          restoreRawOpen?.();
          return undefined;
        },
        () => {
          retryPendingWorkspaceDatabaseCloses();
          return undefined;
        },
        () => {
          if (source !== undefined) closeServiceOperationDatabase(source);
          return undefined;
        },
        () => {
          if (reader !== undefined) closeServiceOperationDatabase(reader);
          return undefined;
        },
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
        () => {
          if (completed) rmSync(fixture.root, { recursive: true, force: true });
          else console.error('Retained handoff valid-read close fixture: ' + fixture.root);
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

test('handoff rejects a release owner, a different prior request, and a nonterminal pack row without mutation', async () => {
  await assertRejectedLineage(
    'handoff-wrong-owner-',
    'release-worker',
    requestDigest,
    /only the exact terminal pack owner/u,
  );
  await assertRejectedLineage(
    'handoff-wrong-request-',
    'release-pack-worker',
    'c'.repeat(64),
    /only the exact terminal pack owner/u,
  );
  await assertPreparedPackCannotHandoff();
});

test('handoff rejects a missing verifier before touching the exact terminal pack row', async () => {
  const fixture = openCustodyFixture('handoff-missing-verifier-');
  let completed = false;
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    expect(
      await expectHandoffFailure(
        fixture,
        prior,
        undefined as unknown as HandoffVerifier,
        'Service operation custody: handoff verifier is required',
      ),
    ).toEqual(prior);
    completed = true;
  } finally {
    if (completed) rmSync(fixture.root, { recursive: true, force: true });
    else console.error('Retained failed missing-verifier fixture: ' + fixture.root);
  }
});

test('verifier rejection and malformed prepared receipt preserve the terminal pack row', async () => {
  const fixture = openCustodyFixture('handoff-verifier-failure-');
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    const verifierFailure = async (): Promise<never> => {
      throw new Error('retarget receipt unavailable');
    };
    const afterVerifierFailure = await expectHandoffFailure(
      fixture,
      prior,
      verifierFailure,
      'retarget receipt unavailable',
    );
    expect(afterVerifierFailure).toEqual(prior);
    const malformedReceipt: HandoffVerifier = async () => ({
      phase: 'prepared',
      evidence_digest: 'invalid',
      handoff_digest: handoffDigest,
    });
    const afterMalformedReceipt = await expectHandoffFailure(
      fixture,
      prior,
      malformedReceipt,
      /handoff install image digest is invalid/u,
    );
    expect(afterMalformedReceipt).toEqual(prior);
    const wrongPhaseReceipt = (async () => ({
      phase: 'terminal',
      evidence_digest: evidenceDigest,
      handoff_digest: handoffDigest,
    })) as unknown as HandoffVerifier;
    const afterWrongPhaseReceipt = await expectHandoffFailure(
      fixture,
      prior,
      wrongPhaseReceipt,
      /handoff receipt is not a prepared install image/u,
    );
    expect(afterWrongPhaseReceipt).toEqual(prior);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

for (const route of ['handoff', 'reconciliation'] as const) {
  for (const failCas of [false, true]) {
    test(`${route} retains ${failCas ? 'CAS and close failures' : 'a close failure after its real CAS'}`, async () => {
      const fixture = openCustodyFixture('handoff-close-fault-');
      const cleanupError = new Error('injected exact service connection close failure');
      let restoreClose: (() => void) | undefined;
      let reconciled = false;
      try {
        let prior: Awaited<ReturnType<typeof handoffServiceOperationCustody>>;
        let source = fixture.database;
        if (route === 'handoff') {
          prior = finishOperation(fixture, 'release-pack-worker');
          source = expectReturned(() =>
            openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
          );
        } else {
          expectReturned(() =>
            reserveServiceOperationLaunch(
              source,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              requestDigest,
              evidenceDigest,
            ),
          );
          const row = expectReturned(() =>
            readServiceOperationCustodyForOperation(source, fixture.workspaceId, operationId),
          );
          expect(row).not.toBeNull();
          if (!row) throw new Error('Expected exact reconciliation beforeimage.');
          prior = row;
        }
        if (failCas)
          source.exec(
            'CREATE TRIGGER reject_operation BEFORE UPDATE ON agent_host_service_operation_custody ' +
              `BEGIN SELECT RAISE(ABORT, 'injected ${route} CAS failure'); END`,
          );
        const verify = async () => {
          // Install only after the real beforeimage connection has closed.
          restoreClose = failExactServiceClose(fixture, cleanupError);
          return { phase: 'prepared' as const, evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
        };
        const failure = await rejectionReason(
          route === 'handoff'
            ? handoffServiceOperationCustody(
                source,
                fixture.root,
                fixture.relative,
                fixture.workspaceId,
                operationId,
                requestDigest,
                retargetDigest,
                verify,
              )
            : reconcileServiceOperationCustody(
                source,
                fixture.root,
                fixture.relative,
                fixture.workspaceId,
                'release-pack-worker',
                operationId,
                requestDigest,
                verify,
              ),
        );
        if (failCas) {
          expect(failure).toBeInstanceOf(AggregateError);
          if (!(failure instanceof AggregateError)) throw new Error('CAS and close failures must both survive.');
          expect(failure.message).toBe(`${route} CAS and close failed`);
          const causes: readonly unknown[] = failure.errors;
          expect(causes).toHaveLength(2);
          expect(causes[0]).toBeInstanceOf(Error);
          if (!(causes[0] instanceof Error)) throw new Error('The native CAS failure must survive.');
          expect(causes[0].message).toContain(`injected ${route} CAS failure`);
          expect(causes[1]).toBe(cleanupError);
        } else expect(failure).toBe(cleanupError);
        restoreClose?.();
        restoreClose = undefined;
        retryPendingWorkspaceDatabaseCloses();
        const reopened = expectReturned(() =>
          openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
        );
        try {
          const row = expectReturned(() =>
            readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId),
          );
          if (failCas) expect(row).toEqual(prior);
          else {
            expect(row).not.toBeNull();
            if (row === null) throw new Error('The committed handoff must remain observable.');
            if (route === 'handoff') expectHandoffLineage(row, prior);
            else {
              expect(row.phase).toBe('prepared');
              expect(row.revision).toBe(prior.revision + 1);
              expect(row.request_digest).toBe(prior.request_digest);
              expect(row.owner_token).toBeNull();
              expect(row.evidence_digest).toBe(evidenceDigest);
            }
          }
          reconciled = true;
        } finally {
          closeServiceOperationDatabase(reopened);
        }
      } finally {
        restoreClose?.();
        retryPendingWorkspaceDatabaseCloses();
        if (reconciled) rmSync(fixture.root, { recursive: true, force: true });
        else console.error('SERVICE_CUSTODY_CLOSE_FAULT_FIXTURE_RETAINED', fixture.root);
      }
    });
  }
}

test('receipt failure retains its cause when closing the real UNKNOWN connection also fails', async () => {
  const fixture = openCustodyFixture('service-receipt-close-fault-');
  const receiptError = new Error('injected receipt verification failure');
  const cleanupError = new Error('injected UNKNOWN source close failure');
  let restoreClose: (() => void) | undefined;
  try {
    expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        evidenceDigest,
      ),
    );
    const failure = await rejectionReason(
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        () => {
          restoreClose = failExactServiceClose(fixture, cleanupError);
          throw receiptError;
        },
      ),
    );
    expect(failure).toBeInstanceOf(AggregateError);
    if (!(failure instanceof AggregateError)) throw new Error('Receipt and close failures must both survive.');
    expect(failure.message).toBe('reconciliation receipt failed and UNKNOWN custody cleanup is unresolved');
    expect(failure.errors).toEqual([receiptError, cleanupError]);
    restoreClose?.();
    restoreClose = undefined;
    retryPendingWorkspaceDatabaseCloses();
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    try {
      const row = expectReturned(() =>
        readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId),
      );
      expect(row?.phase).toBe('unknown');
      expect(row?.owner_token).toBeNull();
      expect(row?.revision).toBe(2);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
  } finally {
    restoreClose?.();
    retryPendingWorkspaceDatabaseCloses();
    console.error('SERVICE_CUSTODY_EXPECTED_UNKNOWN_FIXTURE_RETAINED', fixture.root);
  }
});

function failExactServiceClose(fixture: ServiceCustodyFixture, error: Error): () => void {
  const nativeClose = Reflect.get(Database.prototype, 'close') as Database['close'];
  const file = path.join(fixture.root, fixture.relative);
  const close = spyOn(Database.prototype, 'close').mockImplementation(function (this: Database, force?: boolean): void {
    if (path.resolve(this.filename) === file) throw error;
    nativeClose.call(this, force);
  });
  return () => close.mockRestore();
}

for (const operation of ['handoff', 'reconciliation'] as const) {
  test(`${operation} rejects a custody row removed after its real COMMIT`, async () => {
    const fixture = openCustodyFixture('service-missing-committed-afterimage-');
    const file = path.join(fixture.root, fixture.relative);
    const nativeExec = Reflect.get(Database.prototype, 'exec') as Database['exec'];
    let restoreExec: (() => void) | undefined;
    let removals = 0;
    const removeAfterCommit = () => {
      const exec = spyOn(Database.prototype, 'exec').mockImplementation(function (this: Database, sql: string) {
        const result = nativeExec.call(this, sql);
        if (path.resolve(this.filename) === file && sql === 'COMMIT') {
          // A real commit followed by an external deletion, not a forged CAS result.
          nativeExec.call(this, 'DELETE FROM agent_host_service_operation_custody');
          removals++;
        }
        return result;
      });
      restoreExec = () => exec.mockRestore();
    };
    try {
      if (operation === 'handoff') {
        finishOperation(fixture, 'release-pack-worker');
        const source = expectReturned(() =>
          openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
        );
        await expectRejection(
          handoffServiceOperationCustody(
            source,
            fixture.root,
            fixture.relative,
            fixture.workspaceId,
            operationId,
            requestDigest,
            retargetDigest,
            async () => {
              removeAfterCommit();
              return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
            },
          ),
          'handed-off owner row disappeared',
        );
      } else {
        expectReturned(() =>
          reserveServiceOperationLaunch(
            fixture.database,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            evidenceDigest,
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
              removeAfterCommit();
              return { phase: 'prepared', evidence_digest: evidenceDigest };
            },
          ),
          'reconciled owner row disappeared',
        );
      }
      expect(removals).toBe(1);
      restoreExec?.();
      restoreExec = undefined;
      const reopened = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      try {
        expect(
          expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
        ).toBeNull();
      } finally {
        closeServiceOperationDatabase(reopened);
      }
    } finally {
      restoreExec?.();
      console.error('SERVICE_CUSTODY_AFTERIMAGE_FAULT_FIXTURE_RETAINED', fixture.root);
    }
  });
}

const invalidPersistedHandoffCases = [
  ['retargeted owner kind', 'owner_kind', 'release-pack-worker'],
  ['predecessor owner kind', 'handoff_from_kind', 'release-worker'],
  ['handoff digest', 'handoff_digest', 'invalid'],
  ['absent handoff digest', 'handoff_digest', null],
  ['predecessor request digest', 'handoff_from_request_digest', 'invalid'],
  ['absent predecessor request digest', 'handoff_from_request_digest', null],
  ['predecessor evidence digest', 'handoff_from_evidence_digest', 'invalid'],
  ['absent predecessor evidence digest', 'handoff_from_evidence_digest', null],
  ['predecessor phase', 'handoff_from_phase', 'prepared'],
  ['zero predecessor revision', 'handoff_from_revision', 0],
  ['fractional predecessor revision', 'handoff_from_revision', 0.5],
  ['absent predecessor revision', 'handoff_from_revision', null],
] as const;

for (const [label, column, value] of invalidPersistedHandoffCases) {
  test(`reader rejects a persisted ${label} that breaks handoff lineage`, async () => {
    const fixture = openCustodyFixture('handoff-invalid-lineage-');
    let database: ReturnType<typeof openServiceOperationDatabase> | undefined;
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      finishOperation(fixture, 'release-pack-worker');
      const source = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      await expectAsyncReturned(() =>
        handoffServiceOperationCustody(
          source,
          fixture.root,
          fixture.relative,
          fixture.workspaceId,
          operationId,
          requestDigest,
          retargetDigest,
          preparedReceipt,
        ),
      );
      database = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      database
        .query(`UPDATE agent_host_service_operation_custody SET ${column}=? WHERE workspace_id=? AND operation_id=?`)
        .run(value, fixture.workspaceId, operationId);
      expect(() => readServiceOperationCustodyForOperation(database!, fixture.workspaceId, operationId)).toThrow(
        'Service operation custody: stored operation handoff is invalid',
      );
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            if (database) closeServiceOperationDatabase(database);
            return undefined;
          },
          () => {
            if (completed) rmSync(fixture.root, { recursive: true, force: true });
            else console.error('SERVICE_CUSTODY_INVALID_HANDOFF_FIXTURE_RETAINED', { root: fixture.root, label });
            return undefined;
          },
        ],
        primaryFailure,
      );
    }
  });
}

test('handoff rolls back when an AFTER UPDATE trigger deletes its CAS row', async () => {
  const fixture = openCustodyFixture('handoff-missing-afterimage-');
  try {
    const prior = finishOperation(fixture, 'release-pack-worker');
    const setup = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    setup.exec(
      'CREATE TRIGGER remove_handoff_custody AFTER UPDATE OF owner_kind ON agent_host_service_operation_custody ' +
        "WHEN NEW.owner_kind='release-worker' BEGIN DELETE FROM agent_host_service_operation_custody " +
        'WHERE workspace_id=NEW.workspace_id AND operation_id=NEW.operation_id; END',
    );
    expectReturned(() => closeServiceOperationDatabase(setup));
    const source = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    await expectRejection(
      handoffServiceOperationCustody(
        source,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        operationId,
        requestDigest,
        retargetDigest,
        preparedReceipt,
      ),
      'same-operation handoff compare-and-swap failed',
    );
    const reopened = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    try {
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toEqual(prior);
    } finally {
      closeServiceOperationDatabase(reopened);
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

for (const route of ['handoff', 'reconciliation'] as const) {
  test(`${route} gate replacement during an awaited receipt leaves its original row intact`, async () => {
    const fixture = openCustodyFixture('handoff-replaced-gate-');
    let restoreRawOpen: (() => void) | undefined;
    let reader: Database | undefined;
    let completed = false;
    let primaryFailure: { error: unknown } | undefined;
    try {
      let source = fixture.database;
      let prior: ReturnType<typeof readServiceOperationCustodyForOperation>;
      if (route === 'handoff') {
        prior = finishOperation(fixture, 'release-pack-worker');
        source = expectReturned(() =>
          openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
        );
      } else {
        expectReturned(() =>
          reserveServiceOperationLaunch(
            fixture.database,
            fixture.workspaceId,
            'release-pack-worker',
            operationId,
            requestDigest,
            evidenceDigest,
          ),
        );
        prior = expectReturned(() =>
          readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
        );
        expect(prior).toBeObject();
      }
      let gateLost = false;
      let openedAfterGateLoss = 0;
      const nativeOpen = workspaceRaw.openUnadmittedWorkspaceDatabase;
      const watched = spyOn(workspaceRaw, 'openUnadmittedWorkspaceDatabase').mockImplementation((...args) => {
        if (gateLost) openedAfterGateLoss++;
        return nativeOpen(...args);
      });
      restoreRawOpen = () => watched.mockRestore();
      const verifyReceipt = async () => {
        await Promise.resolve();
        replaceAdmissionGate(fixture);
        gateLost = true;
        return { phase: 'prepared' as const, evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
      };
      const failure = await rejectionReason(
        route === 'handoff'
          ? handoffServiceOperationCustody(
              source,
              fixture.root,
              fixture.relative,
              fixture.workspaceId,
              operationId,
              requestDigest,
              retargetDigest,
              verifyReceipt,
            )
          : reconcileServiceOperationCustody(
              source,
              fixture.root,
              fixture.relative,
              fixture.workspaceId,
              'release-pack-worker',
              operationId,
              requestDigest,
              verifyReceipt,
            ),
      );
      restoreRawOpen();
      restoreRawOpen = undefined;
      const cause: unknown = failure instanceof AggregateError ? failure.errors[0] : failure;
      expect(cause).toBeInstanceOf(Error);
      if (!(cause instanceof Error)) throw new Error('Expected gate identity denial after the awaited receipt.');
      expect(cause.message).toBe('Project storage admission: gate file or parent was replaced');
      // A revoked owner must fail before acquiring another SQLite connection.
      expect(openedAfterGateLoss).toBe(0);
      const reopened = expectReturned(() =>
        openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
      );
      reader = reopened;
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, operationId)),
      ).toEqual(prior);
      completed = true;
    } catch (error) {
      primaryFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            restoreRawOpen?.();
            return undefined;
          },
          () => {
            if (reader) closeServiceOperationDatabase(reader);
            return undefined;
          },
          () => {
            closeServiceOperationDatabase(fixture.database);
            return undefined;
          },
        ],
        primaryFailure,
      );
      if (completed) rmSync(fixture.root, { recursive: true, force: true });
      else console.error('Retained failed awaited gate replacement fixture: ' + fixture.root);
    }
  });
}

function finishOperation(fixture: ServiceCustodyFixture, kind: 'release-pack-worker' | 'release-worker') {
  const reservation = expectReturned(() =>
    reserveServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      kind,
      operationId,
      requestDigest,
      evidenceDigest,
    ),
  );
  expectReturned(() =>
    recordServiceOperationLaunchPid(
      fixture.database,
      fixture.workspaceId,
      kind,
      operationId,
      requestDigest,
      reservation.revision,
      launchPid,
      reservation.child_capability,
    ),
  );
  const handle = expectReturned(() =>
    claimReservedServiceOperationLaunch(
      fixture.database,
      fixture.workspaceId,
      kind,
      operationId,
      requestDigest,
      launchPid,
      reservation.child_capability,
    ),
  );
  expectReturned(() => closeServiceOperationCustody(handle, 'terminal', terminalDigest));
  const terminal = expectReturned(() =>
    readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
  );
  expectReturned(() => closeServiceOperationCustodyHandle(handle));
  if (!terminal) throw new Error('Terminal operation custody row disappeared.');
  return terminal;
}

function expectHandoffLineage(
  result: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
  prior: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
): void {
  expect(result).not.toBeNull();
  expect(typeof result).toBe('object');
  expect(prior).not.toBeNull();
  expect(typeof prior).toBe('object');
  expect(typeof result.workspace_id).toBe('string');
  expect(typeof result.owner_kind).toBe('string');
  expect(typeof result.operation_id).toBe('string');
  expect(typeof result.request_digest).toBe('string');
  expect(typeof result.revision).toBe('number');
  expect(typeof result.phase).toBe('string');
  expect(result.owner_kind).toBe('release-worker');
  expect(result.operation_id).toBe(prior.operation_id);
  expect(result.request_digest).toBe(retargetDigest);
  expect(result.owner_token).toBeNull();
  expect(result.revision).toBe(prior.revision + 1);
  expect(result.phase).toBe('prepared');
  expect(result.evidence_digest).toBe(evidenceDigest);
  expect(result.handoff_digest).toBe(handoffDigest);
  expect(result.handoff_from_kind).toBe('release-pack-worker');
  expect(result.handoff_from_phase).toBe('terminal');
  expect(result.handoff_from_request_digest).toBe(prior.request_digest);
  expect(result.handoff_from_revision).toBe(prior.revision);
  expect(result.handoff_from_evidence_digest).toBe(prior.evidence_digest);
}

async function assertRejectedLineage(
  prefix: string,
  kind: 'release-pack-worker' | 'release-worker',
  priorRequest: string,
  expected: string | RegExp,
): Promise<void> {
  const fixture = openCustodyFixture(prefix);
  try {
    const prior = finishOperation(fixture, kind);
    let verifierCalls = 0;
    const verifier: HandoffVerifier = async (observed) => {
      verifierCalls++;
      expect(observed).toEqual(prior);
      return preparedReceipt(observed);
    };
    expect(await expectHandoffFailure(fixture, prior, verifier, expected, priorRequest)).toEqual(prior);
    expect(verifierCalls).toBe(0);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

async function assertPreparedPackCannotHandoff(): Promise<void> {
  const fixture = openCustodyFixture('handoff-nonterminal-');
  try {
    expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        evidenceDigest,
      ),
    );
    const prepared = await expectAsyncReturned(() =>
      reconcileServiceOperationCustody(
        fixture.database,
        fixture.root,
        fixture.relative,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        async () => ({ phase: 'prepared', evidence_digest: evidenceDigest }),
      ),
    );
    expect(prepared).toBeObject();
    expect(prepared.phase).toBe('prepared');
    const reader = expectReturned(() =>
      openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
    );
    let reservationFailure: { error: unknown } | undefined;
    try {
      expect(() =>
        reserveServiceOperationLaunch(
          reader,
          fixture.workspaceId,
          'release-worker',
          operationId,
          requestDigest,
          evidenceDigest,
        ),
      ).toThrow('Service operation custody: operation has no exact prepared image available for one-shot launch');
      expect(
        expectReturned(() => readServiceOperationCustodyForOperation(reader, fixture.workspaceId, operationId)),
      ).toEqual(prepared);
    } catch (error) {
      reservationFailure = { error };
      throw error;
    } finally {
      completeOwnedCleanup(
        [
          () => {
            closeServiceOperationDatabase(reader);
            return undefined;
          },
        ],
        reservationFailure,
      );
    }
    let verifierCalls = 0;
    const verifier: HandoffVerifier = async () => {
      verifierCalls++;
      return { phase: 'prepared', evidence_digest: evidenceDigest, handoff_digest: handoffDigest };
    };
    expect(await expectHandoffFailure(fixture, prepared, verifier, /only the exact terminal pack owner/u)).toEqual(
      prepared,
    );
    expect(verifierCalls).toBe(0);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
}

test('same-metadata reconciliation rejects a replaced admission gate before receipt or row effects', async () => {
  const fixture = openCustodyFixture('reconcile-entry-replaced-gate-');
  let primaryFailure: { error: unknown } | undefined;
  try {
    expectReturned(() =>
      reserveServiceOperationLaunch(
        fixture.database,
        fixture.workspaceId,
        'release-pack-worker',
        operationId,
        requestDigest,
        evidenceDigest,
      ),
    );
    const before = expectReturned(() =>
      readServiceOperationCustodyForOperation(fixture.database, fixture.workspaceId, operationId),
    );
    expect(before).toBeObject();

    // Keep the exact admitted connection and metadata, but replace the real gate
    // before entering reconciliation so its database-binding check owns denial.
    const retainedStatement = fixture.database.query(
      'SELECT * FROM agent_host_service_operation_custody WHERE workspace_id=? AND operation_id=?',
    );
    const nativeBefore = expectReturned(() => retainedStatement.get(fixture.workspaceId, operationId));
    replaceAdmissionGate(fixture);
    let verifierCalls = 0;
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
          verifierCalls++;
          return { phase: 'prepared', evidence_digest: evidenceDigest };
        },
      ),
      'Project storage admission: gate file or parent was replaced',
    );
    expect(verifierCalls).toBe(0);
    const retainedRow = expectReturned(() => retainedStatement.get(fixture.workspaceId, operationId));
    expect(retainedRow).toEqual(nativeBefore);
  } catch (error) {
    primaryFailure = { error };
    throw error;
  } finally {
    completeOwnedCleanup(
      [
        () => {
          closeServiceOperationDatabase(fixture.database);
          return undefined;
        },
        () => {
          console.error('SERVICE_CUSTODY_EXPECTED_UNKNOWN_FIXTURE_RETAINED', {
            root: fixture.root,
            reason: 'entry admission gate replacement left the launching owner unresolved',
            externalProcessStarted: false,
          });
          return undefined;
        },
      ],
      primaryFailure,
    );
  }
});

async function expectHandoffFailure(
  fixture: ServiceCustodyFixture,
  prior: Awaited<ReturnType<typeof handoffServiceOperationCustody>>,
  verifier: HandoffVerifier,
  message: string | RegExp,
  priorRequest = requestDigest,
  request = retargetDigest,
) {
  const source = expectReturned(() =>
    openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
  );
  await expectRejection(
    handoffServiceOperationCustody(
      source,
      fixture.root,
      fixture.relative,
      fixture.workspaceId,
      operationId,
      priorRequest,
      request,
      verifier,
    ),
    message,
  );
  const reopened = expectReturned(() =>
    openServiceOperationDatabase(fixture.root, fixture.relative, fixture.workspaceId),
  );
  try {
    return expectReturned(() =>
      readServiceOperationCustodyForOperation(reopened, fixture.workspaceId, prior.operation_id),
    );
  } finally {
    closeServiceOperationDatabase(reopened);
  }
}

const preparedReceipt: HandoffVerifier = async () => ({
  phase: 'prepared',
  evidence_digest: evidenceDigest,
  handoff_digest: handoffDigest,
});

function replaceAdmissionGate(fixture: ServiceCustodyFixture): void {
  const gate = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
  renameSync(gate, gate + '.retained');
  copyFileSync(gate + '.retained', gate);
}
