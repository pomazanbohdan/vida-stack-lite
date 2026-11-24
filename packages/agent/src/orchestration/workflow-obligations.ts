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

export type WorkflowStageKind = 'research' | 'synthesize' | 'develop' | 'validate' | 'test' | 'deliver';
export type WorkflowActorClass =
  | 'analyst'
  | 'source_writer'
  | 'independent_validator'
  | 'test_executor'
  | 'delivery_planner'
  | 'delivery_operator';
export type WorkflowObligationGate =
  | 'source_plan'
  | 'security_prewrite'
  | 'focused_correctness'
  | 'focused_requirements'
  | 'focused_security'
  | 'independent_test';
export interface WorkflowObligationActor {
  readonly id: string;
  readonly class: WorkflowActorClass;
  readonly model: string;
  readonly capabilities: readonly string[];
  readonly allowed_effects: readonly EffectClass[];
}
export interface WorkflowObligationAssignment {
  readonly actor: WorkflowObligationActor;
  readonly contract?: WorkflowObligationGate;
  readonly task: string;
  readonly role: string;
  readonly profile: string;
}
export interface WorkflowObligationStage {
  readonly id: string;
  readonly kind: WorkflowStageKind;
  readonly mode: 'single' | 'parallel';
  readonly assignments: readonly WorkflowObligationAssignment[];
  readonly consumes: readonly string[];
  readonly produces: readonly string[];
  readonly required_after: readonly string[];
}
export interface WorkflowObligationGraph {
  readonly obligations: WorkflowObligations;
  readonly stages: readonly WorkflowObligationStage[];
}

const STAGE_ACTOR_CLASSES: Readonly<Record<WorkflowStageKind, readonly WorkflowActorClass[]>> = Object.freeze({
  research: ['analyst'],
  synthesize: ['analyst'],
  develop: ['source_writer'],
  validate: ['independent_validator'],
  test: ['test_executor'],
  deliver: ['delivery_planner', 'delivery_operator'],
});
const GATE_ORDER: readonly WorkflowObligationGate[] = [
  'source_plan',
  'security_prewrite',
  'focused_correctness',
  'focused_requirements',
  'focused_security',
  'independent_test',
];
const PREWRITE_GATES = new Set<WorkflowObligationGate>(['source_plan', 'security_prewrite']);
const FOCUSED_GATES = new Set<WorkflowObligationGate>([
  'focused_correctness',
  'focused_requirements',
  'focused_security',
]);
const READ_ONLY_FORBIDDEN_EFFECTS: readonly EffectClass[] = [
  'source_write',
  'test_execute',
  'delivery_prepare',
  'delivery_execute',
];
const GATE_SPECS: Readonly<
  Record<
    WorkflowObligationGate,
    {
      stageKind: WorkflowStageKind;
      actorClass: WorkflowActorClass;
      capability: WorkflowObligationGate;
      requiredEffects: readonly EffectClass[];
      forbiddenEffects: readonly EffectClass[];
      consumes: readonly string[];
      produces: string;
    }
  >
