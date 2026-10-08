import { Database } from 'bun:sqlite';
import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { AgentRuntimeConfig, WorkItemSelection } from '../config/runtime-config.js';
import type { DeliveredWorkContinuationReceipt, WorkState } from '../host-state.js';
import { runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import {
  buildSessionBridgeRequest,
  configuredContextForStage,
  parseSessionBridgeRequest,
  parseSessionBridgeObservation,
  parseSessionBridgeRunState,
  type SessionBridgeSnapshot,
  type SessionBridgeRequest,
} from './mastra-session-bridge.js';
import type { SessionHandoffContext } from './session-handoff.js';
import { sessionActionsForWave } from './session-handoff.js';
import { canonicalJson, canonicalJsonDigest } from '../contracts/public-ingress.js';
import { compileDevelopmentWorkflow, type WorkflowLifecycleRisk } from './workflow-plan.js';
import type { CorrectiveExecution } from './final-assurance.js';
import type { MastraSessionLedgerState } from './persistent-session-handoff.js';
import {
  projectConfiguredPrewriterContinuationRequests,
} from './delivered-work-continuation.js';
import type { ConfiguredFrontierReceipt } from './delivered-work-continuation-repair.js';

export interface SessionEngineBinding {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly selection: WorkItemSelection;
  readonly context: SessionHandoffContext;
  readonly workflowId: string;
  readonly runId: string;
  readonly lifecycleRisk?: WorkflowLifecycleRisk;
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
    const decoded = database
      .query(
        'SELECT coalesce(sum(json_valid(snapshot,9) IS NOT 1),0) AS invalid, ' +
          'coalesce(sum(length(CAST(CASE WHEN json_valid(snapshot,9)=1 THEN json(snapshot) END AS BLOB))),0) AS bytes ' +
          'FROM mastra_workflow_snapshot',
      )
      .get() as { invalid: number; bytes: number };
    requireEngine(decoded.invalid === 0, 'preparation engine snapshot encoding invalid');
    requireEngine(
      Number.isSafeInteger(decoded.bytes) && decoded.bytes >= 0 && decoded.bytes <= 8 * 1024 * 1024,
      'preparation engine decoded census bytes exceed bound',
    );
    const rows = database
      .query('SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot')
      .all() as {
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
    database.close(true);
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

function hasExactKeys(value: unknown, expected: string): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === expected
  );
}

function validRetainedSourceScope(value: unknown): value is NonNullable<MastraSessionLedgerState['source_scope']> {
  if (!hasExactKeys(value, 'digest,entries,schema')) return false;
  const scope = value as NonNullable<MastraSessionLedgerState['source_scope']>;
  return (
    scope.schema === 'ScopedSourceSnapshot/v1' &&
    /^[a-f0-9]{64}$/.test(scope.digest) &&
    Array.isArray(scope.entries) &&
    scope.entries.length > 0 &&
    scope.entries.length <= 512 &&
    scope.entries.every(
      (entry, index) =>
        hasExactKeys(entry, 'bytes,exists,path,sha256') &&
        typeof entry.path === 'string' &&
        entry.path.length > 0 &&
        entry.path.length <= 512 &&
        !entry.path.includes('\\') &&
        !entry.path.startsWith('/') &&
        !entry.path.endsWith('/') &&
        !/^[A-Za-z]:/.test(entry.path) &&
        !/[\u0000-\u001f\u007f]/.test(entry.path) &&
        entry.path.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..') &&
        (index === 0 || scope.entries[index - 1]!.path < entry.path) &&
        typeof entry.exists === 'boolean' &&
        (entry.exists
          ? Number.isSafeInteger(entry.bytes) && (entry.bytes as number) >= 0 && typeof entry.sha256 === 'string' && /^[a-f0-9]{64}$/.test(entry.sha256)
          : entry.bytes === null && entry.sha256 === null),
    ) &&
    scope.digest === canonicalJsonDigest({ schema: scope.schema, entries: scope.entries })
  );
}

export interface RetainedTerminalSessionEngineSnapshot {
  readonly schema: 'RetainedTerminalSessionEngineSnapshot/v1';
  readonly run_id: string;
  readonly workflow_id: string;
  readonly prior_config_digest: string;
  readonly prior_scope_digest: string;
  readonly snapshot_digest: string;
  readonly observations: readonly SessionBridgeSnapshot['observations'][number][];
}

/**
 * Read the original successful Mastra run for a Host-retained historical
 * continuation. This deliberately accepts the old binding from the checked
 * Host receipt; it never opens Mastra storage or changes the old snapshot.
 */
export function readRetainedTerminalSessionEngineSnapshot(
  binding: SessionEngineBinding,
  receipt: DeliveredWorkContinuationReceipt,
): RetainedTerminalSessionEngineSnapshot {
  const prior = receipt.prior_journal,
    work = receipt.prior_work,
    request = receipt.request,
    action = request.action;
  requireEngine(
    receipt.schema === 'DeliveredWorkContinuationReceipt/v1' &&
      receipt.status === 'action_ready' &&
      action.kind === 'historical_terminal_review' &&
      request.schema === 'DeliveredWorkContinuationRequest/v1' &&
      receipt.attempt === request.attempt &&
      binding.context.work_id === request.identity.work_id &&
      binding.context.attempt === request.attempt &&
      binding.context.scope_digest === request.currentSourceScope.digest &&
      binding.workflowId === action.workflow_id &&
      binding.runId === work.execution.run_id &&
      work.execution.run_id === prior.run_id &&
      work.binding.workflow_id === action.workflow_id &&
      work.binding.config_digest === request.priorConfigDigest &&
      work.binding.work_source_revision === prior.source_scope?.digest &&
      runtimeConfigDigest(binding.config) === request.targetConfigDigest &&
      prior.corrective_execution == null &&
      prior.research_wave_exposure === undefined &&
      prior.items.length === 0 &&
      prior.step_id === null &&
      prior.completed.length > 0,
    'retained terminal Host/Journal binding differs',
  );
  const priorRequests = prior.completed.flatMap((wave) => wave.items.map((item) => item.request));
  requireEngine(
    priorRequests.length > 0 &&
      priorRequests.every(
        (item) =>
          item.run_id === prior.run_id &&
          item.workflow_id === action.workflow_id &&
          item.config_digest === request.priorConfigDigest &&
          item.scope_digest === prior.source_scope?.digest,
      ) &&
      prior.completed.every((wave) =>
        wave.items.every(
          (item) =>
            item.issue_id !== null &&
            item.observation !== null &&
            item.host_reservation === undefined &&
            item.research_activation === undefined &&
            item.research_normalization === undefined,
        ),
      ),
    'retained terminal journal contains unresolved or foreign actions',
  );

  const relative = binding.config.control.work_root + '/mastra-workflows.v1.sqlite';
  const access = requireSafeRepositoryAccess(binding.repositoryRoot);
  requireEngine(access.fileExists(relative, 'retained terminal engine'), 'retained terminal engine unavailable');
  const target = path.join(binding.repositoryRoot, relative),
    before = lstatSync(target);
  requireEngine(before.isFile() && !before.isSymbolicLink() && before.nlink === 1, 'database path is unsafe');
  const database = new Database(target, { readonly: true, strict: true });
  try {
    requireEngine(
      database
        .query('PRAGMA quick_check')
        .all()
        .every((row) => Object.values(row as Record<string, unknown>)[0] === 'ok'),
      'retained terminal engine corrupt',
    );
    requireEngine(
      database.query("SELECT name FROM sqlite_master WHERE name='mastra_workflow_snapshot' AND type='table'").get(),
      'snapshot table is missing',
    );
    const rows = database
      .query('SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
      .all(prior.run_id) as { workflow_name: string; run_id: string; snapshot: string }[];
    requireEngine(
      rows.length === 1 && rows[0]!.workflow_name === action.workflow_id && rows[0]!.run_id === prior.run_id,
      'retained terminal engine identity is missing or ambiguous',
    );
    const persisted = JSON.parse(rows[0]!.snapshot) as Record<string, any>;
    requireEngine(
      persisted &&
        persisted.runId === prior.run_id &&
        persisted.status === 'success' &&
        persisted.context &&
        typeof persisted.context === 'object' &&
        !Array.isArray(persisted.context) &&
        Object.keys(persisted.suspendedPaths ?? {}).length === 0,
      'retained original run is not a successful terminal snapshot',
    );
    const parsePriorState = (value: unknown) => {
      const state = parseSessionBridgeRunState(value);
      requireEngine(
        isDeepStrictEqual(state, value) &&
          state.work_id === request.identity.work_id &&
          state.attempt === request.attempt &&
          state.workflow_id === action.workflow_id &&
          state.scope_digest === prior.source_scope?.digest &&
          state.config_digest === request.priorConfigDigest &&
          isDeepStrictEqual(state.selection, binding.selection),
        'retained terminal run context differs',
      );
      return state;
    };
    let state = parsePriorState(persisted.context.input);
    requireEngine(state.observations.length === 0, 'retained terminal initial observations are not empty');
    const waveIds = Object.keys(persisted.context).filter((key) => /^wave-\d+$/.test(key));
    requireEngine(waveIds.length === prior.completed.length, 'retained terminal wave count differs from its Journal');
    const expectedObservationIds = new Set<string>();
    for (const [position, wave] of prior.completed.entries()) {
      const row = persisted.context[wave.step_id] as Record<string, any> | undefined;
      requireEngine(
        /^wave-\d+$/.test(wave.step_id) &&
          waveIds[position] === wave.step_id &&
          row?.status === 'success' &&
          isDeepStrictEqual(parsePriorState(row.payload), state),
        'retained terminal wave prefix or input differs',
      );
      const expectedRequests = wave.items.map((item) => parseSessionBridgeRequest(item.request)),
        persistedRequests = row.suspendPayload?.requests;
      requireEngine(
        persistedRequests === undefined || (Array.isArray(persistedRequests) &&
          isDeepStrictEqual(persistedRequests.map(parseSessionBridgeRequest), expectedRequests)),
        'retained terminal original request bodies differ from Host Journal',
      );
      const observations = wave.items.map((item) => item.observation!);
      requireEngine(
        observations.every((observation) => {
          const id = observation.action_id;
          if (expectedObservationIds.has(id)) return false;
          expectedObservationIds.add(id);
          return observation.output_digest === canonicalJsonDigest(observation.summary);
        }) &&
          isDeepStrictEqual(row.resumePayload?.observations, observations),
        'retained terminal original observations differ from Host Journal',
      );
      const output = parsePriorState(row.output);
      requireEngine(
        isDeepStrictEqual(
          output.observations,
          [...state.observations, ...observations],
        ),
        'retained terminal wave output differs from Host Journal',
      );
      state = output;
    }
    const result = parsePriorState(persisted.result),
      journalObservations = prior.completed.flatMap((wave) => wave.items.map((item) => item.observation!));
    requireEngine(
      isDeepStrictEqual(result, state) && isDeepStrictEqual(result.observations, journalObservations),
      'retained terminal result differs from Host Journal',
    );
    return {
      schema: 'RetainedTerminalSessionEngineSnapshot/v1',
      run_id: prior.run_id,
      workflow_id: action.workflow_id,
      prior_config_digest: request.priorConfigDigest,
      prior_scope_digest: prior.source_scope!.digest,
      snapshot_digest: canonicalJsonDigest(persisted),
      observations: result.observations,
    };
  } finally {
    database.close(true);
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

/**
 * Read a retained, suspended prewriter run using its protected Work and Journal.
 * The supplied config identifies only the current storage location: the old
 * run's identity and behavior are checked against Work, Journal, and SQLite.
 */
export function readRetainedUnissuedSessionEngineSnapshot(
  binding: SessionEngineBinding,
  retained: { readonly work: WorkState; readonly journal: MastraSessionLedgerState },
): SessionBridgeSnapshot {
  const { work, journal } = retained,
    scope = journal.source_scope,
    oldConfigDigest = work.binding.config_digest,
    oldRunId = journal.run_id,
    oldWorkflowId = work.binding.workflow_id;
  requireEngine(
    work.schema === 'WorkState/v1' &&
      journal.schema === 'MastraSessionLedger/v1' &&
      work.workspace_id === journal.workspace_id &&
      typeof work.execution.run_id === 'string' &&
      work.execution.run_id === oldRunId &&
      typeof oldRunId === 'string' &&
      oldRunId.length > 0 &&
      typeof oldWorkflowId === 'string' &&
      oldWorkflowId.length > 0 &&
      /^[a-f0-9]{64}$/.test(oldConfigDigest) &&
      journal.work_id === work.binding.lifecycle_work_id &&
      journal.attempt === binding.context.attempt &&
      binding.context.work_id === work.binding.lifecycle_work_id &&
      binding.context.scope_digest === scope?.digest &&
      binding.workflowId === oldWorkflowId &&
      binding.runId === oldRunId &&
      journal.corrective_execution == null &&
      binding.correctiveExecution == null &&
      journal.research_wave_exposure === undefined &&
      typeof journal.step_id === 'string' &&
      Array.isArray(journal.items) &&
      journal.items.length > 0 &&
      Array.isArray(journal.completed),
    'retained unissued Host/Journal binding differs',
  );
  requireEngine(
    validRetainedSourceScope(scope) && work.binding.work_source_revision === scope.digest,
    'retained unissued source scope differs',
  );

  const access = requireSafeRepositoryAccess(binding.repositoryRoot),
    intakeRefs = work.artifacts.filter(
      (item) => item.artifact_id === 'local-session-intake' && item.schema === 'VidaLocalSessionIntake/v1',
    );
  requireEngine(intakeRefs.length === 1, 'retained unissued original intake is missing or ambiguous');
  const intakeBytes = access.readBytes(intakeRefs[0]!.path, 'retained unissued original intake');
  requireEngine(
    intakeBytes.length <= 32768 && createHash('sha256').update(intakeBytes).digest('hex') === intakeRefs[0]!.sha256,
    'retained unissued original intake changed',
  );
  const intake = JSON.parse(intakeBytes.toString('utf8')) as {
      schema?: unknown;
      risk?: unknown;
      work_item?: {
        schema?: unknown;
        id?: unknown;
        canonical_kind?: unknown;
        intent?: unknown;
        project_id?: unknown;
        risk_flags?: unknown;
        labels?: unknown;
      };
    },
    item = intake.work_item;
  requireEngine(
    intake.schema === 'VidaLocalSessionIntake/v1' &&
      intake.risk === work.lifecycle.risk &&
      item?.schema === 'WorkItem/v1' &&
      item.id === work.binding.lifecycle_work_id &&
      typeof item.canonical_kind === 'string' &&
      typeof item.intent === 'string' &&
      typeof item.project_id === 'string' &&
      Array.isArray(item.risk_flags) &&
      Array.isArray(item.labels) &&
      work.binding.project_ids.includes(item.project_id) &&
      canonicalJsonDigest(item) === work.binding.work_item_digest,
    'retained unissued original selection source differs',
  );
  const oldSelection: WorkItemSelection = {
    team: work.binding.team_id,
    kind: item.canonical_kind as WorkItemSelection['kind'],
    intent: item.intent as WorkItemSelection['intent'],
    project: item.project_id,
    risk_flags: item.risk_flags as string[],
    labels: item.labels as string[],
  };
  requireEngine(isDeepStrictEqual(binding.selection, oldSelection), 'retained unissued original selection differs');

  const stepMatch = /^wave-(\d+)$/.exec(journal.step_id);
  requireEngine(stepMatch, 'retained unissued developer step identity is invalid');
  const frontierWaveIndex = Number(stepMatch[1]);
  requireEngine(Number.isSafeInteger(frontierWaveIndex), 'retained unissued developer step index is invalid');
  const previousWaveIndexes: number[] = [];
  for (const [position, wave] of journal.completed.entries()) {
    const match = /^wave-(\d+)$/.exec(wave.step_id), index = match ? Number(match[1]) : Number.NaN;
    requireEngine(
      match &&
        Number.isSafeInteger(index) &&
        index < frontierWaveIndex &&
        (position === 0 || index > previousWaveIndexes[position - 1]!),
      'retained unissued completed wave order differs',
    );
    previousWaveIndexes.push(index);
  }
  requireEngine(
    journal.items.every(
      (entry) =>
        entry.issue_id === null &&
        entry.observation === null &&
        entry.host_reservation === undefined &&
        entry.research_activation === undefined &&
        entry.research_normalization === undefined &&
        entry.request.corrective_execution === undefined,
    ),
    'retained unissued frontier contains issued, observed, reserved, or corrective work',
  );

  const relative = binding.config.control.work_root + '/mastra-workflows.v1.sqlite';
  requireEngine(access.fileExists(relative, 'retained unissued engine'), 'retained unissued engine unavailable');
  const target = path.join(binding.repositoryRoot, relative),
    before = lstatSync(target);
  requireEngine(before.isFile() && !before.isSymbolicLink() && before.nlink === 1, 'database path is unsafe');
  const database = new Database(target, { readonly: true, strict: true });
  try {
    requireEngine(
      database
        .query('PRAGMA quick_check')
        .all()
        .every((row) => Object.values(row as Record<string, unknown>)[0] === 'ok'),
      'retained unissued engine corrupt',
    );
    const columns = database.query('PRAGMA table_info(mastra_workflow_snapshot)').all() as { name: string }[];
    requireEngine(
      ['workflow_name', 'run_id', 'snapshot'].every((name) => columns.some((column) => column.name === name)),
      'retained unissued snapshot table is missing or malformed',
    );
    const stored = database
      .query(
        'SELECT count(*) AS count, coalesce(sum(length(CAST(snapshot AS BLOB))),0) AS bytes FROM mastra_workflow_snapshot',
      )
      .get() as { count: number; bytes: number };
    requireEngine(
      Number.isSafeInteger(stored.count) && stored.count >= 0 && stored.count <= 256,
      'retained unissued engine census exceeds bound',
    );
    requireEngine(
      Number.isSafeInteger(stored.bytes) && stored.bytes >= 0 && stored.bytes <= 8 * 1024 * 1024,
      'retained unissued engine census bytes exceed bound',
    );
    const decoded = database
      .query(
        'SELECT coalesce(sum(json_valid(snapshot,9) IS NOT 1),0) AS invalid, ' +
          'coalesce(sum(length(CAST(CASE WHEN json_valid(snapshot,9)=1 THEN json(snapshot) END AS BLOB))),0) AS bytes ' +
          'FROM mastra_workflow_snapshot',
      )
      .get() as { invalid: number; bytes: number };
    requireEngine(decoded.invalid === 0, 'retained unissued engine snapshot encoding invalid');
    requireEngine(
      Number.isSafeInteger(decoded.bytes) && decoded.bytes >= 0 && decoded.bytes <= 8 * 1024 * 1024,
      'retained unissued engine decoded census exceeds bound',
    );
    const rows = database
      .query('SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
      .all(oldRunId) as { workflow_name: string; run_id: string; snapshot: string }[];
    requireEngine(
      rows.length === 1 && rows[0]!.workflow_name === oldWorkflowId && rows[0]!.run_id === oldRunId,
      'retained unissued engine identity is missing or ambiguous',
    );
    requireEngine(Buffer.byteLength(rows[0]!.snapshot) <= 8 * 1024 * 1024, 'retained unissued snapshot exceeds bound');
    const persisted = JSON.parse(rows[0]!.snapshot) as Record<string, any>;
    requireEngine(
      persisted &&
        persisted.runId === oldRunId &&
        persisted.status === 'suspended' &&
        persisted.context &&
        typeof persisted.context === 'object' &&
        !Array.isArray(persisted.context),
      'retained original run is not a suspended snapshot',
    );
    const parsePriorState = (value: unknown) => {
      const state = parseSessionBridgeRunState(value);
      requireEngine(
        isDeepStrictEqual(state, value) &&
          state.work_id === work.binding.lifecycle_work_id &&
          state.attempt === journal.attempt &&
          state.workflow_id === oldWorkflowId &&
          state.scope_digest === scope.digest &&
          state.config_digest === oldConfigDigest &&
          isDeepStrictEqual(state.selection, oldSelection) &&
          state.observations.every((observation) => observation.output_digest === canonicalJsonDigest(observation.summary)) &&
          new Set(state.observations.map((observation) => observation.action_id)).size === state.observations.length,
        'retained unissued run context differs',
      );
      return state;
    };
    const input = parsePriorState(persisted.context.input);
    requireEngine(input.observations.length === 0, 'retained unissued initial observations are not empty');
    const waveIds = Object.keys(persisted.context).filter((key) => key.startsWith('wave-'));
    const expectedWaveIds = [...journal.completed.map((wave) => wave.step_id), journal.step_id];
    requireEngine(
      waveIds.length === expectedWaveIds.length &&
        [...waveIds].sort((left, right) => Number(left.slice(5)) - Number(right.slice(5))).every((id, index) =>
          /^wave-\d+$/.test(id) && id === expectedWaveIds[index],
        ),
      'retained unissued wave count or prefix differs from Journal',
    );
    let state = input;
    const expectedActionIds = new Set<string>();
    const verifyRequests = (
      candidates: readonly unknown[],
      waveIndex: number,
      priorState: typeof state,
      developer: boolean,
    ) => {
      const requests = candidates.map((candidate) => {
        const parsed = parseSessionBridgeRequest(candidate);
        requireEngine(isDeepStrictEqual(parsed, candidate), 'retained unissued request body is not canonical');
        requireEngine(
          parsed.run_id === oldRunId &&
            parsed.workflow_id === oldWorkflowId &&
            parsed.wave_index === waveIndex &&
            parsed.config_digest === oldConfigDigest &&
            parsed.scope_digest === scope.digest &&
            parsed.corrective_execution === undefined &&
            parsed.bindings_manifest_ref ===
              canonicalJsonDigest({
                config_digest: oldConfigDigest,
                scope_digest: scope.digest,
                work_id: work.binding.lifecycle_work_id,
                attempt: journal.attempt,
                action_id: parsed.action_id,
                stage_id: parsed.stage_id,
                configured_context_digest: parsed.configured_context_digest ?? null,
                wave_index: waveIndex,
                prior_results: priorState.observations.map((observation) => observation.output_digest),
              }) &&
            (!developer || parsed.role === 'developer-orchestrator'),
          'retained unissued request binding or hash differs',
        );
        requireEngine(!expectedActionIds.has(parsed.action_id), 'retained unissued action identity is duplicated');
        expectedActionIds.add(parsed.action_id);
        return parsed;
      });
      return requests;
    };
    for (const wave of journal.completed) {
      const waveIndex = Number(wave.step_id.slice(5)),
        row = persisted.context[wave.step_id] as Record<string, any> | undefined;
      requireEngine(
        row?.status === 'success' &&
          Array.isArray(wave.items) &&
          wave.items.length > 0 &&
          isDeepStrictEqual(parsePriorState(row.payload), state),
        'retained unissued completed wave or input differs',
      );
      const requests = verifyRequests(
          wave.items.map((entry) => entry.request),
          waveIndex,
          state,
          false,
        ),
        persistedRequests = row.suspendPayload?.requests;
      requireEngine(
        persistedRequests === undefined || (Array.isArray(persistedRequests) && isDeepStrictEqual(persistedRequests.map(parseSessionBridgeRequest), requests)),
        'retained unissued completed request bodies differ from Journal',
      );
      const observations = wave.items.map((entry) => {
        requireEngine(
          entry.issue_id !== null &&
            entry.observation !== null &&
            entry.host_reservation === undefined &&
            entry.request.corrective_execution === undefined,
          'retained unissued completed prefix contains unresolved or corrective actions',
        );
        const observation = parseSessionBridgeObservation(entry.observation);
        requireEngine(
          isDeepStrictEqual(observation, entry.observation) &&
            observation.issue_id === entry.issue_id &&
            observation.action_id === entry.request.action_id &&
            observation.status === 'reported_complete' &&
            observation.output_digest === canonicalJsonDigest(observation.summary),
          'retained unissued completed observation differs from Journal',
        );
        return observation;
      });
      requireEngine(
        Array.isArray(row.resumePayload?.observations) &&
          isDeepStrictEqual(row.resumePayload.observations.map(parseSessionBridgeObservation), observations),
        'retained unissued completed resume bodies differ from Journal',
      );
      const output = parsePriorState(row.output),
        expectedOutput = { ...state, observations: [...state.observations, ...observations] };
      requireEngine(
        observations.length === wave.items.length && isDeepStrictEqual(output, expectedOutput),
        'retained unissued completed output differs from Journal',
      );
      state = output;
    }
    const frontier = persisted.context[journal.step_id] as Record<string, any> | undefined,
      waveIndex = frontierWaveIndex,
      requests = verifyRequests(
        journal.items.map((entry) => entry.request),
        waveIndex,
        state,
        true,
      ),
      persistedRequests = frontier?.suspendPayload?.requests,
      paths = persisted.suspendedPaths;
    requireEngine(
      frontier?.status === 'suspended' &&
        isDeepStrictEqual(parsePriorState(frontier.payload), state) &&
        !Object.hasOwn(frontier, 'resumePayload') &&
        !Object.hasOwn(frontier, 'output') &&
        requests.length === 1 &&
        requests.every((request) => request.stage_id === requests[0]!.stage_id) &&
        Array.isArray(persistedRequests) &&
        isDeepStrictEqual(persistedRequests.map(parseSessionBridgeRequest), requests),
      'retained unissued suspended developer step differs from Journal',
    );
    requireEngine(
      paths &&
        typeof paths === 'object' &&
        !Array.isArray(paths) &&
        Object.keys(paths).length === 1 &&
        Object.keys(paths)[0] === journal.step_id &&
        Array.isArray(paths[journal.step_id]) &&
        paths[journal.step_id].length === 1 &&
        Number.isSafeInteger(paths[journal.step_id][0]) &&
        paths[journal.step_id][0] >= 0,
      'retained unissued suspended path differs',
    );
    requireEngine(
      isDeepStrictEqual(state.observations, journal.completed.flatMap((wave) => wave.items.map((item) => item.observation!))),
      'retained unissued observation count differs from Journal prefix',
    );
    return {
      run_id: oldRunId,
      status: 'suspended',
      step_id: journal.step_id,
      requests,
      observations: state.observations,
    };
  } finally {
    database.close(true);
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

/**
 * Read the configured-graph continuation while retaining the original Mastra
 * run. The old graph is accepted only as the persisted input and completed
 * prefix; the replacement prewriter wave and every later wave use the current
 * configuration and source scope.
 */
export function readConfiguredContinuationSessionEngineSnapshot(
  binding: SessionEngineBinding,
  receipt: ConfiguredFrontierReceipt,
): SessionBridgeSnapshot {
  requireEngine(
    receipt?.schema === 'DeliveredWorkContinuationReceipt/v1' &&
      receipt.status === 'action_ready' && receipt.rights_granted === false &&
      receipt.accepted_result === false && receipt.runtime_acceptance === false &&
      receipt.historical_capture === null && receipt.request?.schema === 'DeliveredWorkContinuationRequest/v1' &&
      receipt.request_digest === canonicalJsonDigest(receipt.request) &&
      receipt.authorization?.request_digest === receipt.request_digest &&
      receipt.authorization.action_digest === canonicalJsonDigest(receipt.request.action) &&
      receipt.authorization.transition_digest === receipt.request.sourceTransition.transition_digest &&
      receipt.attempt === receipt.request.attempt &&
      receipt.frontier_snapshot !== undefined &&
      hasExactKeys(receipt.frontier_snapshot, 'snapshot_bytes_base64,snapshot_sha256') &&
      typeof receipt.frontier_snapshot.snapshot_bytes_base64 === 'string' &&
      /^[a-f0-9]{64}$/.test(receipt.frontier_snapshot.snapshot_sha256),
    'configured continuation receipt identity or integrity binding differs',
  );
  const request = receipt.request;
  requireEngine(request.action.kind === 'configured_frontier', 'configured continuation action differs');
  const action = request.action,
    priorWork = receipt.prior_work,
    priorJournal = receipt.prior_journal,
    priorScope = priorJournal.source_scope,
    oldRunId = priorWork.execution.run_id,
    boundaryWave = action.request.wave_index,
    boundaryStep = 'wave-' + boundaryWave,
    currentScope = request.currentSourceScope,
    currentConfigDigest = runtimeConfigDigest(binding.config);
  requireEngine(
    typeof oldRunId === 'string' && oldRunId.length > 0 &&
      binding.runId === oldRunId &&
      binding.context.work_id === request.identity.work_id &&
      binding.context.attempt === receipt.attempt &&
      binding.context.scope_digest === currentScope.digest &&
      binding.workflowId === action.workflow_id &&
      currentConfigDigest === request.targetConfigDigest &&
      priorWork.binding.config_digest === request.priorConfigDigest &&
      priorWork.execution.run_id === priorJournal.run_id &&
      priorWork.binding.work_source_revision === priorScope?.digest &&
      validRetainedSourceScope(priorScope) &&
      priorJournal.corrective_execution == null &&
      binding.correctiveExecution == null &&
      priorJournal.research_wave_exposure === undefined &&
      Number.isSafeInteger(boundaryWave) && boundaryWave >= 0 &&
      priorJournal.completed.length === boundaryWave,
    'configured continuation Host, run or graph binding differs',
  );
  const priorBinding: SessionEngineBinding = {
    ...binding,
    context: { work_id: request.identity.work_id, attempt: receipt.attempt, scope_digest: priorScope.digest },
    workflowId: action.workflow_id,
    runId: oldRunId,
    lifecycleRisk: priorWork.lifecycle.risk,
  };
  const beforeImageBytes = Buffer.from(receipt.frontier_snapshot.snapshot_bytes_base64, 'base64');
  requireEngine(
    beforeImageBytes.toString('base64') === receipt.frontier_snapshot.snapshot_bytes_base64 &&
      createHash('sha256').update(beforeImageBytes).digest('hex') === receipt.frontier_snapshot.snapshot_sha256,
    'configured continuation immutable beforeimage encoding or digest differs',
  );
  const beforeImageText = beforeImageBytes.toString('utf8'),
    beforeImageValue = JSON.parse(beforeImageText) as Record<string, unknown>;
  requireEngine(
    canonicalJson(beforeImageValue) === beforeImageText &&
      hasExactKeys(beforeImageValue, 'observations,requests,run_id,status,step_id') &&
      beforeImageValue.run_id === oldRunId &&
      beforeImageValue.status === 'suspended' &&
      beforeImageValue.step_id === boundaryStep &&
      Array.isArray(beforeImageValue.requests) &&
      Array.isArray(beforeImageValue.observations),
    'configured continuation immutable beforeimage is not a normalized suspended snapshot',
  );
  const normalizedBeforeImage: SessionBridgeSnapshot = {
    run_id: oldRunId,
    status: 'suspended',
    step_id: boundaryStep,
    requests: beforeImageValue.requests.map((entry) => {
      const parsed = parseSessionBridgeRequest(entry);
      requireEngine(isDeepStrictEqual(parsed, entry), 'configured continuation beforeimage request is not canonical');
      return parsed;
    }),
    observations: beforeImageValue.observations.map((entry) => {
      const parsed = parseSessionBridgeObservation(entry);
      requireEngine(isDeepStrictEqual(parsed, entry), 'configured continuation beforeimage observation is not canonical');
      return parsed;
    }),
  };
  requireEngine(
    isDeepStrictEqual(normalizedBeforeImage, beforeImageValue) &&
      canonicalJsonDigest(normalizedBeforeImage) === receipt.request.action.engine_snapshot_digest,
    'configured continuation beforeimage digest differs from its action',
  );

  const access = requireSafeRepositoryAccess(binding.repositoryRoot),
    relative = binding.config.control.work_root + '/mastra-workflows.v1.sqlite';
  requireEngine(access.fileExists(relative, 'configured continuation engine'), 'configured continuation engine unavailable');
  const target = path.join(binding.repositoryRoot, relative),
    before = lstatSync(target);
  requireEngine(before.isFile() && !before.isSymbolicLink() && before.nlink === 1, 'configured continuation database path is unsafe');
  const database = new Database(target, { readonly: true, strict: true });
  let persisted: Record<string, any>;
  try {
    requireEngine(
      database.query('PRAGMA quick_check').all().every((row) => Object.values(row as Record<string, unknown>)[0] === 'ok'),
      'configured continuation engine is corrupt',
    );
    const columns = database.query('PRAGMA table_info(mastra_workflow_snapshot)').all() as { name: string }[];
    requireEngine(
      ['workflow_name', 'run_id', 'snapshot'].every((name) => columns.some((column) => column.name === name)),
      'configured continuation snapshot table is missing or malformed',
    );
    const census = database
      .query('SELECT count(*) AS count, coalesce(sum(length(CAST(snapshot AS BLOB))),0) AS bytes FROM mastra_workflow_snapshot')
      .get() as { count: number; bytes: number };
    requireEngine(
      Number.isSafeInteger(census.count) && census.count >= 0 && census.count <= 256 &&
        Number.isSafeInteger(census.bytes) && census.bytes >= 0 && census.bytes <= 8 * 1024 * 1024,
      'configured continuation engine census exceeds bound',
    );
    const decoded = database
      .query(
        'SELECT coalesce(sum(json_valid(snapshot,9) IS NOT 1),0) AS invalid, ' +
          'coalesce(sum(length(CAST(CASE WHEN json_valid(snapshot,9)=1 THEN json(snapshot) END AS BLOB))),0) AS bytes ' +
          'FROM mastra_workflow_snapshot',
      )
      .get() as { invalid: number; bytes: number };
    requireEngine(
      decoded.invalid === 0 && Number.isSafeInteger(decoded.bytes) && decoded.bytes >= 0 && decoded.bytes <= 8 * 1024 * 1024,
      'configured continuation engine snapshot encoding or census differs',
    );
    const rows = database
      .query('SELECT workflow_name,run_id,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
      .all(oldRunId) as { workflow_name: string; run_id: string; snapshot: string }[];
    requireEngine(
      rows.length === 1 && rows[0]!.workflow_name === action.workflow_id && rows[0]!.run_id === oldRunId &&
        Buffer.byteLength(rows[0]!.snapshot) <= 8 * 1024 * 1024,
      'configured continuation original engine run is missing or ambiguous',
    );
    persisted = JSON.parse(rows[0]!.snapshot) as Record<string, any>;
    requireEngine(
      persisted && persisted.runId === oldRunId && persisted.context &&
        typeof persisted.context === 'object' && !Array.isArray(persisted.context),
      'configured continuation original engine snapshot identity differs',
    );
  } finally {
    database.close(true);
    const after = lstatSync(target);
    requireEngine(
      after.isFile() && !after.isSymbolicLink() && after.nlink === 1 && after.dev === before.dev && after.ino === before.ino,
      'configured continuation database was substituted',
    );
  }

  const beforeStep = persisted.context[boundaryStep] as Record<string, any> | undefined;
  requireEngine(beforeStep, 'configured continuation boundary step is missing');
  if (beforeStep.status === 'suspended') {
    const retained = readRetainedUnissuedSessionEngineSnapshot(priorBinding, { work: priorWork, journal: priorJournal });
    requireEngine(
      isDeepStrictEqual(retained, normalizedBeforeImage),
      'configured continuation actual prewriter boundary differs from its immutable beforeimage',
    );
  }
  const context: SessionHandoffContext = { ...binding.context, scope_digest: currentScope.digest };
  const currentRequests = projectConfiguredPrewriterContinuationRequests({
    repositoryRoot: binding.repositoryRoot,
    config: binding.config,
    selection: binding.selection,
    context,
    workflowId: action.workflow_id,
    engine: normalizedBeforeImage,
    journal: priorJournal,
    currentSourceScope: currentScope,
    lifecycleRisk: priorWork.lifecycle.risk,
  });
  requireEngine(
    receipt.successor_journal.step_id === boundaryStep &&
      receipt.successor_journal.items.length === currentRequests.length &&
      currentRequests.every((entry, index) => isDeepStrictEqual(entry, receipt.successor_journal.items[index]!.request)),
    'configured continuation receipt current prewriter requests differ',
  );
  if (beforeStep.status === 'suspended') {
    requireEngine(
      persisted.status === 'suspended',
      'configured continuation suspended beforewriter graph differs',
    );
    return {
      run_id: oldRunId,
      status: 'suspended',
      step_id: boundaryStep,
      requests: currentRequests,
      observations: normalizedBeforeImage.observations,
    };
  }
  requireEngine(
    beforeStep.status === 'success' && persisted.status !== 'failed' && persisted.status !== 'canceled',
    'configured continuation current prewriter wave is partial or failed',
  );

  type RunState = ReturnType<typeof parseSessionBridgeRunState>;
  const parseOldState = (value: unknown): RunState => {
    const state = parseSessionBridgeRunState(value);
    requireEngine(
      isDeepStrictEqual(state, value) && state.work_id === request.identity.work_id &&
        state.attempt === receipt.attempt && state.workflow_id === action.workflow_id &&
        state.config_digest === request.priorConfigDigest && state.scope_digest === priorScope.digest &&
        isDeepStrictEqual(state.selection, binding.selection) &&
        state.observations.every((observation) => observation.output_digest === canonicalJsonDigest(observation.summary)) &&
        new Set(state.observations.map((observation) => observation.action_id)).size === state.observations.length,
      'configured continuation original input or prefix state differs',
    );
    return state;
  };
  const parseCurrentState = (value: unknown): RunState => {
    const state = parseSessionBridgeRunState(value);
    requireEngine(
      isDeepStrictEqual(state, value) && state.work_id === request.identity.work_id &&
        state.attempt === receipt.attempt && state.workflow_id === action.workflow_id &&
        state.config_digest === currentConfigDigest && state.scope_digest === currentScope.digest &&
        isDeepStrictEqual(state.selection, binding.selection) &&
        state.observations.every((observation) => observation.output_digest === canonicalJsonDigest(observation.summary)) &&
        new Set(state.observations.map((observation) => observation.action_id)).size === state.observations.length,
      'configured continuation current state differs',
    );
    return state;
  };
  const parseRequests = (values: unknown, expected: readonly SessionBridgeRequest[], message: string, completed = false) => {
    if (completed && values === undefined) return;
    requireEngine(Array.isArray(values), message);
    const parsed = values.map((entry) => {
      const value = parseSessionBridgeRequest(entry);
      requireEngine(isDeepStrictEqual(value, entry), message);
      return value;
    });
    requireEngine(isDeepStrictEqual(parsed, expected), message);
    return parsed;
  };
  const parseCompleteObservations = (
    values: unknown,
    expected: readonly SessionBridgeRequest[],
    message: string,
  ) => {
    requireEngine(Array.isArray(values) && values.length === expected.length, message);
    const parsed = values.map((entry) => {
      const value = parseSessionBridgeObservation(entry);
      requireEngine(isDeepStrictEqual(value, entry), message);
      return value;
    });
    const expectedIds = new Set(expected.map((entry) => entry.action_id));
    requireEngine(
      new Set(parsed.map((entry) => entry.action_id)).size === expected.length &&
        parsed.every((entry) => expectedIds.has(entry.action_id) && entry.status === 'reported_complete' &&
          entry.output_digest === canonicalJsonDigest(entry.summary)),
      message,
    );
    return parsed;
  };

  const originalInput = parseOldState(persisted.context.input);
  requireEngine(originalInput.observations.length === 0, 'configured continuation original input observations are not empty');
  let oldState = originalInput;
  const originalActionIds = new Set<string>();
  for (const [position, wave] of priorJournal.completed.entries()) {
    const waveIndex = position,
      waveStep = 'wave-' + waveIndex,
      row = persisted.context[waveStep] as Record<string, any> | undefined;
    requireEngine(
      wave.step_id === waveStep && row?.status === 'success' &&
        isDeepStrictEqual(parseOldState(row.payload), oldState),
      'configured continuation original successful prefix differs',
    );
    const expected = wave.items.map((item) => {
      const parsed = parseSessionBridgeRequest(item.request);
      requireEngine(
        isDeepStrictEqual(parsed, item.request) && parsed.run_id === oldRunId &&
          parsed.workflow_id === action.workflow_id && parsed.wave_index === waveIndex &&
          parsed.config_digest === request.priorConfigDigest && parsed.scope_digest === priorScope.digest &&
          parsed.bindings_manifest_ref === canonicalJsonDigest({
            config_digest: request.priorConfigDigest,
            scope_digest: priorScope.digest,
            work_id: request.identity.work_id,
            attempt: receipt.attempt,
            action_id: parsed.action_id,
            stage_id: parsed.stage_id,
            configured_context_digest: parsed.configured_context_digest ?? null,
            wave_index: waveIndex,
            prior_results: oldState.observations.map((entry) => entry.output_digest),
          }) && !originalActionIds.has(parsed.action_id),
        'configured continuation original prefix request binding differs',
      );
      originalActionIds.add(parsed.action_id);
      return parsed;
    });
    parseRequests(row.suspendPayload?.requests, expected, 'configured continuation original prefix requests differ', true);
    requireEngine(
      wave.items.every((item) => item.issue_id !== null && item.observation !== null &&
        item.host_reservation === undefined && item.research_activation === undefined &&
        item.research_normalization === undefined && item.request.corrective_execution === undefined),
      'configured continuation original prefix contains unresolved actions',
    );
    const observations = wave.items.map((item) => {
      const parsed = parseSessionBridgeObservation(item.observation);
      requireEngine(
        isDeepStrictEqual(parsed, item.observation) && parsed.issue_id === item.issue_id &&
          parsed.action_id === item.request.action_id && parsed.status === 'reported_complete' &&
          parsed.output_digest === canonicalJsonDigest(parsed.summary),
        'configured continuation original prefix observation differs',
      );
      return parsed;
    });
    requireEngine(
      isDeepStrictEqual(row.resumePayload?.observations?.map(parseSessionBridgeObservation), observations),
      'configured continuation original prefix resume reports differ',
    );
    const output = parseOldState(row.output),
      expectedOutput: RunState = { ...oldState, observations: [...oldState.observations, ...observations] };
    requireEngine(isDeepStrictEqual(output, expectedOutput), 'configured continuation original prefix output differs');
    oldState = output;
  }
  requireEngine(
    isDeepStrictEqual(parseOldState(beforeStep.payload), oldState),
    'configured continuation prewriter input differs from the original prefix',
  );
  parseRequests(beforeStep.suspendPayload?.requests, currentRequests, 'configured continuation current prewriter requests differ', true);
  const boundaryObservations = parseCompleteObservations(
      beforeStep.resumePayload?.observations,
      currentRequests,
      'configured continuation current prewriter reports are partial or invalid',
    ),
    expectedBoundaryOutput: RunState = {
      ...oldState,
      config_digest: currentConfigDigest,
      scope_digest: currentScope.digest,
      observations: [...oldState.observations, ...boundaryObservations],
    },
    currentBoundaryOutput = parseCurrentState(beforeStep.output);
  requireEngine(
    isDeepStrictEqual(currentBoundaryOutput, expectedBoundaryOutput),
    'configured continuation current prewriter output or context binding differs',
  );

  const plan = compileDevelopmentWorkflow(
      binding.config,
      binding.selection.team,
      action.workflow_id,
      binding.selection.risk_flags,
      priorWork.lifecycle.risk,
    ),
    executedWaves = [...plan.waves.entries()].filter(([, wave]) => !wave.every((stage) => stage.assignments.length === 0)),
    currentExecuted = executedWaves.filter(([index]) => index > boundaryWave);
  requireEngine(
    currentExecuted.length > 0 && currentExecuted[0]![0] === boundaryWave + 1 &&
      currentExecuted[0]![1].some((stage) => stage.kind === 'develop'),
    'configured continuation current developer suffix is missing',
  );
  const expectedCurrentRequests = (waveIndex: number, state: RunState): SessionBridgeRequest[] => {
    const actions = sessionActionsForWave(
      binding.config,
      binding.selection,
      context,
      action.workflow_id,
      waveIndex,
      [],
      undefined,
      priorWork.lifecycle.risk,
    );
    requireEngine(actions.length > 0, 'configured continuation current suffix wave has no assignments');
    return actions.map((currentAction) => buildSessionBridgeRequest({
      runId: oldRunId,
      workflowId: action.workflow_id,
      configDigest: currentConfigDigest,
      context,
      waveIndex,
      action: currentAction,
      configuredContext: configuredContextForStage(
        binding.repositoryRoot,
        binding.config,
        action.workflow_id,
        currentAction.stage_id,
        context,
      ),
      priorResults: state.observations,
    }));
  };
  const waveIds = Object.keys(persisted.context).filter((key) => key.startsWith('wave-'));
  requireEngine(
    waveIds.every((key) => /^wave-(0|[1-9][0-9]*)$/.test(key)),
    'configured continuation wave identity is malformed',
  );
  const presentIndexes = waveIds.map((key) => Number(key.slice(5))).sort((left, right) => left - right);
  const suffixRows = currentExecuted.map(([index]) => ({
    index,
    row: persisted.context['wave-' + index] as Record<string, any> | undefined,
  }));
  let state = currentBoundaryOutput,
    frontier: { readonly index: number; readonly requests: readonly SessionBridgeRequest[] } | null = null,
    processedSuffix = 0;
  for (const { index, row } of suffixRows) {
    if (!row) break;
    requireEngine(
      isDeepStrictEqual(parseCurrentState(row.payload), state),
      'configured continuation current suffix input chain differs',
    );
    const expected = expectedCurrentRequests(index, state);
    if (row.status === 'suspended') {
      requireEngine(
        persisted.status === 'suspended' &&
          index === suffixRows[processedSuffix]!.index &&
          !Object.hasOwn(row, 'resumePayload') && !Object.hasOwn(row, 'output'),
        'configured continuation current suffix frontier is not the final suspended step',
      );
      parseRequests(row.suspendPayload?.requests, expected, 'configured continuation current suffix requests differ');
      frontier = { index, requests: expected };
      processedSuffix++;
      break;
    }
    requireEngine(row.status === 'success', 'configured continuation current suffix contains a failed step');
    parseRequests(row.suspendPayload?.requests, expected, 'configured continuation current suffix requests differ', true);
    const observations = parseCompleteObservations(
        row.resumePayload?.observations,
        expected,
        'configured continuation current suffix reports are partial or invalid',
      ),
      output = parseCurrentState(row.output),
      expectedOutput: RunState = { ...state, observations: [...state.observations, ...observations] };
    requireEngine(isDeepStrictEqual(output, expectedOutput), 'configured continuation current suffix output differs');
    state = output;
    processedSuffix++;
  }
  const expectedIndexes = [
    ...priorJournal.completed.map((_, index) => index),
    boundaryWave,
    ...suffixRows.slice(0, processedSuffix).map(({ index }) => index),
  ];
  requireEngine(
    isDeepStrictEqual(presentIndexes, expectedIndexes),
    'configured continuation current graph wave sequence differs',
  );
  if (frontier) {
    const pathIndex = executedWaves.findIndex(([index]) => index === frontier!.index),
      paths = persisted.suspendedPaths;
    requireEngine(
      pathIndex >= 0 && paths && typeof paths === 'object' && !Array.isArray(paths) &&
        Object.keys(paths).length === 1 && Object.keys(paths)[0] === 'wave-' + frontier.index &&
        Array.isArray(paths['wave-' + frontier.index]) && isDeepStrictEqual(paths['wave-' + frontier.index], [pathIndex]),
      'configured continuation current suspended path differs',
    );
    return {
      run_id: oldRunId,
      status: 'suspended',
      step_id: 'wave-' + frontier.index,
      requests: frontier.requests,
      observations: state.observations,
    };
  }
  requireEngine(
    persisted.status === 'success' && processedSuffix === suffixRows.length &&
      isDeepStrictEqual(parseCurrentState(persisted.result), state) &&
      isDeepStrictEqual(persisted.suspendedPaths ?? {}, {}),
    'configured continuation terminal current graph result differs',
  );
  return {
    run_id: oldRunId,
    status: 'success',
    step_id: null,
    requests: [],
    observations: state.observations,
  };
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
      ...compileDevelopmentWorkflow(config, selection.team, workflowId, selection.risk_flags, binding.lifecycleRisk)
        .waves.entries(),
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
      const actions = sessionActionsForWave(
        config,
        selection,
        context,
        workflowId,
        waveIndex,
        [],
        correction,
        binding.lifecycleRisk,
      );
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
      const actions = sessionActionsForWave(
        config,
        selection,
        context,
        workflowId,
        waveIndex,
        [],
        correction,
        binding.lifecycleRisk,
      );
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
    database.close(true);
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
