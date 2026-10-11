import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import { loadRuntimeConfig, type WorkItemSelection } from '../src/config/runtime-config.js';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.js';
import {
  advanceSessionWorkflowHandoff,
  prepareSessionWorkflowHandoff,
  validateSessionWorkflowHandoffFromConfig,
  type SessionAgentAction,
  type SessionAgentOutcome,
  type SessionHandoffContext,
  type SessionWorkflowHandoff,
} from '../src/orchestration/session-handoff.js';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let root = '';

type MutableOutcome = {
  -readonly [Key in keyof SessionAgentOutcome]: Key extends 'session_result'
    ? {
        -readonly [
          ResultKey in keyof SessionAgentOutcome['session_result']
        ]: SessionAgentOutcome['session_result'][ResultKey];
      }
    : SessionAgentOutcome[Key];
};

type MutableYamlRecord = Record<string, unknown>;

function isRecord(value: unknown): value is MutableYamlRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordAt(value: MutableYamlRecord, key: string): MutableYamlRecord {
  const nested = value[key];
  if (!isRecord(nested)) throw new Error(`configuration field ${key} is not an object`);
  return nested;
}

function arrayAt(value: MutableYamlRecord, key: string): unknown[] {
  const nested = value[key];
  if (!Array.isArray(nested)) throw new Error(`configuration field ${key} is not an array`);
  return nested;
}

function parseConfig(rootPath: string): MutableYamlRecord {
  const parsed: unknown = parseYaml(readFileSync(path.join(rootPath, 'agent-runtime.config.v1.yaml'), 'utf8'));
  if (!isRecord(parsed)) throw new Error('runtime configuration YAML is not an object');
  return parsed;
}

function writeConfig(rootPath: string, config: MutableYamlRecord): void {
  writeFileSync(path.join(rootPath, 'agent-runtime.config.v1.yaml'), stringifyYaml(config));
}

function reportAt(reports: readonly MutableOutcome[], index: number): MutableOutcome {
  const report = reports[index];
  if (!report) throw new Error(`simulated report ${index} is missing`);
  return report;
}

async function createFixture(): Promise<string> {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'vida-session-handoff-'));
  if (root) {
    // Handoff cases vary configuration; initialize once and copy isolated inputs without Host state.
    cpSync(root, fixtureRoot, {
      recursive: true,
      dereference: false,
      filter: (entry) => path.basename(entry) !== '.agent',
    });
    return fixtureRoot;
  }
  const bundleRoot = path.join(fixtureRoot, 'vida-agent');
  mkdirSync(bundleRoot);
  for (const entry of ['templates', 'instructions', 'schemas', 'TESTING.md', 'package.json'])
    cpSync(path.join(packageRoot, entry), path.join(bundleRoot, entry), { recursive: true, dereference: false });
  expect(
    await initializeProjectFromBundle(
      { projectRoot: fixtureRoot, repository: 'session-handoff-test', projectMappings: ['refactoring=.'] },
      bundleRoot,
    ),
  ).toMatchObject({ status: 'initialized' });
  return fixtureRoot;
}
beforeAll(async () => {
  root = await createFixture();
});
afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});
const context: SessionHandoffContext = { work_id: 'work-17', attempt: 2, scope_digest: 'a'.repeat(64) };
const selections: ReadonlyArray<readonly [string, WorkItemSelection['kind'], WorkItemSelection['intent']]> = [
  ['information_research_light', 'research', 'information_research'],
  ['implementation_new', 'feature', 'implementation_new'],
  ['implementation_change', 'feature', 'implementation_change'],
  ['bug_fix', 'bug', 'bug_fix'],
  ['task_execution', 'task', 'task_execution'],
];

function selection(kind: WorkItemSelection['kind'], intent: WorkItemSelection['intent']): WorkItemSelection {
  return { team: 'default-development', kind, intent, project: 'refactoring', risk_flags: [], labels: [] };
}

