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
import {
  compareScopedSourceSnapshots,
  parseScopedSourceSnapshot,
  snapshotDeclaredSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { resolveCurrentTaskSourceFileRoot } from '../src/orchestration/task-source-binding.ts';
import type {
  ExpiredIssuedSourceReportRecoveryRequest,
  ExpiredIssuedSourceReportRecoveryState,
} from '../src/orchestration/expired-issued-source-report-recovery.ts';
import type { WorkIdentity } from '../src/host-state.ts';

type RecoveryBase = {
  readonly schema: 'IssuedSourceReportRecoveryRequest/v1';
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly actionId: string;
  readonly issueId: string;
  readonly hostAttemptId: string;
  readonly nativeSessionHandle: string;
  readonly leaseGeneration: number;
  readonly reportPath: string;
  readonly decisionPointer: string;
};
type InspectRecoveryRequest = RecoveryBase;
type ApplyRecoveryRequest = RecoveryBase & {
  readonly expectedWork: { readonly revision: number; readonly digest: string };
  readonly expectedLedger: { readonly revision: number; readonly digest: string };
  readonly expectedJournal: { readonly revision: number; readonly digest: string };
  readonly expectedMaintenanceGeneration: number;
};
type RecoveryRequest = InspectRecoveryRequest | ApplyRecoveryRequest;

function requireRecovery(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(`issued Source report recovery: ${message}`);
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
function isStateVersion(value: unknown): value is { readonly revision: number; readonly digest: string } {
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
    value.schema === 'IssuedSourceReportRecoveryRequest/v1' &&
    Number.isSafeInteger(value.attempt) &&
    Number(value.attempt) > 0 &&
    isWorkIdentity(value.identity) &&
    typeof value.actionId === 'string' &&
    value.actionId.length > 0 &&
    value.actionId.length <= 256 &&
    typeof value.issueId === 'string' &&
    value.issueId.length > 0 &&
    value.issueId.length <= 256 &&
    typeof value.hostAttemptId === 'string' &&
    value.hostAttemptId.length > 0 &&
    value.hostAttemptId.length <= 256 &&
    typeof value.nativeSessionHandle === 'string' &&
    value.nativeSessionHandle.length > 0 &&
    value.nativeSessionHandle.length <= 256 &&
    Number.isSafeInteger(value.leaseGeneration) &&
    Number(value.leaseGeneration) >= 0 &&
    typeof value.reportPath === 'string' &&
    value.reportPath.length > 0 &&
    value.reportPath.length <= 512 &&
    !value.reportPath.includes('\\') &&
    !value.reportPath.startsWith('/') &&
    !/^[A-Za-z]:/.test(value.reportPath) &&
    value.reportPath.split('/').every((part: string) => part.length > 0 && part !== '.' && part !== '..') &&
    typeof value.decisionPointer === 'string' &&
    value.decisionPointer.length > 0 &&
    value.decisionPointer.length <= 2048
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
      ? 'actionId,attempt,decisionPointer,hostAttemptId,identity,issueId,leaseGeneration,nativeSessionHandle,reportPath,schema'
      : 'actionId,attempt,decisionPointer,expectedJournal,expectedLedger,expectedMaintenanceGeneration,expectedWork,hostAttemptId,identity,issueId,leaseGeneration,nativeSessionHandle,reportPath,schema';
  requireRecovery(
    hasRecoveryEnvelopeShape(value, expectedKeys) && hasRecoveryBaseFields(value),
    'request shape or owner invalid',
  );
  const base: RecoveryBase = {
    schema: value.schema,
    identity: value.identity,
    attempt: value.attempt,
    actionId: value.actionId,
    issueId: value.issueId,
    hostAttemptId: value.hostAttemptId,
    nativeSessionHandle: value.nativeSessionHandle,
    leaseGeneration: value.leaseGeneration,
    reportPath: value.reportPath,
    decisionPointer: value.decisionPointer,
  };
  if (mode === 'inspect') return base;
  requireRecovery(hasRecoveryApplyVersions(value), 'expected Host and Journal versions invalid');
  return {
    ...base,
    expectedWork: value.expectedWork,
    expectedLedger: value.expectedLedger,
    expectedJournal: value.expectedJournal,
    expectedMaintenanceGeneration: value.expectedMaintenanceGeneration,
  };
}
function recoveryRequestEnvelope(request: RecoveryRequest): RecoveryBase {
  const {
    expectedWork: _work,
    expectedLedger: _ledger,
    expectedJournal: _journal,
    expectedMaintenanceGeneration: _generation,
    ...envelope
  } = request as ApplyRecoveryRequest;
  return envelope;
}

export function recoverIssuedSourceReport(args: readonly string[]) {
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
  const bytes = access.readBytes(requestPath, 'issued Source report recovery request');
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
  const reportBytes = access.readBytes(request.reportPath, 'issued Source report artifact');
  requireRecovery(reportBytes.length > 0 && reportBytes.length <= 65536, 'report artifact exceeds bound');
  const report: unknown = JSON.parse(reportBytes.toString('utf8'));
  const database = openCliWorkspaceDatabase(root, file, workspaceId, mode === 'inspect');
  try {
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const captured = store.readWorkSessionSnapshot(request.identity, request.attempt);
    const host = captured.host;
    const journal = captured.journal;
    requireRecovery(
      host.work !== null &&
        host.work.lease !== null &&
        host.ledger !== null &&
        journal !== null &&
        journal.state.source_scope != null,
      'original work or journal Source scope unavailable',
    );
    const sourceRoot = resolveCurrentTaskSourceFileRoot({
      store,
      host,
      canonicalHostRoot: root,
      attempt: request.attempt,
    });
    const sourceAccess = requireSafeRepositoryAccess(sourceRoot);
    const priorScope = parseScopedSourceSnapshot(journal.state.source_scope);
    const sourceScope = snapshotDeclaredSources(
      sourceAccess,
      priorScope.entries.map((entry) => entry.path),
    );
    const verifyCurrent = (
      _request: ExpiredIssuedSourceReportRecoveryRequest,
      state: ExpiredIssuedSourceReportRecoveryState,
    ): unknown => {
      const work = state.host.work;
      requireRecovery(work !== null, 'recovery Work unavailable');
      requireRecovery(
        runtimeConfigDigest(loadRuntimeConfig(root)) === work.binding.config_digest &&
          state.journal.state.source_scope != null &&
          same(parseScopedSourceSnapshot(state.journal.state.source_scope).digest, priorScope.digest) &&
          same(
            snapshotDeclaredSources(
              sourceAccess,
              parseScopedSourceSnapshot(state.journal.state.source_scope).entries.map((entry) => entry.path),
            ).digest,
            sourceScope.digest,
          ) &&
          same(JSON.parse(access.readBytes(request.reportPath, 'report stability').toString('utf8')), report),
        'current configuration, Source scope, or report artifact differs',
      );
      return {
        schema: 'IssuedSourceReportRecoveryProof/v1',
        config_digest: work.binding.config_digest,
        report_digest: canonicalJsonDigest(report),
        source_scope_digest: sourceScope.digest,
      };
    };
    const base = {
      schema: 'ExpiredIssuedSourceReportRecoveryRequest/v1' as const,
      identity: request.identity,
      attempt: request.attempt,
      actionId: request.actionId,
      issueId: request.issueId,
      hostAttemptId: request.hostAttemptId,
      nativeSessionHandle: request.nativeSessionHandle,
      leaseGeneration: request.leaseGeneration,
      observation: report,
      sourceScope,
      decisionPointer: request.decisionPointer,
    };
    if (mode === 'inspect') {
      const inspection = store.inspectExpiredIssuedSourceReport(base);
      return {
        status: 'issued_source_report_recovery_ready',
        inspection,
        request: {
          ...recoveryRequestEnvelope(request),
          expectedWork: inspection.expected_work,
          expectedLedger: inspection.expected_ledger,
          expectedJournal: inspection.expected_journal,
          expectedMaintenanceGeneration: inspection.expected_maintenance_generation,
        },
        rights_granted: false,
        runtime_accepted: false,
      };
    }
    if (mode === 'apply') {
      const applyRequest = request as ApplyRecoveryRequest;
      requireRecovery(
        same(applyRequest.expectedWork, captured.host.workVersion) &&
          same(applyRequest.expectedLedger, captured.host.ledgerVersion) &&
          same(applyRequest.expectedJournal, journal.version) &&
          applyRequest.expectedMaintenanceGeneration === captured.host.maintenanceGeneration,
        'expected Host or Journal versions differ',
      );
      // The retained Host attempt must already hold the unmarked native outcome;
      // this route only records the marked Journal observation and never seeds it.
      const result = store.commitExpiredIssuedSourceReport(
        {
          ...base,
          expectedWork: applyRequest.expectedWork,
          expectedLedger: applyRequest.expectedLedger,
          expectedJournal: applyRequest.expectedJournal,
          expectedMaintenanceGeneration: applyRequest.expectedMaintenanceGeneration,
        },
        verifyCurrent,
      );
      return {
        status: 'issued_source_report_recovered',
        work_version: result.workVersion,
        ledger_version: result.ledgerVersion,
        journal_version: result.journalVersion,
        changed_paths: compareScopedSourceSnapshots(priorScope, sourceScope)
          .map((change) => change.path)
          .sort(),
        rights_granted: false,
        runtime_accepted: false,
      };
    }
    throw Error('issued Source report recovery: mode invalid');
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
