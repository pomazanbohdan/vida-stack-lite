import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import type { HostStateSnapshot, StateVersion, WorkIdentity, WorkState } from '../src/host-state.ts';
import type { ObservedResearchRecordPlan } from '../src/research-decision.ts';

const OPERATION = 'historical-normalization-resume';

type HistoricalOwnerContext = ReturnType<typeof import('./runtime-config-rebind.ts').inspectHistoricalOwnerContext>;
type ResumeMode = 'inspect' | 'apply' | 'resume';
type ResumeBaseRequest = {
  readonly schema: 'HistoricalNormalizationResumeRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly action_id: string;
};
type ResumeArgs = {
  readonly mode: ResumeMode;
  readonly projectRoot: string;
  readonly nativeSessionHandle: string;
  readonly baselineConfig: string;
  readonly request: string;
};
type ResumeInspection = Record<string, unknown>;

/** @param {Uint8Array} bytes */
function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** @param {string} message */
function fail(message: string): never {
  throw new Error(`${OPERATION}: ${message}`);
}

/** @param {unknown} value @param {readonly string[]} expected @param {string} label */
function exactKeys(
  value: unknown,
  expected: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== 'object' ||
    Object.keys(value).sort().join('|') !== [...expected].sort().join('|')
  )
    fail(`${label} shape invalid`);
}

/** @param {unknown} value @param {string} label */
function requireRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== 'object') fail(`${label} must be an object`);
}

/** @param {unknown} value */
function repositoryRelative(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 2048 &&
    !value.includes('\\') &&
    !/^(?:\/|[A-Za-z]:)/.test(value) &&
    !/\p{Cc}/u.test(value) &&
    value.split('/').every((part) => part && part !== '.' && part !== '..')
  );
}

/** @param {unknown} value */
function isInspectionRecord(value: unknown): value is ResumeInspection {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {Record<string, unknown>} value */
function withoutFileBindings(value: ResumeInspection): ResumeInspection {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !['record_binding', 'changelog_binding'].includes(key)),
  );
}

/** @param {ResumeInspection} inspection @param {ObservedResearchRecordPlan} plan */
function hasAllowedFileBindingPair(inspection: ResumeInspection, plan: ObservedResearchRecordPlan): boolean {
  const allowedPairs = [
    [plan.record_pre_sha256, plan.changelog_pre_sha256],
    [plan.record_sha256, plan.changelog_pre_sha256],
    [plan.record_sha256, plan.changelog_sha256],
  ];
  return allowedPairs.some(
    ([record, changelog]) => inspection.record_binding === record && inspection.changelog_binding === changelog,
  );
}

/** @param {unknown} supplied @param {unknown} current @param {ObservedResearchRecordPlan} plan @param {(value: unknown) => string} canonicalJsonDigest */
function validateResumeInspection(
  supplied: unknown,
  current: unknown,
  plan: ObservedResearchRecordPlan,
  canonicalJsonDigest: (value: unknown) => string,
): void {
  if (!isInspectionRecord(supplied) || !isInspectionRecord(current)) fail('resume inspection is not an object');
  const suppliedStable = canonicalJsonDigest(withoutFileBindings(supplied));
  const currentStable = canonicalJsonDigest(withoutFileBindings(current));
  if (
    suppliedStable !== currentStable ||
    !hasAllowedFileBindingPair(supplied, plan) ||
    !hasAllowedFileBindingPair(current, plan)
  )
    fail('resume is not the exact original request or reserved per-file transition');
}

/** @param {ResumeMode} mode @param {unknown} supplied @param {unknown} current @param {ObservedResearchRecordPlan} plan @param {(value: unknown) => string} canonicalJsonDigest */
function validateInspection(
  mode: ResumeMode,
  supplied: unknown,
  current: unknown,
  plan: ObservedResearchRecordPlan,
  canonicalJsonDigest: (value: unknown) => string,
): void {
  if (mode === 'apply') {
    if (canonicalJsonDigest(supplied) !== canonicalJsonDigest(current))
      fail('frozen original configuration, evidence, reserved plan or CAS changed after inspection');
    return;
  }
  validateResumeInspection(supplied, current, plan, canonicalJsonDigest);
}

/** @param {string[]} args */
function parseFlagPairs(args: string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!flag?.startsWith('--') || Object.hasOwn(values, flag) || !value) fail('arguments invalid');
    values[flag] = value;
  }
  return values;
}

/** @param {unknown} mode */
function isResumeMode(mode: unknown): mode is ResumeMode {
  return mode === 'inspect' || mode === 'apply' || mode === 'resume';
}

