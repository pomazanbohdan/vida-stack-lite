import { lstatSync } from 'node:fs';
import path from 'node:path';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import z from 'zod';
import { type AgentRuntimeConfig, type WorkItemSelection, runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { compileDevelopmentWorkflow } from './workflow-plan.js';
import { buildConfiguredContext, type ConfiguredContext } from './configured-context.js';
import { parseObservedValidatorVerdict } from './observed-validation.js';
import { parseObservedTesterVerdict } from './observed-testing.js';
import { sessionActionsForWave, type SessionAgentAction, type SessionHandoffContext } from './session-handoff.js';
import { correctiveExecutionSchema, type CorrectiveExecution } from './final-assurance.js';
import { MastraSessionLedger } from './persistent-session-handoff.js';
import { readSessionEngineSnapshot, type SessionEngineBinding } from './session-engine-snapshot.js';
import type { ScopedSourceSnapshot } from './scoped-source-snapshot.js';

const observationSchema = z
  .object({
    schema: z.literal('VidaSessionObservation/v1'),
    action_id: z.string().regex(/^[a-f0-9]{64}$/),
    host_attempt_id: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    changed_paths: z.array(z.string().min(1).max(512)).optional(),
    issue_id: z.string().uuid(),
    agent_id: z.string().min(1).max(256),
    tool_call_ref: z.string().min(1).max(256),
    status: z.enum(['reported_complete', 'reported_failed']),
    summary: z.string().min(1).max(4096),
    output_digest: z.string().regex(/^[a-f0-9]{64}$/),
    evidence_refs: z.array(z.string().min(1).max(512)),
  })
  .strict();

export type SessionBridgeObservation = z.infer<typeof observationSchema>;

export function parseSessionBridgeObservation(value: unknown): SessionBridgeObservation {
  return observationSchema.parse(value);
}

const runStateSchema = z.object({
  work_id: z.string(),
  attempt: z.number().int().positive(),
  workflow_id: z.string(),
  scope_digest: z.string(),
  config_digest: z.string(),
  selection: z.custom<WorkItemSelection>(),
  observations: z.array(observationSchema),
});

export function parseSessionBridgeRunState(value: unknown): z.infer<typeof runStateSchema> {
  return runStateSchema.parse(value);
}

const requestSchema = z
  .object({
    schema: z.literal('VidaSessionRequest/v1'),
    run_id: z.string(),
    workflow_id: z.string(),
    wave_index: z.number().int().nonnegative(),
    action_id: z.string().regex(/^[a-f0-9]{64}$/),
    assignment_index: z.number().int().nonnegative(),
    stage_id: z.string(),
    role: z.string(),
    config_digest: z.string().regex(/^[a-f0-9]{64}$/),
    scope_digest: z.string().regex(/^[a-f0-9]{64}$/),
    bindings_manifest_ref: z.string().regex(/^[a-f0-9]{64}$/),
    corrective_execution: correctiveExecutionSchema.optional(),
    configured_context_digest: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    configured_context_files: z
      .array(
        z
          .object({
            path: z.string().min(1).max(512),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type SessionBridgeRequest = z.infer<typeof requestSchema>;

/** Pure persisted-request validation; does not initialize workflow storage. */
export function parseSessionBridgeRequest(value: unknown): SessionBridgeRequest {
  return requestSchema.parse(value);
}

export function buildSessionBridgeRequest(args: {
  runId: string;
  workflowId: string;
  configDigest: string;
  context: SessionHandoffContext;
  waveIndex: number;
  action: SessionAgentAction;
  configuredContext: ConfiguredContext | null;
  priorResults: readonly SessionBridgeObservation[];
  correctiveExecution?: CorrectiveExecution;
}): SessionBridgeRequest {
  const {
    runId,
    workflowId,
    configDigest,
    context,
    waveIndex,
    action,
    configuredContext,
    priorResults,
    correctiveExecution,
  } = args;
  return {
    ...(configuredContext ? { configured_context_digest: configuredContext.digest } : {}),
    ...(configuredContext
      ? {
          configured_context_files: configuredContext.entries
            .filter((entry) => entry.sha256 !== null)
            .map((entry) => ({ path: entry.location, sha256: entry.sha256 as string })),
        }
      : {}),
    schema: 'VidaSessionRequest/v1',
    ...(correctiveExecution ? { corrective_execution: correctiveExecution } : {}),
    run_id: runId,
    workflow_id: workflowId,
    wave_index: waveIndex,
    action_id: action.action_id,
    assignment_index: action.assignment_index,
    stage_id: action.stage_id,
    role: action.role,
    config_digest: configDigest,
    scope_digest: context.scope_digest,
    bindings_manifest_ref: canonicalJsonDigest({
      config_digest: configDigest,
      scope_digest: context.scope_digest,
      work_id: context.work_id,
      attempt: context.attempt,
      action_id: action.action_id,
      stage_id: action.stage_id,
      configured_context_digest: configuredContext?.digest ?? null,
      wave_index: waveIndex,
      prior_results: priorResults.map((entry) => entry.output_digest),
    }),
  };
}

export function configuredContextForStage(
  repositoryRoot: string,
  config: AgentRuntimeConfig,
  workflowId: string,
  stageId: string,
  context: SessionHandoffContext,
): ConfiguredContext | null {
  const stage = config.workflows[workflowId]?.stages.find((entry) => entry.id === stageId);
  requireBridge(stage, 'Configured context stage is missing');
  const sourceIds = stage.context_source_ids ?? [];
  const skillRefs = stage.context_skill_refs ?? [];
  return sourceIds.length + skillRefs.length === 0
    ? null
    : buildConfiguredContext(repositoryRoot, config, {
        work_id: context.work_id,
        attempt: context.attempt,
        source_ids: sourceIds,
        skill_refs: skillRefs,
      });
}

const suspendSchema = z.object({ requests: z.array(requestSchema).min(1) });
const resumeSchema = z.object({ observations: z.array(observationSchema).min(1) });

function requireBridge(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function sessionBridgeRunId(workspaceId: string, context: SessionHandoffContext, workflowId: string): string {
  return 'vida-' + canonicalJsonDigest({ workspaceId, context, workflowId });
}

export function sessionBridgeDatabasePath(repositoryRoot: string, config: AgentRuntimeConfig): string {
  return path.join(repositoryRoot, config.control.work_root, 'mastra-workflows.v1.sqlite');
}

export interface SessionBridgeSnapshot {
  readonly run_id: string;
  readonly status: 'suspended' | 'success' | 'failed' | 'canceled' | 'unknown';
  readonly step_id: string | null;
  readonly requests: readonly SessionBridgeRequest[];
  readonly observations: readonly SessionBridgeObservation[];
}

/** Mastra owns stage order; the session ledger only issues and records effects. */
export class MastraSessionBridge {
  readonly #workflow: ReturnType<typeof createWorkflow>;
  readonly #storage: LibSQLStore;
  readonly #context: SessionHandoffContext;
  readonly #runId: string;
  readonly #binding: SessionEngineBinding;
  readonly #ledger: MastraSessionLedger;
  readonly #projectIds: readonly string[];
  readonly #engineIdentity: { readonly dev: number; readonly ino: number };

  private constructor(
    workflow: ReturnType<typeof createWorkflow>,
    storage: LibSQLStore,
    config: AgentRuntimeConfig,
    selection: WorkItemSelection,
    context: SessionHandoffContext,
    workflowId: string,
    runId: string,
    repositoryRoot: string,
    ledger: MastraSessionLedger,
    projectIds: readonly string[],
  ) {
    this.#workflow = workflow;
    this.#storage = storage;
    this.#context = structuredClone(context);
    this.#runId = runId;
    this.#binding = { ...structuredClone({ repositoryRoot, selection, context, workflowId, runId }), config };
    this.#ledger = ledger;
    this.#projectIds = [...projectIds];
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
    correctiveExecution?: CorrectiveExecution;
  }): Promise<MastraSessionBridge> {
    const { repositoryRoot, config, selection, context, workflowId, workspaceId } = args;
    requireBridge(args.ledger instanceof MastraSessionLedger, 'Actual configured producer ledger is required');
    const bound = MastraSessionLedger.prototype.sessionProducerBinding.call(args.ledger);
    requireBridge(
      bound.repositoryRoot === repositoryRoot &&
        bound.workspaceId === workspaceId &&
        runtimeConfigDigest(bound.config) === runtimeConfigDigest(config),
      'Producer ledger binding differs',
    );
    const plan = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags);
    const correctiveExecution = args.correctiveExecution
      ? correctiveExecutionSchema.parse(args.correctiveExecution)
      : undefined;
    const baseRunId = sessionBridgeRunId(workspaceId, context, workflowId);
    requireBridge(!correctiveExecution || correctiveExecution.base_run_id === baseRunId, 'corrective base run differs');
    const runId = correctiveExecution?.engine_run_id ?? baseRunId;
    const configDigest = runtimeConfigDigest(config);
    const workflow = createWorkflow({
      id: workflowId,
      inputSchema: runStateSchema,
      outputSchema: runStateSchema,
      description: 'Configured VIDA session workflow with durable agent handoff.',
    });
    for (const [waveIndex, wave] of plan.waves.entries()) {
      if (correctiveExecution && !wave.some((stage) => correctiveExecution.stage_ids.includes(stage.id))) continue;
      if (wave.every((stage) => stage.assignments.length === 0)) continue;
      workflow.then(
        createStep({
          id: 'wave-' + waveIndex,
          inputSchema: runStateSchema,
          outputSchema: runStateSchema,
          suspendSchema,
          resumeSchema,
          execute: async ({ inputData, resumeData, suspend }) => {
            requireBridge(inputData.config_digest === configDigest, 'Mastra configuration changed during attempt');
            const actions = sessionActionsForWave(
              config,
              selection,
              context,
              workflowId,
              waveIndex,
              [],
              correctiveExecution,
            );
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
            for (const action of actions.filter((entry) => entry.stage_kind === 'validate')) {
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
            return { ...inputData, observations: [...inputData.observations, ...resumeData.observations] };
          },
        }),
      );
    }
    workflow.commit();
    const producer = args.ledger.beginSessionProducer({
      selection,
      context,
      workflowId,
      runId,
      projectIds: args.projectIds,
      phase: 'initialize',
    });
    args.ledger.hostState.assertSessionProducerCurrent(producer);
    const access = requireSafeRepositoryAccess(repositoryRoot);
    access.ensureDirectory(config.control.work_root, 'Mastra workflow storage root');
    const databasePath = sessionBridgeDatabasePath(repositoryRoot, config);
    let physicalBefore: { dev: number; ino: number } | undefined;
    try {
      const stat = lstatSync(databasePath);
      requireBridge(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Mastra database path is unsafe');
      physicalBefore = { dev: stat.dev, ino: stat.ino };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const storage = new LibSQLStore({ id: 'vida-workflow-state', url: 'file:' + databasePath });
    try {
      args.ledger.hostState.assertSessionProducerCurrent(producer);
      await storage.init();
      const physicalAfter = lstatSync(databasePath);
      requireBridge(
        physicalAfter.isFile() &&
          !physicalAfter.isSymbolicLink() &&
          physicalAfter.nlink === 1 &&
          (!physicalBefore || (physicalAfter.dev === physicalBefore.dev && physicalAfter.ino === physicalBefore.ino)),
        'Mastra database was substituted during initialization',
      );
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
        args.ledger,
        args.projectIds,
      );
      args.ledger.hostState.settleSessionProducer(
        producer,
        args.ledger.resume(context.work_id, context.attempt)?.version ?? null,
      );
      return bridge;
    } catch (error) {
      await storage.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.#storage.close();
  }

  async snapshot(): Promise<SessionBridgeSnapshot | null> {
    this.#assertEngineFile();
    const snapshot = readSessionEngineSnapshot(this.#binding);
    this.#assertEngineFile();
    return snapshot;
  }

  #reserve(
    phase: 'start' | 'resume',
    sourceScope: ScopedSourceSnapshot | null,
    resumeIntent?: { stepId: string; observations: readonly SessionBridgeObservation[] },
  ) {
    this.#assertEngineFile();
    return this.#ledger.beginSessionProducer({
      ...this.#binding,
      projectIds: this.#projectIds,
      phase,
      sourceScope,
      ...(resumeIntent ? { resumeIntent } : {}),
    });
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

  #syncProducer(
    producer: ReturnType<MastraSessionLedger['beginSessionProducer']>,
    result: SessionBridgeSnapshot,
    source: ScopedSourceSnapshot | null,
  ): void {
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
    this.#syncProducer(producer, snapshot, sourceScope);
    return snapshot;
  }

  async resume(
    stepId: string,
    observations: readonly SessionBridgeObservation[],
    sourceScope: ScopedSourceSnapshot | null = null,
  ): Promise<SessionBridgeSnapshot> {
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
    this.#syncProducer(producer, snapshot, sourceScope);
    return snapshot;
  }
}
