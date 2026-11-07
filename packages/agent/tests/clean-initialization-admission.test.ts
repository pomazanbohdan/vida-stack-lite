import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import {
  HostStateStore,
  initializeHostDatabaseSchema,
  openHostStateDatabase,
  type MaintenanceFenceBinding,
  type MaintenanceFenceReceipt,
} from '../src/host-state.ts';
import {
  assertCleanInitializationHostAdmission,
  withCleanInitializationHostAdmission,
  type CleanInitializationHostAdmissionCapability,
} from '../src/config/clean-initialization-admission.ts';
import { openBunSqliteClient } from '../src/orchestration/bun-sqlite-client.ts';
import {
  acquireStorageReadAdmission,
  assertInitConfigAdmission,
  closeWorkspaceDatabaseWithAdmission,
  withCleanInitializationEffectLocks,
  withCleanInitializationPublicationLocks,
  withExclusiveInitConfigAdmission,
  withExclusiveStorageInitConfigAdmission,
} from '../src/config/storage-read-admission.ts';
import type { InitConfigAdmissionProof } from '../src/config/storage-read-admission.ts';
import { sealCleanInitializationOperation } from '../bin/consumer-clean-initialization.ts';
import {
  decodeCleanInitializationOperationV2,
  sealCleanInitializationOperationV2,
} from '../bin/consumer-clean-initialization-v2.ts';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.ts';
import { retryPendingWorkspaceDatabaseCloses } from '../src/config/workspace-database-raw.ts';

const hostRelative = '.vida/host.sqlite';
const workflowRelative = '.vida/mastra.sqlite';
const hostBinding: MaintenanceFenceBinding = {
  schema: 'MaintenanceFenceBinding/v1',
  project_ids: ['fixture-project'],
  operation_id: 'clean-init-host-admission-001',
  manifest_digest: 'b'.repeat(64),
  request_digest: 'c'.repeat(64),
  bindings_digest: 'd'.repeat(64),
  closure_digest: 'e'.repeat(64),
  bundle_digest: 'f'.repeat(64),
};
const hostFenceVerifier = {
  principal: 'fixture:clean-init-host-admission',
  projectIds: ['fixture-project'],
  verify: (fence: MaintenanceFenceReceipt['fence']) => ({
    schema: 'MaintenanceReleaseAuthorization/v1' as const,
    principal: 'fixture:clean-init-host-admission',
    fence_digest: canonicalJsonDigest(fence),
    closure_digest: fence.binding.closure_digest,
    bundle_digest: fence.binding.bundle_digest,
  }),
};

async function withNativeHostFence<T>(
  run: (fixture: { root: string; receipt: MaintenanceFenceReceipt; closeHostOwner: () => void }) => Promise<T>,
): Promise<T> {
  const root = await makeFreshRepository('clean-init-host-admission-');
  mkdirSync(path.join(root, '.vida'), { recursive: true });
  const host = openHostStateDatabase(root, hostRelative, digest);
  initializeHostDatabaseSchema(host);
  const store = new HostStateStore(host, digest, undefined, undefined, undefined, hostFenceVerifier, root);
  const receipt = store.acquireMaintenanceFence(hostBinding);
  const workflow = new Database(path.join(root, workflowRelative), { strict: true });
  workflow.exec('PRAGMA journal_mode=DELETE; CREATE TABLE fixture_workflow(value TEXT NOT NULL);');
  workflow.close();
  let ownerOpen = true;
  let passed = false;
  try {
    const result = await run({
      root,
      receipt,
      closeHostOwner() {
        if (!ownerOpen) throw new Error('Host owner close was repeated');
        closeWorkspaceDatabaseWithAdmission(host);
        ownerOpen = false;
      },
    });
    passed = true;
    return result;
  } finally {
    if (passed) {
      if (ownerOpen) closeWorkspaceDatabaseWithAdmission(host);
      rmSync(root, { recursive: true, force: true });
    } else console.error('Retained failed native clean-init Host fixture: ' + root);
  }
}

