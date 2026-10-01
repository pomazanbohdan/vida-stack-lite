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

/** A serialized instruction for the orchestrating session. This module never issues an agent tool call. */
export interface SessionAgentAction {
  readonly action_id: string;
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
): readonly SessionAgentAction[] {
  const compiled = compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags);
  const wave = compiled.waves[waveIndex];
  requireCondition(wave !== undefined, 'session handoff wave is unavailable');
  return wave
    .flatMap((stage) =>
      stage.assignments.map((assignment) => {
        const index = config.workflows[workflowId]!.stages
          .find((configuredStage) => configuredStage.id === stage.id)!.assignments.indexOf(assignment);
        requireCondition(index >= 0, 'session assignment is not in the configured stage');
        const profile = config.agents.profiles[assignment.profile];
        const instructions = config.agents.role_instructions[assignment.role];
        requireCondition(profile, 'session handoff profile is unavailable');
        requireCondition(instructions, 'session handoff role instructions are unavailable');
        return {
          action_id: canonicalJsonDigest({
            context,
            workflow_id: workflowId,
            wave_index: waveIndex,
            stage_id: stage.id,
            assignment_index: index,
          }),
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
  requireCondition(
    new Set(outcomes.map((outcome) => outcome.session_result.tool_call_ref)).size === outcomes.length,
    'session handoff tool call references contain duplicates',
  );
  requireCondition(
    new Set([...state.outcomes, ...outcomes].map((outcome) => outcome.session_result.tool_call_ref)).size ===
      state.outcomes.length + outcomes.length,
    'session handoff tool call reference was replayed',
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
