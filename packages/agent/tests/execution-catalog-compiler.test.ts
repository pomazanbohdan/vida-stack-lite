import { expect, test } from 'bun:test';
import {
  deriveWorkflowObligations,
  validateWorkflowObligations,
  type WorkflowActorClass,
  type WorkflowObligationActor,
  type WorkflowObligationAssignment,
  type WorkflowObligationGate,
  type WorkflowObligationStage,
  type WorkflowStageKind,
} from '../src/orchestration/workflow-obligations.ts';
import { validateTestPlan, type TestPlanBinding } from '../src/orchestration/test-plan.ts';

const binding: TestPlanBinding = {
  work_id: 'work-17',
  attempt: 2,
  packet_id: 'packet-17',
  task_contract_digest: 'a'.repeat(64),
  admitted_scenarios: [
    'catalog-t01-bind-testplan-digest-and-packet-ref-without-cycle',
    'catalog-t01-refuse-high-risk-security',
  ],
};
const validPlan = () => ({
  schema: 'TestPlan/v1',
  version: 1,
  work_id: binding.work_id,
  attempt: binding.attempt,
  packet_id: binding.packet_id,
  task_contract_digest: binding.task_contract_digest,
  scenarios: [{ id: binding.admitted_scenarios[0], description: 'Bind the pre-code contract.' }],
});

test('catalog-t01-bind-testplan-digest-and-packet-ref-without-cycle', () => {
  const plan = validateTestPlan(validPlan(), binding);
  const packet = {
    packet_id: binding.packet_id,
    test_plan_ref: {
      work_id: plan.work_id,
      attempt: plan.attempt,
      packet_id: plan.packet_id,
      task_contract_digest: plan.task_contract_digest,
    },
  };
  expect(packet.test_plan_ref).toEqual({
    work_id: plan.work_id,
    attempt: plan.attempt,
    packet_id: plan.packet_id,
    task_contract_digest: plan.task_contract_digest,
  });
  expect(plan.task_contract_digest).toBe('a'.repeat(64));
  expect(Object.isFrozen(plan)).toBe(true);
  for (const field of ['work_id', 'attempt', 'packet_id', 'task_contract_digest'] as const) {
    const changed = validPlan();
    if (field === 'attempt') changed.attempt += 1;
    else changed[field] = field === 'task_contract_digest' ? 'b'.repeat(64) : 'other';
    expect(() => validateTestPlan(changed, binding)).toThrow(/binding/);
  }
  const unknown = validPlan();
  unknown.scenarios.push({ id: 'not-admitted', description: 'Not in the admitted set.' });
  expect(() => validateTestPlan(unknown, binding)).toThrow(/scenario/);
  const duplicate = validPlan();
  duplicate.scenarios.push({ id: binding.admitted_scenarios[0], description: 'Duplicate admitted scenario.' });
  expect(() => validateTestPlan(duplicate, binding)).toThrow(/scenario/);
  const cycle = { ...validPlan(), implementation_fingerprint: 'f'.repeat(64) };
  expect(() => validateTestPlan(cycle, binding)).toThrow();
});

test('catalog-t01-refuse-high-risk-security', () => {
  const obligations = deriveWorkflowObligations({ risk: 'high', effects: ['source_write'], completion: 'source_only' });
  expect(obligations).toMatchObject({
    source_effect: true,
    source_plan_required: true,
    security_prewrite: true,
    focused_security: true,
  });
  expect(() =>
    deriveWorkflowObligations({
      risk: 'high',
      effects: ['source_write'],
      completion: 'source_only',
      configured: { security_prewrite: false },
    } as never),
  ).toThrow();
});

test('catalog-t01-refuse-high-risk-test', () => {
  const obligations = deriveWorkflowObligations({ risk: 'high', effects: ['test_execute'], completion: 'artifact' });
  expect(obligations.independent_tester).toBe(true);
  expect(obligations.independent_review).toBe(true);
  expect(obligations.delivery_prepare).toBe(true);
});

