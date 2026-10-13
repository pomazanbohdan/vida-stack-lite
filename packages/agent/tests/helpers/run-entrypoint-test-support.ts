import type { SpawnSyncReturns } from 'node:child_process';
import type { StateVersion } from '../../src/host-state.ts';
import { isPlainRecord } from '../../src/contracts/public-ingress.ts';
import type { ConfiguredContext, ConfiguredContextEntry } from '../../src/orchestration/configured-context.ts';
import { correctiveExecutionSchema } from '../../src/orchestration/corrective-execution-contract.ts';
import {
  parseSessionBridgeRequest,
  type SessionBridgeRequest,
} from '../../src/orchestration/mastra-session-bridge-contract.ts';
import type { SessionAgentAction, SessionAgentOutcome } from '../../src/orchestration/session-handoff.ts';

export type TerminalUtf8SpawnResult = SpawnSyncReturns<string> & {
  readonly status: number;
  readonly signal: null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: undefined;
};

export function isTerminalUtf8SpawnResult(value: unknown): value is TerminalUtf8SpawnResult {
  return (
    isPlainRecord(value) &&
    typeof value.pid === 'number' &&
    Array.isArray(value.output) &&
    typeof value.status === 'number' &&
    value.signal === null &&
    value.error === undefined &&
    typeof value.stdout === 'string' &&
    typeof value.stderr === 'string'
  );
}

export interface TestRunAction {
  readonly request: SessionBridgeRequest;
  readonly action: SessionAgentAction;
  readonly issue_id?: string | null;
  readonly host_attempt_id?: string | undefined;
  readonly instruction_activation?: unknown;
  readonly instruction_bindings?: unknown;
  readonly research_instruction_activation?: unknown;
  readonly research_instruction_bindings?: unknown;
  readonly configured_context?: ConfiguredContext | null;
  readonly development_packet?: unknown;
  readonly research_output_contract?: unknown;
  readonly synthesis_output_contract?: unknown;
  readonly synthesis_source_catalog?: unknown;
  readonly historical_review_input?: {
    readonly body_base64: string;
    readonly body_sha256: string;
    readonly body_byte_length: number;
    readonly body_ref: string;
    readonly original_request_pointer: string;
  };
  readonly prior_issue_outcome?: 'unknown';
  readonly logical_action_id?: string;
}

export interface TestRunPayload {
  readonly schema: 'VidaAgentRunResult/v1';
  readonly status: string;
  readonly code?: string;
  readonly message?: string;
  readonly runtime_selector_observed?: boolean;
  readonly rights_granted?: boolean;
  readonly runtime_acceptance?: boolean;
  readonly runtime_accepted?: boolean;
  readonly accepted_result?: boolean;
  readonly next_operation?: string | null;
  readonly resume_status?: string;
  readonly research_preparation_status?: string | null;
  readonly code_digest?: string;
  readonly digest?: string;
  readonly revision?: number;
  readonly state_version?: StateVersion;
  readonly work_version?: StateVersion;
  readonly ledger_version?: StateVersion;
  readonly next_actions?: readonly TestRunAction[];
  readonly issued_actions?: readonly TestRunAction[];
  readonly action_statuses?: readonly { readonly action_id: string; readonly status: string }[];
  readonly continuation_review?: TestContinuationReview;
  readonly recorded_observation?: unknown;
  readonly reported_observation?: unknown;
  readonly request?: unknown;
}

interface TestHistoricalReviewInput {
  readonly body_base64: string;
  readonly body_sha256: string;
  readonly body_byte_length: number;
  readonly body_ref: string;
  readonly original_request_pointer: string;
}

interface TestContinuationReview {
  readonly action_id: string;
  readonly status: string;
  readonly prior_issue_outcome?: 'unknown';
  readonly accepted_result: false;
  readonly runtime_accepted: false;
}

export function requireStateVersion(value: StateVersion | undefined): StateVersion {
  if (!value) throw Error('run result state version is missing');
  return value;
}

export function requireNextActions(payload: TestRunPayload): readonly TestRunAction[] {
  if (!payload.next_actions) throw Error('run result next actions are missing');
  return payload.next_actions;
}

export function requireIssuedActions(payload: TestRunPayload): readonly TestRunAction[] {
  if (!payload.issued_actions) throw Error('run result issued actions are missing');
  return payload.issued_actions;
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}

