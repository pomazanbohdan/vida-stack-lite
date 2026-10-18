import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import {
  linkSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  symlinkSync,
  truncateSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.js';
import {
  HostStateStore,
  initializeHostDatabaseSchema,
  openHostStateDatabase,
  type MaintenanceFence,
  type MaintenanceFenceBinding,
  type MaintenanceFenceReceipt,
} from '../../src/host-state.js';
import {
  assertExistingStorageMergeCapability,
  type ExistingStorageMergeCapability,
  withExistingStorageMergeCapability,
} from '../../src/config/project-upgrade-existing-storage-admission.js';
import {
  closeWorkspaceDatabaseWithAdmission,
  STORAGE_ADMISSION_GATE_FILE,
} from '../../src/config/storage-read-admission.js';
import {
  retryPendingWorkspaceDatabaseCloses,
  withWorkspaceDatabaseClose,
} from '../../src/config/workspace-database-raw.js';
import { prepareExistingProjectUpgradeDatabase } from '../../src/config/project-upgrade.js';
import { openBunSqliteClient } from '../../src/orchestration/bun-sqlite-client.js';
import * as safeRepositoryAccess from '../../src/config/safe-repository-access.js';
import { expectAsyncReturned, expectReturned } from '../helpers/expect-rejection.ts';
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
  trackedTest('drains the exact admitted local workflow client before exclusive source capture', async () => {
    const fixture = freshFixture();
    const client = openBunSqliteClient(fixture.root, mastraRelative, workspaceId);
    const realClose = client.close.bind(client);
    let clientCloseCalls = 0;
    let clientClosed = false;
    client.close = () => {
      clientCloseCalls++;
      clientClosed = true;
      return realClose();
    };
    let result: string | undefined;
    let bodyFailure: { error: unknown } | undefined;
    try {
      result = await withExistingStorageMergeCapability({
        repositoryRoot: fixture.root,
        workspaceId,
        operationId: binding.operation_id,
        planDigest: '9'.repeat(64),
        expectedFenceBinding: binding,
        receipt: fixture.receipt,
        hostRelative,
        mastraRelative,
        closeHostOwner: () => closeHostOwner(fixture),
        operation: async (capability) => {
          capability.assertActive();
          capability.assertSourcesUnchanged();
          return 'admitted after workflow client drain';
        },
      });
    } catch (error) {
      bodyFailure = { error };
    }
    try {
      if (!clientClosed) {
        clientClosed = true;
        await realClose();
      }
    } catch (error) {
      if (bodyFailure)
        throw new AggregateError([bodyFailure.error, error], 'Workflow fixture body and cleanup failed', {
          cause: bodyFailure.error,
        });
      throw error;
    }
    expect(bodyFailure).toBeUndefined();
    expect(result).toBe('admitted after workflow client drain');
    expect(clientCloseCalls).toBe(1);
    expect(clientClosed).toBe(true);
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('checks Host sidecars immediately after the exclusive Host owner closes', async () => {
    const fixture = freshFixture();
    const hostPath = path.join(fixture.root, hostRelative);
    const sidecar = hostPath + '-wal';
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let hostCloses = 0;
    let mastraCloses = 0;
    let sidecarOwned = false;
    let sidecarRemoved = false;
    let operations = 0;
    let caught: unknown;
    let bodyFailure: { error: unknown } | undefined;
    Database.prototype.close = function (throwOnError) {
      const isHost = this.filename === hostPath;
      const isMastra = this.filename === path.join(fixture.root, mastraRelative);
      Reflect.apply(originalClose, this, [throwOnError]);
      if (isHost && ++hostCloses === 3) {
        writeFileSync(sidecar, '', { flag: 'wx' });
        sidecarOwned = true;
      } else if (isMastra) {
        mastraCloses++;
        if (sidecarOwned) {
          unlinkSync(sidecar);
          sidecarRemoved = true;
        }
      }
    };
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
          closeHostOwner: () => closeHostOwner(fixture),
          operation: async () => {
            operations++;
          },
        });
      } catch (error) {
        caught = error;
      }
      expect(hostCloses).toBe(3);
      expect(sidecarOwned).toBe(true);
      expect(sidecarRemoved).toBe(false);
      expect(mastraCloses).toBe(0);
      expect(caught).toHaveProperty(
        'message',
        `VIDA existing storage admission: source sidecar remains: ${hostRelative}-wal`,
      );
      expect(operations).toBe(0);
    } catch (error) {
      bodyFailure = { error };
    } finally {
      Database.prototype.close = originalClose;
      completeOwnedCleanup(
        [
          () => {
            if (sidecarOwned && !sidecarRemoved) unlinkSync(sidecar);
            return undefined;
          },
        ],
        bodyFailure,
      );
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('checks Mastra sidecars after the verified byte read and before capture can continue', async () => {
    const fixture = freshFixture();
    const mastraPath = path.join(fixture.root, mastraRelative);
    const sidecar = mastraPath + '-wal';
    const originalStat = Reflect.get(fs, 'lstatSync') as typeof fs.lstatSync;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalAccess = Reflect.get(
      safeRepositoryAccess,
      'requireSafeRepositoryAccess',
    ) as typeof safeRepositoryAccess.requireSafeRepositoryAccess;
    let capturePhase = false;
    let mastraStats = 0;
    let sidecarOwned = false;
    let sidecarRemoved = false;
    let operations = 0;
    let caught: unknown;
    let bodyFailure: { error: unknown } | undefined;
    const stats = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
      const result = originalStat(...args);
      if (
        capturePhase &&
        args[0] === mastraPath &&
        args[1] !== undefined &&
        typeof args[1] === 'object' &&
        Reflect.get(args[1], 'bigint') === true
      ) {
        mastraStats++;
        // The second stat is after the real bounded byte read; the next guard owns this race.
        if (mastraStats === 2) {
          writeFileSync(sidecar, '', { flag: 'wx' });
          sidecarOwned = true;
        }
      }
      return result;
    }) as typeof fs.lstatSync);
    const access = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((root) => {
      const real = originalAccess(root);
      if (root !== fixture.root) return real;
      return {
        ...real,
        directoryIdentity(target, label) {
          const identity = real.directoryIdentity(target, label);
          // If the post-read sidecar guard is skipped, retire this injected afterimage at
          // the subsequent source-parent check so later validation cannot mask that omission.
          if (target === '.vida' && sidecarOwned && !sidecarRemoved) {
            unlinkSync(sidecar);
            sidecarRemoved = true;
          }
          return identity;
        },
      };
    });
    Database.prototype.close = function (throwOnError) {
      const isMastra = this.filename === mastraPath;
      Reflect.apply(originalClose, this, [throwOnError]);
      if (isMastra) capturePhase = true;
    };
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
          closeHostOwner: () => closeHostOwner(fixture),
          operation: async () => {
            operations++;
          },
        });
      } catch (error) {
        caught = error;
      }
      expect(mastraStats).toBe(2);
      expect(sidecarOwned).toBe(true);
      expect(sidecarRemoved).toBe(false);
      expect(caught).toHaveProperty(
        'message',
        `VIDA existing storage admission: source sidecar remains: ${mastraRelative}-wal`,
      );
      expect(operations).toBe(0);
    } catch (error) {
      bodyFailure = { error };
    } finally {
      Database.prototype.close = originalClose;
      completeOwnedCleanup(
        [
          () => {
            access.mockRestore();
            return undefined;
          },
          () => {
            stats.mockRestore();
            return undefined;
          },
          () => {
            if (sidecarOwned && !sidecarRemoved) unlinkSync(sidecar);
            return undefined;
          },
        ],
        bodyFailure,
      );
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('rejects a replaced repository root while preserving the live gate directory', async () => {
    const fixture = freshFixture();
    const movedRoot = fixture.root + '.owned-original';
    let rootMoved = false;
    let replacementCreated = false;
    let vidaMoved = false;
    let assertionFailure: unknown;
    let bodyFailure: { error: unknown } | undefined;
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
        closeHostOwner: () => closeHostOwner(fixture),
        operation: async (capability) => {
          capability.assertActive();
          renameSync(fixture.root, movedRoot);
          rootMoved = true;
          mkdirSync(fixture.root);
          replacementCreated = true;
          renameSync(path.join(movedRoot, '.vida'), path.join(fixture.root, '.vida'));
          vidaMoved = true;
          try {
            capability.assertActive();
          } catch (error) {
            assertionFailure = error;
          } finally {
            if (vidaMoved) {
              renameSync(path.join(fixture.root, '.vida'), path.join(movedRoot, '.vida'));
              vidaMoved = false;
            }
            if (replacementCreated) {
              rmdirSync(fixture.root);
              replacementCreated = false;
            }
            if (rootMoved) {
              renameSync(movedRoot, fixture.root);
              rootMoved = false;
            }
          }
          return 'root identity checked';
        },
      });
    } catch (error) {
      bodyFailure = { error };
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(assertionFailure).toHaveProperty('message', 'VIDA existing storage admission: repository root was replaced');
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  const observations: readonly {
    readonly field: string;
    readonly message: string;
    readonly alter: (verified: MaintenanceFence, fixture: Fixture) => MaintenanceFence;
  }[] = [
    {
      field: 'status',
      message: 'Host maintenance fence is not held',
      alter: (verified) => ({ ...verified, status: 'released' }),
    },
    {
      field: 'workspace_id',
      message: 'held Host fence workspace differs',
      alter: (verified) => ({ ...verified, workspace_id: '0'.repeat(64) }),
    },
    {
      field: 'binding.operation_id',
      message: 'held Host fence operation differs',
      alter: (verified) => ({
        ...verified,
        binding: { ...verified.binding, operation_id: 'faulted-operation' },
      }),
    },
    {
      field: 'binding.manifest_digest',
      message: 'held Host fence binding differs',
      alter: (verified) => ({
        ...verified,
        binding: { ...verified.binding, manifest_digest: 'a'.repeat(64) },
      }),
    },
    {
      field: 'generation',
      message: 'held Host fence generation differs',
      alter: (verified, fixture) => ({
        ...verified,
        generation: fixture.receipt.fence.generation + 1,
      }),
    },
    {
      field: 'revision',
      message: 'held Host fence revision differs',
      alter: (verified, fixture) => ({
        ...verified,
        revision: fixture.receipt.fence.revision + 1,
      }),
    },
    {
      field: 'token_digest',
      message: 'held Host token digest differs',
      alter: (verified) => ({ ...verified, token_digest: '0'.repeat(64) }),
    },
  ];
  trackedTest('denies inconsistent private fence observations after real Host verification', async () => {
    const fixture = freshFixture();
    for (const observation of observations) {
      const originalAssert = Reflect.get(
        HostStateStore.prototype,
        'assertMaintenanceFence',
      ) as typeof HostStateStore.prototype.assertMaintenanceFence;
      let verifiedObservations = 0;
      let ownerCloses = 0;
      let operations = 0;
      let caught: unknown;
      HostStateStore.prototype.assertMaintenanceFence = function (receipt) {
        const verified = Reflect.apply(originalAssert, this, [receipt]);
        if (this === fixture.hostStore) return verified;
        verifiedObservations++;
        // Fault only the dependency observation after its real persisted receipt check.
        const altered = observation.alter(verified, fixture);
        expect(altered).not.toEqual(fixture.receipt.fence);
        return altered;
      };
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
              ownerCloses++;
              closeHostOwner(fixture);
            },
            operation: async () => {
              operations++;
            },
          });
        } catch (error) {
          caught = error;
        }
      } finally {
        HostStateStore.prototype.assertMaintenanceFence = originalAssert;
      }
      expect(caught).toBeInstanceOf(Error);
      expect(caught).toHaveProperty('message', 'VIDA existing storage admission: ' + observation.message);
      expect(verifiedObservations).toBe(1);
      expect(ownerCloses).toBe(0);
      expect(operations).toBe(0);
      // The zero-close assertion proves this exact registered owner is still live.
      expect(expectReturned(() => fixture.hostStore.readMaintenanceFence())).toEqual(fixture.receipt.fence);
    }
    closeHostOwner(fixture);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('denies a missing exact Host owner close callback before any merge effect', async () => {
    const fixture = freshFixture();
    const hostPath = path.join(fixture.root, hostRelative);
    const mastraPath = path.join(fixture.root, mastraRelative);
    const hostBytes = readFileSync(hostPath);
    const mastraBytes = readFileSync(mastraPath);
    let ownerCloses = 0;
    let operations = 0;
    const request = {
      repositoryRoot: fixture.root,
      workspaceId,
      operationId: binding.operation_id,
      planDigest: '9'.repeat(64),
      expectedFenceBinding: binding,
      receipt: fixture.receipt,
      hostRelative,
      mastraRelative,
      closeHostOwner: () => {
        ownerCloses++;
        closeHostOwner(fixture);
      },
      operation: async () => {
        operations++;
      },
    };
    Object.defineProperty(request, 'closeHostOwner', { value: undefined });

    let caught: unknown;
    try {
      await withExistingStorageMergeCapability(request);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toHaveProperty(
      'message',
      'VIDA existing storage admission: exact Host owner close callback is required',
    );
    expect(ownerCloses).toBe(0);
    expect(operations).toBe(0);
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    expect(readFileSync(hostPath)).toEqual(hostBytes);
    expect(readFileSync(mastraPath)).toEqual(mastraBytes);
    closeHostOwner(fixture);
    await releaseFence(fixture.root, fixture.receipt);
  });

  for (const fault of [
    {
      name: 'rejects a post-close Mastra sidecar before attempting Host image validation',
      kind: 'sidecar',
      message: 'source sidecar remains: ' + mastraRelative + '-wal',
    },
    {
      name: 'rejects a post-close Mastra symlink before accepting its otherwise real image',
      kind: 'symlink',
      message: 'source is not a private regular file',
    },
  ] as const) {
    trackedTest(fault.name, async () => {
      const fixture = freshFixture();
      const hostPath = path.join(fixture.root, hostRelative);
      const mastraPath = path.join(fixture.root, mastraRelative);
      const sidecar = mastraPath + '-wal';
      const originalMastraPath = mastraPath + '.owned-original';
      const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
      let hostBytes: Buffer | undefined;
      let markerOwned = false;
      let hostChanged = false;
      let originalMastraOwned = false;
      let mastraRemoved = false;
      let symlinkOwned = false;
      let mastraBytes: Buffer | undefined;
      let sourceCloses = 0;
      let operations = 0;
      let caught: unknown;
      let bodyFailure: { error: unknown } | undefined;
      Database.prototype.close = function (throwOnError) {
        const isMastra = this.filename === mastraPath;
        Reflect.apply(originalClose, this, [throwOnError]);
        if (isMastra && sourceCloses === 0) {
          sourceCloses++;
          if (fault.kind === 'symlink') {
            mastraBytes = readFileSync(mastraPath);
            linkSync(mastraPath, originalMastraPath);
            originalMastraOwned = true;
            unlinkSync(mastraPath);
            mastraRemoved = true;
            symlinkSync(path.basename(originalMastraPath), mastraPath);
            symlinkOwned = true;
            return;
          }
          hostBytes = readFileSync(hostPath);
          writeFileSync(sidecar, '', { flag: 'wx' });
          markerOwned = true;
          // Both actual Source owners have closed. Make downstream Host validation
          // distinguishable from the required earlier Mastra-sidecar denial.
          hostChanged = true;
          writeFileSync(hostPath, '');
        }
      };
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
            closeHostOwner: () => closeHostOwner(fixture),
            operation: async () => {
              operations++;
            },
          });
        } catch (error) {
          caught = error;
        }
        expect(caught).toHaveProperty('message', 'VIDA existing storage admission: ' + fault.message);
        expect(sourceCloses).toBe(1);
        expect(operations).toBe(0);
        if (fault.kind === 'symlink') expect(lstatSync(mastraPath).isSymbolicLink()).toBe(true);
      } catch (error) {
        bodyFailure = { error };
      } finally {
        Database.prototype.close = originalClose;
        completeOwnedCleanup(
          [
            () => {
              if (markerOwned) unlinkSync(sidecar);
              return undefined;
            },
            () => {
              if (!hostChanged) return undefined;
              if (!hostBytes) throw new Error('Closed Host image restoration bytes are missing');
              writeFileSync(hostPath, hostBytes);
              if (!readFileSync(hostPath).equals(hostBytes)) throw new Error('Closed Host image restoration differs');
              return undefined;
            },
            () => {
              if (!originalMastraOwned) return undefined;
              if (symlinkOwned) unlinkSync(mastraPath);
              if (mastraRemoved) linkSync(originalMastraPath, mastraPath);
              unlinkSync(originalMastraPath);
              if (!mastraBytes || !readFileSync(mastraPath).equals(mastraBytes))
                throw new Error('Closed Mastra image restoration differs');
              return undefined;
            },
          ],
          bodyFailure,
        );
      }
      if (bodyFailure) throw bodyFailure.error;
      expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
      await releaseFence(fixture.root, fixture.receipt);
    });
  }

  trackedTest('denies a Mastra hardlink added after verified bytes during final image validation', async () => {
    const fixture = freshFixture();
    const mastraPath = path.join(fixture.root, mastraRelative);
    const alias = mastraPath + '.late-alias';
    const originalStat = Reflect.get(fs, 'lstatSync') as typeof fs.lstatSync;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let capturePhase = false;
    let capturedStats = 0;
    let aliasOwned = false;
    let operations = 0;
    let caught: unknown;
    let bodyFailure: { error: unknown } | undefined;
    const stats = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
      if (
        capturePhase &&
        args[0] === mastraPath &&
        args[1] !== undefined &&
        typeof args[1] === 'object' &&
        Reflect.get(args[1], 'bigint') === true
      ) {
        capturedStats++;
        // The initial image is healthy. Inject only at the final lstat of its
        // later capability revalidation, after the real verified byte read.
        if (capturedStats === 4) {
          linkSync(mastraPath, alias);
          aliasOwned = true;
        }
      }
      return originalStat(...args);
    }) as typeof fs.lstatSync);
    Database.prototype.close = function (throwOnError) {
      const isMastra = this.filename === mastraPath;
      Reflect.apply(originalClose, this, [throwOnError]);
      if (isMastra) capturePhase = true;
    };
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
          closeHostOwner: () => closeHostOwner(fixture),
          operation: async () => {
            operations++;
          },
        });
      } catch (error) {
        caught = error;
      }
      expect(aliasOwned).toBe(true);
      expect(capturedStats).toBe(4);
      expect(lstatSync(alias, { bigint: true }).nlink).toBe(2n);
      expect(caught).toHaveProperty('message', 'VIDA existing storage admission: source changed during image capture');
      expect(operations).toBe(0);
    } catch (error) {
      bodyFailure = { error };
    } finally {
      Database.prototype.close = originalClose;
      completeOwnedCleanup(
        [
          () => {
            stats.mockRestore();
            return undefined;
          },
          () => {
            if (aliasOwned) unlinkSync(alias);
            return undefined;
          },
        ],
        bodyFailure,
      );
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('denies a private same-size Mastra replacement during image capture', async () => {
    const fixture = freshFixture();
    const mastraPath = path.join(fixture.root, mastraRelative);
    const originalPath = mastraPath + '.owned-original';
    const originalBytes = readFileSync(mastraPath);
    const originalStat = Reflect.get(fs, 'lstatSync') as typeof fs.lstatSync;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let capturePhase = false;
    let capturedStats = 0;
    let originalOwned = false;
    let replacementOwned = false;
    let operations = 0;
    let caught: unknown;
    let bodyFailure: { error: unknown } | undefined;
    const stats = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
      if (
        capturePhase &&
        args[0] === mastraPath &&
        args[1] !== undefined &&
        typeof args[1] === 'object' &&
        Reflect.get(args[1], 'bigint') === true
      ) {
        capturedStats++;
        if (capturedStats === 2) {
          renameSync(mastraPath, originalPath);
          originalOwned = true;
          writeFileSync(mastraPath, originalBytes, { flag: 'wx' });
          replacementOwned = true;
        }
      }
      return originalStat(...args);
    }) as typeof fs.lstatSync);
    Database.prototype.close = function (throwOnError) {
      const isMastra = this.filename === mastraPath;
      Reflect.apply(originalClose, this, [throwOnError]);
      if (isMastra) capturePhase = true;
    };
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
          closeHostOwner: () => closeHostOwner(fixture),
          operation: async () => {
            operations++;
          },
        });
      } catch (error) {
        caught = error;
      }
      expect(capturedStats).toBe(2);
      expect(originalOwned).toBe(true);
      expect(replacementOwned).toBe(true);
      expect(lstatSync(mastraPath, { bigint: true }).nlink).toBe(1n);
      expect(readFileSync(mastraPath)).toEqual(originalBytes);
      expect(caught).toHaveProperty('message', 'VIDA existing storage admission: source changed during image capture');
      expect(operations).toBe(0);
    } catch (error) {
      bodyFailure = { error };
    } finally {
      Database.prototype.close = originalClose;
      completeOwnedCleanup(
        [
          () => {
            stats.mockRestore();
            return undefined;
          },
          () => {
            if (replacementOwned) unlinkSync(mastraPath);
            return undefined;
          },
          () => {
            if (originalOwned) renameSync(originalPath, mastraPath);
            return undefined;
          },
        ],
        bodyFailure,
      );
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('denies a short Mastra read after the same source file is restored', async () => {
    const fixture = freshFixture();
    const mastraPath = path.join(fixture.root, mastraRelative);
    const originalBytes = readFileSync(mastraPath);
    const originalStat = lstatSync(mastraPath, { bigint: true });
    const originalRead = Reflect.get(fs, 'readSync') as typeof fs.readSync;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let capturePhase = false;
    let readPhase = 0;
    let sourceTruncated = false;
    let sourceRestored = false;
    let operations = 0;
    let caught: unknown;
    let bodyFailure: { error: unknown } | undefined;
    const reads = spyOn(fs, 'readSync').mockImplementation(((...args: Parameters<typeof fs.readSync>) => {
      const [fd, buffer, offset, length, position] = args as unknown as readonly unknown[];
      if (
        typeof fd !== 'number' ||
        !(buffer instanceof Uint8Array) ||
        typeof offset !== 'number' ||
        typeof length !== 'number' ||
        (position !== null && typeof position !== 'number')
      )
        return Reflect.apply(originalRead, fs, args);
      if (!capturePhase || readPhase >= 2) return Reflect.apply(originalRead, fs, args);
      const descriptor = fs.fstatSync(fd, { bigint: true });
      if (descriptor.dev !== originalStat.dev || descriptor.ino !== originalStat.ino)
        return Reflect.apply(originalRead, fs, args);
      if (readPhase === 0) {
        const partialLength = Math.max(1, Math.floor(length / 2));
        const bytesRead = originalRead(fd, buffer, offset, partialLength, position);
        if (bytesRead > 0) {
          truncateSync(mastraPath, bytesRead);
          sourceTruncated = true;
          readPhase = 1;
        }
        return bytesRead;
      }
      const bytesRead = Reflect.apply(originalRead, fs, args);
      if (bytesRead === 0) {
        writeFileSync(mastraPath, originalBytes);
        sourceRestored = true;
        readPhase = 2;
      }
      return bytesRead;
    }) as typeof fs.readSync);
    Database.prototype.close = function (throwOnError) {
      const isMastra = this.filename === mastraPath;
      Reflect.apply(originalClose, this, [throwOnError]);
      if (isMastra) capturePhase = true;
    };
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
          closeHostOwner: () => closeHostOwner(fixture),
          operation: async () => {
            operations++;
          },
        });
      } catch (error) {
        caught = error;
      }
      expect(sourceTruncated).toBe(true);
      expect(sourceRestored).toBe(true);
      expect(readFileSync(mastraPath)).toEqual(originalBytes);
      expect(caught).toHaveProperty('message', 'VIDA existing storage admission: source image size differs');
      expect(operations).toBe(0);
    } catch (error) {
      bodyFailure = { error };
    } finally {
      Database.prototype.close = originalClose;
      completeOwnedCleanup(
        [
          () => {
            reads.mockRestore();
            return undefined;
          },
          () => {
            if (sourceTruncated && !sourceRestored) writeFileSync(mastraPath, originalBytes);
            return undefined;
          },
        ],
        bodyFailure,
      );
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('denies a Mastra sidecar that appears during closed-image capture', async () => {
    const fixture = freshFixture();
    const mastraPath = path.join(fixture.root, mastraRelative);
    const sidecar = mastraPath + '-wal';
    const originalStat = Reflect.get(fs, 'lstatSync') as typeof fs.lstatSync;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let capturePhase = false;
    let sidecarOwned = false;
    let operations = 0;
    let caught: unknown;
    let bodyFailure: { error: unknown } | undefined;
    const stats = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
      if (capturePhase && !sidecarOwned && args[0] === mastraPath && args[1] !== undefined) {
        writeFileSync(sidecar, '', { flag: 'wx' });
        sidecarOwned = true;
      }
      return originalStat(...args);
    }) as typeof fs.lstatSync);
    Database.prototype.close = function (throwOnError) {
      const isMastra = this.filename === mastraPath;
      Reflect.apply(originalClose, this, [throwOnError]);
      if (isMastra) capturePhase = true;
    };
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
          closeHostOwner: () => closeHostOwner(fixture),
          operation: async () => {
            operations++;
          },
        });
      } catch (error) {
        caught = error;
      }
      expect(sidecarOwned).toBe(true);
      expect(caught).toHaveProperty(
        'message',
        `VIDA existing storage admission: source sidecar remains: ${mastraRelative}-wal`,
      );
      expect(operations).toBe(0);
    } catch (error) {
      bodyFailure = { error };
    } finally {
      Database.prototype.close = originalClose;
      completeOwnedCleanup(
        [
          () => {
            stats.mockRestore();
            return undefined;
          },
          () => {
            if (sidecarOwned) unlinkSync(sidecar);
            return undefined;
          },
        ],
        bodyFailure,
      );
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('denies a source parent replacement during closed-image capture', async () => {
    const fixture = freshFixture();
    const hostPath = path.join(fixture.root, hostRelative);
    const parent = path.join(fixture.root, '.vida');
    const originalParent = parent + '.owned-original';
    const originalStat = Reflect.get(fs, 'lstatSync') as typeof fs.lstatSync;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    let capturePhase = false;
    let hostStats = 0;
    let parentMoved = false;
    let replacementCreated = false;
    let operations = 0;
    let caught: unknown;
    let bodyFailure: { error: unknown } | undefined;
    const stats = spyOn(fs, 'lstatSync').mockImplementation(((...args: Parameters<typeof fs.lstatSync>) => {
      const result = originalStat(...args);
      if (
        capturePhase &&
        args[0] === hostPath &&
        args[1] !== undefined &&
        typeof args[1] === 'object' &&
        Reflect.get(args[1], 'bigint') === true
      ) {
        hostStats++;
        if (hostStats === 2) {
          renameSync(parent, originalParent);
          parentMoved = true;
          mkdirSync(parent);
          replacementCreated = true;
        }
      }
      return result;
    }) as typeof fs.lstatSync);
    Database.prototype.close = function (throwOnError) {
      const isMastra = this.filename === path.join(fixture.root, mastraRelative);
      Reflect.apply(originalClose, this, [throwOnError]);
      if (isMastra) capturePhase = true;
    };
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
          closeHostOwner: () => closeHostOwner(fixture),
          operation: async () => {
            operations++;
          },
        });
      } catch (error) {
        caught = error;
      }
      expect(parentMoved).toBe(true);
      expect(replacementCreated).toBe(true);
      expect(caught).toHaveProperty('message', 'VIDA existing storage admission: source parent was replaced');
      expect(operations).toBe(0);
    } catch (error) {
      bodyFailure = { error };
    } finally {
      Database.prototype.close = originalClose;
      completeOwnedCleanup(
        [
          () => {
            stats.mockRestore();
            return undefined;
          },
          () => {
            if (replacementCreated) rmdirSync(parent);
            return undefined;
          },
          () => {
            if (parentMoved) renameSync(originalParent, parent);
            return undefined;
          },
        ],
        bodyFailure,
      );
    }
    if (bodyFailure) throw bodyFailure.error;
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

  trackedTest('rechecks the live admission gate when a callback capability is asserted', async () => {
    const fixture = freshFixture();
    const sidecar = path.join(fixture.root, '.vida', STORAGE_ADMISSION_GATE_FILE + '-wal');
    let operations = 0;
    const result = await expectAsyncReturned(() =>
      withExistingStorageMergeCapability({
        repositoryRoot: fixture.root,
        workspaceId,
        operationId: binding.operation_id,
        planDigest: '9'.repeat(64),
        expectedFenceBinding: binding,
        receipt: fixture.receipt,
        hostRelative,
        mastraRelative,
        closeHostOwner: () => closeHostOwner(fixture),
        operation: async (capability) => {
          operations++;
          capability.assertActive();
          expectReturned(() => assertExistingStorageMergeCapability(capability));
          writeFileSync(sidecar, '', { flag: 'wx' });
          let bodyFailure: { error: unknown } | undefined;
          try {
            expect(() => capability.assertActive()).toThrow('Project storage admission: gate sidecar is present: -wal');
            expect(() => assertExistingStorageMergeCapability(capability)).toThrow(
              'Project storage admission: gate sidecar is present: -wal',
            );
          } catch (error) {
            bodyFailure = { error };
          }
          completeOwnedCleanup(
            [
              () => {
                unlinkSync(sidecar);
                return undefined;
              },
            ],
            bodyFailure,
          );
          if (bodyFailure) throw bodyFailure.error;
          capability.assertActive();
          expectReturned(() => assertExistingStorageMergeCapability(capability));
          return 'gate restored';
        },
      }),
    );
    expect(result).toBe('gate restored');
    expect(operations).toBe(1);
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
  });

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

      expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(receipt.fence);
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
            expect(() => assertExistingStorageMergeCapability('forged')).toThrow(/merge capability required/u);
            expect(() => assertExistingStorageMergeCapability({})).toThrow(
              /merge capability was not minted by the Host fence owner/u,
            );
            capability.assertActive();
            capability.assertSourcesUnchanged();
            expect(capability.schema).toBe('VidaExistingStorageMergeCapability/v1');
            expect(capability.binding).toMatchObject({
              schema: 'VidaExistingStorageMerge/v1',
              operation_id: binding.operation_id,
              workspace_id: workspaceId,
              plan_digest: '9'.repeat(64),
              held_fence_token_digest: receipt.fence.token_digest,
            });
            expect(capability.host.sha256).toBe(sha256(readFileSync(path.join(fixture.root, hostRelative))));
            expect(capability.mastra.sha256).toBe(sha256(readFileSync(path.join(fixture.root, mastraRelative))));
            expect(capability.binding.source_host_digest).toBe(capability.host.sha256);
            expect(capability.binding.source_mastra_digest).toBe(capability.mastra.sha256);
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
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(receipt.fence);
    expect(callbacks).toBe(1);
    expect(() => escapedCapability?.assertActive()).toThrow(/callback capability expired/u);
    expect(() => escapedCapability?.assertSourcesUnchanged()).toThrow(/callback capability expired/u);
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

  trackedTest('captures caller-owned request fields before the Host close callback', async () => {
    const fixture = freshFixture();
    const alternateRelative = '.vida/alternate.sqlite';
    const alternate = new Database(path.join(fixture.root, alternateRelative), { strict: true });
    alternate.exec('PRAGMA journal_mode=DELETE; CREATE TABLE alternate_source(value TEXT NOT NULL);');
    alternate.close();
    const expectedMastraDigest = sha256(readFileSync(path.join(fixture.root, mastraRelative)));
    type MutableBinding = Omit<MaintenanceFenceBinding, 'project_ids'> & { project_ids: string[] };
    type AdmissionInput = Parameters<typeof withExistingStorageMergeCapability>[0];
    type MutableRequest = Omit<AdmissionInput, 'mastraRelative' | 'planDigest' | 'expectedFenceBinding'> & {
      mastraRelative: string;
      planDigest: string;
      expectedFenceBinding: MutableBinding;
    };
    let request: MutableRequest;
    let observed: { mastraDigest: string; planDigest: string } | undefined;
    request = {
      repositoryRoot: fixture.root,
      workspaceId,
      operationId: binding.operation_id,
      planDigest: '9'.repeat(64),
      expectedFenceBinding: { ...binding, project_ids: [...binding.project_ids] },
      receipt: fixture.receipt,
      hostRelative,
      mastraRelative,
      closeHostOwner: () => {
        request.mastraRelative = alternateRelative;
        request.planDigest = '8'.repeat(64);
        request.expectedFenceBinding.project_ids[0] = 'mutated-project';
        closeHostOwner(fixture);
      },
      operation: async (capability) => {
        observed = {
          mastraDigest: capability.mastra.sha256,
          planDigest: capability.binding.plan_digest,
        };
        return 'captured';
      },
    };
    const result = await expectAsyncReturned(() => withExistingStorageMergeCapability(request));
    expect(result).toBe('captured');
    expect(request.mastraRelative).toBe(alternateRelative);
    expect(request.expectedFenceBinding.project_ids).toEqual(['mutated-project']);
    expect(observed).toEqual({
      mastraDigest: expectedMastraDigest,
      planDigest: '9'.repeat(64),
    });
    expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fixture.receipt.fence);
    await releaseFence(fixture.root, fixture.receipt);
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

  for (const invalidImage of [
    { label: 'zero-byte', size: 0 },
    { label: 'over-limit', size: 4 * 1024 * 1024 + 1 },
    { label: 'multiply-linked', size: null },
  ]) {
    trackedTest(`denies a real Mastra source that is ${invalidImage.label} after its healthy checkpoint`, async () => {
      const fixture = freshFixture();
      const mastraPath = path.join(fixture.root, mastraRelative);
      const fenceBefore = fixture.hostStore.readMaintenanceFence();
      const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
      let originalMastraBytes: Buffer<ArrayBuffer> | undefined;
      let checkpointRows = 0;
      let targetedCheckpoints = 0;
      let closeCount = 0;
      let mergeCount = 0;
      let rejected = false;
      let caught: unknown;
      let exactDenial = false;
      let bodyFailure: { error: unknown } | undefined;
      const observedQuery = function (this: Database, sql: string) {
        const query = Reflect.apply(originalQuery, this, [sql]);
        if (sql.trim().toLowerCase() !== 'pragma wal_checkpoint(truncate)' || this.filename !== mastraPath)
          return query;

        targetedCheckpoints++;
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
              if (row === null) throw new Error('Real Mastra checkpoint returned no row.');
              checkpointRows++;
              if (BigInt(row.busy) !== 0n || BigInt(row.checkpointed) < BigInt(row.log))
                throw new Error('Real Mastra checkpoint was not healthy before source-size injection.');
              originalMastraBytes = Buffer.from(readFileSync(mastraPath));
              if (invalidImage.size === null) linkSync(mastraPath, mastraPath + '.owned-alias');
              else writeFileSync(mastraPath, Buffer.alloc(invalidImage.size));
              return row;
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
            receipt: fixture.receipt,
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
          rejected = true;
          caught = error;
        }
      } catch (error) {
        bodyFailure = { error };
      } finally {
        Database.prototype.query = originalQuery;
      }

      if (!bodyFailure) {
        try {
          expect(rejected).toBe(true);
          expect(caught).toBeInstanceOf(Error);
          expect(caught).toHaveProperty(
            'message',
            invalidImage.size === null
              ? 'VIDA existing storage admission: source is not a private regular file'
              : 'VIDA existing storage admission: source exceeds the merge byte bound',
          );
          expect(targetedCheckpoints).toBe(1);
          expect(checkpointRows).toBe(1);
          expect(originalMastraBytes).toBeInstanceOf(Buffer);
          if (invalidImage.size === null) expect(lstatSync(mastraPath, { bigint: true }).nlink).toBe(2n);
          else expect(readFileSync(mastraPath)).toHaveLength(invalidImage.size);
          expect(closeCount).toBe(1);
          expect(mergeCount).toBe(0);
          expect(expectReturned(() => readPersistedFence(fixture.root))).toEqual(fenceBefore);
          exactDenial = true;
        } catch (error) {
          bodyFailure = { error };
        }
      }

      let restoreFailure: { error: unknown } | undefined;
      if (exactDenial) {
        try {
          if (!originalMastraBytes) throw new Error('Original Mastra bytes were not captured after checkpoint.');
          if (invalidImage.size === null) unlinkSync(mastraPath + '.owned-alias');
          else writeFileSync(mastraPath, originalMastraBytes);
          expect(readFileSync(mastraPath)).toEqual(originalMastraBytes);
        } catch (error) {
          restoreFailure = { error };
          retainedRoots.add(fixture.root);
          console.error(`Retained failed source-size fixture: ${fixture.root}`);
        }
      } else {
        retainedRoots.add(fixture.root);
        console.error(`Retained failed source-size fixture: ${fixture.root}`);
      }
      if (bodyFailure && restoreFailure)
        throw new AggregateError(
          [bodyFailure.error, restoreFailure.error],
          'Source-size denial and restoration failed',
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

  trackedTest('preserves initial, exclusive Host, and source checkpoint close failures in order', async () => {
    const fixture = freshFixture();
    let activeFixture = fixture;
    const fenceBefore = fixture.hostStore.readMaintenanceFence();
    const hostBefore = readFileSync(path.join(fixture.root, hostRelative));
    const mastraBefore = readFileSync(path.join(fixture.root, mastraRelative));
    const phases = [
      {
        title: 'preserves real Host receipt and paired temporary close failures in order',
        kind: 'initial' as const,
        closeFailureMessage: 'temporary Host connection close failed once',
      },
      {
        title: 'preserves exclusive Host verification and source-close failures in order',
        kind: 'exclusive' as const,
        closeFailureMessage: 'exclusive Host source close failed once',
      },
      {
        title: 'preserves source checkpoint and close failures in order',
        kind: 'checkpoint' as const,
        closeFailureMessage: 'Mastra source close failed once',
      },
    ];

    for (const phase of phases) {
      const closeFailure = new Error(phase.closeFailureMessage);
      let expectedHostImage = hostBefore;
      const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
      const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
      const originalAssertMaintenanceFence = Reflect.get(
        HostStateStore.prototype,
        'assertMaintenanceFence',
      ) as typeof HostStateStore.prototype.assertMaintenanceFence;
      let verifyingFence = false;
      const retainedSources = new Set<Database>();
      let checkpointResult: unknown;
      let checkpointStatement: object | undefined;
      let checkpointGetDescriptor: PropertyDescriptor | undefined;
      let checkpointObserved = false;
      let injectedCloseFailure = false;
      let callerOwnerCloses = 0;
      let mergeCallbacks = 0;
      let rejected = false;
      let caught: unknown;
      const observedQuery = function (this: Database, sql: string) {
        if (verifyingFence) retainedSources.add(this);
        const statement = Reflect.apply(originalQuery, this, [sql]) as object;
        if (phase.kind !== 'checkpoint' || sql !== 'PRAGMA wal_checkpoint(TRUNCATE)') return statement;
        const databases = Reflect.apply(originalQuery, this, ['PRAGMA database_list']).all() as {
          name: string;
          file: string;
        }[];
        const main = databases.find((database) => database.name === 'main');
        if (main?.file !== path.join(fixture.root, mastraRelative)) return statement;
        retainedSources.add(this);
        checkpointStatement = statement;
        checkpointGetDescriptor = Object.getOwnPropertyDescriptor(statement, 'get');
        const nativeGet: unknown = Reflect.get(statement, 'get');
        if (typeof nativeGet !== 'function') return statement;
        Object.defineProperty(statement, 'get', {
          configurable: true,
          writable: true,
          value: (...args: unknown[]) => {
            try {
              checkpointResult = Reflect.apply(nativeGet, statement, args);
              checkpointObserved = true;
              throw undefined;
            } finally {
              if (checkpointGetDescriptor) Object.defineProperty(statement, 'get', checkpointGetDescriptor);
              else Reflect.deleteProperty(statement, 'get');
            }
          },
        });
        return statement;
      } as unknown as typeof Database.prototype.query;
      const observedAssertMaintenanceFence = function (this: HostStateStore, receipt: MaintenanceFenceReceipt) {
        const inject =
          phase.kind === 'initial' ? callerOwnerCloses === 0 : phase.kind === 'exclusive' && callerOwnerCloses !== 0;
        if (!inject) return Reflect.apply(originalAssertMaintenanceFence, this, [receipt]);
        verifyingFence = true;
        try {
          Reflect.apply(originalAssertMaintenanceFence, this, [receipt]);
          // The real persisted receipt check succeeds before the phase-specific body error.
          throw undefined;
        } finally {
          verifyingFence = false;
        }
      };
      const observedClose = function (this: Database, throwOnError?: boolean): void {
        if (retainedSources.has(this) && !injectedCloseFailure) {
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
            repositoryRoot: activeFixture.root,
            workspaceId,
            operationId: binding.operation_id,
            planDigest: '9'.repeat(64),
            expectedFenceBinding: binding,
            receipt: fixture.receipt,
            hostRelative,
            mastraRelative,
            closeHostOwner: () => {
              callerOwnerCloses++;
              closeHostOwner(activeFixture);
              // Closing the real owner may checkpoint WAL before exclusive verification starts.
              expectedHostImage = readFileSync(path.join(fixture.root, hostRelative));
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
        if (checkpointStatement) {
          if (checkpointGetDescriptor) Object.defineProperty(checkpointStatement, 'get', checkpointGetDescriptor);
          else Reflect.deleteProperty(checkpointStatement, 'get');
        }
      }

      const [retainedConnection] = retainedSources;
      const assertionFailures: unknown[] = [];
      try {
        expect(rejected).toBe(true);
        expect(retainedSources.size).toBe(1);
        expect(retainedConnection).toBeInstanceOf(Database);
        expect(injectedCloseFailure).toBe(true);
        expect(caught).toBeInstanceOf(AggregateError);
        if (phase.kind === 'initial') {
          expect(caught).toHaveProperty('message', 'Host fence verification and paired close failed');
          const failures = (caught as AggregateError).errors;
          expect(failures).toHaveLength(2);
          expect(failures[0]).toBeUndefined();
          expect(failures[1]).toBeInstanceOf(AggregateError);
          const closeFailures = (failures[1] as AggregateError).errors;
          expect(closeFailures).toHaveLength(1);
          expect(closeFailures[0]).toBe(closeFailure);
          expect(callerOwnerCloses).toBe(0);
        } else if (phase.kind === 'exclusive') {
          expect(caught).toHaveProperty('message', 'exclusive Host fence verification and close failed');
          const failures = (caught as AggregateError).errors;
          expect(failures).toHaveLength(2);
          expect(failures[0]).toBeUndefined();
          expect(failures[1]).toBe(closeFailure);
          expect(callerOwnerCloses).toBe(1);
        } else {
          expect(caught).toHaveProperty('message', 'source checkpoint and close failed');
          const failures = (caught as AggregateError).errors;
          expect(failures).toHaveLength(2);
          expect(failures[0]).toBeUndefined();
          expect(failures[1]).toBe(closeFailure);
          expect(callerOwnerCloses).toBe(1);
          expect(checkpointObserved).toBe(true);
          expect(checkpointResult).toBeDefined();
          assert.ok(checkpointResult !== null && typeof checkpointResult === 'object');
          assert.ok('busy' in checkpointResult && 'log' in checkpointResult && 'checkpointed' in checkpointResult);
          const { busy, log, checkpointed } = checkpointResult;
          assert.ok(typeof busy === 'number' || typeof busy === 'bigint');
          assert.ok(typeof log === 'number' || typeof log === 'bigint');
          assert.ok(typeof checkpointed === 'number' || typeof checkpointed === 'bigint');
          expect(BigInt(busy)).toBe(0n);
          expect(BigInt(checkpointed)).toBeGreaterThanOrEqual(BigInt(log));
          if (!checkpointStatement) throw new Error('Mastra checkpoint statement was not captured.');
          expect(Object.getOwnPropertyDescriptor(checkpointStatement, 'get')).toEqual(checkpointGetDescriptor);
        }
        expect(mergeCallbacks).toBe(0);
        expect(readFileSync(path.join(fixture.root, hostRelative)).equals(expectedHostImage)).toBe(true);
        expect(readFileSync(path.join(fixture.root, mastraRelative))).toEqual(mastraBefore);
        if (phase.kind === 'initial') expect(activeFixture.hostStore.readMaintenanceFence()).toEqual(fenceBefore);
        if (!retainedConnection) throw new Error(`${phase.title}: source connection was not captured.`);
        expect(retainedConnection.query('SELECT 1 AS open').get()).toEqual({
          open: phase.kind === 'checkpoint' ? 1n : 1,
        });
      } catch (error) {
        assertionFailures.push(error);
      }

      let contender: Database | undefined;
      const contenderCleanupFailures: unknown[] = [];
      try {
        if (retainedConnection && assertionFailures.length === 0) {
          if (phase.kind === 'initial') closeHostOwner(activeFixture);
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
          if (phase.kind === 'initial') {
            // Retry through the exact paired-admission cleanup owner.
            closeWorkspaceDatabaseWithAdmission(retainedConnection);
          } else {
            // Retry through the exact exclusive source-close owner registered on its first attempt.
            retryPendingWorkspaceDatabaseCloses();
          }
        } catch (error) {
          retryFailure = { error };
        }
      }
      const failures = [
        ...assertionFailures,
        ...contenderCleanupFailures,
        ...(retryFailure ? [retryFailure.error] : []),
      ];
      if (failures.length > 0) {
        retainedRoots.add(fixture.root);
        if (failures.length === 1) throw failures[0];
        throw new AggregateError(failures, `${phase.title}: Host failure assertion and owned close retry failed`);
      }
      if (phase.kind !== 'checkpoint') {
        if (phase.kind === 'exclusive') expect(readPersistedFence(fixture.root)).toEqual(fenceBefore);
        const hostOwner = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
        registerDatabase(hostOwner, fixture.root);
        activeFixture = {
          root: fixture.root,
          hostOwner,
          hostStore: new HostStateStore(
            hostOwner,
            workspaceId,
            undefined,
            undefined,
            undefined,
            verifier,
            fixture.root,
          ),
          receipt: fixture.receipt,
        };
        expect(activeFixture.hostStore.readMaintenanceFence()).toEqual(fenceBefore);
      } else {
        expect(readPersistedFence(fixture.root)).toEqual(fenceBefore);
      }
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

  trackedTest('denies malformed string preflight fields before any close or merge effect', async () => {
    const fixture = freshFixture();
    const hostBefore = readFileSync(path.join(fixture.root, hostRelative));
    const mastraBefore = readFileSync(path.join(fixture.root, mastraRelative));
    const fenceBefore = fixture.hostStore.readMaintenanceFence();
    type AdmissionInput = Parameters<typeof withExistingStorageMergeCapability>[0];
    const invalidRequests: Array<{
      label: string;
      expectedMessage: string;
      override: Partial<AdmissionInput>;
    }> = [
      {
        label: 'plan digest prefix',
        expectedMessage: 'VIDA existing storage admission: plan digest is invalid',
        override: { planDigest: 'z' + '9'.repeat(64) },
      },
      {
        label: 'plan digest trailing garbage',
        expectedMessage: 'VIDA existing storage admission: plan digest is invalid',
        override: { planDigest: '9'.repeat(64) + 'garbage' },
      },
      {
        label: 'workspace digest prefix',
        expectedMessage: 'VIDA existing storage admission: workspace digest is invalid',
        override: { workspaceId: 'z' + 'a'.repeat(64) },
      },
      {
        label: 'workspace digest trailing garbage',
        expectedMessage: 'VIDA existing storage admission: workspace digest is invalid',
        override: { workspaceId: 'a'.repeat(64) + 'garbage' },
      },
      {
        label: 'operation id punctuation',
        expectedMessage: 'VIDA existing storage admission: operation id is invalid',
        override: { operationId: '_' },
      },
      {
        label: 'operation id length',
        expectedMessage: 'VIDA existing storage admission: operation id is invalid',
        override: { operationId: 'a'.repeat(81) },
      },
      {
        label: 'colliding source paths',
        expectedMessage: 'VIDA existing storage admission: Host and Mastra paths collide',
        override: { hostRelative: mastraRelative },
      },
      {
        label: 'noncanonical Mastra relative path',
        expectedMessage: 'Workspace database: canonical relative path required',
        override: { mastraRelative: '../mastra.sqlite' },
      },
      {
        label: 'mismatched expected fence operation',
        expectedMessage: 'VIDA existing storage admission: fence binding operation differs',
        override: { expectedFenceBinding: { ...binding, operation_id: 'different-operation' } },
      },
      {
        label: 'different expected fence manifest with the same operation',
        expectedMessage: 'VIDA existing storage admission: held Host fence binding differs',
        override: { expectedFenceBinding: { ...binding, manifest_digest: '8'.repeat(64) } },
      },
    ];
    let closeCount = 0;
    let mergeCount = 0;

    for (const invalidRequest of invalidRequests) {
      let rejected = false;
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
            closeCount++;
            closeHostOwner(fixture);
          },
          operation: async () => {
            mergeCount++;
          },
          ...invalidRequest.override,
        });
      } catch (error) {
        rejected = true;
        caught = error;
      }
      assert.equal(rejected, true, invalidRequest.label);
      assert.ok(caught instanceof Error, invalidRequest.label);
      expect(caught).toHaveProperty('message', invalidRequest.expectedMessage);
      assert.equal(closeCount, 0, invalidRequest.label);
      assert.equal(mergeCount, 0, invalidRequest.label);
    }

    expect(fixture.hostStore.readMaintenanceFence()).toEqual(fenceBefore);
    expect(readFileSync(path.join(fixture.root, hostRelative))).toEqual(hostBefore);
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

function readPersistedFence(root: string) {
  const database = openHostStateDatabase(root, hostRelative, workspaceId);
  registerDatabase(database, root);
  return withWorkspaceDatabaseClose(
    database,
    () => new HostStateStore(database, workspaceId).readMaintenanceFence(),
    closeOwnedDatabase,
    'Persisted fence inspection and owned close failed',
  );
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
