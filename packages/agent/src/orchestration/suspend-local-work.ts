import { sameCoordinationStrings } from '../contracts/envelopes.js';
import type {
  HistoricalTerminalSynthesisProvenance,
  HostStateSnapshot,
  HostStateStore,
  StateVersion,
  WorkIdentity,
  WorkState,
} from '../host-state.js';
import { completedSourceJournalObservationMatches } from '../host-state.js';
import type { DocumentationVerificationContext } from '../lifecycle/lifecycle-state.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { type AgentRuntimeConfig, loadRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import {
  configuredReadonlyAssignment,
  lifecyclePreparationObservationSchema,
  settledSessionItems,
  validateWorkSessionBindingAndReturnCorrectiveAuthority,
} from './final-assurance.js';
import type { SessionBridgeSnapshot } from './mastra-session-bridge.js';
import type { CorrectiveExecution } from './final-assurance.js';
import { parseObservedValidatorVerdict } from './observed-validation.js';
import { parseObservedTesterVerdict } from './observed-testing.js';
import { parseObservedDeliveryProposal } from './observed-delivery.js';
import {
  readHistoricalObservedResearchLineage,
  readHistoricalObservedActivationUse,
  validateObservedResearchRecordPlan,
  validateObservedActivationUseWritePlan,
  validateActivationUse,
} from '../research-decision.js';
import { compareScopedSourceSnapshots, type ScopedSourceSnapshot } from './scoped-source-snapshot.js';

function requireSuspension(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`local work suspension: ${message}`);
}

/** Release only this admitted work's exact lease after all observed native activity is quiescent. */
type SuspensionInput = {
  readonly store: HostStateStore;
  readonly identity: WorkIdentity;
  readonly journal: MastraSessionLedgerSnapshot;
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly nativeSessionHandle: string;
  readonly userRequestPointer: string;
  readonly requestIntent: 'linked_correction' | 'next_work';
  readonly documentationContext: DocumentationVerificationContext;
  readonly config?: AgentRuntimeConfig;
  readonly expectedMaintenanceGeneration?: number;
};

export function suspendLocalWork(input: SuspensionInput): HostStateSnapshot {
  return suspendLocalWorkCore(input, false);
}

export type CompletedSourceWorkflowSuspensionInput = SuspensionInput & {
  readonly config: AgentRuntimeConfig;
  readonly expectedMaintenanceGeneration: number;
};

export type TerminalOwnerSuspensionInput = SuspensionInput & {
  readonly config: AgentRuntimeConfig;
  readonly expectedMaintenanceGeneration: number;
  readonly kind: 'corrective_source_frontier' | 'observed_terminal_readonly';
  readonly engineSnapshot?: SessionBridgeSnapshot;
  readonly ownerTicketId: string;
  readonly ownerClaimId: string;
  readonly ownerGeneration: number;
  readonly terminalIssue?: { readonly action_id: string; readonly issue_id: string };
};

type TerminalOwnerCoreBinding = {
  readonly kind: TerminalOwnerSuspensionInput['kind'];
  readonly requestDigest: string;
  readonly ownerTicketId: string;
  readonly ownerClaimId: string;
  readonly ownerGeneration: number;
  readonly correctiveExecution?: CorrectiveExecution;
};

/** Release one exact terminal owner after the public caller has reread its bound evidence. */
export function suspendTerminalOwnerWork(
  input: TerminalOwnerSuspensionInput,
  requestDigest: string,
): HostStateSnapshot {
  return releaseTerminalOwner(input, requestDigest, false);
}

/** Read-only eligibility check for the exact terminal-owner release request. */
export function inspectTerminalOwnerWork(
  input: TerminalOwnerSuspensionInput,
  requestDigest: string,
): HostStateSnapshot {
  return releaseTerminalOwner(input, requestDigest, true);
}

function releaseTerminalOwner(
  input: TerminalOwnerSuspensionInput,
  requestDigest: string,
  inspectOnly: boolean,
): HostStateSnapshot {
  const current = input.store.readWorkSessionSnapshot(input.identity, input.journal.state.attempt),
    work = current.host.work,
    state = input.journal.state,
    items = [...state.completed.flatMap((wave) => wave.items), ...state.items];
  requireSuspension(
    work &&
      current.journal &&
      canonicalJsonDigest(current.journal.version) === canonicalJsonDigest(input.journal.version) &&
      canonicalJsonDigest(current.journal.state) === canonicalJsonDigest(state) &&
      /^[a-f0-9]{64}$/.test(requestDigest),
    'terminal owner journal or request binding differs',
  );
  requireSuspension(
    input.identity.project_ids.length === 1 &&
      input.documentationContext.repository_id === input.identity.repository_id &&
      input.documentationContext.project_id === input.identity.project_ids[0] &&
      input.documentationContext.work_id === input.identity.work_id &&
      work.binding.config_digest === runtimeConfigDigest(input.config),
    'terminal owner configuration or work binding differs',
  );
  let correctiveExecution: CorrectiveExecution | undefined;
  if (input.kind === 'corrective_source_frontier') {
    correctiveExecution = requireCorrectiveTerminalFrontier(input, work, items);
  } else requireObservedTerminalReadonly(input, work, items);
  return suspendLocalWorkCore(input, false, false, inspectOnly, false, false, false, undefined, {
    kind: input.kind,
    requestDigest,
    ownerTicketId: input.ownerTicketId,
    ownerClaimId: input.ownerClaimId,
    ownerGeneration: input.ownerGeneration,
    ...(correctiveExecution ? { correctiveExecution } : {}),
  });
}