function isConfiguredContextEntry(value: unknown): value is ConfiguredContextEntry {
  return (
    isPlainRecord(value) &&
    typeof value.id === 'string' &&
    (value.kind === 'official' || value.kind === 'local' || value.kind === 'skill') &&
    typeof value.location === 'string' &&
    typeof value.title === 'string' &&
    (value.status === 'unfetched_reference' || value.status === 'local_excerpt') &&
    (value.sha256 === null || typeof value.sha256 === 'string') &&
    (value.bytes === null || typeof value.bytes === 'number') &&
    (value.content === null || typeof value.content === 'string') &&
    typeof value.truncated === 'boolean'
  );
}

function isConfiguredContext(value: unknown): value is ConfiguredContext {
  return (
    isPlainRecord(value) &&
    value.schema === 'ConfiguredContext/v1' &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    Array.isArray(value.entries) &&
    value.entries.every(isConfiguredContextEntry) &&
    typeof value.digest === 'string'
  );
}

function isHistoricalReviewInput(value: unknown): value is TestHistoricalReviewInput {
  return (
    isPlainRecord(value) &&
    typeof value.body_base64 === 'string' &&
    typeof value.body_sha256 === 'string' &&
    typeof value.body_byte_length === 'number' &&
    typeof value.body_ref === 'string' &&
    typeof value.original_request_pointer === 'string'
  );
}

function isContinuationReview(value: unknown): value is TestContinuationReview {
  return (
    isPlainRecord(value) &&
    typeof value.action_id === 'string' &&
    typeof value.status === 'string' &&
    (value.prior_issue_outcome === undefined || value.prior_issue_outcome === 'unknown') &&
    value.accepted_result === false &&
    value.runtime_accepted === false
  );
}

function isSessionAgentOutcome(value: unknown): value is SessionAgentOutcome {
  return (
    isPlainRecord(value) &&
    typeof value.action_id === 'string' &&
    typeof value.handoff_digest === 'string' &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    typeof value.scope_digest === 'string' &&
    typeof value.wave_index === 'number' &&
    typeof value.action_order === 'number' &&
    typeof value.stage_id === 'string' &&
    typeof value.role === 'string' &&
    (value.status === 'reported_complete' || value.status === 'reported_failed') &&
    typeof value.summary === 'string' &&
    isPlainRecord(value.session_result) &&
    typeof value.session_result.issue_id === 'string' &&
    typeof value.session_result.agent_id === 'string' &&
    typeof value.session_result.tool_call_ref === 'string' &&
    typeof value.session_result.output_digest === 'string' &&
    isStringArray(value.evidence_refs)
  );
}

function isSessionAgentAction(value: unknown): value is SessionAgentAction {
  if (!isPlainRecord(value)) return false;
  const profile = value.resolved_profile;
  return (
    typeof value.action_id === 'string' &&
    typeof value.work_id === 'string' &&
    typeof value.attempt === 'number' &&
    typeof value.scope_digest === 'string' &&
    typeof value.wave_index === 'number' &&
    typeof value.action_order === 'number' &&
    typeof value.assignment_index === 'number' &&
    typeof value.stage_id === 'string' &&
    typeof value.stage_kind === 'string' &&
    (value.stage_mode === 'single' || value.stage_mode === 'parallel') &&
    isStringArray(value.required_after) &&
    typeof value.role === 'string' &&
    (value.contour === undefined || typeof value.contour === 'string') &&
    typeof value.model === 'string' &&
    typeof value.reasoning === 'string' &&
    typeof value.mutation_scope === 'string' &&
    isStringArray(value.context_skill_refs) &&
    typeof value.role_description === 'string' &&
    isStringArray(value.role_rules) &&
    isStringArray(value.consumes) &&
    isStringArray(value.produces) &&
    Array.isArray(value.prior_outcomes) &&
    value.prior_outcomes.every(isSessionAgentOutcome) &&
    (value.corrective_execution === undefined ||
      correctiveExecutionSchema.safeParse(value.corrective_execution).success) &&
    isPlainRecord(profile) &&
    profile.schema === 'ResolvedAgentProfile/v1' &&
    typeof profile.config_digest === 'string' &&
    typeof profile.profile_id === 'string' &&
    typeof profile.model === 'string' &&
    typeof profile.reasoning === 'string' &&
    (profile.execution_mode === 'fast' || profile.execution_mode === 'standard') &&
    typeof profile.mutation_scope === 'string' &&
    isPlainRecord(profile.tools_policy) &&
    typeof profile.tools_policy.id === 'string' &&
    typeof profile.tools_policy.source_write === 'boolean' &&
    isStringArray(profile.tools_policy.allowed_tools) &&
    isPlainRecord(profile.egress_policy) &&
    typeof profile.egress_policy.id === 'string' &&
    isStringArray(profile.egress_policy.allowed_hosts) &&
    profile.enforcement_status === 'not_asserted'
  );
}

