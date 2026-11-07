import type { Database } from 'bun:sqlite';
import path from 'node:path';
import { canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import { canonicalJsonImageWithNodeLimit, MAX_CANONICAL_NODES } from '../contracts/canonical-json-core.js';
import {
  HostStateStore,
  type MaintenanceFence,
  type MaintenanceFenceBinding,
  type MaintenanceFenceReceipt,
} from '../host-state.js';
import { closeWorkspaceWorkflowClients } from '../orchestration/bun-sqlite-client.js';
import { requireSafeRepositoryAccess } from './safe-repository-access.js';
import {
  assertWorkspaceDatabaseRelativePath,
  openUnadmittedWorkspaceDatabase,
  workspaceDatabaseFileIdentity,
  withWorkspaceDatabaseClose,
} from './workspace-database-raw.js';
import {
  acquireStorageReadAdmission,
  assertInitConfigAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithCleanInitializationIntent,
  withExclusiveStorageInitConfigAdmission,
  type JoinedInitConfigAdmissionProof,
} from './storage-read-admission.js';

const label = 'Clean initialization Host admission';

function requireAdmission(value: unknown, message: string): asserts value {
  if (!value) throw new Error(label + ': ' + message);
}

export interface CleanInitializationHostAdmissionCapability {
  readonly schema: 'VidaCleanInitializationHostAdmission/v1';
}

export interface CleanInitializationHostAdmissionRequest<T> {
  readonly repositoryRoot: string;
  readonly workspaceId: string;
  readonly operationId: string;
  readonly expectedFenceBinding: MaintenanceFenceBinding;
  readonly receipt: MaintenanceFenceReceipt;
  readonly hostRelative: string;
  readonly workflowRelative: string;
  readonly expectedPendingBytes?: Uint8Array;
  /** Closes this caller's exact Host owner after its receipt has been verified. */
  readonly closeHostOwner: () => void;
  readonly operation: (
    capability: CleanInitializationHostAdmissionCapability,
    proof: JoinedInitConfigAdmissionProof<MaintenanceFence>,
  ) => Promise<T>;
}

interface CapabilityState {
  readonly repositoryRoot: string;
  readonly repositoryIdentity: string;
  readonly workspaceId: string;
  readonly operationId: string;
  readonly hostRelative: string;
  readonly workflowRelative: string;
  readonly rootAccess: ReturnType<typeof requireSafeRepositoryAccess>;
  readonly hostPathIdentity: string;
  readonly assertGateActive: () => void;
  active: boolean;
}

const capabilities = new WeakMap<object, CapabilityState>();

function snapshotBinding(binding: MaintenanceFenceBinding): MaintenanceFenceBinding {
  return freezeJsonValue(
    canonicalJsonImageWithNodeLimit(binding, 0, MAX_CANONICAL_NODES).image as MaintenanceFenceBinding,
  );
}

function observeHostPathIdentity(access: ReturnType<typeof requireSafeRepositoryAccess>, relative: string): string {
  requireAdmission(typeof access.observeFileIdentity === 'function', 'native Host identity observation is unavailable');
  return access.observeFileIdentity(relative, label);
}

function validateRequest<T>(request: CleanInitializationHostAdmissionRequest<T>) {
  let input = Object.freeze({ ...request });
  requireAdmission(
    typeof input.repositoryRoot === 'string' &&
      input.repositoryRoot.length > 0 &&
      path.resolve(input.repositoryRoot) === input.repositoryRoot,
    'repository root must be canonical',
  );
  requireAdmission(/^[a-f0-9]{64}$/u.test(input.workspaceId), 'workspace digest is invalid');
  requireAdmission(/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(input.operationId), 'operation id is invalid');
  assertWorkspaceDatabaseRelativePath(input.hostRelative);
  assertWorkspaceDatabaseRelativePath(input.workflowRelative);
  requireAdmission(input.hostRelative !== input.workflowRelative, 'Host and workflow paths collide');
  requireAdmission(typeof input.closeHostOwner === 'function', 'exact Host owner close callback is required');
  requireAdmission(typeof input.operation === 'function', 'admitted operation callback is required');
  if (input.expectedPendingBytes !== undefined) {
    requireAdmission(
      input.expectedPendingBytes instanceof Uint8Array && input.expectedPendingBytes.byteLength > 0,
      'exact pending intent bytes are invalid',
    );
    input = Object.freeze({ ...input, expectedPendingBytes: Buffer.from(input.expectedPendingBytes) });
  }
  requireAdmission(
    input.expectedFenceBinding.operation_id === input.operationId,
    'expected fence binding operation differs',
  );
  const expectedFenceBinding = snapshotBinding(input.expectedFenceBinding);
  const expectedFenceBindingDigest = canonicalJsonDigest(expectedFenceBinding);
  // Keep the opaque receipt reference intact for HostStateStore's native token verification.
  input = Object.freeze({ ...input, expectedFenceBinding });
  return { input, expectedFenceBindingDigest };
}

function verifyCurrentFence(
  database: Database,
  input: ReturnType<typeof validateRequest>['input'],
  expectedFenceBindingDigest: string,
) {
  const store = new HostStateStore(
    database,
    input.workspaceId,
    undefined,
    undefined,
    undefined,
    {
      principal: 'vida:clean-initialization-admission-verifier',
      projectIds: input.expectedFenceBinding.project_ids,
      verify: () => null,
    },
    input.repositoryRoot,
  );
  const fence = store.assertMaintenanceFence(input.receipt);
  requireAdmission(fence.status === 'held', 'Host maintenance fence is not held');
  requireAdmission(fence.workspace_id === input.workspaceId, 'held Host fence workspace differs');
  requireAdmission(fence.binding.operation_id === input.operationId, 'held Host fence operation differs');
  requireAdmission(
    canonicalJsonDigest(fence.binding) === expectedFenceBindingDigest,
    'held Host fence binding differs',
  );
  requireAdmission(fence.generation === input.receipt.fence.generation, 'held Host fence generation differs');
  requireAdmission(fence.revision === input.receipt.fence.revision, 'held Host fence revision differs');
  requireAdmission(fence.token_digest === input.receipt.fence.token_digest, 'held Host token identity differs');
  return fence;
}

export function assertCleanInitializationHostAdmission(
  capability: CleanInitializationHostAdmissionCapability,
  repositoryRoot: string,
  workspaceId: string,
  operationId: string,
): void {
  const state = capabilities.get(capability);
  requireAdmission(state !== undefined, 'capability is forged or expired');
  requireAdmission(state.active, 'callback capability expired');
  requireAdmission(repositoryRoot === state.repositoryRoot, 'repository root binding differs');
  requireAdmission(workspaceId === state.workspaceId, 'workspace binding differs');
  requireAdmission(operationId === state.operationId, 'operation binding differs');
  state.assertGateActive();
  requireAdmission(
    state.rootAccess.directoryIdentity('.', label) === state.repositoryIdentity,
    'repository root was replaced',
  );
  requireAdmission(
    observeHostPathIdentity(state.rootAccess, state.hostRelative) === state.hostPathIdentity,
    'Host source identity changed during callback',
  );
}

export async function withCleanInitializationHostAdmission<T>(
  request: CleanInitializationHostAdmissionRequest<T>,
): Promise<T> {
  const { input, expectedFenceBindingDigest } = validateRequest(request);
  const rootAccess = requireSafeRepositoryAccess(input.repositoryRoot);
  const repositoryIdentity = rootAccess.directoryIdentity('.', label);

  const admission = acquireStorageReadAdmission(input.repositoryRoot, input.workspaceId, input.hostRelative);
  const initialHost =
    input.expectedPendingBytes === undefined
      ? openExistingWorkspaceDatabaseWithAdmission(input.repositoryRoot, input.hostRelative, admission, false, false)
      : openExistingWorkspaceDatabaseWithCleanInitializationIntent(
          input.repositoryRoot,
          input.hostRelative,
          admission,
          input.operationId,
          input.expectedPendingBytes,
        );
  const callerHostProof = withWorkspaceDatabaseClose(
    initialHost,
    () => ({
      fence: verifyCurrentFence(initialHost, input, expectedFenceBindingDigest),
      databaseIdentity: workspaceDatabaseFileIdentity(initialHost),
      pathIdentity: observeHostPathIdentity(rootAccess, input.hostRelative),
    }),
    closeWorkspaceDatabaseWithAdmission,
    'Host fence verification and paired close failed',
  );

  requireAdmission(
    rootAccess.directoryIdentity('.', label) === repositoryIdentity,
    'repository root changed during caller Host verification',
  );
  closeWorkspaceWorkflowClients(input.repositoryRoot, input.workflowRelative);
  input.closeHostOwner();

  return withExclusiveStorageInitConfigAdmission(
    input.repositoryRoot,
    input.workspaceId,
    (sourceOwner) => {
      const host = openUnadmittedWorkspaceDatabase(
        input.repositoryRoot,
        input.hostRelative,
        false,
        false,
        sourceOwner.captureSource,
      );
      return withWorkspaceDatabaseClose(
        host,
        () => {
          const databaseIdentity = workspaceDatabaseFileIdentity(host);
          requireAdmission(
            databaseIdentity.dev === callerHostProof.databaseIdentity.dev &&
              databaseIdentity.ino === callerHostProof.databaseIdentity.ino,
            'Host source identity changed before exclusive admission',
          );
          requireAdmission(
            observeHostPathIdentity(rootAccess, input.hostRelative) === callerHostProof.pathIdentity,
            'Host path identity changed before exclusive admission',
          );
          const fence = verifyCurrentFence(host, input, expectedFenceBindingDigest);
          requireAdmission(
            rootAccess.directoryIdentity('.', label) === repositoryIdentity,
            'repository root changed during exclusive Host verification',
          );
          return fence;
        },
        sourceOwner.closeSource,
        'exclusive Host fence verification and close failed',
      );
    },
    async (proof: JoinedInitConfigAdmissionProof<ReturnType<typeof verifyCurrentFence>>) => {
      assertInitConfigAdmission(proof, input.repositoryRoot, input.workspaceId);
      requireAdmission(proof.fence.status === 'held', 'exclusive Host fence is not held');
      requireAdmission(proof.fence.workspace_id === input.workspaceId, 'exclusive Host workspace differs');
      requireAdmission(proof.fence.binding.operation_id === input.operationId, 'exclusive Host operation differs');
      requireAdmission(
        canonicalJsonDigest(proof.fence.binding) === expectedFenceBindingDigest,
        'exclusive Host fence binding differs',
      );
      const capability: CleanInitializationHostAdmissionCapability = Object.freeze({
        schema: 'VidaCleanInitializationHostAdmission/v1',
      });
      const state: CapabilityState = {
        repositoryRoot: input.repositoryRoot,
        repositoryIdentity,
        workspaceId: input.workspaceId,
        operationId: input.operationId,
        hostRelative: input.hostRelative,
        workflowRelative: input.workflowRelative,
        rootAccess,
        hostPathIdentity: callerHostProof.pathIdentity,
        assertGateActive: () => assertInitConfigAdmission(proof, input.repositoryRoot, input.workspaceId),
        active: true,
      };
      capabilities.set(capability, state);
      try {
        assertCleanInitializationHostAdmission(capability, input.repositoryRoot, input.workspaceId, input.operationId);
        return await input.operation(capability, proof);
      } finally {
        state.active = false;
        capabilities.delete(capability);
      }
    },
  );
}
