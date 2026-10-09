import path from 'node:path';
import { createHash } from 'node:crypto';
import { Database } from 'bun:sqlite';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimePackageCodePaths } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { HostStateStore } from '../src/host-state.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { sessionHandoffDatabasePath } from '../src/orchestration/persistent-session-handoff.ts';
import { readAdmittedSessionIntakeForWork } from '../src/orchestration/admitted-session-execution.ts';
import {
  readInitialSourceContinuationLineageView,
  validateInitialSourceContinuationLineage,
  acceptedSourceAuthorizationRevision,
} from '../src/orchestration/admitted-development-packet.ts';
import { readLocalSourceWriteAuthorization } from '../src/orchestration/local-source-authorization.ts';
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
  validateQualifiedRuntimeCodePreparedPlanRefresh,
} from '../src/orchestration/qualified-runtime-code-continuation.ts';
import { currentNativeSelfAttestation } from './runtime-config-rebind.mjs';
import { verifyQualifiedRuntimeCodeEndpoints } from './recover-completed-source-report.mjs';
import { runtimeManifestExecutableInventory } from '../tooling/maintained-source-inventory.mjs';
const requireContinuation = (value, message) => {
  if (!value) throw new Error('qualified runtime code continuation: ' + message);
};
const same = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
function json(access, ref, label) {
  const bytes = access.readBytes(ref, label);
  requireContinuation(bytes.length > 0 && bytes.length <= 64 * 1024 * 1024, 'reference size invalid');
  return { bytes, value: JSON.parse(bytes.toString('utf8')) };
}
function state(store, identity, attempt) {
  return { host: store.readHostStateSnapshot(identity), journal: store.readWorkSessionJournal(identity) };
}

