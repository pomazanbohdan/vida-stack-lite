import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { loadRuntimeConfig, type WorkItemSelection } from '../src/config/runtime-config.js';
import { prepareSessionWorkflowHandoffFromConfig } from '../src/orchestration/session-handoff.js';
import * as contracts from '../src/orchestration/mastra-session-bridge-contract.js';
import * as bridge from '../src/orchestration/mastra-session-bridge.js';
import * as contextReader from '../src/orchestration/configured-context.js';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-session-contract-'));
  try {
    writeFileSync(
      path.join(root, 'agent-runtime.config.v1.yaml'),
      readFileSync(new URL('../templates/agent-runtime.config.template.v1.yaml', import.meta.url), 'utf8')
        .replaceAll('{{REPOSITORY}}', 'contract-fixture')
        .replaceAll('{{PROJECT}}', 'sample')
        .replaceAll('{{BUNDLE}}', 'vida-agent'),
    );
    writeFileSync(path.join(root, 'AGENTS.md'), 'Fixture policy');
    writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'Fixture source map');
    mkdirSync(path.join(root, 'docs/agent-instructions'), { recursive: true });
    writeFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), '{}');
    const config = loadRuntimeConfig(root);
    const selection: WorkItemSelection = {
      team: 'default-development',
      kind: 'task',
      intent: 'task_execution',
      project: config.projects[0]!.project_id,
      risk_flags: [],
      labels: [],
    };
    const context = { work_id: 'contract-fixture', attempt: 2, scope_digest: 'b'.repeat(64) };
    const handoff = prepareSessionWorkflowHandoffFromConfig(config, selection, context);
    const firstAction = handoff.actions[0];
    if (!firstAction) throw new Error('maintained fixture has no first action');
    return {
      root,
      config,
      selection,
      context,
      action: {
        ...firstAction,
        action_id: 'a'.repeat(64),
        assignment_index: 0,
        stage_id: 'synthesize_task',
      },
    };
  } catch (error) {
    console.error(`Retained failed session contract fixture: ${root}`);
    throw error;
  }
}

test('pure request builder preserves v1 fields and the known bindings digest without engine initialization', () => {
  expect(Object.hasOwn(contracts, 'buildSessionBridgeRequest')).toBe(true);
  const item = fixture();
  let passed = false;
  try {
    const request = contracts.buildSessionBridgeRequest({
      runId: 'fixture-run',
      workflowId: 'task_execution',
      configDigest: 'c'.repeat(64),
      context: item.context,
      waveIndex: 0,
      action: item.action,
      configuredContext: null,
      priorResults: [],
    });
    expect(request).toEqual({
      schema: 'VidaSessionRequest/v1',
      run_id: 'fixture-run',
      workflow_id: 'task_execution',
      wave_index: 0,
      action_id: 'a'.repeat(64),
      assignment_index: 0,
      stage_id: 'synthesize_task',
      role: item.action.role,
      config_digest: 'c'.repeat(64),
      scope_digest: 'b'.repeat(64),
      bindings_manifest_ref: '3a539c03846962ea9e14bfb3b53d4dfdd899594830c649b1f6bbada7917193d3',
    });
    expect(contracts.parseSessionBridgeRequest(request)).toEqual(request);
    expect(bridge.buildSessionBridgeRequest).toBe(contracts.buildSessionBridgeRequest);
    passed = true;
  } finally {
    if (passed) rmSync(item.root, { recursive: true, force: true });
    else console.error(`Retained failed session contract fixture: ${item.root}`);
  }
});

test('contract-owned run state parser retains v1 unknown-key behavior and denies invalid attempts', () => {
  expect(Object.hasOwn(contracts, 'parseSessionBridgeRunState')).toBe(true);
  const state = {
    work_id: 'work',
    attempt: 1,
    workflow_id: 'flow',
    scope_digest: 'scope',
    config_digest: 'config',
    selection: null,
    observations: [],
    extra: 'not persisted',
  };
  const { extra: _extra, ...expected } = state;
  expect<unknown>(contracts.parseSessionBridgeRunState(state)).toEqual(expected);
  expect(bridge.parseSessionBridgeRunState).toBe(contracts.parseSessionBridgeRunState);
  for (const attempt of [0, -1, 0.5, NaN, Infinity]) {
    expect(() => contracts.parseSessionBridgeRunState({ ...state, attempt })).toThrow();
  }
});

test('stage context reader preserves missing-stage denial and the no-context result', () => {
  expect(Object.hasOwn(contextReader, 'configuredContextForStage')).toBe(true);
  const item = fixture();
  let passed = false;
  try {
    const noContextStage = item.config.workflows.task_execution?.stages.find(
      (stage) => (stage.context_source_ids?.length ?? 0) + (stage.context_skill_refs?.length ?? 0) === 0,
    );
    if (!noContextStage) throw new Error('maintained fixture has no stage without selected context');
    expect(
      contextReader.configuredContextForStage(
        item.root,
        item.config,
        'task_execution',
        noContextStage.id,
        item.context,
      ),
    ).toBeNull();
    expect(() =>
      contextReader.configuredContextForStage(item.root, item.config, 'task_execution', 'missing-stage', item.context),
    ).toThrow('Configured context stage is missing');
    expect(bridge.configuredContextForStage).toBe(contextReader.configuredContextForStage);
    passed = true;
  } finally {
    if (passed) rmSync(item.root, { recursive: true, force: true });
    else console.error(`Retained failed session contract fixture: ${item.root}`);
  }
});