function requestFor(
  root: string,
  receipt: MaintenanceFenceReceipt,
  closeHostOwner: () => void,
  operation: (capability: CleanInitializationHostAdmissionCapability) => Promise<unknown>,
  overrides: Partial<{
    workspaceId: string;
    operationId: string;
    expectedFenceBinding: MaintenanceFenceBinding;
    receipt: MaintenanceFenceReceipt;
    hostRelative: string;
    workflowRelative: string;
  }> = {},
) {
  return {
    repositoryRoot: root,
    workspaceId: overrides.workspaceId ?? digest,
    operationId: overrides.operationId ?? hostBinding.operation_id,
    expectedFenceBinding: overrides.expectedFenceBinding ?? hostBinding,
    receipt: overrides.receipt ?? receipt,
    hostRelative: overrides.hostRelative ?? hostRelative,
    workflowRelative: overrides.workflowRelative ?? workflowRelative,
    closeHostOwner,
    operation,
  };
}

test('native held Host admission rechecks the real fence under one exclusive gate and expires its callback capability', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    let operations = 0;
    let admittedCapability: CleanInitializationHostAdmissionCapability | undefined;
    const result = await withCleanInitializationHostAdmission(
      requestFor(root, receipt, closeHostOwner, async (capability) => {
        operations += 1;
        admittedCapability = capability;
        assertCleanInitializationHostAdmission(capability, root, digest, hostBinding.operation_id);
        expect(() =>
          assertCleanInitializationHostAdmission(capability, root + '-replaced', digest, hostBinding.operation_id),
        ).toThrow(/root/u);
        expect(() =>
          assertCleanInitializationHostAdmission(capability, root, 'f'.repeat(64), hostBinding.operation_id),
        ).toThrow();
        expect(() =>
          assertCleanInitializationHostAdmission(capability, root, digest, hostBinding.operation_id + '-other'),
        ).toThrow(/operation/u);
        return 'admitted';
      }),
    );

    expect(result).toBe('admitted');
    expect(operations).toBe(1);
    expect(admittedCapability).toBeDefined();
    expect(() =>
      assertCleanInitializationHostAdmission(
        admittedCapability as CleanInitializationHostAdmissionCapability,
        root,
        digest,
        hostBinding.operation_id,
      ),
    ).toThrow(/expired/u);
    expect(() =>
      assertCleanInitializationHostAdmission(
        { schema: 'VidaCleanInitializationHostAdmission/v1' },
        root,
        digest,
        hostBinding.operation_id,
      ),
    ).toThrow(/forged/u);
  });
});

test('native Host admission refuses a replaced Host file between receipt checks', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    const hostPath = path.join(root, hostRelative);
    let ownerCloses = 0;
    let operations = 0;
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            () => {
              closeHostOwner();
              ownerCloses += 1;
              const replacement = hostPath + '.replacement';
              const original = hostPath + '.original';
              writeFileSync(replacement, readFileSync(hostPath));
              renameSync(hostPath, original);
              renameSync(replacement, hostPath);
            },
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
          ),
        ),
      ).rejects.toThrow(/identity/u),
    );
    expect(ownerCloses).toBe(1);
    expect(operations).toBe(0);
  });
});

test('native Host capability rejects a replaced Host path during callback', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    const hostPath = path.join(root, hostRelative);
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(root, receipt, closeHostOwner, async (capability) => {
            const replacement = hostPath + '.replacement';
            const original = hostPath + '.original';
            writeFileSync(replacement, readFileSync(hostPath));
            renameSync(hostPath, original);
            renameSync(replacement, hostPath);
            assertCleanInitializationHostAdmission(capability, root, digest, hostBinding.operation_id);
            return 'incorrectly admitted';
          }),
        ),
      ).rejects.toThrow(/identity/u),
    );
  });
});

