import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { sessionBridgeDatabasePath, sessionBridgeDatabaseRelativePath } from '../config/project-paths.js';
export { sessionBridgeDatabasePath } from '../config/project-paths.js';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { openBunSqliteClient } from './bun-sqlite-client.js';
import z from 'zod';
import { type AgentRuntimeConfig, type WorkItemSelection, runtimeConfigDigest } from '../config/runtime-config.js';
import { loadProjectSetContext } from '../config/project-context.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { assertProjectUpgradeInactive } from '../config/runtime-config.js';
import { deriveWorkspaceId } from '../workspace-identity.js';
import { acquireStorageReadAdmission } from '../config/storage-read-admission.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { WorkIdentity } from '../host-state.js';
import {
  validateInitialSourceContinuationReceipt,
  type InitialSourceContinuationReceipt,
} from './initial-source-continuation.js';
import type { WorkflowLifecycleRisk } from './workflow-plan.js';
import { configuredContextForStage } from './configured-context.js';
export { configuredContextForStage } from './configured-context.js';
import { parseObservedValidatorVerdict } from './observed-validation.js';
import { parseObservedTesterVerdict } from './observed-testing.js';
import { createSessionActionProjector, type SessionHandoffContext } from './session-handoff.js';
import { correctiveExecutionSchema, type CorrectiveExecution } from './corrective-execution-contract.js';
import { MastraSessionLedger } from './persistent-session-handoff.js';
import {
  readConfiguredContinuationSessionEngineSnapshot,
  readInitialSourceContinuationSessionEngineSnapshot,
  readSessionEngineSnapshot,
  type SessionEngineBinding,
} from './session-engine-snapshot.js';
import type { ConfiguredFrontierReceipt } from './delivered-work-continuation-repair.js';
import {
  effectiveConfiguredFrontier,
  type FailedPrewriterRecoveryReceipt,
  type ConfiguredFrontierRecoveryView,
} from './failed-prewriter-transition.js';
import type { ScopedSourceSnapshot } from './scoped-source-snapshot.js';
import {
  observationSchema,
  requestSchema,
  runStateSchema,
  parseSessionBridgeRequest,
  parseSessionBridgeObservation,
  buildSessionBridgeRequest,
  requireBridge,
} from './mastra-session-bridge-contract.js';
import type { SessionBridgeObservation, SessionBridgeRequest } from './mastra-session-bridge-contract.js';
export {
  parseSessionBridgeObservation,
  parseSessionBridgeRequest,
  parseSessionBridgeRunState,
  buildSessionBridgeRequest,
} from './mastra-session-bridge-contract.js';
export type { SessionBridgeObservation, SessionBridgeRequest } from './mastra-session-bridge-contract.js';

const suspendSchema = z.object({ requests: z.array(requestSchema).min(1) });
const resumeSchema = z.object({ observations: z.array(observationSchema).min(1) });

export function sessionBridgeRunId(workspaceId: string, context: SessionHandoffContext, workflowId: string): string {
  return 'vida-' + canonicalJsonDigest({ workspaceId, context, workflowId });
}

export interface SessionBridgeSnapshot {
  readonly run_id: string;
  readonly status: 'suspended' | 'success' | 'failed' | 'canceled' | 'unknown';
  readonly step_id: string | null;
  readonly requests: readonly SessionBridgeRequest[];
  readonly observations: readonly SessionBridgeObservation[];
}

interface InitialSourceContinuationKey {
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly continuation_id: string;
  readonly request_digest: string;
}

/** Mastra owns stage order; the session ledger only issues and records effects. */
function workflowDatabaseIdentity(file: string): string {
  const stat = lstatSync(file);
  requireBridge(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Mastra database path is unsafe');
  return stat.dev + ':' + stat.ino;
}

async function initializeWorkflowStorage(
  repositoryRoot: string,
  config: AgentRuntimeConfig,
  assertProducer: () => unknown,
): Promise<LibSQLStore> {
  assertProducer();
  const access = requireSafeRepositoryAccess(repositoryRoot);
  assertProjectUpgradeInactive(access);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
  const relative = sessionBridgeDatabaseRelativePath(config);
  const admission = acquireStorageReadAdmission(repositoryRoot, workspaceId, relative);
  try {
    access.ensureDirectory(config.control.work_root, 'Mastra workflow storage root');
    const databasePath = sessionBridgeDatabasePath(repositoryRoot, config);
    if (!access.fileExists(relative, 'Mastra workflow database'))
      await access.writeExclusiveAsync(relative, '', 'fresh Mastra database');
    assertProducer();
    const before = workflowDatabaseIdentity(databasePath);
    const client = openBunSqliteClient(repositoryRoot, relative, workspaceId, admission);
    let storage: LibSQLStore | undefined;
    try {
      storage = new LibSQLStore({ id: 'vida-workflow-state', client });
      assertProducer();
      await storage.init();
      assertProducer();
      requireBridge(
        workflowDatabaseIdentity(databasePath) === before,
        'Mastra database was substituted during initialization',
      );
      return storage;
    } catch (error) {
      try {
        if (storage) await storage.close();
        else await client.close();
      } catch (cleanup) {
        throw new AggregateError([error, cleanup], 'Mastra initialization and storage close failed');
      }
      throw error;
    }
  } catch (error) {
    try {
      admission.close();
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], 'Mastra admission and initialization cleanup failed');
    }
    throw error;
  }
}

