import { isPlainRecord } from '../contracts/canonical-json-core.js';
import { RuntimeConfigError } from '../config/runtime-config.js';
import type { CompletionProfile, EffectClass } from '../config/execution-catalog.js';
import type { WorkflowLifecycleRisk } from './workflow-plan.js';

export interface WorkflowObligations {
  readonly source_effect: boolean;
  readonly source_plan_required: boolean;
  readonly security_prewrite: boolean;
  readonly focused_security: boolean;
  readonly independent_tester: boolean;
  readonly independent_review: boolean;
  readonly delivery_prepare: boolean;
  readonly deployment_verification: boolean;
  readonly completion: CompletionProfile;
}
interface ObligationSet {
  source_effect: boolean;
  source_plan_required: boolean;
  security_prewrite: boolean;
  focused_security: boolean;
  independent_tester: boolean;
  independent_review: boolean;
  delivery_prepare: boolean;
  deployment_verification: boolean;
}
const EFFECTS = new Set<EffectClass>(['read', 'source_write', 'test_execute', 'delivery_prepare', 'delivery_execute']);
const COMPLETIONS = new Set<CompletionProfile>(['source_only', 'artifact', 'deployment']);
const RISKS = new Set<WorkflowLifecycleRisk>(['low', 'medium', 'high']);

function refuse(message: string): never {
  throw new RuntimeConfigError(message);
}

function emptyObligations(): ObligationSet {
  return {
    source_effect: false,
    source_plan_required: false,
    security_prewrite: false,
    focused_security: false,
    independent_tester: false,
    independent_review: false,
    delivery_prepare: false,
    deployment_verification: false,
  };
}

function obligationsForRisk(risk: WorkflowLifecycleRisk): ObligationSet {
  if (!RISKS.has(risk)) refuse('Unknown workflow lifecycle risk.');
  const high = risk === 'high';
  return {
    ...emptyObligations(),
    security_prewrite: high,
    focused_security: high,
    independent_tester: high,
    independent_review: high,
  };
}

function obligationsForEffects(effects: readonly EffectClass[]): ObligationSet {
  const result = emptyObligations();
  for (const effect of effects) {
    if (!EFFECTS.has(effect)) refuse('Unknown workflow effect class.');
    if (effect === 'source_write') {
      result.source_effect = true;
      result.source_plan_required = true;
    }
    if (effect === 'test_execute') result.independent_tester = true;
    if (effect === 'delivery_prepare' || effect === 'delivery_execute') result.delivery_prepare = true;
  }
  return result;
}

function completionObligations(completion: CompletionProfile): ObligationSet {
  if (!COMPLETIONS.has(completion)) refuse('Unknown completion profile.');
  const result = emptyObligations();
  result.deployment_verification = completion === 'deployment';
  result.delivery_prepare = completion !== 'source_only';
  return result;
}

function mergeObligationSets(...sets: readonly ObligationSet[]): ObligationSet {
  const merged = emptyObligations();
  for (const set of sets) for (const key of Object.keys(merged) as (keyof ObligationSet)[]) merged[key] ||= set[key];
  return merged;
}

/** Derive mandatory lifecycle checks only from trusted risk, effects and completion. */
export function deriveWorkflowObligations(input: {
  risk: WorkflowLifecycleRisk;
  effects: readonly EffectClass[];
  completion: CompletionProfile;
}): WorkflowObligations {
  if (!isPlainRecord(input) || Object.keys(input).length !== 3 || !Array.isArray(input.effects))
    refuse('Workflow obligation input must contain exactly risk, effects and completion.');
  const risks = obligationsForRisk(input.risk);
  const effects = obligationsForEffects(input.effects);
  const completion = completionObligations(input.completion);
  const combined = mergeObligationSets(risks, effects, completion);
  return Object.freeze({ ...combined, completion: input.completion });
}