test('catalog-t01-refuse-high-risk-review', () => {
  const obligations = deriveWorkflowObligations({ risk: 'high', effects: ['read'], completion: 'deployment' });
  expect(obligations.security_prewrite).toBe(true);
  expect(obligations.independent_review).toBe(true);
  expect(obligations.deployment_verification).toBe(true);
  expect(obligations.completion).toBe('deployment');
});

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T;
type ObligationActor = Mutable<WorkflowObligationActor>;
type ObligationAssignment = Mutable<WorkflowObligationAssignment>;
type ObligationStage = Mutable<WorkflowObligationStage>;
type ObligationGraph = { obligations: ReturnType<typeof deriveWorkflowObligations>; stages: ObligationStage[] };

const obligationActor = (
  id: string,
  actorClass: WorkflowActorClass,
  capabilities: ObligationActor['capabilities'],
  allowedEffects: ObligationActor['allowed_effects'],
  model = 'same-model',
): ObligationActor => ({ id, class: actorClass, model, capabilities, allowed_effects: allowedEffects });
const plainAssignment = (actor: ObligationActor, suffix: string): ObligationAssignment => ({
  actor,
  task: `task/${suffix}`,
  role: `role/${suffix}`,
  profile: `profile/${suffix}`,
});
const gateAssignment = (
  contract: WorkflowObligationGate,
  actor: ObligationActor,
  suffix: string,
): ObligationAssignment => ({
  ...plainAssignment(actor, suffix),
  contract,
});
const obligationStage = (
  id: string,
  kind: WorkflowStageKind,
  assignments: ObligationAssignment[],
  produces: string[],
  consumes: string[],
  requiredAfter: string[] = [],
  mode: WorkflowObligationStage['mode'] = kind === 'develop' ? 'single' : 'parallel',
): ObligationStage => ({ id, kind, mode, assignments, consumes, produces, required_after: requiredAfter });

function obligationGraph(risk: 'low' | 'high' = 'low'): ObligationGraph {
  const obligations = deriveWorkflowObligations({
    risk,
    effects: ['read', 'source_write', 'test_execute'],
    completion: 'artifact',
  });
  const high = risk === 'high';
  return {
    obligations,
    stages: [
      obligationStage(
        'research',
        'research',
        [plainAssignment(obligationActor('research-author', 'analyst', ['research'], ['read']), 'research')],
        ['ResearchResult/v1'],
        ['WorkItem/v1'],
      ),
      obligationStage(
        'test_design',
        'research',
        [plainAssignment(obligationActor('plan-author', 'analyst', ['test_plan'], ['read']), 'test-design')],
        ['TestPlan/v1'],
        ['ResearchResult/v1'],
        ['research'],
        'single',
      ),
      obligationStage(
        'seal_packet',
        'synthesize',
        [plainAssignment(obligationActor('packet-author', 'analyst', ['packet'], ['read']), 'packet')],
        ['DevelopmentTaskPacket/v1'],
        ['ResearchResult/v1', 'TestPlan/v1'],
        ['test_design'],
        'single',
      ),
      obligationStage(
        'prewrite',
        'validate',
        [
          gateAssignment(
            'source_plan',
            obligationActor('source-planner', 'independent_validator', ['source_plan'], ['read']),
            'source-plan',
          ),
          ...(high
            ? [
                gateAssignment(
                  'security_prewrite',
                  obligationActor('security-prewriter', 'independent_validator', ['security_prewrite'], ['read']),
                  'security-prewrite',
                ),
              ]
            : []),
        ],
        ['LifecyclePreparationObservation/v1'],
        ['DevelopmentTaskPacket/v1'],
        ['seal_packet'],
      ),
      obligationStage(
        'implement',
        'develop',
        [
          plainAssignment(
            obligationActor('writer', 'source_writer', ['source_write'], ['read', 'source_write']),
            'writer',
          ),
        ],
        ['ImplementationResult/v1'],
        ['DevelopmentTaskPacket/v1'],
        ['prewrite'],
      ),
      obligationStage(
        'focused',
        'validate',
        [
          gateAssignment(
            'focused_correctness',
            obligationActor('correctness', 'independent_validator', ['focused_correctness'], ['read']),
            'correctness',
          ),
          gateAssignment(
            'focused_requirements',
            obligationActor('requirements', 'independent_validator', ['focused_requirements'], ['read']),
            'requirements',
          ),
          ...(high
            ? [
                gateAssignment(
                  'focused_security',
                  obligationActor('security-post', 'independent_validator', ['focused_security'], ['read']),
                  'security-post',
                ),
              ]
            : []),
        ],
        ['ValidationReceipt/v1'],
        ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1'],
        ['implement'],
      ),
      obligationStage(
        'independent_test',
        'test',
        [
          gateAssignment(
            'independent_test',
            obligationActor('tester', 'test_executor', ['independent_test'], ['read', 'test_execute']),
            'tester',
          ),
        ],
        ['TestReceipt/v1'],
        ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1', 'ValidationReceipt/v1'],
        ['focused'],
        'single',
      ),
      obligationStage(
        'prepare_delivery',
        'deliver',
        [
          plainAssignment(
            obligationActor('delivery', 'delivery_planner', ['delivery_prepare'], ['read', 'delivery_prepare']),
            'delivery',
          ),
        ],
        ['DeliveryInstruction/v1'],
        ['DevelopmentTaskPacket/v1', 'ImplementationResult/v1', 'ValidationReceipt/v1', 'TestReceipt/v1'],
        ['independent_test'],
        'single',
      ),
    ],
  };
}