function parseTestRunAction(value: unknown): TestRunAction {
  const record = requireRecord(value, 'run action');
  const request = parseSessionBridgeRequest(record.request);
  const actionValue = record.action;
  if (!isSessionAgentAction(actionValue)) throw Error('run action body is invalid');
  const issueId = record.issue_id;
  if (issueId !== undefined && issueId !== null && typeof issueId !== 'string')
    throw Error('run action issue identity is invalid');
  const hostAttemptId = record.host_attempt_id;
  if (hostAttemptId !== undefined && typeof hostAttemptId !== 'string')
    throw Error('run action attempt identity is invalid');
  const configuredContext = record.configured_context;
  if (configuredContext !== undefined && configuredContext !== null && !isConfiguredContext(configuredContext))
    throw Error('run action configured context is invalid');
  if (Object.hasOwn(record, 'configured_context') && configuredContext === undefined)
    throw Error('run action configured context is missing');
  const reviewInput = record.historical_review_input;
  if (reviewInput !== undefined && !isHistoricalReviewInput(reviewInput))
    throw Error('run action retained review input is invalid');
  if (record.prior_issue_outcome !== undefined && record.prior_issue_outcome !== 'unknown')
    throw Error('run action prior outcome is invalid');
  if (record.logical_action_id !== undefined && typeof record.logical_action_id !== 'string')
    throw Error('run action logical identity is invalid');
  return {
    request,
    action: actionValue,
    ...(issueId === undefined ? {} : { issue_id: issueId }),
    ...(hostAttemptId === undefined ? {} : { host_attempt_id: hostAttemptId }),
    ...(Object.hasOwn(record, 'instruction_activation')
      ? { instruction_activation: record.instruction_activation }
      : {}),
    ...(Object.hasOwn(record, 'instruction_bindings') ? { instruction_bindings: record.instruction_bindings } : {}),
    ...(Object.hasOwn(record, 'research_instruction_activation')
      ? { research_instruction_activation: record.research_instruction_activation }
      : {}),
    ...(Object.hasOwn(record, 'research_instruction_bindings')
      ? { research_instruction_bindings: record.research_instruction_bindings }
      : {}),
    ...(configuredContext === undefined ? {} : { configured_context: configuredContext }),
    ...(Object.hasOwn(record, 'development_packet') ? { development_packet: record.development_packet } : {}),
    ...(Object.hasOwn(record, 'research_output_contract')
      ? { research_output_contract: record.research_output_contract }
      : {}),
    ...(Object.hasOwn(record, 'synthesis_output_contract')
      ? { synthesis_output_contract: record.synthesis_output_contract }
      : {}),
    ...(Object.hasOwn(record, 'synthesis_source_catalog')
      ? { synthesis_source_catalog: record.synthesis_source_catalog }
      : {}),
    ...(reviewInput === undefined ? {} : { historical_review_input: reviewInput }),
    ...(record.prior_issue_outcome === undefined ? {} : { prior_issue_outcome: 'unknown' }),
    ...(record.logical_action_id === undefined ? {} : { logical_action_id: record.logical_action_id }),
  };
}