test('native Host admission refuses a mismatched fence binding before owner close or operation', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    let ownerCloses = 0;
    let operations = 0;
    const changedBinding = { ...hostBinding, request_digest: '9'.repeat(64) };
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            () => {
              ownerCloses += 1;
              closeHostOwner();
            },
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
            { expectedFenceBinding: changedBinding },
          ),
        ),
      ).rejects.toThrow(/binding/u),
    );
    expect(ownerCloses).toBe(0);
    expect(operations).toBe(0);
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            closeHostOwner,
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
            { operationId: 'foreign-operation' },
          ),
        ),
      ).rejects.toThrow(/binding operation/u),
    );
    expect(operations).toBe(0);
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            closeHostOwner,
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
            { workspaceId: 'f'.repeat(64) },
          ),
        ),
      ).rejects.toThrow(),
    );
    expect(operations).toBe(0);
  });
});

test('native Host admission refuses a receipt from another real Host root', async () => {
  await withNativeHostFence(async (local) => {
    await withNativeHostFence(async (foreign) => {
      let ownerCloses = 0;
      let operations = 0;
      await Promise.resolve(
        expect(
          withCleanInitializationHostAdmission(
            requestFor(
              local.root,
              foreign.receipt,
              () => {
                ownerCloses += 1;
                local.closeHostOwner();
              },
              async () => {
                operations += 1;
                return 'incorrectly admitted';
              },
            ),
          ),
        ).rejects.toThrow(),
      );
      expect(ownerCloses).toBe(0);
      expect(operations).toBe(0);
    });
  });
});

test('native Host admission preserves a caller owner-close failure before operation', async () => {
  await withNativeHostFence(async ({ root, receipt }) => {
    const failure = new Error('exact Host owner close failed');
    let operations = 0;
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            () => {
              throw failure;
            },
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
          ),
        ),
      ).rejects.toBe(failure),
    );
    expect(operations).toBe(0);
  });
});

test('native Host source close failure retains the captured gate owner until native retry completes', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    const closeFailure = new Error('captured Host source close failed once');
    const originalQuery = Reflect.get(Database.prototype, 'query') as typeof Database.prototype.query;
    const originalClose = Reflect.get(Database.prototype, 'close') as typeof Database.prototype.close;
    const originalAssertFence = Reflect.get(
      HostStateStore.prototype,
      'assertMaintenanceFence',
    ) as typeof HostStateStore.prototype.assertMaintenanceFence;
    let callerOwnerClosed = false;
    let observingFence = false;
    let injected = false;
    let operations = 0;
    let caught: unknown;
    const retainedSources = new Set<Database>();
    const observedQuery = function (this: Database, sql: string) {
      if (observingFence) retainedSources.add(this);
      return Reflect.apply(originalQuery, this, [sql]) as object;
    } as unknown as typeof Database.prototype.query;
    const observedAssertFence = function (this: HostStateStore, actualReceipt: MaintenanceFenceReceipt) {
      observingFence = callerOwnerClosed;
      try {
        return Reflect.apply(originalAssertFence, this, [actualReceipt]);
      } finally {
        observingFence = false;
      }
    };
    const observedClose = function (this: Database, throwOnError?: boolean): void {
      if (callerOwnerClosed && retainedSources.has(this) && !injected) {
        injected = true;
        throw closeFailure;
      }
      return Reflect.apply(originalClose, this, [throwOnError]);
    } as typeof Database.prototype.close;

    Database.prototype.query = observedQuery;
    Database.prototype.close = observedClose;
    HostStateStore.prototype.assertMaintenanceFence = observedAssertFence;
    try {
      try {
        await withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            () => {
              closeHostOwner();
              callerOwnerClosed = true;
            },
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
          ),
        );
      } catch (error) {
        caught = error;
      }
    } finally {
      HostStateStore.prototype.assertMaintenanceFence = originalAssertFence;
      Database.prototype.close = originalClose;
      Database.prototype.query = originalQuery;
    }

    expect(caught).toBeInstanceOf(Error);
    expect(injected).toBe(true);
    expect(operations).toBe(0);
    retryPendingWorkspaceDatabaseCloses();
    const reader = acquireStorageReadAdmission(root, digest, hostRelative);
    reader.close();
  });
});

