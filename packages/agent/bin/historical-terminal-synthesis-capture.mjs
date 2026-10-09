import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import path from 'node:path';

const OPERATION = 'historical-terminal-synthesis-capture';

function fail(message) {
  throw new Error(`${OPERATION}: ${message}`);
}

function exactKeys(value, expected, label) {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== 'object' ||
    Object.keys(value).sort().join('|') !== [...expected].sort().join('|')
  )
    fail(`${label} shape invalid`);
}

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

function parseArgs(args) {
  if (args.length !== 10 && args.length !== 12) fail('requires exact mode, root, owner, baseline, request and optional history');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index].startsWith('--') || Object.hasOwn(values, args[index]) || !args[index + 1])
      fail('arguments invalid');
    values[args[index]] = args[index + 1];
  }
  const keys = Object.keys(values).sort().join('|'),
    expected = ['--mode', '--project-root', '--native-session-handle', '--baseline-config', '--request'],
    optionalHistory = keys === [...expected, '--context-history'].sort().join('|');
  if (
    (!optionalHistory && keys !== expected.sort().join('|')) ||
    !['inspect', 'apply', 'resume'].includes(values['--mode']) ||
    !path.isAbsolute(values['--project-root']) ||
    values['--native-session-handle'].length > 256 ||
    /\p{Cc}/u.test(values['--native-session-handle']) ||
    !repositoryRelative(values['--baseline-config']) ||
    !repositoryRelative(values['--request']) ||
    (values['--context-history'] !== undefined && !repositoryRelative(values['--context-history']))
  )
    fail('mode or argument set invalid');
  return values;
}

