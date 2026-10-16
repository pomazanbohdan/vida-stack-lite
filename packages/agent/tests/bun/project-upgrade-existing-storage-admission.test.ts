import { beforeEach, describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.js';
import {
  HostStateStore,
  initializeHostDatabaseSchema,
  openHostStateDatabase,
  type MaintenanceFenceBinding,
  type MaintenanceFenceReceipt,
} from '../../src/host-state.js';
import {
  assertExistingStorageMergeCapability,
  type ExistingStorageMergeCapability,
  withExistingStorageMergeCapability,
} from '../../src/config/project-upgrade-existing-storage-admission.js';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.js';
import { prepareExistingProjectUpgradeDatabase } from '../../src/config/project-upgrade.js';
import { expectReturned } from '../helpers/expect-rejection.ts';
import { cleanupTrackedFixtureRoots } from '../helpers/tracked-fixture-root-cleanup.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.js';

const workspaceId = 'a'.repeat(64);
const hostRelative = '.vida/host.sqlite';
const mastraRelative = '.vida/mastra.sqlite';
const binding: MaintenanceFenceBinding = {
  schema: 'MaintenanceFenceBinding/v1',
  project_ids: ['fixture-project'],
  operation_id: 'native-admission-001',
  manifest_digest: 'b'.repeat(64),
  request_digest: 'c'.repeat(64),
  bindings_digest: 'd'.repeat(64),
  closure_digest: 'e'.repeat(64),
  bundle_digest: 'f'.repeat(64),
};

const verifier = {
  principal: 'fixture:maintenance-host',
  projectIds: ['fixture-project'],
  verify: (fence: MaintenanceFenceReceipt['fence']) => ({
    schema: 'MaintenanceReleaseAuthorization/v1' as const,
    principal: 'fixture:maintenance-host',
    fence_digest: canonicalJsonDigest(fence),
    closure_digest: fence.binding.closure_digest,
    bundle_digest: fence.binding.bundle_digest,
  }),
};

const roots = new Set<string>();
const retainedRoots = new Set<string>();
const openDatabases = new Set<Database>();
const databaseRoots = new Map<Database, string>();
const databaseClosers = new Map<Database, () => void>();
const failedDatabases = new Set<Database>();
let activeFixtureCase = false;

beforeEach(() => {
  if (activeFixtureCase || databaseClosers.size !== 0)
    throw new Error('Cannot begin an admission fixture case while prior fixture custody is unresolved');
  activeFixtureCase = true;
});

async function expectAdmissionResult<T>(action: () => Promise<T>): Promise<T> {
  let result!: T;
  await assert.doesNotReject(async () => {
    result = await action();
  });
  return result;
}

function registerDatabase(
  database: Database,
  root: string,
  close: () => void = () => closeWorkspaceDatabaseWithAdmission(database),
): void {
  openDatabases.add(database);
  databaseRoots.set(database, root);
  databaseClosers.set(database, close);
}

function closeOwnedDatabase(database: Database): undefined {
  const close = databaseClosers.get(database);
  if (!close) throw new Error('Fixture database has no exact close owner');
  try {
    close();
  } catch (error) {
    failedDatabases.add(database);
    const root = databaseRoots.get(database);
    if (root) retainedRoots.add(root);
    throw error;
  }
  openDatabases.delete(database);
  databaseRoots.delete(database);
  databaseClosers.delete(database);
  failedDatabases.delete(database);
  return undefined;
}

function trackedTest(name: string, body: () => Promise<void>): void {
  test(name, async () => {
    try {
      const rootsBefore = new Set(roots);
      const databasesBefore = new Set(openDatabases);
      const cleanupDeadline = performance.now() + 5_000;
      let bodyFailure: { error: unknown } | undefined;
      let deadlineFailure: { error: unknown } | undefined;
      try {
        await body();
      } catch (error) {
        bodyFailure = { error };
      }

      const caseRoots = new Set([...roots].filter((root) => !rootsBefore.has(root)));
      const caseRootList = [...caseRoots];
      const retainCaseRoots = (): void => {
        for (const root of caseRoots) retainedRoots.add(root);
      };
      const markLate = (stage: string): void => {
        retainCaseRoots();
        deadlineFailure ??= { error: new Error(`Fixture cleanup deadline elapsed ${stage}`) };
      };
      if (performance.now() >= cleanupDeadline) markLate('after test body settlement');

      const closeActions = [...openDatabases]
        .filter((database) => !databasesBefore.has(database) && !failedDatabases.has(database))
        .map((database) => () => closeOwnedDatabase(database));
      let cleanupFailure: { error: unknown } | undefined;
      try {
        completeOwnedCleanup(closeActions, bodyFailure);
      } catch (error) {
        cleanupFailure = { error };
      }
      if (performance.now() >= cleanupDeadline) markLate('after native connections closed');
      if (bodyFailure || cleanupFailure || deadlineFailure) retainCaseRoots();
      else for (const root of caseRoots) retainedRoots.delete(root);

      let rootCleanupFailure: { error: unknown } | undefined;
      try {
        await cleanupTrackedFixtureRoots(caseRoots, retainedRoots, (root, options) => {
          if (performance.now() >= cleanupDeadline) {
            markLate('before fixture deletion');
            throw deadlineFailure!.error;
          }
          return rm(root, options);
        });
      } catch (error) {
        rootCleanupFailure = { error };
      }
      for (const root of caseRootList) if (!retainedRoots.has(root)) roots.delete(root);

      const failures = [cleanupFailure, rootCleanupFailure, deadlineFailure];
      if (!cleanupFailure && bodyFailure) failures.push(bodyFailure);
      const presentFailures = failures
        .filter((failure): failure is { error: unknown } => failure !== undefined)
        .map((failure) => failure.error);
      if (presentFailures.length === 1) throw presentFailures[0];
      if (presentFailures.length > 1) throw new AggregateError(presentFailures, 'Fixture cleanup failed');
    } finally {
      activeFixtureCase = false;
    }
  });
}

describe('native existing-storage admission boundary', () => {
  for (const checkpointFault of [
    { label: 'null checkpoint result', result: null },
    { label: 'busy checkpoint result', result: { busy: 1, log: 0, checkpointed: 0 } },
    { label: 'incomplete checkpoint result', result: { busy: 0, log: 2, checkpointed: 1 } },
  ] as const) {
    trackedTest(`denies a ${checkpointFault.label} after observing the real healthy Host checkpoint`, async () => {
      const fixture = freshFixture();
      const receipt = fixture.receipt;
      const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
      const healthyResults: Array<{ busy: bigint; log: bigint; checkpointed: bigint }> = [];
      let targetedCheckpointCount = 0;
      let closeCount = 0;
      let mergeCount = 0;
      let caught: unknown;
      const observedQuery = function (this: Database, sql: string) {
        const query = Reflect.apply(originalQuery, this, [sql]);
        if (
          sql.trim().toLowerCase() !== 'pragma wal_checkpoint(truncate)' ||
          this.filename !== path.join(fixture.root, hostRelative)
        )
          return query;

        targetedCheckpointCount++;
        return new Proxy(query, {
          get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver) as unknown;
            if (property !== 'get' || typeof value !== 'function') return value;
            return function (this: unknown, ...args: unknown[]) {
              const row = Reflect.apply(value, target, args) as {
                busy: number | bigint;
                log: number | bigint;
                checkpointed: number | bigint;
              } | null;
              if (row === null) throw new Error('Real Host checkpoint returned no row.');
              const observed = {
                busy: BigInt(row.busy),
                log: BigInt(row.log),
                checkpointed: BigInt(row.checkpointed),
              };
              healthyResults.push(observed);
              if (observed.busy !== 0n || observed.checkpointed < observed.log)
                throw new Error('Real Host checkpoint was not healthy before fault injection.');
              return checkpointFault.result;
            };
          },
        });
      } as unknown as typeof Database.prototype.query;

      Database.prototype.query = observedQuery;
      try {
        try {
          await withExistingStorageMergeCapability({
            repositoryRoot: fixture.root,
            workspaceId,
            operationId: binding.operation_id,
            planDigest: '9'.repeat(64),
            expectedFenceBinding: binding,
            receipt,
            hostRelative,
            mastraRelative,
            closeHostOwner: () => {
              closeCount++;
              closeHostOwner(fixture);
            },
            operation: async () => {
              mergeCount++;
            },
          });
        } catch (error) {
          caught = error;
        }
      } finally {
        Database.prototype.query = originalQuery;
      }

      expect(caught).toBeInstanceOf(Error);
      expect(caught).toHaveProperty(
        'message',
        'VIDA existing storage admission: source WAL checkpoint did not complete',
      );
      expect(healthyResults).toHaveLength(1);
      expect(targetedCheckpointCount).toBe(1);
      expect(closeCount).toBe(1);
      expect(mergeCount).toBe(0);

      const persistedHost = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
      registerDatabase(persistedHost, fixture.root);
      let inspectionFailure: { error: unknown } | undefined;
      try {
        expect(new HostStateStore(persistedHost, workspaceId).readMaintenanceFence()).toEqual(receipt.fence);
      } catch (error) {
        inspectionFailure = { error };
      }
      completeOwnedCleanup([() => closeOwnedDatabase(persistedHost)], inspectionFailure);
      if (inspectionFailure) throw inspectionFailure.error;
      await releaseFence(fixture.root, receipt);
    });
  }

  trackedTest('mints a callback-scoped capability from exact fresh Host receipt and closed source files', async () => {
    const fixture = freshFixture();
    const receipt = fixture.receipt;
    let callbacks = 0;
    let escapedCapability: ExistingStorageMergeCapability | undefined;
    const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const originalAssertMaintenanceFence = Reflect.get(
      HostStateStore.prototype,
      'assertMaintenanceFence',
    ) as typeof HostStateStore.prototype.assertMaintenanceFence;
    const originalReleaseMaintenanceFence = Reflect.get(
      HostStateStore.prototype,
      'releaseMaintenanceFence',
    ) as typeof HostStateStore.prototype.releaseMaintenanceFence;
    let privateReleaseProbeStarted = false;
    let privateReleaseProbe: Promise<{ status: 'released' } | { status: 'rejected'; error: unknown }> | undefined;
    const fenceVerificationReceivers = new Set<Database>();
    const hostCheckpointReceivers: Database[] = [];
    let verifyingFence = false;
    const observedQuery = function (this: Database, sql: string) {
      if (verifyingFence) fenceVerificationReceivers.add(this);
      if (
        sql.trim().toLowerCase() === 'pragma wal_checkpoint(truncate)' &&
        this.filename === path.join(fixture.root, hostRelative)
      )
        hostCheckpointReceivers.push(this);
      return Reflect.apply(originalQuery, this, [sql]);
    } as unknown as typeof Database.prototype.query;
    const observedFenceVerification = function (this: HostStateStore, fenceReceipt: MaintenanceFenceReceipt) {
      verifyingFence = true;
      try {
        const verified = Reflect.apply(originalAssertMaintenanceFence, this, [fenceReceipt]);
        if (this !== fixture.hostStore && !privateReleaseProbeStarted) {
          privateReleaseProbeStarted = true;
          privateReleaseProbe = Reflect.apply(originalReleaseMaintenanceFence, this, [fenceReceipt]).then(
            () => ({ status: 'released' as const }),
            (error: unknown) => ({ status: 'rejected' as const, error }),
          );
        }
        return verified;
      } finally {
        verifyingFence = false;
      }
    };
    let result: string;
    Database.prototype.query = observedQuery;
    HostStateStore.prototype.assertMaintenanceFence = observedFenceVerification;
    try {
      result = await expectAdmissionResult(() =>
        withExistingStorageMergeCapability({
          repositoryRoot: fixture.root,
          workspaceId,
          operationId: binding.operation_id,
          planDigest: '9'.repeat(64),
          expectedFenceBinding: binding,
          receipt,
          hostRelative,
          mastraRelative,
          closeHostOwner: () => {
            callbacks++;
            closeHostOwner(fixture);
          },
          operation: async (capability) => {
            escapedCapability = capability;
            expectReturned(() => assertExistingStorageMergeCapability(capability));
            expect(() => assertExistingStorageMergeCapability(null)).toThrow(/merge capability required/u);
            expect(() => assertExistingStorageMergeCapability({})).toThrow(
              /merge capability was not minted by the Host fence owner/u,
            );
            capability.assertActive();
            capability.assertSourcesUnchanged();
            expect(capability.schema).toBe('VidaExistingStorageMergeCapability/v1');
            expect(capability.binding).toMatchObject({
              operation_id: binding.operation_id,
              workspace_id: workspaceId,
              plan_digest: '9'.repeat(64),
              held_fence_token_digest: receipt.fence.token_digest,
            });
            expect(capability.host.sha256).toBe(sha256(readFileSync(path.join(fixture.root, hostRelative))));
            expect(capability.mastra.sha256).toBe(sha256(readFileSync(path.join(fixture.root, mastraRelative))));
            return 'admitted';
          },
        }),
      );
    } finally {
      HostStateStore.prototype.assertMaintenanceFence = originalAssertMaintenanceFence;
      Database.prototype.query = originalQuery;
    }
    expect(result).toBe('admitted');
    const privateRelease = await privateReleaseProbe;
    expect(privateReleaseProbeStarted).toBe(true);
    expect(privateRelease?.status).toBe('rejected');
    if (privateRelease?.status !== 'rejected') throw new Error('Private verifier did not deny release');
    expect(privateRelease.error).toBeInstanceOf(Error);
    expect(privateRelease.error).toHaveProperty('message', 'trusted maintenance closure verification failed');
    const verificationDatabase = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
    registerDatabase(verificationDatabase, fixture.root);
    let verificationFailure: { error: unknown } | undefined;
    try {
      expect(new HostStateStore(verificationDatabase, workspaceId).readMaintenanceFence()).toEqual(receipt.fence);
    } catch (error) {
      verificationFailure = { error };
    }
    completeOwnedCleanup([() => closeOwnedDatabase(verificationDatabase)], verificationFailure);
    if (verificationFailure) throw verificationFailure.error;
    expect(callbacks).toBe(1);
    expect(() => escapedCapability?.assertActive()).toThrow(/callback capability expired/u);
    expect(() => assertExistingStorageMergeCapability(escapedCapability)).toThrow(
      /merge capability was not minted by the Host fence owner/u,
    );
    expect(readdirSync(fixture.root)).toEqual(['.vida']);
    try {
      expect(fenceVerificationReceivers.size).toBeGreaterThan(0);
      expect(hostCheckpointReceivers).toHaveLength(1);
      const checkpointReceiver = hostCheckpointReceivers[0];
      if (!checkpointReceiver) throw new Error('Host checkpoint receiver was not observed.');
      expect(fenceVerificationReceivers).toContain(checkpointReceiver);
      await releaseFence(fixture.root, receipt);
    } catch (error) {
      retainedRoots.add(fixture.root);
      console.error(`Retained failed existing-storage admission fixture: ${fixture.root}`);
      throw error;
    }
  });

  for (const source of [
    { label: 'Host', relative: hostRelative, image: 'host' },
    { label: 'Mastra', relative: mastraRelative, image: 'mastra' },
  ] as const) {
    trackedTest(`rejects a real ${source.label} source change after snapshot capture`, async () => {
      const fixture = freshFixture();
      const sourcePath = path.join(fixture.root, source.relative);
      let sourceImage: { original: Buffer<ArrayBuffer>; changed: Buffer<ArrayBuffer> } | undefined;
      let callbackCount = 0;
      let closeCount = 0;
      let exactDriftDenial = false;
      let bodyFailure: { error: unknown } | undefined;
      try {
        const failure = await withExistingStorageMergeCapability({
          repositoryRoot: fixture.root,
          workspaceId,
          operationId: binding.operation_id,
          planDigest: '9'.repeat(64),
          expectedFenceBinding: binding,
          receipt: fixture.receipt,
          hostRelative,
          mastraRelative,
          closeHostOwner: () => {
            closeCount++;
            closeHostOwner(fixture);
          },
          operation: async (capability) => {
            callbackCount++;
            capability.assertActive();
            expect(capability.binding.held_fence_token_digest).toBe(fixture.receipt.fence.token_digest);
            const original = Buffer.from(capability[source.image].bytes);
            sourceImage = { original, changed: Buffer.concat([original, Buffer.from([0])]) };
            writeFileSync(sourcePath, sourceImage.changed);
            expect(readFileSync(sourcePath)).toEqual(sourceImage.changed);
            capability.assertSourcesUnchanged();
            return `unexpectedly admitted changed ${source.label} source`;
          },
        }).then(
          () => null,
          (cause: unknown) => cause,
        );
        expect(failure).toBeInstanceOf(Error);
        expect(String(failure)).toContain(`${source.label} source changed after capture`);
        expect(callbackCount).toBe(1);
        expect(closeCount).toBe(1);
        if (!sourceImage) throw new Error('Source image was not captured.');
        expect(readFileSync(sourcePath)).toEqual(sourceImage.changed);
        exactDriftDenial = true;
      } catch (error) {
        bodyFailure = { error };
      }

      let restoreFailure: { error: unknown } | undefined;
      if (exactDriftDenial) {
        try {
          if (!sourceImage) throw new Error('Source image was not retained for restoration.');
          writeFileSync(sourcePath, sourceImage.original);
          expect(readFileSync(sourcePath)).toEqual(sourceImage.original);
        } catch (error) {
          restoreFailure = { error };
          retainedRoots.add(fixture.root);
          console.error(`Retained unverified source-drift fixture: ${fixture.root}`);
        }
      } else {
        retainedRoots.add(fixture.root);
        console.error(`Retained failed source-drift fixture: ${fixture.root}`);
      }
      if (bodyFailure && restoreFailure)
        throw new AggregateError(
          [bodyFailure.error, restoreFailure.error],
          'Source drift assertion and restoration failed',
        );
      if (bodyFailure) throw bodyFailure.error;
      if (restoreFailure) throw restoreFailure.error;
      await releaseFence(fixture.root, fixture.receipt);
    });
  }

  trackedTest('preserves a merge callback failure after releasing native SQLite admission', async () => {
    const fixture = freshFixture();
    const callbackFailure = new Error('merge callback failed');
    let escapedCapability: ExistingStorageMergeCapability | undefined;
    let closes = 0;
    let operations = 0;
    let caught: unknown;
    try {
      await withExistingStorageMergeCapability({
        repositoryRoot: fixture.root,
        workspaceId,
        operationId: binding.operation_id,
        planDigest: '9'.repeat(64),
        expectedFenceBinding: binding,
        receipt: fixture.receipt,
        hostRelative,
        mastraRelative,
        closeHostOwner: () => {
          closes++;
          closeHostOwner(fixture);
        },
        operation: async (capability) => {
          operations++;
          escapedCapability = capability;
          capability.assertActive();
          throw callbackFailure;
        },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(callbackFailure);
    expect(closes).toBe(1);
    expect(operations).toBe(1);
    expect(() => escapedCapability?.assertActive()).toThrow(/callback capability expired/u);

    const host = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
    registerDatabase(host, fixture.root);
    try {
      const store = new HostStateStore(host, workspaceId, undefined, undefined, undefined, verifier, fixture.root);
      expect(store.readMaintenanceFence()).toEqual(fixture.receipt.fence);
    } finally {
      closeOwnedDatabase(host);
    }

    const mastra = new Database(path.join(fixture.root, mastraRelative), { strict: true });
    registerDatabase(mastra, fixture.root, () => mastra.close());
    try {
      expect(mastra.query<{ value: string }, []>('SELECT value FROM fixture_source').get()?.value).toBe('fresh');
    } finally {
      closeOwnedDatabase(mastra);
    }
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('preserves an exact Host close-callback exception before invoking merge', async () => {
    const fixture = freshFixture();
    const closeFailure = new Error('exact Host owner close failed');
    const fenceBefore = fixture.hostStore.readMaintenanceFence();
    const hostBefore = readFileSync(path.join(fixture.root, hostRelative));
    const mastraBefore = readFileSync(path.join(fixture.root, mastraRelative));
    let closeAttempts = 0;
    let operations = 0;
    let caught: unknown;
    try {
      await withExistingStorageMergeCapability({
        repositoryRoot: fixture.root,
        workspaceId,
        operationId: binding.operation_id,
        planDigest: '9'.repeat(64),
        expectedFenceBinding: binding,
        receipt: fixture.receipt,
        hostRelative,
        mastraRelative,
        closeHostOwner: () => {
          closeAttempts++;
          // The exact owner remains live; this fixture still owns its cleanup.
          throw closeFailure;
        },
        operation: async () => {
          operations++;
        },
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBe(closeFailure);
    expect(closeAttempts).toBe(1);
    expect(operations).toBe(0);
    expect(fixture.hostStore.readMaintenanceFence()).toEqual(fenceBefore);
    expect(readFileSync(path.join(fixture.root, hostRelative))).toEqual(hostBefore);
    expect(readFileSync(path.join(fixture.root, mastraRelative))).toEqual(mastraBefore);
    closeHostOwner(fixture);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('preserves real Host receipt and paired temporary close failures in order', async () => {
    const fixture = freshFixture();
    const closeFailure = new Error('temporary Host connection close failed once');
    const fenceBefore = fixture.hostStore.readMaintenanceFence();
    const hostBefore = readFileSync(path.join(fixture.root, hostRelative));
    const mastraBefore = readFileSync(path.join(fixture.root, mastraRelative));
    const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalAssertMaintenanceFence = Reflect.get(
      HostStateStore.prototype,
      'assertMaintenanceFence',
    ) as typeof HostStateStore.prototype.assertMaintenanceFence;
    let verifyingFence = false;
    const temporaryHosts = new Set<Database>();
    let injectedCloseFailure = false;
    let callerOwnerCloses = 0;
    let mergeCallbacks = 0;
    let rejected = false;
    let caught: unknown;
    const observedQuery = function (this: Database, sql: string) {
      if (verifyingFence) temporaryHosts.add(this);
      return Reflect.apply(originalQuery, this, [sql]);
    } as unknown as typeof Database.prototype.query;
    const observedAssertMaintenanceFence = function (this: HostStateStore, receipt: MaintenanceFenceReceipt) {
      verifyingFence = true;
      try {
        Reflect.apply(originalAssertMaintenanceFence, this, [receipt]);
        // The real persisted receipt check succeeds first; preserve an undefined primary cause.
        throw undefined;
      } finally {
        verifyingFence = false;
      }
    };
    const observedClose = function (this: Database, throwOnError?: boolean): void {
      if (temporaryHosts.has(this) && !injectedCloseFailure) {
        injectedCloseFailure = true;
        throw closeFailure;
      }
      return Reflect.apply(originalClose, this, [throwOnError]);
    } as typeof Database.prototype.close;

    Database.prototype.query = observedQuery;
    Database.prototype.close = observedClose;
    HostStateStore.prototype.assertMaintenanceFence = observedAssertMaintenanceFence;
    try {
      try {
        await withExistingStorageMergeCapability({
          repositoryRoot: fixture.root,
          workspaceId,
          operationId: binding.operation_id,
          planDigest: '9'.repeat(64),
          expectedFenceBinding: binding,
          receipt: fixture.receipt,
          hostRelative,
          mastraRelative,
          closeHostOwner: () => {
            callerOwnerCloses++;
            closeHostOwner(fixture);
          },
          operation: async () => {
            mergeCallbacks++;
          },
        });
      } catch (error) {
        rejected = true;
        caught = error;
      }
    } finally {
      HostStateStore.prototype.assertMaintenanceFence = originalAssertMaintenanceFence;
      Database.prototype.close = originalClose;
      Database.prototype.query = originalQuery;
    }

    const [retainedConnection] = temporaryHosts;
    const assertionFailures: unknown[] = [];
    try {
      expect(rejected).toBe(true);
      expect(temporaryHosts.size).toBe(1);
      expect(retainedConnection).toBeInstanceOf(Database);
      expect(injectedCloseFailure).toBe(true);
      expect(caught).toBeInstanceOf(AggregateError);
      const failures = (caught as AggregateError).errors;
      expect(failures).toHaveLength(2);
      expect(failures[0]).toBeUndefined();
      expect(failures[1]).toBeInstanceOf(AggregateError);
      const closeFailures = (failures[1] as AggregateError).errors;
      expect(closeFailures).toHaveLength(1);
      expect(closeFailures[0]).toBe(closeFailure);
      expect(callerOwnerCloses).toBe(0);
      expect(mergeCallbacks).toBe(0);
      expect(fixture.hostStore.readMaintenanceFence()).toEqual(fenceBefore);
      expect(readFileSync(path.join(fixture.root, hostRelative))).toEqual(hostBefore);
      expect(readFileSync(path.join(fixture.root, mastraRelative))).toEqual(mastraBefore);
      if (!retainedConnection) throw new Error('Temporary Host verification connection was not captured.');
      expect(retainedConnection.query('SELECT 1 AS open').get()).toEqual({ open: 1 });
    } catch (error) {
      assertionFailures.push(error);
    }
    let contender: Database | undefined;
    const contenderCleanupFailures: unknown[] = [];
    try {
      if (retainedConnection) {
        closeHostOwner(fixture);
        contender = new Database(path.join(fixture.root, '.vida/storage-admission.v1.sqlite'), {
          create: false,
          strict: true,
        });
        let busyDenied = false;
        try {
          contender.exec('BEGIN EXCLUSIVE');
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'SQLITE_BUSY') busyDenied = true;
          else throw error;
        }
        expect(busyDenied).toBe(true);
      }
    } catch (error) {
      assertionFailures.push(error);
    }
    if (contender) {
      if (contender.inTransaction) {
        try {
          contender.exec('ROLLBACK');
        } catch (error) {
          contenderCleanupFailures.push(error);
        }
      }
      try {
        contender.close();
      } catch (error) {
        contenderCleanupFailures.push(error);
      }
    }
    let retryFailure: { error: unknown } | undefined;
    if (retainedConnection) {
      try {
        // Retry the same connection through its paired-admission cleanup owner before fixture disposal.
        closeWorkspaceDatabaseWithAdmission(retainedConnection);
      } catch (error) {
        retryFailure = { error };
      }
    }
    const failures = [...assertionFailures, ...contenderCleanupFailures, ...(retryFailure ? [retryFailure.error] : [])];
    if (failures.length > 0) {
      retainedRoots.add(fixture.root);
      if (failures.length === 1) throw failures[0];
      throw new AggregateError(failures, 'Host failure assertion and owned connection cleanup failed');
    }
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('denies an incorrect request token before the owner-close or merge callback effects', async () => {
    const fixture = freshFixture();
    const fenceBefore = fixture.hostStore.readMaintenanceFence();
    const mastraBefore = readFileSync(path.join(fixture.root, mastraRelative));
    let closes = 0;
    let operations = 0;
    const error = await withExistingStorageMergeCapability({
      repositoryRoot: fixture.root,
      workspaceId,
      operationId: binding.operation_id,
      planDigest: '9'.repeat(64),
      expectedFenceBinding: binding,
      receipt: { ...fixture.receipt, token: randomUUID() },
      hostRelative,
      mastraRelative,
      closeHostOwner: () => {
        closes++;
      },
      operation: async () => {
        operations++;
      },
    }).then(
      () => null,
      (cause: unknown) => cause,
    );
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain('maintenance fence receipt stale or forged');
    expect(closes).toBe(0);
    expect(operations).toBe(0);
    expect(fixture.hostStore.readMaintenanceFence()).toEqual(fenceBefore);
    expect(readFileSync(path.join(fixture.root, mastraRelative))).toEqual(mastraBefore);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest(
    'a retained admitted Host reader denies the lower merge capability until that exact reader closes',
    async () => {
      const fixture = freshFixture();
      const contender = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
      registerDatabase(contender, fixture.root);
      const contenderStore = new HostStateStore(
        contender,
        workspaceId,
        undefined,
        undefined,
        undefined,
        verifier,
        fixture.root,
      );
      const beforeFence = contenderStore.readMaintenanceFence();
      const hostBefore = readFileSync(path.join(fixture.root, hostRelative));
      const mastraBefore = readFileSync(path.join(fixture.root, mastraRelative));
      let closes = 0;
      let operations = 0;
      const error = await withExistingStorageMergeCapability({
        repositoryRoot: fixture.root,
        workspaceId,
        operationId: binding.operation_id,
        planDigest: '9'.repeat(64),
        expectedFenceBinding: binding,
        receipt: fixture.receipt,
        hostRelative,
        mastraRelative,
        closeHostOwner: () => {
          closes++;
          closeHostOwner(fixture);
        },
        operation: async () => {
          operations++;
        },
      }).then(
        () => null,
        (cause: unknown) => cause,
      );
      expect(error).toBeInstanceOf(Error);
      expect(String(error)).toMatch(/locked|busy/iu);
      expect(closes).toBe(1);
      expect(operations).toBe(0);
      expect(contenderStore.readMaintenanceFence()).toEqual(beforeFence);
      expect(readFileSync(path.join(fixture.root, hostRelative))).toEqual(hostBefore);
      expect(readFileSync(path.join(fixture.root, mastraRelative))).toEqual(mastraBefore);
      closeOwnedDatabase(contender);

      const retryOwner = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
      registerDatabase(retryOwner, fixture.root);
      let escaped: ExistingStorageMergeCapability | undefined;
      const result = await expectAdmissionResult(() =>
        withExistingStorageMergeCapability({
          repositoryRoot: fixture.root,
          workspaceId,
          operationId: binding.operation_id,
          planDigest: '9'.repeat(64),
          expectedFenceBinding: binding,
          receipt: fixture.receipt,
          hostRelative,
          mastraRelative,
          closeHostOwner: () => {
            closeOwnedDatabase(retryOwner);
          },
          operation: async (capability) => {
            operations++;
            escaped = capability;
            capability.assertActive();
            capability.assertSourcesUnchanged();
            expect(capability.binding.held_fence_token_digest).toBe(fixture.receipt.fence.token_digest);
            return 'admitted after exact reader close';
          },
        }),
      );
      expect(result).toBe('admitted after exact reader close');
      expect(operations).toBe(1);
      expect(() => escaped?.assertActive()).toThrow(/callback capability expired/u);
      await releaseFence(fixture.root, fixture.receipt);
    },
  );

  trackedTest('denies an old receipt after persisted fence CAS advance and a foreign operation owner', async () => {
    const stale = freshFixture();
    const advancedReceipt = await advanceFence(stale);
    const advancedFence = stale.hostStore.readMaintenanceFence();
    const staleMastraBefore = readFileSync(path.join(stale.root, mastraRelative));
    let staleOperations = 0;
    let staleCloses = 0;
    const staleError = await withExistingStorageMergeCapability({
      repositoryRoot: stale.root,
      workspaceId,
      operationId: binding.operation_id,
      planDigest: '9'.repeat(64),
      expectedFenceBinding: binding,
      receipt: stale.receipt,
      hostRelative,
      mastraRelative,
      closeHostOwner: () => {
        staleCloses++;
      },
      operation: async () => {
        staleOperations++;
      },
    }).then(
      () => null,
      (cause: unknown) => cause,
    );
    expect(staleError).toBeInstanceOf(Error);
    expect(String(staleError)).toContain('maintenance fence receipt stale or forged');
    expect(staleCloses).toBe(0);
    expect(staleOperations).toBe(0);
    expect(stale.hostStore.readMaintenanceFence()).toEqual(advancedFence);
    expect(readFileSync(path.join(stale.root, mastraRelative))).toEqual(staleMastraBefore);
    await stale.hostStore.releaseMaintenanceFence(advancedReceipt);

    const foreign = freshFixture();
    const foreignFenceBefore = foreign.hostStore.readMaintenanceFence();
    let foreignOperations = 0;
    let foreignCloses = 0;
    const foreignOperationId = 'foreign-operation-001';
    const foreignError = await withExistingStorageMergeCapability({
      repositoryRoot: foreign.root,
      workspaceId,
      operationId: foreignOperationId,
      planDigest: '9'.repeat(64),
      expectedFenceBinding: { ...binding, operation_id: foreignOperationId },
      receipt: foreign.receipt,
      hostRelative,
      mastraRelative,
      closeHostOwner: () => {
        foreignCloses++;
      },
      operation: async () => {
        foreignOperations++;
      },
    }).then(
      () => null,
      (cause: unknown) => cause,
    );
    expect(foreignError).toBeInstanceOf(Error);
    expect(String(foreignError)).toContain('held Host fence operation differs');
    expect(foreignCloses).toBe(0);
    expect(foreignOperations).toBe(0);
    expect(foreign.hostStore.readMaintenanceFence()).toEqual(foreignFenceBefore);
    await releaseFence(foreign.root, foreign.receipt);
  });

  trackedTest(
    'denies a released fence and keeps existing project upgrade blocked by legacy overlap status',
    async () => {
      const fixture = freshFixture();
      await releaseFence(fixture.root, fixture.receipt);
      let closes = 0;
      let operations = 0;
      const revokedError = await withExistingStorageMergeCapability({
        repositoryRoot: fixture.root,
        workspaceId,
        operationId: binding.operation_id,
        planDigest: '9'.repeat(64),
        expectedFenceBinding: binding,
        receipt: fixture.receipt,
        hostRelative,
        mastraRelative,
        closeHostOwner: () => {
          closes++;
        },
        operation: async () => {
          operations++;
        },
      }).then(
        () => null,
        (cause: unknown) => cause,
      );
      expect(revokedError).toBeInstanceOf(Error);
      expect(String(revokedError)).toContain('maintenance fence receipt stale or forged');
      expect(closes).toBe(0);
      expect(operations).toBe(0);

      const releasedFence = fixture.hostStore.readMaintenanceFence();
      expect(releasedFence?.status).toBe('released');
      let overlapCloses = 0;
      const overlapError = await prepareExistingProjectUpgradeDatabase(
        fixture.root,
        binding.operation_id,
        fixture.hostStore,
        () => {
          overlapCloses++;
        },
      ).then(
        () => null,
        (cause: unknown) => cause,
      );
      expect(overlapError).toBeInstanceOf(Error);
      expect(String(overlapError)).toMatch(/legacy ungated storage openers are not excluded/u);
      expect(overlapCloses).toBe(0);
      expect(fixture.hostStore.readMaintenanceFence()).toEqual(releasedFence);
    },
  );
});

interface Fixture {
  readonly root: string;
  readonly hostOwner: Database;
  readonly hostStore: HostStateStore;
  readonly receipt: MaintenanceFenceReceipt;
}

function freshFixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), 'upgrade-admission-native-private-'));
  roots.add(root);
  retainedRoots.add(root);
  mkdirSync(path.join(root, '.vida'));
  const hostOwner = openHostStateDatabase(root, hostRelative, workspaceId);
  registerDatabase(hostOwner, root);
  initializeHostDatabaseSchema(hostOwner);
  const hostStore = new HostStateStore(hostOwner, workspaceId, undefined, undefined, undefined, verifier, root);
  const receipt = hostStore.acquireMaintenanceFence(binding);
  const mastraPath = path.join(root, mastraRelative);
  const mastra = new Database(mastraPath, { strict: true });
  mastra.exec(
    "PRAGMA journal_mode=DELETE; CREATE TABLE fixture_source(value TEXT NOT NULL); INSERT INTO fixture_source VALUES ('fresh');",
  );
  mastra.close();
  return {
    root,
    hostOwner,
    hostStore,
    receipt,
  };
}

function closeHostOwner(fixture: Fixture): void {
  closeOwnedDatabase(fixture.hostOwner);
}

async function advanceFence(fixture: Fixture): Promise<MaintenanceFenceReceipt> {
  const released = await fixture.hostStore.releaseMaintenanceFence(fixture.receipt);
  const next = fixture.hostStore.acquireMaintenanceFence(binding);
  expect(next.fence.revision).toBe(released.revision + 1);
  expect(next.fence.generation).toBe(released.generation + 1);
  expect(next.fence.token_digest).not.toBe(fixture.receipt.fence.token_digest);
  expect(fixture.hostStore.assertMaintenanceFence(next)).toEqual(next.fence);
  return next;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function releaseFence(root: string, receipt: MaintenanceFenceReceipt): Promise<void> {
  const database = openHostStateDatabase(root, hostRelative, workspaceId);
  registerDatabase(database, root);
  const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, verifier, root);
  try {
    await store.releaseMaintenanceFence(receipt);
  } finally {
    closeOwnedDatabase(database);
  }
}