test('native Host admission refuses a stale generation receipt before owner close or operation', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    let ownerCloses = 0;
    let operations = 0;
    const staleReceipt: MaintenanceFenceReceipt = {
      ...receipt,
      fence: { ...receipt.fence, generation: receipt.fence.generation + 1 },
    };
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            () => {
              ownerCloses += 1;
              closeHostOwner();
            },
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
            { receipt: staleReceipt },
          ),
        ),
      ).rejects.toThrow(),
    );
    expect(ownerCloses).toBe(0);
    expect(operations).toBe(0);
    const releasedStatusReceipt: MaintenanceFenceReceipt = {
      ...receipt,
      fence: { ...receipt.fence, status: 'released' },
    };
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(
            root,
            receipt,
            closeHostOwner,
            async () => {
              operations += 1;
              return 'incorrectly admitted';
            },
            { receipt: releasedStatusReceipt },
          ),
        ),
      ).rejects.toThrow(),
    );
    expect(operations).toBe(0);
  });
});

test('native Host admission fails before operation when another real storage reader holds the gate', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    const reader = acquireStorageReadAdmission(root, digest, hostRelative);
    let ownerCloses = 0;
    let operations = 0;
    try {
      await Promise.resolve(
        expect(
          withCleanInitializationHostAdmission(
            requestFor(
              root,
              receipt,
              () => {
                ownerCloses += 1;
                closeHostOwner();
              },
              async () => {
                operations += 1;
                return 'incorrectly admitted';
              },
            ),
          ),
        ).rejects.toThrow(),
      );
      expect(ownerCloses).toBe(1);
      expect(operations).toBe(0);
    } finally {
      reader.close();
    }
  });
});

test('native Host admission drains the exact local workflow client before exclusive entry', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    const client = openBunSqliteClient(root, workflowRelative, digest);
    const realClose = client.close.bind(client);
    let closeCalls = 0;
    let closed = false;
    client.close = () => {
      closeCalls += 1;
      closed = true;
      return realClose();
    };
    try {
      const result = await withCleanInitializationHostAdmission(
        requestFor(root, receipt, closeHostOwner, async (capability) => {
          assertCleanInitializationHostAdmission(capability, root, digest, hostBinding.operation_id);
          return 'admitted after local workflow drain';
        }),
      );
      expect(result).toBe('admitted after local workflow drain');
      expect(closeCalls).toBe(1);
      expect(closed).toBe(true);
    } finally {
      if (!closed) await realClose();
    }
  });
});

test('native Host admission preserves callback failure and releases captured source custody', async () => {
  await withNativeHostFence(async ({ root, receipt, closeHostOwner }) => {
    const failure = new Error('clean-init operation callback failed');
    let escaped: CleanInitializationHostAdmissionCapability | undefined;
    await Promise.resolve(
      expect(
        withCleanInitializationHostAdmission(
          requestFor(root, receipt, closeHostOwner, async (capability) => {
            escaped = capability;
            throw failure;
          }),
        ),
      ).rejects.toBe(failure),
    );
    expect(() =>
      assertCleanInitializationHostAdmission(
        escaped as CleanInitializationHostAdmissionCapability,
        root,
        digest,
        hostBinding.operation_id,
      ),
    ).toThrow(/expired/u);
    const reader = acquireStorageReadAdmission(root, digest, hostRelative);
    reader.close();
  });
});

const digest = 'a'.repeat(64);
const pendingPath = '.agent/consumer-clean-initialization.pending.v1.json';