function requireCorrectiveTerminalFrontier(
  input: TerminalOwnerSuspensionInput,
  work: WorkState,
  items: readonly SettledWorkflowItem[],
): CorrectiveExecution {
  const state = input.journal.state,
    execution = state.corrective_execution;
  requireSuspension(execution, 'corrective terminal frontier has no persisted execution');
  const authority = validateWorkSessionBindingAndReturnCorrectiveAuthority(
    work,
    { attempt: state.attempt, run_id: state.run_id, corrective_execution: execution },
    input.documentationContext.repository_root,
  );
  requireSuspension(
    authority &&
      execution.base_run_id === work.execution.run_id &&
      execution.engine_run_id === state.run_id &&
      execution.correction_generation === work.lifecycle.assurance.correction_count &&
      canonicalJsonDigest(authority.stage_ids) === canonicalJsonDigest(execution.stage_ids) &&
      input.engineSnapshot?.run_id === execution.engine_run_id &&
      state.items.every((item) => item.issue_id !== null && item.observation !== null) &&
      work.execution.assignment_attempts.length > 0 &&
      work.execution.assignment_attempts.every((attempt) => attempt.status === 'completed'),
    'corrective authority, persisted frontier or Source effects are unsettled',
  );
  const workflow = input.config.workflows[work.binding.workflow_id],
    stages = execution.stage_ids.map((stageId) => workflow?.stages.find((stage) => stage.id === stageId));
  requireSuspension(
    workflow &&
      execution.stage_ids.length === 3 &&
      new Set(execution.stage_ids).size === 3 &&
      stages.every(Boolean) &&
      stages.filter((stage) => stage?.kind === 'develop').length === 1 &&
      stages.filter((stage) => stage?.kind === 'validate').length === 1 &&
      stages.filter((stage) => stage?.kind === 'test').length === 1,
    'corrective stage subset differs from the configured develop/validate/test frontier',
  );
  const expected = stages.flatMap((stage) =>
    stage!.assignments.map((assignment, assignmentIndex) => ({ stage: stage!, assignment, assignmentIndex })),
  );
  requireSuspension(
    items.length === expected.length &&
      expected.every(({ stage, assignment, assignmentIndex }) => {
        const matches = items.filter(
          (item) => item.request.stage_id === stage.id && item.request.assignment_index === assignmentIndex,
        );
        if (matches.length !== 1) return false;
        const item = matches[0]!,
          request = item.request,
          profile = input.config.agents.profiles[assignment.profile],
          policy = profile && input.config.agents.tool_policies[profile.tools_policy],
          observation = item.observation;
        if (
          request.run_id !== state.run_id ||
          request.workflow_id !== work.binding.workflow_id ||
          request.config_digest !== work.binding.config_digest ||
          request.corrective_execution === undefined ||
          canonicalJsonDigest(request.corrective_execution) !== canonicalJsonDigest(execution) ||
          request.role !== assignment.role ||
          !item.issue_id ||
          !observation ||
          observation.action_id !== request.action_id ||
          observation.issue_id !== item.issue_id ||
          item.research_activation ||
          item.research_normalization
        )
          return false;
        if (stage.kind === 'develop')
          return Boolean(
            profile?.mutation_scope === 'repository_source' &&
            item.host_reservation &&
            observation.status === 'reported_complete' &&
            completedSourceJournalObservationMatches(work, item),
          );
        if (item.host_reservation || profile?.mutation_scope !== 'none' || policy?.source_write !== false) return false;
        if (stage.kind === 'validate')
          return (
            observation.status === 'reported_complete' && parseObservedValidatorVerdict(observation).verdict === 'pass'
          );
        return (
          stage.kind === 'test' &&
          ['reported_complete', 'reported_failed'].includes(observation.status) &&
          ((parseObservedTesterVerdict(observation).status === 'pass' && observation.status === 'reported_complete') ||
            (parseObservedTesterVerdict(observation).status === 'fail' && observation.status === 'reported_failed'))
        );
      }),
    'corrective Source assignments or typed Code/test outcomes differ',
  );
  const tester = items.find((item) => stages.find((stage) => stage?.kind === 'test')?.id === item.request.stage_id);
  requireSuspension(tester?.observation, 'corrective terminal tester observation is missing');
  const observations = items.map((item) => item.observation);
  requireSuspension(
    input.engineSnapshot.status === 'success'
      ? input.engineSnapshot.step_id === null &&
          input.engineSnapshot.requests.length === 0 &&
          tester.observation.status === 'reported_complete' &&
          canonicalJsonDigest(input.engineSnapshot.observations) === canonicalJsonDigest(observations)
      : input.engineSnapshot.status === 'suspended' &&
          input.engineSnapshot.step_id !== null &&
          input.engineSnapshot.requests.length === 1 &&
          tester.observation.status === 'reported_failed' &&
          canonicalJsonDigest(input.engineSnapshot.requests[0]) === canonicalJsonDigest(tester.request) &&
          canonicalJsonDigest(input.engineSnapshot.observations) ===
            canonicalJsonDigest(observations.filter((observation) => observation !== tester.observation)),
    'corrective engine requests or observations differ from the terminal journal',
  );
  return execution;
}

function requireObservedTerminalReadonly(
  input: TerminalOwnerSuspensionInput,
  work: WorkState,
  items: readonly SettledWorkflowItem[],
): void {
  const state = input.journal.state,
    pending = items.filter((item) => item.issue_id !== null && item.observation === null);
  requireSuspension(
    !state.corrective_execution &&
      input.journal.resume_status === 'issued_outcome_uncertain' &&
      pending.length === 1 &&
      input.terminalIssue?.action_id === pending[0]!.request.action_id &&
      input.terminalIssue.issue_id === pending[0]!.issue_id &&
      items.every(
        (item) =>
          !item.host_reservation &&
          !item.research_activation &&
          !item.research_normalization &&
          item.issue_id !== null &&
          (item === pending[0]
            ? item.observation === null
            : item.observation?.status === 'reported_complete' &&
              configuredReadonlyAssignment(input.config, item.request)),
      ) &&
      configuredReadonlyAssignment(input.config, pending[0]!.request) &&
      work.execution.assignment_attempts.length === 0,
    'observed terminal readonly issue differs or retains a writer effect',
  );
}

/** Dispose only exact settled execution ownership; task acceptance remains unchanged. */
export function suspendCompletedSourceWorkflowWork(input: CompletedSourceWorkflowSuspensionInput): HostStateSnapshot {
  const current = input.store.readWorkSessionSnapshot(input.identity, input.journal.state.attempt);
  requireSuspension(current.host.work && current.journal, 'completed Source workflow is not persisted');
  requireSuspension(
    canonicalJsonDigest(current.journal.version) === canonicalJsonDigest(input.journal.version) &&
      canonicalJsonDigest(current.journal.state) === canonicalJsonDigest(input.journal.state) &&
      runtimeConfigDigest(input.config) === current.host.work.binding.config_digest &&
      runtimeConfigDigest(loadRuntimeConfig(input.documentationContext.repository_root)) ===
        current.host.work.binding.config_digest,
    'completed Source workflow journal or configuration differs',
  );
  requireCompletedSourceWorkflow(input, current.host.work);
  return suspendLocalWorkCore(input, false, true);
}

type SettledWorkflowItem = MastraSessionLedgerSnapshot['state']['items'][number];

function requireCompletedSourceWorkflow(input: CompletedSourceWorkflowSuspensionInput, work: WorkState): void {
  const state = input.journal.state,
    { observed, inert } = settledSessionItems(state);
  requireSuspension(
    input.journal.resume_status === 'complete' &&
      state.step_id === null &&
      state.items.length === 0 &&
      inert.length === 0,
    'Source workflow is not terminal',
  );
  requireSuspension(
    observed.length > 0 && new Set(observed.map((item) => item.request.action_id)).size === observed.length,
    'Source workflow actions are missing or duplicated',
  );
  const kinds = observed.map((item) => completedWorkflowItemKind(input, work, item));
  requireSuspension(
    kinds.includes('develop') &&
      kinds.includes('validate-code') &&
      kinds.includes('test') &&
      kinds.at(-1) === 'deliver',
    'Source workflow lacks completed Code/test/delivery stages',
  );
}

