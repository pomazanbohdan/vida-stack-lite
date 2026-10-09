import { Mastra } from '@mastra/core/mastra';
import { InMemoryStore } from '@mastra/core/storage';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import z from 'zod';
import { canonicalJson, freezeJsonValue } from '../contracts/public-ingress.js';
import type { PolicySession } from './operation-policy.js';

export interface WorkflowGate {
  readonly condition: string;
  readonly message: string;
}
export interface WorkflowStage {
  readonly id: string;
  readonly description: string;
  readonly tools: readonly string[];
  readonly entry: readonly WorkflowGate[];
  readonly checks: readonly never[];
  readonly exit: readonly WorkflowGate[];
  readonly approval: { readonly message: string } | null;
  readonly terminal: boolean;
}
export interface WorkflowDefinition {
  readonly apiVersion: string;
  readonly kind: string;
  readonly metadata: { readonly name: string; readonly description: string; readonly version: string };
  readonly stages: readonly WorkflowStage[];
}
export interface ToolCall {
  readonly toolName: string;
  readonly args: Record<string, unknown>;
}
export interface WorkflowEvaluation {
  readonly action: 'allow' | 'block' | 'pending_approval';
  readonly reason: string;
  readonly stageId: string;
  readonly records: readonly Record<string, unknown>[];
  readonly audit: Readonly<Record<string, unknown>> | null;
  readonly events: readonly Record<string, unknown>[];
}

const actionSchema = z.object({ tool: z.string(), summary: z.string(), timestamp: z.string() });
const stateSchema = z
  .object({
    sessionId: z.string(),
    activeStage: z.string(),
    completedStages: z.array(z.string()),
    approvals: z.record(z.string(), z.string()),
    evidence: z.object({
      reads: z.array(z.string()),
      stageCalls: z.record(z.string(), z.array(z.string())),
      mcpResults: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
    }),
    blockedReason: z.string().nullable(),
    pendingApproval: z.object({
      required: z.boolean(),
      stageId: z.string().optional(),
      message: z.string().optional(),
    }),
    lastBlockedAction: actionSchema.extend({ message: z.string() }).nullable(),
    lastRecordedEvidence: actionSchema.nullable(),
    recordedStages: z.array(z.string()),
  })
  .strict();
type PolicyState = z.infer<typeof stateSchema>;
export type WorkflowState = Readonly<Omit<PolicyState, 'recordedStages'>>;
const callSchema = z.object({ toolName: z.string().min(1), args: z.record(z.string(), z.unknown()) });
const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('evaluate'), call: callSchema }).strict(),
  z.object({ kind: z.literal('approval'), stageId: z.string() }).strict(),
  z
    .object({
      kind: z.literal('result'),
      stageId: z.string(),
      call: callSchema,
      result: z.record(z.string(), z.unknown()).optional(),
    })
    .strict(),
  z.object({ kind: z.literal('seek'), stageId: z.string(), state: stateSchema.optional() }).strict(),
]);
type Command = z.infer<typeof commandSchema>;
const messageSchema = z.object({ command: commandSchema }).strict();

function createPolicyGraph(
  definition: WorkflowDefinition,
  apply: (stage: WorkflowStage | null, index: number, state: PolicyState, command: Command) => boolean,
) {
  let workflow = createWorkflow({
    id: definition.metadata.name,
    inputSchema: messageSchema,
    outputSchema: messageSchema,
    stateSchema,
    options: { validateInputs: true },
  });
  // A final suspended step keeps the read-only SDK usable after logical completion.
  for (const [index, stage] of [...definition.stages, null].entries()) {
    const step = createStep({
      id: 'policy-stage-' + index,
      inputSchema: messageSchema,
      outputSchema: messageSchema,
      resumeSchema: messageSchema,
      stateSchema,
      execute: async (context) => {
        const { inputData, resumeData, state, suspend } = context;
        const command = (resumeData ?? inputData).command;
        const next = copy(command.kind === 'seek' && command.state ? command.state : state);
        next.activeStage = stage?.id ?? '';
        const advance = apply(stage, index, next, command);
        await context.setState(next);
        if (advance) return { command: command.kind === 'result' ? { kind: 'seek' as const, stageId: '' } : command };
        return suspend({});
      },
    });
    workflow = workflow.then(step);
  }
  return workflow.commit();
}
type PolicyGraph = ReturnType<typeof createPolicyGraph>;

