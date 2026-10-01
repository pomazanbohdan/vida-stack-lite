import { Database } from 'bun:sqlite';
import Ajv2020 from 'ajv/dist/2020.js';
import { randomUUID } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import stateSchema from '../../schemas/persistent-session-handoff-state.v1.schema.json' with { type: 'json' };
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  type AgentRuntimeConfig,
  type WorkItemSelection,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJson, canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import { HostStateStore, openHostStateDatabase, type StateVersion, type WorkState } from '../host-state.js';
import { deriveWorkspaceId } from '../workspace-identity.js';
import {
  advanceSessionWorkflowHandoffFromConfig,
  prepareSessionWorkflowHandoffFromConfig,
  validateSessionAgentOutcome,
  validateSessionWorkflowHandoffFromConfig,
  type SessionAgentOutcome,
  type SessionHandoffContext,
  type SessionWorkflowHandoff,
} from './session-handoff.js';
import {
  parseSessionBridgeObservation,
  type SessionBridgeObservation,
  type SessionBridgeRequest,
} from './mastra-session-bridge.js';
import { compareScopedSourceSnapshots, type ScopedSourceSnapshot } from './scoped-source-snapshot.js';
import type { WorkflowSessionReservation } from '../runtime-kernel.js';
import { createLocalSourceWriteApprovalVerifier } from './local-source-authorization.js';
import { createLocalSessionReconciliationVerifier } from './local-session-reconciliation.js';
import {
  validateActivationUse,
  validateObservedActivationUseWritePlan,
  validateObservedResearchRecordPlan,
  type ActivationUse,
  type ObservedActivationUseWritePlan,
  type ObservedResearchRecordPlan,
} from '../research-decision.js';

interface Issuance {
  readonly action_id: string;
  readonly issue_id: string;
  readonly operator_run_id: string;
  readonly report: SessionAgentOutcome | null;
}

const Ajv2020Constructor = Ajv2020 as unknown as new (options: { strict: boolean; allErrors: boolean }) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validSessionState = new Ajv2020Constructor({ strict: true, allErrors: true }).compile(stateSchema);
const sameJson = (left: unknown, right: unknown): boolean => canonicalJson(left) === canonicalJson(right);

export interface PersistentSessionHandoffState {
  readonly schema: 'PersistentSessionHandoffState/v1';
  readonly workspace_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly handoff: SessionWorkflowHandoff;
  readonly issuances: readonly Issuance[];
}

export interface PersistentSessionSnapshot {
  readonly version: StateVersion;
  readonly state: PersistentSessionHandoffState;
  readonly resume_status: 'ready' | 'issued_outcome_uncertain' | 'blocked' | 'all_reports_collected';
}