function completedWorkflowAssignment(
  input: CompletedSourceWorkflowSuspensionInput,
  work: WorkState,
  item: SettledWorkflowItem,
) {
  const request = item.request;
  requireSuspension(
    request.run_id === input.journal.state.run_id &&
      request.workflow_id === work.binding.workflow_id &&
      request.config_digest === work.binding.config_digest &&
      item.observation?.status === 'reported_complete',
    'Source workflow has foreign, failed or UNKNOWN activity',
  );
  const stage = input.config.workflows[request.workflow_id]?.stages.find((entry) => entry.id === request.stage_id);
  const assignment = stage?.assignments[request.assignment_index],
    profile = assignment && input.config.agents.profiles[assignment.profile];
  requireSuspension(
    stage && assignment?.role === request.role && profile && !item.research_activation && !item.research_normalization,
    'Source workflow assignment differs',
  );
  return { stage, profile };
}

function completedWorkflowItemKind(
  input: CompletedSourceWorkflowSuspensionInput,
  work: WorkState,
  item: SettledWorkflowItem,
): string {
  const { stage, profile } = completedWorkflowAssignment(input, work, item);
  if (item.host_reservation) {
    requireSuspension(
      stage.kind === 'develop' &&
        profile.mutation_scope === 'repository_source' &&
        completedSourceJournalObservationMatches(work, item),
      'Source result lacks its accepted Host reservation',
    );
    return 'develop';
  }
  requireSuspension(
    profile.mutation_scope === 'none' &&
      input.config.agents.tool_policies[profile.tools_policy]?.source_write === false,
    'completed workflow action is not configured readonly',
  );
  return completedReadonlyWorkflowKind(input.config, stage, item);
}

function completedReadonlyWorkflowKind(
  config: AgentRuntimeConfig,
  stage: AgentRuntimeConfig['workflows'][string]['stages'][number],
  item: SettledWorkflowItem,
): string {
  const observation = item.observation;
  requireSuspension(observation, 'completed workflow observation is missing');
  if (stage.kind === 'test') {
    requireSuspension(parseObservedTesterVerdict(observation).status === 'pass', 'completed workflow tester failed');
    return 'test';
  }
  if (stage.kind === 'deliver') {
    parseObservedDeliveryProposal(observation);
    return 'deliver';
  }
  requireSuspension(
    configuredReadonlyAssignment(config, item.request, 'settled-validation'),
    'completed workflow readonly policy differs',
  );
  if (stage.kind === 'validate' && stage.produces.includes('ValidationReceipt/v1')) {
    requireSuspension(
      parseObservedValidatorVerdict(observation).verdict === 'pass',
      'completed workflow validator failed',
    );
    return 'validate-code';
  }
  if (stage.kind === 'validate' && stage.produces.includes('LifecyclePreparationObservation/v1')) {
    const preparation = lifecyclePreparationObservationSchema.parse(JSON.parse(observation.summary));
    requireSuspension(
      preparation.status === 'pass' && preparation.gaps.length === 0,
      'completed workflow prewrite remains GAP',
    );
  }
  return stage.kind;
}

/** Close a completed readonly owner's exact lease, including an expired one.
 * This grants no lease, fencing generation, source rights or task acceptance.
 * The admitted capture entrypoint validates original configured readonly rights.
 */
export function suspendCompletedReadOnlyWork(input: SuspensionInput): HostStateSnapshot {
  requireCompletedReadonly(input);
  return suspendLocalWorkCore(input, true);
}

function requireCompletedReadonly(input: SuspensionInput): void {
  // Trusted older callers already validate configured rights and omit config.
  const issues = input.config
    ? settledSessionItems(input.journal.state).observed
    : [...input.journal.state.completed.flatMap((step) => step.items), ...input.journal.state.items];
  requireSuspension(
    issues.length > 0 &&
      issues.every(
        (item) =>
          item.issue_id !== null &&
          item.observation?.status === 'reported_complete' &&
          !item.host_reservation &&
          !item.research_activation &&
          !item.research_normalization &&
          (!input.config || configuredReadonlyAssignment(input.config, item.request, 'completed-readonly')),
      ),
    'completed readonly owner still has unobserved, failed or reserved activity',
  );
}

type HistoricalSuspensionInput = SuspensionInput & {
  readonly config: AgentRuntimeConfig;
  readonly predicate:
    | 'completed_readonly'
    | 'unknown_readonly'
    | 'settled_writer_failed_validators'
    | 'unissued_prepared'
    | 'settled_research'
    | 'readonly_bookkeeping'
    | 'terminal_synthesis_unaccepted';
  readonly expectedMaintenanceGeneration: number;
  readonly preimage?: ScopedSourceSnapshot | undefined;
  readonly capture?: {
    readonly actionId: string;
    readonly issueId: string;
    readonly bodyBytes: Uint8Array;
    readonly provenance: HistoricalTerminalSynthesisProvenance;
  };
};

type HistoricalTerminalSynthesisCaptureInput = HistoricalSuspensionInput & {
  readonly predicate: 'terminal_synthesis_unaccepted';
  readonly capture: NonNullable<HistoricalSuspensionInput['capture']>;
};

