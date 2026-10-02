import {
  assertLoadedRuntimeConfig,
  loadRuntimeConfig,
  runtimeConfigDigest,
  selectWorkflow,
  type AgentRuntimeConfig,
  type WorkItemSelection,
} from '../config/runtime-config.js';
import { assertCanonicalJsonValue, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import { compileDevelopmentWorkflow } from './workflow-plan.js';
import type { CorrectiveExecution } from './final-assurance.js';

/** A serialized instruction for the orchestrating session. This module never issues an agent tool call. */
export interface SessionAgentAction {
  readonly action_id: string;
  readonly corrective_execution?: CorrectiveExecution;
  readonly work_id: string;
  readonly attempt: number;
  readonly scope_digest: string;
  readonly wave_index: number;
  readonly action_order: number;
  readonly assignment_index: number;
  readonly stage_id: string;
  readonly stage_kind: string;
  readonly stage_mode: 'single' | 'parallel';
  readonly required_after: readonly string[];
  readonly role: string;
  readonly contour?: string;
  readonly model: string;
  readonly reasoning: string;
  readonly mutation_scope: string;
  readonly context_skill_refs: readonly string[];
  readonly resolved_profile: {
    readonly schema: 'ResolvedAgentProfile/v1';
    readonly config_digest: string;
    readonly profile_id: string;
    readonly model: string;
    readonly reasoning: string;
    readonly execution_mode: 'fast' | 'standard';
    readonly mutation_scope: string;
    readonly tools_policy: {
      readonly id: string;
      readonly source_write: boolean;
      readonly allowed_tools: readonly string[];
    };
    readonly egress_policy: {
      readonly id: string;
      readonly allowed_hosts: readonly string[];
    };
    readonly enforcement_status: 'not_asserted';
  };
  readonly role_description: string;
  readonly role_rules: readonly string[];
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly prior_outcomes: readonly SessionAgentOutcome[];
}

/** Caller-reported session data. A matching digest is consistency evidence, never proof of a tool call. */
export interface SessionAgentOutcome {
  readonly action_id: string;
  readonly handoff_digest: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly scope_digest: string;
  readonly wave_index: number;
  readonly action_order: number;
  readonly stage_id: string;
  readonly role: string;
  readonly status: 'reported_complete' | 'reported_failed';
  readonly summary: string;
  readonly session_result: {
    readonly issue_id: string;
    readonly agent_id: string;
    readonly tool_call_ref: string;
    readonly output_digest: string;
  };
  readonly evidence_refs: readonly string[];
}

export interface SessionHandoffContext {
  readonly work_id: string;
  readonly attempt: number;
  readonly scope_digest: string;
}

export interface SessionWorkflowHandoff {
  readonly schema: 'SessionWorkflowHandoff/v1';
  readonly config_digest: string;
  readonly context: SessionHandoffContext;
  readonly selection: WorkItemSelection;
  readonly workflow_id: string;
  readonly binding_id: string;
  readonly wave_index: number;
  readonly status: 'awaiting_agent_outcomes' | 'blocked' | 'all_reports_collected';
  readonly actions: readonly SessionAgentAction[];
  readonly outcomes: readonly SessionAgentOutcome[];
  readonly digest: string;
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function exactKeys(value: unknown, keys: readonly string[]): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function seal(state: Omit<SessionWorkflowHandoff, 'digest'>): SessionWorkflowHandoff {
  assertCanonicalJsonValue(state, '$');
  return freezeJsonValue({ ...state, digest: canonicalJsonDigest(state) });
}

function assertCurrent(config: AgentRuntimeConfig, state: SessionWorkflowHandoff): void {
  requireCondition(state?.schema === 'SessionWorkflowHandoff/v1', 'session handoff schema is invalid');
  requireCondition(
    exactKeys(state, [
      'schema',
      'config_digest',
      'context',
      'selection',
      'workflow_id',
      'binding_id',
      'wave_index',
      'status',
      'actions',
      'outcomes',
      'digest',
    ]),
    'session handoff fields are invalid',
  );
  const { digest, ...body } = state;
  assertCanonicalJsonValue(body, '$');
  requireCondition(digest === canonicalJsonDigest(body), 'session handoff digest is stale');
  requireCondition(state.config_digest === runtimeConfigDigest(config), 'session handoff configuration changed');
  assertContext(state.context);
  const selected = selectWorkflow(config, state.selection);
  requireCondition(
    selected.workflow_id === state.workflow_id && selected.binding_id === state.binding_id,
    'session handoff workflow selection changed',
  );
}

/** Validate the current advisory projection against the loaded YAML; no execution authority is inferred. */
export function validateSessionWorkflowHandoffFromConfig(
  config: AgentRuntimeConfig,
  state: SessionWorkflowHandoff,
): void {
  assertLoadedRuntimeConfig(config);
  assertCurrent(config, state);
  if (state.status === 'awaiting_agent_outcomes') {
    requireCondition(
      canonicalJsonDigest(state.actions) === canonicalJsonDigest(waveActions(config, state)),
      'session handoff actions changed',
    );
  } else {
    requireCondition(
      (state.status === 'blocked' || state.status === 'all_reports_collected') && state.actions.length === 0,
      'session handoff terminal state is invalid',
    );
  }
}

function assertContext(context: SessionHandoffContext): void {
  requireCondition(
    exactKeys(context, ['work_id', 'attempt', 'scope_digest']),
    'session handoff context fields are invalid',
  );
  requireCondition(context && /^[a-z0-9][a-z0-9-]{0,127}$/.test(context.work_id), 'session handoff work id is invalid');
  requireCondition(Number.isSafeInteger(context.attempt) && context.attempt > 0, 'session handoff attempt is invalid');
  requireCondition(/^[a-f0-9]{64}$/.test(context.scope_digest), 'session handoff scope digest is invalid');
}

function waveActions(
  config: AgentRuntimeConfig,
  state: Pick<SessionWorkflowHandoff, 'selection' | 'context' | 'workflow_id' | 'wave_index' | 'outcomes'>,
): readonly SessionAgentAction[] {
  return sessionActionsForWave(
    config,
    state.selection,
    state.context,
    state.workflow_id,
    state.wave_index,
    state.outcomes,
  );
}

/** Project one compiler-owned wave into session instructions; this does not advance a workflow. */
export function sessionActionsForWave(
  config: AgentRuntimeConfig,
  selection: WorkItemSelection,
  context: SessionHandoffContext,
  workflowId: string,
  waveIndex: number,
  outcomes: readonly SessionAgentOutcome[],
  correctiveExecution?: CorrectiveExecution,
): readonly SessionAgentAction[] {
  const compiled = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags);
  const wave = compiled.waves[waveIndex];
  requireCondition(wave !== undefined, 'session handoff wave is unavailable');
  const selectedWave = correctiveExecution
    ? wave.filter((stage) => correctiveExecution.stage_ids.includes(stage.id))
    : wave;
  return selectedWave
    .flatMap((stage) =>
      stage.assignments.map((assignment) => {
        const index = config.workflows[workflowId]!.stages.find(
          (configuredStage) => configuredStage.id === stage.id,
        )!.assignments.indexOf(assignment);
        requireCondition(index >= 0, 'session assignment is not in the configured stage');
        const profile = config.agents.profiles[assignment.profile];
        const instructions = config.agents.role_instructions[assignment.role];
        requireCondition(profile, 'session handoff profile is unavailable');
        requireCondition(instructions, 'session handoff role instructions are unavailable');
        const toolPolicy = config.agents.tool_policies[profile.tools_policy];
        const egressPolicy = config.agents.egress_policies[profile.egress_policy];
        requireCondition(toolPolicy, 'session handoff tool policy is unavailable');
        requireCondition(egressPolicy, 'session handoff egress policy is unavailable');
        return {
          action_id: canonicalJsonDigest({
            ...(correctiveExecution ? { corrective_execution: correctiveExecution } : {}),
            context,
            workflow_id: workflowId,
            wave_index: waveIndex,
            stage_id: stage.id,
            assignment_index: index,
          }),
          ...(correctiveExecution ? { corrective_execution: correctiveExecution } : {}),
          work_id: context.work_id,
          attempt: context.attempt,
          scope_digest: context.scope_digest,
          wave_index: waveIndex,
          action_order: 0,
          assignment_index: index,
          stage_id: stage.id,
          stage_kind: stage.kind,
          stage_mode: stage.mode,
          required_after: stage.required_after,
          role: assignment.role,
          ...(assignment.contour ? { contour: assignment.contour } : {}),
          model: profile.model,
          reasoning: profile.reasoning,
          mutation_scope: profile.mutation_scope,
          context_skill_refs: stage.context_skill_refs ?? [],
          resolved_profile: {
            schema: 'ResolvedAgentProfile/v1' as const,
            config_digest: runtimeConfigDigest(config),
            profile_id: assignment.profile,
            model: profile.model,
            reasoning: profile.reasoning,
            execution_mode: profile.execution_mode,
            mutation_scope: profile.mutation_scope,
            tools_policy: {
              id: profile.tools_policy,
              source_write: toolPolicy.source_write,
              allowed_tools: toolPolicy.allowed_tools,
            },
            egress_policy: {
              id: profile.egress_policy,
              allowed_hosts: egressPolicy.allowed_hosts,
            },
            enforcement_status: 'not_asserted' as const,
          },
          role_description: instructions.description,
          role_rules: instructions.rules,
          consumes: stage.consumes,
          produces: stage.produces,
          prior_outcomes: outcomes,
        };
      }),
    )
    .map((action, action_order) => ({ ...action, action_order }));
}

/** The only configured slot pair allowed to share one caller-reported tool invocation. */
export function allowsSharedInvocationForConfiguredSlots(
  config: AgentRuntimeConfig,
  left: { readonly workflow_id: string; readonly stage_id: string; readonly assignment_index: number },
  right: { readonly workflow_id: string; readonly stage_id: string; readonly assignment_index: number },
): boolean {
  if (
    left.workflow_id !== 'task_execution' ||
    right.workflow_id !== left.workflow_id ||
    left.stage_id !== 'validate_focused' ||
    right.stage_id !== left.stage_id ||
    left.assignment_index === right.assignment_index
  )
    return false;
  const stage = config.workflows.task_execution?.stages.find((candidate) => candidate.id === left.stage_id);
  if (!stage || stage.kind !== 'validate' || stage.mode !== 'parallel') return false;
  const assignments = [stage.assignments[left.assignment_index], stage.assignments[right.assignment_index]];
  if (
    !assignments.every(
      (assignment) => assignment && config.agents.profiles[assignment.profile]?.mutation_scope === 'none',
    )
  )
    return false;
  return (
    canonicalJsonDigest(assignments.map((assignment) => assignment!.role).sort()) ===
    canonicalJsonDigest(['correctness-validator', 'requirements-validator'])
  );
}

export function sessionReportsCanShareInvocation(
  config: AgentRuntimeConfig,
  workflowId: string,
  leftAction: SessionAgentAction,
  left: SessionAgentOutcome,
  rightAction: SessionAgentAction,
  right: SessionAgentOutcome,
): boolean {
  return (
    leftAction.action_id !== rightAction.action_id &&
    left.session_result.tool_call_ref === right.session_result.tool_call_ref &&
    left.session_result.issue_id !== right.session_result.issue_id &&
    left.session_result.agent_id === right.session_result.agent_id &&
    left.handoff_digest === right.handoff_digest &&
    left.work_id === right.work_id &&
    left.attempt === right.attempt &&
    left.scope_digest === right.scope_digest &&
    left.wave_index === right.wave_index &&
    left.stage_id === right.stage_id &&
    left.role === leftAction.role &&
    right.role === rightAction.role &&
    allowsSharedInvocationForConfiguredSlots(
      config,
      {
        workflow_id: workflowId,
        stage_id: leftAction.stage_id,
        assignment_index: leftAction.assignment_index,
      },
      {
        workflow_id: workflowId,
        stage_id: rightAction.stage_id,
        assignment_index: rightAction.assignment_index,
      },
    )
  );
}

/** Prepare the first configured wave from the root YAML; no provider action has occurred. */
export function prepareSessionWorkflowHandoff(
  repositoryRoot: string,
  selection: WorkItemSelection,
  context: SessionHandoffContext,
): SessionWorkflowHandoff {
  const config = loadRuntimeConfig(repositoryRoot);
  return prepareSessionWorkflowHandoffFromConfig(config, selection, context);
}

export function prepareSessionWorkflowHandoffFromConfig(
  config: AgentRuntimeConfig,
  selection: WorkItemSelection,
  context: SessionHandoffContext,
): SessionWorkflowHandoff {
  assertLoadedRuntimeConfig(config);
  assertCanonicalJsonValue(selection, '$');
  assertCanonicalJsonValue(context, '$');
  assertContext(context);
  const selected = selectWorkflow(config, selection);
  const base = {
    schema: 'SessionWorkflowHandoff/v1' as const,
    config_digest: runtimeConfigDigest(config),
    context,
    selection,
    workflow_id: selected.workflow_id,
    binding_id: selected.binding_id,
    wave_index: 0,
    status: 'awaiting_agent_outcomes' as const,
    outcomes: [] as readonly SessionAgentOutcome[],
  };
  const actions = waveActions(config, base);
  requireCondition(actions.length > 0, 'session handoff has no executable first-wave assignment');
  return seal({ ...base, actions });
}

/** Validate caller reports for the entire wave. This advisory projection grants no lifecycle acceptance or write permission. */
export function advanceSessionWorkflowHandoff(
  repositoryRoot: string,
  state: SessionWorkflowHandoff,
  outcomes: readonly SessionAgentOutcome[],
): SessionWorkflowHandoff {
  return advanceSessionWorkflowHandoffFromConfig(loadRuntimeConfig(repositoryRoot), state, outcomes);
}

export function advanceSessionWorkflowHandoffFromConfig(
  config: AgentRuntimeConfig,
  state: SessionWorkflowHandoff,
  outcomes: readonly SessionAgentOutcome[],
): SessionWorkflowHandoff {
  assertLoadedRuntimeConfig(config);
  assertCurrent(config, state);
  requireCondition(state.status === 'awaiting_agent_outcomes', 'session handoff is not awaiting outcomes');
  const expected = waveActions(config, state);
  requireCondition(
    canonicalJsonDigest(state.actions) === canonicalJsonDigest(expected),
    'session handoff actions changed',
  );
  assertCanonicalJsonValue(outcomes, '$');
  requireCondition(outcomes.length === expected.length, 'session handoff requires every wave outcome');
  for (const [index, outcome] of outcomes.entries()) validateSessionAgentOutcome(state, expected[index]!, outcome);
  const reportPairs = outcomes.map((outcome, index) => ({ action: expected[index]!, outcome }));
  requireCondition(
    outcomes.every(
      (outcome) =>
        !state.outcomes.some((prior) => prior.session_result.tool_call_ref === outcome.session_result.tool_call_ref),
    ),
    'session handoff tool call reference was replayed from a prior wave',
  );
  const byReference = new Map<string, typeof reportPairs>();
  for (const pair of reportPairs) {
    const reference = pair.outcome.session_result.tool_call_ref;
    byReference.set(reference, [...(byReference.get(reference) ?? []), pair]);
  }
  for (const pairs of byReference.values())
    if (pairs.length > 1)
      requireCondition(
        pairs.length === 2 &&
          sessionReportsCanShareInvocation(
            config,
            state.workflow_id,
            pairs[0]!.action,
            pairs[0]!.outcome,
            pairs[1]!.action,
            pairs[1]!.outcome,
          ),
        'session handoff tool call reference is shared outside an allowed configured slot batch',
      );
  const recorded = [...state.outcomes, ...outcomes];
  const failed = outcomes.some((outcome) => outcome.status === 'reported_failed');
  const nextIndex = state.wave_index + 1;
  const waves = compileDevelopmentWorkflow(
    config,
    state.selection.team,
    state.workflow_id,
    state.selection.risk_flags,
  ).waves;
  const { digest: previousDigest, ...body } = state;
  void previousDigest;
  if (failed || nextIndex === waves.length)
    return seal({
      ...body,
      wave_index: nextIndex,
      status: failed ? 'blocked' : 'all_reports_collected',
      actions: [],
      outcomes: recorded,
    });
  const next = { ...body, wave_index: nextIndex, status: 'awaiting_agent_outcomes' as const, outcomes: recorded };
  const actions = waveActions(config, next);
  requireCondition(actions.length > 0, 'session handoff next wave has no executable assignment');
  return seal({ ...next, actions });
}

/** Structural check only; a caller-controlled report cannot attest its tool origin. */
export function validateSessionAgentOutcome(
  state: SessionWorkflowHandoff,
  action: SessionAgentAction,
  outcome: SessionAgentOutcome,
): void {
  requireCondition(
    exactKeys(outcome, [
      'action_id',
      'handoff_digest',
      'work_id',
      'attempt',
      'scope_digest',
      'wave_index',
      'action_order',
      'stage_id',
      'role',
      'status',
      'summary',
      'session_result',
      'evidence_refs',
    ]),
    'session handoff outcome fields are invalid',
  );
  requireCondition(
    outcome.action_id === action.action_id &&
      outcome.handoff_digest === state.digest &&
      outcome.work_id === action.work_id &&
      outcome.attempt === action.attempt &&
      outcome.scope_digest === action.scope_digest &&
      outcome.wave_index === action.wave_index &&
      outcome.action_order === action.action_order &&
      outcome.stage_id === action.stage_id &&
      outcome.role === action.role,
    'session handoff outcome binding or order does not match',
  );
  requireCondition(
    outcome.status === 'reported_complete' || outcome.status === 'reported_failed',
    'session handoff outcome status is invalid',
  );
  requireCondition(
    typeof outcome.summary === 'string' && outcome.summary.length > 0 && outcome.summary.length <= 4096,
    'session handoff outcome summary is invalid',
  );
  requireCondition(
    Array.isArray(outcome.evidence_refs) &&
      outcome.evidence_refs.every((ref) => typeof ref === 'string' && ref.length > 0 && ref.length <= 512),
    'session handoff outcome evidence is invalid',
  );
  requireCondition(
    outcome.session_result &&
      exactKeys(outcome.session_result, ['issue_id', 'agent_id', 'tool_call_ref', 'output_digest']) &&
      typeof outcome.session_result.issue_id === 'string' &&
      outcome.session_result.issue_id.length > 0 &&
      outcome.session_result.issue_id.length <= 256 &&
      typeof outcome.session_result.agent_id === 'string' &&
      outcome.session_result.agent_id.length > 0 &&
      outcome.session_result.agent_id.length <= 256 &&
      typeof outcome.session_result.tool_call_ref === 'string' &&
      outcome.session_result.tool_call_ref.length > 0 &&
      outcome.session_result.tool_call_ref.length <= 256 &&
      typeof outcome.session_result.output_digest === 'string' &&
      outcome.session_result.output_digest === canonicalJsonDigest(outcome.summary),
    'session handoff session result is invalid',
  );
}
