import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimePackageCodePaths } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';

import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { sessionHandoffDatabasePath } from '../src/config/project-paths.ts';
import { readAdmittedSessionIntakeForWork } from '../src/orchestration/admitted-session-execution.ts';
import {
  readInitialSourceContinuationLineageView,
  validateInitialSourceContinuationLineage,
  acceptedSourceAuthorizationRevision,
} from '../src/orchestration/admitted-development-packet.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
import { mastraLedgerStatus } from '../src/orchestration/persistent-session-handoff.ts';
import {
  snapshotDeclaredSources,
  snapshotRuntimeManifestSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import { validateCompletedSourceReportRecoveryCurrentWorkJoin } from '../src/orchestration/completed-source-report-recovery.ts';
import {
  readInitialSourceContinuationSessionEngineSnapshot,
  readConfiguredContinuationSessionEngineSnapshot,
} from '../src/orchestration/session-engine-snapshot.ts';
import {
  validateQualifiedRuntimeCodeContinuationRequest,
  validateQualifiedRuntimeCodeContinuationState,
  validateQualifiedRuntimeCodeEndpoints,
  refreshQualifiedRuntimeCodePreparedPlan,
} from '../src/orchestration/qualified-runtime-code-continuation.ts';
import { currentNativeSelfAttestation } from './runtime-config-rebind.mjs';
import { verifyQualifiedRuntimeCodeEndpoints } from './recover-completed-source-report.mjs';
import { runtimeManifestExecutableInventory } from '../tooling/maintained-source-inventory.ts';
/** @typedef {import('../src/config/safe-repository-access.ts').SafeRepositoryAccess} SafeRepositoryAccess */
/** @typedef {import('../src/config/runtime-config.ts').AgentRuntimeConfig} AgentRuntimeConfig */
/** @typedef {import('../src/host-state.ts').HostStateStore} HostStateStore */
/** @typedef {import('../src/host-state.ts').WorkIdentity} WorkIdentity */
/** @typedef {import('../src/host-state.ts').HostStateSnapshot} HostStateSnapshot */
/** @typedef {import('../src/host-state.ts').WorkSessionJournalSnapshot} WorkSessionJournalSnapshot */
/** @typedef {import('../src/orchestration/qualified-runtime-code-continuation.ts').QualifiedRuntimeCodeContinuationRequest} QualifiedRequest */
/** @typedef {import('../src/orchestration/qualified-runtime-code-continuation.ts').QualifiedRuntimeCodeEndpoints} QualifiedEndpoints */
/** @typedef {import('../src/orchestration/admitted-development-packet.ts').InitialSourceContinuationLineageView} InitialLineage */
/** @typedef {import('../src/orchestration/failed-prewriter-transition.ts').ConfiguredFrontierRecoveryView} ConfiguredLineage */
/** @typedef {import('../src/orchestration/persistent-session-handoff.ts').MastraSessionLedgerState} MastraSessionLedgerState */
import { parseWorkItemSelection } from './continue-initial-source.mjs';
/** @type {(condition: unknown, message: string) => asserts condition} */
const requireContinuation = (value, message) => {
  if (!value) throw new Error('qualified runtime code continuation: ' + message);
};
/** @param {unknown} left @param {unknown} right */
const same = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
/** @param {string | Uint8Array} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {Record<string, string>} values @param {string} key */
function requiredOption(values, key) {
  const value = values[key];
  requireContinuation(typeof value === 'string' && value.length > 0, `missing ${key}`);
  return value;
}
/** @param {SafeRepositoryAccess} access @param {string} ref @param {string} label */
function json(access, ref, label) {
  const bytes = access.readBytes(ref, label);
  requireContinuation(bytes.length > 0 && bytes.length <= 64 * 1024 * 1024, 'reference size invalid');
  /** @type {unknown} */
  const value = JSON.parse(bytes.toString('utf8'));
  return { bytes, value };
}
/** @param {unknown} value @returns {readonly unknown[]} */
function nativeManifestInputs(value) {
  requireContinuation(
    isPlainRecord(value) && Array.isArray(value.inputs),
    'native manifest input inventory is invalid',
  );
  return value.inputs;
}
/** @param {unknown} value @returns {string} */
function systemUpdateOperationId(value) {
  requireContinuation(
    isPlainRecord(value) && typeof value.operation_id === 'string',
    'system update operation ID is invalid',
  );
  return value.operation_id;
}
/** @param {HostStateStore} store @param {WorkIdentity} identity @param {number} attempt */
function state(store, identity, attempt) {
  const snapshot = store.readWorkSessionSnapshot(identity, attempt);
  return { host: snapshot.host, journal: snapshot.journal };
}

/** @param {import('../src/host-state.ts').WorkState} work @param {MastraSessionLedgerState} journal @param {NonNullable<HostStateSnapshot['work']>['lifecycle']['references'][number]} authorityRef @param {InitialLineage | null} initial @param {ConfiguredLineage | null} configured */
function acceptedSourceOrigin(work, journal, authorityRef, initial, configured) {
  if (initial) return acceptedSourceAuthorizationRevision(work, journal, authorityRef, initial);
  requireContinuation(configured, 'configured continuation evidence unavailable');
  return acceptedSourceAuthorizationRevision(work, journal, authorityRef, configured);
}

/** @param {QualifiedRequest} candidate @param {QualifiedRequest} request @param {Buffer | undefined} planBytes @param {SafeRepositoryAccess} access @param {string} relative */
function requireStableQualifiedRequest(candidate, request, planBytes, access, relative) {
  requireContinuation(
    same(candidate, request) && (!planBytes || access.readBytes(relative, 'frozen plan stability').equals(planBytes)),
    'frozen code adoption request changed',
  );
}

/** @param {import('../src/orchestration/session-engine-snapshot.ts').SessionEngineBinding} binding @param {{readonly version: import('../src/host-state.ts').StateVersion; readonly state: MastraSessionLedgerState}} journal @param {HostStateSnapshot} host @param {import('../src/host-state.ts').WorkState} work @param {InitialLineage | null} initial @param {ConfiguredLineage | null} configured */
function verifyContinuationEngineSnapshot(binding, journal, host, work, initial, configured) {
  if (initial) {
    requireContinuation(initial.completedSourceReportRecovery, 'completed original Source report unavailable');
    validateInitialSourceContinuationLineage(
      work,
      initial.receipt,
      journal.state,
      initial.frontierCodeRebind,
      initial.completedSourceReportRecovery,
      initial.runtimeCodeContinuations,
    );
    validateCompletedSourceReportRecoveryCurrentWorkJoin(
      host,
      journal,
      initial.receipt,
      initial.frontierCodeRebind,
      initial.completedSourceReportRecovery,
    );
    readInitialSourceContinuationSessionEngineSnapshot(
      binding,
      initial.receipt,
      { ...journal, resume_status: mastraLedgerStatus(journal.state) },
      host,
      initial.frontierCodeRebind,
      initial.completedSourceReportRecovery,
    );
    return;
  }
  requireContinuation(configured, 'configured continuation evidence unavailable');
  readConfiguredContinuationSessionEngineSnapshot(
    binding,
    configured.original,
    configured.recovery,
    configured.runtimeCodeContinuations,
  );
}

/** Existing code-rebind owner; adoption never starts or reissues a workflow action. */
/** @param {Record<string, string>} values */
export async function runQualifiedRuntimeCodeContinuation(values) {
  if (requiredOption(values, '--mode') === 'inspect') return runQualifiedRuntimeCodeContinuationLocked(values);
  const access = requireSafeRepositoryAccess(requiredOption(values, '--project-root')),
    directory = '.agent/work/' + requiredOption(values, '--repair-id');
  if (requiredOption(values, '--mode') === 'plan') access.ensureDirectory(directory, 'qualified code plan owner');
  else access.assertDirectory(directory, 'existing qualified code plan owner');
  return access.withExclusiveLockAsync(
    directory + '/.qualified-code-plan-owner',
    'qualified code plan/apply owner',
    () => runQualifiedRuntimeCodeContinuationLocked(values),
  );
}
/** @param {QualifiedRequest | import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryRequest | undefined} endpoint @param {ConfiguredLineage | null} configured @param {AgentRuntimeConfig} config @param {unknown} parentManifest @param {string} parentManifestRef @param {string} parentInstallRef @returns {readonly string[] | undefined} */
function qualifiedOldRuntimePaths(endpoint, configured, config, parentManifest, parentManifestRef, parentInstallRef) {
  let oldPaths = endpoint?.currentRuntimeCodePaths;
  if (!oldPaths && configured) {
    const sourceTransition =
      configured.recovery?.request.sourceTransition.transition ??
      configured.original.request.sourceTransition.transition;
    oldPaths = runtimeManifestExecutableInventory(nativeManifestInputs(parentManifest)).map(
      (file) => config.runtime.bundle + '/' + file,
    );
    requireContinuation(
      sourceTransition.schema === 'ConfiguredRuntimeEndpointTransition/v1' &&
        sourceTransition.successor_manifest_ref === parentManifestRef &&
        sourceTransition.system_update_ref === parentInstallRef,
      'configured parent native endpoint differs',
    );
  }
  return oldPaths;
}

/** @param {Record<string, string>} values */
async function runQualifiedRuntimeCodeContinuationLocked(values) {
  const root = requiredOption(values, '--project-root'),
    mode = requiredOption(values, '--mode'),
    repairId = requiredOption(values, '--repair-id');
  const config = loadRuntimeConfig(root),
    access = requireSafeRepositoryAccess(root);
  const applying = mode === 'apply',
    refreshing = mode === 'refresh',
    database = openCliWorkspaceDatabase(
      root,
      sessionHandoffDatabasePath(root, config),
      deriveWorkspaceId(config.repository.repository_id, root),
      !applying && !refreshing,
    );
  const relative = '.agent/work/' + repairId + '/qualified-runtime-code-continuation-plan.v1.json';
  try {
    const store = createCliHostStateStore(
      database,
      deriveWorkspaceId(config.repository.repository_id, root),
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    );
    /** @type {QualifiedRequest} */
    let request;
    /** @type {Buffer | undefined} */
    let planBytes;
    if (applying) {
      const saved = json(access, relative, 'frozen qualified code continuation plan');
      planBytes = saved.bytes;
      request = validateQualifiedRuntimeCodeContinuationRequest(saved.value);
    } else {
      const project = loadProjectSetContext(
        root,
        config,
        config.repository.repository_id,
        requiredOption(values, '--projects').split(','),
      );
      const identity = {
          repository_id: project.repository_id,
          project_ids: project.project_ids,
          integrations_digest: project.integrations_digest,
          work_id: requiredOption(values, '--work-id'),
        },
        attempt = Number(requiredOption(values, '--attempt'));
      const current = state(store, identity, attempt),
        work = current.host.work;
      requireContinuation(work?.lease && current.journal, 'original owner and Journal unavailable');
      requireContinuation(current.journal.state.source_scope, 'original Journal Source scope unavailable');
      const parent = json(access, requiredOption(values, '--parent-manifest'), 'parent native manifest'),
        target = json(access, requiredOption(values, '--successor-manifest'), 'current native manifest'),
        self = currentNativeSelfAttestation();
      requireContinuation(self, 'current native self-attestation unavailable');
      const history = store.readQualifiedRuntimeCodeContinuations(identity, attempt),
        initial = readInitialSourceContinuationLineageView(store, identity, attempt),
        configured = store.readConfiguredFrontierRecoveryView(identity, attempt);
      const endpoint = history.at(-1)?.request ?? initial?.completedSourceReportRecovery?.record.request,
        oldPaths = qualifiedOldRuntimePaths(
          endpoint,
          configured,
          config,
          parent.value,
          requiredOption(values, '--parent-manifest'),
          requiredOption(values, '--parent-install'),
        );
      requireContinuation(
        oldPaths && (!initial || initial.completedSourceReportRecovery),
        'existing completed or configured continuation is required',
      );
      if (endpoint)
        requireContinuation(
          endpoint.currentManifestRef === requiredOption(values, '--parent-manifest') &&
            endpoint.currentInstallRef === requiredOption(values, '--parent-install'),
          'parent endpoint differs from adopted history',
        );
      const currentPaths = [...runtimePackageCodePaths(config.runtime.bundle)].sort();
      const update = json(access, requiredOption(values, '--system-update'), 'current system update').value;
      request = validateQualifiedRuntimeCodeContinuationRequest({
        schema: 'QualifiedRuntimeCodeContinuationRequest/v1',
        identity,
        attempt,
        nativeSessionHandle: work.lease.thread_id,
        leaseGeneration: work.lease.generation,
        expectedWork: current.host.workVersion,
        expectedLedger: current.host.ledgerVersion,
        expectedJournal: current.journal.version,
        expectedMaintenanceGeneration: current.host.maintenanceGeneration,
        originalSourceScopeDigest: work.binding.work_source_revision,
        journalSourceScopeDigest: current.journal.state.source_scope.digest,
        oldRuntimeCodeDigest: work.binding.runtime_code_digest,
        currentRuntimeCodeDigest: snapshotRuntimeManifestSources(target.value, config.runtime.bundle, currentPaths)
          .digest,
        oldRuntimeCodePaths: [...oldPaths].sort(),
        currentRuntimeCodePaths: currentPaths,
        oldManifestRef: requiredOption(values, '--parent-manifest'),
        oldManifestDigest: sha(parent.bytes),
        oldInstallRef: requiredOption(values, '--parent-install'),
        currentManifestRef: requiredOption(values, '--successor-manifest'),
        currentManifestDigest: sha(target.bytes),
        currentInstallRef: requiredOption(values, '--system-update'),
        systemUpdateRef: requiredOption(values, '--system-update'),
        systemUpdateOperationId: systemUpdateOperationId(update),
        nativeSelfAttestationDigest: canonicalJsonDigest(self),
      });
    }
    const project = loadProjectSetContext(root, config, request.identity.repository_id, request.identity.project_ids);
    requireContinuation(
      same(request.identity, {
        repository_id: project.repository_id,
        project_ids: project.project_ids,
        integrations_digest: project.integrations_digest,
        work_id: request.identity.work_id,
      }),
      'project context differs',
    );
    const cachedInitial = readInitialSourceContinuationLineageView(store, request.identity, request.attempt),
      cachedConfigured = store.readConfiguredFrontierRecoveryView(request.identity, request.attempt);
    /** @param {QualifiedRequest} candidate @param {HostStateSnapshot} host @param {{readonly version: import('../src/host-state.ts').StateVersion; readonly state: MastraSessionLedgerState}} journal @param {{readonly initial: InitialLineage['receipt'] | null; readonly frontier: import('../src/orchestration/initial-source-frontier-code-rebind.ts').InitialSourceFrontierCodeRebindReceipt | null; readonly completed: import('../src/orchestration/completed-source-report-recovery.ts').CompletedSourceReportRecoveryReceipt | null; readonly configured: ConfiguredLineage | null} | undefined} lineage */
    const verify = (candidate, host, journal, lineage) => {
      requireStableQualifiedRequest(candidate, request, planBytes, access, relative);
      const work = validateQualifiedRuntimeCodeContinuationState(candidate, host, journal),
        initial = lineage
          ? lineage.initial
            ? {
                receipt: lineage.initial,
                frontierCodeRebind: lineage.frontier,
                completedSourceReportRecovery: lineage.completed,
                ...(host.runtimeCodeContinuations ? { runtimeCodeContinuations: host.runtimeCodeContinuations } : {}),
              }
            : null
          : cachedInitial,
        configured = lineage
          ? lineage.configured
            ? {
                ...lineage.configured,
                ...(host.runtimeCodeContinuations ? { runtimeCodeContinuations: host.runtimeCodeContinuations } : {}),
              }
            : null
          : cachedConfigured;
      requireContinuation(Boolean(initial) !== Boolean(configured), 'exact historical continuation unavailable');
      const authorityRef = work.lifecycle.references.find(
        (ref) =>
          ref.kind === 'execution_approval' &&
          ref.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
          ref.disposition === 'current' &&
          ref.decision === 'approved',
      );
      requireContinuation(authorityRef, 'original human Source authority unavailable');
      const retained = readLocalSourceWriteAuthorization(root, authorityRef.path),
        authority = retained.authorization;
      const origin = acceptedSourceOrigin(work, journal.state, authorityRef, initial, configured);
      requireContinuation(
        retained.sha256 === authorityRef.sha256 &&
          authority.scope_digest === origin &&
          authority.work_id === candidate.identity.work_id &&
          authority.attempt === candidate.attempt &&
          authority.native_session_handle === candidate.nativeSessionHandle &&
          same([...authority.implementation_paths].sort(), [...work.binding.implementation_paths].sort()),
        'original human permission or implementation scope differs',
      );
      const intake = readAdmittedSessionIntakeForWork(root, work),
        item = parseWorkItemSelection(intake.work_item, work.binding.team_id);
      const runId = work.execution.run_id;
      requireContinuation(typeof runId === 'string' && runId.length > 0, 'original workflow run ID unavailable');
      const binding = {
        repositoryRoot: root,
        config,
        selection: {
          team: work.binding.team_id,
          kind: item.kind,
          intent: item.intent,
          project: item.project,
          risk_flags: item.risk_flags,
          labels: item.labels,
        },
        context: {
          work_id: candidate.identity.work_id,
          attempt: candidate.attempt,
          scope_digest: work.binding.work_source_revision,
        },
        workflowId: work.binding.workflow_id,
        runId,
        lifecycleRisk: work.lifecycle.risk,
      };
      verifyContinuationEngineSnapshot(binding, journal, host, work, initial, configured);
      requireContinuation(journal.state.source_scope, 'Journal Source scope unavailable');
      requireContinuation(
        same(
          snapshotDeclaredSources(
            access,
            journal.state.source_scope.entries.map((entry) => entry.path),
          ),
          journal.state.source_scope,
        ),
        'Source drift requires separate adoption',
      );
      return validateQualifiedRuntimeCodeEndpoints(
        verifyQualifiedRuntimeCodeEndpoints(root, config, access, candidate),
        candidate,
      );
    };
    let receipt = null;
    if (applying) receipt = store.commitQualifiedRuntimeCodeContinuation(request, verify);
    else {
      const current = state(store, request.identity, request.attempt);
      requireContinuation(current.journal, 'current Journal unavailable');
      verify(request, current.host, current.journal, undefined);
      if (refreshing) {
        await refreshQualifiedRuntimeCodePreparedPlan({
          access,
          store,
          relative,
          request,
          expectedRequestId: requiredOption(values, '--expected-request-id'),
          verifyCurrent: () => {
            requireContinuation(current.journal, 'current Journal unavailable');
            requireContinuation(current.journal.state.source_scope, 'current Journal Source scope unavailable');
            const source = snapshotDeclaredSources(
              access,
              current.journal.state.source_scope.entries.map((entry) => entry.path),
            );
            requireContinuation(
              same(source, current.journal.state.source_scope),
              'prepared refresh Source changed before replacement',
            );
            validateQualifiedRuntimeCodeEndpoints(
              verifyQualifiedRuntimeCodeEndpoints(root, config, access, request),
              request,
            );
          },
        });
      }
      if (mode === 'plan') {
        const encoded = JSON.stringify(request, null, 2) + '\n';
        if (access.fileExists(relative, 'qualified code plan presence'))
          requireContinuation(
            access.readBytes(relative, 'existing code plan').equals(Buffer.from(encoded)),
            'plan exists with different inputs',
          );
        else {
          access.ensureDirectory(path.posix.dirname(relative), 'qualified code plan owner');
          access.writeExclusive(relative, encoded, 'freeze qualified code continuation');
        }
      }
    }
    const current = state(store, request.identity, request.attempt);
    requireContinuation(current.journal, 'current Journal unavailable');
    return {
      schema: 'QualifiedRuntimeCodeContinuationResult/v1',
      status: receipt
        ? 'qualified_runtime_code_adopted'
        : ['plan', 'refresh'].includes(mode)
          ? 'qualified_runtime_code_planned'
          : 'qualified_runtime_code_ready',
      request_id: canonicalJsonDigest(request),
      work_version: current.host.workVersion,
      ledger_version: current.host.ledgerVersion,
      journal_version: current.journal.version,
      next_action: receipt
        ? { kind: 'inspect', work_id: request.identity.work_id, attempt: request.attempt }
        : ['plan', 'refresh'].includes(mode)
          ? { kind: 'apply', repair_id: repairId }
          : { kind: 'plan', repair_id: repairId },
      rights_granted: false,
      accepted_result: false,
      runtime_acceptance: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