function requireState(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function resumeStatus(state: PersistentSessionHandoffState): PersistentSessionSnapshot['resume_status'] {
  if (state.issuances.some((item) => item.report === null)) return 'issued_outcome_uncertain';
  if (state.handoff.status === 'blocked') return 'blocked';
  if (state.handoff.status === 'all_reports_collected') return 'all_reports_collected';
  return 'ready';
}

/** One deterministic database path beneath the YAML-controlled work root. */
export function sessionHandoffDatabasePath(repositoryRoot: string, config: AgentRuntimeConfig): string {
  return path.join(repositoryRoot, config.control.work_root, 'session-handoff.v1.sqlite');
}

/** Opens the same configured host SQLite file; no provider or session tool is invoked. */
export function openConfiguredSessionHandoffStore(repositoryRoot: string): PersistentSessionHandoffStore {
  const config = loadRuntimeConfig(repositoryRoot);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
  const access = requireSafeRepositoryAccess(repositoryRoot);
  access.ensureDirectory(config.control.work_root, 'session handoff state root');
  const databasePath = sessionHandoffDatabasePath(repositoryRoot, config);
  try {
    const stats = lstatSync(databasePath);
    requireState(
      stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1,
      'session handoff database path is unsafe',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const database = openHostStateDatabase(databasePath);
  try {
    new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, repositoryRoot);
    return new PersistentSessionHandoffStore(database, workspaceId, config, repositoryRoot);
  } catch (error) {
    database.close();
    throw error;
  }
}

/** Current-v1 advisory state; the caller must observe collaboration-tool results itself. */
export class PersistentSessionHandoffStore {
  readonly #database: Database;
  readonly #workspaceId: string;
  readonly #config: AgentRuntimeConfig;
  readonly #repositoryRoot: string | undefined;
  readonly #configDigest: string;
  readonly #operatorRunId = randomUUID();

  constructor(database: Database, workspaceId: string, config: AgentRuntimeConfig, repositoryRoot?: string) {
    requireState(
      database instanceof Database && /^[a-f0-9]{64}$/.test(workspaceId),
      'session host database binding is invalid',
    );
    this.#database = database;
    this.#workspaceId = workspaceId;
    this.#config = config;
    this.#repositoryRoot = repositoryRoot;
    this.#configDigest = runtimeConfigDigest(config);
    database.exec('PRAGMA synchronous=FULL');
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_session_handoff (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id, work_id, attempt))',
    );
  }

  close(): void {
    this.#database.close();
  }

  #assertFreshConfig(): void {
    if (this.#repositoryRoot !== undefined)
      requireState(
        runtimeConfigDigest(loadRuntimeConfig(this.#repositoryRoot)) === this.#configDigest,
        'session root configuration changed during attempt',
      );
  }

  #read(workId: string, attempt: number): PersistentSessionSnapshot | null {
    this.#assertFreshConfig();
    const row = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_session_handoff WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, workId, attempt) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const state = JSON.parse(row.payload) as PersistentSessionHandoffState;
    requireState(validSessionState(state), 'session state current-v1 schema is invalid');
    requireState(
      state.schema === 'PersistentSessionHandoffState/v1' &&
        state.workspace_id === this.#workspaceId &&
        state.work_id === workId &&
        state.attempt === attempt,
      'session state identity or schema is invalid',
    );
    requireState(
      JSON.stringify(Object.keys(state).sort()) ===
        JSON.stringify(['schema', 'workspace_id', 'work_id', 'attempt', 'handoff', 'issuances'].sort()) &&
        Array.isArray(state.issuances),
      'session state fields are invalid',
    );
    requireState(
      row.digest === canonicalJsonDigest(state) && Number.isSafeInteger(row.revision) && row.revision > 0,
      'session state digest or revision is invalid',
    );
    requireState(
      state.handoff.config_digest === runtimeConfigDigest(this.#config),
      'session configuration changed during attempt',
    );
    validateSessionWorkflowHandoffFromConfig(this.#config, state.handoff);
    requireState(
      state.handoff.context.work_id === workId && state.handoff.context.attempt === attempt,
      'session handoff context differs from state key',
    );
    requireState(
      state.issuances.every(
        (item) =>
          item &&
          typeof item.action_id === 'string' &&
          typeof item.issue_id === 'string' &&
          typeof item.operator_run_id === 'string' &&
          Object.keys(item).sort().join(',') === 'action_id,issue_id,operator_run_id,report' &&
          state.handoff.actions.some((action) => action.action_id === item.action_id),
      ),
      'session issuance fields or action are invalid',
    );
    requireState(
      new Set(state.issuances.map((item) => item.action_id)).size === state.issuances.length &&
        new Set(state.issuances.map((item) => item.issue_id)).size === state.issuances.length,
      'session issuance identities contain duplicates',
    );
    for (const item of state.issuances.filter((entry) => entry.report !== null)) {
      requireState(item.report?.session_result?.issue_id === item.issue_id, 'session issuance report id differs');
      validateSessionAgentOutcome(
        state.handoff,
        state.handoff.actions.find((action) => action.action_id === item.action_id)!,
        item.report!,
      );
    }
    return freezeJsonValue({
      version: { revision: row.revision, digest: row.digest },
      state,
      resume_status: resumeStatus(state),
    });
  }

  resume(workId: string, attempt: number): PersistentSessionSnapshot | null {
    return this.#read(workId, attempt);
  }

  prepare(selection: WorkItemSelection, context: SessionHandoffContext): PersistentSessionSnapshot {
    requireState(!this.#database.inTransaction, 'nested session state transaction is forbidden');
    return this.#database
      .transaction(() => {
        this.#assertFreshConfig();
        const handoff = prepareSessionWorkflowHandoffFromConfig(this.#config, selection, context);
        const state: PersistentSessionHandoffState = {
          schema: 'PersistentSessionHandoffState/v1',
          workspace_id: this.#workspaceId,
          work_id: context.work_id,
          attempt: context.attempt,
          handoff,
          issuances: [],
        };
        const digest = canonicalJsonDigest(state);
        this.#assertFreshConfig();
        const result = this.#database
          .query(
            'INSERT INTO agent_host_session_handoff (workspace_id,work_id,attempt,revision,payload,digest) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING',
          )
          .run(this.#workspaceId, context.work_id, context.attempt, 1, canonicalJson(state), digest);
        requireState(result.changes === 1, 'session attempt already exists');
        return this.#read(context.work_id, context.attempt)!;
      })
      .immediate();
  }

  prepareOrResume(
    selection: WorkItemSelection,
    context: SessionHandoffContext,
  ): { readonly snapshot: PersistentSessionSnapshot; readonly created: boolean } {
    const current = this.resume(context.work_id, context.attempt);
    if (current) {
      this.#assertRequestMatches(current, selection, context);
      return { snapshot: current, created: false };
    }
    try {
      return { snapshot: this.prepare(selection, context), created: true };
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'session attempt already exists') throw error;
      const raced = this.resume(context.work_id, context.attempt);
      requireState(raced, 'session attempt race has no persisted state');
      this.#assertRequestMatches(raced, selection, context);
      return { snapshot: raced, created: false };
    }
  }

  #assertRequestMatches(
    snapshot: PersistentSessionSnapshot,
    selection: WorkItemSelection,
    context: SessionHandoffContext,
  ): void {
    requireState(
      sameJson(snapshot.state.handoff.selection, selection) && sameJson(snapshot.state.handoff.context, context),
      'session attempt request differs from persisted binding',
    );
  }

  #change(
    workId: string,
    attempt: number,
    expected: StateVersion,
    update: (state: PersistentSessionHandoffState) => PersistentSessionHandoffState,
  ): PersistentSessionSnapshot {
    requireState(!this.#database.inTransaction, 'nested session state transaction is forbidden');
    return this.#database
      .transaction(() => {
        this.#assertFreshConfig();
        const current = this.#read(workId, attempt);
        requireState(
          current && current.version.revision === expected.revision && current.version.digest === expected.digest,
          'session state compare-and-swap conflict',
        );
        const next = update(current.state);
        this.#assertFreshConfig();
        const digest = canonicalJsonDigest(next);
        const result = this.#database
          .query(
            'UPDATE agent_host_session_handoff SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(next),
            digest,
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(result.changes === 1, 'session state compare-and-swap conflict');
        return this.#read(workId, attempt)!;
      })
      .immediate();
  }

  /** Reserve the complete ready wave durably before any agent tool is called. */
  issueWave(
    workId: string,
    attempt: number,
    expected: StateVersion,
  ): {
    readonly snapshot: PersistentSessionSnapshot;
    readonly issuances: readonly { readonly action_id: string; readonly issue_id: string }[];
  } {
    const snapshot = this.#change(workId, attempt, expected, (state) => {
      requireState(state.handoff.status === 'awaiting_agent_outcomes', 'session handoff is terminal');
      requireState(state.issuances.length === 0, 'session wave was already issued');
      requireState(state.handoff.actions.length > 0, 'session wave has no actions');
      requireState(
        new Set(state.handoff.actions.map((action) => action.action_id)).size === state.handoff.actions.length,
        'session wave action identities contain duplicates',
      );
      return {
        ...state,
        issuances: state.handoff.actions.map((action) => ({
          action_id: action.action_id,
          issue_id: randomUUID(),
          operator_run_id: this.#operatorRunId,
          report: null,
        })),
      };
    });
    return {
      snapshot,
      issuances: snapshot.state.issuances.map(({ action_id, issue_id }) => ({ action_id, issue_id })),
    };
  }

  /** Persist issuance before the operator calls a built-in agent tool. Never reissues an action. */
  issue(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
  ): { readonly snapshot: PersistentSessionSnapshot; readonly issue_id: string } {
    const issueId = randomUUID();
    const snapshot = this.#change(workId, attempt, expected, (state) => {
      requireState(state.handoff.status === 'awaiting_agent_outcomes', 'session handoff is terminal');
      requireState(
        state.handoff.actions.some((action) => action.action_id === actionId),
        'session action is not in the current wave',
      );
      requireState(!state.issuances.some((item) => item.action_id === actionId), 'session action was already issued');
      requireState(
        !state.issuances.some((item) => item.report === null && item.operator_run_id !== this.#operatorRunId),
        'issued outcome is uncertain after restart',
      );
      return {
        ...state,
        issuances: [
          ...state.issuances,
          { action_id: actionId, issue_id: issueId, operator_run_id: this.#operatorRunId, report: null },
        ],
      };
    });
    return { snapshot, issue_id: issueId };
  }

  /** Record one observed report. Matching JSON does not authenticate the collaboration tool. */
  report(
    workId: string,
    attempt: number,
    expected: StateVersion,
    outcome: SessionAgentOutcome,
  ): PersistentSessionSnapshot {
    return this.#change(workId, attempt, expected, (state) => {
      const issuance = state.issuances.find((item) => item.action_id === outcome.action_id);
      requireState(
        issuance && issuance.report === null && issuance.issue_id === outcome.session_result?.issue_id,
        'session report has no matching open issuance',
      );
      const action = state.handoff.actions.find((item) => item.action_id === outcome.action_id);
      requireState(action, 'session report action is not in the current wave');
      validateSessionAgentOutcome(state.handoff, action, outcome);
      const existingRefs = [
        ...state.handoff.outcomes,
        ...state.issuances.flatMap((item) => (item.report ? [item.report] : [])),
      ].map((item) => item.session_result.tool_call_ref);
      requireState(
        !existingRefs.includes(outcome.session_result.tool_call_ref),
        'session tool call reference was replayed',
      );
      const issuances = state.issuances.map((item) =>
        item.action_id === outcome.action_id ? { ...item, report: outcome } : item,
      );
      if (issuances.length < state.handoff.actions.length || issuances.some((item) => item.report === null))
        return { ...state, issuances };
      const reports = state.handoff.actions.map(
        (item) => issuances.find((entry) => entry.action_id === item.action_id)!.report!,
      );
      const handoff = advanceSessionWorkflowHandoffFromConfig(this.#config, state.handoff, reports);
      return { ...state, handoff, issuances: [] };
    });
  }
}

interface MastraLedgerItem {
  readonly request: SessionBridgeRequest;
  readonly issue_id: string | null;
  readonly observation: SessionBridgeObservation | null;
  readonly host_reservation?: WorkflowSessionReservation;
  readonly research_activation?: { readonly use: ActivationUse; readonly plan: ObservedActivationUseWritePlan };
  readonly research_normalization?: ObservedResearchRecordPlan;
}

export interface MastraSessionLedgerState {
  readonly schema: 'MastraSessionLedger/v1';
  readonly workspace_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly run_id: string;
  readonly source_scope?: ScopedSourceSnapshot | null;
  readonly step_id: string | null;
  readonly items: readonly MastraLedgerItem[];
  readonly completed: readonly { readonly step_id: string; readonly items: readonly MastraLedgerItem[] }[];
}

export interface MastraSessionLedgerSnapshot {
  readonly version: StateVersion;
  readonly state: MastraSessionLedgerState;
  readonly resume_status: 'ready' | 'issued_outcome_uncertain' | 'ready_to_resume' | 'blocked' | 'complete';
}

/** The native synthesis report remains immutable in this additive correction receipt. */
export interface SynthesisObservationCorrectionPlan {
  readonly schema: 'VidaSynthesisObservationCorrectionPlan/v1';
  readonly correction_id: string;
  readonly actor: string;
  readonly timestamp: string;
  readonly workspace_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly integrations_digest: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly action_id: string;
  readonly prior_issue_id: string;
  readonly native_session_handle: string;
  readonly owner_correction_pointer: string;
  readonly config_digest: string;
  readonly source_digest: string;
  readonly predecessor_refs: readonly { readonly result_id: string; readonly digest: string }[];
  readonly catalog_digest: string;
  readonly expected_work: StateVersion;
  readonly expected_ledger: StateVersion;
  readonly expected_journal: StateVersion;
  readonly original_item: MastraLedgerItem;
  readonly digest: string;
}

interface ReadOnlyDispatchPlan {
  readonly schema: 'VidaReadOnlyDispatchRepairPlan/v1';
  readonly digest: string;
  readonly repair_id: string;
  readonly workspace_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly logical_action_id: string;
  readonly prior_issue_id: string;
  readonly prior_native_handle: string;
  readonly prior_activation: MastraLedgerItem['research_activation'] | null;
  readonly dispatch_action_id: string;
  readonly replacement_issue_id: string;
  readonly request_digest: string;
  readonly scope_digest: string;
  readonly config_digest: string;
  readonly source_digest: string;
  readonly work_version: StateVersion;
  readonly ledger_version: StateVersion;
  readonly mastra_version: StateVersion;
  readonly replacement_generation: 1;
  readonly status: 'prepared';
}

interface ReadOnlyDispatchActivation {
  readonly schema: 'VidaReadOnlyDispatchActivation/v1';
  readonly plan_digest: string;
  readonly logical_action_id: string;
  readonly dispatch_action_id: string;
  readonly issue_id: string;
  readonly prior_issue_id: string;
  readonly generation: 1;
}

function mastraLedgerStatus(state: MastraSessionLedgerState): MastraSessionLedgerSnapshot['resume_status'] {
  if (state.step_id === null) return 'blocked';
  if (state.items.some((item) => item.issue_id !== null && item.observation === null))
    return 'issued_outcome_uncertain';
  if (state.items.length > 0 && state.items.every((item) => item.observation !== null))
    return state.items.some((item) => item.observation?.status === 'reported_failed') ? 'blocked' : 'ready_to_resume';
  return 'ready';
}

export function validateResearchJournalItem(item: MastraLedgerItem, state: MastraSessionLedgerState): boolean {
  if (
    Object.keys(item).some(
      (key) =>
        ![
          'request',
          'issue_id',
          'observation',
          'host_reservation',
          'research_activation',
          'research_normalization',
        ].includes(key),
    )
  )
    return false;
  const binding = (plan: ObservedActivationUseWritePlan | ObservedResearchRecordPlan) =>
    plan.binding.work_id === state.work_id &&
    plan.binding.attempt === state.attempt &&
    plan.binding.run_id === state.run_id &&
    plan.binding.action_id === item.request.action_id &&
    plan.binding.issue_id === item.issue_id &&
    plan.binding.scope_digest === item.request.scope_digest &&
    plan.binding.config_digest === item.request.config_digest;
  if (item.research_activation) {
    if (Object.keys(item.research_activation).sort().join(',') !== 'plan,use') return false;
    const use = validateActivationUse(item.research_activation.use);
    const plan = validateObservedActivationUseWritePlan(item.research_activation.plan);
    if (
      !binding(plan) ||
      plan.use_digest !== use.digest ||
      use.work_item_id !== state.work_id ||
      use.source_revision !== plan.binding.source_revision ||
      use.scope_id !== plan.binding.scope_id
    )
      return false;
  }
  if (item.research_normalization) {
    const plan = validateObservedResearchRecordPlan(item.research_normalization);
    if (!item.observation || !binding(plan) || plan.observation_digest !== canonicalJsonDigest(item.observation))
      return false;
  }
  return true;
}

/** A CAS issue/outcome journal, deliberately without its own workflow stage scheduler. */
export class MastraSessionLedger {
  readonly #database: Database;
  readonly hostState: HostStateStore;
  readonly #workspaceId: string;
  readonly #configDigest: string;
  readonly #repositoryRoot: string;
  readonly #openedMaintenanceGeneration: number;

  constructor(
    database: Database,
    workspaceId: string,
    config: AgentRuntimeConfig,
    repositoryRoot: string,
    hostState: HostStateStore,
  ) {
    this.#database = database;
    this.#workspaceId = workspaceId;
    this.#configDigest = runtimeConfigDigest(config);
    this.#repositoryRoot = repositoryRoot;
    this.hostState = hostState;
    this.#openedMaintenanceGeneration = this.#maintenanceState().generation;
    database.exec('PRAGMA synchronous=FULL');
    database.exec(
      'CREATE TABLE IF NOT EXISTS agent_host_mastra_session_ledger (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id, work_id, attempt))',
    );
  }

  close(): void {
    this.#database.close();
  }

  #assertFreshConfig(): void {
    requireState(
      runtimeConfigDigest(loadRuntimeConfig(this.#repositoryRoot)) === this.#configDigest,
      'Mastra session root configuration changed during attempt',
    );
  }
  #maintenanceState(): { generation: number; status: string | null } {
    const row = this.#database
      .query('SELECT payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
      .get(this.#workspaceId) as { payload: string; digest: string } | null;
    if (!row) return { generation: 0, status: null };
    const value = JSON.parse(row.payload) as { generation: number; status: string };
    requireState(
      row.digest === canonicalJsonDigest(value) && Number.isSafeInteger(value.generation),
      'session maintenance state checksum invalid',
    );
    return value;
  }
  #assertWorkingGeneration(): void {
    const current = this.#maintenanceState();
    requireState(
      current.status !== 'held' && current.generation === this.#openedMaintenanceGeneration,
      'session journal is fenced by maintenance generation',
    );
  }

  #read(workId: string, attempt: number): MastraSessionLedgerSnapshot | null {
    this.#assertFreshConfig();
    this.#assertWorkingGeneration();
    const row = this.#database
      .query(
        'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
      )
      .get(this.#workspaceId, workId, attempt) as { revision: number; payload: string; digest: string } | null;
    if (!row) return null;
    const state = JSON.parse(row.payload) as MastraSessionLedgerState;
    requireState(
      state?.schema === 'MastraSessionLedger/v1' &&
        state.workspace_id === this.#workspaceId &&
        state.work_id === workId &&
        state.attempt === attempt &&
        typeof state.run_id === 'string' &&
        Array.isArray(state.items) &&
        Array.isArray(state.completed) &&
        (state.step_id === null || typeof state.step_id === 'string') &&
        Number.isSafeInteger(row.revision) &&
        row.revision > 0 &&
        row.digest === canonicalJsonDigest(state),
      'Mastra session ledger identity, shape or digest is invalid',
    );
    if (state.source_scope)
      requireState(
        state.source_scope.schema === 'ScopedSourceSnapshot/v1' &&
          state.source_scope.digest ===
            canonicalJsonDigest({
              schema: state.source_scope.schema,
              entries: state.source_scope.entries,
            }),
        'Mastra session source scope digest is invalid',
      );
    requireState(
      [...state.items, ...state.completed.flatMap((wave) => wave.items)].every(
        (item) =>
          item.request?.run_id === state.run_id &&
          item.request?.scope_digest &&
          (item.issue_id === null || typeof item.issue_id === 'string') &&
          (item.host_reservation === undefined ||
            (item.host_reservation.schema === 'WorkflowSessionReservation/v1' &&
              item.host_reservation.receipt.attempt.attempt_id &&
              item.host_reservation.request.workItemId === state.work_id &&
              item.host_reservation.request.stageId === item.request.stage_id &&
              item.host_reservation.request.assignmentIndex === item.request.assignment_index)) &&
          (item.observation === null ||
            (item.observation.action_id === item.request.action_id &&
              item.observation.issue_id === item.issue_id &&
              item.observation.host_attempt_id === item.host_reservation?.receipt.attempt.attempt_id)) &&
          validateResearchJournalItem(item, state),
      ),
      'Mastra session ledger item binding is invalid',
    );
    return freezeJsonValue({
      version: { revision: row.revision, digest: row.digest },
      state,
      resume_status: mastraLedgerStatus(state),
    });
  }

  resume(workId: string, attempt: number): MastraSessionLedgerSnapshot | null {
    return this.#read(workId, attempt);
  }

  #change(
    workId: string,
    attempt: number,
    expected: StateVersion,
    update: (state: MastraSessionLedgerState) => MastraSessionLedgerState,
  ): MastraSessionLedgerSnapshot {
    requireState(!this.#database.inTransaction, 'nested Mastra ledger transaction is forbidden');
    return this.#database
      .transaction(() => {
        this.#assertWorkingGeneration();
        const current = this.#read(workId, attempt);
        requireState(
          current?.version.revision === expected.revision && current.version.digest === expected.digest,
          'Mastra session ledger compare-and-swap conflict',
        );
        const state = update(current.state);
        this.#assertFreshConfig();
        const digest = canonicalJsonDigest(state);
        const result = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(state),
            digest,
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(result.changes === 1, 'Mastra session ledger compare-and-swap conflict');
        return this.#read(workId, attempt)!;
      })
      .immediate();
  }

  #readDispatchPlan(workId: string, attempt: number, actionId: string): ReadOnlyDispatchPlan | null {
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_readonly_dispatch_repair'")
      .get();
    if (!table) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=? AND generation=1',
      )
      .get(this.#workspaceId, workId, attempt, actionId) as { payload: string; digest: string } | null;
    if (!row) return null;
    const plan = JSON.parse(row.payload) as ReadOnlyDispatchPlan;
    const { digest, ...body } = plan;
    requireState(
      plan.schema === 'VidaReadOnlyDispatchRepairPlan/v1' &&
        plan.workspace_id === this.#workspaceId &&
        plan.work_id === workId &&
        plan.attempt === attempt &&
        plan.logical_action_id === actionId &&
        plan.replacement_generation === 1 &&
        plan.status === 'prepared' &&
        row.digest === digest &&
        canonicalJsonDigest(body) === digest,
      'read-only dispatch repair plan is invalid',
    );
    return plan;
  }

  #readDispatchActivation(workId: string, attempt: number, actionId: string): ReadOnlyDispatchActivation | null {
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_readonly_dispatch_activation'")
      .get();
    if (!table) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_readonly_dispatch_activation WHERE workspace_id=? AND work_id=? AND attempt=? AND logical_action_id=?',
      )
      .get(this.#workspaceId, workId, attempt, actionId) as { payload: string; digest: string } | null;
    if (!row) return null;
    const activation = JSON.parse(row.payload) as ReadOnlyDispatchActivation;
    requireState(
      activation.schema === 'VidaReadOnlyDispatchActivation/v1' &&
        activation.logical_action_id === actionId &&
        activation.generation === 1 &&
        row.digest === canonicalJsonDigest(activation),
      'read-only dispatch activation is invalid',
    );
    return activation;
  }

  preparedReadOnlyReplacement(
    workId: string,
    attempt: number,
    actionId: string,
  ): { native_session_handle: string; plan_digest: string } | null {
    const plan = this.#readDispatchPlan(workId, attempt, actionId);
    const current = this.#read(workId, attempt);
    return plan &&
      current &&
      !this.#readDispatchActivation(workId, attempt, actionId) &&
      current.version.revision === plan.mastra_version.revision &&
      current.version.digest === plan.mastra_version.digest &&
      current.state.items.some(
        (item) =>
          item.request.action_id === actionId && item.issue_id === plan.prior_issue_id && item.observation === null,
      )
      ? { native_session_handle: plan.prior_native_handle, plan_digest: plan.digest }
      : null;
  }

  /** Switch one native issue under CAS; Mastra's logical action and old v1 shape remain stable. */
  activateReadOnlyReplacement(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
  ): { snapshot: MastraSessionLedgerSnapshot; dispatch: ReadOnlyDispatchActivation } {
    requireState(!this.#database.inTransaction, 'nested read-only dispatch transaction forbidden');
    return this.#database
      .transaction(() => {
        this.#assertWorkingGeneration();
        const current = this.#read(workId, attempt);
        const plan = this.#readDispatchPlan(workId, attempt, actionId);
        requireState(
          current &&
            plan &&
            current.version.revision === expected.revision &&
            current.version.digest === expected.digest &&
            plan.mastra_version.revision === expected.revision &&
            plan.mastra_version.digest === expected.digest,
          'read-only dispatch plan or journal CAS version changed',
        );
        const item = current.state.items.find((entry) => entry.request.action_id === actionId);
        requireState(
          item?.issue_id === plan.prior_issue_id &&
            item.observation === null &&
            !item.host_reservation &&
            sameJson(item.research_activation ?? null, plan.prior_activation) &&
            canonicalJsonDigest(item.request) === plan.request_digest &&
            current.state.source_scope?.digest === plan.source_digest &&
            item.request.scope_digest === plan.scope_digest &&
            item.request.config_digest === plan.config_digest &&
            plan.config_digest === this.#configDigest,
          'read-only dispatch issue or frozen binding changed',
        );
        const workRows = this.#database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work'")
          .all(this.#workspaceId) as { revision: number; payload: string; digest: string }[];
        const ownerRows = workRows.filter((row) => {
          const value = JSON.parse(row.payload) as WorkState;
          return value.binding.lifecycle_work_id === workId && value.execution.run_id === current.state.run_id;
        });
        requireState(
          ownerRows.length === 1 &&
            ownerRows[0]!.revision === plan.work_version.revision &&
            ownerRows[0]!.digest === plan.work_version.digest &&
            (JSON.parse(ownerRows[0]!.payload) as WorkState).lease === null,
          'paused owner work version changed',
        );
        const ledgerRow = this.#database
          .query("SELECT revision,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'")
          .get(this.#workspaceId) as { revision: number; digest: string } | null;
        requireState(
          ledgerRow?.revision === plan.ledger_version.revision && ledgerRow.digest === plan.ledger_version.digest,
          'shared coordination version changed',
        );
        requireState(
          !this.#readDispatchActivation(workId, attempt, actionId),
          'replacement dispatch generation already activated',
        );
        const activation: ReadOnlyDispatchActivation = {
          schema: 'VidaReadOnlyDispatchActivation/v1',
          plan_digest: plan.digest,
          logical_action_id: actionId,
          dispatch_action_id: plan.dispatch_action_id,
          issue_id: plan.replacement_issue_id,
          prior_issue_id: plan.prior_issue_id,
          generation: 1,
        };
        const state = {
          ...current.state,
          items: current.state.items.map((entry) =>
            entry.request.action_id === actionId
              ? (({ research_activation: _prior, ...retained }) => ({
                  ...retained,
                  issue_id: plan.replacement_issue_id,
                }))(entry)
              : entry,
          ),
        };
        const updated = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(state),
            canonicalJsonDigest(state),
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(updated.changes === 1, 'read-only dispatch journal CAS conflict');
        this.#database.exec(
          'CREATE TABLE IF NOT EXISTS agent_host_readonly_dispatch_activation (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, logical_action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,logical_action_id))',
        );
        this.#database
          .query('INSERT INTO agent_host_readonly_dispatch_activation VALUES(?,?,?,?,?,?)')
          .run(
            this.#workspaceId,
            workId,
            attempt,
            actionId,
            canonicalJson(activation),
            canonicalJsonDigest(activation),
          );
        return { snapshot: this.#read(workId, attempt)!, dispatch: activation };
      })
      .immediate();
  }

  replacementDispatch(workId: string, attempt: number, actionId: string): ReadOnlyDispatchActivation | null {
    const activation = this.#readDispatchActivation(workId, attempt, actionId);
    if (!activation) return null;
    const plan = this.#readDispatchPlan(workId, attempt, actionId);
    const current = this.#read(workId, attempt);
    requireState(
      plan &&
        current &&
        activation.plan_digest === plan.digest &&
        current.state.items.some(
          (item) => item.request.action_id === actionId && item.issue_id === activation.issue_id,
        ),
      'replacement dispatch differs from current journal',
    );
    return activation;
  }

  replacementNativeHandle(workId: string, attempt: number, actionId: string): string | null {
    const dispatch = this.replacementDispatch(workId, attempt, actionId);
    if (!dispatch) return null;
    const plan = this.#readDispatchPlan(workId, attempt, actionId);
    requireState(plan && dispatch.plan_digest === plan.digest, 'replacement native owner differs from prepared plan');
    return plan.prior_native_handle;
  }

  synthesisCorrection(workId: string, attempt: number, actionId: string): SynthesisObservationCorrectionPlan | null {
    const table = this.#database
      .query("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_host_synthesis_observation_correction'")
      .get();
    if (!table) return null;
    const row = this.#database
      .query(
        'SELECT payload,digest FROM agent_host_synthesis_observation_correction WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
      )
      .get(this.#workspaceId, workId, attempt, actionId) as { payload: string; digest: string } | null;
    if (!row) return null;
    const plan = JSON.parse(row.payload) as SynthesisObservationCorrectionPlan;
    const { digest, ...body } = plan;
    requireState(
      plan.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
        plan.workspace_id === this.#workspaceId &&
        plan.work_id === workId &&
        plan.attempt === attempt &&
        plan.action_id === actionId &&
        digest === row.digest &&
        digest === canonicalJsonDigest(body),
      'synthesis correction receipt is invalid',
    );
    return plan;
  }

  /** Preserve an observed native result and reset only its inadmissible derived synthesis slot. */
  correctObservedSynthesis(plan: SynthesisObservationCorrectionPlan): MastraSessionLedgerSnapshot {
    const { digest, ...body } = plan;
    requireState(
      plan.schema === 'VidaSynthesisObservationCorrectionPlan/v1' &&
        plan.workspace_id === this.#workspaceId &&
        digest === canonicalJsonDigest(body) &&
        plan.config_digest === this.#configDigest &&
        plan.predecessor_refs.length > 0 &&
        /^[a-f0-9]{64}$/.test(plan.catalog_digest) &&
        typeof plan.owner_correction_pointer === 'string' &&
        plan.owner_correction_pointer.length > 0,
      'synthesis correction plan is invalid',
    );
    requireState(!this.#database.inTransaction, 'nested synthesis correction transaction forbidden');
    return this.#database
      .transaction(() => {
        this.#assertWorkingGeneration();
        const prior = this.synthesisCorrection(plan.work_id, plan.attempt, plan.action_id);
        if (prior) {
          requireState(prior.digest === plan.digest, 'synthesis correction receipt conflicts');
          return this.#read(plan.work_id, plan.attempt)!;
        }
        const current = this.#read(plan.work_id, plan.attempt);
        requireState(
          current?.version.revision === plan.expected_journal.revision &&
            current.version.digest === plan.expected_journal.digest &&
            current.state.source_scope?.digest === plan.source_digest &&
            current.state.items.length === 1,
          'synthesis correction journal CAS or source changed',
        );
        const item = current.state.items[0]!;
        const config = loadRuntimeConfig(this.#repositoryRoot);
        const stage = config.workflows[item.request.workflow_id]?.stages.find(
          (entry) => entry.id === item.request.stage_id,
        );
        requireState(
          item.request.action_id === plan.action_id &&
            item.issue_id === plan.prior_issue_id &&
            item.observation?.status === 'reported_complete' &&
            !!item.research_activation &&
            !item.research_normalization &&
            !item.host_reservation &&
            sameJson(item, plan.original_item) &&
            item.request.config_digest === plan.config_digest &&
            item.request.scope_digest === plan.source_digest &&
            stage?.kind === 'synthesize' &&
            stage.produces.includes('ResearchSynthesis/v1'),
          'synthesis correction is not the exact observed unnormalized native item',
        );
        const workRows = this.#database
          .query("SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work'")
          .all(this.#workspaceId) as { revision: number; payload: string; digest: string }[];
        const owners = workRows.filter((row) => {
          const value = JSON.parse(row.payload) as WorkState;
          return value.binding.lifecycle_work_id === plan.work_id && value.execution.run_id === current.state.run_id;
        });
        const owner = owners.length === 1 ? (JSON.parse(owners[0]!.payload) as WorkState) : null;
        const ledger = this.#database
          .query(
            "SELECT revision,payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'",
          )
          .get(this.#workspaceId) as { revision: number; payload: string; digest: string } | null;
        requireState(
          owner?.lease === null &&
            owner.execution.status === 'suspended' &&
            owner.binding.repository_id === plan.repository_id &&
            sameJson(owner.binding.project_ids, plan.project_ids) &&
            owner.binding.integrations_digest === plan.integrations_digest &&
            owner.binding.config_digest === plan.config_digest &&
            owner.binding.work_source_revision === plan.source_digest &&
            owner.artifacts.every(
              (artifact) => artifact.schema !== 'ResearchSynthesis/v1' || artifact.stage_id !== item.request.stage_id,
            ) &&
            owners[0]!.revision === plan.expected_work.revision &&
            owners[0]!.digest === plan.expected_work.digest &&
            canonicalJsonDigest(owner) === owners[0]!.digest &&
            ledger?.revision === plan.expected_ledger.revision &&
            ledger.digest === plan.expected_ledger.digest &&
            canonicalJsonDigest(JSON.parse(ledger.payload)) === ledger.digest,
          'synthesis correction owner, artifacts or coordination CAS changed',
        );
        const state: MastraSessionLedgerState = {
          ...current.state,
          items: [{ request: item.request, issue_id: null, observation: null }],
        };
        const updated = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            current.version.revision + 1,
            canonicalJson(state),
            canonicalJsonDigest(state),
            this.#workspaceId,
            plan.work_id,
            plan.attempt,
            current.version.revision,
            current.version.digest,
          );
        requireState(updated.changes === 1, 'synthesis correction journal CAS lost');
        this.#database.exec(
          'CREATE TABLE IF NOT EXISTS agent_host_synthesis_observation_correction (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,action_id))',
        );
        this.#database
          .query('INSERT INTO agent_host_synthesis_observation_correction VALUES(?,?,?,?,?,?)')
          .run(this.#workspaceId, plan.work_id, plan.attempt, plan.action_id, canonicalJson(plan), plan.digest);
        return this.#read(plan.work_id, plan.attempt)!;
      })
      .immediate();
  }

  /** Record an actual replacement result and its logical Mastra projection in one local CAS. */
  reportReadOnlyReplacement(
    workId: string,
    attempt: number,
    expected: StateVersion,
    supplied: SessionBridgeObservation,
    sourceScope: ScopedSourceSnapshot,
  ): MastraSessionLedgerSnapshot {
    const observation = parseSessionBridgeObservation(supplied);
    requireState(!this.#database.inTransaction, 'nested replacement report transaction forbidden');
    return this.#database
      .transaction(() => {
        this.#assertWorkingGeneration();
        const current = this.#read(workId, attempt);
        requireState(
          current && canonicalJsonDigest(current.version) === canonicalJsonDigest(expected),
          'replacement report CAS version changed',
        );
        const plans = this.#database
          .query(
            'SELECT payload FROM agent_host_readonly_dispatch_repair WHERE workspace_id=? AND work_id=? AND attempt=? AND generation=1',
          )
          .all(this.#workspaceId, workId, attempt) as { payload: string }[];
        const plan = plans
          .map((row) => JSON.parse(row.payload) as ReadOnlyDispatchPlan)
          .find((entry) => entry.dispatch_action_id === observation.action_id);
        requireState(
          plan && plan.replacement_issue_id === observation.issue_id && observation.host_attempt_id === undefined,
          'replacement report has no matching read-only dispatch',
        );
        const activation = this.#readDispatchActivation(workId, attempt, plan.logical_action_id);
        const item = current.state.items.find((entry) => entry.request.action_id === plan.logical_action_id);
        requireState(
          activation &&
            activation.plan_digest === plan.digest &&
            activation.dispatch_action_id === observation.action_id &&
            activation.issue_id === observation.issue_id &&
            item?.issue_id === observation.issue_id &&
            item.observation === null &&
            !item.host_reservation &&
            current.state.source_scope?.digest === plan.source_digest &&
            sourceScope.digest === plan.source_digest,
          'replacement current issue or source binding changed',
        );
        requireState(
          observation.output_digest === canonicalJsonDigest(observation.summary) &&
            ![...current.state.items, ...current.state.completed.flatMap((entry) => entry.items)].some(
              (entry) => entry.observation?.tool_call_ref === observation.tool_call_ref,
            ),
          'replacement output digest or tool reference differs',
        );
        const projected = { ...observation, action_id: plan.logical_action_id };
        const state = {
          ...current.state,
          items: current.state.items.map((entry) =>
            entry.request.action_id === plan.logical_action_id ? { ...entry, observation: projected } : entry,
          ),
        };
        const changed = this.#database
          .query(
            'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?',
          )
          .run(
            expected.revision + 1,
            canonicalJson(state),
            canonicalJsonDigest(state),
            this.#workspaceId,
            workId,
            attempt,
            expected.revision,
            expected.digest,
          );
        requireState(changed.changes === 1, 'replacement report journal CAS conflict');
        this.#database.exec(
          'CREATE TABLE IF NOT EXISTS agent_host_readonly_dispatch_outcome (workspace_id TEXT NOT NULL, work_id TEXT NOT NULL, attempt INTEGER NOT NULL, logical_action_id TEXT NOT NULL, payload TEXT NOT NULL, digest TEXT NOT NULL, PRIMARY KEY(workspace_id,work_id,attempt,logical_action_id))',
        );
        const outcome = {
          schema: 'VidaReadOnlyDispatchOutcome/v1',
          plan_digest: plan.digest,
          dispatch_action_id: observation.action_id,
          logical_action_id: plan.logical_action_id,
          issue_id: observation.issue_id,
          raw_observation: observation,
          projected_observation_digest: canonicalJsonDigest(projected),
        };
        this.#database
          .query('INSERT INTO agent_host_readonly_dispatch_outcome VALUES(?,?,?,?,?,?)')
          .run(
            this.#workspaceId,
            workId,
            attempt,
            plan.logical_action_id,
            canonicalJson(outcome),
            canonicalJsonDigest(outcome),
          );
        return this.#read(workId, attempt)!;
      })
      .immediate();
  }

  /** Reconcile only requests already present in Mastra's persisted suspended snapshot. */
  sync(
    workId: string,
    attempt: number,
    runId: string,
    stepId: string | null,
    requests: readonly SessionBridgeRequest[],
    sourceScope: ScopedSourceSnapshot | null = null,
    workflowStatus: 'suspended' | 'success' | 'failed' | 'canceled' | 'unknown' = 'unknown',
  ): MastraSessionLedgerSnapshot {
    const project = (value: MastraSessionLedgerSnapshot): MastraSessionLedgerSnapshot =>
      stepId === null ? freezeJsonValue({ ...value, resume_status: workflowStatus === 'success' ? 'complete' : 'blocked' }) : value;
    requireState(stepId === null || workflowStatus === 'suspended' || workflowStatus === 'unknown',
      'terminal workflow cannot have suspended requests');
    requireState(
      (stepId === null && requests.length === 0) ||
        (stepId !== null && requests.length > 0 && requests.every((request) => request.run_id === runId)),
      'Mastra session snapshot has invalid suspended requests',
    );
    const current = this.#read(workId, attempt);
    if (!current) {
      requireState(stepId !== null, 'Mastra session cannot start with a terminal snapshot');
      const state: MastraSessionLedgerState = {
        schema: 'MastraSessionLedger/v1',
        workspace_id: this.#workspaceId,
        work_id: workId,
        attempt,
        run_id: runId,
        step_id: stepId,
        source_scope: sourceScope,
        items: requests.map((request) => ({ request, issue_id: null, observation: null })),
        completed: [],
      };
      const digest = canonicalJsonDigest(state);
      const result = this.#database
        .transaction(() => {
          this.#assertWorkingGeneration();
          return this.#database
            .query(
              'INSERT INTO agent_host_mastra_session_ledger (workspace_id,work_id,attempt,revision,payload,digest) VALUES (?,?,?,?,?,?) ON CONFLICT DO NOTHING',
            )
            .run(this.#workspaceId, workId, attempt, 1, canonicalJson(state), digest);
        })
        .immediate();
      if (result.changes === 0) return this.sync(workId, attempt, runId, stepId, requests, sourceScope, workflowStatus);
      return this.#read(workId, attempt)!;
    }
    requireState(current.state.run_id === runId, 'Mastra session run id differs from ledger');
    if (current.state.source_scope)
      requireState(
        sourceScope?.digest === current.state.source_scope.digest,
        'Mastra session scoped source changed; affected evidence must be revalidated',
      );
    if (current.state.step_id === stepId) {
      requireState(
        sameJson(
          current.state.items.map((item) => item.request),
          requests,
        ),
        'Mastra suspended request set differs from ledger',
      );
      return project(current);
    }
    requireState(
      current.state.step_id !== null &&
        current.state.items.every((item) => item.observation !== null) &&
        !current.state.completed.some((entry) => entry.step_id === stepId),
      'Mastra advanced without all unique observed effects',
    );
    return project(this.#change(workId, attempt, current.version, (state) => ({
      ...state,
      step_id: stepId,
      items: requests.map((request) => ({ request, issue_id: null, observation: null })),
      completed: [...state.completed, { step_id: state.step_id!, items: state.items }],
    })));
  }

  issueWave(
    workId: string,
    attempt: number,
    expected: StateVersion,
    reservations: Readonly<Record<string, WorkflowSessionReservation>> = {},
  ): MastraSessionLedgerSnapshot {
    return this.#change(workId, attempt, expected, (state) => {
      requireState(state.step_id !== null && state.items.length > 0, 'Mastra session has no suspended wave');
      requireState(
        state.items.every((item) => item.issue_id === null),
        'Mastra session wave was already issued',
      );
      requireState(
        Object.keys(reservations).every((actionId) => state.items.some((item) => item.request.action_id === actionId)),
        'native host reservation has no suspended action',
      );
      return {
        ...state,
        items: state.items.map((item) => ({
          ...item,
          issue_id: randomUUID(),
          ...(reservations[item.request.action_id] === undefined
            ? {}
            : { host_reservation: reservations[item.request.action_id] }),
        })),
      };
    });
  }

  /** Persist the exact issued instruction set before exposing a native research action. */
  reserveResearchActivation(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
    use: ActivationUse,
    suppliedPlan: ObservedActivationUseWritePlan,
  ): MastraSessionLedgerSnapshot {
    const plan = validateObservedActivationUseWritePlan(suppliedPlan);
    const validUse = validateActivationUse(use);
    return this.#change(workId, attempt, expected, (state) => {
      const item = state.items.find((entry) => entry.request.action_id === actionId);
      requireState(
        item?.issue_id !== null && item?.observation === null && !item?.research_activation,
        'research activation needs one unexposed issued action',
      );
      requireState(
        validateResearchJournalItem({ ...item, research_activation: { use: validUse, plan } }, state),
        'research activation plan differs from issued action',
      );
      return {
        ...state,
        items: state.items.map((entry) =>
          entry.request.action_id === actionId ? { ...entry, research_activation: { use: validUse, plan } } : entry,
        ),
      };
    });
  }

  /** Bind canonical file preimages and desired hashes to the observed result before any write. */
  reserveResearchNormalization(
    workId: string,
    attempt: number,
    expected: StateVersion,
    actionId: string,
    suppliedPlan: ObservedResearchRecordPlan,
  ): MastraSessionLedgerSnapshot {
    const plan = validateObservedResearchRecordPlan(suppliedPlan);
    return this.#change(workId, attempt, expected, (state) => {
      const item = state.items.find((entry) => entry.request.action_id === actionId);
      requireState(
        item?.observation !== null && item?.research_activation && !item?.research_normalization,
        'research normalization needs one observed activated action',
      );
      requireState(
        validateResearchJournalItem({ ...item, research_normalization: plan }, state),
        'research normalization plan differs from observation',
      );
      return {
        ...state,
        items: state.items.map((entry) =>
          entry.request.action_id === actionId ? { ...entry, research_normalization: plan } : entry,
        ),
      };
    });
  }

  report(
    workId: string,
    attempt: number,
    expected: StateVersion,
    observation: SessionBridgeObservation,
    sourceScope: ScopedSourceSnapshot | null = null,
  ): MastraSessionLedgerSnapshot {
    const current = this.#read(workId, attempt);
    const recorded = current && [...current.state.items, ...current.state.completed.flatMap((wave) => wave.items)]
      .find((item) => item.request.action_id === observation.action_id && item.observation !== null);
    if (recorded) {
      requireState(
        recorded.issue_id === observation.issue_id &&
          canonicalJsonDigest(recorded.observation) === canonicalJsonDigest(observation),
        'Mastra session observation retry differs from recorded terminal observation',
      );
      return current!;
    }
    const issued = current?.state.items.find(
      (item) => item.request.action_id === observation.action_id,
    );
    if (issued?.host_reservation) {
      const reservation = issued.host_reservation;
      const host = this.hostState.readHostStateSnapshot(reservation.receipt.identity);
      const completed = host.work?.execution.assignment_attempts.find(
        (item) => item.attempt_id === reservation.receipt.attempt.attempt_id,
      );
      requireState(
        completed?.status === 'completed' && completed.result_digest === canonicalJsonDigest(observation),
        'Mastra source observation has no completed current host attempt',
      );
    }
    return this.#change(workId, attempt, expected, (state) => {
      requireState(state.step_id !== null, 'Mastra session is terminal');
      const item = state.items.find((entry) => entry.request.action_id === observation.action_id);
      requireState(
        item?.issue_id === observation.issue_id && item.observation === null,
        'Mastra session report has no matching open issuance',
      );
      requireState(
        observation.host_attempt_id === item.host_reservation?.receipt.attempt.attempt_id,
        'Mastra session host attempt identity differs',
      );
      if (item.host_reservation) {
        requireState(
          state.source_scope && sourceScope && Array.isArray(observation.changed_paths),
          'source-writing observation needs a scoped source change set',
        );
        const changed = compareScopedSourceSnapshots(state.source_scope!, sourceScope!).map((entry) => entry.path);
        requireState(
          canonicalJsonDigest(changed) === canonicalJsonDigest([...observation.changed_paths!].sort()),
          'source-writing observation differs from actual scoped file changes',
        );
      } else if (state.source_scope)
        requireState(
          sourceScope?.digest === state.source_scope.digest,
          'read-only observation cannot rebase changed source',
        );
      requireState(
        observation.output_digest === canonicalJsonDigest(observation.summary),
        'Mastra session report output digest differs',
      );
      requireState(
        ![...state.items, ...state.completed.flatMap((entry) => entry.items)].some(
          (entry) => entry.observation?.tool_call_ref === observation.tool_call_ref,
        ),
        'Mastra session tool call reference was replayed',
      );
      return {
        ...state,
        ...(item.host_reservation ? { source_scope: sourceScope } : {}),
        items: state.items.map((entry) =>
          entry.request.action_id === observation.action_id ? { ...entry, observation } : entry,
        ),
      };
    });
  }
}

export function openConfiguredMastraSessionLedger(repositoryRoot: string): MastraSessionLedger {
  const config = loadRuntimeConfig(repositoryRoot);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
  const access = requireSafeRepositoryAccess(repositoryRoot);
  access.ensureDirectory(config.control.work_root, 'Mastra session ledger root');
  const databasePath = sessionHandoffDatabasePath(repositoryRoot, config);
  try {
    const stats = lstatSync(databasePath);
    requireState(
      stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1,
      'Mastra session ledger database path is unsafe',
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const database = openHostStateDatabase(databasePath);
  try {
    let hostState!: HostStateStore;
    const approvalVerifier = createLocalSourceWriteApprovalVerifier(repositoryRoot, () => hostState);
    const reconciliationVerifier = createLocalSessionReconciliationVerifier(repositoryRoot);
    hostState = new HostStateStore(
      database,
      workspaceId,
      reconciliationVerifier,
      undefined,
      approvalVerifier,
      undefined,
      repositoryRoot,
    );
    return new MastraSessionLedger(database, workspaceId, config, repositoryRoot, hostState);
  } catch (error) {
    database.close();
    throw error;
  }
}
