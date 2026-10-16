import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { boundedSpawnSync, executionBudget, pinnedEnvironment, requireTerminalCommand } from '../bin/bun.ts';
import { loadRuntimeConfig, type WorkItemSelection } from '../src/config/runtime-config.js';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.js';
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

test('request builder binds selected local context and corrective execution into the public request', () => {
  const item = fixture();
  let passed = false;
  try {
    const configuredContext = {
      schema: 'ConfiguredContext/v1' as const,
      work_id: item.context.work_id,
      attempt: item.context.attempt,
      digest: 'd'.repeat(64),
      entries: [
        {
          id: 'local',
          kind: 'local' as const,
          location: 'docs/context.md',
          title: 'Selected source',
          status: 'local_excerpt' as const,
          sha256: 'e'.repeat(64),
          bytes: 12,
          content: 'selected text',
          truncated: false,
        },
        {
          id: 'official',
          kind: 'official' as const,
          location: 'https://example.invalid/reference',
          title: 'Unfetched reference',
          status: 'unfetched_reference' as const,
          sha256: null,
          bytes: null,
          content: null,
          truncated: false,
        },
      ],
    };
    const correctiveExecution = {
      schema: 'CorrectiveExecution/v1' as const,
      base_run_id: 'original-run',
      engine_run_id: '00000000-0000-4000-8000-000000000002',
      correction_generation: 1,
      stage_ids: ['synthesize_task'],
      authorization: {
        schema: 'CorrectiveAssignmentAuthorization/v1' as const,
        path: 'docs/assignment.json',
        sha256: 'f'.repeat(64),
      },
    };
    const priorResult = {
      schema: 'VidaSessionObservation/v1' as const,
      action_id: '1'.repeat(64),
      issue_id: '00000000-0000-4000-8000-000000000003',
      agent_id: 'fixture-agent',
      tool_call_ref: 'fixture:completed-action',
      status: 'reported_complete' as const,
      summary: 'Completed prior action',
      output_digest: '2'.repeat(64),
      evidence_refs: [],
    };
    const request = contracts.buildSessionBridgeRequest({
      runId: 'corrective-run',
      workflowId: 'task_execution',
      configDigest: 'c'.repeat(64),
      context: item.context,
      waveIndex: 1,
      action: item.action,
      configuredContext,
      priorResults: [priorResult],
      correctiveExecution,
    });
    expect(request).toMatchObject({
      configured_context_digest: configuredContext.digest,
      configured_context_files: [{ path: 'docs/context.md', sha256: 'e'.repeat(64) }],
      corrective_execution: correctiveExecution,
      wave_index: 1,
    });
    expect(request.bindings_manifest_ref).toBe(
      canonicalJsonDigest({
        config_digest: 'c'.repeat(64),
        scope_digest: item.context.scope_digest,
        work_id: item.context.work_id,
        attempt: item.context.attempt,
        action_id: item.action.action_id,
        stage_id: item.action.stage_id,
        configured_context_digest: configuredContext.digest,
        wave_index: 1,
        prior_results: [priorResult.output_digest],
      }),
    );
    expect(request.configured_context_files).not.toContainEqual({
      path: 'https://example.invalid/reference',
      sha256: null,
    });
    expect(contracts.parseSessionBridgeRequest(request)).toEqual(request);
    expect(bridge.buildSessionBridgeRequest).toBe(contracts.buildSessionBridgeRequest);
    passed = true;
  } finally {
    if (passed) rmSync(item.root, { recursive: true, force: true });
    else console.error(`Retained failed corrective request fixture: ${item.root}`);
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

test('stage context reader resolves an explicitly selected package resource', () => {
  const item = fixture();
  let passed = false;
  try {
    const configuredStage = Object.entries(item.config.workflows).flatMap(([workflowId, workflow]) =>
      workflow.stages
        .filter((stage) => (stage.context_source_ids?.length ?? 0) + (stage.context_skill_refs?.length ?? 0) > 0)
        .map((stage) => ({ workflowId, stage })),
    )[0];
    if (!configuredStage) throw new Error('maintained fixture has no stage with selected context');
    const configured = contextReader.configuredContextForStage(
      item.root,
      item.config,
      configuredStage.workflowId,
      configuredStage.stage.id,
      item.context,
    );
    expect(configured?.work_id).toBe(item.context.work_id);
    expect(configured?.attempt).toBe(item.context.attempt);
    expect(configured?.entries.length).toBeGreaterThan(0);
    expect(configured?.digest).toMatch(/^[a-f0-9]{64}$/);
    passed = true;
  } finally {
    if (passed) rmSync(item.root, { recursive: true, force: true });
    else console.error(`Retained failed configured stage fixture: ${item.root}`);
  }
});

test('cold HostState and pure bridge contracts load without resolving the engine bridge', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-session-contract-cold-host-'));
  const packageRoot = path.resolve(import.meta.dirname, '..');
  const hostStateUrl = pathToFileURL(path.join(packageRoot, 'src/host-state.ts')).href;
  const contractUrl = pathToFileURL(path.join(packageRoot, 'src/orchestration/mastra-session-bridge-contract.ts')).href;
  const source = `
    import { Database } from 'bun:sqlite';
    const denied = [];
    Bun.plugin({
      name: 'cold-host-contract-engine-denial',
      setup(build) {
        build.onResolve(
          { filter: /mastra-session-bridge\\.js$|@mastra\\/core\\/(?:workflows|mastra)$|@mastra\\/libsql$/ },
          ({ path: request }) => {
            denied.push(request);
            throw new Error('COLD_ENGINE_ENTRY_DENIED:' + request);
          },
        );
      },
    });
    let database;
    let databaseClosed = false;
    let result;
    try {
      const [host, contracts] = await Promise.all([
        import(${JSON.stringify(hostStateUrl)}),
        import(${JSON.stringify(contractUrl)}),
      ]);
      database = new Database('cold-host.sqlite', { create: true, strict: true });
      const store = new host.HostStateStore(database, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      const request = contracts.parseSessionBridgeRequest({
        schema: 'VidaSessionRequest/v1',
        run_id: 'cold-run',
        workflow_id: 'task_execution',
        wave_index: 0,
        action_id: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        assignment_index: 0,
        stage_id: 'synthesize_task',
        role: 'developer',
        config_digest: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        scope_digest: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        bindings_manifest_ref: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      });
      const observation = contracts.parseSessionBridgeObservation({
        schema: 'VidaSessionObservation/v1',
        action_id: request.action_id,
        issue_id: '00000000-0000-4000-8000-000000000001',
        agent_id: 'cold-agent',
        tool_call_ref: 'cold-tool-call',
        status: 'reported_complete',
        summary: 'cold contract probe',
        output_digest: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        evidence_refs: [],
      });
      const state = contracts.parseSessionBridgeRunState({
        work_id: 'cold-work',
        attempt: 1,
        workflow_id: 'task_execution',
        scope_digest: 'scope',
        config_digest: 'config',
        selection: null,
        observations: [],
        discarded: 'unknown key',
      });
      const context = { work_id: 'cold-work', attempt: 1, scope_digest: 'scope' };
      const runId = contracts.sessionBridgeRunId(store.workspaceId, context, 'task_execution');
      result = {
        marker: 'cold-host-contract/v1',
        status: 'ok',
        denied,
        hostStore: host.HostStateStore.isHostStateStore(store),
        requestSchema: request.schema,
        observationStatus: observation.status,
        unknownKeyStripped: !Object.hasOwn(state, 'discarded'),
        runId,
      };
    } catch (error) {
      result = {
        marker: 'cold-host-contract/v1',
        status: 'error',
        denied,
        error: error instanceof Error ? error.message : String(error),
      };
      process.exitCode = 1;
    } finally {
      if (database !== undefined) {
        try {
          database.close();
          databaseClosed = true;
        } catch (error) {
          result = {
            marker: 'cold-host-contract/v1',
            status: 'close-error',
            denied,
            error: error instanceof Error ? error.message : String(error),
          };
          process.exitCode = 1;
        }
      }
    }
    if (result && typeof result === 'object') result.databaseClosed = databaseClosed;
    process.stdout.write(JSON.stringify(result));
  `;
  let retain = true;
  try {
    const budget = executionBudget(4_750, 250);
    const raw = boundedSpawnSync(
      spawnSync,
      process.execPath,
      ['-e', source],
      {
        cwd: root,
        encoding: 'utf8',
        windowsHide: true,
        env: pinnedEnvironment(process.execPath, process.env, packageRoot),
        timeout: 4_500,
        budget,
        diagnostics: true,
      },
      'cold HostState contract import',
    );
    const child = requireTerminalCommand(raw, 'cold HostState contract import');
    expect(child.status, String(child.stdout) + String(child.stderr)).toBe(0);
    expect(typeof child.stdout).toBe('string');
    const output: unknown = JSON.parse(child.stdout as string);
    expect(output).toEqual({
      marker: 'cold-host-contract/v1',
      status: 'ok',
      denied: [],
      hostStore: true,
      requestSchema: 'VidaSessionRequest/v1',
      observationStatus: 'reported_complete',
      unknownKeyStripped: true,
      runId: contracts.sessionBridgeRunId(
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        { work_id: 'cold-work', attempt: 1, scope_digest: 'scope' },
        'task_execution',
      ),
      databaseClosed: true,
    });
    retain = false;
  } finally {
    if (!retain) rmSync(root, { recursive: true, force: true });
    else console.error(`Retained failed cold HostState fixture: ${root}`);
  }
});

test('session bridge run identity is deterministic and owned by the pure contract', () => {
  expect(Object.hasOwn(contracts, 'sessionBridgeRunId')).toBe(true);
  const workspaceId = 'a'.repeat(64);
  const context = { work_id: 'run-id-work', attempt: 3, scope_digest: 'b'.repeat(64) };
  const runId = contracts.sessionBridgeRunId(workspaceId, context, 'task_execution');
  expect(runId).toBe(contracts.sessionBridgeRunId(workspaceId, context, 'task_execution'));
  expect(bridge.sessionBridgeRunId).toBe(contracts.sessionBridgeRunId);
  expect(bridge.sessionBridgeRunId(workspaceId, context, 'task_execution')).toBe(runId);
  expect(contracts.sessionBridgeRunId('c'.repeat(64), context, 'task_execution')).not.toBe(runId);
  expect(contracts.sessionBridgeRunId(workspaceId, { ...context, work_id: 'other-work' }, 'task_execution')).not.toBe(
    runId,
  );
  expect(
    contracts.sessionBridgeRunId(workspaceId, { ...context, attempt: context.attempt + 1 }, 'task_execution'),
  ).not.toBe(runId);
  expect(
    contracts.sessionBridgeRunId(workspaceId, { ...context, scope_digest: 'd'.repeat(64) }, 'task_execution'),
  ).not.toBe(runId);
  expect(contracts.sessionBridgeRunId(workspaceId, context, 'different_workflow')).not.toBe(runId);
});