> = Object.freeze({
  source_plan: {
    stageKind: 'validate',
    actorClass: 'independent_validator',
    capability: 'source_plan',
    requiredEffects: ['read'],
    forbiddenEffects: READ_ONLY_FORBIDDEN_EFFECTS,
    consumes: ['DevelopmentTaskPacket/v1'],
    produces: 'LifecyclePreparationObservation/v1',
  },
  security_prewrite: {
    stageKind: 'validate',
    actorClass: 'independent_validator',
    capability: 'security_prewrite',
    requiredEffects: ['read'],
    forbiddenEffects: READ_ONLY_FORBIDDEN_EFFECTS,
    consumes: ['DevelopmentTaskPacket/v1'],
    produces: 'LifecyclePreparationObservation/v1',
  },
  focused_correctness: {
    stageKind: 'validate',
    actorClass: 'independent_validator',
    capability: 'focused_correctness',
    requiredEffects: ['read'],
    forbiddenEffects: READ_ONLY_FORBIDDEN_EFFECTS,
    consumes: ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1'],
    produces: 'ValidationReceipt/v1',
  },
  focused_requirements: {
    stageKind: 'validate',
    actorClass: 'independent_validator',
    capability: 'focused_requirements',
    requiredEffects: ['read'],
    forbiddenEffects: READ_ONLY_FORBIDDEN_EFFECTS,
    consumes: ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1'],
    produces: 'ValidationReceipt/v1',
  },
  focused_security: {
    stageKind: 'validate',
    actorClass: 'independent_validator',
    capability: 'focused_security',
    requiredEffects: ['read'],
    forbiddenEffects: READ_ONLY_FORBIDDEN_EFFECTS,
    consumes: ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1'],
    produces: 'ValidationReceipt/v1',
  },
  independent_test: {
    stageKind: 'test',
    actorClass: 'test_executor',
    capability: 'independent_test',
    requiredEffects: ['test_execute'],
    forbiddenEffects: ['source_write', 'delivery_prepare', 'delivery_execute'],
    consumes: ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1'],
    produces: 'TestReceipt/v1',
  },
});
const GATE_CONTRACTS = new Set<WorkflowObligationGate>(GATE_ORDER);

interface GraphIndex {
  readonly stages: readonly WorkflowObligationStage[];
  readonly dependencies: ReadonlyMap<string, ReadonlySet<string>>;
  readonly dependents: ReadonlyMap<string, ReadonlySet<string>>;
}
interface GateEntry {
  readonly stage: WorkflowObligationStage;
  readonly assignment: WorkflowObligationAssignment;
}

function stageIndex(stages: readonly WorkflowObligationStage[]): ReadonlyMap<string, WorkflowObligationStage> {
  const byId = new Map<string, WorkflowObligationStage>();
  for (const stage of stages) {
    if (byId.has(stage.id)) refuse('Workflow stage ids must be unique: ' + stage.id);
    byId.set(stage.id, stage);
  }
  return byId;
}

function dependencyMaps(stages: readonly WorkflowObligationStage[]): {
  dependencies: Map<string, Set<string>>;
  dependents: Map<string, Set<string>>;
} {
  const dependencies = new Map(stages.map((stage) => [stage.id, new Set(stage.required_after)]));
  const dependents = new Map(stages.map((stage) => [stage.id, new Set<string>()]));
  for (const stage of stages) for (const dependency of stage.required_after) dependents.get(dependency)!.add(stage.id);
  return { dependencies, dependents };
}

function acyclicReady(dependencies: ReadonlyMap<string, ReadonlySet<string>>): string[] {
  return [...dependencies].filter(([, stageDependencies]) => stageDependencies.size === 0).map(([id]) => id);
}

function releaseDependents(
  id: string,
  dependents: ReadonlyMap<string, ReadonlySet<string>>,
  remaining: Map<string, number>,
  ready: string[],
): void {
  for (const dependent of dependents.get(id)!) {
    const left = remaining.get(dependent)! - 1;
    remaining.set(dependent, left);
    if (left === 0) ready.push(dependent);
  }
}

function assertAcyclic(
  dependencies: ReadonlyMap<string, ReadonlySet<string>>,
  dependents: ReadonlyMap<string, ReadonlySet<string>>,
): void {
  const remaining = new Map([...dependencies].map(([id, stageDependencies]) => [id, stageDependencies.size]));
  const ready = acyclicReady(dependencies);
  let visited = 0;
  while (ready.length > 0) {
    const id = ready.pop()!;
    visited += 1;
    releaseDependents(id, dependents, remaining, ready);
  }
  if (visited !== dependencies.size) refuse('Workflow stage dependencies contain a cycle.');
}

function buildGraphIndex(stages: readonly WorkflowObligationStage[]): GraphIndex {
  const byId = stageIndex(stages);
  for (const stage of stages)
    for (const dependency of stage.required_after)
      if (!byId.has(dependency)) refuse('Workflow stage ' + stage.id + ' depends on unknown stage ' + dependency);
  const { dependencies, dependents } = dependencyMaps(stages);
  assertAcyclic(dependencies, dependents);
  return { stages, dependencies, dependents };
}

