import { test, expect, setSystemTime } from 'bun:test';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.mjs';
import { pinnedEnvironment } from '../bin/bun.mjs';
import { Database } from 'bun:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, lstatSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  runtimePackageAccess,
  runtimePackageCodePaths,
} from '../src/config/runtime-config.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
  compareScopedSourceSnapshots,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore, openHostStateDatabase } from '../src/host-state.ts';
import { validateInitialSourceFrontierCodeRebindReceipt } from '../src/orchestration/initial-source-frontier-code-rebind.ts';
import {
  validateCompletedSourceReportRecoveryCurrentWorkJoin,
  validateCompletedSourceReportRecoveryReceipt,
} from '../src/orchestration/completed-source-report-recovery.ts';
import { admitLocalSessionWork } from '../src/orchestration/local-work-admission.ts';
import {
  MastraSessionBridge,
  buildSessionBridgeRequest,
  configuredContextForStage,
  parseSessionBridgeRequest,
  parseSessionBridgeObservation,
} from '../src/orchestration/mastra-session-bridge.ts';
import {
  MastraSessionLedger,
  openConfiguredMastraSessionLedger,
} from '../src/orchestration/persistent-session-handoff.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';
import {
  readSessionEngineSnapshot,
  readInitialSourceContinuationSessionEngineSnapshot,
} from '../src/orchestration/session-engine-snapshot.ts';
import { bindRuntimeInitialization } from '../src/runtime-initialization.ts';
import { lifecyclePreparationObservationSchema } from '../src/orchestration/final-assurance.ts';
import { run } from '../bin/run.mjs';
import {
  validateInitialSourceContinuationReceipt,
  validateInitialSourceContinuationRequest,
} from '../src/orchestration/initial-source-continuation.ts';

/** @typedef {import('bun:sqlite').Database} BunDatabase */
/** @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} AgentRuntimeConfig */
/** @typedef {import('../src/config/runtime-config.ts').WorkItemSelection} WorkItemSelection */
/** @typedef {import('../src/contracts/envelopes.ts').CoordinationLedger} CoordinationLedger */
/** @typedef {import('../src/host-state.ts').HostStateSnapshot} HostStateSnapshot */
/** @typedef {import('../src/host-state.ts').HostStateStore} HostStateStore */
/** @typedef {import('../src/host-state.ts').StateVersion} StateVersion */
/** @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity */
/** @typedef {import('../src/host-state.ts').WorkState} WorkState */
/** @typedef {import('../src/orchestration/initial-source-continuation.ts').InitialSourceContinuationRequest} InitialSourceContinuationRequest */
/** @typedef {import('../src/orchestration/initial-source-continuation.ts').InitialSourceContinuationState} InitialSourceContinuationState */
/** @typedef {import('../src/orchestration/initial-source-continuation.ts').InitialSourceContinuationVerifiedCurrent} InitialSourceContinuationVerifiedCurrent */
/** @typedef {import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindRequest} InitialSourceFrontierCodeRebindRequest */
/** @typedef {import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindVerifiedCurrent} InitialSourceFrontierCodeRebindVerifiedCurrent */
/** @typedef {import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryRequest} CompletedSourceReportRecoveryRequest */
/** @typedef {import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryVerifiedCurrent} CompletedSourceReportRecoveryVerifiedCurrent */
/** @typedef {import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryState} CompletedSourceReportRecoveryState */
/** @typedef {import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryVerifyCurrent} CompletedSourceReportRecoveryVerifyCurrent */
/** @typedef {import('../src/orchestration/local-work-admission.ts').LocalWorkAdmissionInput} LocalWorkAdmissionInput */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').MastraSessionBridge} MastraSessionBridgeType */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeRequest} SessionBridgeRequest */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation} SessionBridgeObservation */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeSnapshot} SessionBridgeSnapshot */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedger} MastraSessionLedgerType */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} MastraSessionLedgerSnapshot */
/** @typedef {import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceChange} ScopedSourceChange */
/** @typedef {import('../src/orchestration/scoped-source-snapshot.ts').ScopedSourceSnapshot} ScopedSourceSnapshot */
/** @typedef {import('../src/orchestration/session-handoff.ts').SessionHandoffContext} SessionHandoffContext */

/** @typedef {object} InitialWorkFixture
 * @property {string} root
 * @property {AgentRuntimeConfig} config
 * @property {BunDatabase | null} database
 * @property {HostStateStore | null} store
 * @property {MastraSessionLedgerType | null} ledger
 * @property {MastraSessionBridgeType | null} bridge
 * @property {WorkIdentity} identity
 * @property {LocalWorkAdmissionInput | null} input
 * @property {readonly string[]} documents
 * @property {ScopedSourceSnapshot} originalSource
 * @property {SessionBridgeSnapshot | null} originalEngine
 * @property {string} scopePath
 * @property {string} acceptancePath
 * @property {string} sourceAuthorizationPath
 * @property {string} intakePath
 * @property {string} rawIntakePath
 * @property {() => Promise<void>} close
 */

/** @typedef {Pick<InitialWorkFixture, 'bridge' | 'ledger' | 'database' | 'store' | 'input' | 'originalEngine'>} InitialWorkResources */

/** @typedef {{status: 'initial_source_continuation_applied' | 'initial_source_continuation_already_ready', continuation_id: string, request_digest: string, work_version: StateVersion, ledger_version: StateVersion, journal_version: StateVersion, rights_granted: false, accepted_result: false, runtime_acceptance: false}} InitialSourceCommandResult */

/** @typedef {{request: SessionBridgeRequest, issue_id: string, development_packet?: {implementation_constraints: readonly string[]}}} IssuedActionView */
/** @typedef {{exitCode: number | null, signal: string | null, timedOut: boolean, stderr: Uint8Array, stdout: Uint8Array, stderrTruncated: boolean, stdoutTruncated: boolean, diagnostic: string}} BoundedChildResult */

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** @type {readonly [string, string, string]} */
const documents = ['docs/PRODUCT.md', 'docs/SYSTEM.md', 'docs/OPERATIONS.md'];
/** @param {string | Uint8Array} bytes */
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} value */
const record = (value) => JSON.stringify(value) + '\n';
const fixtureChild = process.env.VIDA_INITIAL_SOURCE_FIXTURE_CHILD === '1';
const fixtureParentRoot = process.env.VIDA_INITIAL_SOURCE_FIXTURE_ROOT;
const fixtureTestFilter = process.env.VIDA_INITIAL_SOURCE_TEST_FILTER;

