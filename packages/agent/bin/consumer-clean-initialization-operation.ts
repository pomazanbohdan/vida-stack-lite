import { createHash, randomUUID } from 'node:crypto';
import { lstatSync } from 'node:fs';
import type { Database } from 'bun:sqlite';
import path from 'node:path';
import { canonicalJsonDigest, freezeJsonValue } from '../src/contracts/public-ingress.js';
import { canonicalJsonImageWithNodeLimit, MAX_CANONICAL_NODES } from '../src/contracts/canonical-json-core.js';
import {
  HostStateStore,
  type MaintenanceFenceBinding,
  type MaintenanceFence,
  type MaintenanceFenceReceipt,
  type MaintenanceReleaseVerifier,
} from '../src/host-state.js';
import {
  CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
  sessionBridgeDatabaseRelativePath,
  sessionHandoffDatabaseRelativePath,
} from '../src/config/project-paths.js';
import {
  acquireStorageReadAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithCleanInitializationIntent,
  withCleanInitializationPublicationLocks,
  withExclusiveInitConfigAdmission,
  type JoinedInitConfigAdmissionProof,
} from '../src/config/storage-read-admission.js';
import {
  assertWorkspaceDatabaseRelativePath,
  openUnadmittedWorkspaceDatabase,
  withWorkspaceDatabaseCloseAsync,
} from '../src/config/workspace-database-raw.js';
import { requireSafeRepositoryAccess, repositoryReadOnlyObservation } from '../src/config/safe-repository-access.js';
import {
  parseRuntimeConfigYaml,
  readRuntimeConfigurationForObservation,
  type AgentRuntimeConfig,
} from '../src/config/runtime-config.js';
import { deriveWorkspaceId, canonicalRepositoryRoot } from '../src/workspace-identity.js';
import {
  assertCleanInitializationHostAdmission,
  withCleanInitializationHostAdmission,
  type CleanInitializationHostAdmissionCapability,
} from '../src/config/clean-initialization-admission.js';
import {
  captureInitializationRuntimeBinding,
  finishPreparedInitializationUnderAdmission,
  prepareInitializationUnderAdmission,
  type PreparedInitialization,
} from './init-core.ts';
import {
  captureConsumerCleanInitializationV2,
  consumerCleanInitializationProtectedPaths,
} from './consumer-clean-initialization-capture.ts';
import {
  decodeCleanInitializationOperationV2,
  validateCleanInitializationOperationV2,
  type ConsumerCleanInitializationOperationV2,
} from './consumer-clean-initialization-v2.ts';
import { projectMappings } from './project-mapping-contract.ts';

const label = 'Clean initialization operation';
const maxPendingBytes = 8 * 1024 * 1024;
const fixedPrincipal = 'vida-agent:consumer-clean-initialization-v2';
const tokenDomain = 'vida-agent:consumer-clean-initialization-v2:recovery-token:v1';

function reportCleanInitializationPhase(phase: string, startedAt: number): void {
  if (process.env.VIDA_CLEAN_INIT_PHASE_TIMING === '1')
    console.error(
      'C3 clean-init phase',
      JSON.stringify({ phase, elapsed_ms: Number((performance.now() - startedAt).toFixed(2)) }),
    );
}

type CleanInitializationRequest = Parameters<typeof captureConsumerCleanInitializationV2>[0];
type AcquiredOperationInput = {
  readonly repositoryRoot: string;
  readonly operationId: string;
};

export interface ConsumerCleanInitializationExpectedState {
  readonly pending_sha256: string | null;
}

export interface ConsumerCleanInitializationAuthorization {
  readonly action: 'apply' | 'resume' | 'retire';
  readonly operation_id: string;
  readonly plan_binding: string;
}

export interface ConsumerCleanInitializationInspection {
  readonly status: 'absent' | 'planned' | 'needs_reconciliation' | 'complete';
  readonly operation: ConsumerCleanInitializationOperationV2 | null;
  readonly plan_binding: string | null;
  readonly expectedState: ConsumerCleanInitializationExpectedState;
}

function requireOperation(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(label + ': ' + message);
}

function captureRequest(value: unknown): CleanInitializationRequest {
  const image = canonicalJsonImageWithNodeLimit(value, 0, MAX_CANONICAL_NODES).image as Record<string, unknown>;
  requireOperation(
    image !== null &&
      typeof image === 'object' &&
      !Array.isArray(image) &&
      Object.keys(image).length === 3 &&
      typeof image.projectRoot === 'string' &&
      typeof image.repository === 'string' &&
      Array.isArray(image.projectMappings) &&
      image.projectMappings.every((mapping) => typeof mapping === 'string'),
    'request shape is invalid',
  );
  return freezeJsonValue(image) as CleanInitializationRequest;
}

function canonicalBytes(operation: ConsumerCleanInitializationOperationV2): Buffer {
  return Buffer.from(canonicalJsonImageWithNodeLimit(operation, 0, MAX_CANONICAL_NODES).json, 'utf8');
}

function readPending(
  root: string,
): { readonly bytes: Buffer; readonly operation: ConsumerCleanInitializationOperationV2 } | null {
  const access = requireSafeRepositoryAccess(root);
  const view = repositoryReadOnlyObservation(access);
  if (!view.fileExists(CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH, label)) return null;
  const identify = view.observeFileIdentity ?? access.observeFileIdentity;
  const capture = access.readVerifiedCaptureBytes;
  requireOperation(identify !== undefined && capture !== undefined, 'native pending-byte observation is unavailable');
  const rootIdentity = access.directoryIdentity('.', label);
  const parentIdentity = access.directoryIdentity('.agent', label);
  const before = identify(CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH, label);
  const bytes = Buffer.from(capture(CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH, label, maxPendingBytes));
  requireOperation(bytes.byteLength <= maxPendingBytes, 'pending operation exceeds the byte limit');
  requireOperation(
    identify(CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH, label) === before &&
      access.directoryIdentity('.agent', label) === parentIdentity &&
      access.directoryIdentity('.', label) === rootIdentity,
    'pending operation identity changed during capture',
  );
  return { bytes, operation: decodeCleanInitializationOperationV2(bytes) };
}

function assertExactPending(root: string, expected: Uint8Array): ConsumerCleanInitializationOperationV2 {
  const current = readPending(root);
  requireOperation(current !== null && current.bytes.equals(Buffer.from(expected)), 'exact pending bytes changed');
  return current.operation;
}

function assertFileObservation(root: string, entry: ConsumerCleanInitializationOperationV2['inventory'][number]): void {
  const access = requireSafeRepositoryAccess(root);
  const identify = access.observeFileIdentity;
  const capture = access.readVerifiedCaptureBytes;
  requireOperation(identify !== undefined && capture !== undefined, 'native file observation is unavailable');
  const parent = path.posix.dirname(entry.path);
  const parentIdentity = access.directoryIdentity(parent, 'clean initialization input parent');
  const identity = identify(entry.path, 'clean initialization input');
  const before = lstatSync(path.join(root, ...entry.path.split('/')), { bigint: true });
  requireOperation(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n, 'input is not a private file');
  const bytes = capture(entry.path, 'clean initialization input', maxPendingBytes);
  const after = lstatSync(path.join(root, ...entry.path.split('/')), { bigint: true });
  requireOperation(
    after.isFile() &&
      !after.isSymbolicLink() &&
      after.nlink === 1n &&
      identity === entry.identity &&
      identify(entry.path, 'clean initialization input') === entry.identity &&
      bytes.byteLength === entry.size &&
      createHash('sha256').update(bytes).digest('hex') === entry.sha256 &&
      before.dev === after.dev &&
      before.ino === after.ino &&
      before.size === after.size &&
      access.directoryIdentity(parent, 'clean initialization input parent') === parentIdentity,
    'input file identity or bytes changed',
  );
}

