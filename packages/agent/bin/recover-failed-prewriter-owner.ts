import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import path from 'node:path';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { sessionHandoffDatabasePath } from '../src/config/project-paths.ts';
import { readAdmittedSessionIntakeForWork } from '../src/orchestration/admitted-session-execution.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { validateFailedPrewriterRecoveryBasis } from '../src/orchestration/failed-prewriter-recovery.ts';
import type { StateVersion, WorkIdentity, WorkState } from '../src/host-state.ts';
import type { MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import type { ConfiguredFrontierReceipt } from '../src/orchestration/delivered-work-continuation-repair.ts';

type RecoveryBase = {
  readonly schema: 'FailedPrewriterOwnerRecoveryRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly nativeSessionHandle: string;
};
type InspectRecoveryRequest = RecoveryBase & { readonly mode: 'inspect' };
type ApplyRecoveryRequest = RecoveryBase & {
  readonly mode: 'apply';
  readonly expectedWork: StateVersion;
  readonly expectedLedger: StateVersion;
  readonly expectedJournal: StateVersion;
  readonly expectedMaintenanceGeneration: number;
};
type RecoveryRequest = InspectRecoveryRequest | ApplyRecoveryRequest;

function requireRecovery(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(`failed prewriter owner recovery: ${message}`);
}
function same(left: unknown, right: unknown): boolean {
  return canonicalJsonDigest(left) === canonicalJsonDigest(right);
}
function keys(value: Record<string, unknown>): string {
  return Object.keys(value).sort().join(',');
}
function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
function isWorkIdentity(value: unknown): value is WorkIdentity {
  return (
    isPlainRecord(value) &&
    keys(value) === 'integrations_digest,project_ids,repository_id,work_id' &&
    typeof value.repository_id === 'string' &&
    Array.isArray(value.project_ids) &&
    value.project_ids.every((item: unknown) => typeof item === 'string') &&
    typeof value.integrations_digest === 'string' &&
    typeof value.work_id === 'string'
  );
}
function isStateVersion(value: unknown): value is StateVersion {
  return (
    isPlainRecord(value) &&
    keys(value) === 'digest,revision' &&
    Number.isSafeInteger(value.revision) &&
    typeof value.digest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.digest)
  );
}
function hasRecoveryEnvelopeShape(value: unknown, expectedKeys: string): value is Record<string, unknown> {
  return isPlainRecord(value) && keys(value) === expectedKeys;
}
function hasRecoveryBaseFields(value: Record<string, unknown>): value is Record<string, unknown> & RecoveryBase {
  return (
    value.schema === 'FailedPrewriterOwnerRecoveryRequest/v1' &&
    Number.isSafeInteger(value.attempt) &&
    Number(value.attempt) > 0 &&
    isWorkIdentity(value.identity) &&
    typeof value.nativeSessionHandle === 'string' &&
    value.nativeSessionHandle.length > 0 &&
    value.nativeSessionHandle.length <= 256
  );
}
type ApplyVersions = Pick<
  ApplyRecoveryRequest,
  'expectedWork' | 'expectedLedger' | 'expectedJournal' | 'expectedMaintenanceGeneration'
>;
function hasRecoveryApplyVersions(value: Record<string, unknown>): value is Record<string, unknown> & ApplyVersions {
  return (
    isStateVersion(value.expectedWork) &&
    isStateVersion(value.expectedLedger) &&
    isStateVersion(value.expectedJournal) &&
    Number.isSafeInteger(value.expectedMaintenanceGeneration) &&
    Number(value.expectedMaintenanceGeneration) >= 0
  );
}
function parseRecoveryRequest(value: unknown, mode: 'inspect' | 'apply'): RecoveryRequest {
  const expectedKeys =
    mode === 'inspect'
      ? 'attempt,identity,nativeSessionHandle,schema'
      : 'attempt,expectedJournal,expectedLedger,expectedMaintenanceGeneration,expectedWork,identity,nativeSessionHandle,schema';
  requireRecovery(
    hasRecoveryEnvelopeShape(value, expectedKeys) && hasRecoveryBaseFields(value),
    'request shape or owner invalid',
  );
  const base: RecoveryBase = {
    schema: value.schema,
    identity: value.identity,
    attempt: value.attempt,
    nativeSessionHandle: value.nativeSessionHandle,
  };
  if (mode === 'inspect') return { ...base, mode: 'inspect' };
  requireRecovery(hasRecoveryApplyVersions(value), 'expected Host and Journal versions invalid');
  return {
    ...base,
    mode: 'apply',
    expectedWork: value.expectedWork,
    expectedLedger: value.expectedLedger,
    expectedJournal: value.expectedJournal,
    expectedMaintenanceGeneration: value.expectedMaintenanceGeneration,
  };
}
function retainedSourceApproval(work: WorkState, intake: unknown) {
  const approval = work.lifecycle.references.find(
    (item) =>
      item.kind === 'execution_approval' &&
      item.disposition === 'current' &&
      item.decision === 'approved' &&
      item.artifact_schema === 'LocalSourceWriteAuthorization/v1',
  );
  requireRecovery(
    approval !== undefined && isPlainRecord(intake) && approval.path === intake.source_authorization_path,
    'retained human Source authority differs from the protected intake',
  );
  return approval;
}
function recoveryRequestEnvelope<T extends RecoveryRequest>(request: T): Omit<T, 'mode'> {
  const { mode: _mode, ...envelope } = request;
  return envelope;
}

