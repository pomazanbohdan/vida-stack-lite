import type { Database as BunDatabase } from 'bun:sqlite';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { stringify as stringifyYaml } from 'yaml';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
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
  type HostStateStore,
  type WorkIdentity,
  type WorkState,
  type HostStateSnapshot,
  type CoordinationLedger,
  type StateVersion,
} from '../../src/host-state.ts';
import {
  admitLocalSessionWork,
  acquireLocalSourceWriterLease,
  type LocalWorkAdmissionInput,
} from '../../src/orchestration/local-work-admission.ts';
import { openAdmittedSessionExecution } from '../../src/orchestration/admitted-session-execution.ts';
import { prepareWorkflowExecution, reserveWorkflowAssignmentForSession } from '../../src/runtime-kernel.ts';
import { runPreparationFixtureInProcess, runSynthesisFixtureInProcess } from './public-prewriter-fixture.ts';
import { bindControlledRuntimeInitialization } from './controlled-runtime-initialization-fixture.ts';
import type {
  InitialSourceFrontierCodeRebindRequest,
  InitialSourceFrontierCodeRebindVerifiedCurrent,
  InitialSourceFrontierCodeRebindVerifyCurrent,
} from '../../src/orchestration/initial-source-frontier-code-rebind.ts';
import { initialSourcePhases } from './initial-source-phase-timing.ts';
import {
  MastraSessionBridge,
  type SessionBridgeSnapshot,
  type SessionBridgeRequest,
} from '../../src/orchestration/mastra-session-bridge.ts';
import {
  MastraSessionLedger,
  openConfiguredMastraSessionLedger,
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
  currentConfigBytes: string;
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
  preparePeerAdmission: (id: string, paths: readonly string[]) => LocalWorkAdmissionInput;
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
  beforeAdmission,
  cooperativeSynthesis = false,
  legacyTaskFrontier = false,
  researchSynthesis = false,
  researchAssignments = 1,
}: {
  readonly parentRoot?: string;
  readonly onRoot?: (root: string) => void;
  readonly beforeAdmission?: (state: {
    readonly database: BunDatabase;
    readonly store: HostStateStore;
    readonly config: AgentRuntimeConfig;
  }) => void | Promise<void>;
  readonly cooperativeSynthesis?: boolean;
  readonly legacyTaskFrontier?: boolean;
  readonly researchSynthesis?: boolean;
  readonly researchAssignments?: 1 | 2;
} = {}): Promise<InitialWorkFixture> {
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
    let configBytes = readFileSync(path.join(bundle, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
      .replaceAll('{{REPOSITORY}}', 'initial-source-repository')
      .replaceAll('{{PROJECT}}', 'sample')
      .replaceAll('{{BUNDLE}}', 'vida-agent');
    if (cooperativeSynthesis) {
      const profile = configBytes.match(/^    researcher:\n(?:      [^\n]*\n)+/mu)?.[0];
      if (!profile || !profile.includes('      egress_policy: official_docs\n'))
        throw new Error('Cooperative synthesis fixture profile is unavailable');
      configBytes = configBytes.replace(
        profile,
        profile.replace('egress_policy: official_docs', 'egress_policy: none'),
      );
    }
    writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), configBytes);
    if (legacyTaskFrontier) {
      const currentConfig = loadRuntimeConfig(root);
      const task = currentConfig.workflows.task_execution;
      if (!task?.stages.some((stage) => stage.id === 'review_source_prewrite'))
        throw new Error('Legacy task fixture requires the current prewriter stage');
      const legacyConfig: AgentRuntimeConfig = {
        ...currentConfig,
        workflows: {
          ...currentConfig.workflows,
          task_execution: {
            ...task,
            stages: task.stages
              .filter((stage) => stage.id !== 'review_source_prewrite')
              .map((stage) => ({
                ...stage,
                required_after: stage.required_after.map((id) =>
                  id === 'review_source_prewrite' ? 'synthesize_task' : id,
                ),
              })),
            edges: task.edges
              .filter(([from]) => from !== 'review_source_prewrite')
              .map(([from, to]) => [from, to === 'review_source_prewrite' ? 'develop_task' : to] as const),
          },
        },
      };
      writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), stringifyYaml(legacyConfig));
    }
    if (researchSynthesis) {
      const before = loadRuntimeConfig(root);
      const task = before.workflows.task_execution;
      if (!task?.stages.some((stage) => stage.id === 'synthesize_task'))
        throw new Error('Research synthesis fixture requires task synthesis');
      const configured: AgentRuntimeConfig = {
        ...before,
        workflows: {
          ...before.workflows,
          task_execution: {
            ...task,
            entry_stage: 'research_parallel',
            stages: [
              {
                id: 'research_parallel',
                kind: 'research',
                mode: researchAssignments === 2 ? 'parallel' : 'single',
                assignments:
                  researchAssignments === 2
                    ? [
                        { role: 'requirements-researcher', profile: 'researcher', contour: 'requirements' },
                        { role: 'security-data-researcher', profile: 'researcher', contour: 'security_data' },
                      ]
                    : [{ role: 'requirements-researcher', profile: 'researcher', contour: 'requirements' }],
                consumes: ['WorkItem/v1'],
                produces: ['ResearchResult/v1'],
                required_after: [],
              },
              ...task.stages.map((stage) =>
                stage.id === 'synthesize_task'
                  ? {
                      ...stage,
                      consumes: [...stage.consumes, 'ResearchResult/v1'],
                      produces: [...stage.produces, 'ResearchSynthesis/v1'],
                      required_after: ['research_parallel'],
                    }
                  : stage,
              ),
            ],
            edges: [['research_parallel', 'synthesize_task'], ...task.edges],
          },
        },
      };
      configBytes = stringifyYaml(configured);
      writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), configBytes);
    }
    const config = loadRuntimeConfig(root);
    mkdirSync(path.join(root, config.control.work_root), { recursive: true });
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
    ledger = openConfiguredMastraSessionLedger(root);
    database = ledger.sessionProducerBinding().database;
    if (beforeAdmission) {
      await beforeAdmission({ database, store: ledger.hostState, config });
      ledger.close();
      ledger = openConfiguredMastraSessionLedger(root);
      database = ledger.sessionProducerBinding().database;
    }
    const store = ledger.hostState;
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
      currentConfigBytes: configBytes,
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
      preparePeerAdmission(peerId, paths) {
        const peerSource = snapshotDeclaredSources(requireSafeRepositoryAccess(root), paths);
        const peerRoot = '.agent/work/' + peerId;
        const peerThread = 'fixture-peer:' + peerId;
        const peerScope = {
          ...scope,
          scope_id: 'scope-' + peerId,
          work_id: peerId,
          source_revision: peerSource.digest,
          allowed_paths: paths,
          implementation_paths: paths,
          documentation_paths: paths,
          attribution: { thread_id: peerThread, pointer: 'fixture:peer-admission' },
        };
        mkdirSync(path.join(root, peerRoot), { recursive: true });
        writeFileSync(path.join(root, peerRoot, 'scope.json'), record(peerScope));
        writeFileSync(
          path.join(root, peerRoot, 'acceptance.json'),
          record({
            ...acceptance,
            id: 'acceptance-' + peerId,
            scope: peerScope.scope_id,
            source_revision: peerSource.digest,
            source: paths[0],
          }),
        );
        writeFileSync(
          path.join(root, peerRoot, 'source-authorization.json'),
          record({
            ...authorization,
            work_id: peerId,
            scope_digest: peerSource.digest,
            implementation_paths: paths,
            native_session_handle: peerThread,
          }),
        );
        const { intakePath: _intakePath, ...peerBase } = input;
        return {
          ...peerBase,
          context: { ...input.context, work_id: peerId, scope_digest: peerSource.digest },
          nativeSessionHandle: peerThread,
          workItem: { ...workItem, id: peerId },
          scopePath: peerRoot + '/scope.json',
          acceptancePath: peerRoot + '/acceptance.json',
          sourceAuthorizationPath: peerRoot + '/source-authorization.json',
        };
      },
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