function assertFileObservationAt(
  root: string,
  relative: string,
  expected: ConsumerCleanInitializationOperationV2['inventory'][number],
): Buffer {
  const access = requireSafeRepositoryAccess(root);
  const identify = access.observeReadOnlyFileIdentity ?? access.observeFileIdentity;
  const capture = access.readVerifiedCaptureBytes;
  requireOperation(identify !== undefined && capture !== undefined, 'native file observation is unavailable');
  const parent = path.posix.dirname(relative);
  const parentIdentity = access.directoryIdentity(parent, 'clean initialization file parent');
  const identity = identify(relative, 'clean initialization file');
  const before = lstatSync(path.join(root, ...relative.split('/')), { bigint: true });
  requireOperation(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n, 'file is not private');
  const bytes = Buffer.from(capture(relative, 'clean initialization file', maxPendingBytes));
  const after = lstatSync(path.join(root, ...relative.split('/')), { bigint: true });
  requireOperation(
    after.isFile() &&
      !after.isSymbolicLink() &&
      after.nlink === 1n &&
      identity === expected.identity &&
      identify(relative, 'clean initialization file') === expected.identity &&
      bytes.byteLength === expected.size &&
      createHash('sha256').update(bytes).digest('hex') === expected.sha256 &&
      before.dev === after.dev &&
      before.ino === after.ino &&
      before.size === after.size &&
      access.directoryIdentity(parent, 'clean initialization file parent') === parentIdentity,
    'file identity or bytes changed',
  );
  return bytes;
}

function operationConfig(root: string, operation: ConsumerCleanInitializationOperationV2): AgentRuntimeConfig {
  const access = requireSafeRepositoryAccess(root);
  const move = operation.moves.find((entry) => entry.source === 'agent-runtime.config.v1.yaml');
  const original = operation.inventory.find((entry) => entry.path === 'agent-runtime.config.v1.yaml');
  if (move && original && move.state === 'completed') {
    const bytes = assertFileObservationAt(root, move.target, original);
    return parseArchivedRuntimeConfig(bytes);
  }
  if (
    move &&
    original &&
    move.state === 'issued' &&
    !pathEntryExists(root, move.source) &&
    pathEntryExists(root, move.target)
  ) {
    const bytes = assertFileObservationAt(root, move.target, original);
    return parseArchivedRuntimeConfig(bytes);
  }
  if (access.fileExists('agent-runtime.config.v1.yaml', label))
    return readRuntimeConfigurationForObservation(root).config;
  requireOperation(false, 'original runtime configuration is neither present nor verified in the archive');
}

function parseArchivedRuntimeConfig(bytes: Uint8Array): AgentRuntimeConfig {
  const raw = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  requireOperation(
    Buffer.from(raw, 'utf8').equals(Buffer.from(bytes)),
    'archived runtime config is not canonical UTF-8',
  );
  return parseRuntimeConfigYaml(raw);
}

function assertCurrentOperation(
  root: string,
  operation: ConsumerCleanInitializationOperationV2,
  expectedBytes?: Uint8Array,
): { readonly config: AgentRuntimeConfig; readonly mappings: readonly { id: string; root: string }[] } {
  requireOperation(path.isAbsolute(root) && path.resolve(root) === root, 'repository root must be canonical');
  requireOperation(canonicalRepositoryRoot(root) === root, 'repository root is not the captured physical root');
  const access = requireSafeRepositoryAccess(root);
  requireOperation(
    access.directoryIdentity('.', label) === operation.root_identity,
    'repository root identity differs',
  );
  requireOperation(operation.root === root, 'operation root differs');
  requireOperation(
    deriveWorkspaceId(operation.request.repository, root) === operation.workspace_id,
    'operation workspace differs',
  );
  if (expectedBytes !== undefined) {
    const current = assertExactPending(root, expectedBytes);
    requireOperation(
      current.operation_id === operation.operation_id && current.binding === operation.binding,
      'pending operation binding differs',
    );
  }
  const runtime = captureInitializationRuntimeBinding();
  requireOperation(canonicalJsonDigest(runtime) === canonicalJsonDigest(operation.runtime), 'runtime identity differs');
  const config = operationConfig(root, operation);
  requireOperation(
    config.repository.repository_id === operation.request.repository,
    'validated repository config differs',
  );
  const mappings = projectMappings(operation.request.projectMappings);
  for (const mapping of mappings) {
    const current = config.projects.find((project) => project.project_id === mapping.id);
    requireOperation(
      current !== undefined && current.project_root === mapping.root,
      'validated project mapping differs',
    );
    access.directoryIdentity(mapping.root, 'clean initialization project mapping');
  }
  const configuredProtection = consumerCleanInitializationProtectedPaths(config);
  requireOperation(
    configuredProtection.every((relative) => operation.protected_paths.includes(relative)),
    'current configured protection exceeds the captured union',
  );
  if (operation.phase === 'intent' && operation.prepared === null && operation.initialization === 'not-started') {
    for (const entry of [...operation.inventory, ...operation.preserved]) assertFileObservation(root, entry);
  }
  return { config, mappings };
}

function projectMappingTuples(
  root: string,
  config: AgentRuntimeConfig,
  mappings: readonly { id: string; root: string }[],
  operation: ConsumerCleanInitializationOperationV2,
): { readonly projectIds: string[]; readonly tuples: readonly (readonly [string, string, string])[] } {
  const access = requireSafeRepositoryAccess(root);
  const mappingById = new Map(mappings.map((entry) => [entry.id, entry.root]));
  const projectIds = [
    ...new Set([...config.projects.map((project) => project.project_id), ...mappings.map((entry) => entry.id)]),
  ].sort();
  const tuples = projectIds.map((projectId) => {
    const project = config.projects.find((entry) => entry.project_id === projectId);
    requireOperation(project !== undefined, 'current project mapping is missing');
    const requestedRoot = mappingById.get(projectId);
    const relative = requestedRoot ?? project.project_root;
    requireOperation(relative === project.project_root, 'current project mapping tuple differs');
    return [projectId, relative, access.directoryIdentity(relative, 'clean initialization project identity')] as const;
  });
  requireOperation(
    operation.request.repository === config.repository.repository_id,
    'project repository identity differs',
  );
  return { projectIds, tuples };
}