export function recoverFailedPrewriterOwner(args: readonly string[]) {
  requireRecovery(args.length === 6, 'mode, root and request are required');
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    requireRecovery(
      typeof key === 'string' && typeof value === 'string' && value.length > 0 && !values.has(key),
      'arguments invalid',
    );
    values.set(key, value);
  }
  requireRecovery(
    [...values.keys()].sort(compareText).join(',') === '--mode,--project-root,--request',
    'argument set invalid',
  );
  const mode = values.get('--mode');
  const root = values.get('--project-root');
  const requestPath = values.get('--request');
  requireRecovery(mode === 'inspect' || mode === 'apply', 'mode invalid');
  requireRecovery(root !== undefined && path.isAbsolute(root), 'project root invalid');
  requireRecovery(requestPath !== undefined, 'request path invalid');
  const access = requireSafeRepositoryAccess(root);
  const bytes = access.readBytes(requestPath, 'failed prewriter owner recovery request');
  requireRecovery(bytes.length > 0 && bytes.length <= 32768, 'request exceeds bound');
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  const request = parseRecoveryRequest(parsed, mode);
  const config = loadRuntimeConfig(root);
  const project = loadProjectSetContext(root, config, request.identity.repository_id, request.identity.project_ids);
  requireRecovery(
    same(request.identity, {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: request.identity.work_id,
    }),
    'project identity differs',
  );
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const file = sessionHandoffDatabasePath(root, config);
  access.readBytes(path.relative(root, file).split(path.sep).join('/'), 'configured Host database');
  const database = openCliWorkspaceDatabase(root, file, workspaceId, request.mode === 'inspect');
  try {
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const verifyCurrent = (
      work: WorkState,
      journal: MastraSessionLedgerState,
      original: ConfiguredFrontierReceipt,
    ): void => {
      const currentConfig = loadRuntimeConfig(root);
      const intake = readAdmittedSessionIntakeForWork(root, work);
      requireRecovery(
        runtimeConfigDigest(currentConfig) === work.binding.config_digest &&
          intake.native_session_handle === request.nativeSessionHandle &&
          original.request.nativeSessionHandle === request.nativeSessionHandle &&
          original.attempt === request.attempt &&
          original.request.action.kind === 'configured_frontier' &&
          journal.run_id === original.prior_work.execution.run_id,
        'original context or current configuration differs',
      );
      const anchor = original.prior_work;
      const approval = retainedSourceApproval(anchor, intake);
      const retained = readLocalSourceWriteAuthorization(root, approval.path);
      const authority = retained.authorization;
      requireRecovery(
        retained.sha256 === approval.sha256 &&
          authority.action === 'source.write' &&
          authority.work_id === request.identity.work_id &&
          authority.attempt === request.attempt &&
          authority.native_session_handle === request.nativeSessionHandle &&
          authority.scope_digest === anchor.binding.work_source_revision &&
          authority.config_digest === anchor.binding.config_digest &&
          authority.workflow_id === anchor.binding.workflow_id &&
          authority.user_instruction_ref === approval.record_id &&
          approval.principal === `local-session:${canonicalJsonDigest(request.nativeSessionHandle)}` &&
          same([...authority.implementation_paths].sort(), [...work.binding.implementation_paths].sort()),
        'retained human permission, owner or exact Source scope differs',
      );
      requireRecovery(access.readBytes(requestPath, 'recovery request stability').equals(bytes), 'request changed');
    };
    if (request.mode === 'inspect') {
      const captured = store.readWorkSessionSnapshot(request.identity, request.attempt);
      const host = captured.host;
      const journal = captured.journal;
      const configured = store.readConfiguredFrontierRecoveryView(request.identity, request.attempt);
      requireRecovery(
        host.work !== null && host.ledger !== null && journal !== null && configured !== null,
        'original work unavailable',
      );
      validateFailedPrewriterRecoveryBasis({
        original: configured.original,
        work: host.work,
        ledger: host.ledger,
        journal: journal.state,
        nativeSessionHandle: request.nativeSessionHandle,
        now: Date.now(),
      });
      verifyCurrent(host.work, journal.state, configured.original);
      return {
        status: 'failed_prewriter_owner_recovery_ready',
        request: {
          ...recoveryRequestEnvelope(request),
          expectedWork: host.workVersion,
          expectedLedger: host.ledgerVersion,
          expectedJournal: journal.version,
          expectedMaintenanceGeneration: host.maintenanceGeneration,
        },
        rights_granted: false,
        runtime_accepted: false,
      };
    }
    const result = store.recoverFailedPrewriterOwner({ ...recoveryRequestEnvelope(request), verifyCurrent });
    return {
      status: 'failed_prewriter_owner_recovered',
      work_version: result.workVersion,
      ledger_version: result.ledgerVersion,
      journal_version: result.journalVersion,
      failed_reports_preserved: true,
      source_bindings_changed: false,
      rights_granted: false,
      runtime_accepted: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