function requireReadonlyBookkeeping(
  input: HistoricalSuspensionInput,
  host: HostStateSnapshot,
  terminalSynthesisTarget?: { readonly actionId: string; readonly issueId: string },
): void {
  const work = host.work,
    ledger = host.ledger,
    state = input.journal.state;
  requireSuspension(
    work && ledger && state.source_scope && work.execution.assignment_attempts.length === 0,
    'readonly bookkeeping has writer history or missing scope',
  );
  const items = [...state.completed.flatMap((wave) => wave.items), ...state.items];
  requireSuspension(
    items.some((item) => item.research_activation) &&
      items.filter((item) => item.issue_id !== null && item.observation === null).length <= 1,
    'readonly bookkeeping requires committed activation and at most one pending issue',
  );
  for (const item of items) {
    requireSuspension(
      !item.host_reservation &&
        item.request.run_id === state.run_id &&
        item.request.workflow_id === work.binding.workflow_id &&
        item.request.config_digest === work.binding.config_digest &&
        item.request.scope_digest === state.source_scope.digest &&
        configuredReadonlyAssignment(input.config, item.request),
      'readonly bookkeeping assignment or original scope differs',
    );
    if (item.issue_id === null) {
      requireSuspension(
        item.observation === null && !item.research_activation && !item.research_normalization,
        'readonly bookkeeping successor is not inert',
      );
      continue;
    }
    const stage = input.config.workflows[item.request.workflow_id]!.stages.find(
      (stage) => stage.id === item.request.stage_id,
    )!;
    if (item.observation === null) {
      const profile = input.config.agents.profiles[stage.assignments[item.request.assignment_index]!.profile]!;
      const exactTerminalTarget =
        terminalSynthesisTarget !== undefined &&
        terminalSynthesisTarget.actionId === item.request.action_id &&
        terminalSynthesisTarget.issueId === item.issue_id;
      requireSuspension(
        (exactTerminalTarget ||
          input.config.agents.egress_policies[profile.egress_policy]!.allowed_hosts.length === 0) &&
          !item.research_normalization,
        'readonly bookkeeping pending issue has egress or normalization',
      );
    } else
      requireSuspension(
        item.observation.action_id === item.request.action_id &&
          item.observation.issue_id === item.issue_id &&
          ['reported_complete', 'reported_failed'].includes(item.observation.status),
        'readonly bookkeeping observation is not terminal',
      );
    if (item.research_activation) {
      const activation = validateObservedActivationUseWritePlan(item.research_activation.plan),
        binding = activation.binding,
        ticket = ledger.tickets.find((ticket) => ticket.ticket_id === binding.lease_ticket_id);
      requireSuspension(
        binding.work_id === work.binding.lifecycle_work_id &&
          binding.attempt === state.attempt &&
          binding.run_id === state.run_id &&
          binding.action_id === item.request.action_id &&
          binding.issue_id === item.issue_id &&
          binding.config_digest === work.binding.config_digest &&
          binding.scope_digest === state.source_scope.digest &&
          binding.source_scope_digest === state.source_scope.digest &&
          binding.source_revision === work.binding.work_source_revision &&
          binding.scope_id === work.binding.scope_id &&
          ticket?.work_id === work.binding.lifecycle_work_id &&
          ticket.thread_id === input.nativeSessionHandle &&
          binding.lease_thread_id === input.nativeSessionHandle &&
          binding.lease_generation === ticket.generation &&
          ticket.repository_id === input.identity.repository_id &&
          sameCoordinationStrings(ticket.project_ids, input.identity.project_ids) &&
          ticket.integrations_digest === input.identity.integrations_digest,
        'readonly bookkeeping original activation binding differs',
      );
      readHistoricalObservedActivationUse({
        root: input.documentationContext.repository_root,
        feature: input.config.research_decision,
        plan: activation,
        use: item.research_activation.use,
      });
    }
    if (item.research_normalization) {
      requireSuspension(
        item.research_activation && item.observation?.status === 'reported_complete',
        'readonly bookkeeping normalization lacks activation or completion',
      );
      const plan = validateObservedResearchRecordPlan(item.research_normalization),
        schema = plan.schema === 'ObservedSynthesisRecordPlan/v1' ? 'ResearchSynthesis/v1' : 'ResearchResult/v1';
      requireSuspension(
        canonicalJsonDigest(plan.binding) === canonicalJsonDigest(item.research_activation.plan.binding) &&
          plan.observation_digest === canonicalJsonDigest(item.observation) &&
          stage.produces.includes(schema) &&
          work.artifacts
            .filter((artifact) => artifact.path === plan.record_path)
            .every(
              (artifact) =>
                artifact.schema === schema &&
                artifact.sha256 === plan.record_sha256 &&
                artifact.stage_id === item.request.stage_id,
            ),
        'readonly bookkeeping normalized artifact differs',
      );
      readHistoricalObservedResearchLineage({
        root: input.documentationContext.repository_root,
        feature: input.config.research_decision,
        plan,
        activation_plan: item.research_activation.plan,
        activation_use: item.research_activation.use,
      });
    }
  }
}

