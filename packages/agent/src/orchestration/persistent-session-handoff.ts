import { Database } from 'bun:sqlite';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import { createHash, randomUUID } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import stateSchema from '../../schemas/persistent-session-handoff-state.v1.schema.json' with { type: 'json' };
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  type AgentRuntimeConfig,
  type WorkItemSelection,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import {
  HostStateStore,
  openHostStateDatabase,
  type WorkflowAttemptApprovalRequest,
  type StateVersion,
  type WorkState,
  type WorkIdentity,
  type SessionProducerHandle,
} from '../host-state.js';
import { loadProjectSetContext } from '../config/project-context.js';
import { correctiveExecutionSchema, type CorrectiveExecution } from './final-assurance.js';
import { deriveWorkspaceId } from '../workspace-identity.js';
import {
  advanceSessionWorkflowHandoffFromConfig,
  prepareSessionWorkflowHandoffFromConfig,
  validateSessionAgentOutcome,
  validateSessionWorkflowHandoffFromConfig,
  allowsSharedInvocationForConfiguredSlots,
  sessionReportsCanShareInvocation,
  type SessionAgentOutcome,
  type SessionHandoffContext,
  type SessionWorkflowHandoff,
} from './session-handoff.js';
import {
  parseSessionBridgeObservation,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from './mastra-session-bridge.js';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  type ScopedSourceSnapshot,
} from './scoped-source-snapshot.js';
import type { WorkflowSessionReservation } from '../runtime-kernel.js';
import {
  createLocalSourceWriteApprovalVerifier,
  readLocalSourceWriteAuthorization,
} from './local-source-authorization.js';
import { createLocalSessionReconciliationVerifier } from './local-session-reconciliation.js';
import { readAdmittedSessionExecutionContext, openAdmittedSessionExecution } from './admitted-session-execution.js';
import {
  buildAdmittedDevelopmentPacket,
  readInitialSourceContinuationLineageView,
  type AcceptedSourceContinuation,
  type InitialSourceContinuationLineageView,
} from './admitted-development-packet.js';
import { configuredFrontierRecoveryViewDigest } from './failed-prewriter-transition.js';
import {
  initialSourceContinuationRecord,
  validateInitialSourceContinuationReceipt,
  type InitialSourceContinuationReceipt,
} from './initial-source-continuation.js';
import type { TrustedProjectIdentity } from '../contracts/public-ingress.js';
import {
  attachObservedSourcePreparation,
  type SourceWritePreflightContext,
  type TaskSourceMutationPolicyContext,
  type TaskSourceMutationPolicyRequest,
  type TaskSourcePreparedOperationBinding,
} from './source-preflight-operations.js';
import { resolveTaskSourceRoot } from './task-source-binding.js';
import type { LocalWorkAdmissionInput } from './local-work-admission.js';
import {
  validateActivationUse,
  validateObservedActivationUseWritePlan,
  validateObservedResearchRecordPlan,
  type ActivationUse,
  type ObservedActivationUseWritePlan,
  type ObservedResearchRecordPlan,
} from '../research-decision.js';

interface Issuance {
  readonly action_id: string;
  readonly issue_id: string;
  readonly operator_run_id: string;
  readonly report: SessionAgentOutcome | null;
}

const Ajv2020Constructor = Ajv2020 as unknown as new (options: { strict: boolean; allErrors: boolean }) => {
  compile<T>(schema: object): ValidateFunction<T>;
};
const validSessionState = new Ajv2020Constructor({
  strict: true,
  allErrors: true,
}).compile<PersistentSessionHandoffState>(stateSchema);
const sameJson = (left: unknown, right: unknown): boolean => canonicalJson(left) === canonicalJson(right);

function requestRoleMatchesConfiguredAssignment(config: AgentRuntimeConfig, request: SessionBridgeRequest): boolean {
  return (
    config.workflows[request.workflow_id]?.stages.find((stage) => stage.id === request.stage_id)?.assignments[
      request.assignment_index
    ]?.role === request.role
  );
}

export interface PersistentSessionHandoffState {
  readonly schema: 'PersistentSessionHandoffState/v1';
  readonly workspace_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly handoff: SessionWorkflowHandoff;
  readonly issuances: readonly Issuance[];
}

export interface PersistentSessionSnapshot {
  readonly version: StateVersion;
  readonly state: PersistentSessionHandoffState;
  readonly resume_status: 'ready' | 'issued_outcome_uncertain' | 'blocked' | 'all_reports_collected';
}

