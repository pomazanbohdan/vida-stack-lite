/** Package-private coordinator. It does not activate, retire, or delete legacy source files. */
import type { Database } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { HostStateStore, type MaintenanceFenceBinding, type MaintenanceFenceReceipt } from '../host-state.js';
import {
  assertWorkspaceDatabaseRelativePath,
  openUnadmittedWorkspaceDatabase,
  withWorkspaceDatabaseClose,
} from './workspace-database-raw.js';
import { requireSafeRepositoryAccess } from './safe-repository-access.js';
import {
  acquireStorageReadAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithAdmission,
  withExclusiveStorageAdmission,
  type ExclusiveStorageSourceOwner,
} from './storage-read-admission.js';
import { closeWorkspaceWorkflowClients } from '../orchestration/bun-sqlite-client.js';
import type { ClosedDatabaseImage, ExistingMergeBinding } from './project-upgrade-existing-storage.js';

const label = 'VIDA existing storage admission';

function requireAdmission(value: unknown, message: string): asserts value {
  if (!value) throw new Error(label + ': ' + message);
}

export interface ExistingStorageMergeCapability {
  readonly schema: 'VidaExistingStorageMergeCapability/v1';
  readonly binding: ExistingMergeBinding;
  readonly host: ClosedDatabaseImage;
  readonly mastra: ClosedDatabaseImage;
  assertActive(): void;
  assertSourcesUnchanged(): void;
}

interface PrivateCapabilityState {
  readonly assertGateActive: () => void;
  readonly repositoryIdentity: string;
  readonly hostRelative: string;
  readonly mastraRelative: string;
}
const capabilities = new WeakMap<object, PrivateCapabilityState>();

function sourceSidecarsAbsent(root: string, relative: string): void {
  const access = requireSafeRepositoryAccess(root);
  for (const suffix of ['-wal', '-shm', '-journal'])
    requireAdmission(!access.fileExists(relative + suffix, label), 'source sidecar remains: ' + relative + suffix);
}

function closedImage(root: string, relative: string): ClosedDatabaseImage {
  const access = requireSafeRepositoryAccess(root);
  assertWorkspaceDatabaseRelativePath(relative);
  const parent = path.posix.dirname(relative);
  const parentIdentity = access.directoryIdentity(parent, label);
  sourceSidecarsAbsent(root, relative);
  const stat = lstatSync(path.join(root, relative), { bigint: true });
  requireAdmission(
    stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n,
    'source is not a private regular file',
  );
  requireAdmission(stat.size > 0n && stat.size <= 4n * 1024n * 1024n, 'source exceeds the merge byte bound');
  const before = { device: String(stat.dev), inode: String(stat.ino), size: Number(stat.size) };
  const bytes = access.readBytes(relative, label);
  const afterStat = lstatSync(path.join(root, relative), { bigint: true });
  const after = { device: String(afterStat.dev), inode: String(afterStat.ino), size: Number(afterStat.size) };
  sourceSidecarsAbsent(root, relative);
  requireAdmission(canonicalJsonDigest(before) === canonicalJsonDigest(after), 'source changed during image capture');
  requireAdmission(bytes.byteLength === after.size, 'source image size differs');
  requireAdmission(access.directoryIdentity(parent, label) === parentIdentity, 'source parent was replaced');
  return Object.freeze({
    ...after,
    sha256: new Bun.CryptoHasher('sha256').update(bytes).digest('hex'),
    bytes: Uint8Array.from(bytes),
  });
}

function closedImageIdentity(image: ClosedDatabaseImage) {
  return { device: image.device, inode: image.inode, size: image.size, sha256: image.sha256 };
}

function checkpointSource(database: Database): void {
  const row = database
    .query<{ busy: number | bigint; log: number | bigint; checkpointed: number | bigint }, []>(
      'PRAGMA wal_checkpoint(TRUNCATE)',
    )
    .get();
  requireAdmission(
    row !== null && BigInt(row.busy) === 0n && BigInt(row.checkpointed) >= BigInt(row.log),
    'source WAL checkpoint did not complete',
  );
}