function requireHistoricalPredicate(input: HistoricalSuspensionInput): void {
  requireSuspension(
    input.predicate === 'terminal_synthesis_unaccepted' ? input.capture !== undefined : input.capture === undefined,
    'historical terminal synthesis capture differs from predicate',
  );
  const host = input.store.readHostStateSnapshot(input.identity);
  requireSuspension(
    host.work && host.maintenanceGeneration === input.expectedMaintenanceGeneration,
    'historical maintenance version differs',
  );
  const work = host.work,
    state = input.journal.state;
  requireSuspension(
    runtimeConfigDigest(input.config) === work.binding.config_digest &&
      canonicalJsonDigest(state) === input.journal.version.digest &&
      state.attempt > 0 &&
      !state.corrective_execution &&
      work.lifecycle.source_revision === work.binding.work_source_revision,
    'historical original configuration, journal or base attempt differs',
  );
  if (input.predicate === 'settled_writer_failed_validators') {
    requireSuspension(input.preimage && state.source_scope, 'historical writer requires full original preimage');
    const { observed, inert } = settledSessionItems(state);
    const preparation = observed.filter((item) => item.request.stage_id === 'synthesize_task');
    const writers = observed.filter((item) => item.host_reservation);
    const validators = observed.filter((item) => item.request.stage_id === 'validate_focused');
    requireSuspension(
      observed.length === 4 &&
        inert.length === 0 &&
        preparation.length === 1 &&
        writers.length === 1 &&
        validators.length === 2 &&
        work.execution.assignment_attempts.length === 1 &&
        observed.every(
          (item) =>
            !item.research_activation &&
            !item.research_normalization &&
            item.request.run_id === work.execution.run_id &&
            item.request.workflow_id === work.binding.workflow_id &&
            item.request.config_digest === work.binding.config_digest &&
            item.request.scope_digest === work.binding.work_source_revision &&
            !item.request.corrective_execution &&
            item.observation?.action_id === item.request.action_id &&
            item.observation.issue_id === item.issue_id,
        ),
      'historical writer requires exact four settled original actions',
    );
    const prep = preparation[0]!,
      writer = writers[0]!;
    requireSuspension(
      prep.request.role === 'research-synthesizer' &&
        prep.request.assignment_index === 0 &&
        prep.request.wave_index === 0 &&
        prep.observation?.status === 'reported_complete' &&
        !prep.host_reservation &&
        configuredReadonlyAssignment(input.config, prep.request) &&
        writer.request.stage_id === 'develop_task' &&
        writer.request.wave_index === 1 &&
        writer.request.assignment_index === 0 &&
        completedSourceJournalObservationMatches(work, writer) &&
        canonicalJsonDigest(validators.map((item) => item.request.role).sort()) ===
          canonicalJsonDigest(['correctness-validator', 'requirements-validator']) &&
        validators.every(
          (item) =>
            item.request.wave_index === 2 &&
            !item.host_reservation &&
            item.observation?.status === 'reported_failed' &&
            configuredReadonlyAssignment(input.config, item.request, 'settled-validation') &&
            parseObservedValidatorVerdict(item.observation).verdict === 'fail',
        ) &&
        new Set(validators.map((item) => item.request.assignment_index)).size === 2,
      'historical writer preparation, completed result or terminal validators differ',
    );
    requireSuspension(
      input.preimage.digest === work.binding.work_source_revision,
      'historical preimage binding differs',
    );
    requireSuspension(
      canonicalJsonDigest(input.preimage.entries.map((entry) => entry.path)) ===
        canonicalJsonDigest([...work.lifecycle.scope.fingerprint_paths].sort()),
      'historical preimage domain differs from admitted scope',
    );
    const changed = compareScopedSourceSnapshots(input.preimage, state.source_scope).map((entry) => entry.path);
    requireSuspension(
      changed.length === 4 &&
        canonicalJsonDigest(changed) === canonicalJsonDigest([...work.binding.implementation_paths].sort()) &&
        canonicalJsonDigest(changed) === canonicalJsonDigest([...(writer.observation?.changed_paths ?? [])].sort()) &&
        compareScopedSourceSnapshots(
          state.source_scope,
          input.store.snapshotHistoricalTaskSourceSources({
            identity: input.identity,
            threadId: input.nativeSessionHandle,
            canonicalHostRoot: input.documentationContext.repository_root,
            paths: state.source_scope.entries.map((entry) => entry.path),
            attempt: state.attempt,
          }),
        ).length === 0,
      'historical full preimage/postimage/current transition differs',
    );
  } else {
    requireSuspension(
      input.preimage === undefined && state.source_scope?.digest === work.binding.work_source_revision,
      'historical readonly scope differs',
    );
    if (input.predicate === 'readonly_bookkeeping') requireReadonlyBookkeeping(input, host);
    else if (input.predicate === 'settled_research') {
      const { observed, inert } = settledSessionItems(state);
      requireSuspension(
        observed.length > 0 &&
          work.execution.assignment_attempts.length === 0 &&
          inert.every(
            (item) =>
              item.issue_id === null &&
              item.observation === null &&
              !item.host_reservation &&
              !item.research_activation &&
              !item.research_normalization,
          ),
        'settled research has issued or reserved successor activity',
      );
      for (const item of observed) {
        requireSuspension(
          item.issue_id !== null &&
            item.observation?.status === 'reported_complete' &&
            !item.host_reservation &&
            item.research_activation &&
            item.research_normalization &&
            configuredReadonlyAssignment(input.config, item.request),
          'settled research observation is not normalized readonly activity',
        );
        const plan = validateObservedResearchRecordPlan(item.research_normalization),
          activation = validateObservedActivationUseWritePlan(item.research_activation.plan),
          use = validateActivationUse(item.research_activation.use),
          binding = plan.binding;
        const stage = input.config.workflows[work.binding.workflow_id]?.stages.find(
          (stage) => stage.id === item.request.stage_id,
        );
        const schema = stage?.produces.includes('ResearchSynthesis/v1') ? 'ResearchSynthesis/v1' : 'ResearchResult/v1';
        const ticket = host.ledger?.tickets.find((ticket) => ticket.ticket_id === binding.lease_ticket_id);
        requireSuspension(
          stage?.produces.includes(schema) &&
            binding.work_id === work.binding.lifecycle_work_id &&
            binding.attempt === state.attempt &&
            binding.run_id === state.run_id &&
            binding.action_id === item.request.action_id &&
            binding.issue_id === item.issue_id &&
            binding.config_digest === work.binding.config_digest &&
            binding.scope_digest === state.source_scope!.digest &&
            binding.source_scope_digest === state.source_scope!.digest &&
            binding.source_revision === work.binding.work_source_revision &&
            binding.scope_id === work.binding.scope_id &&
            ticket?.work_id === work.binding.lifecycle_work_id &&
            ticket.thread_id === input.nativeSessionHandle &&
            binding.lease_thread_id === input.nativeSessionHandle &&
            binding.lease_generation === ticket.generation &&
            plan.observation_digest === canonicalJsonDigest(item.observation) &&
            work.artifacts.some(
              (artifact) =>
                artifact.schema === schema &&
                artifact.path === plan.record_path &&
                artifact.sha256 === plan.record_sha256 &&
                artifact.stage_id === item.request.stage_id,
            ),
          'settled research artifact or original binding differs',
        );
        const result = readHistoricalObservedResearchLineage({
          root: input.documentationContext.repository_root,
          feature: input.config.research_decision,
          plan,
          activation_plan: activation,
          activation_use: use,
        });
        requireSuspension(
          result.schema === schema &&
            result.work_item_id === binding.work_id &&
            result.scope_id === binding.scope_id &&
            result.source_revision === binding.source_revision,
          'settled research record scope differs',
        );
      }
    } else if (input.predicate === 'unissued_prepared')
      requireSuspension(
        input.journal.resume_status === 'ready' &&
          state.completed.length === 0 &&
          state.step_id !== null &&
          state.items.length > 0 &&
          work.execution.assignment_attempts.length === 0 &&
          state.items.every(
            (item) =>
              item.issue_id === null &&
              item.observation === null &&
              !item.host_reservation &&
              !item.research_activation &&
              !item.research_normalization,
          ),
        'historical unissued owner has issued or reserved activity',
      );
    else if (input.predicate === 'completed_readonly') requireCompletedReadonly(input);
    else if (input.predicate === 'terminal_synthesis_unaccepted') {
      const capture = input.capture;
      requireSuspension(capture, 'historical terminal synthesis capture is missing');
      const items = [...state.items, ...state.completed.flatMap((wave) => wave.items)],
        pending = items.filter((item) => item.issue_id !== null && item.observation === null),
        target = pending[0],
        stage =
          target &&
          input.config.workflows[target.request.workflow_id]?.stages.find(
            (entry) => entry.id === target.request.stage_id,
          );
      requireSuspension(
        pending.length === 1 &&
          target &&
          target.request.action_id === capture.actionId &&
          target.issue_id === capture.issueId &&
          target.request.stage_id === 'synthesize_task' &&
          stage?.kind === 'synthesize' &&
          stage.produces.includes('ResearchSynthesis/v1') &&
          target.research_activation &&
          !target.research_normalization &&
          !target.host_reservation &&
          state.source_scope?.digest === work.binding.work_source_revision &&
          items
            .filter((item) => item !== target)
            .every((item) => item.issue_id !== null && item.observation?.status === 'reported_complete') &&
          work.execution.assignment_attempts.length === 0,
        'historical synthesis candidate is not one known-terminal unaccepted readonly action',
      );
      requireReadonlyBookkeeping(input, host, capture);
    } else
      requireSuspension(
        input.predicate === 'unknown_readonly' &&
          input.journal.resume_status === 'issued_outcome_uncertain' &&
          [...state.items, ...state.completed.flatMap((wave) => wave.items)].filter(
            (item) => item.issue_id !== null && item.observation === null,
          ).length === 1,
        'historical readonly predicate differs',
      );
  }
}