function requireState(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function resumeStatus(state: PersistentSessionHandoffState): PersistentSessionSnapshot['resume_status'] {
  if (state.issuances.some((item) => item.report === null)) return 'issued_outcome_uncertain';
  if (state.handoff.status === 'blocked') return 'blocked';
  if (state.handoff.status === 'all_reports_collected') return 'all_reports_collected';
  return 'ready';
}

/** One deterministic database path beneath the YAML-controlled work root. */
export function sessionHandoffDatabasePath(repositoryRoot: string, config: AgentRuntimeConfig): string {
  return path.join(repositoryRoot, config.control.work_root, 'session-handoff.v1.sqlite');
}

function sourcePreflightContinuation(
  store: HostStateStore,
  identity: WorkIdentity,
  attempt: number,
): AcceptedSourceContinuation | null {
  const configured = store.readConfiguredFrontierRecoveryView(identity, attempt);
  const initial: InitialSourceContinuationLineageView | null = readInitialSourceContinuationLineageView(
    store,
    identity,
    attempt,
  );
  requireState(!(configured && initial), 'multiple Host Source continuation records are ambiguous');
  return initial ?? configured;
}

function sourcePreflightContinuationDigest(view: AcceptedSourceContinuation | null): string {
  if (view === null) return canonicalJsonDigest(null);
  if ('receipt' in view)
    return canonicalJsonDigest({
      initialReceipt: initialSourceContinuationRecord(view.receipt).digest,
      frontierCodeRebind: view.frontierCodeRebind?.record_digest ?? null,
      completedSourceReportRecovery: view.completedSourceReportRecovery?.record_digest ?? null,
      ...(view.runtimeCodeContinuations ? { runtimeCodeContinuations: view.runtimeCodeContinuations } : {}),
    });
  return 'schema' in view ? initialSourceContinuationRecord(view).digest : configuredFrontierRecoveryViewDigest(view);
}

function sourceWritePreflightResolver(
  repositoryRoot: string,
  getStore: () => HostStateStore,
  getLedger: () => MastraSessionLedger,
): (
  request: WorkflowAttemptApprovalRequest,
  hostSnapshot: import('../host-state.js').HostStateSnapshot,
) => Promise<SourceWritePreflightContext | null> {
  const readEvidence = (request: WorkflowAttemptApprovalRequest) => {
    const store = getStore(),
      workId = request.identity.work_id,
      hostSnapshot = store.readHostStateSnapshot(request.identity),
      work = hostSnapshot.work;
    if (
      !work ||
      work.binding.lifecycle_work_id !== workId ||
      work.binding.repository_id !== request.identity.repository_id ||
      canonicalJsonDigest(work.binding.project_ids) !== canonicalJsonDigest(request.identity.project_ids) ||
      canonicalJsonDigest(work.binding.integrations_digest) !==
        canonicalJsonDigest(request.identity.integrations_digest) ||
      request.config_digest !== work.binding.config_digest ||
      request.workflow_id !== work.binding.workflow_id
    )
      throw new Error('Source preflight Host identity or workflow differs from the current Work');
    const projectId = work.binding.project_ids.length === 1 ? work.binding.project_ids[0]! : null;
    if (!projectId) throw new Error('Source preflight requires the admitted single-project session');
    const admitted = readAdmittedSessionExecutionContext(repositoryRoot, store, projectId, workId);
    if (canonicalJsonDigest(admitted.identity) !== canonicalJsonDigest(request.identity))
      throw new Error('Source preflight admitted identity differs from the Host request');
    const config = loadRuntimeConfig(repositoryRoot),
      projectContext = loadProjectSetContext(
        repositoryRoot,
        config,
        request.identity.repository_id,
        request.identity.project_ids,
      ),
      journal = getLedger().currentSnapshot(workId);
    if (!journal || journal.state.work_id !== workId || journal.state.run_id !== work.execution.run_id)
      throw new Error('Source preflight requires the current same-thread Host journal');
    const access = requireSafeRepositoryAccess(repositoryRoot),
      scopeBytes = access.readBytes(work.contracts.scope.path, 'source preflight current scope'),
      acceptanceBytes = access.readBytes(work.contracts.acceptance.path, 'source preflight current acceptance'),
      workItem = admitted.workItem as LocalWorkAdmissionInput['workItem'];
    if (
      !workItem ||
      workItem.schema !== 'WorkItem/v1' ||
      workItem.id !== workId ||
      canonicalJsonDigest(workItem) !== work.binding.work_item_digest
    )
      throw new Error('Source preflight admitted work item differs from Host');
    const selection: WorkItemSelection = {
      team: work.binding.team_id,
      kind: workItem.canonical_kind as WorkItemSelection['kind'],
      intent: workItem.intent as WorkItemSelection['intent'],
      project: workItem.project_id,
      risk_flags: [...workItem.risk_flags],
      labels: [...workItem.labels],
    };
    const taskPacket = buildAdmittedDevelopmentPacket({
      repositoryRoot,
      config,
      host: hostSnapshot,
      sourceStore: store,
      ledger: journal,
      workItem,
      selection,
      scopeBytes,
      acceptanceBytes,
      configuredContext: null,
    });
    const preparationKinds = new Set([
      'source_plan',
      'platform_knowledge',
      'implementation_policy',
      'change_impact_pre',
      'documentation_validation',
    ]);
    const preparations = work.lifecycle.references
      .filter(
        (reference) =>
          preparationKinds.has(reference.kind) &&
          reference.artifact_schema === 'LifecyclePreparationObservation/v1' &&
          reference.disposition === 'current',
      )
      .map((reference) => ({
        reference,
        bytes: access.readBytes(reference.path, 'source preflight lifecycle preparation'),
      }));
    const localAuthorizations = work.lifecycle.references.filter(
      (reference) =>
        reference.kind === 'execution_approval' &&
        reference.disposition === 'current' &&
        reference.decision === 'approved' &&
        reference.artifact_schema === 'LocalSourceWriteAuthorization/v1',
    );
    if (localAuthorizations.length !== 1)
      throw new Error('Source preflight requires one current local scoped human authorization');
    const localAuthorization = readLocalSourceWriteAuthorization(repositoryRoot, localAuthorizations[0]!.path);
    if (localAuthorization.sha256 !== localAuthorizations[0]!.sha256)
      throw new Error('Source preflight local human authorization changed');
    const stage = config.workflows[request.workflow_id]?.stages.find((candidate) => candidate.id === request.stage_id),
      assignment = stage?.assignments[request.assignment_index];
    if (!assignment) throw new Error('Source preflight Host assignment is not configured');
    const stable = {
      hostSnapshot,
      journal,
      config,
      projectContext,
      workItem,
      taskPacket,
      scopeBytes,
      acceptanceBytes,
      continuation: sourcePreflightContinuation(store, request.identity, journal.state.attempt),
      preparations,
      localAuthorizationSha256: localAuthorization.sha256,
      projectId,
    };
    return { ...stable, assignmentRole: assignment.role };
  };

  return async (request, suppliedHostSnapshot) => {
    const initial = readEvidence(request);
    if (canonicalJsonDigest(initial.hostSnapshot) !== canonicalJsonDigest(suppliedHostSnapshot))
      throw new Error('Source preflight received a stale Host snapshot');
    const store = getStore(),
      execution = await openAdmittedSessionExecution(
        repositoryRoot,
        store,
        initial.projectId,
        request.identity.work_id,
      ),
      authentication = execution.composition.authentication,
      workflowHostCapability = execution.composition.workflowHostCapability;
    if (
      workflowHostCapability === null ||
      authentication.repositoryRoot !== repositoryRoot ||
      authentication.repositoryId !== request.identity.repository_id ||
      canonicalJsonDigest(authentication.projectIds) !== canonicalJsonDigest(request.identity.project_ids) ||
      authentication.principal !==
        'local-session:' + canonicalJsonDigest(initial.hostSnapshot.work!.lease!.thread_id) ||
      !authentication.permittedOperations.includes('runtime.write')
    )
      throw new Error('Source preflight trusted local workflow capability is unavailable');
    const trustedIdentity: TrustedProjectIdentity = {
      schema: 'TrustedProjectIdentity/v1',
      source: 'authenticated-context',
      principal: authentication.principal,
      role: initial.assignmentRole,
      tenant: initial.projectContext.repository_id,
      project: initial.projectId,
      registry_hash: initial.projectContext.registry_hash,
    };
    const assertCurrent = async (): Promise<void> => {
      const current = readEvidence(request);
      if (
        canonicalJsonDigest(current.hostSnapshot) !== canonicalJsonDigest(initial.hostSnapshot) ||
        canonicalJsonDigest(current.journal) !== canonicalJsonDigest(initial.journal) ||
        runtimeConfigDigest(current.config) !== runtimeConfigDigest(initial.config) ||
        canonicalJsonDigest(current.projectContext) !== canonicalJsonDigest(initial.projectContext) ||
        canonicalJsonDigest(current.taskPacket) !== canonicalJsonDigest(initial.taskPacket) ||
        sourcePreflightContinuationDigest(current.continuation) !==
          sourcePreflightContinuationDigest(initial.continuation) ||
        !current.scopeBytes.equals(initial.scopeBytes) ||
        !current.acceptanceBytes.equals(initial.acceptanceBytes) ||
        canonicalJsonDigest(
          current.preparations.map(({ reference, bytes }) => ({
            reference,
            sha256: createHash('sha256').update(bytes).digest('hex'),
          })),
        ) !==
          canonicalJsonDigest(
            initial.preparations.map(({ reference, bytes }) => ({
              reference,
              sha256: createHash('sha256').update(bytes).digest('hex'),
            })),
          ) ||
        current.localAuthorizationSha256 !== initial.localAuthorizationSha256
      )
        throw new Error('Source preflight inputs changed during configured policy evaluation');
    };
    return {
      request,
      hostSnapshot: initial.hostSnapshot,
      journal: initial.journal,
      config: initial.config,
      projectContext: initial.projectContext,
      trustedIdentity,
      taskPacket: initial.taskPacket,
      scopeBytes: initial.scopeBytes,
      acceptanceBytes: initial.acceptanceBytes,
      continuation: initial.continuation,
      preparations: initial.preparations,
      workflowHostCapability,
      assertCurrent,
    };
  };
}

/** Build the trusted evidence for the Host-only TaskSource create issuer. */
function taskSourceMutationPolicyResolver(
  repositoryRoot: string,
  getStore: () => HostStateStore,
  getLedger: () => MastraSessionLedger,
): (input: {
  readonly request: TaskSourceMutationPolicyRequest;
  readonly operation: Readonly<Record<string, unknown>>;
  readonly stateVersion: StateVersion;
  readonly hostSnapshot: import('../host-state.js').HostStateSnapshot;
}) => Promise<import('./source-preflight-operations.js').TaskSourceMutationPolicyDecision> {
  const readEvidence = (request: TaskSourceMutationPolicyRequest, expectedIdentity: WorkIdentity, attempt: number) => {
    const store = getStore(),
      hostSnapshot = store.readHostStateSnapshot(expectedIdentity);
    const work = hostSnapshot.work;
    requireState(
      work &&
        work.binding.lifecycle_work_id === request.work_id &&
        work.binding.config_digest === request.config_digest &&
        work.lease?.thread_id === request.thread_id &&
        canonicalJsonDigest(work.lease) === canonicalJsonDigest(request.lease),
      'task-source policy Host identity or lease differs',
    );
    const projectId = work.binding.project_ids.length === 1 ? work.binding.project_ids[0]! : null;
    requireState(projectId, 'task-source policy requires one admitted project');
    const admitted = readAdmittedSessionExecutionContext(repositoryRoot, store, projectId, request.work_id);
    const config = loadRuntimeConfig(repositoryRoot),
      projectContext = loadProjectSetContext(
        repositoryRoot,
        config,
        work.binding.repository_id,
        work.binding.project_ids,
      ),
      journal = getLedger().currentSnapshot(request.work_id);
    requireState(
      journal &&
        journal.state.run_id === work.execution.run_id &&
        journal.state.attempt === attempt &&
        request.scope_digest === work.binding.work_source_revision,
      'task-source policy requires the current Host journal',
    );
    const access = requireSafeRepositoryAccess(repositoryRoot),
      scopeBytes = access.readBytes(work.contracts.scope.path, 'task-source policy current scope'),
      acceptanceBytes = access.readBytes(work.contracts.acceptance.path, 'task-source policy current acceptance'),
      workItem = admitted.workItem as LocalWorkAdmissionInput['workItem'];
    requireState(
      workItem?.schema === 'WorkItem/v1' &&
        workItem.id === request.work_id &&
        canonicalJsonDigest(workItem) === work.binding.work_item_digest,
      'task-source policy work item differs from Host',
    );
    const selection: WorkItemSelection = {
      team: work.binding.team_id,
      kind: workItem.canonical_kind as WorkItemSelection['kind'],
      intent: workItem.intent as WorkItemSelection['intent'],
      project: workItem.project_id,
      risk_flags: [...workItem.risk_flags],
      labels: [...workItem.labels],
    };
    const taskPacket = buildAdmittedDevelopmentPacket({
      repositoryRoot,
      config,
      host: hostSnapshot,
      sourceStore: store,
      ledger: journal,
      workItem,
      selection,
      scopeBytes,
      acceptanceBytes,
      configuredContext: null,
    });
    const preparationKinds = new Set([
      'source_plan',
      'platform_knowledge',
      'implementation_policy',
      'change_impact_pre',
      'documentation_validation',
    ]);
    const preparations = work.lifecycle.references
      .filter(
        (reference) =>
          preparationKinds.has(reference.kind) &&
          reference.artifact_schema === 'LifecyclePreparationObservation/v1' &&
          reference.disposition === 'current',
      )
      .map((reference) => ({ reference, bytes: access.readBytes(reference.path, 'task-source policy preparation') }));
    const authorizationReferences = work.lifecycle.references.filter(
      (reference) =>
        reference.kind === 'execution_approval' &&
        reference.disposition === 'current' &&
        reference.decision === 'approved' &&
        reference.artifact_schema === 'LocalSourceWriteAuthorization/v1',
    );
    requireState(
      authorizationReferences.length === 1,
      'task-source policy requires one current scoped Source authorization',
    );
    const sourceAuthorizationReference = authorizationReferences[0]!,
      sourceAuthorization = readLocalSourceWriteAuthorization(repositoryRoot, sourceAuthorizationReference.path),
      stageId = sourceAuthorization.authorization.stage_ids[0],
      stage = config.workflows[work.binding.workflow_id]?.stages.find((candidate) => candidate.id === stageId),
      assignment = stage?.assignments.find(
        (candidate) => config.agents.profiles[candidate.profile]?.mutation_scope === 'repository_source',
      );
    requireState(
      sourceAuthorization.sha256 === sourceAuthorizationReference.sha256 && assignment,
      'task-source policy current Source authorization or assignment is invalid',
    );
    return {
      hostSnapshot,
      journal,
      config,
      projectContext,
      workItem,
      taskPacket,
      scopeBytes,
      acceptanceBytes,
      preparations,
      continuation: sourcePreflightContinuation(store, expectedIdentity, journal.state.attempt),
      sourceAuthorizationReference,
      sourceAuthorization: sourceAuthorization.authorization,
      sourceAuthorizationSha256: sourceAuthorization.sha256,
      assignmentRole: assignment.role,
      projectId,
    };
  };
  return async ({ request, operation, stateVersion, hostSnapshot }) => {
    const originalRequest = operation.request as { readonly attempt?: unknown };
    requireState(
      Number.isSafeInteger(originalRequest?.attempt) && (originalRequest.attempt as number) > 0,
      'task-source prepared operation attempt is invalid',
    );
    const identity: WorkIdentity = {
      repository_id: hostSnapshot.work!.binding.repository_id,
      project_ids: hostSnapshot.work!.binding.project_ids,
      integrations_digest: hostSnapshot.work!.binding.integrations_digest,
      work_id: request.work_id,
    };
    const initial = readEvidence(request, identity, originalRequest.attempt as number);
    requireState(
      canonicalJsonDigest(initial.hostSnapshot) === canonicalJsonDigest(hostSnapshot),
      'task-source policy received a stale Host snapshot',
    );
    const execution = await openAdmittedSessionExecution(
      repositoryRoot,
      getStore(),
      initial.projectId,
      request.work_id,
    );
    const authentication = execution.composition.authentication,
      workflowHostCapability = execution.composition.workflowHostCapability;
    requireState(
      workflowHostCapability !== null &&
        authentication.repositoryRoot === repositoryRoot &&
        authentication.repositoryId === hostSnapshot.work!.binding.repository_id &&
        canonicalJsonDigest(authentication.projectIds) ===
          canonicalJsonDigest(hostSnapshot.work!.binding.project_ids) &&
        authentication.principal === 'local-session:' + canonicalJsonDigest(request.thread_id) &&
        authentication.permittedOperations.includes('runtime.write'),
      'task-source trusted workflow capability is unavailable',
    );
    const trustedIdentity: TrustedProjectIdentity = {
      schema: 'TrustedProjectIdentity/v1',
      source: 'authenticated-context',
      principal: authentication.principal,
      role: initial.assignmentRole,
      tenant: initial.projectContext.repository_id,
      project: initial.projectId,
      registry_hash: initial.projectContext.registry_hash,
    };
    const preparedOperation: TaskSourcePreparedOperationBinding = {
      operation_id: request.operation_id,
      request_id: request.request_id,
      operation_hash: request.operation_hash,
      work_id: request.work_id,
      thread_id: request.thread_id,
      scope_digest: request.scope_digest,
      config_digest: request.config_digest,
      lease: request.lease,
      branch_ref: request.branch_ref,
      source_root: request.source_root,
      proposed_argv: request.proposed_argv,
    };
    const assertCurrent = async (): Promise<void> => {
      const current = readEvidence(request, identity, originalRequest.attempt as number);
      requireState(
        canonicalJsonDigest(current.hostSnapshot) === canonicalJsonDigest(initial.hostSnapshot) &&
          canonicalJsonDigest(current.journal) === canonicalJsonDigest(initial.journal) &&
          runtimeConfigDigest(current.config) === runtimeConfigDigest(initial.config) &&
          canonicalJsonDigest(current.projectContext) === canonicalJsonDigest(initial.projectContext) &&
          canonicalJsonDigest(current.taskPacket) === canonicalJsonDigest(initial.taskPacket) &&
          sourcePreflightContinuationDigest(current.continuation) ===
            sourcePreflightContinuationDigest(initial.continuation) &&
          current.scopeBytes.equals(initial.scopeBytes) &&
          current.acceptanceBytes.equals(initial.acceptanceBytes) &&
          canonicalJsonDigest(
            current.preparations.map(({ reference, bytes }) => ({
              reference,
              digest: createHash('sha256').update(bytes).digest('hex'),
            })),
          ) ===
            canonicalJsonDigest(
              initial.preparations.map(({ reference, bytes }) => ({
                reference,
                digest: createHash('sha256').update(bytes).digest('hex'),
              })),
            ) &&
          current.sourceAuthorizationSha256 === initial.sourceAuthorizationSha256,
        'task-source policy inputs changed during asynchronous evaluation',
      );
      const stored = getStore().readHostStateSnapshot(identity);
      requireState(
        canonicalJsonDigest(stored) === canonicalJsonDigest(hostSnapshot),
        'task-source Host compare-and-swap changed during policy evaluation',
      );
    };
    const context: TaskSourceMutationPolicyContext = {
      repositoryRoot,
      taskSourceRequest: request,
      preparedOperation,
      preparedStateVersion: stateVersion,
      sourceAuthorizationReference: initial.sourceAuthorizationReference,
      sourceAuthorization: initial.sourceAuthorization,
      hostSnapshot: initial.hostSnapshot,
      journal: initial.journal,
      config: initial.config,
      projectContext: initial.projectContext,
      trustedIdentity,
      taskPacket: initial.taskPacket,
      scopeBytes: initial.scopeBytes,
      acceptanceBytes: initial.acceptanceBytes,
      continuation: initial.continuation,
      preparations: initial.preparations,
      workflowHostCapability,
      assertCurrent,
    };
    const { evaluateTaskSourceMutationPolicy } = await import('./source-preflight-operations.js');
    await assertCurrent();
    void operation;
    return evaluateTaskSourceMutationPolicy({ repositoryRoot, request, context });
  };
}

/** Opens the same configured host SQLite file; no provider or session tool is invoked. */
export function openConfiguredSessionHandoffStore(repositoryRoot: string): PersistentSessionHandoffStore {
  const config = loadRuntimeConfig(repositoryRoot);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
  const access = requireSafeRepositoryAccess(repositoryRoot);
  access.ensureDirectory(config.control.work_root, 'session handoff state root');
  const databasePath = sessionHandoffDatabasePath(repositoryRoot, config);
  try {
    const stats = lstatSync(databasePath);
    requireState(
      stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1,
      'session handoff database path is unsafe',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const database = openHostStateDatabase(databasePath);
  try {
    new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, repositoryRoot);
    return new PersistentSessionHandoffStore(database, workspaceId, config, repositoryRoot);
  } catch (error) {
    database.close(true);
    throw error;
  }
}

/** Current-v1 advisory state; the caller must observe collaboration-tool results itself. */
export class PersistentSessionHandoffStore {
  readonly #database: Database;
  readonly #workspaceId: string;
  readonly #config: AgentRuntimeConfig;
  readonly #repositoryRoot: string | undefined;
  readonly #configDigest: string;
  readonly #operatorRunId = randomUUID();

  constructor(database: Database, workspaceId: string, config: AgentRuntimeConfig, repositoryRoot?: string) {
    requireState(
      database instanceof Database && /^[a-f0-9]{64}$/.test(workspaceId),
      'session host database binding is invalid',
    );
    this.#database = database;
    this.#workspaceId = workspaceId;
    this.#config = config;
    this.#repositoryRoot = repositoryRoot;
    this.#configDigest = runtimeConfigDigest(config);
    database.exec('PRAGMA synchronous=FULL');
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_session_handoff (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id, work_id, attempt))',
    );
  }

  close(): void {
    this.#database.close(true);
  }

  #assertFreshConfig(): void {
    if (this.#repositoryRoot !== undefined)
      requireState(
        runtimeConfigDigest(loadRuntimeConfig(this.#repositoryRoot)) === this.#configDigest,
        'session root configuration changed during attempt',
      );
  }

  #read(workId: string, attempt: number): PersistentSessionSnapshot | null {
    this.#assertFreshConfig();
    const row = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_session_handoff WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, workId, attempt) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const state: unknown = JSON.parse(row.payload);
    requireState(validSessionState(state), 'session state current-v1 schema is invalid');
    requireState(
      state.schema === 'PersistentSessionHandoffState/v1' &&
        state.workspace_id === this.#workspaceId &&
        state.work_id === workId &&
        state.attempt === attempt,
      'session state identity or schema is invalid',
    );
    requireState(
      JSON.stringify(Object.keys(state).sort()) ===
        JSON.stringify(['schema', 'workspace_id', 'work_id', 'attempt', 'handoff', 'issuances'].sort()),
      'session state fields are invalid',
    );
    requireState(
      row.digest === canonicalJsonDigest(state) && Number.isSafeInteger(row.revision) && row.revision > 0,
      'session state digest or revision is invalid',
    );
    requireState(
      state.handoff.config_digest === runtimeConfigDigest(this.#config),
      'session configuration changed during attempt',
    );
    validateSessionWorkflowHandoffFromConfig(this.#config, state.handoff);
    requireState(
      state.handoff.context.work_id === workId && state.handoff.context.attempt === attempt,
      'session handoff context differs from state key',
    );
    requireState(
      state.issuances.every(
        (item) =>
          item &&
          typeof item.action_id === 'string' &&
          typeof item.issue_id === 'string' &&
          typeof item.operator_run_id === 'string' &&
          Object.keys(item).sort().join(',') === 'action_id,issue_id,operator_run_id,report' &&
          state.handoff.actions.some((action) => action.action_id === item.action_id),
      ),
      'session issuance fields or action are invalid',
    );
    requireState(
      new Set(state.issuances.map((item) => item.action_id)).size === state.issuances.length &&
        new Set(state.issuances.map((item) => item.issue_id)).size === state.issuances.length,
      'session issuance identities contain duplicates',
    );
    for (const item of state.issuances.filter((entry) => entry.report !== null)) {
      requireState(item.report?.session_result?.issue_id === item.issue_id, 'session issuance report id differs');
      validateSessionAgentOutcome(
        state.handoff,
        state.handoff.actions.find((action) => action.action_id === item.action_id)!,
        item.report!,
      );
    }
    return freezeJsonValue({
      version: { revision: row.revision, digest: row.digest },
      state,
      resume_status: resumeStatus(state),
    });
  }

  resume(workId: string, attempt: number): PersistentSessionSnapshot | null {
    return this.#read(workId, attempt);
  }

  prepare(selection: WorkItemSelection, context: SessionHandoffContext): PersistentSessionSnapshot {
    requireState(!this.#database.inTransaction, 'nested session state transaction is forbidden');
    return this.#database
      .transaction(() => {
        this.#assertFreshConfig();
        const handoff = prepareSessionWorkflowHandoffFromConfig(this.#config, selection, context);
        const state: PersistentSessionHandoffState = {
          schema: 'PersistentSessionHandoffState/v1',
          workspace_id: this.#workspaceId,
          work_id: context.work_id,
          attempt: context.attempt,
          handoff,
          issuances: [],
        };
        const digest = canonicalJsonDigest(state);
        this.#assertFreshConfig();
        const result = this.#database
          .query(
            'INSERT INTO agent_host_session_handoff (workspace_id,work_id,attempt,revision,payload,digest) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING',
          )
          .run(this.#workspaceId, context.work_id, context.attempt, 1, canonicalJson(state), digest);
        requireState(result.changes === 1, 'session attempt already exists');
        return this.#read(context.work_id, context.attempt)!;
      })
      .immediate();
  }

  prepareOrResume(
    selection: WorkItemSelection,
    context: SessionHandoffContext,
  ): { readonly snapshot: PersistentSessionSnapshot; readonly created: boolean } {
    const current = this.resume(context.work_id, context.attempt);
    if (current) {
      this.#assertRequestMatches(current, selection, context);
      return { snapshot: current, created: false };
    }
    try {
      return { snapshot: this.prepare(selection, context), created: true };
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'session attempt already exists') throw error;
      const raced = this.resume(context.work_id, context.attempt);
      requireState(raced, 'session attempt race has no persisted state');
      this.#assertRequestMatches(raced, selection, context);
      return { snapshot: raced, created: false };
    }
  }

  #assertRequestMatches(
    snapshot: PersistentSessionSnapshot,
    selection: WorkItemSelection,
    context: SessionHandoffContext,
  ): void {
    requireState(
      sameJson(snapshot.state.handoff.selection, selection) && sameJson(snapshot.state.handoff.context, context),
      'session attempt request differs from persisted binding',
    );
  }

  #change(
    workId: string,
    attempt: number,
    expected: StateVersion,
    update: (state: PersistentSessionHandoffState) => PersistentSessionHandoffState,
  ): PersistentSessionSnapshot {
    requireState(!this.#database.inTransaction, 'nested session state transaction is forbidden');
    return this.#database
      .transaction(() => {
        this.#assertFreshConfig();
        const current = this.#read(workId, attempt);
        requireState(
          current && current.version.revision === expected.revision && current.version.digest === expected.digest,
          'session state compare-and-swap conflict',
        );
        const next = update(current.state);
        this.#assertFreshConfig();
        const digest = canonicalJsonDigest(next);
        const result = this.#database
          .query(
            'UPDATE agent_host_session_handoff SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(next),
            digest,
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(result.changes === 1, 'session state compare-and-swap conflict');
        return this.#read(workId, attempt)!;
      })
      .immediate();
  }

  /** Reserve the complete ready wave durably before any agent tool is called. */
  issueWave(
    workId: string,
    attempt: number,
    expected: StateVersion,
  ): {
    readonly snapshot: PersistentSessionSnapshot;
    readonly issuances: readonly { readonly action_id: string; readonly issue_id: string }[];
  } {
    const snapshot = this.#change(workId, attempt, expected, (state) => {
      requireState(state.handoff.status === 'awaiting_agent_outcomes', 'session handoff is terminal');
      requireState(state.issuances.length === 0, 'session wave was already issued');
      requireState(state.handoff.actions.length > 0, 'session wave has no actions');
      requireState(
        new Set(state.handoff.actions.map((action) => action.action_id)).size === state.handoff.actions.length,
        'session wave action identities contain duplicates',
      );
      return {
        ...state,
        issuances: state.handoff.actions.map((action) => ({
          action_id: action.action_id,
          issue_id: randomUUID(),
          operator_run_id: this.#operatorRunId,
          report: null,
        })),
      };
    });
    return {
      snapshot,
      issuances: snapshot.state.issuances.map(({ action_id, issue_id }) => ({ action_id, issue_id })),
    };
  }

  /** Persist issuance before the operator calls a built-in agent tool. Never reissues an action. */
  issue(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
  ): { readonly snapshot: PersistentSessionSnapshot; readonly issue_id: string } {
    const issueId = randomUUID();
    const snapshot = this.#change(workId, attempt, expected, (state) => {
      requireState(state.handoff.status === 'awaiting_agent_outcomes', 'session handoff is terminal');
      requireState(
        state.handoff.actions.some((action) => action.action_id === actionId),
        'session action is not in the current wave',
      );
      requireState(!state.issuances.some((item) => item.action_id === actionId), 'session action was already issued');
      requireState(
        !state.issuances.some((item) => item.report === null && item.operator_run_id !== this.#operatorRunId),
        'issued outcome is uncertain after restart',
      );
      return {
        ...state,
        issuances: [
          ...state.issuances,
          { action_id: actionId, issue_id: issueId, operator_run_id: this.#operatorRunId, report: null },
        ],
      };
    });
    return { snapshot, issue_id: issueId };
  }

  /** Record one observed report. Matching JSON does not authenticate the collaboration tool. */
  report(
    workId: string,
    attempt: number,
    expected: StateVersion,
    outcome: SessionAgentOutcome,
  ): PersistentSessionSnapshot {
    return this.#change(workId, attempt, expected, (state) => {
      const issuance = state.issuances.find((item) => item.action_id === outcome.action_id);
      requireState(
        issuance && issuance.report === null && issuance.issue_id === outcome.session_result?.issue_id,
        'session report has no matching open issuance',
      );
      const action = state.handoff.actions.find((item) => item.action_id === outcome.action_id);
      requireState(action, 'session report action is not in the current wave');
      validateSessionAgentOutcome(state.handoff, action, outcome);
      const historicalRef = state.handoff.outcomes.some(
        (item) => item.session_result.tool_call_ref === outcome.session_result.tool_call_ref,
      );
      const priorBatchReports = state.issuances.flatMap((entry) =>
        entry.report?.session_result.tool_call_ref === outcome.session_result.tool_call_ref ? [entry.report] : [],
      );
      const priorBatchEntry = state.issuances.find(
        (entry) => entry.report?.session_result.tool_call_ref === outcome.session_result.tool_call_ref,
      );
      const priorBatchAction =
        priorBatchEntry && state.handoff.actions.find((candidate) => candidate.action_id === priorBatchEntry.action_id);
      requireState(
        !historicalRef &&
          (priorBatchReports.length === 0 ||
            (priorBatchReports.length === 1 &&
              priorBatchEntry?.operator_run_id === issuance.operator_run_id &&
              priorBatchAction &&
              sessionReportsCanShareInvocation(
                this.#config,
                state.handoff.workflow_id,
                priorBatchAction,
                priorBatchEntry.report!,
                action,
                outcome,
              ))),
        'session tool call reference was replayed outside an allowed configured slot batch',
      );
      const issuances = state.issuances.map((item) =>
        item.action_id === outcome.action_id ? { ...item, report: outcome } : item,
      );
      if (issuances.length < state.handoff.actions.length || issuances.some((item) => item.report === null))
        return { ...state, issuances };
      const reports = state.handoff.actions.map(
        (item) => issuances.find((entry) => entry.action_id === item.action_id)!.report!,
      );
      const handoff = advanceSessionWorkflowHandoffFromConfig(this.#config, state.handoff, reports);
      return { ...state, handoff, issuances: [] };
    });
  }
}

export interface MastraLedgerItem {
  readonly request: SessionBridgeRequest;
  readonly issue_id: string | null;
  readonly observation: SessionBridgeObservation | null;
  readonly host_reservation?: WorkflowSessionReservation;
  readonly research_activation?: { readonly use: ActivationUse; readonly plan: ObservedActivationUseWritePlan };
  readonly research_normalization?: ObservedResearchRecordPlan;
}

export interface MastraSessionLedgerState {
  readonly schema: 'MastraSessionLedger/v1';
  readonly workspace_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly run_id: string;
  readonly corrective_execution?: CorrectiveExecution | null;
  readonly source_scope?: ScopedSourceSnapshot | null;
  /** Current research wave: local preparation is resumable until exposure may have occurred. */
  readonly research_wave_exposure?: 'preparing' | 'possible';
  readonly step_id: string | null;
  readonly items: readonly MastraLedgerItem[];
  readonly completed: readonly { readonly step_id: string; readonly items: readonly MastraLedgerItem[] }[];
}

export interface MastraSessionLedgerSnapshot {
  readonly version: StateVersion;
  readonly state: MastraSessionLedgerState;
  readonly resume_status: 'ready' | 'issued_outcome_uncertain' | 'ready_to_resume' | 'blocked' | 'complete';
}

/** The native synthesis report remains immutable in this additive correction receipt. */
export interface SynthesisObservationCorrectionPlan {
  readonly schema: 'VidaSynthesisObservationCorrectionPlan/v1';
  readonly correction_id: string;
  readonly actor: string;
  readonly timestamp: string;
  readonly workspace_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly integrations_digest: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly action_id: string;
  readonly prior_issue_id: string;
  readonly native_session_handle: string;
  readonly owner_correction_pointer: string;
  readonly config_digest: string;
  readonly source_digest: string;
  readonly predecessor_refs: readonly { readonly result_id: string; readonly digest: string }[];
  readonly catalog_digest: string;
  readonly expected_work: StateVersion;
  readonly expected_ledger: StateVersion;
  readonly expected_journal: StateVersion;
  readonly original_item: MastraLedgerItem;
  readonly digest: string;
}

interface ReadOnlyDispatchPlan {
  readonly schema: 'VidaReadOnlyDispatchRepairPlan/v1';
  readonly digest: string;
  readonly repair_id: string;
  readonly workspace_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly logical_action_id: string;
  readonly prior_issue_id: string;
  readonly prior_native_handle: string;
  readonly prior_activation: MastraLedgerItem['research_activation'] | null;
  readonly dispatch_action_id: string;
  readonly replacement_issue_id: string;
  readonly request_digest: string;
  readonly scope_digest: string;
  readonly config_digest: string;
  readonly source_digest: string;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly mastra_version: StateVersion;
  readonly replacement_generation: 1;
  readonly status: 'prepared';
}

interface ReadOnlyDispatchActivation {
  readonly schema: 'VidaReadOnlyDispatchActivation/v1';
  readonly plan_digest: string;
  readonly logical_action_id: string;
  readonly dispatch_action_id: string;
  readonly issue_id: string;
  readonly prior_issue_id: string;
  readonly generation: 1;
}

function mastraLedgerStatus(state: MastraSessionLedgerState): MastraSessionLedgerSnapshot['resume_status'] {
  if (state.step_id === null) return 'blocked';
  if (state.items.some((item) => item.issue_id !== null && item.observation === null))
    return 'issued_outcome_uncertain';
  if (state.items.length > 0 && state.items.every((item) => item.observation !== null))
    return state.items.some((item) => item.observation?.status === 'reported_failed') ? 'blocked' : 'ready_to_resume';
  return 'ready';
}

export function validateResearchJournalItem(item: MastraLedgerItem, state: MastraSessionLedgerState): boolean {
  if (
    Object.keys(item).some(
      (key) =>
        ![
          'request',
          'issue_id',
          'observation',
          'host_reservation',
          'research_activation',
          'research_normalization',
        ].includes(key),
    )
  )
    return false;
  const binding = (plan: ObservedActivationUseWritePlan | ObservedResearchRecordPlan) =>
    plan.binding.work_id === state.work_id &&
    plan.binding.attempt === state.attempt &&
    plan.binding.run_id === state.run_id &&
    plan.binding.action_id === item.request.action_id &&
    plan.binding.issue_id === item.issue_id &&
    plan.binding.scope_digest === item.request.scope_digest &&
    plan.binding.config_digest === item.request.config_digest;
  if (item.research_activation) {
    if (Object.keys(item.research_activation).sort().join(',') !== 'plan,use') return false;
    const use = validateActivationUse(item.research_activation.use);
    const plan = validateObservedActivationUseWritePlan(item.research_activation.plan);
    if (
      !binding(plan) ||
      plan.use_digest !== use.digest ||
      use.work_item_id !== state.work_id ||
      use.source_revision !== plan.binding.source_revision ||
      use.scope_id !== plan.binding.scope_id
    )
      return false;
  }
  if (item.research_normalization) {
    const plan = validateObservedResearchRecordPlan(item.research_normalization);
    if (!item.observation || !binding(plan) || plan.observation_digest !== canonicalJsonDigest(item.observation))
      return false;
  }
  return true;
}

/** A CAS issue/outcome journal, deliberately without its own workflow stage scheduler. */
export class MastraSessionLedger {
  readonly #database: Database;
  readonly hostState: HostStateStore;
  readonly #config: AgentRuntimeConfig;
  readonly #workspaceId: string;
  readonly #configDigest: string;
  readonly #repositoryRoot: string;
  readonly #openedMaintenanceGeneration: number;
  #producerSync: SessionProducerHandle | undefined;

  constructor(
    database: Database,
    workspaceId: string,
    config: AgentRuntimeConfig,
    repositoryRoot: string,
    hostState: HostStateStore,
  ) {
    this.#database = database;
    this.#workspaceId = workspaceId;
    this.#config = config;
    this.#configDigest = runtimeConfigDigest(config);
    this.#repositoryRoot = repositoryRoot;
    this.hostState = hostState;
    Object.defineProperty(this, 'hostState', { writable: false, configurable: false });
    this.#openedMaintenanceGeneration = this.#maintenanceState().generation;
    database.exec('PRAGMA synchronous=FULL');
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id, work_id, attempt))',
    );
  }

  close(): void {
    this.#database.close(true);
  }

  /** Read the Host-owned receipt only for this fresh, exact ProjectContext. */
  readInitialSourceContinuationReceipt(
    identity: WorkIdentity,
    attempt: number,
  ): InitialSourceContinuationReceipt | null {
    this.#assertFreshConfig();
    const project = loadProjectSetContext(
      this.#repositoryRoot,
      this.#config,
      identity.repository_id,
      identity.project_ids,
    );
    requireState(
      project.repository_id === identity.repository_id &&
        sameJson(project.project_ids, identity.project_ids) &&
        project.integrations_digest === identity.integrations_digest &&
        Number.isSafeInteger(attempt) &&
        attempt > 0,
      'initial-source receipt ProjectContext or attempt differs',
    );
    const receipt = this.hostState.readInitialSourceContinuationReceipt(identity, attempt);
    return receipt ? validateInitialSourceContinuationReceipt(receipt) : null;
  }

  sessionProducerBinding() {
    return {
      database: this.#database,
      host: this.hostState,
      repositoryRoot: this.#repositoryRoot,
      config: this.#config,
      workspaceId: this.#workspaceId,
    };
  }

  beginSessionProducer(args: {
    selection: WorkItemSelection;
    context: SessionHandoffContext;
    workflowId: string;
    runId: string;
    projectIds: readonly string[];
    phase: 'initialize' | 'start' | 'resume';
    resumeIntent?: { readonly stepId: string; readonly observations: readonly SessionBridgeObservation[] };
    sourceScope?: ScopedSourceSnapshot | null;
  }): SessionProducerHandle {
    this.#assertFreshConfig();
    const project = loadProjectSetContext(
      this.#repositoryRoot,
      this.#config,
      this.#config.repository.repository_id,
      args.projectIds,
    );
    const host = this.hostState.readHostStateSnapshot({
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: args.context.work_id,
    });
    const journal = this.#read(args.context.work_id, args.context.attempt);
    return this.hostState.beginSessionProducer(this, {
      ...args,
      repositoryRoot: this.#repositoryRoot,
      config: this.#config,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      expectedJournal: journal?.version ?? null,
      maintenanceGeneration: host.maintenanceGeneration,
    });
  }

  syncFromSessionProducer(
    handle: SessionProducerHandle,
    ...args: Parameters<MastraSessionLedger['sync']>
  ): MastraSessionLedgerSnapshot {
    requireState(this.#producerSync === undefined, 'nested producer journal sync forbidden');
    this.hostState.assertSessionProducerCurrent(handle);
    this.#producerSync = handle;
    try {
      return this.sync(...args);
    } finally {
      this.#producerSync = undefined;
    }
  }

  #assertJournalWritesAllowed(): void {
    this.hostState.assertSessionProducerJournalWriteAllowed(this.#producerSync);
  }

  #assertFreshConfig(): void {
    requireState(
      runtimeConfigDigest(loadRuntimeConfig(this.#repositoryRoot)) === this.#configDigest,
      'Mastra session root configuration changed during attempt',
    );
  }

  #mayShareReadonlyInvocation(
    left: MastraLedgerItem,
    right: MastraLedgerItem,
    rightObservation: SessionBridgeObservation,
  ): boolean {
    const leftRequest = left.request;
    const rightRequest = right.request;
    if (
      left === right ||
      left.issue_id === null ||
      right.issue_id === null ||
      left.issue_id === right.issue_id ||
      leftRequest.action_id === rightRequest.action_id ||
      left.host_reservation ||
      right.host_reservation ||
      !requestRoleMatchesConfiguredAssignment(this.#config, leftRequest) ||
      !requestRoleMatchesConfiguredAssignment(this.#config, rightRequest) ||
      leftRequest.workflow_id !== 'task_execution' ||
      rightRequest.workflow_id !== 'task_execution' ||
      leftRequest.workflow_id !== rightRequest.workflow_id ||
      leftRequest.run_id !== rightRequest.run_id ||
      leftRequest.stage_id !== 'validate_focused' ||
      rightRequest.stage_id !== leftRequest.stage_id ||
      leftRequest.wave_index !== rightRequest.wave_index ||
      leftRequest.config_digest !== rightRequest.config_digest ||
      leftRequest.scope_digest !== rightRequest.scope_digest ||
      canonicalJsonDigest(leftRequest.configured_context_files ?? []) !==
        canonicalJsonDigest(rightRequest.configured_context_files ?? []) ||
      leftRequest.configured_context_digest !== rightRequest.configured_context_digest
    )
      return false;
    if (
      left.observation?.tool_call_ref !== rightObservation.tool_call_ref ||
      left.observation?.agent_id !== rightObservation.agent_id
    )
      return false;
    return allowsSharedInvocationForConfiguredSlots(
      this.#config,
      {
        workflow_id: leftRequest.workflow_id,
        stage_id: leftRequest.stage_id,
        assignment_index: leftRequest.assignment_index,
      },
      {
        workflow_id: rightRequest.workflow_id,
        stage_id: rightRequest.stage_id,
        assignment_index: rightRequest.assignment_index,
      },
    );
  }
  #maintenanceState(): { generation: number; status: string | null } {
    const row = this.#database
      .query('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
      .get(this.#workspaceId) as { payload: string; digest: string } | null;
    if (!row) return { generation: 0, status: null };
    const value = JSON.parse(row.payload) as { generation: number; status: string };
    requireState(
      row.digest === canonicalJsonDigest(value) && Number.isSafeInteger(value.generation),
      'session maintenance state checksum invalid',
    );
    return value;
  }
  #assertWorkingGeneration(): void {
    const current = this.#maintenanceState();
    requireState(
      current.status !== 'held' && current.generation === this.#openedMaintenanceGeneration,
      'session journal is fenced by maintenance generation',
    );
  }

  #read(workId: string, attempt: number): MastraSessionLedgerSnapshot | null {
    this.#assertFreshConfig();
    this.#assertWorkingGeneration();
    const row = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, workId, attempt) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const state = JSON.parse(row.payload) as MastraSessionLedgerState;
    requireState(
      state?.schema === 'MastraSessionLedger/v1' &&
        state.workspace_id === this.#workspaceId &&
        state.work_id === workId &&
        state.attempt === attempt &&
        typeof state.run_id === 'string' &&
        Boolean(Array.isArray(state.items)) &&
        Boolean(Array.isArray(state.completed)) &&
        (state.step_id === null || typeof state.step_id === 'string') &&
        Number.isSafeInteger(row.revision) &&
        row.revision > 0 &&
        row.digest === canonicalJsonDigest(state),
      'Mastra session ledger identity, shape or digest is invalid',
    );
    requireState(
      state.research_wave_exposure === undefined ||
        state.research_wave_exposure === 'preparing' ||
        state.research_wave_exposure === 'possible',
      'Mastra research wave exposure marker is invalid',
    );
    if (state.source_scope)
      requireState(
        state.source_scope.schema === 'ScopedSourceSnapshot/v1' &&
          state.source_scope.digest ===
            canonicalJsonDigest({
              schema: state.source_scope.schema,
              entries: state.source_scope.entries,
            }),
        'Mastra session source scope digest is invalid',
      );
    if (state.corrective_execution) {
      const execution = correctiveExecutionSchema.parse(state.corrective_execution);
      requireState(state.run_id === execution.engine_run_id, 'corrective engine run differs');
      this.hostState.assertCorrectiveExecutionForWork(workId, state.attempt, execution);
    }
    requireState(
      [...state.items, ...state.completed.flatMap((wave) => wave.items)].every(
        (item) =>
          item.request?.run_id === state.run_id &&
          sameJson(item.request.corrective_execution ?? null, state.corrective_execution ?? null) &&
          item.request?.scope_digest &&
          (item.issue_id === null || typeof item.issue_id === 'string') &&
          (item.host_reservation === undefined ||
            (item.host_reservation.schema === 'WorkflowSessionReservation/v1' &&
              item.host_reservation.receipt.attempt.attempt_id &&
              item.host_reservation.receipt.attempt.correction_generation ===
                (state.corrective_execution?.correction_generation ?? 0) &&
              sameJson(
                item.host_reservation.receipt.attempt.correction_authorization ?? null,
                state.corrective_execution?.authorization ?? null,
              ) &&
              item.host_reservation.request.workItemId === state.work_id &&
              item.host_reservation.request.stageId === item.request.stage_id &&
              item.host_reservation.request.assignmentIndex === item.request.assignment_index)) &&
          (item.observation === null ||
            (item.observation.action_id === item.request.action_id &&
              item.observation.issue_id === item.issue_id &&
              item.observation.host_attempt_id === item.host_reservation?.receipt.attempt.attempt_id)) &&
          validateResearchJournalItem(item, state),
      ),
      'Mastra session ledger item binding is invalid',
    );
    return freezeJsonValue({
      version: { revision: row.revision, digest: row.digest },
      state,
      resume_status: mastraLedgerStatus(state),
    });
  }

  resume(workId: string, attempt: number): MastraSessionLedgerSnapshot | null {
    return this.#read(workId, attempt);
  }

  /** Read the latest current-v1 journal for a work item without creating or changing state. */
  currentSnapshot(workId: string): MastraSessionLedgerSnapshot | null {
    requireState(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(workId), 'session work ID is invalid');
    const row = this.#database
      .query(
        'SELECT attempt FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? ORDER BY attempt DESC LIMIT 1',
      )
      .get(this.#workspaceId, workId) as { attempt: number } | null;
    return row ? this.#read(workId, row.attempt) : null;
  }

  #change(
    workId: string,
    attempt: number,
    expected: StateVersion,
    update: (state: MastraSessionLedgerState) => MastraSessionLedgerState,
  ): MastraSessionLedgerSnapshot {
    requireState(!this.#database.inTransaction, 'nested Mastra ledger transaction is forbidden');
    return this.#database
      .transaction(() => {
        this.#assertJournalWritesAllowed();
        this.#assertWorkingGeneration();
        const current = this.#read(workId, attempt);
        requireState(
          current?.version.revision === expected.revision && current.version.digest === expected.digest,
          'Mastra session ledger compare-and-swap conflict',
        );
        const state = update(current.state);
        this.#assertFreshConfig();
        const digest = canonicalJsonDigest(state);
        const result = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(state),
            digest,
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(result.changes === 1, 'Mastra session ledger compare-and-swap conflict');
        return this.#read(workId, attempt)!;
      })
      .immediate();
  }

  #readDispatchPlan(workId: string, attempt: number, actionId: string): ReadOnlyDispatchPlan | null {
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_readonly_dispatch_repair'")
      .get();
    if (!table) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
      )
      .get(this.#workspaceId, workId, attempt, actionId) as { payload: string; digest: string } | null;
    if (!row) return null;
    const plan = JSON.parse(row.payload) as ReadOnlyDispatchPlan;
    const { digest, ...body } = plan;
    requireState(
      plan.schema === 'VidaReadOnlyDispatchRepairPlan/v1' &&
        plan.workspace_id === this.#workspaceId &&
        plan.work_id === workId &&
        plan.attempt === attempt &&
        plan.logical_action_id === actionId &&
        plan.replacement_generation === 1 &&
        plan.status === 'prepared' &&
        row.digest === digest &&
        canonicalJsonDigest(body) === digest,
      'read-only dispatch repair plan is invalid',
    );
    return plan;
  }

  #readDispatchActivation(workId: string, attempt: number, actionId: string): ReadOnlyDispatchActivation | null {
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_readonly_dispatch_activation'")
      .get();
    if (!table) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_readonly_dispatch_activation WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=?',
      )
      .get(this.#workspaceId, workId, attempt, actionId) as { payload: string; digest: string } | null;
    if (!row) return null;
    const activation = JSON.parse(row.payload) as ReadOnlyDispatchActivation;
    requireState(
      activation.schema === 'VidaReadOnlyDispatchActivation/v1' &&
        activation.logical_action_id === actionId &&
        activation.generation === 1 &&
        row.digest === canonicalJsonDigest(activation),
      'read-only dispatch activation is invalid',
    );
    return activation;
  }

  preparedReadOnlyReplacement(
    workId: string,
    attempt: number,
    actionId: string,
  ): { native_session_handle: string; plan_digest: string } | null {
    const plan = this.#readDispatchPlan(workId, attempt, actionId);
    const current = this.#read(workId, attempt);
    return plan &&
      current &&
      !this.#readDispatchActivation(workId, attempt, actionId) &&
      current.version.revision === plan.mastra_version.revision &&
      current.version.digest === plan.mastra_version.digest &&
      current.state.items.some(
        (item) =>
          item.request.action_id === actionId && item.issue_id === plan.prior_issue_id && item.observation === null,
      )
      ? { native_session_handle: plan.prior_native_handle, plan_digest: plan.digest }
      : null;
  }

  /** Switch one native issue under CAS; Mastra's logical action and old v1 shape remain stable. */
  activateReadOnlyReplacement(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
  ): { snapshot: MastraSessionLedgerSnapshot; dispatch: ReadOnlyDispatchActivation } {
    requireState(!this.#database.inTransaction, 'nested read-only dispatch transaction forbidden');
    return this.#database
      .transaction(() => {
        this.#assertJournalWritesAllowed();
        this.#assertWorkingGeneration();
        const current = this.#read(workId, attempt);
        const plan = this.#readDispatchPlan(workId, attempt, actionId);
        requireState(
          current &&
            plan &&
            current.version.revision === expected.revision &&
            current.version.digest === expected.digest &&
            plan.mastra_version.revision === expected.revision &&
            plan.mastra_version.digest === expected.digest,
          'read-only dispatch plan or journal CAS version changed',
        );
        const item = current.state.items.find((entry) => entry.request.action_id === actionId);
        requireState(
          item?.issue_id === plan.prior_issue_id &&
            item.observation === null &&
            !item.host_reservation &&
            sameJson(item.research_activation ?? null, plan.prior_activation) &&
            canonicalJsonDigest(item.request) === plan.request_digest &&
            current.state.source_scope?.digest === plan.source_digest &&
            item.request.scope_digest === plan.scope_digest &&
            item.request.config_digest === plan.config_digest &&
            plan.config_digest === this.#configDigest,
          'read-only dispatch issue or frozen binding changed',
        );
        const workRows = this.#database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work'")
          .all(this.#workspaceId) as { revision: number; payload: string; digest: string }[];
        const ownerRows = workRows.filter((row) => {
          const value = JSON.parse(row.payload) as WorkState;
          return value.binding.lifecycle_work_id === workId && value.execution.run_id === current.state.run_id;
        });
        requireState(
          ownerRows.length === 1 &&
            ownerRows[0]!.revision === plan.work_version.revision &&
            ownerRows[0]!.digest === plan.work_version.digest &&
            (JSON.parse(ownerRows[0]!.payload) as WorkState).lease === null,
          'paused owner work version changed',
        );
        const ledgerRow = this.#database
          .query("SELECT revision,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'")
          .get(this.#workspaceId) as { revision: number; digest: string } | null;
        requireState(
          ledgerRow?.revision === plan.ledger_version.revision && ledgerRow.digest === plan.ledger_version.digest,
          'shared coordination version changed',
        );
        requireState(
          !this.#readDispatchActivation(workId, attempt, actionId),
          'replacement dispatch generation already activated',
        );
        const activation: ReadOnlyDispatchActivation = {
          schema: 'VidaReadOnlyDispatchActivation/v1',
          plan_digest: plan.digest,
          logical_action_id: actionId,
          dispatch_action_id: plan.dispatch_action_id,
          issue_id: plan.replacement_issue_id,
          prior_issue_id: plan.prior_issue_id,
          generation: 1,
        };
        const state = {
          ...current.state,
          items: current.state.items.map((entry) =>
            entry.request.action_id === actionId
              ? (({ research_activation: _prior, ...retained }) => ({
                  ...retained,
                  issue_id: plan.replacement_issue_id,
                }))(entry)
              : entry,
          ),
        };
        const updated = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(state),
            canonicalJsonDigest(state),
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(updated.changes === 1, 'read-only dispatch journal CAS conflict');
        this.#database.exec(
          'CREATE TABLE IF NOT EXISTS agent_host_readonly_dispatch_activation (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, logical_action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,logical_action_id))',
        );
        this.#database
          .query('INSERT INTO agent_host_readonly_dispatch_activation VALUES(?,?,?,?,?,?)')
          .run(
            this.#workspaceId,
            workId,
            attempt,
            actionId,
            canonicalJson(activation),
            canonicalJsonDigest(activation),
          );
        return { snapshot: this.#read(workId, attempt)!, dispatch: activation };
      })
      .immediate();
  }

  replacementDispatch(workId: string, attempt: number, actionId: string): ReadOnlyDispatchActivation | null {
    const activation = this.#readDispatchActivation(workId, attempt, actionId);
    if (!activation) return null;
    const plan = this.#readDispatchPlan(workId, attempt, actionId);
    const current = this.#read(workId, attempt);
    requireState(
      plan &&
        current &&
        activation.plan_digest === plan.digest &&
        current.state.items.some(
          (item) => item.request.action_id === actionId && item.issue_id === activation.issue_id,
        ),
      'replacement dispatch differs from current journal',
    );
    return activation;
  }

  replacementNativeHandle(workId: string, attempt: number, actionId: string): string | null {
    const dispatch = this.replacementDispatch(workId, attempt, actionId);
    if (!dispatch) return null;
    const plan = this.#readDispatchPlan(workId, attempt, actionId);
    requireState(plan && dispatch.plan_digest === plan.digest, 'replacement native owner differs from prepared plan');
    return plan.prior_native_handle;
  }

  synthesisCorrection(workId: string, attempt: number, actionId: string): SynthesisObservationCorrectionPlan | null {
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_observation_correction'")
      .get();
    if (!table) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_synthesis_observation_correction WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      )
      .get(this.#workspaceId, workId, attempt, actionId) as { payload: string; digest: string } | null;
    if (!row) return null;
    const plan = JSON.parse(row.payload) as SynthesisObservationCorrectionPlan;
    const { digest, ...body } = plan;
    requireState(
      plan.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
        plan.workspace_id === this.#workspaceId &&
        plan.work_id === workId &&
        plan.attempt === attempt &&
        plan.action_id === actionId &&
        digest === row.digest &&
        digest === canonicalJsonDigest(body),
      'synthesis correction receipt is invalid',
    );
    return plan;
  }

  /** Preserve an observed native result and reset only its inadmissible derived synthesis slot. */
  correctObservedSynthesis(plan: SynthesisObservationCorrectionPlan): MastraSessionLedgerSnapshot {
    const { digest, ...body } = plan;
    requireState(
      plan.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
        plan.workspace_id === this.#workspaceId &&
        digest === canonicalJsonDigest(body) &&
        plan.config_digest === this.#configDigest &&
        plan.predecessor_refs.length > 0 &&
        /^[a-f0-9]{64}$/.test(plan.catalog_digest) &&
        typeof plan.owner_correction_pointer === 'string' &&
        plan.owner_correction_pointer.length > 0,
      'synthesis correction plan is invalid',
    );
    requireState(!this.#database.inTransaction, 'nested synthesis correction transaction forbidden');
    return this.#database
      .transaction(() => {
        this.#assertJournalWritesAllowed();
        this.#assertWorkingGeneration();
        const prior = this.synthesisCorrection(plan.work_id, plan.attempt, plan.action_id);
        if (prior) {
          requireState(prior.digest === plan.digest, 'synthesis correction receipt conflicts');
          return this.#read(plan.work_id, plan.attempt)!;
        }
        const current = this.#read(plan.work_id, plan.attempt);
        requireState(
          current?.version.revision === plan.expected_journal.revision &&
            current.version.digest === plan.expected_journal.digest &&
            current.state.source_scope?.digest === plan.source_digest &&
            current.state.items.length === 1,
          'synthesis correction journal CAS or source changed',
        );
        const item = current.state.items[0]!;
        const config = loadRuntimeConfig(this.#repositoryRoot);
        const stage = config.workflows[item.request.workflow_id]?.stages.find(
          (entry) => entry.id === item.request.stage_id,
        );
        requireState(
          item.request.action_id === plan.action_id &&
            item.issue_id === plan.prior_issue_id &&
            item.observation?.status === 'reported_complete' &&
            !!item.research_activation &&
            !item.research_normalization &&
            !item.host_reservation &&
            sameJson(item, plan.original_item) &&
            item.request.config_digest === plan.config_digest &&
            item.request.scope_digest === plan.source_digest &&
            stage?.kind === 'synthesize' &&
            stage.produces.includes('ResearchSynthesis/v1'),
          'synthesis correction is not the exact observed unnormalized native item',
        );
        const workRows = this.#database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work'")
          .all(this.#workspaceId) as { revision: number; payload: string; digest: string }[];
        const owners = workRows.filter((row) => {
          const value = JSON.parse(row.payload) as WorkState;
          return value.binding.lifecycle_work_id === plan.work_id && value.execution.run_id === current.state.run_id;
        });
        const owner = owners.length === 1 ? (JSON.parse(owners[0]!.payload) as WorkState) : null;
        const ledger = this.#database
          .query(
            "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
          )
          .get(this.#workspaceId) as { revision: number; payload: string; digest: string } | null;
        requireState(
          owner?.lease === null &&
            owner.execution.status === 'suspended' &&
            owner.binding.repository_id === plan.repository_id &&
            sameJson(owner.binding.project_ids, plan.project_ids) &&
            owner.binding.integrations_digest === plan.integrations_digest &&
            owner.binding.config_digest === plan.config_digest &&
            owner.binding.work_source_revision === plan.source_digest &&
            owner.artifacts.every(
              (artifact) => artifact.schema !== 'ResearchSynthesis/v1' || artifact.stage_id !== item.request.stage_id,
            ) &&
            owners[0]!.revision === plan.expected_work.revision &&
            owners[0]!.digest === plan.expected_work.digest &&
            canonicalJsonDigest(owner) === owners[0]!.digest &&
            ledger?.revision === plan.expected_ledger.revision &&
            ledger.digest === plan.expected_ledger.digest &&
            canonicalJsonDigest(JSON.parse(ledger.payload)) === ledger.digest,
          'synthesis correction owner, artifacts or coordination CAS changed',
        );
        const state: MastraSessionLedgerState = {
          ...current.state,
          items: [{ request: item.request, issue_id: null, observation: null }],
        };
        const updated = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            current.version.revision + 1,
            canonicalJson(state),
            canonicalJsonDigest(state),
            this.#workspaceId,
            plan.work_id,
            plan.attempt,
            current.version.revision,
            current.version.digest,
          );
        requireState(updated.changes === 1, 'synthesis correction journal CAS lost');
        this.#database.exec(
          'CREATE TABLE IF NOT EXISTS agent_host_synthesis_observation_correction (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
        );
        this.#database
          .query('INSERT INTO agent_host_synthesis_observation_correction VALUES(?,?,?,?,?,?)')
          .run(this.#workspaceId, plan.work_id, plan.attempt, plan.action_id, canonicalJson(plan), plan.digest);
        return this.#read(plan.work_id, plan.attempt)!;
      })
      .immediate();
  }

  /** Record an actual replacement result and its logical Mastra projection in one local CAS. */
  reportReadOnlyReplacement(
    workId: string,
    attempt: number,
    expected: StateVersion,
    supplied: SessionBridgeObservation,
    sourceScope: ScopedSourceSnapshot,
  ): MastraSessionLedgerSnapshot {
    const observation = parseSessionBridgeObservation(supplied);
    requireState(!this.#database.inTransaction, 'nested replacement report transaction forbidden');
    return this.#database
      .transaction(() => {
        this.#assertJournalWritesAllowed();
        this.#assertWorkingGeneration();
        const current = this.#read(workId, attempt);
        requireState(
          current && canonicalJsonDigest(current.version) === canonicalJsonDigest(expected),
          'replacement report CAS version changed',
        );
        const plans = this.#database
          .query(
            'SELECT payload FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND generation=1',
          )
          .all(this.#workspaceId, workId, attempt) as { payload: string }[];
        const plan = plans
          .map((row) => JSON.parse(row.payload) as ReadOnlyDispatchPlan)
          .find((entry) => entry.dispatch_action_id === observation.action_id);
        requireState(
          plan && plan.replacement_issue_id === observation.issue_id && observation.host_attempt_id === undefined,
          'replacement report has no matching read-only dispatch',
        );
        const activation = this.#readDispatchActivation(workId, attempt, plan.logical_action_id);
        const item = current.state.items.find((entry) => entry.request.action_id === plan.logical_action_id);
        requireState(
          activation &&
            activation.plan_digest === plan.digest &&
            activation.dispatch_action_id === observation.action_id &&
            activation.issue_id === observation.issue_id &&
            item?.issue_id === observation.issue_id &&
            item.observation === null &&
            !item.host_reservation &&
            current.state.source_scope?.digest === plan.source_digest &&
            sourceScope.digest === plan.source_digest,
          'replacement current issue or source binding changed',
        );
        requireState(
          observation.output_digest === canonicalJsonDigest(observation.summary) &&
            ![...current.state.items, ...current.state.completed.flatMap((entry) => entry.items)].some(
              (entry) => entry.observation?.tool_call_ref === observation.tool_call_ref,
            ),
          'replacement output digest or tool reference differs',
        );
        const projected = { ...observation, action_id: plan.logical_action_id };
        const state = {
          ...current.state,
          items: current.state.items.map((entry) =>
            entry.request.action_id === plan.logical_action_id ? { ...entry, observation: projected } : entry,
          ),
        };
        const changed = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(state),
            canonicalJsonDigest(state),
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(changed.changes === 1, 'replacement report journal CAS conflict');
        this.#database.exec(
          'CREATE TABLE IF NOT EXISTS agent_host_readonly_dispatch_outcome (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, logical_action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,logical_action_id))',
        );
        const outcome = {
          schema: 'VidaReadOnlyDispatchOutcome/v1',
          plan_digest: plan.digest,
          dispatch_action_id: observation.action_id,
          logical_action_id: plan.logical_action_id,
          issue_id: observation.issue_id,
          raw_observation: observation,
          projected_observation_digest: canonicalJsonDigest(projected),
        };
        this.#database
          .query('INSERT INTO agent_host_readonly_dispatch_outcome VALUES(?,?,?,?,?,?)')
          .run(
            this.#workspaceId,
            workId,
            attempt,
            plan.logical_action_id,
            canonicalJson(outcome),
            canonicalJsonDigest(outcome),
          );
        return this.#read(workId, attempt)!;
      })
      .immediate();
  }

  /** Reconcile only requests already present in Mastra's persisted suspended snapshot. */
  sync(
    workId: string,
    attempt: number,
    runId: string,
    stepId: string | null,
    requests: readonly SessionBridgeRequest[],
    sourceScope: ScopedSourceSnapshot | null = null,
    workflowStatus: 'suspended' | 'success' | 'failed' | 'canceled' | 'unknown' = 'unknown',
  ): MastraSessionLedgerSnapshot {
    const project = (value: MastraSessionLedgerSnapshot): MastraSessionLedgerSnapshot =>
      stepId === null
        ? freezeJsonValue({ ...value, resume_status: workflowStatus === 'success' ? 'complete' : 'blocked' })
        : value;
    requireState(
      stepId === null || workflowStatus === 'suspended' || workflowStatus === 'unknown',
      'terminal workflow cannot have suspended requests',
    );
    requireState(
      (stepId === null && requests.length === 0) ||
        (stepId !== null && requests.length > 0 && requests.every((request) => request.run_id === runId)),
      'Mastra session snapshot has invalid suspended requests',
    );
    const current = this.#read(workId, attempt);
    if (!current) {
      requireState(stepId !== null, 'Mastra session cannot start with a terminal snapshot');
      const state: MastraSessionLedgerState = {
        schema: 'MastraSessionLedger/v1',
        workspace_id: this.#workspaceId,
        work_id: workId,
        attempt,
        run_id: runId,
        step_id: stepId,
        source_scope: sourceScope,
        items: requests.map((request) => ({ request, issue_id: null, observation: null })),
        completed: [],
      };
      const digest = canonicalJsonDigest(state);
      const result = this.#database
        .transaction(() => {
          this.#assertJournalWritesAllowed();
          this.#assertWorkingGeneration();
          return this.#database
            .query(
              'INSERT INTO agent_host_mastra_session_ledger (workspace_id,work_id,attempt,revision,payload,digest) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING',
            )
            .run(this.#workspaceId, workId, attempt, 1, canonicalJson(state), digest);
        })
        .immediate();
      if (result.changes === 0) return this.sync(workId, attempt, runId, stepId, requests, sourceScope, workflowStatus);
      return this.#read(workId, attempt)!;
    }
    requireState(current.state.run_id === runId, 'Mastra session run id differs from ledger');
    requireState(
      requests.every((request) =>
        sameJson(request.corrective_execution ?? null, current.state.corrective_execution ?? null),
      ),
      'Mastra corrective request authority differs',
    );
    if (current.state.source_scope)
      requireState(
        sourceScope?.digest === current.state.source_scope.digest,
        'Mastra session scoped source changed; affected evidence must be revalidated',
      );
    if (current.state.step_id === stepId) {
      requireState(
        sameJson(
          current.state.items.map((item) => item.request),
          requests,
        ),
        'Mastra suspended request set differs from ledger',
      );
      return project(current);
    }
    if (
      current.state.corrective_execution &&
      current.state.step_id === null &&
      current.state.items.length === 0 &&
      current.state.completed.length === 0
    ) {
      requireState(stepId !== null, 'corrective engine has not reached its first configured suspension');
      return this.#change(workId, attempt, current.version, (state) => ({
        ...(({ research_wave_exposure: _exposure, ...retained }) => retained)(state),
        step_id: stepId,
        items: requests.map((request) => ({ request, issue_id: null, observation: null })),
      }));
    }
    requireState(
      current.state.step_id !== null &&
        current.state.items.every((item) => item.observation !== null) &&
        !current.state.completed.some((entry) => entry.step_id === stepId),
      'Mastra advanced without all unique observed effects',
    );
    return project(
      this.#change(workId, attempt, current.version, (state) => ({
        ...(({ research_wave_exposure: _exposure, ...retained }) => retained)(state),
        step_id: stepId,
        items: requests.map((request) => ({ request, issue_id: null, observation: null })),
        completed: [...state.completed, { step_id: state.step_id!, items: state.items }],
      })),
    );
  }

  issueWave(
    workId: string,
    attempt: number,
    expected: StateVersion,
    reservations: Readonly<Record<string, WorkflowSessionReservation>> = {},
  ): MastraSessionLedgerSnapshot {
    return this.#change(workId, attempt, expected, (state) => {
      requireState(state.step_id !== null && state.items.length > 0, 'Mastra session has no suspended wave');
      requireState(
        state.items.every((item) => item.issue_id === null),
        'Mastra session wave was already issued',
      );
      requireState(
        Object.keys(reservations).every((actionId) => state.items.some((item) => item.request.action_id === actionId)),
        'native host reservation has no suspended action',
      );
      const config = loadRuntimeConfig(this.#repositoryRoot);
      const containsResearch = state.items.some((item) => {
        const stage = config.workflows[item.request.workflow_id]?.stages.find(
          (candidate) => candidate.id === item.request.stage_id,
        );
        return stage?.produces.includes('ResearchResult/v1') || stage?.produces.includes('ResearchSynthesis/v1');
      });
      const { research_wave_exposure: _priorExposure, ...retained } = state;
      return {
        ...retained,
        ...(containsResearch ? { research_wave_exposure: 'preparing' as const } : {}),
        items: state.items.map((item) => ({
          ...item,
          issue_id: randomUUID(),
          ...(reservations[item.request.action_id] === undefined
            ? {}
            : { host_reservation: reservations[item.request.action_id] }),
        })),
      };
    });
  }

  /** Adopt only a provably interrupted legacy research preparation; never infer exposure from missing data. */
  beginLegacyResearchPreparationRecovery(
    workId: string,
    attempt: number,
    expected: StateVersion,
  ): MastraSessionLedgerSnapshot {
    return this.#change(workId, attempt, expected, (state) => {
      requireState(state.research_wave_exposure === undefined, 'legacy research recovery requires an unmarked journal');
      const config = loadRuntimeConfig(this.#repositoryRoot);
      const isResearch = (item: MastraLedgerItem) => {
        const stage = config.workflows[item.request.workflow_id]?.stages.find(
          (candidate) => candidate.id === item.request.stage_id,
        );
        return stage?.produces.includes('ResearchResult/v1') || stage?.produces.includes('ResearchSynthesis/v1');
      };
      const researchItems = state.items.filter(isResearch);
      requireState(researchItems.length > 0, 'legacy research recovery has no canonical research action');
      requireState(
        state.items.every((item) => item.issue_id !== null && item.observation === null && !item.host_reservation),
        'legacy research recovery requires the complete unobserved, unreserved issued wave',
      );
      requireState(
        researchItems.some((item) => !item.research_activation),
        'legacy research recovery requires an incomplete activation preparation',
      );
      return { ...state, research_wave_exposure: 'preparing' };
    });
  }

  /** Durable one-way barrier immediately before any prepared research batch is returned to its caller. */
  markResearchWaveExposurePossible(
    workId: string,
    attempt: number,
    expected: StateVersion,
  ): MastraSessionLedgerSnapshot {
    return this.#change(workId, attempt, expected, (state) => {
      requireState(state.research_wave_exposure === 'preparing', 'research wave is not in preparation');
      const config = loadRuntimeConfig(this.#repositoryRoot);
      const researchItems = state.items.filter((item) => {
        const stage = config.workflows[item.request.workflow_id]?.stages.find(
          (candidate) => candidate.id === item.request.stage_id,
        );
        return stage?.produces.includes('ResearchResult/v1') || stage?.produces.includes('ResearchSynthesis/v1');
      });
      requireState(researchItems.length > 0, 'research exposure barrier has no canonical research action');
      requireState(
        state.items.every((item) => item.issue_id !== null && item.observation === null && !item.host_reservation),
        'research exposure barrier requires the complete unobserved, unreserved issued wave',
      );
      requireState(
        researchItems.every((item) => item.research_activation),
        'research exposure barrier requires every instruction activation to be committed',
      );
      return { ...state, research_wave_exposure: 'possible' };
    });
  }

  /** Persist the exact issued instruction set before exposing a native research action. */
  reserveResearchActivation(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
    use: ActivationUse,
    suppliedPlan: ObservedActivationUseWritePlan,
  ): MastraSessionLedgerSnapshot {
    const plan = validateObservedActivationUseWritePlan(suppliedPlan);
    const validUse = validateActivationUse(use);
    return this.#change(workId, attempt, expected, (state) => {
      const item = state.items.find((entry) => entry.request.action_id === actionId);
      requireState(
        item?.issue_id !== null && item?.observation === null && !item?.research_activation,
        'research activation needs one unexposed issued action',
      );
      requireState(
        validateResearchJournalItem({ ...item, research_activation: { use: validUse, plan } }, state),
        'research activation plan differs from issued action',
      );
      return {
        ...state,
        items: state.items.map((entry) =>
          entry.request.action_id === actionId ? { ...entry, research_activation: { use: validUse, plan } } : entry,
        ),
      };
    });
  }

  /** Bind canonical file preimages and desired hashes to the observed result before any write. */
  reserveResearchNormalization(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
    suppliedPlan: ObservedResearchRecordPlan,
  ): MastraSessionLedgerSnapshot {
    const plan = validateObservedResearchRecordPlan(suppliedPlan);
    return this.#change(workId, attempt, expected, (state) => {
      const item = state.items.find((entry) => entry.request.action_id === actionId);
      requireState(
        item?.observation !== null && item?.research_activation && !item?.research_normalization,
        'research normalization needs one observed activated action',
      );
      requireState(
        validateResearchJournalItem({ ...item, research_normalization: plan }, state),
        'research normalization plan differs from observation',
      );
      return {
        ...state,
        items: state.items.map((entry) =>
          entry.request.action_id === actionId ? { ...entry, research_normalization: plan } : entry,
        ),
      };
    });
  }

  retrieveReportedObservation(
    workId: string,
    attempt: number,
    observation: SessionBridgeObservation,
  ): MastraSessionLedgerSnapshot | null {
    const current = this.#read(workId, attempt);
    const recorded =
      current &&
      [...current.state.items, ...current.state.completed.flatMap((wave) => wave.items)].find(
        (item) => item.request.action_id === observation.action_id && item.observation !== null,
      );
    if (!recorded)
      return current && this.hostState.findArchivedReportedObservation(workId, attempt, observation) ? current : null;
    requireState(
      recorded.issue_id === observation.issue_id &&
        canonicalJsonDigest(recorded.observation) === canonicalJsonDigest(observation),
      'Mastra session observation retry differs from recorded terminal observation',
    );
    this.#attachObservedPrewriterPreparation(workId, attempt, current!, observation);
    return current!;
  }

  #attachObservedPrewriterPreparation(
    workId: string,
    attempt: number,
    journal: MastraSessionLedgerSnapshot,
    observation: SessionBridgeObservation,
  ): void {
    if (observation.status !== 'reported_complete') return;
    const matches = [...journal.state.items, ...journal.state.completed.flatMap((wave) => wave.items)].filter(
      (item) => item.request.action_id === observation.action_id,
    );
    if (matches.length !== 1 || matches[0]!.request.stage_id !== 'review_source_prewrite') return;
    const owners = this.hostState
      .readWorkspaceSnapshot()
      .work.filter((entry) => entry.work?.binding.lifecycle_work_id === workId);
    if (owners.length === 0) return;
    const item = matches[0]!;
    requireState(
      item.issue_id === observation.issue_id &&
        item.observation !== null &&
        canonicalJsonDigest(item.observation) === canonicalJsonDigest(observation),
      'prewriter preparation must follow the exact accepted journal observation',
    );
    attachObservedSourcePreparation({
      repositoryRoot: this.#repositoryRoot,
      hostState: this.hostState,
      workId,
      attempt,
      journal,
      observation,
    });
  }

  report(
    workId: string,
    attempt: number,
    expected: StateVersion,
    observation: SessionBridgeObservation,
    sourceScope: ScopedSourceSnapshot | null = null,
  ): MastraSessionLedgerSnapshot {
    const current = this.#read(workId, attempt);
    const recorded =
      current &&
      [...current.state.items, ...current.state.completed.flatMap((wave) => wave.items)].find(
        (item) => item.request.action_id === observation.action_id && item.observation !== null,
      );
    if (recorded) {
      requireState(
        recorded.issue_id === observation.issue_id &&
          canonicalJsonDigest(recorded.observation) === canonicalJsonDigest(observation),
        'Mastra session observation retry differs from recorded terminal observation',
      );
      this.#attachObservedPrewriterPreparation(workId, attempt, current!, observation);
      return current!;
    }
    requireState(
      current?.state.research_wave_exposure !== 'preparing',
      'research wave has not crossed the durable exposure barrier; report is premature',
    );
    const issued = current?.state.items.find((item) => item.request.action_id === observation.action_id);
    if (issued?.host_reservation) {
      const reservation = issued.host_reservation;
      const host = this.hostState.readHostStateSnapshot(reservation.receipt.identity);
      const completed = host.work?.execution.assignment_attempts.find(
        (item) => item.attempt_id === reservation.receipt.attempt.attempt_id,
      );
      requireState(
        observation.status === 'reported_failed'
          ? completed?.status === 'uncertain' && completed.result === null && completed.result_digest === null
          : completed?.status === 'completed' && completed.result_digest === canonicalJsonDigest(observation),
        'Mastra source observation has no matching current host outcome',
      );
    }
    const update = (state: MastraSessionLedgerState): MastraSessionLedgerState => {
      requireState(state.step_id !== null, 'Mastra session is terminal');
      const item = state.items.find((entry) => entry.request.action_id === observation.action_id);
      requireState(
        item?.issue_id === observation.issue_id && item.observation === null,
        'Mastra session report has no matching open issuance',
      );
      requireState(
        observation.host_attempt_id === item.host_reservation?.receipt.attempt.attempt_id,
        'Mastra session host attempt identity differs',
      );
      if (item.host_reservation && observation.status === 'reported_complete') {
        requireState(
          state.source_scope && sourceScope && Array.isArray(observation.changed_paths),
          'source-writing observation needs a scoped source change set',
        );
        const changed = compareScopedSourceSnapshots(state.source_scope!, sourceScope!).map((entry) => entry.path);
        requireState(
          canonicalJsonDigest(changed) === canonicalJsonDigest([...observation.changed_paths!].sort()),
          'source-writing observation differs from actual scoped file changes',
        );
      } else if (!item.host_reservation && state.source_scope)
        requireState(
          sourceScope?.digest === state.source_scope.digest,
          'read-only observation cannot rebase changed source',
        );
      requireState(
        observation.output_digest === canonicalJsonDigest(observation.summary),
        'Mastra session report output digest differs',
      );
      requireState(
        (() => {
          const matches = [...state.items, ...state.completed.flatMap((entry) => entry.items)].filter(
            (entry) => entry.observation?.tool_call_ref === observation.tool_call_ref,
          );
          return (
            matches.length === 0 ||
            (matches.length === 1 &&
              state.items.includes(matches[0]!) &&
              this.#mayShareReadonlyInvocation(matches[0]!, item!, observation))
          );
        })(),
        'Mastra session tool call reference was replayed outside an allowed read-only slot batch',
      );
      return {
        ...state,
        ...(item.host_reservation && observation.status === 'reported_complete' ? { source_scope: sourceScope } : {}),
        items: state.items.map((entry) =>
          entry.request.action_id === observation.action_id ? { ...entry, observation } : entry,
        ),
      };
    };
    if (issued?.host_reservation && observation.status === 'reported_complete') {
      requireState(
        current?.version.revision === expected.revision && current.version.digest === expected.digest,
        'Mastra session ledger compare-and-swap conflict',
      );
      const next = update(current.state);
      const hostIdentity = issued.host_reservation.receipt.identity;
      const hostLease = issued.host_reservation.receipt.attempt.lease;
      const currentSourceBinding = this.hostState.readCurrentTaskSourceBinding(
        hostIdentity,
        hostLease.thread_id,
        attempt,
      );
      const sourceRoot = resolveTaskSourceRoot(this.#repositoryRoot, currentSourceBinding?.source_root);
      this.hostState.commitCompletedSourceReport({
        identity: hostIdentity,
        attempt,
        expectedJournal: expected,
        actionId: observation.action_id,
        nextJournal: next,
        verifyCurrent: () => {
          this.#assertWorkingGeneration();
          this.#assertFreshConfig();
          requireState(
            sourceScope &&
              snapshotDeclaredSources(
                requireSafeRepositoryAccess(sourceRoot),
                sourceScope.entries.map((entry) => entry.path),
              ).digest === sourceScope.digest,
            'new source report snapshot changed before atomic acceptance',
          );
        },
      });
      return this.#read(workId, attempt)!;
    }
    const reported = this.#change(workId, attempt, expected, update);
    this.#attachObservedPrewriterPreparation(workId, attempt, reported, observation);
    return reported;
  }
}

export function openConfiguredMastraSessionLedger(repositoryRoot: string): MastraSessionLedger {
  const config = loadRuntimeConfig(repositoryRoot);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
  const access = requireSafeRepositoryAccess(repositoryRoot);
  access.ensureDirectory(config.control.work_root, 'Mastra session ledger root');
  const databasePath = sessionHandoffDatabasePath(repositoryRoot, config);
  try {
    const stats = lstatSync(databasePath);
    requireState(
      stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1,
      'Mastra session ledger database path is unsafe',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const database = openHostStateDatabase(databasePath);
  try {
    let hostState!: HostStateStore, ledger!: MastraSessionLedger;
    const approvalVerifier = createLocalSourceWriteApprovalVerifier(
      repositoryRoot,
      () => hostState,
      sourceWritePreflightResolver(
        repositoryRoot,
        () => hostState,
        () => ledger,
      ),
    );
    const reconciliationVerifier = createLocalSessionReconciliationVerifier(repositoryRoot);
    const taskSourceVerifier = {
      verify: taskSourceMutationPolicyResolver(
        repositoryRoot,
        () => hostState,
        () => ledger,
      ),
    };
    hostState = new HostStateStore(
      database,
      workspaceId,
      reconciliationVerifier,
      undefined,
      approvalVerifier,
      undefined,
      repositoryRoot,
      undefined,
      taskSourceVerifier,
    );
    ledger = new MastraSessionLedger(database, workspaceId, config, repositoryRoot, hostState);
    return ledger;
  } catch (error) {
    database.close(true);
    throw error;
  }
}
