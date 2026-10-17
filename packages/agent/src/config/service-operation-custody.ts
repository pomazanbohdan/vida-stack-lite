import { randomUUID } from 'node:crypto';
import { Database } from 'bun:sqlite';
import {
  serviceOperationLaunchCapabilityDigest,
  serviceOperationLaunchClaimMatches,
} from './service-operation-launch-capability.js';
import {
  assertWorkspaceDatabaseAdmission,
  closeWorkspaceDatabaseWithAdmission,
  withExclusiveServiceOperationAdmission,
} from './storage-read-admission.js';
import { openExistingWorkspaceDatabase } from './workspace-database.js';
import { openUnadmittedWorkspaceDatabase } from './workspace-database-raw.js';
export { serviceOperationLaunchCapabilityMatches } from './service-operation-launch-capability.js';

type ServiceOperationKind = 'release-pack-worker' | 'release-worker';
type ServiceOperationPhase = 'launching' | 'in_flight' | 'unknown' | 'prepared' | 'terminal';

interface ServiceOperationCustody {
  readonly workspace_id: string;
  readonly owner_kind: ServiceOperationKind;
  readonly operation_id: string;
  readonly request_digest: string;
  readonly owner_token: string | null;
  readonly revision: number;
  readonly phase: ServiceOperationPhase;
  readonly evidence_digest: string | null;
  readonly launch_pid: number | null;
  readonly handoff_digest: string | null;
  readonly handoff_from_kind: ServiceOperationKind | null;
  readonly handoff_from_phase: 'terminal' | null;
  readonly handoff_from_request_digest: string | null;
  readonly handoff_from_revision: number | null;
  readonly handoff_from_evidence_digest: string | null;
}

interface ServiceOperationHandle {
  readonly database: Database;
}

interface ServiceOperationLaunchReservation extends ServiceOperationCustody {
  /** Ephemeral capability returned only to the launcher; it is never persisted or journaled. */
  readonly child_capability: string;
}

interface LiveServiceOperationHandle {
  readonly database: Database;
  readonly workspace_id: string;
  readonly owner_kind: ServiceOperationKind;
  readonly operation_id: string;
  readonly request_digest: string;
  readonly owner_token: string;
  readonly revision: number;
}

interface ServiceOperationProof {
  readonly phase: 'prepared' | 'terminal';
  readonly evidence_digest: string;
}

interface ServiceOperationHandoffProof extends ServiceOperationProof {
  readonly handoff_digest: string;
}

export function serviceOperationCustodySchemaSql(): string {
  return (
    'CREATE TABLE ' +
    serviceOperationCustodyTable() +
    ' (' +
    "workspace_id TEXT NOT NULL CHECK(length(workspace_id)=64),owner_kind TEXT NOT NULL CHECK(owner_kind IN ('release-pack-worker','release-worker'))," +
    'operation_id TEXT NOT NULL,request_digest TEXT NOT NULL CHECK(length(request_digest)=64),' +
    'owner_token TEXT,revision INTEGER NOT NULL CHECK(revision>0),' +
    "phase TEXT NOT NULL CHECK(phase IN ('launching','in_flight','unknown','prepared','terminal'))," +
    'evidence_digest TEXT,launch_pid INTEGER CHECK(launch_pid IS NULL OR launch_pid>0),handoff_digest TEXT,handoff_from_kind TEXT,handoff_from_phase TEXT,' +
    'handoff_from_request_digest TEXT,handoff_from_revision INTEGER,handoff_from_evidence_digest TEXT,' +
    'PRIMARY KEY(workspace_id,operation_id))'
  );
}

function serviceOperationCustodyTable(): string {
  return 'agent_host_service_operation_custody';
}
const liveHandles = new WeakMap<ServiceOperationHandle, LiveServiceOperationHandle>();
const serviceDatabases = new WeakMap<
  Database,
  { readonly root: string; readonly relative: string; readonly workspaceId: string }
>();

function requireCustody(value: unknown, message: string): asserts value {
  if (!value) throw new Error('Service operation custody: ' + message);
}

