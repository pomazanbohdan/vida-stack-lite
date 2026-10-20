import type { Database as BunDatabase } from 'bun:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
  type AgentRuntimeConfig,
  type WorkItemSelection,
} from '../../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.ts';
import {
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
  compareScopedSourceSnapshots,
  type ScopedSourceSnapshot,
} from '../../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import {
  HostStateStore,
  openHostStateDatabase,
  type WorkIdentity,
  type WorkState,
  type HostStateSnapshot,
  type CoordinationLedger,
  type StateVersion,
} from '../../src/host-state.ts';
import { admitLocalSessionWork, type LocalWorkAdmissionInput } from '../../src/orchestration/local-work-admission.ts';
import {
  MastraSessionBridge,
  type SessionBridgeSnapshot,
  type SessionBridgeRequest,
} from '../../src/orchestration/mastra-session-bridge.ts';
import {
  MastraSessionLedger,
  type MastraSessionLedgerSnapshot,
} from '../../src/orchestration/persistent-session-handoff.ts';
import type { SessionHandoffContext } from '../../src/orchestration/session-handoff.ts';
import { readSessionEngineSnapshot } from '../../src/orchestration/session-engine-snapshot.ts';
import {
  projectCurrentInitialSourceRequest,
  type InitialSourceContinuationRequest,
  type InitialSourceContinuationState,
  type InitialSourceContinuationVerifiedCurrent,
} from '../../src/orchestration/initial-source-continuation.ts';
type MastraSessionBridgeType = MastraSessionBridge;
type MastraSessionLedgerType = MastraSessionLedger;
const bundle = path.resolve(import.meta.dirname, '../..');
const initialSourceFixtureDocuments: readonly [string, string, string] = [
  'docs/PRODUCT.md',
  'docs/SYSTEM.md',
  'docs/OPERATIONS.md',
];
const documents = initialSourceFixtureDocuments;
const sha256 = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const record = (value: unknown) => JSON.stringify(value) + '\n';
export interface InitialWorkFixture {
  root: string;
  config: AgentRuntimeConfig;
  database: BunDatabase | null;
  store: HostStateStore | null;
  ledger: MastraSessionLedgerType | null;
  bridge: MastraSessionBridgeType | null;
  identity: WorkIdentity;
  input: LocalWorkAdmissionInput | null;
  documents: readonly [string, string, string];
  originalSource: ScopedSourceSnapshot;
  originalEngine: SessionBridgeSnapshot | null;
  scopePath: string;
  acceptancePath: string;
  sourceAuthorizationPath: string;
  intakePath: string;
  rawIntakePath: string;
  close: () => Promise<void>;
}
type InitialWorkResources = Pick<
  InitialWorkFixture,
  'bridge' | 'ledger' | 'database' | 'store' | 'input' | 'originalEngine'
>;
async function closeInitialWorkResources(f: InitialWorkResources) {
  const errors: unknown[] = [];
  const bridge = f.bridge;
  const ledger = f.ledger;
  const database = f.database;
  f.bridge = f.ledger = f.database = f.store = f.input = f.originalEngine = null;
  try {
    if (bridge) await bridge.close();
  } catch (error) {
    errors.push(error);
  }
  try {
    if (ledger) ledger.close();
  } catch (error) {
    errors.push(error);
  }
  try {
    if (database) database.close(true);
  } catch (error) {
    errors.push(error);
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Initial Source fixture resource close failed');
}

export function assertOwnedFixtureParent(root: string) {
  const resolved = path.resolve(root);
  const stat = lstatSync(resolved);
  const real = realpathSync(resolved);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    path.dirname(real) !== realpathSync(tmpdir()) ||
    !path.basename(real).startsWith('vida-initial-source-owned-')
  )
    throw new Error('unsafe initial-source subprocess fixture root');
  return real;
}

