import path from 'node:path';
import { Database } from 'bun:sqlite';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { readAdmittedSessionIntakeForWork } from '../src/orchestration/admitted-session-execution.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { validateFailedPrewriterRecoveryBasis } from '../src/orchestration/failed-prewriter-recovery.ts';

const requireRecovery = (condition, message) => {
  if (!condition) throw Error(`failed prewriter owner recovery: ${message}`);
};
const same = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
const keys = value => Object.keys(value).sort().join(',');

/** Restore ownership only. The failed wave, Source bindings and execution admission stay unchanged. */
export function recoverFailedPrewriterOwner(args) {
  requireRecovery(args.length === 6, 'mode, root and request are required');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireRecovery(!Object.hasOwn(values, args[index]) && args[index + 1], 'arguments invalid');
    values[args[index]] = args[index + 1];
  }
  requireRecovery(keys(values) === '--mode,--project-root,--request' &&
    ['inspect', 'apply'].includes(values['--mode']) && path.isAbsolute(values['--project-root']), 'argument set invalid');
  const root = values['--project-root'], access = requireSafeRepositoryAccess(root);
  const bytes = access.readBytes(values['--request'], 'failed prewriter owner recovery request');
  requireRecovery(bytes.length > 0 && bytes.length <= 32768, 'request exceeds bound');
  const input = JSON.parse(bytes.toString('utf8'));
  const inspecting = values['--mode'] === 'inspect';
  requireRecovery(input && keys(input) === (inspecting
    ? 'attempt,identity,nativeSessionHandle,schema'
    : 'attempt,expectedJournal,expectedLedger,expectedMaintenanceGeneration,expectedWork,identity,nativeSessionHandle,schema') &&
    input.schema === 'FailedPrewriterOwnerRecoveryRequest/v1' && Number.isSafeInteger(input.attempt) && input.attempt > 0 &&
    typeof input.nativeSessionHandle === 'string' && input.nativeSessionHandle.length > 0 && input.nativeSessionHandle.length <= 256,
  'request shape or owner invalid');
  const config = loadRuntimeConfig(root), project = loadProjectSetContext(root, config,
    input.identity.repository_id, input.identity.project_ids);
  requireRecovery(same(input.identity, { repository_id: project.repository_id, project_ids: project.project_ids,
    integrations_digest: project.integrations_digest, work_id: input.identity.work_id }), 'project identity differs');
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const file = sessionHandoffDatabasePath(root, config);
  access.readBytes(path.relative(root, file).split(path.sep).join('/'), 'configured Host database');
  const database = new Database(file, { readonly: inspecting, strict: true });
  try {
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const verifyCurrent = (work, journal, original) => {
      const currentConfig = loadRuntimeConfig(root), intake = readAdmittedSessionIntakeForWork(root, work);
      requireRecovery(runtimeConfigDigest(currentConfig) === work.binding.config_digest &&
        intake.native_session_handle === input.nativeSessionHandle &&
        original.request.nativeSessionHandle === input.nativeSessionHandle &&
        original.attempt === input.attempt && original.request.action.kind === 'configured_frontier' &&
        journal.run_id === original.prior_work.execution.run_id, 'original context or current configuration differs');
      const anchor = original.prior_work;
      const approval = anchor.lifecycle.references.find(item => item.kind === 'execution_approval' &&
        item.disposition === 'current' && item.decision === 'approved' &&
        item.artifact_schema === 'LocalSourceWriteAuthorization/v1');
      requireRecovery(approval && approval.path === intake.source_authorization_path, 'retained human Source authority missing');
      const retained = readLocalSourceWriteAuthorization(root, approval.path), authority = retained.authorization;
      requireRecovery(retained.sha256 === approval.sha256 && authority.action === 'source.write' &&
        authority.work_id === input.identity.work_id && authority.attempt === input.attempt &&
        authority.native_session_handle === input.nativeSessionHandle &&
        authority.scope_digest === anchor.binding.work_source_revision &&
        authority.config_digest === anchor.binding.config_digest && authority.workflow_id === anchor.binding.workflow_id &&
        authority.user_instruction_ref === approval.record_id &&
        approval.principal === 'local-session:' + canonicalJsonDigest(input.nativeSessionHandle) &&
        same([...authority.implementation_paths].sort(), [...work.binding.implementation_paths].sort()),
      'retained human permission, owner or exact Source scope differs');
      requireRecovery(access.readBytes(values['--request'], 'recovery request stability').equals(bytes), 'request changed');
    };
    if (inspecting) {
      const host = store.readHostStateSnapshot(input.identity), journal = store.readWorkSessionJournal(input.identity);
      const original = store.readDeliveredWorkContinuationReceipt(input.identity, input.attempt);
      requireRecovery(host.work && host.ledger && journal && original?.request.action.kind === 'configured_frontier', 'original work unavailable');
      validateFailedPrewriterRecoveryBasis({ original, work: host.work, ledger: host.ledger, journal: journal.state,
        nativeSessionHandle: input.nativeSessionHandle, now: Date.now() });
      verifyCurrent(host.work, journal.state, original);
      return { status: 'failed_prewriter_owner_recovery_ready', request: { ...input,
        expectedWork: host.workVersion, expectedLedger: host.ledgerVersion, expectedJournal: journal.version,
        expectedMaintenanceGeneration: host.maintenanceGeneration }, rights_granted: false, runtime_accepted: false };
    }
    const result = store.recoverFailedPrewriterOwner({ ...input, verifyCurrent });
    return { status: 'failed_prewriter_owner_recovered', work_version: result.workVersion,
      ledger_version: result.ledgerVersion, journal_version: store.readWorkSessionJournal(input.identity).version,
      failed_reports_preserved: true, source_bindings_changed: false,
      rights_granted: false, runtime_accepted: false };
  } finally {
    database.close(true);
  }
}