function stageById(graph: ObligationGraph, id: string): ObligationStage {
  const stage = graph.stages.find((candidate) => candidate.id === id);
  if (!stage) throw new Error('missing fixture stage ' + id);
  return stage;
}
function assignmentByContract(graph: ObligationGraph, contract: string): ObligationAssignment {
  for (const stage of graph.stages)
    for (const assignment of stage.assignments) if (assignment.contract === contract) return assignment;
  throw new Error('missing fixture assignment ' + contract);
}
function renameObligationGraph(graph: ObligationGraph): ObligationGraph {
  const stageIds = new Map(graph.stages.map((stage, index) => [stage.id, `renamed-stage-${index}`]));
  const actorIds = new Map<string, string>();
  for (const stage of graph.stages)
    for (const assignment of stage.assignments)
      if (!actorIds.has(assignment.actor.id)) actorIds.set(assignment.actor.id, `renamed-actor-${actorIds.size}`);
  return {
    obligations: graph.obligations,
    stages: graph.stages.map((stage) => ({
      ...stage,
      id: stageIds.get(stage.id)!,
      required_after: stage.required_after.map((id) => stageIds.get(id)!),
      assignments: stage.assignments.map((assignment) => ({
        ...assignment,
        task: `${assignment.task}-renamed`,
        role: `${assignment.role}-renamed`,
        profile: `${assignment.profile}-renamed`,
        actor: { ...assignment.actor, id: actorIds.get(assignment.actor.id)! },
      })),
    })),
  };
}

function validateObligations(graph: ObligationGraph): void {
  validateWorkflowObligations(graph);
}

test('catalog-t01-validate-structural-obligations-after-id-renaming', () => {
  for (const risk of ['low', 'high'] as const) {
    const graph = obligationGraph(risk);
    const actors = graph.stages.flatMap((stage) => stage.assignments.map((assignment) => assignment.actor));
    expect(new Set(actors.map((actor) => actor.model)).size).toBe(1);
    expect(new Set(actors.map((actor) => actor.id)).size).toBe(actors.length);
    expect(() => validateObligations(graph)).not.toThrow();
  }
  expect(() => validateObligations(renameObligationGraph(obligationGraph('high')))).not.toThrow();
});