function validateKey(workspaceId: string, kind: ServiceOperationKind, operationId: string): void {
  requireCustody(isDigest(workspaceId), 'workspace identity is invalid');
  requireCustody(['release-pack-worker', 'release-worker'].includes(kind), 'owner kind is invalid');
  requireCustody(/^[a-z0-9][a-z0-9-]{0,95}$/u.test(operationId), 'operation identity is invalid');
}

function validateDigest(digest: string, label: string): void {
  requireCustody(isDigest(digest), label + ' is invalid');
}

function isDigest(digest: string | null): boolean {
  return /^[a-f0-9]{64}$/u.test(String(digest));
}

function nextRevision(revision: number): number {
  const next = revision + 1;
  requireCustody(Number.isSafeInteger(next), 'custody revision limit reached');
  return next;
}

/** Only the owned initial/merge image producer creates this service table. */
export function initializeServiceOperationCustodySchema(database: Database): void {
  requireCustody(database instanceof Database && !database.inTransaction, 'schema requires an unshared database');
  const existing = database
    .query<{ name: string }, [string]>("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
    .get(serviceOperationCustodyTable());
  if (!existing) database.exec(serviceOperationCustodySchemaSql());
  assertServiceOperationCustodyReady(database);
  const count = database
    .query<{ count: number | bigint }, []>('SELECT COUNT(*) AS count FROM ' + serviceOperationCustodyTable())
    .get()!.count;
  requireCustody(BigInt(count) === 0n, 'prepared service table must be empty');
}

export function assertServiceOperationCustodyReady(database: Database): void {
  const found = database
    .query<{ sql: string }, [string]>("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
    .get(serviceOperationCustodyTable());
  requireCustody(found?.sql === serviceOperationCustodySchemaSql(), 'owned service table is absent or differs');
}

function readRow(database: Database, workspaceId: string, operationId: string): ServiceOperationCustody | null {
  const found = database
    .query<
      Omit<ServiceOperationCustody, 'revision' | 'handoff_from_revision'> & {
        revision: number | bigint;
        launch_pid: number | bigint | null;
        handoff_from_revision: number | bigint | null;
      },
      [string, string]
    >(
      'SELECT workspace_id,owner_kind,operation_id,request_digest,owner_token,revision,phase,evidence_digest,launch_pid,' +
        'handoff_digest,handoff_from_kind,handoff_from_phase,handoff_from_request_digest,handoff_from_revision,' +
        'handoff_from_evidence_digest ' +
        'FROM ' +
        serviceOperationCustodyTable() +
        " WHERE workspace_id=? AND operation_id=? AND owner_kind IN ('release-pack-worker','release-worker')",
    )
    .get(workspaceId, operationId);
  if (!found) return null;
  const revision = Number(found.revision);
  const result = normalizeHandoffRevision(found, revision);
  assertCustodyRowIdentity(result, workspaceId, operationId);
  assertCustodyRowState(result, revision);
  assertCustodyHandoff(result);
  return result;
}

function normalizeHandoffRevision(
  found: Omit<ServiceOperationCustody, 'revision' | 'handoff_from_revision'> & {
    revision: number | bigint;
    launch_pid: number | bigint | null;
    handoff_from_revision: number | bigint | null;
  },
  revision: number,
): ServiceOperationCustody {
  return {
    ...found,
    revision,
    launch_pid: found.launch_pid === null ? null : Number(found.launch_pid),
    handoff_from_revision: found.handoff_from_revision === null ? null : Number(found.handoff_from_revision),
  } as ServiceOperationCustody;
}

function runShortTransaction<T>(database: Database, callback: () => T): T {
  requireCustody(!database.inTransaction, 'nested transaction is forbidden');
  database.exec('BEGIN IMMEDIATE');
  try {
    const result = callback();
    database.exec('COMMIT');
    return result;
  } catch (error) {
    try {
      database.exec('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], 'Service custody transaction and rollback failed.');
    }
    throw error;
  }
}

function withCleanup<T>(operation: () => T, cleanup: () => void, message: string): T {
  let value: T | undefined;
  let operationFailed = false;
  let operationError: unknown;
  try {
    value = operation();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }
  let cleanupFailed = false;
  let cleanupError: unknown;
  try {
    cleanup();
  } catch (error) {
    cleanupFailed = true;
    cleanupError = error;
  }
  if (operationFailed && cleanupFailed) throw new AggregateError([operationError, cleanupError], message);
  if (operationFailed) throw operationError;
  if (cleanupFailed) throw cleanupError;
  return value as T;
}

function assertCustodyRowIdentity(found: ServiceOperationCustody, workspaceId: string, operationId: string): void {
  requireCustody(
    found.workspace_id === workspaceId && found.operation_id === operationId,
    'stored operation identity differs',
  );
}

function assertCustodyRowState(found: ServiceOperationCustody, revision: number): void {
  requireCustody(
    isDigest(found.request_digest) &&
      (found.owner_token === null || /^[0-9a-f-]{36}$/u.test(found.owner_token) || isDigest(found.owner_token)) &&
      Number.isSafeInteger(revision) &&
      revision > 0,
    'stored operation custody row is invalid',
  );
  assertCustodyOwnerPhase(found);
  assertCustodyEvidence(found);
}

function assertCustodyOwnerPhase(found: ServiceOperationCustody): void {
  requireCustody(
    ['launching', 'in_flight', 'unknown', 'prepared', 'terminal'].includes(found.phase) &&
      (found.phase === 'in_flight'
        ? /^[0-9a-f-]{36}$/u.test(found.owner_token!)
        : found.phase === 'launching'
          ? found.owner_token === null || isDigest(found.owner_token)
          : found.owner_token === null) &&
      (found.phase === 'launching'
        ? found.launch_pid === null || (Number.isSafeInteger(found.launch_pid) && found.launch_pid > 0)
        : found.launch_pid === null),
    'stored owner phase is invalid',
  );
}

function assertCustodyEvidence(found: ServiceOperationCustody): void {
  requireCustody(
    (found.evidence_digest === null || isDigest(found.evidence_digest)) &&
      (found.phase === 'launching' || found.phase === 'prepared' || found.phase === 'terminal'
        ? found.evidence_digest !== null
        : found.evidence_digest === null),
    'stored operation evidence is invalid',
  );
}

function assertCustodyHandoff(found: ServiceOperationCustody): void {
  requireCustody(noHandoff(found) || isRetargetHandoff(found), 'stored operation handoff is invalid');
}

function noHandoff(found: ServiceOperationCustody): boolean {
  return [
    found.handoff_digest,
    found.handoff_from_kind,
    found.handoff_from_phase,
    found.handoff_from_request_digest,
    found.handoff_from_revision,
    found.handoff_from_evidence_digest,
  ].every((value) => value === null);
}

function isRetargetHandoff(found: ServiceOperationCustody): boolean {
  return hasHandoffOwner(found) && hasHandoffDigests(found) && hasHandoffPredecessor(found);
}

function hasHandoffOwner(found: ServiceOperationCustody): boolean {
  return found.owner_kind === 'release-worker' && found.handoff_from_kind === 'release-pack-worker';
}

function hasHandoffDigests(found: ServiceOperationCustody): boolean {
  return (
    isDigest(found.handoff_digest) &&
    isDigest(found.handoff_from_request_digest) &&
    isDigest(found.handoff_from_evidence_digest)
  );
}

function hasHandoffPredecessor(found: ServiceOperationCustody): boolean {
  const revision = found.handoff_from_revision;
  return found.handoff_from_phase === 'terminal' && Number.isSafeInteger(revision) && revision! > 0;
}

function assertServiceDatabase(database: Database, workspaceId: string): void {
  const binding = serviceDatabases.get(database);
  requireCustody(binding !== undefined && binding.workspaceId === workspaceId, 'workspace database binding differs');
  assertWorkspaceDatabaseAdmission(database, binding.root, binding.relative, workspaceId);
}

function assertServiceDatabaseBinding(database: Database, root: string, relative: string, workspaceId: string): void {
  const binding = serviceDatabases.get(database);
  requireCustody(
    binding !== undefined &&
      binding.root === root &&
      binding.relative === relative &&
      binding.workspaceId === workspaceId,
    'workspace database path binding differs',
  );
  assertWorkspaceDatabaseAdmission(database, root, relative, workspaceId);
}

/**
 * Opens only the loader-selected existing workspace DB. Its paired admission lease stays
 * live on this exact connection until closeServiceOperationCustodyHandle is called.
 */
export function openServiceOperationDatabase(root: string, relative: string, workspaceId: string): Database {
  const database = openExistingWorkspaceDatabase(root, relative, workspaceId, false, true);
  serviceDatabases.set(database, { root, relative, workspaceId });
  return database;
}

/** Persist a one-shot detached launch reservation before starting the child process. */
export function reserveServiceOperationLaunch(
  database: Database,
  workspaceId: string,
  kind: ServiceOperationKind,
  operationId: string,
  requestDigest: string,
  evidenceDigest: string,
): ServiceOperationLaunchReservation {
  validateKey(workspaceId, kind, operationId);
  validateDigest(requestDigest, 'request digest');
  validateDigest(evidenceDigest, 'prepared launch evidence digest');
  assertServiceDatabase(database, workspaceId);
  assertServiceOperationCustodyReady(database);
  const childCapability = randomUUID();
  const capabilityDigest = serviceOperationLaunchCapabilityDigest(childCapability);
  const reserved = runShortTransaction(database, () => {
    const prior = readRow(database, workspaceId, operationId);
    if (!prior) {
      database
        .query(
          'INSERT INTO ' +
            serviceOperationCustodyTable() +
            "(workspace_id,owner_kind,operation_id,request_digest,owner_token,revision,phase,evidence_digest,launch_pid) VALUES(?,?,?,?,?,1,'launching',?,NULL)",
        )
        .run(workspaceId, kind, operationId, requestDigest, capabilityDigest, evidenceDigest);
    } else {
      requireCustody(
        prior.owner_kind === kind &&
          prior.request_digest === requestDigest &&
          prior.phase === 'prepared' &&
          prior.evidence_digest === evidenceDigest,
        'operation has no exact prepared image available for one-shot launch',
      );
      const revision = nextRevision(prior.revision);
      const reserved = database
        .query(
          'UPDATE ' +
            serviceOperationCustodyTable() +
            " SET owner_token=?,revision=?,phase='launching',launch_pid=NULL WHERE workspace_id=? AND owner_kind=? AND operation_id=? AND request_digest=? AND revision=? AND phase='prepared' AND evidence_digest=?",
        )
        .run(capabilityDigest, revision, workspaceId, kind, operationId, requestDigest, prior.revision, evidenceDigest);
      requireCustody(reserved.changes === 1, 'one-shot launch reservation compare-and-swap failed');
    }
    const reserved = readRow(database, workspaceId, operationId);
    requireCustody(reserved?.phase === 'launching', 'one-shot launch reservation disappeared');
    requireCustody(reserved.owner_token === capabilityDigest, 'child launch capability reservation differs');
    return reserved;
  });
  return { ...reserved, child_capability: childCapability };
}

/** Bind the reservation to the exact spawned child before the release admission gate is released. */
export function recordServiceOperationLaunchPid(
  database: Database,
  workspaceId: string,
  kind: ServiceOperationKind,
  operationId: string,
  requestDigest: string,
  revision: number,
  pid: number,
  childCapability: string,
): ServiceOperationCustody {
  validateKey(workspaceId, kind, operationId);
  validateDigest(requestDigest, 'request digest');
  const capabilityDigest = serviceOperationLaunchCapabilityDigest(childCapability);
  requireCustody(Number.isSafeInteger(pid) && pid > 0, 'spawned worker pid is invalid');
  assertServiceDatabase(database, workspaceId);
  assertServiceOperationCustodyReady(database);
  const next = nextRevision(revision);
  return runShortTransaction(database, () => {
    const recorded = database
      .query(
        'UPDATE ' +
          serviceOperationCustodyTable() +
          " SET launch_pid=?,revision=? WHERE workspace_id=? AND owner_kind=? AND operation_id=? AND request_digest=? AND revision=? AND phase='launching' AND launch_pid IS NULL AND owner_token=?",
      )
      .run(pid, next, workspaceId, kind, operationId, requestDigest, revision, capabilityDigest);
    requireCustody(recorded.changes === 1, 'spawned worker pid compare-and-swap failed');
    const row = readRow(database, workspaceId, operationId);
    requireCustody(row?.phase === 'launching' && row.launch_pid === pid, 'spawned worker reservation changed');
    return row;
  });
}

/** Only the process recorded by the one-shot launcher can claim its reservation. */
export function claimReservedServiceOperationLaunch(
  database: Database,
  workspaceId: string,
  kind: ServiceOperationKind,
  operationId: string,
  requestDigest: string,
  pid: number,
  childCapability: string,
): ServiceOperationHandle {
  validateKey(workspaceId, kind, operationId);
  validateDigest(requestDigest, 'request digest');
  requireCustody(Number.isSafeInteger(pid) && pid > 0, 'worker pid is invalid');
  serviceOperationLaunchCapabilityDigest(childCapability);
  assertServiceDatabase(database, workspaceId);
  assertServiceOperationCustodyReady(database);
  const token = randomUUID();
  const revision = runShortTransaction(database, () => {
    const prior = readRow(database, workspaceId, operationId);
    requireCustody(
      serviceOperationLaunchClaimMatches(prior, workspaceId, kind, operationId, requestDigest, pid, childCapability),
      'worker does not match the exact one-shot launch reservation',
    );
    const revision = nextRevision(prior.revision);
    const claimed = database
      .query(
        'UPDATE ' +
          serviceOperationCustodyTable() +
          " SET owner_token=?,revision=?,phase='in_flight',evidence_digest=NULL,launch_pid=NULL WHERE workspace_id=? AND owner_kind=? AND operation_id=? AND request_digest=? AND revision=? AND phase='launching' AND launch_pid=? AND owner_token=?",
      )
      .run(token, revision, workspaceId, kind, operationId, requestDigest, prior.revision, pid, prior.owner_token);
    requireCustody(claimed.changes === 1, 'one-shot worker claim compare-and-swap failed');
    return revision;
  });
  const handle: ServiceOperationHandle = Object.freeze({ database });
  liveHandles.set(handle, {
    database,
    workspace_id: workspaceId,
    owner_kind: kind,
    operation_id: operationId,
    request_digest: requestDigest,
    owner_token: token,
    revision,
  });
  return handle;
}

/** Exact live owner close; unresolved external outcomes are durably UNKNOWN. */
export function closeServiceOperationCustody(
  handle: ServiceOperationHandle,
  phase: 'unknown' | 'prepared' | 'terminal',
  evidenceDigest: string | null,
): number {
  const live = liveHandles.get(handle);
  requireCustody(live !== undefined, 'live operation handle is required');
  requireCustody(['unknown', 'prepared', 'terminal'].includes(phase), 'close phase is invalid');
  requireCustody(phase === 'unknown' ? evidenceDigest === null : evidenceDigest !== null, 'phase evidence is invalid');
  if (evidenceDigest !== null) validateDigest(evidenceDigest, 'evidence digest');
  const revision = nextRevision(live.revision);
  runShortTransaction(live.database, () => {
    const closed = live.database
      .query(
        'UPDATE ' +
          serviceOperationCustodyTable() +
          " SET owner_token=NULL,revision=?,phase=?,evidence_digest=?,launch_pid=NULL WHERE workspace_id=? AND owner_kind=? AND operation_id=? AND request_digest=? AND owner_token=? AND revision=? AND phase='in_flight'",
      )
      .run(
        revision,
        phase,
        evidenceDigest,
        live.workspace_id,
        live.owner_kind,
        live.operation_id,
        live.request_digest,
        live.owner_token,
        live.revision,
      );
    requireCustody(closed.changes === 1, 'owner compare-and-swap failed');
  });
  return revision;
}

export function closeServiceOperationCustodyHandle(handle: ServiceOperationHandle): void {
  const live = liveHandles.get(handle);
  requireCustody(live !== undefined, 'live operation handle is required');
  closeServiceOperationDatabase(live.database);
  liveHandles.delete(handle);
}

export function closeServiceOperationDatabase(database: Database): void {
  closeWorkspaceDatabaseWithAdmission(database);
  serviceDatabases.delete(database);
}

export function readServiceOperationCustodyForOperation(
  database: Database,
  workspaceId: string,
  operationId: string,
): ServiceOperationCustody | null {
  validateKey(workspaceId, 'release-worker', operationId);
  assertServiceDatabase(database, workspaceId);
  assertServiceOperationCustodyReady(database);
  return readRow(database, workspaceId, operationId);
}

/** Transfer only a completed npm-pack owner through a caller-verified same-operation retarget receipt. */
export async function handoffServiceOperationCustody(
  sourceDatabase: Database,
  root: string,
  relative: string,
  workspaceId: string,
  operationId: string,
  priorRequestDigest: string,
  requestDigest: string,
  verifyHandoff: (prior: ServiceOperationCustody) => Promise<ServiceOperationHandoffProof>,
): Promise<ServiceOperationCustody> {
  assertServiceDatabaseBinding(sourceDatabase, root, relative, workspaceId);
  closeServiceOperationDatabase(sourceDatabase);
  validateKey(workspaceId, 'release-worker', operationId);
  validateDigest(priorRequestDigest, 'prior request digest');
  validateDigest(requestDigest, 'request digest');
  requireCustody(typeof verifyHandoff === 'function', 'handoff verifier is required');
  let result: ServiceOperationCustody | undefined;
  await withExclusiveServiceOperationAdmission(
    root,
    workspaceId,
    // The operation verifies the exact terminal row under this held gate;
    // it consumes no synthetic owner value from this callback.
    () => undefined,
    async (exclusive) => {
      exclusive.assertActive();
      // Held-owner observation has no write authority before receipt verification.
      const source = openUnadmittedWorkspaceDatabase(root, relative, true, true, exclusive.captureSource);
      const prior = withCleanup(
        () => {
          assertServiceOperationCustodyReady(source);
          const found = readRow(source, workspaceId, operationId);
          requireCustody(
            found !== null &&
              found.owner_kind === 'release-pack-worker' &&
              found.request_digest === priorRequestDigest &&
              found.phase === 'terminal',
            'only the exact terminal pack owner can hand off',
          );
          return found;
        },
        () => exclusive.closeSource(source),
        'handoff source read and close failed',
      );
      const revision = nextRevision(prior.revision);
      const proof = await verifyHandoff(prior);
      requireCustody(proof.phase === 'prepared', 'handoff receipt is not a prepared install image');
      validateDigest(proof.evidence_digest, 'handoff install image digest');
      validateDigest(proof.handoff_digest, 'retarget receipt digest');
      exclusive.assertActive();
      const database = openUnadmittedWorkspaceDatabase(root, relative, false, true, exclusive.captureSource);
      withCleanup(
        () => {
          runShortTransaction(database, () => {
            const handedOff = database
              .query(
                'UPDATE ' +
                  serviceOperationCustodyTable() +
                  " SET owner_kind='release-worker',request_digest=?,owner_token=NULL,revision=?,phase='prepared',evidence_digest=?,handoff_digest=?,handoff_from_kind='release-pack-worker',handoff_from_phase='terminal',handoff_from_request_digest=?,handoff_from_revision=?,handoff_from_evidence_digest=? WHERE workspace_id=? AND operation_id=? AND owner_kind='release-pack-worker' AND request_digest=? AND revision=? AND phase='terminal' AND evidence_digest=?",
              )
              .run(
                requestDigest,
                revision,
                proof.evidence_digest,
                proof.handoff_digest,
                prior.request_digest,
                prior.revision,
                prior.evidence_digest,
                workspaceId,
                operationId,
                prior.request_digest,
                prior.revision,
                prior.evidence_digest,
              );
            requireCustody(handedOff.changes === 1, 'same-operation handoff compare-and-swap failed');
          });
          result = readRow(database, workspaceId, operationId) ?? undefined;
          requireCustody(result !== undefined, 'handed-off owner row disappeared');
        },
        () => exclusive.closeSource(database),
        'handoff CAS and close failed',
      );
    },
  );
  requireCustody(result !== undefined, 'same-operation handoff did not close');
  return result;
}

/**
 * Reconcile one exact same-operation journal under the existing gate's real EXCLUSIVE
 * lock. A verifier must return a digest-bound existing before/after/terminal receipt.
 */
export async function reconcileServiceOperationCustody(
  sourceDatabase: Database,
  root: string,
  relative: string,
  workspaceId: string,
  kind: ServiceOperationKind,
  operationId: string,
  requestDigest: string,
  verifyReceipt: (row: ServiceOperationCustody) => Promise<ServiceOperationProof> | ServiceOperationProof,
): Promise<ServiceOperationCustody> {
  assertServiceDatabaseBinding(sourceDatabase, root, relative, workspaceId);
  closeServiceOperationDatabase(sourceDatabase);
  validateKey(workspaceId, kind, operationId);
  validateDigest(requestDigest, 'request digest');
  let result: ServiceOperationCustody | undefined;
  await withExclusiveServiceOperationAdmission(
    root,
    workspaceId,
    (sourceOwner) => {
      const database = openUnadmittedWorkspaceDatabase(root, relative, true, true, sourceOwner.captureSource);
      let prior: ServiceOperationCustody | null = null;
      return withCleanup(
        () => {
          assertServiceOperationCustodyReady(database);
          prior = readRow(database, workspaceId, operationId);
          requireCustody(
            prior !== null &&
              prior.owner_kind === kind &&
              prior.request_digest === requestDigest &&
              ['launching', 'in_flight', 'unknown'].includes(prior.phase),
            'same-operation reconciliation is not applicable',
          );
          return prior;
        },
        () => sourceOwner.closeSource(database),
        'reconciliation source read and close failed',
      );
    },
    async (exclusive) => {
      exclusive.assertActive();
      const row = exclusive.owner as ServiceOperationCustody;
      const revision = nextRevision(row.revision);
      let proof: ServiceOperationProof;
      try {
        proof = await verifyReceipt(row);
        requireCustody(['prepared', 'terminal'].includes(proof.phase), 'existing operation receipt is unresolved');
        validateDigest(proof.evidence_digest, 'existing operation receipt digest');
        if (row.phase === 'launching' && proof.phase === 'prepared')
          requireCustody(
            proof.evidence_digest === row.evidence_digest,
            'launch revocation does not match the exact prepared beforeimage',
          );
      } catch (error) {
        const cleanupErrors: unknown[] = [];
        let database: Database | undefined;
        try {
          exclusive.assertActive();
          const opened = openUnadmittedWorkspaceDatabase(root, relative, false, true, exclusive.captureSource);
          database = opened;
          runShortTransaction(opened, () => {
            const unknown = opened
              .query(
                'UPDATE ' +
                  serviceOperationCustodyTable() +
                  " SET owner_token=NULL,revision=?,phase='unknown',evidence_digest=NULL,launch_pid=NULL WHERE workspace_id=? AND owner_kind=? AND operation_id=? AND request_digest=? AND revision=? AND phase=?",
              )
              .run(revision, workspaceId, kind, operationId, requestDigest, row.revision, row.phase);
            requireCustody(unknown.changes === 1, 'UNKNOWN reconciliation compare-and-swap failed');
          });
        } catch (cleanupError) {
          cleanupErrors.push(cleanupError);
        }
        if (database !== undefined) {
          try {
            exclusive.closeSource(database);
          } catch (cleanupError) {
            cleanupErrors.push(cleanupError);
          }
        }
        if (cleanupErrors.length > 0)
          throw new AggregateError(
            [error, ...cleanupErrors],
            'reconciliation receipt failed and UNKNOWN custody cleanup is unresolved',
          );
        throw error;
      }
      exclusive.assertActive();
      const database = openUnadmittedWorkspaceDatabase(root, relative, false, true, exclusive.captureSource);
      withCleanup(
        () => {
          runShortTransaction(database, () => {
            const reconciled = database
              .query(
                'UPDATE ' +
                  serviceOperationCustodyTable() +
                  ' SET owner_token=NULL,revision=?,phase=?,evidence_digest=?,launch_pid=NULL WHERE workspace_id=? AND owner_kind=? AND operation_id=? AND request_digest=? AND revision=? AND phase=?',
              )
              .run(
                revision,
                proof.phase,
                proof.evidence_digest,
                workspaceId,
                kind,
                operationId,
                requestDigest,
                row.revision,
                row.phase,
              );
            requireCustody(reconciled.changes === 1, 'same-operation reconciliation compare-and-swap failed');
          });
          result = readRow(database, workspaceId, operationId) ?? undefined;
          requireCustody(result !== undefined, 'reconciled owner row disappeared');
        },
        () => exclusive.closeSource(database),
        'reconciliation CAS and close failed',
      );
    },
  );
  requireCustody(result !== undefined, 'same-operation reconciliation did not close');
  return result;
}