/** @param {string} projectRoot */
function isAbsoluteProjectRoot(projectRoot: string): boolean {
  return path.isAbsolute(projectRoot);
}

/** @param {string} nativeSessionHandle */
function isSafeNativeSessionHandle(nativeSessionHandle: string): boolean {
  return nativeSessionHandle.length <= 256 && !/\p{Cc}/u.test(nativeSessionHandle);
}

/** @param {string} baselineConfig @param {string} request */
function areRepositoryRequests(baselineConfig: string, request: string): boolean {
  return repositoryRelative(baselineConfig) && repositoryRelative(request);
}

/** @param {Record<string, string>} values */
function validateResumeArgs(values: Record<string, string>): ResumeArgs {
  if (
    Object.keys(values).sort().join('|') !==
    ['--mode', '--project-root', '--native-session-handle', '--baseline-config', '--request'].sort().join('|')
  )
    fail('mode or argument set invalid');
  const mode = values['--mode'];
  const projectRoot = values['--project-root'];
  const nativeSessionHandle = values['--native-session-handle'];
  const baselineConfig = values['--baseline-config'];
  const request = values['--request'];
  if (
    !isResumeMode(mode) ||
    typeof projectRoot !== 'string' ||
    !isAbsoluteProjectRoot(projectRoot) ||
    typeof nativeSessionHandle !== 'string' ||
    !isSafeNativeSessionHandle(nativeSessionHandle) ||
    typeof baselineConfig !== 'string' ||
    typeof request !== 'string' ||
    !areRepositoryRequests(baselineConfig, request)
  )
    fail('argument values missing');
  return { mode, projectRoot, nativeSessionHandle, baselineConfig, request };
}

/** @param {string[]} args */
function parseArgs(args: string[]): ResumeArgs {
  if (args.length !== 10 || args.length % 2 !== 0)
    fail('requires exact mode, root, original owner, baseline and request arguments');
  return validateResumeArgs(parseFlagPairs(args));
}

/** @param {HostStateSnapshot} host @param {HistoricalOwnerContext} original @param {(value: unknown) => string} canonicalJsonDigest */
function requireHistoricalHostSnapshot(
  host: HostStateSnapshot,
  original: HistoricalOwnerContext,
  canonicalJsonDigest: (value: unknown) => string,
): {
  readonly work: WorkState;
  readonly ledger: NonNullable<HostStateSnapshot['ledger']>;
  readonly workVersion: StateVersion;
  readonly ledgerVersion: StateVersion;
} {
  if (
    !host.work ||
    !host.ledger ||
    canonicalJsonDigest(host.workVersion) !== canonicalJsonDigest(original.owner.version) ||
    canonicalJsonDigest(host.ledgerVersion) !== canonicalJsonDigest(original.workspace.ledger_version) ||
    host.maintenanceGeneration !== original.maintenanceGeneration
  )
    fail('current Work, Ledger or maintenance CAS differs from original owner inspection');
  const work = host.work;
  const ledger = host.ledger;
  if (!work || !ledger || !host.workVersion || !host.ledgerVersion) fail('current owner snapshot is incomplete');
  return { work, ledger, workVersion: host.workVersion, ledgerVersion: host.ledgerVersion };
}

/** @param {NonNullable<HostStateSnapshot['ledger']>} ledger @param {WorkState['lease']} lease */
function findHistoricalOwnerTicket(
  ledger: NonNullable<HostStateSnapshot['ledger']>,
  lease: WorkState['lease'],
): NonNullable<HostStateSnapshot['ledger']>['tickets'][number] | undefined {
  return ledger.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
}

/** @param {NonNullable<HostStateSnapshot['ledger']>} ledger @param {ResumeBaseRequest} base @param {WorkState['lease']} lease */
function findHistoricalOwnerClaims(
  ledger: NonNullable<HostStateSnapshot['ledger']>,
  base: ResumeBaseRequest,
  lease: WorkState['lease'],
): NonNullable<HostStateSnapshot['ledger']>['claims'] {
  return ledger.claims.filter(
    (entry) =>
      entry.ticket_id === lease?.ticket_id &&
      entry.work_id === base.identity.work_id &&
      entry.thread_id === lease?.thread_id &&
      entry.generation === lease?.generation &&
      entry.status === 'active',
  );
}