function v2PendingBytes(root: string, workspaceId: string, operationId: string): Buffer {
  const archiveRoot = `.agent/clean-initialization-history/${operationId}/payload`;
  const target = `${archiveRoot}/AGENTS.md`;
  const containers = new Set<string>();
  const parts = target.split('/');
  for (let count = 1; count < parts.length; count += 1) {
    const parent = parts.slice(0, count).join('/');
    if (parent !== '.agent') containers.add(parent);
  }
  return Buffer.from(
    JSON.stringify(
      sealCleanInitializationOperationV2({
        schema: 'ConsumerCleanInitializationOperation/v2',
        version: 2,
        operation_id: operationId,
        root,
        root_identity: 'root-id',
        workspace_id: workspaceId,
        request: { projectRoot: root, repository: 'repo', projectMappings: ['agent=packages/agent'] },
        runtime: { version: '1.2.3', bundle_identity: 'bundle-id', resource_digest: digest },
        archive_root: archiveRoot,
        inventory: [{ type: 'file', path: 'AGENTS.md', identity: 'agents-id', size: 7, sha256: digest }],
        preserved: [],
        protected_paths: ['.agent/coordination', '.agent/work'],
        moves: [
          {
            kind: 'archive',
            source: 'AGENTS.md',
            target,
            source_identity: 'agents-id',
            type: 'file',
            state: 'not-started',
          },
        ],
        containers: [...containers]
          .sort()
          .map((container) => ({ path: container, state: 'not-started', identity: null })),
        phase: 'intent',
        prepared: null,
        initialization: 'not-started',
      }),
    ),
  );
}

function v1PendingBytes(root: string, workspaceId: string, operationId: string): Buffer {
  const archiveRoot = `.agent/clean-initialization-history/${operationId}/payload`;
  return Buffer.from(
    JSON.stringify(
      sealCleanInitializationOperation({
        schema: 'ConsumerCleanInitializationOperation/v1',
        version: 1,
        operation_id: operationId,
        root,
        root_identity: 'root-id',
        workspace_id: workspaceId,
        request: { projectRoot: root, repository: 'repo', projectMappings: ['agent=packages/agent'] },
        runtime: { version: '1.2.3', bundle_identity: 'bundle-id', resource_digest: digest },
        archive_root: archiveRoot,
        inventory: [{ type: 'file', path: 'AGENTS.md', identity: 'agents-id', size: 7, sha256: digest }],
        moves: [
          {
            kind: 'archive',
            source: 'AGENTS.md',
            target: `${archiveRoot}/AGENTS.md`,
            source_identity: 'agents-id',
            type: 'file',
            state: 'not-started',
          },
        ],
        containers: [{ path: archiveRoot, state: 'not-started', identity: null }],
        phase: 'intent',
        prepared: null,
        initialization: 'not-started',
      }),
    ),
  );
}

