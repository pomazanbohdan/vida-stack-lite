import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
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
  type ExistingStorageMergeCapability,
  withExistingStorageMergeCapability,
} from '../../src/config/project-upgrade-existing-storage-admission.js';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.js';
import { prepareExistingProjectUpgradeDatabase } from '../../src/config/project-upgrade.js';

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
const openDatabases = new Set<Database>();

afterEach(() => {
  for (const database of [...openDatabases]) {
    openDatabases.delete(database);
    try {
      closeWorkspaceDatabaseWithAdmission(database);
    } catch {
      // Keep cleanup scoped to exact fixture-owned connections.
    }
  }
  openDatabases.clear();
  for (const root of roots) rmSync(root, { recursive: true, force: true });
  roots.clear();
});

describe('native existing-storage admission boundary', () => {
  test('mints a callback-scoped capability from exact fresh Host receipt and closed source files', async () => {
    const fixture = freshFixture();
    const receipt = fixture.receipt;
    let callbacks = 0;
    let escapedCapability: ExistingStorageMergeCapability | undefined;
    const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const originalAssertMaintenanceFence = Reflect.get(
      HostStateStore.prototype,
      'assertMaintenanceFence',
    ) as typeof HostStateStore.prototype.assertMaintenanceFence;
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
        return Reflect.apply(originalAssertMaintenanceFence, this, [fenceReceipt]);
      } finally {
        verifyingFence = false;
      }
    };
    let result: string;
    Database.prototype.query = observedQuery;
    HostStateStore.prototype.assertMaintenanceFence = observedFenceVerification;
    try {
      result = await withExistingStorageMergeCapability({
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
      });
    } finally {
      HostStateStore.prototype.assertMaintenanceFence = originalAssertMaintenanceFence;
      Database.prototype.query = originalQuery;
    }
    expect(result).toBe('admitted');
    expect(callbacks).toBe(1);
    expect(() => escapedCapability?.assertActive()).toThrow(/callback capability expired/u);
    expect(readdirSync(fixture.root)).toEqual(['.vida']);
    try {
      expect(fenceVerificationReceivers.size).toBeGreaterThan(0);
      expect(hostCheckpointReceivers).toHaveLength(1);
      const checkpointReceiver = hostCheckpointReceivers[0];
      if (!checkpointReceiver) throw new Error('Host checkpoint receiver was not observed.');
      expect(fenceVerificationReceivers).toContain(checkpointReceiver);
      await releaseFence(fixture.root, receipt);
    } catch (error) {
      roots.delete(fixture.root);
      console.error(`Retained failed existing-storage admission fixture: ${fixture.root}`);
      throw error;
    }
  });

  test('denies an incorrect request token before the owner-close or merge callback effects', async () => {
    const fixture = freshFixture();
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
    expect(String(error)).toMatch(/stale or forged/u);
    expect(closes).toBe(0);
    expect(operations).toBe(0);
    await releaseFence(fixture.root, fixture.receipt);
  });

  test('a retained admitted Host reader denies the lower merge capability until that exact reader closes', async () => {
    const fixture = freshFixture();
    const contender = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
    openDatabases.add(contender);
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
    closeWorkspaceDatabaseWithAdmission(contender);
    openDatabases.delete(contender);

    const retryOwner = openHostStateDatabase(fixture.root, hostRelative, workspaceId);
    openDatabases.add(retryOwner);
    let escaped: ExistingStorageMergeCapability | undefined;
    const result = await withExistingStorageMergeCapability({
      repositoryRoot: fixture.root,
      workspaceId,
      operationId: binding.operation_id,
      planDigest: '9'.repeat(64),
      expectedFenceBinding: binding,
      receipt: fixture.receipt,
      hostRelative,
      mastraRelative,
      closeHostOwner: () => {
        closeWorkspaceDatabaseWithAdmission(retryOwner);
        openDatabases.delete(retryOwner);
      },
      operation: async (capability) => {
        operations++;
        escaped = capability;
        capability.assertActive();
        capability.assertSourcesUnchanged();
        expect(capability.binding.held_fence_token_digest).toBe(fixture.receipt.fence.token_digest);
        return 'admitted after exact reader close';
      },
    });
    expect(result).toBe('admitted after exact reader close');
    expect(operations).toBe(1);
    expect(() => escaped?.assertActive()).toThrow(/callback capability expired/u);
    await releaseFence(fixture.root, fixture.receipt);
  });

  test('denies an old receipt after persisted fence CAS advance and a foreign operation owner', async () => {
    const stale = freshFixture();
    const advancedReceipt = await advanceFence(stale);
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
    expect(String(staleError)).toMatch(/stale or forged/u);
    expect(staleCloses).toBe(0);
    expect(staleOperations).toBe(0);
    await stale.hostStore.releaseMaintenanceFence(advancedReceipt);

    const foreign = freshFixture();
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
    expect(String(foreignError)).toMatch(/operation differs/u);
    expect(foreignCloses).toBe(0);
    expect(foreignOperations).toBe(0);
    await releaseFence(foreign.root, foreign.receipt);
  });

  test('denies a released fence and keeps existing project upgrade blocked by legacy overlap status', async () => {
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
    expect(String(revokedError)).toMatch(/stale or forged/u);
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
  });
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
  mkdirSync(path.join(root, '.vida'));
  const hostOwner = openHostStateDatabase(root, hostRelative, workspaceId);
  openDatabases.add(hostOwner);
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
  closeWorkspaceDatabaseWithAdmission(fixture.hostOwner);
  openDatabases.delete(fixture.hostOwner);
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
  const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, verifier, root);
  try {
    await store.releaseMaintenanceFence(receipt);
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