function reachableSet(index: GraphIndex, from: string): Set<string> {
  const seen = new Set<string>([from]);
  const pending = [from];
  while (pending.length > 0) {
    const current = pending.pop()!;
    const unseen = [...index.dependents.get(current)!].filter((id) => !seen.has(id));
    for (const id of unseen) {
      seen.add(id);
      pending.push(id);
    }
  }
  return seen;
}

function reaches(index: GraphIndex, from: string, to: string): boolean {
  return reachableSet(index, from).has(to);
}

function producerStages(index: GraphIndex, artifact: string): WorkflowObligationStage[] {
  return index.stages.filter((stage) => stage.produces.includes(artifact));
}

function assertProducedArtifact(index: GraphIndex, stage: WorkflowObligationStage, artifact: string): void {
  const producers = producerStages(index, artifact);
  if (producers.length === 0) refuse('Workflow stage ' + stage.id + ' consumes ' + artifact + ' without a producer.');
  const upstream = producers.some((producer) => producer.id !== stage.id && reaches(index, producer.id, stage.id));
  if (!upstream) refuse('Workflow stage ' + stage.id + ' consumes ' + artifact + ' without an upstream producer.');
}

function assertArtifactFlow(index: GraphIndex): void {
  for (const stage of index.stages)
    for (const artifact of stage.consumes)
      if (artifact !== 'WorkItem/v1') assertProducedArtifact(index, stage, artifact);
}

function assertAssignmentClasses(index: GraphIndex): void {
  for (const stage of index.stages) {
    const allowed = STAGE_ACTOR_CLASSES[stage.kind] as readonly WorkflowActorClass[] | undefined;
    for (const assignment of stage.assignments)
      if (allowed === undefined || !allowed.includes(assignment.actor.class))
        refuse(
          'Workflow stage ' +
            stage.id +
            ' assignment uses incompatible actor class ' +
            assignment.actor.class +
            ' for ' +
            stage.kind +
            '.',
        );
  }
}

function addStageGateEntries(grouped: Map<WorkflowObligationGate, GateEntry[]>, stage: WorkflowObligationStage): void {
  for (const assignment of stage.assignments) {
    const contract = assignment.contract;
    if (contract === undefined) continue;
    if (!GATE_CONTRACTS.has(contract)) refuse('Workflow assignment has an unknown obligation contract.');
    const entries = grouped.get(contract) ?? [];
    entries.push({ stage, assignment });
    grouped.set(contract, entries);
  }
}

function groupGateEntries(index: GraphIndex): Map<WorkflowObligationGate, GateEntry[]> {
  const grouped = new Map<WorkflowObligationGate, GateEntry[]>();
  for (const stage of index.stages) addStageGateEntries(grouped, stage);
  return grouped;
}

function assertGateActorUnique(actorIds: Set<string>, actorId: string): void {
  if (actorIds.has(actorId)) refuse('Independent workflow gates cannot share an actor: ' + actorId);
  actorIds.add(actorId);
}

function assertGateContract(gate: WorkflowObligationGate, entry: GateEntry): void {
  const spec = GATE_SPECS[gate];
  const { stage, assignment } = entry;
  const actor = assignment.actor;
  if (stage.kind !== spec.stageKind)
    refuse('Workflow obligation ' + gate + ' requires a ' + spec.stageKind + ' stage.');
  if (actor.class !== spec.actorClass || !actor.capabilities.includes(spec.capability))
    refuse(
      'Workflow obligation ' +
        gate +
        ' requires actor class ' +
        spec.actorClass +
        ' and capability ' +
        spec.capability +
        '.',
    );
  for (const effect of spec.requiredEffects)
    if (!actor.allowed_effects.includes(effect))
      refuse('Workflow obligation ' + gate + ' requires effect ' + effect + '.');
  if (spec.forbiddenEffects.some((effect) => actor.allowed_effects.includes(effect)))
    refuse('Workflow obligation ' + gate + ' actor effects are not permitted.');
  if (!stage.produces.includes(spec.produces))
    refuse('Workflow obligation ' + gate + ' must produce ' + spec.produces + '.');
  for (const artifact of spec.consumes)
    if (!stage.consumes.includes(artifact)) refuse('Workflow obligation ' + gate + ' must consume ' + artifact + '.');
}