test('catalog-t01-refuse-missing-source-plan-and-develop-cardinality', () => {
  const missingPlan = obligationGraph('low');
  stageById(missingPlan, 'prewrite').assignments = [
    plainAssignment(obligationActor('prewrite-other', 'independent_validator', ['other'], ['read']), 'prewrite-other'),
  ];
  expect(() => validateObligations(missingPlan)).toThrow(/source_plan/);

  const missingTester = obligationGraph('low');
  stageById(missingTester, 'independent_test').assignments = [
    plainAssignment(
      obligationActor('tester-other', 'test_executor', ['other'], ['read', 'test_execute']),
      'tester-other',
    ),
  ];
  expect(() => validateObligations(missingTester)).toThrow(/independent_test/);

  const duplicateCorrectness = obligationGraph('low');
  stageById(duplicateCorrectness, 'focused').assignments.push(
    gateAssignment(
      'focused_correctness',
      obligationActor('correctness-two', 'independent_validator', ['focused_correctness'], ['read']),
      'correctness-two',
    ),
  );
  expect(() => validateObligations(duplicateCorrectness)).toThrow(/focused_correctness/);

  const twoDevelops = obligationGraph('low');
  twoDevelops.stages.push(
    obligationStage(
      'second_develop',
      'develop',
      [
        plainAssignment(
          obligationActor('writer-two', 'source_writer', ['source_write'], ['read', 'source_write']),
          'writer-two',
        ),
      ],
      ['ImplementationResult/v1'],
      ['DevelopmentTaskPacket/v1'],
      ['prewrite'],
    ),
  );
  expect(() => validateObligations(twoDevelops)).toThrow(/develop/);

  const twoWriters = obligationGraph('low');
  stageById(twoWriters, 'implement').assignments.push(
    plainAssignment(
      obligationActor('writer-two', 'source_writer', ['source_write'], ['read', 'source_write']),
      'writer-two',
    ),
  );
  expect(() => validateObligations(twoWriters)).toThrow(/writer/);
});

test('catalog-t01-refuse-reversed-wrong-contract-class-effect-gates', () => {
  const reversed = obligationGraph('low');
  stageById(reversed, 'prewrite').required_after = ['implement'];
  stageById(reversed, 'implement').required_after = ['seal_packet'];
  expect(() => validateObligations(reversed)).toThrow(/source_plan|dominat|upstream/);

  const bypass = obligationGraph('low');
  stageById(bypass, 'implement').required_after = ['seal_packet'];
  expect(() => validateObligations(bypass)).toThrow(/dominat|prewrite|source_plan|upstream/);

  const wrongOutput = obligationGraph('low');
  stageById(wrongOutput, 'prewrite').produces = ['WrongPreparation/v1'];
  expect(() => validateObligations(wrongOutput)).toThrow(/LifecyclePreparationObservation|produces/);

  const wrongClass = obligationGraph('low');
  assignmentByContract(wrongClass, 'source_plan').actor.class = 'analyst';
  expect(() => validateObligations(wrongClass)).toThrow(/class|independent_validator/);

  const wrongEffect = obligationGraph('low');
  assignmentByContract(wrongEffect, 'source_plan').actor.allowed_effects = ['source_write'];
  expect(() => validateObligations(wrongEffect)).toThrow(/effect|read/);

  const missingPlanAuthor = obligationGraph('low');
  stageById(missingPlanAuthor, 'test_design').produces = ['ResearchSynthesis/v1'];
  stageById(missingPlanAuthor, 'seal_packet').consumes = ['ResearchResult/v1'];
  expect(() => validateObligations(missingPlanAuthor)).toThrow(/TestPlan|plan author/);
});

