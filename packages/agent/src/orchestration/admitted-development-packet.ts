import { createHash } from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import scopeSchema from '../../schemas/implementation-scope.v1.schema.json' with { type: 'json' };
import acceptanceSchema from '../../schemas/acceptance-manifest.v1.schema.json' with { type: 'json' };
import {
  assertLoadedRuntimeConfig,
  runtimeConfigDigest,
  selectWorkflow,
  type AgentRuntimeConfig,
  type WorkItemSelection,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { HostStateSnapshot, HostStateStore, WorkIdentity, WorkState } from '../host-state.js';
import { completedSourceJournalObservationMatches } from '../host-state.js';
import { compareScopedSourceSnapshots } from './scoped-source-snapshot.js';

const arrayShape = (value: unknown): boolean => Array.isArray(value);
import type { ConfiguredFrontierRecoveryView } from './failed-prewriter-transition.js';
import {
  validateInitialSourceContinuationReceipt,
  type InitialSourceContinuationReceipt,
} from './initial-source-continuation.js';
import { validateFailedPrewriterRecoveryReceipt } from './failed-prewriter-transition.js';
import {
  validateConfiguredFrontierReceiptStructure,
  type ConfiguredFrontierReceipt,
} from './delivered-work-continuation-repair.js';
import {
  validateResearchResult,
  validateResearchSynthesis,
  validateSynthesisReferencesForResults,
  type ResearchResult,
  type ResearchSynthesis,
} from '../research-decision.js';
import type { LocalWorkAdmissionInput } from './local-work-admission.js';
import type { MastraSessionLedgerSnapshot, MastraSessionLedgerState } from './persistent-session-handoff.js';
import { buildConfiguredContext, type ConfiguredContext } from './configured-context.js';
import { buildDevelopmentTaskPacket, type DevelopmentTaskPacket } from './mastra-boundary.js';
import { snapshotAdmittedTaskSources, snapshotDeclaredSources } from './scoped-source-snapshot.js';
import {
  validateWorkSessionBinding,
  readCorrectivePlanningJournal,
  selectCorrectiveEvidence,
} from './final-assurance.js';
import { parseObservedValidatorVerdict } from './observed-validation.js';
import { parseObservedTesterVerdict } from './observed-testing.js';
import { observedReceiptEvidenceReference } from './observed-receipt-evidence.js';

const Ajv2020Constructor = Ajv2020 as unknown as new (options: { strict: boolean; allErrors: boolean }) => {
  compile(schema: object): (value: unknown) => boolean;
};
const validator = new Ajv2020Constructor({ strict: true, allErrors: true });
const validScope = validator.compile(scopeSchema);
const validAcceptance = validator.compile(acceptanceSchema);
const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

interface Scope {
  readonly scope_id: string;
  readonly work_id: string;
  readonly source_revision: string;
  readonly ac_ids: readonly string[];
  readonly allowed_paths: readonly string[];
  readonly implementation_paths: readonly string[];
  readonly documentation_paths?: readonly string[];
  readonly changed_symbols: readonly string[];
  readonly non_goals: readonly string[];
  readonly test_trace: readonly string[];
  readonly attribution: { readonly thread_id: string };
}

interface Acceptance {
  readonly scope: string;
  readonly source_revision: string;
  readonly ac_ids: readonly string[];
  readonly contracts: readonly {
    readonly id: string;
    readonly definition: string;
    readonly sr: string;
    readonly evidence: readonly string[];
  }[];
}

export interface AdmittedDevelopmentPacketInput {
  readonly repositoryRoot: string;
  readonly config: AgentRuntimeConfig;
  readonly host: HostStateSnapshot;
  readonly sourceStore?: Pick<HostStateStore, 'snapshotCurrentTaskSourceSources'> &
    Partial<
      Pick<
        HostStateStore,
        | 'readDeliveredWorkContinuationReceipt'
        | 'readFailedPrewriterRecoveryReceipt'
        | 'readInitialSourceContinuationReceipt'
      >
    >;
  readonly ledger: MastraSessionLedgerSnapshot;
  readonly workItem: LocalWorkAdmissionInput['workItem'];
  readonly selection: WorkItemSelection;
  readonly scopeBytes: Buffer;
  readonly acceptanceBytes: Buffer;
  readonly configuredContext: ConfiguredContext | null;
}

function requirePacket(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`admitted development packet: ${message}`);
}

export type AcceptedSourceContinuation = ConfiguredFrontierRecoveryView | InitialSourceContinuationReceipt;

function isPacketRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function samePacket(left: unknown, right: unknown): boolean {
  try {
    return canonicalJsonDigest(left) === canonicalJsonDigest(right);
  } catch {
    return false;
  }
}

function initialContinuationBindingCore(binding: WorkState['binding']): Record<string, unknown> {
  const result: Record<string, unknown> = { ...binding };
  delete result.work_source_revision;
  delete result.runtime_source_revision;
  delete result.runtime_code_digest;
  return result;
}

function intakeReference(work: WorkState) {
  const references = work.artifacts.filter(
    (item) => item.artifact_id === 'local-session-intake' && item.schema === 'VidaLocalSessionIntake/v1',
  );
  return references.length === 1 ? references[0] : null;
}

