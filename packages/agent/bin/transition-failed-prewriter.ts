import {
  createCliHostStateStore,
  closeWorkspaceDatabaseWithAdmission,
  openCliWorkspaceDatabase,
} from './workspace-database-cli.ts';
import path from 'node:path';
import { canonicalJsonDigest, isPlainRecord } from '../src/contracts/public-ingress.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

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
import { verifyConfiguredNativeEndpoint } from './runtime-code-rebind.ts';

/** @type {(condition: unknown, message: string) => asserts condition} */
const requireTransition: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw Error(`failed prewriter transition: ${message}`);
};
/** @param {unknown} left @param {unknown} right */
const same = (left: unknown, right: unknown): boolean => canonicalJsonDigest(left) === canonicalJsonDigest(right);

/** @param {import('../src/host-state.ts').HostStateStore} store
 * @param {import('../src/orchestration/failed-prewriter-transition.ts').FailedPrewriterTransitionRequest} request
 */
function committedTransitionJournalVersion(
  store: import('../src/host-state.ts').HostStateStore,
  request: import('../src/orchestration/failed-prewriter-transition.ts').FailedPrewriterTransitionRequest,
): import('../src/host-state.ts').StateVersion {
  const receipt = store.readFailedPrewriterRecoveryReceipt(request.identity, request.attempt);
  if (!receipt || !same(receipt.request, request))
    throw Error('failed prewriter transition: committed recovery receipt differs from its request');
  return receipt.journal_version;
}

type WorkIdentity = import('../src/host-state.ts').WorkIdentity;
type StateVersion = import('../src/host-state.ts').StateVersion;
type HostTransitionSnapshot = ReturnType<import('../src/host-state.ts').HostStateStore['transitionFailedPrewriter']>;
type DeliveredWorkContinuationReceipt = import('../src/host-state.ts').DeliveredWorkContinuationReceipt;
type ConfiguredFrontierReceipt =
  import('../src/orchestration/delivered-work-continuation-repair.ts').ConfiguredFrontierReceipt;
type FailedPrewriterTransitionRequest =
  import('../src/orchestration/failed-prewriter-transition.ts').FailedPrewriterTransitionRequest;
interface TransitionOptions {
  mode: 'inspect' | 'apply' | 'status';
  root: string;
  requestPath: string;
}
type TransitionResult =
  | {
      status: 'failed_prewriter_transition_recorded';
      work_version: StateVersion;
      ledger_version: StateVersion;
      journal_version: StateVersion;
      request: FailedPrewriterTransitionRequest;
      failed_reports_preserved: true;
      rights_granted: false;
      runtime_accepted: false;
      effects_reissued: false;
    }
  | {
      status: 'failed_prewriter_transition_ready';
      request: FailedPrewriterTransitionRequest;
      rights_granted: false;
      runtime_accepted: false;
      same_attempt: true;
    }
  | {
      status: 'failed_prewriter_transition_applied';
      work_version: HostTransitionSnapshot['workVersion'];
      ledger_version: HostTransitionSnapshot['ledgerVersion'];
      journal_version: StateVersion;
      failed_reports_preserved: true;
      readonly_wave_unissued: true;
      rights_granted: false;
      runtime_accepted: false;
    };
interface TransitionInput {
  schema: 'FailedPrewriterTransitionInput/v1';
  identity: WorkIdentity;
  attempt: number;
  nativeSessionHandle: string;
  recovery_id: string;
  sourceTransitionId: string;
  parentManifestRef: string;
  successorManifestRef: string;
  systemUpdateRef: string;
  sourceCorrectionRef: string;
  request?: unknown;
}

/** @param {readonly string[]} args @returns {TransitionOptions} */
function transitionOptions(args: readonly string[]): TransitionOptions {
  requireTransition(args.length === 6, 'mode, root and input are required');
  /** @type {Map<string, string>} */
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index],
      value = args[index + 1];
    requireTransition(key !== undefined && !values.has(key) && value, 'arguments invalid');
    values.set(key, value);
  }
  const mode = values.get('--mode'),
    root = values.get('--project-root'),
    requestPath = values.get('--request');
  requireTransition([...values.keys()].sort().join(',') === '--mode,--project-root,--request', 'argument set invalid');
  requireTransition(mode === 'inspect' || mode === 'apply' || mode === 'status', 'argument set invalid');
  requireTransition(root !== undefined && path.isAbsolute(root) && requestPath !== undefined, 'argument set invalid');
  return { mode, root, requestPath };
}