/** @param {NonNullable<WorkState['lease']} lease @param {NonNullable<HostStateSnapshot['ledger']>['tickets'][number]} ticket @param {NonNullable<HostStateSnapshot['ledger']>['claims'][number]} claim @param {string} nativeSessionHandle @param {(value: unknown) => string} canonicalJsonDigest */
function isExactHistoricalOwnerLease(
  lease: NonNullable<WorkState['lease']>,
  ticket: NonNullable<HostStateSnapshot['ledger']>['tickets'][number],
  claim: NonNullable<HostStateSnapshot['ledger']>['claims'][number],
  nativeSessionHandle: string,
  canonicalJsonDigest: (value: unknown) => string,
): boolean {
  return (
    lease.thread_id === nativeSessionHandle &&
    ticket.thread_id === lease.thread_id &&
    ticket.generation === lease.generation &&
    claim.lease_expires_at === ticket.expires_at &&
    canonicalJsonDigest(claim.resources) === canonicalJsonDigest(ticket.active_resources) &&
    ticket.claim_ids.includes(claim.claim_id)
  );
}

/** @param {WorkState} work @param {NonNullable<HostStateSnapshot['ledger']>} ledger @param {ResumeBaseRequest} base @param {string} nativeSessionHandle @param {(value: unknown) => string} canonicalJsonDigest */
function requireHistoricalOwnerLease(
  work: WorkState,
  ledger: NonNullable<HostStateSnapshot['ledger']>,
  base: ResumeBaseRequest,
  nativeSessionHandle: string,
  canonicalJsonDigest: (value: unknown) => string,
): NonNullable<WorkState['lease']> {
  const lease = work.lease;
  const ticket = findHistoricalOwnerTicket(ledger, lease);
  const claims = findHistoricalOwnerClaims(ledger, base, lease);
  const claim = claims[0];
  if (
    !lease ||
    work.execution.status !== 'active' ||
    ticket?.status !== 'active' ||
    !ticket.expires_at ||
    claims.length !== 1 ||
    !claim
  )
    fail('original owner claim or retained expiry is not exact');
  if (!isExactHistoricalOwnerLease(lease, ticket, claim, nativeSessionHandle, canonicalJsonDigest))
    fail('original owner claim or retained expiry is not exact');
  return lease;
}

/** @param {unknown} value */
function requireHistoricalIdentity(value: unknown): WorkIdentity {
  exactKeys(value, ['repository_id', 'project_ids', 'integrations_digest', 'work_id'], 'identity');
  if (
    typeof value.repository_id !== 'string' ||
    typeof value.integrations_digest !== 'string' ||
    typeof value.work_id !== 'string' ||
    !Array.isArray(value.project_ids) ||
    !value.project_ids.every((projectId) => typeof projectId === 'string')
  )
    fail('request identity values are invalid');
  return {
    repository_id: value.repository_id,
    project_ids: value.project_ids,
    integrations_digest: value.integrations_digest,
    work_id: value.work_id,
  };
}

/** @param {Record<string, unknown>} rawBase @param {ResumeMode} mode @param {unknown} suppliedInspection */
function requireHistoricalBase(
  rawBase: Record<string, unknown>,
  mode: ResumeMode,
  suppliedInspection: unknown,
): ResumeBaseRequest {
  const actionId = rawBase.action_id;
  const attempt = rawBase.attempt;
  if (
    rawBase.schema !== 'HistoricalNormalizationResumeRequest/v1' ||
    typeof actionId !== 'string' ||
    actionId.length > 256 ||
    /\p{Cc}/u.test(actionId) ||
    typeof attempt !== 'number' ||
    !Number.isSafeInteger(attempt) ||
    attempt < 1 ||
    (mode === 'inspect' ? suppliedInspection !== undefined : !suppliedInspection)
  )
    fail('request schema, action or inspection is invalid');
  return {
    schema: 'HistoricalNormalizationResumeRequest/v1',
    identity: requireHistoricalIdentity(rawBase.identity),
    attempt,
    action_id: actionId,
  };
}

/** @param {Buffer} requestBytes @param {ResumeMode} mode */
function parseHistoricalRequest(
  requestBytes: Buffer,
  mode: ResumeMode,
): { readonly suppliedInspection: unknown; readonly base: ResumeBaseRequest } {
  if (requestBytes.length > 65536) fail('request exceeds bound');
  const request: unknown = JSON.parse(requestBytes.toString('utf8'));
  requireRecord(request, 'request envelope');
  const suppliedInspection = request.inspection;
  const rawBase = Object.fromEntries(Object.entries(request).filter(([key]) => key !== 'inspection'));
  exactKeys(rawBase, ['schema', 'identity', 'attempt', 'action_id'], 'request');
  return { suppliedInspection, base: requireHistoricalBase(rawBase, mode, suppliedInspection) };
}