function writePending(root: string, bytes: Uint8Array): string {
  const absolute = path.join(root, pendingPath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
  return absolute;
}

function agentEntries(root: string): string[] {
  return readdirSync(path.join(root, '.agent')).sort();
}

function expectSameBytes(actual: Uint8Array, expected: Uint8Array): void {
  expect(Array.from(actual)).toEqual(Array.from(expected));
}

async function withFreshFixture<T>(prefix: string, run: (root: string) => Promise<T>): Promise<T> {
  const root = await makeFreshRepository(prefix);
  let passed = false;
  try {
    const result = await run(root);
    passed = true;
    return result;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed clean-init lock fixture: ' + root);
  }
}

async function expectEffectRefused(
  root: string,
  workspaceId: string,
  operationId: string,
  expectedBytes: Uint8Array,
): Promise<void> {
  const file = path.join(root, pendingPath);
  const before = Buffer.from(readFileSync(file));
  const entriesBefore = agentEntries(root);
  let called = false;
  await withExclusiveInitConfigAdmission(root, workspaceId, async (proof) => {
    await Promise.resolve(
      expect(
        withCleanInitializationEffectLocks(
          proof,
          root,
          workspaceId,
          operationId,
          expectedBytes,
          decodeCleanInitializationOperationV2,
          async () => {
            called = true;
          },
        ),
      ).rejects.toThrow(),
    );
  });
  expect(called).toBe(false);
  expect(readFileSync(file)).toEqual(before);
  expect(agentEntries(root)).toEqual(entriesBefore);
}

test('joins the verifier result to a live exclusive init/config proof', async () => {
  const root = await makeFreshRepository('clean-init-admission-');
  const workspaceId = 'a'.repeat(64);
  let passed = false;
  let expired: (() => void) | undefined;
  let verifierOwner: { captureSource(database: import('bun:sqlite').Database): void } | undefined;
  const verifierResult = Symbol('verifier-result');
  try {
    let verified = false;
    await withExclusiveStorageInitConfigAdmission(
      root,
      workspaceId,
      (sourceOwner) => {
        verified = true;
        verifierOwner = sourceOwner;
        return verifierResult;
      },
      async (proof) => {
        expired = proof.assertActive;
        expect(verified).toBe(true);
        expect(proof.fence).toBe(verifierResult);
        const observedVerifierOwner = verifierOwner;
        if (!observedVerifierOwner) throw new Error('Expected the verifier source owner to be captured');
        expect(proof.captureSource === observedVerifierOwner.captureSource).toBe(true);
        assertInitConfigAdmission(proof, root, workspaceId);
        await Promise.resolve();
        proof.assertActive();
        expect(() => assertInitConfigAdmission(proof, root, 'b'.repeat(64))).toThrow();
      },
    );
    expect(() => expired?.()).toThrow('exclusive admission capability expired');
    expect(() => assertInitConfigAdmission({ assertActive: () => undefined }, root, workspaceId)).toThrow(
      'invalid init/config admission proof',
    );
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.error('Retained failed clean-init admission fixture: ' + root);
  }
});

test('initial journal publication still refuses every present pending image', async () => {
  const workspaceId = digest;
  const operationId = 'op-publication-lock';
  const cases = [
    { bytes: (root: string) => v2PendingBytes(root, workspaceId, operationId) },
    { bytes: (root: string) => v1PendingBytes(root, workspaceId, operationId) },
    { bytes: () => Buffer.from('{ invalid') },
    {
      bytes: (root: string) => v2PendingBytes(path.join(root, 'foreign-root'), workspaceId, operationId),
    },
  ];
  for (const item of cases) {
    await withFreshFixture('clean-init-publication-lock-', async (root) => {
      const bytes = item.bytes(root);
      const file = writePending(root, bytes);
      const entriesBefore = agentEntries(root);
      let called = false;
      await withExclusiveInitConfigAdmission(root, workspaceId, async (proof) => {
        await Promise.resolve(
          expect(
            withCleanInitializationPublicationLocks(proof, root, workspaceId, async () => {
              called = true;
            }),
          ).rejects.toThrow('Clean initialization is pending'),
        );
      });
      expect(called).toBe(false);
      expectSameBytes(readFileSync(file), bytes);
      expect(agentEntries(root)).toEqual(entriesBefore);
    });
  }
});

test('effect locks admit only the exact own v2 image and snapshot caller bytes', async () => {
  await withFreshFixture('clean-init-effect-lock-', async (root) => {
    const workspaceId = digest;
    const operationId = 'op-effect-lock';
    const bytes = v2PendingBytes(root, workspaceId, operationId);
    const file = writePending(root, bytes);
    const entriesBefore = agentEntries(root);
    const callerBytes = Buffer.from(bytes);
    let called = false;
    await withExclusiveInitConfigAdmission(root, workspaceId, async (proof) => {
      const effect = withCleanInitializationEffectLocks(
        proof,
        root,
        workspaceId,
        operationId,
        callerBytes,
        decodeCleanInitializationOperationV2,
        async (operation) => {
          called = true;
          expect(operation.operation_id).toBe(operationId);
          expect(operation.root).toBe(root);
          expect(operation.workspace_id).toBe(workspaceId);
          return operation.phase;
        },
      );
      const firstByte = callerBytes[0];
      expect(firstByte).toBeDefined();
      if (firstByte === undefined) throw new Error('Expected non-empty caller-owned pending bytes');
      callerBytes[0] = firstByte ^ 0xff;
      await Promise.resolve(expect(effect).resolves.toBe('intent'));
    });
    expect(called).toBe(true);
    expectSameBytes(readFileSync(file), bytes);
    expect(agentEntries(root)).toEqual(entriesBefore);
  });
});

test('effect locks refuse a changed pending-byte preimage without effects', async () => {
  await withFreshFixture('clean-init-effect-bytes-', async (root) => {
    const workspaceId = digest;
    const operationId = 'op-effect-bytes';
    const expected = v2PendingBytes(root, workspaceId, operationId);
    const changed = Buffer.concat([expected, Buffer.from('\n')]);
    const file = writePending(root, changed);
    await expectEffectRefused(root, workspaceId, operationId, expected);
    expect(readFileSync(file)).toEqual(changed);
  });
});

test('effect locks refuse foreign root, workspace, or operation bindings', async () => {
  const workspaceId = digest;
  const operationId = 'op-effect-binding';
  const cases = [
    { root: (root: string) => path.join(root, 'foreign-root'), workspace: workspaceId, recordOperation: operationId },
    { root: (root: string) => root, workspace: 'b'.repeat(64), recordOperation: operationId },
    { root: (root: string) => root, workspace: workspaceId, recordOperation: 'op-foreign' },
  ];
  for (const item of cases) {
    await withFreshFixture('clean-init-effect-binding-', async (root) => {
      const bytes = v2PendingBytes(item.root(root), item.workspace, item.recordOperation);
      const file = writePending(root, bytes);
      await expectEffectRefused(root, workspaceId, operationId, bytes);
      expectSameBytes(readFileSync(file), bytes);
    });
  }
});

test('effect locks refuse invalid and legacy v1 journals without effects', async () => {
  const workspaceId = digest;
  const operationId = 'op-effect-decoder';
  const cases = [
    { bytes: () => Buffer.from('{ invalid') },
    { bytes: (root: string) => v1PendingBytes(root, workspaceId, operationId) },
  ];
  for (const item of cases) {
    await withFreshFixture('clean-init-effect-decoder-', async (root) => {
      const bytes = item.bytes(root);
      const file = writePending(root, bytes);
      await expectEffectRefused(root, workspaceId, operationId, bytes);
      expectSameBytes(readFileSync(file), bytes);
    });
  }
});

test('effect locks refuse unreadable pending paths without effects', async () => {
  await withFreshFixture('clean-init-effect-unreadable-', async (root) => {
    const absolute = path.join(root, pendingPath);
    mkdirSync(path.dirname(absolute), { recursive: true });
    mkdirSync(absolute);
    const entriesBefore = agentEntries(root);
    let called = false;
    await withExclusiveInitConfigAdmission(root, digest, async (proof) => {
      await Promise.resolve(
        expect(
          withCleanInitializationEffectLocks(
            proof,
            root,
            digest,
            'op-unreadable',
            Buffer.from('{}'),
            decodeCleanInitializationOperationV2,
            async () => {
              called = true;
            },
          ),
        ).rejects.toThrow(),
      );
    });
    expect(called).toBe(false);
    expect(lstatSync(absolute).isDirectory()).toBe(true);
    expect(agentEntries(root)).toEqual(entriesBefore);
  });
});

test('effect locks refuse forged and expired proofs without effects', async () => {
  await withFreshFixture('clean-init-effect-proof-', async (root) => {
    const workspaceId = digest;
    const operationId = 'op-effect-proof';
    const bytes = v2PendingBytes(root, workspaceId, operationId);
    const file = writePending(root, bytes);
    const entriesBefore = agentEntries(root);
    let expired: InitConfigAdmissionProof | undefined;
    let called = false;
    await withExclusiveInitConfigAdmission(root, workspaceId, async (proof) => {
      expired = proof;
      await Promise.resolve(
        expect(
          withCleanInitializationEffectLocks(
            { assertActive: () => undefined },
            root,
            workspaceId,
            operationId,
            bytes,
            decodeCleanInitializationOperationV2,
            async () => {
              called = true;
            },
          ),
        ).rejects.toThrow('invalid init/config admission proof'),
      );
    });
    await Promise.resolve(
      expect(
        withCleanInitializationEffectLocks(
          expired!,
          root,
          workspaceId,
          operationId,
          bytes,
          decodeCleanInitializationOperationV2,
          async () => {
            called = true;
          },
        ),
      ).rejects.toThrow('invalid init/config admission proof'),
    );
    expect(called).toBe(false);
    expectSameBytes(readFileSync(file), bytes);
    expect(agentEntries(root)).toEqual(entriesBefore);
  });
});
