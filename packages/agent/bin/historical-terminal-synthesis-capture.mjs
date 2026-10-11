// @ts-check
import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  inspectCliHostWorkspaceDatabase,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import path from 'node:path';

const OPERATION = 'historical-terminal-synthesis-capture';

/** @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity */
/** @typedef {import('../src/host-state.ts').HistoricalTerminalSynthesisProvenance} HistoricalTerminalSynthesisProvenance */
/** @typedef {import('../src/host-state.ts').HistoricalTerminalSynthesisCaptureResult} HistoricalTerminalSynthesisCaptureResult */
/** @typedef {import('../src/host-state.ts').StateVersion} StateVersion */
/** @typedef {import('../src/host-state.ts').WorkState} WorkState */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerSnapshot} MastraSessionLedgerSnapshot */
/** @typedef {import('../src/orchestration/configured-context.ts').ConfiguredContext} ConfiguredContext */
/** @typedef {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} SafeRepositoryAccess */
/** @typedef {{schema: 'HistoricalTerminalSynthesisCaptureRequest/v1', identity: WorkIdentity, attempt: number, action_id: string, issue_id: string, body_ref: string, input_ref: string, report_ref: string, followup_ref: string, userRequestPointer: string, requestIntent: 'next_work' | 'linked_correction'}} HistoricalTerminalSynthesisCliRequestBase */
/** @typedef {{expectedWork: StateVersion, expectedLedger: StateVersion, expectedJournal: StateVersion, expectedMaintenanceGeneration: number, baseline_binding: string, receipt_binding: string, current_config_binding: string, engine_binding: string, request_binding: string, body_binding: string, provenance_binding: string, accepted_scope_binding: string, original_operation_reference: string, nativeSessionHandle: string}} HistoricalTerminalSynthesisInspection */
/** @typedef {{mode: 'inspect' | 'apply' | 'resume', projectRoot: string, nativeSessionHandle: string, baselineConfig: string, request: string, contextHistory?: string}} CliArguments */
/** @typedef {'--mode' | '--project-root' | '--native-session-handle' | '--baseline-config' | '--request' | '--context-history'} CliOption */
/** @typedef {{action_id: string, wave_index: number, stage_id: string, work_id: string, attempt: number, context: ConfiguredContext}} HistoricalOriginalContext */
/** @typedef {Record<string, unknown> & {next_actions: unknown[]}} HistoricalRunResultWithActions */
/** @typedef {import('../src/orchestration/mastra-session-bridge.ts').SessionBridgeObservation} SessionBridgeObservation */
/** @typedef {import('../src/orchestration/local-work-admission.ts').LocalWorkAdmissionInput['workItem']} AdmittedWorkItem */
/** @typedef {Record<string, unknown> & {exit_code: number, stderr: string, input_path: string, command: string[]}} HistoricalReport */
/** @typedef {Record<string, unknown> & {status: string, agent_id: string, tool_call_ref: string}} HistoricalFollowup */
/** @typedef {Record<string, unknown> & {output_digest: string, summary: string}} HistoricalReportBody */
/** @typedef {{body: SessionBridgeObservation, input: HistoricalFollowup, report: HistoricalReport, reportBody: HistoricalReportBody}} HistoricalTerminalEvidence */

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is string} */
function isString(value) {
  return typeof value === 'string';
}

/** @param {unknown} value @returns {value is string[]} */
function isStringArray(value) {
  return Array.isArray(value) && value.every(isString);
}

/** @param {Record<string, unknown>} value @param {readonly string[]} keys @returns {boolean} */
function hasStringFields(value, keys) {
  return keys.every((key) => isString(value[key]));
}

/** @param {string | undefined} value @returns {value is CliOption} */
function isCliOption(value) {
  return (
    value !== undefined &&
    [
      '--mode',
      '--project-root',
      '--native-session-handle',
      '--baseline-config',
      '--request',
      '--context-history',
    ].includes(value)
  );
}

/** @param {readonly string[]} args @returns {Map<CliOption, string>} */
function collectCliOptions(args) {
  if (args.length !== 10 && args.length !== 12)
    fail('requires exact mode, root, owner, baseline, request and optional history');
  /** @type {Map<CliOption, string>} */
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!isCliOption(key) || values.has(key) || !value) fail('arguments invalid');
    values.set(key, value);
  }
  return values;
}

/** @param {Map<CliOption, string>} values @param {CliOption} key @returns {string} */
function requiredCliOption(values, key) {
  const value = values.get(key);
  if (value === undefined) fail('arguments invalid');
  return value;
}

/** @param {string} value @returns {CliArguments['mode']} */
function checkedCliMode(value) {
  if (value !== 'inspect' && value !== 'apply' && value !== 'resume') fail('mode invalid');
  return value;
}

/** @param {unknown} value @returns {value is string | null} */
function isNullableString(value) {
  return value === null || typeof value === 'string';
}

/** @param {unknown} value @returns {value is number | null} */
function isNullableSafeInteger(value) {
  return value === null || (typeof value === 'number' && Number.isSafeInteger(value));
}