/** @param {unknown} value @returns {value is string[]} */
function transitionProjectIds(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** @param {unknown} value @returns {WorkIdentity} */
function transitionIdentity(value: unknown): WorkIdentity {
  requireTransition(isPlainRecord(value), 'project identity invalid');
  requireTransition(
    Object.keys(value).sort().join(',') === 'integrations_digest,project_ids,repository_id,work_id',
    'project identity invalid',
  );
  const { repository_id, project_ids, integrations_digest, work_id } = value;
  requireTransition(
    typeof repository_id === 'string' &&
      transitionProjectIds(project_ids) &&
      typeof integrations_digest === 'string' &&
      typeof work_id === 'string',
    'project identity invalid',
  );
  return { repository_id, project_ids, integrations_digest, work_id };
}

/** @template {string} K @param {Record<string, unknown>} value @param {readonly K[]} keys
 * @returns {value is Record<string, unknown> & Record<K, string>}
 */
function transitionStringFields<K extends string>(
  value: Record<string, unknown>,
  keys: readonly K[],
): value is Record<string, unknown> & Record<K, string> {
  return keys.every((key) => typeof value[key] === 'string');
}

/** @param {unknown} value @param {boolean} inspecting @returns {TransitionInput} */
function transitionInput(value: unknown, inspecting: boolean): TransitionInput {
  requireTransition(isPlainRecord(value), 'input shape invalid');
  requireTransition(
    Object.keys(value).sort().join(',') ===
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
        .join(',') && value.schema === 'FailedPrewriterTransitionInput/v1',
    'input shape invalid',
  );
  requireTransition(
    transitionStringFields(value, [
      'nativeSessionHandle',
      'recovery_id',
      'sourceTransitionId',
      'parentManifestRef',
      'successorManifestRef',
      'systemUpdateRef',
      'sourceCorrectionRef',
    ]),
    'input fields invalid',
  );
  requireTransition(
    typeof value.attempt === 'number' && Number.isSafeInteger(value.attempt) && value.attempt > 0,
    'input attempt invalid',
  );
  return {
    schema: 'FailedPrewriterTransitionInput/v1',
    identity: transitionIdentity(value.identity),
    attempt: value.attempt,
    nativeSessionHandle: value.nativeSessionHandle,
    recovery_id: value.recovery_id,
    sourceTransitionId: value.sourceTransitionId,
    parentManifestRef: value.parentManifestRef,
    successorManifestRef: value.successorManifestRef,
    systemUpdateRef: value.systemUpdateRef,
    sourceCorrectionRef: value.sourceCorrectionRef,
    ...('request' in value ? { request: value.request } : {}),
  };
}

/** @param {DeliveredWorkContinuationReceipt | null} receipt @returns {receipt is ConfiguredFrontierReceipt} */
function isConfiguredFrontierReceipt(
  receipt: DeliveredWorkContinuationReceipt | null,
): receipt is ConfiguredFrontierReceipt {
  return (
    receipt !== null &&
    receipt.request.action.kind === 'configured_frontier' &&
    receipt.historical_capture === null &&
    receipt.frontier_snapshot !== undefined
  );
}

/** Correct only a fully known failed readonly wave after a qualified whole native update.
 * @param {readonly string[]} args
 */
export function transitionFailedPrewriter(args: readonly string[]): TransitionResult {
  const { mode, root, requestPath } = transitionOptions(args),
    access = requireSafeRepositoryAccess(root);
  const bytes = access.readBytes(requestPath, 'failed prewriter transition input');
  requireTransition(bytes.length > 0 && bytes.length <= 1024 * 1024, 'input exceeds bound');
  /** @type {unknown} */
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  const inspecting = mode !== 'apply',
    input = transitionInput(parsed, inspecting);
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
  const database = openCliWorkspaceDatabase(root, file, workspaceId, inspecting);
  try {
    const store = createCliHostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root);
    const recorded = store.readFailedPrewriterRecoveryReceipt(input.identity, input.attempt);
    if (recorded) {
      requireTransition(
        recorded.request.recovery_id === input.recovery_id &&
          recorded.request.nativeSessionHandle === input.nativeSessionHandle &&
          (inspecting || same(input.request, recorded.request)),
        'recorded recovery intent differs',
      );
      const snapshot = store.readWorkSessionSnapshot(input.identity, input.attempt),
        current = snapshot.host;
      requireTransition(snapshot.journal, 'selected recovery journal is unavailable');
      const view = store.readConfiguredFrontierRecoveryView(input.identity, input.attempt);
      requireTransition(
        view?.recovery &&
          failedPrewriterRecoveryDigest(view.recovery) === failedPrewriterRecoveryDigest(recorded) &&
          same(current.work?.binding, effectiveConfiguredFrontier(view).currentBinding),
        'recorded recovery current binding differs',
      );
      return {
        status: 'failed_prewriter_transition_recorded',
        work_version: recorded.work_version,
        ledger_version: recorded.ledger_version,
        journal_version: recorded.journal_version,
        request: recorded.request,
        failed_reports_preserved: true,
        rights_granted: false,
        runtime_accepted: false,
        effects_reissued: false,
      };
    }
    requireTransition(mode !== 'status', 'recovery has no recorded result');
    const original = store.readDeliveredWorkContinuationReceipt(input.identity, input.attempt);
    const snapshot = store.readWorkSessionSnapshot(input.identity, input.attempt),
      host = snapshot.host,
      journal = snapshot.journal;
    requireTransition(
      isConfiguredFrontierReceipt(original) &&
        host.work &&
        host.ledger &&
        host.workVersion &&
        host.ledgerVersion &&
        journal &&
        journal.state.source_scope,
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
            access.readBytes(requestPath, 'transition input stability').equals(bytes),
          'current native/Source proof changed',
        );
      },
    });
    return {
      status: 'failed_prewriter_transition_applied',
      work_version: result.workVersion,
      ledger_version: result.ledgerVersion,
      journal_version: committedTransitionJournalVersion(store, request),
      failed_reports_preserved: true,
      readonly_wave_unissued: true,
      rights_granted: false,
      runtime_accepted: false,
    };
  } finally {
    closeWorkspaceDatabaseWithAdmission(database);
  }
}