/** Historical disposal grants no execution or configuration adoption. Engine and caller provenance are checked by the public entrypoint. */
export function suspendHistoricalOwnerWork(input: HistoricalSuspensionInput): HostStateSnapshot {
  requireHistoricalPredicate(input);
  return suspendLocalWorkCore(
    input,
    input.predicate === 'completed_readonly',
    input.predicate === 'settled_writer_failed_validators',
    false,
    input.predicate === 'unissued_prepared',
    input.predicate === 'settled_research',
    input.predicate === 'readonly_bookkeeping' || input.predicate === 'terminal_synthesis_unaccepted',
  );
}

/** Capture one known-terminal unaccepted synthesis result and dispose only its original owner. */
export function captureHistoricalTerminalSynthesisOwnerWork(
  input: HistoricalTerminalSynthesisCaptureInput,
): HostStateSnapshot {
  requireHistoricalPredicate(input);
  return suspendLocalWorkCore(input, false, false, false, false, false, true, input.capture);
}

export function inspectHistoricalOwnerWork(input: HistoricalSuspensionInput): HostStateSnapshot {
  requireHistoricalPredicate(input);
  return suspendLocalWorkCore(
    input,
    input.predicate === 'completed_readonly',
    input.predicate === 'settled_writer_failed_validators',
    true,
    input.predicate === 'unissued_prepared',
    input.predicate === 'settled_research',
    input.predicate === 'readonly_bookkeeping' || input.predicate === 'terminal_synthesis_unaccepted',
  );
}

