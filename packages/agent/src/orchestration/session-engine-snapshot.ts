import { Database } from 'bun:sqlite';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { AgentRuntimeConfig, WorkItemSelection } from '../config/runtime-config.js';
import type { WorkState } from '../host-state.js';
import { runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import {
  parseSessionBridgeRequest,
  parseSessionBridgeRunState,
  type SessionBridgeSnapshot,
} from './mastra-session-bridge.js';
import type { SessionHandoffContext } from './session-handoff.js';
import { sessionActionsForWave } from './session-handoff.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { compileDevelopmentWorkflow } from './workflow-plan.js';
import type { CorrectiveExecution } from './final-assurance.js';

export interface SessionEngineBinding {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly selection: WorkItemSelection;
  readonly context: SessionHandoffContext;
  readonly workflowId: string;
  readonly runId: string;
  readonly correctiveExecution?: CorrectiveExecution | undefined;
}

/** Positive absence proof for unstarted preparation, called under the Host producer fence.
 * A missing file, correction or unidentified row is not an absence proof.
 */
export function assertUnpreparedSessionEngineAbsent(input: {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly hostDatabase: Database;
  readonly workspaceId: string;
  readonly work: WorkState;
  readonly attempt: number;
}): void {
  const { repositoryRoot, config, hostDatabase, workspaceId, work, attempt } = input;
  const workId = work.binding.lifecycle_work_id;
  requireEngine(Number.isSafeInteger(attempt) && attempt > 0, 'preparation attempt invalid');
  const historyTable = hostDatabase
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_corrective_recovery'")
    .get();
  const history = historyTable
    ? hostDatabase
        .query('SELECT 1 FROM agent_host_corrective_recovery WHERE workspace_id=? AND work_id=? LIMIT 1')
        .get(workspaceId, workId)
    : null;
  requireEngine(
    !history && work.lifecycle.assurance.correction_count === 0,
    'corrected preparation is outside recovery scope',
  );
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const relative = config.control.work_root + '/mastra-workflows.v1.sqlite';
  requireEngine(access.fileExists(relative, 'existing preparation engine'), 'preparation engine unavailable');
  const target = path.join(repositoryRoot, relative),
    before = lstatSync(target);
  requireEngine(before.isFile() && !before.isSymbolicLink() && before.nlink === 1, 'preparation engine path unsafe');
  const database = new Database(target, { readonly: true, strict: true });
  try {
    requireEngine(
      database
        .query('PRAGMA quick_check')
        .all()
        .every((row) => Object.values(row as Record<string, unknown>)[0] === 'ok'),
      'preparation engine corrupt',
    );
    const columns = database.query('PRAGMA table_info(mastra_workflow_snapshot)').all() as { name: string }[];
    requireEngine(
      ['workflow_name', 'run_id', 'snapshot'].every((name) => columns.some((column) => column.name === name)),
      'preparation engine schema missing',
    );
    // ponytail: refuse histories above 256 rows/8 MiB; use a paged owner census if healthy history reaches this ceiling.
    const count = database
      .query(
        'SELECT count(*) AS count, coalesce(sum(length(CAST(snapshot AS BLOB))),0) AS bytes FROM mastra_workflow_snapshot',
      )
      .get() as { count: number; bytes: number };
    requireEngine(
      Number.isSafeInteger(count.count) && count.count >= 0 && count.count <= 256,
      'preparation engine census exceeds bound',
    );
    requireEngine(
      Number.isSafeInteger(count.bytes) && count.bytes >= 0 && count.bytes <= 8 * 1024 * 1024,
      'preparation engine census bytes exceed bound',
    );
    const rows = database.query('SELECT workflow_name,run_id,snapshot FROM mastra_workflow_snapshot').all() as {
      workflow_name: string;
      run_id: string;
      snapshot: string;
    }[];
    let bytes = 0;
    for (const row of rows) {
      bytes += Buffer.byteLength(row.snapshot);
      requireEngine(bytes <= 8 * 1024 * 1024, 'preparation engine census bytes exceed bound');
      const persisted = JSON.parse(row.snapshot),
        state = parseSessionBridgeRunState(persisted.context?.input);
      requireEngine(
        persisted.runId === row.run_id &&
          ['success', 'failed', 'canceled', 'suspended'].includes(persisted.status) &&
          state.workflow_id === row.workflow_name &&
          Number.isSafeInteger(state.attempt) &&
          state.attempt > 0 &&
          typeof state.work_id === 'string' &&
          state.work_id.length > 0,
        'preparation engine row identity differs',
      );
      requireEngine(
        row.run_id !== work.execution.run_id && state.work_id !== workId,
        'preparation has a surviving engine run',
      );
    }
  } finally {
    database.close();
    const after = lstatSync(target);
    requireEngine(
      after.isFile() &&
        !after.isSymbolicLink() &&
        after.nlink === 1 &&
        after.dev === before.dev &&
        after.ino === before.ino,
      'preparation engine substituted',
    );
  }
}

function requireEngine(value: unknown, message: string): asserts value {
  if (!value) throw new Error('Session engine: ' + message);
}

/** Existing-file inspection only; never constructs LibSQL, initializes tables or creates a run. */
export function readSessionEngineSnapshot(binding: SessionEngineBinding): SessionBridgeSnapshot | null {
  const { repositoryRoot, config, selection, context, workflowId, runId } = binding;
  const relative = config.control.work_root + '/mastra-workflows.v1.sqlite';
  const access = requireSafeRepositoryAccess(repositoryRoot);
  if (!access.fileExists(relative, 'persisted session engine')) return null;
  const target = path.join(repositoryRoot, relative),
    before = lstatSync(target);
  requireEngine(before.isFile() && !before.isSymbolicLink() && before.nlink === 1, 'database path is unsafe');
  const database = new Database(target, { readonly: true, strict: true });
  try {
    requireEngine(
      database.query("SELECT name FROM sqlite_master WHERE name='mastra_workflow_snapshot' AND type='table'").get(),
      'snapshot table is missing',
    );
    const rows = database
      .query('SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
      .all(runId) as { workflow_name: string; run_id: string; snapshot: string }[];
    if (rows.length === 0) return null;
    requireEngine(rows.length === 1 && rows[0]!.workflow_name === workflowId, 'run identity is ambiguous or foreign');
    const persisted = JSON.parse(rows[0]!.snapshot);
    requireEngine(
      persisted && persisted.runId === runId && persisted.context && !Array.isArray(persisted.context),
      'snapshot identity is invalid',
    );
    const parseState = (value: unknown) => {
      const state = parseSessionBridgeRunState(value);
      requireEngine(
        isDeepStrictEqual(state, value) &&
          state.work_id === context.work_id &&
          state.attempt === context.attempt &&
          state.workflow_id === workflowId &&
          state.scope_digest === context.scope_digest &&
          state.config_digest === runtimeConfigDigest(config) &&
          isDeepStrictEqual(state.selection, selection),
        'run context differs',
      );
      return state;
    };
    const input = parseState(persisted.context.input);
    requireEngine(input.observations.length === 0, 'initial observations are not empty');
    const suspended = Object.entries(persisted.context).filter(
      ([key, step]) => /^wave-\d+$/.test(key) && (step as { status?: string })?.status === 'suspended',
    );
    const terminal = ['success', 'failed', 'canceled'].includes(persisted.status);
    requireEngine(
      terminal ? suspended.length === 0 : persisted.status === 'suspended' && suspended.length === 1,
      'frontier is unknown or inconsistent',
    );
    const step = suspended[0];
    const frontier = step?.[1] as { payload?: unknown; suspendPayload?: { requests?: unknown[] } } | undefined;
    const state = parseState(
      persisted.status === 'success' ? persisted.result : (frontier?.payload ?? persisted.context.input),
    );
    requireEngine(
      state.observations.every(
        (observation) => observation.output_digest === canonicalJsonDigest(observation.summary),
      ) && new Set(state.observations.map((observation) => observation.action_id)).size === state.observations.length,
      'observations differ or are duplicated',
    );
    const requests = frontier?.suspendPayload?.requests?.map(parseSessionBridgeRequest) ?? [];
    requireEngine(terminal ? requests.length === 0 : requests.length > 0, 'suspended requests are missing');
    requireEngine(
      requests.every(
        (request) =>
          request.run_id === runId &&
          request.workflow_id === workflowId &&
          request.config_digest === state.config_digest &&
          request.scope_digest === context.scope_digest,
      ),
      'request context differs',
    );
    const paths = persisted.suspendedPaths ?? {};
    requireEngine(
      terminal
        ? Object.keys(paths).length === 0
        : Object.keys(paths).length === 1 &&
            Object.keys(paths)[0] === step![0] &&
            Array.isArray(paths[step![0]]) &&
            paths[step![0]].length === 1 &&
            Number.isSafeInteger(paths[step![0]][0]),
      'suspended path differs',
    );
    const correction = binding.correctiveExecution;
    const executedWaves = [
      ...compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags).waves.entries(),
    ].filter(
      ([, wave]) =>
        (!correction || wave.some((stage) => correction.stage_ids.includes(stage.id))) &&
        !wave.every((stage) => stage.assignments.length === 0),
    );
    const waveIds = Object.keys(persisted.context).filter((key) => key.startsWith('wave-'));
    const presentWaves = executedWaves.slice(0, waveIds.length);
    requireEngine(
      waveIds.length <= executedWaves.length && presentWaves.every(([index]) => waveIds.includes('wave-' + index)),
      'configured execution prefix differs',
    );
    let prior = input;
    let incomplete: string | null = null;
    for (const [position, [waveIndex]] of presentWaves.entries()) {
      const id = 'wave-' + waveIndex;
      const recorded = persisted.context[id];
      requireEngine(isDeepStrictEqual(parseState(recorded.payload), prior), 'wave payload chain differs');
      if (recorded.status !== 'success') {
        requireEngine(
          position === presentWaves.length - 1 && recorded.status === persisted.status,
          'prior wave is not successful',
        );
        incomplete = id;
        continue;
      }
      const output = parseState(recorded.output);
      const appended = output.observations.slice(prior.observations.length);
      const actions = sessionActionsForWave(config, selection, context, workflowId, waveIndex, [], correction);
      requireEngine(
        isDeepStrictEqual(output.observations.slice(0, prior.observations.length), prior.observations) &&
          appended.length === actions.length &&
          new Set(appended.map((observation) => observation.action_id)).size === actions.length &&
          actions.every((action) => appended.some((observation) => observation.action_id === action.action_id)) &&
          appended.every(
            (observation) =>
              observation.status === 'reported_complete' &&
              observation.output_digest === canonicalJsonDigest(observation.summary),
          ) &&
          isDeepStrictEqual(recorded.resumePayload?.observations, appended),
        'completed wave observations differ',
      );
      prior = output;
    }
    requireEngine(
      persisted.status === 'success'
        ? incomplete === null && waveIds.length === executedWaves.length && isDeepStrictEqual(state, prior)
        : persisted.status === 'suspended'
          ? incomplete === step![0] && isDeepStrictEqual(state, prior)
          : incomplete !== null || waveIds.length === 0,
      'terminal result or execution frontier differs',
    );
    if (step) {
      const waveIndex = Number(step[0].slice(5));
      const executionIndex = executedWaves.findIndex(([index]) => index === waveIndex);
      requireEngine(
        executionIndex >= 0 && isDeepStrictEqual(paths[step[0]], [executionIndex]),
        'configured suspended execution path differs',
      );
      const actions = sessionActionsForWave(config, selection, context, workflowId, waveIndex, [], correction);
      requireEngine(
        actions.length === requests.length &&
          actions.every((action, index) => {
            const request = requests[index]!;
            return (
              request.wave_index === waveIndex &&
              request.action_id === action.action_id &&
              request.stage_id === action.stage_id &&
              request.assignment_index === action.assignment_index &&
              request.role === action.role &&
              isDeepStrictEqual(request.corrective_execution, correction) &&
              request.bindings_manifest_ref ===
                canonicalJsonDigest({
                  config_digest: state.config_digest,
                  scope_digest: context.scope_digest,
                  work_id: context.work_id,
                  attempt: context.attempt,
                  action_id: action.action_id,
                  stage_id: action.stage_id,
                  configured_context_digest: request.configured_context_digest ?? null,
                  wave_index: waveIndex,
                  prior_results: state.observations.map((observation) => observation.output_digest),
                })
            );
          }),
        'configured frontier requests differ',
      );
    }
    return {
      run_id: runId,
      status: persisted.status,
      step_id: step?.[0] ?? null,
      requests,
      observations: state.observations,
    };
  } finally {
    database.close();
    const after = lstatSync(target);
    requireEngine(
      after.isFile() &&
        !after.isSymbolicLink() &&
        after.nlink === 1 &&
        after.dev === before.dev &&
        after.ino === before.ino,
      'database was substituted',
    );
  }
}