function simulatedReports(
  state: SessionWorkflowHandoff,
  status: SessionAgentOutcome['status'] = 'reported_complete',
): MutableOutcome[] {
  return state.actions.map((action) => {
    const summary = `${action.role} returned a simulated session result`;
    return {
      action_id: action.action_id,
      handoff_digest: state.digest,
      work_id: action.work_id,
      attempt: action.attempt,
      scope_digest: action.scope_digest,
      wave_index: action.wave_index,
      action_order: action.action_order,
      stage_id: action.stage_id,
      role: action.role,
      status,
      summary,
      session_result: {
        issue_id: `simulated-issue-${action.action_id}`,
        agent_id: `simulated-agent-${action.action_order}`,
        tool_call_ref: `simulated-tool-${action.action_id}`,
        output_digest: canonicalJsonDigest(summary),
      },
      evidence_refs: [`simulated-evidence:${action.action_id}`],
    };
  });
}

describe('advisory session agent handoff', () => {
  test('compiled code workflow preserves every linear wave through delivery', () => {
    const compiled = compileDevelopmentWorkflow(loadRuntimeConfig(root), 'default-development', 'implementation_new');
    expect(compiled.waves.map((wave) => wave.map((stage) => stage.id))).toEqual([
      ['research_parallel'],
      ['synthesize_task'],
      ['review_source_prewrite'],
      ['develop_change'],
      ['validate_parallel'],
      ['test_repository'],
      ['prepare_delivery'],
    ]);
    expect(compiled.waves.at(-1)?.[0]?.kind).toBe('deliver');
  });

  test('compiled default and security workflows publish their exact identity and terminal stage', () => {
    const config = loadRuntimeConfig(root);
    const ordinary = compileDevelopmentWorkflow(config, 'default-development', 'bug_fix');
    const elevated = compileDevelopmentWorkflow(config, 'default-development', 'bug_fix', ['security']);
    for (const compiled of [ordinary, elevated]) {
      expect(compiled).toMatchObject({
        schema: 'CompiledDevelopmentWorkflow/v1',
        team_id: 'default-development',
        workflow_id: 'bug_fix',
        terminal_stages: ['prepare_delivery'],
      });
    }
    const ordinaryResearch = ordinary.waves[0]?.[0];
    const elevatedResearch = elevated.waves[0]?.[0];
    if (!ordinaryResearch || !elevatedResearch) throw new Error('compiled bug workflow has no research stage');
    expect(ordinaryResearch.assignments.map((assignment) => assignment.role)).toEqual([
      'diagnostics-researcher',
      'code-researcher',
    ]);
    expect(elevatedResearch.assignments.map((assignment) => assignment.role)).toEqual([
      'diagnostics-researcher',
      'code-researcher',
      'security-data-researcher',
    ]);
  });

  test('compiler rejects an unavailable team or workflow', () => {
    const config = loadRuntimeConfig(root);
    expect(() => compileDevelopmentWorkflow(config, 'missing-team', 'bug_fix')).toThrow(
      'development team is unavailable: missing-team',
    );
    expect(() => compileDevelopmentWorkflow(config, 'default-development', 'missing-workflow')).toThrow(
      'workflow is not configured for Mastra: missing-workflow',
    );
  });

  test('compiler rejects an unbound clone of loaded project configuration', () => {
    const config = loadRuntimeConfig(root);
    const clone = structuredClone(config);
    expect(() => compileDevelopmentWorkflow(clone, 'default-development', 'bug_fix')).toThrow(
      'runtime config must come from loadRuntimeConfig',
    );
  });

  test('risk filters cannot remove every effective action or a required artifact producer', async () => {
    const emptyRoot = await createFixture();
    try {
      const config = parseConfig(emptyRoot);
      const research = recordAt(recordAt(config, 'workflows'), 'information_research_light');
      for (const stage of arrayAt(research, 'stages')) {
        if (!isRecord(stage)) throw new Error('research stage is not an object');
        stage.risk_flags = ['security'];
      }
      writeConfig(emptyRoot, config);
      const loaded = loadRuntimeConfig(emptyRoot);
      expect(() => compileDevelopmentWorkflow(loaded, 'default-development', 'information_research_light')).toThrow(
        'workflow information_research_light has no effective assignments after risk filters',
      );
      expect(() =>
        prepareSessionWorkflowHandoff(emptyRoot, selection('research', 'information_research'), context),
      ).toThrow('workflow information_research_light has no effective assignments after risk filters');
    } finally {
      rmSync(emptyRoot, { recursive: true, force: true });
    }

    const missingProducerRoot = await createFixture();
    try {
      const config = parseConfig(missingProducerRoot);
      const research = recordAt(recordAt(config, 'workflows'), 'information_research_light');
      const firstStage = arrayAt(research, 'stages')[0];
      if (!isRecord(firstStage)) throw new Error('research workflow has no first stage');
      firstStage.risk_flags = ['security'];
      writeConfig(missingProducerRoot, config);
      expect(() =>
        compileDevelopmentWorkflow(
          loadRuntimeConfig(missingProducerRoot),
          'default-development',
          'information_research_light',
        ),
      ).toThrow('effective stage synthesize_research is missing a required stage after risk filters');
    } finally {
      rmSync(missingProducerRoot, { recursive: true, force: true });
    }
  });

  test('action binds the complete resolved profile and configured skill refs to current config', async () => {
    const profileRoot = await createFixture();
    try {
      const config = parseConfig(profileRoot);
      const agents = recordAt(config, 'agents');
      const executor = recordAt(recordAt(agents, 'profiles'), 'executor');
      executor.model = 'gpt-6-luna';
      executor.reasoning = 'high';
      executor.execution_mode = 'fast';
      executor.tools_policy = 'custom_developer';
      executor.egress_policy = 'custom_egress';
      const toolPolicies = recordAt(agents, 'tool_policies');
      toolPolicies.custom_developer = structuredClone(recordAt(toolPolicies, 'developer'));
      recordAt(agents, 'egress_policies').custom_egress = { allowed_hosts: ['docs.example.test'] };
      const implementation = recordAt(recordAt(config, 'workflows'), 'implementation_new');
      const develop = arrayAt(implementation, 'stages').find(
        (stage): stage is MutableYamlRecord => isRecord(stage) && stage.id === 'develop_change',
      );
      if (!develop) throw new Error('implementation workflow has no develop stage');
      develop.context_skill_refs = ['.codex/skills/source-review/SKILL.md'];
      writeConfig(profileRoot, config);
      const loaded = loadRuntimeConfig(profileRoot);
      const state = prepareSessionWorkflowHandoff(profileRoot, selection('feature', 'implementation_new'), context);
      let current = state;
      for (let i = 0; i < 2; i++)
        current = advanceSessionWorkflowHandoff(profileRoot, current, simulatedReports(current));
      expect(
        current.actions.map((action) => [action.stage_id, action.role, action.resolved_profile.profile_id]),
      ).toEqual([['review_source_prewrite', 'source-planner', 'architect']]);
      current = advanceSessionWorkflowHandoff(profileRoot, current, simulatedReports(current));
      const developerAction = current.actions[0];
      if (!developerAction) throw new Error('workflow did not reach its developer action');
      expect(developerAction).toMatchObject({
        model: 'gpt-6-luna',
        reasoning: 'high',
        mutation_scope: 'repository_source',
        context_skill_refs: ['.codex/skills/source-review/SKILL.md'],
        resolved_profile: {
          schema: 'ResolvedAgentProfile/v1',
          config_digest: state.config_digest,
          profile_id: 'executor',
          model: 'gpt-6-luna',
          reasoning: 'high',
          execution_mode: 'fast',
          mutation_scope: 'repository_source',
          tools_policy: {
            id: 'custom_developer',
            source_write: true,
            allowed_tools: recordAt(recordAt(agents, 'tool_policies'), 'developer').allowed_tools,
          },
          egress_policy: { id: 'custom_egress', allowed_hosts: ['docs.example.test'] },
          enforcement_status: 'not_asserted',
        },
      });
      const { digest: _oldDigest, ...currentBody } = current;
      const changedBody: Omit<SessionWorkflowHandoff, 'digest'> = {
        ...currentBody,
        actions: current.actions.map((action, index): SessionAgentAction =>
          index === 0
            ? { ...action, resolved_profile: { ...action.resolved_profile, execution_mode: 'standard' } }
            : action,
        ),
      };
      const changed: SessionWorkflowHandoff = { ...changedBody, digest: canonicalJsonDigest(changedBody) };
      expect(() => validateSessionWorkflowHandoffFromConfig(loaded, changed)).toThrow(/actions changed/);
    } finally {
      rmSync(profileRoot, { recursive: true, force: true });
    }
  });

  test('a loaded team profile mismatch cannot produce a workflow handoff', async () => {
    const mismatchRoot = await createFixture();
    try {
      const config = parseConfig(mismatchRoot);
      const team = recordAt(recordAt(config, 'teams'), 'default-development');
      recordAt(team, 'roles')['code-researcher'] = 'researcher';
      writeConfig(mismatchRoot, config);

      const loaded = loadRuntimeConfig(mismatchRoot);
      const mismatch =
        'team default-development role/profile does not match workflow implementation_new/research_parallel';
      expect(() => compileDevelopmentWorkflow(loaded, 'default-development', 'implementation_new')).toThrow(mismatch);
      expect(() =>
        prepareSessionWorkflowHandoff(mismatchRoot, selection('feature', 'implementation_new'), context),
      ).toThrow(mismatch);
    } finally {
      rmSync(mismatchRoot, { recursive: true, force: true });
    }
  });

  test('a loaded develop-stage override selects the executor while other develop stages use the team role', async () => {
    const overrideRoot = await createFixture();
    try {
      const config = parseConfig(overrideRoot);
      const team = recordAt(recordAt(config, 'teams'), 'default-development');
      recordAt(team, 'roles')['developer-orchestrator'] = 'tester';
      recordAt(team, 'stage_overrides').develop_change = 'executor';
      writeConfig(overrideRoot, config);

      const loaded = loadRuntimeConfig(overrideRoot);
      const compiled = compileDevelopmentWorkflow(loaded, 'default-development', 'implementation_new');
      expect(compiled.waves.flat().find((stage) => stage.id === 'develop_change')?.assignments).toEqual([
        { role: 'developer-orchestrator', profile: 'executor' },
      ]);
      expect(() => compileDevelopmentWorkflow(loaded, 'default-development', 'bug_fix')).toThrow(
        'team default-development role/profile does not match workflow bug_fix/develop_fix',
      );
    } finally {
      rmSync(overrideRoot, { recursive: true, force: true });
    }
  });

  test('security risk includes conditional security research while ordinary bug work excludes it', () => {
    const ordinary = prepareSessionWorkflowHandoff(root, selection('bug', 'bug_fix'), context);
    const elevated = prepareSessionWorkflowHandoff(
      root,
      { ...selection('bug', 'bug_fix'), risk_flags: ['security'] },
      context,
    );
    expect(ordinary.actions.map((action) => action.role)).toEqual(['diagnostics-researcher', 'code-researcher']);
    expect(elevated.actions.map((action) => action.role)).toEqual([
      'diagnostics-researcher',
      'code-researcher',
      'security-data-researcher',
    ]);
    expect(elevated.actions.at(-1)).toMatchObject({ stage_id: 'research_bug', contour: 'security_data' });
  });

  test('a branch joins only after both parallel predecessors and reaches the delivery terminal', async () => {
    const branchRoot = await createFixture();
    try {
      const config = parseConfig(branchRoot);
      const workflow = recordAt(recordAt(config, 'workflows'), 'implementation_new');
      const stages = arrayAt(workflow, 'stages');
      const validate = stages.find(
        (stage): stage is MutableYamlRecord => isRecord(stage) && stage.id === 'validate_parallel',
      );
      const testStage = stages.find(
        (stage): stage is MutableYamlRecord => isRecord(stage) && stage.id === 'test_repository',
      );
      if (!validate || !testStage) throw new Error('implementation workflow is missing a required stage');
      arrayAt(testStage, 'required_after').push('independent_review');
      const validateIndex = stages.indexOf(validate);
      stages.splice(validateIndex + 1, 0, { ...structuredClone(validate), id: 'independent_review' });
      arrayAt(workflow, 'edges').push(
        ['develop_change', 'independent_review'],
        ['independent_review', 'test_repository'],
      );
      writeConfig(branchRoot, config);

      const expectedWaves = [
        ['research_parallel'],
        ['synthesize_task'],
        ['review_source_prewrite'],
        ['develop_change'],
        ['validate_parallel', 'independent_review'],
        ['test_repository'],
        ['prepare_delivery'],
      ];
      let state = prepareSessionWorkflowHandoff(branchRoot, selection('feature', 'implementation_new'), context);
      for (const stages of expectedWaves) {
        expect([...new Set(state.actions.map((action) => action.stage_id))]).toEqual(stages);
        const reports = simulatedReports(state);
        if (stages.includes('independent_review')) {
          const firstBranch = reports.filter((report) => report.stage_id === 'validate_parallel');
          expect(firstBranch.length).toBeGreaterThan(0);
          expect(() => advanceSessionWorkflowHandoff(branchRoot, state, firstBranch)).toThrow(/every wave outcome/);
        }
        state = advanceSessionWorkflowHandoff(branchRoot, state, reports);
      }
      expect(state.status).toBe('all_reports_collected');
      expect(state.actions).toEqual([]);
    } finally {
      rmSync(branchRoot, { recursive: true, force: true });
    }
  });

  test.each(selections)('collects reports for configured %s flow by complete waves', (workflow, kind, intent) => {
    let state = prepareSessionWorkflowHandoff(root, selection(kind, intent), context);
    expect(state.workflow_id).toBe(workflow);
    expect(state.status).toBe('awaiting_agent_outcomes');
    while (state.status === 'awaiting_agent_outcomes') {
      const previous = state;
      state = advanceSessionWorkflowHandoff(root, state, simulatedReports(state));
      expect(state.wave_index).toBe(previous.wave_index + 1);
      expect(state.outcomes.length).toBe(previous.outcomes.length + previous.actions.length);
      if (state.status === 'awaiting_agent_outcomes')
        expect(state.actions.every((action) => action.prior_outcomes.length === state.outcomes.length)).toBe(true);
    }
    expect(state.status).toBe('all_reports_collected');
    expect(state.actions).toEqual([]);
    expect(() => advanceSessionWorkflowHandoff(root, state, [])).toThrow(/not awaiting outcomes/);
  });

  test('requires every ordered parallel report before releasing the next wave', () => {
    const state = prepareSessionWorkflowHandoff(root, selection('feature', 'implementation_new'), context);
    expect(state.actions.length).toBeGreaterThan(1);
    expect(state.actions.every((action) => action.stage_mode === 'parallel')).toBe(true);
    const reports = simulatedReports(state);
    expect(() => advanceSessionWorkflowHandoff(root, state, reports.slice(1))).toThrow(/every wave outcome/);
    expect(() => advanceSessionWorkflowHandoff(root, state, [...reports].reverse())).toThrow(/binding or order/);
  });

  test('a reported failure blocks the next wave', () => {
    const state = prepareSessionWorkflowHandoff(root, selection('feature', 'implementation_new'), context);
    const reports = simulatedReports(state);
    reportAt(reports, 0).status = 'reported_failed';
    const next = advanceSessionWorkflowHandoff(root, state, reports);
    expect(next.status).toBe('blocked');
    expect(next.actions).toEqual([]);
  });

  test('rejects stale or altered handoff and malformed reports', () => {
    const state = prepareSessionWorkflowHandoff(root, selection('research', 'information_research'), context);
    const reports = simulatedReports(state);
    expect(() => advanceSessionWorkflowHandoff(root, { ...state, wave_index: 1 }, reports)).toThrow(/digest is stale/);
    const malformedStatuses = reports.map((report) => {
      const malformed = { ...report };
      Reflect.set(malformed, 'status', 'pass');
      return malformed;
    });
    expect(() => advanceSessionWorkflowHandoff(root, state, malformedStatuses)).toThrow(/status is invalid/);
    expect(() =>
      advanceSessionWorkflowHandoff(
        root,
        state,
        reports.map((report) => ({ ...report, summary: '' })),
      ),
    ).toThrow(/summary is invalid/);
  });

  test('rejects forged work, attempt, scope, order and simulated tool result bindings', () => {
    const state = prepareSessionWorkflowHandoff(root, selection('feature', 'implementation_new'), context);
    const reports = simulatedReports(state);
    const replace = (field: string, value: unknown): SessionAgentOutcome[] => [
      { ...reportAt(reports, 0), [field]: value },
      ...reports.slice(1),
    ];
    const malformedBindings: ReadonlyArray<readonly [string, unknown]> = [
      ['work_id', 'foreign-work'],
      ['attempt', 3],
      ['scope_digest', 'b'.repeat(64)],
      ['wave_index', 1],
      ['action_order', 1],
      ['handoff_digest', 'b'.repeat(64)],
      ['action_id', 'forged'],
    ];
    for (const [field, value] of malformedBindings)
      expect(() => advanceSessionWorkflowHandoff(root, state, replace(field, value))).toThrow(/binding or order/);
    expect(() =>
      advanceSessionWorkflowHandoff(
        root,
        state,
        replace('session_result', { ...reportAt(reports, 0).session_result, output_digest: 'b'.repeat(64) }),
      ),
    ).toThrow(/session result is invalid/);
    expect(() =>
      advanceSessionWorkflowHandoff(
        root,
        state,
        replace('session_result', {
          ...reportAt(reports, 0).session_result,
          tool_call_ref: reportAt(reports, 1).session_result.tool_call_ref,
        }),
      ),
    ).toThrow(/outside an allowed configured slot batch/);
    expect(() => advanceSessionWorkflowHandoff(root, state, replace('session_result', undefined))).toThrow(
      /canonical|session result/i,
    );
    expect(() => advanceSessionWorkflowHandoff(root, state, replace('approved', true))).toThrow(
      /outcome fields are invalid/,
    );
  });

  test('allows the focused validator pair to share one invocation and rejects cross-wave reuse', () => {
    let state = prepareSessionWorkflowHandoff(root, selection('task', 'task_execution'), context);
    while (state.actions[0]?.stage_id !== 'validate_focused')
      state = advanceSessionWorkflowHandoff(root, state, simulatedReports(state));
    const sharedRef = 'single-focused-validator-invocation';
    const reports = simulatedReports(state);
    for (const report of reports) {
      report.session_result.tool_call_ref = sharedRef;
      report.session_result.agent_id = 'same-validator-agent';
    }
    const advanced = advanceSessionWorkflowHandoff(root, state, reports);
    expect(
      advanced.outcomes
        .filter((outcome) => outcome.session_result.tool_call_ref === sharedRef)
        .map((outcome) => outcome.role)
        .sort(),
    ).toEqual(['correctness-validator', 'requirements-validator']);
    const nextReports = simulatedReports(advanced);
    reportAt(nextReports, 0).session_result.tool_call_ref = sharedRef;
    expect(() => advanceSessionWorkflowHandoff(root, advanced, nextReports)).toThrow(/replayed from a prior wave/);
  });

  test('does not extend shared invocation batching to the three-role validation wave', () => {
    let state = prepareSessionWorkflowHandoff(root, selection('feature', 'implementation_new'), context);
    while (state.actions[0]?.stage_id !== 'validate_parallel')
      state = advanceSessionWorkflowHandoff(root, state, simulatedReports(state));
    const reports = simulatedReports(state);
    reportAt(reports, 0).session_result.tool_call_ref = 'same-invocation';
    reportAt(reports, 1).session_result.tool_call_ref = 'same-invocation';
    reportAt(reports, 0).session_result.agent_id = 'same-agent';
    reportAt(reports, 1).session_result.agent_id = 'same-agent';
    expect(() => advanceSessionWorkflowHandoff(root, state, reports)).toThrow(
      /outside an allowed configured slot batch/,
    );
  });
});