function maintenanceBinding(
  root: string,
  operation: ConsumerCleanInitializationOperationV2,
  config: AgentRuntimeConfig,
  mappings: readonly { id: string; root: string }[],
): MaintenanceFenceBinding {
  const { projectIds, tuples } = projectMappingTuples(root, config, mappings, operation);
  const binding = {
    schema: 'MaintenanceFenceBinding/v1' as const,
    project_ids: projectIds,
    operation_id: operation.operation_id,
    manifest_digest: operation.binding,
    request_digest: canonicalJsonDigest(operation.request),
    bindings_digest: canonicalJsonDigest({
      root: operation.root,
      root_identity: operation.root_identity,
      workspace_id: operation.workspace_id,
      repository_id: operation.request.repository,
      mappings: tuples,
      runtime: operation.runtime,
      protected_paths: operation.protected_paths,
    }),
    closure_digest: canonicalJsonDigest({
      operation_id: operation.operation_id,
      immutable_binding: operation.binding,
      root_identity: operation.root_identity,
      workspace_id: operation.workspace_id,
      closure:
        'v2 archive and prepared initialization advance only through exact pending-byte CAS; release requires verified completed initialization and preserved current state',
      accepted_phase: ['intent', 'archiving', 'archive_complete', 'initializing', 'complete'],
      accepted_initialization: ['not-started', 'issued', 'completed'],
    }),
    bundle_digest: canonicalJsonDigest(operation.runtime),
  };
  return freezeJsonValue(binding) as MaintenanceFenceBinding;
}

