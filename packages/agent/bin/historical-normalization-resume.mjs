import { realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

const OPERATION = 'historical-normalization-resume';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

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

function validateInspection(mode, supplied, current, plan, canonicalJsonDigest) {
  if (mode === 'apply') {
    if (canonicalJsonDigest(supplied) !== canonicalJsonDigest(current))
      fail('frozen original configuration, evidence, reserved plan or CAS changed after inspection');
    return;
  }
  const withoutFileBindings = (value) =>
    Object.fromEntries(Object.entries(value).filter(([key]) => !['record_binding', 'changelog_binding'].includes(key)));
  const allowedPairs = [
    [plan.record_pre_sha256, plan.changelog_pre_sha256],
    [plan.record_sha256, plan.changelog_pre_sha256],
    [plan.record_sha256, plan.changelog_sha256],
  ];
  const allowedPair = (inspection) =>
    allowedPairs.some(
      ([record, changelog]) => inspection.record_binding === record && inspection.changelog_binding === changelog,
    );
  if (
    canonicalJsonDigest(withoutFileBindings(supplied)) !== canonicalJsonDigest(withoutFileBindings(current)) ||
    !allowedPair(supplied) ||
    !allowedPair(current)
  )
    fail('resume is not the exact original request or reserved per-file transition');
}

function parseArgs(args) {
  if (args.length < 10 || args.length > 10 || args.length % 2 !== 0)
    fail('requires exact mode, root, original owner, baseline and request arguments');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    if (!args[index].startsWith('--') || Object.hasOwn(values, args[index]) || !args[index + 1])
      fail('arguments invalid');
    values[args[index]] = args[index + 1];
  }
  if (
    Object.keys(values).sort().join('|') !==
      ['--mode', '--project-root', '--native-session-handle', '--baseline-config', '--request'].sort().join('|') ||
    !['inspect', 'apply', 'resume'].includes(values['--mode']) ||
    !path.isAbsolute(values['--project-root']) ||
    values['--native-session-handle'].length > 256 ||
    /\p{Cc}/u.test(values['--native-session-handle']) ||
    !repositoryRelative(values['--baseline-config']) ||
    !repositoryRelative(values['--request'])
  )
    fail('mode or argument set invalid');
  return values;
}