/** Existing code-rebind owner; adoption never starts or reissues a workflow action. */
export async function runQualifiedRuntimeCodeContinuation(values) {
  if (values['--mode'] === 'inspect') return runQualifiedRuntimeCodeContinuationLocked(values);
  const access = requireSafeRepositoryAccess(values['--project-root']),
    directory = '.agent/work/' + values['--repair-id'];
  if (values['--mode'] === 'plan') access.ensureDirectory(directory, 'qualified code plan owner');
  else access.assertDirectory(directory, 'existing qualified code plan owner');
  return access.withExclusiveLockAsync(
    directory + '/.qualified-code-plan-owner',
    'qualified code plan/apply owner',
    () => runQualifiedRuntimeCodeContinuationLocked(values),
  );
}
async function runQualifiedRuntimeCodeContinuationLocked(values) {
  const root = values['--project-root'],
    mode = values['--mode'],
    repairId = values['--repair-id'];
  const config = loadRuntimeConfig(root),
    access = requireSafeRepositoryAccess(root);
  const applying = mode === 'apply',
    refreshing = mode === 'refresh',
    database = new Database(sessionHandoffDatabasePath(root, config), {
      readonly: !applying && !refreshing,
      strict: true,
    });
  const relative = '.agent/work/' + repairId + '/qualified-runtime-code-continuation-plan.v1.json';
  try {
    const store = new HostStateStore(
      database,
      deriveWorkspaceId(config.repository.repository_id, root),
      undefined,
      undefined,
      undefined,
      undefined,
      root,
    );
    let request, planBytes;
    if (applying) {
      const saved = json(access, relative, 'frozen qualified code continuation plan');
      planBytes = saved.bytes;
      request = validateQualifiedRuntimeCodeContinuationRequest(saved.value);
    } else {
      const project = loadProjectSetContext(
        root,
        config,
        config.repository.repository_id,
        values['--projects'].split(','),
      );
      const identity = {
          repository_id: project.repository_id,
          project_ids: project.project_ids,
          integrations_digest: project.integrations_digest,
          work_id: values['--work-id'],
        },
        attempt = Number(values['--attempt']);
      const current = state(store, identity, attempt),
        work = current.host.work;
      requireContinuation(work?.lease && current.journal, 'original owner and Journal unavailable');
      const parent = json(access, values['--parent-manifest'], 'parent native manifest'),
        target = json(access, values['--successor-manifest'], 'current native manifest'),
        self = currentNativeSelfAttestation();
      requireContinuation(self, 'current native self-attestation unavailable');
      const history = store.readQualifiedRuntimeCodeContinuations(identity, attempt),
        initial = readInitialSourceContinuationLineageView(store, identity, attempt),
        configured = store.readConfiguredFrontierRecoveryView(identity, attempt);
      const endpoint = history.at(-1)?.request ?? initial?.completedSourceReportRecovery?.record.request;
      let oldPaths = endpoint?.currentRuntimeCodePaths;
      if (!oldPaths && configured) {
        const sourceTransition =
          configured.recovery?.request.sourceTransition.transition ??
          configured.original.request.sourceTransition.transition;
        oldPaths = runtimeManifestExecutableInventory(parent.value.inputs).map(
          (file) => config.runtime.bundle + '/' + file,
        );
        requireContinuation(
          sourceTransition.successor_manifest_ref === values['--parent-manifest'] &&
            sourceTransition.system_update_ref === values['--parent-install'],
          'configured parent native endpoint differs',
        );
      }
      requireContinuation(
        oldPaths && (!initial || initial.completedSourceReportRecovery),
        'existing completed or configured continuation is required',
      );
      if (endpoint)
        requireContinuation(
          endpoint.currentManifestRef === values['--parent-manifest'] &&
            endpoint.currentInstallRef === values['--parent-install'],
          'parent endpoint differs from adopted history',
        );
      const currentPaths = [...runtimePackageCodePaths(config.runtime.bundle)].sort();
      const update = json(access, values['--system-update'], 'current system update').value;
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
        oldManifestRef: values['--parent-manifest'],
        oldManifestDigest: sha(parent.bytes),
        oldInstallRef: values['--parent-install'],
        currentManifestRef: values['--successor-manifest'],
        currentManifestDigest: sha(target.bytes),
        currentInstallRef: values['--system-update'],
        systemUpdateRef: values['--system-update'],
        systemUpdateOperationId: update.operation_id,
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
    const verify = (candidate, host, journal, lineage) => {
      requireContinuation(
        same(candidate, request) &&
          (!planBytes || access.readBytes(relative, 'frozen plan stability').equals(planBytes)),
        'frozen code adoption request changed',
      );
      const work = validateQualifiedRuntimeCodeContinuationState(candidate, host, journal),
        initial = lineage
          ? lineage.initial
            ? {
                receipt: lineage.initial,
                frontierCodeRebind: lineage.frontier,
                completedSourceReportRecovery: lineage.completed,
                runtimeCodeContinuations: host.runtimeCodeContinuations,
              }
            : null
          : cachedInitial,
        configured = lineage
          ? lineage.configured
            ? { ...lineage.configured, runtimeCodeContinuations: host.runtimeCodeContinuations }
            : null
          : cachedConfigured;
      requireContinuation(Boolean(initial) !== Boolean(configured), 'exact historical continuation unavailable');
      const view = initial ?? configured,
        authorityRef = work.lifecycle.references.find(
          (ref) =>
            ref.kind === 'execution_approval' &&
            ref.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
            ref.disposition === 'current' &&
            ref.decision === 'approved',
        );
      requireContinuation(authorityRef, 'original human Source authority unavailable');
      const retained = readLocalSourceWriteAuthorization(root, authorityRef.path),
        authority = retained.authorization;
      const origin = acceptedSourceAuthorizationRevision(work, journal.state, authorityRef, view);
      requireContinuation(
        retained.sha256 === authorityRef.sha256 &&
          authority.scope_digest === origin &&
          authority.work_id === candidate.identity.work_id &&
          authority.attempt === candidate.attempt &&
          authority.native_session_handle === candidate.nativeSessionHandle &&
          same([...authority.implementation_paths].sort(), [...work.binding.implementation_paths].sort()),
        'original human permission or implementation scope differs',
      );
      const intake = readAdmittedSessionIntakeForWork(root, work, view),
        item = intake.work_item;
      const binding = {
        repositoryRoot: root,
        config,
        selection: {
          team: work.binding.team_id,
          kind: item.canonical_kind,
          intent: item.intent,
          project: item.project_id,
          risk_flags: item.risk_flags,
          labels: item.labels,
        },
        context: {
          work_id: candidate.identity.work_id,
          attempt: candidate.attempt,
          scope_digest: work.binding.work_source_revision,
        },
        workflowId: work.binding.workflow_id,
        runId: work.execution.run_id,
        lifecycleRisk: work.lifecycle.risk,
      };
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
          journal,
          host,
          initial.frontierCodeRebind,
          initial.completedSourceReportRecovery,
        );
      } else readConfiguredContinuationSessionEngineSnapshot(binding, configured.original, configured.recovery);
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
      verify(request, current.host, current.journal);
      if (refreshing) {
        const previous = json(access, relative, 'prepared code plan beforeimage'),
          before = validateQualifiedRuntimeCodeContinuationRequest(previous.value),
          expected = values['--expected-request-id'];
        requireContinuation(
          typeof expected === 'string' && /^[a-f0-9]{64}$/.test(expected),
          'expected prior request ID invalid',
        );
        const oldId = canonicalJsonDigest(before),
          historyRef = path.posix.dirname(relative) + '/qualified-code-plan-history/' + expected + '.json';
        const encoded = JSON.stringify(request, null, 2) + '\n',
          newBytes = Buffer.from(encoded);
        if (oldId !== expected) {
          requireContinuation(
            oldId === canonicalJsonDigest(request) &&
              access.fileExists(historyRef, 'retained prepared code plan history'),
            'prepared refresh state is neither exact old nor new request',
          );
          const retained = json(access, historyRef, 'retained prepared code request');
          requireContinuation(
            canonicalJsonDigest(validateQualifiedRuntimeCodeContinuationRequest(retained.value)) === expected,
            'retained prepared request ID differs',
          );
          validateQualifiedRuntimeCodePreparedPlanRefresh(retained.value, before);
        } else {
          validateQualifiedRuntimeCodePreparedPlanRefresh(before, request);
          await store.withQualifiedRuntimeCodePlanRefresh(
            before,
            async () => {
              requireContinuation(
                access.readBytes(relative, 'prepared refresh CAS').equals(previous.bytes),
                'prepared code plan changed before replacement',
              );
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
              access.ensureDirectory(path.posix.dirname(historyRef), 'prepared code plan history owner');
              if (access.fileExists(historyRef, 'prepared code history presence'))
                requireContinuation(
                  access.readBytes(historyRef, 'exact prepared code history').equals(previous.bytes),
                  'prepared code history differs',
                );
              else access.writeExclusive(historyRef, previous.bytes, 'retain exact prepared code plan beforeimage');
              await access.replaceAtomicAsync(
                relative,
                sha(previous.bytes),
                encoded,
                'prepared code plan target refresh',
              );
            },
            async () => {
              const actual = access.readBytes(relative, 'prepared refresh conditional rollback');
              if (actual.equals(previous.bytes)) return;
              requireContinuation(actual.equals(newBytes), 'prepared refresh rollback target drifted');
              await access.replaceAtomicAsync(
                relative,
                sha(newBytes),
                previous.bytes.toString('utf8'),
                'prepared refresh rollback',
              );
            },
          );
        }
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
    database.close(true);
  }
}