function parseJson(bytes, label) {
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${label} is not valid UTF-8`);
  }
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail(`${label} UTF-8 bytes are not canonical`);
  try {
    return JSON.parse(text);
  } catch {
    fail(`${label} is not JSON`);
  }
}

function validateIdentity(identity) {
  exactKeys(identity, ['repository_id', 'project_ids', 'integrations_digest', 'work_id'], 'identity');
  if (
    typeof identity.repository_id !== 'string' ||
    !Array.isArray(identity.project_ids) ||
    identity.project_ids.length !== 1 ||
    typeof identity.integrations_digest !== 'string' ||
    typeof identity.work_id !== 'string'
  )
    fail('identity invalid');
}

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
  if (body.schema !== 'VidaAgentRunResult/v1' || !Array.isArray(body.next_actions))
    fail('historical context export must be a retained run result');
  const host = inspectHostWorkspaceDatabase(databasePath, workspaceId),
    journals = host.journals.filter((entry) => entry.work_id === identity.work_id && entry.attempt === attempt);
  if (journals.length !== 1) fail('historical context Journal differs');
  const state = journals[0].state,
    items = [...state.items, ...state.completed.flatMap((wave) => wave.items)],
    contexts = body.next_actions
      .map((action) => action.configured_context)
      .filter((context) => context?.schema === 'ConfiguredContext/v1');
  if (!contexts.length || contexts.length > 256) fail('historical context export is missing or excessive');
  return contexts.map((context) => {
    const matches = items.filter((item) => item.request.configured_context_digest === context.digest);
    if (matches.length !== 1) fail('historical context export action differs');
    const request = matches[0].request;
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

function asAbsoluteInsideRoot(root, value, label) {
  if (typeof value !== 'string' || !path.isAbsolute(value)) fail(`${label} is not absolute`);
  const relative = path.relative(root, value);
  if (relative.startsWith('..') || path.isAbsolute(relative) || realpathSync(value) !== value)
    fail(`${label} escapes the repository`);
  return relative.split(path.sep).join('/');
}

function validateTerminalBody(body, input, report, base, followupRef, reportBody, canonicalJsonDigest) {
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
  const content = parseJson(Buffer.from(body.summary, 'utf8'), 'synthesis summary');
  if (
    content.schema !== 'VidaSynthesisObservationOutput/v1' ||
    content.readiness !== 'blocked' ||
    content.completeness?.status !== 'blocked' ||
    !Array.isArray(content.material_gaps) && !Array.isArray(content.completeness?.material_gaps)
  )
    fail('retained synthesis is not a blocked unaccepted candidate');
  if (
    report.exit_code !== 1 ||
    typeof report.stderr !== 'string' ||
    typeof report.input_path !== 'string' ||
    !Array.isArray(report.command)
  )
    fail('original report denial is missing');
}

function inspectionFor(
  original,
  base,
  bodyBytes,
  provenance,
  scopeBytes,
  nativeSessionHandle,
  canonicalJsonDigest,
  runtimeConfigDigest,
) {
  const acceptedScope = parseJson(scopeBytes, 'accepted original scope'),
    originalOperationReference = acceptedScope?.attribution?.pointer;
  if (
    typeof originalOperationReference !== 'string' ||
    originalOperationReference.length === 0 ||
    originalOperationReference.length > 2048 ||
    /\p{Cc}/u.test(originalOperationReference)
  )
    fail('accepted original scope operation reference is invalid');
  return {
    expectedWork: original.owner.version,
    expectedLedger: original.workspace.ledger_version,
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

function captureRequestDigest(base, inspection, nativeSessionHandle, bodyBytes, provenance, canonicalJsonDigest) {
  return canonicalJsonDigest({
    schema: 'HistoricalTerminalSynthesisCapture/v1',
    identity: base.identity,
    attempt: base.attempt,
    action_id: base.action_id,
    issue_id: base.issue_id,
    native_session_handle: nativeSessionHandle,
    user_request_pointer: base.userRequestPointer,
    request_intent: base.requestIntent,
    expected_work: inspection.expectedWork,
    expected_ledger: inspection.expectedLedger,
    expected_journal: inspection.expectedJournal,
    expected_maintenance_generation: inspection.expectedMaintenanceGeneration,
    body_base64: Buffer.from(bodyBytes).toString('base64'),
    provenance,
  });
}

export async function captureHistoricalTerminalSynthesis(args) {
  const values = parseArgs(args),
    mode = values['--mode'],
    root = realpathSync(values['--project-root']);
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { inspectHistoricalOwnerContext } = await import('./runtime-config-rebind.mjs');
  const { HostStateStore, inspectHostWorkspaceDatabase } = await import('../src/host-state.ts');
  const { loadRuntimeConfig, runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { Database } = await import('bun:sqlite');
  const { sessionHandoffDatabasePath } = await import('../src/config/project-paths.ts');
  const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
  const { admittedResearchResultsForSynthesis, buildObservedSynthesisResult } =
    await import('../src/orchestration/observed-synthesis-result.ts');
  const {
    captureHistoricalTerminalSynthesisOwnerWork,
    inspectHistoricalOwnerWork,
  } = await import('../src/orchestration/suspend-local-work.ts');
  const access = requireSafeRepositoryAccess(root),
    requestBytes = access.readBytes(values['--request'], 'terminal synthesis capture request');
  if (requestBytes.length > 65536) fail('request exceeds bound');
  const request = parseJson(requestBytes, 'terminal synthesis capture request'),
    { inspection: suppliedInspection, ...base } = request;
  exactKeys(
    base,
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
  validateIdentity(base.identity);
  if (
    base.schema !== 'HistoricalTerminalSynthesisCaptureRequest/v1' ||
    !Number.isSafeInteger(base.attempt) ||
    base.attempt < 1 ||
    !repositoryRelative(base.body_ref) ||
    !repositoryRelative(base.input_ref) ||
    !repositoryRelative(base.report_ref) ||
    typeof base.action_id !== 'string' ||
    base.action_id.length > 256 ||
    typeof base.issue_id !== 'string' ||
    base.issue_id.length > 256 ||
    typeof base.followup_ref !== 'string' ||
    base.followup_ref.length === 0 ||
    base.followup_ref.length > 2048 ||
    !['next_work', 'linked_correction'].includes(base.requestIntent) ||
    typeof base.userRequestPointer !== 'string' ||
    base.userRequestPointer.length === 0 ||
    base.userRequestPointer.length > 2048 ||
    (mode === 'inspect' ? suppliedInspection !== undefined : !suppliedInspection)
  )
    fail('request schema, references or inspection invalid');
  const bodyBytes = access.readBytes(base.body_ref, 'exact terminal synthesis body'),
    inputBytes = access.readBytes(base.input_ref, 'original synthesis follow-up context'),
    reportBytes = access.readBytes(base.report_ref, 'original denied report output');
  if (bodyBytes.length > 65536 || inputBytes.length > 65536 || reportBytes.length > 262144)
    fail('retained body or provenance exceeds bound');
  const body = parseJson(bodyBytes, 'exact terminal synthesis body'),
    observedInput = parseJson(inputBytes, 'original synthesis follow-up context'),
    report = parseJson(reportBytes, 'original denied report output');
  validateTerminalBody(body, observedInput, report, base, base.followup_ref, body, canonicalJsonDigest);
  const denial = parseJson(Buffer.from(report.stderr, 'utf8'), 'original report denial');
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
    db = new Database(databasePath, { readonly: mode !== 'apply', strict: true });
  try {
    const store = new HostStateStore(db, workspaceId, undefined, undefined, undefined, undefined, root),
      originalContexts = buildOriginalContexts(
        values['--context-history'],
        base.identity,
        base.attempt,
        access,
        databasePath,
        workspaceId,
        inspectHostWorkspaceDatabase,
      ),
      original = inspectHistoricalOwnerContext(
        root,
        values['--baseline-config'],
        base.identity,
        base.attempt,
        originalContexts,
      ),
      host = store.readHostStateSnapshot(base.identity),
      intake = readAdmittedSessionIntake(root, store, base.identity);
    if (intake.native_session_handle !== values['--native-session-handle'])
      fail('original owner handle differs');
    const state = original.journal.state,
      items = [...state.items, ...state.completed.flatMap((wave) => wave.items)],
      matches = items.filter((item) => item.request.action_id === base.action_id);
    if (matches.length !== 1) fail('original synthesis action is missing or ambiguous');
    const item = matches[0];
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
      journal: original.journal,
      work: original.owner.state,
      workflowId: item.request.workflow_id,
    });
    if (predecessors.length !== 2) fail('original synthesis does not have exactly two admitted predecessors');
    const refs = predecessors
        .map((result) => ({ result_id: result.result_id, digest: result.digest }))
        .sort((left, right) => left.result_id.localeCompare(right.result_id)),
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
      acceptanceBytes = access.readBytes(original.owner.state.contracts.acceptance.path, 'accepted original acceptance');
    if (createHash('sha256').update(scopeBytes).digest('hex') !== original.owner.state.contracts.scope.sha256)
      fail('accepted original scope differs from its owner contract');
    const capture = { actionId: item.request.action_id, issueId: item.issue_id, bodyBytes, provenance };
    const suspension = {
      store,
      identity: base.identity,
      journal: {
        state,
        version: original.journal.version,
        resume_status: 'issued_outcome_uncertain',
      },
      expectedWork: original.owner.version,
      expectedLedger: original.workspace.ledger_version,
      expectedMaintenanceGeneration: original.maintenanceGeneration,
      nativeSessionHandle: values['--native-session-handle'],
      userRequestPointer: base.userRequestPointer,
      requestIntent: base.requestIntent,
      config: original.config,
      predicate: 'terminal_synthesis_unaccepted',
      capture,
      documentationContext: {
        repository_root: root,
        repository_id: base.identity.repository_id,
        project_id: base.identity.project_ids[0],
        work_id: base.identity.work_id,
      },
    };
    const inspection = inspectionFor(
        original,
        base,
        bodyBytes,
        provenance,
        scopeBytes,
        values['--native-session-handle'],
        canonicalJsonDigest,
        runtimeConfigDigest,
      ),
      receiptBefore = store.readHistoricalTerminalSynthesisCapture(base.identity, base.attempt, base.action_id);
    if (receiptBefore) {
      const savedInspection = suppliedInspection ?? {
        expectedWork: receiptBefore.request.expected_work,
        expectedLedger: receiptBefore.request.expected_ledger,
        expectedJournal: receiptBefore.request.expected_journal,
        expectedMaintenanceGeneration: receiptBefore.request.expected_maintenance_generation,
      };
      if (
        suppliedInspection &&
        (suppliedInspection.original_operation_reference !== inspection.original_operation_reference ||
          suppliedInspection.accepted_scope_binding !== inspection.accepted_scope_binding)
      )
        fail('accepted original scope changed after terminal capture inspection');
      if (
        captureRequestDigest(base, savedInspection, values['--native-session-handle'], bodyBytes, provenance, canonicalJsonDigest) !==
        receiptBefore.request_digest
      )
        fail('existing custody receipt does not match the exact request');
      const verified = store.captureHistoricalTerminalSynthesisAndRelease({
        schema: 'HistoricalTerminalSynthesisCapture/v1',
        identity: base.identity,
        attempt: base.attempt,
        actionId: base.action_id,
        issueId: base.issue_id,
        nativeSessionHandle: values['--native-session-handle'],
        userRequestPointer: base.userRequestPointer,
        requestIntent: base.requestIntent,
        expectedWork: savedInspection.expectedWork,
        expectedLedger: savedInspection.expectedLedger,
        expectedJournal: savedInspection.expectedJournal,
        expectedMaintenanceGeneration: savedInspection.expectedMaintenanceGeneration,
        documentationContext: {
          repository_root: root,
          repository_id: base.identity.repository_id,
          project_id: base.identity.project_ids[0],
          work_id: base.identity.work_id,
        },
        bodyBytes,
        provenance,
      });
      if (canonicalJsonDigest(verified.receipt) !== canonicalJsonDigest(receiptBefore))
        fail('current Host state does not retain the exact terminal custody receipt');
      return {
        schema: 'HistoricalTerminalSynthesisCapture/v1',
        status: 'historical_terminal_synthesis_captured',
        original_operation_reference: inspection.original_operation_reference,
        current_user_request_pointer: base.userRequestPointer,
        request_digest: receiptBefore.request_digest,
        receipt: receiptBefore,
        work_version: receiptBefore.work_version,
        ledger_version: receiptBefore.ledger_version,
        journal_version: receiptBefore.journal_version,
        rights_granted: false,
        accepted_result: false,
        runtime_acceptance: false,
        caller_identity_authenticated: false,
        caller_authorization_required: true,
      };
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
      activationUse: item.research_activation?.use,
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
      !access.readBytes(values['--request'], 'terminal synthesis request stability').equals(requestBytes) ||
      !access.readBytes(base.body_ref, 'terminal synthesis body stability').equals(bodyBytes) ||
      !access.readBytes(base.input_ref, 'synthesis input stability').equals(inputBytes) ||
      !access.readBytes(base.report_ref, 'report denial stability').equals(reportBytes) ||
      !access.readBytes(reportBodyRef, 'original report body stability').equals(reportBodyBytes) ||
      !access.readBytes(original.owner.state.contracts.scope.path, 'accepted original scope stability').equals(scopeBytes)
    )
      fail('request or retained terminal evidence changed before owner release');
    const latest = inspectHistoricalOwnerContext(
      root,
      values['--baseline-config'],
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
    db.close();
  }
}