/** @param {InitialWorkResources} f */
async function closeInitialWorkResources(f) {
  /** @type {unknown[]} */
  const errors = [];
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

/** @param {string} root */
function assertOwnedFixtureParent(root) {
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

/** @param {string} root */
function removeOwnedFixtureParent(root) {
  const owned = assertOwnedFixtureParent(root);
  rmSync(owned, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
/**
 * @template T
 * @param {() => T | Promise<T>} action
 * @param {() => void | Promise<void>} cleanup
 * @param {string} description
 * @returns {Promise<T>}
 */
async function withCleanup(action, cleanup, description) {
  /** @type {{ok: true, value: T} | {ok: false, error: unknown}} */
  let outcome;
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

/** @template T @param {(fixture: InitialWorkFixture) => T | Promise<T>} callback @returns {Promise<T>} */
async function withInitialWork(callback) {
  const f = await makeInitialWork();
  return withCleanup(
    () => callback(f),
    () => f.close(),
    'Initial Source operation',
  );
}

/** @returns {Promise<InitialWorkFixture>} */
async function makeInitialWork() {
  if (fixtureChild && typeof fixtureParentRoot !== 'string')
    throw new Error('initial-source subprocess fixture root is missing');
  const fixtureBase = fixtureChild ? assertOwnedFixtureParent(fixtureParentRoot) : tmpdir();
  const root = mkdtempSync(path.join(fixtureBase, fixtureChild ? 'case-' : 'vida-initial-source-'));
  /** @type {BunDatabase | null} */
  let database = null;
  /** @type {MastraSessionLedgerType | null} */
  let ledger = null;
  /** @type {MastraSessionBridgeType | null} */
  let bridge = null;
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
    database = openHostStateDatabase(path.join(root, config.control.work_root, 'session-handoff.v1.sqlite'));
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
    /** @type {WorkItemSelection} */
    const selection = {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project: 'sample',
      risk_flags: [],
      labels: [],
    };
    const workItem = {
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
      test_trace: ['initial-source-continuation.test.mjs'],
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
    /** @type {SessionHandoffContext} */
    const context = { work_id: id, attempt: 1, scope_digest: originalSource.digest };
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
    /** @type {LocalWorkAdmissionInput} */
    const input = {
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
    expect(engine.step_id).toBe('wave-0');
    expect(engine.requests).toHaveLength(1);
    return {
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
        await closeInitialWorkResources(this);
      },
    };
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

/** @param {InitialWorkFixture} f @returns {HostStateStore} */
function hostStore(f) {
  if (!f.store) throw new Error('Initial Source fixture Host store is closed');
  return f.store;
}

/** @param {InitialWorkFixture} f @returns {MastraSessionLedgerType} */
function hostLedger(f) {
  if (!f.ledger) throw new Error('Initial Source fixture session ledger is closed');
  return f.ledger;
}

/** @param {InitialWorkFixture} f @returns {MastraSessionBridgeType} */
function hostBridge(f) {
  if (!f.bridge) throw new Error('Initial Source fixture session bridge is closed');
  return f.bridge;
}

/** @param {InitialWorkFixture} f @returns {BunDatabase} */
function hostDatabase(f) {
  if (!f.database) throw new Error('Initial Source fixture database is closed');
  return f.database;
}

/** @param {InitialWorkFixture} f @returns {LocalWorkAdmissionInput} */
function admittedInput(f) {
  if (!f.input) throw new Error('Initial Source fixture admission input is released');
  return f.input;
}

/** @param {InitialWorkFixture} f @returns {SessionBridgeSnapshot} */
function originalEngine(f) {
  if (!f.originalEngine) throw new Error('Initial Source fixture engine snapshot is released');
  return f.originalEngine;
}

/** @param {WorkState} work */
function workLease(work) {
  if (!work.lease) throw new Error('Initial Source fixture Work lease is unavailable');
  return work.lease;
}

/** @param {WorkState} work @returns {string} */
function workRunId(work) {
  const runId = work.execution.run_id;
  if (!runId) throw new Error('Initial Source fixture execution run id is unavailable');
  return runId;
}

/**
 * @param {HostStateSnapshot} snapshot
 * @returns {HostStateSnapshot & {work: WorkState, ledger: CoordinationLedger, workVersion: StateVersion, ledgerVersion: StateVersion}}
 */
function completeHostState(snapshot) {
  if (!snapshot.work || !snapshot.ledger || !snapshot.workVersion || !snapshot.ledgerVersion)
    throw new Error('Initial Source fixture Host state is incomplete');
  return snapshot;
}

/** @param {InitialWorkFixture} f @returns {MastraSessionLedgerSnapshot} */
function currentJournal(f) {
  const journal = hostLedger(f).resume(f.identity.work_id, 1);
  if (!journal) throw new Error('Initial Source fixture Journal is unavailable');
  return journal;
}

/** @param {InitialWorkFixture} f @returns {InitialSourceContinuationState} */
function continuationState(f) {
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

/** @param {InitialWorkFixture} f @returns {ScopedSourceSnapshot} */
function changeOneAcceptedDocument(f) {
  const relative = f.documents[1];
  writeFileSync(path.join(f.root, relative), readFileSync(path.join(f.root, relative), 'utf8') + 'authorized update\n');
  return snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
}

/** @param {InitialWorkFixture} f @param {WorkState} work @param {ScopedSourceSnapshot} sourceScope @returns {SessionBridgeRequest} */
function currentInitialRequest(f, work, sourceScope) {
  const input = admittedInput(f);
  const context = { ...input.context, scope_digest: sourceScope.digest };
  const action = sessionActionsForWave(f.config, input.selection, context, 'task_execution', 0, [])[0];
  if (!action) throw new Error('Initial Source fixture has no readonly first action');
  return buildSessionBridgeRequest({
    runId: workRunId(work),
    workflowId: 'task_execution',
    configDigest: runtimeConfigDigest(f.config),
    context,
    waveIndex: 0,
    action,
    configuredContext: configuredContextForStage(f.root, f.config, 'task_execution', action.stage_id, context),
    priorResults: [],
  });
}

/** @param {InitialWorkFixture} f @param {InitialSourceContinuationState} state @returns {InitialSourceContinuationVerifiedCurrent} */
function currentProof(f, state) {
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

/** @param {InitialWorkFixture} f @returns {InitialSourceContinuationRequest} */
function initialRequest(f) {
  const current = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const journal = currentJournal(f);
  const work = current.work;
  const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
  const authorizationReference = work.lifecycle.references.find(
    (entry) =>
      entry.kind === 'execution_approval' &&
      entry.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      entry.decision === 'approved' &&
      entry.disposition === 'current',
  );
  if (!authorizationReference)
    throw new Error('Initial Source fixture retained source-write authorization is unavailable');
  const currentRuntimeCodeDigest = snapshotRuntimePackageSources(
    runtimePackageAccess(),
    f.config.runtime.bundle,
    runtimePackageCodePaths(f.config.runtime.bundle),
  ).digest;
  return {
    schema: 'InitialSourceContinuationRequest/v1',
    identity: f.identity,
    attempt: 1,
    nativeSessionHandle: admittedInput(f).nativeSessionHandle,
    expectedWork: current.workVersion,
    expectedLedger: current.ledgerVersion,
    expectedJournal: journal.version,
    expectedMaintenanceGeneration: current.maintenanceGeneration,
    configDigest: runtimeConfigDigest(f.config),
    priorRuntimeCodeDigest: work.binding.runtime_code_digest,
    currentRuntimeCodeDigest,
    currentSourceScope: sourceScope,
    authorizedSourceChanges: compareScopedSourceSnapshots(f.originalSource, sourceScope),
    sourceAuthorizationReference: authorizationReference,
    sourceAuthorizationSha256: authorizationReference.sha256,
    priorEngineSnapshot: currentProof(f, continuationState(f)).priorEngineSnapshot,
    currentInitialRequest: currentInitialRequest(f, work, sourceScope),
  };
}

/** @template T @param {InitialWorkFixture} f @param {() => T} callback @returns {T} */
function withExpiredOwner(f, callback) {
  const before = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const owner = before.ledger.tickets.find((ticket) => ticket.ticket_id === workLease(before.work).ticket_id);
  if (!owner?.expires_at) throw new Error('Initial Source fixture owner lease is unavailable');
  const originalNow = Date.now;
  Date.now = () => Date.parse(owner.expires_at) + 1;
  /** @type {{ok: true, value: T} | {ok: false, error: unknown}} */
  let outcome;
  try {
    outcome = { ok: true, value: callback() };
  } catch (error) {
    outcome = { ok: false, error };
  }
  Date.now = originalNow;
  if (!outcome.ok) throw outcome.error;
  return outcome.value;
}

/** @param {InitialWorkFixture} f */
function holdExpiredOwnerClockForFixture(f) {
  const before = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const owner = before.ledger.tickets.find((ticket) => ticket.ticket_id === workLease(before.work).ticket_id);
  if (!owner?.expires_at) throw new Error('Initial Source fixture owner lease is unavailable');
  const originalClose = f.close;
  const expiredAt = Date.parse(owner.expires_at) + 1;
  setSystemTime(new Date(expiredAt));
  f.close = async () => {
    try {
      await originalClose.call(f);
    } finally {
      setSystemTime();
    }
  };
}

/** @template T @param {InitialWorkFixture} f @param {() => Promise<T>} callback @returns {Promise<T>} */
async function withExpiredOwnerAsync(f, callback) {
  const before = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const owner = before.ledger.tickets.find((ticket) => ticket.ticket_id === workLease(before.work).ticket_id);
  if (!owner?.expires_at) throw new Error('Initial Source fixture owner lease is unavailable');
  const originalNow = Date.now;
  Date.now = () => Date.parse(owner.expires_at) + 1;
  return withCleanup(
    callback,
    () => {
      Date.now = originalNow;
    },
    'Initial Source owner clock restoration',
  );
}

/** @param {InitialWorkFixture} f @returns {Promise<void>} */
async function bindFixtureRuntimeInitialization(f) {
  const packageAccess = runtimePackageAccess();
  /** @type {readonly (readonly [string, string])[]} */
  const templates = [
    ['templates/AGENTS.template.md', 'AGENTS.md'],
    ['templates/AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
    ['templates/agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
    ['templates/documentation-policy.template.v1.json', 'docs/agent-instructions/documentation-policy.v1.json'],
  ];
  const receipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    provenance: 'generated',
    repository_id: f.config.repository.repository_id,
    project_ids: f.config.projects
      .map((project) => project.project_id)
      .sort((left, right) => left.localeCompare(right)),
    integrations_digest: canonicalJsonDigest(f.config.integrations),
    workspace_id: deriveWorkspaceId(f.config.repository.repository_id, f.root),
    workspace_binding_status: 'pending',
    bundle: f.config.runtime.bundle,
    config_digest: runtimeConfigDigest(f.config),
    schema_sha256: sha256(packageAccess.readBytes('schemas/runtime-initialization.v1.schema.json')),
    templates: templates.map(([template, output]) => ({
      template,
      template_sha256: sha256(packageAccess.readBytes(template)),
      output,
      output_sha256: sha256(readFileSync(path.join(f.root, output))),
    })),
    created_at: new Date().toISOString(),
  };
  const receiptPath = path.join(f.root, '.agent', 'runtime-initialization.v1.json');
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, record(receipt));
  await bindRuntimeInitialization(f.root, hostStore(f));
}

/** @param {InitialWorkFixture} f @param {string} scopeDigest @returns {string[]} */
function initialSourceRunArgs(f, scopeDigest) {
  const projectId = f.identity.project_ids[0];
  if (!projectId) throw new Error('Initial Source fixture has no project binding');
  const selection = admittedInput(f).selection;
  return [
    '--project-root',
    f.root,
    '--repository',
    f.config.repository.repository_id,
    '--project',
    projectId,
    '--work-path',
    f.documents[0],
    '--work-id',
    f.identity.work_id,
    '--attempt',
    '1',
    '--scope-digest',
    scopeDigest,
    '--team',
    selection.team,
    '--kind',
    selection.kind,
    '--intent',
    selection.intent,
    '--workflow',
    'task_execution',
  ];
}

/** @param {StateVersion} version @returns {string[]} */
function expectedRunVersion(version) {
  return ['--expected-revision', String(version.revision), '--expected-digest', version.digest];
}

/** @param {unknown} value @param {string} label @returns {Record<string, unknown>} */
function requireRecord(value, label) {
  if (!isPlainRecord(value)) throw new Error(label + ' must be a plain record');
  return value;
}

/** @param {string} filePath @returns {unknown} */
function readJsonFixture(filePath) {
  /** @type {unknown} */
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
  return parsed;
}

/** @param {unknown} value @param {string} label @returns {string} */
function requireString(value, label) {
  if (typeof value !== 'string') throw new Error(label + ' must be a string');
  return value;
}

/** @param {unknown} value @param {string} label @returns {StateVersion} */
function requireStateVersion(value, label) {
  const version = requireRecord(value, label);
  if (
    typeof version.revision !== 'number' ||
    !Number.isSafeInteger(version.revision) ||
    version.revision < 1 ||
    typeof version.digest !== 'string' ||
    !/^[a-f0-9]{64}$/.test(version.digest)
  )
    throw new Error(label + ' is not a valid state version');
  return { revision: version.revision, digest: version.digest };
}

/** @param {unknown} value @param {string} label @returns {unknown[]} */
function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(label + ' must be an array');
  return /** @type {unknown[]} */ (value);
}

/** @template T @param {readonly T[]} values @param {string} label @returns {T} */
function firstValue(values, label) {
  const value = values[0];
  if (value === undefined) throw new Error(label + ' is empty');
  return value;
}

/** @param {unknown} value @param {string} label @returns {SessionBridgeRequest[]} */
function parsePendingRequests(value, label) {
  return requireArray(value, label).map((entry, index) => {
    const action = requireRecord(entry, label + '[' + index + ']');
    return parseSessionBridgeRequest(action.request);
  });
}

/** @param {unknown} value @param {string} label @returns {IssuedActionView[]} */
function parseIssuedActions(value, label) {
  return requireArray(value, label).map((entry, index) => {
    const action = requireRecord(entry, label + '[' + index + ']');
    const request = parseSessionBridgeRequest(action.request);
    const issueId = requireString(action.issue_id, label + '[' + index + '].issue_id');
    if (action.development_packet === undefined) return { request, issue_id: issueId };
    const packet = requireRecord(action.development_packet, label + '[' + index + '].development_packet');
    const constraints = requireArray(
      packet.implementation_constraints,
      label + '[' + index + '].implementation_constraints',
    ).map((constraint, constraintIndex) =>
      requireString(constraint, label + '[' + index + '].implementation_constraints[' + constraintIndex + ']'),
    );
    return { request, issue_id: issueId, development_packet: { implementation_constraints: constraints } };
  });
}

/** @param {readonly string[]} args @returns {Promise<unknown>} */
async function runAgent(args) {
  /** @type {unknown} */
  const result = await run([...args]);
  return result;
}

/** @param {unknown} value @param {InitialWorkFixture} f */
function parseInitialSourceInspection(value, f) {
  const result = requireRecord(value, 'initial-source inspect result');
  if (
    result.status !== 'initial_source_continuation_ready' ||
    result.next_operation !== 'apply' ||
    result.rights_granted !== false ||
    result.accepted_result !== false ||
    result.runtime_acceptance !== false
  )
    throw new Error('initial-source inspect result has an invalid status or grants a result/right');
  return {
    status: 'initial_source_continuation_ready',
    next_operation: 'apply',
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
    request: validateInitialSourceContinuationRequest(result.request, continuationState(f), f.config),
  };
}

/** @param {unknown} value @param {InitialSourceCommandResult['status']} expectedStatus @returns {InitialSourceCommandResult} */
function parseInitialSourceCommandResult(value, expectedStatus) {
  const result = requireRecord(value, 'initial-source command result');
  if (
    result.status !== expectedStatus ||
    result.rights_granted !== false ||
    result.accepted_result !== false ||
    result.runtime_acceptance !== false
  )
    throw new Error('initial-source command result has an invalid status or grants a result/right');
  return {
    status: expectedStatus,
    continuation_id: requireString(result.continuation_id, 'continuation_id'),
    request_digest: requireString(result.request_digest, 'request_digest'),
    work_version: requireStateVersion(result.work_version, 'work_version'),
    ledger_version: requireStateVersion(result.ledger_version, 'ledger_version'),
    journal_version: requireStateVersion(result.journal_version, 'journal_version'),
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
  };
}

/** @param {unknown} value @returns {BoundedChildResult} */
function parseBoundedChildResult(value) {
  const result = requireRecord(value, 'Initial Source subprocess result');
  const exitCode = result.exitCode;
  const signal = result.signal;
  if (
    (exitCode !== null && (typeof exitCode !== 'number' || !Number.isSafeInteger(exitCode))) ||
    (signal !== null && typeof signal !== 'string') ||
    typeof result.timedOut !== 'boolean' ||
    !(result.stderr instanceof Uint8Array) ||
    !(result.stdout instanceof Uint8Array) ||
    typeof result.stderrTruncated !== 'boolean' ||
    typeof result.stdoutTruncated !== 'boolean' ||
    typeof result.diagnostic !== 'string'
  )
    throw new Error('Initial Source subprocess result has an invalid shape');
  return {
    exitCode,
    signal,
    timedOut: result.timedOut,
    stderr: result.stderr,
    stdout: result.stdout,
    stderrTruncated: result.stderrTruncated,
    stdoutTruncated: result.stdoutTruncated,
    diagnostic: result.diagnostic,
  };
}

/** @param {Promise<unknown>} pending @param {RegExp} pattern @returns {Promise<void>} */
async function expectRejectedMessage(pending, pattern) {
  let rejected = false;
  /** @type {unknown} */
  let rejection;
  try {
    await pending;
  } catch (error) {
    rejected = true;
    rejection = error;
  }
  if (!rejected) throw new Error('Expected the operation to reject with ' + pattern);
  if (!(rejection instanceof Error) || !pattern.test(rejection.message))
    throw new Error('The operation rejected with an unexpected error', { cause: rejection });
}

/** @param {InitialWorkFixture} f @param {InitialSourceContinuationRequest} request @param {boolean} [expire] */
function expectNoChange(f, request, expire = true) {
  const beforeHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const beforeJournal = currentJournal(f);
  const invoke = () => hostStore(f).continueInitialSource(request, (state) => currentProof(f, state));
  expect(() => (expire ? withExpiredOwner(f, invoke) : invoke())).toThrow();
  expect(completeHostState(hostStore(f).readHostStateSnapshot(f.identity))).toEqual(beforeHost);
  expect(currentJournal(f)).toEqual(beforeJournal);
  expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toBeNull();
}

if (!fixtureChild) {
  test('runs the initial-source Host fixtures in an owned subprocess', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-initial-source-owned-'));
    let terminalObserved = false;
    await withCleanup(
      async () => {
        const resultValue = /** @type {unknown} */ (
          await runBoundedSubprocess(
            process.execPath,
            [
              'test',
              '--timeout',
              '60000',
              ...(fixtureTestFilter ? ['--test-name-pattern', fixtureTestFilter] : []),
              fileURLToPath(import.meta.url),
            ],
            {
              cwd: bundle,
              env: {
                ...pinnedEnvironment(process.execPath, process.env, bundle),
                VIDA_INITIAL_SOURCE_FIXTURE_CHILD: '1',
                VIDA_INITIAL_SOURCE_FIXTURE_ROOT: root,
              },
              timeoutMs: 180_000,
            },
          )
        );
        const result = parseBoundedChildResult(resultValue);
        terminalObserved = result.exitCode !== null || result.signal !== null;
        process.stderr.write(result.stderr);
        if (result.timedOut || result.exitCode !== 0 || result.signal)
          throw new Error(subprocessFailure('initial-source fixture subprocess', result));
        return result;
      },
      () => {
        if (!terminalObserved) throw new Error('Initial Source child outcome is unknown; fixture retained at ' + root);
        removeOwnedFixtureParent(root);
      },
      'Initial Source subprocess',
    );
  }, 190_000);
}

const registerFixtureTest = fixtureChild ? test : () => {};
/**
 * Reuse the real admitted-work/initial-continuation/same-run synthesis path and
 * stop at the current unissued wave-1 frontier. This is shared by the existing
 * CLI regression and the Host-only code-rebind tests.
 * @param {InitialWorkFixture} f
 */
async function prepareInitialSourceWaveOne(f) {
  const currentSource = changeOneAcceptedDocument(f);
  const requestPath = '.agent/work/' + f.identity.work_id + '/initial-source-continuation.json';
  writeFileSync(
    path.join(f.root, requestPath),
    record({
      identity: f.identity,
      attempt: 1,
      nativeSessionHandle: admittedInput(f).nativeSessionHandle,
    }),
  );
  const inspectArgs = [
    '--continue-initial-source',
    'true',
    '--mode',
    'inspect',
    '--project-root',
    f.root,
    '--request',
    requestPath,
  ];
  const inspected = await withExpiredOwnerAsync(f, async () =>
    parseInitialSourceInspection(await runAgent(inspectArgs), f),
  );
  expect(inspected.status).toBe('initial_source_continuation_ready');
  expect(inspected.next_operation).toBe('apply');
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.accepted_result).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(inspected.request.configDigest).toBe(runtimeConfigDigest(f.config));
  const request = inspected.request;
  writeFileSync(path.join(f.root, requestPath), record(request));
  expect(request.authorizedSourceChanges.map((change) => change.path)).toEqual([f.documents[1]]);
  expect(request.currentInitialRequest.stage_id).toBe('synthesize_task');
  expect(request.currentInitialRequest.wave_index).toBe(0);
  const originalRequest = firstValue(originalEngine(f).requests, 'Original Initial Source engine request');
  expect(originalRequest.stage_id).toBe('synthesize_task');
  expect(originalEngine(f).observations).toEqual([]);
  expect(request.currentRuntimeCodeDigest).toBe(request.priorRuntimeCodeDigest);
  expect(request.currentSourceScope.digest).toBe(currentSource.digest);
  const beforeHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
  const retainedPaths = [f.scopePath, f.acceptancePath, f.sourceAuthorizationPath, f.intakePath, f.rawIntakePath];
  const retainedBytes = retainedPaths.map((relative) => readFileSync(path.join(f.root, relative)));
  const intakeBytes = retainedBytes[3];
  if (!intakeBytes) throw new Error('Initial Source fixture intake beforeimage is unavailable');
  const intakeBefore = canonicalJsonDigest(JSON.parse(intakeBytes.toString('utf8')));
  const applied = parseInitialSourceCommandResult(
    await withExpiredOwnerAsync(f, () =>
      runAgent([
        '--continue-initial-source',
        'true',
        '--mode',
        'apply',
        '--project-root',
        f.root,
        '--request',
        requestPath,
      ]),
    ),
    'initial_source_continuation_applied',
  );
  expect(applied.status).toBe('initial_source_continuation_applied');
  expect(applied.rights_granted).toBe(false);
  expect(applied.accepted_result).toBe(false);
  expect(applied.runtime_acceptance).toBe(false);
  const storedReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
  if (!storedReceipt) throw new Error('Initial Source continuation receipt was not retained');
  const receipt = validateInitialSourceContinuationReceipt(storedReceipt);
  const priorRunId = workRunId(receipt.prior_work);
  expect(receipt.status).toBe('initial_request_ready');
  expect(receipt.rights_granted).toBe(false);
  expect(receipt.accepted_result).toBe(false);
  expect(receipt.runtime_acceptance).toBe(false);
  expect(receipt.prior_work).toEqual(beforeHost.work);
  expect(receipt.successor_work.binding.lifecycle_work_id).toBe(request.identity.work_id);
  expect(receipt.successor_work.binding.workflow_id).toBe(beforeHost.work.binding.workflow_id);
  expect(receipt.successor_work.binding.scope_id).toBe(beforeHost.work.binding.scope_id);
  expect(receipt.successor_work.binding.ac_ids).toEqual(beforeHost.work.binding.ac_ids);
  expect(workRunId(receipt.successor_work)).toBe(workRunId(beforeHost.work));
  expect(receipt.successor_work.execution.assignment_attempts).toEqual([]);
  expect(workLease(receipt.successor_work).thread_id).toBe(request.nativeSessionHandle);
  expect(workLease(receipt.successor_work).ticket_id).not.toBe(workLease(beforeHost.work).ticket_id);
  expect(receipt.successor_journal.completed).toEqual([]);
  expect(receipt.successor_journal.items).toHaveLength(1);
  const continuedItem = firstValue(receipt.successor_journal.items, 'Continued Initial Source Journal item');
  expect(continuedItem.request).toEqual(request.currentInitialRequest);
  expect(continuedItem.issue_id).toBeNull();
  expect(continuedItem.observation).toBeNull();
  const lastRebind = receipt.successor_ledger.rebinds.at(-1);
  if (!lastRebind) throw new Error('Initial Source continuation rebind record is missing');
  expect(lastRebind.resources).toEqual(['execution:' + request.identity.work_id]);
  for (const [index, relative] of retainedPaths.entries())
    expect(readFileSync(path.join(f.root, relative))).toEqual(retainedBytes[index]);
  expect(canonicalJsonDigest(JSON.parse(readFileSync(path.join(f.root, f.intakePath), 'utf8')))).toBe(intakeBefore);
  expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(receipt);

  await hostBridge(f).close();
  f.bridge = null;
  hostLedger(f).close();
  f.ledger = null;
  const receiptLedger = openConfiguredMastraSessionLedger(f.root);
  f.ledger = receiptLedger;
  f.store = receiptLedger.hostState;
  expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(receipt);
  const retry = parseInitialSourceCommandResult(
    await runAgent([
      '--continue-initial-source',
      'true',
      '--mode',
      'apply',
      '--project-root',
      f.root,
      '--request',
      requestPath,
    ]),
    'initial_source_continuation_already_ready',
  );
  expect(retry.status).toBe('initial_source_continuation_already_ready');
  expect(retry.continuation_id).toBe(receipt.continuation_id);
  expect(retry.request_digest).toBe(receipt.request_digest);
  expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(receipt);

  const reopenedContext = { ...admittedInput(f).context, scope_digest: currentSource.digest };
  const reopenedBridge = await MastraSessionBridge.open({
    repositoryRoot: f.root,
    config: f.config,
    ledger: hostLedger(f),
    projectIds: f.identity.project_ids,
    selection: admittedInput(f).selection,
    context: reopenedContext,
    workflowId: 'task_execution',
    workspaceId: deriveWorkspaceId(f.config.repository.repository_id, f.root),
    initialSourceContinuation: { identity: f.identity, attempt: 1 },
  });
  f.bridge = reopenedBridge;
  const reopened = await hostBridge(f).snapshot();
  expect(reopened).toMatchObject({
    run_id: priorRunId,
    status: 'suspended',
    step_id: 'wave-0',
    requests: [request.currentInitialRequest],
    observations: [],
  });

  await bindFixtureRuntimeInitialization(f);
  const args = initialSourceRunArgs(f, currentSource.digest);
  await hostBridge(f).close();
  f.bridge = null;
  hostLedger(f).close();
  f.ledger = null;
  hostDatabase(f).close(true);
  f.database = null;
  f.store = null;

  const prepared = requireRecord(await runAgent(args), 'initial Source workflow preparation');
  expect(requireString(prepared.mastra_run_id, 'prepared mastra_run_id')).toBe(priorRunId);
  expect(requireString(prepared.mastra_step_id, 'prepared mastra_step_id')).toBe('wave-0');
  expect(requireString(prepared.source_snapshot_digest, 'prepared source_snapshot_digest')).toBe(currentSource.digest);
  const preparedStateVersion = requireStateVersion(prepared.state_version, 'prepared state_version');
  const preparedAction = firstValue(
    parsePendingRequests(prepared.next_actions, 'prepared next_actions'),
    'prepared next_actions',
  );
  expect(preparedAction).toEqual(request.currentInitialRequest);

  const issued = requireRecord(
    await runAgent([...args, ...expectedRunVersion(preparedStateVersion), '--issue-wave', 'true']),
    'initial Source first-wave issue',
  );
  expect(requireString(issued.status, 'issued status')).toBe('wave_issued');
  expect(requireString(issued.mastra_run_id, 'issued mastra_run_id')).toBe(priorRunId);
  const issuedStateVersion = requireStateVersion(issued.state_version, 'issued state_version');
  const issuedActions = parseIssuedActions(issued.issued_actions, 'issued actions');
  expect(issuedActions).toHaveLength(1);
  const issuedAction = firstValue(issuedActions, 'issued actions');
  expect(issuedAction.request).toEqual(request.currentInitialRequest);
  const firstIssueId = issuedAction.issue_id;
  await expectRejectedMessage(
    runAgent([...args, ...expectedRunVersion(issuedStateVersion), '--issue-wave', 'true']),
    /Initial Source continuation has an issued action with unknown outcome; automatic reissue is forbidden/,
  );

  const unknownOutcomeLedger = openConfiguredMastraSessionLedger(f.root);
  f.ledger = unknownOutcomeLedger;
  f.store = unknownOutcomeLedger.hostState;
  let journal = currentJournal(f);
  expect(journal.state.run_id).toBe(priorRunId);
  expect(journal.state.items).toHaveLength(1);
  const unresolvedItem = firstValue(journal.state.items, 'Issued unknown Initial Source Journal item');
  expect(unresolvedItem.issue_id).toBe(firstIssueId);
  expect(unresolvedItem.observation).toBeNull();
  hostLedger(f).close();
  f.ledger = null;
  f.store = null;

  const summary = 'Current accepted AC synthesized into a DevelopmentTaskPacket for the prewriter review.';
  /** @type {SessionBridgeObservation} */
  const observation = {
    schema: 'VidaSessionObservation/v1',
    action_id: issuedAction.request.action_id,
    issue_id: firstIssueId,
    agent_id: 'fixture:research-synthesizer',
    tool_call_ref: 'fixture:initial-source-task-synthesis',
    status: 'reported_complete',
    summary,
    output_digest: canonicalJsonDigest(summary),
    evidence_refs: ['fixture://initial-source-task-synthesis'],
  };
  const reportPath = path.join(f.root, '.agent', 'work', f.identity.work_id, 'initial-source-synthesis-report.json');
  writeFileSync(reportPath, record(observation));
  const reported = requireRecord(
    await runAgent([...args, ...expectedRunVersion(issuedStateVersion), '--report', reportPath]),
    'reported initial synthesis',
  );
  expect(requireString(reported.status, 'reported status')).toBe('resumed');
  expect(requireString(reported.mastra_run_id, 'reported mastra_run_id')).toBe(priorRunId);
  expect(requireString(reported.mastra_step_id, 'reported mastra_step_id')).not.toBe('wave-0');
  const reportedStateVersion = requireStateVersion(reported.state_version, 'reported state_version');
  const reportedRequests = parsePendingRequests(reported.next_actions, 'reported next_actions');
  expect(reportedRequests.length).toBeGreaterThan(0);
  expect(firstValue(reportedRequests, 'reported next_actions').stage_id).toBe('review_source_prewrite');

  const reopenedLedger = openConfiguredMastraSessionLedger(f.root);
  f.ledger = reopenedLedger;
  f.store = reopenedLedger.hostState;
  const waveOne = currentJournal(f);
  const frontier = firstValue(waveOne.state.items, 'Current unissued Initial Source wave-1 frontier');
  expect(frontier.request.wave_index).toBe(1);
  expect(waveOne.state.items.length).toBeGreaterThan(0);
  for (const item of waveOne.state.items) {
    expect(item.issue_id).toBeNull();
    expect(item.observation).toBeNull();
    expect(item.host_reservation).toBeUndefined();
    const stage = f.config.workflows[item.request.workflow_id]?.stages.find(
      (candidate) => candidate.id === item.request.stage_id,
    );
    expect(stage).toBeDefined();
    for (const assignment of stage.assignments) {
      const profile = f.config.agents.profiles[assignment.profile];
      expect(profile?.mutation_scope).toBe('none');
      expect(f.config.agents.tool_policies[profile.tools_policy]?.source_write).toBe(false);
    }
  }
  return {
    currentSource,
    requestPath,
    request,
    receipt,
    priorRunId,
    args,
    reportedStateVersion,
    reportedRequests,
    summary,
    observation,
  };
}

/** @param {InitialWorkFixture} f @returns {InitialSourceFrontierCodeRebindRequest} */
function frontierCodeRequest(f) {
  const state = continuationState(f);
  const receipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
  if (!receipt) throw new Error('Initial Source frontier fixture receipt is unavailable');
  const action = firstValue(state.journal.items, 'Initial Source readonly frontier action');
  const runtimeCodePaths = [...runtimePackageCodePaths(f.config.runtime.bundle)].sort();
  const sourceScope = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
  const newRuntimeCodeDigest = canonicalJsonDigest({
    fixtureOnly: 'trusted-host-seam; not an installed-code claim',
    prior: state.work.binding.runtime_code_digest,
    work: f.identity.work_id,
  });
  return {
    schema: 'InitialSourceFrontierCodeRebindRequest/v1',
    identity: f.identity,
    attempt: 1,
    actionId: action.request.action_id,
    nativeSessionHandle: receipt.request.nativeSessionHandle,
    leaseGeneration: workLease(state.work).generation,
    expectedWork: state.workVersion,
    expectedLedger: state.ledgerVersion,
    expectedJournal: state.journalVersion,
    expectedMaintenanceGeneration: state.maintenanceGeneration,
    initialContinuationId: receipt.continuation_id,
    initialContinuationRequestDigest: receipt.request_digest,
    configDigest: runtimeConfigDigest(f.config),
    sourceScopeDigest: sourceScope.digest,
    oldRuntimeCodeDigest: state.work.binding.runtime_code_digest,
    newRuntimeCodeDigest,
    runtimeCodePaths,
    parentManifestRef: '.tmp/fixture/qualified-parent-native-manifest.json',
    parentManifestDigest: canonicalJsonDigest('fixture-qualified-parent'),
    successorManifestRef: '.tmp/fixture/qualified-successor-native-manifest.json',
    successorManifestDigest: canonicalJsonDigest('fixture-qualified-successor'),
    systemUpdateRef: '.tmp/fixture/system-update-result.json',
    systemUpdateOperationId: 'fixture-system-update-operation',
    nativeSelfAttestationDigest: canonicalJsonDigest('fixture-native-self-attestation'),
  };
}

/** @param {InitialSourceFrontierCodeRebindRequest} request @returns {InitialSourceFrontierCodeRebindVerifiedCurrent} */
function fixtureFrontierProof(request) {
  // This injected verifier seam is a Host fixture only; it does not establish
  // installed bytes, a qualified native endpoint, or native self-attestation.
  return {
    runtimeCodePaths: request.runtimeCodePaths,
    oldRuntimeCodeDigest: request.oldRuntimeCodeDigest,
    newRuntimeCodeDigest: request.newRuntimeCodeDigest,
    parentManifestRef: request.parentManifestRef,
    parentManifestDigest: request.parentManifestDigest,
    successorManifestRef: request.successorManifestRef,
    successorManifestDigest: request.successorManifestDigest,
    systemUpdateRef: request.systemUpdateRef,
    systemUpdateOperationId: request.systemUpdateOperationId,
    nativeSelfAttestationDigest: request.nativeSelfAttestationDigest,
  };
}

/** @param {InitialWorkFixture} f @param {InitialSourceFrontierCodeRebindVerifiedCurrent} proof
 * @returns {import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindVerifyCurrent} */
function trustedHostFixtureVerifier(f, proof) {
  return (request, state) => {
    const initial = state.initialReceipt;
    if (
      request.initialContinuationId !== initial.continuation_id ||
      request.initialContinuationRequestDigest !== initial.request_digest ||
      request.nativeSessionHandle !== initial.request.nativeSessionHandle
    )
      throw new Error('fixture Host verifier: continuation history or owner changed');
    if (runtimeConfigDigest(loadRuntimeConfig(f.root)) !== request.configDigest)
      throw new Error('fixture Host verifier: current config changed');
    const source = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
    if (source.digest !== request.sourceScopeDigest)
      throw new Error('fixture Host verifier: current Source scope changed');
    if (
      snapshotRuntimePackageSources(runtimePackageAccess(), f.config.runtime.bundle, request.runtimeCodePaths)
        .digest !== request.oldRuntimeCodeDigest
    )
      throw new Error('fixture Host verifier: prior runtime code changed');
    const authorization = initial.request.sourceAuthorizationReference;
    if (sha256(readFileSync(path.join(f.root, authorization.path))) !== initial.request.sourceAuthorizationSha256)
      throw new Error('fixture Host verifier: source permission changed');
    // The endpoint proof is an injected Host test seam; it is not verified
    // against installed target bytes and proves no native qualification.
    return proof;
  };
}

/** @typedef {object} CompletedSourceReportRecoveryFixture
 * @property {CompletedSourceReportRecoveryRequest} request
 * @property {string} reportPath
 * @property {CompletedSourceReportRecoveryVerifyCurrent} verifyCurrent
 */

/** @param {InitialWorkFixture} f
 * @param {ReturnType<typeof parseIssuedActions>[number]} writer
 * @param {string} writerAttemptId
 * @param {SessionBridgeObservation} observation
 * @param {ScopedSourceSnapshot} sourceBefore
 * @param {ScopedSourceSnapshot} sourceAfter
 * @param {import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindReceipt | null} frontierReceipt
 * @param {string} reportPath
 * @returns {CompletedSourceReportRecoveryFixture}
 */
function completedSourceReportRecoveryFixture(
  f,
  writer,
  writerAttemptId,
  observation,
  sourceBefore,
  sourceAfter,
  frontierReceipt,
  reportPath,
) {
  const before = continuationState(f),
    initialReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1),
    journalBefore = currentJournal(f),
    pending = journalBefore.state.items.find((item) => item.request.action_id === writer.request.action_id),
    workDirectory = '.agent/work/' + f.identity.work_id,
    sourceSnapshotRef = workDirectory + '/completed-source-snapshot.fixture.json',
    sourceDiffRef = workDirectory + '/completed-source-diff.fixture.json',
    commandReceiptRef = workDirectory + '/completed-source-command.fixture.json',
    reportRef = path.relative(f.root, reportPath).split(path.sep).join('/');
  if (!initialReceipt || !pending?.host_reservation || !journalBefore.state.source_scope)
    throw new Error('Completed Source report fixture lacks its original receipt, reservation or Journal scope');
  if (journalBefore.state.source_scope.digest !== sourceBefore.digest)
    throw new Error('Completed Source report fixture original Journal scope changed');
  const sourceDiff = [...compareScopedSourceSnapshots(sourceBefore, sourceAfter)].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    changedPaths = sourceDiff.map((change) => change.path).sort((left, right) => left.localeCompare(right)),
    reportSourcePaths = [...(observation.changed_paths ?? [])].sort((left, right) => left.localeCompare(right)),
    nextJournal = {
      ...journalBefore.state,
      source_scope: sourceAfter,
      items: journalBefore.state.items.map((item) =>
        item.request.action_id === observation.action_id ? { ...item, observation } : item,
      ),
    };
  if (pending.issue_id !== writer.issue_id || writerAttemptId !== pending.host_reservation.receipt.attempt.attempt_id)
    throw new Error('Completed Source report fixture writer IDs differ');
  if (canonicalJsonDigest(reportSourcePaths) !== canonicalJsonDigest(changedPaths))
    throw new Error('Completed Source report fixture changed paths differ from the exact report');

  const currentRuntimeCodePaths = [...runtimePackageCodePaths(f.config.runtime.bundle)].sort(),
    currentRuntime = snapshotRuntimePackageSources(
      runtimePackageAccess(),
      f.config.runtime.bundle,
      currentRuntimeCodePaths,
    ),
    systemUpdateOperationId = 'fixture-host-only-update-' + writer.request.action_id,
    currentManifestRef = 'fixture://host-only/current-manifest',
    currentInstallRef = 'fixture://host-only/current-install-marker',
    systemUpdateRef = 'fixture://host-only/system-update-marker',
    currentManifestDigest = canonicalJsonDigest({
      fixture_only: true,
      not_native_manifest: true,
      code_digest: currentRuntime.digest,
      code_paths: currentRuntimeCodePaths,
    }),
    nativeSelfAttestationDigest = canonicalJsonDigest({
      fixture_only: true,
      not_native_attestation: true,
      code_digest: currentRuntime.digest,
      systemUpdateOperationId,
    }),
    oldManifestRef = frontierReceipt?.record.request.successorManifestRef ?? 'fixture://host-only/prior-manifest',
    oldManifestDigest =
      frontierReceipt?.record.request.successorManifestDigest ??
      canonicalJsonDigest({
        fixture_only: true,
        not_native_manifest: true,
        prior_code_digest: before.work.binding.runtime_code_digest,
        prior_code_paths: currentRuntimeCodePaths,
      }),
    oldInstallRef = frontierReceipt?.record.request.systemUpdateRef ?? 'fixture://host-only/prior-install-marker';
  if (!frontierReceipt && before.work.binding.runtime_code_digest !== currentRuntime.digest)
    throw new Error('Expiry-only fixture must retain the actual current runtime code binding');
  // The callback proves only Host field binding against real fixture Source and
  // package bytes. Fixture endpoint labels do not attest to a native install.
  writeFileSync(path.join(f.root, sourceSnapshotRef), record(sourceAfter));
  writeFileSync(path.join(f.root, sourceDiffRef), record(sourceDiff));

  const reportId = observation.tool_call_ref,
    reportDigest = canonicalJsonDigest(observation),
    sourceDiffDigest = canonicalJsonDigest(sourceDiff),
    request = {
      schema: 'CompletedSourceReportRecoveryRequest/v1',
      identity: f.identity,
      attempt: 1,
      actionId: writer.request.action_id,
      issueId: writer.issue_id,
      hostAttemptId: writerAttemptId,
      nativeSessionHandle: initialReceipt.request.nativeSessionHandle,
      leaseGeneration: pending.host_reservation.receipt.attempt.lease.generation,
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedJournal: journalBefore.version,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      initialContinuationId: initialReceipt.continuation_id,
      initialContinuationRequestDigest: initialReceipt.request_digest,
      frontierReceiptId: frontierReceipt?.original_receipt_id ?? null,
      frontierRequestDigest: frontierReceipt?.record.request_digest ?? null,
      sourceReservationDigest: canonicalJsonDigest(pending.host_reservation),
      originalSourceAuthorizationDigest: initialReceipt.request.sourceAuthorizationSha256,
      originalSourceScopeDigest: sourceBefore.digest,
      evolvedJournalSourceScopeDigest: sourceAfter.digest,
      reportId,
      reportDigest,
      sourceDiffDigest,
      reportSourcePaths,
      nextJournal,
      sourceSnapshotRef,
      sourceDiffRef,
      changedPaths,
      oldRuntimeCodeDigest: before.work.binding.runtime_code_digest,
      oldRuntimeCodePaths: frontierReceipt
        ? [...frontierReceipt.record.request.runtimeCodePaths]
        : currentRuntimeCodePaths,
      currentRuntimeCodeDigest: currentRuntime.digest,
      currentRuntimeCodePaths,
      oldManifestRef,
      oldManifestDigest,
      oldInstallRef,
      currentManifestRef,
      currentManifestDigest,
      currentInstallRef,
      systemUpdateRef,
      systemUpdateOperationId,
      nativeSelfAttestationDigest,
      terminalCallerObservationRef: reportRef,
      terminalCommandReceiptRef: commandReceiptRef,
    };
  writeFileSync(
    path.join(f.root, commandReceiptRef),
    record({
      schema: 'FixtureTerminalCommandReceipt/v1',
      fixture_only: true,
      status: 'completed',
      action_id: request.actionId,
      issue_id: request.issueId,
      host_attempt_id: request.hostAttemptId,
      report_id: reportId,
      report_digest: reportDigest,
      source_diff_digest: sourceDiffDigest,
    }),
  );

  /** @type {CompletedSourceReportRecoveryVerifyCurrent} */
  /**
   * @param {CompletedSourceReportRecoveryRequest} candidate
   * @param {CompletedSourceReportRecoveryState} state
   * @returns {CompletedSourceReportRecoveryVerifiedCurrent}
   */
  const verifyCurrent = (candidate, state) => {
    const initial = state.initialReceipt,
      frontier = state.frontierReceipt;
    if (
      !initial ||
      initial.continuation_id !== candidate.initialContinuationId ||
      initial.request_digest !== candidate.initialContinuationRequestDigest ||
      (candidate.frontierReceiptId === null
        ? frontier !== null ||
          candidate.frontierRequestDigest !== null ||
          candidate.oldRuntimeCodeDigest !== initial.request.currentRuntimeCodeDigest
        : !frontier ||
          frontier.original_receipt_id !== candidate.frontierReceiptId ||
          frontier.record.request_digest !== candidate.frontierRequestDigest ||
          frontier.current_runtime_code_digest !== candidate.oldRuntimeCodeDigest ||
          frontier.record.request.successorManifestRef !== candidate.oldManifestRef ||
          frontier.record.request.successorManifestDigest !== candidate.oldManifestDigest ||
          frontier.record.request.systemUpdateRef !== candidate.oldInstallRef ||
          canonicalJsonDigest(frontier.record.request.runtimeCodePaths) !==
            canonicalJsonDigest(candidate.oldRuntimeCodePaths)) ||
      initial.request.nativeSessionHandle !== candidate.nativeSessionHandle
    )
      throw new Error('fixture endpoint callback: initial/frontier receipt or original owner changed');
    const sourceReservation = state.journal.state.items.find(
        (item) => item.request.action_id === candidate.actionId,
      )?.host_reservation,
      sourceAuthorizationRef = initial.request.sourceAuthorizationReference;
    if (
      !sourceReservation ||
      canonicalJsonDigest(sourceReservation) !== candidate.sourceReservationDigest ||
      sha256(readFileSync(path.join(f.root, sourceAuthorizationRef.path))) !==
        candidate.originalSourceAuthorizationDigest ||
      state.host.work?.binding.work_source_revision !== candidate.originalSourceScopeDigest ||
      candidate.nextJournal.source_scope?.digest !== candidate.evolvedJournalSourceScopeDigest ||
      canonicalJsonDigest(
        candidate.nextJournal.items.find((item) => item.request.action_id === candidate.actionId)?.observation,
      ) !== candidate.reportDigest
    )
      throw new Error('fixture endpoint callback: original Source reservation or permission changed');
    const sourceNow = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents),
      recordedSource = requireRecord(
        readJsonFixture(path.join(f.root, candidate.sourceSnapshotRef)),
        'recorded source snapshot',
      ),
      actualDiff = [...compareScopedSourceSnapshots(sourceBefore, sourceNow)].sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
      recordedDiff = requireArray(readJsonFixture(path.join(f.root, candidate.sourceDiffRef)), 'recorded source diff'),
      report = parseSessionBridgeObservation(readJsonFixture(reportPath)),
      caller = parseSessionBridgeObservation(
        readJsonFixture(path.join(f.root, candidate.terminalCallerObservationRef)),
      ),
      command = requireRecord(
        readJsonFixture(path.join(f.root, candidate.terminalCommandReceiptRef)),
        'terminal command receipt',
      );
    if (
      sourceNow.digest !== candidate.evolvedJournalSourceScopeDigest ||
      canonicalJsonDigest(recordedSource) !== canonicalJsonDigest(sourceNow) ||
      canonicalJsonDigest(recordedDiff) !== canonicalJsonDigest(actualDiff) ||
      canonicalJsonDigest(actualDiff) !== candidate.sourceDiffDigest ||
      canonicalJsonDigest(report) !== candidate.reportDigest ||
      report.tool_call_ref !== candidate.reportId ||
      report.action_id !== candidate.actionId ||
      report.issue_id !== candidate.issueId ||
      report.host_attempt_id !== candidate.hostAttemptId ||
      canonicalJsonDigest([...(report.changed_paths ?? [])].sort((left, right) => left.localeCompare(right))) !==
        canonicalJsonDigest(candidate.reportSourcePaths) ||
      canonicalJsonDigest(caller) !== canonicalJsonDigest(report) ||
      requireString(command.action_id, 'terminal command action_id') !== candidate.actionId ||
      requireString(command.issue_id, 'terminal command issue_id') !== candidate.issueId ||
      requireString(command.host_attempt_id, 'terminal command host_attempt_id') !== candidate.hostAttemptId ||
      requireString(command.report_id, 'terminal command report_id') !== candidate.reportId ||
      requireString(command.report_digest, 'terminal command report_digest') !== candidate.reportDigest ||
      requireString(command.source_diff_digest, 'terminal command source_diff_digest') !== candidate.sourceDiffDigest
    )
      throw new Error('fixture endpoint callback: exact report, caller or Source bytes changed');

    const currentRuntime = snapshotRuntimePackageSources(
      runtimePackageAccess(),
      f.config.runtime.bundle,
      candidate.currentRuntimeCodePaths,
    );
    if (
      currentRuntime.digest !== candidate.currentRuntimeCodeDigest ||
      candidate.currentManifestDigest !==
        canonicalJsonDigest({
          fixture_only: true,
          not_native_manifest: true,
          code_digest: currentRuntime.digest,
          code_paths: candidate.currentRuntimeCodePaths,
        }) ||
      candidate.nativeSelfAttestationDigest !==
        canonicalJsonDigest({
          fixture_only: true,
          not_native_attestation: true,
          code_digest: currentRuntime.digest,
          systemUpdateOperationId: candidate.systemUpdateOperationId,
        }) ||
      (!frontier &&
        (currentRuntime.digest !== candidate.oldRuntimeCodeDigest ||
          canonicalJsonDigest(candidate.oldRuntimeCodePaths) !==
            canonicalJsonDigest(candidate.currentRuntimeCodePaths) ||
          candidate.oldManifestDigest !==
            canonicalJsonDigest({
              fixture_only: true,
              not_native_manifest: true,
              prior_code_digest: currentRuntime.digest,
              prior_code_paths: candidate.currentRuntimeCodePaths,
            })))
    )
      throw new Error('fixture endpoint callback: current Host-only Source/package bytes changed');

    return {
      schema: 'CompletedSourceReportRecoveryVerifiedCurrent/v1',
      terminal: {
        ownerId: candidate.nativeSessionHandle,
        ownerThreadId: candidate.nativeSessionHandle,
        nativeSessionHandle: candidate.nativeSessionHandle,
        attempt: candidate.attempt,
        actionId: candidate.actionId,
        issueId: candidate.issueId,
        hostAttemptId: candidate.hostAttemptId,
        leaseGeneration: candidate.leaseGeneration,
        quiescent: true,
        outcome: 'reported_complete',
        callerObservationRef: candidate.terminalCallerObservationRef,
        commandReceiptRef: candidate.terminalCommandReceiptRef,
        reportId: candidate.reportId,
        reportDigest: candidate.reportDigest,
        sourceDiffDigest: candidate.sourceDiffDigest,
        reportSourcePaths: candidate.reportSourcePaths,
      },
      source: {
        reservationDigest: candidate.sourceReservationDigest,
        authorizationDigest: candidate.originalSourceAuthorizationDigest,
        originalScopeDigest: candidate.originalSourceScopeDigest,
        evolvedScopeDigest: candidate.evolvedJournalSourceScopeDigest,
        snapshotRef: candidate.sourceSnapshotRef,
        diffRef: candidate.sourceDiffRef,
        changedPaths: candidate.changedPaths,
      },
      oldRuntime: {
        codeDigest: candidate.oldRuntimeCodeDigest,
        codePaths: candidate.oldRuntimeCodePaths,
        manifestRef: candidate.oldManifestRef,
        manifestDigest: candidate.oldManifestDigest,
        installRef: candidate.oldInstallRef,
      },
      currentRuntime: {
        codeDigest: currentRuntime.digest,
        codePaths: candidate.currentRuntimeCodePaths,
        manifestRef: candidate.currentManifestRef,
        manifestDigest: candidate.currentManifestDigest,
        installRef: candidate.currentInstallRef,
      },
      systemUpdate: { ref: candidate.systemUpdateRef, operationId: candidate.systemUpdateOperationId },
      nativeSelfAttestationDigest: candidate.nativeSelfAttestationDigest,
    };
  };
  return { request, reportPath, verifyCurrent };
}

/** @param {WorkState} work */
function withoutFrontierCodeBinding(work) {
  return {
    ...work,
    revision: 0,
    binding: { ...work.binding, runtime_code_digest: '', runtime_source_revision: '' },
    lifecycle: {
      ...work.lifecycle,
      revision: 0,
      config_binding: { ...work.lifecycle.config_binding, runtime_code_digest: '' },
    },
  };
}

registerFixtureTest(
  'continues real admitted initial work on the same attempt and replays its durable receipt',
  async () =>
    withInitialWork(async (f) => {
      const { priorRunId, args, reportedStateVersion, summary, observation } = await prepareInitialSourceWaveOne(f);
      const reportedLedger = hostLedger(f);
      reportedLedger.close();
      f.ledger = null;
      f.store = null;
      const prewriter = requireRecord(
        await runAgent([...args, ...expectedRunVersion(reportedStateVersion), '--issue-wave', 'true']),
        'initial Source prewriter issue',
      );
      expect(requireString(prewriter.status, 'prewriter status')).toBe('wave_issued');
      expect(requireString(prewriter.mastra_run_id, 'prewriter mastra_run_id')).toBe(priorRunId);
      const prewriterActions = parseIssuedActions(prewriter.issued_actions, 'prewriter actions');
      expect(prewriterActions.length).toBeGreaterThan(0);
      expect(prewriterActions.every((item) => item.request.stage_id === 'review_source_prewrite')).toBe(true);
      const firstPrewriter = firstValue(prewriterActions, 'prewriter actions');
      expect(
        firstPrewriter.development_packet?.implementation_constraints.some((value) => value.includes(summary)),
      ).toBe(true);

      const completedLedger = openConfiguredMastraSessionLedger(f.root);
      f.ledger = completedLedger;
      f.store = completedLedger.hostState;
      const journal = currentJournal(f);
      expect(journal.state.run_id).toBe(priorRunId);
      expect(journal.state.completed).toHaveLength(1);
      const completedWave = firstValue(journal.state.completed, 'Completed Initial Source Journal wave');
      expect(firstValue(completedWave.items, 'Completed Initial Source Journal observation').observation).toEqual(
        observation,
      );
      expect(journal.state.items.every((item) => item.issue_id !== null)).toBe(true);
      expect(journal.state.items.every((item) => item.request.stage_id === 'review_source_prewrite')).toBe(true);
    }),
);

registerFixtureTest(
  'recovers the exact completed Initial Source writer report into a readonly follow-up under current code',
  async () => {
    await withInitialWork(async (f) => {
      holdExpiredOwnerClockForFixture(f);
      const { args } = await prepareInitialSourceWaveOne(f);
      let stateVersion = continuationState(f).journalVersion;
      const prewriterIssue = requireRecord(
        await runAgent([...args, ...expectedRunVersion(stateVersion), '--issue-wave', 'true']),
        'Initial Source prewriter issue',
      );
      const prewriterActions = parseIssuedActions(prewriterIssue.issued_actions, 'Initial Source prewriter actions');
      expect(prewriterActions.length).toBeGreaterThan(0);
      expect(prewriterActions.every((action) => action.request.stage_id === 'review_source_prewrite')).toBe(true);
      stateVersion = requireStateVersion(prewriterIssue.state_version, 'prewriter state_version');
      for (const [index, action] of prewriterActions.entries()) {
        const work = continuationState(f).work;
        const journal = currentJournal(f);
        const kind =
          action.request.role === 'source-planner'
            ? 'source_plan'
            : action.request.role === 'security-prewriter'
              ? 'implementation_policy'
              : null;
        if (!kind) throw new Error('Initial Source prewriter role has no typed preparation kind');
        const evidenceRef = 'local://initial-source-prewriter/' + action.issue_id;
        const preparationObservations =
          kind === 'source_plan'
            ? [
                {
                  mechanic: 'scope_acceptance_trace',
                  actual: 'The admitted implementation paths and AC trace to the retained acceptance contract.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'verification_rollback',
                  actual: 'Focused verification and source restoration are identified for this scoped change.',
                  evidence_ref: evidenceRef,
                },
              ]
            : [
                {
                  mechanic: 'root_cause_owner',
                  actual: 'The source owner and root cause for this scoped change are identified.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'affected_callers',
                  actual: 'Affected callers within the accepted change are identified.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'existing_primitives',
                  actual: 'Existing Host and filesystem coordination primitives are retained.',
                  evidence_ref: evidenceRef,
                },
                {
                  mechanic: 'prewriter_security_gate',
                  actual: 'The exact scoped write and its pre-effect gates are preserved.',
                  evidence_ref: evidenceRef,
                },
              ];
        const preparation = lifecyclePreparationObservationSchema.parse({
          schema: 'LifecyclePreparationObservation/v1',
          record_id: kind + '-' + action.request.action_id,
          kind,
          work_id: work.binding.lifecycle_work_id,
          attempt: journal.state.attempt,
          source_revision: work.binding.work_source_revision,
          scope_id: work.binding.scope_id,
          config_digest: work.binding.config_digest,
          ac_ids: work.binding.ac_ids,
          observed_at: new Date().toISOString(),
          observer_id: 'fixture:initial-source-prewriter-' + index,
          status: 'pass',
          evidence_refs: [evidenceRef],
          observations: preparationObservations,
          gaps: [],
        });
        const summary = JSON.stringify(preparation);
        const observation = {
          schema: 'VidaSessionObservation/v1',
          action_id: action.request.action_id,
          issue_id: action.issue_id,
          agent_id: preparation.observer_id,
          tool_call_ref: 'fixture:initial-source-prewriter-call-' + action.issue_id,
          status: 'reported_complete',
          summary,
          output_digest: canonicalJsonDigest(summary),
          evidence_refs: preparation.evidence_refs,
        };
        const reportPath = path.join(
          f.root,
          '.agent',
          'work',
          f.identity.work_id,
          'initial-source-prewriter-' + index + '.json',
        );
        writeFileSync(reportPath, record(observation));
        const reported = requireRecord(
          await runAgent([...args, ...expectedRunVersion(stateVersion), '--report', reportPath]),
          'Initial Source prewriter report',
        );
        stateVersion = requireStateVersion(reported.state_version, 'prewriter report state_version');
      }

      const writerIssue = requireRecord(
        await runAgent([...args, ...expectedRunVersion(stateVersion), '--issue-wave', 'true']),
        'Initial Source writer issue',
      );
      const writerActions = parseIssuedActions(writerIssue.issued_actions, 'Initial Source writer actions');
      expect(writerActions).toHaveLength(1);
      const writer = firstValue(writerActions, 'Initial Source writer actions');
      expect(writer.request.stage_id).toBe('develop_task');
      const writerJournal = currentJournal(f);
      const pendingWriter = writerJournal.state.items.find(
        (item) => item.request.action_id === writer.request.action_id,
      );
      if (!pendingWriter?.host_reservation) throw new Error('Initial Source writer reservation is unavailable');
      expect(pendingWriter.issue_id).toBe(writer.issue_id);
      expect(pendingWriter.host_reservation.approvalAction).toBe('source.write');
      const writerAttemptId = requireString(
        pendingWriter.host_reservation.receipt.attempt.attempt_id,
        'Initial Source writer attempt id',
      );
      const writerStateVersion = requireStateVersion(writerIssue.state_version, 'writer issue state_version');
      const initialReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
      if (!initialReceipt) throw new Error('Initial Source writer receipt is unavailable');
      const beforeDrift = continuationState(f);
      // Keep the ordinary live-owner lease; this case does not use expired-owner recovery.
      const liveOwnerLease = workLease(beforeDrift.work);
      const startedAttempt = beforeDrift.work.execution.assignment_attempts.find(
        (attempt) => attempt.attempt_id === writerAttemptId,
      );
      expect(startedAttempt).toMatchObject({ status: 'started', result: null, result_digest: null });
      expect(pendingWriter.observation).toBeNull();

      const sourceBefore = writerJournal.state.source_scope;
      if (!sourceBefore) throw new Error('Initial Source writer Journal scope is unavailable');
      const changedPath = f.documents[0];
      writeFileSync(
        path.join(f.root, changedPath),
        readFileSync(path.join(f.root, changedPath), 'utf8') + 'authorized source-writer output\n',
      );
      const sourceAfter = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents);
      const changedPaths = compareScopedSourceSnapshots(sourceBefore, sourceAfter)
        .map((change) => change.path)
        .sort();
      expect(changedPaths).toEqual([changedPath]);

      await expectRejectedMessage(
        runAgent([...args, ...expectedRunVersion(writerStateVersion), '--issue-wave', 'true']),
        /Initial Source continuation does not match the current scoped Source snapshot/,
      );
      expect(continuationState(f)).toEqual(beforeDrift);

      const writerSummary = 'The authorized source writer updated one implementation path.';
      const writerObservation = {
        schema: 'VidaSessionObservation/v1',
        action_id: writer.request.action_id,
        host_attempt_id: writerAttemptId,
        changed_paths: changedPaths,
        issue_id: writer.issue_id,
        agent_id: 'fixture:initial-source-writer',
        tool_call_ref: 'fixture:initial-source-writer-call',
        status: 'reported_complete',
        summary: writerSummary,
        output_digest: canonicalJsonDigest(writerSummary),
        evidence_refs: ['fixture://initial-source-writer'],
      };
      const writerReportPath = path.join(
        f.root,
        '.agent',
        'work',
        f.identity.work_id,
        'initial-source-writer-report.json',
      );
      const invalidReports = [
        { ...writerObservation, action_id: canonicalJsonDigest('foreign initial-source action') },
        { ...writerObservation, issue_id: randomUUID() },
        { ...writerObservation, host_attempt_id: canonicalJsonDigest('foreign initial-source attempt') },
        { ...writerObservation, changed_paths: [...changedPaths, 'docs/outside-scope.md'].sort() },
      ];
      for (const invalid of invalidReports) {
        writeFileSync(writerReportPath, record(invalid));
        await expectRejectedMessage(
          runAgent([...args, ...expectedRunVersion(writerStateVersion), '--report', writerReportPath]),
          /Initial Source continuation does not match the current scoped Source snapshot/,
        );
        expect(continuationState(f)).toEqual(beforeDrift);
      }

      writeFileSync(writerReportPath, record(writerObservation));
      const recoveryFixture = completedSourceReportRecoveryFixture(
          f,
          writer,
          writerAttemptId,
          writerObservation,
          sourceBefore,
          sourceAfter,
          null,
          writerReportPath,
        ),
        beforeRecovery = continuationState(f),
        request = recoveryFixture.request,
        commit = (candidate = request, verifyCurrent = recoveryFixture.verifyCurrent) =>
          hostStore(f).commitCompletedSourceReportRecovery(candidate, verifyCurrent);
      expect(() => commit()).toThrow(/completed Source report recovery original Source ticket or claim differs/);
      expect(continuationState(f)).toEqual(beforeRecovery);
      holdExpiredOwnerClockForFixture(f);

      const retainedReportBytes = readFileSync(writerReportPath);
      try {
        writeFileSync(writerReportPath, record({ ...writerObservation, summary: 'altered report body' }));
        expect(() => {
          commit();
        }).toThrow();
      } finally {
        writeFileSync(writerReportPath, retainedReportBytes);
      }
      expect(continuationState(f)).toEqual(beforeRecovery);

      const sourceFile = path.join(f.root, changedPath);
      const evolvedSourceBytes = readFileSync(sourceFile);
      try {
        writeFileSync(sourceFile, evolvedSourceBytes.toString('utf8') + 'tampered before report\n');
        expect(() => {
          commit();
        }).toThrow();
      } finally {
        writeFileSync(sourceFile, evolvedSourceBytes);
      }
      expect(continuationState(f)).toEqual(beforeRecovery);

      /** @type {CompletedSourceReportRecoveryVerifyCurrent} */
      const alteredProof = (candidate, state) => ({
        ...recoveryFixture.verifyCurrent(candidate, state),
        nativeSelfAttestationDigest: canonicalJsonDigest('altered fixture proof'),
      });
      expect(() => {
        commit(request, alteredProof);
      }).toThrow();
      expect(continuationState(f)).toEqual(beforeRecovery);
      const recovery = validateCompletedSourceReportRecoveryReceipt(commit());
      expect(recovery.status).toBe('completed_report_recovered');
      expect(recovery.source_write_rights).toBe(false);
      expect(recovery.runtime_acceptance).toBe(false);
      expect(recovery.record.prior_work).toEqual(beforeRecovery.work);
      expect(recovery.record.prior_work_version).toEqual(beforeRecovery.workVersion);
      expect(recovery.record.prior_ledger_version).toEqual(beforeRecovery.ledgerVersion);
      expect(recovery.record.prior_journal).toEqual(beforeRecovery.journal);
      expect(recovery.record.prior_journal_version).toEqual(beforeRecovery.journalVersion);
      expect(recovery.record.original_reservation).toEqual(pendingWriter.host_reservation);
      expect(recovery.record.original_source_ticket).toEqual(
        beforeRecovery.ledger.tickets.find(
          (ticket) => ticket.ticket_id === pendingWriter.host_reservation?.receipt.attempt.lease.ticket_id,
        ),
      );
      expect(recovery.record.completed_attempt).toMatchObject({
        attempt_id: writerAttemptId,
        status: 'completed',
        result: writerObservation,
        result_digest: canonicalJsonDigest(writerObservation),
      });

      const afterRecovery = continuationState(f),
        completedReport = [
          ...afterRecovery.journal.completed.flatMap((wave) => wave.items),
          ...afterRecovery.journal.items,
        ].find((item) => item.request.action_id === writer.request.action_id);
      expect(afterRecovery.journal.source_scope?.digest).toBe(sourceAfter.digest);
      expect(completedReport?.observation).toEqual(writerObservation);
      expect(afterRecovery.work.binding.work_source_revision).toBe(sourceBefore.digest);
      expect(afterRecovery.work.binding.runtime_code_digest).toBe(request.currentRuntimeCodeDigest);
      expect(afterRecovery.work.lifecycle.scope).toEqual(beforeRecovery.work.lifecycle.scope);
      const completedAttempt = afterRecovery.work.execution.assignment_attempts.find(
        (attempt) => attempt.attempt_id === writerAttemptId,
      );
      expect(completedAttempt).toMatchObject({
        status: 'completed',
        result: writerObservation,
        result_digest: canonicalJsonDigest(writerObservation),
      });
      const executionLease = workLease(afterRecovery.work);
      expect(executionLease.thread_id).toBe(liveOwnerLease.thread_id);
      expect(executionLease.ticket_id).not.toBe(liveOwnerLease.ticket_id);
      const executionClaim = afterRecovery.ledger.claims.find(
        (claim) => claim.ticket_id === executionLease.ticket_id && claim.status === 'active',
      );
      expect(executionClaim?.resources).toEqual(['execution:' + f.identity.work_id]);
      expect(recovery.record.execution_ticket.thread_id).toBe(liveOwnerLease.thread_id);
      expect(recovery.record.execution_ticket.exclusive_resources).toEqual(['execution:' + f.identity.work_id]);
      expect(recovery.record.execution_claim.thread_id).toBe(liveOwnerLease.thread_id);
      expect(recovery.record.execution_claim.resources).toEqual(['execution:' + f.identity.work_id]);
      expect(afterRecovery.ledger.tickets.find((ticket) => ticket.ticket_id === liveOwnerLease.ticket_id)?.status).toBe(
        'released',
      );
      expect(
        afterRecovery.ledger.claims.some(
          (claim) => claim.status === 'active' && claim.resources.some((resource) => resource.startsWith('file:')),
        ),
      ).toBe(false);
      expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(initialReceipt);
      expect(
        hostStore(f).readInitialSourceFrontierCodeRebindReceipt(f.identity, 1, initialReceipt.continuation_id),
      ).toBeNull();
      expect(hostStore(f).readCompletedSourceReportRecoveryReceipt(f.identity, 1)).toEqual(recovery);

      // Exact retry models a lost acknowledgement; it returns the same immutable receipt once.
      expect(commit()).toEqual(recovery);
      expect(continuationState(f)).toEqual(afterRecovery);

      for (const altered of [
        { ...request, expectedJournal: { ...request.expectedJournal, revision: request.expectedJournal.revision + 1 } },
        { ...request, nativeSessionHandle: 'fixture:foreign-controller' },
        { ...request, reportDigest: canonicalJsonDigest('altered report identity') },
        { ...request, currentRuntimeCodeDigest: canonicalJsonDigest('altered current code') },
      ]) {
        expect(() => commit(altered)).toThrow();
        expect(continuationState(f)).toEqual(afterRecovery);
      }

      const resumedFollowup = requireRecord(await runAgent(args), 'recovered Source report engine resume');
      const nextJournalVersion = requireStateVersion(resumedFollowup.state_version, 'resumed follow-up state_version');
      expect(parseIssuedActions(resumedFollowup.issued_actions, 'resume issued actions')).toHaveLength(0);
      const beforeExpiredRecovery = continuationState(f);
      expect(beforeExpiredRecovery.journalVersion).toEqual(nextJournalVersion);
      holdExpiredOwnerClockForFixture(f);
      const expiredRecoveryResult = requireRecord(
        await runAgent([
          ...args,
          '--recover-expired-lease',
          'true',
          '--rebind-current-bundle',
          'true',
          '--native-session-handle',
          executionLease.thread_id,
          '--lease-generation',
          String(executionLease.generation),
          ...expectedRunVersion(beforeExpiredRecovery.journalVersion),
        ]),
        'same-attempt expired execution-lease recovery',
      );
      expect(expiredRecoveryResult.status).toBe('inspected');
      expect(expiredRecoveryResult.attempt).toBe(1);
      const inspectedLease = requireRecord(expiredRecoveryResult.lease, 'recovered execution-only lease');
      const afterExpiredRecovery = continuationState(f),
        currentHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity)),
        currentRecovery = hostStore(f).readCompletedSourceReportRecoveryReceipt(f.identity, 1),
        currentLease = workLease(afterExpiredRecovery.work),
        currentTicket = afterExpiredRecovery.ledger.tickets.find(
          (ticket) => ticket.ticket_id === currentLease.ticket_id,
        ),
        currentClaim = afterExpiredRecovery.ledger.claims.find(
          (claim) => claim.ticket_id === currentLease.ticket_id && claim.status === 'active',
        ),
        leaseRebind = afterExpiredRecovery.ledger.rebinds.find(
          (entry) =>
            entry.work_id === f.identity.work_id &&
            Number(entry.to_ledger_revision) > recovery.record.successor_ledger_version.revision,
        );
      if (!currentRecovery || !leaseRebind || !currentTicket || !currentClaim)
        throw new Error('Expired recovery receipt or current execution lease chain is unavailable');
      expect(currentRecovery).toEqual(recovery);
      expect(expiredRecoveryResult.journal_version).toEqual(afterExpiredRecovery.journalVersion);
      expect(inspectedLease).toMatchObject({
        ticket_id: currentLease.ticket_id,
        thread_id: executionLease.thread_id,
        generation: currentLease.generation,
        expired: false,
      });
      expect(afterExpiredRecovery.journalVersion).toEqual({
        revision: beforeExpiredRecovery.journalVersion.revision + 1,
        digest: beforeExpiredRecovery.journalVersion.digest,
      });
      expect({
        attempt: afterExpiredRecovery.journal.attempt,
        evolved: afterExpiredRecovery.journal.source_scope?.digest,
        workSource: afterExpiredRecovery.work.binding.work_source_revision,
      }).toEqual({
        attempt: 1,
        evolved: sourceAfter.digest,
        workSource: sourceBefore.digest,
      });
      expect(currentLease.ticket_id).not.toBe(executionLease.ticket_id);
      expect({ currentTicket, currentClaim, leaseRebind }).toMatchObject({
        currentTicket: {
          status: 'active',
          thread_id: executionLease.thread_id,
          exclusive_resources: ['execution:' + f.identity.work_id],
          active_resources: ['execution:' + f.identity.work_id],
        },
        currentClaim: { status: 'active', resources: ['execution:' + f.identity.work_id] },
        leaseRebind: {
          previous_ticket_id: executionLease.ticket_id,
          ticket_id: currentLease.ticket_id,
          thread_id: executionLease.thread_id,
          decided_by: executionLease.thread_id,
          resources: ['execution:' + f.identity.work_id],
          claimed_resources: ['execution:' + f.identity.work_id],
        },
      });
      expect({
        ticket: afterExpiredRecovery.ledger.tickets.find((ticket) => ticket.ticket_id === executionLease.ticket_id)
          ?.status,
        claim: afterExpiredRecovery.ledger.claims.find((claim) => claim.ticket_id === executionLease.ticket_id)?.status,
      }).toEqual({ ticket: 'read_only', claim: 'recovered' });
      expect(
        validateCompletedSourceReportRecoveryCurrentWorkJoin(
          currentHost,
          { version: afterExpiredRecovery.journalVersion, state: afterExpiredRecovery.journal },
          initialReceipt,
          null,
          recovery,
        ),
      ).toEqual(recovery);

      for (const changes of [
        { previous_ticket_id: 'fixture:foreign-ticket' },
        { thread_id: 'fixture:foreign-thread' },
        {
          resources: ['execution:' + f.identity.work_id, 'file:' + changedPath],
          claimed_resources: ['execution:' + f.identity.work_id, 'file:' + changedPath],
        },
      ]) {
        const alteredLedger = {
          ...currentHost.ledger,
          rebinds: currentHost.ledger.rebinds.map((entry) =>
            entry.rebind_id === leaseRebind.rebind_id ? { ...entry, ...changes } : entry,
          ),
        };
        expect(() =>
          validateCompletedSourceReportRecoveryCurrentWorkJoin(
            { ...currentHost, ledger: alteredLedger },
            { version: afterExpiredRecovery.journalVersion, state: afterExpiredRecovery.journal },
            initialReceipt,
            null,
            recovery,
          ),
        ).toThrow();
      }

      const readonlyFollowup = requireRecord(
        await runAgent([...args, ...expectedRunVersion(afterExpiredRecovery.journalVersion), '--issue-wave', 'true']),
        'readonly Initial Source follow-up issue',
      );
      const followupActions = parseIssuedActions(readonlyFollowup.issued_actions, 'readonly follow-up actions');
      expect(followupActions).toHaveLength(2);
      expect(followupActions.every((action) => action.request.stage_id === 'validate_focused')).toBe(true);
      const followupJournal = currentJournal(f);
      expect(followupJournal.state.source_scope?.digest).toBe(sourceAfter.digest);
      expect(followupJournal.state.items).toHaveLength(2);
      expect(followupJournal.state.items.every((item) => item.host_reservation === undefined)).toBe(true);
      expect(followupJournal.state.items.every((item) => item.request.stage_id === 'validate_focused')).toBe(true);
      expect(followupActions.every((action) => action.request.action_id !== writer.request.action_id)).toBe(true);
      expect(
        continuationState(f).ledger.claims.some(
          (claim) => claim.status === 'active' && claim.resources.some((resource) => resource.startsWith('file:')),
        ),
      ).toBe(false);
      expect(continuationState(f).work.lease).toEqual(currentLease);
      expect(
        continuationState(f).work.execution.assignment_attempts.find(
          (attempt) => attempt.attempt_id === writerAttemptId,
        ),
      ).toEqual(completedAttempt);
    });
  },
);

registerFixtureTest(
  'rebinds code at the real unissued readonly frontier without changing source authority',
  async () => {
    await withInitialWork(async (f) => {
      await prepareInitialSourceWaveOne(f);
      const request = frontierCodeRequest(f);
      const proof = fixtureFrontierProof(request);
      const before = continuationState(f);
      const initialReceiptBefore = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
      const sourceAuthorization = before.work.lifecycle.references.find(
        (entry) => entry.artifact_schema === 'LocalSourceWriteAuthorization/v1',
      );
      const retainedPaths = [
        f.scopePath,
        f.acceptancePath,
        f.sourceAuthorizationPath,
        f.intakePath,
        f.rawIntakePath,
        ...f.documents,
      ];
      const retainedBytes = retainedPaths.map((relative) => readFileSync(path.join(f.root, relative)));
      const commit = () =>
        hostStore(f).commitReadOnlyFrontierRuntimeCode(request, trustedHostFixtureVerifier(f, proof));
      const storedValue = commit();
      const receipt = validateInitialSourceFrontierCodeRebindReceipt(storedValue);
      expect(receipt.status).toBe('rebound');
      expect(receipt.rights_granted).toBe(false);
      expect(receipt.accepted_result).toBe(false);
      expect(receipt.runtime_acceptance).toBe(false);
      expect(receipt.record.request.runtimeCodePaths).toEqual(
        [...runtimePackageCodePaths(f.config.runtime.bundle)].sort(),
      );
      expect(receipt.record.endpoint_proof).toEqual(proof);
      expect(receipt.record.prior_ledger).toEqual(before.ledger);
      expect(receipt.record.prior_journal).toEqual(before.journal);
      const after = continuationState(f);
      expect(after.work).toEqual(receipt.record.successor_work);
      expect(withoutFrontierCodeBinding(after.work)).toEqual(withoutFrontierCodeBinding(before.work));
      expect(after.work.revision).toBe(before.work.revision + 1);
      expect(after.work.lifecycle.revision).toBe(before.work.lifecycle.revision + 1);
      expect(after.work.binding.runtime_code_digest).toBe(request.newRuntimeCodeDigest);
      expect(after.ledger).toEqual(before.ledger);
      expect(after.journal).toEqual(before.journal);
      expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toEqual(initialReceiptBefore);
      expect(sourceAuthorization).toBeDefined();
      for (const [index, relative] of retainedPaths.entries())
        expect(readFileSync(path.join(f.root, relative))).toEqual(retainedBytes[index]);
      expect(
        hostStore(f).readInitialSourceFrontierCodeRebindReceipt(f.identity, 1, receipt.original_receipt_id),
      ).toEqual(receipt);
      expect(commit()).toEqual(receipt);
      expect(continuationState(f)).toEqual(after);
      const initialReceipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
      if (!initialReceipt) throw new Error('Initial Source lineage fixture receipt is unavailable');
      const binding = {
        repositoryRoot: f.root,
        config: f.config,
        selection: admittedInput(f).selection,
        context: { ...admittedInput(f).context, scope_digest: request.sourceScopeDigest },
        workflowId: 'task_execution',
        runId: workRunId(after.work),
      };
      expect(after.journal.source_scope?.digest).toBe(initialReceipt.request.currentSourceScope.digest);
      const engineJournal = { version: after.journalVersion, state: after.journal };
      const engineHost = hostStore(f).readHostStateSnapshot(f.identity);
      expect(() =>
        readInitialSourceContinuationSessionEngineSnapshot(binding, initialReceipt, engineJournal, engineHost),
      ).toThrow();
      expect(
        readInitialSourceContinuationSessionEngineSnapshot(binding, initialReceipt, engineJournal, engineHost, receipt)
          .run_id,
      ).toBe(binding.runId);
      expect(() =>
        validateInitialSourceFrontierCodeRebindReceipt({
          ...receipt,
          record: {
            ...receipt.record,
            work_version: { ...receipt.record.work_version, extra: true },
          },
        }),
      ).toThrow();
      expect(() =>
        readInitialSourceContinuationSessionEngineSnapshot(binding, initialReceipt, engineJournal, engineHost, {
          ...receipt,
          current_runtime_code_digest: canonicalJsonDigest('changed-code'),
        }),
      ).toThrow();
      const producer = hostLedger(f).beginSessionProducer({
        ...binding,
        projectIds: f.identity.project_ids,
        phase: 'initialize',
      });
      hostStore(f).assertSessionProducerCurrent(producer);
      hostStore(f).settleSessionProducer(producer, after.journalVersion);
      expect(continuationState(f)).toEqual(after);
    });
  },
);

registerFixtureTest('keeps an expired exact owner claim expired during code-only recovery control', async () => {
  await withInitialWork(async (f) => {
    await prepareInitialSourceWaveOne(f);
    const request = frontierCodeRequest(f);
    const proof = fixtureFrontierProof(request);
    const before = continuationState(f);
    const receipt = withExpiredOwner(f, () =>
      hostStore(f).commitReadOnlyFrontierRuntimeCode(request, trustedHostFixtureVerifier(f, proof)),
    );
    const after = continuationState(f);
    expect(receipt.status).toBe('rebound');
    expect(after.work.lease).toEqual(before.work.lease);
    expect(after.ledger).toEqual(before.ledger);
    expect(after.journal).toEqual(before.journal);
    expect(receipt.rights_granted).toBe(false);
  });
});

registerFixtureTest('denies changed or stale frontier proof and an issued current wave without writes', async () => {
  await withInitialWork(async (f) => {
    await prepareInitialSourceWaveOne(f);
    const base = frontierCodeRequest(f);
    const proof = fixtureFrontierProof(base);
    const before = continuationState(f);
    /** @param {InitialSourceFrontierCodeRebindRequest} request */
    const reject = (request) =>
      expect(() =>
        hostStore(f).commitReadOnlyFrontierRuntimeCode(request, trustedHostFixtureVerifier(f, proof)),
      ).toThrow();
    reject({ ...base, nativeSessionHandle: 'foreign-thread' });
    reject({ ...base, expectedWork: { ...base.expectedWork, digest: canonicalJsonDigest('stale') } });
    reject({ ...base, expectedJournal: { ...base.expectedJournal, digest: canonicalJsonDigest('stale-journal') } });
    reject({ ...base, initialContinuationId: 'wrong-history' });
    reject({ ...base, initialContinuationRequestDigest: canonicalJsonDigest('changed-permission-history') });
    reject({ ...base, configDigest: canonicalJsonDigest('changed-config') });
    reject({ ...base, sourceScopeDigest: canonicalJsonDigest('changed-source-scope') });
    reject({ ...base, parentManifestDigest: canonicalJsonDigest('wrong-parent') });
    reject({ ...base, runtimeCodePaths: base.runtimeCodePaths.slice(1) });

    const configPath = path.join(f.root, 'agent-runtime.config.v1.yaml');
    const configBefore = readFileSync(configPath);
    try {
      writeFileSync(
        configPath,
        configBefore.toString('utf8').replace('initial-source-repository', 'changed-source-repository'),
      );
      reject(base);
    } finally {
      writeFileSync(configPath, configBefore);
    }
    const sourceDriftPath = path.join(f.root, f.documents[0]);
    const sourceBefore = readFileSync(sourceDriftPath);
    try {
      writeFileSync(sourceDriftPath, sourceBefore.toString('utf8') + 'out-of-band source change\n');
      reject(base);
    } finally {
      writeFileSync(sourceDriftPath, sourceBefore);
    }
    const permissionRef = before.work.lifecycle.references.find(
      (entry) => entry.artifact_schema === 'LocalSourceWriteAuthorization/v1',
    );
    if (!permissionRef) throw new Error('Initial Source permission fixture is unavailable');
    const permissionPath = path.join(f.root, permissionRef.path);
    const permissionBefore = readFileSync(permissionPath);
    try {
      writeFileSync(permissionPath, permissionBefore.toString('utf8') + '\n');
      reject(base);
    } finally {
      writeFileSync(permissionPath, permissionBefore);
    }
    expect(continuationState(f)).toEqual(before);

    const issued = hostLedger(f).issueWave(f.identity.work_id, 1, before.journalVersion);
    const issuedState = continuationState(f);
    const issuedRequest = frontierCodeRequest(f);
    expect(issued.state.items.every((item) => item.issue_id !== null)).toBe(true);
    expect(() =>
      hostStore(f).commitReadOnlyFrontierRuntimeCode(
        issuedRequest,
        trustedHostFixtureVerifier(f, fixtureFrontierProof(issuedRequest)),
      ),
    ).toThrow();
    expect(continuationState(f)).toEqual(issuedState);
  });
});

registerFixtureTest(
  'denies a changed owner, a live owner, and an overlapping queued waiter without writes',
  async () => {
    for (const scenario of ['foreign', 'live', 'queued'])
      await withInitialWork(async (f) => {
        changeOneAcceptedDocument(f);
        let request = initialRequest(f);
        if (scenario === 'foreign') request = { ...request, nativeSessionHandle: 'foreign-thread' };
        if (scenario === 'queued') {
          const before = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
          const owner = before.ledger.tickets.find((ticket) => ticket.ticket_id === workLease(before.work).ticket_id);
          if (!owner) throw new Error('Initial Source fixture owner ticket is unavailable');
          const queuedTicket = {
            ...owner,
            ticket_id: 'ticket-' + randomUUID(),
            thread_id: 'queued-thread',
            sequence: before.ledger.next_sequence,
            status: 'queued',
            claim_ids: [],
            expires_at: null,
            active_resources: [],
            blocked_resources: owner.exclusive_resources,
            created_at: new Date().toISOString(),
          };
          hostStore(f).compareAndSwapHostState({
            expectedWork: before.workVersion,
            expectedLedger: before.ledgerVersion,
            expectedMaintenanceGeneration: before.maintenanceGeneration,
            nextWork: {
              ...before.work,
              revision: before.work.revision + 1,
              lifecycle: { ...before.work.lifecycle, revision: before.work.lifecycle.revision + 1 },
            },
            nextLedger: {
              ...before.ledger,
              revision: before.ledger.revision + 1,
              next_sequence: before.ledger.next_sequence + 1,
              tickets: [...before.ledger.tickets, queuedTicket],
            },
          });
          request = initialRequest(f);
        }
        expectNoChange(f, request, scenario !== 'live');
      });
  },
);

registerFixtureTest('denies preparation and possible exposure on an unissued initial wave', async () => {
  /** @type {readonly ('preparing' | 'possible')[]} */
  const markers = ['preparing', 'possible'];
  for (const marker of markers)
    await withInitialWork(async (f) => {
      changeOneAcceptedDocument(f);
      const request = initialRequest(f);
      const baseline = continuationState(f);
      const journal = { ...baseline.journal, research_wave_exposure: marker };
      const journalVersion = { ...baseline.journalVersion, digest: canonicalJsonDigest(journal) };
      const state = { ...baseline, journal, journalVersion };
      const changedRequest = { ...request, expectedJournal: journalVersion };
      withExpiredOwner(f, () => {
        expect(() => validateInitialSourceContinuationRequest(request, baseline, f.config)).not.toThrow();
        expect(() => validateInitialSourceContinuationRequest(changedRequest, state, f.config)).toThrow(
          /Work is not the expired, execution-only, unissued first readonly wave/,
        );
      });
      expect(continuationState(f)).toEqual(baseline);
      expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toBeNull();
    });
});

registerFixtureTest('denies an issued unknown wave, a reserved wave, and any observed first action', async () => {
  for (const scenario of ['issued', 'reserved', 'observed'])
    await withInitialWork(async (f) => {
      changeOneAcceptedDocument(f);
      let journal = currentJournal(f);
      const first = firstValue(journal.state.items, 'Initial Source first-wave Journal item');
      if (scenario === 'reserved') {
        const reservation = {
          schema: 'WorkflowSessionReservation/v1',
          request: {
            workItemId: f.identity.work_id,
            stageId: first.request.stage_id,
            assignmentIndex: first.request.assignment_index,
          },
          receipt: {
            identity: f.identity,
            attempt: {
              attempt_id: 'fixture-attempt',
              correction_generation: 0,
              correction_authorization: null,
            },
          },
        };
        journal = hostLedger(f).issueWave(f.identity.work_id, 1, journal.version, {
          [first.request.action_id]: reservation,
        });
      } else {
        journal = hostLedger(f).issueWave(f.identity.work_id, 1, journal.version);
        if (scenario === 'observed') {
          const item = firstValue(journal.state.items, 'issued Initial Source Journal item');
          const summary = 'Observed the initial readonly action.';
          journal = hostLedger(f).report(
            f.identity.work_id,
            1,
            journal.version,
            {
              schema: 'VidaSessionObservation/v1',
              action_id: item.request.action_id,
              issue_id: item.issue_id,
              agent_id: item.request.stage_id + '-0',
              tool_call_ref: 'fixture:initial-observation',
              status: 'reported_complete',
              summary,
              output_digest: canonicalJsonDigest(summary),
              evidence_refs: ['fixture://initial-observation'],
            },
            f.originalSource,
          );
        }
      }
      expectNoChange(f, initialRequest(f));
    });
});

registerFixtureTest(
  'rejects request drift, an unaccepted fourth path, intake or approval byte drift, and source TOCTOU',
  async () => {
    for (const scenario of ['workflow', 'fourth-path', 'intake', 'approval', 'source'])
      await withInitialWork(async (f) => {
        changeOneAcceptedDocument(f);
        const request = initialRequest(f);
        if (scenario === 'workflow') {
          expectNoChange(f, {
            ...request,
            currentInitialRequest: { ...request.currentInitialRequest, workflow_id: 'implementation_change' },
          });
        } else if (scenario === 'fourth-path') {
          const extra = 'docs/UNACCEPTED.md';
          writeFileSync(path.join(f.root, extra), 'outside the accepted scope\n');
          expectNoChange(f, {
            ...request,
            currentSourceScope: snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), [...f.documents, extra]),
          });
        } else {
          const relative =
            scenario === 'intake' ? f.intakePath : scenario === 'approval' ? f.sourceAuthorizationPath : f.documents[1];
          writeFileSync(
            path.join(f.root, relative),
            readFileSync(path.join(f.root, relative), 'utf8') + 'post-request drift\n',
          );
          expectNoChange(f, request);
        }
      });
  },
);