/** Cooperative recovery material only; native Host state remains the authorization boundary. */
function recoveryToken(operation: ConsumerCleanInitializationOperationV2): string {
  const input = canonicalJsonImageWithNodeLimit(
    {
      domain: tokenDomain,
      operation_id: operation.operation_id,
      immutable_binding: operation.binding,
      root_identity: operation.root_identity,
      workspace_id: operation.workspace_id,
    },
    0,
    MAX_CANONICAL_NODES,
  ).json;
  const hex = createHash('sha256')
    .update(tokenDomain + '\0')
    .update(input, 'utf8')
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Private fixed-principal verifier. Release stays denied until a later terminal unit owns closure proof. */
function createAcquisitionVerifier(
  root: string,
  operation: ConsumerCleanInitializationOperationV2,
  pendingBytes: Uint8Array,
  expectedBinding: MaintenanceFenceBinding,
): MaintenanceReleaseVerifier {
  const expectedDigest = canonicalJsonDigest(expectedBinding);
  return Object.freeze<MaintenanceReleaseVerifier>({
    principal: fixedPrincipal,
    projectIds: expectedBinding.project_ids,
    verify: () => null,
    verifyAcquisition(binding, prior) {
      requireOperation(canonicalJsonDigest(binding) === expectedDigest, 'native acquisition binding differs');
      const current = assertExactPending(root, pendingBytes);
      requireOperation(
        current.binding === operation.binding && current.operation_id === operation.operation_id,
        'native acquisition pending operation differs',
      );
      requireOperation(
        current.operation_id === operation.operation_id && current.binding === operation.binding,
        'native acquisition pending operation differs',
      );
      const currentContext = assertCurrentOperation(root, current, pendingBytes);
      const recalculated = maintenanceBinding(root, current, currentContext.config, currentContext.mappings);
      requireOperation(canonicalJsonDigest(recalculated) === expectedDigest, 'native acquisition identities changed');
      if (prior?.status === 'held') {
        requireOperation(
          canonicalJsonDigest(prior.binding) === expectedDigest,
          'foreign held maintenance fence refuses acquisition',
        );
        requireOperation(
          prior.binding.operation_id === current.operation_id,
          'held maintenance fence operation differs',
        );
      } else {
        requireOperation(
          prior?.status !== 'released' || prior.binding.operation_id !== current.operation_id,
          'released operation cannot reacquire a maintenance fence',
        );
        requireOperation(
          current.phase === 'intent' && current.prepared === null && current.initialization === 'not-started',
          'only a pristine intent can create a new maintenance fence',
        );
      }
    },
  });
}

function acquireFence(
  root: string,
  operation: ConsumerCleanInitializationOperationV2,
  pendingBytes: Uint8Array,
  config: AgentRuntimeConfig,
  mappings: readonly { id: string; root: string }[],
): {
  readonly receipt: MaintenanceFenceReceipt;
  readonly host: Database;
  readonly hostRelative: string;
  readonly workflowRelative: string;
} {
  const binding = maintenanceBinding(root, operation, config, mappings);
  const token = recoveryToken(operation);
  const hostRelative = sessionHandoffDatabaseRelativePath(config);
  const workflowRelative = sessionBridgeDatabaseRelativePath(config);
  assertWorkspaceDatabaseRelativePath(hostRelative);
  assertWorkspaceDatabaseRelativePath(workflowRelative);
  requireOperation(hostRelative !== workflowRelative, 'Host and workflow database paths collide');
  const admission = acquireStorageReadAdmission(root, operation.workspace_id, hostRelative);
  let host: Database | undefined;
  try {
    host = openExistingWorkspaceDatabaseWithCleanInitializationIntent(
      root,
      hostRelative,
      admission,
      operation.operation_id,
      pendingBytes,
    );
    const verifier = createAcquisitionVerifier(root, operation, pendingBytes, binding);
    const store = new HostStateStore(host, operation.workspace_id, undefined, undefined, undefined, verifier, root);
    const receipt = store.acquireMaintenanceFenceWithRecordedToken(binding, token);
    requireOperation(receipt.fence.status === 'held', 'Host did not return a held maintenance fence');
    return { receipt, host, hostRelative, workflowRelative };
  } catch (error) {
    if (host) {
      try {
        closeWorkspaceDatabaseWithAdmission(host);
      } catch (closeError) {
        throw new AggregateError([error, closeError], label + ': Host acquisition and close failed');
      }
    } else {
      try {
        admission.close();
      } catch (closeError) {
        throw new AggregateError([error, closeError], label + ': admission open and close failed');
      }
    }
    throw error;
  }
}

/** Publish exact strict v2 bytes with the existing exclusive init/config and receipt-lock CAS owners. */
export async function publishConsumerCleanInitializationIntent(input: CleanInitializationRequest): Promise<string> {
  const request = captureRequest(input);
  const root = canonicalRepositoryRoot(request.projectRoot);
  requireOperation(root === request.projectRoot, 'project root must be canonical and physical');
  const workspaceId = deriveWorkspaceId(request.repository, root);
  const operationId = randomUUID();
  await withExclusiveInitConfigAdmission(root, workspaceId, async (proof) => {
    await withCleanInitializationPublicationLocks(proof, root, workspaceId, async () => {
      const captured = captureConsumerCleanInitializationV2(request, operationId);
      requireOperation(
        captured.root === root && captured.workspace_id === workspaceId,
        'captured root or workspace identity differs',
      );
      const expectedBytes = canonicalBytes(captured);
      const access = requireSafeRepositoryAccess(root);
      await access.writeExclusiveAsync(
        CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
        expectedBytes.toString('utf8'),
        'clean initialization pending intent',
      );
      const published = readPending(root);
      requireOperation(published !== null && published.bytes.equals(expectedBytes), 'published intent bytes differ');
      requireOperation(
        published.operation.binding === captured.binding && published.operation.operation_id === operationId,
        'published intent identity differs',
      );
    });
  });
  return operationId;
}

/** Read and validate one current v2 intent. This operation never mutates or recovers it. */
export function inspectConsumerCleanInitializationIntent(
  repositoryRoot: string,
): ConsumerCleanInitializationOperationV2 | null {
  requireOperation(
    typeof repositoryRoot === 'string' &&
      path.isAbsolute(repositoryRoot) &&
      path.resolve(repositoryRoot) === repositoryRoot,
    'inspection root must be canonical',
  );
  const pending = readPending(repositoryRoot);
  if (!pending) return null;
  assertCurrentOperation(repositoryRoot, pending.operation);
  return pending.operation;
}

/** Read-only capture for a reviewed exact v2 plan; this never publishes pending state. */
export function planConsumerCleanInitialization(
  input: CleanInitializationRequest,
  operationId = randomUUID(),
): {
  readonly status: 'planned';
  readonly operation: ConsumerCleanInitializationOperationV2;
  readonly expectedState: ConsumerCleanInitializationExpectedState;
} {
  const request = captureRequest(input);
  requireOperation(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(operationId),
    'plan operation identity is invalid',
  );
  const operation = captureConsumerCleanInitializationV2(request, operationId);
  return freezeJsonValue({
    status: 'planned' as const,
    operation,
    expectedState: { pending_sha256: null },
  });
}

/** Current native pending bytes and immutable binding; no recovery or Host mutation. */
export function inspectConsumerCleanInitialization(repositoryRoot: string): ConsumerCleanInitializationInspection {
  requireOperation(
    typeof repositoryRoot === 'string' &&
      path.isAbsolute(repositoryRoot) &&
      path.resolve(repositoryRoot) === repositoryRoot,
    'inspection root must be canonical',
  );
  const pending = readPending(repositoryRoot);
  if (pending === null)
    return freezeJsonValue({
      status: 'absent' as const,
      operation: null,
      plan_binding: null,
      expectedState: { pending_sha256: null },
    });
  assertCurrentOperation(repositoryRoot, pending.operation);
  const pristineIntent =
    pending.operation.phase === 'intent' &&
    pending.operation.prepared === null &&
    pending.operation.initialization === 'not-started' &&
    [...pending.operation.moves, ...pending.operation.containers].every((effect) => effect.state === 'not-started');
  const terminalReleased =
    pending.operation.phase === 'complete' && observeReleasedFence(repositoryRoot, pending.operation, pending.bytes);
  const status =
    pending.operation.phase === 'complete'
      ? terminalReleased
        ? 'complete'
        : 'needs_reconciliation'
      : pristineIntent
        ? 'planned'
        : 'needs_reconciliation';
  return freezeJsonValue({
    status,
    operation: pending.operation,
    plan_binding: pending.operation.binding,
    expectedState: { pending_sha256: createHash('sha256').update(pending.bytes).digest('hex') },
  });
}

/** Validate exact local intent and absence token before pending publication. */
export async function publishReviewedConsumerCleanInitialization(input: {
  readonly operation: ConsumerCleanInitializationOperationV2;
  readonly expectedState: ConsumerCleanInitializationExpectedState;
  readonly authorization: ConsumerCleanInitializationAuthorization;
}): Promise<ConsumerCleanInitializationInspection> {
  const request = canonicalJsonImageWithNodeLimit(input, 0, MAX_CANONICAL_NODES).image as typeof input;
  requireOperation(
    request !== null &&
      typeof request === 'object' &&
      Object.keys(request).length === 3 &&
      request.expectedState !== null &&
      typeof request.expectedState === 'object' &&
      Object.keys(request.expectedState).length === 1 &&
      request.expectedState.pending_sha256 === null &&
      request.authorization !== null &&
      typeof request.authorization === 'object' &&
      Object.keys(request.authorization).length === 3 &&
      request.authorization.action === 'apply' &&
      request.operation?.operation_id === request.authorization.operation_id &&
      request.operation?.binding === request.authorization.plan_binding,
    'reviewed plan authorization or expected state is invalid',
  );
  const operation = validateCleanInitializationOperationV2(request.operation);
  requireOperation(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(operation.operation_id) &&
      operation.phase === 'intent' &&
      operation.prepared === null &&
      operation.initialization === 'not-started' &&
      [...operation.moves, ...operation.containers].every((effect) => effect.state === 'not-started'),
    'reviewed plan is not a pristine initial v2 operation',
  );
  const root = operation.root;
  await withExclusiveInitConfigAdmission(root, operation.workspace_id, async (proof) => {
    await withCleanInitializationPublicationLocks(proof, root, operation.workspace_id, async () => {
      requireOperation(readPending(root) === null, 'pending initialization state is not absent');
      const current = captureConsumerCleanInitializationV2(
        operation.request,
        operation.operation_id as `${string}-${string}-${string}-${string}-${string}`,
      );
      requireOperation(
        canonicalBytes(current).equals(canonicalBytes(operation)),
        'reviewed plan no longer matches current inputs',
      );
      const next = canonicalBytes(operation);
      const access = requireSafeRepositoryAccess(root);
      await access.writeExclusiveAsync(
        CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
        next.toString('utf8'),
        'reviewed clean initialization pending barrier',
      );
      const published = readPending(root);
      requireOperation(published !== null && published.bytes.equals(next), 'published pending bytes differ');
    });
  });
  return inspectConsumerCleanInitialization(root);
}

/** Acquire or reattach only the exact published intent; release authority never escapes this callback. */
export async function withAcquiredConsumerCleanInitialization<T>(
  input: AcquiredOperationInput,
  operationCallback: (
    operation: ConsumerCleanInitializationOperationV2,
    capability: CleanInitializationHostAdmissionCapability,
    proof: JoinedInitConfigAdmissionProof<MaintenanceFence>,
    pendingBytes: Uint8Array,
    receipt: MaintenanceFenceReceipt,
  ) => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  const request = canonicalJsonImageWithNodeLimit(input, 0, MAX_CANONICAL_NODES).image as AcquiredOperationInput;
  requireOperation(
    request !== null &&
      typeof request === 'object' &&
      Object.keys(request).length === 2 &&
      typeof request.repositoryRoot === 'string' &&
      path.isAbsolute(request.repositoryRoot) &&
      path.resolve(request.repositoryRoot) === request.repositoryRoot &&
      typeof request.operationId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(request.operationId),
    'acquisition request is invalid',
  );
  requireOperation(typeof operationCallback === 'function', 'callback is required');
  const pending = readPending(request.repositoryRoot);
  reportCleanInitializationPhase('acquire-pending-read', startedAt);
  requireOperation(pending !== null, 'published intent is missing');
  requireOperation(
    pending.operation.operation_id === request.operationId,
    'requested operation differs from pending intent',
  );
  const context = assertCurrentOperation(request.repositoryRoot, pending.operation, pending.bytes);
  reportCleanInitializationPhase('acquire-current-validation', startedAt);
  const acquired = acquireFence(
    request.repositoryRoot,
    pending.operation,
    pending.bytes,
    context.config,
    context.mappings,
  );
  reportCleanInitializationPhase('acquire-native-fence', startedAt);
  let hostClosed = false;
  const closeHostOwner = () => {
    if (hostClosed) return;
    closeWorkspaceDatabaseWithAdmission(acquired.host);
    hostClosed = true;
  };
  try {
    const result = await withCleanInitializationHostAdmission({
      repositoryRoot: request.repositoryRoot,
      workspaceId: pending.operation.workspace_id,
      operationId: pending.operation.operation_id,
      expectedFenceBinding: maintenanceBinding(
        request.repositoryRoot,
        pending.operation,
        context.config,
        context.mappings,
      ),
      receipt: acquired.receipt,
      hostRelative: acquired.hostRelative,
      workflowRelative: acquired.workflowRelative,
      expectedPendingBytes: pending.bytes,
      closeHostOwner,
      operation: async (capability, proof) => {
        assertCleanInitializationHostAdmission(
          capability,
          request.repositoryRoot,
          pending.operation.workspace_id,
          pending.operation.operation_id,
        );
        const current = assertExactPending(request.repositoryRoot, pending.bytes);
        const currentContext = assertCurrentOperation(request.repositoryRoot, current, pending.bytes);
        requireOperation(
          canonicalJsonDigest(
            maintenanceBinding(request.repositoryRoot, current, currentContext.config, currentContext.mappings),
          ) ===
            canonicalJsonDigest(
              maintenanceBinding(request.repositoryRoot, pending.operation, context.config, context.mappings),
            ),
          'admitted operation identities changed',
        );
        return operationCallback(current, capability, proof, pending.bytes, acquired.receipt);
      },
    });
    reportCleanInitializationPhase('acquire-host-admission-and-callback', startedAt);
    return result;
  } finally {
    closeHostOwner();
  }
}

type PendingOwner = { operation: ConsumerCleanInitializationOperationV2; bytes: Buffer };
type MutationInput = {
  readonly repositoryRoot: string;
  readonly operationId: string;
  readonly planBinding: string;
  readonly expectedState: ConsumerCleanInitializationExpectedState;
  readonly authorization: ConsumerCleanInitializationAuthorization;
};

function pendingDigest(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function compareAndSwapPending(root: string, owner: PendingOwner, candidate: unknown): Promise<PendingOwner> {
  const latest = assertExactPending(root, owner.bytes);
  requireOperation(
    latest.operation_id === owner.operation.operation_id && latest.binding === owner.operation.binding,
    'pending operation binding changed before journal CAS',
  );
  const operation = validateCleanInitializationOperationV2(candidate);
  requireOperation(
    operation.operation_id === owner.operation.operation_id && operation.binding === owner.operation.binding,
    'journal update changed immutable operation identity',
  );
  const bytes = canonicalBytes(operation);
  const access = requireSafeRepositoryAccess(root);
  await access.replaceAtomicAsync(
    CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
    pendingDigest(owner.bytes),
    bytes.toString('utf8'),
    'clean initialization exact pending-byte CAS',
  );
  const written = readPending(root);
  requireOperation(written !== null && written.bytes.equals(bytes), 'journal CAS result is not the exact owned image');
  return { operation: written.operation, bytes: written.bytes };
}

function pathEntryExists(root: string, relative: string): boolean {
  const access = requireSafeRepositoryAccess(root);
  let parent = '.';
  const parts = relative.split('/');
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!;
    const matches = access
      .listFiles(parent, 'clean initialization effect path')
      .filter((name) => name.toLowerCase() === part.toLowerCase());
    requireOperation(
      matches.length <= 1 && (!matches.length || matches[0] === part),
      'effect path has an alias or case collision',
    );
    if (!matches.length) return false;
    parent = parent === '.' ? part : `${parent}/${part}`;
    if (index < parts.length - 1) access.directoryIdentity(parent, 'clean initialization effect parent');
  }
  return true;
}

function assertDirectoryIdentity(root: string, relative: string, expected: string): void {
  requireOperation(
    requireSafeRepositoryAccess(root).directoryIdentity(relative, 'clean initialization archive directory') ===
      expected,
    'archive directory identity changed',
  );
}

function expectedContainerParent(
  operation: ConsumerCleanInitializationOperationV2,
  containerPath: string,
): string | null {
  const parent = path.posix.dirname(containerPath);
  if (parent === '.agent') return null;
  const owned = operation.containers.find((entry) => entry.path === parent);
  requireOperation(
    owned?.state === 'completed' && owned.identity !== null,
    'archive parent is not an owned completed container',
  );
  return owned.identity;
}

async function createArchiveContainers(root: string, initial: PendingOwner): Promise<PendingOwner> {
  let owner = initial;
  for (const container of owner.operation.containers) {
    const current = owner.operation.containers.find((entry) => entry.path === container.path)!;
    if (current.state === 'completed') {
      requireOperation(current.identity !== null, 'completed archive container identity is missing');
      assertDirectoryIdentity(root, current.path, current.identity);
      continue;
    }
    requireOperation(current.state === 'not-started', 'archive container creation has an unknown outcome');
    const preexistingSharedHistory =
      current.path === '.agent/clean-initialization-history' && pathEntryExists(root, current.path);
    requireOperation(
      preexistingSharedHistory || !pathEntryExists(root, current.path),
      'unrecorded archive container already exists',
    );
    const parent = path.posix.dirname(current.path);
    const parentBefore =
      expectedContainerParent(owner.operation, current.path) ??
      requireSafeRepositoryAccess(root).directoryIdentity(parent, 'clean initialization archive parent');
    owner = await compareAndSwapPending(root, owner, {
      ...owner.operation,
      phase: 'archiving',
      containers: owner.operation.containers.map((entry) =>
        entry.path === current.path ? { ...entry, state: 'issued' as const } : entry,
      ),
    });
    const access = requireSafeRepositoryAccess(root);
    if (!preexistingSharedHistory)
      await access.ensureDirectoryAsync(current.path, 'clean initialization archive container');
    requireOperation(
      access.directoryIdentity(parent, 'clean initialization archive parent') === parentBefore,
      'archive parent identity changed during container creation',
    );
    const identity = access.directoryIdentity(current.path, 'clean initialization archive container');
    owner = await compareAndSwapPending(root, owner, {
      ...owner.operation,
      phase: 'archiving',
      containers: owner.operation.containers.map((entry) =>
        entry.path === current.path ? { ...entry, state: 'completed' as const, identity } : entry,
      ),
    });
  }
  return owner;
}

function exactMoveObservation(
  root: string,
  operation: ConsumerCleanInitializationOperationV2,
  move: ConsumerCleanInitializationOperationV2['moves'][number],
): {
  readonly source: boolean;
  readonly target: boolean;
} {
  const source = pathEntryExists(root, move.source);
  const target = pathEntryExists(root, move.target);
  if (source) {
    const inventory = operation.inventory.find((item) => item.path === move.source);
    requireOperation(inventory !== undefined, 'archive source inventory is missing');
    assertFileObservation(root, inventory);
  }
  if (target) {
    const inventory = operation.inventory.find((item) => item.path === move.source);
    requireOperation(inventory !== undefined, 'archive target inventory is missing');
    const targetParent = path.posix.dirname(move.target);
    const targetContainer = operation.containers.find((item) => item.path === targetParent);
    requireOperation(
      targetContainer?.state === 'completed' && targetContainer.identity !== null,
      'archive target parent is not owned',
    );
    assertDirectoryIdentity(root, targetParent, targetContainer.identity);
    assertFileObservationAt(root, move.target, inventory);
  }
  return { source, target };
}

async function archiveManagedFiles(root: string, initial: PendingOwner): Promise<PendingOwner> {
  const startedAt = performance.now();
  let owner = initial;
  if (owner.operation.phase === 'intent')
    owner = await compareAndSwapPending(root, owner, { ...owner.operation, phase: 'archiving' });
  reportCleanInitializationPhase('archive-intent-cas', startedAt);
  if (owner.operation.phase === 'archiving') {
    owner = await createArchiveContainers(root, owner);
    reportCleanInitializationPhase('archive-containers', startedAt);
    for (const original of owner.operation.moves) {
      let move = owner.operation.moves.find((entry) => entry.source === original.source)!;
      const inventory = owner.operation.inventory.find((entry) => entry.path === move.source);
      requireOperation(inventory !== undefined, 'archive move inventory is missing');
      const access = requireSafeRepositoryAccess(root);
      const targetParent = path.posix.dirname(move.target);
      const container = owner.operation.containers.find((entry) => entry.path === targetParent);
      requireOperation(
        container?.state === 'completed' && container.identity !== null,
        'archive target parent is not journaled',
      );
      assertDirectoryIdentity(root, targetParent, container.identity);
      const observation = exactMoveObservation(root, owner.operation, move);
      reportCleanInitializationPhase(`archive-observe-${move.source}`, startedAt);
      if (move.state === 'completed') {
        requireOperation(
          !observation.source && observation.target,
          'completed archive move does not match exact target-only state',
        );
        continue;
      }
      requireOperation(move.state === 'not-started' || move.state === 'issued', 'archive move state is invalid');
      if (!observation.source && observation.target) {
        requireOperation(move.state === 'issued', 'unrecorded archive target cannot be adopted');
        owner = await compareAndSwapPending(root, owner, {
          ...owner.operation,
          moves: owner.operation.moves.map((entry) =>
            entry.source === move.source ? { ...entry, state: 'completed' as const } : entry,
          ),
        });
        continue;
      }
      requireOperation(
        observation.source && !observation.target,
        'archive move has both, neither, or foreign path outcomes',
      );
      const sourceParent = path.posix.dirname(move.source);
      const sourceParentBefore = access.directoryIdentity(sourceParent, 'clean initialization source parent');
      assertFileObservation(root, inventory);
      reportCleanInitializationPhase(`archive-source-capture-${move.source}`, startedAt);
      if (move.state === 'not-started') {
        owner = await compareAndSwapPending(root, owner, {
          ...owner.operation,
          moves: owner.operation.moves.map((entry) =>
            entry.source === move.source ? { ...entry, state: 'issued' as const } : entry,
          ),
        });
        move = owner.operation.moves.find((entry) => entry.source === move.source)!;
      }
      assertDirectoryIdentity(root, targetParent, container.identity);
      assertFileObservation(root, inventory);
      await access.moveNoReplaceAsync(move.source, move.target, inventory.sha256, 'clean initialization file archive');
      reportCleanInitializationPhase(`archive-native-move-${move.source}`, startedAt);
      requireOperation(
        access.directoryIdentity(sourceParent, 'clean initialization source parent') === sourceParentBefore,
        'source parent identity changed during archive move',
      );
      const after = exactMoveObservation(root, owner.operation, move);
      requireOperation(!after.source && after.target, 'native archive move did not produce exact target-only custody');
      owner = await compareAndSwapPending(root, owner, {
        ...owner.operation,
        moves: owner.operation.moves.map((entry) =>
          entry.source === move.source ? { ...entry, state: 'completed' as const } : entry,
        ),
      });
      reportCleanInitializationPhase(`archive-complete-cas-${move.source}`, startedAt);
      reportCleanInitializationPhase(`archive-move-${move.source}`, startedAt);
    }
    requireOperation(
      owner.operation.moves.every((entry) => entry.state === 'completed') &&
        owner.operation.containers.every((entry) => entry.state === 'completed'),
      'archive is incomplete',
    );
    owner = await compareAndSwapPending(root, owner, { ...owner.operation, phase: 'archive_complete' });
    reportCleanInitializationPhase('archive-terminal-cas', startedAt);
  }
  return owner;
}

function preparedForOperation(operation: ConsumerCleanInitializationOperationV2): PreparedInitialization {
  requireOperation(operation.prepared !== null, 'prepared initialization receipt is missing');
  return Object.freeze({ ...operation.prepared, preserved: operation.preserved });
}

function initializationRequest(operation: ConsumerCleanInitializationOperationV2) {
  return {
    projectRoot: operation.request.projectRoot,
    repository: operation.request.repository,
    projectMappings: operation.request.projectMappings,
  };
}

function assertNoPendingInitializationReceipt(root: string): void {
  const access = requireSafeRepositoryAccess(root);
  requireOperation(
    !access.fileExists('.agent/runtime-initialization.pending.v1.json', 'pending initialization receipt'),
    'initializer receipt is still pending',
  );
}

async function verifyCompletedInitialization(
  root: string,
  owner: PendingOwner,
  proof:
    | JoinedInitConfigAdmissionProof<MaintenanceFence>
    | import('../src/config/storage-read-admission.js').InitConfigAdmissionProof,
): Promise<void> {
  requireOperation(
    owner.operation.phase === 'complete' &&
      owner.operation.prepared !== null &&
      owner.operation.initialization === 'completed',
    'initialization is not journaled complete',
  );
  assertNoPendingInitializationReceipt(root);
  const result = await finishPreparedInitializationUnderAdmission(
    proof,
    initializationRequest(owner.operation),
    preparedForOperation(owner.operation),
    pendingDigest(owner.bytes),
  );
  requireOperation(result.status === 'already_completed', 'initializer terminal result is not read-only completed');
}

async function advanceInitialization(
  root: string,
  initial: PendingOwner,
  proof: JoinedInitConfigAdmissionProof<MaintenanceFence>,
): Promise<PendingOwner> {
  const startedAt = performance.now();
  let owner = initial;
  if (owner.operation.phase === 'archive_complete') {
    requireOperation(
      owner.operation.prepared === null && owner.operation.initialization === 'not-started',
      'archive completion is inconsistent',
    );
    const prepared = prepareInitializationUnderAdmission(
      proof,
      initializationRequest(owner.operation),
      pendingDigest(owner.bytes),
    );
    reportCleanInitializationPhase('initializer-prepare', startedAt);
    owner = await compareAndSwapPending(root, owner, {
      ...owner.operation,
      phase: 'initializing',
      prepared: {
        intent: prepared.intent,
        rootIdentity: prepared.rootIdentity,
        bundleIdentity: prepared.bundleIdentity,
        projectIdentities: prepared.projectIdentities,
        resourceDigest: prepared.resourceDigest,
      },
      initialization: 'issued',
    });
    reportCleanInitializationPhase('initializer-issued-cas', startedAt);
  }
  if (owner.operation.phase === 'initializing') {
    requireOperation(owner.operation.prepared !== null, 'initialization journal lacks its prepared receipt');
    const result = await finishPreparedInitializationUnderAdmission(
      proof,
      initializationRequest(owner.operation),
      preparedForOperation(owner.operation),
      pendingDigest(owner.bytes),
    );
    reportCleanInitializationPhase('initializer-finish', startedAt);
    requireOperation(
      typeof result.status === 'string' &&
        typeof result.receipt === 'string' &&
        typeof result.config_digest === 'string',
      'initializer completion receipt is incomplete',
    );
    requireOperation(
      owner.operation.initialization === 'issued' || owner.operation.initialization === 'completed',
      'initializer state cannot advance',
    );
    owner = await compareAndSwapPending(root, owner, {
      ...owner.operation,
      phase: 'complete',
      initialization: 'completed',
    });
    reportCleanInitializationPhase('initializer-complete-cas', startedAt);
  }
  return owner;
}

function terminalVerifier(
  root: string,
  owner: PendingOwner,
  capability: CleanInitializationHostAdmissionCapability,
  proof: JoinedInitConfigAdmissionProof<MaintenanceFence>,
): MaintenanceReleaseVerifier {
  const operation = owner.operation;
  const binding = maintenanceBinding(
    root,
    operation,
    operationConfig(root, operation),
    projectMappings(operation.request.projectMappings),
  );
  return Object.freeze({
    principal: fixedPrincipal,
    projectIds: binding.project_ids,
    verify: async (fence: MaintenanceFence) => {
      assertCleanInitializationHostAdmission(capability, root, operation.workspace_id, operation.operation_id);
      if (canonicalJsonDigest(fence.binding) !== canonicalJsonDigest(binding)) return null;
      const latest = readPending(root);
      if (latest === null || !latest.bytes.equals(owner.bytes)) return null;
      await verifyCompletedInitialization(root, owner, proof);
      return {
        schema: 'MaintenanceReleaseAuthorization/v1' as const,
        principal: fixedPrincipal,
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: binding.closure_digest,
        bundle_digest: binding.bundle_digest,
      };
    },
  });
}

async function releaseCompletedFence(
  root: string,
  owner: PendingOwner,
  capability: CleanInitializationHostAdmissionCapability,
  proof: JoinedInitConfigAdmissionProof<MaintenanceFence>,
  receipt: MaintenanceFenceReceipt,
  hostRelative: string,
): Promise<void> {
  const host = openUnadmittedWorkspaceDatabase(root, hostRelative, false, false, proof.captureSource);
  await withWorkspaceDatabaseCloseAsync(
    host,
    async () => {
      assertCleanInitializationHostAdmission(
        capability,
        root,
        owner.operation.workspace_id,
        owner.operation.operation_id,
      );
      const store = new HostStateStore(
        host,
        owner.operation.workspace_id,
        undefined,
        undefined,
        undefined,
        terminalVerifier(root, owner, capability, proof),
        root,
      );
      store.assertMaintenanceFence(receipt);
      const releasedReceipt: MaintenanceFenceReceipt = {
        fence: { ...receipt.fence, revision: receipt.fence.revision + 1, status: 'released' },
        token: receipt.token,
      };
      try {
        await store.releaseMaintenanceFence(receipt);
      } catch (error) {
        try {
          store.assertReleasedMaintenanceFence(releasedReceipt);
        } catch (reconcileError) {
          throw new AggregateError([error, reconcileError], label + ': release result is not exact and remains fenced');
        }
      }
      store.assertReleasedMaintenanceFence(releasedReceipt);
    },
    proof.closeSource,
    'clean initialization release and Host close failed',
  );
}

function strictMutationRequest(
  value: unknown,
  action: ConsumerCleanInitializationAuthorization['action'],
): MutationInput {
  const image = canonicalJsonImageWithNodeLimit(value, 0, MAX_CANONICAL_NODES).image as MutationInput;
  requireOperation(
    image !== null &&
      typeof image === 'object' &&
      Object.keys(image).length === 5 &&
      typeof image.repositoryRoot === 'string' &&
      path.isAbsolute(image.repositoryRoot) &&
      path.resolve(image.repositoryRoot) === image.repositoryRoot &&
      typeof image.operationId === 'string' &&
      typeof image.planBinding === 'string' &&
      /^[a-f0-9]{64}$/u.test(image.planBinding) &&
      image.expectedState !== null &&
      typeof image.expectedState === 'object' &&
      Object.keys(image.expectedState).length === 1 &&
      (image.expectedState.pending_sha256 === null || /^[a-f0-9]{64}$/u.test(image.expectedState.pending_sha256)) &&
      ((action !== 'resume' && action !== 'retire') || image.expectedState.pending_sha256 !== null) &&
      image.authorization !== null &&
      typeof image.authorization === 'object' &&
      Object.keys(image.authorization).length === 3 &&
      image.authorization.action === action &&
      image.authorization.operation_id === image.operationId &&
      image.authorization.plan_binding === image.planBinding,
    'mutation request, exact pending-byte token, or local consent is invalid',
  );
  return image;
}

async function runHeldEffects(input: MutationInput): Promise<ConsumerCleanInitializationInspection> {
  const phaseStartedAt = performance.now();
  reportCleanInitializationPhase('apply-start', phaseStartedAt);
  const root = input.repositoryRoot;
  const before = readPending(root);
  requireOperation(before !== null, 'pending operation is absent');
  requireOperation(
    before.operation.operation_id === input.operationId && before.operation.binding === input.planBinding,
    'pending operation or immutable binding differs',
  );
  requireOperation(
    pendingDigest(before.bytes) === input.expectedState.pending_sha256,
    'expected pending-byte state is stale',
  );
  const hostContext = assertCurrentOperation(root, before.operation, before.bytes);
  reportCleanInitializationPhase('apply-current-operation-validation', phaseStartedAt);
  const hostRelative = sessionHandoffDatabaseRelativePath(hostContext.config);
  await withAcquiredConsumerCleanInitialization(
    { repositoryRoot: root, operationId: input.operationId },
    async (acquiredOperation, capability, proof, pendingBytes, receipt) => {
      assertCleanInitializationHostAdmission(
        capability,
        root,
        acquiredOperation.workspace_id,
        acquiredOperation.operation_id,
      );
      requireOperation(
        pendingDigest(pendingBytes) === input.expectedState.pending_sha256 &&
          acquiredOperation.binding === input.planBinding,
        'pending state changed before joined effects admission',
      );
      let owner: PendingOwner = { operation: acquiredOperation, bytes: Buffer.from(pendingBytes) };
      if (owner.operation.phase === 'intent' || owner.operation.phase === 'archiving')
        owner = await archiveManagedFiles(root, owner);
      reportCleanInitializationPhase('archive-complete', phaseStartedAt);
      owner = await advanceInitialization(root, owner, proof);
      reportCleanInitializationPhase('witnessed-initialization-complete', phaseStartedAt);
      await releaseCompletedFence(root, owner, capability, proof, receipt, hostRelative);
      reportCleanInitializationPhase('private-terminal-release-complete', phaseStartedAt);
      return undefined;
    },
  );
  reportCleanInitializationPhase('apply-inspection-complete', phaseStartedAt);
  return inspectConsumerCleanInitialization(root);
}

function observeReleasedFence(
  root: string,
  operation: ConsumerCleanInitializationOperationV2,
  bytes: Uint8Array,
  retiredMetadata = false,
): boolean {
  if (retiredMetadata)
    requireOperation(readPending(root) === null, 'retired metadata unexpectedly has a pending owner');
  const context = retiredMetadata
    ? assertCurrentOperation(root, operation)
    : assertCurrentOperation(root, operation, bytes);
  const hostRelative = sessionHandoffDatabaseRelativePath(context.config);
  const admission = acquireStorageReadAdmission(root, operation.workspace_id, hostRelative);
  let host: Database | undefined;
  try {
    host = retiredMetadata
      ? openExistingWorkspaceDatabaseWithAdmission(root, hostRelative, admission, true)
      : openExistingWorkspaceDatabaseWithCleanInitializationIntent(
          root,
          hostRelative,
          admission,
          operation.operation_id,
          bytes,
        );
    const binding = maintenanceBinding(root, operation, context.config, context.mappings);
    const store = new HostStateStore(
      host,
      operation.workspace_id,
      undefined,
      undefined,
      undefined,
      {
        principal: fixedPrincipal,
        projectIds: binding.project_ids,
        verify: () => null,
      },
      root,
    );
    const fence = store.readMaintenanceFence();
    if (fence?.status !== 'released') return false;
    requireOperation(
      canonicalJsonDigest(fence.binding) === canonicalJsonDigest(binding),
      'released Host fence belongs to another operation or closure',
    );
    store.assertReleasedMaintenanceFence({ fence, token: recoveryToken(operation) });
    return true;
  } finally {
    if (host) closeWorkspaceDatabaseWithAdmission(host);
    else admission.close();
  }
}

/** Apply a reviewed plan only after exact local consent and absent pending-state CAS. */
export async function applyConsumerCleanInitialization(input: {
  readonly operation: ConsumerCleanInitializationOperationV2;
  readonly expectedState: ConsumerCleanInitializationExpectedState;
  readonly authorization: ConsumerCleanInitializationAuthorization;
}): Promise<ConsumerCleanInitializationInspection> {
  const image = canonicalJsonImageWithNodeLimit(input, 0, MAX_CANONICAL_NODES).image as typeof input;
  requireOperation(
    image !== null &&
      typeof image === 'object' &&
      Object.keys(image).length === 3 &&
      image.expectedState !== null &&
      typeof image.expectedState === 'object' &&
      Object.keys(image.expectedState).length === 1 &&
      image.expectedState.pending_sha256 === null &&
      image.authorization !== null &&
      typeof image.authorization === 'object' &&
      Object.keys(image.authorization).length === 3 &&
      image.authorization.action === 'apply' &&
      image.authorization.operation_id === image.operation?.operation_id &&
      image.authorization.plan_binding === image.operation?.binding,
    'apply authorization or expected state is invalid',
  );
  const operation = validateCleanInitializationOperationV2(image.operation);
  const repositoryRoot = operation.root;
  let inspection: ConsumerCleanInitializationInspection;
  const current = readPending(repositoryRoot);
  if (current === null) {
    inspection = await publishReviewedConsumerCleanInitialization(image);
  } else {
    requireOperation(
      image.expectedState.pending_sha256 === null &&
        current.bytes.equals(canonicalBytes(operation)) &&
        current.operation.operation_id === operation.operation_id &&
        current.operation.binding === operation.binding,
      'already-published pending operation is not the exact reviewed plan',
    );
    inspection = inspectConsumerCleanInitialization(repositoryRoot);
  }
  requireOperation(inspection.operation !== null, 'published pending operation is missing');
  return runHeldEffects({
    repositoryRoot,
    operationId: operation.operation_id,
    planBinding: operation.binding,
    expectedState: inspection.expectedState,
    authorization: image.authorization,
  });
}

/** Resume only the latest exact pending-byte image under its held native fence. */
export async function resumeConsumerCleanInitialization(
  input: MutationInput,
): Promise<ConsumerCleanInitializationInspection> {
  const request = strictMutationRequest(input, 'resume');
  const pending = readPending(request.repositoryRoot);
  requireOperation(pending !== null, 'pending operation is absent');
  requireOperation(
    pending.operation.operation_id === request.operationId && pending.operation.binding === request.planBinding,
    'resume operation or immutable binding differs',
  );
  requireOperation(
    pendingDigest(pending.bytes) === request.expectedState.pending_sha256,
    'resume pending-byte CAS is stale',
  );
  if (
    pending.operation.phase === 'complete' &&
    observeReleasedFence(request.repositoryRoot, pending.operation, pending.bytes)
  ) {
    await withExclusiveInitConfigAdmission(pending.operation.root, pending.operation.workspace_id, async (proof) => {
      const owner = { operation: pending.operation, bytes: pending.bytes };
      await verifyCompletedInitialization(request.repositoryRoot, owner, proof);
    });
    return inspectConsumerCleanInitialization(request.repositoryRoot);
  }
  return runHeldEffects(request);
}

/** Retire only exact completed metadata after read-only terminal release proof; archive payload remains in place. */
export async function retireConsumerCleanInitialization(input: MutationInput): Promise<{
  readonly status: 'retired';
  readonly operation: ConsumerCleanInitializationOperationV2;
  readonly archive_root: string;
}> {
  const request = strictMutationRequest(input, 'retire');
  const historyRoot = `.agent/clean-initialization-history/${request.operationId}`;
  const target = `${historyRoot}/operation.v2.json`;
  const access = requireSafeRepositoryAccess(request.repositoryRoot);
  const readVerifiedCaptureBytes = access.readVerifiedCaptureBytes;
  requireOperation(readVerifiedCaptureBytes !== undefined, 'native retired metadata readback is unavailable');
  const pending = readPending(request.repositoryRoot);
  if (pending === null) {
    requireOperation(pathEntryExists(request.repositoryRoot, target), 'retired metadata is absent');
    const bytes = Buffer.from(
      readVerifiedCaptureBytes(target, 'retired clean initialization metadata', maxPendingBytes),
    );
    requireOperation(
      pendingDigest(bytes) === request.expectedState.pending_sha256,
      'retired metadata does not match the expected pending bytes',
    );
    const operation = decodeCleanInitializationOperationV2(bytes);
    requireOperation(
      operation.operation_id === request.operationId &&
        operation.binding === request.planBinding &&
        operation.phase === 'complete' &&
        operation.initialization === 'completed' &&
        observeReleasedFence(request.repositoryRoot, operation, bytes, true),
      'retired metadata is not exact verified terminal state',
    );
    return { status: 'retired', operation, archive_root: operation.archive_root };
  }
  requireOperation(
    pending.operation.operation_id === request.operationId &&
      pending.operation.binding === request.planBinding &&
      pendingDigest(pending.bytes) === request.expectedState.pending_sha256 &&
      pending.operation.phase === 'complete' &&
      pending.operation.initialization === 'completed',
    'only exact completed pending metadata can retire',
  );
  requireOperation(
    observeReleasedFence(request.repositoryRoot, pending.operation, pending.bytes),
    'terminal Host release is not exact',
  );
  await withExclusiveInitConfigAdmission(pending.operation.root, pending.operation.workspace_id, async (proof) => {
    await verifyCompletedInitialization(
      request.repositoryRoot,
      { operation: pending.operation, bytes: pending.bytes },
      proof,
    );
  });
  const container = pending.operation.containers.find((entry) => entry.path === historyRoot);
  requireOperation(
    container?.state === 'completed' && container.identity !== null,
    'metadata history container was not journaled',
  );
  assertDirectoryIdentity(request.repositoryRoot, historyRoot, container.identity);
  requireOperation(!pathEntryExists(request.repositoryRoot, target), 'metadata history destination is occupied');
  const sourceIdentity = access.observeFileIdentity;
  requireOperation(sourceIdentity !== undefined, 'native pending metadata identity is unavailable');
  const pendingIdentity = sourceIdentity(
    CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
    'clean initialization pending metadata',
  );
  await access.moveNoReplaceAsync(
    CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
    target,
    pendingDigest(pending.bytes),
    'retire completed clean initialization metadata',
  );
  requireOperation(
    !pathEntryExists(request.repositoryRoot, CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH),
    'pending metadata remained after retirement',
  );
  const retiredIdentity = sourceIdentity(target, 'retired clean initialization metadata');
  requireOperation(retiredIdentity === pendingIdentity, 'retired metadata identity differs from exact pending source');
  const retiredBytes = readVerifiedCaptureBytes(target, 'retired clean initialization metadata', maxPendingBytes);
  requireOperation(retiredBytes.equals(pending.bytes), 'retired metadata bytes differ');
  return { status: 'retired', operation: pending.operation, archive_root: pending.operation.archive_root };
}