/** @param {unknown} value @returns {value is 'official' | 'local' | 'skill'} */
function isConfiguredContextKind(value) {
  return value === 'official' || value === 'local' || value === 'skill';
}

/** @param {unknown} value @returns {value is 'unfetched_reference' | 'local_excerpt'} */
function isConfiguredContextStatus(value) {
  return value === 'unfetched_reference' || value === 'local_excerpt';
}

/** @param {string} message @returns {never} */
function fail(message) {
  throw new Error(`${OPERATION}: ${message}`);
}

/** @param {unknown} value @param {readonly string[]} expected @param {string} label @returns {asserts value is Record<string, unknown>} */
function exactKeys(value, expected, label) {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== 'object' ||
    Object.keys(value).sort().join('|') !== [...expected].sort().join('|')
  )
    fail(`${label} shape invalid`);
}

/** @param {unknown} value @returns {value is string} */
function repositoryRelative(value) {
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

/** @param {unknown} entry @returns {entry is import('../src/orchestration/configured-context.ts').ConfiguredContextEntry} */
function isConfiguredContextEntry(entry) {
  if (!isRecord(entry) || Object.keys(entry).length !== 9) return false;
  return (
    ['id', 'location', 'title'].every((key) => typeof entry[key] === 'string') &&
    typeof entry.truncated === 'boolean' &&
    isConfiguredContextKind(entry.kind) &&
    isConfiguredContextStatus(entry.status) &&
    isNullableString(entry.sha256) &&
    isNullableSafeInteger(entry.bytes) &&
    isNullableString(entry.content)
  );
}

/** @param {unknown} value @returns {value is ConfiguredContext} */
function isConfiguredContext(value) {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join('|') !== ['attempt', 'digest', 'entries', 'schema', 'work_id'].sort().join('|')
  )
    return false;
  return (
    value.schema === 'ConfiguredContext/v1' &&
    typeof value.work_id === 'string' &&
    Number.isSafeInteger(value.attempt) &&
    typeof value.digest === 'string' &&
    Array.isArray(value.entries) &&
    value.entries.every(isConfiguredContextEntry)
  );
}

/** @param {unknown} context @returns {context is ConfiguredContext} */
function isRetainedConfiguredContext(context) {
  if (isRecord(context) && context.schema === 'ConfiguredContext/v1' && !isConfiguredContext(context))
    fail('historical context export contains a malformed configured context');
  return isConfiguredContext(context);
}

/** @param {unknown} value @returns {value is HistoricalRunResultWithActions} */
function isHistoricalRunResultWithActions(value) {
  return isRecord(value) && value.schema === 'VidaAgentRunResult/v1' && Array.isArray(value.next_actions);
}

/** @param {unknown} action @returns {unknown} */
function configuredContextFromAction(action) {
  return isRecord(action) ? action.configured_context : undefined;
}

/** @param {unknown} value @returns {value is AdmittedWorkItem} */
function isAdmittedWorkItem(value) {
  return (
    isRecord(value) &&
    value.schema === 'WorkItem/v1' &&
    ['id', 'canonical_kind', 'intent', 'project_id', 'title', 'description', 'provider', 'provider_type'].every(
      (key) => typeof value[key] === 'string',
    ) &&
    Array.isArray(value.risk_flags) &&
    value.risk_flags.every((flag) => typeof flag === 'string') &&
    Array.isArray(value.labels) &&
    value.labels.every((label) => typeof label === 'string')
  );
}

/** @param {unknown} value @returns {value is HistoricalReport} */
function isHistoricalReport(value) {
  return (
    isRecord(value) &&
    typeof value.exit_code === 'number' &&
    typeof value.stderr === 'string' &&
    typeof value.input_path === 'string' &&
    isStringArray(value.command)
  );
}

/** @param {unknown} value @returns {value is HistoricalFollowup} */
function isHistoricalFollowup(value) {
  return isRecord(value) && hasStringFields(value, ['status', 'agent_id', 'tool_call_ref']);
}

/** @param {unknown} value @returns {value is HistoricalReportBody} */
function isHistoricalReportBody(value) {
  return isRecord(value) && hasStringFields(value, ['output_digest', 'summary']);
}

/** @param {unknown} value @returns {value is SessionBridgeObservation} */
function isTerminalObservation(value) {
  if (!isRecord(value)) return false;
  return (
    value.schema === 'VidaSessionObservation/v1' &&
    value.status === 'reported_complete' &&
    hasStringFields(value, ['action_id', 'issue_id', 'agent_id', 'tool_call_ref', 'summary', 'output_digest']) &&
    isStringArray(value.evidence_refs) &&
    (value.host_attempt_id === undefined || isString(value.host_attempt_id)) &&
    (value.changed_paths === undefined || isStringArray(value.changed_paths))
  );
}

/** @param {string} summary @returns {boolean} */
function isBlockedSynthesisSummary(summary) {
  const content = parseJson(Buffer.from(summary, 'utf8'), 'synthesis summary');
  if (!isRecord(content) || !isRecord(content.completeness)) return false;
  return (
    content.schema === 'VidaSynthesisObservationOutput/v1' &&
    content.readiness === 'blocked' &&
    content.completeness.status === 'blocked' &&
    (Array.isArray(content.material_gaps) || Array.isArray(content.completeness.material_gaps))
  );
}

