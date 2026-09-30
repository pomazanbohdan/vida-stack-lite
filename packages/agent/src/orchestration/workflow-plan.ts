import {
  assertLoadedRuntimeConfig,
  type AgentRuntimeConfig,
  type WorkflowDefinition,
  type WorkflowStage,
} from '../config/runtime-config.js';

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

export function compileDevelopmentWorkflow(
  config: AgentRuntimeConfig,
  teamId: string,
  workflowId: string,
  riskFlags?: readonly string[],
): CompiledDevelopmentWorkflow {
  assertLoadedRuntimeConfig(config);
  const team = config.teams[teamId];
  const workflow = config.workflows[workflowId];
  assert(Boolean(team?.enabled), 'development team is unavailable: ' + teamId);
  assert(Boolean(workflow), 'workflow is not configured for Mastra: ' + workflowId);
  workflow!.stages.forEach((stage) =>
    stage.assignments.forEach((assignment) => configuredProfileMatches(team!, teamId, workflowId, stage, assignment)),
  );
  return Object.freeze({
    schema: 'CompiledDevelopmentWorkflow/v1',
    team_id: teamId,
    workflow_id: workflowId,
    assurance_profile: workflow!.assurance_profile,
    waves: Object.freeze(
      workflowWaves(workflow!).map((wave) =>
        Object.freeze(
          wave.map((stage) =>
            Object.freeze({
              ...stage,
              assignments: Object.freeze(
                stage.assignments.filter(
                  (assignment) =>
                    assignmentMatchesRisk(stage, riskFlags) && assignmentMatchesRisk(assignment, riskFlags),
                ),
              ),
            }),
          ),
        ),
      ),
    ),
    terminal_stages: Object.freeze([...workflow!.terminal_stages]),
  });
}