function sourceAuthorizationReferences(work: WorkState) {
  return work.lifecycle.references.filter(
    (reference) =>
      reference.kind === 'execution_approval' &&
      reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      reference.decision === 'approved' &&
      reference.disposition === 'current',
  );
}

export function isInitialSourceContinuationReceipt(value: unknown): value is InitialSourceContinuationReceipt {
  return isPacketRecord(value) && value.schema === 'InitialSourceContinuationReceipt/v1';
}

/** Validate the receipt lineage while retaining the original contract, intake and permission bytes. */
export function validateInitialSourceContinuationLineage(
  work: WorkState,
  value: unknown,
  journalValue?: unknown,
): InitialSourceContinuationReceipt {
  const receipt = validateInitialSourceContinuationReceipt(value);
  const { request, prior_work: original, successor_work: successor } = receipt;
  const permission = request.sourceAuthorizationReference;
  const originalPermission = sourceAuthorizationReferences(original);
  const successorPermission = sourceAuthorizationReferences(successor);
  const currentPermission = sourceAuthorizationReferences(work);
  const originalIntake = intakeReference(original);
  const successorIntake = intakeReference(successor);
  const currentIntake = intakeReference(work);
  const bindingIdentity = (candidate: WorkState) => ({
    repository_id: candidate.binding.repository_id,
    project_ids: candidate.binding.project_ids,
    integrations_digest: candidate.binding.integrations_digest,
    work_id: candidate.binding.lifecycle_work_id,
  });
  const identity = bindingIdentity(work);

  requirePacket(
    original.schema === 'WorkState/v1' &&
      successor.schema === 'WorkState/v1' &&
      request.identity.repository_id === identity.repository_id &&
      samePacket(request.identity.project_ids, identity.project_ids) &&
      request.identity.integrations_digest === identity.integrations_digest &&
      request.identity.work_id === identity.work_id &&
      request.attempt === receipt.prior_journal.attempt &&
      request.attempt === receipt.successor_journal.attempt &&
      samePacket(receipt.prior_work_version, request.expectedWork) &&
      samePacket(receipt.prior_ledger_version, request.expectedLedger) &&
      samePacket(receipt.prior_journal_version, request.expectedJournal) &&
      receipt.prior_journal.step_id === 'wave-0' &&
      receipt.prior_journal.completed.length === 0 &&
      receipt.prior_journal.items.length === 1 &&
      receipt.prior_journal.items[0]!.issue_id === null &&
      receipt.prior_journal.items[0]!.observation === null &&
      receipt.prior_journal.items[0]!.host_reservation === undefined &&
      receipt.prior_journal.items[0]!.research_activation === undefined &&
      receipt.prior_journal.items[0]!.research_normalization === undefined &&
      receipt.prior_journal.items[0]!.request.action_id === request.priorEngineSnapshot.requests[0]!.action_id &&
      receipt.successor_journal.step_id === 'wave-0' &&
      receipt.successor_journal.completed.length === 0 &&
      receipt.successor_journal.items.length === 1 &&
      receipt.successor_journal.items[0]!.issue_id === null &&
      receipt.successor_journal.items[0]!.observation === null &&
      receipt.successor_journal.items[0]!.host_reservation === undefined &&
      samePacket(receipt.successor_journal.items[0]!.request, request.currentInitialRequest) &&
      original.workspace_id === work.workspace_id &&
      successor.workspace_id === work.workspace_id &&
      original.execution.run_id !== null &&
      original.execution.run_id === successor.execution.run_id &&
      original.execution.run_id === work.execution.run_id &&
      original.execution.input_digest === successor.execution.input_digest &&
      original.execution.input_digest === work.execution.input_digest &&
      request.nativeSessionHandle === original.lease?.thread_id &&
      request.nativeSessionHandle === successor.lease?.thread_id &&
      request.nativeSessionHandle === work.lease?.thread_id &&
      samePacket(initialContinuationBindingCore(original.binding), initialContinuationBindingCore(successor.binding)) &&
      samePacket(initialContinuationBindingCore(original.binding), initialContinuationBindingCore(work.binding)) &&
      request.priorRuntimeCodeDigest === original.binding.runtime_code_digest &&
      request.currentRuntimeCodeDigest === successor.binding.runtime_code_digest &&
      request.currentRuntimeCodeDigest === successor.binding.runtime_source_revision &&
      request.currentRuntimeCodeDigest === work.binding.runtime_code_digest &&
      request.currentRuntimeCodeDigest === work.binding.runtime_source_revision &&
      request.currentRuntimeCodeDigest === work.lifecycle.config_binding.runtime_code_digest &&
      request.currentRuntimeCodeDigest === successor.lifecycle.config_binding.runtime_code_digest &&
      original.lifecycle.source_revision === original.binding.work_source_revision &&
      request.currentSourceScope.digest === successor.binding.work_source_revision &&
      request.currentSourceScope.digest === successor.lifecycle.source_revision &&
      request.currentSourceScope.digest === work.binding.work_source_revision &&
      request.currentSourceScope.digest === work.lifecycle.source_revision &&
      request.currentSourceScope.digest !== original.binding.work_source_revision &&
      original.lifecycle.config_binding.config_digest === work.lifecycle.config_binding.config_digest &&
      original.lifecycle.config_binding.schema_digest === work.lifecycle.config_binding.schema_digest &&
      request.currentInitialRequest.workflow_id === work.binding.workflow_id &&
      request.currentInitialRequest.run_id === work.execution.run_id &&
      request.currentInitialRequest.config_digest === work.binding.config_digest &&
      request.currentInitialRequest.scope_digest === work.binding.work_source_revision &&
      request.currentInitialRequest.wave_index === 0 &&
      samePacket(original.contracts, successor.contracts) &&
      samePacket(original.contracts, work.contracts) &&
      samePacket(original.lifecycle.scope, successor.lifecycle.scope) &&
      samePacket(original.lifecycle.scope, work.lifecycle.scope) &&
      samePacket(original.binding.scope_contract_digest, work.binding.scope_contract_digest) &&
      samePacket(original.binding.acceptance_manifest_digest, work.binding.acceptance_manifest_digest) &&
      samePacket(original.binding.ac_ids, work.binding.ac_ids) &&
      samePacket(original.binding.implementation_paths, work.binding.implementation_paths) &&
      originalPermission.length === 1 &&
      successorPermission.length === 1 &&
      currentPermission.length === 1 &&
      samePacket(originalPermission[0], permission) &&
      samePacket(successorPermission[0], permission) &&
      samePacket(currentPermission[0], permission) &&
      permission.scope_id === original.binding.scope_id &&
      permission.source_revision === original.binding.work_source_revision &&
      permission.sha256 === request.sourceAuthorizationSha256 &&
      originalIntake !== null &&
      successorIntake !== null &&
      currentIntake !== null &&
      samePacket(originalIntake, successorIntake) &&
      samePacket(originalIntake, currentIntake),
    'initial continuation does not preserve the original Work, contracts, intake, permission or endpoint',
  );

  if (journalValue !== undefined) {
    requirePacket(isPacketRecord(journalValue), 'current initial continuation Journal is invalid');
    const journal = journalValue as unknown as MastraSessionLedgerState;
    const currentItems = [...journal.completed.flatMap((wave) => wave.items), ...journal.items];
    requirePacket(
      journal.schema === 'MastraSessionLedger/v1' &&
        journal.workspace_id === work.workspace_id &&
        journal.work_id === work.binding.lifecycle_work_id &&
        journal.attempt === request.attempt &&
        journal.run_id === work.execution.run_id &&
        journal.source_scope !== undefined &&
        journal.source_scope !== null &&
        arrayShape(journal.completed) &&
        arrayShape(journal.items) &&
        journal.completed.every((wave) => wave !== null && typeof wave === 'object' && arrayShape(wave.items)),
      'current Journal no longer binds the retained run or Source snapshot',
    );
    const reprojected = currentItems.filter(
      (item) => item.request.action_id === request.currentInitialRequest.action_id,
    );
    requirePacket(
      reprojected.length === 1 &&
        samePacket(reprojected[0]!.request, request.currentInitialRequest) &&
        (reprojected[0]!.issue_id !== null || reprojected[0]!.observation === null),
      'current Journal does not retain the exact reprojected initial request',
    );
    const sourceChanges = compareScopedSourceSnapshots(request.currentSourceScope, journal.source_scope);
    const currentScopePaths = new Set(request.currentSourceScope.entries.map((entry) => entry.path));
    const netChangedPaths = new Set(sourceChanges.map((change) => change.path));
    const reportedPaths = new Set<string>();
    for (const item of currentItems) {
      const reservation = item.host_reservation,
        observation = item.observation;
      if (
        reservation?.approvalAction !== 'source.write' ||
        observation?.status !== 'reported_complete' ||
        !Array.isArray(observation.changed_paths) ||
        !observation.changed_paths.some((path) => netChangedPaths.has(path))
      )
        continue;
      const changedPaths = observation.changed_paths;
      const canonicalPaths = [...new Set(changedPaths)].sort();
      requirePacket(
        completedSourceJournalObservationMatches(work, item) &&
          observation.action_id === item.request.action_id &&
          item.request.run_id === work.execution.run_id &&
          item.request.scope_digest === request.currentSourceScope.digest &&
          item.request.config_digest === work.binding.config_digest &&
          canonicalPaths.length === changedPaths.length &&
          samePacket(changedPaths, canonicalPaths) &&
          canonicalPaths.every((path) => currentScopePaths.has(path)),
        'evolved Journal contains a Source result without its completed Host attempt proof',
      );
      for (const changedPath of canonicalPaths) reportedPaths.add(changedPath);
    }
    requirePacket(
      sourceChanges.every((change) => reportedPaths.has(change.path)),
      'current Journal Source evolution is not covered by completed Host Source reports',
    );
  }
  return receipt;
}