test('catalog-t01-refuse-author-writer-and-independent-gate-substitutions', () => {
  const writerIsAuthor = obligationGraph('low');
  stageById(writerIsAuthor, 'implement').assignments[0]!.actor.id = stageById(
    writerIsAuthor,
    'seal_packet',
  ).assignments[0]!.actor.id;
  expect(() => validateObligations(writerIsAuthor)).toThrow(/author|writer/);

  const plannerIsAuthor = obligationGraph('low');
  assignmentByContract(plannerIsAuthor, 'source_plan').actor.id = 'plan-author';
  expect(() => validateObligations(plannerIsAuthor)).toThrow(/source_plan|independent|author/);

  const selfReview = obligationGraph('low');
  assignmentByContract(selfReview, 'focused_correctness').actor.id = 'writer';
  expect(() => validateObligations(selfReview)).toThrow(/independent|self|actor/);

  const testerIsValidator = obligationGraph('low');
  assignmentByContract(testerIsValidator, 'independent_test').actor.id = 'requirements';
  expect(() => validateObligations(testerIsValidator)).toThrow(/independent|tester|actor/);

  const high = obligationGraph('high');
  assignmentByContract(high, 'security_prewrite').actor.id = 'source-planner';
  expect(() => validateObligations(high)).toThrow(/security_prewrite|independent|actor/);
  assignmentByContract(high, 'focused_security').actor.id = 'requirements';
  expect(() => validateObligations(high)).toThrow(/focused_security|independent|actor/);
});

test('catalog-t01-refuse-source-effect-flag-and-writer-mismatch', () => {
  const unflaggedWriter = obligationGraph('low');
  unflaggedWriter.obligations = deriveWorkflowObligations({
    risk: 'low',
    effects: ['read', 'test_execute'],
    completion: 'artifact',
  });
  expect(() => validateObligations(unflaggedWriter)).toThrow(/source_effect|Source writer|source-writing/);

  const missingWriter = obligationGraph('low');
  stageById(missingWriter, 'implement').assignments[0]!.actor.allowed_effects = ['read'];
  expect(() => validateObligations(missingWriter)).toThrow(/Source writer|source_write|compatible/);

  const incompatibleWriter = obligationGraph('low');
  stageById(incompatibleWriter, 'implement').assignments[0]!.actor.allowed_effects = [
    'read',
    'source_write',
    'delivery_prepare',
  ];
  expect(() => validateObligations(incompatibleWriter)).toThrow(/Source writer|source_write|delivery/);
});

test('catalog-t01-refuse-test-execute-on-source-writer', () => {
  const writerExecutesTests = obligationGraph('low');
  stageById(writerExecutesTests, 'implement').assignments[0]!.actor.allowed_effects = [
    'read',
    'source_write',
    'test_execute',
  ];
  expect(() => validateObligations(writerExecutesTests)).toThrow(/Source writer|source_write|test_execute|compatible/);
});

test('catalog-t01-refuse-source-write-on-incompatible-assignment', () => {
  const strayWriter = obligationGraph('low');
  stageById(strayWriter, 'seal_packet').assignments[0]!.actor.allowed_effects = ['read', 'source_write'];
  expect(() => validateObligations(strayWriter)).toThrow(/source_write|writer|assignment/);
});

test('catalog-t01-accept-required-after-conjunctive-join', () => {
  const graph = obligationGraph('low');
  graph.stages.push(
    obligationStage(
      'context',
      'research',
      [plainAssignment(obligationActor('context-author', 'analyst', ['context'], ['read']), 'context')],
      ['Context/v1'],
      ['ResearchResult/v1'],
      ['research'],
      'single',
    ),
  );
  const implement = stageById(graph, 'implement');
  implement.consumes = ['DevelopmentTaskPacket/v1', 'Context/v1'];
  implement.required_after = ['prewrite', 'context'];
  expect(() => validateObligations(graph)).not.toThrow();
});

test('catalog-t01-refuse-duplicate-source-plan-and-gate-substitutions', () => {
  const duplicatePlan = obligationGraph('low');
  stageById(duplicatePlan, 'prewrite').assignments.push(
    gateAssignment(
      'source_plan',
      obligationActor('source-planner-two', 'independent_validator', ['source_plan'], ['read']),
      'source-plan-two',
    ),
  );
  expect(() => validateObligations(duplicatePlan)).toThrow(/source_plan/);

  const wrongContract = obligationGraph('low');
  assignmentByContract(wrongContract, 'focused_correctness').contract = 'focused_security';
  expect(() => validateObligations(wrongContract)).toThrow(/focused_security|capability|focused_correctness/);

  const missingCorrectness = obligationGraph('low');
  stageById(missingCorrectness, 'focused').assignments = stageById(missingCorrectness, 'focused').assignments.filter(
    (assignment) => assignment.contract !== 'focused_correctness',
  );
  expect(() => validateObligations(missingCorrectness)).toThrow(/focused_correctness/);
});

