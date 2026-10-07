import {
  assertLoadedRuntimeConfig,
  type AgentRuntimeConfig,
  type WorkflowDefinition,
  type WorkflowStage,
} from '../config/runtime-config.js';

const sourceWritingWorkflowIds = new Set(['implementation_new', 'implementation_change', 'bug_fix', 'task_execution']);
const sourcePrewriterId = 'review_source_prewrite';
const sourcePrewriterRiskFlags = ['security', 'data_loss', 'migration', 'high'] as const;

export type WorkflowLifecycleRisk = 'low' | 'medium' | 'high';

/** Add lifecycle high risk only to the private inputs used to compile configured assignments. */
export function effectiveWorkflowRiskFlags(
  riskFlags: readonly string[] | undefined,
  lifecycleRisk?: WorkflowLifecycleRisk,
): readonly string[] {
  const flags = riskFlags ?? [];
  return lifecycleRisk === 'high' && !flags.includes('high') ? [...flags, 'high'] : flags;
}

export interface CompiledDevelopmentWorkflow {
  readonly schema: 'CompiledDevelopmentWorkflow/v1';
  readonly team_id: string;
  readonly workflow_id: string;
  readonly assurance_profile: WorkflowDefinition['assurance_profile'];
  readonly waves: readonly (readonly WorkflowStage[])[];
  readonly terminal_stages: readonly string[];
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function workflowWaves(workflow: WorkflowDefinition): readonly (readonly WorkflowStage[])[] {
  const completed = new Set<string>();
  const waves: WorkflowStage[][] = [];
  for (const _stage of workflow.stages) {
    if (completed.size === workflow.stages.length) break;
    const ready = workflow.stages.filter(
      (stage) => !completed.has(stage.id) && stage.required_after.every((id) => completed.has(id)),
    );
    waves.push(ready);
    ready.forEach((stage) => completed.add(stage.id));
  }
  return waves.map((wave) => Object.freeze([...wave]));
}

function configuredProfileMatches(
  team: NonNullable<AgentRuntimeConfig['teams'][string]>,
  teamId: string,
  workflowId: string,
  stage: WorkflowStage,
  assignment: WorkflowStage['assignments'][number],
): void {
  const configuredProfile = team.stage_overrides[stage.id] ?? team.roles[assignment.role];
  assert(
    configuredProfile === assignment.profile,
    'team ' + teamId + ' role/profile does not match workflow ' + workflowId + '/' + stage.id,
  );
}

function assignmentMatchesRisk(
  assignment: { readonly risk_flags?: readonly string[] },
  riskFlags?: readonly string[],
): boolean {
  const assignmentRisks = assignment.risk_flags;
  const actions: readonly (() => boolean)[] = [
    () => true,
    () => assignmentRisks!.some((risk) => riskFlags?.includes(risk) === true),
  ];
  return actions[Number(Boolean(assignmentRisks))]!();
}

function configuredReadOnlySourcePrewriter(
  config: AgentRuntimeConfig,
  team: NonNullable<AgentRuntimeConfig['teams'][string]>,
  workflowId: string,
  workflow: WorkflowDefinition,
): boolean {
  if (!sourceWritingWorkflowIds.has(workflowId)) return false;
  const stage = workflow.stages.find((value) => value.id === sourcePrewriterId);
  const sourcePlanner = stage?.assignments.find((assignment) => assignment.role === 'source-planner');
  const securityPrewriter = stage?.assignments.find((assignment) => assignment.role === 'security-prewriter');
  const developerStages = workflow.stages.filter((value) => value.kind === 'develop');
  const stageRiskFlags = stage?.risk_flags ?? [];
  const securityRiskFlags = securityPrewriter?.risk_flags ?? [];
  return Boolean(
    stage &&
      stage.kind === 'validate' &&
      stage.mode === 'parallel' &&
      stage.required_after.length === 1 &&
      stage.required_after[0] === 'synthesize_task' &&
      stageRiskFlags.length === 0 &&
      stage.assignments.length === 2 &&
      stage.assignments[0]?.role === 'source-planner' &&
      stage.assignments[1]?.role === 'security-prewriter' &&
      sourcePlanner?.profile === 'architect' &&
      !sourcePlanner.risk_flags?.length &&
      securityPrewriter?.profile === 'reviewer-security' &&
      securityRiskFlags.length === sourcePrewriterRiskFlags.length &&
      sourcePrewriterRiskFlags.every((risk) => securityRiskFlags.includes(risk)) &&
      stage.consumes.length === 1 &&
      stage.consumes[0] === 'DevelopmentTaskPacket/v1' &&
      stage.produces.length === 1 &&
      stage.produces[0] === 'LifecyclePreparationObservation/v1' &&
      team.roles['source-planner'] === 'architect' &&
      team.roles['security-prewriter'] === 'reviewer-security' &&
      config.agents.profiles.architect?.mutation_scope === 'none' &&
      config.agents.profiles.architect?.tools_policy === 'read_only' &&
      config.agents.profiles['reviewer-security']?.mutation_scope === 'none' &&
      developerStages.length === 1 &&
      developerStages[0]!.required_after.length === 1 &&
      developerStages[0]!.required_after[0] === sourcePrewriterId,
  );
}

export function compileDevelopmentWorkflow(
  config: AgentRuntimeConfig,
  teamId: string,
  workflowId: string,
  riskFlags?: readonly string[],
  lifecycleRisk?: WorkflowLifecycleRisk,
): CompiledDevelopmentWorkflow {
  assertLoadedRuntimeConfig(config);
  const team = config.teams[teamId];
  const workflow = config.workflows[workflowId];
  assert(Boolean(team?.enabled), 'development team is unavailable: ' + teamId);
  assert(Boolean(workflow), 'workflow is not configured for Mastra: ' + workflowId);
  workflow!.stages.forEach((stage) =>
    stage.assignments.forEach((assignment) => configuredProfileMatches(team!, teamId, workflowId, stage, assignment)),
  );
  const configuredPrewriterStage = workflow!.stages.find((stage) => stage.id === sourcePrewriterId);
  const sourcePrewriterConfigured = configuredReadOnlySourcePrewriter(config, team!, workflowId, workflow!);
  assert(
    !configuredPrewriterStage || sourcePrewriterConfigured,
    'workflow ' + workflowId + ' has a malformed configured read-only source planner/security prewriter stage',
  );
  const effectiveRiskFlags = effectiveWorkflowRiskFlags(riskFlags, lifecycleRisk);
  const requiresSecurityPrewriter =
    sourceWritingWorkflowIds.has(workflowId) &&
    Boolean(
      effectiveRiskFlags.some((risk) =>
        sourcePrewriterRiskFlags.includes(risk as (typeof sourcePrewriterRiskFlags)[number]),
      ),
    );
  const waves = workflowWaves(workflow!).map((wave) =>
    wave.map((stage) => ({
      ...stage,
      assignments: stage.assignments.filter(
        (assignment) =>
          assignmentMatchesRisk(stage, effectiveRiskFlags) && assignmentMatchesRisk(assignment, effectiveRiskFlags),
      ),
    })),
  );
  const effectiveStages = waves.flat();
  assert(
    effectiveStages.some((stage) => stage.assignments.length > 0),
    'workflow ' + workflowId + ' has no effective assignments after risk filters',
  );
  const effectiveStageIds = new Set(
    effectiveStages.filter((stage) => stage.assignments.length > 0).map((stage) => stage.id),
  );
  assert(
    !configuredPrewriterStage || effectiveStageIds.has(sourcePrewriterId),
    'workflow ' + workflowId + ' configured source prewriter stage has no effective source planner after risk filters',
  );
  assert(
    !configuredPrewriterStage ||
      !requiresSecurityPrewriter ||
      effectiveStages
        .find((stage) => stage.id === sourcePrewriterId)
        ?.assignments.some((assignment) => assignment.role === 'security-prewriter'),
    'workflow ' + workflowId + ' high-risk Source writing requires the configured risk-filtered security prewriter',
  );
  for (const stage of effectiveStages) {
    if (stage.assignments.length === 0) continue;
    assert(
      stage.required_after.every((dependency) => effectiveStageIds.has(dependency)),
      'workflow ' + workflowId + ' effective stage ' + stage.id + ' is missing a required stage after risk filters',
    );
  }
  for (const terminal of workflow!.terminal_stages) {
    assert(
      effectiveStageIds.has(terminal),
      'workflow ' + workflowId + ' requires effective terminal stage ' + terminal + '; check risk filters',
    );
  }
  const effectiveProducers = new Map<string, WorkflowStage[]>();
  effectiveStages.forEach((stage) => {
    if (stage.assignments.length === 0) return;
    stage.produces.forEach((artifact) =>
      effectiveProducers.set(artifact, [...(effectiveProducers.get(artifact) ?? []), stage]),
    );
  });
  effectiveStages
    .filter((stage) => stage.assignments.length > 0)
    .forEach((consumer) => {
      consumer.consumes
        .filter((artifact) => artifact !== 'WorkItem/v1')
        .forEach((artifact) => {
          assert(
            effectiveProducers.has(artifact),
            'workflow ' +
              workflowId +
              ' effective stage ' +
              consumer.id +
              ' consumes ' +
              artifact +
              ' without an effective producer after risk filters',
          );
        });
    });
  for (const [artifact, role] of [
    ['TestReceipt/v1', 'tester'],
    ['DeliveryInstruction/v1', 'delivery-agent'],
  ] as const) {
    if (!workflow!.stages.some((stage) => stage.produces.includes(artifact) || stage.consumes.includes(artifact)))
      continue;
    const producers = effectiveStages.filter((stage) => stage.produces.includes(artifact));
    assert(
      producers.length === 1 && producers[0]!.assignments.filter((assignment) => assignment.role === role).length === 1,
      'workflow ' +
        workflowId +
        ' requires exactly one effective ' +
        role +
        ' producing ' +
        artifact +
        '; check risk filters and producer cardinality',
    );
  }
  return Object.freeze({
    schema: 'CompiledDevelopmentWorkflow/v1',
    team_id: teamId,
    workflow_id: workflowId,
    assurance_profile: workflow!.assurance_profile,
    waves: Object.freeze(
      waves.map((wave) =>
        Object.freeze(
          wave.map((stage) =>
            Object.freeze({
              ...stage,
              assignments: Object.freeze([...stage.assignments]),
            }),
          ),
        ),
      ),
    ),
    terminal_stages: Object.freeze([...workflow!.terminal_stages]),
  });
}
