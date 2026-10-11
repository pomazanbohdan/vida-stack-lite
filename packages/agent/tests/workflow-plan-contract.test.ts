import { afterEach, expect, test } from 'bun:test';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, stringify } from 'yaml';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import {
  compileDevelopmentWorkflow,
  effectiveWorkflowRiskFlags,
  executableWorkflowWaveIndices,
} from '../src/orchestration/workflow-plan.ts';
import { sessionActionsForWave } from '../src/orchestration/session-handoff.ts';

import type { WorkItemSelection, WorkflowStage } from '../src/config/runtime-config.ts';
import type { CompiledDevelopmentWorkflow as CompiledPlan } from '../src/orchestration/workflow-plan.ts';
import { isPlainRecord } from '../src/contracts/canonical-json-core.ts';
import assert from 'node:assert/strict';

type MutableStageFixture = { id: string; risk_flags?: string[] };
type MutableWorkflowFixture = {
  workflows: {
    information_research_light: { stages: MutableStageFixture[] };
    bug_fix: { stages: MutableStageFixture[] };
  };
};

function requireMutableWorkflowFixture(value: unknown): asserts value is MutableWorkflowFixture {
  assert.ok(isPlainRecord(value) && isPlainRecord(value.workflows), 'fixture workflows must be records');
  for (const name of ['information_research_light', 'bug_fix']) {
    const workflow: unknown = value.workflows[name];
    assert.ok(isPlainRecord(workflow) && Array.isArray(workflow.stages), 'fixture stages must be arrays');
    const stages: unknown[] = workflow.stages;
    for (const stage of stages) {
      assert.ok(isPlainRecord(stage) && typeof stage.id === 'string', 'fixture stage must have a string ID');
      assert.ok(
        stage.risk_flags === undefined ||
          (Array.isArray(stage.risk_flags) && stage.risk_flags.every((flag: unknown) => typeof flag === 'string')),
        'fixture risk flags must be strings',
      );
    }
  }
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const sourceConfigPath = path.join(repositoryRoot, 'agent-runtime.config.v1.yaml');
const scratchRoots = new Set<string>();

function loadedConfig(change?: (config: MutableWorkflowFixture) => void) {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-workflow-plan-'));
  scratchRoots.add(root);
  const config: unknown = parse(readFileSync(sourceConfigPath, 'utf8'));
  requireMutableWorkflowFixture(config);
  change?.(config);
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), stringify(config));
  // Preserve the real repository references that loadRuntimeConfig requires.
  copyFileSync(path.join(repositoryRoot, 'AGENTS.md'), path.join(root, 'AGENTS.md'));
  copyFileSync(path.join(repositoryRoot, 'AGENT.sidecar.md'), path.join(root, 'AGENT.sidecar.md'));
  const packageDocs = path.join(root, 'packages/agent');
  mkdirSync(packageDocs, { recursive: true });
  copyFileSync(path.join(repositoryRoot, 'packages/agent/TESTING.md'), path.join(packageDocs, 'TESTING.md'));
  return loadRuntimeConfig(root);
}

afterEach(() => {
  for (const root of scratchRoots) rmSync(root, { recursive: true, force: true });
  scratchRoots.clear();
});

test('effective risk flags preserve caller values and add high only for high lifecycle risk', () => {
  const original = ['security'];
  expect(effectiveWorkflowRiskFlags(undefined)).toEqual([]);
  expect(effectiveWorkflowRiskFlags(original, 'low')).toBe(original);
  expect(effectiveWorkflowRiskFlags(original, 'medium')).toBe(original);
  expect(effectiveWorkflowRiskFlags(original, 'high')).toEqual(['security', 'high']);
  expect(effectiveWorkflowRiskFlags(['high', 'security'], 'high')).toEqual(['high', 'security']);
  expect(effectiveWorkflowRiskFlags(['high', 'high'], 'high')).toEqual(['high', 'high']);
  expect(original).toEqual(['security']);
});

test('executable wave mapping preserves sparse original indexes, action order, and corrective selection', () => {
  const stage = (id: string, assignments: WorkflowStage['assignments']): WorkflowStage => ({
    id,
    kind: 'validate',
    mode: 'parallel',
    assignments,
    consumes: [],
    produces: [],
    required_after: [],
  });
  const plan: Pick<CompiledPlan, 'waves'> = {
    waves: [
      [stage('empty', [])],
      [
        stage('first', [
          { role: 'a', profile: 'architect' },
          { role: 'b', profile: 'reviewer' },
        ]),
        stage('also-first', [{ role: 'c', profile: 'tester' }]),
      ],
      [stage('filtered', [])],
      [stage('last', [{ role: 'd', profile: 'delivery' }])],
    ],
  };
  expect(executableWorkflowWaveIndices(plan)).toEqual([1, 3]);
  expect(executableWorkflowWaveIndices(plan, ['last'])).toEqual([3]);
  expect(executableWorkflowWaveIndices(plan, ['also-first', 'last'])).toEqual([1, 3]);
  expect(executableWorkflowWaveIndices(plan, [])).toEqual([]);
  expect(executableWorkflowWaveIndices({ waves: [] })).toEqual([]);
});