function gateEntries(index: GraphIndex): Map<WorkflowObligationGate, GateEntry> {
  const grouped = groupGateEntries(index);
  const result = new Map<WorkflowObligationGate, GateEntry>();
  const actorIds = new Set<string>();
  for (const gate of GATE_ORDER) {
    const entries = grouped.get(gate);
    if (entries !== undefined && entries.length > 1)
      refuse('Workflow obligation ' + gate + ' has more than one producer.');
    const entry = entries?.[0];
    if (entry === undefined) continue;
    assertGateContract(gate, entry);
    assertGateActorUnique(actorIds, entry.assignment.actor.id);
    result.set(gate, entry);
  }
  return result;
}

function assertContractArtifact(
  index: GraphIndex,
  artifact: string,
  accepts: (assignment: WorkflowObligationAssignment) => boolean,
  message: string,
): void {
  for (const stage of producerStages(index, artifact)) if (!stage.assignments.some(accepts)) refuse(message);
}

function assertImplementationResultProducer(index: GraphIndex): void {
  for (const stage of producerStages(index, 'ImplementationResult/v1'))
    if (stage.kind !== 'develop') refuse('ImplementationResult/v1 must be produced by a develop stage.');
}

function assertAuthoritativeOutputs(index: GraphIndex): void {
  assertImplementationResultProducer(index);
  assertContractArtifact(
    index,
    'TestReceipt/v1',
    (assignment) => assignment.contract === 'independent_test',
    'TestReceipt/v1 must be produced by the independent_test contract.',
  );
  assertContractArtifact(
    index,
    'LifecyclePreparationObservation/v1',
    (assignment) => assignment.contract === 'source_plan' || assignment.contract === 'security_prewrite',
    'LifecyclePreparationObservation/v1 must be produced by a source_plan or security_prewrite contract.',
  );
  assertContractArtifact(
    index,
    'ValidationReceipt/v1',
    (assignment) => assignment.contract !== undefined && FOCUSED_GATES.has(assignment.contract),
    'ValidationReceipt/v1 must be produced by a focused validation contract.',
  );
}

function compatibleWriterStage(stage: WorkflowObligationStage): boolean {
  if (stage.mode !== 'single' || stage.assignments.length !== 1) return false;
  const actor = stage.assignments[0]!.actor;
  return (
    actor.class === 'source_writer' &&
    actor.capabilities.includes('source_write') &&
    actor.allowed_effects.includes('source_write') &&
    !actor.allowed_effects.some(
      (effect) => effect === 'delivery_prepare' || effect === 'delivery_execute' || effect === 'test_execute',
    ) &&
    stage.consumes.includes('DevelopmentTaskPacket/v1') &&
    stage.produces.includes('ImplementationResult/v1')
  );
}

function sourceWriter(index: GraphIndex): GateEntry | undefined {
  const develops = index.stages.filter((stage) => stage.kind === 'develop');
  if (develops.length > 1) refuse('Workflow requires exactly one develop stage.');
  const stage = develops[0];
  if (stage === undefined) return undefined;
  if (!compatibleWriterStage(stage))
    refuse('Source workflow requires exactly one develop stage and one compatible Source writer.');
  return { stage, assignment: stage.assignments[0]! };
}

function sourceWritingCount(index: GraphIndex): number {
  let count = 0;
  for (const stage of index.stages)
    for (const assignment of stage.assignments)
      if (assignment.actor.allowed_effects.includes('source_write')) count += 1;
  return count;
}

function addUpstreamAuthors(
  authors: Set<string>,
  index: GraphIndex,
  stage: WorkflowObligationStage,
  targetStageId: string,
): void {
  if (!reaches(index, stage.id, targetStageId)) return;
  for (const assignment of stage.assignments) authors.add(assignment.actor.id);
}

function upstreamAuthors(index: GraphIndex, artifact: string, targetStageId: string): Set<string> {
  const authors = new Set<string>();
  for (const stage of producerStages(index, artifact)) addUpstreamAuthors(authors, index, stage, targetStageId);
  return authors;
}