export async function createInitialSourceWorkFixture({
  parentRoot,
  onRoot,
}: { readonly parentRoot?: string; readonly onRoot?: (root: string) => void } = {}): Promise<InitialWorkFixture> {
  const fixtureBase = parentRoot === undefined ? tmpdir() : assertOwnedFixtureParent(parentRoot);
  const root = mkdtempSync(path.join(fixtureBase, parentRoot === undefined ? 'vida-initial-source-' : 'case-'));
  onRoot?.(root);
  let database: BunDatabase | null = null;
  let ledger: MastraSessionLedgerType | null = null;
  let bridge: MastraSessionBridgeType | null = null;
  mkdirSync(path.join(root, 'docs'), { recursive: true });
  writeFileSync(path.join(root, 'AGENTS.md'), '# Test instructions\n');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Test source map\n');
  try {
    for (const [index, relative] of documents.entries())
      writeFileSync(path.join(root, relative), 'accepted document ' + index + '\n');
    mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
    writeFileSync(
      path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
      readFileSync(path.resolve(bundle, '../../docs/agent-instructions/documentation-policy.v1.json')),
    );
    writeFileSync(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
        .replaceAll('{{REPOSITORY}}', 'initial-source-repository')
        .replaceAll('{{PROJECT}}', 'sample')
        .replaceAll('{{BUNDLE}}', 'vida-agent'),
    );
    const config = loadRuntimeConfig(root);
    mkdirSync(path.join(root, config.control.work_root), { recursive: true });
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
    database = openHostStateDatabase(
      root,
      path.posix.join(config.control.work_root, 'session-handoff.v1.sqlite'),
      workspaceId,
    );
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const id = 'initial-' + randomUUID();
    const nativeSessionHandle = 'initial-thread-' + randomUUID();
    const scopePath = '.agent/work/' + id + '/scope.json';
    const acceptancePath = '.agent/work/' + id + '/acceptance.json';
    const sourceAuthorizationPath = '.agent/work/' + id + '/source-authorization.json';
    const rawIntakePath = '.agent/work/' + id + '/local-session-intake.json';
    const intakePath = '.agent/work/' + id + '/local-session-intake.v1.json';
    mkdirSync(path.dirname(path.join(root, intakePath)), { recursive: true });
    const originalSource = snapshotDeclaredSources(requireSafeRepositoryAccess(root), documents);
    const selection: WorkItemSelection = {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project: 'sample',
      risk_flags: [],
      labels: [],
    };
    const workItem: LocalWorkAdmissionInput['workItem'] = {
      schema: 'WorkItem/v1',
      id,
      canonical_kind: selection.kind,
      intent: selection.intent,
      project_id: selection.project,
      title: 'Continue an expired initial-source work item',
      description: 'Retain the accepted task and resume its unissued read-only first action.',
      risk_flags: [],
      labels: [],
      provider: 'local',
      provider_type: 'Task',
    };
    const scope = {
      schema: 'ImplementationScope/v1',
      scope_id: 'scope-' + id,
      work_id: id,
      source_revision: originalSource.digest,
      ac_ids: ['AC-INITIAL-SOURCE'],
      allowed_paths: documents,
      implementation_paths: documents,
      documentation_paths: documents,
      changed_symbols: [],
      non_goals: ['No acceptance, configuration, intake, or approval changes'],
      acceptance_trace: ['AC-INITIAL-SOURCE'],
      behavior_trace: ['SR-INITIAL-SOURCE'],
      test_trace: ['initial-source-continuation.test.ts'],
      diagnostic_trace: ['fixture'],
      attribution: { thread_id: nativeSessionHandle, pointer: 'user:initial-source-regression' },
      owner: 'fixture',
      created_at: new Date().toISOString(),
    };
    const acceptance = {
      schema: 'AcceptanceManifest/v1',
      id: 'acceptance-' + id,
      version: 1,
      ac_ids: scope.ac_ids,
      source: documents[0],
      scope: scope.scope_id,
      source_revision: originalSource.digest,
      contracts: [
        {
          id: 'AC-INITIAL-SOURCE',
          definition: 'Continue only the same admitted work and preserve its acceptance contract.',
          sr: 'SR-INITIAL-SOURCE',
          evidence: ['accepted three-document fixture'],
        },
      ],
    };
    const runtimeCodePaths = runtimePackageCodePaths(config.runtime.bundle);
    const context: SessionHandoffContext = { work_id: id, attempt: 1, scope_digest: originalSource.digest };
    const authorization = {
      schema: 'LocalSourceWriteAuthorization/v1',
      action: 'source.write',
      user_instruction_ref: 'fixture:source-authorization',
      work_id: id,
      attempt: 1,
      scope_digest: originalSource.digest,
      config_digest: runtimeConfigDigest(config),
      workflow_id: 'task_execution',
      stage_ids: ['develop_task'],
      implementation_paths: documents,
      native_session_handle: nativeSessionHandle,
    };
    writeFileSync(path.join(root, scopePath), record(scope));
    writeFileSync(path.join(root, acceptancePath), record(acceptance));
    writeFileSync(path.join(root, sourceAuthorizationPath), record(authorization));
    writeFileSync(
      path.join(root, rawIntakePath),
      record({
        schema: 'VidaLocalSessionIntake/v1',
        work_item: workItem,
        native_session_handle: nativeSessionHandle,
        scope_path: scopePath,
        acceptance_path: acceptancePath,
        source_authorization_path: sourceAuthorizationPath,
        runtime_code_paths: runtimeCodePaths,
        route: 'R2',
        risk: 'low',
        change_kind: 'documentation',
      }),
    );
    const input: LocalWorkAdmissionInput = {
      repositoryRoot: root,
      config,
      store,
      selection,
      context,
      nativeSessionHandle,
      workItem,
      scopePath,
      acceptancePath,
      intakePath: rawIntakePath,
      sourceAuthorizationPath,
      runtimeCodePaths,
      route: 'R2',
      risk: 'low',
      changeKind: 'documentation',
    };
    const admitted = admitLocalSessionWork(input);
    ledger = new MastraSessionLedger(database, workspaceId, config, root, store);
    bridge = await MastraSessionBridge.open({
      repositoryRoot: root,
      config,
      ledger,
      projectIds: ['sample'],
      selection,
      context,
      workflowId: 'task_execution',
      workspaceId,
    });
    const engine = await bridge.start(admitted.source);
    const admittedWork = admitted.host.work;
    if (!admittedWork) throw new Error('Initial Source admission did not create Host Work');
    let fixture: InitialWorkFixture;
    fixture = {
      root,
      config,
      database,
      store,
      ledger,
      bridge,
      identity: {
        repository_id: admittedWork.binding.repository_id,
        project_ids: admittedWork.binding.project_ids,
        integrations_digest: admittedWork.binding.integrations_digest,
        work_id: id,
      },
      input,
      documents,
      originalSource: admitted.source,
      originalEngine: engine,
      scopePath,
      acceptancePath,
      sourceAuthorizationPath,
      intakePath,
      rawIntakePath,
      async close() {
        await closeInitialWorkResources(fixture);
      },
    };
    return fixture;
  } catch (error) {
    const partial = { bridge, ledger, database, store: null, input: null, originalEngine: null };
    bridge = null;
    ledger = null;
    database = null;
    try {
      await closeInitialWorkResources(partial);
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], 'Initial Source fixture setup and cleanup failed', {
        cause: error,
      });
    }
    throw error;
  }
}