/** @param {unknown} value @returns {value is HistoricalTerminalEvidence} */
function isHistoricalTerminalEvidence(value) {
  return (
    isRecord(value) &&
    isTerminalObservation(value.body) &&
    isHistoricalFollowup(value.input) &&
    isHistoricalReport(value.report) &&
    isHistoricalReportBody(value.reportBody)
  );
}

/** @param {readonly string[]} args @returns {CliArguments} */
function parseArgs(args) {
  const values = collectCliOptions(args);
  const keys = [...values.keys()].sort().join('|');
  const required = ['--baseline-config', '--mode', '--native-session-handle', '--project-root', '--request'];
  const requiredKeys = [...required].sort().join('|');
  const optionalKeys = [...required, '--context-history'].sort().join('|');
  if (keys !== requiredKeys && keys !== optionalKeys) fail('mode or argument set invalid');
  const projectRoot = requiredCliOption(values, '--project-root');
  const nativeSessionHandle = requiredCliOption(values, '--native-session-handle');
  const baselineConfig = requiredCliOption(values, '--baseline-config');
  const request = requiredCliOption(values, '--request');
  const contextHistory = values.get('--context-history');
  if (
    !path.isAbsolute(projectRoot) ||
    nativeSessionHandle.length > 256 ||
    /\p{Cc}/u.test(nativeSessionHandle) ||
    !repositoryRelative(baselineConfig) ||
    !repositoryRelative(request) ||
    (contextHistory !== undefined && !repositoryRelative(contextHistory))
  )
    fail('mode or argument set invalid');
  const mode = checkedCliMode(requiredCliOption(values, '--mode'));
  return {
    mode,
    projectRoot,
    nativeSessionHandle,
    baselineConfig,
    request,
    ...(contextHistory === undefined ? {} : { contextHistory }),
  };
}