function sourceAuthors(index: GraphIndex, writerStageId: string, writerActorId: string): Set<string> {
  const packetAuthors = upstreamAuthors(index, 'DevelopmentTaskPacket/v1', writerStageId);
  const planAuthors = upstreamAuthors(index, 'TestPlan/v1', writerStageId);
  if (planAuthors.size === 0) refuse('Source workflow requires a TestPlan/v1 plan author upstream of the writer.');
  const authors = new Set([...packetAuthors, ...planAuthors]);
  if (authors.has(writerActorId)) refuse('Source writer cannot be a packet or plan author.');
  return authors;
}

function requiredGates(obligations: WorkflowObligations): Set<WorkflowObligationGate> {
  const required = new Set<WorkflowObligationGate>([
    'source_plan',
    'focused_correctness',
    'focused_requirements',
    'independent_test',
  ]);
  if (obligations.security_prewrite) required.add('security_prewrite');
  if (obligations.focused_security) required.add('focused_security');
  return required;
}

function assertRequiredGates(
  gates: ReadonlyMap<WorkflowObligationGate, GateEntry>,
  required: ReadonlySet<WorkflowObligationGate>,
): void {
  for (const gate of required) if (!gates.has(gate)) refuse('Workflow obligation ' + gate + ' is missing.');
}

function assertPrewriteGate(
  index: GraphIndex,
  gate: WorkflowObligationGate,
  entry: GateEntry,
  writer: GateEntry,
  authors: ReadonlySet<string>,
): void {
  if (!reaches(index, entry.stage.id, writer.stage.id))
    refuse('Workflow obligation ' + gate + ' must be upstream of the Source writer.');
  const actorId = entry.assignment.actor.id;
  if (authors.has(actorId) || actorId === writer.assignment.actor.id)
    refuse('Workflow obligation ' + gate + ' actor must be independent of authors and the Source writer.');
}

function assertPostwriteGate(
  gate: WorkflowObligationGate,
  entry: GateEntry,
  writer: GateEntry,
  authors: ReadonlySet<string>,
): void {
  const actorId = entry.assignment.actor.id;
  if (actorId === writer.assignment.actor.id)
    refuse('Workflow obligation ' + gate + ' actor must be independent of the Source writer.');
  if (gate === 'independent_test' && authors.has(actorId))
    refuse('Workflow obligation independent_test actor must be independent of the packet and plan authors.');
}

function validateGateOrder(
  index: GraphIndex,
  gates: ReadonlyMap<WorkflowObligationGate, GateEntry>,
  writer: GateEntry,
  authors: ReadonlySet<string>,
): void {
  for (const [gate, entry] of gates)
    if (PREWRITE_GATES.has(gate)) assertPrewriteGate(index, gate, entry, writer, authors);
    else assertPostwriteGate(gate, entry, writer, authors);
}

function validateSourceObligations(
  index: GraphIndex,
  obligations: WorkflowObligations,
  gates: ReadonlyMap<WorkflowObligationGate, GateEntry>,
): void {
  const writer = sourceWriter(index);
  const count = sourceWritingCount(index);
  if (!obligations.source_effect) {
    if (writer !== undefined || count !== 0)
      refuse('Workflow obligations source_effect does not match the actual Source writer.');
    return;
  }
  if (writer === undefined)
    refuse('Source workflow requires exactly one develop stage and one compatible Source writer.');
  if (count !== 1) refuse('Source workflow requires exactly one source-writing assignment.');
  const authors = sourceAuthors(index, writer.stage.id, writer.assignment.actor.id);
  assertRequiredGates(gates, requiredGates(obligations));
  validateGateOrder(index, gates, writer, authors);
}

export function validateWorkflowObligations(input: WorkflowObligationGraph): void {
  const index = buildGraphIndex(input.stages);
  assertAssignmentClasses(index);
  assertArtifactFlow(index);
  const gates = gateEntries(index);
  assertAuthoritativeOutputs(index);
  validateSourceObligations(index, input.obligations, gates);
}