export function hostStore(f: InitialWorkFixture): HostStateStore {
  if (!f.store) throw new Error('Initial Source fixture Host store is closed');
  return f.store;
}

export function hostLedger(f: InitialWorkFixture): MastraSessionLedgerType {
  if (!f.ledger) throw new Error('Initial Source fixture session ledger is closed');
  return f.ledger;
}

export function hostBridge(f: InitialWorkFixture): MastraSessionBridgeType {
  if (!f.bridge) throw new Error('Initial Source fixture session bridge is closed');
  return f.bridge;
}

export function hostDatabase(f: InitialWorkFixture): BunDatabase {
  if (!f.database) throw new Error('Initial Source fixture database is closed');
  return f.database;
}

export function admittedInput(f: InitialWorkFixture): LocalWorkAdmissionInput {
  if (!f.input) throw new Error('Initial Source fixture admission input is released');
  return f.input;
}

export function originalEngine(f: InitialWorkFixture): SessionBridgeSnapshot {
  if (!f.originalEngine) throw new Error('Initial Source fixture engine snapshot is released');
  return f.originalEngine;
}

export function workLease(work: WorkState) {
  if (!work.lease) throw new Error('Initial Source fixture Work lease is unavailable');
  return work.lease;
}

export function workRunId(work: WorkState) {
  const runId = work.execution.run_id;
  if (!runId) throw new Error('Initial Source fixture execution run id is unavailable');
  return runId;
}

export function completeHostState(snapshot: HostStateSnapshot): HostStateSnapshot & {
  work: WorkState;
  ledger: CoordinationLedger;
  workVersion: StateVersion;
  ledgerVersion: StateVersion;
} {
  const { work, ledger, workVersion, ledgerVersion } = snapshot;
  if (!work || !ledger || !workVersion || !ledgerVersion)
    throw new Error('Initial Source fixture Host state is incomplete');
  return { ...snapshot, work, ledger, workVersion, ledgerVersion };
}

export function currentJournal(f: InitialWorkFixture): MastraSessionLedgerSnapshot {
  const journal = hostLedger(f).resume(f.identity.work_id, 1);
  if (!journal) throw new Error('Initial Source fixture Journal is unavailable');
  return journal;
}

export function continuationState(f: InitialWorkFixture): InitialSourceContinuationState {
  const host = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const journal = currentJournal(f);
  return {
    work: host.work,
    ledger: host.ledger,
    journal: journal.state,
    workVersion: host.workVersion,
    ledgerVersion: host.ledgerVersion,
    journalVersion: journal.version,
    maintenanceGeneration: host.maintenanceGeneration,
  };
}