function copy<T>(value: T): T {
  return JSON.parse(canonicalJson(value)) as T;
}
function initialState(sessionId: string, definition: WorkflowDefinition): PolicyState {
  return {
    sessionId,
    activeStage: definition.stages[0]!.id,
    completedStages: [],
    approvals: {},
    evidence: { reads: [], stageCalls: {}, mcpResults: {} },
    blockedReason: null,
    pendingApproval: { required: false },
    lastBlockedAction: null,
    lastRecordedEvidence: null,
    recordedStages: [],
  };
}
function workflowSnapshot(definition: WorkflowDefinition, state: PolicyState): Record<string, unknown> {
  return {
    name: definition.metadata.name,
    version: definition.metadata.version,
    activeStage: state.activeStage,
    completedStages: [...state.completedStages],
    blockedReason: state.blockedReason,
    pendingApproval: { ...state.pendingApproval },
    ...(state.lastBlockedAction ? { lastBlockedAction: { ...state.lastBlockedAction } } : {}),
    ...(state.lastRecordedEvidence ? { lastRecordedEvidence: { ...state.lastRecordedEvidence } } : {}),
  };
}
function acceptedResult(stage: WorkflowStage, state: WorkflowState): boolean {
  return (
    stage.exit.length === 0 ||
    (state.evidence.mcpResults[stage.tools[0] ?? ''] ?? []).some((result) => result.accepted === 'true')
  );
}
function gateRecord(
  definition: WorkflowDefinition,
  stage: WorkflowStage,
  kind: string,
  passed: boolean,
  condition: string,
  evidence: string,
  message: string,
): Record<string, unknown> {
  return {
    name: `${definition.metadata.name}:${stage.id}:${kind}`,
    type: 'workflow_gate',
    passed,
    message,
    metadata: {
      workflow_name: definition.metadata.name,
      stage_id: stage.id,
      gate_kind: kind,
      gate_condition: condition,
      gate_passed: passed,
      gate_evidence: evidence,
      ...(kind === 'approval' && !passed ? { approval_requested_for: stage.id } : {}),
    },
  };
}

/** Mastra owns the graph and snapshots. These steps only evaluate policy; they cannot execute tools. */
export class PolicyWorkflowRuntime {
  readonly definition: WorkflowDefinition;
  readonly #sessionId: string;
  readonly #workflow: PolicyGraph;
  #run: Awaited<ReturnType<PolicyGraph['createRun']>> | undefined;
  #queue: Promise<void> = Promise.resolve();
  #snapshot: PolicyState;
  #started = false;
  #failed = false;
  #evaluation: WorkflowEvaluation | undefined;
  #events: Record<string, unknown>[] = [];