export async function resumeHistoricalNormalization(args) {
  const values = parseArgs(args);
  const root = realpathSync(values['--project-root']);
  const mode = values['--mode'];
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { canonicalJsonDigest } = await import('../src/contracts/public-ingress.ts');
  const { inspectHistoricalOwnerContext } = await import('./runtime-config-rebind.mjs');
  const { HostStateStore } = await import('../src/host-state.ts');
  const { runtimeConfigDigest } = await import('../src/config/runtime-config.ts');
  const { deriveWorkspaceId } = await import('../src/workspace-identity.ts');
  const { Database } = await import('bun:sqlite');
  const { sessionHandoffDatabasePath } = await import('../src/orchestration/persistent-session-handoff.ts');
  const { readAdmittedSessionIntake } = await import('../src/orchestration/admitted-session-execution.ts');
  const { buildObservedResearchResult } = await import('../src/orchestration/observed-research-result.ts');
  const { resumeHistoricalObservedResearchResult, validateObservedResearchRecordPlan } =
    await import('../src/research-decision.ts');
  const access = requireSafeRepositoryAccess(root);
  const requestBytes = access.readBytes(values['--request'], 'historical normalization request');
  if (requestBytes.length > 65536) fail('request exceeds bound');
  const request = JSON.parse(requestBytes.toString('utf8'));
  const { inspection: suppliedInspection, ...base } = request;
  exactKeys(base, ['schema', 'identity', 'attempt', 'action_id'], 'request');
  if (
    base.schema !== 'HistoricalNormalizationResumeRequest/v1' ||
    typeof base.action_id !== 'string' ||
    base.action_id.length > 256 ||
    /\p{Cc}/u.test(base.action_id) ||
    !Number.isSafeInteger(base.attempt) ||
    base.attempt < 1 ||
    (mode === 'inspect' ? suppliedInspection !== undefined : !suppliedInspection)
  )
    fail('request schema, action or inspection is invalid');
  exactKeys(base.identity, ['repository_id', 'project_ids', 'integrations_digest', 'work_id'], 'identity');
  const databaseRoot = realpathSync(root);
  const originalConfig = await import('../src/config/runtime-config.ts');
  const currentConfig = originalConfig.loadRuntimeConfig(root);
  const databasePath = sessionHandoffDatabasePath(root, currentConfig);
  const database = new Database(databasePath, { readonly: mode === 'inspect', strict: true });
  try {
    const workspaceId = deriveWorkspaceId(currentConfig.repository.repository_id, root);
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const inspectCurrent = (original) => {
      const host = store.readHostStateSnapshot(base.identity);
      if (
        !host.work ||
        !host.ledger ||
        canonicalJsonDigest(host.workVersion) !== canonicalJsonDigest(original.owner.version) ||
        canonicalJsonDigest(host.ledgerVersion) !== canonicalJsonDigest(original.workspace.ledger_version) ||
        host.maintenanceGeneration !== original.maintenanceGeneration
      )
        fail('current Work, Ledger or maintenance CAS differs from original owner inspection');
      const work = host.work;
      const lease = work.lease;
      const ticket = host.ledger.tickets.find((entry) => entry.ticket_id === lease?.ticket_id);
      const claims = host.ledger.claims.filter(
        (entry) =>
          entry.ticket_id === lease?.ticket_id &&
          entry.work_id === base.identity.work_id &&
          entry.thread_id === lease?.thread_id &&
          entry.generation === lease?.generation &&
          entry.status === 'active',
      );
      if (
        !lease ||
        work.execution.status !== 'active' ||
        ticket?.status !== 'active' ||
        !ticket.expires_at ||
        claims.length !== 1 ||
        lease.thread_id !== values['--native-session-handle'] ||
        ticket.thread_id !== lease.thread_id ||
        ticket.generation !== lease.generation ||
        claims[0].lease_expires_at !== ticket.expires_at ||
        canonicalJsonDigest(claims[0].resources) !== canonicalJsonDigest(ticket.active_resources) ||
        !ticket.claim_ids.includes(claims[0].claim_id)
      )
        fail('original owner claim or retained expiry is not exact');
      const intake = readAdmittedSessionIntake(root, store, base.identity);
      if (intake.native_session_handle !== values['--native-session-handle'])
        fail('original native owner handle differs');
      const state = original.journal.state;
      if (!state.source_scope || state.work_id !== base.identity.work_id || state.attempt !== base.attempt)
        fail('original Journal scope or attempt differs');
      const items = [...state.completed.flatMap((wave) => wave.items), ...state.items];
      const matches = items.filter((item) => item.request.action_id === base.action_id);
      if (matches.length !== 1) fail('original action is missing or ambiguous');
      const item = matches[0];
      if (
        !item.issue_id ||
        !item.observation ||
        item.observation.status !== 'reported_complete' ||
        !item.research_activation ||
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
        observation: item.observation,
        request: item.request,
        issueId: item.issue_id,
        activationUse: item.research_activation.use,
        work,
        workItem: intake.work_item,
        scopeBytes,
        acceptanceBytes,
      });
      if (result.digest !== plan.result_digest) fail('reserved result differs from its original observation');
      const acceptedScope = JSON.parse(scopeBytes.toString('utf8'));
      const originalOperationReference = acceptedScope.attribution.pointer;
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
        plan,
        binding,
        result,
        inspection: {
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          expectedJournal: original.journal.version,
          expectedMaintenanceGeneration: host.maintenanceGeneration,
          baseline_binding: original.baseline_binding,
          receipt_binding: original.receipt_binding,
          current_config_binding: runtimeConfigDigest(original.current),
          engine_binding: original.engine_binding,
          request_binding: canonicalJsonDigest(base),
          owner_binding: canonicalJsonDigest({
            handle: values['--native-session-handle'],
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
    const firstOriginal = inspectHistoricalOwnerContext(root, values['--baseline-config'], base.identity, base.attempt);
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
    if (!access.readBytes(values['--request'], 'historical request stability').equals(requestBytes))
      fail('frozen request changed before resume');
    const latestOriginal = inspectHistoricalOwnerContext(
      root,
      values['--baseline-config'],
      base.identity,
      base.attempt,
    );
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
      observation: latest.item.observation,
      binding: latest.binding,
      activation_use: latest.item.research_activation.use,
      activation_plan: latest.item.research_activation.plan,
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
    database.close();
  }
}