export function changeOneAcceptedDocument(f: InitialWorkFixture): ScopedSourceSnapshot {
  const relative = f.documents[1];
  writeFileSync(path.join(f.root, relative), readFileSync(path.join(f.root, relative), 'utf8') + 'authorized update\n');
  return snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
}

function currentInitialRequest(
  f: InitialWorkFixture,
  work: WorkState,
  sourceScope: ScopedSourceSnapshot,
): SessionBridgeRequest {
  const input = admittedInput(f);
  return projectCurrentInitialSourceRequest({
    repositoryRoot: f.root,
    config: f.config,
    selection: input.selection,
    workId: input.context.work_id,
    attempt: input.context.attempt,
    workflowId: 'task_execution',
    runId: workRunId(work),
    currentSourceScope: sourceScope,
  });
}

export function currentProof(
  f: InitialWorkFixture,
  state: InitialSourceContinuationState,
): InitialSourceContinuationVerifiedCurrent {
  const work = state.work;
  const input = admittedInput(f);
  const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
  const runtimeScope = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    f.config.runtime.bundle,
    runtimePackageCodePaths(f.config.runtime.bundle),
  );
  const reference = work.lifecycle.references.find(
    (entry) =>
      entry.kind === 'execution_approval' &&
      entry.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      entry.decision === 'approved' &&
      entry.disposition === 'current',
  );
  const intakeReference = work.artifacts.find(
    (entry) => entry.artifact_id === 'local-session-intake' && entry.schema === 'VidaLocalSessionIntake/v1',
  );
  if (!reference || !intakeReference)
    throw new Error('Initial Source fixture retained approval or intake reference is unavailable');
  const engine = readSessionEngineSnapshot({
    repositoryRoot: f.root,
    config: f.config,
    selection: input.selection,
    context: input.context,
    workflowId: 'task_execution',
    runId: workRunId(work),
  });
  if (!engine) throw new Error('Initial Source fixture engine snapshot is unavailable');
  return {
    configDigest: runtimeConfigDigest(f.config),
    currentRuntimeCodeDigest: runtimeScope.digest,
    currentSourceScope: sourceScope,
    sourceAuthorizationReference: reference,
    sourceAuthorizationSha256: sha256(readFileSync(path.join(f.root, reference.path))),
    intakeReference,
    intakeSha256: sha256(readFileSync(path.join(f.root, intakeReference.path))),
    priorEngineSnapshot: engine,
    currentInitialRequest: currentInitialRequest(f, work, sourceScope),
  };
}

export function initialRequest(f: InitialWorkFixture): InitialSourceContinuationRequest {
  const state = continuationState(f);
  const proof = currentProof(f, state);
  return {
    schema: 'InitialSourceContinuationRequest/v1',
    identity: f.identity,
    attempt: 1,
    nativeSessionHandle: admittedInput(f).nativeSessionHandle,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: state.journalVersion,
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    configDigest: proof.configDigest,
    priorRuntimeCodeDigest: state.work.binding.runtime_code_digest,
    currentRuntimeCodeDigest: proof.currentRuntimeCodeDigest,
    currentSourceScope: proof.currentSourceScope,
    authorizedSourceChanges: compareScopedSourceSnapshots(f.originalSource, proof.currentSourceScope),
    sourceAuthorizationReference: proof.sourceAuthorizationReference,
    sourceAuthorizationSha256: proof.sourceAuthorizationReference.sha256,
    priorEngineSnapshot: proof.priorEngineSnapshot,
    currentInitialRequest: proof.currentInitialRequest,
  };
}

export function withExpiredOwner<T>(f: InitialWorkFixture, callback: () => T) {
  const before = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const owner = before.ledger.tickets.find((ticket) => ticket.ticket_id === workLease(before.work).ticket_id);
  if (!owner || typeof owner.expires_at !== 'string')
    throw new Error('Initial Source fixture owner lease is unavailable');
  const expiresAt = owner.expires_at;
  const originalNow = Date.now;
  Date.now = () => Date.parse(expiresAt) + 1;
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  try {
    outcome = { ok: true, value: callback() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  Date.now = originalNow;
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

export async function withInitialSourceCleanup<T>(
  action: () => T | Promise<T>,
  cleanup: () => void | Promise<void>,
  description: string,
) {
  let outcome: { ok: true; value: T } | { ok: false; error: unknown };
  try {
    outcome = { ok: true, value: await action() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  try {
    await cleanup();
  } catch (cleanupError) {
    if (!outcome.ok)
      throw new AggregateError([outcome.error, cleanupError], description + ' and cleanup failed', {
        cause: outcome.error,
      });
    throw cleanupError;
  }
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}