  constructor(definition: WorkflowDefinition, sessionId: string) {
    if (definition.stages.length === 0) throw new Error('governance workflow needs a stage');
    this.definition = freezeJsonValue(copy(definition)) as WorkflowDefinition;
    this.#sessionId = sessionId;
    this.#snapshot = initialState(sessionId, this.definition);
    this.#workflow = createPolicyGraph(this.definition, (stage, index, state, command) =>
      this.#apply(stage, index, state, command),
    );
    new Mastra({ workflows: { policy: this.#workflow }, storage: new InMemoryStore(), logger: false });
  }

  async #createRun() {
    return this.#workflow.createRun({ runId: this.#sessionId, resourceId: this.#sessionId });
  }
  #checkSession(session: PolicySession): void {
    if (session.sessionId !== this.#sessionId) throw new Error('governance workflow session binding differs');
  }
  #serialized<T>(session: PolicySession, operation: () => Promise<T>): Promise<T> {
    this.#checkSession(session);
    const result = this.#queue.then(operation);
    this.#queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
  async #dispatch(command: Command, resetState?: PolicyState): Promise<void> {
    if (this.#failed) throw new Error('governance policy snapshot failed; session is unavailable');
    const input = messageSchema.parse({ command });
    this.#run ??= await this.#createRun();
    this.#events = [];
    this.#evaluation = undefined;
    const outputOptions = { includeState: true };
    try {
      const result =
        resetState && this.#started && resetState.activeStage !== this.#snapshot.activeStage
          ? // Explicit SDK policy reset only. No executor, approval consumer or effect exists in this graph.
            await this.#run.timeTravel({
              step: 'policy-stage-0',
              inputData: input,
              resumeData: input,
              initialState: resetState,
              outputOptions,
            })
          : this.#started
            ? await this.#run.resume({ resumeData: input, outputOptions })
            : await this.#run.start({ inputData: input, initialState: resetState ?? this.#snapshot, outputOptions });
      if (result.status !== 'suspended') throw new Error('governance policy did not retain its suspended snapshot');
      this.#snapshot = stateSchema.parse(result.state);
      this.#started = true;
    } catch (error) {
      this.#failed = true;
      throw error;
    }
  }
  #stage(stageId: string): WorkflowStage {
    const stage = this.definition.stages.find((item) => item.id === stageId);
    if (!stage) throw new Error('workflow: unknown stage ' + JSON.stringify(stageId));
    return stage;
  }
  #apply(stage: WorkflowStage | null, index: number, state: PolicyState, command: Command): boolean {
    if (command.kind === 'seek') return stage !== null && stage.id !== command.stageId;
    if (command.kind === 'approval') {
      state.approvals[command.stageId] = 'approved';
      if (!state.recordedStages.includes(command.stageId)) state.recordedStages.push(command.stageId);
      state.blockedReason = null;
      state.pendingApproval = { required: false };
      state.lastBlockedAction = null;
      return false;
    }
    if (command.kind === 'result') {
      if (!state.recordedStages.includes(command.stageId)) state.recordedStages.push(command.stageId);
      if (command.result !== undefined) {
        const results = state.evidence.mcpResults[command.call.toolName] ?? [];
        if (results.length >= 1000) throw new Error('workflow result evidence capacity reached');
        state.evidence.mcpResults[command.call.toolName] = [...results, copy(command.result)];
      }
      if (
        stage?.id !== command.stageId ||
        index !== this.definition.stages.length - 1 ||
        !acceptedResult(stage, state) ||
        (stage.approval && state.approvals[stage.id] !== 'approved')
      )
        return false;
      if (stage.exit.length === 0 && !stage.approval) return false;
      this.#completeStage(stage, index, state);
      // Result evidence has already been recorded; the last step only retains its state.
      return true;
    }
    if (!stage) {
      this.#setEvaluation(state, command.call, 'allow', '', '', []);
      return false;
    }
    const boundaryOnly = stage.tools.length === 0 && (stage.approval !== null || stage.exit.length > 0);
    if (!boundaryOnly && (stage.tools.length === 0 || stage.tools.includes(command.call.toolName))) {
      this.#setEvaluation(state, command.call, 'allow', '', stage.id, [
        gateRecord(
          this.definition,
          stage,
          'tools',
          true,
          stage.tools.join(',') || 'tools',
          command.call.toolName,
          'tool allowed in active stage',
        ),
      ]);
      return false;
    }
    const gates = this.#gates(stage, state);
    if (gates.blocked) {
      this.#setEvaluation(state, command.call, 'block', gates.evaluation.reason, stage.id, [
        ...gates.evaluation.records,
      ]);
      return false;
    }
    if (stage.approval && state.approvals[stage.id] !== 'approved') {
      this.#setEvaluation(state, command.call, 'pending_approval', stage.approval.message, stage.id, [
        gateRecord(this.definition, stage, 'approval', false, 'stage boundary', '', stage.approval.message),
      ]);
      return false;
    }
    const next = this.definition.stages[index + 1];
    if (!next || (stage.exit.length === 0 && !stage.approval && next.exit.length === 0 && !next.approval)) {
      this.#setEvaluation(state, command.call, 'block', 'Tool is not allowed in this workflow stage', stage.id, [
        gateRecord(
          this.definition,
          stage,
          'tools',
          false,
          stage.tools.join(','),
          command.call.toolName,
          'Tool is not allowed in this workflow stage',
        ),
      ]);
      return false;
    }
    this.#completeStage(stage, index, state);
    return true;
  }
  #completeStage(stage: WorkflowStage, index: number, state: PolicyState): void {
    if (!state.completedStages.includes(stage.id)) state.completedStages.push(stage.id);
    const nextStage = this.definition.stages[index + 1]?.id ?? '';
    state.activeStage = nextStage;
    this.#events.push({
      action: nextStage ? 'workflow_stage_advanced' : 'workflow_completed',
      stageId: stage.id,
      ...(nextStage ? { toStageId: nextStage } : {}),
    });
  }
  #setEvaluation(
    state: PolicyState,
    call: ToolCall,
    action: WorkflowEvaluation['action'],
    reason: string,
    stageId: string,
    records: Record<string, unknown>[],
  ): void {
    state.blockedReason = action === 'block' ? reason : null;
    state.pendingApproval =
      action === 'pending_approval' ? { required: true, stageId, message: reason } : { required: false };
    if (action === 'block')
      state.lastBlockedAction = {
        tool: call.toolName,
        summary: call.toolName,
        message: reason,
        timestamp: new Date().toISOString(),
      };
    else if (action === 'allow') state.lastBlockedAction = null;
    this.#evaluation = {
      action,
      reason,
      stageId,
      records,
      audit: workflowSnapshot(this.definition, state),
      events: [],
    };
  }
  #gates(stage: WorkflowStage, state: WorkflowState): { evaluation: WorkflowEvaluation; blocked: boolean } {
    const passed = acceptedResult(stage, state);
    const records = stage.exit.map((gate) =>
      gateRecord(
        this.definition,
        stage,
        'mcp_result_matches',
        passed,
        gate.condition,
        stage.tools[0] ?? '',
        gate.message,
      ),
    );
    return {
      blocked: !passed,
      evaluation: {
        action: passed ? 'allow' : 'block',
        reason: passed ? '' : stage.exit[0]!.message,
        stageId: passed ? '' : stage.id,
        records,
        audit: null,
        events: [],
      },
    };
  }
  #resultEvents(): Record<string, unknown>[] {
    const snapshot = workflowSnapshot(this.definition, this.#snapshot);
    return this.#events.map(({ action, ...details }) => ({ action, workflow: { ...snapshot, ...details } }));
  }
  evaluate(session: PolicySession, call: ToolCall): Promise<WorkflowEvaluation> {
    const input = copy({ kind: 'evaluate' as const, call });
    return this.#serialized(session, async () => {
      await this.#dispatch(input);
      if (!this.#evaluation) throw new Error('governance evaluation is unavailable');
      return freezeJsonValue({ ...this.#evaluation, events: this.#resultEvents() }) as WorkflowEvaluation;
    });
  }
  state(session: PolicySession): Promise<WorkflowState> {
    return this.#serialized(session, async () => {
      if (this.#failed) throw new Error('governance policy snapshot is unavailable');
      const { recordedStages: _recorded, ...state } = copy(this.#snapshot);
      return freezeJsonValue(state) as WorkflowState;
    });
  }
  recordedStages(session: PolicySession): Promise<readonly string[]> {
    return this.#serialized(session, async () => {
      if (this.#failed) throw new Error('governance policy snapshot is unavailable');
      return Object.freeze([...this.#snapshot.recordedStages]);
    });
  }
  recordApproval(session: PolicySession, stageId: string): Promise<void> {
    this.#stage(stageId);
    return this.#serialized(session, () => this.#dispatch({ kind: 'approval', stageId }));
  }
  recordResult(
    session: PolicySession,
    stageId: string,
    call: ToolCall,
    result?: Record<string, unknown>,
  ): Promise<readonly Record<string, unknown>[]> {
    const stage = this.#stage(stageId);
    if (!stage.tools.includes(call.toolName)) throw new Error('workflow result tool is not configured for stage');
    const input = copy({ kind: 'result' as const, stageId, call, ...(result == null ? {} : { result }) });
    return this.#serialized(session, async () => {
      await this.#dispatch(input);
      return this.#resultEvents();
    });
  }
  reset(session: PolicySession, stageId: string): Promise<readonly Record<string, unknown>[]> {
    return this.#seek(session, stageId, true);
  }
  setStage(session: PolicySession, stageId: string): Promise<readonly Record<string, unknown>[]> {
    return this.#seek(session, stageId, false);
  }
  #seek(session: PolicySession, stageId: string, clear: boolean): Promise<readonly Record<string, unknown>[]> {
    const stage = this.#stage(stageId);
    return this.#serialized(session, async () => {
      const index = this.definition.stages.indexOf(stage);
      const state = copy(this.#snapshot);
      state.activeStage = stageId;
      state.completedStages = this.definition.stages.slice(0, index).map((item) => item.id);
      if (clear) {
        const cleared = new Set(this.definition.stages.slice(index).map((item) => item.id));
        const tools = new Set(this.definition.stages.slice(index).flatMap((item) => item.tools));
        state.approvals = Object.fromEntries(Object.entries(state.approvals).filter(([key]) => !cleared.has(key)));
        state.evidence.stageCalls = Object.fromEntries(
          Object.entries(state.evidence.stageCalls).filter(([key]) => !cleared.has(key)),
        );
        state.evidence.mcpResults = Object.fromEntries(
          Object.entries(state.evidence.mcpResults).filter(([key]) => index > 0 && !tools.has(key)),
        );
        state.recordedStages = state.recordedStages.filter((id) => !cleared.has(id));
        if (index === 0) state.evidence.reads = [];
      }
      state.blockedReason = null;
      state.lastBlockedAction = null;
      state.pendingApproval =
        stage.approval && state.approvals[stageId] !== 'approved'
          ? { required: true, stageId, message: stage.approval.message }
          : { required: false };
      await this.#dispatch({ kind: 'seek', stageId, state }, state);
      return [{ action: 'workflow_state_updated', workflow: workflowSnapshot(this.definition, this.#snapshot) }];
    });
  }
  async evaluateWorkflowGates(
    stage: WorkflowStage,
    state: WorkflowState,
    _call: ToolCall,
    gates: readonly WorkflowGate[],
  ): Promise<{ evaluation: WorkflowEvaluation; blocked: boolean }> {
    const configured = this.#stage(stage.id);
    if (canonicalJson(gates) !== canonicalJson(configured.exit)) throw new Error('unsupported governance gates');
    return this.#gates(configured, state);
  }
}