export function expiredOwnerTime(
  f: InitialWorkFixture,
  before: Pick<InitialSourceContinuationState, 'work' | 'ledger'> = completeHostState(
    hostStore(f).readHostStateSnapshot(f.identity),
  ),
): number {
  const owner = before.ledger.tickets.find((ticket) => ticket.ticket_id === workLease(before.work).ticket_id);
  if (!owner || typeof owner.expires_at !== 'string')
    throw new Error('Initial Source fixture owner lease is unavailable');
  const expiredAt = Date.parse(owner.expires_at) + 1;
  if (!Number.isFinite(expiredAt)) throw new Error('Initial Source fixture owner expiry is invalid');
  return expiredAt;
}

export function withExpiredOwner<T>(f: InitialWorkFixture, callback: () => T) {
  const expiredAt = expiredOwnerTime(f);
  const originalNow = Date.now;
  Date.now = () => expiredAt;
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

/** Real Host continuation and controlled readonly preparation; no native Source effect is claimed. */
export async function prepareInitialSourceFrontier(f: InitialWorkFixture, frontier: 'readonly' | 'writer') {
  const source = changeOneAcceptedDocument(f);
  const request = initialRequest(f);
  const receipt = withExpiredOwner(f, () =>
    hostStore(f).continueInitialSource(request, (state) => currentProof(f, state)),
  );
  await hostBridge(f).close();
  f.bridge = null;
  const input = admittedInput(f);
  f.bridge = await MastraSessionBridge.open({
    repositoryRoot: f.root,
    config: f.config,
    ledger: hostLedger(f),
    projectIds: f.identity.project_ids,
    selection: input.selection,
    context: { ...input.context, scope_digest: source.digest },
    workflowId: 'task_execution',
    workspaceId: deriveWorkspaceId(f.config.repository.repository_id, f.root),
    initialSourceContinuation: { identity: f.identity, attempt: 1 },
  });
  await bindControlledRuntimeInitialization(f.root, f.config, hostStore(f));
  const prepare = frontier === 'readonly' ? runSynthesisFixtureInProcess : runPreparationFixtureInProcess;
  const journal = await prepare(
    {
      args: [],
      publicRun: () => {
        throw new Error('Native preparation fixture must not enter the public CLI');
      },
      sync: () => currentJournal(f),
      repositoryRoot: f.root,
      workId: f.identity.work_id,
      attempt: 1,
      work: continuationState(f).work,
    },
    { ledger: hostLedger(f), bridge: hostBridge(f), source },
    initialSourcePhases.enabled
      ? async <T>(phase: string, operation: () => T | Promise<T>): Promise<Awaited<T>> => {
          const started = performance.now();
          try {
            return await operation();
          } finally {
            console.info(
              JSON.stringify({ fixture: 'initial-source-preparation', phase, elapsed_ms: performance.now() - started }),
            );
          }
        }
      : undefined,
  );
  return { receipt, journal };
}

/** Obtain the actual admitted opaque capability and Host reservation; execute no writer argv. */
export async function issueInitialSourceFixtureWriter(f: InitialWorkFixture) {
  const state = continuationState(f);
  const item = state.journal.items[0];
  if (state.journal.items.length !== 1 || !item || item.request.stage_id !== 'develop_task' || item.issue_id !== null)
    throw new Error('Initial Source fixture needs one unissued writer frontier');
  if (
    initialSourcePhases.enabled &&
    !initialSourcePhases.arm({
      repositoryRoot: f.root,
      workId: f.identity.work_id,
      actionId: item.request.action_id,
      stageId: 'develop_task',
    })
  )
    throw new Error('Initial Source writer fixture phase capture could not be armed');
  try {
    const selection = admittedInput(f).selection;
    acquireLocalSourceWriterLease({
      repositoryRoot: f.root,
      config: f.config,
      store: hostStore(f),
      identity: f.identity,
      nativeSessionHandle: workLease(state.work).thread_id,
      stageId: item.request.stage_id,
      assignmentIndex: item.request.assignment_index,
      expectedWork: state.workVersion,
      expectedLedger: state.ledgerVersion,
      expectedSessionJournal: { attempt: 1, version: state.journalVersion },
    });
    const execution = await openAdmittedSessionExecution(f.root, hostStore(f), selection.project, f.identity.work_id);
    const capability = execution.composition.workflowExecutionCapability;
    if (!capability) throw new Error('Initial Source fixture admitted execution capability is unavailable');
    const configDigest = runtimeConfigDigest(f.config);
    const prepared = await prepareWorkflowExecution(capability, {
      repositoryRoot: f.root,
      configDigest,
      teamId: selection.team,
      workItemId: f.identity.work_id,
    });
    const reservation = await reserveWorkflowAssignmentForSession(capability, {
      repositoryRoot: f.root,
      configDigest,
      teamId: selection.team,
      workflowId: item.request.workflow_id,
      stageId: item.request.stage_id,
      assignmentIndex: item.request.assignment_index,
      workItemId: f.identity.work_id,
      workItemDigest: prepared.workItemDigest,
      workContextDigest: prepared.workContextDigest,
      input: { bindings_manifest_ref: item.request.bindings_manifest_ref },
    });
    const issued = hostLedger(f).issueWave(f.identity.work_id, 1, state.journalVersion, {
      [item.request.action_id]: reservation,
    });
    const writer = issued.state.items[0];
    if (!writer?.issue_id || !writer.host_reservation)
      throw new Error('Initial Source fixture did not persist its native writer reservation');
    return {
      journal: issued,
      writer: { request: writer.request, issue_id: writer.issue_id },
      hostAttemptId: writer.host_reservation.receipt.attempt.attempt_id,
    };
  } finally {
    initialSourcePhases.disarm();
  }
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

export function frontierCodeRequest(f: InitialWorkFixture): InitialSourceFrontierCodeRebindRequest {
  const state = continuationState(f);
  const receipt = hostStore(f).readInitialSourceContinuationReceipt(f.identity, 1);
  if (!receipt) throw new Error('Initial Source frontier fixture receipt is unavailable');
  const action = state.journal.items[0];
  if (!action) throw new Error('Initial Source readonly frontier action fixture is missing');
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

export function fixtureFrontierProof(
  request: InitialSourceFrontierCodeRebindRequest,
): InitialSourceFrontierCodeRebindVerifiedCurrent {
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

export function trustedHostFixtureVerifier(
  f: InitialWorkFixture,
  proof: InitialSourceFrontierCodeRebindVerifiedCurrent,
): InitialSourceFrontierCodeRebindVerifyCurrent {
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