test('compiler retains configured topology and exact assignment associations while risk filtering', () => {
  const config = loadRuntimeConfig(repositoryRoot);
  const ordinary = compileDevelopmentWorkflow(config, 'default-development', 'bug_fix');
  const elevated = compileDevelopmentWorkflow(config, 'default-development', 'bug_fix', ['security']);
  expect(ordinary).toMatchObject({
    schema: 'CompiledDevelopmentWorkflow/v1',
    team_id: 'default-development',
    workflow_id: 'bug_fix',
    terminal_stages: ['prepare_delivery'],
  });
  expect(ordinary.waves.map((wave) => wave.map((stage) => stage.id))).toEqual(
    elevated.waves.map((wave) => wave.map((stage) => stage.id)),
  );
  expect(ordinary.waves[0]?.[0]?.assignments.map((assignment) => assignment.role)).toEqual([
    'diagnostics-researcher',
    'code-researcher',
  ]);
  expect(elevated.waves[0]?.[0]?.assignments.map((assignment) => assignment.role)).toEqual([
    'diagnostics-researcher',
    'code-researcher',
    'security-data-researcher',
  ]);
  expect(ordinary.waves.flat().find((stage) => stage.id === 'prepare_delivery')?.assignments).toHaveLength(1);
  expect(Object.isFrozen(ordinary)).toBe(true);
  expect(Object.isFrozen(ordinary.waves)).toBe(true);
  expect(Object.isFrozen(ordinary.waves[0])).toBe(true);
  expect(Object.isFrozen(ordinary.waves[0]?.[0]?.assignments)).toBe(true);
});

test('high lifecycle risk enables the configured read-only security prewriter without changing input flags', () => {
  const config = loadRuntimeConfig(repositoryRoot);
  const flags: string[] = [];
  const low = compileDevelopmentWorkflow(config, 'default-development', 'implementation_new', flags, 'low');
  const high = compileDevelopmentWorkflow(config, 'default-development', 'implementation_new', flags, 'high');
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: 'feature',
    intent: 'implementation_new',
    project: 'example-project',
    risk_flags: flags,
    labels: [],
  };
  const context = { work_id: 'workflow-plan-case', attempt: 1, scope_digest: 'a'.repeat(64) };
  const prewriterWave = high.waves.findIndex((wave) => wave.some((stage) => stage.id === 'review_source_prewrite'));
  const roles = (plan: CompiledPlan) =>
    plan.waves
      .flat()
      .find((stage) => stage.id === 'review_source_prewrite')
      ?.assignments.map((assignment) => assignment.role);
  expect(roles(low)).toEqual(['source-planner']);
  expect(roles(high)).toEqual(['source-planner', 'security-prewriter']);
  expect(flags).toEqual([]);
  expect(executableWorkflowWaveIndices(high, ['review_source_prewrite'])).toEqual([prewriterWave]);
  const actions = sessionActionsForWave(
    config,
    selection,
    context,
    'implementation_new',
    prewriterWave,
    [],
    undefined,
    'high',
  );
  expect(actions.map((action) => [action.stage_id, action.role, action.action_order, action.assignment_index])).toEqual(
    [
      ['review_source_prewrite', 'source-planner', 0, 0],
      ['review_source_prewrite', 'security-prewriter', 1, 1],
    ],
  );
});

test('compiler rejects unavailable, foreign, empty-effective, and unsupported configuration authority', () => {
  const config = loadRuntimeConfig(repositoryRoot);
  expect(() => compileDevelopmentWorkflow(config, 'missing-team', 'bug_fix')).toThrow(
    'development team is unavailable: missing-team',
  );
  expect(() => compileDevelopmentWorkflow(config, 'default-development', 'missing-workflow')).toThrow(
    'workflow is not configured for Mastra: missing-workflow',
  );
  expect(() => compileDevelopmentWorkflow(structuredClone(config), 'default-development', 'bug_fix')).toThrow(
    'runtime config must come from loadRuntimeConfig',
  );

  const filtered = loadedConfig((candidate) => {
    for (const stage of candidate.workflows.information_research_light.stages) stage.risk_flags = ['security'];
  });
  expect(() => compileDevelopmentWorkflow(filtered, 'default-development', 'information_research_light')).toThrow(
    'workflow information_research_light has no effective assignments after risk filters',
  );
});

test('risk filtering cannot erase a dependency producer or a terminal stage', () => {
  const missingProducer = loadedConfig((candidate) => {
    const first = candidate.workflows.information_research_light.stages[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('configured research workflow has no first stage');
    first.risk_flags = ['security'];
  });
  expect(() =>
    compileDevelopmentWorkflow(missingProducer, 'default-development', 'information_research_light'),
  ).toThrow(/missing a required stage after risk filters|without an effective producer after risk filters/);

  const missingTerminal = loadedConfig((candidate) => {
    const terminal = candidate.workflows.bug_fix.stages.find((stage) => stage.id === 'prepare_delivery');
    expect(terminal).toBeDefined();
    if (!terminal) throw new Error('configured bug workflow has no delivery stage');
    terminal.risk_flags = ['security'];
  });
  expect(() => compileDevelopmentWorkflow(missingTerminal, 'default-development', 'bug_fix', [])).toThrow(
    'requires effective terminal stage prepare_delivery; check risk filters',
  );
});