/** @param {string[]} args */
export async function resumeHistoricalNormalization(args: string[]): Promise<Record<string, unknown>> {
  const values = parseArgs(args);
  const root = realpathSync(values.projectRoot);
  const mode = values.mode;
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { inspectHistoricalOwnerContext } = await import('./runtime-config-rebind.ts');
  const { runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
  const { workflowWorkItemSchema } = await import('../src/orchestration/workflow-session-reservation-contract.ts');
  const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
  const { resumeHistoricalObservedResearchResult, validateObservedResearchRecordPlan } =
    await import('../src/research-decision.ts');
  const access: SafeRepositoryAccess = requireSafeRepositoryAccess(root);
  const requestBytes = access.readBytes(values.request, 'historical normalization request');
  const { suppliedInspection, base } = parseHistoricalRequest(requestBytes, mode);
  const originalConfig = await import('../src/config/runtime-config.ts');
  const currentConfig: AgentRuntimeConfig = originalConfig.loadRuntimeConfig(root);
  const databasePath = sessionHandoffDatabasePath(root, currentConfig);
  const database = openCliWorkspaceDatabase(
    root,
    databasePath,
    deriveWorkspaceId(currentConfig.repository.repository_id, root),
    mode === 'inspect',
  );
  try {
    const workspaceId = deriveWorkspaceId(currentConfig.repository.repository_id, root);
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const inspectCurrent = (original: HistoricalOwnerContext) => {
      const host = store.readHostStateSnapshot(base.identity);
      const { work, ledger, workVersion, ledgerVersion } = requireHistoricalHostSnapshot(
        host,
        original,
        canonicalJsonDigest,
      );
      const lease = requireHistoricalOwnerLease(work, ledger, base, values.nativeSessionHandle, canonicalJsonDigest);
      const intake = readAdmittedSessionIntake(root, store, base.identity);
      if (intake.native_session_handle !== values.nativeSessionHandle) fail('original native owner handle differs');
      const state = original.journal.state;
      if (!state.source_scope || state.work_id !== base.identity.work_id || state.attempt !== base.attempt)
        fail('original Journal scope or attempt differs');
      const items = [...state.completed.flatMap((wave) => wave.items), ...state.items];
      const matches = items.filter((item) => item.request.action_id === base.action_id);
      if (matches.length !== 1) fail('original action is missing or ambiguous');
      const item = matches[0];
      if (!item) fail('original action is missing');
      const observation = item.observation;
      const activation = item.research_activation;
      if (
        !item.issue_id ||
        !observation ||
        observation.status !== 'reported_complete' ||
        !activation ||
        !item.research_normalization ||
        item.request.run_id !== state.run_id ||
        item.request.config_digest !== work.binding.config_digest ||
        item.request.scope_digest !== state.source_scope.digest
      )
        fail('original action lacks its completed observation or reserved normalization');
      const plan = validateObservedResearchRecordPlan(item.research_normalization);
      if (plan.schema !== 'ObservedResearchRecordPlan/v1') fail('only the first reserved research record is supported');
      const binding = plan.binding;
      if (
        binding.work_id !== base.identity.work_id ||
        binding.attempt !== base.attempt ||
        binding.run_id !== state.run_id ||
        binding.action_id !== item.request.action_id ||
        binding.issue_id !== item.issue_id ||
        binding.scope_id !== work.binding.scope_id ||
        binding.scope_digest !== item.request.scope_digest ||
        binding.source_revision !== work.binding.work_source_revision ||
        binding.source_scope_digest !== state.source_scope.digest ||
        binding.config_digest !== item.request.config_digest ||
        binding.maintenance_generation !== original.maintenanceGeneration ||
        binding.lease_ticket_id !== lease.ticket_id ||
        binding.lease_thread_id !== lease.thread_id ||
        binding.lease_generation !== lease.generation
      )
        fail('reserved normalization binding differs from original owner state');
      const scopeBytes = access.readBytes(work.contracts.scope.path, 'historical accepted scope');
      const acceptanceBytes = access.readBytes(work.contracts.acceptance.path, 'historical accepted criteria');
      const result = buildObservedResearchResult({
        config: original.config,
        observation,
        request: item.request,
        issueId: item.issue_id,
        activationUse: activation.use,
        work,
        workItem: workflowWorkItemSchema.parse(intake.work_item),
        scopeBytes,
        acceptanceBytes,
      });
      if (result.digest !== plan.result_digest) fail('reserved result differs from its original observation');
      const acceptedScopeValue: unknown = JSON.parse(scopeBytes.toString('utf8'));
      requireRecord(acceptedScopeValue, 'accepted Source scope');
      const attribution = acceptedScopeValue.attribution;
      requireRecord(attribution, 'accepted Source scope attribution');
      if (typeof attribution.pointer !== 'string') fail('accepted Source operation reference is missing');
      const originalOperationReference = attribution.pointer;
      const recordBytes = access.fileExists(plan.record_path, 'reserved research record')
        ? access.readBytes(plan.record_path, 'reserved research record')
        : null;
      const changelogBytes = access.fileExists(plan.changelog_path, 'research changelog')
        ? access.readBytes(plan.changelog_path, 'research changelog')
        : null;
      return {
        original,
        host,
        item,
        observation,
        activation,
        plan,
        binding,
        result,
        inspection: {
          expectedWork: workVersion,
          expectedLedger: ledgerVersion,
          expectedJournal: original.journal.version,
          expectedMaintenanceGeneration: host.maintenanceGeneration,
          baseline_binding: original.baseline_binding,
          receipt_binding: original.receipt_binding,
          current_config_binding: runtimeConfigDigest(original.current),
          engine_binding: original.engine_binding,
          request_binding: canonicalJsonDigest(base),
          owner_binding: canonicalJsonDigest({
            handle: values.nativeSessionHandle,
            work_id: base.identity.work_id,
            attempt: base.attempt,
            action_id: base.action_id,
          }),
          plan_binding: canonicalJsonDigest(plan),
          observation_binding: canonicalJsonDigest(item.observation),
          activation_binding: canonicalJsonDigest(item.research_activation),
          result_binding: result.digest,
          source_scope_binding: state.source_scope.digest,
          caller_identity_authenticated: false,
          caller_authorization_required: true,
          original_operation_reference: originalOperationReference,
          record_binding: recordBytes === null ? null : sha256(recordBytes),
          changelog_binding: changelogBytes === null ? null : sha256(changelogBytes),
        },
      };
    };
    const firstOriginal = inspectHistoricalOwnerContext(root, values.baselineConfig, base.identity, base.attempt);
    const current = inspectCurrent(firstOriginal);
    if (mode === 'inspect')
      return {
        status: 'historical_normalization_resume_inspected',
        request: { ...base, inspection: current.inspection },
        record_path: current.plan.record_path,
        record_missing: current.inspection.record_binding === null,
        caller_identity_authenticated: false,
        caller_authorization_required: true,
        original_operation_reference: current.inspection.original_operation_reference,
        rights_granted: false,
        runtime_acceptance: false,
      };
    validateInspection(mode, suppliedInspection, current.inspection, current.plan, canonicalJsonDigest);
    if (!access.readBytes(values.request, 'historical request stability').equals(requestBytes))
      fail('frozen request changed before resume');
    const latestOriginal = inspectHistoricalOwnerContext(root, values.baselineConfig, base.identity, base.attempt);
    const latest = inspectCurrent(latestOriginal);
    try {
      validateInspection(mode, suppliedInspection, latest.inspection, latest.plan, canonicalJsonDigest);
    } catch {
      fail('original evidence changed after inspection');
    }
    const result = await resumeHistoricalObservedResearchResult({
      root,
      feature: latestOriginal.config.research_decision,
      result: latest.result,
      observation: latest.observation,
      binding: latest.binding,
      activation_use: latest.activation.use,
      activation_plan: latest.activation.plan,
      plan: latest.plan,
      host_state: store,
      identity: base.identity,
      attempt: base.attempt,
      expectedWork: latest.inspection.expectedWork,
      expectedLedger: latest.inspection.expectedLedger,
      expectedJournal: latest.inspection.expectedJournal,
      expectedMaintenanceGeneration: latest.inspection.expectedMaintenanceGeneration,
    });
    return {
      status: 'historical_normalization_resumed',
      record_path: result.recordPath,
      record_sha256: result.recordSha256,
      changelog_path: result.changelogPath,
      changelog_sha256: result.changelogSha256,
      replay: result.replay,
      caller_identity_authenticated: false,
      caller_authorization_required: true,
      original_operation_reference: latest.inspection.original_operation_reference,
      work_version: latest.inspection.expectedWork,
      ledger_version: latest.inspection.expectedLedger,
      journal_version: latest.inspection.expectedJournal,
      rights_granted: false,
      runtime_acceptance: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