function suspendLocalWorkCore(
  input: SuspensionInput,
  completedReadonly: boolean,
  settledWriter = false,
  inspectOnly = false,
  unissuedPrepared = false,
  settledResearch = false,
  readonlyBookkeeping = false,
  terminalSynthesisCapture?: HistoricalTerminalSynthesisCaptureInput['capture'],
  terminalOwner?: TerminalOwnerCoreBinding,
): HostStateSnapshot {
  const {
    store,
    identity,
    journal,
    expectedWork,
    expectedLedger,
    nativeSessionHandle,
    userRequestPointer,
    requestIntent,
    documentationContext,
  } = input;
  requireSuspension(
    canonicalJsonDigest(journal.state) === journal.version.digest,
    'session journal evidence differs from its version',
  );
  requireSuspension(
    nativeSessionHandle.length > 0 &&
      nativeSessionHandle.length <= 256 &&
      userRequestPointer.length > 0 &&
      userRequestPointer.length <= 2048 &&
      !/\p{Cc}/u.test(nativeSessionHandle + userRequestPointer),
    'native session or attributed request pointer is invalid',
  );
  const host = store.readHostStateSnapshot(identity);
  requireSuspension(
    input.expectedMaintenanceGeneration === undefined ||
      host.maintenanceGeneration === input.expectedMaintenanceGeneration,
    'maintenance generation changed after inspection',
  );
  requireSuspension(
    identity.project_ids.length === 1 &&
      documentationContext.repository_id === identity.repository_id &&
      documentationContext.project_id === identity.project_ids[0] &&
      documentationContext.work_id === identity.work_id,
    'documentation verification context differs from the admitted work',
  );
  requireSuspension(
    host.work && host.ledger && host.workVersion && host.ledgerVersion,
    'admitted work or ledger is missing',
  );
  const work = host.work;
  requireSuspension(
    [...journal.state.items, ...journal.state.completed.flatMap((wave) => wave.items)].every(
      (item) => !item.host_reservation || completedSourceJournalObservationMatches(work, item),
    ),
    'source observation is not an authoritative completed host result',
  );
  requireSuspension(
    work.binding.repository_id === identity.repository_id &&
      canonicalJsonDigest(work.binding.project_ids) === canonicalJsonDigest(identity.project_ids) &&
      work.binding.integrations_digest === identity.integrations_digest &&
      work.binding.lifecycle_work_id === identity.work_id &&
      journal.state.workspace_id === store.workspaceId &&
      journal.state.work_id === identity.work_id &&
      (journal.state.run_id === work.execution.run_id ||
        (terminalOwner?.kind === 'corrective_source_frontier' &&
          terminalOwner.correctiveExecution &&
          journal.state.run_id === terminalOwner.correctiveExecution.engine_run_id &&
          terminalOwner.correctiveExecution.base_run_id === work.execution.run_id &&
          canonicalJsonDigest(journal.state.corrective_execution) ===
            canonicalJsonDigest(terminalOwner.correctiveExecution) &&
          terminalOwner.correctiveExecution.correction_generation === work.lifecycle.assurance.correction_count)),
    'work identity or journal differs',
  );
  const issues = [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items];
  const pending = issues.filter((item) => item.issue_id !== null && item.observation === null);
  const unknownReadonly =
    pending.length === 1 &&
    input.config !== undefined &&
    canonicalJsonDigest(journal.state) === journal.version.digest &&
    runtimeConfigDigest(input.config) === work.binding.config_digest &&
    journal.resume_status === 'issued_outcome_uncertain' &&
    journal.state.source_scope?.digest === work.binding.work_source_revision &&
    work.lifecycle.source_revision === work.binding.work_source_revision &&
    issues.every((item) => {
      const request = item.request;
      const assignment = input.config!.workflows[work.binding.workflow_id]?.stages.find(
        (stage) => stage.id === request.stage_id,
      )?.assignments[request.assignment_index];
      const profile = assignment && input.config!.agents.profiles[assignment.profile];
      return (
        !item.host_reservation &&
        !item.research_activation &&
        !item.research_normalization &&
        request.run_id === work.execution.run_id &&
        request.workflow_id === work.binding.workflow_id &&
        request.config_digest === work.binding.config_digest &&
        request.scope_digest === work.binding.work_source_revision &&
        assignment?.role === request.role &&
        (item === pending[0]
          ? profile?.mutation_scope === 'none' &&
            configuredReadonlyAssignment(input.config!, request) &&
            input.config!.agents.tool_policies[profile.tools_policy]?.source_write === false &&
            profile.egress_policy === 'none' &&
            input.config!.agents.egress_policies[profile.egress_policy]?.allowed_hosts.length === 0
          : item.issue_id !== null &&
            item.observation?.status === 'reported_complete' &&
            configuredReadonlyAssignment(input.config!, request))
      );
    });
  if (unknownReadonly) {
    requireSuspension(
      work.execution.assignment_attempts.length === 0,
      'issued readonly release cannot retire an earlier host writer assignment',
    );
  }
  requireSuspension(
    (readonlyBookkeeping ||
      unknownReadonly ||
      pending.length === 0 ||
      (terminalOwner?.kind === 'observed_terminal_readonly' && pending.length === 1)) &&
      !work.execution.assignment_attempts.some(
        (attempt) => attempt.status === 'started' || attempt.status === 'uncertain',
      ),
    'native action or host assignment is still active or uncertain',
  );
  const operationId =
    terminalOwner === undefined
      ? `${terminalSynthesisCapture ? 'historical-terminal-synthesis-capture' : readonlyBookkeeping ? 'readonly-bookkeeping-release' : settledResearch ? 'settled-research-release' : unissuedPrepared ? 'unissued-owner-release' : settledWriter ? 'settled-writer-release' : completedReadonly ? 'completed-readonly-release' : 'session-release'}-${canonicalJsonDigest(
          {
            work_id: identity.work_id,
            nativeSessionHandle,
            userRequestPointer,
            requestIntent,
            journal: journal.version.digest,
          },
        ).slice(0, 40)}`
      : `terminal-owner-release-${canonicalJsonDigest({
          work_id: identity.work_id,
          attempt: journal.state.attempt,
          nativeSessionHandle,
          userRequestPointer,
          requestIntent,
          journal: journal.version.digest,
          kind: terminalOwner.kind,
          requestDigest: terminalOwner.requestDigest,
          ownerTicketId: terminalOwner.ownerTicketId,
          ownerClaimId: terminalOwner.ownerClaimId,
          ownerGeneration: terminalOwner.ownerGeneration,
        }).slice(0, 40)}`;
  if (work.lease === null) {
    if (terminalOwner) {
      const ticket = host.ledger.tickets.filter((item) => item.ticket_id === terminalOwner.ownerTicketId),
        claims = host.ledger.claims.filter((item) => item.claim_id === terminalOwner.ownerClaimId),
        operations = host.ledger.operations.filter((operation) => operation.operation_id === operationId);
      requireSuspension(
        work.execution.status === 'suspended' &&
          ticket.length === 1 &&
          ticket[0]!.status === 'released' &&
          ticket[0]!.work_id === identity.work_id &&
          ticket[0]!.thread_id === nativeSessionHandle &&
          ticket[0]!.generation === terminalOwner.ownerGeneration &&
          claims.length === 1 &&
          claims[0]!.status === 'released' &&
          claims[0]!.ticket_id === ticket[0]!.ticket_id &&
          claims[0]!.work_id === identity.work_id &&
          claims[0]!.thread_id === nativeSessionHandle &&
          claims[0]!.generation === terminalOwner.ownerGeneration &&
          operations.length === 1 &&
          operations[0]!.kind === 'release' &&
          operations[0]!.ticket_id === ticket[0]!.ticket_id &&
          operations[0]!.work_id === identity.work_id &&
          operations[0]!.thread_id === nativeSessionHandle &&
          operations[0]!.source_revision === ticket[0]!.source_revision &&
          operations[0]!.decision_pointer === userRequestPointer,
        'prior terminal owner release differs from this exact attributed request',
      );
    } else {
      requireSuspension(
        work.execution.status === 'suspended' &&
          host.ledger.operations.some(
            (operation) =>
              operation.kind === 'release' &&
              operation.operation_id === operationId &&
              operation.decision_pointer === userRequestPointer,
          ),
        'prior suspension is not the same attributed request',
      );
    }
    return host;
  }
  requireSuspension(
    canonicalJsonDigest(host.workVersion) === canonicalJsonDigest(expectedWork) &&
      canonicalJsonDigest(host.ledgerVersion) === canonicalJsonDigest(expectedLedger),
    'work or ledger compare-and-swap version changed',
  );
  const lease = work.lease;
  const ticket = host.ledger.tickets.find((item) => item.ticket_id === lease.ticket_id);
  const claims = host.ledger.claims.filter((item) => item.ticket_id === lease.ticket_id && item.status === 'active');
  const expectedResources = [...(ticket?.exclusive_resources ?? [])].sort();
  // An expired preparation may be released, never renewed or treated as an issued no-effect action.
  const expiredUnissued =
    !completedReadonly &&
    work.lifecycle.phase === 'INTAKE' &&
    work.lifecycle.seal === null &&
    work.lifecycle.assurance.review_generation === 0 &&
    work.lifecycle.assurance.delivery_cycle_id === null &&
    work.execution.assignment_attempts.length === 0 &&
    journal.resume_status === 'ready' &&
    journal.state.step_id !== null &&
    journal.state.completed.length === 0 &&
    journal.state.items.length > 0 &&
    journal.state.source_scope?.digest === work.binding.work_source_revision &&
    work.lifecycle.source_revision === work.binding.work_source_revision &&
    issues.every(
      (item) =>
        item.issue_id === null &&
        item.observation === null &&
        !item.host_reservation &&
        !item.research_activation &&
        !item.research_normalization &&
        item.request.run_id === work.execution.run_id &&
        item.request.workflow_id === work.binding.workflow_id &&
        item.request.config_digest === work.binding.config_digest &&
        item.request.scope_digest === work.binding.work_source_revision,
    ) &&
    ticket?.source_revision === work.binding.work_source_revision &&
    ticket.repository_id === identity.repository_id &&
    sameCoordinationStrings(ticket.project_ids, identity.project_ids) &&
    ticket.integrations_digest === identity.integrations_digest &&
    ticket.expires_at !== null &&
    Date.parse(ticket.expires_at) <= Date.now() &&
    claims.length === 1 &&
    claims[0]!.thread_id === nativeSessionHandle &&
    claims[0]!.work_id === identity.work_id &&
    claims[0]!.lease_expires_at === ticket.expires_at &&
    Date.parse(claims[0]!.lease_expires_at) <= Date.now() &&
    !host.ledger.claims.some(
      (other) =>
        other.ticket_id !== lease.ticket_id &&
        other.status === 'active' &&
        other.resources.some((resource) => expectedResources.includes(resource)),
    );
  requireSuspension(
    work.execution.status === 'active' &&
      work.lifecycle.phase !== 'COMPLETE' &&
      expectedResources.length > 0 &&
      lease.thread_id === nativeSessionHandle &&
      ticket?.status === 'active' &&
      ticket.thread_id === nativeSessionHandle &&
      ticket.work_id === identity.work_id &&
      ticket.generation === lease.generation &&
      (!terminalOwner ||
        (ticket.repository_id === identity.repository_id &&
          sameCoordinationStrings(ticket.project_ids, identity.project_ids) &&
          ticket.integrations_digest === identity.integrations_digest &&
          ticket.source_revision === work.binding.work_source_revision)) &&
      ticket.expires_at !== null &&
      (completedReadonly ||
        readonlyBookkeeping ||
        settledResearch ||
        settledWriter ||
        expiredUnissued ||
        unknownReadonly ||
        terminalOwner !== undefined ||
        Date.parse(ticket.expires_at) > Date.now()) &&
      claims.length === 1 &&
      claims[0]!.thread_id === nativeSessionHandle &&
      claims[0]!.work_id === identity.work_id &&
      claims[0]!.generation === lease.generation &&
      (!terminalOwner ||
        (lease.ticket_id === terminalOwner.ownerTicketId &&
          claims[0]!.claim_id === terminalOwner.ownerClaimId &&
          lease.generation === terminalOwner.ownerGeneration)) &&
      (completedReadonly ||
        readonlyBookkeeping ||
        settledResearch ||
        expiredUnissued ||
        unknownReadonly ||
        settledWriter ||
        terminalOwner !== undefined ||
        Date.parse(claims[0]!.lease_expires_at) > Date.now()) &&
      claims[0]!.lease_expires_at === ticket.expires_at &&
      sameCoordinationStrings([...claims[0]!.resources].sort(), expectedResources) &&
      sameCoordinationStrings([...ticket.exclusive_resources].sort(), expectedResources) &&
      sameCoordinationStrings([...ticket.active_resources].sort(), expectedResources) &&
      !host.ledger.tickets.some(
        (other) =>
          other.ticket_id !== ticket.ticket_id &&
          !(
            terminalSynthesisCapture &&
            other.status === 'queued' &&
            other.work_id === identity.work_id &&
            other.thread_id === nativeSessionHandle &&
            other.generation === lease.generation &&
            other.repository_id === identity.repository_id &&
            sameCoordinationStrings(other.project_ids, identity.project_ids) &&
            other.integrations_digest === identity.integrations_digest &&
            other.source_revision === work.binding.work_source_revision
          ) &&
          (completedReadonly ||
            readonlyBookkeeping ||
            settledResearch ||
            settledWriter ||
            other.sequence < ticket.sequence) &&
          ['queued', 'active', 'ready_for_handoff', 'blocked'].includes(other.status) &&
          other.exclusive_resources.some((resource) => expectedResources.includes(resource)),
      ),
    'exact active same-thread lease is missing, expired or incomplete',
  );
  const now = new Date().toISOString();
  requireSuspension(
    !terminalOwner || !host.ledger.operations.some((operation) => operation.operation_id === operationId),
    'terminal owner release operation already exists while its ticket is active',
  );
  const ownedQueued = host.ledger.tickets.filter(
    (item) =>
      item.status === 'queued' &&
      item.work_id === identity.work_id &&
      item.thread_id === nativeSessionHandle &&
      item.generation === lease.generation &&
      item.repository_id === identity.repository_id &&
      sameCoordinationStrings(item.project_ids, identity.project_ids) &&
      item.integrations_digest === identity.integrations_digest &&
      item.source_revision === work.binding.work_source_revision,
  );
  requireSuspension(
    ownedQueued.every((item) => item.active_resources.length === 0 && item.claim_ids.length === 0),
    'queued owner has ambiguous active effects',
  );
  requireSuspension(
    !terminalOwner || ownedQueued.length === 0,
    'terminal owner has queued rights outside the exact released ticket',
  );
  const releasedIds = new Set([
    ticket.ticket_id,
    ...(terminalSynthesisCapture || terminalOwner ? [] : ownedQueued.map((item) => item.ticket_id)),
  ]);
  const nextWork = {
    ...work,
    revision: work.revision + 1,
    lease: null,
    execution: {
      ...work.execution,
      ...(completedReadonly || settledWriter || terminalOwner ? {} : { phase: 'awaiting_followup' }),
      status: 'suspended' as const,
    },
    lifecycle: {
      ...work.lifecycle,
      revision: work.revision + 1,
      next_action: terminalSynthesisCapture
        ? 'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.'
        : terminalOwner
          ? 'Only the original owner rights were released; the journal and lifecycle phase remain unchanged and continuation needs normal admission.'
          : readonlyBookkeeping
            ? 'Readonly observations, canonical artifact GAPs and pending UNKNOWN remain frozen; continuation needs normal admission.'
            : unissuedPrepared || settledResearch
              ? 'The original unissued frontier remains inert; continuation needs normal admission.'
              : requestIntent === 'linked_correction'
                ? 'Attributable correction may acquire a fresh fence; Runtime acceptance remains pending.'
                : 'Prior work awaits user testing; new work must be admitted separately.',
    },
  };
  const nextLedger = {
    ...host.ledger,
    revision: host.ledger.revision + 1,
    tickets: host.ledger.tickets.map((item) =>
      releasedIds.has(item.ticket_id)
        ? { ...item, status: 'released' as const, active_resources: [], blocked_resources: [], expires_at: null }
        : item,
    ),
    claims: host.ledger.claims.map((item) =>
      item.ticket_id === ticket.ticket_id && item.status === 'active'
        ? { ...item, status: 'released' as const, renewed_at: now }
        : item,
    ),
    operations: [
      ...host.ledger.operations,
      {
        schema: 'CoordinationOperation/v1' as const,
        operation_id: operationId,
        kind: 'release' as const,
        ticket_id: ticket.ticket_id,
        work_id: ticket.work_id,
        thread_id: ticket.thread_id,
        source_revision: ticket.source_revision,
        resources: expectedResources,
        from_ledger_revision: host.ledger.revision,
        to_ledger_revision: host.ledger.revision + 1,
        decided_by: nativeSessionHandle,
        decision_pointer: userRequestPointer,
        created_at: now,
      },
      ...(terminalSynthesisCapture
        ? []
        : terminalOwner
          ? []
          : ownedQueued.map((item) => ({
              schema: 'CoordinationOperation/v1' as const,
              operation_id: operationId + '-' + item.ticket_id,
              kind: 'release' as const,
              ticket_id: item.ticket_id,
              work_id: item.work_id,
              thread_id: item.thread_id,
              source_revision: item.source_revision,
              resources: item.exclusive_resources,
              from_ledger_revision: host.ledger!.revision,
              to_ledger_revision: host.ledger!.revision + 1,
              decided_by: nativeSessionHandle,
              decision_pointer: userRequestPointer,
              created_at: now,
            }))),
    ],
  };
  if (inspectOnly) return host;
  const stateChange = {
    expectedWork,
    expectedLedger,
    expectedMaintenanceGeneration: input.expectedMaintenanceGeneration ?? host.maintenanceGeneration,
    documentationContext,
    expectedSessionJournal: { attempt: journal.state.attempt, version: journal.version },
    nextWork,
    nextLedger,
  };
  if (terminalSynthesisCapture) {
    const result = store.captureHistoricalTerminalSynthesisAndRelease({
      schema: 'HistoricalTerminalSynthesisCapture/v1',
      identity,
      attempt: journal.state.attempt,
      actionId: terminalSynthesisCapture.actionId,
      issueId: terminalSynthesisCapture.issueId,
      nativeSessionHandle,
      userRequestPointer,
      requestIntent,
      expectedWork,
      expectedLedger,
      expectedJournal: journal.version,
      expectedMaintenanceGeneration: input.expectedMaintenanceGeneration ?? host.maintenanceGeneration,
      documentationContext,
      nextWork,
      nextLedger,
      bodyBytes: terminalSynthesisCapture.bodyBytes,
      provenance: terminalSynthesisCapture.provenance,
    });
    return result.snapshot;
  }
  return store.compareAndSwapHostState(stateChange);
}
