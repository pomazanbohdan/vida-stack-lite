import path from 'node:path';
import { Database } from 'bun:sqlite';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { HostStateStore } from '../src/host-state.ts';
import { sessionHandoffDatabasePath } from '../src/config/project-paths.ts';
import { compareScopedSourceSnapshots } from '../src/orchestration/scoped-source-snapshot.ts';
import { readAdmittedSessionIntakeForWork } from '../src/orchestration/admitted-session-execution.ts';
import { validateFailedPrewriterRecoveryBasis } from '../src/orchestration/failed-prewriter-recovery.ts';
import { projectQualifiedRuntimeCodeAncestor } from '../src/orchestration/qualified-runtime-code-continuation.ts';
import {
  effectiveConfiguredFrontier,
  failedPrewriterRecoveryDigest,
  validateFailedPrewriterTransitionRequest,
} from '../src/orchestration/failed-prewriter-transition.ts';
import { verifyConfiguredNativeEndpoint } from './runtime-code-rebind.mjs';

const requireTransition = (condition, message) => {
  if (!condition) throw Error(`failed prewriter transition: ${message}`);
};
const same = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);

/** Correct only a fully known failed readonly wave after a qualified whole native update. */
export function transitionFailedPrewriter(args) {
  requireTransition(args.length === 6, 'mode, root and input are required');
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    requireTransition(!Object.hasOwn(values, args[index]) && args[index + 1], 'arguments invalid');
    values[args[index]] = args[index + 1];
  }
  requireTransition(
    Object.keys(values).sort().join(',') === '--mode,--project-root,--request' &&
      ['inspect', 'apply', 'status'].includes(values['--mode']) &&
      path.isAbsolute(values['--project-root']),
    'argument set invalid',
  );
  const root = values['--project-root'],
    access = requireSafeRepositoryAccess(root);
  const bytes = access.readBytes(values['--request'], 'failed prewriter transition input');
  requireTransition(bytes.length > 0 && bytes.length <= 1024 * 1024, 'input exceeds bound');
  const input = JSON.parse(bytes.toString('utf8')),
    inspecting = values['--mode'] !== 'apply';
  requireTransition(
    Object.keys(input).sort().join(',') ===
      [
        'schema',
        'identity',
        'attempt',
        'nativeSessionHandle',
        'recovery_id',
        'sourceTransitionId',
        'parentManifestRef',
        'successorManifestRef',
        'systemUpdateRef',
        'sourceCorrectionRef',
        ...(!inspecting ? ['request'] : []),
      ]
        .sort()
        .join(',') && input.schema === 'FailedPrewriterTransitionInput/v1',
    'input shape invalid',
  );
  const config = loadRuntimeConfig(root),
    project = loadProjectSetContext(root, config, input.identity.repository_id, input.identity.project_ids);
  requireTransition(
    same(input.identity, {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: input.identity.work_id,
    }),
    'project identity differs',
  );
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const file = sessionHandoffDatabasePath(root, config);
  access.readBytes(path.relative(root, file).split(path.sep).join('/'), 'configured Host database');
  const database = new Database(file, { readonly: inspecting, strict: true });
  try {
    const store = new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const recorded = store.readFailedPrewriterRecoveryReceipt(input.identity, input.attempt);
    if (recorded) {
      requireTransition(
        recorded.request.recovery_id === input.recovery_id &&
          recorded.request.nativeSessionHandle === input.nativeSessionHandle &&
          (inspecting || same(input.request, recorded.request)),
        'recorded recovery intent differs',
      );
      const current = store.readHostStateSnapshot(input.identity);
      const view = store.readConfiguredFrontierRecoveryView(input.identity, input.attempt);
      requireTransition(
        view?.recovery &&
          failedPrewriterRecoveryDigest(view.recovery) === failedPrewriterRecoveryDigest(recorded) &&
          same(current.work?.binding, effectiveConfiguredFrontier(view).currentBinding),
        'recorded recovery current binding differs',
      );
      return {
        status: 'failed_prewriter_transition_recorded',
        work_version: current.workVersion,
        ledger_version: current.ledgerVersion,
        journal_version: store.readWorkSessionJournal(input.identity).version,
        request: recorded.request,
        failed_reports_preserved: true,
        rights_granted: false,
        runtime_accepted: false,
        effects_reissued: false,
      };
    }
    requireTransition(values['--mode'] !== 'status', 'recovery has no recorded result');
    const original = store.readDeliveredWorkContinuationReceipt(input.identity, input.attempt);
    const host = store.readHostStateSnapshot(input.identity),
      journal = store.readWorkSessionJournal(input.identity);
    requireTransition(
      original?.request.action.kind === 'configured_frontier' && host.work && host.ledger && journal,
      'original continuation unavailable',
    );
    validateFailedPrewriterRecoveryBasis({
      original,
      work: projectQualifiedRuntimeCodeAncestor(
        host.work,
        host.runtimeCodeContinuations,
        original.work_version.revision,
      ),
      ledger: host.ledger,
      journal: journal.state,
      nativeSessionHandle: input.nativeSessionHandle,
      now: Date.now(),
      leaseState: 'live',
    });
    const intakeRef = original.prior_work.artifacts.find((item) => item.artifact_id === 'local-session-intake');
    requireTransition(intakeRef, 'protected original intake missing');
    const intake = readAdmittedSessionIntakeForWork(root, original.prior_work);
    const inspectEndpoint = (currentConfig = loadRuntimeConfig(root)) =>
      verifyConfiguredNativeEndpoint({
        root,
        config: currentConfig,
        workspaceId,
        identity: input.identity,
        work: original.prior_work,
        journal: original.prior_journal,
        intake,
        intakeRef,
        access,
        sourceTransitionId: input.sourceTransitionId,
        parentManifestRef: input.parentManifestRef,
        successorManifestRef: input.successorManifestRef,
        systemUpdateRef: input.systemUpdateRef,
        sourceCorrectionRef: input.sourceCorrectionRef,
      });
    const endpoint = inspectEndpoint();
    const request = validateFailedPrewriterTransitionRequest(
      {
        schema: 'FailedPrewriterTransitionRequest/v1',
        recovery_id: input.recovery_id,
        identity: input.identity,
        attempt: input.attempt,
        nativeSessionHandle: input.nativeSessionHandle,
        original_receipt_digest: canonicalJsonDigest(original),
        expectedWork: host.workVersion,
        expectedLedger: host.ledgerVersion,
        expectedJournal: journal.version,
        expectedMaintenanceGeneration: host.maintenanceGeneration,
        currentSourceScope: endpoint.currentSourceScope,
        authorizedSourceChanges: compareScopedSourceSnapshots(journal.state.source_scope, endpoint.currentSourceScope),
        sourceTransition: endpoint.sourceTransition,
        targetProjectContextDigest: project.project_context_digest,
      },
      original,
    );
    if (inspecting)
      return {
        status: 'failed_prewriter_transition_ready',
        request,
        rights_granted: false,
        runtime_accepted: false,
        same_attempt: true,
      };
    requireTransition(same(request, input.request), 'frozen transition or current versions changed');
    const result = store.transitionFailedPrewriter({
      request,
      verifyCurrent: (current, retained) => {
        const fresh = inspectEndpoint();
        const freshProject = loadProjectSetContext(
          root,
          loadRuntimeConfig(root),
          input.identity.repository_id,
          input.identity.project_ids,
        );
        requireTransition(
          same(retained, original) &&
            same(current.currentSourceScope, fresh.currentSourceScope) &&
            same(current.sourceTransition, fresh.sourceTransition) &&
            current.targetProjectContextDigest === freshProject.project_context_digest &&
            freshProject.integrations_digest === input.identity.integrations_digest &&
            access.readBytes(values['--request'], 'transition input stability').equals(bytes),
          'current native/Source proof changed',
        );
      },
    });
    return {
      status: 'failed_prewriter_transition_applied',
      work_version: result.workVersion,
      ledger_version: result.ledgerVersion,
      journal_version: store.readWorkSessionJournal(input.identity).version,
      failed_reports_preserved: true,
      readonly_wave_unissued: true,
      rights_granted: false,
      runtime_accepted: false,
    };
  } finally {
    database.close(true);
  }
}