/** Return the original permission revision only when the Host receipt proves its lineage. */
export function acceptedSourceAuthorizationRevision(
  work: WorkState,
  journalValue: unknown,
  reference: InitialSourceContinuationReceipt['request']['sourceAuthorizationReference'],
  continuation?: AcceptedSourceContinuation | null,
): string {
  const current = sourceAuthorizationReferences(work);
  requirePacket(
    current.length === 1 && samePacket(current[0], reference),
    'current scoped Source authorization reference is missing or ambiguous',
  );
  const sourceRevision = isInitialSourceContinuationReceipt(continuation)
    ? validateInitialSourceContinuationLineage(work, continuation, journalValue).prior_work.binding.work_source_revision
    : work.binding.work_source_revision;
  requirePacket(
    reference.scope_id === work.binding.scope_id &&
      reference.source_revision === sourceRevision &&
      /^[a-f0-9]{64}$/.test(reference.sha256),
    'Source authorization reference is outside its accepted source lineage',
  );
  return sourceRevision;
}

/** Resolve immutable accepted contracts against a trusted current Host/journal and continuation view. */
export function acceptedContractSourceRevision(
  work: WorkState,
  ledger: MastraSessionLedgerSnapshot,
  view?: AcceptedSourceContinuation | null,
): string {
  if (!view) return work.binding.work_source_revision;
  if (isInitialSourceContinuationReceipt(view)) {
    const receipt = validateInitialSourceContinuationLineage(work, view, ledger.state);
    return receipt.prior_work.binding.work_source_revision;
  }
  const { original, recovery } = view;
  validateConfiguredFrontierReceiptStructure({ receipt: original });
  if (recovery) validateFailedPrewriterRecoveryReceipt(recovery);
  requirePacket(
    original.attempt === ledger.state.attempt &&
      original.request.identity.work_id === work.binding.lifecycle_work_id &&
      original.prior_work.workspace_id === work.workspace_id &&
      ledger.state.workspace_id === work.workspace_id &&
      ledger.state.work_id === work.binding.lifecycle_work_id &&
      ledger.state.run_id === work.execution.run_id &&
      original.prior_work.execution.run_id === work.execution.run_id &&
      canonicalJsonDigest(recovery?.successor_work.binding ?? original.successor_binding) ===
        canonicalJsonDigest(work.binding) &&
      (!recovery || canonicalJsonDigest(recovery.original) === canonicalJsonDigest(original)) &&
      canonicalJsonDigest(original.prior_work.contracts) === canonicalJsonDigest(work.contracts) &&
      canonicalJsonDigest(ledger.state.completed.slice(0, original.prior_journal.completed.length)) ===
        canonicalJsonDigest(original.prior_journal.completed),
    'continued packet original admission or completed prefix differs',
  );
  return original.prior_work.binding.work_source_revision;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

/** Cited confirmed findings retain their evidence identity without inventing a diagnostic class. */
export function citedResearchConstraints(
  result: Pick<ResearchResult, 'result_id' | 'source_refs' | 'findings'>,
): readonly string[] {
  const sources = new Set(result.source_refs.map((source) => source.source_id));
  return result.findings
    .filter((finding) => finding.status === 'confirmed')
    .map((finding) => {
      requirePacket(
        finding.source_ids.length > 0 && finding.source_ids.every((id) => sources.has(id)),
        'confirmed research finding has no matching cited source',
      );
      return `Research ${result.result_id}/${finding.finding_id} [${finding.source_ids.join(', ')}]: ${finding.statement}`;
    });
}

/** Project only decision-relevant, validated synthesis into the bounded developer packet. */
export function citedSynthesisConstraints(synthesis: ResearchSynthesis): readonly string[] {
  const findings = synthesis.findings
    .filter((finding) => finding.status === 'confirmed')
    .map((finding) => {
      requirePacket(finding.source_refs.length > 0, 'confirmed synthesis finding has no matching cited source');
      return `Synthesis ${synthesis.bundle_id}/${finding.finding_id} [${finding.source_refs.join(', ')}]: ${finding.statement}`;
    });
  const uncertainty = synthesis.uncertainties
    .filter((entry) => entry.material)
    .map((entry) => `Synthesis uncertainty ${entry.uncertainty_id}: ${entry.statement}`);
  const conflicts = synthesis.conflicts
    .filter((entry) => entry.status === 'open' || entry.status === 'accepted_unknown')
    .map((entry) => `Synthesis conflict ${entry.conflict_id} (${entry.status}): ${entry.statement}`);
  const options = synthesis.options.map(
    (entry) => `Synthesis option ${entry.option_id}: ${entry.label} — ${entry.description}`,
  );
  const recommendation = synthesis.recommendation
    ? [`Synthesis recommendation ${synthesis.recommendation.option_id}: ${synthesis.recommendation.rationale}`]
    : [];
  const gaps = synthesis.completeness.material_gaps.map((entry) => `Synthesis completeness gap: ${entry}`);
  const projection = [...new Set([...findings, ...uncertainty, ...conflicts, ...options, ...recommendation, ...gaps])];
  requirePacket(
    projection.length <= 32 &&
      projection.every((entry) => Buffer.byteLength(entry, 'utf8') <= 1024) &&
      projection.reduce((total, entry) => total + Buffer.byteLength(entry, 'utf8'), 0) <= 8192,
    'synthesis consumer projection exceeds its bounded packet budget',
  );
  return projection;
}

/** Project only current corrective validator/tester observations into the next packet. */
export function correctivePacketEvidence(
  journal: Parameters<typeof selectCorrectiveEvidence>[0],
  workflow: AgentRuntimeConfig['workflows'][string],
): {
  readonly diagnostics: readonly { error_class: string; log_ref: string; message: string }[];
  readonly failed_approaches: readonly string[];
  readonly security_constraints: readonly string[];
} {
  const { failed } = selectCorrectiveEvidence(journal, workflow);
  const snapshot = { state: journal } as MastraSessionLedgerSnapshot;
  const diagnostics: { error_class: string; log_ref: string; message: string }[] = [];
  const failedApproaches: string[] = [];
  const securityConstraints: string[] = [];
  for (const item of failed) {
    const observation = item.observation!;
    const stage = workflow.stages.find((stage) => stage.id === item.request.stage_id);
    const kind = stage?.kind;
    const logRef = observedReceiptEvidenceReference(snapshot, item.request.action_id, observation.output_digest);
    if (kind === 'validate' && stage?.produces.includes('ValidationReceipt/v1')) {
      const verdict = parseObservedValidatorVerdict(observation);
      for (const finding of verdict.findings) {
        requirePacket(Buffer.byteLength(finding, 'utf8') <= 1024, 'corrective validator finding exceeds packet budget');
        diagnostics.push({ error_class: 'validator_failure', log_ref: logRef, message: finding });
        if (item.request.role === 'security-data-validator')
          securityConstraints.push(`Prior validator security finding: ${finding}`);
      }
      failedApproaches.push(
        `Failed validator observation ${item.request.action_id}/${observation.output_digest}: ${verdict.findings.join('; ')}`,
      );
    } else if (kind === 'test') {
      parseObservedTesterVerdict(observation);
      diagnostics.push({
        error_class: 'tester_failure',
        log_ref: logRef,
        message: 'Prior tester reported failure; inspect its bound observation evidence.',
      });
      failedApproaches.push(`Failed tester observation ${item.request.action_id}/${observation.output_digest}`);
    }
  }
  requirePacket(
    diagnostics.length <= 32 &&
      diagnostics.reduce((total, entry) => total + Buffer.byteLength(entry.message, 'utf8'), 0) <= 8192 &&
      failedApproaches.length <= 32 &&
      failedApproaches.every((entry) => Buffer.byteLength(entry, 'utf8') <= 4096),
    'corrective evidence exceeds packet budget',
  );
  return { diagnostics, failed_approaches: failedApproaches, security_constraints: securityConstraints };
}

/** Builds a packet only from admitted, current and observed local evidence. */
export function buildAdmittedDevelopmentPacket(input: AdmittedDevelopmentPacketInput): DevelopmentTaskPacket {
  const { repositoryRoot: root, config, host, ledger, workItem, selection, configuredContext } = input;
  assertLoadedRuntimeConfig(config, root);
  const work = host.work;
  requirePacket(
    work?.schema === 'WorkState/v1' && host.ledger !== null && work.lease !== null,
    'current admitted work and lease are required',
  );
  const binding = work.binding;
  const workflowId = selectWorkflow(config, selection).workflow_id;
  requirePacket(
    binding.lifecycle_work_id === workItem.id &&
      binding.provider_work_item_id === workItem.id &&
      binding.work_item_digest === canonicalJsonDigest(workItem) &&
      binding.team_id === selection.team &&
      binding.workflow_id === workflowId &&
      binding.project_ids.includes(selection.project) &&
      workItem.project_id === selection.project &&
      workItem.intent === selection.intent &&
      workItem.canonical_kind === selection.kind &&
      canonicalJsonDigest(workItem.risk_flags) === canonicalJsonDigest(selection.risk_flags) &&
      canonicalJsonDigest(workItem.labels) === canonicalJsonDigest(selection.labels) &&
      binding.config_digest === runtimeConfigDigest(config),
    'work item, workflow or configuration differs from admission',
  );
  const claim = host.ledger.claims.find(
    (entry) =>
      entry.ticket_id === work.lease!.ticket_id &&
      entry.thread_id === work.lease!.thread_id &&
      entry.generation === work.lease!.generation,
  );
  const ticket = host.ledger.tickets.find(
    (entry) =>
      entry.ticket_id === work.lease!.ticket_id &&
      entry.thread_id === work.lease!.thread_id &&
      entry.generation === work.lease!.generation,
  );
  requirePacket(
    claim?.status === 'active' &&
      ticket?.status === 'active' &&
      typeof ticket.expires_at === 'string' &&
      Date.parse(claim.lease_expires_at) > Date.now() &&
      Date.parse(ticket.expires_at) > Date.now(),
    'current active ticket and claim are required',
  );
  const leaseExpiresAt = new Date(
    Math.min(Date.parse(claim.lease_expires_at), Date.parse(ticket.expires_at)),
  ).toISOString();
  const access = requireSafeRepositoryAccess(root);
  requirePacket(
    Buffer.isBuffer(input.scopeBytes) &&
      Buffer.isBuffer(input.acceptanceBytes) &&
      input.scopeBytes.length <= 64 * 1024 &&
      input.acceptanceBytes.length <= 64 * 1024,
    'scope and acceptance bytes must be bounded',
  );
  requirePacket(
    input.scopeBytes.equals(access.readBytes(work.contracts.scope.path, 'packet current scope')) &&
      input.acceptanceBytes.equals(access.readBytes(work.contracts.acceptance.path, 'packet current acceptance')) &&
      sha256(input.scopeBytes) === binding.scope_contract_digest &&
      sha256(input.acceptanceBytes) === binding.acceptance_manifest_digest,
    'scope or acceptance bytes differ from admission',
  );
  const scope = JSON.parse(input.scopeBytes.toString('utf8')) as Scope;
  const acceptance = JSON.parse(input.acceptanceBytes.toString('utf8')) as Acceptance;
  const identity: WorkIdentity = {
    repository_id: binding.repository_id,
    project_ids: binding.project_ids,
    integrations_digest: binding.integrations_digest,
    work_id: binding.lifecycle_work_id,
  };
  const continuation = input.sourceStore?.readDeliveredWorkContinuationReceipt?.(identity, ledger.state.attempt);
  const original =
    continuation?.request.action.kind === 'configured_frontier' ? (continuation as ConfiguredFrontierReceipt) : null;
  const recovery = original && input.sourceStore?.readFailedPrewriterRecoveryReceipt?.(identity, ledger.state.attempt);
  const initial = input.sourceStore?.readInitialSourceContinuationReceipt?.(identity, ledger.state.attempt) ?? null;
  requirePacket(!(original && initial), 'multiple Host Source continuation records are ambiguous');
  const acceptedContinuation = initial ?? (original ? { original, recovery: recovery || null } : null);
  const acceptedSourceRevision = acceptedContractSourceRevision(work, ledger, acceptedContinuation);
  const originalObserved = original?.prior_journal.completed.flatMap((wave) => wave.items) ?? [];
  const currentOrOriginal = (item: (typeof ledger.state.items)[number]): boolean =>
    (item.request.scope_digest === binding.work_source_revision &&
      item.request.config_digest === binding.config_digest) ||
    (original !== null &&
      item.request.scope_digest === original.prior_work.binding.work_source_revision &&
      item.request.config_digest === original.prior_work.binding.config_digest &&
      originalObserved.some((prior) => canonicalJsonDigest(prior) === canonicalJsonDigest(item)));

  requirePacket(
    validScope(scope) &&
      validAcceptance(acceptance) &&
      scope.work_id === workItem.id &&
      scope.scope_id === binding.scope_id &&
      scope.attribution.thread_id === work.lease.thread_id &&
      acceptance.scope === scope.scope_id &&
      canonicalJsonDigest(scope.ac_ids) === canonicalJsonDigest(binding.ac_ids) &&
      canonicalJsonDigest(acceptance.ac_ids) === canonicalJsonDigest(scope.ac_ids) &&
      canonicalJsonDigest(scope.implementation_paths) === canonicalJsonDigest(binding.implementation_paths) &&
      scope.source_revision === acceptedSourceRevision &&
      acceptance.source_revision === acceptedSourceRevision,
    'scope, acceptance or thread binding differs from admitted work',
  );
  const source = input.sourceStore
    ? snapshotAdmittedTaskSources({
        store: input.sourceStore,
        host,
        canonicalHostRoot: root,
        paths: scope.allowed_paths,
        attempt: ledger.state.attempt,
      })
    : snapshotDeclaredSources(access, scope.allowed_paths);
  requirePacket(
    ledger.state.schema === 'MastraSessionLedger/v1' &&
      ledger.version.digest === canonicalJsonDigest(ledger.state) &&
      ledger.state.workspace_id === work.workspace_id &&
      ledger.state.work_id === workItem.id &&
      ledger.state.attempt >= 1,
    'persisted Mastra ledger differs from admitted work',
  );
  requirePacket(
    ledger.state.source_scope?.digest === source.digest &&
      canonicalJsonDigest(ledger.state.source_scope.entries) === canonicalJsonDigest(source.entries),
    'current scoped source differs from final observed snapshot',
  );
  const prerequisiteStages = new Set(
    config.workflows[workflowId]!.stages.filter(
      (stage) => stage.kind === 'research' || stage.kind === 'synthesize',
    ).map((stage) => stage.id),
  );
  validateWorkSessionBinding(work, ledger.state, root);
  const planning = ledger.state.corrective_execution ? readCorrectivePlanningJournal(root, work, ledger) : ledger.state;
  const observed = planning.completed
    .flatMap((wave) => wave.items)
    .filter((item) => prerequisiteStages.has(item.request.stage_id));
  requirePacket(
    observed.every(
      (item) =>
        item.issue_id !== null &&
        item.observation?.issue_id === item.issue_id &&
        item.observation.action_id === item.request.action_id &&
        item.observation.status === 'reported_complete' &&
        item.request.workflow_id === workflowId &&
        currentOrOriginal(item),
    ),
    'prior research or synthesis has an unobserved, failed or mismatched action',
  );
  const researchStageIds = new Set(
    config.workflows[workflowId]!.stages.filter((stage) => stage.produces.includes('ResearchResult/v1')).map(
      (stage) => stage.id,
    ),
  );
  const taskSynthesisStageIds = new Set(
    config.workflows[workflowId]!.stages.filter(
      (stage) => stage.kind === 'synthesize' && stage.produces.includes('DevelopmentTaskPacket/v1'),
    ).map((stage) => stage.id),
  );
  const synthesisStageIds = new Set(
    config.workflows[workflowId]!.stages.filter((stage) => stage.produces.includes('ResearchSynthesis/v1')).map(
      (stage) => stage.id,
    ),
  );
  const researchRefs: string[] = [];
  const researchConstraints: string[] = [];
  const admittedResearchResults: ResearchResult[] = [];
  const taskSynthesisConstraints: string[] = [];
  for (const item of observed.filter((entry) => taskSynthesisStageIds.has(entry.request.stage_id))) {
    const summary = item.observation!.summary;
    requirePacket(
      item.request.workflow_id === workflowId &&
        currentOrOriginal(item) &&
        item.issue_id !== null &&
        item.observation!.issue_id === item.issue_id &&
        item.observation!.action_id === item.request.action_id &&
        item.observation!.status === 'reported_complete' &&
        item.observation!.output_digest === canonicalJsonDigest(summary) &&
        Buffer.byteLength(summary, 'utf8') > 0 &&
        Buffer.byteLength(summary, 'utf8') <= 3000,
      'task synthesis summary is missing, stale, mismatched or over budget',
    );
    const packetSummary = summary.replace(/[\r\n\t]/g, ' ');
    taskSynthesisConstraints.push(
      `Observed task synthesis ${item.request.action_id}/${item.observation!.output_digest}: ${packetSummary}`,
    );
  }
  for (const item of observed.filter((entry) => researchStageIds.has(entry.request.stage_id))) {
    const plan = item.research_normalization;
    requirePacket(
      plan &&
        item.research_activation &&
        plan.binding.action_id === item.request.action_id &&
        plan.binding.issue_id === item.issue_id &&
        plan.observation_digest === canonicalJsonDigest(item.observation) &&
        canonicalJsonDigest(plan.binding) === canonicalJsonDigest(item.research_activation.plan.binding) &&
        item.research_activation.plan.use_digest === item.research_activation.use.digest,
      'research action has no completed canonical normalization reservation',
    );
    const artifact = work.artifacts.find(
      (entry) =>
        entry.sha256 === plan.record_sha256 &&
        entry.path === plan.record_path &&
        entry.stage_id === item.request.stage_id &&
        entry.schema === 'ResearchResult/v1' &&
        entry.path.startsWith(config.research_decision.paths.research_records + '/') &&
        entry.path.endsWith('.research.json'),
    );
    requirePacket(artifact !== undefined, 'research action has no current admitted typed artifact');
    const bytes = access.readBytes(artifact.path, 'packet observed research artifact');
    const record: unknown = JSON.parse(bytes.toString('utf8'));
    const result = validateResearchResult(record);
    requirePacket(
      bytes.length <= 64 * 1024 && sha256(bytes) === artifact.sha256 && result.digest === plan.result_digest,
      'research artifact bytes differ from observed digest',
    );
    // This pair was validated before artifact admission. Later sanctioned writes may
    // advance the live source snapshot, while the admitted research bytes stay fixed.
    requirePacket(
      artifact.artifact_id === result.result_id &&
        canonicalJsonDigest(result) === canonicalJsonDigest(record) &&
        result.work_item_id === workItem.id &&
        result.scope_id === scope.scope_id &&
        result.source_revision === item.request.scope_digest &&
        canonicalJsonDigest(result.ac_ids) === canonicalJsonDigest(scope.ac_ids),
      'research result differs from admitted work',
    );
    researchRefs.push(`artifact://research/${result.result_id}/${artifact.sha256}`);
    researchConstraints.push(...citedResearchConstraints(result));
    admittedResearchResults.push(result);
  }
  requirePacket(
    researchStageIds.size === 0 || researchRefs.length > 0,
    'research workflow needs a completed typed research artifact',
  );
  const synthesisRefs: string[] = [];
  const synthesisConstraints: string[] = [];
  for (const item of observed.filter((entry) => synthesisStageIds.has(entry.request.stage_id))) {
    const plan = item.research_normalization;
    requirePacket(
      plan &&
        plan.schema === 'ObservedSynthesisRecordPlan/v1' &&
        item.research_activation &&
        plan.binding.action_id === item.request.action_id &&
        plan.binding.issue_id === item.issue_id &&
        plan.observation_digest === canonicalJsonDigest(item.observation) &&
        canonicalJsonDigest(plan.binding) === canonicalJsonDigest(item.research_activation.plan.binding) &&
        item.research_activation.plan.use_digest === item.research_activation.use.digest,
      'synthesis action has no completed canonical normalization reservation',
    );
    const artifact = work.artifacts.find(
      (entry) =>
        entry.sha256 === plan.record_sha256 &&
        entry.path === plan.record_path &&
        entry.stage_id === item.request.stage_id &&
        entry.schema === 'ResearchSynthesis/v1' &&
        entry.path.startsWith(config.research_decision.paths.research_records + '/') &&
        entry.path.endsWith('.synthesis.json'),
    );
    requirePacket(artifact !== undefined, 'synthesis action has no current admitted typed artifact');
    const bytes = access.readBytes(artifact.path, 'packet observed synthesis artifact');
    requirePacket(bytes.length <= 64 * 1024 && sha256(bytes) === artifact.sha256, 'synthesis artifact bytes changed');
    const synthesis = validateResearchSynthesis(JSON.parse(bytes.toString('utf8')));
    requirePacket(
      synthesis.bundle_id === artifact.artifact_id &&
        synthesis.digest === plan.result_digest &&
        synthesis.work_item_id === workItem.id &&
        synthesis.scope_id === scope.scope_id &&
        synthesis.source_revision === item.request.scope_digest &&
        canonicalJsonDigest(synthesis.ac_ids) === canonicalJsonDigest(scope.ac_ids),
      'synthesis differs from admitted work',
    );
    requirePacket(
      admittedResearchResults.length > 0,
      'synthesis has no admitted research predecessors in the development packet',
    );
    validateSynthesisReferencesForResults(synthesis, admittedResearchResults);
    synthesisRefs.push(`artifact://research/${synthesis.bundle_id}/${artifact.sha256}`);
    synthesisConstraints.push(...citedSynthesisConstraints(synthesis));
  }
  requirePacket(
    synthesisStageIds.size === 0 || synthesisRefs.length > 0,
    'synthesis workflow needs a completed typed artifact',
  );
  requirePacket(
    taskSynthesisStageIds.size === 0 || taskSynthesisConstraints.length >= taskSynthesisStageIds.size,
    'task synthesis workflow needs one current observed summary per configured stage',
  );
  const correction = ledger.state.corrective_execution
    ? correctivePacketEvidence(planning, config.workflows[workflowId]!)
    : { diagnostics: [], failed_approaches: [], security_constraints: [] };
  if (configuredContext !== null) {
    requirePacket(
      configuredContext.work_id === workItem.id &&
        configuredContext.attempt === ledger.state.attempt &&
        configuredContext.digest ===
          buildConfiguredContext(root, config, {
            work_id: workItem.id,
            attempt: ledger.state.attempt,
            source_ids: configuredContext.entries.filter((entry) => entry.kind !== 'skill').map((entry) => entry.id),
            skill_refs: configuredContext.entries
              .filter((entry) => entry.kind === 'skill')
              .map((entry) => entry.location),
          }).digest,
      'configured context is stale',
    );
  }
  const contracts = acceptance.contracts;
  requirePacket(
    contracts.length === scope.ac_ids.length &&
      canonicalJsonDigest(uniqueSorted(contracts.map((entry) => entry.id))) ===
        canonicalJsonDigest(uniqueSorted(scope.ac_ids)),
    'acceptance contracts do not cover admitted ACs',
  );
  const packetId =
    'packet-' +
    canonicalJsonDigest({
      work: workItem.id,
      attempt: ledger.state.attempt,
      scope: binding.scope_contract_digest,
      acceptance: binding.acceptance_manifest_digest,
      prerequisite_observations: observed.map((item) =>
        canonicalJsonDigest({
          request: item.request,
          issue_id: item.issue_id,
          observation: item.observation,
        }),
      ),
    }).slice(0, 40);
  const codeRefs = source.entries
    .filter((entry) => entry.exists && scope.implementation_paths.includes(entry.path))
    .map((entry) => entry.path);
  const documentationRefs =
    configuredContext?.entries.filter((entry) => entry.kind === 'local').map((entry) => entry.location) ?? [];
  return buildDevelopmentTaskPacket(config, {
    packet_id: packetId,
    work_item_id: workItem.id,
    team_id: selection.team,
    workflow_id: workflowId,
    work_item: {
      kind: selection.kind,
      intent: selection.intent,
      project: selection.project,
      risk_flags: [...selection.risk_flags],
      labels: [...selection.labels],
    },
    attempt: ledger.state.attempt,
    risk_flags: [...selection.risk_flags],
    objective: workItem.description.trim() || workItem.title,
    acceptance: contracts.map((entry) => `${entry.id}: ${entry.definition}`),
    in_scope: [...scope.implementation_paths],
    out_of_scope: [...scope.non_goals],
    owned_paths: [...scope.allowed_paths],
    affected_symbols: [...scope.changed_symbols],
    skill_refs:
      configuredContext?.entries.filter((entry) => entry.kind === 'skill').map((entry) => entry.location) ?? [],
    documentation_refs: uniqueSorted([...documentationRefs, ...(scope.documentation_paths ?? [])]),
    code_evidence_refs: codeRefs,
    research_artifact_refs: [...researchRefs, ...synthesisRefs],
    diagnostics: [...correction.diagnostics],
    failed_approaches: [...correction.failed_approaches],
    prohibited_patterns: [],
    implementation_constraints: [
      `Modify only admitted implementation paths: ${scope.implementation_paths.join(', ')}`,
      ...researchConstraints,
      ...synthesisConstraints,
      ...taskSynthesisConstraints,
    ],
    security_constraints: [...correction.security_constraints],
    expected_tests: [...scope.test_trace],
    delivery_conditions: contracts.map(
      (entry) => `Current evidence required for ${entry.id}: ${entry.evidence.join(', ')}`,
    ),
    source_revision: binding.work_source_revision,
    lease_expires_at: leaseExpiresAt,
  });
}