registerFixtureTest(
  'rejects an altered engine beforeimage and atomically rolls back a Journal CAS failure',
  async () => {
    for (const scenario of ['engine', 'journal-cas'])
      await withInitialWork(async (f) => {
        changeOneAcceptedDocument(f);
        const request = initialRequest(f);
        const beforeHost = completeHostState(hostStore(f).readHostStateSnapshot(f.identity));
        const beforeJournal = currentJournal(f);
        if (scenario === 'engine') {
          const enginePath = path.join(f.root, f.config.control.work_root, 'mastra-workflows.v1.sqlite');
          const engineDb = new Database(enginePath);
          /** @type {Uint8Array | null} */
          let snapshotBytes = null;
          let snapshotMayBeChanged = false;
          await withCleanup(
            () => {
              const savedValue = /** @type {unknown} */ (
                engineDb
                  .query('SELECT snapshot,json(snapshot) AS parsed FROM mastra_workflow_snapshot WHERE run_id=?')
                  .get(workRunId(beforeHost.work))
              );
              const saved = requireRecord(savedValue, 'Initial Source engine snapshot beforeimage');
              if (!(saved.snapshot instanceof Uint8Array))
                throw new Error('Initial Source engine snapshot beforeimage is not bytes');
              snapshotBytes = Uint8Array.from(saved.snapshot);
              const parsedValue = /** @type {unknown} */ (
                JSON.parse(requireString(saved.parsed, 'Initial Source parsed engine snapshot'))
              );
              const altered = requireRecord(parsedValue, 'Initial Source decoded engine snapshot');
              const context = requireRecord(altered.context, 'Initial Source engine snapshot context');
              const input = requireRecord(context.input, 'Initial Source engine snapshot input');
              input.config_digest = '0'.repeat(64);
              const alteredJson = JSON.stringify(altered);
              if (typeof alteredJson !== 'string')
                throw new Error('Initial Source altered engine snapshot is not serializable');
              snapshotMayBeChanged = true;
              engineDb
                .query('UPDATE mastra_workflow_snapshot SET snapshot=jsonb(?) WHERE run_id=?')
                .run(alteredJson, workRunId(beforeHost.work));
              return expectNoChange(f, request);
            },
            async () => {
              /** @type {unknown[]} */
              const cleanupErrors = [];
              if (snapshotMayBeChanged && snapshotBytes) {
                try {
                  engineDb
                    .query('UPDATE mastra_workflow_snapshot SET snapshot=? WHERE run_id=?')
                    .run(snapshotBytes, workRunId(beforeHost.work));
                } catch (error) {
                  cleanupErrors.push(error);
                }
              }
              try {
                engineDb.close();
              } catch (error) {
                cleanupErrors.push(error);
              }
              if (cleanupErrors.length === 1) throw cleanupErrors[0];
              if (cleanupErrors.length > 1) throw new AggregateError(cleanupErrors, 'Engine snapshot cleanup failed');
            },
            'Initial Source engine beforeimage assertion',
          );
        } else {
          hostDatabase(f).exec(
            'CREATE TRIGGER fail_initial_source_journal BEFORE UPDATE ON agent_host_mastra_session_ledger ' +
              "WHEN NEW.work_id='" +
              f.identity.work_id +
              "' BEGIN SELECT RAISE(ABORT, 'fixture journal CAS failure'); END",
          );
          await withCleanup(
            () => {
              expect(() =>
                withExpiredOwner(f, () =>
                  hostStore(f).continueInitialSource(request, (state) => currentProof(f, state)),
                ),
              ).toThrow();
              expect(completeHostState(hostStore(f).readHostStateSnapshot(f.identity))).toEqual(beforeHost);
              expect(currentJournal(f)).toEqual(beforeJournal);
              expect(hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1)).toBeNull();
            },
            () => hostDatabase(f).exec('DROP TRIGGER fail_initial_source_journal'),
            'Initial Source journal rollback assertion',
          );
        }
      });
  },
);