/** @param {Uint8Array} bytes @param {string} label @returns {unknown} */
function parseJson(bytes, label) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${label} is not valid UTF-8`);
  }
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail(`${label} UTF-8 bytes are not canonical`);
  try {
    /** @type {unknown} */
    const value = JSON.parse(text);
    return value;
  } catch {
    fail(`${label} is not JSON`);
  }
}

/** @param {unknown} identity @returns {asserts identity is WorkIdentity} */
function validateIdentity(identity) {
  exactKeys(identity, ['repository_id', 'project_ids', 'integrations_digest', 'work_id'], 'identity');
  if (
    typeof identity.repository_id !== 'string' ||
    !isStringArray(identity.project_ids) ||
    identity.project_ids.length !== 1 ||
    typeof identity.integrations_digest !== 'string' ||
    typeof identity.work_id !== 'string'
  )
    fail('identity invalid');
}

/** @param {unknown} value @returns {value is StateVersion} */
function isStateVersion(value) {
  return (
    isRecord(value) &&
    Object.keys(value).sort().join('|') === 'digest|revision' &&
    typeof value.digest === 'string' &&
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision)
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isValidRequestReferences(value) {
  return (
    repositoryRelative(value.body_ref) &&
    repositoryRelative(value.input_ref) &&
    repositoryRelative(value.report_ref) &&
    typeof value.followup_ref === 'string' &&
    value.followup_ref.length > 0 &&
    value.followup_ref.length <= 2048
  );
}

/** @param {Record<string, unknown>} value @returns {boolean} */
function isValidRequestLabels(value) {
  return (
    typeof value.action_id === 'string' &&
    value.action_id.length <= 256 &&
    typeof value.issue_id === 'string' &&
    value.issue_id.length <= 256 &&
    typeof value.userRequestPointer === 'string' &&
    value.userRequestPointer.length > 0 &&
    value.userRequestPointer.length <= 2048 &&
    (value.requestIntent === 'next_work' || value.requestIntent === 'linked_correction')
  );
}

/** @param {unknown} value @returns {asserts value is HistoricalTerminalSynthesisCliRequestBase} */
function validateRequestBase(value) {
  exactKeys(
    value,
    [
      'schema',
      'identity',
      'attempt',
      'action_id',
      'issue_id',
      'body_ref',
      'input_ref',
      'report_ref',
      'followup_ref',
      'userRequestPointer',
      'requestIntent',
    ],
    'request',
  );
  validateIdentity(value.identity);
  if (
    value.schema !== 'HistoricalTerminalSynthesisCaptureRequest/v1' ||
    typeof value.attempt !== 'number' ||
    !Number.isSafeInteger(value.attempt) ||
    value.attempt < 1 ||
    !isValidRequestReferences(value) ||
    !isValidRequestLabels(value)
  )
    fail('request schema, references or inspection invalid');
}

/** @param {unknown} value @returns {asserts value is HistoricalTerminalSynthesisInspection} */
function validateInspection(value) {
  exactKeys(
    value,
    [
      'expectedWork',
      'expectedLedger',
      'expectedJournal',
      'expectedMaintenanceGeneration',
      'baseline_binding',
      'receipt_binding',
      'current_config_binding',
      'engine_binding',
      'request_binding',
      'body_binding',
      'provenance_binding',
      'accepted_scope_binding',
      'original_operation_reference',
      'nativeSessionHandle',
    ],
    'inspection',
  );
  if (
    !isStateVersion(value.expectedWork) ||
    !isStateVersion(value.expectedLedger) ||
    !isStateVersion(value.expectedJournal)
  )
    fail('inspection state version is invalid');
  if (
    typeof value.expectedMaintenanceGeneration !== 'number' ||
    !Number.isSafeInteger(value.expectedMaintenanceGeneration) ||
    typeof value.original_operation_reference !== 'string' ||
    typeof value.nativeSessionHandle !== 'string' ||
    ![
      'baseline_binding',
      'receipt_binding',
      'current_config_binding',
      'engine_binding',
      'request_binding',
      'body_binding',
      'provenance_binding',
      'accepted_scope_binding',
    ].every((key) => typeof value[key] === 'string')
  )
    fail('inspection fields are invalid');
}

/** @param {HistoricalTerminalSynthesisCaptureResult['receipt']} receipt @returns {{expectedWork: StateVersion, expectedLedger: StateVersion, expectedJournal: StateVersion, expectedMaintenanceGeneration: number}} */
function receiptInspectionVersions(receipt) {
  const request = receipt.request;
  const expectedWork = request.expected_work;
  const expectedLedger = request.expected_ledger;
  const expectedJournal = request.expected_journal;
  const expectedMaintenanceGeneration = request.expected_maintenance_generation;
  if (
    !isStateVersion(expectedWork) ||
    !isStateVersion(expectedLedger) ||
    !isStateVersion(expectedJournal) ||
    typeof expectedMaintenanceGeneration !== 'number' ||
    !Number.isSafeInteger(expectedMaintenanceGeneration)
  )
    fail('historical terminal custody receipt inspection versions are invalid');
  return { expectedWork, expectedLedger, expectedJournal, expectedMaintenanceGeneration };
}

/**
 * @param {string | undefined} historyRef
 * @param {WorkIdentity} identity
 * @param {number} attempt
 * @param {SafeRepositoryAccess} access
 * @param {string} databasePath
 * @param {string} workspaceId
 * @param {(file: string, workspaceId: string) => ReturnType<typeof inspectCliHostWorkspaceDatabase>} inspectHostWorkspaceDatabase
 * @returns {HistoricalOriginalContext[] | undefined}
 */
function buildOriginalContexts(
  historyRef,
  identity,
  attempt,
  access,
  databasePath,
  workspaceId,
  inspectHostWorkspaceDatabase,
) {
  if (historyRef === undefined) return undefined;
  const historyBytes = access.readBytes(historyRef, 'original caller context export');
  if (historyBytes.length > 1024 * 1024) fail('historical context export exceeds bound');
  const body = parseJson(historyBytes, 'original caller context export');
  if (!isHistoricalRunResultWithActions(body)) fail('historical context export must be a retained run result');
  const host = inspectHostWorkspaceDatabase(databasePath, workspaceId),
    journals = host.journals.filter((entry) => entry.work_id === identity.work_id && entry.attempt === attempt);
  if (journals.length !== 1) fail('historical context Journal differs');
  const journal = journals[0];
  if (!journal) throw new Error('historical context Journal is unavailable');
  const state = journal.state,
    items = [...state.items, ...state.completed.flatMap((wave) => wave.items)],
    contexts = body.next_actions.map(configuredContextFromAction).filter(isRetainedConfiguredContext);
  if (!contexts.length || contexts.length > 256) fail('historical context export is missing or excessive');
  return contexts.map((context) => {
    const request = uniqueHistoricalContextRequest(items, context);
    return {
      action_id: request.action_id,
      wave_index: request.wave_index,
      stage_id: request.stage_id,
      work_id: state.work_id,
      attempt: state.attempt,
      context,
    };
  });
}

/** @param {MastraSessionLedgerSnapshot['state']['items']} items
 * @param {ConfiguredContext} context
 */
function uniqueHistoricalContextRequest(items, context) {
  const matches = items.filter((item) => item.request.configured_context_digest === context.digest);
  if (matches.length !== 1) fail('historical context export action differs');
  const match = matches[0];
  if (!match) throw new Error('historical context export action is unavailable');
  return match.request;
}

/** @param {string} root @param {unknown} value @param {string} label @returns {string} */
function asAbsoluteInsideRoot(root, value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) fail(`${label} is not absolute`);
  const relative = path.relative(root, value);
  if (relative.startsWith('..') || path.isAbsolute(relative) || realpathSync(value) !== value)
    fail(`${label} escapes the repository`);
  return relative.split(path.sep).join('/');
}

/** @param {Buffer} scopeBytes @returns {string} */
function originalScopeOperationReference(scopeBytes) {
  const scope = parseJson(scopeBytes, 'accepted original scope');
  const attribution = isRecord(scope) ? scope.attribution : undefined;
  const reference = isRecord(attribution) ? attribution.pointer : undefined;
  if (typeof reference !== 'string' || reference.length === 0 || reference.length > 2048 || /\p{Cc}/u.test(reference))
    fail('accepted original scope operation reference is invalid');
  return reference;
}

/**
 * @param {unknown} bodyValue
 * @param {unknown} inputValue
 * @param {unknown} reportValue
 * @param {HistoricalTerminalSynthesisCliRequestBase} base
 * @param {string} followupRef
 * @param {unknown} reportBodyValue
 * @param {(value: unknown) => string} canonicalJsonDigest
 * @returns {asserts bodyValue is SessionBridgeObservation}
 */
function validateTerminalBody(
  bodyValue,
  inputValue,
  reportValue,
  base,
  followupRef,
  reportBodyValue,
  canonicalJsonDigest,
) {
  const evidence = {
    body: bodyValue,
    input: inputValue,
    report: reportValue,
    reportBody: reportBodyValue,
  };
  if (!isHistoricalTerminalEvidence(evidence)) fail('retained synthesis evidence fields are invalid');
  const { body, input, report, reportBody } = evidence;
  if (
    canonicalJsonDigest(body) !== canonicalJsonDigest(reportBody) ||
    body.schema !== 'VidaSessionObservation/v1' ||
    body.status !== 'reported_complete' ||
    body.action_id !== base.action_id ||
    body.issue_id !== base.issue_id ||
    input.status !== body.status ||
    input.agent_id !== body.agent_id ||
    input.tool_call_ref !== body.tool_call_ref ||
    body.tool_call_ref !== followupRef ||
    reportBody.schema !== body.schema ||
    reportBody.action_id !== body.action_id ||
    reportBody.issue_id !== body.issue_id ||
    reportBody.output_digest !== body.output_digest ||
    reportBody.summary !== body.summary
  )
    fail('retained synthesis body, follow-up or report body differs');
  if (!isBlockedSynthesisSummary(body.summary)) fail('retained synthesis is not a blocked unaccepted candidate');
  if (
    report.exit_code !== 1 ||
    typeof report.stderr !== 'string' ||
    typeof report.input_path !== 'string' ||
    !Array.isArray(report.command)
  )
    fail('original report denial is missing');
}

/**
 * @param {ReturnType<typeof import('./runtime-config-rebind.mjs').inspectHistoricalOwnerContext>} original
 * @param {HistoricalTerminalSynthesisCliRequestBase} base
 * @param {StateVersion} expectedWork
 * @param {StateVersion} expectedLedger
 * @param {Buffer} bodyBytes
 * @param {HistoricalTerminalSynthesisProvenance} provenance
 * @param {Buffer} scopeBytes
 * @param {string} nativeSessionHandle
 * @param {(value: unknown) => string} canonicalJsonDigest
 * @param {(config: import('../src/config/runtime-config.ts').AgentRuntimeConfig) => string} runtimeConfigDigest
 * @returns {HistoricalTerminalSynthesisInspection}
 */
function inspectionFor(
  original,
  base,
  expectedWork,
  expectedLedger,
  bodyBytes,
  provenance,
  scopeBytes,
  nativeSessionHandle,
  canonicalJsonDigest,
  runtimeConfigDigest,
) {
  const originalOperationReference = originalScopeOperationReference(scopeBytes);
  return {
    expectedWork,
    expectedLedger,
    expectedJournal: original.journal.version,
    expectedMaintenanceGeneration: original.maintenanceGeneration,
    baseline_binding: original.baseline_binding,
    receipt_binding: original.receipt_binding,
    current_config_binding: runtimeConfigDigest(original.current),
    engine_binding: original.engine_binding,
    request_binding: canonicalJsonDigest(base),
    body_binding: createHash('sha256').update(bodyBytes).digest('hex'),
    provenance_binding: canonicalJsonDigest(provenance),
    accepted_scope_binding: createHash('sha256').update(scopeBytes).digest('hex'),
    original_operation_reference: originalOperationReference,
    nativeSessionHandle,
  };
}

/**
 * @param {'inspect' | 'apply' | 'resume'} mode
 * @param {HistoricalTerminalSynthesisCliRequestBase} base
 * @param {HistoricalTerminalSynthesisInspection} inspection
 * @param {HistoricalTerminalSynthesisCaptureResult} verified
 */
function existingReceiptResponse(mode, base, inspection, verified) {
  if (mode === 'inspect')
    return {
      schema: 'HistoricalTerminalSynthesisCapture/v1',
      status: 'historical_terminal_synthesis_capture_inspected',
      request: { ...base, inspection },
      original_operation_reference: inspection.original_operation_reference,
      current_user_request_pointer: base.userRequestPointer,
      terminal_status: 'known_terminal_unaccepted',
      task_status: 'unfinished',
      custody_receipt_present: true,
      request_digest: verified.request_digest,
      work_version: verified.receipt.work_version,
      ledger_version: verified.receipt.ledger_version,
      journal_version: verified.receipt.journal_version,
      rights_granted: false,
      accepted_result: false,
      runtime_acceptance: false,
      caller_identity_authenticated: false,
      caller_authorization_required: true,
    };
  return {
    schema: 'HistoricalTerminalSynthesisCapture/v1',
    status: 'historical_terminal_synthesis_captured',
    original_operation_reference: inspection.original_operation_reference,
    current_user_request_pointer: base.userRequestPointer,
    request_digest: verified.request_digest,
    receipt: verified.receipt,
    work_version: verified.receipt.work_version,
    ledger_version: verified.receipt.ledger_version,
    journal_version: verified.receipt.journal_version,
    rights_granted: false,
    accepted_result: false,
    runtime_acceptance: false,
    caller_identity_authenticated: false,
    caller_authorization_required: true,
  };
}

/** @param {readonly string[]} args */
export async function captureHistoricalTerminalSynthesis(args) {
  const values = parseArgs(args),
    mode = values.mode,
    root = realpathSync(values.projectRoot);
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { inspectHistoricalOwnerContext } = await import('./runtime-config-rebind.mjs');
  const { loadRuntimeConfig, runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
  const { admittedResearchResultsForSynthesis, buildObservedSynthesisResult } =
    await import('../src/orchestration/observed-synthesis-result.ts');
  const { captureHistoricalTerminalSynthesisOwnerWork, inspectHistoricalOwnerWork } =
    await import('../src/orchestration/suspend-local-work.ts');
  const access = requireSafeRepositoryAccess(root),
    requestBytes = access.readBytes(values.request, 'terminal synthesis capture request');
  if (requestBytes.length > 65536) fail('request exceeds bound');
  const requestValue = parseJson(requestBytes, 'terminal synthesis capture request');
  if (!isRecord(requestValue)) fail('terminal synthesis capture request must be an object');
  const { inspection: suppliedInspection, ...base } = requestValue;
  validateRequestBase(base);
  if (mode === 'inspect' ? suppliedInspection !== undefined : suppliedInspection === undefined)
    fail('request schema, references or inspection invalid');
  if (suppliedInspection !== undefined) validateInspection(suppliedInspection);
  const bodyBytes = access.readBytes(base.body_ref, 'exact terminal synthesis body'),
    inputBytes = access.readBytes(base.input_ref, 'original synthesis follow-up context'),
    reportBytes = access.readBytes(base.report_ref, 'original denied report output');
  if (bodyBytes.length > 65536 || inputBytes.length > 65536 || reportBytes.length > 262144)
    fail('retained body or provenance exceeds bound');
  const body = parseJson(bodyBytes, 'exact terminal synthesis body'),
    observedInput = parseJson(inputBytes, 'original synthesis follow-up context'),
    report = parseJson(reportBytes, 'original denied report output');
  if (!isHistoricalReport(report)) fail('original report output shape is invalid');
  validateTerminalBody(body, observedInput, report, base, base.followup_ref, body, canonicalJsonDigest);
  const denial = parseJson(Buffer.from(report.stderr, 'utf8'), 'original report denial');
  if (!isRecord(denial)) fail('original report denial must be an object');
  if (
    denial.schema !== 'VidaAgentRunResult/v1' ||
    denial.status !== 'blocked' ||
    denial.code !== 'GAP-VIDA-RUN-EXECUTION-001' ||
    denial.message !== 'The requested run was blocked by runtime validation.'
  )
    fail('original report denial differs from retained GAP');
  const reportInputPath = path.resolve(root, base.input_ref),
    reportIndex = report.command.indexOf('--report'),
    reportBodyAbsolute = reportIndex >= 0 ? report.command[reportIndex + 1] : null;
  if (report.input_path !== reportInputPath || typeof reportBodyAbsolute !== 'string')
    fail('original report output does not bind the retained input and body');
  const reportBodyRef = asAbsoluteInsideRoot(root, reportBodyAbsolute, 'original report body reference'),
    reportBodyBytes = access.readBytes(reportBodyRef, 'original report body'),
    reportBody = parseJson(reportBodyBytes, 'original report body');
  validateTerminalBody(body, observedInput, report, base, base.followup_ref, reportBody, canonicalJsonDigest);
  const config = loadRuntimeConfig(root),
    workspaceId = deriveWorkspaceId(config.repository.repository_id, root),
    databasePath = sessionHandoffDatabasePath(root, config),
    db = openCliWorkspaceDatabase(root, databasePath, workspaceId, mode !== 'apply');
  try {
    const store = createCliHostStateStore(db, workspaceId, undefined, undefined, undefined, undefined, root),
      originalContexts = buildOriginalContexts(
        values.contextHistory,
        base.identity,
        base.attempt,
        access,
        databasePath,
        workspaceId,
        (file, workspaceId) => inspectCliHostWorkspaceDatabase(root, file, workspaceId),
      ),
      original = inspectHistoricalOwnerContext(
        root,
        values.baselineConfig,
        base.identity,
        base.attempt,
        originalContexts,
      ),
      intake = readAdmittedSessionIntake(root, store, base.identity);
    if (intake.native_session_handle !== values.nativeSessionHandle) fail('original owner handle differs');
    const state = original.journal.state;
    /** @type {MastraSessionLedgerSnapshot} */
    const journal = {
      state,
      version: original.journal.version,
      resume_status: 'issued_outcome_uncertain',
    };
    const expectedWork = original.owner.version;
    const expectedLedger = original.workspace.ledger_version;
    if (!expectedWork || !expectedLedger) fail('original Host owner or Ledger version is unavailable');
    const items = [...state.items, ...state.completed.flatMap((wave) => wave.items)],
      matches = items.filter((item) => item.request.action_id === base.action_id);
    if (matches.length !== 1) fail('original synthesis action is missing or ambiguous');
    const item = matches[0];
    if (!item) fail('original synthesis action is unavailable');
    if (
      item.issue_id !== base.issue_id ||
      item.observation !== null ||
      item.request.stage_id !== 'synthesize_task' ||
      item.request.workflow_id !== original.owner.state.binding.workflow_id ||
      item.request.run_id !== state.run_id ||
      item.request.config_digest !== original.owner.state.binding.config_digest ||
      item.request.scope_digest !== state.source_scope?.digest
    )
      fail('original Journal action is not the exact unaccepted synthesis issue');
    const predecessors = admittedResearchResultsForSynthesis({
      repositoryRoot: root,
      config: original.config,
      journal,
      work: original.owner.state,
      workflowId: item.request.workflow_id,
    });
    if (predecessors.length !== 2) fail('original synthesis does not have exactly two admitted predecessors');
    const activationUse = item.research_activation?.use;
    if (!activationUse) fail('original synthesis activation use is unavailable');
    if (!isAdmittedWorkItem(intake.work_item)) fail('admitted original work item is invalid');
    const refs = predecessors
        .map((result) => ({ result_id: result.result_id, digest: result.digest }))
        .sort((left, right) => left.result_id.localeCompare(right.result_id)),
      /** @type {HistoricalTerminalSynthesisProvenance} */
      provenance = {
        schema: 'HistoricalTerminalSynthesisProvenance/v1',
        body_ref: base.body_ref,
        input_ref: base.input_ref,
        report_ref: base.report_ref,
        followup_ref: base.followup_ref,
        original_actor_id: body.agent_id,
        denial_status: 'blocked',
        denial_code: denial.code,
        denial_message: denial.message,
        denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
        input_bytes_base64: inputBytes.toString('base64'),
        report_bytes_base64: reportBytes.toString('base64'),
        predecessor_refs: refs,
      };
    if (body.action_id !== item.request.action_id || body.issue_id !== item.issue_id)
      fail('native body action or issue does not match the original journal');
    const scopeBytes = access.readBytes(original.owner.state.contracts.scope.path, 'accepted original scope'),
      acceptanceBytes = access.readBytes(
        original.owner.state.contracts.acceptance.path,
        'accepted original acceptance',
      );
    if (createHash('sha256').update(scopeBytes).digest('hex') !== original.owner.state.contracts.scope.sha256)
      fail('accepted original scope differs from its owner contract');
    const projectId = base.identity.project_ids[0];
    if (!projectId) fail('original project identity is unavailable');
    const capture = {
      actionId: item.request.action_id,
      issueId: item.issue_id,
      bodyBytes,
      provenance,
    };
    /** @type {'terminal_synthesis_unaccepted'} */
    const predicate = 'terminal_synthesis_unaccepted';
    /** @type {Parameters<typeof captureHistoricalTerminalSynthesisOwnerWork>[0]} */
    const suspension = {
      store,
      identity: base.identity,
      journal,
      expectedWork,
      expectedLedger,
      expectedMaintenanceGeneration: original.maintenanceGeneration,
      nativeSessionHandle: values.nativeSessionHandle,
      userRequestPointer: base.userRequestPointer,
      requestIntent: base.requestIntent,
      config: original.config,
      predicate,
      capture,
      documentationContext: {
        repository_root: root,
        repository_id: base.identity.repository_id,
        project_id: projectId,
        work_id: base.identity.work_id,
      },
    };
    const inspection = inspectionFor(
        original,
        base,
        expectedWork,
        expectedLedger,
        bodyBytes,
        provenance,
        scopeBytes,
        values.nativeSessionHandle,
        canonicalJsonDigest,
        runtimeConfigDigest,
      ),
      receiptBefore = store.readHistoricalTerminalSynthesisCapture(base.identity, base.attempt, base.action_id);
    if (receiptBefore) {
      const savedInspection = suppliedInspection ?? receiptInspectionVersions(receiptBefore);
      if (
        suppliedInspection &&
        (suppliedInspection.original_operation_reference !== inspection.original_operation_reference ||
          suppliedInspection.accepted_scope_binding !== inspection.accepted_scope_binding)
      )
        fail('accepted original scope changed after terminal capture inspection');
      const verified = store.readHistoricalTerminalSynthesisCaptureForRequest({
        schema: 'HistoricalTerminalSynthesisCapture/v1',
        identity: base.identity,
        attempt: base.attempt,
        actionId: base.action_id,
        issueId: base.issue_id,
        nativeSessionHandle: values.nativeSessionHandle,
        userRequestPointer: base.userRequestPointer,
        requestIntent: base.requestIntent,
        expectedWork: savedInspection.expectedWork,
        expectedLedger: savedInspection.expectedLedger,
        expectedJournal: savedInspection.expectedJournal,
        expectedMaintenanceGeneration: savedInspection.expectedMaintenanceGeneration,
        bodyBytes,
        provenance,
      });
      if (!verified)
        throw new Error(`${OPERATION}: current Host state does not retain the exact terminal custody receipt`);
      if (canonicalJsonDigest(verified.receipt) !== canonicalJsonDigest(receiptBefore))
        fail('current Host state does not retain the exact terminal custody receipt');
      return existingReceiptResponse(
        mode,
        base,
        { ...inspection, ...receiptInspectionVersions(verified.receipt) },
        verified,
      );
    }
    if (mode === 'resume') fail('no exact prior custody receipt exists to resume');
    if (mode === 'apply' && canonicalJsonDigest(suppliedInspection) !== canonicalJsonDigest(inspection))
      fail('frozen original owner, evidence or Work/Ledger/Journal/maintenance CAS changed');
    const dbSnapshot = store.readHostStateSnapshot(base.identity);
    if (
      !dbSnapshot.work ||
      !dbSnapshot.ledger ||
      canonicalJsonDigest(dbSnapshot.workVersion) !== canonicalJsonDigest(original.owner.version) ||
      canonicalJsonDigest(dbSnapshot.ledgerVersion) !== canonicalJsonDigest(original.workspace.ledger_version) ||
      dbSnapshot.maintenanceGeneration !== original.maintenanceGeneration
    )
      fail('current Host ownership or CAS differs from original inspection');
    inspectHistoricalOwnerWork(suspension);
    const synthesis = buildObservedSynthesisResult({
      config: original.config,
      request: item.request,
      issueId: item.issue_id,
      observation: body,
      activationUse,
      work: original.owner.state,
      workItem: intake.work_item,
      scopeBytes,
      acceptanceBytes,
      researchResults: predecessors,
    });
    if (synthesis.schema !== 'ResearchSynthesis/v1') fail('native body does not reconstruct as a synthesis candidate');
    if (mode === 'inspect') {
      return {
        schema: 'HistoricalTerminalSynthesisCapture/v1',
        status: 'historical_terminal_synthesis_capture_inspected',
        request: { ...base, inspection },
        original_operation_reference: inspection.original_operation_reference,
        current_user_request_pointer: base.userRequestPointer,
        terminal_status: 'known_terminal_unaccepted',
        task_status: 'unfinished',
        rights_granted: false,
        accepted_result: false,
        runtime_acceptance: false,
        caller_identity_authenticated: false,
        caller_authorization_required: true,
      };
    }
    if (
      !access.readBytes(values.request, 'terminal synthesis request stability').equals(requestBytes) ||
      !access.readBytes(base.body_ref, 'terminal synthesis body stability').equals(bodyBytes) ||
      !access.readBytes(base.input_ref, 'synthesis input stability').equals(inputBytes) ||
      !access.readBytes(base.report_ref, 'report denial stability').equals(reportBytes) ||
      !access.readBytes(reportBodyRef, 'original report body stability').equals(reportBodyBytes) ||
      !access
        .readBytes(original.owner.state.contracts.scope.path, 'accepted original scope stability')
        .equals(scopeBytes)
    )
      fail('request or retained terminal evidence changed before owner release');
    const latest = inspectHistoricalOwnerContext(
      root,
      values.baselineConfig,
      base.identity,
      base.attempt,
      originalContexts,
    );
    if (
      latest.baseline_binding !== original.baseline_binding ||
      latest.receipt_binding !== original.receipt_binding ||
      latest.engine_binding !== original.engine_binding ||
      latest.maintenanceGeneration !== original.maintenanceGeneration ||
      canonicalJsonDigest(latest.current) !== canonicalJsonDigest(original.current)
    )
      fail('original authority or suspended engine changed before owner release');
    captureHistoricalTerminalSynthesisOwnerWork(suspension);
    const receipt = store.readHistoricalTerminalSynthesisCapture(base.identity, base.attempt, base.action_id);
    if (!receipt) fail('Host transaction returned without its custody receipt');
    return {
      schema: 'HistoricalTerminalSynthesisCapture/v1',
      status: 'historical_terminal_synthesis_captured',
      original_operation_reference: inspection.original_operation_reference,
      current_user_request_pointer: base.userRequestPointer,
      request_digest: receipt.request_digest,
      receipt,
      work_version: receipt.work_version,
      ledger_version: receipt.ledger_version,
      journal_version: receipt.journal_version,
      rights_granted: false,
      accepted_result: false,
      runtime_acceptance: false,
      caller_identity_authenticated: false,
      caller_authorization_required: true,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(db);
  }
}