export function parseTestRunPayload(value: unknown): TestRunPayload {
  const record = requireRecord(value, 'run result');
  if (record.schema !== 'VidaAgentRunResult/v1' || typeof record.status !== 'string')
    throw Error('run result identity is invalid');
  const parseStateVersion = (candidate: unknown): StateVersion | undefined => {
    if (
      !isPlainRecord(candidate) ||
      typeof candidate.revision !== 'number' ||
      !Number.isSafeInteger(candidate.revision) ||
      candidate.revision < 1 ||
      typeof candidate.digest !== 'string' ||
      !/^[a-f0-9]{64}$/u.test(candidate.digest)
    )
      return undefined;
    return { revision: candidate.revision, digest: candidate.digest };
  };
  const optionalString = (key: string): string | undefined => {
    const candidate = record[key];
    return typeof candidate === 'string' ? candidate : undefined;
  };
  const optionalBoolean = (key: string): boolean | undefined => {
    const candidate = record[key];
    return typeof candidate === 'boolean' ? candidate : undefined;
  };
  const optionalVersion = (key: string): StateVersion | undefined =>
    record[key] === undefined ? undefined : parseStateVersion(record[key]);
  const optionalActions = (key: string): readonly TestRunAction[] | undefined => {
    const candidate = record[key];
    if (candidate === undefined) return undefined;
    if (!Array.isArray(candidate)) throw Error(`run result ${key} is invalid`);
    return candidate.map(parseTestRunAction);
  };
  const rawStatuses = record.action_statuses;
  if (rawStatuses !== undefined && !Array.isArray(rawStatuses)) throw Error('run result action statuses are invalid');
  const actionStatuses = Array.isArray(rawStatuses)
    ? rawStatuses.map((item: unknown) => {
        const status = requireRecord(item, 'action status');
        if (typeof status.action_id !== 'string' || typeof status.status !== 'string')
          throw Error('run result action status fields are invalid');
        return { action_id: status.action_id, status: status.status };
      })
    : undefined;
  const optionalStateVersion = (key: string): StateVersion | undefined => {
    const candidate = optionalVersion(key);
    if (record[key] !== undefined && !candidate) throw Error(`run result ${key} is invalid`);
    return candidate;
  };
  const continuationReview = record.continuation_review;
  if (continuationReview !== undefined && !isContinuationReview(continuationReview))
    throw Error('run result continuation review is invalid');
  const code = optionalString('code');
  const message = optionalString('message');
  const runtimeSelectorObserved = optionalBoolean('runtime_selector_observed');
  const rightsGranted = optionalBoolean('rights_granted');
  const runtimeAcceptance = optionalBoolean('runtime_acceptance');
  const runtimeAccepted = optionalBoolean('runtime_accepted');
  const acceptedResult = optionalBoolean('accepted_result');
  const nextOperation = optionalString('next_operation');
  const resumeStatus = optionalString('resume_status');
  const codeDigest = optionalString('code_digest');
  const digest = optionalString('digest');
  const stateVersion = optionalStateVersion('state_version');
  const workVersion = optionalStateVersion('work_version');
  const ledgerVersion = optionalStateVersion('ledger_version');
  const nextActions = optionalActions('next_actions');
  const issuedActions = optionalActions('issued_actions');
  const revision = typeof record.revision === 'number' ? record.revision : undefined;
  const runResult: TestRunPayload = {
    schema: 'VidaAgentRunResult/v1',
    status: record.status,
    ...(code === undefined ? {} : { code }),
    ...(message === undefined ? {} : { message }),
    ...(runtimeSelectorObserved === undefined ? {} : { runtime_selector_observed: runtimeSelectorObserved }),
    ...(rightsGranted === undefined ? {} : { rights_granted: rightsGranted }),
    ...(runtimeAcceptance === undefined ? {} : { runtime_acceptance: runtimeAcceptance }),
    ...(runtimeAccepted === undefined ? {} : { runtime_accepted: runtimeAccepted }),
    ...(acceptedResult === undefined ? {} : { accepted_result: acceptedResult }),
    ...(nextOperation === undefined ? {} : { next_operation: nextOperation }),
    ...(resumeStatus === undefined ? {} : { resume_status: resumeStatus }),
    ...(record.research_preparation_status === null || typeof record.research_preparation_status === 'string'
      ? { research_preparation_status: record.research_preparation_status }
      : {}),
    ...(codeDigest === undefined ? {} : { code_digest: codeDigest }),
    ...(digest === undefined ? {} : { digest }),
    ...(revision === undefined ? {} : { revision }),
    ...(stateVersion === undefined ? {} : { state_version: stateVersion }),
    ...(workVersion === undefined ? {} : { work_version: workVersion }),
    ...(ledgerVersion === undefined ? {} : { ledger_version: ledgerVersion }),
    ...(nextActions === undefined ? {} : { next_actions: nextActions }),
    ...(issuedActions === undefined ? {} : { issued_actions: issuedActions }),
    ...(actionStatuses === undefined ? {} : { action_statuses: actionStatuses }),
    ...(continuationReview === undefined ? {} : { continuation_review: continuationReview }),
    ...(Object.hasOwn(record, 'recorded_observation') ? { recorded_observation: record.recorded_observation } : {}),
    ...(Object.hasOwn(record, 'reported_observation') ? { reported_observation: record.reported_observation } : {}),
    ...(Object.hasOwn(record, 'request') ? { request: record.request } : {}),
  };
  return runResult;
}

export function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw Error(`${label} must be an object`);
  return value;
}

export function parseJsonUnknown(text: string): unknown {
  const value: unknown = JSON.parse(text);
  return value;
}
