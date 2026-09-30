import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { initializeProjectFromBundle } from '../bin/init-core.mjs';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { advanceSessionWorkflowHandoff, prepareSessionWorkflowHandoff } from '../src/orchestration/session-handoff.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let root;
async function createFixture() {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'vida-session-handoff-'));
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
const context = { work_id: 'work-17', attempt: 2, scope_digest: 'a'.repeat(64) };
const selections = [
  ['information_research_light', 'research', 'information_research'],
  ['implementation_new', 'feature', 'implementation_new'],
  ['implementation_change', 'feature', 'implementation_change'],
  ['bug_fix', 'bug', 'bug_fix'],
  ['task_execution', 'task', 'task_execution'],
];

function selection(kind, intent) {
  return { team: 'default-development', kind, intent, project: 'refactoring', risk_flags: [], labels: [] };
}

function simulatedReports(state, status = 'reported_complete') {
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
    expect(ordinary.waves[0][0].assignments.map((assignment) => assignment.role)).toEqual([
      'diagnostics-researcher',
      'code-researcher',
    ]);
    expect(elevated.waves[0][0].assignments.map((assignment) => assignment.role)).toEqual([
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

  test('a loaded team profile mismatch cannot produce a workflow handoff', async () => {
    const mismatchRoot = await createFixture();
    try {
      const configPath = path.join(mismatchRoot, 'agent-runtime.config.v1.yaml');
      const config = parseYaml(readFileSync(configPath, 'utf8'));
      config.teams['default-development'].roles['code-researcher'] = 'researcher';
      writeFileSync(configPath, stringifyYaml(config));

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
      const configPath = path.join(overrideRoot, 'agent-runtime.config.v1.yaml');
      const config = parseYaml(readFileSync(configPath, 'utf8'));
      config.teams['default-development'].roles['developer-orchestrator'] = 'tester';
      config.teams['default-development'].stage_overrides.develop_change = 'executor';
      writeFileSync(configPath, stringifyYaml(config));

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
      const configPath = path.join(branchRoot, 'agent-runtime.config.v1.yaml');
      const config = parseYaml(readFileSync(configPath, 'utf8'));
      const workflow = config.workflows.implementation_new;
      const synthesize = workflow.stages.find((stage) => stage.id === 'synthesize_task');
      const develop = workflow.stages.find((stage) => stage.id === 'develop_change');
      workflow.stages.splice(2, 0, { ...structuredClone(synthesize), id: 'independent_review' });
      develop.required_after.push('independent_review');
      workflow.edges.push(['research_parallel', 'independent_review'], ['independent_review', 'develop_change']);
      writeFileSync(configPath, stringifyYaml(config));

      const expectedWaves = [
        ['research_parallel'],
        ['synthesize_task', 'independent_review'],
        ['develop_change'],
        ['validate_parallel'],
        ['test_repository'],
        ['prepare_delivery'],
      ];
      let state = prepareSessionWorkflowHandoff(branchRoot, selection('feature', 'implementation_new'), context);
      for (const stages of expectedWaves) {
        expect([...new Set(state.actions.map((action) => action.stage_id))]).toEqual(stages);
        state = advanceSessionWorkflowHandoff(branchRoot, state, simulatedReports(state));
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
    reports[0].status = 'reported_failed';
    const next = advanceSessionWorkflowHandoff(root, state, reports);
    expect(next.status).toBe('blocked');
    expect(next.actions).toEqual([]);
  });

  test('rejects stale or altered handoff and malformed reports', () => {
    const state = prepareSessionWorkflowHandoff(root, selection('research', 'information_research'), context);
    const reports = simulatedReports(state);
    expect(() => advanceSessionWorkflowHandoff(root, { ...state, wave_index: 1 }, reports)).toThrow(/digest is stale/);
    expect(() =>
      advanceSessionWorkflowHandoff(
        root,
        state,
        reports.map((report) => ({ ...report, status: 'pass' })),
      ),
    ).toThrow(/status is invalid/);
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
    const replace = (field, value) => [{ ...reports[0], [field]: value }, ...reports.slice(1)];
    for (const [field, value] of [
      ['work_id', 'foreign-work'],
      ['attempt', 3],
      ['scope_digest', 'b'.repeat(64)],
      ['wave_index', 1],
      ['action_order', 1],
      ['handoff_digest', 'b'.repeat(64)],
      ['action_id', 'forged'],
    ])
      expect(() => advanceSessionWorkflowHandoff(root, state, replace(field, value))).toThrow(/binding or order/);
    expect(() =>
      advanceSessionWorkflowHandoff(
        root,
        state,
        replace('session_result', { ...reports[0].session_result, output_digest: 'b'.repeat(64) }),
      ),
    ).toThrow(/session result is invalid/);
    expect(() =>
      advanceSessionWorkflowHandoff(
        root,
        state,
        replace('session_result', {
          ...reports[0].session_result,
          tool_call_ref: reports[1].session_result.tool_call_ref,
        }),
      ),
    ).toThrow(/duplicates/);
    expect(() => advanceSessionWorkflowHandoff(root, state, replace('session_result', undefined))).toThrow(
      /canonical|session result/i,
    );
    expect(() => advanceSessionWorkflowHandoff(root, state, replace('approved', true))).toThrow(
      /outcome fields are invalid/,
    );
  });
});