function checkpointAndClose(root: string, relative: string, sourceOwner: ExclusiveStorageSourceOwner): void {
  const database = openUnadmittedWorkspaceDatabase(root, relative, false, true, sourceOwner.captureSource);
  withWorkspaceDatabaseClose(
    database,
    () => checkpointSource(database),
    sourceOwner.closeSource,
    'source checkpoint and close failed',
  );
  sourceSidecarsAbsent(root, relative);
}

function fenceBindingMatches(actual: MaintenanceFenceBinding, expected: MaintenanceFenceBinding): boolean {
  return canonicalJsonDigest(actual) === canonicalJsonDigest(expected);
}

/**
 * Hold the repository-wide SQLite EXCLUSIVE gate, verify the actual Host receipt against its
 * current row, checkpoint/close both main files, then mint a callback-scoped opaque capability.
 * A busy gate, bad token/generation, replaced source, or remaining sidecar fails before merge.
 */
export async function withExistingStorageMergeCapability<T>(input: {
  readonly repositoryRoot: string;
  readonly workspaceId: string;
  readonly operationId: string;
  readonly planDigest: string;
  readonly expectedFenceBinding: MaintenanceFenceBinding;
  readonly receipt: MaintenanceFenceReceipt;
  readonly hostRelative: string;
  readonly mastraRelative: string;
  /** Closes this caller's exact, already verified Host owner and its paired admission lease. */
  readonly closeHostOwner: () => void;
  readonly operation: (capability: ExistingStorageMergeCapability) => Promise<T>;
}): Promise<T> {
  assertWorkspaceDatabaseRelativePath(input.hostRelative);
  assertWorkspaceDatabaseRelativePath(input.mastraRelative);
  requireAdmission(typeof input.closeHostOwner === 'function', 'exact Host owner close callback is required');
  requireAdmission(/^[a-f0-9]{64}$/u.test(input.workspaceId), 'workspace digest is invalid');
  requireAdmission(/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(input.operationId), 'operation id is invalid');
  requireAdmission(/^[a-f0-9]{64}$/u.test(input.planDigest), 'plan digest is invalid');
  requireAdmission(input.hostRelative !== input.mastraRelative, 'Host and Mastra paths collide');
  requireAdmission(input.expectedFenceBinding.operation_id === input.operationId, 'fence binding operation differs');
  const access = requireSafeRepositoryAccess(input.repositoryRoot);
  const repositoryIdentity = access.directoryIdentity('.', label);
  const verifyCurrentFence = (database: Database) => {
    const store = new HostStateStore(
      database,
      input.workspaceId,
      undefined,
      undefined,
      undefined,
      {
        principal: 'vida:existing-storage-merge-verifier',
        projectIds: input.expectedFenceBinding.project_ids,
        verify: () => null,
      },
      input.repositoryRoot,
    );
    const fence = store.assertMaintenanceFence(input.receipt);
    requireAdmission(fence.status === 'held', 'Host maintenance fence is not held');
    requireAdmission(fence.workspace_id === input.workspaceId, 'held Host fence workspace differs');
    requireAdmission(fence.binding.operation_id === input.operationId, 'held Host fence operation differs');
    requireAdmission(fenceBindingMatches(fence.binding, input.expectedFenceBinding), 'held Host fence binding differs');
    requireAdmission(fence.generation === input.receipt.fence.generation, 'held Host fence generation differs');
    requireAdmission(fence.revision === input.receipt.fence.revision, 'held Host fence revision differs');
    requireAdmission(fence.token_digest === input.receipt.fence.token_digest, 'held Host token digest differs');
    return fence;
  };
  const admission = acquireStorageReadAdmission(input.repositoryRoot, input.workspaceId, input.hostRelative);
  const initialHost = openExistingWorkspaceDatabaseWithAdmission(
    input.repositoryRoot,
    input.hostRelative,
    admission,
    false,
    false,
  );
  const fenceErrors: unknown[] = [];
  try {
    verifyCurrentFence(initialHost);
  } catch (error) {
    fenceErrors.push(error);
  }
  try {
    closeWorkspaceDatabaseWithAdmission(initialHost);
  } catch (error) {
    fenceErrors.push(error);
  }
  if (fenceErrors.length === 1) throw fenceErrors[0];
  if (fenceErrors.length > 1) throw new AggregateError(fenceErrors, 'Host fence verification and paired close failed');
  // Real local Mastra owners are drained after receipt verification; remote owners must close
  // their paired gate leases themselves or the bounded EXCLUSIVE attempt fails without reads.
  closeWorkspaceWorkflowClients(input.repositoryRoot, input.mastraRelative);
  input.closeHostOwner();
  return withExclusiveStorageAdmission(
    input.repositoryRoot,
    input.workspaceId,
    (sourceOwner) => {
      // This private verifier opener runs only after SQLite EXCLUSIVE admission; public openers wait.
      const host = openUnadmittedWorkspaceDatabase(
        input.repositoryRoot,
        input.hostRelative,
        false,
        false,
        sourceOwner.captureSource,
      );
      const fence = withWorkspaceDatabaseClose(
        host,
        () => {
          const verified = verifyCurrentFence(host);
          checkpointSource(host);
          return verified;
        },
        sourceOwner.closeSource,
        'exclusive Host fence verification and close failed',
      );
      sourceSidecarsAbsent(input.repositoryRoot, input.hostRelative);
      return fence;
    },
    async (gate) => {
      gate.assertActive();
      checkpointAndClose(input.repositoryRoot, input.mastraRelative, gate);
      const hostImage = closedImage(input.repositoryRoot, input.hostRelative);
      const mastraImage = closedImage(input.repositoryRoot, input.mastraRelative);
      const fence = gate.fence as ReturnType<HostStateStore['assertMaintenanceFence']>;
      const binding: ExistingMergeBinding = Object.freeze({
        schema: 'VidaExistingStorageMerge/v1',
        operation_id: input.operationId,
        workspace_id: input.workspaceId,
        plan_digest: input.planDigest,
        held_fence_token_digest: fence.token_digest,
        source_host_digest: hostImage.sha256,
        source_mastra_digest: mastraImage.sha256,
      });
      let active = true;
      const capability = Object.freeze({
        schema: 'VidaExistingStorageMergeCapability/v1' as const,
        binding,
        host: hostImage,
        mastra: mastraImage,
        assertActive(): void {
          requireAdmission(active, 'callback capability expired');
          gate.assertActive();
          requireAdmission(access.directoryIdentity('.', label) === repositoryIdentity, 'repository root was replaced');
        },
        assertSourcesUnchanged(): void {
          capability.assertActive();
          requireAdmission(
            canonicalJsonDigest(closedImageIdentity(closedImage(input.repositoryRoot, input.hostRelative))) ===
              canonicalJsonDigest(closedImageIdentity(hostImage)),
            'Host source changed after capture',
          );
          requireAdmission(
            canonicalJsonDigest(closedImageIdentity(closedImage(input.repositoryRoot, input.mastraRelative))) ===
              canonicalJsonDigest(closedImageIdentity(mastraImage)),
            'Mastra source changed after capture',
          );
        },
      });
      capabilities.set(capability, {
        assertGateActive: () => gate.assertActive(),
        repositoryIdentity,
        hostRelative: input.hostRelative,
        mastraRelative: input.mastraRelative,
      });
      try {
        capability.assertActive();
        capability.assertSourcesUnchanged();
        return await input.operation(capability);
      } finally {
        active = false;
        capabilities.delete(capability);
      }
    },
  );
}

/** Internal guard for the upgrade coordinator before it journals/stages the exact unified image. */
export function assertExistingStorageMergeCapability(value: unknown): asserts value is ExistingStorageMergeCapability {
  requireAdmission(value !== null && typeof value === 'object', 'merge capability required');
  const state = capabilities.get(value);
  requireAdmission(state !== undefined, 'merge capability was not minted by the Host fence owner');
  state.assertGateActive();
}