test('catalog-t01-refuse-missing-high-risk-security-gates', () => {
  const missingPrewrite = obligationGraph('high');
  stageById(missingPrewrite, 'prewrite').assignments = stageById(missingPrewrite, 'prewrite').assignments.filter(
    (assignment) => assignment.contract !== 'security_prewrite',
  );
  expect(() => validateObligations(missingPrewrite)).toThrow(/security_prewrite/);

  const missingFocused = obligationGraph('high');
  stageById(missingFocused, 'focused').assignments = stageById(missingFocused, 'focused').assignments.filter(
    (assignment) => assignment.contract !== 'focused_security',
  );
  expect(() => validateObligations(missingFocused)).toThrow(/focused_security/);
});

test('catalog-t01-refuse-unknown-obligation-inputs', () => {
  expect(() =>
    deriveWorkflowObligations({ risk: 'critical', effects: ['read'], completion: 'source_only' } as never),
  ).toThrow(/lifecycle risk|risk/);
  expect(() =>
    deriveWorkflowObligations({ risk: 'low', effects: ['bogus'], completion: 'source_only' } as never),
  ).toThrow(/effect/);
  expect(() => deriveWorkflowObligations({ risk: 'low', effects: ['read'], completion: 'bogus' } as never)).toThrow(
    /completion/,
  );
});

test('catalog-t01-derive-delivery-prepare-from-effects', () => {
  for (const effect of ['delivery_prepare', 'delivery_execute'] as const) {
    const obligations = deriveWorkflowObligations({ risk: 'low', effects: [effect], completion: 'source_only' });
    expect(obligations.delivery_prepare).toBe(true);
    expect(obligations.source_effect).toBe(false);
  }
});

test('catalog-t01-refuse-duplicate-cycle-unknown-dependency', () => {
  const duplicate = obligationGraph('low');
  duplicate.stages.push(
    obligationStage(
      'research',
      'synthesize',
      [plainAssignment(obligationActor('dup-author', 'analyst', ['dup'], ['read']), 'dup')],
      [],
      [],
    ),
  );
  expect(() => validateObligations(duplicate)).toThrow(/unique/);

  const cyclic = obligationGraph('low');
  stageById(cyclic, 'test_design').required_after = ['seal_packet'];
  stageById(cyclic, 'seal_packet').required_after = ['test_design'];
  expect(() => validateObligations(cyclic)).toThrow(/cycle/);

  const dangling = obligationGraph('low');
  stageById(dangling, 'seal_packet').required_after = ['test_design', 'ghost-stage'];
  expect(() => validateObligations(dangling)).toThrow(/unknown stage/);
});

test('catalog-t01-refuse-missing-research-result-producer', () => {
  const missingResearch = obligationGraph('low');
  stageById(missingResearch, 'research').produces = [];
  expect(() => validateObligations(missingResearch)).toThrow(/without a producer/);
});

test('catalog-t01-refuse-missing-upstream-implementation', () => {
  const detachedFocused = obligationGraph('low');
  stageById(detachedFocused, 'focused').required_after = ['prewrite'];
  expect(() => validateObligations(detachedFocused)).toThrow(/upstream producer|ImplementationResult/);
});

test('catalog-t01-refuse-unknown-contract-and-wrong-stage-kind', () => {
  const unknownContract = obligationGraph('low');
  stageById(unknownContract, 'seal_packet').assignments[0]!.contract = 'mystery_gate' as never;
  expect(() => validateObligations(unknownContract)).toThrow(/unknown obligation contract/);

  const wrongKind = obligationGraph('low');
  stageById(wrongKind, 'prewrite').kind = 'research';
  assignmentByContract(wrongKind, 'source_plan').actor.class = 'analyst';
  expect(() => validateObligations(wrongKind)).toThrow(/requires a validate stage/);
});

