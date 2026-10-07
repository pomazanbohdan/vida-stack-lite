import type {
  HistoricalTerminalSynthesisProvenance,
  HostStateSnapshot,
  HostStateStore,
  StateVersion,
  WorkIdentity,
} from '../host-state.js';
import { completedSourceJournalObservationMatches } from '../host-state.js';
import type { DocumentationVerificationContext } from '../lifecycle/lifecycle-state.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { MastraSessionLedgerSnapshot } from './persistent-session-handoff.js';
import { type AgentRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { configuredReadonlyAssignment, settledSessionItems } from './final-assurance.js';
import { parseObservedValidatorVerdict } from './observed-validation.js';
import {
  readHistoricalObservedResearchLineage,
  readHistoricalObservedActivationUse,
  validateObservedResearchRecordPlan,
  validateObservedActivationUseWritePlan,
  validateActivationUse,
} from '../research-decision.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  type ScopedSourceSnapshot,
} from './scoped-source-snapshot.js';

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
          (!input.config || configuredReadonlyAssignment(input.config, item.request)),
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
  readonly preimage?: ScopedSourceSnapshot;
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
        (exactTerminalTarget || input.config.agents.egress_policies[profile.egress_policy]!.allowed_hosts.length === 0) &&
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
          canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(input.identity.project_ids) &&
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
          snapshotDeclaredSources(
            requireSafeRepositoryAccess(input.documentationContext.repository_root),
            state.source_scope.entries.map((entry) => entry.path),
          ),
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
        stage = target && input.config.workflows[target.request.workflow_id]?.stages.find(
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
          items.filter((item) => item !== target).every(
            (item) => item.issue_id !== null && item.observation?.status === 'reported_complete',
          ) &&
          work.execution.assignment_attempts.length === 0,
        'historical synthesis candidate is not one known-terminal unaccepted readonly action',
      );
      requireReadonlyBookkeeping(input, host, capture);
    }
    else
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
      journal.state.run_id === work.execution.run_id,
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
    (readonlyBookkeeping || unknownReadonly || pending.length === 0) &&
      !work.execution.assignment_attempts.some(
        (attempt) => attempt.status === 'started' || attempt.status === 'uncertain',
      ),
    'native action or host assignment is still active or uncertain',
  );
  const operationId = `${terminalSynthesisCapture ? 'historical-terminal-synthesis-capture' : readonlyBookkeeping ? 'readonly-bookkeeping-release' : settledResearch ? 'settled-research-release' : unissuedPrepared ? 'unissued-owner-release' : settledWriter ? 'settled-writer-release' : completedReadonly ? 'completed-readonly-release' : 'session-release'}-${canonicalJsonDigest(
    {
      work_id: identity.work_id,
      nativeSessionHandle,
      userRequestPointer,
      requestIntent,
      journal: journal.version.digest,
    },
  ).slice(0, 40)}`;
  if (work.lease === null) {
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
    canonicalJsonDigest(ticket.project_ids) === canonicalJsonDigest(identity.project_ids) &&
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
      ticket.expires_at !== null &&
      (completedReadonly ||
        readonlyBookkeeping ||
        settledResearch ||
        settledWriter ||
        expiredUnissued ||
        unknownReadonly ||
        Date.parse(ticket.expires_at) > Date.now()) &&
      claims.length === 1 &&
      claims[0]!.thread_id === nativeSessionHandle &&
      claims[0]!.work_id === identity.work_id &&
      claims[0]!.generation === lease.generation &&
      (completedReadonly ||
        readonlyBookkeeping ||
        settledResearch ||
        expiredUnissued ||
        unknownReadonly ||
        settledWriter ||
        Date.parse(claims[0]!.lease_expires_at) > Date.now()) &&
      claims[0]!.lease_expires_at === ticket.expires_at &&
      canonicalJsonDigest([...claims[0]!.resources].sort()) === canonicalJsonDigest(expectedResources) &&
      canonicalJsonDigest([...ticket.exclusive_resources].sort()) === canonicalJsonDigest(expectedResources) &&
      canonicalJsonDigest([...ticket.active_resources].sort()) === canonicalJsonDigest(expectedResources) &&
      !host.ledger.tickets.some(
        (other) =>
          other.ticket_id !== ticket.ticket_id &&
          !(terminalSynthesisCapture &&
            other.status === 'queued' &&
            other.work_id === identity.work_id &&
            other.thread_id === nativeSessionHandle &&
            other.generation === lease.generation &&
            other.repository_id === identity.repository_id &&
            canonicalJsonDigest(other.project_ids) === canonicalJsonDigest(identity.project_ids) &&
            other.integrations_digest === identity.integrations_digest &&
            other.source_revision === work.binding.work_source_revision) &&
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
  const ownedQueued = host.ledger.tickets.filter(
    (item) =>
      item.status === 'queued' &&
      item.work_id === identity.work_id &&
      item.thread_id === nativeSessionHandle &&
      item.generation === lease.generation &&
      item.repository_id === identity.repository_id &&
      canonicalJsonDigest(item.project_ids) === canonicalJsonDigest(identity.project_ids) &&
      item.integrations_digest === identity.integrations_digest &&
      item.source_revision === work.binding.work_source_revision,
  );
  requireSuspension(
    ownedQueued.every((item) => item.active_resources.length === 0 && item.claim_ids.length === 0),
    'queued owner has ambiguous active effects',
  );
  const releasedIds = new Set([
    ticket.ticket_id,
    ...(terminalSynthesisCapture ? [] : ownedQueued.map((item) => item.ticket_id)),
  ]);
  const nextWork = {
    ...work,
    revision: work.revision + 1,
    lease: null,
    execution: {
      ...work.execution,
      ...(completedReadonly || settledWriter ? {} : { phase: 'awaiting_followup' }),
      status: 'suspended' as const,
    },
    lifecycle: {
      ...work.lifecycle,
      revision: work.revision + 1,
      next_action: terminalSynthesisCapture
        ? 'The synthesis body is known terminal but unaccepted; the task remains unfinished and continuation needs normal admission.'
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
          })),
      ),
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