export class MastraSessionBridge {
  readonly #workflow: ReturnType<typeof createWorkflow<string, typeof runStateSchema, typeof runStateSchema>>;
  readonly #storage: LibSQLStore;
  readonly #context: SessionHandoffContext;
  readonly #runId: string;
  readonly #binding: SessionEngineBinding;
  readonly #ledger: MastraSessionLedger;
  readonly #projectIds: readonly string[];
  readonly #engineIdentity: { readonly dev: number; readonly ino: number };
  readonly #correctiveExecution: CorrectiveExecution | undefined;
  readonly #configuredFrontier: { readonly identity: WorkIdentity; readonly attempt: number } | undefined;
  readonly #initialSourceContinuation: InitialSourceContinuationKey | undefined;

  private constructor(
    workflow: ReturnType<typeof createWorkflow<string, typeof runStateSchema, typeof runStateSchema>>,
    storage: LibSQLStore,
    config: AgentRuntimeConfig,
    selection: WorkItemSelection,
    context: SessionHandoffContext,
    workflowId: string,
    runId: string,
    repositoryRoot: string,
    ledger: MastraSessionLedger,
    projectIds: readonly string[],
    lifecycleRisk?: WorkflowLifecycleRisk,
    correctiveExecution?: CorrectiveExecution,
    configuredFrontier?: { readonly identity: WorkIdentity; readonly attempt: number },
    initialSourceContinuation?: InitialSourceContinuationKey,
  ) {
    this.#workflow = workflow;
    this.#storage = storage;
    this.#context = structuredClone(context);
    this.#runId = runId;
    this.#binding = {
      ...structuredClone({ repositoryRoot, selection, context, workflowId, runId }),
      ...(lifecycleRisk === undefined ? {} : { lifecycleRisk }),
      config,
    };
    this.#ledger = ledger;
    this.#projectIds = [...projectIds];
    this.#correctiveExecution = correctiveExecution ? structuredClone(correctiveExecution) : undefined;
    this.#configuredFrontier = configuredFrontier ? structuredClone(configuredFrontier) : undefined;
    this.#initialSourceContinuation = initialSourceContinuation
      ? structuredClone(initialSourceContinuation)
      : undefined;
    const physical = lstatSync(sessionBridgeDatabasePath(repositoryRoot, config));
    requireBridge(
      physical.isFile() && !physical.isSymbolicLink() && physical.nlink === 1,
      'Mastra database path is unsafe',
    );
    this.#engineIdentity = { dev: physical.dev, ino: physical.ino };
  }

  static async open(args: {
    repositoryRoot: string;
    config: AgentRuntimeConfig;
    selection: WorkItemSelection;
    context: SessionHandoffContext;
    workflowId: string;
    workspaceId: string;
    ledger: MastraSessionLedger;
    projectIds: readonly string[];
    lifecycleRisk?: WorkflowLifecycleRisk;
    correctiveExecution?: CorrectiveExecution;
    configuredFrontier?: { readonly identity: WorkIdentity; readonly attempt: number };
    initialSourceContinuation?: { readonly identity: WorkIdentity; readonly attempt: number };
  }): Promise<MastraSessionBridge> {
    const repositoryRoot = args.repositoryRoot;
    const config = args.config;
    const workflowId = args.workflowId;
    const workspaceId = args.workspaceId;
    const ledger = args.ledger;
    const {
      selection,
      context,
      lifecycleRisk,
      correctiveExecution: suppliedCorrection,
      configuredFrontier,
      initialSourceContinuation,
      projectIds,
    } = structuredClone({
      selection: args.selection,
      context: args.context,
      lifecycleRisk: args.lifecycleRisk,
      correctiveExecution: args.correctiveExecution,
      configuredFrontier: args.configuredFrontier,
      initialSourceContinuation: args.initialSourceContinuation,
      projectIds: args.projectIds,
    });
    requireBridge(ledger instanceof MastraSessionLedger, 'Actual configured producer ledger is required');
    const bound = MastraSessionLedger.prototype.sessionProducerBinding.call(ledger);
    requireBridge(
      bound.repositoryRoot === repositoryRoot &&
        bound.workspaceId === workspaceId &&
        runtimeConfigDigest(bound.config) === runtimeConfigDigest(config),
      'Producer ledger binding differs',
    );
    const correctiveExecution = suppliedCorrection ? correctiveExecutionSchema.parse(suppliedCorrection) : undefined;
    let currentIdentity: WorkIdentity | undefined;
    let initialReceipt: InitialSourceContinuationReceipt | null = null;
    if (configuredFrontier) {
      requireBridge(!initialSourceContinuation, 'configured and initial-source receipts cannot share one run');
    } else {
      const currentProject = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, projectIds);
      currentIdentity = {
        repository_id: currentProject.repository_id,
        project_ids: currentProject.project_ids,
        integrations_digest: currentProject.integrations_digest,
        work_id: context.work_id,
      };
      if (initialSourceContinuation) {
        requireBridge(
          initialSourceContinuation.attempt === context.attempt &&
            canonicalJsonDigest(initialSourceContinuation.identity) === canonicalJsonDigest(currentIdentity),
          'initial-source continuation identity differs from current ProjectContext',
        );
      }
      initialReceipt = ledger.readInitialSourceContinuationReceipt(currentIdentity, context.attempt);
      requireBridge(!initialSourceContinuation || initialReceipt, 'initial-source Host receipt is missing');
      requireBridge(!initialReceipt || !correctiveExecution, 'initial-source continuation cannot use a corrective run');
    }
    const baseRunId = sessionBridgeRunId(workspaceId, context, workflowId);
    requireBridge(!correctiveExecution || correctiveExecution.base_run_id === baseRunId, 'corrective base run differs');
    if (initialReceipt) {
      requireBridge(currentIdentity, 'initial-source ProjectContext identity is missing');
      const validated = validateInitialSourceContinuationReceipt(initialReceipt);
      requireBridge(
        canonicalJsonDigest(validated.request.identity) === canonicalJsonDigest(currentIdentity) &&
          validated.request.attempt === context.attempt &&
          validated.request.currentInitialRequest.workflow_id === workflowId,
        'initial-source Host receipt differs from the current producer identity',
      );
    }
    let configuredReceipt: ConfiguredFrontierReceipt | undefined;
    let configuredRecovery: FailedPrewriterRecoveryReceipt | null = null;
    let runId = correctiveExecution?.engine_run_id ?? initialReceipt?.prior_work.execution.run_id ?? baseRunId;
    if (configuredFrontier) {
      requireBridge(!correctiveExecution, 'configured frontier cannot use a corrective run');
      const { identity, attempt } = configuredFrontier;
      requireBridge(
        Number.isSafeInteger(attempt) &&
          attempt > 0 &&
          identity.work_id === context.work_id &&
          identity.repository_id === bound.config.repository.repository_id &&
          identity.project_ids.length === projectIds.length &&
          identity.project_ids.every((projectId, index) => projectId === projectIds[index]),
        'configured-frontier work identity differs from the producer binding',
      );
      const stored = ledger.hostState.readDeliveredWorkContinuationReceipt(identity, attempt);
      requireBridge(stored, 'configured-frontier Host receipt is missing');
      requireBridge(stored.request.action.kind === 'configured_frontier', 'configured-frontier receipt kind differs');
      configuredRecovery = ledger.hostState.readFailedPrewriterRecoveryReceipt(identity, attempt);
      const runtimeCodeContinuations = ledger.hostState.readQualifiedRuntimeCodeContinuations(identity, attempt);
      const effective = effectiveConfiguredFrontier({
        original: stored as ConfiguredFrontierReceipt,
        recovery: configuredRecovery,
        runtimeCodeContinuations,
      });
      requireBridge(
        stored.request.action.kind === 'configured_frontier' &&
          stored.attempt === attempt &&
          canonicalJsonDigest(stored.request.identity) === canonicalJsonDigest(identity) &&
          stored.request.identity.work_id === context.work_id &&
          stored.request.action.workflow_id === workflowId &&
          effective.currentSourceScope.digest === context.scope_digest &&
          stored.request.targetConfigDigest === runtimeConfigDigest(config) &&
          stored.request.action.request.run_id === stored.prior_work.execution.run_id &&
          typeof stored.prior_work.execution.run_id === 'string' &&
          stored.prior_work.execution.run_id.length > 0 &&
          stored.historical_capture === null &&
          stored.frontier_snapshot !== undefined,
        'configured-frontier receipt binding differs from the current producer request',
      );
      runId = stored.prior_work.execution.run_id!;
      const host = ledger.hostState.readHostStateSnapshot(identity);
      requireBridge(
        host.work &&
          host.workVersion &&
          canonicalJsonDigest(host.work.binding) === canonicalJsonDigest(effective.currentBinding) &&
          host.work.execution.run_id === runId &&
          host.work.execution.status === 'active',
        'configured-frontier current Work differs from the stored receipt',
      );
      configuredReceipt = stored as ConfiguredFrontierReceipt;
      const binding: SessionEngineBinding = {
        repositoryRoot,
        config,
        selection,
        context,
        workflowId,
        runId,
        ...(lifecycleRisk === undefined ? {} : { lifecycleRisk }),
      };
      const preflight = readConfiguredContinuationSessionEngineSnapshot(
        binding,
        configuredReceipt,
        configuredRecovery,
        runtimeCodeContinuations,
      );
      requireBridge(
        preflight.status === 'suspended',
        'configured-frontier run has no resumable current graph frontier',
      );
    }
    const effectiveLifecycleRisk =
      configuredReceipt?.prior_work.lifecycle.risk ?? initialReceipt?.prior_work.lifecycle.risk ?? lifecycleRisk;
    const actionProjector = createSessionActionProjector(config, selection, workflowId, effectiveLifecycleRisk);
    const configDigest = runtimeConfigDigest(config);
    const workflow = createWorkflow({
      id: workflowId,
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      description: 'Configured VIDA session workflow with durable agent handoff.',
    });
    for (const waveIndex of actionProjector.executableWaveIndices(correctiveExecution?.stage_ids)) {
      workflow.then(
        createStep({
          id: 'wave-' + waveIndex,
          inputSchema: runStateSchema,
          outputSchema: runStateSchema,
          suspendSchema,
          resumeSchema,
          execute: async ({ inputData, resumeData, suspend }) => {
            const configuredBoundary =
                configuredReceipt?.request.action.kind === 'configured_frontier'
                  ? configuredReceipt.request.action.request.wave_index === waveIndex
                  : false,
              configuredBoundaryInput =
                configuredBoundary &&
                inputData.config_digest === configuredReceipt!.request.priorConfigDigest &&
                inputData.scope_digest === configuredReceipt!.prior_journal.source_scope?.digest,
              initialBoundaryInput =
                !!initialReceipt &&
                waveIndex === 0 &&
                inputData.work_id === context.work_id &&
                inputData.attempt === context.attempt &&
                inputData.workflow_id === workflowId &&
                inputData.config_digest === initialReceipt.prior_work.binding.config_digest &&
                inputData.scope_digest === initialReceipt.prior_journal.source_scope?.digest &&
                isDeepStrictEqual(inputData.selection, selection) &&
                inputData.observations.length === 0,
              initialJournal = initialReceipt ? ledger.resume(context.work_id, context.attempt) : null,
              initialItem =
                initialJournal?.state.step_id === 'wave-0' && initialJournal.state.items.length === 1
                  ? initialJournal.state.items[0]
                  : undefined,
              initialResumeMatches =
                initialBoundaryInput &&
                !!resumeData &&
                initialJournal?.resume_status === 'ready_to_resume' &&
                initialItem !== undefined &&
                initialItem.issue_id !== null &&
                initialItem.observation !== null &&
                initialItem.observation.status === 'reported_complete' &&
                initialItem.observation.issue_id === initialItem.issue_id &&
                initialItem.observation.action_id === initialReceipt!.request.currentInitialRequest.action_id &&
                initialItem.observation.output_digest === canonicalJsonDigest(initialItem.observation.summary) &&
                isDeepStrictEqual(
                  parseSessionBridgeRequest(initialItem.request),
                  initialReceipt!.request.currentInitialRequest,
                ) &&
                isDeepStrictEqual(resumeData.observations, [parseSessionBridgeObservation(initialItem.observation)]),
              retainedInputResume =
                !!resumeData && (configuredBoundaryInput || (initialBoundaryInput && initialResumeMatches));
            requireBridge(
              inputData.config_digest === configDigest || retainedInputResume,
              'Mastra configuration changed during attempt',
            );
            requireBridge(
              inputData.scope_digest === context.scope_digest || retainedInputResume,
              'Mastra source scope changed during attempt',
            );
            const actions = actionProjector.actionsForWave(context, waveIndex, [], correctiveExecution);
            requireBridge(actions.length > 0, 'Mastra wave has no executable assignments');
            const requests = actions.map((action) =>
              buildSessionBridgeRequest({
                runId,
                workflowId,
                configDigest,
                context,
                waveIndex,
                action,
                configuredContext: configuredContextForStage(
                  repositoryRoot,
                  config,
                  workflowId,
                  action.stage_id,
                  context,
                ),
                priorResults: inputData.observations,
                ...(correctiveExecution ? { correctiveExecution } : {}),
              }),
            );
            if (!resumeData) return await suspend({ requests });
            const expected = new Set(requests.map((request) => request.action_id));
            requireBridge(resumeData.observations.length === expected.size, 'Mastra wave observation count differs');
            requireBridge(
              new Set(resumeData.observations.map((entry) => entry.action_id)).size === expected.size &&
                resumeData.observations.every((entry) => expected.has(entry.action_id)),
              'Mastra wave observation identities differ',
            );
            requireBridge(
              resumeData.observations.every((entry) => entry.output_digest === canonicalJsonDigest(entry.summary)),
              'Mastra wave observation digest differs',
            );
            for (const action of actions.filter(
              (entry) => entry.stage_kind === 'validate' && entry.produces.includes('ValidationReceipt/v1'),
            )) {
              const observed = resumeData.observations.find((entry) => entry.action_id === action.action_id);
              requireBridge(observed, 'Mastra validator observation is missing');
              parseObservedValidatorVerdict(observed);
            }
            for (const action of actions.filter((entry) => entry.stage_kind === 'test')) {
              const observed = resumeData.observations.find((entry) => entry.action_id === action.action_id);
              requireBridge(observed, 'Mastra tester observation is missing');
              parseObservedTesterVerdict(observed);
            }
            requireBridge(
              resumeData.observations.every((entry) => entry.status === 'reported_complete'),
              'Mastra wave contains a failed agent result',
            );
            return {
              ...inputData,
              config_digest: configDigest,
              scope_digest: context.scope_digest,
              observations: [...inputData.observations, ...resumeData.observations],
            };
          },
        }),
      );
    }
    workflow.commit();
    if (initialReceipt) {
      const currentJournal = ledger.resume(context.work_id, context.attempt);
      requireBridge(currentJournal, 'initial-source Host receipt has no current Journal');
      const binding: SessionEngineBinding = {
        repositoryRoot,
        config,
        selection,
        context,
        workflowId,
        runId,
        ...(lifecycleRisk === undefined ? {} : { lifecycleRisk }),
      };
      requireBridge(currentIdentity, 'initial-source current ProjectContext identity is missing');
      const currentHost = ledger.hostState.readHostStateSnapshot(currentIdentity);
      requireBridge(currentHost.work, 'initial-source current Host Work is missing');
      const frontierCodeRebind = ledger.hostState.readInitialSourceFrontierCodeRebindReceipt(
        currentIdentity,
        context.attempt,
        initialReceipt.continuation_id,
      );
      const completedSourceReportRecovery = ledger.hostState.readCompletedSourceReportRecoveryReceipt(
        currentIdentity,
        context.attempt,
      );
      readInitialSourceContinuationSessionEngineSnapshot(
        binding,
        initialReceipt,
        currentJournal,
        currentHost,
        frontierCodeRebind,
        completedSourceReportRecovery,
      );
    }
    const producer = ledger.beginSessionProducer({
      selection,
      context,
      workflowId,
      runId,
      projectIds,
      phase: 'initialize',
    });
    ledger.hostState.assertSessionProducerCurrent(producer);
    const storage = await initializeWorkflowStorage(repositoryRoot, config, () =>
      ledger.hostState.assertSessionProducerCurrent(producer),
    );
    try {
      ledger.hostState.assertSessionProducerCurrent(producer);
      new Mastra({ workflows: { configuredWorkflow: workflow }, storage, logger: false });
      const bridge = new MastraSessionBridge(
        workflow,
        storage,
        config,
        selection,
        context,
        workflowId,
        runId,
        repositoryRoot,
        ledger,
        projectIds,
        effectiveLifecycleRisk,
        correctiveExecution,
        configuredFrontier,
        initialReceipt
          ? {
              identity: currentIdentity!,
              attempt: context.attempt,
              continuation_id: initialReceipt.continuation_id,
              request_digest: initialReceipt.request_digest,
            }
          : undefined,
      );
      ledger.hostState.settleSessionProducer(
        producer,
        ledger.resume(context.work_id, context.attempt)?.version ?? null,
      );
      return bridge;
    } catch (error) {
      try {
        await storage.close();
      } catch (cleanup) {
        throw new AggregateError([error, cleanup], 'Mastra initialization and storage close failed');
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.#storage.close();
  }

  async snapshot(): Promise<SessionBridgeSnapshot | null> {
    this.#assertEngineFile();
    const view = this.#configuredFrontier ? this.#readConfiguredFrontierView() : null;
    const snapshot = this.#configuredFrontier
      ? readConfiguredContinuationSessionEngineSnapshot(
          this.#binding,
          view!.original,
          view!.recovery,
          view!.runtimeCodeContinuations,
        )
      : this.#initialSourceContinuation
        ? this.#readInitialSourceContinuationView()
        : readSessionEngineSnapshot({ ...this.#binding, correctiveExecution: this.#correctiveExecution });
    this.#assertEngineFile();
    return snapshot;
  }

  #readConfiguredFrontierView(): ConfiguredFrontierRecoveryView {
    const key = this.#configuredFrontier;
    requireBridge(key, 'configured-frontier receipt binding is missing');
    const receipt = this.#ledger.hostState.readDeliveredWorkContinuationReceipt(key.identity, key.attempt);
    requireBridge(receipt?.request.action.kind === 'configured_frontier', 'configured-frontier receipt missing');
    const recovery = this.#ledger.hostState.readFailedPrewriterRecoveryReceipt(key.identity, key.attempt);
    const runtimeCodeContinuations = this.#ledger.hostState.readQualifiedRuntimeCodeContinuations(
      key.identity,
      key.attempt,
    );
    const effective = effectiveConfiguredFrontier({
      original: receipt as ConfiguredFrontierReceipt,
      recovery,
      runtimeCodeContinuations,
    });
    requireBridge(
      receipt &&
        receipt.request.action.kind === 'configured_frontier' &&
        receipt.attempt === key.attempt &&
        canonicalJsonDigest(receipt.request.identity) === canonicalJsonDigest(key.identity) &&
        receipt.prior_work.execution.run_id === this.#runId &&
        receipt.successor_binding.workflow_id === this.#binding.workflowId &&
        receipt.request.action.workflow_id === this.#binding.workflowId &&
        receipt.request.targetConfigDigest === runtimeConfigDigest(this.#binding.config) &&
        effective.currentSourceScope.digest === this.#context.scope_digest &&
        receipt.historical_capture === null &&
        receipt.frontier_snapshot !== undefined,
      'configured-frontier Host receipt changed or is no longer applicable',
    );
    const host = this.#ledger.hostState.readHostStateSnapshot(key.identity);
    requireBridge(
      host.work &&
        host.workVersion &&
        canonicalJsonDigest(host.work.binding) === canonicalJsonDigest(effective.currentBinding) &&
        host.work.execution.run_id === this.#runId &&
        host.work.execution.status === 'active',
      'configured-frontier current Work no longer matches its stored receipt',
    );
    return { original: receipt as ConfiguredFrontierReceipt, recovery, runtimeCodeContinuations };
  }

  #reserve(
    phase: 'start' | 'resume',
    sourceScope: ScopedSourceSnapshot | null,
    resumeIntent?: { stepId: string; observations: readonly SessionBridgeObservation[] },
  ) {
    this.#assertEngineFile();
    if (this.#configuredFrontier) this.#readConfiguredFrontierView();
    if (this.#initialSourceContinuation) this.#readInitialSourceContinuationView();
    return this.#ledger.beginSessionProducer({
      ...this.#binding,
      projectIds: this.#projectIds,
      phase,
      sourceScope,
      ...(resumeIntent ? { resumeIntent } : {}),
    });
  }

  #readInitialSourceContinuationView(): SessionBridgeSnapshot {
    const key = this.#initialSourceContinuation;
    requireBridge(key, 'initial-source continuation binding is missing');
    const receipt = this.#ledger.readInitialSourceContinuationReceipt(key.identity, key.attempt);
    requireBridge(receipt, 'initial-source Host receipt is missing');
    requireBridge(
      receipt.continuation_id === key.continuation_id && receipt.request_digest === key.request_digest,
      'initial-source Host receipt identity changed',
    );
    const journal = this.#ledger.resume(this.#context.work_id, this.#context.attempt);
    requireBridge(journal, 'initial-source current Journal is missing');
    const currentHost = this.#ledger.hostState.readHostStateSnapshot(key.identity);
    requireBridge(currentHost.work, 'initial-source current Host Work is missing');
    const frontierCodeRebind = this.#ledger.hostState.readInitialSourceFrontierCodeRebindReceipt(
      key.identity,
      key.attempt,
      receipt.continuation_id,
    );
    const completedSourceReportRecovery = this.#ledger.hostState.readCompletedSourceReportRecoveryReceipt(
      key.identity,
      key.attempt,
    );
    return readInitialSourceContinuationSessionEngineSnapshot(
      this.#binding,
      receipt,
      journal,
      currentHost,
      frontierCodeRebind,
      completedSourceReportRecovery,
    );
  }

  async #assertInitialSourceSynthesisIsCanonical(): Promise<void> {
    const key = this.#initialSourceContinuation;
    if (!key) return;
    const receipt = this.#ledger.readInitialSourceContinuationReceipt(key.identity, key.attempt);
    requireBridge(receipt, 'initial-source Host receipt is missing');
    requireBridge(
      receipt.continuation_id === key.continuation_id && receipt.request_digest === key.request_digest,
      'initial-source Host receipt identity changed',
    );
    const journal = this.#ledger.resume(this.#context.work_id, this.#context.attempt);
    requireBridge(journal, 'initial-source current Journal is missing');
    if (journal.state.step_id !== 'wave-0') return;
    const request = receipt.request.currentInitialRequest,
      stage = this.#binding.config.workflows[request.workflow_id]?.stages.find(
        (entry) => entry.id === request.stage_id,
      );
    requireBridge(stage, 'initial-source current synthesis stage is missing');
    if (!stage.produces.includes('ResearchSynthesis/v1')) return;
    const item = journal.state.items.find((entry) => entry.request.action_id === request.action_id);
    if (!item?.observation || item.observation.status !== 'reported_complete') return;
    requireBridge(item.issue_id, 'initial-source synthesis has no issued action');
    const activation = item.research_activation,
      plan = item.research_normalization;
    requireBridge(activation, 'initial-source synthesis activation is missing');
    requireBridge(plan, 'initial-source synthesis normalization is missing');
    const identity = key.identity,
      host = this.#ledger.hostState.readHostStateSnapshot(identity),
      work = host.work;
    requireBridge(work, 'initial-source synthesis Host work is missing');
    const matchingArtifacts = work.artifacts.filter(
      (artifact) =>
        artifact.schema === 'ResearchSynthesis/v1' &&
        artifact.stage_id === request.stage_id &&
        artifact.path === plan.record_path &&
        artifact.sha256 === plan.record_sha256,
    );
    requireBridge(matchingArtifacts.length === 1, 'initial-source synthesis has no unique admitted artifact');
    const artifact = matchingArtifacts[0]!;
    const bytes = requireSafeRepositoryAccess(this.#binding.repositoryRoot).readBytes(
      artifact.path,
      'initial-source normalized synthesis',
    );
    requireBridge(
      bytes.length <= 64 * 1024 && createHash('sha256').update(bytes).digest('hex') === artifact.sha256,
      'initial-source normalized synthesis bytes changed',
    );
    let raw: unknown;
    try {
      raw = JSON.parse(bytes.toString('utf8'));
    } catch {
      throw new Error('initial-source normalized synthesis is not JSON');
    }
    const { readObservedResearchResult, validateResearchSynthesis } = await import('../research-decision.js');
    const result = validateResearchSynthesis(raw),
      bindingInput = {
        repositoryRoot: this.#binding.repositoryRoot,
        ledger: this.#ledger,
        identity,
        workId: this.#context.work_id,
        attempt: this.#context.attempt,
        actionId: request.action_id,
      },
      { currentObservedResearchBinding } = await import('./observed-research-binding.js'),
      binding = currentObservedResearchBinding(bindingInput);
    requireBridge(
      artifact.artifact_id === result.bundle_id &&
        artifact.source_revision === binding.source_revision &&
        artifact.scope_id === binding.scope_id &&
        canonicalJsonDigest(artifact.ac_ids) === canonicalJsonDigest(work.binding.ac_ids) &&
        result.digest === plan.result_digest &&
        result.work_item_id === work.binding.lifecycle_work_id &&
        result.source_revision === work.binding.work_source_revision &&
        result.scope_id === work.binding.scope_id &&
        canonicalJsonDigest(result.ac_ids) === canonicalJsonDigest(work.binding.ac_ids),
      'initial-source normalized synthesis differs from current admitted scope',
    );
    const checked = await readObservedResearchResult({
      root: this.#binding.repositoryRoot,
      result,
      observation: item.observation,
      binding,
      host_state: this.#ledger.hostState,
      readCurrent: () => currentObservedResearchBinding(bindingInput),
      plan,
      activation_use: activation.use,
      activation_plan: activation.plan,
    });
    requireBridge(
      canonicalJsonDigest(checked) === canonicalJsonDigest(result),
      'initial-source synthesis record is not canonical',
    );
  }

  #assertEngineFile(): void {
    const physical = lstatSync(sessionBridgeDatabasePath(this.#binding.repositoryRoot, this.#binding.config));
    requireBridge(
      physical.isFile() &&
        !physical.isSymbolicLink() &&
        physical.nlink === 1 &&
        physical.dev === this.#engineIdentity.dev &&
        physical.ino === this.#engineIdentity.ino,
      'Mastra database was substituted',
    );
  }

  async #syncProducer(
    producer: ReturnType<MastraSessionLedger['beginSessionProducer']>,
    result: SessionBridgeSnapshot,
    source: ScopedSourceSnapshot | null,
  ): Promise<void> {
    if (this.#initialSourceContinuation) {
      requireBridge(
        canonicalJsonDigest(this.#readInitialSourceContinuationView()) === canonicalJsonDigest(result),
        'initial-source producer result differs from its receipt-backed engine projection',
      );
      await this.#assertInitialSourceSynthesisIsCanonical();
    }
    const journal = this.#ledger.syncFromSessionProducer(
      producer,
      this.#context.work_id,
      this.#context.attempt,
      result.run_id,
      result.step_id,
      result.requests,
      source,
      result.status,
    );
    this.#ledger.hostState.settleSessionProducer(producer, journal.version);
  }

  async start(sourceScope: ScopedSourceSnapshot | null = null): Promise<SessionBridgeSnapshot> {
    requireBridge(!this.#configuredFrontier, 'configured-frontier continuation must resume the retained run');
    requireBridge(!this.#initialSourceContinuation, 'initial-source continuation must resume the retained run');
    const producer = this.#reserve('start', sourceScope);
    requireBridge(!(await this.snapshot()), 'Mastra run already exists');
    this.#ledger.hostState.assertSessionProducerCurrent(producer);
    this.#assertEngineFile();
    const run = await this.#workflow.createRun({ runId: this.#runId, resourceId: this.#context.work_id });
    this.#ledger.hostState.assertSessionProducerCurrent(producer);
    this.#assertEngineFile();
    await run.start({
      inputData: {
        work_id: this.#context.work_id,
        attempt: this.#context.attempt,
        workflow_id: this.#binding.workflowId,
        scope_digest: this.#context.scope_digest,
        config_digest: runtimeConfigDigest(this.#binding.config),
        selection: this.#binding.selection,
        observations: [],
      },
    });
    const snapshot = await this.snapshot();
    requireBridge(snapshot, 'Mastra run did not persist a snapshot');
    await this.#syncProducer(producer, snapshot, sourceScope);
    return snapshot;
  }

  async resume(
    stepId: string,
    observations: readonly SessionBridgeObservation[],
    sourceScope: ScopedSourceSnapshot | null = null,
  ): Promise<SessionBridgeSnapshot> {
    await this.#assertInitialSourceSynthesisIsCanonical();
    const producer = this.#reserve('resume', sourceScope, { stepId, observations });
    const current = await this.snapshot();
    requireBridge(current?.status === 'suspended' && current.step_id === stepId, 'Mastra resume step is stale');
    this.#ledger.hostState.assertSessionProducerCurrent(producer);
    this.#assertEngineFile();
    const run = await this.#workflow.createRun({ runId: this.#runId, resourceId: this.#context.work_id });
    this.#ledger.hostState.assertSessionProducerCurrent(producer);
    this.#assertEngineFile();
    await run.resume({ step: stepId, resumeData: { observations: [...observations] } });
    const snapshot = await this.snapshot();
    requireBridge(snapshot, 'Mastra resume did not persist a snapshot');
    await this.#syncProducer(producer, snapshot, sourceScope);
    return snapshot;
  }
}