test('catalog-t01-refuse-gate-forbidden-effect-and-missing-consumption', () => {
  const forbiddenEffect = obligationGraph('low');
  assignmentByContract(forbiddenEffect, 'focused_correctness').actor.allowed_effects = ['read', 'delivery_execute'];
  expect(() => validateObligations(forbiddenEffect)).toThrow(/not permitted|effects/);

  const missingConsumption = obligationGraph('low');
  stageById(missingConsumption, 'focused').consumes = ['DevelopmentTaskPacket/v1'];
  expect(() => validateObligations(missingConsumption)).toThrow(/must consume/);
});

test('catalog-t01-refuse-non-develop-implementation-producer', () => {
  const strayProducer = obligationGraph('low');
  stageById(strayProducer, 'research').produces = ['ResearchResult/v1', 'ImplementationResult/v1'];
  expect(() => validateObligations(strayProducer)).toThrow(/must be produced by a develop stage/);
});

function readOnlyPrefixGraph(): ObligationGraph {
  return {
    obligations: deriveWorkflowObligations({ risk: 'low', effects: ['read'], completion: 'source_only' }),
    stages: [
      obligationStage(
        'research',
        'research',
        [plainAssignment(obligationActor('research-author', 'analyst', ['research'], ['read']), 'research')],
        ['ResearchResult/v1'],
        ['WorkItem/v1'],
      ),
      obligationStage(
        'test_design',
        'research',
        [plainAssignment(obligationActor('plan-author', 'analyst', ['test_plan'], ['read']), 'test-design')],
        ['TestPlan/v1'],
        ['ResearchResult/v1'],
        ['research'],
        'single',
      ),
      obligationStage(
        'seal_packet',
        'synthesize',
        [plainAssignment(obligationActor('packet-author', 'analyst', ['packet'], ['read']), 'packet')],
        ['DevelopmentTaskPacket/v1'],
        ['ResearchResult/v1', 'TestPlan/v1'],
        ['test_design'],
        'single',
      ),
    ],
  };
}

test('catalog-t01-read-only-prefix-and-source-effect-mismatch', () => {
  expect(() => validateObligations(readOnlyPrefixGraph())).not.toThrow();

  const required = readOnlyPrefixGraph();
  required.obligations = deriveWorkflowObligations({
    risk: 'low',
    effects: ['read', 'source_write'],
    completion: 'source_only',
  });
  expect(() => validateObligations(required)).toThrow(/develop|Source writer/);

  const unflaggedWriter = readOnlyPrefixGraph();
  unflaggedWriter.stages.push(
    obligationStage(
      'implement',
      'develop',
      [
        plainAssignment(
          obligationActor('writer', 'source_writer', ['source_write'], ['read', 'source_write']),
          'writer',
        ),
      ],
      ['ImplementationResult/v1'],
      ['DevelopmentTaskPacket/v1'],
      ['seal_packet'],
    ),
  );
  expect(() => validateObligations(unflaggedWriter)).toThrow(/source_effect|Source writer/);

  const strayEffect = readOnlyPrefixGraph();
  stageById(strayEffect, 'seal_packet').assignments.push(
    plainAssignment(obligationActor('stray-writer', 'analyst', ['stray'], ['read', 'source_write']), 'stray'),
  );
  expect(() => validateObligations(strayEffect)).toThrow(/source_effect|Source writer/);
});

test('catalog-t01-accept-disconnected-extra-plan-producer', () => {
  const graph = obligationGraph('low');
  graph.stages.push(
    obligationStage(
      'extra_plan',
      'research',
      [plainAssignment(obligationActor('tester', 'analyst', ['test_plan'], ['read']), 'extra-plan')],
      ['TestPlan/v1'],
      [],
    ),
  );
  expect(() => validateObligations(graph)).not.toThrow();
});

test('catalog-t01-refuse-independent-test-plan-author', () => {
  const testerIsAuthor = obligationGraph('low');
  assignmentByContract(testerIsAuthor, 'independent_test').actor.id = 'plan-author';
  expect(() => validateObligations(testerIsAuthor)).toThrow(/packet and plan authors/);
});
